// Lounge: seating groups facing the window, low tables with data pads, display plinths, floor inlays.
import * as THREE from "three";
import { IMP } from "../shared/palette.js";
import { decalRect } from "../../../textures.js";

export const GROUPS = [-76, -64, -52]; // bench centres (x)
export const PLINTHS = [-81.5, -70, -58]; // plinth centres (x)
const BENCH_Z = 463.3;
const PLINTH_Z = 463.55;

export function lounge(kit, FLOOR) {
  for (const cx of GROUPS) seatingGroup(kit, cx, FLOOR);
  for (const x of PLINTHS) plinth(kit, x, x === -81.5 ? 462.0 : PLINTH_Z, FLOOR);
  floorInlays(kit, FLOOR);
}

function seatingGroup(kit, cx, y) {
  const z0 = BENCH_Z;
  const half = 2.5;
  // bench: recessed black base, dark frame, three cushions, backrest, armrests
  kit.boxMM("paintedMetal", [cx - half + 0.25, y, z0 + 0.12], [cx + half - 0.25, y + 0.12, z0 + 0.6], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [cx - half, y + 0.12, z0], [cx + half, y + 0.42, z0 + 0.7], { color: IMP.dark, texel: 1 });
  for (let i = 0; i < 3; i++) {
    const x0 = cx - half + 0.06 + i * ((2 * half - 0.12) / 3);
    const x1 = x0 + (2 * half - 0.12) / 3 - 0.04;
    kit.boxMM("fabric", [x0, y + 0.42, z0 + 0.04], [x1, y + 0.5, z0 + 0.66], { color: IMP.mid, texel: 2 });
    kit.boxMM("fabric", [x0, y + 0.52, z0 + 0.62], [x1, y + 0.92, z0 + 0.7], { color: IMP.mid, texel: 2 });
  }
  kit.boxMM("paintedMetal", [cx - half, y + 0.42, z0 + 0.7], [cx + half, y + 0.98, z0 + 0.82], { color: IMP.dark, texel: 1 });
  kit.boxMM("metal", [cx - half, y + 0.98, z0 + 0.68], [cx + half, y + 1.0, z0 + 0.84], { color: IMP.grey, texel: 1 });
  for (const s of [-1, 1]) {
    const ax = cx + s * (half + 0.1);
    kit.boxMM("blackGloss", [Math.min(ax, ax - s * 0.2), y + 0.5, z0], [Math.max(ax, ax - s * 0.2), y + 0.66, z0 + 0.78], {});
    kit.boxMM("paintedMetal", [Math.min(ax, ax - s * 0.14), y + 0.12, z0 + 0.06], [Math.max(ax, ax - s * 0.14), y + 0.5, z0 + 0.72], { color: IMP.black, texel: 1 });
  }
  kit.collider([cx - half - 0.15, y, z0], [cx + half + 0.15, y + 1.0, z0 + 0.85], "bench");

  // low table in front: floating gloss top on a black pedestal, two data pads, one edge glow
  const tz = 461.75;
  kit.boxMM("paintedMetal", [cx - 0.55, y, tz + 0.15], [cx + 0.55, y + 0.4, tz + 0.55], { color: IMP.black, texel: 1 });
  kit.boxMM("blackGloss", [cx - 0.9, y + 0.42, tz], [cx + 0.9, y + 0.47, tz + 0.72], {});
  kit.boxMM("metal", [cx - 0.9, y + 0.4, tz + 0.02], [cx + 0.9, y + 0.42, tz + 0.7], { color: IMP.grey, texel: 1 });
  kit.boxMM("emitBlue", [cx - 0.5, y + 0.43, tz - 0.005], [cx + 0.5, y + 0.445, tz + 0.005]);
  dataPad(kit, cx - 0.42, y + 0.47, tz + 0.36, 0.25, "screenImp1");
  dataPad(kit, cx + 0.38, y + 0.47, tz + 0.3, -0.6, "screenImp2");
  kit.add("decal", new THREE.PlaneGeometry(0.2, 0.2), { pos: [cx + 0.7, y + 0.4701, tz + 0.55], rot: [-Math.PI / 2, 0, 0], uv: "keep", uvRect: decalRect(13) });
  kit.collider([cx - 0.95, y, tz], [cx + 0.95, y + 0.5, tz + 0.75], "table");
}

function dataPad(kit, x, y, z, yaw, screen) {
  const rot = [0, yaw, 0];
  kit.add("blackGloss", new THREE.BoxGeometry(0.26, 0.012, 0.18), { pos: [x, y + 0.006, z], rot });
  kit.add(screen, new THREE.BoxGeometry(0.22, 0.004, 0.14), { pos: [x, y + 0.013, z], rot, uv: "keep" });
}

function plinth(kit, x, z, y) {
  kit.boxMM("paintedMetal", [x - 0.5, y, z - 0.5], [x + 0.5, y + 0.1, z + 0.5], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [x - 0.36, y + 0.1, z - 0.36], [x + 0.36, y + 1.0, z + 0.36], { color: IMP.dark, texel: 1 });
  kit.boxMM("metal", [x - 0.38, y + 0.5, z - 0.38], [x + 0.38, y + 0.54, z + 0.38], { color: IMP.grey, texel: 1 });
  kit.boxMM("blackGloss", [x - 0.45, y + 1.0, z - 0.45], [x + 0.45, y + 1.06, z + 0.45], {});
  kit.cyl("emitBlue", x, y + 1.062, z, 0.3, 0.012, "y", {});
  kit.cyl("paintedMetal", x, y + 1.065, z, 0.24, 0.02, "y", { color: IMP.black, texel: 1 });
  kit.boxMM("emitAmber", [x - 0.05, y + 0.72, z + 0.36], [x + 0.05, y + 0.74, z + 0.37]);
  kit.boxMM("emitBlue", [x - 0.05, y + 0.68, z + 0.36], [x + 0.05, y + 0.7, z + 0.37]);
  kit.add("decal", new THREE.PlaneGeometry(0.3, 0.3), { pos: [x, y + 0.35, z + 0.361], uv: "keep", uvRect: decalRect(2) });
  kit.add("decal", new THREE.PlaneGeometry(0.3, 0.3), { pos: [x, y + 0.35, z - 0.361], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(2) });
  kit.collider([x - 0.5, y, z - 0.5], [x + 0.5, y + 1.1, z + 0.5], "plinth");
}

// light-grey strips inlaid in the dark gloss floor along the window, cross ties at each seating group
function floorInlays(kit, y) {
  const y1 = y + 0.006;
  const w = 0.14;
  for (const z of [459.75, 461.35]) kit.boxMM("impFloor", [-80.5, y, z - w / 2], [-47.5, y1, z + w / 2], { color: IMP.grey, texel: 1 });
  for (const cx of GROUPS) {
    for (const s of [-1, 1]) kit.boxMM("impFloor", [cx + s * 3.3 - w / 2, y, 459.75], [cx + s * 3.3 + w / 2, y1, 464.3], { color: IMP.grey, texel: 1 });
  }
  // east-part border: frames the star-map wall and counter zone
  kit.boxMM("impFloor", [-47.5, y, 461.35 - w / 2], [-21.5, y1, 461.35 + w / 2], { color: IMP.grey, texel: 1 });
  kit.boxMM("impFloor", [-47.5 - w / 2, y, 459.75], [-47.5 + w / 2, y1, 464.3], { color: IMP.grey, texel: 1 });
}

// holo anchors above the plinth caps
export function holoAnchors(FLOOR) {
  return PLINTHS.map((x) => ({ pos: [x, FLOOR + 1.55, x === -81.5 ? 462.0 : PLINTH_Z], scale: 0.9 }));
}
