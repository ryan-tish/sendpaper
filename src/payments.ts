import Stripe from "stripe";
import { BASE_URL, BRAND, PRODUCTS, env } from "./config.ts";
import { attachSession, getOrder, setStatus, type OrderRow } from "./orders.ts";
import { notifyPaid } from "./notify.ts";

export const stripe = env.stripeSecret ? new Stripe(env.stripeSecret) : null;

// Called by /o/:id/pay. A fresh session each time, so the stable /pay link never expires
// even though Stripe Checkout sessions do (24h).
export async function checkoutUrlFor(o: OrderRow): Promise<string> {
  if (!stripe) throw new Error("Payments are not configured (STRIPE_SECRET_KEY missing).");
  const p = PRODUCTS[o.product];
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: o.price_cents,
          product_data: {
            name: `${p.name} to ${o.to_address.name}`,
            description: `${p.blurb} Printed and mailed by ${BRAND} via USPS First-Class.`,
          },
        },
      },
    ],
    customer_email: o.customer_email ?? undefined,
    client_reference_id: o.id,
    metadata: { order_id: o.id },
    payment_intent_data: { metadata: { order_id: o.id } },
    success_url: `${BASE_URL}/o/${o.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/o/${o.id}`,
  });
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
