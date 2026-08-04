/**
 * Loads the built scene in headless Chrome, fails on any console error or
 * uncaught exception, then reports the measured frame rate and writes a
 * screenshot to screenshots/.
 *
 *   node scripts/smoke-test.mjs [--out screenshots/scene.png] [--seconds 6]
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};

const out = resolve(root, readArg('out', 'screenshots/scene.png'));
const seconds = Number(readArg('seconds', 6));
const width = Number(readArg('width', 1600));
const height = Number(readArg('height', 900));
const query = readArg('query', '');
const keys = (readArg('keys', '') || '').split(',').filter(Boolean);
const executablePath = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    `--window-size=${width},${height}`,
    '--hide-scrollbars',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1, hasTouch: true });

const problems = [];
page.on('console', (message) => {
  if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
  if (message.type() === 'warning') console.log(`  warning: ${message.text()}`);
});
page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
page.on('requestfailed', (request) => problems.push(`requestfailed: ${request.url()}`));

await page.goto(`${pathToFileURL(join(root, 'pirate-ship.html')).href}${query}`, {
  waitUntil: 'load',
});

await page.evaluate(() => {
  window.__frames = 0;
  const count = () => {
    window.__frames++;
    requestAnimationFrame(count);
  };
  requestAnimationFrame(count);
});

for (const key of keys) {
  await page.keyboard.down(key);
}

// Let the scene settle (and auto-tune its quality) before timing frames.
await new Promise((done) => setTimeout(done, seconds * 1000));
const started = Date.now();
await page.evaluate(() => {
  window.__frames = 0;
});
await new Promise((done) => setTimeout(done, 4000));
const frames = await page.evaluate(() => window.__frames);
const fps = frames / ((Date.now() - started) / 1000);

const state = await page.evaluate(() => ({
  speed: document.getElementById('readout-speed')?.textContent,
  heading: document.getElementById('readout-heading')?.textContent,
  sails: document.getElementById('readout-sails')?.textContent,
  quality: window.pirateShip?.quality.level,
  drawCalls: window.pirateShip?.renderer.info.render.calls,
  triangles: window.pirateShip?.renderer.info.render.triangles,
  loaderGone: !document.getElementById('loader'),
}));

await mkdir(dirname(out), { recursive: true });
await page.screenshot({ path: out });
await browser.close();

console.log(`fps: ${fps.toFixed(1)}  |  hud: ${JSON.stringify(state)}`);
console.log(`screenshot: ${out}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log('no console errors');
