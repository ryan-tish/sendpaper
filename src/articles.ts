// Topic articles (content-ops playbook topic-articles.md, 2026-10-08): explainers built from headed sections of short
// paragraphs, with an optional table per section. Unlike src/guides.ts (step-by-step "send it" pages), an article
// answers a question first and sends readers to the right sending option second. Paragraphs use rich() markup:
// **bold** for the one key distinction, [text](/path) for our pages, [text](https://…) for a source next to a claim.
// Claim ledger: the private ryan-tish/sendpaper-content repo, sources/<slug>.md. Never state a fact that isn't in it.
import { BASE_URL, BRAND, PRODUCTS } from "./config.ts";
import { ARTICLE_CSS, INDEX_CSS, type CardArt, type CardCat, type IndexCard } from "./guides.ts";
import { docsUrl, page } from "./layout.ts";
import { esc, plain, rich } from "./render.ts";
import { GYM_SOURCES, GYM_STATE_ROWS } from "./gym-laws.ts";

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const LETTER = usd(PRODUCTS.letter.cents), CERT = usd(PRODUCTS.letter_certified.cents), RR = usd(PRODUCTS.letter_certified_rr.cents);

// template: a plain-text letter shown as a preformatted block under the paragraphs (escaped, no markup).
type Section = { id: string; h: string; ps: string[]; template?: string; table?: { head: string[]; rows: string[][] }; after?: string[] };
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
  sourceNote?: string; // replaces the default USPS line under the sources
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
          "More on choosing: [certified mail vs. return receipt](/certified-mail-vs-return-receipt). If you're not sure what a rule requires, check the notice, contract or rule itself, or ask a professional. We print and mail letters; we don't give legal advice.",
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
  {
    slug: "certified-mail-vs-return-receipt",
    kicker: "Certified mail",
    title: "Certified mail vs. return receipt: what's the difference?",
    metaTitle: "Certified Mail vs. Return Receipt: What's the Difference?",
    description: "Certified Mail tracks delivery; a return receipt sends you the signature. See what each one gives you, green card vs. electronic, and when to add one.",
    lede: "Certified Mail tracks delivery. A return receipt sends you the signature.",
    checked: "October 8, 2026",
    published: "2026-10-08",
    modified: "2026-10-08",
    card: { cat: "proof", date: "2026-10-08", art: "track", label: "Return Receipt", blurb: "What each one gives you, and when the signature is worth adding." },
    answer: [
      "Certified Mail and a return receipt aren't alternatives: **a return receipt is an add-on** to a service like Certified Mail, not a separate way to send. Certified Mail gives you a tracking number and a USPS record of delivery.",
      "Adding a return receipt sends you **a record of who signed for it:** their signature, the delivery date and the address where it was actually delivered.",
    ],
    sections: [
      {
        id: "side",
        h: "What each one gives you",
        ps: [
          "[Certified Mail](/what-is-certified-mail) is the service; the return receipt is added to it. You can't buy a return receipt for a regular First-Class letter on its own.",
        ],
        table: {
          head: ["", "Certified Mail", "Certified + return receipt"],
          rows: [
            ["Tracking number", "Yes", "Yes"],
            ["Delivery or attempt date and time", "Yes", "Yes"],
            ["Signature taken at delivery", "Yes, kept by USPS", "Yes"],
            ["Who signed, sent to you automatically", "No", "Yes"],
            ["Address where it was actually delivered", "No", "Yes"],
            [`Price with ${BRAND}`, CERT, RR],
          ],
        },
        after: [
          "In short: Certified Mail tells you when it arrived. A return receipt tells you **who** took it.",
        ],
      },
      {
        id: "kinds",
        h: "Green card or electronic",
        ps: [
          "USPS offers [two kinds of return receipt](https://pe.usps.com/text/dmm300/503.htm). The **green card** (PS Form 3811) is attached to the envelope, signed at delivery and mailed back to the address on the card. The **electronic** version arrives by email. Both give you the signature, the delivery date and the delivery address.",
          "The electronic version isn't available for mail to APO/FPO/DPO addresses or US territories.",
          `Which kind comes with a ${BRAND} order, or a receipt that hasn't arrived? Email support@sendmypaper.com and we'll sort it out.`,
        ],
      },
      {
        id: "when",
        h: "When to add a return receipt",
        ps: ["**Add one when the signature itself matters:**"],
        after: [
          "The contract, lease, notice or rule you're following says **\"return receipt requested\".**",
          "You may need to show **who** received it, not just that it arrived.",
          "You want a delivery record you hold yourself, without looking it up later.",
        ],
      },
      {
        id: "skip",
        h: "When Certified Mail alone is enough",
        ps: [
          "Skip the return receipt when a delivery date is all you need: confirming a reply is on its way, or a rule that asks only for certified mail. Tracking shows when it was delivered or attempted, and USPS keeps the signature on file; it can email a [proof of delivery letter](https://pe.usps.com/text/dmm300/503.htm) that includes the signature when one is available.",
          "That letter isn't the same thing as a return receipt, so if a rule specifically asks for one, buy the return receipt. If you're not sure what a rule requires, check it or ask a professional; we print and mail letters and don't give legal advice.",
        ],
      },
    ],
    cta: {
      title: "Send a certified letter with a return receipt",
      body: `Type it or upload a PDF. ${RR} with a return receipt, or ${CERT} for Certified Mail alone. Printing, envelope and postage included.`,
      primary: ["Send with a return receipt", "/send?product=letter_certified_rr"],
      secondary: ["Ask your AI agent to send it", docsUrl("/quickstart")],
    },
    faqs: [
      ["Can I add a return receipt after mailing?", "No. USPS sells a return receipt only at the time of mailing, so decide before you send. With Certified Mail alone, you can still look up the delivery record with the tracking number."],
      ["Is a return receipt the same as restricted delivery?", "No. [Restricted delivery](https://www.usps.com/ship/insurance-extra-services.htm) limits who can sign for the letter. A return receipt tells you who did sign."],
      ["Does a return receipt prove what was in the envelope?", "No. It records delivery and who signed, not the contents. Keep a copy of exactly what you sent."],
      ["What if no one signs for it?", `USPS leaves a notice, and the recipient can pick it up or request redelivery. If it isn't claimed within 15 days, it goes back to the sender, and there's no signature to report. See [what certified mail is](/what-is-certified-mail) for more.`],
    ],
    sources: [
      ["USPS Domestic Mail Manual 503: Return Receipt (6.0), delivery records (1.8), Certified Mail (3.0)", "https://pe.usps.com/text/dmm300/503.htm"],
      ["USPS Domestic Mail Manual 508: recipient signatures and unclaimed mail", "https://pe.usps.com/text/dmm300/508.htm"],
      ["USPS: insurance and extra services (Return Receipt, Restricted Delivery)", "https://www.usps.com/ship/insurance-extra-services.htm"],
    ],
  },
  {
    slug: "small-claims-evidence-packet",
    kicker: "Small claims",
    title: "What is an evidence packet for small claims court?",
    metaTitle: "Small Claims Evidence Packet: What to Include and Bring",
    description: "An evidence packet is the organized set of documents you bring to a small claims hearing. See what to include, how to copy it and how to record your demand.",
    lede: "Your case on paper, in order, with a copy for the judge and the other side.",
    checked: "October 17, 2026",
    published: "2026-10-17",
    modified: "2026-10-17",
    card: { cat: "proof", date: "2026-10-17", art: "letter", label: "Small Claims", blurb: "What to put in your evidence packet, and how to keep a record of your demand letter." },
    answer: [
      "An evidence packet is **the organized set of documents you bring to a small claims hearing** to back up what you tell the judge: the agreement, receipts, photos, messages, estimates and any letters you sent. It isn't an official form; it's how you make sure you can hand over the right page when the judge asks.",
      "California's courts, for example, tell you to bring **the original for yourself, a copy for the judge and a copy for the other side.** Rules vary by state and by court, so check your court's small claims self-help page before your hearing.",
    ],
    sections: [
      {
        id: "include",
        h: "What to put in it",
        ps: ["Include anything that shows what was agreed, what went wrong and what it cost you. One California court's self-help center lists [evidence like this](https://www.santacruz.courts.ca.gov/system/files/general/preparing-small-claims-trial.pdf):"],
        after: [
          "**The agreement:** a contract, lease, invoice, quote or the messages where you agreed on the deal.",
          "**Proof of what you paid or lost:** receipts, bank or card statements, canceled checks.",
          "**Estimates:** written repair or replacement estimates if you're claiming those costs.",
          "**Photos:** of the damage or the problem, printed, with when you took them.",
          "**Messages:** printed emails and texts, showing the dates.",
          "**Your demand letter** and your mailing records (more on that below).",
          "**Witness statements:** a witness who can't come may be able to give a signed written statement. In California it must be signed under penalty of perjury; check your court's rules.",
        ],
      },
      {
        id: "organize",
        h: "How to put it together",
        ps: [
          "California's court self-help guide puts it plainly: [organize the papers](https://selfhelp.courts.ca.gov/small-claims/trial?rdeLocaleAttr=en) so you can find something quickly, because you won't have time to dig through a stack at your hearing.",
        ],
        after: [
          "**Start with a one-page timeline:** dates, what happened and the amount you're asking for.",
          "**Number every document** (Exhibit 1, 2, 3…) in the order your timeline mentions them.",
          "**Make two copies of everything, including photos,** one for the judge and one for the other side, and bring your originals. Check your court's instructions in case it asks for more.",
          "**Keep originals clean.** Write notes on your own copy, not on the evidence.",
          "**Remote hearing?** In California you need to get your evidence to the court and send it to the other side before the court date; ask your court's clerk how.",
        ],
      },
      {
        id: "demand",
        h: "Your demand letter",
        ps: [
          "In California, asking the other side to pay is [a step you must take before filing](https://selfhelp.courts.ca.gov/small-claims/ask-for-money), unless there's a restraining order between you or you think asking would be dangerous. You can ask in person, by letter or by email. Other states set their own rules, so check your court's self-help page.",
          "**A letter or email leaves a dated record you can bring to court.** California's guide says to tell them how much they owe and why; many people also give a date to pay by and say they plan to file in small claims court. Keep it factual and calm; the judge may read it.",
        ],
      },
      {
        id: "proof",
        h: "Keeping a record of the letter",
        ps: [
          "If you mail the demand, the packet should show what you sent and what USPS recorded about its delivery. [Certified Mail](/what-is-certified-mail) gives the letter a USPS tracking number that records [when it was delivered or delivery was attempted](https://pe.usps.com/text/dmm300/503.htm). A [return receipt](/certified-mail-vs-return-receipt) adds who signed for it. When you send with Sendpaper, our print partner hands the letter to USPS, so you don't get a USPS mailing receipt; the tracking number is your USPS record.",
          "Certified Mail doesn't prove what was inside the envelope, so keep an exact copy of the letter with the mailing record. Here's what each record shows and where it comes from when you send with Sendpaper:",
        ],
        table: {
          head: ["Record for your packet", "What it shows", `Where you get it with ${BRAND}`],
          rows: [
            ["Copy of the letter", "What you wrote, as you approved it", "The print preview on your order page; save or print it when you order"],
            ["USPS tracking number", "When it was delivered, or when delivery was attempted", `Your order page, once it's assigned (Certified, ${CERT})`],
            ["Return receipt", "Who signed, and where it was delivered", `Certified with return receipt, ${RR}; email support@sendmypaper.com if you need help getting it`],
          ],
        },
        after: [
          "Print the tracking history once it shows a final status (delivered, or attempted and unclaimed), and put the letter copy, tracking and any return receipt together as one exhibit.",
        ],
      },
      {
        id: "limits",
        h: "A demand letter isn't serving your case",
        ps: [
          "Mailing a demand letter is different from **serving the court papers** after you file. Service follows your court's rules. In California, [you can't serve the forms yourself](https://selfhelp.courts.ca.gov/small-claims/start-case/serve): someone 18 or older who isn't part of the case does it, and only the court can serve by certified mail, in courts that offer it. Don't use a letter you mail yourself, through us or anyone else, as service.",
          "We print and mail what you write; we don't give legal advice. If you're unsure what your court requires, ask its small claims advisor or self-help center.",
        ],
      },
    ],
    cta: {
      title: "Send your demand letter by certified mail",
      body: `Type it or upload a PDF. ${CERT} with tracking, or ${RR} with a return receipt. Printing, envelope and postage included.`,
      primary: ["Send a certified letter", "/send?product=letter_certified"],
      secondary: ["Ask your AI agent to send it", docsUrl("/quickstart")],
    },
    faqs: [
      ["Does a demand letter have to go by certified mail?", "Not always. California, for example, lets you ask in person, by letter or by email. Certified Mail is useful because its tracking gives your packet a USPS record of delivery or attempted delivery. Check your court's rules."],
      ["How many copies should I bring?", "California's self-help guide says the original for yourself, a copy for the judge and a copy for the other side. Some county courts, like Santa Cruz, say three copies of everything, including photos. Check your court's instructions."],
      [`Can I use ${BRAND} to serve my small claims papers?`, "No. Serving court papers follows your court's rules; in California you can't serve them yourself, and certified-mail service is done by the court clerk, in courts that offer it. Use your court's service options."],
      [`Does ${BRAND} put the evidence packet together for me?`, "No. We print and mail your letter, and your order page shows the print preview and, for certified letters, the USPS tracking number. You add those to the packet you put together."],
    ],
    sources: [
      ["California Courts self-help: ask for the money before you file", "https://selfhelp.courts.ca.gov/small-claims/ask-for-money"],
      ["California Courts self-help: get ready for your court date", "https://selfhelp.courts.ca.gov/small-claims/trial?rdeLocaleAttr=en"],
      ["California Courts self-help: serve your small claims forms", "https://selfhelp.courts.ca.gov/small-claims/start-case/serve"],
      ["Santa Cruz Superior Court Self Help Center: preparing for a small claims trial (PDF)", "https://www.santacruz.courts.ca.gov/system/files/general/preparing-small-claims-trial.pdf"],
      ["USPS Domestic Mail Manual 503: Certified Mail and Return Receipt", "https://pe.usps.com/text/dmm300/503.htm"],
    ],
    sourceNote: "Court rules differ by state and county, and USPS rules change; check your court and USPS before relying on a detail.",
  },  {
    slug: "send-a-letter-to-the-us-from-abroad",
    kicker: "Mail from abroad",
    title: "How to send a letter to the US from another country",
    metaTitle: "How to Send a Letter to the US From Another Country",
    description: "You don't need to be in the US to mail a US address. Compare posting it from home with having it printed and mailed inside the US, plus the caveats.",
    lede: "Post it from where you are, or have it printed and mailed inside the US. Here's how to choose.",
    checked: "October 31, 2026",
    published: "2026-10-31",
    modified: "2026-10-31",
    card: { cat: "documents", date: "2026-10-31", art: "letter", label: "From Abroad", blurb: "Two ways to get a letter to a US address when you live somewhere else, and when each one fits." },
    answer: [
      "You can send a letter to a US address from anywhere. **Either post it from your country with international postage, or have it printed and mailed inside the US** by an online service, so it travels as ordinary US mail.",
      `Posting it yourself means your local postal service's international times: Canada Post, for example, estimates [4 to 6 business days to the US](https://www.canadapost-postescanada.ca/cpc/en/support/articles/letter-post/delivery-standards.page). Printed in the US, it goes by USPS First-Class Mail, which USPS says takes [1 to 5 days](https://www.usps.com/ship/mail-shipping-services.htm) once it's mailed, after review and printing. With ${BRAND}, **the recipient has to be in the US, but your return address can be in any country.**`,
    ],
    sections: [
      {
        id: "choose",
        h: "Post it yourself or print it in the US?",
        ps: ["Both get a letter to a US address. They differ in what arrives and how long it takes:"],
        table: {
          head: ["", "Post it from your country", "Print and mail inside the US"],
          rows: [
            ["What arrives", "Your own paper, signed in ink if you signed it", "A printed copy of what you typed or uploaded"],
            ["Postage", "International postage from your postal service", "US postage, included in the price"],
            ["Delivery time", "Your postal service's international estimate", "USPS estimates 1 to 5 days for First-Class Mail once mailed, plus review and printing time"],
            ["Tracking", "Whatever your postal service offers abroad", "USPS Certified Mail tracking number, with an optional return receipt (no USPS mailing receipt)"],
            ["Return address", "Yours", "Yours, in any country"],
          ],
        },
        after: [
          "**Post it yourself** when the recipient needs your original document or an ink signature. A printing service can only send a printed copy, so check whether the recipient accepts one.",
          "**Print it in the US** when you'd rather it travel as US mail, when you want USPS tracking, or when you don't have a printer or stamps handy.",
        ],
      },
      {
        id: "how",
        h: `How to send it with ${BRAND}`,
        ps: [`You don't need a US address, a US phone number or an account, just an email address for your order. On the [letter form](/send/letter):`],
        after: [
          "**Type the letter (up to about 3 pages) or upload a PDF** of up to 6 pages.",
          "**Enter the recipient's US address.** Puerto Rico, US territories and APO/FPO/DPO military addresses count.",
          "**Enter your return address and pick your country.** Outside the US, the state and ZIP boxes become an optional region and postcode, so you type your address the way it's written at home.",
          `**Pay by card** in US dollars: ${LETTER} for a letter or ${CERT} for [Certified Mail](/what-is-certified-mail). Black-and-white printing, envelope and US postage are included.`,
          "**A person reviews it, then our print partner prints it and hands it to USPS** inside the US. After you pay, you land on your order page: bookmark it. It shows the status and, for certified letters, the USPS tracking number.",
        ],
      },
      {
        id: "paying",
        h: "Paying from outside the US",
        ps: [
          "Checkout charges in **US dollars**. Stripe runs our checkout, which takes major credit and debit cards. If your card is in another currency, Stripe notes that [your bank or card issuer might charge you a foreign exchange fee](https://docs.stripe.com/currencies), and some banks charge for any payment to a business in another country. Your bank, and Stripe's fraud checks, decide whether the payment goes through, and your bank decides what it costs you.",
        ],
      },
      {
        id: "returns",
        h: "If the letter can't be delivered",
        ps: [
          "USPS normally sends undeliverable First-Class Mail [back to the return address](https://pe.usps.com/text/dmm300/507.htm). **We can't promise that a returned letter will make it to an address outside the US.** If getting it back matters, for example for a legal or time-sensitive letter, use the US address of someone you trust as the return address, with their permission.",
          "Double-check the recipient's address before you pay, including the apartment or unit number and the ZIP code.",
        ],
      },
    ],
    cta: {
      title: "Send a letter to the US from anywhere",
      body: `${LETTER} for a letter, ${CERT} with Certified Mail tracking. Type it or upload a PDF; black-and-white printing, envelope and US postage included.`,
      primary: ["Send a letter", "/send/letter"],
      secondary: ["Send it by Certified Mail", "/send/certified"],
    },
    faqs: [
      ["Do I need a US address to send a letter to the US?", `No. The recipient must have a US address, but your return address can be in any country. On the ${BRAND} form, pick your country and the address fields change to match.`],
      ["How long does it take?", "Posted from abroad, it depends on your postal service; Canada Post, for example, estimates 4 to 6 business days to the US. Printed and mailed in the US, USPS says First-Class Mail takes 1 to 5 days once it's mailed, after the order is reviewed and printed."],
      [`Can I send mail from the US to another country with ${BRAND}?`, "No. We only deliver to US addresses, including Puerto Rico, US territories and APO/FPO/DPO military addresses."],
      ["Can I pay with a card from outside the US?", "Checkout takes major credit and debit cards, in US dollars. Your bank, and Stripe's fraud checks, decide whether the payment goes through, and your bank may add a foreign exchange or cross-border fee."],
      ["Will the recipient get my original document?", "No. We print and mail what you type or upload, so they get a printed copy. If they need the original or an ink signature, post it yourself from your country."],
    ],
    sources: [
      ["USPS: Mail & Shipping Services (First-Class Mail)", "https://www.usps.com/ship/mail-shipping-services.htm"],
      ["Canada Post: Letter-post delivery standards", "https://www.canadapost-postescanada.ca/cpc/en/support/articles/letter-post/delivery-standards.page"],
      ["USPS Domestic Mail Manual 507: undeliverable mail", "https://pe.usps.com/text/dmm300/507.htm"],
      ["Stripe: supported currencies and card brands", "https://docs.stripe.com/currencies"],
      ["USPS Domestic Mail Manual 503: Certified Mail and Return Receipt", "https://pe.usps.com/text/dmm300/503.htm"],
    ],
    sourceNote: "Postal times and fees change and vary by country; check your postal service and USPS before relying on a detail.",
  },
  {
    slug: "cancellation-letter-by-mail",
    kicker: "Cancellation letters",
    title: "How to cancel a membership or contract by mail",
    metaTitle: "Cancel a Gym Membership or Contract by Mail: Letter Template",
    description: "Some gyms and contracts only accept cancellation in writing. What to include in the letter, a copyable template, and which kind of mail to send it by.",
    lede: "When a business wants it in writing, send a letter that leaves a USPS tracking record.",
    checked: "November 3, 2026",
    published: "2026-11-03",
    modified: "2026-11-03",
    card: { cat: "proof", date: "2026-11-03", art: "letter", label: "Cancel by Mail", blurb: "Which services want cancellation in writing, what the letter should say, and how to mail it." },
    answer: [
      "When a contract says you must cancel **in writing**, a mailed letter is the safest way to do it. Gyms and health clubs are the most common case, along with cooling-off cancellations for door-to-door sales and timeshares, and any contract that names a mailing address for notices.",
      "Include your name, your account or member number, a plain statement that you're cancelling, the date it should take effect, a request for written confirmation, and your signature. **Send it by Certified Mail, adding a return receipt if you want the signature record,** and keep a copy of exactly what you sent.",
    ],
    sections: [
      {
        id: "who",
        h: "Which services want a letter",
        ps: ["Most online subscriptions can be cancelled in your account settings. A letter matters when the contract, or a state law, says notice must be in writing or names a mailing address. The usual cases:"],
        after: [
          "**Gyms and health clubs.** Many membership agreements ask for written notice, and several states set the method for the short cancellation window right after you sign. Massachusetts requires notice [delivered in person or postmarked by certified or registered mail](https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXV/Chapter93/Section81) within three business days. Maryland requires notice [in person or by certified mail, return receipt requested](https://codes.findlaw.com/md/commercial-law/md-code-coml-sect-14-12b-06/), postmarked by midnight of the third business day. California's health studio law, as amended in 2016, lets members send a signed, dated notice [by first-class mail, by email from an address on file, or in person](https://www.leginfo.ca.gov/pub/15-16/bill/asm/ab_2801-2850/ab_2810_bill_20160816_enrolled.html) within five business days. **These windows are only a few days long:** if yours is about to close, see the deadline note under [which kind of mail to send](/cancellation-letter-by-mail#mail).",
          "**Door-to-door and pop-up sales.** The FTC's [Cooling-Off Rule](https://consumer.ftc.gov/articles/buyers-remorse-ftcs-cooling-rule-may-help) gives you until midnight of the third business day to cancel many sales made at your home or at a seller's temporary location. You mail the cancellation form, or your own letter, postmarked in time, and the FTC suggests certified mail.",
          "**Timeshares.** The FTC says the cancellation period comes from [state law or your contract](https://consumer.ftc.gov/articles/timeshares-vacation-clubs-and-related-scams), and suggests a letter to the seller by certified mail with a return receipt.",
          "**Any contract with a notices clause.** Look in your agreement for a section called Notices, Cancellation or Termination. If it says notice must be in writing, sent to a mailing address or given by a date before renewal, that's the method to follow.",
        ],
      },
      {
        id: "online",
        h: "Doesn't a law let me cancel online?",
        ps: [
          "Not exactly. A federal law, [ROSCA](https://www.law.cornell.edu/uscode/text/15/8403), requires businesses that sell subscriptions online to provide \"simple mechanisms\" to stop recurring charges. But the FTC's 2024 \"click-to-cancel\" rule, which spelled out what that means, was vacated, and in March 2026 the FTC [asked for public comment](https://www.ftc.gov/news-events/news/press-releases/2026/03/ftc-seeks-public-comment-response-advance-notice-proposed-rulemaking-regarding-negative-option) on whether to write a new one. Some states have their own automatic-renewal laws, and some businesses offer online cancellation anyway.",
          "So use the easiest method your contract allows. When it names mail, or you want a record the business can't easily dispute, send a letter.",
        ],
      },
      {
        id: "before",
        h: "Before you write",
        ps: ["Gather four things first:"],
        after: [
          "**The cancellation clause.** Note the required method, the notice period (for example, 30 days before the next billing date) and whether the notice has to be signed.",
          "**Your account details:** member or account number, the name on the account and the address the business has on file.",
          "**The effective date** you're asking for, allowing for any notice period.",
          "**The right address.** Use the one your contract names for notices, which may be a head office rather than your local club. If it doesn't name one, ask the business or check its website.",
        ],
      },
      {
        id: "template",
        h: "Cancellation letter template",
        ps: ["Replace everything in brackets and delete what doesn't apply. Keep it short, and only give a reason if your contract asks for one."],
        template: `[Your full name]
[Your street address]
[City, State ZIP]
[Email or phone]

[Date]

[Business name]
Attn: [Membership services / Cancellations]
[Address from your contract's notice clause]

Re: Cancellation of [membership / agreement], account [number]

To whom it may concern:

I am cancelling my [membership / agreement / subscription] with [business name], account [number], under the name [name on the account].

Please end it effective [date] and stop all recurring charges to my [card / bank account] ending in [last four digits] after that date.

[Optional: I am cancelling within the [number]-day cancellation period in my contract dated [date], and ask for the refund the contract provides.]

Please confirm the cancellation in writing to [email or mailing address], including the date it takes effect and any final balance.

Sincerely,

[Signature]
[Printed name]`,
        after: [
          "**A specific effective date** avoids back-and-forth about which billing cycle counts.",
          "**Only the last four digits** of a card or bank account. Never put a full card number in a letter.",
          "**If the notice must be signed:** print the letter, sign it, scan it and [upload it as a PDF](/send/certified). If the business insists on an original ink signature, mail it yourself, since a printing service sends a printed copy.",
        ],
      },
      {
        id: "mail",
        h: "Which kind of mail to send",
        ps: ["A letter by regular mail still counts as written notice, but it leaves you with no record. Pick by how much you may need to prove later:"],
        table: {
          head: ["", "First-Class Mail", "Certified Mail", "Certified + return receipt"],
          rows: [
            ["What you get", "Mailing by USPS, with no tracking", "A USPS tracking number and a record of delivery or attempted delivery", "All of that, plus a record of the recipient's signature"],
            ["Use it when", "The contract only says \"in writing\" and you're also cancelling another way", "A law or contract says certified mail, or you may need to show you sent it", "You want a signature record, or a law or contract asks for a return receipt (check what form it accepts)"],
            [`${BRAND} price`, LETTER, CERT, RR],
          ],
        },
        after: [
          "**Certified Mail gives you a USPS record of the letter's mailing and its delivery or attempted delivery, but not of what was inside** ([USPS rules](https://pe.usps.com/text/dmm300/503.htm)). Keep a copy of the exact letter. With us, your order page keeps the print preview. More on that in [what certified mail is](/what-is-certified-mail) and [certified mail vs. return receipt](/certified-mail-vs-return-receipt).",
          "**Watch the deadline.** Cooling-off cancellations are usually judged by the postmark. A letter ordered online is reviewed and printed before it's mailed, and you don't get a USPS mailing receipt, so the day you pay isn't the postmark date. If the deadline is a day or two away, take the letter to a post office yourself.",
          "**Registered mail** also satisfies some state laws. It's a separate USPS service that we don't offer.",
        ],
      },
      {
        id: "after",
        h: "After you send it",
        ps: ["Cancelling isn't finished until the charges stop:"],
        after: [
          "**Track it.** A certified letter's USPS tracking number appears on your order page once it's assigned.",
          "**Check your next statement.** If the business keeps charging you after you cancelled, the FTC says to [dispute the charges with your card company](https://consumer.ftc.gov/consumer-alerts/2025/08/la-fitness-made-it-difficult-people-cancel-gym-memberships-ftc-says), and that just changing your card number often isn't enough.",
          "**Keep everything together:** your copy of the letter, the tracking record, any return receipt, the business's confirmation and your statements.",
          "**Report it** if they won't stop: the FTC takes reports at ReportFraud.ftc.gov.",
        ],
      },
    ],
    cta: {
      title: "Send your cancellation letter by Certified Mail",
      body: `${CERT} with USPS tracking, ${RR} with a return receipt. Type it or upload a signed PDF; printing, envelope and postage included.`,
      primary: ["Send a certified letter", "/send/certified"],
      secondary: ["Send a regular letter", "/send/letter"],
    },
    faqs: [
      ["Can I cancel a gym membership by email instead?", "Sometimes. California's health studio law, for example, allows email from an address on file as well as mail or delivery in person. Other states, and many contracts, name only mail or in-person delivery. Use a method your contract and your state allow, and keep proof."],
      ["Do I need to give a reason?", "Usually not. The FTC says you don't need a reason to cancel under its Cooling-Off Rule. If your contract asks for one, give it briefly."],
      ["Does certified mail prove I cancelled?", "Its tracking record shows a letter was mailed to that address and when it was delivered or delivery was attempted. It doesn't prove what was inside, so keep a copy. Whether the letter ends the contract depends on your contract and your state's law."],
      ["What if the business says it never got my letter?", "Send them the tracking record and, if you bought one, the return receipt, with a copy of your letter. If charges continue, dispute them with your card company."],
      ["Can my AI assistant write and send it?", `Yes, if it's connected to ${BRAND}, as Claude and Codex can be. Ask it to write the cancellation letter and send it by Certified Mail; you check the preview and pay before anything is printed. There's a [ready-made prompt](/use-cases#cancel-notice) to start from.`],
    ],
    sources: [
      ["FTC: Buyer's remorse: the FTC's Cooling-Off Rule may help", "https://consumer.ftc.gov/articles/buyers-remorse-ftcs-cooling-rule-may-help"],
      ["FTC: Timeshares, vacation clubs and related scams", "https://consumer.ftc.gov/articles/timeshares-vacation-clubs-and-related-scams"],
      ["FTC consumer alert: LA Fitness made it difficult for people to cancel gym memberships (August 2025)", "https://consumer.ftc.gov/consumer-alerts/2025/08/la-fitness-made-it-difficult-people-cancel-gym-memberships-ftc-says"],
      ["15 U.S.C. §8403 (ROSCA): requirements for online negative option sales", "https://www.law.cornell.edu/uscode/text/15/8403"],
      ["FTC: Advance notice of proposed rulemaking on negative option marketing (March 2026)", "https://www.ftc.gov/news-events/news/press-releases/2026/03/ftc-seeks-public-comment-response-advance-notice-proposed-rulemaking-regarding-negative-option"],
      ["Massachusetts General Laws ch. 93, §81: health club contracts", "https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXV/Chapter93/Section81"],
      ["Maryland Commercial Law §14-12B-06 (via FindLaw)", "https://codes.findlaw.com/md/commercial-law/md-code-coml-sect-14-12b-06/"],
      ["California AB 2810 (2016), amending Civil Code §1812.85", "https://www.leginfo.ca.gov/pub/15-16/bill/asm/ab_2801-2850/ab_2810_bill_20160816_enrolled.html"],
      ["USPS Domestic Mail Manual 503: Certified Mail and Return Receipt", "https://pe.usps.com/text/dmm300/503.htm"],
    ],
    sourceNote: "State laws and contracts differ, and laws change; check your contract and your state's current law before relying on a detail. This is general information, not legal advice.",
  },
  {
    slug: "gym-cancellation-laws-by-state",
    kicker: "Research",
    title: "How you're allowed to cancel a gym membership, state by state",
    metaTitle: "Gym Cancellation Laws by State: How You Can Cancel (2026)",
    description: "We read the gym contract law in all 50 states and DC, plus the cancellation terms of 15 big chains. Here's how each lets you cancel, and where it takes certified mail.",
    lede: "We read the law in all 50 states and DC, and the terms of 15 big chains, so you don't have to.",
    checked: "November 3, 2026",
    published: "2026-11-03",
    modified: "2026-11-03",
    card: { cat: "proof", date: "2026-11-03", art: "letter", label: "Gym Laws", blurb: "Original research: how each state and 15 big chains let you cancel a gym membership." },
    answer: [
      "**38 states and DC have a law covering gym contracts,** and almost all of them give you a short cooling-off window after you sign, usually 3 business days, to cancel for a refund. **In 13 of those states and DC, the law only guarantees certified or registered mail, or delivering it in person.** In Texas, South Carolina, Tennessee and DC, it has to go by mail.",
      "Outside that window, your contract decides. **None of the 9 big chains with published terms requires certified mail,** and all 9 offer some online route; we couldn't fully verify the other 6.",
    ],
    sections: [
      {
        id: "findings",
        h: "What we found",
        ps: ["We read each state's statute, mostly on the legislature's own site, and each chain's own help pages and terms, all checked on November 3, 2026. The counts below use only rows we verified:"],
        after: [
          "**Certified or registered mail, or in person (13 states and DC):** Delaware, DC, Indiana, Iowa, Louisiana, Maryland, Massachusetts, Missouri, Oklahoma, Pennsylvania, South Carolina, Tennessee, Texas and Virginia. In these, the law guarantees no other way to cancel in the cooling-off window. **Louisiana and Tennessee name registered mail, not certified;** Texas, South Carolina, Tennessee and DC allow mail only, with no in-person option. West Virginia's rule counts mailed notice, and the contract wording it requires says certified mail.",
          "**Only certified or registered mail (3 states and DC):** Texas and South Carolina (certified mail), Tennessee (registered mail) and DC (certified or registered mail).",
          "**A return receipt is required in 7 states:** Maryland, Missouri, Ohio, Oklahoma, Pennsylvania and Virginia for the mailed option, and New Jersey when you use certified or registered mail.",
          "**Email or online cancellation is allowed in 9 states:** Arizona, California, Illinois, Minnesota, New Jersey (online only if you joined online), New York, Ohio, Rhode Island and Utah. Connecticut's required notice lists an email address, but the law itself asks for delivery with tracking, so we didn't count it.",
          "**The rules are loosening:** 8 states changed how you can cancel between 2021 and 2026 (Arizona, Connecticut, Illinois, Maine, Minnesota, New Jersey, New York and Utah), mostly adding email or online options. Connecticut replaced its certified-mail requirement with delivery tracking in 2024.",
          "**Windows are short:** 3 business days in most states (3 days in Arizona and Wisconsin, 3 operating days in New Jersey); 5 in California, Hawaii and Mississippi; 7 in Georgia; 10 in Rhode Island; 15 days in DC. Maine has no cooling-off window but, since 2026, requires auto-renewing memberships to let you cancel the same way you signed up.",
          "**11 states have no gym-specific law,** based on searches of each state's official code: Alaska, Idaho, Kansas, Michigan, Montana, Nebraska, New Mexico, North Dakota, South Dakota, Vermont and Wyoming. There, your contract (and general consumer or auto-renewal laws) applies. Alaska, Nebraska and Wyoming do let servicemembers on long military orders end a gym membership.",
        ],
      },
      {
        id: "states",
        h: "State by state",
        ps: [
          "This table covers the **cooling-off window right after you sign.** After it closes, your contract's terms apply, along with any other rights your state gives (many of these laws also let you cancel if you move far away, often 25 miles, become disabled or die, or if the club closes; the details differ). \"Not stated\" means the law doesn't mention a return receipt.",
        ],
        table: { head: ["State", "Law", "Cooling-off window", "How you can cancel in the window", "Return receipt"], rows: GYM_STATE_ROWS },
      },
      {
        id: "chains",
        h: "The 15 biggest chains",
        ps: ["We picked the largest US chains by number of locations and read what their own help pages and terms say. Most are franchises, so **your location's agreement can differ;** check yours."],
        table: {
          head: ["Chain", "How to cancel", "Notice", "Fee"],
          rows: [
            ["Planet Fitness", "Online (member portal), in person or by mail to your home club", "At least 7 days before the next billing date", "$58 buyout fee if you end a minimum-term membership early"],
            ["LA Fitness (incl. Esporta, Club Studio)", "Mail to its Irvine, CA P.O. box (certified or registered recommended, not required), in person, online; email in some states", "Mailed notice postmarked 5+ business days before the next billing date", "Termination fee within an initial term of 3+ months"],
            ["Orangetheory Fitness", "Online cancellation form", "30 days, unless your agreement says otherwise", "None stated; term memberships pay out the initial term"],
            ["24 Hour Fitness", "Online for monthly memberships; in club or contact form for term or prepaid", "30 days (except New York)", "\"Cancellation fee may apply\""],
            ["EoS Fitness", "Online member portal; phone if no online option shows", "30 days", "No cancellation fee"],
            ["Snap Fitness", "Your gym by phone, email or in person; online in some states", "Usually 30 days", "Not stated"],
            ["Crunch Fitness", "Online at some clubs, phone or in person", "Not stated", "Not stated"],
            ["Gold's Gym", "Online request form, then your gym finishes it", "Set by each gym", "Set by each gym"],
            ["9Round", "Online cancellation form", "30 days, unless your agreement says otherwise", "None stated"],
            ["Anytime Fitness", "Set by each location's agreement", "Not published centrally", "Not published centrally"],
            ["Club Pilates", "Online account page, studio or email (per its terms; not verified)", "Not published centrally", "No refunds; no fee stated"],
            ["Pure Barre", "Per state agreement or studio (not verified)", "Not published centrally", "No refunds; no fee stated"],
            ["F45 Training", "Contact your studio (not verified)", "Not published", "Not published"],
            ["Workout Anytime", "In the app (not verified)", "Not published", "Not published"],
            ["Life Time", "Online, app, email or in club (not verified)", "\"A notice period is required\"", "Not published"],
          ],
        },
        after: [
          "**None of the 9 chains with published terms requires certified mail.** All 9 offer an online route, 7 of them everywhere and Crunch and Snap Fitness at some locations. LA Fitness still accepts mailed notice and recommends certified or registered mail for it. In August 2025 the FTC sued LA Fitness, alleging it made cancelling exceedingly difficult; as of November 3, 2026 there had been no ruling or settlement.",
        ],
      },
      {
        id: "cancel",
        h: "What this means if you're cancelling",
        ps: [
          "**In the cooling-off window,** use the exact method your state's row names. In Louisiana and Tennessee that's registered mail, which we don't offer, so use the post office. Check whether your state counts the postmark or the day it arrives (New Jersey counts arrival). If the deadline is a day or two away, go in person where that's allowed, or mail it at a post office: a letter ordered online is reviewed and printed first, so the day you pay isn't the day it's mailed.",
          "**After the window,** follow your contract's cancellation clause. If it says in writing or by mail, send a short letter and keep proof. Our guide to [cancelling a membership or contract by mail](/cancellation-letter-by-mail) has a template and explains which kind of mail to use.",
        ],
      },
      {
        id: "method",
        h: "How we built this",
        ps: [
          "For each state we searched the legislature's own code for health club, health spa, health studio and physical fitness laws, and read the cancellation sections. Where the official site blocked us, we read the statute on FindLaw, Justia or Cornell's LII and say so in the sources. For chains we used only each company's own help pages, terms and forms.",
          "Every state row rests on the statute text or an official code search we ran ourselves. Six chains we couldn't fully verify are marked \"not verified\". Found a mistake or a newer rule? Email support@sendmypaper.com and we'll correct it.",
        ],
      },
    ],
    cta: {
      title: "Cancel by Certified Mail without a post office trip",
      body: `${CERT} with USPS tracking, ${RR} with a return receipt. Reviewed and printed before it's mailed, so not for a deadline that's a day or two away.`,
      primary: ["Send a certified letter", "/send/certified"],
      secondary: ["Get the letter template", "/cancellation-letter-by-mail"],
    },
    faqs: [
      ["Can I cancel a gym membership within 3 days in any state?", "No. 38 states and DC have a gym contract law, and most of those give a cooling-off window of about 3 days or more. 11 states have no gym-specific law, and Maine uses a different rule. Check your state's row above and your contract."],
      ["Which states require certified mail to cancel a gym membership?", "In the cooling-off window, the law in Delaware, DC, Indiana, Iowa, Maryland, Massachusetts, Missouri, Oklahoma, Pennsylvania, South Carolina, Texas and Virginia guarantees certified (or in some, registered) mail or in-person delivery. Louisiana and Tennessee name registered mail instead. In Texas, South Carolina, Tennessee and DC, it has to go by mail."],
      ["Do these rules apply after the first few days?", "Mostly no. The method rules in this table are for the cooling-off window. After it, your contract's terms apply, plus any rights your state gives for moving, disability, death or a club closing."],
      ["Can I cancel a gym membership by email?", "In the cooling-off window, 9 states clearly allow email or online cancellation (New Jersey only online, and only if you joined online). After it, it depends on your contract; all 9 chains with published terms offer an online route."],
      ["Is this legal advice?", "No. It's a summary of what the laws and chains' terms say as of November 3, 2026. Laws change, and your contract and situation matter, so check the source for your state."],
    ],
    sources: [
      ...GYM_SOURCES,
      ["FTC: LA Fitness made it difficult for people to cancel gym memberships (August 2025)", "https://consumer.ftc.gov/consumer-alerts/2025/08/la-fitness-made-it-difficult-people-cancel-gym-memberships-ftc-says"],
    ],
    sourceNote: "Laws and gym terms change; check your state's current law and your own contract before relying on a detail. This is general information, not legal advice.",
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
.prose pre.tpl { white-space: pre-wrap; overflow-wrap: anywhere; font: .88rem/1.6 var(--f-mono); background: var(--card); border: 1px solid var(--rule); border-radius: 12px; padding: 18px 20px; margin: 8px 0 18px; }
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
          ${a.sections.map((s) => `<h2 id="${s.id}">${esc(s.h)}</h2>${ps(s.ps)}${s.template ? `<pre class="tpl">${esc(s.template)}</pre>` : ""}${s.table ? table(s.table) : ""}${s.after ? (s.table ? ps(s.after) : `<ul class="pts">${s.after.map((x) => `<li>${rich(x)}</li>`).join("")}</ul>`) : ""}`).join("")}
          <div class="cta-box"><div><b>${esc(a.cta.title)}</b><span>${esc(a.cta.body)}</span></div>
            <div class="ctas"><a class="btn green" href="${esc(a.cta.primary[1])}">${esc(a.cta.primary[0])}</a>${a.cta.secondary ? `<a class="btn alt" href="${esc(a.cta.secondary[1])}">${esc(a.cta.secondary[0])}</a>` : ""}</div></div>
          <h2 id="questions">Common questions</h2>
          ${a.faqs.map(([q, ans]) => `<h3>${esc(q)}</h3><p>${rich(ans)}</p>`).join("")}
          <details class="srcbox" id="sources"><summary><h2>Sources</h2><span class="note">${a.sources.length} links</span></summary>
          <ul class="srcs">${a.sources.map(([t, u]) => `<li><a href="${esc(u)}" rel="noopener">${esc(t)}</a></li>`).join("")}</ul>
          <p class="note">Accessed ${esc(a.checked)}. ${esc(a.sourceNote ?? "USPS rules and fees change; check USPS before relying on a detail.")}</p></details>
        </div>
      </article>
      <nav class="toc" aria-label="On this page"><span>On this page</span>${toc.map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join("")}</nav>
    </div>`,
    { description: a.description },
  );
}

export const articleList = (): IndexCard[] =>
  ARTICLES.map((a) => ({ href: `/${a.slug}`, title: a.title, blurb: a.card.blurb, tag: a.kicker, cat: a.card.cat, date: a.card.date, art: a.card.art, label: a.card.label }));
