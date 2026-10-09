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
  retired?: string; // ISO date the page was taken down; it then redirects to /guides
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
  // Optional extras (content plan, 2026-10-08): a facts table under the header, setup blocks with copyable code
  // (agent guides), one screenshot from a real run, and CTA buttons that replace the default send/agent pair.
  glance?: [string, string][];
  setup?: { title: string; body: string; code?: string }[];
  figure?: { src: string; alt: string; caption: string };
  ctas?: [string, string][]; // [label, href]; the first is the green primary button
  group?: "agents"; // agent how-tos are listed apart from the proof-of-delivery guides on /guides
  sources?: [string, string][]; // [label, url]: primary sources for factual claims, listed at the end
  // The /guides card (Ryan, 2026-10-08: Mintlify-blog style). date = last substantive change (ISO), never bumped
  // without a real rewrite; art picks the thumbnail illustration; label is the big text on the thumbnail.
  card: { cat: CardCat; date: string; art: CardArt; label: string };
};
export type CardCat = "proof" | "documents" | "agents" | "compare";
export type CardArt = "track" | "letter" | "pdf" | "chat" | "compare";

// Every guide ever published. Retired ones (Ryan, 2026-10-08: "remove all articles except the Lob comparison") stay here so
// they can be restored by deleting `retired`; their URLs 301 to /guides (RETIRED_PATHS, in web.ts) and leave the sitemap.
const ALL_GUIDES: Guide[] = [
  {
    slug: "certified-mail-online",
    retired: "2026-10-08",
    card: { cat: "proof", date: "2026-10-08", art: "track", label: "Certified Mail" },
    kicker: "Certified mail",
    blurb: "Tracking and proof of delivery, without the post office.",
    title: "Send certified mail online",
    description: `Send USPS Certified Mail online: tracking and proof of delivery for ${CERT}, or ${RR} with an electronic return receipt. Type it or upload a PDF.`,
    lede: `Skip the post office line. Write your letter or upload a PDF, choose Certified Mail, and we print it, mail it by USPS Certified Mail and give you the tracking number. ${CERT}, or ${RR} with a return receipt that carries the recipient's signature.`,
    glance: [
      ["Price", `${CERT} Certified Mail, or ${RR} with a return receipt. Printing, envelope and postage included.`],
      ["You get", "A USPS tracking number and a record of mailing and delivery. With a return receipt, also a PDF of the recipient's signature from USPS."],
      ["Return receipt", "Request it at USPS Tracking with the tracking number after delivery; USPS emails the signed receipt as a PDF (per USPS, usually within 48 hours of delivery)."],
      ["Your letter", `Type it (about 3 pages) or upload a PDF of up to ${LIMITS.pdfPages} pages. US addresses only.`],
      ["Not available", "Express delivery (Certified travels by First-Class Mail), and mail outside the US."],
    ],
    steps: [
      ["Write it or upload it", `Type the letter, have your AI agent draft it, or upload a PDF (up to ${LIMITS.pdfPages} pages) on the certified letter form.`],
      ["Choose Certified, with or without a return receipt", `Certified (${CERT}) gives you a USPS tracking number and a record of mailing and delivery. Add a return receipt (${RR}) when you need the recipient's signature.`],
      ["Check the print and pay", "You see exactly what will be printed before you pay. A person reviews every piece, and we aim to mail it within one business day of payment."],
      ["Track it, then get the receipt", "The tracking number appears on your order page after the letter is printed and handed to USPS. If you chose a return receipt, request it from USPS Tracking after delivery (see below)."],
    ],
    include: ["The recipient's full mailing address (US only)", "Your return address, which shows through the envelope window with the recipient's", "A clear subject line and date in the letter", "Copies of any documents you reference (never originals)"],
    prompt: "Write a short letter to [recipient] about [topic] and send it by certified mail with a return receipt. My return address is [address].",
    send: "/send?product=letter_certified",
    faqs: [
      ["What's the difference between Certified Mail and a return receipt?", "Certified Mail gives you a USPS tracking number and a record that the letter was mailed and delivered. A return receipt adds the recipient's signature as proof of who received it."],
      ["How do I get the return receipt?", "After the letter is delivered, go to USPS Tracking, enter the tracking number from your order page, choose Return Receipt (Electronic) and enter your email address. USPS emails the signed receipt as a PDF; USPS says it's usually available within 48 hours of delivery. This is how our print partner, PostGrid, says to retrieve it. If you can't get it, email us with your order number."],
      ["When do I get the tracking number?", "After your letter is printed and handed to USPS. It appears on your order page with a link to USPS Tracking, and your AI agent can read it with get_order."],
      ["Can I send my own PDF?", `Yes. Upload a PDF of up to ${LIMITS.pdfPages} pages; any page size is fitted to 8.5×11 and an address page is added in front, so your document needs no space for addresses.`],
      ["How fast does it arrive?", "Certified Mail travels by First-Class Mail, which USPS estimates at 1 to 5 business days within the US (not guaranteed). We aim to mail it within one business day of payment, after review. Express isn't available with Certified Mail."],
      ["Does certified mail meet my legal or contract requirement?", "We can't tell you that. Some rules ask for certified mail, others for a return receipt or a specific method. Check the notice, contract or rule you're following, or ask a professional."],
    ],
    sources: [
      ["USPS: Certified Mail, the basics", "https://faq.usps.com/s/article/Certified-Mail-The-Basics"],
      ["USPS: Electronic Return Receipt", "https://faq.usps.com/s/article/What-is-Electronic-Return-Receipt"],
      ["USPS: First-Class Mail delivery times", "https://www.usps.com/ship/first-class-mail.htm"],
      ["PostGrid: how to get the return receipt for certified mail", "https://www.postgrid.com/how-to-send-certified-mail-via-api/"],
    ],
  },
  {
    slug: "irs-notice-response",
    retired: "2026-10-08",
    card: { cat: "proof", date: "2026-10-05", art: "letter", label: "IRS Notice Reply" },
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
    retired: "2026-10-08",
    card: { cat: "proof", date: "2026-10-05", art: "letter", label: "Security Deposit" },
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
    retired: "2026-10-08",
    card: { cat: "proof", date: "2026-10-05", art: "track", label: "Credit Dispute" },
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
    retired: "2026-10-08",
    card: { cat: "proof", date: "2026-10-05", art: "letter", label: "Unpaid Invoice" },
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
    retired: "2026-10-08",
    card: { cat: "documents", date: "2026-10-08", art: "pdf", label: "Mail a PDF" },
    kicker: "Documents",
    blurb: "Upload a document; we print, envelope and mail it.",
    title: "Mail a PDF online",
    description: `Upload a PDF and we print and mail it by USPS: ${LETTER} First-Class or ${CERT} Certified. Up to ${LIMITS.pdfPages} pages, any page size. See the exact print first.`,
    lede: `Have a signed form, an application or a letter you already wrote? Upload the PDF and we print it, put it in an envelope and mail it by USPS. ${LETTER} First-Class, ${CERT} Certified, or express for ${usd(EXPRESS_CENTS)} more. No printer, no stamps, no post office.`,
    glance: [
      ["Price", `${LETTER} First-Class, the same for 1 to ${LIMITS.pdfPages} pages. Printing, envelope and postage included.`],
      ["Proof of delivery", `Certified Mail ${CERT}, or ${RR} with a return receipt (the recipient's signature).`],
      ["Faster", `Express (USPS Priority Mail, usually 2 to 3 days, tracked): ${usd(EXPRESS_CENTS)} more. Not combinable with Certified.`],
      ["Your file", `PDF, up to ${LIMITS.pdfPages} pages and ${LIMITS.pdfBytes / 1024 / 1024} MB. Any page size; each page is fitted to 8.5×11.`],
      ["Printing", `One-sided, black and white. Color is ${usd(COLOR_LETTER_CENTS)} more.`],
      ["Addresses", "We add an address page in front, so your document needs no room for them. US addresses only."],
    ],
    steps: [
      ["Pick the form, then upload", `Need tracking and proof of delivery? Start from the Certified letter form (${CERT}). Otherwise use the Letter form (${LETTER} First-Class, or Express). Choose Upload a PDF and drop in your file: each page is fitted to US Letter (8.5×11), and a file over ${LIMITS.pdfPages} pages is turned back right away with a message saying so.`],
      ["Add the addresses", "Enter who it's going to and your return address. Sending the same document to several people? Add up to 25 recipients; each is mailed separately and you pay once."],
      ["Check the print and pay", "Preview the print and pay opens your order page: an itemized total and the exact print, starting with the address page we add. Nothing is printed until you pay, and a person reviews every piece before it's mailed."],
    ],
    figure: {
      src: "/guides/img/mail-a-pdf-address-page.png",
      alt: "Print preview of the address page Sendpaper adds in front of an uploaded PDF, showing the return address, the recipient's address and the note: Address page, added automatically. Your document follows (6 pages, black and white).",
      caption: "The address page we add in front of a 6-page PDF, from the print preview of a test order (sample names). The printed page uses USPS-standardized address formatting.",
    },
    include: ["The recipient's full US mailing address", "Your return address", "Every page you need them to receive, in one PDF", "Signatures already on the document (we print what you upload)"],
    prompt: "Mail the PDF at [public https link] to [recipient], [address], by certified mail. My return address is [address].",
    send: "/send?type=letter&source=pdf",
    faqs: [
      ["Does it cost more for more pages?", `No. A PDF letter is ${LETTER} First-Class for anything from 1 to ${LIMITS.pdfPages} pages, or ${CERT} by Certified Mail.`],
      ["What if my PDF is longer than six pages?", `The upload is turned back with a message giving the page count. Split it and send two letters, or trim pages you don't need. The limit is ${LIMITS.pdfPages} pages.`],
      ["What happens to the page size?", "Each page is scaled to fit US Letter (8.5×11), keeping its proportions, so A4 and other sizes print correctly. We keep our own normalized copy, so what prints is exactly what you previewed."],
      ["Is it printed on both sides?", `No. Every page prints on one side, in black and white unless you choose color (${usd(COLOR_LETTER_CENTS)} more).`],
      ["Where do the addresses go?", "On an extra address page we add in front, which shows through the envelope window. Your document prints exactly as it is."],
      ["Can my AI agent mail a PDF?", "Yes. Agents pass a public link to the PDF to create_letter (content.pdf_url), and the order works like any other: you get a preview and a checkout link."],
    ],
  },
  {
    slug: "send-mail-from-claude",
    retired: "2026-10-08",
    card: { cat: "agents", date: "2026-10-08", art: "chat", label: "Mail from Claude" },
    group: "agents",
    kicker: "AI agents",
    blurb: "Connect Sendpaper to Claude and have it mail real letters and postcards.",
    title: "How to send a physical letter from Claude",
    description: `Connect Sendpaper to Claude Code, Claude Desktop or claude.ai and Claude can mail letters, PDFs and postcards by USPS. No API key; pay per piece.`,
    lede: "Claude can't mail anything on its own, but connected to Sendpaper it can. Add one connector, ask Claude to send a letter, a PDF or a postcard, check the preview, and pay. We print it and mail it by USPS.",
    glance: [
      ["Works in", "Claude Code, Claude Desktop and claude.ai. Setup steps for each are below."],
      ["Account or API key", "None. Sendpaper's connector needs no sign-in; you pay per piece."],
      ["What Claude can send", `Postcards from ${usd(PRODUCTS.postcard_4x6.cents)}, letters from ${LETTER}, your own PDF (up to ${LIMITS.pdfPages} pages), and Certified Mail from ${CERT}. US addresses only.`],
      ["Who pays", "You do, at a checkout link. In Claude Code with Stripe's Link CLI set up, Claude can instead pay with a one-time payment you approve for that amount."],
      ["Tested", "Claude Code 2.1.290 on October 8, 2026: setup, and a PDF letter ordered up to the checkout link (against a test copy of Sendpaper; nothing was mailed)."],
    ],
    setup: [
      { title: "Claude Code", body: "Run this once in your terminal; `--scope user` makes it available in every project. Then `claude mcp list` should show sendpaper as Connected.", code: "claude mcp add --scope user --transport http sendpaper https://sendmypaper.com/mcp" },
      { title: "claude.ai and Claude Desktop", body: "Open Customize, then Connectors. Click + Add, choose Add custom connector, name it Sendpaper and paste this URL. For authentication, choose No sign in. In a chat, make sure Sendpaper is switched on under + then Connectors. Custom connectors work on every Claude plan (the Free plan allows one); on Team and Enterprise plans an Owner adds them in Organization settings.", code: "https://sendmypaper.com/mcp" },
    ],
    steps: [
      ["Ask in plain words", "Say what to send, to whom and from which return address. Claude fills in Sendpaper's create_letter or create_postcard tool; for your own document, give it a public link to the PDF."],
      ["Approve the tool call", "Claude asks before it uses a connector tool. Read what it's about to send and allow it; only choose Allow always for tools you're comfortable running unsupervised."],
      ["Check the preview and pay", "Claude gets back a preview link and a checkout link. Open the preview to see the exact print, then pay at the checkout link. Nothing is printed until the order is paid. (This walkthrough was tested up to the checkout link.)"],
      ["We review, print and mail it", "A person reviews every piece before it's printed. It goes by USPS First-Class unless you chose Express or Certified Mail. Ask Claude for the order status any time; certified letters get a USPS tracking number."],
    ],
    include: ["The recipient's full US mailing address", "Your return address (it's required, and shows through the envelope window)", "The message, or a public https link to a PDF you want mailed", "Certified Mail, if you need proof of delivery"],
    prompt: "Mail a letter to [name], [street, city, state ZIP], from [my name and address]. Say: [your message]. Show me the preview and the checkout link, and don't pay.",
    send: "/send",
    ctas: [["Connect Sendpaper to Claude", docsUrl("/agents/claude")], ["Send from the web instead", "/send"]],
    faqs: [
      ["Do I need a Sendpaper account or API key?", "No. The connector needs no authentication. Each order comes with its own checkout link, so you pay per piece."],
      ["Can Claude spend money without me?", "Not by default: Claude gives you a checkout link and you pay. The exception is Claude Code with Stripe's Link CLI set up, where Claude can pay using a one-time payment that you approve in Link for that exact amount. Either way, avoid choosing Allow always for Sendpaper's pay_order tool if you want to approve each payment yourself."],
      ["Can Claude mail my own PDF?", `Yes, if the PDF is at a public https link: Claude passes it to create_letter and we fetch it, fit each page to 8.5×11 and add an address page. Up to ${LIMITS.pdfPages} pages. For a file on your computer, upload it on the website instead.`],
      ["Can I cancel?", "Claude can cancel an order that hasn't been paid. Once it's paid, email support before it's printed."],
      ["How do I know it was mailed?", "Ask Claude to check the order: its status moves from paid to printing to mailed. Certified letters also get a USPS tracking number."],
    ],
  },
];

export const GUIDES = ALL_GUIDES.filter((g) => !g.retired);
export const GUIDE_PATHS = GUIDES.map((g) => `/${g.slug}`);
export const RETIRED_PATHS = ALL_GUIDES.filter((g) => g.retired).map((g) => `/${g.slug}`);

// Guides read as articles (Ryan, 2026-10-05: "more article-like, more different from the use cases"): the site font
// (Geist; a serif was tried and dropped the same day for consistency),
// a narrow reading column, written-out steps and Q&A, an "On this page" rail on wide screens. Use cases stay cards.
export const UPDATED = "October 2026"; // bump when guide copy changes
const minutes = (g: Guide) => Math.max(2, Math.round([g.lede, ...g.steps.flat(), ...g.include, g.prompt, ...g.faqs.flat(), ...(g.glance ?? []).flat(), ...(g.setup ?? []).map((x) => x.body)].join(" ").split(/\s+/).length / 200));
const priceFor = (g: Guide) => (g.group === "agents" ? `Postcards from ${usd(PRODUCTS.postcard_4x6.cents)}, letters from ${LETTER}` : g.send.includes("certified") ? `Certified letter from ${CERT}` : `Letters from ${LETTER}`);
// Setup text may mark commands with backticks; everything else is escaped.
const inline = (t: string) => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>");

export const ARTICLE_CSS = `
.art { display: grid; grid-template-columns: minmax(0, 680px) 200px; justify-content: space-between; gap: 56px; padding-block: 44px 8px; }
@media (max-width: 960px) { .art { grid-template-columns: minmax(0, 680px); } .toc { display: none; } }
.art .crumbs { font-size: .88rem; color: var(--faint); } .art .crumbs a { color: var(--soft); text-decoration: none; } .art .crumbs a:hover { color: var(--green); }
.art header { display: grid; gap: 14px; padding-bottom: 28px; border-bottom: 1px solid var(--rule); }
.art h1 { font: 600 clamp(2.1rem, 4.6vw, 3rem)/1.08 var(--f-ui); letter-spacing: -0.035em; }
.art .dek { font: 400 1.2rem/1.55 var(--f-ui); color: var(--soft); margin: 0; }
.art .meta { font: 500 .78rem var(--f-mono); color: var(--faint); letter-spacing: .02em; display: flex; flex-wrap: wrap; gap: 6px 14px; }
.prose { font: 400 1.05rem/1.75 var(--f-ui); color: var(--ink); }
.prose h2 { font: 600 1.45rem/1.25 var(--f-ui); letter-spacing: -0.025em; margin: 44px 0 12px; scroll-margin-top: 90px; }
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
.prose .guard { font: 400 .9rem/1.6 var(--f-ui); color: var(--faint); border-top: 1px solid var(--rule); padding-top: 18px; margin-top: 36px; }
.toc { position: sticky; top: 96px; align-self: start; display: grid; gap: 8px; font-size: .88rem; padding-top: 6px; }
.toc span { font: 500 .72rem var(--f-mono); color: var(--faint); text-transform: uppercase; letter-spacing: .08em; }
.toc a { color: var(--soft); text-decoration: none; } .toc a:hover { color: var(--green); }
.glance { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 10px 22px; margin: 26px 0 0; padding: 18px 20px; border: 1px solid var(--rule); border-radius: 12px; background: var(--tint); font-size: .95rem; line-height: 1.55; }
.glance dt { font: 500 .74rem/1.9 var(--f-mono); color: var(--faint); text-transform: uppercase; letter-spacing: .06em; }
.glance dd { margin: 0; }
@media (max-width: 560px) { .glance { grid-template-columns: minmax(0, 1fr); gap: 2px; } .glance dd { margin-bottom: 10px; } }
.prose pre { margin: 6px 0 16px; font-size: .86rem; }
.prose figure { margin: 26px 0 8px; } .prose figure img { width: 100%; height: auto; border: 1px solid var(--rule); border-radius: 10px; display: block; }
.prose ul.srcs { padding-left: 20px; margin: 0 0 6px; font-size: .95rem; }
.prose figcaption { font-size: .86rem; color: var(--faint); margin-top: 8px; line-height: 1.5; }
.keep { grid-column: 1 / -1; border-top: 1px solid var(--rule); padding-top: 28px; margin-top: 12px; display: grid; gap: 4px; }
.keep > span { font: 500 .74rem var(--f-mono); color: var(--faint); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
`;

const SECTIONS = [["how", "How it works"], ["include", "What to include"], ["agent", "Ask your agent"], ["questions", "Common questions"]];
const sectionsFor = (g: Guide) => [...(g.setup ? [["setup", "Set it up"]] : []), ...SECTIONS, ...(g.sources ? [["sources", "Sources"]] : [])];

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
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script><style>${ARTICLE_CSS}${INDEX_CSS}</style>
    <div class="art">
      <article>
        <header><div class="crumbs"><a href="/guides">Guides</a> › ${esc(g.kicker)}</div><h1>${esc(g.title)}</h1><p class="dek">${esc(g.lede)}</p>
          <div class="meta"><span>${esc(BRAND)} guide</span><span>${minutes(g)} min read</span><span>Updated ${UPDATED}</span></div>
          ${g.glance ? `<dl class="glance">${g.glance.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : ""}</header>
        <div class="prose">
          ${g.setup ? `<h2 id="setup">Set it up</h2>${g.setup.map((x) => `<h3>${esc(x.title)}</h3><p>${inline(x.body)}</p>${x.code ? `<pre><code>${esc(x.code)}</code></pre>` : ""}`).join("")}` : ""}
          <h2 id="how">How it works</h2>
          ${g.steps.map(([t, d], i) => `<h3><span class="num">0${i + 1}</span>${esc(t)}</h3><p>${esc(d)}</p>`).join("")}
          ${g.figure ? `<figure><img src="${esc(g.figure.src)}" alt="${esc(g.figure.alt)}" loading="lazy"><figcaption>${esc(g.figure.caption)}</figcaption></figure>` : ""}
          <div class="cta-box"><div><b>Ready to send?</b><span>${priceFor(g)}, printing and postage included.</span></div>
            <div class="ctas">${(g.ctas ?? [["Send it from the web", g.send], ["Use your AI agent", docsUrl("/quickstart")]]).map(([t, h], i) => `<a class="btn ${i === 0 ? "green" : "alt"}" href="${esc(h)}">${esc(t)}</a>`).join("")}</div></div>
          <h2 id="include">What to include</h2>
          <ul class="check">${g.include.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
          <h2 id="agent">Ask your agent</h2>
          <p>With ${esc(BRAND)} connected to Codex, Muse or Claude, paste this and fill in the brackets:</p>
          <div class="prompt">${esc(g.prompt)}</div>
          <h2 id="questions">Common questions</h2>
          ${g.faqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}
          ${g.sources ? `<h2 id="sources">Sources</h2><ul class="srcs">${g.sources.map(([t, u]) => `<li><a href="${esc(u)}" rel="noopener">${esc(t)}</a></li>`).join("")}</ul><p class="soft" style="font-size:.88rem">Checked ${UPDATED}.</p>` : ""}
          <p class="guard">${esc(GUARDRAIL)}</p>
        </div>
      </article>
      <nav class="toc" aria-label="On this page"><span>On this page</span>${sectionsFor(g).map(([id, t]) => `<a href="#${id}">${t}</a>`).join("")}</nav>
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
export const INDEX_CSS = `
.glist { display: grid; }
.gitem { display: grid; gap: 6px; padding: 22px 0; border-bottom: 1px solid var(--rule); color: var(--ink); text-decoration: none; }
.glist .gitem:first-child { padding-top: 6px; }
.gitem .gk { font: 500 .74rem var(--f-mono); color: var(--green); text-transform: uppercase; letter-spacing: .06em; }
.gitem b { font: 600 1.35rem/1.25 var(--f-ui); letter-spacing: -0.02em; transition: color .15s; }
.gitem:hover b { color: var(--green); }
.gitem .gb { color: var(--soft); font: 400 1rem/1.55 var(--f-ui); }
.keep .gitem b { font-size: 1.15rem; } .keep .gitem { padding: 14px 0; }
`;

// /guides index (Ryan, 2026-10-08, modelled on Mintlify's blog): category tabs over a 3-column card grid; each card
// has a drawn thumbnail (HTML/CSS only, no image files), a tag chip + date, the title and a one-line excerpt.
// Without JS every card shows and the tabs are inert anchors.
export type IndexCard = { href: string; title: string; blurb: string; tag: string; cat: CardCat; date: string; art: CardArt; label: string };
const CATS: [CardCat | "all", string][] = [["all", "All guides"], ["proof", "Proof of delivery"], ["documents", "Documents"], ["agents", "AI agents"], ["compare", "Comparisons"]];
const fmtDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const bars = (ws: number[], cls = "") => ws.map((w, i) => `<i class="bar ${cls}${i % 3 === 1 ? " b2" : i % 3 === 2 ? " b3" : ""}" style="width:${w}%"></i>`).join("");

function thumbArt(art: CardArt) {
  switch (art) {
    case "track":
      return `<div class="mock"><span class="mk">USPS Certified Mail</span><div class="trk"><span><i class="dot on"></i>Mailed</span><span><i class="dot on"></i>In transit</span><span><i class="dot"></i>Delivered</span></div>${bars([80, 55])}</div>`;
    case "letter":
      return `<div class="mock page"><span class="mk">Re:</span>${bars([90, 70, 84, 46])}<svg class="sig" viewBox="0 0 80 20" aria-hidden="true"><path d="M2 14c6-10 10-10 12 0s6-12 10-2 6 4 10-4 8 10 14 2 10-6 30 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></div>`;
    case "pdf":
      return `<div class="stack"><div class="mock page back"></div><div class="mock page back2"></div><div class="mock page"><span class="pdf">PDF</span>${bars([88, 64, 76])}<span class="mk dim">8.5 × 11</span></div></div>`;
    case "chat":
      return `<div class="mock"><span class="bub">Mail a letter to Sam…</span><span class="tool"><i class="dot on"></i>create_letter</span><span class="bub you">Preview and checkout link ready.</span></div>`;
    case "compare":
      return `<div class="mock"><div class="cols"><span class="mk">Lob</span><span class="mk">Sendpaper</span></div><div class="cols">${`<div>${bars([86, 60, 74])}</div><div>${bars([70, 82, 52], "g")}</div>`}</div></div>`;
  }
}

function indexCard(c: IndexCard) {
  return `<a class="gcard" href="${esc(c.href)}" data-cat="${c.cat}"><div class="thumb" aria-hidden="true"><span class="tl">${esc(c.label)}</span>${thumbArt(c.art)}</div>
    <div class="gmeta"><span class="chip">${esc(c.tag)}</span><time datetime="${c.date}">${fmtDate(c.date)}</time></div><b>${esc(c.title)}</b><span class="gx">${esc(c.blurb)}</span></a>`;
}

const CARDS_CSS = `
.gidx { padding-block: 52px 8px; display: grid; gap: 26px; }
.gidx h1 { font: 600 clamp(2.1rem, 4.6vw, 3rem)/1.08 var(--f-ui); letter-spacing: -0.035em; }
.gidx .dek { font: 400 1.15rem/1.55 var(--f-ui); color: var(--soft); margin: 0; max-width: 64ch; }
.gtabs { display: flex; gap: 30px; border-bottom: 1px solid var(--rule); overflow-x: auto; scrollbar-width: none; margin-top: 6px; }
.gtabs a { flex: none; padding: 0 0 12px; color: var(--soft); text-decoration: none; font: 500 .98rem var(--f-ui); border-bottom: 2px solid transparent; margin-bottom: -1px; }
.gtabs a:hover { color: var(--ink); } .gtabs a[aria-current="true"] { color: var(--ink); border-bottom-color: var(--green); }
.ggrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px 26px; padding-top: 10px; }
@media (max-width: 980px) { .ggrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .thumb .tl { font-size: 1.45rem; } }
@media (max-width: 640px) { .thumb .tl { font-size: 1.6rem; } }
@media (max-width: 640px) { .ggrid { grid-template-columns: minmax(0, 1fr); } .gtabs { gap: 22px; } }
.gcard { display: grid; gap: 10px; align-content: start; color: var(--ink); text-decoration: none; }
.gcard b { font: 600 1.18rem/1.3 var(--f-ui); letter-spacing: -0.015em; transition: color .15s; }
.gcard:hover b { color: var(--green); }
.gcard .gx { color: var(--soft); font: 400 .98rem/1.55 var(--f-ui); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.gmeta { display: flex; align-items: center; gap: 12px; font-size: .9rem; color: var(--faint); margin-top: 6px; }
.chip { background: var(--tint); border: 1px solid var(--rule); color: var(--ink); font: 500 .8rem var(--f-ui); padding: 3px 9px; border-radius: 6px; }
.thumb { position: relative; aspect-ratio: 16 / 9; border-radius: 12px; border: 1px solid var(--rule); background: var(--tint); overflow: hidden; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); align-items: center; gap: 14px; padding: 0 18px 0 22px; transition: border-color .15s; }
.gcard:hover .thumb { border-color: var(--green-line); }
.thumb .tl { font: 400 clamp(1.25rem, 2.1vw, 1.7rem)/1.12 var(--f-ui); letter-spacing: -0.035em; color: var(--ink); }
.thumb .mock { background: var(--card); border: 1px solid var(--rule); border-radius: 9px; padding: 12px; display: grid; gap: 7px; box-shadow: 0 6px 18px rgba(13, 21, 18, .06); }
.thumb .mk { font: 500 .62rem var(--f-mono); color: var(--faint); text-transform: uppercase; letter-spacing: .06em; } .thumb .mk.dim { justify-self: end; }
.thumb .bar { display: block; height: 5px; border-radius: 3px; background: var(--rule); } .thumb .bar.b2 { background: var(--green-line); } .thumb .bar.g { background: var(--green); opacity: .75; } .thumb .bar.g.b2 { background: var(--lime); opacity: 1; }
.thumb .trk { display: grid; gap: 5px; font: 500 .66rem var(--f-ui); color: var(--soft); } .thumb .trk span { display: flex; align-items: center; gap: 6px; }
.thumb .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rule); flex: none; } .thumb .dot.on { background: var(--green); }
.thumb .page { aspect-ratio: 8.5 / 11; max-height: 86%; justify-self: center; width: 62%; align-content: start; padding: 10px; }
.thumb .sig { width: 60%; color: var(--green); margin-top: 4px; }
.thumb .stack { position: relative; height: 100%; display: grid; align-items: center; justify-items: center; }
.thumb .stack .page { grid-area: 1 / 1; width: 54%; max-height: 74%; position: relative; z-index: 2; }
.thumb .stack .back { transform: translate(14px, -8px) rotate(6deg); z-index: 0; } .thumb .stack .back2 { transform: translate(7px, -4px) rotate(3deg); z-index: 1; }
.thumb .pdf { justify-self: start; font: 700 .6rem var(--f-mono); color: #fff; background: var(--green); border-radius: 3px; padding: 2px 5px; }
.thumb .bub { font: 400 .66rem/1.35 var(--f-ui); background: var(--tint); border: 1px solid var(--rule); border-radius: 8px; padding: 6px 8px; color: var(--ink); justify-self: end; max-width: 92%; }
.thumb .bub.you { justify-self: start; background: var(--green-soft); border-color: var(--green-line); }
.thumb .tool { display: flex; align-items: center; gap: 6px; font: 500 .62rem var(--f-mono); color: var(--soft); }
.thumb .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; } .thumb .cols > div { display: grid; gap: 6px; }
.more-uc { display: grid; gap: 4px; padding: 18px 20px; border: 1px solid var(--rule); border-radius: 12px; background: var(--tint); color: var(--ink); text-decoration: none; margin-top: 18px; } .more-uc b { font-weight: 600; } .more-uc span { color: var(--soft); font-size: .95rem; } .more-uc:hover b { color: var(--green); }
`;

export function guidesIndexPage(comparisons: IndexCard[] = []) {
  const cards: IndexCard[] = [
    ...GUIDES.map((g) => ({ href: `/${g.slug}`, title: g.title, blurb: g.blurb, tag: g.kicker, cat: g.card.cat, date: g.card.date, art: g.card.art, label: g.card.label })),
    ...comparisons,
  ].sort((a, b) => b.date.localeCompare(a.date));
  const cats = CATS.filter(([id]) => id === "all" || cards.some((c) => c.cat === id));
  return page(
    `Guides — ${BRAND}`,
    `<style>${CARDS_CSS}</style>
    <section class="gidx"><div style="display:grid;gap:12px"><h1>Guides</h1>
      <p class="dek">Plain-English guides to mailing documents and letters that need proof, sending real mail from your AI agent, and choosing a mail service.</p></div>
      <nav class="gtabs" aria-label="Guide topics">${cats.map(([id, t], i) => `<a href="#${id}" data-tab="${id}" aria-current="${i === 0}">${t}</a>`).join("")}</nav>
      <div class="ggrid" id="ggrid">${cards.map(indexCard).join("")}</div>
      <a class="more-uc" href="/use-cases"><b>Looking for a ready-made prompt?</b><span>Browse use cases: birthday cards, landlord notices, tax replies and more, each with a prompt to copy →</span></a>
      <p class="soft" style="font-size:.88rem;margin:0">${esc(GUARDRAIL)}</p></section>
    <script>
    (function () {
      var tabs = document.querySelectorAll(".gtabs a"), cards = document.querySelectorAll(".gcard");
      function show(cat) {
        tabs.forEach(function (t) { t.setAttribute("aria-current", String(t.dataset.tab === cat)); });
        cards.forEach(function (c) { c.hidden = cat !== "all" && c.dataset.cat !== cat; });
      }
      tabs.forEach(function (t) { t.addEventListener("click", function (e) { e.preventDefault(); show(t.dataset.tab); history.replaceState(null, "", t.dataset.tab === "all" ? location.pathname : "#" + t.dataset.tab); }); });
      var h = location.hash.slice(1); if (h && document.querySelector('.gtabs a[data-tab="' + h + '"]')) show(h);
    })();
    </script>`,
    { description: `Guides to mailing a PDF, sending certified mail online, demand letters and disputes, sending mail from Claude and other AI agents, and comparisons.` },
  );
}
