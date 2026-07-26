#!/usr/bin/env node
/** Boots the game headlessly and reports pipeline stage statistics. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const PORT = 4188;

const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root, stdio: 'ignore', detached: true,
});
await new Promise((r) => setTimeout(r, 2500));

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader',
         '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('console', (m) => console.log(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

await page.goto(`http://127.0.0.1:${PORT}/?shot=1&q=medium&warmup=6`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__SHOT_READY__ === true || window.__BOOT_ERROR__, { timeout: 300000, polling: 400 });

await page.evaluate(() => window.__SHOT_RUN__('street'));

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

await browser.close();
try { process.kill(-server.pid); } catch {}
process.exit(0);
