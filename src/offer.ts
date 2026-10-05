// Offers and reviews.
// The first-order discount (now a percentage, see config) replaced "First postcard free" (2026-10-04): the discount is taken off price_cents when
// the order is created and re-checked right before charging (see createOrder / confirmDiscount in orders.ts).
// Orders and reviews from the old free-postcard offer keep free_offer = true, so their history and labels stay honest.
import { pool } from "./db.ts";
import { analyticsId, type OrderRow } from "./orders.ts";
import { track } from "./analytics.ts";

export { senderKey } from "./orders.ts";

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
