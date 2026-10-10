// Preview images (2026-10-10, Ryan's agent-ready list: "image API so a human can see what you are buying").
// GET /o/:id/preview.png draws the piece as a PNG: a postcard's front above its back, or a letter's first page.
// MCP create results also carry it as an image block, so the person sees the card inside the chat.
// Drawn with Satori (layout → SVG) and resvg (SVG → PNG): no headless browser, so it fits the 512 MB instance.
// It mirrors frontMarkup/postcardBack/letterPages in render.ts at 96 px per inch; the HTML preview_url stays the
// exact print preview, and this image is a faithful picture of it, not the print file. Keep the two in step.
import { readFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { isLetter, postcardSpec } from "./config.ts";
import { pool } from "./db.ts";
import type { OrderRow } from "./orders.ts";
import { postcardLayout, THEMES } from "./render.ts";

const font = (f: string) => readFileSync(new URL(`../assets/fonts/${f}`, import.meta.url));
const FONTS = [
  { name: "Caveat", data: font("caveat-600.ttf"), weight: 600 as const, style: "normal" as const },
  { name: "Source Serif 4", data: font("sourceserif4-400.ttf"), weight: 400 as const, style: "normal" as const },
  { name: "Source Serif 4", data: font("sourceserif4-600.ttf"), weight: 600 as const, style: "normal" as const },
  { name: "Inter", data: font("inter-400.ttf"), weight: 400 as const, style: "normal" as const },
  { name: "Inter", data: font("inter-600.ttf"), weight: 600 as const, style: "normal" as const },
];
const HEAD: Record<string, string> = { serif: "Source Serif 4", sans: "Inter", script: "Caveat" };
const MSG: Record<string, string> = { handwriting: "Caveat", serif: "Source Serif 4", sans: "Inter" };

const PX = 96; // CSS px per inch, the unit render.ts uses
type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({ type, props: { style, children, ...extra } });
const div = (style: Record<string, unknown>, children?: unknown) => el("div", { display: "flex", ...style }, children);

// Images become data URIs here, with a timeout, so a slow or missing photo can't hang or break the render.
async function dataUri(u: string): Promise<string | null> {
  try {
    if (u.startsWith("/images/")) {
      const { rows } = await pool.query("SELECT mime, bytes FROM images WHERE id = $1", [u.slice(8)]);
      return rows[0] ? `data:${rows[0].mime};base64,${Buffer.from(rows[0].bytes).toString("base64")}` : null;
    }
    const res = await fetch(u, { signal: AbortSignal.timeout(5000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpe?g|webp|gif)/.test(type)) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}
const photo = (src: string | null, w: number, h: number) =>
  src ? el("img", { width: w, height: h, objectFit: "cover" }, undefined, { src, width: w, height: h }) : div({ width: w, height: h, background: "#d9d6cf" });

async function front(c: Record<string, any>, wIn: number, hIn: number): Promise<Node> {
  const w = wIn * PX, h = hIn * PX, big = hIn >= 6;
  const layout = postcardLayout(c);
  const abs = (x: number, y: number, bw: number, bh: number, child: unknown) => div({ position: "absolute", left: x, top: y, width: bw, height: bh, overflow: "hidden" }, child);
  if (layout === "collage") {
    const pics = await Promise.all(((c.front_images ?? []) as string[]).slice(0, 4).map(dataUri));
    const g = 0.06 * PX, half = (len: number) => (len - g) / 2;
    const cells: [number, number, number, number][] =
      pics.length === 2 ? [[0, 0, half(w), h], [half(w) + g, 0, half(w), h]]
      : pics.length === 3 ? (() => { const lw = (w - g) * 0.58, rw = w - g - lw; return [[0, 0, lw, h], [lw + g, 0, rw, half(h)], [lw + g, half(h) + g, rw, half(h)]] as [number, number, number, number][]; })()
      : [[0, 0, half(w), half(h)], [half(w) + g, 0, half(w), half(h)], [0, half(h) + g, half(w), half(h)], [half(w) + g, half(h) + g, half(w), half(h)]];
    return div({ position: "relative", width: w, height: h, background: "#fff" }, pics.map((p, k) => abs(...cells[k], photo(p, cells[k][2], cells[k][3]))));
  }
  if (layout === "photo" || layout === "photo_caption") {
    const kids: unknown[] = [abs(0, 0, w, h, photo(await dataUri(c.front_image_url), w, h))];
    if (layout === "photo_caption" && c.caption) {
      const band = (big ? 1.35 : 1.0) * PX, pad = (big ? 0.5 : 0.36) * PX;
      kids.push(div({ position: "absolute", left: 0, top: h - band, width: w, height: band, background: "rgba(0,0,0,0.42)" }));
      kids.push(div({ position: "absolute", left: pad, top: h - band, width: w - 2 * pad, height: band - (big ? 0.32 : 0.24) * PX, alignItems: "flex-end", color: "#fff", fontFamily: HEAD[c.headline_font ?? "serif"], fontWeight: 600, fontSize: c.headline_font === "script" ? (big ? 44 : 32) : big ? 34 : 24, lineHeight: 1.1 }, String(c.caption)));
    }
    return div({ position: "relative", width: w, height: h, overflow: "hidden" }, kids);
  }
  const [bg, fg] = THEMES[c.front_theme ?? "ink"] ?? THEMES.ink;
  const size = c.headline_font === "script" ? (big ? 58 : 44) : big ? 46 : 34;
  return div({ width: w, height: h, background: bg, color: fg, alignItems: "center", justifyContent: "center", textAlign: "center", padding: 0.6 * PX, fontFamily: HEAD[c.headline_font ?? "serif"], fontWeight: 600, fontSize: size, lineHeight: 1.1 }, String(c.front_headline ?? ""));
}

const addrLines = (a: Record<string, any>) => [a.name, a.company, a.line1, a.line2, `${a.city}, ${a.state} ${a.zip}`].filter(Boolean).map(String);
const lines = (xs: string[], style: Record<string, unknown>) => div({ flexDirection: "column", ...style }, xs.map((t) => div({}, t)));
const paras = (text: string, style: Record<string, unknown>, gap: number) =>
  div({ flexDirection: "column", ...style }, text.split(/\n{2,}/).filter(Boolean).map((p) => div({ marginBottom: gap, whiteSpace: "pre-wrap" }, p)));

function back(o: OrderRow, wIn: number, hIn: number): Node {
  const w = wIn * PX, h = hIn * PX, pad = 0.3 * PX;
  const c = o.content as Record<string, any>;
  return div({ width: w, height: h, background: "#fff", color: "#1b1b1b", padding: pad, gap: 0.25 * PX }, [
    div({ flex: 1, overflow: "hidden", borderRight: "1px solid #ccc", paddingRight: 0.2 * PX }, paras(String(c.message ?? ""), { fontFamily: MSG[c.message_font ?? "handwriting"] ?? "Caveat", fontSize: c.message_font === "handwriting" || !c.message_font ? 17 : 13, lineHeight: 1.45 }, 8)),
    div({ flex: 1, flexDirection: "column", position: "relative", fontFamily: "Inter" }, [
      div({ position: "absolute", top: 0, right: 0, width: 0.8 * PX, height: 0.9 * PX, border: "1px dashed #999", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 9, color: "#777" }, "USPS FIRST-CLASS"),
      lines(addrLines(o.from_address), { fontSize: 9, color: "#444", maxWidth: "55%", lineHeight: 1.4 }),
      lines(addrLines(o.to_address), { position: "absolute", left: 0, top: "46%", fontSize: 13, lineHeight: 1.4 }),
    ]),
  ]);
}

function letter(o: OrderRow): Node {
  const c = o.content as Record<string, any>;
  const serif = c.font !== "sans";
  const date = new Date(o.created_at ?? Date.now()).toLocaleDateString("en-US", { dateStyle: "long" });
  const window = div({ flexDirection: "column", fontFamily: "Inter", fontSize: 13, lineHeight: 1.35, marginBottom: 0.4 * PX, minHeight: 1.6 * PX }, [
    lines(addrLines(o.from_address), {}), div({ height: 18 }), lines(addrLines(o.to_address), {}),
  ]);
  const body = c.pdf_url
    ? [div({ color: "#666", fontFamily: "Inter", fontSize: 13 }, `Address page, added automatically. Your document follows (${Number(c.pdf_pages ?? 1)} page${Number(c.pdf_pages ?? 1) === 1 ? "" : "s"}${c.color ? ", in color" : ", black and white"}).`)]
    : [div({ marginBottom: 0.3 * PX }, date), paras(String(c.body ?? ""), {}, 16)];
  return div({ flexDirection: "column", width: 8.5 * PX, height: 11 * PX, overflow: "hidden", background: "#fff", color: "#1b1b1b", padding: `${0.75 * PX}px ${1 * PX}px`, fontFamily: serif ? "Source Serif 4" : "Inter", fontSize: 16, lineHeight: 1.5 }, [window, ...body]);
}

// The whole picture: postcard front over back, or the letter's first page, on the preview page's grey.
export async function previewPng(o: OrderRow, widthPx = 1200): Promise<Buffer> {
  const gap = 24;
  let tree: Node, w: number, h: number;
  if (isLetter(o.product)) {
    w = 8.5 * PX + 2 * gap; h = 11 * PX + 2 * gap;
    tree = div({ width: w, height: h, background: "#e9e7e2", padding: gap }, letter(o));
  } else {
    const { w: wi, h: hi } = postcardSpec(o.product);
    w = wi * PX + 2 * gap; h = 2 * hi * PX + 3 * gap;
    tree = div({ flexDirection: "column", width: w, height: h, background: "#e9e7e2", padding: gap, gap }, [await front(o.content as Record<string, any>, wi, hi), back(o, wi, hi)]);
  }
  const svg = await satori(tree as never, { width: w, height: h, fonts: FONTS });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: widthPx } }).render().asPng());
}
