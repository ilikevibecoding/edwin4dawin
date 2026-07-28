#!/usr/bin/env node
/* Scratch ragdoll skeleton diagnostic. Not part of the deliverable. */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--mute-audio', '--window-size=640,360',
  ],
  protocolTimeout: 600000,
  defaultViewport: { width: 640, height: 360 },
});
const page = await browser.newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('  page error:', e.message));
await page.goto('http://127.0.0.1:5173/?showcase=ai&capture=1&quality=medium', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });
console.log('ready');

const out = await page.evaluate(() => {
  const api = window.__AI__;
  const NAMES = ['root', 'pelvis', 'spine1', 'spine2', 'chest', 'neck', 'head',
    'clavL', 'armL', 'foreL', 'handL', 'clavR', 'armR', 'foreR', 'handR',
    'thighL', 'calfL', 'footL', 'toeL', 'thighR', 'calfR', 'footR', 'toeR', 'weapon'];
  const PARENT = [-1, 0, 1, 2, 3, 4, 5, 4, 7, 8, 9, 4, 11, 12, 13, 1, 15, 16, 17, 1, 19, 20, 21, 4];

  api.clear();
  const anchor = api.anchor();
  const id = api.spawn(anchor[0], anchor[1], anchor[2], 0, 'regular');
  api.step(0.6);
  const alive = api.bones(id).map((b) => b.slice());
  api.setPlayer(anchor[0] + 6, anchor[1], anchor[2]);
  api.damage(id, 500, true);
  api.step(5.0);
  const dead = api.bones(id);
  const rag = api.ragdoll(id);
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const rows = NAMES.map((n, i) => {
    const p = PARENT[i];
    return {
      bone: n,
      aliveLen: p < 0 ? 0 : +d(alive[i], alive[p]).toFixed(4),
      deadLen: p < 0 ? 0 : +d(dead[i], dead[p]).toFixed(4),
      deadY: +dead[i][1].toFixed(3),
    };
  });
  return {
    rows,
    settled: rag ? rag.settled : null,
    age: rag ? +rag.age.toFixed(2) : null,
    ground: anchor[1],
    nan: rows.some((r) => !Number.isFinite(r.deadLen)),
  };
});

console.log('settled', out.settled, 'age', out.age, 'ground y', out.ground, 'nan', out.nan);
console.log('bone       aliveLen  deadLen   delta    deadY');
for (const r of out.rows) {
  const delta = r.aliveLen ? ((r.deadLen - r.aliveLen) / r.aliveLen) * 100 : 0;
  const flag = Math.abs(delta) > 3 ? '  <-- ' + delta.toFixed(0) + '%' : '';
  console.log(
    `${r.bone.padEnd(10)} ${String(r.aliveLen).padStart(8)} ${String(r.deadLen).padStart(8)}` +
      ` ${delta.toFixed(1).padStart(7)} ${String(r.deadY).padStart(7)}${flag}`,
  );
}
await browser.close();
