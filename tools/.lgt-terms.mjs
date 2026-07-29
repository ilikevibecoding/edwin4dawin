/**
 * Scratch diagnostic. Not part of the build.
 *
 * Splits what the camera measures into the terms that produce it. A rendered
 * luminance is albedo times irradiance and the review can only see the
 * product, so a ceiling four times brighter than a floor might be four times
 * better lit or four times whiter. This reports both, plus the bounce the SH
 * grid is carrying and how much of what the windows see is actually in sun.
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
  const dir = new THREE.Vector3();
  const walk = new THREE.Vector3();
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const MASK = 0xffff;
  const luma = (r, gg, b) => 0.2126 * r + 0.7152 * gg + 0.0722 * b;

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

  /* Irradiance the SH grid delivers for a normal, read the way three reads it:
     trilinear over the atlas, L2 basis, the standard convolution weights. */
  const A = [3.141593, 2.094395, 2.094395, 2.094395, 0.785398, 0.785398, 0.785398, 0.785398, 0.785398];
  function shIrradiance(x, y, z, n) {
    const res = volume.resolution;
    const min = volume.bounds.min;
    const cell = volume.cell;
    const fx = THREE.MathUtils.clamp((x - min.x) / cell.x, 0, res.x - 1);
    const fy = THREE.MathUtils.clamp((y - min.y) / cell.y, 0, res.y - 1);
    const fz = THREE.MathUtils.clamp((z - min.z) / cell.z, 0, res.z - 1);
    const ix = Math.min(Math.floor(fx), res.x - 1);
    const iy = Math.min(Math.floor(fy), res.y - 1);
    const iz = Math.min(Math.floor(fz), res.z - 1);
    const jx = Math.min(ix + 1, res.x - 1);
    const jy = Math.min(iy + 1, res.y - 1);
    const jz = Math.min(iz + 1, res.z - 1);
    const tx = fx - ix, ty = fy - iy, tz = fz - iz;
    const c = new Float32Array(27);
    for (let k = 0; k < 8; k++) {
      const w = (k & 1 ? tx : 1 - tx) * (k & 2 ? ty : 1 - ty) * (k & 4 ? tz : 1 - tz);
      if (w <= 0) continue;
      const p = ((k & 1 ? jx : ix) + res.x * ((k & 2 ? jy : iy) + res.y * (k & 4 ? jz : iz))) * 27;
      for (let s = 0; s < 27; s++) c[s] += volume.sh[p + s] * w;
    }
    const b = [
      0.282095, 0.488603 * n.y, 0.488603 * n.z, 0.488603 * n.x,
      1.092548 * n.x * n.y, 1.092548 * n.y * n.z, 0.315392 * (3 * n.z * n.z - 1),
      1.092548 * n.x * n.z, 0.546274 * (n.x * n.x - n.y * n.y),
    ];
    const rgb = [0, 0, 0];
    for (let s = 0; s < 9; s++) {
      for (let ch = 0; ch < 3; ch++) rgb[ch] += c[s * 3 + ch] * b[s] * A[s];
    }
    return rgb;
  }

  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  const targets = [
    ['ceiling', new THREE.Vector3(0, 1, 0)],
    ['floor', new THREE.Vector3(0, -1, 0)],
    ['floorAhead', fwd.clone().setY(-0.55).normalize()],
    ['wallLeft', right.clone().negate().setY(0.02).normalize()],
    ['wallRight', right.clone().setY(0.02).normalize()],
  ];

  const rows = [];
  for (const [name, d] of targets) {
    dir.copy(d).normalize();
    if (!physics.raycastInto(cam.position, dir, 40, hit, MASK)) continue;
    const n = hit.normal.clone();
    const p = hit.point.clone().addScaledVector(n, 0.02);
    const mat = hit.object.material;
    const single = Array.isArray(mat) ? mat[0] : mat;
    const albedo = single?.color ? single.color.toArray() : [1, 1, 1];
    const sh = shIrradiance(p.x, p.y, p.z, n);
    rows.push({
      name,
      mat: single?.name ?? '?',
      albedo: albedo.map(r3),
      albedoL: r3(luma(albedo[0], albedo[1], albedo[2])),
      bounce: sh.map(r3),
      bounceL: r3(luma(sh[0], sh[1], sh[2])),
      bounceBminusR: r3(sh[2] - sh[0]),
    });
  }

  /* What the room's openings actually frame: fire out of the window wall and
     ask whether what is hit is in sun. */
  const sun = sky.sunDirection.clone().normalize();
  const from = new THREE.Vector3();
  const golden = Math.PI * (3 - Math.sqrt(5));
  let escaped = 0, hitSomething = 0, lit = 0;
  const litColour = [0, 0, 0];
  const anyColour = [0, 0, 0];
  from.set(-11.0, 5.6, -4.0);
  const N = 2048;
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(Math.max(1 - y * y, 0));
    const th = golden * i;
    dir.set(Math.cos(th) * r, y, Math.sin(th) * r);
    /* Only rays that leave the room interest us. */
    walk.copy(from);
    let travelled = 0, through = 1, outside = false;
    for (let pane = 0; pane < 4; pane++) {
      if (!physics.raycastInto(walk, dir, 40 - travelled, hit, MASK)) { outside = true; break; }
      travelled += hit.distance + 0.05;
      if (hit.surface === 'glass') {
        through *= 0.72;
        walk.copy(hit.point).addScaledVector(dir, 0.05);
        outside = true;
        continue;
      }
      break;
    }
    if (!outside) continue;
    if (travelled >= 39) { escaped += through; continue; }
    /* Something opaque outside the glazing: is the sun on it? */
    hitSomething++;
    const q = hit.point.clone().addScaledVector(hit.normal, 0.05);
    const m = Array.isArray(hit.object.material) ? hit.object.material[0] : hit.object.material;
    const c = m?.color ? m.color.toArray() : [0.5, 0.5, 0.5];
    for (let k = 0; k < 3; k++) anyColour[k] += c[k];
    if (hit.normal.dot(sun) > 0 && clearance(q, sun, 90) > 0) {
      lit++;
      for (let k = 0; k < 3; k++) litColour[k] += c[k];
    }
  }

  return {
    rows,
    outside: {
      raysOut: hitSomething,
      escapedToSky: r3(escaped),
      sunlit: lit,
      sunlitPct: r3((100 * lit) / Math.max(hitSomething, 1)),
      meanAlbedo: anyColour.map((v) => r3(v / Math.max(hitSomething, 1))),
      sunlitAlbedo: litColour.map((v) => r3(v / Math.max(lit, 1))),
    },
    ambient: {
      sky: lighting.debugReport().ambientSky,
      ground: lighting.debugReport().ambientGround,
      key: lighting.debugReport().keyColor,
    },
  };
});

console.log('-- albedo vs bounce --');
for (const r of out.rows) {
  console.log(
    `  ${r.name.padEnd(11)} albedo L ${String(r.albedoL).padEnd(7)} (${r.mat})`,
  );
  console.log(
    `  ${''.padEnd(11)} bounce L ${String(r.bounceL).padEnd(7)} rgb ${r.bounce.join(', ')}  B-R ${r.bounceBminusR}`,
  );
}
console.log('\n-- what the windows frame, from mid-room --');
console.log(JSON.stringify(out.outside, null, 1));
console.log('\n-- ambient --');
console.log(JSON.stringify(out.ambient, null, 1));
await browser.close();
