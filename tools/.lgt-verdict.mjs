/**
 * Scratch diagnostic. Not part of the build.
 *
 * The bake raycasts against the physics world, where a window is a pane of
 * glass with a surface type and a collider. The cascades rasterise the render
 * scene, where the same pane is deliberately left out. So the sun goes through
 * a window and the bake's idea of the sun does not.
 *
 * This measures the size of that disagreement: openness at points inside the
 * cafe, and the fraction of its floor the sun reaches, each computed twice —
 * once with glass opaque, as the bake sees it today, and once marching through
 * it, as the render does.
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
  for (let i = 0; i < 40; i++) engine.step(1 / 60);
  const physics = engine.get('physics');
  const sky = engine.get('sky');

  const hit = {
    point: new THREE.Vector3(), normal: new THREE.Vector3(),
    distance: 0, object: new THREE.Object3D(), surface: 'concrete',
  };
  const dir = new THREE.Vector3();
  const walk = new THREE.Vector3();
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const MASK = 0xffff;

  /* Nearest opaque hit, marching through glazing. Returns the surviving
     fraction when nothing opaque is met, or -1 when something is. */
  function clearance(from, d, maxDistance, glassOpen) {
    let travelled = 0;
    let t = 1;
    walk.copy(from);
    for (let step = 0; step < 5; step++) {
      const remaining = maxDistance - travelled;
      if (remaining <= 0) return t;
      if (!physics.raycastInto(walk, d, remaining, hit, MASK)) return t;
      travelled += hit.distance + 0.02;
      if (!glassOpen || hit.surface !== 'glass') return -1;
      t *= 0.72;
      walk.copy(hit.point).addScaledVector(d, 0.02);
    }
    return -1;
  }

  const spots = [
    ['mid-room', new THREE.Vector3(-11.0, 5.6, -6.0)],
    ['near-floor', new THREE.Vector3(-11.0, 4.9, -6.0)],
    ['by-window', new THREE.Vector3(-11.0, 5.9, -10.4)],
    ['west-end', new THREE.Vector3(-14.5, 5.6, -8.0)],
  ];
  const N = 1024;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const rows = [];
  for (const [label, p] of spots) {
    const entry = { label, at: p.toArray().map(r3) };
    for (const glassOpen of [false, true]) {
      let open = 0;
      const bent = new THREE.Vector3();
      for (let i = 0; i < N; i++) {
        const y = 1 - (2 * (i + 0.5)) / N;
        const r = Math.sqrt(Math.max(1 - y * y, 0));
        const th = golden * i;
        dir.set(Math.cos(th) * r, y, Math.sin(th) * r);
        const t = clearance(p, dir, 40, glassOpen);
        if (t > 0) { open += t; bent.addScaledVector(dir, t); }
      }
      if (bent.lengthSq() > 1e-9) bent.normalize();
      entry[glassOpen ? 'seeThrough' : 'opaque'] = {
        openness: r3(open / N), bent: bent.toArray().map(r3),
      };
    }
    rows.push(entry);
  }

  /* How much of the cafe floor the sun reaches, both ways. */
  const sun = sky.sunDirection.clone().normalize();
  const down = new THREE.Vector3(0, -1, 0);
  const from = new THREE.Vector3();
  let pts = 0, litOpaque = 0, litThrough = 0;
  for (let a = 0; a < 40; a++) {
    for (let b = 0; b < 40; b++) {
      from.set(-16.5 + a * 0.25, 6.6, -11.0 + b * 0.25);
      if (!physics.raycastInto(from, down, 6, hit, MASK)) continue;
      if (hit.normal.y < 0.7) continue;
      pts++;
      const q = hit.point.clone().addScaledVector(hit.normal, 0.05);
      if (clearance(q, sun, 80, false) > 0) litOpaque++;
      if (clearance(q, sun, 80, true) > 0) litThrough++;
    }
  }

  return {
    rows,
    sun: { dir: sun.toArray().map(r3), elevation: r3((Math.asin(sun.y) * 180) / Math.PI) },
    floor: { pts, litOpaque, litThrough },
  };
});

console.log(`sun ${out.sun.dir.join(', ')}  elevation ${out.sun.elevation} deg`);
for (const r of out.rows) {
  console.log(`\n${r.label} at ${r.at.join(', ')}`);
  console.log(`   glass opaque      openness ${String(r.opaque.openness).padEnd(7)} bent ${r.opaque.bent.join(', ')}`);
  console.log(`   glass see-through openness ${String(r.seeThrough.openness).padEnd(7)} bent ${r.seeThrough.bent.join(', ')}`);
}
console.log(`\nfloor: ${out.floor.pts} samples, sunlit ${out.floor.litOpaque} opaque / ${out.floor.litThrough} see-through`);
await browser.close();
