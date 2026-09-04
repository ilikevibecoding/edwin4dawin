// Mess Hall & Galley — warm amber dining hall with four rows of long tables and bench seating under pendant
// lights, tray carts and waste chutes by the door, a 22 m serving counter with a glass sneeze guard and four
// ration dispensers (one is the Eat interactable) under a hanging menu board, and a cool-white galley behind
// it: cold store, hot line with glowing plates under an extractor hood, ovens, wash station, storage racks.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { IMP } from "../../core/palette.js";
import { worldUVs } from "../../core/kit.js";
import { crate, barrel, pipeRun, wallPanel, computerBank } from "../../core/props.js";
import { DECAL, decalRect, screenRect, ledRect } from "../../textures.js";

export const meta = { id: "mess", stream: "crew-rooms" };

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

const STEEL_LIGHT = new THREE.Color("#b4bac2");
const TABLE_TOP = new THREE.Color("#8d929a");
const GALLEY_FLOOR = new THREE.Color("#6b7078");

export function build(ctx) {
  const { kit, floor: F, ceil } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner; // -31.75..-3.75, -169.75..-130.25
  const DX = -18.5; // door centre line
  const rand = ctx.rand;
  const COUNTER_Z = -159.5; // dining-side face of the serving counter
  const GALLEY_Z = -160.4;

  ctx.shell({ floorMat: "deckGrey", floorColor: IMP.plateDark, stripSpacing: 4.6, seed: 33, walls: { zmin: { tints: [[IMP.plateLight, 0.55], [IMP.plate, 0.45]], styles: { plate: 0.75, vent: 0.15, pipes: 0.1 } } } });
  // galley zone gets a lighter floor and a hazard line at the counter
  kit.boxMM("plate", [x0, F, z0], [x1, F + 0.02, GALLEY_Z], { color: GALLEY_FLOOR, uv: "world", texel: 0.5 });
  kit.boxMM("hazard", [x0, F + 0.021, GALLEY_Z - 0.16], [x1, F + 0.026, GALLEY_Z], { texel: 3 });

  // ---- prototypes -------------------------------------------------------------------------------------
  const TL = 6.6;
  proto(kit, "tbl_top", "plate", [B(0.9, 0.06, TL, 0, 0.78, 0)], { texel: 1 });
  proto(kit, "tbl_frame", "paintedMetal", [B(0.5, 0.72, 0.6, 0, 0.36, -2.4), B(0.5, 0.72, 0.6, 0, 0.36, 2.4), B(0.12, 0.1, TL - 0.4, 0, 0.7, 0), B(0.7, 0.04, 0.7, 0, 0.02, -2.4), B(0.7, 0.04, 0.7, 0, 0.02, 2.4)], { texel: 1 });
  proto(kit, "bench_top", "plate", [B(0.36, 0.05, TL - 0.2, 0, 0.45, 0)], { texel: 1 });
  proto(kit, "bench_frame", "paintedMetal", [B(0.3, 0.42, 0.34, 0, 0.21, -2.3), B(0.3, 0.42, 0.34, 0, 0.21, 2.3), B(0.08, 0.08, TL - 0.4, 0, 0.38, 0)], { texel: 1 });
  proto(kit, "pend", "paintedMetal", [B(0.26, 0.09, 1.5, 0, 0, 0), B(0.02, 2.3, 0.02, 0, 1.15, -0.55), B(0.02, 2.3, 0.02, 0, 1.15, 0.55)], { texel: 1 });
  proto(kit, "pend_lamp", "emitWarmSoft", [B(0.2, 0.01, 1.4, 0, -0.05, 0)], { uv: "keep" });
  proto(kit, "tray", "darkGloss", [B(0.42, 0.02, 0.3, 0, 0.01, 0), B(0.16, 0.05, 0.12, -0.08, 0.045, 0.04), B(0.1, 0.04, 0.1, 0.1, 0.04, -0.06)], { texel: 1 });
  proto(kit, "cup", "metal", [C(0.04, 0.11, 0, 0.055, 0, "y", 10)], { texel: 2 });
  proto(kit, "stool", "paintedMetal", [C(0.17, 0.04, 0, 0.45, 0), C(0.03, 0.43, 0, 0.22, 0, "y", 8), C(0.16, 0.03, 0, 0.015, 0)], { texel: 1 });

  // ---- dining hall: 4 rows × 3 tables ---------------------------------------------------------------
  const rows = [DX - 8.4, DX - 2.8, DX + 2.8, DX + 8.4];
  const tz = [-138.9, -146.5, -154.1];
  for (const rx of rows) {
    for (const z of tz) {
      kit.place("tbl_top", { pos: [rx, F, z], color: TABLE_TOP });
      kit.place("tbl_frame", { pos: [rx, F, z], color: IMP.black });
      kit.collider([rx - 0.45, F, z - TL / 2], [rx + 0.45, F + 0.82, z + TL / 2], "table");
      for (const s of [-1, 1]) {
        const bx = rx + s * 0.8;
        kit.place("bench_top", { pos: [bx, F, z], color: IMP.plateDark });
        kit.place("bench_frame", { pos: [bx, F, z], color: IMP.black });
        kit.collider([bx - 0.18, F, z - TL / 2 + 0.1], [bx + 0.18, F + 0.48, z + TL / 2 - 0.1], "bench");
      }
      for (const dz of [-1.7, 1.7]) {
        kit.place("pend", { pos: [rx, F + 2.75, z + dz], color: IMP.black });
        kit.place("pend_lamp", { pos: [rx, F + 2.75, z + dz] });
      }
      // leftovers: trays and cups on some tables
      const nTray = Math.floor(rand() * 3);
      for (let i = 0; i < nTray; i++) {
        const tzz = z + (rand() - 0.5) * (TL - 1.2);
        const txx = rx + (rand() < 0.5 ? -0.2 : 0.2);
        kit.place("tray", { pos: [txx, F + 0.81, tzz], rot: [0, (rand() - 0.5) * 0.5, 0], color: IMP.gunmetal });
        if (rand() < 0.7) kit.place("cup", { pos: [txx + (rand() < 0.5 ? -0.3 : 0.3), F + 0.81, tzz + (rand() - 0.5) * 0.3], color: STEEL_LIGHT });
      }
      if (rand() < 0.5) kit.place("cup", { pos: [rx + (rand() - 0.5) * 0.6, F + 0.81, z + (rand() - 0.5) * 5], color: STEEL_LIGHT });
    }
  }
  // aisle floor lines (white paint) along the central aisle and the two side aisles
  for (const lx of [DX - 5.6, DX, DX + 5.6]) for (const s of [-1, 1]) kit.boxMM("paintedMetal", [lx + s * 1.3 - 0.04, F + 0.001, -157.6], [lx + s * 1.3 + 0.04, F + 0.007, -135.2], { color: new THREE.Color("#cfd4dc"), texel: 1 });

  // ---- entry zone -----------------------------------------------------------------------------------
  {
    const zmax = ctx.wall("zmax").frame; // u = x1 - x
    zmax.decal(x1 - DX, 3.85, 0.07, 1.1, 1.1, DECAL.EMBLEM);
    zmax.decal(x1 - DX - 2.4, 3.3, 0.07, 0.8, 0.8, DECAL.TEXT_A);
    // tray carts either side of the door (outside the 2 m clear zone)
    for (const cx of [DX - 4.2, DX + 4.2]) {
      kit.box("plate", cx, F + 0.6, z1 - 0.75, 0.9, 1.0, 0.6, { color: IMP.plate, uv: "world", texel: 1 });
      kit.box("paintedMetal", cx, F + 0.05, z1 - 0.75, 0.8, 0.1, 0.5, { color: IMP.black, texel: 1 });
      for (let i = 0; i < 9; i++) kit.box("darkGloss", cx, F + 1.12 + i * 0.025, z1 - 0.75, 0.44 + (rand() - 0.5) * 0.02, 0.02, 0.32, {});
      kit.box("metal", cx, F + 1.35, z1 - 0.45, 0.9, 0.03, 0.03, { color: IMP.steel });
      kit.collider([cx - 0.45, F, z1 - 1.05], [cx + 0.45, F + 1.4, z1 - 0.45], "cart");
    }
    // hand-wash / sanitiser stations flanking the door, duty board
    for (const s of [-1, 1]) {
      const hx = DX + s * 2.7;
      kit.box("plate", hx, F + 0.95, z1 - 0.2, 0.5, 0.25, 0.4, { color: STEEL_LIGHT, uv: "world", texel: 1 });
      kit.box("paintedMetal", hx, F + 0.42, z1 - 0.15, 0.3, 0.84, 0.3, { color: IMP.black, texel: 1 });
      kit.cyl("metal", hx, F + 1.18, z1 - 0.12, 0.015, 0.22, "y", { color: IMP.steel, segments: 8 });
      kit.box("emitGreen", hx + 0.15, F + 1.09, z1 - 0.28, 0.04, 0.02, 0.04, {});
      kit.collider([hx - 0.25, F, z1 - 0.42], [hx + 0.25, F + 1.1, z1], "wash");
    }
    wallPanel(kit, zmax, x1 - (DX + 6.5), 1.9, { w: 1.6, h: 0.9, accent: "emitAmber", seed: 12 });
    computerBank(kit, { pos: [DX - 8.2, F, z1 - 0.5], yaw: Math.PI, w: 2.2, h: 2.2, d: 0.5, seed: 9, accent: "emitAmber" });
  }
  // waste chutes + tray return on both side walls near the entrance
  for (const S of [{ x: x0, dir: 1, side: "xmin" }, { x: x1, dir: -1, side: "xmax" }]) {
    const fr = ctx.wall(S.side).frame;
    const zc = -136.5;
    const u = S.side === "xmin" ? z1 - zc : zc - z0;
    fr.box("paintedMetal", u, 1.35, 0.08, 1.2, 1.5, 0.16, { color: IMP.black, texel: 1 });
    fr.box("plate", u, 1.35, 0.17, 1.0, 0.7, 0.04, { color: IMP.plateDark, uv: "keep" });
    fr.box("darkGloss", u, 1.25, 0.2, 0.7, 0.35, 0.03);
    fr.box("metal", u, 1.05, 0.26, 0.74, 0.03, 0.2, { color: IMP.steel });
    fr.box("hazard", u, 2.0, 0.17, 1.1, 0.08, 0.02, { texel: 3 });
    fr.decal(u, 0.85, 0.2, 0.36, 0.36, DECAL.WARNING);
    fr.box("emitAmber", u + 0.45, 1.95, 0.17, 0.05, 0.05, 0.01);
    // tray-return shelf with a stack of dirty trays
    fr.box("metal", u + 1.5, 0.95, 0.35, 1.4, 0.04, 0.7, { color: IMP.steel });
    fr.box("paintedMetal", u + 1.5, 0.47, 0.35, 1.2, 0.92, 0.5, { color: IMP.black, texel: 1 });
    for (let i = 0; i < 6; i++) fr.box("darkGloss", u + 1.5 + (rand() - 0.5) * 0.08, 0.98 + i * 0.025, 0.35, 0.42, 0.02, 0.3);
    kit.collider([Math.min(S.x, S.x + S.dir * 0.75), F, zc - 2.3], [Math.max(S.x, S.x + S.dir * 0.75), F + 1.6, zc + 0.7], "chute");
  }

  // ---- serving counter ------------------------------------------------------------------------------
  const cxa = DX - 11.0;
  const cxb = DX + 11.0;
  {
    kit.boxMM("paintedMetal", [cxa, F, COUNTER_Z - 0.9], [cxb, F + 0.12, COUNTER_Z], { color: IMP.black, texel: 1 });
    kit.boxMM("plate", [cxa, F + 0.12, COUNTER_Z - 0.9], [cxb, F + 0.92, COUNTER_Z], { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.boxMM("metal", [cxa - 0.05, F + 0.92, COUNTER_Z - 0.95], [cxb + 0.05, F + 0.98, COUNTER_Z + 0.08], { color: STEEL_LIGHT });
    kit.boxMM("emitAmber", [cxa + 0.2, F + 0.2, COUNTER_Z + 0.001], [cxb - 0.2, F + 0.23, COUNTER_Z + 0.012], {});
    // front panel rhythm: black recessed panels with indicator clusters
    for (let x = cxa + 0.6; x < cxb - 0.6; x += 2.2) {
      kit.box("paintedMetal", x + 0.8, F + 0.55, COUNTER_Z + 0.01, 1.4, 0.5, 0.02, { color: IMP.black, texel: 1 });
      kit.box("leds", x + 0.8, F + 0.4, COUNTER_Z + 0.025, 0.6, 0.06, 0.005, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
    }
    // sneeze guard on steel posts
    for (let x = cxa + 0.3; x <= cxb - 0.3 + 1e-3; x += 2.2) kit.cyl("metal", x, F + 1.34, COUNTER_Z - 0.3, 0.02, 0.72, "y", { color: IMP.steel, segments: 8 });
    kit.boxMM("metal", [cxa + 0.3, F + 1.68, COUNTER_Z - 0.32], [cxb - 0.3, F + 1.71, COUNTER_Z - 0.28], { color: IMP.steel });
    kit.add("glass", new THREE.PlaneGeometry(cxb - cxa - 0.6, 0.6), { pos: [(cxa + cxb) / 2, F + 1.38, COUNTER_Z - 0.3], uv: "keep" });
    kit.collider([cxa, F, COUNTER_Z - 0.95], [cxb, F + 1.0, COUNTER_Z + 0.08], "counter");
    // ration dispensers on the counter (dining side)
    const dispX = [DX - 7.2, DX - 2.4, DX + 2.4, DX + 7.2];
    dispX.forEach((dx, i) => {
      const y0 = F + 0.98;
      const zc = COUNTER_Z - 0.55;
      const isIt = i === 2;
      if (!isIt) kit.box("plate", dx, y0 + 0.5, zc, 0.8, 1.0, 0.55, { color: IMP.plateLight, uv: "world", texel: 1 });
      kit.box("paintedMetal", dx, y0 + 0.5, zc + 0.28, 0.7, 0.9, 0.02, { color: IMP.black, texel: 1 });
      kit.box("darkGloss", dx, y0 + 0.25, zc + 0.3, 0.5, 0.2, 0.06, {});
      kit.box("emitAmber", dx, y0 + 0.16, zc + 0.335, 0.46, 0.015, 0.01, {});
      kit.box("screen", dx, y0 + 0.66, zc + 0.295, 0.5, 0.28, 0.005, { uv: "keep", uvRect: screenRect(i % 2 ? 6 : 15) });
      kit.box("leds", dx, y0 + 0.44, zc + 0.295, 0.5, 0.05, 0.005, { uv: "keep", uvRect: ledRect(4 + i) });
      kit.box("emitGreen", dx + 0.28, y0 + 0.88, zc + 0.295, 0.05, 0.05, 0.01, {});
      kit.box("metal", dx, y0 + 1.02, zc, 0.84, 0.04, 0.6, { color: STEEL_LIGHT });
      kit.add("decal", new THREE.PlaneGeometry(0.3, 0.3), { pos: [dx - 0.2, y0 + 0.86, zc + 0.3], uv: "keep", uvRect: decalRect(DECAL.NUMBER0 + i) });
      if (isIt) {
        const m = ctx.materials.plate.clone();
        m.vertexColors = false;
        m.color.copy(IMP.plateLight);
        const g = new THREE.BoxGeometry(0.8, 1.0, 0.55);
        g.translate(dx, y0 + 0.5, zc);
        worldUVs(g, 1);
        const mesh = new THREE.Mesh(g, m);
        mesh.castShadow = mesh.receiveShadow = true;
        ctx.interactable({ object: mesh, material: m, id: "mess", kind: "mess", label: "Eat", key: "E" });
      }
    });
    // menu board hanging over the counter
    const my = F + 3.1;
    kit.box("paintedMetal", DX, my, COUNTER_Z - 0.2, 5.2, 1.3, 0.16, { color: IMP.black, texel: 1 });
    kit.box("screen", DX - 1.25, my, COUNTER_Z - 0.115, 2.3, 1.05, 0.01, { uv: "keep", uvRect: screenRect(7) });
    kit.box("screen", DX + 1.25, my, COUNTER_Z - 0.115, 2.3, 1.05, 0.01, { uv: "keep", uvRect: screenRect(3) });
    kit.box("leds", DX, my + 0.6, COUNTER_Z - 0.115, 4.8, 0.05, 0.005, { uv: "keep", uvRect: ledRect(1) });
    for (const s of [-1, 1]) kit.box("paintedMetal", DX + s * 2.3, (my + 0.65 + ceil) / 2, COUNTER_Z - 0.2, 0.06, ceil - my - 0.65, 0.06, { color: IMP.black, texel: 1 });
    kit.box("emitAmber", DX, my - 0.62, COUNTER_Z - 0.1, 5.0, 0.03, 0.02, {});
  }

  // ---- galley -----------------------------------------------------------------------------------------
  {
    const back = z0; // -169.75
    const lineZ = back + 0.45;
    // continuous steel work line along the forward wall
    kit.boxMM("paintedMetal", [x0 + 0.4, F, back], [x1 - 0.4, F + 0.12, back + 0.9], { color: IMP.black, texel: 1 });
    kit.boxMM("plate", [x0 + 0.4, F + 0.12, back], [x1 - 0.4, F + 0.88, back + 0.9], { color: IMP.plate, uv: "world", texel: 1 });
    kit.boxMM("metal", [x0 + 0.36, F + 0.88, back], [x1 - 0.36, F + 0.94, back + 0.95], { color: STEEL_LIGHT });
    kit.collider([x0, F, back], [x1, F + 1.0, back + 1.0], "galleyline");
    // cold store: three refrigerated cabinets (port end)
    for (let i = 0; i < 3; i++) {
      const cx = x0 + 1.5 + i * 2.1;
      kit.box("plate", cx, F + 1.65, back + 0.45, 1.9, 1.5, 0.9, { color: IMP.plateLight, uv: "world", texel: 1 });
      for (const s of [-1, 1]) {
        kit.box("paintedMetal", cx + s * 0.47, F + 1.65, back + 0.905, 0.86, 1.36, 0.02, { color: IMP.trim, texel: 1 });
        kit.box("metal", cx + s * 0.1, F + 1.65, back + 0.93, 0.03, 0.5, 0.04, { color: IMP.steel });
      }
      kit.box("emitCyan", cx, F + 2.32, back + 0.915, 1.6, 0.03, 0.01, {});
      kit.box("leds", cx - 0.6, F + 2.28, back + 0.915, 0.4, 0.05, 0.005, { uv: "keep", uvRect: ledRect(9 + i) });
      kit.collider([cx - 0.95, F, back], [cx + 0.95, F + 2.4, back + 0.95], "coldstore");
    }
    // hot line: six plates with glowing rings under an extractor hood
    const hx0 = DX - 3.9;
    for (let i = 0; i < 6; i++) {
      const px = hx0 + i * 0.95;
      kit.cyl("darkGloss", px, F + 0.95, lineZ, 0.27, 0.02, "y", { segments: 20 });
      kit.add(i % 3 === 1 ? "emitRed" : "emitAmber", new THREE.TorusGeometry(0.19, 0.018, 6, 24), { pos: [px, F + 0.965, lineZ], rot: [Math.PI / 2, 0, 0] });
      kit.cyl("metal", px, F + 0.97, lineZ, 0.05, 0.01, "y", { color: IMP.steelDark, segments: 10 });
    }
    // pans left on two plates
    for (const i of [0, 4]) {
      const px = hx0 + i * 0.95;
      kit.cyl("metal", px, F + 1.02, lineZ, 0.21, 0.09, "y", { color: IMP.gunmetal, segments: 16 });
      kit.cyl("metal", px, F + 1.04, lineZ + 0.36, 0.015, 0.3, "z", { color: IMP.steelDark, segments: 8 });
    }
    // control strip with knobs
    for (let i = 0; i < 6; i++) kit.cyl("darkGloss", hx0 + i * 0.95, F + 0.9, back + 0.98, 0.035, 0.05, "z", { segments: 10 });
    kit.box("leds", DX - 1.5, F + 0.8, back + 0.96, 4.6, 0.05, 0.005, { uv: "keep", uvRect: ledRect(6) });
    // extractor hood + duct + work light
    const hoodX = hx0 + 2.4;
    kit.box("plate", hoodX, F + 2.45, back + 0.6, 6.4, 0.5, 1.4, { color: IMP.plate, uv: "world", texel: 1 });
    kit.box("paintedMetal", hoodX, F + 2.18, back + 0.6, 6.5, 0.06, 1.5, { color: IMP.black, texel: 1 });
    kit.box("emitWhiteSoft", hoodX, F + 2.185, back + 1.0, 5.8, 0.01, 0.14, { uv: "keep" });
    for (let k = 0; k < 4; k++) kit.box("metal", hoodX - 2.2 + k * 1.45, F + 2.2, back + 0.45, 1.0, 0.02, 0.5, { color: IMP.steelDark, rot: [0.4, 0, 0] });
    kit.box("paintedMetal", hoodX, (F + 2.7 + ceil) / 2, back + 0.6, 1.2, ceil - F - 2.7, 0.9, { color: IMP.darkMetal, texel: 1 });
    kit.box("hazard", hoodX, F + 2.72, back + 0.6, 6.42, 0.06, 1.42, { texel: 3 });
    // ovens (two stacked units)
    for (const ox of [DX + 2.7, DX + 3.9]) {
      kit.box("plate", ox, F + 1.4, back + 0.45, 1.1, 2.0, 0.9, { color: IMP.plateDark, uv: "world", texel: 1 });
      for (const oy of [F + 0.65, F + 1.35, F + 2.05]) {
        kit.box("paintedMetal", ox, oy, back + 0.905, 0.9, 0.55, 0.02, { color: IMP.black, texel: 1 });
        kit.box("darkGloss", ox, oy - 0.03, back + 0.92, 0.7, 0.36, 0.01, {});
        kit.box("metal", ox, oy + 0.24, back + 0.95, 0.8, 0.03, 0.05, { color: IMP.steel });
        kit.box(rand() < 0.5 ? "emitAmber" : "emitRed", ox + 0.36, oy + 0.2, back + 0.92, 0.04, 0.04, 0.01, {});
      }
      kit.collider([ox - 0.55, F, back], [ox + 0.55, F + 2.4, back + 0.95], "oven");
    }
    // wash station: two deep basins, tap column, sanitiser box, pot rack above
    const wx = DX + 7.6;
    for (const s of [-1, 1]) {
      kit.box("metal", wx + s * 0.6, F + 0.8, lineZ, 0.9, 0.2, 0.7, { color: IMP.steelDark });
      kit.box("darkGloss", wx + s * 0.6, F + 0.85, lineZ, 0.78, 0.02, 0.58, {});
    }
    kit.cyl("metal", wx, F + 1.25, back + 0.12, 0.025, 0.7, "y", { color: IMP.steel, segments: 8 });
    kit.cyl("metal", wx, F + 1.58, back + 0.35, 0.02, 0.5, "z", { color: IMP.steel, segments: 8 });
    kit.box("plate", wx + 2.0, F + 1.5, back + 0.45, 1.2, 1.2, 0.9, { color: IMP.plateLight, uv: "world", texel: 1 });
    kit.box("darkGloss", wx + 2.0, F + 1.6, back + 0.905, 0.9, 0.5, 0.02, {});
    kit.box("leds", wx + 2.0, F + 1.25, back + 0.915, 0.7, 0.06, 0.005, { uv: "keep", uvRect: ledRect(11) });
    kit.collider([wx + 1.4, F, back], [wx + 2.6, F + 2.1, back + 0.95], "sanitiser");
    // pot rack: rail with hanging pans
    kit.box("metal", wx - 0.2, F + 2.3, back + 0.55, 3.2, 0.04, 0.04, { color: IMP.steel });
    for (let i = 0; i < 5; i++) {
      const px = wx - 1.6 + i * 0.7;
      kit.cyl("metal", px, F + 2.0, back + 0.55, 0.16 + rand() * 0.06, 0.06, "z", { color: IMP.gunmetal, segments: 14 });
      kit.box("metal", px, F + 2.17, back + 0.55, 0.02, 0.28, 0.02, { color: IMP.steelDark });
    }
    // storage rack along the port wall with canisters and ration crates
    const rx = x0 + 0.55;
    for (let s = 0; s < 4; s++) kit.box("metal", rx, F + 0.35 + s * 0.65, -165.4, 1.0, 0.04, 3.2, { color: IMP.steelDark });
    for (const zz of [-166.95, -163.85]) for (const xx of [rx - 0.45, rx + 0.45]) kit.box("paintedMetal", xx, F + 1.3, zz, 0.06, 2.6, 0.06, { color: IMP.black, texel: 1 });
    for (let s = 0; s < 4; s++) {
      for (let i = 0; i < 4; i++) {
        if (rand() < 0.3) continue;
        const iz = -166.6 + i * 0.8;
        if (rand() < 0.5) kit.cyl("metal", rx + (rand() - 0.5) * 0.3, F + 0.37 + s * 0.65 + 0.22, iz, 0.14, 0.44, "y", { color: rand() < 0.5 ? STEEL_LIGHT : IMP.gunmetal, segments: 12 });
        else kit.box("plate", rx, F + 0.37 + s * 0.65 + 0.2, iz, 0.6, 0.4, 0.6, { color: rand() < 0.5 ? IMP.plateDark : IMP.plateWarm, uv: "world", texel: 1 });
      }
    }
    kit.collider([x0, F, -167.1], [rx + 0.55, F + 2.7, -163.7], "rack");
    crate(kit, { pos: [x0 + 1.1, F, -161.6], yaw: 0.2, size: [1.0, 0.8, 0.9], band: false, decal: DECAL.TEXT_C, color: IMP.plateWarm });
    barrel(kit, { pos: [x1 - 0.9, F, -168.6], r: 0.34, h: 0.9, color: IMP.plateDark, band: IMP.plateLight });
    barrel(kit, { pos: [x1 - 1.7, F, -168.7], r: 0.34, h: 0.9, color: IMP.plateDark, band: IMP.plateLight });
    // prep island behind the counter
    const ix = DX;
    kit.box("plate", ix, F + 0.45, -163.6, 4.2, 0.9, 1.0, { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.box("metal", ix, F + 0.93, -163.6, 4.3, 0.06, 1.1, { color: STEEL_LIGHT });
    for (let i = 0; i < 3; i++) kit.box("darkGloss", ix - 1.4 + i * 1.4, F + 0.97, -163.6, 0.5, 0.02, 0.36, {});
    kit.box("metal", ix + 0.9, F + 0.99, -163.4, 0.3, 0.03, 0.2, { color: IMP.steel });
    kit.collider([ix - 2.15, F, -164.15], [ix + 2.15, F + 1.0, -163.05], "island");
    for (const s of [-1, 1]) kit.place("stool", { pos: [ix + s * 1.2, F, -162.4], color: IMP.black });
    // overhead services: steam line along the galley
    pipeRun(kit, { points: [[x0 + 0.5, ceil - 0.3, back + 1.6], [x1 - 0.5, ceil - 0.3, back + 1.6]], r: 0.09, clamps: 2.4, color: IMP.steelDark });
    pipeRun(kit, { points: [[x0 + 0.5, ceil - 0.5, back + 1.85], [x1 - 0.5, ceil - 0.5, back + 1.85]], r: 0.05, clamps: 3, color: IMP.steel });
    kit.add("decal", new THREE.PlaneGeometry(0.8, 0.8), { pos: [x0 + 1.5, F + 3.3, back + 0.06], uv: "keep", uvRect: decalRect(DECAL.TEXT_B) });
    kit.add("decal", new THREE.PlaneGeometry(0.8, 0.8), { pos: [x1 - 1.5, F + 3.3, back + 0.06], uv: "keep", uvRect: decalRect(DECAL.WARNING) });
  }

  // ---- beverage dispenser on the starboard wall by the counter end ----------------------------------
  {
    const bz = -156.5;
    kit.box("plate", x1 - 0.35, F + 1.05, bz, 0.7, 2.1, 1.5, { color: IMP.plateLight, uv: "world", texel: 1 });
    kit.box("paintedMetal", x1 - 0.71, F + 1.05, bz, 0.02, 1.9, 1.3, { color: IMP.black, texel: 1 });
    kit.box("screen", x1 - 0.725, F + 1.65, bz, 0.01, 0.4, 0.9, { uv: "keep", uvRect: screenRect(6) });
    for (let i = 0; i < 3; i++) {
      const tz = bz - 0.4 + i * 0.4;
      kit.cyl("metal", x1 - 0.85, F + 1.2, tz, 0.02, 0.28, "x", { color: IMP.steel, segments: 8 });
      kit.cyl("metal", x1 - 0.98, F + 1.12, tz, 0.02, 0.16, "y", { color: IMP.steel, segments: 8 });
      kit.box(i === 1 ? "emitRed" : "emitBlue", x1 - 0.725, F + 1.35, tz, 0.01, 0.04, 0.04, {});
    }
    kit.box("metal", x1 - 0.9, F + 0.72, bz, 0.4, 0.04, 1.3, { color: IMP.steelDark });
    kit.box("hazard", x1 - 0.35, F + 2.12, bz, 0.72, 0.06, 1.52, { texel: 3 });
    kit.collider([x1 - 1.1, F, bz - 0.8], [x1, F + 2.2, bz + 0.8], "beverage");
    for (let i = 0; i < 4; i++) kit.place("cup", { pos: [x1 - 0.85 + (rand() - 0.5) * 0.1, F + 0.74, bz - 0.9 + i * 0.13], color: STEEL_LIGHT });
  }

  // ---- lights (8): warm over the tables, neutral counter/entry, cool galley ---------------------------
  for (const lx of [DX - 5.6, DX + 5.6]) for (const lz of [-140.5, -152.5]) ctx.light(0xffd2a0, 34, 24, [lx, ceil - 0.7, lz], { decay: 1.5 });
  ctx.light(0xfff0dc, 30, 22, [DX, ceil - 0.6, -158.2], { decay: 1.5 });
  ctx.light(0xe8f0ff, 30, 20, [DX - 6.5, ceil - 0.5, -165.5], { decay: 1.5 });
  ctx.light(0xe8f0ff, 30, 20, [DX + 6.5, ceil - 0.5, -165.5], { decay: 1.5 });
  ctx.light(0xe8eeff, 26, 20, [DX, ceil - 0.6, -132.8], { decay: 1.6 });
}
