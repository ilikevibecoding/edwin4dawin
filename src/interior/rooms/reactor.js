// Main reactor chamber (deck C, 30 m tall): a vertical core of stacked collars around a pulsing
// blue-white containment column inside glass sleeves, magnetic rings, eight radial coolant mains to the
// walls, an octagonal grated catwalk ring at +6 m reached by two flanking stair runs, a maintenance pit
// around the core base, control pulpits on the ring, wall-mounted capacitor banks, a coolant manifold
// along the forward wall. The core is the light source; amber post lamps mark the catwalk.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { roomShell, wallLightBar, wallConsole } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE } from "../../materials.js";
import { decalRect } from "../../textures.js";
import {
  yawFrame,
  cylBetween,
  beamBetween,
  pipeRun,
  flange,
  valveWheel,
  railing,
  stairRail,
  stencil,
  octDist,
  octVertex,
  octRing,
  octSector,
  octPrism,
  octSide,
  gridFloors,
  octColliders,
  octSideCollider,
  gauge,
} from "./deckCProps.js";

const CORE_R = 4.4; // emissive containment column
const GLASS_R = 4.85;
const COLLAR_R = 6.4;
const PLINTH_A = 8.0; // octagon apothem of the base plinth
const PIT_A = 9.8; // outer apothem of the maintenance pit
const PIT_DEPTH = 1.2;
const WALK_IN = 7.4; // catwalk inner / outer apothems
const WALK_OUT = 10.2;
const WALK_H = 6.0;
const OPEN_SECTORS = [1, 2, 3]; // pit sectors left open (facing the door); the rest are grated
// vertical stack: [y0, y1] of the glow gaps between collars (relative to the room floor)
const GAPS = [[4.5, 8.5], [11.0, 16.0], [18.5, 23.5], [26.0, 28.5]];
const COLLARS = [[3.0, 4.5], [8.5, 11.0], [16.0, 18.5], [23.5, 26.0]];

const sectorOf = (dx, dz) => (Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) + 8) % 8;

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "dark", floor: false, lights: false, skipWalls: ["-z", "+z", "-x", "+x"], lightMat: "emitBlueSoft", lightRows: 4 });
  const y0 = shell.y0;
  const yTop = shell.yTop;
  const h = room.height;
  const { x0, x1, z0, z1 } = room;
  const C = [(x0 + x1) / 2, (z0 + z1) / 2];
  const cx = C[0];
  const cz = C[1];
  const pitY = y0 - PIT_DEPTH;
  const walkY = y0 + WALK_H;

  // ---------------------------------------------------------------- walls: human-scale panels below 3.2 m,
  // monolithic dark plates with ribs, light bands and unit stencils above
  let seed = 4100;
  for (const [dir, { frame, length }] of Object.entries(shell.frames)) {
    const ops = [];
    for (const door of room.doors || []) if (door[3] === dir) ops.push(lib.doorOpening(room, door, y0, length, Math.min(h - 0.1, door[4] || lib.DOOR_H)));
    lib.panelGrid(frame, length, 3.2, { openings: ops, depth: lib.WALL_T, seed: seed++, kick: true, topPipes: false, panelW: 2.2, styles: { panel: 0.74, vent: 0.1, conduit: 0.08, strip: 0.08 }, paints: lib.DARK_PAINTS, tag: room.id + dir });
    frame.box("paintedMetal", length / 2, 3.2 + (h - 3.2) / 2, -0.09, length, h - 3.2, 0.14, { color: PALETTE.darkMetal, texel: 0.5 });
    frame.box("paintedMetal", length / 2, 3.3, 0.08, length, 0.2, 0.2, { color: PALETTE.gunmetal, texel: 1 });
    const nRibs = Math.round(length / 5.5);
    for (let i = 0; i < nRibs; i++) frame.box("paintedMetal", ((i + 0.5) / nRibs) * length, 3.2 + (h - 3.2) / 2, 0.1, 0.5, h - 3.2, 0.24, { color: PALETTE.gunmetal, texel: 1 });
    for (const v of [9.0, 16.5, 23.5]) {
      frame.box("paintedMetal", length / 2, v, 0.12, length, 0.5, 0.28, { color: PALETTE.darkMetal, texel: 1 });
      if (v !== 16.5) frame.box("emitBlueSoft", length / 2, v - 0.33, 0.06, length - 0.4, 0.07, 0.02, { uv: "keep" });
    }
    const idx = [2, 14, 0, 8];
    frame.add("decal", new THREE.PlaneGeometry(2.4, 2.4), length * 0.3, 13.0, -0.015, { uv: "keep", uvRect: decalRect(idx[seed % 4]) });
    frame.add("decal", new THREE.PlaneGeometry(2.4, 2.4), length * 0.7, 20.0, -0.015, { uv: "keep", uvRect: decalRect(idx[(seed + 1) % 4]) });
    frame.box("satinBlack", length / 2, h - 0.09, 0.02, length, 0.18, 0.05);
  }

  // ---------------------------------------------------------------- floor slab with the octagonal pit cut out
  {
    const shape = new THREE.Shape();
    shape.moveTo(x0 - lib.WALL_T, z0 - lib.WALL_T);
    shape.lineTo(x1 + lib.WALL_T, z0 - lib.WALL_T);
    shape.lineTo(x1 + lib.WALL_T, z1 + lib.WALL_T);
    shape.lineTo(x0 - lib.WALL_T, z1 + lib.WALL_T);
    shape.closePath();
    const hole = new THREE.Path();
    for (let k = 0; k < 8; k++) {
      const [vx, vz] = octVertex(cx, cz, PIT_A, k);
      if (k === 0) hole.moveTo(vx, vz);
      else hole.lineTo(vx, vz);
    }
    hole.closePath();
    shape.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
    g.rotateX(Math.PI / 2);
    kit.add("deck", g, { pos: [0, y0, 0], color: PALETTE.impGreyDark, uv: "world", texel: 1 });
  }
  // walk path from the door to the pit edge: lighter runner with amber edge lines
  kit.boxMM("deck", [cx - 1.6, y0, cz + PIT_A + 0.4], [cx + 1.6, y0 + 0.006, z1 - 0.2], { color: PALETTE.impGrey, uv: "world", texel: 1 });
  kit.boxMM("emitAmber", [cx - 1.7, y0 + 0.002, cz + PIT_A + 0.4], [cx - 1.6, y0 + 0.008, z1 - 0.3], { uv: "keep" });
  kit.boxMM("emitAmber", [cx + 1.6, y0 + 0.002, cz + PIT_A + 0.4], [cx + 1.7, y0 + 0.008, z1 - 0.3], { uv: "keep" });
  stencil(kit, cx, y0 + 0.009, cz + PIT_A + 2.4, 1.6, 5, "up");

  // ---------------------------------------------------------------- maintenance pit
  kit.add("metal", octRing(PLINTH_A - 0.2, PIT_A + 0.1), { pos: [cx, pitY, cz], color: PALETTE.darkMetal, uv: "world", texel: 1 });
  for (let k = 0; k < 8; k++) {
    const [p, q] = octSide(cx, cz, PIT_A, k);
    beamBetween(kit, "paintedMetal", [p[0], pitY + 0.62, p[1]], [q[0], pitY + 0.62, q[1]], 1.24, 0.16, { color: PALETTE.gunmetal, texel: 1, extend: 0.1 });
    beamBetween(kit, "emitBlueSoft", [p[0], pitY + 0.2, p[1]], [q[0], pitY + 0.2, q[1]], 0.04, 0.02, { uv: "keep", extend: -0.4 });
    // pit conduit rings and junction boxes
    const [pa, pb] = octSide(cx, cz, PIT_A - 0.35, k);
    cylBetween(kit, "metal", [pa[0], pitY + 0.42, pa[1]], [pb[0], pitY + 0.42, pb[1]], 0.09, { color: PALETTE.steel, segments: 10, extend: 0.12 });
    const [qa, qb] = octSide(cx, cz, PLINTH_A + 0.55, k);
    cylBetween(kit, "metal", [qa[0], pitY + 0.3, qa[1]], [qb[0], pitY + 0.3, qb[1]], 0.06, { color: PALETTE.orange, segments: 8, extend: 0.1 });
    const mx = (p[0] + q[0]) / 2;
    const mz = (p[1] + q[1]) / 2;
    const nx = (cx - mx) / PIT_A;
    const nz = (cz - mz) / PIT_A;
    kit.add("paintedMetal", new THREE.BoxGeometry(0.4, 0.3, 0.14), { pos: [mx + nx * 0.16, pitY + 0.85, mz + nz * 0.16], rot: [0, Math.PI / 2 - (k * Math.PI) / 4, 0], color: PALETTE.darkMetal });
    kit.add("leds", new THREE.BoxGeometry(0.26, 0.04, 0.01), { pos: [mx + nx * 0.235, pitY + 0.85, mz + nz * 0.235], rot: [0, Math.PI / 2 - (k * Math.PI) / 4, 0], uv: "keep" });
    if (OPEN_SECTORS.includes(k)) {
      // open sector: railing at the pit edge (split around the stair on the door-facing side)
      if (k === 2) {
        const zr = cz + PIT_A;
        railing(kit, cx + 4.06, zr, cx + 0.75, zr, y0, { n0: -0.12 });
        railing(kit, cx - 0.75, zr, cx - 4.06, zr, y0, { n0: -0.12 });
      } else railing(kit, p[0], p[1], q[0], q[1], y0, { n0: -0.12 });
    } else {
      // grated cover flush with the floor
      kit.add("grate", octSector(PLINTH_A + 0.05, PIT_A - 0.05, k), { pos: [cx, y0 + 0.004, cz], uv: "world", texel: 1 });
      const [ia, ib] = octSide(cx, cz, PLINTH_A + 0.05, k);
      beamBetween(kit, "metal", [ia[0], y0 - 0.05, ia[1]], [ib[0], y0 - 0.05, ib[1]], 0.08, 0.08, { color: PALETTE.gunmetal });
      const [oa, ob] = octSide(cx, cz, PIT_A - 0.08, k);
      beamBetween(kit, "metal", [oa[0], y0 - 0.05, oa[1]], [ob[0], y0 - 0.05, ob[1]], 0.08, 0.08, { color: PALETTE.gunmetal });
      for (const t of [0.33, 0.67]) {
        const ax = ia[0] + (ib[0] - ia[0]) * t;
        const az = ia[1] + (ib[1] - ia[1]) * t;
        const bx = oa[0] + (ob[0] - oa[0]) * t;
        const bz = oa[1] + (ob[1] - oa[1]) * t;
        beamBetween(kit, "metal", [ax, y0 - 0.05, az], [bx, y0 - 0.05, bz], 0.06, 0.06, { color: PALETTE.gunmetal });
      }
    }
  }
  // short radial rails where the open pit meets the grated covers
  for (const k of [0, 3]) {
    const a = octVertex(cx, cz, PLINTH_A + 0.1, k);
    const b = octVertex(cx, cz, PIT_A - 0.1, k);
    railing(kit, a[0], a[1], b[0], b[1], y0, { postStep: 1.0 });
  }
  // stair down into the pit on the door side
  kit.stairs("paintedMetal", cx - 0.6, cz + PIT_A - 1.2, cx + 0.6, cz + PIT_A, pitY, y0, "z", { color: PALETTE.gunmetal, steps: 4 });
  stencil(kit, cx, y0 + 0.009, cz + PIT_A + 0.45, 0.5, 15, "up");
  // pit colliders: plinth core and the outer pit wall (gap for the stair)
  octColliders(kit, cx, cz, PLINTH_A + 0.1, pitY, y0 + 3.0, "plinth");
  for (let k = 0; k < 8; k++) {
    if (k === 2) {
      const zr = cz + PIT_A;
      kit.collider([cx - 4.1, pitY, zr - 0.06], [cx - 0.7, y0 - 0.01, zr + 0.06], "pitWall");
      kit.collider([cx + 0.7, pitY, zr - 0.06], [cx + 4.1, y0 - 0.01, zr + 0.06], "pitWall");
    } else octSideCollider(kit, cx, cz, PIT_A, k, pitY, y0 - 0.01);
  }

  // ---------------------------------------------------------------- core: plinth, collars, column, rings, struts
  kit.add("paintedMetal", octPrism(PLINTH_A, 3.0 + PIT_DEPTH), { pos: [cx, pitY + (3.0 + PIT_DEPTH) / 2, cz], color: PALETTE.slate, uv: "world", texel: 0.7 });
  kit.add("paintedMetal", octPrism(PLINTH_A + 0.3, 0.4), { pos: [cx, y0 + 2.8, cz], color: PALETTE.darkMetal, uv: "world", texel: 0.7 });
  kit.add("emitBlueSoft", octPrism(PLINTH_A + 0.02, 0.08), { pos: [cx, y0 + 2.55, cz], uv: "keep" });
  for (let k = 0; k < 8; k++) {
    const ang = (k * Math.PI) / 4;
    const nx = Math.cos(ang);
    const nz = Math.sin(ang);
    const rot = [0, Math.PI / 2 - ang, 0];
    // buttresses around the plinth foot, access hatch plates and stencils on the plinth faces
    kit.add("paintedMetal", new THREE.BoxGeometry(1.4, 2.4, 0.7), { pos: [cx + nx * (PLINTH_A + 0.2), pitY + 1.2, cz + nz * (PLINTH_A + 0.2)], rot, color: PALETTE.darkMetal, texel: 1 });
    kit.add("hazard", new THREE.BoxGeometry(1.42, 0.12, 0.72), { pos: [cx + nx * (PLINTH_A + 0.2), pitY + 2.1, cz + nz * (PLINTH_A + 0.2)], rot, texel: 3 });
    kit.add("metal", new THREE.BoxGeometry(2.0, 1.0, 0.06), { pos: [cx + nx * (PLINTH_A + 0.03), y0 + 1.6, cz + nz * (PLINTH_A + 0.03)], rot, color: PALETTE.slate, texel: 1 });
    kit.add("leds", new THREE.BoxGeometry(0.8, 0.05, 0.01), { pos: [cx + nx * (PLINTH_A + 0.065), y0 + 2.25, cz + nz * (PLINTH_A + 0.065)], rot, uv: "keep" });
    const d = new THREE.PlaneGeometry(0.7, 0.7);
    d.rotateY(Math.PI / 2 - ang);
    kit.add("decal", d, { pos: [cx + nx * (PLINTH_A + 0.07), y0 + 1.6, cz + nz * (PLINTH_A + 0.07)], uv: "keep", uvRect: decalRect(k % 2 ? 5 : 9) });
  }
  // collars with magnetic containment rings
  for (const [k, [a, b]] of COLLARS.entries()) {
    const ya = y0 + a;
    const yb = y0 + b;
    kit.cyl("paintedMetal", cx, (ya + yb) / 2, cz, COLLAR_R, yb - ya, "y", { color: PALETTE.slate, segments: 48, texel: 0.5 });
    kit.cyl("satinBlack", cx, (ya + yb) / 2, cz, COLLAR_R + 0.06, (yb - ya) * 0.3, "y", { segments: 48 });
    kit.add("metal", new THREE.TorusGeometry(COLLAR_R + 0.45, 0.42, 8, 48), { pos: [cx, (ya + yb) / 2, cz], rot: [Math.PI / 2, 0, 0], color: PALETTE.steel, uv: "world", texel: 1 });
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const r = COLLAR_R + 0.45;
      kit.add("paintedMetal", new THREE.BoxGeometry(0.5, 0.55, 1.1), { pos: [cx + Math.cos(ang) * r, (ya + yb) / 2, cz + Math.sin(ang) * r], rot: [0, Math.PI / 2 - ang, 0], color: PALETTE.darkMetal, texel: 1.5 });
      kit.add("emitBlue", new THREE.BoxGeometry(0.2, 0.08, 1.14), { pos: [cx + Math.cos(ang) * r, (ya + yb) / 2 + 0.2, cz + Math.sin(ang) * r], rot: [0, Math.PI / 2 - ang, 0], uv: "keep" });
    }
    if (k === 0) continue;
    kit.cyl("metal", cx, ya + 0.08, cz, COLLAR_R + 0.25, 0.16, "y", { color: PALETTE.darkMetal, segments: 48 });
    kit.cyl("metal", cx, yb - 0.08, cz, COLLAR_R + 0.25, 0.16, "y", { color: PALETTE.darkMetal, segments: 48 });
  }
  // top socket flaring into the ceiling
  kit.add("paintedMetal", new THREE.CylinderGeometry(COLLAR_R + 1.2, COLLAR_R + 0.2, h - GAPS[3][1], 48), { pos: [cx, y0 + (GAPS[3][1] + h) / 2, cz], color: PALETTE.slate, uv: "world", texel: 0.5 });
  kit.cyl("emitBlueSoft", cx, y0 + GAPS[3][1] + 0.1, cz, COLLAR_R + 0.3, 0.1, "y", { segments: 48, uv: "keep" });
  // glass sleeves + bright field rings inside every glow gap
  for (const [a, b] of GAPS) {
    kit.cyl("glass", cx, y0 + (a + b) / 2, cz, GLASS_R, b - a, "y", { segments: 48, open: true });
    const n = Math.max(2, Math.round((b - a) / 1.3));
    for (let i = 0; i < n; i++) {
      const y = y0 + a + ((i + 0.5) / n) * (b - a);
      kit.add("emitWhiteSoft", new THREE.TorusGeometry(CORE_R + 0.08, 0.05, 4, 48), { pos: [cx, y, cz], rot: [Math.PI / 2, 0, 0], uv: "keep" });
    }
  }
  // eight vertical struts of the containment cage with blue running lights
  for (let k = 0; k < 8; k++) {
    const ang = Math.PI / 8 + (k * Math.PI) / 4;
    const r = COLLAR_R - 0.85;
    const sy = y0 + 3.0;
    const ey = y0 + GAPS[3][1];
    const rot = [0, Math.PI / 2 - ang, 0];
    kit.add("paintedMetal", new THREE.BoxGeometry(0.5, ey - sy, 0.5), { pos: [cx + Math.cos(ang) * r, (sy + ey) / 2, cz + Math.sin(ang) * r], rot, color: PALETTE.darkMetal, texel: 1 });
    kit.add("emitBlue", new THREE.BoxGeometry(0.08, ey - sy - 1.0, 0.03), { pos: [cx + Math.cos(ang) * (r + 0.26), (sy + ey) / 2, cz + Math.sin(ang) * (r + 0.26)], rot, uv: "keep" });
  }
  // the containment column: one mesh with a cloned material so its glow can breathe
  {
    const parts = [];
    for (const [a, b] of GAPS) {
      const g = new THREE.CylinderGeometry(CORE_R, CORE_R, b - a + 0.4, 48, 1, true);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, uv.getY(i));
      g.translate(cx, y0 + (a + b) / 2, cz);
      parts.push(g);
    }
    const merged = mergeGeometries(parts, false);
    const mat = ctx.materials.emitBlueSoft.clone();
    mat.emissive = new THREE.Color("#78b0ff");
    mat.emissiveIntensity = 1.25;
    const core = new THREE.Mesh(merged, mat);
    core.name = "reactorCore";
    core.castShadow = false;
    core.receiveShadow = false;
    // the chamber is lit by the column itself: one strong source on the axis per glow gap (inverse-square
    // falloff over a 44 x 37 x 30 m room needs a few hundred candela, not a scatter of small lights)
    const coreLights = [];
    for (const [k, [a, b]] of GAPS.entries()) {
      const l = pointLight(0xa8d4ff, [260, 320, 300, 220][k], 70, [cx, y0 + (a + b) / 2, cz]);
      ctx.lights.teal.push(l);
      coreLights.push(l);
    }
    let t = 0;
    const base = mat.emissiveIntensity;
    ctx.dynamic.push({
      object: core,
      update(dt) {
        t += dt;
        const p = 0.86 + 0.1 * Math.sin(t * 1.3) + 0.04 * Math.sin(t * 4.7);
        mat.emissiveIntensity = base * p;
        for (const l of coreLights) l.intensity = (l.userData.baseIntensity ?? l.intensity) * (0.9 + 0.1 * p);
      },
    });
  }

  // ---------------------------------------------------------------- catwalk ring at +6 m
  kit.add("grate", octRing(WALK_IN + 0.05, WALK_OUT - 0.05), { pos: [cx, walkY + 0.004, cz], uv: "world", texel: 1 });
  for (let k = 0; k < 8; k++) {
    for (const [a, sy, sz] of [[WALK_IN, 0.3, 0.16], [WALK_OUT, 0.3, 0.16]]) {
      const [p, q] = octSide(cx, cz, a, k);
      beamBetween(kit, "paintedMetal", [p[0], walkY - 0.15, p[1]], [q[0], walkY - 0.15, q[1]], sy, sz, { color: PALETTE.gunmetal, texel: 1, extend: 0.1 });
    }
    const vi = octVertex(cx, cz, WALK_IN, k);
    const vo = octVertex(cx, cz, WALK_OUT, k);
    beamBetween(kit, "paintedMetal", [vi[0], walkY - 0.15, vi[1]], [vo[0], walkY - 0.15, vo[1]], 0.26, 0.2, { color: PALETTE.gunmetal, texel: 1 });
    const [ia, ib] = octSide(cx, cz, WALK_IN, k);
    const [oa, ob] = octSide(cx, cz, WALK_OUT, k);
    beamBetween(kit, "metal", [(ia[0] + ib[0]) / 2, walkY - 0.1, (ia[1] + ib[1]) / 2], [(oa[0] + ob[0]) / 2, walkY - 0.1, (oa[1] + ob[1]) / 2], 0.14, 0.1, { color: PALETTE.gunmetal });
    // bracket from the inner vertex down to collar A
    const ang = Math.PI / 8 + (k * Math.PI) / 4;
    beamBetween(kit, "paintedMetal", [vi[0], walkY - 0.3, vi[1]], [cx + Math.cos(ang) * (COLLAR_R + 0.1), y0 + 3.3, cz + Math.sin(ang) * (COLLAR_R + 0.1)], 0.22, 0.22, { color: PALETTE.gunmetal, texel: 1 });
    // column from the floor through the ring up to the coolant main
    kit.box("paintedMetal", vo[0], (y0 + y0 + 9.4) / 2, vo[1], 0.42, 9.4, 0.42, { color: PALETTE.slate, texel: 1 });
    kit.box("metal", vo[0], y0 + 0.15, vo[1], 0.6, 0.3, 0.6, { color: PALETTE.darkMetal, texel: 1.5 });
    kit.box("emitAmber", vo[0], walkY + 1.6, vo[1], 0.44, 0.06, 0.44, { uv: "keep" });
    kit.collider([vo[0] - 0.3, y0, vo[1] - 0.3], [vo[0] + 0.3, walkY + 2, vo[1] + 0.3], "column");
    // railings: inner all round, outer with gaps where the two stairs arrive (top ends of the E / W sides)
    railing(kit, ia[0], ia[1], ib[0], ib[1], walkY, { n0: -0.1, postStep: 1.4 });
    if (k === 0) railing(kit, oa[0], oa[1], oa[0], cz + 3.0, walkY, { n0: 0.1, postStep: 1.4 });
    else if (k === 4) railing(kit, oa[0], oa[1], oa[0], cz - 3.0, walkY, { n0: 0.1, postStep: 1.4 });
    else railing(kit, oa[0], oa[1], ob[0], ob[1], walkY, { n0: 0.1, postStep: 1.4 });
  }
  gridFloors(kit, cx - WALK_OUT - 0.2, cz - WALK_OUT - 0.2, cx + WALK_OUT + 0.2, cz + WALK_OUT + 0.2, 0.4, (px, pz) => {
    const d = octDist(px - cx, pz - cz);
    return d >= WALK_IN && d <= WALK_OUT ? walkY : null;
  });
  // control pulpits on the E, N and W sides, amber post lamps on the diagonals
  for (const k of [0, 4, 6]) {
    const ang = (k * Math.PI) / 4;
    const px = cx + Math.cos(ang) * (WALK_IN + 0.15);
    const pz = cz + Math.sin(ang) * (WALK_IN + 0.15);
    const f = yawFrame(kit, px, walkY, pz, Math.atan2(Math.cos(ang), Math.sin(ang)));
    wallConsole(f, 0, 1.5, "screen4");
    f.box("emitBlue", 0, 0.5, 0.56, 1.2, 0.03, 0.01, { uv: "keep" });
  }
  for (const k of [1, 3, 5, 7]) {
    const ang = (k * Math.PI) / 4;
    const px = cx + Math.cos(ang) * (WALK_OUT - 0.4);
    const pz = cz + Math.sin(ang) * (WALK_OUT - 0.4);
    kit.cyl("metal", px, walkY + 1.1, pz, 0.04, 2.2, "y", { color: PALETTE.gunmetal, segments: 8 });
    kit.cyl("metal", px, walkY + 0.06, pz, 0.18, 0.12, "y", { color: PALETTE.darkMetal, segments: 12 });
    kit.box("paintedMetal", px, walkY + 2.28, pz, 0.34, 0.16, 0.34, { color: PALETTE.gunmetal, texel: 2 });
    kit.box("emitAmber", px, walkY + 2.18, pz, 0.26, 0.05, 0.26, { uv: "keep" });
    kit.collider([px - 0.2, walkY, pz - 0.2], [px + 0.2, walkY + 2.3, pz + 0.2], "lamp");
    ctx.lights.warm.push(pointLight(0xffb060, 40, 16, [px, walkY + 1.9, pz]));
  }

  // ---------------------------------------------------------------- two stair runs (port and starboard)
  for (const s of [-1, 1]) {
    const xi = cx + s * (WALK_OUT - 0.2); // inner edge (meets the ring's outer edge)
    const xo = cx + s * (WALK_OUT + 1.5);
    const zb = cz + 12.75; // bottom
    const zt = cz + 3.25; // top
    kit.stairs("paintedMetal", Math.min(xi, xo), zb, Math.max(xi, xo), zt, y0, walkY, "z", { color: PALETTE.slate });
    const mid = (xi + xo) / 2;
    stairRail(kit, [mid, y0, zb], [mid, walkY, zt], [s * 0.8, 0]);
    stairRail(kit, [mid, y0, zb], [mid, walkY, zt], [-s * 0.8, 0]);
    for (const sx of [xi, xo]) beamBetween(kit, "metal", [sx, y0 + 0.2, zb + 0.1], [sx, walkY + 0.2, zt - 0.05], 0.36, 0.06, { color: PALETTE.steel, texel: 1 });
    railing(kit, Math.min(xi, xo), zt - 0.05, Math.max(xi, xo), zt - 0.05, walkY, { postStep: 0.8 });
    stencil(kit, mid, y0 + 0.009, zb + 0.9, 0.7, 15, "up");
    kit.collider([Math.min(xi, xo), y0, zb], [Math.max(xi, xo), y0 + 1.0, zb + 0.02], "stairFoot");
  }

  // ---------------------------------------------------------------- radial coolant mains from collar B to the walls
  const mainY = y0 + (COLLARS[1][0] + COLLARS[1][1]) / 2;
  const wallHits = [];
  for (let k = 0; k < 8; k++) {
    const ang = Math.PI / 8 + (k * Math.PI) / 4;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const tx = ((dx > 0 ? x1 : x0) - cx) / dx;
    const tz = ((dz > 0 ? z1 : z0) - cz) / dz;
    const t = Math.min(tx, tz);
    const a = [cx + dx * (COLLAR_R + 0.3), mainY, cz + dz * (COLLAR_R + 0.3)];
    const b = [cx + dx * (t - 0.05), mainY, cz + dz * (t - 0.05)];
    cylBetween(kit, "metal", a, b, 0.32, { color: PALETTE.steel, segments: 16 });
    flange(kit, [cx + dx * (COLLAR_R + 0.9), mainY, cz + dz * (COLLAR_R + 0.9)], [dx, 0, dz], 0.45, { t: 0.12 });
    flange(kit, [cx + dx * (t - 0.4), mainY, cz + dz * (t - 0.4)], [dx, 0, dz], 0.48, { t: 0.14 });
    flange(kit, [cx + dx * (WALK_OUT + 1.6), mainY, cz + dz * (WALK_OUT + 1.6)], [dx, 0, dz], 0.42, { t: 0.1 });
    valveWheel(kit, cx + dx * 9.2, mainY + 0.62, cz + dz * 9.2, "y", 0.3);
    kit.cyl("metal", cx + dx * 9.2, mainY + 0.36, cz + dz * 9.2, 0.12, 0.3, "y", { color: PALETTE.gunmetal, segments: 10 });
    wallHits.push([b[0], b[2], tx < tz ? "x" : "z"]);
  }

  // ---------------------------------------------------------------- capacitor banks on the port / starboard walls
  for (const s of [-1, 1]) {
    const wx = s < 0 ? x0 : x1;
    for (const zc of [447.0, cz, 470.5]) {
      const f = yawFrame(kit, wx, y0, zc, s < 0 ? Math.PI / 2 : -Math.PI / 2);
      f.box("paintedMetal", 0, 3.2, 0.12, 7.2, 6.2, 0.24, { color: PALETTE.gunmetal, texel: 0.8 });
      f.box("paintedMetal", 0, 0.3, 1.5, 7.4, 0.6, 3.0, { color: PALETTE.gunmetal, texel: 1 });
      f.box("hazard", 0, 0.62, 1.5, 7.42, 0.1, 3.02, { texel: 3 });
      f.add("decal", new THREE.PlaneGeometry(0.9, 0.9), 0, 0.3, 3.005, { uv: "keep", uvRect: decalRect(5) });
      for (const [row, v] of [1.85, 4.55].entries()) {
        for (const u of [-2.35, 0, 2.35]) {
          f.cylN("paintedMetal", u, v, 1.4, 0.88, 2.4, { color: row ? PALETTE.slate : PALETTE.gunmetal, segments: 28, texel: 0.8 });
          f.add("metal", new THREE.TorusGeometry(0.86, 0.1, 6, 20), u, v, 2.62, { color: PALETTE.steel, uv: "scale", uvScale: [6, 1] });
          f.add("metal", new THREE.TorusGeometry(0.86, 0.08, 6, 20), u, v, 0.4, { color: PALETTE.steel, uv: "scale", uvScale: [6, 1] });
          f.cylN("metal", u, v, 2.75, 0.3, 0.3, { color: PALETTE.darkMetal, segments: 16 });
          f.cylN("emitBlueSoft", u, v, 2.92, 0.46, 0.06, { segments: 24, uv: "keep" });
          f.box("metal", u, v - 0.6, 2.75, 0.5, 0.25, 0.3, { color: PALETTE.darkMetal, texel: 2 });
        }
        f.box("emitBlueSoft", 0, v, 3.0, 5.2, 0.12, 0.1, { uv: "keep" });
        f.box("paintedMetal", 0, v - 1.05, 0.8, 7.0, 0.3, 1.6, { color: PALETTE.gunmetal, texel: 1 });
      }
      f.box("emitBlueSoft", 0, 3.2, 3.0, 0.12, 2.7, 0.1, { uv: "keep" });
      f.box("paintedMetal", 0, 6.4, 1.5, 7.4, 0.3, 3.0, { color: PALETTE.gunmetal, texel: 1 });
      f.collider(-3.75, 3.75, 0, 6.6, 0, 3.3, "capBank");
      ctx.lights.cool.push(pointLight(0xdfe8ff, 90, 24, [wx - s * 4.5, y0 + 7.0, zc]));
    }
    // wall stretches between the banks: light bars, a console, a stencil
    const f = shell.frames[s < 0 ? "-x" : "+x"].frame;
    const uOf = (z) => (s < 0 ? z1 - z : z - z0);
    for (const zc of [452.9, 464.6]) {
      wallLightBar(f, Math.min(uOf(zc - 2.0), uOf(zc + 2.0)), Math.max(uOf(zc - 2.0), uOf(zc + 2.0)), 2.4);
      wallConsole(f, uOf(zc), 1.6, "screen4");
      f.add("decal", new THREE.PlaneGeometry(0.5, 0.5), uOf(zc + 1.5), 1.7, 0.005, { uv: "keep", uvRect: decalRect(zc > 460 ? 6 : 12) });
    }
  }

  // ---------------------------------------------------------------- forward wall: coolant manifold and pump units
  {
    const zw = z0 + 0.7;
    const header = [[cx - 14, y0 + 8.0, zw], [cx + 14, y0 + 8.0, zw]];
    cylBetween(kit, "metal", header[0], header[1], 0.55, { color: PALETTE.steel, segments: 20 });
    for (const [hx, hz] of wallHits.filter((w) => w[2] === "z" && w[1] < cz).map((w) => [w[0], w[1]])) {
      pipeRun(kit, "metal", [[hx, mainY, hz - 0.2], [hx, mainY, z0 + 0.7], [hx, y0 + 8.6, z0 + 0.7]], 0.32, { color: PALETTE.steel, segments: 16 });
    }
    for (let i = 0; i < 6; i++) {
      const px = cx - 12.5 + i * 5;
      pipeRun(kit, "metal", [[px, y0 + 7.6, zw], [px, y0 + 1.5, zw], [px, y0 + 1.5, zw + 0.9]], 0.26, { color: i % 2 ? PALETTE.orange : PALETTE.steel, segments: 14 });
      flange(kit, [px, y0 + 6.9, zw], [0, 1, 0], 0.38);
      flange(kit, [px, y0 + 2.4, zw], [0, 1, 0], 0.38);
      valveWheel(kit, px + 0.42, y0 + 3.4, zw, "x", 0.26);
      kit.cyl("metal", px + 0.15, y0 + 3.4, zw, 0.1, 0.3, "x", { color: PALETTE.gunmetal, segments: 10 });
      // pump unit on the floor
      kit.box("paintedMetal", px, y0 + 0.7, zw + 1.0, 1.7, 1.4, 1.5, { color: PALETTE.gunmetal, texel: 1.2 });
      kit.box("metal", px, y0 + 1.43, zw + 1.0, 1.74, 0.06, 1.54, { color: PALETTE.darkMetal, texel: 2 });
      kit.box("metal", px, y0 + 0.1, zw + 1.0, 1.8, 0.2, 1.6, { color: PALETTE.darkMetal, texel: 2 });
      kit.cyl("paintedMetal", px, y0 + 0.75, zw + 1.85, 0.5, 0.3, "z", { color: PALETTE.slate, segments: 20 });
      const pf = yawFrame(kit, px, y0, zw + 1.76, 0);
      gauge(pf, -0.45, 1.1, 0.16, { needle: 0.3 + (i % 4) * 0.12 });
      pf.box("leds", 0.3, 1.1, 0.01, 0.5, 0.04, 0.01, { uv: "keep" });
      pf.box("emitAmber", 0.3, 0.9, 0.01, 0.2, 0.06, 0.01, { uv: "keep" });
      kit.collider([px - 0.9, y0, z0], [px + 0.9, y0 + 1.6, zw + 1.9], "pump");
    }
    const f = shell.frames["-z"].frame; // u = x - x0
    wallLightBar(f, 1.0, cx - 14 - x0 - 0.5, 2.4);
    wallLightBar(f, cx + 14 - x0 + 0.5, x1 - x0 - 1.0, 2.4);
    f.add("decal", new THREE.PlaneGeometry(0.6, 0.6), cx - x0, 2.6, 0.005, { uv: "keep", uvRect: decalRect(12) });
  }

  // ---------------------------------------------------------------- aft wall (door): consoles, light bars, status board
  {
    const f = shell.frames["+z"].frame; // u = x1 - x
    const du = x1 - 26;
    wallLightBar(f, 0.8, du - 3.6, 2.4);
    wallLightBar(f, du + 3.6, x1 - x0 - 0.8, 2.4);
    wallConsole(f, du - 5.2, 1.6, "screen4");
    wallConsole(f, du + 5.2, 1.6, "screen6");
    f.add("decal", new THREE.PlaneGeometry(0.5, 0.5), du - 2.2, 1.7, 0.005, { uv: "keep", uvRect: decalRect(8) });
    f.add("decal", new THREE.PlaneGeometry(0.5, 0.5), du + 2.2, 1.7, 0.005, { uv: "keep", uvRect: decalRect(5) });
    f.box("darkGloss", du, 2.9, 0.03, 2.2, 0.7, 0.05);
    f.box("screen4", du, 2.9, 0.058, 2.1, 0.6, 0.006, { uv: "keep" });
    f.box("emitBlue", du, 3.3, 0.03, 2.4, 0.03, 0.01, { uv: "keep" });
  }

  // ---------------------------------------------------------------- floors: main deck around the pit, pit floor
  const half = WALK_OUT + 0.5;
  kit.floor(x0 - 0.16, z0 - 0.16, x1 + 0.16, cz - half, y0);
  kit.floor(x0 - 0.16, cz + half, x1 + 0.16, z1 + 0.16, y0);
  kit.floor(x0 - 0.16, cz - half, cx - half, cz + half, y0);
  kit.floor(cx + half, cz - half, x1 + 0.16, cz + half, y0);
  gridFloors(kit, cx - half, cz - half, cx + half, cz + half, 0.4, (px, pz) => {
    const d = octDist(px - cx, pz - cz);
    if (d < PLINTH_A) return null;
    if (d < PIT_A) return OPEN_SECTORS.includes(sectorOf(px - cx, pz - cz)) ? pitY : y0;
    return y0;
  });

  // ---------------------------------------------------------------- lights beyond the core
  // the axis lights cannot reach surfaces facing away from the axis (collars, plinth, cage struts), so
  // blue-white ring lights outside the catwalk shine back at the core at three heights
  for (const [ry, inten] of [[9.0, 180], [15.5, 160], [22.5, 140]]) {
    for (let k = 0; k < 4; k++) {
      const ang = Math.PI / 4 + (k * Math.PI) / 2;
      ctx.lights.cool.push(pointLight(0xbfd8ff, inten, 36, [cx + Math.cos(ang) * 11.5, y0 + ry, cz + Math.sin(ang) * 11.5]));
    }
  }
  ctx.lights.cool.push(pointLight(0xbfd8ff, 120, 22, [cx, y0 + 3.6, cz + PIT_A + 4.5]));
  ctx.lights.cool.push(pointLight(0xdfe8ff, 80, 20, [cx, y0 + 3.4, z1 - 3.0]));
  ctx.lights.cool.push(pointLight(0xdfe8ff, 100, 22, [cx, y0 + 4.5, z0 + 3.5]));
  ctx.lights.teal.push(pointLight(0x6fb4ff, 20, 10, [cx, pitY + 0.8, cz + PIT_A - 0.9]));
  ctx.lights.teal.push(pointLight(0x6fb4ff, 20, 10, [cx, pitY + 0.8, cz - PIT_A + 0.9]));
  return shell;
}
