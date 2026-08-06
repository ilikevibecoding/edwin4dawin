// Close views of each emplacement's revetment, plus a walk test down the
// approach lane from the pad centre into every hardstand.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};
const BASE = arg('base', 'http://127.0.0.1:8207');
const OUT = arg('out', '/tmp/hz_rev');

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${BASE}/?test=1&seed=20260805&quality=high`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__READY === true', null, { timeout: 240000 });

await page.evaluate(() => {
  const G = window.__GAME;
  G.action('deploy');
  G.action('tod:day');
  G.runFor(1.0);
  G.hideHud(true);
});

const shot = async (name) => {
  await page.evaluate(() => window.__GAME.render(2));
  await page.screenshot({ path: path.join(OUT, `${name}.png`), timeout: 180000 });
  console.log('  shot', name);
};

// Stand just outside each emplacement, looking along the wall into the gap.
const views = [
  ['rev_hawkeye', -38, 30, -64, 1.4, 3],
  ['rev_longview', 98, 22, 66, 1.4, -11],
  ['rev_ironwood', 38, -66, 4, 1.4, -96],
];
for (const [name, px, pz, tx, ty, tz] of views) {
  await page.evaluate(
    ([a, b, c, d, e]) => {
      const G = window.__GAME;
      G.teleport(a, undefined, b);
      G.lookAt(c, d, e);
      G.runFor(0.2);
    },
    [px, pz, tx, ty, tz]
  );
  await shot(name);
}

// Walk in from the pad centre towards each hardstand and report where the
// player ends up: the approach lane has to let them through.
const walks = await page.evaluate(() => {
  const G = window.__GAME;
  const targets = [
    ['HAWKEYE 1', -64, 3],
    ['LONGVIEW 2', 66, -11],
    ['IRONWOOD 3', 4, -96],
  ];
  const out = [];
  const p = G.game.player;
  for (const [name, tx, tz] of targets) {
    G.teleport(0, undefined, 0);
    const d = Math.hypot(tx, tz);
    p.keys.add('KeyW');
    p.keys.add('ShiftLeft');
    let closest = d;
    for (let i = 0; i < 3000; i++) {
      // Drive the collide-and-slide movement straight at the target.
      const dx = tx - p.pos.x;
      const dz = tz - p.pos.z;
      const len = Math.hypot(dx, dz);
      closest = Math.min(closest, len);
      if (len < 1.5) break;
      p.yaw = Math.atan2(-dx / len, -dz / len);
      G.runFor(1 / 60);
    }
    p.keys.delete('KeyW');
    p.keys.delete('ShiftLeft');
    out.push({
      name,
      startDist: Math.round(d),
      closest: Number(closest.toFixed(1)),
      endDist: Number(Math.hypot(tx - p.pos.x, tz - p.pos.z).toFixed(1)),
      at: [Number(p.pos.x.toFixed(1)), Number(p.pos.z.toFixed(1))],
    });
  }
  return out;
});
console.log('walk-in from pad centre:', JSON.stringify(walks, null, 2));

const heights = await page.evaluate(() => {
  const G = window.__GAME;
  let bags = null;
  G.game.scene.traverse((o) => {
    if (o.isInstancedMesh && o.geometry.type === 'SphereGeometry' && o.count > 500) bags = o;
  });
  if (!bags) return null;
  bags.geometry.computeBoundingBox();
  const bh = bags.geometry.boundingBox.max.y - bags.geometry.boundingBox.min.y;
  const m = new (G.game.camera.matrixWorld.constructor)();
  let top = 0;
  for (let i = 0; i < bags.count; i++) {
    bags.getMatrixAt(i, m);
    top = Math.max(top, m.elements[13]);
  }
  return { instances: bags.count, bagHeight: +bh.toFixed(2), topCentre: +top.toFixed(2), crest: +(top + bh / 2).toFixed(2) };
});
console.log('revetment:', JSON.stringify(heights));

await browser.close();
process.exit(0);
