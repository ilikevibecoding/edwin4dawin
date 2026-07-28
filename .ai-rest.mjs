#!/usr/bin/env node
/* Scratch: what pose is the soldier portrait actually photographing? */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--mute-audio', '--window-size=480,270',
  ],
  protocolTimeout: 600000,
  defaultViewport: { width: 480, height: 270 },
});
const page = await browser.newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('  page error:', e.message));
await page.goto('http://127.0.0.1:5199/?showcase=ai&capture=1&quality=medium', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });
console.log('ready');

const out = await page.evaluate(() => {
  const api = window.__AI__;
  const B = { pelvis: 1, footL: 17, toeL: 18, footR: 21, toeR: 22 };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const rows = [];
  const sample = (label) => {
    const list = api.agents();
    if (!list.length) { rows.push({ label, none: true }); return; }
    const a = list[0];
    const b = api.bones(a.id);
    const p = (j) => ({ x: b[j][0], y: b[j][1], z: b[j][2] });
    const hip = p(B.pelvis);
    const fl = p(B.footL);
    const fr = p(B.footR);
    const yaw = (f, t) => Math.atan2(t.x - f.x, t.z - f.z);
    rows.push({
      label,
      state: a.state,
      speed: +Math.hypot(a.velocity[0], a.velocity[2]).toFixed(2),
      heading: +a.heading.toFixed(2),
      aheadL: +Math.hypot(fl.x - hip.x, fl.z - hip.z).toFixed(2),
      aheadR: +Math.hypot(fr.x - hip.x, fr.z - hip.z).toFixed(2),
      apart: +Math.hypot(fl.x - fr.x, fl.z - fr.z).toFixed(2),
      level: +Math.abs(fl.y - fr.y).toFixed(3),
      yawL: +((wrap(yaw(fl, p(B.toeL)) - a.heading) * 180) / Math.PI).toFixed(0),
      yawR: +((wrap(yaw(fr, p(B.toeR)) - a.heading) * 180) / Math.PI).toFixed(0),
    });
  };

  api.scenes.soldier();
  sample('soldier scene, as photographed');
  api.step(2);
  sample('  + 2 s');
  api.step(3);
  sample('  + 5 s');

  api.clear();
  const anchor = api.anchor();
  const id = api.spawn(anchor[0], anchor[1], anchor[2], 0.6);
  api.force(id, 'idle');
  api.step(0.4);
  sample('spawned idle, 0.4 s');
  api.step(3);
  sample('spawned idle, 3.4 s');
  return rows;
});

for (const r of out) {
  if (r.none) { console.log(r.label, '(no agents)'); continue; }
  console.log(
    `${r.label.padEnd(30)} state=${String(r.state).padEnd(10)} speed=${String(r.speed).padStart(4)}` +
      ` hips->footL=${r.aheadL} footR=${r.aheadR} apart=${r.apart} level=${r.level}` +
      ` toeYaw=${r.yawL}/${r.yawR}`,
  );
}
await browser.close();
