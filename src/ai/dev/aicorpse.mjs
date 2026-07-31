#!/usr/bin/env node
/**
 * Corpse divergence trace.
 *
 * A screenshot showed three of five corpses missing from the frame while the
 * probe reported their skinned bounds spanning hundreds of kilometres, so
 * something in the death path is throwing bone transforms to infinity. A capture
 * costs a minute and reports one instant; this kills a line of soldiers and then
 * samples every corpse every frame, so the answer is which path (ragdoll or
 * procedural collapse), which bone goes first, and whether it explodes on the
 * death frame or grows over several.
 *
 * Usage: node src/ai/dev/aicorpse.mjs [--count 6] [--quality medium] [--seconds 6]
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
};

const ROOT = '/workspace';
const DIST = arg('dist', 'dist-ai');
const PORT = Number(arg('port', '4207'));
const COUNT = Number(arg('count', '6'));
const SECONDS = Number(arg('seconds', '6'));
const QUALITY = arg('quality', 'medium');

try {
  execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
} catch {}

const server = spawn(
  'npx',
  ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1', '--outDir', DIST],
  { cwd: ROOT, stdio: 'pipe', detached: true },
);
server.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));
const kill = () => {
  try {
    process.kill(-server.pid, 'SIGKILL');
  } catch {
    server.kill('SIGKILL');
  }
};
process.on('exit', kill);

const base = `http://127.0.0.1:${PORT}/`;
for (let i = 0; i < 150; i++) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 400));
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
  ],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
const logs = [];
page.on('console', (m) => {
  if (m.type() === 'error') logs.push(`[error] ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(`${base}?quality=${QUALITY}&capture=1`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
await page.waitForTimeout(4000);

const setup = await page.evaluate(([count, noImpulse, bend, spread, noPoint, gap, render]) => {
  const g = window.GAME;
  const ai = g.tryGet('ai');
  const world = g.get('world');
  const player = g.tryGet('player');
  // Rendering off is what makes the trace cheap, but it also means nothing calls
  // `scene.updateMatrixWorld`, so any bone the ragdoll does not drive itself reads
  // as stale. Kept switchable because "is the corpse really down there" and "is my
  // measurement stale" are the same number otherwise.
  if (!render) g.renderHook = () => {};
  g.setAdaptiveResolution(false);

  // Experiments, run by intercepting the ragdoll build rather than by rebuilding
  // the bundle: what the solver is given is the only variable that matters.
  const physics = g.get('physics');
  const V = g.camera.position.constructor;
  // What the hinge joints will be built from: the angle between the two capsule
  // directions, and the angle between the local +X axes the revolute joint uses as
  // its shared axis. Both have to be zero or the joint starts out of frame.
  window.__HINGE = [];
  {
    const original = physics.createRagdoll.bind(physics);
    const Q = g.camera.quaternion.constructor;
    physics.createRagdoll = (skeleton, root, opts) => {
      const bones = new Map();
      root.traverse((o) => bones.set(o.name, o));
      const at = (name) => new V().setFromMatrixPosition(bones.get(name).matrixWorld);
      const dir = (a, b) => at(b).sub(at(a)).normalize();
      const axis = (d) => new V(1, 0, 0).applyQuaternion(new Q().setFromUnitVectors(new V(0, 1, 0), d));
      const deg = (a, b) => +((Math.acos(Math.min(1, Math.max(-1, a.dot(b)))) * 180) / Math.PI).toFixed(1);
      const row = {};
      for (const [id, a, b, c] of [
        ['knееL', 'LeftUpLeg', 'LeftLeg', 'LeftFoot'],
        ['kneeR', 'RightUpLeg', 'RightLeg', 'RightFoot'],
        ['elbowL', 'LeftArm', 'LeftForeArm', 'LeftHand'],
        ['elbowR', 'RightArm', 'RightForeArm', 'RightHand'],
      ]) {
        const upper = dir(a, b);
        const lower = dir(b, c);
        row[id] = { bone: deg(upper, lower), axis: deg(axis(upper), axis(lower)) };
      }
      window.__HINGE.push(row);
      return original(skeleton, root, opts);
    };
  }

  if (noImpulse || bend || spread || noPoint) {
    const original = physics.createRagdoll.bind(physics);
    physics.createRagdoll = (skeleton, root, opts) => {
      const bones = new Map();
      root.traverse((o) => bones.set(o.name, o));
      if (bend) {
        // Take each hinge a little off its limit stop, about roughly the axis the
        // capsule frames use, in case sitting exactly on the stop is the trigger.
        const Q = g.camera.quaternion.constructor;
        for (const [name, sign] of [
          ['LeftLeg', -1],
          ['RightLeg', -1],
          ['LeftForeArm', 1],
          ['RightForeArm', 1],
        ]) {
          const bone = bones.get(name);
          if (!bone) continue;
          bone.quaternion.multiply(new Q().setFromAxisAngle(new V(1, 0, 0), sign * bend));
        }
      }
      if (spread) {
        for (const [name, sign] of [
          ['LeftArm', -1],
          ['RightArm', 1],
        ]) {
          const bone = bones.get(name);
          if (!bone) continue;
          bone.quaternion.multiply(
            new g.camera.quaternion.constructor().setFromAxisAngle(new V(0, 0, 1), sign * spread),
          );
        }
      }
      root.updateWorldMatrix(false, true);
      let options = opts;
      if (noImpulse) options = { impulse: new V(0, 0.001, 0), impulsePoint: opts && opts.impulsePoint };
      // A point impulse spins the capsule it lands on; without a point the whole
      // body just gets linear momentum through its heaviest part.
      else if (noPoint) options = { impulse: opts && opts.impulse };
      return original(skeleton, root, options);
    };
  }
  ai.setSpawningEnabled(false);
  ai.director.targetAlive = 0;
  ai.director.clear(ai.bb);

  const eye = g.camera.position.clone();
  const at = new V();
  const ids = [];
  for (let i = 0; i < count; i++) {
    const x = eye.x + (i - (count - 1) / 2) * gap;
    const z = eye.z - 6;
    const y = world.sampleGround(x, z);
    if (y === null) continue;
    at.set(x, y, z);
    const e = ai.spawnEnemy(at, Math.PI, undefined);
    if (e) ids.push(e.id);
  }
  // Held for inspection so nobody runs off or shoots the player while the trace
  // is measuring the corpses.
  for (const enemy of ai.director.all) enemy.posed = true;
  player.entity.health = player.entity.maxHealth;

  const trace = { frames: 0, samples: [], firstBad: null };
  window.__CORPSE = trace;

  const fin = (n) => Number.isFinite(n);
  // Displacement from the feet is the number that matters, not the absolute
  // coordinate: a bone six metres sideways of a corpse at z = 40 has the same
  // magnitude as one still in its socket.
  const worst = (enemy) => {
    let far = 0;
    let name = '-';
    let scale = 0;
    let nonFinite = null;
    const feet = enemy.feet;
    // The guard's own metric: displacement from the hips, which is what says the
    // body has come apart rather than merely travelled.
    const hips = enemy.model.bones[0].matrixWorld.elements;
    let span = 0;
    let spanBone = '-';
    // The eleven the ragdoll drives; the rest are only as fresh as the last render.
    for (const i of [0, 3, 5, 7, 8, 11, 12, 14, 15, 18, 19]) {
      const bone = enemy.model.bones[i];
      const e = bone.matrixWorld.elements;
      const d = Math.hypot(e[12] - hips[12], e[13] - hips[13], e[14] - hips[14]);
      if (d > span) {
        span = d;
        spanBone = bone.name;
      }
    }
    for (const bone of enemy.model.bones) {
      const e = bone.matrixWorld.elements;
      for (let k = 0; k < 16; k++) {
        if (!fin(e[k])) {
          nonFinite = nonFinite ?? bone.name;
          break;
        }
      }
      const d = Math.hypot(e[12] - feet.x, e[13] - feet.y, e[14] - feet.z);
      if (d > far) {
        far = d;
        name = bone.name;
      }
      const s = Math.max(
        Math.hypot(e[0], e[1], e[2]),
        Math.hypot(e[4], e[5], e[6]),
        Math.hypot(e[8], e[9], e[10]),
      );
      if (s > scale) scale = s;
    }
    return { far, name, scale, nonFinite, span, spanBone };
  };

  // The three numbers the sink guard actually compares, so a fault can be read as
  // either a body falling through the floor or a floor sampled off the wrong layer.
  const heights = (enemy) => {
    const hips = enemy.model.bones[0].matrixWorld.elements;
    const anchor = enemy.deathAnchor;
    const ground = ai.bb.surfaceAt(hips[12], hips[14], hips[13]);
    return {
      hipY: +hips[13].toFixed(2),
      anchorY: +anchor.y.toFixed(2),
      ground: ground === null ? null : +ground.toFixed(2),
      // What the collision world says is under him, which is what he actually falls onto.
      trace: (() => {
        const h = ai.bb.traceGround(hips[12], hips[13] + 0.4, hips[14], 6);
        return h === null ? null : +h.toFixed(2);
      })(),
    };
  };

  const sample = (phase) => {
    for (const enemy of ai.director.all) {
      if (!enemy.dying) continue;
      const w = worst(enemy);
      const row = {
        f: trace.frames,
        p: phase,
        id: enemy.id,
        rag: enemy.ragdoll
          ? enemy.ragdoll.settled
            ? 'settled'
            : 'active'
          : enemy.ragdollAbandoned
            ? 'abandoned'
            : 'none',
        root: [+enemy.model.root.position.x.toFixed(2), +enemy.model.root.position.y.toFixed(2)],
        far: +w.far.toFixed(3),
        span: +w.span.toFixed(3),
        spanBone: w.spanBone,
        bone: w.name,
        scale: +w.scale.toFixed(4),
        nonFinite: w.nonFinite,
        fault: enemy.ragdollFault || null,
        h: heights(enemy),
      };
      if (trace.samples.length < 8000) trace.samples.push(row);
      if (!trace.firstBad && (w.far > 20 || w.nonFinite || w.scale > 4)) trace.firstBad = row;
    }
  };

  const update = ai.update.bind(ai);
  ai.update = (dt, ctx) => {
    // Sampled either side of the AI, because the guard that abandons a ragdoll
    // resets the pose it rejected: only the `pre` row still holds the evidence.
    trace.frames++;
    sample('pre');
    update(dt, ctx);
    sample('post');
  };
  return { spawned: ids.length, eye: [eye.x, eye.y, eye.z] };
}, [
  COUNT,
  process.argv.includes('--noimpulse'),
  Number(arg('bend', '0')),
  Number(arg('spread', '0')),
  process.argv.includes('--nopoint'),
  Number(arg('gap', '1.6')),
  process.argv.includes('--render'),
]);
console.log(`staged ${JSON.stringify(setup)}`);

await page.waitForTimeout(2500);
const killed = await page.evaluate((impulse) => {
  const g = window.GAME;
  const ai = g.tryGet('ai');
  const V = g.camera.position.constructor;
  const point = new V();
  const direction = new V(0, 0.15, -1).normalize();
  let n = 0;
  for (const enemy of ai.director.all) {
    if (!enemy.isAlive) continue;
    enemy.getPosition(point);
    point.y += 1.3;
    enemy.applyDamage({
      amount: 500,
      source: g.tryGet('player').entity,
      point,
      direction,
      bodyPart: 'chest',
      type: 'bullet',
      impulse,
      weaponId: 'corpse_probe',
    });
    n++;
  }
  window.__CORPSE.frames = 0;
  window.__CORPSE.samples.length = 0;
  return n;
}, Number(arg('impulse', '90')));
console.log(`killed ${killed}`);
await page.waitForTimeout(SECONDS * 1000);

console.log(`hinge frames at build:\n  ${(await page.evaluate(() => window.__HINGE)).map((r) => JSON.stringify(r)).join('\n  ')}`);

const result = await page.evaluate(() => {
  const t = window.__CORPSE;
  const byId = new Map();
  for (const row of t.samples) {
    if (!byId.has(row.id)) byId.set(row.id, []);
    byId.get(row.id).push(row);
  }
  const summary = [];
  for (const [id, rows] of byId) {
    const bad = rows.find((r) => r.far > 20 || r.nonFinite || r.scale > 4);
    // Whichever is more interesting: the divergence, or the frame the guard
    // decided to throw the ragdoll away.
    const focus = bad ?? rows.find((r) => r.rag === 'abandoned');
    summary.push({
      id,
      frames: rows.length,
      ragdolled: rows.some((r) => r.rag === 'active' || r.rag === 'settled'),
      settled: rows.some((r) => r.rag === 'settled'),
      abandoned: rows.some((r) => r.rag === 'abandoned'),
      fault: rows.find((r) => r.fault)?.fault ?? null,
      firstBadFrame: bad ? bad.f : null,
      peakFar: Math.max(...rows.map((r) => r.far)),
      peakSpan: Math.max(...rows.map((r) => r.span)),
      worstSpanRow: rows.reduce((a, b) => (a.span > b.span ? a : b)),
      spanBeforeAbandon: (() => {
        const i = rows.findIndex((r) => r.rag === 'abandoned');
        return i > 0 ? { span: rows[i - 1].span, bone: rows[i - 1].spanBone, f: rows[i - 1].f } : null;
      })(),
      window: focus ? rows.filter((r) => Math.abs(r.f - focus.f) <= 2) : rows.slice(0, 4),
      last: rows[rows.length - 1],
    });
  }
  return { frames: t.frames, summary };
});

for (const s of result.summary) {
  console.log(
    `#${s.id} frames=${s.frames} ragdoll=${s.ragdolled} settled=${s.settled} ` +
      `abandoned=${s.abandoned} fault=${s.fault ?? '-'} firstBad=${s.firstBadFrame ?? '-'} ` +
      `peakFar=${s.peakFar.toFixed(2)} peakSpan=${s.peakSpan.toFixed(2)} ` +
      `worstSpan=${JSON.stringify(s.worstSpanRow)}`,
  );
  for (const w of s.window) console.log(`    ${JSON.stringify(w)}`);
}

// The whole time series for the worst offender: a step change says something hit
// it, a steady ramp says it is already flying.
if (process.argv.includes('--series')) {
  const worst = result.summary.reduce((a, b) => (a.peakFar > b.peakFar ? a : b));
  const rows = await page.evaluate(
    (id) => window.__CORPSE.samples.filter((r) => r.id === id && r.p === 'post'),
    worst.id,
  );
  console.log(`\nseries for #${worst.id}:`);
  for (const r of rows.slice(0, 70)) {
    console.log(`  f=${String(r.f).padStart(3)} far=${r.far.toFixed(2)} span=${r.span.toFixed(2)} rag=${r.rag}`);
  }
}
console.log(`\nconsole issues: ${logs.length}`);
for (const line of [...new Set(logs)].slice(0, 8)) console.log(line);
await browser.close();
kill();
