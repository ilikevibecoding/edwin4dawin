/**
 * Scratch diagnostic. Not part of the build.
 *
 * Fires straight at a window pane the scene graph says is there, and reports
 * what the collision world puts in the way. If the answer is the pane itself,
 * then windows are sealed to the bake by their glazing rather than by their
 * walls, and the surface type in the hit is enough to see through them.
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
  for (let i = 0; i < 20; i++) engine.step(1 / 60);
  const physics = engine.get('physics');

  const hit = {
    point: new THREE.Vector3(), normal: new THREE.Vector3(),
    distance: 0, object: new THREE.Object3D(), surface: 'concrete',
  };
  const r2 = (x) => Math.round(x * 100) / 100;
  const dir = new THREE.Vector3();
  const from = new THREE.Vector3();

  /* Panes the scene graph reported around the café. */
  const targets = [
    [-8.21, 6.07, -11.95],
    [-8.21, 4.8, -11.45],
    [-8.21, 6.09, -0.5],
    [-18.9, 6.15, -12.79],
    [-9.3, 6.57, -12.79],
  ];
  const origins = [
    [-11.0, 6.07, -11.95],
    [-11.0, 4.8, -11.45],
    [-11.0, 6.09, -0.5],
    [-18.9, 6.15, -9.5],
    [-9.3, 6.57, -9.5],
  ];

  const rows = [];
  for (let i = 0; i < targets.length; i++) {
    from.fromArray(origins[i]);
    dir.fromArray(targets[i]).sub(from);
    const want = dir.length();
    dir.multiplyScalar(1 / want);
    const chain = [];
    let travelled = 0;
    const p = from.clone();
    for (let step = 0; step < 6; step++) {
      if (!physics.raycastInto(p, dir, 40, hit, 0xffff)) { chain.push('ESCAPED'); break; }
      const m = Array.isArray(hit.object.material) ? hit.object.material[0] : hit.object.material;
      travelled += hit.distance;
      chain.push(`${hit.surface}/${m?.name ?? '?'}@${r2(travelled)}`);
      p.copy(hit.point).addScaledVector(dir, 0.02);
    }
    rows.push({ from: origins[i], toPane: r2(want), chain });
  }
  return rows;
});

for (const r of out) {
  console.log(`from ${r.from.join(', ')}  (pane at ${r.toPane} m)`);
  console.log('   ' + r.chain.join('  ->  '));
}
await browser.close();
