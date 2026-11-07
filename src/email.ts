import { BASE_URL, BRAND, EXTRA_SERVICE, PRODUCTS, SUPPORT_EMAIL, env, isLetter } from "./config.ts";
import { pool } from "./db.ts";
import { senderKey, type OrderRow } from "./orders.ts";

// Status emails to the person who ordered (Ryan, 2026-10-31: the first real customers paid and then heard nothing).
// Three moments: paid (one email per checkout, so a group of 25 gets one), mailed (per piece, with USPS tracking for
// certified), refunded (with the operator's reason). Sent through Resend from our own domain; without RESEND_API_KEY
// they're only logged. Never put the letter or card text in an email: it's the customer's mail, and we don't quote it.
// `customer_emails` makes each one send at most once, because Stripe's webhook and the success redirect race.

// "unpaid" (Ryan, 2026-11-05, after a Cursor order sat unpaid): ONE reminder per order (or per group) an hour after it was
// created and still not paid, sent by startUnpaidReminders below. Never repeated.
// "payment_failed" (Ryan, 2026-11-07, after Stripe flagged a payment): sent by hand from the admin order page when Stripe did
// NOT take the money. Deliberately no names, addresses or product: only the order number (Ryan: "just the order").
type Kind = "paid" | "mailed" | "refunded" | "unpaid" | "payment_failed";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const orderUrl = (id: string) => `${BASE_URL}/o/${id}`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function pieceName(o: OrderRow) {
  const name = PRODUCTS[o.product].name;
  return name.toLowerCase().startsWith("certified") ? name.charAt(0).toLowerCase() + name.slice(1) : name.toLowerCase();
}
// "letter" / "postcard", for sentences like "Your letter is on its way".
const noun = (o: OrderRow) => (isLetter(o.product) ? "letter" : "postcard");

// Layout (Ryan, 2026-11-07: modelled on Vercel's billing emails): white card on a light grey page, the logo mark,
// a short bold heading, plain paragraphs, "Label: value" fact lines, an optional bulleted list, one black button
// and an optional "Or …" text link, then a small grey footer. Table-based with inline styles only: Gmail strips
// <style> blocks. The logo is a hosted PNG (alt text "Sendpaper" when images are blocked).
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const LINK = "color:#0f7a52;text-decoration:underline";
type Block = string; // already-rendered <tr> rows, from the helpers below
const para = (html: string): Block => `<tr><td style="padding:0 0 16px;font:14px/1.6 ${FONT};color:#111111">${html}</td></tr>`;
const facts = (rows: [string, string][]): Block =>
  rows.map(([k, v], i) => `<tr><td style="padding:0 0 ${i === rows.length - 1 ? 16 : 6}px;font:14px/1.6 ${FONT};color:#111111"><b>${k}:</b> ${v}</td></tr>`).join("");
const list = (title: string, items: string[]): Block =>
  `<tr><td style="padding:0 0 6px;font:600 14px/1.6 ${FONT};color:#111111">${title}</td></tr>
<tr><td style="padding:0 0 16px"><table role="presentation" cellpadding="0" cellspacing="0">${items
    .map((it) => `<tr><td valign="top" style="padding:0 8px 4px 2px;font:14px/1.6 ${FONT};color:#111111">&#8226;</td><td style="padding:0 0 4px;font:14px/1.6 ${FONT};color:#111111">${it}</td></tr>`)
    .join("")}</table></td></tr>`;

function layout(heading: string, blocks: (Block | string)[], button?: { href: string; label: string }, secondary?: string) {
  // Plain strings are paragraphs; helper output (starting with <tr>) is used as is.
  const body = blocks.map((b) => (b.startsWith("<tr>") ? b : para(b))).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #eaeaea;border-radius:8px">
<tr><td style="padding:36px 40px 0"><img src="https://docs.sendmypaper.com/logo/icon-512.png" width="28" height="28" alt="${esc(BRAND)}" style="display:block;border:0;border-radius:6px"></td></tr>
<tr><td style="padding:28px 40px 20px;font:600 22px/1.3 ${FONT};color:#111111">${heading}</td></tr>
<tr><td style="padding:0 40px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table></td></tr>
${button ? `<tr><td style="padding:8px 40px ${secondary ? 16 : 32}px"><a href="${button.href}" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;font:600 14px ${FONT};padding:11px 18px;border-radius:6px">${esc(button.label)}</a></td></tr>` : ""}
${secondary ? `<tr><td style="padding:0 40px 32px;font:14px/1.6 ${FONT};color:#111111">${secondary}</td></tr>` : ""}
<tr><td style="padding:0 40px"><div style="border-top:1px solid #eaeaea;font-size:0;line-height:0">&nbsp;</div></td></tr>
<tr><td style="padding:20px 40px 36px;font:12px/1.7 ${FONT};color:#666666">Questions about this order? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}" style="color:#666666;text-decoration:underline">${SUPPORT_EMAIL}</a>.<br>
You're getting this because you placed an order on ${esc(BRAND)}. We never put the words of your mail in an email.<br>
&copy; ${new Date().getFullYear()} ${esc(BRAND)} &middot; <a href="${BASE_URL}" style="color:#666666;text-decoration:underline">${BASE_URL.replace(/^https?:\/\//, "")}</a></td></tr>
</table></td></tr></table>`;
}

const toText = (html: string) =>
  html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, "$2 ($1)")
    .replace(/<\/(td|tr|p)>/g, "\n")
    .replace(/<br>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, " ").replace(/&middot;/g, "·").replace(/&copy;/g, "©").replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export function composeEmail(kind: Kind, o: OrderRow, group: OrderRow[] = [o]) {
  const to = esc(o.to_address.name);
  const certified = Boolean(EXTRA_SERVICE[o.product]);
  if (kind === "payment_failed") {
    return {
      subject: `Your ${BRAND} payment didn't go through`,
      html: layout("Your payment didn't go through.", [
        `We couldn't complete the payment for your ${esc(BRAND)} order <b>${esc(o.id)}</b>, so it hasn't been printed or mailed, and you haven't been charged.`,
        `If you'd still like to send it, you can place the order again. If the payment fails again, try a different card, or reply to this email and we'll help.`,
      ], { href: `${BASE_URL}/send`, label: "Place the order again" }),
    };
  }
  if (kind === "unpaid") {
    const many = group.length > 1;
    const total = group.reduce((t, x) => t + x.price_cents, 0);
    const what = many ? `${group.length} ${noun(o)}s` : `${pieceName(o)} to <b>${to}</b>`;
    const href = many && o.batch_id ? `${BASE_URL}/b/${o.batch_id}` : orderUrl(o.id);
    return {
      subject: many ? `Your ${group.length} ${noun(o)}s haven't been sent yet` : `Your ${noun(o)} to ${o.to_address.name} hasn't been sent yet`,
      html: layout(`Your ${many ? `${noun(o)}s are` : `${noun(o)} is`} ready, but not paid for yet.`, [
        `You started ${many ? "" : "a "}${what} on ${esc(BRAND)}, but ${many ? "they haven't" : "it hasn't"} been paid for, so nothing has been printed or mailed.`,
        `If you still want to send ${many ? "them" : "it"}, check the print preview and pay on your order page (${money(total)}, printing and postage included).`,
        `Changed your mind? You don't need to do anything. This is the only reminder we'll send about ${many ? "these" : "this order"}.`,
      ], { href, label: "Review and pay" }),
    };
  }
  if (kind === "paid") {
    const many = group.length > 1;
    const total = group.reduce((t, x) => t + x.price_cents, 0);
    const href = many && o.batch_id ? `${BASE_URL}/b/${o.batch_id}` : orderUrl(o.id);
    const mailing = certified
      ? `USPS Certified Mail, with a tracking number${o.product.endsWith("_rr") ? " and return receipt" : ""}`
      : o.express ? "USPS Priority Mail (express), usually 2–3 days" : "USPS First-Class, usually 1–5 business days after mailing";
    const place = (x: OrderRow) => [x.to_address.city, x.to_address.state].filter(Boolean).map((s) => esc(String(s))).join(", ");
    const pieces = group.slice(0, 25).map((x) => `<a href="${orderUrl(x.id)}" style="${LINK}">${esc(x.to_address.name)}</a>&nbsp; ${place(x)}`);
    return {
      subject: many ? `We've got your ${group.length} ${noun(o)}s` : `We've got your ${noun(o)} to ${o.to_address.name}`,
      html: layout(
        "Payment received",
        [
          `Hello, ${esc(o.from_address.name)}.`,
          `Thanks, we've got your payment for ${many ? `<b>${group.length} ${noun(o)}s</b>` : `your <b>${esc(pieceName(o))}</b>`}.`,
          facts([
            ["Amount paid", `${money(total)} USD`],
            ["Mailing", mailing],
            ["Order", many && o.batch_id ? esc(o.batch_id) : esc(o.id)],
          ]),
          list("Going to", pieces),
          `A person at ${esc(BRAND)} checks every piece before it's printed, usually within <b>one business day</b>. We'll email you again when it's in the mail.`,
        ],
        { href, label: many ? "View your orders" : "View your order" },
        `Or <a href="${many && o.batch_id ? href : `${orderUrl(o.id)}/preview`}" style="${LINK}">see exactly what will print</a>.`,
      ),
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
        `${o.express ? "Express mail usually arrives in 2–3 days" : "First-Class mail usually arrives in 1–5 business days"}, though USPS doesn't guarantee delivery times.`,
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
    body: JSON.stringify({
      from: env.customerEmailFrom,
      to: [to],
      ...(env.customerEmailBcc && env.customerEmailBcc !== to ? { bcc: [env.customerEmailBcc] } : {}),
      reply_to: SUPPORT_EMAIL,
      subject,
      html,
      text: toText(html),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body.message ?? "unknown error"}`);
  return { id: body.id ?? null, skipped: false };
}

// Admin button "Send me a test payment email" (2026-11-07): the real "paid" template with SAMPLE data (not a real
// order, so its links 404), sent to NOTIFY_EMAIL with a [TEST] subject. Exists so a template change can be checked
// in a real inbox without placing an order, and without the Resend key ever leaving Render.
export async function sendTestEmail(kind: Kind = "paid") {
  if (!env.notifyEmail) throw new Error("NOTIFY_EMAIL is not set");
  const sample = {
    id: "ord_test7k2m9q4x8p", product: "letter_certified", price_cents: 1499, express: false, batch_id: null, tracking_number: null, operator_note: null,
    to_address: { name: "Dana Kim", line1: "12 Oak St", city: "Austin", state: "TX", zip: "78701" },
    from_address: { name: "Test Customer", line1: "1 Test St", city: "New York", state: "NY", zip: "10001" }, content: {},
  } as unknown as OrderRow;
  const { subject, html } = composeEmail(kind, sample);
  return { to: env.notifyEmail, ...(await send(env.notifyEmail, `[TEST] ${subject}`, html)) };
}

// Called after a status change. Never throws: an email problem must not undo or block the status change.
export async function emailCustomer(kind: Kind, o: OrderRow) {
  try {
    if (!o.customer_email || o.is_test) return;
    // One "paid" (and one "unpaid") email per checkout: a group shares one checkout, so only the first one sends.
    const perGroup = (kind === "paid" || kind === "unpaid") && o.batch_id;
    const key = perGroup ? `${kind}:${o.batch_id}` : `${kind}:${o.id}`;
    const claim = await pool.query(
      `INSERT INTO customer_emails (key, order_id, kind, to_email) VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO NOTHING RETURNING key`,
      [key, o.id, kind, o.customer_email],
    );
    if (!claim.rowCount) return;
    const group = perGroup
      ? (await pool.query<OrderRow>(`SELECT * FROM orders WHERE batch_id = $1 ${kind === "unpaid" ? "AND status = 'awaiting_payment'" : ""} ORDER BY created_at`, [o.batch_id])).rows
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
    `SELECT kind, to_email, sent_at, resend_id, error FROM customer_emails WHERE order_id = $1 OR key = ANY($2) ORDER BY sent_at`,
    [o.id, o.batch_id ? [`paid:${o.batch_id}`, `unpaid:${o.batch_id}`] : []],
  );
  return rows;
}

// Unpaid-order reminders (Ryan, 2026-11-05). Every 10 minutes: orders still awaiting payment 1–48 hours after they were
// created get ONE reminder (per order, or per group). Skipped when the same email or the same return address has paid for
// a later order (people often re-create an order and pay that one: seen 2026-11-04), for test orders and orders without
// an email. The 48-hour cap means turning this on never mails people about old abandoned orders. Off without RESEND_API_KEY,
// so a local or keyless run doesn't record "skipped" rows that would block the real reminder later.
export async function unpaidCandidates(now = new Date()) {
  const { rows } = await pool.query<OrderRow>(
    `SELECT DISTINCT ON (COALESCE(o.batch_id, o.id)) o.* FROM orders o
      WHERE o.status = 'awaiting_payment' AND NOT o.is_test AND o.customer_email IS NOT NULL
        AND o.created_at < $1::timestamptz - interval '1 hour' AND o.created_at > $1::timestamptz - interval '48 hours'
        AND NOT EXISTS (SELECT 1 FROM customer_emails c WHERE c.key = 'unpaid:' || COALESCE(o.batch_id, o.id))
      ORDER BY COALESCE(o.batch_id, o.id), o.created_at`,
    [now.toISOString()],
  );
  if (!rows.length) return [];
  const { rows: paid } = await pool.query<OrderRow>(
    `SELECT * FROM orders WHERE status IN ('paid', 'printing', 'mailed') AND NOT is_test AND created_at > $1::timestamptz - interval '72 hours'`,
    [now.toISOString()],
  );
  return rows.filter((o) => !paid.some((p) =>
    new Date(p.created_at) > new Date(o.created_at) &&
    ((p.customer_email && p.customer_email.toLowerCase() === o.customer_email!.toLowerCase()) || senderKey(p.from_address) === senderKey(o.from_address))));
}

export function startUnpaidReminders() {
  if (!env.resendKey) return;
  const tick = async () => {
    for (const o of await unpaidCandidates()) await emailCustomer("unpaid", o);
  };
  setTimeout(() => tick().catch(console.error), 60 * 1000).unref();
  setInterval(() => tick().catch(console.error), 10 * 60 * 1000).unref();
}
