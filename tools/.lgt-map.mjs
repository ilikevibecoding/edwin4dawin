/**
 * Scratch diagnostic. Not part of the build.
 *
 * Prints an escape map of the café: a dense azimuth/elevation sweep from a
 * point in the room, marking which directions reach open sky. If the window
 * openings are holes in the collision world they show up as rectangles; if the
 * map is solid the windows are render-only and no amount of raycasting will
 * ever find them, which decides how portals have to be built.
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
    '--window-size=640,360',
  ],
  protocolTimeout: 900000,
  defaultViewport: { width: 640, height: 360 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 300)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 300000, polling: 250 });
await page.waitForFunction(() => window.__GAME__.listShots().includes('cafe_window'), {
  timeout: 300000,
  polling: 250,
});

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const THREE = g.THREE;
  const engine = g.engine;
  const physics = engine.get('physics');
  g.pose('cafe_window');
  for (let i = 0; i < 30; i++) engine.step(1 / 60);

  const hit = {
    point: new THREE.Vector3(), normal: new THREE.Vector3(),
    distance: 0, object: new THREE.Object3D(), surface: 'concrete',
  };
  const dir = new THREE.Vector3();
  const MASK = 0xffff;
  const cam = engine.camera.position.clone();

  const AZ = 144;
  const EL = 33;
  const maps = [];
  const spots = [
    ['mid-room', new THREE.Vector3(-11.0, cam.y - 0.4, -6.0)],
    ['by-camera', cam.clone()],
    ['low-mid', new THREE.Vector3(-11.0, 4.9, -6.0)],
  ];
  for (const [label, origin] of spots) {
    const rows = [];
    let escaped = 0;
    for (let e = 0; e < EL; e++) {
      const elev = ((EL - 1 - e) / (EL - 1)) * 100 - 50;
      const ce = Math.cos((elev * Math.PI) / 180);
      const se = Math.sin((elev * Math.PI) / 180);
      let line = '';
      for (let a = 0; a < AZ; a++) {
        const az = (a / AZ) * Math.PI * 2;
        dir.set(Math.cos(az) * ce, se, Math.sin(az) * ce);
        if (physics.raycastInto(origin, dir, 45, hit, MASK)) {
          line += hit.distance < 3 ? '.' : hit.distance < 10 ? ':' : '-';
        } else {
          line += '#';
          escaped++;
        }
      }
      rows.push({ elev: Math.round(elev), line });
    }
    maps.push({ label, origin: origin.toArray().map((v) => Math.round(v * 100) / 100), escaped, total: AZ * EL, rows });
  }
  return { maps, az: AZ };
});

for (const m of out.maps) {
  console.log(`\n=== ${m.label}  at ${m.origin.join(', ')}   escaped ${m.escaped}/${m.total}`);
  console.log('     az:  0' + ' '.repeat(out.az / 4 - 4) + '90' + ' '.repeat(out.az / 4 - 3) + '180' + ' '.repeat(out.az / 4 - 4) + '270');
  for (const r of m.rows) console.log(String(r.elev).padStart(4) + ' ' + r.line);
}
await browser.close();
