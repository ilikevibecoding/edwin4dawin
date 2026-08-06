// Screenshot capture. Not assertions - this spec exists to produce a consistent
// set of reference images for visual review after a change.
//
//   npx playwright test tests/shots.spec.js
//
// Images land in shots/reference/.
import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'shots/reference';
const SEED = 7777;

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

/** Boot the game paused, with the player frozen so viewpoints hold still. */
async function boot(page) {
  await page.goto(`/?test=1&seed=${SEED}`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__GAME, null, { timeout: 90_000 });
  await page.evaluate(() => window.__GAME.freezePlayer(true));
}

async function shot(page, name) {
  await page.evaluate(() => window.__GAME.render());
  await page.screenshot({ path: path.join(OUT, `${name}.png`), timeout: 180_000 });
}

async function view(page, name, condition, pos, look) {
  await page.evaluate(([condition, pos, look]) => {
    const G = window.__GAME;
    G.configure({ condition });
    G.teleport(pos[0], pos[1], pos[2]);
    G.lookAt(look[0], look[1], look[2]);
    G.sim(2);
  }, [condition, pos, look]);
  await shot(page, name);
}

test('site tour', async ({ page }) => {
  await boot(page);
  await view(page, '01-spawn', 'day', [-6, null, 34], [-10, 30, -60]);
  await view(page, '02-overview', 'day', [40, 34, 70], [-20, 4, -40]);
  await view(page, '03-shelter-interior', 'day', [-20.5, 0.35, 24.5], [-20, 1.4, 20.5]);
  await view(page, '04-radar-station', 'day', [24, null, 8], [32, 6, -6]);
  await view(page, '05-palisade', 'day', [-42, null, -18], [-52, 3, -30]);
  await view(page, '06-halberd', 'day', [14, null, -56], [4, 4, -70]);
  await view(page, '07-sentinel', 'day', [70, null, -24], [58, 6, -38]);
  await view(page, '08-sunset', 'sunset', [10, null, 20], [-40, 10, -50]);
  await view(page, '09-night', 'night', [10, null, 20], [-40, 10, -50]);
});

test('engagement sequence', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const G = window.__GAME;
    G.restart();
    G.configure({ condition: 'day', scenario: 'saturation', battery: 'thaad' });
    G.teleport(-6, null, 34);
    G.start();
    G.sim(60 * 8);
    G.watch();
  });
  await shot(page, '10-tracks');

  // let the autopilot assign and launch
  for (let i = 0; i < 120; i++) {
    const launched = await page.evaluate(() => {
      const G = window.__GAME;
      G.sim(12);
      G.autoPilot();
      return G.state().roundStats.launched;
    });
    if (launched) break;
  }
  await page.evaluate(() => {
    const g = window.__gameInstance;
    const it = g.interceptors.active[0];
    if (it) window.__GAME.lookAt(it.pos.x, it.pos.y + 220, it.pos.z);
  });
  await shot(page, '11-launch');

  await page.evaluate(() => {
    const G = window.__GAME;
    for (let i = 0; i < 12; i++) {
      G.sim(12);
      G.autoPilot();
    }
    G.watch();
  });
  await shot(page, '12-climb');

  // run to the first result, framing the action
  for (let i = 0; i < 160; i++) {
    const done = await page.evaluate(() => {
      const G = window.__GAME;
      for (let k = 0; k < 4; k++) {
        G.sim(6);
        G.autoPilot();
      }
      G.watch();
      return G.state().results.length;
    });
    if (done) break;
  }
  await shot(page, '13-intercept');

  await page.evaluate(() => {
    const G = window.__GAME;
    for (let i = 0; i < 30; i++) {
      G.sim(6);
      G.autoPilot();
    }
    G.watch();
  });
  await shot(page, '14-aftermath');
});

test('command console and night raid', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const G = window.__GAME;
    G.restart();
    G.configure({ condition: 'day', scenario: 'saturation', battery: 'patriot' });
    G.teleport(-20.5, 0.35, 23.5);
    G.lookAt(-20, 1.2, 21);
    G.openConsole();
    G.start();
    G.sim(60 * 14);
  });
  await shot(page, '15-console');

  await page.evaluate(() => {
    const G = window.__GAME;
    G.closeConsole();
    G.restart();
    G.configure({ condition: 'night', scenario: 'night', battery: 'sentinel' });
    G.teleport(-6, null, 34);
    G.start();
    for (let i = 0; i < 200; i++) {
      G.sim(12);
      G.autoPilot();
      if (G.state().roundStats.launched) break;
    }
    G.watch();
  });
  await shot(page, '16-night-launch');

  for (let i = 0; i < 160; i++) {
    const done = await page.evaluate(() => {
      const G = window.__GAME;
      for (let k = 0; k < 4; k++) {
        G.sim(6);
        G.autoPilot();
      }
      G.watch();
      return G.state().results.length;
    });
    if (done) break;
  }
  await shot(page, '17-night-intercept');
});
