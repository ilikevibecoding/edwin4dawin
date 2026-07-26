// Shared plumbing for the standalone QA tools.  (owner: opus4)
//
// Both `capture-matrix.mjs` and `audit.mjs` need the same three things: a dev
// server, a headless Chromium with software WebGL, and a booted game with the
// QA API reachable. None of that belongs in either script twice.

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Matches `playwright.config.js`; SwiftShader is the only GL we have headless. */
export const CHROMIUM_GL_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-lcd-text',
];

/**
 * The tools use their own port so they never collide with the Playwright
 * `webServer` on 5173. Override with `--url` to point at a server you already
 * have running.
 */
export const DEFAULT_PORT = 5174;

export const ARTIFACT_DIR = path.resolve('artifacts');
export const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { out._.push(arg); continue; }
    const [rawKey, inlineValue] = arg.slice(2).split('=');
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (inlineValue !== undefined) out[key] = inlineValue;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) out[key] = argv[++i];
    else out[key] = true;
  }
  return out;
}

async function waitForServer(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok || res.status === 304) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`the dev server at ${url} did not come up within ${timeoutMs} ms`);
}

/** Start `vite` on `port`, unless something is already serving there. */
export async function startServer({ port = DEFAULT_PORT, quiet = true } = {}) {
  const url = `http://127.0.0.1:${port}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    if (res.ok) return { url, stop: async () => {}, reused: true };
  } catch {
    /* nothing there — start our own */
  }

  // Run the local binary rather than `npx`, so there is no wrapper process
  // between us and vite, and put it in its own process group so `stop()` can
  // take the whole thing down.
  const local = path.resolve('node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
  const bin = fs.existsSync(local) ? local : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const argv = bin === local
    ? ['--host', '127.0.0.1', '--port', String(port), '--strictPort']
    : ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
  const child = spawn(bin, argv, {
    cwd: process.cwd(),
    stdio: quiet ? ['ignore', 'ignore', 'pipe'] : 'inherit',
    detached: process.platform !== 'win32',
  });
  let stderr = '';
  child.stderr?.on('data', (d) => { stderr += String(d); });
  child.on('exit', (code) => {
    if (code && code !== 0 && stderr) process.stderr.write(`[vite] exited ${code}\n${stderr}\n`);
  });

  const kill = (signal) => {
    try {
      if (child.pid && process.platform !== 'win32') process.kill(-child.pid, signal);
      else child.kill(signal);
    } catch {
      /* already gone */
    }
  };

  try {
    await waitForServer(url);
  } catch (err) {
    kill('SIGTERM');
    throw new Error(`${err.message}\n${stderr}`);
  }

  // Keep draining stderr — closing the pipe would hand vite an EPIPE and kill
  // it — but unref the handles so they cannot keep this process alive at exit.
  child.stderr?.unref?.();
  child.unref();

  return {
    url,
    reused: false,
    stop: async () => {
      kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 250));
      kill('SIGKILL');
    },
  };
}

/**
 * Boot a browser, load the game with QA enabled, and wait for a built level.
 * Returns the page plus the same time / QA helpers the Playwright harness uses,
 * so the tools and the test suite drive the game identically.
 */
export async function openGame({
  url,
  width = 1920,
  height = 1080,
  quality = 'medium',
  resolutionScale = 0.75,
  timeout = 180_000,
} = {}) {
  const browser = await chromium.launch({
    channel: 'chromium',
    headless: true,
    args: CHROMIUM_GL_ARGS,
  });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const console_ = { errors: [], warnings: [], failedRequests: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') console_.errors.push(msg.text());
    else if (msg.type() === 'warning') console_.warnings.push(msg.text());
  });
  page.on('pageerror', (err) => console_.errors.push(`${err.name}: ${err.message}`));
  page.on('requestfailed', (req) => {
    if (!/favicon/i.test(req.url())) console_.failedRequests.push(`${req.url()} — ${req.failure()?.errorText}`);
  });

  await page.addInitScript(([q, rs]) => {
    try {
      localStorage.setItem('northstar.qa', '1');
      const key = 'northstar.settings.v1';
      const existing = JSON.parse(localStorage.getItem(key) || '{}');
      localStorage.setItem(key, JSON.stringify({ ...existing, quality: q, resolutionScale: rs }));
    } catch {
      /* storage blocked */
    }
  }, [quality, resolutionScale]);

  await page.goto(`${url}/?qa=1`, { waitUntil: 'domcontentloaded', timeout });

  // A missing module or an uncaught exception is already terminal: fail in a
  // second with the reason rather than waiting out the whole boot timeout.
  let watching = true;
  const fatal = new Promise((_, reject) => {
    const tick = () => {
      if (!watching) return;
      const bad = console_.failedRequests.find((t) => /\.(?:js|mjs|css)\b/i.test(t))
        || console_.errors.find((t) => /^(TypeError|ReferenceError|SyntaxError|Error):/.test(t));
      if (bad) {
        watching = false;
        reject(new Error(`the game did not boot: ${bad}`));
        return;
      }
      setTimeout(tick, 100);
    };
    setTimeout(tick, 100);
  });

  try {
    await Promise.race([
      page.waitForFunction(
        () => !!window.__NORTHSTAR__ && typeof window.advanceTime === 'function' && !!window.__NORTHSTAR_QA__,
        null,
        { timeout }
      ),
      fatal,
    ]);
    await Promise.race([
      page.waitForFunction(() => window.__NORTHSTAR__?.levelReady === true, null, { timeout }),
      fatal,
    ]);
  } catch (err) {
    // Never leave a browser behind on a boot failure: the tool would hang on
    // exit with an open connection.
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    throw err;
  } finally {
    watching = false;
  }
  await page.evaluate(([q, rs]) => {
    const api = window.__NORTHSTAR_QA__;
    api.setQuality(q);
    api.setResolutionScale(rs);
    api.setPointerLock(false);
  }, [quality, resolutionScale]);

  /** Advance simulated time in chunks the engine's sub-step cap can absorb. */
  const advance = async (ms, { step = 80, render = true } = {}) => {
    await page.evaluate(([total, chunk, doRender]) => {
      let left = total;
      const engine = window.__NORTHSTAR__.engine;
      while (left > 1e-6) {
        const dt = Math.min(chunk, left);
        if (doRender) window.advanceTime(dt);
        else engine.advance(dt, false);
        left -= dt;
      }
    }, [Math.max(0, ms), step, render]);
  };

  const qa = (method, ...args) => page.evaluate(([name, list]) => {
    const out = window.__NORTHSTAR_QA__[name](...list);
    return out === undefined ? null : JSON.parse(JSON.stringify(out));
  }, [method, args]);

  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.render_game_to_text())));

  await advance(150);

  return {
    browser,
    context,
    page,
    console: console_,
    advance,
    qa,
    state,
    metrics: () => canvasMetrics(page),
    shot: (name, dir = SCREENSHOT_DIR) => capture(page, name, dir),
    close: async () => {
      await context.close();
      await browser.close();
    },
  };
}

/** Downscale the canvas and measure exposure, contrast and colour spread. */
export async function canvasMetrics(page, { width = 192, height = 108 } = {}) {
  return page.evaluate(([w, h]) => {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return { ok: false };
    const scratch = document.createElement('canvas');
    scratch.width = w;
    scratch.height = h;
    const ctx = scratch.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let sum = 0;
    let sumSq = 0;
    let min = 1;
    let max = 0;
    let black = 0;
    let white = 0;
    const buckets = new Set();
    const n = w * h;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sum += lum;
      sumSq += lum * lum;
      if (lum < min) min = lum;
      if (lum > max) max = lum;
      if (lum <= 0.015) black++;
      if (lum >= 0.985) white++;
      buckets.add(((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4));
    }
    const mean = sum / n;
    return {
      ok: true,
      meanLuminance: +mean.toFixed(4),
      stdDev: +Math.sqrt(Math.max(0, sumSq / n - mean * mean)).toFixed(4),
      contrast: +((max - min) / Math.max(1e-6, max + min)).toFixed(4),
      dynamicRange: +(max - min).toFixed(4),
      minLuminance: +min.toFixed(4),
      maxLuminance: +max.toFixed(4),
      crushedBlackFraction: +(black / n).toFixed(4),
      blownHighlightFraction: +(white / n).toFixed(4),
      distinctColours: buckets.size,
    };
  }, [width, height]);
}

/** Screenshot into `dir` and return the file plus its measurements. */
export async function capture(page, name, dir = SCREENSHOT_DIR) {
  ensureDir(dir);
  const safe = String(name).replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
  const file = path.join(dir, `${safe}.png`);
  const metrics = await canvasMetrics(page);
  await page.screenshot({ path: file });
  return { name: safe, file, relative: path.relative(process.cwd(), file), metrics };
}

export function writeJson(name, data) {
  ensureDir(ARTIFACT_DIR);
  const file = path.join(ARTIFACT_DIR, name);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return file;
}

export function writeText(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text.endsWith('\n') ? text : `${text}\n`);
  return file;
}
