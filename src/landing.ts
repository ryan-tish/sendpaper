import { BASE_URL, BRAND, DOCS_URL, PRODUCTS } from "./config.ts";
import { page } from "./layout.ts";
import { esc } from "./render.ts";

const MCP_URL = `${BASE_URL}/mcp`;
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const slug = BRAND.toLowerCase();

const INSTALL: [string, string, string][] = [
  ["Codex", `codex plugin marketplace add ryan-fern/${slug}-plugin\n# or just the MCP server:\ncodex mcp add ${slug} --url ${MCP_URL}`, "The plugin adds a skill that teaches Codex to confirm addresses and hand you the preview."],
  ["Muse Code", `"mcp_servers": {\n  "${slug}": {\n    "transport": "streamable_http",\n    "url": "${MCP_URL}"\n  }\n}`, "Add to your Muse Code settings, then restart the session."],
  ["Claude", `claude mcp add --transport http ${slug} ${MCP_URL}`, "Claude Desktop and claude.ai: Settings → Connectors → Add custom connector, and paste the URL."],
  ["Any MCP client", MCP_URL, "Streamable HTTP, no authentication. Works in ChatGPT developer mode, Cursor, VS Code and others."],
  ["REST", `curl ${BASE_URL}/v1/postcards \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: bday-mom-2026" \\\n  -d '{"to": {...}, "from": {...},\n       "content": {"front_headline": "Happy birthday!",\n                   "message": "Call you Sunday."}}'`, "Same flow over HTTP. The response includes checkout_url and preview_url."],
];

const CSS = `
.hero { display:grid; grid-template-columns:minmax(0,1.05fr) minmax(0,1fr); gap:48px; align-items:center; padding-block:56px 40px; }
.hero h1 { font-size:clamp(2.4rem, 5.4vw, 4rem); }
.hero .lede { font-size:1.15rem; color:var(--soft); }
.ctas { display:flex; gap:12px; flex-wrap:wrap; }
.endpoint { display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:.9rem; color:var(--soft); }
.endpoint code { font-size:.92rem; }
.term { background:#0f1626; color:#d9e1f2; border-radius:12px; border:1px solid #26314a; font:13px/1.65 var(--f-mono); overflow:hidden; box-shadow:0 18px 50px -24px rgba(20,33,61,.55); min-width:0; }
.term .bar { display:flex; gap:6px; padding:10px 14px; background:#151e33; border-bottom:1px solid #26314a; }
.term .bar i { width:10px; height:10px; border-radius:50%; background:#3a4560; }
.term .body { padding:16px 18px; display:grid; gap:10px; overflow-x:auto; }
.term .you { color:#ffffff; }
.term .you::before { content:"› "; color:#7b9cf0; }
.term .call { color:#8fa3c8; }
.term .call b { color:#f5b46b; font-weight:600; }
.term .ok { color:#6fd3a6; }
.term a { color:#9db6ff; }
.card-stage { position:relative; padding-bottom:112px; }
.mini { position:absolute; right:-10px; bottom:0; width:190px; aspect-ratio:3/2; background:#e2603f; color:#fff6e8; border-radius:4px; display:grid; place-items:center; font:700 17px/1.1 Georgia,serif; text-align:center; padding:12px; transform:rotate(4deg); box-shadow:0 14px 30px -14px rgba(0,0,0,.5); }
.tabs { display:flex; gap:4px; flex-wrap:wrap; border-bottom:1px solid var(--rule); }
.tabs button { font:600 .92rem var(--f-body); color:var(--soft); background:none; border:0; border-bottom:2px solid transparent; padding:10px 14px; cursor:pointer; }
.tabs button[aria-selected="true"] { color:var(--ink); border-bottom-color:var(--air-red); }
.tabs button:focus-visible { outline:3px solid var(--air-blue); outline-offset:-3px; }
.panel { display:grid; gap:10px; padding-top:16px; }
.panel pre { position:relative; }
.copy { position:absolute; top:8px; right:8px; font:600 .75rem var(--f-body); background:var(--paper); color:var(--ink); border:1px solid var(--rule); border-radius:6px; padding:4px 10px; cursor:pointer; }
.feat { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:28px 32px; }
.feat h3 { margin-bottom:6px; }
.feat p { color:var(--soft); font-size:.95rem; }
.flow { display:grid; grid-template-columns:repeat(auto-fit, minmax(190px,1fr)); gap:0; border:1px solid var(--rule); border-radius:12px; overflow:hidden; background:var(--card); }
.flow div { padding:18px; border-right:1px solid var(--rule); display:grid; gap:6px; align-content:start; }
.flow div:last-child { border-right:0; }
.flow .n { font:600 .75rem var(--f-mono); color:var(--air-red); letter-spacing:.08em; }
.flow code { font-size:.82rem; }
.prices { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:16px; }
.prices .card { gap:4px; }
.human { display:flex; justify-content:space-between; align-items:center; gap:20px; flex-wrap:wrap; background:var(--card); border:1px solid var(--rule); border-radius:12px; padding:24px; }
details.faq { border-bottom:1px solid var(--rule); padding-block:14px; }
details.faq summary { font-weight:700; cursor:pointer; }
details.faq p { color:var(--soft); margin-top:8px; }
@media (max-width: 820px) { .hero { grid-template-columns:minmax(0,1fr); padding-block:32px 24px; } .mini { display:none; } .flow div { border-right:0; border-bottom:1px solid var(--rule); } }
`;

export function landing() {
  const tabs = INSTALL.map(
    ([name], i) => `<button role="tab" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}">${esc(name)}</button>`,
  ).join("");
  const panels = INSTALL.map(
    ([, code, note], i) => `<div class="panel" role="tabpanel" id="panel-${i}" aria-labelledby="tab-${i}"${i ? " hidden" : ""}>
      <pre><button class="copy" type="button">Copy</button><code>${esc(code)}</code></pre><p class="soft">${esc(note)}</p></div>`,
  ).join("");
  const docs = DOCS_URL || "/docs";

  return page(
    `${BRAND}: physical mail for AI agents`,
    `<style>${CSS}</style>
    <div class="hero">
      <div style="display:grid;gap:20px;min-width:0">
        <span class="eyebrow">MCP server · REST API · USPS First-Class</span>
        <h1>Physical mail for AI agents.</h1>
        <p class="lede">Give Codex, Muse or Claude one tool and it can send real postcards and letters. Your agent writes it, you check the preview and pay, and we print and mail it.</p>
        <div class="ctas"><a class="btn" href="#connect">Connect your agent</a><a class="btn alt" href="${esc(docs)}">Read the docs</a></div>
        <div class="endpoint">No sign-up or API key. Endpoint: <code>${esc(MCP_URL)}</code></div>
      </div>
      <div class="card-stage">
        <div class="term" aria-label="Example agent session">
          <div class="bar"><i></i><i></i><i></i></div>
          <div class="body">
            <div class="you">Mail my mom a birthday postcard. Dana Kim, 12 Oak St, Austin TX 78701. Say I'll call Sunday.</div>
            <div class="call">→ <b>create_postcard</b>(size: "4x6", front_headline: "Happy birthday, Mom!", …)</div>
            <div class="ok">✓ Order ord_8k2m… · $${(PRODUCTS.postcard_4x6.cents / 100).toFixed(2)} · awaiting payment</div>
            <div>Here's the exact card that will print: <u>preview</u>. Pay here and it goes out tomorrow: <u>checkout</u>.</div>
          </div>
        </div>
        <div class="mini" aria-hidden="true">Happy birthday, Mom!</div>
      </div>
    </div>

    <section id="connect"><h2>Connect your agent</h2>
      <div><div class="tabs" role="tablist" aria-label="Install instructions">${tabs}</div>${panels}</div>
    </section>

    <section><h2>Safe to hand to an agent</h2>
      <div class="feat">
        <div><h3>A person pays every order</h3><p>Each order returns a checkout link. There is no stored card or API key, so an agent can draft mail but never spend money on its own.</p></div>
        <div><h3>The preview is the print</h3><p>Every order has a preview URL showing exactly what will be printed and mailed, addresses included.</p></div>
        <div><h3>Reviewed before printing</h3><p>A person checks every piece. Threatening, harassing or fraudulent mail is refused and refunded.</p></div>
        <div><h3>Built for tool calls</h3><p>Idempotency keys make retries safe, and validation errors name every bad field so the agent can fix them in one pass.</p></div>
      </div>
    </section>

    <section><h2>What happens after the tool call</h2>
      <div class="flow">
        <div><span class="n">1 · AGENT</span><b>Drafts and confirms</b><p class="soft">Calls <code>create_postcard</code> or <code>create_letter</code> after checking the address and wording with you.</p></div>
        <div><span class="n">2 · YOU</span><b>Preview and pay</b><p class="soft">Open the preview, then pay with Stripe. Unpaid orders are never mailed.</p></div>
        <div><span class="n">3 · US</span><b>Review and print</b><p class="soft">A person reviews it and prints it, usually within one business day.</p></div>
        <div><span class="n">4 · USPS</span><b>Delivered</b><p class="soft">First-Class, typically 3–5 business days. Your agent can check with <code>get_order</code>.</p></div>
      </div>
    </section>

    <section id="pricing"><h2>Pricing</h2>
      <div class="prices">${Object.values(PRODUCTS)
        .map((p) => `<div class="card"><span class="eyebrow">${esc(p.size)}</span><h3>${esc(p.name)}</h3><div class="price">${usd(p.cents)}</div><p class="soft">${esc(p.blurb)}</p></div>`)
        .join("")}</div>
      <p class="soft">Printing, envelope and First-Class postage included. US addresses only. No subscription.</p>
    </section>

    <section><div class="human"><div style="display:grid;gap:6px"><h2>Not using an agent?</h2><p class="soft">Write a postcard or letter in your browser. Same preview, same price.</p></div><a class="btn" href="/send">Send from the web</a></div></section>

    <section style="max-width:760px"><h2>Questions</h2>
      <div>
        <details class="faq"><summary>Can my agent spend money without me?</summary><p>No. Creating an order costs nothing. It is only printed after a person pays the checkout link in Stripe.</p></details>
        <details class="faq"><summary>Which agents work?</summary><p>Anything that supports remote MCP servers over Streamable HTTP: Codex, Muse Code, Claude Code, Claude Desktop, claude.ai, ChatGPT developer mode, Cursor and VS Code. Everything else can use the REST API.</p></details>
        <details class="faq"><summary>Where can you mail to?</summary><p>US addresses, including Puerto Rico, US territories and APO/FPO/DPO military addresses.</p></details>
        <details class="faq"><summary>What won't you print?</summary><p>Threats, harassment, fraud, impersonation and obscene content, plus bulk marketing. See the <a href="/content-policy">content policy</a>.</p></details>
        <details class="faq"><summary>Is there a machine-readable description?</summary><p><a href="/llms.txt">/llms.txt</a> for language models and <a href="/openapi.json">/openapi.json</a> for the REST API.</p></details>
      </div>
    </section>

    <script>
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    tabs.forEach((t, i) => t.addEventListener("click", () => {
      tabs.forEach((u, j) => { u.setAttribute("aria-selected", String(i === j)); document.getElementById("panel-" + j).hidden = i !== j; });
    }));
    document.querySelectorAll(".copy").forEach((b) => b.addEventListener("click", async () => {
      const text = b.nextElementSibling.textContent;
      try { await navigator.clipboard.writeText(text); b.textContent = "Copied"; }
      catch { const r = document.createRange(); r.selectNodeContents(b.nextElementSibling); getSelection().removeAllRanges(); getSelection().addRange(r); b.textContent = "Press ⌘C"; }
      setTimeout(() => (b.textContent = "Copy"), 1600);
    }));
    </script>`,
    {
      description: `${BRAND} is an MCP server and REST API that lets AI agents (Codex, Muse Code, Claude) send real postcards and letters. You approve and pay; we print and mail via USPS.`,
    },
  );
}
