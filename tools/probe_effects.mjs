// Probe: explosion / launch / trail effect shots for iterative visual loops.
// Usage: node tools/probe_effects.mjs loop1 [sections]
//   sections: comma list of air,night,sunset,ground,launch,salvo (default all)
// Writes shots_effects/<label>_*.png and prints perf numbers.
// NOTE: every __game.step() renders one swiftshader frame (~0.3-0.5 s wall),
// so condition-polling batches many sim frames per render where possible.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const LABEL = process.argv[2] ?? 'loop0';
const SECTIONS = (process.argv[3] ?? 'air,night,sunset,ground,launch,salvo').split(',');
const has = (s) => SECTIONS.includes(s);
const BASE = process.env.PROBE_URL ?? 'http://localhost:4187';
fs.mkdirSync('shots_effects', { recursive: true });

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30_000 });
await page.evaluate(() => {
  window.__game.testMode();
  window.__game.pause(true);
  window.__game.ctx.player.setEnabled(false);
  // stop the realtime rAF loop; we render manually via step()
  window.__game.ctx.renderer.setAnimationLoop(null);
});

const step = (frames, dt = 33.34) => page.evaluate(([f, d]) => window.__game.step(f, d), [frames, dt]);
// CDP screenshot: page.screenshot() hangs on "waiting for fonts" with the HUD
const cdp = await page.context().newCDPSession(page);
async function shot(name) {
  try {
    // the scenario may end mid-sequence; keep the debrief modal out of frame
    await page.evaluate(() => window.__game.ctx.ui.hideDebrief());
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`shots_effects/${LABEL}_${name}.png`, Buffer.from(data, 'base64'));
    console.log('shot', name);
  } catch (e) {
    console.log('SHOT FAILED', name, String(e).slice(0, 120));
  }
}

/** step in batches until cond (JS string over g/ctx) is true; ~1 render per batch */
async function stepUntil(cond, { batch = 20, maxBatches = 120, dt = 33.34 } = {}) {
  for (let i = 0; i < maxBatches; i++) {
    const ok = await page.evaluate(([c, b, d]) => {
      const g = window.__game;
      // eslint-disable-next-line no-new-func
      const f = new Function('g', 'ctx', `return (${c});`);
      if (f(g, g.ctx)) return true;
      g.step(b, d);
      return f(g, g.ctx);
    }, [cond, batch, dt]);
    if (ok) return true;
  }
  return false;
}

/** park the (disabled) player eye at p looking at t; 1 ms step recomputes
 *  camera-distance-dependent visuals before the render */
async function park(px, py, pz, tx, ty, tz) {
  await page.evaluate(([a, b, c, d, e, f]) => {
    const g = window.__game;
    g.teleport(a, b - 1.7, c, 0, 0);
    g.lookAt(d, e, f);
    g.step(1, 1);
  }, [px, py, pz, tx, ty, tz]);
}

/** ATOMIC intercept catch: continuously re-park the camera at the guidance-
 *  predicted intercept point while stepping; single frames near closure so the
 *  detonation frame itself renders framed. Camera sits camDist out on a
 *  horizontal side offset, groundBias lowers the eye to put terrain in frame. */
const catchIntercept = (camDist = 170, groundBias = 0) => page.evaluate(([cd, gb]) => {
  const g = window.__game, ctx = g.ctx;
  const t0 = g.state().lastIntercept?.t ?? -1;
  const parkAt = (px, py, pz, lx, ly, lz) => {
    g.teleport(px, py - 1.7, pz, 0, 0);
    g.lookAt(lx, ly, lz);
  };
  for (let n = 0; n < 700; n++) {
    const li = g.state().lastIntercept;
    if (li && li.t !== t0) return { ok: true, n, x: li.x, y: li.y, z: li.z };
    const it = ctx.interceptors.active[0];
    if (!it) return { ok: false, reason: 'interceptor gone without intercept', n };
    const p = it.lastPredict.lengthSq() > 1 ? it.lastPredict : it.pos;
    const th = it.threat;
    const d = th && th.alive ? it.pos.distanceTo(th.pos) : 1e9;
    // horizontal side offset perpendicular to the threat's ground track
    let sx = 1, sz = 0;
    if (th && th.alive) {
      sx = th.vel.z; sz = -th.vel.x;
      const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
    }
    const eyeY = Math.max(p.y + cd * 0.12 - gb * cd, 3);
    parkAt(p.x + sx * cd, eyeY, p.z + sz * cd, p.x, p.y, p.z);
    const frames = d > 3000 ? 24 : d > 1000 ? 6 : 1;
    g.step(frames, 33.34);
  }
  return { ok: false, reason: 'timeout' };
}, [camDist, groundBias]);

/** re-aim at a point from an orbit position (dist, azimuth deg, eye height) */
async function orbit(pt, dist, azDeg, eyeY, aimY = null) {
  const az = (azDeg * Math.PI) / 180;
  await park(pt.x + Math.cos(az) * dist, eyeY, pt.z + Math.sin(az) * dist, pt.x, aimY ?? pt.y, pt.z);
}

/** ATOMIC ground-impact catch: track the falling threat, keep the camera
 *  parked on its predicted impact point, single frames near the ground.
 *  teleport(x, null, z) snaps feet to terrain so hills can't swallow the eye. */
const catchImpact = (camDist = 260, eyeH = 6) => page.evaluate(([cd, eh]) => {
  const g = window.__game, ctx = g.ctx;
  const imp0 = g.state().stats.impacts;
  let ix = 0, iz = 0;
  for (let n = 0; n < 900; n++) {
    if (g.state().stats.impacts > imp0) return { ok: true, n, x: ix, z: iz };
    const t = ctx.threats.active[0];
    if (!t) return { ok: false, reason: 'threat gone, no impact', n };
    // ballistic landing estimate (flat ground, current v)
    const gAcc = 9.81;
    const disc = t.vel.y * t.vel.y + 2 * gAcc * Math.max(t.pos.y, 0);
    const tt = (t.vel.y + Math.sqrt(disc)) / gAcc; // time to y=0 (vel.y is negative)
    ix = t.pos.x + t.vel.x * tt; iz = t.pos.z + t.vel.z * tt;
    let sx = t.vel.z, sz = -t.vel.x;
    const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
    const cx = ix + sx * cd, cz = iz + sz * cd;
    g.teleport(cx, null, cz, 0, 0);                      // read terrain height
    const feetY = ctx.player.state.feet.y;
    g.teleport(cx, feetY + eh, cz, 0, 0);                // hover eyeH above it
    g.teleport(ix, null, iz, 0, 0);                      // impact terrain probe
    const impY = ctx.player.state.feet.y;
    g.teleport(cx, feetY + eh, cz, 0, 0);
    g.lookAt(ix, impY + 45, iz); // frame the column height, not the empty flat
    const frames = t.pos.y > 3000 ? 24 : t.pos.y > 900 ? 6 : 1;
    g.step(frames, 33.34);
  }
  return { ok: false, reason: 'timeout' };
}, [camDist, eyeH]);

/** launch a scenario fresh */
async function scenario(seed, name, timeOfDay) {
  await page.evaluate(([s, n, tod]) => {
    window.__game.stopScenario();
    window.__game.seed(s);
    window.__game.start(n, { timeOfDay: tod });
    window.__game.autoplay(false);
  }, [seed, name, timeOfDay]);
}

/** wait for the threat to descend into the battery's sweet window, then
 *  assign+authorize once (out-of-envelope shots roll low pk and read as misses) */
async function engageFirst(batteryId, gate = null) {
  await stepUntil('ctx.radar.activeTracks().length > 0', { batch: 15, maxBatches: 40 });
  const g8 = gate ?? '(() => { const t = ctx.threats.active[0]; return !t || (t.pos.y < 2400 && Math.hypot(t.pos.x, t.pos.z) < 3800); })()';
  await stepUntil(g8, { batch: 30, maxBatches: 90 });
  const ok = await page.evaluate((bid) => {
    const g = window.__game;
    const tr = g.ctx.radar.activeTracks()[0];
    if (!tr) return false;
    g.assign(tr.id, bid);
    return g.authorize(tr.id);
  }, batteryId);
  if (ok) await stepUntil('ctx.interceptors.active.length > 0', { batch: 4, maxBatches: 140 });
  return ok;
}

/** kill-shot lottery insurance: run the scenario across seeds until one
 *  intercept catch lands. pk rolls differ per seed/time-of-day RNG stream. */
async function interceptRetry(tod, seeds, camDist, groundBias = 0) {
  for (const s of seeds) {
    await scenario(s, 'single', tod);
    const fired = await engageFirst('patriot');
    if (!fired) { console.log(`engage failed (seed ${s}, ${tod})`); continue; }
    const r = await catchIntercept(camDist, groundBias);
    console.log(`intercept ${tod} seed ${s}:`, JSON.stringify(r));
    if (r.ok) return r;
  }
  return { ok: false };
}

const perf = async (tag) => {
  const p = await page.evaluate(() => window.__game.perf());
  console.log(`PERF(${tag}):`, JSON.stringify(p));
  return p;
};

// ============================================================ A. day intercept
if (has('air')) {
  const r = await interceptRetry('day', [11, 12, 15], 190, 0);
  if (r.ok) {
    await shot('air_flash_day');
    await step(8); await page.evaluate(() => { const li = window.__game.state().lastIntercept; window.__game.lookAt(li.x, li.y, li.z); window.__game.step(1, 1); });
    await shot('air_fireball_day');
    await step(40);
    await orbit(r, 240, 25, Math.max(r.y * 0.9, 4), r.y);
    await shot('air_smoke2s_day');
    await step(120);
    await orbit(r, 300, 25, Math.max(r.y * 0.85, 4), r.y);
    await shot('air_smoke6s_day');
    // distant view from player spawn
    await park(0, 1.7, 14, r.x, r.y, r.z);
    await shot('air_distant_from_spawn');
    await perf('air-day');
  }
  // staged scale comparison at a fixed 140 m: self-destruct pop (0.4) vs
  // warhead kill (1.25) — deterministic, no pk lottery
  await page.evaluate(() => window.__game.stopScenario());
  await park(0, 262, 0, 0, 300, -140);
  await step(60); // clear lingering smoke from the intercept sequence
  await page.evaluate(() => {
    const ctx = window.__game.ctx;
    ctx.effects.explosionAir(ctx.camera.position.clone().set(0, 300, -140), 0.4);
    window.__game.step(1, 33.34);
  });
  await shot('staged_small04_flash');
  await step(24);
  await shot('staged_small04_1s');
  await step(90);
  await page.evaluate(() => {
    const ctx = window.__game.ctx;
    ctx.effects.explosionAir(ctx.camera.position.clone().set(0, 300, -140), 1.25);
    window.__game.step(1, 33.34);
  });
  await shot('staged_big125_flash');
  await step(24);
  await shot('staged_big125_1s');
}

// ============================================================ B. night intercept
if (has('night')) {
  const r = await interceptRetry('night', [11, 14, 15, 16, 17], 210, 0.10);
  if (r.ok) {
    await shot('air_flash_night');
    await step(6);
    await shot('air_fireball_night');
    await step(30);
    await orbit(r, 260, 40, Math.max(r.y * 0.8, 4), r.y);
    await shot('air_smoke_night');
    await perf('air-night');
  }
}

// ============================================================ C. sunset intercept
if (has('sunset')) {
  const r = await interceptRetry('sunset', [13, 18, 19], 200, 0);
  if (r.ok) {
    await shot('air_flash_sunset');
    await step(12);
    await shot('air_fireball_sunset');
  }
}

// ============================================================ D. ground impacts
if (has('ground')) {
  await scenario(21, 'single', 'day');
  await stepUntil('ctx.threats.active.length > 0', { batch: 15, maxBatches: 30 });
  const r = await catchImpact(300, 7);
  console.log('day impact:', JSON.stringify(r));
  if (r.ok) {
    // +5 frames: the violence frame — spray/clods extended past the flash ball
    await step(5);
    await shot('ground_impact_day');
    await step(13);
    await shot('ground_column1s_day');
    await step(90);
    await shot('ground_column4s_day');
    await step(150);
    await shot('ground_column9s_day');
    await perf('ground-day');
  }
  // night ground impact: illumination check
  await scenario(22, 'single', 'night');
  await stepUntil('ctx.threats.active.length > 0', { batch: 15, maxBatches: 30 });
  const rn = await catchImpact(280, 7);
  console.log('night impact:', JSON.stringify(rn));
  if (rn.ok) {
    await step(5);
    await shot('ground_impact_night');
    // wait past the fire phase (~2 s): the readable night column is embers +
    // lit smoke + the dying light pulse, not the saturated flash ball
    await step(60);
    await shot('ground_column_night');
  }
}

// ============================================================ E. launch effects
if (has('launch')) {
  // Patriot pad (day)
  await scenario(31, 'single', 'day');
  await stepUntil('ctx.radar.activeTracks().length > 0', { batch: 15, maxBatches: 40 });
  const padP = await page.evaluate(() => {
    const p = window.__game.ctx.batteries.get('patriot').rig.group.position;
    return { x: p.x, y: p.y, z: p.z };
  });
  await park(padP.x + 30, 4.5, padP.z + 26, padP.x, padP.y + 6, padP.z);
  await page.evaluate(() => {
    const g = window.__game;
    const tr = g.ctx.radar.activeTracks()[0];
    if (tr) { g.assign(tr.id, 'patriot'); g.authorize(tr.id); }
  });
  const ign = await stepUntil('ctx.interceptors.active.length > 0', { batch: 2, maxBatches: 200 });
  console.log('patriot ignition:', ign);
  if (ign) {
    await shot('launch_ignition_patriot');
    await step(10);
    await shot('launch_plume_patriot');
    await step(50);
    await park(padP.x + 42, 5.5, padP.z + 34, padP.x, padP.y + 14, padP.z);
    await shot('launch_padsmoke_patriot');
  }
  // Sentinel pad (biggest blast, day)
  await scenario(33, 'single', 'day');
  await stepUntil('ctx.radar.activeTracks().length > 0', { batch: 15, maxBatches: 40 });
  const padS = await page.evaluate(() => {
    const p = window.__game.ctx.batteries.get('sentinel').rig.group.position;
    return { x: p.x, y: p.y, z: p.z };
  });
  await park(padS.x + 55, 7, padS.z + 44, padS.x, padS.y + 12, padS.z);
  await page.evaluate(() => {
    const g = window.__game;
    const tr = g.ctx.radar.activeTracks()[0];
    if (tr) { g.assign(tr.id, 'sentinel'); g.authorize(tr.id); }
  });
  const ignS = await stepUntil('ctx.interceptors.active.length > 0', { batch: 2, maxBatches: 260 });
  console.log('sentinel ignition:', ignS);
  if (ignS) {
    await shot('launch_ignition_sentinel');
    await step(14);
    await shot('launch_plume_sentinel');
    await step(80);
    await park(padS.x + 70, 8, padS.z + 55, padS.x, padS.y + 20, padS.z);
    await shot('launch_padsmoke_sentinel');
  }
  // night launch: pad illumination
  await scenario(35, 'single', 'night');
  await stepUntil('ctx.radar.activeTracks().length > 0', { batch: 15, maxBatches: 40 });
  await park(padP.x + 32, 4.5, padP.z + 28, padP.x, padP.y + 8, padP.z);
  await page.evaluate(() => {
    const g = window.__game;
    const tr = g.ctx.radar.activeTracks()[0];
    if (tr) { g.assign(tr.id, 'patriot'); g.authorize(tr.id); }
  });
  const ignN = await stepUntil('ctx.interceptors.active.length > 0', { batch: 2, maxBatches: 260 });
  console.log('night ignition:', ignN);
  if (ignN) {
    await shot('launch_ignition_night');
    await step(8);
    await shot('launch_plume_night');
  }
}

// ============================================================ F0. isolated fx cost
// Fixed camera, no scenario: measure draw calls with zero fx, at burst peak,
// and at +1 s — the effects' own draw-call share, uncontaminated by scene LOD.
if (has('salvo')) {
  await page.evaluate(() => window.__game.stopScenario());
  await park(-20, 3.7, 70, 0, 700, -2200);
  await step(40); // let old smoke/flashes die
  await perf('fxcost-idle');
  await page.evaluate(() => {
    const g = window.__game, ctx = g.ctx;
    const p = ctx.camera.position.clone();
    const mk = (x, y, z) => { const q = p.clone(); q.x += x; q.y += y; q.z += z; return q; };
    ctx.effects.explosionAir(mk(-150, 700, -1900), 1.25);
    ctx.effects.explosionAir(mk(250, 850, -2100), 1.25);
    ctx.effects.explosionAir(mk(50, 500, -1500), 0.55);
    ctx.effects.explosionGround(mk(150, 0, -900), 1.15);
    const pat = ctx.batteries.get('patriot').rig.group.position.clone();
    pat.y += 3;
    const up = p.clone(); up.set(0.2, 1, 0.1).normalize();
    ctx.effects.launchBlast(pat, up, 1.9);
    g.step(2, 33.34);
  });
  await perf('fxcost-burst');
  await shot('fxcost_burst_view');
  await step(30);
  await perf('fxcost-1s');
  await step(150);
  await perf('fxcost-6s');
}

// ============================================================ F. salvo composition + perf
if (has('salvo')) {
  await scenario(41, 'saturation', 'day');
  await stepUntil('ctx.radar.activeTracks().length >= 2', { batch: 30, maxBatches: 60 });
  await page.evaluate(() => window.__game.engageAll());
  await page.evaluate(() => window.__game.autoplay(true));
  // catch a kill as it happens: once birds are up, step in SMALL batches until
  // the intercepted count ticks — lastIntercept is then a frames-old burst we
  // can aim at while the flash/fireball is still alive
  await stepUntil('ctx.interceptors.active.length >= 1', { batch: 10, maxBatches: 60 });
  const i0 = await page.evaluate(() => window.__game.state().stats.intercepted);
  await stepUntil(`window.__game.state().stats.intercepted > ${i0}`, { batch: 3, maxBatches: 300 });
  const aim = await page.evaluate(() => {
    const li = window.__game.state().lastIntercept;
    return li ?? { x: 0, y: 1800, z: -3000 };
  });
  // close orbit: hop the camera 420 m base-side of the fresh kill, nearly
  // level with it (kill is ≤3 sim frames old when detected); shoot at ~0.3 s
  // so the fireball + debris streaks have formed, not just the flash ball
  await page.evaluate((a) => {
    const g = window.__game;
    const d = Math.hypot(a.x, a.z) || 1;
    const cx = a.x - (a.x / d) * 420, cz = a.z - (a.z / d) * 420;
    g.teleport(cx, Math.max(a.y - 160, 60) - 1.7, cz, 0, 0);
    g.lookAt(a.x, a.y, a.z);
    g.step(1, 1);
  }, aim);
  await step(9);
  await shot('salvo_kill_close');
  await perf('salvo-kill-close');
  await step(90);
  // later: lingering smoke blot (aim at TRUE kill altitude) + raid still inbound
  await park(30, 3.7, 90, aim.x, aim.y, aim.z);
  await shot('salvo_later');
  await perf('salvo-later');
}

console.log('done', LABEL);
await browser.close();
