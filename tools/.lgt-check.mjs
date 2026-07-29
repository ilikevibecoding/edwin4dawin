/**
 * Scratch diagnostic: the numbers that decide whether the room reads. Not built.
 *
 * Fast on purpose — no dense reference trace — so it can be run between edits.
 * For a transect across the cafe it reports what the shader will compute for
 * the floor and the ceiling: the aperture scaling the prefiltered probe, and
 * the irradiance the SH grid hands them. Those two are the whole of the
 * interior's indirect light, and their ratio is the defect under review.
 *
 *   node tools/.lgt-check.mjs [shot]
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
  protocolTimeout: 1800000,
  defaultViewport: { width: 320, height: 180 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 200)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 600000, polling: 250 });
await page.waitForFunction((s) => window.__GAME__?.listShots?.().includes(s), {
  timeout: 600000, polling: 250,
}, SHOT);

const out = await page.evaluate((shot) => {
  const g = window.__GAME__;
  const THREE = g.THREE;
  const engine = g.engine;
  g.pose(shot);

  const lighting = engine.get('lighting');
  const world = engine.get('world');
  const sky = engine.get('sky');
  const volume = lighting.volume;
  const cam = engine.camera;

  /* Run the bake right out rather than guessing a frame count. */
  for (let i = 0; i < 4000 && (!volume.ready || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 60; i++) engine.step(1 / 60);

  const r3 = (v) => Math.round(v * 1000) / 1000;
  const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

  const SH_A = [
    Math.PI, (2 * Math.PI) / 3, (2 * Math.PI) / 3, (2 * Math.PI) / 3,
    Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4,
  ];
  /* The grid read three's own probe path makes, on the CPU. */
  function shIrradiance(x0, y0, z0, n) {
    const res = volume.resolution;
    const min = volume.bounds.min;
    const cell = volume.cell;
    /* three's own lookup offsets half a probe spacing along the normal before
       it samples, to keep a surface from reading the cell behind it. Without
       the same offset here a floor reads the slab under it and a ceiling the
       slab over it, and the comparison is against neither. */
    const x = x0 + n.x * cell.x * 0.5;
    const y = y0 + n.y * cell.y * 0.5;
    const z = z0 + n.z * cell.z * 0.5;
    const f = [
      THREE.MathUtils.clamp((x - min.x) / cell.x, 0, res.x - 1),
      THREE.MathUtils.clamp((y - min.y) / cell.y, 0, res.y - 1),
      THREE.MathUtils.clamp((z - min.z) / cell.z, 0, res.z - 1),
    ];
    const i = f.map((v, k) => Math.min(Math.floor(v), [res.x, res.y, res.z][k] - 1));
    const j = i.map((v, k) => Math.min(v + 1, [res.x, res.y, res.z][k] - 1));
    const t = f.map((v, k) => v - i[k]);
    const c = new Float32Array(27);
    for (let k = 0; k < 8; k++) {
      const w = (k & 1 ? t[0] : 1 - t[0]) * (k & 2 ? t[1] : 1 - t[1]) * (k & 4 ? t[2] : 1 - t[2]);
      if (w <= 0) continue;
      const p = ((k & 1 ? j[0] : i[0]) + res.x * ((k & 2 ? j[1] : i[1]) + res.y * (k & 4 ? j[2] : i[2]))) * 27;
      for (let s = 0; s < 27; s++) c[s] += (volume.sh[p + s] + volume.shSpread[p + s]) * w;
    }
    const b = [
      0.282095, 0.488603 * n.y, 0.488603 * n.z, 0.488603 * n.x,
      1.092548 * n.x * n.y, 1.092548 * n.y * n.z, 0.315392 * (3 * n.z * n.z - 1),
      1.092548 * n.x * n.z, 0.546274 * (n.x * n.x - n.y * n.y),
    ];
    const rgb = [0, 0, 0];
    for (let s = 0; s < 9; s++) {
      for (let ch = 0; ch < 3; ch++) rgb[ch] += c[s * 3 + ch] * b[s] * SH_A[s];
    }
    return rgb.map((v) => Math.max(v, 0));
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

  const room = (world.rooms ?? []).find(
    (r) => cam.position.x > r.rect.x0 && cam.position.x < r.rect.x1 &&
           cam.position.z > r.rect.z0 && cam.position.z < r.rect.z1 &&
           cam.position.y > r.y - 0.5 && cam.position.y < r.y + r.height + 0.5,
  );
  if (!room) return { error: 'camera is not in a registered room' };

  const cz = (room.rect.z0 + room.rect.z1) / 2;
  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);
  const vis = new THREE.Vector4();
  /* Sky irradiance the aperture scales, matching the shader's iblIrradiance. */
  const skyE = [sky.skyColor.r, sky.skyColor.g, sky.skyColor.b].map((v) => v * Math.PI);

  const rows = [];
  const span = room.rect.x1 - room.rect.x0;
  for (let k = 0; k < 7; k++) {
    const x = room.rect.x0 + (span * (k + 0.5)) / 7;
    const fy = room.y + 0.05;
    const cy = room.y + room.height - 0.05;

    volume.sampleVisibility(x, fy, cz, vis, UP);
    const fAp = aperture(vis, UP);
    const fBent = [r3(vis.x), r3(vis.y), r3(vis.z)];
    const fOpen = r3(vis.w);
    volume.sampleVisibility(x, cy, cz, vis, DOWN);
    const cAp = aperture(vis, DOWN);
    const cBent = [r3(vis.x), r3(vis.y), r3(vis.z)];
    const cOpen = r3(vis.w);

    const fSh = shIrradiance(x, fy, cz, UP);
    const cSh = shIrradiance(x, cy, cz, DOWN);
    /* The gate the shader applies so the grid and the prefiltered probe do not
       both deliver the sky indoors. */
    const gate = (w) => {
      const t = Math.max(0, Math.min(1, (w - 0.04) / 0.12));
      return t * t * (3 - 2 * t);
    };
    const fTot = fSh.map((v, i) => v + skyE[i] * fAp * gate(fOpen));
    const cTot = cSh.map((v, i) => v + skyE[i] * cAp * gate(cOpen));

    rows.push({
      x: r3(x),
      fOpen, cOpen,
      fAp: r3(fAp), cAp: r3(cAp),
      fBent, cBent,
      fSh: fSh.map(r3), cSh: cSh.map(r3),
      fTot: r3(luma(fTot)), cTot: r3(luma(cTot)),
      ratio: r3(luma(fTot) / Math.max(luma(cTot), 1e-6)),
      fBR: r3(fTot[2] - fTot[0]),
    });
  }

  return {
    room: { name: room.name, y: r3(room.y), h: r3(room.height) },
    grid: `${volume.resolution.x}x${volume.resolution.y}x${volume.resolution.z}`,
    skyE: skyE.map(r3),
    sunEl: r3((Math.asin(sky.sunDirection.clone().normalize().y) * 180) / Math.PI),
    cloudShadowStrength: sky.cloudShadowStrength ?? 'ABSENT',
    rows,
  };
}, SHOT);

if (out.error) {
  console.log('ERROR:', out.error);
} else {
  const pad = (v, n) => String(v).padEnd(n);
  console.log(`${out.room.name}  grid ${out.grid}  sun ${out.sunEl} deg  skyE ${out.skyE.join(', ')}  cloudShadowStrength ${out.cloudShadowStrength}`);
  console.log('\n-- across the room: indirect irradiance the shader will use (kilolux) --');
  for (const r of out.rows) {
    console.log(
      `  x ${pad(r.x, 8)} floor open ${pad(r.fOpen, 7)} ap ${pad(r.fAp, 7)} sh ${pad(r.fSh.join(','), 22)} total ${pad(r.fTot, 8)} bent ${r.fBent.join(',')}`,
    );
    console.log(
      `  ${pad('', 10)} ceil  open ${pad(r.cOpen, 7)} ap ${pad(r.cAp, 7)} sh ${pad(r.cSh.join(','), 22)} total ${pad(r.cTot, 8)} bent ${r.cBent.join(',')}`,
    );
    console.log(`  ${pad('', 10)} floor/ceiling ${r.ratio}   floor B-R ${r.fBR}`);
  }
}
await browser.close();
