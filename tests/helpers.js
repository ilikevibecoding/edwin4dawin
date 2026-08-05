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

/** Advance the simulation deterministically and return the snapshot. */
export async function advance(page, seconds, stepMs = 1000 / 60) {
  return page.evaluate(([s, st]) => window.__GAME.advance(s, st), [seconds, stepMs]);
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
  const file = path.join(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file });
  if (artifact) {
    fs.mkdirSync(ART_DIR, { recursive: true });
    fs.copyFileSync(file, path.join(ART_DIR, `${name}.png`));
  }
  return file;
}

/**
 * Run an engagement: start the scenario, wait for a track, engage with the
 * given battery, and advance until the round resolves.
 */
export async function engage(page, {
  scenario = 'single', condition = 'day', battery = 'highlance', seed = 20240601,
  acquireTime = 8, prepTime = 6, flightTime = 26,
} = {}) {
  await page.evaluate(([sc, cond, bat, sd]) => {
    window.__GAME.setCondition(cond);
    window.__GAME.setScenario(sc);
    window.__GAME.selectBattery(bat);
    window.__GAME.start(sd);
  }, [scenario, condition, battery, seed]);

  await advance(page, acquireTime);
  const assigned = await page.evaluate((b) => window.__GAME.autoEngage(b), battery);
  await advance(page, prepTime);
  const fired = await page.evaluate(() => window.__GAME.authorize());
  const result = await advance(page, flightTime);
  return { assigned, fired, result };
}
