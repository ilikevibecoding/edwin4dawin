#!/usr/bin/env node
/**
 * Names what a vantage is looking at.
 *
 * Judging a screenshot tells you a surface is the wrong colour; it does not tell
 * you which of forty generators drew it. This poses the camera at a registered
 * vantage, fires a fan of rays through the frame and reports the material and
 * mesh each one lands on, so a suspect surface can be traced back to the code
 * that made it instead of guessed at.
 *
 * Usage: world-probe.mjs --shot alley [--grid 5]
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};
const shot = arg('shot', 'alley');
const grid = Number(arg('grid', 5));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--mute-audio', '--window-size=640,360',
  ],
  protocolTimeout: 600000,
  defaultViewport: { width: 640, height: 360, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.setDefaultTimeout(600000);
await page.goto('http://127.0.0.1:5173/?capture=1&quality=low', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 300000, polling: 250 });

const out = await page.evaluate(async (shotName, n) => {
  const g = window.__GAME__;
  const THREE = g.THREE ?? g.engine.THREE;
  g.pose(shotName);
  g.stepFrames(2);
  const camera = g.engine.camera;
  const world = g.engine.get('world');
  const targets = [];
  world.root.traverse((o) => { if (o.isMesh && o.visible) targets.push(o); });
  const ray = new THREE.Raycaster();
  ray.far = 200;
  const rows = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -1 + (2 * (i + 0.5)) / n;
      const y = 1 - (2 * (j + 0.5)) / n;
      ray.setFromCamera(new THREE.Vector2(x, y), camera);
      const hit = ray.intersectObjects(targets, false)[0];
      rows.push({
        px: `${((x + 1) / 2 * 100).toFixed(0)}%`,
        py: `${((1 - y) / 2 * 100).toFixed(0)}%`,
        mesh: hit ? hit.object.name : null,
        material: hit ? hit.object.material?.name ?? null : null,
        dist: hit ? Number(hit.distance.toFixed(1)) : null,
        at: hit ? [hit.point.x, hit.point.y, hit.point.z].map((v) => Number(v.toFixed(1))) : null,
      });
    }
  }
  return { shot: shotName, camera: [camera.position.x, camera.position.y, camera.position.z].map((v) => Number(v.toFixed(1))), rows };
}, shot, grid);

console.log(JSON.stringify(out, null, 1));
await browser.close();
