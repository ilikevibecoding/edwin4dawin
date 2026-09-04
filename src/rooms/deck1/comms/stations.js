// Comms operator stations: desk with plinth, tilted twin-screen housing, key plate, indicator clusters, readouts,
// headset hook, footrest, cable drops and an operator chair. Built in a Local frame (facing in quarter turns).
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { IMP } from "../shared/palette.js";
import { Local, cable, pick } from "./lib.js";
import { UI, uvRect } from "./ui.js";

const LED_MATS = ["emitBlue", "emitBlue", "emitBlue", "emitAmber", "emitAmber", "emitRedImp"];

// Operator chair centred at (cx, cy, cz), backrest on the +w side (operator faces -w).
export function chair(kit, cx, cy, cz, facing = 0) {
  const L = new Local(kit, cx, cy, cz, facing);
  L.cyl("metal", 0, 0.02, 0, 0.27, 0.04, "v", { color: IMP.dark, segments: 12, texel: 1 });
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    L.box("metal", Math.cos(a) * 0.16, 0.035, Math.sin(a) * 0.16, 0.24, 0.03, 0.05, { color: IMP.dark, yaw: -a, texel: 1 });
  }
  L.cyl("metal", 0, 0.27, 0, 0.035, 0.42, "v", { color: IMP.mid, segments: 10 });
  L.box("paintedMetal", 0, 0.48, 0, 0.5, 0.07, 0.5, { color: IMP.dark, texel: 1 });
  L.box("paintedMetal", 0, 0.525, 0.02, 0.44, 0.03, 0.44, { color: IMP.black, texel: 1 });
  L.box("paintedMetal", 0, 0.84, 0.25, 0.48, 0.6, 0.06, { color: IMP.dark, texel: 1 });
  L.box("paintedMetal", 0, 0.84, 0.215, 0.36, 0.42, 0.02, { color: IMP.black, texel: 1 });
  L.box("metal", 0, 0.62, 0.22, 0.4, 0.02, 0.02, { color: IMP.mid });
  for (const s of [-1, 1]) {
    L.box("metal", s * 0.27, 0.7, 0.02, 0.04, 0.03, 0.36, { color: IMP.mid });
    L.box("metal", s * 0.27, 0.6, 0.12, 0.03, 0.2, 0.03, { color: IMP.dark });
  }
  L.collider(-0.28, 0.28, 0, 1.15, -0.28, 0.3, "chair");
}

/**
 * Operator station. w = desk width. screens = [atlas cell names]. seed for indicator variation.
 * The operator sits at +w; the station faces -w (toward the signal wall when facing = 1).
 */
export function station(kit, cx, cy, cz, { w = 2.0, facing = 1, screens = ["console0", "console1"], readout = "readout0", seed = 1, headset = true, chairOffset = 0.62 } = {}) {
  const rand = rng(seed);
  const L = new Local(kit, cx, cy, cz, facing);
  const d = 0.85;
  // plinth, toe recess with blue toe strip
  L.box("paintedMetal", 0, 0.42, -0.04, w - 0.12, 0.84, d - 0.16, { color: IMP.black, texel: 1 });
  L.box("emitBlue", 0, 0.11, d / 2 - 0.09, w - 0.6, 0.012, 0.01);
  // desk top and lip
  L.box("darkGloss", 0, 0.9, 0, w, 0.06, d);
  L.box("metal", 0, 0.87, d / 2 - 0.005, w, 0.03, 0.02, { color: IMP.mid, texel: 2 });
  L.box("metal", -w / 2 + 0.005, 0.87, 0, 0.02, 0.03, d, { color: IMP.mid, texel: 2 });
  L.box("metal", w / 2 - 0.005, 0.87, 0, 0.02, 0.03, d, { color: IMP.mid, texel: 2 });
  // desk surface: key plate, indicator cluster, readout, toggles
  L.box("commsUI", -0.05, 0.937, 0.16, 0.62, 0.014, 0.17, { uv: "keep", uvRect: uvRect(UI.keys) });
  L.box("paintedMetal", -0.05, 0.935, 0.16, 0.66, 0.01, 0.21, { color: IMP.black, texel: 2 });
  {
    const u0 = -w / 2 + 0.16;
    L.box("darkGloss", u0 + 0.16, 0.934, 0.14, 0.4, 0.008, 0.22);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 7; c++) {
        if (rand() < 0.2) continue;
        L.box(pick(rand, LED_MATS), u0 + 0.02 + c * 0.05, 0.942, 0.06 + r * 0.07, 0.025, 0.008, 0.025);
      }
    for (let c = 0; c < 4; c++) L.box("metal", u0 + 0.03 + c * 0.08, 0.955, 0.3, 0.03, 0.03, 0.02, { color: IMP.mid });
  }
  {
    const u1 = w / 2 - 0.16;
    L.box("paintedMetal", u1 - 0.27, 0.934, 0.14, 0.5, 0.008, 0.24, { color: IMP.dark, texel: 2 });
    L.box("commsUI", u1 - 0.27, 0.94, 0.14, 0.44, 0.008, 0.2, { uv: "keep", uvRect: uvRect(UI[readout]) });
    for (let c = 0; c < 3; c++) L.box(pick(rand, LED_MATS), u1 - 0.1 + c * 0.05, 0.942, 0.32, 0.025, 0.008, 0.025);
  }
  // tilted display housing on the far edge of the desk
  const hv = 1.14; // housing centre height
  const hw = -d / 2 + 0.14; // housing centre w
  const tilt = -0.14;
  const rot = (dv, dw) => [hv + dv * Math.cos(tilt) - dw * Math.sin(tilt), hw + dv * Math.sin(tilt) + dw * Math.cos(tilt)];
  const hbox = (mat, u, dv, dw, su, sv, sw, opts = {}) => {
    const [v, ww] = rot(dv, dw);
    L.box(mat, u, v, ww, su, sv, sw, { tilt, ...opts });
  };
  hbox("paintedMetal", 0, 0, 0, w - 0.1, 0.46, 0.2, { color: IMP.dark, texel: 1 });
  hbox("metal", 0, 0.235, 0, w - 0.08, 0.02, 0.22, { color: IMP.mid, texel: 2 });
  const sw = (w - 0.3) / screens.length;
  screens.forEach((cell, i) => {
    const u = -((screens.length - 1) / 2) * sw + i * sw;
    hbox("darkGloss", u, 0.01, 0.102, sw - 0.06, 0.36, 0.006);
    hbox("commsUI", u, 0.01, 0.106, sw - 0.1, 0.3, 0.004, { uv: "keep", uvRect: uvRect(UI[cell]) });
  });
  // LED row along the housing foot and side indicators
  for (let k = 0; k < 8; k++) hbox(pick(rand, LED_MATS), -w / 2 + 0.2 + k * ((w - 0.4) / 7), -0.2, 0.104, 0.03, 0.02, 0.006);
  hbox("emitAmber", -w / 2 + 0.06, 0.1, 0.104, 0.012, 0.16, 0.006);
  hbox("emitBlue", w / 2 - 0.06, 0.1, 0.104, 0.012, 0.16, 0.006);
  // back of the housing and the plinth (what the room sees from the signal wall): vent slats, spec plate, service
  // LEDs, a recessed access panel with latches, a vent grille and the cable gland strip the floor cables leave from
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) hbox("metal", s * (w / 2 - 0.35), -0.12 + k * 0.04, -0.104, 0.4, 0.008, 0.006, { color: IMP.black });
  hbox("commsUI", 0, 0.1, -0.104, 0.36, 0.09, 0.006, { uv: "keep", uvRect: uvRect(UI.sign0), yaw: Math.PI });
  hbox("emitAmber", -0.26, 0.1, -0.104, 0.02, 0.02, 0.006);
  hbox("emitBlue", 0.26, 0.1, -0.104, 0.02, 0.02, 0.006);
  const wb = -(d - 0.16) / 2 - 0.04;
  L.box("paintedMetal", -0.2, 0.5, wb - 0.006, w - 0.7, 0.5, 0.012, { color: IMP.dark, texel: 2 });
  for (const s of [-1, 1]) L.box("metal", -0.2 + s * ((w - 0.7) / 2 - 0.08), 0.5, wb - 0.02, 0.05, 0.12, 0.02, { color: IMP.mid });
  for (let k = 0; k < 5; k++) L.box("metal", w / 2 - 0.35, 0.3 + k * 0.05, wb - 0.008, 0.3, 0.012, 0.006, { color: IMP.black });
  L.box("paintedMetal", 0, 0.24, wb - 0.03, 0.9, 0.12, 0.06, { color: IMP.black, texel: 2 });
  L.box("emitAmber", -0.38, 0.24, wb - 0.062, 0.02, 0.02, 0.006);
  // headset on a hook off the right side of the housing
  if (headset) {
    const hu = w / 2 - 0.02;
    L.box("metal", hu, 1.3, hw + 0.1, 0.03, 0.03, 0.14, { color: IMP.mid });
    L.box("metal", hu, 1.27, hw + 0.19, 0.03, 0.09, 0.03, { color: IMP.mid });
    L.add("paintedMetal", new THREE.TorusGeometry(0.095, 0.011, 6, 16, Math.PI), hu + 0.01, 1.2, hw + 0.19, { color: IMP.black, roll: 0 });
    L.cyl("paintedMetal", hu + 0.01 - 0.095, 1.2, hw + 0.19, 0.038, 0.03, "u", { color: IMP.dark, segments: 10 });
    L.cyl("paintedMetal", hu + 0.01 + 0.095, 1.2, hw + 0.19, 0.038, 0.03, "u", { color: IMP.dark, segments: 10 });
    cable(kit, "paintedMetal", L.pos(hu + 0.1, 1.17, hw + 0.19), L.pos(hu + 0.16, 0.93, 0.05), 0.005, { color: IMP.black, sag: 0.05, pieces: 3 });
  }
  // footrest bar + brackets
  L.cyl("metal", 0, 0.14, d / 2 + 0.36, 0.02, w - 0.6, "u", { color: IMP.mid, segments: 8 });
  for (const s of [-1, 1]) L.box("paintedMetal", s * (w / 2 - 0.3), 0.14, d / 2 + 0.18, 0.04, 0.04, 0.38, { color: IMP.dark });
  // cable drops from the back of the plinth to the floor
  for (let k = 0; k < 3; k++) {
    const u = -0.25 + k * 0.25;
    cable(kit, "paintedMetal", L.pos(u, 0.3, -d / 2 + 0.05), L.pos(u + (rand() - 0.5) * 0.2, 0.02, -d / 2 - 0.3), 0.012, { color: k === 1 ? IMP.blue : IMP.black, sag: 0.06, pieces: 3 });
  }
  L.collider(-w / 2 - 0.05, w / 2 + 0.05, 0, 1.4, -d / 2 - 0.05, d / 2 + 0.05, "station");
  chair(kit, ...L.pos(0, 0, d / 2 + chairOffset), facing);
}
