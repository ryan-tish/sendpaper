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

    CREATE TABLE IF NOT EXISTS images (
      id          text PRIMARY KEY,
      mime        text NOT NULL,
      bytes       bytea NOT NULL,
      created_at  timestamptz NOT NULL DEFAULT now()
    );
  `);
}
