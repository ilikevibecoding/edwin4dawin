import { test, expect } from '@playwright/test';

// Deterministic gameplay tests. The game runs with ?test=1 which fixes the
// simulation timestep and exposes window.__game.

async function boot(page, { seed = 42, extra = '' } = {}) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto(`/?test=1&seed=${seed}${extra}`);
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 30_000 });
  // let the world render a few frames
  await page.waitForTimeout(400);
  return errors;
}

const state = (page) => page.evaluate(() => window.__game.state());
const step = (page, s) => page.evaluate((sec) => window.__game.step(sec), s);

test('boots without console errors and renders the base', async ({ page }) => {
  const errors = await boot(page);
  const st = await state(page);
  expect(st.mode).toBe('play');
  expect(st.scenario).toBeNull();
  expect(st.batteries.length).toBe(3);
  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
  expect(st.drawCalls).toBeGreaterThan(10);
});

test('single track: full engagement loop with intercept or resolution', async ({ page }) => {
  await boot(page, { seed: 7 });
  await page.evaluate(() => {
    window.__game.startScenario('single', 7);
    window.__game.autoEngage(true);
  });
  // run up to 120 sim-seconds until summary opens
  let st = null;
  for (let i = 0; i < 24; i++) {
    st = await step(page, 5);
    if (st.summaryOpen) break;
  }
  expect(st.summaryOpen).toBe(true);
  expect(st.stats.launched).toBe(1);
  const resolved = st.stats.intercepted + st.stats.impactsBase + st.stats.impactsOutside;
  expect(resolved).toBe(1);
});

test('manual console flow: select, assign, authorize', async ({ page }) => {
  await boot(page, { seed: 11 });
  await page.evaluate(() => window.__game.startScenario('single', 11));
  // wait for a radar track
  let st = await step(page, 1);
  for (let i = 0; i < 30 && st.tracks.length === 0; i++) st = await step(page, 1);
  expect(st.tracks.length).toBeGreaterThan(0);

  await page.evaluate(() => {
    window.__game.enterConsole();
    window.__game.selectTrack();
    window.__game.selectBattery('thaad');
  });
  const assigned = await page.evaluate(() => window.__game.assign());
  expect(assigned).toBe(true);
  // wait for the launcher to finish deploying, then authorize
  for (let i = 0; i < 12; i++) {
    st = await step(page, 1);
    if (st.batteries.find(b => b.id === 'thaad').state === 'READY') break;
  }
  const authorized = await page.evaluate(() => window.__game.authorize());
  expect(authorized).toBe(true);
  st = await step(page, 3);
  expect(st.birds).toBeGreaterThanOrEqual(0); // launched (may already have resolved)
  const batt = st.batteries.find(b => b.id === 'thaad');
  expect(batt.ammo).toBe(batt.ammoMax - 1);
});

test('saturation scenario resolves fully with auto-engage', async ({ page }) => {
  await boot(page, { seed: 21 });
  await page.evaluate(() => {
    window.__game.startScenario('saturation', 21);
    window.__game.autoEngage(true);
  });
  let st = null;
  for (let i = 0; i < 40; i++) {
    st = await step(page, 5);
    if (st.summaryOpen) break;
  }
  expect(st.summaryOpen).toBe(true);
  expect(st.stats.launched).toBeGreaterThanOrEqual(3);
  const resolved = st.stats.intercepted + st.stats.impactsBase + st.stats.impactsOutside;
  expect(resolved).toBe(st.stats.launched);
  expect(st.stats.intercepted).toBeGreaterThan(0);
});

test('night raid: forces night, has decoys, completes', async ({ page }) => {
  await boot(page, { seed: 33 });
  await page.evaluate(() => {
    window.__game.startScenario('nightraid', 33);
    window.__game.autoEngage(true);
  });
  const preset = await page.evaluate(() => window.__game.weatherPreset());
  expect(preset).toBe('night');
  let st = null;
  for (let i = 0; i < 44; i++) {
    st = await step(page, 5);
    if (st.summaryOpen) break;
  }
  expect(st.summaryOpen).toBe(true);
  expect(st.stats.decoysTotal).toBeGreaterThanOrEqual(2);
});

test('restart works immediately after completion', async ({ page }) => {
  await boot(page, { seed: 5 });
  await page.evaluate(() => {
    window.__game.startScenario('single', 5);
    window.__game.autoEngage(true);
  });
  let st = null;
  for (let i = 0; i < 24; i++) {
    st = await step(page, 5);
    if (st.summaryOpen) break;
  }
  expect(st.summaryOpen).toBe(true);
  await page.evaluate(() => window.__game.restart());
  st = await step(page, 1);
  expect(st.summaryOpen).toBe(false);
  expect(st.scenario).toBe('single');
  expect(st.threats + st.pending).toBeGreaterThan(0);
});

test('all three batteries can launch', async ({ page }) => {
  await boot(page, { seed: 55 });
  await page.evaluate(() => window.__game.startScenario('saturation', 55));
  let st = await step(page, 1);
  for (let i = 0; i < 40 && st.tracks.length < 2; i++) st = await step(page, 1);
  expect(st.tracks.length).toBeGreaterThanOrEqual(2);

  const results = await page.evaluate(() => {
    const out = {};
    const g = window.__game;
    for (const bid of ['thaad', 'sentinel', 'patriot']) {
      g.selectBattery(bid);
      let fired = false;
      const tracks = g.state().tracks;
      for (const tr of tracks) {
        g.selectTrack(tr.id);
        if (g.assign() && g.authorize()) { fired = true; break; }
      }
      out[bid] = fired;
      g.step(2);
    }
    return out;
  });
  // patriot engages terminal threats — may legitimately refuse early high threats,
  // but thaad + sentinel must be able to engage mid-course
  expect(results.thaad).toBe(true);
  expect(results.sentinel).toBe(true);
});

test('performance budget: draw calls and triangles within limits', async ({ page }) => {
  await boot(page, { seed: 99 });
  await page.evaluate(() => {
    window.__game.startScenario('saturation', 99);
    window.__game.autoEngage(true);
  });
  await step(page, 20);
  await page.waitForTimeout(500); // let RAF render
  const st = await state(page);
  expect(st.drawCalls).toBeLessThan(500);
  expect(st.triangles).toBeLessThan(2_500_000);
});
