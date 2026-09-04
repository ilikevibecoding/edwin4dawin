// DEV ONLY (Agent B). Screenshot runner for the Deck 1 harness. Like tools/shots.mjs but accepts any view
// name a module registers and never writes into the repo (screenshots stay out of git, §3.9).
//
//   node src/rooms/deck1/_dev/shots.mjs <tag> <baseUrl> [views]
//     views: comma list, "all" (default), or a prefix like "d1-bridge" (all views starting with it)
//   env: SHOT_OUT=/tmp/sd-shots  SHOT_ROOMS=d1-bridge,d1-spine (limits the modules the harness builds)
//        SHOT_WIDTH/SHOT_HEIGHT (default 1280x720)
//
// Runs are serialised with a lock directory (4-CPU VM, software GL): concurrent invocations queue.
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, existsSync, rmSync, statSync } from "node:fs";
import { resolve } from "node:path";

const tag = process.argv[2] || "dev";
let base = process.argv[3] || "http://127.0.0.1:5100/src/rooms/deck1/_dev/harness.html";
const viewArg = process.argv[4] || "all";
const outRoot = process.env.SHOT_OUT || "/tmp/sd-shots";
const outDir = resolve(outRoot, tag);
mkdirSync(outDir, { recursive: true });
if (process.env.SHOT_ROOMS) base += (base.includes("?") ? "&" : "?") + "rooms=" + process.env.SHOT_ROOMS;
const W = +(process.env.SHOT_WIDTH || 1280);
const H = +(process.env.SHOT_HEIGHT || 720);

// --- lock
const lockDir = resolve(outRoot, ".lock");
const t0 = Date.now();
for (;;) {
  try {
    mkdirSync(lockDir);
    break;
  } catch {
    try {
      if (Date.now() - statSync(lockDir).mtimeMs > 15 * 60 * 1000) rmSync(lockDir, { recursive: true, force: true });
    } catch {}
    if (Date.now() - t0 > 20 * 60 * 1000) {
      console.error("gave up waiting for the shots lock");
      process.exit(2);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}
const unlock = () => rmSync(lockDir, { recursive: true, force: true });
process.on("exit", unlock);
process.on("SIGINT", () => process.exit(130));

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/local/bin/google-chrome", "/usr/bin/chromium"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const logs = [];
const errors = [];
page.on("console", (m) => {
  const text = `[${m.type()}] ${m.text()}`;
  logs.push(text);
  if (m.type() === "error" || m.type() === "warning") {
    errors.push(text);
    console.log(text.slice(0, 300));
  }
});
page.on("pageerror", (e) => {
  errors.push(`[pageerror] ${e.message}`);
  console.log("PAGE ERROR:", e.message);
});

console.log(`loading ${base}`);
await page.goto(base, { waitUntil: "load" });
try {
  await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 180000 });
} catch (e) {
  console.error("harness did not become ready:", e.message);
  writeFileSync(resolve(outDir, "results.json"), JSON.stringify({ tag, error: "not ready", logs: logs.slice(-80) }, null, 2));
  await browser.close();
  process.exit(1);
}
const all = await page.evaluate(() => window.debugAPI.views);
const warnings = await page.evaluate(() => window.debugAPI.warnings);
const roomStats = await page.evaluate(() => window.debugAPI.roomStats());
console.log(`ready: ${all.length} views, ${warnings.length} registry warnings`);
for (const w of warnings) console.log("  WARN " + w);
for (const [id, s] of Object.entries(roomStats)) console.log(`  ${id}: ${s.tris} tris, ${s.calls} calls, ${s.descriptors} lights, ${s.colliders} colliders, ${s.buildMs} ms`);

let viewsToShoot;
if (viewArg === "all") viewsToShoot = all;
else if (viewArg.includes(",")) viewsToShoot = viewArg.split(",");
else viewsToShoot = all.filter((v) => v === viewArg || v.startsWith(viewArg));
const unknown = viewsToShoot.filter((v) => !all.includes(v));
if (unknown.length) console.log("unknown views:", unknown.join(", "));
viewsToShoot = viewsToShoot.filter((v) => all.includes(v));

async function settle(minFrames = 4, minMs = 1500, timeout = 120000) {
  const s = Date.now();
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((target) => window.debugAPI.frames() >= target, f0 + minFrames, { timeout });
  const el = Date.now() - s;
  if (el < minMs) await page.waitForTimeout(minMs - el);
}
await settle(3, 1500, 180000);

const results = { tag, base, warnings, rooms: roomStats, views: {}, errors: [] };
for (const name of viewsToShoot) {
  const ok = await page.evaluate((n) => {
    try {
      return window.debugAPI.setView(n);
    } catch (e) {
      return "ERR " + e.message;
    }
  }, name);
  if (ok !== true) {
    console.log(`view ${name}: ${ok}`);
    continue;
  }
  await settle(4, 1500);
  await page.screenshot({ path: resolve(outDir, `${name}.png`) });
  const stats = await page.evaluate(() => window.debugAPI.getStats());
  results.views[name] = stats;
  console.log(`shot ${name}: ${stats.calls} calls, ${stats.triangles} tris, ${stats.lights} pool lights (${stats.descriptors} desc, ${stats.lightsDropped} dropped), ${stats.frameMs} ms/frame (software GL), active=${stats.active.join("+")}`);
}
results.errors = errors.slice(0, 60);
writeFileSync(resolve(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log(`done -> ${outDir} (${Object.keys(results.views).length} views, ${warnings.length} warnings, ${errors.length} console errors/warnings)`);
await browser.close();
