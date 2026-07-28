#!/usr/bin/env node
/**
 * Visual QA for the killstreak module.
 *
 * The shared harness in `tools/screenshot.mjs` grabs one frame per named state,
 * which is the wrong shape for this module: an air strike is a nine second
 * performance and the only way to know whether it works is to photograph it at
 * eight points along its own clock, from eight different places. So this script
 * drives the sequence through the debug hooks and shoots against
 * `__KS_STATE__().airstrike.clock` rather than against wall time, which matters
 * because headless rendering runs at one or two frames a second and every
 * wall-clock assumption is wrong by a factor of forty.
 *
 * Three things make the timing work at that frame rate:
 *   - game time is scaled up, so a 12 s sequence costs 5 s of wall clock;
 *   - the engine is paused for the exposure, because a screenshot costs several
 *     frames and the sequence would otherwise move under it;
 *   - adaptive resolution is switched off, because at 1 fps it winds the render
 *     scale down to 0.47 and every photograph comes back soft.
 *
 * Usage:
 *   npx vite build --outDir dist-ks
 *   node src/killstreaks/dev/Capture.mjs --dist dist-ks --out shots/ks
 *   node src/killstreaks/dev/Capture.mjs --only models --hud 0
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
    return process.argv[i + 1];
  }
  return fallback;
}

const OUT = path.resolve(ROOT, arg('out', 'shots/ks'));
const DIST = arg('dist', 'dist-ks');
const PORT = parseInt(arg('port', '4196'), 10);
const WIDTH = parseInt(arg('width', '1280'), 10);
const HEIGHT = parseInt(arg('height', '720'), 10);
const SETTLE = parseInt(arg('settle', '8000'), 10);
const QUALITY = arg('quality', 'medium');
const TIME_SCALE = parseFloat(arg('timescale', '2.5'));
const HUD = arg('hud', '1') !== '0';
const ACTS = arg('only', 'models,tablet,carpet,cluster,support')
  // `support` is the three sequences that are not strikes; each is also nameable
  // on its own, because re-shooting the door gun should not cost a UAV orbit.
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Points along the air strike clock worth a photograph, with the camera each one
 * wants and the time scale to get there on. The times track the real schedule:
 * releases run 1.95-3.99 s, impacts 4.75-6.19 s, recycle at 8.59 s.
 *
 * `scale` matters more than it looks. A frame costs one to six seconds of wall
 * clock here, and the engine clamps a frame to 100 ms of game time, so the
 * sequence is stepped at 100 ms x scale. Through the impact window the
 * detonations are 180 ms apart, and anything above 1.0 collapses two or three of
 * them into a single step — which photographs as one blob and is exactly the
 * failure the walked line exists to avoid. Everywhere else the coarse step costs
 * nothing a still can see.
 */
const CARPET_MARKS = [
  { name: '02_approach', at: 1.0, cam: 'tele', scale: 3, desc: 'formation inbound, long lens from the stand' },
  { name: '03_run_in', at: 1.85, cam: 'chase', scale: 2, desc: 'lead ship on the beam, stores on the pylons' },
  { name: '04_release', at: 2.5, cam: 'chase', scale: 1.5, desc: 'bombs coming off the rack' },
  { name: '05_bombs_away', at: 3.5, cam: 'stand', scale: 2.5, desc: 'the stick in the air over the target' },
  { name: '06_short_final', at: 4.45, cam: 'high', scale: 1.5, desc: 'lead bomb a second from the ground' },
  { name: '07_first_impact', at: 4.85, cam: 'high', scale: 1, desc: 'first detonation, 48 m short of centre' },
  { name: '08_walk', at: 5.5, cam: 'high', scale: 1, desc: 'the carpet walking up the axis' },
  { name: '09_last_impact', at: 6.3, cam: 'high', scale: 1, desc: 'ninth detonation at the far end' },
  // Smoke and fire sources meter their particles out per *frame*, capped at four
  // puffs each. At one frame every six seconds a cloud that should be pouring out
  // 40 puffs a second manages four, so the aftermath photographs as though nothing
  // burned. Running the last stretch below real time restores the per-frame
  // cadence the effect was written for, at the cost of wall clock.
  { name: '10_aftermath', at: 8.0, cam: 'high', scale: 0.8, desc: 'fire, smoke column and dust over 96 m' },
  { name: '11_player_view', at: 10.5, cam: 'off', scale: 2, desc: "aftermath from the player's own eyes" },
];

/**
 * The cluster clock, measured: release 1.90, burst 5.22, impacts 8.22 to 10.62.
 * Marks sit a frame early on purpose — a step is 100 ms x scale and the poll only
 * sees the clock after it has already passed, so a mark placed on the event is
 * photographed after it.
 */
const CLUSTER_MARKS = [
  { name: '20_canister', at: 2.4, cam: 'chase', scale: 2.5, desc: 'canister away from 205 m' },
  { name: '21_airburst', at: 5.1, cam: 'tele', scale: 1, desc: 'fuze fires at 105 m' },
  { name: '22_rain', at: 6.5, cam: 'tele', scale: 1.5, desc: 'bomblets under drogue' },
  { name: '23_saturation', at: 8.5, cam: 'high', scale: 1, desc: 'pattern opening across 35 m' },
  { name: '24_pattern', at: 9.5, cam: 'high', scale: 1, desc: 'mid-pattern, submunitions walking out' },
  { name: '25_cluster_after', at: 12.0, cam: 'high', scale: 0.8, desc: 'aftermath over the pattern' },
];

/** Models parked 240 m up in clear sky to judge the silhouettes. */
const MODELS = [
  ['30_model_jet', 'jet', 30, 'strike jet, 15.2 m on a 10.4 m span'],
  ['31_model_jet_far', 'jet', 90, 'the same airframe at 90 m — the read at range'],
  ['32_model_bomb', 'bomb', 9, 'bomb body and tail unit'],
  ['33_model_drone', 'drone', 20, 'recon drone, twin boom'],
  ['34_model_gunship', 'gunship', 34, 'gunship with the door gun'],
  ['35_model_transport', 'transport', 62, 'transport, 26 m span'],
  ['36_model_canister', 'canister', 10, 'cluster dispenser'],
  ['37_model_crate', 'crate', 12, 'care package under canopy'],
];

const logs = [];

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

/** Blocks until the engine has drawn `count` more frames. */
async function waitFrames(page, count, timeoutMs = 120000) {
  const start = await page.evaluate(() => window.GAME?.context?.time?.frame ?? 0);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const now = await page.evaluate(() => window.GAME?.context?.time?.frame ?? 0);
    if (now - start >= count) return true;
    await page.waitForTimeout(150);
  }
  logs.push('[harness] timed out waiting for a frame');
  return false;
}

/**
 * Freezes the sequence with a zero time scale and exposes.
 *
 * Neither of the two obvious ways to hold a frame still works here. `setPaused`
 * is a *game* pause, and the UI module quite correctly answers it by putting a
 * MISSION PAUSED menu over the whole screen — a photograph of a menu. Stopping
 * the frame loop outright stops the canvas producing frames, and with no
 * preserved drawing buffer the compositor has nothing to hand over, so the
 * screenshot waits until it times out. A zero time scale leaves the render loop
 * running and every system stepping with dt = 0: the world does not move, the
 * canvas keeps presenting, and nobody has been told anything.
 */
async function shoot(page, manifest, name, desc, freeze = true, stamp = null) {
  const file = path.join(OUT, `${name}.png`);
  let restore = 1;
  if (freeze) {
    restore = await page.evaluate(() => {
      const time = window.GAME?.context?.time;
      if (!time) return 1;
      const previous = time.timeScale;
      time.timeScale = 0;
      return previous;
    });
    await waitFrames(page, 1, 60000);
  }
  if (stamp) desc = `${desc} (${await stamp()})`;
  try {
    // Five minutes is not paranoia. A wide frame at ground level with nine bombs,
    // twelve ribbon trails and a full sky behind them has been measured at over a
    // hundred seconds in this rasteriser, and the exposure has to outlast it.
    await page.screenshot({ path: file, timeout: 300000 });
    manifest.push({ name, desc, file: path.relative(ROOT, file) });
    console.log(`  captured ${name} — ${desc}`);
  } catch (err) {
    // One slow frame should not cost the other nine marks in the sequence.
    logs.push(`[harness] screenshot "${name}" failed: ${err.message.split('\n')[0]}`);
    console.log(`  MISSED ${name}`);
  }
  if (freeze) {
    await page.evaluate((s) => {
      const time = window.GAME?.context?.time;
      if (time) time.timeScale = s;
    }, restore);
  }
}

async function setTimeScale(page, scale) {
  await page.evaluate((s) => {
    const time = window.GAME?.context?.time;
    if (time) time.timeScale = s;
  }, scale);
}

async function setCamera(page, preset, overrides) {
  return page.evaluate(
    ([p, o]) => window.__KS_CAM__?.(p, o ?? undefined) ?? null,
    [preset, overrides ?? null],
  );
}

/** Spins until the named sequence clock passes `at`, then shoots. */
async function shootAtClock(page, manifest, sequence, marks) {
  let index = 0;
  let armed = -1;
  const deadline = Date.now() + 1500000;
  while (index < marks.length && Date.now() < deadline) {
    const mark = marks[index];
    // Move the camera as soon as the mark is next, not when it lands: the
    // director needs a frame to resolve its subject, and pausing on the same
    // frame the camera moved would photograph the previous framing.
    if (armed !== index) {
      await setCamera(page, mark.cam);
      await setTimeScale(page, mark.scale ?? TIME_SCALE);
      // One frame for the director to resolve its subject and write the camera.
      // Without it a mark that is already due is photographed on the previous
      // framing, which is how a chase shot comes back as a picture of a car park.
      await waitFrames(page, 1);
      armed = index;
    }
    const state = await page.evaluate((key) => {
      const s = window.__KS_STATE__?.();
      const seq = s?.[key] ?? {};
      return { clock: seq.clock ?? 0, locked: s?.camera?.locked ?? null };
    }, sequence);
    if (state.clock >= mark.at) {
      const on = state.locked ? ` [${state.locked}]` : '';
      // The clock read for the *description* has to come from after the freeze:
      // one round trip to the page is one or two frames here, and a frame is up
      // to 300 ms of game time, which is long enough to cross a detonation.
      await shoot(page, manifest, mark.name, `${mark.desc}${on}`, true, async () => {
        const t = await page.evaluate((key) => window.__KS_STATE__?.()?.[key]?.clock ?? 0, sequence);
        return `t=${t.toFixed(2)}s`;
      });
      index++;
      continue;
    }
    await page.waitForTimeout(70);
  }
  await setCamera(page, 'off');
  if (index < marks.length) logs.push(`[harness] ${sequence} timed out at mark ${marks[index].name}`);
}

/**
 * Polls the diagnostics until `expr` holds. Wall-clock waits are useless here —
 * a frame is one to six seconds, so `waitForTimeout(9000)` can pass with the
 * sequence 0.4 s further on than it started — so everything that has to happen
 * before a shot is expressed as a condition on the sequence's own state.
 */
async function waitForState(page, predicate, label, timeoutMs = 900000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await page.evaluate(predicate)) return true;
    await page.waitForTimeout(120);
  }
  logs.push(`[harness] timed out waiting for ${label}`);
  console.log(`  TIMEOUT ${label}`);
  return false;
}

async function setHud(page, visible) {
  await page.evaluate((show) => {
    const id = 'ks-hud-hide';
    document.getElementById(id)?.remove();
    if (show) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = '#ui-root { display: none !important; }';
    document.head.appendChild(style);
  }, visible);
}

async function main() {
  if (!existsSync(path.join(ROOT, DIST, 'index.html'))) {
    console.error(`${DIST}/ not found — run \`npx vite build --outDir ${DIST}\` first.`);
    process.exit(2);
  }
  await mkdir(OUT, { recursive: true });

  try {
    execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 400));
  } catch {
    /* fuser unavailable */
  }

  const server = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1', '--outDir', DIST],
    { cwd: ROOT, stdio: 'pipe', detached: true },
  );
  server.stdout.on('data', () => {});
  server.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));
  const killServer = () => {
    try {
      process.kill(-server.pid, 'SIGKILL');
    } catch {
      server.kill('SIGKILL');
    }
  };
  process.on('exit', killServer);

  const baseUrl = `http://127.0.0.1:${PORT}/`;
  if (!(await waitForServer(baseUrl))) {
    killServer();
    throw new Error('preview server did not come up');
  }

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-frame-rate-limit',
      '--js-flags=--max-old-space-size=4096',
      `--window-size=${WIDTH},${HEIGHT}`,
    ],
  });

  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') logs.push(`[${t}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`));

  const url = `${baseUrl}?quality=${QUALITY}&capture=1&killstreaktest=1`;
  console.log(`Loading ${url}`);
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });

  try {
    await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
  } catch {
    logs.push('[harness] GAME_READY never became true');
    const bootErr = await page.locator('#boot-error').textContent().catch(() => null);
    if (bootErr) logs.push(`[boot-error] ${bootErr}`);
    await page.screenshot({ path: path.join(OUT, '00_boot_failure.png') });
    await writeFile(path.join(OUT, 'console.log'), logs.join('\n'), 'utf8');
    await browser.close();
    killServer();
    process.exit(1);
  }
  // At one frame a second the adaptive scaler bottoms out and every shot comes
  // back at 47% resolution.
  await page.evaluate(() => window.GAME?.setAdaptiveResolution(false));
  console.log('Engine ready — settling...');
  await page.waitForTimeout(SETTLE);
  await setHud(page, HUD);

  const hooks = await page.evaluate(() => typeof window.__STRIKE__ === 'function');
  if (!hooks) logs.push('[harness] __STRIKE__ hook missing — is killstreaktest=1 set?');

  const manifest = [];

  if (ACTS.includes('models')) {
    console.log('Act: model silhouettes');
    await setHud(page, false);
    // The inspection camera stands where the player stands, so the player has to
    // be somewhere with sky in front of them first.
    await page.evaluate(() => window.__KS_VIEW__?.({ standoff: 70 }));
    await page.waitForTimeout(2500);
    for (const [name, model, distance, desc] of MODELS) {
      const ok = await page.evaluate(
        ([m, d]) => window.__KS_MODEL__?.(m, d),
        [model, distance],
      );
      if (!ok) logs.push(`[harness] model "${model}" not available`);
      await page.waitForTimeout(2200);
      await shoot(page, manifest, name, desc);
    }
    await page.evaluate(() => window.__KS_MODEL__?.(null));
    await setHud(page, HUD);
  }

  if (ACTS.includes('tablet')) {
    console.log('Act: targeting tablet');
    await page.evaluate(() => {
      window.__KS_VIEW__?.();
      window.__KS_GIVE__?.('airstrike');
      window.__KS__?.activate('airstrike');
    });
    await page.waitForTimeout(2500);
    await shoot(page, manifest, '00_tablet', 'targeting tablet, reticle on the player');
    // Drag the reticle and rotate the run-in with the wheel through real device
    // events, so the input path is exercised rather than the state being poked.
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(WIDTH * 0.5 + i * 26, HEIGHT * 0.5 - i * 16);
      await page.waitForTimeout(60);
    }
    for (let i = 0; i < 3; i++) await page.mouse.wheel(0, 120);
    await page.waitForTimeout(2500);
    await shoot(page, manifest, '01_tablet_aimed', 'reticle moved, run-in rotated three notches');
    await page.evaluate(() => window.__KS__?.cancelTargeting());
    await page.waitForTimeout(1200);
  }

  if (ACTS.includes('carpet')) {
    console.log('Act: carpet strike');
    const info = await page.evaluate(() => window.__STRIKE__('carpet'));
    console.log(`  ${JSON.stringify(info)}`);
    await setTimeScale(page, TIME_SCALE);
    await shootAtClock(page, manifest, 'airstrike', CARPET_MARKS);
    await setTimeScale(page, 1);
  }

  if (ACTS.includes('cluster')) {
    console.log('Act: cluster strike');
    await page.evaluate(() => window.__STRIKE__('cluster', { standoff: 108 }));
    await setTimeScale(page, TIME_SCALE);
    await shootAtClock(page, manifest, 'cluster', CLUSTER_MARKS);
    await setTimeScale(page, 1);
  }

  const support = ACTS.includes('support');
  if (support || ACTS.includes('uav')) {
    console.log('Act: UAV');
    await setTimeScale(page, 4);
    await page.evaluate(() => {
      window.__KS_VIEW__?.({ standoff: 40 });
      window.__KS_GIVE__?.('uav');
      window.__KS__?.activate('uav');
    });
    await waitForState(
      page,
      () => {
        const s = window.__KS_STATE__?.();
        return !!s && s.uav.altitude > 0 && s.uav.contacts > 0;
      },
      'uav on station',
    );
    await setCamera(page, 'tele');
    await waitFrames(page, 1);
    await shoot(page, manifest, '40_uav', 'drone on station, contacts published', true, async () =>
      page.evaluate(() => `${window.__KS_STATE__?.()?.uav?.contacts ?? 0} contacts`),
    );
    await setCamera(page, 'off');
    await setTimeScale(page, 1);
  }

  if (support || ACTS.includes('package')) {
    console.log('Act: care package');
    await setTimeScale(page, 4);
    await page.evaluate(() => {
      window.__KS_VIEW__?.({ standoff: 40 });
      window.__KS_GIVE__?.('care_package');
      window.__KS__?.activate('care_package');
    });
    await waitForState(
      page,
      () => window.__KS_STATE__?.()?.carePackage?.phase === 'falling',
      'crate released',
    );
    await setCamera(page, 'tele');
    await waitFrames(page, 1);
    await shoot(page, manifest, '41_package_falling', 'transport overhead, crate under canopy');
    await setCamera(page, 'off');
    await waitForState(
      page,
      () => window.__KS_STATE__?.()?.carePackage?.onGround === true,
      'crate down',
    );
    // Grounded, the crate is a scene child in its own right — the pack rig is
    // taken apart so the rigid body writes into an object with an identity parent.
    await setCamera(page, 'chase', {
      subject: 'ks:crate',
      offset: [-5, 3.2, -7],
      aimLift: 0.7,
      local: false,
      fov: 48,
    });
    await waitFrames(page, 1);
    await shoot(page, manifest, '42_package_down', 'crate on the deck with its smoke marker');
    await setCamera(page, 'off');
    await setTimeScale(page, 1);
  }

  if (support || ACTS.includes('gunner')) {
    console.log('Act: chopper gunner');
    await setTimeScale(page, 4);
    await page.evaluate(() => {
      window.__KS_VIEW__?.({ standoff: 40 });
      window.__KS_GIVE__?.('chopper_gunner');
      window.__KS__?.activate('chopper_gunner');
    });
    await waitForState(
      page,
      () => {
        const c = window.__KS_STATE__?.()?.chopper;
        return !!c && c.phase === 'inbound' && c.clock > 2;
      },
      'gunship inbound',
    );
    await setCamera(page, 'chase', {
      subject: 'ks:gunship',
      offset: [-22, -5, -16],
      aimLift: 1,
      local: true,
      fov: 40,
    });
    await waitFrames(page, 1);
    await shoot(page, manifest, '43_chopper_inbound', 'gunship inbound on the orbit');
    await setCamera(page, 'off');
    // The takeover owns the camera from here; the director must stay out of it.
    await waitForState(
      page,
      () => window.__KS_STATE__?.()?.chopper?.phase === 'gunner',
      'handover to the door gun',
    );
    await setTimeScale(page, 1.5);
    await waitFrames(page, 2);
    await shoot(page, manifest, '44_gunner', 'door gun view, thermal overlay');
    // Hold the trigger: the barrels have to spin up before the first round.
    await page.mouse.move(WIDTH * 0.5, HEIGHT * 0.5);
    await page.mouse.down();
    await waitForState(
      page,
      () => (window.__KS_STATE__?.()?.chopper?.rounds ?? 0) > 12,
      'minigun up to rate',
    );
    await shoot(page, manifest, '45_gunner_firing', 'minigun on target', true, async () =>
      page.evaluate(() => {
        const c = window.__KS_STATE__?.()?.chopper;
        return `${c?.rounds ?? 0} rounds, ${c?.hits ?? 0} hits`;
      }),
    );
    await page.mouse.up();
    await setTimeScale(page, 1);
  }

  const state = await page.evaluate(() => {
    const g = window.GAME;
    return {
      killstreaks: window.__KS_STATE__?.() ?? null,
      fps: Math.round(g?.context?.time?.fps ?? 0),
      drawCalls: g?.renderer?.info?.render?.calls ?? 0,
      triangles: g?.renderer?.info?.render?.triangles ?? 0,
    };
  });

  await writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify({ width: WIDTH, height: HEIGHT, quality: QUALITY, state, shots: manifest }, null, 2),
    'utf8',
  );
  await writeFile(path.join(OUT, 'console.log'), logs.join('\n') || '(clean)', 'utf8');

  console.log(`\nState: ${JSON.stringify(state, null, 2)}`);
  console.log(`Console issues: ${logs.length}`);
  console.log(`Output: ${OUT}`);

  await browser.close();
  killServer();
  if (logs.filter((l) => l.startsWith('[pageerror]')).length) process.exit(3);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
