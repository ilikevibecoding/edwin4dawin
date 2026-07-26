#!/usr/bin/env node
/**
 * Captures deterministic game screenshots via headless Chrome.
 *
 * Usage:
 *   node scripts/screenshot.mjs                          # capture the standard set
 *   node scripts/screenshot.mjs "street" "alley?fx=explosion&t=2"
 *   node scripts/screenshot.mjs --out=review/shots --url=http://localhost:5173 "street"
 *
 * Each positional arg is "<pose>[?extra=params]". Output: <out>/<sanitized>.png
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opts = { out: 'review/shots', url: 'http://localhost:5173', w: 1280, h: 720 };
const specs = [];
for (const a of args) {
  if (a.startsWith('--out=')) opts.out = a.slice(6);
  else if (a.startsWith('--url=')) opts.url = a.slice(6);
  else if (a.startsWith('--w=')) opts.w = parseInt(a.slice(4));
  else if (a.startsWith('--h=')) opts.h = parseInt(a.slice(4));
  else specs.push(a);
}

const STANDARD = [
  'street', 'crossroads', 'alley', 'sunward', 'overview',
  'street?fx=firing&t=2', 'street?fx=explosion&t=2&fxt=0.35',
  'ads', 'crossroads?fx=airstrike&t=2&fxt=2.5',
];
if (!specs.length) specs.push(...STANDARD);

const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';

function sanitize(s) {
  return s.replace(/[?&=]/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
}

async function main() {
  await mkdir(opts.out, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: [
      '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
      '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
      '--enable-webgl', '--ignore-gpu-blocklist',
      `--window-size=${opts.w},${opts.h}`,
    ],
    defaultViewport: { width: opts.w, height: opts.h },
    protocolTimeout: 300000,
  });

  for (const spec of specs) {
    const [pose, extra] = spec.split('?');
    const qs = `pose=${encodeURIComponent(pose)}${extra ? '&' + extra : ''}`;
    const url = `${opts.url}/?${qs}`;
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error(`[pageerror] ${spec}: ${e.message}`));
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction('window.__SHOT_READY__ === true', { timeout: 240000, polling: 250 });
      await new Promise((r) => setTimeout(r, 300));
      const file = join(opts.out, `${sanitize(spec)}.png`);
      await page.screenshot({ path: file });
      console.log(`[shot] ${file}`);
    } catch (e) {
      console.error(`[fail] ${spec}: ${e.message}`);
      if (consoleErrors.length) console.error('  console errors:', consoleErrors.slice(0, 5).join(' | '));
      try {
        const file = join(opts.out, `${sanitize(spec)}_FAILED.png`);
        await page.screenshot({ path: file });
        console.log(`[shot] ${file} (failure state)`);
      } catch {}
    }
    await page.close();
  }
  await browser.close();
}

main();
