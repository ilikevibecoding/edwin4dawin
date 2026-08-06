// Checks the winding/normal orientation of the two terrain sheets and whether
// the far sheet contributes anything to a raised view of the site.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};
const BASE = arg('base', 'http://127.0.0.1:8207');
const OUT = arg('out', '/tmp/hz_probe');

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${BASE}/?test=1&seed=20260805&quality=high`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__READY === true', null, { timeout: 240000 });

const out = await page.evaluate(() => {
  const G = window.__GAME;
  G.action('deploy');
  G.action('tod:day');
  G.runFor(1.0);
  G.hideHud(true);
  G.teleport(0, 150, 300);
  G.lookAt(0, 0, -260);
  G.runFor(0.2);
  G.render(2);
  const res = {};
  G.game.scene.traverse((o) => {
    if (o.name !== 'terrain.near' && o.name !== 'terrain.far') return;
    const n = o.geometry.attributes.normal;
    let up = 0;
    let down = 0;
    for (let i = 0; i < n.count; i++) (n.getY(i) >= 0 ? up++ : down++);
    res[o.name] = { verts: n.count, normalsUp: up, normalsDown: down, side: o.material.side, visible: o.visible };
    window.__f = window.__f || {};
    window.__f[o.name] = o;
  });
  return res;
});
console.log(JSON.stringify(out, null, 2));

const shot = async (name) => {
  await page.evaluate(() => window.__GAME.game.post.render(0, window.__GAME.game.elapsed));
  await page.screenshot({ path: path.join(OUT, `${name}.png`), timeout: 180000 });
  console.log('  shot', name);
};
await shot('j_overview_baseline');
await page.evaluate(() => {
  window.__f['terrain.far'].material.side = 2; // DoubleSide
});
await shot('k_overview_far_doubleside');

await browser.close();
process.exit(0);
