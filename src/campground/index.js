import * as THREE from 'three';
import { WORLD, anchorPoint } from '../world.js';

// ---------------------------------------------------------------------------
// The safari campground: a graded clearing beside the mainline with tents,
// shelters, a ranger cabin, cooking and fire, water and fuel, power, radio,
// signage, fencing, a lookout, and the ground wear of people living there.
//
// Contract:
//   createCampground({ terrain, env, quality, fleet }) -> {
//     group,                       // add to the scene
//     update(dt, t, ctx),          // flames, lantern flicker, smoke, flags
//     anchor,                      // world position of the clearing centre
//     parking,                     // [{ x, z, heading, kind }] handed to the fleet
//     lights,                      // any point/spot lights, so tiers can cap them
//     stats: { objects, tris },
//   }
//
// Everything is placed relative to `anchor`, which comes from WORLD.camp, and
// sits on terrain.heightAt(). Objects have a practical reason to be where they
// are — a kitchen is near the water, fuel is away from fire, vehicles park where
// a truck can actually get in and out.
// ---------------------------------------------------------------------------

export function createCampground({ terrain, env = null, quality = 'high' } = {}) {
  const group = new THREE.Group();
  group.name = 'campground';

  const anchor = anchorPoint(terrain, WORLD.camp);
  const parking = [];
  const lights = [];

  return {
    group,
    anchor,
    parking,
    lights,
    env,
    quality,
    update() {},
    stats: { objects: 0, tris: 0 },
  };
}
