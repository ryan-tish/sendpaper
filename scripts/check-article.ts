// Pre-publish gate for one article or comparison page. Used by the
// auto-publish routine (content-ops/queue.md) and by hand:
//   node scripts/check-article.ts /how-long-does-first-class-mail-take
//   node scripts/check-article.ts /compare/click2mail
//   node scripts/check-article.ts /<slug> --md   (also prints the page as markdown, for QA)
// Exits non-zero with a list of problems; prints "OK <path>" when clean.
import { ARTICLES, articleList, articlePage } from "../src/articles.ts";
import { COMPARES, compareList, comparePage } from "../src/compare.ts";
import { htmlToMarkdown } from "../src/markdown.ts";
import { PUBLIC_PATHS } from "../src/seo.ts";

const path = process.argv[2];
if (!path?.startsWith("/")) {
  console.error("usage: node scripts/check-article.ts /<slug> | /compare/<slug>");
  process.exit(2);
}
const problems: string[] = [];
const isCompare = path.startsWith("/compare/");
const slug = isCompare ? path.slice("/compare/".length) : path.slice(1);

const matches = isCompare ? COMPARES.filter((c) => c.slug === slug) : ARTICLES.filter((a) => a.slug === slug);
if (matches.length !== 1) problems.push(`expected exactly one entry with slug "${slug}", found ${matches.length}`);
const entry: any = matches[0];

const html = (isCompare ? comparePage(slug) : articlePage(slug)) ?? "";
if (!html) problems.push("page did not render");
if (!PUBLIC_PATHS.includes(path)) problems.push("not in PUBLIC_PATHS (sitemap)");
const cards = isCompare ? compareList() : articleList();
if (!cards.some((c: any) => c.href === path)) problems.push("no card on /guides");

if (entry) {
  for (const k of ["title", "metaTitle", "description", "published", "modified"]) if (!entry[k]) problems.push(`missing field ${k}`);
  if (entry.metaTitle && entry.metaTitle.length > 65) problems.push(`metaTitle is ${entry.metaTitle.length} chars (max 65)`);
  if (entry.description && (entry.description.length < 70 || entry.description.length > 165)) problems.push(`description is ${entry.description.length} chars (want 70–165)`);
  for (const k of ["published", "modified"]) if (entry[k] && !/^\d{4}-\d{2}-\d{2}$/.test(entry[k])) problems.push(`${k} is not YYYY-MM-DD`);
  if (!Array.isArray(entry.faqs) || entry.faqs.length < 2) problems.push("needs at least 2 FAQs");
}

// The /guides card (Ryan, 2026-11-13: two comparison cards showed "Lob", and "LetterStream" ran off its thumbnail).
// The art must depict THIS page, and the label must fit the thumbnail at every width. The CSS sizes the label to the
// card and fits a 12-letter word; longer words get split mid-word. Words, not characters per line, are what break it.
const card: any = cards.find((c: any) => c.href === path);
if (card && entry) {
  const MAX_WORD = 12;
  const longWords = (s: string) => s.split(/\s+/).filter((w) => w.length > MAX_WORD);
  if (longWords(card.label).length) problems.push(`card label word too long for the thumbnail (max ${MAX_WORD} letters): ${longWords(card.label).join(", ")}`);
  if (card.label.length > 36) problems.push(`card label is ${card.label.length} chars (max 36; it's the big text on the thumbnail)`);
  if (card.caption !== undefined && (card.caption.length > 24 || longWords(card.caption).length)) problems.push(`card caption "${card.caption}" is too long (max 24 chars, ${MAX_WORD}-letter words)`);
  const others = [...articleList(), ...compareList()].filter((c) => c.href !== path);
  if (others.some((c) => c.label.toLowerCase() === card.label.toLowerCase())) problems.push(`card label "${card.label}" is already used by another card`);
  if (isCompare) {
    if (card.vs !== entry.rival) problems.push(`comparison card draws "${card.vs}", not its rival "${entry.rival}"`);
    if (!card.label.includes(entry.rival)) problems.push(`comparison card label should name ${entry.rival}`);
    if (longWords(entry.rival).length) problems.push(`rival name has a word over ${MAX_WORD} letters; check its card thumbnail by eye`);
  } else if (card.art === "compare") problems.push("only comparison pages may use the compare art");
  // No OTHER competitor's name anywhere on this card's thumbnail.
  const thumbText = `${card.label} ${card.caption ?? ""} ${card.vs ?? ""}`.toLowerCase();
  for (const r of COMPARES.map((c) => c.rival)) {
    if (isCompare && r === entry.rival) continue;
    if (thumbText.includes(r.toLowerCase())) problems.push(`card thumbnail names another competitor: ${r}`);
  }
}

for (const bad of ["undefined", "NaN", "[object Object]", "TODO", "TK", "lorem"]) {
  if (new RegExp(`\\b${bad.replace(/[[\]]/g, "\\$&")}\\b`).test(html)) problems.push(`page contains "${bad}"`);
}

// Every JSON-LD block must parse.
for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
  try { JSON.parse(m[1]); } catch { problems.push("a JSON-LD block does not parse"); }
}

// Internal links must point at a real public page (an #anchor is fine); external links must be https.
const known = new Set([...PUBLIC_PATHS, "/send", "/docs"]);
for (const m of html.matchAll(/href="([^"]+)"/g)) {
  const href = m[1];
  if (href.startsWith("http://")) problems.push(`insecure link ${href}`);
  if (href.startsWith("/") && !href.startsWith("//")) {
    const p = href.split(/[?#]/)[0];
    if (/\.(css|js|svg|png|ico|txt|xml|json|md)$/.test(p) || p.startsWith("/guides/img/") || p.startsWith("/send/")) continue;
    if (p && !known.has(p)) problems.push(`internal link to unknown page ${href}`);
  }
}

try {
  const md = htmlToMarkdown(html, path);
  if (!md || md.length < 500) problems.push("markdown version is empty or very short");
  else if (process.argv.includes("--md")) {
    console.log(md);
    // So the QA reviewer can check the thumbnail matches the page (it isn't part of the page itself).
    if (card) console.log(`\n---\n/guides card: art=${card.art} label="${card.label}"${card.caption ? ` caption="${card.caption}"` : ""}${card.vs ? ` vs="${card.vs}"` : ""}`);
  }
} catch (e) {
  problems.push(`markdown conversion failed: ${(e as Error).message}`);
}

if (problems.length) {
  console.error(`FAIL ${path}\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`OK ${path}`);
