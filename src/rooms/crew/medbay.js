// Medical Bay — clinical white/green. A decontamination arch inside the door with a triage desk and ward
// status board; a ten-bed ward (instanced med beds with monitor arms showing waveforms / life-support
// readouts, privacy partitions, per-bed light panels, bedside cabinets) either side of a nurse-station
// island with a scanning hologram; a 2.4 m bacta tank on a hazard-ringed base with rising bubbles, an empty
// harness and a lit cap; two empty med-droid charging alcoves; a glass-walled surgical theatre with an
// articulated ceiling arm under the room's shadow spot; and a pharmacy with glass-fronted cabinets full of
// vials, a cold store, a lab bench and supply lockers.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { IMP } from "../../core/palette.js";
import { rectUVs } from "../../core/kit.js";
import { Placer, consoleStation, chair, wallPanel, lockerRow, pipeRun, cableBundle, crate } from "../../core/props.js";
import { DECAL, decalRect, screenRect, ledRect } from "../../textures.js";

export const meta = { id: "medbay", stream: "crew-rooms" };

const B = (sx, sy, sz, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
function C(r, len, x, y, z, axis = "y", seg = 12) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  if (axis === "x") g.rotateZ(Math.PI / 2);
  else if (axis === "z") g.rotateX(Math.PI / 2);
  return g.translate(x, y, z);
}
// kit.proto strips the colour attribute while the shared materials use vertex colours (instances would read
// black): give every prototype a white colour attribute so the per-instance tint multiplies correctly.
function proto(kit, name, mat, geos, opts = {}) {
  kit.proto(name, mat, Array.isArray(geos) ? mergeGeometries(geos, false) : geos, opts);
  const g = kit.protos.get(name).geo;
  g.setAttribute("color", new THREE.BufferAttribute(new Uint8Array(g.attributes.position.count * 3).fill(255), 3, true));
}
// screen quad facing +X (for protos): PlaneGeometry faces +Z, so turn it and remap its UVs into the atlas
function screenQuadX(w, h, x, y, z, index) {
  const g = new THREE.PlaneGeometry(w, h);
  rectUVs(g, screenRect(index));
  g.rotateY(Math.PI / 2);
  return g.translate(x, y, z);
}

const WHITE = new THREE.Color("#d2d7de");
const PALE = new THREE.Color("#aab0b8");
const SHEET = new THREE.Color("#cdd2d8");
const STEEL_LIGHT = new THREE.Color("#b4bac2");
const BLANKET = new THREE.Color("#5c6a63");

export function build(ctx) {
  const { kit, floor: F, ceil } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner; // 36.25..61.75, -169.75..-130.25
  const DX = 48.5; // door centre line
  const rand = ctx.rand;

  const wallOpts = { tints: [[IMP.plateLight, 0.5], [IMP.plate, 0.3], [WHITE, 0.2]], styles: { plate: 0.78, panel: 0.1, vent: 0.08, screen: 0.04 } };
  ctx.shell({ floorMat: "deckGrey", floorColor: IMP.plate, stripSpacing: 4.2, seed: 57, walls: { zmin: wallOpts, zmax: wallOpts, xmin: wallOpts, xmax: wallOpts } });
  // aisle lane lines and the green status strips (the accent) along the ward walls and the entry wall
  for (const s of [-1, 1]) kit.boxMM("paintedMetal", [DX + s * 2.4 - 0.04, F + 0.001, -152.6], [DX + s * 2.4 + 0.04, F + 0.007, -135.6], { color: WHITE, texel: 1 });
  const green = (ax, az, bx, bz, y = F + 2.35) => kit.boxMM("emitGreen", [Math.min(ax, bx), y, Math.min(az, bz)], [Math.max(ax, bx), y + 0.04, Math.max(az, bz)], {});
  green(x0 + 0.2, -136, x0 + 0.23, -152.6);
  green(x1 - 0.23, -136, x1 - 0.2, -152.6);
  green(x0 + 0.3, z1 - 0.23, DX - 2.2, z1 - 0.2);
  green(DX + 2.2, z1 - 0.23, x1 - 0.3, z1 - 0.2);

  // ---- prototypes -------------------------------------------------------------------------------------
  // med bed: local origin at the floor under the bed centre, head at -X (against the wall), foot at +X
  proto(kit, "bed_base", "paintedMetal", [B(1.2, 0.36, 0.6, 0, 0.18, 0), B(2.1, 0.08, 0.9, 0, 0.56, 0), B(0.05, 0.36, 0.86, 1.02, 0.84, 0), B(0.08, 0.34, 0.9, -1.02, 0.85, 0)], { texel: 1 });
  proto(kit, "bed_mat", "fabric", [B(2.0, 0.14, 0.86, 0, 0.67, 0), B(0.42, 0.1, 0.5, -0.7, 0.78, 0)], { texel: 2 });
  proto(kit, "bed_rail", "metal", [C(0.02, 1.2, 0.1, 0.96, 0.47, "x", 8), C(0.02, 1.2, 0.1, 0.96, -0.47, "x", 8), C(0.02, 0.36, -0.5, 0.78, 0.47, "y", 8), C(0.02, 0.36, 0.7, 0.78, 0.47, "y", 8), C(0.02, 0.36, -0.5, 0.78, -0.47, "y", 8), C(0.02, 0.36, 0.7, 0.78, -0.47, "y", 8)], { texel: 2 });
  proto(kit, "bed_toe", "emitGreen", [B(1.0, 0.02, 0.01, 0, 0.1, 0.305)], { uv: "keep" });
  proto(kit, "mon_arm", "paintedMetal", [C(0.18, 0.04, -0.75, 0.02, 0.66, "y", 12), C(0.03, 1.6, -0.75, 0.82, 0.66, "y", 8), B(0.3, 0.04, 0.04, -0.6, 1.58, 0.66), B(0.06, 0.44, 0.62, -0.45, 1.48, 0.66)], { texel: 1 });
  proto(kit, "mon_scr_a", "screen", screenQuadX(0.56, 0.36, -0.415, 1.5, 0.66, 2), { uv: "keep" });
  proto(kit, "mon_scr_b", "screen", screenQuadX(0.56, 0.36, -0.415, 1.5, 0.66, 11), { uv: "keep" });
  {
    const g = B(0.006, 0.05, 0.4, -0.415, 1.24, 0.66);
    rectUVs(g, ledRect(3));
    proto(kit, "mon_led", "leds", g, { uv: "keep" });
  }
  proto(kit, "bed_cab", "plate", [B(0.45, 0.7, 0.45, -0.45, 0.35, -0.72)], { texel: 1 });
  proto(kit, "bed_cab_h", "metal", [B(0.16, 0.02, 0.03, -0.45, 0.5, -0.5), B(0.16, 0.02, 0.03, -0.45, 0.25, -0.5)], { texel: 2 });
  proto(kit, "blanket", "fabric", [B(0.5, 0.08, 0.7, 0.55, 0.78, 0)], { texel: 2 });
  // privacy partition between beds: local origin at the wall foot, runs along +X (2.4 m), 1.9 m high
  proto(kit, "part_frame", "paintedMetal", [C(0.03, 1.9, 0.1, 0.95, 0, "y", 8), C(0.03, 1.9, 2.35, 0.95, 0, "y", 8), B(2.3, 0.05, 0.06, 1.225, 1.9, 0), B(2.3, 0.05, 0.06, 1.225, 0.9, 0)], { texel: 1 });
  proto(kit, "part_low", "plate", [B(2.25, 0.86, 0.03, 1.225, 0.45, 0)], { texel: 1 });
  proto(kit, "part_glass", "glass", [B(2.25, 0.98, 0.01, 1.225, 1.4, 0)], { uv: "keep" });
  // ceiling light panel (housing + diffuser), 0.8 × 1.8 along Z
  proto(kit, "lp_house", "paintedMetal", [B(0.9, 0.08, 1.9, 0, -0.04, 0)], { texel: 1 });
  proto(kit, "lp_lamp", "emitWhiteSoft", [B(0.76, 0.012, 1.76, 0, -0.085, 0)], { uv: "keep" });
  // pharmacy cabinet contents and fronts
  proto(kit, "vial", "glass", [C(0.02, 0.09, 0, 0.045, 0, "y", 8)], { uv: "keep" });
  proto(kit, "med_bottle", "plate", [C(0.035, 0.12, 0, 0.06, 0, "y", 10)], { texel: 3 });
  proto(kit, "med_cap", "darkGloss", [C(0.02, 0.03, 0, 0.135, 0, "y", 8)], { texel: 3 });
  proto(kit, "med_box", "plate", [B(0.14, 0.09, 0.11, 0, 0.045, 0)], { texel: 3 });
  proto(kit, "drawer", "paintedMetal", [B(0.82, 0.32, 0.02, 0, 0, 0)], { texel: 1 });
  proto(kit, "drawer_h", "metal", [B(0.3, 0.025, 0.03, 0, 0, 0.02)], { texel: 2 });
  proto(kit, "cab_frame", "paintedMetal", [B(0.05, 1.1, 0.04, -0.44, 0, 0), B(0.05, 1.1, 0.04, 0.44, 0, 0), B(0.9, 0.05, 0.04, 0, 0.525, 0), B(0.9, 0.05, 0.04, 0, -0.525, 0)], { texel: 1 });
  proto(kit, "cab_glass", "glass", [B(0.82, 1.0, 0.008, 0, 0, 0)], { uv: "keep" });
  proto(kit, "stool", "paintedMetal", [C(0.17, 0.04, 0, 0.45, 0), C(0.03, 0.43, 0, 0.22, 0, "y", 8), C(0.16, 0.03, 0, 0.015, 0)], { texel: 1 });

  const lightPanel = (x, z, yaw = 0) => {
    kit.place("lp_house", { pos: [x, ceil - 0.2, z], rot: [0, yaw, 0], color: IMP.black });
    kit.place("lp_lamp", { pos: [x, ceil - 0.2, z], rot: [0, yaw, 0] });
  };

  // ---- entry: decon arch, triage desk, ward board ------------------------------------------------------
  {
    const zmax = ctx.wall("zmax").frame; // u = x1 - x
    const az = -132.9;
    for (const s of [-1, 1]) {
      const px = DX + s * 2.3;
      kit.box("paintedMetal", px, F + 1.45, az, 0.6, 2.9, 0.9, { color: IMP.black, texel: 1 });
      kit.box("plate", px, F + 1.45, az, 0.5, 2.7, 0.94, { color: PALE, uv: "world", texel: 1 });
      kit.box("emitGreen", px - s * 0.305, F + 1.5, az, 0.01, 2.2, 0.06, {});
      kit.box("leds", px - s * 0.305, F + 2.65, az, 0.006, 0.06, 0.5, { uv: "keep", uvRect: ledRect(6 + (s + 1) / 2) });
      kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [px, F + 2.1, az + 0.475], uv: "keep", uvRect: decalRect(DECAL.WARNING) });
      kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [px, F + 2.1, az - 0.475], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(DECAL.WARNING) });
      kit.box("hazard", px, F + 0.6, az + 0.46, 0.5, 0.08, 0.02, { texel: 3 });
      kit.collider([px - 0.3, F, az - 0.45], [px + 0.3, F + 2.9, az + 0.45], "decon");
    }
    kit.box("paintedMetal", DX, F + 3.1, az, 5.2, 0.4, 0.9, { color: IMP.black, texel: 1 });
    kit.box("plate", DX, F + 3.1, az, 4.0, 0.34, 0.94, { color: PALE, uv: "world", texel: 1 });
    kit.box("emitGreen", DX, F + 2.895, az, 3.9, 0.01, 0.08, {});
    for (let i = 0; i < 5; i++) kit.cyl("emitWhite", DX - 1.6 + i * 0.8, F + 2.895, az + 0.3, 0.05, 0.01, "y", { segments: 10 });
    kit.box("leds", DX, F + 3.1, az + 0.455, 3.0, 0.08, 0.005, { uv: "keep", uvRect: ledRect(12) });
    kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [DX - 2.0, F + 3.1, az + 0.46], uv: "keep", uvRect: decalRect(DECAL.TEXT_A) });
    kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [DX + 2.0, F + 3.1, az + 0.46], uv: "keep", uvRect: decalRect(DECAL.TEXT_A) });
    // scan plate on the floor with hazard edges (the arch's footprint)
    kit.box("darkGloss", DX, F + 0.008, az, 3.6, 0.016, 1.2, {});
    kit.box("hazard", DX, F + 0.012, az - 0.62, 3.6, 0.006, 0.08, { texel: 3 });
    kit.box("hazard", DX, F + 0.012, az + 0.62, 3.6, 0.006, 0.08, { texel: 3 });
    for (let i = 0; i < 6; i++) kit.box("emitGreen", DX - 1.5 + i * 0.6, F + 0.017, az, 0.04, 0.004, 0.9, {});
    // emblem and panels on the entry wall
    zmax.decal(x1 - DX, 3.85, 0.07, 1.0, 1.0, DECAL.EMBLEM);
    wallPanel(kit, zmax, x1 - (DX - 3.6), 1.9, { w: 1.4, h: 0.8, accent: "emitGreen", seed: 41 });
    // ward status board (patients / life support) on the starboard wall, seen when turning right at the door
    const xmax = ctx.wall("xmax").frame; // u = z - z0
    const bu = -134.2 - z0;
    xmax.box("paintedMetal", bu, 2.2, 0.12, 3.2, 1.7, 0.24, { color: IMP.black, texel: 1 });
    xmax.box("screen", bu - 0.78, 2.3, 0.245, 1.4, 1.2, 0.01, { uv: "keep", uvRect: screenRect(13) });
    xmax.box("screen", bu + 0.78, 2.3, 0.245, 1.4, 1.2, 0.01, { uv: "keep", uvRect: screenRect(11) });
    xmax.box("leds", bu, 1.5, 0.245, 2.8, 0.06, 0.005, { uv: "keep", uvRect: ledRect(9) });
    xmax.box("emitGreen", bu, 3.12, 0.245, 3.0, 0.03, 0.005);
    kit.collider([x1 - 0.3, F, -135.9], [x1, F + 3.2, -132.5], "board");
    // triage desk facing the door (operator behind), with seat
    consoleStation(kit, { pos: [55.2, F, -133.2], yaw: Math.PI, w: 2.4, d: 0.8, h: 1.0, screens: 3, accent: "emitGreen", seed: 8, screenSet: [11, 2, 13] });
    chair(kit, { pos: [55.2, F, -134.0], yaw: Math.PI, color: IMP.fabricBlack });
    // supply cabinet (open carcass, glass front) and a parked gurney on the port side of the entry
    const cx = 41.6;
    const cz = z1 - 0.2; // wall panel face
    kit.boxMM("plate", [cx - 1.2, F, cz - 0.75], [cx + 1.2, F + 0.3, cz], { color: WHITE, uv: "world", texel: 1 });
    kit.boxMM("plate", [cx - 1.2, F + 2.1, cz - 0.75], [cx + 1.2, F + 2.2, cz], { color: WHITE, uv: "world", texel: 1 });
    kit.boxMM("plate", [cx - 1.2, F + 0.3, cz - 0.08], [cx + 1.2, F + 2.1, cz], { color: PALE, uv: "world", texel: 1 });
    for (const sx of [cx - 1.2, cx - 0.03, cx + 1.14]) kit.boxMM("plate", [sx, F + 0.3, cz - 0.75], [sx + 0.06, F + 2.1, cz], { color: WHITE, uv: "world", texel: 1 });
    for (let i = 0; i < 2; i++) {
      const gx = cx - 0.6 + i * 1.2;
      kit.box("paintedMetal", gx, F + 1.2, cz - 0.755, 1.1, 1.8, 0.02, { color: IMP.black, texel: 1 });
      kit.box("glass", gx, F + 1.2, cz - 0.77, 1.0, 1.7, 0.006, { uv: "keep" });
      for (const sy of [F + 0.8, F + 1.3, F + 1.8]) {
        kit.box("metal", gx, sy, cz - 0.4, 1.0, 0.02, 0.6, { color: STEEL_LIGHT });
        for (let k = 0; k < 6; k++) if (rand() < 0.8) kit.place(rand() < 0.5 ? "med_bottle" : "med_box", { pos: [gx - 0.42 + k * 0.17, sy + 0.01, cz - 0.4 + (rand() - 0.5) * 0.2], color: rand() < 0.5 ? WHITE : PALE });
      }
      kit.box("leds", gx, F + 0.42, cz - 0.755, 0.7, 0.06, 0.005, { uv: "keep", uvRect: ledRect(2 + i) });
    }
    kit.box("emitGreen", cx, F + 2.16, cz - 0.755, 2.2, 0.02, 0.01, {});
    kit.collider([cx - 1.2, F, cz - 0.8], [cx + 1.2, F + 2.2, z1], "supply");
    gurney(kit, F, 44.2, -133.6, Math.PI / 2, rand);
  }

  // ---- ward: 5 beds per side, partitions, light panels, wall panels, nurse island ---------------------
  const bedZ = [-138.0, -141.2, -144.4, -147.6, -150.8];
  const bed = (x, z, yaw, i) => {
    const q = { pos: [x, F, z], rot: [0, yaw, 0] };
    kit.place("bed_base", { ...q, color: IMP.black });
    kit.place("bed_mat", { ...q, color: SHEET });
    kit.place("bed_rail", { ...q, color: STEEL_LIGHT });
    kit.place("bed_toe", q);
    kit.place("mon_arm", { ...q, color: IMP.black });
    kit.place(i % 2 ? "mon_scr_b" : "mon_scr_a", q);
    kit.place("mon_led", q);
    kit.place("bed_cab", { ...q, color: WHITE });
    kit.place("bed_cab_h", { ...q, color: IMP.steel });
    if (i % 3 === 1) kit.place("blanket", { ...q, color: BLANKET });
    kit.collider([x - 1.1, F, z - 0.95], [x + 1.1, F + 1.0, z + 0.95], "bed");
  };
  const xminF = ctx.wall("xmin").frame; // u = z1 - z
  const xmaxF = ctx.wall("xmax").frame; // u = z - z0
  bedZ.forEach((z, i) => {
    bed(x0 + 1.3, z, 0, i);
    bed(x1 - 1.3, z, Math.PI, i + 1);
    lightPanel(x0 + 1.6, z);
    lightPanel(x1 - 1.6, z);
    // head-wall panel: number, indicator matrix, call light
    for (const [fr, u] of [[xminF, z1 - z], [xmaxF, z - z0]]) {
      fr.box("paintedMetal", u, 2.0, 0.22, 1.0, 0.5, 0.04, { color: IMP.black, texel: 1 });
      fr.box("leds", u + 0.1, 1.9, 0.245, 0.6, 0.06, 0.005, { uv: "keep", uvRect: ledRect((i * 3 + (fr === xminF ? 0 : 5)) % 16) });
      fr.box(i % 4 === 2 ? "emitAmber" : "emitGreen", u + 0.4, 2.12, 0.245, 0.06, 0.06, 0.01);
      fr.decal(u - 0.32, 2.08, 0.245, 0.26, 0.26, DECAL.NUMBER0 + (i % 4));
      fr.box("metal", u, 1.55, 0.25, 0.7, 0.02, 0.06, { color: IMP.steel }); // med-gas rail
      for (let k = 0; k < 3; k++) fr.cylN("darkGloss", u - 0.2 + k * 0.2, 1.55, 0.3, 0.025, 0.05, { segments: 8 });
    }
    if (i < bedZ.length - 1) {
      const pz = z - 1.6;
      kit.place("part_frame", { pos: [x0 + 0.2, F, pz], color: IMP.black });
      kit.place("part_low", { pos: [x0 + 0.2, F, pz], color: PALE });
      kit.place("part_glass", { pos: [x0 + 0.2, F, pz] });
      kit.place("part_frame", { pos: [x1 - 0.2, F, pz], rot: [0, Math.PI, 0], color: IMP.black });
      kit.place("part_low", { pos: [x1 - 0.2, F, pz], rot: [0, Math.PI, 0], color: PALE });
      kit.place("part_glass", { pos: [x1 - 0.2, F, pz], rot: [0, Math.PI, 0] });
      kit.collider([x0, F, pz - 0.06], [x0 + 2.6, F + 1.95, pz + 0.06], "partition");
      kit.collider([x1 - 2.6, F, pz - 0.06], [x1, F + 1.95, pz + 0.06], "partition");
    }
  });
  // nurse station island: two consoles back to back + a scanning hologram column
  {
    const iz = -144.4;
    consoleStation(kit, { pos: [DX, F, iz + 0.8], yaw: 0, w: 2.4, d: 0.8, h: 1.0, screens: 3, accent: "emitGreen", seed: 5, screenSet: [2, 11, 13] });
    consoleStation(kit, { pos: [DX, F, iz - 0.8], yaw: Math.PI, w: 2.4, d: 0.8, h: 1.0, screens: 3, accent: "emitGreen", seed: 6, screenSet: [11, 2, 9] });
    chair(kit, { pos: [DX, F, iz + 1.5], yaw: 0 });
    chair(kit, { pos: [DX, F, iz - 1.5], yaw: Math.PI });
    const hx = DX + 1.65;
    kit.box("paintedMetal", hx, F + 0.55, iz, 0.7, 1.1, 0.7, { color: IMP.black, texel: 1 });
    kit.box("plate", hx, F + 0.55, iz, 0.62, 1.0, 0.62, { color: PALE, uv: "world", texel: 1 });
    kit.box("leds", hx + 0.36, F + 0.7, iz, 0.005, 0.06, 0.4, { uv: "keep", uvRect: ledRect(10) });
    kit.cyl("darkGloss", hx, F + 1.115, iz, 0.3, 0.03, "y", { segments: 20 });
    kit.add("emitGreen", new THREE.TorusGeometry(0.28, 0.012, 6, 32), { pos: [hx, F + 1.135, iz], rot: [Math.PI / 2, 0, 0] });
    kit.collider([hx - 0.36, F, iz - 0.36], [hx + 0.36, F + 1.15, iz + 0.36], "holo");
    // hologram: translucent body-scan cylinder with a sweeping ring and a slowly turning lattice
    const hm = ctx.materials.holo.clone();
    hm.color.set("#6fe0a8");
    hm.opacity = 0.22;
    const grp = new THREE.Group();
    grp.position.set(hx, F + 1.15, iz);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 20, 1, true), hm);
    body.position.y = 0.5;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.01, 6, 40), hm);
    ring.rotation.x = Math.PI / 2;
    const lattice = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 1), hm);
    lattice.position.y = 0.55;
    grp.add(body, ring, lattice);
    ctx.add(grp);
    ctx.animate((dt, t) => {
      ring.position.y = 0.1 + ((t * 0.35) % 1) * 0.85;
      lattice.rotation.y = t * 0.6;
      lattice.rotation.x = Math.sin(t * 0.4) * 0.3;
      hm.opacity = 0.2 + 0.04 * Math.sin(t * 3.1);
    });
  }
  lightPanel(DX - 4.2, -134.0, Math.PI / 2);
  lightPanel(DX + 4.2, -134.0, Math.PI / 2);

  // ---- bacta tank ---------------------------------------------------------------------------------------
  {
    const bx = DX;
    const bz = -157.4;
    const top = F + 0.58;
    kit.cyl("paintedMetal", bx, F + 0.06, bz, 1.4, 0.12, "y", { color: IMP.black, segments: 32, texel: 1 });
    kit.cyl("plate", bx, F + 0.34, bz, 1.22, 0.44, "y", { color: IMP.plateDark, segments: 32, uv: "world", texel: 1 });
    kit.cyl("metal", bx, top - 0.02, bz, 1.06, 0.06, "y", { color: STEEL_LIGHT, segments: 32 });
    kit.add("emitCyan", new THREE.TorusGeometry(1.0, 0.02, 6, 48), { pos: [bx, top + 0.01, bz], rot: [Math.PI / 2, 0, 0] });
    kit.add("hazard", new THREE.RingGeometry(1.45, 1.75, 48).rotateX(-Math.PI / 2), { pos: [bx, F + 0.006, bz], uv: "world", texel: 3 });
    // base detailing: four service panels with indicators
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const P = new Placer(kit, [bx + Math.cos(a) * 1.22, F, bz + Math.sin(a) * 1.22], -a - Math.PI / 2);
      P.box("paintedMetal", 0, 0.32, 0.0, 0.7, 0.3, 0.04, { color: IMP.black, texel: 1 });
      P.box("leds", 0, 0.32, 0.03, 0.5, 0.06, 0.005, { uv: "keep", uvRect: ledRect(k + 4) });
    }
    // glass cylinder (own material so the tank reads as thick, slightly blue glass) and the liquid inside
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xa8d8ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.6, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: 0.05 });
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.97, 0.97, 2.4, 48, 1, true), glassMat);
    glass.position.set(bx, top + 1.2, bz);
    ctx.add(glass);
    const liquidMat = new THREE.MeshPhysicalMaterial({ color: 0x1ea6ff, emissive: 0x0b4f9a, emissiveIntensity: 0.9, roughness: 0.35, metalness: 0, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.FrontSide });
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.25, 40), liquidMat);
    liquid.position.set(bx, top + 1.125, bz);
    ctx.add(liquid);
    // cap with a lit ring, plumbing to the ceiling
    const capY = top + 2.4;
    kit.cyl("paintedMetal", bx, capY + 0.17, bz, 1.06, 0.34, "y", { color: IMP.black, segments: 32, texel: 1 });
    kit.add("emitCyan", new THREE.TorusGeometry(1.0, 0.025, 6, 48), { pos: [bx, capY + 0.02, bz], rot: [Math.PI / 2, 0, 0] });
    kit.cyl("emitWhiteSoft", bx, capY - 0.005, bz, 0.7, 0.01, "y", { segments: 32, uv: "keep" });
    kit.cyl("plate", bx, capY + 0.55, bz, 0.72, 0.42, "y", { color: PALE, segments: 24, uv: "world", texel: 1 });
    kit.box("leds", bx, capY + 0.5, bz + 0.73, 0.5, 0.06, 0.005, { uv: "keep", uvRect: ledRect(13) });
    kit.box("paintedMetal", bx, (capY + 0.76 + ceil) / 2, bz, 0.5, ceil - capY - 0.76, 0.5, { color: IMP.darkMetal, texel: 1 });
    pipeRun(kit, { points: [[bx + 0.6, capY + 0.3, bz], [bx + 0.6, capY + 0.9, bz], [bx + 1.8, capY + 0.9, bz], [bx + 1.8, ceil, bz]], r: 0.07, clamps: 1.5, color: IMP.steelDark });
    pipeRun(kit, { points: [[bx - 0.6, capY + 0.3, bz], [bx - 0.6, capY + 0.8, bz], [bx - 1.6, capY + 0.8, bz], [bx - 1.6, ceil, bz]], r: 0.05, clamps: 1.5, color: IMP.steel });
    // empty harness: suspension bar, straps and a breathing mask on its hose
    kit.cyl("metal", bx, capY - 0.25, bz, 0.02, 0.9, "x", { color: IMP.steel, segments: 8 });
    for (const s of [-1, 1]) kit.box("fabric", bx + s * 0.35, capY - 0.7, bz, 0.05, 0.9, 0.012, { color: IMP.fabricBlack, uv: "world", texel: 2 });
    kit.box("fabric", bx, capY - 1.15, bz, 0.76, 0.06, 0.012, { color: IMP.fabricBlack, uv: "world", texel: 2 });
    kit.cyl("rubber", bx + 0.1, capY - 0.3, bz + 0.12, 0.012, 0.5, "y", { color: IMP.black, segments: 6 });
    kit.box("darkGloss", bx + 0.1, capY - 0.6, bz + 0.12, 0.14, 0.1, 0.1, {});
    kit.box("emitGreen", bx + 0.1, capY - 0.6, bz + 0.175, 0.03, 0.03, 0.01, {});
    kit.collider([bx - 1.42, F, bz - 1.42], [bx + 1.42, F + 3.5, bz + 1.42], "bacta");
    // bubbles rising through the liquid
    const bubMat = new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false });
    const bubGeo = new THREE.SphereGeometry(1, 8, 6);
    const bubbles = [];
    const bubGrp = new THREE.Group();
    bubGrp.position.set(bx, top, bz);
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(bubGeo, bubMat);
      const r = 0.018 + rand() * 0.03;
      m.scale.setScalar(r);
      const b = { m, a: rand() * Math.PI * 2, rad: 0.15 + rand() * 0.65, y: rand() * 2.2, v: 0.25 + rand() * 0.35, ph: rand() * 6.28 };
      bubbles.push(b);
      bubGrp.add(m);
    }
    ctx.add(bubGrp);
    // slow caustic shimmer on the liquid + bubbles
    ctx.animate((dt, t) => {
      for (const b of bubbles) {
        b.y += b.v * dt;
        if (b.y > 2.2) {
          b.y = 0.05;
          b.a = rand() * Math.PI * 2;
          b.rad = 0.15 + rand() * 0.65;
        }
        const wob = Math.sin(t * 2.2 + b.ph) * 0.04;
        b.m.position.set(Math.cos(b.a) * b.rad + wob, b.y, Math.sin(b.a) * b.rad + Math.cos(t * 1.7 + b.ph) * 0.04);
      }
      liquidMat.emissiveIntensity = 0.85 + 0.15 * Math.sin(t * 1.3);
    });
    // tank control console (faces the tank, operator on the starboard side) and a vitals rack opposite
    consoleStation(kit, { pos: [bx + 2.75, F, bz], yaw: Math.PI / 2, w: 2.0, d: 0.8, h: 1.0, screens: 2, accent: "emitCyan", seed: 21, screenSet: [11, 2] });
    chair(kit, { pos: [bx + 3.45, F, bz], yaw: Math.PI / 2 });
    const rx = bx - 3.1;
    kit.box("paintedMetal", rx, F + 1.1, bz, 0.6, 2.2, 1.6, { color: IMP.black, texel: 1 });
    // pale service panels on the back and sides (the back faces the port ward aisle), with a vent and a spec plate
    kit.box("plate", rx - 0.305, F + 1.1, bz, 0.01, 1.9, 1.4, { color: PALE, uv: "world", texel: 1 });
    for (const s of [-1, 1]) kit.box("plate", rx, F + 1.1, bz + s * 0.805, 0.5, 1.9, 0.01, { color: PALE, uv: "world", texel: 1 });
    for (let k = 0; k < 5; k++) kit.box("darkGloss", rx - 0.312, F + 0.4 + k * 0.08, bz, 0.005, 0.03, 1.0, {});
    kit.add("decal", new THREE.PlaneGeometry(0.3, 0.3), { pos: [rx - 0.312, F + 1.8, bz + 0.4], rot: [0, -Math.PI / 2, 0], uv: "keep", uvRect: decalRect(DECAL.SPEC_PLATE) });
    kit.box("emitGreen", rx - 0.312, F + 1.8, bz - 0.4, 0.005, 0.06, 0.06, {});
    for (let k = 0; k < 4; k++) {
      const y = F + 0.45 + k * 0.42;
      kit.box("darkGloss", rx + 0.305, y, bz, 0.01, 0.3, 1.3, {});
      if (k % 2) kit.box("leds", rx + 0.312, y, bz, 0.005, 0.08, 1.1, { uv: "keep", uvRect: ledRect(8 + k) });
      else kit.box("screen", rx + 0.312, y, bz, 0.005, 0.24, 0.6, { uv: "keep", uvRect: screenRect(k === 0 ? 6 : 9) });
    }
    kit.box("emitCyan", rx + 0.312, F + 2.15, bz, 0.005, 0.03, 1.3, {});
    kit.collider([rx - 0.3, F, bz - 0.8], [rx + 0.32, F + 2.2, bz + 0.8], "vitals");
    // a supply crate and a stretcher parked by the tank
    crate(kit, { pos: [bx - 4.6, F, bz + 2.9], yaw: 0.15, size: [0.9, 0.7, 0.9], band: false, decal: DECAL.TEXT_C, color: WHITE });
    gurney(kit, F, bx + 4.4, bz + 3.2, 0, rand);
  }

  // ---- med-droid charging alcoves (port wall) ------------------------------------------------------------
  for (const [i, az] of [-154.4, -158.2].entries()) {
    const P = new Placer(kit, [x0 + 0.2, F, az], -Math.PI / 2); // local -Z points into the room (+X)
    const w = 1.7;
    const d = 0.75;
    P.box("paintedMetal", -w / 2 + 0.06, 1.3, -d / 2, 0.12, 2.6, d, { color: IMP.black, texel: 1 });
    P.box("paintedMetal", w / 2 - 0.06, 1.3, -d / 2, 0.12, 2.6, d, { color: IMP.black, texel: 1 });
    P.box("paintedMetal", 0, 2.66, -d / 2, w, 0.12, d, { color: IMP.black, texel: 1 });
    P.box("plate", 0, 2.66, -d + 0.02, w - 0.2, 0.1, 0.06, { color: PALE, uv: "keep" });
    P.box("plate", 0, 1.3, -0.04, w - 0.24, 2.5, 0.06, { color: IMP.plateDark, uv: "world", texel: 1 });
    P.box("leds", 0, 2.0, -0.075, 0.9, 0.08, 0.005, { uv: "keep", uvRect: ledRect(4 + i) });
    P.box("darkGloss", 0, 1.55, -0.075, 0.9, 0.5, 0.01);
    P.box("screen", 0, 1.6, -0.081, 0.7, 0.3, 0.005, { uv: "keep", uvRect: screenRect(9) });
    for (let k = 0; k < 3; k++) P.box(k === 1 ? "emitAmber" : "emitGreen", -0.3 + k * 0.3, 1.0, -0.08, 0.1, 0.06, 0.02);
    P.cyl("darkGloss", 0, 0.015, -d / 2, 0.42, 0.03, "y", { segments: 24 });
    P.add("emitGreen", new THREE.TorusGeometry(0.4, 0.012, 6, 32), 0, 0.032, -d / 2, { rot: [Math.PI / 2, 0, 0] });
    P.box("hazard", 0, 0.004, -d - 0.08, w, 0.008, 0.14, { texel: 3 });
    P.decal(0, 2.35, -d - 0.005, 0.28, 0.28, DECAL.NUMBER0 + i, { rot: [0, Math.PI, 0] });
    P.decal(0.55, 2.35, -d - 0.005, 0.24, 0.24, DECAL.SPEC_PLATE, { rot: [0, Math.PI, 0] });
    // charging arm hanging from the top, connector at droid-head height
    P.cyl("metal", 0.3, 2.3, -d / 2, 0.02, 0.6, "y", { color: IMP.steel, segments: 8 });
    P.box("darkGloss", 0.3, 1.94, -d / 2, 0.12, 0.12, 0.12);
    P.box("emitCyan", 0.3, 1.94, -d / 2 - 0.065, 0.04, 0.04, 0.01);
    P.collider([-w / 2, 0, -d], [-w / 2 + 0.12, 2.7, 0], "alcove");
    P.collider([w / 2 - 0.12, 0, -d], [w / 2, 2.7, 0], "alcove");
    cableBundle(kit, { from: [x0 + 0.6, F + 2.72, az + 0.4], to: [x0 + 0.4, ceil, az + 0.9], sag: 0.15, n: 3, r: 0.02 });
  }
  // a second pair of light panels marks the bacta bay
  lightPanel(DX - 4.5, -157.4, Math.PI / 2);
  lightPanel(DX + 4.6, -160.2, Math.PI / 2);

  // ---- surgical theatre (starboard far corner, glass-walled) ---------------------------------------------
  {
    const px = 52.5; // partition line facing the aisle
    const pz = -160.6; // partition line facing the bacta bay
    // floor inset: lighter plating with a hazard edge at the partition lines
    kit.boxMM("plate", [px, F, z0], [x1, F + 0.015, pz], { color: PALE, uv: "world", texel: 0.5 });
    kit.boxMM("hazard", [px - 0.06, F + 0.016, z0], [px + 0.06, F + 0.021, pz], { texel: 3 });
    kit.boxMM("hazard", [px, F + 0.016, pz - 0.06], [x1, F + 0.021, pz + 0.06], { texel: 3 });
    // glass partitions: solid lower rail, glass to 2.5 m, header beam; door opening on the aisle side
    const partX = (za, zb) => {
      kit.boxMM("plate", [px - 0.06, F, za], [px + 0.06, F + 0.9, zb], { color: PALE, uv: "world", texel: 1 });
      kit.boxMM("paintedMetal", [px - 0.07, F + 0.9, za], [px + 0.07, F + 0.96, zb], { color: IMP.black, texel: 1 });
      kit.boxMM("glass", [px - 0.006, F + 0.96, za], [px + 0.006, F + 2.5, zb], { uv: "keep" });
      kit.boxMM("paintedMetal", [px - 0.08, F + 2.5, za], [px + 0.08, F + 2.85, zb], { color: IMP.black, texel: 1 });
      kit.boxMM("emitGreen", [px - 0.085, F + 2.6, za + 0.1], [px + 0.085, F + 2.63, zb - 0.1], {});
      kit.collider([px - 0.1, F, za], [px + 0.1, F + 2.9, zb], "partition");
    };
    const doorZ0 = -163.0;
    const doorZ1 = -164.8;
    partX(pz, doorZ0);
    partX(doorZ1, z0);
    for (const z of [pz, doorZ0, doorZ1, -167.3]) kit.box("paintedMetal", px, F + 1.45, z, 0.14, 2.9, 0.14, { color: IMP.black, texel: 1 });
    // door header + slid-open slab (parked over the adjacent pane)
    kit.boxMM("paintedMetal", [px - 0.1, F + 2.3, doorZ1], [px + 0.1, F + 2.85, doorZ0], { color: IMP.black, texel: 1 });
    kit.box("emitGreen", px, F + 2.32, (doorZ0 + doorZ1) / 2, 0.22, 0.03, 1.5, {});
    kit.box("plate", px + 0.16, F + 1.15, doorZ1 - 0.95, 0.06, 2.3, 1.8, { color: WHITE, uv: "world", texel: 1 });
    kit.box("paintedMetal", px + 0.2, F + 1.15, doorZ1 - 0.95, 0.02, 1.4, 0.16, { color: IMP.black, texel: 1 });
    kit.add("decal", new THREE.PlaneGeometry(0.3, 0.3), { pos: [px + 0.125, F + 1.9, doorZ1 - 0.5], rot: [0, -Math.PI / 2, 0], uv: "keep", uvRect: decalRect(DECAL.RESTRICTED) });
    kit.add("decal", new THREE.PlaneGeometry(0.34, 0.34), { pos: [px - 0.11, F + 2.0, doorZ0 + 0.6], rot: [0, -Math.PI / 2, 0], uv: "keep", uvRect: decalRect(DECAL.WARNING) });
    // bay-side partition (fully glazed)
    kit.boxMM("plate", [px, F, pz - 0.06], [x1, F + 0.9, pz + 0.06], { color: PALE, uv: "world", texel: 1 });
    kit.boxMM("paintedMetal", [px, F + 0.9, pz - 0.07], [x1, F + 0.96, pz + 0.07], { color: IMP.black, texel: 1 });
    kit.boxMM("glass", [px, F + 0.96, pz - 0.006], [x1 - 0.2, F + 2.5, pz + 0.006], { uv: "keep" });
    kit.boxMM("paintedMetal", [px, F + 2.5, pz - 0.08], [x1 - 0.2, F + 2.85, pz + 0.08], { color: IMP.black, texel: 1 });
    kit.boxMM("emitGreen", [px + 0.3, F + 2.6, pz - 0.085], [x1 - 0.5, F + 2.63, pz + 0.085], {});
    for (const x of [55.6, 58.7]) kit.box("paintedMetal", x, F + 1.45, pz, 0.14, 2.9, 0.14, { color: IMP.black, texel: 1 });
    kit.collider([px, F, pz - 0.1], [x1, F + 2.9, pz + 0.1], "partition");
    // operating table
    const tx = 57.3;
    const tz = -165.3;
    kit.box("paintedMetal", tx, F + 0.25, tz, 0.6, 0.5, 0.9, { color: IMP.black, texel: 1 });
    kit.box("plate", tx, F + 0.62, tz, 0.4, 0.3, 0.5, { color: PALE, uv: "world", texel: 1 });
    kit.box("metal", tx, F + 0.9, tz, 0.84, 0.08, 2.15, { color: STEEL_LIGHT });
    kit.box("darkGloss", tx, F + 0.955, tz, 0.72, 0.03, 2.0, {});
    kit.box("fabric", tx, F + 0.99, tz - 0.8, 0.4, 0.05, 0.3, { color: SHEET, uv: "world", texel: 2 });
    for (const s of [-1, 1]) kit.box("metal", tx + s * 0.48, F + 0.98, tz + 0.2, 0.05, 0.05, 0.9, { color: IMP.steel });
    kit.box("emitGreen", tx, F + 0.12, tz, 0.62, 0.02, 0.92, {});
    kit.box("leds", tx + 0.31, F + 0.35, tz, 0.005, 0.06, 0.5, { uv: "keep", uvRect: ledRect(15) });
    kit.collider([tx - 0.45, F, tz - 1.1], [tx + 0.45, F + 1.0, tz + 1.1], "optable");
    // articulated surgical arm from the ceiling
    const arm = [[tx, ceil - 0.05, tz + 0.9], [tx, ceil - 0.75, tz + 0.9], [tx - 0.75, ceil - 1.45, tz + 0.5], [tx - 0.25, F + 1.85, tz - 0.05], [tx - 0.1, F + 1.5, tz - 0.15]];
    kit.cyl("paintedMetal", arm[0][0], ceil - 0.06, arm[0][2], 0.4, 0.12, "y", { color: IMP.black, segments: 20, texel: 1 });
    kit.add("emitGreen", new THREE.TorusGeometry(0.34, 0.015, 6, 32), { pos: [arm[0][0], ceil - 0.125, arm[0][2]], rot: [Math.PI / 2, 0, 0] });
    pipeRun(kit, { points: arm.slice(0, 4), r: 0.09, color: WHITE, mat: "plate" });
    pipeRun(kit, { points: arm.slice(3), r: 0.06, color: IMP.gunmetal, mat: "metal" });
    for (const p of arm.slice(1, 4)) kit.sphere("metal", p[0], p[1], p[2], 0.15, { color: IMP.gunmetal, segments: 14 });
    for (let i = 0; i < 3; i++) {
      const a = arm[1];
      const b = arm[2];
      const f = 0.25 + i * 0.25;
      kit.box("paintedMetal", a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, 0.24, 0.05, 0.24, { color: IMP.black, rot: [0, 0.6, 0.7] });
    }
    const head = arm[4];
    kit.box("darkGloss", head[0], head[1] - 0.1, head[2], 0.28, 0.22, 0.28, {});
    kit.add("emitWhite", new THREE.TorusGeometry(0.16, 0.012, 6, 32), { pos: [head[0], head[1] - 0.22, head[2]], rot: [Math.PI / 2, 0, 0] });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      kit.cyl("metal", head[0] + Math.cos(a) * 0.09, head[1] - 0.36, head[2] + Math.sin(a) * 0.09, 0.012, 0.3, "y", { color: IMP.steel, segments: 6 });
    }
    kit.box("emitRed", head[0] + 0.145, head[1] - 0.08, head[2], 0.01, 0.03, 0.03, {});
    // overhead surgical lamp on a wall boom
    pipeRun(kit, { points: [[x1 - 0.22, F + 3.5, tz], [59.0, F + 3.25, tz], [58.4, F + 2.95, tz]], r: 0.04, color: IMP.steel });
    kit.cyl("paintedMetal", 58.4, F + 2.86, tz, 0.5, 0.14, "y", { color: IMP.black, segments: 24, texel: 1 });
    kit.cyl("emitWhiteSoft", 58.4, F + 2.785, tz, 0.42, 0.01, "y", { segments: 24, uv: "keep" });
    // instrument trays, scrub sink, sterilizer, wall monitors and cabinets
    const tray = (x, z) => {
      kit.cyl("paintedMetal", x, F + 0.02, z, 0.22, 0.04, "y", { color: IMP.black, segments: 14 });
      kit.cyl("metal", x, F + 0.47, z, 0.02, 0.9, "y", { color: IMP.steel, segments: 8 });
      kit.box("metal", x, F + 0.93, z, 0.52, 0.03, 0.36, { color: STEEL_LIGHT });
      for (let k = 0; k < 5; k++) kit.box(k % 2 ? "darkGloss" : "metal", x - 0.18 + k * 0.09, F + 0.955, z + (rand() - 0.5) * 0.06, 0.02, 0.01, 0.22 + rand() * 0.06, { color: IMP.steel });
      kit.collider([x - 0.26, F, z - 0.2], [x + 0.26, F + 0.96, z + 0.2], "tray");
    };
    tray(55.9, -166.4);
    tray(58.9, -164.0);
    const xmax = xmaxF; // u = z - z0
    const su = -162.2 - z0;
    xmax.box("plate", su, 0.45, 0.3, 1.3, 0.9, 0.6, { color: WHITE, uv: "world", texel: 1 });
    xmax.box("metal", su, 0.92, 0.3, 1.36, 0.06, 0.64, { color: STEEL_LIGHT });
    xmax.box("darkGloss", su, 0.955, 0.3, 1.1, 0.02, 0.44);
    for (const du of [-0.3, 0.3]) xmax.cylV("metal", su + du, 1.1, 0.12, 0.015, 0.3, { color: IMP.steel, segments: 8 });
    xmax.box("darkGloss", su, 1.7, 0.23, 1.2, 0.7, 0.02);
    xmax.box("emitGreen", su + 0.5, 1.25, 0.24, 0.05, 0.05, 0.01);
    kit.collider([x1 - 0.95, F, -162.9], [x1, F + 1.0, -161.5], "sink");
    kit.box("plate", 60.9, F + 0.75, -168.9, 1.2, 1.5, 1.2, { color: PALE, uv: "world", texel: 1 });
    kit.cyl("darkGloss", 60.9, F + 1.0, -168.28, 0.28, 0.03, "z", { segments: 20 });
    kit.add("emitAmber", new THREE.TorusGeometry(0.3, 0.015, 6, 32), { pos: [60.9, F + 1.0, -168.28] });
    kit.box("leds", 60.9, F + 0.45, -168.28, 0.6, 0.06, 0.005, { uv: "keep", uvRect: ledRect(1) });
    kit.collider([60.3, F, z0], [x1, F + 1.5, -168.3], "sterilizer");
    const zmin = ctx.wall("zmin").frame; // u = x - x0
    for (const [x, scr] of [[55.4, 2], [58.8, 11]]) {
      zmin.box("paintedMetal", x - x0, 2.05, 0.12, 1.5, 1.0, 0.24, { color: IMP.black, texel: 1 });
      zmin.box("screen", x - x0, 2.1, 0.245, 1.3, 0.75, 0.01, { uv: "keep", uvRect: screenRect(scr) });
      zmin.box("leds", x - x0, 1.62, 0.245, 1.0, 0.05, 0.005, { uv: "keep", uvRect: ledRect(scr) });
    }
    // wall cabinets: open carcass (back, top, bottom, sides) behind glass fronts
    kit.boxMM("plate", [52.95, F + 1.15, z0 + 0.2], [54.75, F + 2.25, z0 + 0.28], { color: WHITE, uv: "world", texel: 1 });
    kit.boxMM("plate", [52.95, F + 2.2, z0 + 0.2], [54.75, F + 2.25, z0 + 0.64], { color: WHITE, uv: "world", texel: 1 });
    kit.boxMM("plate", [52.95, F + 1.15, z0 + 0.2], [54.75, F + 1.2, z0 + 0.64], { color: WHITE, uv: "world", texel: 1 });
    for (const sx of [52.95, 53.82, 54.69]) kit.boxMM("plate", [sx, F + 1.15, z0 + 0.2], [sx + 0.06, F + 2.25, z0 + 0.64], { color: WHITE, uv: "world", texel: 1 });
    for (const x of [53.4, 54.3]) {
      kit.place("cab_frame", { pos: [x, F + 1.7, z0 + 0.66], color: IMP.black });
      kit.place("cab_glass", { pos: [x, F + 1.7, z0 + 0.66] });
      for (const sy of [F + 1.2, F + 1.7, F + 2.15]) {
        if (sy !== F + 1.2) kit.box("metal", x, sy - 0.01, z0 + 0.45, 0.8, 0.015, 0.34, { color: STEEL_LIGHT });
        for (let k = 0; k < 5; k++) if (rand() < 0.8) kit.place(rand() < 0.6 ? "vial" : "med_bottle", { pos: [x - 0.32 + k * 0.16, sy, z0 + 0.45], color: WHITE });
      }
    }
    kit.collider([52.9, F, z0], [54.8, F + 2.4, z0 + 0.7], "cabinets");
    lightPanel(tx - 1.4, tz, 0);
    lightPanel(tx + 1.4, tz, 0);
  }

  // ---- pharmacy & lab (port far corner) ------------------------------------------------------------------
  {
    const zmin = ctx.wall("zmin").frame; // u = x - x0
    const cxa = x0 + 0.45;
    const cxb = 46.6;
    // lower run: drawers under a steel top
    kit.boxMM("paintedMetal", [cxa, F, z0], [cxb, F + 0.1, z0 + 0.66], { color: IMP.black, texel: 1 });
    kit.boxMM("plate", [cxa, F + 0.1, z0], [cxb, F + 0.9, z0 + 0.66], { color: WHITE, uv: "world", texel: 1 });
    kit.boxMM("metal", [cxa - 0.02, F + 0.9, z0], [cxb + 0.02, F + 0.95, z0 + 0.7], { color: STEEL_LIGHT });
    const nCol = Math.floor((cxb - cxa - 0.2) / 0.9);
    for (let c = 0; c < nCol; c++) {
      const x = cxa + 0.1 + 0.45 + c * 0.9;
      for (const y of [F + 0.3, F + 0.68]) {
        kit.place("drawer", { pos: [x, y, z0 + 0.665], color: IMP.trim });
        kit.place("drawer_h", { pos: [x, y, z0 + 0.675], color: IMP.steel });
      }
    }
    kit.collider([cxa, F, z0], [cxb, F + 0.95, z0 + 0.7], "pharmacy");
    // upper run: glass-fronted cabinets (open carcass: back, top, bottom, dividers) with a lit underside
    kit.boxMM("plate", [cxa, F + 1.35, z0], [cxb, F + 2.5, z0 + 0.08], { color: WHITE, uv: "world", texel: 1 });
    kit.boxMM("plate", [cxa, F + 2.44, z0], [cxb, F + 2.5, z0 + 0.42], { color: WHITE, uv: "world", texel: 1 });
    kit.boxMM("plate", [cxa, F + 1.35, z0], [cxb, F + 1.41, z0 + 0.42], { color: WHITE, uv: "world", texel: 1 });
    for (let c = 0; c <= nCol; c++) {
      const sx = cxa + 0.1 + c * 0.9 - 0.03;
      kit.boxMM("plate", [sx, F + 1.41, z0], [sx + 0.06, F + 2.44, z0 + 0.42], { color: WHITE, uv: "world", texel: 1 });
    }
    kit.boxMM("emitWhiteSoft", [cxa + 0.2, F + 1.34, z0 + 0.1], [cxb - 0.2, F + 1.35, z0 + 0.36], { uv: "keep" });
    for (let c = 0; c < nCol; c++) {
      const x = cxa + 0.1 + 0.45 + c * 0.9;
      kit.place("cab_frame", { pos: [x, F + 1.925, z0 + 0.44], color: IMP.black });
      kit.place("cab_glass", { pos: [x, F + 1.925, z0 + 0.44] });
      for (const sy of [F + 1.42, F + 1.82, F + 2.18]) {
        if (sy !== F + 1.42) kit.box("metal", x, sy - 0.01, z0 + 0.22, 0.8, 0.015, 0.36, { color: STEEL_LIGHT });
        for (let k = 0; k < 5; k++) {
          if (rand() < 0.2) continue;
          const px = x - 0.32 + k * 0.16 + (rand() - 0.5) * 0.03;
          const r = rand();
          if (r < 0.45) kit.place("vial", { pos: [px, sy, z0 + 0.24] });
          else if (r < 0.8) {
            kit.place("med_bottle", { pos: [px, sy, z0 + 0.24], color: rand() < 0.5 ? WHITE : PALE });
            kit.place("med_cap", { pos: [px, sy, z0 + 0.24] });
          } else kit.place("med_box", { pos: [px, sy, z0 + 0.24], color: rand() < 0.5 ? WHITE : IMP.plateLight });
        }
      }
    }
    zmin.box("emitGreen", (cxa + cxb) / 2 - x0, 2.56, 0.2, cxb - cxa - 0.4, 0.03, 0.02);
    zmin.decal(2.2, 3.2, 0.06, 0.8, 0.8, DECAL.TEXT_B);
    zmin.decal(8.8, 3.2, 0.06, 0.8, 0.8, DECAL.WARNING);
    // cold store in the corner (port wall), cyan-lit door
    const kx = x0 + 0.65;
    const kz = -161.8;
    kit.box("plate", kx, F + 1.05, kz, 0.9, 2.1, 1.3, { color: PALE, uv: "world", texel: 1 });
    kit.box("paintedMetal", kx + 0.455, F + 1.05, kz, 0.02, 1.9, 1.15, { color: IMP.black, texel: 1 });
    kit.box("glass", kx + 0.468, F + 1.35, kz, 0.006, 0.9, 0.8, { uv: "keep" });
    kit.box("emitCyan", kx + 0.47, F + 1.85, kz, 0.005, 0.03, 1.0, {});
    kit.box("leds", kx + 0.47, F + 0.5, kz, 0.005, 0.06, 0.6, { uv: "keep", uvRect: ledRect(7) });
    kit.box("metal", kx + 0.5, F + 1.2, kz + 0.45, 0.04, 0.6, 0.04, { color: IMP.steel });
    kit.box("hazard", kx, F + 2.12, kz, 0.92, 0.06, 1.32, { texel: 3 });
    kit.collider([x0, F, kz - 0.7], [kx + 0.5, F + 2.2, kz + 0.7], "coldstore");
    // supply lockers along the port wall
    lockerRow(kit, xminF, z1 - (-163.4), 8, { lw: 0.6, h: 2.0, d: 0.5, color: PALE });
    crate(kit, { pos: [x0 + 1.55, F, -167.4], yaw: -0.2, size: [1.0, 0.8, 0.9], band: false, decal: DECAL.TEXT_C, color: WHITE });
    // lab bench island with analyser, centrifuge, vial rack and data slate; two stools
    const lx = 41.8;
    const lz = -164.6;
    kit.box("paintedMetal", lx, F + 0.05, lz, 2.8, 0.1, 0.9, { color: IMP.black, texel: 1 });
    kit.box("plate", lx, F + 0.5, lz, 3.0, 0.8, 1.0, { color: WHITE, uv: "world", texel: 1 });
    kit.box("metal", lx, F + 0.93, lz, 3.1, 0.06, 1.1, { color: STEEL_LIGHT });
    kit.box("emitGreen", lx, F + 0.2, lz + 0.505, 2.6, 0.02, 0.01, {});
    kit.collider([lx - 1.55, F, lz - 0.55], [lx + 1.55, F + 0.96, lz + 0.55], "bench");
    kit.cyl("darkGloss", lx - 1.0, F + 1.09, lz - 0.1, 0.24, 0.26, "y", { segments: 20 });
    kit.cyl("metal", lx - 1.0, F + 1.23, lz - 0.1, 0.2, 0.02, "y", { color: STEEL_LIGHT, segments: 20 });
    kit.box("emitGreen", lx - 1.0, F + 1.05, lz + 0.15, 0.08, 0.03, 0.01, {});
    kit.box("plate", lx + 0.1, F + 1.2, lz - 0.15, 0.5, 0.5, 0.4, { color: PALE, uv: "world", texel: 1 });
    kit.box("darkGloss", lx + 0.1, F + 1.25, lz + 0.055, 0.34, 0.24, 0.01, {});
    kit.box("screen", lx + 0.1, F + 1.25, lz + 0.061, 0.3, 0.2, 0.004, { uv: "keep", uvRect: screenRect(9) });
    kit.cyl("metal", lx + 0.1, F + 1.55, lz - 0.15, 0.03, 0.2, "y", { color: IMP.steel, segments: 8 });
    kit.cyl("darkGloss", lx + 0.1, F + 1.68, lz - 0.15, 0.07, 0.06, "y", { segments: 12 });
    kit.box("metal", lx + 1.0, F + 1.0, lz + 0.1, 0.5, 0.08, 0.2, { color: IMP.steelDark });
    for (let k = 0; k < 6; k++) kit.place("vial", { pos: [lx + 0.8 + k * 0.08, F + 1.04, lz + 0.1] });
    kit.box("darkGloss", lx - 0.4, F + 0.975, lz + 0.3, 0.3, 0.015, 0.2, { rot: [0, 0.3, 0] });
    kit.place("stool", { pos: [lx - 0.6, F, lz + 0.95], color: IMP.black });
    kit.place("stool", { pos: [lx + 0.7, F, lz + 0.95], color: IMP.black });
    lightPanel(lx, lz + 0.5, Math.PI / 2);
    lightPanel(lx, -167.8, Math.PI / 2);
  }

  // ---- lights (8: 7 points + the surgical shadow spot) -----------------------------------------------------
  ctx.light(0xeaf2ff, 44, 26, [DX, ceil - 0.5, -134.0], { decay: 1.6 });
  ctx.light(0xeaf2ff, 46, 26, [DX - 5.5, ceil - 0.5, -142.5], { decay: 1.6 });
  ctx.light(0xeaf2ff, 46, 26, [DX + 5.5, ceil - 0.5, -142.5], { decay: 1.6 });
  ctx.light(0xeaf2ff, 44, 26, [DX, ceil - 0.5, -150.5], { decay: 1.6 });
  ctx.light(0x5ad8ff, 30, 12, [DX, F + 3.35, -157.4], { decay: 1.5 });
  ctx.light(0xd8ffe8, 40, 24, [DX - 6.0, ceil - 0.5, -159.0], { decay: 1.6 });
  ctx.light(0xeaf2ff, 44, 24, [41.5, ceil - 0.5, -165.5], { decay: 1.6 });
  ctx.spot(0xffffff, 60, 9, 0.62, [57.3, ceil - 0.25, -165.9], [57.3, F + 0.95, -165.3], { penumbra: 0.5, shadow: true, mapSize: 1024 });
}

/** Wheeled stretcher (frame on four wheels, pad, IV pole); length along local Z. */
function gurney(kit, F, x, z, yaw, rand) {
  const P = new Placer(kit, [x, F, z], yaw);
  P.box("paintedMetal", 0, 0.72, 0, 0.7, 0.06, 2.0, { color: IMP.black, texel: 1 });
  P.box("fabric", 0, 0.79, 0, 0.62, 0.08, 1.9, { color: SHEET, uv: "world", texel: 2 });
  P.box("fabric", 0, 0.86, -0.7, 0.36, 0.06, 0.34, { color: PALE, uv: "world", texel: 2 });
  for (const sx of [-0.28, 0.28]) for (const sz of [-0.8, 0.8]) {
    P.cyl("metal", sx, 0.42, sz, 0.02, 0.6, "y", { color: IMP.steel, segments: 8 });
    P.cyl("rubber", sx, 0.08, sz, 0.08, 0.05, "x", { color: IMP.black, segments: 12 });
  }
  P.box("metal", 0, 0.12, 0, 0.6, 0.04, 1.7, { color: IMP.steelDark });
  P.box("metal", 0, 0.2, 0, 0.04, 0.5, 1.5, { color: IMP.steelDark });
  P.cyl("metal", 0.3, 1.3, -0.9, 0.012, 1.1, "y", { color: IMP.steel, segments: 6 });
  P.box("metal", 0.3, 1.84, -0.9, 0.3, 0.02, 0.02, { color: IMP.steel });
  if (rand() < 0.7) P.box("glass", 0.42, 1.65, -0.9, 0.07, 0.22, 0.07, { uv: "keep" });
  P.collider([-0.38, 0, -1.05], [0.38, 0.9, 1.05], "gurney");
}
