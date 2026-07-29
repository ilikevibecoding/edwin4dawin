/**
 * Scratch diagnostic: brute-force one-bounce irradiance in the cafe.
 *
 * Every argument about the floor/ceiling ratio so far has been conducted in
 * probe values, which is arguing about the model rather than about the room.
 * This ignores the bake entirely and path-traces the answer: cosine-sampled
 * hemisphere from each surface, sky radiance for rays that get out, one bounce
 * with a real sun-visibility test for rays that do not. It is slow and it is
 * right, so it says what the rig is supposed to produce.
 *
 *   node tools/.lgt-truth2.mjs
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
  protocolTimeout: 1800000,
  defaultViewport: { width: 480, height: 270 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 300)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 600000, polling: 250 });
await page.waitForFunction(() => window.__GAME__.listShots().includes('cafe_window'), {
  timeout: 600000, polling: 250,
});

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const THREE = g.THREE;
  const engine = g.engine;
  g.pose('cafe_window');
  for (let i = 0; i < 90; i++) engine.step(1 / 60);

  const physics = engine.get('physics');
  const world = engine.get('world');
  const sky = engine.get('sky');
  const lighting = engine.get('lighting');
  const volume = lighting.volume;
  const cam = engine.camera;
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const MASK = 0xffff;
  const GLAZE = 0.72;

  const hit = {
    point: new THREE.Vector3(), normal: new THREE.Vector3(),
    distance: 0, object: new THREE.Object3D(), surface: 'concrete',
  };
  const hit2 = {
    point: new THREE.Vector3(), normal: new THREE.Vector3(),
    distance: 0, object: new THREE.Object3D(), surface: 'concrete',
  };
  const walk = new THREE.Vector3();
  const d = new THREE.Vector3();
  const d2 = new THREE.Vector3();

  const sun = sky.sunDirection.clone().normalize();
  const sunC = sky.sunColor;
  const skyC = sky.skyColor;
  const luma = (r, gg, b) => 0.2126 * r + 0.7152 * gg + 0.0722 * b;

  /* Nearest opaque hit, glazing passes with a transmission cost. `out` holds
     the blocker; the return is what survived, 0 when something stopped it. */
  function march(from, dir, maxDistance, o) {
    let travelled = 0, through = 1;
    walk.copy(from);
    for (let pane = 0; pane < 4; pane++) {
      const remaining = maxDistance - travelled;
      if (remaining <= 0) return through;
      if (!physics.raycastInto(walk, dir, remaining, o, MASK)) return through;
      travelled += o.distance;
      if (o.surface !== 'glass') { o.distance = travelled; return 0; }
      through *= GLAZE;
      walk.copy(o.point).addScaledVector(dir, 0.05);
      travelled += 0.05;
    }
    return 0;
  }

  /* Fraction of the hemisphere over a point that reaches sky, cosine-weighted:
     the ambient scale for a one-bounce surface. */
  const golden = Math.PI * (3 - Math.sqrt(5));
  function openHemisphere(p, n, N) {
    const t = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const bx = new THREE.Vector3().crossVectors(t, n).normalize();
    const bz = new THREE.Vector3().crossVectors(n, bx);
    let open = 0;
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N;
      const r = Math.sqrt(u);
      const th = golden * i;
      d2.copy(bx).multiplyScalar(Math.cos(th) * r)
        .addScaledVector(bz, Math.sin(th) * r)
        .addScaledVector(n, Math.sqrt(Math.max(1 - u, 0)));
      open += march(p, d2, 40, hit2);
    }
    return open / N;
  }

  /* Cosine-sampled irradiance at a surface, one bounce. Returns kilolux. */
  function irradiance(p, n, N) {
    const t = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const bx = new THREE.Vector3().crossVectors(t, n).normalize();
    const bz = new THREE.Vector3().crossVectors(n, bx);
    const sum = [0, 0, 0];
    const fromSky = [0, 0, 0];
    const fromBounce = [0, 0, 0];
    let above = 0, escaped = 0;

    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N;
      const r = Math.sqrt(u);
      const th = golden * i;
      d.copy(bx).multiplyScalar(Math.cos(th) * r)
        .addScaledVector(bz, Math.sin(th) * r)
        .addScaledVector(n, Math.sqrt(Math.max(1 - u, 0)))
        .normalize();

      const through = march(p, d, 60, hit);
      if (through > 0) {
        escaped++;
        if (d.y > 0) above++;
        for (let k = 0; k < 3; k++) {
          const v = through * (d.y > 0 ? skyC.getComponent(k) : skyC.getComponent(k) * 0.35);
          sum[k] += v; fromSky[k] += v;
        }
        continue;
      }
      /* Something opaque: one bounce off it. */
      const mat = Array.isArray(hit.object.material) ? hit.object.material[0] : hit.object.material;
      const alb = mat?.color ? [mat.color.r, mat.color.g, mat.color.b] : [0.5, 0.5, 0.5];
      const q = hit.point.clone().addScaledVector(hit.normal, 0.04);
      let ndl = hit.normal.dot(sun);
      let sunVis = 0;
      if (ndl > 0 && sun.y > 0.01) sunVis = march(q, sun, 90, hit2);
      const amb = openHemisphere(q, hit.normal, 24);
      for (let k = 0; k < 3; k++) {
        const e = sunC.getComponent(k) * Math.max(ndl, 0) * sunVis + Math.PI * skyC.getComponent(k) * amb;
        const v = (alb[k] * e) / Math.PI;
        sum[k] += v; fromBounce[k] += v;
      }
    }
    const s = Math.PI / N;
    return {
      E: sum.map((v) => r3(v * s)),
      EL: r3(luma(sum[0], sum[1], sum[2]) * s),
      sky: fromSky.map((v) => r3(v * s)),
      bounce: fromBounce.map((v) => r3(v * s)),
      bounceL: r3(luma(fromBounce[0], fromBounce[1], fromBounce[2]) * s),
      escapedPct: r3((100 * escaped) / N),
      abovePct: r3((100 * above) / N),
    };
  }

  /* Locate the room the camera is standing in and pick real surface points. */
  const room = (world.rooms ?? []).find(
    (r) => cam.position.x > r.rect.x0 && cam.position.x < r.rect.x1 &&
           cam.position.z > r.rect.z0 && cam.position.z < r.rect.z1 &&
           cam.position.y > r.y - 0.5 && cam.position.y < r.y + r.height + 0.5,
  );
  const cx = room ? (room.rect.x0 + room.rect.x1) / 2 : cam.position.x;
  const cz = room ? (room.rect.z0 + room.rect.z1) / 2 : cam.position.z;
  const fy = room ? room.y : cam.position.y - 1.6;
  const ceilY = fy + (room ? room.height : 3);

  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);
  const N = 700;

  /* A transect across the room so the gradient away from the openings shows. */
  const span = room ? room.rect.x1 - room.rect.x0 : 8;
  const rows = [];
  for (let i = 0; i < 5; i++) {
    const x = (room ? room.rect.x0 : cx - 4) + (span * (i + 0.5)) / 5;
    const pf = new THREE.Vector3(x, fy + 0.05, cz);
    const pc = new THREE.Vector3(x, ceilY - 0.05, cz);
    const f = irradiance(pf, UP, N);
    const c = irradiance(pc, DOWN, N);
    const visF = new THREE.Vector4(); volume.sampleVisibility(pf.x, pf.y, pf.z, visF, UP);
    const visC = new THREE.Vector4(); volume.sampleVisibility(pc.x, pc.y, pc.z, visC, DOWN);
    rows.push({
      x: r3(x),
      floor: f, ceiling: c,
      ratio: r3(f.EL / Math.max(c.EL, 1e-6)),
      bakedFloorOpen: r3(visF.w), bakedCeilOpen: r3(visC.w),
    });
  }

  /* Does the sun reach anything inside at all? */
  let sunlitFloor = 0, tested = 0;
  for (let i = 0; i < 200; i++) {
    const x = (room ? room.rect.x0 : cx - 4) + (span * ((i % 20) + 0.5)) / 20;
    const z = (room ? room.rect.z0 : cz - 4) +
      ((room ? room.rect.z1 - room.rect.z0 : 8) * (Math.floor(i / 20) + 0.5)) / 10;
    const p = new THREE.Vector3(x, fy + 0.06, z);
    tested++;
    if (sun.y > 0.01 && march(p, sun, 90, hit2) > 0) sunlitFloor++;
  }

  return {
    room: room ? { name: room.name, y: r3(room.y), h: r3(room.height),
      rect: [room.rect.x0, room.rect.z0, room.rect.x1, room.rect.z1].map(r3) } : null,
    sun: {
      dir: sun.toArray().map(r3),
      elevationDeg: r3((Math.asin(sun.y) * 180) / Math.PI),
      azimuthDeg: r3((Math.atan2(sun.x, -sun.z) * 180) / Math.PI),
      color: [sunC.r, sunC.g, sunC.b].map(r3),
      skyColor: [skyC.r, skyC.g, skyC.b].map(r3),
    },
    sunlitFloorPct: r3((100 * sunlitFloor) / tested),
    rows,
  };
});

const pad = (v, n) => String(v).padEnd(n);
console.log(`room ${out.room?.name}  rect ${out.room?.rect.join(', ')}  y ${out.room?.y} h ${out.room?.h}`);
console.log(`sun elevation ${out.sun.elevationDeg} deg  azimuth ${out.sun.azimuthDeg} deg  colour ${out.sun.color.join('/')}`);
console.log(`sky radiance ${out.sun.skyColor.join(', ')}`);
console.log(`floor points with a clear line to the sun: ${out.sunlitFloorPct}%`);
console.log('\n-- brute-force one-bounce irradiance (kilolux) --');
for (const r of out.rows) {
  console.log(`  x ${pad(r.x, 8)} floor E ${pad(r.floor.EL, 8)} rgb ${pad(r.floor.E.join(','), 22)} escaped ${pad(r.floor.escapedPct + '%', 7)} baked open ${r.bakedFloorOpen}`);
  console.log(`  ${pad('', 10)} ceil  E ${pad(r.ceiling.EL, 8)} rgb ${pad(r.ceiling.E.join(','), 22)} escaped ${pad(r.ceiling.escapedPct + '%', 7)} baked open ${r.bakedCeilOpen}`);
  console.log(`  ${pad('', 10)} TRUE floor/ceiling ${r.ratio}   (floor bounce ${r.floor.bounceL}, ceil bounce ${r.ceiling.bounceL})`);
}
await browser.close();
