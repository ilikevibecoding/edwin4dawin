// AI observation scenarios: patrol movement, vision blockers, search after a
// lost contact, and the three-minute no-stuck watch. Scenarios S30, S32–S34.

import { test, expect } from '@playwright/test';
import { state, adv, startMission, qa, newGamePage } from './helpers.js';

test.describe('patrol → engagement → long observation (one mission, serial)', () => {
  test.describe.configure({ mode: 'serial' });
  let page, errors;

  test.beforeAll(async ({ browser }) => {
    ({ page, errors } = await newGamePage(browser));
    await startMission(page);
    await page.evaluate(() => { window.__qa.god(true); });
  });
  test.afterAll(async () => { await page?.close(); });

  test('S30: unseen patrols keep moving along their routes', async () => {
    // player parked outside on the plaza: nobody has a contact, everyone patrols
    await page.evaluate(() => window.__qa.teleport('spawn'));
    await adv(page, 500);
    const before = await qa(page, 'qa.enemies()');
    expect(before.filter((e) => e.alive).length).toBe(11);
    expect(before.filter((e) => e.state === 'patrol').length).toBeGreaterThanOrEqual(9);

    await adv(page, 8000);
    const after = await qa(page, 'qa.enemies()');
    const routed = before.filter((e) => e.alive).filter((e) => {
      const now = after.find((n) => n.id === e.id);
      return Math.hypot(now.position[0] - e.position[0], now.position[2] - e.position[2]) > 2;
    });
    // every roster entry with a multi-point route should have covered ground
    expect(routed.length).toBeGreaterThanOrEqual(9);
    expect(errors).toEqual([]);
  });

  test('S33: a responding squad either sweeps for the player or keeps a live contact', async () => {
    await page.evaluate(() => window.__qa.teleport('lobby'));
    await adv(page, 3500);
    const engaged = (await qa(page, 'qa.enemies()')).filter((e) => e.alive && e.state === 'combat').map((e) => e.id);
    expect(engaged.length).toBeGreaterThan(0);

    // slip away to the basement without firing a shot
    await page.evaluate(() => window.__qa.teleport('utility'));

    const states = new Map(engaged.map((id) => [id, new Set()]));
    const reacquired = new Set();
    let live = [];
    for (let i = 0; i < 10; i++) {                 // 50s of simulated time
      await adv(page, 5000);
      live = (await qa(page, 'qa.enemies()')).filter((e) => engaged.includes(e.id) && e.alive);
      for (const e of live) {
        states.get(e.id).add(e.state);
        if (e.seesPlayer) reacquired.add(e.id);
      }
    }
    expect(live.length).toBeGreaterThan(0);

    // A responder may only still be holding combat because it hunted the player
    // down (this AI tracks through the stairwell); the rest have to have swept.
    for (const e of live) {
      const seen = states.get(e.id);
      const swept = seen.has('search') || seen.has('investigate');
      expect(swept || reacquired.has(e.id), `${e.id} sat in combat without a contact (${[...seen]})`).toBe(true);
    }
    // the ones that genuinely lost the player give up and go back on route
    const lost = live.filter((e) => !reacquired.has(e.id));
    expect(lost.length).toBeGreaterThan(0);
    for (const e of lost) {
      expect(['investigate', 'search', 'patrol'], `${e.id} never left combat`).toContain(e.state);
    }
    expect(lost.some((e) => e.state === 'patrol')).toBe(true);
    expect(errors).toEqual([]);
  });

  test('S34: no enemy is permanently stuck across three minutes of alert', async () => {
    // wake the whole building: shots from the lobby are heard broadly
    await page.evaluate(() => {
      const qa = window.__qa;
      qa.teleport('lobby'); qa.lookYawPitch(180, 0);
      qa.mouse(0, true); window.advanceTime(400); qa.mouse(0, false);
    });
    await adv(page, 2000);

    const first = await qa(page, 'qa.enemies()');
    const maxMove = new Map(first.map((e) => [e.id, 0]));
    const start = new Map(first.map((e) => [e.id, e.position]));
    let last = first;
    for (let i = 0; i < 18; i++) {           // 18 × 10s = 3 minutes
      await adv(page, 10_000);
      last = await qa(page, 'qa.enemies()');
      for (const e of last) {
        const s = start.get(e.id);
        if (!s) continue;
        const d = Math.hypot(e.position[0] - s[0], e.position[2] - s[2]);
        if (d > maxMove.get(e.id)) maxMove.set(e.id, d);
      }
    }

    const stationary = last.filter((e) => e.alive && maxMove.get(e.id) < 1 && e.state !== 'combat');
    expect(stationary.map((e) => `${e.id}:${e.state}:${maxMove.get(e.id).toFixed(2)}m`)).toEqual([]);

    const s = await state(page);
    expect(s.enemies.stuckRescues).toBeLessThan(20);
    expect(s.mode).toBe('playing');
    expect(errors).toEqual([]);
  });

  // Runs last: it clears the roster, so keep it after the scenarios that need
  // the full complement of eleven.
  test('S33b: an isolated contact walks combat → search → patrol', async () => {
    const id = await page.evaluate(() => {
      const q = window.__qa;
      q.freezeAI(true); q.killEnemies();
      q.teleport('archive');
      const spawned = q.spawnEnemy('trooper', 44, 18);   // 4m north, same room
      q.faceEnemy(spawned, 44, 22);
      q.lookAt(44, 1.6, 18);
      q.freezeAI(false);
      return spawned;
    });
    await adv(page, 2500);
    const engaged = (await qa(page, 'qa.enemies()')).find((e) => e.id === id);
    expect(engaged.state).toBe('combat');
    expect(engaged.seesPlayer).toBe(true);

    // vanish to the far end of the basement: nothing left to re-acquire
    await page.evaluate(() => window.__qa.teleport('extraction'));
    const seen = [];
    for (let i = 0; i < 10; i++) {                       // 40s of simulated time
      await adv(page, 4000);
      const e = (await qa(page, 'qa.enemies()')).find((x) => x.id === id);
      seen.push(e.state);
      expect(e.seesPlayer, 'lost contact stays lost').toBe(false);
      if (e.state === 'patrol') break;
    }
    expect(seen.some((s) => s === 'search' || s === 'investigate'), `no sweep: ${seen}`).toBe(true);
    expect(seen[seen.length - 1], `never returned to patrol: ${seen}`).toBe('patrol');
    expect(errors).toEqual([]);
  });
});

test('S32: vision blockers — clear glass sees through, solid wall does not', async ({ browser }) => {
  const { page, errors } = await newGamePage(browser);
  await startMission(page);
  await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.god(true); });

  const panes = await qa(page, "qa.glassPanes('g_lobby_cub')");
  const clear = panes.find((p) => p.style === 'clear');
  const frosted = panes.find((p) => p.style === 'frosted');
  expect(clear).toBeTruthy();
  expect(frosted).toBeTruthy();

  // data-level contract: frosted glazing is authored as a sight blocker,
  // clear glazing is not. (Runtime LOS currently passes through both — see the
  // discrepancy note in docs/reports/opus4-qa.md.)
  expect(clear.blocksSight).toBe(false);
  expect(frosted.blocksSight).toBe(true);

  // clear pane: the sightline is open both in the raycaster and to the AI
  const [cx, cy] = clear.center;
  expect(await qa(page, `qa.lineOfSight([${cx}, ${cy}, 32], [${cx}, ${cy}, 28])`)).toBe(true);
  // solid drywall between the two restrooms blocks it
  expect(await qa(page, 'qa.lineOfSight([3, 1.6, 35], [3, 1.6, 40])')).toBe(false);
  // and so does the floor slab between levels
  expect(await qa(page, 'qa.lineOfSight([48, 1.6, 8], [48, -2.4, 8])')).toBe(false);

  // an enemy on the cubicles side of the clear pane acquires the player through it
  const glassSeer = await page.evaluate((x) => {
    const q = window.__qa;
    q.killEnemies();                          // isolate: only the staged pair matters
    q.teleportTo(x, 0, 32.5, 0);              // lobby side, facing north
    const id = q.spawnEnemy('trooper', x, 27.5); // cubicles side, 5m through the glass
    q.faceEnemy(id, x, 32.5);
    return id;
  }, cx);
  await adv(page, 200);
  await page.evaluate((x) => window.__qa.lookAt(x, 1.6, 27.5), cx);
  await page.evaluate(() => window.__qa.freezeAI(false));
  await adv(page, 1200);
  let seer = (await qa(page, 'qa.enemies()')).find((e) => e.id === glassSeer);
  expect(seer.seesPlayer, 'enemy sees through clear glazing').toBe(true);

  // same staging with a solid wall between the two restrooms: no contact
  const wallSeer = await page.evaluate(() => {
    const q = window.__qa;
    q.killEnemies(); q.freezeAI(true);
    q.teleportTo(3, 0, 34, 180);              // restroom_m, facing south
    const id = q.spawnEnemy('trooper', 3, 40); // restroom_w, wall at z=37 between
    q.faceEnemy(id, 3, 34);
    return id;
  });
  await adv(page, 200);
  await page.evaluate(() => { window.__qa.lookAt(3, 1.6, 40); window.__qa.freezeAI(false); });
  await adv(page, 1200);
  seer = (await qa(page, 'qa.enemies()')).find((e) => e.id === wallSeer);
  expect(seer.seesPlayer, 'wall blocks the contact').toBe(false);
  expect(seer.state).not.toBe('combat');

  expect(errors).toEqual([]);
  await page.close();
});
