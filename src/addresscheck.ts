// Address check BEFORE an order is created (Ryan, 2026-11-20). Why: a paid letter (2026-11-19) was refused by PostGrid
// when it was approved. Its address had this shape (made up here): "350 Example Street / Harbor Tower, Springfield IL
// 62701", which fails with
// "generic: Missing Value: Complete Street Information" (without "Harbor Tower": "line1: Missing Value: Suite identifier";
// the building needs a suite or apartment number and "Harbor Tower" is only its name). Our PostGrid account's address
// strictness only sends to addresses it can verify or correct, for the recipient AND the return address, so we ask the
// same verifier while the customer is still on the form (or the agent still has the user), not after they've paid.
//
// How: creating a PostGrid contact with a LIVE key verifies its address and returns addressStatus
// (verified | corrected | failed) plus addressErrors. Free with Print & Mail (PostGrid's FAQ); about 0.5 s. Test keys
// mark every address verified, so the check needs a live key: POSTGRID_VERIFY_KEY, else POSTGRID_API_KEY when it is
// live (prod). Locally, set POSTGRID_VERIFY_KEY to the live key and keep POSTGRID_API_KEY on test: nothing can mail.
// Only the address goes to PostGrid (never the name or company), and the contact is deleted straight after, so unpaid
// orders don't pile up there. Only "failed" blocks; "corrected" passes (PostGrid corrects it again at print). If
// PostGrid is slow, down or refuses the call, the order goes through (fail open) and the print-time error stays the
// backstop: a checker outage must never stop people ordering.
import { env } from "./config.ts";

const API = "https://api.postgrid.com/print-mail/v1";
const TIMEOUT_MS = 6000;
const TTL_MS = 60 * 60 * 1000;

type Addr = { line1: string; line2?: string; city: string; state?: string; zip?: string; country?: string };
export type FieldError = { field: string; message: string };
type Result = { status: "verified" | "corrected" | "failed" | "unchecked"; errors: string };

// `fields` uses the API's paths: "to", "from" or "recipients.<i>" (the whole address, not one input).
export class AddressCheckError extends Error {
  fields: FieldError[];
  constructor(fields: FieldError[]) {
    super(fields.map((f) => `${describeField(f.field)}: ${f.message}`).join(" "));
    this.name = "AddressCheckError";
    this.fields = fields;
  }
}

export function describeField(field: string) {
  if (field === "to") return "Recipient address";
  if (field === "from") return "Return address";
  const m = /^recipients\.(\d+)$/.exec(field);
  return m ? `Recipient ${Number(m[1]) + 1}` : field;
}

export const verifyKey = () => env.postgridVerifyKey || (env.postgridKey.startsWith("live_") ? env.postgridKey : "");

// Plain words for the person on the form, then PostGrid's own text in brackets for agents and support.
export function messageFor(a: Addr, errors: string) {
  const raw = errors.trim();
  const tail = raw ? ` (Address check: ${raw})` : "";
  if (/suite identifier|secondary|apartment|unit number/i.test(raw))
    return `This building needs an apartment or suite number. Add it on the second address line, e.g. Apt 4B or Suite 1200.${tail}`;
  // A second line with no number is usually a building or company name, which USPS can't use (the Harbor Tower case).
  const named = a.line2 && !/\d/.test(a.line2) ? ` If "${a.line2}" is the building's name, put the apartment or suite number there instead.` : "";
  return `USPS can't confirm this address. Check the street and ZIP code, and add the apartment or suite number if the building has one.${named}${tail}`;
}

const cache = new Map<string, { at: number; r: Result }>();
const norm = (s?: string) => (s ?? "").trim().toUpperCase().replace(/\s+/g, " ");
const cacheKey = (a: Addr) => [a.line1, a.line2, a.city, a.state, a.zip, a.country || "US"].map(norm).join("|");

export async function verifyAddress(a: Addr): Promise<Result> {
  const key = verifyKey();
  if (!key) return { status: "unchecked", errors: "" };
  const k = cacheKey(a);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.r;
  try {
    const res = await fetch(`${API}/contacts`, {
      method: "POST",
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Sendpaper address check",
        addressLine1: a.line1,
        ...(a.line2 ? { addressLine2: a.line2 } : {}),
        city: a.city,
        ...(a.state ? { provinceOrState: a.state } : {}),
        ...(a.zip ? { postalOrZip: a.zip } : {}),
        countryCode: a.country || "US",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const c = (await res.json().catch(() => ({}))) as { id?: string; addressStatus?: string; addressErrors?: string; error?: { message?: string } };
    if (c.id) {
      fetch(`${API}/contacts/${c.id}`, { method: "DELETE", headers: { "x-api-key": key }, signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(() => {});
    }
    if (!res.ok || !["verified", "corrected", "failed"].includes(c.addressStatus ?? "")) {
      console.error("address check: PostGrid", res.status, c.error?.message ?? "no addressStatus");
      return { status: "unchecked", errors: "" };
    }
    const r = { status: c.addressStatus as Result["status"], errors: String(c.addressErrors ?? "") };
    if (cache.size > 2000) cache.clear();
    cache.set(k, { at: Date.now(), r });
    return r;
  } catch (e) {
    console.error("address check failed (order allowed):", (e as Error).message);
    return { status: "unchecked", errors: "" };
  }
}

// Checks every address at once; throws AddressCheckError naming each one PostGrid would refuse.
export async function assertDeliverable(items: { field: string; address: Addr }[]) {
  const results = await Promise.all(items.map(async (i) => ({ ...i, r: await verifyAddress(i.address) })));
  const failed = results.filter((x) => x.r.status === "failed").map((x) => ({ field: x.field, message: messageFor(x.address, x.r.errors) }));
  if (failed.length) throw new AddressCheckError(failed);
}

export const _resetAddressCache = () => cache.clear();
