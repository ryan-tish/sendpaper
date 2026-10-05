import { BASE_URL, BRAND, COLOR_LETTER_CENTS, EXPRESS_CENTS, LIMITS, PRODUCTS, SUPPORT_EMAIL } from "./config.ts";
import { docsUrl, page } from "./layout.ts";
import { esc } from "./render.ts";

const MCP_URL = `${BASE_URL}/mcp`;
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const slug = BRAND.toLowerCase();

// One-line install per client; the picker swaps the command and the "full setup" link.
const INSTALL: { id: string; label: string; cmd: string; doc: string }[] = [
  { id: "codex", label: "Codex", cmd: `codex mcp add ${slug} --url ${MCP_URL}`, doc: "/agents/codex" },
  { id: "claude", label: "Claude Code", cmd: `claude mcp add --transport http ${slug} ${MCP_URL}`, doc: "/agents/claude" },
  { id: "muse", label: "Muse Code", cmd: `"mcp_servers": { "${slug}": { "transport": "streamable_http", "url": "${MCP_URL}" } }`, doc: "/agents/muse-code" },
  { id: "cursor", label: "Cursor", cmd: `{ "mcpServers": { "${slug}": { "url": "${MCP_URL}" } } }`, doc: "/agents/other-clients" },
  { id: "vscode", label: "VS Code", cmd: `code --add-mcp '{"name":"${slug}","type":"http","url":"${MCP_URL}"}'`, doc: "/agents/other-clients" },
  { id: "url", label: "Any MCP client", cmd: MCP_URL, doc: "/agents/other-clients" },
];

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
.hero-wrap { position: relative; margin-inline: -24px; padding-inline: 24px; }
.art { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.art canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.hero { position: relative; display: grid; grid-template-columns: minmax(0, 640px); padding-block: 104px 112px; }
.hero .stack { display: grid; gap: 24px; min-width: 0; }
.stat { display: inline-flex; align-items: center; gap: 8px; justify-self: start; border: 1px solid var(--rule); background: var(--card); border-radius: 8px; padding: 5px 6px 5px 12px; font-size: .86rem; color: var(--soft); text-decoration: none; }
.stat b { font: 500 .8rem var(--f-mono); color: var(--green); background: var(--green-soft); padding: 3px 8px; border-radius: 5px; }
.lede { font-size: 1.15rem; color: var(--soft); max-width: 46ch; }
.lede b { color: var(--ink); font-weight: 600; }
/* Motion (all of it is added by JS only when the visitor hasn't asked for reduced motion; without JS the page is static and complete) */
.rot { display: inline-grid; vertical-align: top; height: 1.5em; line-height: 1.5; overflow: hidden; clip-path: inset(0); }
.rot b { grid-area: 1 / 1; opacity: 0; transform: translateY(100%); transition: opacity .35s ease, transform .35s ease; }
.rot b.on { opacity: 1; transform: none; }
.rot b.off { opacity: 0; transform: translateY(-100%); }
.reveal { opacity: 0; transform: translateY(14px); transition: opacity .6s ease, transform .6s ease; }
.reveal.in { opacity: 1; transform: none; }
.shot.anim .steps > div, .shot.anim .agent { opacity: 0; transform: translateY(6px); transition: opacity .35s ease, transform .35s ease; }
.shot.anim .steps > div.in, .shot.anim .agent.in { opacity: 1; transform: none; }
.shot.anim .you .rest { visibility: hidden; }
.shot.anim .you .caret { display: inline-block; width: 1px; height: 1em; margin-left: 1px; vertical-align: -2px; background: currentColor; animation: blink 1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }
.copy.ok { color: var(--green); background: var(--green-soft); border-color: var(--green-line); }
.ctas { display: flex; gap: 10px; flex-wrap: wrap; }
.cmd { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; min-width: 0; max-width: 600px; }
.cmd-row { display: flex; align-items: center; gap: 8px; min-width: 0; max-width: 100%; border: 1px solid var(--rule); background: var(--tint); border-radius: 10px; padding: 4px; }
.picker { position: relative; flex: none; }
.picker-btn { display: inline-flex; align-items: center; gap: 8px; font: 500 .84rem var(--f-ui); color: var(--ink); background: var(--card); border: 1px solid var(--rule); border-radius: 7px; padding: 6px 10px; cursor: pointer; }
.picker-btn:hover { border-color: var(--faint); }
.picker-btn svg { color: var(--faint); transition: transform .15s; }
.picker-btn[aria-expanded="true"] svg { transform: rotate(180deg); }
.menu { position: absolute; z-index: 30; outline: none; transform-origin: top left; animation: pop .14s ease-out; top: calc(100% + 6px); left: 0; min-width: 196px; margin: 0; padding: 5px; list-style: none; background: var(--card); border: 1px solid var(--rule); border-radius: 10px; box-shadow: 0 16px 40px -18px rgba(13, 21, 18, .35), 0 2px 6px rgba(13, 21, 18, .06); }
@keyframes pop { from { opacity: 0; transform: translateY(-4px) scale(.98); } }
@media (prefers-reduced-motion: reduce) { .menu { animation: none; } }
.menu li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 10px; border-radius: 7px; font-size: .88rem; color: var(--ink); cursor: pointer; }
.menu li.active, .menu li:hover { background: var(--tint); }
.menu li svg { color: var(--green); visibility: hidden; }
.menu li[aria-selected="true"] { font-weight: 500; }
.menu li[aria-selected="true"] svg { visibility: visible; }
.cmd-row code { flex: 1; border: 0; background: none; padding: 0; font-size: .82rem; white-space: nowrap; overflow-x: auto; min-width: 0; scrollbar-width: none; }
.copy { flex: none; font: 500 .76rem var(--f-ui); background: var(--card); color: var(--ink); border: 1px solid var(--rule); border-radius: 6px; padding: 5px 10px; cursor: pointer; }
.cmd a { font-size: .85rem; color: var(--green); text-decoration: none; font-weight: 500; }
.cmd a:hover { color: var(--ink); }
.steps { display: grid; gap: 6px; font-size: .84rem; }
.steps div { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.steps .ok { width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; background: var(--green-soft); color: var(--green); font-size: .7rem; font-weight: 700; }
.steps code { font-size: .8rem; color: var(--green); background: var(--green-soft); border-color: var(--green-line); }
.steps .muted { color: var(--faint); font-size: .82rem; }
.agent { justify-self: start; background: var(--tint); border: 1px solid var(--rule); padding: 10px 13px; border-radius: 14px 14px 14px 4px; max-width: 86%; }
.pay-band { display: flex; justify-content: space-between; align-items: center; gap: 16px 40px; flex-wrap: wrap; background: var(--tint); border: 1px solid var(--rule); border-radius: 16px; padding: 24px 28px; }
.pay-band > div { display: grid; gap: 6px; max-width: 680px; }
.pay-band p { color: var(--soft); font-size: .95rem; }
.more { white-space: nowrap; color: var(--green); text-decoration: none; font-weight: 500; font-size: .95rem; }
.showcase { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1fr); gap: 64px; align-items: center; }
.shot { background: var(--card); border: 1px solid var(--rule); border-radius: 16px; box-shadow: 0 24px 48px -30px rgba(12, 80, 50, .38), 0 2px 6px rgba(13, 21, 18, .04); overflow: hidden; min-width: 0; }
.shot .bar { display: flex; align-items: center; gap: 6px; padding: 11px 14px; border-bottom: 1px solid var(--rule); font: .74rem var(--f-mono); color: var(--faint); }
.shot .bar i { width: 9px; height: 9px; border-radius: 50%; background: var(--rule); }
.shot .bar span { margin-left: 8px; }
.shot .body { padding: 20px; display: grid; gap: 14px; font-size: .92rem; }
.you { justify-self: end; background: var(--btn-bg); color: var(--btn-fg); padding: 10px 13px; border-radius: 14px 14px 4px 14px; max-width: 86%; }
.works { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 28px; padding-block: 28px; border-block: 1px solid var(--rule); color: var(--faint); font-size: .9rem; }
.works a { color: var(--soft); text-decoration: none; font-weight: 500; }
.works a:hover { color: var(--ink); }
.section-head { display: grid; gap: 12px; max-width: 640px; }
.section-head .soft { font-size: 1.05rem; }
.prices { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.prices.two { grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); }
.prices .price small { font: 500 .85rem var(--f-ui); color: var(--faint); margin-right: 4px; }
.prices .card { padding: 24px; gap: 14px; }
.prices dl { margin: 0; display: grid; gap: 0; border-top: 1px solid var(--rule); }
.prices dl div { display: flex; justify-content: space-between; gap: 12px; padding-block: 9px; border-bottom: 1px solid var(--rule); font-size: .9rem; }
.prices dt { color: var(--faint); }
.prices dd { margin: 0; text-align: right; color: var(--ink); }
.prices .btn { justify-content: center; }
.prices .size { font: 600 .8rem var(--f-mono); color: var(--green); letter-spacing: .02em; margin-bottom: -10px; }
.faq { max-width: 760px; gap: 20px; }
details.q { border-bottom: 1px solid var(--rule); padding-block: 16px; }
details.q summary { font-weight: 500; cursor: pointer; list-style: none; display: flex; justify-content: space-between; gap: 16px; }
details.q summary::-webkit-details-marker { display: none; }
details.q summary::after { content: "+"; color: var(--faint); font-family: var(--f-mono); }
details.q[open] summary::after { content: "−"; }
details.q p { color: var(--soft); margin-top: 10px; }
@media (max-width: 900px) { .hero { grid-template-columns: minmax(0, 1fr); padding-block: 48px 56px; } .showcase { grid-template-columns: minmax(0, 1fr); gap: 24px; } }
`;


// Structured data (schema.org) so search and answer engines know what Sendpaper is and what it costs.
// Prices come from PRODUCTS, so they never drift from the site.
function structuredData() {
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${BASE_URL}/#org`, name: BRAND, url: BASE_URL, logo: "https://docs.sendmypaper.com/logo/icon-512.png", email: SUPPORT_EMAIL, sameAs: ["https://github.com/ryan-tish/sendpaper-plugin", "https://docs.sendmypaper.com"] },
      { "@type": "WebSite", "@id": `${BASE_URL}/#site`, name: BRAND, url: BASE_URL, publisher: { "@id": `${BASE_URL}/#org` } },
      {
        "@type": "Service",
        name: `${BRAND}: physical mail for AI agents`,
        serviceType: "Online printing and mailing of postcards and letters",
        provider: { "@id": `${BASE_URL}/#org` },
        areaServed: { "@type": "Country", name: "United States" },
        description: "Send real postcards and letters, including USPS Certified Mail, from an AI agent (MCP server), a REST API, or the web. You preview exactly what prints; a person reviews every piece; it's mailed via USPS.",
        offers: (Object.keys(PRODUCTS) as (keyof typeof PRODUCTS)[]).map((id) => ({ "@type": "Offer", name: PRODUCTS[id].name, price: (PRODUCTS[id].cents / 100).toFixed(2), priceCurrency: "USD", description: PRODUCTS[id].blurb })),
      },
    ],
  };
  // Escape "<" so the JSON can never close the script tag early.
  return `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`;
}

export function landing() {
  const docs = docsUrl();
  return page(
    `${BRAND}: physical mail for AI agents`,
    `${structuredData()}<style>${CSS}</style>
    <div class="hero-wrap">
      <div class="art" aria-hidden="true"><canvas id="lines"></canvas></div>
      <div class="hero">
        <div class="stack">
          <a class="stat" href="/send"><b>$1 off</b> Your first order, any product →</a>
          <h1>Physical mail for AI agents</h1>
          <p class="lede">Real postcards and letters from <b>Codex</b>, <b>Muse</b> and <b>Claude</b>.</p>
          <div class="ctas"><a class="btn" href="${esc(docsUrl("/quickstart"))}">Read the quickstart ›</a><a class="btn alt" href="/send">Send from the web</a></div>
          <div class="cmd">
            <div class="cmd-row">
              <div class="picker">
                <button class="picker-btn" id="agentBtn" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Choose your agent"><span id="agentLabel">${esc(INSTALL[0].label)}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
                <ul class="menu" id="agentMenu" role="listbox" tabindex="-1" aria-label="Agents" hidden>${INSTALL.map((o, i) => `<li role="option" id="opt-${o.id}" data-id="${o.id}" aria-selected="${i === 0}">${esc(o.label)}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg></li>`).join("")}</ul>
              </div>
              <code id="cmd">${esc(INSTALL[0].cmd)}</code><button class="copy" type="button" data-copy="cmd">Copy</button>
            </div>
            <a id="setup" href="${esc(docsUrl(INSTALL[0].doc))}">Full setup for Codex in the docs →</a>
          </div>
        </div>
      </div>
    </div>

    <div class="works"><span>Works with</span>${CLIENTS.map(([n, p]) => `<a href="${esc(docsUrl(p))}">${esc(n)}</a>`).join("")}<span>and anything that speaks MCP or REST</span></div>

    <section class="showcase">
      <div class="section-head"><span class="eyebrow">See it in action</span><h2>One sentence in. Done.</h2><p class="soft">Ask your agent to send something. It confirms the address and wording, pays with your approval, and tells you when it's on its way. You don't have to open a website.</p></div>
      <div class="shot" aria-label="Example: an agent sending and paying for a postcard">
        <div class="bar"><i></i><i></i><i></i><span>muse · sendpaper</span></div>
        <div class="body">
          <div class="you">Mail my mom, Dana Kim, a birthday postcard. She's at 12 Oak St, Austin TX 78701. Say I'll call Sunday.</div>
          <div class="steps">
            <div><span class="ok">✓</span><code>create_postcard</code><span class="muted">4×6 · "Happy birthday, Mom!" · $2.99</span></div>
            <div><span class="ok">✓</span><code>pay_order</code><span class="muted">Link · Visa •• 4242 · approved by you</span></div>
          </div>
          <div class="agent">Your postcard to Dana Kim is paid and goes out tomorrow. It should arrive in 3–5 days, and I'll let you know when it ships.</div>
        </div>
      </div>
    </section>

    <section id="pricing">
      <div class="section-head"><span class="eyebrow">Pricing</span><h2>Pay per piece. No subscription.</h2><p class="soft">Printing, envelope and USPS First-Class postage included. US addresses only.</p></div>
      <div class="offer-banner"><span><b>$1 off your first order.</b> Any postcard or letter. Taken off automatically, one per return address.</span><a href="/send" class="more">Send one →</a></div>
      <div class="prices two">
        <div class="card"><span class="size">4×6 · 6×9 · 6×11</span><h3>Postcard</h3><div class="price"><small>from</small> ${usd(PRODUCTS.postcard_4x6.cents)}</div>
          <dl>
            <div><dt>4×6</dt><dd>${usd(PRODUCTS.postcard_4x6.cents)}</dd></div>
            <div><dt>6×9</dt><dd>${usd(PRODUCTS.postcard_6x9.cents)}</dd></div>
            <div><dt>6×11</dt><dd>${usd(PRODUCTS.postcard_6x11.cents)}</dd></div>
            <div><dt>Front</dt><dd>Text, photo, photo + caption, or collage</dd></div>
            <div><dt>Express delivery</dt><dd>+${usd(EXPRESS_CENTS)}</dd></div>
            <div><dt>Postage</dt><dd>First-Class, included</dd></div>
          </dl>
          <a class="btn green" href="/send?product=postcard_4x6">Send a postcard</a></div>
        <div class="card"><span class="size">8.5×11 · #10 envelope</span><h3>Letter</h3><div class="price"><small>from</small> ${usd(PRODUCTS.letter.cents)}</div>
          <dl>
            <div><dt>First-Class</dt><dd>${usd(PRODUCTS.letter.cents)}</dd></div>
            <div><dt>Certified Mail</dt><dd>${usd(PRODUCTS.letter_certified.cents)}</dd></div>
            <div><dt>Certified + return receipt</dt><dd>${usd(PRODUCTS.letter_certified_rr.cents)}</dd></div>
            <div><dt>Write it or upload a PDF</dt><dd>Up to ${LIMITS.pdfPages} pages</dd></div>
            <div><dt>Color (photo or PDF)</dt><dd>+${usd(COLOR_LETTER_CENTS)}</dd></div>
            <div><dt>Express delivery</dt><dd>+${usd(EXPRESS_CENTS)}</dd></div>
          </dl>
          <a class="btn green" href="/send?product=letter">Send a letter</a></div>
      </div>
      <p class="soft" style="margin:0;font-size:.9rem">Certified Mail gives you a USPS tracking number and proof of delivery; the return receipt adds the recipient's signature. Express goes by USPS Priority Mail (usually 2–3 days, tracked). You choose options when you order. <a href="/certified-mail-online">How certified mail works →</a></p>
    </section>

    <section class="pay-line">
      <div class="pay-band"><div><h3>Your agent can pay, with your OK.</h3><p>Sendpaper accepts Stripe's one-time agent payment tokens. You approve the amount and your card is never shared. Prefer to pay yourself? Every order has a checkout link too.</p></div>
      <a class="more" href="${esc(docsUrl("/guides/agent-payments"))}">How it works →</a></div>
    </section>

    <section class="faq">
      <div class="section-head"><span class="eyebrow">FAQ</span><h2>Questions</h2></div>
      <div>
        <details class="q"><summary>Is there a first-order discount?</summary><p>Yes: $1 off your first order, any postcard or letter, one per return address. It's taken off the price automatically when the order is created, so the checkout total already includes it. <a href="/reviews">See what senders say</a>.</p></details>
        <details class="q"><summary>Can you send certified mail?</summary><p>Yes. Letters can go by USPS Certified Mail ($14.99) with a tracking number and proof of delivery, or with a return receipt ($19.99) that adds the recipient's signature. Ask your agent to "send it certified", or choose it under Mailing on the <a href="/send?product=letter_certified">web form</a>.</p></details>
        <details class="q"><summary>Can I mail my own PDF?</summary><p>Yes. Upload a PDF of up to ${LIMITS.pdfPages} pages (any page size is fitted to 8.5×11) and we print and mail it as a letter, by First-Class, Certified Mail or express. We add an address page in front, so your document needs no room for addresses. <a href="/mail-a-pdf">How it works</a>.</p></details>
        <details class="q"><summary>Can it get there faster?</summary><p>Yes. Express sends postcards and letters by USPS Priority Mail, usually 2 to 3 days with tracking, for ${usd(EXPRESS_CENTS)} more. It can't be combined with Certified Mail, which already includes tracking.</p></details>
        <details class="q"><summary>Do you give legal or tax advice?</summary><p>No. We print and mail what you or your agent writes. For deadlines and the right address, check the notice itself, the agency, or a professional.</p></details>
        <details class="q"><summary>Can my agent pay for me?</summary><p>Yes, if you let it. Agents pay with a one-time Stripe token capped at the order's exact price, which you approve in your agent (for example through Stripe Link). Your card details are never shared. Or pay the checkout link yourself. Either way, nothing is mailed until it's paid.</p></details>
        <details class="q"><summary>Which agents work?</summary><p>Anything that supports remote MCP servers over Streamable HTTP: Codex, Muse Code, Claude Code, Claude Desktop, claude.ai, ChatGPT developer mode, Cursor and VS Code. Everything else can use the <a href="${esc(docsUrl("/api/introduction"))}">REST API</a>.</p></details>
        <details class="q"><summary>Where can you mail to?</summary><p>US addresses, including Puerto Rico, US territories and APO/FPO/DPO military addresses.</p></details>
        <details class="q"><summary>What won't you print?</summary><p>Threats, harassment, fraud, impersonation and obscene content, plus bulk marketing. See the <a href="/content-policy">content policy</a>.</p></details>
        <details class="q"><summary>Is there a machine-readable description?</summary><p><a href="/llms.txt">/llms.txt</a> for language models, <a href="/openapi.json">/openapi.json</a> for the REST API, and the <a href="${esc(docs)}">docs</a> for everything else.</p></details>
      </div>
    </section>

    <script>
    const INSTALL = ${JSON.stringify(INSTALL.map((o) => ({ ...o, doc: docsUrl(o.doc) })))};
    const btn = document.getElementById("agentBtn"), menu = document.getElementById("agentMenu");
    const opts = [...menu.querySelectorAll('[role="option"]')];
    let active = 0;
    function pick(id, save) {
      const o = INSTALL.find((x) => x.id === id) || INSTALL[0];
      document.getElementById("cmd").textContent = o.cmd;
      document.getElementById("agentLabel").textContent = o.label;
      const a = document.getElementById("setup"); a.href = o.doc; a.textContent = "Full setup for " + o.label + " in the docs →";
      opts.forEach((li) => li.setAttribute("aria-selected", String(li.dataset.id === o.id)));
      if (save) try { localStorage.setItem("agent", o.id); } catch {}
    }
    function setActive(i) {
      active = (i + opts.length) % opts.length;
      opts.forEach((li, j) => li.classList.toggle("active", j === active));
      menu.setAttribute("aria-activedescendant", opts[active].id);
    }
    function open() { menu.hidden = false; btn.setAttribute("aria-expanded", "true"); setActive(Math.max(0, opts.findIndex((li) => li.getAttribute("aria-selected") === "true"))); menu.focus({ preventScroll: true }); }
    function close(focusBtn) { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); if (focusBtn) btn.focus(); }
    btn.addEventListener("click", () => (menu.hidden ? open() : close()));
    btn.addEventListener("keydown", (e) => { if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); open(); } });
    menu.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Home") { e.preventDefault(); setActive(0); }
      else if (e.key === "End") { e.preventDefault(); setActive(opts.length - 1); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(opts[active].dataset.id, true); close(true); }
      else if (e.key === "Escape" || e.key === "Tab") close(e.key === "Escape");
    });
    opts.forEach((li, i) => { li.addEventListener("mousemove", () => setActive(i)); li.addEventListener("click", () => { pick(li.dataset.id, true); close(true); }); });
    document.addEventListener("click", (e) => { if (!menu.hidden && !e.target.closest(".picker")) close(); });
    try { const saved = localStorage.getItem("agent"); if (saved) pick(saved); } catch {}
    document.querySelectorAll(".copy").forEach((b) => b.addEventListener("click", async () => {
      const el = document.getElementById(b.dataset.copy);
      try { await navigator.clipboard.writeText(el.textContent); b.textContent = "Copied ✓"; b.classList.add("ok"); }
      catch { const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); b.textContent = "Press ⌘C"; }
      setTimeout(() => { b.textContent = "Copy"; b.classList.remove("ok"); }, 1600);
    }));
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Hero: cycle the agent name ("from Codex" → "Muse" → …). Screen readers keep the full static sentence.
      const lede = document.querySelector(".lede");
      if (lede) {
        const names = ["Codex", "Muse", "Claude", "ChatGPT", "Cursor"];
        lede.innerHTML = '<span class="sr-only">Real postcards and letters from Codex, Muse and Claude.</span><span aria-hidden="true">Real postcards and letters from <span class="rot">' + names.map((n, i) => '<b class="' + (i ? "" : "on") + '">' + n + "</b>").join("") + "</span></span>";
        const words = [...lede.querySelectorAll(".rot b")];
        let k = 0;
        setInterval(() => {
          const prev = words[k]; k = (k + 1) % words.length;
          prev.classList.replace("on", "off"); setTimeout(() => prev.classList.remove("off"), 400);
          words[k].classList.add("on");
        }, 2200);
      }
      // Sections fade up once as they scroll in.
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px" });
      document.querySelectorAll(".wrap > section, .works").forEach((el) => { el.classList.add("reveal"); io.observe(el); });
      // The chat demo plays itself while it's on screen: type the ask, tick the two tool calls, then the agent's reply. Loops.
      const shot = document.querySelector(".shot");
      if (shot) {
        const you = shot.querySelector(".you"), text = you.textContent, steps = [...shot.querySelectorAll(".steps > div")], reply = shot.querySelector(".agent");
        shot.classList.add("anim");
        let timers = [], visible = false, running = false;
        const later = (ms, f) => timers.push(setTimeout(f, ms));
        function reset() { timers.forEach(clearTimeout); timers = []; steps.concat(reply).forEach((el) => el.classList.remove("in")); you.innerHTML = '<span class="typed"></span><span class="caret"></span><span class="rest"></span>'; you.lastChild.textContent = text; }
        function play() {
          running = true; reset();
          const typed = you.querySelector(".typed"), rest = you.querySelector(".rest");
          let i = 0;
          (function type() { typed.textContent = text.slice(0, i); rest.textContent = text.slice(i); if (i++ < text.length) later(22, type); else { you.querySelector(".caret").remove();
            later(500, () => steps[0].classList.add("in"));
            later(1300, () => steps[1].classList.add("in"));
            later(2300, () => reply.classList.add("in"));
            later(7500, () => (visible ? play() : (running = false)));
          } })();
        }
        new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !running) play(); }, { threshold: 0.4 }).observe(shot);
      }
    }
    // Hairline curves fanning across the hero. They drift slowly (the fan opens, closes and twists) while the hero is on
    // screen; reduced-motion visitors get one still frame.
    (function () {
      const c = document.getElementById("lines");
      if (!c) return;
      const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const dark = () => document.documentElement.dataset.theme === "dark";
      let W = 0, H = 0, x = null, raf = 0, onScreen = true;
      function size() {
        const r = c.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
        W = r.width; H = r.height; c.width = W * dpr; c.height = H * dpr;
        x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      function draw(ms) {
        const p = ms / 1000, a = dark() ? 0.5 : 0.75;
        const open = 1 + 0.42 * Math.sin(p * 0.7), twist = 0.16 * Math.sin(p * 0.5 + 1), sway = 0.06 * Math.sin(p * 0.37);
        x.clearRect(0, 0, W, H);
        for (let i = 0; i < 64; i++) {
          const t = i / 63;
          x.beginPath();
          x.moveTo(W * (0.38 + sway) + t * W * 0.12, H + 10);
          x.bezierCurveTo(W * (0.6 + twist * (t - 0.5)), H * (0.8 - t * 0.35 * open), W * (0.76 - twist * (t - 0.5)), H * (0.28 + t * 0.22 * open), W + 30, -30 + t * H * 0.3 * (2 - open));
          const g = x.createLinearGradient(W * 0.38, H, W, 0);
          g.addColorStop(0, "rgba(16,150,100,0)");
          g.addColorStop(0.3, "rgba(" + Math.round(30 + t * 120) + "," + Math.round(160 + t * 50) + "," + Math.round(100 - t * 50) + "," + a + ")");
          g.addColorStop(1, "rgba(170,230,80," + a * 0.5 + ")");
          x.strokeStyle = g; x.lineWidth = 1; x.stroke();
        }
      }
      function loop(ms) { draw(ms); raf = onScreen ? requestAnimationFrame(loop) : 0; }
      size();
      if (still) { draw(0); addEventListener("resize", () => { size(); draw(0); }); addEventListener("themechange", () => draw(0)); return; }
      addEventListener("resize", size);
      new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; if (onScreen && !raf) raf = requestAnimationFrame(loop); }).observe(c);
      raf = requestAnimationFrame(loop);
    })();
    </script>`,
    {
      description: `${BRAND} is an MCP server and REST API that lets AI agents (Codex, Muse Code, Claude) send real postcards and letters. You approve and pay; we print and mail via USPS.`,
    },
  );
}
