/**
 * Scratch diagnostic: the cells an interior surface reads, and whether they are
 * entitled to the light they hold.
 *
 * The trilinear read that shades a room blends eight cells, and any one of them
 * standing in a wall or in the street brings that surface its own light. This
 * lists every cell in a box of grid indices with the three things that decide
 * whether it is legitimate — where it ended up after relocation, whether the
 * trace judged it buried, and whether anything at all can be seen from it —
 * beside the harmonics it is handing out.
 *
 *   node tools/.lgt-leak.mjs [shot] [ix0 ix1 iy0 iy1 iz0 iz1]
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const SHOT = process.argv[2] ?? 'cafe_window';
const BOX = process.argv.slice(3).map(Number);
const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--window-size=320,180',
  ],
  protocolTimeout: 2400000,
  defaultViewport: { width: 320, height: 180 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 200)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 600000, polling: 250 });
await page.waitForFunction((s) => window.__GAME__?.listShots?.().includes(s), {
  timeout: 600000, polling: 250,
}, SHOT);

const out = await page.evaluate(async (shot, box) => {
  const g = window.__GAME__;
  const THREE = g.THREE;
  const engine = g.engine;
  g.pose(shot);

  const lighting = engine.get('lighting');
  const physics = engine.get('physics');
  const volume = lighting.volume;

  for (let i = 0; i < 4000 && (!volume.ready || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 4000 && (volume.pendingRelight || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 4000 && !volume.stats.reflectance; i++) engine.step(1 / 60);
  for (let i = 0; i < 60; i++) engine.step(1 / 60);

  const r3 = (v) => Math.round(v * 1000) / 1000;
  const r4 = (v) => Math.round(v * 10000) / 10000;
  const MASK = (1 << 0) | (1 << 3) | (1 << 6);
  const hit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: '' };
  const walk = new THREE.Vector3();
  const D = new THREE.Vector3();
  const GLAZING = Math.sqrt(0.72), LAYERS = 6;
  function traceOpaque(origin, dir, maxDist, o) {
    let travelled = 0, through = 1;
    walk.copy(origin);
    for (let pane = 0; ; pane++) {
      const remaining = maxDist - travelled;
      if (remaining <= 0) return through;
      if (!physics.raycastInto(walk, dir, remaining, o, MASK)) return through;
      travelled += o.distance;
      if (o.surface !== 'glass' || pane >= LAYERS) { o.distance = travelled; return 0; }
      through *= GLAZING;
      walk.copy(o.point).addScaledVector(dir, 0.05);
      travelled += 0.05;
    }
  }

  /* An independent read of the two things the bake decides about a cell: how
     much of the sphere really escapes, and how close the nearest surface is. */
  const N = 256;
  const golden = Math.PI * (3 - Math.sqrt(5));
  function survey(p) {
    let open = 0, near = 0, nearest = Infinity;
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N;
      const r = Math.sqrt(Math.max(1 - y * y, 0));
      const t = golden * i;
      D.set(Math.cos(t) * r, y, Math.sin(t) * r);
      const through = traceOpaque(p, D, 250, hit);
      if (through > 0) { open += through / N; continue; }
      if (hit.distance < 0.5) near++;
      if (hit.distance < nearest) nearest = hit.distance;
    }
    return { open: r4(open), nearFrac: r3(near / N), nearest: r3(nearest) };
  }

  const res = volume.resolution;
  const cell = volume.cell;
  const min = volume.bounds.min;
  const [ix0, ix1, iy0, iy1, iz0, iz1] = box.length === 6 ? box
    : [14, 15, 14, 16, 12, 12];

  /* What the bake's own dilation would choose for a cell, worked out here so a
     source that is picked but not applied is distinguishable from one that was
     never eligible. */
  const pickSource = (p) => {
    const ix = p % res.x, iy = Math.floor(p / res.x) % res.y, iz = Math.floor(p / (res.x * res.y));
    let best = Infinity, from = -1;
    for (let axis = 0; axis < 3; axis++) {
      const limit = axis === 0 ? res.x : axis === 1 ? res.y : res.z;
      const index = axis === 0 ? ix : axis === 1 ? iy : iz;
      const stride = axis === 0 ? 1 : axis === 1 ? res.x : res.x * res.y;
      for (let side = -1; side <= 1; side += 2) {
        if (index + side < 0 || index + side >= limit) continue;
        const q = p + side * stride;
        if (volume.portalSlot[q] < 0) continue;
        const dc = volume.sh[q * 27] + volume.sh[q * 27 + 1] + volume.sh[q * 27 + 2];
        if (dc >= best) continue;
        best = dc; from = q;
      }
    }
    return { from, best: Math.round(best * 10000) / 10000 };
  };

  /* Run the real pass again and see whether it moves anything. If it does, the
     pass works and something after it is putting the light back. */
  const before = volume.sh.slice();
  volume.dilateHarmonics();
  const afterDilate = volume.sh.slice();
  volume.sh.set(before);

  const rows = [];
  for (let iz = iz0; iz <= iz1; iz++)
  for (let iy = iy0; iy <= iy1; iy++)
  for (let ix = ix0; ix <= ix1; ix++) {
    if (ix < 0 || iy < 0 || iz < 0 || ix >= res.x || iy >= res.y || iz >= res.z) continue;
    const p = ix + res.x * (iy + res.y * iz);
    const chose = pickSource(p);
    const slot = new THREE.Vector3(min.x + ix * cell.x, min.y + iy * cell.y, min.z + iz * cell.z);
    const at = new THREE.Vector3(
      volume.positions[p * 3], volume.positions[p * 3 + 1], volume.positions[p * 3 + 2]);
    const w = 27;
    rows.push({
      idx: [ix, iy, iz],
      slot: [r3(slot.x), r3(slot.y), r3(slot.z)],
      at: [r3(at.x), r3(at.y), r3(at.z)],
      moved: r3(at.distanceTo(slot)),
      interred: volume.interred[p],
      enclosed: volume.portalSlot[p] >= 0 ? 1 : 0,
      open: r4(volume.visibility[p * 4 + 3]),
      bent: [r3(volume.visibility[p * 4]), r3(volume.visibility[p * 4 + 1]), r3(volume.visibility[p * 4 + 2])],
      dc: r4(volume.sh[p * w]),
      redilated: r4(afterDilate[p * w]),
      wouldPick: chose.from >= 0
        ? `[${chose.from % res.x},${Math.floor(chose.from / res.x) % res.y},${Math.floor(chose.from / (res.x * res.y))}] sum=${chose.best}`
        : 'none',
      iso: r4(volume.shSpread[p * w]),
      truth: survey(at),
      truthSlot: survey(slot),
    });
  }

  return {
    grid: `${res.x}x${res.y}x${res.z}`, cell: [r3(cell.x), r3(cell.y), r3(cell.z)],
    min: [r3(min.x), r3(min.y), r3(min.z)],
    stats: volume.stats, rows,
  };
}, SHOT, BOX);

const pad = (v, n) => String(v).padEnd(n);
console.log(`grid ${out.grid}  cell ${out.cell.join(' x ')}  min ${out.min.join(',')}`);
console.log('stats:', JSON.stringify(out.stats), '\n');
console.log(pad('idx', 11) + pad('relocated', 21) + pad('moved', 7) +
  pad('intd', 5) + pad('encl', 5) + pad('open', 8) + pad('dc', 9) + pad('re-dil', 9) +
  pad('iso', 8) + pad('trueOpen', 10) + pad('nr<.5', 7) + pad('nearest', 8) + 'dilation would take');
for (const r of out.rows) {
  console.log(pad(r.idx.join(','), 11) + pad(r.at.join(','), 21) +
    pad(r.moved, 7) + pad(r.interred, 5) + pad(r.enclosed, 5) + pad(r.open, 8) +
    pad(r.dc, 9) + pad(r.redilated, 9) + pad(r.iso, 8) +
    pad(r.truth.open, 10) + pad(r.truth.nearFrac, 7) + pad(r.truth.nearest, 8) + r.wouldPick);
}
await browser.close();
