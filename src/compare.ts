// Comparison pages (content plan, 2026-10-08). Rules (Ryan): be honest, including where the other service is
// better or cheaper. Every competitor fact needs a primary source with an access date; say "not found in the
// documentation we reviewed" rather than "doesn't support". Competitor prices expire: re-check on each source's
// expiry trigger (research ledger: the private ryan-tish/sendpaper-content repo, sources/compare-<slug>.md).
// We don't use the compared service: our printing partner is PostGrid. Say so on the page.
import { BASE_URL, BRAND, LIMITS } from "./config.ts";
import { ARTICLE_CSS, INDEX_CSS, type IndexCard } from "./guides.ts";
import { docsUrl, LOGO_FULL, page } from "./layout.ts";
import { esc, plain, rich } from "./render.ts";


type Compare = {
  slug: string; // served at /compare/<slug>
  rival: string;
  title: string; // visible h1, kept short
  metaTitle: string; // <title> / og:title, aim for 50–65 chars
  description: string;
  lede: string;
  checked: string; // when the competitor facts were last checked, shown on the page
  published: string; // ISO date, for Article JSON-LD
  modified: string; // ISO date of the last substantive change, for Article JSON-LD
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
    metaTitle: "Sendpaper vs. Lob: Setup, AI Agents and Which Fits",
    description: `Compare ${BRAND} and Lob on setup, payment, AI-agent support and mail formats. See which fits one-off letters and which fits business mail at scale.`,
    lede: `Lob is for mail at volume. ${BRAND} is quick and agentic: mail sent by your AI agent.`,
    checked: "October 8, 2026",
    published: "2026-10-08",
    modified: "2026-10-08",
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
      ["Volume", "Built for large volumes", "Up to 25 recipients per order; bulk and marketing mail through Enterprise"],
    ],
    rivalFits: [
      "Lob is the better choice when mail is part of how your business runs: hundreds or thousands of marketing pieces, or recurring statements and notices, often triggered from a CRM or marketing tool. **Its [per-piece prices](https://help.lob.com/print-and-mail/ready-to-get-started/pricing-details) are lower, especially at volume,** and it covers more ground, with international mail, self-mailers, checks and legal-size letters.",
      "It also suits developers who want templates, webhooks, scheduled sends and a test environment, and who are happy to set up an account, a payment method and prepaid credits first.",
    ],
    usFits: [
      `${BRAND} is the better choice when **an AI agent is doing the work.** Claude, Codex, Muse or any MCP client connects to our server with no key, drafts the letter or postcard with you, and you approve the payment. It's sent **without you ever opening an account.** Here's [how to connect Claude](https://docs.sendmypaper.com/agents/claude).`,
      "It's also the quick path for one-off mail to US addresses: one letter, a [certified letter](/send?product=letter_certified) or a few postcards, or a document you already have ([mail a PDF](/send/letter?source=pdf)). **There are no prepaid credits;** each order has its own checkout, and **a real person looks at every piece before it prints.**",
    ],
    faqs: [
      [`Is ${BRAND} built on Lob?`, `No. ${BRAND}'s printing and mailing partner is PostGrid. We don't use Lob.`],
      ["Is Lob cheaper?", `Per piece, yes, especially at volume (see [Lob's pricing details](https://help.lob.com/print-and-mail/ready-to-get-started/pricing-details)). Lob asks you to set up an account and prepay credits first; ${BRAND} charges per order with no account.`],
      ["Can an AI agent send mail through Lob?", "Yes, through third-party MCP connectors such as Zapier's or Pipedream's, using your own Lob account and API key. We found no first-party Lob MCP server on [Lob's GitHub](https://github.com/lob) or in its documentation as of October 8, 2026."],
      ["Can I use both?", `Yes. You can use Lob for high-volume business mail and ${BRAND} for occasional letters sent from an AI agent. ${BRAND} keeps no templates or contact lists, so there's nothing to migrate either way.`],
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
  {
    slug: "mailform",
    rival: "Mailform",
    title: "Sendpaper vs. Mailform",
    metaTitle: "Sendpaper vs. Mailform: AI Agents, Setup and Which Fits",
    description: `Compare ${BRAND} and Mailform on AI-agent support, setup, certified mail and range. See which fits a letter from your agent and which fits office mail.`,
    lede: `Mailform is a full mailroom on the web. ${BRAND} is quick and agentic: mail sent by your AI agent.`,
    checked: "October 12, 2026",
    published: "2026-10-11",
    modified: "2026-10-12",
    card: { date: "2026-10-11", label: "Sendpaper vs. Mailform", blurb: "When Mailform's wider range fits better, and when an agent-first service does." },
    answer: [
      "Mailing long documents, overnight by FedEx, abroad, or in bulk from your office? **Use Mailform.**",
      `Want your AI agent to write and send a letter, a certified letter or a few postcards, with a person checking it before it prints? **Use ${BRAND}.**`,
    ],
    table: [
      ["Built for", "Offices mailing documents: invoices, legal and medical paperwork, bulk mailings", "Quick, agentic mail: your AI agent drafts it, you approve it, it's sent"],
      ["Getting started", "One letter needs no sign-up; bulk, credits and the API need an account", "No account for anything: web, API, agent or up to 25 recipients"],
      ["How you pay", "Per order by card, Link or PayPal, or prepaid credits; optional monthly plans", "Per order: card checkout, or your agent pays with Stripe Link once you approve"],
      ["AI agents", "No official MCP server; a Microsoft connector for Copilot Studio", "Built-in MCP server for Claude, Codex, Muse and any MCP client. No key needed"],
      ["Developers", "REST API with keys, test mode and webhooks", "REST API and MCP, no keys"],
      ["Formats", "PDF or Word, long documents, 4×6 postcards, checks, return envelopes", `Letters from text or a PDF up to ${LIMITS.pdfPages} pages, postcards in 4×6, 6×9 and 6×11`],
      ["Certified mail", "Certified, with an electronic or green-card return receipt", "Certified letters, with an optional return receipt"],
      ["Speed", "First-Class, Priority, Priority Express, FedEx and UPS overnight", "First-Class, or Express by USPS Priority"],
      ["Review before printing", "Mostly automated; we found no content review before printing", "A real person checks every piece before it prints"],
      ["Where it mails", "US and international", "US only, including territories and military addresses"],
      ["Printing partner", "Lob, through the Lob API", "PostGrid"],
      ["Trustpilot rating", "1.6 out of 5 from 22 reviews (October 2026)", "No reviews yet"],
    ],
    rivalFits: [
      "Mailform is the better choice when mail is office work: a 40-page contract, an invoice run, a document that has to arrive the next business day by FedEx, or a letter abroad. **For short letters, certified letters and 4×6 postcards, its [prices](https://www.mailform.io/pricing/) are lower than ours,** and it covers more ground, with Word uploads, green-card return receipts, checks, return envelopes and bulk mail from a spreadsheet.",
      "It also suits teams that want shared accounts, mailing lists and a developer API with test keys and webhooks, and for one letter from the website you don't even need to sign up.",
    ],
    usFits: [
      `${BRAND} is the better choice when **an AI agent is doing the work.** Claude, Codex, Muse or any MCP client connects to our server with no key, drafts the letter or postcard with you, and you approve the payment. **No account, no API key and no prepaid credits,** even through the API or for up to 25 recipients at once. Here's [how to connect Claude](https://docs.sendmypaper.com/agents/claude).`,
      `It also fits mail where the wording matters: a [certified letter](/send?product=letter_certified) to a landlord or a creditor, a note an agent wrote for you, or a [PDF you already have](/send/letter?source=pdf). **A real person looks at every piece before it prints,** and you get larger postcards, up to 6×11. Not sure you need certified? Read [what certified mail proves](/what-is-certified-mail).`,
    ],
    faqs: [
      [`Is ${BRAND} built on Mailform?`, `No. ${BRAND}'s printing and mailing partner is PostGrid. We don't use Mailform.`],
      ["Is Mailform cheaper?", `For short mail, yes: a letter of a few pages, a certified letter and a 4×6 postcard all cost less at Mailform (see [Mailform's pricing](https://www.mailform.io/pricing/)). Mailform charges for each extra page, so a PDF near our six-page limit can cost about the same at both. ${BRAND} adds a first-party agent connection, no account for API or group sends, and a person reviewing every piece.`],
      ["Can an AI agent send mail through Mailform?", "Not through an MCP server. We found no Mailform MCP server, ChatGPT app or Claude connector on its site, its GitHub, the official MCP Registry, Smithery or Glama as of October 11, 2026. Mailform does publish a [Microsoft connector](https://learn.microsoft.com/en-us/connectors/mailform/) for Power Automate and Copilot Studio, which needs an account with prepaid credit, and a developer could build their own integration with [Mailform's API](https://www.mailform.io/docs/api/), which needs an account and an API key."],
      ["Do I need an account for Mailform?", "Not for a single letter or postcard from its website. You do for bulk mail, prepaid credits and the API."],
    ],
    sources: [
      ["Mailform: pricing", "https://www.mailform.io/pricing/"],
      ["Mailform: FAQ (services, turnaround, payment, mails through Lob)", "https://www.mailform.io/faq"],
      ["Mailform: homepage (no sign-up for single letters and postcards)", "https://www.mailform.io/"],
      ["Mailform: API documentation", "https://www.mailform.io/docs/api/"],
      ["Mailform help: tracking, return receipts and Priority signatures", "https://help.mailform.io/en/articles/528128"],
      ["Mailform help: return receipt options", "https://help.mailform.io/en/articles/3133632"],
      ["Mailform help: uploading Word documents", "https://help.mailform.io/en/articles/3331264"],
      ["Mailform help: long documents", "https://help.mailform.io/en/articles/528640"],
      ["Mailform help: how orders are fulfilled (mostly automated)", "https://help.mailform.io/en/articles/529856"],
      ["Microsoft: Mailform connector (Power Automate, Copilot Studio)", "https://learn.microsoft.com/en-us/connectors/mailform/"],
      ["Trustpilot: Mailform reviews (1.6 from 22, checked October 12, 2026)", "https://www.trustpilot.com/review/mailform.io"],
      ["Mailform: terms of service (content rules)", "https://www.mailform.io/terms"],
      ["Mailform: privacy policy", "https://www.mailform.io/privacy"],
      ["Official MCP registry (no Mailform server found)", "https://registry.modelcontextprotocol.io/"],
      [`${BRAND} pricing`, "https://sendmypaper.com/#pricing"],
      [`${BRAND} content policy`, "https://sendmypaper.com/content-policy"],
    ],
  },
  {
    slug: "letterstream",
    rival: "LetterStream",
    title: "Sendpaper vs. LetterStream",
    metaTitle: "Sendpaper vs. LetterStream: AI Agents, Setup and Which Fits",
    description: `Compare ${BRAND} and LetterStream on AI-agent support, setup, certified mail and range. See which fits a letter from your agent and which fits office mail.`,
    lede: `LetterStream is a low-cost online mailroom for businesses and individuals. ${BRAND} is quick and agentic: mail sent by your AI agent.`,
    checked: "November 9, 2026",
    published: "2026-11-09",
    modified: "2026-11-09",
    card: { date: "2026-11-09", label: "Sendpaper vs. LetterStream", blurb: "When LetterStream's low prices and office tools fit better, and when an agent-first service does." },
    answer: [
      "Mailing from your office every week, in bulk or abroad, or want the lowest price per piece? **Use LetterStream.**",
      `Want your AI agent to write and send a letter, a certified letter or a few postcards, with no account and a person checking it before it prints? **Use ${BRAND}.**`,
    ],
    table: [
      ["Built for", "Businesses and individuals mailing documents: HOA notices, legal and healthcare paperwork, collections", "Quick, agentic mail: your AI agent drafts it, you approve it, it's sent"],
      ["Getting started", "Create a free account (no monthly fee) and log in to send; API access after review", "No account for anything: web, API, agent or up to 25 recipients"],
      ["How you pay", "Per job by card, or a prepaid balance once your first job has mailed; checks too, and ACH or wire for pre-approved large orders", "Per order: card checkout, or your agent pays with Stripe Link once you approve"],
      ["AI agents", "No official MCP server (an unofficial open-source one needs your own API credentials); AI help drafting letters in its web portal", "Built-in MCP server for Claude, Codex, Muse and any MCP client. No key needed"],
      ["Developers", "API after review, with PDF and CSV uploads and webhooks; software partners for HOA, legal and credit repair", "REST API and MCP, no keys"],
      ["Formats", "Letters up to 14 sheets (PDF, Word or typed on the site), 9×12 flats up to 75 sheets, postcards in 5.5×4.25 and 8.5×5.5", `Typed letters (about 3 pages) or a PDF up to ${LIMITS.pdfPages} pages; postcards in 4×6, 6×9 and 6×11`],
      ["Certified mail", "Certified letters and flats, with an optional electronic return receipt", "Certified letters, with an optional return receipt"],
      ["Speed", "First-Class and Certified, with optional next-day or same-day mailout; FedEx 2Day for pre-approved businesses", "First-Class, or Express by USPS Priority (not with Certified)"],
      ["Review before printing", "You approve the proofs, then production is automated; it bans scam and illegal mail and may review a flagged document, but we found no routine check before printing", "A real person checks every piece before it prints"],
      ["Where it mails", "US, plus Registered Mail abroad", "US only, including territories and military addresses"],
      ["Volume", "Advertises 1 to 1,000,000-piece mailings; bulk discounts considered case by case", "Up to 25 recipients per order; bulk and marketing mail through Enterprise, by agreement"],
    ],
    rivalFits: [
      "LetterStream is the better choice when mail is routine office work: HOA notices, collection letters, legal and healthcare paperwork, ready to upload or type. **Its [prices](https://www.letterstream.com/pricing/) are much lower than ours** for letters, certified letters and postcards, even for a single letter, and it covers more ground, with 9×12 flats up to 75 sheets, return envelopes, scheduled mailings, FedEx 2Day for approved businesses and Registered Mail abroad.",
      "It also suits teams that mail every week: a free account with no monthly fee, multi-user access, a prepaid balance, bulk discounts considered for large mailings, and an API with webhooks for software that sends on your behalf.",
    ],
    usFits: [
      `${BRAND} is the better choice when **an AI agent is doing the work.** Claude, Codex, Muse or any MCP client connects to our server with no key, drafts the letter or postcard with you, and you approve the payment. **No account, no API key and no prepaid balance,** even through the API or for up to 25 recipients at once. Here's [how to connect Claude](https://docs.sendmypaper.com/agents/claude), and [which AI assistants can send mail](/can-ai-send-mail).`,
      `It also fits the one letter that matters: a [certified letter](/send/certified) to a landlord or a creditor, a note your agent wrote with you, or a [PDF you already have](/send/letter?source=pdf). **A real person looks at every piece before it prints,** and postcards go up to 6×11. Not sure you need certified? Read [what certified mail proves](/what-is-certified-mail).`,
    ],
    faqs: [
      [`Is ${BRAND} built on LetterStream?`, `No. ${BRAND}'s printing and mailing partner is PostGrid. We don't use LetterStream.`],
      ["Is LetterStream cheaper?", `Yes, by a wide margin, for letters, certified letters and postcards, even a single letter (see [LetterStream's pricing](https://www.letterstream.com/pricing/)). It needs a free account first; ${BRAND} adds a first-party agent connection, no account for anything, and a person reviewing every piece.`],
      ["Can an AI agent send mail through LetterStream?", "Not through an official MCP server: we found none on LetterStream's site or in the official MCP Registry as of November 9, 2026. An [unofficial, open-source MCP server](https://github.com/ajplotkin/letterstream-mcp) exists. It isn't made or endorsed by LetterStream, and it needs your own LetterStream account and API credentials, which LetterStream grants after reviewing a request. Its web portal does offer AI help with drafting a letter."],
      ["Do I need an account for LetterStream?", "Yes. You create a free account with no monthly fee and log in to send. API access is requested by email after you sign up and turned on once LetterStream approves it, and a prepaid balance becomes available once your first mailing has gone out."],
    ],
    sources: [
      ["LetterStream: pricing", "https://www.letterstream.com/pricing/"],
      ["LetterStream: homepage (industries, free account, FedEx 2Day for pre-approved businesses)", "https://www.letterstream.com/"],
      ["LetterStream: web portal (proofs, file types, typed and AI-drafted letters, scheduling, Expedite and Rush)", "https://www.letterstream.com/webportal/"],
      ["LetterStream: API (account first, access on request)", "https://www.letterstream.com/api/"],
      ["LetterStream: apps and integrations (webhooks, software partners)", "https://www.letterstream.com/apps-integrations/"],
      ["LetterStream help: forms of payment, prepaid balance, ACH and wire for pre-approved companies", "https://help.letterstream.com/article/39-forms-of-payment"],
      ["LetterStream help: types of documents it mails", "https://help.letterstream.com/article/1021-types-of-documents-we-can-mail"],
      ["LetterStream help: postcard options", "https://help.letterstream.com/article/1074-postcard-options"],
      ["LetterStream help: sending certified mail", "https://help.letterstream.com/article/645-sending-certified-mail"],
      ["LetterStream help: bulk and quantity discounts", "https://help.letterstream.com/article/718-bulk-quantity-discounts"],
      ["LetterStream: terms of service (billing, document review)", "https://www.letterstream.com/terms"],
      ["letterstream-mcp (unofficial, third party)", "https://github.com/ajplotkin/letterstream-mcp"],
      ["Official MCP registry: search for LetterStream (no results)", "https://registry.modelcontextprotocol.io/v0/servers?search=letterstream"],
      [`${BRAND} pricing`, "https://sendmypaper.com/#pricing"],
      [`${BRAND} content policy`, "https://sendmypaper.com/content-policy"],
    ],
  },
  {
    slug: "stamps-com",
    rival: "Stamps.com",
    title: "Sendpaper vs. Stamps.com",
    metaTitle: "Sendpaper vs. Stamps.com for Certified Mail: Which Fits",
    description: `Compare ${BRAND} and Stamps.com for sending a certified letter: printing, setup, cost and AI agents. See which fits one letter and which fits weekly mail.`,
    lede: `With Stamps.com, you print certified mail postage at your desk. ${BRAND} prints and mails the whole letter for you, or for your AI agent.`,
    checked: "November 9, 2026",
    published: "2026-11-09",
    modified: "2026-11-09",
    card: { date: "2026-11-09", label: "Sendpaper vs. Stamps.com", blurb: "Sending a certified letter: when printing it yourself fits better, and when we should mail it for you." },
    answer: [
      "Sending certified mail every week from an office with a printer? **Use Stamps.com.**",
      `Need one certified letter mailed without a printer, envelopes or a monthly plan, or want your AI agent to send it? **Use ${BRAND}.**`,
    ],
    table: [
      ["Built for", "Offices that mail and ship every day: postage, labels and Certified Mail forms printed at your desk", "Quick, agentic mail: your AI agent drafts it, you approve it, it's sent"],
      ["What you do", "Print the letter and the Certified Mail label, put the letter in an envelope and the label on it, then drop it in a mailbox or schedule a USPS pickup", "Type the letter or upload a PDF. We print it, put it in an envelope and mail it"],
      ["What you need", "An account and a printer, per its Certified Mail steps; Certified Mail forms are sold in its store", "A browser or an AI agent. No printer, no account"],
      ["Plans", "Monthly plans; Certified Mail is on Professional and up, with a 30-day free trial", "No plans, no subscription"],
      ["How you pay", "The monthly plan, plus USPS postage and Certified Mail fees for each letter", "Per letter: card checkout, or your agent pays with Stripe Link once you approve"],
      ["Certified options", "Green-card or electronic return receipt, Restricted Delivery, Registered Mail", "Certified letters, with an optional return receipt"],
      ["Records", "Proof of mailing, tracking and delivery records in your account", "A USPS tracking number on your order page once it's assigned"],
      ["AI agents", "No official MCP server; third-party agent tools use your own API key", "Built-in MCP server for Claude, Codex, Muse and any MCP client. No key needed"],
      ["Before it's mailed", "You check your own letter and label", "A real person checks every piece before it prints"],
      ["Beyond letters", "Stamps, packages, international shipping, UPS, FedEx and more", "Letters and postcards to US addresses, including territories and military addresses"],
    ],
    rivalFits: [
      "Stamps.com is the better choice when certified mail is routine: a law office, a property manager or a business that sends notices every week and already has a printer and envelopes. You pay [USPS postage and fees](https://www.stamps.com/mail/certified-mail/) for each letter plus the [monthly plan](https://www.stamps.com/pricing/), so **for a weekly sender it usually costs less per letter than we do, even counting the plan.** It also covers far more: a choice of green-card or electronic return receipt, Restricted Delivery, Registered Mail, packages and other carriers.",
      "Its 30-day free trial covers the plan fee (you still pay postage and USPS fees), so it can also work for a one-off letter if you have a printer and cancel before the trial ends.",
    ],
    usFits: [
      `${BRAND} is the better choice when you **don't have a printer, envelopes or a monthly plan,** or don't want them for one letter. Type the letter or upload a PDF, choose a [certified letter](/send/certified), pay once, and **we print it, put it in an envelope and mail it.** **A real person looks at every piece before it prints.**`,
      `It's also built for **AI agents**: Claude, Codex, Muse or any MCP client connects with no key, drafts the letter with you, and you approve the payment. Here's [how to connect Claude](https://docs.sendmypaper.com/agents/claude). Not sure certified is what you need? Read [what certified mail proves](/what-is-certified-mail) and [certified mail vs. return receipt](/certified-mail-vs-return-receipt).`,
    ],
    faqs: [
      [`Is ${BRAND} built on Stamps.com?`, `No. ${BRAND}'s printing and mailing partner is PostGrid. We don't use Stamps.com.`],
      ["Is Stamps.com cheaper for certified mail?", `If you send certified mail every week or more, usually yes. You pay USPS postage and fees for each letter plus a monthly plan (see [Stamps.com's pricing](https://www.stamps.com/pricing/)), and you supply the printer, paper and envelopes and do the mailing. ${BRAND} charges one price per letter that includes printing, the envelope and USPS fees, with no plan.`],
      ["Do I need a printer for Stamps.com?", "Its Certified Mail steps say yes: you print the Certified Mail label with any standard printer, print your letter, and drop it in a mailbox or schedule a free USPS pickup."],
      ["Can an AI agent send certified mail through Stamps.com?", "Not through an official MCP server: we found none in Stamps.com's developer pages or the official MCP Registry as of November 9, 2026. Third-party tools such as [Jentic](https://jentic.com/apis/stamps.com/stamps) let an agent call Stamps.com's API with your own API key, and the labels it creates still have to be printed and put on the envelope."],
      [`Do I get a mailing receipt from ${BRAND}?`, "You get a USPS tracking number on your order page once it's assigned, and the optional return receipt shows who signed. You don't get a USPS mailing receipt from us, because our print partner hands the letter to USPS. If you need one, hand the letter to a post office clerk for a postmarked receipt, or use a postage service like Stamps.com, which keeps mailing receipts in your account."],
    ],
    sources: [
      ["Stamps.com: Certified Mail (how it works, return receipts, Restricted Delivery, discounted rates)", "https://www.stamps.com/mail/certified-mail/"],
      ["Stamps.com: pricing and plans (Certified Mail on Professional and up, 30-day trial)", "https://www.stamps.com/pricing/"],
      ["Stamps.com: how to print certified mail", "https://www.stamps.com/faq/how-can-i-print-certified-mail-on-stamps-com/"],
      ["Stamps.com: developer account", "https://developer.stamps.com/register/"],
      ["Stamps.com: REST API reference (certified mail and return receipt options)", "https://developer.stamps.com/rest-api/reference/serav1.html"],
      ["Jentic: Stamps.com API for agents (third party)", "https://jentic.com/apis/stamps.com/stamps"],
      ["Official MCP registry: search for Stamps (no results)", "https://registry.modelcontextprotocol.io/v0/servers?search=stamps"],
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
  const url = `${BASE_URL}/compare/${c.slug}`;
  const org = { "@type": "Organization", name: BRAND, url: BASE_URL };
  const ld = [
    { "@context": "https://schema.org", "@type": "Article", headline: c.metaTitle, description: c.description, datePublished: c.published, dateModified: c.modified, author: org, publisher: org, mainEntityOfPage: url },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Guides", item: `${BASE_URL}/guides` },
      { "@type": "ListItem", position: 2, name: "Comparisons", item: `${BASE_URL}/guides#compare` },
      { "@type": "ListItem", position: 3, name: c.title, item: url },
    ] },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: plain(a) } })) },
  ];
  return page(
    c.metaTitle,
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
            <thead><tr><th scope="col"><span class="sr-only">Feature</span></th><th scope="col" class="lob">${esc(c.rival)}</th><th scope="col" class="us">${LOGO_FULL}<span class="sr-only">${esc(BRAND)}</span></th></tr></thead>
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
  COMPARES.map((c) => ({ href: `/compare/${c.slug}`, title: c.title, blurb: c.card.blurb, tag: "Comparison", cat: "compare", date: c.card.date, art: "compare", label: c.card.label, vs: c.rival }));
