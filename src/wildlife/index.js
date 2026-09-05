import * as THREE from 'three';
import { WORLD, anchorPoint } from '../world.js';
import { Lion, lionMaterials } from './lion/index.js';

// ---------------------------------------------------------------------------
// Wildlife, beginning with a pride of lions off the mainline in the open
// savanna.
//
// Contract:
//   createWildlife({ terrain, env, quality }) -> {
//     group,
//     animals: [{ root, kind, state }],
//     update(dt, t, { vehiclePos, vehicleSpeed, throttle, camera, cue,
//                     vehicleHeading?, vehicleCircles? }),   // the last two: the truck's exact footprint
//     anchor,
//     stats: { animals, calls, tris },
//   }
//
// Lions are skinned, LOD'd, and grounded: every foot is placed on
// terrain.heightAt() with the leg solved to reach it, so nothing slides,
// floats or sinks. Behaviour is a small state machine — lie, sit, stand,
// stretch, walk, pace, look at the truck — driven by distance to the vehicle
// and how loud it is, and updated less often the further away an animal is.
// ---------------------------------------------------------------------------

/**
 * The pride, in the anchor's road frame: `along` is metres along the mainline,
 * `out` is metres away from it. The lionesses lie in a loose group with the
 * cubs beside them; the male keeps himself apart, further out.
 */
const PRIDE = [
  { kind: 'lioness', along: -2.6, out: 1.0, yaw: -0.6, hue: 0.0, val: 0.0 },
  { kind: 'lioness', along: 1.6, out: 3.4, yaw: 2.4, hue: 0.012, val: 0.04 },
  { kind: 'lioness', along: -0.4, out: -2.4, yaw: 0.9, hue: -0.01, val: -0.03 },
  { kind: 'cub', along: -3.9, out: 2.6, yaw: 1.8, hue: 0.005, val: 0.05 },
  { kind: 'cub', along: 3.0, out: 4.6, yaw: -2.2, hue: -0.008, val: 0.02 },
  { kind: 'male', along: 6.6, out: 6.2, yaw: -1.9, hue: -0.006, val: -0.02, mane: -0.01 },
];
const FAST_PRIDE = [0, 1, 3, 5];

/** Plan radius of an animal's soft circle in the collision world (src/collision.js). */
const lionRadius = (kind) => (kind === 'cub' ? 0.7 : 1.2);

// The truck's push. The collision world registers each lion as a soft circle
// the truck is pushed out of and slowed by; it reads the lion's position and
// writes nothing back, so the animal learns about the truck here. Its
// footprint — the three circles the driver resolves with, radius ~1.05 m at
// -1.5, 0 and +1.5 m along its axis (drive.js) — is tested against each
// animal's circle every frame, and an animal it is closing on within
// PUSH_MARGIN, or standing in, is pushed (Brain.push: up, turned away, off at
// an amble, and moved out of the footprint when inside it). The heading is not
// in the update contract, so the axis is read from the truck's motion — a
// bicycle model moves along its heading and the footprint is symmetric end to
// end; `vehicleHeading` / `vehicleCircles` in the update options override it.
const TRUCK_FOOT = { r: 1.05, half: 1.5 };
const PUSH_MARGIN = 0.3;
const PUSH_CLOSING = 0.15;

export function createWildlife({ terrain, env = null, quality = 'high' } = {}) {
  const group = new THREE.Group();
  group.name = 'wildlife';
  const anchor = anchorPoint(terrain, WORLD.lions);
  const side = WORLD.lions.side ?? 1;
  const spread = WORLD.lions.spread ?? 20;

  const materials = lionMaterials({ env, quality });
  const pride = [];
  const lions = [];
  const members = quality === 'fast' ? FAST_PRIDE.map((i) => PRIDE[i]) : PRIDE;
  members.forEach((m, i) => {
    const x = anchor.x + anchor.tx * m.along + anchor.lx * side * m.out;
    const z = anchor.z + anchor.tz * m.along + anchor.lz * side * m.out;
    // face roughly along the road frame, so a yaw of 0 looks down the mainline
    const yaw = Math.atan2(anchor.tx, anchor.tz) + m.yaw;
    const lion = new Lion({
      kind: m.kind,
      terrain,
      materials,
      quality,
      seed: 1201 + i * 97,
      home: { x, z, yaw },
      spread: spread * 0.5,
      pride,
      variation: { hue: m.hue, val: m.val, mane: m.mane },
    });
    pride.push(lion.brain);
    lions.push(lion);
    group.add(lion.root);
  });

  const stats = {
    animals: lions.length,
    calls: 0,
    tris: 0,
    tiers: lions.map((l) => ({ kind: l.kind, tris: l.stats.tiers, calls: l.stats.calls })),
  };
  const refresh = () => {
    stats.calls = 0;
    stats.tris = 0;
    for (const l of lions) {
      stats.calls += l.stats.calls[l.tier];
      stats.tris += l.stats.tiers[l.tier];
    }
  };
  refresh();

  const truck = { x: 0, y: 0, z: 0, speed: 0, throttle: 0 };
  const prevState = lions.map((l) => l.state);
  let cueCooldown = 0;
  // the truck's footprint: axis (unit, world xz), half-length and radius, and
  // its velocity from frame to frame
  const foot = { ax: 0, az: 1, known: false, half: 0, r: TRUCK_FOOT.r, vx: 0, vz: 0, px: NaN, pz: NaN };

  function footprint(dt, heading, circles) {
    if (Number.isFinite(foot.px)) {
      foot.vx = (truck.x - foot.px) / dt;
      foot.vz = (truck.z - foot.pz) / dt;
    }
    foot.px = truck.x;
    foot.pz = truck.z;
    if (heading !== undefined) {
      foot.ax = Math.sin(heading);
      foot.az = Math.cos(heading);
      foot.known = true;
    } else {
      const sp = Math.hypot(foot.vx, foot.vz);
      // a teleported truck (the capture tools) is not a heading
      if (sp > 0.5 && sp < 40) {
        let ax = foot.vx / sp;
        let az = foot.vz / sp;
        if (foot.known && ax * foot.ax + az * foot.az < 0) {
          ax = -ax;
          az = -az;
        }
        foot.ax = ax;
        foot.az = az;
        foot.known = true;
      }
    }
    if (circles && circles.length) {
      foot.half = 0;
      foot.r = circles[0].r;
      for (const c of circles) foot.half = Math.max(foot.half, Math.abs(c.dz));
    } else {
      foot.half = TRUCK_FOOT.half;
      foot.r = TRUCK_FOOT.r;
    }
    if (!foot.known) foot.half = 0;
  }

  /** Has the truck met this animal's circle, or has something else moved it? Then Brain.push. */
  function pushCheck(l) {
    const b = l.brain;
    // the root is placed from the brain every step; a root that has moved
    // since is a write-back from outside (a collision world that moves the
    // animal), taken as a push from where it was
    const rp = l.root.position;
    const ex = rp.x - b.pos.x;
    const ez = rp.z - b.pos.z;
    const e2 = ex * ex + ez * ez;
    if (e2 > 1e-6) {
      const e = Math.sqrt(e2);
      b.pos.x = rp.x;
      b.pos.z = rp.z;
      b.push({ x: ex / e, z: ez / e, depth: 0 });
      return;
    }
    // nearest point of the truck's axis segment to the animal, and the gap
    // between the footprint circle there and the animal's circle
    const dx = b.pos.x - truck.x;
    const dz = b.pos.z - truck.z;
    const along = THREE.MathUtils.clamp(dx * foot.ax + dz * foot.az, -foot.half, foot.half);
    const nx0 = dx - foot.ax * along;
    const nz0 = dz - foot.az * along;
    const d = Math.hypot(nx0, nz0);
    const clear = d - foot.r - lionRadius(l.kind);
    if (clear > PUSH_MARGIN) return;
    // the way out is across the truck's line, on the animal's side of it —
    // not away from the nearest point of the footprint, which for an animal
    // dead ahead is along the axis: pushed that way it was herded along in
    // front of the bonnet for as long as the truck kept coming. An animal
    // lying on the line itself goes the way it faces (shoved backward at
    // the shove's speed its forefeet were left out of reach ahead).
    const perp = foot.ax * dz - foot.az * dx;
    const facing = -foot.az * Math.sin(b.yaw) + foot.ax * Math.cos(b.yaw);
    const leftOfLine = Math.abs(perp) > 0.5 ? perp >= 0 : Math.abs(facing) > 0.2 ? facing >= 0 : perp >= 0;
    const sx = leftOfLine ? -foot.az : foot.az;
    const sz = leftOfLine ? foot.ax : -foot.ax;
    const nx = d > 1e-6 ? nx0 / d : sx;
    const nz = d > 1e-6 ? nz0 / d : sz;
    const closing = -(foot.vx * nx + foot.vz * nz);
    if (clear > 0 && closing < PUSH_CLOSING) return;
    const dl = Math.hypot(dx, dz);
    b.push({ x: dl > 1e-6 ? dx / dl : sx, z: dl > 1e-6 ? dz / dl : sz, depth: Math.max(0, -clear), side: { x: sx, z: sz } });
  }

  function update(dt, t, { vehiclePos, vehicleSpeed = 0, throttle = 0, camera, cue, vehicleHeading, vehicleCircles } = {}) {
    dt = THREE.MathUtils.clamp(dt, 1e-4, 0.1);
    if (vehiclePos) {
      truck.x = vehiclePos.x;
      truck.y = vehiclePos.y;
      truck.z = vehiclePos.z;
    }
    truck.speed = vehicleSpeed;
    truck.throttle = throttle;
    footprint(dt, vehicleHeading, vehicleCircles);
    cueCooldown -= dt;
    lions.forEach((l, i) => {
      pushCheck(l);
      l.update(dt, t, truck, camera);
      // a startled lion is heard, once in a while, when the truck is close enough to hear it
      const startled = (l.state === 'alert' || l.state === 'pace') && prevState[i] !== 'alert' && prevState[i] !== 'pace';
      prevState[i] = l.state;
      if (startled && cue && cueCooldown <= 0 && l.alarm > 0.6) {
        const d = Math.hypot(l.root.position.x - truck.x, l.root.position.z - truck.z);
        if (d < 55) {
          cue('lion', { close: d < 22 });
          cueCooldown = 16 + Math.random() * 10;
        }
      }
    });
    refresh();
  }

  return {
    group,
    animals: lions.map((l) => ({
      root: l.root,
      kind: l.kind,
      // plan radius for the collision system's soft circle (src/collision.js)
      radius: lionRadius(l.kind),
      get state() {
        return l.state;
      },
      lion: l,
    })),
    lions,
    anchor,
    env,
    quality,
    update,
    stats,
    /**
     * Where paws and lying bodies meet the ground, world space, one
     * Float32Array of (x, z, radius, weight) per lion (see Lion.contactPoints),
     * for the vegetation to cull or push grass around.
     */
    contactPoints: () => lions.map((l) => l.contactPoints()),
  };
}
