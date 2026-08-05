import { test, expect } from '@playwright/test';
import { bootGame, renderFrames, advance, getState, counts, expectNoErrors } from './helpers.js';

test.describe('boot and world', () => {
  test('boots cleanly and renders the site', async ({ page }) => {
    const h = await bootGame(page);
    await renderFrames(page, 10);

    const c = await counts(page);
    expect(c.drawCalls, 'renderer should be drawing the site').toBeGreaterThan(10);
    expect(c.triangles, 'site should contain real geometry').toBeGreaterThan(100_000);

    const s = await getState(page);
    expect(s.phase).toBe('STANDBY');
    expect(s.batteries).toHaveLength(3);
    expect(s.batteries.map((b) => b.id)).toEqual(['patriot', 'thaad', 'sentinel']);

    expectNoErrors(h);
  });

  test('all three time-of-day presets apply', async ({ page }) => {
    const h = await bootGame(page);
    for (const sky of ['day', 'sunset', 'night']) {
      await page.evaluate((s) => window.__GAME.setSky(s), sky);
      await advance(page, 2.0);
      const s = await getState(page);
      expect(s.sky).toBe(sky);
    }
    expectNoErrors(h);
  });

  test('player collides with the world instead of walking through it', async ({ page }) => {
    const h = await bootGame(page);
    // Drop the player right next to the command shelter's north wall and walk
    // into it; the capsule must not end up on the far side.
    const before = await page.evaluate(() => {
      window.__GAME.teleport(-8, 42, Math.PI);
      return window.__GAME.state().player;
    });
    expect(before.z).toBeGreaterThan(38);

    await page.evaluate(() => {
      // Simulate holding W for a while by nudging the player forward.
      const g = window.__gameInstance;
      g.player.keys.add('KeyW');
    });
    await advance(page, 6);
    await page.evaluate(() => window.__gameInstance.player.keys.delete('KeyW'));

    const after = await getState(page);
    // The shelter's south wall sits at z ~= 38.5; the player must be stopped
    // short of it rather than ending up inside or beyond the building.
    expect(after.player.z).toBeGreaterThan(38.0);
    expectNoErrors(h);
  });

  test('console mode toggles and exposes the holo radar', async ({ page }) => {
    const h = await bootGame(page);
    await page.evaluate(() => window.__GAME.enterConsole());
    await advance(page, 1.5);
    expect((await getState(page)).mode).toBe('CONSOLE');
    await expect(page.locator('#console-ui')).toBeVisible();
    await expect(page.locator('#console-bottom [data-act="begin"]')).toBeVisible();

    await page.evaluate(() => window.__GAME.exitConsole());
    await advance(page, 1.5);
    expect((await getState(page)).mode).toBe('FREE');
    expectNoErrors(h);
  });
});
