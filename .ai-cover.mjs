#!/usr/bin/env node
/* Scratch: trace the cover scene so the peek shot lands. */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--mute-audio', '--window-size=640,360'],
  protocolTimeout: 900000,
  defaultViewport: { width: 640, height: 360 },
});
const page = await browser.newPage();
page.setDefaultTimeout(900000);
page.on('pageerror', (e) => console.log('  pageerror:', e.message));
await page.goto('http://127.0.0.1:5199/?showcase=ai&capture=1&quality=medium', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });
console.log('ready');

const out = await page.evaluate(() => {
  window.__GAME__.pose('ai_cover');
  const api = window.__AI__;
  const id = api.ids()[0];
  const rows = [];
  for (let i = 0; i < 30; i++) {
    const a = api.agent(id);
    rows.push({
      t: +(i * 0.4).toFixed(1),
      state: a.state,
      cover: a.cover,
      cd: +a.coverDistance.toFixed(2),
      at: a.atCover,
      inCover: a.inCover,
      peek: a.peeking,
      stance: a.stance,
      spd: +Math.hypot(a.velocity[0], a.velocity[2]).toFixed(2),
    });
    api.step(0.4);
  }
  return { rows, final: api.agent(id) };
});

console.log('  t    state          cover   dist   at   inCover peek stance spd');
for (const r of out.rows) {
  console.log(
    `${String(r.t).padStart(5)} ${String(r.state).padEnd(14)} ${String(r.cover).padStart(5)}` +
      ` ${String(r.cd).padStart(6)} ${String(r.at).padStart(5)} ${String(r.inCover).padStart(7)}` +
      ` ${String(r.peek).padStart(5)} ${String(r.stance).padStart(5)} ${String(r.spd).padStart(5)}`,
  );
}
await browser.close();
