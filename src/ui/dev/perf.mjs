#!/usr/bin/env node
/**
 * Per-frame UI cost, measured over a window with no capture in it.
 *
 * The screenshot script samples the same counters, but it does so between
 * screenshots, and a screenshot starves requestAnimationFrame for the best part
 * of a minute — so the figure it quotes is drawn from a handful of frames. This
 * just runs the game and watches.
 *
 * Usage: node src/ui/dev/perf.mjs [--query uidemo=1] [--seconds 60]
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PORT = 4198;
const W = 1600;
const H = 900;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
    return process.argv[i + 1];
  }
  return fallback;
}

const QUERY = arg('query', 'capture=1');
const SECONDS = parseInt(arg('seconds', '60'), 10);

async function main() {
  for (const cmd of [`fuser -k ${PORT}/tcp`, `pkill -f "vite preview.*${PORT}"`]) {
    try {
      execSync(`${cmd} 2>/dev/null || true`, { stdio: 'ignore' });
    } catch {
      /* ignore */
    }
  }
  const server = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1', '--outDir', 'dist-ui'],
    { cwd: ROOT, stdio: 'ignore', detached: true },
  );
  const kill = () => {
    try {
      process.kill(-server.pid, 'SIGKILL');
    } catch {
      server.kill('SIGKILL');
    }
  };
  process.on('exit', kill);
  const base = `http://127.0.0.1:${PORT}/`;
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
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
      `--window-size=${W},${H}`,
    ],
  });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
  await page.goto(`${base}?quality=low&${QUERY}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });

  for (let i = 0; i < SECONDS / 3; i++) {
    await page.waitForTimeout(3000);
    const s = await page.evaluate(() => {
      const cost = window.GAME.tryGet('ui')?.frameCost ?? null;
      return {
        t: Math.round(window.GAME.context.time.elapsed),
        frame: window.GAME.context.time.frame,
        fps: Math.round(window.GAME.context.time.fps),
        paused: window.GAME.isPaused,
        n: cost?.samples ?? -1,
        mean: cost ? +cost.mean.toFixed(3) : -1,
        p95: cost ? +cost.p95.toFixed(3) : -1,
        peak: cost ? +cost.peak.toFixed(3) : -1,
      };
    });
    console.log(JSON.stringify(s));
  }

  await browser.close();
  kill();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
