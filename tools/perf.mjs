// Performance measurement across a standard view set. Records draw calls, triangles, lights, visible
// objects, geometry/texture counts, programs, JS heap, cluster build times, boot timings, long tasks and the
// (software-GL, relative only) frame time. Writes perf/<tag>.json and perf/<tag>.md.
// Usage: node tools/perf.mjs <tag> [url] [--views=a,b,c]
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const pos = args.filter((a) => !a.startsWith("--"));
const tag = pos[0] || "run";
const url = pos[1] || "http://127.0.0.1:5173/";
const DEFAULT_VIEWS = ["ext_far", "ext_mid", "ext_tower", "ext_close", "ext_belly", "bridge", "bridge_window", "cmd_corridor", "hangar", "hangar_well", "shuttle_bay", "reactor", "engineering", "hyperdrive", "crew_corridor", "crew_quarters", "mess", "medbay", "detention"];
const views = flags.views ? flags.views.split(",") : DEFAULT_VIEWS;
mkdirSync(resolve("perf"), { recursive: true });

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit", "--enable-precise-memory-info"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
const tLoad = Date.now();
await page.goto(url, { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 300000 });
const readyMs = Date.now() - tLoad;
const settle = async (n) => {
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n, { timeout: 300000 });
};
await settle(2);
const boot = await page.evaluate(() => window.debugAPI.getStats().boot);

const out = { tag, date: new Date().toISOString(), url, readyMs, boot, views: {}, errors };
for (const v of views) {
  try {
    const t0 = Date.now();
    await page.evaluate((n) => window.debugAPI.setView(n), v);
    const setViewMs = Date.now() - t0;
    await settle(4);
    // average frame time over 4 frames (software GL; relative)
    const s = await page.evaluate(() => window.debugAPI.getStats());
    out.views[v] = {
      calls: s.calls,
      triangles: s.triangles,
      lights: s.visibleLights,
      objects: s.visibleObjects,
      geometries: s.geometries,
      textures: s.textures,
      programs: s.programs,
      colliders: s.colliders,
      heapMB: s.jsHeapMB,
      frameMsSoftware: s.frameMs,
      roomsVisible: s.rooms.visible,
      roomsBuilt: s.rooms.built,
      roomTriangles: s.rooms.triangles,
      buildTimes: s.rooms.buildTimes,
      setViewMs,
      fighters: s.fighters,
    };
    console.log(`${v.padEnd(16)} ${String(s.calls).padStart(4)} calls ${String((s.triangles / 1000).toFixed(0)).padStart(5)}k tris ${String(s.visibleLights).padStart(3)} lights ${String(s.visibleObjects).padStart(4)} objs ${String(s.jsHeapMB || "-").padStart(6)} MB  ${s.frameMs} ms(sw)  setView ${setViewMs} ms`);
  } catch (e) {
    out.views[v] = { error: e.message.slice(0, 200) };
    console.log(`${v}: ERROR ${e.message.slice(0, 200)}`);
  }
}
const longTasks = await page.evaluate(() => window.debugAPI.getStats().longTasks);
out.longTasks = longTasks;
writeFileSync(resolve("perf", `${tag}.json`), JSON.stringify(out, null, 2));
let md = `# perf ${tag} — ${out.date}\n\nready ${readyMs} ms · boot ${JSON.stringify(boot)}\n\n| view | calls | tris | lights | objects | geometries | textures | programs | heap MB | frame ms (sw) | rooms visible |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const [v, s] of Object.entries(out.views)) {
  if (s.error) md += `| ${v} | ERROR ${s.error} |\n`;
  else md += `| ${v} | ${s.calls} | ${(s.triangles / 1000).toFixed(0)}k | ${s.lights} | ${s.objects} | ${s.geometries} | ${s.textures} | ${s.programs} | ${s.heapMB ?? "-"} | ${s.frameMsSoftware} | ${s.roomsVisible.join(" ")} |\n`;
}
md += `\nlong tasks (last 20): ${JSON.stringify(longTasks)}\n`;
if (errors.length) md += `\nERRORS:\n${errors.map((e) => "- " + e).join("\n")}\n`;
writeFileSync(resolve("perf", `${tag}.md`), md);
console.log(`written perf/${tag}.json + .md${errors.length ? ` (${errors.length} errors)` : ""}`);
await browser.close();
process.exit(errors.length ? 1 : 0);
