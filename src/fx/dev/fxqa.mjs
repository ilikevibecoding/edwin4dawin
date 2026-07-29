#!/usr/bin/env node
/**
 * The main visual-QA shot list, driven with a boot timeout that survives a busy
 * machine, plus per-shot effect counters.
 *
 * `tools/screenshot.mjs` gives the engine 15 minutes to report ready, which is
 * ample on an idle box and not ample at all when the software rasteriser is
 * sharing four cores with other work: the high tier needs about four minutes of
 * uncontended boot, and at a load average of ten it does not finish in fifteen.
 * That run dies having photographed a perfectly healthy game one frame after it
 * came up. This waits as long as it takes and prints the boot bar while it does,
 * so a stall is distinguishable from a queue.
 *
 * It also samples `__FX__`/`__FXDIAG__` at each shot, which is the only way to
 * tell an effect that never spawned from one that spawned and was then hidden.
 *
 * Usage:
 *   node src/fx/dev/fxqa.mjs --dist dist-fx --out shots/fx1 --port 4205 \
 *     --quality high --width 1600 --height 900 --only explosion,combat
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

const OUT = path.resolve(ROOT, arg('out', 'shots/fxqa'));
const WIDTH = parseInt(arg('width', '1600'), 10);
const HEIGHT = parseInt(arg('height', '900'), 10);
const SETTLE = parseInt(arg('settle', '20000'), 10);
const QUALITY = arg('quality', 'high');
const PORT = parseInt(arg('port', '4205'), 10);
const DIST = arg('dist', 'dist-fx');
const READY_MS = parseInt(arg('ready', '3600000'), 10);
const ONLY = arg('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

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

/**
 * Poll for ready from the driver rather than through `waitForFunction`, so the
 * wait is bounded by wall clock instead of by the page's animation frames and
 * every poll can report where the boot got to.
 */
async function waitForReady(page, timeoutMs) {
  const start = Date.now();
  let last = '';
  while (Date.now() - start < timeoutMs) {
    const state = await page
      .evaluate(() => ({
        ready: window.GAME_READY === true,
        status: document.getElementById('boot-status')?.textContent ?? '',
        bar: document.getElementById('boot-bar-fill')?.style.width ?? '',
        error: document.getElementById('boot-error')?.textContent ?? '',
      }))
      .catch(() => null);
    if (!state) return { ok: false, why: 'page went away' };
    if (state.ready) return { ok: true, seconds: Math.round((Date.now() - start) / 1000) };
    if (state.error) return { ok: false, why: `boot error: ${state.error}` };
    const line = `${state.status} ${state.bar}`;
    if (line !== last) {
      last = line;
      console.log(`  [${String(Math.round((Date.now() - start) / 1000)).padStart(4)}s] ${line}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return { ok: false, why: `not ready after ${Math.round(timeoutMs / 1000)}s` };
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
  page.setDefaultTimeout(600000);

  // Playwright's own screenshot waits for the page to look visually stable,
  // which never happens under software rendering at about a frame a second.
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

  const url = `${baseUrl}?quality=${QUALITY}&capture=1&fxstats=1`;
  console.log(`Loading ${url}`);
  await page.goto(url, { waitUntil: 'load', timeout: 300000 });

  const ready = await waitForReady(page, READY_MS);
  if (!ready.ok) {
    logs.push(`[harness] ${ready.why}`);
    await capture(path.join(OUT, '00_boot_failure.png'));
    await writeFile(path.join(OUT, 'console.log'), logs.join('\n'), 'utf8');
    await browser.close();
    killServer();
    process.exit(1);
  }
  console.log(`Engine ready in ${ready.seconds}s — settling...`);
  await page.waitForTimeout(SETTLE);

  const all = await page.evaluate(() => window.__SHOT_LIST__?.() ?? []);
  const list = ONLY.length ? all.filter((s) => ONLY.some((o) => s.name.includes(o))) : all;
  console.log(`${list.length} shot(s) to capture`);

  const manifest = [];
  for (const shot of list) {
    const t0 = Date.now();
    let ok = true;
    try {
      await page.evaluate((n) => window.__SHOT__(n), shot.name);
    } catch (err) {
      logs.push(`[harness] __SHOT__("${shot.name}") threw: ${err}`);
      ok = false;
    }
    // __SHOT__ freezes the frame after converging, so this is only slack for the
    // compositor to present it.
    await page.waitForTimeout(1500);
    const file = path.join(OUT, `${shot.name}.png`);
    await capture(file);
    const probe = await page
      .evaluate(() => {
        const info = window.GAME?.renderer?.info;
        return {
          fx: window.__FX__?.() ?? null,
          diag: window.__FXDIAG__?.() ?? null,
          draws: info?.render?.calls ?? 0,
          triangles: info?.render?.triangles ?? 0,
        };
      })
      .catch(() => null);
    manifest.push({ ...shot, file: path.relative(ROOT, file), ok, probe });
    const fx = probe?.fx;
    console.log(
      `  ${shot.name}  ${Math.round((Date.now() - t0) / 1000)}s  draws=${probe?.draws} ` +
        `tris=${probe?.triangles} particles=${fx?.particles}/${fx?.particleCapacity} ` +
        `fxdraws=${fx?.drawCalls} decals=${fx?.decals}${ok ? '' : '  SETUP FAILED'}`,
    );
    if (probe?.diag?.groups) {
      const live = Object.entries(probe.diag.groups)
        .map(([k, n]) => `${k}=${n}`)
        .join(' ');
      if (live) console.log(`    ${live}`);
    }
  }

  await writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify({ width: WIDTH, height: HEIGHT, quality: QUALITY, shots: manifest }, null, 2),
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
