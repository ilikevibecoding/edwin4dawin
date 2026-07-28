#!/usr/bin/env node
/* Scratch: are the arm bones where they should be, or collapsed into the torso? */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const SHOT = process.argv[2] || 'ai_squad';
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

const out = await page.evaluate((shot) => {
  const G = window.__GAME__;
  G.pose(shot);
  const NAMES = ['root', 'pelvis', 'spine1', 'spine2', 'chest', 'neck', 'head',
    'clavL', 'armL', 'foreL', 'handL', 'clavR', 'armR', 'foreR', 'handR',
    'thighL', 'calfL', 'footL', 'toeL', 'thighR', 'calfR', 'footR', 'toeR', 'weapon'];
  const rows = [];
  for (const a of window.__AI__.agents()) {
    const b = window.__AI__.bones(a.id);
    if (!b) continue;
    const rel = (n) => {
      const i = NAMES.indexOf(n);
      return [b[i][0] - b[1][0], b[i][1] - b[1][1], b[i][2] - b[1][2]].map((v) => +v.toFixed(2));
    };
    const len = (p, q) => {
      const i = NAMES.indexOf(p), j = NAMES.indexOf(q);
      return +Math.hypot(b[i][0] - b[j][0], b[i][1] - b[j][1], b[i][2] - b[j][2]).toFixed(3);
    };
    rows.push({
      id: a.id, lod: a.lod, state: a.state, aiming: a.aiming, stance: a.stance,
      armL: rel('armL'), foreL: rel('foreL'), handL: rel('handL'),
      armR: rel('armR'), foreR: rel('foreR'), handR: rel('handR'),
      weapon: rel('weapon'),
      upperL: len('armL', 'foreL'), lowerL: len('foreL', 'handL'),
      upperR: len('armR', 'foreR'), lowerR: len('foreR', 'handR'),
    });
  }
  return rows;
}, SHOT);
for (const r of out) console.log(JSON.stringify(r));
await browser.close();
