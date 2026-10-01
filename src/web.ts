import { Router } from "express";
import { BASE_URL, BRAND, LIMITS, PRODUCTS, SUPPORT_EMAIL } from "./config.ts";
import { pool } from "./db.ts";
import { page } from "./layout.ts";
import { getOrder, publicOrder } from "./orders.ts";
import { checkoutUrlFor, confirmFromRedirect } from "./payments.ts";
import { addressBlock, esc, printSheet } from "./render.ts";

export const web = Router();
const MCP_URL = `${BASE_URL}/mcp`;
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

const productCards = () =>
  Object.entries(PRODUCTS)
    .map(
      ([id, p]) => `<div class="card"><span class="eyebrow">${esc(p.size)}</span><h3>${esc(p.name)}</h3>
      <div class="price">${usd(p.cents)}</div><p class="soft">${esc(p.blurb)}</p>
      <p class="soft" style="font-size:.85rem">Printing, envelope and First-Class postage included.</p>
      <a class="btn alt" href="/send?product=${id}" style="justify-self:start">Send a ${id === "letter" ? "letter" : "postcard"}</a></div>`,
    )
    .join("");

const installSnippets = () => `
<div class="grid">
  <div class="card"><h3>Codex</h3><pre><code>codex mcp add ${esc(BRAND.toLowerCase())} --url ${esc(MCP_URL)}</code></pre>
    <p class="soft">Or install the plugin: <code>codex plugin marketplace add ryan-fern/sendpaper-plugin</code></p></div>
  <div class="card"><h3>Muse Code</h3><pre><code>"mcp_servers": {
  "${esc(BRAND.toLowerCase())}": {
    "transport": "streamable_http",
    "url": "${esc(MCP_URL)}"
  }
}</code></pre><p class="soft">Add to your Muse Code settings.</p></div>
  <div class="card"><h3>Claude Code</h3><pre><code>claude mcp add --transport http ${esc(BRAND.toLowerCase())} ${esc(MCP_URL)}</code></pre>
    <p class="soft">In Claude or ChatGPT apps, add <code>${esc(MCP_URL)}</code> as a custom connector.</p></div>
</div>`;

web.get("/", (_req, res) => {
  res.send(
    page(
      `${BRAND} — print and mail from your AI agent`,
      `<section style="padding-block:48px 24px">
        <span class="eyebrow">Postcards & letters · US First-Class</span>
        <h1>Real mail, sent by you or your agent.</h1>
        <p class="soft" style="font-size:1.15rem">Write a postcard or a letter here, or ask Codex, Muse or Claude to send one. We print it, stamp it and drop it in the mail, usually within one business day.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn" href="/send">Send something now</a><a class="btn alt" href="/agents">Connect your agent</a></div>
      </section>
      <section><h2>Prices</h2><div class="grid">${productCards()}</div></section>
      <section><h2>How it works</h2>
        <div class="grid">
          <div class="card"><h3>1. Write it</h3><p class="soft">On this site, through the API, or by asking your agent: “Mail my grandma a postcard of this photo.”</p></div>
          <div class="card"><h3>2. Check and pay</h3><p class="soft">You see exactly what will print, then pay with Stripe. Nothing is mailed until you pay.</p></div>
          <div class="card"><h3>3. We mail it</h3><p class="soft">A person checks every piece, prints it and mails it via USPS. You get a tracking page for the order.</p></div>
        </div></section>
      <section><h2>Use it from your agent</h2><p class="soft">One MCP server works in Codex, Muse Code, Claude and ChatGPT. Your agent drafts the mail and hands you a checkout link.</p>${installSnippets()}</section>`,
    ),
  );
});

web.get("/agents", (_req, res) => {
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

web.get("/send", (req, res) => {
  const initial = String(req.query.product ?? "postcard_4x6");
  const options = Object.entries(PRODUCTS)
    .map(([id, p]) => `<option value="${id}"${id === initial ? " selected" : ""}>${esc(p.name)} — ${usd(p.cents)}</option>`)
    .join("");
  const addr = (prefix: string, title: string) => `<fieldset><legend>${title}</legend>
    <label>Full name<input id="${prefix}_name" required maxlength="60" autocomplete="${prefix === "from" ? "name" : "off"}"></label>
    <label>Street address<input id="${prefix}_line1" required maxlength="64"></label>
    <label>Apt, suite (optional)<input id="${prefix}_line2" maxlength="64"></label>
    <div class="row"><label>City<input id="${prefix}_city" required maxlength="40"></label>
    <label>State<input id="${prefix}_state" required maxlength="2" placeholder="CA"></label>
    <label>ZIP<input id="${prefix}_zip" required maxlength="10" inputmode="numeric"></label></div></fieldset>`;
  res.send(
    page(
      `Send mail — ${BRAND}`,
      `<section><h1>Send a postcard or letter</h1><p class="soft">US addresses only. You'll see the exact print preview before you pay.</p>
      <form id="f" novalidate style="display:grid;gap:18px;max-width:720px">
        <label>What are you sending?<select id="product">${options}</select></label>
        <fieldset id="pc"><legend>Postcard</legend>
          <label>Front photo (JPG/PNG, optional)<input id="photo" type="file" accept="image/jpeg,image/png,image/webp"></label>
          <label>…or big text for the front<input id="headline" maxlength="${LIMITS.postcardHeadline}" placeholder="Greetings from Lisbon!"></label>
          <label>Text color theme<select id="theme"><option value="ink">Ink</option><option value="sky">Sky</option><option value="sunset">Sunset</option><option value="forest">Forest</option></select></label>
          <label>Message on the back<textarea id="message" maxlength="${LIMITS.postcardMessage}" placeholder="Wish you were here…"></textarea></label>
        </fieldset>
        <fieldset id="lt" hidden><legend>Letter</legend>
          <label>Letter text<textarea id="body" maxlength="${LIMITS.letterBody}" style="min-height:260px" placeholder="Dear …"></textarea></label>
          <label>Typeface<select id="font"><option value="serif">Serif</option><option value="sans">Sans-serif</option></select></label>
        </fieldset>
        ${addr("to", "Send to")}
        ${addr("from", "From (return address)")}
        <label>Your email (receipt and updates)<input id="email" type="email" required autocomplete="email"></label>
        <label style="display:flex;gap:10px;align-items:start;font-weight:400"><input id="ok" type="checkbox" style="width:auto;margin-top:5px">
          <span>This mail isn't threatening, harassing, fraudulent or obscene, and I'm OK with ${esc(BRAND)} reviewing it before printing. <a href="/content-policy" target="_blank">Content policy</a></span></label>
        <p id="err" class="err" role="alert"></p>
        <button class="btn" id="go" type="submit" style="justify-self:start">Preview and pay</button>
      </form></section>
      <script>
      const $ = (id) => document.getElementById(id);
      const sync = () => { const l = $("product").value === "letter"; $("lt").hidden = !l; $("pc").hidden = l; };
      $("product").addEventListener("change", sync); sync();
      const addr = (p) => Object.fromEntries(["name","line1","line2","city","state","zip"].map(k => [k, $(p+"_"+k).value.trim()]).filter(([,v]) => v));
      $("f").addEventListener("submit", async (e) => {
        e.preventDefault(); $("err").textContent = "";
        if (!$("ok").checked) { $("err").textContent = "Please confirm the content policy."; return; }
        $("go").disabled = true; $("go").textContent = "Working…";
        try {
          const product = $("product").value;
          let body, url;
          if (product === "letter") {
            url = "/v1/letters"; body = { content: { body: $("body").value, font: $("font").value } };
          } else {
            url = "/v1/postcards"; const content = { message: $("message").value, front_theme: $("theme").value };
            if ($("headline").value.trim()) content.front_headline = $("headline").value.trim();
            const file = $("photo").files[0];
            if (file) {
              if (file.size > ${LIMITS.imageBytes}) throw new Error("That photo is over 6 MB. Try a smaller one.");
              const up = await fetch("/v1/images", { method: "POST", headers: { "Content-Type": file.type }, body: file });
              const uj = await up.json(); if (!up.ok) throw new Error(uj.error.message); content.front_image_url = uj.url;
            }
            body = { size: product === "postcard_6x9" ? "6x9" : "4x6", content };
          }
          Object.assign(body, { to: addr("to"), from: addr("from"), customer_email: $("email").value.trim() });
          const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-Client": "web" }, body: JSON.stringify(body) });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error.fields ? j.error.fields.map(f => (f.field || "form") + ": " + f.message).join(" · ") : j.error.message);
          location.href = "/o/" + j.id;
        } catch (err) { $("err").textContent = err.message; $("go").disabled = false; $("go").textContent = "Preview and pay"; }
      });
      </script>`,
    ),
  );
});

web.get("/o/:id", async (req, res) => {
  const id = String(req.params.id);
  if (req.query.session_id) await confirmFromRedirect(id, String(req.query.session_id)).catch(console.error);
  const o = await getOrder(id);
  if (!o) return res.status(404).send(page("Not found", `<section><h1>No such order</h1></section>`, { noindex: true }));
  const p = publicOrder(o);
  const paid = o.status !== "awaiting_payment";
  res.send(
    page(
      `Order ${o.id} — ${BRAND}`,
      `<section><span class="eyebrow">Order ${esc(o.id)}</span>
        <h1>${esc(p.product_name)} to ${esc(o.to_address.name)}</h1>
        <div><span class="pill${paid ? " ok" : ""}">${esc(o.status.replace("_", " "))}</span></div>
        <p>${esc(p.status_detail)}</p>
        ${o.status === "awaiting_payment" ? `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><a class="btn" href="/o/${esc(o.id)}/pay">Pay ${esc(p.price.display)}</a><span class="soft">Secure checkout by Stripe.</span></div>` : ""}
        <div class="grid">
          <div class="card"><span class="eyebrow">To</span><div>${addressBlock(o.to_address)}</div></div>
          <div class="card"><span class="eyebrow">From</span><div>${addressBlock(o.from_address)}</div></div>
        </div>
        <h2>Print preview</h2>
        <iframe src="/o/${esc(o.id)}/preview" title="Print preview" style="width:100%;height:${o.product === "letter" ? 1150 : o.product === "postcard_6x9" ? 1250 : 900}px;border:1px solid var(--rule);border-radius:10px;background:#e9e7e2"></iframe>
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
  try {
    res.redirect(303, await checkoutUrlFor(o));
  } catch (e) {
    console.error(e);
    res.status(503).send(page("Checkout unavailable", `<section><h1>Checkout is unavailable right now</h1><p>Your order ${esc(o.id)} is saved. Try again in a few minutes, or email ${esc(SUPPORT_EMAIL)}.</p></section>`, { noindex: true }));
  }
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

web.get("/llms.txt", (_req, res) => {
  res.type("text/plain").send(`# ${BRAND}

> Print and mail real postcards and letters to US addresses (USPS First-Class). Usable by AI agents via MCP or REST, no API key: every order returns a checkout link a human pays.

- MCP endpoint (Streamable HTTP): ${MCP_URL}
- REST API docs: ${BASE_URL}/docs
- Agent setup (Codex, Muse Code, Claude): ${BASE_URL}/agents
- Prices: ${Object.values(PRODUCTS).map((p) => `${p.name} ${usd(p.cents)}`).join("; ")}
- Content policy: ${BASE_URL}/content-policy
`);
});
