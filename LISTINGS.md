# Listing kit

One source of truth for every directory, marketplace and launch-site listing, so Sendpaper is described the same way everywhere (that consistency is what helps answer engines connect "an AI agent that mails a letter" to us). Copy from here; don't improvise per site.

Rules (from `~/agent-store-template/DISTRIBUTION.md`): no prices in listing copy (they go stale; link to pricing instead), never claim a listing or integration that doesn't exist, never seed reviews, and say we're the maker wherever a site asks.

## Basics

| Field | Value |
| --- | --- |
| Name | Sendpaper |
| Website | https://sendmypaper.com |
| Docs | https://docs.sendmypaper.com |
| Pricing page | https://sendmypaper.com/#pricing |
| MCP server (remote, no API key) | https://sendmypaper.com/mcp |
| REST API / OpenAPI | https://sendmypaper.com/v1 · https://sendmypaper.com/openapi.json |
| llms.txt | https://sendmypaper.com/llms.txt |
| Plugin repo (Codex / Claude Code) | https://github.com/ryan-tish/sendpaper-plugin (hidden while the GitHub account is flagged; leave blank until it's back) |
| Support | support@sendmypaper.com |
| Pricing model | Paid, pay per piece (no subscription, no free tier) |
| Platforms | Web, API, MCP (Claude, ChatGPT/Codex, Cursor, Muse, any MCP client) |
| Region | Mails to US addresses only |
| Founded | 2026 |
| Maker | Ryan Tish |
| Logo | `docs/logo/icon-512.png` (512×512, square); wordmark `docs/logo/light.svg` |

## Names and taglines (pick the one that fits the field)

- **≤30 chars:** Physical mail for AI agents
- **≤60 chars:** Your AI agent can print and mail real postcards and letters
- **≤100 chars:** Let Claude, ChatGPT or any AI agent print and mail real postcards, letters and certified mail in the US.

## Short description (≤160 characters)

Sendpaper lets AI agents print and mail real postcards, letters and USPS Certified Mail to US addresses. You approve the preview and payment.

## Long description (~120 words)

Sendpaper is physical mail for AI agents. Tell Claude, ChatGPT, Codex, Cursor or any MCP-compatible agent what to send and to whom, and it creates a real postcard or letter: you see the exact print preview, approve the payment, and Sendpaper prints and mails it through USPS.

It handles birthday and thank-you cards, photo postcards, letters you write or upload as a PDF, and USPS Certified Mail with tracking and proof of delivery for notices that matter: tax replies, landlord notices, disputes and demand letters. Send the same card to up to 25 people at once.

Agents connect through a remote MCP server or a REST API with no API key. A person reviews every piece before printing, and nothing is mailed until you pay.

## Bullet features

- Postcards (three sizes, photo, collage or big-text fronts) and letters (typed or your own PDF)
- USPS Certified Mail with tracking and proof of delivery, plus optional return receipt
- Express delivery (USPS Priority Mail)
- Send one design to up to 25 recipients with a single payment
- Exact print preview before you pay; a person reviews every piece
- Remote MCP server and REST API, no API key; agents can pay with Stripe payment tokens you approve, or you pay via a checkout link
- Works with Claude, ChatGPT/Codex, Cursor, Muse and any MCP client

## Categories and tags

- **Primary category:** AI agents / Productivity (fallbacks: Communication, Developer tools, APIs)
- **Tags:** ai agents, mcp, mcp server, mail api, postcards, letters, certified mail, direct mail, print and mail, usps, claude, chatgpt, automation, api
- **"Alternative to" (AlternativeTo, SaaSHub):** Lob, PostGrid, Click2Mail, Stannp, Thanks.io, Handwrytten, LetterStream, Mailform. Only pick ones the site already lists, and only where we genuinely overlap (sending letters/postcards online).

## Use cases (for "use cases" fields)

1. Ask your agent to mail a birthday or holiday postcard with a photo.
2. Reply to an IRS or state tax notice by Certified Mail with proof of delivery.
3. Send a landlord notice or security-deposit demand by Certified Mail with a return receipt.
4. Mail a signed PDF form or document without a printer or a post office trip.
5. Send the same announcement or thank-you card to up to 25 people at once.

## Example prompts (for "how to use" fields)

- "Mail my mom a birthday postcard with this photo. Say I'll call Sunday."
- "Send this signed PDF to the county clerk by certified mail."
- "Send our holiday card to these 12 addresses."

## Screenshots

Fresh set in `~/Downloads/sendpaper-listing/` (1280×800 PNG): homepage hero, the agent chat demo, `/send` chooser, postcard editor with live preview, group page, pricing. Regenerate after visual changes.

## Where it's going (status lives in the growth tracker)

Free, no GitHub needed: Toolify (https://www.toolify.ai/submit-tool), SaaSHub (https://www.saashub.com/submit, verify ownership after), AI Agents Directory (https://aiagentsdirectory.com/submit-agent), AI Agent Store, AlternativeTo (account must be 7 days old before submitting). Email: Composio, Arcade. After GitHub is back: Docker MCP Catalog, Cline MCP Marketplace, n8n node, Pipedream app request. Full list and verdicts: `~/agent-store-template/DISTRIBUTION.md` §5b.
