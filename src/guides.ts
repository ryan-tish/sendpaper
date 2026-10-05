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

const CSS = `
.g { display: grid; gap: 28px; max-width: 760px; padding-block: 52px 8px; }
.g section { padding-block: 0; margin: 0; }
.g h1 { font-size: clamp(1.9rem, 4vw, 2.7rem); text-wrap: balance; }
.g .lede { font-size: 1.1rem; color: var(--soft); }
.g h2 { font-size: 1.3rem; }
.steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; counter-reset: s; }
.steps li { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 12px; counter-increment: s; }
.steps li::before { content: counter(s); font: 600 .9rem var(--f-mono); color: var(--green); background: var(--green-soft); border-radius: 999px; width: 30px; height: 30px; display: grid; place-items: center; }
.steps b { display: block; }
.g ul.inc { margin: 0; padding-left: 20px; display: grid; gap: 6px; color: var(--soft); }
.g .prompt { font: .9rem/1.6 var(--f-mono); background: var(--tint); border: 1px solid var(--rule); border-radius: 10px; padding: 14px 16px; }
.g .prompt::before { content: "› "; color: var(--green); }
.g .ctas { display: flex; flex-wrap: wrap; gap: 10px; }
.g details { border-bottom: 1px solid var(--rule); padding-block: 12px; }
.g summary { font-weight: 600; cursor: pointer; }
.g details p { color: var(--soft); margin: 8px 0 0; }
.g .guard { font-size: .88rem; color: var(--faint); }
.g .more { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: .92rem; }
`;

export function guidePage(slug: string) {
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) return null;
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: g.faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const others = GUIDES.filter((x) => x.slug !== slug);
  return page(
    `${g.title} — ${BRAND}`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script><style>${CSS}</style>
    <article class="g">
      <div style="display:grid;gap:12px"><span class="eyebrow">Guide</span><h1>${esc(g.title)}</h1><p class="lede">${esc(g.lede)}</p>
        <div class="ctas"><a class="btn green" href="${esc(g.send)}">Send it from the web</a><a class="btn alt" href="${esc(docsUrl("/quickstart"))}">Use your AI agent</a></div></div>
      <section style="display:grid;gap:14px"><h2>How it works</h2><ol class="steps">${g.steps.map(([t, d]) => `<li><div><b>${esc(t)}</b><span class="soft">${esc(d)}</span></div></li>`).join("")}</ol></section>
      <section style="display:grid;gap:10px"><h2>What to include</h2><ul class="inc">${g.include.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></section>
      <section style="display:grid;gap:10px"><h2>Ask your agent</h2><p class="soft" style="margin:0">With ${esc(BRAND)} connected to Codex, Muse or Claude, paste this and fill in the brackets:</p><div class="prompt">${esc(g.prompt)}</div></section>
      <section style="display:grid;gap:4px"><h2>Questions</h2>${g.faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>
      <p class="guard">${esc(GUARDRAIL)}</p>
      <nav class="more" aria-label="More guides"><b>More guides:</b>${others.map((o) => `<a href="/${o.slug}">${esc(o.title)}</a>`).join("")}<a href="/use-cases">All use cases</a></nav>
    </article>`,
    { description: g.description },
  );
}

export const guideUrl = (slug: string) => `${BASE_URL}/${slug}`;

// /guides: every guide as a card, so they're easy to find (Ryan, 2026-10-05: "make the guides more visible").
export function guideCards(list: Guide[] = GUIDES) {
  return `<div class="gcards">${list.map((g) => `<a class="gcard" href="/${g.slug}"><b>${esc(g.title)}</b><span>${esc(g.blurb)}</span><i aria-hidden="true">Read the guide →</i></a>`).join("")}</div>`;
}
export const GUIDE_CARD_CSS = `
.gcards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 14px; }
.gcard { display: grid; gap: 6px; align-content: start; padding: 18px 20px; border: 1px solid var(--rule); border-radius: 14px; background: var(--card); color: var(--ink); text-decoration: none; transition: border-color .15s, transform .15s; }
.gcard:hover { border-color: var(--green); transform: translateY(-1px); }
.gcard b { font-size: 1.02rem; letter-spacing: -0.01em; }
.gcard span { color: var(--soft); font-size: .9rem; }
.gcard i { font-style: normal; color: var(--green); font-size: .85rem; font-weight: 500; margin-top: 4px; }
@media (prefers-reduced-motion: reduce) { .gcard { transition: none; } .gcard:hover { transform: none; } }
`;

export function guidesIndexPage() {
  return page(
    `Guides — ${BRAND}`,
    `<style>${GUIDE_CARD_CSS} .gi { display: grid; gap: 24px; padding-block: 52px 8px; } .gi h1 { font-size: clamp(1.9rem, 4vw, 2.6rem); }</style>
    <section class="gi"><div style="display:grid;gap:10px;max-width:680px"><span class="eyebrow">Guides</span><h1>Mail that needs proof</h1>
      <p class="soft" style="margin:0">Step-by-step help for certified letters, tax replies, disputes and demands, each with a prompt for your agent.</p></div>
      ${guideCards()}
      <p class="soft" style="font-size:.88rem;margin:0">${esc(GUARDRAIL)}</p></section>`,
    { description: `Guides to sending certified mail online: IRS notice replies, security deposit and unpaid invoice demand letters, credit report disputes and mailing a PDF, with ${BRAND}.` },
  );
}
