// screens.spec.js — deterministic screenshot harness for visual QA judging.
// Output lands in shots/*.png (gitignored); reviewed each iteration.
import { test } from '@playwright/test';
import { boot, step, stepUntil } from './helpers.js';

async function shot(page, name) {
  await page.screenshot({ path: `shots/${name}.png` });
}

test.describe('screenshot harness', () => {
  test('capture visual QA set', async ({ page }) => {
    test.setTimeout(600_000);
    await boot(page);

    // ---- 1. base overview, day
    await page.evaluate(() => {
      window.__game.setTimeOfDay('day');
      window.__game.teleport(66, 0, 76, 0, 0);
      window.__game.lookAt(-20, 6, -20);
    });
    await step(page, 1.5);
    await shot(page, '01_base_overview_day');

    // ---- 2. rampart (patriot) closeup
    // pad-local front-3/4 framing (matches the battery specialist's hero shot,
    // shows cab + canister rack regardless of pad heading)
    await page.evaluate(() => {
      const rig = window.__game.ctx.batteries.get('patriot').rig.group;
      const yaw = rig.rotation.y;
      const cos = Math.cos(yaw), sin = Math.sin(yaw);
      const L = (x, z) => [rig.position.x + x * cos + z * sin, rig.position.z - x * sin + z * cos];
      const [cx, cz] = L(9.5, 11.0);
      const [tx, tz] = L(0, 1.6);
      window.__game.teleport(cx, 0, cz, 0, 0);
      window.__game.lookAt(tx, 2.6, tz);
    });
    await step(page, 0.5);
    await shot(page, '02_rampart_closeup');

    // ---- 3. halberd (thaad) closeup
    await page.evaluate(() => {
      window.__game.teleport(11, 0, 60, 0, 0);
      window.__game.lookAt(2, 4, 50);
    });
    await step(page, 0.5);
    await shot(page, '03_halberd_closeup');

    // ---- 4. sentinel closeup
    await page.evaluate(() => {
      window.__game.teleport(38, 0, 42, 0, 0);
      window.__game.lookAt(48, 7, 30);
    });
    await step(page, 0.5);
    await shot(page, '04_sentinel_closeup');

    // ---- 5. command shelter + radar
    await page.evaluate(() => {
      window.__game.teleport(-16, 0, 2, 0, 0);
      window.__game.lookAt(-32, 3, -18);
    });
    await step(page, 0.5);
    await shot(page, '05_shelter_radar_area');

    // ---- 6. console view with PPI + holo
    await page.evaluate(() => window.__game.openConsole());
    await step(page, 1.2);
    await shot(page, '06_console_view');
    await page.evaluate(() => window.__game.closeConsole());

    // ---- 7. launch moment (sentinel, day)
    await page.evaluate(() => {
      window.__game.seed(2024);
      window.__game.start('single');
    });
    await stepUntil(page, (s) => s.tracks.length >= 1, 25);
    await page.evaluate(() => {
      const s = window.__game.state();
      window.__game.assign(s.tracks[0].id, 'sentinel');
      window.__game.authorize();
      window.__game.teleport(34, 0, 46, 0, 0);
      window.__game.lookAt(48, 9, 30);
    });
    await stepUntil(page, (s) => s.interceptors.length >= 1, 15, 33.34, 0.15);
    await step(page, 0.55);
    await shot(page, '07_sentinel_launch');

    // ---- 8. interceptor climbing + trails
    await step(page, 2.5);
    await page.evaluate(() => {
      const s = window.__game.state();
      if (s.interceptors.length) {
        window.__game.lookAt(48, Math.max(300, s.interceptors[0].alt), -100);
      }
    });
    await step(page, 0.2);
    await shot(page, '08_interceptor_climb');

    // ---- 9. intercept flash
    const hit = await stepUntil(page, (s) => s.stats.intercepted >= 1 || s.stats.misses >= 1, 90, 33.34, 0.5);
    if (hit.ok && hit.state.lastIntercept) {
      await page.evaluate(() => {
        const p = window.__game.state().lastIntercept;
        window.__game.teleport(0, 0, 20, 0, 0);
        window.__game.lookAt(p.x, p.y, p.z);
      });
      await step(page, 0.12);
      await shot(page, '09_intercept_moment');
    }
    await stepUntil(page, (s) => s.phase === 'debrief', 120, 33.34, 2);
    await shot(page, '10_debrief');
    await page.evaluate(() => window.__game.stopScenario());

    // ---- 11. sunset scene with trails
    await page.evaluate(() => {
      window.__game.setTimeOfDay('sunset');
      window.__game.seed(808);
      window.__game.start('single');
      window.__game.autoplay(true);
      window.__game.teleport(20, 0, 70, 2.9, 0.28);
    });
    await stepUntil(page, (s) => s.stats.launches >= 1, 60);
    await step(page, 4);
    await page.evaluate(() => {
      const s = window.__game.state();
      if (s.interceptors.length) {
        const i = s.interceptors[0];
        window.__game.lookAt(i.x ?? 0, Math.max(600, i.alt), i.z ?? -800);
      } else if (s.tracks.length) {
        const t = s.tracks[0];
        window.__game.lookAt(t.x * 0.7, t.alt * 0.8, t.z * 0.7);
      }
    });
    await step(page, 0.2);
    await shot(page, '11_sunset_engagement');
    await page.evaluate(() => window.__game.stopScenario());

    // ---- 12. night raid with searchlights
    await page.evaluate(() => {
      window.__game.seed(66);
      window.__game.start('nightraid');
      window.__game.autoplay(true);
      window.__game.teleport(-8, 0, 66, 3.05, 0.3);
    });
    await stepUntil(page, (s) => s.tracks.length >= 2, 40);
    await step(page, 6);
    await page.evaluate(() => {
      const s = window.__game.state();
      if (s.tracks.length) {
        const t = s.tracks[0];
        window.__game.lookAt(t.x * 0.6, t.alt * 0.7, t.z * 0.6);
      }
    });
    await step(page, 0.2);
    await shot(page, '12_night_raid');
    // 0.5 s poll chunks: catch the kill within ~0.6 s so the fireball is still lit
    const nightHit = await stepUntil(page, (s) => s.stats.intercepted >= 1, 120, 33.34, 0.5);
    if (nightHit.ok && nightHit.state.lastIntercept) {
      await page.evaluate(() => {
        const p = window.__game.state().lastIntercept;
        window.__game.lookAt(p.x, p.y, p.z);
      });
      await step(page, 0.1);
      await shot(page, '13_night_intercept');
    }

    // ---- 14. HUD during saturation, day
    await page.evaluate(() => {
      window.__game.stopScenario();
      window.__game.setTimeOfDay('day');
      window.__game.seed(9090);
      window.__game.start('saturation');
      window.__game.autoplay(true);
      window.__game.teleport(4, 0, 16, 3.14, 0.22);
    });
    await stepUntil(page, (s) => s.tracks.length >= 2, 60, 33.34, 1);
    await step(page, 3);
    await shot(page, '14_saturation_hud');
  });
});
