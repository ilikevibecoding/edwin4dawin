// Medical bay: a four-bed ward along the forward wall (treatment beds under articulated ceiling
// scanner arms, headwall gas panels and blue diagnostic screens, frosted privacy partitions), a
// bacta tank on a plinth against the port wall with its monitoring console and overhead pipe work,
// a glazed surgical suite with an operating table under a five-disc surgical light, medicine cabinets
// with frosted doors and stencils, a scrub sink, a lab bench with analysers, a duty desk, crash cart
// and a parked gurney by the door. White-blue clean lighting: the brightest room on the deck.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, wallLightBar } from "../shell.js";
import { pointLight } from "../lib.js";
import { rng } from "../../kit.js";
import { counter, wallScreen, stencil, pipeRun, hazardBand, lockerRun, Frosted } from "./crewFwdKit.js";

const BED_U = [2.4, 5.6, 8.8, 12.0]; // bed centres along the forward wall (u = x - x0)
const PART_U = [4.0, 7.2, 10.4, 13.6]; // privacy partitions between / after the beds
const TANK = { x: -19.6, z: 517 }; // main tank: terminus of the walkway from the door
const TANK2 = { x: -8.0, z: 513.9 }; // second tank in the door sightline, between the ward and the walkway
const OP = { x: -13.0, z: 522.2 };

// Axis-aligned frosted sheet expressed in a wall frame (u, v, n) -> world box.
function frostedBox(frosted, f, u, v, n, su, sv, sn) {
  const c = f.pos(u, v, n);
  const sx = Math.abs(f.U.x) * su + Math.abs(f.V.x) * sv + Math.abs(f.N.x) * sn;
  const sy = Math.abs(f.U.y) * su + Math.abs(f.V.y) * sv + Math.abs(f.N.y) * sn;
  const sz = Math.abs(f.U.z) * su + Math.abs(f.V.z) * sv + Math.abs(f.N.z) * sn;
  frosted.box(c.x, c.y, c.z, sx, sy, sz);
}

// Slab tilted back by `tilt` (about the wall axis) carrying a flush screen on its raised face.
function tiltedScreen(f, u, v, n, w, hgt, tilt, mat = "screen4") {
  f.box("satinBlack", u, v, n, w + 0.06, 0.03, hgt + 0.06, { tilt });
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  f.box(mat, u, v + 0.018 * c, n + 0.018 * s, w, 0.006, hgt, { tilt, uv: "keep" });
}

// Treatment bed with its head at the wall (n = 0.3): cast pedestal, platform at 0.78 m with a raised,
// tilted head section, white mattress, blanket and pillow, fold-up side rails, a monitor on an
// articulated arm at the head, foot-end control pad, headwall unit and diagnostic screen above.
function treatmentBed(f, u, idx) {
  const W = 0.9;
  const L = 2.1;
  const n0 = 0.3;
  const nc = n0 + L / 2;
  const P = 0.78;
  const t = 0.55; // head section tilt
  const ct = Math.cos(t);
  const st = Math.sin(t);
  // pedestal
  f.box("metal", u, 0.04, nc, 0.9, 0.08, 1.4, { color: PALETTE.darkMetal, texel: 2 });
  f.box("satinBlack", u, 0.36, nc, 0.6, 0.56, 1.0);
  f.box("leds", u + 0.301, 0.5, nc, 0.006, 0.03, 0.5, { uv: "keep" });
  f.box("metal", u, 0.66, nc, 0.74, 0.06, 1.44, { color: PALETTE.gunmetal, texel: 1.5 });
  f.box("metal", u, P - 0.035, nc, W, 0.07, L, { color: PALETTE.gunmetal, texel: 1.5 });
  // flat section: mattress + blanket over the legs
  const hn = n0 + 0.74; // hinge of the head section
  const flatL = n0 + L - hn - 0.03;
  f.box("fabric", u, P + 0.06, hn + flatL / 2, W - 0.06, 0.12, flatL, { color: PALETTE.impWhite, uv: "world", texel: 2 });
  f.box("fabric", u, P + 0.145, n0 + L - 0.62, W - 0.02, 0.05, 1.05, { color: PALETTE.fabricTeal, uv: "world", texel: 3 });
  // raised head section: backboard and mattress tilted up toward the wall, pillow on top
  const hl = 0.72;
  const cN = hn - (hl / 2) * ct;
  const cV = P + 0.06 + (hl / 2) * st;
  f.box("metal", u, cV - 0.09 * ct, cN - 0.09 * st, W, 0.04, hl, { color: PALETTE.gunmetal, texel: 1.5, tilt: t });
  f.box("fabric", u, cV, cN, W - 0.06, 0.12, hl, { color: PALETTE.impWhite, uv: "world", texel: 2, tilt: t });
  f.box("fabric", u, cV + 0.1 * ct + 0.2 * st, cN + 0.1 * st - 0.2 * ct, 0.5, 0.09, 0.32, { color: PALETTE.fabricCream, uv: "world", texel: 3, tilt: t });
  // side rails on uprights
  for (const s of [-1, 1]) {
    const ru = u + s * (W / 2 + 0.05);
    f.cylN("metal", ru, P + 0.34, hn + 0.62, 0.016, 1.16, { color: PALETTE.steel, segments: 8 });
    f.cylN("metal", ru, P + 0.2, hn + 0.62, 0.012, 1.16, { color: PALETTE.steel, segments: 8 });
    for (const dn of [0.1, 1.14]) f.cylV("metal", ru, P + 0.14, hn + dn, 0.014, 0.42, { color: PALETTE.steel, segments: 8 });
  }
  // monitor arm: post at the head corner, arm over the bed, display angled toward the foot end
  const pu = u + W / 2 + 0.16;
  f.cylV("metal", pu, 0.85, n0 + 0.25, 0.03, 1.7, { color: PALETTE.steel, segments: 10 });
  f.cylV("metal", pu, 0.03, n0 + 0.25, 0.14, 0.06, { color: PALETTE.gunmetal, segments: 14 });
  f.add("metal", new THREE.SphereGeometry(0.05, 12, 8), pu, 1.72, n0 + 0.25, { color: PALETTE.gunmetal });
  f.box("metal", (pu + u + 0.1) / 2, 1.72, n0 + 0.25, pu - u - 0.1, 0.05, 0.05, { color: PALETTE.steel, texel: 2 });
  f.cylN("metal", u + 0.1, 1.72, n0 + 0.4, 0.02, 0.3, { color: PALETTE.steel, segments: 8 });
  f.cylV("metal", u + 0.1, 1.6, n0 + 0.55, 0.018, 0.24, { color: PALETTE.steel, segments: 8 });
  f.box("satinBlack", u + 0.1, 1.38, n0 + 0.56, 0.44, 0.32, 0.05, { tilt: -0.25 });
  f.box(idx % 2 ? "screen8" : "screen4", u + 0.1, 1.38 + 0.028 * Math.sin(0.25), n0 + 0.56 + 0.028 * Math.cos(0.25), 0.38, 0.26, 0.004, { uv: "keep", tilt: -0.25 });
  f.box("emitTeal", u + 0.26, 1.24, n0 + 0.6, 0.02, 0.012, 0.004, { tilt: -0.25 });
  // foot-end control pad
  f.box("satinBlack", u, P - 0.02, n0 + L + 0.03, 0.5, 0.22, 0.05);
  f.box("leds", u, P - 0.02, n0 + L + 0.056, 0.3, 0.03, 0.006, { uv: "keep" });
  // headwall: gas outlets + indicators, screen above, bed numeral and call lamp
  f.box("satinBlack", u, 1.2, 0.05, 1.0, 0.36, 0.1);
  for (let k = 0; k < 3; k++) {
    const gu = u - 0.3 + k * 0.3;
    f.cylN("metal", gu, 1.17, 0.11, 0.045, 0.03, { color: PALETTE.steel, segments: 12 });
    f.cylN("darkGloss", gu, 1.17, 0.128, 0.03, 0.01, { segments: 12 });
    f.box(k === 1 ? "emitAmber" : "emitTeal", gu, 1.32, 0.101, 0.02, 0.012, 0.006);
  }
  stencil(f, u + 0.44, 1.2, 0.14, 4, 0.101);
  wallScreen(f, u, 1.78, 0.62, 0.36, idx % 2 ? "screen4" : "screen9");
  stencil(f, u - 0.62, 2.3, 0.3, 2);
  f.box("satinBlack", u, 2.62, 0.02, 0.56, 0.07, 0.04);
  f.box("emitBlue", u, 2.62, 0.041, 0.48, 0.03, 0.006, { uv: "keep" });
  f.collider(u - W / 2 - 0.08, u + W / 2 + 0.24, 0, P + 0.4, n0, n0 + L + 0.08, "bed");
}

// Ceiling-mounted articulated scanner arm reaching over the chest of the bed at u.
function scannerArm(f, u, h) {
  const au = u + 0.62;
  const an = 1.15;
  f.cylV("satinBlack", au, h - 0.06, an, 0.17, 0.12, { segments: 20 });
  f.cylV("metal", au, h - 0.4, an, 0.045, 0.56, { color: PALETTE.steel, segments: 12 });
  f.add("metal", new THREE.SphereGeometry(0.085, 14, 10), au, h - 0.68, an, { color: PALETTE.gunmetal });
  const du = -0.57;
  const dv = -0.36;
  f.box("metal", au + du / 2, h - 0.68 + dv / 2, an, Math.hypot(du, dv), 0.08, 0.08, { spin: Math.atan2(dv, du), color: PALETTE.steel, texel: 2 });
  f.add("metal", new THREE.SphereGeometry(0.075, 14, 10), au + du, h - 0.68 + dv, an, { color: PALETTE.gunmetal });
  f.cylV("metal", au + du, h - 1.14, an, 0.035, 0.2, { color: PALETTE.steel, segments: 10 });
  const hv = h - 1.3;
  f.box("painted", u, hv, an, 0.72, 0.14, 0.42, { color: PALETTE.impWhite, uv: "keep" });
  f.box("satinBlack", u, hv - 0.08, an, 0.6, 0.03, 0.3);
  f.box("emitBlue", u, hv - 0.096, an, 0.46, 0.008, 0.06, { uv: "keep" });
  f.cylV("darkGloss", u + 0.2, hv - 0.097, an + 0.12, 0.05, 0.01, { segments: 14 });
  f.box("screen8", u, hv, an + 0.212, 0.34, 0.09, 0.004, { uv: "keep" });
  f.box("emitTeal", u + 0.28, hv + 0.03, an + 0.212, 0.02, 0.02, 0.004);
}

// Glazed privacy partition perpendicular to the wall at u, running n0..n1.
function partition(frosted, f, u, n0, n1, hTop = 1.95, hLow = 0.5) {
  const nc = (n0 + n1) / 2;
  const len = n1 - n0;
  f.box("metal", u, 0.02, nc, 0.07, 0.04, len, { color: PALETTE.darkMetal, texel: 2 });
  f.box("painted", u, 0.04 + (hLow - 0.04) / 2, nc, 0.05, hLow - 0.04, len, { color: PALETTE.impGreyDark, uv: "keep" });
  f.box("metal", u, hLow + 0.015, nc, 0.07, 0.03, len, { color: PALETTE.steel, texel: 2 });
  frostedBox(frosted, f, u, hLow + 0.03 + (hTop - hLow - 0.06) / 2, nc, 0.025, hTop - hLow - 0.06, len - 0.1);
  f.box("metal", u, hTop - 0.015, nc, 0.07, 0.03, len, { color: PALETTE.steel, texel: 2 });
  for (const n of [n0 + 0.035, n1 - 0.035]) f.cylV("metal", u, hTop / 2, n, 0.03, hTop, { color: PALETTE.steel, segments: 10 });
  f.collider(u - 0.04, u + 0.04, 0, hTop, n0, n1, "partition");
}

// Wheeled cart (drawers toward +n), optionally with a monitor on a post.
function cart(f, u, n, opts = {}) {
  const { w = 0.5, d = 0.45, h = 0.85, color = PALETTE.impWhite, screen = true } = opts;
  for (const su of [-1, 1]) for (const sn of [-1, 1]) f.cylV("rubber", u + su * (w / 2 - 0.06), 0.05, n + sn * (d / 2 - 0.06), 0.05, 0.1, { color: PALETTE.rubber, segments: 10 });
  f.box("painted", u, 0.1 + (h - 0.16) / 2, n, w, h - 0.16, d, { color, uv: "keep" });
  f.box("metal", u, h - 0.03, n, w + 0.04, 0.06, d + 0.04, { color: PALETTE.steel, texel: 2 });
  for (let k = 0; k < 3; k++) f.box("metal", u, 0.25 + k * 0.2, n + d / 2 + 0.012, w * 0.5, 0.02, 0.02, { color: PALETTE.steel });
  f.cylU("metal", u, h + 0.1, n - d / 2 + 0.04, 0.012, w, { color: PALETTE.steel, segments: 8 });
  for (const s of [-1, 1]) f.cylV("metal", u + s * (w / 2 - 0.01), h + 0.05, n - d / 2 + 0.04, 0.01, 0.1, { color: PALETTE.steel, segments: 8 });
  if (screen) {
    f.cylV("metal", u, h + 0.25, n, 0.02, 0.5, { color: PALETTE.steel, segments: 8 });
    f.box("satinBlack", u, h + 0.55, n, 0.4, 0.3, 0.05);
    f.box("screen0", u, h + 0.55, n + 0.028, 0.34, 0.22, 0.004, { uv: "keep" });
    f.box("emitTeal", u + 0.16, h + 0.42, n + 0.026, 0.02, 0.012, 0.004);
  }
  f.collider(u - w / 2, u + w / 2, 0, h + (screen ? 0.7 : 0), n - d / 2, n + d / 2, "cart");
}

function ivStand(f, u, n) {
  f.cylV("metal", u, 0.02, n, 0.24, 0.04, { color: PALETTE.gunmetal, segments: 16 });
  f.cylV("metal", u, 0.95, n, 0.013, 1.86, { color: PALETTE.steel, segments: 8 });
  f.cylU("metal", u, 1.86, n, 0.008, 0.3, { color: PALETTE.steel, segments: 6 });
  f.box("painted", u + 0.12, 1.66, n, 0.11, 0.22, 0.04, { color: PALETTE.impWhite, uv: "keep" });
  f.box("emitTeal", u + 0.12, 1.6, n + 0.021, 0.04, 0.02, 0.004);
  f.cylV("rubber", u - 0.12, 1.4, n, 0.004, 0.9, { color: PALETTE.rubber, segments: 5 });
  f.collider(u - 0.24, u + 0.24, 0, 1.9, n - 0.24, n + 0.24, "iv-stand");
}

// Medicine cabinet: solid lower doors, glazed upper section with stocked shelves, blue top band.
function medCabinet(f, frosted, u, decal, rand) {
  const w = 1.18;
  const d = 0.45;
  const h = 2.15;
  f.box("metal", u, 0.04, d / 2, w, 0.08, d, { color: PALETTE.darkMetal, texel: 2 });
  f.box("painted", u, 0.54, d / 2 - 0.02, w, 0.92, d - 0.04, { color: PALETTE.impWhite, uv: "keep" });
  for (const s of [-1, 1]) {
    f.box("painted1", u + s * (w / 4), 0.54, d - 0.01, w / 2 - 0.03, 0.82, 0.02, { color: PALETTE.impWhite, uv: "keep" });
    f.box("metal", u + s * 0.08, 0.72, d + 0.012, 0.016, 0.14, 0.014, { color: PALETTE.steel });
  }
  // upper cavity: back, sides, top; shelves with vials and cartons
  f.box("satinBlack", u, 1.55, 0.03, w - 0.06, 1.1, 0.04);
  for (const s of [-1, 1]) f.box("painted", u + s * (w / 2 - 0.02), 1.55, d / 2 - 0.02, 0.04, 1.1, d - 0.04, { color: PALETTE.impWhite, uv: "keep" });
  f.box("painted", u, 2.11, d / 2 - 0.02, w, 0.08, d - 0.04, { color: PALETTE.impWhite, uv: "keep" });
  f.box("emitWhiteSoft", u, 2.065, d / 2 + 0.02, w - 0.2, 0.01, 0.2, { uv: "keep" });
  const cols = [PALETTE.tealPaint, PALETTE.creamDark, PALETTE.impBlue, PALETTE.orange];
  for (const v of [1.06, 1.4, 1.74]) {
    f.box("metal", u, v, d / 2 - 0.02, w - 0.1, 0.02, d - 0.14, { color: PALETTE.steel, texel: 2 });
    let x = u - w / 2 + 0.1;
    while (x < u + w / 2 - 0.14) {
      if (rand() < 0.5) {
        const rr = 0.028 + rand() * 0.02;
        const hh = 0.1 + rand() * 0.12;
        f.cylV("painted", x + rr, v + 0.01 + hh / 2, d / 2 - 0.05, rr, hh, { color: cols[Math.floor(rand() * cols.length)], uv: "keep", segments: 10 });
        x += rr * 2 + 0.03;
      } else {
        const bw = 0.1 + rand() * 0.12;
        const bh = 0.08 + rand() * 0.1;
        f.box("painted", x + bw / 2, v + 0.01 + bh / 2, d / 2 - 0.05, bw, bh, 0.16, { color: rand() < 0.5 ? PALETTE.impWhite : PALETTE.cream, uv: "keep" });
        x += bw + 0.03;
      }
    }
  }
  // frosted door pane in a steel frame
  frostedBox(frosted, f, u, 1.55, d - 0.005, w - 0.14, 1.02, 0.012);
  for (const v of [1.02, 2.08]) f.box("metal", u, v, d - 0.005, w - 0.06, 0.05, 0.03, { color: PALETTE.steel, texel: 2 });
  for (const s of [-1, 1]) f.box("metal", u + s * (w / 2 - 0.045), 1.55, d - 0.005, 0.03, 1.1, 0.03, { color: PALETTE.steel, texel: 2 });
  f.box("metal", u + 0.5, 1.4, d + 0.015, 0.016, 0.16, 0.016, { color: PALETTE.steel });
  f.box("emitTeal", u - 0.5, 1.95, d + 0.012, 0.016, 0.012, 0.004);
  // blue band on top, stencil on the lower left door
  f.box("painted", u, h - 0.03, d / 2, w + 0.02, 0.06, d + 0.02, { color: PALETTE.impBlue, uv: "keep" });
  if (decal !== null) stencil(f, u - w / 4, 0.55, 0.26, decal, d + 0.012);
  f.collider(u - w / 2, u + w / 2, 0, h, 0, d + 0.02, "cabinet");
}

// Open steel rack with white / blue supply crates.
function shelving(f, u0, u1, rand) {
  const d = 0.5;
  const uc = (u0 + u1) / 2;
  const w = u1 - u0;
  for (const u of [u0 + 0.03, u1 - 0.03]) for (const n of [0.05, d - 0.05]) f.box("metal", u, 1.05, n, 0.05, 2.1, 0.05, { color: PALETTE.gunmetal, texel: 2 });
  for (const v of [0.12, 0.62, 1.12, 1.62]) {
    f.box("metal", uc, v, d / 2, w, 0.03, d, { color: PALETTE.steel, texel: 2 });
    let x = u0 + 0.08;
    while (x < u1 - 0.32) {
      const cw = 0.3 + rand() * 0.25;
      const ch = 0.2 + rand() * 0.22;
      const t = rand();
      const col = t < 0.5 ? PALETTE.impWhite : t < 0.8 ? PALETTE.impBlue : PALETTE.creamDark;
      f.box("painted", x + cw / 2, v + 0.015 + ch / 2, d / 2, cw, ch, d - 0.12, { color: col, uv: "keep" });
      if (rand() < 0.6) stencil(f, x + cw / 2, v + 0.015 + ch / 2, Math.min(cw, ch) * 0.6, [9, 6, 4][Math.floor(rand() * 3)], d - 0.06 + 0.004);
      x += cw + 0.06;
    }
  }
  f.box("metal", uc, 2.12, d / 2, w + 0.04, 0.04, d + 0.04, { color: PALETTE.gunmetal, texel: 2 });
  f.collider(u0, u1, 0, 2.15, 0, d + 0.02, "shelving");
}

function gurney(f, u, n) {
  for (const su of [-0.85, 0.85]) for (const sn of [-0.25, 0.25]) f.cylN("rubber", u + su, 0.08, n + sn, 0.08, 0.05, { color: PALETTE.rubber, segments: 12 });
  f.box("metal", u, 0.2, n, 1.6, 0.05, 0.5, { color: PALETTE.gunmetal, texel: 2 });
  for (const su of [-0.7, 0.7]) f.cylV("metal", u + su, 0.45, n, 0.025, 0.5, { color: PALETTE.steel, segments: 8 });
  f.box("metal", u, 0.72, n, 2.1, 0.06, 0.7, { color: PALETTE.gunmetal, texel: 1.5 });
  f.box("fabric", u, 0.8, n, 2.0, 0.1, 0.64, { color: PALETTE.impWhite, uv: "world", texel: 2 });
  f.box("fabric", u + 0.6, 0.88, n, 0.6, 0.06, 0.5, { color: PALETTE.fabricTeal, uv: "world", texel: 3 });
  for (const s of [-1, 1]) f.cylU("metal", u, 1.0, n + s * 0.37, 0.014, 1.4, { color: PALETTE.steel, segments: 8 });
  for (const su of [-0.65, 0.65]) for (const s of [-1, 1]) f.cylV("metal", u + su, 0.89, n + s * 0.37, 0.012, 0.22, { color: PALETTE.steel, segments: 8 });
  for (const s of [-1, 1]) f.cylN("metal", u + s * 1.08, 0.95, n, 0.014, 0.6, { color: PALETTE.steel, segments: 8 });
  f.collider(u - 1.1, u + 1.1, 0, 0.92, n - 0.38, n + 0.38, "gurney");
}

function crashCart(f, u, n) {
  const w = 0.62;
  const d = 0.5;
  const h = 0.95;
  for (const su of [-1, 1]) for (const sn of [-1, 1]) f.cylN("rubber", u + su * (w / 2 - 0.07), 0.05, n + sn * (d / 2 - 0.07), 0.05, 0.05, { color: PALETTE.rubber, segments: 10 });
  f.box("painted", u, 0.1 + (h - 0.16) / 2, n, w, h - 0.16, d, { color: PALETTE.impRed, uv: "keep" });
  f.box("metal", u, h - 0.03, n, w + 0.04, 0.06, d + 0.04, { color: PALETTE.steel, texel: 2 });
  for (let k = 0; k < 4; k++) {
    f.box("metal", u, 0.2 + k * 0.18, n + d / 2 + 0.008, w - 0.1, 0.012, 0.012, { color: PALETTE.darkMetal });
    f.box("metal", u, 0.28 + k * 0.18, n + d / 2 + 0.012, 0.2, 0.02, 0.02, { color: PALETTE.steel });
  }
  f.box("satinBlack", u - 0.1, h + 0.12, n, 0.36, 0.24, 0.3);
  f.box("screen4", u - 0.1, h + 0.14, n + 0.152, 0.2, 0.12, 0.004, { uv: "keep" });
  f.box("emitRed", u + 0.02, h + 0.03, n + 0.152, 0.03, 0.03, 0.004);
  f.cylU("metal", u - 0.1, h + 0.28, n, 0.012, 0.3, { color: PALETTE.steel, segments: 8 });
  f.box("painted", u + 0.18, h + 0.05, n, 0.12, 0.1, 0.16, { color: PALETTE.impWhite, uv: "keep" });
  stencil(f, u + 0.2, 0.86, 0.14, 13, n + d / 2 + 0.014);
  f.collider(u - w / 2, u + w / 2, 0, h + 0.3, n - d / 2, n + d / 2, "crash-cart");
}

// Bacta tank on a plinth: glass cylinder with a blue fluid volume, faint emissive core, harness,
// bubbles, capped with pipe work that runs across to the wall console.
function bactaTank(kit, fluid, y0, yTop, x0, rand, pos = TANK) {
  const { x: tx, z: tz } = pos;
  const toWall = pos === TANK;
  const gR = 0.78;
  const gH = 2.2;
  const gY = y0 + 0.5;
  kit.cyl("metal", tx, y0 + 0.04, tz, 1.28, 0.08, "y", { color: PALETTE.darkMetal, segments: 36, texel: 2 });
  kit.cyl("satinBlack", tx, y0 + 0.29, tz, 1.05, 0.42, "y", { segments: 36 });
  kit.cyl("metal", tx, y0 + 0.5, tz, 1.08, 0.06, "y", { color: PALETTE.steel, segments: 36, texel: 2 });
  kit.add("emitBlue", new THREE.TorusGeometry(0.9, 0.015, 6, 48), { pos: [tx, y0 + 0.535, tz], rot: [Math.PI / 2, 0, 0], uv: "keep" });
  kit.add("emitBlue", new THREE.TorusGeometry(1.5, 0.014, 6, 64), { pos: [tx, y0 + 0.008, tz], rot: [Math.PI / 2, 0, 0], uv: "keep" });
  hazardBandRing(kit, tx, tz, y0 + 0.2, 1.06);
  // glass, fluid, core
  kit.cyl("glass", tx, gY + gH / 2, tz, gR, gH, "y", { segments: 40, open: true });
  fluid.cyl(tx, gY + gH / 2 - 0.05, tz, gR - 0.05, gH - 0.1, 40);
  kit.cyl("emitBlueSoft", tx, gY + gH / 2, tz, 0.07, gH - 0.2, "y", { segments: 14, uv: "keep" });
  kit.cyl("darkGloss", tx, gY + 0.02, tz, gR - 0.02, 0.04, "y", { segments: 40 });
  // harness: top bar, straps and a breathing mask on a hose
  kit.cyl("metal", tx, gY + gH - 0.15, tz, 0.012, 0.7, "x", { color: PALETTE.steel, segments: 8 });
  for (const s of [-1, 1]) kit.box("rubber", tx + s * 0.32, gY + gH - 0.75, tz, 0.04, 1.2, 0.02, { color: PALETTE.rubber, uv: "world", texel: 3 });
  kit.add("rubber", new THREE.TorusGeometry(0.33, 0.02, 8, 28), { pos: [tx, gY + 1.05, tz], rot: [Math.PI / 2, 0, 0], color: PALETTE.rubber, uv: "scale", uvScale: [4, 1] });
  kit.cyl("rubber", tx, gY + gH - 0.35, tz + 0.1, 0.014, 0.5, "y", { color: PALETTE.rubber, segments: 6 });
  kit.box("darkGloss", tx, gY + gH - 0.62, tz + 0.1, 0.16, 0.12, 0.1);
  for (let i = 0; i < 24; i++) {
    const a = rand() * Math.PI * 2;
    const r = 0.15 + rand() * 0.5;
    const s = 0.018 + rand() * 0.024;
    kit.box("emitBlue", tx + r * Math.cos(a), gY + 0.15 + rand() * (gH - 0.3), tz + r * Math.sin(a), s, s, s);
  }
  // mullions and bands
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    kit.cyl("metal", tx + gR * Math.cos(a), gY + gH / 2, tz + gR * Math.sin(a), 0.035, gH, "y", { color: PALETTE.steel, segments: 10 });
  }
  for (const y of [gY + gH * 0.35, gY + gH * 0.7]) kit.cyl("metal", tx, y, tz, gR + 0.02, 0.06, "y", { open: true, segments: 40, color: PALETTE.steel });
  // cap and pipes
  const capY = gY + gH;
  kit.cyl("paintedMetal", tx, capY + 0.11, tz, 0.9, 0.22, "y", { color: PALETTE.gunmetal, segments: 36 });
  kit.cyl("metal", tx, capY + 0.25, tz, 0.55, 0.08, "y", { color: PALETTE.steel, segments: 32 });
  const capTop = capY + 0.29;
  kit.cyl("metal", tx, (capTop + yTop) / 2, tz, 0.1, yTop - capTop, "y", { color: PALETTE.steel, segments: 14 });
  for (const s of [-1, 1]) {
    const pz = tz + s * 0.3;
    kit.cyl("metal", tx, capTop + 0.06, pz, 0.06, 0.16, "y", { color: PALETTE.steel, segments: 12 });
    kit.add("metal", new THREE.SphereGeometry(0.078, 12, 8), { pos: [tx, capTop + 0.12, pz], color: PALETTE.steel });
    if (toWall) kit.cyl("metal", (tx + x0) / 2, capTop + 0.12, pz, 0.06, tx - x0, "x", { color: PALETTE.steel, segments: 12 });
    else kit.cyl("metal", tx, (capTop + 0.12 + yTop) / 2, pz, 0.06, yTop - capTop - 0.12, "y", { color: PALETTE.steel, segments: 12 });
  }
  if (!toWall) kit.box("paintedMetal", tx, yTop - 0.15, tz, 1.0, 0.3, 1.1, { color: PALETTE.gunmetal, texel: 1.5 });
  for (const k of [0, 1, 2]) kit.box("emitBlue", tx + 0.86, capY + 0.11, tz - 0.12 + k * 0.12, 0.03, 0.03, 0.05);
  kit.collider([tx - 1.1, y0, tz - 1.1], [tx + 1.1, y0 + 3.0, tz + 1.1], "bacta-tank");
}

// Yellow/black band wrapped around a plinth (open cylinder, world UVs keep the stripe pitch).
function hazardBandRing(kit, x, z, y, r) {
  kit.cyl("hazard", x, y, z, r, 0.08, "y", { open: true, segments: 36, color: new THREE.Color(1.05, 2.3, 0.35), uv: "scale", uvScale: [2 * Math.PI * r * 4, 0.3] });
}

function opTable(kit, y0) {
  const { x, z } = OP;
  kit.box("metal", x, y0 + 0.04, z, 1.0, 0.08, 0.7, { color: PALETTE.darkMetal, texel: 2 });
  kit.box("satinBlack", x, y0 + 0.4, z, 0.6, 0.64, 0.5);
  kit.cyl("metal", x, y0 + 0.75, z, 0.12, 0.1, "y", { color: PALETTE.steel, segments: 20 });
  kit.box("metal", x, y0 + 0.83, z, 2.0, 0.06, 0.7, { color: PALETTE.gunmetal, texel: 1.5 });
  kit.box("fabric", x, y0 + 0.885, z, 1.9, 0.05, 0.62, { color: PALETTE.impWhite, uv: "world", texel: 2 });
  for (const s of [-1, 1]) kit.cyl("metal", x, y0 + 0.86, z + s * 0.37, 0.014, 1.8, "x", { color: PALETTE.steel, segments: 8 });
  kit.box("fabric", x + 0.2, y0 + 0.88, z + 0.5, 0.6, 0.04, 0.22, { color: PALETTE.impWhite, uv: "world", texel: 2 });
  kit.box("satinBlack", x + 0.3, y0 + 0.5, z + 0.265, 0.3, 0.14, 0.03);
  kit.box("leds", x + 0.3, y0 + 0.5, z + 0.283, 0.2, 0.02, 0.006, { uv: "keep" });
  kit.collider([x - 1.0, y0, z - 0.4], [x + 1.0, y0 + 0.9, z + 0.62], "op-table");
}

// Five-disc surgical light cluster on an articulated ceiling arm; the head ends up centred on (hx, z).
function surgicalLight(kit, hx, yTop, z) {
  const dx = 0.5;
  const x = hx - dx;
  kit.cyl("satinBlack", x, yTop - 0.06, z, 0.22, 0.12, "y", { segments: 24 });
  kit.cyl("metal", x, yTop - 0.36, z, 0.05, 0.5, "y", { color: PALETTE.steel, segments: 12 });
  kit.add("metal", new THREE.SphereGeometry(0.09, 14, 10), { pos: [x, yTop - 0.62, z], color: PALETTE.gunmetal });
  const dy = -0.28;
  kit.box("metal", x + dx / 2, yTop - 0.62 + dy / 2, z, Math.hypot(dx, dy), 0.07, 0.07, { rot: [0, 0, Math.atan2(dy, dx)], color: PALETTE.steel, texel: 2 });
  kit.add("metal", new THREE.SphereGeometry(0.08, 14, 10), { pos: [hx, yTop - 0.9, z], color: PALETTE.gunmetal });
  kit.cyl("metal", hx, yTop - 1.0, z, 0.035, 0.2, "y", { color: PALETTE.steel, segments: 10 });
  const hy = yTop - 1.15;
  kit.cyl("satinBlack", hx, hy, z, 0.52, 0.1, "y", { segments: 32 });
  kit.cyl("metal", hx, hy + 0.06, z, 0.3, 0.04, "y", { color: PALETTE.steel, segments: 24 });
  for (let k = 0; k < 5; k++) {
    const a = (k * Math.PI * 2) / 5;
    kit.cyl("emitWhiteSoft", hx + 0.3 * Math.cos(a), hy - 0.055, z + 0.3 * Math.sin(a), 0.14, 0.012, "y", { segments: 20, uv: "keep" });
  }
  kit.cyl("emitWhiteSoft", hx, hy - 0.055, z, 0.12, 0.012, "y", { segments: 20, uv: "keep" });
  kit.cyl("metal", hx, hy - 0.16, z, 0.02, 0.2, "y", { color: PALETTE.steel, segments: 8 });
}

export function build(kit, ctx, room, lib) {
  const { x0, x1, z0, z1, height: h } = room;
  const shell = roomShell(kit, ctx, room, {
    style: "light",
    lights: false,
    lightMat: "emitCoolSoft",
    lightRows: 3,
    floorColor: PALETTE.impGrey,
    seed: 91,
  });
  const { y0, yTop, frames } = shell;
  const rand = rng(9021);
  const frosted = new Frosted(ctx, { opacity: 0.36, color: 0xc4d2dc });
  const fluid = new Frosted(ctx, { opacity: 0.3, color: 0x3d8cff, roughness: 0.2 });
  fluid.material.emissive = new THREE.Color(0x0d2a5c);

  // ------------------------------------------------------------ forward wall: the ward
  {
    const { frame: f } = frames["-z"]; // u = x - x0, N = +z
    BED_U.forEach((u, i) => {
      treatmentBed(f, u, i);
      scannerArm(f, u, h);
      cart(f, u - 0.95, 1.95, { screen: i % 2 === 0 });
      ivStand(f, u + 0.72, 1.6);
    });
    for (const u of PART_U) partition(frosted, f, u, 0.2, 1.9);
    // corner past the last bay: waste unit and a wall comm panel
    f.box("satinBlack", 18.3, 0.45, 0.3, 0.5, 0.9, 0.5);
    f.box("metal", 18.3, 0.91, 0.3, 0.52, 0.03, 0.52, { color: PALETTE.steel, texel: 2 });
    f.box("painted", 18.3, 0.6, 0.556, 0.36, 0.08, 0.01, { color: PALETTE.impRed, uv: "keep" });
    stencil(f, 18.3, 0.35, 0.2, 13, 0.556);
    f.collider(18.05, 18.55, 0, 0.95, 0, 0.56, "waste");
    wallScreen(f, 17.2, 1.75, 0.6, 0.36, "screen7");
    wallScreen(f, 18.9, 1.75, 0.5, 0.32, "screen0");
    stencil(f, 15.6, 2.0, 0.3, 0);
    wallLightBar(f, 14.8, 19.4, 2.62, "emitWhiteSoft");
  }

  // ------------------------------------------------------------ aft wall: cabinets, scrub sink, surgical suite, lab
  {
    const { frame: f } = frames["+z"]; // u = x1 - x, N = -z
    const decals = [4, 13, 9, 6, 4];
    for (let i = 0; i < 5; i++) medCabinet(f, frosted, 1.5 + i * 1.2, decals[i], rand);
    wallLightBar(f, 0.9, 6.9, 2.62, "emitWhiteSoft");
    // scrub sink
    counter(f, 7.1, 8.5, { h: 0.9, d: 0.6, color: PALETTE.impWhite, doorW: 0.7 });
    f.box("metal", 7.8, 0.93, 0.3, 0.96, 0.02, 0.5, { color: PALETTE.steel, texel: 2 });
    f.box("darkGloss", 7.8, 0.942, 0.3, 0.86, 0.012, 0.42);
    f.cylV("metal", 7.8, 1.05, 0.08, 0.016, 0.3, { color: PALETTE.steel, segments: 8 });
    f.cylN("metal", 7.8, 1.2, 0.17, 0.014, 0.2, { color: PALETTE.steel, segments: 8 });
    f.box("metal", 7.8, 1.3, 0.02, 1.4, 0.7, 0.03, { color: PALETTE.steel, texel: 1.5 });
    f.box("painted", 7.3, 1.35, 0.08, 0.1, 0.2, 0.1, { color: PALETTE.creamDark, uv: "keep" });
    f.box("emitTeal", 7.3, 1.42, 0.132, 0.03, 0.012, 0.004);
    f.box("painted", 8.3, 1.5, 0.08, 0.3, 0.36, 0.14, { color: PALETTE.impWhite, uv: "keep" });
    f.box("darkGloss", 8.3, 1.36, 0.152, 0.22, 0.03, 0.004);
    stencil(f, 7.8, 1.92, 0.24, 12, 0.036);
    // surgical suite backdrop
    f.box("satinBlack", 10.0, 1.6, 0.12, 1.5, 0.9, 0.24);
    for (let k = 0; k < 6; k++) f.box("metal", 9.5 + k * 0.2, 1.45 + (k % 2) * 0.25, 0.2, 0.03, 0.3, 0.02, { color: PALETTE.steel });
    frostedBox(frosted, f, 10.0, 1.6, 0.245, 1.36, 0.76, 0.01);
    for (const s of [-1, 1]) f.box("metal", 10.0 + s * 0.71, 1.6, 0.245, 0.03, 0.82, 0.03, { color: PALETTE.steel });
    for (const v of [1.19, 2.01]) f.box("metal", 10.0, v, 0.245, 1.45, 0.03, 0.03, { color: PALETTE.steel });
    f.box("metal", 10.5, 1.6, 0.262, 0.014, 0.16, 0.014, { color: PALETTE.steel });
    f.box("satinBlack", 12.0, 1.3, 0.06, 1.0, 0.5, 0.12);
    for (let k = 0; k < 3; k++) {
      const gu = 11.7 + k * 0.3;
      f.cylN("metal", gu, 1.25, 0.13, 0.045, 0.03, { color: PALETTE.steel, segments: 12 });
      f.cylN("darkGloss", gu, 1.25, 0.148, 0.03, 0.01, { segments: 12 });
      f.box(k === 2 ? "emitAmber" : "emitTeal", gu, 1.44, 0.121, 0.02, 0.012, 0.006);
    }
    stencil(f, 12.42, 1.3, 0.14, 4, 0.121);
    wallScreen(f, 12.3, 2.0, 0.7, 0.4, "screen4");
    stencil(f, 9.1, 2.25, 0.3, 13);
    wallLightBar(f, 9.0, 13.0, 2.62, "emitWhiteSoft");
    for (const u of [8.8, 13.2]) partition(frosted, f, u, 0.15, 2.6, 2.0, 0.45);
    // lab bench
    counter(f, 13.6, 19.4, { h: 0.9, d: 0.65, color: PALETTE.impWhite, doorW: 0.72 });
    f.box("satinBlack", 14.3, 1.2, 0.36, 0.7, 0.54, 0.5);
    f.box("screen9", 14.3, 1.3, 0.612, 0.42, 0.22, 0.004, { uv: "keep" });
    f.box("leds", 14.3, 1.08, 0.612, 0.4, 0.03, 0.006, { uv: "keep" });
    f.box("darkGloss", 14.3, 0.98, 0.612, 0.5, 0.06, 0.004);
    f.cylV("metal", 15.2, 1.05, 0.35, 0.18, 0.3, { color: PALETTE.gunmetal, segments: 20 });
    f.cylV("darkGloss", 15.2, 1.21, 0.35, 0.15, 0.02, { segments: 20 });
    f.box("emitTeal", 15.2, 1.1, 0.535, 0.02, 0.012, 0.004);
    f.box("metal", 16.0, 0.94, 0.35, 0.3, 0.02, 0.24, { color: PALETTE.gunmetal });
    f.box("metal", 16.13, 1.14, 0.25, 0.05, 0.4, 0.05, { color: PALETTE.gunmetal });
    f.cylV("metal", 15.98, 1.28, 0.36, 0.03, 0.26, { color: PALETTE.steel, segments: 10 });
    f.cylN("metal", 16.13, 1.34, 0.31, 0.02, 0.12, { color: PALETTE.steel, segments: 8 });
    f.box("metal", 16.9, 0.96, 0.33, 0.44, 0.06, 0.22, { color: PALETTE.steel, texel: 2 });
    for (let k = 0; k < 6; k++) f.cylV("painted", 16.72 + k * 0.072, 1.05, 0.33, 0.02, 0.12, { color: k % 2 ? PALETTE.tealPaint : PALETTE.cream, uv: "keep", segments: 8 });
    f.box("darkGloss", 17.7, 0.935, 0.32, 0.34, 0.012, 0.24);
    f.box("satinBlack", 18.6, 1.15, 0.36, 0.7, 0.44, 0.5);
    f.box("screen4", 18.6, 1.2, 0.612, 0.42, 0.22, 0.004, { uv: "keep" });
    f.box("emitAmber", 18.85, 0.99, 0.612, 0.02, 0.02, 0.004);
    // wall shelves with reagents above the bench, screen and stencils
    for (const v of [1.5, 1.9]) {
      f.box("metal", 15.5, v, 0.16, 3.2, 0.03, 0.3, { color: PALETTE.steel, texel: 2 });
      for (const bu of [14.1, 15.5, 16.9]) f.box("metalRough", bu, v - 0.08, 0.14, 0.04, 0.16, 0.26, { color: PALETTE.gunmetal });
      let x = 14.0;
      while (x < 16.95) {
        const rr = 0.03 + rand() * 0.03;
        const hh = 0.12 + rand() * 0.14;
        f.cylV("painted", x + rr, v + 0.015 + hh / 2, 0.16, rr, hh, { color: [PALETTE.cream, PALETTE.tealPaint, PALETTE.impBlue, PALETTE.orange][Math.floor(rand() * 4)], uv: "keep", segments: 10 });
        x += rr * 2 + 0.03 + rand() * 0.06;
      }
    }
    wallScreen(f, 18.4, 1.85, 0.7, 0.42, "screen8");
    stencil(f, 17.5, 2.2, 0.26, 9);
    stencil(f, 19.4, 1.5, 0.26, 12);
    wallLightBar(f, 13.6, 17.0, 2.62, "emitWhiteSoft");
    pipeRun(f, 0.4, 19.6, 2.92, 0.045, { color: PALETTE.steel });
  }

  // ------------------------------------------------------------ port wall: supply rack, tank console, status board
  {
    const { frame: f } = frames["-x"]; // u = z1 - z, N = +x
    shelving(f, 0.8, 4.6, rand);
    // tank monitoring console
    f.box("satinBlack", 7.0, 1.15, 0.18, 3.0, 2.3, 0.36);
    f.box("metal", 7.0, 2.33, 0.18, 3.04, 0.06, 0.4, { color: PALETTE.steel, texel: 2 });
    wallScreen(f, 7.0, 1.72, 0.9, 0.5, "screen8", { n: 0.36 });
    wallScreen(f, 6.0, 1.15, 0.5, 0.3, "screen9", { n: 0.36 });
    wallScreen(f, 8.0, 1.15, 0.5, 0.3, "screen0", { n: 0.36 });
    for (let k = 0; k < 4; k++) {
      const gu = 5.9 + k * 0.73;
      f.cylN("metal", gu, 0.7, 0.37, 0.09, 0.03, { color: PALETTE.steel, segments: 20 });
      f.cylN("darkGloss", gu, 0.7, 0.39, 0.075, 0.01, { segments: 20 });
      f.box(k === 1 ? "emitAmber" : "emitBlue", gu + 0.04, 0.74, 0.396, 0.014, 0.014, 0.004);
    }
    f.box("leds", 7.0, 0.45, 0.362, 2.4, 0.03, 0.006, { uv: "keep" });
    hazardBand(f, 5.6, 8.4, 0.2, 0.08, 0.364);
    stencil(f, 5.85, 2.1, 0.3, 13, 0.362);
    stencil(f, 8.15, 2.1, 0.3, 9, 0.362);
    for (const u of [6.2, 7.8]) f.cylV("metal", u, 2.36 + (h - 2.36) / 2, 0.18, 0.08, h - 2.36, { color: PALETTE.steel, segments: 14 });
    for (const u of [6.7, 7.3]) f.cylN("metal", u, 3.11, 0.04, 0.1, 0.08, { color: PALETTE.gunmetal, segments: 14 });
    f.collider(5.5, 8.5, 0, 2.4, 0, 0.4, "tank-console");
    // patient status board over a counter
    f.box("satinBlack", 11.3, 1.85, 0.03, 3.4, 1.2, 0.06);
    f.box("screen7", 11.0, 1.95, 0.062, 2.2, 0.8, 0.006, { uv: "keep" });
    for (const [v, m] of [[2.15, "screen9"], [1.75, "screen0"]]) f.box(m, 12.55, v, 0.062, 0.6, 0.3, 0.006, { uv: "keep" });
    f.box("leds", 11.3, 1.3, 0.062, 2.8, 0.03, 0.006, { uv: "keep" });
    counter(f, 9.6, 13.0, { h: 0.9, d: 0.6, color: PALETTE.impWhite, doorW: 0.85 });
    f.box("darkGloss", 10.3, 0.925, 0.3, 0.32, 0.012, 0.22);
    f.box("darkGloss", 11.0, 0.925, 0.36, 0.26, 0.012, 0.18);
    tiltedScreen(f, 12.1, 1.08, 0.3, 0.5, 0.3, 1.15, "screen9");
    f.cylV("painted", 9.9, 0.99, 0.4, 0.045, 0.12, { color: PALETTE.tealPaint, uv: "keep", segments: 10 });
    stencil(f, 13.5, 1.9, 0.3, 0);
    wallLightBar(f, 9.6, 13.0, 2.75, "emitWhiteSoft");
    pipeRun(f, 0.4, 5.2, 2.92, 0.045, { color: PALETTE.steel });
  }

  // ------------------------------------------------------------ starboard (door) wall: duty desk, crash cart, gurney, lockers
  {
    const { frame: f } = frames["+x"]; // u = z - z0, N = -x; door at u 6.1..7.9
    // duty desk with a chair and screens
    f.box("satinBlack", 2.5, 0.35, 0.15, 2.2, 0.68, 0.3);
    for (const du of [-1.05, 1.05]) f.box("satinBlack", 2.5 + du, 0.35, 0.45, 0.06, 0.68, 0.7);
    f.box("satinBlack", 2.5, 0.72, 0.4, 2.2, 0.06, 0.8);
    f.box("darkGloss", 2.5, 0.752, 0.4, 2.1, 0.008, 0.7);
    f.box("leds", 2.5, 0.05, 0.31, 1.6, 0.02, 0.006, { uv: "keep" });
    tiltedScreen(f, 2.0, 0.98, 0.34, 0.6, 0.38, 1.2, "screen4");
    f.box("satinBlack", 2.95, 0.775, 0.5, 0.5, 0.03, 0.2, { tilt: 0.12 });
    f.box("leds", 2.95, 0.795, 0.5, 0.4, 0.006, 0.12, { tilt: 0.12, uv: "keep" });
    f.box("darkGloss", 3.35, 0.765, 0.3, 0.26, 0.01, 0.18);
    f.cylV("metal", 2.5, 0.02, 1.0, 0.26, 0.04, { color: PALETTE.gunmetal, segments: 16 });
    f.cylV("metal", 2.5, 0.25, 1.0, 0.03, 0.42, { color: PALETTE.steel, segments: 8 });
    f.box("fabric", 2.5, 0.48, 1.0, 0.46, 0.08, 0.46, { color: PALETTE.fabricTeal, uv: "world", texel: 3 });
    f.box("fabric", 2.5, 0.78, 1.22, 0.44, 0.44, 0.06, { color: PALETTE.fabricTeal, uv: "world", texel: 3 });
    f.collider(1.4, 3.6, 0, 0.78, 0, 0.8, "desk");
    f.collider(2.27, 2.73, 0, 1.0, 0.77, 1.25, "chair");
    wallScreen(f, 2.0, 1.75, 0.8, 0.45, "screen4");
    wallScreen(f, 3.0, 1.75, 0.5, 0.32, "screen9");
    stencil(f, 3.6, 1.9, 0.26, 0);
    f.box("satinBlack", 4.6, 1.4, 0.05, 0.4, 0.6, 0.1);
    f.box("screen0", 4.6, 1.55, 0.101, 0.3, 0.16, 0.004, { uv: "keep" });
    for (const dv of [-0.05, -0.15, -0.25]) f.box("leds", 4.6, 1.4 + dv, 0.101, 0.26, 0.02, 0.004, { uv: "keep" });
    wallLightBar(f, 0.5, 5.6, 2.62, "emitWhiteSoft");
    // over the door: blue medical marker
    f.box("satinBlack", 7.0, 2.42, 0.03, 1.6, 0.16, 0.06);
    f.box("emitBlue", 7.0, 2.42, 0.062, 1.4, 0.07, 0.006, { uv: "keep" });
    stencil(f, 5.5, 2.4, 0.3, 13);
    // south of the door
    crashCart(f, 8.8, 0.32);
    gurney(f, 10.95, 0.42);
    lockerRun(f, 12.3, 13.6, { w: 0.65, h: 2.0, color: PALETTE.impWhite, band: PALETTE.impBlue, decals: [13, 4] });
    for (const u of [8.4, 9.4]) f.box("metal", u, 1.8, 0.03, 0.03, 0.05, 0.06, { color: PALETTE.steel });
    f.box("fabric", 8.4, 1.45, 0.04, 0.22, 0.65, 0.05, { color: PALETTE.impWhite, uv: "world", texel: 3 });
    wallScreen(f, 10.9, 1.8, 0.6, 0.36, "screen4");
    stencil(f, 12.0, 2.4, 0.26, 4);
    wallLightBar(f, 8.4, 12.0, 2.62, "emitWhiteSoft");
  }

  // ------------------------------------------------------------ free-standing: bacta tanks, surgical suite, floor
  bactaTank(kit, fluid, y0, yTop, x0, rand);
  bactaTank(kit, fluid, y0, yTop, x0, rand, TANK2);
  // the near tank's own monitor pedestal on the walkway side
  kit.box("satinBlack", TANK2.x + 1.5, y0 + 0.5, TANK2.z + 0.9, 0.4, 1.0, 0.45);
  kit.box("metal", TANK2.x + 1.5, y0 + 1.01, TANK2.z + 0.9, 0.42, 0.02, 0.47, { color: PALETTE.steel, texel: 2 });
  kit.box("satinBlack", TANK2.x + 1.5, y0 + 1.1, TANK2.z + 0.9, 0.36, 0.03, 0.5, { rot: [0.5, 0, 0] });
  kit.box("screen9", TANK2.x + 1.5, y0 + 1.1 + 0.018 * Math.cos(0.5), TANK2.z + 0.9 + 0.018 * Math.sin(0.5), 0.3, 0.006, 0.44, { rot: [0.5, 0, 0], uv: "keep" });
  kit.box("leds", TANK2.x + 1.5, y0 + 0.8, TANK2.z + 1.13, 0.3, 0.02, 0.006, { uv: "keep" });
  kit.collider([TANK2.x + 1.28, y0, TANK2.z + 0.65], [TANK2.x + 1.72, y0 + 1.2, TANK2.z + 1.15], "pedestal");
  // control pedestal at the foot of the walkway, facing the tank
  kit.box("satinBlack", -17.3, y0 + 0.5, 518.7, 0.45, 1.0, 0.4);
  kit.box("metal", -17.3, y0 + 1.01, 518.7, 0.47, 0.02, 0.42, { color: PALETTE.steel, texel: 2 });
  kit.box("satinBlack", -17.3, y0 + 1.1, 518.7, 0.5, 0.03, 0.36, { rot: [0, 0, -0.5] });
  kit.box("screen4", -17.3 + 0.018 * Math.sin(0.5), y0 + 1.1 + 0.018 * Math.cos(0.5), 518.7, 0.44, 0.006, 0.3, { rot: [0, 0, -0.5], uv: "keep" });
  kit.box("leds", -17.3, y0 + 0.8, 518.47, 0.3, 0.02, 0.006, { uv: "keep" });
  kit.collider([-17.55, y0, 518.5], [-17.05, y0 + 1.2, 518.9], "pedestal");

  opTable(kit, y0);
  surgicalLight(kit, OP.x, yTop, OP.z);
  // monitor / anaesthesia tower with a gas cylinder, instrument tray on a stand
  const TW = -14.4;
  kit.box("satinBlack", TW, y0 + 0.75, 523.2, 0.55, 1.5, 0.5);
  kit.box("metal", TW, y0 + 1.52, 523.2, 0.57, 0.04, 0.52, { color: PALETTE.steel, texel: 2 });
  kit.box("screen4", TW, y0 + 1.3, 522.947, 0.42, 0.26, 0.006, { uv: "keep" });
  kit.box("screen0", TW, y0 + 0.95, 522.947, 0.42, 0.22, 0.006, { uv: "keep" });
  kit.box("leds", TW, y0 + 0.7, 522.947, 0.36, 0.03, 0.006, { uv: "keep" });
  for (let k = 0; k < 4; k++) kit.cyl("metal", TW - 0.18 + k * 0.12, y0 + 0.55, 522.94, 0.025, 0.03, "z", { color: PALETTE.steel, segments: 10 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.cyl("rubber", TW + sx * 0.22, y0 + 0.05, 523.2 + sz * 0.2, 0.05, 0.05, "x", { color: PALETTE.rubber, segments: 10 });
  kit.cyl("metal", TW - 0.55, y0 + 0.45, 523.4, 0.1, 0.9, "y", { color: PALETTE.steel, segments: 16 });
  kit.cyl("painted", TW - 0.55, y0 + 0.96, 523.4, 0.1, 0.12, "y", { color: PALETTE.impBlue, uv: "keep", segments: 16 });
  kit.cyl("metal", TW - 0.55, y0 + 1.08, 523.4, 0.03, 0.12, "y", { color: PALETTE.steel, segments: 8 });
  kit.collider([TW - 0.7, y0, 522.95], [TW + 0.3, y0 + 1.55, 523.5], "tower");
  const TX = -11.35;
  kit.cyl("metal", TX, y0 + 0.02, 523.0, 0.28, 0.04, "y", { color: PALETTE.gunmetal, segments: 16 });
  kit.cyl("metal", TX, y0 + 0.5, 523.0, 0.02, 0.96, "y", { color: PALETTE.steel, segments: 8 });
  kit.box("metal", TX, y0 + 1.0, 523.0, 0.64, 0.025, 0.42, { color: PALETTE.steel, texel: 2 });
  kit.box("fabric", TX, y0 + 1.017, 523.0, 0.56, 0.01, 0.34, { color: PALETTE.impBlue, uv: "world", texel: 3 });
  for (let k = 0; k < 4; k++) kit.box("metal", TX - 0.18 + k * 0.12, y0 + 1.03, 523.0 - 0.02 + (k % 2) * 0.05, 0.02, 0.008, 0.22, { color: PALETTE.steel });
  kit.collider([TX - 0.3, y0, 522.7], [TX + 0.3, y0 + 1.05, 523.3], "tray");
  // clean-room floor pad under the table
  kit.boxMM("painted", [-15.1, y0, 520.3], [-10.9, y0 + 0.006, 523.9], { color: PALETTE.impGrey, uv: "world", texel: 1 });

  // walkway from the door to the tank with blue guide lines
  kit.boxMM("painted", [-17.7, y0, 515.85], [-2.3, y0 + 0.006, 518.15], { color: PALETTE.impGrey, uv: "world", texel: 1 });
  for (const z of [515.85, 518.15]) kit.box("emitBlue", -10.0, y0 + 0.007, z, 15.4, 0.004, 0.03);
  kit.box("emitBlue", -17.7, y0 + 0.007, 517, 0.03, 0.004, 2.33);

  // ------------------------------------------------------------ ceiling: coffers and the walkway light trough
  // Pale panels between the shell's ribs on both sides of each light channel, and a pair of dropped
  // white soffits with lit inner faces flanking the central channel over the walkway.
  {
    const w = x1 - x0;
    const n = Math.max(1, Math.floor(w / 3.2));
    const bands = [[z0 + 0.3, 512.0], [512.7, 516.15], [517.85, 521.3], [522.0, z1 - 0.3]];
    for (let i = 0; i < n; i++) {
      const xa = x0 + (w * i) / n + (i === 0 ? 0.3 : 0.22);
      const xb = x0 + (w * (i + 1)) / n - (i === n - 1 ? 0.3 : 0.22);
      for (const [za, zb] of bands) kit.boxMM("painted", [xa, yTop - 0.04, za], [xb, yTop - 0.005, zb], { color: PALETTE.impGrey, uv: "world", texel: 0.6 });
    }
    for (const [za, zb, zi] of [[516.2, 516.7, 516.705], [517.3, 517.8, 517.295]]) {
      kit.boxMM("painted", [x0 + 0.4, yTop - 0.3, za], [x1 - 0.4, yTop, zb], { color: PALETTE.impWhite, uv: "world", texel: 0.8 });
      kit.box("emitCoolSoft", (x0 + x1) / 2, yTop - 0.17, zi, x1 - x0 - 1.2, 0.18, 0.01, { uv: "keep" });
    }
    for (let x = x0 + 2.0; x < x1 - 1.0; x += 3.6) kit.box("metal", x, yTop - 0.31, 517, 0.06, 0.03, 1.62, { color: PALETTE.steel, texel: 2 });
  }

  // ------------------------------------------------------------ lights: white-blue, the brightest room on the deck
  // ward and walkway practicals hang under the shell's light channels (z 512.33 / 517), the rest under
  // the surgical light and the aft-wall light bars
  for (const x of [-17.2, -12.6, -8.0]) ctx.lights.cool.push(pointLight(0xe6f0ff, 8.0, 11, [x, yTop - 0.7, 512.33]));
  for (const x of [-6.0, -12.0, -17.0]) ctx.lights.cool.push(pointLight(0xe6f0ff, 8.0, 11, [x, yTop - 0.7, 517.0]));
  ctx.lights.cool.push(pointLight(0xffffff, 7.5, 8, [OP.x, yTop - 1.4, OP.z]));
  ctx.lights.cool.push(pointLight(0xe6f0ff, 7.0, 10, [-18.5, yTop - 0.7, 521.67]));
  ctx.lights.cool.push(pointLight(0xe6f0ff, 7.0, 10, [-6.0, yTop - 0.7, 521.67]));
  ctx.lights.teal.push(pointLight(0x4a8dff, 5.0, 7, [TANK.x, y0 + 1.6, TANK.z]));
  ctx.lights.teal.push(pointLight(0x4a8dff, 5.0, 7, [TANK2.x, y0 + 1.6, TANK2.z]));

  frosted.build("medbay-frosted");
  fluid.build("medbay-bacta-fluid");
  void lib;
  void z0;
  void z1;
  void x1;
  return shell;
}
