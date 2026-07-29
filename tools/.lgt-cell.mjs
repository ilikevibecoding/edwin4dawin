/**
 * Scratch diagnostic: what is actually stored in the grid cells a room reads.
 *
 * Dumps, for every cell in a slab through the room the shot is posed in, where
 * the probe was traced from after relocation, whether it was flagged buried,
 * what openness it ended with, and how big its harmonics are — then classifies
 * the traced origin by firing a short sphere trace from it, so a cell holding
 * the street's bounce while sitting inside a wall is visible as such.
 *
 *   node tools/.lgt-cell.mjs [shot]
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const SHOT = process.argv[2] ?? 'cafe_window';
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

const out = await page.evaluate(async (shot) => {
  const g = window.__GAME__;
  const THREE = g.THREE;
  const engine = g.engine;
  g.pose(shot);

  const lighting = engine.get('lighting');
  const physics = engine.get('physics');
  const world = engine.get('world');
  const volume = lighting.volume;
  const cam = engine.camera;

  for (let i = 0; i < 4000 && (!volume.ready || volume.baking); i++) engine.step(1 / 60);
  /* `ready` goes true when the geometric bake lands; the projection and the
     interreflection run afterwards off the relight flag, and the harmonics are
     all zero until they finish. `reflectance` is written at the end of the
     projection, so it is the flag that says the grid holds anything. */
  for (let i = 0; i < 4000 && !volume.stats.reflectance; i++) engine.step(1 / 60);
  for (let i = 0; i < 200; i++) engine.step(1 / 60);

  const r3 = (v) => Math.round(v * 1000) / 1000;
  const r4 = (v) => Math.round(v * 10000) / 10000;

  const MASK = (1 << 0) | (1 << 3) | (1 << 6);
  const hit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: '' };
  const walk = new THREE.Vector3();
  function traceOpaque(origin, dir, maxDist, out) {
    let travelled = 0, through = 1;
    walk.copy(origin);
    for (let pane = 0; ; pane++) {
      const remaining = maxDist - travelled;
      if (remaining <= 0) return through;
      if (!physics.raycastInto(walk, dir, remaining, out, MASK)) return through;
      travelled += out.distance;
      if (out.surface !== 'glass' || pane >= 3) { out.distance = travelled; return 0; }
      through *= 0.72;
      walk.copy(out.point).addScaledVector(dir, 0.05);
      travelled += 0.05;
    }
  }

  /* Coarse independent openness at a point, to say whether it is in a room, in
     the street, or inside solid, without trusting anything the bake stored. */
  const D = new THREE.Vector3();
  function probeOpen(x, y, z) {
    const N = 64, p = new THREE.Vector3(x, y, z);
    const golden = Math.PI * (3 - Math.sqrt(5));
    let open = 0, near = 0;
    for (let i = 0; i < N; i++) {
      const yy = 1 - (2 * (i + 0.5)) / N;
      const r = Math.sqrt(Math.max(1 - yy * yy, 0));
      const t = golden * i;
      D.set(Math.cos(t) * r, yy, Math.sin(t) * r);
      if (traceOpaque(p, D, 120, hit) > 0) open++;
      else if (hit.distance < 0.6) near++;
    }
    return { open: open / N, near: near / N };
  }

  const room = (world.rooms ?? []).find(
    (r) => cam.position.x > r.rect.x0 && cam.position.x < r.rect.x1 &&
           cam.position.z > r.rect.z0 && cam.position.z < r.rect.z1 &&
           cam.position.y > r.y - 0.5 && cam.position.y < r.y + r.height + 0.5);
  if (!room) return { error: 'camera is not in a registered room' };

  const res = volume.resolution, min = volume.bounds.min, cell = volume.cell;
  const cz = (room.rect.z0 + room.rect.z1) / 2;
  const kz = Math.max(0, Math.min(res.z - 1, Math.round((cz - min.z) / cell.z)));

  const x0 = Math.max(0, Math.round((room.rect.x0 - min.x) / cell.x) - 1);
  const x1 = Math.min(res.x - 1, Math.round((room.rect.x1 - min.x) / cell.x) + 1);
  const y0 = Math.max(0, Math.round((room.y - min.y) / cell.y) - 1);
  const y1 = Math.min(res.y - 1, Math.round((room.y + room.height - min.y) / cell.y) + 1);

  const cells = [];
  for (let iy = y1; iy >= y0; iy--) {
    for (let ix = x0; ix <= x1; ix++) {
      const p = ix + res.x * (iy + res.y * kz);
      const cx = min.x + ix * cell.x;
      const cy = min.y + iy * cell.y;
      const ccz = min.z + kz * cell.z;
      const tx = volume.positions[p * 3], ty = volume.positions[p * 3 + 1], tz = volume.positions[p * 3 + 2];
      const moved = Math.hypot(tx - cx, ty - cy, tz - ccz);
      const truth = probeOpen(tx, ty, tz);
      const atSlot = probeOpen(cx, cy, ccz);
      cells.push({
        ix, iy, cx: r3(cx), cy: r3(cy),
        moved: r3(moved),
        open: r4(volume.visibility[p * 4 + 3]),
        bent: [r3(volume.visibility[p * 4]), r3(volume.visibility[p * 4 + 1]), r3(volume.visibility[p * 4 + 2])],
        slot: volume.portalSlot ? volume.portalSlot[p] : -2,
        dc: r4(volume.sh[p * 27]),
        dcSpread: r4(volume.shSpread[p * 27]),
        trueOpen: r4(truth.open), trueNear: r4(truth.near),
        slotOpen: r4(atSlot.open), slotNear: r4(atSlot.near),
      });
    }
  }

  return {
    room: room.name, kz,
    min: [r3(min.x), r3(min.y), r3(min.z)],
    rect: [r3(room.rect.x0), r3(room.rect.x1), r3(room.rect.z0), r3(room.rect.z1)],
    y: r3(room.y), h: r3(room.height),
    grid: `${res.x}x${res.y}x${res.z}`, cell: [r3(cell.x), r3(cell.y), r3(cell.z)],
    stats: lighting.debugReport ? lighting.debugReport() : null,
    cells,
  };
}, SHOT);

if (out.error) console.log('ERROR:', out.error);
else {
  const pad = (v, n) => String(v).padEnd(n);
  console.log(`${out.room} x ${out.rect[0]}..${out.rect[1]} z ${out.rect[2]}..${out.rect[3]} y ${out.y} h ${out.h}`);
  console.log(`grid ${out.grid} cell ${out.cell.join('x')} min ${out.min.join(',')} slab kz=${out.kz}\n`);
  console.log(pad('cell', 12) + pad('world', 18) + pad('moved', 8) + pad('rigOpen', 9) +
    pad('trueOpen', 10) + pad('trueNear', 10) + pad('slotOpen', 10) + pad('slot', 6) +
    pad('dc', 10) + pad('dcSpread', 10) + 'bent');
  let lastY = null;
  for (const c of out.cells) {
    if (lastY !== null && c.iy !== lastY) console.log('');
    lastY = c.iy;
    console.log(
      pad(`[${c.ix},${c.iy}]`, 12) + pad(`${c.cx},${c.cy}`, 18) + pad(c.moved, 8) +
      pad(c.open, 9) + pad(c.trueOpen, 10) + pad(c.trueNear, 10) + pad(c.slotOpen, 10) +
      pad(c.slot, 6) + pad(c.dc, 10) + pad(c.dcSpread, 10) + c.bent.join(','),
    );
  }
  if (out.stats) console.log('\n' + JSON.stringify(out.stats, null, 1).slice(0, 1500));
}
await browser.close();
