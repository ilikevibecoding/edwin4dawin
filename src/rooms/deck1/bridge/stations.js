// Bridge stations for d1-bridge (Phase 2): sill bank + nav table + angled helm pair on the fore platform, two
// console rows per crew pit (outer row facing the wall display band, its doubles under overhead readout bars;
// inner row facing the walkway face), the commander's dais with chair, aide pedestals and the holo plinth on the
// aft deck, and the aft station bank with wall displays and cabinets. Every console is a bridgeConsole unit
// (≥ 20 small emissive elements each); seats are bridgeSeat units 0.92 m behind the desk centre.
import * as THREE from "three";
import { FLOOR, PIT_FLOOR } from "../shared/plan.js";
import { IMP } from "../shared/palette.js";
import { Frame, shade, onTilt, IND, SCUFF, bridgeConsole, bridgeSeat, commandChair, readoutBar, wallDisplay, cabinet, junctionBox, conduitRun, dataPillar } from "./props.js";
import { CELL, CELLS } from "./screens.js";
import { pickScreen } from "./pits.js";
import { buildHolo } from "./holo.js";

const S = (i) => "screenImp" + (((i % 4) + 4) % 4);
const live = (cell) => ({ mat: "bridgeScreen", rect: cell });

// Returns the holo controller ({ update(t) }) so index.js can animate it.
export function buildStations(kit, ctx, manifest, L) {
  const xi = L.xIn;
  let seed = 3;
  // one console + its operator seat(s); doubles (w ≥ 2.6) get two screens, two seats and a centre divider
  const unit = (x, z, yaw, w, o = {}) => {
    seed++;
    const y = o.y ?? FLOOR;
    const dbl = w >= 2.6;
    const screens = o.screens || (dbl ? [S(seed), seed % 3 === 0 ? live(CELLS[seed % 4]) : S(seed + 1)] : [seed % 4 === 0 ? live(CELLS[(seed >> 2) % 4]) : S(seed)]);
    bridgeConsole(kit, { x, y, z, yaw, w, seed, screens, ends: !!o.ends, back: !!o.back, divider: dbl });
    if (o.seats === false) return;
    const f = new Frame(kit, x, y, z, yaw);
    const n = dbl ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const p = f.pos((i - (n - 1) / 2) * 1.5, 0, 0.92);
      bridgeSeat(kit, p[0], p[1], p[2], yaw);
    }
  };

  // ---------------------------------------------------------------- fore platform (z 458.3..464)
  // sill bank: three doubles per side directly under the glass with instrument bars showing between them,
  // operators facing the window
  for (const s of [-1, 1]) {
    for (const ax of [5.4, 10.4, 15.4]) unit(s * ax, 459.35, 0, 3.2, { ends: ax === 5.4 });
    // side-wall dressing: cabinets, a display and a junction box on the fore platform's side walls
    const yawRoom = s < 0 ? Math.PI / 2 : -Math.PI / 2;
    cabinet(kit, { x: s * xi, y: FLOOR, z: 459.6, yaw: yawRoom, w: 0.9, h: 1.1, d: 0.5, seed: 61 + s });
    cabinet(kit, { x: s * xi, y: FLOOR, z: 460.7, yaw: yawRoom, w: 0.8, h: 0.95, d: 0.45, seed: 63 + s });
    wallDisplay(kit, { x: s * (xi - 0.01), y: FLOOR + 1.7, z: 461.7, yaw: yawRoom, w: 1.8, h: 1.0, ...pickScreen(4 + (s < 0 ? 0 : 1)), label: 9 });
    junctionBox(kit, { x: s * (xi - 0.01), y: FLOOR + 2.85, z: 460.0, yaw: yawRoom, lamp: "emitRedImp" });
  }
  // nav table at the sill centre, helm pair behind it angled inward so both helmsmen look past the table to the glass
  navTable(kit, 0, FLOOR, 459.7);
  for (const s of [-1, 1]) unit(s * 2.15, 461.75, s * 0.3, 2.2, { ends: true, back: true, screens: [live(s < 0 ? CELL.ship : CELL.tactical)] });

  // ---------------------------------------------------------------- crew pits (z 464..500, floor 237.6)
  for (const s of [-1, 1]) {
    const yawOut = s < 0 ? Math.PI / 2 : -Math.PI / 2; // console faces the outer wall
    const yawIn = -yawOut; // console faces the walkway face
    const xo = s * 17.3;
    const xin = s * 8.0;
    const outer = [
      [468.6, 3.2],
      [474.0, 2.2],
      [479.4, 3.2],
      [484.8, 2.2],
      [490.2, 3.2],
    ];
    outer.forEach(([z, w], k) => {
      // back: true — the housing backs of this row face the walkway and the pit aisle
      unit(xo, z, yawOut, w, { y: PIT_FLOOR, ends: k === 0, back: true });
      if (w >= 2.6) readoutBar(kit, xo, PIT_FLOOR, z, yawOut, w, { h: 2.15, ...(k === 2 ? { screen: "bridgeScreen", rect: CELL.wave } : { screen: S(k + (s < 0 ? 0 : 1)) }) });
    });
    for (let k = 0; k < 3; k++) unit(xin, 470.0 + k * 8.4, yawIn, 2.2, { y: PIT_FLOOR, back: true, ends: k === 0 });
  }

  // ---------------------------------------------------------------- aft command deck (z 500..511.7)
  const dz = L.daisZ;
  buildDais(kit, dz);
  commandChair(kit, 0, FLOOR + 0.22, dz + 0.5, 0, { screen: "screenImp2" });
  for (const s of [-1, 1]) aidePedestal(kit, s * 1.75, FLOOR + 0.22, dz - 0.5, -s * 0.5, S(s + 2));
  const holo = holoPlinth(kit, ctx, 0, FLOOR, 501.6);
  // officers' stations overlooking the pits from the aft deck (one double per side, facing forward) + data pillars
  for (const s of [-1, 1]) {
    unit(s * 10.5, 503.4, 0, 3.2, { ends: true, back: true, screens: [S(s + 5), live(s < 0 ? CELL.text : CELL.wave)] });
    dataPillar(kit, s * 16.0, FLOOR, 503.0, { seed: 21 + (s < 0 ? 0 : 3), screen: "screenImp0" });
  }

  // aft station bank either side of the blast door, wall displays + cabinets further out, side-wall dressing
  for (const s of [-1, 1]) {
    for (const ax of [4.35, 7.85]) unit(s * ax, 511.15, Math.PI, 3.2, { ends: ax > 5 });
    wallDisplay(kit, { x: s * 12.6, y: FLOOR + 2.15, z: 511.69, yaw: Math.PI, w: 3.0, h: 1.2, ...pickScreen(6 + (s < 0 ? 0 : 3)), label: 12 });
    wallDisplay(kit, { x: s * 16.5, y: FLOOR + 2.15, z: 511.69, yaw: Math.PI, w: 2.4, h: 1.2, ...pickScreen(8 + (s < 0 ? 0 : 3)) });
    for (const [ax, w, h] of [
      [11.6, 1.0, 1.15],
      [13.6, 0.9, 1.05],
      [16.5, 1.1, 1.1],
    ])
      cabinet(kit, { x: s * ax, y: FLOOR, z: 511.7, yaw: Math.PI, w, h, d: 0.5, seed: 80 + Math.round(ax * 2) + (s < 0 ? 0 : 50) });
    junctionBox(kit, { x: s * 14.9, y: FLOOR + 1.75, z: 511.69, yaw: Math.PI, lamp: "emitAmber" });
    conduitRun(kit, [s * 10.2, 511.7], [s * 18.6, 511.7], FLOOR + 3.15, [0, -1], { r: 0.035, out: 0.08, every: 2.1 });
    const yawRoom = s < 0 ? Math.PI / 2 : -Math.PI / 2;
    wallDisplay(kit, { x: s * (xi - 0.01), y: FLOOR + 1.7, z: 502.0, yaw: yawRoom, w: 1.8, h: 1.0, ...pickScreen(10 + (s < 0 ? 0 : 1)) });
    cabinet(kit, { x: s * xi, y: FLOOR, z: 509.6, yaw: yawRoom, w: 0.9, h: 1.05, d: 0.5, seed: 71 + s });
  }
  return holo;
}

// Chart table under the window centre: black body, gloss top with a live tactical map, indicator row on the
// helm side, a raised readout panel on the window side facing the helm.
function navTable(kit, x, y, z) {
  const f = new Frame(kit, x, y, z, 0);
  const W = 2.4;
  const D = 1.1;
  f.box("paintedMetal", 0, 0.05, 0, W - 0.3, 0.1, D - 0.3, { color: SCUFF, texel: 1 });
  f.box("paintedMetal", 0, 0.5, 0, W - 0.16, 0.8, D - 0.16, { color: shade(IMP.black, 0.95), texel: 1 });
  f.box("darkGloss", 0, 0.925, 0, W, 0.05, D);
  f.box("bridgeScreen", 0, 0.953, 0.03, W - 0.6, 0.006, D - 0.5, { uv: "keep", uvRect: CELL.tactical });
  // rim bars (polished where hands rest: the helm side)
  f.box("metal", 0, 0.955, D / 2 - 0.02, W, 0.012, 0.04, { color: 0xb8bcc4, texel: 2 });
  f.box("metal", 0, 0.955, -D / 2 + 0.02, W, 0.012, 0.04, { color: IMP.mid, texel: 2 });
  for (const s of [-1, 1]) f.box("metal", s * (W / 2 - 0.02), 0.955, 0, 0.04, 0.012, D, { color: IMP.mid, texel: 2 });
  // indicator row + three readouts along the helm edge
  for (let i = 0; i < 10; i++) f.box(IND[(i * 5 + 2) % IND.length], -0.9 + i * 0.2, 0.956, D / 2 - 0.12, 0.12, 0.008, 0.045);
  for (let i = 0; i < 3; i++) f.box(["emitRedImp", "emitAmber", "emitBlue"][i], -0.6 + i * 0.6, 0.956, D / 2 - 0.2, 0.36, 0.006, 0.03);
  // window-side readout panel leaning toward the helm crew, with a screen strip and lamps
  const a = -0.3;
  const c = [0, 1.12, -D / 2 + 0.1];
  f.box("paintedMetal", c[0], c[1], c[2], W - 0.5, 0.34, 0.1, { color: IMP.dark, texel: 1, tilt: a });
  let p = onTilt(c, a, 0, 0.055, 0.02);
  f.box("screenImp1", p[0], p[1], p[2], W - 0.9, 0.2, 0.006, { tilt: a, uv: "keep" });
  for (const s of [-1, 1]) {
    p = onTilt(c, a, s * (W / 2 - 0.4), 0.055, 0.1);
    f.box("emitRedImp", p[0], p[1], p[2], 0.05, 0.04, 0.006, { tilt: a });
    p = onTilt(c, a, s * (W / 2 - 0.4), 0.055, -0.08);
    f.box("emitBlue", p[0], p[1], p[2], 0.05, 0.04, 0.006, { tilt: a });
  }
  // leg recesses and a cable trunk down to the deck
  for (const s of [-1, 1]) f.box("paintedMetal", s * (W / 2 - 0.4), 0.45, 0, 0.06, 0.7, D - 0.1, { color: IMP.mid, texel: 2 });
  f.add("paintedMetal", new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), -0.6, 0.25, -D / 2 - 0.03, { color: IMP.black, texel: 2 });
  f.collider(0, 0, 1.3, 0, W + 0.04, D + 0.04, "nav-table");
}

// Standing aide pedestal on the dais: black column, sloped top with a screen and indicators, red side lamp.
function aidePedestal(kit, x, y, z, yaw, screen) {
  const f = new Frame(kit, x, y, z, yaw);
  f.box("paintedMetal", 0, 0.03, 0, 0.6, 0.06, 0.6, { color: SCUFF, texel: 1 });
  f.box("paintedMetal", 0, 0.56, 0, 0.44, 1.0, 0.44, { color: IMP.black, texel: 1 });
  for (let k = 0; k < 5; k++) f.box(k === 2 ? "emitRedImp" : "emitBlue", -0.16, 0.5 + k * 0.08, 0.222, 0.03, 0.02, 0.006);
  const a = 0.5;
  const c = [0, 1.1, 0.02];
  f.box("paintedMetal", c[0], c[1], c[2], 0.52, 0.06, 0.5, { color: IMP.dark, texel: 1, tilt: a });
  let p = onTilt(c, a, 0, 0.06, 0.034);
  f.box(screen, p[0], p[1], p[2], 0.4, 0.006, 0.24, { tilt: a, uv: "keep" });
  for (let i = 0; i < 6; i++) {
    p = onTilt(c, a, -0.175 + i * 0.07, -0.17, 0.034);
    f.box(IND[(i * 7 + 3) % IND.length], p[0], p[1], p[2], 0.05, 0.008, 0.04, { tilt: a });
  }
  f.box("emitRedImp", 0.222, 1.0, 0, 0.006, 0.03, 0.06);
  f.collider(0, 0, 1.25, 0, 0.62, 0.62, "pedestal");
}

// Commander's dais: 0.22 m black-gloss step on an inset scuffed base with a lit reveal, metal nosing, floor apron.
function buildDais(kit, dz) {
  const y = FLOOR;
  const hx = 2.6;
  const hz = 2.2;
  kit.boxMM("blackGloss", [-hx, y + 0.1, dz - hz], [hx, y + 0.22, dz + hz], { color: IMP.black, texel: 0.5 });
  kit.boxMM("paintedMetal", [-hx + 0.06, y, dz - hz + 0.06], [hx - 0.06, y + 0.1, dz + hz - 0.06], { color: SCUFF, texel: 1 });
  kit.boxMM("emitWhite", [-hx + 0.3, y + 0.04, dz - hz + 0.055], [hx - 0.3, y + 0.075, dz - hz + 0.065]);
  for (const s of [-1, 1]) {
    const x0 = Math.min(s * (hx - 0.065), s * (hx - 0.055));
    const x1 = Math.max(s * (hx - 0.065), s * (hx - 0.055));
    kit.boxMM("emitWhite", [x0, y + 0.04, dz - hz + 0.3], [x1, y + 0.075, dz + hz - 0.3]);
    const n0 = Math.min(s * (hx + 0.02), s * (hx - 0.08));
    const n1 = Math.max(s * (hx + 0.02), s * (hx - 0.08));
    kit.boxMM("paintedMetal", [n0, y + 0.2, dz - hz], [n1, y + 0.235, dz + hz + 0.02], { color: shade(IMP.mid, 1.2), texel: 2 });
  }
  kit.boxMM("paintedMetal", [-hx - 0.02, y + 0.2, dz - hz - 0.02], [hx + 0.02, y + 0.235, dz - hz + 0.08], { color: shade(IMP.mid, 1.2), texel: 2 });
  kit.boxMM("paintedMetal", [-1.2, y + 0.22, dz - hz + 0.12], [1.2, y + 0.226, dz - hz + 0.7], { color: IMP.mid, texel: 2 });
  kit.boxMM("paintedMetal", [-3.6, y, dz - 3.2], [3.6, y + 0.004, dz + 3.2], { color: IMP.dark, texel: 0.5 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box("emitRedImp", sx * 3.3, y + 0.007, dz + sz * 2.9, 0.12, 0.005, 0.12);
  kit.collider([-hx, y, dz - hz], [hx, y + 0.22, dz + hz], "dais");
}

// Holo plinth at the walkway head: tapered black drum, scuffed base ring, polished rim, blue emitter ring,
// four projector heads, a sloped control panel on the dais side; the projection itself is buildHolo().
function holoPlinth(kit, ctx, x, y, z) {
  kit.add("paintedMetal", new THREE.CylinderGeometry(1.14, 1.14, 0.08, 20), { pos: [x, y + 0.04, z], color: SCUFF, texel: 1 });
  kit.add("paintedMetal", new THREE.CylinderGeometry(0.92, 1.12, 0.84, 20), { pos: [x, y + 0.5, z], color: shade(IMP.black, 0.9), texel: 1 });
  kit.add("paintedMetal", new THREE.CylinderGeometry(0.97, 0.97, 0.05, 20), { pos: [x, y + 0.905, z], color: shade(IMP.mid, 1.2), texel: 2 });
  kit.add("darkGloss", new THREE.CylinderGeometry(0.86, 0.86, 0.02, 20), { pos: [x, y + 0.94, z] });
  kit.add("emitBlue", new THREE.RingGeometry(0.72, 0.8, 32), { pos: [x, y + 0.952, z], rot: [-Math.PI / 2, 0, 0], uv: "keep" });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const px = x + Math.cos(a) * 0.9;
    const pz = z + Math.sin(a) * 0.9;
    kit.box("metal", px, y + 0.975, pz, 0.12, 0.09, 0.12, { color: IMP.steel, texel: 2 });
    kit.box("emitBlue", px, y + 1.025, pz, 0.05, 0.012, 0.05);
  }
  // lamps around the drum
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    kit.add("emitRedImp", new THREE.BoxGeometry(0.16, 0.03, 0.02), { pos: [x + Math.cos(a) * 1.03, y + 0.3, z + Math.sin(a) * 1.03], rot: [0, -a + Math.PI / 2, 0] });
  }
  // control panel on the dais side
  const f = new Frame(kit, x, y, z + 1.0, 0);
  f.box("paintedMetal", 0, 0.5, 0.08, 0.7, 0.9, 0.24, { color: IMP.black, texel: 1 });
  const c = [0, 0.98, 0.1];
  f.box("paintedMetal", c[0], c[1], c[2], 0.72, 0.05, 0.36, { color: IMP.dark, texel: 1, tilt: 0.55 });
  for (let i = 0; i < 8; i++) {
    const p = onTilt(c, 0.55, -0.245 + i * 0.07, 0.1, 0.03);
    f.box(IND[(i * 5 + 1) % IND.length], p[0], p[1], p[2], 0.05, 0.01, 0.04, { tilt: 0.55 });
  }
  const p = onTilt(c, 0.55, 0, -0.06, 0.03);
  f.box("screenImp3", p[0], p[1], p[2], 0.5, 0.006, 0.14, { tilt: 0.55, uv: "keep" });
  f.box("metal", 0, 0.9, 0.3, 0.5, 0.025, 0.025, { color: 0xc9cdd3, texel: 2 });
  // cable trunk from the drum to the deck duct
  kit.box("paintedMetal", x, y + 0.02, z + 1.3, 0.3, 0.04, 0.5, { color: IMP.black, texel: 2 });
  kit.collider([x - 1.16, y, z - 1.16], [x + 1.16, y + 1.05, z + 1.24], "holo");
  return buildHolo(ctx, { x, y: y + 0.95, z, scale: 1 / 1000, hover: 0.5 });
}
