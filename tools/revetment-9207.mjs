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

// Walk in from the pad centre towards each hardstand. What matters is that the
// player gets through the revetment line, so the result is measured in the
// hardstand's own frame: how far past the near flank they ended up. Stopping
// short of the dead centre is expected — the launcher is parked on it.
const walks = await page.evaluate(() => {
  const G = window.__GAME;
  // Mirrors HARDSTANDS in src/base.js.
  const hardstands = [
    { name: 'HAWKEYE 1', pos: [-64, 3], size: [36, 68], yaw: 0.03 },
    { name: 'LONGVIEW 2', pos: [66, -11], size: [42, 76], yaw: -0.08 },
    { name: 'IRONWOOD 3', pos: [4, -96], size: [50, 44], yaw: 0.05 },
  ];
  const out = [];
  const p = G.game.player;
  for (const hs of hardstands) {
    const long = hs.size[1] > hs.size[0];
    const half = long ? hs.size[0] / 2 : hs.size[1] / 2;
    const dirYaw = long ? hs.yaw : hs.yaw + Math.PI / 2;
    // Outward normal of the flanks; the near flank is the one facing the pad.
    const ox = Math.cos(dirYaw);
    const oz = -Math.sin(dirYaw);
    const flank = half + 1.6;
    const [tx, tz] = hs.pos;
    // Signed distance out along the flank normal, measured from the centre.
    const outward = (x, z) => (x - tx) * ox + (z - tz) * oz;
    const startOut = outward(0, 0);
    const side = Math.sign(startOut);

    G.teleport(0, undefined, 0);
    const d0 = Math.hypot(tx, tz);
    p.keys.add('KeyW');
    p.keys.add('ShiftLeft');
    let closest = d0;
    for (let i = 0; i < 3000; i++) {
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
    const endOut = outward(p.pos.x, p.pos.z);
    out.push({
      name: hs.name,
      startDist: Math.round(d0),
      endDist: Number(Math.hypot(tx - p.pos.x, tz - p.pos.z).toFixed(1)),
      at: [Number(p.pos.x.toFixed(1)), Number(p.pos.z.toFixed(1))],
      nearFlankAt: Number((side * flank).toFixed(1)),
      endedAt: Number(endOut.toFixed(1)),
      insideRing: side > 0 ? endOut < flank : endOut > -flank,
      metresPastFlank: Number((flank - side * endOut).toFixed(1)),
    });
  }
  return out;
});
console.log('walk-in from pad centre:', JSON.stringify(walks, null, 2));
const blocked = walks.filter((w) => !w.insideRing);
console.log(blocked.length ? `BLOCKED OUTSIDE THE RING: ${blocked.map((w) => w.name).join(', ')}` : 'all three approach lanes clear');

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
