// PW-14 perception and behaviour (patrol movement, hearing, vision -> combat) and
// PW-15 the negative cases (no sight through walls, search after losing the player, frozen AI).
//
// Booting the map is the expensive part of every test, so each test covers a cluster of related
// assertions on one page rather than one assertion per boot.
import { test, expect } from '@playwright/test';
import { boot, expectNoErrors } from './helpers/game.js';

/** Enters a mission with the AI running and the player invulnerable (we assert on AI, not damage). */
async function inMission(page, { at = 'lobby' } = {}) {
  const game = await boot(page);
  await game.quickStart({ god: true });
  await game.qa('teleport', at);
  await game.adv(700); // let the weapon draw finish
  return game;
}

/** Spawns a hostile 5 m ahead and turns it to face the player so its vision cone covers us. */
async function facingTarget(game) {
  const id = await game.qa('spawnEnemy', 'trooper');
  await game.probe((eid) => {
    const m = window.__game.mission;
    const e = m.enemies.find((x) => x.id === eid);
    e.yaw = Math.atan2(-(m.player.pos.x - e.pos.x), -(m.player.pos.z - e.pos.z));
    e.guardYaw = e.yaw;
  }, id);
  return id;
}

test.describe('ai', () => {
  test('PW-14 patrols move along their route and stay on the navmesh', async ({ page }) => {
    const game = await boot(page);
    await game.quickStart({ god: true });
    // Hide in the janitor closet: a patrol that can see the player would (correctly) abandon its
    // route, and this test is about the undisturbed route.
    await game.qa('teleport', 'janitor');
    await game.adv(200);

    // Of the hostiles with a real patrol route (guards hold station), take the one furthest away.
    const patroller = await game.probe(() => {
      const m = window.__game.mission;
      const routed = m.enemies.filter((x) => x.patrol && x.patrol.length > 1);
      if (!routed.length) return null;
      routed.sort((a, b) => b.pos.distanceTo(m.player.pos) - a.pos.distanceTo(m.player.pos));
      const e = routed[0];
      return {
        id: e.id, state: e.state, waypoints: e.patrol.length,
        pos: [e.pos.x, e.pos.y, e.pos.z],
        dist: +e.pos.distanceTo(m.player.pos).toFixed(1),
        exposure: +e._seePlayer().toFixed(3),
      };
    });
    expect(patroller, 'the layout defines at least one patrolling hostile').not.toBeNull();
    expect(['patrol', 'patrol-wait']).toContain(patroller.state);
    expect(patroller.exposure, 'the patroller cannot see the hidden player').toBe(0);

    await game.adv(8000);
    const moved = await game.probe((p) => {
      const e = window.__game.mission.enemies.find((x) => x.id === p.id);
      return {
        state: e.state,
        travelled: +Math.hypot(e.pos.x - p.pos[0], e.pos.z - p.pos[2]).toFixed(2),
        y: +e.pos.y.toFixed(2),
        suspicion: +e.suspicion.toFixed(2),
        onNav: window.__game.mission.nav.nearestNode(e.pos.x, e.pos.y, e.pos.z) >= 0,
      };
    }, patroller);

    expect(moved.travelled, 'a patrolling hostile covers ground over 8 s').toBeGreaterThan(2);
    expect(['patrol', 'patrol-wait'], 'an undisturbed patrol stays on its route').toContain(moved.state);
    expect(moved.suspicion, 'nothing alerted it').toBeLessThan(0.42);
    expect(moved.onNav, 'the patroller is still on the navmesh').toBe(true);
    // Feet stay on a floor level rather than sinking or climbing.
    expect(Math.min(Math.abs(moved.y), Math.abs(moved.y - 3.6))).toBeLessThan(0.6);

    await expectNoErrors(game, 'patrol');
  });

  test('PW-14 a gunshot is heard and pulls hostiles out of their idle state', async ({ page }) => {
    const game = await inMission(page, { at: 'sc-west' });

    // A hostile placed behind the player cannot see us, so any reaction must come from hearing.
    const id = await game.qa('spawnEnemy', 'trooper');
    await game.probe((eid) => {
      const m = window.__game.mission;
      const e = m.enemies.find((x) => x.id === eid);
      // Face directly away from the player.
      e.yaw = Math.atan2(m.player.pos.x - e.pos.x, m.player.pos.z - e.pos.z);
      e.guardYaw = e.yaw;
    }, id);
    await game.adv(300);

    const quiet = await game.enemy(id);
    expect(quiet.suspicion, 'the hostile has not noticed anything yet').toBeLessThan(0.42);
    expect(['guard', 'patrol']).toContain(quiet.state);

    // Point away from it so the shot cannot hit it: the only stimulus is noise.
    await game.qa('setYawPitch', quiet.pos[0] > 0 ? 90 : 270, 0);
    await game.fire(60);
    await game.adv(400);

    const alerted = await game.enemy(id);
    expect(alerted.suspicion, 'hearing a shot raises suspicion').toBeGreaterThan(quiet.suspicion + 0.2);
    expect(['investigate', 'combat', 'search'], 'a heard shot breaks the idle state').toContain(alerted.state);
    expect(alerted.hp, 'the hostile was not hit, only alerted').toBe(quiet.hp);

    // It should then move towards the noise rather than stand still.
    await game.adv(3000);
    const closing = await game.enemy(id);
    expect(
      Math.hypot(closing.pos[0] - alerted.pos[0], closing.pos[2] - alerted.pos[2]),
      'the hostile moves to investigate the noise',
    ).toBeGreaterThan(0.5);

    await expectNoErrors(game, 'hearing');
  });

  test('PW-14 standing in the open in front of a hostile escalates to combat', async ({ page }) => {
    const game = await inMission(page, { at: 'lobby' });
    const id = await facingTarget(game);
    await game.adv(200);

    const seen = await game.probe((eid) => {
      const e = window.__game.mission.enemies.find((x) => x.id === eid);
      return +e._seePlayer().toFixed(3);
    }, id);
    expect(seen, 'the player is inside the vision cone with clear line of sight').toBeGreaterThan(0);

    // Suspicion climbs to 1 and trips combat; on 'operator' that takes roughly a second.
    await game.adv(3000);
    const engaged = await game.enemy(id);
    expect(engaged.state, 'a hostile that sees the player enters combat').toBe('combat');
    expect(engaged.suspicion).toBeGreaterThanOrEqual(1);

    // Combat means it actually shoots back — god mode keeps the run alive, so assert on the shooter.
    const loaded = await game.probe((eid) => window.__game.mission.enemies.find((x) => x.id === eid).mag, id);
    await game.adv(4000);
    const firing = await game.probe((eid) => {
      const e = window.__game.mission.enemies.find((x) => x.id === eid);
      return { mag: e.mag, state: e.state };
    }, id);
    expect(firing.state).toBe('combat');
    expect(firing.mag, 'the hostile has spent rounds shooting at the player').toBeLessThan(loaded);

    await expectNoErrors(game, 'vision');
  });

  test('PW-15 hostiles cannot see through walls', async ({ page }) => {
    const game = await inMission(page, { at: 'janitor' });

    // Find a direction with a sight-blocking wall close by, and place the hostile beyond it.
    // Deriving the spot from the collision world keeps the test honest if the map is re-laid out.
    const spot = await game.probe(() => {
      const m = window.__game.mission, p = m.player;
      const eye = { x: p.pos.x, y: p.eyeY, z: p.pos.z };
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        const dx = Math.cos(a), dz = Math.sin(a);
        const hit = m.world.raycast(eye.x, eye.y, eye.z, dx, 0, dz, 5, (c) => c.blockSight && c.tag !== 'enemy');
        if (!hit || hit.t > 4) continue;
        const dist = hit.t;
        const at = [eye.x + dx * (dist + 2.0), p.pos.y, eye.z + dz * (dist + 2.0)];
        // The chosen spot must be reachable ground, otherwise the hostile falls out of the world.
        if (m.nav.nearestNode(at[0], at[1], at[2]) < 0) continue;
        return { at, wallDist: +dist.toFixed(2), angle: Math.round((a * 180) / Math.PI) };
      }
      return null;
    });
    expect(spot, 'the janitor closet has a sight-blocking wall within 4 m').not.toBeNull();

    const id = await game.qa('spawnEnemy', 'trooper', spot.at);
    // Aim it straight at the player: only the wall can stop it from seeing us.
    await game.probe((eid) => {
      const m = window.__game.mission;
      const e = m.enemies.find((x) => x.id === eid);
      e.yaw = Math.atan2(-(m.player.pos.x - e.pos.x), -(m.player.pos.z - e.pos.z));
      e.guardYaw = e.yaw;
    }, id);
    await game.adv(200);

    const blocked = await game.probe((eid) => {
      const m = window.__game.mission;
      const e = m.enemies.find((x) => x.id === eid);
      return { exposure: +e._seePlayer().toFixed(3), dist: +e.pos.distanceTo(m.player.pos).toFixed(2) };
    }, id);
    expect(blocked.dist, 'the hostile is within vision range, just not in sight').toBeLessThan(12);
    expect(blocked.exposure, 'geometry blocks the sight line').toBe(0);

    // Standing still and silent behind cover must never raise suspicion.
    await game.adv(6000);
    const still = await game.enemy(id);
    expect(still.suspicion, 'suspicion stays at zero through a wall').toBe(0);
    expect(still.state, 'the hostile never acquires the player').not.toBe('combat');

    await expectNoErrors(game, 'los-negative');
  });

  test('PW-15 a hostile that loses the player searches instead of tracking it', async ({ page }) => {
    const game = await inMission(page, { at: 'lobby' });
    const id = await facingTarget(game);

    await game.adv(3000);
    expect((await game.enemy(id)).state, 'engaged first').toBe('combat');

    // Vanish: teleport to a different wing and floor, with no noise to follow.
    await game.qa('teleport', 'conference');
    await game.adv(9000);

    const lost = await game.enemy(id);
    expect(lost.state, 'the hostile gives up the chase and searches').not.toBe('combat');
    expect(['search', 'investigate', 'patrol', 'guard']).toContain(lost.state);
    expect(await game.probe((eid) => {
      const e = window.__game.mission.enemies.find((x) => x.id === eid);
      return +e._seePlayer().toFixed(3);
    }, id), 'it has no line of sight to the new position').toBe(0);

    await expectNoErrors(game, 'search');
  });

  test('PW-14 the navmesh is a connected whole so hostiles can chase between floors', async ({ page }) => {
    // Guards NS-1 (docs/reports/wp-008.md), which broke cross-floor pathing when the stairwell
    // baked as its own region. Everything a hostile or hostage can be asked to walk to has to sit
    // in one region; the roof is deliberately not one of those places.
    const game = await boot(page);
    await game.quickStart({ freezeAI: true });

    const regions = await game.probe(() => {
      const nav = window.__game.mission.nav;
      const seen = new Int32Array(nav.nodes.length).fill(-1);
      const sizes = [];
      for (let i = 0; i < nav.nodes.length; i++) {
        if (seen[i] >= 0) continue;
        const id = sizes.length;
        let size = 0;
        const stack = [i];
        seen[i] = id;
        while (stack.length) {
          const cur = stack.pop();
          size++;
          for (const nb of nav.nodes[cur].edges) if (seen[nb] < 0) { seen[nb] = id; stack.push(nb); }
        }
        sizes.push(size);
      }
      return { count: sizes.length, largest: sizes.sort((a, b) => b - a).slice(0, 4), nodes: nav.nodes.length };
    });

    // 'lobby' is on floor 1 and 'conference' on floor 2; the stairs join them.
    const upstairs = await game.qa('navConnected', [17, 0, 28], [34, 3.6, 5]);
    expect(upstairs.connected, `floor 1 and floor 2 must share a nav region `
      + `(found ${regions.count} regions, largest ${regions.largest})`).toBe(true);
    expect(await game.qa('navPath', 'lobby', 'conference'), 'a route exists between floors').not.toBeNull();

    // Every teleport target is somewhere the mission can send a character, so all of them must be
    // mutually walkable. This is the assertion that actually catches a wall or door sealing a room.
    const names = await game.qa('checkpoints');
    const stranded = [];
    for (const name of names) {
      if ((await game.qa('navPath', 'lobby', name)) === null) stranded.push(name);
    }
    expect(stranded, 'every checkpoint is reachable from the lobby').toEqual([]);

    // The interior is one region; the remaining regions are the roof and small prop-top pockets
    // (desks, crates) that nothing paths to. A pocket big enough to hold a room would mean a seam.
    const secondFloorArea = regions.largest[2];
    expect(secondFloorArea, `no walkable island larger than a closet outside the roof `
      + `(regions ${regions.largest})`).toBeLessThan(400);
  });

  test('PW-15 freezeAI holds every hostile completely still', async ({ page }) => {
    const game = await boot(page);
    await game.quickStart({ freezeAI: true, god: true });

    const before = await game.probe(() => window.__game.mission.enemies.map((e) => ({
      id: e.id, pos: [e.pos.x, e.pos.y, e.pos.z], state: e.state, suspicion: e.suspicion,
    })));
    expect(before.length, 'the layout populates the building').toBeGreaterThan(5);

    // Stand in the open in front of a hostile: frozen AI must not react even to a clear sight line.
    const id = await facingTarget(game);
    await game.adv(6000);

    const after = await game.probe(() => window.__game.mission.enemies.map((e) => ({
      id: e.id, pos: [e.pos.x, e.pos.y, e.pos.z], state: e.state, suspicion: e.suspicion,
    })));
    for (const b of before) {
      const a = after.find((x) => x.id === b.id);
      expect(Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]),
        `${b.id} did not move`).toBeLessThan(0.001);
      expect(a.state, `${b.id} kept its state`).toBe(b.state);
      expect(a.suspicion, `${b.id} gained no suspicion`).toBe(b.suspicion);
    }
    expect((await game.enemy(id)).suspicion, 'the watching hostile stays oblivious').toBe(0);

    // Unfreezing hands control back.
    await game.qa('freezeAI', false);
    await game.adv(2500);
    expect((await game.enemy(id)).suspicion, 'the AI resumes once unfrozen').toBeGreaterThan(0);

    await expectNoErrors(game, 'freeze');
  });
});
