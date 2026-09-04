// Architectural dressing: cove soffits with short ribs every 4 m (ribs never cross the two ceiling channels, so
// the channels stay two unbroken low lines), a per-bay cove strip over the window band only, cable tray,
// framed ship-silhouette plaques, junction boxes, vents, intercoms and decals.
import * as THREE from "three";
import { IMP } from "../shared/palette.js";
import { decalRect } from "../../../textures.js";

const X0 = -83.7;
const X1 = -20.3;
const N_FACE = 458.3;
const S_FACE = 465.7;

export function dressing(kit, FLOOR, ceilY, A) {
  ceilingWork(kit, ceilY, A);
  southWall(kit, FLOOR);
  northWallEast(kit, FLOOR);
  doorEnd(kit, FLOOR);
}

function ceilingWork(kit, ceilY, A) {
  // dropped soffits along both long walls with a black lip
  for (const [z0, z1, dir] of [[N_FACE, N_FACE + 0.75, 1], [S_FACE - 0.75, S_FACE, -1]]) {
    kit.boxMM("paintedMetal", [X0, ceilY - 0.32, z0], [X1, ceilY + 0.01, z1], { color: IMP.dark, texel: 0.5 });
    const lipZ = dir > 0 ? z1 : z0;
    kit.boxMM("paintedMetal", [X0, ceilY - 0.4, dir > 0 ? lipZ - 0.1 : lipZ], [X1, ceilY - 0.3, dir > 0 ? lipZ : lipZ + 0.1], { color: IMP.black, texel: 0.5 });
  }
  // cove strip only over the window band: one short 12 mm segment centred on each bay (reads as discrete cove
  // lights, not a broken bar)
  const n = 7;
  const pw = (A.x1 - A.x0) / n;
  for (let i = 0; i < n; i++) {
    const x = A.x0 + (i + 0.5) * pw;
    kit.boxMM("emitWhite", [x - 0.8, ceilY - 0.376, N_FACE + 0.75], [x + 0.8, ceilY - 0.364, N_FACE + 0.78]);
  }
  // short ribs every 4 m on both soffits (they stop well short of the channels at z 460.2 / 463.8)
  for (let x = -82; x <= -22; x += 4) {
    for (const [z0, z1] of [[N_FACE, N_FACE + 1.15], [S_FACE - 1.15, S_FACE]]) {
      kit.boxMM("paintedMetal", [x - 0.16, ceilY - 0.44, z0], [x + 0.16, ceilY + 0.01, z1], { color: IMP.black, texel: 1 });
      kit.boxMM("metal", [x - 0.02, ceilY - 0.45, z0 + 0.1], [x + 0.02, ceilY - 0.44, z1 - 0.1], { color: IMP.grey, texel: 1 });
    }
  }
}

function southWall(kit, y) {
  const zf = S_FACE;
  // cable tray high on the wall, west of the star-map wall, with hangers and two cable runs
  kit.boxMM("metal", [X0 + 0.3, y + 4.55, zf - 0.34], [-46.4, y + 4.6, zf - 0.04], { color: IMP.dark, texel: 1 });
  kit.boxMM("metal", [X0 + 0.3, y + 4.55, zf - 0.34], [-46.4, y + 4.72, zf - 0.3], { color: IMP.dark, texel: 1 });
  kit.boxMM("metal", [X0 + 0.3, y + 4.55, zf - 0.08], [-46.4, y + 4.72, zf - 0.04], { color: IMP.dark, texel: 1 });
  for (let x = -82; x < -46.4; x += 4) kit.boxMM("paintedMetal", [x - 0.04, y + 4.5, zf - 0.36], [x + 0.04, y + 4.8, zf], { color: IMP.black, texel: 1 });
  kit.cyl("paintedMetal", -65, y + 4.63, zf - 0.19, 0.03, 36, "x", { color: IMP.black, texel: 1 });
  kit.cyl("paintedMetal", -65, y + 4.63, zf - 0.27, 0.025, 36, "x", { color: IMP.black, texel: 1 });
  // ship-silhouette plaques centred behind each seating group, above the wall strip
  for (const [x, i] of [[-76, 0], [-64, 1], [-52, 2]]) plaque(kit, x, y + 2.75, zf, -1, i);
  // junction boxes / vents / intercom panels between the groups
  for (const [x, kind] of [[-79.5, "jbox"], [-70, "vent"], [-67, "intercom"], [-61, "jbox"], [-58, "vent"], [-49, "intercom"]]) greeble(kit, x, y, zf, -1, kind);
  kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [-73, y + 1.6, zf - 0.001], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(0) });
  kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [-55, y + 1.6, zf - 0.001], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(8) });
  kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [-28.5, y + 1.9, zf - 0.001], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(6) });
}

// blank north-wall stretch between the briefing niche and the counter (x -41.5..-34): two plaques + a vent
function northWallEast(kit, y) {
  plaque(kit, -40.2, y + 2.3, N_FACE, 1, 3);
  plaque(kit, -36.2, y + 2.3, N_FACE, 1, 4);
  greeble(kit, -38.2, y, N_FACE, 1, "vent");
  greeble(kit, -34.6, y, N_FACE, 1, "intercom");
}

// Framed plaque: dark plate, light-grey frame, thin polished-metal wireframe of a wedge-hulled ship (side
// elevation, original silhouette), small spec decal. facing: -1 = plate on a +z-facing... i.e. wall at z = zf
// facing -z (south wall), +1 = wall facing +z (north wall).
function plaque(kit, cx, cy, zf, facing, variant) {
  const w = 1.3;
  const h = 0.8;
  const d = facing * 0.06; // plate depth into the room
  const zr = (t) => zf + facing * t; // t = distance from the wall face into the room
  const zmm = (t0, t1) => [Math.min(zr(t0), zr(t1)), Math.max(zr(t0), zr(t1))];
  let [za, zb] = zmm(0, 0.05);
  kit.boxMM("paintedMetal", [cx - w / 2, cy - h / 2, za], [cx + w / 2, cy + h / 2, zb], { color: IMP.black, texel: 1 });
  [za, zb] = zmm(0.05, 0.07);
  const f = 0.035;
  kit.boxMM("metal", [cx - w / 2, cy + h / 2 - f, za], [cx + w / 2, cy + h / 2, zb], { color: IMP.grey, texel: 1 });
  kit.boxMM("metal", [cx - w / 2, cy - h / 2, za], [cx + w / 2, cy - h / 2 + f, zb], { color: IMP.grey, texel: 1 });
  kit.boxMM("metal", [cx - w / 2, cy - h / 2, za], [cx - w / 2 + f, cy + h / 2, zb], { color: IMP.grey, texel: 1 });
  kit.boxMM("metal", [cx + w / 2 - f, cy - h / 2, za], [cx + w / 2, cy + h / 2, zb], { color: IMP.grey, texel: 1 });
  // wireframe lines: local u (along wall, +u toward +x for the south wall so the nose points west), v up
  const zl = zr(0.055);
  const line = (u0, v0, u1, v1) => {
    const du = u1 - u0;
    const dv = v1 - v0;
    const len = Math.hypot(du, dv);
    kit.add("metal", new THREE.BoxGeometry(len, 0.012, 0.01), { pos: [cx + (u0 + u1) / 2, cy + (v0 + v1) / 2, zl], rot: [0, 0, Math.atan2(dv, du)], color: IMP.white, texel: 1 });
  };
  const s = 0.42; // half length of the hull
  if (variant % 3 === 0) {
    // wedge: nose left, tall aft, superstructure block and tower
    line(-s, -0.02, s, -0.16); line(-s, -0.02, s, 0.08); line(s, -0.16, s, 0.08);
    line(0.0, 0.03, 0.0, 0.12); line(0.0, 0.12, 0.3, 0.12); line(0.3, 0.12, 0.3, 0.066);
    line(0.15, 0.12, 0.15, 0.22); line(0.21, 0.12, 0.21, 0.22); line(0.13, 0.22, 0.23, 0.22);
    line(-0.2, -0.06, 0.1, -0.06);
  } else if (variant % 3 === 1) {
    // frigate: slab hull with forward spine and engine block
    line(-s, 0.0, -0.1, 0.0); line(-s, -0.04, -0.1, -0.04); line(-s, 0.0, -s, -0.04);
    line(-0.1, 0.09, s, 0.09); line(-0.1, -0.11, s, -0.11); line(-0.1, 0.09, -0.1, -0.11); line(s, 0.09, s, -0.11);
    line(0.05, 0.09, 0.05, 0.16); line(0.05, 0.16, 0.25, 0.16); line(0.25, 0.16, 0.25, 0.09);
    line(s, -0.02, s + 0.06, -0.02); line(s, -0.07, s + 0.06, -0.07);
  } else {
    // ring station in elevation: two concentric rings as 16-gon polylines and a hub column
    for (const r of [0.28, 0.2]) {
      for (let k = 0; k < 16; k++) {
        const a0 = (k / 16) * Math.PI * 2;
        const a1 = ((k + 1) / 16) * Math.PI * 2;
        line(r * Math.cos(a0), r * Math.sin(a0), r * Math.cos(a1), r * Math.sin(a1));
      }
    }
    line(-0.03, -0.34, -0.03, 0.34); line(0.03, -0.34, 0.03, 0.34); line(-0.03, 0.34, 0.03, 0.34); line(-0.03, -0.34, 0.03, -0.34);
  }
  kit.add("decal", new THREE.PlaneGeometry(0.22, 0.22), { pos: [cx + w / 2 - 0.2, cy - h / 2 + 0.16, zr(0.051)], rot: [0, facing > 0 ? 0 : Math.PI, 0], uv: "keep", uvRect: decalRect(9) });
  [za, zb] = zmm(0.05, 0.056);
  kit.boxMM("emitBlue", [cx - w / 2 + 0.1, cy - h / 2 + 0.08, za], [cx - w / 2 + 0.16, cy - h / 2 + 0.1, zb]);
}

function greeble(kit, x, y, zf, facing, kind) {
  const zr = (t) => zf + facing * t;
  const Z = (t0, t1) => [Math.min(zr(t0), zr(t1)), Math.max(zr(t0), zr(t1))];
  const box = (mat, x0, y0, t0, x1, y1, t1, opts) => {
    const [za, zb] = Z(t0, t1);
    kit.boxMM(mat, [x0, y0, za], [x1, y1, zb], opts);
  };
  const decal = (idx, size, dx, dy, t) => kit.add("decal", new THREE.PlaneGeometry(size, size), { pos: [x + dx, y + dy, zr(t)], rot: [0, facing > 0 ? 0 : Math.PI, 0], uv: "keep", uvRect: decalRect(idx) });
  if (kind === "jbox") {
    box("paintedMetal", x - 0.22, y + 1.5, 0, x + 0.22, y + 2.05, 0.14, { color: IMP.black, texel: 1 });
    box("paintedMetal", x - 0.18, y + 1.54, 0.14, x + 0.18, y + 2.01, 0.16, { color: IMP.dark, texel: 1 });
    box("emitAmber", x - 0.12, y + 1.92, 0.16, x - 0.06, y + 1.96, 0.165, {});
    box("emitBlue", x + 0.06, y + 1.92, 0.16, x + 0.12, y + 1.96, 0.165, {});
    kit.cyl("metal", x, y + 2.3, zr(0.07), 0.03, 0.5, "y", { color: IMP.dark, texel: 1 });
    box("metal", x - 0.05, y + 2.05, 0.02, x + 0.05, y + 2.2, 0.12, { color: IMP.grey, texel: 1 });
    decal(12, 0.2, 0, 1.7, 0.161);
  } else if (kind === "vent") {
    box("paintedMetal", x - 0.5, y + 3.4, 0, x + 0.5, y + 3.9, 0.1, { color: IMP.black, texel: 1 });
    for (let i = 0; i < 6; i++) box("paintedMetal", x - 0.46, y + 3.45 + i * 0.075, 0.1, x + 0.46, y + 3.45 + i * 0.075 + 0.035, 0.12, { color: IMP.grey, texel: 1 });
  } else {
    box("paintedMetal", x - 0.14, y + 1.35, 0, x + 0.14, y + 1.75, 0.08, { color: IMP.dark, texel: 1 });
    box("paintedMetal", x - 0.11, y + 1.38, 0.08, x + 0.11, y + 1.6, 0.09, { color: IMP.black, texel: 1 });
    box("emitRedImp", x - 0.03, y + 1.66, 0.08, x + 0.03, y + 1.7, 0.085, {});
    box("emitBlue", x - 0.08, y + 1.4, 0.09, x + 0.08, y + 1.43, 0.092, {});
    decal(9, 0.16, 0, 1.5, 0.091);
  }
}

// Pendant downlight: thin rod from the ceiling, dark can, amber-white emissive disc underneath. The warm point
// descriptor sits inside the can (see index.js), so the source reads as a fixture instead of a ceiling blob.
export function pendant(kit, x, ceilY, z) {
  const top = ceilY - 1.05;
  kit.cyl("paintedMetal", x, (ceilY + top) / 2, z, 0.015, ceilY - top, "y", { color: IMP.black, texel: 1, segments: 8 });
  kit.cyl("paintedMetal", x, ceilY - 0.02, z, 0.09, 0.04, "y", { color: IMP.black, texel: 1, segments: 16 });
  kit.cyl("paintedMetal", x, top - 0.15, z, 0.16, 0.3, "y", { color: IMP.black, texel: 1, segments: 20 });
  kit.cyl("metal", x, top - 0.31, z, 0.17, 0.02, "y", { color: IMP.grey, texel: 1, segments: 20 });
  kit.cyl("emitAmber", x, top - 0.325, z, 0.11, 0.01, "y", { segments: 20 });
}

// door end (x -24..-20.3): intercom + panel decal on the east wall, junction cabinet north of the counter's end
function doorEnd(kit, y) {
  const xf = X1;
  kit.boxMM("paintedMetal", [xf - 0.1, y + 1.3, 463.6], [xf, y + 1.75, 463.9], { color: IMP.dark, texel: 1 });
  kit.boxMM("emitRedImp", [xf - 0.105, y + 1.66, 463.71], [xf - 0.1, y + 1.7, 463.79]);
  kit.boxMM("emitBlue", [xf - 0.105, y + 1.36, 463.66], [xf - 0.1, y + 1.39, 463.84]);
  kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [xf - 0.001, y + 2.1, 461.2], rot: [0, -Math.PI / 2, 0], uv: "keep", uvRect: decalRect(8) });
  kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [-24.6, y + 2.2, S_FACE - 0.001], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(6) });
  kit.boxMM("paintedMetal", [xf - 0.35, y + 0.2, 458.6], [xf, y + 2.2, 459.5], { color: IMP.dark, texel: 1 });
  kit.boxMM("paintedMetal", [xf - 0.37, y + 0.3, 458.7], [xf - 0.35, y + 2.1, 459.4], { color: IMP.black, texel: 1 });
  kit.boxMM("emitAmber", [xf - 0.375, y + 1.9, 458.8], [xf - 0.37, y + 1.94, 459.3]);
  kit.boxMM("emitBlue", [xf - 0.375, y + 1.8, 458.8], [xf - 0.37, y + 1.84, 459.1]);
  kit.collider([xf - 0.4, y, 458.6], [xf, y + 2.2, 459.5], "cabinet");
}
