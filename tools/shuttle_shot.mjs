// Shuttle preview tool (workstream FIGHTERS). Usage: node tools/shuttle_shot.mjs <tag> [baseUrl]
// Nobody places the shuttle yet, so this loads the app, builds `buildShuttleDetached(debugAPI.materials)` in the
// page and parents it under the shuttle_bay cell at room-local (0, 0, -5), yaw PI — the same pose the room
// builder will use via buildShuttle(kit, new THREE.Vector3(0, 0, -5), Math.PI) — then screenshots it from a
// few room-local camera positions. Writes shots/shuttle_<tag>/<view>.png.
//
//   SS_VIEWS=front,side,...   subset of views
//   SS_DIM=0.1                scale the placeholder room's pool lights (default 0.1; the generic shell is bright)
//   SHOT_SIZE=1280x720
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const tag = process.argv[2] || "0";
const base = process.argv[3] || "http://127.0.0.1:5185/";
const outDir = resolve("shots", `shuttle_${tag}`);
mkdirSync(outDir, { recursive: true });
const [VW, VH] = (process.env.SHOT_SIZE || "1280x720").split("x").map(Number);
const DIM = process.env.SS_DIM ? +process.env.SS_DIM : 0.1;

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/local/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const launchEnv = { ...process.env };
delete launchEnv.DISPLAY; // a DISPLAY makes headless Chrome try GLX on the VNC X server and WebGL context creation fails
const browser = await chromium.launch({
  headless: true,
  env: launchEnv,
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

// build + place the shuttle in the page
const placed = await page.evaluate(async () => {
  const api = window.debugAPI;
  const mod = await import("/src/fighters/shuttle.js");
  const cell = api.cells.cells.get("shuttle_bay");
  const g = mod.buildShuttleDetached(api.materials);
  g.position.set(0, 0, -5);
  g.rotation.y = Math.PI;
  cell.group.add(g);
  // the shuttle's own floodlight, registered like the cell does for kit lights (world Vector3 pos, Color)
  const L = g.userData.lights[0];
  const p = g.position.clone().set(L.pos[0], L.pos[1], L.pos[2]).applyEuler(g.rotation).add(g.position);
  const o = cell.room.origin;
  const template = cell.lights[0];
  const color = template ? template.color.clone().set(L.color) : null;
  cell.lights.push({ ...L, cell: cell.id, pos: p.set(p.x + o[0], p.y + o[1], p.z + o[2]), color: color || L.color });
  window.__shuttle = g;
  let tris = 0;
  const bounds = g.children[0].geometry.boundingBox.clone();
  for (const m of g.children) {
    tris += m.geometry.attributes.position.count / 3;
    bounds.union(m.geometry.boundingBox);
  }
  return { origin: cell.room.origin, size: cell.room.size, tris, meshes: g.children.length, colliders: g.userData.colliders.length, localBounds: [...bounds.min.toArray(), ...bounds.max.toArray()].map((v) => +v.toFixed(2)) };
});
console.log("shuttle placed:", JSON.stringify(placed));
const O = placed.origin;

// room-local camera positions (the shuttle's nose points +z local after the yaw of PI)
const VIEWS = {
  spawn: { kind: "view", name: "room:shuttle_bay" },
  front_q: { pos: [-17, 3.5, 17], look: [0, 5.5, -4], fov: 55 },
  side: { pos: [21, 5, -6], look: [0, 6, -5], fov: 60 },
  rear_q: { pos: [-14, 4, -30], look: [0, 5, -4], fov: 55 },
  ramp: { pos: [-5.5, 1.7, 6.5], look: [0, 1.6, 1.5], fov: 60 },
  cockpit: { pos: [-6, 6.5, 12], look: [0, 5.6, 2], fov: 50 },
  wings_up: { pos: [-11, 2, -2], look: [0, 9, -5], fov: 70 },
};
let names = Object.keys(VIEWS);
if (process.env.SS_VIEWS) names = process.env.SS_VIEWS.split(",").map((s) => s.trim()).filter((n) => VIEWS[n]);

await page.evaluate(() => window.debugAPI.setView("room:shuttle_bay"));
await settle(2);
if (DIM < 1) {
  await page.evaluate((dim) => {
    const pool = window.debugAPI.cells.pool;
    for (const s of [...pool.points, ...pool.spots]) {
      const l = s.light;
      if (l.userData.dimmed) continue;
      l.userData.dimmed = true;
      l.intensity *= dim;
      l.userData.baseIntensity = (l.userData.baseIntensity || 0) * dim;
    }
    for (const cell of window.debugAPI.cells.cells.values()) for (const l of cell.lights) if (!l.dimmed && l.priority !== 0.35) { l.dimmed = true; l.intensity *= dim; }
  }, DIM);
}

const results = { tag, placed, views: {}, logs: [] };
for (const name of names) {
  const v = VIEWS[name];
  if (v.kind === "view") await page.evaluate((n) => window.debugAPI.setView(n), v.name);
  else await page.evaluate(([pos, look, fov, O]) => window.debugAPI.setCamera([pos[0] + O[0], pos[1] + O[1], pos[2] + O[2]], [look[0] + O[0], look[1] + O[1], look[2] + O[2]], fov, true), [v.pos, v.look, v.fov, O]);
  await settle(3);
  const file = resolve(outDir, `${name}.png`);
  await page.screenshot({ path: file, timeout: 180000 });
  const stats = await page.evaluate(() => window.debugAPI.getStats());
  results.views[name] = { stats };
  console.log(`shot ${name}: ${stats.calls} calls, ${(stats.triangles / 1000).toFixed(0)}k tris, ${stats.poolLights} lights`);
}
results.logs = logs.filter((l) => !l.startsWith("[log]")).slice(0, 80);
writeFileSync(resolve(outDir, "results.json"), JSON.stringify(results, null, 2));
console.log("done ->", outDir);
await browser.close();
