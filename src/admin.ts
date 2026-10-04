import { timingSafeEqual } from "node:crypto";
import express, { Router, type NextFunction, type Request, type Response } from "express";
import { EXTRA_SERVICE, PRODUCTS, env } from "./config.ts";
import { page } from "./layout.ts";
import { getOrder, listOrders, setStatus, setTest, STATUSES, type Status } from "./orders.ts";
import { stripe } from "./payments.ts";
import { postgridMode, printProofUrl, sendToPrint, syncPrint } from "./fulfill.ts";
import { addressBlock, esc, printSheet } from "./render.ts";
import { listReviews, offerRemaining, setReviewApproved, OFFER_LIMIT } from "./offer.ts";
import { statsPage } from "./stats.ts";

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
// Mark the operator's browser so their own visits aren't counted (stats.ts skips it; the PostHog snippet opts out).
// Only someone who passed admin auth ever gets this cookie.
admin.use((_req, res, next) => {
  res.cookie("sp_owner", "1", { maxAge: 365 * 24 * 3600 * 1000, httpOnly: false, sameSite: "lax", secure: true, path: "/" });
  next();
});
admin.use(express.urlencoded({ extended: false }));

admin.get("/", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "paid";
  const orders = await listOrders(status === "all" ? undefined : status);
  const tabs = ["paid", "printing", "mailed", "awaiting_payment", "cancelled", "refunded", "all", "tests"]
    .map((s) => (s === status ? `<b>${s}</b>` : `<a href="?status=${s}">${s}</a>`))
    .join(" · ");
  const rows = orders
    .map(
      (o) => `<tr><td><a href="/admin/orders/${o.id}">${o.id}</a></td><td>${esc(PRODUCTS[o.product].name)}</td>
      <td>${esc(o.status)}</td><td>${esc(o.to_address.name)}, ${esc(o.to_address.city)} ${esc(o.to_address.state)}</td>
      <td>${esc(o.source)}${o.client ? ` / ${esc(o.client)}` : ""}</td><td>${o.free_offer ? "<b>FREE</b>" : `$${(o.price_cents / 100).toFixed(2)}`}</td>
      <td>${o.created_at.toISOString().slice(0, 16).replace("T", " ")}</td></tr>`,
    )
    .join("");
  res.send(
    page(
      "Admin",
      `<section><h1>Orders</h1><p>${tabs}</p><p class="soft">First postcard free: ${await offerRemaining()} of ${OFFER_LIMIT} free postcards left (internal; not shown publicly) · <a href="/admin/stats"><b>Stats</b></a> · <a href="/admin/reviews">Reviews</a></p><div class="scroll"><table>
      <tr><th>Id</th><th>Product</th><th>Status</th><th>To</th><th>Source</th><th>Price</th><th>Created (UTC)</th></tr>
      ${rows || `<tr><td colspan="7" class="soft">No ${esc(status)} orders.</td></tr>`}</table></div></section>`,
      { noindex: true },
    ),
  );
});

admin.get("/orders/:id", async (req, res) => {
  let o = await getOrder(String(req.params.id));
  if (!o) return res.status(404).send("No such order");
  if (o.print_id) o = (await syncPrint(o.id).catch(() => o)) ?? o;
  const mode = postgridMode();
  const proof = o.print_id ? await printProofUrl(o) : null;
  const printPanel = `<div class="card" style="gap:10px">
    <b>Print with PostGrid <span class="pill${mode === "live" ? "" : " ok"}">${mode === "live" ? "LIVE · mails for real" : mode === "test" ? "test mode · never mailed" : "not configured"}</span></b>
    ${o.print_id
      ? `<p>Job <code>${esc(o.print_id)}</code> · status <b>${esc(o.print_status ?? "?")}</b>${proof ? ` · <a href="${esc(proof)}" target="_blank" rel="noopener">PDF proof</a>` : ""}</p>
         ${o.print_error ? `<p class="err">PostGrid cancelled it: ${esc(o.print_error)}</p>` : ""}
         <form method="post" action="/admin/orders/${o.id}/print-sync"><button class="btn alt">Refresh status</button></form>`
      : o.status === "paid" && mode !== "off"
        ? `<p class="soft">Check the print sheet first. This sends the order to PostGrid${mode === "live" ? " and it will be printed and mailed" : " in test mode (a PDF proof, nothing mailed)"}.</p>
           <form method="post" action="/admin/orders/${o.id}/print-send"><button class="btn">Approve &amp; send to print</button></form>`
        : `<p class="soft">${o.status === "paid" ? "Set POSTGRID_API_KEY to enable." : `Available once the order is paid (now ${esc(o.status)}).`}</p>`}
  </div>`;
  const btn = (s: Status, label: string, extra = "") =>
    `<form method="post" action="/admin/orders/${o.id}/status" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end">
      <input type="hidden" name="status" value="${s}">${extra}<button class="btn${s === "refunded" || s === "cancelled" ? " alt" : ""}">${label}</button></form>`;
  res.send(
    page(
      `Admin · ${o.id}`,
      `<section><h1>${esc(o.id)}</h1>
      <p><b>${esc(PRODUCTS[o.product].name)}</b> · ${esc(o.status)} · ${o.free_offer ? `<span class="pill ok">FREE · first postcard</span> (reject with "Cancel without refund")` : `$${(o.price_cents / 100).toFixed(2)}`} · ${esc(o.customer_email ?? "no email")} · via ${esc(o.source)} ${esc(o.client ?? "")}</p>
      ${EXTRA_SERVICE[o.product] ? `<p><span class="pill ok">USPS ${EXTRA_SERVICE[o.product] === "certified_return_receipt" ? "Certified + return receipt" : "Certified"}</span> ${o.tracking_number ? `Tracking <a href="https://tools.usps.com/go/TrackConfirmAction?tLabels=${esc(o.tracking_number)}" target="_blank" rel="noopener">${esc(o.tracking_number)}</a>` : "Tracking number appears after PostGrid hands it to USPS."}</p>` : ""}
      <div class="grid"><div class="card"><b>To</b>${addressBlock(o.to_address)}</div><div class="card"><b>From</b>${addressBlock(o.from_address)}</div></div>
      <p><a class="btn alt" href="/admin/orders/${o.id}/print" target="_blank">Open print sheet</a></p>
      ${printPanel}
      <div style="display:grid;gap:12px">
        ${btn("printing", "Mark printing")}
        ${btn("mailed", "Mark mailed", `<label style="flex:1">Note (e.g. partner job id)<input name="note"></label>`)}
        ${btn("refunded", "Reject & refund via Stripe", `<label style="flex:1">Reason<input name="note" required></label>`)}
        ${btn("cancelled", "Cancel without refund")}
      </div>
      <form method="post" action="/admin/orders/${o.id}/test"><input type="hidden" name="is_test" value="${o.is_test ? "0" : "1"}">
        <button class="btn alt">${o.is_test ? "Unmark as test (show in lists and stats)" : "Mark as test (hide from lists and stats)"}</button></form>
      <h2>History</h2><pre><code>${esc(JSON.stringify(o.events, null, 2))}</code></pre>
      <h2>Content</h2><pre><code>${esc(JSON.stringify(o.content, null, 2))}</code></pre></section>`,
      { noindex: true },
    ),
  );
});

admin.get("/stats", async (_req, res) => {
  res.send(page("Admin · Stats", await statsPage(), { noindex: true }));
});

// Reviews come in from customers' order pages after mailing; only approved ones are shown on /reviews.
admin.get("/reviews", async (_req, res) => {
  const reviews = await listReviews(false);
  const rows = reviews
    .map(
      (r) => `<tr><td>${"★".repeat(r.rating)}</td><td>${esc(r.body)}</td><td>${esc(r.name)}${r.free_offer ? " · free" : ""}</td>
      <td><a href="/admin/orders/${esc(r.order_id)}">${esc(r.order_id)}</a></td><td>${r.approved ? "shown" : "hidden"}</td>
      <td><form method="post" action="/admin/reviews/${r.id}"><input type="hidden" name="approved" value="${r.approved ? "0" : "1"}"><button class="btn${r.approved ? " alt" : ""}">${r.approved ? "Hide" : "Approve"}</button></form></td></tr>`,
    )
    .join("");
  res.send(
    page(
      "Admin · Reviews",
      `<section><h1>Reviews</h1><p class="soft">Approve honest reviews, good or bad; reviews of free postcards are labelled publicly. <a href="/admin">Orders</a></p>
      <div class="scroll"><table><tr><th>Rating</th><th>Review</th><th>Name</th><th>Order</th><th>Status</th><th></th></tr>
      ${rows || `<tr><td colspan="6" class="soft">No reviews yet.</td></tr>`}</table></div></section>`,
      { noindex: true },
    ),
  );
});

admin.post("/reviews/:id", async (req, res) => {
  await setReviewApproved(Number(req.params.id), req.body.approved === "1");
  res.redirect(303, "/admin/reviews");
});

admin.post("/orders/:id/print-send", async (req, res) => {
  const o = await getOrder(String(req.params.id));
  if (!o) return res.status(404).send("No such order");
  try {
    await sendToPrint(o);
    res.redirect(303, `/admin/orders/${o.id}`);
  } catch (e) {
    res.status(409).send(page("Not sent", `<section><h1>Not sent to print</h1><p class="err">${esc(e instanceof Error ? e.message : String(e))}</p><p><a href="/admin/orders/${o.id}">Back to order</a></p></section>`, { noindex: true }));
  }
});

admin.post("/orders/:id/print-sync", async (req, res) => {
  await syncPrint(String(req.params.id)).catch((e) => console.error("print sync", e));
  res.redirect(303, `/admin/orders/${req.params.id}`);
});

admin.get("/orders/:id/print", async (req, res) => {
  const o = await getOrder(String(req.params.id));
  if (!o) return res.status(404).send("No such order");
  res.send(printSheet(o, { operator: true }));
});

admin.post("/orders/:id/test", async (req, res) => {
  await setTest(String(req.params.id), req.body.is_test === "1");
  res.redirect(303, `/admin/orders/${req.params.id}`);
});

admin.post("/orders/:id/status", async (req, res) => {
  const o = await getOrder(String(req.params.id));
  const status = req.body.status as Status;
  if (!o || !STATUSES.includes(status)) return res.status(400).send("Bad request");
  if (status === "refunded") {
    if (!stripe || !o.stripe_payment) return res.status(400).send("No Stripe payment on this order to refund.");
    try {
      // A refund approved in the Stripe dashboard (or a retry) already exists: just record it.
      const prior = await stripe.refunds.list({ payment_intent: o.stripe_payment, limit: 10 });
      const done = prior.data.some((r) => r.status === "succeeded" || r.status === "pending");
      // Same key per order, so a double-click or retry can never refund twice.
      if (!done) await stripe.refunds.create(
        { payment_intent: o.stripe_payment, metadata: { order_id: o.id } },
        { idempotencyKey: `refund-${o.id}` },
      );
    } catch (e) {
      // Stripe can hold API refunds for dashboard approval; show its reason and leave the order unchanged.
      const message = e instanceof Error ? e.message : String(e);
      return res.status(409).send(
        page(`Refund not done · ${o.id}`, `<section><h1>Refund not done</h1><p>Stripe said: <b>${esc(message)}</b></p>
        <p>The order is unchanged. If Stripe is waiting for approval, approve the refund in the Stripe dashboard, then mark this order refunded again.</p>
        <p><a href="/admin/orders/${o.id}">Back to order</a></p></section>`, { noindex: true }),
      );
    }
  }
  await setStatus(o.id, status, req.body.note || undefined);
  res.redirect(303, `/admin/orders/${o.id}`);
});
