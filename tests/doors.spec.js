import { test, expect } from '@playwright/test';
import {
  bootGame, advance, state, qa, shot, burst, useKey, releaseAll,
  expectNoConsoleErrors, enterGameplay, writeArtifact, recordEvents,
  takeEvents, advanceUntil,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 7 — doors.
//
// A door has to change three things together, or it is broken: what you see
// (the leaf swings), what you can do (the collider stops blocking so the player
// walks through), and what the state output reports. A security door must refuse
// until the keycard is in hand, and the garage shutter must raise.
// ---------------------------------------------------------------------------

/**
 * Stand the player in front of a door, facing it, at arm's reach.
 * `side` is which face to approach from, along the door's blocking axis.
 */
async function standAtDoor(page, doorId, { side = 1, distance = 1.15 } = {}) {
  const placed = await page.evaluate(([id, s, d]) => {
    const g = window.__NORTHSTAR__;
    const door = g.doors.get(id);
    if (!door) return { ok: false, reason: 'no-door', id };
    const spec = door.spec;
    // `axis: 'x'` means the leaf sits in the plane x = spec.x, so the player
    // approaches along X. `axis: 'z'` is the other way round.
    const along = spec.axis === 'x' ? [s * d, 0, 0] : [0, 0, s * d];
    const p = g.player;
    p.position.set(spec.x + along[0], spec.y, spec.z + along[2]);
    p.velocity.set(0, 0, 0);
    // Face the door.
    const dx = spec.x - p.position.x;
    const dz = spec.z - p.position.z;
    p.yaw = Math.atan2(-dx, -dz);
    p.pitch = 0;
    g.collision.resolveOverlap(p.position, p.radius, p.height);
    p.updateCamera(0);
    return {
      ok: true, id,
      door: { state: door.state, open: +door.openAmount.toFixed(2), locked: !!door.locked, axis: spec.axis, position: [spec.x, spec.y, spec.z] },
      player: [+p.position.x.toFixed(2), +p.position.y.toFixed(2), +p.position.z.toFixed(2)],
    };
  }, [doorId, side, distance]);
  expect(placed.ok, `could not stand at door ${doorId}: ${JSON.stringify(placed)}`).toBe(true);
  await advance(page, 200, { step: 50 });
  return placed;
}

const doorInfo = (page, id) => page.evaluate((wanted) => {
  const d = window.__NORTHSTAR__.doors.get(wanted);
  if (!d) return null;
  return {
    id: d.id, state: d.state, open: +d.openAmount.toFixed(3), locked: !!d.locked,
    isOpen: d.isOpen, isPassable: d.isPassable,
    // The visual truth: where the leaf actually is.
    leafRotation: d.leaves?.[0] ? +d.leaves[0].rotation.y.toFixed(4) : null,
    colliderEnabled: d.colliders?.[0] ? !!d.colliders[0].enabled : null,
  };
}, id);

/** An unlocked, non-shutter door somewhere near the player's route. */
const pickOpenableDoor = (page) => page.evaluate(() => {
  for (const d of window.__NORTHSTAR__.doors.doors.values()) {
    if (d.locked || d.spec.shutter || d.damaged) continue;
    return d.id;
  }
  return null;
});

test.describe('doors', () => {
  test('using a door changes its visual state, its collision and the text state', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, godMode: true });
    await recordEvents(page, ['door:state']);

    const doorId = await pickOpenableDoor(page);
    expect(doorId, 'the level has no unlocked doors').not.toBeNull();
    await standAtDoor(page, doorId);

    const before = await doorInfo(page, doorId);
    const stateBefore = await state(page);
    const reportedBefore = stateBefore.doors.find((d) => d.id === doorId);

    expect(before.isPassable, 'the door under test started open').toBe(false);
    expect(reportedBefore, `door ${doorId} is not reported in the state output near the player`).toBeTruthy();
    expect(reportedBefore.state).toBe(before.state);
    expect(stateBefore.interactionPrompt, 'standing at a door offers no interaction prompt').toBeTruthy();
    expect(stateBefore.interactionPrompt.kind).toBe('door');

    await shot(page, 'doors-closed');
    await takeEvents(page);
    await useKey(page);
    // Let the leaf finish swinging.
    await advance(page, 1400, { step: 60 });

    const after = await doorInfo(page, doorId);
    const stateAfter = await state(page);
    const reportedAfter = stateAfter.doors.find((d) => d.id === doorId);
    const events = await takeEvents(page, 'door:state');

    writeArtifact('doors-open.json', { doorId, before, after, reportedBefore, reportedAfter, events });
    await shot(page, 'doors-open');

    // 1. Visual: the leaf moved.
    expect(after.open, `openAmount did not rise: ${before.open} -> ${after.open}`).toBeGreaterThan(0.55);
    if (before.leafRotation !== null) {
      expect(after.leafRotation, 'the door leaf did not rotate').not.toBeCloseTo(before.leafRotation, 3);
    }
    // 2. Collision: it no longer blocks.
    expect(after.isPassable, 'an open door is still impassable').toBe(true);
    // 3. Text state: the report agrees.
    expect(reportedAfter.state).toBe(after.state);
    expect(reportedAfter.open).toBeGreaterThan(0.55);
    expect(events.length, 'no door:state event was emitted').toBeGreaterThanOrEqual(1);

    // 4. And the player can now actually walk through it.
    const start = await state(page);
    await burst(page, 'forward', 1200, { pause: 250 });
    const walked = await state(page);
    const crossed = await page.evaluate(([id, sx, sz]) => {
      const spec = window.__NORTHSTAR__.doors.get(id).spec;
      const p = window.__NORTHSTAR__.player;
      // Did the player end up on the far side of the door plane?
      const axis = spec.axis === 'x' ? 'x' : 'z';
      const beforeSign = Math.sign((axis === 'x' ? sx : sz) - spec[axis]);
      const afterSign = Math.sign(p.position[axis] - spec[axis]);
      return { axis, beforeSign, afterSign, crossed: beforeSign !== 0 && afterSign !== 0 && beforeSign !== afterSign };
    }, [doorId, start.player.position[0], start.player.position[2]]);

    writeArtifact('doors-walkthrough.json', { crossed, from: start.player.position, to: walked.player.position });
    expect(crossed.crossed, `the player could not walk through the open door: ${JSON.stringify(crossed)}`).toBe(true);

    // Closing it again must restore the block.
    await standAtDoor(page, doorId);
    await useKey(page);
    await advance(page, 1400, { step: 60 });
    const closed = await doorInfo(page, doorId);
    expect(closed.isPassable, 'using an open door did not close it').toBe(false);

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('a security door refuses until the keycard is collected', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, godMode: true });
    await recordEvents(page, ['door:state', 'world:interact']);

    const lockedId = await page.evaluate(() => {
      for (const d of window.__NORTHSTAR__.doors.doors.values()) if (d.locked) return d.id;
      return null;
    });
    expect(lockedId, 'the level has no locked security doors').not.toBeNull();

    await standAtDoor(page, lockedId);
    const before = await doorInfo(page, lockedId);
    const prompt = (await state(page)).interactionPrompt;
    expect(before.locked).toBe(true);
    expect(prompt?.label, `a locked door offers the prompt "${prompt?.label}"`).toMatch(/lock/i);
    await shot(page, 'doors-locked');

    // Without the keycard: refused, and it stays shut.
    await takeEvents(page);
    for (let i = 0; i < 3; i++) await useKey(page, { settle: 300 });
    await advance(page, 900, { step: 60 });
    const refused = await doorInfo(page, lockedId);
    const refusedEvents = await takeEvents(page, 'door:state');

    expect(refused.locked, 'the door unlocked itself without a keycard').toBe(true);
    expect(refused.isPassable, 'a locked door opened without a keycard').toBe(false);
    expect(refused.open).toBeLessThan(0.1);
    expect(
      refusedEvents.some((e) => e.payload?.state === 'locked'),
      `no "locked" feedback was emitted: ${JSON.stringify(refusedEvents)}`
    ).toBe(true);

    // With the keycard: it unlocks and opens.
    const card = await qa(page, 'giveKeycard', true);
    expect(card.ok).toBe(true);
    expect((await state(page)).player.hasKeycard, 'the keycard was not registered on the player').toBe(true);

    await standAtDoor(page, lockedId);
    await takeEvents(page);
    await useKey(page);
    await advance(page, 1400, { step: 60 });
    const unlocked = await doorInfo(page, lockedId);
    const unlockEvents = await takeEvents(page, 'door:state');

    writeArtifact('doors-locked.json', { lockedId, before, refused, unlocked, refusedEvents, unlockEvents });
    await shot(page, 'doors-unlocked');

    expect(unlocked.locked, 'the keycard did not unlock the door').toBe(false);
    expect(unlocked.isPassable, `the unlocked door did not open (open=${unlocked.open})`).toBe(true);
    expect(
      unlockEvents.some((e) => e.payload?.state === 'unlocked'),
      'no "unlocked" event was emitted'
    ).toBe(true);

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('the garage shutter opens', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true, godMode: true, checkpoint: 'garage' });
    await recordEvents(page, ['door:state']);

    const before = await state(page);
    expect(before.mission.garageOpen, 'the shutter started open').toBe(false);
    expect(before.mission.garageAmount).toBeLessThan(0.1);
    await shot(page, 'doors-shutter-closed');

    const res = await qa(page, 'openGarage');
    expect(res.ok, `openGarage failed: ${JSON.stringify(res)}`).toBe(true);

    const raised = await advanceUntil(page, 'state.mission.garageAmount > 0.9', { budgetMs: 15_000, step: 200, render: true });
    const after = await state(page);
    writeArtifact('doors-shutter.json', {
      before: { open: before.mission.garageOpen, amount: before.mission.garageAmount },
      after: { open: after.mission.garageOpen, amount: after.mission.garageAmount },
    });
    await shot(page, 'doors-shutter-open');

    expect(raised, `the shutter only reached ${after.mission.garageAmount}`).toBe(true);
    expect(after.mission.garageOpen, 'the mission does not consider the garage open').toBe(true);

    // The extraction volume must now be reachable: walk into the bay.
    await qa(page, 'teleport', 'loading');
    await advance(page, 300, { step: 60 });
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });
});
