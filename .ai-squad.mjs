#!/usr/bin/env node
/** Scratch: what is in front of the squad camera, and where are the men on screen? */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const URL = process.argv[2] || 'http://127.0.0.1:5198/';
const SHOT = process.argv[3] || 'ai_squad';

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

const out = await page.evaluate((shot) => {
  const g = window.__GAME__;
  const api = window.__AI__;
  const THREE = g.THREE;
  g.pose(shot);
  const ai = g.engine.get('ai');
  const physics = g.engine.get('physics');
  const cam = g.engine.camera ?? g.engine.get('render').camera;
  const B = api.boneIndex();
  const deg = (r) => (r * 180) / Math.PI;

  const proj = (p) => {
    const v = new THREE.Vector3(p[0], p[1], p[2]).project(cam);
    return [Math.round(((v.x + 1) / 2) * 960), Math.round(((1 - v.y) / 2) * 540), v.z];
  };

  const men = [];
  for (const a of ai.agentList) {
    if (!a.active || !a.alive) continue;
    const b = api.bones(a.id);
    const pts = [B.head, B.pelvis, B.footL, B.footR].map((i) => proj(b[i]));
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const d = Math.hypot(cam.position.x - a.position.x, cam.position.z - a.position.z);
    // Line of sight to his chest, ignoring nothing.
    const chest = new THREE.Vector3(b[B.chest][0], b[B.chest][1], b[B.chest][2]);
    const los = physics.lineOfSight(cam.position, chest, []);
    men.push({
      id: a.id, s: a.state, d: +d.toFixed(1), los,
      px: `${Math.min(...xs)}..${Math.max(...xs)} x ${Math.min(...ys)}..${Math.max(...ys)}`,
      tall: Math.max(...ys) - Math.min(...ys),
      onScreen: Math.min(...xs) > 4 && Math.max(...xs) < 956 && Math.max(...ys) < 536,
      speed: +Math.hypot(a.velocity[0] ?? a.velocity.x ?? 0, a.velocity[2] ?? a.velocity.z ?? 0).toFixed(2),
    });
  }
  // Fan of rays out of the lens: what stands within five metres of the camera?
  const near = [];
  const dir = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  cam.getWorldDirection(fwd);
  for (let u = -0.42; u <= 0.43; u += 0.14) {
    for (let v = -0.24; v <= 0.25; v += 0.12) {
      dir.copy(fwd);
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -u);
      dir.y += v;
      dir.normalize();
      const hit = physics.raycast(cam.position, dir, 6, 0xffffffff);
      if (hit && hit.distance < 5) {
        near.push({ u: +u.toFixed(2), v: +v.toFixed(2), d: +hit.distance.toFixed(2), what: hit.object?.name || '?' });
      }
    }
  }
  const spread = [];
  for (let i = 0; i < men.length; i++) {
    for (let j = i + 1; j < men.length; j++) spread.push(0);
  }
  const alive = ai.agentList.filter((a) => a.active && a.alive);
  let widest = 0;
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      widest = Math.max(widest, alive[i].position.distanceTo(alive[j].position));
    }
  }
  void spread;
  return {
    cam: [+cam.position.x.toFixed(1), +cam.position.y.toFixed(2), +cam.position.z.toFixed(1)],
    camBearing: +deg(Math.atan2(fwd.x, fwd.z)).toFixed(1),
    camPitch: +deg(Math.asin(-fwd.y)).toFixed(1),
    fov: cam.fov,
    men, widest: +widest.toFixed(1),
    nearCount: near.length, near: near.slice(0, 14),
    sweep: api.sweep ? api.sweep() : null,
    lane: api.laneSide ? { side: api.laneSide(), room: api.laneRoom(), both: api.laneRoomBoth() } : null,
  };
}, SHOT);
console.log(JSON.stringify(out, null, 1));
await browser.close();
