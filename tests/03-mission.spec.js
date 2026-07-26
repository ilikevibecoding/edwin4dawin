import { test, expect } from '@playwright/test';
import { watchErrors, gotoGame, state, adv, startMission, qa } from './helpers.js';

async function escortStage(page, checkpoint, ms) {
  await page.evaluate((c) => window.__qa.teleport(c), checkpoint);
  await adv(page, ms);
}

test('S40-S42: full rescue + extraction = victory', async ({ page }) => {
  const errors = watchErrors(page);
  await gotoGame(page);
  await startMission(page);
  await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.god(true); });

  // hostage A
  await escortStage(page, 'conference', 600);
  let s = await state(page);
  expect(s.hostages.find((h) => h.id === 'voss').found).toBe(true); // discovery by proximity+LOS
  await qa(page, `qa.freeHostage('voss')`);
  await adv(page, 300);
  s = await state(page);
  expect(s.hostages.find((h) => h.id === 'voss').state).toBe('following');
  await escortStage(page, 'exec_corridor', 3500);
  await escortStage(page, 'stairwell_top', 4500);
  await escortStage(page, 'garage', 9000);
  await escortStage(page, 'extraction', 6000);
  s = await state(page);
  expect(s.hostages.find((h) => h.id === 'voss').state).toBe('extracted');

  // hostage B
  await escortStage(page, 'archive', 600);
  await qa(page, `qa.freeHostage('reid')`);
  await escortStage(page, 'east_hall', 3500);
  await escortStage(page, 'stairwell_top', 4500);
  await escortStage(page, 'garage', 9000);
  await escortStage(page, 'extraction', 8000);
  s = await state(page);
  expect(s.hostages.find((h) => h.id === 'reid').state).toBe('extracted');
  expect(s.mission.phase).toBe('extract');

  await adv(page, 4000);
  s = await state(page);
  expect(s.mode).toBe('victory');
  await expect(page.locator('#screen-victory')).toBeVisible();
  expect(errors).toEqual([]);
});

test('S43: timer expiry defeats', async ({ page }) => {
  const errors = watchErrors(page);
  await gotoGame(page);
  await startMission(page);
  await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.god(true); });
  // fast-forward past the 12-minute clock in 30s chunks
  for (let i = 0; i < 26; i++) {
    await adv(page, 30_000);
    const s = await state(page);
    if (s.mode === 'defeat') break;
  }
  const s = await state(page);
  expect(s.mode).toBe('defeat');
  expect(errors).toEqual([]);
});

test('S45: shooting a hostage fails the mission', async ({ page }) => {
  const errors = watchErrors(page);
  await gotoGame(page);
  await startMission(page);
  await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.god(true); window.__qa.teleport('conference'); });
  await adv(page, 900);
  const s0 = await state(page);
  const voss = s0.hostages.find((h) => h.id === 'voss');
  await page.evaluate((h) => window.__qa.lookAt(h.position[0], h.position[1] + 0.9, h.position[2]), voss);
  await adv(page, 100);
  await page.evaluate(() => { window.__qa.mouse(0, true); window.advanceTime(150); window.__qa.mouse(0, false); });
  await adv(page, 3000);
  const s = await state(page);
  expect(s.mode).toBe('defeat');
  expect(errors).toEqual([]);
});

test('S31: gunshot noise draws investigation', async ({ page }) => {
  const errors = watchErrors(page);
  await gotoGame(page);
  await startMission(page);
  await page.evaluate(() => { window.__qa.god(true); window.__qa.teleport('north_corridor'); window.__qa.lookYawPitch(270, 0); });
  await adv(page, 900);
  // fire once: corridor marksman or others should leave patrol
  await page.evaluate(() => { window.__qa.mouse(0, true); window.advanceTime(120); window.__qa.mouse(0, false); });
  await adv(page, 2500);
  const s = await state(page);
  const investigating = s.enemies.nearby.filter((e) => ['investigate', 'search', 'combat', 'suspect'].includes(e.state));
  expect(investigating.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
