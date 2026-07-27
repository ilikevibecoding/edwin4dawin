#!/usr/bin/env node
// Trigger VFX API calls directly (impacts per surface, blood, tracers) and screenshot.
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const base = process.argv[2] || 'http://localhost:5177';
const mode = process.argv[3] || 'impacts';
const advance = parseFloat(process.argv[4] ?? '0.25'); // seconds after trigger

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--enable-webgl', '--hide-scrollbars', '--window-size=1280,720'],
  defaultViewport: { width: 1280, height: 720 },
  protocolTimeout: 600000,
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.error(`[pageerror] ${e.message}`));

// vite full-reloads (other agents editing) destroy the execution context mid-run;
// retry the whole load+trigger sequence a few times.
let done = false;
let result = null;
for (let attempt = 1; attempt <= 4 && !done; attempt++) {
  try {
    await page.goto(`${base}/?pose=street&t=1&hud=0&nobots=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction('window.__SHOT_READY__ === true', { timeout: 240000, polling: 250 });

    result = await page.evaluate(async (mode, advance) => {
      const g = window.__GAME__;
      const T = g.THREE;
      const cam = g.camera;
      const fwd = cam.getWorldDirection(new T.Vector3());
      const right = new T.Vector3().crossVectors(fwd, new T.Vector3(0, 1, 0)).normalize();

      if (mode === 'impacts') {
        // wall of impacts 6m ahead, one column per surface, normal facing camera
        const surfaces = ['concrete', 'metal', 'dirt', 'wood', 'plaster'];
        const n = fwd.clone().negate();
        surfaces.forEach((surf, i) => {
          const off = (i - 2) * 1.1;
          for (let k = 0; k < 3; k++) {
            const p = cam.position.clone().addScaledVector(fwd, 6)
              .addScaledVector(right, off)
              .add(new T.Vector3(0, -0.3 + k * 0.45, 0));
            g.vfx.impact(p, n, surf);
          }
        });
      } else if (mode === 'blood') {
        for (let k = 0; k < 3; k++) {
          const p = cam.position.clone().addScaledVector(fwd, 4 + k)
            .addScaledVector(right, (k - 1) * 1.2);
          g.vfx.blood(p, fwd.clone());
        }
      } else if (mode === 'tracer') {
        for (let k = 0; k < 4; k++) {
          const from = cam.position.clone().addScaledVector(right, -3 + k * 1.4).add(new T.Vector3(0, -0.2 + k * 0.18, 0));
          const to = from.clone().addScaledVector(fwd, 60).addScaledVector(right, (k - 1.5) * 3);
          g.vfx.tracer(from, to, { speed: 0.001 });   // near-frozen so quads stay visible
        }
      } else if (mode === 'enemyfire') {
        // replicate the AI call exactly: vfx.tracer(from, end, {speed:300}), no width.
        // incoming rounds from ~35m ahead aimed wide past the camera so the
        // streak has visible length on screen
        for (let k = 0; k < 3; k++) {
          const from = cam.position.clone().addScaledVector(fwd, 35)
            .addScaledVector(right, (k - 1) * 2.5).add(new T.Vector3(0, 0.3, 0));
          const end = cam.position.clone().addScaledVector(right, (k - 1) * 8)
            .add(new T.Vector3(0, -0.4 + k * 0.4, 0));
          g.vfx.tracer(from, end, { speed: 300 });
        }
        // crossing rounds at 30m and 50m for the width-at-distance check
        for (const dist of [30, 50]) {
          const farL = cam.position.clone().addScaledVector(fwd, dist).addScaledVector(right, -20).add(new T.Vector3(0, 1.2, 0));
          const farR = cam.position.clone().addScaledVector(fwd, dist).addScaledVector(right, 20).add(new T.Vector3(0, 1.2, 0));
          g.vfx.tracer(farL, farR, { speed: 300 });
        }
      } else if (mode === 'debris') {
        // large chunks lobbed close to the camera: verifies flat-shaded
        // lit/shadow faces and the darker-underside vertex gradient at zoom
        for (let k = 0; k < 10; k++) {
          const pp = cam.position.clone().addScaledVector(fwd, 4.5)
            .addScaledVector(right, -1.6 + k * 0.36);
          pp.y = cam.position.y - 1.0;
          g.vfx.debris.spawn({
            pos: pp, vel: new T.Vector3((k % 3 - 1) * 0.5, 2.2, 0.3),
            size: 0.22, life: 9, spin: 4,
            color: [0x4a4238, 0x35302a, 0x5c5248][k % 3], ground: 0,
          });
        }
      } else if (mode === 'ground') {
        // replicate ExplosionFX's ground probe at the harness explosion point
        const at = cam.position.clone().addScaledVector(fwd, 14);
        at.y = Math.max(at.y, 0.5);
        const from = at.clone(); from.y += 0.6;
        const hit = g.world.colliders.raycast(from, new T.Vector3(0, -1, 0), 8);
        return {
          at: { x: +at.x.toFixed(2), y: +at.y.toFixed(2), z: +at.z.toFixed(2) },
          hit: hit ? { y: +hit.point.y.toFixed(2), surface: hit.surface, dist: +hit.distance.toFixed(2) } : null,
        };
      }

      // advance the vfx sim + render
      const steps = Math.round(advance * 60);
      for (let i = 0; i < steps; i++) {
        g.vfx.update(1 / 60);
        await new Promise((r) => requestAnimationFrame(r));
      }
      g.engine.render(1 / 60);
      return null;
    }, mode, advance);
    done = true;
    if (result) console.log('[result]', JSON.stringify(result));
  } catch (e) {
    console.error(`[attempt ${attempt}] ${e.message.split('\n')[0]}`);
    if (attempt === 4) { await browser.close(); process.exit(1); }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: `review/probe-${mode}-${advance}.png` });
console.log(`[shot] review/probe-${mode}-${advance}.png`);
await browser.close();
