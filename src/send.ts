import { OFFER_LIMIT } from "./offer.ts";
import { BRAND, LIMITS, PRODUCTS, type ProductId } from "./config.ts";
import { docsUrl, page } from "./layout.ts";
import { esc, THEMES } from "./render.ts";

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

const CSS = `
.send { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: 48px; align-items: start; padding-block: 40px 24px; }
.send h1 { font-size: clamp(2rem, 4vw, 2.8rem); }
.form { display: grid; gap: 28px; min-width: 0; }
.step { display: grid; gap: 14px; }
.step-h { display: flex; align-items: baseline; gap: 10px; }
.step-h span { font: 500 .74rem var(--f-mono); color: var(--green); }
.step-h h2 { font-size: 1.1rem; letter-spacing: -0.01em; }
.choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
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

export function sendPage(initial: string, offerLeft = 0) {
  const start: ProductId = initial in PRODUCTS ? (initial as ProductId) : "postcard_4x6";
  const choices = (Object.entries(PRODUCTS) as [ProductId, (typeof PRODUCTS)[ProductId]][])
    .map(
      ([id, p]) => `<label class="choice"><input type="radio" name="product" value="${id}"${id === start ? " checked" : ""}>
        <b>${esc(id === "letter" ? "Letter" : `Postcard ${p.size.replace(/ in$/, "").replace(/ /g, "")}`)}</b><small>${esc(p.size)}</small><span class="p">${usd(p.cents)}</span></label>`,
    )
    .join("");
  const swatches = Object.entries(THEMES)
    .map(([k, [bg]], i) => `<label style="background:${bg}" title="${k}"><input type="radio" name="theme" value="${k}"${i === 0 ? " checked" : ""}><span class="sr">${k}</span></label>`)
    .join("");

  return page(
    `Send a postcard or letter — ${BRAND}`,
    `<style>${CSS}</style>
    <div class="send">
      <form id="f" class="form" novalidate>
        <div style="display:grid;gap:10px"><span class="eyebrow">Send from the web</span><h1>Send a postcard or letter</h1><p class="soft">Printed and mailed via USPS First-Class to any US address. You see the exact print before you pay.</p></div>

        <div class="step"><div class="step-h"><span>01</span><h2>Choose</h2></div><div class="choices" role="radiogroup" aria-label="Product">${choices}</div></div>

        <div class="step" id="pc"><div class="step-h"><span>02</span><h2>Design the front</h2></div>
          <div class="seg" role="radiogroup" aria-label="Front style"><label><input type="radio" name="front" value="text" checked>Text</label><label><input type="radio" name="front" value="photo">Photo</label></div>
          <label class="drop" id="drop" hidden><input id="photo" type="file" accept="image/jpeg,image/png,image/webp"><span id="dropText"><b>Drop a photo</b> or click to choose<br><small>JPG, PNG or WebP, up to 25 MB. You can crop it next.</small></span></label>
          <button type="button" class="linkbtn" id="recrop" hidden>Adjust crop</button>
          <div id="textFront" style="display:grid;gap:12px">
            <div class="field"><div class="top"><label for="headline">Big text</label><span class="count" id="hc">0/${LIMITS.postcardHeadline}</span></div><input id="headline" maxlength="${LIMITS.postcardHeadline}" placeholder="Greetings from Lisbon!"></div>
            <div class="field"><div class="top">Color</div><div class="swatches" role="radiogroup" aria-label="Color">${swatches}</div></div>
          </div>
          <div class="field"><div class="top"><label for="message">Message on the back</label><span class="count" id="mc">0/${LIMITS.postcardMessage}</span></div><textarea id="message" maxlength="${LIMITS.postcardMessage}" placeholder="Wish you were here…"></textarea></div>
        </div>

        <div class="step" id="lt" hidden><div class="step-h"><span>02</span><h2>Write the letter</h2></div>
          <div class="field"><div class="top"><label for="body">Letter</label><span class="count" id="bc">0/${LIMITS.letterBody}</span></div><textarea id="body" maxlength="${LIMITS.letterBody}" style="min-height:280px" placeholder="Dear …"></textarea></div>
          <div class="seg" role="radiogroup" aria-label="Typeface"><label><input type="radio" name="font" value="serif" checked>Serif</label><label><input type="radio" name="font" value="sans">Sans-serif</label></div>
        </div>

        <div class="step"><div class="step-h"><span>03</span><h2>Send to</h2></div>${addressFields("to", "Recipient address")}</div>
        <div class="step"><div class="step-h"><span>04</span><h2>From</h2></div>${addressFields("from", "Return address")}
          <label class="field"><span class="sr">Your email</span><input id="email" type="email" required autocomplete="email" placeholder="Your email, for the receipt and updates"></label>
          <label class="consent"><input id="ok" type="checkbox"><span>This mail isn't threatening, harassing, fraudulent or obscene, and a person at ${esc(BRAND)} may review it before printing. <a href="/content-policy" target="_blank">Content policy</a></span></label>
        </div>
        <p class="soft" style="font-size:.85rem">AI agent? Skip this form. Build an <a href="${esc(docsUrl("/guides/order-links"))}">order link</a> (one URL with every field) or call the <a href="${esc(docsUrl("/api/introduction"))}">API</a>.</p>
      </form>

      <aside class="aside" aria-label="Preview and payment">
        <div class="stage">
          <div class="label"><span id="pvName">Postcard 4×6</span><span>Live preview</span></div>
          <div id="pvCard" class="card-pv"><div class="front" id="pvFront"></div></div>
          <div id="pvLetter" class="letter-pv" hidden><div class="to" id="pvLetterTo"></div><div id="pvLetterBody"></div></div>
          <div class="flip" id="flip"><button type="button" data-side="front" aria-pressed="true">Front</button><button type="button" data-side="back" aria-pressed="false">Back</button></div>
        </div>
        <div class="summary">
          <div class="line"><span>Printing, envelope, First-Class postage</span><span>Included</span></div>
          <div class="total"><span>Total</span><b id="total">${usd(PRODUCTS[start].cents)}</b></div>
          <p id="err" class="err" role="alert" style="margin:0"></p>
          <button class="btn" id="go" type="submit" form="f">Preview the print and pay</button>
          ${offerLeft > 0 ? `<p class="note" id="offerNote"><b style="color:var(--green)">Launch offer:</b> your first postcard is free (${offerLeft} of ${OFFER_LIMIT} left). It's applied on the next page, with no card needed.</p>` : ""}
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
    const MAX_IMG = ${LIMITS.imageBytes}, MAX_ORIGINAL = 25 * 1024 * 1024;
    const $ = (id) => document.getElementById(id);
    const val = (name) => document.querySelector('input[name="' + name + '"]:checked').value;
    let side = "front", photoUrl = null, photoFile = null;

    function addr(p) {
      return Object.fromEntries(["name","line1","line2","city","state","zip"].map(k => [k, $(p + "_" + k).value.trim()]).filter(([, v]) => v));
    }
    function addrText(a) {
      return [a.name, a.line1, a.line2, [a.city, a.state].filter(Boolean).join(", ") + (a.zip ? " " + a.zip : "")].filter(Boolean).join("\\n");
    }
    function render() {
      const product = val("product"), letter = product === "letter", photo = val("front") === "photo";
      $("pc").hidden = letter; $("lt").hidden = !letter;
      if ($("offerNote")) $("offerNote").hidden = letter;
      $("drop").hidden = !photo; $("textFront").hidden = photo; $("recrop").hidden = !photo || !photoFile;
      $("pvName").textContent = PRODUCTS[product].name;
      $("total").textContent = "$" + (PRODUCTS[product].cents / 100).toFixed(2);
      $("pvCard").hidden = letter; $("pvLetter").hidden = !letter; $("flip").hidden = letter;
      $("hc").textContent = $("headline").value.length + "/${LIMITS.postcardHeadline}";
      $("mc").textContent = $("message").value.length + "/${LIMITS.postcardMessage}";
      $("bc").textContent = $("body").value.length + "/${LIMITS.letterBody}";
      const to = addrText(addr("to")) || "Recipient\\nStreet address\\nCity, ST ZIP";
      if (letter) {
        $("pvLetterTo").textContent = to;
        $("pvLetterBody").textContent = $("body").value || "Dear …";
        $("pvLetter").style.fontFamily = val("font") === "sans" ? "Helvetica, Arial, sans-serif" : "Georgia, serif";
        return;
      }
      const card = $("pvCard");
      if (side === "front") {
        if (photo && photoUrl) card.innerHTML = '<div class="front"><img alt="" src="' + photoUrl + '"></div>';
        else if (photo) card.innerHTML = '<div class="front" style="background:var(--tint);color:var(--faint);font:500 .9rem var(--f-ui)">Your photo here</div>';
        else {
          const [bg, fg] = THEMES[val("theme")];
          card.innerHTML = '<div class="front" style="background:' + bg + ';color:' + fg + '"></div>';
          card.firstChild.textContent = $("headline").value || "Your big text";
        }
      } else {
        card.innerHTML = '<div class="back"><div class="msg"></div><div class="to"></div></div>';
        card.querySelector(".msg").textContent = $("message").value || "Your message…";
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
    const SHEET = { postcard_4x6: [6.25, 4.25], postcard_6x9: [9.25, 6.25] }, BLEED = 0.125;
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
      crop.product = val("product") === "postcard_6x9" ? "postcard_6x9" : "postcard_4x6";
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

    $("f").addEventListener("submit", async (e) => {
      e.preventDefault(); $("err").textContent = "";
      if (!$("ok").checked) { $("err").textContent = "Please confirm the content policy (step 04)."; return; }
      const go = $("go"); go.disabled = true; go.textContent = "Working…";
      try {
        const product = val("product");
        let url, body;
        if (product === "letter") {
          url = "/v1/letters"; body = { content: { body: $("body").value, font: val("font") } };
        } else {
          url = "/v1/postcards";
          const content = { message: $("message").value, front_theme: val("theme") };
          if (val("front") === "photo") {
            if (!photoFile) throw new Error("Add a photo for the front, or switch to Text.");
            const up = await fetch("/v1/images", { method: "POST", headers: { "Content-Type": photoFile.type }, body: photoFile });
            const uj = await up.json(); if (!up.ok) throw new Error(uj.error.message);
            content.front_image_url = uj.url;
          } else if ($("headline").value.trim()) content.front_headline = $("headline").value.trim();
          body = { size: product === "postcard_6x9" ? "6x9" : "4x6", content };
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
      else if (q.get("size") === "6x9") pick("product", "postcard_6x9");
      else if (q.get("type") === "postcard" || q.get("size") === "4x6") pick("product", "postcard_4x6");
      if (q.get("headline")) { pick("front", "text"); set("headline", q.get("headline")); }
      if (q.get("theme")) pick("theme", q.get("theme"));
      if (q.get("font")) pick("font", q.get("font"));
      set("message", q.get("message")); set("body", q.get("body")); set("email", q.get("email"));
      for (const p of ["to", "from"]) for (const k of ["name", "line1", "line2", "city", "state", "zip"]) set(p + "_" + k, q.get(p + "_" + k));
    })();
    render();
    </script>`,
  );
}
