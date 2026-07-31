#!/usr/bin/env node
/**
 * Viewmodel measurement harness.
 *
 * The screenshot harness answers "what does the frame look like"; this answers
 * "what are the numbers". One boot produces, per shot: a PNG plus the report
 * from `window.__VMPROBE__` (installed by `dev/ViewProbe.ts` under
 * `?vmprobe=1`) — the effective albedo and roughness of every bound material,
 * the pixel rectangle of every part, the reticle's emitted radiance, and the
 * sight's sub-pixel alignment. `vmpixels.py` then samples the PNG inside those
 * rectangles, so every claim about brightness is a measurement of the delivered
 * frame rather than of the code's intent.
 *
 * Usage:
 *   node src/weapons/dev/vmprobe.mjs --dist dist-vm --out shots/vm1 --port 4231
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

const OUT = path.resolve(ROOT, arg('out', 'shots/vmprobe'));
const DIST = arg('dist', 'dist-vm');
const PORT = parseInt(arg('port', '4231'), 10);
const WIDTH = parseInt(arg('width', '1600'), 10);
const HEIGHT = parseInt(arg('height', '900'), 10);
const SETTLE = parseInt(arg('settle', '20000'), 10);
/**
 * Hold the internal resolution at the quality preset's own scale.
 *
 * Off by default because it triples the frame cost under software rendering,
 * which on a shared four-core box is the difference between a run that finishes
 * and one that does not. None of the probe's numbers depend on it — the isolates
 * render to their own fixed-size target — so it only buys frames at the size the
 * game claims to be drawing.
 */
const PIN = process.argv.includes('--pin');
const SHOTS = arg('only', '02_weapon_hipfire,03_weapon_ads,01_spawn_overview')
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

async function main() {
  if (!existsSync(path.join(ROOT, DIST, 'index.html'))) {
    console.error(`${DIST}/ not found — build it first.`);
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

  // Streamed rather than dumped at the end: a boot-time throw leaves the page
  // alive but idle, so the run would otherwise sit on its ready-poll for the full
  // timeout with the reason already in hand and no way to see it.
  const logs = [];
  const seen = new Set();
  const note = (line) => {
    logs.push(line);
    // The driver repeats `program not valid` once per draw call; the compiler's
    // own message arrives once, so dedupe before printing or it is buried.
    const key = line.slice(0, 120);
    if (seen.has(key)) return;
    seen.add(key);
    console.log(`  ${line.slice(0, 2400)}`);
  };
  const flush = async () => {
    await writeFile(path.join(OUT, 'console.log'), logs.join('\n') || '(clean)', 'utf8');
  };
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') note(`[${t}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => note(`[pageerror] ${err.message}`));
  page.on('crash', () => note('[crash] renderer crashed'));

  const cdp = await page.context().newCDPSession(page);
  const capture = async (file) => {
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 },
    });
    await writeFile(file, Buffer.from(data, 'base64'));
  };

  const grab = async (page, file) => {
    const data = await page.evaluate(() => window.__GRAB__());
    await writeFile(file, Buffer.from(data.split(',')[1], 'base64'));
  };

  const url = `${baseUrl}?quality=high&capture=1&vmprobe=1`;
  console.log(`Loading ${url}`);
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  try {
    await page.waitForFunction(() => window.GAME_READY === true, null, {
      timeout: 900000,
      polling: 1000,
    });
  } catch {
    logs.push('[probe] GAME_READY never became true');
    await capture(path.join(OUT, '00_boot_failure.png'));
    await writeFile(path.join(OUT, 'console.log'), logs.join('\n'), 'utf8');
    await browser.close();
    killServer();
    process.exit(1);
  }
  // The engine trades resolution for framerate, and under swiftshader it bottoms
  // out at the floor within a second or two of booting — which is the whole of
  // the review's "rendered at 880px and upscaled" complaint, and it is also why
  // the two grabs of one shot can come back at different sizes.
  const pinned = PIN
    ? await page.evaluate(() => {
        const game = window.GAME;
        if (!game || typeof game.setAdaptiveResolution !== 'function') return false;
        game.setAdaptiveResolution(false);
        return true;
      })
    : false;
  console.log(`ready; settling (resolution ${pinned ? 'pinned' : 'adaptive'})`);
  await flush();
  await page.waitForTimeout(SETTLE);

  const results = {};
  for (const name of SHOTS) {
    try {
      await page.evaluate((n) => window.__SHOT__(n), name);
    } catch (err) {
      logs.push(`[probe] __SHOT__("${name}") threw: ${err}`);
    }
    await page.waitForTimeout(600);
    await capture(path.join(OUT, `${name}.png`));
    // The weapon's own pixels, isolated. A bounding box around a forearm is
    // mostly street, so any luminance read from one is a claim about the street;
    // re-rendering the frozen frame with the view scene hidden and differencing
    // gives the exact set of pixels the viewmodel is responsible for, which is
    // both the honest coverage figure and the only sound place to sample a glove.
    try {
      await grab(page, path.join(OUT, `${name}_gl.png`));
      await page.evaluate(() => window.__VIEWHIDE__(true));
      await grab(page, path.join(OUT, `${name}_noview.png`));
      await page.evaluate(() => window.__VIEWHIDE__(false));
    } catch (err) {
      note(`[probe] mask capture failed for "${name}": ${err}`);
    }
    try {
      results[name] = await page.evaluate(() => window.__VMPROBE__());
    } catch (err) {
      results[name] = { error: String(err) };
      logs.push(`[probe] __VMPROBE__ during "${name}" threw: ${err}`);
    }
    // The viewmodel's own AO buffer, straight out of the render module's debug
    // pass. Whether the weapon shows occlusion in its creases is not decidable
    // from the composited frame, where every dark crease is also a crease the
    // light does not reach; this is the only image that answers it on its own.
    try {
      await page.evaluate(() => {
        window.GAME?.tryGet('render')?.setDebugPass?.('viewao');
        window.GAME?.renderOnce?.();
      });
      await page.waitForTimeout(250);
      await grab(page, path.join(OUT, `${name}_viewao.png`));
      await page.evaluate(() => {
        window.GAME?.tryGet('render')?.setDebugPass?.('none');
        window.GAME?.renderOnce?.();
      });
    } catch (err) {
      note(`[probe] viewao capture failed for "${name}": ${err}`);
    }
    console.log(`  measured ${name}`);
    await writeFile(path.join(OUT, 'probe.json'), JSON.stringify(results, null, 2), 'utf8');
    await flush();
  }

  await writeFile(path.join(OUT, 'probe.json'), JSON.stringify(results, null, 2), 'utf8');
  await flush();
  console.log(`Output: ${OUT}`);
  await browser.close();
  killServer();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
