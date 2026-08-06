import { test, expect } from '@playwright/test';
import { boot, advance, snapshot, perf } from './helpers.js';

/**
 * Performance budget.
 *
 * CI has no GPU, so frames go through SwiftShader and measured FPS is
 * meaningless. What is meaningful, and what these tests guard, is the work the
 * frame asks for: draw calls, triangle counts, simulation cost per frame, and
 * whether pooling actually holds under a saturation raid.
 */

const BUDGET = {
  drawCalls: 900,       // whole composited frame, all passes
  triangles: 1_400_000,
  simMsPerFrame: 4.0,   // CPU simulation only, excluding render
  programs: 120,
};

/** Measure simulation cost per frame, with rendering excluded. */
async function measureSim(page, seconds = 4) {
  return page.evaluate((s) => {
    const dt = 1 / 60;
    const n = Math.round(s / dt);
    // Warm up so the first-call cost is not attributed to the steady state.
    for (let i = 0; i < 30; i++) window.__AEGIS.step(dt, true);
    const t0 = performance.now();
    for (let i = 0; i < n; i++) window.__AEGIS.step(dt, true);
    const total = performance.now() - t0;
    return { msPerFrame: total / n, frames: n };
  }, seconds);
}

test.describe('performance', () => {
  test.describe.configure({ timeout: 400_000 });

  test('idle site stays inside the frame budget', async ({ page }) => {
    await boot(page);
    await advance(page, 2);
    await page.evaluate(() => window.__GAME.renderOnce());
    const p = await perf(page);
    console.log('idle perf', JSON.stringify(p));
    expect(p.calls).toBeLessThan(BUDGET.drawCalls);
    expect(p.triangles).toBeLessThan(BUDGET.triangles);
    expect(p.programs).toBeLessThan(BUDGET.programs);

    const sim = await measureSim(page, 4);
    console.log('idle sim', JSON.stringify(sim));
    expect(sim.msPerFrame).toBeLessThan(BUDGET.simMsPerFrame);
  });

  test('saturation raid with rounds in flight stays inside budget', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__GAME.setScenario('saturation');
      window.__GAME.selectBattery('highlance');
      window.__GAME.start(5150);
    });
    // Put several rounds up at once.
    await advance(page, 8);
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.__GAME.autoEngage('highlance'));
      await advance(page, 4);
      await page.evaluate(() => window.__GAME.authorize());
      await advance(page, 1.5);
    }
    const snap = await snapshot(page);
    console.log('in flight', snap.interceptors.length, 'threats', snap.threats.length);

    await page.evaluate(() => window.__GAME.renderOnce());
    const p = await perf(page);
    console.log('raid perf', JSON.stringify(p));
    expect(p.calls).toBeLessThan(BUDGET.drawCalls);
    expect(p.triangles).toBeLessThan(BUDGET.triangles);

    const sim = await measureSim(page, 4);
    console.log('raid sim', JSON.stringify(sim));
    expect(sim.msPerFrame).toBeLessThan(BUDGET.simMsPerFrame);
  });

  test('pools hold: particle and object counts stay bounded', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__GAME.setScenario('saturation');
      window.__GAME.start(6161);
    });
    // Run several full engagements back to back and watch the ceilings.
    const peaks = { smoke: 0, dust: 0, hot: 0, sparks: 0, debris: 0, trails: 0 };
    for (let i = 0; i < 4; i++) {
      await page.evaluate((seed) => window.__GAME.runTrial({
        battery: 'highlance', scenario: 'saturation', seed, engageAfter: 6,
      }), 700 + i * 11);
      const p = await perf(page);
      for (const k of Object.keys(peaks)) peaks[k] = Math.max(peaks[k], p.particles[k]);
    }
    console.log('pool peaks', JSON.stringify(peaks));
    // Capacities come from the quality preset; nothing may exceed them.
    const caps = await page.evaluate(() => ({
      smoke: window.__AEGIS.effects.smoke.capacity,
      dust: window.__AEGIS.effects.dust.capacity,
      hot: window.__AEGIS.effects.hot.capacity,
      sparks: window.__AEGIS.effects.sparks.capacity,
      debris: window.__AEGIS.effects.debris.capacity,
      trails: window.__AEGIS.effects.trails.live.length
        + window.__AEGIS.effects.trails.free.length,
    }));
    for (const k of Object.keys(peaks)) {
      expect(peaks[k], `${k} stayed inside its pool`).toBeLessThanOrEqual(caps[k]);
    }

    // Geometry and texture counts must not creep across repeated scenarios.
    const before = await perf(page);
    for (let i = 0; i < 3; i++) {
      await page.evaluate((s) => window.__GAME.restart(s), 900 + i);
      await advance(page, 12);
    }
    const after = await perf(page);
    console.log('resources before/after', before.geometries, after.geometries,
      before.textures, after.textures);
    expect(after.geometries).toBeLessThanOrEqual(before.geometries + 4);
    expect(after.textures).toBeLessThanOrEqual(before.textures + 4);
  });
});
