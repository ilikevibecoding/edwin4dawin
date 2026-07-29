/**
 * Scratch diagnostic: what the room actually receives, measured rather than modelled.
 *
 * Fires a dense sphere trace from points found by probing for the real floor and
 * ceiling (a room has a rug on it and a beam under it, and a point placed at the
 * registered height is inside one of them). Every ray is classified: escaped to
 * sky, or hit something with an estimated radiance. From that it integrates the
 * irradiance an up-facing and a down-facing surface receive, which is the ratio
 * the review is about, and reports where the light came from.
 *
 *   node tools/.lgt-truth3.mjs [shot] [rays]
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const SHOT = process.argv[2] ?? 'cafe_window';
const RAYS = Number(process.argv[3] ?? 4096);
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

  /* `ready` goes true at the end of the gather, which is *before* the harmonics
     are projected and bounced, so waiting on it alone measures a half-baked
     grid. The relight it queues has to land too. */
  for (let i = 0; i < 4000 && (!volume.ready || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 4000 && (volume.pendingRelight || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 20; i++) engine.step(1 / 60);

  const r3 = (v) => Math.round(v * 1000) / 1000;
  const r4 = (v) => Math.round(v * 10000) / 10000;
  const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

  /* Per glass *face*, and six of them, because a pane in this level is a box
     with both faces in the collision set: three windows deep, same as the bake. */
  const GLAZING = Math.sqrt(0.72), LAYERS = 6;
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
      if (out.surface !== 'glass' || pane >= LAYERS) { out.distance = travelled; return 0; }
      through *= GLAZING;
      walk.copy(out.point).addScaledVector(dir, 0.05);
      travelled += 0.05;
    }
  }

  /* ---- albedo, read the way the bake does ----
     Not `material.color`. Every surface in this level is textured and carries a
     white base colour, so reading it makes the reference believe the town is
     painted white: the sunlit facade that lights the cafe came back at 8.0
     knits against the 1.4 the bake measures, and a reference six times bright
     is worse than no reference. `volume.albedoOf` is the texture average the
     bake itself integrates. */
  const albedoOf = (obj) => {
    if (!obj) return [0.4, 0.4, 0.4];
    const c = volume.albedoOf(obj);
    return [c.r, c.g, c.b];
  };

  const sunDir = sky.sunDirection.clone().normalize();
  const sunE = [sky.sunColor.r, sky.sunColor.g, sky.sunColor.b];
  const skyL = [sky.skyColor.r, sky.skyColor.g, sky.skyColor.b];

  /* Real sky radiance per direction where the sky system exposes it, so the
     warm horizon at a low sun is not averaged away into the zenith's blue. */
  const probeDir = new THREE.Vector3();
  const skyRadiance = (dx, dy, dz) => {
    if (typeof sky.radianceAt === 'function') {
      const c = sky.radianceAt(probeDir.set(dx, dy, dz));
      if (c) return [c.r, c.g, c.b];
    }
    return skyL;
  };

  const room = (world.rooms ?? []).find(
    (r) => cam.position.x > r.rect.x0 && cam.position.x < r.rect.x1 &&
           cam.position.z > r.rect.z0 && cam.position.z < r.rect.z1 &&
           cam.position.y > r.y - 0.5 && cam.position.y < r.y + r.height + 0.5);
  if (!room) return { error: 'camera is not in a registered room' };

  const cx = (room.rect.x0 + room.rect.x1) / 2;
  const cz = (room.rect.z0 + room.rect.z1) / 2;
  const mid = new THREE.Vector3(cx, room.y + room.height * 0.5, cz);
  const D = new THREE.Vector3();

  /* Where the floor and the ceiling actually are, under the rug and the beams. */
  const floorY = traceOpaque(mid, D.set(0, -1, 0), 8, hit) === 0 ? mid.y - hit.distance : room.y;
  const ceilY = traceOpaque(mid, D.set(0, 1, 0), 8, hit) === 0 ? mid.y + hit.distance : room.y + room.height;

  /* Fibonacci sphere, shared by every point so the numbers are comparable. */
  const dirs = new Float32Array(RAYS * 3);
  {
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < RAYS; i++) {
      const y = 1 - (2 * (i + 0.5)) / RAYS;
      const r = Math.sqrt(Math.max(1 - y * y, 0));
      const t = golden * i;
      dirs[i * 3] = Math.cos(t) * r; dirs[i * 3 + 1] = y; dirs[i * 3 + 2] = Math.sin(t) * r;
    }
  }

  const hp = new THREE.Vector3();
  /**
   * Sphere trace from a point: the incident radiance field, integrated into the
   * irradiance an up-facing and a down-facing surface would receive.
   */
  function survey(p) {
    const w = (4 * Math.PI) / RAYS;
    const up = [0, 0, 0], down = [0, 0, 0];
    const skyUp = [0, 0, 0], skyDown = [0, 0, 0];
    let openness = 0, escUp = 0, escDown = 0;
    const bent = new THREE.Vector3();
    const who = new Map();
    for (let i = 0; i < RAYS; i++) {
      const dx = dirs[i * 3], dy = dirs[i * 3 + 1], dz = dirs[i * 3 + 2];
      D.set(dx, dy, dz);
      const through = traceOpaque(p, D, 200, hit);
      let L;
      let isSky = false;
      if (through > 0) {
        L = skyRadiance(dx, dy, dz).map((v) => v * through);
        isSky = true;
        openness += through / RAYS;
        bent.x += dx * through; bent.y += dy * through; bent.z += dz * through;
        if (dy > 0) escUp += through / RAYS; else escDown += through / RAYS;
      } else {
        const alb = albedoOf(hit.object);
        let sunVis = 0;
        if (sunDir.y > 0.02 && hit.normal.dot(sunDir) > 0) {
          hp.copy(hit.point).addScaledVector(hit.normal, 0.05);
          sunVis = traceOpaque(hp, sunDir, 200, sHit);
        }
        const ndl = sunVis * Math.max(hit.normal.dot(sunDir), 0);
        /* Sky reaching the bounce surface, measured rather than read from the
           rig: one short sphere trace would be too dear, so a hemisphere of
           eight rays about its normal. */
        let openHit = 0;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          D.set(Math.cos(a) * 0.7, 0.7, Math.sin(a) * 0.7).add(hit.normal).normalize();
          openHit += traceOpaque(hp.copy(hit.point).addScaledVector(hit.normal, 0.05), D, 60, sHit) / 8;
        }
        L = alb.map((v, c) => (v * (sunE[c] * ndl + skyL[c] * Math.PI * openHit)) / Math.PI);
      }
      const cu = Math.max(dy, 0), cd = Math.max(-dy, 0);
      for (let c = 0; c < 3; c++) {
        up[c] += L[c] * cu * w;
        down[c] += L[c] * cd * w;
        if (isSky) { skyUp[c] += L[c] * cu * w; skyDown[c] += L[c] * cd * w; }
      }
      if (!isSky) {
        const key = (hit.object?.name || hit.object?.type || '?').slice(0, 24);
        const e = who.get(key) ?? { n: 0, up: 0, down: 0 };
        e.n++; e.up += luma(L) * cu * w; e.down += luma(L) * cd * w;
        who.set(key, e);
      }
    }
    if (bent.lengthSq() > 1e-9) bent.normalize();
    const top = [...who.entries()].sort((a, b) => b[1].up + b[1].down - a[1].up - a[1].down)
      .slice(0, 4).map(([k, e]) => `${k} n=${e.n} Eup=${r4(e.up)} Edn=${r4(e.down)}`);
    return {
      up, down, skyUp, skyDown, openness, escUp, escDown,
      bent: [r3(bent.x), r3(bent.y), r3(bent.z)], top,
    };
  }

  /* ---- what the rig will compute at the same point ---- */
  const SH_A = [Math.PI, (2 * Math.PI) / 3, (2 * Math.PI) / 3, (2 * Math.PI) / 3,
    Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4];
  const vis4 = new THREE.Vector4();
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
  function shIrradiance(x, y, z, n) {
    const res = volume.resolution, min = volume.bounds.min, cell = volume.cell;
    const f = [
      THREE.MathUtils.clamp((x + n.x * cell.x * 0.5 - min.x) / cell.x, 0, res.x - 1),
      THREE.MathUtils.clamp((y + n.y * cell.y * 0.5 - min.y) / cell.y, 0, res.y - 1),
      THREE.MathUtils.clamp((z + n.z * cell.z * 0.5 - min.z) / cell.z, 0, res.z - 1),
    ];
    const i = f.map((v, k) => Math.min(Math.floor(v), [res.x, res.y, res.z][k] - 1));
    const j = i.map((v, k) => Math.min(v + 1, [res.x, res.y, res.z][k] - 1));
    const t = f.map((v, k) => v - i[k]);
    const c = new Float32Array(27);
    const cells = [];
    for (let k = 0; k < 8; k++) {
      const w = (k & 1 ? t[0] : 1 - t[0]) * (k & 2 ? t[1] : 1 - t[1]) * (k & 4 ? t[2] : 1 - t[2]);
      if (w <= 0) continue;
      const gx = k & 1 ? j[0] : i[0], gy = k & 2 ? j[1] : i[1], gz = k & 4 ? j[2] : i[2];
      const q = (gx + res.x * (gy + res.y * gz)) * 27;
      for (let s = 0; s < 27; s++) c[s] += (volume.sh[q + s] + volume.shSpread[q + s]) * w;
      const v = (gx + res.x * (gy + res.y * gz)) * 4;
      cells.push(`[${gx},${gy},${gz}] w=${r3(w)} open=${r4(volume.visibility[v + 3])} bent=${r3(volume.visibility[v])},${r3(volume.visibility[v + 1])},${r3(volume.visibility[v + 2])} dc=${r4(volume.sh[q] + volume.shSpread[q])}`);
    }
    const b = [0.282095, 0.488603 * n.y, 0.488603 * n.z, 0.488603 * n.x,
      1.092548 * n.x * n.y, 1.092548 * n.y * n.z, 0.315392 * (3 * n.z * n.z - 1),
      1.092548 * n.x * n.z, 0.546274 * (n.x * n.x - n.y * n.y)];
    const rgb = [0, 0, 0];
    for (let s = 0; s < 9; s++) for (let ch = 0; ch < 3; ch++) rgb[ch] += c[s * 3 + ch] * b[s] * SH_A[s];
    return { E: rgb.map((v) => Math.max(v, 0)), cells };
  }

  /* Points on a transect from one wall to the other, just off the real floor
     and the real ceiling. */
  const rows = [];
  const span = room.rect.x1 - room.rect.x0;
  const zs = [cz];
  for (const zz of zs) {
    for (let k = 0; k < 5; k++) {
      const x = room.rect.x0 + (span * (k + 0.5)) / 5;
      for (const [tag, y, ny] of [['floor', floorY + 0.25, 1], ['ceil', ceilY - 0.25, -1]]) {
        const N = new THREE.Vector3(0, ny, 0);
        const s = survey(new THREE.Vector3(x, y, zz));
        volume.sampleVisibility(x, y, zz, vis4, N);
        const ap = apertureOf(vis4, N);
        const shr = shIrradiance(x, y, zz, N);
        /* The prefiltered probe indoors: the shader aims the lookup between the
           opening and the normal, then scales by the aperture. */
        const rigSky = skyL.map((v) => v * Math.PI * ap);
        rows.push({
          tag, x: r3(x), y: r3(y),
          E: (ny > 0 ? s.up : s.down).map(r4),
          Esky: (ny > 0 ? s.skyUp : s.skyDown).map(r4),
          L: r4(luma(ny > 0 ? s.up : s.down)),
          openness: r4(s.openness), escUp: r4(s.escUp), escDown: r4(s.escDown),
          bent: s.bent, top: s.top,
          rigOpen: r4(vis4.w), rigAp: r4(ap),
          rigBent: [r3(vis4.x), r3(vis4.y), r3(vis4.z)],
          rigSky: rigSky.map(r4), rigSh: shr.E.map(r4),
          rigL: r4(luma(rigSky.map((v, i) => v + shr.E[i]))),
          cells: shr.cells,
        });
      }
    }
  }

  return {
    room: room.name, rays: RAYS,
    rect: [r3(room.rect.x0), r3(room.rect.x1), r3(room.rect.z0), r3(room.rect.z1)],
    y: r3(room.y), h: r3(room.height), floorY: r3(floorY), ceilY: r3(ceilY),
    skyL: skyL.map(r3), sunE: sunE.map(r3),
    sunEl: r3((Math.asin(sunDir.y) * 180) / Math.PI),
    hasRadianceAt: typeof sky.radianceAt === 'function',
    grid: `${volume.resolution.x}x${volume.resolution.y}x${volume.resolution.z}`,
    cell: [r3(volume.cell.x), r3(volume.cell.y), r3(volume.cell.z)],
    rows,
  };
}, SHOT, RAYS);

if (out.error) { console.log('ERROR:', out.error); }
else {
  const pad = (v, n) => String(v).padEnd(n);
  console.log(`${out.room}  x ${out.rect[0]}..${out.rect[1]}  z ${out.rect[2]}..${out.rect[3]}  registered y ${out.y} h ${out.h}  real floor ${out.floorY} ceiling ${out.ceilY}`);
  console.log(`sun ${out.sunEl} deg  sunE ${out.sunE.join(', ')}  skyL ${out.skyL.join(', ')}  directional sky ${out.hasRadianceAt}`);
  console.log(`grid ${out.grid}  cell ${out.cell.join(' x ')}  ${out.rays} rays/point\n`);
  console.log('-- reference: dense sphere trace --');
  console.log(pad('point', 18) + pad('E (klux)', 26) + pad('of which sky', 26) + pad('L', 9) + pad('open', 9) + pad('esc up/dn', 18) + 'bent');
  for (const r of out.rows) {
    console.log(
      pad(`${r.tag} x=${r.x}`, 18) + pad(r.E.join(','), 26) + pad(r.Esky.join(','), 26) +
      pad(r.L, 9) + pad(r.openness, 9) + pad(`${r.escUp}/${r.escDown}`, 18) + r.bent.join(','),
    );
  }
  console.log('\n-- rig: what the shader will use --');
  console.log(pad('point', 18) + pad('open', 9) + pad('aperture', 10) + pad('sky term', 26) + pad('SH term', 26) + pad('L', 9) + pad('rig/ref', 9) + 'bent');
  for (const r of out.rows) {
    console.log(
      pad(`${r.tag} x=${r.x}`, 18) + pad(r.rigOpen, 9) + pad(r.rigAp, 10) +
      pad(r.rigSky.join(','), 26) + pad(r.rigSh.join(','), 26) + pad(r.rigL, 9) +
      pad((r.rigL / Math.max(r.L, 1e-9)).toFixed(1), 9) + r.rigBent.join(','),
    );
  }
  console.log('\n-- where the reference light comes from --');
  for (const r of out.rows) {
    console.log(`  ${pad(`${r.tag} x=${r.x}`, 18)}`);
    for (const t of r.top) console.log(`      ${t}`);
  }
  console.log('\n-- grid cells the SH read blends --');
  for (const r of out.rows) {
    console.log(`  ${r.tag} x=${r.x} y=${r.y}`);
    for (const c of r.cells) console.log(`      ${c}`);
  }
  const f = out.rows.filter((r) => r.tag === 'floor');
  const c = out.rows.filter((r) => r.tag === 'ceil');
  const mean = (a, k) => a.reduce((s, r) => s + r[k], 0) / a.length;
  console.log(`\nreference  floor ${mean(f, 'L').toFixed(4)}  ceiling ${mean(c, 'L').toFixed(4)}  floor/ceiling ${(mean(f, 'L') / Math.max(mean(c, 'L'), 1e-9)).toFixed(2)}`);
  console.log(`rig        floor ${mean(f, 'rigL').toFixed(4)}  ceiling ${mean(c, 'rigL').toFixed(4)}  floor/ceiling ${(mean(f, 'rigL') / Math.max(mean(c, 'rigL'), 1e-9)).toFixed(2)}`);
}
await browser.close();
