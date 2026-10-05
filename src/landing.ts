import { BASE_URL, BRAND, EXPRESS_CENTS, FIRST_ORDER_DISCOUNT_PCT, LIMITS, OFFER_ACTIVE, PRODUCTS, SUPPORT_EMAIL } from "./config.ts";
import { docsUrl, page } from "./layout.ts";
import { esc } from "./render.ts";

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;


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
.rot { display: inline-grid; vertical-align: top; height: 1.6em; line-height: 1.6; overflow: hidden; clip-path: inset(0); }
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
.ctas { display: flex; gap: 10px; flex-wrap: wrap; }
.cmd { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; min-width: 0; max-width: 600px; }
@keyframes pop { from { opacity: 0; transform: translateY(-4px) scale(.98); } }
.cmd a { font-size: .85rem; color: var(--green); text-decoration: none; font-weight: 500; }
.cmd a:hover { color: var(--ink); }
.steps { display: grid; gap: 6px; font-size: .84rem; }
.steps div { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.steps .ok { width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; background: var(--green-soft); color: var(--green); font-size: .7rem; font-weight: 700; }
.steps code { font-size: .8rem; color: var(--green); background: var(--green-soft); border-color: var(--green-line); }
.steps .muted { color: var(--faint); font-size: .82rem; }
.agent { justify-self: start; background: var(--tint); border: 1px solid var(--rule); padding: 10px 13px; border-radius: 14px 14px 14px 4px; max-width: 86%; }
.pay-band { display: flex; justify-content: space-between; align-items: center; gap: 16px 40px; flex-wrap: wrap; background: var(--tint); border: 1px solid var(--rule); border-radius: 16px; padding: 24px 28px; }
#pricing .pay-band { margin-top: -28px; } /* section gap 36 + card margin 16 → 24px under the cards */
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
.prices.three { grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); }
.pcard { display: flex; flex-direction: column; gap: 12px; padding: 26px; }
.pcard h3 { margin: 0; font-size: 1.15rem; }
.pcard .purpose { color: var(--ink); font-weight: 500; }
.pcard dl { margin: 0; font-size: .88rem; border-bottom: 1px solid var(--rule); }
.pcard dl > div { display: grid; grid-template-columns: 74px minmax(0, 1fr); align-items: baseline; gap: 10px; padding: 9px 0; border-top: 1px solid var(--rule); }
.pcard dt { font: 500 .7rem var(--f-mono); color: var(--faint); text-transform: uppercase; letter-spacing: .06em; }
.pcard dd { margin: 0; color: var(--ink); }
/* Each card is a subgrid row-span, so the name, price, purpose line, spec table and button line up across cards
   even when one purpose line wraps. */
@supports (grid-template-rows: subgrid) {
  .prices.three { row-gap: 0; }
  .prices.three .pcard { display: grid; grid-row: span 5; grid-template-rows: subgrid; row-gap: 12px; margin-bottom: 16px; }
}
.pcard p { margin: 0; font-size: .92rem; }
.pcard .btn { margin-top: auto; }
.prices .price small { font: 500 .85rem var(--f-ui); color: var(--faint); margin-right: 4px; }
.prices .card { padding: 24px; gap: 14px; }
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
          ${OFFER_ACTIVE ? `<a class="stat" href="/send"><b>${FIRST_ORDER_DISCOUNT_PCT}% off</b> Your first order, any product →</a>` : ""}
          <h1>Physical mail for AI agents</h1>
          <p class="lede">Real postcards and letters from <b>Codex</b>, <b>Muse</b> and <b>Claude</b>.</p>
          <div class="ctas"><a class="btn" href="${esc(docsUrl("/quickstart"))}">Read the quickstart ›</a><a class="btn green" href="/send">Send mail now</a></div>
          <div class="cmd">
            <a id="setup" href="${esc(docsUrl("/agents/codex"))}">Full setup for Codex in the docs →</a>
          </div>
        </div>
      </div>
    </div>

    <div class="works"><span>Works with</span>${CLIENTS.map(([n, p]) => `<a href="${esc(docsUrl(p))}">${esc(n)}</a>`).join("")}<span>and anything that speaks MCP or REST</span></div>

    <section class="showcase">
      <div class="section-head"><span class="eyebrow">See it in action</span><h2>From prompt to post</h2><p class="soft">Tell your AI agent what to send and where. Review the message, approve the payment, and we'll print and mail it. Your agent lets you know when it's on its way, all from your chat.</p></div>
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
      <div class="prices three">
${[
          ["Postcard", PRODUCTS.postcard_4x6.cents, "For photos and quick notes", "4×6, 6×9 or 6×11 card", "Printing and postage", "First-Class or express", "/send/postcard", "Send a postcard"],
          ["Letter", PRODUCTS.letter.cents, "For documents and correspondence", "Up to 3 pages, 8.5×11", "Printing, envelope, postage", "First-Class or express", "/send/letter", "Send a letter"],
          ["Certified letter", PRODUCTS.letter_certified.cents, "For mail that needs delivery documentation", "Up to 3 pages, 8.5×11", "Printing, envelope, postage", "Tracked, proof of delivery", "/send/certified", "Send a certified letter"],
        ].map(([name, cents, purpose, format, incl, delivery, href, cta]) => `<div class="card pcard"><h3>${name}</h3><div class="price"><small>from</small> ${usd(cents as number)}</div>
          <p class="purpose">${purpose}</p>
          <dl><div><dt>Format</dt><dd>${format}</dd></div><div><dt>Included</dt><dd>${incl}</dd></div><div><dt>Delivery</dt><dd>${delivery}</dd></div></dl>
          <a class="btn green" href="${href}">${cta}</a></div>`).join("")}
      </div>
      <div class="pay-band"><div><h3>Your agent can pay, with your OK.</h3><p>Sendpaper accepts Stripe's one-time agent payment tokens. You approve the amount and your card is never shared. Prefer to pay yourself? Every order has a checkout link too.</p></div>
      <a class="more" href="${esc(docsUrl("/guides/agent-payments"))}">How it works →</a></div>
    </section>

    <section class="faq">
      <div class="section-head"><span class="eyebrow">FAQ</span><h2>Questions</h2></div>
      <div>
        <details class="q"><summary>Is there a first-order discount?</summary><p>${OFFER_ACTIVE ? `Right now, yes: ${FIRST_ORDER_DISCOUNT_PCT}% off your first order, any postcard or letter, one per return address.` : "Not at the moment."} It's taken off the price automatically when the order is created, so the checkout total already includes it. <a href="/reviews">See what senders say</a>.</p></details>
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
