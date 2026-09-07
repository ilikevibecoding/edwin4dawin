#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Terrain probe: free camera framings of the water hole (and anywhere else),
// with the terrain shader's debug channels available.
//
//   node tools/terrain_probe.mjs --url http://127.0.0.1:5205/?quality=fast \
//        --out shots/r2_terrain/probe --shots hole_plan,hole_low [--debug 7]
//
// Shots are relative to terrain.waterHole unless they carry `abs`. `debug`
// sets terrain.material.uniforms.uDebug (7 = zone masks: pad / sand+bank /
// mud+churn in r/g/b) for the whole run.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const baseUrl = arg('url', 'http://127.0.0.1:5205/?quality=fast');
const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'capture=1';
const width = Number(arg('width', '640'));
const height = Number(arg('height', '360'));
const outDir = arg('out', 'shots/r2_terrain/probe');
const debug = Number(arg('debug', '0'));
const only = arg('shots', '');
// comma-separated object names to hide for the run (e.g. farScrub), for ablation
const hide = arg('hide', '');
// post passes to switch off for the run (e.g. ao,smaa), for ablation
const off = arg('off', '');

const SHOTS = {
  // straight down the shore from head height, the sheet filling the frame
  // (from -x: the forest's boulders stand on the +x shore)
  hole_low: { pos: [-22, 1.6, -4], look: [0, 0, 0], fov: 40 },
  // a standing giraffe's view: the shore band and the sheet as a shape
  hole_high: { pos: [-26, 9, -10], look: [0, 0, 0], fov: 42 },
  // the lions' framing of it, near enough: a metre and a half up, thirty out
  hole_lion: { pos: [-32, 2.6, -6], look: [0, 0, 0], fov: 32 },
  // plan, for the ring widths
  hole_plan: { pos: [0.01, 34, 0.01], look: [0, 0, 0], fov: 50 },
  // the sheet against the sky, from the far side
  hole_sky: { pos: [-20, 1.5, -3], look: [0, 0.2, 0], fov: 36 },
};

const launchArgs = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-gpu-sandbox',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--js-flags=--max-old-space-size=4096',
];

const log = (...a) => console.log('[probe]', ...a);

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: launchArgs });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('console', (m) => {
    if (m.type() === 'error') log('page error:', m.text());
  });
  page.on('pageerror', (e) => log('page error:', e.message));
  await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: "import '/@vite/env';" }));

  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });
  const err = await page.evaluate(() => window.__ERROR__ || null);
  if (err) {
    console.error('[probe] app failed to boot:\n' + err);
    await browser.close();
    process.exit(1);
  }
  log(`booted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const names = only ? only.split(',') : Object.keys(SHOTS);
  const hidden = await page.evaluate(
    ({ debug, hide, off }) => {
      const api = window.debugAPI;
      api.setView('hero');
      const { terrain, scene } = api.objects;
      if (terrain.material?.uniforms?.uDebug) terrain.material.uniforms.uDebug.value = debug;
      for (const p of off ? off.split(',') : []) api.toggle(p, false);
      const names = hide ? hide.split(',') : [];
      const done = [];
      scene.traverse((o) => {
        if (names.includes(o.name)) {
          o.visible = false;
          done.push(o.name);
        }
      });
      api.renderFrames(1);
      return done;
    },
    { debug, hide, off },
  );
  if (hide) log('hidden:', hidden.join(', ') || '(none matched)');
  // the water sheet's live sky/fog inputs, as sent to the shader
  const waterU = await page.evaluate(() => {
    const u = window.debugAPI.objects.terrain.water?.material?.uniforms;
    if (!u) return null;
    const out = {};
    for (const k of ['uSkyLow', 'uSkyTop', 'uCardLow', 'uCardTop', 'uFog', 'uBody']) {
      const c = u[k]?.value;
      if (c) out[k] = [c.r, c.g, c.b].map((x) => +x.toFixed(4));
    }
    out.uFogDensity = u.uFogDensity?.value;
    // the reflection card: what the sheet samples at the elevations a standing
    // camera reflects (v = 0.03..0.1), as mean sRGB bytes per row band
    const tex = u.uCanopy?.value;
    const img = tex?.image;
    if (img?.data && img.width) {
      const rows = (v0, v1) => {
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let y = Math.floor(v0 * img.height); y < Math.floor(v1 * img.height); y++) {
          for (let x = 0; x < img.width; x++) {
            const i = (y * img.width + x) * 4;
            r += img.data[i];
            g += img.data[i + 1];
            b += img.data[i + 2];
            n++;
          }
        }
        return [r / n, g / n, b / n].map((x) => Math.round(x));
      };
      out.card = {
        size: [img.width, img.height],
        colorSpace: tex.colorSpace,
        flipY: tex.flipY,
        v00_03: rows(0.0, 0.03),
        v03_06: rows(0.03, 0.06),
        v06_10: rows(0.06, 0.1),
        v10_20: rows(0.1, 0.2),
        v80_100: rows(0.8, 1.0),
      };
    } else out.card = { type: tex?.constructor?.name, image: img ? Object.keys(img) : null };
    out.holeRadius = window.debugAPI.objects.terrain.water.userData.holeRadius;
    return out;
  });
  log('water uniforms:', JSON.stringify(waterU));

  for (const name of names) {
    const shot = SHOTS[name];
    if (!shot) {
      log(`unknown shot "${name}"`);
      continue;
    }
    const ts = Date.now();
    const dataUrl = await page.evaluate(
      ({ shot }) => {
        const api = window.debugAPI;
        const { camera, terrain, skyRig } = api.objects;
        const h = terrain.waterHole;
        const o = shot.abs ? { x: 0, y: 0, z: 0 } : h;
        camera.position.set(o.x + shot.pos[0], o.y + shot.pos[1], o.z + shot.pos[2]);
        camera.fov = shot.fov;
        camera.updateProjectionMatrix();
        camera.lookAt(o.x + shot.look[0], o.y + shot.look[1], o.z + shot.look[2]);
        camera.updateMatrixWorld(true);
        skyRig.follow(camera.position);
        return api.captureFrame(2);
      },
      { shot },
    );
    const file = path.join(outDir, `${name}.png`);
    await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    log(`${name} -> ${file} (${((Date.now() - ts) / 1000).toFixed(1)}s)`);
  }
  await browser.close();
  log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
