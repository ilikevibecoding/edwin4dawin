// Headless screenshot harness. Usage: node tools/shots.mjs <iteration> [baseUrl]
// Loads the app, calls window.debugAPI.setView(name) for each view, waits for frames to settle, and
// writes shots/iter_<N>/<view>.jpg plus results.json (per-view stats, interaction / drift / transition
// checks, console log). Environment:
//   SHOT_VIEWS=a,b     only these views            SHOT_ALL=1   every view the app exposes
//   SHOT_QUICK=1       skip drift / interaction / transition passes (spot re-checks)
//   SHOT_PNG=1         PNG instead of JPEG          SHOT_BUILD=1 build to a temp dir and serve it
//                                                   statically (immune to dev-server reloads while editing)
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { resolve, extname, join } from "node:path";
import { execSync } from "node:child_process";
import { createServer } from "node:http";

const iter = process.argv[2] || "0";
let base = process.argv[3] || process.env.SHOT_BASE || "http://127.0.0.1:5173/";
const outDir = resolve("shots", `iter_${iter}`);
mkdirSync(outDir, { recursive: true });
const QUICK = !!process.env.SHOT_QUICK;
const PNG = !!process.env.SHOT_PNG;
const ext = PNG ? "png" : "jpg";

// Optional static build snapshot
let server = null;
if (process.env.SHOT_BUILD) {
  const dist = `/tmp/shot-dist-${process.pid}`;
  execSync(`npx vite build --logLevel warn --outDir ${dist}`, { stdio: "inherit" });
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
  server = createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const file = join(dist, p);
    if (!existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}/`;
  console.log(`serving build snapshot at ${base}`);
}

// The default review set: exterior from every distance, then the interior key views and every room.
const EXTERIOR = ["ext_far", "ext_mid", "ext_close", "ext_tower", "ext_bridgeFace", "ext_belly", "ext_stern", "ext_bow"];
const INTERIOR_KEY = ["bridge", "bridgeAft", "hangarDeck", "hangarWell", "cockpit", "corridor", "quarters", "galley", "room:A-spine", "room:C-spine"];

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(240000); // the build machine is often loaded by parallel workstreams
const logs = [];
page.on("console", (m) => {
  const text = `[${m.type()}] ${m.text()}`;
  if (text.includes("GPU stall") || text.includes("WebSocket") || text.includes("[vite]")) return;
  logs.push(text);
  if (m.type() === "error" || m.type() === "warning") console.log(text.slice(0, 400));
});
page.on("pageerror", (e) => {
  if (e.message.includes("WebSocket")) return;
  logs.push(`[pageerror] ${e.message}`);
  console.log("PAGE ERROR:", e.message);
});

console.log(`loading ${base}`);
const tLoad = Date.now();
await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 240000 });
const readyMs = Date.now() - tLoad;
console.log(`app ready in ${(readyMs / 1000).toFixed(1)} s`);

async function settle(minFrames = 4, minMs = 1200, timeout = 240000) {
  const t0 = Date.now();
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((target) => window.debugAPI.frames() >= target, f0 + minFrames, { timeout });
  const elapsed = Date.now() - t0;
  if (elapsed < minMs) await page.waitForTimeout(minMs - elapsed);
}

await settle(4, 1500, 240000);
const stats0 = await page.evaluate(() => window.debugAPI.getStats());
console.log("warmup stats", JSON.stringify(stats0));

const allViews = await page.evaluate(() => window.debugAPI.views);
let VIEWS;
if (process.env.SHOT_ALL) VIEWS = allViews;
else if (process.env.SHOT_VIEWS) VIEWS = process.env.SHOT_VIEWS.split(",").filter((v) => allViews.includes(v));
else VIEWS = [...EXTERIOR, ...INTERIOR_KEY, ...allViews.filter((v) => v.startsWith("room:") && !INTERIOR_KEY.includes(v))];

const results = { iter, base, readyMs, views: {}, interactions: {}, checks: {}, stats: null, logs: [] };
for (const name of VIEWS) {
  try {
    await page.evaluate((n) => window.debugAPI.setView(n), name);
  } catch (e) {
    console.log(`setView(${name}) failed: ${e.message.split("\n")[0]}`);
    continue;
  }
  await settle(4, 1200);
  const file = resolve(outDir, `${name.replace(":", "_")}.${ext}`);
  await page.screenshot({ path: file, ...(PNG ? {} : { type: "jpeg", quality: 84 }) });
  const stats = await page.evaluate(() => window.debugAPI.getStats());
  results.views[name] = stats;
  console.log(`shot ${name}: ${stats.calls} calls, ${stats.triangles} tris, ${stats.visibleObjects} objs, ${stats.lights} lights, ${stats.frameMs} ms/frame (software GL)`);
}

if (!QUICK) {
  // sky drift: the far field must move while the interior stays put (bridge windows; the legacy
  // wing's side portholes are shuttered now that the wing sits inside the tower)
  await page.evaluate(() => window.debugAPI.setView("bridge"));
  await settle(4, 1200);
  const before = await page.evaluate(() => window.debugAPI.capturePixels(0, 0, 1280, 720));
  await page.evaluate(() => window.debugAPI.advanceSky(2));
  await settle(3, 800);
  const after = await page.evaluate(() => window.debugAPI.capturePixels(0, 0, 1280, 720));
  const region = (x0, y0, x1, y1) => {
    let sum = 0;
    let changed = 0;
    let n = 0;
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
      const i = (y * 1280 + x) * 4;
      const d = Math.abs(before[i] - after[i]) + Math.abs(before[i + 1] - after[i + 1]) + Math.abs(before[i + 2] - after[i + 2]);
      sum += d;
      if (d > 12) changed++;
      n++;
    }
    return { meanAbsDiff: +(sum / n / 3).toFixed(1), changedFraction: +(changed / n).toFixed(2) };
  };
  results.checks.drift = { skyRegion: region(380, 210, 900, 300), interiorControl: region(400, 560, 880, 700) };
  console.log("drift (2 s of sky time):", JSON.stringify(results.checks.drift));
  await page.screenshot({ path: resolve(outDir, `bridge_plus2s.${ext}`), ...(PNG ? {} : { type: "jpeg", quality: 84 }) });

  // legacy interactions still work inside the command deck wing
  for (const id of ["bed", "galley", "bathroom"]) {
    const hovered = await page.evaluate((i) => window.debugAPI.lookAt(i), id);
    await settle(2, 400);
    const prompt = await page.evaluate(() => document.getElementById("prompt").textContent);
    await page.screenshot({ path: resolve(outDir, `prompt_${id}.${ext}`), ...(PNG ? {} : { type: "jpeg", quality: 80 }) });
    await page.evaluate((i) => window.debugAPI.interact(i), id);
    await page.waitForTimeout(id === "bed" ? 5200 : 1600);
    await settle(2, 300);
    const status = await page.evaluate(() => window.debugAPI.status());
    const rest = await page.evaluate(() => window.debugAPI.restLevel());
    results.interactions[id] = { hovered, prompt, status, rest };
    console.log(`interaction ${id}: hovered=${hovered} prompt="${prompt}" status="${status}" rest=${rest}`);
    if (id === "bed") {
      await page.screenshot({ path: resolve(outDir, `rest_cycle_bed.${ext}`), ...(PNG ? {} : { type: "jpeg", quality: 84 }) });
      await page.evaluate(() => window.debugAPI.setRest(0));
    }
  }

  // transitions and lifts (systems, not looks)
  results.checks.systems = await page.evaluate(() => {
    const d = window.debugAPI;
    d.setView("bridge");
    d.exitShip();
    d.advanceSim(6);
    const afterExit = d.mode();
    d.board();
    d.advanceSim(7);
    const afterBoard = { mode: d.mode(), space: d.spaceId() };
    d.setView("room:lift1LobbyB");
    const rode = d.ride("lift1");
    d.advanceSim(20);
    const lift = d.liftState("lift1");
    return { afterExit, afterBoard, lift: { rode, ...lift }, traffic: d.trafficState().counts, doors: d.doors().length };
  });
  console.log("systems:", JSON.stringify(results.checks.systems));
}

results.stats = await page.evaluate(() => window.debugAPI.getStats());
results.logs = logs.slice(-200);
writeFileSync(resolve(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log(`done -> ${outDir}`);
await browser.close();
if (server) server.close();
process.exit(0);
