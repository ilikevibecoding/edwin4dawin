#!/usr/bin/env node
import { chromium } from 'playwright';

// Cheapest possible smoke test: boot the app, poll the boot label so a slow
// build step is obvious, then report console errors, terrain mesh counts and
// one frame's luma. Catches shader compile failures and NaN blowouts without
// paying for a full shot run.
//
//   node tools/bootcheck.mjs --url http://127.0.0.1:5183/ [--view road]

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5183/') + '?quality=fast&capture=1';
const view = arg('view', 'road');

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
const errs = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));

const t0 = Date.now();
const el = (ms) => ((Date.now() - t0) / 1000).toFixed(1) + 's';
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
console.log(`${el()} dom`);

let label = '';
const poll = setInterval(async () => {
  try {
    const l = await page.evaluate(() => document.getElementById('boot-label')?.textContent || '');
    if (l && l !== label) {
      label = l;
      console.log(`${el()} ${label}`);
    }
  } catch {}
}, 500);

await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
clearInterval(poll);
const err = await page.evaluate(() => window.__ERROR__ || null);
console.log(`${el()} ready`);
if (err) {
  console.error('BOOT FAILED\n' + err);
} else {
  const info = await page.evaluate((v) => {
    window.debugAPI.setView(v);
    window.debugAPI.renderFrames(1);
    const t = window.debugAPI.objects.terrain;
    return { luma: window.debugAPI.sampleLuma(), stats: window.debugAPI.stats(), terrain: t.stats || null };
  }, view);
  console.log(`${el()} rendered`);
  console.log(JSON.stringify(info, null, 2));
}
for (const e of errs.slice(0, 24)) console.log(e);
await browser.close();
