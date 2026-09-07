#!/usr/bin/env node
import { chromium } from 'playwright';

// Quick frame-cost probe. Reports ms/frame for the full stack and with each
// post pass disabled, so we can see what is actually expensive.

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5173/');
const width = Number(arg('width', '1280'));
const height = Number(arg('height', '720'));

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height } });
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });

await page.evaluate(() => window.debugAPI.setView('hero'));

async function measure(label, setup) {
  if (setup) await page.evaluate(setup);
  const ms = await page.evaluate(async () => {
    const { renderer } = window.debugAPI.objects;
    const gl = renderer.getContext();
    // one sync'd frame first so any shader compile is not in the sample
    await new Promise((r) => requestAnimationFrame(r));
    gl.finish();
    const t = performance.now();
    let n = 0;
    while (performance.now() - t < 25000 && n < 4) {
      await new Promise((r) => requestAnimationFrame(r));
      gl.finish();
      n++;
    }
    return (performance.now() - t) / n;
  });
  console.log(`${label.padEnd(28)} ${ms.toFixed(0)} ms/frame  (${(1000 / ms).toFixed(1)} fps)`);
  return ms;
}

await measure('full stack', null);
await measure('no AO', () => window.debugAPI.toggle('ao', false));
await measure('no AO, no bloom', () => window.debugAPI.toggle('bloom', false));
await measure('no AO/bloom/smaa', () => window.debugAPI.toggle('smaa', false));
await measure('no post at all', () => window.debugAPI.toggle('grade', false));
console.log(JSON.stringify(await page.evaluate(() => window.debugAPI.stats())));

await browser.close();
