import { expect } from '@playwright/test';
import {
  test,
  bootGame, advance, state, qa, shot, hold, release, useKey, holdUse,
  releaseAll, expectNoConsoleErrors, enterGameplay, writeArtifact,
  recordEvents, takeEvents, advanceUntil, distance2d,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 8 — hostages.
//
// The core loop of the mission. Proves: holding E frees a hostage (with a
// progress meter that drains if you let go), the state / HUD / objective all
// move together, a freed hostage follows and can be told to hold, both reach
// extraction, and losing one fails the objective.
// ---------------------------------------------------------------------------

const HOSTAGES = {
  'hostage-a': { checkpoint: 'conference', objective: 'secure-hostage-a' },
  'hostage-b': { checkpoint: 'execoffice', objective: 'secure-hostage-b' },
};

/** Stand within arm's reach of a hostage, looking at their chest. */
async function standAtHostage(page, id, { distance = 1.5 } = {}) {
  const placed = await page.evaluate(([wanted, d]) => {
    const g = window.__NORTHSTAR__;
    const h = g.hostages.list.find((x) => x.id === wanted);
    if (!h) return { ok: false, reason: 'no-hostage', wanted };
    const p = g.player;
    // Approach from whichever side has room; +X then -X then +Z then -Z.
    const offsets = [[d, 0], [-d, 0], [0, d], [0, -d]];
    let best = null;
    for (const [ox, oz] of offsets) {
      const test = { x: h.position.x + ox, y: h.position.y, z: h.position.z + oz };
      const blocked = g.collision.overlapsCapsule(
        { x: test.x, y: test.y, z: test.z }, p.radius, p.height
      );
      if (!blocked) { best = test; break; }
      if (!best) best = test;
    }
    p.position.set(best.x, best.y, best.z);
    p.velocity.set(0, 0, 0);
    const dx = h.position.x - p.position.x;
    const dz = h.position.z - p.position.z;
    p.yaw = Math.atan2(-dx, -dz);
    // Look slightly down at a kneeling hostage.
    const dy = (h.position.y + 0.85) - p.eyePosition.y;
    p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    g.collision.resolveOverlap(p.position, p.radius, p.height);
    p.updateCamera(0);
    return {
      ok: true, id: wanted,
      hostage: [+h.position.x.toFixed(2), +h.position.y.toFixed(2), +h.position.z.toFixed(2)],
      player: [+p.position.x.toFixed(2), +p.position.y.toFixed(2), +p.position.z.toFixed(2)],
    };
  }, [id, distance]);
  expect(placed.ok, `could not stand at ${id}: ${JSON.stringify(placed)}`).toBe(true);
  await advance(page, 250);
  return placed;
}

const hostage = async (page, id) => {
  const s = await state(page);
  return { s, h: s.hostages.list.find((x) => x.id === id) };
};

const objective = (s, id) => s.mission.objectives.find((o) => o.id === id);

test.describe('hostages', () => {
  test('holding E frees a hostage and moves state, HUD and objective together', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await qa(page, 'freezeAI', true);
    await recordEvents(page, ['hostage:state', 'objective:update']);

    // The chain has to be at "locate hostage A" for securing her to matter.
    const jump = await qa(page, 'jumpToObjective', 'secure-hostage-a');
    expect(jump.ok, `jumpToObjective failed: ${JSON.stringify(jump)}`).toBe(true);
    await advance(page, 400);
    await qa(page, 'freezeAI', false);

    await standAtHostage(page, 'hostage-a');
    const before = await hostage(page, 'hostage-a');
    expect(before.h.state, 'the hostage did not start bound').toBe('bound');
    expect(before.h.secured).toBe(false);

    const prompt = before.s.interactionPrompt;
    expect(prompt, 'no interaction prompt while looking at a bound hostage').toBeTruthy();
    expect(prompt.kind).toBe('hostage');
    await shot(page, 'hostages-bound');

    // --- the hold meter must fill, and drain when released ---
    await hold(page, 'use');
    await advance(page, 700);
    const midway = await hostage(page, 'hostage-a');
    expect(midway.h.secureProgress, 'the secure meter did not start filling').toBeGreaterThan(0.15);
    expect(midway.h.state, 'a partly-freed hostage is not in the securing state').toBe('securing');
    await shot(page, 'hostages-securing');

    await release(page, 'use');
    await advance(page, 900);
    const abandoned = await hostage(page, 'hostage-a');
    expect(abandoned.h.secureProgress, 'the meter did not drain after letting go').toBeLessThan(midway.h.secureProgress);
    expect(abandoned.h.secured, 'a partial hold freed the hostage').toBe(false);

    // --- a full hold frees her ---
    await takeEvents(page);
    await standAtHostage(page, 'hostage-a');
    await holdUse(page, 2400);
    await advance(page, 400);

    const after = await hostage(page, 'hostage-a');
    const events = await takeEvents(page, ['hostage:state', 'objective:update']);

    writeArtifact('hostages-secure.json', {
      before: before.h, midway: midway.h, abandoned: abandoned.h, after: after.h,
      objectiveBefore: objective(before.s, 'secure-hostage-a'),
      objectiveAfter: objective(after.s, 'secure-hostage-a'),
      hudBefore: before.s.hud.hostages, hudAfter: after.s.hud.hostages,
      events,
    });
    await shot(page, 'hostages-secured');

    // 1. Entity state.
    expect(after.h.secured, `the hostage was not freed after a 2.4 s hold (state "${after.h.state}")`).toBe(true);
    expect(['secured', 'following', 'waiting']).toContain(after.h.state);
    // 2. Mission counter.
    expect(after.s.mission.hostagesSecured, 'the mission secured count did not increase')
      .toBe(before.s.mission.hostagesSecured + 1);
    expect(after.s.hostages.secured).toBe(1);
    // 3. Objective.
    const obj = objective(after.s, 'secure-hostage-a');
    expect(obj.state, `the secure objective is still "${obj.state}"`).toBe('done');
    // 4. HUD.
    expect(after.s.hud.hostages, 'the HUD does not list hostages').toBeTruthy();
    expect(JSON.stringify(after.s.hud.hostages)).not.toBe(JSON.stringify(before.s.hud.hostages));
    // 5. Events.
    expect(events.some((e) => e.type === 'hostage:state'), 'no hostage:state event').toBe(true);

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('a freed hostage follows, and can be told to hold', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await qa(page, 'freezeAI', true);
    await qa(page, 'jumpToObjective', 'secure-hostage-a');
    await advance(page, 400);

    const secured = await qa(page, 'secureHostage', 'hostage-a');
    expect(secured.ok, `secureHostage failed: ${JSON.stringify(secured)}`).toBe(true);
    await qa(page, 'freezeAI', false);
    await advance(page, 500);

    // Order her to follow.
    await standAtHostage(page, 'hostage-a');
    const promptState = await state(page);
    expect(promptState.interactionPrompt?.kind, 'a freed hostage offers no order prompt').toBe('hostage');
    await useKey(page, { settle: 400 });
    await advance(page, 600);

    let following = (await hostage(page, 'hostage-a')).h;
    if (!following.following) {
      // Some builds toggle on the second press; try once more before failing.
      await useKey(page, { settle: 400 });
      await advance(page, 600);
      following = (await hostage(page, 'hostage-a')).h;
    }
    expect(following.following, `the hostage did not start following (state "${following.state}")`).toBe(true);
    await shot(page, 'hostages-following');

    // Walk away; she must close the distance rather than stay put.
    const startPos = following.position;
    await qa(page, 'teleport', 'openoffice');
    await advance(page, 300);
    const gapStart = (await hostage(page, 'hostage-a')).h.distance;

    await advance(page, 15_000, { render: false });
    const moved = (await hostage(page, 'hostage-a')).h;
    const travelled = distance2d(moved.position, startPos);

    writeArtifact('hostages-follow.json', {
      startPos, endPos: moved.position, travelled: +travelled.toFixed(2),
      gapStart, gapEnd: moved.distance, state: moved.state,
    });
    expect(travelled, `the following hostage never moved (${travelled.toFixed(2)} m)`).toBeGreaterThan(1.5);
    expect(moved.distance, `the hostage did not close the gap: ${gapStart} -> ${moved.distance}`)
      .toBeLessThan(gapStart);

    // Tell her to hold: she must stop following and stay behind.
    await standAtHostage(page, 'hostage-a');
    await useKey(page, { settle: 400 });
    await advance(page, 600);
    const held = (await hostage(page, 'hostage-a')).h;
    expect(held.following, 'the follow order could not be cancelled').toBe(false);
    expect(held.state).toBe('waiting');

    const heldPos = held.position;
    await qa(page, 'teleport', 'lobby');
    await advance(page, 8000, { render: false });
    const stayed = (await hostage(page, 'hostage-a')).h;
    expect(
      distance2d(stayed.position, heldPos),
      'a hostage told to hold followed anyway'
    ).toBeLessThan(2.5);

    await shot(page, 'hostages-holding');
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('both hostages reach extraction', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await recordEvents(page, ['hostage:state', 'objective:update']);

    const jump = await qa(page, 'jumpToObjective', 'escort-hostages');
    expect(jump.ok, `jumpToObjective failed: ${JSON.stringify(jump)}`).toBe(true);
    await advance(page, 600);

    const staged = await state(page);
    expect(staged.mission.hostagesSecured, 'jumping to the escort objective did not secure both hostages').toBe(2);
    expect(staged.mission.garageOpen, 'the escort objective requires an open garage').toBe(true);
    await shot(page, 'hostages-escorting');

    const extract = await qa(page, 'extractHostages');
    expect(extract.ok, `extractHostages failed: ${JSON.stringify(extract)}`).toBe(true);

    const done = await advanceUntil(page, 'state.hostages.extracted >= 2', { budgetMs: 40_000, step: 250, render: false });
    const after = await state(page);
    const events = await takeEvents(page, ['hostage:state', 'objective:update']);

    writeArtifact('hostages-extraction.json', {
      hostages: after.hostages.list.map((h) => ({ id: h.id, state: h.state, extracted: h.extracted, inExtraction: h.inExtraction })),
      mission: {
        extracted: after.mission.hostagesExtracted,
        lost: after.mission.hostagesLost,
        extraction: after.mission.extraction,
      },
      events: events.slice(0, 20),
    });
    await shot(page, 'hostages-extracted');

    expect(done, `only ${after.hostages.extracted}/2 hostages extracted`).toBe(true);
    expect(after.mission.hostagesExtracted).toBe(2);
    expect(after.mission.hostagesLost, 'a hostage was lost during extraction').toBe(0);
    expect(after.hostages.list.every((h) => h.state === 'extracted'), 'not every hostage reached the extracted state').toBe(true);

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('a dead hostage fails the objective and the mission', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { godMode: true });
    await qa(page, 'freezeAI', true);
    await recordEvents(page, ['hostage:state', 'objective:update', 'mission:end']);
    await advance(page, 400);

    const before = await state(page);
    expect(before.mission.hostagesLost).toBe(0);
    expect(before.outcome).toBeNull();

    // Kill one outright.
    await page.evaluate(() => {
      const g = window.__NORTHSTAR__;
      const h = g.hostages.list.find((x) => x.alive);
      h.applyDamage(500, { region: 'chest', byPlayer: true, kind: 'bullet' });
    });
    await advance(page, 3000);

    const after = await state(page);
    const events = await takeEvents(page, ['hostage:state', 'objective:update', 'mission:end']);

    writeArtifact('hostages-lost.json', {
      hostages: after.hostages.list.map((h) => ({ id: h.id, state: h.state, alive: h.alive, health: h.health })),
      mission: { lost: after.mission.hostagesLost, outcome: after.outcome, reason: after.mission.reason },
      objectives: after.mission.objectives.map((o) => [o.id, o.state]),
      events,
    });
    await shot(page, 'hostages-lost');

    const dead = after.hostages.list.find((h) => !h.alive);
    expect(dead, 'the hostage did not die from 500 damage').toBeTruthy();
    expect(dead.state).toBe('dead');
    expect(after.mission.hostagesLost, 'the mission did not count the loss').toBeGreaterThanOrEqual(1);

    // Losing a hostage must fail their objective and end the mission in defeat.
    const failed = after.mission.objectives.filter((o) => o.state === 'failed');
    expect(
      failed.length,
      `no objective was failed after losing a hostage: ${JSON.stringify(after.mission.objectives.map((o) => [o.id, o.state]))}`
    ).toBeGreaterThanOrEqual(1);
    expect(after.outcome, 'losing a hostage did not end the mission').toBe('defeat');
    expect(after.mission.reason).toBe('hostageDead');

    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });
});
