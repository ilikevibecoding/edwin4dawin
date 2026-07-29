/**
 * Scratch diagnostic: did the bake find the room's openings, and what came
 * back through them. Not built.
 *
 *   node tools/.lgt-portal.mjs [shot]
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

const out = await page.evaluate((shot) => {
  const g = window.__GAME__;
  const THREE = g.THREE;
  const engine = g.engine;
  g.pose(shot);

  const lighting = engine.get('lighting');
  const world = engine.get('world');
  const volume = lighting.volume;
  const cam = engine.camera;

  for (let i = 0; i < 4000 && (!volume.ready || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 20; i++) engine.step(1 / 60);

  const r3 = (v) => Math.round(v * 1000) / 1000;
  const r5 = (v) => Math.round(v * 100000) / 100000;

  const room = (world.rooms ?? []).find(
    (r) => cam.position.x > r.rect.x0 && cam.position.x < r.rect.x1 &&
           cam.position.z > r.rect.z0 && cam.position.z < r.rect.z1 &&
           cam.position.y > r.y - 0.5 && cam.position.y < r.y + r.height + 0.5);
  if (!room) return { error: 'camera is not in a registered room' };

  const res = volume.resolution;
  const cell = volume.cell;
  const min = volume.bounds.min;
  const ci = (x, y, z) => [
    Math.round((x - min.x) / cell.x),
    Math.round((y - min.y) / cell.y),
    Math.round((z - min.z) / cell.z),
  ];
  const lo = ci(room.rect.x0, room.y, room.rect.z0);
  const hi = ci(room.rect.x1, room.y + room.height, room.rect.z1);

  /* Openings whose centre falls in or on the room's cell range. */
  const near = [];
  const PS = 12;
  for (let i = 0; i < volume.portalCount; i++) {
    const b = i * PS;
    const px = volume.portals[b], py = volume.portals[b + 1], pz = volume.portals[b + 2];
    if (px < room.rect.x0 - 2.5 || px > room.rect.x1 + 2.5) continue;
    if (pz < room.rect.z0 - 2.5 || pz > room.rect.z1 + 2.5) continue;
    if (py < room.y - 1 || py > room.y + room.height + 1) continue;
    near.push({
      at: [r3(px), r3(py), r3(pz)],
      n: [r3(volume.portals[b + 3]), r3(volume.portals[b + 5])],
      size: [r3(volume.portals[b + 9] * 2), r3(volume.portals[b + 10] * 2)],
      t: r3(volume.portals[b + 11]),
    });
  }

  /* Every cell inside the room: is it enclosed, what did it measure. */
  const cells = [];
  for (let iy = lo[1]; iy <= hi[1]; iy++) {
    for (let ix = Math.max(0, lo[0] - 3); ix <= Math.min(res.x - 1, hi[0] + 3); ix++) {
      const iz = Math.round(((room.rect.z0 + room.rect.z1) / 2 - min.z) / cell.z);
      if (ix < 0 || iy < 0 || iz < 0 || ix >= res.x || iy >= res.y || iz >= res.z) continue;
      const p = ix + res.x * (iy + res.y * iz);
      const home = volume.portalSlot[p];
      let fired = 0;
      let omega = 0;
      let escaped = 0;
      let hits = 0;
      if (home >= 0) {
        const PR = 64, PRS = 12;
        for (let r = 0; r < PR; r++) {
          const s = (home * PR + r) * PRS;
          const alb = volume.portalRays[s] + volume.portalRays[s + 1] + volume.portalRays[s + 2];
          const w = volume.portalRays[s + 8];
          const dir = volume.portalRays[s + 9] || volume.portalRays[s + 10] || volume.portalRays[s + 11];
          if (dir === 0) continue;
          fired++;
          if (alb > 0) { hits++; omega += w; } else escaped++;
        }
      }
      const v = p * 4;
      const sh = p * 27;
      cells.push({
        i: [ix, iy, iz],
        y: r3(min.y + iy * cell.y),
        x: r3(min.x + ix * cell.x),
        at: [r3(volume.positions[p * 3]), r3(volume.positions[p * 3 + 1]), r3(volume.positions[p * 3 + 2])],
        link: [r3(volume.links[p * 3]), r3(volume.links[p * 3 + 1]), r3(volume.links[p * 3 + 2])],
        enclosed: home >= 0,
        open: r5(volume.visibility[v + 3]),
        bent: [r3(volume.visibility[v]), r3(volume.visibility[v + 1]), r3(volume.visibility[v + 2])],
        fired, omega: r5(omega), escaped, hits,
        dc: r5(volume.sh[sh]),
        iso: r5(volume.shSpread[sh]),
      });
    }
  }

  return {
    room: room.name,
    stats: volume.stats,
    grid: `${res.x}x${res.y}x${res.z}`,
    cell: [r3(cell.x), r3(cell.y), r3(cell.z)],
    near, cells,
  };
}, SHOT);

if (out.error) { console.log('ERROR:', out.error); }
else {
  const pad = (v, n) => String(v).padEnd(n);
  console.log(`${out.room}  grid ${out.grid}  cell ${out.cell.join(' x ')}`);
  console.log('bake stats:', JSON.stringify(out.stats));
  console.log(`\nopenings near this room: ${out.near.length}`);
  for (const p of out.near.slice(0, 24)) {
    console.log(
      `   at ${pad(p.at.join(','), 24)} outward ${pad(p.n.join(','), 14)}` +
      ` ${pad(p.size.join(' x '), 14)} pass ${p.t}`,
    );
  }
  console.log('\ncells across the room at mid-depth');
  console.log(
    pad('index', 11) + pad('x', 8) + pad('y', 7) + pad('encl', 6) + pad('open', 10) +
    pad('rays', 6) + pad('outward', 9) + pad('bounce', 8) + pad('bounceSr', 10) +
    pad('bent', 20) + pad('dc', 10) + 'iso',
  );
  for (const c of out.cells) {
    console.log(
      pad(c.i.join(','), 11) + pad(c.x, 8) + pad(c.y, 7) +
      pad(c.enclosed ? 'yes' : '-', 6) +
      pad(c.open, 10) + pad(c.fired, 6) + pad(c.escaped, 9) + pad(c.hits, 8) +
      pad(c.omega, 10) + pad(c.bent.join(','), 20) + pad(c.dc, 10) + c.iso,
    );
  }
}
await browser.close();
