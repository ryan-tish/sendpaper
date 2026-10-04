// First postcard free (2026-10-04, Ryan): each sender's first postcard is free, capped at 100 in total.
// The cap and count are internal (/admin only); public copy never mentions a number (Ryan: "too spammy").
// Free orders never touch Stripe: /o/:id/pay sends a qualifying order to its claim form instead of Checkout,
// and claiming marks it paid (free_offer = true) so it lands in /admin for review like any other order.
import { pool } from "./db.ts";
import { analyticsId, getOrder, publicOrder, type Address, type OrderRow } from "./orders.ts";
import { track } from "./analytics.ts";

export const OFFER_LIMIT = 100;
export const OFFER_LINE = "First postcard free";

const CLAIMED = "free_offer AND status IN ('paid','printing','mailed')";

// One free postcard per return address (street + ZIP), so a new name on the same address doesn't qualify again.
export function senderKey(a: Address) {
  const norm = (s: string | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${norm(a.line1)}|${norm(a.line2)}|${(a.zip ?? "").slice(0, 5)}`;
}

export async function offerRemaining() {
  const { rows } = await pool.query<{ n: string }>(`SELECT count(*) AS n FROM orders WHERE ${CLAIMED}`);
  return Math.max(0, OFFER_LIMIT - Number(rows[0].n));
}

async function senderUsedOffer(o: OrderRow) {
  const { rows } = await pool.query<{ from_address: Address }>(
    `SELECT from_address FROM orders WHERE ${CLAIMED} AND id <> $1`,
    [o.id],
  );
  const key = senderKey(o.from_address);
  return rows.some((r) => senderKey(r.from_address) === key);
}

export async function offerFor(o: OrderRow): Promise<{ eligible: boolean; remaining: number }> {
  const remaining = await offerRemaining();
  const eligible =
    o.product !== "letter" && o.status === "awaiting_payment" && remaining > 0 && !(await senderUsedOffer(o));
  return { eligible, remaining };
}

export class OfferError extends Error {}

// Claim inside a transaction-scoped advisory lock so two claims can't both take the 100th slot.
export async function claimFree(id: string, email: string | null) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(73100)");
    const o = await getOrder(id);
    if (!o) throw new OfferError("No such order.");
    const { eligible } = await offerFor(o);
    if (!eligible) throw new OfferError("This order doesn't qualify for the free postcard.");
    // Mark it paid in the same transaction, so the count the next claim sees already includes this one.
    const event = { at: new Date().toISOString(), status: "paid", note: "first postcard free" };
    await client.query(
      `UPDATE orders SET free_offer = true, status = 'paid', paid_at = now(), events = events || $2::jsonb,
         customer_email = COALESCE(customer_email, $3) WHERE id = $1`,
      [id, JSON.stringify([event]), email],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  const o = await getOrder(id);
  if (o) track("order_paid", analyticsId(o), { order_id: o.id, product: o.product, source: o.source, client: o.client, free: true, price_cents: 0, method: "first_postcard_free" });
  return o;
}

// Reviews: one per order, only after it's mailed, shown publicly only once Ryan approves it.
export type Review = {
  id: number;
  order_id: string;
  rating: number;
  body: string;
  name: string;
  free_offer: boolean;
  approved: boolean;
  created_at: Date;
};

export async function addReview(o: OrderRow, rating: number, body: string, name: string) {
  await pool.query(
    `INSERT INTO reviews (order_id, rating, body, name, free_offer) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (order_id) DO NOTHING`,
    [o.id, rating, body, name, o.free_offer],
  );
  track("review_submitted", analyticsId(o), { order_id: o.id, rating, free: o.free_offer });
}

export async function reviewFor(orderId: string) {
  const { rows } = await pool.query<Review>("SELECT * FROM reviews WHERE order_id = $1", [orderId]);
  return rows[0] ?? null;
}

export async function listReviews(approvedOnly: boolean) {
  const { rows } = await pool.query<Review>(
    `SELECT * FROM reviews ${approvedOnly ? "WHERE approved" : ""} ORDER BY created_at DESC LIMIT 200`,
  );
  return rows;
}

export async function setReviewApproved(id: number, approved: boolean) {
  await pool.query("UPDATE reviews SET approved = $2 WHERE id = $1", [id, approved]);
}

// API/MCP order shape plus the offer, so agents can tell the user the postcard is free before they pay anything.
export async function orderWithOffer(o: OrderRow) {
  const base = publicOrder(o);
  if (o.free_offer) return { ...base, first_postcard_free: { applied: true } };
  if (o.status !== "awaiting_payment" || o.product === "letter") return base;
  const { eligible } = await offerFor(o);
  return eligible
    ? {
        ...base,
        // Public wording is just "first postcard free"; the 100 cap is tracked in /admin, never shown.
        first_postcard_free: {
          eligible: true,
          how: "This is the first postcard from this return address, so it's free. The user opens checkout_url and confirms; no payment or card. Do not call pay_order.",
        },
      }
    : base;
}
