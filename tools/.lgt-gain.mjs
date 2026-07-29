/**
 * Scratch diagnostic: is the SH probe grid reaching the image at all?
 *
 * Toggling the grid object's visibility is not a safe test — it changes a shader
 * define, so the frames either side of it may not have recompiled. Scaling the
 * baked coefficients and re-uploading keeps the same program and changes only
 * the data, so a frame that does not move says the path is inert.
 *
 *   node tools/.lgt-gain.mjs [shot]
 */
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const SHOT = process.argv[2] ?? 'cafe_window';
const OUT = 'shots/.gain';
mkdirSync(OUT, { recursive: true });
const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--window-size=640,360',
  ],
  protocolTimeout: 2400000,
  defaultViewport: { width: 640, height: 360 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 200)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 600000, polling: 250 });
await page.waitForFunction((s) => window.__GAME__.listShots().includes(s), {
  timeout: 600000, polling: 250,
}, SHOT);

const info = await page.evaluate((shot) => {
  const g = window.__GAME__;
  const engine = g.engine;
  g.pose(shot);
  const lighting = engine.get('lighting');
  const volume = lighting.volume;
  for (let i = 0; i < 4000 && (!volume.ready || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 120; i++) engine.step(1 / 60);

  /* Keep a pristine copy: the relight rebuilds `sh` from the ray cache, so a
     scaled version has to be re-applied after every one. */
  window.__GAIN__ = {
    volume,
    sh: volume.sh.slice(),
    spread: volume.shSpread.slice(),
    apply(gain) {
      for (let i = 0; i < volume.sh.length; i++) {
        volume.sh[i] = this.sh[i] * gain;
        volume.shSpread[i] = this.spread[i] * gain;
      }
      volume.uploadSH();
    },
  };

  let peak = 0;
  let mean = 0;
  for (let i = 0; i < volume.sh.length; i += 27) {
    const v = Math.abs(volume.sh[i]);
    peak = Math.max(peak, v);
    mean += v;
  }
  return {
    probes: volume.sh.length / 27,
    meanDC: mean / (volume.sh.length / 27),
    peakDC: peak,
    hasTexture: !!volume.shTexture,
    gridInScene: !!lighting.grid && !!lighting.grid.parent,
    stats: volume.stats,
  };
}, SHOT);

console.log(JSON.stringify(info, null, 2));

for (const gain of [1, 0, 8]) {
  await page.evaluate((gn) => {
    window.__GAIN__.apply(gn);
    for (let i = 0; i < 40; i++) window.__GAME__.engine.step(1 / 60);
  }, gain);
  const buf = await page.screenshot({ type: 'png' });
  writeFileSync(`${OUT}/${SHOT}-sh${gain}.png`, buf);
  console.log(`wrote ${OUT}/${SHOT}-sh${gain}.png`);
}

await browser.close();
