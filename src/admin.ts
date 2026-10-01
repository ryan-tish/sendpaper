import { timingSafeEqual } from "node:crypto";
import express, { Router, type NextFunction, type Request, type Response } from "express";
import { PRODUCTS, env } from "./config.ts";
import { page } from "./layout.ts";
import { getOrder, listOrders, setStatus, STATUSES, type Status } from "./orders.ts";
import { stripe } from "./payments.ts";
import { addressBlock, esc, printSheet } from "./render.ts";

// The operator's queue: paid orders get reviewed, printed (or sent to a print partner), then marked mailed.
export const admin = Router();

function auth(req: Request, res: Response, next: NextFunction) {
  const [, b64] = (req.get("authorization") ?? "").split(" ");
  const pass = Buffer.from(b64 ?? "", "base64").toString().split(":").slice(1).join(":");
  const ok =
    env.adminToken.length >= 12 &&
    pass.length === env.adminToken.length &&
    timingSafeEqual(Buffer.from(pass), Buffer.from(env.adminToken));
  if (ok) return next();
  res.set("WWW-Authenticate", 'Basic realm="admin"').status(401).send("Admin login required (any username, ADMIN_TOKEN as password).");
}
admin.use(auth);
admin.use(express.urlencoded({ extended: false }));

admin.get("/", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "paid";
  const orders = await listOrders(status === "all" ? undefined : status);
  const tabs = ["paid", "printing", "mailed", "awaiting_payment", "cancelled", "refunded", "all"]
    .map((s) => (s === status ? `<b>${s}</b>` : `<a href="?status=${s}">${s}</a>`))
    .join(" · ");
  const rows = orders
    .map(
      (o) => `<tr><td><a href="/admin/orders/${o.id}">${o.id}</a></td><td>${esc(PRODUCTS[o.product].name)}</td>
      <td>${esc(o.status)}</td><td>${esc(o.to_address.name)}, ${esc(o.to_address.city)} ${esc(o.to_address.state)}</td>
      <td>${esc(o.source)}${o.client ? ` / ${esc(o.client)}` : ""}</td><td>$${(o.price_cents / 100).toFixed(2)}</td>
      <td>${o.created_at.toISOString().slice(0, 16).replace("T", " ")}</td></tr>`,
    )
    .join("");
  res.send(
    page(
      "Admin",
      `<section><h1>Orders</h1><p>${tabs}</p><div class="scroll"><table>
      <tr><th>Id</th><th>Product</th><th>Status</th><th>To</th><th>Source</th><th>Price</th><th>Created (UTC)</th></tr>
      ${rows || `<tr><td colspan="7" class="soft">No ${esc(status)} orders.</td></tr>`}</table></div></section>`,
      { noindex: true },
    ),
  );
});

admin.get("/orders/:id", async (req, res) => {
  const o = await getOrder(String(req.params.id));
  if (!o) return res.status(404).send("No such order");
  const btn = (s: Status, label: string, extra = "") =>
    `<form method="post" action="/admin/orders/${o.id}/status" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end">
      <input type="hidden" name="status" value="${s}">${extra}<button class="btn${s === "refunded" || s === "cancelled" ? " alt" : ""}">${label}</button></form>`;
  res.send(
    page(
      `Admin · ${o.id}`,
      `<section><h1>${esc(o.id)}</h1>
      <p><b>${esc(PRODUCTS[o.product].name)}</b> · ${esc(o.status)} · $${(o.price_cents / 100).toFixed(2)} · ${esc(o.customer_email ?? "no email")} · via ${esc(o.source)} ${esc(o.client ?? "")}</p>
      <div class="grid"><div class="card"><b>To</b>${addressBlock(o.to_address)}</div><div class="card"><b>From</b>${addressBlock(o.from_address)}</div></div>
      <p><a class="btn" href="/admin/orders/${o.id}/print" target="_blank">Open print sheet</a></p>
      <div style="display:grid;gap:12px">
        ${btn("printing", "Mark printing")}
        ${btn("mailed", "Mark mailed", `<label style="flex:1">Note (e.g. partner job id)<input name="note"></label>`)}
        ${btn("refunded", "Reject & refund via Stripe", `<label style="flex:1">Reason<input name="note" required></label>`)}
        ${btn("cancelled", "Cancel without refund")}
      </div>
      <h2>History</h2><pre><code>${esc(JSON.stringify(o.events, null, 2))}</code></pre>
      <h2>Content</h2><pre><code>${esc(JSON.stringify(o.content, null, 2))}</code></pre></section>`,
      { noindex: true },
    ),
  );
});

admin.get("/orders/:id/print", async (req, res) => {
  const o = await getOrder(String(req.params.id));
  if (!o) return res.status(404).send("No such order");
  res.send(printSheet(o, { operator: true }));
});

admin.post("/orders/:id/status", async (req, res) => {
  const o = await getOrder(String(req.params.id));
  const status = req.body.status as Status;
  if (!o || !STATUSES.includes(status)) return res.status(400).send("Bad request");
  if (status === "refunded") {
    if (!stripe || !o.stripe_payment) return res.status(400).send("No Stripe payment on this order to refund.");
    await stripe.refunds.create({ payment_intent: o.stripe_payment, metadata: { order_id: o.id } });
  }
  await setStatus(o.id, status, req.body.note || undefined);
  res.redirect(303, `/admin/orders/${o.id}`);
});
