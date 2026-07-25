#!/usr/bin/env node
/**
 * tools/look.mjs — ad-hoc camera probe.
 *
 * The judged views are fixed, which is the point of them, but while dressing a
 * room you constantly need to answer "is that prop actually there, and does it
 * hold up close?". This drops the camera anywhere, optionally with a long lens,
 * and writes one PNG per shot.
 *
 *   node tools/look.mjs --out /tmp/look \
 *     --shot "toilet:-2.0,1.4,-16.9:-1.9,0.5,-17.9:30" \
 *     --shot "mirror:-2.3,1.5,-17.2:-3.05,1.5,-18.18:26"
 *
 * Shot syntax: name:px,py,pz:tx,ty,tz[:fov]
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const shots = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--shot') shots.push(argv[i + 1]);
}
const OUT = arg('out', '/tmp/look');
const URL_BASE = arg('url', 'http://127.0.0.1:5173');
const W = Number(arg('width', 1000));
const H = Number(arg('height', 700));
const FRAMES = Number(arg('frames', 8));
const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`${URL_BASE}?shot=1`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.debugAPI?.ready, null, { timeout: 300000, polling: 250 });

for (const spec of shots) {
  const [name, p, t, fov] = spec.split(':');
  const pos = p.split(',').map(Number);
  const tgt = t.split(',').map(Number);
  await page.evaluate(([pp, tt, ff]) => window.debugAPI.look(pp, tt, ff), [pos, tgt, fov ? Number(fov) : null]);
  await page.evaluate(() => window.debugAPI.resetFrames());
  await page.waitForFunction((n) => window.debugAPI.frames >= n, FRAMES, { timeout: 300000, polling: 250 });
  await page.waitForTimeout(700);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  const s = await page.evaluate(() => window.debugAPI.getStats());
  console.log(`· ${name}: ${s.calls} calls, ${(s.tris / 1000).toFixed(0)}k tris, ${s.activeLights} lights -> ${file}`);
}

if (errors.length) console.log(`! errors: ${errors.slice(0, 5).join(' | ')}`);
await browser.close();
