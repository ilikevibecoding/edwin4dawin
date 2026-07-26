#!/usr/bin/env node
/**
 * Headless numeric tests for the physics system.
 *
 * Loads the physics playground in the same headless Chrome configuration the
 * screenshot harness uses, then drives the character controller, the rigid body
 * solver and the raycaster through `window.__PHYS__` and asserts against the
 * course layout the playground publishes. Nothing here hard-codes a coordinate:
 * every expectation is derived from `__PHYS__.layout`, which is built from the
 * same constants as the geometry.
 *
 * Usage:
 *   node tools/physics-test.mjs
 *   node tools/physics-test.mjs --url http://127.0.0.1:5173/ --verbose
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const OPTS = {
  url: String(arg('url', 'http://127.0.0.1:5173/')),
  timeout: Number(arg('timeout', 300000)),
  bootTimeout: Number(arg('boot-timeout', 120000)),
  verbose: !!arg('verbose', false),
  bench: arg('bench', true) !== 'false',
};

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
if (!CHROME) {
  console.error('No Chrome binary found.');
  process.exit(1);
}

// Identical to tools/capture.mjs, so physics runs under the same conditions.
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

function ok(label, condition, detail) {
  record(!!condition, label, detail);
}

function near(label, actual, expected, tolerance, unit = '') {
  const detail = `got ${f(actual)}${unit}, want ${f(expected)}${unit} +/- ${f(tolerance)}`;
  if (typeof actual !== 'number' || !Number.isFinite(actual)) {
    record(false, label, `got ${String(actual)}, want ${f(expected)}${unit}`);
    return Infinity;
  }
  const delta = Math.abs(actual - expected);
  record(delta <= tolerance, label, detail);
  return delta;
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
  // A bare "failed to load resource" console line is useless without the URL.
  page.on('response', (res) => {
    if (res.status() >= 400) logs.push(`[http ${res.status()}] ${res.url()}`);
  });

  const url = new URL(OPTS.url);
  url.searchParams.set('showcase', 'physics');
  // Capture mode pauses the engine, so the simulation only advances when a test
  // asks it to.
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
    await page.waitForFunction(() => window.__GAME__?.ready === true && !!window.__PHYS__, {
      timeout: OPTS.bootTimeout,
      polling: 200,
    });
  } catch {
    console.error('Playground never came up. Recent console output:');
    for (const l of logs.slice(-40)) console.error('   ', l);
    await browser.close();
    process.exit(1);
  }

  const layout = await page.evaluate(() => window.__PHYS__.layout);
  const stats = await page.evaluate(() => window.__PHYS__.stats());
  console.log(
    `Course ready: ${stats.triangles} static triangles in ${stats.colliders} colliders, ` +
      `bake ${f(stats.buildMs, 1)} ms`,
  );
  // Keep the demo walker out of the way; it shares the controller.
  await page.evaluate(() => window.__PHYS__.freezeWalker(true));

  const call = (fn, ...args) => page.evaluate(fn, ...args);

  /* ----------------------------- raycasting ---------------------------- */

  section('Raycasting');
  above('static tree has a realistic triangle count', stats.triangles, 20000, ' tris');

  const target = layout.rayTarget;
  const hit = await call(
    ([o, d, max]) => window.__PHYS__.ray(o, d, max),
    [target.origin, target.dir, 40],
  );
  ok('ray at the known box hits', !!hit);
  if (hit) {
    near('  distance', hit.distance, target.distance, 1e-3, ' m');
    near('  normal.z', hit.normal[2], target.normal[2], 1e-4);
    near('  normal.x', hit.normal[0], 0, 1e-4);
    near('  normal.y', hit.normal[1], 0, 1e-4);
    ok('  surface', hit.surface === target.surface, `got "${hit.surface}"`);
    ok('  object', hit.object === 'ray-target', `got "${hit.object}"`);
    near('  point.z', hit.point[2], target.center[2] + target.half, 1e-3, ' m');
    near('  penetration metadata', hit.penetration, 0.12, 1e-6, ' m');
    near('  damageScale metadata', hit.damageScale, 1.5, 1e-6);
  }

  const all = await call(
    ([o, d, max]) => window.__PHYS__.rayAll(o, d, max),
    [target.origin, target.dir, target.exitDistance + 1],
  );
  ok('raycastAll returns entry and exit faces', all.length === 2, `${all.length} hits`);
  if (all.length >= 2) {
    near('  first hit distance', all[0].distance, target.distance, 1e-3, ' m');
    near('  last hit distance', all[all.length - 1].distance, target.exitDistance, 1e-3, ' m');
    let sorted = true;
    for (let i = 1; i < all.length; i++) if (all[i].distance < all[i - 1].distance) sorted = false;
    ok('  sorted near to far', sorted);
  }

  const panels = layout.panels;
  const lastPanel = panels.expect[panels.expect.length - 1];
  const stack = await call(
    ([o, d, max]) => window.__PHYS__.rayAll(o, d, max),
    [panels.origin, panels.dir, lastPanel.back + 0.5],
  );
  const expectedFaces = panels.expect.length * 2;
  ok(
    'penetration trace crosses every panel',
    stack.length === expectedFaces,
    `${stack.length} faces, want ${expectedFaces}: ` +
      stack.map((h) => `${h.object}@${f(h.distance, 2)}`).join(' '),
  );
  if (stack.length === expectedFaces) {
    let worst = 0;
    let surfacesOk = true;
    panels.expect.forEach((p, i) => {
      worst = Math.max(
        worst,
        Math.abs(stack[i * 2].distance - p.front),
        Math.abs(stack[i * 2 + 1].distance - p.back),
      );
      if (stack[i * 2].surface !== p.surface) surfacesOk = false;
    });
    below('  face distances', worst, 2e-3, ' m error');
    ok('  surfaces in order', surfacesOk, stack.map((h) => h.surface).join(','));
  }

  const bvh = await call((n) => window.__PHYS__.bvhAgrees(n), 1500);
  ok(
    'BVH agrees with a brute-force scan',
    bvh.mismatches === 0,
    `${bvh.tested} rays, ${bvh.mismatches} mismatches, worst delta ${f(bvh.worstDelta, 6)} m`,
  );

  // Glass must not break line of sight, but steel must.
  const glassZ = panels.origin[2] - panels.expect[1].front;
  const steelZ = panels.origin[2] - panels.expect[2].front;
  const eye = [panels.origin[0], panels.origin[1], glassZ + 1];
  ok(
    'line of sight passes through glass',
    await call(([a, b]) => window.__PHYS__.los(a, b), [eye, [eye[0], eye[1], glassZ - 0.5]]),
  );
  ok(
    'line of sight is blocked by steel',
    !(await call(([a, b]) => window.__PHYS__.los(a, b), [eye, [eye[0], eye[1], steelZ - 0.5]])),
  );

  const gh = await call(([x, z]) => window.__PHYS__.groundHeight(x, z), [
    layout.drop.start[0],
    layout.drop.start[2],
  ]);
  near('groundHeight on the deck', gh, layout.deckTop, 1e-3, ' m');
  const ghUpper = await call(([x, z]) => window.__PHYS__.groundHeight(x, z), [
    layout.stairs[0].start[0],
    layout.origin[2] - 11.5,
  ]);
  near('groundHeight on the platform', ghUpper, layout.upperTop, 1e-3, ' m');

  // Every tread seam is on a round coordinate, so a downward ray lands exactly
  // in the plane two treads share. That has to hit one of them: a slab test
  // that folds `0 * Infinity` into a NaN drops the whole flight and reports the
  // deck a metre below, which would put footsteps and spawns inside the stairs.
  const flight = layout.stairs[1];
  const seams = await call(
    ([x, front, run, steps]) => {
      const out = [];
      for (let i = 1; i < steps; i++) out.push(window.__PHYS__.groundHeight(x, front - run * i));
      return out;
    },
    [flight.start[0], flight.start[2] - 1.6, flight.run, flight.steps],
  );
  const seamWant = seams.map((_, i) => layout.deckTop + flight.riser * (i + 1));
  ok(
    'ground queries land on the tread at every seam',
    seams.every((y, i) => y !== null && Math.abs(y - seamWant[i]) < 1e-3),
    seams.map((y, i) => `${f(y ?? NaN)}/${f(seamWant[i])}`).join(' '),
  );

  const sphere = await call(
    ([o, d, r, max]) => window.__PHYS__.sphere(o, d, r, max),
    [target.origin, target.dir, 0.25, 40],
  );
  ok('sphereCast hits the box', !!sphere);
  if (sphere) near('  stand-off distance', sphere.distance, target.distance - 0.25, 0.02, ' m');

  const capsuleCast = await call(
    ([o, d, r, h, max]) => window.__PHYS__.capsule(o, d, r, h, max),
    [[target.origin[0], target.origin[1] - 0.5, target.origin[2]], target.dir, 0.4, 1.8, 40],
  );
  ok('capsuleCast hits the box', !!capsuleCast);
  if (capsuleCast) {
    near('  stand-off distance', capsuleCast.distance, target.distance - 0.4, 0.05, ' m');
  }

  /* ------------------------- capsule settling -------------------------- */

  section('Capsule settling');
  const drop = await call(
    (o) => window.__PHYS__.walk(o),
    { start: layout.drop.start, speed: 0, steps: 180, tail: 40 },
  );
  near('dropped capsule rests on the floor', drop.position[1], layout.drop.restY, 0.01, ' m');
  ok('  grounded', drop.grounded);
  below('  resting speed', Math.abs(drop.velocity[1]), 1e-3, ' m/s');
  below('  resting jitter over 40 frames', drop.tailYSpread, 1e-4, ' m');
  below('  speed over 40 frames', drop.tailSpeed, 1e-3, ' m/s');
  near('  ground normal is up', drop.groundNormal[1], 1, 1e-4);
  near('  slope', drop.slopeDeg, 0, 0.05, ' deg');
  ok('  ground surface', drop.groundSurface === 'concrete', `got "${drop.groundSurface}"`);

  const onLedge = await call((o) => window.__PHYS__.walk(o), {
    start: [layout.ledge.walkOff[0], layout.ledge.top + 1.5, layout.ledge.walkOff[2]],
    speed: 0,
    steps: 150,
  });
  near('capsule dropped on the ledge rests on top of it', onLedge.position[1], layout.ledge.top, 0.01, ' m');

  /* ---------------------------- wall sliding --------------------------- */

  section('Wall sliding');
  const slide = await call((o) => window.__PHYS__.walk(o), {
    start: layout.slideWall.start,
    dir: layout.slideWall.dir,
    speed: 4,
    steps: 150,
  });
  const stopZ = layout.slideWall.faceZ - layout.capsule.radius;
  within('capsule stops against the wall', slide.position[2], stopZ - 0.05, stopZ + 0.02, ' m');
  below('  did not tunnel through', slide.position[2], layout.slideWall.backZ, ' m');
  above('  slid along the wall', slide.position[0] - layout.slideWall.start[0], 3, ' m');
  ok('  reported a wall contact', slide.hitWall || slide.wallFrames > 0, `${slide.wallFrames} frames`);
  ok('  stayed grounded', slide.groundedFrames > slide.frames * 0.95, `${slide.groundedFrames}/${slide.frames}`);

  // One 3.3 m step straight into a 0.4 m wall: without a swept test this
  // tunnels straight through.
  const fast = await call((o) => window.__PHYS__.walk(o), {
    start: [layout.slideWall.start[0], layout.slideWall.start[1], layout.slideWall.faceZ - 4],
    dir: [0, 1],
    speed: 200,
    steps: 3,
    tail: 1,
  });
  below('200 m/s into the wall does not tunnel', fast.position[2], layout.slideWall.faceZ, ' m');

  /* ------------------------------- stairs ------------------------------ */

  section('Stairs');
  for (const flight of layout.stairs) {
    // Steer for the approach, the flight and a couple of metres of platform,
    // then stand: the climb is measured settled at the top rather than
    // mid-stride off the far edge.
    const run = await call((o) => window.__PHYS__.walk(o), {
      start: flight.start,
      dir: flight.dir,
      speed: 3,
      steps: 260,
      maxTravel: 1.6 + flight.run * flight.steps + 2,
    });
    const climbable = flight.riser <= layout.capsule.stepHeight;
    if (climbable) {
      near(
        `${flight.riser.toFixed(2)} m risers are climbed`,
        run.position[1],
        flight.topY,
        0.05,
        ' m',
      );
      ok('  grounded at the top', run.grounded);
      below('  step-up lift per frame stayed sane', run.maxStepUp, flight.riser + 0.06, ' m');
    } else {
      below(
        `${flight.riser.toFixed(2)} m risers are not climbed`,
        run.position[1] - layout.deckTop,
        0.05,
        ' m',
      );
      ok('  blocked by the riser', run.hitWall || run.wallFrames > 0, `${run.wallFrames} frames`);
    }
  }

  const stair030 = layout.stairs.find((s) => Math.abs(s.riser - 0.3) < 1e-6);
  const descend = await call(
    ([o, topY]) =>
      window.__PHYS__.walk({
        start: [o[0], topY, o[1]],
        dir: [0, 1],
        speed: 3,
        steps: 150,
        path: true,
      }),
    [[stair030.start[0], layout.origin[2] - 10.5], stair030.topY],
  );
  near('walked back down the 0.30 m flight', descend.position[1], layout.deckTop, 0.02, ' m');
  above(
    '  stayed glued to the treads on the way down',
    descend.groundedFrames / descend.frames,
    0.9,
    ' grounded fraction',
  );
  const airborne = descend.path ? descend.path.filter((p) => p[1] > stair030.topY + 0.02).length : 0;
  ok('  never launched off a tread', airborne === 0, `${airborne} samples above the flight`);

  /* -------------------------------- ramps ------------------------------ */

  section('Ramps');
  for (const ramp of layout.ramps) {
    const probe = await call((o) => window.__PHYS__.walk(o), {
      start: ramp.mid,
      speed: 0,
      steps: 4,
      dt: 1 / 240,
      tail: 1,
    });
    near(`${ramp.deg} deg ramp reports its slope`, probe.slopeDeg, ramp.deg, 1.5, ' deg');

    const climb = await call((o) => window.__PHYS__.walk(o), {
      start: ramp.start,
      dir: ramp.dir,
      speed: 3,
      steps: 420,
      maxTravel: 1.2 + ramp.run + 2,
    });
    if (ramp.deg <= 35) {
      near(`  ${ramp.deg} deg ramp is ascended`, climb.position[1], ramp.topY, 0.06, ' m');
    } else if (ramp.deg >= 65) {
      below(`  ${ramp.deg} deg ramp cannot be ascended`, climb.gainY, 0.15, ' m');
      below('  no meaningful progress up the slope', climb.maxY - layout.deckTop, 0.2, ' m');
    } else {
      // 50 degrees sits exactly on the walk limit; report, do not assert.
      console.log(
        `  NOTE  ${ramp.deg} deg ramp gained ${f(climb.gainY)} m ` +
          `(limit is ${layout.maxSlopeDeg} deg, so this is the boundary case)`,
      );
    }
  }

  /* ------------------------------- doorway ----------------------------- */

  section('Doorway and ceilings');
  const through = await call((o) => window.__PHYS__.walk(o), {
    start: layout.door.approach,
    dir: layout.door.dir,
    speed: 3,
    steps: 180,
  });
  below('walked through the 1.10 m doorway', through.position[2], layout.door.beyond, ' m');
  near('  stayed centred in the gap', through.position[0], layout.door.approach[0], 0.12, ' m');
  ok('  did not clip the lintel', !through.hitCeiling);

  const jump = await call((o) => window.__PHYS__.walk(o), {
    start: layout.door.inside,
    speed: 0,
    jump: 6,
    steps: 90,
  });
  ok('jumping into the lintel is cancelled', jump.ceilingFrames > 0, `${jump.ceilingFrames} frames`);
  below(
    '  head stayed under the lintel',
    jump.maxY + layout.capsule.height,
    layout.door.lintel + layout.origin[1] + 0.02,
    ' m',
  );
  near('  landed back on the deck', jump.position[1], layout.deckTop, 0.01, ' m');

  /* -------------------------------- ledge ------------------------------ */

  section('Ledge');
  const walkOff = await call((o) => window.__PHYS__.walk(o), {
    start: layout.ledge.walkOff,
    dir: [0, 1],
    speed: 3,
    steps: 180,
  });
  near('walked off the ledge and landed on the deck', walkOff.position[1], layout.deckTop, 0.01, ' m');
  above('  cleared the ledge edge', walkOff.position[2], layout.ledge.edgeZ, ' m');
  ok('  grounded on landing', walkOff.grounded);

  const blocked = await call((o) => window.__PHYS__.walk(o), {
    start: layout.ledge.approach,
    dir: [0, -1],
    speed: 3,
    steps: 150,
  });
  below('a 1.2 m ledge cannot be stepped up', blocked.position[1] - layout.deckTop, 0.05, ' m');
  ok('  blocked by the face', blocked.hitWall || blocked.wallFrames > 0, `${blocked.wallFrames} frames`);

  /* ------------------------------- bodies ------------------------------ */

  section('Rigid bodies');
  const spawned = await call((n) => window.__PHYS__.dropBoxes({ count: n, spin: true }), 200);
  ok('spawned a pile of boxes', spawned === 200, `${spawned} bodies`);
  await call((s) => window.__PHYS__.stepBodies(s), 5);
  const afterFive = await call(() => window.__PHYS__.bodyStats());
  ok(
    '200 boxes are all asleep after 5 s',
    afterFive.asleep === afterFive.count && afterFive.count === 200,
    `${afterFive.asleep}/${afterFive.count} asleep, max speed ${f(afterFive.maxSpeed)} m/s`,
  );
  ok('  none sank through the floor', afterFive.belowFloor === 0, `${afterFive.belowFloor} below`);
  above('  pile rests on the deck', afterFive.minY, layout.pile.floorY - 0.02, ' m');
  above('  pile stacked up', afterFive.maxY, layout.pile.floorY + layout.pile.boxSize * 0.5, ' m');

  const debrisNames = await call(
    ([c, r]) => window.__PHYS__.overlap(c, r),
    [[layout.pile.center[0], layout.pile.floorY + 0.3, layout.pile.center[2]], 4],
  );
  ok(
    'overlapSphere reaches the debris pool',
    debrisNames.includes('phys-debris'),
    debrisNames.slice(0, 4).join(','),
  );

  const woken = await call(
    ([c, r, force]) => {
      window.__PHYS__.explode(c, r, force);
      return window.__PHYS__.bodyStats();
    },
    [[layout.pile.center[0], layout.pile.floorY + 0.3, layout.pile.center[2]], 6, 900],
  );
  above('an explosion wakes the pile', woken.awake, 20, ' bodies');
  above('  and throws it', woken.maxSpeed, 2, ' m/s');
  // Long enough for the highest arc the blast clamp allows, plus a landing, plus
  // time for a shard that lands in a gap between two ramps to work its way out.
  await call((s) => window.__PHYS__.stepBodies(s), 18);
  const resettled = await call(() => window.__PHYS__.bodyStats());
  ok(
    '  pile settles again',
    resettled.asleep === resettled.count,
    `${resettled.asleep}/${resettled.count} asleep, max speed ${f(resettled.maxSpeed)} m/s`,
  );
  const propNames = await call(
    ([c, r]) => window.__PHYS__.overlap(c, r),
    [target.center, 2],
  );
  ok(
    'overlapSphere finds a breakable prop for blast damage',
    propNames.includes('ray-target'),
    propNames.join(',') || 'nothing',
  );
  const farNames = await call(
    ([c, r]) => window.__PHYS__.overlap(c, r),
    [[target.center[0], target.center[1] + 60, target.center[2]], 3],
  );
  ok('overlapSphere finds nothing in empty air', farNames.length === 0, `${farNames.length} objects`);

  /* ---------------------------- performance ---------------------------- */

  if (OPTS.bench) {
    section('Performance (SwiftShader CPU, single core)');
    await call((n) => window.__PHYS__.benchRays(n), 2000); // warm the JIT
    const rays = await call((n) => window.__PHYS__.benchRays(n), 10000);
    console.log(
      `  10,000 raycasts: ${f(rays.ms, 2)} ms  (${f(rays.raysPerMs, 1)} rays/ms, ` +
        `${((rays.hits / rays.count) * 100).toFixed(0)}% hit rate)`,
    );
    below('10,000 raycasts fit in a 16.6 ms frame', rays.ms, 16.6, ' ms');

    const bodies = await call(([n, s]) => window.__PHYS__.benchBodies(n, s), [300, 2]);
    console.log(
      `  ${bodies.bodies} live bodies: ${f(bodies.msPerStep, 3)} ms per fixed step ` +
        `(${bodies.asleep} asleep at the end)`,
    );
    ok('300 simultaneous bodies live', bodies.bodies === 300, `${bodies.bodies} bodies`);
    below('  a full body set steps well inside a frame', bodies.msPerStep, 4, ' ms');
    await call(() => window.__PHYS__.clearBodies());
  }

  /* -------------------------------- done ------------------------------- */

  // Ignore the favicon the boot page does not ship; anything else is real.
  const httpErrors = logs.filter((l) => l.startsWith('[http ') && !l.includes('favicon'));
  const errors = logs.filter(
    (l) =>
      (l.startsWith('[error]') && !l.includes('Failed to load resource')) ||
      l.startsWith('[pageerror]'),
  );
  ok('no console errors', errors.length === 0, `${errors.length} errors`);
  if (errors.length) for (const e of errors.slice(0, 10)) console.log('    ', e);
  ok('no failed requests', httpErrors.length === 0, httpErrors.slice(0, 3).join(' '));

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
