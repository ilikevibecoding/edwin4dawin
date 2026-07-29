/**
 * Scratch diagnostic: fire the bake's portal rays by hand and report what each
 * one actually hit. No bake, so it costs only the engine boot. Not built.
 *
 *   node tools/.lgt-aim.mjs [shot]
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
  protocolTimeout: 1200000,
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
  for (let i = 0; i < 4; i++) engine.step(1 / 60);

  const physics = engine.get('physics');
  const world = engine.get('world');
  const cam = engine.camera;
  const r3 = (v) => Math.round(v * 1000) / 1000;

  const MASK = 1 | 2 | 8;
  const hit = {
    point: new THREE.Vector3(), normal: new THREE.Vector3(),
    distance: 0, object: new THREE.Object3D(), surface: 'concrete',
  };

  /* traceOpaque, transcribed. */
  const walk = new THREE.Vector3();
  const trace = (origin, dir, maxDistance) => {
    let travelled = 0;
    let through = 1;
    const crossed = [];
    walk.copy(origin);
    for (let pane = 0; ; pane++) {
      const remaining = maxDistance - travelled;
      if (remaining <= 0) return { through, travelled, crossed, stopped: null };
      if (!physics.raycastInto(walk, dir, remaining, hit, MASK)) {
        return { through, travelled, crossed, stopped: null };
      }
      travelled += hit.distance;
      if (hit.surface !== 'glass' || pane >= 3) {
        return {
          through: 0, travelled, crossed,
          stopped: { surface: hit.surface, name: hit.object.name, at: hit.point.clone() },
        };
      }
      crossed.push(hit.surface);
      through *= 0.72;
      walk.copy(hit.point).addScaledVector(dir, 0.05);
      travelled += 0.05;
    }
  };

  const room = (world.rooms ?? []).find(
    (r) => cam.position.x > r.rect.x0 && cam.position.x < r.rect.x1 &&
           cam.position.z > r.rect.z0 && cam.position.z < r.rect.z1 &&
           cam.position.y > r.y - 0.5 && cam.position.y < r.y + r.height + 0.5);
  if (!room) return { error: 'camera is not in a registered room' };

  const portals = world.portals;
  /* Openings on this room's own walls, to place the near-window sample. */
  const mine = portals.filter(
    (p) => p.x > room.rect.x0 - 1 && p.x < room.rect.x1 + 1 &&
           p.z > room.rect.z0 - 1 && p.z < room.rect.z1 + 1 &&
           p.y > room.y && p.y < room.y + room.height &&
           p.transmission > 0.5,
  );
  mine.sort((a, b) => b.width * b.height - a.width * a.height);
  const spots = [
    ['room centre', new THREE.Vector3(
      (room.rect.x0 + room.rect.x1) / 2, room.y + 1.2, (room.rect.z0 + room.rect.z1) / 2)],
  ];
  if (mine.length > 0) {
    const w = mine[0];
    spots.push(['1.5 m inside the widest clear opening', new THREE.Vector3(
      w.x - w.nx * 1.5, room.y + 1.2, w.z - w.nz * 1.5)]);
  }

  const survey = (origin) => {
  const near = portals
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => {
      const dx = p.x - origin.x, dz = p.z - origin.z;
      const depth = dx * p.nx + dz * p.nz;
      if (depth <= 0.05 || depth > 14) return false;
      return dx * dx + dz * dz < 26 * 26;
    })
    .map(({ p, i }) => {
      const dx = p.x - origin.x, dy = p.y - origin.y, dz = p.z - origin.z;
      const depth = dx * p.nx + dz * p.nz;
      const distSq = dx * dx + dy * dy + dz * dz;
      const distance = Math.sqrt(distSq);
      let omega = (p.width * p.height * p.transmission * (depth / distance)) /
        Math.max(distSq, 0.36);
      const probe = new THREE.Vector3(dx / distance, dy / distance, dz / distance);
      const seen = trace(origin, probe, distance - 0.08).through > 0;
      if (!seen) omega *= 0.04;
      return { p, i, omega, distance, seen };
    })
    .sort((a, b) => b.omega - a.omega)
    .slice(0, 6);

  const dir = new THREE.Vector3();
  const target = new THREE.Vector3();
  const report = [];
  for (const { p, omega, distance, seen } of near) {
    const rows = [];
    const halfW = p.width / 2, halfH = p.height / 2;
    for (let i = 0; i < 9; i++) {
      const u = ((i % 3) + 0.5) / 3 - 0.5;
      const v = (Math.floor(i / 3) + 0.5) / 3 - 0.5;
      target.set(p.x + p.ux * u * 2 * halfW, p.y + v * 2 * halfH, p.z + p.uz * u * 2 * halfW);
      dir.subVectors(target, origin).normalize();
      const t = trace(origin, dir, 32);
      rows.push({
        uv: [r3(u), r3(v)],
        through: r3(t.through),
        travelled: r3(t.travelled),
        panes: t.crossed.length,
        stopped: t.stopped
          ? `${t.stopped.surface} "${t.stopped.name}" at ${r3(t.stopped.at.x)},${r3(t.stopped.at.y)},${r3(t.stopped.at.z)}`
          : 'ESCAPED',
      });
    }
    report.push({
      at: [r3(p.x), r3(p.y), r3(p.z)],
      n: [r3(p.nx), r3(p.nz)],
      size: [r3(p.width), r3(p.height)],
      t: p.transmission,
      omega: r3(omega),
      distance: r3(distance),
      seen,
      rows,
    });
  }
  return { origin: [r3(origin.x), r3(origin.y), r3(origin.z)], report };
  };

  return {
    room: room.name,
    rect: [r3(room.rect.x0), r3(room.rect.z0), r3(room.rect.x1), r3(room.rect.z1)],
    y: r3(room.y), height: r3(room.height),
    totalPortals: portals.length,
    spots: spots.map(([label, origin]) => ({ label, ...survey(origin) })),
  };
}, SHOT);

if (out.error) console.log('ERROR:', out.error);
else {
  console.log(`${out.room}  x,z ${out.rect.join(' .. ')}  floor y ${out.y} height ${out.height}`);
  console.log(`level has ${out.totalPortals} openings\n`);
  for (const spot of out.spots) {
  console.log(`=== ${spot.label} — firing from ${spot.origin.join(',')} ===`);
  for (const p of spot.report) {
    console.log(
      `opening at ${p.at.join(',')} outward ${p.n.join(',')} ${p.size.join(' x ')}` +
      ` pass ${p.t}  ${p.distance} m away, score ${p.omega} sr, centre ${p.seen ? 'visible' : 'BLOCKED'}`,
    );
    let escaped = 0;
    for (const r of p.rows) {
      if (r.stopped === 'ESCAPED') escaped++;
      console.log(
        `   uv ${String(r.uv.join(',')).padEnd(14)} through ${String(r.through).padEnd(6)}` +
        ` panes ${r.panes}  travelled ${String(r.travelled).padEnd(8)} ${r.stopped}`,
      );
    }
    console.log(`   -> ${escaped}/${p.rows.length} rays reached open sky\n`);
  }
  }
}
await browser.close();
