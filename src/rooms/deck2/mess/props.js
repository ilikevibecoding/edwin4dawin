// Mess-hall / galley props (local to d2-mess). Everything is kit-bashed through the shared placer so
// the yaw convention matches _shared/props.js: local +Z is the prop's front.
import * as THREE from "three";
import { placer, indicatorField } from "../_shared/props.js";
import { col } from "../_shared/palette.js";
import { rng } from "../../../kit.js";

const C = (PALETTE, k) => col(PALETTE, k);

// Serving counter along world X. zFront is the dining-side face; the galley side is zFront + depth.
export function servingCounter(kit, PALETTE, { x0, x1, zFront, depth = 0.8, y, h = 0.9 }) {
  const cx = (x0 + x1) / 2;
  const len = x1 - x0;
  const cz = zFront + depth / 2;
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const mid = C(PALETTE, "impMid");
  const steel = C(PALETTE, "steel");
  kit.box("paintedMetal", cx, y + h / 2, cz, len, h, depth, { color: mid, texel: 2.5 });
  kit.box("paintedMetal", cx, y + 0.06, cz, len - 0.04, 0.12, depth + 0.02, { color: black });
  const n = Math.round(len / 2);
  for (let i = 0; i < n; i++) {
    const px = x0 + (i + 0.5) * (len / n);
    kit.box("paintedMetal", px, y + 0.52, zFront - 0.012, len / n - 0.14, 0.6, 0.024, { color: dark, texel: 2.5 });
  }
  // matte plated top (painted-panel material in 1.25 m plates: smooth roughness, no worn-metal speckle,
  // so neither the fills nor the heat lamps mirror into a hotspot)
  kit.box("impPanel", cx, y + h + 0.02, cz, len + 0.06, 0.04, depth + 0.06, { color: steel, uv: "scale", uvScale: [Math.round(len / 1.25), 1] });
  // food wells: steel rim plate around a dark recess; two in three are open with food blocks in 2–3
  // colours and a serving spoon, every third is lidded (the flat grey "tray mats" read as slabs)
  const wells = Math.floor(len / 0.7);
  const foods = [0x7a5a33, 0x5f7d3a, 0xc8b892, 0x9a3a2a, 0xd9a441];
  const rand = rng(11);
  for (let i = 0; i < wells; i++) {
    const wx = x0 + 0.35 + (i + 0.5) * ((len - 0.7) / wells);
    const wz = cz + 0.12; // aft of the sneeze-guard posts
    kit.box("paintedMetal", wx, y + h + 0.05, wz, 0.56, 0.02, 0.42, { color: steel, texel: 2.5 }); // rim plate (dielectric: no lamp mirror)
    kit.box("paintedMetal", wx, y + h + 0.064, wz, 0.48, 0.008, 0.34, { color: black }); // recess floor
    for (const s of [-1, 1]) kit.box("paintedMetal", wx + s * 0.25, y + h + 0.08, wz, 0.02, 0.04, 0.38, { color: dark }); // rim walls
    for (const s of [-1, 1]) kit.box("paintedMetal", wx, y + h + 0.08, wz + s * 0.18, 0.52, 0.04, 0.02, { color: dark });
    if (i % 3 === 1) {
      kit.box("paintedMetal", wx, y + h + 0.11, wz, 0.5, 0.03, 0.36, { color: steel, texel: 2.5 }); // lid
      kit.box("paintedMetal", wx, y + h + 0.14, wz, 0.14, 0.03, 0.04, { color: dark }); // lid handle
    } else {
      const n = 2 + Math.floor(rand() * 2);
      for (let k = 0; k < n; k++) {
        const fx = wx - 0.21 + (k + 0.5) * (0.42 / n);
        kit.box("paintedMetal", fx, y + h + 0.095 + rand() * 0.02, wz + (rand() - 0.5) * 0.06, 0.42 / n - 0.03, 0.05 + rand() * 0.03, 0.2 + rand() * 0.06, { color: foods[Math.floor(rand() * foods.length)], texel: 2.5 });
      }
      kit.box("metal", wx + 0.19, y + h + 0.11, wz - 0.06, 0.025, 0.015, 0.3, { color: steel }); // serving spoon
      kit.cyl("metal", wx + 0.19, y + h + 0.11, wz - 0.24, 0.035, 0.012, "y", { color: steel, segments: 10 });
    }
    kit.box("emitAmber", wx, y + h + 0.052, wz - 0.245, 0.2, 0.006, 0.012); // "hot" lamp ahead of the rim
  }
  kit.box("emitAmber", cx, y + h - 0.14, zFront - 0.02, len - 0.4, 0.02, 0.01);
  // tray rail on brackets
  const rz = zFront - 0.28;
  kit.cyl("metal", cx, y + 0.96, rz, 0.025, len - 0.2, "x", { color: steel, segments: 10 });
  kit.cyl("metal", cx, y + 0.72, rz, 0.02, len - 0.2, "x", { color: steel, segments: 8 });
  for (let bx = x0 + 0.5; bx <= x1 - 0.4; bx += 2.0) {
    kit.box("paintedMetal", bx, y + 0.96, zFront - 0.14, 0.05, 0.05, 0.28, { color: dark });
    kit.box("paintedMetal", bx, y + 0.72, zFront - 0.14, 0.05, 0.05, 0.28, { color: dark });
  }
  // sneeze guard: glass panes on steel posts with a top rail
  const gz = zFront + 0.26;
  const panes = Math.max(1, Math.round(len / 2.5));
  for (let i = 0; i <= panes; i++) kit.cyl("metal", x0 + (i * len) / panes, y + h + 0.4, gz, 0.02, 0.72, "y", { color: steel, segments: 10 });
  for (let i = 0; i < panes; i++) kit.box("glass", x0 + (i + 0.5) * (len / panes), y + h + 0.5, gz, len / panes - 0.06, 0.42, 0.012, { uv: "keep" });
  kit.cyl("metal", cx, y + h + 0.75, gz, 0.02, len, "x", { color: steel, segments: 10 });
  kit.collider([x0, y, rz - 0.05], [x1, y + h + 0.2, zFront + depth], "counter");
}

// Heat lamp hung from a header above the serving line: stem, dark hooded housing with a steel rim, the
// amber diffuser recessed 4 cm up inside the hood so the rim shades it (no bare bright quad).
// `emit: false` leaves out the amber diffuser + "on" indicator so the room can animate them (see
// heatLampEmitters for their placement).
export function heatLamp(kit, PALETTE, x, yTop, z, { drop = 0.45, emit = true } = {}) {
  const black = C(PALETTE, "impBlack");
  const steel = C(PALETTE, "steel");
  const hy = yTop - drop - 0.08; // housing centre
  kit.box("paintedMetal", x, yTop - drop / 2, z, 0.05, drop, 0.05, { color: black });
  kit.box("paintedMetal", x, hy, z, 0.7, 0.16, 0.32, { color: black, texel: 2.5 });
  // hood lips hanging below the housing on all four sides
  for (const sz of [-1, 1]) kit.box("paintedMetal", x, hy - 0.11, z + sz * 0.145, 0.7, 0.06, 0.03, { color: black });
  for (const sx of [-1, 1]) kit.box("paintedMetal", x + sx * 0.335, hy - 0.11, z, 0.03, 0.06, 0.32, { color: black });
  kit.box("paintedMetal", x, hy - 0.14, z, 0.72, 0.012, 0.34, { color: steel }); // rim
  if (!emit) return;
  for (const e of heatLampEmitters(x, yTop, z, drop)) kit.box("emitAmber", ...e);
}

/** The two emitter boxes of a heat lamp as [cx, cy, cz, sx, sy, sz] (diffuser, dining-face indicator). */
export function heatLampEmitters(x, yTop, z, drop = 0.45) {
  const hy = yTop - drop - 0.08;
  return [
    [x, hy - 0.125, z, 0.6, 0.01, 0.22],
    [x, hy + 0.02, z - 0.165, 0.36, 0.015, 0.006],
  ];
}

// Light slot mounted on a beam face (dining side of the serving-line header): U-channel housing (top,
// bottom, back plates) with steel lips and a narrow emitter set 4.5 cm back, so it reads as a lit slot
// and not as a white bar. zFace is the FRONT of the channel; it sits against the beam behind it.
export function beamSlotLight(kit, PALETTE, x0, x1, y, zFace) {
  const black = C(PALETTE, "impBlack");
  const steel = C(PALETTE, "steel");
  const cx = (x0 + x1) / 2;
  const len = x1 - x0;
  kit.box("paintedMetal", cx, y, zFace + 0.06, len, 0.16, 0.02, { color: black, texel: 2.5 }); // back plate
  for (const s of [-1, 1]) {
    kit.box("paintedMetal", cx, y + s * 0.07, zFace + 0.04, len, 0.02, 0.08, { color: black, texel: 2.5 });
    kit.box("paintedMetal", cx, y + s * 0.09, zFace - 0.01, len, 0.02, 0.06, { color: steel });
  }
  for (const s of [-1, 1]) kit.box("paintedMetal", cx + s * (len / 2 - 0.01), y, zFace + 0.04, 0.02, 0.16, 0.08, { color: black });
  kit.box("emitWhite", cx, y, zFace + 0.045, len - 0.16, 0.03, 0.006);
}

// Alternating amber/black floor band (hazard marking without the `hazard` material key).
export function hazardBand(kit, PALETTE, min, max, y) {
  const alongX = max[0] - min[0] >= max[1] - min[1];
  const len = alongX ? max[0] - min[0] : max[1] - min[1];
  const segs = Math.max(2, Math.round(len / 0.3));
  for (let k = 0; k < segs; k++) {
    const c = k % 2 ? C(PALETTE, "impBlack") : C(PALETTE, "impAmber");
    const u0 = (alongX ? min[0] : min[1]) + (k * len) / segs;
    const u1 = u0 + len / segs;
    if (alongX) kit.boxMM("paintedMetal", [u0, y, min[1]], [u1, y + 0.005, max[1]], { color: c });
    else kit.boxMM("paintedMetal", [min[0], y, u0], [max[0], y + 0.005, u1], { color: c });
  }
}

// Beverage dispenser tower: dark cylinder, blue ring, indicator panel, spout and drip tray on +Z.
// `leds: false` draws the indicator plate without its LEDs (the room animates them, see dispenserLeds).
export function dispenserTower(kit, PALETTE, pos, yaw, seed = 3, { leds = true } = {}) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  // grey body with a black base band and steel collar so the tower reads against the dark walls
  Q.cyl("paintedMetal", 0, 0.06, 0, 0.36, 0.12, "y", { color: black, segments: 20 });
  Q.cyl("paintedMetal", 0, 0.8, 0, 0.3, 1.36, "y", { color: C(PALETTE, "impMid"), segments: 20, texel: 2.5 });
  Q.cyl("paintedMetal", 0, 0.3, 0, 0.305, 0.3, "y", { color: dark, segments: 20, texel: 2.5 });
  Q.cyl("metal", 0, 1.5, 0, 0.32, 0.06, "y", { color: steel, segments: 20 });
  Q.cyl("emitBlue", 0, 1.44, 0, 0.306, 0.04, "y", { segments: 20, open: true });
  if (leds) indicatorField(Q, 0, 1.22, 0.3, 0.36, 0.14, seed);
  else Q.box("darkGloss", 0, 1.22, 0.3, 0.36, 0.14, 0.02);
  Q.box("darkGloss", 0, 0.95, 0.31, 0.3, 0.3, 0.02);
  Q.box("emitAmber", 0.1, 1.06, 0.322, 0.05, 0.02, 0.006); // ready lamp
  Q.box("metal", 0, 1.03, 0.36, 0.06, 0.05, 0.12, { color: steel });
  Q.box("metal", 0, 0.8, 0.38, 0.34, 0.03, 0.16, { color: steel });
  Q.box("grate", 0, 0.82, 0.38, 0.3, 0.012, 0.12);
  Q.collider([-0.36, 0, -0.36], [0.36, 1.55, 0.46], "dispenser");
}

/**
 * World placement of a dispenser tower's six indicator LEDs (the plate's 6×1 grid at the same spots
 * indicatorField would use): [{ pos: [x, y, z], rot: [0, yaw, 0] }], LED size 0.022 × 0.016 × 0.006.
 */
export function dispenserLeds(pos, yaw) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const out = [];
  for (let i = 0; i < 6; i++) {
    const lx = -0.18 + 0.04 + (i + 0.5) * (0.28 / 6);
    const lz = 0.313;
    out.push({ pos: [pos[0] + lx * c + lz * s, pos[1] + 1.22, pos[2] - lx * s + lz * c], rot: [0, yaw, 0] });
  }
  return out;
}

// Galley appliance, three states so a row of them does not read as copies:
//  style "vat"  — grey box with two round black hatches, amber indicator strips, lid rims on top;
//                 `open` swings the right-hand hatch out on its hinge and shows a lit interior;
//  style "oven" — taller, narrower unit with one square door (dark window, amber glow inside), a control
//                 column and a flue on top.
// Both get recessed service panels on the side faces so the ends are not blank slabs.
export function vat(kit, PALETTE, pos, yaw, { w = 2.6, h = 1.9, d = 1.2, seed = 4, open = false, style = "vat" } = {}) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const grey = C(PALETTE, "impGrey");
  const mid = C(PALETTE, "impMid");
  const steel = C(PALETTE, "steel");
  Q.box("paintedMetal", 0, h / 2, 0, w, h, d, { color: style === "oven" ? mid : grey, texel: 2.5 });
  Q.box("paintedMetal", 0, 0.08, 0, w - 0.06, 0.16, d + 0.02, { color: black });
  Q.box("paintedMetal", 0, h + 0.03, 0, w + 0.04, 0.06, d + 0.04, { color: steel, texel: 2.5 });
  // side service panels (both ends): recessed dark panel, two latch bars, a small vent grille
  for (const sx of [-1, 1]) {
    Q.box("paintedMetal", sx * (w / 2 + 0.006), h * 0.55, 0, 0.012, h - 0.7, d - 0.3, { color: dark, texel: 2.5 });
    for (const lz of [-d / 4, d / 4]) Q.box("metal", sx * (w / 2 + 0.03), h * 0.55, lz, 0.03, 0.14, 0.03, { color: steel });
    Q.box("grate", sx * (w / 2 + 0.014), 0.5, 0, 0.012, 0.3, d - 0.5);
  }
  if (style === "oven") {
    // single square door with a dark window and an amber glow behind it
    Q.box("paintedMetal", -0.15, 0.95, d / 2 + 0.02, w - 0.7, 1.1, 0.04, { color: dark, texel: 2.5 });
    Q.box("darkGloss", -0.15, 1.05, d / 2 + 0.045, w - 1.0, 0.5, 0.01);
    Q.box("emitAmber", -0.15, 1.05, d / 2 + 0.041, w - 1.2, 0.3, 0.004);
    Q.box("metal", -0.15, 0.55, d / 2 + 0.08, w - 0.9, 0.04, 0.04, { color: steel });
    for (const sx of [-1, 1]) Q.box("metal", -0.15 + sx * (w - 0.9) / 2, 0.55, d / 2 + 0.06, 0.04, 0.04, 0.06, { color: steel });
    // control column on the right
    Q.box("paintedMetal", w / 2 - 0.3, h / 2 + 0.1, d / 2 + 0.005, 0.44, h - 0.6, 0.01, { color: black });
    indicatorField(Q, w / 2 - 0.3, h - 0.55, d / 2 + 0.012, 0.36, 0.3, seed);
    // programme screen on the column (the one appliance in the row with a display, readable from the queue)
    Q.box("darkGloss", w / 2 - 0.3, 1.3, d / 2 + 0.014, 0.4, 0.28, 0.008);
    Q.box("screenImp0", w / 2 - 0.3, 1.3, d / 2 + 0.02, 0.36, 0.24, 0.006, { uv: "keep" });
    Q.box("emitAmber", w / 2 - 0.3, 1.0, d / 2 + 0.012, 0.3, 0.03, 0.01);
    for (let i = 0; i < 3; i++) Q.cyl("metal", w / 2 - 0.42 + i * 0.12, 0.7, d / 2 + 0.04, 0.035, 0.05, "z", { color: steel, segments: 12 });
    // flue + pressure cap
    Q.cyl("metal", -0.15, h + 0.3, -d / 2 + 0.3, 0.14, 0.6, "y", { color: steel, segments: 14 });
    Q.cyl("paintedMetal", -0.15, h + 0.63, -d / 2 + 0.3, 0.18, 0.06, "y", { color: dark, segments: 14 });
    Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2 + 0.1], "oven");
    return;
  }
  for (const hx of [-w / 4, w / 4]) {
    const isOpen = open && hx > 0;
    if (isOpen) {
      // open hatch: black throat ring with a steel inner lip and a 0.3 m lit amber interior on its face
      // (the old lit disc sat inside the solid throat and never showed), door swung 100° out on its hinge
      Q.cyl("paintedMetal", hx, 1.0, d / 2 + 0.04, 0.46, 0.08, "z", { color: black, segments: 24 });
      Q.cyl("metal", hx, 1.0, d / 2 + 0.11, 0.36, 0.06, "z", { color: steel, segments: 24, open: true });
      Q.cyl("paintedMetal", hx, 1.0, d / 2 + 0.086, 0.35, 0.012, "z", { color: dark, segments: 24 });
      Q.cyl("emitAmber", hx, 1.0, d / 2 + 0.094, 0.3, 0.008, "z", { segments: 24 });
      const hingeX = hx + 0.44;
      const ang = 1.75;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Q.yaw + ang, 0));
      const dx = Math.cos(Q.yaw + ang);
      const dz = -Math.sin(Q.yaw + ang);
      const hinge = Q.world(hingeX, 1.0, d / 2 + 0.06);
      const disc = new THREE.CylinderGeometry(0.46, 0.46, 0.08, 24).rotateX(Math.PI / 2);
      const centre = [hinge[0] - dx * 0.46, hinge[1], hinge[2] - dz * 0.46];
      kit.add("paintedMetal", disc, { pos: centre, quat: q, color: black, texel: 2.5 });
      const ring = new THREE.CylinderGeometry(0.32, 0.32, 0.03, 24).rotateX(Math.PI / 2);
      const nx = Math.sin(Q.yaw + ang) * 0.05;
      const nz = Math.cos(Q.yaw + ang) * 0.05;
      kit.add("metal", ring, { pos: [centre[0] + nx, centre[1], centre[2] + nz], quat: q, color: steel });
      Q.box("metal", hingeX, 1.0, d / 2 + 0.06, 0.06, 0.34, 0.06, { color: steel }); // hinge post
      Q.collider([hingeX - 0.2, 0.5, d / 2], [hingeX + 0.2, 1.5, d / 2 + 0.95], "hatch-door");
    } else {
      Q.cyl("paintedMetal", hx, 1.0, d / 2 + 0.04, 0.46, 0.08, "z", { color: black, segments: 24 });
      Q.cyl("metal", hx, 1.0, d / 2 + 0.09, 0.32, 0.03, "z", { color: steel, segments: 24 });
      Q.box("metal", hx + 0.38, 1.0, d / 2 + 0.1, 0.06, 0.3, 0.06, { color: steel });
    }
    Q.box("emitAmber", hx, 1.6, d / 2 + 0.012, 0.6, 0.03, 0.01);
    Q.cyl("metal", hx, h + 0.1, 0, 0.42, 0.1, "y", { color: steel, segments: 24 });
    Q.cyl("paintedMetal", hx, h + 0.16, 0, 0.36, 0.06, "y", { color: dark, segments: 24 });
  }
  indicatorField(Q, 0, 1.45, d / 2 + 0.01, 0.5, 0.22, seed);
  Q.box("darkGloss", 0, 0.5, d / 2 + 0.008, 0.6, 0.3, 0.012);
  Q.box("emitRedImp", -0.2, 0.5, d / 2 + 0.016, 0.06, 0.06, 0.006);
  Q.box("emitBlue", 0.2, 0.5, d / 2 + 0.016, 0.06, 0.06, 0.006);
  Q.cyl("metal", w / 2 - 0.25, h + 0.3, -d / 2 + 0.25, 0.08, 0.6, "y", { color: steel, segments: 12 });
  Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2 + 0.12], "vat");
}

// Extraction hood (world AABB) with filter grilles on the -Z face and two under-lights.
// `tubes: false` builds the under-light channels without their emitter tubes (see hoodTubes).
export function hood(kit, PALETTE, min, max, { lamps = [0.09, 0.33, 0.69, 0.93], tubes = true } = {}) {
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const mid = C(PALETTE, "impMid");
  const grey = C(PALETTE, "impGrey");
  const steel = C(PALETTE, "steel");
  const h = max[1] - min[1];
  const len = max[0] - min[0];
  // dark core (fine world UVs) carrying clean panel plates on the end faces and the filter face: the
  // worn-metal body read as a light speckled slab from the galley aisle
  kit.boxMM("paintedMetal", min, max, { color: dark, texel: 4 });
  kit.boxMM("impPanel", [min[0] - 0.03, min[1] + 0.1, min[2] + 0.08], [min[0], max[1] - 0.1, max[2] - 0.08], { color: mid, uv: "keep" });
  kit.boxMM("impPanel", [max[0], min[1] + 0.1, min[2] + 0.08], [max[0] + 0.03, max[1] - 0.1, max[2] - 0.08], { color: mid, uv: "keep" });
  const nF = Math.max(1, Math.round(len / 1.0));
  for (let i = 0; i < nF; i++) {
    const a = min[0] + (len * i) / nF + 0.03;
    const b = min[0] + (len * (i + 1)) / nF - 0.03;
    kit.boxMM("impPanel", [a, min[1] + 0.22, min[2] - 0.03], [b, max[1] - 0.1, min[2]], { color: mid, uv: "keep" });
    // filter louvres: black recess with painted steel-grey slats (the metallic `grate` quads mirrored the
    // galley fill into a white glare from the aisle)
    const gw = b - a - 0.3;
    const gh = h - 0.55;
    const gy = (min[1] + max[1]) / 2 + 0.08;
    kit.box("paintedMetal", (a + b) / 2, gy, min[2] - 0.045, gw, gh, 0.03, { color: black });
    const nS = Math.floor(gh / 0.09);
    for (let k = 0; k < nS; k++) kit.box("paintedMetal", (a + b) / 2, gy - gh / 2 + 0.07 + k * 0.09, min[2] - 0.07, gw - 0.06, 0.035, 0.02, { color: steel });
  }
  for (const y of [min[1] + 0.18, max[1] - 0.03]) kit.boxMM("metal", [min[0] - 0.04, y - 0.03, min[2] - 0.05], [max[0] + 0.04, y + 0.03, min[2]], { color: steel }); // edge rails
  kit.boxMM("paintedMetal", [min[0] + 0.1, min[1] - 0.02, min[2] + 0.1], [max[0] - 0.1, min[1], max[2] - 0.1], { color: black });
  kit.boxMM("paintedMetal", [min[0], min[1] - 0.05, min[2] - 0.05], [max[0], min[1] + 0.15, min[2]], { color: dark, texel: 2.5 });
  // under-lights run ACROSS the hood in channels with 16 cm side walls and steel lips: from the aisle
  // (looking along the hood) the sightline meets a side wall, never the tube; a grey reflector plate
  // above a 5 cm tube gives the housing a dim rim and a narrow bright core
  const z0 = min[2] + 0.18;
  const z1 = max[2] - 0.18;
  const zc = (z0 + z1) / 2;
  const zl = z1 - z0;
  for (const f of lamps) {
    const x = min[0] + len * f;
    for (const s of [-1, 1]) kit.box("paintedMetal", x + s * 0.12, min[1] - 0.08, zc, 0.03, 0.16, zl, { color: black, texel: 2.5 });
    for (const s of [-1, 1]) kit.box("paintedMetal", x, min[1] - 0.08, zc + s * (zl / 2 - 0.015), 0.27, 0.16, 0.03, { color: black, texel: 2.5 });
    for (const s of [-1, 1]) kit.box("paintedMetal", x + s * 0.135, min[1] - 0.165, zc, 0.06, 0.02, zl + 0.04, { color: steel });
    kit.box("paintedMetal", x, min[1] - 0.025, zc, 0.2, 0.01, zl - 0.06, { color: grey });
  }
  if (tubes) for (const tb of hoodTubes(min, max, lamps)) kit.box("emitWhite", ...tb);
}

/** The hood's under-light tubes as [cx, cy, cz, sx, sy, sz] boxes. */
export function hoodTubes(min, max, lamps = [0.09, 0.33, 0.69, 0.93]) {
  const len = max[0] - min[0];
  const zc = (min[2] + max[2]) / 2;
  const zl = max[2] - min[2] - 0.36;
  return lamps.map((f) => [min[0] + len * f, min[1] - 0.045, zc, 0.05, 0.01, zl - 0.12]);
}

// Vertical square duct with flanges.
export function vertDuct(kit, PALETTE, x, z, y0, y1, w = 0.8) {
  kit.box("paintedMetal", x, (y0 + y1) / 2, z, w, y1 - y0, w, { color: C(PALETTE, "impMid"), texel: 2.5 });
  for (let y = y0 + 0.5; y < y1 - 0.2; y += 1.0) kit.box("paintedMetal", x, y, z, w + 0.08, 0.1, w + 0.08, { color: C(PALETTE, "impDark") });
}

// Steel prep island: four legs, undershelf with containers, pots and utensils on top.
export function prepIsland(kit, PALETTE, pos, yaw, { len = 2.4, w = 0.9, h = 0.9, seed = 2 } = {}) {
  const Q = placer(kit, pos, yaw);
  const rand = rng(seed);
  const steel = C(PALETTE, "steel");
  const dark = C(PALETTE, "impDark");
  const grey = C(PALETTE, "impGrey");
  Q.box("metal", 0, h - 0.03, 0, len, 0.06, w, { color: steel, texel: 1 });
  Q.box("paintedMetal", 0, h - 0.1, 0, len - 0.1, 0.08, w - 0.1, { color: dark });
  Q.box("metal", 0, 0.3, 0, len - 0.2, 0.04, w - 0.2, { color: steel, texel: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) Q.cyl("metal", sx * (len / 2 - 0.08), (h - 0.06) / 2, sz * (w / 2 - 0.08), 0.03, h - 0.06, "y", { color: steel, segments: 10 });
  for (let i = 0; i < 3; i++) Q.box("paintedMetal", -len / 2 + 0.45 + i * 0.6, 0.47, 0, 0.42, 0.3, 0.42, { color: rand() < 0.5 ? grey : dark, texel: 2.5 });
  // stock pot with a domed lid, knob and two handles; a smaller pan with a long handle
  const px = -len / 2 + 0.4;
  Q.cyl("metal", px, h + 0.13, 0.1, 0.18, 0.26, "y", { color: steel, segments: 16 });
  Q.cyl("metal", px, h + 0.275, 0.1, 0.19, 0.03, "y", { color: dark, segments: 16 });
  Q.cyl("metal", px, h + 0.305, 0.1, 0.12, 0.03, "y", { color: dark, segments: 16 });
  Q.cyl("metal", px, h + 0.34, 0.1, 0.02, 0.04, "y", { color: steel, segments: 8 });
  for (const sx of [-1, 1]) Q.box("metal", px + sx * 0.2, h + 0.2, 0.1, 0.06, 0.03, 0.08, { color: steel });
  Q.cyl("metal", px + 0.45, h + 0.05, -0.15, 0.14, 0.1, "y", { color: steel, segments: 16 });
  Q.box("metal", px + 0.68, h + 0.07, -0.15, 0.3, 0.02, 0.03, { color: dark });
  // chopping board with a dark rim, a knife, three cut pieces and a bowl
  Q.box("paintedMetal", 0.3, h + 0.02, 0, 0.5, 0.04, 0.35, { color: C(PALETTE, "impWhite") });
  Q.box("paintedMetal", 0.3, h + 0.045, 0, 0.44, 0.01, 0.29, { color: grey });
  Q.box("metal", 0.34, h + 0.055, 0.06, 0.24, 0.01, 0.03, { color: steel });
  Q.box("paintedMetal", 0.5, h + 0.055, 0.06, 0.08, 0.01, 0.025, { color: dark });
  for (let i = 0; i < 3; i++) Q.box("paintedMetal", 0.16 + i * 0.07, h + 0.06, -0.08, 0.04, 0.03, 0.04, { color: rand() < 0.5 ? C(PALETTE, "impAmber") : grey });
  Q.cyl("metal", 0.72, h + 0.05, 0.22, 0.12, 0.1, "y", { color: steel, segments: 14 });
  for (let i = 0; i < 4; i++) Q.box("metal", 0.72 + i * 0.06, h + 0.015, -0.2, 0.02, 0.03, 0.3, { color: steel });
  Q.box("darkGloss", 1.0, h + 0.05, 0.2, 0.26, 0.1, 0.22);
  Q.box("emitBlue", 1.0, h + 0.1, 0.31, 0.1, 0.01, 0.004);
  Q.collider([-len / 2, 0, -w / 2], [len / 2, h, w / 2], "prep");
}

// Open rack of stacked trays (front +Z).
export function trayRack(kit, PALETTE, pos, yaw, { w = 1.2, h = 1.8, d = 0.6, shelves = 4 } = {}) {
  const Q = placer(kit, pos, yaw);
  const dark = C(PALETTE, "impDark");
  const grey = C(PALETTE, "impGrey");
  const mid = C(PALETTE, "impMid");
  const steel = C(PALETTE, "steel");
  for (const sx of [-1, 1]) Q.box("paintedMetal", sx * (w / 2 - 0.02), h / 2, 0, 0.04, h, d, { color: dark, texel: 2.5 });
  Q.box("paintedMetal", 0, h / 2, -d / 2 + 0.02, w - 0.08, h, 0.04, { color: dark, texel: 2.5 });
  Q.box("paintedMetal", 0, h - 0.02, 0, w - 0.08, 0.04, d, { color: dark });
  for (let s = 0; s < shelves; s++) {
    const y = 0.1 + s * 0.42;
    Q.box("metal", 0, y, 0, w - 0.08, 0.03, d - 0.04, { color: steel, texel: 1 });
    const stacks = s % 2 === 0 ? [-0.28, 0.28] : [-0.28];
    for (const sx of stacks) for (let i = 0; i < 7; i++) Q.box("paintedMetal", sx, y + 0.025 + i * 0.024, 0.02, 0.46, 0.018, 0.36, { color: i % 2 ? grey : mid });
    if (s % 2 === 1) Q.box("darkGloss", 0.28, y + 0.13, 0.02, 0.4, 0.22, 0.3);
  }
  Q.box("emitAmber", -w / 2 + 0.1, h - 0.12, d / 2 + 0.002, 0.05, 0.02, 0.006);
  Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "rack");
}

// Walk-in cooler door: proud black frame, recessed dark slab with grooves, heavy handle, blue strip.
export function coolerDoor(kit, PALETTE, pos, yaw, { w = 2.0, h = 2.6 } = {}) {
  const Q = placer(kit, pos, yaw);
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  Q.box("paintedMetal", 0, h + 0.1, 0.08, w + 0.5, 0.2, 0.16, { color: black, texel: 2.5 });
  for (const sx of [-1, 1]) Q.box("paintedMetal", sx * (w / 2 + 0.15), h / 2, 0.08, 0.2, h, 0.16, { color: black, texel: 2.5 });
  Q.box("paintedMetal", 0, h / 2, 0.03, w, h, 0.06, { color: dark, texel: 2.5 });
  for (let i = 1; i < 5; i++) Q.box("paintedMetal", 0, (h * i) / 5, 0.065, w - 0.2, 0.03, 0.01, { color: black });
  Q.box("metal", w / 2 - 0.25, 1.05, 0.1, 0.08, 0.5, 0.08, { color: steel });
  Q.box("metal", w / 2 - 0.25, 1.05, 0.17, 0.05, 0.36, 0.06, { color: steel });
  Q.box("emitBlue", -w / 2 - 0.15, h / 2, 0.165, 0.04, h - 0.4, 0.01);
  Q.box("darkGloss", -w / 2 + 0.45, h - 0.35, 0.07, 0.5, 0.22, 0.02);
  Q.box("emitBlue", -w / 2 + 0.45, h - 0.35, 0.082, 0.3, 0.08, 0.006);
  Q.collider([-w / 2 - 0.25, 0, 0], [w / 2 + 0.25, h + 0.2, 0.2], "cooler");
}

// Steel sink line with basins, taps and a backsplash (back at local -Z, against a wall).
export function sinkLine(kit, PALETTE, pos, yaw, { len = 6, d = 0.7, h = 0.9, basins = 3 } = {}) {
  const Q = placer(kit, pos, yaw);
  const steel = C(PALETTE, "steel");
  const black = C(PALETTE, "impBlack");
  Q.box("metal", 0, h / 2, 0, len, h, d, { color: steel, texel: 2.5 });
  Q.box("paintedMetal", 0, 0.07, 0, len - 0.04, 0.14, d + 0.01, { color: black });
  Q.box("metal", 0, h + 0.2, -d / 2 + 0.02, len, 0.4, 0.04, { color: steel, texel: 1 });
  for (let i = 0; i < basins; i++) {
    const bx = -len / 2 + (i + 0.5) * (len / basins);
    Q.box("darkGloss", bx, h + 0.002, 0.05, len / basins - 0.4, 0.004, d - 0.3);
    Q.cyl("metal", bx, h + 0.2, -d / 2 + 0.12, 0.02, 0.4, "y", { color: steel, segments: 10 });
    Q.cyl("metal", bx, h + 0.4, -d / 2 + 0.25, 0.02, 0.3, "z", { color: steel, segments: 10 });
    Q.box("emitBlue", bx + 0.22, h + 0.3, -d / 2 + 0.045, 0.06, 0.02, 0.01);
  }
  Q.collider([-len / 2, 0, -d / 2], [len / 2, h, d / 2], "sink");
}

// Sanitiser / dishwasher unit with a hatch window, indicator panel, amber strip and a steam vent.
export function dishwasher(kit, PALETTE, pos, yaw, { w = 2.2, h = 1.9, d = 1.0, seed = 8 } = {}) {
  const Q = placer(kit, pos, yaw);
  const grey = C(PALETTE, "impGrey");
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  Q.box("paintedMetal", 0, h / 2, 0, w, h, d, { color: grey, texel: 2.5 });
  Q.box("paintedMetal", 0, 0.08, 0, w - 0.06, 0.16, d + 0.02, { color: black });
  // front: hatch window with the wash-cycle glow behind it, hatch panel + handle, control column with a
  // cycle-list screen and indicator field, a vent grille band under the top edge, steam vent on top
  Q.box("darkGloss", -0.3, 1.05, d / 2 + 0.01, 1.2, 0.5, 0.02);
  Q.box("emitAmber", -0.3, 1.0, d / 2 + 0.006, 1.0, 0.3, 0.004);
  Q.box("paintedMetal", -0.3, 1.05, d / 2 + 0.022, 1.24, 0.04, 0.008, { color: black });
  Q.box("paintedMetal", -0.3, 0.55, d / 2 + 0.012, 1.2, 0.36, 0.024, { color: dark, texel: 2.5 });
  Q.box("metal", -0.3, 0.76, d / 2 + 0.05, 0.9, 0.04, 0.04, { color: steel });
  Q.box("paintedMetal", 0.75, 1.2, d / 2 + 0.005, 0.5, 1.3, 0.01, { color: black });
  Q.box("screenImp2", 0.75, 1.62, d / 2 + 0.012, 0.36, 0.24, 0.006, { uv: "keep" });
  indicatorField(Q, 0.75, 1.3, d / 2 + 0.01, 0.4, 0.3, seed);
  for (let i = 0; i < 3; i++) Q.cyl("metal", 0.6 + i * 0.15, 0.85, d / 2 + 0.035, 0.035, 0.05, "z", { color: steel, segments: 12 });
  Q.box("grate", -0.3, h - 0.32, d / 2 + 0.008, w - 1.0, 0.16, 0.01);
  Q.box("emitAmber", 0, h - 0.12, d / 2 + 0.012, w - 0.4, 0.03, 0.01);
  Q.cyl("metal", w / 2 - 0.3, h + 0.3, 0, 0.1, 0.6, "y", { color: steel, segments: 12 });
  Q.cyl("paintedMetal", w / 2 - 0.3, h + 0.63, 0, 0.14, 0.06, "y", { color: dark, segments: 12 });
  // side faces: recessed service panel with latches, a vent grille, a coolant line with a valve, status LED
  for (const sx of [-1, 1]) {
    Q.box("paintedMetal", sx * (w / 2 + 0.006), 1.15, 0.05, 0.012, 1.1, d - 0.4, { color: dark, texel: 2.5 });
    for (const lz of [-d / 4 + 0.05, d / 4 + 0.05]) Q.box("metal", sx * (w / 2 + 0.03), 1.15, lz, 0.03, 0.14, 0.03, { color: steel });
    Q.box("grate", sx * (w / 2 + 0.014), 1.62, 0.05, 0.012, 0.2, d - 0.5);
    Q.cyl("metal", sx * (w / 2 + 0.06), 0.42, 0, 0.03, d - 0.3, "z", { color: steel, segments: 10 });
    Q.cyl("metal", sx * (w / 2 + 0.06), 0.42, -0.2, 0.06, 0.04, "x", { color: C(PALETTE, "impRed"), segments: 12 });
    Q.box("emitBlue", sx * (w / 2 + 0.014), 1.8, -d / 2 + 0.25, 0.006, 0.02, 0.08);
  }
  Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "dishwasher");
}

// Hand-wash trough against a wall (back at local -Z): steel basin on a plinth, taps, mirror strip.
export function washTrough(kit, PALETTE, pos, yaw, { len = 5, d = 0.5, h = 0.85, taps = 5 } = {}) {
  const Q = placer(kit, pos, yaw);
  const steel = C(PALETTE, "steel");
  const black = C(PALETTE, "impBlack");
  const white = C(PALETTE, "impWhite");
  Q.box("paintedMetal", 0, 0.1, 0, len - 0.3, 0.2, d - 0.1, { color: black });
  Q.box("paintedMetal", 0, (h + 0.17) / 2, 0, len, h - 0.23, d, { color: C(PALETTE, "impMid"), texel: 2.5 });
  // front: clean panel plates per tap bay with a steel rail under the basin lip; steel basin top
  for (let i = 0; i < taps; i++) {
    const px = -len / 2 + (i + 0.5) * (len / taps);
    Q.box("impPanel", px, (h + 0.2) / 2, d / 2 + 0.01, len / taps - 0.08, h - 0.32, 0.02, { color: C(PALETTE, "impGrey"), uv: "keep" });
  }
  Q.cyl("metal", 0, h - 0.1, d / 2 + 0.05, 0.02, len - 0.2, "x", { color: steel, segments: 10 });
  Q.box("metal", 0, h - 0.02, 0, len + 0.04, 0.04, d + 0.04, { color: steel, texel: 1 });
  Q.box("darkGloss", 0, h + 0.002, 0.03, len - 0.2, 0.004, d - 0.2);
  Q.box("metal", 0, h + 0.12, -d / 2 + 0.02, len, 0.24, 0.04, { color: steel, texel: 1 });
  for (let i = 0; i < taps; i++) {
    const tx = -len / 2 + (i + 0.5) * (len / taps);
    Q.cyl("metal", tx, h + 0.2, -d / 2 + 0.1, 0.018, 0.34, "y", { color: steel, segments: 10 });
    Q.cyl("metal", tx, h + 0.36, -d / 2 + 0.2, 0.018, 0.22, "z", { color: steel, segments: 10 });
    if (i < taps - 1) Q.box("paintedMetal", tx + len / taps / 2, 1.05, -d / 2 + 0.06, 0.1, 0.16, 0.1, { color: white });
  }
  Q.box("darkGloss", 0, 1.6, -d / 2 + 0.03, len - 0.2, 0.5, 0.02);
  Q.box("emitWhite", 0, 1.33, -d / 2 + 0.03, len - 0.6, 0.03, 0.015);
  Q.collider([-len / 2, 0, -d / 2], [len / 2, h, d / 2], "trough");
}

// Tray-return station: counter with a dark belt, side rails, tray stacks and a proud wall hatch at +X.
export function trayReturn(kit, PALETTE, pos, yaw, { len = 5, d = 0.9, h = 0.9 } = {}) {
  const Q = placer(kit, pos, yaw);
  const mid = C(PALETTE, "impMid");
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const steel = C(PALETTE, "steel");
  const grey = C(PALETTE, "impGrey");
  Q.box("paintedMetal", 0, h / 2, 0, len, h, d, { color: mid, texel: 2.5 });
  Q.box("paintedMetal", 0, 0.06, 0, len - 0.04, 0.12, d + 0.02, { color: black });
  Q.box("paintedMetal", 0, 0.5, d / 2 - 0.012, len - 0.3, 0.6, 0.024, { color: dark, texel: 2.5 });
  Q.box("darkGloss", 0, h + 0.015, 0, len - 0.2, 0.03, 0.6);
  for (const sz of [-1, 1]) Q.box("metal", 0, h + 0.05, sz * 0.34, len - 0.1, 0.06, 0.04, { color: steel });
  for (const sx of [-1.6, -0.6, 0.5]) for (let i = 0; i < 5; i++) Q.box("paintedMetal", sx, h + 0.04 + i * 0.024, 0, 0.46, 0.018, 0.36, { color: i % 2 ? grey : mid });
  Q.box("emitAmber", 0, h - 0.14, d / 2 + 0.002, len - 0.6, 0.02, 0.01);
  // wall hatch: proud black frame with a dark throat, steel lip
  const hx = len / 2 - 0.7;
  Q.box("paintedMetal", hx, 1.45, -d / 2 + 0.09, 1.4, 1.0, 0.18, { color: black, texel: 2.5 });
  Q.box("darkGloss", hx, 1.45, -d / 2 + 0.19, 1.1, 0.7, 0.01);
  Q.box("metal", hx, 1.08, -d / 2 + 0.2, 1.2, 0.04, 0.06, { color: steel });
  Q.box("emitAmber", hx, 2.0, -d / 2 + 0.19, 0.8, 0.03, 0.01);
  Q.collider([-len / 2, 0, -d / 2], [len / 2, h, d / 2], "tray-return");
}

// Small wall-mounted control / intercom panel (front +Z).
export function wallPanel(kit, PALETTE, pos, yaw, seed = 5, { w = 0.5, h = 0.7 } = {}) {
  const Q = placer(kit, pos, yaw);
  Q.box("paintedMetal", 0, 0, 0.04, w, h, 0.08, { color: C(PALETTE, "impDark"), texel: 1 });
  indicatorField(Q, 0, h / 2 - 0.18, 0.08, w - 0.1, 0.2, seed);
  Q.box("darkGloss", 0, -0.1, 0.081, w - 0.12, 0.2, 0.01);
  Q.box("emitRedImp", -w / 2 + 0.1, -h / 2 + 0.1, 0.082, 0.06, 0.06, 0.006);
  Q.box("emitBlue", -w / 2 + 0.2, -h / 2 + 0.1, 0.082, 0.06, 0.06, 0.006);
}

// Left-behind tableware on a table top: tray, cup, bowl, sometimes a bottle or a folded cloth.
export function tableware(kit, PALETTE, pos, seed = 1) {
  const rand = rng(seed);
  const grey = C(PALETTE, "impGrey");
  const white = C(PALETTE, "impWhite");
  const steel = C(PALETTE, "steel");
  const [x, y, z] = pos;
  kit.box("paintedMetal", x, y + 0.01, z, 0.46, 0.02, 0.34, { color: grey, texel: 2.5 });
  kit.box("paintedMetal", x, y + 0.03, z, 0.42, 0.02, 0.3, { color: C(PALETTE, "impMid") });
  kit.cyl("metal", x - 0.14, y + 0.06, z + 0.05, 0.04, 0.08, "y", { color: white, segments: 10 });
  if (rand() < 0.7) kit.cyl("metal", x + 0.08, y + 0.045, z - 0.02, 0.09, 0.05, "y", { color: steel, segments: 12 });
  if (rand() < 0.5) kit.box("metal", x + 0.1, y + 0.03, z + 0.12, 0.16, 0.01, 0.03, { color: steel });
  if (rand() < 0.4) kit.cyl("paintedMetal", x - 0.15, y + 0.11, z - 0.09, 0.03, 0.18, "y", { color: C(PALETTE, "impDark"), segments: 10 });
  if (rand() < 0.3) kit.box("paintedMetal", x + 0.14, y + 0.03, z + 0.1, 0.1, 0.02, 0.08, { color: white });
}

// Mess table: same footprint as the shared table (len along local X, benches both sides) with clean,
// finely textured tops (texel 2.5) and a condiment caddy at the centre.
export function messTable(kit, PALETTE, pos, yaw, { len = 6.0, w = 0.9, h = 0.78, seed = 3 } = {}) {
  const Q = placer(kit, pos, yaw);
  const rand = rng(seed);
  const grey = C(PALETTE, "impGrey");
  const dark = C(PALETTE, "impDark");
  const black = C(PALETTE, "impBlack");
  const mid = C(PALETTE, "impMid");
  const steel = C(PALETTE, "steel");
  // top: painted-panel material in 1.5 m plates (smooth roughness map, so no worn-metal speckle under
  // the grazing light of the drop fixtures); dark apron below
  Q.box("impPanel", 0, h - 0.03, 0, len, 0.06, w, { color: grey, uv: "scale", uvScale: [Math.max(1, Math.round(len / 1.5)), 1] });
  Q.box("paintedMetal", 0, h - 0.09, 0, len - 0.1, 0.06, w - 0.1, { color: dark, texel: 2.5 });
  for (const x of [-len / 2 + 0.5, len / 2 - 0.5]) {
    Q.box("paintedMetal", x, (h - 0.1) / 2, 0, 0.12, h - 0.1, w - 0.3, { color: dark, texel: 2.5 });
    Q.box("paintedMetal", x, 0.03, 0, 0.4, 0.06, w - 0.1, { color: black });
  }
  Q.box("emitBlue", 0, h - 0.06, w / 2 + 0.005, len - 0.4, 0.012, 0.01);
  Q.collider([-len / 2, 0, -w / 2], [len / 2, h, w / 2], "table");
  for (const s of [-1, 1]) {
    const z = s * (w / 2 + 0.45);
    // bench seat: the same clean panel plates as the top (worn-metal grain read as dirt on the seats)
    Q.box("impPanel", 0, 0.42, z, len - 0.2, 0.06, 0.38, { color: mid, uv: "scale", uvScale: [Math.max(1, Math.round(len / 1.5)), 1] });
    Q.box("paintedMetal", 0, 0.37, z, len - 0.4, 0.036, 0.3, { color: dark, texel: 2.5 });
    for (const x of [-len / 2 + 0.6, len / 2 - 0.6]) Q.box("paintedMetal", x, 0.2, z, 0.1, 0.4, 0.3, { color: dark, texel: 2.5 });
    Q.collider([-len / 2, 0, z - 0.2], [len / 2, 0.45, z + 0.2], "bench");
  }
  // caddy: tray with two dispensers and a napkin block
  Q.box("paintedMetal", 0, h + 0.01, 0, 0.36, 0.02, 0.24, { color: dark });
  Q.cyl("metal", -0.09, h + 0.1, -0.04, 0.035, 0.16, "y", { color: steel, segments: 10 });
  Q.cyl("metal", -0.09, h + 0.19, -0.04, 0.02, 0.02, "y", { color: black, segments: 8 });
  Q.cyl("paintedMetal", 0.02, h + 0.08, -0.04, 0.035, 0.12, "y", { color: rand() < 0.5 ? C(PALETTE, "impAmber") : C(PALETTE, "impRed"), segments: 10 });
  Q.box("paintedMetal", 0.1, h + 0.06, 0.06, 0.12, 0.08, 0.08, { color: C(PALETTE, "impWhite") });
}

// Tray-return / recycling station (freestanding, front +Z): sorting counter with three colour-coded
// chutes, a return belt with rails and tray stacks, and a tall back board carrying the sorting sign.
export function recyclingStation(kit, PALETTE, pos, yaw, { len = 3.0, d = 1.0, h = 0.9 } = {}) {
  const Q = placer(kit, pos, yaw);
  const mid = C(PALETTE, "impMid");
  const black = C(PALETTE, "impBlack");
  const dark = C(PALETTE, "impDark");
  const grey = C(PALETTE, "impGrey");
  const steel = C(PALETTE, "steel");
  Q.box("paintedMetal", 0, h / 2, 0, len, h, d, { color: mid, texel: 2.5 });
  Q.box("paintedMetal", 0, 0.06, 0, len - 0.04, 0.12, d + 0.02, { color: black });
  Q.box("paintedMetal", 0, h + 0.02, 0, len + 0.04, 0.04, d + 0.04, { color: steel, texel: 2.5 });
  // three chutes through the top with lids of different colours + a tag light each
  const chuteMats = ["emitAmber", "emitBlue", "emitRedImp"];
  for (let i = 0; i < 3; i++) {
    const x = -len / 2 + 0.55 + i * 0.7;
    Q.box("paintedMetal", x, h + 0.045, 0.12, 0.5, 0.01, 0.42, { color: black });
    Q.box("paintedMetal", x, h + 0.1, 0.12, 0.44, 0.1, 0.36, { color: [C(PALETTE, "impAmber"), C(PALETTE, "impBlue"), C(PALETTE, "impRed")][i], texel: 2.5 });
    Q.box("paintedMetal", x - 0.1, h + 0.16, 0.12, 0.2, 0.02, 0.06, { color: dark });
    Q.box(chuteMats[i], x, h + 0.005, -0.18, 0.4, 0.01, 0.04);
    // front hatch of each bin
    Q.box("paintedMetal", x, 0.5, d / 2 + 0.012, 0.5, 0.5, 0.024, { color: dark, texel: 2.5 });
    Q.box("metal", x, 0.72, d / 2 + 0.04, 0.3, 0.03, 0.03, { color: steel });
  }
  // return belt on the right end with side rails and two tray stacks
  const bx = len / 2 - 0.45;
  Q.box("darkGloss", bx, h + 0.045, 0.05, 0.7, 0.01, 0.6);
  for (const sz of [-1, 1]) Q.box("metal", bx, h + 0.08, 0.05 + sz * 0.33, 0.7, 0.06, 0.04, { color: steel });
  for (let i = 0; i < 6; i++) Q.box("paintedMetal", bx, h + 0.06 + i * 0.024, 0.05, 0.46, 0.018, 0.36, { color: i % 2 ? grey : mid });
  // back board with the sorting sign on both faces: three colour blocks with text-line hints + header strip
  Q.box("paintedMetal", 0, h + 0.55, -d / 2 + 0.03, len - 0.2, 1.1, 0.06, { color: dark, texel: 2.5 });
  for (const side of [1, -1]) {
    const z = side > 0 ? -d / 2 + 0.065 : -d / 2 - 0.005;
    const ze = side > 0 ? -d / 2 + 0.072 : -d / 2 - 0.012;
    Q.box("darkGloss", 0, h + 0.55, z, len - 0.4, 0.9, 0.01);
    Q.box("emitWhite", 0, h + 0.92, ze, len - 0.8, 0.03, 0.004);
    for (let i = 0; i < 3; i++) {
      const x = side * (-len / 2 + 0.55 + i * 0.7);
      Q.box(chuteMats[i], x, h + 0.62, ze, 0.3, 0.3, 0.004);
      for (let k = 0; k < 2; k++) Q.box("emitWhite", x, h + 0.36 - k * 0.07, ze, 0.36 - k * 0.1, 0.018, 0.004);
    }
  }
  Q.box("paintedMetal", 0, h + 1.13, -d / 2 + 0.03, len - 0.1, 0.06, 0.12, { color: black });
  Q.collider([-len / 2, 0, -d / 2], [len / 2, h + 1.15, d / 2], "recycling");
}

// Beverage point: two dispenser towers flanking a steel cup stand (front +Z).
export function cupStand(kit, PALETTE, pos, yaw, { len = 1.2, d = 0.5, h = 0.9 } = {}) {
  const Q = placer(kit, pos, yaw);
  const steel = C(PALETTE, "steel");
  const dark = C(PALETTE, "impDark");
  const white = C(PALETTE, "impWhite");
  Q.box("paintedMetal", 0, h - 0.03, 0, len, 0.06, d, { color: steel, texel: 2.5 });
  Q.box("paintedMetal", 0, h - 0.09, 0, len - 0.1, 0.06, d - 0.1, { color: dark });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) Q.cyl("metal", sx * (len / 2 - 0.06), (h - 0.06) / 2, sz * (d / 2 - 0.06), 0.025, h - 0.06, "y", { color: steel, segments: 10 });
  Q.box("paintedMetal", 0, 0.3, 0, len - 0.2, 0.03, d - 0.2, { color: steel, texel: 2.5 });
  for (let i = 0; i < 3; i++) {
    const n = 4 + ((i * 3) % 4);
    for (let k = 0; k < n; k++) Q.cyl("metal", -len / 2 + 0.25 + i * 0.35, h + 0.045 + k * 0.03, 0.05, 0.045, 0.09, "y", { color: k % 2 ? white : C(PALETTE, "impGrey"), segments: 10 });
  }
  for (let k = 0; k < 4; k++) Q.box("paintedMetal", 0.15, 0.32 + k * 0.024, 0, 0.46, 0.018, 0.36, { color: k % 2 ? C(PALETTE, "impGrey") : C(PALETTE, "impMid") });
  Q.box("emitBlue", 0, h - 0.06, d / 2 + 0.005, len - 0.3, 0.012, 0.01);
  Q.collider([-len / 2, 0, -d / 2], [len / 2, h, d / 2], "cup-stand");
}

// Supply container (1.2 m module) without the rubber bumpers of the shared crate.
export function supplyBox(kit, PALETTE, pos, yaw, { w = 1.2, h = 1.2, d = 1.0, color } = {}) {
  const Q = placer(kit, pos, yaw);
  const dark = C(PALETTE, "impDark");
  Q.box("paintedMetal", 0, h / 2, 0, w, h, d, { color: color || C(PALETTE, "impMid"), texel: 2.5 });
  Q.box("paintedMetal", 0, h / 2, d / 2 + 0.001, w - 0.3, h - 0.3, 0.03, { color: dark, texel: 1 });
  Q.box("paintedMetal", 0, h / 2, -d / 2 - 0.001, w - 0.3, h - 0.3, 0.03, { color: dark, texel: 1 });
  for (const sx of [-1, 1]) Q.box("paintedMetal", sx * (w - 0.1) / 2, h / 2, 0, 0.1, h + 0.02, d + 0.02, { color: C(PALETTE, "impBlack") });
  Q.box("emitBlue", w / 2 - 0.3, h - 0.12, d / 2 + 0.02, 0.12, 0.03, 0.006);
  Q.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "supply");
}
