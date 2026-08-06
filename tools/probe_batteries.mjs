// Probe: interceptor-battery visual-quality shots (RAMPART / HALBERD / SENTINEL)
// for iterative graphics loops. Usage: node tools/probe_batteries.mjs loop3 [static]
//   - "static" second arg: skip the scenario launch sections (fast detail loops)
// Writes shots_batteries/<label>_*.png and prints perf numbers.
// NOTE: every __game.step() call renders one swiftshader frame (~0.3-0.5 s),
// so all condition-polling batches many sim frames per render.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const LABEL = process.argv[2] ?? 'loop0';
const STATIC_ONLY = (process.argv[3] ?? '') === 'static';
const BASE = process.env.PROBE_URL ?? 'http://localhost:4186';
fs.mkdirSync('shots_batteries', { recursive: true });

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
  // stop the realtime rAF loop: player.update() re-snaps the camera every tick,
  // which would overwrite parked debug-camera positions. We render manually.
  window.__game.ctx.renderer.setAnimationLoop(null);
});

const step = (frames, dt = 33.34) => page.evaluate(([f, d]) => window.__game.step(f, d), [frames, dt]);
// CDP screenshot: page.screenshot() hangs on "waiting for fonts" once the HUD
// canvas starts drawing text in headless chromium, so capture via CDP directly.
const cdp = await page.context().newCDPSession(page);
async function shot(name) {
  try {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`shots_batteries/${LABEL}_${name}.png`, Buffer.from(data, 'base64'));
    console.log('shot', name);
  } catch (e) {
    console.log('SHOT FAILED', name, String(e).slice(0, 120));
  }
}

/** step in batches until pageCondition (JS string) is true; ~1 render per batch */
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

/** park the (disabled) player eye at world p looking at t, then a tiny step so
 *  camera-distance-dependent visuals recompute, then render */
async function park(px, py, pz, tx, ty, tz) {
  await page.evaluate(([a, b, c, d, e, f]) => {
    const g = window.__game;
    g.teleport(a, b - 1.7, c, 0, 0); // player disabled -> eye = feet + 1.7
    g.lookAt(d, e, f);
    g.step(1, 1);
  }, [px, py, pz, tx, ty, tz]);
}

/** park the camera in BATTERY-LOCAL coordinates (reads live group pos+yaw, so
 *  it stays framed even after the halberd slews its whole chassis) */
async function parkLocal(batId, cam, target) {
  await page.evaluate(([bid, c, t]) => {
    const g = window.__game;
    const rig = g.ctx.batteries.get(bid).rig;
    const p = rig.group.position, h = rig.group.rotation.y;
    const W = (l) => ({
      x: p.x + l[0] * Math.cos(h) + l[2] * Math.sin(h),
      y: p.y + l[1],
      z: p.z - l[0] * Math.sin(h) + l[2] * Math.cos(h),
    });
    const cw = W(c), tw = W(t);
    g.teleport(cw.x, cw.y - 1.7, cw.z, 0, 0);
    g.lookAt(tw.x, tw.y, tw.z);
    g.step(1, 1);
  }, [batId, cam, target]);
}

const perf = async (tag) => {
  const p = await page.evaluate(() => window.__game.perf());
  console.log(`PERF(${tag}):`, JSON.stringify(p));
  return p;
};

// ============================================================ A. static day
await page.evaluate(() => { window.__game.setTimeOfDay('day'); });
await step(40); // settle time-of-day blend + shadows

// wide group view from the base center (player-spawn-ish readability check)
await park(1, 3.2, -26, 0, 4, 45);
await shot('wide_group_from_base');

// per-battery framing: [name, camLocal, targetLocal]
const closeShots = {
  patriot: [
    ['rampart_front34', [9.5, 3.6, 11.0], [0, 2.4, 1.6]],
    ['rampart_rear34', [-6.5, 2.6, -7.5], [0, 2.4, 0.5]],
    ['rampart_muzzle', [2.2, 4.3, 2.6], [0, 3.6, -1.4]],
    ['rampart_truck', [5.5, 2.6, 14.5], [-0.5, 2.0, 8.5]],
  ],
  thaad: [
    ['halberd_front34', [8.0, 3.2, 8.5], [0, 2.8, 0.5]],
    ['halberd_rear34', [-7.0, 3.4, -9.0], [0, 3.0, -0.5]],
    ['halberd_muzzle', [2.6, 4.6, 3.4], [-0.2, 3.4, -1.4]],
  ],
  sentinel: [
    ['sentinel_front34', [10.5, 4.2, 11.5], [-0.8, 4.5, 0]],
    ['sentinel_rear34', [-9.0, 3.4, -11.0], [0, 4.5, 0.5]],
    ['sentinel_detail', [4.2, 2.4, 5.2], [0, 2.2, 0.2]],
  ],
};
for (const [bid, shots] of Object.entries(closeShots)) {
  for (const [name, cam, tgt] of shots) {
    await parkLocal(bid, cam, tgt);
    await shot(name);
  }
}
// 50-70 m readability shots
await parkLocal('patriot', [28, 3.4, 46], [0, 2.5, 0]);
await shot('rampart_55m');
await parkLocal('thaad', [30, 3.4, 48], [0, 3, 0]);
await shot('halberd_55m');
await parkLocal('sentinel', [34, 4.0, 52], [0, 5, 0]);
await shot('sentinel_62m');

// perf: representative ground view seeing all three pads
await park(0, 2.6, -8, 0, 4, 45);
await step(2);
await perf('ground-view-day');
// per-battery draw-call cost via visibility toggling. Statics of rampart +
// sentinel live in a shared world-merged group (ctx.batteries.staticRoot), so
// the honest TOTAL hides the rigs AND that group together.
const cost = await page.evaluate(() => {
  const g = window.__game, ctx = g.ctx;
  const ids = ['patriot', 'thaad', 'sentinel'];
  const out = {};
  g.step(1, 1);
  const base = ctx.renderer.info.render.calls;
  for (const id of ids) {
    const rig = ctx.batteries.get(id).rig;
    rig.group.visible = false;
    g.step(1, 1);
    out[id] = base - ctx.renderer.info.render.calls;
    rig.group.visible = true;
    // main-pass object count (each visible drawable = 1 main draw call)
    let n = 0;
    rig.group.traverse((o) => { if (o.visible && (o.isMesh || o.isInstancedMesh || o.isSprite || o.isPoints || o.isLine)) n++; });
    out[id + 'Meshes'] = n;
  }
  const sroot = ctx.batteries.staticRoot;
  if (sroot) {
    sroot.visible = false;
    g.step(1, 1);
    out.staticShared = base - ctx.renderer.info.render.calls;
    sroot.visible = true;
    let n = 0;
    sroot.traverse((o) => { if (o.visible && (o.isMesh || o.isInstancedMesh)) n++; });
    out.staticMeshes = n;
  }
  for (const id of ids) ctx.batteries.get(id).rig.group.visible = false;
  if (sroot) sroot.visible = false;
  g.step(1, 1);
  out.total = base - ctx.renderer.info.render.calls;
  for (const id of ids) ctx.batteries.get(id).rig.group.visible = true;
  if (sroot) sroot.visible = true;
  g.step(1, 1);
  out.sceneCalls = base;
  return out;
});
console.log('BATTERY DRAW-CALL COST:', JSON.stringify(cost));

// ============================================================ B. erection preview (no scenario)
// pointAt() drives slew + elevation directly; relax() returns to rest.
await page.evaluate(() => {
  const g = window.__game;
  g.ctx.batteries.get('thaad').pointAt({ x: 4000, y: 3000, z: 8000 });
  g.ctx.batteries.get('sentinel').pointAt({ x: 9000, y: 8000, z: 2000 });
  g.step(16, 33.34); // ~0.5 s: mid-erection
});
await parkLocal('thaad', [8.5, 3.0, 6.5], [0, 3.2, -1.5]);
await shot('halberd_mid_erection');
await parkLocal('sentinel', [10.0, 3.6, 9.0], [-0.5, 4.5, 0.5]);
await shot('sentinel_mid_erection');
await page.evaluate(() => {
  const g = window.__game;
  g.ctx.batteries.get('thaad').relax();
  g.ctx.batteries.get('sentinel').relax();
  g.step(140, 33.34);
});

if (!STATIC_ONLY) {
  // ========================================================== C. launch sequences
  // catch state==='launching' -> park -> single-frame to interceptor spawn -> flash
  async function launchRun(tag, batteryId, gate, camL, tgtL, opts = {}) {
    await page.evaluate(([tod]) => {
      const g = window.__game;
      g.stopScenario();
      g.seed(7);
      g.setTimeOfDay(tod);
      g.start('single');
      g.autoplay(false);
    }, [opts.timeOfDay ?? 'day']);
    await stepUntil('ctx.threats.active.length > 0', { batch: 15, maxBatches: 20 });
    const ok = await stepUntil(gate, { batch: 30, maxBatches: 90 });
    if (!ok) { console.log('WARN: gate not reached for', tag); return; }
    await page.evaluate((bid) => {
      const g = window.__game;
      const tr = g.ctx.radar.activeTracks()[0];
      if (tr) { g.assign(tr.id, bid); g.authorize(); }
    }, batteryId);
    // mid-sequence (slewing/erecting) shot
    await stepUntil(`ctx.batteries.get('${batteryId}').state !== 'ready'`, { batch: 4, maxBatches: 30 });
    await step(opts.midDelay ?? 12);
    await parkLocal(batteryId, camL, tgtL);
    await shot(`${tag}_sequence`);
    // wait for the launching state, then park and single-step to the flash
    const armed = await stepUntil(`ctx.batteries.get('${batteryId}').state === 'launching'`, { batch: 6, maxBatches: 120 });
    if (!armed) { console.log('WARN: no launching state for', tag); return; }
    await parkLocal(batteryId, opts.flashCam ?? camL, opts.flashTgt ?? tgtL);
    const flashed = await stepUntil('ctx.interceptors.active.length > 0', { batch: 1, maxBatches: 140 });
    if (flashed) {
      await step(2); // flash blooms over ~0.1 s
      await shot(`${tag}_launch_flash`);
      await step(10);
      await shot(`${tag}_launch_plume`);
    } else console.log('WARN: no launch for', tag);
    // post-fire wear: muzzle close-up after smoke clears
    if (opts.afterCam) {
      await step(90);
      await parkLocal(batteryId, opts.afterCam, opts.afterTgt ?? tgtL);
      await shot(`${tag}_after_fire`);
    }
  }

  await launchRun('sentinel', 'sentinel',
    '(() => { const t2 = ctx.threats.active[0]; return !t2 || (ctx.radar.activeTracks().length > 0 && t2.pos.y > 2400); })()',
    [11, 4.5, 10], [-0.5, 5, 0.5],
    { midDelay: 20, flashCam: [13, 6, 12], flashTgt: [0, 6, 1], afterCam: [4.5, 2.6, 5.5], afterTgt: [0, 2.2, 0.5] });
  await launchRun('halberd', 'thaad',
    '(() => { const t2 = ctx.threats.active[0]; return !t2 || (t2.pos.y < 4800 && Math.hypot(t2.pos.x, t2.pos.z) < 7000); })()',
    [8.5, 3.2, 7.0], [0, 3.4, -1.0],
    { midDelay: 16, flashCam: [10, 5.5, 8.5], flashTgt: [0, 4.5, 0], afterCam: [3.2, 4.4, 4.2], afterTgt: [-0.2, 3.4, -1.2] });
  await launchRun('rampart', 'patriot',
    '(() => { const t2 = ctx.threats.active[0]; return !t2 || (t2.pos.y < 2400 && Math.hypot(t2.pos.x, t2.pos.z) < 3800); })()',
    [7.5, 3.0, 7.0], [0, 2.8, -1.0],
    { midDelay: 10, flashCam: [9, 5, 8], flashTgt: [0, 4, -1.5], afterCam: [2.4, 4.3, 3.0], afterTgt: [0, 3.6, -1.4] });

  await perf('post-launches');
}

// ============================================================ D. night
await page.evaluate(() => {
  const g = window.__game;
  g.stopScenario();
  g.setTimeOfDay('night');
});
await step(150); // let the blend fully settle
await parkLocal('patriot', [6.5, 3.0, 6.5], [0, 2.4, -0.5]);
await shot('rampart_night');
await parkLocal('thaad', [7.5, 3.2, 7.5], [0, 3.0, 0]);
await shot('halberd_night');
await parkLocal('sentinel', [10, 4.2, 10.5], [-0.8, 4.6, 0]);
await shot('sentinel_night');
await park(0, 2.6, -8, 0, 5, 45);
await shot('wide_group_night');

// ============================================================ E. sunset
await page.evaluate(() => { window.__game.setTimeOfDay('sunset'); });
await step(150);
await parkLocal('patriot', [7.5, 3.4, 7.0], [0, 2.6, -1.2]);
await shot('rampart_sunset');
await parkLocal('thaad', [8.0, 3.2, 8.5], [0, 2.8, 0.5]);
await shot('halberd_sunset');
await parkLocal('sentinel', [10.5, 4.2, 11.5], [-0.8, 4.5, 0]);
await shot('sentinel_sunset');

await perf('final');
console.log('done', LABEL);
await browser.close();
