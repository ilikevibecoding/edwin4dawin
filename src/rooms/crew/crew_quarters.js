// Crew Quarters — stormtrooper / crew berthing. A central aisle with lane markings runs from the corridor door
// to a refresher at the far end; twelve squad bays (six per side) open off it, each holding six triple bunk
// stacks facing each other across a bay aisle, a locker row on the outer wall and a small table. Warm amber
// reading lights on every bunk, white aisle strips, a clinical white refresher (sinks + mirror, shower stalls
// with sliding glass doors, wet-floor grating). Interactables: one bottom bunk (Sleep) and a sink (Wash up).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { IMP } from "../../core/palette.js";
import { wallFrame, panelGrid } from "../../core/frame.js";
import { worldUVs } from "../../core/kit.js";
import { lockerRow, doorFrame, computerBank, wallPanel, crate, barrel, floorGrate, pipeRun, ceilingStrip } from "../../core/props.js";
import { DECAL, decalRect, ledRect } from "../../textures.js";

export const meta = { id: "crew_quarters", stream: "crew-rooms" };

// ---- local geometry helpers ------------------------------------------------------------------------
const B = (sx, sy, sz, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
function C(r, len, x, y, z, axis = "y", seg = 12) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  if (axis === "x") g.rotateZ(Math.PI / 2);
  else if (axis === "z") g.rotateX(Math.PI / 2);
  return g.translate(x, y, z);
}
// kit.proto strips the colour attribute while the shared materials use vertex colours, so instances would read
// black; give every prototype a white colour attribute (per-instance tint then multiplies it).
function proto(kit, name, mat, geos, opts = {}) {
  kit.proto(name, mat, Array.isArray(geos) ? mergeGeometries(geos, false) : geos, opts);
  const g = kit.protos.get(name).geo;
  g.setAttribute("color", new THREE.BufferAttribute(new Uint8Array(g.attributes.position.count * 3).fill(255), 3, true));
}

const LEVELS = [0.5, 1.5, 2.5];
const WHITE_PAINT = new THREE.Color("#cfd4dc");
const ARMOUR = new THREE.Color("#e4e7ec");
const MATTRESS = new THREE.Color("#7d8189");
const PILLOW = new THREE.Color("#c9ccd2");

export function build(ctx) {
  const { kit, floor: F, ceil } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner; // -61.75..-36.25, -169.75..-130.25
  const AX = -48.5; // aisle / door centre line
  const REF_Z = -162.0; // refresher partition
  const rand = ctx.rand;

  ctx.shell({
    floorMat: "deckGrey",
    floorColor: IMP.plateDark,
    stripSpacing: 4.25,
    seed: 21,
    walls: {
      zmin: { tints: [[IMP.plateLight, 0.6], [IMP.plate, 0.4]], styles: { plate: 0.8, vent: 0.1, pipes: 0.1 } },
    },
  });

  // ---- prototypes ---------------------------------------------------------------------------------
  // triple bunk stack: length along local X (head at -X), width along Z, posts 3 m tall
  const frame = [];
  for (const [px, pz] of [[-0.97, -0.42], [0.97, -0.42], [-0.97, 0.42], [0.97, 0.42]]) frame.push(B(0.06, 3.0, 0.06, px, 1.5, pz));
  for (const L of LEVELS) {
    frame.push(B(2.0, 0.1, 0.9, 0, L - 0.05, 0));
    frame.push(B(0.04, 0.45, 0.84, -0.97, L + 0.28, 0)); // head panel
    frame.push(B(0.06, 0.08, 0.3, -0.94, L + 0.78, 0)); // reading-lamp housing
    if (L > 1) for (const s of [-1, 1]) frame.push(B(0.9, 0.04, 0.03, -0.5, L + 0.32, s * 0.44)); // head-half rails
  }
  for (const s of [-1, 1]) frame.push(B(2.0, 0.05, 0.05, 0, 3.0, s * 0.42));
  proto(kit, "bk_frame", "paintedMetal", frame, { texel: 1 });
  proto(kit, "bk_drawer", "plate", [B(1.9, 0.34, 0.84, 0, 0.22, 0), B(0.02, 3.0, 0.86, -1.29, 1.5, 0), ...LEVELS.map((L) => B(0.24, 0.02, 0.86, -1.15, L + 0.45, 0))], { texel: 1 });
  proto(kit, "bk_mat", "fabric", LEVELS.map((L) => B(1.9, 0.14, 0.82, 0, L + 0.07, 0)), { texel: 2 });
  proto(kit, "bk_pil", "fabric", LEVELS.map((L) => B(0.42, 0.1, 0.5, -0.7, L + 0.19, 0)), { texel: 2 });
  proto(kit, "bk_blk", "fabric", LEVELS.map((L) => B(0.5, 0.06, 0.78, 0.6, L + 0.17, 0)), { texel: 2 });
  proto(kit, "bk_lamp", "emitWarmSoft", LEVELS.map((L) => B(0.01, 0.04, 0.24, -0.905, L + 0.78, 0)), { uv: "keep" });
  // ladder (stands proud of the aisle face, foot half of the stack)
  const lad = [B(0.04, 2.9, 0.04, -0.16, 1.45, 0), B(0.04, 2.9, 0.04, 0.16, 1.45, 0)];
  for (let k = 0; k < 9; k++) lad.push(B(0.36, 0.03, 0.03, 0, 0.3 + k * 0.3, 0));
  for (const y of [0.4, 2.7]) for (const x of [-0.16, 0.16]) lad.push(B(0.04, 0.04, 0.1, x, y, -0.06));
  proto(kit, "ladder", "metal", lad, { texel: 1 });
  // personal effects
  proto(kit, "helmet", "paintedMetal", [new THREE.SphereGeometry(0.13, 12, 8).translate(0, 0.13, 0), B(0.22, 0.06, 0.14, 0, 0.16, -0.06)], { texel: 2 });
  proto(kit, "visor", "darkGloss", [B(0.2, 0.05, 0.06, 0, 0.14, -0.11), B(0.24, 0.03, 0.05, 0, 0.06, -0.12)], { texel: 1 });
  proto(kit, "uniform", "fabric", [B(0.3, 0.09, 0.22, 0, 0.045, 0), B(0.24, 0.06, 0.18, 0.01, 0.12, 0.01)], { texel: 3 });
  proto(kit, "stool", "paintedMetal", [C(0.17, 0.04, 0, 0.45, 0), C(0.03, 0.43, 0, 0.22, 0, "y", 8), C(0.16, 0.03, 0, 0.015, 0)], { texel: 1 });

  // ---- bays -----------------------------------------------------------------------------------------
  const PITCH = 4.0;
  const NB = 6;
  const zP = (k) => -135.5 - k * PITCH; // partition lines k = 0..6
  const sides = [
    { dir: -1, wall: x0, aisleEdge: AX - 1.5, yaw: 0 }, // port: heads toward -X
    { dir: 1, wall: x1, aisleEdge: AX + 1.5, yaw: Math.PI }, // starboard: heads toward +X
  ];
  let firstStack = null;
  for (const S of sides) {
    const wallFr = ctx.wall(S.dir < 0 ? "xmin" : "xmax").frame;
    const xEnd = S.aisleEdge + S.dir * 0.2; // partition aisle end
    // partitions (plain slabs; the stacks hide their faces) with detailed aisle-end caps
    for (let k = 0; k <= NB; k++) {
      const z = zP(k);
      const xa = Math.min(S.wall, xEnd);
      const xb = Math.max(S.wall, xEnd);
      kit.boxMM("plate", [xa, F, z - 0.08], [xb, F + 2.9, z + 0.08], { color: IMP.plateDark, uv: "world", texel: 1 });
      kit.boxMM("paintedMetal", [xa, F + 2.9, z - 0.12], [xb, F + 2.98, z + 0.12], { color: IMP.black, texel: 1 });
      kit.boxMM("paintedMetal", [xa, F, z - 0.1], [xb, F + 0.12, z + 0.1], { color: IMP.black, texel: 1 });
      // aisle-end cap: black pilaster with an amber slot and a bay sign facing the door
      const capX = xEnd + S.dir * 0.15;
      kit.box("paintedMetal", capX, F + 1.5, z, 0.32, 3.0, 0.32, { color: IMP.black, texel: 1 });
      kit.box("emitAmber", capX - S.dir * 0.165, F + 1.7, z, 0.01, 1.4, 0.03);
      if (k < NB) {
        kit.box("paintedMetal", capX, F + 2.55, z + 0.19, 0.42, 0.42, 0.06, { color: IMP.trim, texel: 1 });
        kit.add("decal", new THREE.PlaneGeometry(0.34, 0.34), { pos: [capX, F + 2.6, z + 0.225], uv: "keep", uvRect: decalRect(DECAL.NUMBER0 + (k % 4)) });
        kit.box("leds", capX, F + 2.38, z + 0.225, 0.3, 0.05, 0.005, { uv: "keep", uvRect: ledRect(3 + k) });
      }
      kit.collider([xa, F, z - 0.1], [xb, F + 3.0, z + 0.1], "partition");
      kit.collider([capX - 0.16, F, z - 0.16], [capX + 0.16, F + 3.0, z + 0.16], "partition");
    }
    // first partition faces the entry zone: give it a proper Imperial panel face
    {
      const zFace = zP(0) + 0.28;
      const from = S.dir < 0 ? [S.wall, zFace] : [xEnd, zFace];
      const to = S.dir < 0 ? [xEnd, zFace] : [S.wall, zFace];
      const { frame: pf, length } = wallFrame(kit, from, to, F);
      panelGrid(pf, length, 2.9, { seed: 61 + S.dir, panelW: 1.5, rows: [0, 0.3, 1.5, 1.7, 2.9], accent: "emitAmber", collide: false, cornice: false, styles: { plate: 0.7, panel: 0.15, vent: 0.15 } });
    }
    for (let k = 0; k < NB; k++) {
      const zAft = zP(k) - 0.08; // bay spans zFwd..zAft
      const zFwd = zP(k + 1) + 0.08;
      const bayMid = (zAft + zFwd) / 2;
      // two rows of three stacks, against each partition, heads toward the outer wall
      for (const row of [{ z: zAft - 0.46, aisle: -1 }, { z: zFwd + 0.46, aisle: 1 }]) {
        for (let i = 0; i < 3; i++) {
          const sx = S.aisleEdge + S.dir * (0.4 + 1.0 + i * 2.3);
          const pos = [sx, F, row.z];
          const rot = [0, S.yaw, 0];
          kit.place("bk_frame", { pos, rot, color: IMP.gunmetal });
          kit.place("bk_drawer", { pos, rot, color: IMP.plate });
          kit.place("bk_mat", { pos, rot, color: MATTRESS });
          kit.place("bk_pil", { pos, rot, color: PILLOW });
          kit.place("bk_blk", { pos, rot, color: rand() < 0.5 ? IMP.fabricBlack : IMP.fabricOlive });
          kit.place("bk_lamp", { pos, rot });
          // ladder on the bay-aisle side, foot half
          const lz = row.z + row.aisle * 0.52;
          kit.place("ladder", { pos: [sx - S.dir * 0.55, F, lz], rot: [0, row.aisle > 0 ? 0 : Math.PI, 0], color: IMP.steelDark });
          // personal effects on the head shelves (shelf column sits in the gap beyond the head)
          const shelfX = sx + S.dir * 1.15;
          for (const L of LEVELS) {
            const r = rand();
            const ey = F + L + 0.46;
            const ez = row.z + (rand() - 0.5) * 0.4;
            if (r < 0.4) {
              kit.place("helmet", { pos: [shelfX, ey, ez], rot: [0, S.yaw + (rand() - 0.5) * 0.8, 0], color: ARMOUR });
              kit.place("visor", { pos: [shelfX, ey, ez], rot: [0, S.yaw + (rand() - 0.5) * 0.8, 0], color: IMP.gloss });
            } else if (r < 0.8) kit.place("uniform", { pos: [shelfX, ey, ez], rot: [0, (rand() - 0.5) * 0.5, 0], color: rand() < 0.7 ? IMP.fabricBlack : IMP.fabricGrey });
          }
          kit.collider([sx - 1.0, F, row.z - 0.45], [sx + 1.0, F + 3.0, row.z + 0.45], "bunk");
          kit.collider([Math.min(shelfX - 0.13, shelfX + 0.13), F, row.z - 0.43], [Math.max(shelfX - 0.13, shelfX + 0.13), F + 3.0, row.z + 0.43], "shelf");
          if (!firstStack && S.dir > 0 && k === 0 && row.aisle < 0 && i === 0) firstStack = { x: sx, z: row.z };
        }
      }
      // ceiling fixture along the bay aisle
      ceilingStrip(kit, { pos: [S.wall - S.dir * 5.6, ceil, bayMid], len: 10.6, w: 0.28, axis: "x" });
      // outer end of the bay: locker row on the outer wall, table + stools, footlocker
      const u0 = S.dir < 0 ? z1 - zAft + 0.14 : zFwd - z0 + 0.14;
      lockerRow(kit, wallFr, u0, 6, { lw: 0.6, h: 2.0, d: 0.5, color: IMP.plateDark });
      const tx = S.wall - S.dir * 1.9;
      kit.box("plate", tx, F + 0.75, bayMid, 0.8, 0.05, 1.3, { color: IMP.plateLight, uv: "world", texel: 1 });
      kit.box("paintedMetal", tx, F + 0.37, bayMid, 0.26, 0.72, 0.26, { color: IMP.black, texel: 1 });
      kit.box("paintedMetal", tx, F + 0.02, bayMid, 0.6, 0.04, 0.9, { color: IMP.black, texel: 1 });
      if (rand() < 0.6) kit.box("darkGloss", tx + (rand() - 0.5) * 0.3, F + 0.785, bayMid + (rand() - 0.5) * 0.6, 0.24, 0.012, 0.16);
      kit.collider([tx - 0.4, F, bayMid - 0.65], [tx + 0.4, F + 0.8, bayMid + 0.65], "table");
      for (const s of [-1, 1]) {
        const stz = bayMid + s * 0.95;
        kit.place("stool", { pos: [tx + (rand() - 0.5) * 0.2, F, stz], color: IMP.black });
        kit.collider([tx - 0.18, F, stz - 0.18], [tx + 0.18, F + 0.5, stz + 0.18], "stool");
      }
      if (rand() < 0.7) crate(kit, { pos: [S.wall - S.dir * 0.85, F, zFwd + 0.75], yaw: S.dir < 0 ? Math.PI / 2 : -Math.PI / 2, size: [0.9, 0.45, 0.5], band: false, decal: DECAL.NUMBER0 + (k % 4), color: IMP.plateDark });
      // floor stencil at the bay mouth
      kit.add("decal", new THREE.PlaneGeometry(0.7, 0.7).rotateX(-Math.PI / 2), { pos: [S.aisleEdge - S.dir * 0.6, F + 0.004, bayMid], rot: [0, S.dir < 0 ? -Math.PI / 2 : Math.PI / 2, 0], uv: "keep", uvRect: decalRect(DECAL.NUMBER0 + (k % 4)) });
    }
  }

  // ---- aisle floor markings ------------------------------------------------------------------------
  const laneZ0 = REF_Z + 0.5;
  const laneZ1 = -134.6;
  for (const lx of [AX - 1.5, AX + 1.5]) kit.boxMM("paintedMetal", [lx - 0.04, F + 0.001, laneZ0], [lx + 0.04, F + 0.007, laneZ1], { color: WHITE_PAINT, texel: 1 });
  for (let k = 0; k <= NB; k++) for (const s of [-1, 1]) kit.boxMM("paintedMetal", [AX + s * 1.5 - 0.35, F + 0.001, zP(k) - 0.04], [AX + s * 1.5 + 0.35, F + 0.007, zP(k) + 0.04], { color: WHITE_PAINT, texel: 1 });
  kit.boxMM("hazard", [AX - 1.6, F + 0.002, REF_Z + 0.25], [AX + 1.6, F + 0.008, REF_Z + 0.42], { texel: 3 });
  kit.add("decal", new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2), { pos: [AX, F + 0.004, -133.2], uv: "keep", uvRect: decalRect(DECAL.DECK_A) });

  // ---- entry zone (aft wall, both sides of the door) ------------------------------------------------
  {
    const zmax = ctx.wall("zmax").frame; // u = x1 - x
    zmax.decal(x1 - AX, 3.6, 0.07, 1.2, 1.2, DECAL.EMBLEM);
    // starboard of the door: duty roster board + bench + boot rack
    wallPanel(kit, zmax, x1 - (-44.6), 1.75, { w: 1.7, h: 0.95, accent: "emitAmber", seed: 7 });
    kit.box("plate", -44.6, F + 0.45, z1 - 0.3, 2.0, 0.06, 0.42, { color: IMP.plateLight, uv: "world", texel: 1 });
    for (const bx of [-45.4, -43.8]) kit.box("paintedMetal", bx, F + 0.21, z1 - 0.3, 0.08, 0.42, 0.36, { color: IMP.black, texel: 1 });
    kit.collider([-45.6, F, z1 - 0.55], [-43.6, F + 0.5, z1], "bench");
    lockerRow(kit, zmax, 0.7, 8, { lw: 0.6, h: 2.0, d: 0.5, color: IMP.plateDark }); // x -36.95..-41.75
    // port of the door: environmental / berthing status computer bank + emergency cabinet
    computerBank(kit, { pos: [-53.2, F, z1 - 0.5], yaw: Math.PI, w: 2.6, h: 2.2, d: 0.5, seed: 4, accent: "emitAmber" });
    kit.box("paintedMetal", -55.6, F + 1.4, z1 - 0.16, 0.6, 0.8, 0.3, { color: new THREE.Color("#8a1d16"), texel: 1 });
    kit.box("paintedMetal", -55.6, F + 1.4, z1 - 0.315, 0.5, 0.7, 0.01, { color: IMP.black, texel: 1 });
    kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [-55.6, F + 1.42, z1 - 0.325], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(DECAL.WARNING) });
    kit.collider([-56.0, F, z1 - 0.35], [-55.2, F + 1.9, z1], "cabinet");
    lockerRow(kit, zmax, 19.4, 8, { lw: 0.6, h: 2.0, d: 0.5, color: IMP.plateDark }); // x -55.65..-60.45
  }

  // ---- refresher partition with a framed opening on the aisle ------------------------------------
  {
    const OW = 3.2;
    const OH = 2.7;
    const halfOpen = OW / 2 + 0.28 + 0.08;
    const a = wallFrame(kit, [x0, REF_Z + 0.2], [x1, REF_Z + 0.2], F); // faces +Z (berthing side)
    panelGrid(a.frame, a.length, ctx.h, { openings: [{ type: "arch", u0: AX - halfOpen - x0, u1: AX + halfOpen - x0, v0: 0, v1: OH + 0.62 }], seed: 77, accent: "emitAmber", tag: "ref_part_a", styles: { plate: 0.72, panel: 0.1, vent: 0.1, hatch: 0.08 } });
    const b = wallFrame(kit, [x1, REF_Z - 0.2], [x0, REF_Z - 0.2], F); // faces -Z (refresher side)
    panelGrid(b.frame, b.length, ctx.h, { openings: [{ type: "arch", u0: x1 - AX - halfOpen, u1: x1 - AX + halfOpen, v0: 0, v1: OH + 0.62 }], seed: 78, accent: "emitWhite", tag: "ref_part_b", tints: [[IMP.plateLight, 0.6], [IMP.plate, 0.4]], styles: { plate: 0.85, vent: 0.15 } });
    doorFrame(kit, { pos: [AX, F, REF_Z], yaw: 0, w: OW, h: OH, d: 0.4, accent: "emitWhite", sill: false });
    a.frame.decal(AX - 3.3 - x0, 3.2, 0.06, 0.9, 0.9, DECAL.TEXT_A);
    a.frame.decal(AX + 3.3 - x0, 3.2, 0.06, 0.9, 0.9, DECAL.TEXT_C);
    // cross passage between the last bays and the partition: bench + laundry bins
    for (const s of [-1, 1]) {
      const bx = AX + s * 6.5;
      kit.box("plate", bx, F + 0.45, REF_Z + 0.95, 2.2, 0.06, 0.42, { color: IMP.plateLight, uv: "world", texel: 1 });
      for (const lx of [-0.9, 0.9]) kit.box("paintedMetal", bx + lx, F + 0.21, REF_Z + 0.95, 0.08, 0.42, 0.36, { color: IMP.black, texel: 1 });
      kit.collider([bx - 1.1, F, REF_Z + 0.7], [bx + 1.1, F + 0.5, REF_Z + 1.2], "bench");
      for (let i = 0; i < 2; i++) barrel(kit, { pos: [bx + s * (1.9 + i * 0.85), F, REF_Z + 0.95], r: 0.32, h: 0.8, color: IMP.plate, band: IMP.plateLight });
    }
  }

  // ---- refresher ------------------------------------------------------------------------------------
  const refZ0 = z0; // -169.75
  const refZ1 = REF_Z - 0.4; // -162.4
  {
    // sink counter + mirror + vanity light on the forward wall
    const cx0 = AX - 4.6;
    const cx1 = AX + 4.6;
    kit.boxMM("paintedMetal", [cx0, F, refZ0], [cx1, F + 0.82, refZ0 + 0.55], { color: IMP.black, texel: 1 });
    kit.boxMM("plate", [cx0 - 0.05, F + 0.82, refZ0], [cx1 + 0.05, F + 0.94, refZ0 + 0.66], { color: IMP.plateLight, uv: "world", texel: 1 });
    kit.boxMM("paintedMetal", [cx0 - 0.06, F + 1.2, refZ0 + 0.01], [cx1 + 0.06, F + 2.4, refZ0 + 0.04], { color: IMP.black, texel: 1 });
    for (let k = 0; k < 10; k++) {
      const sx = AX + (k - 4.5) * 0.92;
      kit.box("darkGloss", sx, F + 1.8, refZ0 + 0.05, 0.8, 1.05, 0.02, {});
      kit.box("metal", sx, F + 1.8, refZ0 + 0.055, 0.84, 1.09, 0.008, { color: IMP.steel });
      kit.box("darkGloss", sx, F + 1.8, refZ0 + 0.06, 0.78, 1.03, 0.006, {});
      kit.box("plate", sx, F + 1.16, refZ0 + 0.12, 0.6, 0.03, 0.16, { color: IMP.plateLight, uv: "world", texel: 1 });
    }
    kit.boxMM("paintedMetal", [cx0 - 0.1, F + 2.4, refZ0], [cx1 + 0.1, F + 2.6, refZ0 + 0.22], { color: IMP.black, texel: 1 });
    kit.boxMM("emitWhiteSoft", [cx0, F + 2.41, refZ0 + 0.221], [cx1, F + 2.59, refZ0 + 0.225], { uv: "keep" });
    kit.boxMM("emitWhiteSoft", [cx0, F + 2.39, refZ0 + 0.05], [cx1, F + 2.4, refZ0 + 0.2], { uv: "keep" });
    let sinkMesh = null;
    for (let k = 0; k < 10; k++) {
      const sx = AX + (k - 4.5) * 0.92;
      const isIt = k === 4;
      if (!isIt) kit.box("metal", sx, F + 0.86, refZ0 + 0.36, 0.5, 0.14, 0.38, { color: IMP.steel });
      kit.box("darkGloss", sx, F + 0.9, refZ0 + 0.36, 0.42, 0.02, 0.3, {});
      kit.cyl("metal", sx, F + 1.06, refZ0 + 0.14, 0.018, 0.26, "y", { color: IMP.steel, segments: 8 });
      kit.cyl("metal", sx, F + 1.18, refZ0 + 0.24, 0.016, 0.22, "z", { color: IMP.steel, segments: 8 });
      kit.box("emitBlue", sx + 0.2, F + 0.99, refZ0 + 0.1, 0.05, 0.02, 0.05, {});
      if (isIt) {
        const m = ctx.materials.metal.clone();
        m.vertexColors = false;
        m.color.copy(IMP.steel);
        const g = new THREE.BoxGeometry(0.52, 0.16, 0.4);
        g.translate(sx, F + 0.86, refZ0 + 0.36);
        worldUVs(g, 1);
        sinkMesh = new THREE.Mesh(g, m);
        sinkMesh.castShadow = sinkMesh.receiveShadow = true;
        ctx.interactable({ object: sinkMesh, material: m, id: "refresher", kind: "refresher", label: "Wash up", key: "E" });
      }
    }
    kit.collider([cx0 - 0.1, F, refZ0], [cx1 + 0.1, F + 0.95, refZ0 + 0.7], "sinks");
    // wet-floor grating trench along the sinks and in front of the shower rows
    floorGrate(kit, [cx0, refZ0 + 0.7], [cx1, refZ0 + 1.9], F + 0.006);
    // shower stalls on both side walls: five per side, sliding glass doors half open
    for (const S of sides) {
      const wx = S.wall;
      const front = wx - S.dir * 1.15;
      floorGrate(kit, [Math.min(front, front - S.dir * 1.0), refZ0 + 0.8], [Math.max(front, front - S.dir * 1.0), refZ1 - 0.9], F + 0.006);
      const n = 5;
      const pitch = 1.2;
      const zStart = refZ0 + 0.9;
      for (let k = 0; k <= n; k++) {
        const z = zStart + k * pitch;
        kit.boxMM("plate", [Math.min(wx, front), F + 0.02, z - 0.025], [Math.max(wx, front), F + 2.25, z + 0.025], { color: IMP.plateLight, uv: "world", texel: 1 });
        kit.collider([Math.min(wx, front), F, z - 0.04], [Math.max(wx, front), F + 2.3, z + 0.04], "stall");
      }
      for (let k = 0; k < n; k++) {
        const za = zStart + k * pitch;
        const zc = za + pitch / 2;
        // door frame: top rail + track, glass pane covering the aft 55 %
        kit.boxMM("paintedMetal", [front - 0.04, F + 2.2, za], [front + 0.04, F + 2.32, za + pitch], { color: IMP.black, texel: 1 });
        kit.boxMM("paintedMetal", [front - 0.03, F + 0.02, za], [front + 0.03, F + 0.1, za + pitch], { color: IMP.black, texel: 1 });
        const pw = pitch * 0.55;
        kit.add("glass", new THREE.PlaneGeometry(pw, 2.08).rotateY(Math.PI / 2), { pos: [front, F + 1.15, za + pitch - pw / 2 - 0.03], uv: "keep" });
        kit.boxMM("metal", [front - 0.02, F + 0.1, za + pitch - pw - 0.06], [front + 0.02, F + 2.2, za + pitch - pw], { color: IMP.steel });
        // shower head, control panel, drain tray
        kit.cyl("metal", wx - S.dir * 0.2, F + 2.05, zc, 0.02, 0.4, "x", { color: IMP.steel, segments: 8 });
        kit.cyl("metal", wx - S.dir * 0.4, F + 2.0, zc, 0.09, 0.03, "y", { color: IMP.steel, segments: 12 });
        kit.box("darkGloss", wx - S.dir * 0.03, F + 1.3, zc + 0.3, 0.02, 0.24, 0.14, {});
        kit.box("emitBlue", wx - S.dir * 0.045, F + 1.36, zc + 0.3, 0.005, 0.03, 0.08, {});
        kit.box("darkGloss", wx - S.dir * 0.6, F + 0.005, zc, 0.36, 0.006, 0.36, {});
        kit.boxMM("paintedMetal", [Math.min(wx, front) + 0.05, F, za + 0.06], [Math.max(wx, front) - 0.05, F + 0.05, za + pitch - 0.06], { color: IMP.black, texel: 1 });
      }
    }
    // central bench with towels, laundry bins
    const bz = (refZ0 + refZ1) / 2 - 0.4;
    kit.box("plate", AX, F + 0.45, bz, 4.0, 0.06, 0.45, { color: IMP.plateLight, uv: "world", texel: 1 });
    for (const lx of [-1.8, 0, 1.8]) kit.box("paintedMetal", AX + lx, F + 0.21, bz, 0.1, 0.42, 0.38, { color: IMP.black, texel: 1 });
    for (let i = 0; i < 4; i++) kit.box("fabric", AX - 1.5 + i * 0.9 + (rand() - 0.5) * 0.2, F + 0.53, bz + (rand() - 0.5) * 0.1, 0.36, 0.1, 0.3, { color: new THREE.Color("#d8dbe0"), uv: "world", texel: 3 });
    kit.collider([AX - 2.0, F, bz - 0.25], [AX + 2.0, F + 0.5, bz + 0.25], "bench");
    for (const s of [-1, 1]) barrel(kit, { pos: [AX + s * 7.4, F, refZ0 + 0.7], r: 0.34, h: 0.8, color: IMP.plate, band: IMP.plateLight });
    floorGrate(kit, [AX - 2.2, bz - 0.9], [AX + 2.2, bz + 0.9], F + 0.006);
    for (const s of [-1, 1]) {
      const hx = AX + s * 3.2;
      kit.box("plate", hx, F + 1.25, refZ1 - 0.02, 0.32, 0.5, 0.2, { color: IMP.plateLight, uv: "world", texel: 1 });
      kit.box("paintedMetal", hx, F + 1.03, refZ1 - 0.06, 0.26, 0.06, 0.12, { color: IMP.black, texel: 1 });
      kit.box("emitGreen", hx + 0.1, F + 1.42, refZ1 - 0.125, 0.04, 0.02, 0.01, {});
    }
    kit.add("hazard", new THREE.ConeGeometry(0.22, 0.6, 4).translate(0, 0.3, 0), { pos: [AX + 2.6, F, refZ0 + 2.6], rot: [0, Math.PI / 4, 0], uv: "world", texel: 3 });
    kit.collider([AX + 2.35, F, refZ0 + 2.35], [AX + 2.85, F + 0.6, refZ0 + 2.85], "pylon");
    // overhead pipe runs feeding the showers
    for (const S of sides) pipeRun(kit, { points: [[S.wall - S.dir * 0.3, ceil - 0.25, refZ1 + 0.1], [S.wall - S.dir * 0.3, ceil - 0.25, refZ0 + 0.5], [S.wall - S.dir * 0.3, ceil - 1.2, refZ0 + 0.5]], r: 0.07, clamps: 2.0, color: IMP.steelDark });
    pipeRun(kit, { points: [[cx0 - 1.5, ceil - 0.25, refZ0 + 0.35], [cx1 + 1.5, ceil - 0.25, refZ0 + 0.35]], r: 0.09, clamps: 2.5, color: IMP.steel });
    // signage
    kit.add("decal", new THREE.PlaneGeometry(0.9, 0.9), { pos: [cx0 - 2.4, F + 2.4, refZ0 + 0.06], uv: "keep", uvRect: decalRect(DECAL.TEXT_B) });
    kit.add("decal", new THREE.PlaneGeometry(0.9, 0.9), { pos: [cx1 + 2.4, F + 2.4, refZ0 + 0.06], uv: "keep", uvRect: decalRect(DECAL.WARNING) });
  }

  // ---- interactable bunk (first starboard bay, stack nearest the door, bottom berth) ---------------
  if (firstStack) {
    const m = ctx.materials.fabric.clone();
    m.vertexColors = false;
    m.color.copy(IMP.fabricOlive);
    const g = new THREE.BoxGeometry(1.92, 0.17, 0.84);
    g.translate(firstStack.x, F + 0.5 + 0.075, firstStack.z);
    worldUVs(g, 2);
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = mesh.receiveShadow = true;
    ctx.interactable({ object: mesh, material: m, id: "bunk", kind: "bunk", label: "Sleep", key: "E" });
  }

  // ---- lights (8): white aisle, amber bays, cool refresher --------------------------------------------
  ctx.light(0xe8eeff, 42, 26, [AX, ceil - 0.5, -136.5], { decay: 1.6 });
  ctx.light(0xe8eeff, 36, 26, [AX, ceil - 0.5, -150], { decay: 1.6 });
  for (const s of [-1, 1]) {
    ctx.light(0xffc27a, 34, 26, [AX + s * 6.6, ceil - 0.6, -141.5], { decay: 1.5 });
    ctx.light(0xffc27a, 34, 26, [AX + s * 6.6, ceil - 0.6, -153.5], { decay: 1.5 });
  }
  ctx.light(0xdfe8ff, 55, 22, [AX - 5.5, ceil - 0.5, -166]);
  ctx.light(0xdfe8ff, 55, 22, [AX + 5.5, ceil - 0.5, -166]);
}

