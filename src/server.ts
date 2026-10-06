import express from "express";
import { admin } from "./admin.ts";
import { api, apiError } from "./api.ts";
import { BASE_URL, env } from "./config.ts";
import { migrate, pool } from "./db.ts";
import { docs } from "./docs.ts";
import { handleMcp } from "./mcp.ts";
import { handleWebhook } from "./payments.ts";
import { startPrintSync } from "./fulfill.ts";
import { web } from "./web.ts";
import { quick } from "./quick.ts";
import { trackApi, trackViews } from "./stats.ts";
import { pingIndexNow, seo } from "./seo.ts";
import { posthogProxy } from "./analytics.ts";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

// One canonical host for pages (search engines, shared links). The API, MCP, webhooks and order pages
// keep answering on the old onrender.com host so agents configured before the domain switch keep working.
const canonical = new URL(BASE_URL).host;
app.use((req, res, next) => {
  const keep = /^\/(v1|mcp|webhooks|o|images|files|healthz)(\/|$)/.test(req.path);
  if (req.hostname !== canonical && req.hostname.endsWith(".onrender.com") && !keep && req.method === "GET")
    return res.redirect(301, BASE_URL + req.originalUrl);
  next();
});

// Stripe needs the raw body to verify signatures, so this route comes before any JSON parser.
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    await handleWebhook(req.body, req.get("stripe-signature"));
    res.json({ received: true });
  } catch (e) {
    console.error("stripe webhook", e);
    res.status(400).send(String(e));
  }
});

// PostHog reverse proxy (raw body passthrough, so it comes before any parser).
app.use("/ingest", express.raw({ type: () => true, limit: "5mb" }), posthogProxy);

// CORS for the API and MCP so browser-based agents can call them; no cookies or credentials are involved.
app.use(["/v1", "/mcp"], (req, res, next) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, X-Client, X-Sendpaper-Owner, Mcp-Session-Id, Mcp-Protocol-Version, Authorization",
    "Access-Control-Expose-Headers": "Mcp-Session-Id",
  });
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.post("/mcp", express.json({ limit: "200kb" }), (req, res) => {
  handleMcp(req, res).catch((e) => {
    console.error("mcp", e);
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null });
  });
});
// Stateless server: no SSE stream or session to resume or delete.
app.all("/mcp", (_req, res) => {
  res.status(405).set("Allow", "POST").json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
});

app.use("/v1", trackApi); // logs every API request (stats.ts), including 404s and validation errors
app.use("/v1", api);
app.use("/v1", (_req, res) => apiError(res, 404, "not_found", "No such endpoint. See /docs."));
app.use("/admin", admin);

app.get("/healthz", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
});
// OpenAI app-directory domain verification; set the token from the submission form when applying.
app.get("/.well-known/openai-apps-challenge", (_req, res) => {
  res.type("text/plain").send(process.env.OPENAI_APPS_CHALLENGE ?? "");
});

// Count page views for /admin/stats (pages only: no API, MCP, assets, admin or bots).
app.use(seo);
app.use(trackViews);
app.use(docs);
app.use(quick);
app.use(web);

// Last-resort handler: log the error, but never forward an upstream error's status or headers (Stripe errors carry both).
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("unhandled", req.method, req.path, err);
  if (res.headersSent) return;
  if (req.path.startsWith("/v1")) return apiError(res, 500, "server_error", "Something went wrong on our side.");
  res.status(500).type("text/plain").send("Something went wrong on our side. Please try again.");
});

await migrate();
startPrintSync();
app.listen(env.port, () => {
  console.log(`listening on ${env.port} (${BASE_URL})`);
  pingIndexNow();
});
