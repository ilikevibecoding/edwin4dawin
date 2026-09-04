// Lounge: seating groups facing the window, low tables with datapads, display plinths, floor inlays.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { IMP } from "../shared/palette.js";
import { decalRect } from "../../../textures.js";

export const GROUPS = [-76, -64, -52]; // bench centres (x) facing the window
export const EAST_GROUP = { cx: -37.5, z0: 462.9 }; // bench facing the star-map wall (+z)
export const PLINTHS = [-81.5, -70, -58]; // plinth centres (x)
const BENCH_Z = 463.3;
const PLINTH_Z = 463.55;
// mid-tint upholstery (critic round 2: the dark slabs read as blocking geometry); pool illuminance on the seats is
// ≈ 1.5–3, so IMP.grey × the fabric weave (albedo ≈ 0.2) sits well below clipping and reads as grey cloth
export const CUSHION = IMP.grey;
// impPanel tints (paintedMetal's chip map reads as stains at furniture size); ×0.47 keeps paintedMetal's albedo
const clean = (c, texel = 1) => ({ color: c.clone().multiplyScalar(0.47), texel });
const cBlack = clean(IMP.black);
const cDark = clean(IMP.dark);
// bench back inset: full IMP.grey — it faces away from every pool, so only the south fill spot and ambient reach it
const BACK_PANEL = { color: IMP.grey, texel: 1 };

export function lounge(kit, FLOOR) {
  for (const cx of GROUPS) seatingGroup(kit, cx, FLOOR, BENCH_Z, -1, cx === -64);
  seatingGroup(kit, EAST_GROUP.cx, FLOOR, EAST_GROUP.z0, 1, true);
  for (const x of PLINTHS) plinth(kit, x, x === -81.5 ? 462.0 : PLINTH_Z, FLOOR);
  floorInlays(kit, FLOOR);
}

// Chamfered cushion: RoundedBoxGeometry with one segment (45° chamfer, 108 tris), axis-aligned, mid tint.
export function cushion(kit, x0, x1, y0, y1, z0, z1, r = 0.035, color = CUSHION) {
  kit.add("fabric", new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 1, r), { pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], color, texel: 2 });
}

/**
 * Bench + low table. dir = -1: seat faces -z (front edge at z0, back toward +z); dir = +1: faces +z.
 * Local depth d runs from the front edge (0) toward the back (positive) and toward the table (negative).
 */
function seatingGroup(kit, cx, y, z0, dir, withCase) {
  const Z = (d0, d1) => [Math.min(z0 + dir * d0, z0 + dir * d1), Math.max(z0 + dir * d0, z0 + dir * d1)];
  const B = (mat, x0, x1, y0, y1, d0, d1, opts = {}) => {
    const [za, zb] = Z(d0, d1);
    kit.boxMM(mat, [x0, y0, za], [x1, y1, zb], opts);
  };
  const half = 2.5;
  // bench on six short legs (plinth gap under a black frame), three chamfered seat cushions and three taller
  // chamfered back cushions whose rounded tops show above the back panel, so it reads as upholstery from behind
  for (const lx of [cx - half + 0.15, cx, cx + half - 0.15]) {
    for (const d of [0.1, 0.62]) {
      const [za, zb] = Z(d, d);
      kit.cyl("metal", lx, y + 0.06, za, 0.03, 0.12, "y", { color: IMP.grey, texel: 1, segments: 8 });
    }
  }
  B("impPanel", cx - half, cx + half, y + 0.12, y + 0.4, 0, 0.7, cBlack);
  // metalRough, not bare metal: the seat-pan edge trim mirrored a soffit can as a 93 x 11 px patch with a halo from
  // the window camera (critic round 4: "white specular patch on the sofa base"); the flat lobe stays under 0.25
  B("metalRough", cx - half - 0.01, cx + half + 0.01, y + 0.38, y + 0.4, -0.01, 0.71, { color: IMP.grey, texel: 1 });
  // blue hairline along the frame's lower edge, front and back: the plinth gap reads as a lit gap, not a shadow
  B("emitBlue", cx - half + 0.2, cx + half - 0.2, y + 0.135, y + 0.145, -0.005, 0.0);
  B("emitBlue", cx - half + 0.2, cx + half - 0.2, y + 0.135, y + 0.145, 0.7, 0.705);
  for (let i = 0; i < 3; i++) {
    const x0 = cx - half + 0.06 + i * ((2 * half - 0.12) / 3);
    const x1 = x0 + (2 * half - 0.12) / 3 - 0.04;
    let [za, zb] = Z(0.04, 0.64);
    cushion(kit, x0, x1, y + 0.4, y + 0.52, za, zb, 0.04);
    [za, zb] = Z(0.6, 0.72);
    cushion(kit, x0 + 0.01, x1 - 0.01, y + 0.52, y + 0.98, za, zb, 0.04);
  }
  // back panel: black frame with an inset clean panel on the rear face and a light-grey top rail
  B("impPanel", cx - half, cx + half, y + 0.4, y + 0.9, 0.72, 0.82, cBlack);
  B("impPanel", cx - half + 0.08, cx + half - 0.08, y + 0.46, y + 0.84, 0.82, 0.835, BACK_PANEL);
  B("metalRough", cx - half, cx + half, y + 0.9, y + 0.92, 0.7, 0.84, { color: IMP.grey, texel: 1 });
  for (const s of [-1, 1]) {
    const ax = cx + s * (half + 0.1);
    B("impPanel", Math.min(ax, ax - s * 0.2), Math.max(ax, ax - s * 0.2), y + 0.5, y + 0.66, 0, 0.78, cBlack);
    B("metal", Math.min(ax, ax - s * 0.2), Math.max(ax, ax - s * 0.2), y + 0.66, y + 0.68, 0, 0.78, { color: IMP.grey, texel: 1 });
    B("impPanel", Math.min(ax, ax - s * 0.14), Math.max(ax, ax - s * 0.14), y + 0.12, y + 0.5, 0.06, 0.72, cBlack);
  }
  let [za, zb] = Z(0, 0.85);
  kit.collider([cx - half - 0.15, y, za], [cx + half + 0.15, y + 1.0, zb], "bench");

  // low table in front: floating gloss top on a black pedestal, datapads, cup, optional case
  B("impPanel", cx - 0.55, cx + 0.55, y, y + 0.4, -1.4, -1.0, cBlack);
  B("blackGloss", cx - 0.9, cx + 0.9, y + 0.42, y + 0.47, -1.55, -0.83);
  B("metal", cx - 0.9, cx + 0.9, y + 0.4, y + 0.42, -1.53, -0.85, { color: IMP.grey, texel: 1 });
  const tz = (d) => z0 + dir * d;
  dataPad(kit, cx - 0.42, y + 0.47, tz(-1.2), 0.25, 6);
  dataPad(kit, cx + 0.38, y + 0.47, tz(-1.3), -0.6, 9);
  kit.cyl("metal", cx + 0.05, y + 0.515, tz(-1.05), 0.04, 0.09, "y", { color: IMP.white, texel: 1, segments: 12 });
  if (withCase) {
    B("impPanel", cx - 0.2, cx + 0.15, y + 0.47, y + 0.56, -1.5, -1.28, cDark);
    B("metal", cx - 0.2, cx + 0.15, y + 0.5, y + 0.53, -1.5, -1.28, { color: IMP.grey, texel: 1 });
  }
  [za, zb] = Z(-1.58, -0.8);
  kit.collider([cx - 0.95, y, za], [cx + 0.95, y + 0.5, zb], "table");
}

// Datapad: dark bezel, non-emissive printed face (lit by the pools only), one 1 cm status dot.
export function dataPad(kit, x, y, z, yaw, decalIdx) {
  const rot = [0, yaw, 0];
  kit.add("blackGloss", new THREE.BoxGeometry(0.26, 0.014, 0.18), { pos: [x, y + 0.007, z], rot });
  kit.add("paintedMetal", new THREE.BoxGeometry(0.22, 0.004, 0.14), { pos: [x, y + 0.015, z], rot, color: IMP.black, texel: 1 });
  // lay the print flat first, then yaw it with the pad (Euler XYZ would tilt it instead)
  const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
  kit.add("decal", new THREE.PlaneGeometry(0.13, 0.13), { pos: [x, y + 0.0175, z], quat, uv: "keep", uvRect: decalRect(decalIdx) });
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  kit.add("emitBlue", new THREE.BoxGeometry(0.01, 0.003, 0.01), { pos: [x + 0.1 * c + 0.06 * s, y + 0.0165, z - 0.1 * s + 0.06 * c], rot });
}

function plinth(kit, x, z, y) {
  kit.boxMM("paintedMetal", [x - 0.5, y, z - 0.5], [x + 0.5, y + 0.1, z + 0.5], { color: IMP.black, texel: 1 });
  kit.boxMM("impPanel", [x - 0.36, y + 0.1, z - 0.36], [x + 0.36, y + 1.0, z + 0.36], cDark);
  kit.boxMM("metal", [x - 0.38, y + 0.5, z - 0.38], [x + 0.38, y + 0.54, z + 0.38], { color: IMP.grey, texel: 1 });
  kit.boxMM("blackGloss", [x - 0.45, y + 1.0, z - 0.45], [x + 0.45, y + 1.06, z + 0.45], {});
  kit.cyl("emitBlue", x, y + 1.062, z, 0.3, 0.012, "y", {});
  kit.cyl("paintedMetal", x, y + 1.065, z, 0.26, 0.02, "y", { color: IMP.black, texel: 1 });
  kit.boxMM("emitAmber", [x - 0.05, y + 0.72, z + 0.36], [x + 0.05, y + 0.74, z + 0.37]);
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
  kit.boxMM("impFloor", [-47.5, y, 461.35 - w / 2], [-21.5, y1, 461.35 + w / 2], { color: IMP.grey, texel: 1 });
  kit.boxMM("impFloor", [-47.5 - w / 2, y, 459.75], [-47.5 + w / 2, y1, 464.3], { color: IMP.grey, texel: 1 });
}

// holo anchors above the plinth caps
export function holoAnchors(FLOOR) {
  return PLINTHS.map((x) => ({ pos: [x, FLOOR + 1.55, x === -81.5 ? 462.0 : PLINTH_Z], scale: 0.9 }));
}
