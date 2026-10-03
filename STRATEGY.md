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
- [ ] Plugin repo `ryan-tish/sendpaper-plugin` public
- [ ] Agent payments working (3 Stripe key permissions), Stripe and PostGrid live, one real postcard to Ryan
- [ ] support@sendmypaper.com receiving mail (Google Workspace recommended)
- [x] Render web service and database on paid plans (2026-10-02)

### Phase 1: be listed everywhere first (days 0–3)
1. Same day: official MCP Registry, then Smithery, Glama, PulseMCP, mcp.so and mcpservers.org (drafts are in the doc above).
2. Codex: open the awesome-codex-plugins pull request, and use `codex plugin marketplace add ryan-tish/sendpaper-plugin` in all copy.
3. Submit to OpenAI's app directory and Meta's Muse Connector Platform **as soon as the blockers clear, not when it's perfect**.
   Reviews take weeks and are first-come. Meta's form mentions "featured placement"; ask for launch-partner placement.
4. MuseDirectory: post the X demo, then submit. Each real public use case is another listing.

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

_(Filled from the screener in `~/muse-gap-scanner` plus a fresh competitor check across MCP registries. The screener alone
missed MCP competitors last time, which is how print-and-mail looked uncontested.)_
