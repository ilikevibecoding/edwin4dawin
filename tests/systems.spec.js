// PW-18 quality tiers and resolution scale, PW-21 QA hook sanity, PW-22 a console-clean
// three-minute playthrough, and PW-25 the stepped frame budget on quality=low.
import { test, expect } from '@playwright/test';
import { boot, expectNoErrors, setSetting, readSettings } from './helpers/game.js';

test.describe('systems', () => {
  test('PW-18 quality tiers and resolution scale reconfigure the renderer live', async ({ page }) => {
    const game = await boot(page);
    await game.click('settings');
    await expect(page.locator('#screen-settings')).toHaveClass(/visible/);

    // Baseline: the harness boots on 'low' at half resolution.
    const low = await game.renderInfo();
    expect(low.shadowMap, 'low uses a 1024 shadow map').toBe(1024);
    expect(low.shadowsEnabled).toBe(true);
    expect(low.canvas[0], 'half resolution scale halves the drawing buffer').toBe(Math.round(1920 * 0.5));

    // Each tier must move the knobs the tier table promises.
    const tiers = { medium: 2048, high: 4096, ultra: 4096 };
    const fillLights = { low: 6, medium: 12, high: 20, ultra: 28 };
    for (const [tier, shadowSize] of Object.entries(tiers)) {
      await setSetting(page, 'quality', tier);
      const info = await game.renderInfo();
      expect(info.shadowMap, `${tier} shadow map size`).toBe(shadowSize);
      expect(await game.probe(() => window.__game.renderer.profile.fillLights),
        `${tier} fill-light budget`).toBe(fillLights[tier]);
      expect(await readSettings(page)).toMatchObject({ quality: tier });
    }

    // Resolution scale drives the drawing buffer without touching the CSS size.
    await setSetting(page, 'quality', 'low');
    for (const scale of [1, 0.75, 0.5]) {
      await setSetting(page, 'resolutionScale', scale);
      const info = await game.renderInfo();
      expect(info.pixelRatio, `pixel ratio at scale ${scale}`).toBeCloseTo(scale, 3);
      expect(info.canvas, `drawing buffer at scale ${scale}`)
        .toEqual([Math.round(1920 * scale), Math.round(1080 * scale)]);
      expect(info.css, 'the canvas keeps filling the viewport').toEqual([1920, 1080]);
    }

    // The tier is honoured by a mission started afterwards, not just by the menu.
    await game.click('back');
    await game.quickStart({ freezeAI: true });
    await game.adv(200);
    expect((await game.renderInfo()).shadowMap).toBe(1024);

    await expectNoErrors(game, 'quality');
  });

  test('PW-21 every QA hook responds sensibly', async ({ page }) => {
    const game = await boot(page);
    await game.quickStart({ freezeAI: true, god: true });
    await game.adv(200);

    // ---- teleports: every advertised checkpoint must land the player on solid, navigable ground.
    // The whole sweep runs in one page call; thirty separate round trips would each pay for a
    // presented frame (see the note in tests/helpers/game.js).
    const checkpoints = await game.qa('checkpoints');
    expect(checkpoints.length, 'the layout publishes a useful set of checkpoints').toBeGreaterThan(20);
    const bad = await game.probe((names) => {
      const problems = [];
      for (const n of names) {
        const requested = window.__qa.teleport(n);
        window.advanceTime(60);
        const m = window.__game.mission, p = m.player;
        const pos = [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)];
        if (typeof requested === 'string') problems.push(`${n}: ${requested}`);
        else if (!pos.every(Number.isFinite)) problems.push(`${n}: non-finite position ${pos}`);
        else if (m.nav.nearestNode(p.pos.x, p.pos.y, p.pos.z) < 0) problems.push(`${n}: off-navmesh at ${pos}`);
      }
      return problems;
    }, checkpoints);
    expect(bad, 'every checkpoint teleports onto navigable ground').toEqual([]);
    expect(await game.qa('teleport', 'no-such-checkpoint'))
      .toContain('unknown checkpoint');

    // ---- weapon hooks
    expect(await game.qa('selectPrimary', 'meridian-lr8')).toBe('meridian-lr8');
    await game.adv(900);
    expect((await game.weapon()).id).toBe('meridian-lr8');
    // selectSlot reports the slot that is live at call time, not the requested one: the switch has
    // to holster and draw first (see NS-5 in docs/reports/wp-008.md).
    expect(typeof await game.qa('selectSlot', 1)).toBe('number');
    await game.adv(900);
    expect((await game.weapon()).slot, 'the requested slot is equipped once the draw finishes').toBe(1);
    await game.fire(200);
    await game.qa('refillAmmo');
    const refilled = await game.weapon();
    expect(refilled.mag, 'refillAmmo tops the magazine back up').toBeGreaterThan(0);

    // ---- spawning and killing
    const spawned = await game.qa('spawnEnemy', 'trooper');
    expect(typeof spawned).toBe('string');
    expect(await game.probe((id) => !!window.__game.mission.enemies.find((e) => e.id === id), spawned)).toBe(true);
    const shotgunner = await game.qa('spawnEnemy', 'shotgunner', 'sc-east');
    expect(await game.enemy(shotgunner)).toMatchObject({ alive: true });
    const listed = await game.enemies();
    expect(listed.length).toBeGreaterThan(5);
    expect(listed[0]).toMatchObject({
      id: expect.any(String), state: expect.any(String), hp: expect.any(Number), alive: true,
    });
    expect(await game.qa('killEnemies'), 'killEnemies reports how many it dropped').toBeGreaterThan(0);
    await game.adv(200);
    expect((await game.state()).enemiesRemaining).toBe(0);

    // ---- freeze / god / noclip round-trip
    expect(await game.qa('freezeAI', true)).toBe(true);
    expect(await game.qa('freezeAI', false)).toBe(false);
    expect(await game.qa('god', true)).toBe(true);
    expect(await game.qa('noclip', true)).toBe(true);
    expect(await game.qa('noclip', false)).toBe(false);

    // ---- lighting scenarios: each must apply without throwing and leave a working rig.
    const sunIntensities = {};
    for (const scenario of ['neutral', 'dark', 'emergency', 'default']) {
      expect(await game.qa('setLighting', scenario)).toBe(scenario);
      await game.adv(300);
      const rig = await game.probe(() => {
        const l = window.__game.mission.map.lights;
        let visible = 0;
        window.__game.mission.scene.traverse((o) => { if (o.isLight && o.visible) visible++; });
        return { scenario: l.scenario(), visible, sun: +l.sun.intensity.toFixed(3) };
      });
      expect(rig.scenario, 'the scenario is recorded').toBe(scenario);
      expect(rig.visible, `${scenario} keeps a working light rig`).toBeGreaterThan(0);
      sunIntensities[scenario] = rig.sun;
    }
    expect(sunIntensities.dark, 'the dark scenario dims the sun')
      .toBeLessThan(sunIntensities.default);

    // ---- debug visualisations toggle cleanly
    expect(await game.qa('showCollision', true)).toBe(true);
    expect(await game.qa('showCollision', false)).toBe(false);
    expect(await game.qa('showNav', true), 'showNav reports the node count').toBeGreaterThan(1000);
    expect(await game.qa('showNav', false)).toBe(false);
    expect(await game.qa('showAssetIds', true)).toBe(true);
    expect(await game.qa('showAssetIds', false)).toBe(false);

    // ---- nav diagnostics
    const nav = await game.qa('navStats');
    expect(nav.nodes).toBeGreaterThan(1000);
    expect(nav.bakeMs).toBeGreaterThan(0);
    const path = await game.qa('navPath', 'lobby', 'garage');
    expect(path, 'the lobby and the extraction garage are connected').not.toBeNull();
    expect(path.waypoints).toBeGreaterThan(1);
    expect(await game.qa('navConnected', [17, 0, 28], [7, 0, 6])).toMatchObject({ connected: true });

    // ---- asset gallery
    const assets = await game.qa('gallery', 'list');
    expect(Array.isArray(assets), 'gallery("list") returns ids').toBe(true);
    expect(assets.length).toBeGreaterThan(0);
    const shown = await game.qa('gallery', assets[0]);
    expect(String(shown)).toContain(assets[0]);
    expect(await game.qa('gallery', 'unknown-asset-id')).toContain('unknown');
    expect(await game.qa('gallery', 'off')).toBe('off');
    expect((await game.qa('listAssets'))[0]).toMatchObject({ id: expect.any(String), name: expect.any(String) });

    // ---- cameras
    await game.qa('camera', 'lobby');
    await game.adv(120);
    expect(await game.probe(() => !!window.__game.cameraOverride)).toBe(true);
    await game.qa('cameraOff');
    expect(await game.probe(() => !!window.__game.cameraOverride)).toBe(false);

    // ---- diagnostics
    const perf = await game.qa('perf');
    expect(perf).toMatchObject({ drawCalls: expect.any(Number), triangles: expect.any(Number) });
    expect(perf.drawCalls).toBeGreaterThan(0);
    expect(await game.qa('errors')).toEqual([]);
    expect(await game.qa('pos')).toHaveLength(3);
    expect(await game.qa('state')).toMatchObject({ mode: 'playing' });
    expect(await game.qa('setObjective', 'nonsense')).toContain('stages:');

    await expectNoErrors(game, 'qa-hooks');
  });

  test('PW-22 a scripted playthrough of both floors leaves the console clean', async ({ page }) => {
    // The longest single stretch in the suite. Simulated span is 90 s by default and three minutes
    // when NS_LONG_PLAYTHROUGH is set, because a mission with the roster alerted currently costs
    // roughly 1-3x real time: pathfinding eats most of the step (NS-1 in docs/reports/wp-008.md).
    const long = !!process.env.NS_LONG_PLAYTHROUGH;
    test.setTimeout(long ? 900_000 : 300_000);
    const game = await boot(page);
    await game.quickStart({ god: true });
    await game.adv(600);

    // The route runs inside a single page.evaluate on purpose. Driving it from Node would mean a
    // few hundred CDP round trips, and each round trip that ends with a rendered frame costs
    // seconds under software WebGL; the same script run in-page costs milliseconds per step. It
    // still drives the game only through __qa + advanceTime, so it stays deterministic.
    const run = await page.evaluate((dwellMs) => {
      const qa = window.__qa;
      const route = ['plaza', 'lobby', 'gallery', 'wait', 'sec', 'stair-a', 'copy', 'corr-e', 'it',
        'server', 'mech', 'loading', 'sc-east', 'sc-mid', 'sc-west', 'break', 'janitor', 'rr-m',
        'stair-b', 'cubes', 'cubes-west', 'print', 'corr-n', 'conference', 'garage'];
      let simMs = 0;
      const step = (ms) => { window.advanceTime(ms); simMs += ms; };
      const hold = (code, ms) => { qa.press(code); step(ms); qa.release(code); };
      const fire = (ms) => { qa.mouse(0, true); step(ms); qa.mouse(0, false); step(60); };
      const visited = [];
      const wall0 = performance.now();

      for (let i = 0; i < route.length; i++) {
        const w0 = performance.now();
        qa.teleport(route[i]);
        step(dwellMs);
        qa.setYawPitch((i * 47) % 360, 0);
        hold(['KeyW', 'KeyA', 'KeyS', 'KeyD'][i % 4], 1200);
        qa.releaseAll();

        // Rotate the action so the whole system surface gets touched along the way.
        switch (i % 5) {
          case 0: fire(400); break;                                  // sustained fire + auto-reload
          case 1: hold('KeyR', 40); step(2800); break;               // manual reload
          case 2: qa.selectSlot(1 + (i % 5)); step(900); break;      // weapon switching
          case 3: hold('KeyE', 40); step(400); break;                // doors / hostages in range
          case 4: hold('KeyC', 40); hold('Space', 60); step(900); break; // crouch + jump
        }
        step(600);
        visited.push({ spot: route[i], simMs, wallMs: Math.round(performance.now() - w0), mode: window.__game.state });
        if (window.__game.state !== 'playing') break; // a defeat would invalidate the rest
      }
      const routeWallMs = Math.round(performance.now() - wall0);

      // Both devices, then run the objective chain out so the end-of-mission path is covered too.
      const w1 = performance.now();
      qa.selectSlot(4); step(700); fire(40); step(2500);
      qa.selectSlot(5); step(700); fire(40); step(2500);
      qa.setObjective('escorted'); step(20000);
      qa.resetMission(); step(1500);
      const tailWallMs = Math.round(performance.now() - w1);

      return { simMs, visited, mode: window.__game.state, routeWallMs, tailWallMs };
    }, long ? 5000 : 1400);

    // eslint-disable-next-line no-console
    console.log(`PW-22: ${Math.round(run.simMs / 1000)} s simulated in `
      + `${((run.routeWallMs + run.tailWallMs) / 1000).toFixed(1)} s wall `
      + `(route ${(run.routeWallMs / 1000).toFixed(1)} s, tail ${(run.tailWallMs / 1000).toFixed(1)} s)`);

    expect(run.visited.map((v) => v.spot), 'the whole route was walked').toHaveLength(25);
    expect(run.simMs, 'the scripted route covers the intended simulated span')
      .toBeGreaterThanOrEqual(long ? 180_000 : 90_000);

    const state = await game.state();
    expect(state.mode, 'the game is still running the mission at the end').toBe('playing');
    expect(Number.isFinite(state.player.position[0])).toBe(true);
    expect(state.enemiesRemaining, 'the reset restored the roster').toBeGreaterThan(5);
    await expectNoErrors(game, 'playthrough');

    // Warnings are not failures, but a regression usually shows up here first.
    const warnings = await game.warnings();
    if (warnings.length) {
      // eslint-disable-next-line no-console
      console.log(`PW-22: ${warnings.length} console warning(s): ${JSON.stringify(warnings.slice(0, 5))}`);
    }
  });

  test('PW-25 the stepped simulation stays inside its frame budget on quality=low', async ({ page }) => {
    const game = await boot(page);
    await game.quickStart({ god: true });
    await game.qa('teleport', 'lobby');
    await game.adv(1000);

    // The simulation is measured on its own here. advanceTime() steps at a fixed 1/120 s, so the
    // per-step cost is what has to fit the budget, and this spec runs with rendering on demand so
    // no frames are mixed into the sample. Rendering is measured separately in
    // docs/perf-baseline.md, because a software rasteriser says nothing about a real GPU.
    const sim = await game.probe(() => {
      const samples = [];
      for (let i = 0; i < 12; i++) {
        const t0 = performance.now();
        window.advanceTime(1000); // 120 fixed steps
        samples.push((performance.now() - t0) / 120);
      }
      samples.sort((a, b) => a - b);
      return {
        medianMs: +samples[6].toFixed(3),
        minMs: +samples[0].toFixed(3),
        maxMs: +samples[11].toFixed(3),
        enemies: window.__game.mission.enemies.filter((e) => e.alive).length,
      };
    });

    // eslint-disable-next-line no-console
    console.log(`PW-25 sim step: min ${sim.minMs} ms, median ${sim.medianMs} ms, `
      + `max ${sim.maxMs} ms, ${sim.enemies} live hostiles`);

    // A 120 Hz fixed step has 8.33 ms of budget. The assertion is on the median because this
    // machine is shared: individual samples pick up OS scheduling and software-rasteriser stalls
    // that say nothing about the game. The max only has to rule out a runaway.
    expect(sim.medianMs, 'median sim step fits well inside the 8.33 ms fixed timestep').toBeLessThan(3);
    expect(sim.maxMs, 'no runaway sim step').toBeLessThan(120);

    await expectNoErrors(game, 'frame-budget');
  });

  test('PW-25 hostiles chasing across floors respect their re-path backoff', async ({ page }) => {
    // NS-7 in docs/reports/wp-008.md. A hostile re-paths at most once or twice a second by design
    // (`repathT = 0.9 + rng * 0.7` in src/ai/enemy.js). Under a cross-floor chase one hostile is
    // observed asking 76 times a second, because the clamp safety net nulls the path and the
    // `!this.path` arm of the guard then fires before the 0.2 s backoff it just set is ever read.
    // Expected-to-fail until Opus 3 fixes it; when it passes, drop the annotation.
    test.fail();
    const game = await boot(page);
    await game.quickStart({ god: true });

    const rate = await game.probe(() => {
      const m = window.__game.mission;
      window.__qa.teleport('cubes'); // floor 2: every hostile below has to route via a stairwell
      window.__qa.god(true);
      const target = m.player.pos.clone();
      for (const e of m.enemies) {
        if (!e.alive) continue;
        e._enterCombat();
        e.lastKnown = target.clone(); // what perception and hearing would have set
      }
      window.advanceTime(2000); // let the chase settle before sampling

      const perEnemy = new Map();
      const realFind = m.findPath.bind(m);
      m.findPath = (from, to) => {
        let best = null, bd = Infinity;
        for (const e of m.enemies) {
          const d = Math.hypot(e.pos.x - from.x, e.pos.y - from.y, e.pos.z - from.z);
          if (d < bd) { bd = d; best = e; }
        }
        if (best) perEnemy.set(best.id, (perEnemy.get(best.id) || 0) + 1);
        return realFind(from, to);
      };
      const seconds = 4;
      window.advanceTime(seconds * 1000);
      m.findPath = realFind;

      const live = m.enemies.filter((e) => e.alive).length;
      let worst = { id: null, perSec: 0 };
      for (const [id, n] of perEnemy) {
        if (n / seconds > worst.perSec) worst = { id, perSec: +(n / seconds).toFixed(1) };
      }
      const total = [...perEnemy.values()].reduce((a, b) => a + b, 0);
      return { live, worst, meanPerHostilePerSec: +(total / live / seconds).toFixed(2) };
    });

    // The design interval is 0.9-1.6 s, so about one request a second with a little slack for the
    // legitimate resets (a new alert, arriving at a waypoint, stuck recovery).
    expect(rate.worst.perSec, `${rate.worst.id} asked for a route this many times a second`)
      .toBeLessThan(4);
    expect(rate.meanPerHostilePerSec, 'mean re-path rate across the roster').toBeLessThan(2);
  });
});
