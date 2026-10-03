# Sendpaper strategy

Living plan for go-to-market and what we build next. Written 2026-10-02 with Ryan; update it when a decision changes.
Context: competitors already exist (PostAgent, MailStream, mailsnail ~$1–1.50/piece, Letter IRL, which applied to OpenAI's
directory around 2026-09-28). None was listed in MuseDirectory, the Codex community marketplace or Meta's Muse connector catalog
as of 2026-10-01. **Our position: first in Muse and Codex, with native agent payments (Stripe shared payment tokens).** That
window is days to weeks.

Submission drafts for every platform: https://claude.ai/code/artifact/0645747e-ecf7-44a3-99b7-0d6a11ccf40c

## 1. Go-to-market: winning the stores first

### Ground rule: no fake reviews
Ryan asked about creating reviews ourselves. **We don't.** Self-written, paid-for-positive or undisclosed incentivized reviews
break every store's rules (OpenAI, Meta, Smithery and others) and the US FTC rule on fake reviews (2024). The cost is delisting,
which is the opposite of market share. What is allowed: real people using it and leaving honest reviews, with any perk
disclosed and never conditioned on a positive rating.

### Phase 0: unblock (today)
- [x] Plugin repo `ryan-tish/sendpaper-plugin` public (2026-10-02); official MCP Registry listing live (2026-10-03)
- [ ] Agent payments working (3 Stripe key permissions), Stripe and PostGrid live, one real postcard to Ryan
- [ ] support@sendmypaper.com receiving mail (Google Workspace recommended)
- [x] Render web service and database on paid plans (2026-10-02)

### Phase 1: be listed everywhere first (days 0–3)
1. Same day: official MCP Registry, then Smithery, Glama, PulseMCP, mcp.so and mcpservers.org (drafts are in the doc above).
2. Codex: open the awesome-codex-plugins pull request, and use `codex plugin marketplace add ryan-tish/sendpaper-plugin` in all copy.
3. Submit to OpenAI's app directory and Meta's Muse Connector Platform **as soon as the blockers clear, not when it's perfect**.
   Reviews take weeks and are first-come. Meta's form mentions "featured placement"; ask for launch-partner placement.
4. MuseDirectory (musedirectory.dev): post the X demo, then submit. Each real public use case is another listing.
5. **musedirectory.ai**: a bigger community tracker (2,367 connectors as of 2026-10-02) where builders submit their endpoint and it's checked automatically on the spot. Submit Sendpaper the same day.

### Phase 2: win the agent's choice (week 1)
When several mail tools are installed, **the agent picks whichever is described best.** That's our version of search ranking:
- Tool names and descriptions say the words people use: mail, send, postcard, letter, card, print, USPS.
- `get_pricing` and the server instructions answer the agent's questions in one call: price, speed, US only, how to pay.
- Keep `llms.txt`, the OpenAPI spec and the docs current; they're how agents and search engines read us.
- Track `orders.client` (which agent placed each order) to see which channels work.

### Phase 3: real usage and proof (weeks 1–4)
- **Launch offer:** first postcard free for the first 100 senders (about $1.40 of cost each). Real usage creates real reviews; ask
  for an honest rating with no strings attached.
- **Friends, family, early users:** ask them to send a real card through their agent and post about it if they liked it.
- **Public demos:** X clips of "one sentence → postcard", a weekly "what agents mailed this week" post (with permission), and a
  Show HN plus a Product Hunt launch once live payments work. Share in r/ClaudeAI, r/ChatGPT and r/MetaAI, and in Muse communities.
- **Seasonal pushes:** Halloween, Thanksgiving thank-yous, holiday cards (the biggest mail season), Valentine's, Mother's Day.
  Each gets a landing page and prompts.

### Phase 4: partnerships and lock-in (month 1–2)
- **Stripe:** we're an early shared-payment-token seller, so pitch a case study or a place in their agentic commerce showcase.
- **Meta Muse platform team and OpenAI devrel:** early connector partners are what they feature.
- **PostGrid:** partner directory and co-marketing.
- **Builders:** volume pricing and API keys for apps that send mail on behalf of users. An n8n/Zapier node and a Shopify
  "thank-you card" app are distribution channels that agent-only competitors don't have.
- **Search content:** use-case pages ("send a postcard from ChatGPT", "mail a letter online", "send a birthday card from Claude").

### What would beat us
- Letter IRL approved by OpenAI before we submit. Mitigation: submit the moment Stripe is live.
- Price war from mailsnail (about $1/postcard). We compete on trust (human review, exact preview, agent payments) and
  distribution, not price.
- Meta or OpenAI shipping native mail. Unlikely soon, but it's why the Muse and Codex listings matter now.

## 2. Next product

**Pick: "Occasions": a birthday card plus real flowers or gifts, built into Sendpaper.** Second choice: certified-mail cancellations and disputes.
Researched 2026-10-02 across MCP registries and the ChatGPT/Muse directories; items marked ⚠ are unverified.

| Idea (screener rank) | Score /10 | Why |
| --- | --- | --- |
| **Gifts, flowers and occasions** | **8** | No gift or flower connector on Muse. Florist One's API is free and self-serve, pays 20% commission and fulfils through local florists. A $70 arrangement earns about $14, plus the card. It reuses everything we built: card printing, agent payments, the review queue and address handling. Occasion reminders bring repeat orders. Risk: 1-800-Flowers (already in ChatGPT) ports to Muse. |
| **Certified-mail cancellations and disputes** | **7** (as a Sendpaper add-on) | PostGrid offers certified mail by API ($6.94, or $9.85 with an electronic return receipt). Gyms and contracts often require written or certified cancellation; Byegym charges $29 for this. Sell for about $15–20 at about $11 cost. Ships in days. Sits beside phone-call negotiators (Pine, CutMyBill, Rocket Money) rather than fighting them. |
| Unclaimed property | 4 | Good free hook, but claims are free from the state and finder fees are capped (about 10% in most states, registration and bonds in some). |
| Government admin | 4 | Ticket Fighter covers parking disputes; DMV and passports aren't self-serve and the passport needs the physical document. |
| Returns and refunds | 4 | No consumer API; needs inbox or retailer access. |
| Bill negotiation | 5 alone | **Not actually open:** CutMyBill and SubKiller are on Muse ⚠ (seen on musedirectory.ai, not confirmed with Meta); Pine sells a phone-negotiation MCP. |
| Insurance quotes | 2 | Needs a producer licence in each state; Insurify (ChatGPT) and Sigo (MCP for Muse, launched 2026-10-01) are already there. |
| Family and school | 3 | Each school's data is different, there's no payment to earn from, and calendar connectors already cover most of it. |

### Plan for Occasions (after Sendpaper is live and listed)
1. Verify Florist One: how API orders are paid ⚠, whether we can be the merchant of record with shared payment tokens, delivery coverage and terms.
2. Add `send_flowers` (plus `browse_arrangements`) next to the card tools: "card + flowers" as one order, one payment and one preview.
3. Reminders: let the agent save birthdays and anniversaries and propose a card a week ahead. That's the retention loop.
4. Then certified mail (`create_letter` with `mail_class: certified`, cancellation and dispute templates) as the second add-on.

Sources: Florist One API https://www.floristone.com/api/ · Goody https://developer.ongoody.com/ · PostGrid certified mail
https://www.postgrid.com/how-to-send-certified-mail-via-api/ · Byegym https://byegym.com/cancel/anytime-fitness · Insurify ChatGPT
https://insurify.com/press/news/insurify-expands-chatgpt-plugin/ · Sigo MCP https://www.prnewswire.com/news-releases/sigo-seguros-opens-its-auto-insurance-mcp-server-to-chatgpt-grok-bot-and-muse-others-are-blocking-them-302896570.html
· Pine https://pineclaw.com/ · musedirectory.ai https://musedirectory.ai/ · finder-fee caps https://themissingmint.com/guides/unclaimed-money-finder-fee-cap-by-state
