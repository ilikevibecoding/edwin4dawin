#!/usr/bin/env node
/** Scratch: where does the corpse settle, how big is it, and is the sun on it? */
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
await page.setViewport({ width: 960, height: 540 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=medium`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const api = window.__AI__;
  const THREE = g.THREE;
  g.pose('ai_ragdoll');
  const physics = g.engine.get('physics');
  const sky = g.engine.tryGet('sky');
  const hit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: 'concrete' };
  const litAt = (p) => !physics.raycastInto(p, sky.sunDirection, 70, hit, 1 | 2);
  const a = api.agents()[0];
  const rag = api.ragdoll(a.id);
  const names = ['pelvis', 'chest', 'head', 'elbowL', 'handL', 'elbowR', 'handR', 'kneeL', 'footL', 'kneeR', 'footR'];
  const pts = rag.points;
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9, minY = 1e9, maxY = -1e9;
  for (const p of pts) {
    minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
    minZ = Math.min(minZ, p[2]); maxZ = Math.max(maxZ, p[2]);
    minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
  }
  const anchor = api.anchor();
  const cam = g.engine.camera ?? g.engine.get('render').camera;
  const camPos = new THREE.Vector3(); cam.getWorldPosition(camPos);
  const deg = (r) => Math.round((r * 180) / Math.PI);
  const V = (i) => new THREE.Vector3(pts[i][0], pts[i][1], pts[i][2]);
  // Interior angle at `mid` between root and end, reported as flexion from straight.
  const flex = (root, mid, end) => {
    const a = V(root).sub(V(mid)), b = V(end).sub(V(mid));
    return 180 - deg(a.angleTo(b));
  };
  const hipAxis = V(1).sub(V(0)).normalize();
  const abduct = (hip, knee) => {
    const across = V(0).sub(V(2)); // pelvis relative to head is not lateral; use knee spread
    return deg(V(knee).sub(V(hip)).angleTo(hipAxis.clone().negate()));
  };
  return {
    kneeFlexL: flex(0, 7, 8), kneeFlexR: flex(0, 9, 10),
    elbowFlexL: flex(1, 3, 4), elbowFlexR: flex(1, 5, 6),
    thighFromSpineL: abduct(0, 7), thighFromSpineR: abduct(0, 9),
    kneeApart: +V(7).distanceTo(V(9)).toFixed(2),
    footApart: +V(8).distanceTo(V(10)).toFixed(2),
    spineTilt: deg(V(1).sub(V(0)).angleTo(new THREE.Vector3(0, 1, 0))),
    settled: rag.settled ?? null,
    anchor: anchor.map((v) => +v.toFixed(2)),
    pelvis: pts[0].map((v) => +v.toFixed(2)),
    driftFromAnchor: +Math.hypot(pts[0][0] - anchor[0], pts[0][2] - anchor[2]).toFixed(2),
    spanX: +(maxX - minX).toFixed(2),
    spanZ: +(maxZ - minZ).toFixed(2),
    longest: +Math.hypot(maxX - minX, maxZ - minZ).toFixed(2),
    heightAboveGround: +(minY - physics.groundHeight(pts[0][0], pts[0][2], pts[0][1] + 3)).toFixed(2),
    topY: +(maxY - minY).toFixed(2),
    litJoints: pts.map((p, i) => (litAt(new THREE.Vector3(p[0], p[1] + 0.12, p[2])) ? names[i] : null)).filter(Boolean),
    shadedJoints: pts.map((p, i) => (litAt(new THREE.Vector3(p[0], p[1] + 0.12, p[2])) ? null : names[i])).filter(Boolean),
    camDeg: deg(Math.atan2(camPos.x - pts[0][0], camPos.z - pts[0][2])),
    camDist: +camPos.distanceTo(new THREE.Vector3(pts[0][0], pts[0][1], pts[0][2])).toFixed(2),
    sunDeg: deg(Math.atan2(sky.sunDirection.x, sky.sunDirection.z)),
    sweep: api.sweep(),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
