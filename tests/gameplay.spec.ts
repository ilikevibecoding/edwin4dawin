import { test, expect } from '@playwright/test';
import { launchGame, state, adv, qa, hold, tap, teleport, collectErrors, expectNoErrors } from './helpers';

test.describe('S10-S21 core gameplay chains', () => {
  test('S10 movement: WASD, crouch, jump', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    await adv(page, 500);
    const s0 = await state(page);
    await hold(page, 'forward', 1000);
    const s1 = await state(page);
    const moved = Math.hypot(s1.player!.pos[0] - s0.player!.pos[0], s1.player!.pos[2] - s0.player!.pos[2]);
    expect(moved).toBeGreaterThan(2);
    // crouch toggle
    await tap(page, 'crouch');
    await adv(page, 400);
    expect((await state(page)).player!.crouched).toBe(true);
    await tap(page, 'crouch');
    await adv(page, 400);
    expect((await state(page)).player!.crouched).toBe(false);
    // jump
    await qa(page, `__qa.input.down('jump')`);
    await adv(page, 120);
    await qa(page, `__qa.input.up('jump')`);
    const air = await state(page);
    expect(air.player!.onGround).toBe(false);
    await adv(page, 1200);
    expect((await state(page)).player!.onGround).toBe(true);
    expectNoErrors(errors);
  });

  test('S11 collision: walls stop movement; stairs are walkable', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    await teleport(page, 'vestibule');
    // walk west into the wall for 1.5s — should stay inside the vestibule
    await qa(page, `__qa.teleport([9, 0, 11.5], ${Math.PI / 2})`);
    await hold(page, 'forward', 1500);
    const s = await state(page);
    expect(s.player!.pos[0]).toBeGreaterThan(6);
    expect(s.player!.room).toBe('vestibule');
    // stairs: lobby stair up to balcony
    await qa(page, `__qa.teleport([12.9, 0, 17.2], 0)`);
    await hold(page, 'forward', 2600);
    const up = await state(page);
    expect(up.player!.pos[1]).toBeGreaterThan(3.4);
    expectNoErrors(errors);
  });

  test('S12+S13 fire & reload chains: ammo, impacts, reload restores', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    await teleport(page, 'lobby');
    await qa(page, `__qa.freezeAI(true)`);
    await adv(page, 300);
    const s0 = await state(page);
    expect(s0.weapon!.mag).toBe(30);
    await qa(page, `__qa.aimAt(19, 1.5, 6.2)`);
    await hold(page, 'fire', 700);
    const s1 = await state(page);
    expect(s1.weapon!.mag).toBeLessThan(30);
    expect(s1.weapon!.mag).toBeGreaterThan(15);
    const fired = 30 - s1.weapon!.mag;
    // reload (tactical)
    await tap(page, 'reload');
    const during = await state(page);
    expect(during.weapon!.phase).toBe('reload');
    await adv(page, 3200);
    const s2 = await state(page);
    expect(s2.weapon!.phase).toBe('idle');
    expect(s2.weapon!.mag).toBe(30);
    expect(s2.weapon!.reserve).toBe(90 - fired);
    expectNoErrors(errors);
  });

  test('S14 weapon switching updates active weapon and HUD state', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    await adv(page, 500);
    await tap(page, 'slot2');
    await adv(page, 900);
    expect((await state(page)).weapon!.id).toBe('vp9');
    await tap(page, 'slot3');
    await adv(page, 900);
    expect((await state(page)).weapon!.id).toBe('knife');
    await tap(page, 'slot1');
    await adv(page, 900);
    expect((await state(page)).weapon!.id).toBe('vc7');
    expectNoErrors(errors);
  });

  test('S15 enemy damage chain: shots reduce health, kill ends behavior', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    await teleport(page, 'lobby');
    await qa(page, `__qa.freezeAI(true)`);
    // pull an enemy in front of the player
    await qa(page, `__qa.teleport([19, 0, 13], 0)`);
    await qa(page, `__qa.teleportEnemy('enemy-0', [19, 0, 8])`);
    await adv(page, 100);
    await qa(page, `__qa.aimAt(19, 1.3, 8)`);
    await adv(page, 60);
    let killed = false;
    for (let burst = 0; burst < 10 && !killed; burst++) {
      await hold(page, 'fire', 130);
      await adv(page, 220);
      const s = await state(page);
      const e0 = s.enemies.find((e) => e.id === 'enemy-0')!;
      if (e0.state === 'dead') killed = true;
      else await qa(page, `__qa.aimAt(${e0.pos[0]}, 1.3, ${e0.pos[2]})`);
    }
    expect(killed).toBe(true);
    const s = await state(page);
    expect(s.mission!.kills).toBeGreaterThanOrEqual(1);
    expect(s.mission!.enemiesAlive).toBeLessThan(12);
    expectNoErrors(errors);
  });

  test('S16 player damage & death → defeat screen', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    await adv(page, 300);
    await qa(page, `__qa.damagePlayer(35)`);
    await adv(page, 100);
    const s1 = await state(page);
    expect(s1.player!.health).toBeLessThan(100);
    await qa(page, `__qa.damagePlayer(500)`);
    await adv(page, 3000);
    const s2 = await state(page);
    expect(s2.mode).toBe('defeat');
    expect(s2.outcome).toBe('defeat');
    await expect(page.locator('.end-title')).toHaveText('MISSION FAILED');
    expectNoErrors(errors);
  });

  test('S17 door chain: interact opens, collision & text state track', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    // stand in front of the men's restroom door in the north corridor
    await qa(page, `__qa.teleport([34, 0, 8.6], ${Math.PI})`);
    await adv(page, 200);
    const s0 = await state(page);
    const door0 = s0.nearbyDoors.find((d) => d.id === 'd-rr-m');
    expect(door0?.state).toBe('closed');
    expect(s0.nearestInteractable?.id).toBe('door:d-rr-m');
    await tap(page, 'interact');
    await adv(page, 250);
    expect((await state(page)).nearbyDoors.find((d) => d.id === 'd-rr-m')?.state).toBe('opening');
    await adv(page, 1000);
    const s1 = await state(page);
    expect(s1.nearbyDoors.find((d) => d.id === 'd-rr-m')?.state).toBe('open');
    // walk through into the restroom
    await hold(page, 'forward', 1400);
    expect((await state(page)).player!.room).toBe('restroom-m');
    expectNoErrors(errors);
  });

  test('S18+S19 hostage & extraction chains → victory', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    await qa(page, `__qa.freezeAI(true)`);
    // free hostage A in the server room
    await qa(page, `__qa.teleport([45.2, 0, 14.5], ${Math.PI * 0.5})`);
    await adv(page, 200);
    let s = await state(page);
    expect(s.hostages.find((h) => h.id === 'A')?.state).toBe('captive');
    await qa(page, `__qa.aimAt(44.6, 1.0, 15.8)`);
    await adv(page, 100);
    s = await state(page);
    expect(s.nearestInteractable?.id).toBe('hostage:A');
    await tap(page, 'interact');
    await adv(page, 300);
    s = await state(page);
    expect(s.hostages.find((h) => h.id === 'A')?.state).toBe('following');
    expect(s.mission!.objectives.hostageA).toBe('done');
    // hostage follows the player: walk away and verify pursuit
    await qa(page, `__qa.teleport([45, 0, 12], 0)`);
    await hold(page, 'forward', 600);
    await adv(page, 2500);
    s = await state(page);
    const hA = s.hostages.find((h) => h.id === 'A')!;
    const d = Math.hypot(hA.pos[0] - s.player!.pos[0], hA.pos[2] - s.player!.pos[2]);
    expect(d).toBeLessThan(5);
    // secure B remotely and gather everyone in the garage
    await qa(page, `__qa.secureHostage('B')`);
    await adv(page, 200);
    expect((await state(page)).mission!.objectives.extract).toBe('active');
    await qa(page, `__qa.hostagesToExtraction()`);
    await qa(page, `__qa.teleport([42, 0, 35], 0)`);
    await adv(page, 500);
    s = await state(page);
    expect(s.mission!.phase).toBe('extracting');
    expect(s.mission!.extractCountdown).not.toBeNull();
    await adv(page, 9000);
    await adv(page, 4000);
    s = await state(page);
    expect(s.mode).toBe('victory');
    expect(s.outcome).toBe('victory');
    await expect(page.locator('.end-title')).toHaveText('HOSTAGES SECURED');
    expectNoErrors(errors);
  });

  test('S20 defeat on mission timer expiry', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    await adv(page, 300);
    await qa(page, `__qa.setTimeLeft(0.5)`);
    await adv(page, 800);
    await adv(page, 3000);
    const s = await state(page);
    expect(s.mode).toBe('defeat');
    expect(s.mission!.loseReason).toContain('reinforcements');
    expectNoErrors(errors);
  });

  test('S21 restart chain: full state reset', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    await adv(page, 300);
    // dirty the state: shoot, open a door, damage player, kill an enemy
    await hold(page, 'fire', 400);
    await qa(page, `__qa.toggleDoor('d-rr-m')`);
    await qa(page, `__qa.damagePlayer(30)`);
    await qa(page, `__qa.killEnemy('enemy-2')`);
    await adv(page, 800);
    const dirty = await state(page);
    expect(dirty.weapon!.mag).toBeLessThan(30);
    expect(dirty.mission!.enemiesAlive).toBe(11);
    // restart
    await qa(page, `__qa.resetMission()`);
    await adv(page, 600);
    const s = await state(page);
    expect(s.mode).toBe('playing');
    expect(s.weapon!.mag).toBe(30);
    expect(s.weapon!.reserve).toBe(90);
    expect(s.player!.health).toBe(100);
    expect(s.mission!.enemiesAlive).toBe(12);
    expect(s.mission!.kills).toBe(0);
    expect(s.mission!.timeLeft).toBeGreaterThan(715);
    expect(s.hostages.every((h) => h.state === 'captive')).toBe(true);
    const door = await qa<{ state: string } | null>(page, `__qa.doorById('d-rr-m')`);
    expect(door?.state).toBe('closed');
    expectNoErrors(errors);
  });
});

test.describe('S30-S34 AI behaviors', () => {
  test('S30 patrols move; no permanent stuck enemies', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    await adv(page, 500);
    const s0 = await state(page);
    await adv(page, 6000);
    const s1 = await state(page);
    let movedCount = 0;
    for (const e0 of s0.enemies) {
      const e1 = s1.enemies.find((e) => e.id === e0.id)!;
      const d = Math.hypot(e1.pos[0] - e0.pos[0], e1.pos[2] - e0.pos[2]);
      if (d > 0.8) movedCount++;
    }
    expect(movedCount).toBeGreaterThanOrEqual(Math.floor(s0.enemies.length * 0.6));
    expectNoErrors(errors);
  });

  test('S31 hearing: gunshot draws investigation', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    // stand in the lobby; enemy-0 patrols there. Shoot once.
    await teleport(page, 'lobby');
    await adv(page, 300);
    await qa(page, `__qa.aimAt(19, 2, 6)`);
    await hold(page, 'fire', 120);
    await adv(page, 1200);
    const s = await state(page);
    const investigators = s.enemies.filter((e) => e.state === 'investigate' || e.state === 'combat' || e.state === 'suspicious');
    expect(investigators.length).toBeGreaterThan(0);
    expectNoErrors(errors);
  });

  test('S32 vision respects walls: enemy behind wall cannot see player', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page);
    // janitor closet is enclosed; put an enemy inside and the player outside
    await qa(page, `__qa.teleportEnemy('enemy-1', [41, 0, 13])`);
    await qa(page, `__qa.teleport([38, 0, 14], ${-Math.PI / 2})`);
    await adv(page, 1500);
    const s = await state(page);
    const e = s.enemies.find((en) => en.id === 'enemy-1')!;
    expect(e.suspicion).toBeLessThan(0.4);
    expect(s.visibleEnemies).not.toContain('enemy-1');
    expectNoErrors(errors);
  });

  test('S33+S34 combat → search after losing player; difficulty scales count', async ({ page }) => {
    const errors = collectErrors(page);
    await launchGame(page, '?test=1&mode=playing&quality=low&seed=1337&difficulty=veteran');
    await adv(page, 200);
    let s = await state(page);
    expect(s.enemies.length).toBe(14);
    // provoke: appear in front of enemy-0 then teleport far away
    const e0 = s.enemies[0];
    await qa(page, `__qa.teleport([${e0.pos[0]}, ${e0.pos[1]}, ${e0.pos[2] + 2.5}], 0)`);
    await adv(page, 1600);
    s = await state(page);
    expect(['combat', 'suspicious', 'investigate']).toContain(s.enemies[0].state);
    // hide somewhere fully enclosed (mechanical room) and wait out the memory window
    await qa(page, `__qa.teleport([52, 0, 34], 0)`);
    await adv(page, 9000);
    s = await state(page);
    expect(['search', 'patrol', 'investigate']).toContain(s.enemies[0].state);
    expectNoErrors(errors);
  });
});
