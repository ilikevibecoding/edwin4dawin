#!/usr/bin/env node
/**
 * tools/simtest.mjs — frame-rate independence of the player controller.
 *
 *   node tools/simtest.mjs
 *
 * The shipped build had a bug that made the demo feel frozen: the frame loop
 * clamped its timestep with `Math.min(0.05, delta)`, so any machine below 20 fps
 * ran the *simulation* in slow motion rather than merely rendering fewer frames.
 * At 8 fps you moved at a third of walking pace; on a machine managing 1 fps you
 * moved 4 cm a second and concluded, correctly, that the game was broken.
 *
 * It could not be caught through the renderer on a GPU-less box, because there
 * the frame rate is so low that the clamp always engages. So this drives the real
 * `Player` — the same integrator, the same collision solver — at a controlled
 * sequence of frame deltas, with no renderer in the loop at all.
 *
 * Asserts:
 *   1. distance walked per second of real time is the same at 144/60/30/15/8 fps
 *   2. it matches the declared walk speed
 *   3. the old clamped stepping fails the same test (so the test has teeth)
 *   4. a slow frame rate still cannot tunnel the player through a bulkhead
 */
import * as THREE from 'three';

// player.js binds listeners in its constructor; give it somewhere to bind to.
globalThis.document = { addEventListener() {}, removeEventListener() {}, pointerLockElement: null };

const { Player, WALK } = await import('../src/player.js');

const DURATION = 4;           // seconds of simulated wall clock per run
const RATES = [144, 60, 30, 15, 8];

function makePlayer(colliders = []) {
  const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.1, 80);
  const p = new Player({ camera, domElement: {}, colliders });
  p.enabled = true;
  p.locked = true;               // pretend the pointer is locked
  p.keys.add('KeyW');            // pretend W is held
  p.teleport(0, 0, 0, 0);        // yaw 0 -> forward is -Z
  return p;
}

/** @param stepper (player, dt) => void — how the frame loop hands time to the player. */
function walk(fps, stepper, colliders = []) {
  const p = makePlayer(colliders);
  const dt = 1 / fps;
  const frames = Math.round(DURATION * fps);
  for (let i = 0; i < frames; i++) stepper(p, dt);
  return Math.hypot(p.pos.x, p.pos.z);
}

const fixed = (p, dt) => p.advance(dt);                     // what ships now
const clamped = (p, dt) => p.update(Math.min(0.05, dt));    // what used to ship

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

console.log(`walking for ${DURATION}s at each frame rate (walk speed ${WALK} m/s)\n`);
console.log('  fps    fixed-step (shipping)   clamped 0.05 (the bug)');
const now = [];
const old = [];
for (const fps of RATES) {
  const a = walk(fps, fixed);
  const b = walk(fps, clamped);
  now.push(a);
  old.push(b);
  console.log(`  ${String(fps).padStart(3)}    ${a.toFixed(2)} m (${(a / DURATION).toFixed(2)} m/s)`.padEnd(41) +
    `${b.toFixed(2)} m (${(b / DURATION).toFixed(2)} m/s)`);
}
console.log('');

const spread = (Math.max(...now) - Math.min(...now)) / Math.max(...now);
check('distance is frame-rate independent', spread < 0.02,
  `spread ${(spread * 100).toFixed(2)}% across ${RATES[0]}–${RATES[RATES.length - 1]} fps (tolerance 2%)`);

// acceleration ramp costs ~0.2 m of the theoretical maximum; anything above 95% is right
const ideal = WALK * DURATION;
const worst = Math.min(...now) / ideal;
check('distance matches the declared walk speed', worst > 0.95,
  `slowest rate reached ${(worst * 100).toFixed(1)}% of ${ideal.toFixed(1)} m`);

const oldSpread = (Math.max(...old) - Math.min(...old)) / Math.max(...old);
check('the old clamped stepping would fail this test', oldSpread > 0.5,
  `it varied by ${(oldSpread * 100).toFixed(0)}% — 8 fps moved ${(old[old.length - 1] / ideal * 100).toFixed(0)}% as far as 144 fps`);

// tunnelling: a wall 3 m ahead, walked into at the worst frame rate we allow
const wall = new THREE.Box3(new THREE.Vector3(-5, -1, -3.1), new THREE.Vector3(5, 4, -2.9));
const stoppedSlow = -walk(4, fixed, [wall]);      // 4 fps, i.e. the MAX_FRAME clamp
const stoppedFast = -walk(144, fixed, [wall]);
check('slow frame rates cannot tunnel through a bulkhead',
  stoppedSlow > -3.1 && Math.abs(stoppedSlow - stoppedFast) < 0.02,
  `stops at z=${stoppedSlow.toFixed(3)} at 4 fps vs ${stoppedFast.toFixed(3)} at 144 fps (wall face z=-2.9, body radius 0.34)`);

console.log(failures ? `\n✘ ${failures} check(s) failed` : '\n✔ all checks passed');
process.exit(failures ? 1 : 0);
