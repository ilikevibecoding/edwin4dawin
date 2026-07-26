// PW-02 menu flow, settings persistence, Esc navigation, pause menu.
import { test, expect } from '@playwright/test';
import { boot, expectNoErrors, setSetting, readSettings } from './helpers/game.js';

test.describe('menus', () => {
  test('PW-02 title -> difficulty -> briefing -> loadout -> loading -> playing', async ({ page }) => {
    const game = await boot(page);

    await game.click('start');
    await expect(page.locator('#screen-difficulty')).toHaveClass(/visible/);

    await game.click('difficulty-operator');
    await expect(page.locator('#screen-briefing')).toHaveClass(/visible/);
    expect(await game.probe(() => window.__game.chosen.difficulty)).toBe('operator');

    await game.click('to-loadout');
    await expect(page.locator('#screen-loadout')).toHaveClass(/visible/);

    await game.click('select-vanta-s12');
    expect(await game.probe(() => window.__game.chosen.loadout.primary)).toBe('vanta-s12');
    await expect(page.locator('[data-action="select-vanta-s12"]')).toHaveClass(/selected/);

    await game.click('deploy');
    await page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 30_000 });
    expect(await game.screenVisible('hud')).toBe(true);

    await game.adv(200);
    const s = await game.state();
    expect(s.mode).toBe('playing');
    expect(s.difficulty).toBe('operator');
    expect(s.player.weapon.id).toBe('vanta-s12');
    expect(s.missionTimerSec).toBeGreaterThan(0);
    expect(s.objectives[0]).toMatchObject({ id: 'infiltrate', state: 'active' });
    await expectNoErrors(game, 'menu-flow');
  });

  test('PW-02 settings changes apply and survive a reload', async ({ page }) => {
    const game = await boot(page);

    await game.click('settings');
    await expect(page.locator('#screen-settings')).toHaveClass(/visible/);

    await setSetting(page, 'sensitivity', 2.1);
    await setSetting(page, 'invertY', true);
    await setSetting(page, 'fov', 90);

    const stored = await readSettings(page);
    expect(stored.sensitivity).toBeCloseTo(2.1, 5);
    expect(stored.invertY).toBe(true);
    expect(stored.fov).toBe(90);
    // FOV is applied to the live camera immediately. Read without drawing a frame: rendering the
    // title screen runs the cinematic camera, which pins the FOV to its own 58°.
    expect(await game.probe(() => window.__game.renderer.camera.fov)).toBeCloseTo(90, 1);

    await game.click('back');
    await expect(page.locator('#screen-title')).toHaveClass(/visible/);

    // Reload keeps the same origin, so the persisted settings must come back.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 90_000 });
    const reloaded = await readSettings(page);
    expect(reloaded.sensitivity).toBeCloseTo(2.1, 5);
    expect(reloaded.invertY).toBe(true);
    expect(reloaded.fov).toBe(90);
    await game.click('settings');
    expect(await page.locator('[data-setting="sensitivity"]').inputValue()).toBe('2.1');
    expect(await page.locator('[data-setting="invertY"]').isChecked()).toBe(true);
    await expectNoErrors(game, 'settings-persist');
  });

  test('PW-02 Esc navigates back through the menu chain', async ({ page }) => {
    const game = await boot(page);

    await game.click('start');
    await game.click('difficulty-recruit');
    await game.click('to-loadout');
    expect(await game.mode()).toBe('loadout');

    await page.keyboard.press('Escape');
    expect(await game.mode()).toBe('briefing');
    await page.keyboard.press('Escape');
    expect(await game.mode()).toBe('difficulty');
    await page.keyboard.press('Escape');
    expect(await game.mode()).toBe('title');

    // Settings opened from the title returns to the title.
    await game.click('settings');
    expect(await game.mode()).toBe('settings');
    await page.keyboard.press('Escape');
    expect(await game.mode()).toBe('title');
    await expectNoErrors(game, 'esc-nav');
  });

  test('PW-16 pause menu: P pauses, settings from pause returns to pause, resume restores', async ({ page }) => {
    const game = await boot(page);
    await game.quickStart({ freezeAI: true });
    await game.adv(300);

    await page.keyboard.press('KeyP');
    expect(await game.mode()).toBe('paused');
    expect(await game.screenVisible('paused')).toBe(true);
    expect(await game.screenVisible('hud')).toBe(false);

    await game.click('settings');
    expect(await game.mode()).toBe('settings');
    await game.click('back');
    expect(await game.mode()).toBe('paused');

    await game.click('resume');
    expect(await game.mode()).toBe('playing');
    expect(await game.screenVisible('hud')).toBe(true);

    // Esc also toggles pause in automation mode (no pointer lock to lose).
    await page.keyboard.press('Escape');
    expect(await game.mode()).toBe('paused');
    await page.keyboard.press('Escape');
    expect(await game.mode()).toBe('playing');
    await expectNoErrors(game, 'pause-menu');
  });

  test('PW-17 restart from the pause menu resets the mission clock', async ({ page }) => {
    const game = await boot(page);
    await game.quickStart({ freezeAI: true, god: true });
    await game.adv(6000);
    const before = await game.state();
    expect(before.missionTimerSec).toBeGreaterThan(5);

    await page.keyboard.press('KeyP');
    expect(await game.mode()).toBe('paused');
    await game.click('restart');
    await page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 30_000 });

    await game.adv(120);
    const after = await game.state();
    expect(after.missionTimerSec).toBeLessThan(1);
    expect(after.player.weapon.magazine).toBe(before.player.weapon.magazine);
    expect(after.objectives[0]).toMatchObject({ id: 'infiltrate', state: 'active' });
    await expectNoErrors(game, 'pause-restart');
  });

  test('PW-02 loadout selection is reflected in the deployed mission', async ({ page }) => {
    const game = await boot(page);
    await game.deployViaMenus({ difficulty: 'veteran', primary: 'meridian-lr8' });
    await game.adv(200);
    const s = await game.state();
    expect(s.difficulty).toBe('veteran');
    expect(s.player.weapon.id).toBe('meridian-lr8');
    // Sidearm, blade and both devices always come along.
    const slots = await game.probe(() => Object.keys(window.__game.mission.player.arsenal.slots).map(Number).sort());
    expect(slots).toEqual([1, 2, 3, 4, 5]);
    await expectNoErrors(game, 'loadout');
  });
});
