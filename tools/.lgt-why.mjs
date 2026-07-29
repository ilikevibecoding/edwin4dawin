/**
 * Scratch diagnostic: the rendered floor/ceiling ratio, split into its causes.
 *
 * The irradiance field can be right and the frame still read wrong, because a
 * pixel is albedo times irradiance and the review can only see the product. So
 * this reports, per surface point, the real albedo (the same texture-average
 * the bake uses, not `material.color`), then every term that puts light on it:
 * key light through the cascades, the prefiltered probe through the aperture,
 * the SH bounce grid, and each local lamp with an occlusion ray. It ends with
 * the luminance ratio those predict, so the frame can be argued with.
 *
 * Also meters the pool: floor irradiance 0.8 m inside each opening against the
 * room's floor mean, which is the "measurable light pool" the review asked for.
 *
 *   node tools/.lgt-why.mjs [shot]
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
  const sky = engine.get('sky');
  const volume = lighting.volume;
  const cam = engine.camera;

  for (let i = 0; i < 4000 && (!volume.ready || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 4000 && (volume.pendingRelight || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 20; i++) engine.step(1 / 60);

  const r3 = (v) => Math.round(v * 1000) / 1000;
  const r4 = (v) => Math.round(v * 10000) / 10000;
  const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const MASK = (1 << 0) | (1 << 3) | (1 << 6);
  const hit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: '' };
  const sHit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: '' };
  const D = new THREE.Vector3();
  const walk = new THREE.Vector3();

  const GLAZING = 0.72, LAYERS = 3;
  function traceOpaque(origin, dir, maxDist, o) {
    let travelled = 0, through = 1;
    walk.copy(origin);
    for (let pane = 0; ; pane++) {
      const remaining = maxDist - travelled;
      if (remaining <= 0) return through;
      if (!physics.raycastInto(walk, dir, remaining, o, MASK)) return through;
      travelled += o.distance;
      if (o.surface !== 'glass' || pane >= LAYERS) { o.distance = travelled; return 0; }
      through *= GLAZING;
      walk.copy(o.point).addScaledVector(dir, 0.05);
      travelled += 0.05;
    }
  }

  const sunDir = sky.sunDirection.clone().normalize();
  const sunE = [sky.sunColor.r, sky.sunColor.g, sky.sunColor.b];
  const skyL = [sky.skyColor.r, sky.skyColor.g, sky.skyColor.b];

  /* Same aperture the shader computes. */
  function apertureOf(v, n) {
    const openness = Math.max(0, Math.min(1, v.w));
    const len = Math.hypot(v.x, v.y, v.z);
    const cosA = len > 1e-4 ? (n.x * v.x + n.y * v.y + n.z * v.z) / len : n.y;
    const cone = Math.min(openness, 0.5);
    const sinSq = 4 * cone * (1 - cone);
    const sinT = Math.sqrt(sinSq);
    const narrow = cosA >= sinT ? cosA : cosA <= -sinT ? 0 : ((cosA + sinT) ** 2) / (4 * Math.max(sinT, 1e-4));
    const wide = 0.5 + 0.5 * cosA;
    return sinSq * (narrow + (wide - narrow) * Math.min(openness * 2, 1));
  }

  const SH_A = [Math.PI, (2 * Math.PI) / 3, (2 * Math.PI) / 3, (2 * Math.PI) / 3,
    Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4];
  function shIrradiance(x, y, z, n) {
    const res = volume.resolution, min = volume.bounds.min, cell = volume.cell;
    const f = [
      THREE.MathUtils.clamp((x + n.x * cell.x * 0.5 - min.x) / cell.x, 0, res.x - 1),
      THREE.MathUtils.clamp((y + n.y * cell.y * 0.5 - min.y) / cell.y, 0, res.y - 1),
      THREE.MathUtils.clamp((z + n.z * cell.z * 0.5 - min.z) / cell.z, 0, res.z - 1),
    ];
    const dim = [res.x, res.y, res.z];
    const i = f.map((v, k) => Math.min(Math.floor(v), dim[k] - 1));
    const j = i.map((v, k) => Math.min(v + 1, dim[k] - 1));
    const t = f.map((v, k) => v - i[k]);
    const c = new Float32Array(27);
    for (let k = 0; k < 8; k++) {
      const w = (k & 1 ? t[0] : 1 - t[0]) * (k & 2 ? t[1] : 1 - t[1]) * (k & 4 ? t[2] : 1 - t[2]);
      if (w <= 0) continue;
      const gx = k & 1 ? j[0] : i[0], gy = k & 2 ? j[1] : i[1], gz = k & 4 ? j[2] : i[2];
      const q = (gx + res.x * (gy + res.y * gz)) * 27;
      for (let s = 0; s < 27; s++) c[s] += (volume.sh[q + s] + volume.shSpread[q + s]) * w;
    }
    const b = [0.282095, 0.488603 * n.y, 0.488603 * n.z, 0.488603 * n.x,
      1.092548 * n.x * n.y, 1.092548 * n.y * n.z, 0.315392 * (3 * n.z * n.z - 1),
      1.092548 * n.x * n.z, 0.546274 * (n.x * n.x - n.y * n.y)];
    const rgb = [0, 0, 0];
    for (let s = 0; s < 9; s++) for (let ch = 0; ch < 3; ch++) rgb[ch] += c[s * 3 + ch] * b[s] * SH_A[s];
    return rgb.map((v) => Math.max(v, 0));
  }

  /* Every lamp in the scene, with an occlusion ray, in the rig's own units:
     intensity is kilocandela, so E = I cos / d^2 lands in kilolux. */
  const lamps = [];
  engine.scene.traverse((o) => {
    if ((o.isPointLight || o.isSpotLight) && o.visible && o.intensity > 0) lamps.push(o);
  });
  const lampPos = new THREE.Vector3();
  function localIrradiance(p, n) {
    const E = [0, 0, 0];
    const contributors = [];
    for (const l of lamps) {
      l.getWorldPosition(lampPos);
      D.copy(lampPos).sub(p);
      const d = D.length();
      if (d < 1e-4 || (l.distance > 0 && d > l.distance)) continue;
      D.multiplyScalar(1 / d);
      const cos = D.dot(n);
      if (cos <= 0) continue;
      if (traceOpaque(p, D, d - 0.05, sHit) === 0) continue;
      let fall = 1 / (d * d);
      if (l.distance > 0) {
        const t = Math.max(1 - d / l.distance, 0);
        fall *= t * t;
      }
      if (l.isSpotLight) {
        const target = new THREE.Vector3();
        l.target?.getWorldPosition(target);
        const axis = target.sub(lampPos).normalize();
        const ca = -D.dot(axis);
        const cosOuter = Math.cos(l.angle);
        if (ca < cosOuter) continue;
        const cosInner = Math.cos(l.angle * (1 - (l.penumbra ?? 0)));
        fall *= THREE.MathUtils.clamp((ca - cosOuter) / Math.max(cosInner - cosOuter, 1e-4), 0, 1);
      }
      const k = l.intensity * cos * fall;
      const add = [l.color.r * k, l.color.g * k, l.color.b * k];
      for (let c = 0; c < 3; c++) E[c] += add[c];
      if (luma(add) > 1e-5) contributors.push(`${l.name || l.type} d=${r3(d)} E=${r4(luma(add))}`);
    }
    return { E, contributors };
  }

  const vis4 = new THREE.Vector4();
  function point(tag, p, n) {
    /* Nudge off the surface so nothing self-hits. */
    const q = p.clone().addScaledVector(n, 0.03);
    let albedo = [0.5, 0.5, 0.5];
    let mat = '?';
    {
      /* What is under this point: fire back along the normal to name it. */
      D.copy(n).negate();
      if (traceOpaque(q, D, 0.2, hit) === 0 && hit.object) {
        const c = volume.albedoOf ? volume.albedoOf(hit.object) : null;
        if (c) albedo = [c.r, c.g, c.b];
        const m = Array.isArray(hit.object.material) ? hit.object.material[0] : hit.object.material;
        mat = m?.name ?? hit.object.name ?? '?';
      }
    }
    volume.sampleVisibility(q.x, q.y, q.z, vis4, n);
    const ap = apertureOf(vis4, n);
    const Esky = skyL.map((v) => v * Math.PI * ap);
    const Esh = shIrradiance(q.x, q.y, q.z, n);
    let Esun = [0, 0, 0];
    const ndl = n.dot(sunDir);
    if (ndl > 0 && sunDir.y > 0.01) {
      const vis = traceOpaque(q, sunDir, 200, sHit);
      Esun = sunE.map((v) => v * ndl * vis);
    }
    const loc = localIrradiance(q, n);
    const E = [0, 1, 2].map((c) => Esky[c] + Esh[c] + Esun[c] + loc.E[c]);
    const L = E.map((v, c) => (v * albedo[c]) / Math.PI);
    return {
      tag, p: [r3(q.x), r3(q.y), r3(q.z)], mat,
      albedoL: r4(luma(albedo)), albedo: albedo.map(r3),
      open: r4(vis4.w), ap: r4(ap),
      Esky: r4(luma(Esky)), Esh: r4(luma(Esh)), Esun: r4(luma(Esun)), Eloc: r4(luma(loc.E)),
      E: r4(luma(E)), L: r4(luma(L)), rgb: L.map(r4),
      BminusR: r4(L[2] - L[0]), lamps: loc.contributors.slice(0, 3),
    };
  }

  const room = (world.rooms ?? []).find(
    (r) => cam.position.x > r.rect.x0 && cam.position.x < r.rect.x1 &&
           cam.position.z > r.rect.z0 && cam.position.z < r.rect.z1 &&
           cam.position.y > r.y - 0.5 && cam.position.y < r.y + r.height + 0.5);
  if (!room) return { error: 'camera is not in a registered room' };

  const cx = (room.rect.x0 + room.rect.x1) / 2;
  const cz = (room.rect.z0 + room.rect.z1) / 2;
  const mid = new THREE.Vector3(cx, room.y + room.height * 0.5, cz);
  const floorY = traceOpaque(mid, D.set(0, -1, 0), 8, hit) === 0 ? mid.y - hit.distance : room.y;
  const ceilY = traceOpaque(mid, D.set(0, 1, 0), 8, hit) === 0 ? mid.y + hit.distance : room.y + room.height;

  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);
  const rows = [];
  /* A transect of the room at both heights, so the mean is not one lucky spot. */
  const floors = [];
  const ceils = [];
  for (let k = 0; k < 5; k++) {
    const x = room.rect.x0 + ((room.rect.x1 - room.rect.x0) * (k + 0.5)) / 5;
    const f = point(`floor x=${r3(x)}`, new THREE.Vector3(x, floorY, cz), UP);
    const c = point(`ceil  x=${r3(x)}`, new THREE.Vector3(x, ceilY, cz), DOWN);
    rows.push(f, c); floors.push(f); ceils.push(c);
  }

  /* The pool: floor irradiance stepping inward from each opening of this room. */
  const portals = (world.portals ?? []).filter((o) =>
    o.x > room.rect.x0 - 1 && o.x < room.rect.x1 + 1 &&
    o.z > room.rect.z0 - 1 && o.z < room.rect.z1 + 1 &&
    o.y > room.y && o.y < room.y + room.height);
  const pools = [];
  for (const o of portals) {
    const inward = new THREE.Vector3(-o.nx, 0, -o.nz).normalize();
    const walkP = [];
    for (const step of [0.6, 1.4, 2.4, 4.0]) {
      const px = o.x + inward.x * step;
      const pz = o.z + inward.z * step;
      const s = point(`pool d=${step}`, new THREE.Vector3(px, floorY, pz), UP);
      walkP.push({ step, E: s.E, L: s.L, ap: s.ap, Esh: s.Esh, Esky: s.Esky, Esun: s.Esun });
    }
    pools.push({
      at: [r3(o.x), r3(o.y), r3(o.z)], size: `${r3(o.width)}x${r3(o.height)}`,
      n: [r3(o.nx), r3(o.nz)], walk: walkP,
    });
  }

  const mean = (a, k) => a.reduce((s, r) => s + r[k], 0) / a.length;
  return {
    room: room.name, floorY: r3(floorY), ceilY: r3(ceilY),
    sunEl: r3((Math.asin(sunDir.y) * 180) / Math.PI),
    sunE: sunE.map(r3), skyL: skyL.map(r3), lamps: lamps.length,
    rows, pools,
    summary: {
      floorE: r4(mean(floors, 'E')), ceilE: r4(mean(ceils, 'E')),
      ratioE: r3(mean(floors, 'E') / Math.max(mean(ceils, 'E'), 1e-9)),
      floorL: r4(mean(floors, 'L')), ceilL: r4(mean(ceils, 'L')),
      ratioL: r3(mean(floors, 'L') / Math.max(mean(ceils, 'L'), 1e-9)),
      floorAlbedo: r3(mean(floors, 'albedoL')), ceilAlbedo: r3(mean(ceils, 'albedoL')),
    },
  };
}, SHOT);

if (out.error) console.log('ERROR:', out.error);
else {
  const pad = (v, n) => String(v).padEnd(n);
  console.log(`${out.room}  floor y ${out.floorY}  ceiling y ${out.ceilY}  sun ${out.sunEl} deg  lamps ${out.lamps}`);
  console.log(`sunE ${out.sunE.join(', ')}  skyL ${out.skyL.join(', ')}\n`);
  console.log(pad('point', 16) + pad('albedo', 8) + pad('open', 8) + pad('aper', 8) +
    pad('Esky', 9) + pad('Esh', 9) + pad('Esun', 9) + pad('Elamp', 9) +
    pad('E', 9) + pad('L', 9) + pad('B-R', 9) + 'material');
  for (const r of out.rows) {
    console.log(pad(r.tag, 16) + pad(r.albedoL, 8) + pad(r.open, 8) + pad(r.ap, 8) +
      pad(r.Esky, 9) + pad(r.Esh, 9) + pad(r.Esun, 9) + pad(r.Eloc, 9) +
      pad(r.E, 9) + pad(r.L, 9) + pad(r.BminusR, 9) + r.mat);
    for (const l of r.lamps) console.log(`      lamp ${l}`);
  }
  const s = out.summary;
  console.log(`\nirradiance  floor ${s.floorE}  ceiling ${s.ceilE}  floor/ceiling ${s.ratioE}`);
  console.log(`luminance   floor ${s.floorL}  ceiling ${s.ceilL}  floor/ceiling ${s.ratioL}`);
  console.log(`albedo      floor ${s.floorAlbedo}  ceiling ${s.ceilAlbedo}`);
  console.log('\n-- pools: floor stepping inward from each opening --');
  for (const p of out.pools) {
    console.log(`  opening at ${p.at.join(',')} ${p.size} n=${p.n.join(',')}`);
    for (const w of p.walk) {
      console.log(`      d=${pad(w.step, 6)} aper ${pad(w.ap, 9)} Esky ${pad(w.Esky, 9)} Esh ${pad(w.Esh, 9)} Esun ${pad(w.Esun, 9)} E ${pad(w.E, 9)} L ${w.L}`);
    }
  }
}
await browser.close();
