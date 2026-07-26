// Movement/combat/world scenarios that need staged geometry: jumping onto a
// crate, glass crack→break with noise alerting, flash blinding, knife backstab,
// abort→fresh mission and difficulty scaling. Scenarios S06, S11, S14, S25,
// S26, S46.

import { test, expect } from '@playwright/test';
import { state, adv, startMission, qa, newGamePage, weaponReady } from './helpers.js';

// crate_wood in the basement loading area: top 0.5 m above the floor, i.e. well
// above the 0.34 m step-up limit, so reaching it requires a jump.
const CRATE = { x: 31.7, z: 6.6, floorY: -3.6 };

test.describe('staged combat & movement (one mission, serial)', () => {
  test.describe.configure({ mode: 'serial' });
  let page, errors;

  test.beforeAll(async ({ browser }) => {
    ({ page, errors } = await newGamePage(browser));
    await startMission(page);
    await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.god(true); });
  });
  test.afterAll(async () => { await page?.close(); });

  test('S11: jump clears a low crate and the player stands on it', async () => {
    // the obstacle really is taller than a step-up
    const cols = await qa(page, `qa.collidersNear(${CRATE.x}, ${CRATE.z}, 1.2, ${CRATE.floorY})`);
    const crate = cols.find((c) => c.assetId === 'MNT-017');
    expect(crate, 'crate collider present').toBeTruthy();
    expect(crate.top - CRATE.floorY).toBeGreaterThan(0.34);

    // walk into the crate without jumping: blocked, still on the floor
    await page.evaluate(() => window.__qa.teleportTo(34.4, -3.6, 6.6, 90));
    await adv(page, 400);
    await page.evaluate(() => window.__qa.press('KeyW', true));
    await adv(page, 1400);
    await page.evaluate(() => window.__qa.press('KeyW', false));
    await adv(page, 300);
    const walked = (await state(page)).player;
    expect(walked.position[1]).toBeLessThan(CRATE.floorY + 0.05);

    // run-up + jump: lands on top and stays there
    await page.evaluate(() => window.__qa.teleportTo(34.4, -3.6, 6.6, 90));
    await adv(page, 400);
    await page.evaluate(() => {
      const q = window.__qa;
      q.press('KeyW', true);
      window.advanceTime(260);
      q.press('Space', true); window.advanceTime(60); q.press('Space', false);
      window.advanceTime(900);
      q.press('KeyW', false);
    });
    await adv(page, 400);
    const s = await state(page);
    expect(s.player.grounded).toBe(true);
    expect(s.player.position[1] - CRATE.floorY).toBeGreaterThan(0.35);
    expect(s.player.room).toBe('loading');
    expect(errors).toEqual([]);
  });

  test('S25: a flash blinds an enemy that can see the charge', async () => {
    await page.evaluate(() => { window.__qa.teleport('cubicles'); });
    await adv(page, 200);
    const id = await page.evaluate(() => window.__qa.spawnEnemy('trooper', 29, 16));
    await page.evaluate(() => window.__qa.setWeapon('flash'));
    await adv(page, 900);
    expect((await state(page)).weapon.id).toBe('flash');

    const target = (await qa(page, 'qa.enemies()')).find((e) => e.id === id);
    expect(target.blinded).toBe(false);
    await page.evaluate((t) => window.__qa.lookAt(t.position[0], t.position[1] + 1, t.position[2]), target);
    await adv(page, 100);
    await page.evaluate(() => { window.__qa.mouse(0, true); window.advanceTime(140); window.__qa.mouse(0, false); });
    await adv(page, 2600); // travel + 1.4s fuse + reaction

    const after = (await qa(page, 'qa.enemies()')).find((e) => e.id === id);
    expect(after.blinded, 'enemy blinded by the flash').toBe(true);
    expect(after.blindTimer).toBeGreaterThan(0.5);
    expect(after.seesPlayer).toBe(false);
    expect(['investigate', 'combat', 'search']).toContain(after.state);
    const s = await state(page);
    expect(s.enemies.blinded).toBeGreaterThan(0);
    expect(s.enemies.nearby.find((e) => e.id === id).blinded).toBe(true);
    expect(errors).toEqual([]);
  });

  test('S26: knife backstab kills in one hit, a front slash does not', async () => {
    await page.evaluate(() => { window.__qa.teleport('cubicles'); window.__qa.setWeapon('talon'); });
    await adv(page, 700);
    expect((await state(page)).weapon.id).toBe('talon');

    const stab = async (fromBehind) => {
      const id = await page.evaluate(() => window.__qa.spawnEnemy('trooper', 29, 19));
      await adv(page, 300);
      const e = (await qa(page, 'qa.enemies()')).find((x) => x.id === id);
      const sign = fromBehind ? -1 : 1;      // behind = opposite the facing vector
      await page.evaluate(({ e: en, sign: sg }) => {
        const q = window.__qa;
        q.teleportTo(en.position[0] + en.facing[0] * sg, 0, en.position[2] + en.facing[2] * sg, 0);
        q.lookAt(en.position[0], en.position[1] + 1.1, en.position[2]);
      }, { e, sign });
      await adv(page, 200);
      await page.evaluate(() => { window.__qa.mouse(0, true); window.advanceTime(120); window.__qa.mouse(0, false); });
      await adv(page, 600);
      return (await qa(page, 'qa.enemies()')).find((x) => x.id === id);
    };

    const back = await stab(true);
    expect(back.health).toBe(0);
    expect(back.alive).toBe(false);

    const front = await stab(false);
    expect(front.alive).toBe(true);
    expect(front.health).toBeGreaterThan(0);
    expect(front.health).toBeLessThan(100);   // 52 dmg vs 156 with the multiplier
    expect(errors).toEqual([]);
  });

  test('S23: a hit flinches and alerts; the kill lands in the mission counters', async () => {
    // the north corridor, not the cubicles: partitions there eat the round
    await page.evaluate(() => { window.__qa.teleportTo(48, 0, 12, 90); window.__qa.setWeapon('ridgeline'); });
    await weaponReady(page);
    const before = await state(page);

    const id = await page.evaluate(() => window.__qa.spawnEnemy('trooper', 42, 12));
    await adv(page, 200);
    const fresh = (await qa(page, 'qa.enemies()')).find((e) => e.id === id);
    expect(fresh.health).toBe(100);
    expect(fresh.state).toBe('patrol');
    expect((await state(page)).enemies.total).toBe(before.enemies.total + 1);

    // one round: damage, a flinch, and the target knows it is being shot at
    await page.evaluate((t) => window.__qa.lookAt(t.position[0], t.position[1] + 1.2, t.position[2]), fresh);
    await adv(page, 100);
    await page.evaluate(() => { window.__qa.mouse(0, true); window.advanceTime(60); window.__qa.mouse(0, false); });
    await adv(page, 60);
    const hit = (await qa(page, 'qa.enemies()')).find((e) => e.id === id);
    expect(hit.health, 'took damage').toBeLessThan(100);
    expect(hit.health).toBeGreaterThan(0);
    expect(hit.flinchTimer, 'flinching').toBeGreaterThan(0);
    expect(hit.state, 'alerted by being hit').toBe('combat');

    // empty the rest into it: death is reflected in the roster and the counters
    await page.evaluate(() => { window.__qa.mouse(0, true); window.advanceTime(1800); window.__qa.mouse(0, false); });
    await adv(page, 400);
    const dead = (await qa(page, 'qa.enemies()')).find((e) => e.id === id);
    expect(dead.alive).toBe(false);
    expect(dead.health).toBe(0);
    const after = await state(page);
    expect(after.mission.kills).toBe(before.mission.kills + 1);
    expect(after.enemies.alive).toBe(before.enemies.alive);   // spawned one, killed one
    expect(errors).toEqual([]);
  });

  // Last in the block: it lets the AI run, which scatters the roster.
  test('S25b: deployed smoke breaks an established sightline', async () => {
    // An isolated pair across the training room: 14 m of verified clear sightline
    // (the north corridor looks open but a door assembly breaks it past ~8 m).
    const seer = await page.evaluate(() => {
      const q = window.__qa;
      q.killEnemies();
      q.teleportTo(60, 0, 5, 90);                  // east end, looking west
      const id = q.spawnEnemy('trooper', 46, 5);
      q.faceEnemy(id, 60, 5);
      q.lookAt(46, 1.6, 5);
      q.freezeAI(false);
      return id;
    });
    // An idle guard slowly scans, so keep re-pointing it at the player: then
    // seesPlayer reflects the sightline alone, which is what smoke has to break.
    const look = async (ms) => {
      await page.evaluate((id) => window.__qa.faceEnemy(id, 60, 5), seer);
      await adv(page, ms);
      return (await qa(page, 'qa.enemies()')).find((x) => x.id === seer);
    };
    const sightline = 'qa.smokeBlocks([60, 1.6, 5], [46, 1.6, 5])';

    let e = await look(600);
    expect(e.seesPlayer, 'clear sightline across the training room').toBe(true);
    expect(await qa(page, sightline)).toBe(false);

    // drop smoke halfway between the two
    await page.evaluate(() => { window.__qa.setWeapon('smoke'); });
    await weaponReady(page);
    await page.evaluate(() => { window.__qa.lookAt(53, 0.6, 5); window.advanceTime(100); });
    await page.evaluate(() => { window.__qa.mouse(0, true); window.advanceTime(120); window.__qa.mouse(0, false); });
    await page.evaluate(() => { window.__qa.lookAt(46, 1.6, 5); window.advanceTime(4000); });  // fuse + bloom

    expect(await qa(page, sightline), 'cloud is in the way').toBe(true);
    e = await look(300);
    expect(e.seesPlayer, 'smoke breaks the contact').toBe(false);
    expect(errors).toEqual([]);
  });
});

test('S14: glass cracks then breaks and the noise pulls the AI', async ({ browser }) => {
  const { page, errors } = await newGamePage(browser);
  await startMission(page);
  await page.evaluate(() => { window.__qa.god(true); }); // AI awake: it must hear this

  const panes = await qa(page, "qa.glassPanes('g_server_corr')");
  expect(panes.length).toBeGreaterThan(1);
  const pane = panes[1];
  expect(pane.broken).toBe(false);

  await page.evaluate((p) => {
    const q = window.__qa;
    q.teleportTo(p.center[0], 0, 16.6, 0);      // server room, facing the corridor glazing
    q.lookAt(p.center[0], p.center[1], 14);
  }, pane);
  await weaponReady(page);

  // first round cracks the pane
  await page.evaluate(() => { window.__qa.mouse(0, true); window.advanceTime(60); window.__qa.mouse(0, false); });
  await adv(page, 400);
  let s = await state(page);
  expect(s.glassCracked).toBeGreaterThan(0);
  expect(s.glassBroken).toBe(0);

  // second round on the same pane breaks it
  await page.evaluate(() => { window.__qa.mouse(0, true); window.advanceTime(60); window.__qa.mouse(0, false); });
  await adv(page, 400);
  s = await state(page);
  expect(s.glassBroken).toBeGreaterThan(0);
  const paneAfter = (await qa(page, "qa.glassPanes('g_server_corr')")).find((p) => p.id === pane.id);
  expect(paneAfter.broken).toBe(true);
  // the empty frame stops blocking sight and movement (a 0.9 m sill wall below
  // the glazing still keeps a body from stepping through — that is geometry,
  // not the pane; see docs/reports/opus4-qa.md)
  expect(paneAfter.blocksSight).toBe(false);
  expect(paneAfter.blocksMove).toBe(false);

  // and the racket moved hostiles off their routes
  const busy = (await qa(page, 'qa.enemies()'))
    .filter((e) => e.alive && ['investigate', 'search', 'combat', 'suspect'].includes(e.state));
  expect(busy.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  await page.close();
});

test('S06: abort to title then start a fresh mission', async ({ browser }) => {
  const { page, errors } = await newGamePage(browser);
  await startMission(page);
  // dirty the first run: spend ammo, break glass, kill hostiles, burn the clock
  await page.evaluate(() => {
    const q = window.__qa;
    q.freezeAI(true); q.god(true);
    q.teleport('lobby'); q.lookAt(26, 1.7, 30);
    window.advanceTime(900);
    q.mouse(0, true); window.advanceTime(600); q.mouse(0, false);
    q.killEnemies();
    window.advanceTime(30_000);
  });
  const dirty = await state(page);
  expect(dirty.enemies.alive).toBe(0);
  expect(dirty.glassBroken).toBeGreaterThan(0);
  expect(dirty.mission.timerSec).toBeLessThan(700);

  await page.evaluate(() => window.__qa.abortToTitle());
  await expect(page.locator('#screen-title')).toBeVisible();
  let s = await state(page);
  expect(s.mode).toBe('title');
  expect(s.player).toBeUndefined();     // no gameplay state survives the abort

  await startMission(page, { difficulty: 'operator' });
  s = await state(page);
  expect(s.mode).toBe('playing');
  expect(s.player.room).toBe('plaza');
  expect(s.player.health).toBe(100);
  expect(s.player.armor).toBe(100);
  expect(s.weapon.mag).toBe(30);
  expect(s.enemies.alive).toBe(11);
  expect(s.glassBroken).toBe(0);
  expect(s.mission.phase).toBe('infiltrate');
  expect(s.mission.timerSec).toBeGreaterThan(700);
  expect(s.hostages.every((h) => h.state === 'bound')).toBe(true);
  expect(errors).toEqual([]);
  await page.close();
});

test('S46: difficulty scales hostile count and mission clock', async ({ browser }) => {
  const { page, errors } = await newGamePage(browser);

  await startMission(page, { difficulty: 'recruit' });
  let s = await state(page);
  expect(s.enemies.total).toBe(8);
  expect(s.mission.timerSec).toBeGreaterThan(880);
  expect(s.mission.timerSec).toBeLessThanOrEqual(900);

  await startMission(page, { difficulty: 'nightwatch' });
  s = await state(page);
  expect(s.enemies.total).toBe(14);
  expect(s.mission.timerSec).toBeGreaterThan(520);
  expect(s.mission.timerSec).toBeLessThanOrEqual(540);

  // S44: the hardest roster is also the cheapest way to get the player killed, so
  // check the defeat screen names the right reason while the mission is up.
  await page.evaluate(() => window.__qa.teleport('lobby'));
  await adv(page, 8000);
  for (let i = 0; i < 4 && (await state(page)).player.alive; i++) await adv(page, 8000);
  s = await state(page);
  expect(s.player.alive, 'nightwatch lobby kills an idle player').toBe(false);
  await adv(page, 3000);
  s = await state(page);
  expect(s.mode).toBe('defeat');
  expect(s.mission.result).toBe('defeat');
  expect(s.mission.resultReason, 'defeat is attributed to the player dying').toMatch(/Warden 2-1 is down/);
  await expect(page.locator('#screen-defeat')).toBeVisible();

  expect(errors).toEqual([]);
  await page.close();
});
