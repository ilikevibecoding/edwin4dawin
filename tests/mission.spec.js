// Phase 2/5 gate: complete mission loop, AI behavior chains, defeat paths,
// restart cleanliness. Uses deterministic advanceTime throughout.
import { test, expect } from '@playwright/test';
import { watchErrors, filterRealErrors, bootToGameplay, state, advance, shot, teleport } from './helpers.js';

test('enemy sees player, fights, dies; mission stats update', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToGameplay(page);
  // stand near the conference guard
  await teleport(page, 'conference');
  let s = await state(page);
  const guard = s.enemies.visible.find((e) => e.id === 'e_conf_guard') ||
    s.enemies.nearby.find((e) => e.id === 'e_conf_guard');
  expect(guard).toBeTruthy();

  // make noise (running footsteps) then give it time to spot us
  await page.keyboard.down('w');
  await advance(page, 700);
  await page.keyboard.up('w');
  await advance(page, 2500);
  s = await state(page);
  let g2 = [...s.enemies.visible, ...s.enemies.nearby].find((e) => e.id === 'e_conf_guard');
  if (!['combat', 'investigate', 'search', 'suspicious'].includes(g2.state)) {
    // guaranteed stimulus: a gunshot is an urgent noise
    await page.mouse.down();
    await advance(page, 150);
    await page.mouse.up();
    await advance(page, 1500);
    s = await state(page);
    g2 = [...s.enemies.visible, ...s.enemies.nearby].find((e) => e.id === 'e_conf_guard');
  }
  expect(['combat', 'investigate', 'search', 'suspicious']).toContain(g2.state);

  // kill it with QA (aim mechanics tested separately)
  await page.evaluate(() => {
    const e = window.NSR.ai.enemies.find((x) => x.id === 'e_conf_guard');
    e.takeDamage(500, { part: 'body', weapon: 'test' });
  });
  await advance(page, 600);
  s = await state(page);
  expect(s.enemies.alive).toBeLessThan(s.enemies.total);
  const dead = await page.evaluate(() => window.NSR.ai.enemies.find((x) => x.id === 'e_conf_guard').state);
  expect(dead).toBe('dead');
  await shot(page, 'mission-enemy-dead');
  expect(filterRealErrors(errors)).toEqual([]);
});

test('player shots actually kill enemies via hit detection', async ({ page }) => {
  await bootToGameplay(page);
  await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.god(true); });
  // spawn a target enemy right in front of the player in the open floor
  await teleport(page, 'openfloor');
  await page.evaluate(() => window.__qa.spawnEnemy({ x: -6, y: 0, z: -6 }, { id: 'target_dummy' }));
  await page.evaluate(() => window.__qa.place(-6, 0, -2, 0)); // 4m south, facing north
  await advance(page, 300);
  // aim slightly up to body height happens automatically (ray from eye level)
  const hpBefore = await page.evaluate(() => window.NSR.ai.enemies.find((e) => e.id === 'target_dummy').health);
  await page.mouse.down();
  await advance(page, 1200);
  await page.mouse.up();
  await advance(page, 300);
  const hpAfter = await page.evaluate(() => window.NSR.ai.enemies.find((e) => e.id === 'target_dummy').health);
  expect(hpAfter).toBeLessThan(hpBefore);
});

test('gunfire noise pulls a patroller to investigate', async ({ page }) => {
  await bootToGameplay(page);
  await page.evaluate(() => window.__qa.god(true));
  // fire once in the south corridor; the south patroller should investigate
  await teleport(page, 'restroomM');
  await advance(page, 200);
  await page.mouse.down();
  await advance(page, 150);
  await page.mouse.up();
  await advance(page, 2500);
  const st = await page.evaluate(() => window.NSR.ai.enemies.find((e) => e.id === 'e_south_1')?.state);
  expect(['investigate', 'suspicious', 'combat', 'search']).toContain(st);
});

test('glass breaks when shot: collision, visuals, state', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToGameplay(page);
  await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.god(true); });
  // conference glass wall faces the north corridor
  await page.evaluate(() => window.__qa.place(-6.8, 0, -12.2, Math.PI)); // corridor, facing... south is +z; conference is north
  await page.evaluate(() => window.__qa.look(180, 0));
  await advance(page, 200);
  const before = await page.evaluate(() => window.NSR.world.panes.filter((p) => p.broken).length);
  // face the glass: conference is north of corridor => yaw 0
  await page.evaluate(() => window.__qa.look(0, 0));
  await advance(page, 100);
  await page.mouse.down();
  await advance(page, 300);
  await page.mouse.up();
  await advance(page, 400);
  const after = await page.evaluate(() => window.NSR.world.panes.filter((p) => p.broken).length);
  expect(after).toBeGreaterThan(before);
  await shot(page, 'mission-glass-broken');
  expect(filterRealErrors(errors)).toEqual([]);
});

test('flash device blinds an enemy', async ({ page }) => {
  await bootToGameplay(page);
  await page.evaluate(() => window.__qa.god(true));
  await teleport(page, 'conference');
  await advance(page, 100);
  // select flash (slot 4) and throw at the guard
  await page.keyboard.press('4');
  await advance(page, 600);
  await page.mouse.down();
  await advance(page, 120);
  await page.mouse.up();
  await advance(page, 2400); // fuse 1.5s + margin
  const flashT = await page.evaluate(() => window.NSR.ai.enemies.find((e) => e.id === 'e_conf_guard')?.flashT ?? 0);
  expect(flashT).toBeGreaterThan(0);
});

test('hostage: find, secure, follow, hold position', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToGameplay(page);
  await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.god(true); });
  await teleport(page, 'hostageA');
  await advance(page, 600);
  let s = await state(page);
  const hA = s.hostages.find((h) => h.id === 'hostage_a');
  expect(hA.found).toBe(true);
  expect(hA.state).toBe('captive');

  // face and secure
  await page.evaluate(() => {
    const g = window.NSR;
    const h = g.ai.hostages[0];
    const dx = h.pos.x - g.player.pos.x, dz = h.pos.z - g.player.pos.z;
    g.player.yaw = Math.atan2(-dx, -dz);
    g.player.pitch = -0.25;
  });
  await advance(page, 100);
  s = await state(page);
  expect(s.interactables.find((i) => i.focus)?.prompt).toContain('Secure');
  await page.keyboard.press('e');
  await advance(page, 300);
  s = await state(page);
  expect(s.hostages.find((h) => h.id === 'hostage_a').state).toBe('following');

  // walk away; hostage should follow within a few seconds
  await page.evaluate(() => window.__qa.place(-6, 0, -12, 0));
  await advance(page, 6000);
  s = await state(page);
  const h2 = s.hostages.find((h) => h.id === 'hostage_a');
  const d = Math.hypot(h2.pos[0] - s.player.pos[0], h2.pos[2] - s.player.pos[2]);
  expect(d).toBeLessThan(4.5);
  await shot(page, 'mission-hostage-following');
  expect(filterRealErrors(errors)).toEqual([]);
});

test('hostage B follows player downstairs (nav across floors)', async ({ page }) => {
  test.setTimeout(180_000);
  await bootToGameplay(page);
  await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.god(true); });
  await teleport(page, 'hostageB');
  await advance(page, 400);
  await page.evaluate(() => {
    const g = window.NSR;
    const h = g.ai.hostages.find((x) => x.id === 'hostage_b');
    const dx = h.pos.x - g.player.pos.x, dz = h.pos.z - g.player.pos.z;
    g.player.yaw = Math.atan2(-dx, -dz);
    g.player.pitch = -0.25;
  });
  await advance(page, 100);
  await page.keyboard.press('e');
  await advance(page, 200);
  // move player to the lobby (downstairs)
  await teleport(page, 'lobby');
  // give the hostage time to path down the stairs
  for (let i = 0; i < 12; i++) await advance(page, 2000);
  const s = await state(page);
  const hB = s.hostages.find((h) => h.id === 'hostage_b');
  expect(hB.pos[1]).toBeLessThan(1); // reached ground floor
  const d = Math.hypot(hB.pos[0] - s.player.pos[0], hB.pos[2] - s.player.pos[2]);
  expect(d).toBeLessThan(6);
});

test('full extraction: panel, shutter, wave, hold, victory', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await bootToGameplay(page);
  await page.evaluate(() => window.__qa.god(true));
  await page.evaluate(() => window.__qa.killEnemies());
  // jump the mission to hold phase (hostages placed in garage, panel used)
  const r = await page.evaluate(() => window.__qa.setObjective('hold'));
  expect(r.ok).toBe(true);
  await advance(page, 500);
  let s = await state(page);
  expect(s.mission.phase).toBe('hold');
  // shutter should be opening
  const shutter = await page.evaluate(() => window.NSR.world.doorById('shutter_exit').stateInfo());
  expect(['opening', 'open']).toContain(shutter.state);
  // wave spawned
  expect(s.enemies.alive).toBeGreaterThan(0);
  await page.evaluate(() => window.__qa.killEnemies());
  // hold for the timer
  for (let i = 0; i < 14; i++) await advance(page, 2000);
  s = await state(page);
  expect(s.result).toBe('victory');
  await shot(page, 'mission-victory');
  expect(filterRealErrors(errors)).toEqual([]);
});

test('defeat by hostage death and clean restart', async ({ page }) => {
  const errors = watchErrors(page);
  await bootToGameplay(page);
  await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.god(true); });
  // shoot hostage A (mission failure)
  await page.evaluate(() => {
    const h = window.NSR.ai.hostages[0];
    h.takeDamage(500, {});
  });
  await advance(page, 400);
  let s = await state(page);
  expect(s.result).toBe('defeat');
  expect(s.resultReason).toContain('Hostage');

  // fire some shots + open a door to dirty the state, then restart
  await page.evaluate(() => window.__qa.doorState('d_conf', 'open'));
  await advance(page, 300);
  await page.evaluate(() => window.__qa.resetMission());
  await page.waitForFunction(() => window.NSR.state === 'playing', null, { timeout: 30_000 });
  await advance(page, 300);
  s = await state(page);
  expect(s.result).toBe(null);
  expect(s.mission.phase).toBe('infiltrate');
  expect(s.player.health).toBe(100);
  expect(s.weapon.mag).toBe(30);
  expect(s.hostages.every((h) => h.state === 'captive')).toBe(true);
  expect(s.enemies.alive).toBe(s.enemies.total);
  const confDoor = await page.evaluate(() => window.NSR.world.doorById('d_conf').stateInfo());
  expect(confDoor.state).toBe('closed');
  const brokenPanes = await page.evaluate(() => window.NSR.world.panes.filter((p) => p.broken).length);
  expect(brokenPanes).toBe(0);
  expect(filterRealErrors(errors)).toEqual([]);
});

test('defeat by timeout', async ({ page }) => {
  await bootToGameplay(page);
  await page.evaluate(() => { window.NSR.mission.timer = 3; });
  await advance(page, 4000);
  const s = await state(page);
  expect(s.result).toBe('defeat');
  expect(s.resultReason).toContain('timed out');
});

test('player death defeat', async ({ page }) => {
  await bootToGameplay(page);
  await page.evaluate(() => window.NSR.player.damage(1000, null, 'test'));
  await advance(page, 300);
  const s = await state(page);
  expect(s.result).toBe('defeat');
  expect(s.player.alive).toBe(false);
});

test('pause and resume preserve state', async ({ page }) => {
  await bootToGameplay(page);
  await teleport(page, 'lobby');
  const before = await state(page);
  await page.keyboard.press('p');
  await advance(page, 100);
  let s = await state(page);
  expect(s.mode).toBe('paused');
  await page.click('#btn-resume');
  await advance(page, 100);
  s = await state(page);
  expect(s.mode).toBe('playing');
  expect(s.player.pos).toEqual(before.player.pos);
});
