import { BRAND, COUNTRIES, COLOR_LETTER_CENTS, EXPRESS_CENTS, LIMITS, POSTCARD_SIZES, PRODUCTS, type ProductId, EXTRA_SERVICE, isLetter, letterProduct } from "./config.ts";
import { MAX_RECIPIENTS } from "./orders.ts";
import { docsUrl, page } from "./layout.ts";
import { esc, THEMES } from "./render.ts";

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

const CSS = `
.send { max-width: 680px; margin-inline: auto; padding-top: 28px; display: grid; }
.send h1 { font-size: clamp(1.75rem, 3.6vw, 2.2rem); letter-spacing: -0.025em; }
.form { display: grid; gap: 24px; min-width: 0; }
.toprow { display: flex; align-items: center; gap: 12px; }
.stepper { margin-left: auto; display: flex; align-items: center; gap: 10px; font-size: .88rem; color: var(--soft); }
.stepper > span.on { color: var(--ink); font-weight: 600; }
.stepper .n { font: 500 .74rem var(--f-mono); margin-right: 6px; }
.stepper i { width: 24px; height: 1px; background: var(--rule); }
h2.sub { font-size: 1rem; letter-spacing: -0.01em; margin: 0; }
.list { display: grid; border: 1px solid var(--rule); border-radius: 12px; overflow: hidden; }
.list label { display: flex; align-items: center; gap: 10px; padding: 13px 16px; min-height: 52px; box-sizing: border-box; cursor: pointer; background: var(--card); font-weight: 600; }
.list label + label { border-top: 1px solid var(--rule); }
.list label:has(input:checked) { background: var(--green-soft); }
.list input { accent-color: var(--green); width: 18px; height: 18px; margin: 0 4px 0 0; flex-shrink: 0; }
.list label span { font-weight: 400; color: var(--soft); }
.row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.row-l { display: flex; align-items: center; gap: 14px; }
.addphoto { position: relative; display: inline-flex; align-items: center; gap: 8px; color: var(--green); font: 500 .92rem var(--f-ui); cursor: pointer; }
.addphoto input { position: absolute; inset: 0; opacity: 0; width: 100%; cursor: pointer; }
.addphoto:focus-within { outline: 2px solid var(--green); outline-offset: 3px; border-radius: 4px; }
.addphoto .thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; }
.fine { font-size: .84rem; color: var(--soft); margin: 0; line-height: 1.5; }
.editor { display: grid; }
.fmt { display: flex; gap: 2px; padding: 4px; background: var(--tint); border: 1px solid var(--rule); border-bottom: 0; border-radius: 8px 8px 0 0; }
.fmt button { width: 38px; height: 34px; border: 0; border-radius: 6px; background: transparent; color: var(--ink); font: 1rem Georgia, serif; cursor: pointer; }
.fmt button:hover { background: var(--card); }
.fmt button[aria-pressed="true"] { background: var(--card); box-shadow: inset 0 0 0 1px var(--rule); color: var(--green); }
.ed { min-height: 300px; padding: 12px 14px; background: var(--card); color: var(--ink); border: 1px solid var(--rule); border-radius: 0 0 8px 8px; font-size: 1.02rem; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; outline: none; cursor: text; }
.ed:focus { border-color: var(--green); }
.ed:empty::before { content: attr(data-placeholder); color: var(--faint); pointer-events: none; }
.bar { position: sticky; bottom: 0; z-index: 5; margin-top: 28px; padding: 12px 0 calc(12px + env(safe-area-inset-bottom, 0px)); background: var(--paper); border-top: 1px solid var(--rule); }
.bar-in { display: flex; align-items: center; justify-content: flex-end; gap: 14px; }
.bar .err { margin: 0 0 10px; }
.bar .err:empty { display: none; }
.bar-sum { display: grid; gap: 1px; margin-right: auto; min-width: 0; }
.bar-sum small { font-size: .82rem; color: var(--soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar .btn { white-space: nowrap; flex-shrink: 0; }
@media (max-width: 520px) { .bar-in { gap: 10px; } .bar .btn { padding-inline: 16px; } }
.bar-sum b { font: 600 1.3rem var(--f-ui); letter-spacing: -0.02em; }
.bar .btn { padding-block: 13px; padding-inline: 22px; }
.list .opt-price { margin-left: auto; padding-left: 12px; font: 600 .95rem var(--f-ui); color: var(--ink); white-space: nowrap; }
.step { display: grid; gap: 14px; }
.step > .note { font-size: .84rem; color: var(--faint); line-height: 1.5; }
.recip-h { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; padding-top: 14px; border-top: 1px solid var(--rule); }
.recip-h b { font-size: .92rem; }
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
.addr input, .addr select { padding: 10px 12px; }
.addr.abroad .ct, .addr.abroad .st, .addr.abroad .zp { grid-column: span 2; }
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
@media (max-width: 380px) { .choices { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 520px) { .choice { padding: 12px 10px; } .addr .w4, .addr .w3, .addr .w2 { grid-column: span 6; } .addr .w1, .addr.abroad .st, .addr.abroad .zp { grid-column: span 3; } .addr.abroad .ct { grid-column: span 6; } }
`;

const addressFields = (p: string, label: string) => `<fieldset class="addr" style="border:0;padding:0;background:none" aria-label="${label}">
  <label class="w6"><span class="sr">Full name</span><input id="${p}_name" placeholder="Full name" required maxlength="60" autocomplete="${p === "from" ? "name" : "off"}"></label>
  <label class="w4"><span class="sr">Street address</span><input id="${p}_line1" placeholder="Street address" required maxlength="64" ${p === "from" ? 'autocomplete="address-line1"' : ""}></label>
  <label class="w2"><span class="sr">Apt or suite</span><input id="${p}_line2" placeholder="Apt, suite" maxlength="64"></label>
  <label class="w3 ct"><span class="sr">City</span><input id="${p}_city" placeholder="City" required maxlength="40"></label>
  <label class="w1 st"><span class="sr">State</span><input id="${p}_state" placeholder="ST" required maxlength="2" style="text-transform:uppercase"></label>
  <label class="w2 zp"><span class="sr">ZIP</span><input id="${p}_zip" placeholder="ZIP" required maxlength="10" inputmode="numeric"></label>
  ${p === "from" ? COUNTRY_SELECT : ""}
</fieldset>`;

// Only the return address may be abroad (2026-10-31); picking a country turns State/ZIP into optional Region/Postcode.
const COUNTRY_SELECT = `<label class="w6"><span class="sr">Country</span><select id="from_country" autocomplete="country">
  <option value="US" selected>United States</option>${COUNTRIES.map((c) => `<option value="${c.code}">${esc(c.name)}</option>`).join("")}
</select></label>`;

export type SendKind = "postcard" | "letter" | "certified";
export const SEND_KINDS: SendKind[] = ["postcard", "letter", "certified"];

// /send with nothing chosen yet (Ryan, 2026-10-05): pick what you're sending, then get one page with every field.
// One definition for the /send chooser and the homepage pricing cards (they render the SAME cards: kindCards()),
// so their wording can't drift apart.
// `description` is the meta description of /send/<kind> (each page needs its own; OpenSEO audit 2026-11-23).
export const KIND_INFO: Record<SendKind, { title: string; h1: string; cta: string; cents: number; purpose: string; description: string }> = {
  postcard: { title: "Postcard", h1: "Send a postcard", cta: "Send a postcard", cents: PRODUCTS.postcard_4x6.cents, purpose: "For photos and quick notes", description: `Send a real postcard online from ${usd(PRODUCTS.postcard_4x6.cents)}: add a photo and a note, and we print it and mail it by USPS. Sizes 4×6, 6×9 and 6×11. No account needed.` },
  letter: { title: "Letter", h1: "Send a letter", cta: "Send a letter", cents: PRODUCTS.letter.cents, purpose: "For documents and correspondence", description: `Send a letter online from ${usd(PRODUCTS.letter.cents)}: type it or upload a PDF, and we print it, put it in an envelope and mail it by USPS. Express available. No account needed.` },
  certified: { title: "Certified letter", h1: "Send a certified letter", cta: "Send a certified letter", cents: PRODUCTS.letter_certified.cents, purpose: "For mail that needs proof of delivery", description: `Send USPS Certified Mail online from ${usd(PRODUCTS.letter_certified.cents)}: we print and mail your letter and give you tracking and proof of delivery. Return receipt optional.` },
};

// Small line drawings for the pricing cards (decorative; colors are CSS classes so dark mode works).
export const KIND_ART: Record<SendKind, string> = {
  postcard: `<svg viewBox="0 0 160 100" width="168" height="105"><rect class="pp" x="1" y="1" width="158" height="98" rx="6"/><rect class="photo" x="8" y="8" width="72" height="84" rx="3"/><circle class="sun" cx="62" cy="28" r="8"/><path class="hill" d="M8 82 30 56 44 68 58 50 80 76V92H8Z"/><rect class="stamp" x="134" y="9" width="17" height="21" rx="2"/><path class="ln" d="M92 46h40M92 58h52M92 70h34"/></svg>`,
  letter: `<svg viewBox="0 0 160 100" width="168" height="105"><rect class="pp" x="40" y="4" width="80" height="62" rx="3"/><path class="ln" d="M50 16h44M50 26h60M50 36h52"/><rect class="pp" x="20" y="40" width="120" height="58" rx="5"/><rect class="win" x="32" y="58" width="60" height="22" rx="3"/><path class="wl" d="M39 66h36M39 73h24"/></svg>`,
  certified: `<svg viewBox="0 0 160 100" width="168" height="105"><rect class="pp" x="20" y="16" width="120" height="72" rx="5"/><path class="ln" d="M32 34h44M32 44h56M32 54h40"/><rect class="seal" x="98" y="24" width="32" height="26" rx="3"/><path class="tick" d="m106 37 5 5 10-10"/><path class="bar" d="M32 68v10M35 68v10M39 68v10M44 68v10M47 68v10M52 68v10M55 68v10M60 68v10M64 68v10M67 68v10M72 68v10M75 68v10M80 68v10"/></svg>`,
};

// The three product cards: drawing, name, purpose line, "from" price, near-black button. Used by the homepage
// #pricing section and the /send chooser (Ryan, 2026-11-13: "/send should match the pricing page, less details,
// really easy to click"). The button's ::after stretches over the card, so the whole card is one click target.
// `h` is the card title's heading level: h3 under the homepage's Pricing h2, h2 on /send (straight under the h1).
export const kindCards = (h: "h2" | "h3" = "h3") => `<div class="prices three">
${SEND_KINDS.map((k) => `<div class="card pcard"><div class="kart" aria-hidden="true">${KIND_ART[k]}</div>
          <${h}>${KIND_INFO[k].title}</${h}>
          <p class="purpose">${KIND_INFO[k].purpose}</p>
          <div class="price"><small>from</small>${usd(KIND_INFO[k].cents)}</div>
          <a class="btn" href="/send/${k}">${KIND_INFO[k].cta}</a></div>`).join("")}
      </div>`;

export const KIND_CARDS_CSS = `
/* Pricing (Ryan, 2026-11-08): three product cards = drawing, name, purpose line, "from" price, near-black button.
   The Format/Included/Delivery spec table was dropped (what's common to all moved into the section subtitle). */
.prices.three { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 16px; }
.pcard { display: flex; flex-direction: column; gap: 10px; padding: 12px 12px 24px; border-radius: 18px; }
.pcard > * { margin: 0 12px; }
.pcard > .kart { margin: 0 0 10px; }
.pcard :is(h2, h3) { font-size: 1.15rem; font-weight: 600; letter-spacing: -0.01em; line-height: 1.3; }
.pcard .purpose { color: var(--soft); font-size: .95rem; }
.pcard .price { margin-top: 2px; font-size: 2.3rem; line-height: 1.1; }
.pcard .price small { font: 500 .88rem var(--f-ui); color: var(--soft); margin-right: 6px; letter-spacing: 0; }
.pcard .btn { margin-top: auto; justify-content: center; padding-block: 12px; border-radius: 10px; }
/* Each card is a subgrid row-span, so drawing, name, purpose, price and button line up even when a purpose line wraps. */
@supports (grid-template-rows: subgrid) {
  .prices.three { row-gap: 0; }
  .prices.three .pcard { display: grid; grid-row: span 5; grid-template-rows: subgrid; row-gap: 10px; margin-bottom: 16px; }
  .prices.three .pcard .btn { margin-top: 10px; }
}
/* Line drawings on the cards: colors come from these classes so dark mode works. */
.kart { display: grid; place-items: center; height: 150px; border-radius: 12px; background: var(--tint); }
.kart svg { width: 168px; max-width: 80%; height: auto; }
.kart .pp { fill: var(--card); stroke: color-mix(in srgb, var(--ink) 20%, transparent); stroke-width: 1.5; }
.kart .ln { fill: none; stroke: color-mix(in srgb, var(--ink) 13%, transparent); stroke-width: 3; stroke-linecap: round; }
.kart .photo { fill: var(--green-line); }
.kart .hill, .kart .seal { fill: var(--green); }
.kart .sun { fill: var(--lime); }
.kart .stamp { fill: none; stroke: var(--green); stroke-width: 1.5; stroke-dasharray: 2 2; }
.kart .win { fill: var(--green-soft); stroke: var(--green); stroke-width: 1.2; }
.kart .wl { fill: none; stroke: var(--green); stroke-width: 2; stroke-linecap: round; }
.kart .tick { fill: none; stroke: var(--paper); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.kart .bar { fill: none; stroke: var(--ink); stroke-width: 1.6; }
.pcard { position: relative; transition: border-color .15s, box-shadow .15s; }
.pcard .btn::after { content: ""; position: absolute; inset: 0; border-radius: 18px; }
.pcard:hover, .pcard:focus-within { border-color: var(--green-line); box-shadow: 0 0 0 3px var(--green-soft); }
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
  return page(
    `Send a postcard or letter — ${BRAND}`,
    `<style>${KIND_CARDS_CSS}
    .pick { display: grid; gap: 28px; padding-block: 48px 24px; }
    .pick-head { display: grid; gap: 10px; max-width: 640px; } .pick h1 { font-size: clamp(2rem, 4vw, 2.8rem); }
    </style>
    <div class="pick">
      <div class="pick-head"><span class="eyebrow">Send mail now</span><h1>What are you sending?</h1></div>
      ${kindCards("h2")}
      <p class="soft" style="font-size:.85rem">AI agent? Skip this form. Build an <a href="${esc(docsUrl("/guides/order-links"))}">order link</a> (one URL with every field) or call the <a href="${esc(docsUrl("/api/introduction"))}">API</a>.</p>
    </div>`,
    { description: `Mail a postcard (${usd(PRODUCTS.postcard_4x6.cents)}), letter (${usd(PRODUCTS.letter.cents)}) or certified letter (${usd(PRODUCTS.letter_certified.cents)}) from your browser. No account needed: we print it and mail it by USPS.` },
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
  // Mailing for letters: the Letter page offers First-Class and Express (USPS Priority); the Certified page offers
  // Certified Mail with or without a return receipt (Ryan, 2026-11-22: keep the two pages separate). Each option shows
  // its price (Ryan, 2026-11-22, round 2: prices back on the first screen).
  const mailing = (fixed === "certified" ? (["certified", "certified_return_receipt"] as const) : (["none", "express"] as const))
    .map((m) => {
      const [name, sub, cents] =
        m === "none" ? ["First-Class", "1–5 days", PRODUCTS.letter.cents]
        : m === "express" ? ["Express", "2–3 days, tracked", PRODUCTS.letter.cents + EXPRESS_CENTS]
        : m === "certified" ? ["Certified", "tracking and proof of delivery", PRODUCTS.letter_certified.cents]
        : ["Certified + return receipt", "the recipient's signature", PRODUCTS.letter_certified_rr.cents];
      return `<label><input type="radio" name="mailing" value="${m}"${m === startMailing ? " checked" : ""}><b>${name}</b><span>· ${sub}</span><em class="opt-price">${usd(cents)}</em></label>`;
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
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&amp;family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&amp;family=Inter:wght@400;600&amp;display=swap">
    <div class="send" id="sendWrap">
      <form id="f" class="form" novalidate>
        <div class="toprow"><a class="back-link" id="backLink" href="/send">← Send something else</a><button type="button" class="back-link linkbtn" id="backToContent" hidden>← Back to your ${fixed === "postcard" ? "postcard" : "letter"}</button>
          <nav class="stepper" aria-label="Steps"><span id="st1" class="on" aria-current="step"><span class="n">1</span>${fixed === "postcard" ? "Postcard" : "Letter"}</span><i aria-hidden="true"></i><span id="st2"><span class="n">2</span>Addresses</span></nav></div>
        <h1 id="h1">${info.h1}</h1>
        <input type="radio" name="kind" value="${fixed}" checked hidden>
        <input type="radio" name="product" value="letter" tabindex="-1" aria-hidden="true" class="sr"${isLetter(asked) ? " checked" : ""}>

        <div class="step" id="pc"${fixed === "postcard" ? "" : " hidden"}><h2 class="sr">Design your postcard</h2>
          <div class="field"><div class="top">Size</div><div class="opts sizes" role="radiogroup" aria-label="Postcard size">${sizes}</div></div>
          <div class="field"><div class="top">Front</div><div class="seg seg-wrap" role="radiogroup" aria-label="Front style"><label><input type="radio" name="front" value="text" checked>Text</label><label><input type="radio" name="front" value="photo">Photo</label><label><input type="radio" name="front" value="caption">Photo + caption</label><label><input type="radio" name="front" value="collage">Collage</label></div></div>
          <div class="stage">
            <div class="label"><span id="pvName">Postcard 4×6</span><span>Live preview</span></div>
            <div id="pvCard" class="card-pv"><div class="front" id="pvFront"></div></div>
            <div id="pvLetter" class="letter-pv" hidden><div class="to" id="pvLetterTo"></div><img id="pvLetterPhoto" class="lphoto-pv" alt="" hidden><div id="pvLetterBody"></div></div>
            <div class="flip" id="flip"><button type="button" data-side="front" aria-pressed="true">Front</button><button type="button" data-side="back" aria-pressed="false">Back</button></div>
          </div>
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
            <div class="list" role="radiogroup" aria-label="Postcard delivery"><label><input type="radio" name="pdeliv" value="first" checked><b>First-Class</b><span>· 1–5 days</span><em class="opt-price">Included</em></label><label><input type="radio" name="pdeliv" value="express"><b>Express</b><span>· 2–3 days, tracked</span><em class="opt-price">+${usd(EXPRESS_CENTS)}</em></label></div></div>
        </div>

        <div class="step" id="lt"${fixed === "postcard" ? " hidden" : ""}><h2 id="ltH" class="sr">Your letter</h2>
          <div class="seg" role="radiogroup" aria-label="Letter source"><label><input type="radio" name="lsrc" value="write" checked>Write it</label><label><input type="radio" name="lsrc" value="pdf">Upload a PDF</label></div>
          <div id="pdfBox" hidden style="display:grid;gap:10px">
            <label class="drop" id="pdrop"><input id="pdfFile" type="file" accept="application/pdf"><span id="pdropText"><b>Drop a PDF</b> or click to choose<br><small>Up to ${LIMITS.pdfPages} pages and ${LIMITS.pdfBytes / 1024 / 1024} MB. Any page size: we fit it to 8.5×11 and add an address page in front.</small></span></label>
            <label class="consent" style="margin:0"><input id="pdfColor" type="checkbox"><span>Print in color (+${usd(COLOR_LETTER_CENTS)})</span></label>
          </div>
          <div id="writeBox" style="display:grid;gap:12px">
            <div class="top sr"><label for="body">Letter</label><span class="count" id="bc">0/${LIMITS.letterBody}</span></div>
            <div class="editor"><div class="fmt" role="toolbar" aria-label="Formatting"><button type="button" data-cmd="bold" aria-label="Bold" aria-pressed="false" title="Bold"><b>B</b></button><button type="button" data-cmd="italic" aria-label="Italic" aria-pressed="false" title="Italic"><i>I</i></button><button type="button" data-cmd="underline" aria-label="Underline" aria-pressed="false" title="Underline"><u>U</u></button></div>
              <div id="bodyEd" class="ed" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Your letter" data-placeholder="Dear …"></div></div>
            <textarea id="body" maxlength="${LIMITS.letterBody}" hidden></textarea>
            <div class="row"><span class="row-l"><label class="addphoto" id="ldrop"><input id="lphoto" type="file" accept="image/jpeg,image/png,image/webp"><span id="ldropText">+ Add a photo (+${usd(COLOR_LETTER_CENTS)})</span></label><button type="button" class="linkbtn" id="lphotoRemove" hidden>Remove</button></span>
              <div class="seg" role="radiogroup" aria-label="Typeface"><label><input type="radio" name="font" value="serif" checked>Serif</label><label><input type="radio" name="font" value="sans">Sans-serif</label></div></div>
          </div>
          <div class="field"><div class="top">Mailing</div>
            <div class="list" role="radiogroup" aria-label="Mailing">${mailing}</div></div>
        </div>

        <div class="step" data-step="3"><h2 class="sub">To</h2>
          <div id="recips" style="display:grid;gap:18px"><div class="recip" data-p="to">${addressFields("to", "Recipient address")}</div></div>
          <button type="button" class="linkbtn" id="addRecip" style="justify-self:start">+ Send it to more people</button></div>
        <div class="step" data-step="4"><h2 class="sub">From</h2>${addressFields("from", "Return address")}
          <label class="field"><span class="sr">Your email</span><input id="email" type="email" required autocomplete="email" placeholder="Your email, for the receipt and updates"></label>
          <p class="fine">By paying you agree to our <a href="/content-policy" target="_blank">content policy</a>. A person checks every piece before it prints.</p>
        </div>
      </form>

      <div class="bar" id="bar"><p id="err" class="err" role="alert"></p><div class="bar-in">
        <span class="bar-sum" id="barSum"><small id="postageLine">Letter · First-Class</small><b id="total">${usd(PRODUCTS[start].cents)}</b></span>
        <button class="btn" id="next" type="button">Next: Addresses</button>
        <button class="btn" id="go" type="submit" form="f" hidden>Preview and pay</button>
      </div></div>
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
      function spUtm() { try { var o = JSON.parse(localStorage.getItem("sp_utm") || "null"); return o && o.v && Date.now() - o.at < 2592000000 ? { "X-Utm": o.v } : {}; } catch (e) { return {}; } }
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
    const EXTRA_SERVICE_IDS = ${JSON.stringify(Object.keys(EXTRA_SERVICE))};
    const H1 = ${JSON.stringify(info.h1)};
    let pdfUploaded = null;
    const isPdf = () => val("lsrc") === "pdf";
    const isExpress = () => (val("product") === "letter" ? val("mailing") === "express" : val("pdeliv") === "express");
    // Every section is visible from the start (2026-10-05, Ryan: the one-step-at-a-time form felt like it hid the fields).
    let shown = 4;
    let screen = 1; // 1 = the letter or postcard, 2 = the addresses (see showScreen)
    const kind = () => { const k = document.querySelector('input[name="kind"]:checked'); return k ? k.value : ""; };
    const motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    function reveal(n, scroll) {
      const before = shown; shown = Math.max(shown, n);
      document.querySelectorAll("[data-step]").forEach((el) => { el.hidden = Number(el.dataset.step) > shown || screen !== 2; });
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
          if ($("body").value.length > ${LIMITS.letterBody}) return "Your letter is too long: ${LIMITS.letterBody.toLocaleString("en-US")} characters at most.";
          return plainBody().trim() ? "" : "Write your letter first.";
        }
        const f = val("front");
        if (f === "text" && !$("headline").value.trim()) return "Add the big text for the front.";
        if ((f === "photo" || f === "caption") && !photoFile) return "Add a photo for the front.";
        if (f === "caption" && !$("caption").value.trim()) return "Add a caption.";
        if (f === "collage" && collage.length < 2) return "Choose at least 2 photos for the collage.";
        return $("message").value.trim() ? "" : "Write the message for the back.";
      }
      if (n === 3) {
        const ps = prefixes();
        for (let i = 0; i < ps.length; i++) {
          const a = addr(ps[i]);
          if (!(a.name && a.line1 && a.city && a.state && a.zip)) return ps.length > 1 ? "Fill in recipient " + (i + 1) + "'s name and full address." : "Fill in the recipient's name and full address.";
        }
        return "";
      }
      return "";
    }
    const effectiveProduct = () => (val("product") === "letter" ? LETTER_PRODUCT[val("mailing")] : val("product"));
    let side = "front", photoUrl = null, photoFile = null, letterPhoto = null, letterPhotoUrl = null;

    function addr(p) {
      const a = Object.fromEntries(["name","line1","line2","city","state","zip"].map(k => [k, $(p + "_" + k).value.trim()]).filter(([, v]) => v));
      const c = p === "from" && $("from_country") ? $("from_country").value : "US";
      if (c !== "US") a.country = c;
      return a;
    }
    function addrText(a) {
      if (a.country) return [a.name, a.line1, a.line2, [a.city, a.state, a.zip].filter(Boolean).join(" "), $("from_country").selectedOptions[0].text].filter(Boolean).join("\\n");
      return [a.name, a.line1, a.line2, [a.city, a.state].filter(Boolean).join(", ") + (a.zip ? " " + a.zip : "")].filter(Boolean).join("\\n");
    }
    // A return address outside the US: State and ZIP become optional Region and Postcode.
    function applyCountry() {
      const abroad = $("from_country").value !== "US", st = $("from_state"), zp = $("from_zip");
      st.closest(".addr").classList.toggle("abroad", abroad);
      st.required = zp.required = !abroad;
      st.maxLength = abroad ? 40 : 2; st.style.textTransform = abroad ? "none" : "uppercase"; st.placeholder = abroad ? "Region (optional)" : "ST";
      st.previousElementSibling.textContent = abroad ? "Region" : "State";
      zp.inputMode = abroad ? "text" : "numeric"; zp.maxLength = abroad ? 12 : 10; zp.placeholder = abroad ? "Postcode" : "ZIP";
      zp.previousElementSibling.textContent = abroad ? "Postcode" : "ZIP";
    }
    $("from_country").addEventListener("change", () => { applyCountry(); render(); });
    function render() {
      const product = effectiveProduct(), letter = val("product") === "letter", front = val("front"), photo = front === "photo" || front === "caption";
      $("pc").hidden = letter || shown < 2 || screen !== 1; $("lt").hidden = !letter || shown < 2 || screen !== 1;
      $("drop").hidden = !photo; $("textFront").hidden = front !== "text"; $("recrop").hidden = !photo || !photoFile;
      $("captionBox").hidden = front !== "caption"; $("cdrop").hidden = front !== "collage"; $("cclear").hidden = front !== "collage" || !collage.length;
      $("fontBox").hidden = !(front === "text" || front === "caption");
      $("cc").textContent = $("caption").value.length + "/${LIMITS.postcardCaption}";
      // The preview card takes the chosen size's shape (6×11 is wider than 4×6 and 6×9).
      if (!letter && SHEET[product]) $("pvCard").style.aspectRatio = (SHEET[product][0] - 0.25) + " / " + (SHEET[product][1] - 0.25);
      $("pvName").textContent = PRODUCTS[product].name;
      const color = letter && (isPdf() ? $("pdfColor").checked : Boolean(letterPhoto));
      const count = prefixes().length;
      // The bar on the Addresses screen: "Letter · First-Class", "Postcard 6×9 × 3 · Express", "Certified letter".
      $("postageLine").textContent = PRODUCTS[product].name + (count > 1 ? " × " + count : "") + (EXTRA_SERVICE_IDS.includes(product) ? "" : " · " + (isExpress() ? "Express" : "First-Class")) + (color ? " · color" : "");
      $("total").textContent = "$" + (count * (PRODUCTS[product].cents + (color ? COLOR_LETTER : 0) + (isExpress() ? EXPRESS : 0)) / 100).toFixed(2);
      if (count > 1) $("pvName").textContent = PRODUCTS[product].name + " × " + count;
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
        $("bodyEd").style.fontFamily = val("font") === "sans" ? "Inter, Helvetica, Arial, sans-serif" : "'Source Serif 4', Georgia, serif";
        return;
      }
      const card = $("pvCard");
      // The boxes you type in use the fonts you picked, as printed (Ryan, 2026-11-22). Caveat runs small, so it's bumped up.
      $("headline").style.fontFamily = $("caption").style.fontFamily = HFONT[val("hfont")];
      $("headline").style.fontSize = $("caption").style.fontSize = val("hfont") === "script" ? "1.3rem" : "";
      $("message").style.fontFamily = MFONT[val("mfont")];
      $("message").style.fontSize = val("mfont") === "handwriting" ? "1.3rem" : "";
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
          $("ldropText").innerHTML = '<img class="thumb" alt="" src="' + letterPhotoUrl + '"> Change photo';
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
      $("ldropText").textContent = "+ Add a photo (+${usd(COLOR_LETTER_CENTS)})"; render();
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
      // Enter in a field on screen 1 means Next; content that went missing (a photo after a reload) sends you back to it.
      if (screen === 1) { toAddresses(); return; }
      const missing = stepProblem(2);
      if (missing) { showScreen(1, false); history.replaceState(null, "", location.pathname + location.search); $("err").textContent = missing; return; }
      const problem = stepProblem(2) || stepProblem(3);
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
        const ps = prefixes();
        if (ps.length > 1) body.recipients = ps.map(addr); else body.to = addr("to");
        Object.assign(body, { from: addr("from"), customer_email: $("email").value.trim() || undefined });
        const r = await fetch(url, { method: "POST", headers: Object.assign({ "Content-Type": "application/json", "X-Client": "web" }, window.posthog && posthog.get_distinct_id ? { "X-Analytics-Id": String(posthog.get_distinct_id()) } : {}, spUtm()), body: JSON.stringify(body) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error.fields ? j.error.fields.map(errLine).join(" · ") : j.error.message);
        saveDraft();
        location.href = j.batch ? "/b/" + j.batch.id : "/o/" + j.id;
      } catch (err) { $("err").textContent = err.message; go.disabled = false; go.textContent = "Preview and pay"; }
    });
    // Several recipients (one design to many people): each extra address block copies the first one's fields with a
    // new id prefix (to2_, to3_…); addr(prefix) reads any of them.
    const MAXR = ${MAX_RECIPIENTS};
    const prefixes = () => [...document.querySelectorAll(".recip")].map((r) => r.dataset.p);
    let nextR = 2;
    function renumber() {
      const rs = [...document.querySelectorAll(".recip")];
      rs.forEach((r, i) => { const b = r.querySelector(".recip-h b"); if (b) b.textContent = "Recipient " + (i + 1); });
      $("addRecip").hidden = rs.length >= MAXR;
    }
    // Adds an address block and returns its prefix. A restored draft adds blocks without moving focus (no scroll jump).
    function addRecipient(focus) {
      if (prefixes().length >= MAXR) return "";
      const p = "to" + nextR++;
      const wrap = document.createElement("div"); wrap.className = "recip"; wrap.dataset.p = p;
      const fields = document.querySelector('.recip[data-p="to"] fieldset').outerHTML.split('id="to_').join('id="' + p + "_");
      wrap.innerHTML = '<div class="recip-h"><b></b><button type="button" class="linkbtn">Remove</button></div>' + fields;
      wrap.querySelectorAll("input").forEach((el) => (el.value = ""));
      wrap.querySelector(".recip-h button").addEventListener("click", () => { wrap.remove(); renumber(); render(); saveDraft(); });
      $("recips").appendChild(wrap); renumber(); render();
      if (focus) wrap.querySelector("input").focus();
      return p;
    }
    $("addRecip").addEventListener("click", () => { addRecipient(true); saveDraft(); });
    // API field paths like recipients.2.zip read as "Recipient 3: zip"; a whole address (to, from, recipients.2) comes
    // from the USPS address check and reads "Send to:", "From:" or "Recipient 3:".
    function recipField(f) {
      const parts = f.split(".");
      return parts[0] === "recipients" && parts.length >= 2 ? "Recipient " + (Number(parts[1]) + 1) + ":" + (parts.length > 2 ? " " + parts.slice(2).join(".") : "") : f;
    }
    // Only the first letter is lowered, and never in an acronym, so "USPS" and "Apt 4B" survive. PostGrid's own
    // wording in brackets "(Address check: …)" is for agents and support, so people on the form don't see it.
    function errLine(f) {
      const where = recipField(f.field || "").replace(/^to(\\.|$)/, "Send to: ").replace(/^from(\\.|$)/, "From: ").replace(/^content\\./, "").trim();
      const msg = f.message.replace(/ \\(Address check: [^)]*\\)$/, "");
      return (where ? where + " " : "") + (/^[A-Z]{2}/.test(msg) ? msg : msg.charAt(0).toLowerCase() + msg.slice(1));
    }
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
      const fc = (q.get("from_country") || "").toUpperCase();
      if (fc && [...$("from_country").options].some((o) => o.value === fc)) { $("from_country").value = fc; applyCountry(); }
      applyKind(); reveal(4, false);
    })();
    // The Back button (2026-11-21: a tester pressed Back from the order page and couldn't carry on). A browser either
    // restores this page from memory, where the button was still "Working…" and disabled, or reloads it, which lost
    // the recipient's name (fields with autocomplete="off" aren't restored), extra recipients and the preview. So the
    // typed fields are kept as a draft in this tab's sessionStorage (gone when the tab closes; the order page clears
    // it once the order is paid), and the button resets whenever the page is shown. Photos and PDFs are files, so
    // they aren't kept. A draft comes back on the plain form page, or on the exact link it was typed on; a different
    // prefill link (?to_name=…) starts from that link instead.
    const DRAFT = "sp_draft:" + location.pathname;
    function saveDraft() {
      try {
        const v = {};
        document.querySelectorAll("#f input, #f textarea, #f select").forEach((el) => {
          if (el.type === "file") return;
          if (el.type === "radio") { if (el.checked) v["radio:" + el.name] = el.value; }
          else if (el.id) v[el.id] = el.type === "checkbox" ? el.checked : el.value;
        });
        sessionStorage.setItem(DRAFT, JSON.stringify({ search: location.search, recips: prefixes(), v: v }));
      } catch (e) {}
    }
    (function restoreDraft() {
      let d = null;
      try { d = JSON.parse(sessionStorage.getItem(DRAFT) || "null"); } catch (e) { return; }
      if (!d || !d.v || (location.search && d.search !== location.search)) return;
      const ids = {};
      (d.recips || []).forEach((old, i) => { ids[old] = i === 0 ? "to" : addRecipient(false); });
      Object.keys(d.v).forEach((k) => {
        if (k.indexOf("radio:") === 0) {
          const r = [...document.querySelectorAll('input[type="radio"]')].find((el) => el.name === k.slice(6) && el.value === d.v[k]);
          if (r) r.checked = true;
          return;
        }
        const m = /^(to[0-9]*)_(.+)$/.exec(k);
        const el = $(m && ids[m[1]] ? ids[m[1]] + "_" + m[2] : k);
        if (!el) return;
        if (el.type === "checkbox") el.checked = !!d.v[k]; else el.value = d.v[k];
      });
      applyCountry(); applyKind(); reveal(4, false);
    })();
    // Letter text with B / I / U (Ryan, 2026-11-22). The editable box is what people type in; the hidden #body holds
    // what is sent: plain text plus exactly <b>, <i> and <u> (the server escapes everything else, render.ts
    // formatInline). Pasted text arrives plain. No backslash escapes here: this script lives in a TS template literal.
    const ed = $("bodyEd"), NL = String.fromCharCode(10), ZWJ = String.fromCharCode(8205), TAGS = ["b", "i", "u"];
    function plainBody() { let t = $("body").value; TAGS.forEach((x) => { t = t.split("<" + x + ">").join("").split("</" + x + ">").join(""); }); return t; }
    function edText(root) {
      let out = "";
      const walk = (node) => {
        node.childNodes.forEach((n) => {
          if (n.nodeType === 3) {
            // Text that literally reads "<b>" (typed or pasted) must print as typed, not turn bold: an invisible
            // zero-width joiner after "<" keeps the server from reading it as formatting.
            let v = n.nodeValue.split(String.fromCharCode(160)).join(" ");
            TAGS.forEach((x) => { v = v.split("<" + x + ">").join("<" + ZWJ + x + ">").split("</" + x + ">").join("<" + ZWJ + "/" + x + ">"); });
            out += v; return;
          }
          if (n.nodeType !== 1) return;
          const t = n.nodeName;
          if (t === "BR") { out += NL; return; }
          const block = t === "DIV" || t === "P";
          if (block && out && !out.endsWith(NL)) out += NL;
          const w = t === "B" || t === "STRONG" ? "b" : t === "I" || t === "EM" ? "i" : t === "U" ? "u" : "";
          if (w) out += "<" + w + ">";
          walk(n);
          if (w) out += "</" + w + ">";
          if (block && !out.endsWith(NL)) out += NL;
        });
      };
      walk(root);
      if (out.endsWith(NL)) out = out.slice(0, -1);
      TAGS.forEach((x) => { out = out.split("<" + x + "></" + x + ">").join(""); });
      return out;
    }
    function edFromText(t) {
      let h = t.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");
      TAGS.forEach((x) => { h = h.split("&lt;" + x + "&gt;").join("<" + x + ">").split("&lt;/" + x + "&gt;").join("</" + x + ">"); });
      ed.innerHTML = h.split(NL).join("<br>") + (t.endsWith(NL) ? "<br>" : "");
    }
    function fmtState() {
      document.querySelectorAll(".fmt button").forEach((b) => b.setAttribute("aria-pressed", String(document.activeElement === ed && document.queryCommandState(b.dataset.cmd))));
    }
    // Runs before the page-wide input listeners (preview, draft), so they see the new text.
    ed.addEventListener("input", () => { const t = edText(ed); $("body").value = t; if (!t && ed.innerHTML) ed.innerHTML = ""; fmtState(); });
    ed.addEventListener("paste", (e) => { e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain")); });
    ed.addEventListener("drop", (e) => e.preventDefault());
    document.addEventListener("selectionchange", fmtState);
    document.querySelectorAll(".fmt button").forEach((b) => {
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        if (document.activeElement !== ed) ed.focus();
        document.execCommand("styleWithCSS", false, false);
        document.execCommand(b.dataset.cmd);
        ed.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
    edFromText($("body").value);
    let draftTimer = 0;
    $("f").addEventListener("input", () => { $("err").textContent = ""; clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 300); });
    $("f").addEventListener("change", saveDraft);
    window.addEventListener("pageshow", () => {
      const go = $("go"); go.disabled = false; go.textContent = "Preview and pay";
      render();
    });
    // Two screens (Ryan, 2026-11-22: "radically simplify", layout C from the concepts canvas): 1 = the letter or
    // postcard (postcards keep their live preview at the top), 2 = the addresses, with the price only there, in the bar. Moving to screen 2 adds a history entry (#addresses), so the browser's Back
    // returns to screen 1 instead of leaving the page, and Back from the order page lands on the addresses again.
    function showScreen(n, push) {
      screen = n;
      $("backLink").hidden = n !== 1; $("backToContent").hidden = n !== 2;
      $("next").hidden = n !== 1; $("go").hidden = n !== 2;
      $("h1").textContent = n === 2 ? "Addresses" : H1;
      [["st1", 1], ["st2", 2]].forEach(([id, k]) => { $(id).classList.toggle("on", n === k); if (n === k) $(id).setAttribute("aria-current", "step"); else $(id).removeAttribute("aria-current"); });
      $("err").textContent = "";
      reveal(4, false);
      if (push) history.pushState({ screen: n }, "", n === 2 ? "#addresses" : location.pathname + location.search);
      window.scrollTo(0, 0);
    }
    function toAddresses() {
      const p = stepProblem(2);
      if (p) { $("err").textContent = p; if (matchMedia("(max-width: 920px)").matches) $("err").scrollIntoView({ block: "center" }); return; }
      showScreen(2, true);
    }
    function toContent() {
      if (history.state && history.state.screen === 2) history.back();
      else { showScreen(1, false); history.replaceState(null, "", location.pathname + location.search); }
    }
    $("next").addEventListener("click", toAddresses);
    $("backToContent").addEventListener("click", toContent);
    window.addEventListener("popstate", () => showScreen(location.hash === "#addresses" && !stepProblem(2) ? 2 : 1, false));
    if (location.hash === "#addresses" && !stepProblem(2)) showScreen(2, false);
    else { showScreen(1, false); if (location.hash === "#addresses") history.replaceState(null, "", location.pathname + location.search); }
    render();
    </script>`,
    { description: info.description },
  );
}
