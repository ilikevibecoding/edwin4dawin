#!/usr/bin/env node
/**
 * Headless numeric tests for the first-person player controller.
 *
 * Loads the player showcase in the same headless Chrome configuration the
 * screenshot harness uses, then drives the controller frame by frame through
 * `window.__PLAYER_TEST__` and asserts against the course the showcase
 * publishes. Nothing here hard-codes a tuning value or a coordinate: every
 * expectation is derived from `__PLAYER_TEST__.tuning` and `.layout`, which are
 * the very objects the controller runs on, so the spec and the code cannot
 * drift apart without a failure.
 *
 * Where a behaviour follows from a documented model rather than from a single
 * constant — the acceleration ramp, the slide's friction curve — the model is
 * reimplemented here in a few lines and the controller is checked against it.
 * That catches a subtly wrong integration order, which a tolerance band around
 * a hand-measured number would not.
 *
 * Usage:
 *   node tools/player-test.mjs
 *   node tools/player-test.mjs --url http://127.0.0.1:5173/ --verbose
 *   node tools/player-test.mjs --fuzz 20000
 *   node tools/player-test.mjs --shots shots/player
 */
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const OPTS = {
  url: String(arg('url', 'http://127.0.0.1:5173/')),
  timeout: Number(arg('timeout', 600000)),
  bootTimeout: Number(arg('boot-timeout', 120000)),
  verbose: !!arg('verbose', false),
  fuzzFrames: Number(arg('fuzz', 10000)),
  seed: Number(arg('seed', 0xb1ac0)),
  shots: arg('shots', false),
};

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
if (!CHROME) {
  console.error('No Chrome binary found.');
  process.exit(1);
}

// Identical to tools/capture.mjs, plus --expose-gc so the allocation check has
// a heap it can trust.
const LAUNCH_ARGS = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu-sandbox',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-dev-shm-usage',
  '--disable-software-rasterizer-fallback-warning',
  '--force-color-profile=srgb',
  '--disable-lcd-text',
  '--hide-scrollbars',
  '--mute-audio',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--window-size=1280,720',
  '--renderer-process-limit=1',
  '--js-flags=--expose-gc',
];

/* ------------------------------ assertions ------------------------------ */

let passed = 0;
const failures = [];
let group = '';

function section(name) {
  group = name;
  console.log(`\n${name}`);
}

function record(ok, label, detail) {
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}${detail ? `  (${detail})` : ''}`);
  } else {
    failures.push(`${group} / ${label}${detail ? `  (${detail})` : ''}`);
    console.log(`  FAIL  ${label}${detail ? `  (${detail})` : ''}`);
  }
}

const f = (v, digits = 3) => (typeof v === 'number' ? v.toFixed(digits) : String(v));
const note = (text) => console.log(`  NOTE  ${text}`);

function ok(label, condition, detail) {
  record(!!condition, label, detail);
}

function near(label, actual, expected, tolerance, unit = '') {
  const detail = `got ${f(actual)}${unit}, want ${f(expected)}${unit} +/- ${f(tolerance)}`;
  if (typeof actual !== 'number' || !Number.isFinite(actual)) {
    record(false, label, `got ${String(actual)}, want ${f(expected)}${unit}`);
    return;
  }
  record(Math.abs(actual - expected) <= tolerance, label, detail);
}

function below(label, actual, limit, unit = '') {
  record(actual < limit, label, `got ${f(actual)}${unit}, limit < ${f(limit)}${unit}`);
}

function above(label, actual, limit, unit = '') {
  record(actual > limit, label, `got ${f(actual)}${unit}, limit > ${f(limit)}${unit}`);
}

function within(label, actual, lo, hi, unit = '') {
  record(
    actual >= lo && actual <= hi,
    label,
    `got ${f(actual)}${unit}, want ${f(lo)}..${f(hi)}${unit}`,
  );
}

/* ---------------------------- reference models -------------------------- */

/**
 * The ground movement model the controller documents: friction first against a
 * control speed with a linear floor, then acceleration toward the wish speed,
 * clamped so the wish speed is never overshot. Reimplemented here so the
 * acceleration ramp is checked against the model rather than against a number
 * somebody measured once.
 */
function groundRamp(T, top, h, fraction) {
  let v = 0;
  for (let step = 1; step <= 4000; step++) {
    const control = Math.max(v, T.frictionStopSpeed);
    v = Math.max(0, v - control * T.groundFriction * h);
    const add = top - v;
    if (add > 0) v += Math.min(T.groundAccel * h, add);
    if (v >= top * fraction) return { seconds: step * h, steps: step, speed: v };
  }
  return { seconds: Infinity, steps: Infinity, speed: v };
}

/** Steady-state speed the same model settles on. */
function groundTopSpeed(T, wish) {
  return Math.min(wish, T.groundAccel / T.groundFriction);
}

/**
 * The slide's friction ramp, integrated the same way the controller does it:
 * friction scaled quadratically over the nominal duration, then any downhill
 * acceleration, then the speed cap, then the position step.
 */
function slideModel(T, v0, h, slopeAccel = 0) {
  let v = Math.min(v0, T.slideMaxSpeed);
  let t = 0;
  let d = 0;
  for (let step = 0; step < 4000; step++) {
    if (t >= T.slideDuration || v < T.slideMinSpeed) break;
    const k = Math.min(1, t / T.slideDuration);
    const friction =
      T.slideFrictionStart + (T.slideFrictionEnd - T.slideFrictionStart) * k * k;
    v = Math.max(0, v - v * friction * h) + slopeAccel * h;
    if (v > T.slideMaxSpeed) v = T.slideMaxSpeed;
    d += v * h;
    t += h;
  }
  return { seconds: t, distance: d, speed: v };
}

/** Launch speed that reaches an apex under the rise gravity. */
const launchSpeed = (T) => Math.sqrt(2 * T.gravity * T.riseGravityScale * T.jumpApex);

/* --------------------------------- main --------------------------------- */

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: LAUNCH_ARGS,
    protocolTimeout: OPTS.timeout,
    defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(OPTS.timeout);

  const logs = [];
  page.on('console', (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    if (OPTS.verbose || msg.type() === 'error') console.log('  page', text);
  });
  page.on('pageerror', (err) => {
    logs.push(`[pageerror] ${err.message}`);
    console.log('  page [pageerror]', err.message);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) logs.push(`[http ${res.status()}] ${res.url()}`);
  });

  const url = new URL(OPTS.url);
  url.searchParams.set('showcase', 'player');
  // Capture mode pauses the engine, so the controller only advances when a test
  // asks it to and nothing renders behind our backs.
  url.searchParams.set('capture', '1');

  console.log(`Loading ${url.href} ...`);
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: OPTS.timeout });

  const overlay = await page
    .evaluate(() => {
      const el = document.querySelector('vite-error-overlay');
      if (el) return el.shadowRoot?.querySelector('.message')?.textContent ?? 'vite error';
      return null;
    })
    .catch(() => null);
  if (overlay) {
    console.error('Build error:\n', overlay);
    await browser.close();
    process.exit(1);
  }

  try {
    await page.waitForFunction(
      () => window.__GAME__?.ready === true && !!window.__PLAYER_TEST__,
      { timeout: OPTS.bootTimeout, polling: 200 },
    );
  } catch {
    console.error('Showcase never came up. Recent console output:');
    for (const l of logs.slice(-40)) console.error('   ', l);
    await browser.close();
    process.exit(1);
  }

  const T = await page.evaluate(() => window.__PLAYER_TEST__.tuning);
  const L = await page.evaluate(() => window.__PLAYER_TEST__.layout);
  const h = T.fixedDt;
  const call = (fn, ...args) => page.evaluate(fn, ...args);

  /** Resets to a spot and runs a plan in one round trip. */
  const drive = (spot, plan, opts) =>
    call(
      ([s, p, o]) => {
        window.__PLAYER_TEST__.reset(s);
        return window.__PLAYER_TEST__.run(p, o);
      },
      [spot, plan, opts ?? {}],
    );

  console.log(
    `Course ready at [${L.origin.map((v) => f(v, 0)).join(', ')}], ` +
      `${Object.keys(L.spots).length} start spots, ${L.ledges.length} ledges`,
  );

  /* ------------------------- stance top speeds ------------------------- */

  section('Top speed per stance');

  const settle = 420; // 3.5 s: past every ramp and spin-up in the tuning
  const topSpeedCase = async (label, spot, plan, wish, tolerance = 0.01) => {
    const res = await drive(spot, plan);
    near(label, res.end.speed, groundTopSpeed(T, wish), tolerance, ' m/s');
    return res;
  };

  await topSpeedCase('walk', 'runway', [{ move: [0, 1], frames: settle }], T.walkSpeed);
  const sprintRun = await topSpeedCase(
    'sprint',
    'runway',
    [{ move: [0, 1], sprint: true, frames: settle }],
    T.sprintSpeed,
  );
  ok('  sprint state is reported', sprintRun.end.sprinting === 1);
  await topSpeedCase(
    'tactical sprint (double tap)',
    'runway',
    [
      { move: [0, 1], sprint: true, frames: 1 },
      { move: [0, 1], sprint: false, frames: 1 },
      { move: [0, 1], sprint: true, frames: settle },
    ],
    T.tacticalSprintSpeed,
  );
  await topSpeedCase(
    'crouch walk',
    'runway',
    [{ move: [0, 1], crouch: true, frames: settle }],
    T.crouchSpeed,
  );
  const proneRun = await topSpeedCase(
    'prone crawl',
    'runway',
    [
      { prone: true, frames: 1 },
      { move: [0, 1], frames: settle },
    ],
    T.proneSpeed,
  );
  ok('  prone stance is reported', proneRun.end.stance === 2, `code ${proneRun.end.stance}`);
  above(
    '  prone locks movement during the transition',
    T.proneTransitionTime,
    0.2,
    ' s',
  );

  section('Directional speed scaling');
  const strafe = await drive('camera', [{ move: [1, 0], frames: settle }]);
  near('strafe is scaled', strafe.end.speed, T.walkSpeed * T.strafeScale, 0.01, ' m/s');
  const back = await drive('camera', [{ move: [0, -1], frames: 240 }]);
  near('backpedal is scaled', back.end.speed, T.walkSpeed * T.backScale, 0.01, ' m/s');
  const adsFwd = await drive('camera', [{ move: [0, 1], ads: true, frames: settle }]);
  near(
    'aiming slows the walk',
    adsFwd.end.speed,
    T.walkSpeed * T.adsSpeedScale,
    0.03,
    ' m/s',
  );
  const adsStrafe = await drive('camera', [{ move: [1, 0], ads: true, frames: settle }]);
  near(
    'aiming slows the strafe further',
    adsStrafe.end.speed,
    T.walkSpeed * T.strafeScale * T.adsStrafeScale,
    0.03,
    ' m/s',
  );
  below('  ADS strafe is the slowest of the two', adsStrafe.end.speed, adsFwd.end.speed, ' m/s');

  /* --------------------------- acceleration ---------------------------- */

  section('Acceleration curve');
  const ramp = await drive('runway', [
    { move: [0, 1], frames: 240, dt: h },
    { move: [0, 1], frames: 120, dt: h },
  ]);
  const model90 = groundRamp(T, T.walkSpeed, h, 0.9);
  near(
    '90% of walk speed arrives when the friction model says',
    ramp.phases[0].timeTo90,
    model90.seconds,
    2 * h,
    ' s',
  );
  above('  the ramp is not instant', ramp.phases[0].timeTo90, 4 * h, ' s');
  below('  the ramp is still responsive', ramp.phases[0].timeTo90, 0.3, ' s');
  note(
    `walk reaches 90% in ${f(ramp.phases[0].timeTo90)} s ` +
      `(${model90.steps} fixed steps), 100% at ${f(T.groundAccel / T.groundFriction)} m/s ceiling`,
  );

  const sprintRamp = await drive('runway', [{ move: [0, 1], sprint: true, frames: 360, dt: h }]);
  const sprintModel = groundRamp(T, T.sprintSpeed, h, 0.9);
  // Sprint has the spin-up on top of the friction ramp, so it must be slower.
  above(
    'sprint spin-up delays the top speed',
    sprintRamp.phases[0].timeTo90,
    sprintModel.seconds,
    ' s',
  );
  below('  but not by more than the spin-up', sprintRamp.phases[0].timeTo90, sprintModel.seconds + T.sprintSpinUp + 4 * h, ' s');

  section('Braking');
  const brake = await drive('runway', [
    { move: [0, 1], frames: settle },
    { move: [0, 0], frames: 400, dt: h, until: 'stopped' },
  ]);
  within('releasing the stick comes to a full stop', brake.phases[1].seconds, 0.2, 1.2, ' s');
  below('  and actually reaches zero', brake.end.speed, 0.02, ' m/s');
  // Compared on the signed forward speed, not the magnitude: a counter-strafe
  // runs the speed through zero and back up the other way, so `speed` alone
  // would report the reversal as a failure to brake.
  const counter = await drive('runway', [
    { move: [0, 1], frames: settle },
    { move: [0, -1], frames: 18, dt: h },
  ]);
  const coast = await drive('runway', [
    { move: [0, 1], frames: settle },
    { move: [0, 0], frames: 18, dt: h },
  ]);
  below(
    'counter-strafing brakes harder than coasting',
    counter.phases[1].endSnapshot.forwardSpeed,
    coast.phases[1].endSnapshot.forwardSpeed,
    ' m/s forward',
  );
  below(
    '  hard enough to reverse inside the same window',
    counter.phases[1].endSnapshot.forwardSpeed,
    0,
    ' m/s forward',
  );
  above('  while coasting is still going forwards', coast.phases[1].endSnapshot.forwardSpeed, 0, ' m/s');
  note(
    `after ${f(18 * h)} s: counter-strafe ${f(counter.phases[1].endSnapshot.forwardSpeed)} m/s ` +
      `vs coast ${f(coast.phases[1].endSnapshot.forwardSpeed)} m/s forward`,
  );

  /* ------------------------------- sprint ------------------------------ */

  section('Sprint entry and exit');
  const spinUp = await drive('runway', [
    { move: [0, 1], sprint: true, frames: 1, dt: h },
    { move: [0, 1], sprint: true, frames: 400, dt: h, until: 'sliding' },
  ]);
  ok(
    'sprint cannot start from a standstill',
    spinUp.phases[0].endSnapshot.sprinting === 0,
    `sprinting=${spinUp.phases[0].endSnapshot.sprinting} at ${f(spinUp.phases[0].endSpeed)} m/s`,
  );
  const entry = await call(
    ([dt, entrySpeed]) => {
      window.__PLAYER_TEST__.reset('runway');
      const out = { speed: 0, frames: 0 };
      for (let i = 0; i < 400; i++) {
        const r = window.__PLAYER_TEST__.run([{ move: [0, 1], sprint: true, frames: 1, dt }], {});
        if (r.end.sprinting === 1) {
          out.speed = r.end.speed;
          out.frames = i + 1;
          break;
        }
      }
      out.entrySpeed = entrySpeed;
      return out;
    },
    [h, T.sprintEntrySpeed],
  );
  above('  sprint engages only past the entry speed', entry.speed, T.sprintEntrySpeed - 1e-6, ' m/s');
  note(`sprint engaged after ${entry.frames} fixed steps at ${f(entry.speed)} m/s`);

  const fireOut = await drive('runway', [
    { move: [0, 1], sprint: true, frames: settle },
    { move: [0, 1], sprint: true, fire: true, frames: 1, dt: h },
  ]);
  ok('firing drops the sprint', fireOut.end.sprinting === 0);
  near('  and starts the sprint-out delay', fireOut.end.sprintOut, T.sprintOutTime, 2 * h, ' s');

  const adsOut = await drive('runway', [
    { move: [0, 1], sprint: true, frames: settle },
    { move: [0, 1], sprint: true, ads: true, frames: 1, dt: h },
  ]);
  ok('aiming drops the sprint', adsOut.end.sprinting === 0);

  const tacOut = await drive('runway', [
    { move: [0, 1], sprint: true, frames: 1 },
    { move: [0, 1], sprint: false, frames: 1 },
    { move: [0, 1], sprint: true, frames: settle },
    { move: [0, 1], sprint: true, fire: true, frames: 1, dt: h },
  ]);
  near(
    'tactical sprint takes longer to fire out of',
    tacOut.end.sprintOut,
    T.tacticalSprintOutTime,
    2 * h,
    ' s',
  );

  const sprintOutClears = await drive('runway', [
    { move: [0, 1], sprint: true, frames: settle },
    { move: [0, 1], fire: true, frames: 1, dt: h },
    { move: [0, 1], frames: Math.ceil(T.sprintOutTime / h) + 2, dt: h },
  ]);
  near('the sprint-out delay expires', sprintOutClears.end.sprintOut, 0, 1e-6, ' s');

  const winded = await drive('runway', [
    { move: [0, 1], sprint: true, frames: Math.ceil(T.windedTime / h) + 60 },
  ]);
  near('sustained sprinting fully winds the player', winded.end.winded, 1, 0.02);
  const recovered = await drive('runway', [
    { move: [0, 1], sprint: true, frames: Math.ceil(T.windedTime / h) + 60 },
    { frames: Math.ceil(T.windedRecoverTime / h) + 60 },
  ]);
  near('  and standing still pays it back', recovered.end.winded, 0, 0.02);

  /* -------------------------------- jump ------------------------------- */

  section('Jump');
  const jump = await drive(
    'runway',
    [
      { jump: true, frames: 1, dt: h },
      { frames: 400, dt: h, until: 'grounded' },
    ],
    { trace: true },
  );
  const apex = jump.maxY - jump.trace[0][3] + (jump.trace[0][3] - jump.trace[0][3]);
  const startY = L.spots.runway[1];
  near('a standing jump reaches the specified apex', jump.maxY - jump.minY, T.jumpApex, 0.02, ' m');
  // Leapfrog splits gravity either side of the move, so the velocity reported
  // at the end of the launch step has taken a whole step of it, not half.
  near(
    '  launch speed matches the apex and the rise gravity',
    jump.phases[0].endSnapshot.vy,
    launchSpeed(T) - T.gravity * T.riseGravityScale * h,
    0.02,
    ' m/s',
  );
  ok('  a jump was announced', jump.events['player:jump'] === 1, `${jump.events['player:jump']} events`);
  ok('  and a landing', jump.events['player:land'] === 1, `${jump.events['player:land']} events`);

  // Asymmetric gravity: the arc must have a distinguishable top.
  const vyCol = 6;
  const yCol = 3;
  let apexIndex = 0;
  for (let i = 1; i < jump.trace.length; i++) {
    if (jump.trace[i][yCol] > jump.trace[apexIndex][yCol]) apexIndex = i;
  }
  const riseTime = jump.trace[apexIndex][1] - jump.trace[0][1];
  const fallTime = jump.trace[jump.trace.length - 1][1] - jump.trace[apexIndex][1];
  below('the fall is faster than the rise', fallTime, riseTime, ' s');
  near(
    '  and by the ratio the gravity scales imply',
    riseTime / fallTime,
    Math.sqrt(T.fallGravityScale / T.riseGravityScale),
    0.06,
  );
  note(
    `rise ${f(riseTime)} s, fall ${f(fallTime)} s, ` +
      `apex ${f(jump.maxY - jump.minY)} m at ${f(launchSpeed(T))} m/s launch ` +
      `(start y ${f(startY, 1)}, peak offset ${f(apex, 2)})`,
  );

  const held = await drive('runway', [{ jump: true, frames: 60, dt: h }]);
  ok(
    'holding jump does not repeat it',
    held.events['player:jump'] === 1,
    `${held.events['player:jump']} jumps in ${f(60 * h)} s`,
  );
  const mashed = await call(
    ([dt, frames]) => {
      window.__PLAYER_TEST__.reset('runway');
      const plan = [];
      for (let i = 0; i < frames; i++) plan.push({ jump: i % 2 === 0, frames: 1, dt });
      return window.__PLAYER_TEST__.run(plan, {});
    },
    [h, 120],
  );
  const cooldownLimit = Math.ceil(120 * h / T.jumpCooldown) + 1;
  below(
    'mashing jump is limited by the cooldown',
    mashed.events['player:jump'],
    cooldownLimit + 1,
    ' jumps',
  );

  section('Coyote time and jump buffering');
  const coyote = await call((n) => window.__PLAYER_TEST__.coyoteScan(n), 24);
  let lastCoyote = -1;
  for (let i = 0; i < coyote.lead.length; i++) if (coyote.fired[i]) lastCoyote = coyote.lead[i];
  const coyoteFrames = Math.floor(T.coyoteTime / coyote.dt);
  ok(
    'a jump right off the ledge works',
    coyote.fired[0] === true,
    `delay 0 frames -> ${coyote.fired[0]}`,
  );
  near(
    'the grace period lasts as long as the tuning says',
    (lastCoyote + 1) * coyote.dt,
    T.coyoteTime,
    1.5 * coyote.dt,
    ' s',
  );
  ok(
    '  and stops working after it',
    coyote.fired[coyote.fired.length - 1] === false,
    `delay ${coyote.lead[coyote.lead.length - 1]} frames still fired`,
  );
  let coyoteMonotone = true;
  for (let i = 1; i < coyote.fired.length; i++) {
    if (coyote.fired[i] && !coyote.fired[i - 1]) coyoteMonotone = false;
  }
  ok('  with a single clean boundary', coyoteMonotone);
  note(
    `coyote window: fired up to a ${lastCoyote}-frame delay ` +
      `(${f((lastCoyote + 1) * coyote.dt)} s vs ${f(T.coyoteTime)} s tuned, ` +
      `${coyoteFrames} whole steps)`,
  );

  const buffer = await call(() => window.__PLAYER_TEST__.jumpBufferScan());
  let bufferOk = true;
  const bufferRows = [];
  for (let i = 0; i < buffer.lead.length; i++) {
    const lead = buffer.lead[i] * buffer.dt;
    const shouldFire = lead <= T.jumpBufferTime;
    // One fixed step of slack: the buffered jump can only fire on the step
    // after touchdown, so a press exactly on the boundary may fall either way.
    const boundary = Math.abs(lead - T.jumpBufferTime) <= 1.5 * buffer.dt;
    if (!boundary && buffer.fired[i] !== shouldFire) bufferOk = false;
    bufferRows.push(`${buffer.lead[i]}f=${buffer.fired[i] ? 'fired' : 'no'}`);
  }
  ok(
    'a jump pressed before landing fires on touchdown',
    bufferOk,
    `lead frames before landing: ${bufferRows.join(' ')}`,
  );
  ok(
    '  the deepest press inside the window fires',
    buffer.fired[buffer.fired.length - 1] === true,
  );
  ok('  a press well outside it does not', buffer.fired[0] === false);
  note(`buffer window ${f(T.jumpBufferTime)} s = ${f(T.jumpBufferTime / buffer.dt, 1)} fixed steps`);

  section('Air control');
  const airborne = Math.round(0.3 / h);
  const airPush = await drive('runway', [
    { jump: true, frames: 1, dt: h },
    { move: [0, 1], frames: airborne, dt: h },
  ]);
  near(
    'air acceleration saturates at the configured fraction of walk speed',
    airPush.end.speed,
    T.walkSpeed * T.airSpeedCap,
    0.12,
    ' m/s',
  );
  const groundPush = await drive('runway', [{ move: [0, 1], frames: airborne, dt: h }]);
  below(
    '  which is a small fraction of what the ground gives',
    airPush.end.speed / groundPush.end.speed,
    0.4,
  );
  const sprintJump = await drive('runway', [
    { move: [0, 1], sprint: true, frames: settle },
    { move: [0, 1], sprint: true, jump: true, frames: 1, dt: h },
    { move: [0, 1], sprint: true, frames: 400, dt: h, until: 'grounded' },
  ]);
  near(
    'a sprint jump keeps its momentum',
    sprintJump.end.speed,
    T.sprintSpeed,
    0.25,
    ' m/s',
  );
  below(
    '  and cannot gain from it',
    sprintJump.maxSpeed,
    T.sprintSpeed + 0.05,
    ' m/s',
  );
  note(
    `air control tops out at ${f(airPush.end.speed)} m/s ` +
      `(${f((airPush.end.speed / T.walkSpeed) * 100, 0)}% of walk), ` +
      `air accel ${f(T.airAccel, 0)} vs ground ${f(T.groundAccel, 0)} m/s^2`,
  );

  /* -------------------------------- slide ------------------------------ */

  section('Slide');
  const slidePlan = (spot, sprintFrames) => [
    { move: [0, 1], sprint: true, frames: sprintFrames },
    { move: [0, 1], sprint: true, crouch: true, frames: 400, dt: h, until: 'notSliding' },
  ];
  const slide = await drive('slide', slidePlan('slide', settle), { trace: true });
  const slidePhase = slide.phases[1];
  ok('sprint plus crouch starts a slide', slide.events['player:slide'] >= 1);
  ok('  and the stance is reported', slidePhase.stances.includes(3), `stances ${slidePhase.stances}`);
  near(
    '  entry speed is the sprint speed plus the boost',
    slidePhase.maxSpeed,
    Math.min(T.sprintSpeed + T.slideBoost, T.slideMaxSpeed),
    0.2,
    ' m/s',
  );
  const flatModel = slideModel(T, T.sprintSpeed + T.slideBoost, h);
  near('  duration matches the friction ramp', slidePhase.seconds, flatModel.seconds, 3 * h, ' s');
  near(
    '  distance matches the friction ramp',
    slidePhase.travel,
    flatModel.distance,
    flatModel.distance * 0.08,
    ' m',
  );
  below('  the camera is lowered', slidePhase.endSnapshot.eyeHeight, T.standEye - 0.1, ' m');
  note(
    `flat slide: ${f(slidePhase.seconds)} s, ${f(slidePhase.travel)} m, ` +
      `${f(slidePhase.maxSpeed)} -> ${f(slidePhase.endSpeed)} m/s ` +
      `(model ${f(flatModel.seconds)} s, ${f(flatModel.distance)} m)`,
  );

  const slopeAccel =
    T.gravity * T.slideSlopeScale * Math.sin(L.ramp.angle) * Math.cos(L.ramp.angle);
  const downhill = await drive('downhill', slidePlan('downhill', 260));
  const downPhase = downhill.phases[1];
  const downModel = slideModel(T, downPhase.maxSpeed, h, slopeAccel);
  above(
    'a downhill slide carries further',
    downPhase.travel / slidePhase.travel,
    1.05,
    'x the flat distance',
  );
  near(
    '  by about what the slope adds',
    downPhase.travel,
    downModel.distance,
    downModel.distance * 0.2,
    ' m',
  );
  note(
    `downhill slide: ${f(downPhase.travel)} m on a ${f((L.ramp.angle * 180) / Math.PI, 1)} deg ` +
      `slope (+${f(slopeAccel)} m/s^2), model ${f(downModel.distance)} m`,
  );

  const steerRun = await drive('slide', [
    { move: [0, 1], sprint: true, frames: settle },
    { move: [1, 1], sprint: true, frames: 30, dt: h },
  ]);
  const steerSlide = await drive('slide', [
    { move: [0, 1], sprint: true, frames: settle },
    { move: [1, 1], sprint: true, crouch: true, frames: 30, dt: h },
  ]);
  const heading = (snap) => Math.abs(Math.atan2(snap.vx, -snap.vz));
  const runTurn = heading(steerRun.end);
  const slideTurn = heading(steerSlide.end);
  below(
    'a slide has much less turn authority than a run',
    slideTurn / runTurn,
    0.6,
    ' of the running turn',
  );
  above('  but can still be aimed', slideTurn, 0.02, ' rad');
  note(
    `over ${f(30 * h)} s of full lateral input: running turned ` +
      `${f((runTurn * 180) / Math.PI, 1)} deg, sliding ${f((slideTurn * 180) / Math.PI, 1)} deg`,
  );

  const slideJump = await drive('slide', [
    { move: [0, 1], sprint: true, frames: settle },
    { move: [0, 1], sprint: true, crouch: true, frames: 30, dt: h },
    { move: [0, 1], crouch: true, jump: true, frames: 2, dt: h },
  ]);
  above('a slide can be jumped out of', slideJump.end.vy, 1, ' m/s');
  near(
    '  at the scaled jump speed',
    slideJump.phases[2].endSnapshot.vy,
    launchSpeed(T) * T.slideJumpScale - T.gravity * T.riseGravityScale * h * 1.5,
    0.25,
    ' m/s',
  );
  ok('  and the slide ends', slideJump.end.stance !== 3, `stance ${slideJump.end.stance}`);

  const slideCancel = await drive('slide', [
    { move: [0, 1], sprint: true, frames: settle },
    { move: [0, 1], sprint: true, crouch: true, frames: 30, dt: h },
    { move: [0, 1], frames: 10, dt: h },
  ]);
  ok(
    'releasing crouch cancels the slide',
    slideCancel.end.stance !== 3,
    `stance ${slideCancel.end.stance}`,
  );

  const slowSlide = await drive('slide', [
    { move: [0, 1], frames: settle },
    { move: [0, 1], crouch: true, frames: 30, dt: h },
  ]);
  ok(
    'a walk is too slow to slide',
    !slowSlide.phases[1].stances.includes(3),
    `stances ${slowSlide.phases[1].stances}`,
  );

  /* --------------------------- mantle and vault ------------------------ */

  section('Mantle and vault');
  // Run into the obstacle, ask for the climb, ride it out, then let go. The
  // stick is released once the climb is under way so the measurement is of
  // where the player was put, not of how far they kept walking afterwards.
  const approach = (extra = []) => [
    { move: [0, 1], frames: 110 },
    { move: [0, 1], jump: true, frames: 1, dt: h },
    { move: [0, 1], frames: 150, dt: h, until: 'mantling' },
    { frames: 200, dt: h, until: 'notMantling' },
    { frames: 150, dt: h, until: 'stopped' },
    ...extra,
  ];

  for (const ledge of L.ledges) {
    const probe = await call(
      ([spot, plan]) => {
        window.__PLAYER_TEST__.reset(spot);
        window.__PLAYER_TEST__.run(plan, {});
        return window.__PLAYER_TEST__.probeMantle();
      },
      [`ledge:${ledge.name}`, [{ move: [0, 1], frames: 110 }]],
    );
    const res = await call(
      ([spot, plan]) => {
        window.__PLAYER_TEST__.reset(spot);
        return window.__PLAYER_TEST__.run(plan, {});
      },
      [`ledge:${ledge.name}`, approach()],
    );
    const climbed = (res.events['player:mantle'] ?? 0) + (res.events['player:vault'] ?? 0);
    const label = `${f(ledge.height, 2)} m ledge`;
    if (ledge.expect === 'mantle') {
      ok(`${label} is mantled`, climbed === 1, `${climbed} climbs, probe "${probe.reason}"`);
      near(`  and ends on top of it`, res.end.y, ledge.topY, 0.08, ' m');
      near(`  probe measured the rise`, probe.rise, ledge.height, 0.05, ' m');
      // Against the rise the probe actually measured, so this checks the
      // formula rather than re-checking the geometry the line above covers.
      near(
        `  duration scales with the height`,
        probe.duration,
        T.mantleTimeBase + probe.rise * T.mantleTimePerMeter,
        1e-6,
        ' s',
      );
    } else if (ledge.expect === 'refuse') {
      ok(`${label} is refused`, climbed === 0, `probe said "${probe.reason}"`);
      below(`  and the player stays down`, res.end.y - L.deckTop, 0.1, ' m');
    } else {
      ok(
        `${label} is a step, not a mantle`,
        climbed === 0,
        `probe said "${probe.reason}"`,
      );
      near(`  the step-up climbs it`, res.end.y, ledge.topY, 0.06, ' m');
    }
  }

  const vault = await call(
    ([plan, walkUp]) => {
      // Probed from a run that stops short of the rail, so the readout is the
      // decision the controller was about to make rather than a stale one.
      window.__PLAYER_TEST__.reset('vault');
      window.__PLAYER_TEST__.run(walkUp, {});
      const probe = window.__PLAYER_TEST__.probeMantle();
      window.__PLAYER_TEST__.reset('vault');
      const res = window.__PLAYER_TEST__.run(plan, {});
      return { res, probe };
    },
    [approach(), [{ move: [0, 1], frames: 110 }]],
  );
  ok(
    'a waist-high rail is vaulted, not mantled',
    (vault.res.events['player:vault'] ?? 0) === 1 &&
      (vault.res.events['player:mantle'] ?? 0) === 0,
    `vault ${vault.res.events['player:vault']}, mantle ${vault.res.events['player:mantle']}`,
  );
  near('  and lands on the far side', vault.res.end.y, L.vault.landingY, 0.08, ' m');
  above(
    '  past the rail',
    L.spots.vault[2] - vault.res.end.z,
    L.vault.thickness + T.capsuleRadius,
    ' m',
  );
  ok('  and read as a vault, not a climb', vault.probe.vault === true, vault.probe.reason);
  near('  over a waist-high rail', vault.probe.rise, L.vault.height, 0.05, ' m');
  const mantleDuration = T.mantleTimeBase + vault.probe.rise * T.mantleTimePerMeter;
  near(
    '  taking the vault share of a mantle of that height',
    vault.probe.duration,
    mantleDuration * T.vaultTimeScale,
    1e-6,
    ' s',
  );
  below('  which is faster than the climb would be', vault.probe.duration, mantleDuration, ' s');
  below(
    '  keeping more speed than a mantle would',
    T.mantleExitSpeed,
    T.vaultExitSpeed,
    ' m/s exit',
  );
  note(
    `vault window is everything up to ${f(T.vaultMaxHeight, 2)} m with a ` +
      `${f(T.vaultFarDrop, 2)} m drop behind it; mantle window ` +
      `${f(T.mantleMinHeight, 2)}..${f(T.mantleMaxHeight, 2)} m`,
  );

  const noInput = await call(
    ([plan]) => {
      window.__PLAYER_TEST__.reset('ledge:mid');
      return window.__PLAYER_TEST__.run(plan, {});
    },
    [[{ move: [0, 1], frames: 110 }, { move: [0, 0], jump: true, frames: 1, dt: h }, { frames: 200 }]],
  );
  ok(
    'a mantle needs forward input',
    (noInput.events['player:mantle'] ?? 0) === 0,
    `${noInput.events['player:mantle']} climbs with no stick`,
  );

  /* --------------------------- stance and lean ------------------------- */

  section('Stance transitions');
  const crouchUp = await drive('camera', [
    { crouch: true, frames: 120 },
    { frames: 120 },
  ]);
  near('crouching lowers the eye', crouchUp.phases[0].endSnapshot.eyeHeight, T.crouchEye, 0.02, ' m');
  near('  and standing restores it', crouchUp.end.eyeHeight, T.standEye, 0.02, ' m');
  near(
    '  the capsule follows the stance',
    crouchUp.phases[0].endSnapshot.capsuleHeight,
    T.crouchHeight,
    0.02,
    ' m',
  );

  const lowCeiling = await drive('ceiling', [
    { crouch: true, frames: 120 },
    { frames: 240 },
  ]);
  ok(
    'a low ceiling refuses a stand',
    lowCeiling.end.stance === 1,
    `stance ${lowCeiling.end.stance}, clearance ${f(L.ceiling.clearance, 2)} m`,
  );
  below('  the eye stays crouched', lowCeiling.end.eyeHeight, T.crouchEye + 0.03, ' m');
  const clearCeiling = await drive('camera', [
    { crouch: true, frames: 120 },
    { frames: 240 },
  ]);
  ok('  and allows one in the open', clearCeiling.end.stance === 0);

  const proneUp = await drive('camera', [
    { prone: true, frames: 1 },
    { frames: 180 },
    { prone: true, frames: 1 },
    { frames: 240 },
  ]);
  ok('prone toggles back out', proneUp.end.stance !== 2, `stance ${proneUp.end.stance}`);
  near('  and the eye comes back up', proneUp.end.eyeHeight, T.standEye, 0.03, ' m');

  section('Lean');
  const leanOpen = await drive('lean', [{ lean: -1, frames: 180 }]);
  near('leaning into open air is unrestricted', Math.abs(leanOpen.end.lean), 1, 0.02);
  above('  and rolls the camera', Math.abs(leanOpen.camera.roll), T.leanRoll * 0.7, ' rad');
  const leanWall = await drive('lean', [{ lean: 1, frames: 180 }]);
  near(
    'a wall clamps the lean',
    Math.abs(leanWall.end.lean),
    L.lean.expected,
    0.06,
    ` (gap ${f(L.lean.gap, 2)} m)`,
  );
  below('  to less than the open lean', Math.abs(leanWall.end.lean), 0.95);
  const leanMoving = await drive('camera', [{ move: [0, 1], lean: 1, frames: 180 }]);
  near('leaning is suppressed while running', Math.abs(leanMoving.end.lean), 0, 0.02);
  const leanRelease = await drive('lean', [{ lean: -1, frames: 180 }, { frames: 300 }]);
  below('  and returns to centre when released', Math.abs(leanRelease.camera.roll), 1e-4, ' rad');

  /* ------------------------------- camera ------------------------------ */

  section('Camera limits');
  const extreme = await drive('camera', [
    { look: [0, 40], frames: 120, dt: h },
    { look: [40, 0], frames: 120, dt: h },
    { look: [-1e6, 1e6], frames: 60, dt: h },
  ]);
  below(
    'pitch never passes the limit under extreme look input',
    extreme.maxPitch,
    T.pitchLimit + 1e-6,
    ' rad',
  );
  near(
    '  and sits exactly on it when pinned',
    Math.abs(extreme.phases[0].endSnapshot.pitch),
    T.pitchLimit,
    1e-6,
    ' rad',
  );
  ok('  the transform stays finite', extreme.nonFinite === 0, `${extreme.nonFinite} bad frames`);
  note(
    `pitch limit ${f((T.pitchLimit * 180) / Math.PI, 2)} deg, ` +
      `peak seen ${f((extreme.maxPitch * 180) / Math.PI, 2)} deg`,
  );

  const rollStorm = await drive('camera', [
    { move: [1, 1], sprint: true, frames: 180, dt: h },
    { move: [-1, 1], sprint: true, frames: 60, dt: h },
    { move: [1, 0], lean: 1, frames: 60, dt: h },
    { frames: 600, dt: h },
  ]);
  above('roll is produced by strafing and leaning', rollStorm.maxRoll, 0.005, ' rad');
  below('  and returns to exactly zero', Math.abs(rollStorm.camera.roll), 1e-5, ' rad');
  below('  never accumulating a permanent tilt', Math.abs(rollStorm.camera.roll), 1e-5, ' rad');

  section('View bob and sway');
  const bobWalk = await drive('camera', [{ move: [0, 1], frames: 480, dt: h }]);
  const bobSprint = await drive('camera', [
    { move: [0, 1], sprint: true, frames: 480, dt: h },
  ]);
  const bobAds = await drive('camera', [
    { move: [0, 1], ads: true, frames: 480, dt: h },
  ]);
  above('walking bobs the camera', bobWalk.camHeightSpan, 0.004, ' m peak to peak');
  above('sprinting bobs it more', bobSprint.camHeightSpan, bobWalk.camHeightSpan, ' m');
  below(
    'the bob stays far below a nauseating amplitude',
    bobSprint.camHeightSpan,
    0.12,
    ' m peak to peak',
  );
  below(
    'aiming all but removes the bob',
    bobAds.maxBobAmp,
    bobWalk.maxBobAmp * (1 - T.bobAdsCut) + 0.05,
  );
  note(
    `camera height travel: walk ${f(bobWalk.camHeightSpan * 1000, 1)} mm, ` +
      `sprint ${f(bobSprint.camHeightSpan * 1000, 1)} mm, ADS ${f(bobAds.camHeightSpan * 1000, 1)} mm`,
  );

  // Bob is phase-locked to the stride, so footsteps must land at fixed
  // distances rather than at fixed times.
  const strideWalk = bobWalk.travel / bobWalk.events['player:footstep'];
  const strideSprint = bobSprint.travel / bobSprint.events['player:footstep'];
  near('footsteps are spaced by the walking stride', strideWalk, T.stepLengthWalk, 0.12, ' m');
  near('  and by the sprinting stride', strideSprint, T.stepLengthSprint, 0.15, ' m');
  ok(
    '  with the surface taken from the ground under foot',
    bobWalk.events.footstepSurfaceMetal === 1,
    `lane surface is ${L.surfaces.lane}`,
  );
  note(
    `stride: ${f(strideWalk)} m walking (${bobWalk.events['player:footstep']} steps in ` +
      `${f(bobWalk.travel)} m), ${f(strideSprint)} m sprinting`,
  );

  const stillSway = await drive('camera', [{ frames: 720, dt: h }]);
  above('breathing sways the view when standing still', stillSway.maxRoll, 0, ' rad');
  // Well inside the hold limit, so the measurement is of a held breath rather
  // than of one that was already forced out mid-run.
  const holdFrames = Math.floor((T.breathHoldMax * 0.6) / h);
  const heldBreath = await call(
    ([frames, dt]) => {
      window.__PLAYER_TEST__.reset('camera');
      const accepted = window.__PLAYER_TEST__.holdBreath(true);
      const res = window.__PLAYER_TEST__.run([{ ads: true, frames, dt }], {});
      return { accepted, res };
    },
    [holdFrames, h],
  );
  ok('the breath can be held', heldBreath.accepted === true);
  below(
    '  which steadies the sway',
    heldBreath.res.end.breath,
    T.breathHoldScale + 0.05,
    ' of the resting amplitude',
  );
  below('  and drains the reserve', heldBreath.res.end.breathReserve, 1);
  above('  but not all of it yet', heldBreath.res.end.breathReserve, 0);

  // Past the limit the breath is forced out, and cannot be taken straight back
  // — otherwise the key could be mashed to hold indefinitely.
  const forced = await call(
    ([spent, recover, dt]) => {
      window.__PLAYER_TEST__.reset('camera');
      window.__PLAYER_TEST__.holdBreath(true);
      window.__PLAYER_TEST__.run([{ frames: spent, dt }], {});
      const atExhale = window.__PLAYER_TEST__.snapshot();
      const immediately = window.__PLAYER_TEST__.holdBreath(true);
      window.__PLAYER_TEST__.run([{ frames: recover, dt }], {});
      return {
        atExhale,
        immediately,
        later: window.__PLAYER_TEST__.holdBreath(true),
        snap: window.__PLAYER_TEST__.snapshot(),
      };
    },
    [
      Math.ceil(T.breathHoldMax / h) + 2,
      Math.ceil((T.breathHoldMinReserve * T.breathHoldRecover) / h) + 8,
      h,
    ],
  );
  ok('the breath is forced out when it runs out', forced.atExhale.breathHeld === 0);
  near('  emptying the reserve', forced.atExhale.breathReserve, 0, 0.02);
  ok('  and cannot be taken straight back', forced.immediately === false);
  ok('  until the reserve recovers', forced.later === true, `reserve ${f(forced.snap.breathReserve)}`);
  note(
    `breath: ${f(T.breathHoldMax, 1)} s of hold, ${f(T.breathHoldRecover, 1)} s to refill, ` +
      `re-hold allowed from ${f(T.breathHoldMinReserve * 100, 0)}% reserve`,
  );

  section('Landing impact');
  const softLand = await drive('ledge', [
    { move: [0, 1], frames: 400, dt: h, until: 'airborne' },
    { frames: 400, dt: h, until: 'grounded' },
    { frames: 120, dt: h },
  ]);
  const hardLand = await call(
    ([sky, dt]) => {
      window.__PLAYER_TEST__.reset('runway');
      window.__PLAYER_TEST__.teleport(sky);
      return window.__PLAYER_TEST__.run(
        [
          { frames: 900, dt, until: 'grounded' },
          { frames: 240, dt },
        ],
        {},
      );
    },
    [L.spots.sky, h],
  );
  below('landing dips the camera', softLand.minLandDip, 0, ' m');
  below('  a hard landing dips it further', hardLand.minLandDip, softLand.minLandDip, ' m');
  near('  and the dip does not exceed the tuned maximum', Math.max(hardLand.minLandDip, -T.landDip * 1.6), hardLand.minLandDip, 1e-9, ' m');
  near('  the dip recovers', softLand.end.landDip, 0, 2e-3, ' m');
  above('  a hard landing punches the field of view', hardLand.maxFov, T.fov + 0.5, ' deg');
  above('  and hurts', L.dropHeight > 0 ? T.maxHealth - hardLand.end.health : 0, 0, ' damage');
  ok('  a soft landing does not', softLand.end.health === T.maxHealth);
  note(
    `landing from ${f(L.ledge.top - L.deckTop, 2)} m dipped ` +
      `${f(-softLand.minLandDip * 1000, 1)} mm; from ${f(L.dropHeight, 0)} m ` +
      `dipped ${f(-hardLand.minLandDip * 1000, 1)} mm, peak FOV ${f(hardLand.maxFov, 1)} deg, ` +
      `health ${f(hardLand.end.health, 0)}`,
  );

  section('Step-up smoothing');
  const stairs = await drive('stairs', [{ move: [0, 1], frames: 900, dt: h }], {
    trace: true,
  });
  near('the stairs are climbed', stairs.end.y, L.stairs.topY, 0.1, ' m');
  // Without smoothing, each tread would appear in the camera as a riser-sized
  // step in one frame.
  let worstCameraJump = 0;
  for (let i = 1; i < stairs.trace.length; i++) {
    const dy = Math.abs(stairs.trace[i][10] - stairs.trace[i - 1][10]);
    if (dy > worstCameraJump) worstCameraJump = dy;
  }
  below(
    'no single frame pops the camera by a whole riser',
    worstCameraJump,
    L.stairs.riser * 0.75,
    ' m',
  );
  note(
    `climbed ${L.stairs.steps} x ${f(L.stairs.riser, 2)} m risers; ` +
      `worst camera step ${f(worstCameraJump * 1000, 1)} mm`,
  );

  /* ------------------------- field of view, recoil ---------------------- */

  section('Field of view');
  const fovIdle = await drive('camera', [{ frames: 120 }]);
  near('the base field of view is the tuned one', fovIdle.camera.fov, T.fov, 0.05, ' deg');
  const fovSprint = await drive('camera', [
    { move: [0, 1], sprint: true, frames: 480 },
  ]);
  near(
    'sprinting kicks it out',
    fovSprint.camera.fov,
    T.fov + T.sprintFovKick,
    0.3,
    ' deg',
  );
  const fovTactical = await drive('camera', [
    { move: [0, 1], sprint: true, frames: 1 },
    { move: [0, 1], sprint: false, frames: 1 },
    { move: [0, 1], sprint: true, frames: 480 },
  ]);
  near(
    'tactical sprint kicks it further',
    fovTactical.camera.fov,
    T.fov + T.sprintFovKick + T.tacticalFovKick,
    0.3,
    ' deg',
  );
  const fovRequest = await call(
    ([frames, target]) => {
      window.__PLAYER_TEST__.reset('camera');
      window.__PLAYER_TEST__.requestFov(target, 0.15);
      return window.__PLAYER_TEST__.run([{ frames }], {});
    },
    [120, 55],
  );
  near('a weapon can request a field of view', fovRequest.camera.fov, 55, 0.3, ' deg');
  const fovRelease = await call(
    ([frames, base]) => {
      window.__PLAYER_TEST__.reset('camera');
      window.__PLAYER_TEST__.requestFov(55, 0.05);
      window.__PLAYER_TEST__.run([{ frames: 30 }], {});
      window.__PLAYER_TEST__.requestFov(base, 0.05);
      return window.__PLAYER_TEST__.run([{ frames }], {});
    },
    [120, T.fov],
  );
  near('  and release it', fovRelease.camera.fov, T.fov, 0.1, ' deg');

  section('Recoil');
  const kickPitch = 0.12;
  const recoil = await call(
    ([pitch, yaw, settleFrames]) => {
      window.__PLAYER_TEST__.reset('camera');
      const before = window.__PLAYER_TEST__.snapshot();
      window.__PLAYER_TEST__.kick(pitch, yaw);
      const peak = window.__PLAYER_TEST__.run([{ frames: 12 }], {});
      const after = window.__PLAYER_TEST__.run([{ frames: settleFrames }], {});
      return { before, peak, after };
    },
    [kickPitch, 0.03, 600],
  );
  above('a kick moves the view up', recoil.peak.maxRecoilPitch, kickPitch * 0.3, ' rad');
  near(
    'the view recovers to all but the permanent share',
    recoil.after.end.pitch - recoil.before.pitch,
    kickPitch * (1 - T.recoilRecovered),
    1e-4,
    ' rad',
  );
  above(
    '  so a burst climbs',
    recoil.after.end.pitch - recoil.before.pitch,
    0,
    ' rad of permanent aim change',
  );
  near('  and the transient part is gone', recoil.after.end.recoilPitch, 0, 1e-3, ' rad');
  note(
    `${f(T.recoilRecovered * 100, 0)}% of a ${f(kickPitch)} rad kick springs back, ` +
      `leaving ${f(kickPitch * (1 - T.recoilRecovered), 4)} rad of aim change`,
  );

  const burst = await call(
    ([pitch, shots]) => {
      window.__PLAYER_TEST__.reset('camera');
      const before = window.__PLAYER_TEST__.snapshot();
      for (let i = 0; i < shots; i++) {
        window.__PLAYER_TEST__.kick(pitch, 0);
        window.__PLAYER_TEST__.run([{ frames: 8 }], {});
      }
      const after = window.__PLAYER_TEST__.run([{ frames: 600 }], {});
      return { before, after, shots };
    },
    [kickPitch, 10],
  );
  near(
    'ten rounds leave ten rounds of climb',
    burst.after.end.pitch - burst.before.pitch,
    kickPitch * (1 - T.recoilRecovered) * burst.shots,
    1e-3,
    ' rad',
  );

  section('Camera shake');
  const shakeNear = await call(
    ([amp, dur]) => {
      window.__PLAYER_TEST__.reset('camera');
      window.__PLAYER_TEST__.shake(amp, dur, 12);
      return window.__PLAYER_TEST__.run([{ frames: 40 }], {});
    },
    [0.5, 0.6],
  );
  above('a shake rotates the camera', shakeNear.maxRoll, 0.002, ' rad');
  const shakeSettled = await call(
    ([amp, dur, frames]) => {
      window.__PLAYER_TEST__.reset('camera');
      window.__PLAYER_TEST__.shake(amp, dur, 12);
      return window.__PLAYER_TEST__.run([{ frames }], {});
    },
    [0.5, 0.6, 400],
  );
  below('  and decays to nothing', Math.abs(shakeSettled.camera.roll), 1e-5, ' rad');
  const shakeFar = await call(
    ([amp, dur, at, radius]) => {
      window.__PLAYER_TEST__.reset('camera');
      const eye = window.__PLAYER_TEST__.camera().position;
      window.__PLAYER_TEST__.shake(amp, dur, 12, [eye[0], eye[1], eye[2] + at], radius);
      return window.__PLAYER_TEST__.run([{ frames: 40 }], {});
    },
    [0.5, 0.6, 14, 20],
  );
  below('  attenuates with distance', shakeFar.maxRoll, shakeNear.maxRoll * 0.8, ' rad');
  const shakeOut = await call(
    ([amp, dur, at, radius]) => {
      window.__PLAYER_TEST__.reset('camera');
      const eye = window.__PLAYER_TEST__.camera().position;
      window.__PLAYER_TEST__.shake(amp, dur, 12, [eye[0], eye[1], eye[2] + at], radius);
      return window.__PLAYER_TEST__.run([{ frames: 40 }], {});
    },
    [0.5, 0.6, 30, 20],
  );
  const idleRoll = (await drive('camera', [{ frames: 40 }])).maxRoll;
  below('  and is silent beyond its radius', shakeOut.maxRoll, idleRoll + 1e-9, ' rad');
  note(
    `shake is applied as ${f(T.shakeRotPerMeter)} rad of rotation and only ` +
      `${f(T.shakeTransScale)} m of translation per metre of amplitude`,
  );

  /* ------------------------------- health ------------------------------ */

  section('Health');
  const hurt = await call(
    ([amount]) => {
      window.__PLAYER_TEST__.reset('camera');
      const before = window.__PLAYER_TEST__.snapshot();
      const after = window.__PLAYER_TEST__.hurt(amount);
      const events = window.__PLAYER_TEST__.events();
      const settled = window.__PLAYER_TEST__.run([{ frames: 60 }], {});
      return { before, after, events, settled };
    },
    [40],
  );
  near('damage subtracts health', hurt.after.health, T.maxHealth - 40, 1e-6);
  ok('  and is announced', hurt.events['player:damage'] === 1);
  above('  with a camera kick away from it', hurt.settled.maxRecoilPitch, 0, ' rad');

  const regen = await call(
    ([amount, delayFrames, healFrames]) => {
      window.__PLAYER_TEST__.reset('camera');
      window.__PLAYER_TEST__.hurt(amount);
      const waiting = window.__PLAYER_TEST__.run([{ frames: delayFrames }], {});
      const healed = window.__PLAYER_TEST__.run([{ frames: healFrames }], {});
      return { waiting, healed };
    },
    [40, Math.floor((T.regenDelay - 0.2) / h), Math.ceil((40 / T.regenRate + 0.4) / h)],
  );
  near(
    'regeneration waits out the delay',
    regen.waiting.end.health,
    T.maxHealth - 40,
    1e-6,
  );
  near('  then heals back to full', regen.healed.end.health, T.maxHealth, 1e-6);
  ok('  and reports the healing', regen.healed.events['player:heal'] >= 1);
  note(
    `${f(T.regenDelay)} s delay then ${f(T.regenRate, 0)} health/s: ` +
      `40 damage costs ${f(T.regenDelay + 40 / T.regenRate)} s`,
  );

  const death = await call(
    ([amount]) => {
      window.__PLAYER_TEST__.reset('camera');
      const dead = window.__PLAYER_TEST__.hurt(amount);
      const events = window.__PLAYER_TEST__.events();
      const after = window.__PLAYER_TEST__.run([{ frames: 240 }], {});
      const respawned = window.__PLAYER_TEST__.reset('camera');
      return { dead, events, after, respawned };
    },
    [500],
  );
  ok('lethal damage kills', death.dead.alive === 0 && death.dead.health === 0);
  ok('  and is announced', death.events['player:death'] === 1);
  below('  the death camera falls', death.after.end.eyeHeight, T.crouchEye, ' m');
  above('  and rolls over', Math.abs(death.after.camera.roll), T.deathRoll * 0.5, ' rad');
  ok('  the transform stays finite', death.after.nonFinite === 0);
  ok(
    'respawning restores the player',
    death.respawned.alive === 1 && death.respawned.health === T.maxHealth,
  );

  const teleported = await call(
    ([spot]) => {
      window.__PLAYER_TEST__.reset('camera');
      return window.__PLAYER_TEST__.teleport(spot, 1.5);
    },
    [L.spots.stairs],
  );
  near('teleport places the player', teleported.x, L.spots.stairs[0], 0.05, ' m');
  near('  facing where asked', teleported.yaw, 1.5, 1e-6, ' rad');
  below('  with no leftover velocity', teleported.speed, 1e-6, ' m/s');

  /* ------------------------- harness cooperation ----------------------- */

  section('Harness cooperation');
  const posed = await call(() => {
    const hooks = window.__PLAYER_TEST__;
    hooks.reset('camera');
    const game = window.__GAME__;
    const player = game.engine.get('player');
    // Exactly what main.ts does when it poses a shot.
    player.enabled = false;
    game.engine.camera.position.set(1, 2, 3);
    game.engine.camera.rotation.set(0.25, 0.5, 0);
    game.engine.camera.updateMatrixWorld(true);
    hooks.run([{ move: [0, 1], sprint: true, frames: 60 }], {});
    const cam = hooks.camera();
    player.enabled = true;
    const resumed = hooks.run([{ frames: 4 }], {});
    return { cam, resumed };
  });
  near('a disabled controller does not touch the camera', posed.cam.position[0], 1, 1e-9, ' m');
  near('  nor its rotation', posed.cam.pitch, 0.25, 1e-6, ' rad');
  near(
    're-enabling adopts the posed aim instead of snapping',
    posed.resumed.end.yaw,
    0.5,
    1e-6,
    ' rad',
  );

  const frozen = await call(() => {
    const hooks = window.__PLAYER_TEST__;
    hooks.reset('camera');
    const player = window.__GAME__.engine.get('player');
    player.setFrozen(true);
    const before = hooks.camera();
    const res = hooks.run([{ move: [0, 1], sprint: true, jump: true, frames: 120 }], {});
    const after = hooks.camera();
    player.setFrozen(false);
    return { before, after, res };
  });
  near('a frozen controller does not move', frozen.res.end.speed, 0, 1e-9, ' m/s');
  near('  nor touch the camera', frozen.after.position[1], frozen.before.position[1], 1e-9, ' m');

  /* -------------------------------- fuzz ------------------------------- */

  section(`NaN fuzz (${OPTS.fuzzFrames} frames of randomised abuse)`);
  const fuzz = await call(
    ([frames, seed]) => window.__PLAYER_TEST__.fuzz(frames, seed),
    [OPTS.fuzzFrames, OPTS.seed],
  );
  ok(
    'no NaN reaches the camera transform',
    fuzz.nonFiniteFrames === 0,
    fuzz.nonFiniteFrames === 0
      ? `${fuzz.frames} frames clean`
      : `${fuzz.nonFiniteFrames} bad frames, first at ${fuzz.firstBad}`,
  );
  below(
    '  pitch stays inside the limit throughout',
    fuzz.maxElevation,
    T.pitchLimit + 1e-6,
    ' rad',
  );
  below('  roll stays bounded', fuzz.maxRoll, 1.6, ' rad');
  within('  the field of view stays sane', fuzz.minFov, 20, 130, ' deg');
  within('  at both ends', fuzz.maxFov, 20, 130, ' deg');
  below('  speed never runs away', fuzz.maxSpeed, T.slideMaxSpeed * 3, ' m/s');
  ok('  and the rig still composes afterwards', fuzz.endFinite);
  below('  with the roll back at zero', fuzz.settledRoll, 1e-4, ' rad');
  note(
    `${fuzz.frames} frames (${f(fuzz.seconds, 1)} simulated seconds) of random input, ` +
      `garbage look deltas, infinite recoil, negative fields of view, NaN frame times, ` +
      `${fuzz.deaths} deaths and ${fuzz.respawns} respawns; ` +
      `${fuzz.sanitisedFrames} frames needed the rig's NaN scrub`,
  );

  section('Allocation');
  const alloc = await call((frames) => window.__PLAYER_TEST__.alloc(frames), 6000);
  if (!alloc.supported) {
    note('heap measurement unavailable (needs --expose-gc and performance.memory)');
  } else {
    below(
      'the movement loop does not allocate per frame',
      alloc.bytesPerFrame,
      64,
      ' bytes/frame',
    );
    note(
      `${alloc.frames} fixed steps grew the heap by ` +
        `${f((alloc.after - alloc.before) / 1024, 1)} KiB ` +
        `(${f(alloc.bytesPerFrame, 1)} bytes/frame)`,
    );
  }

  /* --------------------------- frame-rate parity ----------------------- */

  section('Frame-rate independence');
  const parityPlan = [
    { move: [0, 1], sprint: true, frames: 0 },
    { move: [0, 1], sprint: true, jump: true, frames: 1 },
    { move: [0, 1], sprint: true, frames: 0 },
    { move: [0, 1], sprint: true, crouch: true, frames: 0 },
  ];
  const parity = [];
  for (const fps of [30, 60, 120, 240]) {
    const dt = 1 / fps;
    const plan = parityPlan.map((p, i) => ({
      ...p,
      dt,
      // Same wall-clock durations at every frame rate.
      frames: Math.round([1.6, 1 / fps === dt ? 1 : 1, 1.2, 1.4][i] / dt) || 1,
    }));
    plan[1].frames = 1;
    const res = await drive('slide', plan);
    parity.push({ fps, y: res.maxY, travel: res.travel, speed: res.end.speed });
  }
  const apexSpread =
    Math.max(...parity.map((p) => p.y)) - Math.min(...parity.map((p) => p.y));
  const travelSpread =
    Math.max(...parity.map((p) => p.travel)) - Math.min(...parity.map((p) => p.travel));
  below('the jump apex is identical at 30 and 240 fps', apexSpread, 0.02, ' m spread');
  below('  and so is the distance covered', travelSpread, 0.35, ' m spread');
  note(
    parity
      .map((p) => `${p.fps} fps: peak y ${f(p.y, 3)}, travel ${f(p.travel, 2)} m`)
      .join('; '),
  );

  /* ----------------------------- screenshots --------------------------- */

  if (OPTS.shots) {
    section('Screenshots');
    const dir = String(OPTS.shots);
    mkdirSync(dir, { recursive: true });
    const poses = [
      ['idle', { frames: 30 }],
      ['sprint', { move: [0, 1], sprint: true, frames: 200 }],
      ['ads', { move: [0, 1], ads: true, frames: 120 }],
      ['crouch', { crouch: true, frames: 120 }],
    ];
    // Software rasterisation makes a single frame take tens of seconds, so a
    // capture that gives up is reported and skipped rather than allowed to take
    // the numeric suite with it. The numbers are the test; these are for eyes.
    for (const [name, phase] of poses) {
      try {
        await call(
          ([spot, p]) => {
            window.__PLAYER_TEST__.reset(spot);
            window.__PLAYER_TEST__.run([p], {});
            window.__PLAYER_TEST__.hold(p);
          },
          ['camera', phase],
        );
        // Render through the engine so the post chain runs.
        await call(() => window.__GAME__.stepFrames(2));
        await page.screenshot({ path: `${dir}/player_${name}.jpg`, quality: 80 });
        console.log(`  wrote ${dir}/player_${name}.jpg`);
      } catch (err) {
        note(`skipped ${name}: ${err.message.split('\n')[0]}`);
      }
    }
    await call(() => window.__PLAYER_TEST__.release()).catch(() => {});
  }

  /* -------------------------------- done ------------------------------- */

  const httpErrors = logs.filter((l) => l.startsWith('[http ') && !l.includes('favicon'));
  const errors = logs.filter(
    (l) =>
      (l.startsWith('[error]') && !l.includes('Failed to load resource')) ||
      l.startsWith('[pageerror]'),
  );
  // Other systems are built concurrently and this suite loads the whole engine,
  // so an error from the world or the material library is reported but is not
  // this suite's to fail on. Anything the player controller says is.
  const OURS = /player|camera|\bPlayerSystem\b|CameraRig|Mantle/i;
  const mine = errors.filter((l) => OURS.test(l));
  const theirs = errors.filter((l) => !OURS.test(l));
  section('Console');
  ok('no console errors from the player controller', mine.length === 0, `${mine.length} errors`);
  if (mine.length) for (const e of mine.slice(0, 10)) console.log('    ', e);
  ok('no failed requests', httpErrors.length === 0, httpErrors.slice(0, 3).join(' '));
  if (theirs.length) {
    note(`${theirs.length} error(s) from other systems, not this suite's to judge:`);
    for (const e of theirs.slice(0, 6)) console.log('    ', e);
  }
  const warned = logs.filter((l) => l.includes('non-finite state recovered')).length;
  note(`${warned} non-finite recoveries logged by the controller`);

  await browser.close();

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const fail of failures) console.log('  -', fail);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
