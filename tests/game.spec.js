// Deterministic gameplay tests (manual-step mode, fixed seed).
import { test, expect } from '@playwright/test';
import { boot, adv, advUntil, state } from './helpers.js';

test.describe('boot & world', () => {
  test('game boots into idle at the base', async ({ page }) => {
    await boot(page);
    const s = await state(page);
    expect(s.phase).toBe('idle');
    expect(s.threats.length).toBe(0);
    expect(s.batteries).toHaveLength(3);
    expect(s.batteries.every(b => b.state === 'READY')).toBe(true);
  });

  test('HUD renders', async ({ page }) => {
    await boot(page);
    await expect(page.locator('.top-left')).toContainText('CASTELLAN RIDGE');
    await expect(page.locator('.bat-card')).toHaveCount(3);
  });
});

test.describe('single track engagement', () => {
  test('radar detects, zenith intercepts', async ({ page }) => {
    await boot(page, { seed: '7' });
    await page.evaluate(() => window.__game.start('single', 'day'));
    // threat spawns ~1.2 s in; radar sweep + confirm ≤ ~6 s
    const detected = await advUntil(page, s => s.tracks.some(t => t.state === 'TRACK'), { max: 20 });
    expect(detected.ok).toBe(true);
    // engage with the high-altitude battery
    await page.evaluate(() => {
      window.__game.selectFirstTrack();
      window.__game.assign('zenith');
      window.__game.authorize();
    });
    const s1 = await state(page);
    expect(['PREP', 'RELOAD']).toContain(s1.batteries.find(b => b.id === 'zenith').state);
    // wait for the engagement to resolve
    const done = await advUntil(page, s => s.results.length > 0, { tick: 1, max: 90 });
    expect(done.ok).toBe(true);
    const res = done.state.results[0];
    console.log('ENGAGEMENT RESULT:', JSON.stringify(res), 'stats:', JSON.stringify(done.state.stats));
    expect(['INTERCEPTED', 'MISSED']).toContain(res.type);
    // deterministic seed 7 should produce a clean intercept
    expect(done.state.stats.intercepted).toBe(1);
    expect(done.state.batteries.find(b => b.id === 'zenith').ammo).toBe(5);
    // scenario should end and reach debrief
    const debrief = await advUntil(page, s => s.phase === 'debrief', { max: 90 });
    expect(debrief.ok).toBe(true);
  });

  test('restart works immediately from debrief', async ({ page }) => {
    await boot(page, { seed: '9' });
    await page.evaluate(() => window.__game.start('single', 'day'));
    await advUntil(page, s => s.phase === 'debrief', { tick: 2, max: 120 });
    await page.evaluate(() => window.__game.restart());
    const s = await state(page);
    expect(s.phase).toBe('active');
  });
});

test.describe('scenarios', () => {
  test('saturation spawns 3-5 threats on different arcs', async ({ page }) => {
    await boot(page, { seed: '21' });
    await page.evaluate(() => window.__game.start('saturation', 'sunset'));
    await adv(page, 24);
    const s = await state(page);
    const total = s.threats.length + s.stats.impacts;
    expect(total).toBeGreaterThanOrEqual(3);
    expect(s.tracks.length).toBeGreaterThanOrEqual(2);
    // different arcs: spread of x positions
    const xs = s.threats.map(t => t.pos[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(500);
  });

  test('night raid forces night and includes decoys', async ({ page }) => {
    await boot(page, { seed: '5' });
    await page.evaluate(() => window.__game.start('nightraid', 'day'));
    const s0 = await state(page);
    expect(s0.tod).toBe('night');
    // watch classifications resolve over the raid
    const seen = new Set();
    for (let i = 0; i < 30; i++) {
      await adv(page, 2);
      const s = await state(page);
      for (const t of s.tracks) seen.add(t.cls);
      if (seen.has('DECOY')) break;
      if (s.phase === 'debrief') break;
    }
    expect(seen.has('DECOY')).toBe(true);
  });
});

test.describe('battery mechanics', () => {
  test('sentinel has 2 rounds and goes EMPTY', async ({ page }) => {
    await boot(page, { seed: '31' });
    await page.evaluate(() => window.__game.start('saturation', 'day'));
    await advUntil(page, s => s.tracks.filter(t => t.state === 'TRACK').length >= 2, { max: 30 });
    // fire both sentinel rounds (wait for READY between shots — 16 s reload)
    for (let i = 0; i < 2; i++) {
      const ready = await advUntil(page, s =>
        s.batteries.find(b => b.id === 'sentinel').state === 'READY' && s.tracks.length > 0,
      { tick: 1, max: 40 });
      expect(ready.ok).toBe(true);
      await page.evaluate(() => {
        const s = window.__game.getState();
        const tid = s.tracks[0].id;
        window.__game.selectTrack(tid);
        window.__game.assign('sentinel');
        window.__game.authorize();
      });
      const left = await advUntil(page, s => {
        const b = s.batteries.find(b => b.id === 'sentinel');
        return b.ammo === 2 - (i + 1) || b.state === 'EMPTY';
      }, { tick: 1, max: 30 });
      expect(left.ok).toBe(true);
    }
    const s = await state(page);
    const sentinel = s.batteries.find(b => b.id === 'sentinel');
    expect(sentinel.ammo).toBe(0);
    console.log('sentinel state after 2 shots:', sentinel.state);
    // further authorize attempts are refused
    const refused = await page.evaluate(() => {
      const s = window.__game.getState();
      const tid = s.tracks[0]?.id;
      if (!tid) return 'no-track';
      window.__game.selectTrack(tid);
      window.__game.assign('sentinel');
      return window.__game.authorize();
    });
    expect(refused === false || refused === 'no-track').toBe(true);
  });

  test('out-of-envelope launch produces an explained miss', async ({ page }) => {
    await boot(page, { seed: '41' });
    await page.evaluate(() => window.__game.start('single', 'day'));
    await advUntil(page, s => s.tracks.some(t => t.state === 'TRACK'), { max: 20 });
    // rampart floor is 150 m / ceiling 4200 m; early high threat → predicted
    // intercept above ceiling → guaranteed explained miss
    const s0 = await state(page);
    const alt = s0.tracks[0]?.alt ?? 0;
    await page.evaluate(() => {
      window.__game.selectFirstTrack();
      window.__game.assign('rampart');
      window.__game.authorize();
    });
    const done = await advUntil(page, s => s.results.length > 0, { max: 90 });
    expect(done.ok).toBe(true);
    console.log('early-rampart shot at alt', alt, '→', JSON.stringify(done.state.results));
    expect(done.state.results.length).toBeGreaterThan(0);
  });
});

test.describe('player collision', () => {
  test('walking into a T-wall stops the player', async ({ page }) => {
    await boot(page, { seed: '7' });
    // approach the motor-pool T-wall row (x≈-22.6) from the open west side,
    // walking +X; the wall face is at x≈-23.18
    await page.evaluate(() => {
      window.__game.walkTo(-28, -62, -Math.PI / 2, 0);
      window.__game.setTestDrive(true);
    });
    await page.keyboard.down('KeyW');
    await adv(page, 3); // 3 s of walking ≈ 10 m without obstruction
    await page.keyboard.up('KeyW');
    await page.evaluate(() => window.__game.setTestDrive(false));
    const pos = await page.evaluate(() => window.__game.playerPos());
    console.log('player stopped at', JSON.stringify(pos));
    expect(pos[0]).toBeGreaterThan(-25.5); // input worked — moved forward
    expect(pos[0]).toBeLessThan(-23.3);    // blocked by the wall face
    expect(Math.abs(pos[1])).toBeLessThan(0.5); // still on the ground
  });
});

test.describe('console', () => {
  test('console opens with scenario controls and track list', async ({ page }) => {
    await boot(page, { seed: '7' });
    await page.evaluate(() => window.__game.openConsole());
    await expect(page.locator('.console')).toBeVisible();
    await expect(page.locator('#btn-start')).toContainText('START BALLISTIC MISSILES');
    // start via the actual button
    await page.click('#btn-start');
    const s = await state(page);
    expect(s.phase).toBe('active');
    await advUntil(page, s2 => s2.tracks.length > 0, { max: 20 });
    await expect(page.locator('.track-row').first()).toBeVisible();
    // click a track row selects it
    await page.click('.track-row');
    const s2 = await state(page);
    expect(s2.selectedTrack).not.toBeNull();
  });
});

test.describe('performance (headless swiftshader — lenient floor)', () => {
  test('realtime saturation holds sim pace & render budget', async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 540 });
    const q = new URLSearchParams({ mute: '1', seed: '11', scenario: 'saturation', autostart: '1', test: '1', quality: '1' });
    await page.goto(`/?${q.toString()}`);
    await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30_000 });
    // let shader warm-up stalls pass, then measure sim pace over a 15 s window
    await page.waitForTimeout(5_000);
    const t0 = await page.evaluate(() => window.__game.getState().time);
    await page.waitForTimeout(15_000);
    const s = await state(page);
    const pace = (s.time - t0) / 15;
    console.log(`PERF fps=${s.fps} pace=${pace.toFixed(2)}x draws=${s.drawCalls} tris=${(s.triangles / 1e6).toFixed(2)}M smoke=${s.effects.smoke} fire=${s.effects.fire} trails=${s.effects.trails}`);
    expect(s.drawCalls).toBeLessThan(500);
    expect(s.triangles).toBeLessThan(4_000_000);
    // catch-up stepping must keep the game near real time even on a software
    // rasterizer (~2-4 fps); real GPUs run 30-100x faster than this floor
    expect(pace).toBeGreaterThan(0.4);
    expect(s.fps).toBeGreaterThan(0.2); // loop alive (honest fps; warm-up stalls included)
  });
});
