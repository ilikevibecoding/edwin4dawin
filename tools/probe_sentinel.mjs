// Probe: reproduce shot-07 flow — seed 2024, single scenario, assign sentinel
// to the first track, authorize, then log interceptor telemetry to see why it misses.
import { chromium } from '@playwright/test';

const BASE = process.env.PROBE_URL ?? 'http://localhost:4173';

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30_000 });
await page.evaluate(() => { window.__game.testMode(); window.__game.pause(true); });

const step = (frames, dt = 33.34) => page.evaluate(([f, d]) => window.__game.step(f, d), [frames, dt]);
const state = () => page.evaluate(() => window.__game.state());

await page.evaluate(() => {
  window.__missReasons = [];
  window.__game.ctx.events.on('intercept-miss', (e) => window.__missReasons.push(`${e.reason} dist=${e.dist} pk=${e.pk?.toFixed(2)}`));
  window.__game.ctx.events.on('intercept-success', (e) => window.__missReasons.push(`SUCCESS dist=${e.dist} pk=${e.pk?.toFixed(2)}`));
  window.__game.seed(2024);
  window.__game.start('single');
});

// step until first track
let s;
for (let i = 0; i < 40; i++) {
  await step(30);
  s = await state();
  if (s.tracks.length >= 1) break;
}
console.log('track appeared:', JSON.stringify(s.tracks));

await page.evaluate(() => {
  const st = window.__game.state();
  window.__game.assign(st.tracks[0].id, 'sentinel');
  window.__game.authorize();
});

// telemetry loop — switch to single-frame stepping when close
let fine = false;
for (let i = 0; i < 4000; i++) {
  await step(fine ? 1 : 15);
  s = await state();
  const it = s.interceptors[0];
  const t = s.tracks[0];
  if (it && t) {
    const d = Math.hypot((it.x - t.x), (it.alt - t.alt), (it.z - t.z));
    if (d < 3000) fine = true;
    if (fine) {
      console.log(`frame dist=${Math.round(d)} int=(${it.x},${it.alt},${it.z}) thr=(${t.x},${t.alt},${t.z}) phase=${it.phase}`);
    }
  }
  if (s.stats.intercepted >= 1 || s.stats.misses >= 1 || s.phase === 'debrief') break;
}
s = await state();
console.log('FINAL stats:', JSON.stringify(s.stats));
console.log('outcomes:', JSON.stringify(await page.evaluate(() => window.__missReasons)));
await browser.close();
