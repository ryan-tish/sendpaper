import { BASE_URL, BRAND, EXTRA_SERVICE, PRODUCTS, SUPPORT_EMAIL, env, isLetter } from "./config.ts";
import { pool } from "./db.ts";
import type { OrderRow } from "./orders.ts";

// Status emails to the person who ordered (Ryan, 2026-10-31: the first real customers paid and then heard nothing).
// Three moments: paid (one email per checkout, so a group of 25 gets one), mailed (per piece, with USPS tracking for
// certified), refunded (with the operator's reason). Sent through Resend from our own domain; without RESEND_API_KEY
// they're only logged. Never put the letter or card text in an email: it's the customer's mail, and we don't quote it.
// `customer_emails` makes each one send at most once, because Stripe's webhook and the success redirect race.

type Kind = "paid" | "mailed" | "refunded";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const orderUrl = (id: string) => `${BASE_URL}/o/${id}`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function pieceName(o: OrderRow) {
  const name = PRODUCTS[o.product].name;
  return name.toLowerCase().startsWith("certified") ? name.charAt(0).toLowerCase() + name.slice(1) : name.toLowerCase();
}
// "letter" / "postcard", for sentences like "Your letter is on its way".
const noun = (o: OrderRow) => (isLetter(o.product) ? "letter" : "postcard");

// Table-based with inline styles only: Gmail strips <style> blocks.
function layout(heading: string, paragraphs: string[], button?: { href: string; label: string }) {
  const p = (html: string) => `<tr><td style="padding:0 0 14px;font:15px/1.55 Arial,Helvetica,sans-serif;color:#1a1f1c">${html}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f5;padding:24px 0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e3e6e2;border-radius:12px">
<tr><td style="padding:28px 28px 8px;font:600 13px Arial,Helvetica,sans-serif;color:#0f7a52;letter-spacing:.02em">${esc(BRAND)}</td></tr>
<tr><td style="padding:0 28px 16px;font:600 22px/1.3 Arial,Helvetica,sans-serif;color:#0d1512">${heading}</td></tr>
<tr><td style="padding:0 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${paragraphs.map(p).join("")}</table></td></tr>
${button ? `<tr><td style="padding:4px 28px 24px"><a href="${button.href}" style="display:inline-block;background:#0d1512;color:#ffffff;text-decoration:none;font:600 14px Arial,Helvetica,sans-serif;padding:12px 18px;border-radius:8px">${esc(button.label)}</a></td></tr>` : ""}
<tr><td style="padding:16px 28px 24px;border-top:1px solid #e3e6e2;font:13px/1.5 Arial,Helvetica,sans-serif;color:#5b635e">Questions? Just reply to this email, or write to <a href="mailto:${SUPPORT_EMAIL}" style="color:#0f7a52">${SUPPORT_EMAIL}</a>.</td></tr>
</table></td></tr></table>`;
}

const toText = (html: string) =>
  html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, "$2 ($1)")
    .replace(/<\/(td|tr|p)>/g, "\n")
    .replace(/<br>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export function composeEmail(kind: Kind, o: OrderRow, group: OrderRow[] = [o]) {
  const to = esc(o.to_address.name);
  const certified = Boolean(EXTRA_SERVICE[o.product]);
  if (kind === "paid") {
    const many = group.length > 1;
    const total = group.reduce((t, x) => t + x.price_cents, 0);
    const what = many ? `${group.length} ${noun(o)}s` : `your ${pieceName(o)} to ${to}`;
    const href = many && o.batch_id ? `${BASE_URL}/b/${o.batch_id}` : orderUrl(o.id);
    return {
      subject: many ? `We've got your ${group.length} ${noun(o)}s` : `We've got your ${noun(o)} to ${o.to_address.name}`,
      html: layout(`Thanks, your ${many ? `${noun(o)}s are` : `${noun(o)} is`} paid.`, [
        `We've received your payment of <b>${money(total)}</b> for ${what}.`,
        `What happens next: a person at ${esc(BRAND)} checks every piece before it's printed, usually within one business day. Then it's printed and mailed by USPS First-Class${certified ? " as Certified Mail, with a tracking number" : ""}${o.express ? " (express: USPS Priority Mail)" : ""}. We'll email you again when it's in the mail.`,
        `You can see the exact print preview and follow the status at any time on your order page.`,
      ], { href, label: many ? "View your orders" : "View your order" }),
    };
  }
  if (kind === "mailed") {
    const tracking = o.tracking_number
      ? `USPS tracking number: <b>${esc(o.tracking_number)}</b>. <a href="https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(o.tracking_number)}" style="color:#0f7a52">Track it on usps.com</a>.`
      : certified
        ? `Your USPS tracking number will appear on your order page once USPS assigns it.`
        : "";
    return {
      subject: `Your ${noun(o)} to ${o.to_address.name} is in the mail`,
      html: layout(`Your ${noun(o)} is in the mail.`, [
        `Your ${pieceName(o)} to <b>${to}</b> has been printed and handed over for mailing.`,
        `${o.express ? "Express mail usually arrives in 2–3 days" : "First-Class mail usually arrives in 3–5 business days"}, though USPS doesn't guarantee delivery times.`,
        ...(tracking ? [tracking] : []),
      ], { href: orderUrl(o.id), label: "View your order" }),
    };
  }
  const reason = o.operator_note ? `Reason: ${esc(o.operator_note)}` : "";
  return {
    subject: `Your ${noun(o)} to ${o.to_address.name} wasn't sent, and you've been refunded`,
    html: layout(`We've refunded your order.`, [
      `We weren't able to send your ${pieceName(o)} to <b>${to}</b>, so we've refunded <b>${money(o.price_cents)}</b> to your original payment method. Nothing was printed or mailed.`,
      ...(reason ? [reason] : []),
      `Refunds usually show up within 5–10 business days, depending on your bank.`,
    ], { href: orderUrl(o.id), label: "View your order" }),
  };
}

async function send(to: string, subject: string, html: string) {
  if (!env.resendKey) return { id: null, skipped: true };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.customerEmailFrom, to: [to], reply_to: SUPPORT_EMAIL, subject, html, text: toText(html) }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body.message ?? "unknown error"}`);
  return { id: body.id ?? null, skipped: false };
}

// Called after a status change. Never throws: an email problem must not undo or block the status change.
export async function emailCustomer(kind: Kind, o: OrderRow) {
  try {
    if (!o.customer_email || o.is_test) return;
    // One "paid" email per checkout: a group's orders are marked paid one by one, and only the first one sends.
    const key = kind === "paid" && o.batch_id ? `paid:${o.batch_id}` : `${kind}:${o.id}`;
    const claim = await pool.query(
      `INSERT INTO customer_emails (key, order_id, kind, to_email) VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO NOTHING RETURNING key`,
      [key, o.id, kind, o.customer_email],
    );
    if (!claim.rowCount) return;
    const group = kind === "paid" && o.batch_id
      ? (await pool.query<OrderRow>(`SELECT * FROM orders WHERE batch_id = $1 ORDER BY created_at`, [o.batch_id])).rows
      : [o];
    const { subject, html } = composeEmail(kind, o, group);
    try {
      const r = await send(o.customer_email, subject, html);
      await pool.query(`UPDATE customer_emails SET resend_id = $2, error = $3 WHERE key = $1`, [key, r.id, r.skipped ? "skipped: RESEND_API_KEY not set" : null]);
      console.log(`email ${kind} ${o.id}${r.skipped ? " (skipped, no RESEND_API_KEY)" : ` sent ${r.id}`}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await pool.query(`UPDATE customer_emails SET error = $2 WHERE key = $1`, [key, message]);
      console.error(`email ${kind} ${o.id} failed:`, message);
    }
  } catch (e) {
    console.error(`email ${kind} ${o.id} failed before sending:`, e);
  }
}

// For /admin: what was emailed for this order (and its group's paid email).
export async function emailsFor(o: OrderRow) {
  const { rows } = await pool.query<{ kind: string; to_email: string; sent_at: Date; resend_id: string | null; error: string | null }>(
    `SELECT kind, to_email, sent_at, resend_id, error FROM customer_emails WHERE order_id = $1 OR key = $2 ORDER BY sent_at`,
    [o.id, o.batch_id ? `paid:${o.batch_id}` : ""],
  );
  return rows;
}
