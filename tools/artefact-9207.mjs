// Tests whether the apron's single-vertex triangle fan is what loses the depth
// test in the foreground, by swapping in a ring-tessellated disc in-page.
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
const BEARING = Number(arg('bearing', 90));

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${BASE}/?test=1&seed=20260805&quality=high`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__READY === true', null, { timeout: 240000 });

await page.evaluate((bearing) => {
  const G = window.__GAME;
  G.action('deploy');
  G.action('tod:day');
  G.runFor(1.0);
  G.hideHud(true);
  G.teleport(0, undefined, 0);
  const a = (bearing * Math.PI) / 180;
  G.lookAt(Math.cos(a) * 4000, G.game.camera.position.y, Math.sin(a) * 4000);
  G.runFor(0.2);
  G.render(2);
}, BEARING);

const shot = async (name) => {
  await page.evaluate(() => window.__GAME.game.post.render(0, window.__GAME.game.elapsed));
  await page.screenshot({ path: path.join(OUT, `${name}.png`), timeout: 180000 });
  console.log('  shot', name);
};

await shot('h_baseline');

const swapped = await page.evaluate(() => {
  const G = window.__GAME;
  let ringProto = null;
  const fans = [];
  G.game.scene.traverse((o) => {
    if (o.geometry && o.geometry.type === 'RingGeometry') ringProto = o.geometry;
    if (o.parent && o.parent.name === 'pad' && o.geometry && o.geometry.type === 'CircleGeometry') fans.push(o);
  });
  if (!ringProto) return 'no ring prototype';
  const Ring = ringProto.constructor;
  for (const o of fans) {
    o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    const r = (bb.max.x - bb.min.x) / 2;
    // Same disc, but with radial rings so no triangle spans the whole apron.
    const g = new Ring(0.4, r, 96, 48);
    g.rotateX(-Math.PI / 2);
    const uvScale = o.userData.__uvScale || 24;
    const uv = g.attributes.uv;
    const pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / uvScale, pos.getZ(i) / uvScale);
    o.geometry = g;
  }
  return fans.length;
});
console.log('swapped fans:', swapped);
await shot('i_tessellated');

await browser.close();
process.exit(0);
