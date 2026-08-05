import { test, expect } from '@playwright/test';
import { boot } from './helpers.js';

/**
 * Balance tests.
 *
 * Individual engagements are deliberately not certain - a marginal shot can
 * slip outside the fuse radius - so correctness is asserted statistically:
 * each battery has to land inside its intended band of single-shot success and
 * intercept at the altitude its role implies.
 */

test('battery hit rates and intercept altitudes match their roles', async ({ page }) => {
  test.setTimeout(600_000);
  await boot(page);

  const results = {};
  for (const [battery, engageAfter] of [
    ['vanguard', 22], ['highlance', 6], ['sentinel', 6],
  ]) {
    results[battery] = await page.evaluate(
      ([b, after]) => window.__GAME.runTrials(12, {
        battery: b, scenario: 'single', engageAfter: after, seed: 4000,
      }),
      [battery, engageAfter],
    );
    console.log(battery, JSON.stringify(results[battery]));
  }

  // Every trial must actually get a round away: an assignment that is never
  // accepted, or a battery that never reaches ready, is a bug not a balance
  // question.
  for (const b of Object.keys(results)) {
    expect(results[b].fired, `${b} fired in every trial`).toBe(results[b].n);
  }

  // Intended progression: fast-reacting terminal battery is the least precise,
  // the long-range showcase battery the most.
  expect(results.vanguard.hitRate).toBeGreaterThanOrEqual(0.5);
  expect(results.vanguard.hitRate).toBeLessThanOrEqual(0.95);
  expect(results.highlance.hitRate).toBeGreaterThanOrEqual(0.7);
  expect(results.sentinel.hitRate).toBeGreaterThanOrEqual(0.8);

  // Each battery must own a distinct slice of the sky.
  expect(results.vanguard.medKillAlt).toBeLessThan(9000);
  expect(results.highlance.medKillAlt).toBeGreaterThan(6000);
  expect(results.sentinel.medKillAlt).toBeGreaterThan(8000);
});

test('saturation scenario stays engageable across a raid', async ({ page }) => {
  test.setTimeout(600_000);
  await boot(page);
  const r = await page.evaluate(() => window.__GAME.runTrials(6, {
    battery: 'highlance', scenario: 'saturation', engageAfter: 6, seed: 8100,
  }));
  console.log('saturation', JSON.stringify(r));
  expect(r.fired).toBe(r.n);
  expect(r.kills).toBeGreaterThanOrEqual(4);
});
