// Bridge stations: forward sill consoles under the window band, console rows in both crew pits, the
// commander's dais on the aft deck, and the aft wall station bank. Matte-black consoles, red/blue/amber
// instruments (§11). Phase 1 massing; detail passes add screens, chairs, cabling and animation.
import * as THREE from "three";
import { FLOOR, PIT_FLOOR } from "../shared/plan.js";
import { IMP } from "../shared/palette.js";
import { consoleUnit, seat } from "../shared/props.js";

export { consoleUnit, seat };

export function buildStations(kit, ctx, manifest, L) {
  const xi = L.xIn;

  // --- forward sill consoles: a continuous low bank under the window, x ±17, stepped back from the sill
  for (let x = -16.2; x <= 16.3; x += 3.6) {
    consoleUnit(kit, x, FLOOR, 459.75, { w: 3.2, facing: 0, screen: "screenImp" + (Math.abs(Math.round(x / 3.6)) % 4), seed: Math.round(x) });
    seat(kit, x - 0.8, FLOOR, 460.85, 0);
    seat(kit, x + 0.8, FLOOR, 460.85, 0);
  }

  // --- crew pits: two rows of consoles per pit, operators facing outboard toward the pit wall screens
  for (const s of [-1, 1]) {
    const facing = s < 0 ? 1 : 3; // 1: faces -x (port), 3: faces +x (starboard)
    const innerX = s * (L.walkHalf + 2.1); // row along the walkway wall
    const outerX = s * (xi - 3.2); // row near the outer wall
    for (let z = L.pitZ[0] + 2.2; z < L.stairZ[0] - 1.0; z += 2.6) {
      consoleUnit(kit, outerX, PIT_FLOOR, z, { w: 2.0, facing, screen: "screenImp" + ((Math.round(z) + s) % 4 + 4) % 4, seed: Math.round(z) });
      seat(kit, outerX - s * 1.1, PIT_FLOOR, z, facing);
      if (z < L.stairZ[0] - 4) consoleUnit(kit, innerX, PIT_FLOOR, z + 1.3, { w: 2.0, facing: facing === 1 ? 3 : 1, screen: "screenImp" + (Math.round(z) % 4), seed: Math.round(z) + 1 });
    }
    // pit wall display band (large dark screens on the outer wall at eye height)
    for (let z = L.pitZ[0] + 1.5; z < L.pitZ[1] - 2; z += 4.2) {
      const x = s * (xi - 0.12);
      kit.boxMM("darkGloss", [Math.min(x, x - s * 0.06), PIT_FLOOR + 1.2, z], [Math.max(x, x - s * 0.06), PIT_FLOOR + 2.4, z + 3.2]);
      kit.boxMM("screenImp" + (Math.round(z) % 4), [Math.min(x - s * 0.06, x - s * 0.07), PIT_FLOOR + 1.3, z + 0.15], [Math.max(x - s * 0.06, x - s * 0.07), PIT_FLOOR + 2.3, z + 3.05], { uv: "keep" });
    }
  }

  // --- commander's dais on the aft deck: raised plinth, chair, flanking pedestals, holo plinth ahead of it
  const dz = 505.5;
  kit.boxMM("blackGloss", [-2.6, FLOOR, dz - 2.2], [2.6, FLOOR + 0.22, dz + 2.2], { color: IMP.black, texel: 0.5 });
  kit.boxMM("metal", [-2.6, FLOOR + 0.22, dz - 2.2], [2.6, FLOOR + 0.235, dz - 2.14], { color: IMP.mid });
  kit.collider([-2.6, FLOOR, dz - 2.2], [2.6, FLOOR + 0.22, dz + 2.2], "dais");
  seat(kit, 0, FLOOR + 0.22, dz + 0.6, 0);
  kit.boxMM("paintedMetal", [-0.45, FLOOR + 0.22, dz + 0.35], [0.45, FLOOR + 1.6, dz + 1.0], { color: IMP.dark, texel: 1 }); // high chair back
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [s * 1.6 - 0.25, FLOOR + 0.22, dz - 0.4], [s * 1.6 + 0.25, FLOOR + 1.15, dz + 0.4], { color: IMP.black, texel: 1 });
    kit.boxMM("screenImp" + (s < 0 ? 1 : 2), [s * 1.6 - 0.2, FLOOR + 1.16, dz - 0.3], [s * 1.6 + 0.2, FLOOR + 1.17, dz + 0.3], { uv: "keep" });
  }
  // holo plinth forward of the dais (animated projection comes in the detail pass)
  kit.add("paintedMetal", new THREE.CylinderGeometry(0.9, 1.1, 0.9, 16), { pos: [0, FLOOR + 0.45, 501.6], color: IMP.black, texel: 1 });
  kit.add("holo", new THREE.CylinderGeometry(0.75, 0.75, 0.05, 24), { pos: [0, FLOOR + 0.93, 501.6] });
  kit.collider([-1.1, FLOOR, 500.5], [1.1, FLOOR + 1.0, 502.7], "holo");

  // --- aft wall station bank either side of the blast door
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x = s * (4.2 + i * 3.4);
      consoleUnit(kit, x, FLOOR, 510.55, { w: 3.0, facing: 2, screen: "screenImp" + ((i + (s < 0 ? 0 : 2)) % 4), seed: i });
      seat(kit, x, FLOOR, 509.5, 2);
    }
  }
}
