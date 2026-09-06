// Quick headless screenshot: node bench/scripts/shot.mjs "<url>" out.png [width] [height] [settleFrames]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const [url, out, w = '1280', h = '720', settle = '3'] = process.argv.slice(2);
if (!url || !out) { console.error('usage: shot.mjs <url> <out.png> [w] [h] [settleFrames]'); process.exit(2); }

const browser = await puppeteer.launch({
  // the machine-wide Chrome slot gate can hold a launch for minutes; never time out on it
  timeout: 1800000,
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${w},${h}`, '--hide-scrollbars'],
  defaultViewport: { width: Number(w), height: Number(h), deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
try {
  await page.waitForFunction('window.__ready === true', { timeout: 300000, polling: 200 });
} catch (e) {
  console.error('timeout waiting for __ready');
}
// let a few frames render
for (let i = 0; i < Number(settle); i++) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
}
const info = await page.evaluate(() => {
  const g = window.__game;
  const r = g?.renderer;
  return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, geometries: r.info.memory.geometries, textures: r.info.memory.textures, programs: r.info.programs?.length, build: window.__build } : null;
});
await page.screenshot({ path: out, type: 'png' });
console.log(JSON.stringify({ ms: Date.now() - t0, info, logs: logs.slice(0, 40) }, null, 2));
await browser.close();
