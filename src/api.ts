import express, { Router, type Request, type Response } from "express";
import { ZodError, z } from "zod";
import { PdfError, normalizePdf, prepareLetterContent, storePdf } from "./pdf.ts";
import { BASE_URL, LIMITS, PRODUCTS, letterProduct, postcardProduct } from "./config.ts";
import { pool } from "./db.ts";
import { PaymentError, payWithSharedToken } from "./payments.ts";
import {
  AddressSchema,
  CreateLetterSchema,
  CreatePostcardSchema,
  MAX_RECIPIENTS,
  createOrder,
  getBatch,
  getOrder,
  type OrderRow,
  newId,
  publicOrder,
  setStatus,
} from "./orders.ts";

export function apiError(res: Response, status: number, type: string, message: string, fields?: unknown) {
  return res.status(status).json({ error: { type, message, ...(fields ? { fields } : {}) } });
}

function zodFields(e: ZodError) {
  return e.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
}

// Wraps a handler so validation errors become 422s with per-field messages agents can act on.
const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (e instanceof ZodError) return apiError(res, 422, "invalid_request", "Some fields are invalid.", zodFields(e));
    if (e instanceof PdfError) return apiError(res, 422, "invalid_request", e.message, [{ field: "content.pdf_url", message: e.message }]);
    if ((e as { type?: string })?.type === "entity.too.large") return apiError(res, 413, "too_large", "That file is too large.");
    console.error(e);
    apiError(res, 500, "server_error", "Something went wrong on our side. Retry with the same Idempotency-Key.");
  }
};

const client = (req: Request) => req.get("x-client") ?? req.get("user-agent")?.split(" ")[0];
const idem = (req: Request, body: { idempotency_key?: string }) => req.get("idempotency-key") ?? body.idempotency_key;

// One design to many people (2026-10-05): `recipients` (2–25 addresses) instead of `to` creates one order per
// recipient, grouped by a batch id and paid with ONE checkout link (/b/<batch>/pay).
const RecipientsSchema = z.object({ recipients: z.array(AddressSchema).min(2, "Give at least 2 recipients, or use `to` for one.").max(MAX_RECIPIENTS, `Up to ${MAX_RECIPIENTS} recipients per order.`) });

export function publicBatch(batchId: string, orders: OrderRow[]) {
  const unpaid = orders.filter((o) => o.status === "awaiting_payment");
  const cents = orders.reduce((t, o) => t + o.price_cents, 0), off = orders.reduce((t, o) => t + o.discount_cents, 0);
  return {
    batch: {
      id: batchId,
      count: orders.length,
      url: `${BASE_URL}/b/${batchId}`,
      checkout_url: unpaid.length ? `${BASE_URL}/b/${batchId}/pay` : null,
      price: { amount_cents: cents, currency: "usd", display: `$${(cents / 100).toFixed(2)}` },
      discount: off ? { amount_cents: off, display: `$${(off / 100).toFixed(2)} off`, reason: "First order from this return address" } : null,
    },
    orders: orders.map((o) => publicOrder(o)),
  };
}

// Creates the group; each recipient's order reuses the idempotency key with its index, so a retry returns the same group.
async function createGroup(req: Request, res: Response, recipients: z.infer<typeof AddressSchema>[], make: (to: z.infer<typeof AddressSchema>, key: string | undefined, batchId: string) => Promise<{ order: OrderRow; existing: boolean }>, key?: string) {
  let batchId = newId("batch"), existing = false;
  const orders: OrderRow[] = [];
  for (const [i, to] of recipients.entries()) {
    const r = await make(to, key ? `${key}:${i}` : undefined, batchId);
    if (i === 0 && r.existing && r.order.batch_id) { batchId = r.order.batch_id; existing = true; }
    orders.push(r.order);
  }
  res.status(existing ? 200 : 201).json(publicBatch(batchId, existing ? await getBatch(batchId) : orders));
}

export const api = Router();
api.use(express.json({ limit: "200kb" }));

api.get("/products", (_req, res) => {
  res.json({
    data: Object.entries(PRODUCTS).map(([id, p]) => ({ id, ...p, currency: "usd", amount_cents: p.cents })),
  });
});

api.post(
  "/postcards",
  handle(async (req, res) => {
    if (req.body?.recipients !== undefined) {
      const { recipients } = RecipientsSchema.parse(req.body);
      const { size, content, ...rest } = CreatePostcardSchema.parse({ ...req.body, recipients: undefined, to: recipients[0] });
      return createGroup(req, res, recipients, (to, key, batch_id) => createOrder({
        ...rest, to, content, idempotency_key: key, batch_id, product: postcardProduct(size), source: "api", client: client(req), analytics_id: req.get("x-analytics-id") || undefined,
      }), idem(req, rest));
    }
    const { size, content, ...rest } = CreatePostcardSchema.parse(req.body);
    const { order, existing } = await createOrder({
      ...rest,
      content,
      idempotency_key: idem(req, rest),
      product: postcardProduct(size),
      source: "api",
      client: client(req),
      analytics_id: req.get("x-analytics-id") || undefined,
    });
    res.status(existing ? 200 : 201).json(publicOrder(order));
  }),
);

api.post(
  "/letters",
  handle(async (req, res) => {
    if (req.body?.recipients !== undefined) {
      const { recipients } = RecipientsSchema.parse(req.body);
      const { certified, ...input } = CreateLetterSchema.parse({ ...req.body, recipients: undefined, to: recipients[0] });
      const content = await prepareLetterContent(input.content); // a PDF is fetched and stored once for the whole group
      return createGroup(req, res, recipients, (to, key, batch_id) => createOrder({
        ...input, to, content, idempotency_key: key, batch_id, product: letterProduct(certified), source: "api", client: client(req), analytics_id: req.get("x-analytics-id") || undefined,
      }), idem(req, input));
    }
    const { certified, ...input } = CreateLetterSchema.parse(req.body);
    const { order, existing } = await createOrder({
      ...input,
      content: await prepareLetterContent(input.content),
      idempotency_key: idem(req, input),
      product: letterProduct(certified),
      source: "api",
      client: client(req),
      analytics_id: req.get("x-analytics-id") || undefined,
    });
    res.status(existing ? 200 : 201).json(publicOrder(order));
  }),
);

api.get(
  "/orders/:id",
  handle(async (req, res) => {
    const o = await getOrder(String(req.params.id));
    if (!o) return apiError(res, 404, "not_found", `No order ${req.params.id}`);
    res.json(publicOrder(o));
  }),
);

api.post(
  "/orders/:id/cancel",
  handle(async (req, res) => {
    const o = await getOrder(String(req.params.id));
    if (!o) return apiError(res, 404, "not_found", `No order ${req.params.id}`);
    if (o.status !== "awaiting_payment")
      return apiError(res, 409, "not_cancellable", `Order is ${o.status}. Paid orders: email support before printing.`);
    res.json(publicOrder((await setStatus(o.id, "cancelled", "cancelled by customer via API"))!));
  }),
);

// Agent payment: charge a Stripe shared payment token (spt_…) for an unpaid order. No browser needed.
api.post(
  "/orders/:id/pay",
  handle(async (req, res) => {
    const o = await getOrder(String(req.params.id));
    if (!o) return apiError(res, 404, "not_found", `No order ${req.params.id}`);
    const token = String(req.body?.shared_payment_token ?? "");
    try {
      res.json(publicOrder(await payWithSharedToken(o, token)));
    } catch (e) {
      if (e instanceof PaymentError) return apiError(res, e.code === "not_payable" ? 409 : 402, e.code, e.message);
      throw e;
    }
  }),
);

// PDF upload for letters from the customer's own document. Normalized to 8.5×11 right away, so the response can
// report the page count (and any problem) before the order is created. Returns a URL usable as content.pdf_url.
api.post(
  "/files",
  express.raw({ type: ["application/pdf"], limit: LIMITS.pdfBytes }),
  handle(async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.get("content-type") !== "application/pdf")
      return apiError(res, 415, "unsupported_media", `Upload a PDF (max ${LIMITS.pdfBytes / 1024 / 1024} MB, ${LIMITS.pdfPages} pages).`);
    const { bytes, pages } = await normalizePdf(req.body);
    const url = await storePdf(bytes);
    res.status(201).json({ id: url.split("/").pop(), url, pages });
  }),
);

// Photo upload for the web form's postcard front. Returns a URL usable as content.front_image_url.
api.post(
  "/images",
  express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: LIMITS.imageBytes }),
  handle(async (req, res) => {
    const mime = req.get("content-type") ?? "";
    if (!Buffer.isBuffer(req.body) || !/^image\/(jpeg|png|webp)$/.test(mime))
      return apiError(res, 415, "unsupported_media", "Upload a JPG, PNG or WebP image (max 6 MB).");
    const id = newId("img");
    await pool.query("INSERT INTO images (id, mime, bytes) VALUES ($1,$2,$3)", [id, mime, req.body]);
    res.status(201).json({ id, url: `/images/${id}` });
  }),
);
