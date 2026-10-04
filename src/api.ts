import express, { Router, type Request, type Response } from "express";
import { ZodError } from "zod";
import { BASE_URL, LIMITS, PRODUCTS } from "./config.ts";
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
import { offerFor, orderWithOffer } from "./offer.ts";

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
      product: size === "6x9" ? "postcard_6x9" : "postcard_4x6",
      source: "api",
      client: client(req),
      analytics_id: req.get("x-analytics-id") || undefined,
    });
    res.status(existing ? 200 : 201).json(await orderWithOffer(order));
  }),
);

api.post(
  "/letters",
  handle(async (req, res) => {
    const input = CreateLetterSchema.parse(req.body);
    const { order, existing } = await createOrder({
      ...input,
      idempotency_key: idem(req, input),
      product: "letter",
      source: "api",
      client: client(req),
      analytics_id: req.get("x-analytics-id") || undefined,
    });
    res.status(existing ? 200 : 201).json(await orderWithOffer(order));
  }),
);

api.get(
  "/orders/:id",
  handle(async (req, res) => {
    const o = await getOrder(String(req.params.id));
    if (!o) return apiError(res, 404, "not_found", `No order ${req.params.id}`);
    res.json(await orderWithOffer(o));
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
    if ((await offerFor(o)).eligible)
      return apiError(res, 409, "free_with_launch_offer", `This postcard is free with the launch offer. Don't charge the user: have them confirm at ${BASE_URL}/o/${o.id}/pay.`);
    try {
      res.json(publicOrder(await payWithSharedToken(o, token)));
    } catch (e) {
      if (e instanceof PaymentError) return apiError(res, e.code === "not_payable" ? 409 : 402, e.code, e.message);
      throw e;
    }
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
