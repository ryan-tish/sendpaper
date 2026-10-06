import { randomBytes } from "node:crypto";
import { z } from "zod";
import { BASE_URL, COLOR_LETTER_CENTS, EXPRESS_CENTS, EXTRA_SERVICE, firstOrderDiscount, LIMITS, POSTCARD_SIZE_NAMES, PRODUCTS, US_STATES, isLetter, type ProductId } from "./config.ts";
import { pool } from "./db.ts";
import { postcardLayout, THEME_NAMES } from "./render.ts";
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
    layout: z
      .enum(["headline", "photo", "photo_caption", "collage"])
      .optional()
      .describe("Front layout: headline (big text on a color), photo (one full-bleed photo), photo_caption (photo with a caption band), collage (2-4 photos). Inferred from the fields when omitted."),
    front_image_url: imageUrl.optional().describe("https URL of a photo or design for the front (JPG or PNG); for photo and photo_caption"),
    front_images: z.array(imageUrl).min(2).max(4).optional().describe("Collage: 2 to 4 https photo URLs, laid out in a grid"),
    caption: z.string().trim().min(1).max(LIMITS.postcardCaption).optional().describe("photo_caption: short text over a band at the bottom of the photo"),
    front_headline: z
      .string()
      .trim()
      .max(LIMITS.postcardHeadline)
      .optional()
      .describe("headline layout: big text for the front, e.g. 'Happy birthday, Sam!'"),
    front_theme: z.enum(THEME_NAMES).default("ink").describe("headline layout: color theme (ink, sky, sunset, forest, rose, sand, night, mint)"),
    headline_font: z.enum(["serif", "sans", "script"]).default("serif").describe("Font for the headline or caption: serif, sans or script (handwritten)"),
    message: z.string().trim().min(1).max(LIMITS.postcardMessage).describe("The message on the back"),
    message_font: z.enum(["handwriting", "serif", "sans"]).default("handwriting").describe("Font for the message on the back"),
  })
  .superRefine((c, ctx) => {
    const layout = postcardLayout(c);
    const need = (ok: unknown, path: string, message: string) => { if (!ok) ctx.addIssue({ code: "custom", path: [path], message }); };
    if (layout === "headline") need(c.front_headline, "front_headline", "Give the front a headline (or choose a photo layout)");
    if (layout === "photo" || layout === "photo_caption") need(c.front_image_url, "front_image_url", "Add a front photo (front_image_url)");
    if (layout === "photo_caption") need(c.caption, "caption", "Add a caption for the photo_caption layout");
    if (layout === "collage") need((c.front_images ?? []).length >= 2, "front_images", "A collage needs 2 to 4 photos (front_images)");
  });

// A letter is either text we lay out (body, optional photo) or the customer's own PDF (pdf_url).
const pdfUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((u) => /^https:\/\//.test(u) || /^\/files\/file_[a-z0-9]+$/.test(u), "PDF must be an https:// URL");

export const LetterContentSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1)
      .max(LIMITS.letterBody)
      .optional()
      .describe("Full letter text. Plain text; blank lines separate paragraphs. Use this OR pdf_url."),
    pdf_url: pdfUrl
      .optional()
      .describe(`Mail your own document instead of body text: a public https link to a PDF (up to ${LIMITS.pdfPages} pages). Pages are fitted to 8.5×11 and a blank address page is added in front.`),
    color: z.boolean().optional().describe("PDF letters only: print in color (costs a little more; see get_pricing). Text letters print in color automatically when they include image_url."),
    font: z.enum(["serif", "sans"]).default("serif").describe("Typeface for the letter body (text letters)"),
    image_url: imageUrl
      .optional()
      .describe("Text letters only: optional photo printed at the top (https JPG or PNG). A letter with a photo prints in color, for a small surcharge (see get_pricing)."),
    // Set by the server after it fetches and normalizes the PDF; agents don't send it.
    pdf_pages: z.number().int().optional().describe("Set by Sendpaper: page count of the PDF"),
  })
  .refine((c) => Boolean(c.body) !== Boolean(c.pdf_url), "Give the letter either body text or a pdf_url, not both")
  .refine((c) => !(c.pdf_url && c.image_url), "A PDF letter can't also have image_url; put the image inside the PDF");


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

// Express: USPS Priority Mail (2–3 days, tracked) instead of First-Class. Not combinable with Certified Mail.
const express = z.boolean().default(false).describe("Send by express (USPS Priority Mail, usually 2–3 days, with tracking) for an extra charge; see get_pricing. Not available with certified.");

export const CreatePostcardSchema = z.object({
  size: z.enum(POSTCARD_SIZE_NAMES).default("4x6").describe("Postcard size: 4x6, 6x9 or 6x11 (see get_pricing for prices)"),
  ...common,
  express,
  content: PostcardContentSchema.describe("Front (an image URL or a headline) and the message on the back"),
});
export const CreateLetterSchema = z.object({
  ...common,
  content: LetterContentSchema.describe("The letter: body text (optionally with a photo) or your own PDF"),
  certified: z
    .enum(["none", "certified", "certified_return_receipt"])
    .default("none")
    .describe(
      "USPS Certified Mail. \"certified\": tracking number and proof of mailing and delivery. \"certified_return_receipt\": adds the recipient's signature as proof of delivery, which landlords, courts and agencies often require. \"none\": regular First-Class. Prices: get_pricing.",
    ),
  express,
}).refine((l) => !(l.express && l.certified !== "none"), "Choose either certified or express, not both (certified letters already include tracking)");

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
  discount_cents: number;
  express: boolean;
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
  express?: boolean;
};

// A letter printed in color (a photo, or a PDF with color on) and express delivery cost extra; everything else is
// the product's list price.
export const printsInColor = (product: ProductId, content: Record<string, any>) => isLetter(product) && Boolean(content?.image_url || (content?.pdf_url && content?.color));
export const orderPrice = (product: ProductId, content: Record<string, any>, express = false) =>
  PRODUCTS[product].cents + (printsInColor(product, content) ? COLOR_LETTER_CENTS : 0) + (express ? EXPRESS_CENTS : 0);

// The receipt for an order: what was ordered, each add-on, the discount, and a total that always equals
// price_cents (what we charge). Used by the order page and Stripe Checkout (Ryan, 2026-10-05: show the amount off).
// Older orders whose parts don't add up (e.g. the retired free first postcard) get one line at the charged price.
export type PriceLine = { label: string; cents: number; kind: "product" | "addon" | "discount" };
export function priceLines(o: Pick<OrderRow, "product" | "content" | "express" | "discount_cents" | "price_cents">): PriceLine[] {
  const lines: PriceLine[] = [{ label: PRODUCTS[o.product].name, cents: PRODUCTS[o.product].cents, kind: "product" }];
  if (printsInColor(o.product, o.content)) lines.push({ label: "Color printing", cents: COLOR_LETTER_CENTS, kind: "addon" });
  if (o.express) lines.push({ label: "Express delivery (USPS Priority Mail)", cents: EXPRESS_CENTS, kind: "addon" });
  if (o.discount_cents) lines.push({ label: "First-order discount", cents: -o.discount_cents, kind: "discount" });
  const sum = lines.reduce((t, l) => t + l.cents, 0);
  return sum === o.price_cents ? lines : [{ label: PRODUCTS[o.product].name, cents: o.price_cents, kind: "product" }];
}

// One first-order discount per return address (normalized street + unit + ZIP5), so a new name on the same
// address doesn't qualify again.
export function senderKey(a: Address) {
  const norm = (s: string | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${norm(a.line1)}|${norm(a.line2)}|${(a.zip ?? "").slice(0, 5)}`;
}

// Has this return address ever paid for an order (including the old free first postcards)? Test orders don't count.
async function senderHasPaid(from: Address, excludeId?: string) {
  const { rows } = await pool.query<{ from_address: Address }>(
    `SELECT from_address FROM orders WHERE status IN ('paid','printing','mailed') AND NOT is_test AND id <> $1`,
    [excludeId ?? ""],
  );
  const key = senderKey(from);
  return rows.some((r) => senderKey(r.from_address) === key);
}

// Re-check the discount right before charging: if this address paid for another order since this one was created,
// the discount moves to that one and this order goes back to full price.
export async function confirmDiscount(o: OrderRow): Promise<OrderRow> {
  if (!o.discount_cents || o.status !== "awaiting_payment" || !(await senderHasPaid(o.from_address, o.id))) return o;
  const { rows } = await pool.query<OrderRow>(
    "UPDATE orders SET price_cents = price_cents + discount_cents, discount_cents = 0 WHERE id = $1 AND discount_cents > 0 RETURNING *",
    [o.id],
  );
  return rows[0] ?? o;
}

export async function createOrder(input: CreateInput): Promise<{ order: OrderRow; existing: boolean }> {
  if (input.idempotency_key) {
    const prior = await pool.query<OrderRow>("SELECT * FROM orders WHERE idempotency_key = $1", [input.idempotency_key]);
    if (prior.rows[0]) return { order: prior.rows[0], existing: true };
  }
  const id = newId("ord");
  const list = orderPrice(input.product, input.content as Record<string, any>, input.express);
  const discount = (await senderHasPaid(input.from)) ? 0 : Math.min(firstOrderDiscount(list), list);
  const events = [{ at: new Date().toISOString(), status: "awaiting_payment" }];
  const { rows } = await pool.query<OrderRow>(
    `INSERT INTO orders (id, product, to_address, from_address, content, price_cents, customer_email,
                         source, client, idempotency_key, events, analytics_id, discount_cents, express)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [
      id,
      input.product,
      input.to,
      input.from,
      input.content,
      list - discount,
      input.customer_email ?? null,
      input.source,
      input.client?.slice(0, 120) ?? null,
      input.idempotency_key ?? null,
      JSON.stringify(events),
      input.analytics_id?.slice(0, 120) ?? null,
      discount,
      Boolean(input.express),
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
    express: Boolean(o.express),
    product: o.product,
    product_name: PRODUCTS[o.product].name,
    status: o.status,
    status_detail: STATUS_COPY[o.status],
    price: { amount_cents: o.price_cents, currency: "usd", display: `$${(o.price_cents / 100).toFixed(2)}` },
    // Present when the first-order discount is applied; price.amount_cents already has it taken off.
    discount: o.discount_cents ? { amount_cents: o.discount_cents, display: `$${(o.discount_cents / 100).toFixed(2)} off`, reason: "First order from this return address" } : null,
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
