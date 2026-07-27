import { expect } from '@playwright/test';
import {
  test,
  bootGame, advance, state, qa, shot, burst, look, releaseAll, tap,
  expectNoConsoleErrors, enterGameplay, writeArtifact, distance2d, wrapAngle,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 3 — movement in the documented coordinate frame.
//
// The contract from `renderToText().coordinateSystem`:
//   +X east, +Y up, +Z south; yaw 0 faces -Z and increases counter-clockwise
//   seen from above; pitch positive looks up.
//
// So facing yaw 0 (north, -Z): forward decreases Z, and "right" (strafe D)
// increases X. Every assertion below is written in those terms.
// ---------------------------------------------------------------------------

/** Put the player somewhere open and pointing at a known yaw. */
async function stage(page, { checkpoint = 'openoffice', yaw = 0 } = {}) {
  await qa(page, 'teleport', checkpoint);
  await page.evaluate((y) => {
    const p = window.__NORTHSTAR__.player;
    p.yaw = y;
    p.pitch = 0;
    p.velocity.set(0, 0, 0);
    p.updateCamera(0);
  }, yaw);
  await advance(page, 200);
  return state(page);
}

/**
 * Find the checkpoint with the most room to walk in *every* horizontal
 * direction, and stage the player there facing north.
 *
 * A four-way movement test needs clearance on all four sides, and no checkpoint
 * is specified to have it — `openoffice` puts a desk about 0.3 m behind the
 * spawn, which caps a one-second backpedal at 0.30 m and looks exactly like a
 * broken input binding. Measuring instead of assuming also means a furniture
 * change in `src/map/**` retires this rather than breaking it.
 *
 * @returns {Promise<{checkpoint:string, clearance:object, all:object[]}>}
 */
async function stageOpenFloor(page, { need = 1.6 } = {}) {
  const survey = await page.evaluate((minClear) => {
    const game = window.__NORTHSTAR__;
    const radius = game.player.radius ?? 0.33;
    const dirs = [
      ['north', 0, -1], ['south', 0, 1], ['east', 1, 0], ['west', -1, 0],
    ];
    const rows = [];
    for (const cp of game.qa.listCheckpoints()) {
      const [x, y, z] = cp.position;
      // Knee height: the capsule is stopped by desks and shelves, not just walls.
      const from = new game.player.position.constructor(x, y + 0.55, z);
      const clearance = {};
      for (const [name, dx, dz] of dirs) {
        const dir = new from.constructor(dx, 0, dz);
        const hit = game.collision?.raycast?.(from, dir, 12);
        clearance[name] = +Math.max(0, (hit?.hit ? hit.distance : 12) - radius).toFixed(2);
      }
      const worst = Math.min(...Object.values(clearance));
      rows.push({ checkpoint: cp.name, room: cp.room ?? null, clearance, worst: +worst.toFixed(2) });
    }
    rows.sort((a, b) => b.worst - a.worst);
    return { rows, best: rows[0], need: minClear };
  }, need);

  expect(
    survey.best.worst,
    `no checkpoint has ${need} m of clearance in all four directions; the roomiest is `
    + `${survey.best.checkpoint} at ${survey.best.worst} m ${JSON.stringify(survey.best.clearance)}`
  ).toBeGreaterThanOrEqual(need);

  await stage(page, { checkpoint: survey.best.checkpoint, yaw: 0 });
  return { checkpoint: survey.best.checkpoint, clearance: survey.best.clearance, all: survey.rows };
}

test.describe('movement', () => {
  test('WASD moves in the documented directions', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, godMode: true });

    // Facing yaw 0 = north = -Z. Forward must reduce Z; back increase it;
    // right increase X; left reduce it. Lateral drift must stay small.
    const cases = [
      { action: 'forward', axis: 2, sign: -1, label: 'W (north, -Z)' },
      { action: 'back', axis: 2, sign: +1, label: 'S (south, +Z)' },
      { action: 'right', axis: 0, sign: +1, label: 'D (east, +X)' },
      { action: 'left', axis: 0, sign: -1, label: 'A (west, -X)' },
    ];

    const open = await stageOpenFloor(page, { need: 1.6 });

    const results = [];
    for (const c of cases) {
      const before = await stage(page, { checkpoint: open.checkpoint, yaw: 0 });
      // 700 ms: long enough to clear the acceleration ramp, short enough that
      // the player cannot cross the clearance measured above and stop on a wall.
      await burst(page, c.action, 700, { pause: 250 });
      const after = await state(page);
      const delta = [0, 1, 2].map((i) => +(after.player.position[i] - before.player.position[i]).toFixed(3));
      const primary = delta[c.axis];
      const lateral = delta[c.axis === 0 ? 2 : 0];
      results.push({ ...c, before: before.player.position, after: after.player.position, delta, primary, lateral });

      expect(
        primary * c.sign,
        `${c.label}: expected the ${c.axis === 0 ? 'X' : 'Z'} axis to move ${c.sign > 0 ? 'positively' : 'negatively'}, got ${primary} (full delta ${JSON.stringify(delta)})`
      ).toBeGreaterThan(0.4);
      expect(
        Math.abs(lateral),
        `${c.label}: unexpected sideways drift of ${lateral} m`
      ).toBeLessThan(Math.abs(primary) * 0.5 + 0.15);
      // Inputs must be fully released between bursts.
      expect(after.player.speed, `${c.label}: the player is still moving after release`).toBeLessThan(0.6);
    }

    writeArtifact('movement-wasd.json', {
      stagedAt: open.checkpoint, clearance: open.clearance, results, clearanceSurvey: open.all,
    });
    await shot(page, 'movement-wasd');
    await expectNoConsoleErrors(page);
  });

  test('movement follows the facing direction, not the world axes', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, godMode: true });

    // Yaw +90° (counter-clockwise from north) faces -X (west), so W must move
    // the player west.
    await stage(page, { checkpoint: 'openoffice', yaw: Math.PI / 2 });
    const before = await state(page);
    await burst(page, 'forward', 500, { pause: 250 });
    const after = await state(page);
    const dx = after.player.position[0] - before.player.position[0];
    const dz = after.player.position[2] - before.player.position[2];

    writeArtifact('movement-facing.json', { yaw: Math.PI / 2, dx: +dx.toFixed(3), dz: +dz.toFixed(3) });
    expect(dx, `facing yaw +90° (west), W moved dx=${dx.toFixed(3)} dz=${dz.toFixed(3)}`).toBeLessThan(-0.4);
    expect(Math.abs(dz)).toBeLessThan(Math.abs(dx) * 0.6 + 0.15);
    await expectNoConsoleErrors(page);
  });

  test('mouse look changes yaw and pitch and is not inverted', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true });
    await stage(page, { checkpoint: 'lobby', yaw: 0 });

    const base = await state(page);

    // Mouse right (+dx) must turn the view to the right. Yaw increases
    // counter-clockwise seen from above, so turning right *decreases* yaw.
    await look(page, 400, 0);
    const right = await state(page);
    const dYawRight = wrapAngle(right.player.orientation.yawRadians - base.player.orientation.yawRadians);
    expect(dYawRight, `moving the mouse right changed yaw by ${dYawRight.toFixed(4)} rad; it must decrease`)
      .toBeLessThan(-0.02);

    await look(page, -800, 0);
    const left = await state(page);
    const dYawLeft = wrapAngle(left.player.orientation.yawRadians - right.player.orientation.yawRadians);
    expect(dYawLeft, 'moving the mouse left must increase yaw').toBeGreaterThan(0.02);

    // Mouse up (-dy) must raise the view: pitch positive looks up.
    await look(page, 0, -200);
    const up = await state(page);
    expect(
      up.player.orientation.pitchRadians,
      `mouse up gave pitch ${up.player.orientation.pitchRadians} — the Y axis is inverted`
    ).toBeGreaterThan(0.02);

    await look(page, 0, 500);
    const down = await state(page);
    expect(down.player.orientation.pitchRadians).toBeLessThan(up.player.orientation.pitchRadians);

    // Pitch must be clamped so the view can never roll over the pole.
    await look(page, 0, -6000);
    const clampUp = (await state(page)).player.orientation.pitchRadians;
    await look(page, 0, 12000);
    const clampDown = (await state(page)).player.orientation.pitchRadians;
    expect(Math.abs(clampUp), `pitch is unclamped looking up (${clampUp})`).toBeLessThan(Math.PI / 2);
    expect(Math.abs(clampDown), `pitch is unclamped looking down (${clampDown})`).toBeLessThan(Math.PI / 2);

    writeArtifact('movement-look.json', {
      dYawRight: +dYawRight.toFixed(4), dYawLeft: +dYawLeft.toFixed(4),
      pitchUp: up.player.orientation.pitchRadians, pitchDown: down.player.orientation.pitchRadians,
      clampUp, clampDown,
    });
    await shot(page, 'movement-look');
    await expectNoConsoleErrors(page);
  });

  test('crouch lowers the eye height and changes the movement state', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true });
    await stage(page, { checkpoint: 'openoffice', yaw: 0 });

    const stand = await state(page);
    expect(stand.player.crouching).toBe(false);

    await page.evaluate(() => window.__NORTHSTAR__.input.setActionState('crouch', true));
    await advance(page, 600);
    const crouched = await state(page);

    expect(crouched.player.crouching, 'holding crouch did not set the crouch flag').toBe(true);
    expect(
      crouched.player.eye[1],
      `crouching did not lower the eye: ${stand.player.eye[1]} -> ${crouched.player.eye[1]}`
    ).toBeLessThan(stand.player.eye[1] - 0.25);
    expect(crouched.player.movementState).toMatch(/crouch/);

    // Crouch-walking must be slower than standing.
    await burst(page, 'forward', 500, { pause: 200 });
    const crouchSpeed = Math.abs((await state(page)).player.position[2] - crouched.player.position[2]);

    await page.evaluate(() => window.__NORTHSTAR__.input.setActionState('crouch', false));
    await advance(page, 600);
    const restood = await state(page);
    expect(restood.player.crouching, 'releasing crouch did not stand up').toBe(false);
    expect(restood.player.eye[1]).toBeGreaterThan(crouched.player.eye[1] + 0.25);

    const beforeRun = await state(page);
    await burst(page, 'forward', 500, { pause: 200 });
    const runSpeed = Math.abs((await state(page)).player.position[2] - beforeRun.player.position[2]);

    writeArtifact('movement-crouch.json', {
      standEye: stand.player.eye[1], crouchEye: crouched.player.eye[1],
      crouchDistance: +crouchSpeed.toFixed(3), standDistance: +runSpeed.toFixed(3),
    });
    expect(crouchSpeed, 'crouch-walking is not slower than standing').toBeLessThan(runSpeed);
    await shot(page, 'movement-crouch');
    await expectNoConsoleErrors(page);
  });

  test('jump leaves the ground and lands again', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true });
    await stage(page, { checkpoint: 'openoffice', yaw: 0 });

    const ground = await state(page);
    expect(ground.player.grounded, 'the player did not start on the ground').toBe(true);
    const groundY = ground.player.position[1];

    await tap(page, 'jump');
    // Sample the arc.
    let peak = groundY;
    let leftGround = false;
    for (let i = 0; i < 14; i++) {
      await advance(page, 50);
      const s = await state(page);
      if (!s.player.grounded) leftGround = true;
      peak = Math.max(peak, s.player.position[1]);
    }
    expect(leftGround, 'jump never left the ground').toBe(true);
    expect(peak, `jump apex ${peak.toFixed(3)} is not above the floor ${groundY.toFixed(3)}`)
      .toBeGreaterThan(groundY + 0.15);

    // And it must come back down.
    let landed = false;
    for (let i = 0; i < 40 && !landed; i++) {
      await advance(page, 50);
      landed = (await state(page)).player.grounded;
    }
    const after = await state(page);
    expect(landed, 'the player never landed after jumping').toBe(true);
    expect(after.player.position[1], 'landed at a different height than take-off')
      .toBeCloseTo(groundY, 1);

    writeArtifact('movement-jump.json', { groundY, peak: +peak.toFixed(3), landedY: after.player.position[1] });
    await expectNoConsoleErrors(page);
  });

  test('walls contain the player', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, godMode: true });

    // Drive hard into a wall from several rooms and yaws. The player must stay
    // inside a room and must not tunnel through.
    const attempts = [
      { checkpoint: 'conference', yaw: -Math.PI / 2, note: 'conference east wall' },
      { checkpoint: 'breakroom', yaw: Math.PI / 2, note: 'breakroom west wall' },
      { checkpoint: 'serverroom', yaw: 0, note: 'server room north wall' },
      { checkpoint: 'janitor', yaw: Math.PI, note: 'janitor south wall' },
      { checkpoint: 'execoffice', yaw: Math.PI / 2, note: 'exec office west wall' },
      { checkpoint: 'archive', yaw: 0, note: 'archive north wall' },
    ];

    const results = [];
    for (const a of attempts) {
      const before = await stage(page, { checkpoint: a.checkpoint, yaw: a.yaw });
      // Sustained pressure, released between attempts.
      await burst(page, 'forward', 1600, { pause: 200, render: false });
      const after = await state(page);
      const travelled = distance2d(before.player.position, after.player.position);
      results.push({
        ...a,
        from: before.player.position, to: after.player.position,
        fromRoom: before.player.room, toRoom: after.player.room,
        travelled: +travelled.toFixed(3),
      });

      // Containment: still inside a named room, still on a sane floor level.
      expect(after.player.room, `${a.note}: the player ended outside any room at ${JSON.stringify(after.player.position)}`)
        .not.toBeNull();
      expect(after.player.position[1], `${a.note}: the player fell out of the world`).toBeGreaterThan(-2);
      expect(after.player.position[1], `${a.note}: the player flew out of the world`).toBeLessThan(12);
      // 1.6 s of unobstructed sprinting would cover far more than this; a hard
      // wall means the player stops well short.
      expect(travelled, `${a.note}: travelled ${travelled.toFixed(2)} m into a wall — probable tunnelling`)
        .toBeLessThan(9);
    }

    writeArtifact('movement-walls.json', results);
    await shot(page, 'movement-walls');
    await expectNoConsoleErrors(page);
  });

  test('the player never falls out of the world during a long random walk', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, godMode: true });

    const actions = ['forward', 'back', 'left', 'right'];
    const samples = [];
    // Deterministic pseudo-random walk: a fixed sequence, no Math.random.
    let seed = 1337;
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (const cp of ['lobby', 'openoffice', 'midcorr', 'servicecorr', 'upperlanding']) {
      await stage(page, { checkpoint: cp, yaw: 0 });
      for (let i = 0; i < 6; i++) {
        const action = actions[Math.floor(next() * actions.length)];
        await page.evaluate((d) => window.__NORTHSTAR__.input.applyLookDelta(d, 0), (next() - 0.5) * 900);
        await burst(page, action, 350, { pause: 120, render: false });
        const s = await state(page);
        samples.push({ cp, i, action, pos: s.player.position, room: s.player.room, grounded: s.player.grounded });
        expect(s.player.position[1], `fell out of the world near ${cp}`).toBeGreaterThan(-2);
        expect(s.player.position[1], `flew out of the world near ${cp}`).toBeLessThan(12);
        expect(Math.abs(s.player.position[0]), `left the building envelope in X near ${cp}`).toBeLessThan(45);
        expect(Math.abs(s.player.position[2]), `left the building envelope in Z near ${cp}`).toBeLessThan(45);
      }
      await releaseAll(page);
    }

    writeArtifact('movement-walk.json', samples);
    const roomless = samples.filter((s) => s.room === null);
    // Corridors and doorways may briefly fall between room volumes, but the
    // player should overwhelmingly be somewhere named.
    expect(roomless.length, `${roomless.length}/${samples.length} samples were outside every room volume`)
      .toBeLessThan(samples.length * 0.35);
    await expectNoConsoleErrors(page);
  });
});
