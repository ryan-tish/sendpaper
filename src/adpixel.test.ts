import { test } from "node:test";
import assert from "node:assert/strict";

// OpenAI ads pixel (2026-11-22). config.ts reads OPENAI_PIXEL_ID at import, so set it before importing.
process.env.OPENAI_PIXEL_ID = "test_pixel";
const { adConversionFrame, adConversionPage, adLandingSnippet } = await import("./analytics.ts");

const scriptOf = (html: string) => html.match(/<script>([\s\S]*)<\/script>/)?.[1] ?? "";

test("the browser code parses (a stray backslash in a TS template literal would break it)", () => {
  for (const html of [adLandingSnippet(), adConversionPage()]) {
    const js = scriptOf(html);
    assert.ok(js.includes("bzrcdn.openai.com/sdk/oaiq.min.js") && js.includes('"test_pixel"'));
    assert.doesNotThrow(() => new Function(js));
  }
  assert.ok(scriptOf(adLandingSnippet()).includes('get("oppref")'), "only loads for ad clicks");
  assert.ok(scriptOf(adConversionPage()).includes('"order_created"'));
});

test("the purchase frame only appears for ad visitors, and never carries the order id", () => {
  assert.equal(adConversionFrame(undefined, "ord_abc123", 499), "");
  assert.equal(adConversionFrame("sp_owner=1; __oppref=", "ord_abc123", 499), "", "empty cookie doesn't count");
  const f = adConversionFrame("sp_owner=1; __oppref=xyz", "ord_abc123", 499);
  assert.match(f, /^<iframe src="\/ad-conversion#e=[a-f0-9]{32}&amp;a=499" hidden/);
  assert.ok(!f.includes("ord_abc123") && !f.includes("abc123"));
  assert.match(f, /referrerpolicy="no-referrer"/);
});
