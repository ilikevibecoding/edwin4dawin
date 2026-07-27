#!/usr/bin/env node
/**
 * FX visual-QA harness.
 *
 * The shared harness in tools/ takes one frame of the live game, which is not
 * enough to judge an effect: particles are a time sequence, and the interesting
 * moments are milliseconds apart. This drives the same built bundle with
 * `?fxdemo=1` and grabs a burst of frames across the demo loop, plus the FX
 * system's own counters at each one.
 *
 * Usage:
 *   node src/fx/dev/fxshot.mjs --dist dist-fx --out shots/fx --quality medium
 *   node src/fx/dev/fxshot.mjs --frames 14 --interval 700 --settle 16000
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
    return process.argv[i + 1];
  }
  return fallback;
}

const OUT = path.resolve(ROOT, arg('out', 'shots/fx'));
// 1280x720 rather than full HD: the capture runs on a software rasteriser
// sharing four cores, and fill rate is what decides whether a frame arrives
// before the screenshot times out. Detail comes from cropping, not resolution.
const WIDTH = parseInt(arg('width', '1280'), 10);
const HEIGHT = parseInt(arg('height', '720'), 10);
const SETTLE = parseInt(arg('settle', '14000'), 10);
const QUALITY = arg('quality', 'medium');
const PORT = parseInt(arg('port', '4197'), 10);
const DIST = arg('dist', 'dist-fx');
const FRAMES = parseInt(arg('frames', '12'), 10);
const INTERVAL = parseInt(arg('interval', '750'), 10);
const ATLAS = process.argv.includes('--atlas');
const ONLY = arg('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Scenarios driven through `window.__FXSHOT__`, with how long to let the effect
 * develop before grabbing the frame. Without the API the run falls back to
 * sampling the demo's own loop.
 */
const SCENARIOS = [
  { name: 'atlas', scenario: 'idle', wait: 200 },
  { name: 'gunfire', scenario: 'gunfire', wait: 300 },
  { name: 'suppressed', scenario: 'suppressed', wait: 300 },
  { name: 'flash', scenario: 'flash', wait: 260 },
  { name: 'tracers', scenario: 'tracers', wait: 300 },
  { name: 'impact_concrete', scenario: 'concrete', wait: 500 },
  { name: 'impact_metal', scenario: 'metal', wait: 400 },
  { name: 'impact_glass', scenario: 'glass', wait: 400 },
  { name: 'impact_wood', scenario: 'wood', wait: 400 },
  { name: 'impact_dirt', scenario: 'dirt', wait: 500 },
  { name: 'blood', scenario: 'blood', wait: 500 },
  { name: 'decalboard', scenario: 'decals', wait: 400 },
  { name: 'debris', scenario: 'debris', wait: 700 },
  { name: 'grenade_flash', scenario: 'grenade', wait: 40 },
  { name: 'grenade_fireball', scenario: 'grenade', wait: 350 },
  { name: 'grenade_smoke', scenario: 'grenade', wait: 1600 },
  { name: 'rocket_trail', scenario: 'rocket', wait: 700 },
  { name: 'airstrike_flash', scenario: 'airstrike', wait: 55 },
  { name: 'airstrike_fireball', scenario: 'airstrike', wait: 500 },
  { name: 'airstrike_column', scenario: 'airstrike', wait: 2500 },
  { name: 'smoke_cloud', scenario: 'smoke', wait: 2500 },
  { name: 'fire', scenario: 'fire', wait: 1500 },
];

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
    const { execSync } = await import('node:child_process');
    execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 500));
  } catch {
    /* fuser unavailable; strictPort will surface the conflict */
  }

  const server = spawn(
    'npx',
    [
      'vite',
      'preview',
      '--port',
      String(PORT),
      '--strictPort',
      '--host',
      '127.0.0.1',
      '--outDir',
      DIST,
    ],
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
  // A software rasteriser under a heavy particle load can take many seconds to
  // present a frame, and a screenshot has to wait for one.
  page.setDefaultTimeout(180000);

  const logs = [];
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') logs.push(`[${t}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`));

  // The atlas quads are pinned in the viewmodel scene, so they would sit on top
  // of every other shot; they only go up when explicitly asked for.
  const url = `${baseUrl}?quality=${QUALITY}&capture=1&fxdemo=1${ATLAS ? '&fxatlas=1' : ''}`;
  console.log(`Loading ${url}`);
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });

  try {
    await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
  } catch {
    logs.push('[harness] GAME_READY never became true');
    const bootErr = await page
      .locator('#boot-error')
      .textContent()
      .catch(() => null);
    if (bootErr) logs.push(`[boot-error] ${bootErr}`);
    await page.screenshot({ path: path.join(OUT, '00_boot_failure.png') });
    await writeFile(path.join(OUT, 'console.log'), logs.join('\n'), 'utf8');
    await browser.close();
    killServer();
    process.exit(1);
  }

  console.log('Engine ready — settling...');
  await page.waitForTimeout(SETTLE);

  const sample = () =>
    page
      .evaluate(() => {
        const g = window.GAME;
        const fx = typeof window.__FX__ === 'function' ? window.__FX__() : null;
        const diag = typeof window.__FXDIAG__ === 'function' ? window.__FXDIAG__() : null;
        return {
          fps: Math.round((g?.time?.fps ?? 0) * 10) / 10,
          frameMs: Math.round((1000 / Math.max(1, g?.time?.fps ?? 1)) * 10) / 10,
          drawCalls: g?.renderer?.info?.render?.calls ?? 0,
          triangles: g?.renderer?.info?.render?.triangles ?? 0,
          programs: g?.renderer?.info?.programs?.length ?? 0,
          quality: g?.config?.tier ?? '?',
          fx,
          diag,
        };
      })
      .catch(() => null);

  const driven = await page.evaluate(() => typeof window.__FXSHOT__ === 'function');
  const frames = [];

  const grab = async (name, stats) => {
    const file = `${name}.png`;
    console.log(`  ${file} ${JSON.stringify(stats)}`);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await page.screenshot({ path: path.join(OUT, file), timeout: 120000 });
        frames.push({ name: file, stats });
        return;
      } catch (err) {
        logs.push(`[harness] screenshot ${file} attempt ${attempt + 1} failed: ${err}`);
      }
    }
    console.log(`  ${file} FAILED`);
  };

  if (driven) {
    const list = ONLY.length ? SCENARIOS.filter((s) => ONLY.some((o) => s.name.includes(o))) : SCENARIOS;
    for (const shot of list) {
      try {
        await page.evaluate((n) => window.__FXSHOT__(n), shot.scenario);
      } catch (err) {
        logs.push(`[harness] __FXSHOT__("${shot.scenario}") threw: ${err}`);
      }
      await page.waitForTimeout(shot.wait);
      await grab(shot.name, await sample());
    }
  } else {
    logs.push('[harness] __FXSHOT__ missing — sampling the demo loop instead');
    for (let i = 0; i < FRAMES; i++) {
      await grab(`fx_${String(i).padStart(2, '0')}`, await sample());
      if (i < FRAMES - 1) await page.waitForTimeout(INTERVAL);
    }
  }

  await writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify({ width: WIDTH, height: HEIGHT, quality: QUALITY, frames }, null, 2),
    'utf8',
  );
  await writeFile(path.join(OUT, 'console.log'), logs.join('\n') || '(clean)', 'utf8');

  console.log(`\nConsole issues: ${logs.length}`);
  console.log(`Output: ${OUT}`);

  await browser.close();
  killServer();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
