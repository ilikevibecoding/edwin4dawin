#!/usr/bin/env node
/**
 * Deterministic benchmark capture.
 *
 *   node bench/scripts/capture.mjs --tag iter01 [--views aerial-a,bridge-low] [--url http://127.0.0.1:4173/]
 *                                  [--no-clip] [--clip-frames 60] [--still-quality high] [--clip-quality medium]
 *
 * For every view: stationary still (1920x1080, HUD on), in-flight still (after 3 s of fixed-step flight),
 * a clip (PNG sequence -> mp4 at 10 fps, 6 s), metrics JSON (renderer counters, frame times, memory,
 * telemetry, projected landmarks) and the browser console. Everything is driven through window.__bench
 * with a fixed timestep so captures are reproducible.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes(`--${name}`);
const tag = opt('tag', `run-${Date.now()}`);
const baseUrl = opt('url', 'http://127.0.0.1:4173/');
// views are comma-separated; when any entry is an ad-hoc `label@dev&cam=x,y,z...` view the list is ';'-separated
const viewsRaw = opt('views', 'aerial-a,cockpit-city,bridge-low,skyline-high,island-pass,harbor,water-landing,sunset,cloudy,night');
const views = viewsRaw.includes('@') ? viewsRaw.split(';') : viewsRaw.split(',');
const clipFrames = Number(opt('clip-frames', '60'));
const stillQuality = opt('still-quality', 'high');
// clips at 'low' had no MSAA (QUALITY.low.samples = 0) while stills had 4x, so every clip carried edge crawl the
// game does not show at the default quality; 'medium' (2x MSAA, 3 cascades) is the lowest level with AA
const clipQuality = opt('clip-quality', 'medium');
const seed = opt('seed', '20260904');
const doClip = !flag('no-clip');
const doFlight = !flag('no-flight');
const outRoot = path.resolve('bench/out', tag);
fs.mkdirSync(outRoot, { recursive: true });

const browser = await puppeteer.launch({
  // the machine-wide Chrome slot gate can hold a launch for minutes; never time out on it
  timeout: 1800000,
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1920,1080', '--hide-scrollbars', '--enable-precise-memory-info'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  protocolTimeout: 1800000,
  // the machine-wide Chrome gate (/usr/local/bin/google-chrome) blocks the launch until a slot is free
  timeout: 0,
});

async function openView(view, w, h, quality) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => { const t = m.text(); if (!t.includes('[vite]')) logs.push(`[${m.type()}] ${t}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  // `label@dev&cam=...&plane=...` = an ad-hoc view (views.ts devView) captured under `label`
  const query = view.includes('@') ? view.slice(view.indexOf('@') + 1) : view;
  const url = `${baseUrl}?bench=${query}&w=${w}&h=${h}&quality=${quality}&seed=${seed}&freeze=1`;
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__benchReady === true', { timeout: 1500000, polling: 250 });
  return { page, logs, setupMs: Date.now() - t0, url };
}

async function renderTimed(page, steps = 0) {
  return page.evaluate((n) => {
    const t0 = performance.now();
    if (n > 0) window.__bench.step(n); else window.__bench.render();
    return performance.now() - t0;
  }, steps);
}

const summary = { tag, build: null, seed, startedAt: new Date().toISOString(), views: {} };

for (const viewSpec of views) {
  const view = viewSpec.includes('@') ? viewSpec.slice(0, viewSpec.indexOf('@')) : viewSpec;
  const dir = path.join(outRoot, view);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`\n=== ${view}`);
  const result = { view };
  // ---- stills at full quality
  {
    const { page, logs, setupMs, url } = await openView(viewSpec, 1920, 1080, stillQuality);
    result.stillUrl = url;
    result.setupMs = setupMs;
    // warm-up render (shader compilation) then the measured still
    const warm = await renderTimed(page);
    const t1 = await renderTimed(page);
    await page.screenshot({ path: path.join(dir, 'still.png'), type: 'png' });
    const metrics = await page.evaluate(() => window.__bench.metrics());
    const landmarks = await page.evaluate(() => window.__bench.landmarks());
    result.still = { warmupRenderMs: warm, renderMs: t1, metrics, landmarks };
    summary.build = metrics.build;
    // synchronous frame-time profile (software rasterizer on this VM; a true GPU frame time on real hardware)
    const prof = await page.evaluate(() => window.__bench.profile(8));
    result.profile = prof;
    if (doFlight) {
      const tf = await renderTimed(page, 90); // 3 s of flight at 30 Hz
      await page.screenshot({ path: path.join(dir, 'flight.png'), type: 'png' });
      const m2 = await page.evaluate(() => window.__bench.metrics());
      const lm2 = await page.evaluate(() => window.__bench.landmarks());
      result.flight = { stepAndRenderMs: tf, metrics: m2, landmarks: lm2 };
    }
    fs.writeFileSync(path.join(dir, 'console.txt'), logs.join('\n'));
    result.consoleErrors = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]')).length;
    await page.close();
    console.log(`still: setup ${setupMs} ms, sync frame ${prof.avgMs.toFixed(0)} ms (sw), calls ${metrics.calls}, tris ${metrics.triangles}, heap ${metrics.jsHeapMB?.toFixed(0)} MB`);
  }
  // ---- clip at clip quality (fixed 30 Hz simulation, 3 sim frames per captured frame => 10 fps video)
  if (doClip) {
    const { page } = await openView(viewSpec, 1280, 720, clipQuality);
    const clipDir = path.join(dir, 'clip');
    fs.mkdirSync(clipDir, { recursive: true });
    const frameTimes = [];
    const heap = [];
    await renderTimed(page);
    for (let i = 0; i < clipFrames; i++) {
      const ms = await renderTimed(page, 3);
      frameTimes.push(ms);
      await page.screenshot({ path: path.join(clipDir, `f${String(i).padStart(3, '0')}.png`), type: 'png' });
      if (i % 10 === 0) heap.push(await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null));
    }
    const m = await page.evaluate(() => window.__bench.metrics());
    result.clip = { frames: clipFrames, frameTimesMs: frameTimes, heapMB: heap, metrics: m };
    try {
      execSync(`ffmpeg -y -loglevel error -framerate 10 -i ${clipDir}/f%03d.png -c:v libx264 -pix_fmt yuv420p -crf 20 ${dir}/clip.mp4`);
    } catch (e) { console.error('ffmpeg failed', e.message); }
    await page.close();
    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    console.log(`clip: ${clipFrames} frames, avg step+render ${avg.toFixed(0)} ms (SwiftShader)`);
  }
  summary.views[view] = result;
  fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify(result, null, 2));
}
summary.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(outRoot, 'summary.json'), JSON.stringify(summary, null, 2));
await browser.close();
console.log(`\nwrote ${outRoot}`);
