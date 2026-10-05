// Print layouts. The same HTML is the customer preview and the operator's print sheet,
// so what the customer approved is exactly what gets printed.
import { BRAND, isLetter, postcardSpec } from "./config.ts";
import type { Address, OrderRow } from "./orders.ts";

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const THEMES: Record<string, [string, string]> = {
  ink: ["#1d2433", "#f4efe6"],
  sky: ["#2f6fb3", "#ffffff"],
  sunset: ["#e2603f", "#fff6e8"],
  forest: ["#2f5d46", "#f1f5ec"],
};

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
  const c = o.content;
  const [bg, fg] = THEMES[c.front_theme ?? "ink"] ?? THEMES.ink;
  const inner = c.front_image_url
    ? `<img src="${esc(c.front_image_url)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`
    : `<div style="height:100%;display:grid;place-items:center;padding:0.5in;background:${bg};color:${fg};text-align:center;font:700 ${w > 6 ? 40 : 30}px/1.1 Georgia,serif">${esc(c.front_headline)}</div>`;
  return `<div class="piece" style="width:${w}in;height:${h}in">${inner}</div>`;
}

export function postcardBack(o: Pick<OrderRow, "product" | "content" | "to_address" | "from_address">) {
  const { w, h } = postcardSpec(o.product);
  return `<div class="piece back" style="width:${w}in;height:${h}in">
    <div class="msg">${paragraphs(o.content.message ?? "")}</div>
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
  <style>body{margin:0;padding:24px;background:#e9e7e2;display:grid;gap:24px;justify-items:start} ${PRINT_CSS}</style></head>
  <body>${note}${pieces}</body></html>`;
}
