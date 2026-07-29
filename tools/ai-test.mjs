#!/usr/bin/env node
/**
 * Numeric assertions for the enemy AI.
 *
 * Everything here is a claim that cannot be settled by looking at a screenshot:
 * that a path between two distant points exists and every step of it is
 * walkable, that agents actually arrive, that sixteen of them fit in the frame
 * budget, that two soldiers cannot claim one wall, that a wall stops an enemy
 * seeing through it, that a headshot is worth what it says it is, and that a
 * ragdoll comes to rest without a NaN in it.
 *
 * Runs the real game in headless Chrome against `?showcase=ai`, driving it
 * through `window.__AI__`. Software rasterisation makes frames slow, so the
 * timing test measures the AI's own update cost rather than the frame rate.
 *
 *   node tools/ai-test.mjs [--url http://127.0.0.1:5173/] [--verbose]
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
  verbose: !!arg('verbose', false),
  timeout: Number(arg('timeout', 600000)),
};

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!CHROME) {
  console.error('No Chrome binary found.');
  process.exit(1);
}

/* ------------------------------- harness ---------------------------------- */

let passed = 0;
let failed = 0;
const failures = [];

function check(name, ok, detail) {
  if (ok) {
    passed++;
    console.log(`  \u2713 ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  \u2717 ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function near(a, b, tolerance) {
  return Math.abs(a - b) <= tolerance;
}

function section(title) {
  console.log(`\n${title}`);
}

/* --------------------------------- main ----------------------------------- */

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--disable-dev-shm-usage',
      '--mute-audio',
      '--disable-background-timer-throttling',
      '--window-size=640,360',
    ],
    protocolTimeout: OPTS.timeout,
    defaultViewport: { width: 640, height: 360, deviceScaleFactor: 1 },
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(OPTS.timeout);
  const logs = [];
  page.on('console', (m) => {
    logs.push(`[${m.type()}] ${m.text()}`);
    if (OPTS.verbose) console.log('   page', m.text());
  });
  page.on('pageerror', (e) => {
    logs.push(`[pageerror] ${e.message}`);
    console.log('   page error:', e.message);
  });

  const url = new URL(OPTS.url);
  url.searchParams.set('showcase', 'ai');
  url.searchParams.set('capture', '1');
  // Medium is the lowest preset with ragdolls enabled, and the ragdoll
  // assertions are half the point of this file.
  url.searchParams.set('quality', 'medium');

  console.log(`Loading ${url.href} ...`);
  const t0 = Date.now();
  await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, {
      timeout: 240000,
      polling: 250,
    });
  } catch {
    console.error('Engine or AI showcase never came up. Recent output:');
    for (const l of logs.slice(-40)) console.error('   ', l);
    await browser.close();
    process.exit(1);
  }
  console.log(`Ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  /* ------------------------------ navigation ----------------------------- */

  /*
   * Before anything else: is the AI actually running?
   *
   * Everything below drives the world with `__AI__.step` and reads the result,
   * and if the AI is switched off every one of those reads is a plausible-looking
   * zero. That is not hypothetical — the match director holds the AI down while
   * the game sits on its menu, which on this showcase it always does, and the
   * whole suite came back reporting soldiers who would not walk, feet at the
   * origin and a headshot that did nothing. Ten frames and a millimetre of
   * movement is the difference between a real failure and a switched-off one.
   */
  section('The AI is awake');
  const awake = await page.evaluate(() => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    const id = api.spawn(anchor[0], anchor[1], anchor[2], 0.6);
    const before = api.agent(id).position.slice();
    api.step(1.0);
    const a = api.agent(id);
    const bones = api.bones(id);
    return {
      moved: Math.hypot(a.position[0] - before[0], a.position[2] - before[2]),
      state: a.state,
      posed: !!bones && bones.some((b) => Math.abs(b[1]) > 0.1),
      updateMs: api.stats().updateMs,
    };
  });
  // Either measure of work will do. One agent's update rounds to 0.00 ms on the
  // performance timer often enough to fail this on its own, and a patrol whose
  // wander goal lands where the man already stands moves him nowhere; the AI
  // being switched off is the only way to score zero on both at once.
  check(
    'stepping the world runs the AI',
    !!awake && (awake.updateMs > 0 || awake.moved > 0.001) && awake.state !== 'idle',
    awake
      ? `${awake.updateMs.toFixed(2)} ms of AI and ${(awake.moved * 100).toFixed(1)} cm of movement in a second, state ${awake.state}`
      : '',
  );
  check(
    'a spawned soldier has a posed skeleton',
    !!awake && awake.posed,
    awake ? (awake.posed ? 'bones are where a man is' : 'every bone at the origin') : '',
  );

  section('Navigation');
  const nav = await page.evaluate(() => window.__AI__.navStats());
  check('nav grid built', nav.nodes > 500, `${nav.nodes} nodes over ${nav.cells} cells`);
  check(
    'grid has vertical layers',
    (nav.multiLayerColumns ?? 0) > 0,
    `${nav.multiLayerColumns ?? 0} columns with more than one walkable surface`,
  );
  // The cell has to be narrower than the narrowest thing an agent walks through,
  // or the graph cannot represent a doorway and the room behind it is not so
  // much unreachable as invisible. The town's narrowest door is 1.05 m.
  check(
    'the grid is finer than a doorway',
    nav.cell < 1.0,
    `${nav.cell} m cells against a 1.05 m door`,
  );

  const route = await page.evaluate(() => {
    const api = window.__AI__;
    const stats = api.navStats();
    // Two distant, definitely-walkable points: the spawn points furthest apart.
    const spawns = window.__GAME__.engine.get('world').spawnPoints;
    let best = null;
    let bestD = 0;
    for (let i = 0; i < spawns.length; i++) {
      for (let j = i + 1; j < spawns.length; j++) {
        const d = spawns[i].position.distanceTo(spawns[j].position);
        if (d > bestD) {
          bestD = d;
          best = [spawns[i].position, spawns[j].position];
        }
      }
    }
    if (!best) return null;
    const a = best[0];
    const b = best[1];
    const path = api.path(a.x, a.y, a.z, b.x, b.y, b.z);
    if (!path) return { straight: bestD, path: null, stats };
    let walkable = 0;
    let sampled = 0;
    // Every metre of every leg must be somewhere a soldier could stand.
    for (let i = 1; i < path.points.length; i++) {
      const p = path.points[i - 1];
      const q = path.points[i];
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const dz = q[2] - p[2];
      const len = Math.hypot(dx, dz);
      const steps = Math.max(1, Math.ceil(len));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        sampled++;
        if (api.walkable(p[0] + dx * t, p[1] + dy * t, p[2] + dz * t)) walkable++;
      }
    }
    return {
      straight: bestD,
      from: [a.x, a.y, a.z],
      to: [b.x, b.y, b.z],
      points: path.points.length,
      length: path.length,
      complete: path.complete,
      walkable,
      sampled,
    };
  });

  check('long route found', !!route && route.points > 1, route ? `${route.points} legs over ${route.length.toFixed(1)} m (straight line ${route.straight.toFixed(1)} m)` : 'no route');
  check('route reaches the goal', !!route && route.complete === true);
  check(
    'every step of the route is walkable',
    !!route && route.walkable === route.sampled,
    route ? `${route.walkable}/${route.sampled} samples` : '',
  );
  check(
    'route is smoothed, not a staircase',
    !!route && route.points < Math.max(8, route.length / 4),
    route ? `${route.points} legs for ${route.length.toFixed(0)} m` : '',
  );
  check(
    'route is not wildly longer than the straight line',
    !!route && route.length < route.straight * 2.4,
    route ? `${(route.length / route.straight).toFixed(2)}x` : '',
  );

  /* ---------------------------- connectivity ----------------------------- */

  /*
   * One route proves the search works. It says nothing about whether the graph
   * covers the level, and that is the failure that hides: the grid built, the
   * statistics looked healthy, a long route came back smooth and short — and a
   * third of the level's spawn points had no route to the other two thirds,
   * because the interiors were fenced off in three hundred islands. Nothing in a
   * screenshot or a single path shows that. The level's own spawn points are the
   * right yardstick: they are where the game puts people, so every one of them
   * has to be somewhere an agent can walk to and from.
   */
  section('The graph covers the level');
  const reach = await page.evaluate(() => {
    const api = window.__AI__;
    const nav = window.__GAME__.engine.get('ai').nav;
    const spawns = window.__GAME__.engine.get('world').spawnPoints;
    const stats = api.navStats();
    const sizes = nav.regionSize;
    const main = sizes.indexOf(Math.max(...sizes));

    // Rooftops and awnings are meant to be islands — nobody can climb to them.
    // Ground-level walkable space is not. Islands smaller than a small room are
    // not counted either: a kerbstone links to its two neighbours and to nothing
    // else, and there are thousands of them. What matters is a room or a yard
    // with floor in it and no way in.
    let offIsland = 0;
    let onIsland = 0;
    let climbing = 0;
    for (let n = 0; n < nav.nodeCount; n++) {
      if (nav.nodeY[n] > 1.9) continue;
      if (nav.region[n] === main) onIsland++;
      else if (sizes[nav.region[n]] >= 12) offIsland++;
    }
    // Links steeper than a plain step: stairs and ramps exist in this town and
    // the graph has to be able to describe them, or every upper floor and raised
    // terrace is an island with no way up to it.
    for (let n = 0; n < nav.nodeCount; n++) {
      for (let k = nav.adjStart[n]; k < nav.adjStart[n + 1]; k++) {
        if (nav.adjDir[k] >= 4) continue;
        if (Math.abs(nav.nodeY[nav.adjTo[k]] - nav.nodeY[n]) > 0.45) climbing++;
      }
    }

    const marooned = spawns.filter(
      (s) => nav.regionAt(s.position.x, s.position.y, s.position.z) !== main,
    ).length;

    // Every pair of spawn points that the graph says are on the same island must
    // actually have a complete route between them.
    let pairs = 0;
    let complete = 0;
    let worstRatio = 0;
    for (let i = 0; i < spawns.length; i++) {
      for (let j = i + 1; j < spawns.length; j++) {
        const a = spawns[i].position;
        const b = spawns[j].position;
        if (Math.hypot(b.x - a.x, b.z - a.z) < 12) continue;
        if (nav.regionAt(a.x, a.y, a.z) !== main) continue;
        if (nav.regionAt(b.x, b.y, b.z) !== main) continue;
        pairs++;
        const p = api.path(a.x, a.y, a.z, b.x, b.y, b.z);
        if (p && p.complete) {
          complete++;
          worstRatio = Math.max(worstRatio, p.length / Math.hypot(b.x - a.x, b.z - a.z));
        }
      }
    }
    const ranked = sizes.slice().sort((a, b) => b - a);
    return {
      regions: stats.regions,
      onIsland,
      offIsland,
      secondIsland: ranked[1] ?? 0,
      groundShare: onIsland / Math.max(1, onIsland + offIsland),
      climbing,
      spawns: spawns.length,
      marooned,
      pairs,
      complete,
      worstRatio,
    };
  });
  check(
    'the walkable ground is one dominant island, not two halves',
    !!reach && reach.onIsland > reach.secondIsland * 8,
    reach
      ? `${reach.onIsland} nodes in the main island against ${reach.secondIsland} in the next biggest; ${reach.offIsland} cut off in rooms`
      : '',
  );
  check(
    'the graph can describe a stair or a ramp, not just a step',
    !!reach && reach.climbing > 100,
    reach ? `${reach.climbing} links steeper than a 0.45 m step` : '',
  );

  /*
   * Every island boundary has to be a wall.
   *
   * The region ids are load-bearing: the cover field refuses any point whose
   * island differs from the agent's, so a link the builder failed to make is a
   * wall that is not there, and the symptom is a soldier standing in the open
   * beside a perfectly good barricade. Chased exactly that: fourteen of the
   * sixteen cover points within eighteen metres of the anchor were being
   * vetoed, which reads as a catastrophe until the boundary is measured — all
   * forty-eight crossings turned out to be stucco. The graph was right and the
   * suspicion was wrong, so the measurement becomes an assertion: wherever two
   * neighbouring columns hold surfaces a man could step between and the graph
   * calls them different islands, geometry has to be in the way.
   */
  const boundaries = await page.evaluate(() => {
    const THREE = window.__GAME__.THREE;
    const nav = window.__GAME__.engine.get('ai').nav;
    const physics = window.__GAME__.engine.get('physics');
    const cell = window.__AI__.navStats().cell;
    const from = new THREE.Vector3();
    const dir = new THREE.Vector3();
    // Groups.WORLD | Groups.PROP, the same mask NavGrid probes with. Not
    // 1 | 2, which is WORLD | PLAYER and leaves every bollard, planter and
    // market stall in the level invisible to the test.
    const MASK = 1 | 8;
    // Mirrors NavGrid's own link clearance heights: over the step, and under
    // the chest for railings with a gap beneath them.
    const HEIGHTS = [0.58, 1.36];
    const N = [
      [1, 0],
      [0, 1],
    ];

    let crossings = 0;
    let open = 0;
    const samples = [];
    for (let n = 0; n < nav.nodeCount; n++) {
      const c = nav.nodeCell[n];
      const i = c % nav.nx;
      const j = (c - i) / nav.nx;
      const ay = nav.nodeY[n];
      const ax = nav.x0 + (i + 0.5) * cell;
      const az = nav.z0 + (j + 0.5) * cell;
      for (const [oi, oj] of N) {
        const ni = i + oi;
        const nj = j + oj;
        if (ni >= nav.nx || nj >= nav.nz) continue;
        for (let m = nav.column[nj * nav.nx + ni]; m >= 0; m = nav.nextInColumn[m]) {
          if (nav.region[m] === nav.region[n]) continue;
          const by = nav.nodeY[m];
          // Only pairs a man could step between: anything taller is a wall
          // whether or not there is one, and anything the graph already links
          // is not a boundary.
          if (Math.abs(by - ay) > 0.4) continue;
          crossings++;
          const bx = nav.x0 + (ni + 0.5) * cell;
          const bz = nav.z0 + (nj + 0.5) * cell;
          const flat = Math.hypot(bx - ax, bz - az);
          // Probed from both ends. A ray reports what it enters and nothing
          // about what it started inside, so a cell in the skin of a wall sees
          // clear pavement while the pavement sees stucco; only a corridor open
          // from both sides is really open.
          const base = Math.max(ay, by);
          let blocked = false;
          for (const h of HEIGHTS) {
            from.set(ax, base + h, az);
            dir.set((bx - ax) / flat, 0, (bz - az) / flat);
            if (physics.raycast(from, dir, flat, MASK)) {
              blocked = true;
              break;
            }
            from.set(bx, base + h, bz);
            dir.set((ax - bx) / flat, 0, (az - bz) / flat);
            if (physics.raycast(from, dir, flat, MASK)) {
              blocked = true;
              break;
            }
          }
          if (blocked) continue;
          open++;
          if (samples.length < 4) {
            samples.push(
              `(${ax.toFixed(1)}, ${ay.toFixed(2)}, ${az.toFixed(1)}) to island ${nav.region[m]}`,
            );
          }
        }
      }
    }
    return { crossings, open, samples };
  });
  check(
    'every island boundary is a wall, not a link the builder missed',
    !!boundaries && boundaries.crossings > 0 && boundaries.open === 0,
    boundaries
      ? `${boundaries.crossings} step-height crossings between islands, ${boundaries.open} of them walkable${
          boundaries.samples.length ? `: ${boundaries.samples.join('; ')}` : ''
        }`
      : '',
  );
  check(
    'every pair of reachable spawn points has a complete route',
    !!reach && reach.pairs > 100 && reach.complete === reach.pairs,
    reach ? `${reach.complete}/${reach.pairs} pairs, worst detour ${reach.worstRatio.toFixed(2)}x` : '',
  );

  /*
   * The one assertion here worth more than all the statistics.
   *
   * Some of this level's rooms have no way in, and a grid that reports them as
   * unreachable is right rather than broken. The two cases look identical from
   * the outside, so they are separated by asking the world instead of the graph:
   * probe the room at 0.35 m, require a body's width of clearance at chest
   * height, and flood outward. If a body can walk out and the graph says it
   * cannot, the graph is wrong — which is precisely the failure that had a third
   * of the level fenced off, invisible behind healthy-looking statistics.
   */
  const sealed = await page.evaluate(() => {
    const THREE = window.__GAME__.THREE;
    const nav = window.__GAME__.engine.get('ai').nav;
    const physics = window.__GAME__.engine.get('physics');
    const spawns = window.__GAME__.engine.get('world').spawnPoints;
    const sizes = nav.regionSize;
    const main = sizes.indexOf(Math.max(...sizes));
    const hit = { point: new THREE.Vector3(), normal: new THREE.Vector3(), distance: 0, object: null, surface: 'concrete' };
    const o = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const down = new THREE.Vector3(0, -1, 0);
    const up = new THREE.Vector3(0, 1, 0);
    // Groups.WORLD | Groups.PROP, the same mask NavGrid probes with. Not
    // 1 | 2, which is WORLD | PLAYER and leaves every bollard, planter and
    // market stall in the level invisible to the test.
    const MASK = 1 | 8;
    const BODY = 0.34;
    const STEP = 0.35;
    const R = 13;

    const wrong = [];
    const verdicts = [];
    for (const s of spawns) {
      if (nav.regionAt(s.position.x, s.position.y, s.position.z) === main) continue;
      const cx = s.position.x;
      const cz = s.position.z;
      const x0 = cx - R;
      const z0 = cz - R;
      const n = Math.ceil((R * 2) / STEP);
      const floor = new Float32Array(n * n).fill(NaN);
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const x = x0 + (i + 0.5) * STEP;
          const z = z0 + (j + 0.5) * STEP;
          let from = s.position.y + 3.0;
          for (let k = 0; k < 3; k++) {
            o.set(x, from, z);
            if (!physics.raycastInto(o, down, from - (s.position.y - 2.5), hit, MASK)) break;
            const y = hit.point.y;
            if (hit.normal.y >= 0.6) {
              o.set(x, y + 0.25, z);
              if (!physics.raycastInto(o, up, 1.7, hit, MASK)) {
                let room = true;
                for (let a = 0; a < 8 && room; a++) {
                  const ang = (a / 8) * Math.PI * 2;
                  dir.set(Math.cos(ang), 0, Math.sin(ang));
                  o.set(x, y + 0.95, z);
                  if (physics.raycastInto(o, dir, BODY, hit, MASK)) room = false;
                }
                if (room) floor[j * n + i] = y;
                break;
              }
            }
            from = y - 0.25;
            if (from < s.position.y - 2.5) break;
          }
        }
      }
      const si = Math.round((cx - x0) / STEP);
      const sj = Math.round((cz - z0) / STEP);
      let start = -1;
      for (let r = 0; r < 12 && start < 0; r++)
        for (let dj = -r; dj <= r && start < 0; dj++)
          for (let di = -r; di <= r; di++) {
            const k = (sj + dj) * n + (si + di);
            if (k >= 0 && k < floor.length && !Number.isNaN(floor[k])) { start = k; break; }
          }
      if (start < 0) {
        verdicts.push('nowhere to stand');
        continue;
      }
      const seen = new Uint8Array(n * n);
      const stack = [start];
      seen[start] = 1;
      let escaped = null;
      while (stack.length) {
        const k = stack.pop();
        const i = k % n;
        const j = (k - i) / n;
        const x = x0 + (i + 0.5) * STEP;
        const z = z0 + (j + 0.5) * STEP;
        if (!escaped && Math.hypot(x - cx, z - cz) > 5 && nav.regionAt(x, floor[k], z) === main) {
          escaped = [+x.toFixed(1), +floor[k].toFixed(2), +z.toFixed(1)];
        }
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
          const nk = nj * n + ni;
          if (seen[nk] || Number.isNaN(floor[nk])) continue;
          if (Math.abs(floor[nk] - floor[k]) > 0.35) continue;
          seen[nk] = 1;
          stack.push(nk);
        }
      }
      if (escaped) wrong.push({ at: [+cx.toFixed(1), +cz.toFixed(1)], out: escaped });
      verdicts.push(escaped ? 'walkable but not in the graph' : 'sealed');
    }
    return { checked: verdicts.length, wrong, verdicts };
  });
  check(
    'nowhere an agent could walk to is missing from the graph',
    !!sealed && sealed.wrong.length === 0,
    sealed
      ? sealed.checked === 0
        ? 'every spawn point is on the main island'
        : `${sealed.checked} unreachable spawn point(s): ${sealed.verdicts.join(', ')}${
            sealed.wrong.length
              ? `; ${sealed.wrong
                  .map((w) => `spawn at (${w.at[0]}, ${w.at[1]}) walks out to (${w.out[0]}, ${w.out[1]}, ${w.out[2]})`)
                  .join('; ')}`
              : ''
          }`
      : '',
  );

  /* ------------------------------- arrival ------------------------------- */

  section('Agents reach their destination');
  const arrival = await page.evaluate(() => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    const world = window.__GAME__.engine.get('world');
    const THREE = window.__GAME__.THREE;
    // Somewhere twenty-odd metres away that the navigation says exists.
    const from = new THREE.Vector3(anchor[0], anchor[1], anchor[2]);
    let dest = null;
    for (const spawn of world.spawnPoints) {
      const d = spawn.position.distanceTo(from);
      if (d > 18 && d < 55) {
        dest = spawn.position;
        break;
      }
    }
    if (!dest) return null;
    // How long to wait is set by the route, not by the straight line. Twenty
    // metres of straight line through this town is a hundred metres of walking
    // when the direct bearing is a wall, and a fixed patience turns "the level
    // is shaped like this" into a failing navigation test.
    const route = api.path(anchor[0], anchor[1], anchor[2], dest.x, dest.y, dest.z);
    const id = api.spawn(anchor[0], anchor[1], anchor[2], 0);
    api.moveTo(id, dest.x, dest.y, dest.z);
    const start = api.agent(id).position.slice();
    const patience = Math.min(90, 8 + ((route ? route.length : 40) / 2.4) * 1.6);
    let closest = Infinity;
    let elapsed = 0;
    while (elapsed < patience) {
      api.step(0.5);
      elapsed += 0.5;
      const a = api.agent(id);
      const d = Math.hypot(a.position[0] - dest.x, a.position[2] - dest.z);
      closest = Math.min(closest, d);
      if (d < 1.6) break;
    }
    const end = api.agent(id).position;
    return {
      travelled: Math.hypot(end[0] - start[0], end[2] - start[2]),
      target: Math.hypot(dest.x - start[0], dest.z - start[2]),
      route: route ? route.length : null,
      patience,
      elapsed,
      closest,
    };
  });
  check(
    'agent walks to a point 20+ m away',
    !!arrival && arrival.closest < 1.8,
    arrival
      ? `got within ${arrival.closest.toFixed(2)} m of a ${arrival.target.toFixed(1)} m goal in ${arrival.elapsed.toFixed(0)} s, walking a ${arrival.route === null ? '?' : arrival.route.toFixed(0)} m route`
      : 'no destination found',
  );

  // A goal nobody can walk to is the common case in a real match: the player is
  // on a roof, or inside a room with no door, and every agent on the map is
  // asked to go there at once. The requirement is not that they arrive, it is
  // that they get as close as the geometry allows and then stop asking — an
  // agent that repaths forever is a frame-budget fire, and one that stands still
  // with a goal it will never reach is a soldier doing nothing in a firefight.
  const unreachable = await page.evaluate(() => {
    const api = window.__AI__;
    const nav = window.__GAME__.engine.get('ai').nav;
    const spawns = window.__GAME__.engine.get('world').spawnPoints;
    const sizes = nav.regionSize;
    const main = sizes.indexOf(Math.max(...sizes));
    // Somewhere genuinely cut off: a spawn point the graph says is on its own.
    const island = spawns.find((s) => nav.regionAt(s.position.x, s.position.y, s.position.z) !== main);
    if (!island) return { skipped: true };
    api.clear();
    const anchor = api.anchor();
    const id = api.spawn(anchor[0], anchor[1], anchor[2], 0);
    const ordered = api.moveTo(id, island.position.x, island.position.y, island.position.z);
    const before = api.stats().navMs;
    let searches = 0;
    for (let i = 0; i < 24; i++) {
      api.step(0.5);
      searches = api.navStats().searches;
    }
    const a = api.agent(id);
    return {
      ordered,
      state: a.state,
      pathState: a.pathState,
      pathFailed: a.pathFailed,
      scripted: a.scripted,
      hasGoal: a.hasGoal,
      stuck: a.stuck,
      navMs: api.stats().navMs,
      before,
      searches,
      moved: Math.hypot(a.position[0] - anchor[0], a.position[2] - anchor[2]),
    };
  });
  check(
    'an unreachable order is abandoned rather than retried forever',
    !!unreachable && (unreachable.skipped || (!unreachable.scripted && unreachable.navMs < 4)),
    unreachable && unreachable.skipped
      ? 'no island to aim at'
      : unreachable
        ? `order dropped ${!unreachable.scripted}, ${unreachable.navMs.toFixed(2)} ms of pathfinding on the last frame, state ${unreachable.state}`
        : '',
  );
  check(
    'an agent given an impossible order still does something',
    !!unreachable && (unreachable.skipped || unreachable.state !== 'idle'),
    unreachable && !unreachable.skipped
      ? `state ${unreachable.state}, ${unreachable.moved.toFixed(1)} m from where he started`
      : '',
  );

  /* ---------------------------- stance and gait --------------------------- */

  // Feet are the thing that gives cheap character animation away, and they
  // cannot be judged from a 960-pixel screenshot: at this distance a boot is
  // twenty pixels. So the rig is measured instead — where the feet are while
  // he stands, and whether the one on the ground stays where it was put while
  // he walks over it.
  section('Stance and foot plant');
  const gait = await page.evaluate(() => {
    const api = window.__AI__;
    const engine = window.__GAME__.engine;
    const physics = engine.tryGet('physics');
    const B = api.boneIndex();
    api.clear();
    const anchor = api.anchor();
    const dist = (b, i, j) => Math.hypot(b[i][0] - b[j][0], b[i][1] - b[j][1], b[i][2] - b[j][2]);
    // How far the foot is from the hip joint as a fraction of the leg's own
    // length. One means a straight leg; anything over it is stretched IK.
    const reach = (b, hipJoint, knee, ankle) =>
      dist(b, hipJoint, ankle) / (dist(b, hipJoint, knee) + dist(b, knee, ankle));
    // The same fraction taken vertically: how much of the leg's length the hip
    // joint stands above the ankle.
    const rise = (b, hipJoint, knee, ankle) =>
      (b[hipJoint][1] - b[ankle][1]) / (dist(b, hipJoint, knee) + dist(b, knee, ankle));

    // A man who is genuinely standing. Left to the tree he starts a patrol
    // within a frame or two, and a walking soldier answers a different question.
    const id = api.spawn(anchor[0], anchor[1], anchor[2], 0.6);
    api.force(id, 'hold');
    api.step(0.5);
    const held = api.agent(id).position;
    api.step(2);

    const still = api.agent(id);
    const wander = Math.hypot(still.position[0] - held[0], still.position[2] - held[2]);
    let b = api.bones(id);
    const foot = (j) => ({ x: b[j][0], y: b[j][1], z: b[j][2] });
    const hip = foot(B.pelvis);
    const fl = foot(B.footL);
    const fr = foot(B.footR);
    const toeYaw = (f, t) => Math.atan2(t.x - f.x, t.z - f.z);
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const ground = physics ? physics.groundHeight(fl.x, fl.z, 3) : fl.y;
    const stand = {
      speed: Math.hypot(still.velocity[0], still.velocity[2]),
      wander,
      // Under him, not out in front. A man who has just stopped keeps the
      // stance he stopped in — one foot trailing — so this is half a stride
      // rather than zero; the failure being caught is the deck-chair, feet a
      // metre ahead of the hips with the pelvis dropped to reach them.
      aheadL: Math.hypot(fl.x - hip.x, fl.z - hip.z),
      aheadR: Math.hypot(fr.x - hip.x, fr.z - hip.z),
      apart: Math.hypot(fl.x - fr.x, fl.z - fr.z),
      level: Math.abs(fl.y - fr.y),
      // The ankle joint rides a little above the sole, so this is a band.
      ankleAboveGround: fl.y - ground,
      // Against the heading he is actually facing, which after a turn is not
      // the one he was spawned on.
      yawL: Math.abs(wrap(toeYaw(fl, foot(B.toeL)) - still.heading)),
      yawR: Math.abs(wrap(toeYaw(fr, foot(B.toeR)) - still.heading)),
    };

    // Now walk him and watch the planted foot.
    api.clear();
    const walker = api.spawn(anchor[0], anchor[1], anchor[2], 0);
    let dest = null;
    for (const spawn of engine.get('world').spawnPoints) {
      const d = Math.hypot(spawn.position.x - anchor[0], spawn.position.z - anchor[2]);
      if (d > 20 && d < 45) {
        dest = spawn.position;
        break;
      }
    }
    if (!dest) return { stand, walk: null };
    api.moveTo(walker, dest.x, dest.y, dest.z);
    api.step(1.5);

    let prev = api.bones(walker);
    let prevBody = api.agent(walker).position;
    const planted = [];
    const slide = [];
    let bodyTravel = 0;
    let worstReach = 0;
    const rides = [];
    const stance = [];
    let airborne = 0;
    let topSpeed = 0;
    for (let f = 0; f < 150; f++) {
      api.stepFrames(1);
      b = api.bones(walker);
      const body = api.agent(walker).position;
      const step = Math.hypot(body[0] - prevBody[0], body[2] - prevBody[2]);
      bodyTravel += step;
      if (step > 0.01) {
        const dL = Math.hypot(b[B.footL][0] - prev[B.footL][0], b[B.footL][2] - prev[B.footL][2]);
        const dR = Math.hypot(b[B.footR][0] - prev[B.footR][0], b[B.footR][2] - prev[B.footR][2]);
        // The stiller of the two feet is the one taking his weight.
        planted.push(Math.min(dL, dR));
        slide.push(Math.min(dL, dR) / step);
        // How far the stance reaches, and how low the hips ride to reach it.
        // The deck chair is both at once: feet a metre out in front and a
        // pelvis dropped to the knees getting to them.
        //
        // Both measured against the leg rather than against the terrain. A
        // ground probe under the pelvis is ambiguous by a kerb height the moment
        // the feet straddle a step — it read 1.12 m of hip height and a 0.88 m
        // stride for a soldier walking up a 15 cm lip, which is a fact about the
        // probe. Reach as a fraction of the leg's own length cannot exceed one
        // unless the IK has stretched, and hip height over the lower foot is the
        // extension the leg is actually at.
        worstReach = Math.max(
          worstReach,
          reach(b, B.thighL, B.calfL, B.footL),
          reach(b, B.thighR, B.calfR, B.footR),
        );
        // How straight the straighter leg is, vertically: hip joint over ankle
        // against that leg's own length. Taken from the hip joint rather than
        // the pelvis root, which sits above it and made the ratio exceed one.
        rides.push(Math.max(rise(b, B.thighL, B.calfL, B.footL), rise(b, B.thighR, B.calfR, B.footR)));
        // The leg he is actually standing on, and how extended it is.
        //
        // Which leg that is has to come from the ground under each boot, not
        // from the two boots against each other: this route is terraced and
        // both readings of "the lower foot" disagree the moment he steps down a
        // kerb. And at 4.35 m/s he is running, not walking, so the frames where
        // neither boot is near the ground are the flight phase of a run — both
        // legs are tucked, and that is what a run is, not a fault in the rig.
        const airL = b[B.footL][1] - (physics ? physics.groundHeight(b[B.footL][0], b[B.footL][2], 3) : b[B.footL][1]);
        const airR = b[B.footR][1] - (physics ? physics.groundHeight(b[B.footR][0], b[B.footR][2], 3) : b[B.footR][1]);
        // The ankle joint rides about 9 cm over the sole, so this is the band a
        // planted boot reads in.
        if (Math.min(airL, airR) < 0.16) {
          stance.push(
            airL <= airR ? rise(b, B.thighL, B.calfL, B.footL) : rise(b, B.thighR, B.calfR, B.footR),
          );
        } else airborne++;
        topSpeed = Math.max(topSpeed, Math.hypot(api.agent(walker).velocity[0], api.agent(walker).velocity[2]));
      }
      prev = b;
      prevBody = body;
    }
    planted.sort((x, y) => x - y);
    slide.sort((x, y) => x - y);
    rides.sort((x, y) => x - y);
    stance.sort((x, y) => x - y);
    return {
      stand,
      walk: {
        rideFloor: rides[0],
        rideTop: rides[rides.length - 1],
        stanceFloor: stance.length ? stance[0] : NaN,
        stanceP05: stance.length ? stance[Math.floor(stance.length * 0.05)] : NaN,
        stanceMedian: stance.length ? stance[Math.floor(stance.length / 2)] : NaN,
        stanceFrames: stance.length,
        airborneFrames: airborne,
        topSpeed,
        frames: planted.length,
        bodyTravel,
        plantMedian: planted[Math.floor(planted.length / 2)],
        plantP90: planted[Math.floor(planted.length * 0.9)],
        slideMedian: slide[Math.floor(slide.length / 2)],
        slideP90: slide[Math.floor(slide.length * 0.9)],
        worstReach,
      },
    };
  });

  check(
    'a standing soldier holds still',
    !!gait && gait.stand.wander < 0.1,
    gait ? `drifted ${(gait.stand.wander * 100).toFixed(1)} cm in two seconds, ${gait.stand.speed.toFixed(2)} m/s` : '',
  );
  check(
    'a standing soldier plants his feet under his hips',
    !!gait && gait.stand.aheadL < 0.5 && gait.stand.aheadR < 0.5,
    gait ? `${gait.stand.aheadL.toFixed(2)} m and ${gait.stand.aheadR.toFixed(2)} m from the hips` : '',
  );
  check(
    'his feet are a stance apart and level',
    !!gait && gait.stand.apart > 0.12 && gait.stand.apart < 0.6 && gait.stand.level < 0.08,
    gait ? `${gait.stand.apart.toFixed(2)} m apart, ${(gait.stand.level * 100).toFixed(1)} cm of height between them` : '',
  );
  check(
    'his boots rest on the ground rather than floating or sinking',
    !!gait && gait.stand.ankleAboveGround > 0.02 && gait.stand.ankleAboveGround < 0.26,
    gait ? `ankle ${(gait.stand.ankleAboveGround * 100).toFixed(0)} cm above the floor` : '',
  );
  check(
    'his toes point where he faces',
    !!gait && gait.stand.yawL < 0.35 && gait.stand.yawR < 0.35,
    gait ? `${((gait.stand.yawL * 180) / Math.PI).toFixed(0)} and ${((gait.stand.yawR * 180) / Math.PI).toFixed(0)} degrees off his heading` : '',
  );
  check(
    'a walking soldier always has a foot planted',
    !!gait && !!gait.walk && gait.walk.plantMedian < 0.02,
    gait && gait.walk
      ? `stiller foot moves ${(gait.walk.plantMedian * 1000).toFixed(1)} mm a frame (p90 ${(gait.walk.plantP90 * 1000).toFixed(0)} mm) over ${gait.walk.bodyTravel.toFixed(0)} m walked`
      : 'no destination found',
  );
  check(
    'the planted foot does not slide under him',
    !!gait && !!gait.walk && gait.walk.slideMedian < 0.25,
    gait && gait.walk ? `${(gait.walk.slideMedian * 100).toFixed(0)}% of the body's travel, p90 ${(gait.walk.slideP90 * 100).toFixed(0)}%` : '',
  );
  check(
    'his stride never reaches further than a leg is long',
    !!gait && !!gait.walk && gait.walk.worstReach < 1,
    gait && gait.walk
      ? `worst ${(gait.walk.worstReach * 100).toFixed(1)}% of the leg's length from hip to ankle`
      : '',
  );
  /*
   * The deck chair: a gait with the pelvis dropped to the knees.
   *
   * Measured on the leg taking his weight, on the frames where a boot is near
   * the ground under it. Two earlier versions of this measured the wrong thing.
   * Taking the straighter of the two legs on every frame failed at the fifth
   * percentile, on the frames where both legs were folded at once — which turned
   * out to be the flight phase of a run, because an ordered move runs at 4.35
   * m/s and a run leaves the ground. Comparing the two boots against each other
   * to find the planted one failed differently, because this route is terraced
   * and both boots read level while he is stepping off a kerb.
   *
   * The ground under each boot settles both: it names the stance leg correctly
   * on a step, and it distinguishes a tucked leg in flight from a folded one
   * carrying his weight. A hundred percent is a hard ceiling — a leg cannot be
   * straighter than straight, so anything above it is stretched IK.
   */
  check(
    'his hips ride over the leg carrying him',
    !!gait &&
      !!gait.walk &&
      gait.walk.stanceFrames > 40 &&
      gait.walk.stanceMedian > 0.8 &&
      gait.walk.stanceP05 > 0.65 &&
      gait.walk.stanceFloor > 0.55 &&
      gait.walk.rideTop <= 1,
    gait && gait.walk
      ? `the stance leg stands ${(gait.walk.stanceMedian * 100).toFixed(0)}% of its length tall typically, ${(gait.walk.stanceP05 * 100).toFixed(0)}% at the 5th percentile and ${(gait.walk.stanceFloor * 100).toFixed(0)}% at worst over ${gait.walk.stanceFrames} planted frames, at up to ${gait.walk.topSpeed.toFixed(1)} m/s; ${gait.walk.airborneFrames} frames in flight`
      : '',
  );

  /* ----------------------------- weapon hold ----------------------------- */

  section('How he holds the rifle');
  const hold = await page.evaluate(() => {
    const api = window.__AI__;
    const engine = window.__GAME__.engine;
    const ai = engine.tryGet('ai');
    const B = api.boneIndex();
    api.clear();
    const anchor = api.anchor();
    const id = api.spawn(anchor[0], anchor[1], anchor[2], 0);
    const agent = ai.agentList.find((a) => a.id === id);
    if (!agent) return null;

    // Shouldered and still, which is the pose the portrait is taken in and the
    // one every folding limit is worst in.
    api.force(id, 'hold');
    api.aimAt(id, anchor[0] + 14 * Math.sin(0.4), anchor[1] + 1.1, anchor[2] + 14 * Math.cos(0.4));
    api.step(0.6);

    const b = api.bones(id);
    const sub = (i, j) => [b[i][0] - b[j][0], b[i][1] - b[j][1], b[i][2] - b[j][2]];
    const len = (v) => Math.hypot(v[0], v[1], v[2]);
    const heading = agent.heading;
    const fwd = [Math.sin(heading), 0, Math.cos(heading)];
    const right = [-Math.cos(heading), 0, Math.sin(heading)];
    const along = (v, ax) => v[0] * ax[0] + v[2] * ax[2];
    const deg = (r) => (r * 180) / Math.PI;

    const arm = (sh, el, hd) => {
      const upper = len(sub(el, sh));
      const fore = len(sub(hd, el));
      const span = len(sub(hd, sh));
      const cos = (upper * upper + fore * fore - span * span) / (2 * upper * fore);
      const off = sub(el, sh);
      return {
        // Fraction of the arm's own length between shoulder and hand. A folded
        // arm is fine; one folded past what the elbow can close is not.
        extension: span / (upper + fore),
        elbowDeg: deg(Math.acos(Math.max(-1, Math.min(1, cos)))),
        // Outboard of the shoulder is where an elbow reads against the
        // background; inboard of it is an elbow inside the ribcage.
        elbowOut: along(off, right),
        elbowDown: -off[1],
      };
    };

    // Where the buttplate sits relative to the chest, along the body's own
    // forward axis. Negative is a stock buried in the torso.
    const chest = b[B.chest];
    const weapon = b[B.weapon];
    const stock = along([weapon[0] - chest[0], 0, weapon[2] - chest[2]], fwd) - 0.202;
    // And both hands still on the gun: the IK gives up silently when a grip is
    // out of reach and leaves the hand hanging short of it.
    const gripR = len(sub(B.handR, B.weapon));
    const gripL = len(sub(B.handL, B.weapon));
    return {
      right: arm(B.armR, B.foreR, B.handR),
      left: arm(B.armL, B.foreL, B.handL),
      stock,
      gripR,
      gripL,
      aiming: agent.aiming,
    };
  });

  // An elbow closes to about 35 degrees between the segments and no further.
  check(
    'the firing arm is folded no harder than an elbow bends',
    !!hold && hold.right.elbowDeg > 35 && hold.right.extension > 0.3,
    hold ? `elbow at ${hold.right.elbowDeg.toFixed(0)}°, hand ${(hold.right.extension * 100).toFixed(0)}% of the arm's length out` : 'no agent',
  );
  check(
    'the support arm reaches the handguard without locking straight',
    !!hold && hold.left.extension > 0.7 && hold.left.extension < 0.99,
    hold ? `${(hold.left.extension * 100).toFixed(0)}% of the arm's length, elbow at ${hold.left.elbowDeg.toFixed(0)}°` : '',
  );
  check(
    'the firing elbow sits outboard of the shoulder, not inside the chest',
    !!hold && hold.right.elbowOut > 0 && hold.right.elbowDown > 0.1,
    hold ? `${(hold.right.elbowOut * 100).toFixed(0)} cm outboard and ${(hold.right.elbowDown * 100).toFixed(0)} cm below it` : '',
  );
  check(
    'the buttstock is in the shoulder pocket, not through the ribcage',
    !!hold && hold.stock > -0.02,
    hold ? `butt ${(hold.stock * 100).toFixed(0)} cm forward of the chest bone` : '',
  );
  check(
    'both hands are still on the weapon',
    !!hold && hold.gripR < 0.14 && hold.gripL < 0.3,
    hold ? `firing hand ${(hold.gripR * 100).toFixed(0)} cm from the receiver, support hand ${(hold.gripL * 100).toFixed(0)} cm` : '',
  );

  /* ------------------------------ perception ----------------------------- */

  section('Perception');
  const sight = await page.evaluate(() => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    // Open ground: the target is placed in front, then behind, the nearest wall.
    const physics = window.__GAME__.engine.get('physics');
    const THREE = window.__GAME__.THREE;
    const origin = new THREE.Vector3(anchor[0], anchor[1] + 1.6, anchor[2]);

    // Find a direction with a wall in it, close enough to hide behind.
    let wall = null;
    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const hit = physics.raycast(origin, dir, 22);
      if (hit && hit.distance > 4 && hit.distance < 20) {
        wall = { dir: [dir.x, dir.y, dir.z], distance: hit.distance };
        break;
      }
    }
    if (!wall) return null;

    const id = api.spawn(anchor[0], anchor[1], anchor[2], Math.atan2(wall.dir[0], wall.dir[2]));
    api.force(id, 'idle');

    // 1. Target in the open, dead ahead and close: must be seen.
    const openX = anchor[0] + wall.dir[0] * (wall.distance - 2);
    const openZ = anchor[2] + wall.dir[2] * (wall.distance - 2);
    api.setPlayer(openX, anchor[1], openZ);
    api.step(1.6);
    const open = api.agent(id);

    // 2. Same bearing, but on the far side of the wall: must not be.
    api.force(id, 'idle');
    const hiddenX = anchor[0] + wall.dir[0] * (wall.distance + 3.5);
    const hiddenZ = anchor[2] + wall.dir[2] * (wall.distance + 3.5);
    api.setPlayer(hiddenX, anchor[1], hiddenZ);
    api.step(2.5);
    const hidden = api.agent(id);

    // 3. In the open again, but directly behind the soldier.
    api.force(id, 'idle');
    api.setPlayer(anchor[0] - wall.dir[0] * 12, anchor[1], anchor[2] - wall.dir[2] * 12);
    api.step(0.35);
    const behind = api.agent(id);

    return {
      wallDistance: wall.distance,
      openVisible: open.visible,
      openAwareness: open.awareness,
      hiddenVisible: hidden.visible,
      hiddenAwareness: hidden.awareness,
      behindVisible: behind.visible,
      behindAwareness: behind.awareness,
    };
  });

  check('sees a target in the open', !!sight && sight.openVisible === true, sight ? `awareness ${sight.openAwareness.toFixed(2)}` : 'no wall found to test against');
  check(
    'does not see through a wall',
    !!sight && sight.hiddenVisible === false && sight.hiddenAwareness < 1,
    sight ? `awareness ${sight.hiddenAwareness.toFixed(2)} behind a wall ${sight.wallDistance.toFixed(1)} m away` : '',
  );
  check(
    'detection is gradual, not instant',
    !!sight && sight.behindAwareness < 1,
    sight ? `awareness ${sight.behindAwareness.toFixed(2)} after 0.35 s from behind` : '',
  );

  /* -------------------------------- hearing ------------------------------ */

  section('Hearing');
  const hearing = await page.evaluate(() => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    const id = api.spawn(anchor[0], anchor[1], anchor[2], 0);
    api.force(id, 'idle');
    api.setPlayer(anchor[0], anchor[1] - 60, anchor[2]);
    const before = api.agent(id).awareness;
    // A gunshot behind him, out of the vision cone entirely.
    window.__GAME__.engine.events.emit('weapon:fire', {
      weaponId: 'test',
      origin: new window.__GAME__.THREE.Vector3(anchor[0], anchor[1] + 1.5, anchor[2] - 14),
      direction: new window.__GAME__.THREE.Vector3(0, 0, 1),
      ammoLeft: 29,
      suppressed: false,
    });
    api.step(0.1);
    const after = api.agent(id);
    return { before, after: after.awareness, contact: after.contact, lastKnownAge: after.lastKnownAge };
  });
  check(
    'a gunshot out of view is heard',
    hearing.after > hearing.before + 0.2,
    `awareness ${hearing.before.toFixed(2)} -> ${hearing.after.toFixed(2)}`,
  );
  check('a heard shot leaves a position to investigate', hearing.lastKnownAge < 1);

  /* --------------------------------- cover -------------------------------- */

  section('Cover');
  const cover = await page.evaluate(() => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    const ids = [];
    for (let i = 0; i < 6; i++) {
      const id = api.spawn(anchor[0] - 2 + (i % 3) * 1.6, anchor[1], anchor[2] - 2 + Math.floor(i / 3) * 1.6, 0);
      ids.push(id);
    }
    // The target has to be somewhere the squad can actually see, and the contact
    // has to be renewed while they walk. Placed once and left, awareness decays
    // over the seconds it takes to cross fifteen metres, the tree drops out of
    // the engage branch into investigate, and what gets measured is six men
    // wandering off to look at a noise rather than six men taking cover.
    const spot = api.openGround(ids[0], 20);
    api.setPlayer(spot ? spot[0] : anchor[0] + 18, spot ? spot[1] : anchor[1], spot ? spot[2] : anchor[2]);
    // Sampled every slice rather than read once at the end. A man in cover is
    // leaning out of it half the time, so a single final snapshot of who is
    // standing on his point is a coin toss; what matters is that everyone who
    // reserved a point got to it at some stage.
    // Keyed on agent *and* point, because an agent who re-scores onto a nearer
    // wall starts a fresh approach and the old one must not be held against him.
    const runs = new Map();
    const seen = new Set();
    for (let slice = 0; slice < 16; slice++) {
      for (const id of ids) api.force(id, 'engage');
      api.step(0.5);
      for (const a of api.agents()) {
        seen.add(a.state);
        if (a.cover < 0) continue;
        const key = `${a.id}:${a.cover}`;
        const run = runs.get(key);
        if (run) {
          run.last = a.coverDistance;
          run.best = Math.min(run.best, a.coverDistance);
          run.slices++;
        } else {
          runs.set(key, { first: a.coverDistance, last: a.coverDistance, best: a.coverDistance, slices: 1 });
        }
      }
    }
    // A claim held for under a second is a decision still being made, not an
    // approach that failed.
    const settledRuns = [...runs.values()].filter((r) => r.slices >= 2);
    // An empty-handed agent has to justify himself. `coverScore` is what the
    // best point within his search radius was worth after the walk to it was
    // charged; a negative number means the scorer looked and found nothing
    // better than staying put, which is a decision and not a failure, and null
    // means there was nothing within the radius to weigh. A number at or above
    // the floor means a usable wall was on offer and refused, which is a bug —
    // and this is the only way to tell those three apart from outside.
    let emptyHanded = 0;
    let unjustified = 0;
    let bestRefused = null;
    for (const a of api.agents()) {
      if (!a.alive || a.cover >= 0) continue;
      emptyHanded++;
      if (typeof a.coverScore === 'number' && a.coverScore >= 0) {
        unjustified++;
        bestRefused = Math.max(bestRefused ?? -Infinity, a.coverScore);
      }
    }
    const claims = api.coverClaims();
    const byIndex = new Map();
    const byAgent = new Map();
    let duplicates = 0;
    for (const c of claims) {
      if (byIndex.has(c.index)) duplicates++;
      byIndex.set(c.index, c.agent);
      // One agent holding two points is the same bug seen from the other side:
      // a squad of six can quietly reserve the whole street.
      byAgent.set(c.agent, (byAgent.get(c.agent) ?? 0) + 1);
    }
    // Two agents must never hold the same point, and a direct steal must fail.
    let stolen = false;
    if (claims.length > 0) {
      stolen = api.claimCover(claims[0].index, 999999);
    }
    const agents = api.agents();
    // An agent reporting himself in cover must be standing at the point he
    // reserved, not merely somewhere that happens to be sheltered. Measured
    // against the claim list rather than trusting the agent's own arithmetic.
    let atOwnPoint = 0;
    let strayed = 0;
    let worstStray = 0;
    for (const a of agents) {
      if (!a.inCover) continue;
      const mine = claims.find((c) => c.agent === a.id);
      if (!mine) {
        strayed++;
        continue;
      }
      const d = Math.hypot(a.position[0] - mine.at[0], a.position[2] - mine.at[2]);
      worstStray = Math.max(worstStray, d);
      if (d < 1.5) atOwnPoint++;
      else strayed++;
    }
    return {
      claims: claims.length,
      duplicates,
      stolen,
      distinct: byIndex.size,
      hoarders: [...byAgent.values()].filter((n) => n > 1).length,
      inCover: agents.filter((a) => a.inCover).length,
      atCover: agents.filter((a) => a.atCover).length,
      atOwnPoint,
      strayed,
      worstStray,
      approaches: settledRuns.length,
      arrived: settledRuns.filter((r) => r.best <= 1.1).length,
      closing: settledRuns.filter((r) => r.best <= 1.1 || r.best < r.first - 1).length,
      worstApproach: settledRuns.reduce((m, r) => Math.max(m, r.best), 0),
      emptyHanded,
      unjustified,
      bestRefused,
      seen: [...seen],
      states: agents.map((a) => `${a.state}${a.alive ? '' : ' (dead)'}`),
    };
  });
  check('agents claim cover', cover.claims > 0, `${cover.claims} points claimed by 6 agents`);
  check('no two agents share a cover point', cover.duplicates === 0 && cover.distinct === cover.claims);
  check('no agent holds more than one point', cover.hoarders === 0, `${cover.claims} claims across 6 agents`);
  check('a claimed point cannot be stolen', cover.stolen === false);
  check(
    'an agent who holds a point either reaches it or closes on it',
    cover.approaches > 0 && cover.closing === cover.approaches,
    `${cover.arrived} of ${cover.approaches} arrived, all ${cover.closing} closing, worst ${cover.worstApproach.toFixed(2)} m`,
  );
  check(
    'a man with no cover to take fights instead of standing still',
    cover.seen.includes('stand-fight'),
    `behaviours seen: ${cover.seen.join(', ')}`,
  );
  check(
    'nobody stands in the open with a usable wall beside him',
    cover.unjustified === 0,
    `${cover.emptyHanded} of 6 empty-handed, best refused ${
      cover.bestRefused === null ? 'nothing worth having' : cover.bestRefused.toFixed(1)
    }`,
  );
  check(
    'a man who says he is in cover is standing on the point he claimed',
    cover.strayed === 0 && cover.atOwnPoint === cover.inCover,
    `${cover.atOwnPoint} of ${cover.inCover}, worst ${cover.worstStray.toFixed(2)} m off`,
  );

  /* -------------------------------- damage -------------------------------- */

  section('Damage and hitboxes');
  const damage = await page.evaluate(() => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    const out = {};

    // Body shots accumulate exactly: three at twenty-six leave him standing on
    // twenty-two, the fourth takes him past zero.
    let id = api.spawn(anchor[0], anchor[1], anchor[2], 0);
    out.startHealth = api.agent(id).health;
    out.bodyLethal = [];
    out.bodyTrack = [];
    for (let i = 0; i < 4; i++) {
      out.bodyLethal.push(api.damage(id, 26, false));
      out.bodyTrack.push(api.agent(id).health);
    }
    out.bodyHealth = api.agent(id).health;

    // The head multiplier, resolved through the same call the weapon uses.
    id = api.spawn(anchor[0] + 1.5, anchor[1], anchor[2], 0);
    out.headLethal = api.damage(id, 100 * 1.7, true);
    out.headHealth = api.agent(id).health;
    out.headAlive = api.agent(id).alive;

    // A limb hit at the same nominal damage must leave him standing.
    id = api.spawn(anchor[0] + 3, anchor[1], anchor[2], 0);
    out.limbLethal = api.damage(id, 100 * 0.6, false);
    out.limbHealth = api.agent(id).health;

    // Explosions fall off with distance and are stopped by geometry.
    api.clear();
    const near = api.spawn(anchor[0], anchor[1], anchor[2], 0);
    const far = api.spawn(anchor[0] + 5.4, anchor[1], anchor[2], 0);
    const outside = api.spawn(anchor[0] + 14, anchor[1], anchor[2], 0);
    const kills = api.damageRadius(anchor[0], anchor[1] + 0.5, anchor[2], 6.2, 130);
    out.blastKills = kills;
    out.blastNear = api.agent(near).health;
    out.blastFar = api.agent(far).health;
    out.blastOutside = api.agent(outside).health;
    return out;
  });

  check(
    'three body shots do not kill, the fourth does',
    damage.bodyLethal.slice(0, 3).every((x) => x === false) && damage.bodyLethal[3] === true,
    `lethality ${damage.bodyLethal.join(',')}`,
  );
  check(
    'body damage accumulates exactly',
    near(damage.startHealth - damage.bodyTrack[2], 78, 0.01),
    `${damage.startHealth} -> ${damage.bodyTrack.map((h) => h.toFixed(0)).join(' -> ')}`,
  );
  check('a headshot at the weapon multiplier is lethal', damage.headLethal === true && damage.headAlive === false);
  check(
    'a limb hit is not',
    damage.limbLethal === false && damage.limbHealth > 0,
    `${damage.limbHealth.toFixed(0)} health left`,
  );
  check('explosion kills at the centre', damage.blastKills >= 1, `${damage.blastKills} killed`);
  check(
    'explosion damage falls off with distance',
    damage.blastNear < damage.blastFar && damage.blastFar < damage.blastOutside,
    `${damage.blastNear.toFixed(0)} / ${damage.blastFar.toFixed(0)} / ${damage.blastOutside.toFixed(0)} health at 0 / 5.4 / 14 m`,
  );
  check('explosion does not reach outside its radius', near(damage.blastOutside, 100, 0.01));

  /* ---------------------------- killstreak contract ----------------------- */

  // The airstrike calls `damageRadius(centre, radius, damage, source)` for every
  // bomb and `query(centre, radius)` eight times a second to count what is
  // standing in its footprint. Both are called on the interface rather than
  // through the showcase bridge, with the ladder's own numbers, because the
  // point of this section is the shared contract and not my own wrapper.
  section('Killstreak contract');
  const streak = await page.evaluate(() => {
    const api = window.__AI__;
    const engine = window.__GAME__.engine;
    const THREE = window.__GAME__.THREE;
    const ai = engine.tryGet('ai');
    if (!ai) return null;
    api.clear();
    const anchor = api.anchor();
    // A precision strike detonates just off the deck, which is where the
    // killstreak puts the centre it hands over.
    const centre = new THREE.Vector3(anchor[0], anchor[1] + 0.4, anchor[2]);

    const ids = [];
    for (let i = 0; i < 6; i++) ids.push(api.spawn(anchor[0] + i * 3, anchor[1], anchor[2], 0));

    // Before a single frame has run. The killstreak director and the radar both
    // discard an entry whose `alive` is false, so a snapshot that is only
    // refreshed on AI frames hands a caller who spawned a garrison and asked
    // straight away a list of six men it will then ignore.
    const unstepped = ai.query(centre, 200);
    const fresh =
      unstepped.length === 6 &&
      unstepped.every((e) => e.alive === true && e.health > 0 && !!e.name);

    api.step(0.25);

    // Wherever they actually ended up standing, since spawning snaps to the
    // navmesh. The assertion is `query` against the truth, not against a plan.
    const at = ids.map((id) => api.agent(id).position);
    const inside = (r) =>
      at.filter((p) => Math.hypot(p[0] - centre.x, p[1] - centre.y, p[2] - centre.z) <= r).length;

    const footprint = ai.query(centre, 9);
    const wide = ai.query(centre, 200);
    const shape = {
      returned: footprint.length,
      truth: inside(9),
      all: wide.length,
      fresh,
      freshCount: unstepped.length,
      // The director holds a footprint while it asks a wider question, so the
      // first answer must survive the second.
      independent: footprint !== wide && footprint.length === inside(9),
      alive: ai.aliveCount,
      usable: footprint.every(
        (e) => typeof e.id === 'number' && e.position && Number.isFinite(e.position.x) && e.alive === true,
      ),
      // Positions must be the live ones, not whatever they were at spawn.
      accurate: footprint.every((e) => {
        const a = api.agent(e.id);
        return a && Math.hypot(a.position[0] - e.position.x, a.position[2] - e.position.z) < 0.05;
      }),
    };

    // A dead man is not a target: the HUD counts hostiles, not bodies.
    api.damage(ids[0], 500, false);
    shape.afterKill = ai.query(centre, 200).length;
    shape.aliveAfterKill = ai.aliveCount;

    // The bombing run itself. Every field the FX and HUD systems read off the
    // death is captured, because a kill that arrives without an impulse is a
    // corpse that does not fall over.
    const deaths = [];
    const feed = [];
    const offDeath = engine.events.on('enemy:death', (e) =>
      deaths.push({
        id: e.id,
        headshot: e.headshot,
        weapon: e.weapon,
        impulse: [e.impulse.x, e.impulse.y, e.impulse.z],
        position: [e.position.x, e.position.y, e.position.z],
      }),
    );
    const offFeed = engine.events.on('ui:killfeed', (e) =>
      feed.push({ weapon: e.weapon, headshot: e.headshot, victim: e.victim }),
    );
    const before = ai.aliveCount;
    const returned = ai.damageRadius(centre, 21, 260, 'airstrike');
    const after = ai.aliveCount;
    offDeath();
    offFeed();

    return {
      shape,
      returned,
      killed: before - after,
      before,
      deaths,
      feed,
      survivors: at.length - (before - after),
    };
  });

  check('query returns exactly the live enemies inside the radius', !!streak && streak.shape.returned === streak.shape.truth, streak ? `${streak.shape.returned} returned, ${streak.shape.truth} within 9 m of ${streak.shape.all} spawned` : 'no ai system');
  check('query entries carry a live id, position and alive flag', !!streak && streak.shape.usable === true && streak.shape.accurate === true);
  check(
    'a man spawned this frame is already a target',
    !!streak && streak.shape.fresh === true,
    streak ? `${streak.shape.freshCount} of 6 readable before the first step` : '',
  );
  check(
    'two queries do not overwrite each other',
    !!streak && streak.shape.independent === true,
    streak ? `${streak.shape.returned} in the footprint, ${streak.shape.all} on the map` : '',
  );
  check(
    'query and aliveCount drop a man when he dies',
    !!streak && streak.shape.afterKill === streak.shape.all - 1 && streak.shape.aliveAfterKill === streak.shape.alive - 1,
    streak ? `${streak.shape.all} -> ${streak.shape.afterKill} hostiles` : '',
  );
  check(
    'an airstrike blast kills what stands in it',
    !!streak && streak.killed > 0,
    streak ? `${streak.killed} of ${streak.before} killed by 260 damage over 21 m` : '',
  );
  check(
    'damageRadius returns the number it killed',
    !!streak && streak.returned === streak.killed,
    streak ? `returned ${streak.returned}, ${streak.killed} died` : '',
  );
  check(
    'every airstrike death carries a usable impulse for the ragdoll',
    !!streak &&
      streak.deaths.length === streak.killed &&
      streak.deaths.every(
        (d) => d.impulse.every(Number.isFinite) && Math.hypot(...d.impulse) > 1 && d.position.every(Number.isFinite),
      ),
    streak ? `${streak.deaths.length} deaths, impulse ${streak.deaths[0] ? Math.hypot(...streak.deaths[0].impulse).toFixed(0) : 0}` : '',
  );
  check(
    'the killfeed names the source that did it',
    !!streak && streak.feed.length === streak.killed && streak.feed.every((f) => f.weapon === 'airstrike'),
    streak && streak.feed[0] ? `"${streak.feed[0].weapon}" on ${streak.feed.length} entries` : '',
  );

  /* -------------------------- weapon system, end to end -------------------- */

  // Everything above tests `IAI.damage` by calling it. This fires the player's
  // actual rifle at an actual soldier and lets the weapon system's raycast find
  // the per-bone collider on its own, which is the only way to know that the
  // hit metadata is right: the head box is registered at scale 2.0 and
  // ballistics calls anything at or above 1.8 a headshot.
  section('Weapon system, end to end');
  const bullet = await page.evaluate(() => {
    const api = window.__AI__;
    const G = window.__GAME__;
    const engine = G.engine;
    const THREE = G.THREE;
    const weapons = window.__WEAPONS__;
    if (!weapons) return { missing: true };
    const physics = engine.tryGet('physics');

    // Bone indices from the rig: 6 is the head, 1 the pelvis.
    const shoot = (bone, rounds) => {
      api.clear();
      const anchor = api.anchor();
      const id = api.spawn(anchor[0], anchor[1], anchor[2], 0);
      api.step(0.3);
      const bones = api.bones(id);
      if (!bones) return null;
      const mark = new THREE.Vector3(bones[bone][0], bones[bone][1], bones[bone][2]);

      // Three metres off, on the first bearing with a clear view of the mark.
      let eye = null;
      for (let i = 0; i < 24 && !eye; i++) {
        const a = (i / 24) * Math.PI * 2;
        const p = new THREE.Vector3(mark.x + Math.cos(a) * 3, mark.y, mark.z + Math.sin(a) * 3);
        if (!physics || physics.lineOfSight(p, mark)) eye = p;
      }
      if (!eye) return null;

      // A full engine frame first: dynamic collider transforms are cached and
      // only invalidated by the physics system's own update, so without one the
      // rifle would be shooting at where the hitboxes used to be.
      G.stepFrames(1);
      engine.camera.position.copy(eye);
      engine.camera.lookAt(mark);
      engine.camera.updateMatrixWorld(true);

      const hits = [];
      const deaths = [];
      const offHit = engine.events.on('enemy:damage', (e) =>
        hits.push({ id: e.id, amount: e.amount, headshot: e.headshot, kind: e.kind }),
      );
      const offDeath = engine.events.on('enemy:death', (e) =>
        deaths.push({ id: e.id, headshot: e.headshot, weapon: e.weapon }),
      );

      weapons.setAds(1);
      weapons.setStill(true);
      weapons.spreadReset();
      weapons.setAmmo(30, 30);
      weapons.reseed();
      const stats = weapons.stats();
      // One round per pull, so the recoil kick cannot walk the second shot off
      // the head and turn a headshot test into a shoulder test.
      for (let i = 0; i < rounds; i++) {
        engine.camera.position.copy(eye);
        engine.camera.lookAt(mark);
        engine.camera.updateMatrixWorld(true);
        weapons.pull();
        weapons.step(0.02, 1 / 240);
        weapons.release();
        weapons.step(0.14, 1 / 240);
      }
      offHit();
      offDeath();
      const a = api.agent(id);
      return {
        id,
        hits,
        deaths,
        health: a ? a.health : null,
        alive: a ? a.alive : null,
        weapon: stats.id ?? stats.name,
        headshotMultiplier: stats.headshotMultiplier,
        baseDamage: stats.damage,
        range: eye.distanceTo(mark),
      };
    };

    return { head: shoot(6, 1), body: shoot(1, 1), burst: shoot(1, 4) };
  });

  if (bullet.missing) {
    check('the weapon system is present to shoot with', false, 'window.__WEAPONS__ missing');
  } else {
    const head = bullet.head;
    const body = bullet.body;
    const burst = bullet.burst;
    check(
      'a round aimed at the head resolves as a headshot',
      !!head && head.hits.length > 0 && head.hits[0].headshot === true,
      head ? `${head.hits.length} hit(s) at ${head.range.toFixed(1)} m with the ${head.weapon}, headshot ${head.hits[0]?.headshot}` : 'no clear firing position',
    );
    check(
      'one headshot kills, and reports itself as one',
      !!head && head.alive === false && head.deaths.length === 1 && head.deaths[0].headshot === true,
      head ? `${head.hits[0]?.amount.toFixed(0)} damage, ${head.deaths.length} death` : '',
    );
    check(
      'a round aimed at the pelvis is not a headshot',
      !!body && body.hits.length > 0 && body.hits[0].headshot === false,
      body ? `${body.hits[0]?.amount.toFixed(0)} damage, alive ${body.alive}` : '',
    );
    check(
      'the head is worth more than the pelvis',
      !!head && !!body && head.hits[0] && body.hits[0] && head.hits[0].amount > body.hits[0].amount * 1.6,
      head && body && head.hits[0] && body.hits[0]
        ? `${head.hits[0].amount.toFixed(0)} against ${body.hits[0].amount.toFixed(0)}`
        : '',
    );
    check(
      'body shots take several rounds to kill',
      !!burst && burst.hits.length >= 2 && burst.hits.slice(0, 2).every((h) => h.headshot === false),
      burst ? `${burst.hits.length} rounds into the pelvis, alive ${burst.alive}, ${burst.health === null ? 'gone' : burst.health.toFixed(0)} health` : '',
    );
  }

  /* -------------------------------- ragdolls ------------------------------ */

  section('Ragdolls');
  const ragdoll = await page.evaluate(() => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    const id = api.spawn(anchor[0], anchor[1], anchor[2], 0);
    api.setPlayer(anchor[0] + 6, anchor[1], anchor[2]);
    api.step(0.4);
    const boneBefore = api.bones(id);
    api.damage(id, 500, true);
    const first = api.ragdoll(id);
    api.step(6);
    const after = api.ragdoll(id);
    if (!after) return null;

    let finite = true;
    let minY = Infinity;
    let maxY = -Infinity;
    let maxSpan = 0;
    for (const p of after.points) {
      for (const c of p) if (!Number.isFinite(c)) finite = false;
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
    for (let i = 0; i < after.points.length; i++) {
      for (let j = i + 1; j < after.points.length; j++) {
        const a = after.points[i];
        const b = after.points[j];
        maxSpan = Math.max(maxSpan, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
      }
    }

    api.step(0.05);
    const moved = api.ragdoll(id);
    let drift = 0;
    for (let i = 0; i < after.points.length; i++) {
      drift = Math.max(
        drift,
        Math.hypot(
          moved.points[i][0] - after.points[i][0],
          moved.points[i][1] - after.points[i][1],
          moved.points[i][2] - after.points[i][2],
        ),
      );
    }

    // Particle layout, mirroring Ragdoll.ts.
    const P = { pelvis: 0, chest: 1, head: 2, elbowL: 3, handL: 4, elbowR: 5, handR: 6, kneeL: 7, footL: 8, kneeR: 9, footR: 10 };
    const span = (pts, a, b) => Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1], pts[a][2] - pts[b][2]);
    // Bone-length invariants: the visible skeleton must not have stretched. The
    // standing pose is measured off the same bones the corpse is drawn from, so
    // any difference is the solver having pulled a limb apart.
    const B = api.boneIndex();
    const bone = (a, b) => Math.hypot(boneBefore[a][0] - boneBefore[b][0], boneBefore[a][1] - boneBefore[b][1], boneBefore[a][2] - boneBefore[b][2]);
    const segments = [
      ['spine', span(after.points, P.pelvis, P.chest), bone(B.pelvis, B.chest)],
      ['left forearm', span(after.points, P.elbowL, P.handL), bone(B.foreL, B.handL)],
      ['right forearm', span(after.points, P.elbowR, P.handR), bone(B.foreR, B.handR)],
      ['left shin', span(after.points, P.kneeL, P.footL), bone(B.calfL, B.footL)],
      ['right shin', span(after.points, P.kneeR, P.footR), bone(B.calfR, B.footR)],
    ];
    let worstStretch = 0;
    let worstSegment = '';
    for (const [name, got, want] of segments) {
      const err = Math.abs(got - want) / Math.max(want, 1e-3);
      if (err > worstStretch) {
        worstStretch = err;
        worstSegment = name;
      }
    }

    // Joint angles, so a pose no living body could hold fails here rather than
    // in a screenshot nobody reads. Measured on the drawn skeleton rather than
    // the particles: the particles have no shoulder or hip, so an elbow angle
    // taken from the chest reads a folded arm as an impossible one, and it is
    // the skeleton the viewer sees anyway. Flexion is measured from straight.
    const deg = (r) => (r * 180) / Math.PI;
    const posed = api.bones(id);
    const flex = (root, mid, end) => {
      const ax = posed[root][0] - posed[mid][0], ay = posed[root][1] - posed[mid][1], az = posed[root][2] - posed[mid][2];
      const bx = posed[end][0] - posed[mid][0], by = posed[end][1] - posed[mid][1], bz = posed[end][2] - posed[mid][2];
      const la = Math.hypot(ax, ay, az), lb = Math.hypot(bx, by, bz);
      if (la < 1e-6 || lb < 1e-6) return 0;
      const cos = Math.max(-1, Math.min(1, (ax * bx + ay * by + az * bz) / (la * lb)));
      return 180 - deg(Math.acos(cos));
    };
    // Angle between the thighs: the frog-leg splay this used to land in.
    const tl = [after.points[P.kneeL][0] - after.points[P.pelvis][0], after.points[P.kneeL][1] - after.points[P.pelvis][1], after.points[P.kneeL][2] - after.points[P.pelvis][2]];
    const tr = [after.points[P.kneeR][0] - after.points[P.pelvis][0], after.points[P.kneeR][1] - after.points[P.pelvis][1], after.points[P.kneeR][2] - after.points[P.pelvis][2]];
    const ltl = Math.hypot(...tl), ltr = Math.hypot(...tr);
    const thighSpread = ltl > 1e-6 && ltr > 1e-6
      ? deg(Math.acos(Math.max(-1, Math.min(1, (tl[0] * tr[0] + tl[1] * tr[1] + tl[2] * tr[2]) / (ltl * ltr)))))
      : 0;

    return {
      started: !!first && first.active,
      settled: after.settled,
      finite,
      groundY: anchor[1],
      minY,
      maxY,
      maxSpan,
      drift,
      worstStretch,
      worstSegment,
      kneeFlex: Math.max(flex(B.thighL, B.calfL, B.footL), flex(B.thighR, B.calfR, B.footR)),
      elbowFlex: Math.max(flex(B.armL, B.foreL, B.handL), flex(B.armR, B.foreR, B.handR)),
      thighSpread,
      kneeApart: span(after.points, P.kneeL, P.kneeR),
      standing: boneBefore[B.pelvis][1],
    };
  });

  check('death starts a ragdoll', !!ragdoll && ragdoll.started === true);
  check('ragdoll contains no NaN', !!ragdoll && ragdoll.finite === true);
  check('ragdoll settles', !!ragdoll && ragdoll.settled === true);
  check(
    'ragdoll comes to rest',
    !!ragdoll && ragdoll.drift < 0.02,
    ragdoll ? `${(ragdoll.drift * 1000).toFixed(1)} mm of movement in the last frame` : '',
  );
  check(
    'ragdoll stays the size of a man',
    !!ragdoll && ragdoll.maxSpan > 0.8 && ragdoll.maxSpan < 2.4,
    ragdoll ? `${ragdoll.maxSpan.toFixed(2)} m across` : '',
  );
  check(
    'ragdoll lies on the ground, not through it or above it',
    !!ragdoll && ragdoll.minY > ragdoll.groundY - 0.4 && ragdoll.maxY < ragdoll.groundY + 1.1,
    ragdoll ? `${(ragdoll.minY - ragdoll.groundY).toFixed(2)} m to ${(ragdoll.maxY - ragdoll.groundY).toFixed(2)} m above the floor` : '',
  );
  check(
    'no limb has stretched',
    !!ragdoll && ragdoll.worstStretch < 0.03,
    ragdoll ? `worst ${(ragdoll.worstStretch * 100).toFixed(1)}% on the ${ragdoll.worstSegment}` : '',
  );
  check(
    'the settled pose is one a body could hold',
    !!ragdoll && ragdoll.kneeFlex < 100 && ragdoll.elbowFlex < 110,
    ragdoll ? `knee ${ragdoll.kneeFlex.toFixed(0)}\u00b0, elbow ${ragdoll.elbowFlex.toFixed(0)}\u00b0 of flexion` : '',
  );
  check(
    'the legs are not splayed into a frog',
    !!ragdoll && ragdoll.thighSpread < 80 && ragdoll.kneeApart < 0.55,
    ragdoll ? `thighs ${ragdoll.thighSpread.toFixed(0)}\u00b0 apart, knees ${ragdoll.kneeApart.toFixed(2)} m` : '',
  );

  /* ---------------------------- believable miss --------------------------- */

  section('Fire discipline');
  const shooting = await page.evaluate(() => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    // The soldier has to be able to see the man he is shooting at, or this
    // measures nothing but the perception system. The showcase finds the spot
    // with the same line-of-sight query the agent's eyes use.
    const id = api.spawn(anchor[0], anchor[1], anchor[2], 0, 'regular');
    const spot = api.openGround(id, 20);
    if (!spot) return null;
    const start = api.agent(id).position;
    api.setPlayer(spot[0], spot[1], spot[2]);
    api.resetPlayerDamage();
    api.step(0.2);
    api.force(id, 'engage');

    // Every round's lateral miss, so the shot cone can be measured as an angle.
    // Hit counts alone cannot tell a cone from a cone that widens with range,
    // and the difference is the whole feel of being shot at.
    const engine = window.__GAME__.engine;
    const lateral = [];
    const offFire = engine.events.on('enemy:fire', (e) => {
      const o = e.origin;
      const d = e.direction;
      const dxz = d.x * d.x + d.z * d.z;
      if (dxz < 1e-8) return;
      const t = ((spot[0] - o.x) * d.x + (spot[2] - o.z) * d.z) / dxz;
      if (t < 1) return;
      const hx = o.x + d.x * t - spot[0];
      const hz = o.z + d.z * t - spot[2];
      lateral.push({ miss: Math.hypot(hx, hz), range: t });
    });

    api.step(1);
    const first = api.playerDamage();
    const early = api.agent(id);
    api.step(6);
    offFire();
    lateral.sort((a, b) => a.miss - b.miss);
    const mid = lateral[Math.floor(lateral.length / 2)];
    const later = api.playerDamage();
    const agent = api.agent(id);
    return {
      firstSecond: first.hits,
      earlySpread: early.spread,
      earlyShots: early.shots,
      total: later.hits,
      damage: later.total,
      shots: agent.shots,
      spread: agent.spread,
      magazine: agent.magazine,
      visible: agent.visible,
      state: agent.state,
      awareness: agent.awareness,
      spot,
      start,
      cover: agent.cover,
      distance: Math.hypot(agent.position[0] - spot[0], agent.position[2] - spot[2]),
      range: Math.hypot(start[0] - spot[0], start[2] - spot[2]),
      rounds: lateral.length,
      coneMiss: mid ? mid.miss : null,
      coneRange: mid ? mid.range : null,
      coneDeg: mid ? (Math.atan2(mid.miss, mid.range) * 180) / Math.PI : null,
    };
  });
  if (OPTS.verbose && shooting) {
    console.log(
      `    spot ${shooting.spot.map((v) => v.toFixed(1)).join(',')}` +
        ` from ${shooting.start.map((v) => v.toFixed(1)).join(',')} cover ${shooting.cover}`,
    );
  }
  check(
    'the enemy engages a target he can see',
    !!shooting && shooting.shots > 4,
    shooting
      ? `${shooting.shots} rounds sent over 7 s at ${shooting.range.toFixed(0)} m` +
        ` (${shooting.state}, ${shooting.visible ? 'visible' : 'lost'}, ${shooting.distance.toFixed(0)} m out)`
      : 'no open bearing found',
  );
  check(
    'the first second of contact is survivable',
    !!shooting && shooting.firstSecond * 17 < 60,
    shooting ? `${shooting.firstSecond} hits in the first second` : '',
  );
  check(
    'sustained fire does eventually connect',
    !!shooting && shooting.total > shooting.firstSecond && shooting.damage > 0,
    shooting ? `${shooting.total} hits over 7 s, ${shooting.damage.toFixed(0)} damage` : '',
  );
  // The shot cone is an angle, and the failure this catches is it not being one.
  // The error the profiles quote was being multiplied by the metres to the
  // target and then used as a direction offset, so the cone opened linearly with
  // range: a regular's settled 0.6° became 12° at twenty metres. Measured as an
  // angle the difference is unmistakable, and unlike a hit count it barely
  // varies between runs.
  check(
    'the shot cone is an angle, not a cone that opens with range',
    !!shooting && shooting.coneDeg !== null && shooting.coneDeg > 0.2 && shooting.coneDeg < 6,
    shooting && shooting.coneDeg !== null
      ? `median round passes ${shooting.coneMiss.toFixed(2)} m wide at ${shooting.coneRange.toFixed(0)} m, ${shooting.coneDeg.toFixed(2)}° off, over ${shooting.rounds} rounds`
      : 'no rounds observed',
  );
  check(
    'aim converges rather than staying random',
    !!shooting && shooting.spread < shooting.earlySpread * 0.85,
    shooting
      ? `${((shooting.earlySpread * 180) / Math.PI).toFixed(2)} deg -> ${((shooting.spread * 180) / Math.PI).toFixed(2)} deg`
      : '',
  );

  /* ------------------------------ performance ----------------------------- */

  section('Performance');
  const perf = await page.evaluate(async () => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    api.setPlayer(anchor[0], anchor[1], anchor[2]);
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const radius = 12 + (i % 4) * 4;
      const id = api.spawn(
        anchor[0] + Math.cos(angle) * radius,
        anchor[1],
        anchor[2] + Math.sin(angle) * radius,
        angle + Math.PI,
      );
      api.force(id, 'engage');
    }
    api.step(2);
    const count = api.count();

    // Measure the AI's own update, not the software rasteriser's frame.
    const samples = [];
    for (let i = 0; i < 240; i++) {
      api.stepFrames(1);
      samples.push(api.stats().updateMs);
    }
    samples.sort((a, b) => a - b);
    const sum = samples.reduce((a, b) => a + b, 0);
    return {
      count,
      mean: sum / samples.length,
      median: samples[Math.floor(samples.length / 2)],
      p95: samples[Math.floor(samples.length * 0.95)],
      max: samples[samples.length - 1],
      stats: api.stats(),
    };
  });
  check('16 agents alive', perf.count >= 16, `${perf.count} agents`);
  check(
    'AI update fits the frame budget with 16 agents',
    perf.median < 4,
    `median ${perf.median.toFixed(2)} ms, p95 ${perf.p95.toFixed(2)} ms, worst ${perf.max.toFixed(2)} ms`,
  );
  check(
    'no frame spikes from pathfinding',
    perf.p95 < 8,
    `p95 ${perf.p95.toFixed(2)} ms against a 16.7 ms frame`,
  );

  /* -------------------------------- budget -------------------------------- */

  section('Model budget');
  const tris = await page.evaluate(() => window.__AI__.triangles());
  for (const [key, value] of Object.entries(tris)) {
    if (key.endsWith('_lod0')) {
      // Raised deliberately. An art review called the 6.4k version a shop
      // dummy and pointed out that a modern shooter spends 30-60k on a soldier,
      // that the level is already at 1.99M, and that sixteen men at 20k is 320k
      // and affordable. The floor is here to catch a variant that failed to
      // build its kit and shipped a mannequin again; the ceiling is here because
      // sixteen of these have to fit in a frame with a town behind them.
      check(`${key} is a fully kitted soldier, 18-34k triangles`, value >= 18000 && value <= 34000, `${value} triangles`);
    }
  }
  // Eighteen geometries authored from primitives at boot, on the main thread,
  // before the first frame. Worth a bar of its own: the budget went up nearly
  // fourfold this round and the cost of building it is paid in load time, which
  // is the one place a procedural model can quietly become expensive.
  const buildMs = await page.evaluate(() => window.__AI__.assetBuildMs());
  check(
    'the whole set of soldiers is authored in a fraction of a second',
    buildMs > 0 && buildMs < 600,
    `${buildMs.toFixed(0)} ms for six variants at three levels of detail`,
  );
  for (const [key, value] of Object.entries(tris)) {
    if (!key.endsWith('_lod1')) continue;
    check(`${key} is a genuine reduction`, value < (tris[key.replace('_lod1', '_lod0')] ?? 1e9) * 0.45, `${value} triangles`);
  }
  for (const [key, value] of Object.entries(tris)) {
    if (!key.endsWith('_lod2')) continue;
    check(
      `${key} is leaner again for the far band`,
      value < (tris[key.replace('_lod2', '_lod1')] ?? 1e9) * 0.8,
      `${value} triangles`,
    );
  }

  /* ----------------------------- proportions ------------------------------- */

  section('Proportions and wear');
  const shape = await page.evaluate(() => window.__AI__.proportions());
  check('every variant is measurable', shape.length >= 6, `${shape.length} variants`);
  const headsTall = shape.map((v) => v.headsTall);
  check(
    'the figure is about seven and a half heads tall',
    headsTall.every((h) => h > 7.0 && h < 7.9),
    `${Math.min(...headsTall).toFixed(2)}-${Math.max(...headsTall).toFixed(2)} heads`,
  );
  const shoulders = shape.map((v) => v.shouldersInHeads);
  check(
    'shoulders are 2.1 to 2.5 head heights across',
    shoulders.every((s) => s > 2.1 && s < 2.5),
    `${Math.min(...shoulders).toFixed(2)}-${Math.max(...shoulders).toFixed(2)} heads`,
  );
  const necks = shape.map((v) => v.neckOverHead);
  check(
    'the neck is not a stalk under the helmet',
    necks.every((n) => n > 0.68 && n < 0.9),
    `${Math.min(...necks).toFixed(2)}-${Math.max(...necks).toFixed(2)} of skull breadth`,
  );
  const hands = shape.map((v) => v.handInHeads);
  check(
    'the gloved fist is the size of a fist',
    hands.every((h) => h > 0.54 && h < 0.72),
    `${Math.min(...hands).toFixed(2)}-${Math.max(...hands).toFixed(2)} head heights`,
  );
  const sds = shape.map((v) => v.clothSd);
  check(
    'cloth albedo varies rather than being one flat value',
    sds.every((s) => s >= 15),
    `standard deviation ${Math.min(...sds).toFixed(1)}-${Math.max(...sds).toFixed(1)} on 0-255, against the 6.8 the review called flat`,
  );
  // The other half of the review's cloth complaint, and the half a colour cannot
  // answer: a limb of constant radius. Measured as the depth of the creases
  // running round the shin, off the chord between their neighbouring rings, so
  // the taper of the leg is not in it. The same profile with the crease warp
  // switched off reads 0.47-0.51 mm, which is the designed shape of the trouser;
  // real cloth folds are 3-15 mm and these are 2-3.
  const relief = shape.map((v) => v.clothReliefMm);
  check(
    'the trouser has folds in it rather than being shrink-wrapped',
    relief.every((r) => r > 1.5 && r < 12),
    `${Math.min(...relief).toFixed(1)}-${Math.max(...relief).toFixed(1)} mm of crease depth on the shin, against 0.5 for a smooth sweep`,
  );
  const kit = shape.map((v) => v.kitVolumes);
  check(
    'every man carries enough kit to break his outline',
    kit.every((k) => k >= 30),
    `${Math.min(...kit)}-${Math.max(...kit)} volumes standing proud of the body`,
  );
  // Two men who differ only in colour still read as one man at range.
  const configs = new Set(
    shape.map((v) => `${v.kitVolumes}:${v.headsTall.toFixed(3)}:${v.shouldersInHeads.toFixed(3)}`),
  );
  check(
    'no two variants have the same silhouette',
    configs.size === shape.length,
    `${configs.size} distinct outlines across ${shape.length} variants`,
  );

  /*
   * Everything above measures a mesh nobody was looking at.
   *
   * A vantage steps its scene with the camera parked wherever the previous shot
   * left it, then moves the lens onto its subject. Detail was picked during the
   * stepping, so the portrait vantage — three and a half metres from the man it
   * exists to photograph — was assigning him the thirty-metre mesh and holding
   * it through the shot. Four rounds of art notes about a soft, bloated,
   * detail-free soldier were notes on the 5k distance mesh. Nothing else here
   * catches it: the geometry is correct, the proportions are correct, and the
   * wrong one is on screen.
   */
  const posed = await page.evaluate(() => {
    const api = window.__AI__;
    const out = [];
    for (const name of ['ai_soldier', 'ai_cover']) {
      window.__GAME__.pose(name);
      const cam = window.__GAME__.engine.camera.position;
      let nearest = null;
      for (const a of api.agents()) {
        const d = Math.hypot(a.position[0] - cam.x, a.position[1] - cam.y, a.position[2] - cam.z);
        if (!nearest || d < nearest.metres) nearest = { metres: d, lod: a.lod, variant: a.variant };
      }
      out.push({ name, ...nearest });
    }
    return out;
  });
  for (const p of posed) {
    check(
      `${p.name} photographs its subject at full detail`,
      p.metres > 34 || p.lod === 0,
      `${p.variant} at ${p.metres.toFixed(1)} m drawn at lod${p.lod}`,
    );
  }

  /* ------------------------------ the flash -------------------------------- */

  /*
   * A scene that says it stops on a round has to stop on one.
   *
   * The muzzle flash was unphotographable for a long time and the reason was
   * never the same twice: first the effects clock was not stepped with the AI,
   * so every flash a scene fired piled up at one age; then it was stepped but
   * the result was deliberately aged another 25 ms, which is past the end of a
   * 32 ms core. Both failures look identical from outside — a street full of
   * men holding rifles — and neither shows up in any other assertion here, so
   * the scene reports whether it caught a live round and this checks it did.
   */
  section('Muzzle flash');
  const flash = await page.evaluate(() => {
    const api = window.__AI__;
    api.scenes.cover();
    return { held: api.shotHeld(), particles: window.__FX__?.stats?.().particles ?? null };
  });
  check(
    'the cover scene stops on a live round',
    flash.held === true,
    flash.held ? 'flash held at one frame of age' : 'no round fired inside the scene',
  );
  if (flash.particles !== null) {
    check(
      'the flash and its smoke are still alive in the frozen frame',
      flash.particles > 0,
      `${flash.particles} particles held`,
    );
  }

  /* -------------------------------- disable ------------------------------- */

  section('Harness behaviour');
  const disabled = await page.evaluate(() => {
    const api = window.__AI__;
    api.clear();
    const anchor = api.anchor();
    const id = api.spawn(anchor[0], anchor[1], anchor[2], 0);
    api.setPlayer(anchor[0] + 8, anchor[1], anchor[2]);
    api.force(id, 'engage');
    api.enabled(false);
    const before = api.agent(id);
    api.stepFrames(60);
    const after = api.agent(id);
    api.enabled(true);
    return {
      moved: Math.hypot(after.position[0] - before.position[0], after.position[2] - before.position[2]),
      awarenessDelta: Math.abs(after.awareness - before.awareness),
    };
  });
  check(
    'setEnabled(false) freezes the AI',
    disabled.moved < 1e-6 && disabled.awarenessDelta < 1e-6,
    `moved ${disabled.moved.toFixed(6)} m over 60 frames`,
  );

  /* --------------------------------- done --------------------------------- */

  const errors = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'));
  if (errors.length) {
    console.log(`\n${errors.length} console error(s):`);
    for (const e of errors.slice(0, 20)) console.log('   ', e);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    console.log('Failures:');
    for (const f of failures) console.log('  -', f);
  }

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
