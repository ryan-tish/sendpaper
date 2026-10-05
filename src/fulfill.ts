// Print fulfilment through PostGrid (https://api.postgrid.com/print-mail/v1), added 2026-10-02.
// The operator approves a paid order in /admin; we send PostGrid print-ready HTML and the addresses,
// then poll PostGrid's status to move the order from printing to mailed.
//
// Layout rules learned by probing the API (test mode):
// - Postcards: PostGrid prints the return address, recipient and postage on the RIGHT half of the back.
//   Our back HTML may only use the left half. Pages include a 0.125in bleed (6.25x4.25 / 9.25x6.25 / 11.25x6.25).
// - Letters: PostGrid prints both addresses in the top ~2.75in of page 1 (addressPlacement top_first_page)
//   and adds no margins. Anything overlapping that area is auto-cancelled with
//   cancellation.reason = "invalid_content".
import { BASE_URL, BRAND, env, EXTRA_SERVICE, isLetter, postcardSpec } from "./config.ts";
import { pool } from "./db.ts";
import { getOrder, printsInColor, setStatus, type Address, type OrderRow } from "./orders.ts";
import { esc, frontMarkup, MESSAGE_FONTS } from "./render.ts";

const API = "https://api.postgrid.com/print-mail/v1";
export const postgridMode = () => (env.postgridKey.startsWith("live_") ? "live" : env.postgridKey ? "test" : "off");

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Inter:wght@400;600&display=swap" rel="stylesheet">`;

function contact(a: Address) {
  return {
    firstName: a.name,
    ...(a.company ? { companyName: a.company } : {}),
    addressLine1: a.line1,
    ...(a.line2 ? { addressLine2: a.line2 } : {}),
    city: a.city,
    provinceOrState: a.state,
    postalOrZip: a.zip,
    countryCode: "US",
  };
}

const absolute = (url: string) => (url.startsWith("/") ? `${BASE_URL}${url}` : url);

export function postcardHtml(o: OrderRow) {
  const spec = postcardSpec(o.product);
  const big = spec.h >= 6;
  const [w, h] = [spec.w + 0.25, spec.h + 0.25];
  const c = o.content;
  const page = `margin:0;padding:0;width:${w}in;height:${h}in;overflow:hidden;`;
  // Same layout code as the customer's preview, drawn at print size (trim + bleed) with absolute image URLs.
  const frontHTML = `<html><head>${FONTS}</head><body style="${page}">${frontMarkup(c, w, h, absolute)}</body></html>`;
  // Left half only; PostGrid owns the right half (addresses + postage).
  const msgWidth = w / 2 - 0.55;
  const handwriting = (c.message_font ?? "handwriting") === "handwriting";
  const font = MESSAGE_FONTS[c.message_font ?? "handwriting"] ?? MESSAGE_FONTS.handwriting;
  const backHTML = `<html><head>${FONTS}</head><body style="${page}"><div style="position:absolute;left:0.4in;top:0.4in;width:${msgWidth}in;height:${h - 0.8}in;overflow:hidden;font:${handwriting ? 500 : 400} ${handwriting ? (big ? 22 : 18) : big ? 16 : 13}px/${handwriting ? 1.3 : 1.45} ${font};color:#1b1b1b;white-space:pre-wrap;word-break:break-word">${esc(c.message)}</div></body></html>`;
  return { frontHTML, backHTML };
}

export function letterHtml(o: OrderRow) {
  const family = o.content.font === "sans" ? "Inter, Helvetica, Arial, sans-serif" : "'Source Serif 4', Georgia, serif";
  const date = new Date(o.created_at ?? Date.now()).toLocaleDateString("en-US", { dateStyle: "long" });
  const paras = String(o.content.body ?? "")
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 1em">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  // An optional photo sits under the date, at most 3in tall, inside the 6.5in text column (it prints in color).
  const photo = o.content.image_url
    ? `<img src="${esc(absolute(o.content.image_url))}" style="display:block;max-width:6.5in;max-height:3in;margin:0 auto 1.4em;object-fit:contain">`
    : "";
  // The 3.1in spacer keeps page 1 clear of PostGrid's address block; @page margins apply to later pages.
  return `<html><head>${FONTS}<style>@page{size:8.5in 11in;margin:0.75in 1in}body{margin:0;font:11.5pt/1.5 ${family};color:#1b1b1b}</style></head><body><div style="height:2.35in"></div><p style="margin:0 0 1.4em">${esc(date)}</p>${photo}${paras}</body></html>`;
}

async function pg(path: string, init: { method?: string; body?: unknown; idempotencyKey?: string } = {}) {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "x-api-key": env.postgridKey,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const body = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(body?.error?.message ?? body?.message ?? `PostGrid ${res.status}`);
  return body;
}

const kind = (o: OrderRow) => (isLetter(o.product) ? "letters" : "postcards");

async function recordPrint(id: string, fields: { print_id?: string; print_status?: string; print_error?: string | null }) {
  await pool.query(
    `UPDATE orders SET print_provider = 'postgrid', print_id = COALESCE($2, print_id), print_status = COALESCE($3, print_status), print_error = $4 WHERE id = $1`,
    [id, fields.print_id ?? null, fields.print_status ?? null, fields.print_error ?? null],
  );
}

// Operator-approved: create the PostGrid job. Idempotent per order, so a double click never prints twice.
export async function sendToPrint(o: OrderRow) {
  if (postgridMode() === "off") throw new Error("PostGrid isn't configured (POSTGRID_API_KEY).");
  if (o.status !== "paid") throw new Error(`Order is ${o.status}; only paid orders can be sent to print.`);
  const base = {
    to: contact(o.to_address),
    from: contact(o.from_address),
    description: `${BRAND} ${o.id}`,
    metadata: { order_id: o.id },
    // Express = USPS Priority Mail through PostGrid; certified letters always go First-Class (validated at order time).
    mailingClass: o.express && !EXTRA_SERVICE[o.product] ? "express" : "first_class",
  };
  const body =
    isLetter(o.product)
      ? {
          ...base,
          // A PDF letter prints the customer's own (normalized 8.5×11) document after a blank address page.
          ...(o.content.pdf_url
            ? { pdf: absolute(o.content.pdf_url), addressPlacement: "insert_blank_page" }
            : { html: letterHtml(o), addressPlacement: "top_first_page" }),
          // Only letters with a photo print in color (and carry the color surcharge).
          color: printsInColor(o.product, o.content),
          doubleSided: false,
          // USPS Certified Mail (with or without return receipt) for the certified letter products.
          ...(EXTRA_SERVICE[o.product] ? { extraService: EXTRA_SERVICE[o.product] } : {}),
        }
      : { ...base, size: postcardSpec(o.product).postgrid, ...postcardHtml(o) };
  const job = await pg(`/${kind(o)}`, { method: "POST", body, idempotencyKey: `sendpaper-${o.id}` });
  await recordPrint(o.id, { print_id: job.id, print_status: job.status, print_error: null });
  return setStatus(o.id, "printing", `sent to PostGrid (${postgridMode()}) ${job.id}`);
}

const MAILED = new Set(["processed_for_delivery", "completed"]);

// PostGrid's carrierTracking shape isn't documented in what we've seen (it's null in test mode), so accept the
// likely field names and fall back to the job's own trackingNumber.
function trackingNumber(job: any): string | null {
  const t = job?.carrierTracking;
  const v = (t && (t.trackingNumber ?? t.tracking_number ?? t.number ?? t.id)) ?? job?.trackingNumber ?? job?.tracking_number;
  return typeof v === "string" && /^[A-Z0-9]{10,40}$/i.test(v) ? v : null;
}

// Pull PostGrid's latest status. Moves printing → mailed, and surfaces cancellations (bad content, bad address).
export async function syncPrint(orderId: string) {
  const o = await getOrder(orderId);
  const printId = o?.print_id;
  if (!o || !printId || postgridMode() === "off") return o;
  const job = await pg(`/${kind(o)}/${printId}`);
  const err = job.status === "cancelled" ? `${job.cancellation?.reason ?? "cancelled"}: ${job.cancellation?.note ?? ""}`.trim() : null;
  await recordPrint(o.id, { print_status: job.status, print_error: err });
  // USPS tracking appears once the piece is accepted (certified letters always get one).
  const tracking = trackingNumber(job);
  if (tracking && tracking !== o.tracking_number) await pool.query("UPDATE orders SET tracking_number = $2 WHERE id = $1", [o.id, tracking]);
  if (o.status === "printing" && MAILED.has(job.status)) return setStatus(o.id, "mailed", `PostGrid ${job.status}`);
  return getOrder(o.id);
}

// The PDF proof PostGrid rendered (signed URL, short-lived, so fetch it fresh each time).
export async function printProofUrl(o: OrderRow): Promise<string | null> {
  const printId = o.print_id;
  if (!printId || postgridMode() === "off") return null;
  const job = await pg(`/${kind(o)}/${printId}`).catch(() => null);
  return job?.url ?? null;
}

// Free Render instances sleep, so this only runs while awake; opening /admin also syncs.
export function startPrintSync() {
  if (postgridMode() === "off") return;
  const tick = async () => {
    const { rows } = await pool.query("SELECT id FROM orders WHERE status = 'printing' AND print_id IS NOT NULL LIMIT 100");
    for (const r of rows) await syncPrint(r.id).catch((e) => console.error("print sync", r.id, e.message));
  };
  setInterval(() => tick().catch(console.error), 15 * 60 * 1000).unref();
}
