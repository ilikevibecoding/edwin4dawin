import { expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Shared Playwright helpers.
 * Owner: Opus 4.
 *
 * The golden rule for this suite: never assert only on the title screen.
 * `enterGameplay()` always lands in the real simulation, and every capture
 * pairs a PNG with the matching `render_game_to_text()` payload so a reviewer
 * can see whether the picture and the state agree.
 */

export const SHOT_DIR = 'screenshots';

export function shotPath(group, name) {
  const dir = path.join(SHOT_DIR, group);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${name}.png`);
}

export async function gotoGame(page, query = '') {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto(`/${query}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function', null, { timeout: 60000 });
  page.__errors = errors;
  return errors;
}

export async function waitForLevel(page, timeout = 180000) {
  await page.waitForFunction(() => window.__northstar?.ready?.() === true, null, { timeout });
}

/** Drive the real menu flow into gameplay, or use the fast path for bulk tests. */
export async function enterGameplay(page, { difficulty = 'operator', loadout = 'assault', viaMenu = false } = {}) {
  if (viaMenu) {
    await page.getByTestId('btn-begin').click();
    await page.getByTestId(`btn-difficulty-${difficulty}`).click();
    await page.getByTestId(`btn-loadout-${loadout}`).click();
    await page.getByTestId('btn-deploy').click();
  } else {
    await waitForLevel(page);
    await page.evaluate(async ([d, l]) => {
      await window.__northstar.game.start({ difficulty: d, loadout: l });
    }, [difficulty, loadout]);
  }
  await page.waitForFunction(() => {
    const s = JSON.parse(window.render_game_to_text());
    return s.gameMode === 'playing' && s.levelReady;
  }, null, { timeout: 180000 });
  await page.evaluate(() => window.advanceTime(300));
}

export async function state(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
}

export async function advance(page, ms) {
  await page.evaluate((v) => window.advanceTime(v), ms);
}

/** Short input burst followed by a deliberate pause, per the mandated loop. */
export async function burst(page, fn, holdMs = 260, settleMs = 320) {
  await page.evaluate(fn);
  await advance(page, holdMs);
  await page.evaluate(() => window.__northstar.helpers.releaseAll());
  await advance(page, settleMs);
}

export async function qa(page, method, ...args) {
  return page.evaluate(([m, a]) => {
    const fn = window.__northstar.qa[m];
    if (typeof fn !== 'function') throw new Error(`qa.${m} is not a function`);
    return fn.apply(window.__northstar.qa, a);
  }, [method, args]);
}

export async function teleport(page, checkpoint, yaw) {
  return qa(page, 'teleport', checkpoint, yaw !== undefined ? { yaw } : {});
}

export async function capture(page, group, name, { withState = true } = {}) {
  // Let the renderer settle so the screenshot matches the reported state.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const file = shotPath(group, name);
  // Software rasterisation needs a long leash for a full frame.
  await page.screenshot({ path: file, animations: 'disabled', timeout: 240_000 });
  if (withState) {
    const s = await state(page);
    fs.writeFileSync(file.replace(/\.png$/, '.json'), JSON.stringify(s, null, 2));
    return { file, state: s };
  }
  return { file };
}

export function expectNoConsoleErrors(page, allow = []) {
  const errs = (page.__errors ?? []).filter((e) => !allow.some((a) => e.includes(a)));
  expect(errs, `console errors:\n${errs.join('\n')}`).toEqual([]);
}

export async function collectRuntimeErrors(page) {
  return page.evaluate(() => window.__northstar.errors.slice());
}

export function writeReport(name, data) {
  fs.mkdirSync('test-results/reports', { recursive: true });
  fs.writeFileSync(path.join('test-results/reports', `${name}.json`), JSON.stringify(data, null, 2));
}
