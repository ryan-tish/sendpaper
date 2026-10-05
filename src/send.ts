import { BRAND, OFFER_ACTIVE, OFFER_LINE, COLOR_LETTER_CENTS, EXPRESS_CENTS, LIMITS, POSTCARD_SIZES, PRODUCTS, type ProductId, EXTRA_SERVICE, isLetter, letterProduct } from "./config.ts";
import { docsUrl, page } from "./layout.ts";
import { esc, THEMES } from "./render.ts";

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

const CSS = `
.send { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: 48px; align-items: start; padding-block: 40px 24px; }
.send h1 { font-size: clamp(2rem, 4vw, 2.8rem); }
.form { display: grid; gap: 28px; min-width: 0; }
.step { display: grid; gap: 14px; }
.back-link { font-size: .9rem; color: var(--green); text-decoration: none; font-weight: 500; justify-self: start; }
.back-link:hover { color: var(--ink); }
.step-h { display: flex; align-items: baseline; gap: 10px; }
.step-h span { font: 500 .74rem var(--f-mono); color: var(--green); }
.step-h h2 { font-size: 1.1rem; letter-spacing: -0.01em; }
.choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 640px) { .choices { grid-template-columns: minmax(0, 1fr); } }
.choice small { line-height: 1.4; }
.next { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.step[hidden], .next[hidden] { display: none !important; }
.send.solo { grid-template-columns: minmax(0, 1fr); max-width: 760px; }
.lphoto-pv { display: block; max-width: 100%; max-height: 120px; margin: 0 auto 10px; object-fit: contain; }
.choice { position: relative; display: grid; gap: 4px; padding: 14px; border: 1px solid var(--rule); border-radius: 12px; background: var(--card); cursor: pointer; font-weight: 400; }
.choice:hover { border-color: var(--faint); }
.choice input { position: absolute; opacity: 0; pointer-events: none; }
.choice:has(input:checked) { border-color: var(--green); box-shadow: 0 0 0 3px var(--green-soft); }
.choice:has(input:focus-visible) { outline: 2px solid var(--green); outline-offset: 2px; }
.choice b { font-weight: 600; }
.choice small { color: var(--soft); font-size: .8rem; }
.choice .p { font: 600 1.05rem var(--f-ui); letter-spacing: -0.02em; }
.seg { display: inline-flex; padding: 3px; background: var(--tint); border: 1px solid var(--rule); border-radius: 9px; gap: 2px; justify-self: start; }
.seg label { display: block; padding: 6px 14px; border-radius: 7px; cursor: pointer; font-size: .88rem; color: var(--soft); }
.seg input { position: absolute; opacity: 0; pointer-events: none; }
.seg-wrap { flex-wrap: wrap; }
/* Option tiles: name on one line, price on the next (Ryan, 2026-10-05: don't run "4×6 · $2.99" together). */
.opts { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.opts label { position: relative; display: grid; gap: 2px; align-content: start; padding: 12px 14px; border: 1px solid var(--rule); border-radius: 10px; background: var(--card); cursor: pointer; }
.opts label:hover { border-color: var(--faint); }
.opts label:has(input:checked) { border-color: var(--green); box-shadow: 0 0 0 3px var(--green-soft); }
.opts label:has(input:focus-visible) { outline: 2px solid var(--green); outline-offset: 2px; }
.opts input { position: absolute; opacity: 0; pointer-events: none; }
.opts b { font-weight: 600; font-size: .95rem; } .opts small { color: var(--soft); font-size: .84rem; }
.opts .shape { display: block; border: 1.5px solid var(--faint); border-radius: 3px; margin-bottom: 8px; background: var(--tint); }
.opts label:has(input:checked) .shape { border-color: var(--green); background: var(--green-soft); }
.sizes label { grid-template-rows: 24px auto auto; } .sizes .shape { align-self: end; margin-bottom: 6px; }
.seg label:has(input:checked) { background: var(--card); color: var(--ink); box-shadow: 0 1px 2px rgba(13, 21, 18, .08); }
.seg label:has(input:focus-visible) { outline: 2px solid var(--green); }
.drop { display: grid; place-items: center; gap: 6px; text-align: center; padding: 26px 16px; border: 1.5px dashed var(--rule); border-radius: 12px; background: var(--tint); color: var(--soft); cursor: pointer; font-weight: 400; font-size: .9rem; }
.drop.over, .drop:hover { border-color: var(--green); color: var(--ink); }
.drop input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.drop b { color: var(--ink); font-weight: 500; }
.drop .thumb { width: 120px; aspect-ratio: 3/2; object-fit: cover; border-radius: 6px; }
.linkbtn { background: none; border: 0; padding: 0; color: var(--green); font: 500 .88rem var(--f-ui); cursor: pointer; justify-self: start; }
.linkbtn:hover { color: var(--ink); }
dialog.cropper { border: 1px solid var(--rule); border-radius: 16px; padding: 24px; background: var(--card); color: var(--ink); width: min(680px, calc(100vw - 32px)); box-sizing: border-box; }
dialog.cropper::backdrop { background: rgba(10, 16, 14, .55); }
.crop { display: grid; gap: 16px; }
.crop .soft { font-size: .92rem; margin-top: 4px; }
.crop-view { position: relative; overflow: hidden; border-radius: 8px; background: #111; cursor: grab; touch-action: none; user-select: none; }
.crop-view.dragging { cursor: grabbing; }
.crop-view:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
.crop-view img { position: absolute; left: 0; top: 0; transform-origin: 0 0; max-width: none; pointer-events: none; }
.crop-safe { position: absolute; border: 1.5px dashed rgba(255, 255, 255, .9); pointer-events: none; box-shadow: 0 0 0 9999px rgba(0, 0, 0, .28); }
.crop-zoom { display: flex; align-items: center; gap: 12px; font-size: .9rem; color: var(--soft); }
.crop-zoom input { flex: 1; accent-color: var(--green); }
.crop-warn { font-size: .85rem; color: #9a5b00; }
.crop-actions { display: flex; justify-content: flex-end; gap: 10px; }
.swatches { display: flex; gap: 10px; }
.swatches label { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); position: relative; }
.swatches input { position: absolute; opacity: 0; pointer-events: none; }
.swatches label:has(input:checked) { box-shadow: 0 0 0 2px var(--paper), 0 0 0 4px var(--green); }
.swatches label:has(input:focus-visible) { outline: 2px solid var(--green); outline-offset: 4px; }
.field { display: grid; gap: 6px; }
.field .top { display: flex; justify-content: space-between; font-size: .9rem; font-weight: 500; }
.field .count { font: .75rem var(--f-mono); color: var(--faint); font-weight: 400; }
.addr { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
.addr .w6 { grid-column: span 6; } .addr .w4 { grid-column: span 4; } .addr .w3 { grid-column: span 3; } .addr .w2 { grid-column: span 2; } .addr .w1 { grid-column: span 1; }
.addr input { padding: 10px 12px; }
.consent { display: flex; gap: 10px; align-items: flex-start; font-weight: 400; font-size: .88rem; color: var(--soft); }
.consent input { width: auto; margin-top: 4px; accent-color: var(--green); }
.aside { position: sticky; top: calc(env(safe-area-inset-top, 0px) + 84px); display: grid; gap: 16px; min-width: 0; }
.stage { background: var(--tint); border: 1px solid var(--rule); border-radius: 16px; padding: 22px; display: grid; gap: 14px; justify-items: center; }
.stage .label { justify-self: stretch; display: flex; justify-content: space-between; font: .74rem var(--f-mono); color: var(--faint); text-transform: uppercase; letter-spacing: .06em; }
.card-pv { width: 100%; max-width: 420px; aspect-ratio: 3/2; border-radius: 6px; overflow: hidden; box-shadow: 0 18px 40px -22px rgba(13, 21, 18, .45); background: #fff; color: #1b1b1b; }
.card-pv.big { aspect-ratio: 3/2; }
.front { width: 100%; height: 100%; display: grid; place-items: center; text-align: center; padding: 8%; font: 700 clamp(1.1rem, 2.6vw, 1.7rem)/1.1 Georgia, serif; }
.front img { width: 100%; height: 100%; object-fit: cover; display: block; }
.back { width: 100%; height: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 6%; padding: 6%; font-size: .72rem; line-height: 1.4; }
.back .msg { font-family: "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive; border-right: 1px solid #ddd; padding-right: 6%; overflow: hidden; white-space: pre-wrap; word-break: break-word; }
.back .to { align-self: center; font-family: Helvetica, Arial, sans-serif; white-space: pre-line; }
.letter-pv { width: 100%; max-width: 360px; aspect-ratio: 8.5/11; background: #fff; color: #1b1b1b; border-radius: 4px; box-shadow: 0 18px 40px -22px rgba(13, 21, 18, .45); padding: 9% 10%; font: .62rem/1.5 Georgia, serif; overflow: hidden; white-space: pre-wrap; word-break: break-word; }
.letter-pv .to { font-family: Helvetica, Arial, sans-serif; color: #444; margin-bottom: 14px; white-space: pre-line; }
.flip { display: flex; gap: 8px; }
.flip button { font: 500 .8rem var(--f-ui); background: var(--card); color: var(--soft); border: 1px solid var(--rule); border-radius: 999px; padding: 5px 12px; cursor: pointer; }
.flip button[aria-pressed="true"] { color: var(--ink); border-color: var(--faint); }
.summary { border: 1px solid var(--rule); border-radius: 16px; background: var(--card); padding: 18px; display: grid; gap: 12px; }
.summary .line { display: flex; justify-content: space-between; font-size: .92rem; color: var(--soft); }
.summary .total { display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid var(--rule); padding-top: 12px; }
.summary .total b { font: 600 1.5rem var(--f-ui); letter-spacing: -0.02em; }
.summary .btn { justify-content: center; width: 100%; padding-block: 13px; }
.field .note { font-size: .84rem; color: var(--faint); line-height: 1.5; }
.summary .note { font-size: .8rem; color: var(--faint); text-align: center; }
@media (max-width: 920px) { .send { grid-template-columns: minmax(0, 1fr); gap: 28px; } .aside { position: static; } }
@media (max-width: 380px) { .choices { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 520px) { .choice { padding: 12px 10px; } .addr .w4, .addr .w3, .addr .w2 { grid-column: span 6; } .addr .w1 { grid-column: span 3; } }
`;

const addressFields = (p: string, label: string) => `<fieldset class="addr" style="border:0;padding:0;background:none" aria-label="${label}">
  <label class="w6"><span class="sr">Full name</span><input id="${p}_name" placeholder="Full name" required maxlength="60" autocomplete="${p === "from" ? "name" : "off"}"></label>
  <label class="w4"><span class="sr">Street address</span><input id="${p}_line1" placeholder="Street address" required maxlength="64" ${p === "from" ? 'autocomplete="address-line1"' : ""}></label>
  <label class="w2"><span class="sr">Apt or suite</span><input id="${p}_line2" placeholder="Apt, suite" maxlength="64"></label>
  <label class="w3"><span class="sr">City</span><input id="${p}_city" placeholder="City" required maxlength="40"></label>
  <label class="w1"><span class="sr">State</span><input id="${p}_state" placeholder="ST" required maxlength="2" style="text-transform:uppercase"></label>
  <label class="w2"><span class="sr">ZIP</span><input id="${p}_zip" placeholder="ZIP" required maxlength="10" inputmode="numeric"></label>
</fieldset>`;

export type SendKind = "postcard" | "letter" | "certified";
export const SEND_KINDS: SendKind[] = ["postcard", "letter", "certified"];

// /send with nothing chosen yet (Ryan, 2026-10-05): pick what you're sending, then get one page with every field.
// One definition for the /send tiles and the homepage pricing cards, so their wording can't drift apart. Keep each
// spec value short enough for one line in a 240px card (Ryan dislikes wrapped lines here).
export const KIND_INFO: Record<SendKind, { title: string; h1: string; cta: string; cents: number; purpose: string; format: string; included: string; delivery: string }> = {
  postcard: { title: "Postcard", h1: "Send a postcard", cta: "Send a postcard", cents: PRODUCTS.postcard_4x6.cents, purpose: "For photos and quick notes", format: "4×6, 6×9 or 6×11 card", included: "Printing and postage", delivery: "First-Class or express" },
  letter: { title: "Letter", h1: "Send a letter", cta: "Send a letter", cents: PRODUCTS.letter.cents, purpose: "For documents and correspondence", format: "Up to 3 pages, 8.5×11", included: "Printing, envelope, postage", delivery: "First-Class or express" },
  certified: { title: "Certified letter", h1: "Send a certified letter", cta: "Send a certified letter", cents: PRODUCTS.letter_certified.cents, purpose: "For mail that needs delivery documentation", format: "Up to 3 pages, 8.5×11", included: "Printing, envelope, postage", delivery: "Tracked, proof of delivery" },
};

export const kindSpec = (k: SendKind) => {
  const i = KIND_INFO[k];
  return `<dl class="spec"><div><dt>Format</dt><dd>${i.format}</dd></div><div><dt>Included</dt><dd>${i.included}</dd></div><div><dt>Delivery</dt><dd>${i.delivery}</dd></div></dl>`;
};

export const SPEC_CSS = `
.spec { margin: 0; font-size: .88rem; border-bottom: 1px solid var(--rule); }
.spec > div { display: grid; grid-template-columns: 74px minmax(0, 1fr); align-items: baseline; gap: 10px; padding: 9px 0; border-top: 1px solid var(--rule); }
.spec dt { font: 500 .7rem var(--f-mono); color: var(--faint); text-transform: uppercase; letter-spacing: .06em; }
.spec dd { margin: 0; color: var(--ink); }
`;

// Old /send?… links (order links, guides, use cases) name a product; map them to the page for that kind.
export function kindFromQuery(q: Record<string, unknown>): SendKind | null {
  const g = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : "");
  const product = g("product");
  if ((g("certified") && g("certified") !== "none") || product.startsWith("letter_certified")) return "certified";
  if (product === "letter" || g("type") === "letter" || g("source") === "pdf") return "letter";
  if (product.startsWith("postcard") || g("type") === "postcard" || g("size")) return "postcard";
  return null;
}

export function sendChooser() {
  const tiles = SEND_KINDS.map((k) => {
    const i = KIND_INFO[k];
    return `<a class="kind" href="/send/${k}"><span class="kt">${i.title}</span><span class="kp"><small>from</small> ${usd(i.cents)}</span><b>${i.purpose}</b>${kindSpec(k)}<span class="go">Start →</span></a>`;
  }).join("");
  return page(
    `Send a postcard or letter — ${BRAND}`,
    `<style>${SPEC_CSS}
    .pick { display: grid; gap: 28px; padding-block: 48px 24px; }
    .pick-head { display: grid; gap: 10px; max-width: 640px; } .pick h1 { font-size: clamp(2rem, 4vw, 2.8rem); }
    .kinds { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 16px; }
    .kind { display: flex; flex-direction: column; gap: 10px; padding: 24px; border: 1px solid var(--rule); border-radius: 14px; background: var(--card); color: var(--ink); text-decoration: none; transition: border-color .15s, box-shadow .15s, transform .15s; }
    .kind:hover, .kind:focus-visible { border-color: var(--green); box-shadow: 0 0 0 3px var(--green-soft); }
    .kt { font-weight: 600; font-size: 1.15rem; } .kp { font: 600 1.6rem var(--f-ui); letter-spacing: -0.02em; } .kp small { font: 500 .85rem var(--f-ui); color: var(--faint); margin-right: 4px; }
    .kind b { font-weight: 500; } .kind .go { margin-top: auto; padding-top: 8px; color: var(--green); font-weight: 600; }
    /* Same row alignment as the pricing cards: each tile is a subgrid, so specs line up even when a purpose line wraps. */
    @supports (grid-template-rows: subgrid) { .kinds { row-gap: 0; } .kind { display: grid; grid-row: span 5; grid-template-rows: subgrid; row-gap: 12px; margin-bottom: 16px; } }
    </style>
    <div class="pick">
      <div class="pick-head"><span class="eyebrow">Send mail now</span><h1>What are you sending?</h1><p class="soft">We print it and mail it to any US address. You see the exact print before you pay.${OFFER_ACTIVE ? ` <b style="color:var(--green)">${esc(OFFER_LINE)}.</b>` : ""}</p></div>
      <div class="kinds">${tiles}</div>
      <p class="soft" style="font-size:.85rem">AI agent? Skip this form. Build an <a href="${esc(docsUrl("/guides/order-links"))}">order link</a> (one URL with every field) or call the <a href="${esc(docsUrl("/api/introduction"))}">API</a>.</p>
    </div>`,
  );
}

export function sendPage(initial: string, fixed: SendKind) {
  // The page is for one kind; a product from an old link only refines it (a size, or certified + return receipt).
  let asked: ProductId = initial in PRODUCTS ? (initial as ProductId) : "postcard_4x6";
  if (fixed === "postcard" && isLetter(asked)) asked = "postcard_4x6";
  if (fixed === "letter") asked = "letter";
  if (fixed === "certified" && !EXTRA_SERVICE[asked]) asked = "letter_certified";
  // Certified letters are a mailing option on the Letter tile, not tiles of their own.
  const start: ProductId = isLetter(asked) ? "letter" : asked;
  const startMailing = EXTRA_SERVICE[asked] ?? "none";
  // Mailing for letters: First-Class, Express (USPS Priority, extra charge) or Certified (with or without receipt).
  const mailing = (["none", "express", "certified", "certified_return_receipt"] as const)
    .map((m) => {
      const [name, price] =
        m === "none" ? ["First-Class", `${usd(PRODUCTS.letter.cents)} · 3–5 days`]
        : m === "express" ? ["Express", `${usd(PRODUCTS.letter.cents + EXPRESS_CENTS)} · 2–3 days`]
        : m === "certified" ? ["Certified", `${usd(PRODUCTS.letter_certified.cents)} · tracked`]
        : ["Certified + receipt", `${usd(PRODUCTS.letter_certified_rr.cents)} · signature`];
      return `<label><input type="radio" name="mailing" value="${m}"${m === startMailing ? " checked" : ""}><b>${name}</b><small>${price}</small></label>`;
    })
    .join("");
  const info = KIND_INFO[fixed];
  const sizes = (["postcard_4x6", "postcard_6x9", "postcard_6x11"] as const)
    .map((id) => {
      // A to-scale outline of the card (6×11 is the widest), then the size, then the price on its own line.
      const sz = Object.values(POSTCARD_SIZES).find((x) => x.product === id)!;
      return `<label><input type="radio" name="product" value="${id}"${!isLetter(asked) && id === asked ? " checked" : ""}><i class="shape" style="width:${Math.round((sz.w / 11) * 44)}px;height:${Math.round((sz.h / 11) * 44)}px" aria-hidden="true"></i><b>${sz.h}×${sz.w} in</b><small>${usd(PRODUCTS[id].cents)}</small></label>`;
    })
    .join("");
  const swatches = Object.entries(THEMES)
    .map(([k, [bg]], i) => `<label style="background:${bg}" title="${k}"><input type="radio" name="theme" value="${k}"${i === 0 ? " checked" : ""}><span class="sr">${k}</span></label>`)
    .join("");

  return page(
    `${info.h1} — ${BRAND}`,
    `<style>${CSS}</style>
    <div class="send" id="sendWrap">
      <form id="f" class="form" novalidate>
        <div style="display:grid;gap:10px"><a class="back-link" href="/send">← Send something else</a><h1>${info.h1}</h1><p class="soft">${info.purpose}. We print it and mail it to any US address, and you see the exact print before you pay.</p></div>
        <input type="radio" name="kind" value="${fixed}" checked hidden>
        <input type="radio" name="product" value="letter" tabindex="-1" aria-hidden="true" class="sr"${isLetter(asked) ? " checked" : ""}>

        <div class="step" id="pc"${fixed === "postcard" ? "" : " hidden"}><div class="step-h"><span>01</span><h2>Design your postcard</h2></div>
          <div class="field"><div class="top">Size</div><div class="opts sizes" role="radiogroup" aria-label="Postcard size">${sizes}</div></div>
          <div class="field"><div class="top">Front</div><div class="seg seg-wrap" role="radiogroup" aria-label="Front style"><label><input type="radio" name="front" value="text" checked>Text</label><label><input type="radio" name="front" value="photo">Photo</label><label><input type="radio" name="front" value="caption">Photo + caption</label><label><input type="radio" name="front" value="collage">Collage</label></div></div>
          <label class="drop" id="drop" hidden><input id="photo" type="file" accept="image/jpeg,image/png,image/webp"><span id="dropText"><b>Drop a photo</b> or click to choose<br><small>JPG, PNG or WebP, up to 25 MB. You can crop it next.</small></span></label>
          <button type="button" class="linkbtn" id="recrop" hidden>Adjust crop</button>
          <div class="field" id="captionBox" hidden><div class="top"><label for="caption">Caption</label><span class="count" id="cc">0/${LIMITS.postcardCaption}</span></div><input id="caption" maxlength="${LIMITS.postcardCaption}" placeholder="Greetings from Lisbon"></div>
          <label class="drop" id="cdrop" hidden><input id="cphotos" type="file" accept="image/jpeg,image/png,image/webp" multiple><span id="cdropText"><b>Choose 2 to 4 photos</b> for the collage<br><small>They're arranged in a grid and trimmed to fit each spot.</small></span></label>
          <button type="button" class="linkbtn" id="cclear" hidden>Start the collage over</button>
          <div class="field" id="fontBox"><div class="top">Headline font</div><div class="seg" role="radiogroup" aria-label="Headline font"><label><input type="radio" name="hfont" value="serif" checked>Serif</label><label><input type="radio" name="hfont" value="sans">Sans</label><label><input type="radio" name="hfont" value="script">Script</label></div></div>
          <div id="textFront" style="display:grid;gap:12px">
            <div class="field"><div class="top"><label for="headline">Big text</label><span class="count" id="hc">0/${LIMITS.postcardHeadline}</span></div><input id="headline" maxlength="${LIMITS.postcardHeadline}" placeholder="Greetings from Lisbon!"></div>
            <div class="field"><div class="top">Color</div><div class="swatches" role="radiogroup" aria-label="Color">${swatches}</div></div>
          </div>
          <div class="field"><div class="top"><label for="message">Message on the back</label><span class="count" id="mc">0/${LIMITS.postcardMessage}</span></div><textarea id="message" maxlength="${LIMITS.postcardMessage}" placeholder="Wish you were here…"></textarea></div>
          <div class="field"><div class="top">Message font</div><div class="seg" role="radiogroup" aria-label="Message font"><label><input type="radio" name="mfont" value="handwriting" checked>Handwriting</label><label><input type="radio" name="mfont" value="serif">Serif</label><label><input type="radio" name="mfont" value="sans">Sans</label></div></div>
          <div class="field"><div class="top">Delivery</div>
            <div class="opts" role="radiogroup" aria-label="Postcard delivery"><label><input type="radio" name="pdeliv" value="first" checked><b>First-Class</b><small>Included · 3–5 days</small></label><label><input type="radio" name="pdeliv" value="express"><b>Express</b><small>+${usd(EXPRESS_CENTS)} · 2–3 days</small></label></div>
            <p class="note" style="margin:0">Express goes by USPS Priority Mail, usually 2–3 days, with tracking.</p></div>
        </div>

        <div class="step" id="lt"${fixed === "postcard" ? " hidden" : ""}><div class="step-h"><span>01</span><h2 id="ltH">Your letter</h2></div>
          <div class="seg" role="radiogroup" aria-label="Letter source"><label><input type="radio" name="lsrc" value="write" checked>Write it</label><label><input type="radio" name="lsrc" value="pdf">Upload a PDF</label></div>
          <div id="pdfBox" hidden style="display:grid;gap:10px">
            <label class="drop" id="pdrop"><input id="pdfFile" type="file" accept="application/pdf"><span id="pdropText"><b>Drop a PDF</b> or click to choose<br><small>Up to ${LIMITS.pdfPages} pages and ${LIMITS.pdfBytes / 1024 / 1024} MB. Any page size: we fit it to 8.5×11 and add an address page in front.</small></span></label>
            <label class="consent" style="margin:0"><input id="pdfColor" type="checkbox"><span>Print in color (+${usd(COLOR_LETTER_CENTS)})</span></label>
          </div>
          <div id="writeBox" style="display:grid;gap:12px">
          <div class="field"><div class="top"><label for="body">Letter</label><span class="count" id="bc">0/${LIMITS.letterBody}</span></div><textarea id="body" maxlength="${LIMITS.letterBody}" style="min-height:280px" placeholder="Dear …"></textarea></div>
          <label class="drop" id="ldrop"><input id="lphoto" type="file" accept="image/jpeg,image/png,image/webp"><span id="ldropText"><b>Add a photo</b> (optional)<br><small>Printed at the top of the letter, in color, for ${usd(COLOR_LETTER_CENTS)} more.</small></span></label>
          <button type="button" class="linkbtn" id="lphotoRemove" hidden>Remove photo</button>
          <div class="seg" role="radiogroup" aria-label="Typeface"><label><input type="radio" name="font" value="serif" checked>Serif</label><label><input type="radio" name="font" value="sans">Sans-serif</label></div>
          </div>
          <div class="field"><div class="top">Mailing</div>
            <div class="opts" role="radiogroup" aria-label="Mailing">${mailing}</div>
            <p class="note" style="margin:0">${fixed === "certified" ? "Certified Mail gets a USPS tracking number and proof of delivery; the return receipt adds the recipient's signature, which landlords, courts and agencies often ask for." : "Express goes by USPS Priority Mail, usually 2–3 days, with tracking. Need proof of delivery? <a href=\"/send/certified\">Send a certified letter</a>."}</p></div>
        </div>

        <div class="step" data-step="3"><div class="step-h"><span>02</span><h2>Who's it going to?</h2></div>${addressFields("to", "Recipient address")}</div>
        <div class="step" data-step="4"><div class="step-h"><span>03</span><h2>Who's it from?</h2></div>${addressFields("from", "Return address")}
          <label class="field"><span class="sr">Your email</span><input id="email" type="email" required autocomplete="email" placeholder="Your email, for the receipt and updates"></label>
          <label class="consent"><input id="ok" type="checkbox"><span>This mail isn't threatening, harassing, fraudulent or obscene, and a person at ${esc(BRAND)} may review it before printing. <a href="/content-policy" target="_blank">Content policy</a></span></label>
        </div>
        <p class="soft" style="font-size:.85rem">AI agent? Skip this form. Build an <a href="${esc(docsUrl("/guides/order-links"))}">order link</a> (one URL with every field) or call the <a href="${esc(docsUrl("/api/introduction"))}">API</a>.</p>
      </form>

      <aside class="aside" id="aside" aria-label="Preview and payment">
        <div class="stage">
          <div class="label"><span id="pvName">Postcard 4×6</span><span>Live preview</span></div>
          <div id="pvCard" class="card-pv"><div class="front" id="pvFront"></div></div>
          <div id="pvLetter" class="letter-pv" hidden><div class="to" id="pvLetterTo"></div><img id="pvLetterPhoto" class="lphoto-pv" alt="" hidden><div id="pvLetterBody"></div></div>
          <div class="flip" id="flip"><button type="button" data-side="front" aria-pressed="true">Front</button><button type="button" data-side="back" aria-pressed="false">Back</button></div>
        </div>
        <div class="summary">
          <div class="line"><span id="postageLine">Printing, envelope, First-Class postage</span><span>Included</span></div>
          <div class="total"><span>Total</span><b id="total">${usd(PRODUCTS[start].cents)}</b></div>
          <p id="err" class="err" role="alert" style="margin:0"></p>
          <button class="btn" id="go" type="submit" form="f">Preview the print and pay</button>
          ${OFFER_ACTIVE ? `<p class="note" id="offerNote"><b style="color:var(--green)">${esc(OFFER_LINE)}.</b> Taken off on the next page if it's your first one from this return address.</p>` : ""}
          <p class="note">Nothing is mailed until you pay. Checkout by Stripe.</p>
        </div>
      </aside>
    </div>

    <dialog class="cropper" id="cropDlg" aria-labelledby="cropTitle">
      <div class="crop">
        <div><h2 id="cropTitle">Crop your photo</h2><p class="soft">Drag to move it, zoom with the slider. Everything outside the dashed line is trimmed off when the card is cut.</p></div>
        <div class="crop-view" id="cropView" tabindex="0" role="application" aria-label="Photo position. Arrow keys move it; plus and minus zoom."><img id="cropImg" alt=""><div class="crop-safe" id="cropSafe"></div></div>
        <label class="crop-zoom">Zoom <input id="cropZoom" type="range" min="1" max="4" step="0.01" value="1"></label>
        <p class="crop-warn" id="cropWarn" hidden>This photo is low resolution for this size, so it may print a little soft. Zoom out or use a larger photo.</p>
        <div class="crop-actions"><button type="button" class="btn alt" id="cropCancel">Cancel</button><button type="button" class="btn" id="cropOk">Use this crop</button></div>
      </div>
    </dialog>

    <script>
    const PRODUCTS = ${JSON.stringify(PRODUCTS)};
    const THEMES = ${JSON.stringify(THEMES)};
    const MAX_IMG = ${LIMITS.imageBytes}, MAX_ORIGINAL = 25 * 1024 * 1024, COLOR_LETTER = ${COLOR_LETTER_CENTS};
    const SIZE_OF_NAME = ${JSON.stringify(Object.fromEntries(Object.entries(POSTCARD_SIZES).map(([size, s]) => [size, s.product])))};
    const SIZE_OF = ${JSON.stringify(Object.fromEntries(Object.entries(POSTCARD_SIZES).map(([size, s]) => [s.product, size])))};
    const $ = (id) => document.getElementById(id);
    const val = (name) => document.querySelector('input[name="' + name + '"]:checked').value;
    // A letter's product depends on its mailing option (regular, certified, certified + return receipt).
    const LETTER_PRODUCT = { none: "letter", express: "letter", certified: "letter_certified", certified_return_receipt: "letter_certified_rr" };
    const EXPRESS = ${EXPRESS_CENTS};
    let pdfUploaded = null;
    const isPdf = () => val("lsrc") === "pdf";
    const isExpress = () => (val("product") === "letter" ? val("mailing") === "express" : val("pdeliv") === "express");
    // Every section is visible from the start (2026-10-05, Ryan: the one-step-at-a-time form felt like it hid the fields).
    let shown = 4;
    const kind = () => { const k = document.querySelector('input[name="kind"]:checked'); return k ? k.value : ""; };
    const motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    function reveal(n, scroll) {
      const before = shown; shown = Math.max(shown, n);
      document.querySelectorAll("[data-step]").forEach((el) => { el.hidden = Number(el.dataset.step) > shown; });
      render();
      if (scroll && shown > before) {
        const target = shown === 2 ? (val("product") === "letter" ? $("lt") : $("pc")) : document.querySelector('[data-step="' + shown + '"]');
        if (target) target.scrollIntoView({ behavior: motion ? "smooth" : "auto", block: "start" });
      }
    }
    // A kind sets the product and which mailing options make sense (certified letters only offer certified mailing).
    function applyKind() {
      const k = kind(); if (!k) return;
      const pick = (name, value) => { const el = document.querySelector('input[name="' + name + '"][value="' + value + '"]'); if (el) el.checked = true; };
      if (k === "postcard") { if (val("product") === "letter") pick("product", "postcard_4x6"); }
      else {
        pick("product", "letter");
        const m = val("mailing"), cert = m === "certified" || m === "certified_return_receipt";
        if (k === "certified" && !cert) pick("mailing", "certified");
        if (k === "letter" && cert) pick("mailing", "none");
      }
      document.querySelectorAll('input[name="mailing"]').forEach((el) => {
        const cert = el.value === "certified" || el.value === "certified_return_receipt";
        el.closest("label").hidden = k === "certified" ? !cert : cert;
      });
      $("ltH").textContent = k === "certified" ? "Your certified letter" : "Your letter";
    }
    document.querySelectorAll('input[name="kind"]').forEach((el) => el.addEventListener("change", () => { applyKind(); reveal(2, true); }));
    // "Next" checks the step is complete before showing the next one.
    function stepProblem(n) {
      if (n === 2) {
        if (val("product") === "letter") {
          if (isPdf()) return pdfUploaded ? "" : "Upload a PDF, or switch to Write it.";
          return $("body").value.trim() ? "" : "Write your letter first.";
        }
        const f = val("front");
        if (f === "text" && !$("headline").value.trim()) return "Add the big text for the front.";
        if ((f === "photo" || f === "caption") && !photoFile) return "Add a photo for the front.";
        if (f === "caption" && !$("caption").value.trim()) return "Add a caption.";
        if (f === "collage" && collage.length < 2) return "Choose at least 2 photos for the collage.";
        return $("message").value.trim() ? "" : "Write the message for the back.";
      }
      if (n === 3) {
        const a = addr("to");
        return a.name && a.line1 && a.city && a.state && a.zip ? "" : "Fill in the recipient's name and full address.";
      }
      return "";
    }
    const effectiveProduct = () => (val("product") === "letter" ? LETTER_PRODUCT[val("mailing")] : val("product"));
    let side = "front", photoUrl = null, photoFile = null, letterPhoto = null, letterPhotoUrl = null;

    function addr(p) {
      return Object.fromEntries(["name","line1","line2","city","state","zip"].map(k => [k, $(p + "_" + k).value.trim()]).filter(([, v]) => v));
    }
    function addrText(a) {
      return [a.name, a.line1, a.line2, [a.city, a.state].filter(Boolean).join(", ") + (a.zip ? " " + a.zip : "")].filter(Boolean).join("\\n");
    }
    function render() {
      const product = effectiveProduct(), letter = val("product") === "letter", front = val("front"), photo = front === "photo" || front === "caption";
      $("pc").hidden = letter || shown < 2; $("lt").hidden = !letter || shown < 2;
      $("drop").hidden = !photo; $("textFront").hidden = front !== "text"; $("recrop").hidden = !photo || !photoFile;
      $("captionBox").hidden = front !== "caption"; $("cdrop").hidden = front !== "collage"; $("cclear").hidden = front !== "collage" || !collage.length;
      $("fontBox").hidden = !(front === "text" || front === "caption");
      $("cc").textContent = $("caption").value.length + "/${LIMITS.postcardCaption}";
      // The preview card takes the chosen size's shape (6×11 is wider than 4×6 and 6×9).
      if (!letter && SHEET[product]) $("pvCard").style.aspectRatio = (SHEET[product][0] - 0.25) + " / " + (SHEET[product][1] - 0.25);
      $("pvName").textContent = PRODUCTS[product].name;
      $("postageLine").textContent = product === "letter_certified" ? "Printing, envelope, Certified Mail" : product === "letter_certified_rr" ? "Printing, envelope, Certified Mail + return receipt" : isExpress() ? (letter ? "Printing, envelope, Express (USPS Priority)" : "Printing, Express (USPS Priority)") : (letter ? "Printing, envelope, First-Class postage" : "Printing, First-Class postage");
      const color = letter && (isPdf() ? $("pdfColor").checked : Boolean(letterPhoto));
      $("total").textContent = "$" + ((PRODUCTS[product].cents + (color ? COLOR_LETTER : 0) + (isExpress() ? EXPRESS : 0)) / 100).toFixed(2);
      $("pdfBox").hidden = !isPdf(); $("writeBox").hidden = isPdf();
      $("pvCard").hidden = letter; $("pvLetter").hidden = !letter; $("flip").hidden = letter;
      $("hc").textContent = $("headline").value.length + "/${LIMITS.postcardHeadline}";
      $("mc").textContent = $("message").value.length + "/${LIMITS.postcardMessage}";
      $("bc").textContent = $("body").value.length + "/${LIMITS.letterBody}";
      const to = addrText(addr("to")) || "Recipient\\nStreet address\\nCity, ST ZIP";
      if (letter) {
        $("pvLetterTo").textContent = to;
        $("pvLetterBody").textContent = isPdf() ? (pdfUploaded ? "Your PDF: " + pdfUploaded.name + " (" + pdfUploaded.pages + " page" + (pdfUploaded.pages === 1 ? "" : "s") + "), after an address page. You'll see the exact print on the next page." : "Upload a PDF to see it here.") : ($("body").value || "Dear …");
        $("pvLetter").style.fontFamily = val("font") === "sans" ? "Helvetica, Arial, sans-serif" : "Georgia, serif";
        $("pvLetterPhoto").hidden = !letterPhotoUrl; if (letterPhotoUrl) $("pvLetterPhoto").src = letterPhotoUrl;
        $("lphotoRemove").hidden = !letterPhoto;
        return;
      }
      const card = $("pvCard");
      if (side === "front") {
        const hf = HFONT[val("hfont")];
        if (front === "collage") {
          const n = Math.max(2, collage.length), areas = n === 2 ? '"a b"' : n === 3 ? '"a b" "a c"' : '"a b" "c d"';
          card.innerHTML = '<div class="front" style="padding:0;display:grid;gap:2px;background:#fff;grid-template-areas:' + areas + ';grid-template-columns:' + (n === 3 ? "1.4fr 1fr" : "1fr 1fr") + ';grid-template-rows:' + (n === 2 ? "1fr" : "1fr 1fr") + '"></div>';
          for (let i = 0; i < n; i++) {
            const cell = document.createElement("div"); cell.style.cssText = "grid-area:" + "abcd"[i] + ";overflow:hidden;min-width:0;min-height:0;background:var(--tint)";
            if (collage[i]) cell.innerHTML = '<img alt="" src="' + collage[i].url + '">';
            card.firstChild.appendChild(cell);
          }
        } else if (photo && photoUrl) {
          card.innerHTML = '<div class="front" style="padding:0;position:relative"><img alt="" src="' + photoUrl + '"></div>';
          if (front === "caption") {
            const band = document.createElement("div");
            band.style.cssText = "position:absolute;left:0;right:0;bottom:0;padding:5% 7% 6%;background:rgba(0,0,0,.42);color:#fff;text-align:left;font:600 clamp(.9rem,2.2vw,1.3rem)/1.15 " + hf;
            band.textContent = $("caption").value || "Your caption";
            card.firstChild.appendChild(band);
          }
        } else if (photo) card.innerHTML = '<div class="front" style="background:var(--tint);color:var(--faint);font:500 .9rem var(--f-ui)">Your photo here</div>';
        else {
          const [bg, fg] = THEMES[val("theme")];
          card.innerHTML = '<div class="front" style="background:' + bg + ';color:' + fg + ';font-family:' + hf + '"></div>';
          card.firstChild.textContent = $("headline").value || "Your big text";
        }
      } else {
        card.innerHTML = '<div class="back"><div class="msg"></div><div class="to"></div></div>';
        card.querySelector(".msg").textContent = $("message").value || "Your message…";
        card.querySelector(".msg").style.fontFamily = MFONT[val("mfont")];
        card.querySelector(".to").textContent = to;
      }
    }
    document.addEventListener("input", render);
    document.addEventListener("change", render);
    $("flip").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      side = b.dataset.side;
      $("flip").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      render();
    });
    // Typing a message flips to the back so you see it; editing the front flips back.
    $("message").addEventListener("focus", () => { if (side !== "back") $("flip").querySelector('[data-side="back"]').click(); });
    ["headline", "photo"].forEach(id => $(id).addEventListener("focus", () => { if (side !== "front") $("flip").querySelector('[data-side="front"]').click(); }));

    // Photos go through a cropper at the card's print shape (with bleed), then are re-encoded as a 300 dpi JPEG.
    // What's uploaded is exactly what prints.
    const SHEET = ${JSON.stringify(Object.fromEntries(Object.values(POSTCARD_SIZES).map((s) => [s.product, [s.w + 0.25, s.h + 0.25]])))}, BLEED = 0.125;
    const dlg = $("cropDlg"), view = $("cropView"), cimg = $("cropImg"), zoomEl = $("cropZoom");
    const crop = { file: null, url: null, product: "postcard_4x6", nw: 0, nh: 0, Vw: 0, Vh: 0, s0: 1, zoom: 1, ox: 0, oy: 0 };
    function takeFile(file) {
      if (!file) return;
      if (!/^image.(jpeg|png|webp)$/.test(file.type)) { $("err").textContent = "Use a JPG, PNG or WebP photo."; return; }
      if (file.size > MAX_ORIGINAL) { $("err").textContent = "That photo is over 25 MB. Try a smaller one."; return; }
      $("err").textContent = ""; openCrop(file);
    }
    function openCrop(file) {
      crop.file = file;
      crop.product = SHEET[val("product")] ? val("product") : "postcard_4x6";
      const [w, h] = SHEET[crop.product];
      view.style.aspectRatio = w + " / " + h;
      $("cropSafe").style.inset = (BLEED / h * 100) + "% " + (BLEED / w * 100) + "%";
      if (crop.url) URL.revokeObjectURL(crop.url);
      crop.url = URL.createObjectURL(file);
      cimg.onload = () => { crop.nw = cimg.naturalWidth; crop.nh = cimg.naturalHeight; cimg.style.width = crop.nw + "px"; cimg.style.height = crop.nh + "px"; dlg.showModal(); fit(); view.focus(); };
      cimg.onerror = () => { $("err").textContent = "That photo couldn't be opened. Try a JPG or PNG."; };
      cimg.src = crop.url;
    }
    function fit() {
      crop.Vw = view.clientWidth; crop.Vh = view.clientHeight;
      crop.s0 = Math.max(crop.Vw / crop.nw, crop.Vh / crop.nh);
      crop.zoom = 1; zoomEl.value = "1";
      crop.ox = (crop.Vw - crop.nw * crop.s0) / 2; crop.oy = (crop.Vh - crop.nh * crop.s0) / 2;
      place();
    }
    function place() {
      const sc = crop.s0 * crop.zoom;
      crop.ox = Math.min(0, Math.max(crop.Vw - crop.nw * sc, crop.ox));
      crop.oy = Math.min(0, Math.max(crop.Vh - crop.nh * sc, crop.oy));
      cimg.style.transform = "translate(" + crop.ox + "px," + crop.oy + "px) scale(" + sc + ")";
      // Warn below ~150 dpi at print size.
      $("cropWarn").hidden = (crop.Vw / sc) >= SHEET[crop.product][0] * 150;
    }
    function zoomTo(z) {
      z = Math.min(4, Math.max(1, z));
      const old = crop.s0 * crop.zoom, cx = (crop.Vw / 2 - crop.ox) / old, cy = (crop.Vh / 2 - crop.oy) / old;
      crop.zoom = z; zoomEl.value = String(z);
      const sc = crop.s0 * z; crop.ox = crop.Vw / 2 - cx * sc; crop.oy = crop.Vh / 2 - cy * sc;
      place();
    }
    zoomEl.addEventListener("input", () => zoomTo(parseFloat(zoomEl.value)));
    view.addEventListener("wheel", (e) => { e.preventDefault(); zoomTo(crop.zoom * (1 - e.deltaY * 0.0015)); }, { passive: false });
    let drag = null;
    view.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, ox: crop.ox, oy: crop.oy }; view.setPointerCapture(e.pointerId); view.classList.add("dragging"); });
    view.addEventListener("pointermove", (e) => { if (!drag) return; crop.ox = drag.ox + e.clientX - drag.x; crop.oy = drag.oy + e.clientY - drag.y; place(); });
    ["pointerup", "pointercancel"].forEach(t => view.addEventListener(t, () => { drag = null; view.classList.remove("dragging"); }));
    view.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 40 : 10, k = e.key;
      if (k === "ArrowLeft") crop.ox += step; else if (k === "ArrowRight") crop.ox -= step;
      else if (k === "ArrowUp") crop.oy += step; else if (k === "ArrowDown") crop.oy -= step;
      else if (k === "+" || k === "=") return zoomTo(crop.zoom + 0.1), e.preventDefault();
      else if (k === "-") return zoomTo(crop.zoom - 0.1), e.preventDefault();
      else return;
      e.preventDefault(); place();
    });
    addEventListener("resize", () => { if (dlg.open) fit(); });
    $("cropCancel").addEventListener("click", () => { dlg.close(); $("photo").value = ""; });
    $("cropOk").addEventListener("click", () => {
      const [w, h] = SHEET[crop.product], sc = crop.s0 * crop.zoom;
      const out = document.createElement("canvas"); out.width = Math.round(w * 300); out.height = Math.round(h * 300);
      const g = out.getContext("2d"); g.imageSmoothingQuality = "high";
      g.drawImage(cimg, -crop.ox / sc, -crop.oy / sc, crop.Vw / sc, crop.Vh / sc, 0, 0, out.width, out.height);
      out.toBlob((blob) => {
        if (!blob) { $("err").textContent = "Couldn't crop that photo. Try another one."; return; }
        if (blob.size > MAX_IMG) { $("err").textContent = "The cropped photo is still over 6 MB. Try a smaller one."; return; }
        photoFile = new File([blob], "front.jpg", { type: "image/jpeg" });
        if (photoUrl) URL.revokeObjectURL(photoUrl);
        photoUrl = URL.createObjectURL(photoFile);
        $("dropText").innerHTML = '<img class="thumb" alt="" src="' + photoUrl + '"><br><b>Change photo</b>';
        $("recrop").hidden = false; $("photo").value = "";
        dlg.close(); side = "front"; render();
      }, "image/jpeg", 0.9);
    });
    $("recrop").addEventListener("click", () => { if (crop.file) openCrop(crop.file); });
    $("photo").addEventListener("change", (e) => takeFile(e.target.files[0]));
    const drop = $("drop");
    ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(t => drop.addEventListener(t, () => drop.classList.remove("over")));
    drop.addEventListener("drop", (e) => { e.preventDefault(); takeFile(e.dataTransfer.files[0]); });

    // A letter photo isn't cropped: it's scaled to fit the 6.5 × 3 in print area at 300 dpi and re-encoded as JPEG.
    function takeLetterPhoto(file) {
      if (!file) return;
      if (!/^image.(jpeg|png|webp)$/.test(file.type)) { $("err").textContent = "Use a JPG, PNG or WebP photo."; return; }
      if (file.size > MAX_ORIGINAL) { $("err").textContent = "That photo is over 25 MB. Try a smaller one."; return; }
      const img = new Image(), src = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1950 / img.naturalWidth, 900 / img.naturalHeight);
        const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(src);
        c.toBlob((blob) => {
          if (!blob || blob.size > MAX_IMG) { $("err").textContent = "Couldn't use that photo. Try another one."; return; }
          letterPhoto = new File([blob], "letter.jpg", { type: "image/jpeg" });
          if (letterPhotoUrl) URL.revokeObjectURL(letterPhotoUrl);
          letterPhotoUrl = URL.createObjectURL(letterPhoto);
          $("ldropText").innerHTML = '<img class="thumb" alt="" src="' + letterPhotoUrl + '"><br><b>Change photo</b>';
          $("lphoto").value = ""; $("err").textContent = ""; render();
        }, "image/jpeg", 0.9);
      };
      img.onerror = () => { URL.revokeObjectURL(src); $("err").textContent = "That photo couldn't be opened. Try a JPG or PNG."; };
      img.src = src;
    }
    $("lphoto").addEventListener("change", (e) => takeLetterPhoto(e.target.files[0]));
    const ldrop = $("ldrop");
    ["dragenter", "dragover"].forEach(t => ldrop.addEventListener(t, (e) => { e.preventDefault(); ldrop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(t => ldrop.addEventListener(t, () => ldrop.classList.remove("over")));
    ldrop.addEventListener("drop", (e) => { e.preventDefault(); takeLetterPhoto(e.dataTransfer.files[0]); });
    $("lphotoRemove").addEventListener("click", () => {
      letterPhoto = null; if (letterPhotoUrl) URL.revokeObjectURL(letterPhotoUrl); letterPhotoUrl = null;
      $("ldropText").innerHTML = '<b>Add a photo</b> (optional)<br><small>Printed at the top of the letter, in color.</small>'; render();
    });
    // Fonts for the preview (the print uses the same families via Google Fonts).
    const HFONT = { serif: "'Source Serif 4', Georgia, serif", sans: "Inter, Helvetica, Arial, sans-serif", script: "Caveat, 'Bradley Hand', cursive" };
    const MFONT = { handwriting: "Caveat, 'Segoe Print', 'Bradley Hand', cursive", serif: "'Source Serif 4', Georgia, serif", sans: "Inter, Helvetica, Arial, sans-serif" };
    // Collage photos aren't cropped (each is trimmed to its spot when printed); they're scaled to at most 2000 px.
    let collage = [];
    function scaleImage(file, maxW, maxH) {
      return new Promise((resolve, reject) => {
        const img = new Image(), src = URL.createObjectURL(file);
        img.onload = () => {
          const k = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
          const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
          const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(src);
          c.toBlob((b) => (b && b.size <= MAX_IMG ? resolve(new File([b], "photo.jpg", { type: "image/jpeg" })) : reject(new Error("Couldn't use one of those photos."))), "image/jpeg", 0.9);
        };
        img.onerror = () => { URL.revokeObjectURL(src); reject(new Error("One of those photos couldn't be opened.")); };
        img.src = src;
      });
    }
    async function takeCollage(files) {
      const list = Array.from(files || []).filter((f) => /^image.(jpeg|png|webp)$/.test(f.type)).slice(0, 4 - collage.length);
      if (!list.length) { $("err").textContent = collage.length >= 4 ? "A collage holds up to 4 photos." : "Use JPG, PNG or WebP photos."; return; }
      try {
        for (const f of list) { const file = await scaleImage(f, 2000, 2000); collage.push({ file, url: URL.createObjectURL(file) }); }
        $("err").textContent = "";
      } catch (e) { $("err").textContent = e.message; }
      $("cdropText").innerHTML = "<b>" + collage.length + " of 4 photos</b><br><small>" + (collage.length < 4 ? "Add more, or keep these." : "The collage is full.") + "</small>";
      $("cphotos").value = ""; side = "front"; render();
    }
    $("cphotos").addEventListener("change", (e) => takeCollage(e.target.files));
    const cdrop = $("cdrop");
    ["dragenter", "dragover"].forEach(t => cdrop.addEventListener(t, (e) => { e.preventDefault(); cdrop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(t => cdrop.addEventListener(t, () => cdrop.classList.remove("over")));
    cdrop.addEventListener("drop", (e) => { e.preventDefault(); takeCollage(e.dataTransfer.files); });
    $("cclear").addEventListener("click", () => {
      collage.forEach((c) => URL.revokeObjectURL(c.url)); collage = [];
      $("cdropText").innerHTML = "<b>Choose 2 to 4 photos</b> for the collage<br><small>They're arranged in a grid and trimmed to fit each spot.</small>"; render();
    });

    // PDFs upload as soon as they're chosen, so the page count (or what's wrong with the file) shows right away.
    async function takePdf(file) {
      if (!file) return;
      if (file.type && file.type !== "application/pdf") { $("err").textContent = "Choose a PDF file."; return; }
      $("pdropText").innerHTML = "<b>Uploading…</b>";
      try {
        const r = await fetch("/v1/files", { method: "POST", headers: { "Content-Type": "application/pdf" }, body: file });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error && j.error.message || "Couldn't upload that PDF.");
        pdfUploaded = { url: j.url, pages: j.pages, name: file.name };
        $("pdropText").innerHTML = "<b></b><br><small>Choose another file to replace it.</small>";
        $("pdropText").firstChild.textContent = file.name + " · " + j.pages + " page" + (j.pages === 1 ? "" : "s");
        $("err").textContent = "";
      } catch (e) {
        pdfUploaded = null; $("err").textContent = e.message;
        $("pdropText").innerHTML = "<b>Drop a PDF</b> or click to choose";
      }
      $("pdfFile").value = ""; render();
    }
    $("pdfFile").addEventListener("change", (e) => takePdf(e.target.files[0]));
    const pdrop = $("pdrop");
    ["dragenter", "dragover"].forEach(t => pdrop.addEventListener(t, (e) => { e.preventDefault(); pdrop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(t => pdrop.addEventListener(t, () => pdrop.classList.remove("over")));
    pdrop.addEventListener("drop", (e) => { e.preventDefault(); takePdf(e.dataTransfer.files[0]); });

    async function upload(file) {
      const up = await fetch("/v1/images", { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const uj = await up.json(); if (!up.ok) throw new Error(uj.error.message);
      return uj.url;
    }

    $("f").addEventListener("submit", async (e) => {
      e.preventDefault(); $("err").textContent = "";
      const problem = stepProblem(2) || stepProblem(3) || (!$("ok").checked ? "Please confirm the content policy (section 03)." : "");
      if (problem) { $("err").textContent = problem; if (matchMedia("(max-width: 920px)").matches) $("err").scrollIntoView({ block: "center" }); return; }
      const go = $("go"); go.disabled = true; go.textContent = "Working…";
      try {
        const product = val("product");
        let url, body;
        if (product === "letter") {
          const m = val("mailing");
          url = "/v1/letters"; body = { certified: m === "express" ? "none" : m, express: m === "express" };
          if (isPdf()) {
            if (!pdfUploaded) throw new Error("Upload a PDF, or switch to Write it.");
            body.content = { pdf_url: pdfUploaded.url, color: $("pdfColor").checked };
          } else {
            body.content = { body: $("body").value, font: val("font") };
            if (letterPhoto) body.content.image_url = await upload(letterPhoto);
          }
        } else {
          url = "/v1/postcards";
          const content = { message: $("message").value, front_theme: val("theme") };
          const front = val("front");
          content.message_font = val("mfont"); content.headline_font = val("hfont");
          if (front === "photo" || front === "caption") {
            if (!photoFile) throw new Error("Add a photo for the front, or switch to Text.");
            content.front_image_url = await upload(photoFile);
            content.layout = front === "caption" ? "photo_caption" : "photo";
            if (front === "caption") {
              if (!$("caption").value.trim()) throw new Error("Add a caption, or switch to Photo.");
              content.caption = $("caption").value.trim();
            }
          } else if (front === "collage") {
            if (collage.length < 2) throw new Error("Choose at least 2 photos for the collage.");
            content.layout = "collage";
            content.front_images = await Promise.all(collage.map((c) => upload(c.file)));
          } else {
            content.layout = "headline";
            if ($("headline").value.trim()) content.front_headline = $("headline").value.trim();
          }
          body = { size: SIZE_OF[product] || "4x6", content, express: isExpress() };
        }
        Object.assign(body, { to: addr("to"), from: addr("from"), customer_email: $("email").value.trim() || undefined });
        const r = await fetch(url, { method: "POST", headers: Object.assign({ "Content-Type": "application/json", "X-Client": "web" }, window.posthog && posthog.get_distinct_id ? { "X-Analytics-Id": String(posthog.get_distinct_id()) } : {}), body: JSON.stringify(body) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error.fields ? j.error.fields.map(f => (f.field || "form").replace(/^to\\./, "Send to: ").replace(/^from\\./, "From: ").replace(/^content\\./, "") + " " + f.message.toLowerCase()).join(" · ") : j.error.message);
        location.href = "/o/" + j.id;
      } catch (err) { $("err").textContent = err.message; go.disabled = false; go.textContent = "Preview the print and pay"; }
    });
    // Prefill from order-link style parameters (/send?type=…&to_name=…), e.g. "Edit in the full form" from /quick.
    (function prefill() {
      const q = new URLSearchParams(location.search);
      // A literal backslash-n in a link means a line break (built without escape characters on purpose).
      const set = (id, v) => { if (v && $(id)) $(id).value = v.split(String.fromCharCode(92) + "n").join(String.fromCharCode(10)); };
      const pick = (name, value) => { const el = document.querySelector('input[name="' + name + '"][value="' + value + '"]'); if (el) el.checked = true; };
      if (q.get("type") === "letter") pick("product", "letter");
      if (q.get("source") === "pdf") { pick("product", "letter"); pick("lsrc", "pdf"); }
      if (q.get("express") === "1") { pick("pdeliv", "express"); pick("mailing", "express"); }
      if (q.get("certified")) { pick("product", "letter"); pick("mailing", q.get("certified")); }
      else if (SIZE_OF_NAME[q.get("size")]) pick("product", SIZE_OF_NAME[q.get("size")]);
      else if (q.get("type") === "postcard" || q.get("size") === "4x6") pick("product", "postcard_4x6");
      if (q.get("headline")) { pick("front", "text"); set("headline", q.get("headline")); }
      if (q.get("theme")) pick("theme", q.get("theme"));
      if (q.get("font")) pick("font", q.get("font"));
      set("message", q.get("message")); set("body", q.get("body")); set("email", q.get("email"));
      for (const p of ["to", "from"]) for (const k of ["name", "line1", "line2", "city", "state", "zip"]) set(p + "_" + k, q.get(p + "_" + k));
      applyKind(); reveal(4, false);
    })();
    render();
    </script>`,
  );
}
