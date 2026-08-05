/**
 * Shared Playwright helpers.
 *
 * All game control goes through `window.__GAME`, the test API installed by
 * main.js. `advance()` steps the simulation in fixed increments so results are
 * identical run to run for a given seed, independent of machine speed.
 */

import fs from 'node:fs';
import path from 'node:path';

export const SHOT_DIR = path.resolve('test-results/shots');
export const ART_DIR = process.env.AEGIS_ARTIFACT_DIR || '/opt/cursor/artifacts';

export function ensureDirs() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
}

/** Load the page, wait for boot, and collect console/page errors. */
export async function boot(page, { query = '', reducedMotion = false } = {}) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message));

  await page.goto('/' + query, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 120_000 });
  await page.evaluate((rm) => {
    window.__GAME.setAudio(false);
    if (rm) window.__GAME.setReducedMotion(true);
    window.__GAME.enter();
    window.__GAME.setPaused(true);   // tests drive the sim explicitly
  }, reducedMotion);
  return errors;
}

/**
 * Advance the simulation deterministically and return the snapshot.
 * Rendering is skipped by default; call `shot()` (which renders first) when a
 * frame actually needs to be captured.
 */
export async function advance(page, seconds, stepMs = 1000 / 60, render = false) {
  return page.evaluate(
    ([s, st, r]) => window.__GAME.advance(s, st, r), [seconds, stepMs, render],
  );
}

export async function snapshot(page) {
  return page.evaluate(() => window.__GAME.snapshot());
}

export async function perf(page) {
  return page.evaluate(() => window.__GAME.perf());
}

/** Save a screenshot into the run folder (and optionally the artifact folder). */
export async function shot(page, name, { artifact = false } = {}) {
  ensureDirs();
  await page.evaluate(() => window.__GAME.renderOnce());
  const file = path.join(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file });
  if (artifact) {
    fs.mkdirSync(ART_DIR, { recursive: true });
    fs.copyFileSync(file, path.join(ART_DIR, `${name}.png`));
  }
  return file;
}

/** Advance until a battery reports ready (or the budget runs out). */
export async function waitForReady(page, battery, maxSeconds = 16, chunk = 1.0) {
  let waited = 0;
  while (waited < maxSeconds) {
    const snap = await advance(page, chunk);
    const b = snap.batteries.find((x) => x.id === battery);
    if (b && b.state === 'ready') return { ready: true, waited, battery: b };
    waited += chunk;
  }
  const snap = await snapshot(page);
  return { ready: false, waited, battery: snap.batteries.find((x) => x.id === battery) };
}

/**
 * Run an engagement: start the scenario, wait for a track, engage with the
 * given battery, wait out its prep, authorize, and fly the round to a result.
 */
export async function engage(page, {
  scenario = 'single', condition = 'day', battery = 'highlance', seed = 20240601,
  acquireTime = 8, prepTime = 16, flightTime = 26,
} = {}) {
  await page.evaluate(([sc, cond, bat, sd]) => {
    window.__GAME.setCondition(cond);
    window.__GAME.setScenario(sc);
    window.__GAME.selectBattery(bat);
    window.__GAME.start(sd);
  }, [scenario, condition, battery, seed]);

  await advance(page, acquireTime);
  const assigned = await page.evaluate((b) => window.__GAME.autoEngage(b), battery);
  const ready = await waitForReady(page, battery, prepTime);
  const fired = await page.evaluate(() => window.__GAME.authorize());
  const result = await advance(page, flightTime);
  return { assigned, ready, fired, result };
}
