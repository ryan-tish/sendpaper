import { BRAND, type ProductId } from "./config.ts";
import { docsUrl, page } from "./layout.ts";
import { esc } from "./render.ts";

// Real reasons people still need paper mail, each with a prompt an agent can run as-is (Ryan, 2026-10-05: lead
// with professional, proof-of-delivery mail; personal cards follow). Keep caveats honest, never imply scheduling or
// legal/tax advice: we print and mail what the customer or their agent writes.
// Topics the use-case page is divided into, in page order (Ryan, 2026-10-05: six sections with filter chips).
export const TOPICS = [
  ["taxes-government", "Taxes & government"],
  ["housing", "Housing"],
  ["money-credit", "Money & credit"],
  ["contracts-documents", "Contracts & documents"],
  ["celebrations", "Celebrations"],
  ["life-community", "Life & community"],
] as const;
export type Topic = (typeof TOPICS)[number][0];

export type UseCase = { id: string; topic: Topic; group: "proof" | "personal"; title: string; why: string; prompt: string; product: ProductId; note?: string; href?: string };

export const GUARDRAIL = `${BRAND} prints and mails what you or your agent writes. We're not a law firm or tax preparer and don't give legal or tax advice; for deadlines and the right address, check the notice itself, the agency, or a professional.`;

export const USE_CASES: UseCase[] = [
  {
    id: "taxes",
    topic: "taxes-government",
    group: "proof",
    title: "Reply to an IRS or state tax notice",
    why: "Notices give a deadline and an address. A certified reply proves when you answered, and you can mail the documents they ask for as a PDF.",
    prompt: "I got IRS notice CP2000 about income I already reported. Draft a short response citing the notice number and explaining it's on my Schedule C, and mail it certified with a return receipt to the address on the notice.",
    product: "letter_certified_rr",
    note: "Use the address on your notice. Including documents? Combine them with your letter into one PDF.",
  },
  {
    id: "landlord",
    topic: "housing",
    group: "proof",
    title: "Notice to your landlord",
    why: "Leases usually require written notice for move-outs, renewals and repairs, and a dated delivery record settles arguments later.",
    prompt: "Send my landlord this 30-day notice that I'm not renewing the lease, by certified mail with a return receipt. Return address is my apartment.",
    product: "letter_certified_rr",
    note: "The return receipt adds the landlord's signature.",
  },
  {
    id: "security-deposit",
    topic: "housing",
    group: "proof",
    title: "Ask for your security deposit back",
    why: "If your deposit hasn't come back, a clear written demand with proof it arrived is usually the next step.",
    prompt: "Write a polite but firm letter to my former landlord asking for my $1,800 security deposit back, listing my move-out date and forwarding address, and send it certified with a return receipt.",
    product: "letter_certified_rr",
    note: "Rules and deadlines for deposits vary by state; check yours before you send.",
  },
  {
    id: "credit-dispute",
    topic: "money-credit",
    group: "proof",
    title: "Dispute an error on your credit report",
    why: "You can dispute errors with the credit bureaus by mail, and a certified letter with copies of your evidence leaves a clear record.",
    prompt: "Draft a dispute letter to the credit bureau about the late payment on my report that was actually paid on time, and mail it certified to the dispute address on the bureau's website.",
    product: "letter_certified",
    note: "Use the bureau's dispute address. Including evidence? Combine it with your letter into one PDF.",
  },
  {
    id: "debt-validation",
    topic: "money-credit",
    group: "proof",
    title: "Ask a collector to validate a debt",
    why: "If a collector contacts you about a debt you don't recognize, asking in writing for proof of the debt, with a delivery record, keeps things documented.",
    prompt: "Write a debt validation request to this collection agency about account 44129, asking them to verify the debt and the amount, and send it certified with a return receipt.",
    product: "letter_certified_rr",
  },
  {
    id: "unpaid-invoice",
    topic: "money-credit",
    group: "proof",
    title: "Chase an unpaid invoice",
    why: "When emails go unanswered, a formal demand letter with proof of delivery often gets an invoice paid, and it's the record you'll need if it escalates.",
    prompt: "Draft a formal payment demand to Acme Studio for invoice #1042 ($3,200, 60 days overdue), giving them 14 days to pay, and mail it certified.",
    product: "letter_certified",
  },
  {
    id: "cancel-notice",
    topic: "contracts-documents",
    group: "proof",
    title: "Cancel a contract or membership",
    why: "Some contracts and memberships only accept cancellation in writing. A certified letter proves you sent it and when.",
    prompt: "Write a letter cancelling my gym membership (member ID 88213) effective at the end of this month, and send it certified with a return receipt to their head office.",
    product: "letter_certified_rr",
  },
  {
    id: "documents",
    topic: "contracts-documents",
    group: "proof",
    title: "Mail a signed form or document",
    why: "Signed forms, applications and statements still go by mail. Upload the PDF and it's printed and mailed, with Certified Mail if you need proof.",
    prompt: "Mail this signed PDF to the county clerk at 100 Main St, Springfield IL 62701, by certified mail.",
    product: "letter_certified",
    note: "Up to 6 pages; any page size is fitted to 8.5×11, and an address page is added in front.",
    href: "/send?type=letter&source=pdf",
  },
  {
    id: "birthdays",
    topic: "celebrations",
    group: "personal",
    title: "Birthdays and holidays",
    why: "A card on the fridge beats a text, and your agent can write it in a minute.",
    prompt: "Send Mom a 6×9 birthday postcard with a collage of these photos of the kids and a short note from me.",
    product: "postcard_6x9",
  },
  {
    id: "thank-you",
    topic: "celebrations",
    group: "personal",
    title: "Thank-you notes",
    why: "After an interview, a favor, or a job well done, a handwritten-style note gets remembered.",
    prompt: "Send a thank-you postcard to the contractor who fixed our roof. Their office is 500 Main St, Boston MA 02110.",
    product: "postcard_4x6",
  },
  {
    id: "business",
    topic: "life-community",
    group: "personal",
    title: "Small business",
    why: "A postcard to a first-time customer or a lapsed regular stands out in a way email can't.",
    prompt: "Send a thank-you postcard with our logo to each of this week's new customers from the Shopify export.",
    product: "postcard_4x6",
    note: "One order per recipient, and only to people who bought from you. No bulk marketing.",
  },
  {
    id: "condolences",
    topic: "life-community",
    group: "personal",
    title: "Condolences and get-well wishes",
    why: "Some moments deserve paper. Your agent can help with the words, but the card is real.",
    prompt: "Help me write a short, warm condolence note to Aunt Ruth and mail it as a letter. Keep it simple.",
    product: "letter",
  },
  {
    id: "representatives",
    topic: "taxes-government",
    group: "personal",
    title: "Writing to your representatives",
    why: "Offices count physical letters. A short, personal one is read.",
    prompt: "Draft a one-page letter to my state senator supporting the library funding bill, in my words, and mail it to their district office.",
    product: "letter",
  },
  {
    id: "moving",
    topic: "housing",
    group: "personal",
    title: "Moving and address changes",
    why: "Tell the people who still send you paper where to find you.",
    prompt: "Send a 'We moved!' postcard with our new address to everyone on this list.",
    product: "postcard_4x6",
    note: "One order per recipient.",
  },
  {
    id: "records-request",
    topic: "taxes-government",
    group: "proof",
    title: "Request records from an agency",
    why: "Records requests often go by mail, and the response clock starts when they receive it. A certified letter shows the date.",
    prompt: "Draft a public records request to the city clerk at 200 Center St, Springfield IL 62701, asking for the 2025 building permits on my street, and mail it certified.",
    product: "letter_certified",
  },
  {
    id: "complaint",
    topic: "contracts-documents",
    group: "proof",
    title: "Send a formal complaint to a company",
    why: "When chat and email go nowhere, a dated letter to the company's address puts the complaint on record.",
    prompt: "Write a firm, polite complaint to Acme Appliances, 50 Market St, Columbus OH 43215, about the dishwasher that failed twice under warranty, asking for a replacement, and mail it certified.",
    product: "letter_certified",
  },
  {
    id: "announcements",
    topic: "celebrations",
    group: "personal",
    title: "Weddings, babies and big news",
    why: "Announcements are the mail people stick on the fridge. Add a photo and send one to each person on your list.",
    prompt: "Make a 6×9 postcard with this photo of the baby, the caption \"Hello, world: Maya, born June 2\", and mail one to my grandmother at 8 Elm St, Dayton OH 45402.",
    product: "postcard_6x9",
    note: "One order per recipient.",
  },
  {
    id: "keep-in-touch",
    topic: "life-community",
    group: "personal",
    title: "Staying in touch with family",
    why: "Grandparents and relatives who aren't online still check the mailbox. A regular letter keeps them in the loop.",
    prompt: "Turn these notes about our month into a one-page letter to Grandpa Joe at 31 Lake Rd, Duluth MN 55802, in a warm, newsy tone, and mail it.",
    product: "letter",
  },
];
const CSS = `
.uc-head { display: grid; gap: 12px; padding-block: 56px 16px; max-width: 720px; }
.uc-chips { display: flex; flex-wrap: wrap; gap: 8px; padding-block: 8px 4px; }
.chip { font: 500 .88rem var(--f-ui); color: var(--soft); text-decoration: none; border: 1px solid var(--rule); background: var(--card); border-radius: 999px; padding: 7px 14px; transition: border-color .15s, color .15s; }
.chip:hover { border-color: var(--green); color: var(--ink); }
.chip.on { background: var(--ink); border-color: var(--ink); color: var(--paper); }
.uc-head h1 { font-size: clamp(1.9rem, 3.6vw, 2.6rem); }
.uc-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; padding-block: 24px 8px; }
@media (max-width: 980px) { .uc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .uc-grid { grid-template-columns: minmax(0, 1fr); } }
.uc { scroll-margin-top: 90px; display: grid; }
.face { display: flex; flex-direction: column; gap: 12px; background: var(--card); border: 1px solid var(--rule); border-radius: 14px; padding: 22px; min-width: 0; }
.face h3 { font-size: 1.2rem; letter-spacing: -0.015em; }
.face p { color: var(--soft); font-size: .95rem; }
.front { position: relative; }
.front .mark { position: absolute; top: 18px; right: 18px; color: var(--green); opacity: .35; }
.front .foot, .back .foot { margin-top: auto; padding-top: 6px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.tag { font: 500 .74rem var(--f-mono); color: var(--green); background: var(--green-soft); border-radius: 999px; padding: 3px 10px; }
.uc-show, .uc-back, .uc-copy { background: none; border: 0; padding: 0; font: 500 .9rem var(--f-ui); color: var(--green); cursor: pointer; }
.uc-show:hover, .uc-back:hover, .uc-copy:hover { color: var(--ink); }
.back .eyebrow { margin-bottom: -2px; }
.back .prompt { font: .84rem/1.55 var(--f-mono); color: var(--ink); background: var(--tint); border: 1px solid var(--rule); border-radius: 10px; padding: 12px 14px; }
.back .prompt::before { content: "› "; color: var(--green); }
.back .note { font-size: .84rem; color: var(--faint); }
.back .foot a { color: var(--green); text-decoration: none; font-weight: 500; font-size: .9rem; }
.back .top { display: flex; justify-content: space-between; align-items: baseline; }
/* Flip cards (enabled by JS; without it both faces simply stack). */
.flip .uc { perspective: 1400px; }
.flip .uc-in { display: grid; transform-style: preserve-3d; transition: transform .6s cubic-bezier(.2, .7, .2, 1); }
.flip .face { grid-area: 1 / 1; backface-visibility: hidden; -webkit-backface-visibility: hidden; min-height: 250px; }
.flip .back { transform: rotateY(180deg); }
.flip .uc.flipped .uc-in { transform: rotateY(180deg); }
.flip .front { cursor: pointer; transition: border-color .2s; }
.flip .front:hover { border-color: var(--green); }
.flip .uc-show::after { content: ""; position: absolute; inset: 0; border-radius: 14px; }
.uc:not(.flipped) .back, .uc.flipped .front { pointer-events: none; }
:not(.flip) > .uc .back { margin-top: 10px; }
@media (prefers-reduced-motion: reduce) { .flip .uc-in { transition: none; } }
`;

// The logo's envelope, faint in each card's corner.
const MARK = `<svg class="mark" width="36" height="26" viewBox="0 0 36 26" aria-hidden="true"><path d="M1 9h5M3 13h4M1 17h5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="8" y="3" width="27" height="20" rx="4" fill="currentColor"/><path d="M11 6.5 21.5 14 32 6.5" fill="none" stroke="var(--card)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const LABEL: Record<ProductId, string> = { postcard_4x6: "Postcard 4×6", postcard_6x9: "Postcard 6×9", postcard_6x11: "Postcard 6×11", letter: "Letter", letter_certified: "Certified letter", letter_certified_rr: "Certified + return receipt" };

const card = (u: UseCase) => `<article class="uc" id="${u.id}"><div class="uc-in">
        <div class="face front">${MARK}<span class="tag" style="align-self:flex-start">${LABEL[u.product]}</span><h3>${esc(u.title)}</h3><p>${esc(u.why)}</p>
          <div class="foot"><button type="button" class="uc-show" aria-expanded="false">See the prompt ↻</button></div></div>
        <div class="face back"><div class="top"><span class="eyebrow">Ask your agent</span><button type="button" class="uc-back" aria-label="Back to ${esc(u.title)}">↺ Back</button></div>
          <div class="prompt">${esc(u.prompt)}</div>${u.note ? `<p class="note">${esc(u.note)}</p>` : ""}
          <div class="foot"><button type="button" class="uc-copy" data-text="${esc(u.prompt)}">Copy prompt</button><a href="${esc(u.href ?? `/send?product=${u.product}`)}">Send from the web →</a></div></div>
      </div></article>`;

export function useCasesPage() {
  return page(
    `Use cases — ${BRAND}`,
    `<style>${CSS}.uc-sec { display: grid; gap: 10px; padding-block: 28px 0; scroll-margin-top: 80px; } .uc-sec h2 { font-size: 1.35rem; } .uc-sec[hidden] { display: none; } .guard { font-size: .88rem; color: var(--faint); max-width: 760px; margin: 32px 0 0; }</style>
    <div class="uc-head"><span class="eyebrow">Use cases</span><h1>What people send</h1>
      <p class="soft">Copy a prompt into your agent, or send from the web.</p></div>
    <nav class="uc-chips" aria-label="Filter use cases"><a href="#all" class="chip on" data-topic="">All</a>${TOPICS.map(([id, name]) => `<a href="#${id}" class="chip" data-topic="${id}">${esc(name)}</a>`).join("")}</nav>
    ${TOPICS.map(([id, name]) => `<section class="uc-sec" id="${id}" aria-labelledby="${id}-h"><h2 id="${id}-h">${esc(name)}</h2>
      <div class="uc-grid">${USE_CASES.filter((u) => u.topic === id).map(card).join("")}</div></section>`).join("\n    ")}
    <p class="guard">${esc(GUARDRAIL)}</p>
    <script>
    (function () {
      document.querySelectorAll(".uc-grid").forEach((g) => g.classList.add("flip"));
      // Topic chips filter the sections (without JS they're plain jump links).
      const chips = [...document.querySelectorAll(".uc-chips .chip")], secs = [...document.querySelectorAll(".uc-sec")];
      function show(topic) {
        chips.forEach((c) => { const on = c.dataset.topic === topic; c.classList.toggle("on", on); c.setAttribute("aria-current", on ? "true" : "false"); });
        secs.forEach((s) => (s.hidden = !!topic && s.id !== topic));
      }
      chips.forEach((c) => c.addEventListener("click", (e) => { e.preventDefault(); show(c.dataset.topic); history.replaceState(null, "", c.dataset.topic ? "#" + c.dataset.topic : location.pathname); }));
      const fromHash = () => { if (secs.some((s) => "#" + s.id === location.hash)) show(location.hash.slice(1)); };
      fromHash(); addEventListener("hashchange", fromHash);
      // A gentle tour so people notice the cards have a back: while cards are on screen, flip the next visible one,
      // hold it, flip it back. Stops for good once the visitor touches a card; pauses in hidden tabs; never with
      // reduced motion. Focus never moves.
      let tour = null, touring = true;
      function stopTour() { touring = false; clearTimeout(tour); document.querySelectorAll(".uc.auto").forEach((c) => c.classList.remove("flipped", "auto")); }
      const seen = new Set();
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
        const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting && e.intersectionRatio > 0.6 ? seen.add(e.target) : seen.delete(e.target))), { threshold: [0, 0.6, 1] });
        const cards = [...document.querySelectorAll(".uc")];
        cards.forEach((c) => io.observe(c));
        let next = 0;
        (function step() {
          if (!touring) return;
          const visible = cards.filter((c) => seen.has(c) && !c.classList.contains("flipped"));
          if (document.hidden || !visible.length) { tour = setTimeout(step, 1200); return; }
          const c = visible[next++ % visible.length];
          c.classList.add("flipped", "auto");
          tour = setTimeout(() => { c.classList.remove("flipped", "auto"); if (touring) tour = setTimeout(step, 1100); }, 2600);
        })();
      }
      document.querySelectorAll(".uc").forEach((card) => {
        const front = card.querySelector(".front"), back = card.querySelector(".back"), show = card.querySelector(".uc-show");
        function set(open, focus) {
          card.classList.toggle("flipped", open); front.inert = open; back.inert = !open; show.setAttribute("aria-expanded", String(open));
          if (focus) (open ? card.querySelector(".uc-back") : show).focus({ preventScroll: true });
        }
        set(location.hash === "#" + card.id);
        show.addEventListener("click", () => set(true, true));
        card.querySelector(".uc-back").addEventListener("click", () => set(false, true));
        card.addEventListener("pointerdown", stopTour); card.addEventListener("focusin", stopTour);
        const copy = card.querySelector(".uc-copy");
        copy.addEventListener("click", async () => {
          try { await navigator.clipboard.writeText(copy.dataset.text); copy.textContent = "Copied ✓"; } catch { copy.textContent = "Select and copy above"; }
          setTimeout(() => (copy.textContent = "Copy prompt"), 1600);
        });
      });
    })();
    </script>
    <p class="soft" style="padding-block:24px 0">New to Sendpaper? <a href="${esc(docsUrl("/quickstart"))}">Connect your agent in two minutes →</a></p>`,
    { description: `Send certified letters with proof of delivery (IRS replies, lease notices, disputes, demand letters) and personal cards with ${BRAND}, from your AI agent or the web.` },
  );
}
