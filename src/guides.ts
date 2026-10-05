// Search pages (Ryan, 2026-10-05: lead with professional, proof-of-delivery mail). One page per real search, each
// answering it plainly, with live prices from config, a prompt an agent can run, FAQs (FAQPage JSON-LD) and the
// guardrail: we print and mail what the customer writes; we don't give legal or tax advice. Keep claims general
// and true; never state a deadline or agency address that varies (point to the notice or the agency instead).
// Every slug is in PUBLIC_PATHS (sitemap + IndexNow) via GUIDE_PATHS.
import { BASE_URL, BRAND, COLOR_LETTER_CENTS, EXPRESS_CENTS, LIMITS, PRODUCTS } from "./config.ts";
import { docsUrl, page } from "./layout.ts";
import { esc } from "./render.ts";
import { GUARDRAIL } from "./usecases.ts";

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const CERT = usd(PRODUCTS.letter_certified.cents), RR = usd(PRODUCTS.letter_certified_rr.cents), LETTER = usd(PRODUCTS.letter.cents);

type Guide = {
  slug: string;
  kicker: string; // topic label above the headline and in the index
  title: string; // <title> and h1
  description: string; // meta description
  blurb: string; // one line for guide cards
  lede: string;
  steps: [string, string][];
  include: string[];
  prompt: string;
  send: string; // /send link with the right options preselected
  faqs: [string, string][];
};

export const GUIDES: Guide[] = [
  {
    slug: "certified-mail-online",
    kicker: "Certified mail",
    blurb: "Tracking and proof of delivery, without the post office.",
    title: "Send certified mail online",
    description: `Send a letter by USPS Certified Mail without going to the post office: tracking and proof of delivery from ${CERT}, return receipt ${RR}. Write it, upload a PDF, or ask your AI agent.`,
    lede: `Skip the post office line. Write your letter or upload a PDF, choose Certified Mail, and we print it, mail it by USPS Certified Mail, and give you the tracking number. ${CERT}, or ${RR} with a return receipt.`,
    steps: [
      ["Write it or upload it", `Type the letter, have your AI agent draft it, or upload a PDF (up to ${LIMITS.pdfPages} pages).`],
      ["Choose Certified Mail", "Certified gives you a USPS tracking number and proof of mailing and delivery. Add a return receipt for the recipient's signature."],
      ["Check the print and pay", "You see exactly what will be printed before you pay. A person reviews every piece, and it's usually mailed within one business day."],
    ],
    include: ["The recipient's full mailing address (US only)", "Your return address, which is printed on the envelope", "A clear subject line and date in the letter", "Copies of any documents you reference (never originals)"],
    prompt: "Write a short letter to [recipient] about [topic] and send it by certified mail with a return receipt. My return address is [address].",
    send: "/send?product=letter_certified",
    faqs: [
      ["What's the difference between Certified Mail and a return receipt?", "Certified Mail gives you a tracking number and proof that the letter was mailed and delivered. A return receipt adds the recipient's signature as proof of who received it."],
      ["How do I track it?", "The USPS tracking number appears on your order page once the letter is accepted for mailing, with a link to USPS tracking."],
      ["Can I send my own PDF?", `Yes. Upload a PDF of up to ${LIMITS.pdfPages} pages; any page size is fitted to 8.5×11 and an address page is added in front, so your document needs no space for addresses.`],
      ["How fast does it arrive?", "It's usually mailed within one business day of payment and travels by First-Class Mail, typically 1 to 5 business days within the US."],
    ],
  },
  {
    slug: "irs-notice-response",
    kicker: "Taxes",
    blurb: "Answer a tax notice with a dated delivery record.",
    title: "Reply to an IRS notice by certified mail",
    description: "Answer an IRS or state tax notice by USPS Certified Mail with tracking and proof of delivery. Write the reply with your AI agent or upload your documents as a PDF; no post office trip.",
    lede: "Tax notices list a response date and an address. Replying by Certified Mail gives you a dated tracking record and proof the agency received it, without a trip to the post office.",
    steps: [
      ["Draft the reply", "Explain your position briefly and reference the notice number. Your agent can draft it from the notice, or upload a PDF you've prepared."],
      ["Use the notice's address", "Mail it to the address printed on the notice. Responses often go to a different address than the one you file returns to."],
      ["Send it certified", `Choose Certified (${CERT}) or add a return receipt (${RR}). Keep the tracking number with your tax records.`],
    ],
    include: ["The notice number and tax year (usually at the top of the notice)", "Your name and taxpayer ID as shown on the notice", "A short explanation of why you agree or disagree", "Copies of supporting documents, combined into one PDF with your letter", "The response form from the notice, if it came with one"],
    prompt: "I got IRS notice [CP2000] for tax year [2025]. Draft a short response citing the notice number and explaining [what happened], and mail it certified with a return receipt to the address on the notice.",
    send: "/send?product=letter_certified_rr",
    faqs: [
      ["Why send it certified?", "Certified Mail gives you a tracking number and proof of when it was mailed and delivered, which is useful if there's ever a question about whether you responded on time."],
      ["Can I include documents?", `Yes. Combine your reply and copies of your documents into one PDF (up to ${LIMITS.pdfPages} pages) and upload it. Send copies, never originals.`],
      ["Which address do I use?", "Use the address printed on the notice. If you're unsure, check the notice or the agency's website."],
      ["Do you give tax advice?", "No. We print and mail what you or your agent writes. For advice on your situation, talk to a tax professional."],
    ],
  },
  {
    slug: "security-deposit-demand-letter",
    kicker: "Housing",
    blurb: "Ask for your deposit back, with a signed receipt.",
    title: "Send a security deposit demand letter",
    description: `Ask a former landlord to return your security deposit with a letter sent by USPS Certified Mail with return receipt (${RR}). Your AI agent drafts it; we print and mail it with proof of delivery.`,
    lede: "If your security deposit hasn't come back, a clear written request sent with proof of delivery is usually the next step. Your agent can draft it in a minute; we mail it by Certified Mail with a return receipt.",
    steps: [
      ["Gather the facts", "Your move-out date, the deposit amount, the property address and your forwarding address."],
      ["Draft a clear request", "State what you're owed and by when you expect it. Keep it factual and polite."],
      ["Send it with a return receipt", `Certified Mail with a return receipt (${RR}) gives you the landlord's signature as proof it was received.`],
    ],
    include: ["The rental address and your move-out date", "The deposit amount", "Your forwarding address for the refund", "A date by which you expect payment", "Copies of your lease or move-out photos, if you're including evidence (combine into one PDF)"],
    prompt: "Write a polite but firm letter to my former landlord at [address] asking for my $[amount] security deposit back. I moved out on [date]; my forwarding address is [address]. Send it certified with a return receipt.",
    send: "/send?product=letter_certified_rr",
    faqs: [
      ["How long does a landlord have to return a deposit?", "It depends on your state, and many states set a specific deadline. Check your state's rules or a tenant resource before you send."],
      ["Why use a return receipt?", "It comes back with the recipient's signature, which is strong proof that your landlord received the request."],
      ["Do you give legal advice?", "No. We print and mail what you or your agent writes. For advice about your situation, contact a tenant organization or an attorney."],
    ],
  },
  {
    slug: "credit-report-dispute-letter",
    kicker: "Credit",
    blurb: "Dispute a credit report error by mail, with proof.",
    title: "Mail a credit report dispute by certified mail",
    description: `Dispute an error on your credit report by mail with USPS Certified Mail (${CERT}) for tracking and proof of delivery. Your AI agent drafts the letter; upload a PDF with your evidence.`,
    lede: "You can dispute errors on your credit report with the credit bureaus by mail. A certified letter with copies of your evidence gives you a clear, dated record of exactly what you sent.",
    steps: [
      ["Identify the error", "Note the account, what's wrong, and what it should say. Gather copies of documents that show it."],
      ["Draft the dispute", "Your agent can write a clear dispute letter. To include evidence, combine the letter and copies into one PDF."],
      ["Mail it certified", `Send it to the dispute mailing address listed on the bureau's website, by Certified Mail (${CERT}).`],
    ],
    include: ["Your full name, address and date of birth", "Each item you're disputing and why", "What the correct information should be", "Copies (never originals) of documents that support your dispute"],
    prompt: "Draft a dispute letter to [credit bureau] about [the account] on my credit report, which shows [the error] but should show [the correct information], and mail it certified to the dispute address on the bureau's website.",
    send: "/send?product=letter_certified",
    faqs: [
      ["How long does a bureau have to respond?", "Credit bureaus generally must investigate a dispute within 30 days of receiving it. Certified Mail shows when they received yours."],
      ["Where do I send it?", "Use the dispute mailing address on the credit bureau's own website; it can change."],
      ["Can I include documents?", `Yes. Combine your letter and copies of your evidence into one PDF (up to ${LIMITS.pdfPages} pages) and upload it.`],
    ],
  },
  {
    slug: "demand-letter-unpaid-invoice",
    kicker: "Small business",
    blurb: "A formal payment demand when emails go unanswered.",
    title: "Send a demand letter for an unpaid invoice",
    description: `Chase an overdue invoice with a formal demand letter sent by USPS Certified Mail (${CERT}) for proof of delivery. Your AI agent drafts it from the invoice; we print and mail it.`,
    lede: "When emails go unanswered, a formal demand letter sent with proof of delivery often gets an invoice paid, and it's the record you'll want if the dispute goes further.",
    steps: [
      ["Pull the details", "Invoice number, amount, the work delivered, the original due date and any reminders you've sent."],
      ["Set a clear deadline", "State the amount owed, how to pay, and the date by which you expect payment."],
      ["Send it certified", `Certified Mail (${CERT}) gives you tracking and proof of delivery; add a return receipt (${RR}) for a signature.`],
    ],
    include: ["Your business name and contact details", "Invoice number, date, amount and what it was for", "Payment instructions", "A specific deadline", "What you'll do next if it isn't paid, stated factually"],
    prompt: "Draft a formal payment demand to [client] for invoice #[number] ($[amount], [days] days overdue) for [work], giving them [14] days to pay by [method], and mail it certified to [address].",
    send: "/send?product=letter_certified",
    faqs: [
      ["Is a demand letter legally required?", "Not always, but it's a common step before small-claims court or collections, and proof that you sent it can help. Check the rules where you are."],
      ["Should I attach the invoice?", "It helps. Combine your letter and a copy of the invoice into one PDF and upload it."],
      ["Do you give legal advice?", "No. We print and mail what you or your agent writes."],
    ],
  },
  {
    slug: "mail-a-pdf",
    kicker: "Documents",
    blurb: "Upload a document; we print, envelope and mail it.",
    title: "Mail a PDF as a letter",
    description: `Upload a PDF and we print and mail it: ${LETTER} by First-Class Mail, ${CERT} by Certified Mail, express available. Any page size, up to ${LIMITS.pdfPages} pages, US addresses.`,
    lede: `Have a signed form, an application or a letter you already wrote? Upload the PDF and we print it, put it in an envelope and mail it. ${LETTER} First-Class, ${CERT} Certified, or express for ${usd(EXPRESS_CENTS)} more.`,
    steps: [
      ["Upload your PDF", `Up to ${LIMITS.pdfPages} pages. Any page size is fitted to 8.5×11, and an address page is added in front, so you don't need to leave room for addresses.`],
      ["Choose how it goes", `First-Class, Certified Mail (tracking and proof of delivery), or express (USPS Priority Mail, usually 2 to 3 days). Black and white, or color for ${usd(COLOR_LETTER_CENTS)} more.`],
      ["Check and pay", "You see the exact print before paying. A person reviews every piece before it's mailed."],
    ],
    include: ["The recipient's full US mailing address", "Your return address", "Every page you need them to receive, in one PDF", "Signatures already on the document (we print what you upload)"],
    prompt: "Mail this PDF to [recipient], [address], by certified mail. My return address is [address].",
    send: "/send?type=letter&source=pdf",
    faqs: [
      ["What happens to the page size?", "Each page is scaled to fit US Letter (8.5×11), keeping its proportions, so A4 and other sizes print correctly."],
      ["Where do the addresses go?", "On an extra address page we add in front, which shows through the envelope window. Your document prints exactly as it is."],
      ["Can my AI agent mail a PDF?", "Yes. Agents pass a public link to the PDF to create_letter (content.pdf_url), and the order works like any other."],
    ],
  },
];

export const GUIDE_PATHS = GUIDES.map((g) => `/${g.slug}`);

// Guides read as articles (Ryan, 2026-10-05: "more article-like, more different from the use cases"): serif type,
// a narrow reading column, written-out steps and Q&A, an "On this page" rail on wide screens. Use cases stay cards.
const UPDATED = "October 2026"; // bump when guide copy changes
const SERIF_FONT = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">`;
const minutes = (g: Guide) => Math.max(2, Math.round([g.lede, ...g.steps.flat(), ...g.include, g.prompt, ...g.faqs.flat()].join(" ").split(/\s+/).length / 200));
const priceFor = (g: Guide) => (g.send.includes("certified") ? `Certified letter from ${CERT}` : `Letters from ${LETTER}`);

const CSS = `
.art { --f-serif: "Source Serif 4", Georgia, serif; display: grid; grid-template-columns: minmax(0, 680px) 200px; justify-content: space-between; gap: 56px; padding-block: 44px 8px; }
@media (max-width: 960px) { .art { grid-template-columns: minmax(0, 680px); } .toc { display: none; } }
.art .crumbs { font-size: .88rem; color: var(--faint); } .art .crumbs a { color: var(--soft); text-decoration: none; } .art .crumbs a:hover { color: var(--green); }
.art header { display: grid; gap: 14px; padding-bottom: 28px; border-bottom: 1px solid var(--rule); }
.art h1 { font: 600 clamp(2.1rem, 4.6vw, 3.1rem)/1.1 var(--f-serif); letter-spacing: -0.02em; }
.art .dek { font: 400 1.28rem/1.5 var(--f-serif); color: var(--soft); margin: 0; }
.art .meta { font: 500 .78rem var(--f-mono); color: var(--faint); letter-spacing: .02em; display: flex; flex-wrap: wrap; gap: 6px 14px; }
.prose { font: 400 1.1rem/1.75 var(--f-serif); color: var(--ink); }
.prose h2 { font: 600 1.55rem/1.25 var(--f-serif); letter-spacing: -0.01em; margin: 44px 0 12px; scroll-margin-top: 90px; }
.prose h3 { font: 600 1.15rem/1.35 var(--f-ui); margin: 26px 0 6px; }
.prose p { margin: 0 0 14px; }
.prose .num { font: 500 .8rem var(--f-mono); color: var(--green); margin-right: 8px; }
.prose ul.check { list-style: none; padding: 0; margin: 0 0 14px; display: grid; gap: 8px; }
.prose ul.check li { padding-left: 30px; position: relative; }
.prose ul.check li::before { content: "✓"; position: absolute; left: 4px; color: var(--green); font: 600 1rem var(--f-ui); }
.prose .prompt { font: .9rem/1.6 var(--f-mono); background: var(--tint); border-left: 3px solid var(--green); border-radius: 0 10px 10px 0; padding: 14px 18px; margin: 4px 0 14px; }
.prose .prompt::before { content: "› "; color: var(--green); }
.cta-box { font-family: var(--f-ui); margin: 36px 0 8px; padding: 22px 24px; border: 1px solid var(--rule); border-radius: 14px; background: var(--card); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px 24px; }
.cta-box b { display: block; font-size: 1.05rem; } .cta-box span { color: var(--soft); font-size: .92rem; }
.cta-box .ctas { display: flex; flex-wrap: wrap; gap: 10px; }
.prose .guard { font: italic 400 .95rem/1.6 var(--f-serif); color: var(--faint); border-top: 1px solid var(--rule); padding-top: 18px; margin-top: 36px; }
.toc { position: sticky; top: 96px; align-self: start; display: grid; gap: 8px; font-size: .88rem; padding-top: 6px; }
.toc span { font: 500 .72rem var(--f-mono); color: var(--faint); text-transform: uppercase; letter-spacing: .08em; }
.toc a { color: var(--soft); text-decoration: none; } .toc a:hover { color: var(--green); }
.keep { grid-column: 1 / -1; border-top: 1px solid var(--rule); padding-top: 28px; margin-top: 12px; display: grid; gap: 4px; }
.keep > span { font: 500 .74rem var(--f-mono); color: var(--faint); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
`;

const SECTIONS = [["how", "How it works"], ["include", "What to include"], ["agent", "Ask your agent"], ["questions", "Common questions"]];

export function guidePage(slug: string) {
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) return null;
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: g.faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const others = GUIDES.filter((x) => x.slug !== slug).slice(0, 3);
  return page(
    `${g.title} — ${BRAND}`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>${SERIF_FONT}<style>${CSS}${INDEX_CSS}</style>
    <div class="art">
      <article>
        <header><div class="crumbs"><a href="/guides">Guides</a> › ${esc(g.kicker)}</div><h1>${esc(g.title)}</h1><p class="dek">${esc(g.lede)}</p>
          <div class="meta"><span>${esc(BRAND)} guide</span><span>${minutes(g)} min read</span><span>Updated ${UPDATED}</span></div></header>
        <div class="prose">
          <h2 id="how">How it works</h2>
          ${g.steps.map(([t, d], i) => `<h3><span class="num">0${i + 1}</span>${esc(t)}</h3><p>${esc(d)}</p>`).join("")}
          <div class="cta-box"><div><b>Ready to send?</b><span>${priceFor(g)}, printing and postage included.</span></div>
            <div class="ctas"><a class="btn green" href="${esc(g.send)}">Send it from the web</a><a class="btn alt" href="${esc(docsUrl("/quickstart"))}">Use your AI agent</a></div></div>
          <h2 id="include">What to include</h2>
          <ul class="check">${g.include.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
          <h2 id="agent">Ask your agent</h2>
          <p>With ${esc(BRAND)} connected to Codex, Muse or Claude, paste this and fill in the brackets:</p>
          <div class="prompt">${esc(g.prompt)}</div>
          <h2 id="questions">Common questions</h2>
          ${g.faqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}
          <p class="guard">${esc(GUARDRAIL)}</p>
        </div>
      </article>
      <nav class="toc" aria-label="On this page"><span>On this page</span>${SECTIONS.map(([id, t]) => `<a href="#${id}">${t}</a>`).join("")}</nav>
      <nav class="keep" aria-label="More guides"><span>Keep reading</span>${guideList(others)}<a href="/guides" style="color:var(--green);text-decoration:none;font-weight:500;margin-top:8px">All guides →</a></nav>
    </div>`,
    { description: g.description },
  );
}

export const guideUrl = (slug: string) => `${BASE_URL}/${slug}`;

// /guides is an article index (a reading list), deliberately unlike the use-case cards.
export function guideList(list: Guide[] = GUIDES) {
  return `<div class="glist">${list.map((g) => `<a class="gitem" href="/${g.slug}"><span class="gk">${esc(g.kicker)} · ${minutes(g)} min read</span><b>${esc(g.title)}</b><span class="gb">${esc(g.blurb)}</span></a>`).join("")}</div>`;
}
const INDEX_CSS = `
.glist { display: grid; }
.gitem { display: grid; gap: 6px; padding: 22px 0; border-bottom: 1px solid var(--rule); color: var(--ink); text-decoration: none; }
.glist .gitem:first-child { padding-top: 6px; }
.gitem .gk { font: 500 .74rem var(--f-mono); color: var(--green); text-transform: uppercase; letter-spacing: .06em; }
.gitem b { font: 600 1.45rem/1.25 "Source Serif 4", Georgia, serif; letter-spacing: -0.01em; transition: color .15s; }
.gitem:hover b { color: var(--green); }
.gitem .gb { color: var(--soft); font: 400 1.05rem/1.55 "Source Serif 4", Georgia, serif; }
.keep .gitem b { font-size: 1.15rem; } .keep .gitem { padding: 14px 0; }
`;

export function guidesIndexPage() {
  return page(
    `Guides — ${BRAND}`,
    `${SERIF_FONT}<style>${INDEX_CSS} .gi { display: grid; gap: 28px; max-width: 760px; padding-block: 52px 8px; } .gi h1 { font: 600 clamp(2.1rem, 4.6vw, 3rem)/1.1 "Source Serif 4", Georgia, serif; letter-spacing: -0.02em; } .gi .dek { font: 400 1.22rem/1.5 "Source Serif 4", Georgia, serif; color: var(--soft); margin: 0; }</style>
    <section class="gi"><div style="display:grid;gap:12px;padding-bottom:20px;border-bottom:1px solid var(--rule)"><span class="eyebrow">Guides</span><h1>Mail that needs proof</h1>
      <p class="dek">Plain-English guides to certified letters, tax replies, disputes and demands: what to send, what to include, and how to prove it arrived.</p></div>
      ${guideList()}
      <p class="soft" style="font-size:.88rem;margin:0">${esc(GUARDRAIL)}</p></section>`,
    { description: `Guides to sending certified mail online: IRS notice replies, security deposit and unpaid invoice demand letters, credit report disputes and mailing a PDF, with ${BRAND}.` },
  );
}
