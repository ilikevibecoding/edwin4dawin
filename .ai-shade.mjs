#!/usr/bin/env node
/* Scratch: what is above the firefight camera, and how lit is the ground it sees? */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

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

const out = await page.evaluate(() => {
  const G = window.__GAME__;
  const THREE = G.THREE;
  G.pose('ai_firefight');
  const cam = G.engine.camera;
  const physics = G.engine.get('physics');
  const sky = G.engine.tryGet('sky');
  const sun = sky.sunDirection.clone();
  const up = new THREE.Vector3(0, 1, 0);
  const MASK = 1 | 2;
  const rows = [];
  const at = (label, p) => {
    const u = physics.raycast(p, up, 14, MASK);
    const s = physics.raycast(p, sun, 70, MASK);
    rows.push({
      label,
      p: p.toArray().map((v) => +v.toFixed(1)),
      above: u ? +u.distance.toFixed(1) : null,
      sunBlocked: s ? +s.distance.toFixed(1) : null,
    });
  };
  at('camera', cam.position.clone());
  const fwd = new THREE.Vector3();
  cam.getWorldDirection(fwd);
  for (const d of [2, 4, 6, 9, 13]) {
    const p = cam.position.clone().addScaledVector(fwd, d);
    p.y = physics.groundHeight ? physics.groundHeight(p.x, p.z) + 0.5 : 1.5;
    at(`fwd+${d}`, p);
  }
  // What bearings would have been available around the cluster?
  const agents = window.__AI__.agents().map((a) => a.position);
  return { sun: sun.toArray().map((v) => +v.toFixed(2)), sunY: +sun.y.toFixed(2), rows, agents };
});
console.log('sun', JSON.stringify(out.sun));
for (const r of out.rows) console.log(JSON.stringify(r));
console.log('agents', JSON.stringify(out.agents.map((a) => a.map((v) => +v.toFixed(1)))));
await browser.close();
