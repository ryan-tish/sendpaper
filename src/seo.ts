// Search and answer-engine basics (2026-10-04): robots.txt, sitemap.xml, canonical Link headers and IndexNow.
// IndexNow tells Bing (which powers ChatGPT search), Yandex and others about our pages right after a deploy,
// instead of waiting for a crawl. The key is public by design: it's served at /<key>.txt to prove we own the host.
import { Router } from "express";
import { BASE_URL, DOCS_URL } from "./config.ts";

// Pages we want indexed. Order pages, admin, order links and the API stay out (they're private or per-order).
export const PUBLIC_PATHS = ["/", "/send", "/use-cases", "/reviews", "/privacy", "/terms", "/content-policy"];

const INDEXNOW_KEY = "5a91dadb8889cecc61126822710dc0b0";
const isProd = () => BASE_URL.startsWith("https://") && !BASE_URL.includes("localhost");

export const seo = Router();

seo.get("/robots.txt", (_req, res) => {
  res.type("text/plain").set("Cache-Control", "public, max-age=3600").send(
    [
      // AI crawlers are welcome: being read by them is how answer engines learn what Sendpaper does.
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin",
      "Disallow: /o/",
      "Disallow: /quick",
      "Disallow: /v1/",
      "Disallow: /webhooks/",
      "",
      `Sitemap: ${BASE_URL}/sitemap.xml`,
      ...(DOCS_URL ? [`Sitemap: ${DOCS_URL}/sitemap.xml`] : []),
      "",
    ].join("\n"),
  );
});

seo.get("/sitemap.xml", (_req, res) => {
  const urls = PUBLIC_PATHS.map((p) => `  <url><loc>${BASE_URL}${p === "/" ? "/" : p}</loc></url>`).join("\n");
  res
    .type("application/xml")
    .set("Cache-Control", "public, max-age=3600")
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
});

seo.get(`/${INDEXNOW_KEY}.txt`, (_req, res) => {
  res.type("text/plain").send(INDEXNOW_KEY);
});

// A canonical URL per public page, sent as a Link header so every page gets one without touching its HTML
// (and query-string variants like /send?product=… consolidate onto /send).
seo.use((req, res, next) => {
  if ((req.method === "GET" || req.method === "HEAD") && PUBLIC_PATHS.includes(req.path)) res.set("Link", `<${BASE_URL}${req.path}>; rel="canonical"`);
  next();
});

// Ping IndexNow once per deploy (production only). Failures are logged and ignored: it's a hint, not a dependency.
export function pingIndexNow() {
  if (!isProd()) return;
  setTimeout(async () => {
    try {
      const host = new URL(BASE_URL).host;
      const r = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`, urlList: PUBLIC_PATHS.map((p) => `${BASE_URL}${p}`) }),
      });
      console.log(`IndexNow ping: ${r.status}`);
    } catch (e) {
      console.error("IndexNow ping failed", e);
    }
  }, 30_000);
}
