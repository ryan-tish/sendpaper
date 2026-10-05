// Letters from a customer's own PDF (Ryan, 2026-10-05: "support the PDF upload option").
// PostGrid prints PDFs only at exactly 8.5×11 in (it rejects A4 with "incorrect page dimensions"), so every PDF is
// normalized here: each page is scaled to fit a US Letter page, centered, keeping its aspect ratio. We store our own
// normalized copy, so what prints is exactly what the customer previewed even if their original link changes.
// PostGrid adds a blank first page for the addresses (addressPlacement: insert_blank_page), so the document itself
// needs no empty space at the top.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { PDFDocument } from "pdf-lib";
import { LIMITS } from "./config.ts";
import { pool } from "./db.ts";
import { newId } from "./orders.ts";

const LETTER = { w: 612, h: 792 }; // points

export class PdfError extends Error {}

const PRIVATE = [/^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^::1$/, /^f[cd]/i, /^fe80/i];

// Only public https hosts: the server fetches this URL, so it must never reach our own network.
async function assertPublicHttps(raw: string) {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new PdfError("The PDF link isn't a valid URL.");
  }
  if (u.protocol !== "https:") throw new PdfError("The PDF link must start with https://.");
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || isIP(host)) throw new PdfError("The PDF link must be on a public website.");
  const addrs = await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new PdfError("Couldn't reach the PDF link's website.");
  if (addrs.some((a) => PRIVATE.some((re) => re.test(a.address)))) throw new PdfError("The PDF link must be on a public website.");
}

async function fetchPdf(url: string): Promise<Buffer> {
  // Our own uploads (/files/… or a full link to them) are read straight from the database.
  const own = url.match(/^(?:https?:\/\/[^/]+)?\/files\/(file_[a-z0-9]+)$/);
  if (own) {
    const { rows } = await pool.query<{ bytes: Buffer }>("SELECT bytes FROM images WHERE id = $1 AND mime = 'application/pdf'", [own[1]]);
    if (!rows[0]) throw new PdfError("That uploaded PDF wasn't found. Upload it again.");
    return rows[0].bytes;
  }
  await assertPublicHttps(url);
  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res || !res.ok) throw new PdfError(`Couldn't download the PDF (${res ? `HTTP ${res.status}` : "no response"}). Make sure the link is public.`);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > LIMITS.pdfBytes) throw new PdfError(`The PDF is over ${LIMITS.pdfBytes / 1024 / 1024} MB.`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > LIMITS.pdfBytes) throw new PdfError(`The PDF is over ${LIMITS.pdfBytes / 1024 / 1024} MB.`);
  return buf;
}

export async function normalizePdf(input: Buffer): Promise<{ bytes: Buffer; pages: number }> {
  if (input.subarray(0, 5).toString("latin1") !== "%PDF-") throw new PdfError("That file isn't a PDF.");
  let src: PDFDocument;
  try {
    src = await PDFDocument.load(input);
  } catch (e) {
    throw new PdfError(/encrypt/i.test(String(e)) ? "That PDF is password-protected. Save an unprotected copy and try again." : "That PDF couldn't be read. Try exporting it again.");
  }
  const count = src.getPageCount();
  if (count === 0) throw new PdfError("That PDF has no pages.");
  if (count > LIMITS.pdfPages) throw new PdfError(`That PDF has ${count} pages; the limit is ${LIMITS.pdfPages}.`);
  const out = await PDFDocument.create();
  const embedded = await out.embedPages(src.getPages());
  for (const p of embedded) {
    const s = Math.min(LETTER.w / p.width, LETTER.h / p.height);
    const w = p.width * s, h = p.height * s;
    out.addPage([LETTER.w, LETTER.h]).drawPage(p, { x: (LETTER.w - w) / 2, y: (LETTER.h - h) / 2, width: w, height: h });
  }
  return { bytes: Buffer.from(await out.save()), pages: count };
}

export async function storePdf(bytes: Buffer) {
  const id = newId("file");
  await pool.query("INSERT INTO images (id, mime, bytes) VALUES ($1, 'application/pdf', $2)", [id, bytes]);
  return `/files/${id}`;
}

// Turn whatever the customer gave us (an upload or a link) into our own normalized, stored copy. Our own /files/
// uploads were normalized when uploaded (POST /v1/files), so they're only counted, never copied again.
export async function materializePdf(url: string): Promise<{ url: string; pages: number }> {
  const own = url.match(/^(?:https?:\/\/[^/]+)?(\/files\/file_[a-z0-9]+)$/);
  if (own) {
    const doc = await PDFDocument.load(await fetchPdf(url)).catch(() => null);
    if (!doc) throw new PdfError("That uploaded PDF couldn't be read. Upload it again.");
    return { url: own[1], pages: doc.getPageCount() };
  }
  const { bytes, pages } = await normalizePdf(await fetchPdf(url));
  return { url: await storePdf(bytes), pages };
}

// Before creating a PDF letter: fetch, normalize and store the document, and record its page count.
export async function prepareLetterContent<T extends { pdf_url?: string; pdf_pages?: number }>(content: T): Promise<T> {
  if (!content.pdf_url) return content;
  const { url, pages } = await materializePdf(content.pdf_url);
  return { ...content, pdf_url: url, pdf_pages: pages };
}
