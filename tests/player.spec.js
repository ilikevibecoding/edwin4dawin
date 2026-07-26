// PW-03 movement (WASD, crouch, jump, walk) and PW-04 look injection (sensitivity, invert-Y).
// Related checks are grouped per boot: booting the map costs seconds, the assertions cost none.
import { test, expect } from '@playwright/test';
import { boot, expectNoErrors, setSetting } from './helpers/game.js';

// A long, flat, unobstructed stretch of the service corridor (runs along +X at z = 13.5).
const OPEN_SPOT = [20, 0, 13.5];

async function inMission(page, settings) {
  const game = await boot(page, settings ? { settings } : {});
  await game.quickStart({ freezeAI: true, god: true });
  await game.qa('teleport', OPEN_SPOT, 0);
  await game.adv(700); // let the weapon draw finish so nothing else is animating
  return game;
}

/** Travel vector for a key held over `ms` of simulated time, starting from a known pose. */
async function travel(game, code, ms, yawDeg) {
  await game.qa('teleport', OPEN_SPOT, yawDeg);
  await game.adv(80);
  const before = await game.state();
  await game.hold(code, ms);
  await game.adv(40);
  const after = await game.state();
  await game.qa('releaseAll');
  return {
    before, after,
    dx: after.player.position[0] - before.player.position[0],
    dz: after.player.position[2] - before.player.position[2],
    dist: Math.hypot(after.player.position[0] - before.player.position[0], after.player.position[2] - before.player.position[2]),
  };
}

test.describe('player', () => {
  test('PW-03 WASD moves in the facing frame at the expected speeds', async ({ page }) => {
    const game = await inMission(page);
    expect((await game.state()).player.moveState).toBe('idle');

    // Forward: down the corridor with yaw 90 (forward = -X).
    const fwd = await travel(game, 'KeyW', 1200, 90);
    const [ffx, , ffz] = fwd.before.player.forward;
    expect(fwd.dist, 'forward travel over 1.2 s at 3.7 m/s').toBeGreaterThan(2.5);
    expect((fwd.dx * ffx + fwd.dz * ffz) / fwd.dist, 'forward alignment').toBeGreaterThan(0.9);
    expect(fwd.after.player.moveState).toBe('moving');

    // Back: same axis, opposite sign.
    const back = await travel(game, 'KeyS', 900, 90);
    const [bfx, , bfz] = back.before.player.forward;
    expect((back.dx * bfx + back.dz * bfz) / back.dist, 'backward alignment').toBeLessThan(-0.9);

    // Strafe right with yaw 0 so the open axis of the corridor is the strafe axis.
    const right = await travel(game, 'KeyD', 900, 0);
    const [rfx, , rfz] = right.before.player.forward;
    const rightX = -rfz, rightZ = rfx; // forward rotated -90° about +Y
    expect(right.dist, 'strafe travel').toBeGreaterThan(1.5);
    expect((right.dx * rightX + right.dz * rightZ) / right.dist, 'strafe alignment').toBeGreaterThan(0.9);

    // Shift-walk covers noticeably less ground than a run over the same window.
    const run = await travel(game, 'KeyW', 1000, 90);
    await game.qa('teleport', OPEN_SPOT, 90);
    await game.adv(80);
    const w0 = await game.state();
    await game.qa('press', 'ShiftLeft');
    await game.hold('KeyW', 1000);
    const w1 = await game.state();
    await game.qa('releaseAll');
    const walkDist = Math.hypot(w1.player.position[0] - w0.player.position[0], w1.player.position[2] - w0.player.position[2]);
    expect(w1.player.moveState).toBe('walking');
    expect(walkDist, 'walk distance vs run distance').toBeLessThan(run.dist * 0.7);

    await expectNoErrors(game, 'movement');
  });

  test('PW-03 crouch lowers the eye height and jump goes airborne then lands', async ({ page }) => {
    const game = await inMission(page);
    const stance = () => game.probe(() => ({
      eye: +window.__game.mission.player.eyeSmooth.toFixed(3),
      crouched: window.__game.mission.player.crouched,
      height: +window.__game.mission.player.height.toFixed(2),
      onGround: window.__game.mission.player.onGround,
    }));

    const stand = await stance();
    expect(stand.crouched).toBe(false);

    await game.tap('KeyC');
    await game.adv(600); // eye height is damped towards the crouch value
    const crouched = await stance();
    expect(crouched.crouched).toBe(true);
    expect(crouched.height).toBeLessThan(stand.height);
    expect(crouched.eye, 'crouched eye height').toBeLessThan(stand.eye - 0.3);
    expect((await game.state()).player.moveState).toBe('crouching');

    await game.hold('KeyW', 700);
    expect((await game.state()).player.moveState).toBe('crouch-walking');
    await game.qa('releaseAll');
    await game.adv(200);

    await game.tap('KeyC');
    await game.adv(600);
    const restood = await stance();
    expect(restood.crouched).toBe(false);
    expect(restood.eye).toBeCloseTo(stand.eye, 1);

    // Jump.
    await game.qa('teleport', OPEN_SPOT, 0);
    await game.adv(80);
    const groundY = (await game.state()).player.position[1];
    await game.tap('Space', 60);
    await game.adv(120);
    const airborne = await game.state();
    expect(airborne.player.moveState).toBe('airborne');
    expect(airborne.player.velocity[1]).toBeGreaterThan(0);
    expect(airborne.player.position[1]).toBeGreaterThan(groundY + 0.05);

    await game.adv(1500);
    const landed = await game.state();
    expect(landed.player.moveState).toBe('idle');
    expect(landed.player.position[1]).toBeCloseTo(groundY, 1);
    expect(landed.player.velocity[1]).toBeCloseTo(0, 1);
    expect((await stance()).onGround).toBe(true);

    await expectNoErrors(game, 'crouch-jump');
  });

  test('PW-04 injected look deltas rotate the view exactly, honouring sensitivity and invert-Y', async ({ page }) => {
    // Raw delta -> radians happens in Input.snapshot(): delta * 0.0022 * sensitivity.
    const RAD_PER_COUNT = 0.0022;
    const deg = (rad) => (rad * 180) / Math.PI;

    const game = await inMission(page);

    await game.qa('setYawPitch', 0, 0);
    await game.adv(20);
    expect((await game.state()).player.yawDeg).toBeCloseTo(0, 1);

    await game.qa('look', 250, 0);
    await game.adv(20);
    expect((await game.state()).player.yawDeg, 'yaw after +250 counts').toBeCloseTo(-deg(250 * RAD_PER_COUNT), 1);

    await game.qa('setYawPitch', 0, 0);
    await game.adv(20);
    await game.qa('look', 0, 150);
    await game.adv(20);
    // Mouse down (positive dy) looks down while invert-Y is off.
    expect((await game.state()).player.pitchDeg, 'pitch after +150 counts').toBeCloseTo(-deg(150 * RAD_PER_COUNT), 1);

    // Pitch clamp keeps the camera from rolling over the poles.
    await game.qa('look', 0, -100000);
    await game.adv(20);
    const up = await game.state();
    expect(up.player.pitchDeg).toBeGreaterThan(80);
    expect(up.player.pitchDeg).toBeLessThan(90);

    // Sensitivity change applied live from the pause menu's settings screen.
    await page.keyboard.press('KeyP');
    await game.click('settings');
    await setSetting(page, 'sensitivity', 2);
    await game.click('back');
    await game.click('resume');
    expect(await game.mode()).toBe('playing');
    await game.qa('setYawPitch', 0, 0);
    await game.adv(20);
    await game.qa('look', 200, 0);
    await game.adv(20);
    expect((await game.state()).player.yawDeg, 'yaw scales with sensitivity 2').toBeCloseTo(-deg(200 * RAD_PER_COUNT * 2), 1);

    // Invert-Y flips the pitch sign for the same input.
    await page.keyboard.press('KeyP');
    await game.click('settings');
    await setSetting(page, 'sensitivity', 1);
    await setSetting(page, 'invertY', true);
    await game.click('back');
    await game.click('resume');
    await game.qa('setYawPitch', 0, 0);
    await game.adv(20);
    await game.qa('look', 0, 150);
    await game.adv(20);
    expect((await game.state()).player.pitchDeg, 'inverted pitch').toBeCloseTo(deg(150 * RAD_PER_COUNT), 1);

    await expectNoErrors(game, 'look');
  });
});
