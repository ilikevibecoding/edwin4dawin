// Quick smoke check: load the app headless, wait for debugAPI.ready, report page errors and stats.
// Usage: node tools/check.mjs [baseUrl] [--view name] [--shot file.png] [--eval "js"]
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) || "http://127.0.0.1:5173/";
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const view = opt("--view");
// use ";" as the separator when present so ext@px,py,pz,lx,ly,lz cameras survive
const views = opt("--views") ? opt("--views").split(opt("--views").includes(";") ? ";" : ",") : null;
const outDir = opt("--out") || "/tmp/shots";
const shot = opt("--shot");
const evalJs = opt("--eval");
const width = +(opt("--w") || 960);
const height = +(opt("--h") || 540);

const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") {
    const t = m.text();
    if (!/GPU stall|ReadPixels/.test(t)) errors.push(`[${m.type()}] ${t.slice(0, 300)}`);
  }
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}\n${(e.stack || "").split("\n").slice(0, 4).join("\n")}`));
const t0 = Date.now();
await page.goto(base, { waitUntil: "load" });
try {
  await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 240000 });
} catch (e) {
  console.log("TIMEOUT waiting for ready");
}
console.log(`ready in ${Date.now() - t0} ms`);
const settle = async (n) => {
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + n, { timeout: 240000 });
};
await settle(3);
if (view) {
  const ok = await page.evaluate((v) => window.debugAPI.setView(v), view);
  console.log(`view ${view}: ${ok}`);
  await settle(4);
}
if (views) {
  const { mkdirSync } = await import("node:fs");
  mkdirSync(outDir, { recursive: true });
  for (const v of views) {
    const t1 = Date.now();
    try {
      await page.evaluate((vv) => window.debugAPI.setView(vv), v);
    } catch (e) {
      console.log(`view ${v} failed: ${e.message.slice(0, 200)}`);
      continue;
    }
    await settle(4);
    await page.screenshot({ path: `${outDir}/${v}.png` });
    const st = await page.evaluate(() => window.debugAPI.getStats());
    console.log(`${v}: ${st.calls} calls ${(st.triangles / 1000).toFixed(0)}k tris ${st.lights} lights ${st.visibleObjects} objs ${st.frameMs} ms  (${Date.now() - t1} ms)`);
  }
}
if (evalJs) {
  const r = await page.evaluate(evalJs);
  console.log("eval:", JSON.stringify(r, null, 1));
  await settle(3);
}
const stats = await page.evaluate(() => window.debugAPI.getStats());
console.log("stats", JSON.stringify(stats));
if (shot) {
  await page.screenshot({ path: shot });
  console.log("shot ->", shot);
}
if (errors.length) {
  console.log(`ERRORS (${errors.length}):`);
  for (const e of errors.slice(0, 12)) console.log(e);
} else console.log("no page errors");
await browser.close();
