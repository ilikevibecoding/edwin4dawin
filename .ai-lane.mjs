#!/usr/bin/env node
/** Scratch: what lanes exist around the AI anchor, and how much room beside each? */
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
await page.setViewport({ width: 640, height: 360, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 400)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=low`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const api = window.__AI__;
  const THREE = g.THREE;
  const world = g.engine.get('world');
  const physics = g.engine.get('physics');
  const sky = g.engine.tryGet('sky');
  g.pose('ai_squad');
  const a = api.anchor();
  const from = new THREE.Vector3(a[0], a[1], a[2]);
  const MASK = 1 | 2;
  const hit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: 'concrete' };
  const cast = (o, d, max) => (physics.raycastInto(o, d, max, hit, MASK) ? hit.distance : max);
  const sunBearing = sky ? Math.atan2(sky.sunDirection.x, sky.sunDirection.z) : 0;
  const rows = [];
  for (let deg = -180; deg < 180; deg += 10) {
    const bearing = (deg * Math.PI) / 180;
    const sx = Math.sin(bearing);
    const sz = Math.cos(bearing);
    let run = 0;
    let lit = 0;
    let samples = 0;
    for (let d = 2; d <= 16; d += 2) {
      const x = from.x + sx * d;
      const z = from.z + sz * d;
      if (!world.isWalkable(x, z)) break;
      run = d;
      const p = new THREE.Vector3(x, world.terrainHeight(x, z) + 1.2, z);
      const up = new THREE.Vector3(0, 1, 0);
      if (!physics.raycastInto(p, up, 14, hit, MASK) && !physics.raycastInto(p, sky.sunDirection, 70, hit, MASK)) lit++;
      samples++;
    }
    let roomL = 0;
    let roomR = 0;
    if (run > 4) {
      const mx = from.x + sx * run * 0.34;
      const mz = from.z + sz * run * 0.34;
      const o = new THREE.Vector3(mx, world.terrainHeight(mx, mz) + 1.7, mz);
      roomL = +cast(o, new THREE.Vector3(-sz, 0, sx), 10).toFixed(1);
      roomR = +cast(o, new THREE.Vector3(sz, 0, -sx), 10).toFixed(1);
    }
    rows.push({ deg, run, lit: samples ? +(lit / samples).toFixed(2) : 0, roomL, roomR });
  }
  rows.sort((p, q) => Math.max(q.roomL, q.roomR) - Math.max(p.roomL, p.roomR) || q.run - p.run);
  const cam = g.engine.camera ?? g.engine.get('render').camera;
  const camPos = new THREE.Vector3();
  cam.getWorldPosition(camPos);
  return {
    anchor: [+from.x.toFixed(2), +from.y.toFixed(2), +from.z.toFixed(2)],
    sunDeg: Math.round((sunBearing * 180) / Math.PI),
    marchDeg: api.agents().map((x) => Math.round((x.heading * 180) / Math.PI)),
    camDeg: Math.round((Math.atan2(camPos.x - from.x, camPos.z - from.z) * 180) / Math.PI),
    camGround: +physics.groundHeight(camPos.x, camPos.z, camPos.y + 3).toFixed(2),
    camY: +camPos.y.toFixed(2),
    best: rows.slice(0, 12),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
