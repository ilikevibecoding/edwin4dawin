// Deterministic gameplay tests + screenshot harness.
// The game exposes window.__game with a fixed-step API in ?test=1 mode.
import { test, expect } from '@playwright/test';
import fs from 'fs';

const SHOTS = 'shots';
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

async function boot(page, { seed = 1234, query = '' } = {}) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto(`/?test=1&seed=${seed}${query}`);
  await page.waitForFunction(() => window.__game && window.__game.testMode, null, { timeout: 30000 });
  return errors;
}

const api = (page, expr) => page.evaluate(expr);
const step = (page, n) => page.evaluate((k) => window.__game.step(k), n);
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png` });

test('boots clean with no console errors', async ({ page }) => {
  const errors = await boot(page);
  await step(page, 30);
  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
  const state = await page.evaluate(() => window.__game.state());
  expect(state.mode).toBe('start');
  await shot(page, '00_boot_start_overlay');
});

test('beauty shots: base overview day/sunset/night', async ({ page }) => {
  await boot(page);
  await api(page, () => window.__game.api.beginPlay());
  // day overview from elevated vantage
  await api(page, () => {
    window.__game.api.setCondition('day');
    window.__game.api.cine(120, 55, 150, 0, 6, -10);
  });
  await step(page, 40);
  await shot(page, '01_base_overview_day');

  await api(page, () => {
    window.__game.api.setCondition('sunset');
    window.__game.api.cine(-140, 30, 110, 0, 10, -20);
  });
  await step(page, 40);
  await shot(page, '02_base_overview_sunset');

  await api(page, () => {
    window.__game.api.setCondition('night');
    window.__game.api.cine(90, 25, 120, -10, 6, -20);
  });
  await step(page, 40);
  await shot(page, '03_base_overview_night');
});

test('battery close-ups', async ({ page }) => {
  await boot(page);
  await api(page, () => {
    window.__game.api.beginPlay();
    window.__game.api.setCondition('day');
    window.__game.api.cine(48, 3.2, -42, 58, 3.5, -52);
  });
  await step(page, 20);
  await shot(page, '04_patriot_closeup');

  await api(page, () => window.__game.api.cine(-53, 4, -46, -64, 4, -56));
  await step(page, 10);
  await shot(page, '05_thaad_closeup');

  await api(page, () => window.__game.api.cine(7, 4, 64, 16, 4.5, 74));
  await step(page, 10);
  await shot(page, '06_sentinel_closeup');

  await api(page, () => window.__game.api.cine(-36, 3.5, -1, -44, 3.5, -8));
  await step(page, 10);
  await shot(page, '07_radar_closeup');

  // first-person from spawn
  await api(page, () => {
    window.__game.api.cineOff();
    window.__game.api.teleport(6, 22, Math.PI * 0.9, 0.04);
  });
  await step(page, 10);
  await shot(page, '08_first_person_spawn');
});

test('deterministic single-track scenario runs to completion', async ({ page }) => {
  const errors = await boot(page, { seed: 4242 });
  await api(page, () => {
    const g = window.__game;
    g.api.beginPlay();
    g.api.setCondition('day');
    g.api.selectScenario('single');
    g.api.setAutoDefend(true);
    g.api.startScenario();
    g.api.cine(60, 26, 120, 0, 60, -160);
  });

  let launched = false, intercepted = false;
  let launchShotTaken = false, flightShotTaken = false;
  // up to 120 sim-seconds
  for (let i = 0; i < 240; i++) {
    await step(page, 30); // 0.5 s per chunk
    const s = await page.evaluate(() => window.__game.state());
    if (s.interceptorsFlying > 0 && !launched) {
      launched = true;
      await shot(page, '10_interceptor_launch');
      launchShotTaken = true;
    }
    if (launched && s.interceptorsFlying > 0 && !flightShotTaken && s.results.shots > 0) {
      // mid-flight
      if (i % 4 === 0) { await shot(page, '11_interceptor_midcourse'); flightShotTaken = true; }
    }
    if (s.results.hits > 0 && !intercepted) {
      intercepted = true;
      await shot(page, '12_intercept_result');
    }
    if (s.scenarioState === 'debrief') break;
  }
  const final = await page.evaluate(() => window.__game.state());
  expect(final.scenarioState).toBe('debrief');
  expect(final.results.shots).toBeGreaterThan(0);
  // every threat is accounted for: hit, decoy, or impact
  expect(final.results.hits + final.results.impacts + final.results.decoys).toBeGreaterThanOrEqual(final.results.threats);
  await shot(page, '13_debrief');
  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
});

test('console UI with live tracks (saturation)', async ({ page }) => {
  await boot(page, { seed: 777 });
  await api(page, () => {
    const g = window.__game;
    g.api.beginPlay();
    g.api.setCondition('sunset');
    g.api.selectScenario('saturation');
    g.api.startScenario();
  });
  await step(page, 60 * 14); // 14 s: several tracks up
  await api(page, () => window.__game.api.enterConsole());
  await step(page, 30);
  await shot(page, '20_console_scope');
  const s = await page.evaluate(() => window.__game.state());
  expect(s.mode).toBe('console');
  expect(s.tracks.length).toBeGreaterThan(0);
  // click a track on the scope selects it
  await api(page, () => window.__game.api.exitConsole());
});

test('night raid: searchlights, decoys, dramatic sky', async ({ page }) => {
  await boot(page, { seed: 999 });
  await api(page, () => {
    const g = window.__game;
    g.api.beginPlay();
    g.api.selectScenario('nightRaid');
    g.api.setAutoDefend(true);
    g.api.startScenario();
    g.api.cine(30, 8, 90, -20, 120, -300);
  });
  await step(page, 60 * 16);
  await shot(page, '30_night_raid_sky');
  await step(page, 60 * 10);
  await shot(page, '31_night_raid_engagement');
  const s = await page.evaluate(() => window.__game.state());
  expect(s.condition).toBe('night');
});

test('performance budgets', async ({ page }) => {
  await boot(page);
  await api(page, () => {
    const g = window.__game;
    g.api.beginPlay();
    g.api.selectScenario('saturation');
    g.api.setAutoDefend(true);
    g.api.startScenario();
  });
  await step(page, 60 * 20); // heavy moment
  const perf = await page.evaluate(() => window.__game.perf());
  console.log('PERF', JSON.stringify(perf));
  expect(perf.calls).toBeLessThan(420);
  expect(perf.triangles).toBeLessThan(1_600_000);
  const fps = await page.evaluate(() => window.__game.measureFps(2));
  console.log('HEADLESS-FPS', JSON.stringify(fps));
});
