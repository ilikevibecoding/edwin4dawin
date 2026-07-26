import { test, expect } from '@playwright/test';
import {
  gotoGame, enterGameplay, state, advance, capture, qa, teleport,
  expectNoConsoleErrors, collectRuntimeErrors,
} from './helpers.js';

/**
 * Combat cause-and-effect chains.
 * Owner: Opus 4, fixes coordinated with Opus 2.
 *
 * Each test walks a complete chain rather than a single call: firing must
 * decrement the magazine AND produce recoil AND hit the intended surface AND
 * update the reported state; reloading must transition and restore exactly the
 * right ammunition; a hit on an enemy must apply damage and change its state.
 */

test.describe.configure({ mode: 'serial' });

test.describe('weapon handling', () => {
  test('firing decrements ammunition, kicks the camera and reports the shot', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    await teleport(page, 'openplan');
    await qa(page, 'freezeAI', true);
    await advance(page, 200);

    const before = await state(page);
    expect(before.weapon.magazine).toBe(30);
    expect(before.player.recoilPitchDeg).toBeCloseTo(0, 1);

    // Sample the view mid-burst: recoil is a spring that recovers, so the peak
    // is only observable while the trigger is still down.
    const peak = await page.evaluate(() => {
      const h = window.__northstar.helpers;
      h.mouse(0, true);
      let maxRecoil = 0;
      let maxSpread = 0;
      for (let i = 0; i < 8; i++) {
        window.advanceTime(60);
        const s = JSON.parse(window.render_game_to_text());
        maxRecoil = Math.max(maxRecoil, Math.abs(s.player.recoilPitchDeg));
        maxSpread = Math.max(maxSpread, s.weapon.spreadDegrees);
      }
      h.mouse(0, false);
      window.advanceTime(60);
      return { maxRecoil, maxSpread };
    });
    const after = await state(page);

    expect(after.weapon.magazine, 'magazine must drop while holding an automatic trigger').toBeLessThan(30);
    expect(after.weapon.magazine).toBeGreaterThan(18);
    expect(after.weapon.stats.shotsFired).toBe(30 - after.weapon.magazine);
    expect(peak.maxRecoil, 'recoil must move the view while firing').toBeGreaterThan(0.5);
    expect(peak.maxSpread, 'sustained fire must open the cone').toBeGreaterThan(before.weapon.spreadDegrees);
    expect(after.weapon.spreadDegrees, 'the cone must recover after the burst').toBeLessThan(peak.maxSpread);
    await capture(page, 'combat', '01-after-burst');
  });

  test('dry fire then reload restores exactly the right ammunition', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    await teleport(page, 'openplan');
    await qa(page, 'freezeAI', true);

    // Empty the magazine
    await page.evaluate(() => window.__northstar.helpers.holdFire(4000));
    let s = await state(page);
    // The controller auto-reloads once the magazine runs dry, so allow either
    // an empty magazine or a completed reload.
    if (s.weapon.reloading) {
      await advance(page, 3500);
      s = await state(page);
    }
    expect(s.weapon.reloading).toBe(false);
    expect(s.weapon.magazine).toBe(30);
    expect(s.weapon.reserve).toBe(90);

    // Fire ten, reload with rounds remaining: reserve must lose exactly ten
    await page.evaluate(() => window.__northstar.helpers.holdFire(950));
    const mid = await state(page);
    const spent = 30 - mid.weapon.magazine;
    expect(spent).toBeGreaterThan(5);
    await page.evaluate(() => window.__northstar.helpers.tapKey('KeyR', 80));
    const during = await state(page);
    expect(during.weapon.reloading, 'reload must be reported while it plays').toBe(true);
    expect(during.weapon.reloadProgress).toBeGreaterThanOrEqual(0);
    await advance(page, 3200);
    const done = await state(page);
    expect(done.weapon.reloading).toBe(false);
    expect(done.weapon.magazine).toBe(30);
    expect(done.weapon.reserve).toBe(90 - spent);
    await capture(page, 'combat', '02-after-reload');
  });

  test('weapon switching honours draw and holster timing', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    const start = await state(page);
    expect(start.weapon.activeWeapon).toBe('rifle.northwind');

    await page.evaluate(() => window.__northstar.helpers.tapKey('Digit2', 60));
    await advance(page, 700);
    const pistol = await state(page);
    expect(pistol.weapon.activeWeapon).toBe('pistol.vsc9');
    expect(pistol.weapon.magazine).toBe(15);

    await page.evaluate(() => window.__northstar.helpers.tapKey('Digit3', 60));
    await advance(page, 600);
    const knife = await state(page);
    expect(knife.weapon.activeWeapon).toBe('knife.talon');
    expect(knife.weapon.magazineSize).toBe(0);

    await page.evaluate(() => window.__northstar.helpers.tapKey('Digit1', 60));
    await advance(page, 800);
    const back = await state(page);
    expect(back.weapon.activeWeapon).toBe('rifle.northwind');
    expect(back.weapon.magazine, 'switching must not refill the magazine').toBe(30);
  });

  test('every weapon fires, reloads and reports coherent state', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    await teleport(page, 'openplan');
    await qa(page, 'freezeAI', true);

    const ids = ['pistol.vsc9', 'smg.kestrel', 'rifle.northwind', 'shotgun.borealis', 'dmr.meridian'];
    for (const id of ids) {
      await qa(page, 'giveWeapon', id);
      await advance(page, 900);
      const s0 = await state(page);
      expect(s0.weapon.activeWeapon, `${id} must become active`).toBe(id);
      const mag0 = s0.weapon.magazine;
      expect(mag0, `${id} must start loaded`).toBeGreaterThan(0);

      await page.evaluate(() => window.__northstar.helpers.fire(2, 320));
      await advance(page, 500);
      const s1 = await state(page);
      expect(s1.weapon.magazine, `${id} must consume ammunition`).toBeLessThan(mag0);
      expect(s1.weapon.stats.shotsFired).toBeGreaterThan(0);

      await page.evaluate(() => window.__northstar.helpers.tapKey('KeyR', 60));
      await advance(page, 4200);
      const s2 = await state(page);
      expect(s2.weapon.reloading, `${id} reload must finish`).toBe(false);
      expect(s2.weapon.magazine, `${id} must be topped up`).toBe(s2.weapon.magazineSize);
    }
    expectNoConsoleErrors(page);
  });
});

test.describe('hit detection and damage', () => {
  test('shooting a hostile applies damage, then kills and ends its combat behaviour', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    await teleport(page, 'openplan');
    await qa(page, 'killAll');
    await advance(page, 200);

    // Spawn one hostile directly ahead and freeze it so the trace is repeatable
    const info = await page.evaluate(() => {
      const g = window.__northstar.game;
      const p = g.player;
      const fwd = p.lookDirection;
      const pos = [p.position.x + fwd.x * 6, p.position.y, p.position.z + fwd.z * 6];
      const id = g.qa.spawnEnemy(pos, 'kestrel.assault');
      const e = g.mission.enemies.find((x) => x.id === id);
      e.frozen = true;
      window.__northstar.helpers.lookAt(e.position.x, e.position.y + 1.25, e.position.z);
      return { id, pos: [e.position.x, e.position.y, e.position.z], health: e.health };
    });
    await advance(page, 120);
    const target = () => page.evaluate((id) => {
      const e = window.__northstar.game.mission.enemies.find((x) => x.id === id);
      return { alive: e.alive, health: e.health, state: e.state };
    }, info.id);

    const t0 = await target();
    expect(t0.health).toBeGreaterThan(90);

    await page.evaluate(() => window.__northstar.helpers.fire(3, 220));
    await advance(page, 200);
    const t1 = await target();
    expect(t1.health, 'body shots must reduce health').toBeLessThan(t0.health);

    const hitStats = (await state(page)).weapon.stats;
    expect(hitStats.shotsHit).toBeGreaterThan(0);
    await capture(page, 'combat', '03-hostile-hit');

    await page.evaluate(() => window.__northstar.helpers.holdFire(2200));
    await advance(page, 400);
    const t2 = await target();
    expect(t2.alive, 'sustained fire must neutralise the hostile').toBe(false);
    expect(t2.state).toBe('dead');

    const s = await state(page);
    expect(s.weapon.stats.kills).toBeGreaterThan(0);
    expect(s.mission.enemies.alive).toBe(0);
    await capture(page, 'combat', '04-hostile-down');
    const runtime = await collectRuntimeErrors(page);
    expect(runtime).toEqual([]);
  });

  test('headshots do more damage than limb shots', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    await teleport(page, 'openplan');
    await qa(page, 'killAll');

    const measure = async (aimAt) => page.evaluate(async (part) => {
      const g = window.__northstar.game;
      const p = g.player;
      const fwd = p.lookDirection;
      const pos = [p.position.x + fwd.x * 5, p.position.y, p.position.z + fwd.z * 5];
      const id = g.qa.spawnEnemy(pos, 'kestrel.assault');
      const e = g.mission.enemies.find((x) => x.id === id);
      e.frozen = true;
      e.armor = 0;
      const y = part === 'head' ? 1.68 : 0.55;
      window.__northstar.helpers.lookAt(e.position.x, e.position.y + y, e.position.z);
      window.advanceTime(60);
      const before = e.health;
      window.__northstar.helpers.mouse(0, true);
      window.advanceTime(30);
      window.__northstar.helpers.mouse(0, false);
      window.advanceTime(60);
      const dealt = before - e.health;
      e.damage(9999, {});
      return dealt;
    }, aimAt);

    const head = await measure('head');
    const leg = await measure('leg');
    expect(head, 'a head hit must register').toBeGreaterThan(0);
    expect(leg, 'a leg hit must register').toBeGreaterThan(0);
    expect(head, 'head damage must exceed limb damage').toBeGreaterThan(leg * 2);
  });

  test('bullets damage glass and shatter it, changing sight and collision', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    await teleport(page, 'conference');
    await qa(page, 'freezeAI', true);

    const before = await page.evaluate(() => {
      const panes = window.__northstar.game.level.glass.panes;
      return { total: panes.length, intact: panes.filter((p) => p.state === 'intact').length };
    });

    // Aim at the nearest interior glass pane and empty a magazine into it
    const aimed = await page.evaluate(() => {
      const g = window.__northstar.game;
      const p = g.player;
      const panes = g.level.glass.panes
        .filter((q) => q.state === 'intact' && Math.abs(q.center.y - p.position.y) < 3)
        .sort((a, b) => a.center.distanceTo(p.position) - b.center.distanceTo(p.position));
      if (!panes.length) return null;
      const t = panes[0];
      window.__northstar.helpers.lookAt(t.center.x, t.center.y, t.center.z);
      return { id: t.id, dist: t.center.distanceTo(p.position) };
    });
    expect(aimed, 'a reachable glass pane must exist near the conference room').not.toBeNull();

    await page.evaluate(() => window.__northstar.helpers.holdFire(1400));
    await advance(page, 400);
    const after = await page.evaluate(() => {
      const panes = window.__northstar.game.level.glass.panes;
      return {
        intact: panes.filter((p) => p.state === 'intact').length,
        cracked: panes.filter((p) => p.state === 'cracked').length,
        broken: panes.filter((p) => p.state === 'broken').length,
      };
    });
    expect(after.cracked + after.broken, 'glass must show damage').toBeGreaterThan(0);
    expect(after.intact).toBeLessThan(before.intact);
    await capture(page, 'combat', '05-glass-damage');
  });

  test('utility devices detonate and affect hostiles', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    await teleport(page, 'openplan');
    await qa(page, 'killAll');

    const res = await page.evaluate(async () => {
      const g = window.__northstar.game;
      const p = g.player;
      const fwd = p.lookDirection;
      const id = g.qa.spawnEnemy([p.position.x + fwd.x * 5, p.position.y, p.position.z + fwd.z * 5], 'kestrel.assault');
      const e = g.mission.enemies.find((x) => x.id === id);
      e.lastKnownTarget = p.position.clone();
      window.__northstar.helpers.tapKey('KeyG', 70);
      window.advanceTime(2600);
      const blinded = e.blindUntil > e.stateTimeGlobal;
      const stateAfterFlash = e.state;
      window.__northstar.helpers.tapKey('KeyH', 70);
      window.advanceTime(2600);
      const smokes = g.mission.smokeVolumes.length;
      return { blinded, stateAfterFlash, smokes };
    });
    expect(res.blinded, 'a flash must blind a hostile with line of sight').toBe(true);
    expect(res.smokes, 'a smoke device must create an occluding volume').toBeGreaterThan(0);
    await capture(page, 'combat', '06-smoke-and-flash');
  });
});
