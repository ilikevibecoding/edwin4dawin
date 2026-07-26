// Phase 1 smoke: boot, menu flow, spawn, movement, doors, firing, state hook
// integrity, no console errors.
import { test, expect } from '@playwright/test';
import { watchErrors, filterRealErrors, bootToTitle, bootToGameplay, state, advance, shot, holdKey, teleport } from './helpers.js';

test('boots to title without console errors', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToTitle(page);
  await shot(page, 'smoke-title');
  const s = await state(page);
  expect(s.mode).toBe('title');
  expect(filterRealErrors(errors)).toEqual([]);
});

test('full menu flow reaches gameplay', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToTitle(page);
  await page.click('#btn-play');
  await page.click('[data-diff="operative"]');
  await page.click('#btn-diff-next');
  await page.click('#btn-brief-next');
  await page.click('[data-weapon="bdr15"]');
  await page.click('#btn-load-start');
  await page.waitForFunction(() => window.NSR.state === 'playing', null, { timeout: 30_000 });
  const s = await state(page);
  expect(s.mode).toBe('playing');
  expect(s.player.room).toBe('courtyard');
  expect(s.weapon.id).toBe('bdr15');
  expect(s.weapon.mag).toBe(30);
  await shot(page, 'smoke-spawn');
  expect(filterRealErrors(errors)).toEqual([]);
});

test('movement, collision and doors work', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToGameplay(page);
  // freeze AI so patrols don't open doors mid-test
  await page.evaluate(() => window.__qa.freezeAI(true));
  const s0 = await state(page);

  // walk forward (east, toward the entrance)
  await holdKey(page, 'w', 1500);
  const s1 = await state(page);
  expect(s1.player.pos[0]).toBeGreaterThan(s0.player.pos[0] + 2);

  // teleport in front of vestibule door, open it, walk through
  await teleport(page, 'courtyard');
  await page.evaluate(() => window.__qa.place(-40.2, 0, 0, -Math.PI / 2));
  await advance(page, 100);
  let st = await state(page);
  const entry = st.doors.find((d) => d.id === 'd_entry');
  expect(entry).toBeTruthy();
  expect(entry.state).toBe('closed');

  // walk into the door - should be blocked
  await holdKey(page, 'w', 900);
  st = await state(page);
  expect(st.player.pos[0]).toBeLessThan(-38.2);

  // interact to open
  await page.keyboard.press('e');
  await advance(page, 900);
  st = await state(page);
  expect(st.doors.find((d) => d.id === 'd_entry').state).toBe('open');
  await holdKey(page, 'w', 1600);
  st = await state(page);
  expect(st.player.room).toBe('vestibule');
  await shot(page, 'smoke-vestibule');
  expect(filterRealErrors(errors)).toEqual([]);
});

test('firing reduces ammo and reload restores it', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToGameplay(page);
  await teleport(page, 'lobby');
  await page.evaluate(() => window.__qa.freezeAI(true));

  let s = await state(page);
  const magBefore = s.weapon.mag;
  await page.mouse.down();
  await advance(page, 350);
  await page.mouse.up();
  await advance(page, 100);
  s = await state(page);
  expect(s.weapon.mag).toBeLessThan(magBefore);
  const magAfterFire = s.weapon.mag;

  await page.keyboard.press('r');
  await advance(page, 200);
  s = await state(page);
  expect(s.weapon.state).toBe('reload');
  await advance(page, 2600);
  s = await state(page);
  expect(s.weapon.state).toBe('idle');
  expect(s.weapon.mag).toBe(30);
  expect(s.weapon.reserve).toBeLessThan(90);
  await shot(page, 'smoke-fire');
  expect(filterRealErrors(errors)).toEqual([]);
});

test('render_game_to_text stays consistent with simulation', async ({ page }) => {
  await bootToGameplay(page);
  const a = await state(page);
  const t = await advance(page, 1000);
  const b = await state(page);
  expect(b.tick - a.tick).toBe(60);
  expect(b.simTimeSec).toBeCloseTo(a.simTimeSec + 1, 1);
  expect(b.mission.timerSec).toBeLessThanOrEqual(a.mission.timerSec);
});
