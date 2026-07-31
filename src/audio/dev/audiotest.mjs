#!/usr/bin/env node
/**
 * Headless audio QA harness.
 *
 * Boots the built game in Chrome with `?audiotest=1`, waits for the engine, then
 * calls `window.__AUDIO_TEST__()` and captures everything it logs. Audio cannot
 * be reviewed from a screenshot, so this is how the module is actually checked:
 * every designed sound is rendered and measured, a heavy combat scene is pushed
 * through the real mixer graph offline, and the voice pool is hammered and then
 * inspected for leaks.
 *
 * Chrome is launched with the autoplay policy relaxed, because the leak test
 * needs a running `AudioContext` clock and there is no user to click anything.
 *
 * Usage:
 *   npx vite build --outDir dist-audio
 *   node src/audio/dev/audiotest.mjs --dist dist-audio --out shots/audio
 *   node src/audio/dev/audiotest.mjs --filter gun_    # one family only
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
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

const DIST = arg('dist', 'dist-audio');
const OUT = path.resolve(ROOT, arg('out', 'shots/audio'));
const PORT = parseInt(arg('port', '4199'), 10);
const FILTER = arg('filter', '');
const QUALITY = arg('quality', 'low');
const TIMEOUT = parseInt(arg('timeout', '300000'), 10);

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
  await mkdir(OUT, { recursive: true });

  try {
    const { execSync } = await import('node:child_process');
    execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 400));
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
      // The whole point: the AudioContext must actually run without a gesture.
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio',
      '--js-flags=--max-old-space-size=4096',
    ],
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const lines = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.startsWith('[audiotest]')) lines.push(text.slice(12));
    else if (msg.type() === 'error' || msg.type() === 'warning') {
      lines.push(`[${msg.type()}] ${text}`);
    }
  });
  page.on('pageerror', (err) => lines.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`));

  const url = `${baseUrl}?audiotest=1&quality=${QUALITY}&nodemo=1`;
  console.log(`Loading ${url}`);
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });

  try {
    await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
  } catch {
    lines.push('[harness] GAME_READY never became true');
    const bootErr = await page
      .locator('#boot-error')
      .textContent()
      .catch(() => null);
    if (bootErr) lines.push(`[boot-error] ${bootErr}`);
  }

  await page.waitForFunction(() => typeof window.__AUDIO_TEST__ === 'function', {
    timeout: 60000,
  });

  // A user gesture as well as the launch flag: belt and braces, because a
  // suspended context makes the leak test meaningless rather than failing.
  await page.mouse.click(640, 360).catch(() => {});
  await page.waitForTimeout(500);

  console.log('Running __AUDIO_TEST__()...');
  const started = Date.now();
  const summary = await page.evaluate(
    async (filter) => {
      const report = await window.__AUDIO_TEST__(filter || undefined);
      return {
        ok: report.ok,
        soundCount: report.soundCount,
        bufferCount: report.bufferCount,
        synthesisMs: report.synthesisMs,
        totalSeconds: report.totalSeconds,
        megabytes: report.megabytes,
        failures: report.failures,
        warnings: report.warnings,
        spaces: report.spaces,
        scene: report.scene,
        leak: report.leak,
        occlusion: report.occlusion,
        unresolved: report.unresolved,
      };
    },
    FILTER,
    { timeout: TIMEOUT },
  );
  console.log(`Finished in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  const stats = await page.evaluate(() =>
    typeof window.__AUDIO_STATS__ === 'function' ? window.__AUDIO_STATS__() : null,
  );
  if (stats) lines.push(`live engine stats: ${JSON.stringify(stats)}`);

  await writeFile(path.join(OUT, 'audiotest.log'), lines.join('\n'), 'utf8');
  await writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  await browser.close();
  killServer();

  console.log(`\nWrote ${path.relative(ROOT, OUT)}/audiotest.log (${lines.length} lines)`);
  console.log(
    `sounds=${summary.soundCount} buffers=${summary.bufferCount} ` +
      `synth=${summary.synthesisMs}ms audio=${summary.totalSeconds}s ~${summary.megabytes}MB`,
  );
  if (summary.scene) {
    console.log(
      `scene: peak=${summary.scene.peak.toFixed(3)} rms=${summary.scene.rms.toFixed(4)} ` +
        `clipped=${summary.scene.clipped} peakVoices=${summary.scene.peakVoices} ` +
        `cost=${(summary.scene.realtimeFactor * 100).toFixed(2)}% of a core`,
    );
  }
  if (summary.occlusion) {
    const o = summary.occlusion;
    console.log(
      `occlusion: ${o.raycasts} casts peak=${o.peakPerFrame}/frame ` +
        `hits=${o.cacheHits} blocked=${o.blockedCutoffHz.toFixed(0)}Hz/${o.blockedLossDb.toFixed(1)}dB ` +
        `=> ${o.ok ? 'OK' : 'BAD'}`,
    );
  }
  if (summary.leak) {
    console.log(
      `leak: peakLive=${summary.leak.peakLive} idleAfter=${summary.leak.idleAfter}/${summary.leak.capacity} ` +
        `held=${summary.leak.stuck.length} accounted=${summary.leak.accounted} ` +
        `=> ${summary.leak.ok ? 'CLEAN' : 'LEAK'}`,
    );
  }
  console.log(`warnings=${summary.warnings.length} failures=${summary.failures.length}`);
  for (const f of summary.failures.slice(0, 40)) console.log(`  FAIL ${f}`);
  process.exit(summary.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
