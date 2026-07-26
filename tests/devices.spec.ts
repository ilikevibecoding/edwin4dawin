import { test, expect } from '@playwright/test';
import { launchGame, state, adv, qa, collectErrors, expectNoErrors, teleport } from './helpers';

test.describe('S24-S25 tactical devices', () => {
  test('S24 flash device: throw, detonation stuns exposed enemies', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    await teleport(page, 'lobby');
    await qa(page, `__qa.freezeAI(false)`);
    // put an enemy in the open in front of the player
    await qa(page, `__qa.teleportEnemy('enemy-0', [19, 0, 9])`);
    await qa(page, `__qa.aimAt(19, 1.2, 9)`);
    // select flash (slot 4) and throw
    await qa(page, `__qa.input.down('slot4')`);
    await adv(page, 80);
    await qa(page, `__qa.input.up('slot4')`);
    await adv(page, 700);
    expect((await state(page)).weapon!.id).toBe('flash');
    await qa(page, `__qa.input.down('fire')`);
    await adv(page, 120);
    await qa(page, `__qa.input.up('fire')`);
    await adv(page, 2400); // fuse 1.7s + margin
    const s = await state(page);
    const e0 = s.enemies.find((e) => e.id === 'enemy-0') as { stunned?: boolean; state: string };
    expect(e0.stunned).toBe(true);
    expectNoErrors(errors);
  });

  test('S25 smoke device: deploys a vision-blocking volume', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    await teleport(page, 'lobby');
    await qa(page, `__qa.input.down('slot5')`);
    await adv(page, 80);
    await qa(page, `__qa.input.up('slot5')`);
    await adv(page, 700);
    await qa(page, `__qa.input.down('fire')`);
    await adv(page, 120);
    await qa(page, `__qa.input.up('fire')`);
    await adv(page, 2500);
    const blockers = await page.evaluate(() => (window as never as { __game: { fx: { visionBlockers: unknown[] } } }).__game.fx.visionBlockers.length);
    expect(blockers).toBeGreaterThan(0);
    // auto-switched back to primary after last device
    expect((await state(page)).weapon!.id).toBe('vc7');
    expectNoErrors(errors);
  });
});
