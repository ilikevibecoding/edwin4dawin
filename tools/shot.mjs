#!/usr/bin/env node
/**
 * Headless screenshot helper.
 *
 *   node tools/shot.mjs "http://127.0.0.1:5173/preview.html?m=/src/models/ships.js&f=xwing" out.png
 *   node tools/shot.mjs <url> <out.png> [--w 1280] [--h 720] [--wait 3000] [--ready window.__ready]
 *
 * Prints any page console errors so model bugs are impossible to miss.
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const argv = process.argv.slice(2);
const url = argv[0];
const out = argv[1] || 'shot.png';
const flag = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 ? argv[i + 1] : d;
};
if (!url) {
  console.error('usage: node tools/shot.mjs <url> <out.png> [--w 1280 --h 720 --wait 4000]');
  process.exit(1);
}
const W = parseInt(flag('w', 1280), 10);
const H = parseInt(flag('h', 720), 10);
const WAIT = parseInt(flag('wait', 20000), 10);

export async function launch() {
  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--disable-frame-rate-limit',
      '--mute-audio',
      '--hide-scrollbars',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
}

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
try {
  await page.waitForFunction('window.__ready === true', { timeout: WAIT });
} catch {
  errors.push('[warn] window.__ready never became true (screenshot may be early)');
}
await new Promise((r) => setTimeout(r, 250));
mkdirSync(dirname(out) === '' ? '.' : dirname(out), { recursive: true });
await page.screenshot({ path: out });
const perr = await page.evaluate(() => window.__previewError || null);
const hud = await page.evaluate(() => document.getElementById('hud')?.textContent || '');
await browser.close();

if (hud) console.log(hud);
if (perr) console.log('PREVIEW ERROR: ' + perr);
if (errors.length) console.log('--- console ---\n' + errors.slice(0, 25).join('\n'));
console.log('wrote ' + out);
process.exit(perr ? 2 : 0);
