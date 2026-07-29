/**
 * Scratch diagnostic. Not part of the build.
 *
 * Two questions about the café, answered from the physics BVH rather than from
 * the baked volume, so the bake's own bugs cannot hide in the answer:
 *
 *  1. Of a full sphere of rays fired from inside the room, which escape, and
 *     what is their elevation? The volume only counts escapes with dy > 0, so if
 *     the room's escapes are all near-horizontal (through a side window) the
 *     measured openness is zero however open the room actually is.
 *  2. Does direct sun reach the floor at all? A sun pool is direct light, not
 *     ambient, so if the shadow term says the floor is lit and the frame says it
 *     is black, the fault is downstream of the cascades.
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
  /* Mid-room, a metre and a half off the floor. */
  const mid = new THREE.Vector3(-11.0, cam.y - 0.4, -6.0);

  /* Same Fibonacci set the bake uses. */
  const N = 64;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const G = { WORLD: 1, PROP: 1 << 3, GLASS: 1 << 6 };
  const masks = {
    everything: 0xffff,
    bakeMask: G.WORLD | G.PROP | G.GLASS,
    noGlass: G.WORLD | G.PROP,
    worldOnly: G.WORLD,
  };
  const census = {};
  const blockers = {};
  let escapes = [];
  for (const [label, m] of Object.entries(masks)) {
    let escUpper = 0, escLower = 0, upper = 0, lower = 0;
    const esc = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N;
      const r = Math.sqrt(Math.max(1 - y * y, 0));
      const th = golden * i;
      dir.set(Math.cos(th) * r, y, Math.sin(th) * r);
      if (y > 0) upper++; else lower++;
      if (!physics.raycastInto(mid, dir, 30, hit, m)) {
        if (y > 0) escUpper++; else escLower++;
        esc.push({ dy: r3(y), dir: [r3(dir.x), r3(dir.y), r3(dir.z)] });
      } else if (label === 'everything') {
        /* What is actually stopping the rays, by material and distance band. */
        const mat = Array.isArray(hit.object.material) ? hit.object.material[0] : hit.object.material;
        const key = `${hit.surface}/${mat?.name ?? '?'}`;
        blockers[key] = (blockers[key] ?? 0) + 1;
      }
    }
    census[label] = {
      escapedUpper: escUpper, escapedLower: escLower,
      opennessUpperOnly: r3(escUpper / upper),
      opennessFullSphere: r3((escUpper + escLower) / N),
    };
    if (label === 'noGlass') escapes = esc;
  }

  /* Walk the floor along the room's long axis and ask whether the sun reaches
     it, using the same geometric test the cascades resolve. */
  const sun = sky.sunDirection.clone().normalize();
  const floorWalk = [];
  const down = new THREE.Vector3(0, -1, 0);
  const from = new THREE.Vector3();
  for (let t = 0; t <= 10; t++) {
    from.set(-15.5 + t * 0.85, cam.y + 0.5, -9.0 + t * 0.72);
    if (!physics.raycastInto(from, down, 6, hit, MASK)) {
      floorWalk.push({ t, miss: true });
      continue;
    }
    const fp = hit.point.clone().addScaledVector(hit.normal, 0.03);
    const litAll = !physics.raycastInto(fp, sun, 60, hit, MASK);
    const stopper = litAll
      ? null
      : `${hit.surface}@${r3(hit.distance)}`;
    const litNoGlass = !physics.raycastInto(fp, sun, 60, hit, masks.noGlass);
    floorWalk.push({ t, at: [r3(fp.x), r3(fp.y), r3(fp.z)], litAll, litNoGlass, stopper });
  }

  return {
    mid: mid.toArray().map(r3),
    sunDir: sun.toArray().map(r3),
    sunElevDeg: r3((Math.asin(sun.y) * 180) / Math.PI),
    rays: N,
    census,
    blockers,
    escapes,
    floorWalk,
  };
});

console.log(JSON.stringify(out, null, 1));
await browser.close();
