#!/usr/bin/env node
/**
 * Screenshot helper for the asset preview page.
 *
 * Usage: node tools/shoot.mjs <asset> [view] [outfile] [--size WxH]
 * Requires the Vite dev server (npm run dev) to already be running.
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:5173';

const args = process.argv.slice(2);
const flags = new Map();
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) flags.set(args[i].slice(2), args[i + 1]), i++;
  else positional.push(args[i]);
}

const asset = positional[0] ?? 'destroyer';
const view = positional[1] ?? 'three-quarter';
const out = resolve(positional[2] ?? `qa-output/preview/${asset}-${view}.png`);
const [w, h] = (flags.get('size') ?? '1600x900').split('x').map(Number);
const waitMs = Number(flags.get('wait') ?? 2600);

mkdirSync(dirname(out), { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--hide-scrollbars',
    `--window-size=${w},${h}`,
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') errors.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

  const extra = flags.get('params') ? `&${flags.get('params')}` : '';
  const url = `${BASE}/preview.html?asset=${encodeURIComponent(asset)}&view=${encodeURIComponent(view)}${extra}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  try {
    await page.waitForFunction('window.__PREVIEW_READY === true', { timeout: 120000 });
  } catch (err) {
    console.error('preview never became ready:', err.message);
    console.error('--- console ---');
    for (const e of errors.slice(0, 40)) console.error(e);
    await page.screenshot({ path: out });
    console.error(`saved failure frame ${out}`);
    process.exitCode = 1;
    throw err;
  }
  await new Promise((r) => setTimeout(r, waitMs));
  const label = await page.$eval('#label', (el) => el.textContent).catch(() => '');
  await page.screenshot({ path: out });
  console.log(`saved ${out}`);
  if (label) console.log(`label: ${label}`);
  if (errors.length) {
    console.log('--- console ---');
    for (const e of errors.slice(0, 25)) console.log(e);
  }
} finally {
  await browser.close();
}
