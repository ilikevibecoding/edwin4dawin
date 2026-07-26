/**
 * Boot and world-integrity baseline. Owner: Opus 4.
 */
import { expect, test } from '@playwright/test';
import { boot } from './helpers/game';

test('boots to the title screen with a WebGL2 context and no console errors', async ({ page }, testInfo) => {
  const h = await boot(page, testInfo);
  await h.shot('01-title-screen');

  const gl = await page.evaluate(() => {
    const c = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = c.getContext('webgl2');
    return { ok: !!ctx, w: c.width, h: c.height };
  });
  expect(gl.ok).toBe(true);
  expect(gl.w).toBeGreaterThan(100);

  await expect(page.locator('#screen-title.active')).toBeVisible();
  const s = await h.state();
  expect(s.schema).toBe('northstar-rescue/1');
  expect(s.mode).toBe('title');
  h.expectNoErrors();
});

test('world geometry builds with collision brushes and a bounded triangle count', async ({ page }, testInfo) => {
  const h = await boot(page, testInfo);
  const stats = (await h.qa('stats')) as { drawCalls: number; triangles: number; brushes: number };
  expect(stats.brushes).toBeGreaterThan(400);
  h.expectNoErrors();
});
