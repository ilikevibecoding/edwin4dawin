// Comms fixtures: signal wall array (west) with its upper-band cable tray, east-wall dressing, sensor-processing
// towers (+ the instanced rotating scanner ring), ceiling cable/light hub, linear aisle luminaires, recessed
// downlights, spot heads, supervisor dais, painted floor markings. World-space; the room is x -44..-23.6,
// z 490..508, floor 240.
import * as THREE from "three";
import { rng, setVertexColor, insideOut } from "../../../kit.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { decalRect } from "../../../textures.js";
import { IMP } from "../shared/palette.js";
import { cable, led, pick, PAINT, ring4 } from "./lib.js";
import { UI, uvRect } from "./ui.js";

const LED_MATS = ["emitBlue", "emitBlue", "emitBlue", "emitAmber", "emitAmber", "emitRedImp"];
const CABLE_COLS = [IMP.black, IMP.blue, IMP.mid, IMP.black];

// Small screen box on a wall facing +x (xFace = wall plane, screen proud by `t`)
function screenX(kit, mat, xFace, y0, y1, z0, z1, rect, t = 0.008) {
  kit.boxMM(mat, [xFace, y0, z0], [xFace + t, y1, z1], { uv: "keep", uvRect: rect });
}

// Wall junction box on an x-facing wall (face at xf, box toward +x): body, lid with bolts, LED, stencil.
function junctionBox(kit, xf, y0, y1, z0, z1, decal = 5) {
  kit.boxMM("paintedMetal", [xf, y0, z0], [xf + 0.12, y1, z1], { color: IMP.dark, texel: 2 });
  kit.boxMM("metal", [xf + 0.12, y0 + 0.015, z0 + 0.015], [xf + 0.14, y1 - 0.015, z1 - 0.015], { color: IMP.mid, texel: 2 });
  for (const yy of [y0 + 0.035, y1 - 0.035]) for (const zz of [z0 + 0.035, z1 - 0.035]) kit.box("metal", xf + 0.145, yy, zz, 0.01, 0.02, 0.02, { color: IMP.steel });
  led(kit, "emitAmber", xf + 0.14, y1 - 0.07, z1 - 0.08, "x", 1, 0.018);
  led(kit, "emitBlue", xf + 0.14, y1 - 0.07, z1 - 0.12, "x", 1, 0.018);
  const g = new THREE.PlaneGeometry(0.14, 0.14);
  g.rotateY(Math.PI / 2);
  kit.add("decal", g, { pos: [xf + 0.144, (y0 + y1) / 2 - 0.02, (z0 + z1) / 2 - 0.02], uv: "keep", uvRect: decalRect(decal) });
}

// Slatted vent grille on an x-facing wall (face at xf, grille toward +x)
function ventGrille(kit, xf, y0, y1, z0, z1) {
  kit.boxMM("paintedMetal", [xf, y0, z0], [xf + 0.035, y1, z1], { color: IMP.dark, texel: 1 });
  kit.boxMM("metal", [xf + 0.035, y0 + 0.03, z0 + 0.03], [xf + 0.04, y1 - 0.03, z1 - 0.03], { color: IMP.black });
  const n = Math.floor((y1 - y0 - 0.1) / 0.045);
  for (let k = 0; k < n; k++) kit.boxMM("metal", [xf + 0.04, y0 + 0.06 + k * 0.045, z0 + 0.06], [xf + 0.05, y0 + 0.072 + k * 0.045, z1 - 0.06], { color: IMP.mid });
}

/**
 * Signal wall on the west wall (face at xw, running along z, centred on zc).
 * Main animated display flanked by two status columns and two system-map panels; plinth below; above: a 0.45 m
 * wall cable tray on brackets with cable drops to every display, two junction boxes, a vent grille and three
 * hooded wall-wash fixtures (emitters face the wall, never the room).
 */
export function signalWall(kit, xw, y0, zc, ceilY) {
  const rand = rng(9001);
  const H = (h) => y0 + h;
  // plinth with vent slats
  kit.boxMM("paintedMetal", [xw, H(0), zc - 6.8], [xw + 0.45, H(0.36), zc + 6.8], { color: IMP.dark, texel: 1 });
  kit.boxMM("metal", [xw + 0.45, H(0.34), zc - 6.8], [xw + 0.47, H(0.36), zc + 6.8], { color: IMP.mid, texel: 2 });
  for (let z = zc - 6.4; z < zc + 6.4; z += 1.6)
    for (let k = 0; k < 4; k++) kit.boxMM("metal", [xw + 0.45, H(0.08 + k * 0.05), z], [xw + 0.458, H(0.09 + k * 0.05), z + 1.2], { color: IMP.black });

  // --- main display (5.8 × 2.9 frame, 5.4 × 2.6 screen)
  const z0 = zc - 2.9;
  const z1 = zc + 2.9;
  kit.boxMM("paintedMetal", [xw, H(0.55), z0], [xw + 0.3, H(3.5), z1], { color: IMP.black, texel: 1 });
  kit.boxMM("metal", [xw + 0.3, H(0.7), z0 + 0.15], [xw + 0.33, H(3.4), z1 - 0.15], { color: IMP.mid, texel: 2 });
  kit.boxMM("darkGloss", [xw + 0.3, H(0.73), z0 + 0.18], [xw + 0.335, H(3.37), z1 - 0.18]);
  kit.boxMM("commsWave", [xw + 0.3, H(0.75), z0 + 0.2], [xw + 0.34, H(3.35), z1 - 0.2], { uv: "keep" });
  // corner brackets and a maker's plate
  for (const [zz, s] of [[z0 + 0.05, 1], [z1 - 0.05, -1]])
    for (const yy of [0.62, 3.43]) {
      kit.boxMM("metal", [xw + 0.3, H(yy - 0.03), Math.min(zz, zz + s * 0.3)], [xw + 0.32, H(yy + 0.03), Math.max(zz, zz + s * 0.3)], { color: IMP.mid, texel: 2 });
    }
  // status LEDs along the frame foot
  for (let z = z0 + 0.3; z < z1 - 0.2; z += 0.25) led(kit, pick(rand, LED_MATS), xw + 0.3, H(0.63), z, "x", 1, 0.03);

  // --- flanking status columns
  for (const s of [-1, 1]) {
    const zcC = zc + s * 3.7;
    const a0 = zcC - 0.8;
    const a1 = zcC + 0.8;
    kit.boxMM("paintedMetal", [xw, H(0.36), a0], [xw + 0.36, H(3.5), a1], { color: IMP.dark, texel: 1 });
    kit.boxMM("metal", [xw + 0.36, H(0.4), a0 + 0.03], [xw + 0.375, H(3.46), a1 - 0.03], { color: IMP.black, texel: 2 });
    // tall status screen (1:4 cell)
    screenX(kit, "commsUI", xw + 0.375, H(1.2), H(3.2), zcC - 0.25, zcC + 0.25, uvRect(UI["status" + (s < 0 ? 0 : 1)]));
    // LED columns either side of the screen
    for (const t of [-0.55, -0.45, 0.45, 0.55])
      for (let k = 0; k < 20; k++) {
        if (rand() < 0.15) continue;
        led(kit, pick(rand, LED_MATS), xw + 0.375, H(1.25 + k * 0.1), zcC + t, "x", 1, 0.03, 0.01);
      }
    // readout + toggles under the screen
    screenX(kit, "commsUI", xw + 0.375, H(0.78), H(1.05), zcC - 0.27, zcC + 0.27, uvRect(UI["readout" + (s < 0 ? 2 : 6)]));
    for (let k = 0; k < 5; k++) kit.box("metal", xw + 0.39, H(0.6), zcC - 0.4 + k * 0.2, 0.03, 0.05, 0.05, { color: IMP.mid });
    for (let k = 0; k < 5; k++) led(kit, pick(rand, LED_MATS), xw + 0.375, H(0.5), zcC - 0.4 + k * 0.2, "x", 1, 0.02);
    // top vent
    for (let k = 0; k < 5; k++) kit.boxMM("metal", [xw + 0.375, H(3.28 + k * 0.03), a0 + 0.2], [xw + 0.383, H(3.29 + k * 0.03), a1 - 0.2], { color: IMP.black });
    // label plate + stencil
    kit.boxMM("impPanel", [xw + 0.375, H(1.08), zcC + 0.55], [xw + 0.38, H(1.16), zcC + 0.75], { color: IMP.white, texel: 2 });
    const g = new THREE.PlaneGeometry(0.16, 0.06);
    g.rotateY(Math.PI / 2);
    const c = decalRect(9);
    kit.add("decal", g, { pos: [xw + 0.384, H(1.12), zcC + 0.65], uv: "keep", uvRect: [c[0] + 0.03, c[1] + 0.1, c[2] - 0.03, c[1] + 0.16] });

    // --- outer system-map panel
    const zcM = zc + s * 5.7;
    kit.boxMM("paintedMetal", [xw, H(1.3), zcM - 0.85], [xw + 0.3, H(3.3), zcM + 0.85], { color: IMP.dark, texel: 1 });
    kit.boxMM("metal", [xw + 0.3, H(1.34), zcM - 0.81], [xw + 0.315, H(3.26), zcM + 0.81], { color: IMP.black, texel: 2 });
    screenX(kit, "commsUI", xw + 0.315, H(2.35), H(3.1), zcM - 0.75, zcM + 0.75, uvRect(UI.map));
    screenX(kit, "commsUI", xw + 0.315, H(1.85), H(2.22), zcM - 0.74, zcM + 0.74, uvRect(UI["wide" + (s < 0 ? 0 : 1)]));
    for (let k = 0; k < 12; k++) led(kit, pick(rand, LED_MATS), xw + 0.315, H(1.6), zcM - 0.66 + k * 0.12, "x", 1, 0.03);
    for (let k = 0; k < 3; k++) kit.box("metal", xw + 0.33, H(1.45), zcM - 0.3 + k * 0.3, 0.03, 0.06, 0.1, { color: IMP.mid });
  }

  // --- upper band: 0.45 m wall cable tray on brackets at 3.82 m with four cables, ribs and end plates
  const tY = H(3.82);
  const t0 = zc - 7.7;
  const t1 = zc + 7.7;
  for (let zz = zc - 7.2; zz <= zc + 7.21; zz += 1.8) {
    kit.boxMM("metal", [xw, tY - 0.06, zz - 0.03], [xw + 0.52, tY - 0.02, zz + 0.03], { color: IMP.mid, texel: 2 });
    kit.boxMM("metal", [xw, tY - 0.22, zz - 0.04], [xw + 0.04, tY + 0.08, zz + 0.04], { color: IMP.mid, texel: 2 });
    kit.boxMM("metal", [xw + 0.04, tY - 0.2, zz - 0.015], [xw + 0.5, tY - 0.06, zz + 0.015], { color: IMP.dark }); // diagonal-less gusset plate
  }
  kit.boxMM("metal", [xw + 0.06, tY - 0.02, t0], [xw + 0.51, tY, t1], { color: IMP.mid, texel: 2 });
  kit.boxMM("metal", [xw + 0.06, tY - 0.02, t0], [xw + 0.08, tY + 0.1, t1], { color: IMP.dark, texel: 2 });
  kit.boxMM("metal", [xw + 0.49, tY - 0.02, t0], [xw + 0.51, tY + 0.1, t1], { color: IMP.dark, texel: 2 });
  for (const zz of [t0, t1]) kit.boxMM("metal", [xw + 0.06, tY - 0.02, zz - 0.01], [xw + 0.51, tY + 0.1, zz + 0.01], { color: IMP.dark });
  for (let zz = t0 + 0.3; zz < t1; zz += 0.5) kit.boxMM("metal", [xw + 0.08, tY, zz - 0.015], [xw + 0.49, tY + 0.015, zz + 0.015], { color: IMP.mid });
  for (let k = 0; k < 4; k++) {
    const r = 0.013 + rand() * 0.01;
    kit.cyl("paintedMetal", xw + 0.13 + k * 0.1, tY + r, zc, r, t1 - t0 - 0.1, "z", { color: CABLE_COLS[k], segments: 6 });
  }
  // cable drops from the tray to every display top (through a gland box on each frame); the main display takes
  // two drops at its shoulders, 1.3 m clear of the wall-wash spot in the centre hood
  for (const [zz, top, n] of [[zc - 1.3, H(3.5), 2], [zc + 1.3, H(3.5), 2], [zc - 3.7, H(3.5), 2], [zc + 3.7, H(3.5), 2], [zc - 5.7, H(3.3), 2], [zc + 5.7, H(3.3), 2]]) {
    kit.boxMM("paintedMetal", [xw + 0.08, top, zz - 0.1], [xw + 0.26, top + 0.07, zz + 0.1], { color: IMP.black, texel: 2 });
    for (let k = 0; k < n; k++) {
      const oz = (k - (n - 1) / 2) * 0.06;
      cable(kit, "paintedMetal", [xw + 0.16 + k * 0.08, tY - 0.02, zz + oz], [xw + 0.14 + k * 0.04, top + 0.07, zz + oz * 0.7], 0.012, { color: CABLE_COLS[(k + (zz > zc ? 1 : 0)) % 4], sag: 0.03, pieces: 3 });
    }
  }
  // two junction boxes: one on the free wall beyond the south map panel (conduits up to the tray and down to the
  // deck), one above the north map panel (conduit up to the tray); vent grille above the south map panel
  junctionBox(kit, xw, H(2.7), H(3.1), zc + 6.95, zc + 7.29, 5);
  kit.cyl("metal", xw + 0.07, (H(3.1) + tY - 0.02) / 2, zc + 7.12, 0.022, tY - 0.02 - H(3.1), "y", { color: IMP.mid, segments: 8 });
  kit.cyl("metal", xw + 0.07, H(1.45), zc + 7.12, 0.022, 2.5, "y", { color: IMP.mid, segments: 8 });
  kit.boxMM("paintedMetal", [xw, H(0), zc + 6.95], [xw + 0.16, H(0.2), zc + 7.29], { color: IMP.black, texel: 2 });
  for (const yy of [1.2, 2.2]) kit.boxMM("metal", [xw, H(yy), zc + 7.09], [xw + 0.09, H(yy + 0.05), zc + 7.15], { color: IMP.dark });
  junctionBox(kit, xw, H(3.4), H(3.68), zc - 5.9, zc - 5.5, 13);
  kit.cyl("metal", xw + 0.07, (H(3.68) + tY - 0.02) / 2, zc - 5.7, 0.022, tY - 0.02 - H(3.68), "y", { color: IMP.mid, segments: 8 });
  ventGrille(kit, xw, H(3.38), H(3.72), zc + 4.6, zc + 5.3);
  ventGrille(kit, xw, H(3.0), H(3.58), zc - 7.6, zc - 6.95);
  // three hooded wall-wash fixtures hung from the ceiling: dark housing, room-side lip, blue emitter facing the
  // wall, a black floor plate under the cavity. The centre one houses the blue wall-wash spot (see washSpot):
  // its cone points down the wall, so the ceiling, the hood and the wall above the hood stay dark.
  for (const zz of [zc - 3.7, zc, zc + 3.7]) {
    kit.boxMM("paintedMetal", [xw + 0.55, ceilY - 0.2, zz - 0.28], [xw + 0.9, ceilY - 0.03, zz + 0.28], { color: IMP.dark, texel: 2 });
    kit.boxMM("metal", [xw + 0.88, ceilY - 0.32, zz - 0.3], [xw + 0.92, ceilY - 0.03, zz + 0.3], { color: IMP.mid, texel: 2 });
    kit.boxMM("metal", [xw + 0.55, ceilY - 0.32, zz - 0.3], [xw + 0.92, ceilY - 0.3, zz + 0.3], { color: IMP.black, texel: 2 });
    kit.boxMM("emitBlue", [xw + 0.542, ceilY - 0.19, zz - 0.22], [xw + 0.55, ceilY - 0.06, zz + 0.22]);
    kit.cyl("metal", xw + 0.72, ceilY - 0.015, zz, 0.03, 0.03, "y", { color: IMP.steel, segments: 8 });
    kit.cyl("metal", xw + 0.3, ceilY - 0.1, zz, 0.02, 0.5, "x", { color: IMP.mid, segments: 8 });
  }
  // --- floor inlay (impFloor: 11 m² of paintedMetal read as stains) with a painted edge line
  kit.boxMM("impFloor", [xw + 0.47, H(0), zc - 6.8], [xw + 1.3, H(0.012), zc + 6.8], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [xw + 1.3, H(0), zc - 6.6], [xw + 1.34, H(0.008), zc + 6.6], { color: PAINT });
  kit.collider([xw, y0, zc - 6.8], [xw + 0.47, y0 + 3.6, zc + 6.8], "signal-wall");
}

/**
 * East wall dressing around the door (wall face at xe, door z range [dz0, dz1], door height dh).
 * Status board, lockers, suppression canister, intercom, patch panel, ducts with grilles, riser, crates, signs.
 */
export function eastWall(kit, xe, y0, zn, zs, dz0, dz1, dh, ceilY) {
  const rand = rng(9002);
  const H = (h) => y0 + h;
  const zd = (dz0 + dz1) / 2;
  // sign above the door
  kit.boxMM("paintedMetal", [xe - 0.06, H(dh + 0.15), zd - 0.75], [xe, H(dh + 0.9), zd + 0.75], { color: IMP.black, texel: 1 });
  kit.boxMM("commsUI", [xe - 0.065, H(dh + 0.2), zd - 0.7], [xe - 0.06, H(dh + 0.85), zd + 0.7], { uv: "keep", uvRect: uvRect(UI.sign0) });
  // hazard threshold inside the door
  kit.boxMM("hazard", [xe - 0.42, H(0), dz0], [xe - 0.06, H(0.01), dz1], { texel: 3 });

  // --- north of the door: status board with readouts
  {
    const b0 = zn + 2.9;
    const b1 = b0 + 2.6;
    kit.boxMM("paintedMetal", [xe - 0.12, H(1.3), b0], [xe, H(2.5), b1], { color: IMP.dark, texel: 1 });
    kit.boxMM("metal", [xe - 0.135, H(1.33), b0 + 0.03], [xe - 0.12, H(2.47), b1 - 0.03], { color: IMP.black, texel: 2 });
    kit.boxMM("commsUI", [xe - 0.14, H(1.8), b0 + 0.1], [xe - 0.135, H(2.4), b1 - 0.1], { uv: "keep", uvRect: uvRect(UI.board) });
    kit.boxMM("commsUI", [xe - 0.14, H(1.4), b0 + 0.1], [xe - 0.135, H(1.68), b0 + 0.66], { uv: "keep", uvRect: uvRect(UI.readout4) });
    kit.boxMM("commsUI", [xe - 0.14, H(1.4), b0 + 0.74], [xe - 0.135, H(1.68), b0 + 1.3], { uv: "keep", uvRect: uvRect(UI.readout5) });
    kit.boxMM("commsUI", [xe - 0.14, H(1.4), b0 + 1.4], [xe - 0.135, H(1.68), b1 - 0.1], { uv: "keep", uvRect: uvRect(UI.wide1) });
    for (let k = 0; k < 10; k++) led(kit, pick(rand, LED_MATS), xe - 0.135, H(1.74), b0 + 0.2 + k * 0.24, "x", -1, 0.03);
    // patch panel below with hanging cables
    kit.boxMM("metal", [xe - 0.08, H(0.85), b0 + 0.6], [xe, H(1.15), b0 + 1.9], { color: IMP.mid, texel: 2 });
    for (let k = 0; k < 8; k++) {
      const z = b0 + 0.72 + k * 0.155;
      kit.boxMM("paintedMetal", [xe - 0.09, H(0.95), z], [xe - 0.08, H(1.05), z + 0.09], { color: IMP.black });
      if (k % 3 === 0) cable(kit, "paintedMetal", [xe - 0.09, H(1.0), z + 0.045], [xe - 0.2 - rand() * 0.2, H(0.02), z + 0.3 + rand() * 0.4], 0.009, { color: k ? IMP.black : IMP.blue, sag: 0.1, pieces: 4 });
    }
    kit.collider([xe - 0.15, y0, b0], [xe, y0 + 2.5, b1], "board");
    // lockers
    for (let i = 0; i < 2; i++) {
      const l0 = zn + 0.7 + i * 0.78;
      const l1 = l0 + 0.72;
      kit.boxMM("paintedMetal", [xe - 0.5, H(0), l0], [xe, H(1.98), l1], { color: IMP.dark, texel: 1 });
      kit.boxMM("impPanel", [xe - 0.52, H(0.1), l0 + 0.03], [xe - 0.5, H(1.9), l1 - 0.03], { color: IMP.grey, texel: 1 });
      kit.boxMM("metal", [xe - 0.55, H(0.9), l1 - 0.12], [xe - 0.52, H(1.25), l1 - 0.09], { color: IMP.mid });
      for (let k = 0; k < 4; k++) kit.boxMM("metal", [xe - 0.523, H(0.2 + k * 0.04), l0 + 0.15], [xe - 0.52, H(0.21 + k * 0.04), l1 - 0.15], { color: IMP.black });
      led(kit, i ? "emitAmber" : "emitBlue", xe - 0.52, H(1.8), l1 - 0.12, "x", -1, 0.025);
      const g = new THREE.PlaneGeometry(0.2, 0.2);
      g.rotateY(-Math.PI / 2);
      kit.add("decal", g, { pos: [xe - 0.524, H(1.5), (l0 + l1) / 2], uv: "keep", uvRect: decalRect(i ? 14 : 6) });
      kit.collider([xe - 0.55, y0, l0], [xe, y0 + 2.0, l1], "locker");
    }
    kit.boxMM("metal", [xe - 0.52, H(1.98), zn + 0.68], [xe, H(2.04), zn + 2.3], { color: IMP.mid, texel: 2 });
    // suppression canister in a bracket
    const cz = zn + 2.55;
    kit.boxMM("metal", [xe - 0.1, H(0.5), cz - 0.14], [xe, H(0.95), cz + 0.14], { color: IMP.dark, texel: 2 });
    kit.cyl("paintedMetal", xe - 0.16, H(0.68), cz, 0.085, 0.56, "y", { color: IMP.red, segments: 14, texel: 1 });
    kit.cyl("metal", xe - 0.16, H(0.99), cz, 0.035, 0.08, "y", { color: IMP.steel, segments: 10 });
    kit.box("metal", xe - 0.16, H(1.05), cz + 0.03, 0.05, 0.03, 0.14, { color: IMP.mid });
    kit.boxMM("hazard", [xe - 0.26, H(0.4), cz - 0.16], [xe - 0.06, H(0.46), cz + 0.16], { texel: 3 });
    kit.collider([xe - 0.3, y0, cz - 0.16], [xe, y0 + 1.1, cz + 0.16], "canister");
    // intercom near the door
    const iz = dz0 - 0.5;
    kit.boxMM("paintedMetal", [xe - 0.08, H(1.45), iz - 0.11], [xe, H(1.75), iz + 0.11], { color: IMP.dark, texel: 2 });
    kit.boxMM("impPanel", [xe - 0.09, H(1.47), iz - 0.09], [xe - 0.08, H(1.73), iz + 0.09], { color: IMP.white, texel: 2 });
    for (let k = 0; k < 6; k++) kit.boxMM("metal", [xe - 0.094, H(1.62 + k * 0.018), iz - 0.06], [xe - 0.09, H(1.626 + k * 0.018), iz + 0.06], { color: IMP.dark });
    led(kit, "emitBlue", xe - 0.09, H(1.52), iz - 0.05, "x", -1, 0.015);
    kit.box("metal", xe - 0.095, H(1.52), iz + 0.05, 0.01, 0.03, 0.03, { color: IMP.mid });
    cable(kit, "paintedMetal", [xe - 0.04, H(1.45), iz], [xe - 0.04, H(1.1), iz], 0.01, { color: IMP.black });
  }
  // --- south of the door: duct riser in the corner, wall sign, crates
  {
    // riser (floor to ceiling) with flanges and a junction box
    kit.boxMM("paintedMetal", [xe - 0.65, H(0), zs - 0.9], [xe, H(0.2), zs], { color: IMP.black, texel: 1 });
    kit.boxMM("metalRough", [xe - 0.6, H(0.2), zs - 0.85], [xe, ceilY, zs], { color: IMP.mid, texel: 1 });
    for (const yy of [1.2, 2.5, 3.6]) kit.boxMM("metal", [xe - 0.63, H(yy), zs - 0.88], [xe, H(yy + 0.05), zs], { color: IMP.dark, texel: 2 });
    kit.boxMM("paintedMetal", [xe - 0.78, H(1.55), zs - 0.65], [xe - 0.6, H(1.95), zs - 0.25], { color: IMP.dark, texel: 2 });
    led(kit, "emitAmber", xe - 0.78, H(1.88), zs - 0.32, "x", -1, 0.02);
    led(kit, "emitBlue", xe - 0.78, H(1.88), zs - 0.38, "x", -1, 0.02);
    {
      const g = new THREE.PlaneGeometry(0.16, 0.16);
      g.rotateY(-Math.PI / 2);
      kit.add("decal", g, { pos: [xe - 0.784, H(1.72), zs - 0.45], uv: "keep", uvRect: decalRect(5) });
    }
    for (let k = 0; k < 3; k++) cable(kit, "paintedMetal", [xe - 0.7, H(1.55), zs - 0.35 - k * 0.1], [xe - 0.7 - k * 0.02, H(0.22), zs - 0.35 - k * 0.1], 0.012, { color: k === 1 ? IMP.blue : IMP.black });
    kit.collider([xe - 0.8, y0, zs - 0.9], [xe, ceilY, zs], "riser");
    // sign
    const sz = zs - 2.6;
    kit.boxMM("paintedMetal", [xe - 0.05, H(1.85), sz - 0.62], [xe, H(2.5), sz + 0.62], { color: IMP.black, texel: 1 });
    kit.boxMM("commsUI", [xe - 0.055, H(1.9), sz - 0.57], [xe - 0.05, H(2.45), sz + 0.57], { uv: "keep", uvRect: uvRect(UI.sign3) });
    // crates (1.2 m long box + a smaller one on top): scale reference
    const c0 = dz1 + 1.4;
    const crate = (x0, x1, yy0, yy1, z0, z1, idx) => {
      kit.boxMM("paintedMetal", [x0, yy0, z0], [x1, yy1, z1], { color: IMP.mid, texel: 1 });
      kit.boxMM("metal", [x0 - 0.01, yy0, z0 - 0.01], [x1 + 0.01, yy0 + 0.1, z1 + 0.01], { color: IMP.dark, texel: 1 });
      kit.boxMM("metal", [x0 - 0.01, yy1 - 0.08, z0 - 0.01], [x1 + 0.01, yy1, z1 + 0.01], { color: IMP.dark, texel: 1 });
      kit.boxMM("hazard", [x0 - 0.005, yy0 + (yy1 - yy0) * 0.45, z0 - 0.005], [x1 + 0.005, yy0 + (yy1 - yy0) * 0.45 + 0.05, z1 + 0.005], { texel: 3 });
      for (const zz of [z0 + 0.15, z1 - 0.15]) kit.box("metal", x0, (yy0 + yy1) / 2, zz, 0.02, (yy1 - yy0) * 0.6, 0.06, { color: IMP.mid });
      const g = new THREE.PlaneGeometry(0.22, 0.22);
      g.rotateY(-Math.PI / 2);
      kit.add("decal", g, { pos: [x0 - 0.004, (yy0 + yy1) / 2 + 0.05, (z0 + z1) / 2], uv: "keep", uvRect: decalRect(idx) });
      kit.collider([x0, yy0, z0], [x1, yy1, z1], "crate");
    };
    crate(xe - 0.85, xe - 0.05, H(0), H(0.8), c0, c0 + 1.2, 11);
    crate(xe - 0.75, xe - 0.05, H(0.8), H(1.4), c0 + 0.1, c0 + 1.1, 0);
    crate(xe - 0.85, xe - 0.05, H(0), H(0.6), c0 + 1.35, c0 + 2.15, 14);
  }
}

/**
 * Sensor-processing tower at (x, z): 2.5 m cylinder on a hazard-banded drum, four ribs, a waisted neck at 2.1 m
 * that the instanced scanner ring (see ringGeometry) rotates around, status LED column + readout facing +x,
 * control screen facing -x, vents / latched access panels on ±z, cap with antenna and beacon. `labelSide` (±1)
 * picks the z side of the +x face that carries the unit's identification: a white plate with the HV power
 * stencil, a status readout with LEDs and the unit ID on the upper drum, all turned 70° off +x toward the centre
 * aisle so the towers read as power/antenna units from the walkway. Returns the ring y.
 */
export function sensorTower(kit, x, y0, z, idx, { labelSide = 1 } = {}) {
  const rand = rng(9100 + idx);
  const H = (h) => y0 + h;
  // floor plate with a painted ring, drum with the hazard chevron band (plate in impFloor: paintedMetal's chip
  // map reads as stains at 3 m²)
  kit.cyl("impFloor", x, H(0.006), z, 0.98, 0.012, "y", { color: IMP.black, segments: 24, texel: 1 });
  kit.add("paintedMetal", new THREE.TorusGeometry(0.95, 0.012, 5, 40), { pos: [x, H(0.012), z], rot: [Math.PI / 2, 0, 0], color: PAINT });
  kit.cyl("metalRough", x, H(0.11), z, 0.7, 0.22, "y", { color: IMP.mid, segments: 16, texel: 1 });
  kit.cyl("hazard", x, H(0.2), z, 0.705, 0.06, "y", { segments: 16, texel: 3 });
  kit.cyl("metal", x, H(0.235), z, 0.6, 0.03, "y", { color: IMP.grey, segments: 16, texel: 1 });
  // body: lower drum, waisted neck, upper drum and cap
  kit.cyl("paintedMetal", x, H(1.1), z, 0.45, 1.7, "y", { color: IMP.dark, segments: 20, texel: 1 });
  kit.cyl("metal", x, H(1.96), z, 0.47, 0.04, "y", { color: IMP.grey, segments: 20, texel: 1 });
  kit.cyl("metal", x, H(2.1), z, 0.3, 0.3, "y", { color: IMP.black, segments: 16, texel: 1 });
  kit.cyl("metal", x, H(2.27), z, 0.47, 0.04, "y", { color: IMP.grey, segments: 20, texel: 1 });
  kit.cyl("paintedMetal", x, H(2.38), z, 0.45, 0.22, "y", { color: IMP.dark, segments: 20, texel: 1 });
  kit.cyl("paintedMetal", x, H(2.53), z, 0.4, 0.08, "y", { color: IMP.black, segments: 16, texel: 1 });
  kit.cyl("metal", x, H(2.62), z, 0.12, 0.1, "y", { color: IMP.grey, segments: 10 });
  kit.cyl("metal", x, H(2.87), z, 0.025, 0.4, "y", { color: IMP.steel, segments: 6 });
  led(kit, "emitRedImp", x, H(3.07), z, "y", 1, 0.04, 0.02);
  // four ribs (on the diagonals so the four dressed faces stay clear) and a mid band
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    kit.add("metal", new THREE.BoxGeometry(0.08, 1.66, 0.1), { pos: [x + Math.cos(a) * 0.45, H(1.1), z + Math.sin(a) * 0.45], rot: [0, -a, 0], color: IMP.grey, texel: 2 });
  }
  kit.cyl("metal", x, H(0.62), z, 0.46, 0.03, "y", { color: IMP.grey, segments: 20, texel: 1 });
  // +x face: status column (two LED columns on a black plate) with a readout above it. Plates on the round body
  // start inside the cylinder so their edges do not float off the curve.
  {
    const xf = x + 0.44;
    kit.boxMM("paintedMetal", [xf - 0.04, H(0.72), z - 0.13], [xf + 0.03, H(1.9), z + 0.13], { color: IMP.black, texel: 2 });
    kit.boxMM("darkGloss", [xf + 0.03, H(0.75), z - 0.11], [xf + 0.035, H(1.55), z + 0.11]);
    for (let k = 0; k < 13; k++) for (const t of [-0.06, 0.06]) if (rand() > 0.15) led(kit, pick(rand, LED_MATS), xf + 0.035, H(0.79 + k * 0.058), z + t, "x", 1, 0.022, 0.008);
    kit.boxMM("commsUI", [xf + 0.03, H(1.6), z - 0.11], [xf + 0.036, H(1.71), z + 0.11], { uv: "keep", uvRect: uvRect(UI["readout" + (idx % 2 ? 3 : 1)]) });
    kit.boxMM("commsUI", [xf + 0.03, H(1.74), z - 0.11], [xf + 0.036, H(1.85), z + 0.11], { uv: "keep", uvRect: uvRect(UI["readout" + (idx % 2 ? 4 : 0)]) });
    kit.boxMM("impPanel", [xf + 0.03, H(0.64), z - 0.1], [xf + 0.034, H(0.7), z + 0.1], { color: IMP.white, texel: 2 });
  }
  // -x face: control panel (sensor screen, LEDs, sign plate) on a sloped housing
  {
    const xf = x - 0.44;
    kit.boxMM("paintedMetal", [xf - 0.16, H(0.9), z - 0.24], [xf + 0.1, H(1.18), z + 0.24], { color: IMP.dark, texel: 1 });
    kit.boxMM("commsUI", [xf - 0.168, H(1.0), z - 0.2], [xf - 0.16, H(1.16), z + 0.2], { uv: "keep", uvRect: uvRect(UI["sensor" + (idx % 2)]) });
    for (let k = 0; k < 5; k++) led(kit, pick(rand, LED_MATS), xf - 0.16, H(0.95), z - 0.16 + k * 0.08, "x", -1, 0.025);
    kit.add("commsUI", new THREE.BoxGeometry(0.44, 0.006, 0.08), { pos: [xf - 0.08, H(1.183), z], rot: [0, Math.PI / 2, 0], uv: "keep", uvRect: uvRect(UI.sign1) });
    for (let k = 0; k < 3; k++) kit.boxMM("metal", [xf - 0.012, H(1.3 + k * 0.1), z - 0.15], [xf + 0.06, H(1.34 + k * 0.1), z + 0.15], { color: IMP.black });
  }
  // ±z faces: vent slats low, latched access panel high, cable gland with a cable to the deck
  for (const s of [-1, 1]) {
    const zf = z + s * 0.44;
    const zo = (d) => zf + s * d;
    const mm = (a, b) => [Math.min(a, b), Math.max(a, b)];
    for (let k = 0; k < 6; k++) {
      const [za, zb] = mm(zo(-0.06), zo(0.012));
      kit.boxMM("metal", [x - 0.2, H(0.4 + k * 0.04), za], [x + 0.2, H(0.41 + k * 0.04), zb], { color: IMP.black });
    }
    const [pa, pb] = mm(zo(-0.07), zo(0.02));
    kit.boxMM("paintedMetal", [x - 0.22, H(1.25), pa], [x + 0.22, H(1.85), pb], { color: IMP.black, texel: 2 });
    const [la, lb] = mm(zo(0.02), zo(0.045));
    for (const lx of [x - 0.15, x + 0.15]) kit.boxMM("metal", [lx - 0.03, H(1.5), la], [lx + 0.03, H(1.6), lb], { color: IMP.grey });
    const g = new THREE.PlaneGeometry(0.18, 0.18);
    if (s < 0) g.rotateY(Math.PI);
    kit.add("decal", g, { pos: [x, H(1.55), zo(0.021)], uv: "keep", uvRect: decalRect(s < 0 ? 13 : 1) });
    const [ga, gb] = mm(zo(-0.15), zo(0.06));
    kit.boxMM("metal", [x + 0.2, H(0.28), ga], [x + 0.32, H(0.36), gb], { color: IMP.dark });
    cable(kit, "paintedMetal", [x + 0.26, H(0.3), zo(0.06)], [x + 0.3, H(0.02), zo(0.9)], 0.012, { color: s < 0 ? IMP.blue : IMP.black, sag: 0.05, pieces: 3 });
  }
  // identification band at azimuth ±70° from +x (between the +x status column and the ±z access panel, clear of the
  // 45° rib): radial boxes have local x = radial thickness, local z = tangential width; their backs start inside
  // the r 0.45 drum so the 0.26 m chords do not float off the curve
  {
    const th = labelSide * 1.222; // 70°
    const rad = [Math.cos(th), Math.sin(th)];
    const tan = [-Math.sin(th), Math.cos(th)]; // local z of a box rotated by -th about y
    const at = (rc, tc) => [x + rad[0] * rc + tan[0] * tc, 0, z + rad[1] * rc + tan[1] * tc];
    const rbox = (mat, rc, tc, t, yc, h, w, opts = {}) => {
      const p = at(rc, tc);
      kit.add(mat, new THREE.BoxGeometry(t, h, w), { pos: [p[0], yc, p[2]], rot: [0, -th, 0], ...opts });
    };
    const decal = (idx2, rc, yc, size) => {
      const g = new THREE.PlaneGeometry(size, size);
      g.rotateY(Math.PI / 2 - th);
      const p = at(rc, 0);
      kit.add("decal", g, { pos: [p[0], yc, p[2]], uv: "keep", uvRect: decalRect(idx2) });
    };
    // black backing plate, white label plate with the HV power stencil, readout in the bezel above it, three LEDs
    rbox("paintedMetal", 0.44, 0, 0.06, H(0.97), 0.54, 0.3, { color: IMP.black, texel: 2 });
    rbox("impPanel", 0.472, 0, 0.006, H(0.88), 0.28, 0.26, { color: IMP.white, texel: 2 });
    decal(5, 0.4765, H(0.88), 0.22);
    rbox("commsUI", 0.472, 0, 0.006, H(1.16), 0.1, 0.22, { uv: "keep", uvRect: uvRect(UI["readout" + (idx % 2 ? 6 : 5)]) });
    ["emitBlue", "emitAmber", idx % 2 ? "emitRedImp" : "emitBlue"].forEach((mat, k) => rbox(mat, 0.472, -0.05 + k * 0.05, 0.006, H(1.06), 0.018, 0.018));
    // unit ID stencil on the upper drum (r 0.45 paintedMetal band at 2.27–2.49 m)
    decal(idx % 2 ? 14 : 0, 0.452, H(2.38), 0.18);
  }
  kit.collider([x - 0.72, y0, z - 0.72], [x + 0.72, y0 + 2.6, z + 0.72], "tower");
  return H(2.1);
}

// Merged scanner-ring geometry (origin on the tower axis at the ring height, +y up) with vertex colours for `metal`:
// collar around the neck, three spokes, a 0.7 m ring with three sensor heads and a counterweight.
export function ringGeometry() {
  const parts = [];
  const add = (g, color) => {
    if (g.index) g = g.toNonIndexed();
    setVertexColor(g, color);
    parts.push(g);
  };
  add(new THREE.CylinderGeometry(0.35, 0.35, 0.14, 16), IMP.steel);
  add(new THREE.TorusGeometry(0.7, 0.035, 8, 40).rotateX(Math.PI / 2), IMP.steel);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    add(new THREE.BoxGeometry(0.4, 0.04, 0.05).rotateY(-a).translate(c * 0.53, 0, s * 0.53), IMP.dark);
    // sensor head: box on the ring with a lens cylinder pointing outward
    add(new THREE.BoxGeometry(0.14, 0.18, 0.12).rotateY(-a).translate(c * 0.72, 0.02, s * 0.72), IMP.dark);
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 10).rotateZ(Math.PI / 2).rotateY(-a).translate(c * 0.82, 0.02, s * 0.82), IMP.hullLight);
  }
  add(new THREE.BoxGeometry(0.08, 0.22, 0.08).translate(0.53, -0.14, 0), IMP.mid);
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

// Every visible emitter in this room is the capped emitWhite stand-in (1.35: under the ACES + bloom clip threshold
// of ~1.7). emitCoolSoft (2.4, centre-bright map) clipped to white with a halo from every camera.
const EMIT = "emitWhite";

/**
 * Surface-mounted recessed downlight can hanging under a face at yFace: black four-wall recess, emitter set
 * `depth` up inside it so the lips hide the source beyond ~6 m, louvre fins across the mouth, grey trim.
 * The room light that "comes from" it sits inside the body above (never in the recess), so nothing here faces
 * a source at close range. The emitter is 0.16 m square (half the old 0.22 m area).
 */
export function recessedDownlight(kit, x, yFace, z, { size = 0.4, depth = 0.14 } = {}) {
  ring4(kit, "paintedMetal", x, z, yFace - depth, yFace, size, size, 0.02, { color: IMP.black, texel: 2 });
  ring4(kit, "metalRough", x, z, yFace - depth - 0.01, yFace - depth + 0.03, size + 0.08, size + 0.08, 0.05, { color: IMP.mid, texel: 2 });
  kit.box(EMIT, x, yFace - 0.035, z, (size - 0.2) * 0.72, 0.012, (size - 0.2) * 0.72, { uv: "keep" });
  for (const d of [-0.25, 0, 0.25]) kit.box("paintedMetal", x + d * size, yFace - depth + 0.03, z, 0.012, 0.025, size - 0.05, { color: IMP.black });
}

/**
 * Round recessed downlight can in the ceiling (face at ceilY): dark can, grey bezel ring, black throat, a small
 * centre-bright diffuser 5 mm inside the mouth and a cross louvre. Built for a downward spot whose descriptor sits
 * at the mouth (ceilY - 0.2): everything of the can is above the cone, so the fixture stays a dark shape.
 */
export function canDownlight(kit, x, ceilY, z, { r = 0.1 } = {}) {
  kit.cyl("metalRough", x, ceilY - 0.08, z, r + 0.1, 0.16, "y", { color: IMP.dark, segments: 16, texel: 1 });
  kit.add("metal", new THREE.RingGeometry(r + 0.03, r + 0.1, 16), { pos: [x, ceilY - 0.162, z], rot: [Math.PI / 2, 0, 0], color: IMP.mid, uv: "keep" });
  kit.add("paintedMetal", new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.004, 16), { pos: [x, ceilY - 0.164, z], color: IMP.black, uv: "keep" });
  kit.add(EMIT, new THREE.CylinderGeometry((r - 0.02) * 0.7, (r - 0.02) * 0.7, 0.004, 16), { pos: [x, ceilY - 0.169, z], uv: "keep" });
  kit.box("paintedMetal", x, ceilY - 0.175, z, r * 2 + 0.04, 0.008, 0.014, { color: IMP.black });
  kit.box("paintedMetal", x, ceilY - 0.175, z, 0.014, 0.008, r * 2 + 0.04, { color: IMP.black });
}

/**
 * Track spot head aimed at `target`. `pos` is the light descriptor position = the can mouth, so the whole can
 * sits behind the (shadow-casting) light: stem from the ceiling to the can back, yoke, open can with its inner
 * wall, back cap and the emitter disc recessed 8 cm inside the mouth. pos must be ≥ 0.4 m below ceilY.
 */
export function spotHead(kit, pos, target, ceilY) {
  const p = new THREE.Vector3(...pos);
  const dir = new THREE.Vector3(...target).sub(p).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  const at = (d) => p.clone().addScaledVector(dir, d).toArray();
  const back = at(-0.3);
  kit.cyl("metal", back[0], (back[1] + ceilY) / 2, back[2], 0.022, ceilY - back[1], "y", { color: IMP.mid, segments: 8 });
  kit.box("paintedMetal", back[0], back[1] + 0.02, back[2], 0.08, 0.1, 0.08, { color: IMP.dark });
  const can = new THREE.CylinderGeometry(0.075, 0.09, 0.26, 14, 1, true);
  const canIn = insideOut(can.clone()); // clone before kit.add bakes the transform into `can`
  kit.add("paintedMetal", can, { pos: at(-0.14), quat: q, color: IMP.black, uv: "keep" });
  kit.add("metal", canIn, { pos: at(-0.14), quat: q, color: IMP.dark, uv: "keep" });
  kit.add("metal", new THREE.CylinderGeometry(0.075, 0.075, 0.02, 14), { pos: at(-0.27), quat: q, color: IMP.dark, uv: "keep" });
  kit.add(EMIT, new THREE.CylinderGeometry(0.042, 0.042, 0.01, 14), { pos: at(-0.09), quat: q, uv: "keep" });
}

/**
 * Linear aisle luminaire: a closed dark pendant channel hung `drop` below the ceiling from x0 to x1 at z, with a
 * louvred 2.2 m emitWhite strip under each light position, a driver box on top and pairs of hanger rods.
 * The point-light descriptors sit INSIDE the channel (y = ceilY - drop + 0.06): a convex closed housing cannot
 * face a source inside it, so the fixture stays dark while the light passes through to the aisle; nothing else
 * (lips, louvres, rods) is placed within 1.3 m of a source. Nothing may protrude below the underside near a
 * source either (no shadows: a lip 7 cm from a 10-intensity point renders white), so the "louvre" is drawn in
 * the emitter itself: eight 0.2 × 0.024 m cells with black bars between them — 35 % of the old 2.2 × 0.05 m tube's
 * area. Returns the descriptor y.
 */
export function linearLuminaire(kit, x0, x1, z, ceilY, lightXs, { drop = 1.25 } = {}) {
  const yb = ceilY - drop; // housing underside
  const yt = yb + 0.12; // housing top
  kit.boxMM("paintedMetal", [x0, yb, z - 0.15], [x1, yt, z + 0.15], { color: IMP.dark, texel: 1 });
  // end caps flush with the body (no lip below the underside)
  for (const xe of [x0, x1]) kit.boxMM("metal", [xe - 0.03, yb - 0.002, z - 0.152], [xe + 0.03, yt + 0.002, z + 0.152], { color: IMP.black, texel: 2 });
  for (const lx of lightXs) {
    // black diffuser frame flush with the underside; the louvred strip proud of it by 8 mm, centred on the source
    kit.boxMM("paintedMetal", [lx - 1.25, yb - 0.004, z - 0.07], [lx + 1.25, yb, z + 0.07], { color: IMP.black });
    for (let k = 0; k < 8; k++) {
      const cx0 = lx - 1.1 + 0.0375 + k * 0.275;
      kit.boxMM(EMIT, [cx0, yb - 0.012, z - 0.012], [cx0 + 0.2, yb - 0.002, z + 0.012], { uv: "keep" });
    }
    // driver box standing on the top face (its underside 1 mm above it, so no lit face is exposed) with a status LED
    kit.box("metalRough", lx, yt + 0.041, z, 0.4, 0.08, 0.2, { color: IMP.mid, texel: 2 });
    led(kit, "emitBlue", lx + 0.15, yt + 0.045, z + 0.1, "z", 1, 0.015);
    // hanger rod pairs 1.35 m either side of the source, cross bracket on the top face
    for (const rx of [lx - 1.35, lx + 1.35]) {
      for (const s of [-1, 1]) kit.cyl("metal", rx, (yt + 0.03 + ceilY) / 2, z + s * 0.11, 0.012, ceilY - yt - 0.03, "y", { color: IMP.mid, segments: 6 });
      kit.box("metal", rx, yt + 0.016, z, 0.08, 0.03, 0.32, { color: IMP.dark });
    }
  }
  // end hangers
  for (const rx of [x0 + 0.35, x1 - 0.35]) {
    for (const s of [-1, 1]) kit.cyl("metal", rx, (yt + 0.03 + ceilY) / 2, z + s * 0.11, 0.012, ceilY - yt - 0.03, "y", { color: IMP.mid, segments: 6 });
    kit.box("metal", rx, yt + 0.016, z, 0.08, 0.03, 0.32, { color: IMP.dark });
  }
  return yb + 0.06;
}

/**
 * Ceiling cable/light hub at (x, z): rectangular channel body hung from the ceiling with trim frames, corner
 * posts, seams, an access hatch, status LED rows, two readouts, gland plates on the z faces with cable bundles
 * dropping onto the four ladder trays (trayY), and a recessed downlight centred on the underside.
 * The room light sits inside the body (see hubLight): all outer faces turn away from it, the trim frames never
 * extend below the underside, and the recess walls are black, so the hub reads as a dark shape with a lit floor
 * below it. Returns the underside y.
 */
export function cableHub(kit, x, ceilY, z, { w = 2.6, d = 1.8, h = 0.7, trayXs = [-0.8, 0.8], trayY = null } = {}) {
  const yb = ceilY - h;
  kit.boxMM("paintedMetal", [x - w / 2, yb, z - d / 2], [x + w / 2, ceilY, z + d / 2], { color: IMP.dark, texel: 1 });
  ring4(kit, "metal", x, z, yb + 0.001, yb + 0.07, w + 0.06, d + 0.06, 0.06, { color: IMP.mid, texel: 2 });
  ring4(kit, "metal", x, z, ceilY - 0.06, ceilY, w + 0.04, d + 0.04, 0.05, { color: IMP.mid, texel: 2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box("metal", x + sx * (w / 2), yb + h / 2, z + sz * (d / 2), 0.09, h, 0.09, { color: IMP.grey, texel: 2 });
  // panel seams on the long faces, hatch + bolts on the underside
  for (let k = -1; k <= 1; k++)
    for (const sz of [-1, 1]) kit.box("metal", x + k * 0.85, yb + h / 2, z + sz * (d / 2 + 0.002), 0.02, h - 0.1, 0.006, { color: IMP.black });
  kit.boxMM("paintedMetal", [x - 1.05, yb - 0.012, z - 0.35], [x - 0.3, yb, z + 0.35], { color: IMP.black, texel: 2 });
  for (const hx of [x - 1.0, x - 0.35]) for (const hz of [z - 0.3, z + 0.3]) kit.box("metal", hx, yb - 0.018, hz, 0.04, 0.012, 0.04, { color: IMP.steel });
  {
    const g = new THREE.PlaneGeometry(0.26, 0.26);
    g.rotateX(Math.PI / 2);
    kit.add("decal", g, { pos: [x - 0.675, yb - 0.016, z], uv: "keep", uvRect: decalRect(9) });
  }
  // status LED rows on the x faces, readouts on the z faces
  const rand = rng(9200);
  for (const sx of [-1, 1]) for (let k = 0; k < 8; k++) led(kit, pick(rand, LED_MATS), x + sx * (w / 2), yb + 0.14, z - 0.42 + k * 0.12, "x", sx, 0.025, 0.01);
  for (const sz of [-1, 1]) {
    const zf = z + sz * (d / 2);
    const [za, zb] = sz > 0 ? [zf, zf + 0.006] : [zf - 0.006, zf];
    kit.boxMM("commsUI", [x - 0.2, yb + 0.12, za], [x + 0.2, yb + 0.32, zb], { uv: "keep", uvRect: uvRect(sz > 0 ? UI.readout5 : UI.readout7) });
    // gland plates where the ladder-tray bundles leave, bundles dropping onto the tray below
    for (const tx of trayXs) {
      const [ga, gb] = sz > 0 ? [zf, zf + 0.05] : [zf - 0.05, zf];
      kit.boxMM("metal", [x + tx - 0.3, yb + 0.05, ga], [x + tx + 0.3, yb + 0.3, gb], { color: IMP.black, texel: 2 });
      for (let k = 0; k < 4; k++) {
        const gx = x + tx - 0.18 + k * 0.12;
        kit.cyl("metal", gx, yb + 0.16, zf + sz * 0.055, 0.03, 0.01, "z", { color: IMP.grey, segments: 8 });
        if (trayY !== null) cable(kit, "paintedMetal", [gx, yb + 0.16, zf + sz * 0.06], [gx + (k - 1.5) * 0.02, trayY + 0.05, zf + sz * 0.5], 0.014, { color: CABLE_COLS[k], sag: -0.06, pieces: 4 });
      }
    }
  }
  recessedDownlight(kit, x, yb, z, { size: 0.42 });
  return yb;
}

/**
 * Descriptor position for the hub's room light: inside the body, 0.12 m under the ceiling, over the downlight.
 * The ceiling directly above is hidden by the hub from every eye height, but the ceiling just outside the hub's
 * footprint is not: at 1–2.5 m from the source its irradiance scales with the source's depth below the ceiling
 * (E ≈ I·h/r³), so 0.28 m gave a clipped specular streak on the ceiling in front of the hub (racks camera) and
 * 0.12 m gives less than half of it.
 */
export function hubLight(x, ceilY, z) {
  return [x, ceilY - 0.12, z];
}

/**
 * Blue wall-wash spot for the signal wall: sits in the cavity of the centre hood (see signalWall) and points
 * straight down, so the wall is lit from ~3.9 m downward, the floor along the plinth gets a pool, and the
 * ceiling / hood / upper wall stay outside the cone.
 */
export function washSpot(xw, y0, ceilY, zc) {
  return { pos: [xw + 0.72, ceilY - 0.25, zc], target: [xw + 0.72, y0, zc] };
}

const DAIS = new THREE.Color("#3f434a"); // a step lighter than the IMP.dark deck, far from the old light-grey slab

/**
 * Supervisor dais: a raised deck plate (dark impFloor, split into plates by seam grooves) on a recessed black kick
 * with a steel nosing all round; the room side (+x) carries a blue toe strip, the painted step line, a small
 * readout in a bezel with two LEDs and a "MIND THE GAP" stencil, so the step reads as equipment, not a bare slab.
 */
export function dais(kit, x0, x1, y0, z0, z1) {
  const top = y0 + 0.15;
  const xm = (x0 + x1) / 2;
  const zm = (z0 + z1) / 2;
  kit.boxMM("paintedMetal", [x0 + 0.03, y0, z0 + 0.03], [x1 - 0.03, top - 0.03, z1 - 0.03], { color: IMP.black, texel: 1 });
  kit.boxMM("impFloor", [x0, top - 0.03, z0], [x1, top, z1], { color: DAIS, texel: 1 });
  ring4(kit, "metal", xm, zm, top - 0.032, top + 0.005, x1 - x0 + 0.004, z1 - z0 + 0.004, 0.05, { color: IMP.steel, texel: 2 });
  // seam grooves: three plates across z, two along x
  for (let z = z0 + 0.8; z < z1 - 0.4; z += 0.8) kit.boxMM("paintedMetal", [x0 + 0.05, top - 0.002, z - 0.006], [x1 - 0.05, top + 0.002, z + 0.006], { color: IMP.black });
  kit.boxMM("paintedMetal", [xm - 0.006, top - 0.002, z0 + 0.05], [xm + 0.006, top + 0.002, z1 - 0.05], { color: IMP.black });
  // room-side riser: toe strip in the kick recess, painted step line, readout bezel + LEDs, stencil
  kit.boxMM("emitBlue", [x1 - 0.03, y0 + 0.03, z0 + 0.35], [x1 - 0.024, y0 + 0.042, z1 - 0.35]);
  kit.boxMM("paintedMetal", [x1 - 0.03, y0 + 0.06, z0 + 0.2], [x1 - 0.024, y0 + 0.085, z1 - 0.2], { color: PAINT });
  kit.boxMM("paintedMetal", [x1 - 0.03, y0 + 0.04, zm + 0.5], [x1 + 0.004, y0 + 0.11, zm + 0.86], { color: IMP.dark, texel: 2 });
  kit.boxMM("commsUI", [x1 + 0.004, y0 + 0.05, zm + 0.53], [x1 + 0.008, y0 + 0.1, zm + 0.77], { uv: "keep", uvRect: uvRect(UI.readout6) });
  led(kit, "emitAmber", x1 + 0.004, y0 + 0.09, zm + 0.82, "x", 1, 0.016);
  led(kit, "emitBlue", x1 + 0.004, y0 + 0.06, zm + 0.82, "x", 1, 0.016);
  {
    const g = new THREE.PlaneGeometry(0.09, 0.09);
    g.rotateY(Math.PI / 2);
    kit.add("decal", g, { pos: [x1 - 0.029, y0 + 0.065, zm - 0.7], uv: "keep", uvRect: decalRect(15) });
  }
  kit.collider([x0, y0, z0], [x1, y0 + 0.15, z1], "dais");
}

// Floor inlay strip (dark deck plate with painted edge lines) along x or z. impFloor, not paintedMetal: the chip
// map on the 2.4 × 9 m aisle plate read as dark blotching from the racks camera.
export function walkway(kit, y0, x0, x1, z0, z1, { alongX = true } = {}) {
  kit.boxMM("impFloor", [x0, y0, z0], [x1, y0 + 0.012, z1], { color: IMP.black, texel: 1 });
  if (alongX) {
    kit.boxMM("paintedMetal", [x0 + 0.2, y0 + 0.012, z0 + 0.02], [x1 - 0.2, y0 + 0.017, z0 + 0.06], { color: PAINT });
    kit.boxMM("paintedMetal", [x0 + 0.2, y0 + 0.012, z1 - 0.06], [x1 - 0.2, y0 + 0.017, z1 - 0.02], { color: PAINT });
  } else {
    kit.boxMM("paintedMetal", [x0 + 0.02, y0 + 0.012, z0 + 0.2], [x0 + 0.06, y0 + 0.017, z1 - 0.2], { color: PAINT });
    kit.boxMM("paintedMetal", [x1 - 0.06, y0 + 0.012, z0 + 0.2], [x1 - 0.02, y0 + 0.017, z1 - 0.2], { color: PAINT });
  }
}

// Raised cable cover strip on the floor between two points along z (or x)
export function cableCover(kit, y0, a, b, c, { alongX = false } = {}) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (alongX) {
    kit.boxMM("metalRough", [lo, y0, c - 0.15], [hi, y0 + 0.035, c + 0.15], { color: IMP.mid, texel: 2 });
    kit.boxMM("hazard", [lo, y0 + 0.035, c - 0.15], [lo + 0.12, y0 + 0.04, c + 0.15], { texel: 3 });
    kit.boxMM("hazard", [hi - 0.12, y0 + 0.035, c - 0.15], [hi, y0 + 0.04, c + 0.15], { texel: 3 });
  } else {
    kit.boxMM("metalRough", [c - 0.15, y0, lo], [c + 0.15, y0 + 0.035, hi], { color: IMP.mid, texel: 2 });
    kit.boxMM("hazard", [c - 0.15, y0 + 0.035, lo], [c + 0.15, y0 + 0.04, lo + 0.12], { texel: 3 });
    kit.boxMM("hazard", [c - 0.15, y0 + 0.035, hi - 0.12], [c + 0.15, y0 + 0.04, hi], { texel: 3 });
  }
}
