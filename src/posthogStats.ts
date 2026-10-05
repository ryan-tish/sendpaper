// Website traffic for /admin/stats, read from PostHog's query API (Ryan, 2026-10-05: "the dashboard should show
// the PostHog numbers"). Needs POSTHOG_PERSONAL_API_KEY (a personal key with Query: Read) on Render; without it, or
// if PostHog errors, the dashboard falls back to the first-party page_views counter and says so.
// Days are UTC, like the rest of the dashboard. Results are cached for 5 minutes.
import { env } from "./config.ts";

const APP = "https://us.posthog.com";

export type WebDay = { day: string; visitors: number; views: number };
export type WebTraffic = {
  days: WebDay[];
  totals: { today: [number, number]; d7: [number, number]; d30: [number, number] };
  pages: { label: string; value: number }[];
  refs: { label: string; value: number }[];
  devices: { label: string; value: number }[];
  countries: { label: string; value: number }[];
  sendVisitors: number;
};

const projectId = env.posthogProjectId;
let cache: { at: number; data: WebTraffic | null } = { at: 0, data: null };

async function hogql(query: string): Promise<unknown[][]> {
  const headers = { Authorization: `Bearer ${env.posthogPersonalKey}`, "Content-Type": "application/json" };
  // "@current" works for the query endpoint with a Query: Read key, while looking the project up needs project:read
  // (verified 2026-10-05: it resolves to project 321902). POSTHOG_PROJECT_ID still wins when set.
  const r = await fetch(`${APP}/api/projects/${projectId || "@current"}/query/`, { method: "POST", headers, body: JSON.stringify({ query: { kind: "HogQLQuery", query } }) });
  if (!r.ok) throw new Error(`PostHog query ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return ((await r.json()) as { results: unknown[][] }).results ?? [];
}

// The PostHog project (321902) is SHARED with older apps (w9-tracker, localhost tests), so count only this site.
const PV = "event = '$pageview' AND properties.$host = 'sendmypaper.com'";
const UTC_DAY = "toDate(toTimeZone(timestamp, 'UTC'))";
const TODAY = "toDate(toTimeZone(now(), 'UTC'))";
const LAST30 = `${PV} AND timestamp > now() - INTERVAL 31 DAY AND ${UTC_DAY} >= ${TODAY} - 29`;
const num = (v: unknown) => Number(v ?? 0);
const rows = (r: unknown[][]) => r.map(([label, value]) => ({ label: String(label ?? "(none)"), value: num(value) }));

export async function webTraffic(): Promise<WebTraffic | null> {
  if (!env.posthogPersonalKey) return null;
  if (Date.now() - cache.at < 5 * 60_000) return cache.data;
  try {
    const [daily, totals, pages, refs, devices, countries, send] = await Promise.all([
      hogql(`SELECT toString(${UTC_DAY}) AS day, count(DISTINCT distinct_id), count() FROM events WHERE ${LAST30} GROUP BY day ORDER BY day`),
      hogql(`SELECT
          uniqIf(distinct_id, ${UTC_DAY} = ${TODAY}), countIf(${UTC_DAY} = ${TODAY}),
          uniqIf(distinct_id, ${UTC_DAY} >= ${TODAY} - 6), countIf(${UTC_DAY} >= ${TODAY} - 6),
          uniq(distinct_id), count()
        FROM events WHERE ${LAST30}`),
      hogql(`SELECT properties.$pathname AS path, count() AS views FROM events WHERE ${LAST30} GROUP BY path ORDER BY views DESC LIMIT 10`),
      hogql(`SELECT properties.$referring_domain AS host, count(DISTINCT distinct_id) AS v FROM events WHERE ${LAST30}
          AND host != '$direct' AND host NOT LIKE '%sendmypaper.com' GROUP BY host ORDER BY v DESC LIMIT 10`),
      hogql(`SELECT properties.$device_type AS d, count(DISTINCT distinct_id) AS v FROM events WHERE ${LAST30} GROUP BY d ORDER BY v DESC LIMIT 6`),
      hogql(`SELECT properties.$geoip_country_name AS c, count(DISTINCT distinct_id) AS v FROM events WHERE ${LAST30} GROUP BY c ORDER BY v DESC LIMIT 10`),
      hogql(`SELECT count(DISTINCT distinct_id) FROM events WHERE ${LAST30} AND (properties.$pathname = '/send' OR properties.$pathname LIKE '/send/%')`),
    ]);
    // Fill the 30 days so the chart has a column for every day, including empty ones.
    const byDay = new Map(daily.map(([d, v, n]) => [String(d), { visitors: num(v), views: num(n) }]));
    const days: WebDay[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      days.push({ day, ...(byDay.get(day) ?? { visitors: 0, views: 0 }) });
    }
    const t = totals[0] ?? [];
    cache = {
      at: Date.now(),
      data: {
        days,
        totals: { today: [num(t[0]), num(t[1])], d7: [num(t[2]), num(t[3])], d30: [num(t[4]), num(t[5])] },
        pages: rows(pages),
        refs: rows(refs),
        devices: rows(devices),
        countries: rows(countries),
        sendVisitors: num(send[0]?.[0]),
      },
    };
  } catch (e) {
    console.error("posthog stats", e);
    cache = { at: Date.now(), data: null };
  }
  return cache.data;
}
