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
  timeout = 300_000,
  liveLoop = false,
  /**
   * Called with the page before it navigates, so a tool can install its own
   * listeners in time to see boot-time console output. `tools/console.mjs` needs
   * this; nothing else does.
   */
  attach = null,
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
  attach?.(page);

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
  await page.evaluate(([q, rs, liveLoop]) => {
    const api = window.__NORTHSTAR_QA__;
    api.setQuality(q);
    api.setResolutionScale(rs);
    api.setPointerLock(false);
    // Take the clock. A background render loop costs most of a second per frame
    // under SwiftShader and competes with every capture: with it stopped, a
    // screenshot drops from about four seconds to well under one, and the frames
    // in the matrix are exactly the frames this tool asked for.
    if (!liveLoop) api.setLoop(false);
  }, [quality, resolutionScale, !!liveLoop]);

  /**
   * Advance simulated time. `window.advanceTime` already slices internally to
   * stay inside the engine's sub-step budget and renders once at the end, so one
   * call is both accurate and much cheaper than a loop of small ones.
   */
  const advance = async (ms, { render = true } = {}) => {
    await page.evaluate(
      ([total, doRender]) => window.advanceTime(total, { render: doRender }),
      [Math.max(0, ms), render]
    );
  };

  const qa = (method, ...args) => page.evaluate(([name, list]) => {
    const out = window.__NORTHSTAR_QA__[name](...list);
    return out === undefined ? null : JSON.parse(JSON.stringify(out));
  }, [method, args]);

  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.render_game_to_text())));

  /**
   * Give the browser back the clock for `ms` of wall time so the DOM can paint.
   *
   * `advanceTime` renders WebGL synchronously, outside any animation frame, so
   * it never makes Chromium repaint the *DOM*. With the loop stopped nothing
   * else asks for a frame, and the consequences are visible in the output: a
   * screen that just became active is still at `opacity: 0`, so it photographs
   * blank, and the compositor keeps hit-testing against the previous frame, so
   * a click can land on the screen that used to be there. Running the game's own
   * loop briefly is the reliable cure — see `tests/helpers/game.js#settleUi`.
   *
   * The WebGL buffer is preserved across this, so a captured beat is still the
   * beat that was set up.
   */
  const settle = async (ms = 320) => {
    const wasRunning = await page.evaluate(() => {
      const engine = window.__NORTHSTAR__?.engine;
      const running = !!engine?._running;
      if (!running) window.__NORTHSTAR_QA__?.setLoop?.(true);
      return running;
    });
    await page.waitForTimeout(ms);
    if (!wasRunning) await page.evaluate(() => window.__NORTHSTAR_QA__?.setLoop?.(false));
  };

  /**
   * Hand the loop back until every visible screen has finished fading in, then
   * take it away again. A fixed 320 ms is not enough: a screen's opacity
   * transition only advances on frames the browser actually paints, and under
   * software rendering a painted frame can take most of a second, so a capture
   * at a fixed delay lands part-way through the fade. That is not a subtle
   * difference in the output — the difficulty screen photographed at about 15%
   * opacity, which is a screenshot of the level behind it with a ghost of the
   * menu on top, and every menu frame in the matrix measured identically
   * because the canvas underneath them was all the metric could see.
   */
  const settleUi = async ({ timeout = 6000, step = 200 } = {}) => {
    const opaque = () => page.evaluate(() => {
      const screens = [...document.querySelectorAll('#ui-root .screen.visible')];
      if (!screens.length) return { done: true, worst: 1 };
      const worst = Math.min(...screens.map((el) => parseFloat(getComputedStyle(el).opacity) || 0));
      return { done: worst >= 0.98, worst };
    });

    const wasRunning = await page.evaluate(() => {
      const engine = window.__NORTHSTAR__?.engine;
      const running = !!engine?._running;
      if (!running) window.__NORTHSTAR_QA__?.setLoop?.(true);
      return running;
    });
    const deadline = Date.now() + timeout;
    let last = await opaque();
    while (!last.done && Date.now() < deadline) {
      await page.waitForTimeout(step);
      last = await opaque();
    }
    if (!wasRunning) await page.evaluate(() => window.__NORTHSTAR_QA__?.setLoop?.(false));
    return last;
  };

  /**
   * Click a selector only once a real mouse event at its centre would actually
   * reach it, painting frames until it does. Returns false if it never does.
   */
  const click = async (selector, { attempts = 8, timeout = 4000 } = {}) => {
    const locator = page.locator(selector).first();
    for (let i = 0; i < attempts; i++) {
      if (await locator.isVisible().catch(() => false)) {
        const handle = await locator.elementHandle({ timeout: 500 }).catch(() => null);
        const reachable = handle
          ? await page.evaluate((node) => {
            const r = node.getBoundingClientRect();
            if (!r.width || !r.height) return false;
            const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return !!top && (top === node || node.contains(top));
          }, handle).catch(() => false)
          : false;
        await handle?.dispose?.().catch(() => {});
        if (reachable) {
          await locator.click({ force: true, timeout });
          return true;
        }
      }
      await advance(150);
      await settle();
    }
    return false;
  };

  await advance(150);

  return {
    browser,
    context,
    page,
    console: console_,
    advance,
    qa,
    state,
    settle,
    settleUi,
    click,
    metrics: () => canvasMetrics(page),
    // Always settled first: a capture is worthless if the HUD and screen layers
    // in it are one state behind the frame they are drawn over, or half faded in.
    shot: async (name, dir = SCREENSHOT_DIR, opts) => {
      await settle();
      await settleUi();
      return capture(page, name, dir, opts);
    },
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

/**
 * Screenshot into `dir` and return the file plus its measurements.
 *
 * The two reference sets — the canonical matrix and the per-checkpoint audit —
 * are written as JPEG, because they are meant to be committed and a 1920x1080
 * PNG of this game is about 1.8 MB once the menus are legible: the 89 reference
 * frames come to 159 MB as PNG and around 30 MB as quality-88 JPEG, at the same
 * resolution. Nothing measured is read back from the file (every number comes
 * off the WebGL canvas before the screenshot is taken), so the encoder cannot
 * affect a result. Per-spec evidence stays PNG: it is rewritten on every test
 * run, never committed, and lossless is the better default for something you are
 * staring at to explain a failure.
 */
export async function capture(page, name, dir = SCREENSHOT_DIR, { format = 'png', quality = 88 } = {}) {
  ensureDir(dir);
  const safe = String(name).replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
  const jpeg = format === 'jpeg' || format === 'jpg';
  const file = path.join(dir, `${safe}.${jpeg ? 'jpg' : 'png'}`);
  const metrics = await canvasMetrics(page);
  await page.screenshot(jpeg ? { path: file, type: 'jpeg', quality } : { path: file });
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
