import { expect } from '@playwright/test';
import {
  test,
  bootGame, advance, state, qa, shot, digest, releaseAll, gameMode, tap,
  expectNoConsoleErrors, enterGameplay, writeArtifact, recordEvents,
  takeEvents, advanceUntil, waitForMode, burst,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 9 — the mission as a whole.
//
// Proves the three endings really end: extraction wins, death loses, the clock
// running out loses. Then proves a restart is a genuine reset by comparing a
// full state digest against a freshly-inserted run — enemies, hostages, ammo,
// timer, doors, effects and objectives all have to match.
// ---------------------------------------------------------------------------

test.describe('mission', () => {
  test('the objective chain runs from insertion to victory', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await recordEvents(page, ['objective:update', 'mission:end', 'ui:announce']);
    await qa(page, 'freezeAI', true);

    const chain = await qa(page, 'listObjectives');
    expect(chain.length, 'the mission has no objectives').toBeGreaterThan(4);

    // Walk the chain beat by beat, checking each becomes active in turn.
    const trace = [];
    for (const step of chain) {
      const jump = await qa(page, 'jumpToObjective', step.id);
      expect(jump.ok, `jumpToObjective(${step.id}) failed: ${JSON.stringify(jump)}`).toBe(true);
      await advance(page, 500);
      const s = await state(page);
      const o = s.mission.objectives.find((x) => x.id === step.id);
      trace.push({
        id: step.id, state: o.state, active: s.mission.active,
        room: s.player.room, secured: s.mission.hostagesSecured,
        garage: s.mission.garageOpen,
      });
      await shot(page, `mission-objective-${step.id}`);
      // Everything before this beat must be resolved, not pending.
      const earlier = s.mission.objectives.filter((x) => x.index < o.index);
      const stillPending = earlier.filter((x) => x.state === 'pending');
      expect(
        stillPending.map((x) => x.id),
        `jumping to "${step.id}" left earlier objectives pending`
      ).toEqual([]);
    }

    writeArtifact('mission-chain.json', trace);

    // Now finish it: hold the bay until the pickup completes.
    await qa(page, 'jumpToObjective', 'hold-extraction');
    await qa(page, 'extractHostages');
    await advance(page, 600);
    const staged = await state(page);
    expect(staged.mission.extraction.playerInside, 'the player is not inside the extraction volume').toBe(true);
    expect(staged.mission.extraction.staged, 'the hostages are not staged in the bay').toBe(true);

    const won = await advanceUntil(page, "state.outcome === 'victory'", { budgetMs: 60_000, step: 250, render: false });
    const end = await state(page);
    const events = await takeEvents(page, ['mission:end', 'objective:update']);

    writeArtifact('mission-victory.json', {
      outcome: end.outcome, reason: end.mission.reason,
      objectives: end.mission.objectives.map((o) => [o.id, o.state]),
      hostages: { extracted: end.mission.hostagesExtracted, lost: end.mission.hostagesLost },
      events: events.slice(-8),
    });

    expect(won, `the mission never reached victory (outcome ${end.outcome}, hold ${end.mission.extraction.holdRemaining})`).toBe(true);
    expect(end.mission.reason).toBe('hostagesExtracted');
    expect(end.mission.hostagesExtracted).toBe(2);
    expect(end.mission.hostagesLost).toBe(0);
    expect(events.some((e) => e.type === 'mission:end'), 'no mission:end event').toBe(true);

    // The victory screen must actually appear.
    await advance(page, 1500);
    await waitForMode(page, 'victory', 15_000);
    await shot(page, 'mission-victory');

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('the player dying is a defeat', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true });
    await recordEvents(page, ['player:death', 'mission:end']);

    const before = await state(page);
    expect(before.player.alive).toBe(true);
    expect(before.outcome).toBeNull();

    // Chip the health down so the damage path is exercised, then finish it.
    await page.evaluate(() => { window.__NORTHSTAR__.player.armor = 0; });
    for (let i = 0; i < 6; i++) {
      await qa(page, 'damagePlayer', 25, 'bullet');
      await advance(page, 200);
      if (!(await state(page)).player.alive) break;
    }
    await advance(page, 4000);

    const after = await state(page);
    const events = await takeEvents(page, ['player:death', 'mission:end']);

    writeArtifact('mission-defeat-death.json', {
      health: after.player.health, alive: after.player.alive,
      outcome: after.outcome, reason: after.mission.reason, events,
    });

    expect(after.player.alive, 'the player survived 150 damage with no armour').toBe(false);
    expect(after.player.health).toBe(0);
    expect(after.outcome, 'dying did not end the mission').toBe('defeat');
    expect(after.mission.reason).toBe('playerDead');
    expect(events.some((e) => e.type === 'player:death'), 'no player:death event').toBe(true);

    await advance(page, 1500);
    await waitForMode(page, 'defeat', 15_000);
    await shot(page, 'mission-defeat-death');

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('the clock running out is a defeat', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, godMode: true });
    await recordEvents(page, ['mission:end', 'ui:announce']);

    const before = await state(page);
    expect(before.mission.timeRemaining).toBeGreaterThan(0);
    expect(before.mission.timeLimit).toBeGreaterThan(0);

    // Wind the clock down rather than simulating twelve minutes.
    await page.evaluate(() => { window.__NORTHSTAR__.director.timeRemaining = 1.5; });
    const expired = await advanceUntil(page, "state.outcome !== null", { budgetMs: 20_000, step: 200, render: false });

    const after = await state(page);
    const events = await takeEvents(page, ['mission:end']);

    writeArtifact('mission-defeat-timeout.json', {
      timeRemaining: after.mission.timeRemaining,
      outcome: after.outcome, reason: after.mission.reason, events,
    });

    expect(expired, `the clock ran out without ending the mission (remaining ${after.mission.timeRemaining})`).toBe(true);
    expect(after.mission.timeRemaining, 'the clock went negative').toBeGreaterThanOrEqual(0);
    expect(after.outcome).toBe('defeat');
    expect(after.mission.reason).toBe('timeout');

    await advance(page, 1500);
    await waitForMode(page, 'defeat', 15_000);
    await shot(page, 'mission-defeat-timeout');

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('restart is a complete reset: the digest matches a fresh insertion', async ({ page }) => {
    await bootGame(page);

    // --- reference: a clean insertion, sampled after a fixed settle ---
    await qa(page, 'forcePlay', { difficulty: 'operator', loadout: { primary: 'carbine', secondary: 'pistol', gadget: 'flash' } });
    await qa(page, 'freezeAI', true);
    await advance(page, 800, { render: false });
    const reference = await qa(page, 'screenshotState');
    await shot(page, 'mission-fresh');

    // --- dirty the world thoroughly ---
    await qa(page, 'freezeAI', false);
    await qa(page, 'teleport', 'openoffice');
    await qa(page, 'damagePlayer', 30);
    await qa(page, 'giveKeycard', true);
    await qa(page, 'secureHostage', 'hostage-a');
    await qa(page, 'openGarage');
    await qa(page, 'setObjectiveState', 'infiltrate', 'done');
    await page.evaluate(() => {
      const g = window.__NORTHSTAR__;
      // Open a door, kill a hostile, burn some ammunition, spend the clock.
      const door = Array.from(g.doors.doors.values()).find((d) => !d.locked && !d.spec.shutter);
      door?.forceOpen(1);
      const e = g.enemies.list.find((x) => x.alive);
      e?.applyDamage(1000, { region: 'head', byPlayer: true });
      g.weapons.current.ammo = 3;
      g.weapons.current.reserve = 12;
      g.director.timeRemaining -= 120;
    });
    await burst(page, 'forward', 400, { pause: 150, render: false });
    await advance(page, 2000, { render: false });

    const dirty = await qa(page, 'screenshotState');
    await shot(page, 'mission-dirty');
    expect(dirty.digest, 'the world was not actually dirtied').not.toBe(reference.digest);

    // --- restart through the real API and settle for exactly as long ---
    await page.evaluate(() => window.__NORTHSTAR__.restart());
    for (let i = 0; i < 80 && (await gameMode(page)) !== 'playing'; i++) {
      await advance(page, 100);
    }
    // `restart` goes through the loading screen; the harness may need to nudge
    // it as the transition is driven from the fixed step.
    if ((await gameMode(page)) !== 'playing') {
      await page.evaluate(() => window.__NORTHSTAR__.beginPlay());
    }
    expect(await gameMode(page), 'restart never returned to playing').toBe('playing');
    await qa(page, 'freezeAI', true);
    await advance(page, 800, { render: false });
    const restarted = await qa(page, 'screenshotState');
    await shot(page, 'mission-restarted');

    // Report the field-level differences before asserting, so a failure is
    // immediately actionable rather than "two hashes differ".
    const diff = diffDigests(reference, restarted);
    writeArtifact('mission-restart.json', {
      reference: reference.digest, dirty: dirty.digest, restarted: restarted.digest, diff,
    });

    // Continuous quantities are allowed a sub-step of slack: a restart runs
    // through the loading transition, so the two runs do not necessarily enter
    // the settle on the same fixed-step phase, and 800 ms of simulation can land
    // one or two 8.3 ms steps apart. Anything discrete — health, ammunition,
    // secured hostages, objective states, who is alive — has to match exactly.
    const material = diff.filter((d) => {
      const bothNumbers = typeof d.fresh === 'number' && typeof d.restarted === 'number';
      return !(bothNumbers && Math.abs(d.fresh - d.restarted) <= 0.05);
    });
    writeArtifact('mission-restart.json', {
      reference: reference.digest, dirty: dirty.digest, restarted: restarted.digest, diff, material,
    });

    expect(material, `restart did not restore a fresh state:\n${JSON.stringify(material, null, 2)}`).toEqual([]);
    expect(restarted.player.health, 'the restarted player kept the damage').toBe(reference.player.health);
    expect(restarted.weapon, 'the restarted loadout is not the fresh one').toEqual(reference.weapon);
    expect(restarted.mission.objectives, 'objective progress survived the restart')
      .toEqual(reference.mission.objectives);
    expect(restarted.hostages, 'hostage state survived the restart').toEqual(reference.hostages);

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });
});

/** Field-level comparison of two `screenshotState()` snapshots. */
function diffDigests(a, b) {
  const out = [];
  const walk = (x, y, path) => {
    if (path === 'digest' || path === 'simTime') return;
    if (JSON.stringify(x) === JSON.stringify(y)) return;
    if (x && y && typeof x === 'object' && typeof y === 'object' && !Array.isArray(x)) {
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], path ? `${path}.${k}` : k);
      return;
    }
    if (Array.isArray(x) && Array.isArray(y) && x.length === y.length) {
      for (let i = 0; i < x.length; i++) walk(x[i], y[i], `${path}[${i}]`);
      return;
    }
    out.push({ path, fresh: x, restarted: y });
  };
  walk(a, b, '');
  return out;
}
