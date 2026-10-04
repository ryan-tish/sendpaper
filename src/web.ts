import { fileURLToPath } from "node:url";
import express, { Router } from "express";
import { readFileSync } from "node:fs";
import { BASE_URL, BRAND, DOCS_URL, LIMITS, PRODUCTS, SUPPORT_EMAIL, env, EXTRA_SERVICE, isLetter } from "./config.ts";
import { pool } from "./db.ts";
import { landing } from "./landing.ts";
import { sendPage } from "./send.ts";
import { useCasesPage } from "./usecases.ts";
import { QUICK_EXAMPLE, QUICK_PARAMS } from "./quick.ts";
import { page } from "./layout.ts";
import { getOrder, publicOrder } from "./orders.ts";
import { checkoutUrlFor, confirmFromRedirect } from "./payments.ts";
import { OFFER_LIMIT, OfferError, addReview, claimFree, listReviews, offerFor, offerRemaining, reviewFor } from "./offer.ts";
import { addressBlock, esc, printSheet } from "./render.ts";

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
  res.send(landing(await offerRemaining().catch(() => 0)));
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
        <tr><td><code>create_postcard</code></td><td>4×6 or 6×9 postcard. Front: image URL or headline. Back: message. Returns preview and checkout links.</td></tr>
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

web.get("/send", async (req, res) => {
  res.send(sendPage(String(req.query.product ?? ""), await offerRemaining().catch(() => 0)));
});

web.get("/o/:id", async (req, res) => {
  const id = String(req.params.id);
  if (req.query.session_id) await confirmFromRedirect(id, String(req.query.session_id)).catch(console.error);
  const o = await getOrder(id);
  if (!o) return res.status(404).send(page("Not found", `<section><h1>No such order</h1></section>`, { noindex: true }));
  const p = publicOrder(o);
  const paid = o.status !== "awaiting_payment";
  const offer = await offerFor(o);
  const review = o.status === "mailed" ? await reviewFor(o.id) : null;
  const stars = [5, 4, 3, 2, 1].map((n) => `<label class="star"><input type="radio" name="rating" value="${n}" required> ${"★".repeat(n)}</label>`).join("");
  res.send(
    page(
      `Order ${o.id} — ${BRAND}`,
      `<section><span class="eyebrow">Order ${esc(o.id)}</span>
        <h1>${esc(p.product_name)} to ${esc(o.to_address.name)}</h1>
        <div><span class="pill${paid || offer.eligible ? " ok" : ""}">${offer.eligible ? "free · ready to send" : esc(o.status.replace("_", " "))}</span></div>
        <p>${offer.eligible ? "Your first postcard is free. Confirm below and we'll print and mail it." : esc(p.status_detail)}</p>
        ${o.free_offer ? `<p><span class="pill ok">Free</span> Your first postcard is on us.</p>` : ""}
        ${EXTRA_SERVICE[o.product] ? `<p><span class="pill ok">USPS Certified Mail${EXTRA_SERVICE[o.product] === "certified_return_receipt" ? " · return receipt" : ""}</span> ${o.tracking_number ? `Tracking: <a href="https://tools.usps.com/go/TrackConfirmAction?tLabels=${esc(o.tracking_number)}" target="_blank" rel="noopener">${esc(o.tracking_number)}</a>` : "You'll get a USPS tracking number here once it's accepted for mailing."}</p>` : ""}
        ${o.status === "awaiting_payment" && offer.eligible
          ? `<form id="free" method="post" action="/o/${esc(o.id)}/claim" class="card offer-card">
              <span class="eyebrow">First postcard free</span>
              <h2 style="margin:0">Your first postcard is free</h2>
              <p class="soft">No card, no checkout. We'll print it and mail it via USPS First-Class after a quick review.</p>
              <label for="email">Email <span class="soft">(optional, so we can follow up and ask how it went)</span></label>
              <input id="email" name="email" type="email" autocomplete="email" placeholder="you@example.com">
              <div><button class="btn green" type="submit">Send it free</button></div>
              <p class="soft" style="font-size:.85rem">One free postcard per return address.</p>
            </form>`
          : o.status === "awaiting_payment"
            ? `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><a class="btn" href="/o/${esc(o.id)}/pay">Pay ${esc(p.price.display)}</a><span class="soft">Secure checkout by Stripe.</span></div>`
            : ""}
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
        <iframe src="/o/${esc(o.id)}/preview" title="Print preview" style="width:100%;height:${isLetter(o.product) ? 1150 : o.product === "postcard_6x9" ? 1250 : 900}px;border:1px solid var(--rule);border-radius:10px;background:#e9e7e2"></iframe>
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
  // A free first postcard never goes to Stripe: send them to the claim form.
  if ((await offerFor(o)).eligible) return res.redirect(303, `/o/${o.id}#free`);
  try {
    res.redirect(303, await checkoutUrlFor(o));
  } catch (e) {
    console.error(e);
    res.status(503).send(page("Checkout unavailable", `<section><h1>Checkout is unavailable right now</h1><p>Your order ${esc(o.id)} is saved. Try again in a few minutes, or email ${esc(SUPPORT_EMAIL)}.</p></section>`, { noindex: true }));
  }
});

web.post("/o/:id/claim", express.urlencoded({ extended: false, limit: "4kb" }), async (req, res) => {
  const id = String(req.params.id);
  const email = String(req.body?.email ?? "").trim().slice(0, 200);
  try {
    await claimFree(id, /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null);
    res.redirect(303, `/o/${id}`);
  } catch (e) {
    if (!(e instanceof OfferError)) throw e;
    res.status(409).send(page("Not eligible", `<section><h1>This one isn't free</h1><p>${esc(e.message)} You can still <a href="/o/${esc(id)}/pay">pay for it</a>.</p></section>`, { noindex: true }));
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

> Physical mail for AI agents. ${BRAND} prints and mails real postcards and letters to US addresses via USPS First-Class. Agents call an MCP server or REST API with no API key; every order returns a checkout_url that a person pays, plus a preview_url of the exact print. Nothing is printed until paid, and a person reviews every piece.

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

## Order links (for agents using a web browser)
- Can't call tools or HTTP APIs? Open one URL with every field: ${BASE_URL}/quick?type=postcard&size=4x6&headline=…&message=…&to_name=…&to_line1=…&to_city=…&to_state=…&to_zip=…&from_name=…&from_line1=…&from_city=…&from_state=…&from_zip=…
- It shows the exact print preview and one Pay button (Stripe Checkout; Link works). Nothing is ordered until Pay is clicked.
- Parameters: ${Object.entries(QUICK_PARAMS).map(([k, v]) => `${k} (${v})`).join("; ")}
- Example: ${QUICK_EXAMPLE}

## First postcard free
- Each sender's first postcard is free (any size, one per return address). It's applied automatically: create the order, and if first_postcard_free.eligible is true, the user just confirms at checkout_url. Don't call pay_order for those.

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
