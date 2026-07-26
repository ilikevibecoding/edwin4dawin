import { test, expect } from '@playwright/test';
import {
  bootGame, advance, state, qa, shot, tap, releaseAll, advanceUntil,
  expectNoConsoleErrors, enterGameplay, writeArtifact, recordEvents,
  takeEvents, distance2d,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 6 — hostile AI.
//
// Every claim here is measured over simulated time, never wall-clock: patrols
// move, walls block sight, gunfire is investigated, a lost contact is searched
// and then abandoned, doors are opened rather than walked through, and nobody
// is left permanently stuck after a minute of simulation.
// ---------------------------------------------------------------------------

/** Snapshot of every hostile, cheap enough to sample repeatedly. */
const roster = (page) => page.evaluate(() => window.__NORTHSTAR__.enemies.list.map((e) => ({
  id: e.id, variant: e.variant, state: e.state, alive: !!e.alive,
  awareness: +e.awareness.toFixed(3), room: e.room?.id || null,
  pos: [+e.position.x.toFixed(2), +e.position.y.toFixed(2), +e.position.z.toFixed(2)],
  hasPath: !!e.path,
})));

/** Park the player somewhere the hostiles cannot reach or see. */
async function hidePlayer(page) {
  await qa(page, 'teleport', 'insertion');
  await page.evaluate(() => {
    const p = window.__NORTHSTAR__.player;
    // Well outside the building, so nothing can perceive the player and the
    // patrols are observed undisturbed.
    p.position.set(0, 0, -30);
    p.velocity.set(0, 0, 0);
    p.updateCamera(0);
  });
  await advance(page, 200, { step: 50 });
}

test.describe('ai', () => {
  test('hostiles patrol: positions change over simulated time', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await hidePlayer(page);

    const start = await roster(page);
    expect(start.length, 'no hostiles were inserted').toBeGreaterThan(4);

    // 20 s of simulation, sampled. Render off: this is a behaviour test.
    const samples = [start];
    for (let i = 0; i < 20; i++) {
      await advance(page, 1000, { step: 100, render: false });
      samples.push(await roster(page));
    }
    const end = samples[samples.length - 1];

    const moved = end.filter((e, i) => distance2d(e.pos, start[i].pos) > 1.0);
    const perEnemy = end.map((e, i) => ({
      id: e.id, variant: e.variant, state: e.state,
      travelled: +Math.max(...samples.map((s) => distance2d(s[i].pos, start[i].pos))).toFixed(2),
      startRoom: start[i].room, endRoom: e.room,
    }));

    writeArtifact('ai-patrol.json', { perEnemy, states: end.map((e) => e.state) });
    await shot(page, 'ai-patrol');

    // Sentries are supposed to hold a post, so not everyone moves — but a
    // building full of static hostiles is a broken patrol system.
    expect(
      moved.length,
      `only ${moved.length}/${end.length} hostiles moved more than 1 m in 20 s: ${JSON.stringify(perEnemy)}`
    ).toBeGreaterThan(1);
    // Undisturbed, they must all still be in a non-combat state.
    expect(end.every((e) => !e.alive || e.state !== 'combat'), 'a hostile entered combat with a hidden player').toBe(true);

    await expectNoConsoleErrors(page);
  });

  test('a hostile cannot see the player through a wall', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await qa(page, 'freezeAI', true);

    // The player stands in the server room; the hostile is spawned in the
    // mechanical room on the far side of the dividing wall, facing the player.
    await qa(page, 'teleport', 'serverroom');
    await advance(page, 200, { step: 50 });

    const setup = await page.evaluate(() => {
      const g = window.__NORTHSTAR__;
      const res = g.qa.spawnEnemy('breacher', [9.5, 0, 13]);
      const e = g.enemies.list.find((x) => x.id === res.id);
      const p = g.player;
      // Face the hostile directly at the player.
      e.yaw = Math.atan2(-(p.position.x - e.position.x), -(p.position.z - e.position.z));
      e.awareness = 0;
      const eye = e.position.clone();
      eye.y += 1.6;
      return {
        id: res.id,
        distance: +e.position.distanceTo(p.position).toFixed(2),
        lineOfSight: g.collision.lineOfSight(eye, p.eyePosition),
      };
    });

    writeArtifact('ai-los-blocked.json', setup);
    expect(setup.distance, 'the hostile was not placed within sight range').toBeLessThan(12);
    expect(setup.lineOfSight, 'the two rooms are not actually separated by geometry — bad test placement')
      .toBe(false);

    await qa(page, 'freezeAI', false);
    // 12 s staring at a wall must not build awareness past suspicion.
    await advance(page, 12_000, { step: 100, render: false });
    const after = await page.evaluate((wanted) => {
      const e = window.__NORTHSTAR__.enemies.list.find((x) => x.id === wanted);
      return { awareness: +e.awareness.toFixed(3), state: e.state };
    }, setup.id);

    writeArtifact('ai-los-result.json', after);
    expect(
      after.awareness,
      `the hostile reached awareness ${after.awareness} through a solid wall (state "${after.state}")`
    ).toBeLessThan(0.7);
    expect(after.state, 'the hostile entered combat through a wall').not.toBe('combat');

    await shot(page, 'ai-through-wall');
    await qa(page, 'freezeAI', true);
    await expectNoConsoleErrors(page);
  });

  test('a gunshot makes hostiles investigate, then search, then give up', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await recordEvents(page, ['world:noise', 'enemy:alert']);

    // Stand in the open office and fire once. Everything within the noise
    // radius must come and look.
    await qa(page, 'teleport', 'openoffice');
    await qa(page, 'giveWeapon', 'carbine');
    await advance(page, 900, { step: 60 });

    const before = await roster(page);
    const nearby = before.filter((e) => e.alive && distance2d(e.pos, [-2, 0, 4.5]) < 26);
    expect(nearby.length, 'no hostiles are near the open office to hear a shot').toBeGreaterThan(0);

    await tap(page, 'attack');
    await advance(page, 200, { step: 40 });
    const noises = await takeEvents(page, 'world:noise');
    expect(noises.length, 'firing did not emit a world:noise event').toBeGreaterThanOrEqual(1);

    // Move away and hide so the reaction is to the noise, not to being seen.
    await page.evaluate(() => {
      const p = window.__NORTHSTAR__.player;
      p.position.set(0, 0, -30);
      p.velocity.set(0, 0, 0);
      p.updateCamera(0);
    });

    // --- investigate ---
    const investigated = await advanceUntil(
      page,
      "game.enemies.list.some((e) => e.alive && ['suspicious','investigate','search','combat'].includes(e.state))",
      { budgetMs: 12_000, step: 250 }
    );
    const reacting = await roster(page);
    writeArtifact('ai-noise-investigate.json', {
      noise: noises[0], states: reacting.map((e) => ({ id: e.id, state: e.state, awareness: e.awareness })),
    });
    expect(investigated, `no hostile reacted to a gunshot: ${JSON.stringify(reacting.map((e) => e.state))}`).toBe(true);
    await shot(page, 'ai-investigating');

    // Investigators must actually travel towards the noise, not just change state.
    const investigator = reacting.find((e) => ['suspicious', 'investigate', 'search'].includes(e.state));
    if (investigator) {
      const startIdx = before.findIndex((e) => e.id === investigator.id);
      await advance(page, 8000, { step: 100, render: false });
      const moved = (await roster(page)).find((e) => e.id === investigator.id);
      const travelled = distance2d(moved.pos, before[startIdx].pos);
      expect(travelled, `the investigating hostile never left its post (${travelled.toFixed(2)} m)`)
        .toBeGreaterThan(0.5);
    }

    // --- search, then back to patrol ---
    // Give it well past the longest searchTime (16 s on blackout) plus travel.
    await advance(page, 60_000, { step: 100, render: false });
    const settled = await roster(page);
    writeArtifact('ai-noise-settled.json', settled.map((e) => ({ id: e.id, state: e.state, awareness: e.awareness })));

    const stillHunting = settled.filter((e) => e.alive && ['investigate', 'search', 'combat'].includes(e.state));
    expect(
      stillHunting.length,
      `${stillHunting.length} hostiles never returned to patrol 60 s after a single shot: ${JSON.stringify(stillHunting)}`
    ).toBe(0);
    expect(settled.some((e) => e.alive && ['patrol', 'idle'].includes(e.state)),
      'nobody returned to a patrol or idle state').toBe(true);

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('hostiles open doors instead of walking through them', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await recordEvents(page, ['door:state']);
    await hidePlayer(page);

    const closedBefore = await page.evaluate(() => Array.from(window.__NORTHSTAR__.doors.doors.values())
      .filter((d) => !d.locked)
      .map((d) => ({ id: d.id, state: d.state, open: +d.openAmount.toFixed(2) })));

    // 60 s of patrolling across a building whose rooms are joined by doors.
    await advance(page, 60_000, { step: 100, render: false });

    const events = await takeEvents(page, 'door:state');
    const closedAfter = await page.evaluate(() => Array.from(window.__NORTHSTAR__.doors.doors.values())
      .filter((d) => !d.locked)
      .map((d) => ({ id: d.id, state: d.state, open: +d.openAmount.toFixed(2) })));

    const changed = closedAfter.filter((d, i) => d.state !== closedBefore[i].state
      || Math.abs(d.open - closedBefore[i].open) > 0.05);

    writeArtifact('ai-doors.json', { events: events.slice(0, 20), changed });
    await shot(page, 'ai-doors');

    // Either the bus recorded a door state change, or a door visibly moved.
    expect(
      events.length + changed.length,
      'in 60 s of patrolling no hostile ever operated a door'
    ).toBeGreaterThan(0);

    // And nobody may be standing inside a closed door leaf.
    const inDoor = await page.evaluate(() => {
      const g = window.__NORTHSTAR__;
      const bad = [];
      for (const e of g.enemies.list) {
        if (!e.alive) continue;
        for (const d of g.doors.doors.values()) {
          if (d.isPassable) continue;
          const dist = Math.hypot(d.spec.x - e.position.x, d.spec.z - e.position.z);
          if (dist < 0.25 && Math.abs(d.spec.y - e.position.y) < 1.5) bad.push({ enemy: e.id, door: d.id, dist: +dist.toFixed(2) });
        }
      }
      return bad;
    });
    expect(inDoor, `hostiles are standing inside closed doors: ${JSON.stringify(inDoor)}`).toEqual([]);

    await expectNoConsoleErrors(page);
  });

  test('no hostile is permanently stuck over 60 s of simulation', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await hidePlayer(page);

    // Sample every 2 s for 60 s of simulated time.
    const track = new Map();
    const record = async () => {
      for (const e of await roster(page)) {
        if (!track.has(e.id)) track.set(e.id, { variant: e.variant, states: [], positions: [] });
        const t = track.get(e.id);
        t.states.push(e.state);
        t.positions.push(e.pos);
      }
    };
    await record();
    for (let i = 0; i < 30; i++) {
      await advance(page, 2000, { step: 100, render: false });
      await record();
    }

    const report = [];
    for (const [id, t] of track) {
      // Total path length and the bounding radius of everywhere it went.
      let path = 0;
      for (let i = 1; i < t.positions.length; i++) path += distance2d(t.positions[i - 1], t.positions[i]);
      const spread = Math.max(...t.positions.map((p) => distance2d(p, t.positions[0])));
      const states = Array.from(new Set(t.states));
      report.push({ id, variant: t.variant, path: +path.toFixed(2), spread: +spread.toFixed(2), states });
    }
    writeArtifact('ai-stuck.json', report);
    await shot(page, 'ai-soak');

    // "Stuck" means a hostile that intended to move and could not: it has been
    // pathing (patrol / investigate / search) yet never went anywhere.
    const stuck = report.filter((r) => {
      const wantedToMove = r.states.some((s) => ['patrol', 'investigate', 'search', 'flanking', 'retreating'].includes(s));
      return wantedToMove && r.spread < 0.5 && r.path < 1.0;
    });
    expect(
      stuck,
      `hostiles that spent 60 s trying to move without moving: ${JSON.stringify(stuck)}`
    ).toEqual([]);

    // Nobody may have escaped the building envelope or fallen through the floor.
    const outOfBounds = report.length
      ? (await roster(page)).filter((e) => e.alive
        && (Math.abs(e.pos[0]) > 45 || Math.abs(e.pos[2]) > 45 || e.pos[1] < -2 || e.pos[1] > 12))
      : [];
    expect(outOfBounds, `hostiles left the world: ${JSON.stringify(outOfBounds)}`).toEqual([]);

    const s = await state(page);
    expect(s.enemies.alive).toBeGreaterThan(0);
    await expectNoConsoleErrors(page);
  });
});
