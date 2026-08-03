#!/usr/bin/env node
/**
 * Skeleton probe for the pose sheet.
 *
 * Loads /preview.html?asset=poses and prints world-space joint positions plus
 * the mesh bounding box for every requested state, so grounding and limb
 * placement can be asserted numerically instead of eyeballed.
 *
 * Usage: node tools/pose.mjs [kind] [states,csv]
 */
import puppeteer from 'puppeteer-core';

const kind = process.argv[2] ?? 'stormtrooper';
const states = process.argv[3] ?? 'idle,walk,run,aim,fire,react,crouch,kneel,interact,fall,down';

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: 'shell',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 600 });
const url = `http://127.0.0.1:5173/preview.html?asset=poses&kind=${kind}&states=${states}`;
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__PREVIEW_READY === true', { timeout: 120000 });
await new Promise((r) => setTimeout(r, 2500));
const data = await page.evaluate(() => window.__POSE());
console.log(`${kind}`);
for (const d of data) {
  const j = d.joints;
  console.log(
    `${d.state.padEnd(9)} bboxY=[${String(d.minY).padStart(7)},${String(d.maxY).padStart(6)}] ` +
      `head=${fmt(j.head)} chest=${fmt(j.chest)} handR=${fmt(j.handR)} ankleL=${fmt(j.ankleL)}`,
  );
}
function fmt(v) {
  return `(${v.map((n) => n.toFixed(2).padStart(5)).join(',')})`;
}
await browser.close();
