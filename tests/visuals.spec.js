// Visual QA gallery: deterministic screenshots at cinematic moments.
// These images are reviewed against the quality rubric each iteration.
import { test } from '@playwright/test';
import { boot, adv, advUntil, state, shot } from './helpers.js';

test.describe('visual gallery', () => {
  test('base environment — day', async ({ page }) => {
    await boot(page, { seed: '7', hidehud: '1' });
    await page.evaluate(() => window.__game.setView('overview'));
    await adv(page, 0.5);
    await shot(page, '01_overview_day');
    await page.evaluate(() => window.__game.setView('apron'));
    await adv(page, 0.2);
    await shot(page, '02_apron_day');
    await page.evaluate(() => window.__game.setView('gate'));
    await adv(page, 0.2);
    await shot(page, '03_gate_day');
  });

  test('battery close-ups', async ({ page }) => {
    await boot(page, { seed: '7', hidehud: '1' });
    for (const v of ['rampart', 'zenith', 'sentinel']) {
      await page.evaluate((view) => window.__game.setView(view), v);
      await adv(page, 0.2);
      await shot(page, `04_battery_${v}`);
    }
  });

  test('shelter interior + holo radar with live tracks', async ({ page }) => {
    await boot(page, { seed: '7' });
    await page.evaluate(() => window.__game.start('saturation', 'day'));
    await advUntil(page, s => s.tracks.length >= 2, { max: 30 });
    await page.evaluate(() => {
      window.__game.selectFirstTrack();
      window.__game.openConsole();
      window.__game.setView('shelter');
    });
    await adv(page, 1.2);
    await shot(page, '05_console_holo');
  });

  test('sunset — smoke trails and inbound threats', async ({ page }) => {
    await boot(page, { seed: '23', hidehud: '1', tod: 'sunset' });
    await page.evaluate(() => window.__game.start('saturation', 'sunset'));
    await advUntil(page, s => s.tracks.some(t => t.state === 'TRACK'), { max: 25 });
    // fire zenith at first track for a launch trail against sunset
    await page.evaluate(() => {
      window.__game.selectFirstTrack();
      window.__game.assign('zenith');
      window.__game.authorize();
    });
    await advUntil(page, s => s.interceptors.length > 0, { max: 20 });
    await adv(page, 2.2);
    // aim from apron toward the missile
    const s = await state(page);
    if (s.interceptors[0]) {
      const p = s.interceptors[0].pos;
      await page.evaluate((pos) => {
        window.__game.setView('apron');
        window.__game.camera.position.set(20, 3, 20);
        window.__game.lookAt(pos[0], pos[1], pos[2]);
      }, p);
    }
    await shot(page, '06_launch_sunset');
    // ride until the intercept flash
    const hit = await advUntil(page, st => st.lastBurst?.type === 'air' && st.results.length > 0, { tick: 0.5, max: 60 });
    if (hit.ok && hit.state.lastBurst) {
      const b = hit.state.lastBurst.pos;
      await page.evaluate((pos) => {
        window.__game.camera.position.set(10, 4, 10);
        window.__game.lookAt(pos[0], pos[1], pos[2]);
      }, b);
      await page.evaluate(() => window.__game.step(1 / 30, 2));
      await shot(page, '07_intercept_flash');
    }
  });

  test('night raid — searchlights, beacons, tracer sky', async ({ page }) => {
    await boot(page, { seed: '5', hidehud: '1' });
    await page.evaluate(() => window.__game.start('nightraid', 'night'));
    await adv(page, 14);
    await page.evaluate(() => {
      window.__game.setView('apron');
      window.__game.camera.position.set(30, 2.5, 40);
      window.__game.lookAt(-40, 900, -160);
    });
    await shot(page, '08_night_raid_sky');
    await page.evaluate(() => window.__game.setView('overview'));
    await adv(page, 0.3);
    await shot(page, '09_night_overview');
  });

  test('ground impact aftermath', async ({ page }) => {
    await boot(page, { seed: '13', hidehud: '1' });
    await page.evaluate(() => window.__game.start('single', 'day'));
    // let it hit the base (no engagement)
    const hit = await advUntil(page, s => s.stats.impacts > 0, { tick: 2, max: 90 });
    if (hit.ok) {
      const b = hit.state.lastBurst?.pos ?? [0, 0, 0];
      await page.evaluate((pos) => {
        window.__game.setView('apron');
        window.__game.camera.position.set(pos[0] + 40, 6, pos[2] + 40);
        window.__game.lookAt(pos[0], 12, pos[2]);
      }, b);
      await page.evaluate(() => window.__game.step(1 / 30, 4));
      await shot(page, '10_ground_impact');
    }
  });

  test('HUD in gameplay', async ({ page }) => {
    await boot(page, { seed: '7' });
    await page.evaluate(() => window.__game.start('saturation', 'day'));
    await advUntil(page, s => s.tracks.length >= 2, { max: 30 });
    await page.evaluate(() => {
      window.__game.selectFirstTrack();
      window.__game.setView('sky');
    });
    await adv(page, 0.3);
    await shot(page, '11_hud_gameplay');
  });
});
