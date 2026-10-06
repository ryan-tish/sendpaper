import { fileURLToPath } from "node:url";
import express, { Router } from "express";
import { readFileSync } from "node:fs";
import { BASE_URL, BRAND, FIRST_ORDER_DISCOUNT_PCT, OFFER_ACTIVE, OFFER_LINE, COLOR_LETTER_CENTS, DOCS_URL, EXPRESS_CENTS, LIMITS, PRODUCTS, SUPPORT_EMAIL, env, EXTRA_SERVICE, isLetter, postcardSpec } from "./config.ts";
import { pool } from "./db.ts";
import { landing } from "./landing.ts";
import { SEND_KINDS, type SendKind, kindFromQuery, sendChooser, sendPage } from "./send.ts";
import { useCasesPage } from "./usecases.ts";
import { GUIDES, guidePage, guidesIndexPage } from "./guides.ts";
import { QUICK_EXAMPLE, QUICK_PARAMS } from "./quick.ts";
import { page } from "./layout.ts";
import { getBatch, getOrder, groupLines, priceLines, publicOrder, type OrderRow } from "./orders.ts";
import { checkoutFor, checkoutUrlFor, confirmBatchFromRedirect, confirmFromRedirect } from "./payments.ts";
import { addReview, listReviews, reviewFor } from "./offer.ts";
import { addressBlock, esc, printSheet, THEMES } from "./render.ts";

export const web = Router();
const MCP_URL = `${BASE_URL}/mcp`;
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

const installSnippets = () => `
<div class="grid">
  <div class="card"><h3>Codex</h3><pre><code>codex mcp add ${esc(BRAND.toLowerCase())} --url ${esc(MCP_URL)}</code></pre>
    <p class="soft">Or install the plugin: <code>codex plugin marketplace add ryan-tish/sendpaper-plugin</code></p></div>
  <div class="card"><h3>Muse Code</h3><pre><code>"mcp_servers": {
  "${esc(BRAND.toLowerCase())}": {
    "transport": "streamable_http",
    "url": "${esc(MCP_URL)}"
  }
}</code></pre><p class="soft">Add to your Muse Code settings.</p></div>
  <div class="card"><h3>Claude Code</h3><pre><code>claude mcp add --transport http ${esc(BRAND.toLowerCase())} ${esc(MCP_URL)}</code></pre>
    <p class="soft">In Claude or ChatGPT apps, add <code>${esc(MCP_URL)}</code> as a custom connector.</p></div>
</div>`;

web.get("/", async (_req, res) => {
  res.send(landing());
});

web.get("/agents", (_req, res) => {
  // Setup instructions live in the docs now; keep this URL working for links already out there (plugin supportURL).
  if (DOCS_URL) return res.redirect(301, `${DOCS_URL}/quickstart`);
  res.send(
    page(
      `Connect your agent — ${BRAND}`,
      `<section><span class="eyebrow">MCP · Streamable HTTP · no API key</span><h1>Let your agent mail things.</h1>
      <p class="soft">Endpoint: <code>${esc(MCP_URL)}</code>. No sign-up: each order returns a checkout link the person pays, so an agent can never spend money on its own.</p>
      ${installSnippets()}</section>
      <section><h2>Tools</h2><div class="scroll"><table>
        <tr><th>Tool</th><th>What it does</th></tr>
        <tr><td><code>get_pricing</code></td><td>Products and prices.</td></tr>
        <tr><td><code>create_postcard</code></td><td>4×6, 6×9 or 6×11 postcard. Front: image URL or headline. Back: message. Returns preview and checkout links.</td></tr>
        <tr><td><code>create_letter</code></td><td>Up to 3 printed pages in a #10 envelope. Returns preview and checkout links.</td></tr>
        <tr><td><code>get_order</code></td><td>Status of an order.</td></tr>
        <tr><td><code>cancel_order</code></td><td>Cancel an unpaid order.</td></tr>
      </table></div></section>
      <section><h2>Try these prompts</h2><div class="grid">
        <div class="card"><p>“Send a 6×9 postcard to my mom at 12 Oak St, Austin TX 78701 with this photo and a happy-birthday note from me.”</p></div>
        <div class="card"><p>“Write a thank-you letter to the contractor who fixed our roof and mail it to their office.”</p></div>
        <div class="card"><p>“Mail my landlord a printed copy of this lease-termination notice.”</p></div>
      </div></section>`,
    ),
  );
});

web.get("/use-cases", (_req, res) => {
  res.send(useCasesPage());
});

// Search pages for professional, proof-of-delivery mail (src/guides.ts).
web.get("/guides", (_req, res) => res.send(guidesIndexPage()));
for (const g of GUIDES) web.get(`/${g.slug}`, (_req, res) => res.send(guidePage(g.slug)));

web.get("/send", async (req, res) => {
  // Links that already name a product go straight to that kind's form, keeping their prefill parameters.
  const kind = kindFromQuery(req.query as Record<string, unknown>);
  if (kind) {
    const qs = req.originalUrl.split("?")[1];
    return res.redirect(302, `/send/${kind}${qs ? `?${qs}` : ""}`);
  }
  res.send(sendChooser());
});

web.get("/send/:kind", async (req, res, next) => {
  const kind = req.params.kind as SendKind;
  if (!SEND_KINDS.includes(kind)) return next();
  res.send(sendPage(String(req.query.product ?? ""), kind));
});

web.get("/o/:id", async (req, res) => {
  const id = String(req.params.id);
  if (req.query.session_id) await confirmFromRedirect(id, String(req.query.session_id)).catch(console.error);
  const o = await getOrder(id);
  if (!o) return res.status(404).send(page("Not found", `<section><h1>No such order</h1></section>`, { noindex: true }));
  const p = publicOrder(o);
  const paid = o.status !== "awaiting_payment";
  const review = o.status === "mailed" ? await reviewFor(o.id) : null;
  const stars = [5, 4, 3, 2, 1].map((n) => `<label class="star"><input type="radio" name="rating" value="${n}" required> ${"★".repeat(n)}</label>`).join("");
  res.send(
    page(
      `Order ${o.id} — ${BRAND}`,
      `<style>.receipt { display: grid; gap: 10px; max-width: 420px; padding: 22px 24px; } .receipt .rl { display: flex; justify-content: space-between; gap: 16px; font-size: .95rem; } .receipt .rl span:last-child { font-variant-numeric: tabular-nums; } .receipt .off { color: var(--green); } .receipt .rt { border-top: 1px solid var(--rule); padding-top: 10px; font-weight: 600; font-size: 1.05rem; }</style>
      <section><span class="eyebrow">Order ${esc(o.id)}</span>
        <h1>${esc(p.product_name)} to ${esc(o.to_address.name)}</h1>
        ${paid ? `<div><span class="pill ok">${esc(o.status.replace("_", " "))}</span></div>
        <p>${esc(p.status_detail)}</p>` : ""}
        ${o.free_offer ? `<p><span class="pill ok">Free</span> Your first postcard is on us.</p>` : ""}
        ${o.express ? `<p><span class="pill ok">Express · USPS Priority Mail</span> Usually delivered 2–3 days after mailing, with tracking.</p>` : ""}
        ${EXTRA_SERVICE[o.product] ? `<p><span class="pill ok">USPS Certified Mail${EXTRA_SERVICE[o.product] === "certified_return_receipt" ? " · return receipt" : ""}</span> ${o.tracking_number ? `Tracking: <a href="https://tools.usps.com/go/TrackConfirmAction?tLabels=${esc(o.tracking_number)}" target="_blank" rel="noopener">${esc(o.tracking_number)}</a>` : "You'll get a USPS tracking number here once it's accepted for mailing."}</p>` : ""}
        <div class="card receipt"><span class="eyebrow">${paid ? "Receipt" : "Order summary"}</span>
          ${priceLines(o).map((l) => `<div class="rl${l.kind === "discount" ? " off" : ""}"><span>${esc(l.label)}</span><span>${l.cents < 0 ? "−" : ""}$${(Math.abs(l.cents) / 100).toFixed(2)}</span></div>`).join("")}
          <div class="rl rt"><span>Total${paid ? " paid" : ""}</span><span>${esc(p.price.display)}</span></div>
          ${o.status === "awaiting_payment" && o.batch_id
            ? `<a class="btn" href="/b/${esc(o.batch_id)}" style="justify-content:center">Pay for the whole group</a><span class="soft" style="font-size:.85rem;text-align:center">This piece is part of a group sent to several people, paid together in one checkout.</span>`
            : o.status === "awaiting_payment"
            ? `<a class="btn" href="/o/${esc(o.id)}/pay" style="justify-content:center">Pay ${esc(p.price.display)}</a><span class="soft" style="font-size:.85rem;text-align:center">Printing and postage included. Nothing is printed until you pay. Secure checkout by Stripe.</span>`
            : ""}</div>
        ${o.status === "mailed"
          ? review
            ? `<div class="card"><b>Thanks for your review!</b><p class="soft">We read every one.</p></div>`
            : `<form method="post" action="/o/${esc(o.id)}/review" class="card offer-card">
                <span class="eyebrow">How did it go?</span><h2 style="margin:0">Leave a review</h2>
                <fieldset class="stars"><legend>Rating</legend>${stars}</fieldset>
                <label for="body">What did you send, and how did it land?</label>
                <textarea id="body" name="body" required maxlength="1000" rows="4"></textarea>
                <label for="name">Name to show <span class="soft">(for example "Alex, Denver")</span></label>
                <input id="name" name="name" required maxlength="60">
                <div><button class="btn" type="submit">Send review</button></div>
                ${o.free_offer ? `<p class="soft" style="font-size:.85rem">Your review will note that this postcard was free. Honest reviews only, good or bad.</p>` : ""}
              </form>`
          : ""}
        <div class="grid">
          <div class="card"><span class="eyebrow">To</span><div>${addressBlock(o.to_address)}</div></div>
          <div class="card"><span class="eyebrow">From</span><div>${addressBlock(o.from_address)}</div></div>
        </div>
        <h2>Print preview</h2>
        <iframe src="/o/${esc(o.id)}/preview" title="Print preview" style="width:100%;height:${isLetter(o.product) ? 1150 : postcardSpec(o.product).h >= 6 ? 1250 : 900}px;border:1px solid var(--rule);border-radius:10px;background:#e9e7e2"></iframe>
        <p class="soft">Something wrong? ${o.status === "awaiting_payment" ? `<a href="/send">Start a new order</a> — unpaid orders are never mailed.` : `Email ${esc(SUPPORT_EMAIL)} with your order id before it's printed.`}</p>
      </section>`,
      { noindex: true },
    ),
  );
});

web.get("/o/:id/pay", async (req, res) => {
  const o = await getOrder(String(req.params.id));
  if (!o) return res.status(404).send("No such order");
  if (o.status !== "awaiting_payment") return res.redirect(`/o/${o.id}`);
  if (o.batch_id) return res.redirect(303, `/b/${o.batch_id}/pay`);
  try {
    res.redirect(303, await checkoutUrlFor(o));
  } catch (e) {
    console.error(e);
    res.status(503).send(page("Checkout unavailable", `<section><h1>Checkout is unavailable right now</h1><p>Your order ${esc(o.id)} is saved. Try again in a few minutes, or email ${esc(SUPPORT_EMAIL)}.</p></section>`, { noindex: true }));
  }
});

// A group: one design sent to several people, paid in one checkout (2026-10-05).
const RECEIPT_CSS = `.receipt { display: grid; gap: 10px; max-width: 460px; padding: 22px 24px; } .receipt .rl { display: flex; justify-content: space-between; gap: 16px; font-size: .95rem; } .receipt .rl span:last-child { font-variant-numeric: tabular-nums; } .receipt .off { color: var(--green); } .receipt .rt { border-top: 1px solid var(--rule); padding-top: 10px; font-weight: 600; font-size: 1.05rem; }`;
const money = (c: number) => `${c < 0 ? "−" : ""}$${(Math.abs(c) / 100).toFixed(2)}`;
const STATUS_WORD: Record<string, string> = { awaiting_payment: "Not paid", paid: "Paid", printing: "Printing", mailed: "Mailed", cancelled: "Cancelled", refunded: "Refunded" };

function batchPage(id: string, orders: OrderRow[]) {
  const first = orders[0], n = orders.length, unpaid = orders.filter((o) => o.status === "awaiting_payment");
  const name = PRODUCTS[first.product].name;
  const due = unpaid.reduce((t, o) => t + o.price_cents, 0);
  const lines = groupLines(unpaid.length ? unpaid : orders);
  const total = (unpaid.length ? unpaid : orders).reduce((t, o) => t + o.price_cents, 0);
  return page(
    `${n} × ${name} — ${BRAND}`,
    `<style>${RECEIPT_CSS} .who { display: grid; gap: 0; max-width: 760px; } .who a { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--rule); color: var(--ink); text-decoration: none; } .who a:hover b { color: var(--green); } .who small { color: var(--soft); } .who .st { font: 500 .78rem var(--f-mono); color: var(--faint); white-space: nowrap; }</style>
    <section><span class="eyebrow">Group ${esc(id)}</span>
      <h1>${n} × ${esc(name)}</h1>
      <p class="soft">One design, mailed separately to each person below${first.express ? " by express" : ""}. Every piece gets its own order page and tracking.</p>
      <div class="card receipt"><span class="eyebrow">${unpaid.length ? "Order summary" : "Receipt"}</span>
        ${lines.map((l) => `<div class="rl${l.kind === "discount" ? " off" : ""}"><span>${esc(l.label)}${l.qty > 1 ? ` × ${l.qty}` : ""}</span><span>${money(l.cents * l.qty)}</span></div>`).join("")}
        <div class="rl rt"><span>Total${unpaid.length ? "" : " paid"}</span><span>${money(total)}</span></div>
        ${unpaid.length ? `<a class="btn" href="/b/${esc(id)}/pay" style="justify-content:center">Pay ${money(due)} for ${unpaid.length === n ? `all ${n}` : `${unpaid.length} of ${n}`}</a><span class="soft" style="font-size:.85rem;text-align:center">Printing and postage included. Nothing is printed until you pay. Secure checkout by Stripe.</span>` : ""}
      </div>
      <h2 style="margin-top:28px">Recipients</h2>
      <div class="who">${orders.map((o) => `<a href="/o/${esc(o.id)}"><span><b>${esc(o.to_address.name)}</b><br><small>${esc([o.to_address.city, o.to_address.state].filter(Boolean).join(", "))}</small></span><span class="st">${STATUS_WORD[o.status] ?? esc(o.status)} · see preview →</span></a>`).join("")}</div>
    </section>`,
    { noindex: true },
  );
}

web.get("/b/:id", async (req, res) => {
  const id = String(req.params.id);
  if (req.query.session_id) await confirmBatchFromRedirect(id, String(req.query.session_id)).catch(console.error);
  const orders = await getBatch(id);
  if (!orders.length) return res.status(404).send(page("Not found", `<section><h1>No such group</h1></section>`, { noindex: true }));
  res.send(batchPage(id, orders));
});

web.get("/b/:id/pay", async (req, res) => {
  const id = String(req.params.id);
  const orders = await getBatch(id);
  if (!orders.length) return res.status(404).send("No such group");
  if (!orders.some((o) => o.status === "awaiting_payment")) return res.redirect(`/b/${id}`);
  try {
    res.redirect(303, await checkoutFor(orders, { kind: "batch", id }));
  } catch (e) {
    console.error(e);
    res.status(503).send(page("Checkout unavailable", `<section><h1>Checkout is unavailable right now</h1><p>Your orders are saved. Try again in a few minutes, or email ${esc(SUPPORT_EMAIL)}.</p></section>`, { noindex: true }));
  }
});

web.post("/o/:id/review", express.urlencoded({ extended: false, limit: "8kb" }), async (req, res) => {
  const o = await getOrder(String(req.params.id));
  if (!o) return res.status(404).send("No such order");
  const rating = Number(req.body?.rating);
  const body = String(req.body?.body ?? "").trim().slice(0, 1000);
  const name = String(req.body?.name ?? "").trim().slice(0, 60);
  if (o.status !== "mailed" || !(rating >= 1 && rating <= 5) || !body || !name) return res.redirect(303, `/o/${o.id}`);
  await addReview(o, Math.round(rating), body, name);
  res.redirect(303, `/o/${o.id}`);
});

web.get("/reviews", async (_req, res) => {
  const reviews = await listReviews(true);
  res.send(
    page(
      `Reviews — ${BRAND}`,
      `<section><span class="eyebrow">Reviews</span><h1 style="font-size:clamp(1.9rem,3.6vw,2.6rem)">What senders say</h1>
      <p class="soft">Every review here comes from a real order. Reviews of free postcards are marked.</p>
      ${reviews.length
        ? `<div class="grid">${reviews.map((r) => `<div class="card"><b aria-label="${r.rating} out of 5">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</b><p>${esc(r.body)}</p><p class="soft">${esc(r.name)}${r.free_offer ? " · received a free postcard" : ""}</p></div>`).join("")}</div>`
        : `<p>No reviews yet. The first ones are on their way.</p>`}</section>`,
      { description: `Reviews of ${BRAND} from people who mailed real postcards and letters.` },
    ),
  );
});

web.get("/o/:id/preview", async (req, res) => {
  const o = await getOrder(String(req.params.id));
  if (!o) return res.status(404).send("No such order");
  res.send(printSheet(o));
});

web.get("/files/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT bytes FROM images WHERE id = $1 AND mime = 'application/pdf'", [req.params.id]);
  if (!rows[0]) return res.status(404).end();
  // Unguessable ids (like order ids); PostGrid fetches these to print. Not indexed.
  res.set({ "Cache-Control": "private, max-age=31536000, immutable", "X-Robots-Tag": "noindex" }).type("application/pdf").send(rows[0].bytes);
});

web.get("/images/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT mime, bytes FROM images WHERE id = $1", [req.params.id]);
  if (!rows[0]) return res.status(404).end();
  res.set("Cache-Control", "public, max-age=31536000, immutable").type(rows[0].mime).send(rows[0].bytes);
});

// One spec for the Mintlify API reference and for agents that read OpenAPI; servers[] is rewritten to this deployment.
const OPENAPI = JSON.parse(readFileSync(new URL("../docs/openapi.json", import.meta.url), "utf8"));
OPENAPI.servers = [{ url: `${BASE_URL}/v1` }];
web.get("/openapi.json", (_req, res) => {
  res.set("Access-Control-Allow-Origin", "*").json(OPENAPI);
});

// Demo walkthrough for the OpenAI plugin review (silent, captioned; built 2026-10-04 from a real Codex run).
web.get("/review/demo.mp4", (_req, res) => {
  res.set("Cache-Control", "public, max-age=3600").sendFile(fileURLToPath(new URL("../assets/review/demo.mp4", import.meta.url)));
});

web.get("/favicon.svg", (_req, res) => {
  res.type("image/svg+xml").set("Cache-Control", "public, max-age=86400").send(readFileSync(new URL("../docs/logo/favicon.svg", import.meta.url)));
});

web.get("/llms.txt", (_req, res) => {
  const docs = DOCS_URL || `${BASE_URL}/docs`;
  res.type("text/plain").send(`# ${BRAND}

> Physical mail for AI agents. ${BRAND} prints and mails real postcards and letters to US addresses, by USPS First-Class, Certified Mail (tracking + proof of delivery) or express. Agents call an MCP server or REST API with no API key; every order returns a checkout_url that a person pays, plus a preview_url of the exact print. Nothing is printed until paid, and a person reviews every piece.

## Connect
- MCP endpoint (Streamable HTTP, no auth): ${MCP_URL}
- Tools: get_pricing, create_postcard, create_letter, pay_order, get_order, cancel_order
- Setup for Codex, Muse Code, Claude and other clients: ${BASE_URL}/#connect

## Docs
- Documentation: ${docs}${DOCS_URL ? `\n- Full docs for LLMs: ${DOCS_URL}/llms-full.txt` : ""}
- OpenAPI spec: ${BASE_URL}/openapi.json
- REST base URL: ${BASE_URL}/v1

## Products
${Object.values(PRODUCTS).map((p) => `- ${p.name} (${p.size}): ${usd(p.cents)}, ${p.blurb}`).join("\n")}

## Options
- Letters: write the text (content.body, optional photo via content.image_url) OR mail the user's own PDF (content.pdf_url, a public https link, up to ${LIMITS.pdfPages} pages; any page size is fitted to 8.5×11 and an address page is added in front; content.color: true prints in color for ${usd(COLOR_LETTER_CENTS)} more).
- Certified Mail for letters: certified "certified" or "certified_return_receipt" (recipient's signature). Use it when the user needs proof: tax notice replies, lease notices, disputes, demand letters.
- Express (postcards and letters): express: true, USPS Priority Mail, usually 2–3 days with tracking, ${usd(EXPRESS_CENTS)} more. Not combinable with certified.
- Postcard fronts: layout headline (front_headline + front_theme: ${Object.keys(THEMES).join(", ")}), photo (front_image_url), photo_caption (front_image_url + caption) or collage (front_images: 2–4 https URLs). headline_font: serif, sans or script; message_font: handwriting, serif or sans.
- ${BRAND} prints and mails what the user or agent writes; it doesn't give legal or tax advice.

## Guides (proof-of-delivery mail)
${GUIDES.map((g) => `- ${g.title}: ${BASE_URL}/${g.slug}`).join("\n")}

## Order links (for agents using a web browser)
- Can't call tools or HTTP APIs? Open one URL with every field: ${BASE_URL}/quick?type=postcard&size=4x6&headline=…&message=…&to_name=…&to_line1=…&to_city=…&to_state=…&to_zip=…&from_name=…&from_line1=…&from_city=…&from_state=…&from_zip=…
- It shows the exact print preview and one Pay button (Stripe Checkout; Link works). Nothing is ordered until Pay is clicked.
- Parameters: ${Object.entries(QUICK_PARAMS).map(([k, v]) => `${k} (${v})`).join("; ")}
- Example: ${QUICK_EXAMPLE}

## First-order discount
- ${OFFER_ACTIVE ? `${OFFER_LINE}: the first order from each return address (any product) gets ${FIRST_ORDER_DISCOUNT_PCT}% off.` : "No first-order discount right now."} It's taken off price automatically when the order is created; the order's discount field shows it. Pay the order's price as usual (pay_order or checkout_url).

## Payment
- Agents can pay with a Stripe shared payment token (spt_…) the user approved, scoped to the order amount in USD: call pay_order, or POST /v1/orders/{id}/pay with {"shared_payment_token": "spt_…"}.${env.stripeNetworkId ? `\n- Sendpaper's Stripe network ID: ${env.stripeNetworkId}` : ""}
- Otherwise the user pays the order's checkout_url (Stripe Checkout).
- Guide: ${DOCS_URL || BASE_URL + "/docs"}/guides/agent-payments

## Rules
- US addresses only; a return address is required.
- Confirm addresses and wording with the user before creating an order; show them the preview and checkout links.
- Content policy (no threats, harassment, fraud, obscenity or bulk marketing): ${BASE_URL}/content-policy
`);
});
