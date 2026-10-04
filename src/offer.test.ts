import { test } from "node:test";
import assert from "node:assert/strict";
import { senderKey } from "./offer.ts";

const base = { name: "Alex Kim", line1: "88 Pine Ave", city: "Denver", state: "CO", zip: "80202" };

test("one free postcard per return address, whatever the name or formatting", () => {
  assert.equal(senderKey(base), senderKey({ ...base, name: "A. Kim", line1: "88 PINE AVE." }));
  assert.equal(senderKey(base), senderKey({ ...base, zip: "80202-1234" }));
});

test("different street, unit or ZIP is a different sender", () => {
  assert.notEqual(senderKey(base), senderKey({ ...base, line1: "90 Pine Ave" }));
  assert.notEqual(senderKey(base), senderKey({ ...base, line2: "Apt 2" }));
  assert.notEqual(senderKey(base), senderKey({ ...base, zip: "80203" }));
});
