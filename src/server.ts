import express from "express";
import { admin } from "./admin.ts";
import { api, apiError } from "./api.ts";
import { BASE_URL, env } from "./config.ts";
import { migrate, pool } from "./db.ts";
import { docs } from "./docs.ts";
import { handleMcp } from "./mcp.ts";
import { handleWebhook } from "./payments.ts";
import { web } from "./web.ts";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

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

// CORS for the API and MCP so browser-based agents can call them; no cookies or credentials are involved.
app.use(["/v1", "/mcp"], (req, res, next) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, X-Client, Mcp-Session-Id, Mcp-Protocol-Version, Authorization",
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

app.use(docs);
app.use(web);

await migrate();
app.listen(env.port, () => console.log(`listening on ${env.port} (${BASE_URL})`));
