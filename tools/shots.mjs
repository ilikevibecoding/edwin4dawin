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
const results = { pointerLock: null, movement: null, collision: null, traversal: null, sonar: null, rest: null, silentRunning: null, hover: {} };
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

try {
  const page = await openApp(browser, url, { seed: 1337, collect });
  console.log('app ready');

  // ---------------- visual screenshots -------------------------------------
  await applyBaseline(page, { state: 'cruising', wear: 'used' });
  for (const v of VIEWS) {
    const p = await shootView(page, v, path.join(OUT, `${v}.png`));
    console.log('shot', v);
  }

  // ---------------- metrics (motion on, walking view) ----------------------
  await page.evaluate(() => {
    window.debugAPI.setView('walking');
    window.debugAPI.setMotionEnabled(true);
  });
  await page.waitForTimeout(6000);
  const metrics = await page.evaluate(() => window.debugAPI.getMetrics());
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2));
  console.log(`metrics: ${metrics.fps.toFixed(1)} fps, ${metrics.drawCalls} draws, ${metrics.triangles} tris, ${metrics.textures} tex, renderer=${metrics.renderer.slice(0, 60)}`);

  if (!SKIP_TESTS) {
    // ---------------- interaction tests ------------------------------------
    await page.evaluate(() => {
      window.debugAPI.resetScene();
      window.debugAPI.setHUDVisible(true);
    });
    await page.waitForTimeout(400);

    // --- pointer lock ---
    await page.mouse.click(800, 450);
    await page.waitForTimeout(500);
    let locked = await page.evaluate(() => document.pointerLockElement !== null);
    // mouse look while locked
    let yawBefore = await page.evaluate(() => window.debugAPI.getPose().yaw);
    await page.mouse.move(900, 450);
    await page.waitForTimeout(200);
    let yawAfter = await page.evaluate(() => window.debugAPI.getPose().yaw);
    const lookWorks = Math.abs(yawAfter - yawBefore) > 0.001;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const unlocked = await page.evaluate(() => document.pointerLockElement === null);
    results.pointerLock = { locked, lookWorks, unlocked };
    if (locked && unlocked) pass('pointerLock', `look=${lookWorks}`);
    else fail('pointerLock', JSON.stringify(results.pointerLock));

    // --- movement ---
    await page.evaluate(() => window.debugAPI.teleport(0, 3.0, Math.PI, 0)); // face aft
    await page.waitForTimeout(150);
    const z0 = await page.evaluate(() => window.debugAPI.getPose().z);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1000);
    await page.keyboard.up('KeyW');
    const z1 = await page.evaluate(() => window.debugAPI.getPose().z);
    results.movement = { from: z0, to: z1, moved: z1 - z0 };
    if (z1 - z0 > 0.5) pass('movement', `moved ${(z1 - z0).toFixed(2)}m`);
    else fail('movement', `only ${(z1 - z0).toFixed(2)}m`);

    // --- collision (walk into the forward console) ---
    await page.evaluate(() => window.debugAPI.teleport(0, 2.6, 0, 0)); // face bow
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1600);
    await page.keyboard.up('KeyW');
    const zc = await page.evaluate(() => window.debugAPI.getPose().z);
    results.collision = { stoppedAt: zc };
    if (zc > 1.35) pass('collision', `stopped at z=${zc.toFixed(2)} (console front at 1.32)`);
    else fail('collision', `passed through console to z=${zc.toFixed(2)}`);

    // --- full traversal control room -> engine room (steered walk) ---
    await page.evaluate(() => window.debugAPI.teleport(0, 1.2, Math.PI, 0));
    await page.keyboard.down('KeyW');
    let maxZ = 0, stuckMs = 0, lastZ = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 75000) {
      const pose = await page.evaluate(() => window.debugAPI.getPose());
      maxZ = Math.max(maxZ, pose.z);
      if (pose.z >= 19.6) break;
      // steer toward corridor centerline, aiming aft
      const targetYaw = Math.PI + Math.max(-0.5, Math.min(0.5, pose.x * 0.85));
      await page.evaluate((yaw) => { window.__ctx.player.object.rotation.y = yaw; }, targetYaw);
      if (pose.z - lastZ < 0.02) stuckMs += 120; else stuckMs = 0;
      lastZ = pose.z;
      if (stuckMs > 2500) {
        // wiggle sideways
        await page.keyboard.down(stuckMs % 5000 < 2500 ? 'KeyA' : 'KeyD');
        await page.waitForTimeout(420);
        await page.keyboard.up('KeyA');
        await page.keyboard.up('KeyD');
      }
      await page.waitForTimeout(120);
    }
    await page.keyboard.up('KeyW');
    results.traversal = { maxZ };
    if (maxZ >= 19.6) pass('traversal', `reached z=${maxZ.toFixed(2)} in engine room`);
    else fail('traversal', `stuck at z=${maxZ.toFixed(2)}`);

    // helper: aim at a target and check hover id
    async function aimAndHover(px, pz, tx, ty, tz, wantId) {
      const yaw = Math.atan2(-(tx - px), -(tz - pz));
      const eye = 1.7;
      const pitch = Math.atan2(ty - (await page.evaluate((z) => window.__ctx.collision.deckHeightAt(z), pz)) - eye, Math.hypot(tx - px, tz - pz));
      await page.evaluate(({ px, pz, yaw, pitch }) => window.debugAPI.teleport(px, pz, yaw, pitch), { px, pz, yaw, pitch });
      await page.waitForTimeout(350);
      let id = await page.evaluate(() => window.debugAPI.getHoveredId());
      if (id !== wantId) {
        // scan small offsets
        for (const dp of [-0.12, 0.12, -0.24, 0.24]) {
          await page.evaluate(({ px, pz, yaw, pitch }) => window.debugAPI.teleport(px, pz, yaw, pitch), { px, pz, yaw, pitch: pitch + dp });
          await page.waitForTimeout(250);
          id = await page.evaluate(() => window.debugAPI.getHoveredId());
          if (id === wantId) break;
        }
      }
      return id;
    }

    // --- sonar ---
    {
      const id = await aimAndHover(-0.35, 3.1, -1.05, 0.85, 3.1, 'sonar');
      results.hover.sonar = id;
      if (id !== 'sonar') fail('sonar', `hover id=${id}`);
      else {
        await page.keyboard.press('KeyE');
        await page.waitForTimeout(600);
        const s1 = await page.evaluate(() => window.debugAPI.getStatusText());
        await page.waitForTimeout(2600);
        const s2 = await page.evaluate(() => window.debugAPI.getStatusText());
        results.sonar = { s1, s2 };
        if (s1.includes('Sonar pulse transmitted') && s2.includes('No immediate contact')) pass('sonar');
        else fail('sonar', JSON.stringify(results.sonar));
      }
    }

    // --- rest (bunk) ---
    {
      const id = await aimAndHover(-0.3, 7.2, -1.02, 0.44, 7.6, 'rest');
      results.hover.rest = id;
      if (id !== 'rest') fail('rest', `hover id=${id}`);
      else {
        await page.keyboard.press('KeyE');
        await page.waitForTimeout(1300);
        const fade1 = await page.evaluate(() => window.debugAPI.getFadeOpacity());
        const st1 = await page.evaluate(() => window.debugAPI.getStatusText());
        const state1 = await page.evaluate(() => window.debugAPI.getLightingState());
        await page.waitForTimeout(2400);
        const fade2 = await page.evaluate(() => window.debugAPI.getFadeOpacity());
        await page.waitForTimeout(1800);
        const st2 = await page.evaluate(() => window.debugAPI.getStatusText());
        const state2 = await page.evaluate(() => window.debugAPI.getLightingState());
        results.rest = { fade1, st1, state1, fade2, st2, state2 };
        const ok = fade1 > 0.8 && st1.includes('6 hours pass') && state1 === 'restCycle' && fade2 < 0.2 && st2.includes('Rested') && state2 === 'cruising';
        if (ok) pass('rest');
        else fail('rest', JSON.stringify(results.rest));
      }
    }

    // --- silent running ---
    {
      const id = await aimAndHover(0.12, 18.35, 0.62, 0.75, 17.98, 'silentRunning');
      results.hover.silentRunning = id;
      if (id !== 'silentRunning') fail('silentRunning', `hover id=${id}`);
      else {
        await page.keyboard.press('KeyE');
        await page.waitForTimeout(700);
        const st1 = await page.evaluate(() => window.debugAPI.getStatusText());
        const state1 = await page.evaluate(() => window.debugAPI.getLightingState());
        await page.waitForTimeout(2500);
        await page.keyboard.press('KeyE');
        await page.waitForTimeout(700);
        const st2 = await page.evaluate(() => window.debugAPI.getStatusText());
        const state2 = await page.evaluate(() => window.debugAPI.getLightingState());
        results.silentRunning = { st1, state1, st2, state2 };
        const ok = st1.includes('Silent running engaged') && state1 === 'silentRunning' && st2.includes('Silent running disengaged') && state2 === 'cruising';
        if (ok) pass('silentRunning');
        else fail('silentRunning', JSON.stringify(results.silentRunning));
      }
    }

    // debug-API interaction invocations (secondary path)
    const dbgOk = await page.evaluate(() => {
      const a = window.debugAPI.triggerInteraction('sonar');
      const b = window.debugAPI.triggerInteraction('silentRunning');
      const c = window.debugAPI.triggerInteraction('silentRunning');
      const d = window.debugAPI.triggerInteraction('rest');
      return a && b && c && d;
    });
    results.debugTriggers = dbgOk;
    if (!dbgOk) fail('debugTriggers', 'triggerInteraction returned false');
    await page.waitForTimeout(6000); // let rest sequence finish
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
