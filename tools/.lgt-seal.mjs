/**
 * Scratch diagnostic: what actually seals the cafe. Not part of the build.
 *
 * The dense sphere trace says an interior point sees 0.2% of the sky even when
 * the march is allowed through glazing, which is a sealed box. Either the
 * openings are not holes in the collision world or something is parked behind
 * them. This asks the rays what they hit, by name.
 *
 *   node tools/.lgt-seal.mjs
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--window-size=480,270',
  ],
  protocolTimeout: 900000,
  defaultViewport: { width: 480, height: 270 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 300)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 300000, polling: 250 });
await page.waitForFunction(() => window.__GAME__.listShots().includes('cafe_window'), {
  timeout: 300000, polling: 250,
});

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const THREE = g.THREE;
  const engine = g.engine;
  g.pose('cafe_window');
  for (let i = 0; i < 60; i++) engine.step(1 / 60);

  const physics = engine.get('physics');
  const world = engine.get('world');
  const cam = engine.camera;
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const MASK = 0xffff;

  const hit = {
    point: new THREE.Vector3(), normal: new THREE.Vector3(),
    distance: 0, object: new THREE.Object3D(), surface: 'concrete',
  };
  const dir = new THREE.Vector3();
  const walk = new THREE.Vector3();

  /* The bake's march: glazing passes, anything else stops it. Returns the
     blocking chunk, or null when the ray got out. */
  function march(from, d, maxDistance) {
    let travelled = 0;
    walk.copy(from);
    for (let pane = 0; pane < 4; pane++) {
      const remaining = maxDistance - travelled;
      if (remaining <= 0) return null;
      if (!physics.raycastInto(walk, d, remaining, hit, MASK)) return null;
      travelled += hit.distance;
      if (hit.surface !== 'glass') {
        return { name: hit.object?.name ?? '?', surface: hit.surface, distance: travelled };
      }
      travelled += 0.05;
      walk.copy(hit.point).addScaledVector(d, 0.05);
    }
    return { name: 'glass-stack', surface: 'glass', distance: travelled };
  }

  /* Every room the town registered, so the probe point is the real interior
     rather than somewhere I guessed. */
  const rooms = (world.rooms ?? []).map((r) => ({
    name: r.name,
    rect: [r.rect.x0, r.rect.z0, r.rect.x1, r.rect.z1].map(r3),
    y: r3(r.y),
    height: r3(r.height),
    centre: [r3((r.rect.x0 + r.rect.x1) / 2), r3(r.y + 1.6), r3((r.rect.z0 + r.rect.z1) / 2)],
    containsCamera:
      cam.position.x > r.rect.x0 && cam.position.x < r.rect.x1 &&
      cam.position.z > r.rect.z0 && cam.position.z < r.rect.z1 &&
      cam.position.y > r.y - 0.5 && cam.position.y < r.y + r.height + 0.5,
  }));

  const here = rooms.find((r) => r.containsCamera) ?? null;
  const probe = here
    ? new THREE.Vector3(here.centre[0], here.centre[1], here.centre[2])
    : cam.position.clone();

  /* Dense census from the room centre: who blocks, how often, how near. */
  const golden = Math.PI * (3 - Math.sqrt(5));
  const N = 4096;
  const blockers = new Map();
  let escaped = 0;
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(Math.max(1 - y * y, 0));
    const th = golden * i;
    dir.set(Math.cos(th) * r, y, Math.sin(th) * r);
    const b = march(probe, dir, 40);
    if (!b) { escaped++; continue; }
    const key = `${b.name} [${b.surface}]`;
    const e = blockers.get(key) ?? { count: 0, near: Infinity, far: 0 };
    e.count++;
    e.near = Math.min(e.near, b.distance);
    e.far = Math.max(e.far, b.distance);
    blockers.set(key, e);
  }

  const census = [...blockers.entries()]
    .map(([name, e]) => ({ name, count: e.count, pct: r3((100 * e.count) / N), near: r3(e.near), far: r3(e.far) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 14);

  /* A horizontal sweep at chest height: where are the walls, and how far. */
  const sweep = [];
  for (let a = 0; a < 36; a++) {
    const th = (a / 36) * Math.PI * 2;
    dir.set(Math.cos(th), 0, Math.sin(th));
    const b = march(probe, dir, 40);
    sweep.push({
      deg: Math.round((th * 180) / Math.PI),
      d: b ? r3(b.distance) : 'OPEN',
      what: b ? `${b.name} [${b.surface}]` : '-',
    });
  }

  /* Straight at the window wall from a metre inside it, stepping up in height:
     if there is an opening this finds it. */
  const column = [];
  if (here) {
    for (let k = 0; k < 14; k++) {
      const y = here.y + 0.3 + k * 0.25;
      const from = new THREE.Vector3(here.centre[0], y, here.centre[2]);
      let bestName = '-', bestD = 0, open = 0;
      for (let a = 0; a < 72; a++) {
        const th = (a / 72) * Math.PI * 2;
        dir.set(Math.cos(th), 0, Math.sin(th));
        const b = march(from, dir, 40);
        if (!b) { open++; bestName = 'OPEN'; bestD = 40; }
        else if (b.distance > bestD) { bestD = b.distance; bestName = `${b.name}`; }
      }
      column.push({ y: r3(y), openOf72: open, furthest: r3(bestD), what: bestName });
    }
  }

  return {
    camera: cam.position.toArray().map(r3),
    here,
    roomCount: rooms.length,
    nearbyRooms: rooms
      .filter((r) => Math.hypot(r.centre[0] - cam.position.x, r.centre[2] - cam.position.z) < 20)
      .slice(0, 8),
    probe: probe.toArray().map(r3),
    escapedPct: r3((100 * escaped) / N),
    census, sweep, column,
  };
});

const pad = (v, n) => String(v).padEnd(n);
console.log(`camera ${out.camera.join(', ')}  rooms in level ${out.roomCount}`);
console.log(`room containing camera: ${out.here ? out.here.name : 'NONE'}`);
if (out.here) console.log(`  rect ${out.here.rect.join(', ')}  y ${out.here.y} h ${out.here.height}`);
console.log('\n-- rooms within 20 m --');
for (const r of out.nearbyRooms) {
  console.log(`  ${pad(r.name, 18)} rect ${pad(r.rect.join(','), 30)} y ${pad(r.y, 7)} h ${r.height}`);
}
console.log(`\n-- 4096-ray census from ${out.probe.join(', ')} : ${out.escapedPct}% escaped --`);
for (const c of out.census) {
  console.log(`  ${pad(c.pct + '%', 8)} ${pad(c.name, 44)} near ${pad(c.near, 8)} far ${c.far}`);
}
console.log('\n-- horizontal sweep at chest height --');
for (const s of out.sweep) {
  console.log(`  ${pad(s.deg + ' deg', 9)} ${pad(s.d, 8)} ${s.what}`);
}
console.log('\n-- rising through the room, 72 rays round the compass --');
for (const c of out.column) {
  console.log(`  y ${pad(c.y, 8)} open ${pad(c.openOf72 + '/72', 8)} furthest ${pad(c.furthest, 8)} ${c.what}`);
}
await browser.close();
