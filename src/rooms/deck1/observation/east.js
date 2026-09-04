// Windowless east part (x -48..-20): refreshment counter by the door, star-map wall on the south wall,
// briefing niche on the north wall. Plus the west end-wall screen so the long view has a focal point.
import * as THREE from "three";
import { IMP } from "../shared/palette.js";
import { decalRect } from "../../../textures.js";

const N_FACE = 458.3; // inner face of the north wall
const S_FACE = 465.7; // inner face of the south wall

export function eastPart(kit, FLOOR) {
  counter(kit, FLOOR);
  starMapWall(kit, FLOOR);
  briefingNiche(kit, FLOOR);
  westScreen(kit, FLOOR);
}

// refreshment counter: back-bar with three dispensers against the north wall, front counter, stools
function counter(kit, y) {
  const x0 = -33.5;
  const x1 = -24.5;
  // back-bar base + gloss top + upper cabinet band
  kit.boxMM("paintedMetal", [x0, y, N_FACE], [x1, y + 0.9, N_FACE + 0.62], { color: IMP.dark, texel: 1 });
  kit.boxMM("paintedMetal", [x0, y, N_FACE], [x1, y + 0.1, N_FACE + 0.66], { color: IMP.black, texel: 1 });
  kit.boxMM("blackGloss", [x0 - 0.03, y + 0.9, N_FACE], [x1 + 0.03, y + 0.95, N_FACE + 0.66], {});
  kit.boxMM("paintedMetal", [x0, y + 2.3, N_FACE], [x1, y + 2.9, N_FACE + 0.5], { color: IMP.dark, texel: 1 });
  kit.boxMM("emitWhite", [x0 + 0.1, y + 2.29, N_FACE + 0.2], [x1 - 0.1, y + 2.31, N_FACE + 0.46]);
  kit.boxMM("metal", [x0, y + 2.26, N_FACE + 0.46], [x1, y + 2.34, N_FACE + 0.52], { color: IMP.black, texel: 1 });
  // dispensers (black units with nozzle, drip tray, blue/amber readouts)
  for (let i = 0; i < 3; i++) {
    const cx = x0 + 1.5 + i * 3.0;
    kit.boxMM("paintedMetal", [cx - 0.42, y + 0.95, N_FACE + 0.02], [cx + 0.42, y + 2.05, N_FACE + 0.42], { color: IMP.black, texel: 1 });
    kit.boxMM("paintedMetal", [cx - 0.38, y + 1.5, N_FACE + 0.42], [cx + 0.38, y + 2.0, N_FACE + 0.5], { color: IMP.dark, texel: 1 });
    kit.boxMM(i === 1 ? "screenImp1" : "screenImp2", [cx - 0.3, y + 1.6, N_FACE + 0.5], [cx + 0.3, y + 1.92, N_FACE + 0.51], { uv: "keep" });
    kit.boxMM("emitBlue", [cx - 0.34, y + 1.53, N_FACE + 0.5], [cx - 0.1, y + 1.56, N_FACE + 0.51]);
    kit.boxMM("emitAmber", [cx + 0.1, y + 1.53, N_FACE + 0.5], [cx + 0.2, y + 1.56, N_FACE + 0.51]);
    kit.boxMM("emitRedImp", [cx + 0.26, y + 1.53, N_FACE + 0.5], [cx + 0.32, y + 1.56, N_FACE + 0.51]);
    kit.cyl("metal", cx, y + 1.36, N_FACE + 0.5, 0.025, 0.2, "z", { color: IMP.steel, texel: 1 });
    kit.cyl("metal", cx, y + 1.3, N_FACE + 0.58, 0.02, 0.12, "y", { color: IMP.steel, texel: 1 });
    kit.boxMM("metal", [cx - 0.22, y + 0.95, N_FACE + 0.4], [cx + 0.22, y + 0.97, N_FACE + 0.64], { color: IMP.grey, texel: 1 });
    kit.boxMM("emitWhite", [cx - 0.3, y + 1.44, N_FACE + 0.42], [cx + 0.3, y + 1.46, N_FACE + 0.48]);
    kit.add("decal", new THREE.PlaneGeometry(0.24, 0.24), { pos: [cx, y + 1.2, N_FACE + 0.421], uv: "keep", uvRect: decalRect(6 + i) });
  }
  kit.collider([x0, y, N_FACE], [x1, y + 2.9, N_FACE + 0.66], "back-bar");

  // front counter: dark body, gloss top with overhang, blue toe-kick glow, end panels
  const cz0 = 459.95;
  const cz1 = 460.6;
  kit.boxMM("paintedMetal", [x0, y + 0.08, cz0 + 0.04], [x1, y + 0.9, cz1 - 0.04], { color: IMP.dark, texel: 1 });
  kit.boxMM("paintedMetal", [x0 + 0.05, y, cz0 + 0.1], [x1 - 0.05, y + 0.08, cz1 - 0.1], { color: IMP.black, texel: 1 });
  kit.boxMM("blackGloss", [x0 - 0.05, y + 0.9, cz0 - 0.06], [x1 + 0.05, y + 0.96, cz1 + 0.16], {});
  kit.boxMM("emitBlue", [x0, y + 0.895, cz1 + 0.12], [x1, y + 0.905, cz1 + 0.15]);
  kit.boxMM("metal", [x0, y + 0.86, cz1 - 0.04], [x1, y + 0.9, cz1 + 0.0], { color: IMP.grey, texel: 1 });
  for (const ex of [x0, x1 - 0.06]) kit.boxMM("paintedMetal", [ex, y, cz0], [ex + 0.06, y + 0.9, cz1], { color: IMP.black, texel: 1 });
  for (let i = 0; i < 4; i++) {
    const px = x0 + 1.2 + i * 2.2;
    kit.add("decal", new THREE.PlaneGeometry(0.3, 0.3), { pos: [px, y + 0.5, cz1 - 0.039], uv: "keep", uvRect: decalRect(10 + (i % 3)) });
  }
  kit.collider([x0 - 0.05, y, cz0 - 0.06], [x1 + 0.05, y + 1.0, cz1 + 0.16], "counter");
  // stools (0.7 m seat height for a 0.95 m counter)
  for (let i = 0; i < 5; i++) {
    const sx = x0 + 1.0 + i * 1.75;
    const sz = cz1 + 0.75;
    kit.cyl("paintedMetal", sx, y + 0.02, sz, 0.22, 0.04, "y", { color: IMP.black, texel: 1 });
    kit.cyl("paintedMetal", sx, y + 0.35, sz, 0.035, 0.62, "y", { color: IMP.dark, texel: 1 });
    kit.cyl("metal", sx, y + 0.42, sz, 0.17, 0.02, "y", { color: IMP.steel, texel: 1 });
    kit.cyl("paintedMetal", sx, y + 0.68, sz, 0.19, 0.04, "y", { color: IMP.black, texel: 1 });
    kit.cyl("fabric", sx, y + 0.725, sz, 0.18, 0.05, "y", { color: IMP.mid, texel: 2 });
    kit.collider([sx - 0.22, y, sz - 0.22], [sx + 0.22, y + 0.76, sz + 0.22], "stool");
  }
}

// star-map wall on the south wall: heavy frame, one wide tactical screen, flanking status columns
function starMapWall(kit, y) {
  const x0 = -46;
  const x1 = -30;
  const zf = S_FACE;
  kit.boxMM("paintedMetal", [x0, y + 0.55, zf - 0.22], [x1, y + 4.1, zf], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [x0 + 0.08, y + 0.63, zf - 0.26], [x1 - 0.08, y + 4.02, zf - 0.22], { color: IMP.dark, texel: 1 });
  kit.boxMM("metal", [x0 - 0.06, y + 0.5, zf - 0.28], [x1 + 0.06, y + 0.56, zf], { color: IMP.grey, texel: 1 });
  kit.boxMM("metal", [x0 - 0.06, y + 4.1, zf - 0.28], [x1 + 0.06, y + 4.16, zf], { color: IMP.grey, texel: 1 });
  // centre screen 8 m x 2.4 m
  kit.boxMM("paintedMetal", [-42.2, y + 1.15, zf - 0.32], [-33.8, y + 3.65, zf - 0.26], { color: IMP.black, texel: 1 });
  kit.boxMM("screenImp2", [-42.0, y + 1.25, zf - 0.33], [-34.0, y + 3.55, zf - 0.32], { uv: "keep" });
  kit.boxMM("emitBlue", [-42.0, y + 1.17, zf - 0.325], [-34.0, y + 1.2, zf - 0.32]);
  kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [-38, y + 0.9, zf - 0.261], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(1) });
  // flanking status columns: stacked small screens + indicator rows
  for (const cx of [-44.3, -31.7]) {
    kit.boxMM("paintedMetal", [cx - 1.0, y + 0.9, zf - 0.3], [cx + 1.0, y + 3.9, zf - 0.26], { color: IMP.black, texel: 1 });
    for (let r = 0; r < 3; r++) {
      const sy = y + 1.1 + r * 0.95;
      kit.boxMM(r === 1 ? "screenImp2" : "screenImp1", [cx - 0.85, sy, zf - 0.31], [cx + 0.85, sy + 0.62, zf - 0.3], { uv: "keep" });
      for (let k = 0; k < 6; k++) {
        const mat = k % 3 === 0 ? "emitRedImp" : k % 3 === 1 ? "emitBlue" : "emitAmber";
        kit.boxMM(mat, [cx - 0.8 + k * 0.28, sy + 0.68, zf - 0.31], [cx - 0.62 + k * 0.28, sy + 0.72, zf - 0.3]);
      }
    }
    kit.boxMM("emitBlue", [cx - 0.9, y + 3.86, zf - 0.31], [cx + 0.9, y + 3.88, zf - 0.3]);
  }
  kit.collider([x0 - 0.06, y, zf - 0.34], [x1 + 0.06, y + 4.2, zf], "starmap");
}

// briefing niche on the north wall: framed screen, curved bench, round table
function briefingNiche(kit, y) {
  const cx = -44.5;
  kit.boxMM("paintedMetal", [cx - 2.6, y + 0.9, N_FACE], [cx + 2.6, y + 3.4, N_FACE + 0.18], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [cx - 2.5, y + 1.0, N_FACE + 0.18], [cx + 2.5, y + 3.3, N_FACE + 0.22], { color: IMP.dark, texel: 1 });
  kit.boxMM("screenImp1", [cx - 2.2, y + 1.25, N_FACE + 0.22], [cx + 2.2, y + 3.05, N_FACE + 0.23], { uv: "keep" });
  kit.boxMM("emitBlue", [cx - 2.2, y + 1.15, N_FACE + 0.22], [cx + 2.2, y + 1.18, N_FACE + 0.225]);
  for (let k = 0; k < 8; k++) kit.boxMM(k % 2 ? "emitAmber" : "emitRedImp", [cx - 2.2 + k * 0.6, y + 3.1, N_FACE + 0.22], [cx - 2.0 + k * 0.6, y + 3.14, N_FACE + 0.225]);
  kit.boxMM("metal", [cx - 2.6, y + 0.85, N_FACE], [cx + 2.6, y + 0.9, N_FACE + 0.22], { color: IMP.grey, texel: 1 });
  kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [cx + 2.2, y + 0.6, N_FACE + 0.001], uv: "keep", uvRect: decalRect(3) });
  kit.collider([cx - 2.6, y, N_FACE], [cx + 2.6, y + 3.4, N_FACE + 0.23], "briefing-screen");
  // curved bench facing the screen (arc south of the centre, 7 segments)
  const c = [cx, N_FACE + 1.1];
  const r = 2.3;
  const segs = 7;
  const a0 = Math.PI * 0.2;
  const a1 = Math.PI * 0.8;
  const segLen = (r * (a1 - a0)) / segs + 0.02;
  for (let i = 0; i < segs; i++) {
    const a = a0 + ((i + 0.5) / segs) * (a1 - a0);
    const px = c[0] + r * Math.cos(a);
    const pz = c[1] + r * Math.sin(a);
    const rot = [0, -a - Math.PI / 2, 0];
    const bx = c[0] + (r + 0.32) * Math.cos(a);
    const bz = c[1] + (r + 0.32) * Math.sin(a);
    kit.add("paintedMetal", new THREE.BoxGeometry(segLen, 0.42, 0.62), { pos: [px, y + 0.21, pz], rot, color: IMP.dark, texel: 1 });
    kit.add("fabric", new THREE.BoxGeometry(segLen - 0.03, 0.08, 0.58), { pos: [px, y + 0.46, pz], rot, color: IMP.mid, texel: 2 });
    kit.add("paintedMetal", new THREE.BoxGeometry(segLen, 0.5, 0.1), { pos: [bx, y + 0.72, bz], rot, color: IMP.dark, texel: 1 });
    kit.add("fabric", new THREE.BoxGeometry(segLen - 0.03, 0.42, 0.06), { pos: [bx - 0.07 * Math.cos(a), y + 0.72, bz - 0.07 * Math.sin(a)], rot, color: IMP.mid, texel: 2 });
    kit.collider([Math.min(px, bx) - 0.45, y, Math.min(pz, bz) - 0.45], [Math.max(px, bx) + 0.45, y + 1.0, Math.max(pz, bz) + 0.45], "niche-bench");
  }
  // round table with an emissive rim
  kit.cyl("paintedMetal", c[0], y + 0.2, c[1] + 0.3, 0.16, 0.4, "y", { color: IMP.black, texel: 1 });
  kit.cyl("paintedMetal", c[0], y + 0.02, c[1] + 0.3, 0.4, 0.04, "y", { color: IMP.black, texel: 1 });
  kit.cyl("blackGloss", c[0], y + 0.44, c[1] + 0.3, 0.6, 0.05, "y", {});
  kit.cyl("emitBlue", c[0], y + 0.43, c[1] + 0.3, 0.61, 0.012, "y", {});
  kit.collider([c[0] - 0.6, y, c[1] - 0.3], [c[0] + 0.6, y + 0.5, c[1] + 0.9], "niche-table");
}

// west end wall (x -83.7): framed fleet-status screen so the long view down the gallery has a terminus
function westScreen(kit, y) {
  const xf = -83.7;
  kit.boxMM("paintedMetal", [xf, y + 0.9, 459.8], [xf + 0.2, y + 3.9, 464.2], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [xf + 0.2, y + 1.0, 459.9], [xf + 0.24, y + 3.8, 464.1], { color: IMP.dark, texel: 1 });
  kit.boxMM("screenImp2", [xf + 0.24, y + 1.3, 460.3], [xf + 0.25, y + 3.5, 463.7], { uv: "keep" });
  kit.boxMM("emitBlue", [xf + 0.24, y + 1.2, 460.3], [xf + 0.245, y + 1.23, 463.7]);
  kit.boxMM("emitBlue", [xf + 0.24, y + 3.57, 460.3], [xf + 0.245, y + 3.6, 463.7]);
  for (let k = 0; k < 4; k++) kit.boxMM(k % 2 ? "emitAmber" : "emitRedImp", [xf + 0.24, y + 3.66, 460.3 + k * 0.5], [xf + 0.245, y + 3.7, 460.6 + k * 0.5]);
  kit.boxMM("metal", [xf, y + 0.85, 459.7], [xf + 0.26, y + 0.9, 464.3], { color: IMP.grey, texel: 1 });
  kit.collider([xf, y, 459.7], [xf + 0.26, y + 4.0, 464.3], "west-screen");
}
