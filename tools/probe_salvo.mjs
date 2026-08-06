// Verify salvo: assign once, authorize repeatedly -> multiple interceptors
// on the same threat (rolling across batteries while one reloads).
import { chromium } from '@playwright/test';

const BASE = process.env.PROBE_URL ?? 'http://localhost:4173';
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30_000 });
await page.evaluate(() => {
  window.__game.testMode();
  window.__game.pause(true);
  window.__game.seed(11);
  window.__game.start('single');
});
const step = (frames) => page.evaluate((f) => window.__game.step(f, 33.34), frames);
const state = () => page.evaluate(() => window.__game.state());

// wait for a track
for (let i = 0; i < 200; i++) {
  await step(5);
  const s = await state();
  if (s.tracks.length > 0) break;
}
let s = await state();
console.log('track:', s.tracks[0]?.id);
// assign + authorize 3x over ~4s (ripple across batteries)
await page.evaluate((tid) => window.__game.assign(tid, 'patriot'), s.tracks[0].id);
for (let volley = 0; volley < 3; volley++) {
  const r = await page.evaluate(() => window.__game.authorize());
  console.log('authorize ->', r, JSON.stringify((await (async () => state())()) && {}));
  await step(28);
}
await step(180); // let queued launches complete prep
s = await state();
console.log('interceptors in flight:', s.interceptors.length, JSON.stringify(s.interceptors));
console.log('assignment:', JSON.stringify(s.assignment), 'hint:', s.engageHint);
console.log('launches:', s.stats.launches, 'engagedBy:', s.tracks[0]?.engagedBy);
if (s.stats.launches >= 2) console.log('SALVO OK');
else console.log('SALVO FAIL');
await browser.close();
