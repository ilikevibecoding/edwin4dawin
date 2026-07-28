#!/usr/bin/env node
/**
 * Look-development capture and measurement harness.
 *
 * `tools/screenshot.mjs` is the project's review harness and produces the PNGs
 * that get read by eye. This one exists alongside it for two things it cannot
 * do:
 *
 * - it waits long enough for the `high` and `ultra` tiers to boot under
 *   SwiftShader, where baking 1k material sets takes several minutes;
 * - it reports numbers. Every shot comes back with a 32x18 grid of mean sRGB
 *   plus global percentiles, so a lighting change can be compared as a
 *   measurement instead of an impression, and any intermediate buffer can be
 *   photographed in the same run through `RenderSystem.setDebugPass`.
 *
 * Usage:
 *   node src/procgen/dev/lookshot.mjs --dist dist-look --out shots/look1 \
 *     --port 4204 --quality high --only spawn,skyline --buffers ao,bloom
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
    return process.argv[i + 1];
  }
  return fallback;
}
const list = (name) =>
  arg(name, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const OUT = path.resolve(ROOT, arg('out', 'shots/look'));
const WIDTH = parseInt(arg('width', '1600'), 10);
const HEIGHT = parseInt(arg('height', '900'), 10);
const SETTLE = parseInt(arg('settle', '16000'), 10);
const QUALITY = arg('quality', 'high');
const PORT = parseInt(arg('port', '4204'), 10);
const DIST = arg('dist', 'dist-look');
const READY_TIMEOUT = parseInt(arg('ready', '900000'), 10);
const ONLY = list('only');
const BUFFERS = list('buffers');
const GRID_W = 32;
const GRID_H = 18;

/**
 * Statistics of the currently presented frame, computed inside the page.
 *
 * `renderOnce` and the readback have to happen in one task: the context is
 * created without `preserveDrawingBuffer`, so the drawing buffer is only
 * guaranteed intact until the task yields.
 */
function measureInPage({ gridW, gridH }) {
  const canvas = document.getElementById('game-canvas');
  window.GAME?.renderOnce();

  const w = canvas.width;
  const h = canvas.height;
  const scratch = document.createElement('canvas');
  scratch.width = w;
  scratch.height = h;
  const ctx = scratch.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;

  const grid = new Array(gridW * gridH * 3).fill(0);
  const counts = new Array(gridW * gridH).fill(0);
  const lumaHist = new Uint32Array(256);
  let satSum = 0;
  let lumaSum = 0;
  let n = 0;

  for (let y = 0; y < h; y++) {
    const gy = Math.min(gridH - 1, Math.floor((y * gridH) / h));
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gx = Math.min(gridW - 1, Math.floor((x * gridW) / w));
      const c = gy * gridW + gx;
      grid[c * 3] += r;
      grid[c * 3 + 1] += g;
      grid[c * 3 + 2] += b;
      counts[c]++;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lumaHist[Math.min(255, Math.round(luma))]++;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      satSum += mx > 0 ? (mx - mn) / mx : 0;
      lumaSum += luma;
      n++;
    }
  }

  for (let c = 0; c < counts.length; c++) {
    const k = Math.max(1, counts[c]);
    grid[c * 3] = Math.round(grid[c * 3] / k);
    grid[c * 3 + 1] = Math.round(grid[c * 3 + 1] / k);
    grid[c * 3 + 2] = Math.round(grid[c * 3 + 2] / k);
  }

  const pct = (p) => {
    let want = p * n;
    for (let i = 0; i < 256; i++) {
      want -= lumaHist[i];
      if (want <= 0) return i;
    }
    return 255;
  };

  return {
    width: w,
    height: h,
    meanLuma: +(lumaSum / n).toFixed(2),
    meanSaturation: +(satSum / n).toFixed(4),
    p01: pct(0.01),
    p05: pct(0.05),
    p50: pct(0.5),
    p95: pct(0.95),
    p99: pct(0.99),
    grid,
    gridW,
    gridH,
  };
}

async function measure(page, label) {
  try {
    return await page.evaluate(measureInPage, { gridW: GRID_W, gridH: GRID_H });
  } catch (err) {
    console.error(`  ${label}: measurement failed: ${err.message}`);
    return null;
  }
}

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function main() {
  if (!existsSync(path.join(ROOT, DIST, 'index.html'))) {
    console.error(`${DIST}/ not found — run \`npx vite build --outDir ${DIST}\` first.`);
    process.exit(2);
  }
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  try {
    execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 500));
  } catch {
    /* fuser unavailable */
  }

  const server = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1', '--outDir', DIST],
    { cwd: ROOT, stdio: 'pipe', detached: true },
  );
  server.stdout.on('data', () => {});
  server.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));
  const killServer = () => {
    try {
      process.kill(-server.pid, 'SIGKILL');
    } catch {
      server.kill('SIGKILL');
    }
  };
  process.on('exit', killServer);

  const baseUrl = `http://127.0.0.1:${PORT}/`;
  if (!(await waitForServer(baseUrl))) {
    killServer();
    throw new Error('preview server did not come up');
  }

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-frame-rate-limit',
      '--js-flags=--max-old-space-size=4096',
      `--window-size=${WIDTH},${HEIGHT}`,
    ],
  });
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  const cdp = await page.context().newCDPSession(page);
  const capture = async (file) => {
    // A posed shot is frozen, so nothing is repainting: unless a frame is drawn
    // now, the compositor hands back whatever it last presented, or nothing.
    await page.evaluate(() => window.GAME?.renderOnce());
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
      optimizeForSpeed: true,
    });
    await writeFile(file, Buffer.from(data, 'base64'));
  };

  const logs = [];
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') logs.push(`[${t}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

  const extra = arg('flags', '');
  const url = `${baseUrl}?quality=${QUALITY}&capture=1${extra ? `&${extra}` : ''}`;
  console.log(`Loading ${url}`);
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  try {
    await page.waitForFunction(() => window.GAME_READY === true, { timeout: READY_TIMEOUT });
  } catch {
    logs.push('[harness] GAME_READY never became true');
    await capture(path.join(OUT, '00_boot_failure.png'));
    await writeFile(path.join(OUT, 'console.log'), logs.join('\n'), 'utf8');
    await browser.close();
    killServer();
    process.exit(1);
  }
  console.log(`Ready after ${((Date.now() - t0) / 1000).toFixed(0)}s — settling ${SETTLE}ms`);
  await page.waitForTimeout(SETTLE);

  // Warm the compositor, and every debug pass that will be photographed. The
  // compositor's first response after load is the page rather than the canvas
  // layer, and a debug pass has to compile its blit the first time it is
  // selected; either way the first capture comes back a flat fill the colour of
  // the clear, which reads as a plausibly dark frame rather than as a failure.
  for (const name of ['none', ...BUFFERS]) {
    await page.evaluate((n) => window.GAME?.tryGet('render')?.setDebugPass?.(n), name);
    await page.waitForTimeout(400);
    await capture(path.join(OUT, 'warmup.png'));
  }
  await page.evaluate(() => window.GAME?.tryGet('render')?.setDebugPass?.('none'));
  await rm(path.join(OUT, 'warmup.png'), { force: true });

  const declared = await page.evaluate(() => window.__SHOT_LIST__?.() ?? []);
  const shots = ONLY.length
    ? declared.filter((s) => ONLY.some((o) => s.name.includes(o)))
    : declared;
  console.log(`${shots.length} shot(s)`);

  const results = [];
  for (const shot of shots) {
    let ok = true;
    try {
      await page.evaluate((n) => window.__SHOT__(n), shot.name);
    } catch (err) {
      logs.push(`[harness] __SHOT__("${shot.name}") threw: ${err}`);
      ok = false;
    }
    await page.waitForTimeout(600);

    // The PNG first: it is the artefact a broken metric must not be able to cost.
    await capture(path.join(OUT, `${shot.name}.png`));
    const stats = await measure(page, shot.name);
    const buffers = {};
    for (const name of BUFFERS) {
      await page.evaluate((n) => window.GAME?.tryGet('render')?.setDebugPass?.(n), name);
      await page.waitForTimeout(200);
      await capture(path.join(OUT, `${shot.name}.${name}.png`));
      buffers[name] = await measure(page, `${shot.name}.${name}`);
    }
    if (BUFFERS.length) {
      await page.evaluate(() => window.GAME?.tryGet('render')?.setDebugPass?.('none'));
      await page.waitForTimeout(200);
    }

    results.push({ name: shot.name, ok, stats, buffers });
    const b = Object.entries(buffers)
      .map(([k, v]) => ` ${k}=${v?.meanLuma ?? '?'}`)
      .join('');
    console.log(
      `  ${shot.name} luma=${stats?.meanLuma ?? '?'} sat=${stats?.meanSaturation ?? '?'} ` +
        `p05=${stats?.p05 ?? '?'} p50=${stats?.p50 ?? '?'} p95=${stats?.p95 ?? '?'}${b}`,
    );
  }

  const perf = await page
    .evaluate(() => {
      const g = window.GAME;
      if (!g) return null;
      return {
        fps: Math.round(g.time?.fps ?? 0),
        drawCalls: g.renderer?.info?.render?.calls ?? 0,
        triangles: g.renderer?.info?.render?.triangles ?? 0,
        programs: g.renderer?.info?.programs?.length ?? 0,
        geometries: g.renderer?.info?.memory?.geometries ?? 0,
        textures: g.renderer?.info?.memory?.textures ?? 0,
        quality: g.config?.tier ?? '?',
      };
    })
    .catch(() => null);

  await writeFile(
    path.join(OUT, 'measure.json'),
    JSON.stringify({ quality: QUALITY, width: WIDTH, height: HEIGHT, perf, results }, null, 1),
    'utf8',
  );
  await writeFile(path.join(OUT, 'console.log'), logs.join('\n') || '(clean)', 'utf8');
  console.log(`\nPerf: ${JSON.stringify(perf)}`);
  console.log(`Console issues: ${logs.length}\nOutput: ${OUT}`);

  await browser.close();
  killServer();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
