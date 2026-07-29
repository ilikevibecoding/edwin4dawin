/**
 * Scratch diagnostic: can the sun get into this room at all, and where does it
 * land?
 *
 * The review asks for a sunlit pool on the floor, and every measurement so far
 * has reported no sun anywhere inside — but those all sampled the floor within
 * four metres of an opening, and at a five-degree sun a patch entering a window
 * head lands eighteen metres away, which in a ten-metre room means it is on the
 * far wall and nowhere near the floor. So this asks the question directly:
 * per opening, is the sun clear of it, and if it is, where does the beam
 * through the opening's centre and corners actually strike?
 *
 * Also reports the room's mean direct irradiance over its enclosed cells, which
 * is the quantity the enclosure form of the interreflection needs.
 *
 *   node tools/.lgt-sun.mjs [shot]
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
  const sky = engine.get('sky');
  const volume = lighting.volume;
  const cam = engine.camera;

  for (let i = 0; i < 4000 && (!volume.ready || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 4000 && (volume.pendingRelight || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 20; i++) engine.step(1 / 60);

  const r2 = (v) => Math.round(v * 100) / 100;
  const r4 = (v) => Math.round(v * 10000) / 10000;
  const MASK = (1 << 0) | (1 << 3) | (1 << 6);
  const hit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: '' };
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
  const back = sunDir.clone().negate();
  const az = (Math.atan2(sunDir.x, sunDir.z) * 180) / Math.PI;
  const el = (Math.asin(sunDir.y) * 180) / Math.PI;

  /* Openings near the camera, which is the room the shot is of. */
  const PS = 11;
  const rows = [];
  for (let i = 0; i < volume.portalCount; i++) {
    const b = i * PS;
    const p = new THREE.Vector3(volume.portals[b], volume.portals[b + 1], volume.portals[b + 2]);
    if (p.distanceTo(cam.position) > 22) continue;
    const n = new THREE.Vector3(volume.portals[b + 3], volume.portals[b + 4], volume.portals[b + 5]);
    const u = new THREE.Vector3(volume.portals[b + 6], volume.portals[b + 7], volume.portals[b + 8]);
    const hw = volume.portals[b + 9], hh = volume.portals[b + 10];
    const facing = n.dot(sunDir);
    /* Sun clear of the opening, sampled at the centre and the four corners. */
    let clear = 0;
    const lands = [];
    for (let k = 0; k < 5; k++) {
      const su = k === 0 ? 0 : (k & 1 ? 0.7 : -0.7) * hw;
      const sv = k === 0 ? 0 : (k & 2 ? 0.7 : -0.7) * hh;
      const from = p.clone().addScaledVector(u, su).setY(p.y + sv).addScaledVector(n, 0.05);
      if (facing <= 0) continue;
      if (traceOpaque(from, sunDir, 300, hit) <= 0) continue;
      clear++;
      /* Where the beam through this point lands inside. */
      const into = p.clone().addScaledVector(u, su).setY(p.y + sv).addScaledVector(n, -0.05);
      if (traceOpaque(into, back, 40, hit) <= 0) {
        lands.push(`${(hit.object?.name || '?').slice(0, 18)}@${r2(hit.distance)}m ` +
          `(${r2(hit.point.x)},${r2(hit.point.y)},${r2(hit.point.z)})`);
      }
    }
    rows.push({
      at: [r2(p.x), r2(p.y), r2(p.z)], size: [r2(hw * 2), r2(hh * 2)],
      n: [r2(n.x), r2(n.z)], facing: r2(facing), clear, lands: lands.slice(0, 2),
    });
  }
  rows.sort((a, b) => b.clear - a.clear || b.facing - a.facing);

  /* Room-mean direct irradiance over enclosed cells near the camera, which is
     what the enclosure form of the interreflection is driven by. */
  const res = volume.resolution, min = volume.bounds.min, cell = volume.cell;
  const ISO = Math.PI * 0.886227;
  let sum = 0, n = 0, hi = 0, lo = 1e9;
  const hist = [];
  for (let p = 0; p < volume.probeCount; p++) {
    if (volume.portalSlot[p] < 0 || volume.interred[p]) continue;
    const ix = p % res.x, iy = Math.floor(p / res.x) % res.y, iz = Math.floor(p / (res.x * res.y));
    const w = new THREE.Vector3(min.x + ix * cell.x, min.y + iy * cell.y, min.z + iz * cell.z);
    if (w.distanceTo(cam.position) > 12) continue;
    const dc = volume.sh[p * 27] * ISO;
    sum += dc; n++; hi = Math.max(hi, dc); lo = Math.min(lo, dc);
    hist.push({ c: [ix, iy, iz], at: [r2(w.x), r2(w.y), r2(w.z)], dc: r4(dc),
      open: r4(volume.visibility[p * 4 + 3]) });
  }
  hist.sort((a, b) => b.dc - a.dc);

  return {
    sun: { el: r2(el), az: r2(az), dir: [r2(sunDir.x), r2(sunDir.y), r2(sunDir.z)] },
    rows, mean: r4(sum / Math.max(n, 1)), n, hi: r4(hi), lo: r4(lo),
    reflect: [r4(volume.stats.reflectance?.r ?? 0), r4(volume.stats.reflectance?.g ?? 0),
      r4(volume.stats.reflectance?.b ?? 0)],
    hist: hist.slice(0, 16),
  };
}, SHOT);

const pad = (s, w) => String(s).padEnd(w);
console.log(`sun elevation ${out.sun.el} deg  azimuth ${out.sun.az}  dir ${out.sun.dir.join(',')}`);
console.log('\n-- openings near the camera: is the sun clear of them? --');
console.log(pad('centre', 24) + pad('size', 12) + pad('normal', 12) + pad('n.sun', 8) + pad('clear/5', 9) + 'beam lands on');
for (const r of out.rows) {
  console.log(pad(r.at.join(','), 24) + pad(r.size.join('x'), 12) + pad(r.n.join(','), 12) +
    pad(r.facing, 8) + pad(r.clear, 9) + (r.lands[0] ?? ''));
  for (const l of r.lands.slice(1)) console.log(pad('', 65) + l);
}
console.log(`\nroom cells ${out.n}  mean direct irradiance ${out.mean}  range ${out.lo} .. ${out.hi}`);
console.log(`measured room reflectance ${out.reflect.join(', ')}`);
console.log('\n-- brightest room cells --');
console.log(pad('cell', 14) + pad('world', 24) + pad('open', 10) + 'direct E');
for (const h of out.hist) {
  console.log(pad(h.c.join(','), 14) + pad(h.at.join(','), 24) + pad(h.open, 10) + h.dc);
}
await browser.close();
