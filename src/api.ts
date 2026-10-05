import express, { Router, type Request, type Response } from "express";
import { ZodError } from "zod";
import { PdfError, normalizePdf, prepareLetterContent, storePdf } from "./pdf.ts";
import { BASE_URL, LIMITS, PRODUCTS, letterProduct, postcardProduct } from "./config.ts";
import { pool } from "./db.ts";
import { PaymentError, payWithSharedToken } from "./payments.ts";
import {
  CreateLetterSchema,
  CreatePostcardSchema,
  createOrder,
  getOrder,
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
