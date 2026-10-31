import assert from "node:assert/strict";
import { test } from "node:test";
import { composeEmail } from "./email.ts";
import type { OrderRow } from "./orders.ts";

const base = {
  id: "ord_test1", product: "letter_certified", status: "paid", price_cents: 1499, express: false, batch_id: null,
  to_address: { name: "Pat <Lee>", line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  from_address: { name: "Sam", line1: "2 Oak St", city: "Austin", state: "TX", zip: "78701" },
  content: { body: "PRIVATE LETTER TEXT" }, customer_email: "sam@example.com", operator_note: null, tracking_number: null,
} as unknown as OrderRow;

test("emails never quote the mail itself and escape names", () => {
  for (const kind of ["paid", "mailed", "refunded"] as const) {
    const { subject, html } = composeEmail(kind, base);
    assert.ok(!html.includes("PRIVATE LETTER TEXT") && !subject.includes("PRIVATE LETTER TEXT"), kind);
    assert.ok(html.includes("Pat &#60;Lee&#62;"), `${kind} escapes the recipient name`);
    assert.ok(html.includes("/o/ord_test1"), `${kind} links the order page`);
  }
});

test("paid: certified wording; a group gets one email for all its pieces", () => {
  assert.match(composeEmail("paid", base).html, /Certified Mail, with a tracking number/);
  const group = [base, { ...base, id: "ord_test2", price_cents: 1499 }].map((o) => ({ ...o, batch_id: "bat_1" })) as OrderRow[];
  const g = composeEmail("paid", group[0], group);
  assert.equal(g.subject, "We've got your 2 letters");
  assert.match(g.html, /\$29\.98/);
  assert.match(g.html, /\/b\/bat_1/);
});

test("mailed: tracking link when known, honest wording when not", () => {
  assert.match(composeEmail("mailed", { ...base, tracking_number: "9407111899223197428490" } as OrderRow).html, /tLabels=9407111899223197428490/);
  assert.match(composeEmail("mailed", base).html, /once USPS assigns it/);
  assert.doesNotMatch(composeEmail("mailed", { ...base, product: "postcard_4x6" } as OrderRow).html, /tracking/i);
});

test("refunded: amount and the operator's reason, escaped", () => {
  const r = composeEmail("refunded", { ...base, operator_note: "Address <unclear>" } as OrderRow);
  assert.match(r.html, /\$14\.99/);
  assert.match(r.html, /Address &#60;unclear&#62;/);
});
