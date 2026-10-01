// Everything a launch-day change is likely to touch lives here: name, prices, limits.

export const BRAND = process.env.BRAND_NAME ?? "Sendpaper";
export const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
// Mintlify docs site once connected (e.g. https://docs.sendpaper.co); until then the built-in /docs page.
export const DOCS_URL = (process.env.DOCS_URL ?? "").replace(/\/$/, "");
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "hello@sendpaper.co";

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://localhost:5432/sendpaper",
  stripeSecret: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  adminToken: process.env.ADMIN_TOKEN ?? "",
  // Optional: email the operator when an order is paid. Without it, paid orders only show in /admin.
  resendKey: process.env.RESEND_API_KEY ?? "",
  notifyEmail: process.env.NOTIFY_EMAIL ?? "",
  notifyFrom: process.env.NOTIFY_FROM ?? "Sendpaper <onboarding@resend.dev>",
};

export type ProductId = "postcard_4x6" | "postcard_6x9" | "letter";

// Prices include printing, postage (USPS First-Class) and the envelope. US addresses only.
export const PRODUCTS: Record<ProductId, { name: string; cents: number; blurb: string; size: string }> = {
  postcard_4x6: { name: "Postcard 4×6", cents: 299, size: "4 × 6 in", blurb: "Full-color front, your message on the back." },
  postcard_6x9: { name: "Postcard 6×9", cents: 399, size: "6 × 9 in", blurb: "Bigger card, more room for a photo and a note." },
  letter: { name: "Letter", cents: 499, size: "8.5 × 11 in", blurb: "Up to 3 printed pages, folded into a #10 envelope." },
};

export const LIMITS = {
  postcardMessage: 600,
  postcardHeadline: 60,
  letterBody: 9000, // roughly 3 single-spaced pages
  imageBytes: 6 * 1024 * 1024,
};

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA",
  "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR",
  "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "PR", "VI", "GU", "AS", "MP",
  "AA", "AE", "AP",
];
