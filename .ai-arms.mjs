#!/usr/bin/env node
/** Scratch: where are the arm bones in the portrait pose, relative to the chest? */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const URL = process.argv[2] || 'http://127.0.0.1:5199/';
const SHOT = process.argv[3] || 'ai_soldier';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--headless=new', '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--mute-audio'],
  protocolTimeout: 900000,
});
const page = await browser.newPage();
await page.setViewport({ width: 640, height: 360, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 400)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=low`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

const out = await page.evaluate((shot) => {
  const g = window.__GAME__;
  const api = window.__AI__;
  g.pose(shot);
  const a = api.agents()[0];
  if (!a) return { error: 'no agent' };
  const bones = api.bones(a.id);
  const names = [
    'root', 'pelvis', 'spine1', 'spine2', 'chest', 'neck', 'head',
    'clavL', 'armL', 'foreL', 'handL',
    'clavR', 'armR', 'foreR', 'handR',
    'thighL', 'calfL', 'footL', 'toeL',
    'thighR', 'calfR', 'footR', 'toeR',
    'weapon',
  ];
  const B = {};
  names.forEach((n, i) => (B[n] = bones[i]));
  // Body frame from the heading: forward and right in world terms.
  const h = a.heading;
  const fwd = [Math.sin(h), 0, Math.cos(h)];
  // The soldier's own right, matching SoldierRig: fwd x up.
  const right = [-Math.cos(h), 0, Math.sin(h)];
  const chest = B.chest ?? a.position;
  const rel = (p) => {
    const d = [p[0] - chest[0], p[1] - chest[1], p[2] - chest[2]];
    return {
      right: +(d[0] * right[0] + d[2] * right[2]).toFixed(3),
      fore: +(d[0] * fwd[0] + d[2] * fwd[2]).toFixed(3),
      up: +d[1].toFixed(3),
    };
  };
  const pick = {};
  for (const k of ['armL', 'armR', 'foreL', 'foreR', 'handL', 'handR', 'chest', 'head', 'pelvis', 'thighL', 'thighR', 'calfL', 'calfR', 'footL', 'footR']) {
    if (B[k]) pick[k] = rel(B[k]);
  }
  return {
    shot,
    state: a.state,
    stance: a.stance,
    aiming: a.aiming,
    heading: +h.toFixed(3),
    boneNames: names ? names.length : null,
    bones: pick,
  };
}, SHOT);
console.log(JSON.stringify(out, null, 1));
await browser.close();
