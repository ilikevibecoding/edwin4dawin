// Bridge stations: forward sill consoles under the window band, console rows in both crew pits, the
// commander's dais on the aft deck, and the aft wall station bank. Matte-black consoles, red/blue/amber
// instruments (§11). Phase 1 massing; detail passes add screens, chairs, cabling and animation.
import * as THREE from "three";
import { FLOOR, PIT_FLOOR } from "../shared/plan.js";
import { IMP } from "../shared/palette.js";

// A console unit: sloped desk on a plinth with a screen strip and indicator lights. Faces -z by default (rot in quarter turns).
export function consoleUnit(kit, cx, cy, cz, { w = 1.6, facing = 0, screen = "screenImp0", seed = 0 } = {}) {
  const d = 0.8;
  const rot = [0, (facing * Math.PI) / 2, 0];
  const box = (mat, ox, oy, oz, sx, sy, sz, opts = {}) => {
    // rotate the local offset (ox,oz) about y by facing
    const a = (facing * Math.PI) / 2;
    const rx = ox * Math.cos(a) + oz * Math.sin(a);
    const rz = -ox * Math.sin(a) + oz * Math.cos(a);
    kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [cx + rx, cy + oy, cz + rz], rot, ...opts });
  };
  box("paintedMetal", 0, 0.42, 0, w, 0.84, d, { color: IMP.black, texel: 1 }); // plinth
  box("darkGloss", 0, 0.9, -0.05, w - 0.06, 0.12, d - 0.1); // desk top
  box("paintedMetal", 0, 1.08, -d / 2 + 0.12, w - 0.1, 0.36, 0.14, { color: IMP.dark, texel: 1 }); // raised display housing
  box(screen, 0, 1.1, -d / 2 + 0.196, w - 0.3, 0.26, 0.01, { uv: "keep" }); // operator side of the housing
  // indicator cluster on the desk
  const cols = ["emitRedImp", "emitBlue", "emitAmber", "emitBlue", "emitRedImp"];
  for (let i = 0; i < 5; i++) box(cols[(((i + seed) % cols.length) + cols.length) % cols.length], -w / 2 + 0.2 + i * 0.12, 0.965, 0.18, 0.06, 0.01, 0.04);
  box("emitBlue", 0.25, 0.965, 0.22, w * 0.35, 0.01, 0.03);
  kit.collider([cx - w / 2 - 0.05, cy, cz - d / 2 - 0.05], [cx + w / 2 + 0.05, cy + 1.3, cz + d / 2 + 0.05], "console");
}

// Simple operator seat facing the same way as its console (facing quarter turns, seat centre).
export function seat(kit, cx, cy, cz, facing = 0) {
  const a = (facing * Math.PI) / 2;
  const off = (ox, oz) => [cx + ox * Math.cos(a) + oz * Math.sin(a), cz - ox * Math.sin(a) + oz * Math.cos(a)];
  const rot = [0, a, 0];
  let p = off(0, 0);
  kit.add("paintedMetal", new THREE.BoxGeometry(0.5, 0.08, 0.5), { pos: [p[0], cy + 0.48, p[1]], rot, color: IMP.dark, texel: 1 });
  kit.add("paintedMetal", new THREE.CylinderGeometry(0.06, 0.09, 0.44, 8), { pos: [p[0], cy + 0.22, p[1]], color: IMP.black, texel: 1 });
  p = off(0, 0.24);
  kit.add("paintedMetal", new THREE.BoxGeometry(0.5, 0.62, 0.06), { pos: [p[0], cy + 0.83, p[1]], rot, color: IMP.dark, texel: 1 });
}

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
