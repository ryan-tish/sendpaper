// Comparison pages (content plan, 2026-10-08). Rules (Ryan): be honest, including where the other service is
// better or cheaper. Every competitor fact needs a primary source with an access date; say "not found in the
// documentation we reviewed" rather than "doesn't support". Competitor prices expire: re-check on each source's
// expiry trigger (research ledger: the private ryan-tish/sendpaper-content repo, sources/compare-<slug>.md).
// We don't use the compared service: our printing partner is PostGrid. Say so on the page.
import { BRAND, LIMITS } from "./config.ts";
import { ARTICLE_CSS, INDEX_CSS, type IndexCard } from "./guides.ts";
import { docsUrl, LOGO_FULL, page } from "./layout.ts";
import { esc } from "./render.ts";


// Paragraph copy may use **bold** and [text](/path) links (Ryan: bold a few key phrases, link our own guides 2–3 times).
// Escaped first, so nothing else becomes HTML. plain() strips the markup for JSON-LD and meta text.
const rich = (t: string) =>
  esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\[(.+?)\]\((\/[a-z0-9\/#-]*)\)/g, '<a href="$2">$1</a>');
const plain = (t: string) => t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[(.+?)\]\(.+?\)/g, "$1");

type Compare = {
  slug: string; // served at /compare/<slug>
  rival: string;
  title: string;
  description: string;
  lede: string;
  checked: string; // when the competitor facts were last checked, shown on the page
  answer: string[]; // the short answer, as paragraphs
  table: [string, string, string][]; // [row label, rival, us]; our column is highlighted
  rivalFits: string[]; // paragraphs
  usFits: string[]; // paragraphs
  faqs: [string, string][];
  sources: [string, string][];
  card: { date: string; label: string; blurb: string }; // the /guides index card (date = facts last checked, ISO)
};

export const COMPARES: Compare[] = [
  {
    slug: "lob",
    rival: "Lob",
    title: "Sendpaper vs. Lob",
    description: `Lob is built for businesses mailing at volume. ${BRAND} is quick and agentic: your AI agent sends a letter, certified letter or postcard now, with no account or prepaid credits.`,
    lede: `Lob is for mail at volume. ${BRAND} is quick and agentic: mail sent by your AI agent.`,
    checked: "October 8, 2026",
    card: { date: "2026-10-08", label: "Sendpaper vs. Lob", blurb: "An honest look at when Lob fits better, and when we do." },
    answer: [
      "Sending thousands of pieces, from a CRM, or abroad? **Use Lob.**",
      `Want your AI agent to send a letter, a certified letter or a few postcards right now, with no account or prepaid credits? **Use ${BRAND}.**`,
    ],
    table: [
      ["Built for", "High-volume business mail: campaigns, statements, CRM-triggered sends", "Quick, agentic mail: your AI agent drafts it, you approve it, it's sent"],
      ["Getting started", "Create an account, verify your email, add a payment method and prepay Lob Credits", "Nothing to set up. No account, no sign-up, no API key"],
      ["Plans", "Free Developer plan, paid monthly plans for volume, plus per-piece charges", "No plans, no subscription"],
      ["How you pay", "Prepaid Lob Credits (cards add 3%), ACH, wire or check", "No prepaid credits. Click, pay, send: card checkout, or your agent pays with Stripe Link once you approve"],
      ["Ways to send", "API, SDKs, dashboard, CRM and marketing integrations", "Your AI agent, the website or the API"],
      ["AI agents", "No official MCP server", "Built-in MCP server for Claude, Codex, Muse and any MCP client. No key needed"],
      ["Formats", "Postcards, letters, self-mailers, checks and more", `Postcards (4×6, 6×9, 6×11), letters and PDFs up to ${LIMITS.pdfPages} pages`],
      ["Certified mail", "Add-on, with an optional electronic return receipt", "Certified letters, with an optional return receipt"],
      ["Review before printing", "You proof your own mail; Lob doesn't review content", "A real person checks every piece before it prints"],
      ["Where it mails", "US and international", "US only, including territories and military addresses"],
      ["Volume", "Built for large volumes", "Up to 25 recipients per order; no bulk marketing"],
    ],
    rivalFits: [
      "Lob is the better choice when mail is part of how your business runs: hundreds or thousands of marketing pieces, or recurring statements and notices, often triggered from a CRM or marketing tool. **Its per-piece prices are lower, especially at volume,** and it covers more ground, with international mail, self-mailers, checks and legal-size letters.",
      "It also suits developers who want templates, webhooks, scheduled sends and a test environment, and who are happy to set up an account, a payment method and prepaid credits first.",
    ],
    usFits: [
      `${BRAND} is the better choice when **an AI agent is doing the work.** Claude, Codex, Muse or any MCP client connects to our server with no key, drafts the letter or postcard with you, and you approve the payment. It's sent **without you ever opening an account.** Here's [how to send mail from Claude](/send-mail-from-claude).`,
      "It's also the quick path for one-off mail to US addresses: one letter, a [certified letter](/certified-mail-online) or a few postcards, or a document you already have ([mail a PDF](/mail-a-pdf)). **There are no prepaid credits;** each order has its own checkout, and **a real person looks at every piece before it prints.**",
    ],
    faqs: [
      [`Is ${BRAND} built on Lob?`, `No. ${BRAND}'s printing and mailing partner is PostGrid. We don't use Lob.`],
      ["Is Lob cheaper?", `Per piece, yes, especially at volume. Lob asks you to set up an account and prepay credits first; ${BRAND} charges per order with no account.`],
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
.cmp { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0; font-size: 1rem; line-height: 1.55; margin: 10px 0 22px; }
.cmp col.k { width: 20%; } .cmp col.v { width: 40%; }
.cmp th, .cmp td { text-align: left; vertical-align: top; padding: 14px 16px; border-bottom: 1px solid var(--rule); overflow-wrap: anywhere; }
.cmp thead th { font: 600 1.05rem var(--f-ui); border-bottom: 2px solid var(--rule); vertical-align: middle; height: 58px; }
.cmp tbody th { font: 500 .74rem/1.7 var(--f-mono); color: var(--faint); text-transform: uppercase; letter-spacing: .05em; }
.cmp .us { background: var(--green-soft); border-left: 2px solid var(--green); border-right: 2px solid var(--green); border-bottom-color: var(--green-line); }
.cmp thead th.us { border-top: 2px solid var(--green); border-radius: 12px 12px 0 0; border-bottom-color: var(--green-line); }
.cmp tbody tr:last-child td.us { border-bottom: 2px solid var(--green); border-radius: 0 0 12px 12px; }
.cmp thead th.us svg { height: 26px; width: auto; display: block; }
.cmp-wrap { overflow-x: auto; }
/* No TOC here: the page is short, and the table gets the full width while prose keeps a reading measure. */
.art.wide { grid-template-columns: minmax(0, 1040px); }
.art.wide .prose > :not(.cmp-wrap):not(.cta-box) { max-width: 720px; }
.cmp thead th.lob { font-size: 1.15rem; }
@media (max-width: 640px) { .cmp { font-size: .9rem; table-layout: auto; } .cmp th, .cmp td { padding: 10px 8px; } .cmp col.k { width: 24%; } .cmp thead th.us svg { height: 18px; } }
.prose .note { font-size: .88rem; color: var(--faint); }
.srcbox { margin-top: 36px; border-top: 1px solid var(--rule); }
.srcbox summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 12px; padding: 18px 0 6px; }
.srcbox summary::-webkit-details-marker { display: none; }
.srcbox summary h2 { margin: 0 !important; }
.srcbox summary::after { content: ""; width: 9px; height: 9px; border-right: 2px solid var(--soft); border-bottom: 2px solid var(--soft); transform: rotate(45deg); margin: -4px 0 0 auto; transition: transform .2s; }
.srcbox[open] summary::after { transform: rotate(-135deg); margin-top: 4px; }
.prose .short p { font-size: 1.08rem; margin: 0 0 8px; }
`;


export function comparePage(slug: string) {
  const c = COMPARES.find((x) => x.slug === slug);
  if (!c) return null;
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: plain(a) } })) };
  return page(
    `${c.title} — ${BRAND}`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script><style>${ARTICLE_CSS}${INDEX_CSS}${CSS}</style>
    <div class="art wide">
      <article>
        <header><div class="crumbs"><a href="/guides">Guides</a> › Comparisons</div><h1>${esc(c.title)}</h1><p class="dek">${esc(c.lede)}</p>
          <div class="meta"><span>Written by ${esc(BRAND)}</span><span>${esc(c.rival)} facts checked ${esc(c.checked)}</span></div></header>
        <div class="prose">
          <h2 id="answer">Short answer</h2>
          <div class="short">${c.answer.map((p) => `<p>${rich(p)}</p>`).join("")}</div>
          <h2 id="side">Side by side</h2>
          <div class="cmp-wrap"><table class="cmp"><colgroup><col class="k"><col class="v"><col class="v"></colgroup>
            <thead><tr><th scope="col"><span class="sr-only">Feature</span></th><th scope="col" class="lob">${esc(c.rival)}</th><th scope="col" class="us">${LOGO_FULL}</th></tr></thead>
            <tbody>${c.table.map(([k, a, b]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(a)}</td><td class="us">${esc(b)}</td></tr>`).join("")}</tbody></table></div>
          <h2 id="fit">Which fits</h2>
          <h3>When to choose ${esc(c.rival)}</h3>${c.rivalFits.map((p) => `<p>${rich(p)}</p>`).join("")}
          <h3>When to choose ${esc(BRAND)}</h3>${c.usFits.map((p) => `<p>${rich(p)}</p>`).join("")}
          <div class="cta-box"><div><b>Need to send one now?</b><span>Letters, certified letters and postcards. No account.</span></div>
            <div class="ctas"><a class="btn green" href="/send">Send from the web</a><a class="btn alt" href="${esc(docsUrl("/quickstart"))}">Connect your AI agent</a></div></div>
          <h2 id="questions">Common questions</h2>
          ${c.faqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${rich(a)}</p>`).join("")}
          <details class="srcbox" id="sources"><summary><h2>Sources</h2><span class="note">${c.sources.length} links</span></summary>
          <ul class="srcs">${c.sources.map(([t, u]) => `<li><a href="${esc(u)}" rel="noopener">${esc(t)}</a></li>`).join("")}</ul>
          <p class="note">${esc(c.rival)} sources accessed ${esc(c.checked)}. We're not affiliated with ${esc(c.rival)}; our printing partner is PostGrid.</p></details>
        </div>
      </article>
    </div>`,
    { description: c.description },
  );
}

export const compareList = (): IndexCard[] =>
  COMPARES.map((c) => ({ href: `/compare/${c.slug}`, title: c.title, blurb: c.card.blurb, tag: "Comparison", cat: "compare", date: c.card.date, art: "compare", label: c.card.label }));
