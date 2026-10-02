# Sendpaper

Print-and-mail ordering for people and AI agents: postcards (4×6 $2.99, 6×9 $3.99) and letters ($4.99, ≤3 pages) to US addresses. Orders come in through the website, the REST API (`/v1`), or the MCP server (`/mcp`, used by Codex, Muse Code and Claude). Every order returns a Stripe Checkout link a human pays, so there are no API keys and agents can't spend money on their own. **Fulfilment is manual**: Ryan reviews paid orders in `/admin`, prints the print sheet (or forwards it to PostGrid or Stannp), and marks each order mailed.

Stack: Node 24 running TypeScript natively (no build step), Express 5, Postgres, Stripe, `@modelcontextprotocol/sdk` (stateless Streamable HTTP). Deployed with `render.yaml` to Render, *My Workspace* (ryan.j.tish@gmail.com), **not** the ryan@render.com work account. The Codex plugin, MCP registry `server.json` and Muse Code snippet live in a separate repo at `~/sendpaper-plugin`.

## State (2026-10-01, launch day)
- Built and run locally. The REST API, MCP (initialize, tools/list, create_letter) and every page were checked against a local Postgres; 3 schema tests pass.
- **Stripe is UNTESTED**: no key was available. The checkout redirect, webhook and success-redirect confirmation have never run.
- **LIVE at https://sendmypaper.com** (domain bought 2026-10-02 at GoDaddy: apex `A 216.24.57.1`, `www` CNAME to `sendpaper.onrender.com`, Render-managed TLS; `www` 301s to the apex). `sendpaper.onrender.com` still serves `/v1`, `/mcp`, `/webhooks`, `/o` and `/images` so older agent configs keep working; every other GET 301s to the domain. The brand stays "Sendpaper" on the sendmypaper.com domain. Live: web service `srv-dav7cfs1nsns7390mqk0` and Postgres `sendpaper-db` (`dpg-dav76djtqb8s739fvgsg-a`), both on FREE plans by Ryan's choice until the first order, with auto-deploy from `main`. Checked in prod: health, all pages, admin auth, a postcard created via the API and a letter via MCP (both test orders cancelled).
- The admin password is in `~/.sendpaper.admin` (chmod 600) and in Render's environment variables. It is not in the repo.
- **Stripe TEST mode is wired up** (2026-10-02). It uses a restricted key (Checkout Sessions: write, Refunds: write, Webhook Endpoints: write; Products/Prices are NOT needed for inline `price_data`, verified). The webhook is `we_1UMDjYEcNmajzQorCyHEYn6t` pointing at `https://sendmypaper.com/webhooks/stripe` for `checkout.session.completed` and `async_payment_succeeded`. Keys and the webhook secret are in `~/.sendpaper.env` and on Render. Checkout creation and the redirect are verified, and unsigned webhooks get a 400. **A completed test payment through an order's own Pay button has NOT happened yet**: the first test payment went to a Stripe dashboard Payment Link, which has no `order_id` metadata, so it could never match an order. LIVE mode isn't set up (needs Stripe activation and a live key). The test key was pasted in chat, so roll it after going live.
- **Agent-first landing page** at `/` (`src/landing.ts`), shipped 2026-10-01. `/openapi.json` serves `docs/openapi.json` with `servers` rewritten to BASE_URL. `/llms.txt` is hand-written in `web.ts`.
- **Mintlify docs are LIVE at https://docs.sendmypaper.com** (custom domain since 2026-10-02 via GoDaddy: two TXT records, `_acme-challenge.docs` and `_cf-custom-hostname.docs`, plus a `docs` CNAME to `cname.mintlify.builders`; `sendpaper.mintlify.site` still works) (free Starter plan, connected to this repo's `docs/` folder; pushing to `main` redeploys them). `DOCS_URL=https://docs.sendmypaper.com` on Render, so `/docs` 301s there. The docs are branded to match the site through `docs.json` alone (no custom CSS, which is a paid feature): Bricolage Grotesque/Public Sans fonts, the site's background colors, a navy banner, site navbar and footer links, and the AI "open in" menu. The logo wordmark is Bricolage 800 converted to paths with fontkit, because SVG logos can't load web fonts.
- Domain was unregistered as of 2026-10-01; Ryan is to buy it.
- The Codex plugin has not been test-installed (Codex CLI isn't on this machine).

## Design decisions
- **Pay per order, no accounts.** The `checkout_url` is `/o/:id/pay`, which creates a fresh Stripe session on every visit, so links never expire.
- **A person reviews before printing.** This is the content moderation step (USPS rules plus vendor rules) and the reason the admin queue exists. Do not add automatic printing without an automated moderation pass.
- **The print preview is the print sheet.** `render.ts` produces the HTML for both, so the customer approves exactly what gets printed.
- **Return address is required**, so every piece can be traced if someone abuses the service.
- Lob's terms forbid resale without its Partner Program. Use PostGrid (which has a reseller program) or Stannp as the print backend.
- Competitors already exist (PostAgent, MailStream, mailsnail at $1–1.50, Letter IRL). We compete on being consumer-friendly and getting into the Codex and Muse channels first, not on price.

## Traps
- **The GitHub account was renamed `ryan-fern` → `ryan-tish` (noticed 2026-10-01), and this repo is now PUBLIC** (it was created private; it went public around the time Mintlify was set up). Never commit secrets: keys live in Render's environment variables and `~/.sendpaper.env`. The full history was scanned clean on 2026-10-01.
- **Mintlify uses `"icons": {"library": "lucide"}`**, so card icons must be Lucide names (`mail`, not Font Awesome's `envelope`). An unknown name renders no icon, with no error.
- **The Mintlify CLI refuses Node 25.** Run it under Node 22, pinned: `cd docs && npx -y -p node@22 -p mint@4.2.949 -- mint validate` (and `mint broken-links`, `mint dev`).
- **Keep one canonical copy of the docs.** Once `DOCS_URL` is set, the built-in `/docs` page redirects. Point Mintlify's custom domain at `docs.<our domain>`, never leave it on `*.mintlify.site` long-term (that subdomain accrues the search credit instead of us). Keep `/llms.txt` on the main domain, because agents look there first.
- **The docs must not claim registry listings or submissions that haven't happened.** Two premature claims were caught and removed on 2026-10-01.
- **The free Postgres EXPIRES 2026-10-31** and its data is deleted. Upgrade `sendpaper-db` to basic-256mb before then; this is the Breadkin trap again. Free web services also sleep when idle (cold start around 30–60s). Stripe retries webhooks and the success redirect confirms payment itself, so payment still lands, just slowly.
- **Imports must use the `.ts` extension**, and only erasable TypeScript syntax is allowed (no enums or namespaces), because Node strips types at runtime.
- The Stripe webhook route must stay **before** any JSON body parser in `server.ts`.
- The Render CLI default config is the WORK account. For personal deploys use `RENDER_CLI_CONFIG_PATH=~/.render/cli-personal.yaml`.
- `[hidden]` needs `display:none !important` in `layout.ts`. Without it, `fieldset{display:grid}` shows hidden sections.
- Local DB: a project-local cluster in `.pgdata` on port 54330 (`pg_ctl -D .pgdata -o "-p 54330 -k /tmp" start`).

## Verify
```
npm run typecheck && npm test
(cd docs && npx -y -p node@22 -p mint@4.2.949 -- mint validate)   # mint 4.2.956 is broken on npm (notarget)
DATABASE_URL=postgres://postgres@localhost:54330/sendpaper ADMIN_TOKEN=local-admin-token-123 PORT=3077 BASE_URL=http://localhost:3077 npm start
```
Then create an order with POST `/v1/postcards` (see `/docs`) and check that `/o/<id>` renders the preview.

## Next
1. Ryan: Stripe secret key, domain, support email. Then deploy the blueprint and set the Stripe webhook to `https://<host>/webhooks/stripe` (event `checkout.session.completed`).
2. Make a real paid test order end to end.
3. Publish `~/sendpaper-plugin` publicly, publish to the MCP registry, open the awesome-codex-plugins PR, and submit to the Muse Connector Platform and musedirectory.dev.
