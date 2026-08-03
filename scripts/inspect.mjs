#!/usr/bin/env node
/**
 * Asset inspector.
 *
 * Frames one named subject from a ring of angles and writes a contact sheet of
 * PNGs. Used for art-direction passes: silhouette, proportion, surfacing and
 * lighting are all far easier to judge on a controlled turntable than on
 * whatever the director happens to be pointing at.
 *
 *   node scripts/inspect.mjs --subject runner --time 100 --dist 2.4
 *   node scripts/inspect.mjs --subject destroyer --views 0,40 --dist 1.6
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const SUBJECT = flag('subject', 'runner');
const TIME = Number(flag('time', 100));
const DIST = Number(flag('dist', 2.4));
const FOV = Number(flag('fov', 40));
const TAG = flag('tag', SUBJECT);
const OUT = path.join(root, 'qa', flag('out', 'inspect'));
const OFFSET = flag('offset', null);

// azimuth:elevation pairs, in degrees.
const VIEWS = (
  flag('views', '20:14,90:8,160:16,215:24,270:6,0:70')
).split(',').map((v) => v.split(':').map(Number));

const CANDIDATES = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(
  Boolean,
);
const chrome = CANDIDATES.find((c) => existsSync(c));

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--mute-audio',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
  ],
  protocolTimeout: 600000,
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.goto('http://127.0.0.1:5173/?qa=1&quality=medium&autoplay=0', {
  waitUntil: 'domcontentloaded',
});
await page.waitForFunction('window.__STARFALL && window.__STARFALL.ready === true', {
  timeout: 300000,
});
// The HUD would sit on top of every frame; the inspector wants clean plates.
await page.addStyleTag({ content: '#ui-root { display: none !important; }' });
await mkdir(OUT, { recursive: true });

await page.evaluate((t) => window.__STARFALL.seekAndSettle(t, 6, 3.0), TIME);

for (const [az, el] of VIEWS) {
  const info = await page.evaluate(
    (subject, azimuth, elevation, distance, fov, offset) =>
      window.__STARFALL.look({
        subject,
        azimuth,
        elevation,
        distance,
        fov,
        offset: offset ? offset.split(',').map(Number) : undefined,
      }),
    SUBJECT,
    az,
    el,
    DIST,
    FOV,
    OFFSET,
  );
  const name = `${TAG}-az${az}-el${el}.png`;
  await page.screenshot({ path: path.join(OUT, name), type: 'png' });
  console.log(`captured ${name}`, info ? `r=${info.radius.toFixed(1)} d=${info.distance.toFixed(1)}` : 'NO SUBJECT');
}

await browser.close();
