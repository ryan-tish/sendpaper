// Topic articles (content-ops playbook topic-articles.md, 2026-10-08): explainers built from headed sections of short
// paragraphs, with an optional table per section. Unlike src/guides.ts (step-by-step "send it" pages), an article
// answers a question first and sends readers to the right sending option second. Paragraphs use rich() markup:
// **bold** for the one key distinction, [text](/path) for our pages, [text](https://…) for a source next to a claim.
// Claim ledger: the private ryan-tish/sendpaper-content repo, sources/<slug>.md. Never state a fact that isn't in it.
import { BASE_URL, BRAND, PRODUCTS } from "./config.ts";
import { ARTICLE_CSS, INDEX_CSS, type CardArt, type CardCat, type IndexCard } from "./guides.ts";
import { docsUrl, page } from "./layout.ts";
import { esc, plain, rich } from "./render.ts";

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const LETTER = usd(PRODUCTS.letter.cents), CERT = usd(PRODUCTS.letter_certified.cents), RR = usd(PRODUCTS.letter_certified_rr.cents);

type Section = { id: string; h: string; ps: string[]; table?: { head: string[]; rows: string[][] }; after?: string[] };
type Article = {
  slug: string; // served at /<slug>, like the guides
  kicker: string;
  title: string; // visible h1
  metaTitle: string; // <title> / og:title, aim for 50–65 chars
  description: string; // meta description, aim for 140–160 chars
  lede: string; // one-line deck
  checked: string; // facts last checked, shown in the byline
  published: string; // ISO
  modified: string; // ISO, bump only on substantive change
  answer: string[]; // short answer, 2–3 self-contained sentences
  sections: Section[];
  cta: { title: string; body: string; primary: [string, string]; secondary?: [string, string] };
  faqs: [string, string][];
  sources: [string, string][];
  card: { cat: CardCat; date: string; art: CardArt; label: string; blurb: string };
};

export const ARTICLES: Article[] = [
  {
    slug: "what-is-certified-mail",
    kicker: "Certified mail",
    title: "What is certified mail?",
    metaTitle: "What Is Certified Mail? Uses, Receipts and When to Send It",
    description: "Certified mail gives you proof you sent a letter and a record of its delivery. Learn when to use it instead of regular mail, and when a return receipt matters.",
    lede: "Proof you sent it, and a record of when it arrived.",
    checked: "October 8, 2026",
    published: "2026-10-08",
    modified: "2026-10-08",
    card: { cat: "proof", date: "2026-10-08", art: "track", label: "Certified Mail", blurb: "What it proves, when to use it, and when you need a return receipt." },
    answer: [
      "Certified Mail is a USPS add-on for letters that gives you **proof you mailed it and a record of when it was delivered,** or when delivery was attempted. Add a **return receipt** if you also need the recipient's signature sent to you.",
      "Use it for mail you may later need to prove you sent: notices, disputes, demands and replies to agencies. For everyday letters, regular First-Class Mail is enough.",
    ],
    sections: [
      {
        id: "what",
        h: "What certified mail is",
        ps: [
          "Certified Mail is an extra service you add to a First-Class Mail or Priority Mail letter. USPS gives the sender [a mailing receipt and a delivery record](https://pe.usps.com/text/dmm300/503.htm): the letter gets a tracking number, and USPS records the date and time it was delivered or that delivery was attempted.",
          "Delivery normally requires a signature from the recipient or someone accepting it for them. USPS keeps that signature with its delivery record; a return receipt is the way to have it sent to you.",
        ],
      },
      {
        id: "proves",
        h: "What it proves, and what it doesn't",
        ps: [
          "Certified Mail shows that you sent something, when USPS accepted it, and when it was delivered or attempted. That's why rules, contracts and agencies often ask for it.",
          "It doesn't prove what was inside the envelope, so keep a copy of exactly what you sent. It doesn't guarantee the named person read it: anyone at the address can usually sign. An attempted delivery isn't a completed one. Certified Mail adds no insurance, and it's a domestic service only (US addresses, including territories and APO/FPO).",
        ],
      },
      {
        id: "uses",
        h: "Common uses",
        ps: ["People usually send certified mail when a letter starts a clock, settles a dispute or answers an official request:"],
        after: [
          "**Tax notices:** replies to the IRS or a state tax agency.",
          "**Landlord and tenant notices:** repair requests, move-out notices, security deposit requests.",
          "**Disputes:** credit report errors, billing errors, debt validation requests.",
          "**Demands and cancellations:** an unpaid invoice, ending a contract or a subscription in writing.",
          "**Required notices:** anything a contract, lease or rule says must go by certified mail.",
        ],
      },
      {
        id: "vs-regular",
        h: "Certified mail vs. regular mail",
        ps: ["The difference is the paper trail. Regular First-Class Mail is cheaper and needs no signature, but it gives you no proof it was sent or delivered."],
        table: {
          head: ["", "Regular First-Class", "Certified", "Certified + return receipt"],
          rows: [
            ["Record of USPS acceptance", "No", "Yes", "Yes"],
            ["Tracking number", "No", "Yes", "Yes"],
            ["Delivery or attempt date and time", "No", "Yes", "Yes"],
            ["Recipient's signature sent to you", "No", "No (USPS keeps it)", "Yes"],
            [`Price with ${BRAND}`, LETTER, CERT, RR],
          ],
        },
        after: [
          "**Use regular mail** for thank-you notes, cards, routine updates and anything where proof doesn't matter.",
          "**Use certified mail** when you might need to show you sent it on time: a deadline, a dispute, a formal notice. It does ask more of the recipient. If no one is there to sign, USPS leaves a notice; if the letter isn't picked up or redelivered within 15 days, it comes back to the sender.",
        ],
      },
      {
        id: "receipt",
        h: "Do you need a return receipt?",
        ps: [
          "A [return receipt](https://www.usps.com/ship/insurance-extra-services.htm) gives you a delivery record with the recipient's signature, either as a green card mailed back to you or electronically. (Which kind comes with a Sendpaper order? Email support@sendmypaper.com and we'll tell you.)",
          "**Get one when the signature itself matters:** the contract, notice or rule says \"return receipt requested\", or you want proof of who received it, not just that it arrived. **Skip it when** a delivery date from tracking is enough, such as when you just want to know a reply is on its way.",
          "If you're not sure what a rule requires, check the notice, contract or rule itself, or ask a professional. We print and mail letters; we don't give legal advice.",
        ],
      },
    ],
    cta: {
      title: "Send a certified letter without the post office",
      body: `Type it or upload a PDF. ${CERT} with tracking, or ${RR} with a return receipt. Printing, envelope and postage included.`,
      primary: ["Send a certified letter", "/send?product=letter_certified"],
      secondary: ["Ask your AI agent to send it", docsUrl("/quickstart")],
    },
    faqs: [
      ["Does certified mail need a signature?", "Normally, yes: the recipient or someone accepting it for them signs, and USPS keeps the signature with its delivery record. To have a copy sent to you, add a return receipt."],
      ["What happens if no one is home?", "USPS records a delivery attempt and leaves a notice. The recipient can pick it up at the post office or request redelivery; if it isn't claimed within 15 days, it's returned to the sender. Tracking shows the attempt, which isn't the same as delivery."],
      ["Is certified mail the same as registered mail?", "No. Registered Mail is a separate, more secure and more expensive USPS service for valuables, with insurance up to $50,000 included based on declared value. Certified Mail is for proof of mailing and delivery, not for protecting what's inside."],
      [`Can I send certified mail online with ${BRAND}?`, `Yes. Type a letter or [upload a PDF](/send/letter?source=pdf), choose Certified, and we print it and mail it by USPS Certified Mail. A person reviews it first, and the tracking number appears on your order page once it's assigned. You can also have an AI agent like Claude send it for you. See [ready-made prompts](/use-cases).`],
    ],
    sources: [
      ["USPS Domestic Mail Manual 503: Certified Mail and Return Receipt", "https://pe.usps.com/text/dmm300/503.htm"],
      ["USPS: insurance and extra services (Certified Mail, Return Receipt, Registered Mail)", "https://www.usps.com/ship/insurance-extra-services.htm"],
      ["USPS Domestic Mail Manual 508: recipient signatures and unclaimed mail", "https://pe.usps.com/text/dmm300/508.htm"],
      ["USPS: adding extra services", "https://pe.usps.com/text/dmm100/extra-services.htm"],
    ],
  },
];

export const ARTICLE_PATHS = ARTICLES.map((a) => `/${a.slug}`);

const CSS = `
.prose .short p { font-size: 1.08rem; margin: 0 0 8px; }
.prose ul.pts { padding-left: 20px; margin: 0 0 14px; } .prose ul.pts li { margin-bottom: 8px; }
.atbl { width: 100%; border-collapse: collapse; font-size: .95rem; line-height: 1.5; margin: 8px 0 18px; }
.atbl th, .atbl td { text-align: left; vertical-align: top; padding: 10px 12px; border-bottom: 1px solid var(--rule); }
.atbl thead th { font: 600 .9rem var(--f-ui); border-bottom: 2px solid var(--rule); }
.atbl tbody th { font-weight: 500; color: var(--soft); }
.atbl-wrap { overflow-x: auto; }
@media (max-width: 640px) { .atbl { font-size: .86rem; } .atbl th, .atbl td { padding: 8px 6px; } }
.srcbox { margin-top: 36px; border-top: 1px solid var(--rule); }
.srcbox summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 12px; padding: 18px 0 6px; }
.srcbox summary::-webkit-details-marker { display: none; }
.srcbox summary h2 { margin: 0 !important; }
.srcbox summary::after { content: ""; width: 9px; height: 9px; border-right: 2px solid var(--soft); border-bottom: 2px solid var(--soft); transform: rotate(45deg); margin: -4px 0 0 auto; transition: transform .2s; }
.srcbox[open] summary::after { transform: rotate(-135deg); margin-top: 4px; }
.prose .note { font-size: .88rem; color: var(--faint); }
`;

export function articlePage(slug: string) {
  const a = ARTICLES.find((x) => x.slug === slug);
  if (!a) return null;
  const url = `${BASE_URL}/${a.slug}`;
  const org = { "@type": "Organization", name: BRAND, url: BASE_URL };
  const ld = [
    { "@context": "https://schema.org", "@type": "Article", headline: a.metaTitle, description: a.description, datePublished: a.published, dateModified: a.modified, author: org, publisher: org, mainEntityOfPage: url },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Guides", item: `${BASE_URL}/guides` },
      { "@type": "ListItem", position: 2, name: a.title, item: url },
    ] },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: a.faqs.map(([q, ans]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: plain(ans) } })) },
  ];
  const ps = (xs: string[]) => xs.map((p) => `<p>${rich(p)}</p>`).join("");
  const table = (t: NonNullable<Section["table"]>) =>
    `<div class="atbl-wrap"><table class="atbl"><thead><tr>${t.head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${t.rows.map(([k, ...vs]) => `<tr><th scope="row">${esc(k)}</th>${vs.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const toc = [["answer", "Short answer"], ...a.sections.map((s) => [s.id, s.h]), ["questions", "Common questions"]];
  return page(
    a.metaTitle,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script><style>${ARTICLE_CSS}${INDEX_CSS}${CSS}</style>
    <div class="art">
      <article>
        <header><div class="crumbs"><a href="/guides">Guides</a> › ${esc(a.kicker)}</div><h1>${esc(a.title)}</h1><p class="dek">${esc(a.lede)}</p>
          <div class="meta"><span>Written by ${esc(BRAND)}</span><span>Facts checked ${esc(a.checked)}</span></div></header>
        <div class="prose">
          <h2 id="answer">Short answer</h2>
          <div class="short">${ps(a.answer)}</div>
          ${a.sections.map((s) => `<h2 id="${s.id}">${esc(s.h)}</h2>${ps(s.ps)}${s.table ? table(s.table) : ""}${s.after ? (s.table ? ps(s.after) : `<ul class="pts">${s.after.map((x) => `<li>${rich(x)}</li>`).join("")}</ul>`) : ""}`).join("")}
          <div class="cta-box"><div><b>${esc(a.cta.title)}</b><span>${esc(a.cta.body)}</span></div>
            <div class="ctas"><a class="btn green" href="${esc(a.cta.primary[1])}">${esc(a.cta.primary[0])}</a>${a.cta.secondary ? `<a class="btn alt" href="${esc(a.cta.secondary[1])}">${esc(a.cta.secondary[0])}</a>` : ""}</div></div>
          <h2 id="questions">Common questions</h2>
          ${a.faqs.map(([q, ans]) => `<h3>${esc(q)}</h3><p>${rich(ans)}</p>`).join("")}
          <details class="srcbox" id="sources"><summary><h2>Sources</h2><span class="note">${a.sources.length} links</span></summary>
          <ul class="srcs">${a.sources.map(([t, u]) => `<li><a href="${esc(u)}" rel="noopener">${esc(t)}</a></li>`).join("")}</ul>
          <p class="note">Accessed ${esc(a.checked)}. USPS rules and fees change; check USPS before relying on a detail.</p></details>
        </div>
      </article>
      <nav class="toc" aria-label="On this page"><span>On this page</span>${toc.map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join("")}</nav>
    </div>`,
    { description: a.description },
  );
}

export const articleList = (): IndexCard[] =>
  ARTICLES.map((a) => ({ href: `/${a.slug}`, title: a.title, blurb: a.card.blurb, tag: a.kicker, cat: a.card.cat, date: a.card.date, art: a.card.art, label: a.card.label }));
