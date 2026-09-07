#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Performance run: boot, drive the route, report.
//
//   node tools/perfrun.mjs --url http://127.0.0.1:5185/?quality=high --seconds 30
//   node tools/perfrun.mjs --gpu ...        use the machine's real GPU, not SwiftShader
//   node tools/perfrun.mjs --loops 6 ...    repeat a reset cycle and watch the JS heap
//
// Numbers come from the app's own frame loop (window.debugAPI.perf), which is
// the only place they mean anything. Everything is reported as measured; a
// value the browser could not provide is printed as n/a rather than estimated.
//
// Under the software rasteriser this box has, fps and frame time describe the
// rasteriser, not the game — they are here so the tool is proven to work, and
// so the structural numbers (draw calls, triangles, visible objects, textures,
// heap, boot stages) are real. Run with --gpu on a machine with a graphics card
// for the numbers the targets are about.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5185/?quality=high');
const seconds = Number(arg('seconds', '30'));
const loops = Number(arg('loops', '0'));
const outDir = arg('out', 'perf');
const label = arg('label', '');
const useGpu = argv.includes('--gpu');

const swArgs = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-precise-memory-info', ...(useGpu ? ['--use-gl=angle', '--ignore-gpu-blocklist'] : swArgs)],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: "import '/@vite/env';" }));

const tNav = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
const bootWall = Date.now() - tNav;
const info = await page.evaluate(() => ({
  build: window.debugAPI.build,
  readyMs: window.debugAPI.perf.readyMs(),
  boot: window.debugAPI.perf.boot,
  gpuTimer: window.debugAPI.perf.gpuTimer,
  quality: window.debugAPI.stats().quality,
  renderer: window.debugAPI.objects.renderer.getContext().getParameter(0x1f01),
  // the collision world is built between "Posting the signs" and "Compiling
  // shaders" without a boot step of its own; its cost lives on the debug API
  collision: window.debugAPI.collision?.stats?.boot ?? null,
  colliders: window.debugAPI.collision?.colliders?.().length ?? null,
}));

const fmt = (v, unit = '') => (v === null || v === undefined ? 'n/a' : `${v}${unit}`);
console.log(`[perf] build ${info.build.rev} (${info.build.stamp})  quality=${info.quality}${label ? `  ${label}` : ''}`);
console.log(`[perf] renderer: ${info.renderer}`);
console.log(`[perf] time to first frame: ${info.readyMs} ms in-page, ${bootWall} ms wall`);
console.log('[perf] boot stages:');
for (const s of info.boot) console.log(`         ${String(s.ms).padStart(6)} ms  ${s.label}`);
if (info.collision) {
  const stages = Object.entries(info.collision.stages || {}).map(([k, v]) => `${k} ${v}`).join(', ');
  console.log(`         ${String(Math.round(info.collision.ms)).padStart(6)} ms  Building the collision world (${fmt(info.colliders)} colliders; ${stages})`);
}
console.log(`[perf] gpu timer query: ${info.gpuTimer ? 'available' : 'not available on this driver'}`);

// Drive the route from the start with auto-drive on, and sample the loop.
await page.evaluate(() => {
  const { driver } = window.debugAPI.objects;
  window.debugAPI.resume();
  driver.state.auto = true;
  driver.resetAuto(0.42);
  window.debugAPI.perf.start();
});
console.log(`[perf] sampling ${seconds}s of driving...`);
await page.waitForTimeout(seconds * 1000);
const drive = await page.evaluate(() => window.debugAPI.perf.stop());

console.log('\n  metric               value');
console.log('  -------------------  --------------------');
const rows = [
  ['frames sampled', drive.frames],
  ['fps (mean)', drive.fps],
  ['fps (1% low)', drive.fpsLow1],
  ['frame ms p50', drive.frameMs?.p50],
  ['frame ms p95', drive.frameMs?.p95],
  ['frame ms p99', drive.frameMs?.p99],
  ['frame ms max', drive.frameMs?.max],
  ['long frames >50ms', drive.longFrames],
  ['gpu ms (mean)', drive.gpuMs],
  ['draw calls', drive.calls],
  ['triangles', drive.triangles],
  ['shader programs', drive.programs],
  ['textures', drive.textures],
  ['geometries', drive.geometries],
  ['visible objects', drive.visibleObjects],
  ['visible instances', drive.visibleInstances],
  ['animated animals', drive.animals],
  ['js heap MB', drive.jsHeapMB],
];
for (const [k, v] of rows) console.log(`  ${k.padEnd(19)}  ${fmt(v)}`);

// Memory over repeated resets: the leak check.
let loopReport = null;
if (loops > 0) {
  console.log(`\n[perf] ${loops} reset loops for heap growth...`);
  const heaps = [];
  for (let i = 0; i < loops; i++) {
    const h = await page.evaluate(async () => {
      window.debugAPI.setView('hero');
      window.debugAPI.resume();
      const { driver } = window.debugAPI.objects;
      driver.resetAuto(0.42);
      await new Promise((r) => setTimeout(r, 2500));
      // eslint-disable-next-line no-undef
      if (globalThis.gc) globalThis.gc();
      return performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null;
    });
    heaps.push(h);
    console.log(`         loop ${i + 1}: heap ${fmt(h, ' MB')}`);
  }
  const valid = heaps.filter((h) => h !== null);
  if (valid.length >= 2) {
    const growth = valid[valid.length - 1] - valid[0];
    loopReport = { heaps, growthMB: +growth.toFixed(1) };
    console.log(`[perf] heap growth over ${valid.length} loops: ${growth >= 0 ? '+' : ''}${growth.toFixed(1)} MB`);
  }
}

if (errors.length) {
  console.log(`\n[perf] ${errors.length} console/page error(s):`);
  for (const e of errors.slice(0, 8)) console.log('  -', e.slice(0, 160));
} else {
  console.log('\n[perf] no console or page errors');
}

await mkdir(outDir, { recursive: true });
const file = path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${info.build.rev}.json`);
await writeFile(file, JSON.stringify({ label, url, info, bootWall, drive, loops: loopReport, errors }, null, 2));
console.log(`[perf] wrote ${file}`);
await browser.close();
