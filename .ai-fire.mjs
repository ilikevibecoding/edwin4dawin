#!/usr/bin/env node
/** Scratch: is anybody actually shooting in the firefight scene, and when? */
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
await page.setViewport({ width: 960, height: 540 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=medium`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const api = window.__AI__;
  let flashes = 0;
  g.engine.events.on('fx:muzzleflash', () => flashes++);
  g.pose('ai_firefight');
  const atPose = api.agents().map((a) => ({ id: a.id, s: a.state, shots: a.shots, fire: a.wantsFire, vis: a.visible, mag: a.magazine, cover: a.cover, cscore: Math.round(a.coverScore) }));
  const flashesAtPose = flashes;
  // Exactly what the harness does after posing: six engine frames at 1/60.
  for (let i = 0; i < 6; i++) g.engine.step(1 / 60);
  const afterSettle = api.agents().map((a) => ({ id: a.id, s: a.state, shots: a.shots }));
  return { atPose, flashesAtPose, flashesAfterSettle: flashes, afterSettle };
});
console.log('flashes emitted during scene setup:', out.flashesAtPose, '| after 6 settle frames:', out.flashesAfterSettle);
console.log('at pose:');
for (const a of out.atPose) console.log(' ', JSON.stringify(a));
console.log('shots after settle:', out.afterSettle.map((a) => `#${a.id} ${a.s} ${a.shots}`).join(' | '));
await browser.close();
