import { test, expect } from '@playwright/test';
import { boot, advance, snapshot, shot } from './helpers.js';

/**
 * First-person controls, collision and accessibility.
 *
 * Movement is driven through the same key state the real input handler writes,
 * so these exercise the actual controller rather than a test-only path.
 */

async function hold(page, codes, seconds) {
  await page.evaluate((c) => c.forEach((k) => window.__GAME.pressKey(k, true)), codes);
  const snap = await advance(page, seconds);
  await page.evaluate((c) => c.forEach((k) => window.__GAME.pressKey(k, false)), codes);
  return snap;
}

test.describe('first-person controls', () => {
  test('walks, sprints and respects eye height', async ({ page }) => {
    await boot(page);
    const start = await page.evaluate(() => window.__GAME.playerPos());

    const walked = await hold(page, ['KeyW'], 2);
    const afterWalk = walked.player;
    const walkDist = Math.hypot(afterWalk.x - start.x, afterWalk.z - start.z);
    expect(walkDist, 'walked forward').toBeGreaterThan(4);
    expect(walkDist, 'walk speed is bounded').toBeLessThan(12);

    // Sprint must cover noticeably more ground in the same time.
    await page.evaluate(() => window.__GAME.teleport(7, 40, 0.05));
    const sprinted = await hold(page, ['KeyW', 'ShiftLeft'], 2);
    const sprintDist = Math.hypot(sprinted.player.x - 7, sprinted.player.z - 40);
    expect(sprintDist, 'sprint is faster than a walk').toBeGreaterThan(walkDist * 1.4);

    // Eye height stays at the configured 1.7 m above whatever we stand on.
    const eye = await page.evaluate(() => ({
      cam: window.__AEGIS.camera.position.y,
      ground: window.__AEGIS.player.groundY,
    }));
    expect(eye.cam - eye.ground).toBeGreaterThan(1.6);
    expect(eye.cam - eye.ground).toBeLessThan(1.85);
  });

  test('capsule collision blocks structures and steps onto pads', async ({ page }) => {
    await boot(page);
    expect(await page.evaluate(() => window.__GAME.colliderCount()))
      .toBeGreaterThan(80);

    // Walk hard into the command shelter's back wall from outside.
    await page.evaluate(() => window.__GAME.teleport(-22, 30, 0.0));
    await page.evaluate(() => window.__AEGIS.player.pitch = 0);
    const before = await page.evaluate(() => window.__GAME.playerPos());
    const after = (await hold(page, ['KeyW', 'ShiftLeft'], 4)).player;
    // The shelter front face sits at roughly z = 22; we must be stopped short.
    expect(after.z, 'stopped by the shelter wall').toBeGreaterThan(21.0);
    expect(before.z - after.z, 'actually moved toward it').toBeGreaterThan(3);

    // Walking onto a concrete pad raises the support height rather than
    // blocking: kerbs and slabs are steppable.
    await page.evaluate(() => window.__GAME.teleport(4, 40, 0.0));
    const onPad = (await hold(page, ['KeyW'], 3)).player;
    expect(onPad.y, 'stepped up onto the apron slab').toBeGreaterThan(0.15);
  });

  test('cannot walk through a launcher', async ({ page }) => {
    await boot(page);
    // Approach the high-altitude battery head-on from the north.
    await page.evaluate(() => window.__GAME.teleport(66, -30, 0.0));
    const after = (await hold(page, ['KeyW', 'ShiftLeft'], 5)).player;
    const dist = Math.hypot(after.x - 66, after.z + 46);
    expect(dist, 'stopped outside the launcher hull').toBeGreaterThan(1.6);
  });

  test('reduced motion removes head bob', async ({ page }) => {
    await boot(page);
    // Sample camera height while walking with bob enabled.
    const sample = async () => {
      const ys = [];
      await page.evaluate(() => window.__GAME.pressKey('KeyW', true));
      for (let i = 0; i < 24; i++) {
        await advance(page, 1 / 30);
        ys.push(await page.evaluate(
          () => window.__AEGIS.camera.position.y - window.__AEGIS.player.groundY,
        ));
      }
      await page.evaluate(() => window.__GAME.pressKey('KeyW', false));
      return Math.max(...ys) - Math.min(...ys);
    };

    await page.evaluate(() => window.__GAME.teleport(7, 44, 0.05));
    const bobRange = await sample();
    await page.evaluate(() => window.__GAME.setReducedMotion(true));
    await page.evaluate(() => window.__GAME.teleport(7, 44, 0.05));
    const flatRange = await sample();

    expect(bobRange, 'head bob is present by default').toBeGreaterThan(0.01);
    expect(flatRange, 'reduced motion flattens it').toBeLessThan(bobRange * 0.35);
  });

  test('reduced motion damps camera shake', async ({ page }) => {
    await boot(page);
    const shakeUnder = async (reduced) => {
      await page.evaluate((r) => {
        window.__GAME.setReducedMotion(r);
        window.__GAME.teleport(7, 40, 0.05);
        window.__AEGIS.player.shake = 1.5;
      }, reduced);
      const ys = [];
      for (let i = 0; i < 20; i++) {
        await advance(page, 1 / 60);
        ys.push(await page.evaluate(() => window.__AEGIS.camera.position.y));
      }
      return Math.max(...ys) - Math.min(...ys);
    };
    const full = await shakeUnder(false);
    const damped = await shakeUnder(true);
    expect(damped).toBeLessThan(full * 0.5);
  });

  test('console mode freezes movement and releases on exit', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.__GAME.openConsole());
    const before = await page.evaluate(() => window.__GAME.playerPos());
    const during = (await hold(page, ['KeyW'], 1.5)).player;
    expect(Math.hypot(during.x - before.x, during.z - before.z),
      'movement is frozen at the console').toBeLessThan(0.05);

    await page.evaluate(() => window.__GAME.closeConsole());
    const after = (await hold(page, ['KeyW'], 1.5)).player;
    expect(Math.hypot(after.x - before.x, after.z - before.z),
      'movement resumes on exit').toBeGreaterThan(2);
  });

  test('console proximity prompt appears at the shelter desk', async ({ page }) => {
    await boot(page);
    let snap = await snapshot(page);
    expect(snap.nearConsole).toBe(false);
    await page.evaluate(() => window.__GAME.teleport(-23, 15, 0.1));
    snap = await advance(page, 0.4);
    expect(snap.nearConsole, 'prompt available at the console').toBe(true);
    await shot(page, 'ui-03-console-prompt');
  });
});
