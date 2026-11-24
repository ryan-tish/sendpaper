import { test } from "node:test";
import assert from "node:assert/strict";
import { ARTICLES } from "./articles.ts";
import { COMPARES } from "./compare.ts";
import { GUIDES } from "./guides.ts";
import { KIND_INFO, sendChooser } from "./send.ts";
import { POLICY_DESCRIPTIONS } from "./docs.ts";

// OpenSEO site audit (2026-11-23): seven pages shared the site-wide default description, and two were over 160
// characters. Every indexed page with its own description must keep it unique and 70–160 characters long.
const descOf = (html: string) => html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";

test("meta descriptions are unique and 70–160 characters", () => {
  const all: [string, string][] = [
    ...ARTICLES.map((a) => [a.slug, a.description] as [string, string]),
    ...COMPARES.map((c) => [`compare/${c.slug}`, c.description] as [string, string]),
    ...GUIDES.map((g) => [g.slug, g.description] as [string, string]),
    ...Object.entries(KIND_INFO).map(([k, v]) => [`send/${k}`, v.description] as [string, string]),
    ...Object.entries(POLICY_DESCRIPTIONS).map(([k, v]) => [k, v] as [string, string]),
    ["send", descOf(sendChooser()).replace(/&#39;/g, "'").replace(/&amp;/g, "&")],
  ];
  for (const [where, d] of all) assert.ok(d.length >= 70 && d.length <= 160, `${where}: ${d.length} characters`);
  const seen = new Map<string, string>();
  for (const [where, d] of all) {
    assert.ok(!seen.has(d), `${where} repeats the description of ${seen.get(d)}`);
    seen.set(d, where);
  }
});
