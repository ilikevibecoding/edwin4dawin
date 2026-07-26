import { test, expect } from '@playwright/test';
import { watchErrors, gotoGame, state, adv, startMission, tap } from './helpers.js';

test('S01: title loads with zero console errors', async ({ page }) => {
  const errors = watchErrors(page);
  await gotoGame(page);
  await expect(page.locator('#screen-title')).toBeVisible();
  await expect(page.locator('h1.game-title')).toContainText('NORTHSTAR');
  const s = await state(page);
  expect(s.mode).toBe('title');
  expect(errors).toEqual([]);
});

test('S02: full menu flow reaches gameplay', async ({ page }) => {
  const errors = watchErrors(page);
  await gotoGame(page);
  await page.click('text=New Operation');
  await expect(page.locator('#screen-difficulty')).toBeVisible();
  await page.click('.card[data-id="recruit"]');
  await page.click('text=Continue');
  await expect(page.locator('#screen-briefing')).toBeVisible();
  await page.click('text=Continue to Loadout');
  await expect(page.locator('#screen-loadout')).toBeVisible();
  await page.click('.card[data-id="kestrel"]');
  await page.click('text=Begin Mission');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'playing', null, { timeout: 60_000 });
  const s = await state(page);
  expect(s.player.room).toBe('plaza');
  expect(s.weapon.id).toBe('kestrel');
  expect(s.mission.timerSec).toBeGreaterThan(880); // recruit: 15 min
  expect(errors).toEqual([]);
});

test('S04: pause and resume', async ({ page }) => {
  const errors = watchErrors(page);
  await gotoGame(page);
  await startMission(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-paused')).toBeVisible();
  let s = await state(page);
  expect(s.mode).toBe('paused');
  const t1 = s.mission.timerSec;
  await adv(page, 2000); // paused: timer must not advance
  s = await state(page);
  expect(s.mission.timerSec).toBe(t1);
  await page.click('text=Resume');
  s = await state(page);
  expect(s.mode).toBe('playing');
  expect(errors).toEqual([]);
});

test('S05: restart resets mission state cleanly', async ({ page }) => {
  const errors = watchErrors(page);
  await gotoGame(page);
  await startMission(page);
  // dirty the state: fire rounds, break glass, kill an enemy, take a pickup
  await page.evaluate(() => {
    const qa = window.__qa;
    qa.freezeAI(true); qa.god(true);
    qa.teleport('lobby'); qa.lookAt(26, 1.7, 30);
    window.advanceTime(900);
    qa.mouse(0, true); window.advanceTime(600); qa.mouse(0, false);
    qa.killEnemies();
    window.advanceTime(200);
  });
  let s = await state(page);
  expect(s.weapon.mag).toBeLessThan(30);
  expect(s.enemies.alive).toBe(0);
  expect(s.glassBroken).toBeGreaterThan(0);
  await page.evaluate(() => window.__qa.resetMission());
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'playing', null, { timeout: 60_000 });
  await adv(page, 200);
  s = await state(page);
  expect(s.weapon.mag).toBe(30);
  expect(s.enemies.alive).toBe(11);
  expect(s.glassBroken).toBe(0);
  expect(s.player.health).toBe(100);
  expect(s.mission.phase).toBe('infiltrate');
  expect(s.player.room).toBe('plaza');
  expect(errors).toEqual([]);
});
