// Probe: multi-engagement (one battery on many missiles + queue), tablet UI,
// engage-all, and chase cams. Deterministic stepping; few screenshots.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.env.PROBE_URL ?? 'http://localhost:4173';
fs.mkdirSync('shots_probe', { recursive: true });
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(120_000);
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR', m.text()); });
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 60_000 });
await page.evaluate(() => {
  window.__game.testMode(); window.__game.pause(true);
  window.__game.seed(4242);
  window.__game.start('saturation', { timeOfDay: 'day' });
});
const step = (frames) => page.evaluate((f) => window.__game.step(f, 33.34), frames);
const state = () => page.evaluate(() => window.__game.state());

// wait for 2+ tracks
let s;
for (let i = 0; i < 60; i++) {
  await step(30);
  s = await state();
  if (s.tracks.length >= 2) break;
}
console.log('tracks:', s.tracks.length, s.tracks.map((t) => t.id).join(','));

// ---- one battery on TWO missiles: second authorize must queue
const [t1, t2] = s.tracks.map((t) => t.id);
const r = await page.evaluate(([a, b]) => {
  const g = window.__game;
  const out = {};
  out.assign1 = g.assign(a, 'patriot');
  out.fire1 = g.authorize(a);
  out.assign2 = g.assign(b, 'patriot');
  out.fire2 = g.authorize(b); // patriot cycling -> should queue
  const st = g.state();
  out.assignments = st.assignments;
  out.fireQueue = st.fireQueue;
  out.launches = st.stats.launches;
  return out;
}, [t1, t2]);
console.log('multi-engage:', JSON.stringify(r));

// step until the queued round auto-fires
let fired = false;
for (let i = 0; i < 40; i++) {
  await step(30);
  s = await state();
  if (s.stats.launches >= 2 && s.fireQueue.length === 0) { fired = true; break; }
}
console.log('queue drained:', fired, 'launches:', s.stats.launches,
  'interceptors:', s.interceptors.length, 'assignments:', JSON.stringify(s.assignments));

// ---- salvo on one track: ripple across batteries
const r2 = await page.evaluate((a) => {
  const g = window.__game;
  const ok1 = g.authorize(a); // rolls to another ready battery or queues
  const st = g.state();
  return { ok1, launches: st.stats.launches, queue: st.fireQueue, batteries: st.batteries };
}, t1);
console.log('salvo:', JSON.stringify(r2));

// ---- tablet
await page.evaluate(() => window.__game.openTablet());
await step(12);
s = await state();
console.log('tabletOpen:', s.tabletOpen);
const rows = await page.locator('#t-tracks .t-row').count();
const batts = await page.locator('#t-batts .t-bat').count();
console.log('tablet rows:', rows, 'battery chips:', batts);
await page.screenshot({ path: 'shots_probe/tablet_day_active.png', timeout: 120_000 });

// tablet FIRE button on first row: queue grows synchronously, then the
// battery cycles and auto-fires it (launch counter lags by the fire sequence)
if (rows > 0) {
  const q0 = await page.evaluate(() => window.__game.state().fireQueue.length);
  await page.locator('#t-tracks .t-row button.fire').first().click();
  const q1 = await page.evaluate(() => window.__game.state().fireQueue.length);
  console.log('tablet FIRE queue:', q0, '->', q1, '(click queues one round)');
}
// engage-all
await page.locator('#t-engage-all').click();
await step(4);
s = await state();
console.log('after engage-all — assignments:', JSON.stringify(s.assignments), 'queue:', s.fireQueue.length);
await page.evaluate(() => window.__game.closeTablet());

// ---- missile cam
await page.evaluate(() => window.__game.setView('missile'));
await step(20);
s = await state();
const cam = await page.evaluate(() => {
  const c = window.__game.ctx.camera.position;
  return { x: Math.round(c.x), y: Math.round(c.y), z: Math.round(c.z) };
});
console.log('viewMode:', s.viewMode, 'cam:', JSON.stringify(cam), 'player:', JSON.stringify(s.player));
await page.screenshot({ path: 'shots_probe/missile_cam.png', timeout: 120_000 });

// threat cam
await page.evaluate(() => window.__game.cycleView());
await step(16);
s = await state();
console.log('after cycle viewMode:', s.viewMode);
await page.screenshot({ path: 'shots_probe/threat_cam.png', timeout: 120_000 });

// back to fp, let the raid autoplay out to check end-of-raid cleanliness
await page.evaluate(() => { window.__game.setView('fp'); window.__game.autoplay(true); });
for (let i = 0; i < 120; i++) {
  await step(40);
  s = await state();
  if (s.phase === 'debrief') break;
}
console.log('end phase:', s.phase, 'stats:', JSON.stringify(s.stats), 'viewMode:', s.viewMode);

// ---- tablet as raid-starter (idle scenario controls) at night
await page.evaluate(() => {
  window.__game.setTimeOfDay('night');
  window.__game.ctx.ui.hideDebrief();
  window.__game.openTablet();
});
await step(14);
await page.screenshot({ path: 'shots_probe/tablet_night_idle.png', timeout: 120_000 });
const footBtns = await page.locator('#t-foot button').count();
console.log('idle foot buttons:', footBtns);

console.log('done');
await browser.close();
