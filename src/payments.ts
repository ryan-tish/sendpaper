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
