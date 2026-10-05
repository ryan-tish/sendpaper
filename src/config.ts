// Everything a launch-day change is likely to touch lives here: name, prices, limits.

export const BRAND = process.env.BRAND_NAME ?? "Sendpaper";
export const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
// Mintlify docs site (https://sendpaper.mintlify.site, later docs.sendmypaper.com); unset = built-in /docs page.
export const DOCS_URL = (process.env.DOCS_URL ?? "").replace(/\/$/, "");
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@sendmypaper.com";

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
  // Our Stripe business profile network id (profile_…). Agents scope shared payment tokens to it.
  stripeNetworkId: process.env.STRIPE_NETWORK_ID ?? "",
  // PostGrid print & mail. test_sk_… renders proofs but never mails; live_sk_… PRINTS AND MAILS FOR REAL.
  postgridKey: process.env.POSTGRID_API_KEY ?? "",
  // PostHog project key (public, phc_…). Unset locally so dev traffic never pollutes the numbers.
  posthogKey: process.env.POSTHOG_KEY ?? "",
};

export type ProductId = "postcard_4x6" | "postcard_6x9" | "postcard_6x11" | "letter" | "letter_certified" | "letter_certified_rr";

// Prices include printing, postage (USPS First-Class) and the envelope. US addresses only.
export const PRODUCTS: Record<ProductId, { name: string; cents: number; blurb: string; size: string }> = {
  postcard_4x6: { name: "Postcard 4×6", cents: 299, size: "4 × 6 in", blurb: "Full-color front, your message on the back." },
  postcard_6x9: { name: "Postcard 6×9", cents: 399, size: "6 × 9 in", blurb: "Bigger card, more room for a photo and a note." },
  // 6×11 (Ryan, 2026-10-04): PostGrid's largest postcard ("11x6").
  postcard_6x11: { name: "Postcard 6×11", cents: 599, size: "6 × 11 in", blurb: "Our biggest card: a big photo and a longer note." },
  letter: { name: "Letter", cents: 499, size: "8.5 × 11 in", blurb: "Up to 3 printed pages, folded into a #10 envelope." },
  // Certified Mail (Ryan, 2026-10-04): same letter, sent via USPS Certified Mail through PostGrid's extraService.
  letter_certified: { name: "Certified letter", cents: 1499, size: "8.5 × 11 in", blurb: "USPS Certified Mail: tracking number and proof of mailing and delivery." },
  letter_certified_rr: { name: "Certified letter + return receipt", cents: 1999, size: "8.5 × 11 in", blurb: "USPS Certified Mail with a return receipt: the recipient's signature as proof of delivery." },
};

// Postcard sizes in one place: the API/MCP size name, our product, PostGrid's size name and the trim size in inches
// (landscape, width × height). Print sheets add a 0.125in bleed on every side.
export const POSTCARD_SIZES = {
  "4x6": { product: "postcard_4x6", postgrid: "6x4", w: 6, h: 4 },
  "6x9": { product: "postcard_6x9", postgrid: "9x6", w: 9, h: 6 },
  "6x11": { product: "postcard_6x11", postgrid: "11x6", w: 11, h: 6 },
} as const satisfies Record<string, { product: ProductId; postgrid: string; w: number; h: number }>;
export type PostcardSize = keyof typeof POSTCARD_SIZES;
export const POSTCARD_SIZE_NAMES = Object.keys(POSTCARD_SIZES) as [PostcardSize, ...PostcardSize[]];
export const postcardProduct = (size: string | undefined): ProductId => (POSTCARD_SIZES[size as PostcardSize] ?? POSTCARD_SIZES["4x6"]).product;
export const postcardSpec = (p: ProductId) => Object.values(POSTCARD_SIZES).find((s) => s.product === p) ?? POSTCARD_SIZES["4x6"];

// "$1 off your first order" (Ryan, 2026-10-04; replaced "First postcard free"): any product, once per return address.
export const FIRST_ORDER_DISCOUNT_CENTS = 100;
export const OFFER_LINE = "$1 off your first order";

// Letters can carry one photo (Ryan, 2026-10-04); a letter with a photo prints in color for this surcharge.
export const COLOR_LETTER_CENTS = 100;

// Every letter product shares the letter layout and limits; certified ones add a USPS extra service.
export const isLetter = (p: ProductId) => p === "letter" || p === "letter_certified" || p === "letter_certified_rr";
export const EXTRA_SERVICE: Partial<Record<ProductId, "certified" | "certified_return_receipt">> = {
  letter_certified: "certified",
  letter_certified_rr: "certified_return_receipt",
};
export type Certified = "none" | "certified" | "certified_return_receipt";
export const letterProduct = (c: Certified | undefined): ProductId =>
  c === "certified" ? "letter_certified" : c === "certified_return_receipt" ? "letter_certified_rr" : "letter";

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
