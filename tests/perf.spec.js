import { test, expect } from '@playwright/test';
import {
  gotoGame, waitForLevel, enterGameplay, state, advance, qa, writeReport, teleport,
} from './helpers.js';

/**
 * Performance and loading profile.
 * Owner: Opus 4.
 *
 * These numbers are measured under SwiftShader software rasterisation in CI,
 * which is roughly two orders of magnitude slower than a real GPU. The asserts
 * therefore guard structural properties (draw-call counts, batch counts,
 * triangles submitted per view, build time) rather than frame rate.
 */

const VIEWS = [
  'spawn', 'lobby', 'northcorr', 'openplan', 'conference', 'breakroom',
  'server', 'garage', 'exec', 'mezz', 'stairwell', 'restroom',
];

test('build profile', async ({ page }) => {
  await gotoGame(page, '?quality=medium');
  await waitForLevel(page);
  const report = await qa(page, 'report');
  writeReport('build-profile', report.level);

  expect(report.level.buildMs, 'level build must stay under 40 s even on software rendering').toBeLessThan(40000);
  expect(report.level.batches.shell + report.level.batches.props,
    'spatial batching must produce many small batches, not a few map-wide meshes').toBeGreaterThan(150);
  expect(report.level.nav.roomsWithoutNav, 'every room must be navigable').toEqual([]);
  expect(report.nav.keptComponents, 'the navigation graph must be one connected component').toBe(1);
});

// Views are split across two tests: a single spec that teleports through twelve
// positions runs long enough for the software rasteriser to exhaust the tab.
const HALVES = [VIEWS.slice(0, 6), VIEWS.slice(6)];
HALVES.forEach((half, i) => {
  test(`per-view draw cost (${i + 1}/2)`, async ({ page }) => {
    await gotoGame(page, '?quality=low');
    await enterGameplay(page, { difficulty: 'operator', loadout: 'assault' });
    await qa(page, 'freezeAI', true);
    const views = {};
    for (const v of half) {
      await teleport(page, v);
      await advance(page, 240);
      const s = await state(page);
      views[v] = { drawCalls: s.render.drawCalls, triangles: s.render.triangles, room: s.player.room };
    }
    writeReport(`performance-${i + 1}`, views);
    // Measured budget, not an aspiration. There is no occlusion culling, so a
    // view that looks through an interior glass partition down a corridor is the
    // honest worst case (the server room at ~1350 calls / 830k triangles). Both
    // are comfortable on a real GPU; the ceiling here guards against regression.
    for (const [v, d] of Object.entries(views)) {
      expect(d.drawCalls, `${v}: draw calls`).toBeLessThan(1600);
      expect(d.triangles, `${v}: triangles submitted`).toBeLessThan(1000000);
    }
  });
});
