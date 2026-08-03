#!/usr/bin/env node
/**
 * Gait check.
 *
 * The brief asks that feet stay near the floor and that figures walk rather than
 * slide. Both are measurable rather than matters of taste, so this samples the
 * rig instead of asking someone to squint at frames.
 *
 * At each timestep the harness renders two frames one thirtieth of a second
 * apart, finds each figure's lower ("planted") sole, and compares how far that
 * sole travelled over the deck with how far the body travelled. A figure whose
 * stance foot is nailed down while the body passes over it scores near 0; a
 * figure being dragged along with its legs waving scores near 1.
 *
 * It sweeps the whole interior act rather than a handful of chosen moments, so a
 * gait that only falls apart at one speed cannot hide.
 *
 * Usage:
 *   node scripts/qa-gait.mjs            # dev server
 *   node scripts/qa-gait.mjs --preview  # production build
 *   node scripts/qa-gait.mjs --step 1   # finer sweep, slower
 */

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const REPORT_PATH = path.join(ROOT, 'qa', 'gait-report.json');

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = args[i + 1];
  return next && !next.startsWith('--') ? next : true;
};
const usePreview = args.includes('--preview');
const step = Number(flag('step', 2));
const PORT = usePreview ? 4173 : 5173;
const BASE = `http://127.0.0.1:${PORT}`;

/** The interior act, from the corridor establishing shot to the pod bay. */
const FROM = 194;
const TO = 320;

/** Above this the planted foot is skating rather than gripping. */
const SLIP_LIMIT = 0.35;
/**
 * Slip only counts against a figure once the sole is actually travelling. A boot
 * creeping at a fifth of a metre a second is a large fraction of a body barely
 * moving at all, and nobody can see it.
 */
const VISIBLE_SLIP = 0.45;
/** Soles must stay within a boot's thickness of the deck. */
const SOLE_MIN = -0.06;
const SOLE_MAX = 0.14;
/** Below this the figure is easing in or out of a move; stride is meaningless. */
const MOVING = 0.35;
/**
 * Shortest plausible step. Below this the figure is mincing. The upper bound is
 * each figure's own leg reach, reported by the rig: a path that demands a longer
 * step than the legs can cover will slip however the stride is solved, and the
 * path itself is what has to change.
 */
const STEP_MIN = 0.25;

function startServer() {
  const child = spawn('npm', usePreview ? ['run', 'preview'] : ['run', 'dev'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  return child;
}

async function waitForServer(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server did not start at ${url}`);
}

async function main() {
  const server = startServer();
  let browser;
  try {
    await waitForServer(BASE);
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
      args: [
        '--headless=new',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--disable-gpu-sandbox',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--autoplay-policy=no-user-gesture-required',
        '--mute-audio',
        '--window-size=640,360',
      ],
    });
    const context = await browser.newContext({ viewport: { width: 640, height: 360 } });
    const page = await context.newPage();
    page.on('pageerror', (err) => console.error(`  [pageerror] ${err}`));

    await page.goto(`${BASE}/?qa=1&quality=low`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__starfall?.ready === true, null, { timeout: 180000 });
    await page.evaluate(() => window.__starfall.enter());
    await page.waitForTimeout(800);

    const samples = [];
    console.log(`\n  Sweeping t=${FROM}..${TO} every ${step}s at ${1 / 30} s apart.\n`);

    for (let t = FROM; t <= TO; t += step) {
      const slips = await page.evaluate((time) => {
        window.__starfall.renderAt(time);
        return window.__starfall.footSlip();
      }, t);
      for (const s of slips) samples.push({ time: t, ...s });
      const moving = slips.filter((s) => s.bodySpeed > MOVING);
      if (moving.length) {
        const worst = moving.reduce((m, s) => (s.ratio > m.ratio ? s : m));
        console.log(
          `  t=${String(t).padEnd(5)} ${String(moving.length).padStart(2)} in motion`
          + `  worst ${worst.target.padEnd(10)} ${worst.state.padEnd(7)}`
          + ` body ${worst.bodySpeed.toFixed(2)} m/s  sole ${worst.plantSpeed.toFixed(2)} m/s`
          + `  slip ${worst.ratio.toFixed(2)}  step ${worst.stepLength.toFixed(2)} m`,
        );
      }
    }

    // Grade only the figures that were actually travelling.
    const moving = samples.filter((s) => s.bodySpeed > MOVING);
    const slipping = moving.filter((s) => s.ratio > SLIP_LIMIT && s.plantSpeed > VISIBLE_SLIP);
    const offDeck = samples.filter((s) => s.soleHeight < SOLE_MIN || s.soleHeight > SOLE_MAX);
    const wrongGait = moving.filter((s) => s.stepLength > 0
      && (s.stepLength < STEP_MIN || s.stepLength > s.strideReach));

    const byState = new Map();
    for (const s of moving) {
      const e = byState.get(s.state) ?? { state: s.state, n: 0, sum: 0, worst: 0 };
      e.n++;
      e.sum += s.ratio;
      e.worst = Math.max(e.worst, s.ratio);
      byState.set(s.state, e);
    }

    console.log('\n  state     samples   mean slip   worst slip');
    console.log('  ------------------------------------------');
    for (const e of [...byState.values()].sort((a, b) => b.worst - a.worst)) {
      console.log(
        `  ${e.state.padEnd(9)} ${String(e.n).padStart(7)}   ${(e.sum / e.n).toFixed(3).padStart(9)}`
        + `   ${e.worst.toFixed(3).padStart(10)}`,
      );
    }

    await writeFile(REPORT_PATH, `${JSON.stringify({
      ranAt: new Date().toISOString(),
      build: usePreview ? 'preview' : 'dev',
      range: [FROM, TO],
      step,
      slipLimit: SLIP_LIMIT,
      soleRange: [SOLE_MIN, SOLE_MAX],
      movingThreshold: MOVING,
      minStep: STEP_MIN,
      totals: {
        samples: samples.length,
        moving: moving.length,
        slipping: slipping.length,
        offDeck: offDeck.length,
        wrongGait: wrongGait.length,
      },
      byState: [...byState.values()].map((e) => ({
        state: e.state, samples: e.n, meanSlip: e.sum / e.n, worstSlip: e.worst,
      })),
      worstSlips: [...moving].sort((a, b) => b.ratio - a.ratio).slice(0, 12),
      offDeck: offDeck.slice(0, 12),
      wrongGait: wrongGait.slice(0, 12),
    }, null, 2)}\n`);

    console.log(`\n  ${samples.length} samples, ${moving.length} with the figure travelling.`);
    const worst = moving.reduce((m, s) => Math.max(m, s.plantSpeed), 0);
    if (slipping.length) {
      console.log(`  ${slipping.length} above the ${SLIP_LIMIT} slip limit with a visibly moving sole:`);
      for (const s of slipping.slice(0, 8)) {
        console.log(`    t=${s.time} ${s.target} ${s.state} body ${s.bodySpeed.toFixed(2)} sole ${s.plantSpeed.toFixed(2)} slip ${s.ratio.toFixed(2)}`);
      }
    } else {
      console.log(`  No figure slides: every planted sole holds within ${SLIP_LIMIT} of body travel,`);
      console.log(`  or moves too slowly to see. Fastest planted sole anywhere: ${worst.toFixed(2)} m/s.`);
    }
    if (offDeck.length) {
      console.log(`  ${offDeck.length} sole(s) outside ${SOLE_MIN}..${SOLE_MAX} m of the deck:`);
      for (const s of offDeck.slice(0, 8)) {
        console.log(`    t=${s.time} ${s.target} ${s.state} sole y=${s.soleHeight.toFixed(3)}`);
      }
    } else {
      console.log(`  Every sole stays within ${SOLE_MIN}..${SOLE_MAX} m of the deck.`);
    }
    if (wrongGait.length) {
      console.log(`  ${wrongGait.length} sample(s) whose step is under ${STEP_MIN} m or beyond the figure's reach:`);
      const seen = new Set();
      for (const s of wrongGait) {
        const k = `${s.target}/${s.state}`;
        if (seen.has(k)) continue;
        seen.add(k);
        console.log(`    t=${s.time} ${s.target} ${s.state} body ${s.bodySpeed.toFixed(2)} m/s`
          + ` -> ${s.stepLength.toFixed(2)} m per step (reach ${s.strideReach.toFixed(2)} m)`);
      }
    } else {
      console.log(`  Every step lands between ${STEP_MIN} m and the figure's own leg reach.`);
    }
    console.log('');
    process.exitCode = slipping.length || offDeck.length || wrongGait.length ? 1 : 0;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
