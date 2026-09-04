// Windowless east part (x -48..-20): refreshment counter by the door, star-chart panels on the south wall,
// briefing niche on the north wall. Plus the west end-wall screen so the long view has a focal point.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { IMP } from "../shared/palette.js";
import { decalRect } from "../../../textures.js";
import { dataPad, CUSHION } from "./lounge.js";
import { cellRect } from "./atlas.js";

const N_FACE = 458.3; // inner face of the north wall
const S_FACE = 465.7; // inner face of the south wall
// atlas screen face (module-local obsScreen material, one cell per display)
const screen = (kit, name, min, max) => kit.boxMM("obsScreen", min, max, { uv: "keep", uvRect: cellRect(name) });
// impPanel for every plate bigger than a hand's breadth (paintedMetal's chip map read as stains at room scale,
// critic round 2); ×0.47 keeps the albedo paintedMetal had at the same tint
const clean = (c, texel = 1) => ({ color: c.clone().multiplyScalar(0.47), texel });
const cBlack = clean(IMP.black);
const cDark = clean(IMP.dark);

export function eastPart(kit, FLOOR) {
  counter(kit, FLOOR);
  starChartWall(kit, FLOOR);
  briefingNiche(kit, FLOOR);
  westScreen(kit, FLOOR);
}

// refreshment counter: back-bar with three dispensers against the north wall, front counter, stools
function counter(kit, y) {
  const x0 = -33.5;
  const x1 = -24.5;
  // back-bar base + gloss top + upper cabinet band (short under-light per dispenser, not one long bar)
  kit.boxMM("impPanel", [x0, y, N_FACE], [x1, y + 0.9, N_FACE + 0.62], cDark);
  kit.boxMM("paintedMetal", [x0, y, N_FACE], [x1, y + 0.1, N_FACE + 0.66], { color: IMP.black, texel: 1 });
  kit.boxMM("blackGloss", [x0 - 0.03, y + 0.9, N_FACE], [x1 + 0.03, y + 0.95, N_FACE + 0.66], {});
  kit.boxMM("impPanel", [x0, y + 2.3, N_FACE], [x1, y + 2.9, N_FACE + 0.5], cDark);
  kit.boxMM("metal", [x0, y + 2.26, N_FACE + 0.46], [x1, y + 2.34, N_FACE + 0.52], { color: IMP.black, texel: 1 });
  for (let i = 0; i < 3; i++) {
    const cx = x0 + 1.5 + i * 3.0;
    kit.boxMM("emitStrip", [cx - 0.5, y + 2.275, N_FACE + 0.3], [cx + 0.5, y + 2.305, N_FACE + 0.44]);
    kit.boxMM("impPanel", [cx - 0.42, y + 0.95, N_FACE + 0.02], [cx + 0.42, y + 2.05, N_FACE + 0.42], cBlack);
    kit.boxMM("impPanel", [cx - 0.38, y + 1.5, N_FACE + 0.42], [cx + 0.38, y + 2.0, N_FACE + 0.5], cDark);
    screen(kit, i === 1 ? "dispenser1" : "dispenser0", [cx - 0.26, y + 1.64, N_FACE + 0.5], [cx + 0.26, y + 1.9, N_FACE + 0.51]);
    kit.boxMM("emitBlue", [cx - 0.3, y + 1.55, N_FACE + 0.5], [cx - 0.12, y + 1.575, N_FACE + 0.51]);
    kit.boxMM("emitAmber", [cx + 0.1, y + 1.55, N_FACE + 0.5], [cx + 0.18, y + 1.575, N_FACE + 0.51]);
    kit.boxMM("emitRedImp", [cx + 0.24, y + 1.55, N_FACE + 0.5], [cx + 0.29, y + 1.575, N_FACE + 0.51]);
    kit.cyl("metal", cx, y + 1.36, N_FACE + 0.5, 0.025, 0.2, "z", { color: IMP.steel, texel: 1 });
    kit.cyl("metal", cx, y + 1.3, N_FACE + 0.58, 0.02, 0.12, "y", { color: IMP.steel, texel: 1 });
    kit.boxMM("metal", [cx - 0.22, y + 0.95, N_FACE + 0.4], [cx + 0.22, y + 0.97, N_FACE + 0.64], { color: IMP.grey, texel: 1 });
    kit.add("decal", new THREE.PlaneGeometry(0.24, 0.24), { pos: [cx, y + 1.2, N_FACE + 0.421], uv: "keep", uvRect: decalRect(6 + (i % 3)) });
  }
  kit.collider([x0, y, N_FACE], [x1, y + 2.9, N_FACE + 0.66], "back-bar");

  // front counter: dark body, gloss top with overhang, blue toe-kick glow, end panels, datapad on the top
  const cz0 = 459.95;
  const cz1 = 460.6;
  kit.boxMM("impPanel", [x0, y + 0.08, cz0 + 0.04], [x1, y + 0.9, cz1 - 0.04], cDark);
  kit.boxMM("paintedMetal", [x0 + 0.05, y, cz0 + 0.1], [x1 - 0.05, y + 0.08, cz1 - 0.1], { color: IMP.black, texel: 1 });
  kit.boxMM("blackGloss", [x0 - 0.05, y + 0.9, cz0 - 0.06], [x1 + 0.05, y + 0.96, cz1 + 0.16], {});
  kit.boxMM("emitBlue", [x0, y + 0.895, cz1 + 0.12], [x1, y + 0.905, cz1 + 0.15]);
  kit.boxMM("metal", [x0, y + 0.86, cz1 - 0.04], [x1, y + 0.9, cz1 + 0.0], { color: IMP.grey, texel: 1 });
  for (const ex of [x0, x1 - 0.06]) kit.boxMM("paintedMetal", [ex, y, cz0], [ex + 0.06, y + 0.9, cz1], { color: IMP.black, texel: 1 });
  for (let i = 0; i < 4; i++) {
    const px = x0 + 1.2 + i * 2.2;
    kit.add("decal", new THREE.PlaneGeometry(0.3, 0.3), { pos: [px, y + 0.5, cz1 - 0.039], uv: "keep", uvRect: decalRect(i % 2 ? 9 : 12) });
  }
  dataPad(kit, -27.2, y + 0.96, cz0 + 0.3, -0.35, 6);
  kit.cyl("metal", -30.4, y + 1.005, cz0 + 0.32, 0.04, 0.09, "y", { color: IMP.white, texel: 1, segments: 12 });
  kit.cyl("metal", -30.28, y + 1.005, cz0 + 0.2, 0.04, 0.09, "y", { color: IMP.white, texel: 1, segments: 12 });
  kit.collider([x0 - 0.05, y, cz0 - 0.06], [x1 + 0.05, y + 1.0, cz1 + 0.16], "counter");
  // stools (0.7 m seat height for a 0.95 m counter); the third one is pulled out and turned
  for (let i = 0; i < 5; i++) {
    const pulled = i === 2;
    const sx = x0 + 1.0 + i * 1.75 + (pulled ? 0.22 : 0);
    const sz = cz1 + 0.75 + (pulled ? 0.42 : 0);
    kit.cyl("paintedMetal", sx, y + 0.02, sz, 0.22, 0.04, "y", { color: IMP.black, texel: 1 });
    kit.cyl("paintedMetal", sx, y + 0.35, sz, 0.035, 0.62, "y", { color: IMP.dark, texel: 1 });
    kit.cyl("metal", sx, y + 0.42, sz, 0.17, 0.02, "y", { color: IMP.steel, texel: 1 });
    kit.cyl("paintedMetal", sx, y + 0.68, sz, 0.19, 0.04, "y", { color: IMP.black, texel: 1 });
    kit.cyl("fabric", sx, y + 0.72, sz, 0.18, 0.04, "y", { color: IMP.dark, texel: 2 });
    kit.cyl("fabric", sx, y + 0.75, sz, 0.15, 0.02, "y", { color: IMP.dark, texel: 2 });
    // small backrest hoop so a turned stool reads as turned
    const a = pulled ? -0.7 : 0;
    const bx = sx + 0.16 * Math.sin(a);
    const bz = sz + 0.16 * Math.cos(a);
    kit.add("paintedMetal", new THREE.BoxGeometry(0.3, 0.16, 0.03), { pos: [bx, y + 0.9, bz], rot: [0, a, 0], color: IMP.dark, texel: 1 });
    kit.add("paintedMetal", new THREE.BoxGeometry(0.03, 0.2, 0.03), { pos: [bx, y + 0.78, bz], rot: [0, a, 0], color: IMP.black, texel: 1 });
    kit.collider([sx - 0.22, y, sz - 0.22], [sx + 0.22, y + 1.0, sz + 0.22], "stool");
  }
}

// star-chart panels on the south wall: one dark plate carrying three framed 1.5 x 1.0 m chart screens at eye
// height, two slim status columns; no wash light in front of them
function starChartWall(kit, y) {
  const x0 = -42.2;
  const x1 = -33.8;
  const zf = S_FACE;
  kit.boxMM("impPanel", [x0, y + 1.2, zf - 0.16], [x1, y + 3.0, zf], cBlack);
  kit.boxMM("metal", [x0 - 0.06, y + 1.16, zf - 0.2], [x1 + 0.06, y + 1.2, zf], { color: IMP.grey, texel: 1 });
  kit.boxMM("metal", [x0 - 0.06, y + 3.0, zf - 0.2], [x1 + 0.06, y + 3.04, zf], { color: IMP.grey, texel: 1 });
  for (let i = 0; i < 3; i++) {
    const cx = -38 + (i - 1) * 2.4;
    kit.boxMM("impPanel", [cx - 0.85, y + 1.5, zf - 0.22], [cx + 0.85, y + 2.7, zf - 0.16], cDark);
    // chart frame: light-grey rails top and bottom so the three read as framed charts, not monitors
    kit.boxMM("metal", [cx - 0.85, y + 2.7, zf - 0.24], [cx + 0.85, y + 2.73, zf - 0.16], { color: IMP.grey, texel: 1 });
    kit.boxMM("metal", [cx - 0.85, y + 1.47, zf - 0.24], [cx + 0.85, y + 1.5, zf - 0.16], { color: IMP.grey, texel: 1 });
    screen(kit, ["chartA", "chartB", "chartC"][i], [cx - 0.75, y + 1.6, zf - 0.23], [cx + 0.75, y + 2.6, zf - 0.22]);
    kit.boxMM("emitBlue", [cx - 0.75, y + 1.53, zf - 0.225], [cx - 0.45, y + 1.55, zf - 0.22]);
    kit.boxMM(i === 1 ? "emitAmber" : "emitRedImp", [cx + 0.65, y + 1.53, zf - 0.225], [cx + 0.75, y + 1.55, zf - 0.22]);
  }
  for (const cx of [x0 + 0.35, x1 - 0.35]) {
    kit.boxMM("impPanel", [cx - 0.17, y + 1.5, zf - 0.2], [cx + 0.17, y + 2.7, zf - 0.16], cDark);
    for (let k = 0; k < 4; k++) kit.boxMM(k % 2 ? "emitAmber" : "emitBlue", [cx - 0.08, y + 1.65 + k * 0.26, zf - 0.205], [cx + 0.08, y + 1.67 + k * 0.26, zf - 0.2]);
  }
  kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [-38, y + 1.36, zf - 0.161], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(0) });
  kit.collider([x0 - 0.06, y, zf - 0.24], [x1 + 0.06, y + 3.1, zf], "starchart");
}

// briefing niche on the north wall: framed 2.4 x 1.2 m screen, curved bench, round table
function briefingNiche(kit, y) {
  const cx = -44.5;
  kit.boxMM("impPanel", [cx - 1.6, y + 1.4, N_FACE], [cx + 1.6, y + 3.2, N_FACE + 0.18], cBlack);
  kit.boxMM("impPanel", [cx - 1.5, y + 1.5, N_FACE + 0.18], [cx + 1.5, y + 3.1, N_FACE + 0.22], cDark);
  screen(kit, "schedule", [cx - 1.2, y + 1.75, N_FACE + 0.22], [cx + 1.2, y + 2.95, N_FACE + 0.23]);
  kit.boxMM("emitBlue", [cx - 1.2, y + 1.66, N_FACE + 0.22], [cx - 0.6, y + 1.68, N_FACE + 0.225]);
  for (let k = 0; k < 4; k++) kit.boxMM(k % 2 ? "emitAmber" : "emitRedImp", [cx + 0.4 + k * 0.2, y + 1.66, N_FACE + 0.22], [cx + 0.5 + k * 0.2, y + 1.68, N_FACE + 0.225]);
  kit.boxMM("metal", [cx - 1.6, y + 1.35, N_FACE], [cx + 1.6, y + 1.4, N_FACE + 0.22], { color: IMP.grey, texel: 1 });
  kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [cx + 2.2, y + 1.0, N_FACE + 0.001], uv: "keep", uvRect: decalRect(8) });
  kit.collider([cx - 1.6, y, N_FACE], [cx + 1.6, y + 3.2, N_FACE + 0.23], "briefing-screen");
  // curved bench facing the screen (arc south of the centre): five upholstered segments between two side tables
  // at the arc's ends — the east one stands 1.4 m in front of the lounge camera, where its gloss top, carafe and
  // cups replace the back cushion that used to fill the frame's foreground (critic round 3: "swap one foreground
  // chair for a low table with datapads/cups")
  const c = [cx, N_FACE + 1.1];
  const r = 2.3;
  const segs = 7;
  const a0 = Math.PI * 0.2;
  const a1 = Math.PI * 0.8;
  const segLen = (r * (a1 - a0)) / segs + 0.02;
  for (let i = 1; i < segs - 1; i++) {
    const a = a0 + ((i + 0.5) / segs) * (a1 - a0);
    const px = c[0] + r * Math.cos(a);
    const pz = c[1] + r * Math.sin(a);
    const rot = [0, -a - Math.PI / 2, 0];
    const bx = c[0] + (r + 0.32) * Math.cos(a);
    const bz = c[1] + (r + 0.32) * Math.sin(a);
    kit.add("impPanel", new THREE.BoxGeometry(segLen, 0.42, 0.62), { pos: [px, y + 0.21, pz], rot, ...cDark });
    kit.add("fabric", new RoundedBoxGeometry(segLen - 0.03, 0.1, 0.58, 1, 0.035), { pos: [px, y + 0.47, pz], rot, color: CUSHION, texel: 2 });
    kit.add("impPanel", new THREE.BoxGeometry(segLen, 0.5, 0.1), { pos: [bx, y + 0.72, bz], rot, ...cDark });
    kit.add("fabric", new RoundedBoxGeometry(segLen - 0.03, 0.42, 0.08, 1, 0.035), { pos: [bx - 0.08 * Math.cos(a), y + 0.72, bz - 0.08 * Math.sin(a)], rot, color: CUSHION, texel: 2 });
    kit.collider([Math.min(px, bx) - 0.45, y, Math.min(pz, bz) - 0.45], [Math.max(px, bx) + 0.45, y + 1.0, Math.max(pz, bz) + 0.45], "niche-bench");
  }
  for (const i of [0, segs - 1]) sideTable(kit, y, c, 2.45, a0 + ((i + 0.5) / segs) * (a1 - a0), i === 0);
  // round table with a thin rim glow and a datapad
  kit.cyl("paintedMetal", c[0], y + 0.2, c[1] + 0.3, 0.16, 0.4, "y", { color: IMP.black, texel: 1 });
  kit.cyl("paintedMetal", c[0], y + 0.02, c[1] + 0.3, 0.4, 0.04, "y", { color: IMP.black, texel: 1 });
  kit.cyl("blackGloss", c[0], y + 0.44, c[1] + 0.3, 0.6, 0.05, "y", {});
  kit.cyl("emitBlue", c[0], y + 0.43, c[1] + 0.3, 0.605, 0.008, "y", {});
  dataPad(kit, c[0] + 0.2, y + 0.465, c[1] + 0.45, 0.5, 9);
  kit.collider([c[0] - 0.6, y, c[1] - 0.3], [c[0] + 0.6, y + 0.5, c[1] + 0.9], "niche-table");
}

// Side table at one end of the niche's curved bench: black pedestal on a base plate, steel edge under a gloss top
// (0.7 m along the arc × 0.6 m, top at 0.65 m — sofa-arm height), carafe at the free end, a datapad and two cups.
// c = arc centre, r = radius to the table's centre, a = arc angle; the local frame is the bench segments' (x along
// the arc, z toward the centre), mirrored for the west table so the carafe sits at the free end on both.
function sideTable(kit, y, c, r, a, east) {
  const px = c[0] + r * Math.cos(a);
  const pz = c[1] + r * Math.sin(a);
  const rot = [0, -a - Math.PI / 2, 0];
  const mir = east ? 1 : -1;
  const W = (lx, ly, lz) => [px - mir * lx * Math.sin(a) - lz * Math.cos(a), y + ly, pz + mir * lx * Math.cos(a) - lz * Math.sin(a)];
  kit.add("paintedMetal", new THREE.BoxGeometry(0.5, 0.03, 0.4), { pos: [px, y + 0.015, pz], rot, color: IMP.black, texel: 1 });
  kit.add("paintedMetal", new THREE.BoxGeometry(0.22, 0.55, 0.22), { pos: [px, y + 0.305, pz], rot, color: IMP.black, texel: 1 });
  kit.add("metal", new THREE.BoxGeometry(0.72, 0.012, 0.62), { pos: [px, y + 0.586, pz], rot, color: IMP.grey, texel: 1 });
  kit.add("blackGloss", new THREE.BoxGeometry(0.7, 0.058, 0.6), { pos: [px, y + 0.621, pz], rot });
  let p = W(-0.15, 0.76, -0.12);
  kit.cyl("blackGloss", p[0], p[1], p[2], 0.06, 0.22, "y", { segments: 14 });
  p = W(-0.15, 0.895, -0.12);
  kit.cyl("metal", p[0], p[1], p[2], 0.03, 0.05, "y", { color: IMP.steel, texel: 1, segments: 10 });
  p = W(0.12, 0.65, -0.1);
  dataPad(kit, p[0], p[1], p[2], -a - Math.PI / 2 + (east ? -0.4 : 0.4), 6);
  for (const [lx, lz] of [
    [0.25, -0.18],
    [-0.04, 0.13],
  ]) {
    p = W(lx, 0.695, lz);
    kit.cyl("metal", p[0], p[1], p[2], 0.04, 0.09, "y", { color: IMP.white, texel: 1, segments: 12 });
  }
  kit.collider([px - 0.45, y, pz - 0.45], [px + 0.45, y + 0.7, pz + 0.45], "side-table");
}

// west end wall (x -83.7): framed hull-camera feed so the long view down the gallery has a terminus
function westScreen(kit, y) {
  const xf = -83.7;
  kit.boxMM("impPanel", [xf, y + 1.2, 460.4], [xf + 0.2, y + 3.6, 463.6], cBlack);
  kit.boxMM("impPanel", [xf + 0.2, y + 1.3, 460.5], [xf + 0.24, y + 3.5, 463.5], cDark);
  screen(kit, "hullcam", [xf + 0.24, y + 1.6, 460.8], [xf + 0.25, y + 3.2, 463.2]);
  kit.boxMM("emitBlue", [xf + 0.24, y + 1.5, 460.8], [xf + 0.245, y + 1.52, 461.6]);
  for (let k = 0; k < 4; k++) kit.boxMM(k % 2 ? "emitAmber" : "emitRedImp", [xf + 0.24, y + 3.28, 462.0 + k * 0.3], [xf + 0.245, y + 3.3, 462.2 + k * 0.3]);
  kit.boxMM("metal", [xf, y + 1.15, 460.3], [xf + 0.26, y + 1.2, 463.7], { color: IMP.grey, texel: 1 });
  kit.collider([xf, y, 460.3], [xf + 0.26, y + 3.7, 463.7], "west-screen");
}
