import { BASE_URL, BRAND, PRODUCTS } from "./config.ts";
import { docsUrl, page } from "./layout.ts";
import { esc } from "./render.ts";

const MCP_URL = `${BASE_URL}/mcp`;
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const slug = BRAND.toLowerCase();
const COMMAND = `codex mcp add ${slug} --url ${MCP_URL}`;

// Setup lives in the docs (one source of truth); the homepage keeps one copyable command and these links.
const CLIENTS: [string, string][] = [
  ["Codex", "/agents/codex"],
  ["Muse Code", "/agents/muse-code"],
  ["Claude", "/agents/claude"],
  ["ChatGPT", "/agents/other-clients"],
  ["Cursor", "/agents/other-clients"],
  ["VS Code", "/agents/other-clients"],
];

const CSS = `
.hero-wrap { position: relative; margin-inline: -24px; padding-inline: 24px; overflow: hidden; }
.hero-wrap canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.hero { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.02fr); gap: 56px; align-items: center; padding-block: 72px 80px; }
.hero .stack { display: grid; gap: 24px; min-width: 0; }
.stat { display: inline-flex; align-items: center; gap: 8px; justify-self: start; border: 1px solid var(--rule); background: var(--card); border-radius: 8px; padding: 5px 6px 5px 12px; font-size: .86rem; color: var(--soft); text-decoration: none; }
.stat b { font: 500 .8rem var(--f-mono); color: var(--green); background: var(--green-soft); padding: 3px 8px; border-radius: 5px; }
.lede { font-size: 1.15rem; color: var(--soft); max-width: 46ch; }
.lede b { color: var(--ink); font-weight: 600; }
.ctas { display: flex; gap: 10px; flex-wrap: wrap; }
.cmd { display: grid; gap: 8px; justify-items: start; min-width: 0; }
.cmd-row { display: flex; align-items: center; gap: 6px; max-width: 100%; border: 1px solid var(--rule); background: var(--tint); border-radius: 8px; padding: 4px 4px 4px 12px; }
.cmd-row code { border: 0; background: none; padding: 0; font-size: .82rem; white-space: nowrap; overflow-x: auto; min-width: 0; }
.copy { flex: none; font: 500 .76rem var(--f-ui); background: var(--card); color: var(--ink); border: 1px solid var(--rule); border-radius: 6px; padding: 5px 10px; cursor: pointer; }
.cmd a { font-size: .85rem; color: var(--soft); text-decoration: none; }
.cmd a:hover { color: var(--ink); }
.shot { background: var(--card); border: 1px solid var(--rule); border-radius: 16px; box-shadow: 0 40px 80px -40px rgba(12, 80, 50, .45), 0 2px 6px rgba(13, 21, 18, .04); overflow: hidden; min-width: 0; }
.shot .bar { display: flex; align-items: center; gap: 6px; padding: 11px 14px; border-bottom: 1px solid var(--rule); font: .74rem var(--f-mono); color: var(--faint); }
.shot .bar i { width: 9px; height: 9px; border-radius: 50%; background: var(--rule); }
.shot .bar span { margin-left: 8px; }
.shot .body { padding: 20px; display: grid; gap: 14px; font-size: .92rem; }
.you { justify-self: end; background: var(--btn-bg); color: var(--btn-fg); padding: 10px 13px; border-radius: 14px 14px 4px 14px; max-width: 86%; }
.tool { font: .8rem/1.5 var(--f-mono); color: var(--green); background: var(--green-soft); border: 1px solid var(--green-line); padding: 9px 11px; border-radius: 9px; overflow-x: auto; }
.reply { color: var(--soft); max-width: 92%; }
.order { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 14px; align-items: center; border: 1px solid var(--rule); border-radius: 12px; padding: 10px; }
.order .pc { aspect-ratio: 3/2; border-radius: 5px; background: linear-gradient(135deg, #12805a, #86cf63); color: #fff; font: 600 .74rem/1.15 var(--f-ui); display: grid; place-items: center; text-align: center; padding: 8px; box-shadow: 0 6px 14px -8px rgba(15, 122, 82, .7); }
.order small { display: block; color: var(--faint); font: .72rem var(--f-mono); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 2px; }
.order .links2 { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.order .links2 span { font-size: .8rem; border: 1px solid var(--rule); border-radius: 6px; padding: 3px 8px; }
.order .links2 span.pay { background: var(--btn-bg); color: var(--btn-fg); border-color: var(--btn-bg); }
.works { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 26px; padding-block: 26px; border-block: 1px solid var(--rule); color: var(--faint); font-size: .9rem; }
.works a { color: var(--soft); text-decoration: none; font-weight: 500; }
.works a:hover { color: var(--ink); }
.section-head { display: grid; gap: 10px; max-width: 640px; }
.feat { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.feat .card { padding: 22px; gap: 10px; }
.feat .ic { width: 34px; height: 34px; border-radius: 9px; background: var(--green-soft); border: 1px solid var(--green-line); display: grid; place-items: center; }
.feat p { color: var(--soft); font-size: .95rem; }
.flow { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); border: 1px solid var(--rule); border-radius: 14px; overflow: hidden; background: var(--card); }
.flow > div { padding: 22px; border-right: 1px solid var(--rule); display: grid; gap: 8px; align-content: start; }
.flow > div:last-child { border-right: 0; }
.flow .n { font: 500 .74rem var(--f-mono); color: var(--green); letter-spacing: .06em; }
.flow p { color: var(--soft); font-size: .93rem; }
.prices { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.prices .card { padding: 24px; }
.prices .card p { color: var(--soft); font-size: .93rem; }
.band { display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; background: var(--tint); border: 1px solid var(--rule); border-radius: 16px; padding: 28px; }
.faq { max-width: 760px; }
details.q { border-bottom: 1px solid var(--rule); padding-block: 16px; }
details.q summary { font-weight: 500; cursor: pointer; list-style: none; display: flex; justify-content: space-between; gap: 16px; }
details.q summary::-webkit-details-marker { display: none; }
details.q summary::after { content: "+"; color: var(--faint); font-family: var(--f-mono); }
details.q[open] summary::after { content: "−"; }
details.q p { color: var(--soft); margin-top: 10px; }
@media (max-width: 900px) { .hero { grid-template-columns: minmax(0, 1fr); padding-block: 44px 56px; gap: 36px; } .flow > div { border-right: 0; border-bottom: 1px solid var(--rule); } .flow > div:last-child { border-bottom: 0; } }
`;

const icon = (d: string) =>
  `<span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg></span>`;

export function landing() {
  const docs = docsUrl();
  return page(
    `${BRAND}: physical mail for AI agents`,
    `<style>${CSS}</style>
    <div class="hero-wrap">
      <canvas id="lines" aria-hidden="true"></canvas>
      <div class="hero">
        <div class="stack">
          <a class="stat" href="${esc(docsUrl("/guides/mcp-tools"))}">MCP tools <b>5 · no API key</b></a>
          <h1>Physical mail for AI agents</h1>
          <p class="lede">Real postcards and letters from <b>Codex</b>, <b>Muse</b> and <b>Claude</b>. Your agent writes it, you approve and pay, and we print and mail it.</p>
          <div class="ctas"><a class="btn" href="${esc(docsUrl("/quickstart"))}">Read the quickstart ›</a><a class="btn alt" href="/send">Send from the web</a></div>
          <div class="cmd">
            <div class="cmd-row"><code id="cmd">${esc(COMMAND)}</code><button class="copy" type="button" data-copy="cmd">Copy</button></div>
            <a href="${esc(docsUrl("/quickstart"))}">Setup for Claude, Muse Code and other clients in the docs →</a>
          </div>
        </div>
        <div class="shot" aria-label="Example: an agent sending a postcard">
          <div class="bar"><i></i><i></i><i></i><span>codex · sendpaper</span></div>
          <div class="body">
            <div class="you">Mail my mom a birthday postcard. She's at 12 Oak St, Austin TX 78701. Say I'll call Sunday.</div>
            <div class="tool">create_postcard · 4×6 · front_headline: "Happy birthday, Mom!"</div>
            <div class="reply">Here's the exact card that will print. Pay and it goes out tomorrow.</div>
            <div class="order"><div class="pc">Happy birthday, Mom!</div>
              <div><small>ord_8k2m · awaiting payment</small>Postcard 4×6 to Dana Kim, <b>${usd(PRODUCTS.postcard_4x6.cents)}</b>
                <div class="links2"><span>Preview</span><span class="pay">Pay ${usd(PRODUCTS.postcard_4x6.cents)}</span></div></div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="works"><span>Works with</span>${CLIENTS.map(([n, p]) => `<a href="${esc(docsUrl(p))}">${esc(n)}</a>`).join("")}<span>and anything that speaks MCP or REST</span></div>

    <section>
      <div class="section-head"><span class="eyebrow">Safe by design</span><h2>Built to hand to an agent</h2></div>
      <div class="feat">
        <div class="card">${icon('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>')}<h3>A person pays every order</h3><p>Each order returns a checkout link. There's no stored card or API key, so an agent can draft mail but never spend money on its own.</p></div>
        <div class="card">${icon('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>')}<h3>The preview is the print</h3><p>Every order has a preview link showing exactly what will be printed and mailed, addresses included.</p></div>
        <div class="card">${icon('<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>')}<h3>Reviewed before printing</h3><p>A person checks every piece. Threatening, harassing or fraudulent mail is refused and refunded.</p></div>
        <div class="card">${icon('<path d="M4 17l6-6-6-6M12 19h8"/>')}<h3>Built for tool calls</h3><p>Idempotency keys make retries safe, and validation errors name every bad field so the agent can fix them in one pass.</p></div>
      </div>
    </section>

    <section>
      <div class="section-head"><span class="eyebrow">How it works</span><h2>What happens after the tool call</h2></div>
      <div class="flow">
        <div><span class="n">01 · AGENT</span><h3>Drafts and confirms</h3><p>Calls <code>create_postcard</code> or <code>create_letter</code> after checking the address and wording with you.</p></div>
        <div><span class="n">02 · YOU</span><h3>Preview and pay</h3><p>Open the preview, then pay with Stripe. Unpaid orders are never mailed.</p></div>
        <div><span class="n">03 · US</span><h3>Review and print</h3><p>A person reviews it and prints it, usually within one business day.</p></div>
        <div><span class="n">04 · USPS</span><h3>Delivered</h3><p>First-Class, typically 3–5 business days. Your agent can check with <code>get_order</code>.</p></div>
      </div>
    </section>

    <section id="pricing">
      <div class="section-head"><span class="eyebrow">Pricing</span><h2>Pay per piece. No subscription.</h2><p class="soft">Printing, envelope and USPS First-Class postage included. US addresses only.</p></div>
      <div class="prices">${Object.values(PRODUCTS)
        .map((p) => `<div class="card"><span class="eyebrow">${esc(p.size)}</span><h3>${esc(p.name)}</h3><div class="price">${usd(p.cents)}</div><p>${esc(p.blurb)}</p></div>`)
        .join("")}</div>
    </section>

    <section><div class="band"><div style="display:grid;gap:6px"><h2>Not using an agent?</h2><p class="soft">Write a postcard or letter in your browser. Same preview, same price.</p></div><a class="btn" href="/send">Send from the web</a></div></section>

    <section class="faq">
      <div class="section-head"><span class="eyebrow">FAQ</span><h2>Questions</h2></div>
      <div>
        <details class="q"><summary>Can my agent spend money without me?</summary><p>No. Creating an order costs nothing. It's only printed after a person pays the checkout link in Stripe.</p></details>
        <details class="q"><summary>Which agents work?</summary><p>Anything that supports remote MCP servers over Streamable HTTP: Codex, Muse Code, Claude Code, Claude Desktop, claude.ai, ChatGPT developer mode, Cursor and VS Code. Everything else can use the <a href="${esc(docsUrl("/api/introduction"))}">REST API</a>.</p></details>
        <details class="q"><summary>Where can you mail to?</summary><p>US addresses, including Puerto Rico, US territories and APO/FPO/DPO military addresses.</p></details>
        <details class="q"><summary>What won't you print?</summary><p>Threats, harassment, fraud, impersonation and obscene content, plus bulk marketing. See the <a href="/content-policy">content policy</a>.</p></details>
        <details class="q"><summary>Is there a machine-readable description?</summary><p><a href="/llms.txt">/llms.txt</a> for language models, <a href="/openapi.json">/openapi.json</a> for the REST API, and the <a href="${esc(docs)}">docs</a> for everything else.</p></details>
      </div>
    </section>

    <script>
    document.querySelectorAll(".copy").forEach((b) => b.addEventListener("click", async () => {
      const el = document.getElementById(b.dataset.copy);
      try { await navigator.clipboard.writeText(el.textContent); b.textContent = "Copied"; }
      catch { const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); b.textContent = "Press ⌘C"; }
      setTimeout(() => (b.textContent = "Copy"), 1600);
    }));
    // Hairline curves fanning across the hero (drawn once, redrawn on resize; skipped for reduced motion).
    (function () {
      const c = document.getElementById("lines");
      if (!c || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const dark = () => matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light";
      function draw() {
        const r = c.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
        c.width = r.width * dpr; c.height = r.height * dpr;
        const x = c.getContext("2d"); x.scale(dpr, dpr);
        const W = r.width, H = r.height, a = dark() ? 0.5 : 0.75;
        for (let i = 0; i < 64; i++) {
          const t = i / 63;
          x.beginPath();
          x.moveTo(W * 0.38 + t * W * 0.12, H + 10);
          x.bezierCurveTo(W * 0.6, H * (0.8 - t * 0.35), W * 0.76, H * (0.28 + t * 0.22), W + 30, -30 + t * H * 0.3);
          const g = x.createLinearGradient(W * 0.38, H, W, 0);
          g.addColorStop(0, "rgba(16,150,100,0)");
          g.addColorStop(0.3, "rgba(" + Math.round(30 + t * 120) + "," + Math.round(160 + t * 50) + "," + Math.round(100 - t * 50) + "," + a + ")");
          g.addColorStop(1, "rgba(170,230,80," + a * 0.5 + ")");
          x.strokeStyle = g; x.lineWidth = 1; x.stroke();
        }
      }
      draw(); addEventListener("resize", draw);
    })();
    </script>`,
    {
      description: `${BRAND} is an MCP server and REST API that lets AI agents (Codex, Muse Code, Claude) send real postcards and letters. You approve and pay; we print and mail via USPS.`,
    },
  );
}
