import { randomBytes } from "node:crypto";
import { z } from "zod";
import { BASE_URL, EXTRA_SERVICE, LIMITS, PRODUCTS, US_STATES, isLetter, type ProductId } from "./config.ts";
import { pool } from "./db.ts";
import { track } from "./analytics.ts";

export const STATUSES = ["awaiting_payment", "paid", "printing", "mailed", "cancelled", "refunded"] as const;
export type Status = (typeof STATUSES)[number];

const STATUS_COPY: Record<Status, string> = {
  awaiting_payment: "Waiting for payment. Nothing is printed until the checkout link is paid.",
  paid: "Paid. In the print queue; it usually goes out within 1 business day.",
  printing: "Being printed.",
  mailed: "Mailed via USPS First-Class. Delivery usually takes 3–5 business days.",
  cancelled: "Cancelled. Nothing was mailed.",
  refunded: "Refunded. Nothing was mailed.",
};

export function newId(prefix: string) {
  // 80 bits, Crockford-ish base32: unguessable, since the order page is reachable by id alone.
  const alphabet = "0123456789abcdefghjkmnpqrstvwxyz";
  return prefix + "_" + Array.from(randomBytes(16), (b) => alphabet[b & 31]).join("");
}

export const AddressSchema = z.object({
  name: z.string().trim().min(1).max(60).describe("Recipient or sender full name"),
  company: z.string().trim().max(60).optional().describe("Company name, printed under the person's name"),
  line1: z.string().trim().min(3).max(64).describe("Street address"),
  line2: z.string().trim().max(64).optional().describe("Apartment, suite, unit"),
  city: z.string().trim().min(2).max(40).describe("City"),
  state: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .refine((s) => US_STATES.includes(s), "Use a two-letter US state code, e.g. CA")
    .describe("Two-letter US state code, e.g. NY"),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Use a 5-digit US ZIP code (or ZIP+4)")
    .describe("5-digit US ZIP code, or ZIP+4"),
});
export type Address = z.infer<typeof AddressSchema>;

const imageUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((u) => /^https:\/\//.test(u) || /^\/images\/img_[a-z0-9]+$/.test(u), "Image must be an https:// URL");

export const PostcardContentSchema = z
  .object({
    front_image_url: imageUrl.optional().describe("https URL of a photo or design for the front (JPG or PNG)"),
    front_headline: z
      .string()
      .trim()
      .max(LIMITS.postcardHeadline)
      .optional()
      .describe("Big text for the front if there is no image, e.g. 'Happy birthday, Sam!'"),
    front_theme: z.enum(["ink", "sky", "sunset", "forest"]).default("ink").describe("Color theme for a text-only front"),
    message: z.string().trim().min(1).max(LIMITS.postcardMessage).describe("Handwritten-style message on the back"),
  })
  .refine((c) => c.front_image_url || c.front_headline, "Give the front either an image URL or a headline");

export const LetterContentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1)
    .max(LIMITS.letterBody)
    .describe("Full letter text. Plain text; blank lines separate paragraphs."),
  font: z.enum(["serif", "sans"]).default("serif").describe("Typeface for the letter body"),
});

const common = {
  to: AddressSchema.describe("Recipient's US mailing address"),
  from: AddressSchema.describe("Return address; printed on the mail piece"),
  customer_email: z.string().trim().email().optional().describe("Where to send the receipt and status updates"),
  idempotency_key: z
    .string()
    .trim()
    .max(120)
    .optional()
    .describe("Any unique string; retrying with the same key returns the original order instead of creating a duplicate"),
};

export const CreatePostcardSchema = z.object({
  size: z.enum(["4x6", "6x9"]).default("4x6").describe("Postcard size: 4x6 ($2.99) or 6x9 ($3.99)"),
  ...common,
  content: PostcardContentSchema.describe("Front (an image URL or a headline) and the message on the back"),
});
export const CreateLetterSchema = z.object({
  ...common,
  content: LetterContentSchema.describe("The letter text and font"),
  certified: z
    .enum(["none", "certified", "certified_return_receipt"])
    .default("none")
    .describe(
      "USPS Certified Mail. \"certified\" ($14.99): tracking number and proof of mailing and delivery. \"certified_return_receipt\" ($19.99): adds the recipient's signature as proof of delivery, which landlords, courts and agencies often require. \"none\" ($4.99): regular First-Class.",
    ),
});

export type OrderRow = {
  id: string;
  product: ProductId;
  status: Status;
  to_address: Address;
  from_address: Address;
  content: Record<string, string>;
  price_cents: number;
  customer_email: string | null;
  source: string;
  client: string | null;
  idempotency_key: string | null;
  stripe_session: string | null;
  stripe_payment: string | null;
  operator_note: string | null;
  events: { at: string; status: string; note?: string }[];
  created_at: Date;
  paid_at: Date | null;
  mailed_at: Date | null;
  print_provider: string | null;
  print_id: string | null;
  print_status: string | null;
  print_error: string | null;
  free_offer: boolean;
  analytics_id: string | null;
  is_test: boolean;
  tracking_number: string | null;
};

type CreateInput = {
  product: ProductId;
  to: Address;
  from: Address;
  content: object;
  customer_email?: string;
  idempotency_key?: string;
  source: "web" | "api" | "mcp";
  client?: string;
  // The website visitor's PostHog id, so the order's events join their browsing funnel.
  analytics_id?: string;
};

export async function createOrder(input: CreateInput): Promise<{ order: OrderRow; existing: boolean }> {
  if (input.idempotency_key) {
    const prior = await pool.query<OrderRow>("SELECT * FROM orders WHERE idempotency_key = $1", [input.idempotency_key]);
    if (prior.rows[0]) return { order: prior.rows[0], existing: true };
  }
  const id = newId("ord");
  const events = [{ at: new Date().toISOString(), status: "awaiting_payment" }];
  const { rows } = await pool.query<OrderRow>(
    `INSERT INTO orders (id, product, to_address, from_address, content, price_cents, customer_email,
                         source, client, idempotency_key, events, analytics_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      id,
      input.product,
      input.to,
      input.from,
      input.content,
      PRODUCTS[input.product].cents,
      input.customer_email ?? null,
      input.source,
      input.client?.slice(0, 120) ?? null,
      input.idempotency_key ?? null,
      JSON.stringify(events),
      input.analytics_id?.slice(0, 120) ?? null,
    ],
  );
  const o = rows[0];
  track("order_created", analyticsId(o), { order_id: o.id, product: o.product, source: o.source, client: o.client });
  return { order: o, existing: false };
}

export async function getOrder(id: string) {
  const { rows } = await pool.query<OrderRow>("SELECT * FROM orders WHERE id = $1", [id]);
  return rows[0] ?? null;
}

// Test orders are hidden from every tab except "tests".
export async function listOrders(status?: string) {
  const { rows } =
    status === "tests"
      ? await pool.query<OrderRow>("SELECT * FROM orders WHERE is_test ORDER BY created_at DESC LIMIT 500")
      : status
        ? await pool.query<OrderRow>("SELECT * FROM orders WHERE status = $1 AND NOT is_test ORDER BY created_at DESC LIMIT 500", [status])
        : await pool.query<OrderRow>("SELECT * FROM orders WHERE NOT is_test ORDER BY created_at DESC LIMIT 500");
  return rows;
}

export async function setTest(id: string, isTest: boolean) {
  await pool.query("UPDATE orders SET is_test = $2 WHERE id = $1", [id, isTest]);
}

export async function setStatus(id: string, status: Status, note?: string, extra: Partial<OrderRow> = {}) {
  const event = { at: new Date().toISOString(), status, ...(note ? { note } : {}) };
  const { rows } = await pool.query<OrderRow>(
    `UPDATE orders SET status = $2,
       events = events || $3::jsonb,
       operator_note = COALESCE($4, operator_note),
       paid_at = CASE WHEN $2 = 'paid' AND paid_at IS NULL THEN now() ELSE paid_at END,
       mailed_at = CASE WHEN $2 = 'mailed' THEN now() ELSE mailed_at END,
       stripe_payment = COALESCE($5, stripe_payment),
       customer_email = COALESCE(customer_email, $6)
     WHERE id = $1 RETURNING *`,
    [id, status, JSON.stringify([event]), note ?? null, extra.stripe_payment ?? null, extra.customer_email ?? null],
  );
  const o = rows[0];
  if (o) track(`order_${status}`, analyticsId(o), { order_id: o.id, product: o.product, source: o.source, client: o.client, free: o.free_offer, price_cents: o.free_offer ? 0 : o.price_cents });
  return o ?? null;
}

export const analyticsId = (o: OrderRow) => o.analytics_id ?? (o.client ? `agent:${o.client}` : `order:${o.id}`);

export async function attachSession(id: string, sessionId: string) {
  await pool.query("UPDATE orders SET stripe_session = $2 WHERE id = $1", [id, sessionId]);
}

export function orderUrl(id: string) {
  return `${BASE_URL}/o/${id}`;
}

// The shape every API/MCP response uses. Addresses are echoed so an agent can confirm them with the user.
export function publicOrder(o: OrderRow, checkoutUrl?: string | null) {
  return {
    id: o.id,
    object: isLetter(o.product) ? "letter" : "postcard",
    certified: EXTRA_SERVICE[o.product] ?? "none",
    product: o.product,
    product_name: PRODUCTS[o.product].name,
    status: o.status,
    status_detail: STATUS_COPY[o.status],
    price: { amount_cents: o.price_cents, currency: "usd", display: `$${(o.price_cents / 100).toFixed(2)}` },
    to: o.to_address,
    from: o.from_address,
    content: o.content,
    checkout_url: o.status === "awaiting_payment" ? (checkoutUrl ?? `${BASE_URL}/o/${o.id}/pay`) : null,
    order_url: orderUrl(o.id),
    preview_url: `${BASE_URL}/o/${o.id}/preview`,
    created_at: o.created_at,
    paid_at: o.paid_at,
    mailed_at: o.mailed_at,
    tracking: o.tracking_number ? { number: o.tracking_number, url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${o.tracking_number}` } : null,
    events: o.events,
  };
}
