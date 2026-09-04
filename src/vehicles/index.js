import * as THREE from 'three';

// ---------------------------------------------------------------------------
// The campground fleet: expedition trucks, open safari jeeps, off-road SUVs,
// pickups, ranger vehicles, camp utility vehicles, supply trucks, overland
// campers, trailers, and a motorcycle or two. Distinct silhouettes, not clones —
// paint, age, accessories, tyres, roof gear, glass, damage, dust, mud, rust and
// purpose all vary — built from the hero truck's material library and the same
// Kit so materials are shared and draw calls stay bounded.
//
// Contract:
//   createFleet({ env, quality, placements, terrain }) -> {
//     group,
//     vehicles: [{ root, kind, name }],
//     update(dt, t),               // canvas flap, aerial sway, idle lights
//     stats: { vehicles, calls, tris },
//   }
//
// `placements` come from the campground: [{ x, z, heading, kind }], already on
// terrain.heightAt(). A vehicle sits with its wheels on the ground the way the
// hero truck does — sample the four contact patches and fit the body to them.
// ---------------------------------------------------------------------------

export function createFleet({ env = null, quality = 'high', placements = [], terrain = null } = {}) {
  const group = new THREE.Group();
  group.name = 'fleet';
  return {
    group,
    vehicles: [],
    env,
    quality,
    placements,
    terrain,
    update() {},
    stats: { vehicles: 0, calls: 0, tris: 0 },
  };
}
