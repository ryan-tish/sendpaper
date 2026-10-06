import Stripe from "stripe";
import { BASE_URL, BRAND, EXTRA_SERVICE, PRODUCTS, env, isLetter } from "./config.ts";
import { attachSession, confirmDiscount, getOrder, priceLines, setStatus, type OrderRow } from "./orders.ts";
import { notifyPaid } from "./notify.ts";

export const stripe = env.stripeSecret ? new Stripe(env.stripeSecret) : null;

// Called by /o/:id/pay. A fresh session each time, so the stable /pay link never expires
// even though Stripe Checkout sessions do (24h).
// Catalog products (scripts/stripe-catalog.ts creates `sendpaper_<product id>`). Checkout references them so Stripe
// reports group sales by product; the amount still comes from the order. Until a product exists, fall back to
// inline product_data (remembered per process so we don't retry a missing product on every checkout).
const missingCatalog = new Set<string>();

export async function checkoutUrlFor(o: OrderRow): Promise<string> {
  if (!stripe) throw new Error("Payments are not configured (STRIPE_SECRET_KEY missing).");
  o = await confirmDiscount(o);
  const p = PRODUCTS[o.product];
  const via = EXTRA_SERVICE[o.product] === "certified_return_receipt" ? "USPS Certified Mail with a return receipt" : EXTRA_SERVICE[o.product] ? "USPS Certified Mail" : "USPS First-Class";
  const inline = { name: `${p.name} to ${o.to_address.name}`, description: EXTRA_SERVICE[o.product] ? `${p.blurb} Printed and mailed by ${BRAND}.` : `${p.blurb} Printed and mailed by ${BRAND} via ${via}.` };
  const catalogId = `sendpaper_${o.product}`;
  const certified = EXTRA_SERVICE[o.product];
  // Brand the hosted page (Stripe allows this per session; receipts use the Dashboard's account branding instead).
  const branding = {
    display_name: BRAND,
    background_color: "#ffffff",
    button_color: "#0f7a52",
    border_style: "rounded",
    font_family: "inter",
    icon: { type: "url", url: "https://docs.sendmypaper.com/logo/stripe-icon.png" },
    logo: { type: "url", url: "https://docs.sendmypaper.com/logo/wordmark.png" },
  };
  const note = certified
    ? `A person reviews every piece before it's printed. It goes out by USPS Certified Mail${certified === "certified_return_receipt" ? " with a return receipt" : ""}, and the tracking number appears on your order page.`
    : o.express
      ? "A person reviews every piece before it's printed. It goes out by express (USPS Priority Mail, usually 2–3 days) with tracking."
      : "A person reviews every piece before it's printed. It's usually mailed within one business day via USPS First-Class.";
  const offNote = o.discount_cents ? ` Includes $${(o.discount_cents / 100).toFixed(2)} off your first order.` : "";
  // Itemized checkout (Ryan, 2026-10-05): the product, each add-on, and the first-order discount as a one-off Stripe
  // coupon, so Checkout and the receipt email show subtotal, discount and total. Creating coupons needs the key's
  // Coupons: Write permission; without it we fall back to the old single line at the discounted price.
  const lines = priceLines(o);
  const off = lines.find((l) => l.kind === "discount");
  let coupon: string | null = null;
  if (off) {
    const id = `sp_first_${o.id}_${-off.cents}`;
    try {
      coupon = (await stripe.coupons.retrieve(id).catch(() => stripe!.coupons.create({ id, amount_off: -off.cents, currency: "usd", duration: "once", max_redemptions: 1, name: off.label }))).id;
    } catch (e) {
      console.warn(`checkout: no coupon for ${o.id}, using one net line (${(e as Error).message})`);
    }
  }
  const itemized = !off || coupon;
  const create = (useCatalog: boolean) =>
    stripe!.checkout.sessions.create({
    mode: "payment",
    line_items: itemized
      ? lines.filter((l) => l.kind !== "discount").map((l) => ({
          quantity: 1,
          price_data: l.kind === "product"
            ? useCatalog
              ? { currency: "usd", unit_amount: l.cents, product: catalogId }
              : { currency: "usd", unit_amount: l.cents, product_data: inline }
            : { currency: "usd", unit_amount: l.cents, product_data: { name: l.label } },
        }))
      : [
          {
            quantity: 1,
            price_data: useCatalog
              ? { currency: "usd", unit_amount: o.price_cents, product: catalogId }
              : { currency: "usd", unit_amount: o.price_cents, product_data: inline },
          },
        ],
    ...(coupon ? { discounts: [{ coupon }] } : {}),
    customer_email: o.customer_email ?? undefined,
    // Typed loosely: branding_settings is newer than some SDK typings.
    ...({ branding_settings: branding } as object),
    custom_text: { submit: { message: note + (coupon ? "" : offNote) } },
    // A fresh session is made on every /pay visit, so a short expiry costs nothing and avoids stale sessions.
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    client_reference_id: o.id,
    metadata: { order_id: o.id, product: o.product },
    // Card statements read SENDPAPER* POSTCARD / LETTER / CERTIFIED.
    payment_intent_data: { metadata: { order_id: o.id, product: o.product }, statement_descriptor_suffix: certified ? "CERTIFIED" : isLetter(o.product) ? "LETTER" : "POSTCARD" },
    success_url: `${BASE_URL}/o/${o.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/o/${o.id}`,
  });
  let session: Stripe.Checkout.Session;
  if (missingCatalog.has(catalogId)) session = await create(false);
  else {
    try {
      session = await create(true);
    } catch (e) {
      if (!(e instanceof Stripe.errors.StripeInvalidRequestError) || !/product/i.test(e.message)) throw e;
      missingCatalog.add(catalogId);
      session = await create(false);
    }
  }
  await attachSession(o.id, session.id);
  return session.url!;
}

async function markPaid(session: Stripe.Checkout.Session) {
  const id = session.metadata?.order_id ?? session.client_reference_id;
  if (!id || session.payment_status !== "paid") return null;
  const o = await getOrder(id);
  if (!o || o.status !== "awaiting_payment") return o; // already handled (webhook + redirect both race here)
  const paid = await setStatus(id, "paid", undefined, {
    stripe_payment: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
    customer_email: session.customer_details?.email ?? undefined,
  });
  if (paid) await notifyPaid(paid).catch((e) => console.error("notify failed", e));
  return paid;
}

export async function handleWebhook(raw: Buffer, signature: string | undefined) {
  if (!stripe || !env.stripeWebhookSecret) throw new Error("Webhook not configured");
  const event = stripe.webhooks.constructEvent(raw, signature ?? "", env.stripeWebhookSecret);
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await markPaid(event.data.object as Stripe.Checkout.Session);
  }
}

// Belt and braces for when the webhook is missing or slow: the success redirect verifies the session itself.
export async function confirmFromRedirect(orderId: string, sessionId: string) {
  if (!stripe) return;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if ((session.metadata?.order_id ?? session.client_reference_id) !== orderId) return;
  await markPaid(session);
}

// ---------------------------------------------------------------------------------------------
// Agent payments with Stripe Shared Payment Tokens (SPTs), added 2026-10-02.
// The agent (e.g. via Stripe Link / link-cli) grants us an `spt_…` scoped to this order's amount;
// we charge it with one PaymentIntent. No browser and no card details ever reach us.
// Docs: `stripe docs "/agentic-commerce/concepts/shared-payment-tokens?agent-seller=seller"`.
const SPT_VERSION = "2026-04-22.preview";

async function stripeForm(path: string, params: Record<string, string>, idempotencyKey?: string, method = "POST") {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.stripeSecret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": SPT_VERSION,
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: method === "GET" ? undefined : new URLSearchParams(params),
  });
  return { ok: res.ok, status: res.status, body: (await res.json()) as any };
}

export class PaymentError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// Only card declines and missing tokens are the agent's business; anything else (permissions, our config,
// Stripe outages) is logged and replaced with a generic message so account details never leak to agents.
function stripeFailure(where: string, body: any, status: number): PaymentError {
  const e = body?.error ?? {};
  if (e.type === "card_error") return new PaymentError(e.decline_code ?? e.code ?? "card_declined", e.message ?? "The card was declined.");
  if (e.code === "resource_missing" || status === 404) return new PaymentError("invalid_token", "That shared payment token was not found.");
  console.error(`stripe ${where} failed`, status, e.type, e.code, e.message);
  return new PaymentError("payments_unavailable", "Agent payments are temporarily unavailable. Use the order's checkout link instead.");
}

export async function payWithSharedToken(o: OrderRow, token: string): Promise<OrderRow> {
  if (!env.stripeSecret) throw new PaymentError("payments_unavailable", "Payments are not configured.");
  if (o.status !== "awaiting_payment") throw new PaymentError("not_payable", `Order is ${o.status}; nothing to pay.`);
  if (!/^spt_[A-Za-z0-9_]+$/.test(token)) throw new PaymentError("invalid_token", "shared_payment_token must look like spt_…");
  o = await confirmDiscount(o);

  // Check the grant before charging so the agent gets a precise reason instead of a generic decline.
  const grant = await stripeForm(`/shared_payment/granted_tokens/${token}`, {}, undefined, "GET");
  if (!grant.ok) throw stripeFailure("grant lookup", grant.body, grant.status);
  const limits = grant.body.usage_limits ?? {};
  if (grant.body.deactivated_at) throw new PaymentError("token_inactive", `Token is ${grant.body.deactivated_reason ?? "deactivated"}. Ask the user to approve a new one.`);
  if (limits.currency && limits.currency !== "usd") throw new PaymentError("token_currency", "Token must be scoped to USD.");
  if (limits.max_amount != null && limits.max_amount < o.price_cents)
    throw new PaymentError("token_amount", `Token allows ${limits.max_amount} cents but this order costs ${o.price_cents}. Request a token for at least ${o.price_cents} cents.`);

  const pi = await stripeForm(
    "/payment_intents",
    {
      amount: String(o.price_cents),
      currency: "usd",
      "payment_method_data[shared_payment_granted_token]": token,
      confirm: "true",
      "metadata[order_id]": o.id,
      "metadata[paid_via]": "shared_payment_token",
      description: `${BRAND} ${PRODUCTS[o.product].name} to ${o.to_address.name}`,
    },
    `spt-pay-${o.id}-${token}`, // retrying the same token never double-charges; a new token after a decline gets a fresh attempt
  );
  if (!pi.ok) throw stripeFailure("payment", pi.body, pi.status);
  if (pi.body.status !== "succeeded")
    throw new PaymentError("requires_action", `Payment is ${pi.body.status}. Send the user to the checkout link instead.`);

  const paid = await setStatus(o.id, "paid", "paid by agent with a shared payment token", { stripe_payment: pi.body.id });
  if (paid) await notifyPaid(paid).catch((e) => console.error("notify failed", e));
  return paid!;
}
