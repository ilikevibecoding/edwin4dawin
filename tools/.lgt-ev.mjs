/**
 * Scratch diagnostic: what the meter is actually doing to an interior.
 *
 * The rig can be right in kilonits and the frame still black, because between
 * the two sit a histogram, a partial-adaptation clamp and a tone curve. This
 * reads the exposure pass's own output — metered log luminance, the EV it
 * wanted and the EV it settled on — so the difference between "too little
 * light" and "too little exposure" is a measurement rather than a guess.
 *
 *   node tools/.lgt-ev.mjs [shot]
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const SHOT = process.argv[2] ?? 'cafe_window';
const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--window-size=480,270',
  ],
  protocolTimeout: 2400000,
  defaultViewport: { width: 480, height: 270 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  page [pageerror]', e.message.slice(0, 200)));
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 600000, polling: 250 });
await page.waitForFunction((s) => window.__GAME__?.listShots?.().includes(s), {
  timeout: 600000, polling: 250,
}, SHOT);

const out = await page.evaluate(async (shot) => {
  const g = window.__GAME__;
  const engine = g.engine;
  g.pose(shot);
  const volume = engine.get('lighting').volume;
  for (let i = 0; i < 4000 && (!volume.ready || volume.baking); i++) engine.step(1 / 60);
  for (let i = 0; i < 4000 && !volume.stats.reflectance; i++) engine.step(1 / 60);
  for (let i = 0; i < 90; i++) engine.step(1 / 60);

  const render = engine.get('render');
  const ae = render.autoExposure ?? render.exposure ?? null;
  if (!ae) return { error: 'no auto-exposure on the render system', keys: Object.keys(render) };

  const renderer = engine.renderer;
  /* The pass ping-pongs two 1x1 targets; `texture` is the live one, so find the
     render target that owns it rather than reaching for a private index. */
  const target = ae.history.find((t) => t.texture === ae.texture) ?? ae.history[0];
  const px = new Float32Array(4);
  renderer.readRenderTargetPixels(target, 0, 0, 1, 1, px);

  const r3 = (v) => Math.round(v * 1000) / 1000;
  return {
    ev: r3(px[0]), targetEV: r3(px[1]), avgLogLum: r3(px[2]),
    gain: r3(Math.pow(2, px[0])),
    meteredNits: r3(Math.pow(2, px[2])),
    key: ae.key, minEV: ae.minEV, maxEV: ae.maxEV,
    adaptStrength: ae.adaptStrength, anchorLogLum: ae.anchorLogLum,
    adaptDown: ae.adaptDown, adaptUp: ae.adaptUp,
  };
}, SHOT);

if (out.error) console.log('ERROR:', out.error, out.keys?.join(', '));
else {
  console.log(`metered log2 luminance ${out.avgLogLum}  (${out.meteredNits} kilonits)`);
  console.log(`target EV ${out.targetEV}   applied EV ${out.ev}   linear gain ${out.gain}`);
  console.log(`key ${out.key}  clamp [${out.minEV}, ${out.maxEV}]  anchor ${out.anchorLogLum}` +
    `  strength ${out.adaptStrength}  bounds -${out.adaptDown}/+${out.adaptUp}`);
  const full = Math.log2(out.key) - out.avgLogLum;
  console.log(`fully adapted EV would be ${full.toFixed(2)}; the meter is ` +
    `${(full - out.ev).toFixed(2)} stops under it`);
}
await browser.close();
