import { BRAND, type ProductId } from "./config.ts";
import { docsUrl, page } from "./layout.ts";
import { esc } from "./render.ts";

// Real reasons people still need paper mail, each with a prompt an agent can run as-is.
// Keep caveats honest: we send First-Class only (no certified mail, no signature tracking).
type UseCase = { id: string; title: string; why: string; prompt: string; product: ProductId; note?: string };

export const USE_CASES: UseCase[] = [
  {
    id: "birthdays",
    title: "Birthdays and holidays",
    why: "A card on the fridge beats a text. Your agent already knows the dates.",
    prompt: "Every year on Mom's birthday, send her a 6×9 postcard with a recent photo of the kids and a short note from me.",
    product: "postcard_6x9",
  },
  {
    id: "thank-you",
    title: "Thank-you notes",
    why: "After an interview, a favor, or a job well done, a handwritten-style note gets remembered.",
    prompt: "Send a thank-you postcard to the contractor who fixed our roof. Their office is 500 Main St, Boston MA 02110.",
    product: "postcard_4x6",
  },
  {
    id: "taxes",
    title: "Taxes and paperwork",
    why: "Some agencies still want a letter: answering a notice, sending a signed statement, mailing a form.",
    prompt: "Write a short letter responding to this IRS notice, explaining the payment I already made, and mail it to the address on the notice.",
    product: "letter",
    note: "We mail First-Class only. If the agency requires certified mail or proof of delivery, use the post office instead.",
  },
  {
    id: "landlord",
    title: "Landlords and leases",
    why: "Leases often require written notice for repairs, renewals and move-outs.",
    prompt: "Mail my landlord a printed copy of this 30-day notice that I'm not renewing the lease. Return address is my apartment.",
    product: "letter",
    note: "First-Class only, so keep a copy. If your lease requires certified mail, send it that way.",
  },
  {
    id: "business",
    title: "Small business",
    why: "A postcard to a first-time customer or a lapsed regular stands out in a way email can't.",
    prompt: "Send a thank-you postcard with our logo to each of this week's new customers from the Shopify export.",
    product: "postcard_4x6",
    note: "One order per recipient, and only to people who bought from you. No bulk marketing.",
  },
  {
    id: "condolences",
    title: "Condolences and get-well wishes",
    why: "Some moments deserve paper. Your agent can help with the words, but the card is real.",
    prompt: "Help me write a short, warm condolence note to Aunt Ruth and mail it as a letter. Keep it simple.",
    product: "letter",
  },
  {
    id: "representatives",
    title: "Writing to your representatives",
    why: "Offices count physical letters. A short, personal one is read.",
    prompt: "Draft a one-page letter to my state senator supporting the library funding bill, in my words, and mail it to their district office.",
    product: "letter",
  },
  {
    id: "moving",
    title: "Moving and address changes",
    why: "Tell the people who still send you paper where to find you.",
    prompt: "Send a 'We moved!' postcard with our new address to everyone on this list.",
    product: "postcard_4x6",
    note: "One order per recipient.",
  },
];

const CSS = `
.uc-head { display: grid; gap: 12px; padding-block: 56px 16px; max-width: 720px; }
.uc-head h1 { font-size: clamp(1.9rem, 3.6vw, 2.6rem); }
.uc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; padding-block: 24px 8px; }
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

const LABEL: Record<ProductId, string> = { postcard_4x6: "Postcard 4×6", postcard_6x9: "Postcard 6×9", letter: "Letter" };

export function useCasesPage() {
  return page(
    `Use cases — ${BRAND}`,
    `<style>${CSS}</style>
    <div class="uc-head"><span class="eyebrow">Use cases</span><h1>What people send</h1>
      <p class="soft">Paper still matters for birthdays, paperwork and the moments that deserve more than a text. Copy a prompt into your agent, or send it from the web.</p></div>
    <div class="uc-grid" id="ucGrid">${USE_CASES.map(
      (u) => `<article class="uc" id="${u.id}"><div class="uc-in">
        <div class="face front">${MARK}<span class="tag" style="align-self:flex-start">${LABEL[u.product]}</span><h3>${esc(u.title)}</h3><p>${esc(u.why)}</p>
          <div class="foot"><button type="button" class="uc-show" aria-expanded="false">See the prompt ↻</button></div></div>
        <div class="face back"><div class="top"><span class="eyebrow">Ask your agent</span><button type="button" class="uc-back" aria-label="Back to ${esc(u.title)}">↺ Back</button></div>
          <div class="prompt">${esc(u.prompt)}</div>${u.note ? `<p class="note">${esc(u.note)}</p>` : ""}
          <div class="foot"><button type="button" class="uc-copy" data-text="${esc(u.prompt)}">Copy prompt</button><a href="/send?product=${u.product}">Send from the web →</a></div></div>
      </div></article>`,
    ).join("")}</div>
    <script>
    (function () {
      const grid = document.getElementById("ucGrid");
      grid.classList.add("flip");
      grid.querySelectorAll(".uc").forEach((card) => {
        const front = card.querySelector(".front"), back = card.querySelector(".back"), show = card.querySelector(".uc-show");
        function set(open, focus) {
          card.classList.toggle("flipped", open); front.inert = open; back.inert = !open; show.setAttribute("aria-expanded", String(open));
          if (focus) (open ? card.querySelector(".uc-back") : show).focus({ preventScroll: true });
        }
        set(location.hash === "#" + card.id);
        show.addEventListener("click", () => set(true, true));
        card.querySelector(".uc-back").addEventListener("click", () => set(false, true));
        const copy = card.querySelector(".uc-copy");
        copy.addEventListener("click", async () => {
          try { await navigator.clipboard.writeText(copy.dataset.text); copy.textContent = "Copied ✓"; } catch { copy.textContent = "Select and copy above"; }
          setTimeout(() => (copy.textContent = "Copy prompt"), 1600);
        });
      });
    })();
    </script>
    <p class="soft" style="padding-block:24px 0">New to Sendpaper? <a href="${esc(docsUrl("/quickstart"))}">Connect your agent in two minutes →</a></p>`,
    { description: `Ways to use ${BRAND}: birthday postcards, thank-you notes, tax and lease letters, small-business mail, sent by your AI agent.` },
  );
}
