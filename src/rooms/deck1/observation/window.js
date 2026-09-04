// Window band in APERTURE OBSERVATION: reveal lining, mullions with chamfered caps, inner frame, glass
// 0.8 m into the reveal, sill console (cove with a segmented white hairline, one heading readout per bay),
// status lamps, leaning rail and three binocular viewers on pedestals.
import * as THREE from "three";
import { IMP } from "../shared/palette.js";
import { decalRect } from "../../../textures.js";
import { cellRect } from "./atlas.js";

const ROT_Y = (a) => [0, a, 0];
// impPanel stands in for paintedMetal on every surface bigger than a hand's breadth: its chip map read as stains
// at room scale (critic round 2). ×0.47 keeps the albedo paintedMetal had at the same tint.
const clean = (c, texel = 1) => ({ color: c.clone().multiplyScalar(0.47), texel });
const cBlack = clean(IMP.black);
const cDark = clean(IMP.dark);
// the sill apron is the wall the critic could not see behind the bench: a mid-grey panel band (pendant
// illuminance ≈ 0.9 → reads as dark grey, not black) instead of paintedMetal at IMP.mid
const APRON = { color: IMP.mid.clone().lerp(IMP.grey, 0.25), texel: 1 };

export const VIEWERS = [-72, -64, -56]; // viewer stations at the centres of bays 1, 3 and 5

export function windowBand(kit, A, FLOOR) {
  const zRoom = A.zIn + 0.3; // inner face of the north wall (WALL_T = 0.3)
  const t = 0.1;
  const n = 7;
  const pw = (A.x1 - A.x0) / n;
  const yc = (A.y0 + A.y1) / 2;

  // reveal lining (sill, head, jambs) through the wall to the aperture's outer plane
  kit.boxMM("metalRough", [A.x0, A.y0, A.zOut], [A.x1, A.y0 + t, zRoom], { color: IMP.mid, texel: 1 });
  kit.boxMM("metalRough", [A.x0, A.y1 - t, A.zOut], [A.x1, A.y1, zRoom], { color: IMP.dark, texel: 1 });
  kit.boxMM("metalRough", [A.x0, A.y0, A.zOut], [A.x0 + t, A.y1, zRoom], { color: IMP.dark, texel: 1 });
  kit.boxMM("metalRough", [A.x1 - t, A.y0, A.zOut], [A.x1, A.y1, zRoom], { color: IMP.dark, texel: 1 });
  // outer end plates so the far end of the reveal reads as hull, not an open edge
  kit.boxMM("metalRough", [A.x0 - 0.02, A.y0 - 0.02, A.zOut - 0.02], [A.x1 + 0.02, A.y0 + 0.06, A.zOut + 0.02], { color: IMP.black, texel: 1 });
  kit.boxMM("metalRough", [A.x0 - 0.02, A.y1 - 0.06, A.zOut - 0.02], [A.x1 + 0.02, A.y1 + 0.02, A.zOut + 0.02], { color: IMP.black, texel: 1 });

  // heavy outer frame around the band on the room face + thin second inner frame stepping into the reveal
  const fo = 0.32;
  const fd = 0.08;
  kit.boxMM("impPanel", [A.x0 - fo, A.y1, zRoom - 0.01], [A.x1 + fo, A.y1 + fo, zRoom + fd], cBlack);
  kit.boxMM("impPanel", [A.x0 - fo, A.y0 - 0.02, zRoom - 0.01], [A.x0, A.y1 + fo, zRoom + fd], cBlack);
  kit.boxMM("impPanel", [A.x1, A.y0 - 0.02, zRoom - 0.01], [A.x1 + fo, A.y1 + fo, zRoom + fd], cBlack);
  const fi = 0.045;
  const zi0 = zRoom - 0.3;
  const zi1 = zRoom - 0.24;
  kit.boxMM("metal", [A.x0 + t, A.y1 - t - fi, zi0], [A.x1 - t, A.y1 - t, zi1], { color: IMP.grey, texel: 1 });
  kit.boxMM("metal", [A.x0 + t, A.y0 + t, zi0], [A.x1 - t, A.y0 + t + fi, zi1], { color: IMP.grey, texel: 1 });
  kit.boxMM("metal", [A.x0 + t, A.y0 + t, zi0], [A.x0 + t + fi, A.y1 - t, zi1], { color: IMP.grey, texel: 1 });
  kit.boxMM("metal", [A.x1 - t - fi, A.y0 + t, zi0], [A.x1 - t, A.y1 - t, zi1], { color: IMP.grey, texel: 1 });

  // mullions through the reveal with chamfered caps on the room side, a red status lamp at each foot
  for (let i = 0; i <= n; i++) {
    const x = A.x0 + i * pw;
    kit.boxMM("impPanel", [x - 0.12, A.y0, A.zOut + 0.05], [x + 0.12, A.y1, zRoom], cDark);
    // cap: proud centre plate + 45° chamfer strips both sides
    kit.boxMM("impPanel", [x - 0.14, A.y0 - 0.02, zRoom - 0.01], [x + 0.14, A.y1 + 0.02, zRoom + 0.09], cBlack);
    const h = A.y1 - A.y0 + 0.04;
    for (const s of [-1, 1]) {
      kit.add("impPanel", new THREE.BoxGeometry(0.07, h, 0.035), { pos: [x + s * 0.165, yc, zRoom + 0.055], rot: ROT_Y(s * Math.PI / 4), ...cDark });
    }
    kit.boxMM("metal", [x - 0.03, A.y0 + 0.25, zRoom + 0.09], [x + 0.03, A.y1 - 0.25, zRoom + 0.1], { color: IMP.grey, texel: 1 });
    kit.boxMM("paintedMetal", [x - 0.07, A.y0 + 0.03, zRoom + 0.09], [x + 0.07, A.y0 + 0.13, zRoom + 0.105], { color: IMP.black, texel: 1 });
    kit.boxMM("emitRedImp", [x - 0.045, A.y0 + 0.065, zRoom + 0.1], [x + 0.045, A.y0 + 0.095, zRoom + 0.115]);
  }
  // glass 0.8 m into the reveal
  for (let i = 0; i < n; i++) {
    const x = A.x0 + (i + 0.5) * pw;
    kit.add("glass", new THREE.PlaneGeometry(pw - 0.26, A.y1 - A.y0 - 2 * t), { pos: [x, yc, A.zOut + 0.8], uv: "keep" });
  }

  // sill console band, section from the wall outward: mid-grey apron panel (face zRoom+0.28), a 6 cm cove, black
  // fascia (zRoom+0.34..0.39) hanging 20 cm under the overhanging cap plate, kick at the foot. The cove carries one
  // 12 mm white hairline per bay (0.6 m gaps at the mullions) in the room's blue-white strip language; the amber
  // stays in the bay status dots. The under-sill wash points (index.js) sit inside the apron slab, so nothing
  // in view is closer than the floor to them.
  const sz1 = zRoom + 0.42;
  kit.boxMM("metal", [A.x0 - fo, A.y0 - 0.02, zRoom - 0.02], [A.x1 + fo, A.y0 + 0.04, sz1], { color: IMP.mid, texel: 1 });
  kit.boxMM("impPanel", [A.x0 - fo, FLOOR + 0.12, zRoom], [A.x1 + fo, A.y0 - 0.02, zRoom + 0.28], APRON);
  kit.boxMM("paintedMetal", [A.x0 - fo, FLOOR, zRoom + 0.14], [A.x1 + fo, FLOOR + 0.12, zRoom + 0.3], { color: IMP.black, texel: 1 });
  kit.boxMM("impPanel", [A.x0 - fo, A.y0 - 0.22, zRoom + 0.34], [A.x1 + fo, A.y0 - 0.02, zRoom + 0.39], cBlack);
  // thin light-grey rule along the fascia's lower edge so the cove has a finished lip
  kit.boxMM("metal", [A.x0 - fo, A.y0 - 0.23, zRoom + 0.34], [A.x1 + fo, A.y0 - 0.22, zRoom + 0.395], { color: IMP.grey, texel: 1 });
  const sillLights = [];
  for (let i = 0; i < n; i++) {
    const xa = A.x0 + i * pw + 0.3;
    const xb = A.x0 + (i + 1) * pw - 0.3;
    kit.boxMM("emitStrip", [xa, A.y0 - 0.205, zRoom + 0.39], [xb, A.y0 - 0.193, zRoom + 0.4]);
    const x = (xa + xb) / 2;
    // heading/planet readout on the cap: bezel, face plate, 0.3 m atlas readout (two variants), status dot
    kit.boxMM("paintedMetal", [x - 0.2, A.y0 + 0.04, zRoom + 0.12], [x + 0.2, A.y0 + 0.17, zRoom + 0.3], { color: IMP.black, texel: 1 });
    kit.boxMM("paintedMetal", [x - 0.17, A.y0 + 0.07, zRoom + 0.3], [x + 0.17, A.y0 + 0.15, zRoom + 0.315], { color: IMP.dark, texel: 1 });
    kit.boxMM("obsScreen", [x - 0.15, A.y0 + 0.082, zRoom + 0.315], [x + 0.15, A.y0 + 0.138, zRoom + 0.32], { uv: "keep", uvRect: cellRect(i % 2 ? "sill1" : "sill0") });
    kit.boxMM(i % 2 ? "emitBlue" : "emitAmber", [x - 0.15, A.y0 + 0.05, zRoom + 0.3], [x - 0.11, A.y0 + 0.06, zRoom + 0.305]);
    if (i % 2 === 1) sillLights.push([x, A.y0 - 0.3, zRoom + 0.14]);
  }
  kit.collider([A.x0 - fo, FLOOR, A.zOut], [A.x1 + fo, A.y1 + fo, sz1], "sill");

  // leaning rail: polished top rail (light tint) on angled brackets off the sill apron, kick rail at the foot
  const zr = zRoom + 0.95;
  const len = A.x1 - A.x0 - 0.4;
  const cx = (A.x0 + A.x1) / 2;
  kit.cyl("metal", cx, FLOOR + 1.02, zr, 0.032, len, "x", { color: IMP.white, texel: 2, segments: 14 });
  kit.boxMM("paintedMetal", [cx - len / 2, FLOOR + 0.02, zr - 0.03], [cx + len / 2, FLOOR + 0.14, zr + 0.03], { color: IMP.black, texel: 2 });
  for (let x = A.x0 + 0.5; x <= A.x1 - 0.4; x += 2.0) {
    kit.boxMM("paintedMetal", [x - 0.035, FLOOR, zr - 0.035], [x + 0.035, FLOOR + 0.99, zr + 0.035], { color: IMP.dark, texel: 2 });
    kit.add("paintedMetal", new THREE.BoxGeometry(0.05, 0.05, 0.62), { pos: [x, FLOOR + 0.72, zr - 0.27], rot: [-0.8, 0, 0], color: IMP.dark, texel: 2 });
    kit.boxMM("metal", [x - 0.05, FLOOR + 0.98, zr - 0.04], [x + 0.05, FLOOR + 1.06, zr + 0.04], { color: IMP.steel, texel: 2 });
    kit.boxMM("paintedMetal", [x - 0.08, FLOOR, zr - 0.08], [x + 0.08, FLOOR + 0.03, zr + 0.08], { color: IMP.black, texel: 2 });
  }
  kit.collider([cx - len / 2, FLOOR, zr - 0.08], [cx + len / 2, FLOOR + 1.1, zr + 0.08], "rail");

  // three binocular viewers on pedestals behind the rail, tubes angled up at the glass
  for (const x of VIEWERS) viewer(kit, x, FLOOR, zr + 0.75);

  return { sillLights };
}

/**
 * Binocular viewer (critic round 2: the old single tube at frame centre read as an unidentifiable sill object).
 * Pedestal column → head housing with a small readout, label and two lamps on the room face → yoke → trunnion →
 * twin tubes pitched 0.36 rad up at the glass: objective rings toward the window, eyepieces with cups toward the
 * room, a prism housing between them and a grip sticking out of each side.
 */
function viewer(kit, x, y, z) {
  // pedestal (base plate below knee height keeps paintedMetal; the column is plain metal)
  kit.cyl("paintedMetal", x, y + 0.03, z, 0.32, 0.06, "y", { color: IMP.black, texel: 1, segments: 24 });
  kit.cyl("metal", x, y + 0.09, z, 0.14, 0.06, "y", { color: IMP.dark, texel: 1, segments: 20 });
  kit.cyl("metal", x, y + 0.62, z, 0.075, 1.0, "y", { color: IMP.dark, texel: 1, segments: 16 });
  kit.cyl("metal", x, y + 1.13, z, 0.1, 0.03, "y", { color: IMP.steel, texel: 1, segments: 16 });
  // head housing 0.43 × 0.24 × 0.26: readout + label + standby lamps on the room face (+z)
  kit.boxMM("paintedMetal", [x - 0.215, y + 1.14, z - 0.13], [x + 0.215, y + 1.38, z + 0.13], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [x - 0.19, y + 1.19, z + 0.13], [x + 0.19, y + 1.34, z + 0.145], { color: IMP.dark, texel: 1 });
  kit.boxMM("obsScreen", [x - 0.05, y + 1.225, z + 0.145], [x + 0.13, y + 1.315, z + 0.15], { uv: "keep", uvRect: cellRect("viewer") });
  kit.add("decal", new THREE.PlaneGeometry(0.09, 0.09), { pos: [x - 0.12, y + 1.27, z + 0.146], uv: "keep", uvRect: decalRect(9) });
  kit.boxMM("emitAmber", [x - 0.05, y + 1.2, z + 0.145], [x - 0.0, y + 1.215, z + 0.15]);
  kit.boxMM("emitBlue", [x + 0.03, y + 1.2, z + 0.145], [x + 0.08, y + 1.215, z + 0.15]);
  kit.boxMM("metal", [x - 0.215, y + 1.38, z - 0.13], [x + 0.215, y + 1.4, z + 0.13], { color: IMP.grey, texel: 1 });
  // yoke arms up to the trunnion, steel pivot caps outside them
  for (const sx of [-0.19, 0.19]) {
    kit.boxMM("paintedMetal", [x + sx - 0.025, y + 1.4, z - 0.07], [x + sx + 0.025, y + 1.62, z + 0.01], { color: IMP.dark, texel: 1 });
    kit.cyl("metal", x + sx + Math.sign(sx) * 0.03, y + 1.56, z - 0.03, 0.045, 0.02, "x", { color: IMP.steel, texel: 1, segments: 16 });
  }
  // optics in the pitched frame: local -z = objective end (window), +z = eyepiece end (room)
  const th = 0.36;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const hy = y + 1.56;
  const hz = z - 0.03;
  const L = (lx, ly, lz) => [x + lx, hy + ly * c - lz * s, hz + ly * s + lz * c];
  const rot = [th, 0, 0];
  const tube = (r0, r1, len, seg = 16) => new THREE.CylinderGeometry(r0, r1, len, seg).rotateX(Math.PI / 2);
  const grip = (len) => new THREE.CylinderGeometry(0.013, 0.013, len, 10).rotateZ(Math.PI / 2);
  kit.add("metal", new THREE.CylinderGeometry(0.02, 0.02, 0.44, 12).rotateZ(Math.PI / 2), { pos: L(0, 0, -0.02), rot, color: IMP.steel, texel: 1 }); // trunnion axle
  for (const sx of [-0.085, 0.085]) {
    kit.add("blackGloss", tube(0.055, 0.055, 0.62), { pos: L(sx, 0, -0.06), rot });
    kit.add("metal", tube(0.068, 0.062, 0.05), { pos: L(sx, 0, -0.39), rot, color: IMP.gunmetal, texel: 1 }); // objective ring
    kit.add("blackGloss", tube(0.06, 0.06, 0.012), { pos: L(sx, 0, -0.418), rot });
    kit.add("metal", tube(0.06, 0.06, 0.03), { pos: L(sx, 0, -0.2), rot, color: IMP.steel, texel: 1 }); // focus collar
  }
  kit.add("paintedMetal", new THREE.BoxGeometry(0.2, 0.06, 0.16), { pos: L(0, 0, -0.14), rot, color: IMP.dark, texel: 1 }); // bridge
  kit.add("paintedMetal", new THREE.BoxGeometry(0.29, 0.14, 0.16), { pos: L(0, 0, 0.2), rot, color: IMP.dark, texel: 1 }); // prism housing
  kit.add("metal", new THREE.BoxGeometry(0.29, 0.012, 0.16), { pos: L(0, 0.076, 0.2), rot, color: IMP.grey, texel: 1 });
  kit.add("emitAmber", new THREE.BoxGeometry(0.05, 0.006, 0.03), { pos: L(0.07, 0.085, 0.2), rot });
  for (const sx of [-0.06, 0.06]) {
    kit.add("metal", tube(0.028, 0.028, 0.06), { pos: L(sx, 0.005, 0.31), rot, color: IMP.steel, texel: 1 }); // eyepiece barrel
    kit.add("paintedMetal", tube(0.036, 0.03, 0.025), { pos: L(sx, 0.005, 0.352), rot, color: IMP.black, texel: 1 }); // eye cup
  }
  for (const sx of [-1, 1]) {
    kit.add("metal", grip(0.15), { pos: L(sx * 0.22, -0.02, 0.2), rot, color: IMP.steel, texel: 1 }); // side grip
    kit.add("paintedMetal", new THREE.CylinderGeometry(0.022, 0.022, 0.045, 12).rotateZ(Math.PI / 2), { pos: L(sx * 0.3, -0.02, 0.2), rot, color: IMP.black, texel: 1 });
  }
  kit.collider([x - 0.32, y, z - 0.45], [x + 0.32, y + 1.8, z + 0.36], "viewer");
}
