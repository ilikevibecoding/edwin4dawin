import { expect } from '@playwright/test';
import {
  test, bootGame, enterGameplay, state, advance, qa, shot,
  writeArtifact, expectNoConsoleErrors,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Traversal regression.  (owner: opus1)
//
// The navigation grid is not evidence that a human can walk a route. It bakes
// its own stair links, so it happily returned a path from the mezzanine landing
// to the executive office at a point when the strip of landing beyond the top
// of the central flight was 0.60 m wide and a player capsule is 0.66 m — you
// could climb the stairs and then be physically unable to step off them, which
// cut hostage B out of the map while every AI navigation test still passed.
//
// So these tests drive the player with movement input, from the lobby, all the
// way to each hostage, and never teleport past the part being tested.
// ---------------------------------------------------------------------------

/**
 * Ask the navigation grid for a route, then *walk* it with movement input.
 *
 * This is the assertion that matters. The AI navigation tests only prove the
 * grid can find a path; they cannot prove a player capsule fits through it,
 * because the grid bakes its own stair links. Driving the real controller along
 * the grid's own answer is what catches the two apart.
 */
async function followNavTo(page, [x, y, z], { budgetMs = 60_000, tolerance = 1.2 } = {}) {
  return page.evaluate(({ x, y, z, budgetMs, tolerance }) => {
    const g = window.__NORTHSTAR__;
    const target = g.player.position.clone().set(x, y, z);
    const path = g.nav?.findPath?.(g.player.position.clone(), target);
    if (!path || !path.length) {
      return { ok: false, reason: 'navigation found no route at all', waypoints: 0 };
    }
    const opened = [];
    const step = 100;
    let spent = 0;
    let reached = 0;
    g.input.setActionState('forward', true);
    for (const wp of path) {
      let best = Infinity;
      let stuckFor = 0;
      while (spent < budgetMs) {
        const dx = wp.x - g.player.position.x;
        const dz = wp.z - g.player.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.5) break;
        g.player.yaw = Math.atan2(-dx, -dz); // yaw 0 faces -Z
        g.player.pitch = 0;
        window.advanceTime(step, { render: false });
        spent += step;
        if (d < best - 0.02) { best = d; stuckFor = 0; } else { stuckFor += step; }
        if (stuckFor > 600) {
          const it = g.findInteractable?.();
          if (it && it.kind === 'door' && !opened.includes(it.id)) {
            g.input.tapAction('use');
            opened.push(it.id);
            for (let k = 0; k < 14; k++) { window.advanceTime(step, { render: false }); spent += step; }
            stuckFor = 0;
          } else if (stuckFor > 2200) break;
        }
      }
      if (Math.hypot(wp.x - g.player.position.x, wp.z - g.player.position.z) < 0.9) reached++;
      else break;
    }
    g.input.setActionState('forward', false);
    window.advanceTime(200, { render: false });
    const p = g.player.position;
    const remaining = Math.hypot(x - p.x, z - p.z);
    return {
      ok: remaining < tolerance,
      remaining: +remaining.toFixed(2),
      waypoints: path.length,
      reached,
      position: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)],
      room: g.currentRoom()?.id ?? null,
      opened,
      simSeconds: +(spent / 1000).toFixed(1),
    };
  }, { x, y, z, budgetMs, tolerance });
}

/** Steer toward a point with the forward key, opening any door in the way. */
async function goTo(page, x, z, { budgetMs = 12_000, tolerance = 0.7 } = {}) {
  return page.evaluate(({ x, z, budgetMs, tolerance }) => {
    const g = window.__NORTHSTAR__;
    const opened = [];
    let best = Infinity;
    let stuckFor = 0;
    const step = 100;
    g.input.setActionState('forward', true);
    for (let t = 0; t < budgetMs; t += step) {
      // yaw 0 faces -Z and increases counter-clockwise seen from above
      g.player.yaw = Math.atan2(-(x - g.player.position.x), -(z - g.player.position.z));
      g.player.pitch = 0;
      window.advanceTime(step, { render: false });
      const d = Math.hypot(x - g.player.position.x, z - g.player.position.z);
      if (d < tolerance * 0.7) break;
      if (d < best - 0.02) { best = d; stuckFor = 0; } else { stuckFor += step; }
      if (stuckFor > 600) {
        const it = g.findInteractable?.();
        if (it && it.kind === 'door' && !opened.includes(it.id)) {
          g.input.tapAction('use');
          opened.push(it.id);
          for (let k = 0; k < 14; k++) window.advanceTime(step, { render: false });
          stuckFor = 0;
        } else if (stuckFor > 2500) break;
      }
    }
    g.input.setActionState('forward', false);
    window.advanceTime(200, { render: false });
    const p = g.player.position;
    return {
      position: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)],
      remaining: +Math.hypot(x - p.x, z - p.z).toFixed(2),
      room: g.currentRoom()?.id ?? null,
      opened,
    };
  }, { x, z, budgetMs, tolerance });
}

async function leg(page, label, x, z, opts) {
  const r = await goTo(page, x, z, opts);
  expect(
    r.remaining,
    `could not walk to ${label} — stopped ${r.remaining} m short at ${JSON.stringify(r.position)} in "${r.room}"`
  ).toBeLessThan(opts?.tolerance ?? 0.7);
  return r;
}

test.describe('traversal', () => {
  test('both stair flights have room to stand at the head and the foot', async ({ page }) => {
    await bootGame(page);
    // Read the clearances the map builder measured while assembling the stairs.
    const clear = await page.evaluate(() => window.__NORTHSTAR__?.level?.stairClearances ?? []);
    expect(clear.length, 'the level reported no stair clearances').toBeGreaterThan(0);
    writeArtifact('traversal-stair-clearance.json', clear);
    const CAPSULE = 0.66;
    for (const s of clear) {
      expect(s.head, `${s.id}: nothing to step onto at the head of the flight`).toBeGreaterThan(CAPSULE);
      expect(s.foot, `${s.id}: nowhere to stand at the foot of the flight`).toBeGreaterThan(CAPSULE);
    }
  });

  test('the player can walk from the lobby to hostage A on foot', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await qa(page, 'killAllEnemies');
    await advance(page, 800, { render: false });
    await qa(page, 'teleport', 'lobby');
    await advance(page, 300, { render: false });

    const r = await followNavTo(page, [15.4, 0, 4.2]);
    writeArtifact('traversal-hostage-a.json', r);
    expect(
      r.ok,
      `could not walk the navigation route to hostage A — reached ${r.reached}/${r.waypoints} waypoints, ` +
      `stopped ${r.remaining} m short at ${JSON.stringify(r.position)} in "${r.room}"`
    ).toBe(true);

    const s = await state(page);
    expect(s.player?.room, 'the conference room was not reached on foot').toBe('conference');
    await shot(page, 'traversal-hostage-a');
    await expectNoConsoleErrors(page);
  });

  test('the player can walk from the lobby up to hostage B on the mezzanine', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await qa(page, 'killAllEnemies');
    await advance(page, 800, { render: false });
    await qa(page, 'teleport', 'lobby');
    await advance(page, 300, { render: false });

    await leg(page, 'the stair-hall arch', 11.6, -5.4);
    await leg(page, 'the foot of the central flight', 14.5, -2.35);
    const climbed = await leg(page, 'the head of the central flight', 14.5, -7.3, { budgetMs: 14_000 });
    expect(climbed.position[1], 'the player did not reach the mezzanine floor level').toBeGreaterThan(3.5);

    // The leg that used to be impossible: stepping off the flight onto the
    // landing and heading west.
    await leg(page, 'the mezzanine landing', 12.2, -6.5, { budgetMs: 9_000 });
    await leg(page, 'the executive corridor', 9.0, -6.5, { budgetMs: 9_000 });
    await leg(page, 'the west end of the executive corridor', -9.6, -6.4, { budgetMs: 22_000 });
    await leg(page, 'the executive office', -13.0, -6.2, { budgetMs: 12_000 });

    const s = await state(page);
    writeArtifact('traversal-hostage-b.json', { room: s.player?.room, position: s.player?.position });
    expect(s.player?.room, 'the executive office was not reached on foot').toBe('execoffice');
    await shot(page, 'traversal-hostage-b');
    await expectNoConsoleErrors(page);
  });

  test('the west service stair is a working second route to the mezzanine', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await qa(page, 'killAllEnemies');
    await advance(page, 800, { render: false });
    await qa(page, 'teleport', 'waiting');
    await advance(page, 300, { render: false });

    // Block the central stair out of the route by starting in the west wing and
    // asking for the executive office: the grid's cheapest answer from here is
    // the west service stair.
    const r = await followNavTo(page, [-16.4, 4, -5.2], { budgetMs: 80_000 });
    writeArtifact('traversal-west-stair.json', r);
    expect(
      r.ok,
      `could not walk the navigation route to the executive office — reached ${r.reached}/${r.waypoints} ` +
      `waypoints, stopped ${r.remaining} m short at ${JSON.stringify(r.position)} in "${r.room}"`
    ).toBe(true);
    expect(r.position[1], 'the player never reached the mezzanine').toBeGreaterThan(3.5);

    const s = await state(page);
    expect(s.player?.room, 'the west route does not reach the executive office').toBe('execoffice');
    await shot(page, 'traversal-west-stair');
    await expectNoConsoleErrors(page);
  });
});
