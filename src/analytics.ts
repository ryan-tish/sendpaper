// Product analytics in PostHog (US Cloud). The browser script covers the website; these server-side events cover
// what the website can't see, chiefly agent traffic over /mcp and order milestones. No-op unless POSTHOG_KEY is set.
import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { env } from "./config.ts";

export const POSTHOG_HOST = "https://us.i.posthog.com";
const POSTHOG_ASSETS = "https://us-assets.i.posthog.com";

// Reverse proxy (Ryan, 2026-10-05): the browser sends events to sendmypaper.com/ingest/* and we forward them to
// PostHog, so ad blockers that block posthog.com don't silently drop 10-25% of visits. Same data, same privacy
// settings (no cookies, no recordings); disclosed in the privacy policy. The visitor's IP is passed on in
// X-Forwarded-For so PostHog's country lookup still works (otherwise every visit would geolocate to Render).
export async function posthogProxy(req: Request, res: Response) {
  const path = req.originalUrl.replace(/^\/ingest/, "") || "/";
  const target = (path.startsWith("/static/") || path.startsWith("/array/") ? POSTHOG_ASSETS : POSTHOG_HOST) + path;
  const headers: Record<string, string> = { "X-Forwarded-For": req.ip ?? "" };
  for (const h of ["content-type", "content-encoding", "user-agent", "accept"]) {
    const v = req.get(h);
    if (v) headers[h] = v;
  }
  try {
    const hasBody = req.method !== "GET" && req.method !== "HEAD" && Buffer.isBuffer(req.body) && req.body.length > 0;
    const r = await fetch(target, { method: req.method, headers, body: hasBody ? req.body : undefined });
    // fetch already decoded the body, so don't forward content-encoding/length.
    res.status(r.status);
    for (const h of ["content-type", "cache-control"]) {
      const v = r.headers.get(h);
      if (v) res.set(h, v);
    }
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error("posthog proxy", e);
    res.status(502).end();
  }
}

export function track(event: string, distinctId: string, properties: Record<string, unknown> = {}) {
  if (!env.posthogKey) return;
  fetch(`${POSTHOG_HOST}/i/v0/e/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: env.posthogKey, event, distinct_id: distinctId, properties: { ...properties, $lib: "sendpaper-server" } }),
  }).catch((e) => console.error("posthog", e));
}

// The website snippet: no cookies (localStorage only), no session recording (order pages show addresses),
// no surveys (unused; their 48 KB script loaded on every page, Lighthouse 2026-11-09), and never on /admin.
export function analyticsSnippet() {
  if (!env.posthogKey) return "";
  return `<script>
if (!location.pathname.startsWith("/admin") && !/(^|; *)sp_owner=1/.test(document.cookie)) {
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  posthog.init(${JSON.stringify(env.posthogKey)}, { api_host: "/ingest", ui_host: "https://us.posthog.com", person_profiles: "identified_only", persistence: "localStorage", disable_session_recording: true, disable_surveys: true });
}
</script>`;
}

// OpenAI (ChatGPT) ads measurement pixel (2026-11-22). Only visitors who clicked one of our ChatGPT ads ever load
// OpenAI's script. The click lands with ?oppref=<click code> (ChatGPT adds it); that page view loads the pixel,
// which keeps the code in a first-party cookie (__oppref, 30 days) and reports a page_viewed. Organic visitors never
// load it, so the privacy policy's "no ad tracking unless you came from an ad" holds.
// The purchase is reported from a hidden same-origin iframe at /ad-conversion, NOT from the order page: the SDK sends
// origin+pathname with every event, and an order path (/o/<id>) opens that order's names and addresses. The iframe's
// path has no id, its amount and event id ride in the #fragment (never sent anywhere), and the event id is a hash.
// Keep "automatic advanced matching" OFF in Ads Manager: it hashes form fields (names, ZIPs) and the privacy policy
// says no names or addresses go to OpenAI. NOTE: no backslashes in these strings (TS template literals, see Traps).
const OAIQ_LOADER = `(function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var js=d.createElement(s);js.async=true;js.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(js,f)})(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");`;

export function adLandingSnippet() {
  if (!env.openaiPixelId) return "";
  return `<script>try{if(new URLSearchParams(location.search).get("oppref")){${OAIQ_LOADER}oaiq("init",{pixelId:${JSON.stringify(env.openaiPixelId)}});oaiq("measure","page_viewed",{type:"contents"})}}catch(e){}</script>`;
}

// For the order/group page reached back from Stripe Checkout: a hidden iframe that reports the purchase, only when
// the browser carries the __oppref cookie (it came from an ad). `key` is the order or group id, hashed here.
export function adConversionFrame(cookieHeader: string | undefined, key: string, cents: number) {
  if (!env.openaiPixelId || !/(?:^|;\s*)__oppref=[^;]/.test(cookieHeader ?? "")) return "";
  const e = createHash("sha256").update(key).digest("hex").slice(0, 32);
  return `<iframe src="/ad-conversion#e=${e}&amp;a=${Math.round(cents)}" hidden title="" referrerpolicy="no-referrer" style="display:none"></iframe>`;
}

// GET /ad-conversion: static (the fragment carries the data), so it can be cached.
export function adConversionPage() {
  const run = env.openaiPixelId
    ? `try{var h=new URLSearchParams(location.hash.slice(1)),e=h.get("e")||"",a=Number(h.get("a"));if(/^[a-f0-9]{32}$/.test(e)&&Number.isInteger(a)&&a>0&&a<10000000&&document.cookie.indexOf("__oppref=")>=0){${OAIQ_LOADER}oaiq("init",{pixelId:${JSON.stringify(env.openaiPixelId)}});oaiq("measure","order_created",{type:"contents",amount:a,currency:"USD"},{event_id:"sp_"+e})}}catch(x){}`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Sendpaper</title><script>${run}</script></head><body></body></html>`;
}
