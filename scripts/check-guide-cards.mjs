// Checks every /guides card thumbnail at 19 viewport widths (320-1920px) in headless Chrome over CDP (no puppeteer):
// the big label must stay inside its column, never touch the mock, never split a word; mock text must not overflow.
// Added 2026-11-13 after "Sendpaper vs. LetterStream" ran under the mock on desktop.
//   node scripts/check-guide-cards.mjs http://localhost:3077/guides            # exits 1 on any problem
//   node scripts/check-guide-cards.mjs <url> --stress    # also swaps in longer future labels/rival names
//   node scripts/check-guide-cards.mjs <url> --shots     # PNGs at 390/768/1024/1440 into the temp dir it prints
// Needs Google Chrome at the macOS default path. On this Mac run it with env -u NODE_EXTRA_CA_CERTS -u SSL_CERT_FILE.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.argv[2];
if (!url?.startsWith("http")) { console.error("usage: node scripts/check-guide-cards.mjs <url of /guides> [--stress] [--shots]"); process.exit(2); }
const outdir = mkdtempSync(join(tmpdir(), "guide-cards-"));
const SHOTS = process.argv.includes("--shots");
const STRESS = process.argv.includes("--stress");
mkdirSync(outdir, { recursive: true });
const WIDTHS = [320, 360, 390, 430, 560, 640, 641, 720, 768, 820, 900, 980, 981, 1024, 1100, 1280, 1440, 1680, 1920];
const SHOT_WIDTHS = [390, 768, 1024, 1440];

const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--remote-debugging-port=9333", `--user-data-dir=${outdir}/.chrome`, "--no-first-run", "--hide-scrollbars", "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ver;
for (let i = 0; i < 50; i++) { try { ver = await (await fetch("http://127.0.0.1:9333/json/version")).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map(); const events = [];
ws.addEventListener("message", (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else events.push(d); });
const send = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);
await s("Page.enable");

// Stress labels: realistic future labels (queue.md) plus deliberately long words.
const STRESS_LABELS = ["Sendpaper vs. Certified Mail Labels", "Sendpaper vs. Click2Mail", "Sendpaper vs. MyPostcard", "First-Class Mail Times", "Write to Congress", "Certified Not Signed", "Thank-You Cards", "Timeshare Rescission"];
const STRESS_RIVALS = ["Certified Mail Labels", "Click2Mail", "MyPostcard", "LetterStream", "Touchnote", "Stamps.com"];

const MEASURE = `(async (stress) => {
  await document.fonts.ready;
  const cards = [...document.querySelectorAll('.gcard')];
  if (stress) {
    const L = ${JSON.stringify(STRESS_LABELS)}, R = ${JSON.stringify(STRESS_RIVALS)};
    cards.forEach((c, i) => { c.querySelector('.tl').textContent = L[i % L.length]; const mk = c.querySelector('.vs .mk:not(.us)'); if (mk) mk.textContent = R[i % R.length]; });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }
  const textRect = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
  const out = [];
  for (const c of cards) {
    const thumb = c.querySelector('.thumb'), tl = c.querySelector('.tl'), mock = thumb.querySelector('.stack, .mock');
    const t = thumb.getBoundingClientRect(), col = tl.getBoundingClientRect(), txt = textRect(tl), m = mock.getBoundingClientRect();
    const p = [];
    if (txt.right > col.right + 0.5) p.push('label runs ' + Math.round(txt.right - col.right) + 'px past its column');
    if (txt.right > m.left - 4 && txt.top < m.bottom && txt.bottom > m.top) p.push('label touches the mock');
    if (txt.top < t.top || txt.bottom > t.bottom) p.push('label taller than the thumb');
    if (m.right > t.right + 0.5 || m.left < t.left - 0.5 || m.top < t.top - 0.5 || m.bottom > t.bottom + 0.5) p.push('mock spills out of the thumb');
    for (const el of mock.querySelectorAll('.mk, .bub, .tool, .trk span, .pdf, .pc-msg')) {
      const r = textRect(el), box = el.getBoundingClientRect();
      if (r.right > box.right + 0.5 || r.right > m.right + 0.5) p.push('mock text "' + el.textContent.trim().slice(0, 24) + '" overflows');
    }
    // A word split across two lines (overflow-wrap safety net kicked in) counts as a failure too.
    const split = (el) => { const bad = []; const tn = [...el.childNodes].find(n => n.nodeType === 3); if (!tn) return bad;
      const re = /[^ ]+/g; let mm; while ((mm = re.exec(tn.data))) { const r = document.createRange(); r.setStart(tn, mm.index); r.setEnd(tn, mm.index + mm[0].length);
        const tops = new Set([...r.getClientRects()].map(x => Math.round(x.top))); if (tops.size > 1) bad.push(mm[0]); } return bad; };
    for (const w of split(tl)) p.push('label word "' + w + '" split across lines');
    for (const el of mock.querySelectorAll('.mk')) for (const w of split(el)) p.push('mock word "' + w + '" split across lines');
    out.push({ href: c.getAttribute('href'), label: tl.textContent, fontPx: parseFloat(getComputedStyle(tl).fontSize), thumbW: Math.round(t.width), problems: p });
  }
  return out;
})(${STRESS})`;

const report = [];
for (const w of WIDTHS) {
  const mobile = w < 600;
  await s("Emulation.setDeviceMetricsOverride", { width: w, height: 900, deviceScaleFactor: 2, mobile });
  await s("Page.navigate", { url });
  for (let i = 0; i < 100 && !events.some((e) => e.method === "Page.loadEventFired"); i++) await sleep(50);
  events.length = 0;
  await sleep(300);
  const r = await s("Runtime.evaluate", { expression: MEASURE, awaitPromise: true, returnByValue: true });
  const rows = r.result.result.value;
  if (!rows) { console.log(w, JSON.stringify(r.result)); continue; }
  const bad = rows.filter((x) => x.problems.length);
  const sizes = [...new Set(rows.map((x) => x.fontPx))];
  console.log(`${String(w).padStart(5)}px  thumb ${rows[0]?.thumbW}px  label font ${sizes.join("/")}px  ${bad.length ? "FAIL" : "ok"}`);
  for (const b of bad) console.log(`        ${b.label}: ${b.problems.join("; ")}`);
  report.push({ w, rows });
  if (SHOTS && SHOT_WIDTHS.includes(w)) {
    const { result: { cssContentSize } } = await s("Page.getLayoutMetrics");
    const shot = await s("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: Math.min(cssContentSize.height, 2600), scale: 1 } });
    writeFileSync(`${outdir}/guides-${w}${STRESS ? "-stress" : ""}.png`, Buffer.from(shot.result.data, "base64"));
  }
}
writeFileSync(`${outdir}/report${STRESS ? "-stress" : ""}.json`, JSON.stringify(report, null, 1));
ws.close(); chrome.kill();
const failed = report.some((r) => r.rows.some((x) => x.problems.length));
console.log(failed ? "FAIL" : `OK: every card fits at ${WIDTHS.length} widths${STRESS ? " (stress labels)" : ""}${SHOTS ? `; screenshots in ${outdir}` : ""}`);
process.exit(failed ? 1 : 0);
