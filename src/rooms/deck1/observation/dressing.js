// Architectural dressing: cove soffits with short ribs every 4 m (ribs never cross the two ceiling channels, so
// the channels stay two unbroken low lines), a per-bay cove strip over the window band only, cable tray,
// framed ship-silhouette plaques, junction boxes, vents, intercoms and decals, the south-wall feature bay of
// over-panels around the star-chart plate, the ship-model display case and the raking key's housing.
import * as THREE from "three";
import { IMP } from "../shared/palette.js";
import { decalRect } from "../../../textures.js";
import { cellRect } from "./atlas.js";

const X0 = -83.7;
const X1 = -20.3;
const N_FACE = 458.3;
const S_FACE = 465.7;
// impPanel for every plate bigger than a hand's breadth (paintedMetal's chip map read as stains at room scale,
// critic round 2); ×0.47 keeps the albedo paintedMetal had at the same tint
const clean = (c, texel = 1) => ({ color: c.clone().multiplyScalar(0.47), texel });
const cBlack = clean(IMP.black);
const cDark = clean(IMP.dark);

export function dressing(kit, FLOOR, ceilY, A) {
  ceilingWork(kit, ceilY, A);
  southWall(kit, FLOOR);
  featureBay(kit, FLOOR);
  northWallEast(kit, FLOOR);
  displayCase(kit, FLOOR);
  doorEnd(kit, FLOOR);
}

function ceilingWork(kit, ceilY, A) {
  // dropped soffits along both long walls with a black lip
  for (const [z0, z1, dir] of [[N_FACE, N_FACE + 0.75, 1], [S_FACE - 0.75, S_FACE, -1]]) {
    kit.boxMM("impPanel", [X0, ceilY - 0.32, z0], [X1, ceilY + 0.01, z1], clean(IMP.dark, 0.5));
    const lipZ = dir > 0 ? z1 : z0;
    kit.boxMM("impPanel", [X0, ceilY - 0.4, dir > 0 ? lipZ - 0.1 : lipZ], [X1, ceilY - 0.3, dir > 0 ? lipZ : lipZ + 0.1], clean(IMP.black, 0.5));
  }
  // cove strip only over the window band: one short 12 mm segment centred on each bay (reads as discrete cove
  // lights, not a broken bar)
  const n = 7;
  const pw = (A.x1 - A.x0) / n;
  for (let i = 0; i < n; i++) {
    const x = A.x0 + (i + 0.5) * pw;
    kit.boxMM("emitStrip", [x - 0.8, ceilY - 0.376, N_FACE + 0.75], [x + 0.8, ceilY - 0.364, N_FACE + 0.78]);
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

// blank north-wall stretch between the briefing niche and the counter (x -41.5..-34): two plaques + a vent; the
// intercom sits west of the -40.2 plaque, leaving the wall east of the -36.2 plaque to the display case
function northWallEast(kit, y) {
  plaque(kit, -40.2, y + 2.3, N_FACE, 1, 3);
  plaque(kit, -36.2, y + 2.3, N_FACE, 1, 4);
  greeble(kit, -38.2, y, N_FACE, 1, "vent");
  greeble(kit, -41.8, y, N_FACE, 1, "intercom");
}

// --- south-wall feature bay (x -46..-30.4, rib to rib) around the star-chart plate. Critic round 3: "rivet-grid
// wall reads as wallpaper under flat light". Two black backing plates (the shell's strip row stays exposed between
// them) carry clean over-panels in a 2.4 / 2.4 / 1.2 rhythm — half-width every third, one texture tile per plate
// so each plate has its own corner rivets — with 3 cm seams 2.5 cm deep that the raking key (index.js) shades from
// the west. Pilasters close both ends; the cable tray continues over the bay and feeds the chart plate through two
// conduit drops and a junction box; a vent grille sits on one of the half-width plates; an intercom east of the plate.
const BAY = { x0: -46.0, x1: -30.4, cuts: [-46.0, -43.6, -41.2, -40.0, -37.6, -35.2, -34.0, -31.6, -30.4] };
const PLATE = { x0: -42.2, x1: -33.8, y0: 1.16, y1: 3.04 }; // star-chart plate footprint (east.js)
function featureBay(kit, y) {
  const zf = S_FACE;
  const back = (y0, y1) => kit.boxMM("impPanel", [BAY.x0, y + y0, zf - 0.015], [BAY.x1, y + y1, zf], cBlack);
  back(0.33, 2.02);
  back(2.28, 4.92);
  const rows = [
    [0.36, 1.15],
    [1.21, 1.99],
    [2.31, 3.57],
    [3.63, 4.89],
  ];
  rows.forEach(([r0, r1], ri) => {
    for (let ci = 0; ci < BAY.cuts.length - 1; ci++) {
      const c0 = BAY.cuts[ci] + 0.015;
      const c1 = BAY.cuts[ci + 1] - 0.015;
      if (c0 >= PLATE.x0 - 0.05 && c1 <= PLATE.x1 + 0.05 && r0 >= PLATE.y0 - 0.05 && r1 <= PLATE.y1 + 0.05) continue; // behind the plate
      const half = c1 - c0 < 1.5;
      const tone = half ? IMP.grey : (ri + ci) % 5 === 4 ? IMP.hullLight : IMP.white;
      kit.boxMM("impPanel", [c0, y + r0, zf - 0.04], [c1, y + r1, zf - 0.015], { color: tone, uv: "scale", uvScale: [half ? 1 : 2, 1] });
    }
  });
  // pilasters with a steel rule, floor kick to soffit underside
  for (const px of [BAY.x0 - 0.1, BAY.x1 + 0.1]) {
    kit.boxMM("impPanel", [px - 0.11, y + 0.3, zf - 0.08], [px + 0.11, y + 5.08, zf], cDark);
    kit.boxMM("metal", [px - 0.02, y + 0.4, zf - 0.09], [px + 0.02, y + 4.95, zf - 0.08], { color: IMP.grey, texel: 1 });
  }
  // cable tray continued over the bay (the west run ends at -46.4): bottom, rails, hangers, two cables
  const tx0 = -46.4;
  const tx1 = BAY.x1;
  kit.boxMM("metal", [tx0, y + 4.55, zf - 0.34], [tx1, y + 4.6, zf - 0.04], { color: IMP.dark, texel: 1 });
  kit.boxMM("metal", [tx0, y + 4.55, zf - 0.34], [tx1, y + 4.72, zf - 0.3], { color: IMP.dark, texel: 1 });
  kit.boxMM("metal", [tx0, y + 4.55, zf - 0.08], [tx1, y + 4.72, zf - 0.04], { color: IMP.dark, texel: 1 });
  for (const x of [-45.6, -42, -38, -34, -30.8]) kit.boxMM("paintedMetal", [x - 0.04, y + 4.5, zf - 0.36], [x + 0.04, y + 4.8, zf], { color: IMP.black, texel: 1 });
  kit.cyl("paintedMetal", (tx0 + tx1) / 2, y + 4.63, zf - 0.19, 0.03, tx1 - tx0, "x", { color: IMP.black, texel: 1 });
  kit.cyl("paintedMetal", (tx0 + tx1) / 2, y + 4.63, zf - 0.27, 0.025, tx1 - tx0, "x", { color: IMP.black, texel: 1 });
  // conduit drops from the tray to the chart plate's top rail: bare at the west end, through a junction box at the east
  const drop = (x, y0, y1, clips = true) => {
    kit.cyl("paintedMetal", x, y + (y0 + y1) / 2, zf - 0.09, 0.028, y1 - y0, "y", { color: IMP.black, texel: 1, segments: 10 });
    if (clips) for (const cy of [y0 + 0.25, y1 - 0.25]) kit.boxMM("metal", [x - 0.05, y + cy - 0.02, zf - 0.13], [x + 0.05, y + cy + 0.02, zf - 0.03], { color: IMP.grey, texel: 1 });
  };
  drop(-41.9, PLATE.y1, 4.55);
  drop(-34.1, 3.75, 4.55);
  drop(-34.1, PLATE.y1, 3.2, false);
  kit.boxMM("paintedMetal", [-34.32, y + 3.2, zf - 0.16], [-33.88, y + 3.75, zf - 0.02], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [-34.28, y + 3.24, zf - 0.18], [-33.92, y + 3.71, zf - 0.16], { color: IMP.dark, texel: 1 });
  kit.boxMM("emitAmber", [-34.22, y + 3.62, zf - 0.185], [-34.16, y + 3.66, zf - 0.18]);
  kit.boxMM("emitBlue", [-34.04, y + 3.62, zf - 0.185], [-33.98, y + 3.66, zf - 0.18]);
  kit.add("decal", new THREE.PlaneGeometry(0.2, 0.2), { pos: [-34.1, y + 3.42, zf - 0.181], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(12) });
  // vent grille on the half-width plate over the west third of the chart plate
  kit.boxMM("impPanel", [-41.05, y + 3.75, zf - 0.12], [-40.15, y + 4.2, zf - 0.02], cBlack);
  for (let i = 0; i < 5; i++) kit.boxMM("paintedMetal", [-41.01, y + 3.8 + i * 0.075, zf - 0.14], [-40.19, y + 3.835 + i * 0.075, zf - 0.12], { color: IMP.grey, texel: 1 });
  greeble(kit, -32.7, y, zf, -1, "intercom");
}

// --- ship-model display case on the north wall between the -36.2 plaque and the counter (critic round 3: "put a
// crest or a ship-model display case between the left screens"). The lounge camera sees this wall at 13° from its
// plane, where a wall-facing case shows nothing but its side, so the case is turned to face WEST along the gallery:
// a 0.6 m wide black box standing 0.9 m off the wall with glass on its west face, the backlit recognition placard
// (atlas cell "fleet") on its east inner face and the wedge-hull model on a post between them, hull along the
// case's depth with the nose toward the room — the camera, like anyone walking east along the north side, reads
// the lit card with the model's broadside silhouette against it. Steel rules top and bottom, white hairline case
// light under the top.
function displayCase(kit, y) {
  const x0 = -35.3;
  const x1 = -34.7;
  const y0 = 1.95;
  const y1 = 3.05;
  const z0 = N_FACE;
  const z1 = N_FACE + 0.9;
  const f = 0.06;
  kit.boxMM("impPanel", [x0, y + y0, z0], [x1, y + y1, z0 + 0.04], cDark);
  kit.boxMM("impPanel", [x0, y + y1, z0], [x1, y + y1 + f, z1], cBlack);
  kit.boxMM("impPanel", [x0, y + y0 - f, z0], [x1, y + y0, z1], cBlack);
  kit.boxMM("impPanel", [x1 - f, y + y0, z0], [x1, y + y1, z1], cBlack);
  kit.boxMM("impPanel", [x0, y + y0, z1 - f], [x1, y + y1, z1], cBlack);
  kit.boxMM("metal", [x0, y + y1 + 0.04, z0], [x0 + 0.02, y + y1 + f, z1], { color: IMP.grey, texel: 1 });
  kit.boxMM("metal", [x0, y + y0 - f, z0], [x0 + 0.02, y + y0 - 0.04, z1], { color: IMP.grey, texel: 1 });
  kit.boxMM("obsScreen", [x1 - f - 0.005, y + 2.3, z0 + 0.05], [x1 - f, y + 2.7, z0 + 0.85], { uv: "keep", uvRect: cellRect("fleet") });
  kit.boxMM("emitStrip", [x0 + 0.08, y + y1 - 0.03, z0 + 0.1], [x0 + 0.12, y + y1 - 0.01, z1 - 0.1]);
  kit.add("glass", new THREE.PlaneGeometry(z1 - z0, y1 - y0).rotateY(-Math.PI / 2), { pos: [x0 + 0.01, y + (y0 + y1) / 2, (z0 + z1) / 2], uv: "keep" });
  const mx = x0 + 0.26;
  const mz = z0 + 0.36; // hull origin: nose 2/3 of the length toward the room, stern 1/3 toward the wall
  const yb = y + 2.33;
  shipModel(kit, [mx, mz], yb, Math.PI / 2, 0.7);
  kit.cyl("metal", mx, (y + y0 + yb) / 2, mz, 0.014, yb - y - y0, "y", { color: IMP.grey, texel: 1, segments: 8 });
  kit.cyl("paintedMetal", mx, y + y0 + 0.006, mz, 0.09, 0.012, "y", { color: IMP.black, texel: 1, segments: 16 });
  kit.add("decal", new THREE.PlaneGeometry(0.16, 0.16).rotateY(-Math.PI / 2), { pos: [x1 - f - 0.001, y + y0 + 0.12, z1 - 0.22], uv: "keep", uvRect: decalRect(9) });
  kit.collider([x0, y, z0], [x1, y + y1 + f, z1], "display-case");
}

// Wedge-hull capital-ship model, `len` m long: triangular-prism hull (3-segment cylinder, scaled) with a belly,
// terrace, tower neck and bridge in brushed metal, two deflector domes, three engines with blue glow. Local frame:
// u along the hull (nose at −u, 2/3 of the length ahead of the origin, the stern 1/3 behind it), v across the beam;
// `yaw` turns local +u from world +x (0) to world −z (π/2), so at π/2 the nose points to +z.
function shipModel(kit, [ox, oz], yb, yaw, len = 1.0) {
  const s = len;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const W = (u, v) => [ox + (u * cy + v * sy) * s, oz + (-u * sy + v * cy) * s];
  const rot = [0, yaw, 0];
  const uAxis = Math.abs(sy) > 0.5 ? "z" : "x";
  const hull = { color: IMP.hullLight, texel: 2 };
  const trim = { color: IMP.grey, texel: 2 };
  const box = (mat, u0, y0, v0, u1, y1, v1, o) => {
    const [x, z] = W((u0 + u1) / 2, (v0 + v1) / 2);
    kit.add(mat, new THREE.BoxGeometry((u1 - u0) * s, (y1 - y0) * s, (v1 - v0) * s), { pos: [x, yb + ((y0 + y1) / 2) * s, z], rot, ...o });
  };
  const cyl = (mat, u, y, v, r, h, axis, o) => {
    const [x, z] = W(u, v);
    kit.cyl(mat, x, yb + y * s, z, r * s, h * s, axis === "u" ? uAxis : "y", o);
  };
  const wedge = (l, beam, th) => new THREE.CylinderGeometry(1, 1, th * s, 3).scale((beam * s) / Math.sqrt(3), 1, (l * s) / 1.5).rotateY(-Math.PI / 2);
  let [x, z] = W(0, 0);
  kit.add("metal", wedge(1.0, 0.3, 0.06), { pos: [x, yb + 0.03 * s, z], rot, ...hull, uv: "scale", uvScale: [2, 1] });
  [x, z] = W(-0.02, 0);
  kit.add("metal", wedge(0.5, 0.16, 0.04), { pos: [x, yb - 0.02 * s, z], rot, ...hull, uv: "scale", uvScale: [1, 1] });
  box("metal", 0.03, 0.06, -0.07, 0.31, 0.095, 0.07, trim);
  box("metal", 0.14, 0.095, -0.02, 0.2, 0.15, 0.02, trim);
  box("metal", 0.1, 0.15, -0.05, 0.24, 0.18, 0.05, hull);
  for (const side of [-1, 1]) cyl("metal", 0.17, 0.19, side * 0.03, 0.012, 0.02, "y", { ...trim, segments: 8 });
  for (const dv of [-0.07, 0, 0.07]) {
    cyl("metal", 0.348, 0.03, dv, 0.022, 0.03, "u", { ...trim, segments: 10 });
    cyl("emitBlue", 0.366, 0.03, dv, 0.016, 0.006, "u", { segments: 10 });
  }
}

// Raking-key housing at the window head's east end: black projector body on a wall bracket, steel rim and white
// lens facing the target. The spot descriptor sits inside the body (index.js): every body face turns away from it,
// the lens shows only its emissive, and the body lies inside the shadow camera's 0.5 m near plane, so when this
// key takes the shadow slot it does not occlude its own light.
export function keyHousing(kit, pos, target) {
  const u = new THREE.Vector3(...target).sub(new THREE.Vector3(...pos)).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), u);
  const at = (t) => [pos[0] + u.x * t, pos[1] + u.y * t, pos[2] + u.z * t];
  kit.boxMM("paintedMetal", [pos[0] - 0.05, pos[1] - 0.16, N_FACE], [pos[0] + 0.05, pos[1] + 0.12, pos[2] - 0.05], { color: IMP.black, texel: 1 });
  kit.add("paintedMetal", new THREE.BoxGeometry(0.3, 0.28, 0.4), { pos: at(0.05), quat, color: IMP.black, texel: 1 });
  kit.add("metal", new THREE.CylinderGeometry(0.12, 0.12, 0.03, 20).rotateX(Math.PI / 2), { pos: at(0.265), quat, color: IMP.grey, texel: 1 });
  kit.add("emitStrip", new THREE.CylinderGeometry(0.085, 0.085, 0.01, 20).rotateX(Math.PI / 2), { pos: at(0.285), quat });
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
  kit.boxMM("impPanel", [cx - w / 2, cy - h / 2, za], [cx + w / 2, cy + h / 2, zb], cBlack);
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
    box("impPanel", x - 0.5, y + 3.4, 0, x + 0.5, y + 3.9, 0.1, cBlack);
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

// Downlight can under a soffit (soffit underside at ceilY - 0.32): black can with a white lens disc. The fill spot
// descriptor sits inside the can pointing down, so its cone never touches the soffit or the ceiling.
export function soffitCan(kit, x, ceilY, z) {
  kit.cyl("paintedMetal", x, ceilY - 0.41, z, 0.09, 0.18, "y", { color: IMP.black, texel: 1, segments: 16 });
  kit.cyl("metal", x, ceilY - 0.505, z, 0.1, 0.012, "y", { color: IMP.grey, texel: 1, segments: 16 });
  kit.cyl("emitStrip", x, ceilY - 0.512, z, 0.05, 0.006, "y", { segments: 16 });
}

// door end (x -24..-20.3): intercom + panel decal on the east wall, junction cabinet north of the counter's end
function doorEnd(kit, y) {
  const xf = X1;
  kit.boxMM("paintedMetal", [xf - 0.1, y + 1.3, 463.6], [xf, y + 1.75, 463.9], { color: IMP.dark, texel: 1 });
  kit.boxMM("emitRedImp", [xf - 0.105, y + 1.66, 463.71], [xf - 0.1, y + 1.7, 463.79]);
  kit.boxMM("emitBlue", [xf - 0.105, y + 1.36, 463.66], [xf - 0.1, y + 1.39, 463.84]);
  kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [xf - 0.001, y + 2.1, 461.2], rot: [0, -Math.PI / 2, 0], uv: "keep", uvRect: decalRect(8) });
  kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [-24.6, y + 2.2, S_FACE - 0.001], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(6) });
  kit.boxMM("impPanel", [xf - 0.35, y + 0.2, 458.6], [xf, y + 2.2, 459.5], cDark);
  kit.boxMM("impPanel", [xf - 0.37, y + 0.3, 458.7], [xf - 0.35, y + 2.1, 459.4], cBlack);
  kit.boxMM("emitAmber", [xf - 0.375, y + 1.9, 458.8], [xf - 0.37, y + 1.94, 459.3]);
  kit.boxMM("emitBlue", [xf - 0.375, y + 1.8, 458.8], [xf - 0.37, y + 1.84, 459.1]);
  kit.collider([xf - 0.4, y, 458.6], [xf, y + 2.2, 459.5], "cabinet");
}
