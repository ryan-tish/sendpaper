# Sendpaper

Print-and-mail ordering for people and AI agents: postcards (4×6 $2.99, 6×9 $3.99) and letters ($4.99, ≤3 pages) to US addresses. Orders come in through the website, the REST API (`/v1`), or the MCP server (`/mcp`, used by Codex, Muse Code and Claude). Every order returns a Stripe Checkout link a human pays, so there are no API keys and agents can't spend money on their own. **Fulfilment is manual**: Ryan reviews paid orders in `/admin`, prints the print sheet (or forwards it to PostGrid or Stannp), and marks each order mailed.

Stack: Node 24 running TypeScript natively (no build step), Express 5, Postgres, Stripe, `@modelcontextprotocol/sdk` (stateless Streamable HTTP). Deployed with `render.yaml` to Render, *My Workspace* (ryan.j.tish@gmail.com), **not** the ryan@render.com work account. The Codex plugin, MCP registry `server.json` and Muse Code snippet live in a separate repo at `~/sendpaper-plugin`.

## State (2026-10-01, launch day)
- Built and run locally. The REST API, MCP (initialize, tools/list, create_letter) and every page were checked against a local Postgres; 3 schema tests pass.
- **Stripe is UNTESTED**: no key was available. The checkout redirect, webhook and success-redirect confirmation have never run.
- Not deployed yet. Domain `sendpaper.co` was unregistered as of 2026-10-01; Ryan is to buy it.
- The Codex plugin has not been test-installed (Codex CLI isn't on this machine).

## Design decisions
- **Pay per order, no accounts.** The `checkout_url` is `/o/:id/pay`, which creates a fresh Stripe session on every visit, so links never expire.
- **A person reviews before printing.** This is the content moderation step (USPS rules plus vendor rules) and the reason the admin queue exists. Do not add automatic printing without an automated moderation pass.
- **The print preview is the print sheet.** `render.ts` produces the HTML for both, so the customer approves exactly what gets printed.
- **Return address is required**, so every piece can be traced if someone abuses the service.
- Lob's terms forbid resale without its Partner Program. Use PostGrid (which has a reseller program) or Stannp as the print backend.
- Competitors already exist (PostAgent, MailStream, mailsnail at $1–1.50, Letter IRL). We compete on being consumer-friendly and getting into the Codex and Muse channels first, not on price.

## Traps
- **Imports must use the `.ts` extension**, and only erasable TypeScript syntax is allowed (no enums or namespaces), because Node strips types at runtime.
- The Stripe webhook route must stay **before** any JSON body parser in `server.ts`.
- The Render CLI default config is the WORK account. For personal deploys use `RENDER_CLI_CONFIG_PATH=~/.render/cli-personal.yaml`.
- `[hidden]` needs `display:none !important` in `layout.ts`. Without it, `fieldset{display:grid}` shows hidden sections.
- Local DB: a project-local cluster in `.pgdata` on port 54330 (`pg_ctl -D .pgdata -o "-p 54330 -k /tmp" start`).

## Verify
```
npm run typecheck && npm test
DATABASE_URL=postgres://postgres@localhost:54330/sendpaper ADMIN_TOKEN=local-admin-token-123 PORT=3077 BASE_URL=http://localhost:3077 npm start
```
Then create an order with POST `/v1/postcards` (see `/docs`) and check that `/o/<id>` renders the preview.

## Next
1. Ryan: Stripe secret key, domain, support email. Then deploy the blueprint and set the Stripe webhook to `https://<host>/webhooks/stripe` (event `checkout.session.completed`).
2. Make a real paid test order end to end.
3. Publish `~/sendpaper-plugin` publicly, publish to the MCP registry, open the awesome-codex-plugins PR, and submit to the Muse Connector Platform and musedirectory.dev.
