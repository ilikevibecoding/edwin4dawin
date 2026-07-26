import { test, expect } from '@playwright/test';
import {
  gotoGame, waitForLevel, enterGameplay, state, advance, capture,
  expectNoConsoleErrors, collectRuntimeErrors, writeReport, qa,
} from './helpers.js';

/**
 * Boot and baseline smoke.
 * Owner: Opus 4.
 */

test.describe('boot and baseline', () => {
  test('loads the title screen with no console errors', async ({ page }) => {
    await gotoGame(page);
    await expect(page.getByTestId('screen-title')).toBeVisible();
    await capture(page, 'flow', '01-title');
    expectNoConsoleErrors(page);
  });

  test('builds the level and reports a complete world', async ({ page }) => {
    await gotoGame(page);
    await waitForLevel(page);
    const report = await qa(page, 'report');
    writeReport('level-report', report);

    expect(report.level.shell.uncovered, 'every room rectangle must resolve').toEqual([]);
    expect(report.level.doors).toBeGreaterThan(25);
    expect(report.level.glass).toBeGreaterThan(60);
    expect(report.level.props).toBeGreaterThan(400);
    expect(report.nav.active).toBeGreaterThan(6000);
    expect(report.nav.roomsWithoutNav, 'every room must be navigable').toEqual([]);
    expect(report.manifest.warnings, 'no under-specified manifest entries').toBe(0);
    expect(report.manifest.total).toBeGreaterThan(300);
    expectNoConsoleErrors(page);
  });

  test('enters gameplay and reports a coherent state', async ({ page }) => {
    await gotoGame(page);
    await enterGameplay(page);
    const s = await state(page);

    expect(s.gameMode).toBe('playing');
    expect(s.schema).toBe('northstar-rescue/state@1');
    expect(s.coordinateSystem.unit).toBe('metre');
    expect(s.player.health).toBe(100);
    expect(s.player.alive).toBe(true);
    expect(s.weapon.activeWeapon).toBe('rifle.northwind');
    expect(s.weapon.magazine).toBe(30);
    expect(s.mission.state).toBe('active');
    expect(s.mission.hostages).toHaveLength(2);
    expect(s.mission.enemies.total).toBeGreaterThan(8);
    expect(s.victory).toBe(false);
    expect(s.defeat).toBe(false);

    await capture(page, 'flow', '02-spawn');
    const runtime = await collectRuntimeErrors(page);
    expect(runtime, `runtime errors:\n${runtime.join('\n')}`).toEqual([]);
    expectNoConsoleErrors(page);
  });

  test('advanceTime is deterministic', async ({ page }) => {
    await gotoGame(page);
    await enterGameplay(page);
    await qa(page, 'teleport', 'lobby');
    await advance(page, 500);
    const a = await state(page);
    await qa(page, 'resetMission');
    await qa(page, 'teleport', 'lobby');
    await advance(page, 500);
    const b = await state(page);
    expect(b.player.position).toEqual(a.player.position);
    expect(b.mission.enemies.alive).toBe(a.mission.enemies.alive);
  });
});
