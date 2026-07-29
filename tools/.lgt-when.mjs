/**
 * Scratch diagnostic: is the bounce grid populated when the harness shoots?
 *
 * `capture.mjs` waits for `__GAME__.ready` then steps `warmup + settle` frames.
 * The geometric bake and the radiance projection are separate phases with
 * separate triggers, so "ready" says nothing about whether there is any light
 * in the grid. This samples the SH energy at the frame counts the harness
 * actually uses.
 *
 *   node tools/.lgt-when.mjs
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
  const lighting = engine.get('lighting');
  const sky = engine.get('sky');
  const volume = lighting.volume;

  const snap = (frame) => {
    let dc = 0;
    let peak = 0;
    let live = 0;
    const w = 27;
    for (let p = 0; p < volume.probeCount; p++) {
      const v = volume.sh[p * w] + volume.shSpread[p * w];
      dc += v;
      if (v > peak) peak = v;
      if (v > 1e-6) live++;
    }
    return {
      frame,
      phase: volume.phase,
      ready: volume.ready,
      baking: volume.baking,
      pending: volume.pendingRelight,
      skyRev: sky.revision,
      probeRev: lighting.probeRevision,
      meanDC: Math.round((dc / Math.max(volume.probeCount, 1)) * 1e6) / 1e6,
      peakDC: Math.round(peak * 1e4) / 1e4,
      liveFrac: Math.round((live / Math.max(volume.probeCount, 1)) * 1000) / 1000,
      reflectance: volume.stats.reflectance,
    };
  };

  const rows = [snap(0)];
  const stops = [1, 2, 4, 8, 11, 16, 24, 40, 80, 160, 400];
  let frame = 0;
  for (const s of stops) {
    for (; frame < s; frame++) engine.step(1 / 60);
    rows.push(snap(frame));
  }
  return rows;
});

const pad = (v, n) => String(v).padEnd(n);
console.log(pad('frame', 7) + pad('phase', 9) + pad('ready', 7) + pad('bake', 6) +
  pad('pend', 6) + pad('skyRev', 8) + pad('probRev', 9) + pad('meanDC', 11) +
  pad('peakDC', 10) + pad('live', 7) + 'reflectance');
for (const r of out) {
  console.log(pad(r.frame, 7) + pad(r.phase, 9) + pad(r.ready, 7) + pad(r.baking, 6) +
    pad(r.pending, 6) + pad(r.skyRev, 8) + pad(r.probeRev, 9) + pad(r.meanDC, 11) +
    pad(r.peakDC, 10) + pad(r.liveFrac, 7) + r.reflectance);
}
await browser.close();
