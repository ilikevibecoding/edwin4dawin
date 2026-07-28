#!/usr/bin/env node
/** Scratch: for each AI vantage, where is the camera and which way is he facing? */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const URL = process.argv[2] || 'http://127.0.0.1:5199/';
const SHOTS = (process.argv[3] || 'ai_soldier').split(',');

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--headless=new', '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--mute-audio'],
  protocolTimeout: 900000,
});
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 400)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=medium`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

for (const name of SHOTS) {
  const out = await page.evaluate((shot) => {
    const g = window.__GAME__;
    const api = window.__AI__;
    const THREE = g.THREE;
    g.pose(shot);
    const cam = g.engine.camera ?? g.engine.get('render').camera;
    const camPos = new THREE.Vector3();
    cam.getWorldPosition(camPos);
    const camDir = new THREE.Vector3();
    cam.getWorldDirection(camDir);
    const world = g.engine.get('world');
    const physics = g.engine.get('physics');
    const sky = g.engine.tryGet('sky');
    const sunDir = sky && sky.sunDirection ? sky.sunDirection.clone() : null;

    const agents = api.agents().map((a) => {
      const p = new THREE.Vector3(a.position[0], a.position[1], a.position[2]);
      const toCam = camPos.clone().sub(p);
      toCam.y = 0;
      toCam.normalize();
      // Which way he is looking, from his heading.
      const face = new THREE.Vector3(Math.sin(a.heading), 0, Math.cos(a.heading));
      const facingCamera = (Math.acos(Math.max(-1, Math.min(1, face.dot(toCam)))) * 180) / Math.PI;
      // Is the sun on him?
      let lit = null;
      if (sunDir) {
        const eye = p.clone().setY(p.y + 1.4);
        lit = !physics.raycastInto(eye, sunDir, 120, { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: 'concrete' }, 1 | 2);
      }
      // Screen position and pixel height.
      const head = p.clone().setY(p.y + 1.75);
      const feet = p.clone();
      const sh = head.clone().project(cam);
      const sf = feet.clone().project(cam);
      const px = (v) => [Math.round(((v.x + 1) / 2) * 960), Math.round(((1 - v.y) / 2) * 540)];
      const ph = px(sh);
      const pf = px(sf);
      return {
        id: a.id,
        state: a.state,
        dist: +camPos.distanceTo(p).toFixed(2),
        facingCamera: Math.round(facingCamera),
        lit,
        head: ph,
        feet: pf,
        pixelHeight: Math.abs(pf[1] - ph[1]),
        inFrame: ph[0] > 0 && ph[0] < 960 && pf[0] > 0 && pf[0] < 960 && ph[1] > 0 && pf[1] < 540,
        stance: a.stance,
        speed: +Math.hypot(a.velocity[0], a.velocity[2]).toFixed(2),
        ragdoll: a.ragdoll,
      };
    });
    const groundAt = (v) => {
      try {
        return +physics.groundHeight(v.x, v.z, v.y + 3).toFixed(2);
      } catch {
        return null;
      }
    };
    return {
      shot,
      camera: [+camPos.x.toFixed(2), +camPos.y.toFixed(2), +camPos.z.toFixed(2)],
      camGround: groundAt(camPos),
      camAboveGround: +(camPos.y - (groundAt(camPos) ?? 0)).toFixed(2),
      camWalkable: world.isWalkable(camPos.x, camPos.z),
      agentGround: api.agents().map((a) => groundAt({ x: a.position[0], y: a.position[1], z: a.position[2] })),
      camBearing: Math.round((Math.atan2(camDir.x, camDir.z) * 180) / Math.PI),
      fov: cam.fov,
      sunBearing: sunDir ? Math.round((Math.atan2(sunDir.x, sunDir.z) * 180) / Math.PI) : null,
      sunElevation: sunDir ? Math.round((Math.asin(sunDir.y) * 180) / Math.PI) : null,
      agents,
    };
  }, name);
  console.log(JSON.stringify(out, null, 1));
}
await browser.close();
