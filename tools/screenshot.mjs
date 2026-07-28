#!/usr/bin/env node
/**
 * Headless visual-QA harness.
 *
 * Boots the built game in Chrome with SwiftShader (no GPU in CI), drives it
 * through a scripted sequence of camera poses / gameplay states, and writes
 * PNGs plus a console-error log for the review agents to inspect.
 *
 * Usage:
 *   node tools/screenshot.mjs                       # default shot list
 *   node tools/screenshot.mjs --out shots/run3      # custom output dir
 *   node tools/screenshot.mjs --only sky,weapon     # subset of shots
 *   node tools/screenshot.mjs --width 1600 --height 900
 *   node tools/screenshot.mjs --settle 6000         # ms to let the frame converge
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
    return process.argv[i + 1];
  }
  return fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const OUT = path.resolve(ROOT, arg('out', 'shots/latest'));
const WIDTH = parseInt(arg('width', '1600'), 10);
const HEIGHT = parseInt(arg('height', '900'), 10);
const SETTLE = parseInt(arg('settle', '9000'), 10);
const QUALITY = arg('quality', 'high');
const ONLY = arg('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const PORT = parseInt(arg('port', '4173'), 10);
const DIST = arg('dist', 'dist');

/**
 * Each shot names a scripted camera/gameplay state. The game exposes
 * `window.__SHOT__(name)` which returns a promise resolving once the state is
 * set up and the renderer has converged (TAA history flushed, particles warm).
 */
/**
 * Fallback list used only when the page does not expose `__SHOT_LIST__`.
 * Normally the shot list comes from the game itself, so the two can never drift.
 */
const FALLBACK_SHOTS = [
  { name: '01_spawn_overview', description: 'live frame' },
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

  // A previous aborted run can leave the port held; take it back.
  try {
    const { execSync } = await import('node:child_process');
    execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 500));
  } catch {
    /* fuser unavailable; strictPort will surface the conflict */
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

  // Playwright's page.screenshot() waits for the page to look visually stable,
  // which never happens under software rendering at ~1fps. Raw CDP capture takes
  // the frame as-is.
  const cdp = await page.context().newCDPSession(page);
  const capture = async (file) => {
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
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`));

  const extra = arg('flags', '');
  const url = `${baseUrl}?quality=${QUALITY}&capture=1${extra ? `&${extra}` : ''}`;
  console.log(`Loading ${url}`);
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });

  // Wait for the engine to report ready.
  try {
    await page.waitForFunction(() => window.GAME_READY === true, { timeout: 900000 });
  } catch {
    logs.push('[harness] GAME_READY never became true');
    const bootErr = await page
      .locator('#boot-error')
      .textContent()
      .catch(() => null);
    if (bootErr) logs.push(`[boot-error] ${bootErr}`);
    await capture(path.join(OUT, '00_boot_failure.png'));
    await writeFile(path.join(OUT, 'console.log'), logs.join('\n'), 'utf8');
    await browser.close();
    killServer();
    process.exit(1);
  }

  console.log('Engine ready — letting the first frames converge...');
  await page.waitForTimeout(SETTLE);

  const hasShotApi = await page.evaluate(() => typeof window.__SHOT__ === 'function');
  const declared = hasShotApi
    ? await page.evaluate(() => window.__SHOT_LIST__?.() ?? [])
    : [];
  const all = declared.length ? declared : FALLBACK_SHOTS;
  const list = ONLY.length ? all.filter((s) => ONLY.some((o) => s.name.includes(o))) : all;
  console.log(`${list.length} shot(s) to capture${hasShotApi ? '' : ' (no shot API — single live frame)'}`);

  const manifest = [];
  for (const shot of list) {
    let ok = true;
    if (hasShotApi) {
      try {
        await page.evaluate((n) => window.__SHOT__(n), shot.name);
      } catch (err) {
        logs.push(`[harness] __SHOT__("${shot.name}") threw: ${err}`);
        ok = false;
      }
      // __SHOT__ already froze the frame after converging, so this is only slack
      // for the compositor to present it.
      await page.waitForTimeout(600);
    } else {
      // No shot API yet — just grab the live frame a few times.
      await page.waitForTimeout(1200);
    }
    const file = path.join(OUT, `${shot.name}.png`);
    await capture(file);
    manifest.push({ ...shot, file: path.relative(ROOT, file), ok });
    console.log(`  captured ${shot.name}${ok ? '' : ' (state setup failed)'}`);
    if (!hasShotApi) break;
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
    path.join(OUT, 'manifest.json'),
    JSON.stringify({ width: WIDTH, height: HEIGHT, quality: QUALITY, perf, shots: manifest }, null, 2),
    'utf8',
  );
  await writeFile(path.join(OUT, 'console.log'), logs.join('\n') || '(clean)', 'utf8');

  console.log(`\nPerf: ${JSON.stringify(perf)}`);
  console.log(`Console issues: ${logs.length}`);
  console.log(`Output: ${OUT}`);

  await browser.close();
  killServer();

  if (logs.filter((l) => l.startsWith('[pageerror]')).length) process.exit(3);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
