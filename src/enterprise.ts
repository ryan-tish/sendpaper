// Enterprise inquiries (Ryan, 2026-11-08). The pricing section's "Sending in bulk or every month?" band links to
// /enterprise. Nothing about volume pricing is automated: an inquiry is stored, Ryan is emailed, and he quotes by
// hand (a Stripe invoice or a one-off discount). Credits and a volume slider were considered and rejected for now.
// Agents can ask on behalf of their company with POST /v1/enterprise-inquiries (api.ts), using the same schema.
// No auto-reply goes to the address in the form: it would let anyone make us email any address.
import express, { Router } from "express";
import { z, type ZodError } from "zod";
import { BASE_URL, BRAND, SUPPORT_EMAIL, env } from "./config.ts";
import { pool } from "./db.ts";
import { page } from "./layout.ts";
import { newId } from "./orders.ts";
import { esc } from "./render.ts";
import { track } from "./analytics.ts";

export const VOLUMES = {
  few: "A few pieces a month",
  "10-100": "10 to 100 a month",
  "100-1000": "100 to 1,000 a month",
  "1000+": "More than 1,000 a month",
  "one-off": "One large send",
} as const;
export const KINDS = { letters: "Letters", certified: "Certified mail", postcards: "Postcards", marketing: "Marketing campaigns" } as const;
export const CHANNELS = {
  api: "From our app, through the API",
  agent: "Through an AI agent",
  list: "Upload a list of addresses",
  unsure: "Not sure yet",
} as const;
type Volume = keyof typeof VOLUMES;
type Kind = keyof typeof KINDS;
type Channel = keyof typeof CHANNELS;
const keysOf = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

export const InquirySchema = z.object({
  name: z.string().trim().min(1, "Add your name").max(120).describe("Your full name"),
  email: z.string().trim().max(200).email("Add a valid email address").describe("Work email; a person replies here"),
  company: z.string().trim().max(160).optional().describe("Company or organization, if any"),
  volume: z.enum(keysOf(VOLUMES), "Choose how much you send").describe("How much you send: few, 10-100, 100-1000, 1000+ (a month) or one-off"),
  kinds: z
    .array(z.enum(keysOf(KINDS)))
    .max(4)
    .optional()
    .transform((k) => (k ? [...new Set(k)] : []))
    .describe("What you'll send: any of letters, certified, postcards, marketing"),
  channel: z.enum(keysOf(CHANNELS)).optional().describe("How you'd like to send: api, agent, list or unsure"),
  message: z.string().trim().max(4000).optional().describe("Anything else: what you send, how often, deadlines"),
});
export type Inquiry = z.infer<typeof InquirySchema>;

export type InquiryRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  volume: Volume;
  kinds: Kind[];
  channel: Channel | null;
  message: string | null;
  source: "web" | "api";
  client: string | null;
  handled_at: Date | null;
  created_at: Date;
};

// The web form posts urlencoded fields: empty strings mean "not given", and repeated `kind` boxes arrive as an array.
export function fromForm(body: Record<string, unknown>) {
  const s = (k: string) => (typeof body[k] === "string" && (body[k] as string).trim() ? (body[k] as string) : undefined);
  const kinds = ([] as unknown[]).concat(body.kind ?? []).filter((x): x is string => typeof x === "string");
  return {
    name: s("name") ?? "",
    email: s("email") ?? "",
    company: s("company"),
    volume: s("volume"),
    kinds: kinds.length ? kinds : undefined,
    channel: s("channel"),
    message: s("message"),
  };
}

// First message per field, keyed by the field name, for the form and for API callers.
export function fieldErrors(e: ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) {
    const k = String(i.path[0] ?? "form");
    out[k] ??= i.message;
  }
  return out;
}

// At most 5 inquiries an hour from one IP (in memory: resets on deploy, which is fine for spam control).
const hits = new Map<string, number[]>();
export function allowInquiry(key: string, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 3_600_000);
  const ok = recent.length < 5;
  if (ok) recent.push(now);
  if (hits.size > 5000) hits.clear();
  hits.set(key, recent);
  return ok;
}

export async function createInquiry(i: Inquiry, meta: { source: "web" | "api"; client?: string }) {
  const { rows } = await pool.query<InquiryRow>(
    `INSERT INTO inquiries (id, name, email, company, volume, kinds, channel, message, source, client)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [newId("inq"), i.name, i.email, i.company ?? null, i.volume, i.kinds, i.channel ?? null, i.message ?? null, meta.source, meta.client ?? null],
  );
  const row = rows[0];
  track("enterprise_inquiry", `inquiry:${row.id}`, { volume: row.volume, kinds: row.kinds, channel: row.channel, source: row.source, client: row.client });
  notifyInquiry(row).catch((e) => console.error("inquiry email", e));
  return row;
}

export async function listInquiries() {
  const { rows } = await pool.query<InquiryRow>("SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 300");
  return rows;
}

export async function setInquiryHandled(id: string, handled: boolean) {
  await pool.query("UPDATE inquiries SET handled_at = CASE WHEN $2 THEN now() ELSE NULL END WHERE id = $1", [id, handled]);
}

const kindList = (k: Kind[]) => (k.length ? k.map((x) => KINDS[x] ?? x).join(", ") : "Not said");

// The alert to Ryan. Reply-To is the inquirer, so answering is one click. Every value is escaped: it's user input.
export function inquiryEmail(r: InquiryRow) {
  const facts: [string, string][] = [
    ["Name", r.name],
    ["Email", r.email],
    ["Company", r.company || "Not given"],
    ["Volume", VOLUMES[r.volume] ?? r.volume],
    ["Sends", kindList(r.kinds)],
    ["How", r.channel ? (CHANNELS[r.channel] ?? r.channel) : "Not said"],
    ["Came in via", r.source === "api" ? `API${r.client ? ` (${r.client})` : ""}` : "the /enterprise form"],
  ];
  const subject = `${BRAND}: enterprise inquiry from ${(r.company || r.name).replace(/[\r\n]+/g, " ").slice(0, 80)}`;
  const td = 'style="font-family:Arial,sans-serif;font-size:14px;padding:4px 12px 4px 0;vertical-align:top"';
  const html = `<table cellpadding="0" cellspacing="0" role="presentation">
${facts.map(([k, v]) => `<tr><td ${td}><b>${esc(k)}</b></td><td ${td}>${esc(v)}</td></tr>`).join("\n")}
<tr><td ${td}><b>Message</b></td><td ${td} style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${esc(r.message || "None")}</td></tr>
<tr><td colspan="2" style="font-family:Arial,sans-serif;font-size:14px;padding-top:16px">Reply to this email to answer them. <a href="${BASE_URL}/admin/inquiries">All inquiries in admin</a></td></tr>
</table>`;
  const text = `${facts.map(([k, v]) => `${k}: ${v}`).join("\n")}\nMessage: ${r.message || "None"}\n\nReply to this email to answer them. All inquiries: ${BASE_URL}/admin/inquiries`;
  return { subject, html, text };
}

async function notifyInquiry(r: InquiryRow) {
  console.log(`INQUIRY ${r.id} ${r.volume} via ${r.source}`); // no names or addresses in the logs
  if (!env.resendKey || !env.notifyEmail) return;
  const m = inquiryEmail(r);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.notifyFrom, to: [env.notifyEmail], reply_to: r.email, subject: m.subject, html: m.html, text: m.text }),
  });
  if (!res.ok) console.error("resend inquiry", res.status, await res.text());
}

const CHECK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const PERKS = [
  "Volume rates on postcards, letters and certified mail",
  "One monthly invoice instead of a checkout per order",
  "Marketing mail and campaigns welcome",
  "Help connecting your app, agent or system",
  "A person who knows your account",
];

const CSS = `
.ent-page { display: flex; flex-wrap: wrap; gap: 48px 64px; align-items: flex-start; padding-block: 80px 0; }
.ent-copy { flex: 1 1 360px; min-width: 0; display: grid; gap: 28px; }
.ent-copy .head { display: grid; gap: 14px; }
.ent-copy h1 { font-size: clamp(2.1rem, 4.4vw, 2.9rem); }
.ent-copy .head p { color: var(--soft); font-size: 1.08rem; }
.perks { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.perks li { display: flex; gap: 10px; align-items: flex-start; }
.perks svg { flex: none; margin-top: 4px; color: var(--green); }
.ent-copy .alt { color: var(--soft); font-size: .94rem; padding-top: 20px; border-top: 1px solid var(--rule); }
.ent-form { flex: 1 1 440px; min-width: 0; display: grid; gap: 18px; padding: 32px; border: 1px solid var(--rule); border-radius: 18px; background: var(--card); box-shadow: 0 1px 2px rgba(13, 21, 18, .04), 0 8px 24px rgba(13, 21, 18, .05); }
.ent-form h2 { font-size: 1.25rem; letter-spacing: -0.015em; }
.ent-form .pair { display: flex; flex-wrap: wrap; gap: 14px; }
.ent-form .pair label { flex: 1 1 200px; min-width: 0; }
.ent-form input, .ent-form select { min-height: 44px; }
.ent-form fieldset.chips { border: 0; padding: 0; background: none; display: grid; gap: 8px; }
.ent-form fieldset.chips legend { padding: 0; margin-bottom: 8px; font-weight: 500; font-size: .92rem; }
.chips .row { display: flex; flex-wrap: wrap; gap: 8px; }
.chips label { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; border: 1px solid var(--rule); border-radius: 999px; font-weight: 400; cursor: pointer; }
.chips label:has(input:checked) { border-color: var(--green); background: var(--green-soft); }
.chips input { width: 16px; height: 16px; margin: 0; accent-color: var(--green); }
.ent-form .foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.ent-form .foot span { color: var(--soft); font-size: .9rem; }
.ent-form .btn { padding: 13px 28px; }
.ferr { color: var(--bad); font-size: .86rem; font-weight: 500; }
.ent-form .problems { border: 1px solid var(--bad); border-radius: 10px; padding: 10px 14px; color: var(--bad); font-weight: 500; }
.hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
.ent-done { display: grid; gap: 12px; align-content: start; }
.ent-done .tick { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: var(--green-soft); color: var(--green); }
.ent-done p { color: var(--soft); }
`;

type FormState = { values?: Record<string, unknown>; errors?: Record<string, string>; sent?: boolean; limited?: boolean };

export function enterprisePage(st: FormState = {}) {
  const v = st.values ?? {};
  const val = (k: string) => (typeof v[k] === "string" ? esc(v[k] as string) : "");
  const err = (k: string) => (st.errors?.[k] ? `<span class="ferr" id="${k}-err">${esc(st.errors[k])}</span>` : "");
  const inv = (k: string) => (st.errors?.[k] ? ` aria-invalid="true" aria-describedby="${k}-err"` : "");
  const checked = new Set(([] as unknown[]).concat(v.kind ?? []));
  const opts = (o: Record<string, string>, cur: unknown) =>
    `<option value="">Choose one</option>` + Object.entries(o).map(([k, label]) => `<option value="${k}"${cur === k ? " selected" : ""}>${esc(label)}</option>`).join("");
  const problems = st.limited
    ? `<p class="problems" role="alert">Too many requests from here in the last hour. Please email ${esc(SUPPORT_EMAIL)} instead.</p>`
    : st.errors
      ? `<p class="problems" role="alert">Please fix the highlighted ${Object.keys(st.errors).length === 1 ? "field" : "fields"}.</p>`
      : "";

  const form = st.sent
    ? `<div class="ent-form ent-done" role="status">
        <span class="tick">${CHECK}</span>
        <h2>Thanks, we've got it.</h2>
        <p>A person at ${esc(BRAND)} will reply by email with rates. Need to send something today? You can <a href="/send">send a piece now</a> at the regular price.</p>
      </div>`
    : `<form class="ent-form" method="post" action="/enterprise" novalidate>
        <h2>Get volume rates</h2>
        ${problems}
        <div class="pair">
          <label>Full name<input type="text" name="name" autocomplete="name" maxlength="120" required value="${val("name")}"${inv("name")}>${err("name")}</label>
          <label>Work email<input type="email" name="email" autocomplete="email" maxlength="200" required value="${val("email")}"${inv("email")}>${err("email")}</label>
        </div>
        <label><span>Company <span class="soft" style="font-weight:400">(optional)</span></span><input type="text" name="company" autocomplete="organization" maxlength="160" value="${val("company")}"${inv("company")}>${err("company")}</label>
        <label>How much do you send?<select name="volume" required${inv("volume")}>${opts(VOLUMES, v.volume)}</select>${err("volume")}</label>
        <fieldset class="chips"><legend>What will you send?</legend><div class="row">
          ${Object.entries(KINDS).map(([k, label]) => `<label><input type="checkbox" name="kind" value="${k}"${checked.has(k) ? " checked" : ""}>${esc(label)}</label>`).join("")}
        </div>${err("kinds")}</fieldset>
        <label>How would you like to send?<select name="channel"${inv("channel")}>${opts(CHANNELS, v.channel)}</select>${err("channel")}</label>
        <label>Anything else?<textarea name="message" rows="4" maxlength="4000" placeholder="What you send, how often, and any deadlines"${inv("message")}>${val("message")}</textarea>${err("message")}</label>
        <div class="hp" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
        <div class="foot"><span>We'll reply by email to the address above.</span><button class="btn" type="submit">Send</button></div>
      </form>`;

  return page(
    `Enterprise and volume mail — ${BRAND}`,
    `<style>${CSS}</style>
    <section class="ent-page">
      <div class="ent-copy">
        <div class="head">
          <span class="eyebrow">Enterprise</span>
          <h1>Mail in bulk, or every month.</h1>
          <p>Tell us what you send and we'll come back with rates. No commitment.</p>
        </div>
        <ul class="perks">${PERKS.map((p) => `<li>${CHECK}<span>${esc(p)}</span></li>`).join("")}</ul>
        <p class="alt">Prefer email? Write to <a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a>. Agents can send this form too: <code>POST /v1/enterprise-inquiries</code>.</p>
      </div>
      ${form}
    </section>`,
    { description: `Volume rates, one monthly invoice and marketing mail for teams that send in bulk or every month. Tell ${BRAND} what you send and get rates by email.` },
  );
}

export const enterprise = Router();

enterprise.get("/enterprise", (req, res) => {
  res.send(enterprisePage({ sent: req.query.sent === "1" }));
});

enterprise.post("/enterprise", express.urlencoded({ extended: false, limit: "16kb" }), async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  // Honeypot: people never see the "website" field; bots fill in every field. Pretend it worked.
  if (typeof body.website === "string" && body.website.trim()) return res.redirect(303, "/enterprise?sent=1");
  const parsed = InquirySchema.safeParse(fromForm(body));
  if (!parsed.success) return res.status(422).send(enterprisePage({ values: body, errors: fieldErrors(parsed.error) }));
  // Only valid submissions count toward the limit, so a person fixing typos never gets locked out.
  if (!allowInquiry(req.ip ?? "unknown")) return res.status(429).send(enterprisePage({ values: body, limited: true }));
  await createInquiry(parsed.data, { source: "web", client: "web" });
  res.redirect(303, "/enterprise?sent=1");
});
