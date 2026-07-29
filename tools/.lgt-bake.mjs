/**
 * Scratch diagnostic: how many capture frames the bake needs to finish.
 *
 * `capture.mjs` waits for `__GAME__.ready` and then steps `warmup + settle`
 * frames before it screenshots. The bake is amortised across those frames at
 * the capture budget, so if it needs more of them than the harness spends, the
 * shot photographs a half-finished volume — which looks exactly like a lighting
 * bug. This reports the frame and wall-clock cost of each phase.
 *
 *   node tools/.lgt-bake.mjs
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--window-size=320,180',
  ],
  protocolTimeout: 2400000,
  defaultViewport: { width: 320, height: 180 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 200)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 600000, polling: 250 });

const out = await page.evaluate(async () => {
  const g = window.__GAME__;
  const engine = g.engine;
  g.pose('cafe_window');
  const volume = engine.get('lighting').volume;

  const marks = [];
  let last = volume.phase;
  const t0 = performance.now();
  let frame = 0;
  marks.push({ frame: 0, phase: last, ms: 0 });
  for (; frame < 4000 && (!volume.ready || volume.baking); frame++) {
    engine.step(1 / 60);
    if (volume.phase !== last) {
      last = volume.phase;
      marks.push({ frame: frame + 1, phase: last, ms: Math.round(performance.now() - t0) });
    }
  }
  return {
    frames: frame,
    ms: Math.round(performance.now() - t0),
    ready: volume.ready,
    baking: volume.baking,
    marks,
    probes: volume.stats,
  };
});

console.log(`bake finished after ${out.frames} capture frames, ${out.ms} ms`);
console.log(`ready=${out.ready} baking=${out.baking}`);
console.log('phase timeline (frame, phase entered, ms):');
for (const m of out.marks) console.log(`  ${String(m.frame).padStart(5)}  ${String(m.phase).padEnd(9)} ${m.ms} ms`);
console.log('stats:', JSON.stringify(out.probes));
await browser.close();
