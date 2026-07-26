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

test('build profile and per-view draw cost', async ({ page }) => {
  await gotoGame(page, '?quality=medium');
  await waitForLevel(page);
  const report = await qa(page, 'report');
  const profile = { build: report.level, views: {} };

  expect(report.level.buildMs, 'level build must stay under 40 s even on software rendering').toBeLessThan(40000);
  expect(report.level.batches.shell + report.level.batches.props,
    'spatial batching must produce many small batches, not a few map-wide meshes').toBeGreaterThan(150);

  await enterGameplay(page, { difficulty: 'operator', loadout: 'assault' });
  for (const v of VIEWS) {
    await teleport(page, v);
    await advance(page, 260);
    const s = await state(page);
    profile.views[v] = {
      drawCalls: s.render.drawCalls,
      triangles: s.render.triangles,
      room: s.player.room,
    };
  }
  profile.sceneObjects = await page.evaluate(() => window.__northstar.game.engine.sceneObjectCount());
  writeReport('performance', profile);
  for (const [v, d] of Object.entries(profile.views)) {
    expect(d.drawCalls, `${v}: draw calls`).toBeLessThan(900);
    expect(d.triangles, `${v}: triangles submitted`).toBeLessThan(1200000);
  }
});
