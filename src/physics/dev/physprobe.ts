/**
 * Re-entrancy and character-controller harness.
 *
 * The crash this exists for is a race between a Rapier query and a mutation,
 * so waiting to see whether a capture run happens to hit it is not evidence of
 * anything. This provokes it instead: it reaches into the live world, opens a
 * genuine Rapier borrow with `intersectionsWithShape`, and calls the module's
 * own mutators from inside the callback — which is exactly the shape of the
 * stack in `shots/v3/console.log`. Every case runs a control first that does
 * the same thing through raw Rapier, so a pass means the module deferred, not
 * that the borrow was never held.
 *
 * The whole physics module is DOM-free once Rapier is initialised, so this runs
 * in Node in a couple of seconds and the browser captures are left for the
 * things only a picture can settle.
 *
 * Build and run:
 *   npx vite build --ssr src/physics/dev/physprobe.ts --outDir dist-probe
 *   node dist-probe/physprobe.js
 */
import * as THREE from 'three';
import type { Collider, World } from '@dimforge/rapier3d-compat';
import type { EngineContext } from '../../core/System';
import type { CharacterControllerHandle, RagdollHandle, RigidBodyHandle } from '../../core/Contracts';
import { GAMEPLAY, QUALITY_PRESETS } from '../../core/Config';
import { PhysicsSystemImpl } from '../index';
import { RAPIER } from '../Rapier';
import { gate } from '../Reentrancy';

declare const process: { argv: string[]; exitCode?: number };

// Rapier's stack traces inline the whole minified module, which buries the one
// line that matters.
(Error as { stackTraceLimit?: number }).stackTraceLimit = 6;

const FIXED = 1 / 120;
const IDENTITY_ROT = { x: 0, y: 0, z: 0, w: 1 };

let failures = 0;
let checks = 0;

function check(pass: boolean, label: string, detail = ''): void {
  checks++;
  if (!pass) failures++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
}

function heading(title: string): void {
  console.log(`\n=== ${title} ===`);
}

// ---------------------------------------------------------------------------
// A minimal engine context. Physics reads the clock, the quality config and one
// key; nothing else on the real context is reachable from this module.
// ---------------------------------------------------------------------------

class Clock {
  readonly fixedStep = FIXED;
  frame = 0;
  alpha = 0;
}

function makeContext(): { ctx: EngineContext; clock: Clock } {
  const clock = new Clock();
  const ctx = {
    scene: new THREE.Scene(),
    time: clock,
    input: { keyPressed: () => false },
    config: { ...QUALITY_PRESETS.high },
    events: { emit: () => {}, on: () => () => {} },
  } as unknown as EngineContext;
  return { ctx, clock };
}

/** Reach the live world the way a debugger would; nothing ships this. */
function worldOf(physics: PhysicsSystemImpl): World {
  return (physics as unknown as { world: World }).world;
}

function tick(physics: PhysicsSystemImpl, clock: Clock, ctx: EngineContext, steps: number): void {
  for (let i = 0; i < steps; i++) {
    clock.frame++;
    physics.fixedUpdate(FIXED, ctx);
    physics.update(FIXED, ctx);
  }
}

/** Flat ground plus a few obstacles, matching how the map registers itself. */
function buildGround(physics: PhysicsSystemImpl): void {
  physics.addStaticBox(
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(80, 1, 80),
    undefined,
    { kind: 'static', surface: 'concrete' },
  );
}

function addDebris(physics: PhysicsSystemImpl, count: number, x = 0): RigidBodyHandle[] {
  const out: RigidBodyHandle[] = [];
  for (let i = 0; i < count; i++) {
    const object = new THREE.Object3D();
    object.position.set(x + (i % 8) * 0.4 - 1.6, 1.4 + Math.floor(i / 8) * 0.4, (i % 5) * 0.3 - 0.6);
    object.updateWorldMatrix(true, false);
    out.push(
      physics.createRigidBody(
        object,
        { kind: 'box', halfExtents: new THREE.Vector3(0.15, 0.15, 0.15) },
        { userData: { kind: 'debris', surface: 'wood' } },
      ),
    );
  }
  return out;
}

/** An unrigged corpse: the ragdoll synthesises its own anatomy from proportions. */
function addRagdoll(physics: PhysicsSystemImpl, x: number): RagdollHandle | null {
  const root = new THREE.Object3D();
  root.position.set(x, 0, 0);
  root.updateWorldMatrix(true, true);
  return physics.createRagdoll(null, root, { impulse: new THREE.Vector3(3, 2, 1) });
}

// ---------------------------------------------------------------------------
// 1. The original defect: the query-structure refresh.
// ---------------------------------------------------------------------------

async function caseRefreshStep(): Promise<void> {
  heading('1. query-structure refresh with ragdolls in the world');

  // Control: what the module used to do. A microsecond timestep is not "nearly
  // zero" to the constraint solver.
  {
    const { ctx, clock } = makeContext();
    const physics = new PhysicsSystemImpl();
    await physics.init(ctx);
    buildGround(physics);
    addDebris(physics, 40);
    for (let i = 0; i < 3; i++) addRagdoll(physics, i * 1.5 - 1.5);
    tick(physics, clock, ctx, 2);

    const world = worldOf(physics);
    let trap = '';
    let nanAt = -1;
    for (let i = 0; i < 2000 && !trap; i++) {
      try {
        world.timestep = FIXED;
        world.step();
        world.timestep = 1e-6;
        world.step();
        world.timestep = FIXED;
      } catch (err) {
        trap = `${err}`.split('\n')[0];
      }
      if (nanAt < 0 && !finiteWorld(world)) nanAt = i;
    }
    // NaN is the deterministic part; whether it also reaches an assertion and
    // traps depends on which body's AABB goes bad first, so it is reported
    // rather than required.
    check(
      nanAt >= 0,
      'control: dt=1e-6 refresh destroys the simulation',
      `NaN at step ${nanAt}${trap ? `, trapped: ${trap}` : ', no trap in 2000 steps'}`,
    );
    try {
      physics.dispose();
    } catch {
      /* the control deliberately left this world unusable */
    }
  }

  // The shipping path, driven the way the game drives it: geometry appears
  // every frame, so the refresh fires every frame.
  {
    const { ctx, clock } = makeContext();
    const physics = new PhysicsSystemImpl();
    await physics.init(ctx);
    buildGround(physics);
    addDebris(physics, 40);
    for (let i = 0; i < 3; i++) addRagdoll(physics, i * 1.5 - 1.5);

    const from = new THREE.Vector3(0, 6, 0);
    const down = new THREE.Vector3(0, -1, 0);
    let errors = 0;
    const restore = captureConsole(() => errors++);
    for (let i = 0; i < 2000; i++) {
      clock.frame++;
      physics.fixedUpdate(FIXED, ctx);
      // Something new every frame keeps `structureDirty` set, which is what
      // makes the refresh run on the query below.
      physics.addStaticBox(
        new THREE.Vector3(30 + i * 0.01, 0.5, 30),
        new THREE.Vector3(0.2, 0.5, 0.2),
      );
      physics.raycast(from, down, { maxDistance: 20 });
      physics.update(FIXED, ctx);
    }
    restore();

    const world = worldOf(physics);
    check(errors === 0, 'no console errors across 2000 refreshed frames', `${errors} seen`);
    check(finiteWorld(world), 'every body still finite');
    check(physics.stats.queryRefreshes > 1000, 'the refresh actually ran', `${physics.stats.queryRefreshes} times`);
    check(physics.stats.worldRebuilds === 0, 'no rebuild was needed');

    // And the point of the refresh: a collider added since the last step has to
    // be visible to the very next query.
    physics.addStaticBox(new THREE.Vector3(50, 2, 50), new THREE.Vector3(1, 1, 1));
    clock.frame++;
    const hit = physics.raycast(new THREE.Vector3(50, 9, 50), down, { maxDistance: 20 });
    check(hit !== null && Math.abs(hit.distance - 6) < 0.05, 'a collider added this frame is queryable', hit ? `d=${hit.distance.toFixed(3)}` : 'miss');

    // A refresh must be a broad-phase rebuild and nothing else: run a few
    // hundred with no fixed step in between and the pile must not move.
    const before = snapshot(world);
    const refreshesBefore = physics.stats.queryRefreshes;
    for (let i = 0; i < 300; i++) {
      clock.frame++;
      physics.addStaticBox(
        new THREE.Vector3(60 + i * 0.01, 0.5, 60),
        new THREE.Vector3(0.1, 0.5, 0.1),
      );
      physics.raycast(new THREE.Vector3(0, 6, 0), down, { maxDistance: 20 });
    }
    check(
      physics.stats.queryRefreshes - refreshesBefore === 300,
      '300 more refreshes ran',
      `${physics.stats.queryRefreshes - refreshesBefore}`,
    );
    check(drift(world, before) === 0, 'and moved nothing', `${drift(world, before).toExponential(1)} m`);
    physics.dispose();
  }
}

// ---------------------------------------------------------------------------
// 2. Mutations issued from inside a real Rapier borrow.
// ---------------------------------------------------------------------------

async function caseMutationInsideQuery(): Promise<void> {
  heading('2. module mutators called from inside a live query callback');

  const { ctx, clock } = makeContext();
  const physics = new PhysicsSystemImpl();
  await physics.init(ctx);
  buildGround(physics);
  const debris = addDebris(physics, 12);
  const ragdoll = addRagdoll(physics, 4);
  const character = physics.createCharacter(
    new THREE.Vector3(6, 0, 0),
    GAMEPLAY.player.height,
    GAMEPLAY.player.radius,
  );
  const spare = physics.createCharacter(new THREE.Vector3(9, 0, 0), 1.8, 0.34);
  tick(physics, clock, ctx, 60);

  const world = worldOf(physics);
  const ball = new RAPIER.Ball(30);

  // Control: prove the callback really is inside a Rapier borrow, by doing from
  // in there exactly what the module no longer does.
  {
    let raw = '';
    let moved = false;
    const body = debris[0] as unknown as { body: { translation(): { y: number }; setTranslation(v: unknown, w: boolean): void } };
    const before = body.body.translation().y;
    world.intersectionsWithShape(
      { x: 0, y: 1, z: 0 },
      IDENTITY_ROT,
      ball,
      (_c: Collider) => {
        try {
          body.body.setTranslation({ x: 0, y: 40, z: 0 }, true);
        } catch (err) {
          raw = `${err}`.split('\n')[0];
        }
        return false;
      },
    );
    moved = Math.abs(body.body.translation().y - before) > 1e-6;
    check(raw !== '' || !moved, 'control: a raw mutation inside the borrow is refused', raw || 'silently dropped');
  }

  // Everything the game can reach, called from inside the borrow. The bracket
  // around the query is character-for-character what `QueryEngine` puts around
  // every cast, so this is the production shape: a real Rapier borrow, opened
  // by the module, with game code running inside it.
  const start = character.position.clone();
  const debrisBefore = new THREE.Vector3();
  debris[1].getVelocity(debrisBefore);
  let thrown = '';
  let visits = 0;
  const deferralsBefore = gate.deferrals;

  gate.enter();
  try {
    world.intersectionsWithShape(
      { x: 0, y: 1, z: 0 },
      IDENTITY_ROT,
      ball,
      (_c: Collider) => {
        if (visits++ > 0) return false;
        try {
          character.move(new THREE.Vector3(0.5, 0, 0), FIXED);
          character.setHeight(GAMEPLAY.player.crouchHeight);
          spare.setPosition(new THREE.Vector3(12, 0, 0));
          debris[1].applyImpulse(new THREE.Vector3(0, 400, 0));
          debris[2].setVelocity(new THREE.Vector3(0, 5, 0));
          debris[3].setPosition(new THREE.Vector3(2, 6, 2));
          debris[4].sleep();
          debris[5].wake();
          debris[6].destroy();
          ragdoll?.applyImpulse('chest', new THREE.Vector3(0, 300, 0));
          physics.applyRadialImpulse(new THREE.Vector3(0, 1, 0), 6, 12);
          physics.raycast(new THREE.Vector3(0, 6, 0), new THREE.Vector3(0, -1, 0));
          physics.fixedUpdate(FIXED, ctx);
        } catch (err) {
          thrown = `${err}`.split('\n')[0];
        }
        return false;
      },
    );
  } finally {
    gate.leave();
  }

  check(thrown === '', 'nothing threw out of the callback', thrown);
  check(gate.deferrals > deferralsBefore, 'the mutations were deferred, not applied', `${gate.deferrals - deferralsBefore} queued`);

  // The deferred work runs as the gate unwinds, so by here it has landed.
  const debrisAfter = new THREE.Vector3();
  debris[1].getVelocity(debrisAfter);
  check(debrisAfter.y > debrisBefore.y + 1, 'the deferred impulse actually landed', `vy ${debrisBefore.y.toFixed(2)} -> ${debrisAfter.y.toFixed(2)}`);
  check(character.position.distanceTo(start) > 0.1, 'the deferred character move landed', `moved ${character.position.distanceTo(start).toFixed(3)} m`);
  check(Math.abs(spare.position.x - 12) < 1e-6, 'the deferred teleport landed');

  let health = '';
  try {
    tick(physics, clock, ctx, 120);
  } catch (err) {
    health = `${err}`.split('\n')[0];
  }
  check(health === '', 'the world is still healthy afterwards', health);
  check(finiteWorld(worldOf(physics)), 'every body still finite');
  check(physics.stats.worldRebuilds === 0, 'no rebuild was needed');
  physics.dispose();
}

// ---------------------------------------------------------------------------
// 3. Fault recovery.
// ---------------------------------------------------------------------------

async function caseRecovery(): Promise<void> {
  heading('3. recovery from a poisoned world');

  const { ctx, clock } = makeContext();
  const physics = new PhysicsSystemImpl();
  await physics.init(ctx);
  buildGround(physics);
  for (let i = 0; i < 60; i++) {
    physics.addStaticBox(
      new THREE.Vector3((i % 10) * 4 - 20, 1, Math.floor(i / 10) * 4 - 10),
      new THREE.Vector3(0.5, 1, 0.5),
      undefined,
      { kind: 'static', surface: 'brick' },
    );
  }
  addDebris(physics, 20);
  addRagdoll(physics, 3);
  const character = physics.createCharacter(
    new THREE.Vector3(0, 0, 0),
    GAMEPLAY.player.height,
    GAMEPLAY.player.radius,
  );
  tick(physics, clock, ctx, 240);
  const restedY = character.position.y;

  // Poison it the way only a step from inside a query can: the borrow is left
  // outstanding for the life of the world.
  const world = worldOf(physics);
  world.intersectionsWithShape(
    { x: 0, y: 1, z: 0 },
    IDENTITY_ROT,
    new RAPIER.Ball(40),
    () => {
      try {
        world.step();
      } catch {
        /* provoking exactly this */
      }
      return false;
    },
  );
  let poisoned = false;
  try {
    world.step();
  } catch {
    poisoned = true;
  }
  check(poisoned, 'the world is genuinely poisoned');

  const messages: string[] = [];
  const restore = captureConsole(undefined, (line) => messages.push(line));
  tick(physics, clock, ctx, 20);
  restore();

  check(physics.stats.worldRebuilds === 1, 'the fault was detected and the world rebuilt', `${physics.stats.worldRebuilds}`);
  check(
    messages.some((m) => m.includes('world rebuilt')),
    'the rebuild is reported',
    messages.find((m) => m.includes('world rebuilt')) ?? '',
  );

  // The point of rebuilding rather than switching off: the map is still there
  // and the player is still standing on it.
  const down = new THREE.Vector3(0, -1, 0);
  const groundHit = physics.raycast(new THREE.Vector3(0, 5, 0), down, { maxDistance: 20 });
  check(groundHit !== null, 'the map still has collision after the rebuild');
  const wallHit = physics.raycast(new THREE.Vector3(-20, 1, -10), new THREE.Vector3(1, 0, 0), {
    maxDistance: 3,
  });
  check(wallHit !== null, 'replayed boxes are back');

  tick(physics, clock, ctx, 240);
  character.move(new THREE.Vector3(0.02, -0.02, 0), FIXED);
  tick(physics, clock, ctx, 120);
  check(character.grounded, 'the character is grounded on the rebuilt world');
  check(
    Math.abs(character.position.y - restedY) < 0.05,
    'and standing at the same height',
    `${restedY.toFixed(3)} -> ${character.position.y.toFixed(3)}`,
  );
  physics.dispose();
}

// ---------------------------------------------------------------------------
// 4. Character controller: steps, stances, tunnelling.
// ---------------------------------------------------------------------------

async function caseCharacter(): Promise<void> {
  heading('4. character controller');

  const { ctx, clock } = makeContext();
  const physics = new PhysicsSystemImpl();
  await physics.init(ctx);
  buildGround(physics);

  // One kerb per lane, so every height is measured against clean geometry.
  const heights = [0.1, 0.2, 0.3, 0.4, 0.42, 0.43, 0.45, 0.47, 0.48, 0.5, 0.6];
  heights.forEach((h, i) => {
    physics.addStaticBox(
      new THREE.Vector3(2, h * 0.5, i * 6),
      new THREE.Vector3(1.5, h * 0.5, 2),
      undefined,
      { kind: 'static', surface: 'concrete' },
    );
  });
  // A thin wall for the tunnelling test.
  physics.addStaticBox(new THREE.Vector3(2, 2, 60), new THREE.Vector3(3, 2, 0.05));
  tick(physics, clock, ctx, 10);

  const speeds: Array<[string, number]> = [
    ['crouch 2.05', GAMEPLAY.player.crouchSpeed],
    ['walk 4.10', GAMEPLAY.player.walkSpeed],
    ['sprint 6.60', GAMEPLAY.player.sprintSpeed],
  ];

  for (const [name, speed] of speeds) {
    const climbed: string[] = [];
    const peaks: string[] = [];
    for (let i = 0; i < heights.length; i++) {
      const h = heights[i];
      const character = physics.createCharacter(
        new THREE.Vector3(-1, 0, i * 6),
        GAMEPLAY.player.height,
        GAMEPLAY.player.radius,
      );
      tick(physics, clock, ctx, 30);
      const step = new THREE.Vector3();
      let up = false;
      let peak = 0;
      // The kerb is 3 m deep, so a sprint crosses it in well under a second:
      // stop at the far edge or the run measures the drop off the back.
      for (let f = 0; f < 480 && !up && character.position.x < 3; f++) {
        step.set(speed * FIXED, GAMEPLAY.player.gravity * FIXED * FIXED, 0);
        character.move(step, FIXED);
        tick(physics, clock, ctx, 1);
        if (character.position.y > peak) peak = character.position.y;
        // Standing on the kerb means the feet are at its top, not somewhere
        // inside it: a loose tolerance here reads a partial lift as a climb.
        up = character.grounded && character.position.y >= h - 0.005;
      }
      climbed.push(`${h.toFixed(2)}${up ? '+' : '-'}`);
      peaks.push(peak.toFixed(3));
      character.destroy();
      tick(physics, clock, ctx, 2);
    }
    // The contract is that everything up to `stepHeight` is climbed and a wall
    // is not. Rapier's own autostep is displacement-sensitive and reaches a
    // little past `stepHeight` once the character is walking or faster, which
    // is why the ceiling here is the 0.60 m wall rather than 0.42 exactly; that
    // slack is pre-existing and measures identically with the re-entrancy gate
    // taken back out.
    const required = heights.filter((h) => h <= GAMEPLAY.player.stepHeight);
    const climbedSet = new Set(
      climbed.filter((c) => c.endsWith('+')).map((c) => Number.parseFloat(c)),
    );
    const allRequired = required.every((h) => climbedSet.has(h));
    const wallRefused = !climbedSet.has(0.6);
    check(
      allRequired && wallRefused,
      `steps up to ${GAMEPLAY.player.stepHeight} m climbed, 0.60 m refused, at ${name} m/s`,
      `${climbed.join(' ')}  (peak y ${peaks.join('/')})`,
    );
  }

  // Stances.
  {
    const character = physics.createCharacter(
      new THREE.Vector3(-6, 0, 40),
      GAMEPLAY.player.height,
      GAMEPLAY.player.radius,
    );
    tick(physics, clock, ctx, 60);
    check(character.setHeight(GAMEPLAY.player.crouchHeight), 'crouch');
    tick(physics, clock, ctx, 2);
    check(character.setHeight(GAMEPLAY.player.proneHeight), 'prone');
    tick(physics, clock, ctx, 2);
    check(character.setHeight(GAMEPLAY.player.height), 'stand back up in the open');
    tick(physics, clock, ctx, 2);

    // Crawl under a slab and the stand-up has to be refused.
    physics.addStaticBox(new THREE.Vector3(-6, 1.2, 40), new THREE.Vector3(2, 0.2, 2));
    clock.frame++;
    character.setHeight(GAMEPLAY.player.proneHeight);
    tick(physics, clock, ctx, 4);
    check(!character.setHeight(GAMEPLAY.player.height), 'stand-up refused under a slab');
    check(character.isBlockedAbove(GAMEPLAY.player.height), 'and reported as blocked');
    character.destroy();
    tick(physics, clock, ctx, 2);
  }

  // Tunnelling: one move far larger than the wall is thick.
  {
    const character = physics.createCharacter(
      new THREE.Vector3(-2, 0, 60),
      GAMEPLAY.player.height,
      GAMEPLAY.player.radius,
    );
    tick(physics, clock, ctx, 30);
    for (let f = 0; f < 60; f++) {
      character.move(new THREE.Vector3(0.9, -0.01, 0), FIXED);
      tick(physics, clock, ctx, 1);
    }
    check(character.position.x < 2, 'no tunnelling through a 0.10 m wall at 108 m/s', `x=${character.position.x.toFixed(3)}`);
    character.destroy();
  }

  physics.dispose();
}

// ---------------------------------------------------------------------------
// 5. A firefight's worth of load, with everything happening at once.
// ---------------------------------------------------------------------------

async function caseSoak(): Promise<void> {
  heading('5. soak: characters, blasts, corpses and debris together');

  const { ctx, clock } = makeContext();
  const physics = new PhysicsSystemImpl();
  await physics.init(ctx);
  buildGround(physics);
  const characters: CharacterControllerHandle[] = [];
  for (let i = 0; i < 8; i++) {
    characters.push(
      physics.createCharacter(
        new THREE.Vector3(i * 2 - 8, 0, 8),
        GAMEPLAY.player.height,
        GAMEPLAY.player.radius,
      ),
    );
  }

  let errors = 0;
  const restore = captureConsole(() => errors++);
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const step = new THREE.Vector3();
  let peakStepMs = 0;

  for (let frame = 0; frame < 3600; frame++) {
    clock.frame++;
    physics.fixedUpdate(FIXED, ctx);

    if (frame % 45 === 0) addDebris(physics, 10, (frame % 7) - 3);
    if (frame % 120 === 0) addRagdoll(physics, (frame % 5) * 2 - 4);
    if (frame % 90 === 0) {
      physics.applyRadialImpulse(new THREE.Vector3((frame % 9) - 4, 1, 0), 7, 26);
    }

    for (let i = 0; i < characters.length; i++) {
      const c = characters[i];
      step.set(Math.sin((frame + i * 30) * 0.03) * 0.03, GAMEPLAY.player.gravity * FIXED * FIXED, 0.02);
      c.move(step, FIXED);
      // The AI shoots and looks while it walks, which is where the queries and
      // the moves end up interleaved on one tick.
      from.set(c.position.x, c.position.y + 1.5, c.position.z);
      to.set(0, 1.5, -20);
      physics.lineOfSight(from, to);
      physics.raycast(from, to.sub(from).normalize(), { maxDistance: 60, exclude: [c] });
      physics.spherecast(from, new THREE.Vector3(0, -1, 0), 0.2, { maxDistance: 4 });
    }
    physics.update(FIXED, ctx);
    if (physics.stats.stepPeakMs > peakStepMs) peakStepMs = physics.stats.stepPeakMs;
  }
  restore();

  check(errors === 0, 'no console errors across 3600 frames', `${errors} seen`);
  check(physics.stats.worldRebuilds === 0, 'no rebuild was needed');
  check(finiteWorld(worldOf(physics)), 'every body still finite');
  for (const c of characters) {
    if (!Number.isFinite(c.position.x + c.position.y + c.position.z)) {
      check(false, 'a character went non-finite');
      break;
    }
  }
  console.log(
    `  info  ${physics.stats.bodies} bodies, ${physics.stats.colliders} colliders, ` +
      `step ${physics.stats.stepMs.toFixed(2)} ms avg / ${peakStepMs.toFixed(2)} ms peak, ` +
      `${physics.stats.queryRefreshes} refreshes, ${physics.stats.deferredMutations} deferrals`,
  );
  physics.dispose();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function snapshot(world: World): number[] {
  const out: number[] = [];
  world.bodies.forEach((body) => {
    const t = body.translation();
    out.push(t.x, t.y, t.z);
  });
  return out;
}

/** Largest distance any body has moved since `before`. */
function drift(world: World, before: number[]): number {
  const now = snapshot(world);
  let worst = 0;
  for (let i = 0; i + 2 < Math.min(now.length, before.length); i += 3) {
    const d = Math.hypot(now[i] - before[i], now[i + 1] - before[i + 1], now[i + 2] - before[i + 2]);
    if (d > worst) worst = d;
  }
  return worst;
}

function finiteWorld(world: World): boolean {
  let ok = true;
  world.bodies.forEach((body) => {
    const t = body.translation();
    if (!Number.isFinite(t.x + t.y + t.z)) ok = false;
  });
  return ok;
}

/** Count anything the module logs, so a silently-handled fault still shows up. */
function captureConsole(onError?: () => void, onWarn?: (line: string) => void): () => void {
  const error = console.error;
  const warn = console.warn;
  console.error = (...args: unknown[]): void => {
    onError?.();
    error('  [captured error]', ...args);
  };
  console.warn = (...args: unknown[]): void => {
    onWarn?.(args.map((a) => String(a)).join(' '));
    warn('  [captured warn]', ...args);
  };
  return () => {
    console.error = error;
    console.warn = warn;
  };
}

// ---------------------------------------------------------------------------

const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const cases: Array<[string, () => Promise<void>]> = [
  ['refresh', caseRefreshStep],
  ['mutation', caseMutationInsideQuery],
  ['recovery', caseRecovery],
  ['character', caseCharacter],
  ['soak', caseSoak],
];

for (const [name, run] of cases) {
  if (only.length > 0 && !only.includes(name)) continue;
  await run();
}

console.log(`\n${failures === 0 ? 'OK' : 'FAILED'} — ${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exitCode = 1;
