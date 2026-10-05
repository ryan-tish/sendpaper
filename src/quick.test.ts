import assert from "node:assert/strict";
import { test } from "node:test";
import { parseQuick } from "./quick.ts";

const addr = {
  to_name: "Dana Kim", to_line1: "12 Oak St", to_city: "Austin", to_state: "tx", to_zip: "78701",
  from_name: "Alex Kim", from_line1: "88 Pine Ave", from_city: "Denver", from_state: "CO", from_zip: "80202",
};

test("order link: valid postcard maps to product and decodes \\n", () => {
  const r = parseQuick({ ...addr, size: "6x9", headline: "Hi", message: "a\\nb" });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.product, "postcard_6x9");
  assert.equal((r.data.content as { message: string }).message, "a\nb");
  assert.equal(r.data.to.state, "TX");
});

test("order link: errors name the URL parameter to fix", () => {
  const r = parseQuick({ to_name: "Dana", message: "hi" });
  assert.equal(r.ok, false);
  if (r.ok) return;
  const params = r.errors.map((e) => e.param);
  assert.ok(params.includes("to_line1"));
  assert.ok(params.includes("from_name"));
  assert.ok(params.includes("headline"));
});

test("order link: letters", () => {
  const r = parseQuick({ ...addr, type: "letter", body: "Dear Dana" });
  assert.equal(r.ok && r.product, "letter");
});
