// Full-scene screenshot + test suite.
// Usage: node tools/shots.mjs --iter 1 [--prod] [--skip-tests]
// Saves shots/iter_N/{view}.png + metrics.json + interactions.json + console.txt
// Exits non-zero if a required test fails.

import fs from 'node:fs';
import path from 'node:path';
import { startServer, launchBrowser, openApp, applyBaseline, shootView } from './lib.mjs';

const args = process.argv.slice(2);
function arg(name, def = null) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
}
const ITER = arg('iter', '1');
const PROD = args.includes('--prod');
const SKIP_TESTS = args.includes('--skip-tests');
const OUT = path.resolve(`shots/iter_${ITER}`);
fs.mkdirSync(OUT, { recursive: true });

const VIEWS = [
  'controlRoom', 'corridor', 'crewQuarters', 'engineRoom', 'machineryCloseup',
  'sonarConsole', 'forwardViewport', 'porthole', 'aftWide', 'walking',
];

const collect = { console: [], errors: [], pageErrors: [] };
const results = {};
let failures = [];

const { url, close } = await startServer({ prod: PROD });
console.log('server at', url, PROD ? '(production preview)' : '(dev)');
const browser = await launchBrowser();

function fail(name, detail) {
  failures.push(`${name}: ${detail}`);
  console.log(`  FAIL ${name}: ${detail}`);
}
function pass(name, detail = '') {
  console.log(`  PASS ${name} ${detail}`);
}

// NOTE: all polling runs on the Node side. In-page timers are throttled in
// headless contexts, and each evaluate forces a BeginFrame, which conveniently
// drives the app's rAF loop at a healthy rate during tests.

async function waitFrames(page, n = 2, timeoutMs = 30000) {
  const start = await page.evaluate(() => window.__frameCount || 0);
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const f = await page.evaluate(() => window.debugAPI.pumpFrame());
    if (f >= start + n) return;
    await page.waitForTimeout(50);
  }
}

async function waitSim(page, secs, timeoutMs = 90000) {
  const start = await page.evaluate(() => window.debugAPI.getSimTime());
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const s = await page.evaluate(() => { window.debugAPI.pumpFrame(); return window.debugAPI.getSimTime(); });
    if (s >= start + secs) return;
    await page.waitForTimeout(50);
  }
}

// poll a page-side condition until true, pumping the frame loop each poll
async function waitCond(page, fnBody, timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const ok = await page.evaluate(`(window.debugAPI.pumpFrame(), (${fnBody}))`);
    if (ok) return true;
    await page.waitForTimeout(90);
  }
  return false;
}

try {
  const visualPage = await openApp(browser, url, { seed: 1337, collect });
  console.log('app ready (visual page)');

  // ---------------- visual screenshots -------------------------------------
  await applyBaseline(visualPage, { state: 'cruising', wear: 'used' });
  for (const v of VIEWS) {
    await shootView(visualPage, v, path.join(OUT, `${v}.png`));
    console.log('shot', v);
  }

  // ---------------- metrics (motion on, walking view) ----------------------
  await visualPage.evaluate(() => {
    window.debugAPI.setView('walking');
    window.debugAPI.setMotionEnabled(true);
  });
  await waitFrames(visualPage, 8, 30000);
  const metrics = await visualPage.evaluate(() => window.debugAPI.getMetrics());
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2));
  console.log(`metrics: renderCost=${metrics.renderCostMs.toFixed(0)}ms (${metrics.fpsIndicative.toFixed(1)} fps indicative, software rasterizer), ${metrics.drawCalls} draws, ${metrics.triangles} tris, ${metrics.textures} tex`);
  await visualPage.close();

  if (!SKIP_TESTS) {
    // ---------------- interaction tests (cheap render path, small window) ---
    const page = await openApp(browser, url, { seed: 1337, collect, quality: 'low', width: 960, height: 540 });
    console.log('app ready (test page)');
    await page.evaluate(() => {
      window.debugAPI.resetScene();
      window.debugAPI.setHUDVisible(true);
    });
    await waitFrames(page, 3);

    // --- pointer lock + mouse look ---
    await page.mouse.click(480, 270);
    await page.waitForTimeout(400);
    const locked = await page.evaluate(() => document.pointerLockElement !== null);
    const yawBefore = await page.evaluate(() => window.debugAPI.getPose().yaw);
    await page.mouse.move(560, 270);
    await page.waitForTimeout(250);
    const yawAfter = await page.evaluate(() => window.debugAPI.getPose().yaw);
    const lookWorks = Math.abs(yawAfter - yawBefore) > 0.001;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
    let escapeNative = await page.evaluate(() => document.pointerLockElement === null);
    if (!escapeNative) {
      await page.evaluate(() => document.exitPointerLock());
      await page.waitForTimeout(250);
    }
    const unlocked = await page.evaluate(() => document.pointerLockElement === null);
    results.pointerLock = { locked, lookWorks, escapeNative, unlocked };
    if (locked && unlocked && lookWorks) pass('pointerLock', `escapeNative=${escapeNative}`);
    else fail('pointerLock', JSON.stringify(results.pointerLock));

    // --- movement ---
    await page.evaluate(() => window.debugAPI.teleport(0, 3.0, Math.PI, 0));
    await waitFrames(page, 2);
    const z0 = await page.evaluate(() => window.debugAPI.getPose().z);
    await page.keyboard.down('KeyW');
    await waitSim(page, 1.3);
    await page.keyboard.up('KeyW');
    await waitFrames(page, 1);
    const z1 = await page.evaluate(() => window.debugAPI.getPose().z);
    results.movement = { from: z0, to: z1, moved: z1 - z0 };
    if (z1 - z0 > 0.5) pass('movement', `moved ${(z1 - z0).toFixed(2)}m`);
    else fail('movement', `only ${(z1 - z0).toFixed(2)}m`);

    // --- collision (walk into the forward console) ---
    await page.evaluate(() => window.debugAPI.teleport(0, 2.6, 0, 0));
    await waitFrames(page, 1);
    await page.keyboard.down('KeyW');
    await waitSim(page, 2.2);
    await page.keyboard.up('KeyW');
    const zc = await page.evaluate(() => window.debugAPI.getPose().z);
    results.collision = { stoppedAt: zc };
    // walking toward the bow the player must be stopped by the helm seat
    // (2.16+r=2.43) or the console (1.32+r=1.59) — never pass z<1.3
    if (zc > 1.35 && zc < 2.5) pass('collision', `blocked at z=${zc.toFixed(2)}`);
    else fail('collision', `ended at z=${zc.toFixed(2)} (expected blocked in 1.35..2.5)`);

    // --- full traversal control room -> engine room (waypoint-steered walk) ---
    const waypoints = [
      [0, 3.6], [0, 5.79], [0, 6.5], [0.1, 9.6], [0, 12.6], [0, 13.39], [0, 14.3],
      [0, 16.4], [0, 17.4], [0, 18.4], [0, 19.85],
    ];
    await page.evaluate(() => window.debugAPI.teleport(0, 2.6, Math.PI, 0));
    await waitFrames(page, 1);
    await page.keyboard.down('KeyW');
    let maxZ = 0, wp = 0, stuckTicks = 0, lastZ = 0;
    const simBudget = await page.evaluate(() => window.debugAPI.getSimTime()) + 45;
    while (true) {
      const st = await page.evaluate(() => { window.debugAPI.pumpFrame(); return { pose: window.debugAPI.getPose(), sim: window.debugAPI.getSimTime() }; });
      maxZ = Math.max(maxZ, st.pose.z);
      if (st.pose.z >= 19.5 || st.sim > simBudget) break;
      while (wp < waypoints.length - 1 && Math.hypot(waypoints[wp][0] - st.pose.x, waypoints[wp][1] - st.pose.z) < 0.5) wp++;
      const [wx, wz] = waypoints[wp];
      const targetYaw = Math.atan2(-(wx - st.pose.x), -(wz - st.pose.z));
      await page.evaluate((yaw) => { window.__ctx.player.object.rotation.y = yaw; }, targetYaw);
      if (st.pose.z - lastZ < 0.01) stuckTicks++; else stuckTicks = 0;
      lastZ = st.pose.z;
      if (stuckTicks > 8) {
        const key = (Math.floor(stuckTicks / 8) % 2) ? 'KeyA' : 'KeyD';
        await page.keyboard.down(key);
        await waitSim(page, 0.5);
        await page.keyboard.up(key);
        stuckTicks = 0;
      }
      await waitSim(page, 0.3);
    }
    await page.keyboard.up('KeyW');
    results.traversal = { maxZ };
    // catwalk legitimately dead-ends at the motor guardrail (19.82 - r = 19.55)
    if (maxZ >= 19.4) pass('traversal', `reached z=${maxZ.toFixed(2)} (motor guardrail) in the engine room`);
    else fail('traversal', `stuck at z=${maxZ.toFixed(2)}`);

    // helper: aim at a target and check hover id
    async function aimAndHover(px, pz, tx, ty, tz, wantId) {
      const yaw = Math.atan2(-(tx - px), -(tz - pz));
      const deckY = await page.evaluate((z) => window.__ctx.collision.deckHeightAt(z), pz);
      const pitch = Math.atan2(ty - deckY - 1.7, Math.hypot(tx - px, tz - pz));
      let id = null;
      for (const dp of [0, -0.1, 0.1, -0.2, 0.2]) {
        await page.evaluate(({ px, pz, yaw, pitch }) => window.debugAPI.teleport(px, pz, yaw, pitch), { px, pz, yaw, pitch: pitch + dp });
        await waitFrames(page, 2);
        id = await page.evaluate(() => window.debugAPI.getHoveredId());
        if (id === wantId) break;
      }
      return id;
    }

    // --- sonar ---
    {
      const id = await aimAndHover(-0.28, 2.5, -0.95, 1.1, 3.05, 'sonar');
      results.hoverSonar = id;
      if (id !== 'sonar') fail('sonar', `hover id=${id}`);
      else {
        await page.keyboard.press('KeyE');
        const s1ok = await waitCond(page, `window.debugAPI.getStatusText().includes('Sonar pulse transmitted')`, 15000);
        const s2ok = await waitCond(page, `window.debugAPI.getStatusText().includes('No immediate contact')`, 60000);
        results.sonar = { s1ok, s2ok };
        if (s1ok && s2ok) pass('sonar');
        else fail('sonar', JSON.stringify(results.sonar));
      }
    }

    // --- rest (bunk) ---
    {
      const id = await aimAndHover(-0.3, 7.2, -1.02, 0.44, 7.6, 'rest');
      results.hoverRest = id;
      if (id !== 'rest') fail('rest', `hover id=${id}`);
      else {
        await page.evaluate(() => window.debugAPI.markFadePeak());
        await page.keyboard.press('KeyE');
        // generous windows: on the SwiftShader CI rasterizer each poll costs
        // seconds; sequence timing itself is frame-driven and deterministic
        const st1ok = await waitCond(page, `window.debugAPI.getStatusText().includes('6 hours pass')`, 30000);
        const state1ok = await waitCond(page, `window.debugAPI.getLightingState() === 'restCycle'`, 20000);
        const faded = await waitCond(page, `window.debugAPI.getFadePeak() > 0.85`, 20000);
        const st2ok = await waitCond(page, `window.debugAPI.getStatusText().includes('Rested')`, 90000);
        const state2ok = await waitCond(page, `window.debugAPI.getLightingState() === 'cruising'`, 30000);
        const fadedBack = await waitCond(page, `window.debugAPI.getFadeOpacity() < 0.15`, 20000);
        results.rest = { faded, st1ok, state1ok, fadedBack, st2ok, state2ok };
        const ok = faded && st1ok && state1ok && fadedBack && st2ok && state2ok;
        if (ok) pass('rest');
        else fail('rest', JSON.stringify(results.rest));
      }
    }

    // --- silent running ---
    {
      const id = await aimAndHover(0.05, 18.5, 0.62, 0.78, 17.98, 'silentRunning');
      results.hoverSilent = id;
      if (id !== 'silentRunning') fail('silentRunning', `hover id=${id}`);
      else {
        await page.keyboard.press('KeyE');
        const on1 = await waitCond(page, `window.debugAPI.getStatusText().includes('Silent running engaged')`, 8000);
        const stateOn = await waitCond(page, `window.debugAPI.getLightingState() === 'silentRunning'`, 8000);
        await waitSim(page, 1.5, 15000);
        await page.keyboard.press('KeyE');
        const off1 = await waitCond(page, `window.debugAPI.getStatusText().includes('Silent running disengaged')`, 8000);
        const stateOff = await waitCond(page, `window.debugAPI.getLightingState() === 'cruising'`, 8000);
        results.silentRunning = { on1, stateOn, off1, stateOff };
        const ok = on1 && stateOn && off1 && stateOff;
        if (ok) pass('silentRunning');
        else fail('silentRunning', JSON.stringify(results.silentRunning));
      }
    }

    // debug-API interaction invocations (secondary deterministic path)
    const dbgOk = await page.evaluate(() => {
      const a = window.debugAPI.triggerInteraction('sonar');
      const b = window.debugAPI.triggerInteraction('silentRunning');
      const c = window.debugAPI.triggerInteraction('silentRunning');
      const d = window.debugAPI.triggerInteraction('rest');
      return a && b && c && d;
    });
    results.debugTriggers = dbgOk;
    if (!dbgOk) fail('debugTriggers', 'triggerInteraction returned false');
    // let the triggered rest sequence finish cleanly (frame-driven)
    await waitCond(page, `window.debugAPI.getFadeOpacity() < 0.15 && window.debugAPI.getLightingState() === 'cruising'`, 30000);
    await page.close();
  }

  // ---------------- console/pageerror gate ----------------------------------
  const consoleTxt = [
    '=== console ===', ...collect.console,
    '=== console errors ===', ...collect.errors,
    '=== page errors ===', ...collect.pageErrors,
  ].join('\n');
  fs.writeFileSync(path.join(OUT, 'console.txt'), consoleTxt);
  fs.writeFileSync(path.join(OUT, 'interactions.json'), JSON.stringify(results, null, 2));

  const badErrors = [...collect.errors, ...collect.pageErrors].filter((e) => !e.includes('Autoplay') && !e.includes('AudioContext'));
  if (badErrors.length) fail('console', `${badErrors.length} errors: ${badErrors[0].slice(0, 300)}`);

  if (failures.length) {
    console.log(`\n${failures.length} FAILURES:\n- ` + failures.join('\n- '));
    process.exitCode = 1;
  } else {
    console.log('\nALL REQUIRED TESTS PASSED');
  }
} catch (err) {
  console.error('suite crashed:', err);
  fs.writeFileSync(path.join(OUT, 'console.txt'), ['CRASH: ' + String(err && err.stack || err), '=== console ===', ...collect.console, '=== errors ===', ...collect.errors, ...collect.pageErrors].join('\n'));
  process.exitCode = 2;
} finally {
  await browser.close();
  await close();
}
