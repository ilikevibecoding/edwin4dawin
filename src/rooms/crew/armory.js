// Armory & Equipment Storage — hard red accent. A weapons-check gate and armourer's counter inside the
// secure door (terminal, pass-through hatch, side-arm cabinet), three double-sided rows of rifle racks
// holding ~200 instanced E-11-style blasters under white key light and red practicals, a run of twenty
// white-fronted armour lockers with helmets on their shelves, a power-cell charging wall, a caged secure
// section (mesh on frames, RESTRICTED stencils) with stacked thermal-detonator cases and heavy weapons, and
// a maintenance bench with a field-stripped rifle. Red hazard bands on the floor mark the rack rows and cage.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { IMP } from "../../core/palette.js";
import { Placer, consoleStation, computerBank, wallPanel, crate, pipeRun } from "../../core/props.js";
import { DECAL, decalRect, screenRect, ledRect, GRATE_TILE } from "../../textures.js";

export const meta = { id: "armory", stream: "crew-rooms" };

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

const WHITE = new THREE.Color("#d6dbe2");
const GUN = new THREE.Color("#30343c");
const STEEL_LIGHT = new THREE.Color("#b4bac2");
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export function build(ctx) {
  const { kit, floor: F, ceil } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner; // -61.75..-36.25, -205.75..-178.25
  const DX = -48.5; // door centre line
  const rand = ctx.rand;

  ctx.shell({ floorMat: "deckGrey", floorColor: IMP.plateDark, stripSpacing: 4.5, seed: 61, wallStyles: { plate: 0.7, panel: 0.12, vent: 0.08, hatch: 0.06, pipes: 0.04 } });
  // red accent band around the room at 2.35 m (broken at the door) and red hazard lane at the door approach
  const red = (ax, az, bx, bz) => kit.boxMM("emitRed", [Math.min(ax, bx), F + 2.35, Math.min(az, bz)], [Math.max(ax, bx), F + 2.39, Math.max(az, bz)], {});
  red(x0 + 0.2, z0 + 0.3, x0 + 0.23, z1 - 0.3);
  red(x1 - 0.23, z0 + 0.3, x1 - 0.2, z1 - 0.3);
  red(x0 + 0.3, z0 + 0.2, x1 - 0.3, z0 + 0.23);
  red(x0 + 0.3, z1 - 0.23, DX - 2.2, z1 - 0.2);
  red(DX + 2.2, z1 - 0.23, x1 - 0.3, z1 - 0.2);
  for (const s of [-1, 1]) kit.boxMM("hazardRed", [DX + s * 1.75 - 0.08, F + 0.002, -186.0], [DX + s * 1.75 + 0.08, F + 0.008, z1 - 0.2], { texel: 3 });

  // ---- prototypes -------------------------------------------------------------------------------------
  // E-11 style blaster: muzzle +X, scope on top (+Y), magazine on the left (-Z). ~0.95 m overall.
  proto(kit, "rifle", "metal", [
    C(0.02, 0.44, 0.21, 0, 0, "x", 6), // barrel
    C(0.028, 0.04, 0.44, 0, 0, "x", 6), // muzzle
    B(0.3, 0.07, 0.05, -0.1, 0, 0), // receiver
    B(0.04, 0.11, 0.02, -0.12, -0.03, -0.035), // magazine
    B(0.03, 0.11, 0.028, -0.17, -0.08, 0), // grip
    C(0.018, 0.2, -0.03, 0.075, 0, "x", 6), // scope
    B(0.02, 0.04, 0.02, -0.1, 0.05, 0), // scope mount
    B(0.02, 0.04, 0.02, 0.03, 0.05, 0),
    B(0.03, 0.02, 0.02, 0.1, 0.03, 0), // barrel vents
    B(0.03, 0.02, 0.02, 0.2, 0.03, 0),
    B(0.03, 0.02, 0.02, 0.3, 0.03, 0),
    B(0.27, 0.012, 0.012, -0.385, 0.035, 0), // folding stock bars
    B(0.27, 0.012, 0.012, -0.385, -0.025, 0),
    B(0.02, 0.09, 0.03, -0.53, 0.005, 0), // shoulder plate
  ], { texel: 2 });
  proto(kit, "pistol", "metal", [C(0.012, 0.16, 0.1, 0, 0, "x", 6), B(0.12, 0.04, 0.03, -0.02, 0, 0), B(0.025, 0.09, 0.025, -0.06, -0.06, 0), C(0.012, 0.06, 0.0, 0.035, 0, "x", 6)], { texel: 2 });
  // rack (7 m, double sided): posts, plinth, top rail, backplate, butt shelves, lock bars
  const L = 7.0;
  proto(kit, "rack_frame", "paintedMetal", [B(L, 0.14, 0.6, 0, 0.07, 0), B(0.1, 2.0, 0.6, -L / 2 + 0.05, 1.0, 0), B(0.1, 2.0, 0.6, L / 2 - 0.05, 1.0, 0), B(0.1, 2.0, 0.6, 0, 1.0, 0), B(L, 0.08, 0.6, 0, 2.04, 0), B(L - 0.2, 0.05, 0.5, 0, 0.45, 0)], { texel: 1 });
  proto(kit, "rack_back", "plate", [B(L - 0.2, 1.3, 0.06, 0, 1.15, 0)], { texel: 1 });
  proto(kit, "rack_bar", "metal", [C(0.015, L - 0.3, 0, 1.55, 0.25, "x", 6), C(0.015, L - 0.3, 0, 1.55, -0.25, "x", 6)], { texel: 2 });
  proto(kit, "rack_led", "leds", [B(0.6, 0.06, 0.005, -L / 4, 1.9, 0.305), B(0.6, 0.06, 0.005, L / 4, 1.9, 0.305), B(0.6, 0.06, 0.005, -L / 4, 1.9, -0.305), B(0.6, 0.06, 0.005, L / 4, 1.9, -0.305)], { uv: "keep" });
  proto(kit, "rack_dot", "emitRed", [B(0.05, 0.05, 0.01, 0, 1.9, 0.31), B(0.05, 0.05, 0.01, 0, 1.9, -0.31)], { uv: "keep" });
  // armour locker (front +Z): black carcass with an open helmet niche on top, white door
  proto(kit, "alk_frame", "paintedMetal", [B(0.7, 1.7, 0.6, 0, 0.85, 0), B(0.7, 0.5, 0.08, 0, 1.95, -0.26), B(0.7, 0.06, 0.6, 0, 2.17, 0), B(0.05, 0.5, 0.6, -0.325, 1.95, 0), B(0.05, 0.5, 0.6, 0.325, 1.95, 0)], { texel: 1 });
  proto(kit, "alk_door", "plate", [B(0.6, 1.56, 0.04, 0, 0.87, 0.31), B(0.6, 0.06, 0.6, 0, 1.73, 0)], { texel: 1 });
  proto(kit, "alk_trim", "metal", [B(0.03, 0.16, 0.04, 0.2, 0.95, 0.34), B(0.3, 0.012, 0.02, 0, 1.45, 0.335), B(0.3, 0.012, 0.02, 0, 1.39, 0.335), B(0.3, 0.012, 0.02, 0, 0.3, 0.335), B(0.3, 0.012, 0.02, 0, 0.24, 0.335)], { texel: 2 });
  proto(kit, "alk_ok", "emitGreen", [B(0.04, 0.04, 0.01, -0.22, 1.55, 0.335)], { uv: "keep" });
  proto(kit, "alk_out", "emitRed", [B(0.04, 0.04, 0.01, -0.22, 1.55, 0.335)], { uv: "keep" });
  {
    const g = B(0.4, 0.05, 0.006, 0, 0.12, 0.335);
    proto(kit, "alk_led", "leds", g, { uv: "keep" });
  }
  // stormtrooper helmet (visor +Z)
  proto(kit, "helmet", "plate", [new THREE.SphereGeometry(0.14, 12, 8).translate(0, 0.02, 0), B(0.2, 0.11, 0.14, 0, -0.08, 0.05), B(0.24, 0.06, 0.2, 0, -0.03, 0)], { texel: 3 });
  proto(kit, "helmet_dark", "darkGloss", [B(0.06, 0.03, 0.02, -0.055, 0.03, 0.135), B(0.06, 0.03, 0.02, 0.055, 0.03, 0.135), B(0.14, 0.02, 0.02, 0, -0.06, 0.125), B(0.03, 0.03, 0.02, -0.085, -0.09, 0.11), B(0.03, 0.03, 0.02, 0.085, -0.09, 0.11)], { texel: 3 });
  // thermal detonator case (hazard banded) and power cells
  proto(kit, "det_case", "plate", [B(0.5, 0.3, 0.36, 0, 0.15, 0)], { texel: 2 });
  proto(kit, "det_band", "hazardRed", [B(0.51, 0.07, 0.37, 0, 0.15, 0)], { texel: 3 });
  proto(kit, "det_latch", "metal", [B(0.08, 0.05, 0.03, -0.15, 0.2, 0.185), B(0.08, 0.05, 0.03, 0.15, 0.2, 0.185), B(0.2, 0.03, 0.04, 0, 0.31, 0)], { texel: 2 });
  proto(kit, "cell", "metal", [C(0.03, 0.12, 0, 0.06, 0, "y", 8)], { texel: 3 });
  proto(kit, "cell_ok", "emitGreen", [B(0.02, 0.02, 0.01, 0, 0.14, 0.03)], { uv: "keep" });
  proto(kit, "cell_chg", "emitRed", [B(0.02, 0.02, 0.01, 0, 0.14, 0.03)], { uv: "keep" });
  proto(kit, "stool", "paintedMetal", [C(0.17, 0.04, 0, 0.45, 0), C(0.03, 0.43, 0, 0.22, 0, "y", 8), C(0.16, 0.03, 0, 0.015, 0)], { texel: 1 });

  // ---- entry: weapons-check gate, armourer's counter, power-cell wall ----------------------------------
  {
    const zmax = ctx.wall("zmax").frame; // u = x1 - x
    zmax.decal(x1 - DX, 3.85, 0.07, 1.0, 1.0, DECAL.EMBLEM_RED);
    zmax.decal(x1 - (DX - 2.6), 3.5, 0.07, 0.7, 0.7, DECAL.RESTRICTED);
    zmax.decal(x1 - (DX + 2.6), 3.5, 0.07, 0.7, 0.7, DECAL.RESTRICTED);
    // gate pylons + scanner lintel
    const gz = -181.6;
    for (const s of [-1, 1]) {
      const px = DX + s * 1.95;
      kit.box("paintedMetal", px, F + 1.45, gz, 0.5, 2.9, 0.8, { color: IMP.black, texel: 1 });
      kit.box("plate", px, F + 1.45, gz, 0.42, 2.7, 0.84, { color: IMP.plateDark, uv: "world", texel: 1 });
      kit.box("emitRed", px - s * 0.255, F + 1.5, gz, 0.01, 2.2, 0.05, {});
      kit.box("leds", px - s * 0.255, F + 2.7, gz, 0.006, 0.06, 0.5, { uv: "keep", uvRect: ledRect(5) });
      kit.add("decal", new THREE.PlaneGeometry(0.36, 0.36), { pos: [px, F + 2.2, gz + 0.425], uv: "keep", uvRect: decalRect(DECAL.RESTRICTED) });
      kit.box("hazardRed", px, F + 0.5, gz + 0.415, 0.42, 0.1, 0.02, { texel: 3 });
      kit.collider([px - 0.25, F, gz - 0.4], [px + 0.25, F + 2.9, gz + 0.4], "gate");
    }
    kit.box("paintedMetal", DX, F + 3.1, gz, 4.4, 0.4, 0.8, { color: IMP.black, texel: 1 });
    kit.box("emitRed", DX, F + 2.895, gz, 3.3, 0.01, 0.06, {});
    kit.box("leds", DX, F + 3.1, gz + 0.405, 2.6, 0.08, 0.005, { uv: "keep", uvRect: ledRect(3) });
    kit.box("screen", DX, F + 3.1, gz - 0.405, 1.2, 0.26, 0.005, { rot: [0, Math.PI, 0], uv: "keep", uvRect: screenRect(12) });
    kit.box("darkGloss", DX, F + 0.008, gz, 3.3, 0.016, 1.0, {});
    kit.box("hazardRed", DX, F + 0.012, gz - 0.54, 3.3, 0.006, 0.1, { texel: 3 });
    kit.box("hazardRed", DX, F + 0.012, gz + 0.54, 3.3, 0.006, 0.1, { texel: 3 });
    // armourer's counter (port side of the axis), facing the door
    const ca = x0 + 1.6;
    const cb = DX - 2.6;
    const cz = -182.6; // door-side face
    kit.boxMM("paintedMetal", [ca, F, cz - 0.9], [cb, F + 0.12, cz], { color: IMP.black, texel: 1 });
    kit.boxMM("plate", [ca, F + 0.12, cz - 0.9], [cb, F + 1.0, cz], { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.boxMM("metal", [ca - 0.05, F + 1.0, cz - 0.95], [cb + 0.05, F + 1.06, cz + 0.06], { color: STEEL_LIGHT });
    kit.boxMM("emitRed", [ca + 0.2, F + 0.2, cz + 0.001], [cb - 0.2, F + 0.23, cz + 0.012], {});
    for (let x = ca + 0.5; x < cb - 1.2; x += 1.6) {
      kit.box("paintedMetal", x + 0.6, F + 0.6, cz + 0.01, 1.1, 0.5, 0.02, { color: IMP.black, texel: 1 });
      kit.box("leds", x + 0.6, F + 0.45, cz + 0.025, 0.6, 0.06, 0.005, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
    }
    // pass-through hatch with a screen and a hinged flap on the counter top
    const hx = (ca + cb) / 2 + 1.4;
    kit.box("paintedMetal", hx, F + 1.45, cz - 0.45, 1.4, 0.9, 0.06, { color: IMP.black, texel: 1 });
    kit.box("glass", hx, F + 1.5, cz - 0.45, 1.2, 0.7, 0.01, { uv: "keep" });
    kit.box("darkGloss", hx, F + 1.09, cz - 0.4, 0.8, 0.04, 0.6, { rot: [0.9, 0, 0] });
    kit.box("darkGloss", hx + 1.3, F + 1.35, cz - 0.3, 0.5, 0.35, 0.05, { rot: [-0.3, 0, 0] });
    kit.box("screen", hx + 1.3, F + 1.35, cz - 0.27, 0.44, 0.28, 0.005, { rot: [-0.3, 0, 0], uv: "keep", uvRect: screenRect(13) });
    kit.cyl("metal", hx + 1.3, F + 1.1, cz - 0.4, 0.02, 0.2, "y", { color: IMP.steel, segments: 8 });
    kit.collider([ca - 0.05, F, cz - 0.95], [cb + 0.05, F + 1.1, cz + 0.06], "counter");
    // armourer's terminal behind the counter + side-arm cabinet behind him
    consoleStation(kit, { pos: [hx - 2.0, F, cz - 1.85], yaw: Math.PI, w: 1.8, d: 0.8, h: 1.0, screens: 2, accent: "emitRed", seed: 17, screenSet: [13, 15] });
    const sc = { x: (ca + cb) / 2, z: cz - 3.6 };
    kit.box("paintedMetal", sc.x, F + 1.1, sc.z, 3.0, 2.2, 0.5, { color: IMP.black, texel: 1 });
    kit.box("plate", sc.x, F + 1.1, sc.z, 2.9, 2.0, 0.44, { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.box("paintedMetal", sc.x, F + 1.3, sc.z + 0.245, 2.6, 1.3, 0.02, { color: IMP.trim, texel: 1 });
    kit.box("glass", sc.x, F + 1.3, sc.z + 0.262, 2.5, 1.2, 0.006, { uv: "keep" });
    for (let i = 0; i < 8; i++) {
      const px = sc.x - 1.1 + i * 0.31;
      if (rand() < 0.2) continue;
      kit.place("pistol", { pos: [px, F + 1.4, sc.z + 0.24], rot: [0, 0, -Math.PI / 2 + 0.2], color: GUN });
      kit.box("metal", px, F + 1.45, sc.z + 0.235, 0.02, 0.02, 0.05, { color: IMP.steel });
    }
    kit.box("leds", sc.x, F + 0.5, sc.z + 0.245, 1.6, 0.08, 0.005, { uv: "keep", uvRect: ledRect(8) });
    kit.box("emitRed", sc.x + 1.25, F + 2.0, sc.z + 0.245, 0.06, 0.06, 0.01, {});
    kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [sc.x - 1.15, F + 2.0, sc.z + 0.26], uv: "keep", uvRect: decalRect(DECAL.RESTRICTED) });
    kit.collider([sc.x - 1.5, F, sc.z - 0.25], [sc.x + 1.5, F + 2.2, sc.z + 0.27], "sidearms");
    // starboard side of the entry: computer bank, notice panel, power-cell charging wall
    computerBank(kit, { pos: [x1 - 0.7, F, -181.6], yaw: -Math.PI / 2, w: 2.6, h: 2.3, d: 0.5, seed: 19, accent: "emitRed" });
    wallPanel(kit, zmax, x1 - (DX + 4.0), 1.9, { w: 1.4, h: 0.8, accent: "emitRed", seed: 23 });
    const pcx = x1 - 3.2;
    kit.box("paintedMetal", pcx, F + 1.15, z1 - 0.42, 3.4, 2.3, 0.44, { color: IMP.black, texel: 1 });
    kit.box("plate", pcx, F + 1.15, z1 - 0.42, 3.3, 2.1, 0.4, { color: IMP.plateDark, uv: "world", texel: 1 });
    for (let r = 0; r < 4; r++) {
      const y = F + 0.5 + r * 0.42;
      kit.box("metal", pcx, y - 0.02, z1 - 0.72, 3.0, 0.03, 0.2, { color: IMP.steelDark });
      for (let i = 0; i < 12; i++) {
        if (rand() < 0.15) continue;
        const px = pcx - 1.35 + i * 0.245;
        kit.place("cell", { pos: [px, y, z1 - 0.7], color: rand() < 0.5 ? STEEL_LIGHT : IMP.gunmetal });
        kit.place(rand() < 0.7 ? "cell_ok" : "cell_chg", { pos: [px, y, z1 - 0.7] });
      }
    }
    kit.box("leds", pcx, F + 2.1, z1 - 0.645, 2.4, 0.06, 0.005, { uv: "keep", uvRect: ledRect(6) });
    kit.box("hazardRed", pcx, F + 2.32, z1 - 0.42, 3.42, 0.06, 0.46, { texel: 3 });
    kit.collider([pcx - 1.7, F, z1 - 0.8], [pcx + 1.7, F + 2.4, z1], "cells");
  }

  // ---- rifle racks: three double-sided rows either side of the main aisle ----------------------------------
  const qFront = new THREE.Quaternion().setFromAxisAngle(Z, Math.PI / 2); // muzzle up, right side toward +Z
  const qBack = new THREE.Quaternion().setFromAxisAngle(Y, Math.PI).multiply(qFront);
  const rackRows = [-188.6, -193.2, -197.8];
  const rackX = [x0 + 4.0, x1 - 6.0];
  for (const rz of rackRows) {
    for (const rx of rackX) {
      kit.place("rack_frame", { pos: [rx, F, rz], color: IMP.black });
      kit.place("rack_back", { pos: [rx, F, rz], color: IMP.plateLight });
      kit.place("rack_bar", { pos: [rx, F, rz], color: IMP.steel });
      kit.place("rack_led", { pos: [rx, F, rz] });
      kit.place("rack_dot", { pos: [rx, F, rz] });
      for (let i = 0; i < 20; i++) {
        const sx = rx - L / 2 + 0.35 + i * 0.33;
        if (Math.abs(sx - rx) < 0.2) continue; // centre post
        for (const side of [1, -1]) {
          if (rand() < 0.14) continue;
          kit.place("rifle", { pos: [sx, F + 1.02, rz + side * 0.2], quat: side > 0 ? qFront : qBack, color: GUN });
        }
      }
      kit.collider([rx - L / 2, F, rz - 0.32], [rx + L / 2, F + 2.1, rz + 0.32], "rack");
      // red hazard band on the floor along both faces of the rack
      for (const side of [1, -1]) kit.boxMM("hazardRed", [rx - L / 2, F + 0.002, rz + side * 0.45 - 0.06], [rx + L / 2, F + 0.008, rz + side * 0.45 + 0.06], { texel: 3 });
      kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [rx - L / 2 + 0.05, F + 1.75, rz + 0.31], uv: "keep", uvRect: decalRect(DECAL.NUMBER0 + rackRows.indexOf(rz)) });
      kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [rx + L / 2 - 0.05, F + 1.75, rz + 0.31], uv: "keep", uvRect: decalRect(DECAL.BAY_CODE) });
    }
  }
  // aisle-end column lights between rows: red practical housings on the posts of the main aisle
  for (const rz of [-190.9, -195.5]) {
    for (const rx of [DX - 3.4, DX + 3.4]) {
      kit.box("paintedMetal", rx, F + 2.6, rz, 0.16, 0.5, 0.16, { color: IMP.black, texel: 1 });
      kit.box("emitRed", rx, F + 2.6, rz, 0.06, 0.3, 0.17, {});
      kit.cyl("metal", rx, F + 1.4, rz, 0.03, 2.4, "y", { color: IMP.steelDark, segments: 8 });
      kit.cyl("paintedMetal", rx, F + 0.05, rz, 0.16, 0.1, "y", { color: IMP.black, segments: 12 });
      kit.collider([rx - 0.16, F, rz - 0.16], [rx + 0.16, F + 2.9, rz + 0.16], "post");
    }
  }

  // ---- armour lockers along the starboard wall -------------------------------------------------------------
  {
    const lx = x1 - 0.2 - 0.3; // front faces -X
    const rot = [0, -Math.PI / 2, 0];
    let n = 0;
    for (let z = -186.2; z > -200.2; z -= 0.72) {
      kit.place("alk_frame", { pos: [lx, F, z], rot, color: IMP.black });
      kit.place("alk_door", { pos: [lx, F, z], rot, color: WHITE });
      kit.place("alk_trim", { pos: [lx, F, z], rot, color: IMP.steel });
      kit.place("alk_led", { pos: [lx, F, z], rot });
      const out = rand() < 0.3;
      kit.place(out ? "alk_out" : "alk_ok", { pos: [lx, F, z], rot });
      if (!out) {
        kit.place("helmet", { pos: [lx + 0.05, F + 1.9, z], rot: [0, -Math.PI / 2 + (rand() - 0.5) * 0.3, 0], color: WHITE });
        kit.place("helmet_dark", { pos: [lx + 0.05, F + 1.9, z], rot: [0, -Math.PI / 2 + (rand() - 0.5) * 0.3, 0] });
      }
      n++;
    }
    kit.collider([lx - 0.35, F, -200.2 - 0.36], [x1, F + 2.25, -186.2 + 0.36], "lockers");
    const xmax = ctx.wall("xmax").frame; // u = z - z0
    xmax.decal(-193.2 - z0, 3.0, 0.06, 0.9, 0.9, DECAL.TEXT_A);
    xmax.decal(-188.0 - z0, 3.0, 0.06, 0.7, 0.7, DECAL.NUMBER0);
    xmax.decal(-198.4 - z0, 3.0, 0.06, 0.7, 0.7, DECAL.NUMBER1);
    // bench in front of the lockers
    kit.boxMM("paintedMetal", [lx - 1.7, F + 0.4, -196.5], [lx - 1.3, F + 0.45, -190.0], { color: IMP.black, texel: 1 });
    for (const bz of [-196.3, -193.25, -190.2]) kit.box("paintedMetal", lx - 1.5, F + 0.2, bz, 0.3, 0.4, 0.1, { color: IMP.trim, texel: 1 });
    kit.collider([lx - 1.75, F, -196.6], [lx - 1.25, F + 0.5, -189.9], "bench");
  }

  // ---- caged secure section (port far corner) ---------------------------------------------------------------
  {
    const cx1 = -52.6; // cage line facing the aisle
    const cz1 = -199.4; // cage line facing the racks
    const H = 2.6;
    const mesh = (ax, az, bx, bz) => {
      const w = Math.hypot(bx - ax, bz - az);
      const g = new THREE.PlaneGeometry(w, H - 0.25);
      const yaw = Math.atan2(ax - bx, bz - az) + Math.PI / 2;
      kit.add("grate", g, { pos: [(ax + bx) / 2, F + 0.12 + (H - 0.25) / 2, (az + bz) / 2], rot: [0, yaw, 0], uv: "scale", uvScale: [w / GRATE_TILE[0], (H - 0.25) / GRATE_TILE[1]] });
    };
    const post = (x, z) => kit.box("paintedMetal", x, F + H / 2, z, 0.1, H, 0.1, { color: IMP.black, texel: 1 });
    const rail = (ax, az, bx, bz, y, h = 0.1) => kit.boxMM("paintedMetal", [Math.min(ax, bx) - 0.05, y, Math.min(az, bz) - 0.05], [Math.max(ax, bx) + 0.05, y + h, Math.max(az, bz) + 0.05], { color: IMP.black, texel: 1 });
    // aisle-side fence with a sliding mesh gate (parked open along the fence)
    const gz0 = -201.2;
    const gz1 = -199.4;
    mesh(cx1, z0, cx1, gz0);
    rail(cx1, z0, cx1, gz0, F, 0.12);
    rail(cx1, z0, cx1, gz0, F + H - 0.1);
    kit.collider([cx1 - 0.08, F, z0], [cx1 + 0.08, F + H, gz0], "cage");
    for (const z of [z0 + 0.05, -203.5, gz0, gz1]) post(cx1, z);
    rail(cx1, gz0, cx1, gz1, F + H - 0.1, 0.25);
    kit.box("emitRed", cx1, F + H - 0.16, (gz0 + gz1) / 2, 0.12, 0.03, 1.5, {});
    kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [cx1 + 0.06, F + H + 0.2, (gz0 + gz1) / 2], rot: [0, Math.PI / 2, 0], uv: "keep", uvRect: decalRect(DECAL.RESTRICTED) });
    kit.box("paintedMetal", cx1, F + H + 0.2, (gz0 + gz1) / 2, 0.08, 0.5, 1.9, { color: IMP.black, texel: 1 });
    // the gate itself: mesh panel on a frame, slid to overlap the fence south of the opening
    const gx = cx1 + 0.14;
    mesh(gx, gz0 + 0.1, gx, gz0 - 1.7);
    rail(gx, gz0 + 0.1, gx, gz0 - 1.7, F + 0.05, 0.08);
    rail(gx, gz0 + 0.1, gx, gz0 - 1.7, F + H - 0.2, 0.08);
    for (const z of [gz0 + 0.1, gz0 - 1.7]) kit.box("paintedMetal", gx, F + H / 2, z, 0.08, H - 0.1, 0.08, { color: IMP.black, texel: 1 });
    kit.box("hazardRed", gx + 0.03, F + 1.3, gz0 - 0.8, 0.02, 0.5, 0.9, { texel: 3 });
    kit.collider([gx - 0.06, F, gz0 - 1.7], [gx + 0.06, F + H, gz0 + 0.1], "gate");
    // rack-side fence (full), corner post, top rails, red hazard border on the floor around the cage
    mesh(x0 + 0.2, cz1, cx1, cz1);
    rail(x0 + 0.2, cz1, cx1, cz1, F, 0.12);
    rail(x0 + 0.2, cz1, cx1, cz1, F + H - 0.1);
    for (const x of [-58.5, -55.5]) post(x, cz1);
    kit.collider([x0, F, cz1 - 0.08], [cx1 + 0.08, F + H, cz1 + 0.08], "cage");
    kit.boxMM("hazardRed", [x0 + 0.2, F + 0.002, cz1 + 0.1], [cx1 + 0.2, F + 0.008, cz1 + 0.22], { texel: 3 });
    kit.boxMM("hazardRed", [cx1 + 0.1, F + 0.002, z0], [cx1 + 0.22, F + 0.008, cz1 + 0.22], { texel: 3 });
    // contents: detonator cases on a pallet, heavy repeaters, launcher tubes on wall brackets, munitions crates
    const px = -59.2;
    const pz = -203.6;
    kit.box("paintedMetal", px, F + 0.06, pz, 1.7, 0.12, 1.3, { color: IMP.trim, texel: 1 });
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      if (layer === 1 && rand() < 0.35) continue;
      const q = { pos: [px - 0.55 + i * 0.55, F + 0.12 + layer * 0.31, pz - 0.4 + j * 0.4], rot: [0, (rand() - 0.5) * 0.08, 0] };
      kit.place("det_case", { ...q, color: IMP.gunmetal });
      kit.place("det_band", q);
      kit.place("det_latch", { ...q, color: IMP.steel });
    }
    kit.collider([px - 0.85, F, pz - 0.65], [px + 0.85, F + 0.8, pz + 0.65], "detonators");
    kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [px, F + 0.38, pz + 0.66], uv: "keep", uvRect: decalRect(DECAL.WARNING) });
    // E-Web style repeating blasters on tripods
    for (const [ex, ez, yaw] of [[-55.6, -203.8, 0.4], [-54.2, -201.6, -0.5]]) {
      const P = new Placer(kit, [ex, F, ez], yaw);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        P.cyl("metal", Math.cos(a) * 0.45, 0.45, Math.sin(a) * 0.45, 0.02, 1.0, "y", { color: IMP.steelDark, segments: 6, rot: [Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45] });
      }
      P.box("paintedMetal", 0, 1.0, 0, 0.3, 0.3, 0.7, { color: IMP.black, texel: 1 });
      P.cyl("metal", 0, 1.05, -0.9, 0.035, 1.2, "z", { color: GUN, segments: 8 });
      P.cyl("metal", 0, 1.05, -1.45, 0.06, 0.12, "z", { color: GUN, segments: 8 });
      P.box("metal", 0, 1.22, 0.1, 0.1, 0.14, 0.3, { color: GUN });
      P.box("paintedMetal", 0.35, 0.55, 0.3, 0.4, 0.6, 0.3, { color: IMP.black, texel: 1 });
      P.box("emitRed", 0.35, 0.7, 0.455, 0.2, 0.03, 0.01);
      P.collider([-0.6, 0, -1.5], [0.6, 1.3, 0.6], "eweb");
    }
    // launcher tubes on brackets along the far wall inside the cage
    for (let i = 0; i < 4; i++) {
      const tx = -61.1;
      const tz = -204.9 + i * 0.6;
      kit.cyl("metal", tx, F + 1.7, tz, 0.06, 1.3, "y", { color: IMP.gunmetal, segments: 10 });
      kit.cyl("metal", tx, F + 2.4, tz, 0.075, 0.12, "y", { color: GUN, segments: 10 });
      kit.box("paintedMetal", tx + 0.25, F + 1.3, tz, 0.5, 0.06, 0.1, { color: IMP.black, texel: 1 });
      kit.box("paintedMetal", tx + 0.25, F + 2.1, tz, 0.5, 0.06, 0.1, { color: IMP.black, texel: 1 });
    }
    kit.collider([x0, F, -205.75], [x0 + 0.8, F + 2.5, -202.4], "launchers");
    crate(kit, { pos: [-53.9, F, -204.4], yaw: 0.1, size: [1.2, 0.9, 1.0], band: true, decal: DECAL.WARNING, color: IMP.plateDark });
    crate(kit, { pos: [-53.9, F + 0.9, -204.4], yaw: -0.15, size: [1.0, 0.7, 0.9], band: true, decal: DECAL.RESTRICTED, color: IMP.gunmetal });
    // cage light: red practical housing under the ceiling
    kit.box("paintedMetal", -57, ceil - 0.25, -202.5, 0.5, 0.2, 0.5, { color: IMP.black, texel: 1 });
    kit.box("emitRed", -57, ceil - 0.36, -202.5, 0.42, 0.01, 0.42, { uv: "keep" });
    const zmin = ctx.wall("zmin").frame; // u = x - x0
    zmin.decal(2.4, 3.3, 0.06, 0.9, 0.9, DECAL.RESTRICTED);
    zmin.decal(6.6, 3.3, 0.06, 0.9, 0.9, DECAL.WARNING);
  }

  // ---- maintenance bench along the far wall (starboard of the cage) -------------------------------------------
  {
    const zmin = ctx.wall("zmin").frame; // u = x - x0
    const bx0 = -50.6;
    const bx1 = -42.4;
    kit.boxMM("paintedMetal", [bx0, F, z0], [bx1, F + 0.12, z0 + 0.9], { color: IMP.black, texel: 1 });
    kit.boxMM("plate", [bx0, F + 0.12, z0], [bx1, F + 0.88, z0 + 0.9], { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.boxMM("metal", [bx0 - 0.04, F + 0.88, z0], [bx1 + 0.04, F + 0.94, z0 + 0.95], { color: STEEL_LIGHT });
    kit.boxMM("emitRed", [bx0 + 0.3, F + 0.2, z0 + 0.9], [bx1 - 0.3, F + 0.23, z0 + 0.912], {});
    kit.collider([bx0, F, z0], [bx1, F + 1.0, z0 + 0.95], "workbench");
    // drawers
    for (let x = bx0 + 0.5; x < bx1 - 0.5; x += 1.0) for (const y of [F + 0.35, F + 0.65]) {
      kit.box("paintedMetal", x + 0.4, y, z0 + 0.905, 0.8, 0.24, 0.02, { color: IMP.trim, texel: 1 });
      kit.box("metal", x + 0.4, y, z0 + 0.925, 0.25, 0.02, 0.02, { color: IMP.steel });
    }
    // field-stripped rifle, parts, tools, vice, tester, bench lamp
    kit.place("rifle", { pos: [-47.6, F + 0.985, z0 + 0.5], rot: [0, 0.25, 0], color: GUN });
    for (let i = 0; i < 5; i++) kit.box(i % 2 ? "darkGloss" : "metal", -46.3 + i * 0.18, F + 0.955, z0 + 0.35 + (rand() - 0.5) * 0.2, 0.06 + rand() * 0.08, 0.03, 0.04 + rand() * 0.1, { color: GUN, rot: [0, rand() * 3, 0] });
    kit.cyl("metal", -45.0, F + 0.97, z0 + 0.6, 0.02, 0.44, "x", { color: GUN, segments: 6 });
    kit.box("paintedMetal", -49.6, F + 1.05, z0 + 0.45, 0.3, 0.22, 0.3, { color: IMP.black, texel: 1 });
    kit.box("metal", -49.6, F + 1.2, z0 + 0.45, 0.34, 0.08, 0.06, { color: IMP.steel });
    kit.cyl("metal", -49.4, F + 1.2, z0 + 0.45, 0.012, 0.3, "x", { color: IMP.steel, segments: 6 });
    kit.box("plate", -43.4, F + 1.15, z0 + 0.4, 0.6, 0.42, 0.5, { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.box("screen", -43.4, F + 1.2, z0 + 0.655, 0.4, 0.22, 0.005, { uv: "keep", uvRect: screenRect(6) });
    kit.box("leds", -43.4, F + 1.02, z0 + 0.655, 0.44, 0.05, 0.005, { uv: "keep", uvRect: ledRect(11) });
    kit.cyl("metal", -48.8, F + 1.6, z0 + 0.25, 0.015, 1.3, "y", { color: IMP.steel, segments: 6 });
    kit.box("paintedMetal", -48.5, F + 2.25, z0 + 0.6, 0.5, 0.05, 0.3, { color: IMP.black, texel: 1, rot: [0.4, 0, 0] });
    kit.box("emitWarmSoft", -48.5, F + 2.225, z0 + 0.61, 0.42, 0.01, 0.22, { uv: "keep", rot: [0.4, 0, 0] });
    // tool board on the wall above the bench
    zmin.box("paintedMetal", (bx0 + bx1) / 2 - x0, 1.75, 0.22, 5.0, 1.1, 0.04, { color: IMP.black, texel: 1 });
    for (let i = 0; i < 14; i++) {
      const u = (bx0 + bx1) / 2 - x0 - 2.2 + i * 0.34;
      if (rand() < 0.2) continue;
      const long = rand() < 0.5;
      zmin.box(long ? "metal" : "darkGloss", u, 1.75 + (rand() - 0.5) * 0.3, 0.27, 0.04 + rand() * 0.04, long ? 0.35 + rand() * 0.25 : 0.14, 0.06, { color: IMP.steel });
    }
    zmin.box("leds", (bx0 + bx1) / 2 - x0 + 1.8, 2.15, 0.245, 0.8, 0.06, 0.005, { uv: "keep", uvRect: ledRect(14) });
    zmin.decal((bx0 + bx1) / 2 - x0 - 1.8, 2.15, 0.245, 0.34, 0.34, DECAL.SPEC_PLATE);
    kit.place("stool", { pos: [-47.0, F, z0 + 1.5], color: IMP.black });
    kit.place("stool", { pos: [-44.2, F, z0 + 1.5], color: IMP.black });
    // munitions crates stacked in the starboard corner, hazard pallet
    crate(kit, { pos: [-38.2, F, -204.2], yaw: 0.05, size: [1.4, 0.9, 1.2], band: true, decal: DECAL.HAZARD_BAND, color: IMP.plateDark });
    crate(kit, { pos: [-38.2, F + 0.9, -204.2], yaw: -0.1, size: [1.2, 0.8, 1.0], band: true, decal: DECAL.WARNING, color: IMP.plateWarm });
    crate(kit, { pos: [-40.0, F, -204.5], yaw: 0.3, size: [1.0, 0.7, 0.9], band: false, decal: DECAL.TEXT_C, color: IMP.plateDark });
    kit.boxMM("hazardRed", [-41.4, F + 0.002, z0 + 0.1], [-36.5, F + 0.008, z0 + 0.22], { texel: 3 });
    kit.boxMM("hazardRed", [-41.4, F + 0.002, z0 + 0.1], [-41.28, F + 0.008, -203.0], { texel: 3 });
    // emblem and overhead services on the far wall
    zmin.decal(DX - x0 + 6.8, 3.6, 0.06, 1.1, 1.1, DECAL.EMBLEM_RED);
    pipeRun(kit, { points: [[x0 + 0.5, ceil - 0.35, z0 + 1.4], [x1 - 0.5, ceil - 0.35, z0 + 1.4]], r: 0.08, clamps: 2.5, color: IMP.steelDark });
  }

  // ---- lights (8: 7 points + a shadow spot down the main aisle) ------------------------------------------------
  ctx.light(0xe8eeff, 48, 26, [DX, ceil - 0.5, -182.5], { decay: 1.6 });
  ctx.light(0xff8a76, 30, 20, [x0 + 4.0, ceil - 0.6, -190.9], { decay: 1.6 });
  ctx.light(0xff8a76, 30, 20, [x1 - 4.0, ceil - 0.6, -190.9], { decay: 1.6 });
  ctx.light(0xe8eeff, 44, 24, [x0 + 4.5, ceil - 0.5, -195.5], { decay: 1.6 });
  ctx.light(0xe8eeff, 44, 24, [x1 - 4.5, ceil - 0.5, -195.5], { decay: 1.6 });
  ctx.light(0xff5a48, 30, 16, [-57.0, ceil - 0.6, -202.5], { decay: 1.6 });
  ctx.light(0xfff0dc, 38, 22, [-46.5, ceil - 0.5, -203.0], { decay: 1.6 });
  ctx.spot(0xe8eeff, 120, 20, 0.5, [DX, ceil - 0.2, -186.5], [DX, F, -195.0], { penumbra: 0.5, shadow: true, mapSize: 1024 });
}
