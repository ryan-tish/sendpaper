// "Order links" for agents that browse instead of calling the API (added 2026-10-02).
// An agent builds one URL with every field as a query parameter. Opening it renders the exact preview with a single
// Pay button. Nothing is created on GET (link previews and crawlers must never create orders); the Pay click POSTs,
// creates the order (idempotent per rendered page) and goes straight to Stripe Checkout.
//
//   /quick?type=postcard&size=4x6&headline=Happy%20birthday!&message=…
//         &to_name=…&to_line1=…&to_city=…&to_state=TX&to_zip=78701
//         &from_name=…&from_line1=…&from_city=…&from_state=CO&from_zip=80202
import { randomBytes } from "node:crypto";
import express, { Router } from "express";
import { BASE_URL, BRAND, PRODUCTS, type ProductId, letterProduct, type Certified, isLetter, postcardProduct } from "./config.ts";
import { page } from "./layout.ts";
import { CreateLetterSchema, CreatePostcardSchema, createOrder, orderPrice } from "./orders.ts";
import { addressBlock, esc, letterPages, postcardBack, postcardFront, PRINT_CSS } from "./render.ts";

export const QUICK_PARAMS = {
  type: "postcard (default) or letter",
  size: "postcards: 4x6 (default), 6x9 or 6x11",
  headline: "postcard front text (or use image)",
  image: "postcard front photo, or a photo at the top of a letter (prints in color), https URL",
  theme: "ink, sky, sunset or forest (text fronts)",
  message: "postcard back, up to 600 characters",
  body: "letter text; blank lines between paragraphs",
  font: "letters: serif or sans",
  certified: "letters: certified ($14.99, USPS tracking and proof of delivery) or certified_return_receipt ($19.99, adds the recipient's signature)",
  "to_name, to_line1, to_line2, to_city, to_state, to_zip": "recipient (US)",
  "from_name, from_line1, from_line2, from_city, from_state, from_zip": "return address (required)",
  express: "1 for express delivery (USPS Priority Mail, 2–3 days, tracked; not with certified)",
  email: "optional, for the receipt",
};

type Q = Record<string, string>;

function flatten(query: Record<string, unknown>): Q {
  const out: Q = {};
  for (const [k, v] of Object.entries(query)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (typeof s === "string" && s.trim()) out[k] = s;
  }
  return out;
}

const addr = (q: Q, p: "to" | "from") =>
  Object.fromEntries(
    ["name", "company", "line1", "line2", "city", "state", "zip"].flatMap((k) => (q[`${p}_${k}`] ? [[k, q[`${p}_${k}`]]] : [])),
  );

// Map validation paths back to the URL parameter names, so an agent can fix its own link.
const PARAM_FOR: Record<string, string> = {
  "content.front_headline": "headline",
  "content.front_image_url": "image",
  "content.front_theme": "theme",
  "content.message": "message",
  "content.body": "body",
  "content.font": "font",
  certified: "certified",
  content: "headline or image",
  customer_email: "email",
};
const paramName = (path: string) => PARAM_FOR[path] ?? path.replace(/^(to|from)\./, "$1_");

export function parseQuick(q: Q) {
  const letter = q.type === "letter";
  const base = { to: addr(q, "to"), from: addr(q, "from"), ...(q.email ? { customer_email: q.email } : {}), ...(/^(1|true|yes)$/i.test(q.express ?? "") ? { express: true } : {}) };
  const parsed = letter
    ? CreateLetterSchema.safeParse({ ...base, ...(q.certified ? { certified: q.certified } : {}), content: { body: (q.body ?? "").replace(/\\n/g, "\n"), ...(q.font ? { font: q.font } : {}), ...(q.image ? { image_url: q.image } : {}) } })
    : CreatePostcardSchema.safeParse({
        ...base,
        size: q.size || "4x6",
        content: {
          message: (q.message ?? "").replace(/\\n/g, "\n"),
          ...(q.image ? { front_image_url: q.image } : {}),
          ...(q.headline ? { front_headline: q.headline } : {}),
          ...(q.theme ? { front_theme: q.theme } : {}),
        },
      });
  if (!parsed.success)
    return { ok: false as const, errors: parsed.error.issues.map((i) => ({ param: paramName(i.path.join(".")), message: /received undefined/.test(i.message) ? "missing: add this parameter" : i.message })) };
  const product: ProductId = letter ? letterProduct((parsed.data as { certified?: Certified }).certified) : postcardProduct((parsed.data as { size: string }).size);
  return { ok: true as const, product, data: parsed.data };
}

const CSS = `
.quick { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: 40px; align-items: start; padding-block: 48px 0; }
.sheet { background: var(--tint); border: 1px solid var(--rule); border-radius: 16px; padding: 20px; overflow: hidden; }
.sheet .scale { transform-origin: top left; width: max-content; }
.pay { display: grid; gap: 14px; border: 1px solid var(--rule); border-radius: 16px; padding: 22px; background: var(--card); position: sticky; top: 90px; }
.pay .total { display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid var(--rule); padding-top: 12px; }
.pay .total b { font: 600 1.5rem var(--f-ui); }
.pay .btn { justify-content: center; padding-block: 13px; width: 100%; }
.pay .fine { font-size: .82rem; color: var(--faint); }
.errs { display: grid; gap: 8px; margin: 0; padding-left: 18px; }
.errs code { font-size: .85rem; }
@media (max-width: 900px) { .quick { grid-template-columns: minmax(0, 1fr); } .pay { position: static; } }
${PRINT_CSS}
`;

export const quick = Router();
quick.use("/quick", express.urlencoded({ extended: false, limit: "20kb" }));

quick.get("/quick", (req, res) => {
  const q = flatten(req.query as Record<string, unknown>);
  const r = parseQuick(q);
  const editLink = `/send?${new URLSearchParams(q).toString()}`;
  if (!r.ok) {
    res.status(422).send(
      page(
        `Fix this order link — ${BRAND}`,
        `<style>${CSS}</style><section style="max-width:720px"><span class="eyebrow">Order link</span><h1>A few details are missing</h1>
        <p class="soft">Nothing has been ordered. Fix these URL parameters and open the link again, or finish in the form.</p>
        <ul class="errs">${r.errors.map((e) => `<li><code>${esc(e.param)}</code>: ${esc(e.message)}</li>`).join("")}</ul>
        <p><a class="btn alt" href="${esc(editLink)}">Finish in the form</a></p>
        <p class="soft">Parameters: ${Object.entries(QUICK_PARAMS).map(([k, v]) => `<code>${esc(k)}</code> (${esc(v)})`).join(", ")}.</p></section>`,
        { noindex: true },
      ),
    );
    return;
  }
  const preview = { product: r.product, content: r.data.content as Record<string, string>, to_address: r.data.to, from_address: r.data.from, created_at: new Date() };
  const pieces =
    isLetter(r.product)
      ? letterPages(preview)
      : `${postcardFront(preview)}${postcardBack(preview)}`;
  const p = PRODUCTS[r.product];
  const total = `$${(orderPrice(r.product, r.data.content, (r.data as { express?: boolean }).express) / 100).toFixed(2)}`;
  const nonce = randomBytes(9).toString("base64url");
  res.send(
    page(
      `Review and pay — ${BRAND}`,
      `<style>${CSS}</style>
      <div class="quick">
        <div style="display:grid;gap:14px;min-width:0"><span class="eyebrow">Order link</span><h1>${esc(p.name)} to ${esc(r.data.to.name)}</h1>
          <p class="soft">This is exactly what will be printed. Nothing is ordered until you pay.</p>
          <div class="sheet" id="sheet"><div class="scale" id="scale" style="display:grid;gap:16px">${pieces}</div></div></div>
        <form class="pay" method="post" action="/quick?${esc(new URLSearchParams(q).toString())}">
          <input type="hidden" name="nonce" value="${nonce}">
          <div style="display:grid;gap:4px"><b>To</b><div class="soft">${addressBlock(r.data.to)}</div></div>
          <div style="display:grid;gap:4px"><b>From</b><div class="soft">${addressBlock(r.data.from)}</div></div>
          <div class="total"><span>Total, postage included</span><b>${total}</b></div>
          <button class="btn" id="pay" type="submit">Pay ${total}</button>
          <p class="fine">Checkout by Stripe (cards, Link, Apple Pay). By paying you confirm this mail follows our <a href="/content-policy">content policy</a>; a person reviews every piece before printing.</p>
          <a class="fine" href="${esc(editLink)}">Edit in the full form</a>
        </form>
      </div>
      <script>
      // Fit the print-size preview into its column.
      const sheet = document.getElementById("sheet"), sc = document.getElementById("scale");
      function fit() { sc.style.transform = ""; const k = Math.min(1, (sheet.clientWidth - 40) / sc.offsetWidth); sc.style.transform = "scale(" + k + ")"; sheet.style.height = (sc.offsetHeight * k + 40) + "px"; }
      addEventListener("resize", fit); fit();
      document.querySelector(".pay").addEventListener("submit", () => { const b = document.getElementById("pay"); b.disabled = true; b.textContent = "Opening checkout…"; });
      </script>`,
      { noindex: true, description: `Review and pay for a ${p.name.toLowerCase()} from ${BRAND}.` },
    ),
  );
});

quick.post("/quick", async (req, res) => {
  const q = flatten(req.query as Record<string, unknown>);
  const r = parseQuick(q);
  if (!r.ok) return res.redirect(303, `/quick?${new URLSearchParams(q).toString()}`);
  const nonce = String((req.body as Record<string, string> | undefined)?.nonce ?? "").slice(0, 40);
  const { order } = await createOrder({
    ...r.data,
    content: r.data.content,
    product: r.product,
    source: "web",
    client: "order-link",
    idempotency_key: nonce ? `quick-${nonce}` : undefined, // the same rendered page can never create two orders
  });
  res.redirect(303, order.status === "awaiting_payment" ? `/o/${order.id}/pay` : `/o/${order.id}`);
});

export const QUICK_EXAMPLE = `${BASE_URL}/quick?type=postcard&size=4x6&headline=Happy%20birthday%2C%20Mom!&theme=sunset&message=I%27ll%20call%20you%20Sunday.&to_name=Dana%20Kim&to_line1=12%20Oak%20St&to_city=Austin&to_state=TX&to_zip=78701&from_name=Alex%20Kim&from_line1=88%20Pine%20Ave&from_city=Denver&from_state=CO&from_zip=80202`;
