// Comms operator stations: desk with plinth, display housing in three kinds (twin flat screens / hooded single
// wide screen / three-screen wrap), recessed key tray with the key-grid texture, recessed button cluster with
// small LED dots, readout, headset hook, footrest, cable drops and an operator chair. Built in a Local frame.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { IMP } from "../shared/palette.js";
import { Local, cable, led, pick } from "./lib.js";
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

// Recessed button cluster: raised black bezel bars around a sunken gloss plate; dark caps sit below the bezel
// top and carry an 8 mm LED dot each (a quarter of the old 25 mm glowing cubes).
function buttonCluster(kit, L, rand, u0, u1, w0, w1, cols, rowsN) {
  const top = 0.946;
  const plate = 0.934;
  const uc = (u0 + u1) / 2;
  const wc = (w0 + w1) / 2;
  L.box("darkGloss", uc, plate - 0.004, wc, u1 - u0, 0.008, w1 - w0);
  for (const [a, b, c, d] of [[u0, u0 + 0.02, w0, w1], [u1 - 0.02, u1, w0, w1], [u0, u1, w0, w0 + 0.02], [u0, u1, w1 - 0.02, w1]])
    L.box("paintedMetal", (a + b) / 2, (top + 0.928) / 2, (c + d) / 2, b - a, top - 0.928, d - c, { color: IMP.black, texel: 2 });
  const pu = (u1 - u0 - 0.06) / cols;
  const pw = (w1 - w0 - 0.06) / rowsN;
  for (let r = 0; r < rowsN; r++)
    for (let c = 0; c < cols; c++) {
      if (rand() < 0.18) continue;
      const u = u0 + 0.03 + pu * (c + 0.5);
      const w = w0 + 0.03 + pw * (r + 0.5);
      L.box("paintedMetal", u, plate + 0.003, w, 0.02, 0.006, 0.02, { color: IMP.dark });
      const p = L.pos(u, plate + 0.006, w);
      led(kit, pick(rand, LED_MATS), p[0], p[1], p[2], "y", 1, 0.008, 0.003);
    }
}

// Recessed key tray: black frame bars 6 mm above a key-grid textured plate (4:1 atlas cell)
function keyTray(kit, L, uc, wc) {
  const kw = 0.64;
  const kd = 0.16;
  L.box("paintedMetal", uc, 0.933, wc, kw + 0.06, 0.006, kd + 0.06, { color: IMP.black, texel: 2 });
  L.box("commsUI", uc, 0.9375, wc, kw, 0.003, kd, { uv: "keep", uvRect: uvRect(UI.keys) });
  for (const [a, b, c, d] of [[-kw / 2 - 0.03, -kw / 2, -kd / 2 - 0.03, kd / 2 + 0.03], [kw / 2, kw / 2 + 0.03, -kd / 2 - 0.03, kd / 2 + 0.03], [-kw / 2, kw / 2, -kd / 2 - 0.03, -kd / 2], [-kw / 2, kw / 2, kd / 2, kd / 2 + 0.03]])
    L.box("paintedMetal", uc + (a + b) / 2, 0.939, wc + (c + d) / 2, b - a, 0.012, d - c, { color: IMP.black, texel: 2 });
  // wrist rest lip on the operator side
  L.box("metal", uc, 0.938, wc + kd / 2 + 0.05, kw + 0.06, 0.01, 0.03, { color: IMP.mid });
}

/**
 * Operator station. w = desk width. kind = "twin" (two flat screens) | "hooded" (one wide screen under a visor
 * hood) | "wrap" (centre screen + two wings angled 24° toward the operator). screens = atlas cell names
 * (twin: 2, hooded: 1 wide cell, wrap: 3). The operator sits at +w; the station faces -w.
 */
export function station(kit, cx, cy, cz, { w = 2.0, facing = 1, kind = "twin", screens = ["console0", "console1"], readout = "readout0", seed = 1, headset = true, chairOffset = 0.62 } = {}) {
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
  // desk surface: key tray, button cluster (left), readout + three buttons (right), toggles
  keyTray(kit, L, -0.05, 0.17);
  {
    const u0 = -w / 2 + 0.14;
    buttonCluster(kit, L, rand, u0, u0 + 0.4, 0.04, 0.26, 7, 3);
    for (let c = 0; c < 4; c++) L.box("metal", u0 + 0.06 + c * 0.09, 0.952, 0.34, 0.03, 0.03, 0.02, { color: IMP.mid });
  }
  {
    const u1 = w / 2 - 0.14;
    L.box("paintedMetal", u1 - 0.27, 0.934, 0.12, 0.5, 0.008, 0.2, { color: IMP.dark, texel: 2 });
    L.box("commsUI", u1 - 0.27, 0.94, 0.12, 0.44, 0.008, 0.16, { uv: "keep", uvRect: uvRect(UI[readout]) });
    buttonCluster(kit, L, rand, u1 - 0.34, u1 - 0.06, 0.26, 0.36, 4, 1);
  }
  // display housing on the far edge of the desk (tilted back 8°)
  const hv = 1.14; // housing centre height
  const hw = -d / 2 + 0.14; // housing centre w
  const tilt = -0.14;
  const rot = (dv, dw) => [hv + dv * Math.cos(tilt) - dw * Math.sin(tilt), hw + dv * Math.sin(tilt) + dw * Math.cos(tilt)];
  const hbox = (mat, u, dv, dw, su, sv, sw, opts = {}) => {
    const [v, ww] = rot(dv, dw);
    L.box(mat, u, v, ww, su, sv, sw, { tilt, ...opts });
  };
  if (kind === "wrap") {
    // centre segment + two wings hinged on its edges, angled toward the operator
    const cw = w * 0.46;
    const ww = w * 0.3;
    const a = 0.42;
    hbox("paintedMetal", 0, 0, 0, cw, 0.46, 0.2, { color: IMP.dark, texel: 1 });
    hbox("darkGloss", 0, 0.01, 0.102, cw - 0.08, 0.36, 0.006);
    hbox("commsUI", 0, 0.01, 0.106, cw - 0.12, 0.3, 0.004, { uv: "keep", uvRect: uvRect(UI[screens[1] || "console0"]) });
    for (const s of [-1, 1]) {
      // wing hinged on the centre segment's edge: tilt about its own width axis, then yaw about the hinge so the
      // outer end swings toward the operator (+w)
      const yaw = -s * a;
      const q = L.q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, 0, "YXZ")));
      const wbox = (mat, du, dv, dw, su, sv, sw, opts = {}) => {
        const vt = dv * Math.cos(tilt) - dw * Math.sin(tilt);
        const wt = dv * Math.sin(tilt) + dw * Math.cos(tilt);
        const r = ww / 2 + du;
        const u = s * (cw / 2) + s * (r * Math.cos(a) - wt * Math.sin(a));
        const wv = hw + r * Math.sin(a) + wt * Math.cos(a);
        L.add(mat, new THREE.BoxGeometry(su, sv, sw), u, hv + vt, wv, { quat: q, ...opts });
      };
      wbox("paintedMetal", 0, 0, 0, ww, 0.44, 0.2, { color: IMP.dark, texel: 1 });
      wbox("darkGloss", 0, 0.01, 0.102, ww - 0.08, 0.32, 0.006);
      wbox("commsUI", 0, 0.01, 0.106, ww - 0.12, 0.26, 0.004, { uv: "keep", uvRect: uvRect(UI[screens[s < 0 ? 0 : 2] || "console1"]) });
      wbox("metal", 0, 0.225, 0, ww + 0.02, 0.02, 0.22, { color: IMP.mid, texel: 2 });
    }
    hbox("metal", 0, 0.235, 0, cw + 0.02, 0.02, 0.22, { color: IMP.mid, texel: 2 });
    for (let k = 0; k < 6; k++) hbox(pick(rand, LED_MATS), -cw / 2 + 0.1 + k * ((cw - 0.2) / 5), -0.2, 0.104, 0.03, 0.02, 0.006);
  } else {
    hbox("paintedMetal", 0, 0, 0, w - 0.1, 0.46, 0.2, { color: IMP.dark, texel: 1 });
    hbox("metal", 0, 0.235, 0, w - 0.08, 0.02, 0.22, { color: IMP.mid, texel: 2 });
    if (kind === "hooded") {
      // one wide 4:1 screen under a visor hood with side cheeks
      const sw = w - 0.5;
      hbox("darkGloss", 0, 0.0, 0.102, sw + 0.06, 0.38, 0.006);
      hbox("commsUI", 0, 0.0, 0.106, sw, sw / 4, 0.004, { uv: "keep", uvRect: uvRect(UI[screens[0] || "wide0"]) });
      hbox("paintedMetal", 0, 0.25, 0.16, w - 0.06, 0.02, 0.34, { color: IMP.black, texel: 2 });
      for (const s of [-1, 1]) hbox("paintedMetal", s * (w / 2 - 0.04), 0.03, 0.16, 0.02, 0.44, 0.34, { color: IMP.black, texel: 2 });
      hbox("emitAmber", 0, 0.232, 0.3, 0.06, 0.008, 0.01);
    } else {
      const sw = (w - 0.3) / screens.length;
      screens.forEach((cell, i) => {
        const u = -((screens.length - 1) / 2) * sw + i * sw;
        hbox("darkGloss", u, 0.01, 0.102, sw - 0.06, 0.36, 0.006);
        hbox("commsUI", u, 0.01, 0.106, sw - 0.1, 0.3, 0.004, { uv: "keep", uvRect: uvRect(UI[cell]) });
      });
    }
    // LED row along the housing foot and side indicators
    for (let k = 0; k < 8; k++) hbox(pick(rand, LED_MATS), -w / 2 + 0.2 + k * ((w - 0.4) / 7), -0.2, 0.104, 0.03, 0.02, 0.006);
    hbox("emitAmber", -w / 2 + 0.06, 0.1, 0.104, 0.012, 0.16, 0.006);
    hbox("emitBlue", w / 2 - 0.06, 0.1, 0.104, 0.012, 0.16, 0.006);
  }
  // back of the housing and the plinth (what the room sees from the signal wall): vent slats, spec plate, service
  // LEDs, a recessed access panel with latches, a vent grille and the cable gland strip the floor cables leave from
  const bw = kind === "wrap" ? w * 0.46 : w - 0.1;
  if (bw > 1.4) for (const s of [-1, 1]) for (let k = 0; k < 6; k++) hbox("metal", s * (bw / 2 - 0.2), -0.12 + k * 0.04, -0.104, 0.4, 0.008, 0.006, { color: IMP.black });
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
  } else {
    // no headset: a clipboard rack and a mug on the desk edge instead
    L.box("metal", w / 2 - 0.2, 0.96, 0.3, 0.22, 0.05, 0.015, { color: IMP.mid });
    L.box("paintedMetal", w / 2 - 0.2, 1.0, 0.31, 0.2, 0.12, 0.006, { color: IMP.white, texel: 2 });
    L.cyl("paintedMetal", -w / 2 + 0.16, 0.975, 0.36, 0.04, 0.09, "v", { color: IMP.black, segments: 10 });
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
