import { test, expect } from '@playwright/test';
import {
  bootGame, advance, state, qa, shot, expectNoConsoleErrors, expectStateSchema,
  expectCanvasHasContent, consoleReport, enterGameplay, burst, releaseAll,
  writeArtifact,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 1 — boot integrity.
//
// Proves: the page loads clean, every module resolves, the renderer produces a
// real image, `render_game_to_text()` honours its documented schema, and
// `advanceTime` is deterministic (identical inputs from an identical reset
// produce an identical digest).
// ---------------------------------------------------------------------------

test.describe('boot', () => {
  test('loads with no console errors and no failed requests', async ({ page }) => {
    await bootGame(page);

    const s = await state(page);
    expect(s.levelReady).toBe(true);

    const report = consoleReport(page);
    writeArtifact('boot-console.json', report);
    await shot(page, 'boot-title');

    // Warnings are surfaced but not failed on; errors and 4xx/5xx are fatal.
    expect(report.failedRequests, `failed requests:\n${report.failedRequests.map((r) => r.text).join('\n')}`)
      .toEqual([]);
    await expectNoConsoleErrors(page);
  });

  test('the canvas renders non-trivial pixel content', async ({ page }) => {
    await bootGame(page);
    // The title screen renders the real level behind a scrim, so even here the
    // frame must be a real image rather than the clear colour.
    const title = await expectCanvasHasContent(page, { label: 'title' });
    expect(title.drawingBuffer[0]).toBeGreaterThan(320);

    await enterGameplay(page, { freezeAI: true });
    const play = await expectCanvasHasContent(page, { label: 'gameplay', minColours: 64, minStdDev: 0.02 });
    const info = await shot(page, 'boot-gameplay');

    writeArtifact('boot-pixels.json', { title, gameplay: play, screenshot: info.relative });
    // A frame that is entirely crushed to black is a rendering failure, not a
    // stylistic choice.
    expect(play.crushedBlackFraction, 'the gameplay frame is almost entirely black').toBeLessThan(0.9);
    await expectNoConsoleErrors(page);
  });

  test('render_game_to_text() matches the documented schema', async ({ page }) => {
    await bootGame(page);
    const menu = await state(page);
    expectStateSchema(menu);
    expect(menu.coordinateSystem.handedness).toBe('right-handed');
    expect(menu.coordinateSystem.axes).toContain('+X east');
    expect(menu.coordinateSystem.yaw).toContain('0 faces -Z');

    await enterGameplay(page, { freezeAI: true });
    const s = await state(page);

    // Every documented top-level block must be present in gameplay.
    for (const key of [
      'player', 'weapon', 'mission', 'hostages', 'enemies', 'doors',
      'interactables', 'hud', 'performance',
    ]) {
      expect(s[key], `state is missing the "${key}" block`).toBeDefined();
    }

    expect(s.player.position).toHaveLength(3);
    expect(s.player.orientation.yawRadians).toEqual(expect.any(Number));
    expect(s.player.health).toBeGreaterThan(0);
    expect(typeof s.player.room === 'string' || s.player.room === null).toBe(true);
    expect(s.weapon.magazineAmmo).toEqual(expect.any(Number));
    expect(s.weapon.magazineSize).toBeGreaterThan(0);
    expect(Array.isArray(s.mission.objectives ?? [])).toBe(true);
    expect(s.hostages.count).toBeGreaterThan(0);
    expect(s.enemies.count).toBeGreaterThan(0);
    expect(s.performance.resolution[0]).toBeGreaterThan(0);
    expect(s.consoleErrors, 'the game recorded window.onerror events').toBe(0);

    writeArtifact('boot-state.json', s);
    await shot(page, 'boot-state');
    await expectNoConsoleErrors(page);
  });

  test('advanceTime is deterministic: identical inputs give identical digests', async ({ page }) => {
    await bootGame(page);

    // A fixed, repeatable input script. No damage and no wall-clock waits, so
    // the only thing that can vary between runs is the simulation itself.
    const run = async () => {
      await qa(page, 'forcePlay', { difficulty: 'operator', loadout: { primary: 'carbine', secondary: 'pistol', gadget: 'flash' } });
      await qa(page, 'freezeAI', true);
      await qa(page, 'teleport', 'lobby');
      await advance(page, 500, { step: 50, render: false });
      await burst(page, 'forward', 400, { pause: 200, render: false });
      await burst(page, 'right', 240, { pause: 200, render: false });
      await page.evaluate(() => window.__NORTHSTAR__.input.applyLookDelta(220, -60));
      await advance(page, 200, { step: 50, render: false });
      await page.evaluate(() => window.__NORTHSTAR__.input.tapAction('attack'));
      await advance(page, 600, { step: 50, render: false });
      await releaseAll(page);
      await advance(page, 300, { step: 50, render: false });
      return qa(page, 'screenshotState');
    };

    const first = await run();
    const second = await run();

    writeArtifact('boot-determinism.json', { first, second });
    expect(first.digest, 'two identical input scripts produced different digests').toBe(second.digest);
    // Guard against the digest being trivially constant.
    expect(first.player.pos).not.toEqual([0, 0, 0]);
    expect(first.weapon.slots.length).toBeGreaterThan(0);

    await expectNoConsoleErrors(page);
  });
});
