// Quick check: load the app, report console errors, then screenshot the named views with stats.
// Usage: node tools/check.mjs [--base http://127.0.0.1:5174/] [--out /tmp/check] [--all] view1 view2 ...
// Views are debugAPI view names (see `node tools/check.mjs --list`). JPEG output, 1280x720.
import { chromium } from "playwright-core";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const base = opt("--base", process.env.SHOT_BASE || "http://127.0.0.1:5174/");
const outDir = opt("--out", "/tmp/check");
const list = args.includes("--list");
const all = args.includes("--all");
const width = +opt("--w", 1280);
const height = +opt("--h", 720);
const views = args.filter((a) => !a.startsWith("--"));
mkdirSync(outDir, { recursive: true });

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => {
  const text = m.text();
  if (text.includes("WebSocket") || text.includes("[vite]")) return;
  if (m.type() === "error" || m.type() === "warning") {
    errors.push(`[${m.type()}] ${text.slice(0, 300)}`);
    console.log(`[${m.type()}] ${text.slice(0, 300)}`);
  }
});
let fatal = false;
page.on("pageerror", (e) => {
  if (e.message.includes("WebSocket")) return;
  errors.push("[pageerror] " + e.message);
  console.log("PAGE ERROR:", e.message, e.stack ? e.stack.split("\n").slice(0, 4).join("\n") : "");
  fatal = true;
});

const t0 = Date.now();
await page.goto(base, { waitUntil: "load" });
try {
  // fail fast when the app throws during construction
  await Promise.race([
    page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 240000 }),
    (async () => {
      while (!fatal) await new Promise((r) => setTimeout(r, 500));
      await new Promise((r) => setTimeout(r, 3000));
      const ok = await page.evaluate(() => !!(window.debugAPI && window.debugAPI.ready)).catch(() => false);
      if (!ok) throw new Error("page error before ready");
    })(),
  ]);
} catch (e) {
  console.log("app did not become ready:", e.message.split("\n")[0]);
  await page.screenshot({ path: resolve(outDir, "not_ready.jpg"), type: "jpeg", quality: 80 });
  await browser.close();
  process.exit(1);
}
console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

async function settle(minFrames = 3, minMs = 800) {
  const start = Date.now();
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((target) => window.debugAPI.frames() >= target, f0 + minFrames, { timeout: 240000 });
  const el = Date.now() - start;
  if (el < minMs) await page.waitForTimeout(minMs - el);
}
await settle(3, 500);
const names = await page.evaluate(() => window.debugAPI.views);
if (list) {
  console.log(names.join("\n"));
  await browser.close();
  process.exit(0);
}
const wanted = all ? names : views;
const results = {};
for (const name of wanted) {
  if (!names.includes(name)) {
    console.log("unknown view", name);
    continue;
  }
  try {
    await page.evaluate((n) => window.debugAPI.setView(n), name);
  } catch (e) {
    console.log("setView failed for", name, e.message.split("\n")[0]);
    continue;
  }
  const tSet = Date.now();
  await settle(3, 400);
  const tSettle = Date.now();
  const file = resolve(outDir, `${name.replace(":", "_")}.jpg`);
  await page.screenshot({ path: file, type: "jpeg", quality: 82 });
  const tShot = Date.now();
  const stats = await page.evaluate(() => window.debugAPI.getStats());
  if (process.env.CHECK_TIMING) console.log(`  timing: settle ${((tSettle - tSet) / 1000).toFixed(1)} s, screenshot ${((tShot - tSettle) / 1000).toFixed(1)} s`);
  results[name] = stats;
  console.log(`${name}: ${stats.calls} calls, ${(stats.triangles / 1000).toFixed(0)}k tris, ${stats.visibleObjects} objs, ${stats.lights} lights, tex ${stats.textureMemMB} MB, js ${stats.jsMs} ms -> ${file}`);
}
writeFileSync(resolve(outDir, "stats.json"), JSON.stringify({ errors, results }, null, 1));
console.log(errors.length ? `${errors.length} console errors/warnings` : "no console errors");
await browser.close();
process.exit(0);
