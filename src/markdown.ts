// Markdown versions of public pages (2026-10-09, Ryan: "markdown on any page"). Agents ask for a page as markdown
// with either `<path>.md` (/index.md for the homepage) or an `Accept: text/markdown` header. We render the normal
// HTML page, cut out the part between page()'s md markers (so no nav, footer, scripts or styles), and convert it.
// The HTML stays canonical; markdown responses carry a canonical Link header pointing at it.
import type { NextFunction, Request, Response } from "express";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { BASE_URL, BRAND } from "./config.ts";

export const MD_START = "<!--md-start-->", MD_END = "<!--md-end-->";

const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced", emDelimiter: "_" });
td.use(gfm);
td.remove(["script", "style", "noscript", "iframe", "button", "select", "input", "textarea", "object"]);
td.remove((n) => n.nodeName.toLowerCase() === "svg");
// Page chrome that doesn't help a reader: the "On this page" rail and the guides tab bar.
td.addRule("chrome", { filter: (n) => n.nodeName === "NAV" && /\b(toc|gtabs)\b/.test(n.getAttribute("class") ?? ""), replacement: () => "" });
// Decorative bits marked aria-hidden (guide-card thumbnails, icons) carry no meaning for a reader.
td.remove((n) => n.getAttribute?.("aria-hidden") === "true");
// Guide index cards become one list line each: title, link, blurb.
td.addRule("gcard", {
  filter: (n) => n.nodeName === "A" && /\bgcard\b/.test(n.getAttribute("class") ?? ""),
  replacement: (_c, n) => {
    const el = n as unknown as { getAttribute(k: string): string; querySelector(q: string): { textContent: string } | null };
    const href = el.getAttribute("href"), url = href.startsWith("/") ? `${BASE_URL}${href}` : href;
    return `\n- [${el.querySelector("b")?.textContent ?? url}](${url}): ${el.querySelector(".gx")?.textContent ?? ""}\n`;
  },
});
// Byline spans (Written by … / Facts checked …) sit side by side in HTML; keep them apart in markdown.
td.addRule("meta", {
  filter: (n) => n.nodeName === "DIV" && /\bmeta\b/.test(n.getAttribute("class") ?? ""),
  replacement: (_c, n) => `\n\n${Array.from(n.childNodes).map((c) => (c.textContent ?? "").trim()).filter(Boolean).join(" · ")}\n\n`,
});
// Absolute links, so the markdown still works when an agent passes it along.
td.addRule("abs", {
  filter: (n) => n.nodeName === "A" && !!n.getAttribute("href") && !/\bgcard\b/.test(n.getAttribute("class") ?? ""), // turndown checks later rules first, so exclude cards here
  replacement: (content, n) => {
    const href = (n as unknown as { getAttribute(k: string): string }).getAttribute("href");
    const url = href.startsWith("/") ? `${BASE_URL}${href}` : href;
    const text = content.trim().replace(/\n+/g, " ");
    return text ? `[${text}](${url})` : "";
  },
});

const meta = (html: string, re: RegExp) => (html.match(re)?.[1] ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export function htmlToMarkdown(html: string, path: string) {
  const i = html.indexOf(MD_START), j = html.indexOf(MD_END);
  const body = i >= 0 && j > i ? html.slice(i + MD_START.length, j) : html;
  const title = meta(html, /<title>([^<]*)<\/title>/);
  const desc = meta(html, /<meta name="description" content="([^"]*)"/);
  const md = td.turndown(body).replace(/^(\s*)([-*]|\d+\.)\s{2,}/gm, "$1$2 ").replace(/\)\[/g, ") · [").replace(/(\w)\[(?=[^\]]+\]\()/g, "$1 [").replace(/(\]\([^)\s]+\))(\w)/g, "$1 $2").replace(/\n{3,}/g, "\n\n").trim();
  return `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(desc)}\nurl: ${BASE_URL}${path}\nsite: ${BRAND}\n---\n\n${md}\n`;
}

// Mount before the page routes. `paths` = the public pages that have a markdown twin.
export function markdownPages(paths: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const asMdUrl = req.path.endsWith(".md");
    const htmlPath = asMdUrl ? (req.path === "/index.md" ? "/" : req.path.slice(0, -3)) : req.path;
    if (!paths.includes(htmlPath)) return next();
    res.vary("Accept");
    if (!asMdUrl && req.accepts(["text/html", "text/markdown"]) !== "text/markdown") return next();
    if (asMdUrl) req.url = htmlPath + req.url.slice(req.path.length);
    const send = res.send.bind(res);
    res.send = (body: unknown) => {
      if (typeof body === "string" && res.statusCode === 200 && body.includes(MD_START)) {
        res.type("text/markdown; charset=utf-8").set("Link", `<${BASE_URL}${htmlPath}>; rel="canonical"`);
        return send(htmlToMarkdown(body, htmlPath));
      }
      return send(body);
    };
    next();
  };
}
