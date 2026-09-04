// Quick single/multi-view screenshot tool for iteration.
//   node tools/view.mjs <view>[,<view>...] [outDir] [--w=960 --h=540 --url=http://127.0.0.1:5173/ --json --nudge=dx,dz]
// A view is a named debugAPI view, or an inline spec:  ext:x,y,z:tx,ty,tz   |   int:x,y,z:yaw,pitch
// Prints page errors, boot timings and per-view stats; writes <outDir>/<view>.png (default shots/quick).
import { chromium } from "playwright-core";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => { const [k, v] = a.slice(2).split("="); return [k, v === undefined ? true : v]; }));
const pos = args.filter((a) => !a.startsWith("--"));
// named views are comma-separated; inline specs contain commas themselves, so lists mixing them use ';'
const viewArg = pos[0] || "ext_far";
const views = viewArg.includes(":") ? viewArg.split(";") : viewArg.split(",");
const outDir = resolve(pos[1] || "shots/quick");
const W = +(flags.w || 960);
const H = +(flags.h || 540);
const url = flags.url || "http://127.0.0.1:5173/";
mkdirSync(outDir, { recursive: true });

function parseView(v) {
  if (v.startsWith("ext:")) {
    const [, p, t] = v.split(":");
    return { mode: "exterior", pos: p.split(",").map(Number), target: t.split(",").map(Number) };
  }
  if (v.startsWith("int:")) {
    const [, p, a] = v.split(":");
    const [yaw, pitch] = (a || "0,0").split(",").map(Number);
    return { mode: "interior", pos: p.split(",").map(Number), yaw, pitch };
  }
  return v;
}

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("[console.error] " + m.text().slice(0, 300));
});
const t0 = Date.now();
await page.goto(url, { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 300000 });
console.log(`ready in ${Date.now() - t0} ms`);

async function settle(minFrames = 3, timeout = 240000) {
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((tgt) => window.debugAPI.frames() >= tgt, f0 + minFrames, { timeout });
}
await settle(2);
const boot = await page.evaluate(() => window.debugAPI.getStats().boot);
console.log("boot", JSON.stringify(boot));

const results = {};
for (const v of views) {
  const spec = parseView(v);
  const name = typeof spec === "string" ? spec : v.replace(/[^a-z0-9_.-]+/gi, "_");
  try {
    await page.evaluate((s) => window.debugAPI.setView(s), spec);
    if (flags.nudge) {
      const [dx, dz] = flags.nudge.split(",").map(Number);
      const r = await page.evaluate(([a, b]) => window.debugAPI.nudge(a, b), [dx, dz]);
      console.log("nudge ->", JSON.stringify(r));
    }
    if (flags.sim) await page.evaluate((s) => window.debugAPI.simulate(s), +flags.sim);
    await settle(3);
    const file = resolve(outDir, `${name}.png`);
    await page.screenshot({ path: file, timeout: 300000 });
    const s = await page.evaluate(() => window.debugAPI.getStats());
    results[name] = s;
    console.log(`${name}: ${s.calls} calls, ${(s.triangles / 1000).toFixed(0)}k tris, ${s.visibleLights} lights, ${s.visibleObjects} objs, ${s.frameMs} ms/frame (software GL), rooms ${s.rooms.visible.join("|")} -> ${file}`);
  } catch (e) {
    console.log(`${name}: FAILED ${e.message.slice(0, 300)}`);
  }
}
if (flags.json) console.log(JSON.stringify(results, null, 1));
if (errors.length) {
  console.log("ERRORS:");
  for (const e of errors.slice(0, 20)) console.log(" ", e);
} else console.log("no page errors");
await browser.close();
process.exit(errors.length ? 2 : 0);
