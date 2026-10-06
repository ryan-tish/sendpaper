import Stripe from "stripe";
import { BASE_URL, BRAND, EXTRA_SERVICE, PRODUCTS, env, isLetter } from "./config.ts";
import { attachSession, confirmDiscount, getBatch, getOrder, groupLines, setStatus, type OrderRow } from "./orders.ts";
import { notifyPaid } from "./notify.ts";

export const stripe = env.stripeSecret ? new Stripe(env.stripeSecret) : null;

// Called by /o/:id/pay. A fresh session each time, so the stable /pay link never expires
// even though Stripe Checkout sessions do (24h).
// Catalog products (scripts/stripe-catalog.ts creates `sendpaper_<product id>`). Checkout references them so Stripe
// reports group sales by product; the amount still comes from the order. Until a product exists, fall back to
// inline product_data (remembered per process so we don't retry a missing product on every checkout).
const missingCatalog = new Set<string>();

const couponStripe = env.stripeCouponKey ? new Stripe(env.stripeCouponKey) : stripe;

export const checkoutUrlFor = (o: OrderRow) => checkoutFor([o], { kind: "order", id: o.id });

// One Checkout session for one order, or for every unpaid order in a group (one design to many people).
export async function checkoutFor(input: OrderRow[], ref: { kind: "order" | "batch"; id: string }): Promise<string> {
  if (!stripe) throw new Error("Payments are not configured (STRIPE_SECRET_KEY missing).");
  const orders: OrderRow[] = [];
  for (const x of input) if (x.status === "awaiting_payment") orders.push(await confirmDiscount(x));
  if (!orders.length) throw new Error("Nothing to pay.");
  const o = orders[0];
  const many = orders.length > 1;
  const p = PRODUCTS[o.product];
  const via = EXTRA_SERVICE[o.product] === "certified_return_receipt" ? "USPS Certified Mail with a return receipt" : EXTRA_SERVICE[o.product] ? "USPS Certified Mail" : "USPS First-Class";
  const inline = { name: many ? p.name : `${p.name} to ${o.to_address.name}`, description: EXTRA_SERVICE[o.product] ? `${p.blurb} Printed and mailed by ${BRAND}.` : `${p.blurb} Printed and mailed by ${BRAND} via ${via}.` };
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
  const each = many ? "every piece" : "every piece";
  const note = certified
    ? `A person reviews ${each} before it's printed. ${many ? "They go" : "It goes"} out by USPS Certified Mail${certified === "certified_return_receipt" ? " with a return receipt" : ""}, and tracking numbers appear on your order page.`
    : o.express
      ? `A person reviews ${each} before it's printed. ${many ? "They go" : "It goes"} out by express (USPS Priority Mail, usually 2–3 days) with tracking.`
      : `A person reviews ${each} before it's printed. ${many ? "They're" : "It's"} usually mailed within one business day via USPS First-Class.`;
  const discountTotal = orders.reduce((t, x) => t + x.discount_cents, 0);
  const total = orders.reduce((t, x) => t + x.price_cents, 0);
  const offNote = discountTotal ? ` Includes $${(discountTotal / 100).toFixed(2)} off your first order.` : "";
  // Itemized checkout (Ryan, 2026-10-05): the product, each add-on (identical lines across a group are combined with
  // a quantity), and the first-order discount as a one-off Stripe coupon, so Checkout and the receipt email show
  // subtotal, discount and total. Coupons are created with STRIPE_COUPON_KEY (a coupon-only key) when set; without a
  // usable coupon key we fall back to one net line per order at the discounted price.
  const items = new Map(groupLines(orders).filter((l) => l.kind !== "discount").map((l, n) => [n, l]));
  const itemSum = [...items.values()].reduce((t, l) => t + l.cents * l.qty, 0);
  let coupon: string | null = null;
  if (discountTotal && couponStripe) {
    const id = `sp_first_${ref.id}_${discountTotal}`;
    try {
      coupon = (await couponStripe.coupons.retrieve(id).catch(() => couponStripe.coupons.create({ id, amount_off: discountTotal, currency: "usd", duration: "once", max_redemptions: 1, name: "First-order discount" }))).id;
    } catch (e) {
      console.warn(`checkout: no coupon for ${ref.id}, using net lines (${(e as Error).message})`);
    }
  }
  // Only itemize when the parts provably add up to what we charge.
  const itemized = itemSum - (coupon ? discountTotal : 0) === total && (!discountTotal || coupon);
  const create = (useCatalog: boolean) =>
    stripe!.checkout.sessions.create({
    mode: "payment",
    line_items: itemized
      ? [...items.values()].map((l) => ({
          quantity: l.qty,
          price_data: l.kind === "product" && l.label === p.name
            ? useCatalog
              ? { currency: "usd", unit_amount: l.cents, product: catalogId }
              : { currency: "usd", unit_amount: l.cents, product_data: inline }
            : { currency: "usd", unit_amount: l.cents, product_data: { name: l.label } },
        }))
      : orders.map((x) => ({
          quantity: 1,
          price_data: { currency: "usd", unit_amount: x.price_cents, product_data: { name: `${PRODUCTS[x.product].name} to ${x.to_address.name}`, description: inline.description } },
        })),
    ...(coupon && itemized ? { discounts: [{ coupon }] } : {}),
    customer_email: o.customer_email ?? undefined,
    // Typed loosely: branding_settings is newer than some SDK typings.
    ...({ branding_settings: branding } as object),
    custom_text: { submit: { message: note + (coupon && itemized ? "" : offNote) } },
    // A fresh session is made on every /pay visit, so a short expiry costs nothing and avoids stale sessions.
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    client_reference_id: ref.id,
    metadata: ref.kind === "batch" ? { batch_id: ref.id, orders: String(orders.length) } : { order_id: o.id, product: o.product },
    // Card statements read SENDPAPER* POSTCARD / LETTER / CERTIFIED.
    payment_intent_data: {
      metadata: ref.kind === "batch" ? { batch_id: ref.id } : { order_id: o.id, product: o.product },
      statement_descriptor_suffix: certified ? "CERTIFIED" : isLetter(o.product) ? "LETTER" : "POSTCARD",
    },
    success_url: `${BASE_URL}/${ref.kind === "batch" ? "b" : "o"}/${ref.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/${ref.kind === "batch" ? "b" : "o"}/${ref.id}`,
  });
  let session: Stripe.Checkout.Session;
  if (!itemized || missingCatalog.has(catalogId)) session = await create(false);
  else {
    try {
      session = await create(true);
    } catch (e) {
      if (!(e instanceof Stripe.errors.StripeInvalidRequestError) || !/product/i.test(e.message)) throw e;
      missingCatalog.add(catalogId);
      session = await create(false);
    }
  }
  for (const x of orders) await attachSession(x.id, session.id);
  return session.url!;
}

async function markPaid(session: Stripe.Checkout.Session) {
  if (session.metadata?.batch_id) {
    if (session.payment_status !== "paid") return null;
    // Every still-unpaid order in the group (one paid separately, e.g. by an agent token, is already paid and skipped).
    // A fresh session is made per /pay visit, so we can't match on stripe_session: an older tab may be the one paid.
    const unpaid = (await getBatch(session.metadata.batch_id)).filter((x) => x.status === "awaiting_payment");
    const due = unpaid.reduce((t, x) => t + x.price_cents, 0);
    if (due !== session.amount_total) console.warn(`batch ${session.metadata.batch_id}: paid ${session.amount_total}, unpaid orders total ${due}; check in /admin`);
    for (const x of unpaid) {
      const paid = await setStatus(x.id, "paid", undefined, {
        stripe_payment: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        customer_email: session.customer_details?.email ?? undefined,
      });
      if (paid) await notifyPaid(paid).catch((e) => console.error("notify failed", e));
    }
    return null;
  }
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
export async function confirmBatchFromRedirect(batchId: string, sessionId: string) {
  if (!stripe) return;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.batch_id !== batchId) return;
  await markPaid(session);
}

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
  // A group member pays for its whole group (every still-unpaid order) with one token: one design to many people.
  const group = o.batch_id ? (await getBatch(o.batch_id)).filter((x) => x.status === "awaiting_payment") : [o];
  const orders: OrderRow[] = [];
  for (const x of group) orders.push(await confirmDiscount(x));
  const amount = orders.reduce((t, x) => t + x.price_cents, 0);
  const label = orders.length > 1 ? `these ${orders.length} orders (group ${o.batch_id})` : "this order";

  // Check the grant before charging so the agent gets a precise reason instead of a generic decline.
  const grant = await stripeForm(`/shared_payment/granted_tokens/${token}`, {}, undefined, "GET");
  if (!grant.ok) throw stripeFailure("grant lookup", grant.body, grant.status);
  const limits = grant.body.usage_limits ?? {};
  if (grant.body.deactivated_at) throw new PaymentError("token_inactive", `Token is ${grant.body.deactivated_reason ?? "deactivated"}. Ask the user to approve a new one.`);
  if (limits.currency && limits.currency !== "usd") throw new PaymentError("token_currency", "Token must be scoped to USD.");
  if (limits.max_amount != null && limits.max_amount < amount)
    throw new PaymentError("token_amount", `Token allows ${limits.max_amount} cents but ${label} cost ${amount}. Request a token for at least ${amount} cents.`);

  const pi = await stripeForm(
    "/payment_intents",
    {
      amount: String(amount),
      currency: "usd",
      "payment_method_data[shared_payment_granted_token]": token,
      confirm: "true",
      ...(orders.length > 1 ? { "metadata[batch_id]": o.batch_id! } : { "metadata[order_id]": o.id }),
      "metadata[paid_via]": "shared_payment_token",
      description: orders.length > 1 ? `${BRAND} ${orders.length} × ${PRODUCTS[o.product].name}` : `${BRAND} ${PRODUCTS[o.product].name} to ${o.to_address.name}`,
    },
    orders.length > 1 ? `spt-pay-${o.batch_id}-${token}` : `spt-pay-${o.id}-${token}`, // retrying the same token never double-charges; a new token after a decline gets a fresh attempt
  );
  if (!pi.ok) throw stripeFailure("payment", pi.body, pi.status);
  if (pi.body.status !== "succeeded")
    throw new PaymentError("requires_action", `Payment is ${pi.body.status}. Send the user to the checkout link instead.`);

  let mine: OrderRow | null = null;
  for (const x of orders) {
    const paid = await setStatus(x.id, "paid", "paid by agent with a shared payment token", { stripe_payment: pi.body.id });
    if (paid) await notifyPaid(paid).catch((e) => console.error("notify failed", e));
    if (x.id === o.id) mine = paid;
  }
  return mine ?? (await getOrder(o.id))!;
}
