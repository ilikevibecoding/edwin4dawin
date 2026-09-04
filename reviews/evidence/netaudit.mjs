// One-off: list every network request the page makes until debugAPI.ready (+2 frames) and group by origin.
import { chromium } from "/workspace/node_modules/playwright-core/index.mjs";
const url = process.argv[2] || "http://127.0.0.1:5173/";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/google-chrome-stable", args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(300000);
const reqs = [];
page.on("request", (r) => reqs.push({ url: r.url(), type: r.resourceType() }));
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready);
const f0 = await page.evaluate(() => window.debugAPI.frames());
await page.waitForFunction((t) => window.debugAPI.frames() >= t, f0 + 2);
const byOrigin = {};
for (const r of reqs) {
  const o = new URL(r.url).origin;
  byOrigin[o] = byOrigin[o] || { n: 0, types: {} };
  byOrigin[o].n++;
  byOrigin[o].types[r.type] = (byOrigin[o].types[r.type] || 0) + 1;
}
console.log(JSON.stringify({ total: reqs.length, byOrigin }, null, 1));
const foreign = reqs.filter((r) => !r.url.startsWith(new URL(url).origin));
console.log("foreign requests:", foreign.length, foreign.slice(0, 10));
await browser.close();
