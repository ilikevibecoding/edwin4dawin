#!/usr/bin/env node
/**
 * Screenshot harness. Boots headless Chrome with software WebGL, loads the game
 * with a scene/shot override, waits for the renderer to settle, and writes a PNG.
 *
 *   node scripts/shoot.mjs --url "http://localhost:4173/?dev=portrait" --out shots/a.png
 *   node scripts/shoot.mjs --shots shots.json
 */
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
}
function flag(name) {
  return args.includes(`--${name}`);
}

const BASE = arg('base', 'http://localhost:4173/');
const OUT = arg('out', 'shots/shot.png');
const W = Number(arg('w', 1600));
const H = Number(arg('h', 900));
const WAIT = Number(arg('wait', 9000));
const SETTLE = Number(arg('settle', 2500));
const URL_OVERRIDE = arg('url', null);
const SHOTLIST = arg('list', null);

const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-frame-rate-limit',
      `--window-size=${W},${H}`,
      '--hide-scrollbars',
      '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--autoplay-policy=no-user-gesture-required',
      '--font-render-hinting=none',
    ],
    protocolTimeout: 300000,
  });

  const shots = SHOTLIST
    ? JSON.parse(await (await import('node:fs/promises')).readFile(SHOTLIST, 'utf8'))
    : [{ url: URL_OVERRIDE ?? BASE, out: OUT }];

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('console', (m) => {
    const t = m.text();
    if (/error|warn|WARN|THREE\./i.test(t)) console.log(`  [console] ${t.slice(0, 400)}`);
  });
  page.on('pageerror', (e) => console.log(`  [pageerror] ${String(e).slice(0, 600)}`));

  for (const shot of shots) {
    const url = shot.url.startsWith('http') ? shot.url : new URL(shot.url, BASE).href;
    console.log(`→ ${url}`);
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    // Wait for the engine to report a stable frame count.
    try {
      await page.waitForFunction('window.__engineReady === true', { timeout: WAIT });
    } catch {
      console.log('  (engineReady timeout — capturing anyway)');
    }
    if (shot.settle ?? SETTLE) await new Promise((r) => setTimeout(r, shot.settle ?? SETTLE));
    if (shot.eval) {
      try {
        await page.evaluate(shot.eval);
      } catch (e) {
        console.log(`  [eval error] ${String(e).slice(0, 300)}`);
      }
      await new Promise((r) => setTimeout(r, shot.postEvalWait ?? 1800));
    }
    const stats = await page.evaluate(() => {
      const e = window.__engine;
      if (!e) return null;
      return {
        frames: e.clock.frame,
        fps: Math.round(e.fps * 10) / 10,
        quality: e.qualityName,
        calls: e.renderer.info.render.calls,
        tris: e.renderer.info.render.triangles,
      };
    });
    const buf = await page.screenshot({ type: 'png', captureBeyondViewport: false });
    const out = resolve(shot.out);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, buf);
    console.log(
      `  saved ${out} (${((Date.now() - t0) / 1000).toFixed(1)}s)` +
        (stats ? ` frames=${stats.frames} fps=${stats.fps} q=${stats.quality} calls=${stats.calls} tris=${stats.tris}` : ''),
    );
    if (flag('keep-open')) await new Promise((r) => setTimeout(r, 3000));
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
