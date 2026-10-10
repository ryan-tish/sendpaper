// WebMCP (2026-10-09, Ryan's agent-ready list): every page registers our tools with the browser, so an agent running
// inside the browser can price, create and look up orders without filling in the forms. Spec as of 2026:
// document.modelContext.registerTool({ name, description, inputSchema, execute, annotations }, { signal }); Chromium 150
// deprecated navigator.modelContext, so we feature-detect both. provideContext() was removed from the spec (March 2026).
// Tools call our own REST API (same origin) with X-Client: webmcp, so they show up as their own app in /admin/stats.
// Payment is deliberately NOT a tool here: the agent hands the person the checkout_url, and the person pays.
import { readFileSync } from "node:fs";

const SPEC = JSON.parse(readFileSync(new URL("../docs/openapi.json", import.meta.url), "utf8"));

// WebMCP input schemas must be self-contained, so inline every #/components/schemas ref.
function inline(node: unknown, seen: string[] = []): unknown {
  if (Array.isArray(node)) return node.map((n) => inline(n, seen));
  if (!node || typeof node !== "object") return node;
  const o = node as Record<string, unknown>;
  if (typeof o.$ref === "string") {
    const name = o.$ref.split("/").pop()!;
    return seen.includes(name) ? { type: "object" } : inline(SPEC.components.schemas[name], [...seen, name]);
  }
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, inline(v, seen)]));
}
const body = (name: string) => inline({ $ref: `#/components/schemas/${name}` });

const NEXT = "Nothing is printed until it's paid. Show the person the preview_url and price, then give them the checkout_url to pay. Never pay without their approval.";

export const WEBMCP_TOOLS = [
  { name: "get_pricing", description: "List Sendpaper products and all-in prices (printing, envelope and USPS postage included). US addresses only.", inputSchema: { type: "object", properties: {} }, method: "GET", path: "/v1/pricing", readOnly: true },
  { name: "create_postcard", description: `Create a postcard order to a US address. Confirm the recipient, return address and wording with the person first. ${NEXT}`, inputSchema: body("CreatePostcard"), method: "POST", path: "/v1/postcards", readOnly: false },
  { name: "create_letter", description: `Create a letter order (typed text or a PDF link; optionally USPS Certified Mail). Confirm the recipient, return address and wording with the person first. ${NEXT}`, inputSchema: body("CreateLetter"), method: "POST", path: "/v1/letters", readOnly: false },
  { name: "get_order", description: "Look up an order's status, price, preview and tracking by its id (ord_…).", inputSchema: { type: "object", properties: { id: { type: "string", description: "Order id, e.g. ord_abc123" } }, required: ["id"] }, method: "GET", path: "/v1/orders/{id}", readOnly: true },
];

// Served at /webmcp.js and loaded (deferred) by every page. Does nothing in browsers without WebMCP.
export const WEBMCP_JS = `(() => {
  const mc = (typeof document !== "undefined" && document.modelContext) || (typeof navigator !== "undefined" && navigator.modelContext);
  if (!mc || typeof mc.registerTool !== "function") return;
  const tools = ${JSON.stringify(WEBMCP_TOOLS)};
  const signal = new AbortController().signal;
  for (const t of tools) {
    const def = {
      name: t.name, description: t.description, inputSchema: t.inputSchema, annotations: { readOnlyHint: t.readOnly },
      async execute(input) {
        input = input || {};
        const path = t.path.replace("{id}", encodeURIComponent(input.id || ""));
        const res = await fetch(path, {
          method: t.method,
          headers: Object.assign({ "X-Client": "webmcp", Accept: "application/json" }, t.method === "POST" ? { "Content-Type": "application/json", "Idempotency-Key": "webmcp-" + crypto.randomUUID() } : {}),
          body: t.method === "POST" ? JSON.stringify(input) : undefined,
        });
        const data = await res.json().catch(() => ({ error: { message: "HTTP " + res.status } }));
        return res.ok ? data : { error: data.error || data, status: res.status };
      },
    };
    try { Promise.resolve(mc.registerTool(def, { signal })).catch(() => {}); } catch (e) {}
  }
})();
`;
