#!/usr/bin/env node
// ===========================================================================
// Headless screenshot tool for visual review.
//
// Usage:
//   node scripts/screenshot.mjs --out shots/a.png \
//     --px 0 --py 0 --pz 58 --yaw 3.14 --pitch 0 \
//     --scene street --t 1.5 --hud 1 --fire 0 --w 1600 --h 900
//
// Requires the vite dev server running on :5173 (npm run dev).
// ===========================================================================
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const key = argv[i].slice(2);
    const val = (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[++i] : '1';
    args[key] = val;
  }
}

const out = resolve(args.out ?? 'shots/shot.png');
const width = parseInt(args.w ?? '1280', 10);
const height = parseInt(args.h ?? '720', 10);
const port = args.port ?? '5173';

const params = new URLSearchParams({ shot: '1' });
for (const k of ['px', 'py', 'pz', 'yaw', 'pitch', 'scene', 't', 'hud', 'fire', 'exposure']) {
  if (args[k] !== undefined) params.set(k, args[k]);
}
const url = `http://localhost:${port}/?${params.toString()}`;

mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
    '--no-sandbox',
    '--force-color-profile=srgb',
    '--disable-lcd-text',
  ],
});

try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto(url, { waitUntil: 'commit', timeout: 60000 });
  await page.waitForFunction('window.__SHOT_READY === true', null, { timeout: 180000 });
  // A couple extra frames so all post passes have settled
  await page.waitForTimeout(parseInt(args.wait ?? '400', 10));
  await page.screenshot({ path: out, timeout: 120000 });
  console.log(`saved: ${out}`);
  if (errors.length) {
    console.log('--- page errors ---');
    for (const e of errors.slice(0, 12)) console.log(e);
    process.exitCode = 2;
  }
} finally {
  await browser.close();
}
