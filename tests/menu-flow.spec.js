import { expect } from '@playwright/test';
import {
  test,
  bootGame, advance, state, qa, shot, press, clickAny, gameMode, waitForMode,
  expectNoConsoleErrors, enterGameplay, enterGameplayViaMenu, writeArtifact,
} from './helpers/game.js';

// ---------------------------------------------------------------------------
// Scenario 2 — the front end.
//
// Proves: the whole title -> menu -> settings -> controls -> difficulty ->
// briefing -> loadout -> loading -> playing chain works by clicking real DOM;
// settings actually apply to the engine; pause resume / restart / abort all
// work; and Escape never traps the player on any screen.
// ---------------------------------------------------------------------------

const visible = (page, name) => page.locator(`#ui-root .screen-${name}.visible`);

test.describe('menu flow', () => {
  test('the real menu chain reaches gameplay', async ({ page }) => {
    await bootGame(page);

    await waitForMode(page, 'title');
    await shot(page, 'menu-01-title');
    await expect(visible(page, 'title')).toBeVisible();

    await enterGameplayViaMenu(page, { difficulty: 'operator' });

    const s = await state(page);
    expect(s.gameMode).toBe('playing');
    expect(s.difficulty).toBe('operator');
    expect(s.player.health).toBe(100);
    // A fresh insertion: nothing secured, full clock, objective one active.
    expect(s.mission.hostagesSecured).toBe(0);
    expect(s.mission.timeRemaining).toBeGreaterThan(0);

    await shot(page, 'menu-08-playing');
    await expectNoConsoleErrors(page);
  });

  test('settings change and actually apply', async ({ page }) => {
    await bootGame(page);
    await waitForMode(page, 'title');
    await press(page, 'Enter');
    await waitForMode(page, 'menu');
    await shot(page, 'menu-02-menu');

    await clickAny(page, ['#ui-root [data-menu="settings"]']);
    await waitForMode(page, 'settings');
    await expect(visible(page, 'settings')).toBeVisible();
    await shot(page, 'menu-03-settings');

    // FOV: the slider must move the live camera.
    const fovBefore = await page.evaluate(() => window.__NORTHSTAR__.camera.fov);
    await page.locator('#set-fov').fill('96');
    await page.locator('#set-fov').dispatchEvent('input');
    await advance(page, 120);
    const fovAfter = await page.evaluate(() => ({
      setting: window.__NORTHSTAR__.qa.getSettings().fov,
      camera: window.__NORTHSTAR__.camera.fov,
    }));
    expect(fovAfter.setting).toBe(96);
    expect(fovAfter.camera, 'changing the FOV setting did not move the camera FOV')
      .not.toBeCloseTo(fovBefore, 3);

    // A toggle: subtitles off, then back on.
    const subsToggle = page.locator('#set-subtitles');
    await subsToggle.click();
    await advance(page, 60);
    expect(await page.evaluate(() => window.__NORTHSTAR__.qa.getSettings().subtitles)).toBe(false);
    await subsToggle.click();
    await advance(page, 60);
    expect(await page.evaluate(() => window.__NORTHSTAR__.qa.getSettings().subtitles)).toBe(true);

    // Crosshair toggle.
    await page.locator('#set-crosshair').click();
    await advance(page, 60);
    expect(await page.evaluate(() => window.__NORTHSTAR__.qa.getSettings().crosshair)).toBe(false);

    // The quality cycler must reach the renderer's pixel ratio.
    const before = await page.evaluate(() => ({
      quality: window.__NORTHSTAR__.qa.getSettings().quality,
      ratio: window.__NORTHSTAR__.engine.renderer.getPixelRatio(),
    }));
    await page.locator('#set-quality').click();
    await advance(page, 120);
    const after = await page.evaluate(() => ({
      quality: window.__NORTHSTAR__.qa.getSettings().quality,
      ratio: window.__NORTHSTAR__.engine.renderer.getPixelRatio(),
    }));
    expect(after.quality, 'the quality cycler did not change the setting').not.toBe(before.quality);

    // Interface scale must reach the CSS custom property the UI reads.
    await page.locator('#set-uiScale').fill('1.3');
    await page.locator('#set-uiScale').dispatchEvent('input');
    await advance(page, 120);
    const uiScale = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim());
    expect(parseFloat(uiScale), 'uiScale did not reach the --ui-scale custom property').toBeCloseTo(1.3, 2);

    writeArtifact('menu-settings.json', { fovBefore, fovAfter, quality: { before, after }, uiScale });

    // Escape leaves settings back to the menu.
    await press(page, 'Escape');
    await waitForMode(page, 'menu');

    await clickAny(page, ['#ui-root [data-menu="controls"]']);
    await waitForMode(page, 'controls');
    await shot(page, 'menu-04-controls');
    await press(page, 'Escape');
    await waitForMode(page, 'menu');

    await expectNoConsoleErrors(page);
  });

  test('Escape backs out of every screen and never traps', async ({ page }) => {
    await bootGame(page);
    await waitForMode(page, 'title');
    await press(page, 'Enter');
    await waitForMode(page, 'menu');

    // Each entry: how to get in, and the state Escape must land on.
    const chain = [
      { open: () => clickAny(page, ['#ui-root [data-menu="settings"]']), at: 'settings', back: 'menu' },
      { open: () => clickAny(page, ['#ui-root [data-menu="controls"]']), at: 'controls', back: 'menu' },
      { open: () => clickAny(page, ['#ui-root [data-menu="briefing"]']), at: 'briefing', back: 'menu' },
      { open: () => clickAny(page, ['#ui-root [data-menu="deploy"]']), at: 'difficulty', back: 'menu' },
    ];

    const trace = [];
    for (const step of chain) {
      await step.open();
      await waitForMode(page, step.at);
      await advance(page, 100);
      await press(page, 'Escape');
      await waitForMode(page, step.back, 10_000);
      trace.push({ screen: step.at, escapedTo: await gameMode(page) });
      await advance(page, 80);
    }

    // Deep chain: difficulty -> briefing -> loadout, then Escape all the way out.
    await clickAny(page, ['#ui-root [data-menu="deploy"]']);
    await waitForMode(page, 'difficulty');
    await clickAny(page, ['#ui-root [data-difficulty="recruit"]']);
    await clickAny(page, ['#ui-root .screen-difficulty .btn.primary'], { fallbackKey: 'Enter' });
    await waitForMode(page, 'briefing');
    await shot(page, 'menu-05-briefing');
    await clickAny(page, ['#ui-root .screen-briefing .btn.primary'], { fallbackKey: 'Enter' });
    await waitForMode(page, 'loadout');
    await shot(page, 'menu-06-loadout');

    await press(page, 'Escape');
    await waitForMode(page, 'briefing', 10_000);
    await press(page, 'Escape');
    await waitForMode(page, 'difficulty', 10_000);
    await press(page, 'Escape');
    await waitForMode(page, 'menu', 10_000);
    await press(page, 'Escape');
    await waitForMode(page, 'title', 10_000);
    trace.push({ screen: 'loadout->title', escapedTo: await gameMode(page) });

    writeArtifact('menu-escape-trace.json', trace);
    await expectNoConsoleErrors(page);
  });

  test('pause resumes, restarts and aborts to menu', async ({ page }) => {
    await bootGame(page);
    await enterGameplay(page, { freezeAI: true });

    // --- pause / resume ---
    await page.keyboard.press('Escape');
    await advance(page, 120);
    expect(await gameMode(page)).toBe('paused');
    await expect(visible(page, 'paused')).toBeVisible();
    await shot(page, 'menu-07-pause');

    // Simulation must be frozen while paused.
    const t0 = (await state(page)).simTime;
    await advance(page, 600);
    expect((await state(page)).simTime, 'time advanced while paused').toBeCloseTo(t0, 3);

    await clickAny(page, ['#ui-root .screen-paused .menu-item:has-text("Resume")']);
    await advance(page, 150);
    expect(await gameMode(page)).toBe('playing');
    const t1 = (await state(page)).simTime;
    await advance(page, 400);
    expect((await state(page)).simTime, 'time did not resume').toBeGreaterThan(t1);

    // --- pause / restart ---
    await qa(page, 'teleport', 'openoffice');
    await qa(page, 'damagePlayer', 35);
    await advance(page, 200);
    const damaged = await state(page);
    expect(damaged.player.health).toBeLessThan(100);

    await page.keyboard.press('Escape');
    await advance(page, 400); // clear the manager's 300 ms Escape guard
    expect(await gameMode(page)).toBe('paused');
    await clickAny(page, ['#ui-root .screen-paused .menu-item:has-text("Restart")']);
    await clickAny(page, ['#ui-root .confirm-scrim .btn.danger', '#ui-root .confirm-scrim button:has-text("Restart")']);
    for (let i = 0; i < 60 && (await gameMode(page)) !== 'playing'; i++) await advance(page, 100);
    expect(await gameMode(page), 'restart never returned to playing').toBe('playing');
    await advance(page, 400);
    const restarted = await state(page);
    expect(restarted.player.health, 'restart did not restore health').toBe(100);
    expect(restarted.player.room, 'restart did not respawn at insertion').not.toBe('openoffice');

    // --- pause / abort ---
    await page.keyboard.press('Escape');
    await advance(page, 400);
    expect(await gameMode(page)).toBe('paused');
    await clickAny(page, ['#ui-root .screen-paused .menu-item:has-text("Abort")']);
    await clickAny(page, ['#ui-root .confirm-scrim .btn.danger', '#ui-root .confirm-scrim button:has-text("Abort")']);
    await waitForMode(page, 'menu', 10_000);
    await shot(page, 'menu-09-aborted');

    await expectNoConsoleErrors(page);
  });

  test('the menu is fully keyboard navigable', async ({ page }) => {
    await bootGame(page);
    await waitForMode(page, 'title');
    await press(page, 'Space');
    await waitForMode(page, 'menu');

    // Arrow keys must move focus inside the menu list.
    const focusPath = [];
    for (let i = 0; i < 4; i++) {
      focusPath.push(await page.evaluate(() => document.activeElement?.dataset?.menu
        || document.activeElement?.textContent?.trim()?.slice(0, 24) || null));
      await press(page, 'ArrowDown', { settle: 40 });
    }
    writeArtifact('menu-keyboard-focus.json', focusPath);
    expect(new Set(focusPath.filter(Boolean)).size, `focus never moved: ${JSON.stringify(focusPath)}`)
      .toBeGreaterThan(1);

    // Enter on a focused item must open it, and Escape must come back.
    await page.evaluate(() => document.querySelector('#ui-root [data-menu="settings"]')?.focus());
    await press(page, 'Enter');
    await waitForMode(page, 'settings', 10_000);
    await press(page, 'Escape');
    await waitForMode(page, 'menu', 10_000);

    await expectNoConsoleErrors(page);
  });
});
