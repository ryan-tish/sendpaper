// Comparison pages (content plan, 2026-10-08). Rules (Ryan): be honest, including where the other service is
// better or cheaper. Every competitor fact needs a primary source with an access date; say "not found in the
// documentation we reviewed" rather than "doesn't support". Competitor prices expire: re-check on each source's
// expiry trigger (research ledger: the private ryan-tish/sendpaper-content repo, sources/compare-<slug>.md).
// We don't use the compared service: our printing partner is PostGrid. Say so on the page.
import { BRAND, LIMITS, PRODUCTS } from "./config.ts";
import { ARTICLE_CSS, INDEX_CSS } from "./guides.ts";
import { docsUrl, page } from "./layout.ts";
import { esc } from "./render.ts";

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const P = PRODUCTS;

type Compare = {
  slug: string; // served at /compare/<slug>
  rival: string;
  title: string;
  description: string;
  lede: string;
  checked: string; // when the competitor facts were last checked, shown on the page
  answer: string[]; // the short answer, as paragraphs
  table: { head: [string, string, string]; rows: [string, string, string][] };
  prices: { note: string; rows: [string, string, string][] };
  rivalFits: string[];
  usFits: string[];
  weaker: string[];
  faqs: [string, string][];
  sources: [string, string][];
};

export const COMPARES: Compare[] = [
  {
    slug: "lob",
    rival: "Lob",
    title: "Sendpaper vs. Lob: which fits your mailing workflow?",
    description: `Lob is cheaper per piece and built for high-volume mail. ${BRAND} needs no account and works from AI agents. Setup, prices and fit, compared honestly.`,
    lede: `Lob and ${BRAND} both print and mail letters and postcards through USPS, but they're built for different jobs. Lob is a platform for businesses sending mail at volume. ${BRAND} is for sending one letter, a certified letter or a few postcards now, often from an AI agent, without opening an account.`,
    checked: "October 8, 2026",
    answer: [
      "If you send hundreds or thousands of pieces, run mail from a CRM, or need international mail, Lob fits better, and its published per-piece prices are far lower than ours.",
      `If you (or your AI agent) need to send a single letter, a certified letter or a handful of postcards to US addresses without setting up an account, API keys or prepaid credit, ${BRAND} is the simpler path: each order has its own checkout, and a person reviews every piece before it prints.`,
    ],
    table: {
      head: ["", "Lob", BRAND],
      rows: [
        ["Built for", "Businesses sending mail at volume: marketing and operational mail, CRM-triggered sends", "People and AI agents sending one-off or small-group personal and transactional mail"],
        ["Getting started", "Create an account; before live mail, verify your email, add a payment method and fund prepaid Lob Credits (even on the free Developer plan)", "No account and no API key. Every order comes with its own checkout link"],
        ["Plans", "Developer $0/month; Startup from $260/month; Growth from $550/month; Enterprise custom. Print and postage are charged per piece on top", "No plans or subscription. You pay per piece, all-in"],
        ["How you pay", "Prepaid Lob Credits; card (3% fee), ACH, wire or check", "Card through Stripe Checkout, or a one-time agent payment you approve in Stripe Link"],
        ["Ways to send", "REST API with SDKs, dashboard and Campaigns, many CRM and marketing integrations (Salesforce, HubSpot, Zapier and others)", "Website, REST API and an MCP server for AI agents (Claude, Codex, Muse and other MCP clients)"],
        ["AI agents", "We found no first-party Lob MCP server as of October 8, 2026. Third-party MCP connectors (Zapier, Pipedream, Composio, open source) can reach Lob's API with your own Lob key", "First-party MCP server at sendmypaper.com/mcp; no key needed"],
        ["Formats", "Postcards, letters (incl. legal size on Enterprise), self-mailers, checks, snap packs and more", `Postcards (4×6, 6×9, 6×11) and letters (typed, about 3 pages, or your PDF up to ${LIMITS.pdfPages} pages)`],
        ["Certified mail", "Add-on to a First-Class letter: Certified, or Certified with an electronic return receipt", "Certified letter, or certified with an electronic return receipt"],
        ["Review before printing", "You proof your own mail (PDF proofs, a 4-hour cancellation window for new accounts). Lob's terms say it does not review or monitor mailpiece content", "A person at Sendpaper reviews every piece before it prints"],
        ["Where it mails", "US, plus postcards and letters to international addresses (First-Class only; no certified mail abroad)", "US addresses only, including territories and military addresses"],
        ["Volume", "Designed for large volumes; plans set monthly limits", "Up to 25 recipients per order; bulk marketing isn't allowed"],
      ],
    },
    prices: {
      note: `Published self-serve prices, checked October 8, 2026. Lob: Developer plan (no subscription), First-Class, before its announced November 1, 2026 changes (small increases; certified fees unchanged). We assume Lob's letter price includes the first page and that its certified fee is added to the letter price, which its pricing page implies but doesn't spell out. ${BRAND}: list prices, before any promotion; that's the full price at checkout. Lob notes that sales tax may apply depending on your state.`,
      rows: [
        ["One black-and-white letter, 1 page", "$1.06", usd(P.letter.cents)],
        ["One letter, 3 pages", "$1.26", usd(P.letter.cents)],
        ["25 identical 4×6 postcards to 25 people", "$22.63", `${usd(P.postcard_4x6.cents * 25)} (one checkout)`],
        ["One certified letter", "$8.01", usd(P.letter_certified.cents)],
        ["One certified letter with return receipt", "$10.92", usd(P.letter_certified_rr.cents)],
      ],
    },
    rivalFits: [
      "You send hundreds to thousands of pieces, especially marketing or recurring operational mail like statements and notices.",
      "You want the lowest per-piece price and are happy to set up an account, a payment method and prepaid credits.",
      "You need international mail, self-mailers, checks or legal-size letters.",
      "Your mail is triggered from a CRM or marketing tool, or your developers want templates, webhooks, scheduled sends and a test environment.",
    ],
    usFits: [
      "You need to send one letter, one certified letter or a few postcards now, without opening an account or managing API keys.",
      "An AI agent is doing the work: it connects to our MCP server with no key, and you approve each payment.",
      "You want a person to look at every piece before it's printed.",
      "Your mail is personal or transactional and goes to US addresses.",
    ],
    weaker: [
      "Our per-piece prices are higher than Lob's published self-serve prices in every scenario above.",
      "US addresses only; no international mail.",
      "No bulk or marketing campaigns (by policy), and at most 25 recipients per order.",
      "Every piece waits for a person to review it, and there's no scheduling, templates with merge fields, webhooks or CRM integrations.",
      "Fewer formats: no self-mailers, checks, legal-size letters or registered mail.",
    ],
    faqs: [
      [`Is ${BRAND} built on Lob?`, `No. ${BRAND}'s printing and mailing partner is PostGrid. We don't use Lob.`],
      ["Is Lob cheaper?", `Per piece, yes: a one-page letter is $1.06 on Lob's free Developer plan versus ${usd(P.letter.cents)} with ${BRAND}. Lob asks you to set up an account and prepay credits first; ${BRAND} charges per order with no account.`],
      ["Can an AI agent send mail through Lob?", "Yes, through third-party MCP connectors such as Zapier's or Pipedream's, using your own Lob account and API key. We found no first-party Lob MCP server as of October 8, 2026."],
      ["Can I switch between them?", `Nothing locks you in either way. You could use Lob for high-volume business mail and ${BRAND} for occasional letters sent from an agent.`],
    ],
    sources: [
      ["Lob: print and mail pricing", "https://www.lob.com/pricing/print-mail"],
      ["Lob: pricing details (per-piece rates, including November 1, 2026 changes)", "https://help.lob.com/print-and-mail/ready-to-get-started/pricing-details"],
      ["Lob: getting started (payment information and Lob Credits)", "https://help.lob.com/print-and-mail/ready-to-get-started/fast-track-guide"],
      ["Lob: payment methods", "https://help.lob.com/account-management/billing/lob-payment-methods"],
      ["Lob: API keys, test and live mode (email verification, proofs)", "https://help.lob.com/account-management/api-keys"],
      ["Lob: mail settings and cancellation window", "https://help.lob.com/print-and-mail/building-a-mail-strategy/managing-mail-settings"],
      ["Lob: certified and registered mail", "https://help.lob.com/print-and-mail/building-a-mail-strategy/mailing-classes-and-postage/certified-mail-or-registered-mail"],
      ["Lob: international mail", "https://help.lob.com/print-and-mail/building-a-mail-strategy/international-mail"],
      ["Lob: service-specific terms (content review)", "https://www.lob.com/service-specific-terms"],
      ["Lob on GitHub (no MCP server found)", "https://github.com/lob"],
      ["Zapier MCP: Lob", "https://zapier.com/mcp/lob"],
      ["Pipedream MCP: Lob", "https://mcp.pipedream.com/app/lob"],
      ["Composio: Lob toolkit", "https://composio.dev/toolkits/lob"],
      ["lob-mcp (open source, third party)", "https://github.com/optimize-overseas/lob-mcp"],
      [`${BRAND} pricing`, "https://sendmypaper.com/#pricing"],
      [`${BRAND} content policy`, "https://sendmypaper.com/content-policy"],
    ],
  },
];

export const COMPARE_PATHS = COMPARES.map((c) => `/compare/${c.slug}`);

const CSS = `
.cmp { width: 100%; border-collapse: collapse; font-size: .93rem; line-height: 1.5; margin: 6px 0 18px; }
.cmp th, .cmp td { text-align: left; vertical-align: top; padding: 10px 12px; border-bottom: 1px solid var(--rule); overflow-wrap: anywhere; }
.cmp thead th { font: 600 .9rem var(--f-ui); border-bottom: 2px solid var(--rule); }
.cmp tbody th { font: 500 .74rem/1.6 var(--f-mono); color: var(--faint); text-transform: uppercase; letter-spacing: .05em; width: 22%; }
.cmp td.amt { font-variant-numeric: tabular-nums; white-space: nowrap; }
.cmp.jobs tbody th { width: 46%; text-transform: none; font: 400 .93rem/1.5 var(--f-ui); color: var(--ink); letter-spacing: 0; }
.cmp-wrap { overflow-x: auto; }
@media (max-width: 640px) { .cmp { font-size: .88rem; } .cmp th, .cmp td { padding: 8px 6px; } }
.prose .note { font-size: .88rem; color: var(--faint); }
.prose ul.plain { padding-left: 20px; margin: 0 0 14px; } .prose ul.plain li { margin-bottom: 6px; }
.disclose { font-size: .9rem; color: var(--soft); border-left: 3px solid var(--rule); padding-left: 12px; margin: 18px 0 0; }
`;

const SECTIONS = [["answer", "Short answer"], ["side", "Side by side"], ["prices", "Prices"], ["fit", "Which fits"], ["questions", "Common questions"], ["sources", "Sources"]];

export function comparePage(slug: string) {
  const c = COMPARES.find((x) => x.slug === slug);
  if (!c) return null;
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  const list = (xs: string[]) => `<ul class="plain">${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  return page(
    `${c.title} — ${BRAND}`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script><style>${ARTICLE_CSS}${INDEX_CSS}${CSS}</style>
    <div class="art">
      <article>
        <header><div class="crumbs"><a href="/guides">Guides</a> › Comparisons</div><h1>${esc(c.title)}</h1><p class="dek">${esc(c.lede)}</p>
          <div class="meta"><span>Written by ${esc(BRAND)}</span><span>${esc(c.rival)} facts checked ${esc(c.checked)}</span></div>
          <p class="disclose">${esc(BRAND)} wrote this comparison. We're not affiliated with or endorsed by ${esc(c.rival)}, and we don't use it (our printing partner is PostGrid). Prices and features change, so check ${esc(c.rival)}'s own pages, linked below, before deciding.</p></header>
        <div class="prose">
          <h2 id="answer">Short answer</h2>
          ${c.answer.map((p) => `<p>${esc(p)}</p>`).join("")}
          <h2 id="side">Side by side</h2>
          <div class="cmp-wrap"><table class="cmp"><thead><tr>${c.table.head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead>
            <tbody>${c.table.rows.map(([k, a, b]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div>
          <h2 id="prices">Prices for common jobs</h2>
          <div class="cmp-wrap"><table class="cmp jobs"><thead><tr><th scope="col">Job</th><th scope="col">${esc(c.rival)}</th><th scope="col">${esc(BRAND)}</th></tr></thead>
            <tbody>${c.prices.rows.map(([k, a, b]) => `<tr><th scope="row">${esc(k)}</th><td class="amt">${esc(a)}</td><td class="amt">${esc(b)}</td></tr>`).join("")}</tbody></table></div>
          <p class="note">${esc(c.prices.note)}</p>
          <h2 id="fit">Which fits</h2>
          <h3>Choose ${esc(c.rival)} when</h3>${list(c.rivalFits)}
          <h3>Choose ${esc(BRAND)} when</h3>${list(c.usFits)}
          <h3>Where ${esc(BRAND)} is weaker</h3>${list(c.weaker)}
          <div class="cta-box"><div><b>Need to send one now?</b><span>Postcards from ${usd(P.postcard_4x6.cents)}, letters from ${usd(P.letter.cents)}, certified from ${usd(P.letter_certified.cents)}. No account.</span></div>
            <div class="ctas"><a class="btn green" href="/send">Send from the web</a><a class="btn alt" href="${esc(docsUrl("/quickstart"))}">Connect your AI agent</a></div></div>
          <h2 id="questions">Common questions</h2>
          ${c.faqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}
          <h2 id="sources">Sources</h2>
          <ul class="srcs">${c.sources.map(([t, u]) => `<li><a href="${esc(u)}" rel="noopener">${esc(t)}</a></li>`).join("")}</ul>
          <p class="note">${esc(c.rival)} sources accessed ${esc(c.checked)}.</p>
        </div>
      </article>
      <nav class="toc" aria-label="On this page"><span>On this page</span>${SECTIONS.map(([id, t]) => `<a href="#${id}">${t}</a>`).join("")}</nav>
    </div>`,
    { description: c.description },
  );
}

export const compareList = () => COMPARES.map((c) => ({ href: `/compare/${c.slug}`, title: c.title, rival: c.rival }));
