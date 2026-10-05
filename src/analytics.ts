// Product analytics in PostHog (US Cloud). The browser script covers the website; these server-side events cover
// what the website can't see, chiefly agent traffic over /mcp and order milestones. No-op unless POSTHOG_KEY is set.
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
// and never on /admin.
export function analyticsSnippet() {
  if (!env.posthogKey) return "";
  return `<script>
if (!location.pathname.startsWith("/admin") && !/(^|; *)sp_owner=1/.test(document.cookie)) {
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  posthog.init(${JSON.stringify(env.posthogKey)}, { api_host: "/ingest", ui_host: "https://us.posthog.com", person_profiles: "identified_only", persistence: "localStorage", disable_session_recording: true });
}
</script>`;
}
