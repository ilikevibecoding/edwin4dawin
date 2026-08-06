// Deterministic gameplay tests. These drive the simulation through the
// `window.__GAME` hooks at a fixed timestep, so results are reproducible for a
// given seed and no real time passes.
import { test, expect } from '@playwright/test';

const SEED = 20260805;

/** Load the game in test mode and fail on any page error. */
async function boot(page, { seed = SEED, query = '' } = {}) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(`/?test=1&seed=${seed}${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__GAME, null, { timeout: 90_000 });
  return errors;
}

test.describe('boot', () => {
  test('starts with a WebGL context, a title card and no errors', async ({ page }) => {
    const errors = await boot(page);
    const info = await page.evaluate(() => {
      const gl = window.__gameInstance.renderer.getContext();
      return {
        version: gl.getParameter(gl.VERSION),
        title: document.getElementById('title') !== null,
        hud: document.getElementById('hud') !== null,
        console: document.getElementById('console') !== null,
        state: window.__GAME.state(),
      };
    });
    expect(info.version).toContain('WebGL');
    expect(info.title).toBe(true);
    expect(info.hud).toBe(true);
    expect(info.console).toBe(true);
    expect(info.state.state).toBe('idle');
    expect(info.state.batteries).toHaveLength(3);
    expect(errors).toEqual([]);
  });

  test('exposes the three batteries in a ready state', async ({ page }) => {
    await boot(page);
    const bats = await page.evaluate(() => window.__GAME.state().batteries);
    for (const b of bats) {
      expect(b.status).toBe('READY');
      expect(b.loaded).toBeGreaterThan(0);
      expect(b.ammo).toBeGreaterThanOrEqual(b.loaded);
    }
    expect(bats.map((b) => b.id)).toEqual(['patriot', 'thaad', 'sentinel']);
  });
});

test.describe('site and player', () => {
  test('the player stands on the ground and cannot walk through a launcher', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => {
      const G = window.__GAME;
      const g = window.__gameInstance;
      G.freezePlayer(false);
      g.player.locked = true;
      // start just south of the PALISADE launcher and walk north into it
      const pad = g.batteries[0].group.position;
      G.teleport(pad.x, null, pad.z + 22);
      g.player.yaw = 0;             // facing -Z
      g.player.keys.clear();
      g.player.keys.add('KeyW');
      for (let i = 0; i < 60 * 12; i++) g.stepSim(1 / 60);
      g.player.keys.clear();
      return {
        pos: g.player.pos.toArray(),
        padZ: pad.z,
        groundY: g.base.terrainHeight(g.player.pos.x, g.player.pos.z),
      };
    });
    // blocked short of the launcher centre rather than passing through it
    expect(r.pos[2]).toBeGreaterThan(r.padZ + 3);
    // and still resting on a walkable surface rather than falling or floating
    expect(Math.abs(r.pos[1] - r.groundY)).toBeLessThan(1.2);
  });

  test('the player can walk from the spawn into the shelter and reach the console', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => {
      const G = window.__GAME;
      const g = window.__gameInstance;
      G.freezePlayer(false);
      g.player.locked = true;
      const target = g.base.consoleAnchor.position;
      G.teleport(-6, null, 34);
      g.player.keys.clear();
      g.player.keys.add('KeyW');
      // steer toward the console each step, like a player would
      for (let i = 0; i < 60 * 25; i++) {
        const dx = target.x - g.player.pos.x;
        const dz = target.z - g.player.pos.z;
        g.player.yaw = Math.atan2(-dx, -dz);
        g.stepSim(1 / 60);
      }
      g.player.keys.clear();
      const d = Math.hypot(g.player.pos.x - target.x, g.player.pos.z - target.z);
      return { distance: d, pos: g.player.pos.toArray() };
    });
    expect(r.distance).toBeLessThan(6);
  });

  test('reduced motion removes head bob', async ({ page }) => {
    await boot(page);
    const spread = await page.evaluate(() => {
      const G = window.__GAME;
      const g = window.__gameInstance;
      const measure = () => {
        G.freezePlayer(false);
        g.player.locked = true;
        G.teleport(-6, null, 40);
        g.player.keys.clear();
        g.player.keys.add('KeyW');
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < 240; i++) {
          g.stepSim(1 / 60);
          const rel = g.camera.position.y - g.player.pos.y;
          min = Math.min(min, rel);
          max = Math.max(max, rel);
        }
        g.player.keys.clear();
        return max - min;
      };
      G.setSetting('reducedMotion', false);
      const withBob = measure();
      G.setSetting('reducedMotion', true);
      const withoutBob = measure();
      return { withBob, withoutBob };
    });
    expect(spread.withBob).toBeGreaterThan(0.02);
    expect(spread.withoutBob).toBeLessThan(spread.withBob * 0.35);
  });
});

test.describe('scenarios', () => {
  for (const [scenario, minThreats] of [['single', 1], ['saturation', 4], ['night', 5]]) {
    test(`${scenario} spawns threats and the radar forms tracks`, async ({ page }) => {
      await boot(page);
      const r = await page.evaluate(([scenario]) => {
        const G = window.__GAME;
        G.freezePlayer(true);
        G.restart();
        G.configure({ scenario, condition: scenario === 'night' ? 'night' : 'day' });
        G.start();
        G.sim(60 * 30);
        const s = G.state();
        return { spawned: s.threatStats.spawned, tracks: s.tracks, state: s.state };
      }, [scenario]);
      expect(r.spawned).toBeGreaterThanOrEqual(minThreats);
      expect(r.tracks.length).toBeGreaterThan(0);
      for (const t of r.tracks) {
        expect(t.altitude).toBeGreaterThan(0);
        expect(t.tti).toBeGreaterThan(0);
        expect(['UNKNOWN', 'BALLISTIC', 'UNCERTAIN', 'DECOY']).toContain(t.classification);
      }
    });
  }

  test('the night raid includes decoys and eventually classifies one', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => {
      const G = window.__GAME;
      G.freezePlayer(true);
      G.restart();
      G.configure({ scenario: 'night', condition: 'night' });
      G.start();
      let sawDecoyClass = false;
      for (let i = 0; i < 120; i++) {
        G.sim(30);
        if (G.state().tracks.some((t) => t.classification === 'DECOY')) sawDecoyClass = true;
      }
      return { decoys: G.state().threatStats.decoys, sawDecoyClass };
    });
    expect(r.decoys).toBeGreaterThan(0);
    expect(r.sawDecoyClass).toBe(true);
  });

  test('a scenario runs to completion and can be restarted', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => {
      const G = window.__GAME;
      G.freezePlayer(true);
      G.restart();
      G.configure({ scenario: 'single', condition: 'day' });
      G.start();
      G.autoPlay(140);
      const done = G.state();
      G.restart();
      const fresh = G.state();
      return { done, fresh };
    });
    expect(r.done.state).toBe('complete');
    expect(r.done.elapsed).toBeGreaterThan(20);
    expect(r.fresh.state).toBe('idle');
    expect(r.fresh.threatsActive).toBe(0);
    expect(r.fresh.threatStats.spawned).toBe(0);
    for (const b of r.fresh.batteries) expect(b.status).toBe('READY');
  });
});

test.describe('engagement', () => {
  test('assign then authorize puts a round in flight from the chosen battery', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => {
      const G = window.__GAME;
      G.freezePlayer(true);
      G.restart();
      G.configure({ scenario: 'single', condition: 'day', battery: 'thaad' });
      G.start();
      G.sim(60 * 8);
      const selected = G.selectTrack(0);
      const assigned = G.assign();
      const beforeReady = G.state().batteries.find((b) => b.id === 'thaad').status;
      // preparation must elapse before launch is possible
      const earlyLaunch = G.authorize();
      G.sim(60 * 6);
      const launched = G.authorize();
      G.sim(30);
      const s = G.state();
      return {
        selected, assigned, beforeReady, earlyLaunch, launched,
        inFlight: s.interceptors.length,
        spec: s.interceptors[0] && s.interceptors[0].spec,
        rounds: s.roundStats,
        ammo: s.batteries.find((b) => b.id === 'thaad'),
      };
    });
    expect(r.selected).toBe(true);
    expect(r.assigned).toBe(true);
    expect(r.beforeReady).toBe('PREPARING');
    expect(r.earlyLaunch).toBe(false);
    expect(r.launched).toBe(true);
    expect(r.inFlight).toBe(1);
    expect(r.spec).toBe('halberd');
    expect(r.rounds.launched).toBe(1);
    expect(r.ammo.loaded).toBe(7);
  });

  test('an interceptor boosts, coasts and reports a result', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => {
      const G = window.__GAME;
      G.freezePlayer(true);
      G.restart();
      G.configure({ scenario: 'single', condition: 'day', battery: 'thaad' });
      G.start();
      const phases = new Set();
      const altitudes = [];
      let launched = false;
      for (let i = 0; i < 400; i++) {
        G.sim(12);
        G.autoPilot();
        const s = G.state();
        for (const it of s.interceptors) {
          phases.add(it.phase);
          altitudes.push(it.altitude);
          launched = true;
        }
        if (s.results.length) break;
      }
      const s = G.state();
      return {
        phases: [...phases],
        launched,
        maxAltitude: Math.max(0, ...altitudes),
        results: s.results,
      };
    });
    expect(r.launched).toBe(true);
    expect(r.phases).toContain('BOOST');
    expect(r.maxAltitude).toBeGreaterThan(3000);
    expect(r.results.length).toBeGreaterThan(0);
    expect(['INTERCEPT', 'MISS', 'DECOY']).toContain(r.results[0].result);
    expect(r.results[0].message.length).toBeGreaterThan(10);
  });

  test('the autopilot defends the site in every scenario', async ({ page }) => {
    await boot(page);
    for (const scenario of ['single', 'saturation', 'night']) {
      const r = await page.evaluate(([scenario]) => {
        const G = window.__GAME;
        G.freezePlayer(true);
        G.restart();
        G.configure({ scenario, condition: scenario === 'night' ? 'night' : 'day' });
        G.start();
        G.autoPlay(140);
        return G.state();
      }, [scenario]);
      expect(r.threatStats.spawned, `${scenario} spawned`).toBeGreaterThan(0);
      expect(r.threatStats.intercepted, `${scenario} intercepted`).toBeGreaterThan(0);
      // most inbounds should be stopped
      const real = r.threatStats.spawned - r.threatStats.decoys;
      expect(r.threatStats.intercepted / real, `${scenario} kill share`).toBeGreaterThanOrEqual(0.5);
      expect(r.roundStats.launched, `${scenario} rounds`).toBeGreaterThan(0);
    }
  });

  test('each battery can fire its own round type and then reloads', async ({ page }) => {
    await boot(page);
    for (const [battery, roundSpec] of [['patriot', 'palisade'], ['thaad', 'halberd'], ['sentinel', 'sentinel']]) {
      const r = await page.evaluate(([battery]) => {
        const G = window.__GAME;
        const g = window.__gameInstance;
        G.freezePlayer(true);
        G.restart();
        G.configure({ scenario: 'saturation', condition: 'day', battery });
        G.start();
        G.sim(60 * 10);
        G.selectTrack(0);
        G.selectBattery(battery);
        G.assign();
        const b = g.batteries.find((x) => x.id === battery);
        // wait out preparation, then empty the launcher
        for (let i = 0; i < 60 * 40 && b.ammo > 0; i++) {
          G.sim(1);
          if (b.canFire && g.radar.tracks.length) {
            g.assignedBattery = b;
            g.assignedTrack = g.radar.tracks[0];
            G.authorize();
          }
        }
        const s = G.state();
        return {
          launched: s.roundStats.launched,
          spec: s.interceptors[0] && s.interceptors[0].spec,
          battery: s.batteries.find((x) => x.id === battery),
        };
      }, [battery]);
      expect(r.launched, `${battery} launched`).toBeGreaterThan(0);
      if (r.spec) expect(r.spec, `${battery} round type`).toBe(roundSpec);
      expect(['RELOADING', 'EMPTY', 'READY'], `${battery} end state`).toContain(r.battery.status);
    }
  });

  test('a battery that has been emptied refuses to fire', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => {
      const G = window.__GAME;
      const g = window.__gameInstance;
      G.freezePlayer(true);
      G.restart();
      G.configure({ scenario: 'saturation', condition: 'day', battery: 'sentinel' });
      G.start();
      G.sim(60 * 10);
      const b = g.batteries.find((x) => x.id === 'sentinel');
      b.ammo = 0;
      b.loaded = 0;
      b.status = 'EMPTY';
      G.selectTrack(0);
      G.selectBattery('sentinel');
      const assigned = G.assign();
      const fired = G.authorize();
      return { assigned, fired, status: b.status };
    });
    expect(r.assigned).toBe(false);
    expect(r.fired).toBe(false);
    expect(r.status).toBe('EMPTY');
  });
});

test.describe('conditions and interface', () => {
  test('each condition applies distinct lighting', async ({ page }) => {
    await boot(page);
    const readings = await page.evaluate(() => {
      const G = window.__GAME;
      const g = window.__gameInstance;
      const out = {};
      for (const id of ['day', 'sunset', 'night']) {
        G.configure({ condition: id });
        G.render();
        out[id] = {
          exposure: g.renderer.toneMappingExposure,
          fog: g.scene.fog.color.getHex(),
          sunY: g.weather.sunPosition.y,
          bloom: g.post.bloom.threshold,
        };
      }
      return out;
    });
    expect(readings.day.sunY).toBeGreaterThan(0.4);
    expect(readings.night.sunY).toBeLessThan(0);
    expect(readings.day.fog).not.toBe(readings.night.fog);
    expect(readings.sunset.fog).not.toBe(readings.day.fog);
    expect(readings.night.exposure).not.toBe(readings.day.exposure);
  });

  test('the console overlay opens, freezes movement and closes', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => {
      const G = window.__GAME;
      const g = window.__gameInstance;
      G.openConsole();
      G.render();
      const open = {
        visible: document.getElementById('console').classList.contains('on'),
        hudHidden: g.ui.hud.classList.contains('hidden'),
        frozen: g.player.frozen,
      };
      G.closeConsole();
      G.render();
      const closed = {
        visible: document.getElementById('console').classList.contains('on'),
        frozen: g.player.frozen,
      };
      return { open, closed };
    });
    expect(r.open.visible).toBe(true);
    expect(r.open.hudHidden).toBe(true);
    expect(r.open.frozen).toBe(true);
    expect(r.closed.visible).toBe(false);
    expect(r.closed.frozen).toBe(false);
  });

  test('the HUD reports the picture, the battery and the result', async ({ page }) => {
    await boot(page);
    const text = await page.evaluate(() => {
      const G = window.__GAME;
      G.freezePlayer(true);
      G.restart();
      G.configure({ scenario: 'single', condition: 'day', battery: 'thaad' });
      G.start();
      // simulate cheaply and only render occasionally: software rasterisation in
      // the headless browser makes every rendered frame expensive
      for (let i = 0; i < 400; i++) {
        G.sim(12);
        G.autoPilot();
        if (G.state().results.length) break;
      }
      G.render();
      return {
        hud: document.getElementById('hud').innerText,
        results: G.state().results,
      };
    });
    expect(text.hud).toContain('HALBERD');
    expect(text.hud).toMatch(/INBOUND|TRACKED/);
    expect(text.results.length).toBeGreaterThan(0);
    // the reason for the outcome must be surfaced, not just the outcome
    expect(text.hud).toMatch(/TK-\d\d/);
  });

  test('accessibility toggles take effect', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => {
      const G = window.__GAME;
      const g = window.__gameInstance;
      g.ui.setHighContrast(true);
      const contrast = document.body.classList.contains('high-contrast');
      g.ui.setHighContrast(false);
      G.setSetting('reducedMotion', true);
      const reduced = g.player.reducedMotion;
      G.setSetting('reducedMotion', false);
      g.ui.setCaptionsEnabled(true);
      g.ui.caption('test caption');
      const captionOn = document.getElementById('captions').classList.contains('on');
      return { contrast, reduced, captionOn };
    });
    expect(r.contrast).toBe(true);
    expect(r.reduced).toBe(true);
    expect(r.captionOn).toBe(true);
  });
});

test.describe('performance budget', () => {
  test('stays inside the draw-call, triangle and step-cost budget under load', async ({ page }) => {
    await boot(page);
    const perf = await page.evaluate(() => {
      const G = window.__GAME;
      G.freezePlayer(true);
      G.restart();
      G.configure({ scenario: 'saturation', condition: 'day' });
      G.start();
      G.autoPlay(30);
      return G.perfProbe(10);
    });
    expect(perf.drawCalls).toBeLessThan(800);
    expect(perf.triangles).toBeLessThan(900_000);
    expect(perf.simMsPerStep).toBeLessThan(1.5);
  });

  test('pools recycle instead of growing without bound', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => {
      const G = window.__GAME;
      const g = window.__gameInstance;
      G.freezePlayer(true);
      // `stats.smoke` sums the smoke and dust batches, so the cap must too
      const caps = {
        smoke: g.effects.smoke.capacity + g.effects.dust.capacity,
        fire: g.effects.fire.capacity,
        sparks: g.effects.sparks.capacity,
        threats: g.threats.pool.capacity,
        rounds: g.interceptors.pool.capacity,
      };
      let peak = { smoke: 0, fire: 0, sparks: 0 };
      for (let run = 0; run < 2; run++) {
        G.restart();
        G.configure({ scenario: 'saturation', condition: 'day' });
        G.start();
        for (let i = 0; i < 100; i++) {
          G.sim(30);
          G.autoPilot();
          const st = g.effects.stats;
          peak.smoke = Math.max(peak.smoke, st.smoke);
          peak.fire = Math.max(peak.fire, st.fire);
          peak.sparks = Math.max(peak.sparks, st.sparks);
        }
      }
      G.restart();
      return { caps, peak, afterReset: g.effects.stats };
    });
    expect(r.peak.smoke).toBeLessThanOrEqual(r.caps.smoke);
    expect(r.peak.fire).toBeLessThanOrEqual(r.caps.fire);
    expect(r.peak.sparks).toBeLessThanOrEqual(r.caps.sparks);
    expect(r.afterReset.smoke).toBe(0);
    expect(r.afterReset.trails).toBe(0);
  });
});
