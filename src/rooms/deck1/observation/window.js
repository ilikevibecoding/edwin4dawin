// Window band in APERTURE OBSERVATION: reveal lining, mullions with chamfered caps, inner frame, glass
// 0.8 m into the reveal, sill instruments, status lamps, leaning rail and binocular viewers.
import * as THREE from "three";
import { IMP } from "../shared/palette.js";
import { decalRect } from "../../../textures.js";

const ROT_Y = (a) => [0, a, 0];

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
  kit.boxMM("paintedMetal", [A.x0 - fo, A.y1, zRoom - 0.01], [A.x1 + fo, A.y1 + fo, zRoom + fd], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 - fo, A.y0 - 0.02, zRoom - 0.01], [A.x0, A.y1 + fo, zRoom + fd], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [A.x1, A.y0 - 0.02, zRoom - 0.01], [A.x1 + fo, A.y1 + fo, zRoom + fd], { color: IMP.black, texel: 1 });
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
    kit.boxMM("paintedMetal", [x - 0.12, A.y0, A.zOut + 0.05], [x + 0.12, A.y1, zRoom], { color: IMP.dark, texel: 1 });
    // cap: proud centre plate + 45° chamfer strips both sides
    kit.boxMM("paintedMetal", [x - 0.14, A.y0 - 0.02, zRoom - 0.01], [x + 0.14, A.y1 + 0.02, zRoom + 0.09], { color: IMP.black, texel: 1 });
    const h = A.y1 - A.y0 + 0.04;
    for (const s of [-1, 1]) {
      kit.add("paintedMetal", new THREE.BoxGeometry(0.07, h, 0.035), { pos: [x + s * 0.165, yc, zRoom + 0.055], rot: ROT_Y(s * Math.PI / 4), color: IMP.dark, texel: 1 });
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

  // sill console band: overhanging cap plate, recessed apron with an amber under-lip strip per bay,
  // one 0.3 m heading/planet readout per bay
  const sz1 = zRoom + 0.42;
  kit.boxMM("metal", [A.x0 - fo, A.y0 - 0.02, zRoom - 0.02], [A.x1 + fo, A.y0 + 0.04, sz1], { color: IMP.mid, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 - fo, FLOOR + 0.12, sz1 - 0.14], [A.x1 + fo, A.y0 - 0.02, sz1 - 0.08], { color: IMP.dark, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 - fo, FLOOR, sz1 - 0.16], [A.x1 + fo, FLOOR + 0.12, sz1 - 0.1], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 - fo, FLOOR + 0.12, zRoom], [A.x1 + fo, A.y0 - 0.02, sz1 - 0.14], { color: IMP.mid, texel: 1 });
  // black fascia under the cap overhang, amber strip proud of the fascia (per bay, gaps at the mullions)
  kit.boxMM("paintedMetal", [A.x0 - fo, A.y0 - 0.13, sz1 - 0.08], [A.x1 + fo, A.y0 - 0.02, sz1 - 0.03], { color: IMP.black, texel: 1 });
  for (let i = 0; i < n; i++) {
    const xa = A.x0 + i * pw + 0.15;
    const xb = A.x0 + (i + 1) * pw - 0.15;
    kit.boxMM("emitAmber", [xa, A.y0 - 0.095, sz1 - 0.03], [xb, A.y0 - 0.065, sz1 - 0.015]);
    const x = (xa + xb) / 2;
    kit.boxMM("paintedMetal", [x - 0.2, A.y0 + 0.04, zRoom + 0.12], [x + 0.2, A.y0 + 0.17, zRoom + 0.3], { color: IMP.black, texel: 1 });
    kit.boxMM("paintedMetal", [x - 0.17, A.y0 + 0.07, zRoom + 0.3], [x + 0.17, A.y0 + 0.15, zRoom + 0.315], { color: IMP.dark, texel: 1 });
    kit.boxMM("screenImp1", [x - 0.15, A.y0 + 0.085, zRoom + 0.315], [x + 0.15, A.y0 + 0.14, zRoom + 0.32], { uv: "keep" });
    kit.boxMM(i % 2 ? "emitBlue" : "emitAmber", [x - 0.15, A.y0 + 0.05, zRoom + 0.3], [x - 0.11, A.y0 + 0.06, zRoom + 0.305]);
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

  // three ranging optics (tube on a yoke) on pedestals, angled up at the glass
  for (const x of [-73, -64, -55]) viewer(kit, x, FLOOR, zr + 0.75);
}

function viewer(kit, x, y, z) {
  kit.cyl("paintedMetal", x, y + 0.03, z, 0.32, 0.06, "y", { color: IMP.black, texel: 1 });
  kit.cyl("paintedMetal", x, y + 0.62, z, 0.09, 1.12, "y", { color: IMP.dark, texel: 1 });
  kit.cyl("metal", x, y + 1.2, z, 0.12, 0.06, "y", { color: IMP.steel, texel: 1 });
  kit.boxMM("paintedMetal", [x - 0.05, y + 1.22, z - 0.05], [x + 0.05, y + 1.4, z + 0.05], { color: IMP.black, texel: 1 });
  // yoke on the pedestal head, tube pitched up at the glass (local -z = objective end)
  kit.boxMM("paintedMetal", [x - 0.16, y + 1.4, z - 0.04], [x + 0.16, y + 1.44, z + 0.04], { color: IMP.black, texel: 1 });
  for (const sx of [-0.13, 0.13]) kit.boxMM("paintedMetal", [x + sx - 0.02, y + 1.42, z - 0.03], [x + sx + 0.02, y + 1.62, z + 0.03], { color: IMP.dark, texel: 1 });
  const th = 0.36;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const hy = y + 1.56;
  const hz = z - 0.02;
  const L = (lx, ly, lz) => [x + lx, hy + ly * c - lz * s, hz + ly * s + lz * c];
  const rot = [th, 0, 0];
  kit.add("blackGloss", new THREE.CylinderGeometry(0.065, 0.065, 0.74, 16).rotateX(Math.PI / 2), { pos: L(0, 0, -0.05), rot });
  kit.add("metal", new THREE.CylinderGeometry(0.085, 0.075, 0.1, 16).rotateX(Math.PI / 2), { pos: L(0, 0, -0.44), rot, color: IMP.gunmetal, texel: 1 });
  kit.add("metal", new THREE.CylinderGeometry(0.05, 0.06, 0.08, 12).rotateX(Math.PI / 2), { pos: L(0, 0, 0.35), rot, color: IMP.steel, texel: 1 });
  kit.add("metal", new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16).rotateX(Math.PI / 2), { pos: L(0, 0, 0.0), rot, color: IMP.steel, texel: 1 });
  kit.add("metal", new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16).rotateX(Math.PI / 2), { pos: L(0, 0, -0.3), rot, color: IMP.steel, texel: 1 });
  kit.add("paintedMetal", new THREE.BoxGeometry(0.1, 0.05, 0.14), { pos: L(0, 0.085, 0.12), rot, color: IMP.dark, texel: 1 });
  kit.add("emitAmber", new THREE.BoxGeometry(0.05, 0.006, 0.04), { pos: L(0, 0.112, 0.12), rot });
  kit.add("decal", new THREE.PlaneGeometry(0.09, 0.09), { pos: [x, y + 1.31, z + 0.051], uv: "keep", uvRect: decalRect(9) });
  kit.collider([x - 0.32, y, z - 0.32], [x + 0.32, y + 1.8, z + 0.32], "viewer");
}
