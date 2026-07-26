// PW-01 boot integrity, deterministic-interface shape, PW-20 resize behaviour.
import { test, expect } from '@playwright/test';
import { boot, expectNoErrors } from './helpers/game.js';

test.describe('boot', () => {
  test('PW-01 boots to the title screen with a clean console', async ({ page }) => {
    const game = await boot(page);

    expect(await game.mode()).toBe('title');
    expect(await game.screenVisible('title')).toBe(true);
    expect(await game.screenVisible('boot')).toBe(false);
    await expect(page.locator('[data-action="start"]')).toBeVisible();
    await expectNoErrors(game, 'boot');

    // The map build (including the nav bake) has to stay inside the loading budget.
    const nav = await game.qa('navStats');
    expect(nav.nodes).toBeGreaterThan(1000);
    expect(nav.bakeMs).toBeLessThan(4000);
    console.log(`boot-to-title ${game.bootMs} ms; nav ${nav.nodes} nodes in ${nav.bakeMs} ms`);
  });

  test('PW-01 canvas holds a live WebGL2 context', async ({ page }) => {
    const game = await boot(page, { raf: true, render: 'always' });

    const gl = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      const ctx = canvas.getContext('webgl2');
      if (!ctx) return { ok: false };
      return {
        ok: true,
        lost: ctx.isContextLost(),
        version: ctx.getParameter(ctx.VERSION),
        drawingBuffer: [ctx.drawingBufferWidth, ctx.drawingBufferHeight],
      };
    });
    expect(gl.ok, 'canvas exposes a webgl2 context').toBe(true);
    expect(gl.lost).toBe(false);
    expect(gl.version).toContain('WebGL 2.0');
    expect(gl.drawingBuffer[0]).toBeGreaterThan(0);

    // Frames are actually being produced (RAF renders even while the sim is manually stepped).
    // Software rendering a 1080p frame can take a while on a contended box, hence the long wait.
    const frames0 = await game.probe(() => window.__game.engine.frameCount);
    await page.waitForFunction((f0) => window.__game.engine.frameCount > f0, frames0, { timeout: 30_000 });
    await expectNoErrors(game, 'webgl');
  });

  test('PW-01 render_game_to_text parses with the required top-level fields', async ({ page }) => {
    const game = await boot(page);

    const raw = await page.evaluate(() => window.render_game_to_text());
    expect(typeof raw).toBe('string');
    const menuState = JSON.parse(raw);
    expect(menuState).toMatchObject({ mode: 'title', testMode: true, pointerLocked: false });
    expect(typeof menuState.coords).toBe('string');
    expect(menuState.coords).toContain('1 unit = 1 m');
    expect(menuState.menu).toMatchObject({ screen: 'title', chosenDifficulty: 'operator' });
    expect(typeof menuState.simTime).toBe('number');

    // In-mission the snapshot must carry the full gameplay picture.
    await game.quickStart({ freezeAI: true });
    await game.adv(200);
    const s = await game.state();
    for (const key of ['coords', 'mode', 'map', 'difficulty', 'missionTimerSec', 'objectives',
      'player', 'hostages', 'enemies', 'enemiesRemaining', 'nearbyDoors', 'extraction']) {
      expect(s, `render_game_to_text().${key}`).toHaveProperty(key);
    }
    expect(s.mode).toBe('playing');
    expect(s.player.position).toHaveLength(3);
    expect(s.player.weapon).toMatchObject({ id: expect.any(String), magazine: expect.any(Number) });
    expect(s.hostages).toHaveLength(2);
    expect(s.enemiesRemaining).toBeGreaterThan(5);
    await expectNoErrors(game, 'text-state');
  });

  test('PW-20 canvas, camera and UI adapt to a viewport resize', async ({ page }) => {
    const game = await boot(page, { render: 'always' });

    /**
     * Resizes the viewport and hands the renderer its cue.
     *
     * Renderer.resize() is driven exclusively by the window 'resize' event, and Playwright changes
     * the viewport through CDP metric overrides, which update window.innerWidth and re-lay out the
     * page but never emit that event. Without the explicit dispatch the drawing buffer and the
     * camera aspect stay at their old values while the canvas is stretched to the new CSS size.
     * That gap is filed as NS-2 in docs/reports/wp-008.md, since the same staleness is reachable
     * in a real browser whenever a viewport change does not raise a window resize.
     */
    const resizeTo = async (width, height) => {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(([w, h]) => window.innerWidth === w && window.innerHeight === h,
        [width, height], { timeout: 15_000 });
      await page.evaluate(() => window.dispatchEvent(new Event('resize')));
      await page.waitForFunction(([w, h]) => window.__game.renderer.width === w && window.__game.renderer.height === h,
        [width, height], { timeout: 15_000 });
    };

    const wide = await game.renderInfo();
    expect(wide.css).toEqual([1920, 1080]);
    expect(wide.aspect).toBeCloseTo(1920 / 1080, 2);
    expect(wide.canvas[0]).toBe(Math.round(1920 * wide.pixelRatio));

    await resizeTo(1366, 768);
    const small = await game.renderInfo();
    expect(small.css, 'the canvas fills the smaller viewport').toEqual([1366, 768]);
    expect(small.aspect, 'the camera takes the new aspect ratio').toBeCloseTo(1366 / 768, 2);
    expect(small.canvas[0], 'the drawing buffer follows the CSS size')
      .toBe(Math.round(1366 * small.pixelRatio));
    expect(small.canvas[1]).toBe(Math.round(768 * small.pixelRatio));
    // Menu chrome must still be laid out inside the smaller viewport.
    const startBox = await page.locator('[data-action="start"]').boundingBox();
    expect(startBox.x).toBeGreaterThanOrEqual(0);
    expect(startBox.y + startBox.height).toBeLessThanOrEqual(768);

    await resizeTo(1920, 1080);
    const back = await game.renderInfo();
    expect(back.css).toEqual([1920, 1080]);
    expect(back.aspect).toBeCloseTo(1920 / 1080, 2);
    expect(back.canvas[0]).toBe(Math.round(1920 * back.pixelRatio));

    // The HUD survives a resize while playing, too.
    await game.quickStart({ freezeAI: true });
    await game.adv(120);
    await resizeTo(1280, 720);
    await game.adv(120);
    expect(await game.screenVisible('hud')).toBe(true);
    const playing = await game.renderInfo();
    expect(playing.aspect).toBeCloseTo(1280 / 720, 2);
    expect(playing.fov, 'the player camera keeps the configured field of view').toBeCloseTo(75, 0);
    await expectNoErrors(game, 'resize');
  });
});
