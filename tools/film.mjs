// Offline demo-reel renderer.
//
// Headless rendering here runs on a software rasteriser, so a live screen capture
// would be a slideshow. Instead this steps the simulation at a fixed timestep,
// renders and captures every frame, then encodes the sequence at real speed.
// Every frame is genuine gameplay - it is just captured slowly.
//
// Because the simulation and the demonstration autopilot are both deterministic
// for a given seed, `--phase intercept` can run the scenario once with no
// rendering to find when the intercept happens, then replay it and start
// capturing a few seconds before that moment.
//
//   node tools/film.mjs out.mp4 [--w 1280] [--h 720] [--fps 30] [--seconds 8]
//        [--scenario saturation] [--condition day] [--battery thaad]
//        [--seed 7777] [--phase launch|intercept|start] [--lead 4] [--warmup 0]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const out = args[0] && !args[0].startsWith('--') ? args[0] : 'shots/demo.mp4';
const flag = (n, d) => {
  const i = args.indexOf('--' + n);
  return i >= 0 ? args[i + 1] : d;
};
const W = Number(flag('w', 1280));
const H = Number(flag('h', 720));
const FPS = Number(flag('fps', 30));
const SECONDS = Number(flag('seconds', 8));
const SCENARIO = flag('scenario', 'saturation');
const CONDITION = flag('condition', 'day');
const BATTERY = flag('battery', 'thaad');
const SEED = flag('seed', '7777');
const PHASE = flag('phase', 'launch');
const LEAD = Number(flag('lead', 4));
const WARMUP = Number(flag('warmup', 0));
const VIEW = flag('view', '2,26');
const FRAMES = Math.round(FPS * SECONDS);
const STEPS_PER_FRAME = Math.max(1, Math.round(60 / FPS));

const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-film-'));
fs.mkdirSync(path.dirname(out), { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox', '--no-sandbox', '--mute-audio', '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));

await page.goto(`http://127.0.0.1:5173/?test=1&seed=${SEED}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__GAME, null, { timeout: 90_000 });

const [vx, vz] = VIEW.split(',').map(Number);

/** Start the scenario from a clean state at the chosen viewpoint. */
async function setup() {
  await page.evaluate(([scenario, condition, battery, vx, vz]) => {
    const G = window.__GAME;
    G.freezePlayer(true);
    G.restart();
    G.configure({ scenario, condition, battery });
    G.teleport(vx, null, vz);
    G.lookAt(vx - 22, 60, vz - 250);
    G.start();
  }, [SCENARIO, CONDITION, BATTERY, vx, vz]);
}

/** Simulation-only pass that reports when each milestone happens. */
async function findMoments() {
  return page.evaluate(() => {
    const G = window.__GAME;
    let firstLaunch = -1;
    let firstResult = -1;
    for (let i = 0; i < 60 * 150; i++) {
      G.stepOnce();
      if (i % 21 === 0) G.autoPilot();
      const s = G.state();
      if (firstLaunch < 0 && s.roundStats.launched > 0) firstLaunch = s.simTime;
      if (firstResult < 0 && s.results.length > 0) {
        firstResult = s.simTime;
        break;
      }
    }
    return { firstLaunch, firstResult };
  });
}

let warmup = WARMUP;
if (PHASE !== 'start' && !WARMUP) {
  await setup();
  const m = await findMoments();
  console.log('milestones', JSON.stringify(m));
  const anchor = PHASE === 'intercept' ? m.firstResult : m.firstLaunch;
  warmup = Math.max(0, (anchor > 0 ? anchor : 8) - LEAD);
}
console.log(`capture: warmup ${warmup.toFixed(1)}s then ${FRAMES} frames @ ${FPS}fps (${W}x${H})`);

await setup();
if (warmup > 0) {
  await page.evaluate(([warmup]) => {
    const G = window.__GAME;
    const steps = Math.round(warmup * 60);
    for (let i = 0; i < steps; i++) {
      G.stepOnce();
      if (i % 21 === 0) G.autoPilot();
    }
    G.watch();
  }, [warmup]);
}

const t0 = Date.now();
for (let f = 0; f < FRAMES; f++) {
  await page.evaluate(([steps, frame]) => {
    const G = window.__GAME;
    for (let i = 0; i < steps; i++) G.stepOnce();
    if (frame % 7 === 0) G.autoPilot();
    G.watchSmooth(0.09);
    G.render();
  }, [STEPS_PER_FRAME, f]);
  await page.screenshot({ path: path.join(frameDir, `f${String(f).padStart(5, '0')}.png`), timeout: 180_000 });
  if (f % 20 === 0) {
    const el = (Date.now() - t0) / 1000;
    const eta = (el / Math.max(1, f)) * (FRAMES - f);
    console.log(`  frame ${f}/${FRAMES}  elapsed ${el.toFixed(0)}s  eta ${eta.toFixed(0)}s`);
  }
}

const state = await page.evaluate(() => window.__GAME.state());
console.log('results:', JSON.stringify(state.results.map((r) => r.result)));
await browser.close();

execFileSync('ffmpeg', [
  '-y', '-framerate', String(FPS),
  '-i', path.join(frameDir, 'f%05d.png'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  out,
], { stdio: ['ignore', 'ignore', 'inherit'] });
fs.rmSync(frameDir, { recursive: true, force: true });
console.log('done', out);
