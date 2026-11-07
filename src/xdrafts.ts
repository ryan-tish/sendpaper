import { timingSafeEqual } from "node:crypto";
import express, { Router, type NextFunction, type Request, type Response } from "express";
import { pool } from "./db.ts";

// X reply drafts (2026-11-07). A scheduled job in Ryan's private Saffron app (src/x/job.ts, a Render cron) writes
// draft replies to tweets into this database's x_runs / x_tweets tables (it owns their schema). Saffron itself runs
// on Ryan's Mac and this database accepts no outside connections, so Saffron reads and updates drafts through here.
//
// Its own bearer token (X_DRAFTS_TOKEN), not ADMIN_TOKEN, so the Mac never holds the admin password. Without the
// env var the routes don't exist. Nothing here posts to X; Ryan posts every reply himself.
export const xdrafts = Router();

const TOKEN = process.env.X_DRAFTS_TOKEN ?? "";
const LIST = new Set(["draft", "posted", "dismissed", "skipped"]);
const RYAN = new Set(["draft", "posted", "dismissed"]);

function auth(req: Request, res: Response, next: NextFunction) {
  const got = (req.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const ok = TOKEN.length >= 32 && got.length === TOKEN.length && timingSafeEqual(Buffer.from(got), Buffer.from(TOKEN));
  if (ok) return next();
  res.status(TOKEN ? 401 : 404).json({ error: TOKEN ? "unauthorized" : "not_found" });
}
xdrafts.use(auth);
xdrafts.use(express.json({ limit: "16kb" }));

// The job creates the tables on its first run; until then there is nothing to show.
const missingTable = (e: unknown) => (e as { code?: string }).code === "42P01";

xdrafts.get("/", async (req, res) => {
  const status = typeof req.query.status === "string" && LIST.has(req.query.status) ? req.query.status : "draft";
  const order = status === "draft"
    ? "run_id DESC NULLS LAST, (kind = 'need') DESC, (kind = 'helpful') DESC, views DESC"
    : "coalesce(decided_at, seen_at) DESC";
  try {
    const [rows, counts, runs] = await Promise.all([
      pool.query(`SELECT * FROM x_tweets WHERE status = $1 ORDER BY ${order} LIMIT 300`, [status]),
      pool.query(`
        SELECT count(*) FILTER (WHERE status = 'draft')::int     AS draft,
               count(*) FILTER (WHERE status = 'posted')::int    AS posted,
               count(*) FILTER (WHERE status = 'dismissed')::int AS dismissed,
               count(*) FILTER (WHERE status = 'skipped')::int   AS skipped,
               count(*) FILTER (WHERE status = 'posted' AND decided_at > now() - interval '24 hours')::int AS posted_today,
               count(*) FILTER (WHERE status = 'posted' AND decided_at > now() - interval '7 days')::int  AS posted_week
        FROM x_tweets`),
      pool.query(`SELECT * FROM x_runs ORDER BY id DESC LIMIT 12`),
    ]);
    res.json({ status, rows: rows.rows, counts: counts.rows[0], runs: runs.rows });
  } catch (e) {
    if (missingTable(e)) return res.json({ status, rows: [], counts: { draft: 0, posted: 0, dismissed: 0, skipped: 0, posted_today: 0, posted_week: 0 }, runs: [] });
    throw e;
  }
});

// Ryan's side only: posted / dismissed / back to draft, and his edits to a reply.
xdrafts.post("/:id", async (req, res) => {
  const { status, reply } = (req.body ?? {}) as { status?: unknown; reply?: unknown };
  if (status !== undefined && (typeof status !== "string" || !RYAN.has(status))) return res.status(400).json({ error: "status must be draft, posted or dismissed" });
  if (reply !== undefined && typeof reply !== "string") return res.status(400).json({ error: "reply must be a string" });
  const id = String(req.params.id);
  if (typeof reply === "string") await pool.query(`UPDATE x_tweets SET reply = $2, edited = true WHERE id = $1`, [id, reply.slice(0, 1000)]);
  if (typeof status === "string") await pool.query(`UPDATE x_tweets SET status = $2, decided_at = CASE WHEN $2 = 'draft' THEN NULL ELSE now() END WHERE id = $1`, [id, status]);
  const { rows } = await pool.query(`SELECT * FROM x_tweets WHERE id = $1`, [id]);
  if (!rows[0]) return res.status(404).json({ error: "no such tweet" });
  res.json({ ok: true, row: rows[0] });
});

// Daily original posts (2026-11-07): x_posts, also written by Saffron's job. `seen` rows (e.g. old articles) never show.
const POST_LIST = new Set(["draft", "posted", "dismissed"]);
xdrafts.get("/posts", async (req, res) => {
  const status = typeof req.query.status === "string" && POST_LIST.has(req.query.status) ? req.query.status : "draft";
  try {
    const [rows, counts] = await Promise.all([
      pool.query(`SELECT *, day::text AS day FROM x_posts WHERE status = $1 ORDER BY ${status === "draft" ? "x_posts.day DESC, x_posts.id" : "coalesce(decided_at, created_at) DESC"} LIMIT 200`, [status]),
      pool.query(`SELECT count(*) FILTER (WHERE status = 'draft')::int AS draft,
                         count(*) FILTER (WHERE status = 'posted')::int AS posted,
                         count(*) FILTER (WHERE status = 'dismissed')::int AS dismissed FROM x_posts`),
    ]);
    res.json({ status, rows: rows.rows, counts: counts.rows[0] });
  } catch (e) {
    if (missingTable(e)) return res.json({ status, rows: [], counts: { draft: 0, posted: 0, dismissed: 0 } });
    throw e;
  }
});

xdrafts.post("/posts/:id", async (req, res) => {
  const { status, text } = (req.body ?? {}) as { status?: unknown; text?: unknown };
  if (status !== undefined && (typeof status !== "string" || !RYAN.has(status))) return res.status(400).json({ error: "status must be draft, posted or dismissed" });
  if (text !== undefined && typeof text !== "string") return res.status(400).json({ error: "text must be a string" });
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: "no such post" });
  if (typeof text === "string") await pool.query(`UPDATE x_posts SET text = $2, edited = true WHERE id = $1 AND status <> 'seen'`, [id, text.slice(0, 1000)]);
  if (typeof status === "string") await pool.query(`UPDATE x_posts SET status = $2, decided_at = CASE WHEN $2 = 'draft' THEN NULL ELSE now() END WHERE id = $1 AND status <> 'seen'`, [id, status]);
  const { rows } = await pool.query(`SELECT * FROM x_posts WHERE id = $1 AND status <> 'seen'`, [id]);
  if (!rows[0]) return res.status(404).json({ error: "no such post" });
  res.json({ ok: true, row: rows[0] });
});
