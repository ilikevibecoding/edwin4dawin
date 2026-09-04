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
//     update(dt, t, { vehiclePos, vehicleSpeed, throttle, camera }),
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
  function update(dt, t, { vehiclePos, vehicleSpeed = 0, throttle = 0, camera, cue } = {}) {
    dt = THREE.MathUtils.clamp(dt, 1e-4, 0.1);
    if (vehiclePos) {
      truck.x = vehiclePos.x;
      truck.y = vehiclePos.y;
      truck.z = vehiclePos.z;
    }
    truck.speed = vehicleSpeed;
    truck.throttle = throttle;
    cueCooldown -= dt;
    lions.forEach((l, i) => {
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
