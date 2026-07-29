/**
 * Scratch diagnostic. Not part of the build.
 *
 * Dense sphere trace from inside the café under different collision masks. The
 * bake treats window glass as an occluder; if dropping it opens the room up,
 * that is the whole reason interiors measure sealed.
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
  for (let i = 0; i < 40; i++) engine.step(1 / 60);
  const physics = engine.get('physics');
  const sky = engine.get('sky');

  const hit = {
    point: new THREE.Vector3(), normal: new THREE.Vector3(),
    distance: 0, object: new THREE.Object3D(), surface: 'concrete',
  };
  const dir = new THREE.Vector3();
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const G = { WORLD: 1, PROP: 1 << 3, GLASS: 1 << 6 };
  const masks = {
    withGlass: G.WORLD | G.PROP | G.GLASS,
    noGlass: G.WORLD | G.PROP,
    worldNoGlass: G.WORLD,
  };

  const spots = [
    ['mid-room', new THREE.Vector3(-11.0, 5.6, -6.0)],
    ['near-floor', new THREE.Vector3(-11.0, 4.9, -6.0)],
    ['west-end', new THREE.Vector3(-14.5, 5.6, -8.0)],
  ];
  const N = 2048;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const rows = [];
  for (const [label, p] of spots) {
    const entry = { label, at: p.toArray().map(r3) };
    for (const [name, m] of Object.entries(masks)) {
      let open = 0;
      const bent = new THREE.Vector3();
      for (let i = 0; i < N; i++) {
        const y = 1 - (2 * (i + 0.5)) / N;
        const r = Math.sqrt(Math.max(1 - y * y, 0));
        const th = golden * i;
        dir.set(Math.cos(th) * r, y, Math.sin(th) * r);
        if (!physics.raycastInto(p, dir, 40, hit, m)) { open++; bent.add(dir); }
      }
      if (bent.lengthSq() > 1e-9) bent.normalize();
      entry[name] = { openness: r3(open / N), escapes: open, bent: bent.toArray().map(r3) };
    }
    rows.push(entry);
  }

  /* Does the sun reach the floor once glass is transparent to the bake? */
  const sun = sky.sunDirection.clone().normalize();
  const down = new THREE.Vector3(0, -1, 0);
  const from = new THREE.Vector3();
  let pts = 0, litAll = 0, litNoGlass = 0;
  for (let a = 0; a < 34; a++) {
    for (let b = 0; b < 34; b++) {
      from.set(-16.5 + a * 0.3, 6.4, -10.5 + b * 0.3);
      if (!physics.raycastInto(from, down, 6, hit, masks.withGlass)) continue;
      if (hit.normal.y < 0.7) continue;
      pts++;
      const q = hit.point.clone().addScaledVector(hit.normal, 0.05);
      if (!physics.raycastInto(q, sun, 80, hit, masks.withGlass)) litAll++;
      if (!physics.raycastInto(q, sun, 80, hit, masks.noGlass)) litNoGlass++;
    }
  }

  return { rows, floor: { pts, litAll, litNoGlass } };
});

for (const r of out.rows) {
  console.log(`\n${r.label} at ${r.at.join(', ')}`);
  for (const k of ['withGlass', 'noGlass', 'worldNoGlass']) {
    console.log(`   ${k.padEnd(14)} openness ${String(r[k].openness).padEnd(7)} (${r[k].escapes} escapes)  bent ${r[k].bent.join(', ')}`);
  }
}
console.log('\nfloor sun test:', JSON.stringify(out.floor));
await browser.close();
