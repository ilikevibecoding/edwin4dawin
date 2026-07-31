#!/usr/bin/env node
/**
 * Phase capture: one effect, photographed at exact points through its lifetime.
 *
 * The other harnesses wait in wall-clock milliseconds, which is useless for
 * judging an explosion. Under the software rasteriser these captures run on, a
 * frame is roughly a second of wall clock but only 100 ms of simulation, because
 * the engine clamps its frame delta — so "wait 350 ms then shoot" photographs an
 * effect somewhere in its first few tens of milliseconds, and "wait six frames
 * after ignition" lands 600 ms in, well past a grenade's fireball. This freezes
 * the engine clock and steps it itself through `window.__FXPHASE__`, so a sample
 * at 8 ms and a sample at 20 s are both exact and both cost one frame.
 *
 * Usage:
 *   node src/fx/dev/fxphase.mjs --dist dist-fx --out shots/phase --quality high
 *   node src/fx/dev/fxphase.mjs --only grenade,airstrike
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
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

const OUT = path.resolve(ROOT, arg('out', 'shots/phase'));
const WIDTH = parseInt(arg('width', '1280'), 10);
const HEIGHT = parseInt(arg('height', '720'), 10);
const SETTLE = parseInt(arg('settle', '14000'), 10);
const QUALITY = arg('quality', 'high');
const PORT = parseInt(arg('port', '4199'), 10);
const DIST = arg('dist', 'dist-fx');
const READY_MS = parseInt(arg('ready', '3600000'), 10);
const ONLY = arg('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Each sequence stages a scenario once, fires it, and walks the clock forward.
 * `at` are cumulative effect ages in seconds, so the interesting instants of a
 * detonation can be sampled a few milliseconds apart. `plate` adds one extra
 * frame of the staged camera taken before the effect is fired.
 */
const SEQUENCES = [
  // A frame is a second or more of wall clock on the software rasteriser these
  // run on, so the sample sets are deliberately short: one instant per thing
  // the sequence is supposed to be doing, and no filler in between.
  //
  // Surfaces are sampled twice — once while the puff and the sparks are still
  // up, once after the ejecta has had time to land — because "does it settle or
  // does it evaporate in mid-air" cannot be answered from a single frame.
  { name: 'metal', scenario: 'metal', at: [0.3] },
  { name: 'wood', scenario: 'wood', at: [0.25, 1.8] },
  { name: 'sand', scenario: 'sand', at: [1.8] },
  { name: 'glass', scenario: 'glass', at: [0.25, 1.8] },
  { name: 'concrete', scenario: 'concrete', at: [0.25, 1.8] },
  // 45 m of lead at 820 m/s: the heads are crossing the centre of the view.
  //
  // Every emissive sequence takes a plate, because the numbers the fire and the
  // tracers are argued over cannot be measured without one. A colour rule picked
  // to find flame finds only the pixels that are already the colour it is looking
  // for: asked "is the flame orange", a mask seeded on orange answers yes over a
  // white fireball with an orange fringe, having measured the fringe. Differencing
  // against the staged backdrop selects the effect by *where it is* instead, so
  // the white core is inside the region and drags the statistic down exactly as
  // much as it should.
  { name: 'tracerspan', scenario: 'tracerspan', at: [0.03, 0.055], plate: true },
  { name: 'tracers', scenario: 'tracers', at: [0.02], plate: true },
  // Down the sights of the player's own weapon. 4 ms is the frame the trigger
  // breaks on, where the round is still beside the barrel it left and the two can
  // be compared; by 40 ms it is thirty metres out and the origin is unreadable.
  { name: 'viewfire', scenario: 'viewfire', at: [0.004, 0.04], plate: true },
  { name: 'wallsmoke', scenario: 'wallsmoke', at: [2.0] },
  { name: 'debris', scenario: 'debris', at: [0.4, 1.5, 3.0] },
  // 0.7 is where the throw and the ground ring are at their widest; 3.0 is where
  // the scene harness actually freezes, so the pair answers "is it missing or is
  // it simply over by then" in one sequence.
  { name: 'grenade', scenario: 'grenade', at: [0.004, 0.05, 0.45, 0.7, 3.0], plate: true },
  // 0 is the frame the trigger breaks on, which is the one the player sees; the
  // ignition lead means the flash is already a few milliseconds old there.
  { name: 'flash', scenario: 'flash', at: [0.0, 0.016], plate: true },
  // Not an effect: a board of fireball sprites at known radiances and ramp
  // positions. One frame of it measures the exposure and the tonemap response
  // end to end, so fire colour can be authored from a number instead of from
  // four more capture cycles.
  { name: 'calib', scenario: 'calib', at: [0.4] },
  // Also not an effect: the same smoke sprite at six sizes, so the atlas cell's
  // border fade can be checked at every mip level the chain will ever pick.
  { name: 'mipwall', scenario: 'mipwall', at: [0.4], plate: true },
  { name: 'fire', scenario: 'fire', at: [3.0], plate: true },
  // `plate` photographs the staged camera before anything is emitted into it.
  // A cloud cannot be masked out of a frame by any rule on the frame alone —
  // it is grey over a tan wall and over blue sky at once, brighter than one and
  // darker than the other — so the backdrop has to be photographed rather than
  // estimated, and then the cloud is simply wherever the two differ.
  { name: 'smoke', scenario: 'smoke', at: [2.0, 8.0], plate: true },
  { name: 'backsmoke', scenario: 'backsmoke', at: [2.0, 8.0], plate: true },
  // One sprite, front-lit and back-lit. The cloud scenarios above cannot settle
  // whether the smoke is lit from a direction — a pixel in a cloud is coverage
  // times radiance plus backdrop, and coverage varies with the shape the cloud
  // happens to have — so these exist to be measured rather than looked at.
  { name: 'litpuff', scenario: 'litpuff', at: [0.4], plate: true },
  { name: 'backpuff', scenario: 'backpuff', at: [0.4], plate: true },
  { name: 'airstrike', scenario: 'airstrike', at: [0.06, 0.9, 4.0], plate: true },
  { name: 'rocket', scenario: 'rocket', at: [1.35] },
  { name: 'gravel', scenario: 'gravel', at: [0.3] },
  { name: 'dirt', scenario: 'dirt', at: [0.3] },
];

/**
 * Poll for ready from the driver rather than through `waitForFunction`.
 *
 * `waitForFunction` polls on the page's animation frames by default, and under
 * the software rasteriser the main thread is saturated enough that those frames
 * do not reliably arrive — a boot that finishes in under a minute can time out
 * at fifteen. Wall-clock polling is immune to that and reports the boot bar on
 * the way, so a genuine stall still looks like one.
 */
async function waitForReady(page, timeoutMs) {
  const start = Date.now();
  let last = '';
  while (Date.now() - start < timeoutMs) {
    const state = await page
      .evaluate(() => ({
        ready: window.GAME_READY === true,
        status: document.getElementById('boot-status')?.textContent ?? '',
        error: document.getElementById('boot-error')?.textContent ?? '',
      }))
      .catch(() => null);
    if (!state) return { ok: false, why: 'page went away' };
    if (state.ready) return { ok: true, seconds: Math.round((Date.now() - start) / 1000) };
    if (state.error) return { ok: false, why: `boot error: ${state.error}` };
    if (state.status !== last) {
      last = state.status;
      console.log(`  [${String(Math.round((Date.now() - start) / 1000)).padStart(4)}s] ${last}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return { ok: false, why: `not ready after ${Math.round(timeoutMs / 1000)}s` };
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

  try {
    const { execSync } = await import('node:child_process');
    execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 500));
  } catch {
    /* fuser unavailable; strictPort will surface the conflict */
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
  page.setDefaultTimeout(600000);

  // Raw CDP capture. Playwright's own screenshot waits for the page to look
  // visually stable, which under a software rasteriser sharing a busy machine
  // simply never happens — it times out and the sample is lost after the clock
  // has already been advanced past it, so the frame cannot be retaken.
  const cdp = await page.context().newCDPSession(page);
  const capture = async (file) => {
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
      optimizeForSpeed: true,
    });
    await writeFile(file, Buffer.from(data, 'base64'));
  };

  const logs = [];
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') logs.push(`[${t}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`));

  const url = `${baseUrl}?quality=${QUALITY}&capture=1&fxdemo=1`;
  console.log(`Loading ${url}`);
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });

  const ready = await waitForReady(page, READY_MS);
  if (!ready.ok) {
    logs.push(`[harness] ${ready.why}`);
    await capture(path.join(OUT, '00_boot_failure.png'));
    await writeFile(path.join(OUT, 'console.log'), logs.join('\n'), 'utf8');
    await browser.close();
    killServer();
    process.exit(1);
  }

  console.log(`Engine ready in ${ready.seconds}s — settling...`);
  await page.waitForTimeout(SETTLE);

  const hasPhase = await page.evaluate(() => typeof window.__FXPHASE__ === 'object');
  if (!hasPhase) {
    logs.push('[harness] __FXPHASE__ missing');
    await writeFile(path.join(OUT, 'console.log'), logs.join('\n'), 'utf8');
    await browser.close();
    killServer();
    process.exit(1);
  }

  const list = ONLY.length ? SEQUENCES.filter((s) => ONLY.includes(s.name)) : SEQUENCES;
  const frames = [];

  for (const seq of list) {
    console.log(`\n${seq.name} (${seq.scenario})`);
    await page.evaluate((n) => window.__FXPHASE__.begin(n), seq.scenario);
    // Two frames for the staged camera pose and the level hide to take effect
    // before anything is emitted against them.
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );
    if (seq.plate) {
      const file = `${seq.name}_plate.png`;
      console.log(`  ${file}`);
      await capture(path.join(OUT, file));
    }
    await page.evaluate(() => window.__FXPHASE__.fire());

    let clock = 0;
    for (const age of seq.at) {
      const delta = Math.max(0, age - clock);
      clock = age;
      await page.evaluate((d) => window.__FXPHASE__.advance(d), delta);
      // The engine's own loop still runs the particle upload, the depth capture
      // and the present every frame; two of them guarantees the advanced clock
      // has been drawn before the screenshot reads the surface back.
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );
      // Counted after those frames, never before. Slots are reclaimed by the
      // group's own update, so a population read straight after advancing the
      // clock is every particle the advance *spawned* — a twelve-second sample
      // reports eight hundred flames where seventy are alive.
      const report = await page.evaluate(() => window.__FXPHASE__.report());
      const render = await page.evaluate(() => {
        const info = window.GAME?.renderer?.info?.render;
        return { calls: info?.calls ?? 0, triangles: info?.triangles ?? 0 };
      });
      const ms = String(Math.round(age * 1000)).padStart(5, '0');
      const file = `${seq.name}_${ms}ms.png`;
      const live = Object.entries(report.groups)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${k}=${n}`)
        .join(' ');
      const lit = report.light
        ? `  sunvis=${report.light.visibility.toFixed(2)} sun=${report.light.sun
            .map((v) => v.toFixed(2))
            .join('/')} amb=${report.light.ambient
            .map((v) => v.toFixed(2))
            .join('/')} sunview=${(report.light.sunView ?? []).map((v) => v.toFixed(2)).join('/')}`
        : '';
      console.log(
        `  ${file}  particles=${report.fx.particles} draws=${render.calls} fxdraws=${report.fx.drawCalls}  ${live}${lit}`,
      );
      try {
        await capture(path.join(OUT, file));
        frames.push({ name: file, age, report, render });
      } catch (err) {
        logs.push(`[harness] screenshot ${file} failed: ${err}`);
        console.log(`  ${file} FAILED`);
      }
    }
    await page.evaluate(() => window.__FXPHASE__.end());
  }

  await writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify({ width: WIDTH, height: HEIGHT, quality: QUALITY, frames }, null, 2),
    'utf8',
  );
  await writeFile(path.join(OUT, 'console.log'), logs.join('\n') || '(clean)', 'utf8');

  console.log(`\nConsole issues: ${logs.length}`);
  console.log(`Output: ${OUT}`);

  await browser.close();
  killServer();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
