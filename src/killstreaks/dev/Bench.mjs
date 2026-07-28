#!/usr/bin/env node
/**
 * Frame-rate probe for the capture harness.
 *
 * Headless software rendering is slow enough that the difference between "the
 * strike is broken" and "the strike has not been drawn yet" is minutes, so this
 * measures the real frame time before a capture run commits to a schedule.
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  return fallback;
}

const DIST = arg('dist', 'dist-ks');
const PORT = parseInt(arg('port', '4199'), 10);
const WIDTH = parseInt(arg('width', '1024'), 10);
const HEIGHT = parseInt(arg('height', '576'), 10);
const QUALITY = arg('quality', 'low');
const WINDOW = parseInt(arg('window', '30000'), 10);
const STRIKE = process.argv.includes('--strike');

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {
      /* not up */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function main() {
  try {
    execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
  } catch {
    /* ignore */
  }
  const server = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1', '--outDir', DIST],
    { cwd: ROOT, stdio: 'ignore', detached: true },
  );
  const killServer = () => {
    try {
      process.kill(-server.pid, 'SIGKILL');
    } catch {
      server.kill('SIGKILL');
    }
  };
  process.on('exit', killServer);
  const baseUrl = `http://127.0.0.1:${PORT}/`;
  if (!(await waitForServer(baseUrl))) throw new Error('preview did not start');

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--disable-frame-rate-limit',
      `--window-size=${WIDTH},${HEIGHT}`,
    ],
  });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  await page.goto(`${baseUrl}?quality=${QUALITY}&capture=1&killstreaktest=1`, { timeout: 120000 });
  await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
  // Match the capture harness: it holds the render scale fixed so the shots are
  // not soft, and that costs frame time worth knowing about.
  if (!process.argv.includes('--adaptive')) {
    await page.evaluate(() => window.GAME?.setAdaptiveResolution(false));
  }
  await page.waitForTimeout(6000);

  if (STRIKE) {
    await page.evaluate(() => window.__STRIKE__('carpet'));
  } else {
    await page.evaluate(() => window.__KS_VIEW__?.());
  }
  // A frame that is mostly sky costs several times one that is mostly buildings:
  // the cloud deck is a raymarch and every sky pixel pays for it. The camera
  // presets that point upward are the ones worth measuring.
  const preset = arg('preset', '');
  if (preset) {
    await page.evaluate((p) => window.__KS_CAM__?.(p), preset);
    await page.waitForTimeout(3000);
  }

  const before = await page.evaluate(() => ({
    frame: window.GAME.context.time.frame,
    t: performance.now(),
  }));
  await page.waitForTimeout(WINDOW);
  const after = await page.evaluate(() => ({
    frame: window.GAME.context.time.frame,
    t: performance.now(),
    elapsed: window.GAME.context.time.elapsed,
    calls: window.GAME.renderer.info.render.calls,
    tris: window.GAME.renderer.info.render.triangles,
    buffer: `${window.GAME.renderer.domElement.width}x${window.GAME.renderer.domElement.height}`,
  }));

  const frames = after.frame - before.frame;
  const seconds = (after.t - before.t) / 1000;
  console.log(
    JSON.stringify(
      {
        strike: STRIKE,
        frames,
        seconds: +seconds.toFixed(2),
        fps: +(frames / seconds).toFixed(3),
        msPerFrame: Math.round((seconds * 1000) / Math.max(1, frames)),
        drawCalls: after.calls,
        triangles: after.tris,
        buffer: after.buffer,
      },
      null,
      2,
    ),
  );

  await browser.close();
  killServer();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
