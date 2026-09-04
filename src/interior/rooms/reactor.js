// Main reactor chamber (deck C, 30 m tall). The core is the hero: a 27 m contained beam rises from a low
// plinth to the ceiling socket: a bright banded white-blue beam (bands drift upward) inside a translucent
// blue sleeve ringed by white field rings and dark clamped hoops, all inside glass, broken only by three
// thin steel collars with magnetic containment rings; cage struts and faint light cones carry the glow
// up the chamber. An octagonal grated catwalk ring at +6 m (two flanking stair runs) carries
// control pulpits, amber post lamps and warning beacons; an upper inspection gallery at +18 m with two
// bridges to the side walls and two tiers of radial coolant mains make the full height read. A grated
// maintenance pit surrounds the plinth (stair at the side, centreline railing closed), capacitor banks
// line the side walls, a coolant manifold the forward wall. Lit from the axis (blue-white, 40 m reach)
// with wall washers on the upper plates and low fill at floor level.
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
  station,
  paintStrip,
  beaconSet,
  wallBaseTube,
  bandTexture,
  beamGeometry,
  beamMaterial,
} from "./deckCProps.js";

const CORE_R = 4.4; // translucent containment sleeve
const BEAM_R = 2.9; // the bright banded beam inside it
const GLASS_R = 4.85;
const COLLAR_R = 6.4;
const PLINTH_A = 8.0; // octagon apothem of the base plinth
const PLINTH_TOP = 1.6; // plinth top above the floor: the column starts at eye level
const PIT_A = 9.8; // outer apothem of the maintenance pit
const PIT_DEPTH = 1.2;
const WALK_IN = 7.4; // catwalk inner / outer apothems
const WALK_OUT = 10.2;
const WALK_H = 6.0;
const UPPER_IN = 7.2; // upper inspection gallery
const UPPER_OUT = 8.8;
const UPPER_H = 18.4;
const OPEN_SECTORS = [1, 2, 3]; // pit sectors left open (facing the door); the rest are grated
const STAIR_X = 3.1; // pit stair centre offset from the axis (off the centreline)
// vertical stack (relative to the room floor): thin collars, the glow gaps between them
const COLLARS = [[8.6, 9.7], [16.9, 18.0], [25.0, 26.1]];
const GAPS = [[PLINTH_TOP, 8.6], [9.7, 16.9], [18.0, 25.0], [26.1, 28.7]];
const TOP_Y = 28.7;

const sectorOf = (dx, dz) => (Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) + 8) % 8;

export function build(kit, ctx, room, lib) {
  const shell = roomShell(kit, ctx, room, { style: "dark", floor: false, lights: false, skipWalls: ["-z", "+z", "-x", "+x"], lightMat: "emitBlueSoft", lightRows: 4 });
  const y0 = shell.y0;
  const yTop = shell.yTop;
  const h = room.height;
  const { x0, x1, z0, z1 } = room;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const pitY = y0 - PIT_DEPTH;
  const walkY = y0 + WALK_H;
  const upperY = y0 + UPPER_H;
  const beacons = beaconSet(kit, ctx);

  // ---------------------------------------------------------------- walls: human-scale panels below 3.2 m,
  // slate plates with dark ribs, three blue light bands and unit stencils above (the plates catch the
  // wall washers so the upper volume never reads as void)
  let seed = 4100;
  for (const [dir, { frame, length }] of Object.entries(shell.frames)) {
    const ops = [];
    for (const door of room.doors || []) if (door[3] === dir) ops.push(lib.doorOpening(room, door, y0, length, Math.min(h - 0.1, door[4] || lib.DOOR_H)));
    lib.panelGrid(frame, length, 3.2, { openings: ops, depth: lib.WALL_T, seed: seed++, kick: true, topPipes: false, panelW: 2.2, styles: { panel: 0.74, vent: 0.1, conduit: 0.08, strip: 0.08 }, paints: lib.DARK_PAINTS, tag: room.id + dir });
    frame.box("paintedMetal", length / 2, 3.2 + (h - 3.2) / 2, -0.09, length, h - 3.2, 0.14, { color: PALETTE.slate, texel: 0.5 });
    frame.box("paintedMetal", length / 2, 3.3, 0.08, length, 0.2, 0.2, { color: PALETTE.gunmetal, texel: 1 });
    const nRibs = Math.round(length / 5.5);
    for (let i = 0; i < nRibs; i++) frame.box("paintedMetal", ((i + 0.5) / nRibs) * length, 3.2 + (h - 3.2) / 2, 0.1, 0.5, h - 3.2, 0.24, { color: PALETTE.gunmetal, texel: 1 });
    for (const v of [9.0, 16.5, 23.5]) {
      frame.box("paintedMetal", length / 2, v, 0.12, length, 0.5, 0.28, { color: PALETTE.darkMetal, texel: 1 });
      frame.box("emitBlueSoft", length / 2, v - 0.33, 0.06, length - 0.4, 0.08, 0.02, { uv: "keep" });
    }
    const idx = [2, 14, 0, 8];
    frame.add("decal", new THREE.PlaneGeometry(2.6, 2.6), length * 0.3, 13.0, -0.015, { uv: "keep", uvRect: decalRect(idx[seed % 4]) });
    frame.add("decal", new THREE.PlaneGeometry(2.6, 2.6), length * 0.7, 20.5, -0.015, { uv: "keep", uvRect: decalRect(idx[(seed + 1) % 4]) });
    frame.box("satinBlack", length / 2, h - 0.09, 0.02, length, 0.18, 0.05);
    // base tubes washing the wall foot on every stretch without a door
    if (!ops.length) wallBaseTube(frame, 0.6, length - 0.6, 0.4, "emitCoolSoft");
    else {
      wallBaseTube(frame, 0.6, ops[0].u0 - 0.5, 0.4, "emitCoolSoft");
      wallBaseTube(frame, ops[0].u1 + 0.5, length - 0.6, 0.4, "emitCoolSoft");
    }
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
  // walk path from the door to the pit edge: lighter runner with painted edge lines
  kit.boxMM("deck", [cx - 1.6, y0, cz + PIT_A + 0.4], [cx + 1.6, y0 + 0.006, z1 - 0.2], { color: PALETTE.impGrey, uv: "world", texel: 1 });
  paintStrip(kit, cx - 1.7, cz + PIT_A + 0.4, cx - 1.6, z1 - 0.3, y0);
  paintStrip(kit, cx + 1.6, cz + PIT_A + 0.4, cx + 1.7, z1 - 0.3, y0);
  stencil(kit, cx, y0 + 0.009, cz + PIT_A + 2.6, 1.6, 5, "up");

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
      // open sector: railing at the pit edge; the door-facing side is closed across the centreline and
      // only opens beside the stair at its east end
      if (k === 2) {
        const zr = cz + PIT_A;
        railing(kit, cx + 4.06, zr, cx + STAIR_X + 0.62, zr, y0, { n0: -0.12 });
        railing(kit, cx + STAIR_X - 0.62, zr, cx - 4.06, zr, y0, { n0: -0.12 });
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
  // stair down into the pit beside the centreline, with side rails and a hazard tag
  {
    const sx0 = cx + STAIR_X - 0.6;
    const sx1 = cx + STAIR_X + 0.6;
    const zt = cz + PIT_A;
    kit.stairs("paintedMetal", sx0, zt - 1.2, sx1, zt, pitY, y0, "z", { color: PALETTE.gunmetal, steps: 4 });
    stairRail(kit, [cx + STAIR_X, pitY, zt - 1.2], [cx + STAIR_X, y0, zt], [0.66, 0], { h: 1.0 });
    stairRail(kit, [cx + STAIR_X, pitY, zt - 1.2], [cx + STAIR_X, y0, zt], [-0.66, 0], { h: 1.0 });
    kit.box("hazard", cx + STAIR_X, y0 + 0.003, zt + 0.25, 1.3, 0.004, 0.3, { texel: 3 });
    stencil(kit, cx + STAIR_X, y0 + 0.009, zt + 0.75, 0.6, 15, "up");
    // warning beacons on the pit rail either side of the runner
    for (const bx of [cx - 2.4, cx + 2.4]) {
      kit.cyl("metal", bx, y0 + 0.65, zt - 0.12, 0.03, 1.3, "y", { color: PALETTE.gunmetal, segments: 8 });
      beacons.add(bx, y0 + 1.36, zt - 0.12);
    }
  }
  // pit colliders: plinth core and the outer pit wall (gap for the stair)
  octColliders(kit, cx, cz, PLINTH_A + 0.1, pitY, y0 + PLINTH_TOP + 0.4, "plinth");
  for (let k = 0; k < 8; k++) {
    if (k === 2) {
      const zr = cz + PIT_A;
      kit.collider([cx - 4.1, pitY, zr - 0.06], [cx + STAIR_X - 0.62, y0 - 0.01, zr + 0.06], "pitWall");
      kit.collider([cx + STAIR_X + 0.62, pitY, zr - 0.06], [cx + 4.1, y0 - 0.01, zr + 0.06], "pitWall");
    } else octSideCollider(kit, cx, cz, PIT_A, k, pitY, y0 - 0.01);
  }

  // ---------------------------------------------------------------- core: low plinth, thin collars, the column, rings, struts
  const plinthH = PLINTH_TOP + PIT_DEPTH;
  kit.add("paintedMetal", octPrism(PLINTH_A, plinthH), { pos: [cx, pitY + plinthH / 2, cz], color: PALETTE.slate, uv: "world", texel: 0.7 });
  kit.add("paintedMetal", octPrism(PLINTH_A + 0.3, 0.3), { pos: [cx, y0 + PLINTH_TOP - 0.15, cz], color: PALETTE.darkMetal, uv: "world", texel: 0.7 });
  kit.add("emitBlueSoft", octPrism(PLINTH_A + 0.02, 0.08), { pos: [cx, y0 + PLINTH_TOP - 0.42, cz], uv: "keep" });
  // socket ring on the plinth top where the column emerges
  kit.cyl("metal", cx, y0 + PLINTH_TOP + 0.15, cz, GLASS_R + 0.55, 0.3, "y", { color: PALETTE.darkMetal, segments: 48 });
  kit.add("metal", new THREE.TorusGeometry(GLASS_R + 0.5, 0.18, 8, 48), { pos: [cx, y0 + PLINTH_TOP + 0.34, cz], rot: [Math.PI / 2, 0, 0], color: PALETTE.steel, uv: "world", texel: 1 });
  for (let k = 0; k < 8; k++) {
    const ang = (k * Math.PI) / 4;
    const nx = Math.cos(ang);
    const nz = Math.sin(ang);
    const rot = [0, Math.PI / 2 - ang, 0];
    // plinth faces: nameplate, leds and a stencil; service cabinets in the pit only on the diagonals
    // (the door-facing face stays a clean marked wall, not a hatch)
    kit.add("metal", new THREE.BoxGeometry(2.0, 0.7, 0.06), { pos: [cx + nx * (PLINTH_A + 0.03), y0 + 0.75, cz + nz * (PLINTH_A + 0.03)], rot, color: PALETTE.slate, texel: 1 });
    kit.add("leds", new THREE.BoxGeometry(0.8, 0.05, 0.01), { pos: [cx + nx * (PLINTH_A + 0.065), y0 + 1.22, cz + nz * (PLINTH_A + 0.065)], rot, uv: "keep" });
    const d = new THREE.PlaneGeometry(0.6, 0.6);
    d.rotateY(Math.PI / 2 - ang);
    kit.add("decal", d, { pos: [cx + nx * (PLINTH_A + 0.07), y0 + 0.75, cz + nz * (PLINTH_A + 0.07)], uv: "keep", uvRect: decalRect(k % 2 ? 5 : 9) });
    if (k % 2) {
      kit.add("paintedMetal", new THREE.BoxGeometry(1.4, 2.0, 0.7), { pos: [cx + nx * (PLINTH_A + 0.2), pitY + 1.0, cz + nz * (PLINTH_A + 0.2)], rot, color: PALETTE.darkMetal, texel: 1 });
      kit.add("hazard", new THREE.BoxGeometry(1.42, 0.12, 0.72), { pos: [cx + nx * (PLINTH_A + 0.2), pitY + 1.8, cz + nz * (PLINTH_A + 0.2)], rot, texel: 3 });
    } else {
      kit.add("paintedMetal", new THREE.BoxGeometry(1.0, 1.4, 0.3), { pos: [cx + nx * (PLINTH_A + 0.02), pitY + 0.9, cz + nz * (PLINTH_A + 0.02)], rot, color: PALETTE.gunmetal, texel: 1 });
      kit.add("emitBlue", new THREE.BoxGeometry(0.6, 0.04, 0.01), { pos: [cx + nx * (PLINTH_A + 0.18), pitY + 1.45, cz + nz * (PLINTH_A + 0.18)], rot, uv: "keep" });
    }
  }
  // thin collars with magnetic containment rings
  for (const [a, b] of COLLARS) {
    const ya = y0 + a;
    const yb = y0 + b;
    const yc = (ya + yb) / 2;
    kit.cyl("paintedMetal", cx, yc, cz, COLLAR_R, yb - ya, "y", { color: PALETTE.slate, segments: 48, texel: 0.5 });
    kit.cyl("metal", cx, ya + 0.08, cz, COLLAR_R + 0.25, 0.16, "y", { color: PALETTE.darkMetal, segments: 48 });
    kit.cyl("metal", cx, yb - 0.08, cz, COLLAR_R + 0.25, 0.16, "y", { color: PALETTE.darkMetal, segments: 48 });
    kit.add("metal", new THREE.TorusGeometry(COLLAR_R + 0.5, 0.42, 8, 48), { pos: [cx, yc, cz], rot: [Math.PI / 2, 0, 0], color: PALETTE.steel, uv: "world", texel: 1 });
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const r = COLLAR_R + 0.5;
      kit.add("paintedMetal", new THREE.BoxGeometry(0.5, 0.6, 1.1), { pos: [cx + Math.cos(ang) * r, yc, cz + Math.sin(ang) * r], rot: [0, Math.PI / 2 - ang, 0], color: PALETTE.darkMetal, texel: 1.5 });
      kit.add("emitBlue", new THREE.BoxGeometry(0.2, 0.08, 1.14), { pos: [cx + Math.cos(ang) * r, yc + 0.22, cz + Math.sin(ang) * r], rot: [0, Math.PI / 2 - ang, 0], uv: "keep" });
    }
    kit.add("emitBlueSoft", new THREE.TorusGeometry(COLLAR_R + 0.94, 0.05, 4, 48), { pos: [cx, yc, cz], rot: [Math.PI / 2, 0, 0], uv: "keep" });
  }
  // mid-gap field rings clamped to the cage struts
  for (const y of [5.2, 13.3, 21.5]) {
    kit.add("metal", new THREE.TorusGeometry(COLLAR_R - 0.85, 0.16, 6, 48), { pos: [cx, y0 + y, cz], rot: [Math.PI / 2, 0, 0], color: PALETTE.steel, uv: "world", texel: 1 });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const r = COLLAR_R - 0.85;
      kit.add("emitBlue", new THREE.BoxGeometry(0.3, 0.06, 0.44), { pos: [cx + Math.cos(ang) * r, y0 + y + 0.14, cz + Math.sin(ang) * r], rot: [0, Math.PI / 2 - ang, 0], uv: "keep" });
    }
  }
  // top socket flaring into the ceiling
  kit.add("paintedMetal", new THREE.CylinderGeometry(COLLAR_R + 1.4, COLLAR_R + 0.2, h - TOP_Y, 48), { pos: [cx, y0 + (TOP_Y + h) / 2, cz], color: PALETTE.slate, uv: "world", texel: 0.5 });
  kit.cyl("emitBlueSoft", cx, y0 + TOP_Y + 0.1, cz, COLLAR_R + 0.3, 0.1, "y", { segments: 48, uv: "keep" });
  kit.add("metal", new THREE.TorusGeometry(COLLAR_R + 1.3, 0.25, 6, 48), { pos: [cx, y0 + h - 0.3, cz], rot: [Math.PI / 2, 0, 0], color: PALETTE.steel, uv: "world", texel: 1 });
  // glass sleeves, and inside every glow gap the field structure that makes the column read as a
  // contained beam: bright white field rings with dark clamped hoops between them
  for (const [a, b] of GAPS) {
    kit.cyl("glass", cx, y0 + (a + b) / 2, cz, GLASS_R, b - a, "y", { segments: 48, open: true });
    const n = Math.max(1, Math.round((b - a) / 1.8));
    for (let i = 0; i < n; i++) {
      const y = y0 + a + ((i + 0.5) / n) * (b - a);
      kit.add("emitWhite", new THREE.TorusGeometry(CORE_R + 0.12, 0.09, 6, 48), { pos: [cx, y, cz], rot: [Math.PI / 2, 0, 0], uv: "keep" });
      if (i + 1 < n) {
        const yh = y0 + a + ((i + 1) / n) * (b - a);
        kit.add("metal", new THREE.TorusGeometry(CORE_R + 0.14, 0.11, 6, 48), { pos: [cx, yh, cz], rot: [Math.PI / 2, 0, 0], color: PALETTE.gunmetal, uv: "world", texel: 1 });
        for (let k = 0; k < 8; k++) {
          const ang = Math.PI / 8 + (k * Math.PI) / 4;
          kit.add("metal", new THREE.BoxGeometry(0.4, 0.34, 0.3), { pos: [cx + Math.cos(ang) * (CORE_R + 0.14), yh, cz + Math.sin(ang) * (CORE_R + 0.14)], rot: [0, Math.PI / 2 - ang, 0], color: PALETTE.darkMetal, texel: 2 });
        }
      }
    }
  }
  // eight vertical struts of the containment cage with blue running lights
  for (let k = 0; k < 8; k++) {
    const ang = Math.PI / 8 + (k * Math.PI) / 4;
    const r = COLLAR_R - 0.85;
    const sy = y0 + PLINTH_TOP;
    const ey = y0 + TOP_Y;
    const rot = [0, Math.PI / 2 - ang, 0];
    kit.add("paintedMetal", new THREE.BoxGeometry(0.5, ey - sy, 0.5), { pos: [cx + Math.cos(ang) * r, (sy + ey) / 2, cz + Math.sin(ang) * r], rot, color: PALETTE.darkMetal, texel: 1 });
    kit.add("emitBlue", new THREE.BoxGeometry(0.08, ey - sy - 1.0, 0.03), { pos: [cx + Math.cos(ang) * (r + 0.26), (sy + ey) / 2, cz + Math.sin(ang) * (r + 0.26)], rot, uv: "keep" });
  }
  // the containment column: a bright banded beam inside a translucent blue sleeve, so the centre reads as
  // a contained beam with brighter bands drifting slowly upward instead of a flat white bar; the chamber
  // is lit by the column itself (strong blue-white sources on the axis at five heights, 40 m reach)
  {
    const period = 10.5;
    const origin = y0 + PLINTH_TOP;
    const beamMat = beamMaterial(ctx, "#dbe9ff", 1.45, bandTexture(7, 0.22, 1.0, 0.15), period, 0.9);
    const beam = new THREE.Mesh(beamGeometry(cx, origin, cz, BEAM_R, TOP_Y - PLINTH_TOP, period, 40), beamMat);
    beam.name = "reactorBeam";
    beam.castShadow = false;
    beam.receiveShadow = false;
    const sleeveMat = beamMaterial(ctx, "#78b4ff", 0.55, bandTexture(2, 0.7, 1.0, 0.5), period * 2, 0.35, { opacity: 0.34 });
    const sleeve = new THREE.Mesh(mergeGeometries(GAPS.map(([a, b]) => beamGeometry(cx, y0 + a - 0.2, cz, CORE_R, b - a + 0.4, period * 2, 48, origin)), false), sleeveMat);
    sleeve.name = "reactorSleeve";
    sleeve.renderOrder = 1;
    sleeve.castShadow = false;
    sleeve.receiveShadow = false;
    const core = new THREE.Group();
    core.name = "reactorCore";
    core.add(beam, sleeve);
    const coreLights = [];
    for (const [k, y] of [4.6, 10.6, 16.6, 22.6, 28.0].entries()) {
      const l = pointLight(0xa8d4ff, [340, 360, 360, 320, 260][k], 40, [cx, y0 + y, cz]);
      ctx.lights.teal.push(l);
      coreLights.push(l);
    }
    // faint additive light cones spreading from the collars up and down the glow gaps
    const coneMat = new THREE.MeshBasicMaterial({ color: 0x5fa8ff, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const cones = [];
    const cone = (yFrom, yTo, rFrom, rTo) => {
      const g = new THREE.CylinderGeometry(rTo, rFrom, Math.abs(yTo - yFrom), 32, 1, true);
      if (yTo < yFrom) g.rotateX(Math.PI);
      g.translate(cx, y0 + (yFrom + yTo) / 2, cz);
      cones.push(g);
    };
    cone(9.7, 15.8, 5.2, 8.2);
    cone(18.0, 24.2, 5.2, 8.2);
    cone(26.1, 28.7, 5.2, 6.6);
    cone(8.6, 3.4, 5.2, 8.0);
    cone(16.9, 11.0, 5.2, 8.0);
    cone(25.0, 19.0, 5.2, 8.0);
    const coneMesh = new THREE.Mesh(mergeGeometries(cones, false), coneMat);
    coneMesh.name = "reactorCones";
    coneMesh.renderOrder = 2;
    core.add(coneMesh);
    let t = 0;
    ctx.dynamic.push({
      object: core,
      update(dt) {
        t += dt;
        const p = 0.86 + 0.1 * Math.sin(t * 1.3) + 0.04 * Math.sin(t * 4.7);
        beamMat.emissiveIntensity = beamMat.userData.base * p;
        sleeveMat.emissiveIntensity = sleeveMat.userData.base * (0.5 + 0.5 * p);
        beamMat.userData.scroll(dt);
        sleeveMat.userData.scroll(dt);
        coneMat.opacity = 0.045 * (0.8 + 0.25 * p);
        for (const l of coreLights) l.intensity = (l.userData.baseIntensity ?? l.intensity) * (0.9 + 0.1 * p);
      },
    });
  }

  // ---------------------------------------------------------------- catwalk ring at +6 m
  kit.add("grate", octRing(WALK_IN + 0.05, WALK_OUT - 0.05), { pos: [cx, walkY + 0.004, cz], uv: "world", texel: 1 });
  for (let k = 0; k < 8; k++) {
    for (const a of [WALK_IN, WALK_OUT]) {
      const [p, q] = octSide(cx, cz, a, k);
      beamBetween(kit, "paintedMetal", [p[0], walkY - 0.15, p[1]], [q[0], walkY - 0.15, q[1]], 0.3, 0.16, { color: PALETTE.gunmetal, texel: 1, extend: 0.1 });
    }
    const vi = octVertex(cx, cz, WALK_IN, k);
    const vo = octVertex(cx, cz, WALK_OUT, k);
    beamBetween(kit, "paintedMetal", [vi[0], walkY - 0.15, vi[1]], [vo[0], walkY - 0.15, vo[1]], 0.26, 0.2, { color: PALETTE.gunmetal, texel: 1 });
    const [ia, ib] = octSide(cx, cz, WALK_IN, k);
    const [oa, ob] = octSide(cx, cz, WALK_OUT, k);
    beamBetween(kit, "metal", [(ia[0] + ib[0]) / 2, walkY - 0.1, (ia[1] + ib[1]) / 2], [(oa[0] + ob[0]) / 2, walkY - 0.1, (oa[1] + ob[1]) / 2], 0.14, 0.1, { color: PALETTE.gunmetal });
    // bracket from the inner vertex down to the plinth socket
    const ang = Math.PI / 8 + (k * Math.PI) / 4;
    beamBetween(kit, "paintedMetal", [vi[0], walkY - 0.3, vi[1]], [cx + Math.cos(ang) * (COLLAR_R - 0.6), y0 + PLINTH_TOP + 0.3, cz + Math.sin(ang) * (COLLAR_R - 0.6)], 0.22, 0.22, { color: PALETTE.gunmetal, texel: 1 });
    // slim column from the floor through the ring up to the coolant main
    kit.box("paintedMetal", vo[0], (y0 + y0 + 9.2) / 2, vo[1], 0.34, 9.2, 0.34, { color: PALETTE.gunmetal, texel: 1 });
    kit.box("metal", vo[0], y0 + 0.15, vo[1], 0.5, 0.3, 0.5, { color: PALETTE.darkMetal, texel: 1.5 });
    kit.box("emitAmber", vo[0], walkY + 1.6, vo[1], 0.36, 0.05, 0.36, { uv: "keep" });
    kit.collider([vo[0] - 0.25, y0, vo[1] - 0.25], [vo[0] + 0.25, walkY + 2, vo[1] + 0.25], "column");
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
  // control pulpits on the E, N, W and S sides, amber post lamps with warning beacons on the diagonals
  for (const k of [0, 2, 4, 6]) {
    const ang = (k * Math.PI) / 4;
    const px = cx + Math.cos(ang) * (WALK_IN + 0.15);
    const pz = cz + Math.sin(ang) * (WALK_IN + 0.15);
    const f = yawFrame(kit, px, walkY, pz, Math.atan2(Math.cos(ang), Math.sin(ang)));
    wallConsole(f, 0, 1.5, k === 2 ? "screen6" : "screen4");
    f.box("emitBlue", 0, 0.5, 0.56, 1.2, 0.03, 0.01, { uv: "keep" });
    f.box("satinBlack", 0, 1.45, 0.62, 1.6, 0.06, 0.16);
    f.box("leds", 0, 1.42, 0.705, 1.2, 0.03, 0.005, { uv: "keep" });
  }
  for (const k of [1, 3, 5, 7]) {
    const ang = (k * Math.PI) / 4;
    const px = cx + Math.cos(ang) * (WALK_OUT - 0.4);
    const pz = cz + Math.sin(ang) * (WALK_OUT - 0.4);
    kit.cyl("metal", px, walkY + 1.1, pz, 0.04, 2.2, "y", { color: PALETTE.gunmetal, segments: 8 });
    kit.cyl("metal", px, walkY + 0.06, pz, 0.18, 0.12, "y", { color: PALETTE.darkMetal, segments: 12 });
    kit.box("paintedMetal", px, walkY + 2.28, pz, 0.34, 0.16, 0.34, { color: PALETTE.gunmetal, texel: 2 });
    kit.box("emitAmber", px, walkY + 2.18, pz, 0.26, 0.05, 0.26, { uv: "keep" });
    beacons.add(px, walkY + 2.44, pz);
    kit.collider([px - 0.2, walkY, pz - 0.2], [px + 0.2, walkY + 2.3, pz + 0.2], "lamp");
    ctx.lights.warm.push(pointLight(0xffb060, 40, 14, [px, walkY + 1.9, pz]));
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
    // low fill at the stair foot so the floor and wall base read
    ctx.lights.cool.push(pointLight(0xbfd8ff, 30, 14, [mid + s * 1.2, y0 + 1.0, zb + 1.2]));
  }

  // ---------------------------------------------------------------- operator pulpits on the floor overlooking the pit
  for (const s of [-1, 1]) station(kit, cx + s * 3.9, y0, cz + PIT_A + 2.3, Math.PI, 2.4, { chairs: 1, screen: "screen4", glow: "emitBlue" });

  // ---------------------------------------------------------------- upper inspection gallery at +18.4 m with two bridges to the side walls
  {
    kit.add("grate", octRing(UPPER_IN + 0.05, UPPER_OUT - 0.05), { pos: [cx, upperY + 0.004, cz], uv: "world", texel: 1 });
    for (let k = 0; k < 8; k++) {
      for (const a of [UPPER_IN, UPPER_OUT]) {
        const [p, q] = octSide(cx, cz, a, k);
        beamBetween(kit, "paintedMetal", [p[0], upperY - 0.15, p[1]], [q[0], upperY - 0.15, q[1]], 0.3, 0.14, { color: PALETTE.gunmetal, texel: 1, extend: 0.1 });
      }
      const [ia, ib] = octSide(cx, cz, UPPER_IN, k);
      const [oa, ob] = octSide(cx, cz, UPPER_OUT, k);
      railing(kit, ia[0], ia[1], ib[0], ib[1], upperY, { n0: -0.1, postStep: 1.4, collide: false });
      if (k !== 0 && k !== 4) railing(kit, oa[0], oa[1], ob[0], ob[1], upperY, { n0: 0.1, postStep: 1.4, collide: false });
      // bracket to collar B
      const ang = Math.PI / 8 + (k * Math.PI) / 4;
      const vi = octVertex(cx, cz, UPPER_IN, k);
      beamBetween(kit, "paintedMetal", [vi[0], upperY - 0.3, vi[1]], [cx + Math.cos(ang) * (COLLAR_R + 0.2), y0 + COLLARS[1][0] + 0.2, cz + Math.sin(ang) * (COLLAR_R + 0.2)], 0.2, 0.2, { color: PALETTE.gunmetal, texel: 1 });
    }
    for (const k of [1, 3, 5, 7]) {
      const ang = (k * Math.PI) / 4;
      const px = cx + Math.cos(ang) * (UPPER_OUT - 0.35);
      const pz = cz + Math.sin(ang) * (UPPER_OUT - 0.35);
      kit.cyl("metal", px, upperY + 0.9, pz, 0.035, 1.8, "y", { color: PALETTE.gunmetal, segments: 8 });
      beacons.add(px, upperY + 1.85, pz, 0.08);
    }
    // bridges along +x / -x from the gallery to landings on the side walls
    for (const s of [-1, 1]) {
      const bx0 = cx + s * UPPER_OUT;
      const bx1 = s < 0 ? x0 + 0.3 : x1 - 0.3;
      const xa = Math.min(bx0, bx1);
      const xb = Math.max(bx0, bx1);
      const len = xb - xa;
      const g = new THREE.PlaneGeometry(len, 1.4);
      g.rotateX(-Math.PI / 2);
      kit.add("grate", g, { pos: [(xa + xb) / 2, upperY + 0.004, cz], uv: "world", texel: 1 });
      for (const dz of [-0.7, 0.7]) kit.boxMM("paintedMetal", [xa, upperY - 0.3, cz + dz - 0.08], [xb, upperY, cz + dz + 0.08], { color: PALETTE.gunmetal, texel: 1 });
      railing(kit, xa, cz - 0.7, xb, cz - 0.7, upperY, { n0: 0.06, postStep: 1.6, collide: false });
      railing(kit, xa, cz + 0.7, xb, cz + 0.7, upperY, { n0: -0.06, postStep: 1.6, collide: false });
      // hangers from the ceiling every 4 m, a landing plate and a hatch on the wall
      for (let x = xa + 2.0; x < xb - 1.0; x += 4.0) for (const dz of [-0.75, 0.75]) kit.box("metal", x, (upperY + yTop) / 2, cz + dz, 0.06, yTop - upperY, 0.06, { color: PALETTE.steel, texel: 2 });
      const wx = s < 0 ? x0 : x1;
      kit.boxMM("paintedMetal", [Math.min(wx, wx + s * -2.2), upperY - 0.25, cz - 2.0], [Math.max(wx, wx + s * -2.2), upperY, cz + 2.0], { color: PALETTE.slate, texel: 1 });
      railing(kit, wx - s * 2.2, cz - 2.0, wx - s * 2.2, cz - 0.7, upperY, { postStep: 1.3, collide: false });
      railing(kit, wx - s * 2.2, cz + 0.7, wx - s * 2.2, cz + 2.0, upperY, { postStep: 1.3, collide: false });
      const f = shell.frames[s < 0 ? "-x" : "+x"].frame;
      const u = s < 0 ? z1 - cz : cz - z0;
      f.box("paintedMetal", u, UPPER_H + 1.3, 0.05, 1.6, 2.4, 0.1, { color: PALETTE.gunmetal, texel: 1 });
      f.box("satinBlack", u, UPPER_H + 1.3, 0.11, 1.3, 2.1, 0.03);
      f.box("emitAmber", u, UPPER_H + 2.55, 0.11, 1.2, 0.05, 0.02, { uv: "keep" });
      f.add("decal", new THREE.PlaneGeometry(0.6, 0.6), u + 1.3, UPPER_H + 1.6, 0.005, { uv: "keep", uvRect: decalRect(5) });
      wallLightBar(f, u - 3.4, u - 1.2, UPPER_H + 2.4, "emitCoolSoft");
      wallLightBar(f, u + 1.2, u + 3.4, UPPER_H + 2.4, "emitCoolSoft");
    }
  }

  // ---------------------------------------------------------------- radial coolant mains: eight from collar A to the walls, four from collar C
  const mainY = y0 + (COLLARS[0][0] + COLLARS[0][1]) / 2;
  const upperMainY = y0 + (COLLARS[2][0] + COLLARS[2][1]) / 2;
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
    if (k % 2 === 0) {
      // upper tier: thicker mains with a hanger to the ceiling and a wall bracket
      const ua = [cx + dx * (COLLAR_R + 0.3), upperMainY, cz + dz * (COLLAR_R + 0.3)];
      const ub = [cx + dx * (t - 0.05), upperMainY, cz + dz * (t - 0.05)];
      cylBetween(kit, "metal", ua, ub, 0.4, { color: PALETTE.steel, segments: 16 });
      flange(kit, [cx + dx * (COLLAR_R + 1.1), upperMainY, cz + dz * (COLLAR_R + 1.1)], [dx, 0, dz], 0.56, { t: 0.14 });
      flange(kit, [cx + dx * (t - 0.5), upperMainY, cz + dz * (t - 0.5)], [dx, 0, dz], 0.58, { t: 0.16 });
      for (const rr of [12.0, 18.0]) {
        if (rr > t - 1) continue;
        flange(kit, [cx + dx * rr, upperMainY, cz + dz * rr], [dx, 0, dz], 0.5, { t: 0.1 });
        kit.box("metal", cx + dx * rr, (upperMainY + 0.4 + yTop) / 2, cz + dz * rr, 0.08, yTop - upperMainY - 0.4, 0.08, { color: PALETTE.steel, texel: 2 });
      }
    }
  }

  // ---------------------------------------------------------------- capacitor banks on the port / starboard walls
  for (const s of [-1, 1]) {
    const wx = s < 0 ? x0 : x1;
    for (const zc of [447.0, cz, 470.5]) {
      const f = yawFrame(kit, wx, y0, zc, s < 0 ? Math.PI / 2 : -Math.PI / 2);
      f.box("paintedMetal", 0, 3.2, 0.12, 7.2, 6.2, 0.24, { color: PALETTE.slate, texel: 0.8 });
      f.box("paintedMetal", 0, 0.3, 1.5, 7.4, 0.6, 3.0, { color: PALETTE.gunmetal, texel: 1 });
      f.box("satinBlack", 0, 0.62, 1.5, 7.42, 0.06, 3.02);
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
      ctx.lights.cool.push(pointLight(0xdfe8ff, 60, 20, [wx - s * 4.5, y0 + 7.0, zc]));
    }
    // wall stretches between the banks: light bars, a console, a stencil
    const f = shell.frames[s < 0 ? "-x" : "+x"].frame;
    const uOf = (z) => (s < 0 ? z1 - z : z - z0);
    for (const zc of [452.9, 464.6]) {
      wallLightBar(f, Math.min(uOf(zc - 2.0), uOf(zc + 2.0)), Math.max(uOf(zc - 2.0), uOf(zc + 2.0)), 2.4);
      wallConsole(f, uOf(zc), 1.6, "screen4");
      f.add("decal", new THREE.PlaneGeometry(0.5, 0.5), uOf(zc + 1.5), 1.7, 0.005, { uv: "keep", uvRect: decalRect(zc > 460 ? 6 : 12) });
    }
    // wall washer on the upper plates (4 m off the wall so the wash is a broad cone, not a hot spot)
    ctx.lights.cool.push(pointLight(0xbfd8ff, 200, 26, [wx - s * 4.0, y0 + 14.0, cz]));
  }
  ctx.lights.cool.push(pointLight(0xbfd8ff, 200, 26, [cx, y0 + 14.0, z0 + 4.0]));
  ctx.lights.cool.push(pointLight(0xbfd8ff, 200, 26, [cx, y0 + 14.0, z1 - 4.0]));

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
    ctx.lights.cool.push(pointLight(0xdfe8ff, 60, 18, [cx - 7.5, y0 + 3.6, z0 + 3.0]));
    ctx.lights.cool.push(pointLight(0xdfe8ff, 60, 18, [cx + 7.5, y0 + 3.6, z0 + 3.0]));
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

  // ---------------------------------------------------------------- floor-level lights beyond the core
  // (kept below the column's brightness: the floor is lit, the core is the light)
  ctx.lights.cool.push(pointLight(0xbfd8ff, 60, 20, [cx, y0 + 3.4, cz + PIT_A + 4.5]));
  ctx.lights.cool.push(pointLight(0xdfe8ff, 40, 16, [cx, y0 + 3.2, z1 - 3.0]));
  ctx.lights.teal.push(pointLight(0x6fb4ff, 20, 10, [cx, pitY + 0.8, cz + PIT_A - 0.9]));
  ctx.lights.teal.push(pointLight(0x6fb4ff, 20, 10, [cx, pitY + 0.8, cz - PIT_A + 0.9]));
  beacons.finish();
  return shell;
}
