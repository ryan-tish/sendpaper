import pg from "pg";
import { env } from "./config.ts";

const local = /localhost|127\.0\.0\.1/.test(env.databaseUrl);
export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: local ? false : { rejectUnauthorized: false },
  max: 5,
});

// Idempotent schema. Add new columns with ADD COLUMN IF NOT EXISTS, never by editing CREATE TABLE.
export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id               text PRIMARY KEY,
      product          text NOT NULL,
      status           text NOT NULL DEFAULT 'awaiting_payment',
      to_address       jsonb NOT NULL,
      from_address     jsonb NOT NULL,
      content          jsonb NOT NULL,
      price_cents      integer NOT NULL,
      customer_email   text,
      source           text NOT NULL,
      client           text,
      idempotency_key  text UNIQUE,
      stripe_session   text,
      stripe_payment   text,
      operator_note    text,
      events           jsonb NOT NULL DEFAULT '[]',
      created_at       timestamptz NOT NULL DEFAULT now(),
      paid_at          timestamptz,
      mailed_at        timestamptz
    );
    CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status, created_at DESC);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS print_provider text;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS print_id text;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS print_status text;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS print_error text;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS free_offer boolean NOT NULL DEFAULT false;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS analytics_id text;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text;
    -- First-order discount already taken off price_cents (price_cents is always what we charge).
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_cents integer NOT NULL DEFAULT 0;
    -- Express delivery (USPS Priority Mail through PostGrid mailingClass "express"); price_cents includes it.
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS express boolean NOT NULL DEFAULT false;
    -- One design to many people (2026-10-05): every recipient is its own order; a group shares batch_id and one checkout.
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS batch_id text;
    CREATE INDEX IF NOT EXISTS orders_batch_id ON orders (batch_id) WHERE batch_id IS NOT NULL;
    -- Orders created while building and testing Sendpaper (2026-10-01..04); hidden from /admin lists and stats.
    UPDATE orders SET is_test = true WHERE id IN ('ord_tbzmm78n5x6k2pnn','ord_p880an9yghhqjq60','ord_sg875bgv28ke739q',
      'ord_d7n76m5f8dxvpfte','ord_b6rb3v37d2s2ybab','ord_3revxzgtj5v6pyrx','ord_fvkdkwgt2p2bs84b','ord_7rwe3j586rrdh0ew','ord_freh6ghvnq7d5766','ord_mw48fbd0ffr7rq91','ord_4ssq5x555c66gw38','ord_am89desh4kg8q5pt','ord_5019dx9zk68p8qeg') AND NOT is_test;
    -- The 2026-10-03 agent-payment test postcard: Ryan chose not to mail it (2026-10-04). Cancelled, not refunded.
    UPDATE orders SET status = 'cancelled' WHERE id = 'ord_5019dx9zk68p8qeg' AND status = 'paid';

    -- One random salt per UTC day for the cookieless visitor hash (kept in the DB so deploys don't reset it; old days are deleted).
    CREATE TABLE IF NOT EXISTS stats_salts (day date PRIMARY KEY, salt text NOT NULL);
    CREATE TABLE IF NOT EXISTS page_views (
      id             bigserial PRIMARY KEY,
      at             timestamptz NOT NULL DEFAULT now(),
      path           text NOT NULL,
      referrer_host  text,
      visitor        text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS page_views_at_idx ON page_views (at);
    CREATE TABLE IF NOT EXISTS mcp_calls (
      id      bigserial PRIMARY KEY,
      at      timestamptz NOT NULL DEFAULT now(),
      tool    text NOT NULL,
      client  text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mcp_calls_at_idx ON mcp_calls (at);
    -- Every REST API request and agent (MCP) tool call, first-party (2026-10-05): what was called, whether it worked,
    -- how long it took, which app called, and for failures the error type and field paths (never field values or addresses).
    -- Agent tool calls before this table exist only in mcp_calls (tool + client).
    CREATE TABLE IF NOT EXISTS api_calls (
      id        bigserial PRIMARY KEY,
      at        timestamptz NOT NULL DEFAULT now(),
      channel   text NOT NULL,          -- 'api' or 'mcp'
      endpoint  text NOT NULL,          -- 'POST /v1/postcards' or a tool name such as 'create_postcard'
      status    integer NOT NULL,       -- HTTP status; for MCP 200 = ok, 422 = invalid input, 400 = tool error, 500 = server error
      ok        boolean NOT NULL,
      ms        integer NOT NULL,
      client    text NOT NULL,
      error     text,
      order_id  text
    );
    CREATE INDEX IF NOT EXISTS api_calls_at_idx ON api_calls (at);

    CREATE TABLE IF NOT EXISTS reviews (
      id          serial PRIMARY KEY,
      order_id    text NOT NULL UNIQUE REFERENCES orders(id),
      rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
      body        text NOT NULL,
      name        text NOT NULL,
      free_offer  boolean NOT NULL DEFAULT false,
      approved    boolean NOT NULL DEFAULT false,
      created_at  timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS images (
      id          text PRIMARY KEY,
      mime        text NOT NULL,
      bytes       bytea NOT NULL,
      created_at  timestamptz NOT NULL DEFAULT now()
    );
  `);
}
