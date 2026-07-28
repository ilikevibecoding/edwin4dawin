#!/usr/bin/env node
/* Scratch: does a corpse's leg come to rest on the ground? Not a deliverable. */
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

const trials = Number(process.env.N ?? 3);
const out = await page.evaluate(async (n) => {
  const api = window.__AI__;
  const NAMES = ['pelvis', 'chest', 'head', 'elbowL', 'handL', 'elbowR', 'handR', 'kneeL', 'footL', 'kneeR', 'footR'];
  const runs = [];
  for (let t = 0; t < n; t++) {
    api.scenes.ragdoll();
    const ag = api.agents();
    const id = ag.length ? ag[0].id : -1;
    const rag = id >= 0 ? api.ragdoll(id) : null;
    if (!rag) { runs.push(null); continue; }
    const floor = Math.min(...rag.points.map((p) => p[1]));
    runs.push({
      settled: rag.settled,
      age: +rag.age.toFixed(2),
      // Height of each particle above the lowest one, which is on the ground.
      h: rag.points.map((p) => +(p[1] - floor).toFixed(3)),
      // Extent of the body on the ground plane, to see whether he is sprawled
      // or heaped.
      span: +Math.hypot(
        rag.points[2][0] - rag.points[8][0],
        rag.points[2][2] - rag.points[8][2],
      ).toFixed(2),
    });
  }
  return { NAMES, runs };
}, trials);

console.log('names:', out.NAMES.join(' '));
for (const r of out.runs) {
  if (!r) { console.log('  (no ragdoll)'); continue; }
  console.log(`settled=${r.settled} age=${r.age} head-to-foot span=${r.span}`);
  console.log('  heights above ground: ' + out.NAMES.map((nm, i) => `${nm}=${r.h[i]}`).join(' '));
}
await browser.close();
