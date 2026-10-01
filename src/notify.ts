import { BASE_URL, BRAND, PRODUCTS, env } from "./config.ts";
import type { OrderRow } from "./orders.ts";

// Emails the operator when an order is paid. Optional: without RESEND_API_KEY it only logs,
// and paid orders are still visible in /admin.
export async function notifyPaid(o: OrderRow) {
  const line = `PAID ${o.id} ${PRODUCTS[o.product].name} $${(o.price_cents / 100).toFixed(2)} → ${o.to_address.name}, ${o.to_address.city} ${o.to_address.state} (via ${o.source}${o.client ? `/${o.client}` : ""})`;
  console.log(line);
  if (!env.resendKey || !env.notifyEmail) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.notifyFrom,
      to: [env.notifyEmail],
      subject: `${BRAND}: new paid order ${o.id}`,
      html: `<table><tr><td style="font-family:Arial,sans-serif;font-size:14px">${line}<br><br>
        <a href="${BASE_URL}/admin/orders/${o.id}">Open in admin</a> ·
        <a href="${BASE_URL}/admin/orders/${o.id}/print">Print sheet</a></td></tr></table>`,
    }),
  });
  if (!res.ok) console.error("resend", res.status, await res.text());
}
