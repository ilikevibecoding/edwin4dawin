#!/usr/bin/env node
/* Scratch: where are the firefight agents relative to the camera, and are they in frame? */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const SHOT = process.argv[2] || 'ai_firefight';
const SETTLE = Number(process.argv[3] || 0);
const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--mute-audio', '--window-size=320,180'],
  protocolTimeout: 900000,
  defaultViewport: { width: 320, height: 180 },
});
const page = await browser.newPage();
page.setDefaultTimeout(900000);
page.on('pageerror', (e) => console.log('  pageerror:', e.message));
await page.goto('http://127.0.0.1:5199/?showcase=ai&capture=1&quality=medium', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });
console.log('ready');

const out = await page.evaluate((shot, settle) => {
  const G = window.__GAME__;
  const THREE = G.THREE;
  G.pose(shot);
  if (settle > 0) G.stepFrames(settle);
  const cam = G.engine.camera;
  cam.updateMatrixWorld();
  const proj = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(proj);
  const physics = G.engine.get('physics');
  const agents = window.__AI__.agents();
  const fwd = new THREE.Vector3();
  cam.getWorldDirection(fwd);
  const rows = agents.map((a) => {
    const p = new THREE.Vector3(a.position[0], a.position[1], a.position[2]);
    const chest = p.clone().setY(p.y + 1.1);
    const ndc = chest.clone().project(cam);
    return {
      id: a.id,
      state: a.state,
      alive: a.alive,
      pos: p.toArray().map((v) => +v.toFixed(1)),
      dist: +cam.position.distanceTo(p).toFixed(1),
      ndc: [+ndc.x.toFixed(2), +ndc.y.toFixed(2), +ndc.z.toFixed(2)],
      inFrame: Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1 && ndc.z < 1,
      los: physics.lineOfSight(cam.position, chest),
      heading: +a.heading.toFixed(2),
      // Bearing from the man to the lens; equal to his heading means face-on.
      camBearing: +Math.atan2(cam.position.x - p.x, cam.position.z - p.z).toFixed(2),
      offAxis: +Math.abs(
        Math.atan2(Math.sin(Math.atan2(cam.position.x - p.x, cam.position.z - p.z) - a.heading),
          Math.cos(Math.atan2(cam.position.x - p.x, cam.position.z - p.z) - a.heading)),
      ).toFixed(2),
    };
  });
  return {
    shot,
    camera: cam.position.toArray().map((v) => +v.toFixed(1)),
    fwd: fwd.toArray().map((v) => +v.toFixed(2)),
    fov: cam.fov,
    agents: rows,
  };
}, SHOT, SETTLE);
console.log('camera', JSON.stringify(out.camera), 'fwd', JSON.stringify(out.fwd), 'fov', out.fov);
for (const r of out.agents) console.log(JSON.stringify(r));
console.log('in frame:', out.agents.filter((a) => a.inFrame).length, '/', out.agents.length,
  ' visible:', out.agents.filter((a) => a.inFrame && a.los).length);
await browser.close();
