// Visual QA harness: gameplay-view screenshots for the self-evaluation loop.
// Light on assertions by design — the screenshots are the deliverable.
import { test, expect } from '@playwright/test';
import fs from 'fs';

const SHOTS = 'shots';
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

async function boot(page, seed = 31337) {
  await page.goto(`/?test=1&seed=${seed}`);
  await page.waitForFunction(() => window.__game && window.__game.testMode);
  await page.evaluate(() => window.__game.api.beginPlay());
}

const step = (page, n) => page.evaluate((k) => window.__game.step(k), n);
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png` });

test('POV: patriot launch sequence', async ({ page }) => {
  await boot(page, 555);
  await page.evaluate(() => {
    const g = window.__game;
    g.api.setCondition('day');
    g.api.selectScenario('single');
    g.api.startScenario();
    // stand at pad A edge looking at the RAMPART launcher (clear of the blast walls)
    g.api.cine(50, 2.4, -35, 58, 3.5, -52);
  });
  // wait for a track, then manually assign patriot and authorize
  for (let i = 0; i < 90; i++) {
    await step(page, 30);
    const s = await page.evaluate(() => window.__game.state());
    if (s.tracks.length > 0) break;
  }
  await page.evaluate(() => {
    const g = window.__game;
    const s = g.state();
    g.api.selectBattery('patriot');
    g.api.assign(s.tracks[0].id, 'patriot');
    g.api.authorize('patriot');
  });
  // capture the moment of fire: step small chunks until an interceptor exists
  let fired = false;
  for (let i = 0; i < 40; i++) {
    await step(page, 6);
    const s = await page.evaluate(() => window.__game.state());
    if (s.interceptorsFlying > 0) { fired = true; break; }
  }
  expect(fired).toBe(true);
  await step(page, 4);
  await shot(page, '40_pov_patriot_launch');
  // follow the bird: aim camera at it (clear of the floodlight pole at 48,-38)
  await page.evaluate(() => {
    const g = window.__game;
    const s = g.state();
    if (s.interceptors.length) {
      const it = s.interceptors[0];
      g.api.cine(57, 3, -28, it.x, it.alt, it.z);
    }
  });
  await step(page, 26);
  await page.evaluate(() => {
    const g = window.__game;
    const s = g.state();
    if (s.interceptors.length) {
      const it = s.interceptors[0];
      g.api.cine(57, 3, -28, it.x, it.alt, it.z);
    }
  });
  await step(page, 2);
  await shot(page, '41_pov_boost_trail');
});

test('intercept flash close-up', async ({ page }) => {
  await boot(page, 4242);
  await page.evaluate(() => {
    const g = window.__game;
    g.api.setCondition('day');
    g.api.selectScenario('single');
    g.api.setAutoDefend(true);
    g.api.startScenario();
  });
  // chase the engagement: aim camera from base toward the closing pair
  let hitShot = false;
  for (let i = 0; i < 400; i++) {
    const s = await page.evaluate(() => {
      const g = window.__game;
      const st = g.state();
      if (st.interceptors.length && st.tracks.length) {
        const it = st.interceptors[0];
        const tr = st.tracks[0];
        // point at midpoint
        g.api.cine(0, 12, 60, (it.x + tr.x) / 2, (it.alt + tr.alt) / 2, (it.z + tr.z) / 2);
        return { d: Math.hypot(it.x - tr.x, it.alt - tr.alt, it.z - tr.z), hits: st.results.hits, done: st.scenarioState !== 'running' };
      }
      return { d: 1e9, hits: st.results.hits, done: st.scenarioState !== 'running' };
    });
    if (s.hits > 0) {
      await shot(page, '42_intercept_flash');
      hitShot = true;
      break;
    }
    if (s.done) break;
    await step(page, s.d < 1500 ? 3 : 20);
  }
  expect(hitShot).toBe(true);
  await step(page, 50);
  await shot(page, '43_post_intercept_debris');
});

test('C2 interior and radar site', async ({ page }) => {
  await boot(page, 12);
  await page.evaluate(() => {
    const g = window.__game;
    g.api.setCondition('sunset');
    g.api.selectScenario('saturation');
    g.api.startScenario();
    // inside shelter looking at console
    g.api.cine(1.2, 1.6, 14.6, 0.6, 1.3, 12.2);
  });
  await step(page, 60 * 12);
  await shot(page, '44_c2_interior');
  await page.evaluate(() => window.__game.api.cine(-38, 2.4, -2, -44, 3, -8));
  await step(page, 30);
  await shot(page, '45_radar_site');
  // sentinel erecting: authorize sentinel on any track
  await page.evaluate(() => {
    const g = window.__game;
    const s = g.state();
    if (s.tracks.length) {
      g.api.assign(s.tracks[0].id, 'sentinel');
      g.api.authorize('sentinel');
    }
    g.api.cine(8, 3, 64, 16, 4, 74);
  });
  await step(page, 100);
  await shot(page, '46_sentinel_erecting');
  await step(page, 200);
  await shot(page, '47_sentinel_after_launch');
});

test('night trails readability', async ({ page }) => {
  await boot(page, 777);
  await page.evaluate(() => {
    const g = window.__game;
    g.api.selectScenario('nightRaid');
    g.api.setAutoDefend(true);
    g.api.startScenario();
  });
  await step(page, 60 * 12);
  // look up at the action from the apron
  for (let i = 0; i < 200; i++) {
    const s = await page.evaluate(() => {
      const g = window.__game;
      const st = g.state();
      if (st.interceptors.length) {
        const it = st.interceptors[0];
        g.api.cine(10, 2, 30, it.x, Math.max(it.alt, 300), it.z);
        return { flying: true, hits: st.results.hits, done: st.scenarioState !== 'running' };
      }
      return { flying: false, hits: st.results.hits, done: st.scenarioState !== 'running' };
    });
    if (s.flying) { break; }
    if (s.done) break;
    await step(page, 20);
  }
  await step(page, 30);
  await shot(page, '48_night_engagement_trails');
  await step(page, 60 * 3);
  await shot(page, '49_night_engagement_later');
});
