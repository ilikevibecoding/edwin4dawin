// Headless screenshot harness. Usage: node tools/shots.mjs <iteration> [baseUrl]
// Loads the app, calls window.debugAPI.setView(name) for each view, waits for frames to
// settle, and writes shots/iter_<N>/<view>.png. Also exercises the interactions and records stats.
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const iter = process.argv[2] || "0";
const base = process.argv[3] || "http://127.0.0.1:5173/";
const outDir = resolve("shots", `iter_${iter}`);
mkdirSync(outDir, { recursive: true });

const VIEWS = ["cockpit", "corridor", "quarters", "window"];
const EXTRA = ["windshield", "galley", "bathroom", "aft"];

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader-webgl",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--enable-webgl",
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
  ],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const logs = [];
page.on("console", (m) => {
  const text = `[${m.type()}] ${m.text()}`;
  logs.push(text);
  if (m.type() === "error" || m.type() === "warning") console.log(text.slice(0, 400));
});
page.on("pageerror", (e) => {
  logs.push(`[pageerror] ${e.message}`);
  console.log("PAGE ERROR:", e.message);
});

console.log(`loading ${base}`);
await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 120000 });
console.log("app ready");

async function settle(minFrames = 4, minMs = 2000, timeout = 90000) {
  const t0 = Date.now();
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((target) => window.debugAPI.frames() >= target, f0 + minFrames, { timeout });
  const elapsed = Date.now() - t0;
  if (elapsed < minMs) await page.waitForTimeout(minMs - elapsed);
}

// let the scene warm up (shader compile + env capture)
await settle(4, 2000, 180000);
const stats0 = await page.evaluate(() => window.debugAPI.getStats());
console.log("warmup stats", JSON.stringify(stats0));

const results = { iter, views: {}, interactions: {}, stats: null, logs: [] };
for (const name of [...VIEWS, ...EXTRA]) {
  await page.evaluate((n) => window.debugAPI.setView(n), name);
  await settle(4, 2000);
  const file = resolve(outDir, `${name}.png`);
  await page.screenshot({ path: file });
  const stats = await page.evaluate(() => window.debugAPI.getStats());
  results.views[name] = stats;
  console.log(`shot ${name}: ${stats.calls} calls, ${stats.triangles} tris, ${stats.frameMs} ms/frame (software GL)`);
}

// --- motion check: the sky must visibly drift. Compare the porthole interior between two frames whose
// sky time differs by 2 s (interior static, grain frozen). A wall patch is captured as a control.
{
  await page.evaluate(() => window.debugAPI.setView("window"));
  await settle(3, 1000);
  const sky = { x: 562, y: 294, w: 200, h: 200 }; // porthole interior at 1280x720
  const wall = { x: 40, y: 560, w: 120, h: 120 }; // static interior control
  const grab = (r) => page.evaluate((rr) => window.debugAPI.capturePixels(rr.x, rr.y, rr.w, rr.h), r);
  const a = await grab(sky);
  const aw = await grab(wall);
  await page.evaluate(() => window.debugAPI.advanceSky(2));
  await settle(3, 500);
  await page.screenshot({ path: resolve(outDir, "window_plus2s.png") });
  const b = await grab(sky);
  const bw = await grab(wall);
  const diff = (p, q) => {
    let sum = 0;
    let changed = 0;
    const n = p.length / 4;
    for (let i = 0; i < p.length; i += 4) {
      const d = Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]);
      sum += d;
      if (d > 30) changed++;
    }
    return { meanAbsDiff: +(sum / n / 3).toFixed(2), changedFraction: +(changed / n).toFixed(3) };
  };
  results.drift = { skyRegion: diff(a, b), interiorControl: diff(aw, bw) };
  console.log("drift (2 s of sky time):", JSON.stringify(results.drift));
}

// --- interaction checks: prompt appears when looking at each interactable, action fires, status updates
for (const id of ["bed", "galley", "bathroom"]) {
  const hovered = await page.evaluate((i) => window.debugAPI.lookAt(i), id);
  await settle(2, 800);
  await page.screenshot({ path: resolve(outDir, `prompt_${id}.png`) });
  const promptText = await page.evaluate(() => document.getElementById("prompt").textContent);
  const promptVisible = await page.evaluate(() => !document.getElementById("prompt").classList.contains("hidden"));
  await page.evaluate(() => window.debugAPI.pressE());
  // capture mid-fade state for bed / bathroom
  if (id !== "galley") {
    await page.waitForTimeout(id === "bed" ? 1500 : 1100);
    await page.screenshot({ path: resolve(outDir, `fade_${id}.png`) });
  }
  const expected = { bed: /slept/, galley: /Energy restored/, bathroom: /Refreshed/ }[id];
  const t0 = Date.now();
  let status = "";
  while (Date.now() - t0 < 12000) {
    await page.waitForTimeout(300);
    status = await page.evaluate(() => window.debugAPI.status());
    const busy = await page.evaluate(() => window.debugAPI.fadeOpacity() > 0.01);
    if (!busy && expected.test(status)) break;
  }
  if (id === "bed") {
    await settle(3, 1500);
    await page.screenshot({ path: resolve(outDir, `rest_cycle_${id}.png`) });
  }
  const restLevel = await page.evaluate(() => window.debugAPI.restLevel());
  results.interactions[id] = { hovered, promptVisible, promptText, status, restLevel };
  console.log(`interaction ${id}: hovered=${hovered} prompt="${promptText}" status="${status}" rest=${restLevel}`);
  if (id === "bed") await page.evaluate(() => window.debugAPI.setRest(0));
}

results.stats = await page.evaluate(() => window.debugAPI.getStats());
results.logs = logs.filter((l) => !l.startsWith("[log]")).slice(0, 50);
writeFileSync(resolve(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log("done ->", outDir);
await browser.close();
