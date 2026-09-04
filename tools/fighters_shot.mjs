// Fighter screenshot tool (workstream FIGHTERS). Usage: node tools/fighters_shot.mjs <tag> [baseUrl]
// Loads the app, then for each view either places the free camera at a docked / parked fighter or steps the
// traffic simulation (debugAPI.traffic.update) until a fighter reaches a phase of interest and frames it.
// Writes shots/fighters_<tag>/<view>.png and results.json (render stats per view).
//
//   FS_VIEWS=front,quarter,...   subset of views (default all)
//   FS_DIM=0.08                  scale the assigned pool lights (the placeholder hangar shell is blinding; the
//                                dim only affects this tool's frames, never the app)
//   SHOT_SIZE=1280x720
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const tag = process.argv[2] || "0";
const base = process.argv[3] || "http://127.0.0.1:5185/";
const outDir = resolve("shots", `fighters_${tag}`);
mkdirSync(outDir, { recursive: true });
const [VW, VH] = (process.env.SHOT_SIZE || "1280x720").split("x").map(Number);
const DIM = process.env.FS_DIM ? +process.env.FS_DIM : 0.08;

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
await page.goto(base, { waitUntil: "load", timeout: 180000 });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 300000 });
console.log("app ready");

async function settle(minFrames = 3, timeout = 240000) {
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((target) => window.debugAPI.frames() >= target, f0 + minFrames, { timeout });
}
async function dimLights() {
  await page.evaluate((dim) => {
    const pool = window.debugAPI.cells.pool;
    for (const s of [...pool.points, ...pool.spots]) {
      const l = s.light;
      if (l.userData.dimmed) continue;
      l.userData.dimmed = true;
      l.intensity *= dim;
      l.userData.baseIntensity = (l.userData.baseIntensity || 0) * dim;
    }
    // declared specs too, so re-assignment after a cell change stays dim
    for (const cell of window.debugAPI.cells.cells.values()) for (const l of cell.lights) if (!l.dimmed) { l.dimmed = true; l.intensity *= dim; }
  }, DIM);
}

// In-page helpers -------------------------------------------------------------------------------
const helpers = () => {
  const api = window.debugAPI;
  const tr = api.traffic;
  if (!tr.__update) tr.__update = tr.update;
  return {
    api,
    tr,
    /** Stop the app's frame loop from advancing the traffic (main.js calls traffic.update through the object). */
    freeze() {
      tr.update = () => {};
    },
    thaw() {
      tr.update = tr.__update;
    },
    /** Step the traffic until pred(fighter) holds for some fighter; returns that fighter's id or -1. */
    advanceUntil(pred, maxSeconds = 400, dt = 1 / 30) {
      let t = tr.getState().t || 0;
      for (let i = 0; i < maxSeconds / dt; i++) {
        t += dt;
        tr.__update(dt, t, api.rig.camera);
        for (const f of tr.fighters) if (pred(f)) return f.id;
      }
      return -1;
    },
  };
};
await page.evaluate(`window.__fh = (${helpers.toString()})`);

// Views -----------------------------------------------------------------------------------------
// Docked fighter #2 hangs in slot 2: (-50, -5.8, -93.8), nose toward +x. Parked fighter #21 sits at (-44, -36.1, 35), nose -x.
const F = [-50, -5.8, -93.8];
const VIEWS = {
  hangar: { kind: "view", name: "room:hangar" },
  front: { kind: "cam", pos: [-37, -5.2, -93.8], look: F, fov: 50 },
  quarter: { kind: "cam", pos: [-39.5, -2.2, -84.5], look: [-50, -6, -93], fov: 50 },
  rear_low: { kind: "cam", pos: [-60.5, -9.5, -85.5], look: [-50, -6, -93.8], fov: 55 },
  // the parked fighter's near wing face (nose -x, wings at z = 35 ± 3.3), nothing between camera and wing
  wing: { kind: "cam", pos: [-41, -33.6, 21.5], look: [-44, -36.1, 31.7], fov: 50 },
  parked: { kind: "cam", pos: [-30, -33.5, 24], look: [-44, -36.1, 35], fov: 55 },
  row: { kind: "cam", pos: [-30, -12, -45], look: [-50, -6, -95], fov: 60 },
  descend: { kind: "sim", pred: "f.phase === 'descend' && f.u > 0.45 && f.u < 0.6", dist: 22, dy: 2, fov: 55, interior: true },
  dock: { kind: "sim", pred: "f.phase === 'dock' && f.u > 0.25 && f.u < 0.45", dist: 15, dy: -3, fov: 55, interior: true, side: [-1, 0.45] },
  // just below the mouth, camera above the fighter so the starfield is behind it (the hull shadows this zone)
  exit_ext: { kind: "sim", pred: "f.phase === 'patrol' && f.position.y < -95 && f.position.y > -125", dist: 26, dy: 12, fov: 55, interior: false },
  // sunlit far leg with the ship in the background (camera on the far side of the fighter)
  patrol_ext: { kind: "sim", pred: "f.phase === 'patrol' && f.position.x > 2600 && f.position.x < 3200 && f.position.z > 500", dist: 55, dy: 8, fov: 50, interior: false, side: [1, 0.15] },
  // under the hull near the bow, camera 40 m below looking up past the fighter at the bottom plate
  under_ext: { kind: "sim", pred: "f.phase === 'patrol' && f.position.z < -500 && f.position.z > -700 && Math.abs(f.position.x) < 60", dist: 70, dy: -30, fov: 50, interior: false },
};
let names = Object.keys(VIEWS);
if (process.env.FS_VIEWS) names = process.env.FS_VIEWS.split(",").map((s) => s.trim()).filter((n) => VIEWS[n]);

// warm-up (shader compile)
await page.evaluate(() => window.debugAPI.setView("room:hangar"));
await settle(2);

const results = { tag, views: {}, logs: [] };
for (const name of names) {
  const v = VIEWS[name];
  let info = null;
  if (v.kind === "view") {
    await page.evaluate((n) => window.debugAPI.setView(n), v.name);
  } else if (v.kind === "cam") {
    await page.evaluate(([pos, look, fov]) => window.debugAPI.setCamera(pos, look, fov, true), [v.pos, v.look, v.fov]);
  } else {
    info = await page.evaluate(
      ([pred, dist, dy, fov, interior, side]) => {
        const h = window.__fh();
        const id = h.advanceUntil(new Function("f", "return " + pred));
        if (id < 0) return { id, error: "condition not reached" };
        const f = h.tr.fighters[id];
        const p = f.position;
        // camera to the side of the fighter (perpendicular to its heading), a little above / below
        const vx = f.velocity.x, vz = f.velocity.z;
        const hv = Math.hypot(vx, vz);
        let sx, sz;
        if (side) { const n = Math.hypot(side[0], side[1]); sx = side[0] / n; sz = side[1] / n; }
        else if (hv < 0.5) { sx = 1; sz = 0.3; }
        else { sx = -vz / hv; sz = vx / hv; }
        // keep the camera inside the hangar when interior
        const pos = [p.x + sx * dist, p.y + dy, p.z + sz * dist];
        if (interior) {
          pos[0] = Math.max(-62, Math.min(62, pos[0]));
          pos[2] = Math.max(-136, Math.min(76, pos[2]));
          pos[1] = Math.max(-38.5, Math.min(-1, pos[1]));
        }
        h.api.setCamera(pos, [p.x, p.y, p.z], fov, interior);
        // hold the traffic still while the renderer settles and the frame is captured (a patrol fighter moves
        // ~70 m during the settle frames otherwise)
        h.freeze();
        return { id, phase: f.phase, u: +f.u.toFixed(2), pos: p.toArray().map((x) => +x.toFixed(1)), speed: +f.speed.toFixed(1), cam: pos.map((x) => +x.toFixed(1)), airborne: h.tr.airborne };
      },
      [v.pred, v.dist, v.dy, v.fov, v.interior, v.side || null],
    );
    if (info.error) {
      console.log(`view ${name}: ${info.error}`);
      results.views[name] = info;
      continue;
    }
  }
  if (DIM < 1 && (v.kind !== "sim" || v.interior)) await dimLights();
  await settle(3);
  const file = resolve(outDir, `${name}.png`);
  await page.screenshot({ path: file, timeout: 180000 });
  const stats = await page.evaluate(() => window.debugAPI.getStats());
  const traffic = await page.evaluate(() => {
    const tr = window.debugAPI.traffic;
    const meshes = tr.pool.meshes;
    return { airborne: tr.airborne, parts: meshes.length, triPerFighter: tr.pool.triangles, phases: tr.fighters.map((f) => f.phase).reduce((a, p) => ((a[p] = (a[p] || 0) + 1), a), {}) };
  });
  results.views[name] = { stats, traffic, info };
  console.log(`shot ${name}: ${stats.calls} calls, ${(stats.triangles / 1000).toFixed(0)}k tris, ${stats.poolLights} lights, mode ${stats.mode}${info ? " " + JSON.stringify(info) : ""}`);
  if (v.kind === "sim") await page.evaluate(() => window.__fh().thaw());
}
results.logs = logs.filter((l) => !l.startsWith("[log]")).slice(0, 80);
writeFileSync(resolve(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log("done ->", outDir);
await browser.close();
