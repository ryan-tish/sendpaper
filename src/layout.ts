import { BRAND, DOCS_URL, SUPPORT_EMAIL } from "./config.ts";
import { readFileSync } from "node:fs";
import { esc } from "./render.ts";

// Light is the default for everyone (Ryan, 2026-10-02); dark is opt-in via the nav toggle, remembered in localStorage.
// "Meadow" (chosen 2026-10-02, after Mintlify + Cal.com): white space, one near-black primary button,
// green reserved for accents and success, Geist throughout with Geist Mono for anything an agent would type.
const CSS = `
:root {
  --paper: #ffffff; --tint: #f6f9f7; --card: #ffffff; --ink: #0d1512; --soft: #56625c; --faint: #8a958f; --rule: #e6ebe8;
  --green: #0f7a52; --green-soft: #edf8f2; --green-line: #d6efe2; --lime: #8fd16a;
  --ok: #0f7a52; --ok-bg: #edf8f2; --warn: #8a5a0e; --warn-bg: #fdf3e1; --bad: #b3261e;
  --btn-bg: #0d1512; --btn-fg: #ffffff;
  --f-ui: "Geist", system-ui, -apple-system, sans-serif;
  --f-mono: "Geist Mono", ui-monospace, Menlo, monospace;
}
:root[data-theme="dark"] {
  --paper: #0b100e; --tint: #101714; --card: #121a16; --ink: #e6ede9; --soft: #a1aea7; --faint: #6f7c75; --rule: #222c27;
  --green: #4fd1a1; --green-soft: #12291f; --green-line: #1d3d2f; --lime: #a6e07e;
  --ok: #4fd1a1; --ok-bg: #12291f; --warn: #f0c071; --warn-bg: #33270f; --bad: #f2a097;
  --btn-bg: #e6ede9; --btn-fg: #0b100e; color-scheme: dark }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.theme { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--rule); background: var(--card); color: var(--soft); cursor: pointer; }
.theme:hover { color: var(--ink); }
.theme .moon, :root[data-theme="dark"] .theme .sun { display: block; } .theme .sun, :root[data-theme="dark"] .theme .moon { display: none; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.6 var(--f-ui); -webkit-font-smoothing: antialiased; }
.wrap { max-width: 1120px; margin: 0 auto; padding-inline: 24px; }
header.site { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 20; background: color-mix(in srgb, var(--paper) 86%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--rule); }
header.site nav { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-block: 14px; flex-wrap: wrap; }
.logo { display: inline-flex; align-items: center; gap: 8px; font: 700 1.12rem var(--f-ui); letter-spacing: -0.02em; color: var(--ink); text-decoration: none; }
nav .links { display: flex; gap: 26px; align-items: center; font-size: .93rem; }
nav .links a { color: var(--soft); text-decoration: none; font-weight: 500; }
nav .links a:hover { color: var(--ink); }
nav .links a.btn { color: var(--btn-fg); padding: 8px 14px; font-size: .9rem; }
h1, h2, h3 { font-family: var(--f-ui); text-wrap: balance; margin: 0; color: var(--ink); }
h1 { font-size: clamp(2.3rem, 5vw, 3.6rem); font-weight: 600; letter-spacing: -0.035em; line-height: 1.04; }
h2 { font-size: clamp(1.5rem, 2.6vw, 2rem); font-weight: 600; letter-spacing: -0.025em; line-height: 1.15; }
h3 { font-size: 1.05rem; font-weight: 600; letter-spacing: -0.01em; line-height: 1.3; }
p { margin: 0; max-width: 64ch; }
a { color: var(--green); }
.soft { color: var(--soft); }
.mono, code, pre { font-family: var(--f-mono); font-size: .87em; }
pre { background: var(--tint); border: 1px solid var(--rule); border-radius: 10px; padding: 14px 16px; overflow-x: auto; line-height: 1.55; margin: 0; }
code { background: var(--tint); border: 1px solid var(--rule); border-radius: 5px; padding: 1px 6px; }
pre code { border: 0; padding: 0; background: none; }
.btn { display: inline-flex; align-items: center; gap: 8px; background: var(--btn-bg); color: var(--btn-fg); border: 1px solid var(--btn-bg); border-radius: 8px; padding: 11px 18px; font: 600 .95rem var(--f-ui); text-decoration: none; cursor: pointer; white-space: nowrap; }
.btn:hover { opacity: .9; }
.btn.green { background: var(--green); border-color: var(--green); color: var(--btn-fg); }
.card.offer-card { gap: 12px; border-color: var(--green-line); background: var(--green-soft); }
.offer-card input, .offer-card textarea { background: var(--card); }
.stars { border: 0; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 14px; }
.stars legend { padding: 0; margin-bottom: 6px; font-weight: 500; }
.star { display: inline-flex; gap: 6px; align-items: center; color: var(--green); cursor: pointer; }
.offer-banner { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; justify-content: space-between; border: 1px solid var(--green-line); background: var(--green-soft); border-radius: 12px; padding: 12px 16px; }
.btn.alt { background: var(--card); color: var(--ink); border-color: var(--rule); }
.btn.alt:hover { border-color: var(--faint); opacity: 1; }
.btn:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible, summary:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
section { padding-block: 96px 0; display: grid; gap: 36px; }
@media (max-width: 720px) { section { padding-block: 64px 0; gap: 28px; } }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.card { background: var(--card); border: 1px solid var(--rule); border-radius: 12px; padding: 20px; display: grid; gap: 8px; align-content: start; min-width: 0; }
.price { font: 600 1.9rem var(--f-ui); letter-spacing: -0.03em; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.eyebrow { font: 500 .74rem var(--f-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--green); }
.pill { display: inline-block; font: 500 .78rem var(--f-mono); padding: 4px 10px; border-radius: 999px; background: var(--warn-bg); color: var(--warn); }
.pill.ok { background: var(--ok-bg); color: var(--ok); }
label { display: grid; gap: 6px; font-weight: 500; font-size: .92rem; }
input, textarea, select { font: inherit; font-weight: 400; color: var(--ink); background: var(--card); border: 1px solid var(--rule); border-radius: 8px; padding: 10px 12px; width: 100%; }
input:focus, textarea:focus, select:focus { border-color: var(--green); }
textarea { resize: vertical; min-height: 120px; }
fieldset { border: 1px solid var(--rule); border-radius: 12px; padding: 18px; display: grid; gap: 12px; margin: 0; min-width: 0; background: var(--card); }
legend { font: 600 .98rem var(--f-ui); padding: 0 6px; }
.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
footer.site { border-top: 1px solid var(--rule); margin-top: 112px; padding-block: 28px 44px; font-size: .88rem; color: var(--soft); display: flex; gap: 10px 22px; flex-wrap: wrap; align-items: center; }
footer.site a { color: var(--soft); text-decoration: none; }
footer.site a:hover { color: var(--ink); }
.err { color: var(--bad); font-weight: 600; }
table { border-collapse: collapse; width: 100%; font-size: .9rem; }
th, td { text-align: left; padding: 9px 12px 9px 0; border-bottom: 1px solid var(--rule); vertical-align: top; }
th { font-weight: 500; color: var(--soft); }
.scroll { overflow-x: auto; }
@media (max-width: 720px) { nav .links a:not(.btn) { display: none; } }
@media (max-width: 440px) { nav .links { gap: 10px; } nav .links a.btn { padding: 7px 11px; font-size: .84rem; } .logo svg { height: 22px; width: auto; } }
`;

// Drawn on a 20px grid with whole-pixel edges and a white flap so it stays crisp at 1x (the lime-on-green version looked blurry).
// The Mintlify logo (docs/logo/light.svg: sending-envelope mark + Geist 600 wordmark as paths) so site and docs match exactly.
// Its fixed colors become theme tokens, so one inline SVG serves light and dark.
const LOGO_FULL = readFileSync(new URL("../docs/logo/light.svg", import.meta.url), "utf8")
  .replace(/ width="(\d+)" height="28"/, (_m, w) => ` width="${Math.round((Number(w) * 26) / 28)}" height="26" role="img" aria-label="sendpaper"`)
  .replaceAll("#0F7A52", "var(--green)")
  .replaceAll("#8FD16A", "var(--lime)")
  .replace('stroke="#FFFFFF"', 'stroke="var(--btn-fg)"')
  .replace('fill="#0D1512"', 'fill="var(--ink)"');

export function docsUrl(path = "") {
  return DOCS_URL ? `${DOCS_URL}${path}` : "/docs";
}

export function page(title: string, body: string, opts: { description?: string; noindex?: boolean } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(opts.description ?? `${BRAND} prints and mails real postcards and letters, from the web, a REST API, or your AI agent (Codex, Muse Code, Claude).`)}">
${opts.noindex ? '<meta name="robots" content="noindex">' : ""}
<link rel="icon" href="/favicon.svg?v=4" type="image/svg+xml">
<link rel="alternate" type="text/plain" title="For AI agents" href="/llms.txt">
<link rel="service-desc" type="application/json" href="/openapi.json">
<meta name="ai-agent-instructions" content="Agents: skip the forms. Call the MCP server at /mcp, the REST API at /v1, or open an order link (/quick?...). Details: /llms.txt">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
<script>try { if (localStorage.getItem("theme") === "dark") document.documentElement.dataset.theme = "dark"; } catch {}</script>
<style>${CSS}</style></head><body>
<header class="site"><div class="wrap"><nav>
  <a class="logo" href="/">${LOGO_FULL}</a>
  <div class="links"><a href="/use-cases">Use cases</a><a href="${docsUrl()}">Docs</a><a href="/#pricing">Pricing</a><a href="/send">Send from the web</a><button class="theme" type="button" id="theme" aria-label="Toggle dark mode"><svg class="moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg><svg class="sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button><a class="btn" href="${docsUrl("/quickstart")}">Connect your agent</a></div>
</nav></div></header>
<div class="wrap">
${body}
<footer class="site"><span>© ${new Date().getFullYear()} ${esc(BRAND)}</span><a href="/use-cases">Use cases</a><a href="${docsUrl()}">Docs</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/content-policy">Content policy</a><span>Support: ${esc(SUPPORT_EMAIL)}</span></footer>
</div>
<script>
document.getElementById("theme").addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme !== "dark";
  if (dark) document.documentElement.dataset.theme = "dark"; else delete document.documentElement.dataset.theme;
  try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch {}
  dispatchEvent(new Event("themechange"));
});
</script></body></html>`;
}
