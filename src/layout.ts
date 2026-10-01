import { BRAND, SUPPORT_EMAIL } from "./config.ts";
import { esc } from "./render.ts";

// Airmail stationery: white paper, ink-navy type, and one loud detail — the red/blue airmail stripe.
const CSS = `
:root {
  --paper: #fbfcfe; --card: #ffffff; --ink: #14213d; --soft: #55617a; --rule: #dde3ee;
  --air-red: #d6403a; --air-blue: #2a4fa8; --ok: #1d7a55; --ok-bg: #e3f3eb; --warn-bg: #fdf1dc; --warn: #8a5a0e;
  --f-display: "Bricolage Grotesque", "Avenir Next", system-ui, sans-serif;
  --f-body: "Public Sans", system-ui, -apple-system, sans-serif;
  --f-mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root { --paper:#0e1422; --card:#151d2f; --ink:#e7ecf6; --soft:#9aa6bd; --rule:#27324a;
  --air-red:#ef6a60; --air-blue:#7b9cf0; --ok:#6fd3a6; --ok-bg:#12332a; --warn-bg:#3a2b10; --warn:#f0c071; color-scheme: dark } }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.6 var(--f-body); }
.stripe { height:8px; background: repeating-linear-gradient(-45deg, var(--air-red) 0 16px, var(--paper) 16px 24px, var(--air-blue) 24px 40px, var(--paper) 40px 48px); }
.wrap { max-width:1040px; margin:0 auto; padding-inline:20px; }
nav { display:flex; justify-content:space-between; align-items:center; padding-block:18px; gap:16px; flex-wrap:wrap; }
nav a { color:var(--ink); text-decoration:none; font-weight:600; }
nav .links { display:flex; gap:20px; font-size:.95rem; }
.logo { font:800 1.35rem var(--f-display); letter-spacing:-.02em; }
h1, h2, h3 { font-family:var(--f-display); letter-spacing:-.02em; text-wrap:balance; line-height:1.1; margin:0; }
h1 { font-size:clamp(2.2rem, 5vw, 3.6rem); font-weight:800; }
h2 { font-size:1.7rem; font-weight:700; }
h3 { font-size:1.1rem; font-weight:700; }
p { margin:0; max-width:64ch; }
a { color:var(--air-blue); }
.soft { color:var(--soft); }
.mono, code, pre { font-family:var(--f-mono); font-size:.88em; }
pre { background:var(--card); border:1px solid var(--rule); border-radius:8px; padding:14px 16px; overflow-x:auto; line-height:1.5; margin:0; }
code { background:var(--card); border:1px solid var(--rule); border-radius:4px; padding:1px 5px; }
pre code { border:0; padding:0; background:none; }
.btn { display:inline-flex; align-items:center; gap:8px; background:var(--ink); color:var(--paper); border:0; border-radius:8px; padding:12px 20px; font:700 1rem var(--f-body); text-decoration:none; cursor:pointer; }
.btn.alt { background:transparent; color:var(--ink); border:1.5px solid var(--ink); }
.btn:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline:3px solid var(--air-blue); outline-offset:2px; }
section { padding-block:40px; display:grid; gap:20px; }
.grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:16px; }
.card { background:var(--card); border:1px solid var(--rule); border-radius:10px; padding:20px; display:grid; gap:8px; align-content:start; min-width:0; }
.price { font:800 1.8rem var(--f-display); }
.eyebrow { font:600 .75rem var(--f-mono); letter-spacing:.1em; text-transform:uppercase; color:var(--air-red); }
.pill { display:inline-block; font:600 .78rem var(--f-mono); padding:4px 10px; border-radius:999px; background:var(--warn-bg); color:var(--warn); }
.pill.ok { background:var(--ok-bg); color:var(--ok); }
label { display:grid; gap:4px; font-weight:600; font-size:.92rem; }
input, textarea, select { font:inherit; font-weight:400; color:var(--ink); background:var(--card); border:1px solid var(--rule); border-radius:7px; padding:10px 12px; width:100%; }
textarea { resize:vertical; min-height:120px; }
fieldset { border:1px solid var(--rule); border-radius:10px; padding:16px; display:grid; gap:12px; margin:0; min-width:0; }
legend { font:700 1rem var(--f-display); padding:0 6px; }
.row { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px; }
footer { border-top:1px solid var(--rule); margin-top:40px; padding-block:24px 40px; font-size:.88rem; color:var(--soft); display:flex; gap:18px; flex-wrap:wrap; }
footer a { color:var(--soft); }
.err { color:var(--air-red); font-weight:600; }
table { border-collapse:collapse; width:100%; font-size:.9rem; }
th, td { text-align:left; padding:8px 10px 8px 0; border-bottom:1px solid var(--rule); vertical-align:top; }
.scroll { overflow-x:auto; }
`;

export function page(title: string, body: string, opts: { description?: string; noindex?: boolean } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(opts.description ?? `${BRAND} prints and mails real postcards and letters — from the web, a REST API, or your AI agent (Codex, Muse Code, Claude).`)}">
${opts.noindex ? '<meta name="robots" content="noindex">' : ""}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Public+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>${CSS}</style></head><body>
<div class="stripe"></div>
<div class="wrap">
<nav><a class="logo" href="/">${esc(BRAND)}</a>
<div class="links"><a href="/send">Send mail</a><a href="/agents">For agents</a><a href="/docs">API</a></div></nav>
${body}
<footer><span>© ${new Date().getFullYear()} ${esc(BRAND)}</span><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/content-policy">Content policy</a><span>Support: ${esc(SUPPORT_EMAIL)}</span></footer>
</div></body></html>`;
}
