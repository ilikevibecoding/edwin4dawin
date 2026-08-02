#!/usr/bin/env node
/**
 * Quick single-frame capture used during development.
 *   node tools/shot.mjs <url> <outfile> [waitMs] [width] [height]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const url = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.argv[3] ?? 'qa/output/shot.png';
const waitMs = Number(process.argv[4] ?? 6000);
const width = Number(process.argv[5] ?? 1600);
const height = Number(process.argv[6] ?? 900);

mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(waitMs);
await page.screenshot({ path: out });
console.log(`saved ${out}`);
if (logs.length) console.log('--- console ---\n' + logs.join('\n'));
await browser.close();
