#!/usr/bin/env node
/**
 * Boots the game headlessly and reports pipeline stage statistics.
 *
 *   node tools/diagnose.mjs                          # street, default dist/
 *   node tools/diagnose.mjs interior --dist dist-img
 *   node tools/diagnose.mjs street --warmup 30
 *
 * `--dist` matters: `vite preview` serves `dist/` unless told otherwise, so
 * without it this reports on whatever build happens to be sitting there. A
 * stale bundle reads as a broken renderer — an unwritten AO target comes back
 * as near-zero visibility, which looks exactly like occlusion suppressing the
 * whole frame. The staleness check below refuses to let that pass silently.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    flags[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  } else {
    positional.push(argv[i]);
  }
}

const SCENARIO = positional[0] ?? 'street';
const DIST = String(flags.dist ?? 'dist');
const WARMUP = Number(flags.warmup ?? 24);
const QUALITY = String(flags.quality ?? 'medium');

/** Newest mtime under a directory tree, in ms. */
function newestMtime(dir, filter = () => true) {
  let newest = 0;
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (filter(p)) newest = Math.max(newest, statSync(p).mtimeMs);
    }
  };
  walk(dir);
  return newest;
}

const distDir = resolve(root, DIST);
if (!existsSync(distDir)) {
  console.error(`[diagnose] no build at ${DIST}/ — run: npx vite build --outDir ${DIST}`);
  process.exit(1);
}
const srcTime = newestMtime(resolve(root, 'src'), (p) => /\.(ts|glsl|json)$/.test(p));
const buildTime = newestMtime(distDir);
if (buildTime < srcTime) {
  const age = ((srcTime - buildTime) / 60000).toFixed(0);
  console.error(
    `[diagnose] ${DIST}/ is ${age} min older than src/ — rebuild before trusting these numbers:\n` +
    `           npx vite build --outDir ${DIST}`,
  );
  process.exit(1);
}

const freePort = () => new Promise((res, rej) => {
  const srv = createServer();
  srv.on('error', rej);
  srv.listen(0, '127.0.0.1', () => {
    const { port } = srv.address();
    srv.close(() => res(port));
  });
});
const PORT = Number(flags.port ?? (await freePort()));

const serverArgs = ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'];
if (DIST !== 'dist') serverArgs.push('--outDir', DIST);
const server = spawn('npx', serverArgs, { cwd: root, stdio: 'ignore', detached: true });
await new Promise((r) => setTimeout(r, 3000));

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader',
         '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('console', (m) => { if (m.type() === 'error') console.log(`[error] ${m.text()}`); });
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

await page.goto(`http://127.0.0.1:${PORT}/?shot=1&q=${QUALITY}&warmup=${WARMUP}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__SHOT_READY__ === true || window.__BOOT_ERROR__, { timeout: 300000, polling: 400 });

await page.evaluate((k) => window.__SHOT_RUN__(k), SCENARIO);

const report = await page.evaluate(() => {
  const e = window.__ENGINE__;
  const p = e.pipeline;
  const stages = ['normal', 'sceneA', 'sceneB', 'ao', 'volumetric', 'history', 'bloom0', 'ldr'];
  const out = {};
  for (const s of stages) out[s] = p.probe(s);

  // Canvas readback.
  const gl = e.renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const px = new Uint8Array(4 * 64 * 64);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.readPixels(Math.floor(w / 2) - 32, Math.floor(h / 2) - 32, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let r = 0, g = 0, b = 0, mx = 0;
  for (let i = 0; i < 64 * 64; i++) {
    r += px[i * 4]; g += px[i * 4 + 1]; b += px[i * 4 + 2];
    mx = Math.max(mx, px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
  }
  out.canvas = { r: r / 4096, g: g / 4096, b: b / 4096, max: mx, w, h };

  out.meta = {
    internalW: p.internalWidth,
    internalH: p.internalHeight,
    fadeToBlack: p.fadeToBlack,
    sunIntensity: p.sunIntensity,
    sunDir: p.sunDirection.toArray().map((v) => +v.toFixed(3)),
    drawCalls: e.renderer.info.render.calls,
    triangles: e.renderer.info.render.triangles,
    sceneChildren: e.scene.children.length,
    viewSceneChildren: e.viewScene.children.length,
    cameraPos: e.camera.position.toArray().map((v) => +v.toFixed(2)),
    cameraFov: e.camera.fov,
    envSet: !!e.scene.environment,
  };
  return out;
});

console.log(JSON.stringify(report, null, 2));

// The AO target packs four unrelated signals, so the raw means above are not
// self-describing. Spell them out, because "is AO alive?" is the question this
// tool gets pointed at most often.
const ao = report.ao;
if (ao) {
  const pct = (v) => `${(v * 100).toFixed(1)}%`;
  console.log(
    `\nAO target (r=horizon visibility, g=depth/far, b=contact visibility, a=sky visibility)\n` +
    `  mean occlusion   ${pct(1 - ao.r)}   (r mean ${ao.r.toFixed(3)}; 0% means AO is doing nothing)\n` +
    `  mean contact     ${pct(1 - ao.b)}   (b mean ${ao.b.toFixed(3)})\n` +
    `  darkest pixel    ${pct(1 - ao.pct[0])} occluded at the 5th percentile\n`,
  );
}

await browser.close();
try { process.kill(-server.pid); } catch { server.kill(); }
process.exit(0);
