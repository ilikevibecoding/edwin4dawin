// Focused asset-loop screenshots.
// Usage: node tools/shot.mjs --views controlRoom,sonarConsole --out shots/iter_1/assets/control-room [--state cruising] [--wear used] [--seed 1337] [--pose "x,y,z,yaw,pitch,fov"]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launchBrowser, openApp, applyBaseline, shootView } from './lib.mjs';

const args = process.argv.slice(2);
function arg(name, def = null) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
}

const views = (arg('views', 'controlRoom')).split(',');
const out = arg('out', 'shots/adhoc');
const state = arg('state', 'cruising');
const wear = arg('wear', 'used');
const seed = parseInt(arg('seed', '1337'), 10);
const pose = arg('pose', null); // custom camera: "x,y,z,yaw,pitch,fov" (uses first view's time)

const { url, close } = await startServer();
const browser = await launchBrowser();
const collect = { console: [], errors: [], pageErrors: [] };
try {
  const page = await openApp(browser, url, { seed, collect });
  await applyBaseline(page, { state, wear });
  if (pose) {
    const [x, y, z, yaw, pitch, fov] = pose.split(',').map(Number);
    await page.evaluate(({ x, y, z, yaw, pitch, fov }) => {
      const api = window.debugAPI;
      api.setView('walking');
      api.setHUDVisible(false);
      const ctx = window.__ctx;
      ctx.player.object.position.set(x, y, z);
      ctx.player.object.rotation.y = yaw;
      ctx.player.pitchObject.rotation.x = pitch;
      ctx.camera.fov = fov || 62;
      ctx.camera.updateProjectionMatrix();
    }, { x, y, z, yaw, pitch, fov });
    await page.waitForTimeout(2000);
    fs.mkdirSync(out, { recursive: true });
    await page.screenshot({ path: path.join(out, 'custom.png') });
    console.log('saved', path.join(out, 'custom.png'));
  } else {
    for (const v of views) {
      const p = await shootView(page, v, path.join(out, `${v}.png`));
      console.log('saved', p);
    }
  }
  if (collect.errors.length || collect.pageErrors.length) {
    console.log('CONSOLE ERRORS:', JSON.stringify([...collect.errors, ...collect.pageErrors], null, 2));
  }
} finally {
  await browser.close();
  await close();
}
