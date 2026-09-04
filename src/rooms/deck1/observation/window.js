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

  // sill: cap plate, front apron and instruments under every pane (blue/amber readouts)
  const sz1 = zRoom + 0.42;
  kit.boxMM("metal", [A.x0 - fo, A.y0 - 0.02, zRoom - 0.02], [A.x1 + fo, A.y0 + 0.04, sz1], { color: IMP.mid, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 - fo, FLOOR + 0.12, sz1 - 0.06], [A.x1 + fo, A.y0 - 0.02, sz1], { color: IMP.dark, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 - fo, FLOOR, sz1 - 0.1], [A.x1 + fo, FLOOR + 0.12, sz1 - 0.03], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [A.x0 - fo, FLOOR + 0.12, zRoom], [A.x1 + fo, A.y0 - 0.02, sz1 - 0.06], { color: IMP.mid, texel: 1 });
  for (let i = 0; i < n; i++) {
    const x = A.x0 + (i + 0.5) * pw;
    kit.boxMM("paintedMetal", [x - 0.32, A.y0 + 0.04, zRoom + 0.1], [x + 0.32, A.y0 + 0.11, zRoom + 0.38], { color: IMP.black, texel: 1 });
    // readout plate tilted toward the room (+z edge lower)
    const th = 0.35;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const pc = [x, A.y0 + 0.125, zRoom + 0.24];
    const P = (lx, ly, lz) => [pc[0] + lx, pc[1] + ly * c - lz * s, pc[2] + ly * s + lz * c];
    const rot = [th, 0, 0];
    kit.add("paintedMetal", new THREE.BoxGeometry(0.6, 0.02, 0.24), { pos: pc, rot, color: IMP.dark, texel: 1 });
    const blue = i % 2 === 0;
    kit.add(blue ? "emitBlue" : "emitAmber", new THREE.BoxGeometry(0.22, 0.008, 0.06), { pos: P(-0.14, 0.013, -0.04), rot });
    kit.add(blue ? "emitAmber" : "emitBlue", new THREE.BoxGeometry(0.1, 0.008, 0.06), { pos: P(0.12, 0.013, -0.04), rot });
    kit.add("emitRedImp", new THREE.BoxGeometry(0.03, 0.008, 0.03), { pos: P(0.24, 0.013, -0.04), rot });
    kit.add("decal", new THREE.PlaneGeometry(0.16, 0.16), { pos: P(0, 0.011, 0.05), rot: [-Math.PI / 2 + th, 0, 0], uv: "keep", uvRect: decalRect(4 + (i % 4)) });
  }
  kit.collider([A.x0 - fo, FLOOR, A.zOut], [A.x1 + fo, A.y1 + fo, sz1], "sill");

  // leaning rail: brushed top rail on angled brackets off the sill apron, kick rail at the foot
  const zr = zRoom + 0.95;
  const len = A.x1 - A.x0 - 0.4;
  const cx = (A.x0 + A.x1) / 2;
  kit.cyl("metal", cx, FLOOR + 1.02, zr, 0.03, len, "x", { color: IMP.steel, texel: 2 });
  kit.boxMM("paintedMetal", [cx - len / 2, FLOOR + 0.02, zr - 0.03], [cx + len / 2, FLOOR + 0.14, zr + 0.03], { color: IMP.black, texel: 2 });
  for (let x = A.x0 + 0.5; x <= A.x1 - 0.4; x += 2.0) {
    kit.boxMM("paintedMetal", [x - 0.035, FLOOR, zr - 0.035], [x + 0.035, FLOOR + 0.99, zr + 0.035], { color: IMP.dark, texel: 2 });
    kit.add("paintedMetal", new THREE.BoxGeometry(0.05, 0.05, 0.62), { pos: [x, FLOOR + 0.72, zr - 0.27], rot: [-0.8, 0, 0], color: IMP.dark, texel: 2 });
    kit.boxMM("metal", [x - 0.05, FLOOR + 0.98, zr - 0.04], [x + 0.05, FLOOR + 1.06, zr + 0.04], { color: IMP.steel, texel: 2 });
    kit.boxMM("paintedMetal", [x - 0.08, FLOOR, zr - 0.08], [x + 0.08, FLOOR + 0.03, zr + 0.08], { color: IMP.black, texel: 2 });
  }
  kit.collider([cx - len / 2, FLOOR, zr - 0.08], [cx + len / 2, FLOOR + 1.1, zr + 0.08], "rail");

  // three binocular viewers on pedestals, angled up at the glass
  for (const x of [-73, -64, -55]) viewer(kit, x, FLOOR, zr + 0.75);
}

function viewer(kit, x, y, z) {
  kit.cyl("paintedMetal", x, y + 0.03, z, 0.32, 0.06, "y", { color: IMP.black, texel: 1 });
  kit.cyl("paintedMetal", x, y + 0.62, z, 0.09, 1.12, "y", { color: IMP.dark, texel: 1 });
  kit.cyl("metal", x, y + 1.2, z, 0.12, 0.06, "y", { color: IMP.steel, texel: 1 });
  kit.boxMM("paintedMetal", [x - 0.05, y + 1.22, z - 0.05], [x + 0.05, y + 1.4, z + 0.05], { color: IMP.black, texel: 1 });
  // head pitched up at the glass: local -z is the objective end, +z the eyepiece end
  const th = 0.36;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const hy = y + 1.47;
  const hz = z - 0.02;
  const L = (lx, ly, lz) => [x + lx, hy + ly * c - lz * s, hz + ly * s + lz * c];
  const rot = [th, 0, 0];
  kit.add("blackGloss", new THREE.BoxGeometry(0.42, 0.2, 0.46), { pos: L(0, 0, 0), rot });
  kit.add("paintedMetal", new THREE.BoxGeometry(0.46, 0.06, 0.2), { pos: L(0, -0.11, 0), rot, color: IMP.dark, texel: 1 });
  for (const sx of [-0.09, 0.09]) {
    kit.add("metal", new THREE.CylinderGeometry(0.035, 0.045, 0.12, 12).rotateX(Math.PI / 2), { pos: L(sx, 0.03, 0.28), rot, color: IMP.steel, texel: 1 });
    kit.add("emitBlue", new THREE.CircleGeometry(0.02, 10), { pos: L(sx, 0.03, 0.345), rot });
    kit.add("metal", new THREE.CylinderGeometry(0.065, 0.06, 0.12, 14).rotateX(Math.PI / 2), { pos: L(sx, 0.0, -0.28), rot, color: IMP.gunmetal, texel: 1 });
  }
  kit.add("emitAmber", new THREE.BoxGeometry(0.12, 0.02, 0.006), { pos: L(0, 0.06, 0.233), rot });
  kit.add("decal", new THREE.PlaneGeometry(0.14, 0.14), { pos: L(0, 0.104, 0.08), rot: [-Math.PI / 2 + th, 0, 0], uv: "keep", uvRect: decalRect(9) });
  kit.collider([x - 0.32, y, z - 0.32], [x + 0.32, y + 1.7, z + 0.32], "viewer");
}
