// Probe: reproduce launch smoke "big blob of black" — start scenario with
// autoplay, wait for a launch, then look at the smoke column from close range
// at several times after launch.
import { chromium } from '@playwright/test';

const BASE = process.env.PROBE_URL ?? 'http://localhost:4173';
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30_000 });
await page.evaluate(() => {
  window.__game.testMode();
  window.__game.pause(true);
  window.__game.setTimeOfDay('day');
  window.__game.seed(7);
  window.__game.start('single');
  window.__game.autoplay(true);
});
const step = (frames) => page.evaluate((f) => window.__game.step(f, 33.34), frames);
const state = () => page.evaluate(() => window.__game.state());

// step until an interceptor exists (launch)
for (let i = 0; i < 240; i++) {
  await step(5);
  const s = await state();
  if (s.interceptors.length > 0) break;
}
let s = await state();
console.log('interceptors', JSON.stringify(s.interceptors));
const pad = { x: s.interceptors[0]?.x ?? 49, z: s.interceptors[0]?.z ?? 31 };
// find launch site: probably rampart pad. Position camera near pad looking at smoke.
// camera at spawn, looking toward the battery that fired.
const shots = [
  { t: 0, name: 'launch_plus0' },
  { t: 30, name: 'launch_plus1s' },
  { t: 90, name: 'launch_plus3s' },
  { t: 150, name: 'launch_plus5s' },
];
let done = 0;
for (const sh of shots) {
  if (sh.t > 0) await step(sh.t - done);
  done = sh.t;
  // look from ~20m south of the firing pad toward the smoke column
  await page.evaluate(([px, pz]) => {
    const g = window.__game;
    g.teleport(px - 14, 0, pz + 16, 0, 0);
    g.lookAt(px, 10, pz);
  }, [pad.x, pad.z]);
  await step(1);
  await page.screenshot({ path: `shots_probe/smoke_${sh.name}.png` });
}
// also from very close, smoke between camera and sun/sky
await page.evaluate(([px, pz]) => {
  const g = window.__game;
  g.teleport(px - 5, 0, pz + 6, 0, -0.35);
  g.lookAt(px, 20, pz);
}, [pad.x, pad.z]);
await step(1);
await page.screenshot({ path: 'shots_probe/smoke_close_up.png' });
// and walk INTO the drifting smoke, looking through it at the sky/sun
await step(60);
await page.evaluate(([px, pz]) => {
  const g = window.__game;
  g.teleport(px + 2, 0, pz + 2, 0, -0.15);
  g.lookAt(px - 20, 8, pz - 10);
}, [pad.x, pad.z]);
await step(1);
await page.screenshot({ path: 'shots_probe/smoke_inside.png' });
console.log('done');
await browser.close();
