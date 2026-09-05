// Rubric screenshot harness for the ISD Vigilance. Usage: node tools/shots.mjs <iteration> [baseUrl]
// Captures every exterior station and interior view through window.debugAPI, records per-view stats,
// measures sky drift through the bridge windows, exercises a door, a turbolift ride and a TIE launch,
// and writes shots/sd_iter_<N>/results.json.
//   SHOT_VIEWS=a,b   limit to these views      SHOT_QUICK=1  skip the dynamic passes
//   SHOT_W / SHOT_H  viewport (default 1280x720)
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const iter = process.argv[2] || "0";
const base = process.argv[3] || "http://127.0.0.1:5173/";
const outDir = resolve("shots", `sd_iter_${iter}`);
mkdirSync(outDir, { recursive: true });
const W = +(process.env.SHOT_W || 1280);
const H = +(process.env.SHOT_H || 720);
const QUICK = !!process.env.SHOT_QUICK;
const only = process.env.SHOT_VIEWS ? process.env.SHOT_VIEWS.split(",") : null;

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.setDefaultTimeout(240000);
const logs = [];
page.on("console", (m) => {
  const text = `[${m.type()}] ${m.text()}`;
  if (/GPU stall|ReadPixels|toNonIndexed/.test(text)) return;
  logs.push(text);
  if (m.type() === "error") console.log(text.slice(0, 400));
});
page.on("pageerror", (e) => {
  logs.push(`[pageerror] ${e.message}`);
  console.log("PAGE ERROR:", e.message);
});

console.log(`loading ${base}`);
const tLoad = Date.now();
await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 240000 });
const loadMs = Date.now() - tLoad;
console.log(`app ready in ${loadMs} ms`);

async function settle(minFrames = 4, minMs = 1500, timeout = 180000) {
  const t0 = Date.now();
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((target) => window.debugAPI.frames() >= target, f0 + minFrames, { timeout });
  const elapsed = Date.now() - t0;
  if (elapsed < minMs) await page.waitForTimeout(minMs - elapsed);
}
await settle(3, 1000, 240000);

const allViews = await page.evaluate(() => window.debugAPI.views);
const VIEWS = only ? allViews.filter((v) => only.includes(v)) : allViews;
const results = { iter, loadMs, viewport: [W, H], views: {}, dynamic: {}, logs: [] };

for (const name of VIEWS) {
  const t1 = Date.now();
  try {
    await page.evaluate((n) => window.debugAPI.setView(n), name);
  } catch (e) {
    console.log(`view ${name} failed: ${e.message.slice(0, 200)}`);
    results.views[name] = { error: e.message.slice(0, 200) };
    continue;
  }
  await settle(4, 1200);
  try {
    await page.screenshot({ path: resolve(outDir, `${name}.png`), timeout: 240000 });
  } catch (e) {
    console.log(`screenshot ${name} failed: ${e.message.slice(0, 120)}`);
  }
  const stats = await page.evaluate(() => window.debugAPI.getStats());
  results.views[name] = stats;
  console.log(`${name.padEnd(18)} ${String(stats.calls).padStart(4)} calls ${String((stats.triangles / 1000).toFixed(0)).padStart(5)}k tris ${String(stats.lights).padStart(3)} lights ${String(stats.visibleObjects).padStart(4)} objs  ${stats.frameMs} ms/frame (sw GL)  [${Date.now() - t1} ms]`);
}

if (!QUICK) {
  // --- sky drift through the bridge windows: compare a window region 3 s of sky time apart against a console control
  {
    await page.evaluate(() => window.debugAPI.setView("bridge_window"));
    await settle(3, 800);
    const sky = { x: Math.round(W * 0.42), y: Math.round(H * 0.12), w: Math.round(W * 0.16), h: Math.round(H * 0.16) };
    const wall = { x: Math.round(W * 0.05), y: Math.round(H * 0.8), w: Math.round(W * 0.1), h: Math.round(H * 0.12) };
    const grab = (r) => page.evaluate((rr) => window.debugAPI.capturePixels(rr.x, rr.y, rr.w, rr.h), r);
    const a = await grab(sky);
    const aw = await grab(wall);
    await page.evaluate(() => window.debugAPI.advanceSky(3));
    await settle(3, 500);
    await page.screenshot({ path: resolve(outDir, "bridge_window_plus3s.png") });
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
    results.dynamic.drift = { skyRegion: diff(a, b), interiorControl: diff(aw, bw) };
    console.log("drift (3 s sky):", JSON.stringify(results.dynamic.drift));
  }
  // --- door: walk from the bridge corridor to the bridge blast door and capture it opening
  {
    const r = await page.evaluate(async () => {
      await window.debugAPI.teleport("d1_corridor");
      const a = window.debugAPI.walkTo(0, 628.6, 8); // 3.4 m in front of the blast door (world z = 640-14.8+3.4)
      // freeze the leaves a third of the way open for a legible capture
      const door = window.debugAPI.interior.decks[0].doors.find((d) => d.def.b === "d1_bridge");
      door.manual = true; // proximity logic off: the leaves settle at target and stay there
      door.openness = 0.3;
      door.target = 0.35;
      door.update(0.2, window.debugAPI.player.position, true);
      const doors = window.debugAPI.doors().filter((d) => d.name.includes("d1_bridge"));
      window.debugAPI.player.frozen = true;
      window.debugAPI.player.pitch = -0.05;
      return { walked: a.reached, doors };
    });
    await settle(3, 800);
    await page.screenshot({ path: resolve(outDir, "door_opening.png") });
    results.dynamic.door = r;
    console.log("door:", JSON.stringify(r.doors));
  }
  // --- turbolift ride: capture inside the cab mid-ride and after arrival
  {
    const r = await page.evaluate(async () => {
      await window.debugAPI.teleport("d1_lift");
      window.debugAPI.player.yaw = Math.PI;
      const started = window.debugAPI.lift("hangar");
      window.debugAPI.advance(2.0); // mid-ride: the sign reads PASSING DECK 3, not ARRIVING
      return { started, state: window.debugAPI.liftState() };
    });
    await settle(3, 600);
    await page.screenshot({ path: resolve(outDir, "lift_moving.png") });
    const r2 = await page.evaluate(() => {
      let t = 0;
      while (t < 15 && window.debugAPI.liftState() !== "idle") {
        window.debugAPI.advance(0.5);
        t += 0.5;
      }
      window.debugAPI.player.frozen = true;
      return { seconds: t, current: window.debugAPI.current() };
    });
    await settle(3, 600);
    await page.screenshot({ path: resolve(outDir, "lift_arrived.png") });
    results.dynamic.lift = { ...r, ...r2 };
    console.log("lift:", JSON.stringify({ started: r.started, midState: r.state, arrived: r2.current && r2.current.id }));
  }
  // --- TIE launch: open the bay and step the traffic until a fighter is mid-descent inside the bay
  // (interior capture from the entry), then until it has cleared the hull (exterior capture)
  {
    const r = await page.evaluate(async () => {
      const api = window.debugAPI;
      // break on the OLDEST launcher entering the throat: the two behind it (3 s and 6 s later) are
      // then still taxiing over the lane, so the frame holds three craft instead of one
      const oldest = () => api.trafficSnapshot().fighters.filter((f) => f.s === "launching").sort((x, y) => y.st - x.st)[0] || null;
      api.requestLaunch(3);
      let f = null;
      let steps = 0;
      // deck is at world y -30; the flight is visible between the racks (y ≈ -8) and the well (y ≈ -34)
      for (; steps < 600; steps++) {
        api.advanceTraffic(0.1, 0.05);
        f = oldest();
        if (f && f.p[1] < -20 && f.p[1] > -33 && f.st > 0.5) break;
      }
      await api.setView("d5_hangar@0,-40,0,6");
      return { counts: api.trafficCounts(), bay: api.trafficSnapshot().bay, first: f, stepped: steps * 0.1 };
    });
    await settle(3, 800);
    await page.screenshot({ path: resolve(outDir, "tie_launch_interior.png") });
    const r2 = await page.evaluate(async () => {
      const api = window.debugAPI;
      const youngest = () => api.trafficSnapshot().fighters.filter((f) => f.s === "launching").sort((x, y) => x.st - y.st)[0] || null;
      let f = null;
      let steps = 0;
      // below the hangar module (bottom at y -46) but still close under the hull
      for (; steps < 600; steps++) {
        api.advanceTraffic(0.1, 0.05);
        f = youngest();
        if (f && f.p[1] < -62 && f.p[1] > -160) break;
      }
      // frame the craft from ~70 m below and beside it, looking back up at the bay
      if (f) await api.setView(`ext@${f.p[0] - 45},${f.p[1] - 45},${f.p[2] + 35},${f.p[0]},${f.p[1]},${f.p[2]}`);
      else await api.setView("exterior_hangar");
      return { outside: f, stepped: steps * 0.1 };
    });
    r.outside = r2.outside;
    r.steppedOutside = r2.stepped;
    await settle(3, 800);
    await page.screenshot({ path: resolve(outDir, "tie_launch_exterior.png") });
    results.dynamic.traffic = r;
    console.log("traffic:", JSON.stringify(r.counts), "bay", r.bay, "inside", JSON.stringify(r.first && r.first.p), "outside", JSON.stringify(r.outside && r.outside.p));
  }
  // --- exterior ↔ interior transition round trip
  {
    const r = await page.evaluate(async () => {
      const api = window.debugAPI;
      await api.setView("bridge_aft");
      const m0 = api.mode();
      const p0 = api.player.position.toArray();
      await api.toExterior();
      const m1 = api.mode();
      const cam = api.director.camera.position.toArray().map((v) => +v.toFixed(1));
      await api.toInterior();
      const m2 = api.mode();
      const p2 = api.player.position.toArray();
      return { m0, m1, cam, m2, samePlace: Math.hypot(p0[0] - p2[0], p0[2] - p2[2]) < 0.01, sector: api.current().id };
    });
    results.dynamic.transition = r;
    console.log("transition:", JSON.stringify(r));
  }
  results.dynamic.reserved = await page.evaluate(() => window.debugAPI.reserved());
  results.dynamic.audio = await page.evaluate(() => window.debugAPI.audioLog().slice(-10));
}

results.finalStats = await page.evaluate(() => window.debugAPI.getStats());
results.logs = logs.slice(0, 60);
writeFileSync(resolve(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log("done ->", outDir);
await browser.close();
