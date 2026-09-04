// Intel props (Agent B / subagent 3): security lock (scanner arch, barrier line, gate frame, guard post),
// lockers / compartments / bench, data columns with scrolling text, analysis table + holo geometry, archive
// cabinets, surveillance monitor bank, consoles, evidence hatch, ceiling structure, floor guides, cameras and
// wall dressing. World-space kit-bashing, red only (COORDINATION.md §11).
// Room frame R: { y0, ceilY, xw, xe, zn, zs, cz, px, gate: { z0, z1, h } } (see index.js).
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { IMP } from "../shared/palette.js";
import { Local, cable, led, pick } from "./lib.js";
import { UI, uvRect } from "./ui.js";

const RED = "emitRedImp";
const OFF = "darkGloss"; // unlit indicator / dark lens

/**
 * Box proud of a wall face. axis = face normal axis ('x'|'z'), face = plane coordinate, sign = direction into
 * the room, a0..a1 = extent along the other horizontal axis, d0..d1 = depth range measured from the face.
 */
export function slab(kit, mat, axis, face, sign, a0, a1, y0, y1, d0, d1, opts = {}) {
  const f0 = Math.min(face + sign * d0, face + sign * d1);
  const f1 = Math.max(face + sign * d0, face + sign * d1);
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  if (f1 - f0 < 1e-5 || hi - lo < 1e-5 || y1 - y0 < 1e-5) return;
  if (axis === "x") kit.boxMM(mat, [f0, y0, lo], [f1, y1, hi], opts);
  else kit.boxMM(mat, [lo, y0, f0], [hi, y1, f1], opts);
}

// Thin rectangle of edge lines lying on the floor (or any horizontal plane).
export function floorFrame(kit, x0, x1, z0, z1, y, { w = 0.025, h = 0.006, mat = RED } = {}) {
  kit.boxMM(mat, [x0, y, z0], [x1, y + h, z0 + w]);
  kit.boxMM(mat, [x0, y, z1 - w], [x1, y + h, z1]);
  kit.boxMM(mat, [x0, y, z0 + w], [x0 + w, y + h, z1 - w]);
  kit.boxMM(mat, [x1 - w, y, z0 + w], [x1, y + h, z1 - w]);
}

// Operator chair centred at (cx, cy, cz), backrest on the +w side (operator faces -w). Black with a red back trim.
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
  L.box(RED, 0, 1.146, 0.25, 0.2, 0.012, 0.05);
  L.box("metal", 0, 0.62, 0.22, 0.4, 0.02, 0.02, { color: IMP.mid });
  for (const s of [-1, 1]) {
    L.box("metal", s * 0.27, 0.7, 0.02, 0.04, 0.03, 0.36, { color: IMP.mid });
    L.box("metal", s * 0.27, 0.6, 0.12, 0.03, 0.2, 0.03, { color: IMP.dark });
  }
  L.collider(-0.28, 0.28, 0, 1.15, -0.28, 0.3, "chair");
}

// ---------------------------------------------------------------------------------------------------------------
// Security lock
// ---------------------------------------------------------------------------------------------------------------

/** Scanner arch straddling the lock path at plane x, inner span z0..z1, continued to the ceiling as a soffit. */
export function scannerArch(kit, R, x, z0, z1) {
  const { y0, ceilY } = R;
  const H = (v) => y0 + v;
  const d = 0.5;
  const pw = 0.32;
  const h = 2.5;
  const zc = (z0 + z1) / 2;
  for (const [za, zb, s] of [
    [z0 - pw, z0, 1],
    [z1, z1 + pw, -1],
  ]) {
    const zi = s > 0 ? zb : za; // inner face plane
    kit.boxMM("paintedMetal", [x - d / 2, H(0), za], [x + d / 2, H(h), zb], { color: IMP.black, texel: 1 });
    for (const sx of [-1, 1]) slab(kit, "metal", "x", x + (sx * d) / 2, sx, za + 0.03, zb - 0.03, H(0.12), H(h - 0.06), 0, 0.015, { color: IMP.dark, texel: 2 });
    kit.boxMM("metal", [x - d / 2 - 0.01, H(0), za - 0.01], [x + d / 2 + 0.01, H(0.1), zb + 0.01], { color: IMP.mid, texel: 2 });
    // inner face: sensor window with a red strip, indicator triplet above it
    slab(kit, OFF, "z", zi, s, x - 0.1, x + 0.1, H(0.3), H(2.15), 0, 0.006);
    slab(kit, RED, "z", zi, s, x - 0.012, x + 0.012, H(0.38), H(2.08), 0, 0.012);
    for (let k = 0; k < 3; k++) led(kit, k === 1 ? RED : OFF, x - 0.09 + k * 0.09, H(2.3), zi, "z", s, 0.035, 0.012);
    // west (approach) face: small readout at hand height + two LEDs
    const zm = (za + zb) / 2;
    slab(kit, "intelUI", "x", x - d / 2 - 0.015, -1, zm - 0.11, zm + 0.11, H(1.24), H(1.35), 0, 0.006, { uv: "keep", uvRect: uvRect(UI.readout1) });
    led(kit, RED, x - d / 2 - 0.015, H(1.42), zm - 0.05, "x", -1, 0.025);
    led(kit, OFF, x - d / 2 - 0.015, H(1.42), zm + 0.05, "x", -1, 0.025);
    kit.collider([x - d / 2, y0, za], [x + d / 2, H(h + 0.4), zb], "arch-post");
  }
  // scan beams across the opening
  for (const yy of [0.35, 0.72, 1.09, 1.46, 1.83, 2.2]) kit.boxMM(RED, [x - 0.006, H(yy) - 0.006, z0], [x + 0.006, H(yy) + 0.006, z1]);
  // lintel: steel band, "LOCK IN OPERATION" sign facing the door, scanner head underneath with an LED row
  kit.boxMM("paintedMetal", [x - d / 2, H(h), z0 - pw], [x + d / 2, H(h + 0.4), z1 + pw], { color: IMP.black, texel: 1 });
  for (const sx of [-1, 1]) slab(kit, "metal", "x", x + (sx * d) / 2, sx, z0 - pw + 0.03, z1 + pw - 0.03, H(h + 0.03), H(h + 0.37), 0, 0.015, { color: IMP.dark, texel: 2 });
  slab(kit, "intelUI", "x", x - d / 2 - 0.015, -1, zc - 0.64, zc + 0.64, H(h + 0.04), H(h + 0.36), 0, 0.006, { uv: "keep", uvRect: uvRect(UI.sign3) });
  kit.boxMM(OFF, [x - 0.16, H(h - 0.12), z0 + 0.08], [x + 0.16, H(h), z1 - 0.08]);
  for (let z = z0 + 0.2; z < z1 - 0.1; z += 0.2) led(kit, RED, x, H(h - 0.12), z, "y", -1, 0.03, 0.01);
  // soffit to the ceiling with red strips and flanking conduits
  kit.boxMM("paintedMetal", [x - 0.2, H(h + 0.4), z0 - pw], [x + 0.2, ceilY, z1 + pw], { color: IMP.dark, texel: 1 });
  for (const sx of [-1, 1]) slab(kit, RED, "x", x + sx * 0.2, sx, z0 - pw + 0.1, z1 + pw - 0.1, H(h + 0.62), H(h + 0.65), 0, 0.01);
  for (const zz of [z0 - pw - 0.06, z1 + pw + 0.06]) kit.cyl("metal", x, (H(h + 0.05) + ceilY) / 2, zz, 0.03, ceilY - H(h + 0.05), "y", { color: IMP.steel, segments: 8 });
  // floor: steel-framed grate between the posts, red edge lines
  kit.boxMM("paintedMetal", [x - 0.36, H(0), z0], [x + 0.36, H(0.01), z1], { color: IMP.black, texel: 1 });
  kit.boxMM("grate", [x - 0.3, H(0.012), z0 + 0.02], [x + 0.3, H(0.022), z1 - 0.02], { texel: 2 });
  kit.boxMM(RED, [x - 0.36, H(0.01), z0], [x - 0.335, H(0.016), z1]);
  kit.boxMM(RED, [x + 0.335, H(0.01), z0], [x + 0.36, H(0.016), z1]);
}

/** Waist-high barrier line along z at plane x: posts, top rail at 1.02 m, solid lower panel with a red light bar. */
export function barrier(kit, R, x, z0, z1) {
  const { y0 } = R;
  const H = (v) => y0 + v;
  const lo = Math.min(z0, z1);
  const hi = Math.max(z0, z1);
  const n = Math.max(1, Math.round((hi - lo) / 1.25));
  for (let i = 0; i <= n; i++) {
    const z = lo + (i / n) * (hi - lo);
    kit.box("paintedMetal", x, H(0.55), z, 0.08, 1.1, 0.08, { color: IMP.black, texel: 2 });
    kit.box("metal", x, H(1.105), z, 0.1, 0.015, 0.1, { color: IMP.mid, texel: 2 });
  }
  kit.boxMM("metal", [x - 0.03, H(1.0), lo], [x + 0.03, H(1.04), hi], { color: IMP.steel, texel: 2 });
  kit.boxMM("paintedMetal", [x - 0.015, H(0.12), lo], [x + 0.015, H(0.78), hi], { color: IMP.dark, texel: 1 });
  kit.boxMM("metal", [x - 0.025, H(0.78), lo], [x + 0.025, H(0.81), hi], { color: IMP.mid, texel: 2 });
  kit.boxMM(RED, [x - 0.03, H(0.81), lo + 0.1], [x + 0.03, H(0.825), hi - 0.1]);
  kit.boxMM("paintedMetal", [x - 0.03, H(0), lo], [x + 0.03, H(0.12), hi], { color: IMP.black, texel: 1 });
  kit.collider([x - 0.06, y0, lo], [x + 0.06, H(1.1), hi], "barrier");
}

/** Heavy frame around the partition gate (partition centre px, thickness 0.3), leaf pockets on the room side. */
export function gateFrame(kit, R) {
  const { y0, ceilY, px } = R;
  const { z0, z1, h } = R.gate;
  const H = (v) => y0 + v;
  const pd = 0.27; // half depth (proud 0.12 m of the partition on both sides)
  const pw = 0.32;
  const zc = (z0 + z1) / 2;
  for (const [za, zb, s] of [
    [z0 - pw, z0, 1],
    [z1, z1 + pw, -1],
  ]) {
    const zi = s > 0 ? zb : za;
    kit.boxMM("paintedMetal", [px - pd, H(0), za], [px + pd, H(h + 0.45), zb], { color: IMP.dark, texel: 1 });
    for (const sx of [-1, 1]) slab(kit, "metal", "x", px + sx * pd, sx, za + 0.04, zb - 0.04, H(0.15), H(h + 0.3), 0, 0.02, { color: IMP.mid, texel: 2 });
    kit.boxMM("paintedMetal", [px - pd - 0.01, H(0), za - 0.01], [px + pd + 0.01, H(0.12), zb + 0.01], { color: IMP.black, texel: 1 });
    // inner face: guide rails and a recessed red strip
    slab(kit, RED, "z", zi, s, px - 0.015, px + 0.015, H(0.25), H(h - 0.15), 0, 0.012);
    slab(kit, "metal", "z", zi, s, px - 0.06, px - 0.035, H(0.12), H(h - 0.05), 0, 0.02, { color: IMP.mid });
    slab(kit, "metal", "z", zi, s, px + 0.035, px + 0.06, H(0.12), H(h - 0.05), 0, 0.02, { color: IMP.mid });
    kit.collider([px - pd, y0, za], [px + pd, H(h + 0.45), zb], "gate-post");
  }
  // lintel + mechanism housing up to the ceiling
  kit.boxMM("paintedMetal", [px - pd, H(h), z0 - pw], [px + pd, H(h + 0.45), z1 + pw], { color: IMP.dark, texel: 1 });
  kit.boxMM("paintedMetal", [px - 0.22, H(h + 0.45), z0 - pw], [px + 0.22, ceilY, z1 + pw], { color: IMP.black, texel: 1 });
  for (const sx of [-1, 1]) {
    const xf = px + sx * pd;
    slab(kit, "metal", "x", xf, sx, z0 - pw + 0.04, z1 + pw - 0.04, H(h + 0.04), H(h + 0.41), 0, 0.02, { color: IMP.mid, texel: 2 });
    // vestibule side: the 2:1 "SECURITY LOCK" sign (the arch in front already says LOCK IN OPERATION); room side: 4:1
    if (sx < 0) slab(kit, "intelUI", "x", xf + sx * 0.02, sx, zc - 0.3, zc + 0.3, H(h + 0.075), H(h + 0.375), 0, 0.006, { uv: "keep", uvRect: uvRect(UI.sign1) });
    else slab(kit, "intelUI", "x", xf + sx * 0.02, sx, zc - 0.6, zc + 0.6, H(h + 0.075), H(h + 0.375), 0, 0.006, { uv: "keep", uvRect: uvRect(UI.sign3) });
    slab(kit, RED, "x", px + sx * 0.22, sx, z0 - pw + 0.12, z1 + pw - 0.12, H(h + 0.62), H(h + 0.65), 0, 0.01);
    // north post: three-lamp status column; south post: hand scanner with a gloss window and keypad LEDs
    slab(kit, "paintedMetal", "x", xf + sx * 0.02, sx, z0 - pw + 0.07, z0 - 0.07, H(1.3), H(1.78), 0, 0.03, { color: IMP.black, texel: 2 });
    for (let k = 0; k < 3; k++) led(kit, k === 0 ? RED : OFF, xf + sx * 0.05, H(1.39 + k * 0.15), z0 - pw / 2, "x", sx, 0.07, 0.012);
    slab(kit, "paintedMetal", "x", xf + sx * 0.02, sx, z1 + 0.05, z1 + pw - 0.05, H(1.02), H(1.42), 0, 0.06, { color: IMP.black, texel: 2 });
    slab(kit, OFF, "x", xf + sx * 0.08, sx, z1 + 0.07, z1 + pw - 0.07, H(1.22), H(1.4), 0, 0.004);
    for (let k = 0; k < 3; k++) led(kit, k === 2 ? OFF : RED, xf + sx * 0.08, H(1.1), z1 + 0.08 + k * 0.08, "x", sx, 0.03);
  }
  // threshold plate with red edge lines
  kit.boxMM("metal", [px - pd - 0.05, H(0), z0], [px + pd + 0.05, H(0.014), z1], { color: IMP.mid, texel: 2 });
  kit.boxMM(RED, [px - pd - 0.05, H(0.014), z0 + 0.05], [px - pd - 0.02, H(0.02), z1 - 0.05]);
  kit.boxMM(RED, [px + pd + 0.02, H(0.014), z0 + 0.05], [px + pd + 0.05, H(0.02), z1 - 0.05]);
  // retracted gate leaves in pockets on the room side: thick ribbed slabs either side of the opening
  for (const [za, zb] of [
    [z0 - pw - 0.95, z0 - pw - 0.02],
    [z1 + pw + 0.02, z1 + pw + 0.95],
  ]) {
    kit.boxMM("paintedMetal", [px + 0.15, H(0.06), za], [px + 0.29, H(h + 0.2), zb], { color: IMP.black, texel: 1 });
    for (const yy of [0.5, 1.15, 1.8]) kit.boxMM("metal", [px + 0.29, H(yy - 0.04), za + 0.06], [px + 0.32, H(yy + 0.04), zb - 0.06], { color: IMP.mid, texel: 2 });
    kit.boxMM("metal", [px + 0.29, H(0.06), za], [px + 0.31, H(h + 0.2), za + 0.04], { color: IMP.dark });
    kit.boxMM("metal", [px + 0.29, H(0.06), zb - 0.04], [px + 0.31, H(h + 0.2), zb], { color: IMP.dark });
    kit.boxMM(RED, [px + 0.29, H(h + 0.1), za + 0.1], [px + 0.3, H(h + 0.13), zb - 0.1]);
    kit.collider([px + 0.15, y0, za], [px + 0.32, H(h + 0.2), zb], "gate-leaf");
  }
}

/**
 * Console desk in a Local frame (operator sits at +w, screens face the operator). Options: w, facing, screens
 * (atlas cells), screenAspect, tilt, chairs (u offsets), readouts, sign (atlas cell on the public face), seed.
 */
export function consoleDesk(kit, R, cx, cz, { w = 2.0, facing = 1, screens = ["mon0"], screenAspect = 4 / 3, tilt = -0.35, chairs = [0], readouts = ["readout0", "readout1"], sign = null, seed = 1, drops = true } = {}) {
  const rand = rng(seed);
  const L = new Local(kit, cx, R.y0, cz, facing);
  const d = 0.8;
  // plinth with a red toe strip on the operator side, gloss top with steel lips
  L.box("paintedMetal", 0, 0.42, 0, w - 0.1, 0.84, d - 0.14, { color: IMP.black, texel: 1 });
  L.box(RED, 0, 0.1, d / 2 - 0.075, w - 0.5, 0.012, 0.01);
  L.box("darkGloss", 0, 0.9, 0, w, 0.06, d);
  L.box("metal", 0, 0.875, d / 2 - 0.005, w, 0.03, 0.02, { color: IMP.mid, texel: 2 });
  L.box("metal", 0, 0.875, -d / 2 + 0.005, w, 0.03, 0.02, { color: IMP.mid, texel: 2 });
  L.box("metal", -w / 2 + 0.005, 0.875, 0, 0.02, 0.03, d, { color: IMP.mid, texel: 2 });
  L.box("metal", w / 2 - 0.005, 0.875, 0, 0.02, 0.03, d, { color: IMP.mid, texel: 2 });
  // desk surface: readout plates (as many as fit between the LED cluster and the toggles), LED cluster (left),
  // toggles + LEDs (right)
  const n = Math.max(1, Math.min(readouts.length, Math.floor((w - 0.95) / 0.5)));
  for (let i = 0; i < n; i++) {
    const u = 0.025 - ((n - 1) / 2) * 0.5 + i * 0.5;
    L.box("paintedMetal", u, 0.935, 0.2, 0.46, 0.01, 0.26, { color: IMP.black, texel: 2 });
    L.box("intelUI", u, 0.942, 0.2, 0.4, 0.008, 0.2, { uv: "keep", uvRect: uvRect(UI[readouts[i]]) });
  }
  {
    const u0 = -w / 2 + 0.12;
    L.box(OFF, u0 + 0.16, 0.934, 0.18, 0.36, 0.008, 0.24);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 6; c++) {
        if (rand() < 0.35) continue;
        L.box(RED, u0 + 0.035 + c * 0.05, 0.942, 0.1 + r * 0.07, 0.022, 0.008, 0.022);
      }
    const u1 = w / 2 - 0.12;
    for (let c = 0; c < 4; c++) L.box("metal", u1 - 0.05 - c * 0.08, 0.955, 0.14, 0.03, 0.03, 0.05, { color: IMP.mid });
    for (let c = 0; c < 4; c++) L.box(rand() < 0.6 ? RED : OFF, u1 - 0.05 - c * 0.08, 0.942, 0.27, 0.02, 0.008, 0.02);
  }
  // display housing on the far edge, tilted toward the operator
  const sh = 0.4;
  const hv = 1.08;
  const hw = -d / 2 + 0.14;
  const rot = (dv, dw) => [hv + dv * Math.cos(tilt) - dw * Math.sin(tilt), hw + dv * Math.sin(tilt) + dw * Math.cos(tilt)];
  const hbox = (mat, u, dv, dw, su, sv, sw, opts = {}) => {
    const [v, ww] = rot(dv, dw);
    L.box(mat, u, v, ww, su, sv, sw, { tilt, ...opts });
  };
  hbox("paintedMetal", 0, 0, 0, w - 0.1, sh + 0.16, 0.16, { color: IMP.dark, texel: 1 });
  hbox("metal", 0, (sh + 0.16) / 2 + 0.005, 0, w - 0.08, 0.02, 0.18, { color: IMP.mid, texel: 2 });
  const sw = (w - 0.3) / screens.length;
  screens.forEach((cell, i) => {
    const u = -((screens.length - 1) / 2) * sw + i * sw;
    const scrW = Math.min(sw - 0.08, sh * screenAspect);
    const scrH = scrW / screenAspect;
    hbox(OFF, u, 0.02, 0.082, scrW + 0.05, scrH + 0.05, 0.006);
    hbox("intelUI", u, 0.02, 0.086, scrW, scrH, 0.004, { uv: "keep", uvRect: uvRect(UI[cell]) });
  });
  for (let k = 0; k < 6; k++) hbox(rand() < 0.6 ? RED : OFF, -w / 2 + 0.2 + k * ((w - 0.4) / 5), -sh / 2 - 0.045, 0.084, 0.03, 0.02, 0.006);
  hbox(RED, -w / 2 + 0.075, 0.03, 0.084, 0.012, sh * 0.6, 0.006);
  // public face (-w side): sign plate + intercom + status lamp
  if (sign) {
    const wf = -(d - 0.14) / 2 - 0.004;
    L.box("intelUI", 0.1, 0.55, wf, 0.8, 0.4, 0.008, { uv: "keep", uvRect: uvRect(UI[sign]) });
    L.box(RED, 0.1, 0.78, wf, 0.3, 0.02, 0.008);
    const ui = -w / 2 + 0.2;
    L.box("paintedMetal", ui, 0.62, wf - 0.02, 0.18, 0.24, 0.05, { color: IMP.dark, texel: 2 });
    for (let k = 0; k < 5; k++) L.box("metal", ui, 0.66 + k * 0.02, wf - 0.046, 0.12, 0.006, 0.004, { color: IMP.black });
    L.box(RED, ui - 0.04, 0.56, wf - 0.046, 0.02, 0.02, 0.004);
    L.box("metal", ui + 0.04, 0.56, wf - 0.048, 0.03, 0.03, 0.006, { color: IMP.mid });
  }
  if (drops)
    for (let k = 0; k < 2; k++) cable(kit, "paintedMetal", L.pos(-0.3 + k * 0.6, 0.3, -d / 2 + 0.08), L.pos(-0.3 + k * 0.6 + (rand() - 0.5) * 0.2, 0.02, -d / 2 - 0.3), 0.012, { color: IMP.black, sag: 0.05, pieces: 3 });
  L.collider(-w / 2 - 0.05, w / 2 + 0.05, 0, 1.4, -d / 2 - 0.05, d / 2 + 0.05, "console");
  for (const u of chairs) chair(kit, ...L.pos(u, 0, d / 2 + 0.6), facing);
}

// ---------------------------------------------------------------------------------------------------------------
// Storage / seating
// ---------------------------------------------------------------------------------------------------------------

/** Row of tall lockers along x from x0, n doors of width lw, height h, back against zBack, doors facing f (±z). */
export function lockerBank(kit, R, x0, n, lw, h, zBack, f, { depth = 0.45, seed = 3 } = {}) {
  const rand = rng(seed);
  const { y0 } = R;
  const H = (v) => y0 + v;
  const x1 = x0 + n * lw;
  const zFace = zBack + f * depth;
  const zIn = (dd) => zFace - f * dd;
  const bx = (mat, xa, xb, ya, yb, d0, d1, opts) => kit.boxMM(mat, [xa, H(ya), Math.min(zIn(d0), zIn(d1))], [xb, H(yb), Math.max(zIn(d0), zIn(d1))], opts);
  bx("paintedMetal", x0, x1, 0, h, 0.03, depth, { color: IMP.dark, texel: 1 });
  bx("paintedMetal", x0, x1, 0, 0.1, 0, depth, { color: IMP.black, texel: 1 });
  bx("metal", x0 - 0.01, x1 + 0.01, h, h + 0.03, 0, depth, { color: IMP.mid, texel: 2 });
  for (let i = 0; i < n; i++) {
    const a = x0 + i * lw;
    const b = a + lw;
    bx("paintedMetal", a + 0.015, b - 0.015, 0.12, h - 0.03, 0, 0.03, { color: IMP.black, texel: 1 });
    bx("metal", b - 0.09, b - 0.06, h * 0.5, h * 0.5 + 0.16, -0.025, 0, { color: IMP.mid });
    for (let k = 0; k < 3; k++) bx("metal", a + 0.07, b - 0.07, 0.22 + k * 0.03, 0.228 + k * 0.03, -0.004, 0, { color: IMP.dark });
    bx("metal", (a + b) / 2 - 0.07, (a + b) / 2 + 0.07, h - 0.18, h - 0.11, -0.004, 0, { color: IMP.mid, texel: 2 });
    led(kit, rand() < 0.5 ? RED : OFF, a + 0.07, H(h - 0.145), zFace, "z", f, 0.025);
  }
  kit.collider([x0, y0, Math.min(zBack, zFace)], [x1, H(h + 0.03), Math.max(zBack, zFace)], "lockers");
}

/** Wall block of small compartments (rows × cols doors) with a shelf underneath; on a wall along z (face x). */
export function compartments(kit, R, xFace, sign, z0, z1, yb, rows, cols, { depth = 0.35, seed = 5 } = {}) {
  const rand = rng(seed);
  const { y0 } = R;
  const H = (v) => y0 + v;
  const dw = (z1 - z0) / cols;
  const dh = 0.42;
  const yt = yb + rows * dh;
  slab(kit, "paintedMetal", "x", xFace, sign, z0, z1, H(yb), H(yt), 0.02, depth, { color: IMP.dark, texel: 1 });
  slab(kit, "metal", "x", xFace, sign, z0 - 0.01, z1 + 0.01, H(yt), H(yt + 0.03), 0, depth, { color: IMP.mid, texel: 2 });
  slab(kit, "metal", "x", xFace, sign, z0 - 0.01, z1 + 0.01, H(yb - 0.03), H(yb), 0, depth + 0.1, { color: IMP.mid, texel: 2 });
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const za = z0 + c * dw;
      const zb = za + dw;
      const ya = yb + r * dh;
      slab(kit, "paintedMetal", "x", xFace + sign * depth, sign, za + 0.012, zb - 0.012, H(ya + 0.012), H(ya + dh - 0.012), 0, 0.02, { color: IMP.black, texel: 1 });
      slab(kit, "metal", "x", xFace + sign * depth, sign, zb - 0.09, zb - 0.05, H(ya + dh / 2 - 0.05), H(ya + dh / 2 + 0.05), 0.02, 0.04, { color: IMP.mid });
      led(kit, rand() < 0.4 ? RED : OFF, xFace + sign * (depth + 0.02), H(ya + dh - 0.06), za + 0.06, "x", sign, 0.02);
    }
  // brackets under the shelf
  for (const z of [z0 + 0.15, z1 - 0.15]) slab(kit, "metal", "x", xFace, sign, z - 0.02, z + 0.02, H(yb - 0.33), H(yb - 0.03), 0, depth + 0.06, { color: IMP.dark, texel: 2 });
  kit.collider([Math.min(xFace, xFace + sign * (depth + 0.1)), H(yb - 0.35), z0], [Math.max(xFace, xFace + sign * (depth + 0.1)), H(yt + 0.03), z1], "compartments");
}

/** Wall bench (seat 0.45 m) on a wall with normal axis `axis`, face plane `face`, spanning a0..a1 along the wall. */
export function bench(kit, R, axis, face, sign, a0, a1) {
  const { y0 } = R;
  const H = (v) => y0 + v;
  slab(kit, "paintedMetal", axis, face, sign, a0, a1, H(0.42), H(0.47), 0.02, 0.44, { color: IMP.black, texel: 1 });
  slab(kit, "metal", axis, face, sign, a0, a1, H(0.4), H(0.42), 0.02, 0.44, { color: IMP.mid, texel: 2 });
  for (const a of [a0 + 0.2, a1 - 0.2]) slab(kit, "metal", axis, face, sign, a - 0.025, a + 0.025, H(0.05), H(0.4), 0.02, 0.4, { color: IMP.dark, texel: 2 });
  slab(kit, "metal", axis, face, sign, a0, a1, H(0.88), H(0.94), 0, 0.04, { color: IMP.mid, texel: 2 });
  const lo = Math.min(face, face + sign * 0.46);
  const hi = Math.max(face, face + sign * 0.46);
  if (axis === "x") kit.collider([lo, y0, a0], [hi, H(0.5), a1], "bench");
  else kit.collider([a0, y0, lo], [a1, H(0.5), hi], "bench");
}

/** Tall equipment cabinet against a wall along z (face plane x): gloss door, red LED column, vents, handle. */
export function equipmentCabinet(kit, R, xFace, sign, z0, z1, h, seed = 9) {
  const rand = rng(seed);
  const { y0 } = R;
  const H = (v) => y0 + v;
  const D = 0.42;
  slab(kit, "paintedMetal", "x", xFace, sign, z0, z1, H(0), H(h), 0, D, { color: IMP.dark, texel: 1 });
  slab(kit, "metal", "x", xFace, sign, z0 - 0.01, z1 + 0.01, H(h), H(h + 0.03), 0, D, { color: IMP.mid, texel: 2 });
  slab(kit, "paintedMetal", "x", xFace, sign, z0 - 0.01, z1 + 0.01, H(0), H(0.1), 0, D + 0.01, { color: IMP.black, texel: 1 });
  slab(kit, OFF, "x", xFace + sign * D, sign, z0 + 0.05, z1 - 0.05, H(0.15), H(h - 0.08), 0, 0.01);
  slab(kit, "metal", "x", xFace + sign * D, sign, z1 - 0.12, z1 - 0.09, H(h * 0.45), H(h * 0.45 + 0.2), 0.01, 0.035, { color: IMP.mid });
  for (let k = 0; k < 10; k++) led(kit, rand() < 0.6 ? RED : OFF, xFace + sign * (D + 0.01), H(0.4 + k * 0.12), z0 + 0.1, "x", sign, 0.02);
  for (let k = 0; k < 6; k++) slab(kit, "metal", "x", xFace + sign * (D + 0.01), sign, z0 + 0.18, z1 - 0.18, H(h - 0.32 + k * 0.03), H(h - 0.312 + k * 0.03), 0, 0.004, { color: IMP.black });
  slab(kit, "intelUI", "x", xFace + sign * (D + 0.01), sign, (z0 + z1) / 2 - 0.16, (z0 + z1) / 2 + 0.16, H(h - 0.16), H(h - 0.0), 0, 0.006, { uv: "keep", uvRect: uvRect(UI["tag" + (seed % 6)]) });
  kit.collider([Math.min(xFace, xFace + sign * (D + 0.04)), y0, z0], [Math.max(xFace, xFace + sign * (D + 0.04)), H(h + 0.03), z1], "cabinet");
}

// Small wall items (axis = wall normal axis 'x'|'z', face = plane coordinate, sign = into the room, a = position
// along the wall) ------------------------------------------------------------------------------------------------

// world position at depth d from a wall face
const wp = (axis, face, sign, a, y, d) => (axis === "x" ? [face + sign * d, y, a] : [a, y, face + sign * d]);
// LED on a wall face at (a, y), depth d
function wled(kit, mat, axis, face, sign, a, y, d, size = 0.02) {
  const [x, yy, z] = wp(axis, face, sign, a, y, d);
  led(kit, mat, x, yy, z, axis, sign, size);
}
function wcyl(kit, mat, axis, face, sign, a, y, d, r, len, color) {
  const [x, yy, z] = wp(axis, face, sign, a, y, d);
  kit.cyl(mat, x, yy, z, r, len, "y", { color, segments: 6 });
}

/** Wall alarm point (red box, black button, LED, conduit down). */
export function alarmPoint(kit, axis, face, sign, a, y) {
  slab(kit, "paintedMetal", axis, face, sign, a - 0.1, a + 0.1, y - 0.12, y + 0.12, 0, 0.07, { color: IMP.red, texel: 2 });
  slab(kit, "paintedMetal", axis, face, sign, a - 0.05, a + 0.05, y - 0.05, y + 0.05, 0.07, 0.085, { color: IMP.black, texel: 2 });
  wled(kit, RED, axis, face, sign, a + 0.07, y + 0.09, 0.07);
  wcyl(kit, "metal", axis, face, sign, a, y - 0.26, 0.035, 0.012, 0.28, IMP.mid);
}

/** Wall monitor (4:3 atlas cell) with bezel, a red LED and a conduit. */
export function wallMonitor(kit, axis, face, sign, ac, yc, w, cell) {
  const h = w * 0.75;
  slab(kit, "paintedMetal", axis, face, sign, ac - w / 2 - 0.05, ac + w / 2 + 0.05, yc - h / 2 - 0.05, yc + h / 2 + 0.05, 0, 0.06, { color: IMP.black, texel: 1 });
  slab(kit, OFF, axis, face, sign, ac - w / 2 - 0.02, ac + w / 2 + 0.02, yc - h / 2 - 0.02, yc + h / 2 + 0.02, 0.06, 0.065);
  slab(kit, "intelUI", axis, face, sign, ac - w / 2, ac + w / 2, yc - h / 2, yc + h / 2, 0.065, 0.069, { uv: "keep", uvRect: uvRect(UI[cell]) });
  wled(kit, RED, axis, face, sign, ac + w / 2 - 0.02, yc - h / 2 - 0.035, 0.06, 0.018);
  wcyl(kit, "metal", axis, face, sign, ac, yc - h / 2 - 0.26, 0.03, 0.012, 0.35, IMP.mid);
}

/** Wall-mounted sign plate (atlas cell). */
export function wallSign(kit, axis, face, sign, a0, a1, y0, y1, cell) {
  slab(kit, "paintedMetal", axis, face, sign, a0 - 0.04, a1 + 0.04, y0 - 0.04, y1 + 0.04, 0, 0.03, { color: IMP.black, texel: 1 });
  slab(kit, "intelUI", axis, face, sign, a0, a1, y0, y1, 0.03, 0.036, { uv: "keep", uvRect: uvRect(UI[cell]) });
}
export const wallSignZ = (kit, zFace, sign, x0, x1, y0, y1, cell) => wallSign(kit, "z", zFace, sign, x0, x1, y0, y1, cell);

/** Junction box with conduit stubs and two LEDs. */
export function junctionBox(kit, axis, face, sign, a, y, { w = 0.3, h = 0.36 } = {}) {
  slab(kit, "paintedMetal", axis, face, sign, a - w / 2, a + w / 2, y - h / 2, y + h / 2, 0, 0.12, { color: IMP.dark, texel: 2 });
  slab(kit, "metal", axis, face, sign, a - w / 2 + 0.03, a + w / 2 - 0.03, y - h / 2 + 0.03, y + h / 2 - 0.03, 0.12, 0.126, { color: IMP.black, texel: 2 });
  wled(kit, RED, axis, face, sign, a - w / 2 + 0.06, y + h / 2 - 0.07, 0.126);
  wled(kit, OFF, axis, face, sign, a - w / 2 + 0.11, y + h / 2 - 0.07, 0.126);
  wcyl(kit, "metal", axis, face, sign, a, y + h / 2 + 0.2, 0.06, 0.02, 0.4, IMP.mid);
  wcyl(kit, "metal", axis, face, sign, a - 0.06, y - h / 2 - 0.2, 0.06, 0.015, 0.4, IMP.dark);
}

/** Wall intercom (panel with speaker slats, LED, call button). */
export function intercom(kit, axis, face, sign, a, y) {
  slab(kit, "paintedMetal", axis, face, sign, a - 0.11, a + 0.11, y - 0.15, y + 0.15, 0, 0.08, { color: IMP.dark, texel: 2 });
  slab(kit, "paintedMetal", axis, face, sign, a - 0.09, a + 0.09, y - 0.13, y + 0.13, 0.08, 0.09, { color: IMP.black, texel: 2 });
  for (let k = 0; k < 6; k++) slab(kit, "metal", axis, face, sign, a - 0.06, a + 0.06, y + 0.02 + k * 0.018, y + 0.026 + k * 0.018, 0.09, 0.094, { color: IMP.mid });
  wled(kit, RED, axis, face, sign, a - 0.05, y - 0.08, 0.09, 0.015);
  slab(kit, "metal", axis, face, sign, a + 0.03, a + 0.07, y - 0.1, y - 0.06, 0.09, 0.098, { color: IMP.mid });
}

/** Wall-bracketed suppression canister (red cylinder, steel valve) with a small label plate. */
export function canister(kit, axis, face, sign, a, y0) {
  slab(kit, "metal", axis, face, sign, a - 0.14, a + 0.14, y0 + 0.5, y0 + 0.95, 0, 0.1, { color: IMP.dark, texel: 2 });
  const [cx, , cz] = wp(axis, face, sign, a, 0, 0.17);
  kit.cyl("paintedMetal", cx, y0 + 0.68, cz, 0.085, 0.56, "y", { color: IMP.red, segments: 14, texel: 1 });
  kit.cyl("metal", cx, y0 + 0.99, cz, 0.035, 0.08, "y", { color: IMP.steel, segments: 10 });
  kit.box("metal", cx, y0 + 1.05, cz, 0.05, 0.03, 0.14, { color: IMP.mid });
  slab(kit, "intelUI", axis, face, sign, a - 0.12, a + 0.12, y0 + 1.1, y0 + 1.22, 0, 0.006, { uv: "keep", uvRect: uvRect(UI.readout3) });
  const [x0, , z0] = wp(axis, face, sign, a - 0.16, 0, 0);
  const [x1, , z1] = wp(axis, face, sign, a + 0.16, 0, 0.3);
  kit.collider([Math.min(x0, x1), y0, Math.min(z0, z1)], [Math.max(x0, x1), y0 + 1.1, Math.max(z0, z1)], "canister");
}

/** Ceiling camera: bracket, tilted body, dark lens, red LED. yaw = look direction (rad, 0 → -z), pitch down. */
export function camera(kit, x, yTop, z, yaw, pitch = 0.45) {
  kit.box("metal", x, yTop - 0.05, z, 0.06, 0.1, 0.06, { color: IMP.dark, texel: 2 });
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch, yaw, 0, "YXZ"));
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
  const at = (dist, dy = 0) => [x + f.x * dist, yTop - 0.1 + f.y * dist + dy, z + f.z * dist];
  kit.add("paintedMetal", new THREE.BoxGeometry(0.12, 0.1, 0.26), { pos: at(0.06, -0.05), quat: q, color: IMP.black, texel: 2 });
  kit.add(OFF, new THREE.CylinderGeometry(0.035, 0.035, 0.05, 10).rotateX(Math.PI / 2), { pos: at(0.2, -0.05), quat: q, uv: "keep" });
  kit.add(RED, new THREE.BoxGeometry(0.015, 0.015, 0.01), { pos: at(0.19, 0.0), quat: q });
}

// ---------------------------------------------------------------------------------------------------------------
// Main room fixtures
// ---------------------------------------------------------------------------------------------------------------

/**
 * Data column against a wall along x: black pillar to the ceiling with a recessed scrolling-text screen
 * (module material "intelScroll"), red edge strips, drive modules, label tag, side vents. x0 = west edge,
 * zBack = wall-side z, f = +1 (face toward +z) | -1.
 */
export function dataColumn(kit, R, x0, zBack, f, idx) {
  const { y0, ceilY } = R;
  const H = (v) => y0 + v;
  const W = 1.1;
  const D = 0.8;
  const x1 = x0 + W;
  const xc = x0 + W / 2;
  const zFace = zBack + f * D;
  const zIn = (dd) => zFace - f * dd;
  const bx = (mat, xa, xb, ya, yb, d0, d1, opts) => kit.boxMM(mat, [xa, H(ya), Math.min(zIn(d0), zIn(d1))], [xb, H(yb), Math.max(zIn(d0), zIn(d1))], opts);
  const top = ceilY - y0;
  // body, cap plate, narrower duct section into the ceiling with a flange
  bx("paintedMetal", x0, x1, 0, 3.1, 0.05, D, { color: IMP.black, texel: 1 });
  bx("metal", x0 - 0.02, x1 + 0.02, 3.1, 3.16, 0, D, { color: IMP.mid, texel: 2 });
  bx("paintedMetal", x0 + 0.2, x1 - 0.2, 3.16, top, 0.15, D - 0.1, { color: IMP.dark, texel: 1 });
  bx("metal", x0 + 0.17, x1 - 0.17, top - 0.1, top - 0.06, 0.12, D - 0.07, { color: IMP.mid, texel: 2 });
  // face: side rails, gloss well, scroll screen (one 128-px text column, v window sized for square texels)
  bx("metal", x0, x0 + 0.1, 0.1, 3.05, 0, 0.05, { color: IMP.dark, texel: 2 });
  bx("metal", x1 - 0.1, x1, 0.1, 3.05, 0, 0.05, { color: IMP.dark, texel: 2 });
  bx(OFF, x0 + 0.16, x1 - 0.16, 0.5, 2.78, 0.03, 0.05);
  const col = idx % 4;
  const v0 = (idx * 0.173) % 1;
  const span = (2.2 / 0.7) * (128 / 1024);
  bx("intelScroll", xc - 0.35, xc + 0.35, 0.55, 2.75, 0.026, 0.03, { uv: "keep", uvRect: [col / 4 + 0.004, v0, (col + 1) / 4 - 0.004, v0 + span] });
  for (const sx of [xc - 0.39, xc + 0.37]) bx(RED, sx, sx + 0.02, 0.58, 2.72, 0.026, 0.034);
  // label tag band above the screen, drive modules at the base, red under-glow at the foot
  bx("paintedMetal", x0 + 0.16, x1 - 0.16, 2.8, 3.06, 0.01, 0.05, { color: IMP.dark, texel: 2 });
  bx("intelUI", xc - 0.25, xc + 0.25, 2.805, 3.055, 0.004, 0.01, { uv: "keep", uvRect: uvRect(UI["tag" + (idx % 6)]) });
  led(kit, RED, x1 - 0.22, H(2.93), zIn(0.004), "z", f, 0.03);
  for (let k = 0; k < 3; k++) {
    const ya = 0.12 + k * 0.12;
    bx("paintedMetal", x0 + 0.14, x1 - 0.14, ya, ya + 0.1, 0.01, 0.05, { color: IMP.dark, texel: 2 });
    bx("metal", xc - 0.2, xc + 0.2, ya + 0.04, ya + 0.06, -0.015, 0.01, { color: IMP.mid });
    led(kit, k === 1 ? OFF : RED, x1 - 0.22, H(ya + 0.05), zIn(0.01), "z", f, 0.02);
    led(kit, RED, x0 + 0.22, H(ya + 0.05), zIn(0.01), "z", f, 0.02);
  }
  bx(RED, x0 + 0.1, x1 - 0.1, 0.02, 0.05, -0.012, 0);
  // side vents (both flanks) and a conduit from the cap to the wall
  for (const [sx, s] of [
    [x0, -1],
    [x1, 1],
  ])
    for (let k = 0; k < 8; k++) {
      const [za, zb] = [Math.min(zIn(0.2), zIn(0.6)), Math.max(zIn(0.2), zIn(0.6))];
      kit.boxMM("metal", [Math.min(sx, sx + s * 0.005), H(1.3 + k * 0.06), za], [Math.max(sx, sx + s * 0.005), H(1.31 + k * 0.06), zb], { color: IMP.dark });
    }
  kit.collider([x0, y0, Math.min(zBack, zFace)], [x1, H(3.16), Math.max(zBack, zFace)], "column");
}

/** Central analysis table with a red edge strip, emitter ring, end consoles, standing pads and a floor inlay. */
export function analysisTable(kit, R, cx, cz) {
  const { y0 } = R;
  const H = (v) => y0 + v;
  const w = 3.2;
  const d = 1.8;
  const rand = rng(4242);
  kit.boxMM("paintedMetal", [cx - w / 2 + 0.15, H(0), cz - d / 2 + 0.15], [cx + w / 2 - 0.15, H(0.12), cz + d / 2 - 0.15], { color: IMP.dark, texel: 1 });
  kit.boxMM("paintedMetal", [cx - w / 2, H(0.12), cz - d / 2], [cx + w / 2, H(0.82), cz + d / 2], { color: IMP.black, texel: 1 });
  kit.boxMM(RED, [cx - w / 2 - 0.006, H(0.82), cz - d / 2 - 0.006], [cx + w / 2 + 0.006, H(0.845), cz + d / 2 + 0.006]);
  kit.boxMM("paintedMetal", [cx - w / 2, H(0.845), cz - d / 2], [cx + w / 2, H(0.875), cz + d / 2], { color: IMP.black, texel: 1 });
  kit.boxMM("metal", [cx - w / 2 - 0.02, H(0.875), cz - d / 2 - 0.02], [cx + w / 2 + 0.02, H(0.905), cz + d / 2 + 0.02], { color: IMP.mid, texel: 2 });
  kit.boxMM(OFF, [cx - w / 2 + 0.06, H(0.905), cz - d / 2 + 0.06], [cx + w / 2 - 0.06, H(0.93), cz + d / 2 - 0.06]);
  // long faces: vent slats and red corner strips
  for (const [zf, s] of [
    [cz - d / 2, -1],
    [cz + d / 2, 1],
  ]) {
    for (let k = 0; k < 5; k++) slab(kit, "metal", "z", zf, s, cx - 1.0, cx + 1.0, H(0.22 + k * 0.04), H(0.23 + k * 0.04), 0, 0.006, { color: IMP.dark });
    slab(kit, RED, "z", zf, s, cx - 1.36, cx - 1.34, H(0.2), H(0.72), 0, 0.006);
    slab(kit, RED, "z", zf, s, cx + 1.34, cx + 1.36, H(0.2), H(0.72), 0, 0.006);
    // recessed storage drawers with pulls
    for (const dx of [-0.6, 0.6]) {
      slab(kit, "paintedMetal", "z", zf, s, cx + dx - 0.3, cx + dx + 0.3, H(0.45), H(0.72), 0, 0.004, { color: IMP.dark, texel: 2 });
      slab(kit, "metal", "z", zf, s, cx + dx - 0.12, cx + dx + 0.12, H(0.57), H(0.59), 0.004, 0.02, { color: IMP.mid });
    }
  }
  // holo emitter ring in the centre of the top
  kit.cyl("metal", cx, H(0.945), cz, 0.56, 0.03, "y", { color: IMP.mid, segments: 28, texel: 1 });
  kit.add(RED, new THREE.TorusGeometry(0.5, 0.012, 6, 40), { pos: [cx, H(0.962), cz], rot: [Math.PI / 2, 0, 0] });
  kit.cyl(OFF, cx, H(0.965), cz, 0.46, 0.012, "y", { segments: 28 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    kit.box("metal", cx + Math.cos(a) * 0.53, H(0.968), cz + Math.sin(a) * 0.53, 0.04, 0.02, 0.04, { color: IMP.steel });
  }
  // end consoles: panels on the top sloping up away from the operator standing at each end (positive tilt tips
  // a horizontal panel's normal toward +w), on a low riser and a taller far support
  for (const s of [-1, 1]) {
    const L = new Local(kit, cx + s * (w / 2 - 0.42), y0, cz, s > 0 ? 1 : 3);
    const tilt = 0.3;
    const hv = 1.05;
    const hw = 0;
    const rot = (dv, dw) => [hv + dv * Math.cos(tilt) - dw * Math.sin(tilt), hw + dv * Math.sin(tilt) + dw * Math.cos(tilt)];
    const tb = (mat, u, dv, dw, su, sv, sw, opts = {}) => {
      const [v, ww] = rot(dv, dw);
      L.box(mat, u, v, ww, su, sv, sw, { tilt, ...opts });
    };
    L.box("paintedMetal", 0, 0.9525, -0.06, 1.44, 0.045, 0.42, { color: IMP.black, texel: 2 });
    L.box("paintedMetal", 0, 1.0, -0.24, 1.44, 0.14, 0.08, { color: IMP.black, texel: 2 });
    tb("paintedMetal", 0, 0, 0, 1.5, 0.05, 0.62, { color: IMP.dark, texel: 2 });
    tb("metal", 0, 0.026, 0, 1.52, 0.004, 0.64, { color: IMP.black, texel: 2 });
    tb("intelUI", 0, 0.03, -0.03, 0.5, 0.004, 0.5, { uv: "keep", uvRect: uvRect(UI.table) });
    tb("intelUI", -0.5, 0.03, -0.08, 0.36, 0.004, 0.18, { uv: "keep", uvRect: uvRect(UI.readout0) });
    tb("intelUI", 0.5, 0.03, -0.08, 0.36, 0.004, 0.18, { uv: "keep", uvRect: uvRect(UI.readout3) });
    for (let k = 0; k < 6; k++) tb(rand() < 0.65 ? RED : OFF, -0.62 + k * 0.05, 0.032, 0.14, 0.025, 0.006, 0.025);
    for (let k = 0; k < 3; k++) tb("metal", 0.4 + k * 0.1, 0.045, 0.14, 0.04, 0.03, 0.05, { color: IMP.mid });
    for (let k = 0; k < 4; k++) tb(RED, 0.35 + k * 0.1, 0.032, 0.24, 0.02, 0.006, 0.02);
  }
  // standing pads (black plates with a red edge) at the four sides
  for (const [pxp, pzp, sw, sd] of [
    [cx, cz - d / 2 - 0.55, 1.4, 0.7],
    [cx, cz + d / 2 + 0.55, 1.4, 0.7],
    [cx - w / 2 - 0.55, cz, 0.7, 1.2],
    [cx + w / 2 + 0.55, cz, 0.7, 1.2],
  ]) {
    kit.box("paintedMetal", pxp, H(0.006), pzp, sw, 0.012, sd, { color: IMP.black, texel: 1 });
    floorFrame(kit, pxp - sw / 2, pxp + sw / 2, pzp - sd / 2, pzp + sd / 2, H(0.012));
  }
  // floor inlay under the table with red corner brackets
  kit.boxMM("paintedMetal", [cx - 2.6, H(0), cz - 1.9], [cx + 2.6, H(0.005), cz + 1.9], { color: IMP.dark, texel: 1 });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = cx + sx * 2.5;
      const z = cz + sz * 1.8;
      kit.boxMM(RED, [Math.min(x, x - sx * 0.5), H(0.005), z - 0.012], [Math.max(x, x - sx * 0.5), H(0.011), z + 0.012]);
      kit.boxMM(RED, [x - 0.012, H(0.005), Math.min(z, z - sz * 0.5)], [x + 0.012, H(0.011), Math.max(z, z - sz * 0.5)]);
    }
  kit.collider([cx - w / 2, y0, cz - d / 2], [cx + w / 2, H(1.0), cz + d / 2], "table");
}

/** Wireframe holo map for LineSegments: terrain grid 2.4 × 1.3 m with contour ridge, frame, target boxes. */
export function holoGeometry() {
  const pts = [];
  const nx = 20;
  const nz = 11;
  const W = 2.4;
  const D = 1.3;
  const hgt = (i, j) => {
    const x = i / nx;
    const z = j / nz;
    let h = 0.07 * Math.sin(x * 9.5 + 1.3) * Math.cos(z * 7.2 - 0.4) + 0.05 * Math.sin(x * 17 + z * 5.5) * Math.sin(z * 11);
    h += 0.13 * Math.exp(-((x - 0.63) ** 2 * 26 + (z - 0.42) ** 2 * 9));
    h += 0.09 * Math.exp(-((x - 0.25) ** 2 * 30 + (z - 0.7) ** 2 * 14));
    return Math.max(0.005, h + 0.03);
  };
  const P = (i, j) => [-W / 2 + (i / nx) * W, hgt(i, j), -D / 2 + (j / nz) * D];
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= nz; j++) {
      if (i < nx) pts.push(...P(i, j), ...P(i + 1, j));
      if (j < nz) pts.push(...P(i, j), ...P(i, j + 1));
    }
  // base frame, corner ticks
  const fr = [
    [-W / 2, 0, -D / 2],
    [W / 2, 0, -D / 2],
    [W / 2, 0, D / 2],
    [-W / 2, 0, D / 2],
  ];
  for (let k = 0; k < 4; k++) pts.push(...fr[k], ...fr[(k + 1) % 4]);
  for (const [x, , z] of fr) pts.push(x, 0, z, x, 0.12, z);
  // target boxes with drop lines
  const box = (cx, cy, cz, s) => {
    const c = [];
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) c.push([cx + dx * s, cy + dy * s, cz + dz * s]);
    const e = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    for (const [a, b] of e) pts.push(...c[a], ...c[b]);
    pts.push(cx, cy - s, cz, cx, 0, cz);
  };
  box(0.31, 0.34, -0.1, 0.05);
  box(-0.6, 0.28, 0.26, 0.04);
  box(0.85, 0.22, 0.4, 0.035);
  // bearing lines from the first target
  pts.push(0.31, 0.34, -0.1, -0.6, 0.28, 0.26, 0.31, 0.34, -0.1, 0.85, 0.22, 0.4);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  g.computeBoundingSphere();
  return g;
}

/** Locked archive cabinet against the east wall (back plane xBack, face toward -x), z0..z1. */
export function archiveCabinet(kit, R, xBack, z0, z1, idx) {
  const { y0 } = R;
  const H = (v) => y0 + v;
  const D = 0.7;
  const h = 2.4;
  const xf = xBack - D;
  const zc = (z0 + z1) / 2;
  const rand = rng(700 + idx);
  kit.boxMM("paintedMetal", [xf + 0.03, H(0), z0], [xBack, H(h), z1], { color: IMP.dark, texel: 1 });
  kit.boxMM("paintedMetal", [xf, H(0), z0], [xf + 0.03, H(0.1), z1], { color: IMP.black, texel: 1 });
  kit.boxMM("metal", [xf - 0.01, H(h), z0 - 0.01], [xBack, H(h + 0.04), z1 + 0.01], { color: IMP.mid, texel: 2 });
  kit.boxMM("metal", [xf, H(0.1), z0], [xf + 0.03, H(h), z0 + 0.05], { color: IMP.mid, texel: 2 });
  kit.boxMM("metal", [xf, H(0.1), z1 - 0.05], [xf + 0.03, H(h), z1], { color: IMP.mid, texel: 2 });
  kit.boxMM("paintedMetal", [xf + 0.005, H(2.14), z0 + 0.05], [xf + 0.03, H(h), z1 - 0.05], { color: IMP.black, texel: 1 });
  for (let k = 0; k < 5; k++) {
    const ya = 0.14 + k * 0.4;
    const yb = ya + 0.36;
    kit.boxMM("paintedMetal", [xf + 0.005, H(ya), z0 + 0.06], [xf + 0.03, H(yb), z1 - 0.06], { color: IMP.black, texel: 1 });
    kit.boxMM("metal", [xf - 0.012, H(ya + 0.15), zc - 0.2], [xf + 0.005, H(ya + 0.18), zc + 0.2], { color: IMP.mid });
    kit.boxMM("metal", [xf - 0.002, H(ya + 0.05), z1 - 0.32], [xf + 0.005, H(ya + 0.11), z1 - 0.12], { color: IMP.mid, texel: 2 });
    led(kit, rand() < 0.7 ? RED : OFF, xf + 0.005, H(ya + 0.28), z0 + 0.14, "x", -1, 0.02);
  }
  // lock bar with a padlock block and its LED
  kit.boxMM("metal", [xf - 0.03, H(0.12), zc + 0.36], [xf - 0.005, H(h - 0.06), zc + 0.4], { color: IMP.steel, texel: 2 });
  kit.boxMM("paintedMetal", [xf - 0.055, H(1.22), zc + 0.31], [xf - 0.005, H(1.4), zc + 0.45], { color: IMP.black, texel: 2 });
  led(kit, RED, xf - 0.055, H(1.36), zc + 0.38, "x", -1, 0.02);
  // header: label plate + big status lamp, red light bar under the header so the cabinet fronts read from the room
  slab(kit, "intelUI", "x", xf, -1, zc - 0.24, zc + 0.24, H(2.16), H(2.38), 0, 0.006, { uv: "keep", uvRect: uvRect(UI["label" + (idx % 6)]) });
  kit.boxMM(RED, [xf - 0.006, H(2.115), z0 + 0.08], [xf + 0.005, H(2.135), z1 - 0.08]);
  led(kit, RED, xf, H(2.27), z1 - 0.16, "x", -1, 0.06, 0.015);
  led(kit, OFF, xf, H(2.27), z0 + 0.16, "x", -1, 0.06, 0.015);
  kit.collider([xf - 0.06, y0, z0], [xBack, H(h + 0.04), z1], "cabinet");
}

/** Surveillance monitor bank on a wall along z (face plane xFace, toward +x): 4 × 3 screens, header, trunk. */
export function monitorBank(kit, R, xFace, zc) {
  const { y0, ceilY } = R;
  const H = (v) => y0 + v;
  const cols = 4;
  const rows = 3;
  const pw = 0.8;
  const ph = 0.6;
  const W = cols * pw + 0.1;
  const Hh = rows * ph + 0.1;
  const z0 = zc - W / 2;
  const z1 = zc + W / 2;
  const yb = 1.05;
  const yt = yb + Hh;
  slab(kit, "paintedMetal", "x", xFace, 1, z0, z1, H(yb), H(yt), 0, 0.12, { color: IMP.black, texel: 1 });
  slab(kit, "metal", "x", xFace, 1, z0 + 0.02, z1 - 0.02, H(yb + 0.02), H(yt - 0.02), 0.12, 0.13, { color: IMP.dark, texel: 2 });
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const zm = z0 + 0.05 + pw * (c + 0.5);
      const ym = yb + 0.05 + ph * (r + 0.5);
      const sw = 0.66;
      const sh = 0.495;
      slab(kit, OFF, "x", xFace, 1, zm - sw / 2 - 0.03, zm + sw / 2 + 0.03, H(ym - sh / 2 - 0.03), H(ym + sh / 2 + 0.03), 0.13, 0.136);
      slab(kit, "intelUI", "x", xFace, 1, zm - sw / 2, zm + sw / 2, H(ym - sh / 2), H(ym + sh / 2), 0.136, 0.14, { uv: "keep", uvRect: uvRect(UI["mon" + (i % 12)]) });
      led(kit, RED, xFace + 0.136, H(ym - sh / 2 - 0.045), zm + sw / 2 - 0.02, "x", 1, 0.018);
    }
  for (let r = 1; r < rows; r++) slab(kit, "metal", "x", xFace, 1, z0 + 0.04, z1 - 0.04, H(yb + 0.05 + ph * r - 0.008), H(yb + 0.05 + ph * r + 0.008), 0.13, 0.14, { color: IMP.mid });
  // header label + trunk to the ceiling, cable loom down into the desk
  slab(kit, "paintedMetal", "x", xFace, 1, zc - 0.5, zc + 0.5, H(yt + 0.05), H(yt + 0.4), 0, 0.08, { color: IMP.dark, texel: 1 });
  slab(kit, "intelUI", "x", xFace, 1, zc - 0.3, zc + 0.3, H(yt + 0.075), H(yt + 0.375), 0.08, 0.086, { uv: "keep", uvRect: uvRect(UI.tag5) });
  slab(kit, "metalRough", "x", xFace, 1, zc - 0.2, zc + 0.2, H(yt + 0.4), ceilY - y0, 0, 0.18, { color: IMP.mid, texel: 1 });
  for (let k = 0; k < 4; k++) cable(kit, "paintedMetal", [xFace + 0.06, H(yb), z0 + 0.4 + k * 0.8], [xFace + 0.64 + (k % 2) * 0.02, H(0.5), z0 + 0.55 + k * 0.7], 0.012, { color: IMP.black, sag: 0.08, pieces: 3 });
  kit.collider([xFace, y0, z0], [xFace + 0.15, H(yt + 0.4), z1], "monitor-bank");
}

/** Sealed evidence hatch on a wall along x (face plane zFace, sign toward the room), centred at xc. */
export function evidenceHatch(kit, R, zFace, sign, xc) {
  const { y0 } = R;
  const H = (v) => y0 + v;
  const S = (mat, x0, x1, ya, yb, d0, d1, opts) => slab(kit, mat, "z", zFace, sign, x0, x1, H(ya), H(yb), d0, d1, opts);
  const fw = 2.0;
  const fh = 2.25;
  S("paintedMetal", xc - fw / 2, xc + fw / 2, 0.1, fh, 0, 0.14, { color: IMP.dark, texel: 1 });
  S("metal", xc - fw / 2 + 0.08, xc + fw / 2 - 0.08, 0.18, fh - 0.08, 0.14, 0.16, { color: IMP.mid, texel: 2 });
  S("paintedMetal", xc - fw / 2 - 0.02, xc + fw / 2 + 0.02, 0, 0.1, 0, 0.16, { color: IMP.black, texel: 1 });
  // leaf with bolt ring, rotary seal wheel, red seal bar with custody blocks
  const lw = 1.4;
  const lh = 1.7;
  const ly = 0.3;
  S("paintedMetal", xc - lw / 2, xc + lw / 2, ly, ly + lh, 0.16, 0.22, { color: IMP.black, texel: 1 });
  S("metal", xc - lw / 2 + 0.04, xc + lw / 2 - 0.04, ly + 0.04, ly + lh - 0.04, 0.22, 0.225, { color: IMP.dark, texel: 2 });
  const bolts = [];
  for (let k = 0; k < 4; k++) bolts.push([xc - lw / 2 + 0.12 + (k * (lw - 0.24)) / 3, ly + 0.12], [xc - lw / 2 + 0.12 + (k * (lw - 0.24)) / 3, ly + lh - 0.12]);
  for (let k = 1; k < 4; k++) bolts.push([xc - lw / 2 + 0.12, ly + 0.12 + (k * (lh - 0.24)) / 4], [xc + lw / 2 - 0.12, ly + 0.12 + (k * (lh - 0.24)) / 4]);
  for (const [bx, by] of bolts) kit.cyl("metal", bx, H(by), zFace + sign * 0.24, 0.035, 0.04, "z", { color: IMP.steel, segments: 8 });
  const wy = ly + lh / 2 + 0.1;
  kit.add("metal", new THREE.TorusGeometry(0.26, 0.025, 8, 28), { pos: [xc, H(wy), zFace + sign * 0.29], color: IMP.steel });
  kit.cyl("metal", xc, H(wy), zFace + sign * 0.26, 0.07, 0.1, "z", { color: IMP.dark, segments: 12 });
  for (let k = 0; k < 2; k++) kit.add("metal", new THREE.BoxGeometry(0.03, 0.52, 0.03), { pos: [xc, H(wy), zFace + sign * 0.29], rot: [0, 0, (k * Math.PI) / 2], color: IMP.steel });
  S(RED, xc - 0.62, xc + 0.62, ly + 0.28, ly + 0.31, 0.22, 0.235);
  for (const dx of [-0.7, 0.7]) {
    S("paintedMetal", xc + dx - 0.1, xc + dx + 0.1, ly + 0.22, ly + 0.37, 0.22, 0.26, { color: IMP.black, texel: 2 });
    led(kit, RED, xc + dx, H(ly + 0.33), zFace + sign * 0.26, "z", sign, 0.02);
  }
  // keypad on the frame, sign above, caged red lamp
  S("paintedMetal", xc + fw / 2 - 0.32, xc + fw / 2 - 0.1, 1.12, 1.46, 0.14, 0.19, { color: IMP.black, texel: 2 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) led(kit, (r + c) % 2 ? RED : OFF, xc + fw / 2 - 0.27 + c * 0.06, H(1.18 + r * 0.09), zFace + sign * 0.19, "z", sign, 0.03);
  wallSignZ(kit, zFace, sign, xc - 0.5, xc + 0.5, H(fh + 0.1), H(fh + 0.6), "hatch");
  S(RED, xc - 0.08, xc + 0.08, fh + 0.7, fh + 0.8, 0, 0.1);
  for (let k = 0; k < 3; k++) S("metal", xc - 0.1 + k * 0.1 - 0.008, xc - 0.1 + k * 0.1 + 0.008, fh + 0.66, fh + 0.84, 0.1, 0.12, { color: IMP.mid });
  S("metal", xc - 0.12, xc + 0.12, fh + 0.66, fh + 0.84, 0.12, 0.125, { color: IMP.mid });
  // floor demarcation in front of the hatch
  const zf0 = Math.min(zFace + sign * 0.26, zFace + sign * 1.1);
  const zf1 = Math.max(zFace + sign * 0.26, zFace + sign * 1.1);
  kit.boxMM("paintedMetal", [xc - 1.0, H(0), zf0], [xc + 1.0, H(0.006), zf1], { color: IMP.black, texel: 1 });
  floorFrame(kit, xc - 1.0, xc + 1.0, zf0, zf1, H(0.006));
  kit.collider([xc - fw / 2, y0, Math.min(zFace, zFace + sign * 0.3)], [xc + fw / 2, H(fh), Math.max(zFace, zFace + sign * 0.3)], "hatch");
}

// ---------------------------------------------------------------------------------------------------------------
// Ducts, pipes, trays, ceiling, floor guides
// ---------------------------------------------------------------------------------------------------------------

/** Rectangular duct along x or z with flanges and slatted grilles on the face at grilleFace (= c0 or c1). */
export function duct(kit, a, b, y0, y1, c0, c1, { alongX = true, flangeEvery = 1.6, grilles = [], grilleFace = null } = {}) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const mm = (l0, l1, yy0, yy1, cc0, cc1) => (alongX ? [[l0, yy0, cc0], [l1, yy1, cc1]] : [[cc0, yy0, l0], [cc1, yy1, l1]]);
  const bx = (mat, l0, l1, yy0, yy1, cc0, cc1, opts) => {
    const [mn, mx] = mm(l0, l1, yy0, yy1, cc0, cc1);
    kit.boxMM(mat, mn, mx, opts);
  };
  bx("metalRough", lo, hi, y0, y1, c0, c1, { color: IMP.mid, texel: 1 });
  for (let l = lo + 0.4; l < hi - 0.2; l += flangeEvery) bx("metal", l - 0.025, l + 0.025, y0 - 0.03, y1 + 0.03, c0 - 0.03, c1 + 0.03, { color: IMP.dark, texel: 2 });
  for (const gl of grilles) {
    const outward = grilleFace === c0 ? -1 : 1;
    const face = grilleFace === c0 ? c0 : c1;
    const gw = 0.7;
    const gh = (y1 - y0) * 0.6;
    const gy = (y0 + y1) / 2;
    bx("paintedMetal", gl - gw / 2, gl + gw / 2, gy - gh / 2, gy + gh / 2, Math.min(face, face + outward * 0.03), Math.max(face, face + outward * 0.03), { color: IMP.dark, texel: 1 });
    const s0 = Math.min(face + outward * 0.03, face + outward * 0.04);
    const s1 = Math.max(face + outward * 0.03, face + outward * 0.04);
    const n = Math.floor(gh / 0.05);
    for (let k = 0; k < n; k++) bx("metal", gl - gw / 2 + 0.05, gl + gw / 2 - 0.05, gy - gh / 2 + 0.03 + k * 0.05, gy - gh / 2 + 0.04 + k * 0.05, s0, s1, { color: IMP.black });
    led(kit, RED, alongX ? gl + gw / 2 - 0.06 : face + outward * 0.03, gy + gh / 2 + 0.05, alongX ? face + outward * 0.03 : gl + gw / 2 - 0.06, alongX ? "z" : "x", outward, 0.02);
  }
}

/** Pipe run with brackets (and stand-offs to a wall at wallC) along x or z. */
export function pipe(kit, a, b, y, c, r, { alongX = true, color = IMP.steel, bracketEvery = 2.0, wallC = null } = {}) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (alongX) kit.cyl("metal", (lo + hi) / 2, y, c, r, hi - lo, "x", { color, segments: 10 });
  else kit.cyl("metal", c, y, (lo + hi) / 2, r, hi - lo, "z", { color, segments: 10 });
  for (let l = lo + 0.5; l < hi - 0.2; l += bracketEvery) {
    if (alongX) kit.box("paintedMetal", l, y, c, 0.08, r * 2 + 0.06, r * 2 + 0.06, { color: IMP.dark, texel: 2 });
    else kit.box("paintedMetal", c, y, l, r * 2 + 0.06, r * 2 + 0.06, 0.08, { color: IMP.dark, texel: 2 });
    if (wallC !== null) {
      const cw = Math.min(c, wallC);
      const cw1 = Math.max(c, wallC);
      if (alongX) kit.boxMM("paintedMetal", [l - 0.02, y - 0.02, cw], [l + 0.02, y + 0.02, cw1], { color: IMP.dark });
      else kit.boxMM("paintedMetal", [cw, y - 0.02, l - 0.02], [cw1, y + 0.02, l + 0.02], { color: IMP.dark });
    }
  }
}

/** Cable tray (U-channel with ribs, cables, hanger rods to ceilY) from a to b ([x,z]) at height y. */
export function cableTray(kit, a, b, y, ceilY, { w = 0.36, hangEvery = 2.2, ribEvery = 0.5, cables = 3, seed = 1 } = {}) {
  const rand = rng(seed);
  const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
  const lo = alongX ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]);
  const hi = alongX ? Math.max(a[0], b[0]) : Math.max(a[1], b[1]);
  const c = alongX ? a[1] : a[0];
  const len = hi - lo;
  const bx = (mat, l0, l1, y0, y1, c0, c1, opts) => {
    const [mn, mx] = alongX ? [[l0, y0, c0], [l1, y1, c1]] : [[c0, y0, l0], [c1, y1, l1]];
    kit.boxMM(mat, mn, mx, opts);
  };
  bx("metal", lo, hi, y, y + 0.02, c - w / 2, c + w / 2, { color: IMP.mid, texel: 2 });
  bx("metal", lo, hi, y, y + 0.09, c - w / 2, c - w / 2 + 0.02, { color: IMP.dark, texel: 2 });
  bx("metal", lo, hi, y, y + 0.09, c + w / 2 - 0.02, c + w / 2, { color: IMP.dark, texel: 2 });
  for (let l = lo + 0.25; l < hi; l += ribEvery) bx("metal", l - 0.015, l + 0.015, y + 0.02, y + 0.035, c - w / 2 + 0.02, c + w / 2 - 0.02, { color: IMP.mid });
  const cols = [IMP.black, IMP.dark, IMP.black, IMP.mid];
  for (let k = 0; k < cables; k++) {
    const off = -w / 2 + 0.07 + (k * (w - 0.14)) / Math.max(1, cables - 1) + (rand() - 0.5) * 0.02;
    const r = 0.012 + rand() * 0.012;
    if (alongX) kit.cyl("paintedMetal", (lo + hi) / 2, y + 0.02 + r, c + off, r, len - 0.1, "x", { color: cols[k % cols.length], segments: 6 });
    else kit.cyl("paintedMetal", c + off, y + 0.02 + r, (lo + hi) / 2, r, len - 0.1, "z", { color: cols[k % cols.length], segments: 6 });
  }
  if (ceilY > y + 0.15)
    for (let l = lo + 0.6; l < hi - 0.3; l += hangEvery) {
      for (const s of [-1, 1]) {
        const cc = c + s * (w / 2 - 0.03);
        if (alongX) kit.cyl("metal", l, (y + 0.09 + ceilY) / 2, cc, 0.012, ceilY - y - 0.09, "y", { color: IMP.mid, segments: 6 });
        else kit.cyl("metal", cc, (y + 0.09 + ceilY) / 2, l, 0.012, ceilY - y - 0.09, "y", { color: IMP.mid, segments: 6 });
      }
      bx("metal", l - 0.04, l + 0.04, y + 0.09, y + 0.12, c - w / 2 - 0.02, c + w / 2 + 0.02, { color: IMP.dark });
    }
}

/** Corner duct riser (floor to ceiling) with a foot plate and flanges. */
export function riser(kit, R, x0, x1, z0, z1) {
  const { y0, ceilY } = R;
  kit.boxMM("paintedMetal", [x0 - 0.03, y0, z0 - 0.03], [x1 + 0.03, y0 + 0.2, z1 + 0.03], { color: IMP.black, texel: 1 });
  kit.boxMM("metalRough", [x0, y0 + 0.2, z0], [x1, ceilY, z1], { color: IMP.mid, texel: 1 });
  for (const yy of [1.1, 2.3, 3.1]) kit.boxMM("metal", [x0 - 0.02, y0 + yy, z0 - 0.02], [x1 + 0.02, y0 + yy + 0.05, z1 + 0.02], { color: IMP.dark, texel: 2 });
  kit.collider([x0 - 0.03, y0, z0 - 0.03], [x1 + 0.03, ceilY, z1 + 0.03], "riser");
}

/**
 * Ceiling structure under the shell ceiling: beams across x (at z) and along z (at x), red downlight housings at
 * the given positions, the hung light fixture over the table (rectangular housing with red emissive panels).
 */
export function ceilingStructure(kit, R, x0, x1, z0, z1, { beamsZ = [], beamsX = [], downlights = [], fixture = null } = {}) {
  const { ceilY } = R;
  for (const z of beamsZ) {
    kit.boxMM("paintedMetal", [x0, ceilY - 0.28, z - 0.12], [x1, ceilY, z + 0.12], { color: IMP.dark, texel: 1 });
    kit.boxMM("metal", [x0, ceilY - 0.31, z - 0.18], [x1, ceilY - 0.28, z + 0.18], { color: IMP.mid, texel: 2 });
    for (let x = x0 + 1; x < x1 - 0.5; x += 2) {
      kit.box("metal", x, ceilY - 0.32, z - 0.14, 0.05, 0.02, 0.05, { color: IMP.steel });
      kit.box("metal", x, ceilY - 0.32, z + 0.14, 0.05, 0.02, 0.05, { color: IMP.steel });
    }
    // red running light along the beam soffit
    kit.boxMM(RED, [x0 + 0.4, ceilY - 0.315, z - 0.01], [x1 - 0.4, ceilY - 0.31, z + 0.01]);
  }
  for (const x of beamsX) {
    kit.boxMM("paintedMetal", [x - 0.1, ceilY - 0.24, z0], [x + 0.1, ceilY, z1], { color: IMP.dark, texel: 1 });
    kit.boxMM("metal", [x - 0.15, ceilY - 0.26, z0], [x + 0.15, ceilY - 0.24, z1], { color: IMP.mid, texel: 2 });
  }
  for (const [x, , z] of downlights) {
    kit.box("metalRough", x, ceilY - 0.06, z, 0.5, 0.12, 0.5, { color: IMP.mid, texel: 2 });
    kit.box("paintedMetal", x, ceilY - 0.125, z, 0.4, 0.02, 0.4, { color: IMP.black, texel: 2 });
    kit.box(RED, x, ceilY - 0.13, z, 0.26, 0.012, 0.26);
    for (const dd of [-0.09, 0, 0.09]) kit.box("metalRough", x + dd, ceilY - 0.14, z, 0.012, 0.03, 0.32, { color: IMP.dark });
  }
  if (fixture) {
    const { x, z, w, d } = fixture;
    const yb = ceilY - 0.46; // housing bottom
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.cyl("metal", x + (sx * (w - 0.4)) / 2, (yb + 0.16 + ceilY) / 2, z + (sz * (d - 0.4)) / 2, 0.015, ceilY - yb - 0.16, "y", { color: IMP.mid, segments: 6 });
    kit.boxMM("paintedMetal", [x - w / 2, yb, z - d / 2], [x + w / 2, yb + 0.16, z + d / 2], { color: IMP.dark, texel: 1 });
    kit.boxMM("metal", [x - w / 2 - 0.02, yb + 0.16, z - d / 2 - 0.02], [x + w / 2 + 0.02, yb + 0.19, z + d / 2 + 0.02], { color: IMP.mid, texel: 2 });
    kit.boxMM("paintedMetal", [x - w / 2 + 0.06, yb - 0.005, z - d / 2 + 0.06], [x + w / 2 - 0.06, yb, z + d / 2 - 0.06], { color: IMP.black, texel: 2 });
    // louvred underside: a dark gloss diffuser with five thin red strips across it (large red panels here read as
    // one glowing slab and flattened the whole room)
    kit.boxMM("darkGloss", [x - w / 2 + 0.08, yb - 0.008, z - d / 2 + 0.08], [x + w / 2 - 0.08, yb - 0.002, z + d / 2 - 0.08]);
    for (let j = 0; j < 5; j++) {
      const pz = z - (d - 0.5) / 2 + (j * (d - 0.5)) / 4;
      kit.boxMM(RED, [x - w / 2 + 0.2, yb - 0.014, pz - 0.012], [x + w / 2 - 0.2, yb - 0.006, pz + 0.012]);
    }
    for (let i = 0; i < 4; i++) {
      const px = x - w / 2 + 0.2 + (i * (w - 0.4)) / 3;
      kit.boxMM("metal", [px - 0.02, yb - 0.02, z - d / 2 + 0.1], [px + 0.02, yb, z + d / 2 - 0.1], { color: IMP.dark });
    }
    // camera dome at the centre with a steel collar
    const dome = new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    kit.add(OFF, dome, { pos: [x, yb - 0.02, z], uv: "keep" });
    kit.cyl("metal", x, yb - 0.02, z, 0.18, 0.03, "y", { color: IMP.steel, segments: 16 });
    // red edge strip around the housing
    kit.boxMM(RED, [x - w / 2 - 0.006, yb + 0.03, z - d / 2 - 0.006], [x + w / 2 + 0.006, yb + 0.05, z + d / 2 + 0.006]);
  }
}

/** Floor guide plate (black) with red edge lines along its long axis and optional cross bars at x positions. */
export function floorPath(kit, y0, x0, x1, z0, z1, { bars = [] } = {}) {
  kit.boxMM("paintedMetal", [x0, y0, z0], [x1, y0 + 0.012, z1], { color: IMP.black, texel: 1 });
  kit.boxMM(RED, [x0 + 0.1, y0 + 0.012, z0 + 0.02], [x1 - 0.1, y0 + 0.018, z0 + 0.05]);
  kit.boxMM(RED, [x0 + 0.1, y0 + 0.012, z1 - 0.05], [x1 - 0.1, y0 + 0.018, z1 - 0.02]);
  for (const bx of bars) kit.boxMM(RED, [bx - 0.02, y0 + 0.012, z0 + 0.15], [bx + 0.02, y0 + 0.018, z1 - 0.15]);
}

/** Red floor strip (thin emissive line) along x or z. */
export function floorLine(kit, y0, a, b, c, { alongX = true, w = 0.03 } = {}) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (alongX) kit.boxMM(RED, [lo, y0, c - w / 2], [hi, y0 + 0.006, c + w / 2]);
  else kit.boxMM(RED, [c - w / 2, y0, lo], [c + w / 2, y0 + 0.006, hi]);
}

export { pick };
