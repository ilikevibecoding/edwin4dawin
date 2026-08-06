// Probe: missile visual-quality shots (threats + interceptors) for iterative
// graphics loops. Usage: node tools/probe_missiles.mjs loop3
// Writes shots_missiles/<label>_*.png and prints perf numbers.
// NOTE: every __game.step() call renders one swiftshader frame (~0.3-0.5 s),
// so all condition-polling batches many sim frames per render.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const LABEL = process.argv[2] ?? 'loop0';
const BASE = process.env.PROBE_URL ?? 'http://localhost:4181';
fs.mkdirSync('shots_missiles', { recursive: true });

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
    fs.writeFileSync(`shots_missiles/${LABEL}_${name}.png`, Buffer.from(data, 'base64'));
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

/** park the (disabled) player eye at p looking at t, then 1 ms step so all
 *  camera-distance-dependent visuals (sprite scales) recompute, then render */
async function park(px, py, pz, tx, ty, tz) {
  await page.evaluate(([a, b, c, d, e, f]) => {
    const g = window.__game;
    g.teleport(a, b - 1.7, c, 0, 0); // player disabled -> feet stay airborne
    g.lookAt(d, e, f);
    g.step(1, 1); // 1 ms: recompute per-frame visuals against the new camera
  }, [px, py, pz, tx, ty, tz]);
}

const getThreat = (pred = '') => page.evaluate((p) => {
  const list = window.__game.ctx.threats.active;
  const t = p === 'decoy' ? list.find((x) => x.isDecoy) : p === 'warhead' ? list.find((x) => !x.isDecoy) : list[0];
  if (!t) return null;
  return { x: t.pos.x, y: t.pos.y, z: t.pos.z, vx: t.vel.x, vy: t.vel.y, vz: t.vel.z, decoy: t.isDecoy };
}, pred);

const getInterceptor = () => page.evaluate(() => {
  const it = window.__game.ctx.interceptors.active[0];
  if (!it) return null;
  return { x: it.pos.x, y: it.pos.y, z: it.pos.z, vx: it.vel.x, vy: it.vel.y, vz: it.vel.z, phase: it.phase, age: it.age };
});

/** ATOMIC closure catch: step until interceptor[0] is < dist of ITS threat,
 *  then park the camera in the SAME js turn (no race with fuzing/salvo).
 *  Offset is a horizontal perpendicular to the pair separation at 0.95*d so
 *  BOTH airframes fit the 66-deg vFOV even when the closure is near-vertical. */
const parkAtClosure = (dist) => page.evaluate(([dd]) => {
  const g = window.__game, ctx = g.ctx;
  for (let n = 0; n < 260; n++) {
    const i2 = ctx.interceptors.active[0];
    const t2 = i2 && i2.threat && i2.threat.alive ? i2.threat : null;
    if (!i2 || !t2) return { ok: false, reason: 'pair gone', n };
    const d = i2.pos.distanceTo(t2.pos);
    if (d < dd) {
      const sx = t2.pos.x - i2.pos.x, sz = t2.pos.z - i2.pos.z;
      let ox = sz, oz = -sx; // cross(sep, +Y): horizontal, perpendicular to sep
      let ol = Math.hypot(ox, oz);
      if (ol < d * 0.2) { ox = 1; oz = 0; ol = 1; } // near-vertical pair: any horizontal
      const cd = Math.max(26, d * 0.95);
      const mx = (i2.pos.x + t2.pos.x) / 2, my = (i2.pos.y + t2.pos.y) / 2, mz = (i2.pos.z + t2.pos.z) / 2;
      g.teleport(mx + (ox / ol) * cd, my - 1.7, mz + (oz / ol) * cd, 0, 0);
      g.lookAt(mx, my, mz);
      g.step(1, 1);
      return { ok: true, d: Math.round(d), cd: Math.round(cd), n };
    }
    const frames = d < dd * 3 ? 1 : Math.min(40, Math.max(1, Math.floor((d - dd) / 160)));
    g.step(frames, 33.34);
  }
  return { ok: false, reason: 'timeout' };
}, [dist]);

/** ATOMIC kill catch: predict the intercept point from the pair's current
 *  state, pre-park the camera watching that point, then step single frames
 *  until the fuze resolves — the detonation renders near frame center. */
const killWatch = (camDist = 85) => page.evaluate(([cdist]) => {
  const g = window.__game, ctx = g.ctx;
  const i2 = ctx.interceptors.active[0];
  const t2 = i2 && i2.threat && i2.threat.alive ? i2.threat : null;
  if (!i2 || !t2) return { ok: false, reason: 'no pair' };
  const rx = t2.pos.x - i2.pos.x, ry = t2.pos.y - i2.pos.y, rz = t2.pos.z - i2.pos.z;
  const d = Math.hypot(rx, ry, rz);
  const cvx = i2.vel.x - t2.vel.x, cvy = i2.vel.y - t2.vel.y, cvz = i2.vel.z - t2.vel.z;
  const closing = Math.max(120, (rx * cvx + ry * cvy + rz * cvz) / d);
  const tgo = d / closing;
  const px = t2.pos.x + t2.vel.x * tgo, py = t2.pos.y + t2.vel.y * tgo, pz = t2.pos.z + t2.vel.z * tgo;
  let sx = t2.vel.z, sz = -t2.vel.x;
  const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
  g.teleport(px + sx * cdist, py + cdist * 0.2 - 1.7, pz + sz * cdist, 0, 0);
  g.lookAt(px, py, pz);
  for (let n = 0; n < 40; n++) {
    g.step(1, 33.34);
    const ii = ctx.interceptors.active[0];
    if (!ii || !ii.threat || !ii.threat.alive) {
      g.step(1, 16); // let the fireball bloom one small step
      return { ok: true, n, tgo: +tgo.toFixed(2), d: Math.round(d) };
    }
  }
  return { ok: false, reason: 'no detonation in 40 frames' };
}, [camDist]);

/** camera offset for a 3/4 side view of an object moving with velocity v */
function sideOffset(t, dist, lift = 0.28, alongK = -0.35) {
  const sp = Math.hypot(t.vx, t.vy, t.vz) || 1;
  const fx = t.vx / sp, fz = t.vz / sp;
  let sx = fz, sz = -fx;
  const sl = Math.hypot(sx, sz) || 1;
  sx /= sl; sz /= sl;
  return {
    px: t.x + sx * dist + (t.vx / sp) * dist * alongK,
    py: t.y + dist * lift,
    pz: t.z + sz * dist + (t.vz / sp) * dist * alongK,
  };
}

// ============================================================ A. threat solo (day)
await page.evaluate(() => {
  window.__game.seed(7);
  window.__game.setTimeOfDay('day');
  window.__game.start('single');
  window.__game.autoplay(false);
});
await stepUntil('ctx.threats.active.length > 0', { batch: 15, maxBatches: 20 });
await step(45); // let the trail develop ~1.5 s
let t = await getThreat();
if (t) {
  const o = sideOffset(t, 19);
  await park(o.px, o.py, o.pz, t.x, t.y, t.z);
  await shot('threat_close_midcourse');
  const sp = Math.hypot(t.vx, t.vy, t.vz) || 1;
  await park(t.x + (t.vx / sp) * 20 + 9, t.y + (t.vy / sp) * 20 - 4, t.z + (t.vz / sp) * 20 + 9, t.x, t.y, t.z);
  await shot('threat_close_noseon');
} else console.log('WARN: no threat spawned (A)');

// terminal dive below 1500 m
await stepUntil('!ctx.threats.active[0] || ctx.threats.active[0].pos.y < 1500', { batch: 40, maxBatches: 60 });
t = await getThreat();
if (t) {
  const o = sideOffset(t, 30, 0.15);
  await park(o.px, o.py, o.pz, t.x, t.y, t.z);
  await shot('threat_terminal_dive');
  await park(10, 3, 60, t.x, t.y, t.z);
  // diagnostic: is the far-distance dark speck actually rendering?
  const dotDiag = await page.evaluate(() => {
    const th = window.__game.ctx.threats.active[0];
    if (!th) return null;
    return {
      dCam: Math.round(th.pos.distanceTo(window.__game.ctx.camera.position)),
      dotScale: +th.dot.scale.x.toFixed(1),
      dotOp: +th.dot.material.opacity.toFixed(2),
      dotVisible: th.dot.visible && th.group.visible,
    };
  });
  console.log('dotDiag:', JSON.stringify(dotDiag));
  await shot('threat_distant_from_base');
} else console.log('WARN: threat gone before terminal shots');
await page.evaluate(() => window.__game.stopScenario());

// ============================================================ B. night raid decoys
await page.evaluate(() => {
  window.__game.seed(5);
  window.__game.start('nightraid');
  window.__game.autoplay(false);
});
await stepUntil('ctx.threats.active.some((t) => t.isDecoy)', { batch: 30, maxBatches: 40 });
await step(45);
let d = await getThreat('decoy');
if (d) {
  const o = sideOffset(d, 12);
  await park(o.px, o.py, o.pz, d.x, d.y, d.z);
  await shot('decoy_close_night');
} else console.log('WARN: no decoy (B)');
await stepUntil('ctx.threats.active.some((t) => !t.isDecoy)', { batch: 20, maxBatches: 30 });
const w = await getThreat('warhead');
if (w) {
  const o = sideOffset(w, 24);
  await park(o.px, o.py, o.pz, w.x, w.y, w.z);
  await shot('threat_close_night');
} else console.log('WARN: no warhead for night shot');
// night boost: authorize the defense and catch a motor in the dark
await page.evaluate(() => window.__game.autoplay(true));
await stepUntil('ctx.interceptors.active.length > 0', { batch: 10, maxBatches: 60 });
let itn = await getInterceptor();
if (itn) {
  await step(8);
  itn = await getInterceptor();
  if (itn) {
    const o = sideOffset(itn, 24, 0.3);
    await park(o.px, o.py, o.pz, itn.x, itn.y, itn.z);
    await shot('interceptor_boost_night');
  }
}
await page.evaluate(() => window.__game.stopScenario());

// ============================================================ C. engagement (autoplay)
await page.evaluate(() => {
  window.__game.seed(7);
  window.__game.setTimeOfDay('day');
  window.__game.start('single');
  window.__game.autoplay(true);
});
// coarse-wait for a battery to start launching, then fine-wait for the round
await stepUntil("ctx.batteries.list.some((b) => b.state === 'launching') || ctx.interceptors.active.length > 0", { batch: 30, maxBatches: 40 });
await stepUntil('ctx.interceptors.active.length > 0', { batch: 2, maxBatches: 80 });
let it = await getInterceptor();
if (it) {
  await step(6); // ~0.2 s: clearing the rail
  it = await getInterceptor();
  const o = sideOffset(it, 17, 0.12);
  await park(o.px, Math.max(o.py, it.y + 1), o.pz, it.x, it.y, it.z);
  await shot('interceptor_boost_pad');
  // high 3/4 from the opposite side (behind-view sits inside pad structures)
  const ob = sideOffset(it, 22, 0.65, 0.3);
  await park(ob.px, ob.py, ob.pz, it.x, it.y + 2, it.z);
  await shot('interceptor_boost_behind');
  it = await getInterceptor();
  if (it) {
    await park(-30, 3, 55, it.x, it.y, it.z);
    await shot('interceptor_distant_climb');
  }
  // midcourse close-up (post-boost)
  await stepUntil("!ctx.interceptors.active[0] || ctx.interceptors.active[0].phase !== 'boost'", { batch: 10, maxBatches: 40 });
  it = await getInterceptor();
  if (it) {
    const o2 = sideOffset(it, 16);
    await park(o2.px, o2.py, o2.pz, it.x, it.y, it.z);
    await shot('interceptor_midcourse_close');
  }
  // terminal closure: atomic step+park (fuze/salvo can't slip between calls),
  // then pre-park at the predicted intercept point and catch the detonation
  const r1 = await parkAtClosure(170);
  console.log('closure1:', JSON.stringify(r1));
  if (r1.ok) await shot('terminal_closure');
  else console.log('WARN: closure shot missed');
  const k1 = await killWatch(90);
  console.log('kill1:', JSON.stringify(k1));
  if (k1.ok) await shot('terminal_kill');
  // representative gameplay perf: ground view from the base looking at the fight
  let tt = await getThreat();
  const lookY = tt ? tt.y : 2000;
  await park(-20, 3.7, 70, tt ? tt.x : 0, lookY, tt ? tt.z : -2000);
  const perfMid = await page.evaluate(() => window.__game.perf());
  console.log('PERF(ground-view):', JSON.stringify(perfMid));
} else console.log('WARN: no interceptor launched (C)');

// ============================================================ C2. RAMPART + HALBERD variants
// manual assignment: wait for the threat to descend into each battery's window
async function variantSection(tag, batteryId, gate) {
  await page.evaluate(() => {
    window.__game.stopScenario();
    window.__game.seed(21);
    window.__game.setTimeOfDay('day');
    window.__game.start('single');
    window.__game.autoplay(false);
  });
  await stepUntil('ctx.threats.active.length > 0', { batch: 15, maxBatches: 20 });
  const ok = await stepUntil(gate, { batch: 30, maxBatches: 80 });
  if (!ok) { console.log('WARN: gate not reached for', tag); return; }
  await page.evaluate((bid) => {
    const g = window.__game;
    const tr = g.ctx.radar.activeTracks()[0];
    if (tr) { g.assign(tr.id, bid); g.authorize(); }
  }, batteryId);
  const launched = await stepUntil('ctx.interceptors.active.length > 0', { batch: 6, maxBatches: 120 });
  if (!launched) { console.log('WARN: no launch for', tag); return; }
  await step(5);
  let iv = await getInterceptor();
  if (!iv) return;
  const o3 = sideOffset(iv, 14, 0.14);
  await park(o3.px, Math.max(o3.py, iv.y + 0.8), o3.pz, iv.x, iv.y, iv.z);
  await shot(`${tag}_boost`);
  // mid-flight close-up a bit later
  await step(40);
  iv = await getInterceptor();
  if (iv) {
    const o4 = sideOffset(iv, 13);
    await park(o4.px, o4.py, o4.pz, iv.x, iv.y, iv.z);
    await shot(`${tag}_flight_close`);
  }
  // low-altitude terminal closure (threat is hot here → plasma + glow in frame)
  const near = await parkAtClosure(150);
  console.log(tag, 'closure:', JSON.stringify(near));
  if (near.ok) await shot(`${tag}_closure`);
  else console.log('WARN:', tag, 'closure missed (intercept resolved first)');
  const kk = await killWatch(80);
  console.log(tag, 'kill:', JSON.stringify(kk));
  if (kk.ok) await shot(`${tag}_kill`);
}
await variantSection('rampart', 'patriot',
  '(() => { const t2 = ctx.threats.active[0]; return !t2 || (t2.pos.y < 2400 && Math.hypot(t2.pos.x, t2.pos.z) < 3800); })()');
await variantSection('halberd', 'thaad',
  '(() => { const t2 = ctx.threats.active[0]; return !t2 || (t2.pos.y < 4800 && Math.hypot(t2.pos.x, t2.pos.z) < 7000); })()');

// ============================================================ D. sunset lighting check
await page.evaluate(() => {
  window.__game.stopScenario();
  window.__game.seed(7);
  window.__game.setTimeOfDay('sunset');
  window.__game.start('single');
  window.__game.autoplay(false);
});
await stepUntil('ctx.threats.active.length > 0', { batch: 15, maxBatches: 20 });
await step(45);
t = await getThreat();
if (t) {
  const o = sideOffset(t, 24);
  await park(o.px, o.py, o.pz, t.x, t.y, t.z);
  await shot('threat_close_sunset');
}
const perfEnd = await page.evaluate(() => window.__game.perf());
console.log('PERF(final):', JSON.stringify(perfEnd));

console.log('done', LABEL);
await browser.close();
