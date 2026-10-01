import type { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { BASE_URL, BRAND, PRODUCTS } from "./config.ts";
import {
  CreateLetterSchema,
  CreatePostcardSchema,
  createOrder,
  getOrder,
  publicOrder,
  setStatus,
} from "./orders.ts";

const INSTRUCTIONS = `${BRAND} prints and mails real postcards and letters to US addresses via USPS First-Class.
Flow: confirm the recipient address, return address and wording with the user, then call create_postcard or create_letter.
The response contains a preview_url and a checkout_url. Show both to the user. Nothing is printed until the user pays at checkout_url.
Every order is reviewed by a person before printing; threatening, harassing, fraudulent or obscene mail is refused and refunded.`;

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

function nextStep(o: ReturnType<typeof publicOrder>) {
  return o.checkout_url
    ? `Order created. Show the user the preview (${o.preview_url}) and ask them to pay at ${o.checkout_url} — it will not be mailed until paid. Track it at ${o.order_url}.`
    : `Order status: ${o.status_detail} Track it at ${o.order_url}.`;
}

function build(client: string | undefined) {
  const server = new McpServer({ name: "sendpaper", version: "1.0.0", websiteUrl: BASE_URL }, { instructions: INSTRUCTIONS });

  server.registerTool(
    "get_pricing",
    {
      title: "Get prices",
      description: "List mail products and prices (USD, printing + USPS First-Class postage included, US addresses only).",
      annotations: { readOnlyHint: true },
    },
    async () =>
      json(Object.entries(PRODUCTS).map(([id, p]) => ({ id, ...p, price: `$${(p.cents / 100).toFixed(2)}` }))),
  );

  server.registerTool(
    "create_postcard",
    {
      title: "Create a postcard",
      description:
        "Create a postcard order (4x6 or 6x9) and get a payment link. The front is an image URL or a big headline; the back carries the message and addresses. Mails only after the user pays.",
      inputSchema: CreatePostcardSchema.shape,
      annotations: { destructiveHint: false, openWorldHint: true },
    },
    async (args) => {
      const { size, content, ...rest } = CreatePostcardSchema.parse(args);
      const { order } = await createOrder({ ...rest, content, product: size === "6x9" ? "postcard_6x9" : "postcard_4x6", source: "mcp", client });
      const o = publicOrder(order);
      return { content: [{ type: "text", text: nextStep(o) }, ...json(o).content] };
    },
  );

  server.registerTool(
    "create_letter",
    {
      title: "Create a letter",
      description:
        "Create a printed letter order (up to 3 pages, 8.5x11, mailed in a #10 envelope) and get a payment link. Mails only after the user pays.",
      inputSchema: CreateLetterSchema.shape,
      annotations: { destructiveHint: false, openWorldHint: true },
    },
    async (args) => {
      const input = CreateLetterSchema.parse(args);
      const { order } = await createOrder({ ...input, product: "letter", source: "mcp", client });
      const o = publicOrder(order);
      return { content: [{ type: "text", text: nextStep(o) }, ...json(o).content] };
    },
  );

  server.registerTool(
    "get_order",
    {
      title: "Check an order",
      description: "Get the status of a postcard or letter order by id (ord_...).",
      inputSchema: { order_id: z.string() },
      annotations: { readOnlyHint: true },
    },
    async ({ order_id }) => {
      const o = await getOrder(order_id);
      if (!o) return { isError: true, content: [{ type: "text", text: `No order ${order_id}` }] };
      return json(publicOrder(o));
    },
  );

  server.registerTool(
    "cancel_order",
    {
      title: "Cancel an unpaid order",
      description: "Cancel an order that has not been paid yet. Paid orders can be cancelled by emailing support before they are printed.",
      inputSchema: { order_id: z.string() },
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ order_id }) => {
      const o = await getOrder(order_id);
      if (!o) return { isError: true, content: [{ type: "text", text: `No order ${order_id}` }] };
      if (o.status !== "awaiting_payment")
        return { isError: true, content: [{ type: "text", text: `Order is ${o.status}; only unpaid orders can be cancelled here.` }] };
      return json(publicOrder((await setStatus(order_id, "cancelled", "cancelled by customer via MCP"))!));
    },
  );

  return server;
}

// Stateless Streamable HTTP: a fresh server per request, so it scales on any instance with no session store.
export async function handleMcp(req: Request, res: Response) {
  const server = build(req.get("user-agent")?.split(" ")[0]);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
