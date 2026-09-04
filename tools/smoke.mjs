// Headless smoke test: load the app, wait for readiness, report page errors, build log and stats.
// Usage: node tools/smoke.mjs [baseUrl] [view]
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const base = process.argv[2] || "http://127.0.0.1:5173/";
const view = process.argv[3] || null;
const executablePath = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/local/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
const warnings = [];
page.on("console", (m) => {
  const text = m.text();
  if (m.type() === "error") errors.push(text);
  else if (m.type() === "warning" && !text.includes("GL Driver Message")) warnings.push(text);
});
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message + "\n" + (e.stack || "").split("\n").slice(0, 6).join("\n")));
const t0 = Date.now();
await page.goto(base, { waitUntil: "commit", timeout: 180000 });
try {
  await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 300000 });
} catch (e) {
  console.log("TIMEOUT waiting for ready");
}
console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const log = await page.evaluate(() => window.debugAPI.buildLog());
console.log("build log:", JSON.stringify(log));
if (view) {
  await page.evaluate((v) => window.debugAPI.setView(v), view);
  const f0 = await page.evaluate(() => window.debugAPI.frames());
  await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + 3, { timeout: 240000 });
  mkdirSync("shots/smoke", { recursive: true });
  await page.screenshot({ path: resolve("shots/smoke", `${view.replace(":", "_")}.png`), timeout: 150000 });
  console.log("shot ->", `shots/smoke/${view.replace(":", "_")}.png`);
}
const stats = await page.evaluate(() => window.debugAPI.getStats());
console.log("stats:", JSON.stringify(stats));
console.log("errors:", errors.length, errors.slice(0, 10));
console.log("warnings:", warnings.length, warnings.slice(0, 10));
await browser.close();
process.exit(errors.length ? 1 : 0);
