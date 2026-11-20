import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { env } from "./config.ts";
import { AddressCheckError, _resetAddressCache, assertDeliverable, describeField, messageFor, verifyKey } from "./addresscheck.ts";

// The real case (a real order, 2026-11-19), and PostGrid's live answers to it on 2026-11-20.
const harborTower = { line1: "350 Example Street", line2: "Harbor Tower", city: "Springfield", state: "IL", zip: "62701" };
const good = { line1: "1600 Pennsylvania Ave NW", city: "Washington", state: "DC", zip: "20500" };

const realFetch = globalThis.fetch;
const saved = { verify: env.postgridVerifyKey, api: env.postgridKey };
afterEach(() => {
  globalThis.fetch = realFetch;
  env.postgridVerifyKey = saved.verify;
  env.postgridKey = saved.api;
  _resetAddressCache();
});

// Fake PostGrid: answers contact creation with `status` per line1, records every call.
function fakePostgrid(answers: Record<string, { status: string; errors?: string } | "down" | number>) {
  const calls: { method: string; url: string; body?: any }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method: init.method ?? "GET", url, body });
    if (init.method === "DELETE") return new Response(JSON.stringify({ id: "x", deleted: true }));
    const a = answers[body.addressLine1];
    if (a === "down") throw new TypeError("fetch failed");
    if (typeof a === "number") return new Response(JSON.stringify({ error: { message: "nope" } }), { status: a });
    return new Response(JSON.stringify({ id: `contact_${calls.length}`, addressStatus: a.status, addressErrors: a.errors ?? "" }));
  }) as typeof fetch;
  return calls;
}

test("messages: a missing suite, a building name on line 2, and anything else", () => {
  assert.match(messageFor({ ...harborTower, line2: undefined }, "line1: Missing Value: Suite identifier"), /needs an apartment or suite number.*\(Address check: line1: Missing Value: Suite identifier\)$/);
  const named = messageFor(harborTower, "generic: Missing Value: Complete Street Information");
  assert.match(named, /^USPS can't confirm this address\./);
  assert.match(named, /If "Harbor Tower" is the building's name, put the apartment or suite number there instead\./);
  assert.doesNotMatch(messageFor({ ...harborTower, line2: "Apt 4B" }, "generic: whatever"), /building's name/);
  assert.equal(describeField("recipients.2"), "Recipient 3");
  assert.equal(describeField("from"), "Return address");
});

test("the live key is used only when one is set or the main key is live", () => {
  env.postgridVerifyKey = ""; env.postgridKey = "test_sk_abc";
  assert.equal(verifyKey(), "");
  env.postgridKey = "live_sk_abc";
  assert.equal(verifyKey(), "live_sk_abc");
  env.postgridVerifyKey = "live_sk_verify";
  assert.equal(verifyKey(), "live_sk_verify");
});

test("no live key: nothing is called and every order goes through", async () => {
  env.postgridVerifyKey = ""; env.postgridKey = "test_sk_abc";
  const calls = fakePostgrid({});
  await assertDeliverable([{ field: "to", address: harborTower }]);
  assert.equal(calls.length, 0);
});

test("a failed address is refused with its field; verified and corrected pass; contacts are deleted", async () => {
  env.postgridVerifyKey = "live_sk_verify";
  const calls = fakePostgrid({
    "350 Example Street": { status: "failed", errors: "generic: Missing Value: Complete Street Information" },
    "1600 Pennsylvania Ave NW": { status: "verified" },
    "88 Pine Ave": { status: "corrected" },
  });
  await assert.rejects(
    assertDeliverable([{ field: "to", address: harborTower }, { field: "from", address: good }]),
    (e: unknown) => {
      assert.ok(e instanceof AddressCheckError);
      assert.equal(e.fields.length, 1);
      assert.equal(e.fields[0].field, "to");
      assert.match(e.message, /^Recipient address: USPS can't confirm/);
      return true;
    },
  );
  await assertDeliverable([{ field: "from", address: { line1: "88 Pine Ave", city: "Denver", state: "CO", zip: "80202" } }]);
  // The check sends the address only: never a name or company.
  const created = calls.filter((c) => c.method === "POST");
  assert.ok(created.every((c) => c.body.firstName === "Sendpaper address check" && !("companyName" in c.body)));
  await new Promise((r) => setImmediate(r));
  assert.equal(calls.filter((c) => c.method === "DELETE").length, created.length);
});

test("results are cached, so a group or a retry doesn't ask twice", async () => {
  env.postgridVerifyKey = "live_sk_verify";
  const calls = fakePostgrid({ "1600 Pennsylvania Ave NW": { status: "verified" } });
  await assertDeliverable([{ field: "to", address: good }]);
  await assertDeliverable([{ field: "to", address: { ...good, line1: "1600  pennsylvania ave nw" } }]);
  assert.equal(calls.filter((c) => c.method === "POST").length, 1);
});

test("PostGrid down or refusing the call never blocks an order (fail open, not cached)", async () => {
  env.postgridVerifyKey = "live_sk_verify";
  const calls = fakePostgrid({ "350 Example Street": "down", "1600 Pennsylvania Ave NW": 500 });
  await assertDeliverable([{ field: "to", address: harborTower }, { field: "from", address: good }]);
  await assertDeliverable([{ field: "to", address: harborTower }]);
  assert.equal(calls.filter((c) => c.method === "POST").length, 3);
});
