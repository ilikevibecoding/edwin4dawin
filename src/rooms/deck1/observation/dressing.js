// Architectural dressing: ceiling beams every 4 m, coves along both long walls, cable tray, junction
// boxes, vents, intercoms and decals on the south wall and door end.
import * as THREE from "three";
import { IMP } from "../shared/palette.js";
import { decalRect } from "../../../textures.js";

const X0 = -83.7;
const X1 = -20.3;
const N_FACE = 458.3;
const S_FACE = 465.7;

export function dressing(kit, FLOOR, ceilY) {
  ceilingWork(kit, ceilY);
  southWall(kit, FLOOR);
  doorEnd(kit, FLOOR);
}

function ceilingWork(kit, ceilY) {
  // coves: dropped soffits along both long walls, black lip with a thin white channel on its room face
  for (const [z0, z1, dir] of [[N_FACE, N_FACE + 0.75, 1], [S_FACE - 0.75, S_FACE, -1]]) {
    kit.boxMM("paintedMetal", [X0, ceilY - 0.32, z0], [X1, ceilY + 0.01, z1], { color: IMP.dark, texel: 0.5 });
    const lipZ = dir > 0 ? z1 : z0;
    const lip = [lipZ - 0.1 * (dir > 0 ? 1 : 0), lipZ + 0.1 * (dir > 0 ? 0 : 1)];
    kit.boxMM("paintedMetal", [X0, ceilY - 0.4, lip[0]], [X1, ceilY - 0.3, lip[1]], { color: IMP.black, texel: 0.5 });
    // the north strip faces the window views head-on and blooms into a band, so it is kept much thinner
    const strip = dir > 0 ? [lipZ, lipZ + 0.03] : [lipZ - 0.04, lipZ];
    const sh = dir > 0 ? 0.012 : 0.03;
    kit.boxMM("emitWhite", [X0 + 0.4, ceilY - 0.37 - sh / 2, strip[0]], [X1 - 0.4, ceilY - 0.37 + sh / 2, strip[1]]);
  }
  // transverse beams every 4 m (avoid the light pool positions at -76/-64/-52)
  for (let x = -82; x <= -22; x += 4) {
    kit.boxMM("paintedMetal", [x - 0.16, ceilY - 0.3, N_FACE + 0.7], [x + 0.16, ceilY + 0.01, S_FACE - 0.7], { color: IMP.black, texel: 1 });
    kit.boxMM("paintedMetal", [x - 0.2, ceilY - 0.3, N_FACE + 0.7], [x + 0.2, ceilY - 0.24, S_FACE - 0.7], { color: IMP.dark, texel: 1 });
    kit.boxMM("metal", [x - 0.02, ceilY - 0.31, N_FACE + 1.0], [x + 0.02, ceilY - 0.3, S_FACE - 1.0], { color: IMP.grey, texel: 1 });
  }
}

function southWall(kit, y) {
  const zf = S_FACE;
  // cable tray high on the wall, west of the star-map wall, with hangers
  kit.boxMM("metal", [X0 + 0.3, y + 4.55, zf - 0.34], [-46.4, y + 4.6, zf - 0.04], { color: IMP.dark, texel: 1 });
  kit.boxMM("metal", [X0 + 0.3, y + 4.55, zf - 0.34], [-46.4, y + 4.72, zf - 0.3], { color: IMP.dark, texel: 1 });
  kit.boxMM("metal", [X0 + 0.3, y + 4.55, zf - 0.08], [-46.4, y + 4.72, zf - 0.04], { color: IMP.dark, texel: 1 });
  for (let x = -82; x < -46.4; x += 4) {
    kit.boxMM("paintedMetal", [x - 0.04, y + 4.5, zf - 0.36], [x + 0.04, y + 4.8, zf], { color: IMP.black, texel: 1 });
  }
  kit.cyl("paintedMetal", -65, y + 4.63, zf - 0.19, 0.03, 36, "x", { color: IMP.black, texel: 1 });
  kit.cyl("paintedMetal", -65, y + 4.63, zf - 0.27, 0.025, 36, "x", { color: IMP.black, texel: 1 });
  // junction boxes / vents / intercom panels between the seating groups' backs
  for (const [x, kind] of [[-79.5, "jbox"], [-70, "vent"], [-67, "intercom"], [-61, "jbox"], [-58, "vent"], [-49, "intercom"]]) greeble(kit, x, y, zf, kind);
  // decals: room designation, arrows, panel numbers
  kit.add("decal", new THREE.PlaneGeometry(0.6, 0.6), { pos: [-73, y + 1.75, zf - 0.001], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(0) });
  kit.add("decal", new THREE.PlaneGeometry(0.6, 0.6), { pos: [-55, y + 1.75, zf - 0.001], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(5) });
  kit.add("decal", new THREE.PlaneGeometry(0.45, 0.45), { pos: [-28.5, y + 1.9, zf - 0.001], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(8) });
}

function greeble(kit, x, y, zf, kind) {
  if (kind === "jbox") {
    kit.boxMM("paintedMetal", [x - 0.22, y + 1.5, zf - 0.14], [x + 0.22, y + 2.05, zf], { color: IMP.black, texel: 1 });
    kit.boxMM("paintedMetal", [x - 0.18, y + 1.54, zf - 0.16], [x + 0.18, y + 2.01, zf - 0.14], { color: IMP.dark, texel: 1 });
    kit.boxMM("emitAmber", [x - 0.12, y + 1.92, zf - 0.165], [x - 0.06, y + 1.96, zf - 0.16]);
    kit.boxMM("emitBlue", [x + 0.06, y + 1.92, zf - 0.165], [x + 0.12, y + 1.96, zf - 0.16]);
    kit.cyl("metal", x, y + 2.3, zf - 0.07, 0.03, 0.5, "y", { color: IMP.dark, texel: 1 });
    kit.boxMM("metal", [x - 0.05, y + 2.05, zf - 0.12], [x + 0.05, y + 2.2, zf - 0.02], { color: IMP.grey, texel: 1 });
    kit.add("decal", new THREE.PlaneGeometry(0.2, 0.2), { pos: [x, y + 1.7, zf - 0.161], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(12) });
  } else if (kind === "vent") {
    kit.boxMM("paintedMetal", [x - 0.5, y + 3.4, zf - 0.1], [x + 0.5, y + 3.9, zf], { color: IMP.black, texel: 1 });
    for (let i = 0; i < 6; i++) kit.boxMM("paintedMetal", [x - 0.46, y + 3.45 + i * 0.075, zf - 0.12], [x + 0.46, y + 3.45 + i * 0.075 + 0.035, zf - 0.1], { color: IMP.grey, texel: 1 });
  } else {
    kit.boxMM("paintedMetal", [x - 0.14, y + 1.35, zf - 0.08], [x + 0.14, y + 1.75, zf], { color: IMP.dark, texel: 1 });
    kit.boxMM("paintedMetal", [x - 0.11, y + 1.38, zf - 0.09], [x + 0.11, y + 1.6, zf - 0.08], { color: IMP.black, texel: 1 });
    kit.boxMM("emitRedImp", [x - 0.03, y + 1.66, zf - 0.085], [x + 0.03, y + 1.7, zf - 0.08]);
    kit.boxMM("emitBlue", [x - 0.08, y + 1.4, zf - 0.092], [x + 0.08, y + 1.43, zf - 0.09]);
    kit.add("decal", new THREE.PlaneGeometry(0.16, 0.16), { pos: [x, y + 1.5, zf - 0.091], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(14) });
  }
}

// door end (x -24..-20.3): door-side intercom + panel decal on the east wall, wall-mounted strip box
function doorEnd(kit, y) {
  const xf = X1;
  kit.boxMM("paintedMetal", [xf - 0.1, y + 1.3, 463.6], [xf, y + 1.75, 463.9], { color: IMP.dark, texel: 1 });
  kit.boxMM("emitRedImp", [xf - 0.105, y + 1.66, 463.71], [xf - 0.1, y + 1.7, 463.79]);
  kit.boxMM("emitBlue", [xf - 0.105, y + 1.36, 463.66], [xf - 0.1, y + 1.39, 463.84]);
  kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [xf - 0.001, y + 2.1, 461.2], rot: [0, -Math.PI / 2, 0], uv: "keep", uvRect: decalRect(15) });
  kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [-24.6, y + 2.2, S_FACE - 0.001], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(11) });
  // junction cabinet on the east wall (north of the counter's end)
  kit.boxMM("paintedMetal", [xf - 0.35, y + 0.2, 458.6], [xf, y + 2.2, 459.5], { color: IMP.dark, texel: 1 });
  kit.boxMM("paintedMetal", [xf - 0.37, y + 0.3, 458.7], [xf - 0.35, y + 2.1, 459.4], { color: IMP.black, texel: 1 });
  kit.boxMM("emitAmber", [xf - 0.375, y + 1.9, 458.8], [xf - 0.37, y + 1.94, 459.3]);
  kit.boxMM("emitBlue", [xf - 0.375, y + 1.8, 458.8], [xf - 0.37, y + 1.84, 459.1]);
  kit.collider([xf - 0.4, y, 458.6], [xf, y + 2.2, 459.5], "cabinet");
}
