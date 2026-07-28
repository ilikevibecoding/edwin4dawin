#!/usr/bin/env node
/** Scratch: is there any sunlit standing room near the portrait anchor? */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const URL = process.argv[2] || 'http://127.0.0.1:5199/';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--headless=new', '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--mute-audio'],
  protocolTimeout: 900000,
});
const page = await browser.newPage();
await page.setViewport({ width: 640, height: 360 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=medium`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const api = window.__AI__;
  const THREE = g.THREE;
  g.pose('ai_soldier');
  const physics = g.engine.get('physics');
  const world = g.engine.get('world');
  const sky = g.engine.tryGet('sky');
  const sun = sky.sunDirection.clone();
  const exposure = (x, y, z) => {
    let lit = 0;
    for (let i = 0; i < 3; i++) {
      const from = new THREE.Vector3(x, y + 0.4 + i * 0.7, z);
      if (!physics.raycast(from, sun, 70, 1 | 2)) lit++;
    }
    return lit / 3;
  };
  const rc = new THREE.Raycaster();
  rc.far = 70;
  const shaded = (x, y, z) => rc.set(new THREE.Vector3(x, y, z), sun) || rc.intersectObject(world.root, true).length > 0;
  const sunBearing = Math.atan2(sun.x, sun.z);
  const sx = Math.sin(sunBearing);
  const sz = Math.cos(sunBearing);
  const score = (p) =>
    exposure(p.x, p.y, p.z) * 2 +
    exposure(p.x + sx, p.y, p.z + sz) +
    exposure(p.x - sx, p.y, p.z - sz) -
    (shaded(p.x, p.y + 1.15, p.z) ? 3 : 0);

  const agent = api.agents()[0];
  const here = new THREE.Vector3(agent.position[0], agent.position[1], agent.position[2]);
  const rings = [];
  for (let r = 2.5; r <= 7; r += 2.5) {
    const row = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const p = new THREE.Vector3(here.x + Math.cos(a) * r, here.y, here.z + Math.sin(a) * r);
      world.nearestNavPoint(p, p);
      const snap = Math.hypot(p.x - here.x, p.z - here.z);
      row.push({ deg: Math.round((a * 180) / Math.PI), snap: +snap.toFixed(1), s: +score(p).toFixed(2), far: snap > r + 1.5 });
    }
    rings.push({ r, row });
  }
  return {
    sunBearing: Math.round((sunBearing * 180) / Math.PI),
    sunElev: Math.round((Math.asin(sun.y) * 180) / Math.PI),
    anchor: api.anchor().map((v) => +v.toFixed(2)),
    agentAt: [+here.x.toFixed(2), +here.y.toFixed(2), +here.z.toFixed(2)],
    agentScore: +score(here).toFixed(2),
    rings,
  };
});
console.log('sun bearing', out.sunBearing, 'elev', out.sunElev);
console.log('anchor', out.anchor, '| agent', out.agentAt, 'score', out.agentScore);
for (const { r, row } of out.rings) {
  console.log(`r=${r}`, row.map((c) => `${c.deg}:${c.s}${c.far ? '(far)' : ''}`).join(' '));
}
await browser.close();
