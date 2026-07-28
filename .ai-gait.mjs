#!/usr/bin/env node
/** Scratch: distribution of leg extension over a walk, and where the dips are. */
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
  const api = window.__AI__;
  const B = api.boneIndex();
  const physics = window.__GAME__.engine.tryGet('physics');
  api.clear();
  const anchor = api.anchor();
  const walker = api.spawn(anchor[0], anchor[1], anchor[2], 0);
  let dest = null;
  for (const r of [26, 20, 34, 15]) {
    const p = api.openGround(walker, r);
    if (p) { dest = { x: p[0], y: p[1], z: p[2] }; break; }
  }
  if (!dest) return null;
  api.moveTo(walker, dest.x, dest.y, dest.z);
  api.step(1.5);
  const d = (b, i, j) => Math.hypot(b[i][0] - b[j][0], b[i][1] - b[j][1], b[i][2] - b[j][2]);
  const rise = (b, h, k, a) => (b[h][1] - b[a][1]) / (d(b, h, k) + d(b, k, a));
  const rows = [];
  let prev = api.agent(walker).position;
  for (let f = 0; f < 150; f++) {
    api.stepFrames(1);
    const b = api.bones(walker);
    const pos = api.agent(walker).position;
    const step = Math.hypot(pos[0] - prev[0], pos[2] - prev[2]);
    if (step > 0.01) {
      const ride = Math.max(rise(b, B.thighL, B.calfL, B.footL), rise(b, B.thighR, B.calfR, B.footR));
      const ground = physics ? physics.groundHeight(pos[0], pos[2], 3) : pos[1];
      rows.push({ f, ride: +ride.toFixed(3), y: +pos[1].toFixed(2), g: +ground.toFixed(2), step: +step.toFixed(3), st: api.agent(walker).stance });
    }
    prev = pos;
  }
  const sorted = rows.map((r) => r.ride).sort((a, b) => a - b);
  const pct = (p) => sorted[Math.floor(sorted.length * p)];
  return {
    n: rows.length,
    min: sorted[0], p05: pct(0.05), p10: pct(0.1), p25: pct(0.25), median: pct(0.5), max: sorted[sorted.length - 1],
    worst: rows.slice().sort((a, b) => a.ride - b.ride).slice(0, 8),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
