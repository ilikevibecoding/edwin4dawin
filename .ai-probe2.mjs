import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--mute-audio', '--window-size=640,360'],
  protocolTimeout: 600000,
  defaultViewport: { width: 640, height: 360 },
});
const page = await browser.newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('  pageerror', e.message));
await page.goto('http://127.0.0.1:5173/?showcase=ai&capture=1&quality=low', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });
console.log('ready');

const out = await page.evaluate(() => {
  const physics = window.__GAME__.engine.get('physics');
  const THREE = window.__GAME__.THREE;
  const P = new THREE.Vector3(8.4936, 2.0089, -55.4892);
  const o = new THREE.Vector3();
  const d = new THREE.Vector3();
  const fans = [];
  for (const h of [0.1, 0.3, 0.5, 0.9, 1.4, 1.7]) {
    const row = [];
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      o.copy(P); o.y += h;
      d.set(Math.cos(ang), 0, Math.sin(ang));
      const hit = physics.raycast(o, d, 1.6);
      row.push(hit ? `${(ang / Math.PI * 180) | 0}:${hit.distance.toFixed(2)}/${hit.object?.name ?? '?'}` : '');
    }
    fans.push({ h, row: row.filter(Boolean) });
  }
  // Downward probes on a fine grid to map the local floor
  const floor = [];
  for (let dz = -1.5; dz <= 1.5; dz += 0.5) {
    let row = '';
    for (let dx = -1.5; dx <= 1.5; dx += 0.25) {
      o.set(P.x + dx, P.y + 2.5, P.z + dz);
      d.set(0, -1, 0);
      const h = physics.raycast(o, d, 6);
      row += h ? (h.point.y - 1.6).toFixed(1).padStart(5) : '  ---';
    }
    floor.push(`z${dz.toFixed(1).padStart(5)} ${row}`);
  }
  // What does moveCharacter do with a westward push from here?
  const results = [];
  for (const [vx, vz] of [[-4, 0], [0, -4], [0, 4], [4, 0], [-3, -3], [-3, 3]]) {
    const pos = P.clone();
    const vel = new THREE.Vector3(vx, -1, vz);
    let total = 0;
    for (let i = 0; i < 30; i++) {
      const r = physics.moveCharacter(pos, vel, 0.34, 1.78, 1 / 60, 0.42);
      total += Math.hypot(r.position.x - pos.x, r.position.z - pos.z);
      pos.copy(r.position);
      vel.copy(r.velocity);
      vel.x = vx; vel.z = vz; vel.y -= 9.81 / 60;
    }
    results.push(`v=(${vx},${vz}) travelled ${total.toFixed(2)} to ${pos.toArray().map((v) => v.toFixed(2)).join(',')}`);
  }
  return { fans, floor, results };
});
console.log('horizontal fans from the stuck point (dist/name within 1.6 m):');
for (const f of out.fans) console.log(`  h=${f.h}:`, f.row.join('  ') || '(clear all round)');
console.log('floor heights relative to y=1.6, x from -1.5 to +1.5 in 0.25 steps:');
for (const r of out.floor) console.log('  ' + r);
console.log('move tests:');
for (const r of out.results) console.log('  ' + r);
await browser.close();
