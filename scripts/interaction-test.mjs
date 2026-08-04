/**
 * Drives the built scene the way a player would - keys, buttons, camera
 * changes, a broadside and a .glb export - and checks the ship actually
 * responds. Exits non-zero on the first failed expectation.
 *
 *   node scripts/interaction-test.mjs
 */
import puppeteer from 'puppeteer-core';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const downloads = await mkdtemp(join(tmpdir(), 'pirate-glb-'));

const failures = [];
const checks = [];
function check(label, condition, detail = '') {
  checks.push(label);
  if (condition) console.log(`  ok   ${label}${detail ? ` (${detail})` : ''}`);
  else {
    console.log(`  FAIL ${label}${detail ? ` (${detail})` : ''}`);
    failures.push(label);
  }
}

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

const errors = [];
page.on('pageerror', (error) => errors.push(error.stack || error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto(`${pathToFileURL(join(root, 'pirate-ship.html')).href}?quality=low`, {
  waitUntil: 'load',
});
await wait(1500);

const state = () => page.evaluate(() => ({ ...window.pirateShip.ship.state }));
const cameraMode = () => page.evaluate(() => window.pirateShip.cameraRig.mode);
const position = () => page.evaluate(() => window.pirateShip.ship.root.position.toArray());

// ---- Sail trim -------------------------------------------------------------
const before = await state();
await page.keyboard.down('KeyW');
await wait(1800);
await page.keyboard.up('KeyW');
const afterSail = await state();
check('W sets more sail', afterSail.sailSet > before.sailSet, `${before.sailSet.toFixed(2)} -> ${afterSail.sailSet.toFixed(2)}`);

await page.keyboard.down('KeyS');
await wait(1800);
await page.keyboard.up('KeyS');
const afterTakeIn = await state();
check('S takes in sail', afterTakeIn.sailSet < afterSail.sailSet, `${afterSail.sailSet.toFixed(2)} -> ${afterTakeIn.sailSet.toFixed(2)}`);

// ---- Steering --------------------------------------------------------------
const headingBefore = (await state()).heading;
await page.keyboard.down('KeyD');
await wait(2500);
await page.keyboard.up('KeyD');
const headingAfter = (await state()).heading;
check('D turns to starboard', headingAfter > headingBefore, `${headingBefore.toFixed(3)} -> ${headingAfter.toFixed(3)}`);

await page.keyboard.down('KeyA');
await wait(3000);
await page.keyboard.up('KeyA');
check('A turns to port', (await state()).heading < headingAfter);

// ---- She actually makes way ------------------------------------------------
const positionBefore = await position();
await wait(2500);
const positionAfter = await position();
const travelled = Math.hypot(positionAfter[0] - positionBefore[0], positionAfter[2] - positionBefore[2]);
check('the ship makes way', travelled > 1, `${travelled.toFixed(1)} m`);
check('the hull rides the waves', Math.abs(positionAfter[1]) > 0.01, `y = ${positionAfter[1].toFixed(2)}`);

// ---- Guns ------------------------------------------------------------------
await page.keyboard.press('Space');
await wait(500);
const fired = await state();
check('Space fires a broadside', fired.reload > 0, `reload ${fired.reload.toFixed(1)}s`);
const shotCount = await page.evaluate(
  () => window.pirateShip.scene.children.filter((o) => o.isMesh && o.visible && o.geometry.type === 'SphereGeometry').length,
);
check('round shot is in the air', shotCount > 0, `${shotCount} in flight`);

// ---- Cameras ---------------------------------------------------------------
const modes = [];
for (let i = 0; i < 3; i++) {
  await page.keyboard.press('KeyC');
  await wait(400);
  modes.push(await cameraMode());
}
check('C cycles the cameras', new Set(modes).size === 3, modes.join(' -> '));

// ---- Reset -----------------------------------------------------------------
await page.keyboard.press('KeyR');
await wait(400);
const reset = await position();
check('R puts her back on station', Math.hypot(reset[0], reset[2]) < 0.5);

// ---- Touch joystick --------------------------------------------------------
const joystick = await page.$('#joystick');
const box = await joystick.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 - 50, { steps: 5 });
await wait(1500);
await page.mouse.up();
const joystickState = await state();
check('the joystick steers and trims', joystickState.rudder > 0.1 && joystickState.sailSet > 0.55, `rudder ${joystickState.rudder.toFixed(2)}, sail ${joystickState.sailSet.toFixed(2)}`);

// ---- glTF export -----------------------------------------------------------
await page.createCDPSession().then((session) =>
  session.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads }),
);
await page.click('#btn-export');
let exported = null;
for (let i = 0; i < 40 && !exported; i++) {
  await wait(500);
  const files = await readdir(downloads);
  exported = files.find((file) => file.endsWith('.glb'));
}
check('the Download .glb button produces a file', Boolean(exported), exported || 'none');
if (exported) {
  const data = await readFile(join(downloads, exported));
  check('the export is a valid glTF binary', data.subarray(0, 4).toString() === 'glTF', `${(data.length / 1048576).toFixed(1)} MB`);

  // GLB layout: 12-byte header, then chunks of [length, type, payload].
  const jsonLength = data.readUInt32LE(12);
  const gltf = JSON.parse(data.subarray(20, 20 + jsonLength).toString());
  check('the export carries geometry', gltf.meshes?.length > 0, `${gltf.meshes?.length} meshes`);
  check('the export carries materials', gltf.materials?.length > 0, `${gltf.materials?.length} materials`);
  check('the export carries baked textures', gltf.images?.length > 0, `${gltf.images?.length} images`);
}

check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();

console.log(`\n${checks.length - failures.length}/${checks.length} checks passed`);
if (failures.length) process.exit(1);
