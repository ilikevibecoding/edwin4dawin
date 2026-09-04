// Shared Deck 1 props (Phase 1 versions). Signatures are frozen for Phase 2: rooms may build richer props in
// their own folders, but these stay importable everywhere.
import * as THREE from "three";
import { IMP } from "./palette.js";

// A console unit: sloped desk on a plinth with a screen strip and indicator lights. Faces -z by default (rot in quarter turns).
export function consoleUnit(kit, cx, cy, cz, { w = 1.6, facing = 0, screen = "screenImp0", seed = 0 } = {}) {
  const d = 0.8;
  const rot = [0, (facing * Math.PI) / 2, 0];
  const box = (mat, ox, oy, oz, sx, sy, sz, opts = {}) => {
    // rotate the local offset (ox,oz) about y by facing
    const a = (facing * Math.PI) / 2;
    const rx = ox * Math.cos(a) + oz * Math.sin(a);
    const rz = -ox * Math.sin(a) + oz * Math.cos(a);
    kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [cx + rx, cy + oy, cz + rz], rot, ...opts });
  };
  box("paintedMetal", 0, 0.42, 0, w, 0.84, d, { color: IMP.black, texel: 1 }); // plinth
  box("darkGloss", 0, 0.9, -0.05, w - 0.06, 0.12, d - 0.1); // desk top
  box("paintedMetal", 0, 1.08, -d / 2 + 0.12, w - 0.1, 0.36, 0.14, { color: IMP.dark, texel: 1 }); // raised display housing
  box(screen, 0, 1.1, -d / 2 + 0.196, w - 0.3, 0.26, 0.01, { uv: "keep" }); // operator side of the housing
  // indicator cluster on the desk
  const cols = ["emitRedImp", "emitBlue", "emitAmber", "emitBlue", "emitRedImp"];
  for (let i = 0; i < 5; i++) box(cols[(((i + seed) % cols.length) + cols.length) % cols.length], -w / 2 + 0.2 + i * 0.12, 0.965, 0.18, 0.06, 0.01, 0.04);
  box("emitBlue", 0.25, 0.965, 0.22, w * 0.35, 0.01, 0.03);
  kit.collider([cx - w / 2 - 0.05, cy, cz - d / 2 - 0.05], [cx + w / 2 + 0.05, cy + 1.3, cz + d / 2 + 0.05], "console");
}

// Simple operator seat facing the same way as its console (facing quarter turns, seat centre).
export function seat(kit, cx, cy, cz, facing = 0) {
  const a = (facing * Math.PI) / 2;
  const off = (ox, oz) => [cx + ox * Math.cos(a) + oz * Math.sin(a), cz - ox * Math.sin(a) + oz * Math.cos(a)];
  const rot = [0, a, 0];
  let p = off(0, 0);
  kit.add("paintedMetal", new THREE.BoxGeometry(0.5, 0.08, 0.5), { pos: [p[0], cy + 0.48, p[1]], rot, color: IMP.dark, texel: 1 });
  kit.add("paintedMetal", new THREE.CylinderGeometry(0.06, 0.09, 0.44, 8), { pos: [p[0], cy + 0.22, p[1]], color: IMP.black, texel: 1 });
  p = off(0, 0.24);
  kit.add("paintedMetal", new THREE.BoxGeometry(0.5, 0.62, 0.06), { pos: [p[0], cy + 0.83, p[1]], rot, color: IMP.dark, texel: 1 });
}
