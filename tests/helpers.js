// Shared Playwright helpers: boot the game, collect console errors, drive
// deterministic time, take evidence screenshots.
import fs from 'node:fs';
import path from 'node:path';

export const SHOT_DIR = 'screenshots';

export function watchErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
  return errors;
}

export function filterRealErrors(errors) {
  // GPU/driver noise from headless SwiftShader is not a game bug
  return errors.filter((e) =>
    !e.includes('GroupMarkerNotSet') &&
    !e.includes('Automatic fallback to software WebGL') &&
    !e.includes('GPU stall') &&
    !e.includes('Pass-through is not supported') &&
    !e.includes('swiftshader'));
}

export async function bootToTitle(page, opts = {}) {
  const q = [];
  if (opts.qa) q.push('qa=1');
  if (opts.lowspec !== false) q.push('lowspec=1');
  await page.goto('/' + (q.length ? '?' + q.join('&') : ''));
  await page.waitForFunction(() => window.NSR && window.NSR.state === 'title', null, { timeout: 60_000 });
}

// Boot straight into gameplay using the QA quick start.
export async function bootToGameplay(page, opts = {}) {
  await bootToTitle(page, { qa: true, ...opts });
  await page.evaluate(({ difficulty, primary }) => window.__qa.start(difficulty, primary),
    { difficulty: opts.difficulty || 'operative', primary: opts.primary || 'bdr15' });
  await page.waitForFunction(() => window.NSR.state === 'playing', null, { timeout: 30_000 });
  // deterministic time + let the weapon draw finish
  await page.evaluate(() => window.advanceTime(800));
}

export async function state(page) {
  return await page.evaluate(() => window.render_game_to_text());
}

export async function advance(page, ms) {
  return await page.evaluate((m) => window.advanceTime(m), ms);
}

export async function shot(page, name) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') });
}

// hold a key for N simulated ms (deterministic)
export async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await advance(page, ms);
  await page.keyboard.up(key);
  await advance(page, 30);
}

export async function teleport(page, checkpoint) {
  const res = await page.evaluate((c) => window.__qa.teleport(c), checkpoint);
  if (!res.ok) throw new Error('teleport failed: ' + JSON.stringify(res));
  await advance(page, 50);
}
