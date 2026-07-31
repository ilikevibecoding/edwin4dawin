#!/usr/bin/env node
/**
 * HUD visual QA.
 *
 * The shared harness in tools/ photographs the renderer: it loads the game with
 * no UI flags, so the killfeed is empty, nothing is marked and health is full —
 * which is exactly the frame a HUD cannot be judged from. This drives the UI
 * instead. `?uidemo=1` fills every widget with plausible data, and the menu
 * scenes are opened through the system's own public API rather than by faking
 * clicks, so what is photographed is what the game does.
 *
 * A capture costs about a minute here: the software rasteriser has to produce a
 * fresh frame and Chrome will not composite a stale one. Two consequences shape
 * this script. Corner crops are cropped out of the full frame afterwards rather
 * than captured separately — at deviceScaleFactor 1 a clipped capture is the
 * same pixels for another minute of nothing. And every scene waits for real
 * rendered frames rather than for wall-clock time, because a capture starves
 * requestAnimationFrame and a scene set up straight afterwards can otherwise be
 * photographed before the renderer has drawn it once.
 *
 * Usage:
 *   node src/ui/dev/shot.mjs --out shots/ui --dist dist-ui --port 4197
 *   node src/ui/dev/shot.mjs --only hud,pause --width 2560 --height 1440
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
    return process.argv[i + 1];
  }
  return fallback;
}

const OUT = path.resolve(ROOT, arg('out', 'shots/ui'));
const DIST = arg('dist', 'dist-ui');
const PORT = parseInt(arg('port', '4197'), 10);
const WIDTH = parseInt(arg('width', '1600'), 10);
const HEIGHT = parseInt(arg('height', '900'), 10);
const SETTLE = parseInt(arg('settle', '18000'), 10);
/** Raise to 2 to inspect stroke weights and hinting the way a retina user sees them. */
const DPR = parseFloat(arg('dpr', '1'));
const QUALITY = arg('quality', 'low');
const ONLY = arg('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Each scene names a UI state. `query` picks the page flags, `setup` runs in the
 * page once the engine is ready, and `wait` gives animations time to land.
 */
const SCENES = [
  {
    name: '01_hud',
    query: 'uidemo=1',
    desc: 'Every HUD element populated at once',
    setup: null,
    wait: 900,
  },
  {
    // The demo holds health at a nick so the rest of the HUD can be judged
    // without a blood vignette over it, which means the low-health treatment is
    // the one piece of surface no other scene photographs.
    name: '01b_hud_wounded',
    query: 'uidemo=1',
    desc: 'Critical health, mid-reload: blood vignette, heartbeat, reload arc',
    // The reload ring is doubled up here rather than given a scene of its own: a
    // capture costs a minute, and a two-second arc and a low-health vignette do
    // not interact, so photographing both at once loses nothing.
    setup: () => {
      const demo = window.GAME.get('ui').demoDriver;
      demo.setHealth(0.13);
      demo.setReload(0.42);
    },
    teardown: () => {
      const demo = window.GAME.get('ui').demoDriver;
      demo.setHealth(0.58);
      demo.setReload(-1);
    },
    wait: 1200,
  },
  {
    name: '02_hud_scoped',
    query: 'uidemo=1',
    desc: 'Sniper scope overlay over the demo HUD',
    // The real weapon is equipped and the real aim button held rather than the
    // overlay being forced on: the surround has to line up with the optic the
    // weapons module draws in 3D, and only the genuine article proves it does.
    setup: () => {
      window.GAME.get('weapons').equip('sniper_bolt');
      document
        .getElementById('game-canvas')
        .dispatchEvent(new MouseEvent('mousedown', { button: 2, bubbles: true }));
    },
    // The ADS ramp is driven by frame time, and the software rasteriser runs
    // slowly enough after a weapon change that a fixed wait photographs a
    // half-open aperture — which looks exactly like a bug and is not one.
    // Not 1: the ramp is a spring that asymptotes, and holding out for the last
    // half a percent burns the whole three-minute timeout on a frame that has
    // been fully scoped for a minute and a half.
    ready: () => window.GAME.get('weapons').adsAmount > 0.98,
    teardown: () => {
      window.dispatchEvent(new MouseEvent('mouseup', { button: 2, bubbles: true }));
      window.GAME.get('weapons').equip('ar_mk4');
    },
    wait: 900,
  },
  {
    name: '02b_hud_acog',
    query: 'uidemo=1',
    desc: 'ACOG treatment, for comparison with the sniper tube',
    setup: () => {
      window.GAME.get('weapons').equip('sniper_dmr');
      document
        .getElementById('game-canvas')
        .dispatchEvent(new MouseEvent('mousedown', { button: 2, bubbles: true }));
    },
    ready: () => window.GAME.get('weapons').adsAmount > 0.98,
    teardown: () => {
      window.dispatchEvent(new MouseEvent('mouseup', { button: 2, bubbles: true }));
      window.GAME.get('weapons').equip('ar_mk4');
    },
    wait: 900,
  },
  {
    name: '02d_hud_thermal',
    query: 'uidemo=1',
    desc: 'Thermal treatment, which only the killstreak gunner drives',
    setup: () => window.GAME.get('ui').demoDriver.setScope('thermal'),
    teardown: () => window.GAME.get('ui').demoDriver.setScope('none'),
    wait: 1400,
  },
  {
    name: '02c_killstreak_select',
    query: 'uidemo=1',
    desc: 'Killstreak picker, opened through the contract method',
    setup: () => window.GAME.get('ui').setKillstreakSelectionOpen(true),
    teardown: () => window.GAME.get('ui').setKillstreakSelectionOpen(false),
    wait: 700,
  },
  {
    name: '03_scoreboard',
    query: 'uidemo=1',
    desc: 'Scoreboard held open',
    setup: () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }));
    },
    teardown: () => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Backquote' })),
    wait: 700,
  },
  {
    name: '04_pause',
    query: 'uidemo=1',
    desc: 'Pause menu',
    setup: () => window.GAME.get('ui').openMenu('pause'),
    teardown: () => window.GAME.get('ui').openMenu('none'),
    wait: 700,
  },
  {
    name: '05_settings',
    query: 'uidemo=1',
    desc: 'Settings, graphics tab',
    setup: () => window.GAME.get('ui').openMenu('settings'),
    teardown: () => window.GAME.get('ui').openMenu('none'),
    wait: 700,
  },
  {
    name: '06_controls',
    query: 'uidemo=1',
    desc: 'Settings, key rebinding',
    setup: () => {
      const ui = window.GAME.get('ui');
      ui.openMenu('settings');
      document.querySelectorAll('.ob-tab').forEach((node) => {
        if (node.textContent === 'Controls') node.click();
      });
    },
    teardown: () => window.GAME.get('ui').openMenu('none'),
    wait: 700,
  },
  {
    name: '07_loadout',
    query: 'uidemo=1',
    desc: 'Loadout briefing',
    setup: () => window.GAME.get('ui').openMenu('loadout'),
    teardown: () => window.GAME.get('ui').openMenu('none'),
    wait: 700,
  },
  {
    name: '08_death',
    query: 'uidemo=1',
    desc: 'Death screen with respawn countdown',
    setup: () => {
      const ui = window.GAME.get('ui');
      window.GAME.events.emit('player:death', { killer: null, cause: 'bullet' });
      ui.pushKillfeed('SHIELD · 08', 'PLAYER', 'lmg_pkp', true, true);
    },
    teardown: () => window.GAME.events.emit('player:spawn', { position: { x: 0, y: 0, z: 0 } }),
    wait: 1400,
  },
  {
    name: '09_main_menu',
    query: '',
    desc: 'Deploy screen',
    setup: null,
    wait: 900,
  },
  {
    // Costed separately from the demo: the demo rebuilds the killfeed every five
    // seconds and re-slams an announcement every six, which is not what a real
    // frame does.
    name: '10_live',
    query: 'capture=1',
    desc: 'HUD driven by the running game, no demo data',
    setup: null,
    wait: 6000,
    perf: 'live',
  },
  {
    // The one path the demo cannot honestly stand in for: a real drone painting
    // real hostiles, published on the killstreak module's own pooled event. The
    // sweep beam takes 2.6 s a revolution, so the wait is several of those.
    name: '11_live_uav',
    query: 'capture=1',
    desc: 'Real UAV on station: swept contacts and objective markers',
    // A streak is earned on the kill whose running total *equals* the cost, so
    // three kills only buy the drone from a standing start. The previous scene
    // is a live firefight, so the counter is reset first and then wound up until
    // the drone is actually in hand.
    setup: () => {
      const ks = window.GAME.get('killstreaks');
      ks.resetStreak();
      for (let i = 0; i < 12 && !ks.available.includes('uav'); i++) ks.addKill();
      ks.activate('uav');
      window.__UAV_T0__ = performance.now();
    },
    // Waits for the drone to actually paint something, but gives up after 25 s
    // and photographs whatever is up. The sweep only reports a contact on the
    // frames it has one, and on a map down to four live hostiles it can be a
    // while between them — long enough that a strict predicate spends the whole
    // three-minute timeout and then shoots a drone that has gone off station.
    ready: () => {
      const seen = (window.GAME.tryGet('ui')?.uav?.count ?? 0) > 0;
      return seen || performance.now() - (window.__UAV_T0__ ?? 0) > 25000;
    },
    teardown: () => window.GAME.get('killstreaks').resetStreak(),
    wait: 9000,
    frames: 90,
  },
];

/**
 * Top the player back up before each scene.
 *
 * The bots are live and shooting throughout, and a capture takes the best part
 * of a minute — long enough that a scene can be photographed with the death
 * screen over it. Health is writable on the entity, and a respawn is emitted if
 * they actually went down, which is what puts the death screen away.
 */
async function revive(page) {
  await page
    .evaluate(() => {
      const entity = window.GAME?.tryGet?.('player')?.entity;
      if (!entity) return;
      if (!entity.isAlive) {
        window.GAME.events.emit('player:spawn', { position: { x: 0, y: 0, z: 0 } });
      }
      entity.health = entity.maxHealth;
    })
    .catch(() => {});
}

/** Block until the engine has drawn `count` more frames, or give up. */
async function settleFrames(page, count) {
  const start = await page
    .evaluate(() => window.GAME?.context?.time?.frame ?? -1)
    .catch(() => -1);
  if (start < 0) return false;
  return page
    .waitForFunction(
      ([from, n]) => (window.GAME?.context?.time?.frame ?? 0) >= from + n,
      [start, count],
      { timeout: 180000, polling: 250 },
    )
    .then(() => true)
    .catch(() => false);
}

function samplePerf(page) {
  return page
    .evaluate(() => {
      const cost = window.GAME?.tryGet?.('ui')?.frameCost ?? null;
      return {
        fps: Math.round(window.GAME?.time?.fps ?? 0),
        // A paused engine skips lateUpdate, so a zero here means "not measured"
        // rather than "free".
        paused: window.GAME?.isPaused ?? null,
        uiMeanMs: cost ? Number(cost.mean.toFixed(4)) : null,
        uiP95Ms: cost ? Number(cost.p95.toFixed(4)) : null,
        uiPeakMs: cost ? Number(cost.peak.toFixed(4)) : null,
        uiFrames: cost ? cost.samples : null,
      };
    })
    .catch(() => null);
}

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

async function main() {
  if (!existsSync(path.join(ROOT, DIST, 'index.html'))) {
    console.error(`${DIST}/ not found — run \`npx vite build --outDir ${DIST}\` first.`);
    process.exit(2);
  }
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // A preview server left behind by an interrupted run would keep serving an
  // older bundle from the same directory, which is the worst possible failure
  // mode for a visual check: the screenshots look plausible and are stale.
  for (const cmd of [`fuser -k ${PORT}/tcp`, `pkill -f "vite preview.*${PORT}"`]) {
    try {
      execSync(`${cmd} 2>/dev/null || true`, { stdio: 'ignore' });
    } catch {
      /* tool missing; the next one may work, and strictPort surfaces a conflict */
    }
  }
  await new Promise((r) => setTimeout(r, 600));

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
    deviceScaleFactor: DPR,
  });

  const logs = [];
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') logs.push(`[${t}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`));

  const scenes = ONLY.length ? SCENES.filter((s) => ONLY.some((o) => s.name.includes(o))) : SCENES;
  const manifest = [];
  let loadedQuery = null;
  // Keyed by workload. The demo figure is sampled after the first scene rather
  // than at the end, because the last scenes are menus where the HUD is idle.
  const perf = { demo: null, live: null };

  for (const scene of scenes) {
    if (scene.query !== loadedQuery) {
      loadedQuery = scene.query;
      const url = `${baseUrl}?quality=${QUALITY}${scene.query ? `&${scene.query}` : ''}`;
      console.log(`Loading ${url}`);
      await page.goto(url, { waitUntil: 'load', timeout: 120000 });
      try {
        await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
      } catch {
        logs.push('[harness] GAME_READY never became true');
        const bootErr = await page.locator('#boot-error').textContent().catch(() => null);
        if (bootErr) logs.push(`[boot-error] ${bootErr}`);
        await page.screenshot({ path: path.join(OUT, '00_boot_failure.png') });
        break;
      }
      // The bots do not stop shooting while this runs, and a scene that takes a
      // minute to photograph is a minute they get to work with. Topping the
      // player up on a timer keeps them on their feet; `revive` below cleans up
      // the case where a burst got through between ticks.
      await page.evaluate(() => {
        if (window.__HEAL__) return;
        window.__HEAL__ = setInterval(() => {
          const entity = window.GAME?.tryGet?.('player')?.entity;
          if (!entity) return;
          // Topping health up does nothing once they are already down, and a
          // capture takes long enough that a burst can land between two ticks,
          // so the dead case has to be handled here and not only at scene start
          // — otherwise the scene is photographed through a death screen.
          if (!entity.isAlive) {
            window.GAME.events.emit('player:spawn', { position: { x: 0, y: 0, z: 0 } });
          }
          entity.health = entity.maxHealth;
        }, 400);
      });
      await page.waitForTimeout(SETTLE);
    }

    if (!scene.wounded) await revive(page);
    if (scene.setup) await page.evaluate(scene.setup).catch((err) => logs.push(`[setup ${scene.name}] ${err}`));
    if (scene.ready) {
      await page
        .waitForFunction(scene.ready, { timeout: 180000, polling: 500 })
        .catch(() => logs.push(`[ready ${scene.name}] never satisfied`));
    }
    await page.waitForTimeout(scene.wait ?? 600);
    if (!(await settleFrames(page, scene.frames ?? 12))) {
      logs.push(`[frames ${scene.name}] renderer did not advance`);
    }
    // The loop is deliberately left running. The renderer is created without
    // preserveDrawingBuffer, so a canvas that is not being redrawn composites as
    // black — halting the engine to make the capture cheap photographs the HUD
    // over an empty frame, which is the one thing this script exists to avoid.
    const file = path.join(OUT, `${scene.name}.png`);
    // Generous: a second scene pass for a magnified optic drops the software
    // rasteriser to a frame every few seconds, and the capture waits for one.
    await page.screenshot({ path: file, timeout: 600000 });
    // Perf last, and only after a few hundred more frames: a capture starves
    // requestAnimationFrame, so sampling straight after one quotes a mean drawn
    // from whatever handful of frames the engine managed in between. See
    // perf.mjs for the measurement this is a spot check on.
    const bucket = scene.perf ?? (perf.demo === null ? 'demo' : null);
    if (bucket) {
      await settleFrames(page, 240);
      perf[bucket] = await samplePerf(page);
    }
    if (scene.teardown) {
      await page.evaluate(scene.teardown).catch((err) => logs.push(`[teardown ${scene.name}] ${err}`));
      await page.waitForTimeout(400);
    }
    manifest.push({ name: scene.name, desc: scene.desc, file: path.relative(ROOT, file) });
    console.log(`  captured ${scene.name}`);
  }

  await writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify({ width: WIDTH, height: HEIGHT, perf, scenes: manifest }, null, 2),
    'utf8',
  );
  await writeFile(path.join(OUT, 'console.log'), logs.join('\n') || '(clean)', 'utf8');

  console.log(`\nPerf: ${JSON.stringify(perf)}`);
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
