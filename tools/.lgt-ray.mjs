/**
 * Scratch diagnostic: audit one cell's portal rays against a dense trace from
 * the identical origin.
 *
 * The estimator and the reference disagree by an order of magnitude somewhere,
 * and the only way to say where is to put them side by side at one point. This
 * picks the interior cell nearest the room's floor centre, then prints:
 *
 *  - every portal ray it kept, with the solid angle it stands for, what it hit,
 *    the sun visibility recorded at the hit, and the irradiance it contributes;
 *  - the same total from the uniform rays, so the split is visible;
 *  - a dense sphere trace from the same origin, integrated the same way.
 *
 *   node tools/.lgt-ray.mjs [shot] [rays]
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const SHOT = process.argv[2] ?? 'cafe_window';
const RAYS = Number(process.argv[3] ?? 8192);
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

const out = await page.evaluate(async (shot, RAYS) => {
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
  for (let i = 0; i < 4000 && !volume.stats.reflectance; i++) engine.step(1 / 60);
  for (let i = 0; i < 200; i++) engine.step(1 / 60);

  const r3 = (v) => Math.round(v * 1000) / 1000;
  const r5 = (v) => Math.round(v * 100000) / 100000;
  const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

  const MASK = (1 << 0) | (1 << 3) | (1 << 6);
  const hit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: '' };
  const sHit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: '' };
  const walk = new THREE.Vector3();
  function traceOpaque(origin, dir, maxDist, out) {
    let travelled = 0, through = 1;
    walk.copy(origin);
    for (let pane = 0; ; pane++) {
      const remaining = maxDist - travelled;
      if (remaining <= 0) return through;
      if (!physics.raycastInto(walk, dir, remaining, out, MASK)) return through;
      travelled += out.distance;
      if (out.surface !== 'glass' || pane >= 3) { out.distance = travelled; return 0; }
      through *= 0.72;
      walk.copy(out.point).addScaledVector(dir, 0.05);
      travelled += 0.05;
    }
  }

  const sunDir = sky.sunDirection.clone().normalize();
  const sunE = [sky.sunColor.r, sky.sunColor.g, sky.sunColor.b];
  const skyL = [sky.skyColor.r, sky.skyColor.g, sky.skyColor.b];

  const room = (world.rooms ?? []).find(
    (r) => cam.position.x > r.rect.x0 && cam.position.x < r.rect.x1 &&
           cam.position.z > r.rect.z0 && cam.position.z < r.rect.z1 &&
           cam.position.y > r.y - 0.5 && cam.position.y < r.y + r.height + 0.5);
  if (!room) return { error: 'camera is not in a registered room' };

  const res = volume.resolution, min = volume.bounds.min, cell = volume.cell;
  const cx = (room.rect.x0 + room.rect.x1) / 2;
  const cz = (room.rect.z0 + room.rect.z1) / 2;
  const D = new THREE.Vector3();
  const mid = new THREE.Vector3(cx, room.y + room.height * 0.5, cz);
  const floorY = traceOpaque(mid, D.set(0, -1, 0), 8, hit) === 0 ? mid.y - hit.distance : room.y;

  /* The interior cell whose stored origin is nearest a point just off the
     middle of the floor: the one the floor's shading reads most of. */
  const want = new THREE.Vector3(cx, floorY + 0.5, cz);
  let pick = -1, pickD = Infinity;
  for (let iz = 0; iz < res.z; iz++) for (let iy = 0; iy < res.y; iy++) for (let ix = 0; ix < res.x; ix++) {
    const p = ix + res.x * (iy + res.y * iz);
    if (volume.portalSlot[p] < 0) continue;
    const d = Math.hypot(
      volume.positions[p * 3] - want.x,
      volume.positions[p * 3 + 1] - want.y,
      volume.positions[p * 3 + 2] - want.z);
    if (d < pickD) { pickD = d; pick = p; }
  }
  if (pick < 0) return { error: 'no enclosed cell near the floor' };

  const home = volume.portalSlot[pick];
  const origin = new THREE.Vector3(
    volume.positions[pick * 3], volume.positions[pick * 3 + 1], volume.positions[pick * 3 + 2]);
  const ix = pick % res.x, iy = Math.floor(pick / res.x) % res.y, iz = Math.floor(pick / (res.x * res.y));

  /* ---- replay the projection for this cell, ray by ray ---- */
  /* Derived, not spelled out: the rig widens a ray record whenever the bounce
     needs another field, and a diagnostic that hardcodes the stride does not
     fail, it reports plausible nonsense. */
  const nUniform = volume.directions.length / 3;
  const RS = Math.round(volume.rayCache.length / (volume.probeCount * nUniform));
  const PRS = RS + 3;
  /** Solid angle: the last field before the portal rays' own direction. */
  const RAY_W = RS - 2;
  /* Derived rather than transcribed: the buffer is one block of PORTAL_RAYS per
     enclosed cell, and reading a stale constant here silently reports only the
     first block's worth of a cell's rays — which looks exactly like the windows
     being starved of them. */
  const enclosed = Number(String(lighting.debugReport().probesEnclosed ?? 0));
  const PR = Math.max(1, Math.round(volume.portalRays.length / (PRS * Math.max(enclosed, 1))));
  const invPi = 1 / Math.PI;
  const rayRows = [];
  const tally = (cache, slot, dx, dy, dz, kind) => {
    const ar = cache[slot], ag = cache[slot + 1], ab = cache[slot + 2];
    const w = cache[slot + RAY_W];
    if (w <= 0) return null;
    const escaped = ar + ag + ab <= 0;
    const sunVis = cache[slot + 6];
    const ambient = cache[slot + 7];
    const ndl = sunVis > 0
      ? sunVis * Math.max(cache[slot + 3] * sunDir.x + cache[slot + 4] * sunDir.y + cache[slot + 5] * sunDir.z, 0)
      : 0;
    const L = escaped ? [0, 0, 0] : [
      ar * (sunE[0] * ndl + skyL[0] * ambient) * invPi,
      ag * (sunE[1] * ndl + skyL[1] * ambient) * invPi,
      ab * (sunE[2] * ndl + skyL[2] * ambient) * invPi];
    /* Irradiance an up-facing surface at the cell takes from this ray. */
    const Eup = luma(L) * Math.max(dy, 0) * w;
    const Edn = luma(L) * Math.max(-dy, 0) * w;
    /* Re-trace the recorded direction from the recorded origin, at the reach the
       bake used and again at survey range, so a ray that stopped short is
       distinguishable from one whose target was simply out of reach. */
    D.set(dx, dy, dz);
    const near = traceOpaque(origin, D, 30, hit);
    const nearAt = near > 0 ? '(clear)' : `${(hit.object?.name || '?').slice(0, 22)}@${r3(hit.distance)}`;
    D.set(dx, dy, dz);
    const far = traceOpaque(origin, D, 200, hit);
    const farAt = far > 0 ? '(sky)' : `${(hit.object?.name || '?').slice(0, 22)}@${r3(hit.distance)}`;
    return { kind, dir: [r3(dx), r3(dy), r3(dz)], w: r5(w), escaped, sunVis: r3(sunVis),
      ambient: r3(ambient), alb: [r3(ar), r3(ag), r3(ab)], L: r5(luma(L)), Eup: r5(Eup), Edn: r5(Edn),
      nearAt, farAt };
  };

  let pOmegaEsc = 0, pOmegaHit = 0, pEup = 0, pEdn = 0, pFired = 0;
  for (let r = 0; r < PR; r++) {
    const slot = (home * PR + r) * PRS;
    if (volume.portalRays[slot + RAY_W] <= 0) continue;
    const dx = volume.portalRays[slot + RS], dy = volume.portalRays[slot + RS + 1], dz = volume.portalRays[slot + RS + 2];
    const row = tally(volume.portalRays, slot, dx, dy, dz, 'portal');
    if (!row) continue;
    pFired++;
    if (row.escaped) pOmegaEsc += volume.portalRays[slot + RAY_W]; else pOmegaHit += volume.portalRays[slot + RAY_W];
    pEup += Number(row.Eup); pEdn += Number(row.Edn);
    rayRows.push(row);
  }

  let uOmegaEsc = 0, uOmegaHit = 0, uEup = 0, uEdn = 0, uStruck = 0;
  for (let r = 0; r < nUniform; r++) {
    const slot = pick * nUniform * RS + r * RS;
    const dx = volume.directions[r * 3], dy = volume.directions[r * 3 + 1], dz = volume.directions[r * 3 + 2];
    if (volume.rayCache[slot + RAY_W] <= 0) { uStruck++; continue; }
    const row = tally(volume.rayCache, slot, dx, dy, dz, 'uniform');
    if (!row) continue;
    if (row.escaped) uOmegaEsc += volume.rayCache[slot + RAY_W]; else uOmegaHit += volume.rayCache[slot + RAY_W];
    uEup += Number(row.Eup); uEdn += Number(row.Edn);
  }

  /* ---- dense reference from the identical origin ---- */
  const hp = new THREE.Vector3();
  const albCache = new Map();
  const albedoOf = (obj) => {
    const m = Array.isArray(obj?.material) ? obj.material[0] : obj?.material;
    if (!m) return [0.4, 0.4, 0.4];
    let v = albCache.get(m.uuid);
    if (!v) { v = [m.color?.r ?? 0.5, m.color?.g ?? 0.5, m.color?.b ?? 0.5]; albCache.set(m.uuid, v); }
    return v;
  };
  const w = (4 * Math.PI) / RAYS;
  const golden = Math.PI * (3 - Math.sqrt(5));
  let rEup = 0, rEdn = 0, rOmegaEsc = 0, rOmegaHit = 0;
  const contrib = [];
  for (let i = 0; i < RAYS; i++) {
    const yy = 1 - (2 * (i + 0.5)) / RAYS;
    const rr = Math.sqrt(Math.max(1 - yy * yy, 0));
    const t = golden * i;
    const dx = Math.cos(t) * rr, dy = yy, dz = Math.sin(t) * rr;
    D.set(dx, dy, dz);
    const through = traceOpaque(origin, D, 200, hit);
    if (through > 0) { rOmegaEsc += w * through; continue; }
    const alb = albedoOf(hit.object);
    let sunVis = 0;
    if (sunDir.y > 0.02 && hit.normal.dot(sunDir) > 0) {
      hp.copy(hit.point).addScaledVector(hit.normal, 0.05);
      sunVis = traceOpaque(hp, sunDir, 200, sHit);
    }
    const ndl = sunVis * Math.max(hit.normal.dot(sunDir), 0);
    let openHit = 0;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      D.set(Math.cos(a) * 0.7, 0.7, Math.sin(a) * 0.7).add(hit.normal).normalize();
      openHit += traceOpaque(hp.copy(hit.point).addScaledVector(hit.normal, 0.05), D, 60, sHit) / 8;
    }
    const L = alb.map((v, c) => (v * (sunE[c] * ndl + skyL[c] * Math.PI * openHit)) / Math.PI);
    const eUp = luma(L) * Math.max(dy, 0) * w;
    rEup += eUp; rEdn += luma(L) * Math.max(-dy, 0) * w;
    rOmegaHit += w;
    if (eUp > 0.0003) {
      contrib.push({ dir: [r3(dx), r3(dy), r3(dz)], name: (hit.object?.name || '?').slice(0, 26),
        dist: r3(hit.distance), sunVis: r3(sunVis), open: r3(openHit), L: r5(luma(L)), Eup: r5(eUp) });
    }
  }
  contrib.sort((a, b) => b.Eup - a.Eup);

  /* Which openings this cell aimed at, if the bake kept them. */
  const PS = 11;
  const aimed = [];
  for (let i = 0; i < volume.portalCount; i++) {
    const b = i * PS;
    const px = volume.portals[b], py = volume.portals[b + 1], pz = volume.portals[b + 2];
    const dxx = px - origin.x, dyy = py - origin.y, dzz = pz - origin.z;
    const dist = Math.hypot(dxx, dyy, dzz);
    if (dist > 30) continue;
    const hw = volume.portals[b + 9], hh = volume.portals[b + 10];
    const nx = volume.portals[b + 3], nz = volume.portals[b + 5];
    const ux = volume.portals[b + 6], uz = volume.portals[b + 8];
    const facing = -(dxx * nx + dzz * nz) / Math.max(dist, 1e-6);
    const omega = (4 * hw * hh * Math.abs(facing)) / Math.max(dist * dist, 1e-6);
    /* The same four quarter points the bake ranks on, so the diagnostic and the
       rig agree about how open an opening is. */
    let clear = 0;
    for (let k = 0; k < 4; k++) {
      const u = (k & 1 ? 0.5 : -0.5) * hw, v = (k & 2 ? 0.5 : -0.5) * hh;
      D.set(px + ux * u - origin.x, py + v - origin.y, pz + uz * u - origin.z);
      const len = D.length();
      D.multiplyScalar(1 / Math.max(len, 1e-6));
      if (traceOpaque(origin, D, len - 0.08, hit) > 0) clear++;
    }
    aimed.push({ at: [r3(px), r3(py), r3(pz)], dist: r3(dist), size: [r3(hw * 2), r3(hh * 2)],
      clear, omega: r5(omega), facing: r3(facing), score: r5(omega * (0.04 + 0.24 * clear)) });
  }
  aimed.sort((a, b) => b.score - a.score);

  return {
    room: room.name, floorY: r3(floorY),
    sunEl: r3((Math.asin(sunDir.y) * 180) / Math.PI), sunE: sunE.map(r3), skyL: skyL.map(r3),
    cell: [ix, iy, iz], origin: [r3(origin.x), r3(origin.y), r3(origin.z)],
    slotWorld: [r3(min.x + ix * cell.x), r3(min.y + iy * cell.y), r3(min.z + iz * cell.z)],
    open: r5(volume.visibility[pick * 4 + 3]),
    dc: r5(volume.sh[pick * 27]), iso: r5(volume.shSpread[pick * 27]),
    portal: { fired: pFired, omegaEsc: r5(pOmegaEsc), omegaHit: r5(pOmegaHit), Eup: r5(pEup), Edn: r5(pEdn) },
    uniform: { rays: nUniform, struck: uStruck, omegaEsc: r5(uOmegaEsc), omegaHit: r5(uOmegaHit), Eup: r5(uEup), Edn: r5(uEdn) },
    reference: { rays: RAYS, omegaEsc: r5(rOmegaEsc), omegaHit: r5(rOmegaHit), Eup: r5(rEup), Edn: r5(rEdn) },
    aimed: aimed.slice(0, 10),
    rays: rayRows.sort((a, b) => b.Eup - a.Eup).slice(0, 24),
    contrib: contrib.slice(0, 14),
  };
}, SHOT, RAYS);

if (out.error) console.log('ERROR:', out.error);
else {
  const pad = (v, n) => String(v).padEnd(n);
  console.log(`${out.room}  floor y ${out.floorY}  sun ${out.sunEl} deg  sunE ${out.sunE.join(',')}  skyL ${out.skyL.join(',')}`);
  console.log(`cell [${out.cell.join(',')}]  slot at ${out.slotWorld.join(',')}  traced from ${out.origin.join(',')}`);
  console.log(`stored openness ${out.open}  dc ${out.dc}  iso ${out.iso}\n`);

  console.log('-- openings within reach, in the order the bake ranks them --');
  console.log(pad('centre', 26) + pad('dist', 8) + pad('size', 14) + pad('omega', 10) + pad('facing', 9) + pad('clear/4', 9) + 'score');
  for (const a of out.aimed) {
    console.log(pad(a.at.join(','), 26) + pad(a.dist, 8) + pad(a.size.join('x'), 14) +
      pad(a.omega, 10) + pad(a.facing, 9) + pad(a.clear, 9) + a.score);
  }

  console.log('\n-- solid angle and irradiance, three ways --');
  console.log(pad('', 12) + pad('rays', 8) + pad('omega escaped', 16) + pad('omega hit', 12) + pad('E up', 10) + 'E down');
  console.log(pad('portal', 12) + pad(out.portal.fired, 8) + pad(out.portal.omegaEsc, 16) + pad(out.portal.omegaHit, 12) + pad(out.portal.Eup, 10) + out.portal.Edn);
  console.log(pad('uniform', 12) + pad(`${out.uniform.rays}-${out.uniform.struck}`, 8) + pad(out.uniform.omegaEsc, 16) + pad(out.uniform.omegaHit, 12) + pad(out.uniform.Eup, 10) + out.uniform.Edn);
  console.log(pad('reference', 12) + pad(out.reference.rays, 8) + pad(out.reference.omegaEsc, 16) + pad(out.reference.omegaHit, 12) + pad(out.reference.Eup, 10) + out.reference.Edn);
  const rigUp = Number(out.portal.Eup) + Number(out.uniform.Eup);
  console.log(`\nrig bounce E up ${rigUp.toFixed(5)}   reference ${out.reference.Eup}   rig/ref ${(rigUp / Math.max(out.reference.Eup, 1e-9)).toFixed(2)}`);

  console.log('\n-- the cell\'s portal rays, strongest first --');
  console.log(pad('dir', 22) + pad('omega', 9) + pad('sunVis', 8) + pad('ambient', 9) +
    pad('L', 9) + pad('Eup', 9) + pad('stops by 30 m', 30) + 'stops by 200 m');
  for (const r of out.rays) {
    console.log(pad(r.dir.join(','), 22) + pad(r.w, 9) +
      pad(r.sunVis, 8) + pad(r.ambient, 9) + pad(r.L, 9) + pad(r.Eup, 9) +
      pad(r.nearAt, 30) + r.farAt);
  }

  console.log('\n-- reference: what actually lights an up-facing surface here --');
  console.log(pad('dir', 22) + pad('object', 28) + pad('dist', 8) + pad('sunVis', 8) + pad('open', 8) + pad('L', 10) + 'Eup');
  for (const c of out.contrib) {
    console.log(pad(c.dir.join(','), 22) + pad(c.name, 28) + pad(c.dist, 8) + pad(c.sunVis, 8) +
      pad(c.open, 8) + pad(c.L, 10) + c.Eup);
  }
}
await browser.close();
