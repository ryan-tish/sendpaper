// Print layouts. The same HTML is the customer preview and the operator's print sheet,
// so what the customer approved is exactly what gets printed.
import { BRAND, isLetter, postcardSpec } from "./config.ts";
import type { Address, OrderRow } from "./orders.ts";

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Text-front color themes: [background, text]. The schema's front_theme enum is built from these keys.
export const THEMES: Record<string, [string, string]> = {
  ink: ["#1d2433", "#f4efe6"],
  sky: ["#2f6fb3", "#ffffff"],
  sunset: ["#e2603f", "#fff6e8"],
  forest: ["#2f5d46", "#f1f5ec"],
  rose: ["#b8475f", "#fff4f6"],
  sand: ["#e9dcc4", "#2b2420"],
  night: ["#111827", "#fde68a"],
  mint: ["#cfeee0", "#0f4f3a"],
};
export const THEME_NAMES = Object.keys(THEMES) as [string, ...string[]];

// Postcard fronts (2026-10-05): headline on a color, one photo, a photo with a caption band, or a 2-4 photo collage.
export type PostcardLayout = "headline" | "photo" | "photo_caption" | "collage";
export const postcardLayout = (c: Record<string, any>): PostcardLayout =>
  c.layout ?? (Array.isArray(c.front_images) && c.front_images.length ? "collage" : c.front_image_url ? (c.caption ? "photo_caption" : "photo") : "headline");

// Font stacks shared by the preview and the print (the print page loads these Google fonts; the preview falls back).
export const HEADLINE_FONTS: Record<string, string> = {
  serif: "'Source Serif 4', Georgia, serif",
  sans: "Inter, Helvetica, Arial, sans-serif",
  script: "Caveat, 'Bradley Hand', cursive",
};
export const MESSAGE_FONTS: Record<string, string> = {
  handwriting: "Caveat, 'Segoe Print', 'Bradley Hand', cursive",
  serif: "'Source Serif 4', Georgia, serif",
  sans: "Inter, Helvetica, Arial, sans-serif",
};

// The front at any size (inches): the preview passes the trim size, the print passes trim + bleed. `src` maps an
// image path to a URL (the print needs absolute URLs). Everything is absolutely sized so preview and print match.
export function frontMarkup(c: Record<string, any>, w: number, h: number, src: (u: string) => string = (u) => u) {
  const img = (u: string, style = "") => `<img src="${esc(src(u))}" alt="" style="display:block;width:100%;height:100%;object-fit:cover;${style}">`;
  const big = h >= 6;
  const layout = postcardLayout(c);
  // Absolute positions in inches only: PostGrid's print renderer ignores CSS grid, left+right stretching and
  // unprefixed gradients (all three broke the first proofs, 2026-10-05).
  const box = (x: number, y: number, bw: number, bh: number, inner: string) =>
    `<div style="position:absolute;left:${x}in;top:${y}in;width:${bw}in;height:${bh}in;overflow:hidden">${inner}</div>`;
  if (layout === "collage") {
    const pics: string[] = (c.front_images ?? []).slice(0, 4);
    const g = 0.06; // white gutter between photos
    const half = (len: number) => (len - g) / 2;
    const cells: [number, number, number, number][] =
      pics.length === 2 ? [[0, 0, half(w), h], [half(w) + g, 0, half(w), h]]
      : pics.length === 3 ? (() => { const lw = (w - g) * 0.58, rw = w - g - lw; return [[0, 0, lw, h], [lw + g, 0, rw, half(h)], [lw + g, half(h) + g, rw, half(h)]] as [number, number, number, number][]; })()
      : [[0, 0, half(w), half(h)], [half(w) + g, 0, half(w), half(h)], [0, half(h) + g, half(w), half(h)], [half(w) + g, half(h) + g, half(w), half(h)]];
    return `<div style="position:relative;width:${w}in;height:${h}in;overflow:hidden;background:#fff">${pics.map((u, k) => box(...cells[k], img(u))).join("")}</div>`;
  }
  if (layout === "photo" || layout === "photo_caption") {
    let caption = "";
    if (layout === "photo_caption" && c.caption) {
      const bandH = big ? 1.35 : 1.0;
      caption = `<div style="position:absolute;left:0;top:${h - bandH}in;width:${w}in;height:${bandH}in;background:rgba(0,0,0,0.42)"></div>`
        + `<div style="position:absolute;left:${big ? 0.5 : 0.36}in;top:${h - bandH}in;width:${w - (big ? 1 : 0.72)}in;height:${bandH - (big ? 0.32 : 0.24)}in;display:-webkit-box;display:flex;-webkit-box-align:end;align-items:flex-end;color:#fff;font:600 ${c.headline_font === "script" ? (big ? 44 : 32) : big ? 34 : 24}px/1.1 ${HEADLINE_FONTS[c.headline_font ?? "serif"]}">${esc(c.caption)}</div>`;
    }
    return `<div style="position:relative;width:${w}in;height:${h}in;overflow:hidden">${box(0, 0, w, h, img(c.front_image_url))}${caption}</div>`;
  }
  const [bg, fg] = THEMES[c.front_theme ?? "ink"] ?? THEMES.ink;
  const size = c.headline_font === "script" ? (big ? 58 : 44) : big ? 46 : 34;
  return `<div style="width:${w}in;height:${h}in;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;text-align:center;box-sizing:border-box;padding:0.6in;font:600 ${size}px/1.1 ${HEADLINE_FONTS[c.headline_font ?? "serif"]}">${esc(c.front_headline)}</div>`;
}

export function addressBlock(a: Address) {
  return [a.name, a.company, a.line1, a.line2, `${a.city}, ${a.state} ${a.zip}`]
    .filter(Boolean)
    .map(esc)
    .join("<br>");
}

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

export function postcardFront(o: Pick<OrderRow, "product" | "content">) {
  const { w, h } = postcardSpec(o.product);
  return `<div class="piece" style="width:${w}in;height:${h}in">${frontMarkup(o.content, w, h)}</div>`;
}

export function postcardBack(o: Pick<OrderRow, "product" | "content" | "to_address" | "from_address">) {
  const { w, h } = postcardSpec(o.product);
  return `<div class="piece back" style="width:${w}in;height:${h}in">
    <div class="msg" style="font-family:${MESSAGE_FONTS[o.content.message_font ?? "handwriting"] ?? MESSAGE_FONTS.handwriting}">${paragraphs(o.content.message ?? "")}</div>
    <div class="addr">
      <div class="stamp">USPS<br>FIRST-CLASS</div>
      <div class="from">${addressBlock(o.from_address)}</div>
      <div class="to">${addressBlock(o.to_address)}</div>
    </div>
  </div>`;
}

export function letterPages(o: Pick<OrderRow, "content" | "to_address" | "from_address" | "created_at">) {
  const date = new Date(o.created_at ?? Date.now()).toLocaleDateString("en-US", { dateStyle: "long" });
  const font = o.content.font === "sans" ? "Helvetica,Arial,sans-serif" : "Georgia,'Times New Roman',serif";
  // A PDF letter: PostGrid's blank address page first, then the customer's own document (already 8.5×11).
  if (o.content.pdf_url) {
    const pages = Number(o.content.pdf_pages ?? 1);
    return `<div class="piece letter" style="font-family:Helvetica,Arial,sans-serif">
      <div class="window">${addressBlock(o.from_address)}<br><br>${addressBlock(o.to_address)}</div>
      <p class="pdfnote">Address page, added automatically. Your document follows (${pages} page${pages === 1 ? "" : "s"}${o.content.color ? ", in color" : ", black and white"}).</p>
    </div>
    <div class="piece pdfdoc"><object data="${esc(o.content.pdf_url)}#view=FitH" type="application/pdf" style="width:8.5in;height:${Math.min(pages, 3) * 11}in;display:block">
      <p style="padding:1in;font:14px Helvetica,Arial,sans-serif">Your browser can't show the PDF here. <a href="${esc(o.content.pdf_url)}" target="_blank" rel="noopener">Open the document</a> to check it.</p></object></div>`;
  }
  return `<div class="piece letter" style="font-family:${font}">
    <div class="window">${addressBlock(o.from_address)}<br><br>${addressBlock(o.to_address)}</div>
    <div class="date">${esc(date)}</div>
    ${o.content.image_url ? `<img class="photo" alt="" src="${esc(o.content.image_url)}">` : ""}
    ${paragraphs(o.content.body ?? "")}
  </div>`;
}

export const PRINT_CSS = `
  .piece { background:#fff; color:#1b1b1b; box-shadow:0 1px 3px rgba(0,0,0,.18); overflow:hidden; position:relative; }
  .back { display:grid; grid-template-columns:1fr 1fr; gap:.25in; padding:.3in; box-sizing:border-box; font:13px/1.45 "Segoe Print","Bradley Hand","Comic Sans MS",cursive; }
  .back .msg { overflow:hidden; border-right:1px solid #ccc; padding-right:.2in; }
  .back .msg p { margin:0 0 .6em; }
  .back .addr { position:relative; font:12px/1.4 Helvetica,Arial,sans-serif; }
  .back .stamp { position:absolute; top:0; right:0; width:.8in; height:.9in; border:1px dashed #999; font:9px/1.2 Helvetica,sans-serif; display:grid; place-items:center; text-align:center; color:#777; }
  .back .from { font-size:9px; color:#444; max-width:55%; }
  .back .to { position:absolute; left:0; right:0; top:46%; font-size:13px; }
  .letter { width:8.5in; min-height:11in; padding:.75in 1in; box-sizing:border-box; font-size:12pt; line-height:1.5; }
  .letter .window { font:10pt/1.35 Helvetica,Arial,sans-serif; margin-bottom:.4in; min-height:1.6in; }
  .letter .date { margin-bottom:.3in; }
  .letter .pdfnote { color:#666; font-size:10pt; }
  .pdfdoc { width:8.5in; }
  .letter .photo { display:block; max-width:100%; max-height:3in; margin:0 auto .3in; object-fit:contain; }
  .letter p { margin:0 0 1em; }
  @media print { .piece { box-shadow:none; page-break-after:always; } .noprint { display:none !important; } body { background:#fff !important; } }
`;

export function printSheet(o: OrderRow, opts: { operator?: boolean } = {}) {
  const pieces =
    isLetter(o.product) ? letterPages(o) : `${postcardFront(o)}${postcardBack(o)}`;
  const note = opts.operator
    ? `<p class="noprint" style="font:14px system-ui">Order <b>${esc(o.id)}</b> · ${esc(o.product)} · ${esc(o.status)}. Print at 100% scale (no "fit to page").</p>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.id)} · ${esc(BRAND)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Inter:wght@400;600&display=swap">
  <style>body{margin:0;padding:24px;background:#e9e7e2;display:grid;gap:24px;justify-items:start} ${PRINT_CSS}</style></head>
  <body>${note}${pieces}</body></html>`;
}

// Paragraph copy may use **bold**, [text](/path) links to our pages and [text](https://…) links to sources next to contested claims (Ryan: bold a few key phrases, link our own guides 2–3 times).
// Escaped first, so nothing else becomes HTML. plain() strips the markup for JSON-LD and meta text.
export const rich = (t: string) =>
  esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\[(.+?)\]\((\/[a-z0-9\/#?=&_-]*)\)/g, '<a href="$2">$1</a>')
    .replace(/\[(.+?)\]\((https:\/\/[^\s)"<>]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
export const plain = (t: string) => t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[(.+?)\]\(.+?\)/g, "$1");
