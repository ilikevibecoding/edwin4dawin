/**
 * Scratch diagnostic: a plan view of the cafe's grid slice.
 *
 * Per cell: whether it is inside the room, its measured openness, and how open
 * the link pass found each of its six faces. This is where a window has to show
 * up as a non-zero link across the wall line, and if it does not then nothing
 * downstream can carry light into the room however it is tuned.
 *
 *   node tools/.lgt-slice.mjs [shot]
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
  const physics = engine.get('physics');
  const volume = lighting.volume;
  const cam = engine.camera;
  for (let i = 0; i < 4000 && (!volume.ready || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 20; i++) engine.step(1 / 60);

  const r2 = (v) => Math.round(v * 100) / 100;
  const nx = volume.resolution.x, ny = volume.resolution.y, nz = volume.resolution.z;

  const room = (world.rooms ?? []).find(
    (r) => cam.position.x > r.rect.x0 && cam.position.x < r.rect.x1 &&
           cam.position.z > r.rect.z0 && cam.position.z < r.rect.z1 &&
           cam.position.y > r.y - 0.5 && cam.position.y < r.y + r.height + 0.5);
  if (!room) return { error: 'camera not in a room' };

  const cy = room.y + room.height * 0.5;
  const gy = Math.max(0, Math.min(ny - 1, Math.round((cy - volume.origin.y) / volume.cell.y)));

  /* Independent check: how much of the wall line is actually open, measured
     from the room side with far more rays than the link pass can afford. */
  const MASK = (1 << 0) | (1 << 3) | (1 << 6);
  const hit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: '' };
  const o = new THREE.Vector3(), d = new THREE.Vector3(), t = new THREE.Vector3();
  function faceOpen(px, py, pz, qx, qy, qz, su, sv, ua, va, n) {
    o.set(px, py, pz);
    let clear = 0;
    for (let i = 0; i < n; i++) {
      const u = ((i % 8) + 0.5) / 8 - 0.5;
      const v = (Math.floor(i / 8) + 0.5) / Math.ceil(n / 8) - 0.5;
      t.set(qx, qy, qz);
      t.setComponent(ua, t.getComponent(ua) + u * su * 0.9);
      t.setComponent(va, t.getComponent(va) + v * sv * 0.9);
      d.subVectors(t, o);
      const dist = d.length();
      if (dist < 1e-4) continue;
      d.multiplyScalar(1 / dist);
      /* March through glazing exactly as the bake does. */
      let travelled = 0, through = 1;
      const walk = o.clone();
      for (let pane = 0; ; pane++) {
        const rem = dist - travelled;
        if (rem <= 0) break;
        if (!physics.raycastInto(walk, d, rem, hit, MASK)) break;
        travelled += hit.distance;
        if (hit.surface !== 'glass' || pane >= 3) { through = 0; break; }
        through *= 0.72;
        walk.copy(hit.point).addScaledVector(d, 0.05);
        travelled += 0.05;
      }
      clear += through;
    }
    return clear / n;
  }

  const inRoom = (x, z) => x > room.rect.x0 && x < room.rect.x1 && z > room.rect.z0 && z < room.rect.z1;
  const rows = [];
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const p = ix + nx * (gy + ny * iz);
      const px = volume.positions[p * 3], py = volume.positions[p * 3 + 1], pz = volume.positions[p * 3 + 2];
      const gx = volume.origin.x + ix * volume.cell.x;
      const gz = volume.origin.z + iz * volume.cell.z;
      const near = gx > room.rect.x0 - 3 && gx < room.rect.x1 + 3 && gz > room.rect.z0 - 3 && gz < room.rect.z1 + 3;
      if (!near) continue;
      const lx = ix < nx - 1 ? volume.links[p * 3] : -1;
      const lz = iz < nz - 1 ? volume.links[p * 3 + 2] : -1;
      const lxm = ix > 0 ? volume.links[(p - 1) * 3] : -1;
      const lzm = iz > 0 ? volume.links[(p - nx * ny) * 3 + 2] : -1;
      rows.push({
        ix, iz, gx: r2(gx), gz: r2(gz), inside: inRoom(gx, gz),
        open: r2(volume.visibility[p * 4 + 3]),
        moved: r2(Math.hypot(px - gx, pz - gz)),
        lx: r2(lx), lz: r2(lz), lxm: r2(lxm), lzm: r2(lzm),
      });
    }
  }

  /* Dense re-measure of the faces that cross the room's +x and -x wall line. */
  const dense = [];
  for (const r of rows) {
    if (!r.inside) continue;
    const p = r.ix + nx * (gy + ny * r.iz);
    for (const [axis, side] of [[0, 1], [0, -1], [2, 1], [2, -1]]) {
      const stride = axis === 0 ? 1 : nx * ny;
      const q = p + side * stride;
      const qx = volume.origin.x + ((q % nx)) * volume.cell.x;
      const qz = volume.origin.z + Math.floor(q / (nx * ny)) * volume.cell.z;
      if (inRoom(qx, qz)) continue;
      if (q < 0 || q >= volume.probeCount) continue;
      const su = axis === 0 ? volume.cell.y : volume.cell.x;
      const sv = axis === 2 ? volume.cell.y : volume.cell.z;
      const ua = axis === 0 ? 1 : 0;
      const va = axis === 2 ? 1 : 2;
      const baked = volume.links[(side > 0 ? p : q) * 3 + axis];
      const measured = faceOpen(
        volume.positions[p * 3], volume.positions[p * 3 + 1], volume.positions[p * 3 + 2],
        volume.positions[q * 3], volume.positions[q * 3 + 1], volume.positions[q * 3 + 2],
        su, sv, ua, va, 256,
      );
      dense.push({
        from: `${r.gx},${r.gz}`, to: `${r2(qx)},${r2(qz)}`,
        axis: axis === 0 ? 'x' : 'z', side,
        baked: r2(baked), measured: r2(measured),
        qOpen: r2(volume.visibility[q * 4 + 3]),
      });
    }
  }

  return {
    room: room.name, gy, cy: r2(cy),
    cell: [r2(volume.cell.x), r2(volume.cell.y), r2(volume.cell.z)],
    rect: [r2(room.rect.x0), r2(room.rect.z0), r2(room.rect.x1), r2(room.rect.z1)],
    rows, dense,
  };
}, SHOT);

if (out.error) console.log('ERROR:', out.error);
else {
  console.log(`${out.room}  slice y=${out.cy} (gy ${out.gy})  cell ${out.cell.join(' x ')}  rect x ${out.rect[0]}..${out.rect[2]} z ${out.rect[1]}..${out.rect[3]}`);
  const pad = (v, n) => String(v).padEnd(n);
  console.log('\n' + pad('x', 9) + pad('z', 9) + pad('in', 4) + pad('open', 7) + pad('moved', 7) + pad('link -x', 9) + pad('link +x', 9) + pad('link -z', 9) + 'link +z');
  for (const r of out.rows) {
    console.log(pad(r.gx, 9) + pad(r.gz, 9) + pad(r.inside ? 'Y' : '.', 4) + pad(r.open, 7) +
      pad(r.moved, 7) + pad(r.lxm, 9) + pad(r.lx, 9) + pad(r.lzm, 9) + r.lz);
  }
  console.log('\n-- faces crossing the room boundary: 12-ray bake vs 256-ray re-measure --');
  console.log(pad('from', 14) + pad('to', 14) + pad('axis', 6) + pad('baked', 8) + pad('dense', 8) + 'neighbour openness');
  for (const d of out.dense) {
    console.log(pad(d.from, 14) + pad(d.to, 14) + pad(`${d.axis}${d.side > 0 ? '+' : '-'}`, 6) +
      pad(d.baked, 8) + pad(d.measured, 8) + d.qOpen);
  }
}
await browser.close();
