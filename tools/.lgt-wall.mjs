/**
 * Scratch diagnostic: what stops a ray leaving the cafe?
 *
 * The link pass measures the face between the room's edge cell and the street
 * cell as completely closed, while the render plainly shows windows. Either the
 * collision wall has no hole where the window is, or the pane in it is not
 * tagged as glazing and so is not marched through. This sweeps rays out of the
 * room and reports, per blocking object, the surface name the physics reports.
 *
 *   node tools/.lgt-wall.mjs [shot]
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
  for (let i = 0; i < 120; i++) engine.step(1 / 60);

  const physics = engine.get('physics');
  const world = engine.get('world');
  const cam = engine.camera;
  const r3 = (v) => Math.round(v * 1000) / 1000;

  const room = (world.rooms ?? []).find(
    (r) => cam.position.x > r.rect.x0 && cam.position.x < r.rect.x1 &&
           cam.position.z > r.rect.z0 && cam.position.z < r.rect.z1 &&
           cam.position.y > r.y - 0.5 && cam.position.y < r.y + r.height + 0.5);
  if (!room) return { error: 'camera not in a room' };

  const MASK_ALL = (1 << 0) | (1 << 3) | (1 << 6);
  const MASK_NOGLASS = (1 << 0) | (1 << 3);
  const hit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: '' };
  const dir = new THREE.Vector3();
  const origin = new THREE.Vector3(
    (room.rect.x0 + room.rect.x1) / 2, room.y + 1.6, (room.rect.z0 + room.rect.z1) / 2,
  );

  /* Sweep the whole sphere coarsely and record the first blocker per ray. */
  const blockers = new Map();
  let escaped = 0;
  let glassFirst = 0;
  const N = 4096;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(Math.max(1 - y * y, 0));
    const th = golden * i;
    dir.set(Math.cos(th) * r, y, Math.sin(th) * r);
    if (!physics.raycastInto(origin, dir, 120, hit, MASK_ALL)) { escaped++; continue; }
    if (hit.surface === 'glass') glassFirst++;
    const key = `${(hit.object?.name || hit.object?.type || '?').slice(0, 28)} [${hit.surface}]`;
    const e = blockers.get(key) ?? { n: 0, dist: 0 };
    e.n++; e.dist += hit.distance;
    blockers.set(key, e);
  }

  /* Again ignoring glass entirely: if the wall has a hole, these escape. */
  let escapedNoGlass = 0;
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(Math.max(1 - y * y, 0));
    const th = golden * i;
    dir.set(Math.cos(th) * r, y, Math.sin(th) * r);
    if (!physics.raycastInto(origin, dir, 120, hit, MASK_NOGLASS)) escapedNoGlass++;
  }

  /* And what the *render* scene says: are there window openings in this wall? */
  const glassMeshes = [];
  engine.scene.traverse((o) => {
    if (!o.isMesh || glassMeshes.length > 8) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    const name = (o.name || m?.name || '').toLowerCase();
    if (!/glass|window|pane|glaz/.test(name)) return;
    o.geometry?.computeBoundingBox?.();
    const bb = o.geometry?.boundingBox;
    glassMeshes.push({
      name: (o.name || m?.name || o.type).slice(0, 34),
      transparent: !!m?.transparent,
      count: o.isInstancedMesh ? o.count : 1,
      box: bb ? [r3(bb.min.x), r3(bb.min.y), r3(bb.min.z), r3(bb.max.x), r3(bb.max.y), r3(bb.max.z)] : null,
    });
  });

  const top = [...blockers.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12)
    .map(([k, e]) => ({ k, n: e.n, d: r3(e.dist / e.n) }));

  return {
    room: room.name,
    rect: [r3(room.rect.x0), r3(room.rect.z0), r3(room.rect.x1), r3(room.rect.z1)],
    y: r3(room.y), height: r3(room.height),
    origin: [r3(origin.x), r3(origin.y), r3(origin.z)],
    N, escaped, escapedNoGlass, glassFirst, top, glassMeshes,
  };
}, SHOT);

if (out.error) console.log('ERROR:', out.error);
else {
  console.log(`${out.room}  rect x ${out.rect[0]}..${out.rect[2]}  z ${out.rect[1]}..${out.rect[3]}  y ${out.y} h ${out.height}`);
  console.log(`sweeping ${out.N} rays from ${out.origin.join(',')}`);
  console.log(`  escaped with glass collidable:  ${out.escaped}  (${((100 * out.escaped) / out.N).toFixed(2)}%)`);
  console.log(`  escaped ignoring glass:         ${out.escapedNoGlass}  (${((100 * out.escapedNoGlass) / out.N).toFixed(2)}%)`);
  console.log(`  rays whose first blocker is tagged 'glass': ${out.glassFirst}`);
  console.log('\nwhat stops them:');
  for (const t of out.top) console.log(`  ${String(t.n).padStart(5)}  mean ${String(t.d).padEnd(8)} ${t.k}`);
  console.log('\nglass-ish meshes in the render scene:');
  for (const m of out.glassMeshes) console.log(`  ${m.name}  x${m.count}  transparent=${m.transparent}  box ${m.box?.join(',')}`);
}
await browser.close();
