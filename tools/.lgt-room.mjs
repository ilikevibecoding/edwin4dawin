/**
 * Scratch diagnostic for interior light transport. Not part of the build.
 *
 * Three questions in one boot, because booting is the expensive part:
 *
 *  1. What does the shader see on the cafe's floor, ceiling and each wall —
 *     openness, the direction the opening lies in, the aperture that falls out
 *     of them, and the direction the portal lookup will sample.
 *  2. Does the bake agree with a dense measurement of the same points? A cheap
 *     bake that is wrong and a cheap bake that is merely coarse need opposite
 *     fixes.
 *  3. Is there a gradient on the floor away from the windows, which is what a
 *     pool is when the sun is on the other side of the building.
 *
 *   node tools/.lgt-room.mjs
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
  for (let i = 0; i < 120; i++) engine.step(1 / 60);

  const lighting = engine.get('lighting');
  const physics = engine.get('physics');
  const sky = engine.get('sky');
  const volume = lighting.volume;
  const cam = engine.camera;

  const hit = {
    point: new THREE.Vector3(), normal: new THREE.Vector3(),
    distance: 0, object: new THREE.Object3D(), surface: 'concrete',
  };
  const vis = new THREE.Vector4();
  const dir = new THREE.Vector3();
  const walk = new THREE.Vector3();
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const MASK = 0xffff;

  /* The same march the bake makes: opaque hits stop it, glazing does not. */
  function clearance(from, d, maxDistance) {
    let travelled = 0;
    let through = 1;
    walk.copy(from);
    for (let pane = 0; pane < 4; pane++) {
      const remaining = maxDistance - travelled;
      if (remaining <= 0) return through;
      if (!physics.raycastInto(walk, d, remaining, hit, MASK)) return through;
      travelled += hit.distance + 0.05;
      if (hit.surface !== 'glass') return 0;
      through *= 0.72;
      walk.copy(hit.point).addScaledVector(d, 0.05);
    }
    return 0;
  }

  const golden = Math.PI * (3 - Math.sqrt(5));
  function truth(p, n) {
    const N = 1024;
    let open = 0;
    const bent = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N;
      const r = Math.sqrt(Math.max(1 - y * y, 0));
      const th = golden * i;
      dir.set(Math.cos(th) * r, y, Math.sin(th) * r);
      const t = clearance(p, dir, 30);
      if (t > 0) { open += t; bent.addScaledVector(dir, t); }
    }
    if (bent.lengthSq() > 1e-9) bent.normalize();
    const v = new THREE.Vector4(bent.x, bent.y, bent.z, open / N);
    return { openness: r3(v.w), bent: bent.toArray().map(r3), aperture: r3(aperture(v, n)) };
  }

  function aperture(v, n) {
    const openness = Math.max(0, Math.min(1, v.w));
    const len = Math.hypot(v.x, v.y, v.z);
    const cosA = len > 1e-4 ? (n.x * v.x + n.y * v.y + n.z * v.z) / len : n.y;
    const cone = Math.min(openness, 0.5);
    const sinSq = 4 * cone * (1 - cone);
    const sinT = Math.sqrt(sinSq);
    const narrow =
      cosA >= sinT ? cosA
      : cosA <= -sinT ? 0
      : ((cosA + sinT) * (cosA + sinT)) / (4 * Math.max(sinT, 1e-4));
    const wide = 0.5 + 0.5 * cosA;
    return sinSq * (narrow + (wide - narrow) * Math.min(openness * 2, 1));
  }

  /* 1. What the shader sees where the camera looks. */
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  const targets = [
    ['ceiling', new THREE.Vector3(0, 1, 0)],
    ['floor', new THREE.Vector3(0, -1, 0)],
    ['floorAhead', fwd.clone().setY(-0.55).normalize()],
    ['wallLeft', right.clone().negate().setY(0.02).normalize()],
    ['wallRight', right.clone().setY(0.02).normalize()],
    ['wallAhead', fwd.clone().setY(0.02).normalize()],
  ];

  const rows = [];
  for (const [name, d] of targets) {
    dir.copy(d).normalize();
    if (!physics.raycastInto(cam.position, dir, 40, hit, MASK)) {
      rows.push({ name, miss: true });
      continue;
    }
    const n = hit.normal.clone();
    const p = hit.point.clone().addScaledVector(n, 0.02);
    volume.sampleVisibility(p.x, p.y, p.z, vis, n);
    const bent = new THREE.Vector3(vis.x, vis.y, vis.z);
    const len = bent.length();
    const opening = len > 1e-4 ? bent.clone().multiplyScalar(1 / len) : n.clone();
    const portal = opening.clone().multiplyScalar(0.55).addScaledVector(n, 0.45).normalize();
    const mat = hit.object.material;
    const single = Array.isArray(mat) ? mat[0] : mat;
    rows.push({
      name,
      at: p.toArray().map(r3),
      normal: n.toArray().map(r3),
      openness: r3(vis.w),
      opening: opening.toArray().map(r3),
      aperture: r3(aperture(vis, n)),
      portalDir: portal.toArray().map(r3),
      portalElevation: Math.round((Math.asin(portal.y) * 180) / Math.PI),
      mat: single?.name || single?.type,
    });
  }

  /* 2. Bake against a dense measurement, at head height in three places. */
  const checks = [];
  for (const [label, p] of [
    ['by-window', new THREE.Vector3(-9.6, 5.6, -4.0)],
    ['mid-room', new THREE.Vector3(-11.6, 5.6, -4.0)],
    ['deep', new THREE.Vector3(-13.6, 5.6, -4.0)],
  ]) {
    const up = new THREE.Vector3(0, 1, 0);
    volume.sampleVisibility(p.x, p.y, p.z, vis, up);
    checks.push({
      label,
      at: p.toArray().map(r3),
      baked: { openness: r3(vis.w), bent: [r3(vis.x), r3(vis.y), r3(vis.z)], aperture: r3(aperture(vis, up)) },
      dense: truth(p, up),
    });
  }

  /* 3. The pool: floor and the ceiling over it, stepping in from the windows. */
  const down = new THREE.Vector3(0, -1, 0);
  const up = new THREE.Vector3(0, 1, 0);
  const from = new THREE.Vector3();
  const transect = [];
  for (let i = 0; i < 10; i++) {
    const x = -9.2 - i * 0.55;
    from.set(x, 6.6, -4.0);
    if (!physics.raycastInto(from, down, 3, hit, MASK)) continue;
    if (hit.normal.y < 0.7) continue;
    const fy = hit.point.y;
    volume.sampleVisibility(x, fy + 0.05, -4.0, vis, up);
    const floorAperture = aperture(vis, up);
    const floorOpen = r3(vis.w);
    from.set(x, fy + 0.2, -4.0);
    let ceiling = null;
    if (physics.raycastInto(from, up, 4, hit, MASK)) {
      volume.sampleVisibility(x, hit.point.y - 0.05, -4.0, vis, down);
      ceiling = aperture(vis, down);
    }
    transect.push({
      fromWindow: r3(Math.abs(x + 8.8)),
      floorOpen,
      floorAperture: r3(floorAperture),
      ceilingAperture: ceiling === null ? null : r3(ceiling),
      ratio: ceiling ? r3(floorAperture / Math.max(ceiling, 1e-9)) : null,
    });
  }

  return {
    rows, checks, transect,
    camera: cam.position.toArray().map(r3),
    grid: {
      resolution: volume.resolution.toArray(),
      cell: [r3(volume.cell.x), r3(volume.cell.y), r3(volume.cell.z)],
      ready: volume.ready,
    },
    sun: {
      dir: sky.sunDirection.toArray().map(r3),
      elevation: r3((Math.asin(sky.sunDirection.clone().normalize().y) * 180) / Math.PI),
      color: sky.sunColor.toArray().map((v) => Math.round(v * 10) / 10),
      skyColor: sky.skyColor.toArray().map(r3),
      cloudShadowStrength: sky.cloudShadowStrength ?? 'ABSENT',
    },
    report: lighting.debugReport(),
  };
});

const pad = (v, n) => String(v).padEnd(n);
console.log(`grid ${out.grid.resolution.join('x')} cell ${out.grid.cell.join(' x ')} ready=${out.grid.ready}`);
console.log(`sun ${out.sun.dir.join(', ')} at ${out.sun.elevation} deg, colour ${out.sun.color.join('/')}`);
console.log(`sky ${out.sun.skyColor.join(', ')}  cloudShadowStrength ${out.sun.cloudShadowStrength}`);
console.log('\n-- surfaces the camera sees --');
for (const r of out.rows) {
  if (r.miss) { console.log(`  ${r.name}: MISS`); continue; }
  console.log(
    `  ${pad(r.name, 11)} open ${pad(r.openness, 7)} aperture ${pad(r.aperture, 9)}` +
      ` opening ${r.opening.join(',')}  portal ${r.portalElevation} deg  ${r.mat}`,
  );
}
console.log('\n-- baked vs dense --');
for (const c of out.checks) {
  console.log(`  ${pad(c.label, 11)} baked open ${pad(c.baked.openness, 7)} aperture ${pad(c.baked.aperture, 8)} bent ${c.baked.bent.join(',')}`);
  console.log(`  ${pad('', 11)} dense open ${pad(c.dense.openness, 7)} aperture ${pad(c.dense.aperture, 8)} bent ${c.dense.bent.join(',')}`);
}
console.log('\n-- floor pool, stepping in from the window wall --');
for (const t of out.transect) {
  console.log(
    `  ${pad(t.fromWindow + ' m', 8)} floor open ${pad(t.floorOpen, 7)} aperture ${pad(t.floorAperture, 9)}` +
      ` ceiling ${pad(t.ceilingAperture, 9)} floor/ceiling ${t.ratio}`,
  );
}
console.log('\n' + JSON.stringify(out.report, null, 1));
await browser.close();
