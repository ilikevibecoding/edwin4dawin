/**
 * Renders a set of fixed camera angles to screenshots/, using the
 * window.pirateShip handle exposed by the scene.
 *
 *   node scripts/gallery.mjs [--out screenshots] [--quality high] [--settle 6]
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

const outDir = resolve(root, readArg('out', 'screenshots'));
const quality = readArg('quality', 'high');
const settle = Number(readArg('settle', 6));
const only = readArg('only', null);

const SHOTS = [
  { name: 'starboard-bow', offset: [34, 13, 30], sails: 0.75 },
  { name: 'port-quarter', offset: [-30, 16, -34], sails: 0.75 },
  { name: 'deck-detail', offset: [13, 12, -14], sails: 0.7 },
  { name: 'broadside', offset: [44, 11, 4], sails: 0.6, fire: 'starboard', fireDelay: 1500 },
  { name: 'wide', offset: [-58, 30, -70], sails: 1.0 },
  { name: 'helm-view', mode: 'helm', sails: 0.8 },
  { name: 'guns-closeup', offset: [13, 5.5, 1], target: [4, 3, 1], sails: 0.6 },
  { name: 'bow-closeup', offset: [11, 8, 26], target: [0, 6, 17], sails: 0.6 },
  { name: 'stern-closeup', offset: [-6, 8, -28], target: [0, 4.5, -15], sails: 0.6 },
];

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: 'new',
  args: [
    '--no-sandbox',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--hide-scrollbars',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
page.on('pageerror', (error) => console.error('pageerror:', error.message));
await page.goto(`${pathToFileURL(join(root, 'pirate-ship.html')).href}?quality=${quality}`, {
  waitUntil: 'load',
});

// Let the ship gather way and lay down a wake.
await page.evaluate(() => {
  window.pirateShip.ship.state.speed = 6;
});
await new Promise((done) => setTimeout(done, settle * 1000));
await mkdir(outDir, { recursive: true });

for (const shot of SHOTS) {
  if (only && shot.name !== only) continue;

  await page.evaluate((config) => {
    const { ship, camera, cameraRig } = window.pirateShip;
    ship.state.sailSet = config.sails;
    cameraRig.setMode(config.mode || 'orbit');
    if (config.offset) {
      camera.position.set(
        ship.root.position.x + config.offset[0],
        ship.root.position.y + config.offset[1],
        ship.root.position.z + config.offset[2],
      );
      const target = config.target || [0, 6, 0];
      cameraRig.controls.target.set(
        ship.root.position.x + target[0],
        ship.root.position.y + target[1],
        ship.root.position.z + target[2],
      );
      cameraRig.controls.update();
    }
  }, shot);

  await new Promise((done) => setTimeout(done, 2500));
  if (shot.fire) {
    await page.evaluate((side) => window.pirateShip.ship.fire(side), shot.fire);
    await new Promise((done) => setTimeout(done, shot.fireDelay || 700));
  }

  const file = join(outDir, `${shot.name}.png`);
  await page.screenshot({ path: file });
  console.log(`wrote ${file}`);
}

await browser.close();
