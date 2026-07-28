#!/usr/bin/env node
/* Scratch gait diagnostic. Not part of the deliverable. */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage',
    '--mute-audio',
    '--window-size=640,360',
  ],
  protocolTimeout: 600000,
  defaultViewport: { width: 640, height: 360 },
});
const page = await browser.newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('  page error:', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('  page err:', m.text());
});
await page.goto('http://127.0.0.1:5173/?showcase=ai&capture=1&quality=medium', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });
console.log('ready');

const out = await page.evaluate(() => {
  const api = window.__AI__;
  const B = { pelvis: 1, head: 6, thighL: 15, footL: 17, toeL: 18, thighR: 19, footR: 21, toeR: 22 };
  api.clear();
  const anchor = api.anchor();
  const id = api.spawn(anchor[0], anchor[1], anchor[2], 0, 'regular');
  // Find somewhere far to walk to.
  const spot = api.openGround(id, 24);
  if (!spot) return { error: 'no open ground' };

  // Standing first: a man at rest must have his feet under his hips.
  api.setPlayer(spot[0], spot[1], spot[2]);
  api.force(id, 'contact');
  api.step(2.0);
  const stand = (() => {
    const a = api.agent(id);
    const b = api.bones(id);
    const p = a.position;
    const fx = Math.sin(a.heading);
    const fz = Math.cos(a.heading);
    const along = (q) => (q[0] - p[0]) * fx + (q[2] - p[2]) * fz;
    return {
      spd: +Math.hypot(a.velocity[0], a.velocity[2]).toFixed(3),
      pelvisY: +(b[1][1] - p[1]).toFixed(3),
      headY: +(b[6][1] - p[1]).toFixed(3),
      footL: +along(b[17]).toFixed(3),
      footR: +along(b[21]).toFixed(3),
      legL: +Math.hypot(b[15][0] - b[17][0], b[15][1] - b[17][1], b[15][2] - b[17][2]).toFixed(3),
      legR: +Math.hypot(b[19][0] - b[21][0], b[19][1] - b[21][1], b[19][2] - b[21][2]).toFixed(3),
    };
  })();

  api.moveTo(id, spot[0], spot[1], spot[2]);
  api.step(1.0);

  const rows = [];
  for (let i = 0; i < 50; i++) {
    api.step(1 / 30);
    const a = api.agent(id);
    const bones = api.bones(id);
    if (!a || !bones) break;
    const p = a.position;
    const speed = Math.hypot(a.velocity[0], a.velocity[2]);
    const h = a.heading;
    const fx = Math.sin(h);
    const fz = Math.cos(h);
    const along = (b) => (b[0] - p[0]) * fx + (b[2] - p[2]) * fz;
    const pelvis = bones[B.pelvis];
    const fL = bones[B.footL];
    const fR = bones[B.footR];
    const hipL = bones[B.thighL];
    const hipR = bones[B.thighR];
    const dist = (a1, b1) => Math.hypot(a1[0] - b1[0], a1[1] - b1[1], a1[2] - b1[2]);
    rows.push({
      t: +(i / 30).toFixed(2),
      spd: +speed.toFixed(2),
      py: +(pelvis[1] - p[1]).toFixed(3),
      headY: +(bones[B.head][1] - p[1]).toFixed(3),
      // forward offset of each foot from the body centre
      fL: +along(fL).toFixed(3),
      fR: +along(fR).toFixed(3),
      // foot height above the body's ground plane
      fLy: +(fL[1] - p[1]).toFixed(3),
      fRy: +(fR[1] - p[1]).toFixed(3),
      // hip->ankle distance; if this pins at the bone length the leg is locked
      legL: +dist(hipL, fL).toFixed(3),
      legR: +dist(hipR, fR).toFixed(3),
    });
  }
  return { spot, rows, stand, tri: api.triangles() };
});

if (out.error) {
  console.log('ERROR', out.error);
} else {
  console.log('walk target', out.spot.map((v) => +v.toFixed(1)).join(','));
  console.log('tri', JSON.stringify(out.tri));
  console.log('STANDING', JSON.stringify(out.stand));
  console.log('  t    spd   pelvisY  headY   footL   footR   fLy    fRy   legL   legR');
  for (const r of out.rows) {
    console.log(
      `${String(r.t).padStart(5)} ${String(r.spd).padStart(5)} ${String(r.py).padStart(8)} ${String(r.headY).padStart(6)}` +
        ` ${String(r.fL).padStart(7)} ${String(r.fR).padStart(7)} ${String(r.fLy).padStart(6)} ${String(r.fRy).padStart(6)}` +
        ` ${String(r.legL).padStart(6)} ${String(r.legR).padStart(6)}`,
    );
  }
  const rows = out.rows;
  const span = (k) => {
    const v = rows.map((r) => r[k]);
    return `${Math.min(...v).toFixed(3)} .. ${Math.max(...v).toFixed(3)}`;
  };
  console.log('\nsummary');
  console.log('  pelvis Y   ', span('py'));
  console.log('  head Y     ', span('headY'));
  console.log('  foot L fwd ', span('fL'));
  console.log('  foot R fwd ', span('fR'));
  console.log('  leg L len  ', span('legL'));
  console.log('  leg R len  ', span('legR'));
  console.log('  speed      ', span('spd'));
}

await browser.close();
