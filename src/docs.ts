import { Router } from "express";
import { BASE_URL, BRAND, DOCS_URL, PRODUCTS, SUPPORT_EMAIL } from "./config.ts";
import { page } from "./layout.ts";
import { esc } from "./render.ts";

export const docs = Router();

const example = `curl ${BASE_URL}/v1/postcards \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: bday-sam-2026" \\
  -d '{
    "size": "4x6",
    "to":   { "name": "Sam Rivera", "line1": "12 Oak St", "city": "Austin", "state": "TX", "zip": "78701" },
    "from": { "name": "Alex Kim", "line1": "88 Pine Ave", "city": "Denver", "state": "CO", "zip": "80202" },
    "content": {
      "front_headline": "Happy birthday, Sam!",
      "front_theme": "sunset",
      "message": "Thirty looks great on you. Dinner's on me next time I'm in town."
    },
    "customer_email": "alex@example.com"
  }'`;

const response = `{
  "id": "ord_8k2m4q...",
  "object": "postcard",
  "status": "awaiting_payment",
  "price": { "amount_cents": ${PRODUCTS.postcard_4x6.cents}, "currency": "usd", "display": "$${(PRODUCTS.postcard_4x6.cents / 100).toFixed(2)}" },
  "checkout_url": "${BASE_URL}/o/ord_8k2m4q.../pay",
  "preview_url":  "${BASE_URL}/o/ord_8k2m4q.../preview",
  "order_url":    "${BASE_URL}/o/ord_8k2m4q...",
  ...
}`;

docs.get("/docs", (_req, res) => {
  // Once the Mintlify site is live, send people (and search engines) there so there is one canonical copy.
  if (DOCS_URL) return res.redirect(301, DOCS_URL);
  res.send(
    page(
      `API — ${BRAND}`,
      `<section><span class="eyebrow">REST · JSON · no API key</span><h1>API reference</h1>
      <p class="soft">Base URL <code>${esc(BASE_URL)}/v1</code>. Create an order, send the person to <code>checkout_url</code>, and we mail it once they pay. Agents can use the same thing over MCP at <code>${esc(BASE_URL)}/mcp</code> (<a href="/agents">setup</a>).</p></section>
      <section><h2>Create a postcard</h2><p><code>POST /v1/postcards</code></p><pre><code>${esc(example)}</code></pre>
        <p class="soft">Response <code>201</code> (or <code>200</code> when the <code>Idempotency-Key</code> was already used — you get the original order back, never a duplicate):</p><pre><code>${esc(response)}</code></pre></section>
      <section><h2>Fields</h2><div class="scroll"><table>
        <tr><th>Field</th><th>Notes</th></tr>
        <tr><td><code>size</code></td><td>Postcards only: <code>4x6</code> (default), <code>6x9</code> or <code>6x11</code>.</td></tr>
        <tr><td><code>to</code>, <code>from</code></td><td><code>name</code>, optional <code>company</code>, <code>line1</code>, optional <code>line2</code>, <code>city</code>, <code>state</code> (2-letter), <code>zip</code>. US only. Return address is required.</td></tr>
        <tr><td><code>content.front_image_url</code></td><td>Postcard front photo, https URL (JPG/PNG). Or use <code>front_headline</code> (≤60 chars) with <code>front_theme</code>: ink, sky, sunset, forest.</td></tr>
        <tr><td><code>content.message</code></td><td>Postcard back, ≤600 characters.</td></tr>
        <tr><td><code>content.body</code></td><td>Letters (<code>POST /v1/letters</code>): plain text, blank lines between paragraphs, up to ~3 pages. <code>content.font</code>: serif or sans. Optional <code>content.image_url</code>: a photo printed under the date, in color (+$1.00).</td></tr>
        <tr><td><code>customer_email</code></td><td>Optional; Stripe asks at checkout otherwise.</td></tr>
      </table></div></section>
      <section><h2>Other endpoints</h2><div class="scroll"><table>
        <tr><td><code>GET /v1/products</code></td><td>Products and prices.</td></tr>
        <tr><td><code>POST /v1/letters</code></td><td>Same shape as postcards, with <code>content.body</code>.</td></tr>
        <tr><td><code>GET /v1/orders/:id</code></td><td>Order status: awaiting_payment → paid → printing → mailed (or cancelled / refunded).</td></tr>
        <tr><td><code>POST /v1/orders/:id/cancel</code></td><td>Cancel an unpaid order.</td></tr>
      </table></div>
      <p class="soft">Errors are <code>{"error": {"type", "message", "fields": [{"field", "message"}]}}</code> with status 422 for validation problems.</p></section>`,
    ),
  );
});

const policy = (title: string, body: string) => page(`${title} — ${BRAND}`, `<section style="max-width:720px">${body}</section>`);

docs.get("/content-policy", (_req, res) => {
  res.send(
    policy(
      "Content policy",
      `<h1>Content policy</h1>
      <p>A person reviews every piece before it is printed. We refuse, and fully refund, mail that:</p>
      <ul><li>threatens, harasses, stalks or intimidates anyone, or that the recipient has asked not to receive;</li>
      <li>is fraudulent, impersonates a person, business or government agency, or looks like a bill without saying it is not one;</li>
      <li>is obscene, sexually explicit, or puts offensive text on the outside of a postcard;</li>
      <li>advertises to people who did not agree to hear from you (no bulk marketing on this service).</li></ul>
      <p>The sender's name and return address are printed on every piece. We keep order records and cooperate with law enforcement on valid legal requests.</p>`,
    ),
  );
});

docs.get("/terms", (_req, res) => {
  res.send(
    policy(
      "Terms",
      `<h1>Terms of service</h1>
      <p>${esc(BRAND)} prints and mails the content you provide to the address you provide, within the United States, via USPS First-Class Mail. You pay before anything is printed.</p>
      <p><b>Your content.</b> You are responsible for what you send and confirm you have the right to send it. We may refuse any order under our <a href="/content-policy">content policy</a> and will refund it in full.</p>
      <p><b>Delivery.</b> We hand mail to USPS, usually within one business day of payment. We do not control USPS delivery times and cannot guarantee delivery. If a piece is returned as undeliverable because of an address error on our side, we will reprint it for free.</p>
      <p><b>Cancellations and refunds.</b> Unpaid orders are never mailed. Paid orders can be cancelled for a full refund until they are printed; email ${esc(SUPPORT_EMAIL)} with your order id.</p>
      <p><b>Agents.</b> Orders placed by AI agents on your behalf are your orders once you pay for them.</p>
      <p>Questions: ${esc(SUPPORT_EMAIL)}.</p>`,
    ),
  );
});

docs.get("/privacy", (_req, res) => {
  res.send(
    policy(
      "Privacy",
      `<h1>Privacy policy</h1>
      <p>We collect what we need to mail your order: sender and recipient names and addresses, the content of the mail, any photo you upload, and your email address. Payments are handled by Stripe; we never see your card number.</p>
      <p>We use this information only to print, mail and support your order, and to prevent abuse. A person at ${esc(BRAND)} reviews each piece before it is printed.</p>
      <p>Who receives it: Stripe (payments), PostGrid, our print-and-mail partner (only what is needed to print and address the piece), and the US Postal Service (the printed piece itself). When you order through an AI agent such as ChatGPT, Codex or Claude, that agent's provider handles your conversation under its own privacy policy; we receive only the order details the agent sends us. We do not sell personal information or use it for advertising.</p>
      <p>Analytics: we use PostHog to count page views and order steps (for example "order created" or "paid") so we can improve the service. It uses your browser's local storage, not cookies; it doesn't record your screen; and it doesn't include addresses, messages or payment details. Orders placed by AI agents are counted by which agent placed them. We also count page views on our own server: instead of cookies or stored IP addresses, a visitor is an anonymous code that changes every day, so we can count unique visitors without following anyone. The only cookie we set is on our own operator's browser, to leave our visits out of the counts.</p>
      <p>We keep order records for up to 2 years for support, refunds and abuse investigations. To delete your data sooner, email ${esc(SUPPORT_EMAIL)}.</p>`,
    ),
  );
});
