#!/usr/bin/env node
/**
 * Behaviour verification.
 *
 * A screenshot proves the soldiers look right; it says nothing about whether they
 * fight right. This harness stages a firefight the AI cannot avoid — a ring of
 * agents around a player who is held alive and never shoots back — and records
 * what the module actually does: state transitions per agent, how long each one
 * takes to fire after it first sees the target, how many shots it lands, whether
 * cover is ever double-claimed, whether suppression and grenades happen at all,
 * and whether corpses ragdoll and settle.
 *
 * Usage: node src/ai/dev/aitrace.mjs [--agents 10] [--seconds 45] [--difficulty veteran]
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
};

const ROOT = '/workspace';
const OUT = `${ROOT}/${arg('out', 'shots/ai')}`;
const DIST = arg('dist', 'dist-ai');
const PORT = Number(arg('port', '4199'));
const AGENTS = Number(arg('agents', '10'));
const SECONDS = Number(arg('seconds', '45'));
const DIFFICULTY = arg('difficulty', 'veteran');
// `low` disables ragdolls outright, so the corpse path can only be verified at
// medium or above. Medium allows four at once, which is the interesting case:
// some deaths ragdoll and the rest fall back to the procedural collapse.
const QUALITY = arg('quality', 'medium');
// Control run: boot, clear the population and sit there. Anything the console
// reports with nothing of ours in the world is not ours.
const CONTROL = process.argv.includes('--control');

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
await mkdir(OUT, { recursive: true });

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
    '--js-flags=--max-old-space-size=4096',
  ],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
// Timestamped so a trap can be placed relative to the phases of the run: whether
// it lands during the firefight or the moment the corpses are made is most of the
// diagnosis.
const START = Date.now();
const stamp = () => `+${((Date.now() - START) / 1000).toFixed(1)}s`;
const logs = [];
page.on('console', (m) => {
  if (m.type() === 'error') logs.push(`[${stamp()}][error] ${m.text()}`);
});
page.on('pageerror', (e) =>
  logs.push(`[${stamp()}][pageerror] ${e.message}\n${e.stack ?? '(no stack)'}`),
);

await page.goto(`${base}?quality=${QUALITY}&capture=1`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
await page.waitForTimeout(5000);
await page.evaluate(
  ([control, nullSkeleton]) => {
    window.__AI_CONTROL = control;
    // Experiment: the physics module documents a null skeleton as fully supported,
    // synthesising the layout from human proportions instead of reading ours. If a
    // trap goes away under this, the capsules built from our bones are the trigger.
    if (nullSkeleton) {
      const physics = window.GAME.get('physics');
      const original = physics.createRagdoll.bind(physics);
      physics.createRagdoll = (_skeleton, root, opts) => original(null, root, opts);
    }
  },
  [CONTROL, process.argv.includes('--nullskel')],
);

// Presentation off: the software rasteriser would otherwise hold the simulation
// at ~10 Hz and every timing in the trace would be measured against the wrong
// clock. Everything else about the frame is unchanged.
await page.evaluate(
  ([agents, difficulty]) => {
    const g = window.GAME;
    const ai = g.tryGet('ai');
    const world = g.get('world');
    const physics = g.get('physics');
    const player = g.tryGet('player');
    g.renderHook = () => {};
    g.setAdaptiveResolution(false);
    ai.setDifficulty(difficulty);

    // Open ground with sight lines in most directions, so the ring of agents
    // starts with line of sight rather than pathing round a building first.
    const V = g.camera.position.constructor;
    const from = new V();
    const to = new V();
    let best = null;
    for (let x = -30; x <= 30; x += 4) {
      for (let z = -30; z <= 30; z += 4) {
        const y = world.sampleGround(x, z);
        if (y === null) continue;
        from.set(x, y + 1.6, z);
        let seen = 0;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const sx = x + Math.cos(a) * 15;
          const sz = z + Math.sin(a) * 15;
          const sy = world.sampleGround(sx, sz);
          if (sy === null) continue;
          to.set(sx, sy + 1.5, sz);
          if (physics.lineOfSight(from, to)) seen++;
        }
        if (!best || seen > best.seen) best = { x, y, z, seen };
      }
    }
    const centre = best ?? { x: 0, y: world.sampleGround(0, 0) ?? 0, z: 0, seen: 0 };
    player.teleport(g.camera.position.clone().set(centre.x, centre.y + 0.05, centre.z), 0);

    ai.setSpawningEnabled(false);
    ai.director.targetAlive = 0;
    ai.director.maxAlive = Math.max(ai.director.maxAlive, agents + 4);
    ai.director.clear(ai.bb);

    const at = new V();
    const ids = [];
    for (let i = 0; i < (window.__AI_CONTROL ? 0 : agents); i++) {
      const angle = (i / agents) * Math.PI * 2;
      const radius = 13 + (i % 4) * 4;
      const x = centre.x + Math.cos(angle) * radius;
      const z = centre.z + Math.sin(angle) * radius;
      const y = world.sampleGround(x, z);
      if (y === null) continue;
      at.set(x, y, z);
      const e = ai.spawnEnemy(at, Math.atan2(centre.x - x, centre.z - z) + Math.PI, undefined);
      if (e) ids.push(e.id);
    }

    // ---------------------------------------------------------------------
    // Recording
    // ---------------------------------------------------------------------
    const fin3 = (v) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
    const trace = {
      centre,
      ids,
      t0: g.time.elapsed,
      frames: 0,
      // Per agent: first time seen / first shot, so reaction time is measurable.
      agents: new Map(),
      transitions: [],
      stateSeconds: {},
      shotsFired: 0,
      hitsOnPlayer: 0,
      headshotsOnPlayer: 0,
      nearMisses: 0,
      suppressCalls: 0,
      explosions: 0,
      grenadesThrown: 0,
      playerDeaths: 0,
      enemyDeaths: 0,
      ragdolls: 0,
      settled: 0,
      coverConflicts: 0,
      claimedPeak: 0,
      focusedPeak: 0,
      nan: [],
      reactions: [],
      peeks: 0,
      burstLengths: [],
      damageToPlayer: 0,
    };
    window.__AI_TRACE = trace;

    const playerEntity = player.entity;
    let alerts = 0;
    g.events.on('ai:alerted', () => alerts++);
    g.events.on('combat:hit', (e) => {
      // Only the AI is shooting in this harness, so any hit on the player is
      // theirs; the attacker check keeps a stray explosion out of the count.
      if (e.attacker && e.attacker !== playerEntity) {
        trace.hitsOnPlayer++;
        trace.damageToPlayer += e.damage;
        if (e.isHeadshot) trace.headshotsOnPlayer++;
      }
    });
    g.events.on('combat:nearmiss', () => trace.nearMisses++);
    g.events.on('combat:explosion', (e) => {
      trace.explosions++;
      if (e.kind === 'grenade') trace.grenadesThrown++;
    });
    g.events.on('player:death', () => trace.playerDeaths++);
    g.events.on('combat:kill', (e) => {
      if (e.victim !== playerEntity) trace.enemyDeaths++;
    });

    // Wrap suppress so the count is what the AI was actually told, not a guess.
    const suppress = ai.suppress.bind(ai);
    ai.suppress = (p, r, d) => {
      trace.suppressCalls++;
      suppress(p, r, d);
    };

    // Sample the population once per frame from a hook on the AI update, after it
    // has run, so states are the ones the agents just decided on.
    const update = ai.update.bind(ai);
    ai.update = (dt, ctx) => {
      update(dt, ctx);
      const now = ctx.time.elapsed;
      trace.frames++;
      const claims = new Map();
      for (const enemy of ai.director.all) {
        let rec = trace.agents.get(enemy.id);
        if (!rec) {
          rec = {
            id: enemy.id,
            archetype: enemy.archetype.id,
            state: null,
            sawAt: null,
            armed: false,
            wasSeeing: false,
            shots: 0,
            peeks: 0,
            wasPeeking: false,
            states: [],
            death: null,
            ragdoll: false,
            maxAwareness: 0,
          };
          trace.agents.set(enemy.id, rec);
        }
        const state = enemy.behavior.state;
        rec.maxAwareness = Math.max(rec.maxAwareness, enemy.perception.awareness);
        trace.stateSeconds[state] = (trace.stateSeconds[state] ?? 0) + dt;
        if (state !== rec.state) {
          trace.transitions.push({
            t: +(now - trace.t0).toFixed(2),
            id: enemy.id,
            from: rec.state,
            to: state,
          });
          rec.states.push(state);
          rec.state = state;
        }
        // Reaction is measured per engagement, not once per lifetime: the clock
        // starts every time an agent reacquires the target after losing it, which
        // is the moment the player cares about. Losing sight arms it again.
        //
        // Range-gated, because a marksman that "sees" you at sixty metres with a
        // forty metre engagement range does not shoot until it has closed, and
        // counting that walk as reaction time buries the number that matters.
        const sees = enemy.perception.visible && enemy.perception.distance <= enemy.archetype.maxRange;
        if (sees && !rec.wasSeeing) {
          rec.sawAt = now;
          rec.armed = true;
        }
        rec.wasSeeing = sees;

        // Counted from the agent's own tally rather than an event: rounds go
        // straight through `combat.fireBullet` and never raise `weapon:fire`,
        // which belongs to the player's weapon.
        const fired = enemy.combatant.shotsFired ?? 0;
        if (fired > rec.shots) {
          if (rec.armed && rec.sawAt !== null) {
            rec.armed = false;
            trace.reactions.push(+(now - rec.sawAt).toFixed(3));
          }
          trace.shotsFired += fired - rec.shots;
          rec.shots = fired;
        }
        if (enemy.dying && rec.death === null) rec.death = +(now - trace.t0).toFixed(2);
        // Checked every frame, not just on the death frame: the module defers
        // ragdoll creation when several men die at once, so a corpse can acquire one
        // a frame or two after it stops being alive.
        if (!rec.ragdoll && enemy.ragdoll !== null) {
          rec.ragdoll = true;
          trace.ragdolls++;
        }
        if (enemy.peeking && !rec.wasPeeking) {
          rec.peeks++;
          trace.peeks++;
        }
        rec.wasPeeking = enemy.peeking;
        // Two agents in the same cover slot is the bug the claim registry exists
        // to stop, so assert on it rather than trusting the code.
        const claim = enemy.hasCover ? enemy.cover.index : -1;
        if (claim >= 0) {
          if (claims.has(claim)) trace.coverConflicts++;
          claims.set(claim, enemy.id);
        }
      }
      trace.claimedPeak = Math.max(trace.claimedPeak, claims.size);
      trace.focusedPeak = Math.max(trace.focusedPeak, ai.director.focusedCount);

      // A non-finite value handed to Rapier corrupts the broad-phase for the rest
      // of the session and surfaces as an unreachable trap with no JS frames on it,
      // so catch it here where the offending object can still be named.
      if (trace.nan.length < 12) {
        for (const enemy of ai.director.all) {
          const bad = [];
          if (!fin3(enemy.feet)) bad.push('feet');
          if (enemy.controller && !fin3(enemy.controller.position)) bad.push('controller');
          if (!fin3(enemy.combatant.aimPoint)) bad.push('aimPoint');
          if (!fin3(enemy.locomotion.velocity)) bad.push('velocity');
          if (!fin3(enemy.model.root.position)) bad.push('modelRoot');
          for (const bone of enemy.model.bones) {
            if (!fin3(bone.position)) {
              bad.push(`bone:${bone.name}`);
              break;
            }
          }
          if (bad.length) {
            trace.nan.push({
              t: +(now - trace.t0).toFixed(2),
              id: enemy.id,
              state: enemy.behavior.state,
              dying: enemy.dying,
              fields: bad,
            });
          }
        }
      }
    };

    // Keep the target on their feet: a ring of ten riflemen kills a stationary
    // player in seconds and the respawn teleports them out of the arena.
    window.__AI_TRACE_TIMER = setInterval(() => {
      playerEntity.health = playerEntity.maxHealth;
      trace.alerts = alerts;
    }, 100);
    return { centre, spawned: ids.length };
  },
  [AGENTS, DIFFICULTY],
);

// What the ragdoll layout will actually see when it reads our skeleton: the same
// bone matchers the physics module uses, and the length of every segment it will
// turn into a capsule. A near-zero segment or an implausible span here is the
// difference between a corpse and a solver panic.
const segments = await page.evaluate(() => {
  const g = window.GAME;
  const ai = g.tryGet('ai');
  const enemy = ai.director.all.find((e) => e.isAlive);
  if (!enemy) return null;
  enemy.model.root.updateWorldMatrix(false, true);
  const V = g.camera.position.constructor;
  const at = (name) => {
    const bone = enemy.model.bones.find((b) => b.name === name);
    return bone ? new V().setFromMatrixPosition(bone.matrixWorld) : null;
  };
  const pairs = [
    ['pelvis', 'Hips', 'Spine2'],
    ['chest', 'Spine2', 'Neck'],
    ['head', 'Head', null],
    ['upperArmL', 'LeftArm', 'LeftForeArm'],
    ['lowerArmL', 'LeftForeArm', 'LeftHand'],
    ['upperArmR', 'RightArm', 'RightForeArm'],
    ['lowerArmR', 'RightForeArm', 'RightHand'],
    ['upperLegL', 'LeftUpLeg', 'LeftLeg'],
    ['lowerLegL', 'LeftLeg', 'LeftFoot'],
    ['upperLegR', 'RightUpLeg', 'RightLeg'],
    ['lowerLegR', 'RightLeg', 'RightFoot'],
  ];
  const out = [];
  for (const [id, a, b] of pairs) {
    const pa = at(a);
    const pb = b ? at(b) : null;
    out.push({
      id,
      from: pa ? [+pa.x.toFixed(3), +pa.y.toFixed(3), +pa.z.toFixed(3)] : null,
      length: pa && pb ? +pa.distanceTo(pb).toFixed(4) : null,
    });
  }
  const hips = at('Hips');
  const head = at('Head');
  return { span: hips && head ? +Math.abs(head.y - hips.y).toFixed(3) : null, out, names: enemy.model.bones.map((b) => b.name) };
});
console.log(`ragdoll segments ${JSON.stringify(segments, null, 1)}`);
console.log(`firefight starts ${stamp()}`);
await page.waitForTimeout(SECONDS * 1000);
console.log(`kill step ${stamp()}`);

// The harness player never shoots, so nothing above tests the death path. Kill a
// third of the ring outright and give the corpses time to ragdoll and settle.
const killed = await page.evaluate((wanted) => {
  if (window.__AI_CONTROL) return 0;
  const g = window.GAME;
  const ai = g.tryGet('ai');
  const V = g.camera.position.constructor;
  const point = new V();
  const direction = new V(0, 0.2, 1).normalize();
  let n = 0;
  const live = ai.director.all.filter((e) => e.isAlive);
  for (let i = 0; i < live.length && n < wanted; i += 1) {
    const enemy = live[i];
    enemy.getPosition(point);
    point.y += 1.5;
    enemy.applyDamage({
      amount: 500,
      source: g.tryGet('player').entity,
      point,
      direction,
      bodyPart: 'head',
      type: 'bullet',
      impulse: 900,
      weaponId: 'trace_probe',
      isHeadshot: true,
    });
    n++;
  }
  return n;
}, Number(arg('kills', '4')));
console.log(`killed ${killed} agents to exercise the death path`);
await page.waitForTimeout(9000);

const result = await page.evaluate(() => {
  clearInterval(window.__AI_TRACE_TIMER);
  const g = window.GAME;
  const ai = g.tryGet('ai');
  const t = window.__AI_TRACE;
  const agents = [...t.agents.values()].map((a) => ({
    id: a.id,
    archetype: a.archetype,
    shots: a.shots,
    peeks: a.peeks,
    maxAwareness: +a.maxAwareness.toFixed(2),
    death: a.death,
    ragdoll: a.ragdoll,
    // The order of distinct states each agent passed through, deduplicated, which
    // is the readable form of "did the state machine actually run".
    path: a.states.filter((s, i, arr) => s !== arr[i - 1]),
  }));
  const seconds = {};
  for (const [k, v] of Object.entries(t.stateSeconds)) seconds[k] = +v.toFixed(1);
  return {
    centre: t.centre,
    frames: t.frames,
    seconds: +(g.time.elapsed - t.t0).toFixed(1),
    simHz: +(t.frames / Math.max(0.001, g.time.elapsed - t.t0)).toFixed(1),
    agents,
    stateSeconds: seconds,
    transitions: t.transitions.length,
    transitionSample: t.transitions.slice(0, 60),
    shotsFired: t.shotsFired,
    alerts: t.alerts ?? 0,
    hitsOnPlayer: t.hitsOnPlayer,
    headshotsOnPlayer: t.headshotsOnPlayer,
    damageToPlayer: Math.round(t.damageToPlayer),
    nearMisses: t.nearMisses,
    suppressCalls: t.suppressCalls,
    explosions: t.explosions,
    grenadesThrown: t.grenadesThrown,
    playerDeaths: t.playerDeaths,
    enemyDeaths: t.enemyDeaths,
    ragdolls: t.ragdolls,
    peeks: t.peeks,
    coverConflicts: t.coverConflicts,
    claimedPeak: t.claimedPeak,
    focusedPeak: t.focusedPeak,
    nan: t.nan,
    reactions: t.reactions,
    stats: ai.debugStats(),
  };
});

const r = result.reactions.slice().sort((a, b) => a - b);
const summary = {
  ...result,
  reactionStats: r.length
    ? {
        n: r.length,
        min: r[0],
        median: r[Math.floor(r.length / 2)],
        max: r[r.length - 1],
        mean: +(r.reduce((p, c) => p + c, 0) / r.length).toFixed(3),
      }
    : null,
  hitRate: result.shotsFired ? +(result.hitsOnPlayer / result.shotsFired).toFixed(3) : 0,
};
delete summary.reactions;

console.log(
  JSON.stringify(
    {
      seconds: summary.seconds,
      simHz: summary.simHz,
      stateSeconds: summary.stateSeconds,
      transitions: summary.transitions,
      alerts: summary.alerts,
      shotsFired: summary.shotsFired,
      hitsOnPlayer: summary.hitsOnPlayer,
      hitRate: summary.hitRate,
      damageToPlayer: summary.damageToPlayer,
      reactionStats: summary.reactionStats,
      suppressCalls: summary.suppressCalls,
      grenadesThrown: summary.grenadesThrown,
      nearMisses: summary.nearMisses,
      playerDeaths: summary.playerDeaths,
      enemyDeaths: summary.enemyDeaths,
      ragdolls: summary.ragdolls,
      peeks: summary.peeks,
      coverConflicts: summary.coverConflicts,
      claimedPeak: summary.claimedPeak,
      focusedPeak: summary.focusedPeak,
      nan: summary.nan,
    },
    null,
    2,
  ),
);
console.log('\nper agent:');
for (const a of summary.agents) {
  console.log(
    `  ${a.id} ${a.archetype.padEnd(10)} shots=${String(a.shots).padStart(3)} peeks=${String(a.peeks).padStart(2)} aware=${a.maxAwareness} ${a.death !== null ? `died@${a.death}${a.ragdoll ? ' ragdoll' : ' collapse'}` : ''} ${a.path.join('>')}`,
  );
}
await writeFile(`${OUT}/trace.json`, JSON.stringify(summary, null, 2), 'utf8');
await writeFile(`${OUT}/trace-console.log`, logs.join('\n') || '(clean)', 'utf8');
console.log(`\nconsole issues: ${logs.length} (full text in ${OUT}/trace-console.log)`);
// Distinct messages only: one wasm trap turns into hundreds of identical follow-ups.
const seen = new Set();
for (const line of logs) {
  const head = line.split('\n')[0];
  if (seen.has(head)) continue;
  seen.add(head);
  console.log(line.split('\n').slice(0, 8).join('\n'));
}
await browser.close();
kill();
