import { expect } from '@playwright/test';
import {
  test,
  bootGame, advance, state, qa, shot, hold, release, tap, shoot, reload,
  expectNoConsoleErrors, enterGameplay, writeArtifact, recordEvents,
  eventCounts, releaseAll, shotRecords, decalCount, faceSolidWall,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 4 — the weapon cause-and-effect chain.
//
// One trigger pull must: consume exactly one round, emit weapon:fire, put a
// bullet into the surface the crosshair is on, leave an impact/decal there, and
// move the aim by the authored recoil step. Reloads must move exactly the right
// number of rounds. Nothing here trusts the HUD alone — every claim is checked
// against the simulation.
// ---------------------------------------------------------------------------

/** Stand at a checkpoint, facing a fixed yaw, weapon drawn and ready. */
async function ready(page, { checkpoint = 'openoffice', yaw = 0, weapon = null } = {}) {
  if (weapon) {
    const g = await qa(page, 'giveWeapon', weapon);
    expect(g.ok, `giveWeapon(${weapon}) failed: ${JSON.stringify(g)}`).toBe(true);
  }
  await qa(page, 'teleport', checkpoint);
  await page.evaluate((y) => {
    const p = window.__NORTHSTAR__.player;
    p.yaw = y;
    p.pitch = 0;
    p.velocity.set(0, 0, 0);
    p.updateCamera(0);
  }, yaw);
  // Long enough for any draw animation to finish (the slowest is 0.42 s).
  await advance(page, 900);
  const s = await state(page);
  expect(s.weapon.transition, `weapon never became ready (phase ${s.weapon.transition})`).toBe('ready');
  return s;
}

const lastShot = shotRecords;

test.describe('weapons', () => {
  test('firing consumes exactly one round per shot and puts a bullet on target', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, godMode: true });
    await recordEvents(page, ['weapon:fire', 'world:impact']);
    await ready(page, { checkpoint: 'openoffice', weapon: 'carbine' });
    // Aim at something solid, chosen by asking the collision world rather than
    // assumed from a checkpoint's facing.
    const wall = await faceSolidWall(page, { maxDistance: 9 });

    const before = await state(page);
    const decalsBefore = await decalCount(page);
    expect(before.weapon.id.length).toBeGreaterThan(0);
    expect(before.weapon.magazineAmmo).toBe(before.weapon.magazineSize);

    // Five discrete trigger pulls, each with a pause. Semi/auto both fire once
    // per pull because a tap is a single fixed step.
    await eventCounts(page); // drain anything from the draw
    await shoot(page, 5, { between: 220 });
    const { counts } = await eventCounts(page, ['weapon:fire', 'world:impact']);

    const after = await state(page);
    writeArtifact('weapons-fire.json', {
      wall,
      before: before.weapon, after: after.weapon, counts,
      decals: { before: decalsBefore, after: await decalCount(page) },
      lastShot: await lastShot(page),
    });

    expect(counts['weapon:fire'], `5 trigger pulls emitted ${counts['weapon:fire']} fire events`).toBe(5);
    expect(
      after.weapon.magazineAmmo,
      `magazine went ${before.weapon.magazineAmmo} -> ${after.weapon.magazineAmmo} for 5 shots`
    ).toBe(before.weapon.magazineAmmo - 5);
    expect(after.weapon.reserveAmmo, 'firing must not touch the reserve').toBe(before.weapon.reserveAmmo);
    expect(after.weapon.totalAmmo).toBe(before.weapon.totalAmmo - 5);

    // Every shot must resolve against geometry, not vanish. Recoil walks the
    // muzzle up over a burst, so the top of the group is allowed to clear the
    // surface; the on-target claim is then made with a single deliberate shot
    // from a settled, level aim.
    expect(
      counts['world:impact'],
      `only ${counts['world:impact']} of 5 rounds registered an impact on ${wall.surface} at ${wall.distance} m`
    ).toBeGreaterThanOrEqual(4);
    await page.evaluate(() => {
      const p = window.__NORTHSTAR__.player;
      p.pitch = 0;
      p.updateCamera(0);
    });
    await advance(page, 400);
    await tap(page, 'attack');
    await advance(page, 120);
    const hits = await lastShot(page);
    expect(hits.length, 'a settled, level shot into a wall recorded no hit at all').toBeGreaterThan(0);
    expect(hits[0].point, 'the hit record has no impact point').not.toBeNull();

    // And it must leave a mark.
    const decalsAfter = await decalCount(page);
    expect(decalsAfter, `decals did not grow: ${decalsBefore} -> ${decalsAfter}`).toBeGreaterThan(decalsBefore);
    const settled = await state(page);
    expect(settled.weapon.magazineAmmo, 'the sixth shot did not come out of the magazine')
      .toBe(before.weapon.magazineAmmo - 6);

    await shot(page, 'weapons-firing');
    await expectNoConsoleErrors(page);
  });

  test('the bullet lands where the crosshair is pointing', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, godMode: true });
    await ready(page, { checkpoint: 'conference', yaw: -Math.PI / 2, weapon: 'sniper' });
    // The sniper has the tightest cone, so this is the honest aim test.
    await hold(page, 'aim');
    await advance(page, 600);

    const eye = await page.evaluate(() => {
      const p = window.__NORTHSTAR__.player;
      return {
        eye: [p.eyePosition.x, p.eyePosition.y, p.eyePosition.z],
        forward: [p.forward.x, p.forward.y, p.forward.z],
      };
    });

    await tap(page, 'attack');
    await advance(page, 80);
    const hits = await lastShot(page);
    await release(page, 'aim');
    await releaseAll(page);

    expect(hits.length, 'an aimed sniper shot recorded no hit').toBeGreaterThan(0);
    const hit = hits[0];
    // The impact must lie along the aim ray: the vector eye -> impact should be
    // almost parallel to the forward vector.
    const v = [hit.point[0] - eye.eye[0], hit.point[1] - eye.eye[1], hit.point[2] - eye.eye[2]];
    const len = Math.hypot(...v);
    const dot = (v[0] * eye.forward[0] + v[1] * eye.forward[1] + v[2] * eye.forward[2]) / (len || 1);

    writeArtifact('weapons-aim.json', { eye, hit, distance: +len.toFixed(3), alignment: +dot.toFixed(5) });
    expect(len, 'the impact is at the muzzle — the trace did not travel').toBeGreaterThan(0.5);
    expect(dot, `the impact is ${(Math.acos(Math.min(1, dot)) * 180 / Math.PI).toFixed(2)}° off the aim ray`)
      .toBeGreaterThan(0.999);
    await expectNoConsoleErrors(page);
  });

  test('recoil moves the aim and then recovers', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, godMode: true });
    await ready(page, { checkpoint: 'openoffice', yaw: 0, weapon: 'carbine' });

    const before = await state(page);
    // Hold through several rounds; while the trigger is down recovery is
    // suppressed, so the climb is visible.
    await hold(page, 'attack');
    await advance(page, 420);
    const peak = await state(page);
    await release(page, 'attack');

    const climb = peak.player.orientation.pitchRadians - before.player.orientation.pitchRadians;
    const shotsFired = before.weapon.magazineAmmo - peak.weapon.magazineAmmo;
    expect(shotsFired, 'holding the trigger for 420 ms fired nothing').toBeGreaterThan(2);
    expect(climb, `${shotsFired} automatic rounds moved pitch by ${climb.toFixed(4)} rad — no recoil`)
      .toBeGreaterThan(0.01);

    // Recovery pulls most of it back once the trigger is released.
    await advance(page, 1200);
    const settled = await state(page);
    const residual = settled.player.orientation.pitchRadians - before.player.orientation.pitchRadians;
    writeArtifact('weapons-recoil.json', {
      shotsFired,
      pitchBefore: before.player.orientation.pitchRadians,
      pitchPeak: peak.player.orientation.pitchRadians,
      pitchSettled: settled.player.orientation.pitchRadians,
      climb: +climb.toFixed(4), residual: +residual.toFixed(4),
    });
    expect(Math.abs(residual), `recoil never recovered: ${residual.toFixed(4)} rad still on the aim`)
      .toBeLessThan(Math.abs(climb));

    // Sustained fire must bloom the cone.
    expect(peak.weapon.bloomDegrees, 'automatic fire did not bloom the spread')
      .toBeGreaterThan(before.weapon.bloomDegrees);
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('tactical and empty reloads restore exactly the right ammunition', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, godMode: true });
    await recordEvents(page, ['weapon:reload:start', 'weapon:reload:end', 'weapon:dry']);
    await ready(page, { checkpoint: 'openoffice', yaw: 0, weapon: 'carbine' });

    const full = await state(page);
    const magSize = full.weapon.magazineSize;

    // --- tactical: a round stays in the chamber, so the mag refills to
    //     magSize (which already includes the chambered round).
    await shoot(page, 6, { between: 200 });
    const partial = await state(page);
    expect(partial.weapon.magazineAmmo).toBe(magSize - 6);
    await eventCounts(page);

    await reload(page, { settle: 3000 });
    const tactical = await state(page);
    const tacticalEvents = await eventCounts(page, ['weapon:reload:start', 'weapon:reload:end']);

    expect(tacticalEvents.counts['weapon:reload:start'], 'no reload started').toBe(1);
    expect(tacticalEvents.counts['weapon:reload:end'], 'the reload never finished').toBe(1);
    expect(tactical.weapon.reloading, 'still reloading after the full duration').toBe(false);
    expect(tactical.weapon.magazineAmmo, 'a tactical reload must refill the magazine completely')
      .toBe(magSize);
    expect(
      tactical.weapon.reserveAmmo,
      `the reserve must fall by exactly the 6 rounds loaded: ${partial.weapon.reserveAmmo} -> ${tactical.weapon.reserveAmmo}`
    ).toBe(partial.weapon.reserveAmmo - 6);
    expect(tactical.weapon.totalAmmo, 'a reload must not create or destroy ammunition')
      .toBe(partial.weapon.totalAmmo);

    // --- empty: fire the magazine dry, then reload. An empty reload has no
    //     round to chamber, so it stops one short of the tactical capacity.
    await hold(page, 'attack');
    await advance(page, 4000, { render: false });
    await release(page, 'attack');
    await advance(page, 300);
    const dry = await state(page);
    expect(dry.weapon.magazineAmmo, 'the magazine did not run dry under sustained fire').toBe(0);

    // Dry fire: pulling the trigger on empty must announce itself, not fire.
    await eventCounts(page);
    await tap(page, 'attack');
    await advance(page, 200);
    const dryEvents = await eventCounts(page, ['weapon:dry', 'weapon:fire']);
    expect(dryEvents.counts['weapon:dry'], 'no dry-fire event on an empty weapon').toBeGreaterThanOrEqual(1);
    expect(dryEvents.counts['weapon:fire'] ?? 0, 'an empty weapon fired a round').toBe(0);

    const beforeEmpty = await state(page);
    await reload(page, { settle: 3600 });
    const reloaded = await state(page);

    writeArtifact('weapons-reload.json', {
      magSize,
      tactical: { from: partial.weapon, to: tactical.weapon },
      empty: { from: beforeEmpty.weapon, to: reloaded.weapon },
    });

    expect(reloaded.weapon.reloading).toBe(false);
    expect(
      reloaded.weapon.magazineAmmo,
      `an empty reload loaded ${reloaded.weapon.magazineAmmo}; expected ${magSize - 1} (no chambered round)`
    ).toBe(magSize - 1);
    expect(reloaded.weapon.reserveAmmo)
      .toBe(beforeEmpty.weapon.reserveAmmo - (magSize - 1));
    expect(reloaded.weapon.totalAmmo).toBe(beforeEmpty.weapon.totalAmmo);

    await shot(page, 'weapons-reloading');
    await expectNoConsoleErrors(page);
  });

  test('weapon switching moves between slots', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true });
    await recordEvents(page, ['weapon:switch']);
    await ready(page, { checkpoint: 'openoffice', yaw: 0 });

    const primary = await state(page);
    expect(primary.weapon.slot).toBe('primary');

    await eventCounts(page);
    await tap(page, 'slot2');
    await advance(page, 700);
    const secondary = await state(page);
    expect(secondary.weapon.slot, 'slot 2 did not select the sidearm').toBe('secondary');
    expect(secondary.weapon.id).not.toBe(primary.weapon.id);

    await tap(page, 'slot3');
    await advance(page, 700);
    const melee = await state(page);
    expect(melee.weapon.slot).toBe('melee');

    // Q returns to the previous weapon.
    await tap(page, 'lastWeapon');
    await advance(page, 700);
    const back = await state(page);
    expect(back.weapon.slot, 'last-weapon did not return to the sidearm').toBe('secondary');

    await tap(page, 'slot1');
    await advance(page, 700);
    const again = await state(page);
    expect(again.weapon.slot).toBe('primary');
    expect(again.weapon.id, 'returning to slot 1 gave a different weapon').toBe(primary.weapon.id);

    const { counts } = await eventCounts(page, ['weapon:switch']);
    writeArtifact('weapons-switch.json', {
      chain: [primary.weapon.id, secondary.weapon.id, melee.weapon.id, back.weapon.id, again.weapon.id],
      switches: counts['weapon:switch'],
    });
    expect(counts['weapon:switch'], 'switch events were not emitted').toBeGreaterThanOrEqual(4);

    // Ammunition must survive a round trip through another slot.
    expect(again.weapon.magazineAmmo).toBe(primary.weapon.magazineAmmo);
    await shot(page, 'weapons-switch');
    await expectNoConsoleErrors(page);
  });

  test('ADS narrows the FOV and tightens the cone', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true });
    await ready(page, { checkpoint: 'conference', yaw: -Math.PI / 2, weapon: 'carbine' });

    const hipFov = await page.evaluate(() => window.__NORTHSTAR__.camera.fov);
    const hip = await state(page);

    await hold(page, 'aim');
    await advance(page, 700);
    const adsFov = await page.evaluate(() => window.__NORTHSTAR__.camera.fov);
    const ads = await state(page);

    expect(ads.weapon.ads, 'holding aim did not enter ADS').toBe(true);
    expect(ads.weapon.adsFactor, 'the ADS blend never reached full').toBeGreaterThan(0.9);
    expect(adsFov, `ADS did not narrow the FOV: ${hipFov} -> ${adsFov}`).toBeLessThan(hipFov - 1);
    expect(
      ads.weapon.spreadDegrees,
      `ADS spread ${ads.weapon.spreadDegrees}° is not tighter than hip ${hip.weapon.spreadDegrees}°`
    ).toBeLessThan(hip.weapon.spreadDegrees);

    await shot(page, 'weapons-ads');

    await release(page, 'aim');
    await advance(page, 700);
    const back = await state(page);
    const backFov = await page.evaluate(() => window.__NORTHSTAR__.camera.fov);
    expect(back.weapon.ads, 'releasing aim did not leave ADS').toBe(false);
    expect(backFov, 'the FOV did not return after ADS').toBeCloseTo(hipFov, 0);

    writeArtifact('weapons-ads.json', {
      hipFov, adsFov, backFov,
      hipSpread: hip.weapon.spreadDegrees, adsSpread: ads.weapon.spreadDegrees,
      adsFovMultiplier: ads.weapon.adsFovMultiplier,
    });
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('the shotgun fires a pellet pattern and the sniper is a magnified single shot', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, godMode: true });
    await recordEvents(page, ['weapon:fire']);

    // --- shotgun: many projectiles, one round, a manual pump between shots.
    await ready(page, { checkpoint: 'conference', yaw: -Math.PI / 2, weapon: 'shotgun' });
    const shotgun = await state(page);
    expect(shotgun.weapon.family).toBe('shotgun');
    expect(shotgun.weapon.pellets, 'the shotgun is not a multi-pellet weapon').toBeGreaterThan(1);

    await eventCounts(page);
    await tap(page, 'attack');
    await advance(page, 120);
    const pelletHits = await lastShot(page);
    const afterOne = await state(page);

    expect(afterOne.weapon.magazineAmmo, 'one shell must cost exactly one round')
      .toBe(shotgun.weapon.magazineAmmo - 1);
    expect(
      pelletHits.length,
      `one shell produced ${pelletHits.length} projectile hits; ${shotgun.weapon.pellets} pellets were fired`
    ).toBeGreaterThan(1);
    // The action must be cycling immediately after the shot: it cannot fire again.
    expect(afterOne.weapon.cyclingAction, 'the pump action did not cycle after firing').toBeGreaterThan(0);
    await tap(page, 'attack');
    await advance(page, 100);
    const blocked = await state(page);
    expect(blocked.weapon.magazineAmmo, 'the shotgun fired again mid-pump')
      .toBe(afterOne.weapon.magazineAmmo);

    // Pellets must actually be spread, not stacked on one point.
    const points = pelletHits.filter((h) => h.point).map((h) => h.point);
    const spread = Math.max(...points.map((p) => Math.hypot(p[0] - points[0][0], p[1] - points[0][1], p[2] - points[0][2])));
    expect(spread, 'every pellet landed on the same point — there is no pattern').toBeGreaterThan(0.01);
    await shot(page, 'weapons-shotgun');

    // --- sniper: one projectile, heavy magnification, slow cadence.
    await ready(page, { checkpoint: 'conference', yaw: -Math.PI / 2, weapon: 'sniper' });
    const sniper = await state(page);
    expect(sniper.weapon.family).toBe('sniper');
    expect(sniper.weapon.pellets).toBe(1);
    expect(sniper.weapon.scopeMagnification, 'the sniper has no scope magnification').toBeGreaterThan(1);
    expect(sniper.weapon.damage, 'the sniper does not hit harder than the carbine').toBeGreaterThan(31);

    const sniperHipFov = await page.evaluate(() => window.__NORTHSTAR__.camera.fov);
    await hold(page, 'aim');
    await advance(page, 900);
    const scopedFov = await page.evaluate(() => window.__NORTHSTAR__.camera.fov);
    expect(scopedFov, `scoping in did not magnify: ${sniperHipFov} -> ${scopedFov}`)
      .toBeLessThan(sniperHipFov * 0.5);
    await shot(page, 'weapons-sniper-scoped');
    await release(page, 'aim');

    writeArtifact('weapons-families.json', {
      shotgun: { pellets: shotgun.weapon.pellets, hits: pelletHits.length, spread: +spread.toFixed(3) },
      sniper: { magnification: sniper.weapon.scopeMagnification, hipFov: sniperHipFov, scopedFov },
    });
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });
});
