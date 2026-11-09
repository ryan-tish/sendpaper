import { test } from "node:test";
import assert from "node:assert/strict";
import { InquirySchema, allowInquiry, enterprisePage, fieldErrors, fromForm, inquiryEmail, type InquiryRow } from "./enterprise.ts";

const valid = { name: "Sam Lee", email: "sam@example.com", volume: "100-1000" };

test("inquiry: the minimum is name, email and volume; kinds are de-duplicated", () => {
  const i = InquirySchema.parse({ ...valid, kinds: ["letters", "letters", "marketing"] });
  assert.deepEqual(i.kinds, ["letters", "marketing"]);
  assert.deepEqual(InquirySchema.parse(valid).kinds, []);
});

test("inquiry: bad email and unknown volume are reported by field", () => {
  const r = InquirySchema.safeParse({ ...valid, email: "not-an-email", volume: "lots" });
  assert.equal(r.success, false);
  const errs = fieldErrors(r.error!);
  assert.equal(errs.email, "Add a valid email address");
  assert.equal(errs.volume, "Choose how much you send");
});

test("form fields: blanks mean not given, and one or many kind boxes become a list", () => {
  const one = fromForm({ name: "Sam", email: "sam@example.com", volume: "few", company: "  ", channel: "", kind: "postcards" });
  assert.equal(one.company, undefined);
  assert.equal(one.channel, undefined);
  assert.deepEqual(one.kinds, ["postcards"]);
  assert.deepEqual(fromForm({ kind: ["letters", "certified"] }).kinds, ["letters", "certified"]);
  assert.equal(fromForm({}).kinds, undefined);
  assert.equal(InquirySchema.safeParse(fromForm({})).success, false);
});

test("rate limit: 5 an hour per IP, then free again an hour later", () => {
  const t = 1_000_000;
  for (let i = 0; i < 5; i++) assert.equal(allowInquiry("203.0.113.9", t + i), true);
  assert.equal(allowInquiry("203.0.113.9", t + 10), false);
  assert.equal(allowInquiry("198.51.100.4", t + 10), true);
  assert.equal(allowInquiry("203.0.113.9", t + 3_600_001), true);
});

test("alert email escapes what people typed and keeps the subject on one line", () => {
  const row: InquiryRow = {
    id: "inq_test",
    name: "<b>Sam</b>",
    email: "sam@example.com",
    company: "Acme\r\nBcc: x@example.com",
    volume: "1000+",
    kinds: ["marketing"],
    channel: "api",
    message: "<script>alert(1)</script>",
    source: "web",
    client: "web",
    handled_at: null,
    created_at: new Date(),
  };
  const m = inquiryEmail(row);
  assert.ok(!m.subject.includes("\n") && !m.subject.includes("\r"));
  assert.ok(!m.html.includes("<script>") && m.html.includes("&lt;script&gt;"));
  assert.ok(!m.html.includes("<b>Sam</b>"));
  assert.ok(m.html.includes("More than 1,000 a month") && m.html.includes("Marketing campaigns"));
});

test("page: the thank-you state has no form, and errors keep (escaped) values", () => {
  assert.ok(!enterprisePage({ sent: true }).includes('action="/enterprise"'));
  const html = enterprisePage({ values: { name: '"><img src=x>', email: "bad", volume: "few", kind: ["letters"] }, errors: { email: "Add a valid email address" } });
  assert.ok(html.includes("Add a valid email address") && html.includes('aria-invalid="true"'));
  assert.ok(!html.includes('"><img src=x>'));
  assert.ok(html.includes('value="few" selected') && html.includes('value="letters" checked'));
});
