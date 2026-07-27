import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Playwright harness for Northstar Rescue.  (owner: opus4)
//
// Rules this harness exists to enforce:
//   * Simulation time is ALWAYS driven by `window.advanceTime(ms)`, never by a
//     wall-clock sleep. Software WebGL is far too slow and far too variable for
//     timing-based tests. `advanceTime` slices internally to stay inside the
//     engine's sub-step budget, so one big call is exact and cheap.
//   * The game's own render loop is stopped for the duration of a test, so the
//     only frames drawn are the frames a spec asks for. A background render
//     costs most of a second under SwiftShader and makes both screenshots and
//     measurements slow and noisy. `boot.spec.js` covers the live loop.
//   * The whole suite shares one booted page, because building the level costs
//     about a minute. `bootGame()` resets that page rather than reloading it.
//   * Inputs are always released between bursts, with a pause afterwards, so a
//     spec can never leak a held key into the next assertion.
//   * Console errors, page errors and failed requests are collected from before
//     the first navigation and asserted at the end of every spec.
// ---------------------------------------------------------------------------

export const SCREENSHOT_DIR = path.resolve('artifacts/screenshots');
export const ARTIFACT_DIR = path.resolve('artifacts');

/**
 * Software rasterisation makes every pixel expensive. 1280x720 with the `low`
 * preset at half resolution scale renders in 10-30 ms; 1920x1080 at medium
 * costs up to two seconds. `resize.spec.js` overrides this on purpose.
 */
export const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

const collectors = new WeakMap();

// =========================================================================
// console / network collection
// =========================================================================

/**
 * Benign console noise. Anything matched here is recorded but not failed on:
 * these are environment facts, not defects in the game.
 */
const IGNORED_CONSOLE = [
  /WebGL.*deprecated/i,
  /SwiftShader/i,
  /Automatic fallback to software WebGL/i,
  /software rendering/i,
  /\[vite\] connect(ing|ed)/i,
  /Download the React DevTools/i,
  /AudioContext was not allowed to start/i,
  /The AudioContext was not allowed to start/i,
  /GroupMarkerNotSet/i,
  /Failed to load resource: net::ERR_FAILED.*favicon/i,
];

const IGNORED_REQUESTS = [
  /favicon/i,
  /\/@vite\/client/i,
  /\/__(open-in-editor|vite)/i,
];

function isIgnored(text, patterns) {
  return patterns.some((re) => re.test(text));
}

export function attachCollector(page) {
  let bucket = collectors.get(page);
  if (bucket) return bucket;
  bucket = { errors: [], warnings: [], pageErrors: [], failedRequests: [], all: [] };
  collectors.set(page, bucket);

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    const entry = { type, text, location: msg.location() };
    bucket.all.push(entry);
    if (isIgnored(text, IGNORED_CONSOLE)) return;
    if (type === 'error') bucket.errors.push(entry);
    else if (type === 'warning') bucket.warnings.push(entry);
  });

  page.on('pageerror', (err) => {
    const entry = { type: 'pageerror', text: `${err.name}: ${err.message}`, stack: err.stack };
    bucket.all.push(entry);
    if (!isIgnored(entry.text, IGNORED_CONSOLE)) bucket.pageErrors.push(entry);
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    const entry = { type: 'requestfailed', text: `${url} — ${req.failure()?.errorText || 'unknown'}` };
    bucket.all.push(entry);
    if (!isIgnored(url, IGNORED_REQUESTS)) bucket.failedRequests.push(entry);
  });

  page.on('response', (res) => {
    if (res.status() < 400) return;
    const url = res.url();
    if (isIgnored(url, IGNORED_REQUESTS)) return;
    bucket.failedRequests.push({ type: 'httpstatus', text: `${res.status()} ${url}` });
  });

  return bucket;
}

/**
 * Forget everything logged so far. Called between scenarios that share a page,
 * so each one is judged only on what it caused itself.
 */
export function resetConsole(page) {
  const bucket = collectors.get(page);
  if (!bucket) return;
  for (const key of ['errors', 'warnings', 'pageErrors', 'failedRequests', 'all']) bucket[key].length = 0;
}

export function consoleReport(page) {
  const bucket = collectors.get(page) || { errors: [], warnings: [], pageErrors: [], failedRequests: [] };
  return {
    errors: bucket.errors.slice(),
    warnings: bucket.warnings.slice(),
    pageErrors: bucket.pageErrors.slice(),
    failedRequests: bucket.failedRequests.slice(),
  };
}

/** Assert the page produced no console errors, page errors or failed requests. */
export async function expectNoConsoleErrors(page, { allowNetwork = false } = {}) {
  const report = consoleReport(page);
  const inPage = await page.evaluate(() => {
    const g = window.__NORTHSTAR__;
    return Array.isArray(g?.consoleErrors) ? g.consoleErrors.slice(0, 10) : [];
  }).catch(() => []);

  const lines = [
    ...report.pageErrors.map((e) => `pageerror: ${e.text}`),
    ...report.errors.map((e) => `console.error: ${e.text}`),
    ...(allowNetwork ? [] : report.failedRequests.map((e) => `network: ${e.text}`)),
    ...inPage.map((e) => `window.onerror: ${e.message} (${e.source}:${e.line})`),
  ];
  expect(lines, `page reported errors:\n${lines.join('\n')}`).toEqual([]);
  return report;
}

// =========================================================================
// the shared page
// =========================================================================

/**
 * Booting the level costs about a minute of software rendering, so the suite
 * cannot afford one boot per test (63 boots is over an hour before a single
 * assertion runs). This overrides Playwright's `page` fixture with a
 * worker-scoped page that is booted once and handed to every test, and
 * `bootGame()` resets it instead of reloading when it is already up.
 *
 * The cost is that scenarios share a process, so the reset has to be real: it
 * restores settings, rebuilds the mission, releases inputs, clears overlays and
 * empties the console log. `mission.spec.js` asserts digest equality between a
 * reset run and a fresh one, which is what keeps this honest. A test that needs
 * a virgin process asks for one with `bootGame(page, { fresh: true })`.
 *
 * Because the page is ours rather than Playwright's, the automatic
 * screenshot-on-failure does not apply, so we take one here instead.
 */
export const test = base.extend({
  sharedPage: [async ({ browser }, use, workerInfo) => {
    const context = await browser.newContext({
      viewport: DEFAULT_VIEWPORT,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.__northstarWorker = workerInfo.workerIndex;
    await use(page);
    await context.close().catch(() => {});
  }, { scope: 'worker' }],

  page: async ({ sharedPage }, use, testInfo) => {
    // A page that died in a previous test cannot be recycled.
    if (sharedPage.isClosed()) throw new Error('the shared page was closed; the worker will restart');
    await use(sharedPage);

    if (testInfo.status !== testInfo.expectedStatus && !sharedPage.isClosed()) {
      const name = `failure-${testInfo.title}`.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
      const file = path.join(ARTIFACT_DIR, 'failures', `${name}.png`);
      ensureDir(path.dirname(file));
      await sharedPage.screenshot({ path: file }).catch(() => {});
      await testInfo.attach('failure-screenshot', { path: file, contentType: 'image/png' }).catch(() => {});
    }
    await releaseAll(sharedPage).catch(() => {});
  },
});

// =========================================================================
// boot
// =========================================================================

/**
 * Turn a boot timeout into something actionable. The cause is nearly always a
 * module that failed to load or threw, and the collector already has it.
 */
function bootDiagnosis(page, what) {
  const report = consoleReport(page);
  const lines = [`the game did not boot — ${what}.`];
  if (report.failedRequests.length) {
    lines.push('failed requests:', ...report.failedRequests.map((e) => `  ${e.text}`));
  }
  if (report.pageErrors.length) {
    lines.push('page errors:', ...report.pageErrors.map((e) => `  ${e.text}`));
  }
  if (report.errors.length) {
    lines.push('console errors:', ...report.errors.slice(0, 10).map((e) => `  ${e.text}`));
  }
  if (report.failedRequests.length + report.pageErrors.length + report.errors.length === 0) {
    lines.push('nothing was logged: the entry module may be missing, or boot may still be awaiting a promise.');
  }
  return lines.join('\n');
}

/**
 * Watch for a boot failure we already know is fatal — a JavaScript module that
 * would not load, or an uncaught exception — so a broken build fails in a
 * second with the reason attached instead of sitting on `waitForFunction` until
 * the test timeout kills it and reports nothing useful.
 */
function watchForFatalBoot(page) {
  let active = true;
  const promise = new Promise((_, reject) => {
    const tick = () => {
      if (!active) return;
      const report = consoleReport(page);
      const fatal = report.failedRequests.find((e) => /\.(?:js|mjs|css)\b/i.test(e.text))
        || report.pageErrors[0];
      if (fatal) {
        active = false;
        reject(new Error(bootDiagnosis(page, `a required resource failed: ${fatal.text}`)));
        return;
      }
      setTimeout(tick, 100);
    };
    setTimeout(tick, 100);
  });
  return { promise, stop: () => { active = false; } };
}

function buildUrl({ qa = true, query = {} } = {}) {
  const params = new URLSearchParams();
  if (qa) params.set('qa', '1');
  for (const [k, v] of Object.entries(query)) params.set(k, String(v));
  const q = params.toString();
  return q ? `/?${q}` : '/';
}

/**
 * Navigate, wait for the game object and a built level, force a deterministic
 * render configuration and install the console collector.
 *
 * Booting is expensive — the level build costs about a minute under software
 * rendering — so a page that is already booted is *reset* instead of reloaded
 * unless `fresh` is set. See `test` below for how the suite shares one page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{quality?:string, resolutionScale?:number, settings?:object,
 *          qa?:boolean, query?:object, pointerLock?:boolean, fresh?:boolean,
 *          liveLoop?:boolean, viewport?:{width:number,height:number},
 *          timeout?:number}} opts
 */
export async function bootGame(page, opts = {}) {
  const {
    quality = 'low',
    resolutionScale = 0.5,
    settings: settingOverrides = {},
    qa = true,
    query = {},
    pointerLock = false,
    fresh = false,
    liveLoop = false,
    viewport = DEFAULT_VIEWPORT,
    timeout = 180_000,
  } = opts;

  attachCollector(page);

  const alreadyBooted = !fresh && await page.evaluate(
    () => !!window.__NORTHSTAR__?.levelReady && !!window.__NORTHSTAR_QA__
  ).catch(() => false);

  if (alreadyBooted) {
    await resetGame(page, {
      quality, resolutionScale, settings: settingOverrides, pointerLock, liveLoop, viewport,
    });
    return page;
  }

  // Seed storage before any module runs so the very first frame is already at
  // the test's quality preset (avoids a high-quality first frame under
  // SwiftShader, which can take seconds).
  await page.addInitScript(([q, rs, extra]) => {
    try {
      window.localStorage.setItem('northstar.qa', '1');
      const key = 'northstar.settings.v1';
      const existing = JSON.parse(window.localStorage.getItem(key) || '{}');
      window.localStorage.setItem(key, JSON.stringify({
        ...existing, quality: q, resolutionScale: rs, ...extra,
      }));
    } catch {
      /* storage unavailable — runtime overrides below still apply */
    }
  }, [quality, resolutionScale, settingOverrides]);

  await page.goto(buildUrl({ qa, query }), { waitUntil: 'domcontentloaded' });

  // A bare `waitForFunction` timeout says nothing about why the app never came
  // up, and the reason is almost always sitting in the collector already.
  const fatal = watchForFatalBoot(page);
  try {
    await Promise.race([
      page.waitForFunction(
        () => !!window.__NORTHSTAR__
          && typeof window.advanceTime === 'function'
          && typeof window.render_game_to_text === 'function',
        null,
        { timeout }
      ),
      fatal.promise,
    ]);
  } catch (err) {
    if (/did not boot/.test(err.message)) throw err;
    throw new Error(`${bootDiagnosis(page, 'the globals never appeared')}\n\n${err.message}`);
  } finally {
    fatal.stop();
  }
  try {
    await page.waitForFunction(() => window.__NORTHSTAR__?.levelReady === true, null, { timeout });
  } catch (err) {
    const task = await page.evaluate(() => window.__NORTHSTAR__?.loadTask ?? null).catch(() => null);
    throw new Error(`${bootDiagnosis(page, `the level never finished building (last step: ${task ?? 'unknown'})`)}\n\n${err.message}`);
  }

  await applyRenderConfig(page, { quality, resolutionScale, settings: settingOverrides, pointerLock, liveLoop });

  // One rendered frame so the canvas is never empty when a spec reads pixels.
  await advance(page, 100);
  return page;
}

/**
 * Everything a test needs applied to a booted page: quality, resolution scale,
 * individual settings, pointer-lock suppression and who owns the clock.
 */
async function applyRenderConfig(page, { quality, resolutionScale, settings: extra, pointerLock, liveLoop }) {
  await page.evaluate(([q, rs, over, wantLock, wantLoop]) => {
    const api = window.__NORTHSTAR_QA__;
    api?.setQuality?.(q);
    api?.setResolutionScale?.(rs);
    for (const [k, v] of Object.entries(over || {})) api?.setSetting?.(k, v);
    // Pointer lock cannot be granted without a user gesture in automation, and
    // a refused request pauses the game. Suppress the request instead.
    api?.setPointerLock?.(!!wantLock);
    // Hand the clock to the test unless it explicitly wants the real loop: a
    // background render costs most of a second here and makes screenshots and
    // measurements both slow and noisy.
    api?.setLoop?.(!!wantLoop);
  }, [quality, resolutionScale, extra, pointerLock, liveLoop]);
}

/**
 * Return an already-booted page to a known baseline: menu state, fresh mission,
 * default viewport, no held inputs, no debug overlays, empty console log. Much
 * cheaper than a reload, and the digest checks in `mission.spec.js` and
 * `boot.spec.js` are what prove it is equivalent.
 */
export async function resetGame(page, opts = {}) {
  const {
    quality = 'low',
    resolutionScale = 0.5,
    settings: settingOverrides = {},
    pointerLock = false,
    liveLoop = false,
    viewport = DEFAULT_VIEWPORT,
  } = opts;

  const size = page.viewportSize();
  if (viewport && (size?.width !== viewport.width || size?.height !== viewport.height)) {
    await page.setViewportSize(viewport);
  }
  // `title` is where a real boot lands, so that is what a reset restores: the
  // front-end specs click their way forward from exactly the same place.
  await page.evaluate(() => {
    const api = window.__NORTHSTAR_QA__;
    api?.resetSettings?.();
    api?.softReset?.({ state: 'title' });
  });
  await applyRenderConfig(page, {
    quality, resolutionScale, settings: settingOverrides, pointerLock, liveLoop,
  });
  await page.evaluate(() => { document.exitFullscreen?.().catch(() => {}); });
  resetConsole(page);
  await advance(page, 100);
  return page;
}

// =========================================================================
// time
// =========================================================================

/**
 * Advance simulated time.
 *
 * `window.advanceTime(ms)` already feeds the engine in slices under its
 * sub-step budget and renders once at the end, so one call is both accurate and
 * far cheaper than many: a rendered frame costs 10-30 ms here while simulating
 * a second of game time costs under 50 ms. `render:false` skips the draw
 * entirely, which is how the long soak tests stay inside a sane budget.
 */
export async function advance(page, ms, { render = true } = {}) {
  const total = Math.max(0, Number(ms) || 0);
  if (total === 0) return;
  await page.evaluate(
    ([totalMs, doRender]) => window.advanceTime(totalMs, { render: doRender }),
    [total, render]
  );
}

/**
 * Resize the window and leave the renderer in a settled state.
 *
 * The engine resizes from the window `resize` event, which lands independently
 * of the frames a test asks for, so the first frame after a resize can be the
 * old image or a black one drawn into a buffer that was reallocated underneath
 * it. Waiting for the engine to acknowledge the new size and then drawing twice
 * is what makes a measurement after a resize mean anything.
 */
export async function setViewport(page, { width, height }) {
  await page.setViewportSize({ width, height });
  await page.waitForFunction(
    ([w, h]) => window.__NORTHSTAR__?.engine?.viewportWidth === w
      && window.__NORTHSTAR__?.engine?.viewportHeight === h,
    [width, height],
    { timeout: 15_000 }
  );
  await advance(page, 120);
  await advance(page, 120);
}

/** A single rendered frame at the given simulated duration. */
export async function frame(page, ms = 16) {
  await page.evaluate((m) => window.advanceTime(m), ms);
}

/**
 * Give the browser back the clock for `ms` of *wall* time, so the DOM can
 * actually repaint, then take it away again.
 *
 * This exists because of one hard-won fact: `advanceTime` renders the WebGL
 * scene synchronously, outside any animation frame, so it never makes Chromium
 * paint the DOM. With the game's rAF loop stopped there is nothing else asking
 * for a frame, and two things go stale together — a CSS opacity transition never
 * starts, so a screen that just became visible sits at `opacity: 0` forever, and
 * the compositor keeps serving hit-test regions from the last frame it painted.
 * The second is the dangerous one: `elementFromPoint`, and therefore any real
 * mouse click, lands on whichever screen *used* to be visible. That is how the
 * menu specs came to click a difficulty card while the DOM correctly reported it
 * `visibility: hidden` (`tools/hittest.mjs` demonstrates all of this).
 *
 * Requesting animation frames by hand is not reliable here — sometimes the
 * transition still does not start. Running the game's own loop is, because it is
 * exactly what production does, and `boot.spec.js` proves it produces frames
 * under SwiftShader. 320 ms comfortably covers the 260 ms screen fade.
 */
export async function settleUi(page, ms = 320) {
  const wasRunning = await page.evaluate(() => {
    const engine = window.__NORTHSTAR__?.engine;
    const running = !!engine?._running;
    if (!running) window.__NORTHSTAR_QA__?.setLoop?.(true);
    return running;
  });
  await page.waitForTimeout(ms);
  if (!wasRunning) {
    await page.evaluate(() => window.__NORTHSTAR_QA__?.setLoop?.(false));
  }
}

// =========================================================================
// game access
// =========================================================================

/** `render_game_to_text()`, normalised to a plain object. */
export async function state(page) {
  const raw = await page.evaluate(() => {
    const out = window.render_game_to_text();
    if (typeof out === 'string') return { __string: out };
    return JSON.parse(JSON.stringify(out));
  });
  if (raw && raw.__string !== undefined) {
    try {
      return JSON.parse(raw.__string);
    } catch {
      return { text: raw.__string };
    }
  }
  return raw;
}

/** Call one method on `window.__NORTHSTAR_QA__` and return its result. */
export async function qa(page, method, ...args) {
  return page.evaluate(([name, callArgs]) => {
    const api = window.__NORTHSTAR_QA__;
    if (!api) throw new Error('window.__NORTHSTAR_QA__ is not installed');
    const fn = api[name];
    if (typeof fn !== 'function') throw new Error(`QA API has no method "${name}"`);
    const out = fn(...callArgs);
    return out === undefined ? null : JSON.parse(JSON.stringify(out));
  }, [method, args]);
}

export async function digest(page) {
  const snap = await qa(page, 'screenshotState');
  return snap.digest;
}

export async function gameMode(page) {
  return page.evaluate(() => window.__NORTHSTAR__?.state ?? null);
}

// ------------------------------------------------------------------ events --

/**
 * Start buffering bus events. Recording once per spec and draining after each
 * action is how the suite asserts real cause-and-effect: "one trigger pull
 * emitted exactly one weapon:fire and at least one world:impact".
 */
export async function recordEvents(page, types = null) {
  return qa(page, 'recordEvents', types);
}

/** Drain the buffer (optionally filtered) and return the recorded events. */
export async function takeEvents(page, types = null) {
  return qa(page, 'takeEvents', types);
}

/** Drain, then count occurrences by type. */
export async function eventCounts(page, types = null) {
  const events = await takeEvents(page, types);
  const counts = {};
  for (const e of events) counts[e.type] = (counts[e.type] || 0) + 1;
  return { counts, events };
}

/**
 * Wait for a game state, pumping simulated time while waiting. Transitions
 * (loading, screen fades, the mission's own timers) run on frames, and with the
 * render loop stopped the only frames are the ones we ask for, so a passive wait
 * could sit there until it timed out.
 */
export async function waitForMode(page, mode, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await page.evaluate((want) => window.__NORTHSTAR__?.state === want, mode)) return;
    if (Date.now() > deadline) {
      const now = await gameMode(page);
      throw new Error(`the game never reached "${mode}" within ${timeout} ms (still in "${now}")`);
    }
    await advance(page, 120, { render: false });
  }
}

/**
 * Drive time until a predicate holds, in simulated chunks. Never sleeps.
 * @returns {Promise<boolean>} whether the predicate became true
 */
export async function advanceUntil(page, predicateSource, { budgetMs = 20_000, step = 100, render = false } = {}) {
  let spent = 0;
  const check = async () => page.evaluate(
    // eslint-disable-next-line no-new-func
    (src) => Boolean(new Function('game', 'state', `return (${src});`)(
      window.__NORTHSTAR__, window.render_game_to_text()
    )),
    predicateSource
  );
  if (await check()) return true;
  while (spent < budgetMs) {
    await advance(page, step, { render });
    spent += step;
    if (await check()) return true;
  }
  return false;
}

// =========================================================================
// input
// =========================================================================

export async function hold(page, action) {
  await page.evaluate((a) => window.__NORTHSTAR__.input.setActionState(a, true), action);
}

export async function release(page, action) {
  await page.evaluate((a) => window.__NORTHSTAR__.input.setActionState(a, false), action);
}

export async function releaseAll(page) {
  await page.evaluate(() => window.__NORTHSTAR__.input.releaseAll());
}

export async function tap(page, action) {
  await page.evaluate((a) => window.__NORTHSTAR__.input.tapAction(a), action);
}

/**
 * The "short input burst with an intentional pause" pattern: hold an action for
 * a simulated duration, release it, then let the world settle. Every movement
 * assertion in the suite goes through this so no key is ever left down.
 */
export async function burst(page, action, ms = 250, { pause = 150, render = true } = {}) {
  await hold(page, action);
  await advance(page, ms, { render });
  await release(page, action);
  await advance(page, pause, { render });
}

/**
 * Turn the player until there is a solid, opaque surface in front of them, and
 * report what it is. Firing "at a wall" cannot be assumed from a checkpoint's
 * default facing: the conference room's east side is glass, and once the first
 * round breaks the pane the rest of the burst flies out of the building and
 * registers nothing at all.
 */
export async function faceSolidWall(page, { minDistance = 1.2, maxDistance = 9, height = 0 } = {}) {
  const found = await page.evaluate(([minD, maxD, h]) => {
    const game = window.__NORTHSTAR__;
    const player = game.player;
    const eye = player.eyePosition.clone();
    eye.y += h;
    const best = { ok: false };
    for (let i = 0; i < 24; i++) {
      const yaw = (i / 24) * Math.PI * 2 - Math.PI;
      const dir = new (eye.constructor)(-Math.sin(yaw), 0, -Math.cos(yaw));
      const hit = game.collision?.raycast?.(eye, dir, maxD + 1);
      if (!hit?.hit) continue;
      const surface = hit.surface || null;
      if (surface === 'glass') continue;
      if (hit.distance < minD || hit.distance > maxD) continue;
      if (!best.ok || hit.distance < best.distance) {
        best.ok = true;
        best.yaw = yaw;
        best.distance = +hit.distance.toFixed(3);
        best.surface = surface;
        best.point = hit.point.toArray().map((n) => +n.toFixed(3));
      }
    }
    if (best.ok) {
      player.yaw = best.yaw;
      player.pitch = 0;
      player.velocity.set(0, 0, 0);
      player.updateCamera(0);
    }
    return best;
  }, [minDistance, maxDistance, height]);
  expect(found.ok, `no solid surface within ${maxDistance} m of the player to shoot at`).toBe(true);
  await advance(page, 150, { render: false });
  return found;
}

/** Inject raw mouse movement in pixels and let the look step consume it. */
export async function look(page, dx, dy, { settle = 40 } = {}) {
  await page.evaluate(([x, y]) => window.__NORTHSTAR__.input.applyLookDelta(x, y), [dx, dy]);
  await advance(page, settle);
}

/** Fire `rounds` discrete shots with a pause between each. */
export async function shoot(page, rounds = 1, { between = 200, hold: holdMs = 0, render = true } = {}) {
  for (let i = 0; i < rounds; i++) {
    if (holdMs > 0) {
      await hold(page, 'attack');
      await advance(page, holdMs, { render });
      await release(page, 'attack');
    } else {
      await tap(page, 'attack');
      await advance(page, 40, { render });
    }
    await advance(page, Math.max(0, between - 40), { render });
  }
}

/** Hold the trigger down for a simulated duration (automatic fire). */
export async function holdTrigger(page, ms, { render = true } = {}) {
  await burst(page, 'attack', ms, { pause: 120, render });
}

export async function reload(page, { settle = 3200 } = {}) {
  await tap(page, 'reload');
  await advance(page, settle);
}

export async function useKey(page, { settle = 120 } = {}) {
  await tap(page, 'use');
  await advance(page, settle);
}

/** Hold "use" for a simulated duration — the hostage secure action. */
export async function holdUse(page, ms = 2200) {
  await burst(page, 'use', ms, { pause: 200 });
}

// =========================================================================
// entering gameplay
// =========================================================================

/**
 * Get into PLAYING. Two routes, both supported and both exercised by the suite:
 *
 *   viaMenu: false (default) — the QA API drops straight into play. Fast and
 *            deterministic; used by every spec that is testing something else.
 *   viaMenu: true            — the real title -> menu -> difficulty -> briefing
 *            -> loadout -> loading -> playing chain, clicked through the DOM.
 *            `menu-flow.spec.js` proves this path works.
 */
export async function enterGameplay(page, opts = {}) {
  const {
    difficulty = 'operator',
    loadout = { primary: 'carbine', secondary: 'pistol', gadget: 'flash' },
    checkpoint = null,
    viaMenu = false,
    freezeAI = false,
    godMode = false,
  } = opts;

  if (viaMenu) await enterGameplayViaMenu(page, { difficulty, loadout });
  else await qa(page, 'forcePlay', { difficulty, loadout });

  await waitForMode(page, 'playing');
  // Let the draw animation finish and the first fixed steps run.
  await advance(page, 700);
  if (checkpoint) {
    const t = await qa(page, 'teleport', checkpoint);
    expect(t.ok, `teleport to ${checkpoint} failed: ${JSON.stringify(t)}`).toBe(true);
    await advance(page, 200);
  }
  // Always stated explicitly: a shared page means "not asked for" has to mean
  // "off", not "whatever the last scenario left behind".
  await qa(page, 'freezeAI', !!freezeAI);
  await qa(page, 'godMode', !!godMode);
  await qa(page, 'noclip', false);
  return state(page);
}

/**
 * Click the real menu chain, using the markup the UI actually builds:
 * title (click / any key) -> menu `[data-menu=deploy]` -> difficulty
 * `[data-difficulty=…]` + Continue -> briefing Continue -> loadout
 * `[data-weapon]` + Deploy -> loading -> playing.
 */
export async function enterGameplayViaMenu(page, { difficulty = 'operator', loadout = null } = {}) {
  await waitForMode(page, 'title', 30_000);
  // The title only proceeds once the level is built.
  await page.waitForFunction(() => window.__NORTHSTAR__?.ui?.levelReady === true, null, { timeout: 60_000 });
  await clickAny(page, ['#ui-root .screen-title.visible', '#ui-root .screen.visible'], { fallbackKey: 'Enter' });
  await waitForMode(page, 'menu', 20_000);

  await clickAny(page, ['#ui-root [data-menu="deploy"]'], { fallbackKey: 'Enter' });
  await waitForMode(page, 'difficulty', 20_000);

  await clickAny(page, [`#ui-root [data-difficulty="${difficulty}"]`, '#ui-root .difficulty-card']);
  await clickAny(page, ['#ui-root .screen-difficulty .btn.primary'], { fallbackKey: 'Enter' });
  await waitForMode(page, 'briefing', 20_000);

  await clickAny(page, ['#ui-root .screen-briefing .btn.primary'], { fallbackKey: 'Enter' });
  await waitForMode(page, 'loadout', 20_000);

  if (loadout) {
    for (const key of Object.values(loadout)) {
      // Not every slot is offered on the loadout screen, so a missing card is
      // not a failure — but a card that is present has to be clicked through the
      // same hit-test check as everything else.
      const sel = `#ui-root [data-weapon="${key}"]`;
      if (await page.locator(sel).first().isVisible().catch(() => false)) {
        await clickAny(page, [sel]);
      }
    }
  }
  await clickAny(page, ['#ui-root .screen-loadout .btn.primary'], { fallbackKey: 'Enter' });

  // `startMission` schedules the hand-off to `beginPlay` from the fixed step,
  // so the transition needs simulated time, not wall-clock time.
  await waitForMode(page, 'loading', 20_000).catch(() => {});
  for (let i = 0; i < 60 && (await gameMode(page)) !== 'playing'; i++) {
    await advance(page, 100);
  }
  await waitForMode(page, 'playing', 20_000);
}

/**
 * Click the first selector that resolves to a visible element; fall back to a
 * key press. The UI is another agent's file, so the harness stays tolerant of
 * its exact markup rather than hard-coding one button id.
 */
export async function clickAny(page, selectors, { fallbackKey = null, timeout = 4000, attempts = 8 } = {}) {
  // Two independent reasons a button may not be ready, and both need a nudge:
  // the screen fades in on the UI's own update, which only runs on the frames a
  // test asks for; and the compositor's hit-test regions only refresh when the
  // browser paints, which with the game's loop stopped it will not do on its
  // own. So each retry advances simulated time *and* lets the page paint, and
  // the check is not "is it visible" but "would a click at its centre actually
  // reach it" — see `settleUi` for what goes wrong otherwise.
  const why = new Map();
  for (let attempt = 0; attempt < attempts; attempt++) {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      try {
        if (await locator.isVisible({ timeout: 250 })) {
          const reach = await hitTest(page, locator);
          if (reach.reachable) {
            await locator.click({ timeout, force: true });
            return selector;
          }
          why.set(selector, `a click at its centre would hit ${reach.topElement} instead`);
        } else {
          why.set(selector, 'never became visible');
        }
      } catch (err) {
        why.set(selector, String(err.message).split('\n')[0]);
      }
    }
    await advance(page, 150);
    await settleUi(page);
  }
  if (fallbackKey) {
    await page.keyboard.press(fallbackKey);
    return `key:${fallbackKey}`;
  }
  const detail = selectors.map((s) => `  ${s} — ${why.get(s) || 'not found'}`).join('\n');
  throw new Error(`none of these selectors were clickable after ${attempts} attempts:\n${detail}`);
}

/**
 * Would a real mouse click at this element's centre actually land on it?
 *
 * Playwright's `force: true` dispatches a genuine mouse event at the element's
 * centre, so what receives it is whatever the compositor hit-tests there — which
 * is not always the element the locator matched. See `settleUi`.
 *
 * Takes a locator rather than a selector string so it works with Playwright's
 * own selector engines (`:has-text()` and friends are not CSS and would throw in
 * `querySelector`). An ancestor winning the hit test counts as unreachable: the
 * click would fire on the ancestor and never reach the button's own handler.
 */
export async function hitTest(page, locator) {
  const handle = await locator.elementHandle({ timeout: 250 }).catch(() => null);
  if (!handle) return { reachable: false, topElement: 'nothing (no such element)' };
  try {
    return await page.evaluate((node) => {
      const r = node.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return { reachable: false, topElement: 'nothing (zero-size box)' };
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const name = top
        ? `${top.tagName.toLowerCase()}${top.className ? `.${String(top.className).trim().split(/\s+/).join('.')}` : ''}`
        : 'nothing';
      return {
        reachable: !!top && (top === node || node.contains(top)),
        topElement: name.slice(0, 80),
      };
    }, handle);
  } finally {
    await handle.dispose().catch(() => {});
  }
}

/**
 * Press a real key through the browser (menus, Escape, fullscreen).
 *
 * Keys are delivered to the focused element and need no repaint, so this stays
 * cheap; it is `clickAny` that pays for a frame, because only a click has to
 * hit-test.
 */
export async function press(page, key, { settle = 80 } = {}) {
  await page.keyboard.press(key);
  await advance(page, settle);
}

// =========================================================================
// pixels
// =========================================================================

/**
 * Downscale the primary canvas and measure it. The renderer is created with
 * `preserveDrawingBuffer: true`, so the last rendered frame is readable.
 */
export async function canvasMetrics(page, { width = 192, height = 108 } = {}) {
  return page.evaluate(([w, h]) => {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return { ok: false, reason: 'no-canvas' };
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
    const variance = Math.max(0, sumSq / n - mean * mean);
    return {
      ok: true,
      width: w,
      height: h,
      drawingBuffer: [canvas.width, canvas.height],
      cssSize: [canvas.clientWidth, canvas.clientHeight],
      meanLuminance: +mean.toFixed(4),
      stdDev: +Math.sqrt(variance).toFixed(4),
      // Michelson contrast over the 1st/99th-ish percentiles the min/max give.
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

/** Assert the canvas is showing a real rendered image, not a flat clear colour. */
export async function expectCanvasHasContent(page, { minColours = 24, minStdDev = 0.012, label = 'canvas' } = {}) {
  const m = await canvasMetrics(page);
  expect(m.ok, `${label}: canvas unreadable`).toBe(true);
  expect(m.drawingBuffer[0], `${label}: drawing buffer has no width`).toBeGreaterThan(64);
  expect(
    m.distinctColours,
    `${label}: only ${m.distinctColours} distinct colours — the frame looks blank (${JSON.stringify(m)})`
  ).toBeGreaterThanOrEqual(minColours);
  expect(
    m.stdDev,
    `${label}: luminance std dev ${m.stdDev} — the frame looks flat (${JSON.stringify(m)})`
  ).toBeGreaterThan(minStdDev);
  return m;
}

// =========================================================================
// screenshots
// =========================================================================

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Capture a named screenshot into `artifacts/screenshots/` and return its
 * luminance/contrast measurements so the caller can audit the image without
 * looking at it.
 */
export async function shot(page, name, { dir = SCREENSHOT_DIR, fullPage = false } = {}) {
  ensureDir(dir);
  const safe = String(name).replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
  const file = path.join(dir, `${safe}.png`);
  const metrics = await canvasMetrics(page);
  await page.screenshot({ path: file, fullPage });
  return { name: safe, path: file, relative: path.relative(process.cwd(), file), metrics };
}

/** Write a machine-readable artifact next to the screenshots. */
export function writeArtifact(relativeName, data) {
  ensureDir(ARTIFACT_DIR);
  const file = path.join(ARTIFACT_DIR, relativeName);
  ensureDir(path.dirname(file));
  const body = typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(file, body);
  return file;
}

// =========================================================================
// small assertions shared between specs
// =========================================================================

/** The documented `render_game_to_text()` contract. */
export const STATE_SCHEMA = 'northstar.state/1';

export function expectStateSchema(s) {
  expect(s.schema).toBe(STATE_SCHEMA);
  expect(s.coordinateSystem).toBeTruthy();
  expect(s.coordinateSystem.units).toBe('metres');
  expect(typeof s.coordinateSystem.axes).toBe('string');
  expect(typeof s.coordinateSystem.yaw).toBe('string');
  expect(typeof s.gameMode).toBe('string');
  expect(typeof s.levelReady).toBe('boolean');
  expect(typeof s.simTime).toBe('number');
  expect(typeof s.frame).toBe('number');
}

export function expectGameplayState(s) {
  expectStateSchema(s);
  expect(s.gameMode, `expected gameplay, got "${s.gameMode}"`).toBe('playing');
  expect(s.player, 'no player block in state').toBeTruthy();
  expect(Array.isArray(s.player.position)).toBe(true);
  expect(s.weapon, 'no weapon block in state').toBeTruthy();
  expect(s.mission, 'no mission block in state').toBeTruthy();
  expect(s.hostages, 'no hostages block in state').toBeTruthy();
  expect(s.enemies, 'no enemies block in state').toBeTruthy();
  expect(s.hud, 'no hud block in state').toBeTruthy();
}

/**
 * The last trigger pull's hit records. `CombatSystem` stores world-geometry
 * points as `THREE.Vector3` and character points as plain arrays, so this
 * normalises both to `[x, y, z]`.
 */
export async function shotRecords(page) {
  return page.evaluate(() => {
    const pt = (p) => {
      if (!p) return null;
      if (Array.isArray(p)) return p.map((n) => +n.toFixed(3));
      if (typeof p.x === 'number') return [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)];
      return null;
    };
    return (window.__NORTHSTAR__.combat?.lastShot || []).map((h) => ({
      type: h.type ?? null,
      kind: h.kind ?? null,
      region: h.region ?? null,
      headshot: !!h.headshot,
      killed: !!h.killed,
      damage: h.damage ?? null,
      distance: h.distance ?? null,
      surface: h.surface ?? null,
      point: pt(h.point),
    }));
  });
}

/** Live decal count, so a spec can prove a shot left a mark. */
export async function decalCount(page) {
  return page.evaluate(() => window.__NORTHSTAR__.decals?.active?.length ?? -1);
}

export function distance2d(a, b) {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

export function wrapAngle(a) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

export default {
  bootGame, enterGameplay, enterGameplayViaMenu, state, advance, burst, look,
  shoot, shot, expectNoConsoleErrors, qa, digest, canvasMetrics,
};
