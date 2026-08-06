import { test, expect } from '@playwright/test';
import { boot, advance, snapshot, shot, waitForReady } from './helpers.js';

/**
 * Visual capture pass.
 *
 * Walks the site, opens the console and flies a full engagement in each light
 * condition, saving a frame at each beat. These images are the input to the
 * self-evaluation loop recorded in PROGRESS.md.
 */

test.describe('visual capture', () => {
  test.describe.configure({ timeout: 600_000 });

  test('site tour in daylight', async ({ page }) => {
    await boot(page);
    await advance(page, 2);

    // Standing on the apron looking at the pads.
    await shot(page, 'day-01-spawn');

    // Sky: the operating area has to have an unobstructed view upward.
    await page.evaluate(() => {
      window.__GAME.teleport(7, 40, 0.05, 0.62);
    });
    await advance(page, 0.6);
    await shot(page, 'day-01b-sky');

    // Command shelter exterior.
    await page.evaluate(() => {
      window.__GAME.teleport(-6, 30, -0.9);
      window.__GAME.lookAt(-22, 3, 18);
    });
    await advance(page, 0.6);
    await shot(page, 'day-02-shelter');

    // Radar installation.
    await page.evaluate(() => {
      window.__GAME.teleport(18, 8, 0);
      window.__GAME.lookAt(30, 6, 4);
    });
    await advance(page, 0.6);
    await shot(page, 'day-03-radar');

    // Each battery, close up.
    const spots = [
      ['vanguard', -44, -26, -62, 5, -38],
      ['highlance', 48, -32, 66, 6, -46],
      ['sentinel', -14, -88, 4, 8, -104],
    ];
    for (const [name, px, pz, tx, ty, tz] of spots) {
      await page.evaluate(([a, b, c, d, e]) => {
        window.__GAME.teleport(a, b, 0);
        window.__GAME.lookAt(c, d, e);
      }, [px, pz, tx, ty, tz]);
      await advance(page, 0.6);
      await shot(page, `day-04-${name}`);
    }
  });

  test('command console', async ({ page }) => {
    await boot(page);
    // Walk into the shelter and stand at the console.
    await page.evaluate(() => {
      window.__GAME.setScenario('saturation');
      window.__GAME.start(31415);
    });
    await advance(page, 14);
    await page.evaluate(() => {
      window.__GAME.teleport(-23, 15, 0.1);
      window.__GAME.lookAt(-23.5, 1.6, 13.5);
    });
    await advance(page, 0.5);
    await shot(page, 'ui-01-console-interior');

    await page.evaluate(() => window.__GAME.openConsole());
    await advance(page, 1.2);
    await shot(page, 'ui-02-console-open');
    const snap = await snapshot(page);
    expect(snap.consoleOpen).toBe(true);
    expect(snap.tracks.length).toBeGreaterThan(0);
    await page.evaluate(() => window.__GAME.closeConsole());
  });

  test('daylight engagement beats', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__GAME.setCondition('day');
      window.__GAME.setScenario('single');
      window.__GAME.selectBattery('highlance');
      window.__GAME.start(20240601);
      // Watch from beside the high-altitude battery.
      window.__GAME.teleport(40, -20, 0);
    });
    await advance(page, 8);

    // Track in the sky before the shot.
    await page.evaluate(() => window.__GAME.lookAtTrack());
    await advance(page, 0.4);
    await shot(page, 'day-10-track-acquired');

    await page.evaluate(() => window.__GAME.autoEngage('highlance'));
    await waitForReady(page, 'highlance', 14);
    await page.evaluate(() => window.__GAME.lookAt(66, 12, -46));
    await advance(page, 0.3);
    await shot(page, 'day-11-launcher-elevated');

    await page.evaluate(() => window.__GAME.authorize());
    await advance(page, 0.55);
    await shot(page, 'day-12-launch');

    await advance(page, 2.2);
    await shot(page, 'day-13-boost-climb');

    // Follow the round up.
    await advance(page, 5);
    await page.evaluate(() => {
      const s = window.__GAME.snapshot();
      if (s.interceptors[0]) window.__GAME.lookAtTrack();
    });
    await advance(page, 0.3);
    await shot(page, 'day-14-midcourse');

    // Advance to just after the intercept.
    let snap = await snapshot(page);
    for (let i = 0; i < 40 && snap.interceptors.length; i++) {
      snap = await advance(page, 0.5);
    }
    await advance(page, 0.35);
    await shot(page, 'day-15-intercept');
    await advance(page, 3.5);
    await shot(page, 'day-16-aftermath');
    console.log('day engagement:', snap.lastResult);
  });

  test('sunset engagement', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__GAME.setCondition('sunset');
      window.__GAME.setScenario('single');
      window.__GAME.selectBattery('sentinel');
      window.__GAME.start(90210);
      window.__GAME.teleport(20, -70, 0);
    });
    await advance(page, 4);
    await page.evaluate(() => window.__GAME.lookAt(4, 20, -104));
    await advance(page, 0.4);
    await shot(page, 'sunset-01-site');

    await advance(page, 5);
    await page.evaluate(() => window.__GAME.autoEngage('sentinel'));
    await waitForReady(page, 'sentinel', 18);
    await page.evaluate(() => window.__GAME.authorize());
    await advance(page, 0.7);
    await shot(page, 'sunset-02-launch');
    await advance(page, 3.2);
    await page.evaluate(() => window.__GAME.lookAt(4, 6000, -104));
    await advance(page, 0.3);
    await shot(page, 'sunset-03-climb');

    let snap = await snapshot(page);
    for (let i = 0; i < 40 && snap.interceptors.length; i++) {
      snap = await advance(page, 0.5);
    }
    await advance(page, 0.3);
    await shot(page, 'sunset-04-intercept');
    console.log('sunset engagement:', snap.lastResult);
  });

  test('night raid', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__GAME.setScenario('night');
      window.__GAME.selectBattery('highlance');
      window.__GAME.start(70707);
      window.__GAME.teleport(10, 26, 0.2);
    });
    await advance(page, 6);
    await shot(page, 'night-01-site');

    await page.evaluate(() => window.__GAME.lookAtTrack());
    await advance(page, 4);
    await shot(page, 'night-02-tracks');

    await page.evaluate(() => window.__GAME.autoEngage('highlance'));
    await waitForReady(page, 'highlance', 14);
    await page.evaluate(() => window.__GAME.lookAt(66, 10, -46));
    await page.evaluate(() => window.__GAME.authorize());
    await advance(page, 0.6);
    await shot(page, 'night-03-launch');
    await advance(page, 3.0);
    await shot(page, 'night-04-climb');

    let snap = await snapshot(page);
    for (let i = 0; i < 40 && snap.interceptors.length; i++) {
      snap = await advance(page, 0.5);
    }
    await advance(page, 0.3);
    await shot(page, 'night-05-intercept');
    console.log('night engagement:', snap.lastResult);
  });

  test('ground impact', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      window.__GAME.setCondition('day');
      window.__GAME.setScenario('single');
      window.__GAME.start(24680);
      window.__GAME.teleport(60, 60, 0);
    });
    // Never engage: let the target arrive.
    let snap = await advance(page, 30);
    for (let i = 0; i < 60 && snap.threats.length; i++) {
      snap = await advance(page, 0.5);
      if (snap.threats[0] && snap.threats[0].alt < 900) break;
    }
    await page.evaluate(() => window.__GAME.lookAt(0, 40, 0));
    await advance(page, 0.5);
    await shot(page, 'impact-01-terminal');
    for (let i = 0; i < 20 && (await snapshot(page)).threats.length; i++) {
      await advance(page, 0.25);
    }
    await advance(page, 0.4);
    await shot(page, 'impact-02-detonation');
    await advance(page, 2.5);
    await shot(page, 'impact-03-column');
    const s = await snapshot(page);
    expect(s.stats.impacted).toBeGreaterThan(0);
  });
});
