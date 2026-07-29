/**
 * Scratch diagnostic. Not part of the build.
 *
 * Densely samples the café to settle two things the coarse census could not:
 * whether the window openings are actually holes in the collision world, and
 * whether the sun geometrically reaches the floor through one. 20 rays over a
 * sphere is the bake's budget and a 1 m window at 5 m subtends 0.3% of a sphere,
 * so the bake would miss the window even if it were wide open — which is itself
 * the finding if the dense count says the room is open.
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
    '--window-size=640,360',
  ],
  protocolTimeout: 900000,
  defaultViewport: { width: 640, height: 360 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 300)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 300000, polling: 250 });
await page.waitForFunction(() => window.__GAME__.listShots().includes('cafe_window'), {
  timeout: 300000,
  polling: 250,
});

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const THREE = g.THREE;
  const engine = g.engine;
  const physics = engine.get('physics');
  const sky = engine.get('sky');
  g.pose('cafe_window');
  for (let i = 0; i < 30; i++) engine.step(1 / 60);

  const hit = {
    point: new THREE.Vector3(), normal: new THREE.Vector3(),
    distance: 0, object: new THREE.Object3D(), surface: 'concrete',
  };
  const dir = new THREE.Vector3();
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const MASK = 0xffff;
  const cam = engine.camera.position.clone();
  const mid = new THREE.Vector3(-11.0, cam.y - 0.4, -6.0);

  /* 4096 rays: enough that a window subtending a few tenths of a percent of the
     sphere lands a countable number of escapes. */
  const N = 4096;
  const golden = Math.PI * (3 - Math.sqrt(5));
  let escaped = 0;
  const escSum = new THREE.Vector3();
  const escList = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(Math.max(1 - y * y, 0));
    const th = golden * i;
    dir.set(Math.cos(th) * r, y, Math.sin(th) * r);
    if (!physics.raycastInto(mid, dir, 40, hit, MASK)) {
      escaped++;
      escSum.add(dir);
      if (escList.length < 24) escList.push([r3(dir.x), r3(dir.y), r3(dir.z)]);
    }
  }
  const bent = escSum.lengthSq() > 1e-9 ? escSum.clone().normalize() : new THREE.Vector3(0, 1, 0);

  /* A grid over the floor: is the sun reaching any of it? */
  const sun = sky.sunDirection.clone().normalize();
  const down = new THREE.Vector3(0, -1, 0);
  const from = new THREE.Vector3();
  let floorPoints = 0, floorLit = 0;
  const litAt = [];
  for (let a = 0; a < 40; a++) {
    for (let b = 0; b < 40; b++) {
      from.set(-16.5 + a * 0.28, cam.y + 0.6, -10.5 + b * 0.28);
      if (!physics.raycastInto(from, down, 6, hit, MASK)) continue;
      if (hit.normal.y < 0.7) continue;
      floorPoints++;
      const px = hit.point.x + hit.normal.x * 0.04;
      const py = hit.point.y + hit.normal.y * 0.04;
      const pz = hit.point.z + hit.normal.z * 0.04;
      dir.copy(sun);
      const p = new THREE.Vector3(px, py, pz);
      if (!physics.raycastInto(p, dir, 80, hit, MASK)) {
        floorLit++;
        if (litAt.length < 12) litAt.push([r3(px), r3(py), r3(pz)]);
      }
    }
  }

  /* Does the *render* scene have holes where the collision world does not?
     Count triangles of window-ish meshes near the room, by material name. */
  const nearby = {};
  const box = new THREE.Box3(
    new THREE.Vector3(-19, 3.5, -12),
    new THREE.Vector3(-5, 9, 0),
  );
  const c = new THREE.Vector3();
  engine.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.boundingSphere) return;
    o.getWorldPosition(c);
    if (!box.containsPoint(c)) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    const key = m?.name ?? o.name ?? '?';
    nearby[key] = (nearby[key] ?? 0) + 1;
  });

  return {
    mid: mid.toArray().map(r3),
    sunElevDeg: r3((Math.asin(sun.y) * 180) / Math.PI),
    dense: {
      rays: N,
      escaped,
      opennessFullSphere: r3(escaped / N),
      bent: bent.toArray().map(r3),
      sample: escList,
    },
    floor: { points: floorPoints, lit: floorLit, litFraction: r3(floorLit / Math.max(floorPoints, 1)), litAt },
    nearby,
  };
});

console.log(JSON.stringify(out, null, 1));
await browser.close();
