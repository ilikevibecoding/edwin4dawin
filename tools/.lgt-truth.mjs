/**
 * Scratch diagnostic. Not part of the build.
 *
 * For every probe cell around the café, measures the true full-sphere openness
 * with enough rays to resolve a window (1024), and prints it beside what the
 * bake recorded. Anywhere truth is high and the bake is zero, the bake is
 * missing an opening; anywhere both are zero, the room really is sealed at that
 * point and no amount of sampling will find light there.
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
  const lighting = engine.get('lighting');
  const physics = engine.get('physics');
  const v = lighting.volume;
  for (let i = 0; i < 400 && !(v.ready && !v.baking); i++) engine.step(1 / 60);

  const nx = v.resolution.x, ny = v.resolution.y, nz = v.resolution.z;
  const b = v.bounds;
  const cell = [
    (b.max.x - b.min.x) / (nx - 1),
    (b.max.y - b.min.y) / (ny - 1),
    (b.max.z - b.min.z) / (nz - 1),
  ];
  const hit = {
    point: new THREE.Vector3(), normal: new THREE.Vector3(),
    distance: 0, object: new THREE.Object3D(), surface: 'concrete',
  };
  const dir = new THREE.Vector3();
  const r2 = (x) => Math.round(x * 100) / 100;
  const MASK = 0xffff;

  const N = 1024;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const truth = (p) => {
    let open = 0;
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N;
      const r = Math.sqrt(Math.max(1 - y * y, 0));
      const th = golden * i;
      dir.set(Math.cos(th) * r, y, Math.sin(th) * r);
      if (!physics.raycastInto(p, dir, 32, hit, MASK)) open++;
    }
    return open / N;
  };

  const y0 = Math.max(0, Math.floor((4.0 - b.min.y) / cell[1]));
  const y1 = Math.min(ny - 1, Math.ceil((7.6 - b.min.y) / cell[1]));
  const x0 = Math.max(0, Math.floor((-19 - b.min.x) / cell[0]));
  const x1 = Math.min(nx - 1, Math.ceil((-4 - b.min.x) / cell[0]));
  const z0 = Math.max(0, Math.floor((-13 - b.min.z) / cell[2]));
  const z1 = Math.min(nz - 1, Math.ceil((0 - b.min.z) / cell[2]));

  const at = new THREE.Vector3();
  const slices = [];
  for (let iy = y0; iy <= y1; iy++) {
    const rows = [];
    for (let iz = z0; iz <= z1; iz++) {
      const cells = [];
      for (let ix = x0; ix <= x1; ix++) {
        const p = ix + nx * (iy + ny * iz);
        /* The traced position, which is where the bake actually measured. */
        at.set(v.positions[p * 3], v.positions[p * 3 + 1], v.positions[p * 3 + 2]);
        const grid = new THREE.Vector3(
          b.min.x + ix * cell[0], b.min.y + iy * cell[1], b.min.z + iz * cell[2],
        );
        cells.push({
          baked: r2(v.visibility[p * 4 + 3]),
          truth: r2(truth(at)),
          moved: r2(at.distanceTo(grid)),
        });
      }
      rows.push({ z: r2(b.min.z + iz * cell[2]), cells });
    }
    slices.push({ iy, y: r2(b.min.y + iy * cell[1]), rows });
  }
  return { cell: cell.map(r2), xStart: r2(b.min.x + x0 * cell[0]), slices };
});

console.log('cell', out.cell.join(' x '), '  x from', out.xStart);
const f = (n) => (n < 0 ? ' XX ' : n.toFixed(2).slice(1).padStart(4));
for (const s of out.slices) {
  console.log(`\n--- y = ${s.y} (iy ${s.iy}) ---`);
  for (const r of s.rows) {
    console.log(
      `z${String(r.z).padStart(7)}  baked ` + r.cells.map((c) => f(c.baked)).join(' ') +
      '  truth ' + r.cells.map((c) => f(c.truth)).join(' ') +
      '  moved ' + r.cells.map((c) => c.moved.toFixed(1).padStart(4)).join(' '),
    );
  }
}
await browser.close();
