import type { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { BASE_URL, BRAND, COLOR_LETTER_CENTS, EXPRESS_CENTS, LIMITS, FIRST_ORDER_DISCOUNT_PCT, OFFER_ACTIVE, OFFER_LINE, PRODUCTS, env, letterProduct, postcardProduct } from "./config.ts";
import { PaymentError, payWithSharedToken } from "./payments.ts";
import { isOwnerRequest, recordApiCall } from "./stats.ts";
import { PdfError, prepareLetterContent } from "./pdf.ts";
import {
  AddressSchema,
  CreateLetterSchema,
  CreatePostcardSchema,
  MAX_RECIPIENTS,
  RecipientsSchema,
  batchSummary,
  createGroupOrders,
  createOrder,
  getOrder,
  publicOrder,
  setStatus,
  type Address,
  type OrderRow,
} from "./orders.ts";

const INSTRUCTIONS = `${BRAND} prints and mails real postcards and letters to US addresses via USPS First-Class.
Flow: confirm the recipient address, return address and wording with the user, then call create_postcard or create_letter.
The response contains a preview_url and a checkout_url. Nothing is printed until the order is paid. Two ways to pay:
1. If you can obtain a Stripe shared payment token (spt_…) for the user, for example through Stripe Link / link-cli, request one for the order's exact amount in USD${env.stripeNetworkId ? ` scoped to network id ${env.stripeNetworkId}` : ""}, then call pay_order. Only do this after the user has approved this purchase and its price.
2. Otherwise, show the user the preview_url and checkout_url and let them pay there.
To send the same postcard or letter to several people (holiday cards, announcements, the same notice to several parties), pass recipients (2-${MAX_RECIPIENTS} addresses) instead of to: each person gets their own order and tracking, and one checkout_url (or one pay_order call) pays for all of them.
Letters can go by USPS Certified Mail (create_letter certified option) when the user needs proof of mailing and delivery; the order then gets a USPS tracking number. Letters can also be the user's own PDF (content.pdf_url). Express (USPS Priority, 2-3 days) is available for postcards and letters, not with certified. ${BRAND} prints and mails what the user writes and gives no legal or tax advice.
Every order is reviewed by a person before printing; threatening, harassing, fraudulent or obscene mail is refused and refunded.`;

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
// Same data as structuredContent too, so clients can read it against the tool's outputSchema (JSON round trip turns Dates into strings).
const result = (data: unknown, lead?: string) => ({
  content: [...(lead ? [{ type: "text" as const, text: lead }] : []), ...json(data).content],
  structuredContent: JSON.parse(JSON.stringify(data)) as Record<string, unknown>,
});

// Output schemas list the fields agents rely on; .loose() keeps the rest of the order (addresses, content, events) valid too.
const OrderOutput = z
  .object({
    id: z.string().describe("Order id, ord_…"),
    object: z.enum(["postcard", "letter"]),
    product: z.string().describe("Product id, e.g. postcard_4x6 or letter_certified"),
    product_name: z.string(),
    certified: z.string().describe("none, certified or certified_return_receipt"),
    status: z.string().describe("awaiting_payment, paid, printing, mailed, cancelled or refunded"),
    status_detail: z.string().describe("Plain-English status to show the user"),
    price: z.object({ amount_cents: z.number(), currency: z.string(), display: z.string() }),
    checkout_url: z.string().nullable().describe("Where the user pays; null once paid or cancelled"),
    order_url: z.string().describe("Order status page"),
    preview_url: z.string().describe("Exact print preview"),
    tracking: z.object({ number: z.string(), url: z.string() }).nullable().describe("USPS tracking, for Certified Mail once printed"),
    discount: z
      .object({ amount_cents: z.number(), display: z.string(), reason: z.string() })
      .nullable()
      .describe("First-order discount, already taken off price; null when none applies"),
    batch: z
      .object({
        id: z.string(),
        count: z.number().describe("How many recipients (one order each)"),
        url: z.string().describe("Group page listing every recipient"),
        checkout_url: z.string().nullable().describe("One payment link for every unpaid order in the group"),
        price: z.object({ amount_cents: z.number(), currency: z.string(), display: z.string() }).describe("Total for the whole group"),
        discount: z.object({ amount_cents: z.number(), display: z.string(), reason: z.string() }).nullable(),
      })
      .optional()
      .describe("Present when the order was created with recipients: the whole group. The top-level fields describe the first recipient's order; use batch.price and batch.checkout_url for the total and payment."),
    orders: z.array(z.object({ id: z.string(), to: z.string(), order_url: z.string(), preview_url: z.string() })).optional().describe("Every order in the group, when created with recipients"),
  })
  .loose();

const PricingOutput = z.object({
  products: z.array(
    z.object({ id: z.string(), name: z.string(), cents: z.number(), price: z.string().describe("Display price, e.g. $2.99") }).loose(),
  ),
  payment: z
    .object({
      options: z.array(z.string()),
      currency: z.string(),
      stripe_network_id: z.string().optional().describe("Scope Stripe shared payment tokens to this network id"),
    })
    .loose(),
  first_order_discount: z.object({ percent: z.number(), description: z.string() }).describe("Current first-order discount (0 when none)"),
  letter_photo: z.object({ amount_cents: z.number(), description: z.string() }).describe("Surcharge for a letter printed in color (a photo, or a PDF with color on)"),
  express: z.object({ amount_cents: z.number(), description: z.string() }).describe("Surcharge for express delivery"),
  pdf_letters: z.object({ max_pages: z.number(), description: z.string() }).describe("Mailing your own PDF as a letter"),
});

// `to` becomes optional in the tool input so `recipients` can replace it; one of the two is required.
const Recipients = z.array(AddressSchema).min(2).max(MAX_RECIPIENTS)
  .describe(`Send the same piece to several people: 2-${MAX_RECIPIENTS} US addresses, used INSTEAD of to. Each gets their own order and tracking; one payment covers all.`);
const toOrRecipients = { to: AddressSchema.optional().describe("Recipient's US mailing address (or use recipients for several people)"), recipients: Recipients.optional() };

// Group result: the first order's fields (so the published output schema still holds) plus the whole group.
function groupResult(batchId: string, orders: OrderRow[]) {
  const b = batchSummary(batchId, orders);
  const first = publicOrder(orders[0]);
  const off = b.discount ? ` That includes ${b.discount.display} as their first order.` : "";
  const lead = `Created ${b.count} orders (group ${b.id}), ${b.price.display} in total.${off} Preview each one from ${b.url}. To pay for all of them: call pay_order with any of these order ids and a Stripe shared payment token for ${b.price.amount_cents} cents USD, or have the user pay at ${b.checkout_url}. Nothing is mailed until paid.`;
  return result({ ...first, batch: b, orders: orders.map((o) => ({ id: o.id, to: o.to_address.name, order_url: publicOrder(o).order_url, preview_url: publicOrder(o).preview_url })) }, lead);
}
const needsAddress = { isError: true as const, content: [{ type: "text" as const, text: "Give either to (one recipient) or recipients (2 or more)." }] };

function nextStep(o: ReturnType<typeof publicOrder>) {
  const off = o.discount ? ` That includes ${o.discount.display} as their first order.` : "";
  return o.checkout_url
    ? `Order created (${o.id}, ${o.price.display}).${off} Preview: ${o.preview_url}. To pay: call pay_order with a Stripe shared payment token for ${o.price.amount_cents} cents USD, or have the user pay at ${o.checkout_url}. It will not be mailed until paid. Track it at ${o.order_url}.`
    : `Order status: ${o.status_detail} Track it at ${o.order_url}.`;
}

function build(client: string | undefined) {
  const server = new McpServer(
    {
      name: "sendpaper",
      title: BRAND,
      version: "1.0.0",
      websiteUrl: BASE_URL,
      description: "Mail real postcards and letters (including USPS Certified Mail) to US addresses from an agent.",
      icons: [
        { src: "https://docs.sendmypaper.com/logo/icon-512.png", mimeType: "image/png", sizes: ["512x512"] },
        { src: `${BASE_URL}/favicon.svg`, mimeType: "image/svg+xml" },
      ],
    },
    { instructions: INSTRUCTIONS },
  );
  // Mirror each tool's title into annotations.title (Anthropic's directory reads it from there). Tool calls are
  // logged in handleMcp, where failures the SDK rejects before the handler runs (invalid input) are visible too.
  const register = server.registerTool.bind(server) as typeof server.registerTool;
  server.registerTool = ((name: string, config: any, cb: any) =>
    register(name, { ...config, annotations: { title: config.title, ...config.annotations } }, cb)) as typeof server.registerTool;

  server.registerTool(
    "get_pricing",
    {
      title: "Get prices",
      description: "List mail products and prices (USD, printing + USPS First-Class postage included, US addresses only).",
      outputSchema: PricingOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () =>
      result({
        products: Object.entries(PRODUCTS).map(([id, p]) => ({ id, ...p, price: `$${(p.cents / 100).toFixed(2)}` })),
        payment: {
          options: ["shared_payment_token via pay_order", "checkout_url (Stripe Checkout, supports Link)"],
          currency: "usd",
          ...(env.stripeNetworkId ? { stripe_network_id: env.stripeNetworkId } : {}),
        },
        first_order_discount: {
          percent: FIRST_ORDER_DISCOUNT_PCT,
          description: OFFER_ACTIVE ? `${OFFER_LINE}: taken off automatically when the order is created, once per return address (any product).` : "No first-order discount right now.",
        },
        letter_photo: {
          amount_cents: COLOR_LETTER_CENTS,
          description: "Added to a letter printed in color: one with content.image_url, or a PDF letter with content.color true.",
        },
        express: {
          amount_cents: EXPRESS_CENTS,
          description: "Added when express is true: USPS Priority Mail, usually 2–3 days, with tracking. Postcards and letters; not with certified.",
        },
        pdf_letters: {
          max_pages: LIMITS.pdfPages,
          description: "create_letter with content.pdf_url (a public https link to a PDF) mails that document instead of body text, at the letter price (or certified). Pages are fitted to 8.5×11; a blank address page is added in front.",
        },
      }),
  );

  server.registerTool(
    "create_postcard",
    {
      title: "Create a postcard",
      description:
        "Create a postcard order (4x6, 6x9 or 6x11) and get a payment link. Front layouts: a big headline on a color, one photo, a photo with a caption, or a collage of 2-4 photos; the back carries the message (handwriting, serif or sans) and addresses. Set express for USPS Priority Mail (2-3 days, tracked). Mails only after the user pays.",
      inputSchema: { ...CreatePostcardSchema.shape, ...toOrRecipients },
      outputSchema: OrderOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async (args) => {
      if (args.recipients) {
        const { recipients } = RecipientsSchema.parse(args);
        const { size, content, ...rest } = CreatePostcardSchema.parse({ ...args, recipients: undefined, to: recipients[0] });
        const g = await createGroupOrders(recipients, (to: Address, _key, batch_id) => createOrder({ ...rest, to, content, batch_id, product: postcardProduct(size), source: "mcp", client }));
        return groupResult(g.batchId, g.orders);
      }
      if (!args.to) return needsAddress;
      const { size, content, ...rest } = CreatePostcardSchema.parse(args);
      const { order } = await createOrder({ ...rest, content, product: postcardProduct(size), source: "mcp", client });
      const o = publicOrder(order);
      return result(o, nextStep(o));
    },
  );

  server.registerTool(
    "create_letter",
    {
      title: "Create a letter",
      description:
        "Create a printed letter order (8.5x11, mailed in a #10 envelope) and get a payment link. Either write it (content.body, up to ~3 pages, optional photo) or mail the user's own PDF (content.pdf_url, a public https link, up to " + LIMITS.pdfPages + " pages). Set certified to \"certified\" for USPS Certified Mail with tracking and proof of delivery, or \"certified_return_receipt\" to add the recipient's signature; use these when the user needs proof (tax notice replies, lease notices, disputes, demand letters). Or set express for USPS Priority Mail (not with certified). Prices: get_pricing. Mails only after the user pays.",
      inputSchema: { ...CreateLetterSchema.shape, ...toOrRecipients },
      outputSchema: OrderOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async (args) => {
      const recipients = args.recipients ? RecipientsSchema.parse(args).recipients : null;
      if (!recipients && !args.to) return needsAddress;
      const { certified, ...input } = CreateLetterSchema.parse(recipients ? { ...args, recipients: undefined, to: recipients[0] } : args);
      let content;
      try {
        content = await prepareLetterContent(input.content);
      } catch (e) {
        if (e instanceof PdfError) return { isError: true, content: [{ type: "text", text: `${e.message} (content.pdf_url)` }] };
        throw e;
      }
      if (recipients) {
        const g = await createGroupOrders(recipients, (to: Address, _key, batch_id) => createOrder({ ...input, to, content, batch_id, product: letterProduct(certified), source: "mcp", client }));
        return groupResult(g.batchId, g.orders);
      }
      const { order } = await createOrder({ ...input, content, product: letterProduct(certified), source: "mcp", client });
      const o = publicOrder(order);
      return result(o, nextStep(o));
    },
  );

  server.registerTool(
    "pay_order",
    {
      title: "Pay for an order",
      description:
        "Pay for an unpaid order with a Stripe shared payment token (spt_…) the user approved, scoped to at least the order amount in USD. For an order created with recipients, this pays for the whole group at once (scope the token to batch.price). On success the order is paid and goes to print. Use only after the user approved the purchase.",
      inputSchema: {
        order_id: z.string().describe("Order id from create_postcard or create_letter, ord_…"),
        shared_payment_token: z.string().describe("Stripe shared payment token, spt_…"),
      },
      outputSchema: OrderOutput,
      // A payment that sends physical mail is irreversible, so it is marked destructive.
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ order_id, shared_payment_token }) => {
      const o = await getOrder(order_id);
      if (!o) return { isError: true, content: [{ type: "text", text: `No order ${order_id}` }] };
      try {
        const paid = publicOrder(await payWithSharedToken(o, shared_payment_token));
        return result(paid, `${paid.status_detail}${o.batch_id ? ` Every unpaid order in group ${o.batch_id} was paid with it.` : ""} Track it at ${paid.order_url}.`);
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
      inputSchema: { order_id: z.string().describe("Order id, ord_…") },
      outputSchema: OrderOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ order_id }) => {
      const o = await getOrder(order_id);
      if (!o) return { isError: true, content: [{ type: "text", text: `No order ${order_id}` }] };
      return result(publicOrder(o));
    },
  );

  server.registerTool(
    "cancel_order",
    {
      title: "Cancel an unpaid order",
      description: "Cancel an order that has not been paid yet. Paid orders can be cancelled by emailing support before they are printed.",
      inputSchema: { order_id: z.string().describe("Order id, ord_…") },
      outputSchema: OrderOutput,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ order_id }) => {
      const o = await getOrder(order_id);
      if (!o) return { isError: true, content: [{ type: "text", text: `No order ${order_id}` }] };
      if (o.status !== "awaiting_payment")
        return { isError: true, content: [{ type: "text", text: `Order is ${o.status}; only unpaid orders can be cancelled here.` }] };
      return result(publicOrder((await setStatus(order_id, "cancelled", "cancelled by customer via MCP"))!));
    },
  );

  return server;
}

// Stateless Streamable HTTP: a fresh server per request, so it scales on any instance with no session store.
// One api_calls row per tools/call: the tool, ok or not, time taken, the agent app, and for failures a short reason.
// Read from the JSON-RPC response itself (JSON response mode), so input-validation errors are counted as well.
function logToolCalls(req: Request, res: Response, client: string | undefined) {
  const calls = (Array.isArray(req.body) ? req.body : [req.body]).filter((m: any) => m?.method === "tools/call");
  if (!calls.length) return;
  const owner = isOwnerRequest(req);
  const start = performance.now();
  const chunks: Buffer[] = [];
  const write = res.write.bind(res), end = res.end.bind(res);
  res.write = ((c: any, ...a: any[]) => { if (c) chunks.push(Buffer.from(c)); return write(c, ...a); }) as typeof res.write;
  res.end = ((c: any, ...a: any[]) => { if (c && typeof c !== "function") chunks.push(Buffer.from(c)); return end(c, ...a); }) as typeof res.end;
  res.on("finish", () => {
    let replies: any[] = [];
    try { const b = JSON.parse(Buffer.concat(chunks).toString("utf8")); replies = Array.isArray(b) ? b : [b]; } catch { /* not JSON */ }
    for (const call of calls) {
      const r = replies.find((x) => x?.id === call.id);
      const text = r?.error?.message ?? (r?.result?.isError ? r.result.content?.[0]?.text : null);
      // The SDK reports invalid tool input as an isError result whose text starts "MCP error -32602"; count it as 422.
      const invalid = r?.error?.code === -32602 || /^MCP error -32602/.test(String(text ?? ""));
      const status = res.statusCode >= 400 ? res.statusCode : invalid ? 422 : r?.error ? 500 : r?.result?.isError ? 400 : 200;
      const sc = r?.result?.structuredContent;
      recordApiCall({
        channel: "mcp",
        endpoint: String(call.params?.name ?? "unknown"),
        status,
        ms: performance.now() - start,
        client: client ?? "unknown",
        error: text ? String(text).slice(0, 200) : null,
        order_id: sc?.batch?.id ?? (typeof sc?.id === "string" ? sc.id : null),
        owner,
      });
    }
  });
}

export async function handleMcp(req: Request, res: Response) {
  const client = req.get("user-agent")?.split(" ")[0];
  logToolCalls(req, res, client);
  const server = build(client);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
