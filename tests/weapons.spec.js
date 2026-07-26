// Phase 3 gate (Opus 4): weapon systems in depth. Every primary plus sidearm,
// knife and throwables: fire timing, ammo accounting, reload variants, ADS,
// slot switching, dry fire, and full damage chains against QA-spawned targets.
// All timing runs on the deterministic 60 Hz advanceTime clock.
import { test, expect } from '@playwright/test';
import { watchErrors, filterRealErrors, bootToGameplay, state, advance, teleport } from './helpers.js';

// -- local helpers (weapons only; shared helpers.js stays untouched) ---------

// single trigger pull: for semi weapons exactly one shot, for autos one shot
// (50 ms = 3 ticks < time-to-second-round for every gun in the game)
async function tap(page, holdMs = 50, settleMs = 150) {
  await page.mouse.down();
  await advance(page, holdMs);
  await page.mouse.up();
  await advance(page, settleMs);
}

async function qa(page, fn) { return await page.evaluate(fn); }

// place a target dummy `dist` m north of a clear spot on the open floor and
// aim the player at its torso (pitch -5 deg puts the ray at chest height @4m)
async function rigTarget(page, id, dist = 4) {
  await teleport(page, 'openfloor');
  await page.evaluate(({ id, dist }) => {
    window.__qa.spawnEnemy({ x: -6, y: 0, z: -2 - dist }, { id });
    window.__qa.place(-6, 0, -2, 0); // facing north (-Z)
    window.__qa.look(0, -5);
  }, { id, dist });
  await advance(page, 200);
}

async function enemyById(page, id) {
  return await page.evaluate((id) => {
    const e = window.NSR.ai.enemies.find((x) => x.id === id);
    return e ? { alive: e.alive, health: e.health, flashT: e.flashT } : null;
  }, id);
}

async function missionStats(page) {
  return await page.evaluate(() => ({ ...window.NSR.mission.stats }));
}

async function visibleDecals(page) {
  return await page.evaluate(() => window.NSR.fx.decals.filter((d) => d.visible).length);
}

// fire (with per-weapon pacing) until the target dies; returns tries used
async function fireUntilDead(page, id, { burstMs = 250, settleMs = 200, tries = 10 } = {}) {
  for (let i = 0; i < tries; i++) {
    await page.evaluate(() => window.__qa.look(0, -5)); // undo recoil creep
    await advance(page, 30);
    await tap(page, burstMs, settleMs);
    const e = await enemyById(page, id);
    if (!e.alive) return i + 1;
  }
  return -1;
}

// ============================================================ vesper (SMG)
test('vesper: auto fire count, world impacts, damage chain, partial reload', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToGameplay(page, { primary: 'vesper' });
  await qa(page, () => { window.__qa.freezeAI(true); window.__qa.god(true); });
  await teleport(page, 'lobby');
  await advance(page, 200);

  let s = await state(page);
  expect(s.weapon.id).toBe('vesper');
  expect(s.weapon.mag).toBe(25);
  expect(s.weapon.reserve).toBe(100);

  // 780 rpm on the 60 Hz clock = one round every 5 ticks; a 500 ms (30-tick)
  // hold fires on ticks 1,6,11,16,21,26 -> exactly 6 rounds
  const decals0 = await visibleDecals(page);
  await page.mouse.down();
  await advance(page, 500);
  await page.mouse.up();
  await advance(page, 200);
  s = await state(page);
  expect(s.weapon.mag).toBe(25 - 6);
  expect(s.weapon.state).toBe('idle');
  expect((await missionStats(page)).shots).toBe(6);
  // rounds hit the lobby walls: impact decals appeared in the world
  expect(await visibleDecals(page)).toBeGreaterThan(decals0);

  // damage chain: QA target 4 m ahead dies to sustained fire, stats track it
  const kills0 = (await missionStats(page)).kills;
  await rigTarget(page, 'vsp_dummy');
  const alive0 = (await state(page)).enemies.alive;
  expect(await fireUntilDead(page, 'vsp_dummy')).toBeGreaterThan(0);
  await advance(page, 300);
  s = await state(page);
  expect(s.enemies.alive).toBe(alive0 - 1);
  expect((await missionStats(page)).kills).toBe(kills0 + 1);

  // partial reload: fire exactly 3, reload tops up from reserve, -3 exactly
  await qa(page, () => window.__qa.giveAmmo());
  for (let i = 0; i < 3; i++) await tap(page);
  s = await state(page);
  expect(s.weapon.mag).toBe(22);
  await page.keyboard.press('r');
  await advance(page, 200);
  s = await state(page);
  expect(s.weapon.state).toBe('reload');
  await advance(page, 2300); // reloadTime 2.15 s
  s = await state(page);
  expect(s.weapon.state).toBe('idle');
  expect(s.weapon.mag).toBe(25);
  expect(s.weapon.reserve).toBe(97);

  expect(filterRealErrors(errors)).toEqual([]);
});

// ========================================================== bdr15 (carbine)
test('bdr15: burst timing, ADS blend, empty-mag auto reload, damage chain', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToGameplay(page, { primary: 'bdr15' });
  await qa(page, () => { window.__qa.freezeAI(true); window.__qa.god(true); });
  await teleport(page, 'lobby');
  await advance(page, 200);

  // 660 rpm = one round every 6 ticks; 500 ms hold -> ticks 1,7,13,19,25 = 5
  await page.mouse.down();
  await advance(page, 500);
  await page.mouse.up();
  await advance(page, 200);
  let s = await state(page);
  expect(s.weapon.mag).toBe(30 - 5);
  expect(s.weapon.state).toBe('idle');

  // ADS: right mouse blends ads toward 1, releasing blends back to 0;
  // non-scoped weapons never raise the scope overlay
  await page.mouse.down({ button: 'right' });
  await advance(page, 600);
  s = await state(page);
  expect(s.weapon.ads).toBeGreaterThan(0.9);
  expect(await page.evaluate(() => document.getElementById('scope-overlay').style.opacity)).toBe('0');
  await page.mouse.up({ button: 'right' });
  await advance(page, 600);
  s = await state(page);
  expect(s.weapon.ads).toBeLessThan(0.1);

  // empty-mag behavior: pulling the trigger on an empty mag auto-reloads
  await qa(page, () => { window.NSR.weapons.current().mag = 0; });
  await page.mouse.down();
  await advance(page, 120);
  await page.mouse.up();
  s = await state(page);
  expect(s.weapon.state).toBe('reload');
  await advance(page, 2600); // reloadTime 2.4 s
  s = await state(page);
  expect(s.weapon.mag).toBe(30);
  expect(s.weapon.reserve).toBe(60);

  // damage chain
  const kills0 = (await missionStats(page)).kills;
  await rigTarget(page, 'bdr_dummy');
  const alive0 = (await state(page)).enemies.alive;
  expect(await fireUntilDead(page, 'bdr_dummy')).toBeGreaterThan(0);
  await advance(page, 300);
  s = await state(page);
  expect(s.enemies.alive).toBe(alive0 - 1);
  expect((await missionStats(page)).kills).toBe(kills0 + 1);

  expect(filterRealErrors(errors)).toEqual([]);
});

// ===================================================== havelock (pump gun)
test('havelock: pump cycle, shell-by-shell reload, fire interrupts reload, damage chain', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToGameplay(page, { primary: 'havelock' });
  await qa(page, () => { window.__qa.freezeAI(true); window.__qa.god(true); });
  await teleport(page, 'lobby');
  await advance(page, 200);

  // one shell per trigger pull, then the action pumps before it can fire again
  await page.mouse.down();
  await advance(page, 60);
  await page.mouse.up();
  let s = await state(page);
  expect(s.weapon.mag).toBe(5);
  expect(s.weapon.state).toBe('pump');
  await tap(page, 50, 0); // trigger during the pump does nothing
  s = await state(page);
  expect(s.weapon.mag).toBe(5);
  await advance(page, 800); // pumpTime 0.62 s
  s = await state(page);
  expect(s.weapon.state).toBe('idle');

  // shell-by-shell reload from 2 shells: mag climbs 3,4,5,6 one at a time
  await qa(page, () => { window.NSR.weapons.current().mag = 2; });
  await page.keyboard.press('r');
  await advance(page, 100);
  s = await state(page);
  expect(s.weapon.state).toBe('reload');
  const seen = new Set();
  for (let i = 0; i < 12 && s.weapon.mag < 6; i++) {
    await advance(page, 350);
    const prev = s.weapon.mag;
    s = await state(page);
    expect(s.weapon.mag).toBeGreaterThanOrEqual(prev); // monotonic, +1 steps
    expect(s.weapon.mag - prev).toBeLessThanOrEqual(1);
    seen.add(s.weapon.mag);
  }
  expect([...seen].sort()).toEqual(expect.arrayContaining([3, 4, 5, 6]));
  expect(s.weapon.mag).toBe(6);
  expect(s.weapon.reserve).toBe(20); // 24 - 4 shells taken
  await advance(page, 400);
  expect((await state(page)).weapon.state).toBe('idle');

  // holding the trigger mid-reload stops the shell chain after the current one
  await qa(page, () => { window.NSR.weapons.current().mag = 2; });
  await page.keyboard.press('r');
  await advance(page, 300); // inside the first shell insert
  await page.mouse.down();
  await advance(page, 600); // shell finishes; pending chain must cancel
  s = await state(page);
  expect(s.weapon.mag).toBe(3);
  await advance(page, 1400); // long wait: no further shells go in
  s = await state(page);
  expect(s.weapon.mag).toBe(3);
  expect(s.weapon.state).toBe('idle');
  await page.mouse.up();
  await advance(page, 100);
  await tap(page, 60, 100); // fresh trigger pull fires immediately
  s = await state(page);
  expect(s.weapon.mag).toBe(2);
  expect(['pump', 'idle']).toContain(s.weapon.state);
  await advance(page, 900);

  // damage chain: 8-pellet blasts at 4 m drop a merc in a couple of shells
  const kills0 = (await missionStats(page)).kills;
  await qa(page, () => window.__qa.giveAmmo());
  await rigTarget(page, 'hav_dummy');
  const alive0 = (await state(page)).enemies.alive;
  expect(await fireUntilDead(page, 'hav_dummy', { burstMs: 60, settleMs: 1100, tries: 6 })).toBeGreaterThan(0);
  await advance(page, 300);
  s = await state(page);
  expect(s.enemies.alive).toBe(alive0 - 1);
  expect((await missionStats(page)).kills).toBe(kills0 + 1);

  expect(filterRealErrors(errors)).toEqual([]);
});

// ==================================================== meridian (bolt sniper)
test('meridian: bolt cycle after each shot, scoped ADS overlay, damage chain', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToGameplay(page, { primary: 'meridian' });
  await advance(page, 400); // drawTime 0.85 s outlasts the boot helper's 0.8 s
  await qa(page, () => { window.__qa.freezeAI(true); window.__qa.god(true); });
  await teleport(page, 'lobby');
  await advance(page, 200);

  let s = await state(page);
  expect(s.weapon.id).toBe('meridian');
  expect(s.weapon.state).toBe('idle');

  // bolt state engages after every shot while rounds remain
  await page.mouse.down();
  await advance(page, 60);
  await page.mouse.up();
  s = await state(page);
  expect(s.weapon.mag).toBe(4);
  expect(s.weapon.state).toBe('bolt');
  await advance(page, 1300); // boltTime 1.1 s
  expect((await state(page)).weapon.state).toBe('idle');
  await advance(page, 400); // cooldown (60/42 rpm = 1.43 s) fully elapsed
  await page.mouse.down();
  await advance(page, 60);
  await page.mouse.up();
  s = await state(page);
  expect(s.weapon.mag).toBe(3);
  expect(s.weapon.state).toBe('bolt');
  await advance(page, 1900);

  // full ADS raises the scope overlay; releasing drops it
  await page.mouse.down({ button: 'right' });
  await advance(page, 900);
  s = await state(page);
  expect(s.weapon.ads).toBeGreaterThan(0.9);
  expect(await page.evaluate(() => document.getElementById('scope-overlay').style.opacity)).toBe('1');
  await page.mouse.up({ button: 'right' });
  await advance(page, 700);
  expect(await page.evaluate(() => document.getElementById('scope-overlay').style.opacity)).toBe('0');

  // damage chain: scoped shots (92 dmg body) kill a merc in two hits
  const kills0 = (await missionStats(page)).kills;
  await qa(page, () => window.__qa.giveAmmo());
  await rigTarget(page, 'mer_dummy');
  const alive0 = (await state(page)).enemies.alive;
  await page.mouse.down({ button: 'right' });
  await advance(page, 700); // settle full ADS: spread 0.03 deg
  const tries = await fireUntilDead(page, 'mer_dummy', { burstMs: 60, settleMs: 1900, tries: 5 });
  await page.mouse.up({ button: 'right' });
  expect(tries).toBeGreaterThan(0);
  await advance(page, 300);
  s = await state(page);
  expect(s.enemies.alive).toBe(alive0 - 1);
  expect((await missionStats(page)).kills).toBe(kills0 + 1);

  expect(filterRealErrors(errors)).toEqual([]);
});

// ============================================= ad9 + slot switching + dry fire
test('ad9 sidearm: semi-auto trigger, partial reload; slot switching; dry fire safety', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToGameplay(page, { primary: 'bdr15' });
  await qa(page, () => { window.__qa.freezeAI(true); window.__qa.god(true); });
  await teleport(page, 'lobby');
  await advance(page, 200);

  // slot switching 1 -> 2 -> 3 -> 1: draw state then idle, ids follow slots
  await page.keyboard.press('2');
  await advance(page, 60);
  let s = await state(page);
  expect(s.weapon.id).toBe('ad9');
  expect(s.weapon.state).toBe('draw');
  await advance(page, 600);
  expect((await state(page)).weapon.state).toBe('idle');
  await page.keyboard.press('3');
  await advance(page, 500);
  s = await state(page);
  expect(s.weapon.id).toBe('knife');
  expect(s.weapon.kind).toBe('melee');
  await page.keyboard.press('1');
  await advance(page, 800);
  s = await state(page);
  expect(s.weapon.id).toBe('bdr15');
  expect(s.weapon.state).toBe('idle');

  // semi-auto: exactly one round per click; holding the button does NOT auto-fire
  await page.keyboard.press('2');
  await advance(page, 600);
  for (let i = 0; i < 3; i++) await tap(page);
  s = await state(page);
  expect(s.weapon.mag).toBe(9);
  await page.mouse.down();
  await advance(page, 600);
  await page.mouse.up();
  await advance(page, 150);
  s = await state(page);
  expect(s.weapon.mag).toBe(8); // one shot from the press edge, none from the hold

  // partial reload: 4 rounds spent -> reserve pays back exactly 4
  await page.keyboard.press('r');
  await advance(page, 1800); // reloadTime 1.55 s
  s = await state(page);
  expect(s.weapon.state).toBe('idle');
  expect(s.weapon.mag).toBe(12);
  expect(s.weapon.reserve).toBe(44);

  // dry fire with zero ammo anywhere: no crash, no phantom rounds
  await qa(page, () => { const w = window.NSR.weapons.current(); w.mag = 0; w.reserve = 0; });
  await tap(page, 120, 300);
  s = await state(page);
  expect(s.weapon.mag).toBe(0);
  expect(s.weapon.reserve).toBe(0);
  expect(s.weapon.state).toBe('idle');

  expect(filterRealErrors(errors)).toEqual([]);
});

// ================================================================== knife
test('knife: melee strikes damage and kill a close-range enemy', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToGameplay(page, { primary: 'bdr15' });
  await qa(page, () => { window.__qa.freezeAI(true); window.__qa.god(true); });

  // clear corridor duel: target 1.5 m ahead (knife range 1.9 m)
  await qa(page, () => {
    window.__qa.spawnEnemy({ x: -6.5, y: 0, z: -12.2 }, { id: 'knife_target' });
    window.__qa.place(-5, 0, -12.2, Math.PI / 2); // facing west
    window.__qa.look(90, -10);
  });
  await page.keyboard.press('3');
  await advance(page, 500);
  let s = await state(page);
  expect(s.weapon.id).toBe('knife');

  const kills0 = (await missionStats(page)).kills;
  const alive0 = (await state(page)).enemies.alive;
  const hp0 = (await enemyById(page, 'knife_target')).health;
  await tap(page, 60, 300);
  const hp1 = (await enemyById(page, 'knife_target')).health;
  expect(hp1).toBeLessThan(hp0); // 55 dmg per strike
  await advance(page, 400); // melee cooldown 0.55 s
  await tap(page, 60, 300);
  const after = await enemyById(page, 'knife_target');
  expect(after.alive).toBe(false);
  await advance(page, 200);
  s = await state(page);
  expect(s.enemies.alive).toBe(alive0 - 1);
  expect((await missionStats(page)).kills).toBe(kills0 + 1);

  expect(filterRealErrors(errors)).toEqual([]);
});

// ============================================================== throwables
test('throwables: flash blinds through LOS, smoke blocks vision, counts and auto-switch', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToGameplay(page, { primary: 'bdr15' });
  await qa(page, () => { window.__qa.freezeAI(true); window.__qa.god(true); });

  // straight, empty corridor: enemy 6 m east with clear line of sight
  await qa(page, () => {
    window.__qa.spawnEnemy({ x: -10, y: 0, z: -12.2 }, { id: 'flash_target' });
    window.__qa.place(-16, 0, -12.2, -Math.PI / 2); // facing east
    window.__qa.look(-90, 0);
  });
  await advance(page, 100);
  const losBefore = await page.evaluate(() => {
    const g = window.NSR;
    const e = g.ai.enemies.find((x) => x.id === 'flash_target');
    return g.ai.hasLineOfSight(g.player.eyePos(), e.eyePos());
  });
  expect(losBefore).toBe(true); // control: corridor is clear pre-smoke

  // flash: count 2 -> 1, detonation blinds the enemy (and dazzles the player)
  await page.keyboard.press('4');
  await advance(page, 700);
  let s = await state(page);
  expect(s.weapon.id).toBe('flash');
  expect(s.weapon.reserve).toBe(2);
  // steep downward throw lands the charge ~2-3 m out: inside the 9 m blind
  // radius for BOTH the thrower and the target 6 m east
  await qa(page, () => window.__qa.look(-90, -60));
  await tap(page, 100, 100);
  s = await state(page);
  expect(s.weapon.reserve).toBe(1);
  await advance(page, 1700); // fuse 1.5 s + flight: just past detonation
  const flashT = (await enemyById(page, 'flash_target')).flashT;
  expect(flashT).toBeGreaterThan(0);
  s = await state(page);
  expect(s.player.flash).toBeGreaterThan(0); // player looked straight at it
  await advance(page, 700);
  await qa(page, () => window.__qa.look(-90, 0));

  // smoke: count 1 -> 0, a smoke zone forms and severs the same sightline
  await page.keyboard.press('5');
  await advance(page, 700);
  s = await state(page);
  expect(s.weapon.id).toBe('smoke');
  expect(s.weapon.reserve).toBe(1);
  await qa(page, () => window.__qa.look(-90, -40)); // land it ~5 m out
  await tap(page, 100, 100);
  s = await state(page);
  expect(s.weapon.reserve).toBe(0);
  await advance(page, 2200); // fuse 1.2 s + bloom (zones active after t>0.7)
  const zones = await page.evaluate(() => window.NSR.fx.smokeZones());
  expect(zones.length).toBeGreaterThan(0);
  const losThrough = await page.evaluate(() => {
    const g = window.NSR;
    // fresh target further east: the ray must cross the smoke sphere
    window.__qa.spawnEnemy({ x: -5, y: 0, z: -12.2 }, { id: 'smoke_target' });
    const e = g.ai.enemies.find((x) => x.id === 'smoke_target');
    return g.ai.hasLineOfSight(g.player.eyePos(), e.eyePos());
  });
  expect(losThrough).toBe(false);

  // last throwable used: weapon auto-switches back to the primary
  await advance(page, 700);
  s = await state(page);
  expect(s.weapon.id).toBe('bdr15');
  expect(s.weapon.slots['5'].reserve).toBe(0);

  expect(filterRealErrors(errors)).toEqual([]);
});
