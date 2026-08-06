// Probe: integration checks — bloom near sun, night ambient lift, perf sweep.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.env.PROBE_URL ?? 'http://localhost:4173';
fs.mkdirSync('shots_probe', { recursive: true });
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(150_000);
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 60_000 });
await page.evaluate(() => { window.__game.testMode(); window.__game.pause(true); window.__game.step(30, 33.34); });
const step = (frames) => page.evaluate((f) => window.__game.step(f, 33.34), frames);
const perf = async (tag) => {
  const p = await page.evaluate(() => window.__game.perf());
  console.log(`perf ${tag}: calls=${p.calls} tris=${p.triangles} progs=${p.programs}`);
};

// ---- day: ground view + sun-glare direction
await page.evaluate(() => window.__game.teleport(0, 0, 14, 0.2, 0.02));
await step(8);
await perf('day_spawn');
await page.screenshot({ path: 'shots_probe/int_day_spawn.png' });
// look toward the sun (elev 52, az 35)
await page.evaluate(() => {
  const el = 52 * Math.PI / 180, az = 35 * Math.PI / 180;
  const d = 5000;
  window.__game.lookAt(Math.cos(el) * Math.sin(az) * d, Math.sin(el) * d, Math.cos(el) * Math.cos(az) * d);
  window.__game.step(4, 33.34);
});
await page.screenshot({ path: 'shots_probe/int_day_sun_glare.png' });
await perf('day_sun');

// ---- wide south view (previous 403-call watch item)
await page.evaluate(() => window.__game.teleport(-40, 0, 70, Math.PI, 0.04));
await step(8);
await perf('day_wide_south');

// ---- night: battery closeup ambient check
await page.evaluate(() => { window.__game.setTimeOfDay('night'); window.__game.step(100, 33.34); });
const hp = await page.evaluate(() => {
  const p = window.__game.ctx.batteries.get('thaad').rig.group.position;
  return { x: p.x, y: p.y, z: p.z };
});
await page.evaluate(([x, z]) => {
  window.__game.teleport(x + 9, 0, z + 9, 0, 0);
  window.__game.lookAt(x, 2.5, z);
  window.__game.step(6, 33.34);
}, [hp.x, hp.z]);
await page.screenshot({ path: 'shots_probe/int_night_halberd_ambient.png' });
await perf('night_halberd');

// night apron/spawn view
await page.evaluate(() => { window.__game.teleport(0, 0, 14, 2.6, 0.03); window.__game.step(6, 33.34); });
await page.screenshot({ path: 'shots_probe/int_night_spawn.png' });
await perf('night_spawn');

// ---- night console interior (ambient must not wash the room)
await page.evaluate(() => { window.__game.openConsole(); window.__game.step(10, 33.34); });
await page.screenshot({ path: 'shots_probe/int_night_console.png' });
await perf('night_console');
await page.evaluate(() => window.__game.closeConsole());

console.log('done');
await browser.close();
