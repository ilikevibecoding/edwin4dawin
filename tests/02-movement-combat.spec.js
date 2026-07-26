import { test, expect } from '@playwright/test';
import { watchErrors, gotoGame, state, adv, startMission, hold, tap, fire, qa } from './helpers.js';

test('S10/S11: movement, collision, crouch', async ({ page }) => {
  const errors = watchErrors(page);
  await gotoGame(page);
  await startMission(page);
  await page.evaluate(() => window.__qa.freezeAI(true));
  const s0 = await state(page);
  await hold(page, 'KeyW', 1000);
  const s1 = await state(page);
  const moved = Math.hypot(s1.player.position[0] - s0.player.position[0], s1.player.position[2] - s0.player.position[2]);
  expect(moved).toBeGreaterThan(2.5);
  // run into the planter wall — collision must stop the player inside plaza bounds
  await page.evaluate(() => window.__qa.lookYawPitch(90, 0)); // face west
  await hold(page, 'KeyW', 3000);
  const s2 = await state(page);
  expect(s2.player.position[0]).toBeGreaterThan(21.5); // stopped by planter at x≈22
  // crouch
  await page.evaluate(() => window.__qa.press('ControlLeft', true));
  await adv(page, 500);
  const s3 = await state(page);
  expect(s3.player.crouching).toBe(true);
  await page.evaluate(() => window.__qa.press('ControlLeft', false));
  expect(errors).toEqual([]);
});

test('S12: stair traversal to basement', async ({ page }) => {
  const errors = watchErrors(page);
  await gotoGame(page);
  await startMission(page);
  await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.god(true); window.__qa.teleport('stairwell_top'); window.__qa.lookYawPitch(0, 0); });
  await adv(page, 200);
  await hold(page, 'KeyW', 2600);
  const s = await state(page);
  expect(s.player.position[1]).toBeLessThan(-3.4);
  expect(['b_finger', 'b_stair_c', 'stairwell']).toContain(s.player.room);
  expect(errors).toEqual([]);
});

test('S13: door open/close/locked chain', async ({ page }) => {
  const errors = watchErrors(page);
  await gotoGame(page);
  await startMission(page);
  await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.teleport('vestibule'); window.__qa.lookYawPitch(0, 0); });
  await adv(page, 300);
  let s = await state(page);
  const door = s.doorsNearby.find((d) => d.id === 'd_vest_lobby');
  expect(door.state).toBe('closed');
  await tap(page, 'KeyE');
  await adv(page, 1200);
  s = await state(page);
  expect(s.doorsNearby.find((d) => d.id === 'd_vest_lobby').state).toBe('open');
  await tap(page, 'KeyE');
  await adv(page, 1400);
  s = await state(page);
  expect(s.doorsNearby.find((d) => d.id === 'd_vest_lobby').state).toBe('closed');
  // locked server door refuses, keycard unlocks
  const locked = await qa(page, `qa.doorById('d_it_server')`);
  expect(locked.locked).toBe(true);
  await qa(page, `qa.openDoor('d_it_server')`);
  await adv(page, 800);
  expect((await qa(page, `qa.doorById('d_it_server')`)).state).toBe('closed');
  await qa(page, `qa.unlockDoor('d_it_server')`);
  await qa(page, `qa.openDoor('d_it_server')`);
  await adv(page, 1200);
  expect((await qa(page, `qa.doorById('d_it_server')`)).state).toBe('open');
  expect(errors).toEqual([]);
});

test('S20/S21: firing reduces ammo & damages enemy; reload restores', async ({ page }) => {
  const errors = watchErrors(page);
  await gotoGame(page);
  await startMission(page);
  await page.evaluate(() => {
    const qa = window.__qa;
    qa.freezeAI(true); qa.god(true); qa.teleport('cubicles');
    qa.spawnEnemy('trooper', 29, 18);
    window.advanceTime(900); // finish draw
  });
  let s = await state(page);
  const target = s.enemies.nearby.find((e) => e.id.startsWith('qa_'));
  expect(target).toBeTruthy();
  await page.evaluate((t) => window.__qa.lookAt(t.position[0], t.position[1] + 1.2, t.position[2]), target);
  await adv(page, 100);
  const magBefore = (await state(page)).weapon.mag;
  await fire(page, 300);
  await adv(page, 300);
  s = await state(page);
  expect(s.weapon.mag).toBeLessThan(magBefore);
  const after = s.enemies.nearby.find((e) => e.id === target.id);
  expect(!after || after.health < 100).toBe(true); // damaged or dead
  // reload
  await tap(page, 'KeyR');
  await adv(page, 2600);
  s = await state(page);
  expect(s.weapon.mag).toBe(30);
  expect(s.weapon.reserve).toBeLessThan(90);
  expect(errors).toEqual([]);
});

test('S22: weapon switching', async ({ page }) => {
  const errors = watchErrors(page);
  await gotoGame(page);
  await startMission(page);
  await page.evaluate(() => window.__qa.freezeAI(true));
  await tap(page, 'Digit2');
  await adv(page, 600);
  expect((await state(page)).weapon.id).toBe('vireo');
  await tap(page, 'Digit3');
  await adv(page, 500);
  expect((await state(page)).weapon.id).toBe('talon');
  await tap(page, 'Digit1');
  await adv(page, 800);
  expect((await state(page)).weapon.id).toBe('ridgeline');
  expect(errors).toEqual([]);
});

test('S24: enemy fire hurts player; death defeats', async ({ page }) => {
  const errors = watchErrors(page);
  await gotoGame(page);
  await startMission(page, { difficulty: 'nightwatch' });
  await page.evaluate(() => { window.__qa.teleport('lobby'); });
  await adv(page, 8000);
  let s = await state(page);
  expect(s.player.health).toBeLessThan(100);
  if (s.player.alive) {
    await adv(page, 15000);
    s = await state(page);
  }
  expect(s.player.alive).toBe(false);
  await adv(page, 3000);
  s = await state(page);
  expect(s.mode).toBe('defeat');
  expect(errors).toEqual([]);
});
