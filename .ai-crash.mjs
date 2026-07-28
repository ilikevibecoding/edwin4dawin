#!/usr/bin/env node
/* Scratch: photograph one soldier from a chosen angle, bypassing the vantage sweep. */
import puppeteer from 'puppeteer-core';
import { existsSync, writeFileSync } from 'node:fs';

const BEAR = Number(process.argv[2] || 0);
const DIST = Number(process.argv[3] || 2.6);
const OUT = process.argv[4] || '/tmp/rigcheck.png';
const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--mute-audio', '--window-size=640,640'],
  protocolTimeout: 900000,
  defaultViewport: { width: 640, height: 640 },
});
const page = await browser.newPage();
page.setDefaultTimeout(900000);
page.on('pageerror', (e) => console.log('  pageerror:', e.message));
await page.goto('http://127.0.0.1:5199/?showcase=ai&capture=1&quality=medium', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });
console.log('ready');

if (process.env.DOUBLE) await page.evaluate(() => { window.__DOUBLE__ = true; });
if (process.env.PAINT) await page.evaluate(() => { window.__PAINT__ = true; });
const info = await page.evaluate((bear, dist) => {
  const G = window.__GAME__;
  const THREE = G.THREE;
  G.pose('ai_soldier');
  const a = window.__AI__.agents()[0];
  const p = new THREE.Vector3(a.position[0], a.position[1], a.position[2]);
  if (window.__PAINT__) {
    const PART = {
      8: [1, 0, 0], 9: [1, 0.5, 0], 10: [1, 1, 0],
      12: [0, 0.6, 1], 13: [0, 0, 1], 14: [0, 1, 1],
      23: [1, 0, 1],
    };
    G.engine.scene.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const geo = o.geometry;
      const col = geo.attributes.color;
      const si = geo.attributes.skinIndex.array;
      const sw = geo.attributes.skinWeight.array;
      if (!col) return;
      for (let i = 0; i < col.count; i++) {
        let dom = -1;
        let domW = 0;
        for (let k = 0; k < 4; k++) {
          const w = sw[i * 4 + k];
          if (w > domW) { domW = w; dom = si[i * 4 + k]; }
        }
        const c = PART[dom];
        if (c) col.setXYZ(i, c[0], c[1], c[2]);
      }
      col.needsUpdate = true;
    });
  }
  if (window.__DOUBLE__) {
    const THREE2 = G.THREE;
    G.engine.scene.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        m.side = THREE2.DoubleSide;
        m.needsUpdate = true;
      }
    });
  }
  const cam = G.engine.camera;
  cam.fov = 45;
  cam.updateProjectionMatrix();
  // Orbit the man himself, so the framing is not the sweep's opinion.
  const face = a.heading;
  G.freeCam(
    p.x + Math.sin(face + bear) * dist,
    p.y + 1.25,
    p.z + Math.cos(face + bear) * dist,
    p.x, p.y + 1.05, p.z,
  );
  G.stepFrames(1);
  G.freeCam(
    p.x + Math.sin(face + bear) * dist,
    p.y + 1.25,
    p.z + Math.cos(face + bear) * dist,
    p.x, p.y + 1.05, p.z,
  );
  G.stepFrames(1);
  return { heading: +a.heading.toFixed(2), stance: a.stance, lod: a.lod, aiming: a.aiming };
}, BEAR, DIST);
console.log(JSON.stringify(info));
const buf = await page.screenshot({ type: 'png' });
writeFileSync(OUT, buf);
console.log('wrote', OUT);
await browser.close();
