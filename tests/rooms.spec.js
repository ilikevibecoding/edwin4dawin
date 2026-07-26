import { test, expect } from '@playwright/test';
import {
  bootGame, advance, state, qa, shot, releaseAll, consoleReport,
  expectNoConsoleErrors, enterGameplay, writeArtifact, canvasMetrics,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 10 — every room, in production lighting.
//
// Teleports to all of `CHECKPOINTS`, screenshots each, checks the reported room
// matches the checkpoint's declared room, and measures the frame so an
// unreadably dark or blown-out space is a test failure rather than something a
// human has to notice. Console errors are checked cumulatively so a room that
// throws on first render is caught.
// ---------------------------------------------------------------------------

/** A frame this dark is unreadable no matter how moody the art direction is. */
const MIN_MEAN_LUMINANCE = 0.02;
/** Below this there is nothing to look at: no shapes, no readable geometry. */
const MIN_STD_DEV = 0.01;
const MIN_COLOURS = 32;

test.describe('rooms', () => {
  test('every checkpoint is reachable, correct and readable', async ({ page }) => {
    test.slow();
    await bootGame(page, { quality: 'medium', resolutionScale: 0.6 });
    await enterGameplay(page, { freezeAI: true, godMode: true });

    // Production lighting: the storm-daylight plan the game actually ships.
    const lit = await qa(page, 'setLighting', 'default');
    expect(lit.ok, `setLighting failed: ${JSON.stringify(lit)}`).toBe(true);
    await qa(page, 'freezeAI', true);

    const checkpoints = await qa(page, 'listCheckpoints');
    expect(checkpoints.length, 'no checkpoints are registered').toBeGreaterThan(20);

    const rows = [];
    const problems = [];
    let errorsSoFar = 0;

    for (const cp of checkpoints) {
      const jump = await qa(page, 'teleport', cp.name);
      expect(jump.ok, `teleport to ${cp.name} failed: ${JSON.stringify(jump)}`).toBe(true);
      // Two settling frames: lighting is a frame system and needs one pass.
      await advance(page, 240, { step: 60 });

      const s = await state(page);
      const info = await shot(page, `room-${cp.name}`);
      const m = info.metrics;

      const row = {
        checkpoint: cp.name,
        declaredRoom: cp.room,
        reportedRoom: s.player.room,
        roomName: s.player.roomName,
        floor: s.player.floor,
        position: s.player.position,
        meanLuminance: m.meanLuminance,
        stdDev: m.stdDev,
        contrast: m.contrast,
        crushedBlack: m.crushedBlackFraction,
        blownHighlights: m.blownHighlightFraction,
        distinctColours: m.distinctColours,
        drawCalls: s.performance.drawCalls,
        triangles: s.performance.triangles,
        screenshot: info.relative,
      };
      rows.push(row);

      if (s.player.room !== cp.room) {
        problems.push(`${cp.name}: declared room "${cp.room}" but the game reports "${s.player.room}"`);
      }
      if (m.meanLuminance < MIN_MEAN_LUMINANCE) {
        problems.push(`${cp.name}: mean luminance ${m.meanLuminance} is below the ${MIN_MEAN_LUMINANCE} floor — unreadably dark`);
      }
      if (m.stdDev < MIN_STD_DEV) {
        problems.push(`${cp.name}: luminance std dev ${m.stdDev} — the frame is flat`);
      }
      if (m.distinctColours < MIN_COLOURS) {
        problems.push(`${cp.name}: only ${m.distinctColours} distinct colours`);
      }
      if (m.crushedBlackFraction > 0.6) {
        problems.push(`${cp.name}: ${(m.crushedBlackFraction * 100).toFixed(0)}% of the frame is crushed to black`);
      }
      if (m.blownHighlightFraction > 0.35) {
        problems.push(`${cp.name}: ${(m.blownHighlightFraction * 100).toFixed(0)}% of the frame is blown out`);
      }

      // Console errors must not accumulate as rooms are visited.
      const report = consoleReport(page);
      const total = report.errors.length + report.pageErrors.length;
      if (total > errorsSoFar) {
        problems.push(`${cp.name}: ${total - errorsSoFar} new console error(s): ${JSON.stringify(report.errors.slice(errorsSoFar).concat(report.pageErrors.slice(0)).slice(0, 3))}`);
        errorsSoFar = total;
      }
    }

    // Rank the darkest and the flattest so the lead has an ordered worklist.
    const darkest = rows.slice().sort((a, b) => a.meanLuminance - b.meanLuminance).slice(0, 8);
    const flattest = rows.slice().sort((a, b) => a.stdDev - b.stdDev).slice(0, 8);
    writeArtifact('rooms.json', {
      thresholds: { MIN_MEAN_LUMINANCE, MIN_STD_DEV, MIN_COLOURS },
      count: rows.length, rows, darkest, flattest, problems,
    });

    expect(problems, `room audit found ${problems.length} problem(s):\n${problems.join('\n')}`).toEqual([]);
    await releaseAll(page);
    await expectNoConsoleErrors(page);
  });

  test('lighting scenarios all apply and change the image', async ({ page }) => {
    await bootGame(page, { quality: 'medium', resolutionScale: 0.6 });
    await enterGameplay(page, { freezeAI: true, godMode: true, checkpoint: 'lobby' });

    const scenarios = await qa(page, 'listLightingScenarios');
    expect(scenarios.length, 'no lighting scenarios are registered').toBeGreaterThan(2);

    const rows = [];
    for (const sc of scenarios) {
      const applied = await qa(page, 'setLighting', sc.name);
      expect(applied.ok, `setLighting(${sc.name}) failed: ${JSON.stringify(applied)}`).toBe(true);
      await advance(page, 240, { step: 60 });
      const info = await shot(page, `lighting-${sc.name}`);
      rows.push({ scenario: sc.name, ...info.metrics, screenshot: info.relative });
    }

    writeArtifact('rooms-lighting.json', rows);

    // Different scenarios must actually look different.
    const means = rows.map((r) => r.meanLuminance);
    expect(
      Math.max(...means) - Math.min(...means),
      `every lighting scenario produced the same exposure: ${JSON.stringify(means)}`
    ).toBeGreaterThan(0.01);
    // And none of them may be completely black.
    for (const r of rows) {
      expect(r.distinctColours, `the "${r.scenario}" scenario renders a blank frame`).toBeGreaterThan(MIN_COLOURS);
    }

    await qa(page, 'setLighting', 'default');
    await expectNoConsoleErrors(page);
  });
});
