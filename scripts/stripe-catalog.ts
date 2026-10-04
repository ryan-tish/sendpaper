// Create (or update) every Sendpaper product in the Stripe catalog, with one price per product under the lookup
// key `sendpaper_<product id>`. Safe to re-run: existing products are updated, and a new price is created only when
// the amount changed (the lookup key moves to it). Usage:
//   STRIPE_SECRET_KEY=rk_live_… node scripts/stripe-catalog.ts
// The key needs Products: Write and Prices: Write.
import Stripe from "stripe";
import { PRODUCTS, type ProductId } from "../src/config.ts";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("Set STRIPE_SECRET_KEY");
const stripe = new Stripe(key);

for (const [id, p] of Object.entries(PRODUCTS) as [ProductId, (typeof PRODUCTS)[ProductId]][]) {
  const productId = `sendpaper_${id}`;
  const fields = { name: `Sendpaper ${p.name}`, description: `${p.blurb} Printing and postage included. US addresses only.`, metadata: { sendpaper_product: id }, url: "https://sendmypaper.com" };
  let product: Stripe.Product;
  try {
    product = await stripe.products.update(productId, fields);
  } catch {
    product = await stripe.products.create({ id: productId, ...fields });
  }
  const lookup = `sendpaper_${id}`;
  const existing = (await stripe.prices.list({ lookup_keys: [lookup], limit: 1 })).data[0];
  if (existing && existing.unit_amount === p.cents && existing.active) {
    console.log(`${id}: ${product.id} · ${existing.id} $${(p.cents / 100).toFixed(2)} (unchanged)`);
    continue;
  }
  const price = await stripe.prices.create({ product: product.id, currency: "usd", unit_amount: p.cents, lookup_key: lookup, transfer_lookup_key: true, metadata: { sendpaper_product: id } });
  if (!product.default_price || existing) await stripe.products.update(product.id, { default_price: price.id });
  console.log(`${id}: ${product.id} · ${price.id} $${(p.cents / 100).toFixed(2)} (created)`);
}
