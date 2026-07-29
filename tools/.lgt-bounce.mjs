/**
 * Scratch diagnostic: is the exterior bounce the volume records actually warm?
 *
 * The interior is meant to be lit by the sunlit facade across the street, which
 * is warm. If the SH the grid carries inward is sky-coloured then either no
 * bounce surface is being found in sun, or the sun term is being lost between
 * the trace and the projection. This dumps the cached rays for the probes
 * around the cafe so the two cases can be told apart.
 *
 *   node tools/.lgt-bounce.mjs [shot]
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
  for (let i = 0; i < 4000 && (!volume.ready || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 30; i++) engine.step(1 / 60);

  const r3 = (v) => Math.round(v * 1000) / 1000;
  const RAY_STRIDE = 8;
  const rays = volume.directions.length / 3;
  const nx = volume.resolution.x, ny = volume.resolution.y, nz = volume.resolution.z;

  const room = (world.rooms ?? []).find(
    (r) => cam.position.x > r.rect.x0 && cam.position.x < r.rect.x1 &&
           cam.position.z > r.rect.z0 && cam.position.z < r.rect.z1 &&
           cam.position.y > r.y - 0.5 && cam.position.y < r.y + r.height + 0.5);
  if (!room) return { error: 'camera not in a room' };

  const cx = (room.rect.x0 + room.rect.x1) / 2;
  const cz = (room.rect.z0 + room.rect.z1) / 2;
  const cy = room.y + 1.5;
  const gx = Math.round((cx - volume.origin.x) / volume.cell.x);
  const gy = Math.round((cy - volume.origin.y) / volume.cell.y);
  const gz = Math.round((cz - volume.origin.z) / volume.cell.z);

  /* DC irradiance of a probe's own bounce, and of what has been carried in. */
  function dc(arr, p) {
    const b = p * 27;
    return [arr[b] * Math.PI * 0.282095, arr[b + 1] * Math.PI * 0.282095, arr[b + 2] * Math.PI * 0.282095];
  }

  const rows = [];
  for (let dx = -4; dx <= 4; dx++) {
    const ix = gx + dx;
    if (ix < 0 || ix >= nx) continue;
    const p = ix + nx * (gy + ny * gz);
    const base = p * rays * RAY_STRIDE;
    let escaped = 0, sunlit = 0, sunSum = 0, hit = 0;
    const alb = [0, 0, 0];
    for (let r = 0; r < rays; r++) {
      const s = base + r * RAY_STRIDE;
      const a = volume.rayCache[s] + volume.rayCache[s + 1] + volume.rayCache[s + 2];
      if (a <= 0) { escaped++; continue; }
      hit++;
      alb[0] += volume.rayCache[s]; alb[1] += volume.rayCache[s + 1]; alb[2] += volume.rayCache[s + 2];
      const sv = volume.rayCache[s + 6];
      if (sv > 0) { sunlit++; sunSum += sv; }
    }
    rows.push({
      ix, x: r3(volume.origin.x + ix * volume.cell.x),
      pos: [r3(volume.positions[p * 3]), r3(volume.positions[p * 3 + 1]), r3(volume.positions[p * 3 + 2])],
      open: r3(volume.visibility[p * 4 + 3]),
      bent: [r3(volume.visibility[p * 4]), r3(volume.visibility[p * 4 + 1]), r3(volume.visibility[p * 4 + 2])],
      escaped, hit, sunlit, sunMean: hit ? r3(sunSum / hit) : 0,
      albedo: hit ? alb.map((v) => r3(v / hit)) : [0, 0, 0],
      shDC: dc(volume.sh, p).map(r3),
      spreadDC: dc(volume.shSpread, p).map(r3),
      links: [r3(volume.links[p * 3]), r3(volume.links[p * 3 + 1]), r3(volume.links[p * 3 + 2])],
    });
  }

  /* Global picture: how much of the level's bounce sees sun at all. */
  let totalHit = 0, totalSun = 0;
  for (let p = 0; p < volume.probeCount; p += 3) {
    const base = p * rays * RAY_STRIDE;
    for (let r = 0; r < rays; r++) {
      const s = base + r * RAY_STRIDE;
      if (volume.rayCache[s] + volume.rayCache[s + 1] + volume.rayCache[s + 2] <= 0) continue;
      totalHit++;
      if (volume.rayCache[s + 6] > 0) totalSun++;
    }
  }

  return {
    room: room.name,
    bakeSun: [r3(volume.bakeSun.x), r3(volume.bakeSun.y), r3(volume.bakeSun.z)],
    relightDir: [r3(volume.relightDirection.x), r3(volume.relightDirection.y), r3(volume.relightDirection.z)],
    skyDir: [r3(sky.sunDirection.x), r3(sky.sunDirection.y), r3(sky.sunDirection.z)],
    relightSun: [r3(volume.relightSun.r), r3(volume.relightSun.g), r3(volume.relightSun.b)],
    relightSky: [r3(volume.relightSky.r), r3(volume.relightSky.g), r3(volume.relightSky.b)],
    rays, grid: `${nx}x${ny}x${nz}`, cell: [r3(volume.cell.x), r3(volume.cell.y), r3(volume.cell.z)],
    sunlitFraction: r3(totalSun / Math.max(totalHit, 1)),
    rows,
  };
}, SHOT);

if (out.error) console.log('ERROR:', out.error);
else {
  console.log(`${out.room}  grid ${out.grid}  cell ${out.cell.join(' x ')} m  ${out.rays} rays/probe`);
  console.log(`bakeSun ${out.bakeSun.join(',')}   relightDir ${out.relightDir.join(',')}   sky.sunDirection ${out.skyDir.join(',')}`);
  console.log(`relightSun ${out.relightSun.join(',')}   relightSky ${out.relightSky.join(',')}`);
  console.log(`level-wide: ${(out.sunlitFraction * 100).toFixed(1)}% of bounce rays hit a surface the sun reaches`);
  const pad = (v, n) => String(v).padEnd(n);
  console.log('\n' + pad('x', 9) + pad('open', 7) + pad('bent normal', 22) + pad('esc/hit', 9) + pad('sunlit', 8) + pad('own bounce DC', 22) + pad('carried DC', 22) + 'links x,y,z');
  for (const r of out.rows) {
    console.log(
      pad(r.x, 9) + pad(r.open, 7) + pad(r.bent.join(','), 22) + pad(`${r.escaped}/${r.hit}`, 9) +
      pad(r.sunlit, 8) + pad(r.shDC.join(','), 22) + pad(r.spreadDC.join(','), 22) + r.links.join(','),
    );
  }
}
await browser.close();
