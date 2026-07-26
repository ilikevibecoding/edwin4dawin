import { test, expect } from '@playwright/test';
import {
  gotoGame, enterGameplay, state, advance, capture, qa, teleport, writeReport,
  expectNoConsoleErrors,
} from './helpers.js';

/**
 * AI behaviour: perception, patrol, investigation, combat, search, recovery.
 * Owner: Opus 4, fixes coordinated with Opus 3.
 *
 * The brief's explicit AI failure modes are each covered by a test:
 * standing still, seeing through walls, firing through impossible geometry,
 * becoming permanently stuck, and ignoring obvious combat events.
 */

test.describe.configure({ mode: 'serial' });

test('hostiles patrol rather than stand still', async ({ page }) => {
  await gotoGame(page, '?quality=low');
  await enterGameplay(page);
  // Park the player in a sealed plant room and clear any contact so we are
  // measuring genuine patrol behaviour rather than combat hold positions.
  await qa(page, 'teleport', 'mechanical');
  await page.evaluate(() => {
    const m = window.__northstar.game.mission;
    m.alarm = false;
    for (const e of m.enemies) {
      e.awareness = 0;
      e.alerted = false;
      e.contactCalled = false;
      e.lastKnownTarget = null;
      e.enterState('patrol');
    }
    window.advanceTime(500);
  });
  await advance(page, 400);

  const sample = () => page.evaluate(() => window.__northstar.game.mission.enemies
    .filter((e) => e.alive)
    .map((e) => ({ id: e.id, x: e.position.x, z: e.position.z, state: e.state })));

  const a = await sample();
  await advance(page, 12000);
  const b = await sample();

  let moved = 0;
  for (const e of b) {
    const p = a.find((q) => q.id === e.id);
    if (!p) continue;
    if (Math.hypot(e.x - p.x, e.z - p.z) > 0.6) moved++;
  }
  writeReport('ai-patrol', { total: b.length, moved, states: b.map((e) => e.state) });
  expect(b.length).toBeGreaterThan(8);
  expect(moved / b.length, `only ${moved}/${b.length} hostiles moved in 12 s of patrol`).toBeGreaterThan(0.6);
});

test('hostiles cannot see through walls', async ({ page }) => {
  await gotoGame(page, '?quality=low');
  await enterGameplay(page);
  const res = await page.evaluate(() => {
    const g = window.__northstar.game;
    const THREE = g.player.position.constructor;
    void THREE;
    // Put the player in the server room and a hostile in the copy room: two
    // separate sealed rooms with a corridor between them.
    g.player.teleport([15.5, 0, 13.2]);
    const id = g.qa.spawnEnemy('copy', 'kestrel.assault');
    const e = g.mission.enemies.find((x) => x.id === id);
    e.frozen = true;
    // Face the enemy straight at the player so only occlusion can stop it
    const dx = g.player.position.x - e.position.x;
    const dz = g.player.position.z - e.position.z;
    e.yaw = Math.atan2(-dx, -dz);
    window.advanceTime(100);
    const sight = e.canSee(g.player.position, false, []);
    const straightLine = Math.hypot(dx, dz);
    return { visible: sight.visible, distance: straightLine, enemyRoom: e.serialize().room };
  });
  expect(res.distance).toBeLessThan(20);
  expect(res.visible, 'a hostile must not see the player through two walls').toBe(false);
});

test('hostiles will not fire through impossible geometry', async ({ page }) => {
  await gotoGame(page, '?quality=low');
  await enterGameplay(page);
  const res = await page.evaluate(() => {
    const g = window.__northstar.game;
    g.player.teleport([15.5, 0, 13.2]);
    const id = g.qa.spawnEnemy('copy', 'kestrel.assault');
    const e = g.mission.enemies.find((x) => x.id === id);
    e.frozen = true;
    const blocked = e.canShootAt(g.player.position, false);
    // Now stand in the same room with a clear line
    g.player.teleport([6, 0, 5.5]);
    const dx = g.player.position.x - e.position.x;
    const dz = g.player.position.z - e.position.z;
    e.yaw = Math.atan2(-dx, -dz);
    window.advanceTime(60);
    const clear = e.canShootAt(g.player.position, false);
    return { blocked, clear };
  });
  expect(res.blocked, 'no firing through a wall').toBe(false);
  expect(res.clear, 'a clear line must allow firing').toBe(true);
});

test('gunfire alerts hostiles and they investigate the source', async ({ page }) => {
  await gotoGame(page, '?quality=low');
  await enterGameplay(page);
  await teleport(page, 'openplan');
  // Teleporting into an occupied room can legitimately be seen, so reset the
  // garrison to a calm state first: this test is about the gunshot itself.
  await page.evaluate(() => {
    const m = window.__northstar.game.mission;
    m.alarm = false;
    for (const e of m.enemies) {
      e.awareness = 0;
      e.alerted = false;
      e.contactCalled = false;
      e.lastKnownTarget = null;
      e.enterState('patrol');
      e.frozen = true;
    }
    window.advanceTime(200);
  });

  const before = await state(page);
  expect(before.mission.alarm).toBe(false);
  expect(before.mission.enemies.alerted).toBe(0);
  await page.evaluate(() => {
    for (const e of window.__northstar.game.mission.enemies) e.frozen = false;
  });

  await page.evaluate(() => window.__northstar.helpers.holdFire(700));
  await advance(page, 2500);
  const after = await state(page);
  expect(after.mission.alarm, 'gunfire must raise the alarm').toBe(true);
  expect(after.mission.enemies.alerted, 'nearby hostiles must react').toBeGreaterThan(0);

  await advance(page, 9000);
  const later = await state(page);
  const investigating = later.mission.enemies.list.filter(
    (e) => e.alive && ['investigating', 'searching', 'combat', 'in-cover', 'advancing'].includes(e.state),
  ).length;
  expect(investigating, 'hostiles must converge and search').toBeGreaterThan(0);
  await capture(page, 'ai', '01-alerted');
});

test('hostiles engage, take cover and then search after losing the player', async ({ page }) => {
  await gotoGame(page, '?quality=low');
  await enterGameplay(page);
  await teleport(page, 'openplan');
  await qa(page, 'killAll');
  await advance(page, 200);

  const res = await page.evaluate(() => {
    const g = window.__northstar.game;
    const p = g.player;
    const fwd = p.lookDirection;
    const id = g.qa.spawnEnemy([p.position.x + fwd.x * 9, p.position.y, p.position.z + fwd.z * 9], 'kestrel.assault');
    const e = g.mission.enemies.find((x) => x.id === id);
    const dx = p.position.x - e.position.x;
    const dz = p.position.z - e.position.z;
    e.yaw = Math.atan2(-dx, -dz);
    // Give it time to see, engage and shoot. Awareness is sampled at its peak
    // because it decays whenever the hostile momentarily loses the sightline
    // behind cubicle panels, which is correct behaviour.
    let peakAwareness = 0;
    let sawCombat = false;
    for (let i = 0; i < 40; i++) {
      window.advanceTime(100);
      peakAwareness = Math.max(peakAwareness, e.awareness);
      if (['combat', 'in-cover', 'advancing', 'flanking'].includes(e.state)) sawCombat = true;
    }
    const engaged = { state: e.state, awareness: peakAwareness, sawCombat, playerHealth: g.player.health };
    // Remove the player from the world; the hostile must fall back to searching
    p.teleport([-28, 0, -16]);
    window.advanceTime(14000);
    const lost = { state: e.state, searchPoints: e.searchPoints.length };
    return { engaged, lost };
  });
  expect(res.engaged.sawCombat, 'hostile must engage on sight').toBe(true);
  expect(res.engaged.awareness, 'awareness must saturate while the player is visible').toBeGreaterThan(0.9);
  expect(['searching', 'investigating', 'patrol', 'idle'], 'hostile must stop shooting at nothing').toContain(res.lost.state);
});

test('hostiles deal damage to the player in a firefight', async ({ page }) => {
  await gotoGame(page, '?quality=low');
  await enterGameplay(page, { difficulty: 'veteran' });
  await teleport(page, 'openplan');
  await qa(page, 'killAll');
  const res = await page.evaluate(() => {
    const g = window.__northstar.game;
    const p = g.player;
    const fwd = p.lookDirection;
    for (let i = 0; i < 3; i++) {
      const id = g.qa.spawnEnemy([p.position.x + fwd.x * 7 + i * 1.4, p.position.y, p.position.z + fwd.z * 7], 'kestrel.assault');
      const e = g.mission.enemies.find((x) => x.id === id);
      e.yaw = Math.atan2(-(p.position.x - e.position.x), -(p.position.z - e.position.z));
      e.lastKnownTarget = p.position.clone();
      e.awareness = 1;
    }
    const before = { health: p.health, armor: p.armor };
    window.advanceTime(9000);
    return { before, after: { health: g.player.health, armor: g.player.armor } };
  });
  expect(res.after.health + res.after.armor,
    'three alerted hostiles must inflict damage in nine seconds').toBeLessThan(res.before.health + res.before.armor);
  await capture(page, 'ai', '02-firefight');
});

test('no hostile becomes permanently stuck over a long simulation', async ({ page }) => {
  await gotoGame(page, '?quality=low');
  await enterGameplay(page);
  await teleport(page, 'lobby');
  // Raise the alarm so everyone paths across the whole building
  await page.evaluate(() => { window.__northstar.game.mission.raiseAlarm(); });

  // Sample often enough that a short patrol loop cannot alias with the sample
  // interval and look like a hostile standing still.
  const samples = [];
  for (let i = 0; i < 22; i++) {
    await advance(page, 2800);
    samples.push(await page.evaluate(() => window.__northstar.game.mission.enemies
      .filter((e) => e.alive)
      .map((e) => {
        const d = window.__northstar.game.level.doors.nearest(e.position, 2.2);
        return {
          id: e.id, x: +e.position.x.toFixed(2), z: +e.position.z.toFixed(2), state: e.state,
          target: e.lastKnownTarget ? [+e.lastKnownTarget.x.toFixed(1), +e.lastKnownTarget.z.toFixed(1)] : null,
          pathLen: e.path ? e.path.length : 0, pathIdx: e.pathIndex,
          next: e.path && e.path[e.pathIndex] ? [+e.path[e.pathIndex].x.toFixed(1), +e.path[e.pathIndex].z.toFixed(1)] : null,
          stuck: +(e.stuckTimer ?? 0).toFixed(2), speed: +(e.speed ?? 0).toFixed(2),
          door: d ? { id: d.id, open: +d.openAmount.toFixed(2), locked: d.locked } : null,
        };
      })));
  }
  const perEnemy = new Map();
  for (const snap of samples) {
    for (const e of snap) {
      if (!perEnemy.has(e.id)) perEnemy.set(e.id, []);
      perEnemy.get(e.id).push(e);
    }
  }
  const stuck = [];
  const travel = {};
  for (const [id, list] of perEnemy) {
    if (list.length < 10) continue;
    const first = list[0];
    let maxDisplacement = 0;
    let pathTravelled = 0;
    for (let i = 0; i < list.length; i++) {
      maxDisplacement = Math.max(maxDisplacement, Math.hypot(list[i].x - first.x, list[i].z - first.z));
      if (i) pathTravelled += Math.hypot(list[i].x - list[i - 1].x, list[i].z - list[i - 1].z);
    }
    travel[id] = { maxDisplacement: +maxDisplacement.toFixed(2), pathTravelled: +pathTravelled.toFixed(2) };
    // Holding a cover position is legitimate; never covering any ground in a
    // full minute while patrolling or sweeping is not.
    const holding = list.every((e) => e.state === 'in-cover' || e.state === 'combat');
    if (!holding && maxDisplacement < 1.0 && pathTravelled < 2.0) {
      stuck.push({ id, at: list[0], travel: travel[id], states: Array.from(new Set(list.map((e) => e.state))) });
    }
  }
  writeReport('ai-stuck', { tracked: perEnemy.size, samples: samples.length, travel, stuck });
  expect(stuck, `hostiles that covered no ground in 60 s: ${JSON.stringify(stuck)}`).toEqual([]);
  expectNoConsoleErrors(page);
});

test('navigation reaches every room and both stairs are traversable', async ({ page }) => {
  await gotoGame(page, '?quality=low');
  await enterGameplay(page);
  const res = await page.evaluate(() => {
    const g = window.__northstar.game;
    const nav = g.level.nav;
    const { ROOMS } = window.__northstar.layout ?? {};
    void ROOMS;
    const start = nav.nearest({ x: 0, y: 0, z: -13 }, 4);
    const rooms = {};
    for (const n of nav.nodes) {
      if (n.disabled || !n.room) continue;
      if (!rooms[n.room]) rooms[n.room] = n;
    }
    const unreachable = [];
    const from = { x: start.x, y: start.y, z: start.z };
    for (const [room, node] of Object.entries(rooms)) {
      if (room === 'exterior') continue;
      const path = nav.findPath(from, { x: node.x, y: node.y, z: node.z,
        distanceTo(o) { return Math.hypot(this.x - o.x, this.y - o.y, this.z - o.z); } });
      if (!path || !path.length) unreachable.push(room);
    }
    // Explicit stair traversal: ground stairwell -> upper executive office
    const up = nav.findPath({ x: 3.2, y: 0, z: 13.2 }, { x: 12, y: 4.2, z: 6.5,
      distanceTo(o) { return Math.hypot(this.x - o.x, this.y - o.y, this.z - o.z); } });
    const fire = nav.findPath({ x: -18, y: 0, z: 0 }, { x: -9, y: 4.2, z: -0.5,
      distanceTo(o) { return Math.hypot(this.x - o.x, this.y - o.y, this.z - o.z); } });
    return {
      rooms: Object.keys(rooms).length,
      unreachable,
      centralStair: up ? up.length : 0,
      fireStair: fire ? fire.length : 0,
      report: nav.report(),
    };
  });
  writeReport('nav-reachability', res);
  expect(res.unreachable, 'every room must be reachable from the lobby').toEqual([]);
  expect(res.centralStair, 'the central stair must be traversable').toBeGreaterThan(3);
  expect(res.fireStair, 'the west fire stair must be traversable').toBeGreaterThan(3);
});
