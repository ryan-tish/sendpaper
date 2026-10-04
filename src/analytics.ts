// Product analytics in PostHog (US Cloud). The browser script covers the website; these server-side events cover
// what the website can't see, chiefly agent traffic over /mcp and order milestones. No-op unless POSTHOG_KEY is set.
import { env } from "./config.ts";

export const POSTHOG_HOST = "https://us.i.posthog.com";

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
if (!location.pathname.startsWith("/admin")) {
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  posthog.init(${JSON.stringify(env.posthogKey)}, { api_host: ${JSON.stringify(POSTHOG_HOST)}, person_profiles: "identified_only", persistence: "localStorage", disable_session_recording: true });
}
</script>`;
}
