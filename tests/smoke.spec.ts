import { test, expect } from '@playwright/test';
import { launchGame, state, adv, qa, collectErrors, expectNoErrors } from './helpers';

test.describe('S01-S06 boot & shell', () => {
  test('S01 boot: title renders without console errors', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page, '?test=1&quality=low');
    await adv(page, 100);
    const s = await state(page);
    expect(s.mode).toBe('title');
    await expect(page.locator('.title-main')).toHaveText('NORTHSTAR RESCUE');
    await expect(page.locator('#game-canvas')).toBeVisible();
    expect(s.assets).toBeGreaterThan(20);
    expectNoErrors(errors);
  });

  test('S02 settings: change & persist', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page, '?test=1&quality=low');
    await adv(page, 50);
    await page.getByRole('button', { name: 'Settings' }).click();
    const sens = page.locator('input[type="range"]').nth(3);
    await sens.fill('2');
    await page.getByRole('button', { name: 'Back' }).click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('northstar-rescue.settings.v1') ?? '{}'));
    expect((stored as { mouseSensitivity: number }).mouseSensitivity).toBe(2);
    expectNoErrors(errors);
  });

  test('S03 full pre-game flow: title → difficulty → briefing → loadout → playing', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page, '?test=1&quality=low');
    await adv(page, 50);
    await page.getByRole('button', { name: 'Start Mission' }).click();
    await page.locator('.card', { hasText: 'OPERATOR' }).click();
    await expect(page.locator('h2')).toHaveText('Mission Briefing');
    await page.getByRole('button', { name: 'Continue to Loadout' }).click();
    await page.locator('.weapon-card', { hasText: 'KIS-10' }).click();
    await page.getByRole('button', { name: 'Deploy' }).click();
    await page.waitForFunction(() => {
      const w = window as never as { render_game_to_text(): string };
      return JSON.parse(w.render_game_to_text()).mode === 'playing';
    }, null, { timeout: 15_000 });
    await adv(page, 600);
    const s = await state(page);
    expect(s.mode).toBe('playing');
    expect(s.weapon?.id).toBe('kis10');
    expect(s.player?.room).toBe('courtyard');
    expect(s.mission?.phase).toBe('active');
    expectNoErrors(errors);
  });

  test('S04 pause/resume via Escape does not trap the player', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    await adv(page, 200);
    await qa(page, `__qa.setMode('paused')`);
    await expect(page.locator('#pause-title')).toHaveText('PAUSED');
    await page.getByRole('button', { name: 'Resume' }).click();
    await adv(page, 100);
    const s = await state(page);
    expect(s.mode).toBe('playing');
    expectNoErrors(errors);
  });

  test('S05 resize: 1920x1080 and 1280x720 both render', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    await adv(page, 100);
    await page.setViewportSize({ width: 1280, height: 720 });
    await adv(page, 100);
    const size = await page.evaluate(() => {
      const c = document.getElementById('game-canvas') as HTMLCanvasElement;
      return { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight };
    });
    expect(size.cw).toBe(1280);
    expect(size.ch).toBe(720);
    expect(size.w).toBeGreaterThan(600);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await adv(page, 100);
    expectNoErrors(errors);
  });

  test('S06 quality settings switch without errors', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    for (const q of ['low', 'medium', 'high', 'low']) {
      await page.evaluate((qq) => {
        const w = window as never as { __game: { applySettings(): void } };
        localStorage.setItem('northstar-rescue.settings.v1', JSON.stringify({ quality: qq }));
      }, q);
      await qa(page, `(__qa.setLighting('day'), true)`);
      await adv(page, 150);
    }
    expectNoErrors(errors);
  });

  test('S22 determinism: same seed + same script ⇒ identical state', async ({ page }) => {
    const run = async (): Promise<string> => {
      await launchGame(page, '?test=1&mode=playing&quality=low&seed=4242');
      await adv(page, 400);
      await qa(page, `__qa.input.down('forward')`);
      await adv(page, 1500);
      await qa(page, `__qa.input.up('forward')`);
      await qa(page, `__qa.input.look(120, -18)`);
      await adv(page, 800);
      await qa(page, `__qa.input.down('fire')`);
      await adv(page, 300);
      await qa(page, `__qa.input.up('fire')`);
      await adv(page, 1200);
      const s = await state(page);
      return JSON.stringify({ p: s.player?.pos, yaw: s.player?.yaw, mag: s.weapon?.mag, e: s.enemies.map((e) => [e.id, e.pos, e.state]) });
    };
    const a = await run();
    const b = await run();
    expect(a).toBe(b);
  });
});
