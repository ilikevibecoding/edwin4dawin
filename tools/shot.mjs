#!/usr/bin/env node
/**
 * Headless screenshot tool for visual review. Requires the dev server (npm run dev) on --url.
 *
 *   node tools/shot.mjs --out /tmp/shots/plaza.png --view plaza_wide
 *   node tools/shot.mjs --out /tmp/shots/gun.png --pos 0,0,12 --yaw 0 --pitch -3 --nohud
 *   node tools/shot.mjs --out /tmp/shots/strike.png --exec "game.killstreaks.airstrike.callAt(0,-6)" --wait 3.6
 *   node tools/shot.mjs --out /tmp/shots/cine.png --freecam 10,6,20 --lookat 0,2,0 --fov 40
 *   node tools/shot.mjs --list                # print registered views
 *
 * Options:
 *   --url URL           default http://localhost:5173
 *   --w N --h N         viewport, default 1600x900
 *   --quality low|medium|high|ultra   (default high)
 *   --view NAME         registered view (see src/core/Debug.js / module registrations)
 *   --pos x,y,z --yaw deg --pitch deg --fov deg
 *   --freecam x,y,z --lookat x,y,z    detached cinematic camera
 *   --ads               aim down sights
 *   --nohud / --noweapon
 *   --exec "js"         evaluated in page with `game` and `THREE` in scope (may be async / use await)
 *   --wait SEC          simulated seconds to advance after setup (fixed 60Hz steps), default 0.5
 *   --frames N          extra frames to render before capture, default 3
 *   --params "a=1&b=2"  extra URL params
 *   --timeout MS        default 240000
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def = undefined) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = args[i + 1];
  if (v === undefined || v.startsWith('--')) return true;
  return v;
};
const has = (name) => args.includes(`--${name}`);

const url = opt('url', 'http://localhost:5173');
const width = parseInt(opt('w', '1600'), 10);
const height = parseInt(opt('h', '900'), 10);
const quality = opt('quality', 'high');
const out = opt('out', '/tmp/shots/shot.png');
const timeout = parseInt(opt('timeout', '240000'), 10);
const waitSec = parseFloat(opt('wait', '0.5'));
const frames = parseInt(opt('frames', '3'), 10);
const params = new URLSearchParams(opt('params', ''));
params.set('shot', '1');
params.set('quality', quality);
if (!params.has('noEnemies')) params.set('noEnemies', has('enemies') ? '0' : '1');
if (has('fov')) params.set('fov', opt('fov'));

const chromePath = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    `--window-size=${width},${height}`,
  ],
  defaultViewport: { width, height, deviceScaleFactor: 1 },
  protocolTimeout: timeout + 60000,
});

const page = await browser.newPage();
page.setDefaultTimeout(timeout);
const logs = [];
const verbose = has('verbose');
page.on('console', (msg) => {
  const text = `[${msg.type()}] ${msg.text()}`;
  logs.push(text);
  if (text.includes('favicon')) return;
  if (msg.type() === 'error' || msg.type() === 'warning' || verbose) console.error(text);
});
page.on('pageerror', (err) => {
  logs.push(`[pageerror] ${err.message}`);
  console.error('[pageerror]', err.message);
});

const t0 = Date.now();
try {
  await page.goto(`${url}/?${params.toString()}`, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForFunction(() => window.__shotReady === true || window.__gameError, { timeout, polling: 250 });
  const err = await page.evaluate(() => window.__gameError);
  if (err) throw new Error(`game failed to init: ${err}`);
  console.error(`[shot] ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  if (has('list')) {
    const views = await page.evaluate(() => Object.keys(window.__game.debug.views));
    console.log(views.join('\n'));
    await browser.close();
    process.exit(0);
  }

  const setup = {
    view: opt('view'),
    pos: opt('pos'),
    yaw: opt('yaw'),
    pitch: opt('pitch'),
    fov: opt('fov'),
    freecam: opt('freecam'),
    lookat: opt('lookat'),
    ads: has('ads'),
    nohud: has('nohud'),
    noweapon: has('noweapon'),
    exec: opt('exec'),
    waitSec,
    frames,
  };

  await page.evaluate(async (s) => {
    const game = window.__game;
    const d = game.debug;
    const parseV = (str) => str.split(',').map(Number);
    if (s.view) d.setView(s.view);
    if (s.pos || s.yaw || s.pitch) {
      d.setView({
        pos: s.pos ? parseV(s.pos) : undefined,
        yaw: s.yaw != null ? parseFloat(s.yaw) : undefined,
        pitch: s.pitch != null ? parseFloat(s.pitch) : undefined,
      });
    }
    if (s.freecam) d.freeCam({ pos: parseV(s.freecam), lookAt: s.lookat ? parseV(s.lookat) : undefined, fov: s.fov ? parseFloat(s.fov) : undefined });
    else if (s.fov) game.render.baseFov = parseFloat(s.fov);
    if (s.ads) game.weapons.setAiming(true);
    if (s.nohud) d.setHud(false);
    if (s.noweapon) d.setViewModel(false);
    if (s.exec) {
      const fn = new Function('game', 'THREE', 'debug', `return (async () => { ${s.exec} })();`);
      await fn(game, window.THREE, d);
    }
    if (s.waitSec > 0) await d.waitTime(s.waitSec);
    await d.waitFrames(s.frames);
  }, setup);

  await mkdir(dirname(resolve(out)), { recursive: true });
  await page.screenshot({ path: out, type: out.endsWith('.jpg') ? 'jpeg' : 'png', quality: out.endsWith('.jpg') ? 92 : undefined });
  const stats = await page.evaluate(() => {
    const g = window.__game;
    const i = g.render.renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, frameMs: g.stats.frameMs.toFixed(0), enemies: g.enemies.aliveCount };
  });
  console.error(`[shot] saved ${out}  (${((Date.now() - t0) / 1000).toFixed(1)}s, draw calls ${stats.calls}, tris ${stats.triangles}, last frame ${stats.frameMs}ms)`);
  const errors = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'));
  if (errors.length) console.error(`[shot] ${errors.length} console error(s) — see above`);
} catch (err) {
  console.error('[shot] FAILED:', err.message);
  console.error(logs.slice(-20).join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
