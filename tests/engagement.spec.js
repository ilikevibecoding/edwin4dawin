import { test, expect } from '@playwright/test';
import { boot, advance, snapshot, shot, engage } from './helpers.js';

/**
 * Gameplay tests. Each one drives the full loop through the test API with a
 * pinned seed, so the same shot is fired at the same track every run.
 */

test.describe('engagement loop', () => {
  test('single track: acquire, classify, assign, launch, intercept', async ({ page }) => {
    const errors = await boot(page);

    await page.evaluate(() => {
      window.__GAME.setCondition('day');
      window.__GAME.setScenario('single');
      window.__GAME.selectBattery('highlance');
      window.__GAME.start(20240601);
    });

    // Threat should spawn and be acquired by the sweep.
    let snap = await advance(page, 8);
    expect(snap.threats.length, 'threat spawned').toBe(1);
    expect(snap.tracks.length, 'radar acquired the track').toBeGreaterThan(0);
    expect(snap.tracks[0].classified, 'ballistic track classified').toBe(true);
    expect(snap.threats[0].alt).toBeGreaterThan(5000);

    // Assign and authorize.
    const assigned = await page.evaluate(() => window.__GAME.autoEngage('highlance'));
    expect(assigned, 'engagement accepted').not.toBeNull();
    snap = await snapshot(page);
    expect(snap.batteries.find((b) => b.id === 'highlance').assigned).toBe(assigned.track);

    // Battery must finish prep (train + elevate) before it will fire.
    snap = await advance(page, 6);
    const bat = snap.batteries.find((b) => b.id === 'highlance');
    expect(bat.state, 'battery reached ready').toBe('ready');
    expect(bat.elevation, 'launcher elevated').toBeGreaterThan(60);

    const fired = await page.evaluate(() => window.__GAME.authorize());
    expect(fired, 'launch authorized').toBe(true);
    snap = await snapshot(page);
    expect(snap.interceptors.length, 'round in flight').toBe(1);
    expect(snap.stats.roundsFired).toBe(1);

    // Interceptor should boost, climb and then resolve the engagement.
    snap = await advance(page, 4);
    expect(snap.interceptors[0].alt, 'interceptor climbing').toBeGreaterThan(400);
    expect(['BOOST', 'SUSTAIN', 'TIP-OFF']).toContain(snap.interceptors[0].phase);

    snap = await advance(page, 40);
    const resolved = snap.stats.intercepted + snap.stats.misses;
    expect(resolved, 'engagement resolved').toBeGreaterThan(0);
    expect(snap.stats.intercepted, 'target destroyed').toBe(1);
    expect(snap.lastResult).toContain('INTERCEPTED');
    expect(errors, errors.join(' | ')).toEqual([]);
  });

  test('saturation: multiple tracks on separate arcs', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__GAME.setScenario('saturation');
      window.__GAME.start(777001);
    });
    const snap = await advance(page, 24);
    expect(snap.threats.length).toBeGreaterThanOrEqual(3);
    // Arcs must be visually separated, not stacked on one bearing.
    const bearings = await page.evaluate(() => window.__GAME.snapshot().threats.map((t) => t.range));
    expect(new Set(bearings).size).toBeGreaterThan(1);
    expect(snap.tracks.length).toBeGreaterThanOrEqual(3);
  });

  test('night raid forces night and includes unconfirmed returns', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__GAME.setScenario('night');
      window.__GAME.start(4242);
    });
    let snap = await snapshot(page);
    expect(snap.condition).toBe('night');
    snap = await advance(page, 26);
    const decoys = snap.threats.filter((t) => t.decoy);
    expect(decoys.length, 'decoys present').toBeGreaterThan(0);
    // Decoys must never classify: that ambiguity is the point of the scenario.
    const decoyTracks = snap.tracks.filter((t) => t.label === 'UNCONFIRMED');
    expect(decoyTracks.length).toBeGreaterThan(0);
  });

  test('battery envelopes gate assignment differently', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__GAME.setScenario('single');
      window.__GAME.start(31337);
    });
    // Early in the arc the target is high: the terminal battery must refuse it
    // while the high-altitude battery accepts.
    await advance(page, 7);
    const vanguardEarly = await page.evaluate(() => {
      window.__GAME.selectBattery('vanguard');
      return window.__GAME.assign();
    });
    const lanceEarly = await page.evaluate(() => {
      window.__GAME.selectBattery('highlance');
      return window.__GAME.assign();
    });
    expect(vanguardEarly, 'terminal battery rejects a high target').toBe(false);
    expect(lanceEarly, 'high-altitude battery accepts it').toBe(true);
  });

  // Each battery gets its own test: a shared page across three full
  // engagements is slow on a software rasteriser and hides which one failed.
  for (const [battery, seed, altBand] of [
    ['vanguard', 5001, [500, 9000]],
    ['highlance', 5002, [6000, 20000]],
    ['sentinel', 5003, [7000, 30000]],
  ]) {
    test(`${battery} completes an engagement`, async ({ page }) => {
      await boot(page);
      // The terminal battery waits for the target to descend into its
      // envelope; the long-range batteries engage as soon as the track is up.
      const acquireTime = battery === 'vanguard' ? 26 : 8;
      const r = await engage(page, {
        battery, seed, scenario: 'single', condition: 'day',
        acquireTime, prepTime: 16, flightTime: 34,
      });
      expect(r.assigned, 'accepted an assignment').not.toBeNull();
      expect(r.ready.ready, 'reached ready').toBe(true);
      expect(r.fired, 'fired').toBe(true);
      const s = r.result.stats;
      expect(s.roundsFired, 'consumed a round').toBeGreaterThan(0);
      // Individual shots can miss by design; what must always hold is that the
      // round resolved into one of the four results the player is shown. Hit
      // rates themselves are asserted statistically in balance.spec.js.
      expect(s.intercepted + s.misses + s.impacted,
        'produced a definitive result').toBeGreaterThan(0);
      // A pooled round that inherited stale termination state used to
      // self-destruct at launch, which showed up as a kilometre-scale miss.
      if (s.intercepted > 0) {
        const alt = Number((r.result.lastResult.match(/([\d.]+)KM ALT/) || [])[1]) * 1000;
        expect(alt, `intercept altitude in the ${battery} band`)
          .toBeGreaterThanOrEqual(altBand[0]);
        expect(alt).toBeLessThanOrEqual(altBand[1]);
      }
      console.log(battery, 'result:', r.result.lastResult);
    });
  }

  test('restart clears the field and replays deterministically', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => { window.__GAME.setScenario('saturation'); window.__GAME.start(9090); });
    const a = await advance(page, 20);
    await page.evaluate(() => window.__GAME.restart(9090));
    const fresh = await snapshot(page);
    expect(fresh.threats.length).toBe(0);
    expect(fresh.interceptors.length).toBe(0);
    expect(fresh.stats.roundsFired).toBe(0);
    const b = await advance(page, 20);
    // Same seed must reproduce the same geometry.
    expect(b.threats.map((t) => t.range)).toEqual(a.threats.map((t) => t.range));
  });
});
