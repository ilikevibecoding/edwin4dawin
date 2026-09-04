// Headless screenshot harness. Usage: node tools/shots.mjs <iteration> [baseUrl]
// Loads the app, calls window.debugAPI.setView(name) for each view, waits for frames to settle and
// writes shots/iter_<N>/<view>.png plus results.json with per-view render stats.
//
//   SHOT_VIEWS=a,b,c   only these views (names from debugAPI.views: kestrel views, room:<id>, ext_*)
//   SHOT_SET=kestrel|rooms|exterior|all   view family (default all)
//   SHOT_QUICK=1       skip the drift / interaction / navigation passes
//   SHOT_SIZE=1280x720 viewport
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const iter = process.argv[2] || "0";
const base = process.argv[3] || "http://127.0.0.1:5173/";
const outDir = resolve("shots", `iter_${iter}`);
mkdirSync(outDir, { recursive: true });
const QUICK = !!process.env.SHOT_QUICK;
const [VW, VH] = (process.env.SHOT_SIZE || "1280x720").split("x").map(Number);

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/local/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
const logs = [];
page.on("console", (m) => {
  const text = `[${m.type()}] ${m.text()}`;
  if (text.includes("GL Driver Message")) return;
  logs.push(text);
  if (m.type() === "error" || m.type() === "warning") console.log(text.slice(0, 400));
});
page.on("pageerror", (e) => {
  logs.push(`[pageerror] ${e.message}`);
  console.log("PAGE ERROR:", e.message);
});

console.log(`loading ${base}`);
const tLoad = Date.now();
await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 300000 });
console.log(`app ready in ${((Date.now() - tLoad) / 1000).toFixed(1)} s`);

async function settle(minFrames = 3, minMs = 800, timeout = 240000) {
  const t0 = Date.now();
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((target) => window.debugAPI.frames() >= target, f0 + minFrames, { timeout });
  const elapsed = Date.now() - t0;
  if (elapsed < minMs) await page.waitForTimeout(minMs - elapsed);
}

const allViews = await page.evaluate(() => window.debugAPI.views);
const family = process.env.SHOT_SET || "all";
let views = allViews.filter((v) => {
  if (family === "kestrel") return !v.startsWith("room:") && !v.startsWith("ext_");
  if (family === "rooms") return v.startsWith("room:");
  if (family === "exterior") return v.startsWith("ext_");
  return true;
});
if (process.env.SHOT_VIEWS) {
  // named views, plus free cameras: cam:<label>:x,y,z:lx,ly,lz[:fov[:i]]  (":i" = interior cell logic)
  const only = process.env.SHOT_VIEWS.split(",").map((s) => s.trim());
  views = only.filter((v) => allViews.includes(v) || v.startsWith("cam:"));
}
async function applyView(name) {
  if (name.startsWith("cam:")) {
    const [, label, p, l, fov, mode] = name.split(":");
    const pos = p.split("/").map(Number);
    const look = l.split("/").map(Number);
    await page.evaluate(([pos, look, fov, interior]) => window.debugAPI.setCamera(pos, look, fov, interior), [pos, look, fov ? +fov : 60, mode === "i"]);
    return label;
  }
  await page.evaluate((n) => window.debugAPI.setView(n), name);
  return name.replace(":", "_");
}
// lift cars are not worth a frame each
views = views.filter((v) => !v.startsWith("room:lift_"));

// warm up (shader compile + env capture)
await page.evaluate(() => window.debugAPI.setView("room:bridge"));
await settle(3, 1000, 300000);
const stats0 = await page.evaluate(() => window.debugAPI.getStats());
console.log("warmup stats", JSON.stringify(stats0));

const results = { iter, views: {}, checks: {}, stats: null, logs: [] };
for (const name of views) {
  const label = await applyView(name);
  await settle(3, 600);
  const file = resolve(outDir, `${label}.png`);
  await page.screenshot({ path: file });
  const stats = await page.evaluate(() => window.debugAPI.getStats());
  results.views[name] = stats;
  console.log(`shot ${name}: ${stats.calls} calls, ${(stats.triangles / 1000).toFixed(0)}k tris, ${stats.poolLights} lights, cells ${stats.visibleCells}, ${stats.frameMs} ms/frame (software GL)`);
}

if (!QUICK) {
  // --- doors: walk from the bridge spawn toward the aft door; it must open before we reach it
  {
    await page.evaluate(() => window.debugAPI.teleport("bridge"));
    const r = await page.evaluate(() => {
      const api = window.debugAPI;
      const a = api.doorNear(6);
      api.simulate(1.2, ["KeyS"]);
      const b = api.doorNear(6);
      return { before: a, after: b, pos: api.player.position.toArray() };
    });
    results.checks.doorOpensOnApproach = r;
    console.log("door approach:", JSON.stringify(r));
  }
  // --- navigation: bridge -> lobby -> corridor via walking (through two doors)
  {
    const r = await page.evaluate(() => {
      const api = window.debugAPI;
      api.teleport("bridge");
      const out = [];
      out.push(api.simulate(2.0, ["KeyS"]));
      out.push(api.simulate(4.5, ["KeyS"]));
      out.push(api.simulate(6.0, ["KeyS"]));
      return out;
    });
    results.checks.walkBridgeToCorridor = r;
    console.log("walk:", JSON.stringify(r));
  }
  // --- turbolift: from lobby A ride to deck C
  {
    const r = await page.evaluate(async () => {
      const api = window.debugAPI;
      api.teleport("lobby_a");
      // face the L1 lift door (on the S wall at x=-9.5) and walk in
      api.player.setPose(-9.5, 253 + 3.5, 180, 0, 246);
      api.simulate(2.5, ["KeyW"]);
      const inCar = api.simulate(1.5, []);
      const doors = api.doorNear(5);
      const picked = api.liftSelect("C");
      // ride
      api.simulate(6.0, []);
      const state = api.liftState();
      return { inCar, doors, picked, state, cell: api.cellInfo().current, pos: api.player.position.toArray().map((v) => +v.toFixed(1)) };
    });
    results.checks.turbolift = r;
    console.log("turbolift:", JSON.stringify(r));
  }
  // --- exterior transition round trip
  {
    await page.evaluate(() => window.debugAPI.teleport("bridge"));
    const r = await page.evaluate(async () => {
      const api = window.debugAPI;
      const t0 = performance.now();
      await api.toExterior();
      const out = api.cameraState();
      await api.toInterior();
      const back = api.cameraState();
      return { out, back, ms: Math.round(performance.now() - t0) };
    });
    results.checks.transitionRoundTrip = r;
    console.log("transition:", JSON.stringify(r));
  }
  // --- Kestrel interactions still work
  for (const id of ["bed", "galley", "bathroom"]) {
    const hovered = await page.evaluate((i) => window.debugAPI.lookAt(i), id);
    await page.evaluate(() => window.debugAPI.pressE());
    const expected = { bed: /slept/, galley: /Energy restored/, bathroom: /Refreshed/ }[id];
    const t0 = Date.now();
    let status = "";
    while (Date.now() - t0 < 12000) {
      await page.waitForTimeout(300);
      status = await page.evaluate(() => window.debugAPI.status());
      const busy = await page.evaluate(() => window.debugAPI.fadeOpacity() > 0.01);
      if (!busy && expected.test(status)) break;
    }
    results.checks[`interaction_${id}`] = { hovered, status, ok: expected.test(status) };
    console.log(`interaction ${id}: hovered=${hovered} status="${status}"`);
    if (id === "bed") await page.evaluate(() => window.debugAPI.setRest(0));
  }
}

results.stats = await page.evaluate(() => window.debugAPI.getStats());
results.buildLog = await page.evaluate(() => window.debugAPI.buildLog());
results.logs = logs.filter((l) => !l.startsWith("[log]")).slice(0, 80);
writeFileSync(resolve(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log("done ->", outDir);
await browser.close();
