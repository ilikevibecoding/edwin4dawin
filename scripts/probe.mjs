#!/usr/bin/env node
/**
 * Ad-hoc scene probe.
 *
 * Seeks to a timestamp and screenshots the frame once per variant, where each
 * variant is a snippet of JS evaluated against the live application. Used to
 * bisect "what is that bright blob?" style questions quickly.
 *
 *   node scripts/probe.mjs --time 140 --shots probe
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'qa', 'probe');

const argv = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const TIME = Number(flag('time', 140));
const PLAN = JSON.parse(readFileSync(path.join(root, flag('plan', 'scripts/probe-plan.json')), 'utf8'));

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const chrome = CANDIDATES.find((c) => existsSync(c));

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--mute-audio',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
  ],
  protocolTimeout: 600000,
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.goto('http://127.0.0.1:5173/?qa=1&quality=medium&autoplay=0', {
  waitUntil: 'domcontentloaded',
});
await page.waitForFunction('window.__STARFALL && window.__STARFALL.ready === true', {
  timeout: 300000,
});
await mkdir(outDir, { recursive: true });

for (const step of PLAN) {
  const time = step.time ?? TIME;
  await page.evaluate((t) => window.__STARFALL.seekAndSettle(t, 6, 3.6), time);
  // The show re-asserts visibility every frame, so the tweak is applied after
  // the last simulated frame and the scene is drawn directly.
  if (step.js) {
    await page.evaluate(step.js);
    await page.evaluate('window.__STARFALL.app.render.render(0)');
  }
  const file = path.join(outDir, `${step.name}.png`);
  await page.screenshot({ path: file, type: 'png' });
  const info = step.report ? await page.evaluate(step.report) : null;
  console.log(`captured ${step.name}`, info ? JSON.stringify(info) : '');
}

await browser.close();
