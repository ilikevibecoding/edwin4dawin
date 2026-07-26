import { test, expect } from '@playwright/test';
import { launchGame, state, adv, qa, collectErrors, expectNoErrors } from './helpers';

test.describe('S26 full escort navigation', () => {
  test('S26 hostage B follows from the upstairs conference room to the garage (stairs + doors)', async ({ page }) => {
    test.setTimeout(420_000);
    const errors = collectErrors(page);
    await launchGame(page);
    await qa(page, `__qa.freezeAI(true)`);
    // free hostage B in the conference room
    await qa(page, `__qa.teleport([35.2, 3.6, 15.2], ${-Math.PI * 0.4})`);
    await adv(page, 200);
    await qa(page, `__qa.aimAt(34.5, 4.6, 15.9)`);
    await adv(page, 100);
    let s = await state(page);
    expect(s.nearestInteractable?.id).toBe('hostage:B');
    await qa(page, `__qa.input.down('interact')`);
    await adv(page, 60);
    await qa(page, `__qa.input.up('interact')`);
    await adv(page, 300);
    s = await state(page);
    expect(s.hostages.find((h) => h.id === 'B')?.state).toBe('following');

    // waypoints along the REAL route: conference → glass doors → corridor →
    // stairwell (down) → main hall → loading doors → garage
    const route: [number, number, number][] = [
      [38, 3.6, 12], [34.5, 3.6, 11], [34.4, 3.6, 8],   // out through conference glass doors
      [29.4, 3.6, 8],                                    // corridor to stairwell door
      [29, 3.6, 10.8],                                   // through upper stair door
      [27.3, 2.2, 13.2], [29, 1.9, 15.4], [30.7, 0.4, 12.4], // down run2, landing, run1
      [29, 0, 16.8], [29, 0, 19.5],                      // out the south stair door
      [38, 0, 19.5], [44, 0, 19.7],                      // main hall east
      [44, 0, 22.5], [44, 0, 27],                        // loading via double doors
      [43.4, 0, 31.5], [42.3, 0, 34.8],                  // garage
    ];
    for (const [x, y, z] of route) {
      await qa(page, `__qa.teleport([${x}, ${y}, ${z}], 0)`);
      await adv(page, 2600);
    }
    // give the follower time to settle
    for (let i = 0; i < 8; i++) {
      await adv(page, 2000);
      s = await state(page);
      const b = s.hostages.find((h) => h.id === 'B')!;
      const d = Math.hypot(b.pos[0] - s.player!.pos[0], b.pos[2] - s.player!.pos[2]);
      if (d < 4 && b.pos[1] < 1) break;
    }
    const b = (await state(page)).hostages.find((h) => h.id === 'B')!;
    expect(b.pos[1]).toBeLessThan(1);        // made it downstairs
    expect(b.pos[2]).toBeGreaterThan(29);    // inside the garage area
    const dist = Math.hypot(b.pos[0] - 42.3, b.pos[2] - 34.8);
    expect(dist).toBeLessThan(6);
    expectNoErrors(errors);
  });
});
