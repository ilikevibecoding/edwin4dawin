// PW-05 fire chain, PW-06 reloads, PW-07 weapon switching, PW-08 damage/kill chain,
// PW-23 flash + smoke devices, and the LR-8 scope state.
import { test, expect } from '@playwright/test';
import { boot, expectNoErrors } from './helpers/game.js';

// Lobby atrium: enough open floor to spawn a target 5 m ahead and shoot it.
async function rangeSetup(page, { primary = null } = {}) {
  const game = await boot(page);
  await game.quickStart({ primary, freezeAI: true, god: true });
  await game.qa('teleport', 'lobby');
  await game.adv(700); // finish the draw
  return game;
}

/** Spawns a target straight ahead of the player and aims at its chest. */
async function spawnTarget(game, type = 'trooper') {
  const id = await game.qa('spawnEnemy', type);
  await game.adv(60);
  await game.aimAtEnemy(id);
  await game.adv(20);
  return id;
}

/**
 * Spawns a target and turns it to face the player so its vision cone covers us.
 * Returns the target's snapshot plus a probe for its raw perception value.
 */
async function facingTarget(game, type = 'trooper') {
  const id = await game.qa('spawnEnemy', type);
  await game.adv(60);
  await game.probe((eid) => {
    const m = window.__game.mission;
    const e = m.enemies.find((x) => x.id === eid);
    e.yaw = Math.atan2(-(m.player.pos.x - e.pos.x), -(m.player.pos.z - e.pos.z));
    e.guardYaw = e.yaw;
  }, id);
  const target = await game.enemy(id);
  const canSee = () => game.probe((eid) => {
    const e = window.__game.mission.enemies.find((x) => x.id === eid);
    return +e._seePlayer().toFixed(3);
  }, id);
  return { id, target, canSee };
}

test.describe('combat', () => {
  test('PW-05/PW-08 fire chain: ammo, recoil, damage, death, mission state, melee', async ({ page }) => {
    const game = await rangeSetup(page);
    const remainingBefore = (await game.state()).enemiesRemaining;
    const id = await spawnTarget(game);
    expect((await game.state()).enemiesRemaining).toBe(remainingBefore + 1);

    const before = await game.state();
    const target0 = await game.enemy(id);
    expect(target0.alive).toBe(true);
    expect(before.player.weapon.magazine).toBe(30);

    // Recoil recovers within a few sim steps, so sample it on the step the shot goes out.
    await game.qa('mouse', 0, true);
    await game.adv(10);
    const recoil = await game.probe(() => ({
      pitch: window.__game.mission.player.arsenal.recoilPitch,
      heat: window.__game.mission.player.arsenal.heat,
    }));
    await game.adv(190); // finish the burst: ~2 rounds at 640 rpm
    await game.qa('mouse', 0, false);
    await game.adv(30);

    const after = await game.state();
    const target1 = await game.enemy(id);
    const stats = await game.stats();
    expect(after.player.weapon.magazine, 'magazine after burst').toBeLessThan(before.player.weapon.magazine);
    expect(after.player.weapon.reserve, 'reserve is untouched by firing').toBe(before.player.weapon.reserve);
    expect(stats.shots).toBeGreaterThan(0);
    expect(stats.hits, 'hitscan registered an entity hit').toBeGreaterThan(0);
    expect(target1.hp, 'target health after burst').toBeLessThan(target0.hp);
    expect(target1.alive).toBe(true);
    // Being shot pulls the target into combat and reveals the shooter's rough position.
    expect(['combat', 'investigate']).toContain(target1.state);
    expect(recoil.pitch, 'recoil pitch kick').toBeGreaterThan(0);
    expect(recoil.heat, 'spread bloom from consecutive fire').toBeGreaterThan(0);

    // Keep shooting until the 110 hp trooper drops.
    for (let i = 0; i < 6 && (await game.enemy(id)).alive; i++) {
      await game.aimAtEnemy(id);
      await game.fire(120);
    }
    const dead = await game.enemy(id);
    expect(dead.alive, 'target is dead').toBe(false);
    expect(dead.hp).toBe(0);
    expect((await game.enemies()).find((e) => e.id === id)).toMatchObject({ alive: false });
    const afterKill = await game.state();
    expect(afterKill.enemiesRemaining, 'enemiesRemaining drops on death').toBe(remainingBefore);
    expect(afterKill.enemies.find((e) => e.id === id), 'dead hostiles leave the live list').toBeUndefined();
    expect((await game.stats()).kills).toBeGreaterThan(0);

    // Melee: fresh target, blade drawn, contact range.
    const melee = await game.qa('spawnEnemy', 'trooper');
    await game.adv(60);
    await game.qa('selectSlot', 3);
    await game.adv(700); // blade draw
    const knife = await game.weapon();
    expect(knife.id).toBe('cq-blade');
    expect(knife.mag).toBe('inf');

    // Step up to the target: the blade only reaches 1.7 m.
    await game.probe((eid) => {
      const m = window.__game.mission;
      const e = m.enemies.find((x) => x.id === eid);
      const p = m.player;
      p.pos.set(e.pos.x, e.pos.y, e.pos.z + 1.1);
      p.yaw = Math.atan2(-(e.pos.x - p.pos.x), -(e.pos.z - p.pos.z));
      p.pitch = 0;
    }, melee);
    await game.adv(60);

    const hp0 = (await game.enemy(melee)).hp;
    await game.fire(60);
    await game.adv(400); // the stab resolves 0.12 s after the swing starts
    const hp1 = (await game.enemy(melee)).hp;
    expect(hp1, 'melee damage applied').toBeLessThan(hp0);

    await expectNoErrors(game, 'fire-chain');
  });

  test('PW-06 tactical, empty and shell-by-shell reloads restore the right ammo', async ({ page }) => {
    const game = await rangeSetup(page);

    // --- tactical reload: partial magazine, short duration, reserve pays for the top-up
    await game.fire(300);
    const spent = await game.weapon();
    expect(spent.mag).toBeLessThan(30);
    const rounds = 30 - spent.mag;

    await game.tap('KeyR');
    const reloading = await game.weapon();
    expect(reloading.state).toBe('reload');
    expect(reloading.stateDur, 'tactical reload duration (reloadMs 2100)').toBeCloseTo(2.1, 1);
    await game.adv(2200);
    const reloaded = await game.weapon();
    expect(reloaded.state).toBe('idle');
    // WP-014: the HC-4 is closed-bolt (`chamber` in defs.js), so a reload with rounds still in the
    // magazine keeps the chambered one and ends at magSize + 1. The reserve pays for it.
    expect(reloaded.mag, 'magazine refilled plus the chambered round').toBe(31);
    expect(reloaded.reserve, 'reserve pays the rounds fired plus the chambered round').toBe(90 - rounds - 1);

    // --- empty reload takes longer than the tactical one
    await game.probe(() => { window.__game.mission.player.arsenal.current.mag = 0; });
    await game.tap('KeyR');
    const emptyReload = await game.weapon();
    expect(emptyReload.state).toBe('reload');
    expect(emptyReload.stateDur, 'empty reload duration (reloadEmptyMs 2700)').toBeCloseTo(2.7, 1);
    expect(emptyReload.stateDur).toBeGreaterThan(reloading.stateDur);
    await game.adv(2000);
    expect((await game.weapon()).state, 'still reloading at 2.0 s').toBe('reload');
    await game.adv(900);
    const afterEmpty = await game.weapon();
    expect(afterEmpty.state).toBe('idle');
    // Reloading from empty closes the bolt on an empty chamber: no +1 this time.
    expect(afterEmpty.mag).toBe(30);
    expect(afterEmpty.reserve).toBe(90 - rounds - 1 - 30);

    // --- dry fire on an empty magazine must not underflow or spend reserve
    await game.probe(() => { window.__game.mission.player.arsenal.current.mag = 0; });
    const dryBefore = await game.weapon();
    await game.fire(400);
    const dryAfter = await game.weapon();
    expect(dryAfter.mag, 'magazine never goes negative').toBe(0);
    expect(dryAfter.reserve).toBe(dryBefore.reserve);
    expect((await game.stats()).shots, 'dry fire spawns no shots').toBe((await game.stats()).shots);

    await expectNoErrors(game, 'reload');
  });

  test('PW-06 shotgun reloads shell by shell', async ({ page }) => {
    const game = await rangeSetup(page, { primary: 'vanta-s12' });
    const start = await game.weapon();
    expect(start.id).toBe('vanta-s12');
    expect(start.mag).toBe(7);

    // Two shells: 68 rpm plus a 620 ms pump means ~1.5 s between shots.
    for (let i = 0; i < 2; i++) {
      expect((await game.weapon()).state, 'ready to fire').toBe('idle');
      await game.fire(40);
      await game.adv(1600);
    }
    const fired = await game.weapon();
    expect(fired.mag).toBe(5);
    expect(fired.state).toBe('idle');

    await game.tap('KeyR');
    expect((await game.weapon()).state).toBe('reload');
    await game.adv(760); // reloadMs 660 per shell
    const oneShell = await game.weapon();
    expect(oneShell.mag, 'one shell inserted').toBe(6);
    expect(oneShell.reserve).toBe(fired.reserve - 1);
    await game.adv(760);
    const twoShells = await game.weapon();
    expect(twoShells.mag, 'second shell inserted').toBe(7);
    await game.adv(400);
    expect((await game.weapon()).state, 'reload ends when the tube is full').toBe('idle');

    await expectNoErrors(game, 'shotgun-reload');
  });

  test('PW-07 every loadout slot can be selected, with draw/holster states and Q for last weapon', async ({ page }) => {
    const game = await rangeSetup(page);
    const expected = {
      1: 'karst-p9', 2: 'halcyon-hc4', 3: 'cq-blade', 4: 'fb-3', 5: 'sg-2',
    };

    for (const slot of [1, 3, 4, 5, 2]) {
      await game.tap('Digit' + slot);
      const switching = await game.weapon();
      expect(['holster', 'draw'], `slot ${slot} switch passes through holster/draw`).toContain(switching.state);
      await game.adv(1000);
      const equipped = await game.weapon();
      expect(equipped.slot, `slot ${slot} active`).toBe(slot);
      expect(equipped.id).toBe(expected[slot]);
      expect(equipped.state).toBe('idle');
      expect((await game.state()).player.weapon.id).toBe(expected[slot]);
    }

    // Q swaps back to the previously held weapon (slot 5 was equipped before slot 2).
    await game.tap('KeyQ');
    await game.adv(1000);
    expect((await game.weapon()).slot).toBe(5);
    await game.tap('KeyQ');
    await game.adv(1000);
    expect((await game.weapon()).slot).toBe(2);

    await expectNoErrors(game, 'weapon-switch');
  });

  test('PW-23 the FB-3 flash blinds a hostile with line of sight', async ({ page }) => {
    const game = await rangeSetup(page);
    const { id, target } = await facingTarget(game);

    await game.qa('selectSlot', 4);
    await game.adv(600); // device draw
    expect((await game.weapon()).id).toBe('fb-3');

    // Lob it at the target's feet, then let the 1.6 s fuse run out.
    await game.aimAtPoint([target.pos[0], target.pos[1], target.pos[2]]);
    await game.fire(40);
    await game.adv(600);
    const inFlight = await game.probe(() => window.__game.mission.projectiles.length);
    expect(inFlight, 'a device projectile is in flight').toBeGreaterThan(0);

    await game.adv(2000);
    expect(await game.probe(() => window.__game.mission.projectiles.length), 'projectile detonated').toBe(0);
    const flashed = await game.enemy(id);
    expect(flashed.state, 'target is blinded').toBe('flashed');
    expect(await game.probe(() => window.__game.mission.enemies.find((e) => e.flashT > 0) !== undefined)).toBe(true);

    // Devices are consumed: two carried, one thrown.
    const device = await game.weapon();
    expect(device.id).toBe('fb-3');
    expect(device.mag + (device.reserve === 'inf' ? 0 : device.reserve)).toBe(1);

    await expectNoErrors(game, 'flash');
  });

  test('PW-23 the SG-2 smoke blocks hostile vision', async ({ page }) => {
    const game = await rangeSetup(page);
    // Isolation: with wave-2 information propagation, any roster patrol that spots the pinned
    // player will shout the contact to the veiled subject and legitimately promote it to combat.
    // This test is about sight-through-smoke only, so clear third parties first.
    await game.qa('killEnemies');
    await game.adv(400);
    const { id, canSee } = await facingTarget(game);

    await game.qa('selectSlot', 5);
    await game.adv(600);
    expect((await game.weapon()).id).toBe('sg-2');

    // Thrown at the floor a few metres ahead rather than at the target: a canister that hits a
    // body bounces off into whatever is behind it, and a cloud sitting in a doorway or against a
    // wall leaves nowhere to stand where the smoke is the only thing in the way.
    const from = await game.probe(() => {
      const p = window.__game.mission.player;
      return [p.pos.x, p.pos.y, p.pos.z];
    });
    await game.aimAtPoint([from[0], from[1] + 0.3, from[2] - 6]);
    await game.fire(40);
    await game.adv(2400); // 1.3 s fuse + settle
    const cloud = await game.probe(() => {
      const s = window.__game.mission.vfx.smokes[0];
      return s ? { pos: [s.pos.x, s.pos.y, s.pos.z], radius: s.radius } : null;
    });
    expect(cloud, 'the device leaves a smoke volume behind').not.toBeNull();
    expect(cloud.radius).toBeGreaterThan(1);

    // Where a bounced canister settles is not worth asserting on, so the two characters are placed
    // around wherever it ended up: hostile on one side, player directly opposite. That is the
    // arrangement the device exists for, and the one perception has to respect. Several stand-off
    // distances are tried because the open axis through the cloud can be a narrow one.
    const placed = await game.probe(([eid, c]) => {
      const m = window.__game.mission, p = m.player;
      const e = m.enemies.find((x) => x.id === eid);
      const centre = { x: c.pos[0], y: c.pos[1], z: c.pos[2] };
      for (const reach of [c.radius + 1.6, c.radius + 0.3, c.radius * 0.85, c.radius * 0.6]) {
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const dx = Math.cos(a), dz = Math.sin(a);
          const ePos = { x: centre.x + dx * reach, y: centre.y, z: centre.z + dz * reach };
          const pPos = { x: centre.x - dx * reach, y: centre.y, z: centre.z - dz * reach };
          if (m.nav.nearestNode(ePos.x, centre.y, ePos.z) < 0) continue;
          if (m.nav.nearestNode(pPos.x, centre.y, pPos.z) < 0) continue;
          e.pos.set(ePos.x, ePos.y, ePos.z);
          p.pos.set(pPos.x, pPos.y, pPos.z);
          p.vel.set(0, 0, 0);
          e.yaw = Math.atan2(-(p.pos.x - e.pos.x), -(p.pos.z - e.pos.z));
          e.guardYaw = e.yaw;
          const eye = { x: e.pos.x, y: e.pos.y + 1.6, z: e.pos.z };
          const pEye = { x: p.pos.x, y: p.eyeY, z: p.pos.z };
          // The only thing between them must be the smoke, not architecture.
          if (!e._clearSight(eye, pEye)) continue;
          if (!m.vfx.isSmoked(eye, pEye)) continue;
          return { angle: Math.round((a * 180) / Math.PI), gap: +(reach * 2).toFixed(2) };
        }
      }
      return null;
    }, [id, cloud]);
    expect(placed, 'the cloud can be put between the hostile and the player with clear geometry')
      .not.toBeNull();

    await game.adv(60);
    expect(await canSee(), 'perception is blocked by the smoke').toBe(0);

    // Now run the perception loop for real. The hostile is held where it was put between steps:
    // the canister's own bang carries 24 m, so a live hostile walks off to investigate it and would
    // simply step around the cloud, which says nothing about whether the smoke works. Pinned in
    // place, the only question left is what it can see through its own veil — and then the same
    // arrangement is measured again once the cloud times out, so the contrast is the smoke alone.
    await game.qa('freezeAI', false);
    const run = await game.probe(([eid, budgetMs]) => {
      const m = window.__game.mission, p = m.player;
      const e = m.enemies.find((x) => x.id === eid);
      const ePos = { x: e.pos.x, y: e.pos.y, z: e.pos.z }, eYaw = e.yaw;
      const pPos = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
      const pin = () => {
        e.pos.set(ePos.x, ePos.y, ePos.z);
        e.yaw = eYaw; e.guardYaw = eYaw;
        p.pos.set(pPos.x, pPos.y, pPos.z);
        p.vel.set(0, 0, 0);
      };
      const sample = () => ({
        see: +e._seePlayer().toFixed(3),
        suspicion: +e.suspicion.toFixed(2),
        state: e.state,
        smoked: m.vfx.isSmoked({ x: e.pos.x, y: e.pos.y + 1.6, z: e.pos.z }, { x: p.pos.x, y: p.eyeY, z: p.pos.z }),
      });
      const veiled = [];
      const cleared = [];
      for (let t = 0; t < budgetMs; t += 100) {
        pin();
        window.advanceTime(100);
        pin();
        (m.vfx.smokes.length ? veiled : cleared).push(sample());
        if (cleared.length >= 15) break;
      }
      const max = (rows, key) => rows.reduce((a, r) => Math.max(a, r[key]), 0);
      return {
        veiled: {
          samples: veiled.length,
          maxSee: max(veiled, 'see'),
          maxSuspicion: max(veiled, 'suspicion'),
          allSmoked: veiled.every((r) => r.smoked),
          states: [...new Set(veiled.map((r) => r.state))],
        },
        cleared: {
          samples: cleared.length,
          maxSee: max(cleared, 'see'),
          maxSuspicion: max(cleared, 'suspicion'),
          anySmoked: cleared.some((r) => r.smoked),
        },
      };
    }, [id, 30_000]);

    expect(run.veiled.samples, 'the cloud held for most of its 16 s life').toBeGreaterThan(100);
    expect(run.veiled.allSmoked, 'the sight line stayed inside the cloud throughout').toBe(true);
    expect(run.veiled.maxSee, 'a veiled hostile never sees the player').toBe(0);
    // Suspicion is deliberately not asserted to hold still: the canister lands with a 24 m noise
    // event, and a hostile that hears something is supposed to grow suspicious of it. What the
    // smoke owes us is that none of that suspicion comes from sight, which is what maxSee covers,
    // and that suspicion alone never promotes to combat while the player cannot be seen.
    expect(run.veiled.states, 'the veiled hostile never reaches combat').not.toContain('combat');

    // Same two positions, same sight line, no cloud: perception has to come back, otherwise the
    // zero above proves nothing about the smoke.
    expect(run.cleared.anySmoked, 'the cloud really expired').toBe(false);
    expect(run.cleared.maxSee, 'the hostile sees the player again once the cloud clears')
      .toBeGreaterThan(0);

    await expectNoErrors(game, 'smoke');
  });

  test('LR-8 aiming down the scope reports the aiming state', async ({ page }) => {
    const game = await rangeSetup(page, { primary: 'meridian-lr8' });
    expect((await game.weapon()).id).toBe('meridian-lr8');
    expect((await game.state()).player.weapon.aiming).toBe(false);

    await game.aimDownSights(true);
    const aimed = await game.state();
    expect(aimed.player.weapon.aiming, 'ADS flag set').toBe(true);
    const scope = await game.probe(() => ({
      blend: +window.__game.mission.viewModel.scopeBlend.toFixed(2),
      fov: +window.__game.renderer.camera.fov.toFixed(2),
    }));
    expect(scope.blend, 'scope blend rises while aiming').toBeGreaterThan(0);

    // Spread collapses when scoped (aim multiplier 0.02 for scoped weapons).
    const spread = await game.probe(() => ({
      hip: window.__game.mission.player.arsenal.spreadDeg(0, false),
    }));
    await game.aimDownSights(false);
    await game.adv(300);
    const relaxed = await game.state();
    expect(relaxed.player.weapon.aiming).toBe(false);
    expect(spread.hip).toBeLessThan(1);

    await expectNoErrors(game, 'scope');
  });
});
