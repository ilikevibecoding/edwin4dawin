// gameplay.spec.js — deterministic end-to-end gameplay tests via window.__game.
import { test, expect } from '@playwright/test';
import { boot, step, state, stepUntil, filterBenignErrors } from './helpers.js';

test.describe('IRONVEIL gameplay', () => {
  test('boots clean with sane perf budgets', async ({ page }) => {
    const errors = await boot(page);
    await step(page, 2);
    const perf = await page.evaluate(() => window.__game.perf());
    expect(filterBenignErrors(errors)).toEqual([]);
    expect(perf.calls).toBeGreaterThan(10);
    expect(perf.calls).toBeLessThan(1100);
    expect(perf.triangles).toBeLessThan(3_000_000);
    const s = await state(page);
    expect(s.phase).toBe('idle');
    expect(s.batteries.length).toBe(3);
  });

  test('SINGLE TRACK: radar detects, autoplay intercepts, debrief opens', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__game.seed(4242);
      window.__game.start('single');
      window.__game.autoplay(true);
    });
    // a track must appear (radar sweep) within 20s of game time
    const tracked = await stepUntil(page, (s) => s.tracks.length >= 1, 20);
    expect(tracked.ok, 'radar should produce a track').toBe(true);

    // scenario should complete (intercept or impact) inside 120s game time
    const done = await stepUntil(page, (s) => s.phase === 'debrief', 120, 33.34, 2.5);
    expect(done.ok, 'scenario should reach debrief').toBe(true);
    expect(done.state.stats.threatsTotal).toBe(1);
    expect(done.state.stats.launches).toBeGreaterThanOrEqual(1);
    // with sweet-spot autoplay the single threat should die before the ground
    expect(done.state.stats.intercepted).toBe(1);
    expect(done.state.stats.impactsOnBase).toBe(0);
    // debrief modal visible in DOM
    await expect(page.locator('#db-grade')).toBeVisible();
  });

  test('SATURATION: multiple threats, several engagements resolve', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__game.seed(777);
      window.__game.start('saturation');
      window.__game.autoplay(true);
    });
    const done = await stepUntil(page, (s) => s.phase === 'debrief', 200, 33.34, 2.5);
    expect(done.ok, 'saturation should finish').toBe(true);
    expect(done.state.stats.threatsTotal).toBeGreaterThanOrEqual(3);
    expect(done.state.stats.threatsTotal).toBeLessThanOrEqual(5);
    expect(done.state.stats.launches).toBeGreaterThanOrEqual(2);
    expect(done.state.stats.intercepted).toBeGreaterThanOrEqual(1);
    // every threat accounted for
    const st = done.state.stats;
    expect(st.intercepted + st.impacts + st.wastedOnDecoys).toBeGreaterThanOrEqual(st.threatsTotal - st.decoys);
  });

  test('NIGHT RAID: forces night, decoys present', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__game.seed(1313);
      window.__game.start('nightraid');
      window.__game.autoplay(true);
    });
    let s = await state(page);
    expect(s.timeOfDay).toBe('night');
    const done = await stepUntil(page, (s2) => s2.phase === 'debrief', 220, 33.34, 2.5);
    expect(done.ok).toBe(true);
    expect(done.state.stats.decoys).toBeGreaterThanOrEqual(2);
    expect(done.state.stats.threatsTotal).toBeGreaterThanOrEqual(5);
  });

  test('manual engagement via console DOM controls', async ({ page }) => {
    // the console view renders the full C2 interior + PPI canvas uploads every
    // stepped frame — much heavier than outdoor tests under SwiftShader CI
    test.setTimeout(420_000);
    await boot(page);
    await page.evaluate(() => window.__game.openConsole());
    await step(page, 0.5);
    await expect(page.locator('#console-panel')).toBeVisible();

    // choose scenario + battery through the real UI
    await page.click('#opt-scenario button[data-id="single"]');
    await page.click('#opt-battery button[data-id="thaad"]');
    await page.evaluate(() => window.__game.seed(9001));
    await page.click('#btn-start');
    let s = await state(page);
    expect(s.phase).toBe('active');

    const tracked = await stepUntil(page, (s2) => s2.tracks.length >= 1, 25);
    expect(tracked.ok).toBe(true);

    // select track in the list, assign, authorize
    await page.click('#track-list button');
    await step(page, 0.2);
    await page.click('#btn-assign');
    await step(page, 0.2);
    s = await state(page);
    expect(s.assignment).not.toBeNull();
    await page.click('#btn-authorize');
    const launched = await stepUntil(page, (s2) => s2.interceptors.length >= 1 || s2.stats.launches >= 1, 15);
    expect(launched.ok, 'interceptor should launch after authorization').toBe(true);
    // engagement hint should be informative
    expect((await state(page)).engageHint.length).toBeGreaterThan(4);
  });

  test('assignment validation gives feedback and battery states cycle', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__game.seed(555);
      window.__game.start('single');
    });
    const tracked = await stepUntil(page, (s) => s.tracks.length >= 1, 25);
    expect(tracked.ok).toBe(true);
    const trackId = tracked.state.tracks[0].id;
    // assign with the sentinel: early high threat should be valid or at least produce a hint
    const ok = await page.evaluate((tid) => window.__game.assign(tid, 'sentinel'), trackId);
    const s1 = await state(page);
    expect(typeof ok).toBe('boolean');
    expect(s1.engageHint.length).toBeGreaterThan(4);
    if (ok) {
      await page.evaluate(() => window.__game.authorize());
      const fired = await stepUntil(page, (s) => s.stats.launches >= 1, 20);
      expect(fired.ok).toBe(true);
      // battery must go to RELOADING then eventually READY/EMPTY
      const reload = await stepUntil(
        page,
        (s) => {
          const b = s.batteries.find((b2) => b2.id === 'sentinel');
          return b.state === 'RELOADING' || b.state === 'READY' || b.state === 'EMPTY';
        },
        20
      );
      expect(reload.ok).toBe(true);
    }
  });

  test('restart resets cleanly', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__game.seed(31337);
      window.__game.start('single');
      window.__game.autoplay(true);
    });
    const done = await stepUntil(page, (s) => s.phase === 'debrief', 150, 33.34, 2.5);
    expect(done.ok).toBe(true);
    await page.evaluate(() => window.__game.restart());
    const s = await state(page);
    expect(s.phase).toBe('active');
    expect(s.stats.threatsTotal + s.threatsPending + s.threatsActive).toBeGreaterThanOrEqual(1);
    const done2 = await stepUntil(page, (s2) => s2.phase === 'debrief', 150, 33.34, 2.5);
    expect(done2.ok, 'restarted scenario should also finish').toBe(true);
  });
});
