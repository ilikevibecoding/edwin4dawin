// Screenshot CLI for development and review. Drives headless Chromium (SwiftShader) through
// window.debugAPI. Examples:
//   node tools/shot.mjs --url http://127.0.0.1:5181/ --out /tmp/s --view bridge --view holo
//   node tools/shot.mjs --pose "0,596,0,-4" --pose "3,580,90,-10,190"       (x,z,yaw,pitch[,feetY])
//   node tools/shot.mjs --ext bridge --ext hangar --extpose "0,300,-1200,0,60,300"   (camera xyz, look xyz)
//   node tools/shot.mjs --list                    (print every registered interior view name)
//   node tools/shot.mjs --view bridge --walk KeyW:3  (walk forward 3 s before the shot)
// Every shot prints draw calls / triangles / visible rooms; page errors are printed and fail the run.
import { chromium } from "playwright-core";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const opt = { url: "http://127.0.0.1:5173/", out: "/tmp/shots", view: [], pose: [], ext: [], extpose: [], walk: null, list: false, width: 1280, height: 720, wait: 900 };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const next = () => args[++i];
  if (a === "--url") opt.url = next();
  else if (a === "--out") opt.out = next();
  else if (a === "--view") opt.view.push(next());
  else if (a === "--pose") opt.pose.push(next());
  else if (a === "--ext") opt.ext.push(next());
  else if (a === "--extpose") opt.extpose.push(next());
  else if (a === "--walk") opt.walk = next();
  else if (a === "--list") opt.list = true;
  else if (a === "--size") [opt.width, opt.height] = next().split("x").map(Number);
  else if (a === "--wait") opt.wait = Number(next());
  else if (a === "--all") opt.all = true;
  else if (a === "--allext") opt.allext = true;
}
mkdirSync(opt.out, { recursive: true });
const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width: opt.width, height: opt.height }, deviceScaleFactor: 1 });
let failed = false;
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") {
    const t = m.text();
    if (!t.includes("GPU stall")) console.log(`[${m.type()}] ${t.slice(0, 600)}`);
  }
});
page.on("pageerror", (e) => {
  failed = true;
  console.log("PAGE ERROR:", e.message, (e.stack || "").split("\n").slice(1, 4).join(" | "));
});
const t0 = Date.now();
await page.goto(opt.url, { waitUntil: "domcontentloaded", timeout: 180000 });
try {
  await Promise.race([
    page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 240000 }),
    new Promise((_, rej) => page.once("pageerror", (e) => setTimeout(() => rej(new Error("pageerror: " + e.message)), 1500))),
  ]);
} catch (e) {
  console.log("app failed to start:", e.message);
  await browser.close();
  process.exit(1);
}
console.log(`ready in ${Date.now() - t0} ms`);
const settle = async (n = 3, ms = opt.wait) => {
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n, { timeout: 180000 });
  await page.waitForTimeout(ms);
};
await settle(3, 600);
const stats = () => page.evaluate(() => window.debugAPI.getStats());
const s0 = await stats();
console.log(`load ${s0.loadMs} ms; build ms ${JSON.stringify(s0.buildMs)}; programs ${s0.programs}; heap ${s0.heapMB} MB`);
if (opt.list) {
  console.log("interior views:", (await page.evaluate(() => window.debugAPI.views)).join(", "));
  console.log("exterior views:", (await page.evaluate(() => window.debugAPI.exteriorViews)).join(", "));
}
if (opt.all) opt.view = await page.evaluate(() => window.debugAPI.views);
if (opt.allext) opt.ext = await page.evaluate(() => window.debugAPI.exteriorViews);
const results = [];
const shot = async (name, setup) => {
  try {
    await page.evaluate(setup.fn, setup.arg);
  } catch (e) {
    console.log(`shot ${name}: setup failed: ${e.message}`);
    failed = true;
    return;
  }
  if (opt.walk) {
    const [code, secs] = opt.walk.split(":");
    await page.evaluate(([c, s]) => window.debugAPI.walk([c], Number(s)), [code, secs]);
    await page.waitForTimeout(Number(secs) * 1000 + 200);
    await page.evaluate(() => (window.debugAPI.player.frozen = true));
  }
  await settle(3);
  const file = resolve(opt.out, `${name}.png`);
  await page.screenshot({ path: file, timeout: 120000 });
  const s = await stats();
  results.push({ name, ...s });
  console.log(`shot ${name}: room=${s.room} rooms=${s.visibleRooms} ${s.calls} calls ${(s.triangles / 1000).toFixed(0)}k tris colliders=${s.colliders} lightDescs=${s.lightDescs} -> ${file}`);
};
for (const v of opt.view) await shot(v, { fn: (n) => window.debugAPI.setView(n), arg: v });
for (const p of opt.pose) {
  const [x, z, yaw, pitch, y] = p.split(",").map(Number);
  await shot(`pose_${p.replace(/[^0-9a-z-]/gi, "_")}`, { fn: (a) => window.debugAPI.setPose(a.x, a.z, a.yaw, a.pitch, a.y === undefined || Number.isNaN(a.y) ? null : a.y), arg: { x, z, yaw, pitch, y } });
}
for (const e of opt.ext) await shot(`ext_${e}`, { fn: (n) => window.debugAPI.setExteriorView(n), arg: e });
for (const p of opt.extpose) {
  const n = p.split(",").map(Number);
  await shot(`extpose_${p.replace(/[^0-9a-z-]/gi, "_")}`, { fn: (a) => window.debugAPI.setExteriorPose(a.slice(0, 3), a.slice(3, 6)), arg: n });
}
await browser.close();
if (failed) {
  console.log("FAILED (page errors)");
  process.exit(1);
}
