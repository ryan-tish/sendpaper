import type { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { BASE_URL, BRAND, PRODUCTS, env } from "./config.ts";
import { PaymentError, payWithSharedToken } from "./payments.ts";
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
The response contains a preview_url and a checkout_url. Nothing is printed until the order is paid. Two ways to pay:
1. If you can obtain a Stripe shared payment token (spt_…) for the user, for example through Stripe Link / link-cli, request one for the order's exact amount in USD${env.stripeNetworkId ? ` scoped to network id ${env.stripeNetworkId}` : ""}, then call pay_order. Only do this after the user has approved this purchase and its price.
2. Otherwise, show the user the preview_url and checkout_url and let them pay there.
Every order is reviewed by a person before printing; threatening, harassing, fraudulent or obscene mail is refused and refunded.`;

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

function nextStep(o: ReturnType<typeof publicOrder>) {
  return o.checkout_url
    ? `Order created (${o.id}, ${o.price.display}). Preview: ${o.preview_url}. To pay: call pay_order with a Stripe shared payment token for ${o.price.amount_cents} cents USD, or have the user pay at ${o.checkout_url}. It will not be mailed until paid. Track it at ${o.order_url}.`
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
      json({
        products: Object.entries(PRODUCTS).map(([id, p]) => ({ id, ...p, price: `$${(p.cents / 100).toFixed(2)}` })),
        payment: {
          options: ["shared_payment_token via pay_order", "checkout_url (Stripe Checkout, supports Link)"],
          currency: "usd",
          ...(env.stripeNetworkId ? { stripe_network_id: env.stripeNetworkId } : {}),
        },
      }),
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
    "pay_order",
    {
      title: "Pay for an order",
      description:
        "Pay for an unpaid order with a Stripe shared payment token (spt_…) the user approved, scoped to at least the order amount in USD. On success the order is paid and goes to print. Use only after the user approved the purchase.",
      inputSchema: { order_id: z.string(), shared_payment_token: z.string().describe("Stripe shared payment token, spt_…") },
      annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ order_id, shared_payment_token }) => {
      const o = await getOrder(order_id);
      if (!o) return { isError: true, content: [{ type: "text", text: `No order ${order_id}` }] };
      try {
        const paid = publicOrder(await payWithSharedToken(o, shared_payment_token));
        return { content: [{ type: "text", text: `Paid. ${paid.status_detail} Track it at ${paid.order_url}.` }, ...json(paid).content] };
      } catch (e) {
        if (e instanceof PaymentError)
          return { isError: true, content: [{ type: "text", text: `${e.message} (${e.code}). The user can still pay at ${publicOrder(o).checkout_url ?? publicOrder(o).order_url}.` }] };
        throw e;
      }
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
