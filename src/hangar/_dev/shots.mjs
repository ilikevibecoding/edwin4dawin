// DEV ONLY (Agent D). Screenshot harness for the Deck 4 dev page. Same protocol as tools/shots.mjs but
// accepts any view name a module registers and writes OUTSIDE the repo (no screenshots in git).
//
//   node src/hangar/_dev/shots.mjs <tag> http://127.0.0.1:<port>/src/hangar/_dev/harness.html
//   SHOT_VIEWS=a,b     only these views (default: every registered view)
//   SHOT_ADVANCE=12    advance the frozen module clock by N seconds after each setView (animation states)
//   SHOT_OUT=/tmp/x    output directory (default /tmp/sd-shots/<tag>)
//
// Always run under `flock /tmp/sd-shots.lock` — one Chrome at a time on this 4-CPU software-GL VM.
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const tag = process.argv[2] || "dev";
const base = process.argv[3] || "http://127.0.0.1:5173/src/hangar/_dev/harness.html";
const outDir = process.env.SHOT_OUT || resolve("/tmp/sd-shots", tag);
mkdirSync(outDir, { recursive: true });
const only = process.env.SHOT_VIEWS ? process.env.SHOT_VIEWS.split(",").map((s) => s.trim()).filter(Boolean) : null;
const advance = process.env.SHOT_ADVANCE ? parseFloat(process.env.SHOT_ADVANCE) : 0;

const executablePath = ["/usr/local/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const logs = [];
page.on("console", (m) => {
  const text = `[${m.type()}] ${m.text()}`;
  logs.push(text);
  if (m.type() === "error" || m.type() === "warning") console.log(text.slice(0, 600));
});
page.on("pageerror", (e) => {
  logs.push(`[pageerror] ${e.message}`);
  console.log("PAGE ERROR:", e.message);
});

// Six people edit this tree at once: keep Vite's HMR client out of the page so their saves cannot
// reload it mid-shoot (the page still gets fresh modules on every load).
await page.route("**/@vite/client", (r) => r.abort());

console.log(`loading ${base}`);
const tLoad = Date.now();
await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 180000 });
const loadMs = Date.now() - tLoad;
console.log(`app ready in ${loadMs} ms`);

async function settle(minFrames = 4, minMs = 1500, timeout = 120000) {
  const t0 = Date.now();
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((target) => window.debugAPI.frames() >= target, f0 + minFrames, { timeout });
  const elapsed = Date.now() - t0;
  if (elapsed < minMs) await page.waitForTimeout(minMs - elapsed);
}

await settle(3, 1500, 180000);
const warnings = await page.evaluate(() => window.debugAPI.warnings());
const modules = await page.evaluate(() => window.debugAPI.modules());
const allViews = await page.evaluate(() => window.debugAPI.views);
console.log(`${modules.length} modules, ${warnings.length} registry warnings, ${allViews.length} views`);
for (const w of warnings) console.log("  WARN " + w);
for (const m of modules) console.log(`  ${m.id.padEnd(20)} ${String(m.buildMs).padStart(7)} ms  ${String(m.kitMeshes).padStart(3)} meshes ${String(m.tris).padStart(8)} tris ${String(m.lights).padStart(3)} lights ${String(m.colliders).padStart(4)} colliders`);

const views = only ? allViews.filter((v) => only.includes(v)) : allViews;
const missing = only ? only.filter((v) => !allViews.includes(v)) : [];
if (missing.length) console.log("unknown views ignored: " + missing.join(", "));

const results = { tag, base, loadMs, warnings, modules, views: {}, logs: [] };
for (const name of views) {
  await page.evaluate((n) => window.debugAPI.setView(n), name);
  if (advance) await page.evaluate((s) => window.debugAPI.advance(s), advance);
  await settle(4, 1500);
  const file = resolve(outDir, `${name}.png`);
  await page.screenshot({ path: file });
  const stats = await page.evaluate(() => window.debugAPI.getStats());
  results.views[name] = stats;
  console.log(`shot ${name}: ${stats.calls} calls, ${stats.triangles} tris, ${stats.lights} pool lights, room ${stats.room}, active [${stats.activeRooms.join(",")}], ${stats.frameMs} ms/frame (software GL)`);
}

results.logs = logs.filter((l) => !l.startsWith("[log]")).slice(0, 80);
writeFileSync(resolve(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log("done ->", outDir);
await browser.close();
