#!/usr/bin/env node
import { chromium } from 'playwright';

// Toggle post stages and grade parameters in one session, reporting the
// luminance of each configuration. Finds "which stage ate the image" in a
// single page load instead of one full rebuild per guess.

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5173/?quality=fast');
const url = base + (base.includes('?') ? '&' : '?') + 'capture=1';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });
await page.evaluate(() => window.debugAPI.setView('hero'));

async function probe(label, setup) {
  if (setup) await page.evaluate(setup);
  const l = await page.evaluate(() => {
    window.debugAPI.renderFrames(1);
    return window.debugAPI.sampleLuma();
  });
  console.log(`${label.padEnd(34)} mean ${l.mean.toFixed(4)}  max ${l.max.toFixed(4)}`);
}

await probe('all on', null);
await probe('ao off', () => window.debugAPI.toggle('ao', false));
await probe('ao+bloom off', () => window.debugAPI.toggle('bloom', false));
await probe('ao+bloom+grade off', () => window.debugAPI.toggle('grade', false));
await probe('all off (smaa only)', () => window.debugAPI.toggle('smaa', false));
await probe('grade back on', () => window.debugAPI.toggle('grade', true));
await probe('exposure 3.0', () => window.debugAPI.exposure(3.0));
await probe('exposure 0.85 + ao on', () => {
  window.debugAPI.exposure(0.85);
  window.debugAPI.toggle('ao', true);
});
await probe('direct scene render', () => {
  const { renderer, scene, camera } = window.debugAPI.objects;
  window.debugAPI.renderFrames = () => {
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    renderer.getContext().finish();
  };
});

await browser.close();
