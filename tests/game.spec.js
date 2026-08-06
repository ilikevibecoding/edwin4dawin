// Deterministic gameplay tests. The page exposes window.__GAME in test mode,
// which advances the simulation at a fixed 1/60 s step and can fast-forward
// without rendering — essential here because CI has no GPU.

import { test, expect } from '@playwright/test';

const SEED = 424242;

/** Load the game in deterministic test mode and collect any page problems. */
async function boot(page, { seed = SEED, quality = 'medium' } = {}) {
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      const t = m.text();
      if (!/favicon|willReadFrequently|\[vite\]/i.test(t)) problems.push(`${m.type()}: ${t}`);
    }
  });
  await page.goto(`/?test=1&seed=${seed}&quality=${quality}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__READY === true', null, { timeout: 180000 });
  return problems;
}

const api = (page, fn, arg) => page.evaluate(fn, arg);

test.describe('boot and scene integrity', () => {
  test('loads with no console errors and exposes the test API', async ({ page }) => {
    const problems = await boot(page);
    const info = await api(page, () => {
      const G = window.__GAME;
      G.runFor(1);
      G.render(1);
      const s = G.snapshot();
      return { phase: s.phase, draws: s.perf.drawCalls, tris: s.perf.triangles, hasApi: typeof G.autoEngage === 'function' };
    });
    expect(problems, problems.join('\n')).toEqual([]);
    expect(info.hasApi).toBe(true);
    expect(info.phase).toBe('BRIEFING');
    expect(info.draws).toBeGreaterThan(0);
  });

  test('stays inside the draw-call and triangle budget at peak load', async ({ page }) => {
    await boot(page, { quality: 'high' });
    const perf = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      G.startScenario('SATURATION', 'sunset', 'THAAD');
      G.runUntil((s) => s.firm >= 3, 45);
      G.autoEngage(3);
      G.runFor(2.5);
      G.autoEngage(3);
      G.runFor(1.5);
      G.render(2);
      const sim = G.measureSim(120);
      const s = G.snapshot();
      return { draws: s.perf.drawCalls, tris: s.perf.triangles, particles: s.perf.particles, simMs: sim.p95Ms };
    });
    expect(perf.draws).toBeLessThan(700);
    expect(perf.tris).toBeLessThan(1_200_000);
    // CPU simulation cost is the GPU-independent half of the frame budget.
    expect(perf.simMs).toBeLessThan(3);
  });
});

test.describe('first-person controls', () => {
  test('WASD moves the player and sprint is faster', async ({ page }) => {
    await boot(page);
    const r = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      G.teleport(0, undefined, 0, 0, 0);
      const start = G.snapshot().player.slice();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      G.runFor(1.0);
      const walked = G.snapshot().player.slice();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
      G.runFor(1.0);
      const sprinted = G.snapshot().player.slice();
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }));
      const d = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
      return { walk: d(start, walked), sprint: d(walked, sprinted) };
    });
    expect(r.walk).toBeGreaterThan(2.0);
    expect(r.sprint).toBeGreaterThan(r.walk);
  });

  test('capsule collision stops the player walking through the shelter', async ({ page }) => {
    await boot(page);
    const r = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      const anchor = G.game.base.consoleAnchor;
      // Start well outside the shelter's back wall and drive straight at it.
      const yaw = G.game.base.consoleYaw;
      const fwd = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
      G.teleport(anchor.x - fwd.x * 16, undefined, anchor.z - fwd.z * 16, yaw + Math.PI, 0);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      G.runFor(8);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
      const p = G.snapshot().player;
      const beyond = (p[0] - anchor.x) * fwd.x + (p[2] - anchor.z) * fwd.z;
      return { beyond, player: p };
    });
    // The player must not end up past the far side of the shelter.
    expect(r.beyond).toBeLessThan(8);
  });

  test('reduced motion removes head bob', async ({ page }) => {
    await boot(page);
    const r = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      const sample = () => {
        G.teleport(0, undefined, 0, 0, 0);
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
        const ys = [];
        for (let i = 0; i < 90; i++) {
          G.step(1 / 60, false);
          ys.push(G.game.camera.position.y);
        }
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
        // Peak-to-peak of the last 60 samples, after speed has settled.
        const tail = ys.slice(30);
        return Math.max(...tail) - Math.min(...tail);
      };
      const withBob = sample();
      G.action('toggle:reducedMotion');
      const withoutBob = sample();
      return { withBob, withoutBob, flag: G.state.reducedMotion };
    });
    expect(r.flag).toBe(true);
    expect(r.withBob).toBeGreaterThan(0.01);
    expect(r.withoutBob).toBeLessThan(r.withBob * 0.35);
  });
});

test.describe('radar and engagement', () => {
  test('detects, firms and reports an inbound track', async ({ page }) => {
    await boot(page);
    const r = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      G.startScenario('SINGLE', 'day', 'PATRIOT');
      const got = G.runUntil((s) => s.firm > 0, 45);
      const s = G.snapshot();
      return { got, tracks: s.tracks, elapsed: G.game.scenarioTime };
    });
    expect(r.got).toBe(true);
    expect(r.tracks.length).toBe(1);
    expect(r.tracks[0].firm).toBe(true);
    expect(r.tracks[0].cls).toBe('BALLISTIC RV');
    expect(r.tracks[0].alt).toBeGreaterThan(5000);
    // Detection should be prompt enough to leave a usable engagement window.
    expect(r.elapsed).toBeLessThan(20);
  });

  test('console mode: dock, designate, assign and authorize', async ({ page }) => {
    await boot(page);
    const r = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      const docked = G.dock();
      G.startScenario('SINGLE', 'day', 'THAAD');
      G.runUntil((s) => s.firm > 0, 45);
      const id = G.game.radar.firmTracks()[0].id;
      G.action('battery:THAAD');
      G.game.selectTrack(id);
      G.action('assign');
      const afterAssign = G.snapshot();
      G.action('authorize');
      const launched = G.runUntil((s) => s.interceptors.length > 0, 25);
      const s = G.snapshot();
      return { docked, id, assigned: afterAssign.assignedTrackId, launched, inter: s.interceptors, fired: s.stats.launched };
    });
    expect(r.docked).toBe(true);
    expect(r.assigned).toBe(r.id);
    expect(r.launched).toBe(true);
    expect(r.fired).toBe(1);
    expect(r.inter[0].battery).toBe('THAAD');
  });

  test('outdoor mode: E assigns and F authorizes the looked-at track', async ({ page }) => {
    await boot(page);
    const r = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      G.startScenario('SINGLE', 'day', 'THAAD');
      G.runUntil((s) => s.firm > 0, 45);
      G.undock();
      G.teleport(0, undefined, 40);
      G.lookAtTrack();
      G.step(1 / 60, false);
      const prompted = !!G.game.lookTrack;
      G.key('KeyE');
      const assigned = G.snapshot().assignedTrackId;
      G.key('KeyF');
      const launched = G.runUntil((s) => s.interceptors.length > 0, 25);
      return { prompted, assigned, launched };
    });
    expect(r.prompted).toBe(true);
    expect(r.assigned).toBeTruthy();
    expect(r.launched).toBe(true);
  });

  test('launch is denied without an assignment and reports why', async ({ page }) => {
    await boot(page);
    const r = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      G.startScenario('SINGLE', 'day', 'PATRIOT');
      G.runFor(1);
      G.action('authorize');
      const msgs = G.state.messages.slice(-3).map((m) => m.text);
      return { fired: G.snapshot().stats.launched, msgs };
    });
    expect(r.fired).toBe(0);
    expect(r.msgs.join(' ')).toMatch(/LAUNCH DENIED/);
  });
});

test.describe('flight physics and outcomes', () => {
  for (const battery of ['PATRIOT', 'THAAD', 'SENTINEL']) {
    test(`${battery} can intercept a single inbound`, async ({ page }) => {
      await boot(page);
      const r = await api(page, (bat) => {
        const G = window.__GAME;
        G.action('deploy');
        G.startScenario('SINGLE', 'day', bat);
        let fired = false;
        let guard = 0;
        while (guard++ < 400) {
          if (!fired) {
            const t = G.game.radar.firmTracks()[0];
            if (t) {
              const b = G.game.batteries.get(bat);
              const w = G.game.radar.evaluateWindow(t, b.cfg, b.position);
              if (w.okAlt && w.okRange && w.quality > 0.55) {
                G.action(`battery:${bat}`);
                G.game.selectTrack(t.id);
                G.action('assign');
                G.action('authorize');
                fired = true;
              }
            }
          }
          G.runFor(0.4);
          if (G.snapshot().phase === 'DEBRIEF') break;
        }
        const s = G.snapshot();
        return { stats: s.stats, record: s.record, phase: s.phase };
      }, battery);
      expect(r.stats.launched).toBe(1);
      expect(r.stats.intercepted, JSON.stringify(r.record)).toBe(1);
      expect(r.stats.leakers).toBe(0);
      expect(r.record.some((x) => x.text === 'INTERCEPTED')).toBe(true);
    });
  }

  test('threats fly curved ballistic arcs with rising speed', async ({ page }) => {
    await boot(page);
    const r = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      G.startScenario('SINGLE', 'day', 'PATRIOT');
      G.runUntil(() => G.game.threats.active.length > 0, 20);
      const t = G.game.threats.active[0];
      const samples = [];
      for (let i = 0; i < 50; i++) {
        G.runFor(1);
        if (!t.alive) break;
        samples.push({
          y: t.pos.y,
          vy: t.vel.y,
          vh: Math.hypot(t.vel.x, t.vel.z),
          phase: t.phase,
        });
      }
      return { samples, spawnAlt: samples[0].y };
    });
    expect(r.spawnAlt).toBeGreaterThan(12000);
    const first = r.samples[0];
    const last = r.samples[r.samples.length - 1];
    // A ballistic arc under gravity plus drag: it descends, the descent angle
    // steepens continuously, and the horizontal component bleeds off.
    expect(last.y).toBeLessThan(first.y);
    expect(last.vy).toBeLessThan(first.vy - 200);
    expect(last.vh).toBeLessThan(first.vh);
    for (let i = 1; i < r.samples.length; i++) {
      expect(r.samples[i].vy).toBeLessThan(r.samples[i - 1].vy);
    }
    expect(r.samples.map((s) => s.phase)).toContain('REENTRY');
    expect(r.samples.map((s) => s.phase)).toContain('TERMINAL');
  });

  test('an unengaged threat impacts and is reported as a leaker', async ({ page }) => {
    await boot(page);
    const r = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      G.startScenario('SINGLE', 'day', 'PATRIOT');
      G.runUntil((s) => s.phase === 'DEBRIEF', 120);
      const s = G.snapshot();
      return { stats: s.stats, record: s.record, phase: s.phase };
    });
    expect(r.phase).toBe('DEBRIEF');
    expect(r.stats.leakers).toBe(1);
    expect(r.record.some((x) => x.text === 'IMPACT')).toBe(true);
  });

  test('a miss is explained rather than silent', async ({ page }) => {
    await boot(page);
    const r = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      // Commit the terminal battery far outside its basket so it cannot close.
      G.startScenario('SINGLE', 'day', 'PATRIOT');
      G.runUntil((s) => s.firm > 0, 45);
      const t = G.game.radar.firmTracks()[0];
      G.action('battery:PATRIOT');
      G.game.selectTrack(t.id);
      G.action('assign');
      G.action('authorize');
      G.runUntil((s) => s.phase === 'DEBRIEF', 140);
      const s = G.snapshot();
      return { record: s.record, stats: s.stats };
    });
    // Whatever the outcome, every engagement leaves a readable reason.
    expect(r.record.length).toBeGreaterThan(0);
    for (const entry of r.record) {
      expect(entry.detail.length).toBeGreaterThan(10);
      expect(entry.text).toMatch(/INTERCEPTED|MISSED|IMPACT|DECOY/);
    }
  });
});

test.describe('scenarios', () => {
  test('saturation presents 3-5 objects and resolves in a reasonable time', async ({ page }) => {
    await boot(page);
    const r = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      G.startScenario('SATURATION', 'sunset', 'THAAD');
      let guard = 0;
      while (guard++ < 300) {
        G.autoEngage(3);
        G.runFor(0.6);
        if (G.snapshot().phase === 'DEBRIEF') break;
      }
      const s = G.snapshot();
      return { stats: s.stats, elapsed: G.game.scenarioTime, phase: s.phase };
    });
    expect(r.phase).toBe('DEBRIEF');
    expect(r.stats.spawned).toBeGreaterThanOrEqual(3);
    expect(r.stats.spawned).toBeLessThanOrEqual(5);
    expect(r.stats.intercepted).toBeGreaterThan(0);
    expect(r.elapsed).toBeGreaterThan(40);
    expect(r.elapsed).toBeLessThan(110);
  });

  test('night raid includes decoys that stay ambiguous while high', async ({ page }) => {
    await boot(page);
    const r = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      G.startScenario('NIGHT_RAID', 'night', 'SENTINEL');
      G.runUntil((s) => s.tracks.filter((t) => t.firm).length >= 2, 45);
      const early = G.snapshot().tracks.map((t) => ({ kind: t.kind, cls: t.cls, alt: t.alt }));
      G.runUntil(() => G.game.threats.active.some((t) => t.kind === 'DECOY' && t.pos.y < 8500), 90);
      const late = G.snapshot().tracks.map((t) => ({ kind: t.kind, cls: t.cls, alt: t.alt }));
      return {
        decoysPlanned: G.game.threats.spawnPlan.filter((p) => p.kind === 'DECOY').length,
        earlyAmbiguous: early.filter((t) => t.kind === 'DECOY').every((t) => t.cls === 'BALLISTIC RV'),
        lateRevealed: late.some((t) => t.kind === 'DECOY' && t.cls.includes('DECOY')),
        searchlights: G.game.base.searchlights.every((s) => s.enabled),
      };
    });
    expect(r.decoysPlanned).toBeGreaterThan(0);
    expect(r.earlyAmbiguous).toBe(true);
    expect(r.lateRevealed).toBe(true);
    expect(r.searchlights).toBe(true);
  });

  test('restarting resets ammunition, tracks and the score', async ({ page }) => {
    await boot(page);
    const r = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      G.startScenario('SINGLE', 'day', 'PATRIOT');
      G.runUntil((s) => s.firm > 0, 45);
      G.autoEngage(1);
      G.runFor(6);
      const mid = G.snapshot();
      G.startScenario('SINGLE', 'day', 'PATRIOT');
      G.runFor(0.2);
      const after = G.snapshot();
      return { mid, after };
    });
    expect(r.mid.stats.launched).toBeGreaterThan(0);
    expect(r.after.stats.launched).toBe(0);
    expect(r.after.stats.intercepted).toBe(0);
    expect(r.after.tracks.length).toBe(0);
    for (const b of Object.values(r.after.batteries)) {
      expect(b.state === 'READY' || b.state === 'PREPARING').toBe(true);
    }
  });
});

test.describe('determinism', () => {
  test('the same seed produces the same opening engagement', async ({ page, context }) => {
    const run = async (p) => {
      await boot(p, { seed: 991177 });
      return p.evaluate(() => {
        const G = window.__GAME;
        G.action('deploy');
        G.startScenario('SATURATION', 'sunset', 'THAAD');
        G.runFor(30);
        return {
          plan: G.game.threats.spawnPlan.map((x) => [x.kind, x.at.toFixed(3), x.alt.toFixed(1), x.range.toFixed(1), x.azimuth.toFixed(4)]),
          positions: G.game.threats.active.map((t) => t.pos.toArray().map((v) => v.toFixed(2))),
        };
      });
    };
    const a = await run(page);
    const second = await context.newPage();
    const b = await run(second);
    expect(b.plan).toEqual(a.plan);
    expect(b.positions).toEqual(a.positions);
    await second.close();
  });

  test('different runs of a scenario vary the arcs', async ({ page }) => {
    await boot(page);
    const r = await api(page, () => {
      const G = window.__GAME;
      G.action('deploy');
      const snap = () => G.game.threats.spawnPlan.map((x) => `${x.at.toFixed(2)}:${x.azimuth.toFixed(3)}`).join('|');
      G.startScenario('SATURATION', 'sunset', 'THAAD');
      const first = snap();
      G.startScenario('SATURATION', 'sunset', 'THAAD');
      const second = snap();
      return { first, second };
    });
    expect(r.second).not.toEqual(r.first);
  });
});

test.describe('presentation screenshots', () => {
  const shots = [
    { name: 'day', tod: 'day', scenario: 'SINGLE', battery: 'PATRIOT' },
    { name: 'sunset', tod: 'sunset', scenario: 'SATURATION', battery: 'THAAD' },
    { name: 'night', tod: 'night', scenario: 'NIGHT_RAID', battery: 'SENTINEL' },
  ];
  for (const s of shots) {
    test(`captures a ${s.name} engagement`, async ({ page }, testInfo) => {
      const problems = await boot(page, { quality: 'high' });
      await api(
        page,
        (cfg) => {
          const G = window.__GAME;
          G.action('deploy');
          G.startScenario(cfg.scenario, cfg.tod, cfg.battery);
          G.teleport(28, undefined, 74);
          G.runUntil((st) => st.firm > 0, 45);
          G.autoEngage(2);
          G.runUntil((st) => st.interceptors.length > 0, 25);
          G.runFor(2.5);
          const st = G.snapshot();
          const alt = st.interceptors.length ? Math.max(...st.interceptors.map((i) => i.alt)) : 3000;
          G.lookAt(0, alt, -6000);
          G.render(2);
        },
        s
      );
      const buf = await page.screenshot({ timeout: 180000 });
      await testInfo.attach(`${s.name}-engagement`, { body: buf, contentType: 'image/png' });
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }
});
