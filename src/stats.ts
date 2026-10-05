// First-party analytics for the private /admin/stats dashboard (Ryan, 2026-10-04). PostHog still runs for deeper
// digging; this is the day-to-day view and needs no third party.
// Privacy: no cookies and no stored IPs. A visitor is a hash of IP + user agent + a salt that changes daily, so the
// same person counts once per day and can't be followed across days (the approach Plausible uses).
import { createHash, randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { pool } from "./db.ts";
import { esc } from "./render.ts";

const BOT = /bot|crawl|spider|slurp|preview|fetch|headless|python|curl|wget|httpx|axios|node|go-http|java|monitor|uptime|lighthouse|scan/i;
const SKIP = /^\/(admin|v1|mcp|webhooks|images|healthz|\.well-known|review)(\/|$)|\.(svg|png|jpg|ico|js|css|json|txt|xml|mp4|webmanifest)$|\/preview$/;

let salt = { day: "", value: "" };
function dailySalt() {
  const day = new Date().toISOString().slice(0, 10);
  if (salt.day !== day) salt = { day, value: randomBytes(16).toString("hex") };
  return salt.value;
}

// Order pages carry an id; group them so "top pages" isn't a list of order ids.
const normalize = (path: string) => path.replace(/^\/o\/[^/]+(\/pay)?$/, (_m, pay) => `/o/:id${pay ?? ""}`).slice(0, 200);

function referrerHost(req: Request) {
  const ref = req.get("referer");
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    return host === req.hostname.replace(/^www\./, "") ? null : host.slice(0, 120);
  } catch {
    return null;
  }
}

export function trackViews(req: Request, res: Response, next: NextFunction) {
  const ua = req.get("user-agent") ?? "";
  const owner = /(?:^|;\s*)sp_owner=1/.test(req.get("cookie") ?? "");
  if (!owner && req.method === "GET" && !SKIP.test(req.path) && ua && !BOT.test(ua) && (req.get("accept") ?? "").includes("text/html")) {
    // Only pages that actually rendered (no 404s or redirects).
    res.on("finish", () => {
      if (res.statusCode !== 200) return;
      const visitor = createHash("sha256").update(`${dailySalt()}|${req.ip}|${ua}`).digest("hex").slice(0, 16);
      pool
        .query("INSERT INTO page_views (path, referrer_host, visitor) VALUES ($1, $2, $3)", [normalize(req.path), referrerHost(req), visitor])
        .catch((e) => console.error("page_views", e));
    });
  }
  next();
}

// Agents never load the website, so their tool calls are logged here too.
export function recordToolCall(tool: string, client: string) {
  pool.query("INSERT INTO mcp_calls (tool, client) VALUES ($1, $2)", [tool, client.slice(0, 120)]).catch((e) => console.error("mcp_calls", e));
}

type Day = { day: string; visitors: number; views: number };

async function q<T>(sql: string, params: unknown[] = []) {
  return (await pool.query(sql, params)).rows as T[];
}

const n = (v: unknown) => Number(v ?? 0);
const fmt = (v: number) => v.toLocaleString("en-US");
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–");

// Single-series column chart: one green, 2px gaps, rounded tops anchored to the baseline, a hover tooltip per bar
// (SVG <title>) plus a table view underneath for exact numbers.
function dailyChart(days: Day[]) {
  const W = 960, H = 220, top = 16, bottom = 28, left = 36, right = 8;
  const max = Math.max(1, ...days.map((d) => d.visitors));
  const step = (W - left - right) / days.length;
  const bw = Math.max(2, step - 2);
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);
  const ticks = [0, Math.ceil(max / 2), max];
  const grid = ticks
    .map((t) => `<line x1="${left}" x2="${W - right}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${left - 6}" y="${y(t) + 4}" class="tick" text-anchor="end">${t}</text>`)
    .join("");
  const bars = days
    .map((d, i) => {
      const x = left + i * step + 1, h = H - bottom - y(d.visitors);
      const label = new Date(d.day + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      // Weekly labels, plus the last day when it isn't crowding the previous label.
      const showX = i % 7 === 0 || (i === days.length - 1 && i % 7 >= 3);
      return `<g class="col"><rect x="${x}" y="${top}" width="${bw}" height="${H - top - bottom}" class="hit"><title>${label}: ${d.visitors} visitors, ${d.views} page views</title></rect>
        ${d.visitors ? `<path d="M${x},${H - bottom} v${-(h - 4)} q0,-4 4,-4 h${bw - 8} q4,0 4,4 v${h - 4} z" class="bar"/>` : ""}
        ${showX ? `<text x="${x + bw / 2}" y="${H - 8}" class="tick" text-anchor="middle">${label}</text>` : ""}</g>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily unique visitors, last 30 days" class="chart">${grid}${bars}</svg>`;
}

// Horizontal bars inside a table row, scaled to the largest value in the table.
function barTable(title: string, head: [string, string], rows: { label: string; value: number }[], empty: string) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return `<div class="card stat-table"><h3>${title}</h3>${
    rows.length
      ? `<table><tr><th>${head[0]}</th><th class="num">${head[1]}</th></tr>${rows
          .map((r) => `<tr><td><div class="hbar" style="--w:${(r.value / max) * 100}%"></div><span>${esc(r.label)}</span></td><td class="num">${fmt(r.value)}</td></tr>`)
          .join("")}</table>`
      : `<p class="soft">${empty}</p>`
  }</div>`;
}

export async function statsPage() {
  const [daysRaw, totals, pages, refs, orders, discounts, agents, tools, reviews] = await Promise.all([
    q<{ day: string; visitors: string; views: string }>(`
      SELECT to_char(d, 'YYYY-MM-DD') AS day,
             count(DISTINCT pv.visitor) AS visitors, count(pv.id) AS views
      FROM generate_series((now() AT TIME ZONE 'UTC')::date - 29, (now() AT TIME ZONE 'UTC')::date, '1 day') d
      LEFT JOIN page_views pv ON (pv.at AT TIME ZONE 'UTC')::date = d
      GROUP BY d ORDER BY d`),
    q<{ span: string; visitors: string; views: string }>(`
      SELECT s.span, count(DISTINCT pv.visitor) AS visitors, count(pv.id) AS views
      FROM (VALUES ('today', interval '0 day'), ('7d', interval '6 days'), ('30d', interval '29 days')) s(span, back)
      LEFT JOIN page_views pv ON (pv.at AT TIME ZONE 'UTC')::date >= (now() AT TIME ZONE 'UTC')::date - s.back
      GROUP BY s.span`),
    q<{ path: string; views: string }>(`SELECT path, count(*) AS views FROM page_views WHERE at > now() - interval '30 days' GROUP BY path ORDER BY views DESC LIMIT 10`),
    q<{ host: string; visitors: string }>(`SELECT referrer_host AS host, count(DISTINCT visitor) AS visitors FROM page_views WHERE at > now() - interval '30 days' AND referrer_host IS NOT NULL GROUP BY host ORDER BY visitors DESC LIMIT 10`),
    q<{ source: string; created: string; paid: string; free: string; mailed: string }>(`
      SELECT source, count(*) AS created,
             count(*) FILTER (WHERE status IN ('paid','printing','mailed')) AS paid,
             count(*) FILTER (WHERE free_offer AND status IN ('paid','printing','mailed')) AS free,
             count(*) FILTER (WHERE status = 'mailed') AS mailed
      FROM orders WHERE created_at > now() - interval '30 days' AND NOT is_test GROUP BY source`),
    q<{ used: string; cents: string; pending: string }>(`SELECT count(*) FILTER (WHERE status IN ('paid','printing','mailed')) AS used, coalesce(sum(discount_cents) FILTER (WHERE status IN ('paid','printing','mailed')), 0) AS cents, count(*) FILTER (WHERE status = 'awaiting_payment') AS pending FROM orders WHERE discount_cents > 0 AND NOT is_test`),
    q<{ client: string; calls: string; days: string }>(`SELECT split_part(client, '/', 1) AS client, count(*) AS calls, count(DISTINCT (at AT TIME ZONE 'UTC')::date) AS days FROM mcp_calls WHERE at > now() - interval '30 days' GROUP BY 1 ORDER BY calls DESC LIMIT 10`),
    q<{ tool: string; calls: string }>(`SELECT tool, count(*) AS calls FROM mcp_calls WHERE at > now() - interval '30 days' GROUP BY tool ORDER BY calls DESC`),
    q<{ total: string; pending: string; avg: string }>(`SELECT count(*) AS total, count(*) FILTER (WHERE NOT approved) AS pending, round(avg(rating), 1) AS avg FROM reviews`),
  ]);

  const days: Day[] = daysRaw.map((d) => ({ day: d.day, visitors: n(d.visitors), views: n(d.views) }));
  const span = (s: string) => totals.find((t) => t.span === s) ?? { visitors: 0, views: 0 };
  const sendVisitors = n((await q<{ v: string }>(`SELECT count(DISTINCT visitor) AS v FROM page_views WHERE path = '/send' AND at > now() - interval '30 days'`))[0]?.v);
  const sum = (k: "created" | "paid" | "free" | "mailed") => orders.reduce((a, o) => a + n(o[k]), 0);
  const web = orders.find((o) => o.source === "web");
  const d = discounts[0];
  const r = reviews[0];

  const tile = (label: string, value: string, sub = "") =>
    `<div class="card tile"><span class="eyebrow">${label}</span><b>${value}</b>${sub ? `<span class="soft">${sub}</span>` : ""}</div>`;

  const funnelRow = (label: string, v: number, base: number, note = "") =>
    `<tr><td>${label}</td><td class="num">${fmt(v)}</td><td class="num soft">${note || pct(v, base)}</td></tr>`;

  return `<style>
    .stats { display: grid; gap: 20px; }
    .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
    .tile { gap: 4px; } .tile b { font-size: 1.9rem; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
    .chart { width: 100%; height: auto; display: block; }
    .chart .grid { stroke: var(--rule); stroke-width: 1; }
    .chart .tick { fill: var(--faint); font: 11px var(--f-mono); }
    .chart .bar { fill: var(--green); }
    .chart .hit { fill: transparent; }
    .chart .col:hover .bar { fill: var(--ink); }
    .chart .col:hover .hit { fill: var(--tint); }
    .two { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .stat-table table { width: 100%; border-collapse: collapse; }
    .stat-table td, .stat-table th { padding: 7px 0; border-bottom: 1px solid var(--rule); text-align: left; font-size: .9rem; }
    .stat-table th { color: var(--faint); font-weight: 500; }
    .stat-table td:first-child { position: relative; }
    .stat-table td span { position: relative; padding-left: 8px; }
    .hbar { position: absolute; left: 0; top: 4px; bottom: 4px; width: var(--w); background: var(--green-soft); border-radius: 0 4px 4px 0; }
    .num { text-align: right !important; font-variant-numeric: tabular-nums; }
    .meter { height: 12px; border-radius: 6px; background: var(--tint); border: 1px solid var(--rule); overflow: hidden; }
    .meter i { display: block; height: 100%; width: var(--w); background: var(--green); border-radius: 6px; }
  </style>
  <section class="stats">
    <div><span class="eyebrow">Admin · last 30 days (UTC)</span><h1 style="font-size:clamp(1.9rem,3.6vw,2.6rem)">Stats</h1>
      <p class="soft">Website visitors are counted without cookies (one per person per day); bots are excluded. Agent orders never visit the website, so they're under Agents and Orders. <a href="/admin">Orders</a> · <a href="/admin/reviews">Reviews</a></p></div>
    <div class="tiles">
      ${tile("Visitors today", fmt(n(span("today").visitors)), `${fmt(n(span("today").views))} page views`)}
      ${tile("Visitors, 7 days", fmt(n(span("7d").visitors)), `${fmt(n(span("7d").views))} page views`)}
      ${tile("Visitors, 30 days", fmt(n(span("30d").visitors)), `${fmt(n(span("30d").views))} page views`)}
      ${tile("Orders, 30 days", fmt(sum("created")), `${fmt(sum("paid"))} paid or free · ${fmt(sum("mailed"))} mailed`)}
      ${tile("Agent tool calls", fmt(tools.reduce((a, t) => a + n(t.calls), 0)), `${agents.length} agent${agents.length === 1 ? "" : "s"}`)}
    </div>
    <div class="card"><h3>Daily visitors</h3>${dailyChart(days)}
      <details><summary class="soft">Table view</summary><table class="stat-table" style="width:100%">${days.slice().reverse().map((d) => `<tr><td>${d.day}</td><td class="num">${d.visitors} visitors</td><td class="num">${d.views} views</td></tr>`).join("")}</table></details></div>
    <div class="two">
      ${barTable("Top pages", ["Page", "Views"], pages.map((p) => ({ label: p.path, value: n(p.views) })), "No page views yet.")}
      ${barTable("Where visitors come from", ["Site", "Visitors"], refs.map((x) => ({ label: x.host, value: n(x.visitors) })), "No referrals yet; direct visits don't show here.")}
    </div>
    <div class="two">
      <div class="card stat-table"><h3>Website funnel</h3><table><tr><th>Step</th><th class="num">Count</th><th class="num">Of previous</th></tr>
        ${funnelRow("Visitors", n(span("30d").visitors), 0, "")}
        ${funnelRow("Opened /send", sendVisitors, n(span("30d").visitors))}
        ${funnelRow("Created an order", n(web?.created), sendVisitors)}
        ${funnelRow("Paid or claimed free", n(web?.paid), n(web?.created))}
        ${funnelRow("Mailed", n(web?.mailed), n(web?.paid))}</table></div>
      <div class="card stat-table"><h3>Orders by channel</h3><table><tr><th>Channel</th><th class="num">Created</th><th class="num">Paid</th><th class="num">Free</th><th class="num">Mailed</th></tr>
        ${["web", "mcp", "api"].map((s) => { const o = orders.find((x) => x.source === s); return `<tr><td>${s === "mcp" ? "Agents (MCP)" : s === "api" ? "API" : "Website"}</td><td class="num">${fmt(n(o?.created))}</td><td class="num">${fmt(n(o?.paid) - n(o?.free))}</td><td class="num">${fmt(n(o?.free))}</td><td class="num">${fmt(n(o?.mailed))}</td></tr>`; }).join("")}</table></div>
    </div>
    <div class="two">
      ${barTable("Agents (tool calls)", ["Agent", "Calls"], agents.map((a) => ({ label: `${a.client} · ${a.days} day${n(a.days) === 1 ? "" : "s"} active`, value: n(a.calls) })), "No agent calls yet.")}
      ${barTable("Tools used", ["Tool", "Calls"], tools.map((t) => ({ label: t.tool, value: n(t.calls) })), "No tool calls yet.")}
    </div>
    <div class="two">
      <div class="card" style="gap:6px"><h3>$1 off first order</h3><p><b>${fmt(n(d?.used))}</b> paid orders used it · $${(n(d?.cents) / 100).toFixed(2)} given · ${fmt(n(d?.pending))} unpaid orders carry it</p><p class="soft">The old "First postcard free" orders still show in the Free column above.</p></div>
      <div class="card" style="gap:6px"><h3>Reviews</h3><p><b>${fmt(n(r?.total))}</b> total${n(r?.total) ? ` · average ${r.avg} ★` : ""} · ${fmt(n(r?.pending))} waiting for approval</p><p><a href="/admin/reviews">Review queue →</a></p></div>
    </div>
  </section>`;
}
