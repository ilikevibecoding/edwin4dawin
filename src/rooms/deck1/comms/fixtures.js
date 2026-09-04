// Comms fixtures: signal wall array (west), east-wall dressing around the door, sensor pedestals, ceiling sensor
// dome, supervisor dais, floor inlays. World-space; the room is x -44..-23.6, z 490..508, floor 240.
import * as THREE from "three";
import { rng, setVertexColor, insideOut } from "../../../kit.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { decalRect } from "../../../textures.js";
import { IMP } from "../shared/palette.js";
import { cable, led, pick } from "./lib.js";
import { UI, uvRect } from "./ui.js";

const LED_MATS = ["emitBlue", "emitBlue", "emitBlue", "emitAmber", "emitAmber", "emitRedImp"];

// Small screen box on a wall facing +x (xFace = wall plane, screen proud by `t`)
function screenX(kit, mat, xFace, y0, y1, z0, z1, rect, t = 0.008) {
  kit.boxMM(mat, [xFace, y0, z0], [xFace + t, y1, z1], { uv: "keep", uvRect: rect });
}

/**
 * Signal wall on the west wall (face at xw, running along z, centred on zc).
 * Main animated display flanked by two status columns and two system-map panels; header conduit above,
 * plinth below, floor inlay in front.
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
    // conduit from the header down to the panel
    kit.cyl("metal", xw + 0.15, H(3.55), zcM, 0.035, 0.5, "y", { color: IMP.steel, segments: 8 });
  }
  // --- header conduit + drop conduits + three angled downlight housings
  kit.boxMM("metalRough", [xw, H(3.62), zc - 6.8], [xw + 0.42, H(3.9), zc + 6.8], { color: IMP.mid, texel: 1 });
  for (const zz of [zc - 6.5, zc - 3.2, zc, zc + 3.2, zc + 6.5]) kit.boxMM("metal", [xw, H(3.6), zz - 0.03], [xw + 0.45, H(3.92), zz + 0.03], { color: IMP.dark, texel: 2 });
  for (const zz of [zc - 3.7, zc, zc + 3.7]) {
    kit.cyl("metal", xw + 0.2, H(3.56), zz, 0.04, 0.12, "y", { color: IMP.steel, segments: 8 });
    kit.box("metalRough", xw + 0.75, ceilY - 0.09, zz, 0.36, 0.18, 0.5, { color: IMP.mid, texel: 2 });
    kit.box("emitWhite", xw + 0.7, ceilY - 0.185, zz, 0.16, 0.012, 0.4);
  }
  // --- floor inlay with a blue edge line and cable cover to the header (through the plinth)
  kit.boxMM("paintedMetal", [xw + 0.47, H(0), zc - 6.8], [xw + 1.3, H(0.012), zc + 6.8], { color: IMP.black, texel: 1 });
  kit.boxMM("emitBlue", [xw + 1.3, H(0), zc - 6.6], [xw + 1.33, H(0.01), zc + 6.6]);
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
 * Sensor pedestal at (x, z): base with hazard band, ribbed column with a control screen facing +x, bearing ring
 * with a blue light ring; the dish itself is an instanced mesh (see dishGeometry). Returns the bearing top y.
 */
export function pedestal(kit, x, y0, z, idx) {
  const rand = rng(9100 + idx);
  kit.cyl("paintedMetal", x, y0 + 0.006, z, 1.15, 0.012, "y", { color: IMP.black, segments: 24, texel: 1 });
  kit.add("emitBlue", new THREE.TorusGeometry(1.12, 0.012, 6, 40), { pos: [x, y0 + 0.012, z], rot: [Math.PI / 2, 0, 0] });
  kit.cyl("metalRough", x, y0 + 0.11, z, 0.8, 0.22, "y", { color: IMP.mid, segments: 12, texel: 1 });
  kit.cyl("hazard", x, y0 + 0.2, z, 0.805, 0.06, "y", { segments: 12, texel: 3 });
  kit.cyl("paintedMetal", x, y0 + 0.72, z, 0.33, 1.0, "y", { color: IMP.dark, segments: 16, texel: 1 });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    kit.add("metal", new THREE.BoxGeometry(0.06, 0.94, 0.1), { pos: [x + Math.cos(a) * 0.34, y0 + 0.72, z + Math.sin(a) * 0.34], rot: [0, -a, 0], color: IMP.mid, texel: 2 });
  }
  // control panel facing +x
  kit.boxMM("paintedMetal", [x + 0.3, y0 + 0.9, z - 0.24], [x + 0.46, y0 + 1.18, z + 0.24], { color: IMP.dark, texel: 1 });
  kit.boxMM("commsUI", [x + 0.46, y0 + 1.0, z - 0.2], [x + 0.468, y0 + 1.16, z + 0.2], { uv: "keep", uvRect: uvRect(UI["sensor" + (idx % 2)]) });
  for (let k = 0; k < 5; k++) led(kit, pick(rand, LED_MATS), x + 0.46, y0 + 0.95, z - 0.16 + k * 0.08, "x", 1, 0.025);
  kit.add("commsUI", new THREE.BoxGeometry(0.44, 0.006, 0.08), { pos: [x + 0.38, y0 + 1.183, z], rot: [0, Math.PI / 2, 0], uv: "keep", uvRect: uvRect(UI.sign1) });
  // bearing + blue ring
  kit.cyl("metal", x, y0 + 1.25, z, 0.37, 0.06, "y", { color: IMP.steel, segments: 20, texel: 1 });
  kit.add("emitBlue", new THREE.TorusGeometry(0.345, 0.012, 6, 32), { pos: [x, y0 + 1.285, z], rot: [Math.PI / 2, 0, 0] });
  kit.cyl("paintedMetal", x, y0 + 1.3, z, 0.3, 0.04, "y", { color: IMP.black, segments: 16 });
  // cables from the column foot to the floor inlay ring
  for (let k = 0; k < 3; k++) {
    const a = Math.PI + (k - 1) * 0.5;
    cable(kit, "paintedMetal", [x + Math.cos(a) * 0.3, y0 + 0.3, z + Math.sin(a) * 0.3], [x + Math.cos(a) * 1.0, y0 + 0.03, z + Math.sin(a) * 1.0], 0.012, { color: k === 1 ? IMP.blue : IMP.black, sag: 0.05, pieces: 3 });
  }
  kit.collider([x - 0.82, y0, z - 0.82], [x + 0.82, y0 + 1.5, z + 0.82], "pedestal");
  return y0 + 1.32;
}

// Merged dish assembly geometry (origin at the bearing top, +y up, dish looking toward -z and up 35°) with vertex colours for `metal`.
export function dishGeometry() {
  const parts = [];
  const add = (g, color) => {
    if (g.index) g = g.toNonIndexed();
    setVertexColor(g, color);
    parts.push(g);
  };
  // yoke post + arm + axle
  add(new THREE.BoxGeometry(0.12, 0.56, 0.12).translate(0, 0.28, 0), IMP.dark);
  add(new THREE.BoxGeometry(0.16, 0.06, 0.5).translate(0, 0.58, -0.05), IMP.dark);
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 10).rotateZ(Math.PI / 2).translate(0, 0.66, -0.1), IMP.steel);
  // dish: open cone, both sides, axis toward -z tilted up 35°; centre C
  const tilt = 0.61;
  const C = [0, 0.68, -0.22];
  const along = (d) => [0, Math.sin(tilt) * d, -Math.cos(tilt) * d]; // d metres along the dish axis (forward = +d)
  const place = (g, d = 0) => {
    const o = along(d);
    return g.rotateX(tilt).translate(C[0] + o[0], C[1] + o[1], C[2] + o[2]);
  };
  const dish = new THREE.CylinderGeometry(0.55, 0.14, 0.22, 22, 1, true);
  dish.rotateX(-Math.PI / 2); // cylinder axis y → -z (wide end toward -z)
  const dishIn = insideOut(dish.clone());
  add(place(dish), IMP.steel);
  add(place(dishIn), IMP.hullLight);
  // hub behind the dish, feed horn + feed box in front, counterweight rod + block behind the axle
  add(place(new THREE.CylinderGeometry(0.11, 0.09, 0.2, 12).rotateX(-Math.PI / 2), -0.18), IMP.dark);
  add(place(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6).rotateX(-Math.PI / 2), 0.28), IMP.mid);
  add(place(new THREE.BoxGeometry(0.08, 0.08, 0.08), 0.53), IMP.dark);
  add(new THREE.BoxGeometry(0.14, 0.14, 0.26).translate(0, 0.66, 0.3), IMP.dark);
  add(new THREE.BoxGeometry(0.04, 0.04, 0.3).translate(0, 0.66, 0.1), IMP.mid);
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Ceiling sensor dome at (x, z): hanging housing with a rim ring of indicators and a dark lens hemisphere.
 */
export function sensorDome(kit, x, ceilY, z) {
  kit.cyl("paintedMetal", x, ceilY - 0.2, z, 1.3, 0.4, "y", { color: IMP.dark, segments: 28, texel: 1 });
  kit.cyl("metal", x, ceilY - 0.42, z, 1.34, 0.05, "y", { color: IMP.mid, segments: 28, texel: 1 });
  kit.cyl("metal", x, ceilY - 0.02, z, 1.36, 0.04, "y", { color: IMP.mid, segments: 28, texel: 1 });
  // vertical ribs on the housing
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    kit.add("metal", new THREE.BoxGeometry(0.06, 0.36, 0.08), { pos: [x + Math.cos(a) * 1.31, ceilY - 0.2, z + Math.sin(a) * 1.31], rot: [0, -a, 0], color: IMP.mid, texel: 2 });
  }
  // indicator ring under the rim
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    const m = k % 5 === 0 ? "emitAmber" : "emitBlue";
    kit.add(m, new THREE.BoxGeometry(0.1, 0.03, 0.06), { pos: [x + Math.cos(a) * 1.1, ceilY - 0.455, z + Math.sin(a) * 1.1], rot: [0, -a, 0] });
  }
  // lens: lower hemisphere in dark gloss + a steel collar
  const dome = new THREE.SphereGeometry(0.85, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  kit.add("darkGloss", dome, { pos: [x, ceilY - 0.44, z], uv: "keep" });
  kit.cyl("metal", x, ceilY - 0.45, z, 0.88, 0.05, "y", { color: IMP.steel, segments: 24, texel: 1 });
  // four antenna stubs
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    kit.cyl("metal", x + Math.cos(a) * 1.0, ceilY - 0.62, z + Math.sin(a) * 1.0, 0.025, 0.3, "y", { color: IMP.steel, segments: 6 });
  }
}

/**
 * Supervisor dais: raised platform with a nosing, step light and a rail on the aft side.
 */
export function dais(kit, x0, x1, y0, z0, z1) {
  kit.boxMM("impFloor", [x0, y0, z0 + 0.02], [x1 - 0.03, y0 + 0.15, z1 - 0.02], { color: IMP.mid, texel: 1 });
  kit.boxMM("metal", [x1 - 0.06, y0 + 0.15, z0], [x1, y0 + 0.16, z1], { color: IMP.steel, texel: 2 });
  kit.boxMM("paintedMetal", [x1 - 0.03, y0, z0], [x1, y0 + 0.148, z1], { color: IMP.black, texel: 1 });
  kit.boxMM("emitBlue", [x1, y0 + 0.05, z0 + 0.2], [x1 + 0.008, y0 + 0.07, z1 - 0.2]);
  kit.boxMM("paintedMetal", [x0, y0, z0], [x1, y0 + 0.148, z0 + 0.02], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [x0, y0, z1 - 0.02], [x1, y0 + 0.148, z1], { color: IMP.black, texel: 1 });
  kit.collider([x0, y0, z0], [x1, y0 + 0.15, z1], "dais");
}

// Floor inlay strip (dark plate with raised blue edge lines) along x or z
export function walkway(kit, y0, x0, x1, z0, z1, { alongX = true } = {}) {
  kit.boxMM("paintedMetal", [x0, y0, z0], [x1, y0 + 0.012, z1], { color: IMP.black, texel: 1 });
  if (alongX) {
    kit.boxMM("emitBlue", [x0 + 0.2, y0 + 0.012, z0 + 0.02], [x1 - 0.2, y0 + 0.018, z0 + 0.05]);
    kit.boxMM("emitBlue", [x0 + 0.2, y0 + 0.012, z1 - 0.05], [x1 - 0.2, y0 + 0.018, z1 - 0.02]);
  } else {
    kit.boxMM("emitBlue", [x0 + 0.02, y0 + 0.012, z0 + 0.2], [x0 + 0.05, y0 + 0.018, z1 - 0.2]);
    kit.boxMM("emitBlue", [x1 - 0.05, y0 + 0.012, z0 + 0.2], [x1 - 0.02, y0 + 0.018, z1 - 0.2]);
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
