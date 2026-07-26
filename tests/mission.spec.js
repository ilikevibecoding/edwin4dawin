import { test, expect } from '@playwright/test';
import {
  gotoGame, enterGameplay, state, advance, capture, qa, teleport,
  expectNoConsoleErrors, collectRuntimeErrors, writeReport,
} from './helpers.js';

/**
 * Mission flow: doors, hostages, escort, extraction, victory, defeat, restart.
 * Owner: Opus 4, fixes coordinated with Opus 3.
 */

test.describe.configure({ mode: 'serial' });

test.describe('doors', () => {
  test('opening a door changes its visual state, collision, navigation and text state', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    await qa(page, 'freezeAI', true);
    await teleport(page, 'midcorr');
    await advance(page, 200);

    // Find the nearest interactable door and face it
    const target = await page.evaluate(() => {
      const g = window.__northstar.game;
      const p = g.player;
      const doors = g.level.doors.doors
        .filter((d) => !d.roller && Math.abs(d.center.y - p.position.y) < 3)
        .sort((a, b) => a.center.distanceTo(p.position) - b.center.distanceTo(p.position));
      const d = doors[0];
      if (d.locked) d.unlock();
      // Stand 1.2 m in front of the door on the player's side
      const n = d.axis === 'x' ? { x: 1, z: 0 } : { x: 0, z: 1 };
      const side = Math.sign((d.axis === 'x' ? p.position.x - d.at : p.position.z - d.at)) || 1;
      g.player.teleport([
        d.center.x + n.x * 1.15 * side, p.position.y, d.center.z + n.z * 1.15 * side,
      ]);
      window.__northstar.helpers.lookAt(d.center.x, d.center.y, d.center.z);
      return { id: d.id, kind: d.kind, center: [d.center.x, d.center.y, d.center.z] };
    });
    await advance(page, 120);

    const before = await state(page);
    const dBefore = before.nearbyDoors.find((d) => d.id === target.id);
    expect(dBefore, 'the door must appear in the reported nearby doors').toBeTruthy();
    expect(dBefore.state).toBe('closed');
    expect(dBefore.passable).toBe(false);
    const blockedBefore = await page.evaluate((c) => {
      const { collision } = window.__northstar.game.level.nav ? window.__northstar : {};
      void collision;
      return window.__northstar.game.level.doors.byId.get(c).colliders().length > 0;
    }, target.id);
    expect(blockedBefore, 'a closed door must contribute collision').toBe(true);
    await capture(page, 'doors', '01-closed');

    const prompt = before.interactables.find((i) => i.kind === 'door');
    expect(prompt, 'an interaction prompt must be offered').toBeTruthy();
    expect(prompt.verb).toMatch(/Open/);

    await page.evaluate(() => window.__northstar.helpers.tapKey('KeyE', 80));
    await advance(page, 1200);

    const after = await state(page);
    const dAfter = after.nearbyDoors.find((d) => d.id === target.id);
    expect(dAfter.state).toBe('open');
    expect(dAfter.openAmount).toBeGreaterThan(0.9);
    expect(dAfter.passable).toBe(true);
    const blockedAfter = await page.evaluate(
      (c) => window.__northstar.game.level.doors.byId.get(c).colliders().length,
      target.id,
    );
    expect(blockedAfter, 'an open door must not block movement').toBe(0);
    await capture(page, 'doors', '02-open');

    // And it closes again
    await page.evaluate(() => window.__northstar.helpers.tapKey('KeyE', 80));
    await advance(page, 1200);
    const closed = await state(page);
    expect(closed.nearbyDoors.find((d) => d.id === target.id).state).toBe('closed');
  });

  test('the garage shutter rolls and clears the opening', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    await qa(page, 'freezeAI', true);
    const res = await page.evaluate(() => {
      const g = window.__northstar.game;
      const d = g.level.doors.doors.find((x) => x.roller);
      const before = { state: d.state, colliders: d.colliders().length };
      d.toggle(false, 'open');
      window.advanceTime(4200);
      return { before, after: { state: d.state, colliders: d.colliders().length, open: d.openAmount } };
    });
    expect(res.before.colliders).toBeGreaterThan(0);
    expect(res.after.state).toBe('open');
    expect(res.after.open).toBeGreaterThan(0.95);
    expect(res.after.colliders).toBe(0);
  });

  test('locked doors refuse to open and report it', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    const res = await page.evaluate(() => {
      const g = window.__northstar.game;
      const d = g.level.doors.doors.find((x) => x.kind === 'server' || x.kind === 'security');
      d.locked = true;
      d.state = 'locked';
      const ok = d.toggle(true);
      window.advanceTime(800);
      const locked = { ok, state: d.state, open: d.openAmount };
      d.unlock();
      const ok2 = d.toggle(true);
      window.advanceTime(1000);
      return { locked, unlocked: { ok: ok2, state: d.state, open: d.openAmount } };
    });
    expect(res.locked.ok).toBe(false);
    expect(res.locked.open).toBe(0);
    expect(res.unlocked.ok).toBe(true);
    expect(res.unlocked.open).toBeGreaterThan(0.9);
  });
});

test.describe('hostages and extraction', () => {
  test('securing a hostage changes behaviour, HUD state, objective and extraction eligibility', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    await qa(page, 'freezeAI', true);

    // Stand next to Dana in the conference room and look at her
    await page.evaluate(() => {
      const g = window.__northstar.game;
      const h = g.mission.hostages[0];
      g.player.noclip = false;
      g.player.teleport([h.position.x - 1.4, h.position.y, h.position.z + 0.5]);
      window.__northstar.helpers.lookAt(h.position.x, h.position.y + 1.1, h.position.z);
    });
    await advance(page, 300);

    const before = await state(page);
    const h0 = before.mission.hostages[0];
    expect(h0.state).toBe('held');
    expect(before.mission.extraction.eligible).toBe(false);
    const prompt = before.interactables.find((i) => i.kind === 'hostage');
    expect(prompt, 'a hostage interaction must be offered').toBeTruthy();
    expect(prompt.verb).toContain('Secure');
    await capture(page, 'hostage', '01-held');

    await page.evaluate(() => window.__northstar.helpers.tapKey('KeyE', 80));
    await advance(page, 600);
    const mid = await state(page);
    expect(mid.mission.hostages[0].state).toBe('following');
    expect(mid.mission.objective.id).not.toBe('infiltrate');
    await capture(page, 'hostage', '02-following');

    // The hostage must actually follow when the player moves
    const startPos = mid.mission.hostages[0].position;
    await page.evaluate(() => {
      const g = window.__northstar.game;
      g.player.teleport([g.player.position.x - 6, g.player.position.y, g.player.position.z]);
    });
    await advance(page, 4000);
    const moved = await state(page);
    const nowPos = moved.mission.hostages[0].position;
    const delta = Math.hypot(nowPos[0] - startPos[0], nowPos[2] - startPos[2]);
    expect(delta, 'the hostage must move toward the player').toBeGreaterThan(1.5);

    // Hold / follow toggle
    await page.evaluate(() => {
      const g = window.__northstar.game;
      const h = g.mission.hostages[0];
      g.player.teleport([h.position.x - 1.3, h.position.y, h.position.z]);
      window.__northstar.helpers.lookAt(h.position.x, h.position.y + 1.1, h.position.z);
    });
    await advance(page, 200);
    await page.evaluate(() => window.__northstar.helpers.tapKey('KeyE', 80));
    await advance(page, 400);
    expect((await state(page)).mission.hostages[0].state).toBe('stopped');
    await page.evaluate(() => window.__northstar.helpers.tapKey('KeyE', 80));
    await advance(page, 400);
    expect((await state(page)).mission.hostages[0].state).toBe('following');

    // Secure the second hostage too -> extraction becomes eligible
    await qa(page, 'secureHostages');
    await advance(page, 400);
    const both = await state(page);
    expect(both.mission.hostages.every((h) => h.state === 'following' || h.state === 'stopped')).toBe(true);
    expect(both.mission.extraction.eligible).toBe(true);
    expectNoConsoleErrors(page);
  });

  test('a hostage can path to the extraction garage from both holding rooms', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    const res = await page.evaluate(() => {
      const g = window.__northstar.game;
      const out = [];
      for (const h of g.mission.hostages) {
        const path = g.level.nav.findPath(h.position, g.mission.extractionPoint);
        out.push({
          id: h.id,
          room: h.room,
          pathLength: path ? path.length : 0,
          reachable: !!(path && path.length),
          distance: path ? path.reduce((s, p, i) => (i ? s + p.distanceTo(path[i - 1]) : 0), 0) : 0,
        });
      }
      return out;
    });
    writeReport('hostage-paths', res);
    for (const r of res) {
      expect(r.reachable, `${r.id} must be able to reach extraction`).toBe(true);
      expect(r.distance).toBeGreaterThan(10);
    }
  });

  test('full extraction produces victory with a coherent summary', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    await qa(page, 'freezeAI', true);
    await qa(page, 'secureHostages');
    await advance(page, 300);

    // Walk everyone into the extraction bay
    await page.evaluate(() => {
      const g = window.__northstar.game;
      const c = g.mission.extractionPoint;
      g.player.teleport([c.x, c.y, c.z]);
      for (const h of g.mission.hostages) {
        h.position.set(c.x + (Math.random() - 0.5) * 1.2, c.y, c.z + (Math.random() - 0.5) * 1.2);
        h.group.position.copy(h.position);
      }
    });
    await advance(page, 900);
    const holding = await state(page);
    expect(holding.mission.extraction.playerInside).toBe(true);
    expect(holding.mission.extraction.active).toBe(true);
    await capture(page, 'flow', '10-extraction-hold');

    await advance(page, 5000);
    const done = await state(page);
    expect(done.victory).toBe(true);
    expect(done.mission.state).toBe('victory');
    expect(done.mission.hostages.every((h) => h.state === 'extracted')).toBe(true);
    expect(done.stats.hostagesExtracted).toBe(2);

    await page.waitForSelector('[data-testid="screen-victory"]', { timeout: 20000 });
    await capture(page, 'flow', '11-victory');
    expectNoConsoleErrors(page);
  });

  test('player death produces defeat and the defeat screen', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    await page.evaluate(() => {
      window.__northstar.game.player.damage(500, null, 'bullet');
      window.advanceTime(400);
    });
    const s = await state(page);
    expect(s.defeat).toBe(true);
    expect(s.player.alive).toBe(false);
    await page.waitForSelector('[data-testid="screen-defeat"]', { timeout: 20000 });
    await capture(page, 'flow', '12-defeat');
  });

  test('mission clock expiry produces defeat', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    await page.evaluate(() => {
      const m = window.__northstar.game.mission;
      m.elapsed = m.difficulty.missionSeconds - 0.5;
      window.advanceTime(1500);
    });
    const s = await state(page);
    expect(s.defeat).toBe(true);
    expect(s.mission.result.reason).toContain('clock');
  });
});

test.describe('restart and reset', () => {
  test('restart resets enemies, hostages, ammunition, timer, doors, glass and objectives', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);

    // Make a mess: fire, break glass, open doors, secure hostages, kill enemies
    const dirty = await page.evaluate(() => {
      const g = window.__northstar.game;
      g.qa.freezeAI(true);
      g.qa.secureHostages();
      g.qa.killAll();
      for (let i = 0; i < 8; i++) g.qa.breakGlass(i);
      for (const d of g.level.doors.doors.slice(0, 6)) { if (d.locked) d.unlock(); d.toggle(false, 'open'); }
      g.combat.current.magazine = 3;
      g.combat.current.reserve = 12;
      g.player.health = 41;
      g.player.armor = 12;
      g.mission.elapsed = 120;
      g.mission.alarm = true;
      window.advanceTime(1500);
      return JSON.parse(window.render_game_to_text());
    });
    expect(dirty.mission.enemies.alive).toBe(0);
    expect(dirty.weapon.magazine).toBeLessThan(30);
    await capture(page, 'flow', '13-before-restart');

    await page.evaluate(async () => { await window.__northstar.game.restart(); });
    await advance(page, 600);
    const clean = await state(page);

    expect(clean.gameMode).toBe('playing');
    expect(clean.mission.state).toBe('active');
    expect(clean.mission.enemies.alive, 'every hostile must respawn').toBe(clean.mission.enemies.total);
    expect(clean.mission.hostages.every((h) => h.state === 'held')).toBe(true);
    expect(clean.mission.alarm).toBe(false);
    expect(clean.mission.objective.id).toBe('infiltrate');
    expect(clean.mission.timer.elapsedSeconds).toBeLessThan(2);
    expect(clean.player.health).toBe(100);
    expect(clean.player.armor).toBe(100);
    expect(clean.weapon.magazine).toBe(30);
    expect(clean.weapon.reserve).toBe(120);
    expect(clean.weapon.stats.shotsFired).toBe(0);
    const glass = await page.evaluate(() => {
      const p = window.__northstar.game.level.glass.panes;
      return { broken: p.filter((q) => q.state !== 'intact').length };
    });
    expect(glass.broken, 'all glass must be restored').toBe(0);
    const doors = await page.evaluate(() => window.__northstar.game.level.doors.doors.filter((d) => d.openAmount > 0.05).length);
    expect(doors, 'all doors must be closed').toBe(0);
    // Player must be back at the courtyard spawn
    expect(clean.player.position[2]).toBeLessThan(-24);
    await capture(page, 'flow', '14-after-restart');

    const runtime = await collectRuntimeErrors(page);
    expect(runtime).toEqual([]);
  });

  test('victory then restart yields a fully clean run', async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page);
    await qa(page, 'forceVictory');
    await advance(page, 400);
    expect((await state(page)).victory).toBe(true);
    await page.evaluate(async () => { await window.__northstar.game.restart(); });
    await advance(page, 600);
    const s = await state(page);
    expect(s.victory).toBe(false);
    expect(s.defeat).toBe(false);
    expect(s.gameMode).toBe('playing');
    expect(s.mission.state).toBe('active');
  });
});
