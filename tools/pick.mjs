#!/usr/bin/env node
/**
 * Raycast probe: seek to a time and report what the camera hits through a grid
 * of normalised device coordinates. Used to identify holes in the geometry.
 *
 * Usage: node tools/pick.mjs <time> '[[ndcX,ndcY], ...]'
 */
import puppeteer from 'puppeteer-core';

const time = Number(process.argv[2] ?? 219);
const POINTS = JSON.parse(process.argv[3] || '[[0,0]]');

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'shell',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    '--window-size=1280,720',
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__SW_READY === true', { timeout: 240000 });
await page.evaluate(async () => {
  document.querySelector('#gate button.primary').click();
  await new Promise((r) => setTimeout(r, 900));
  window.__SW.setPlaying(false);
  window.__SW.hideUi(true);
});

const out = await page.evaluate(
  (t, points) => {
    window.__SW.seek(t);
    window.__SW.settle(10, 1 / 30);
    window.__SW.renderOnce();
    const cam = window.__SW.app.render.camera;
    return {
      camPos: cam.position.toArray().map((v) => +v.toFixed(2)),
      hits: points.map(([x, y]) => ({ ndc: [x, y], hit: window.__SW.pick(x, y) })),
    };
  },
  time,
  POINTS,
);
console.log(JSON.stringify(out, null, 1));
await browser.close();
