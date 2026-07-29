/**
 * Scratch diagnostic. Not part of the build.
 *
 * Raw probe values in a slab through the cafe: openness, bent normal, and the
 * measured transmission to each neighbour. Interpolated readings can be wrong
 * for two entirely different reasons — the probes are wrong, or the read is —
 * and this separates them.
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
  const engine = g.engine;
  g.pose('cafe_window');
  for (let i = 0; i < 120; i++) engine.step(1 / 60);
  const lighting = engine.get('lighting');
  const volume = lighting.volume;
  const r2 = (x) => Math.round(x * 100) / 100;

  const nx = volume.resolution.x;
  const ny = volume.resolution.y;
  const nz = volume.resolution.z;
  const min = volume.bounds.min;
  const cell = volume.cell;
  const vis = volume.visibility;
  const links = volume.links;

  const xOf = (i) => min.x + i * cell.x;
  const yOf = (i) => min.y + i * cell.y;
  const zOf = (i) => min.z + i * cell.z;

  /* The cafe upper storey: x -14.3..-8.8, y 4.86..7.35, z -14..0.9. */
  const rows = [];
  for (let iy = 0; iy < ny; iy++) {
    const y = yOf(iy);
    if (y < 3.6 || y > 9.5) continue;
    for (let iz = 0; iz < nz; iz++) {
      const z = zOf(iz);
      if (z < -8 || z > -1) continue;
      const line = [];
      for (let ix = 0; ix < nx; ix++) {
        const x = xOf(ix);
        if (x < -17 || x > -6) continue;
        const p = ix + nx * (iy + ny * iz);
        const inside = x > -14.3 && x < -8.8 && y > 4.86 && y < 7.35 && z > -14 && z < 0.9;
        line.push({
          x: r2(x),
          inside,
          w: r2(vis[p * 4 + 3]),
          bent: [r2(vis[p * 4]), r2(vis[p * 4 + 1]), r2(vis[p * 4 + 2])],
          link: [r2(links[p * 3]), r2(links[p * 3 + 1]), r2(links[p * 3 + 2])],
        });
      }
      if (line.length) rows.push({ y: r2(y), z: r2(z), line });
    }
  }

  return {
    resolution: [nx, ny, nz],
    cell: [r2(cell.x), r2(cell.y), r2(cell.z)],
    bounds: [volume.bounds.min.toArray().map(r2), volume.bounds.max.toArray().map(r2)],
    ready: volume.ready,
    rows,
  };
});

console.log(`grid ${out.resolution.join('x')}  cell ${out.cell.join(' x ')}  ready=${out.ready}`);
console.log(`bounds ${JSON.stringify(out.bounds)}`);
console.log('\nw = openness, link = clear fraction to the +x/+y/+z neighbour, * = inside the cafe\n');
for (const r of out.rows) {
  console.log(`y=${String(r.y).padStart(6)}  z=${String(r.z).padStart(6)}`);
  for (const c of r.line) {
    console.log(
      `    x=${String(c.x).padStart(7)}${c.inside ? ' *' : '  '} w=${String(c.w).padEnd(6)}` +
        ` bent=${c.bent.map((v) => String(v).padStart(6)).join(',')}  link=${c.link.join(',')}`,
    );
  }
}
await browser.close();
