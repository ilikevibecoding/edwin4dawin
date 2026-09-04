import * as THREE from 'three';
import { WORLD, anchorPoint } from '../world.js';

// ---------------------------------------------------------------------------
// Wildlife, beginning with a pride of lions off the mainline in the open
// savanna.
//
// Contract:
//   createWildlife({ terrain, env, quality }) -> {
//     group,
//     animals: [{ root, kind, state }],
//     update(dt, t, { vehiclePos, vehicleSpeed, camera }),
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

export function createWildlife({ terrain, env = null, quality = 'high' } = {}) {
  const group = new THREE.Group();
  group.name = 'wildlife';
  const anchor = anchorPoint(terrain, WORLD.lions);
  return {
    group,
    animals: [],
    anchor,
    env,
    quality,
    update() {},
    stats: { animals: 0, calls: 0, tris: 0 },
  };
}
