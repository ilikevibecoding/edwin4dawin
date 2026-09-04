// Main hangar: a 64 x 110 x 38 m bay on the belly with the launch / recovery well open to space in the
// middle of the deck. Fighters (src/hangar/traffic.js) hang in clamp gantries under two overhead girders,
// drop straight through the well and are pulled back by the tractor emitters on the ceiling. Around the
// well: railed deck with lane markings, refuelling and repair stations along the side decks, catwalks at
// y -62 with switchback stair towers, maintenance platforms at the racks, a flight-control cab on the aft
// deck, cargo lifts, a travelling gantry crane and the stowed well blast-door leaves.
import * as THREE from "three";
import { HANGAR, roomFloorY } from "../../config/shipSpec.js";
import { decalRect } from "../../textures.js";
import {
  propFrame, railing, deckStrip, hazardBand, deckDecal, grateFloor, grateScreen, bayWalls, containerStack,
  crate, toolCart, fuelBowser, pedestalConsole, cabinet, lightBank, pipeRun, stairTower, gantryCrane, blastLeaves,
  beacons, tractorEmitters, cargoLift, loaderVehicle, shadowCasters, RAIL_H, BLACK,
} from "../../hangar/machinery.js";

const CAT_Y = -62; // service catwalks
const PLAT_Y = -60; // maintenance platforms beside the racks
const GIRDER = { y0: -50.2, y1: -48.6 }; // rack girders
const CRANE_Y = -46.8; // crane bridge centre

export function build(kit, ctx, room, lib) {
  const P = lib.PALETTE;
  const mats = ctx.materials;
  const { x0, x1, z0, z1 } = room;
  const y0 = roomFloorY(room);
  const yTop = y0 + room.height;
  const W = HANGAR.well;
  const T = lib.WALL_T;

  const shell = lib.roomShell(kit, ctx, room, { style: "dark", floor: false, ceiling: false, lights: false, skipWalls: ["-z", "+z", "-x", "+x"] });
  // only the structural plate material throws shadows (catwalks, platforms, stair towers, girders, cab)
  shadowCasters(kit, ["paintedMetal"]);

  deck(kit, lib, room, y0, W, T);
  wellEdge(kit, lib, y0, W);
  markings(kit, lib, y0, W, z0, z1);
  walls(kit, ctx, lib, room, shell, y0);
  ceiling(kit, lib, room, yTop, T);
  racks(kit, lib, yTop);
  catwalks(kit, ctx, lib, room, y0);
  platforms(kit, lib);
  stations(kit, ctx, lib, y0);
  forwardDeck(kit, lib, y0);
  aftDeck(kit, ctx, lib, y0, mats);
  lights(ctx, lib, y0);
  dynamics(kit, ctx, mats, y0, yTop, W);
  return shell;
}

// ---------------------------------------------------------------- deck with the open well
function deck(kit, lib, room, y0, W, T) {
  const P = lib.PALETTE;
  const { x0, x1, z0, z1 } = room;
  // the exterior curb (0.6 m lining) runs 0.6 m outside the well; slabs stop inside it so no edge shows
  const in_ = 0.3;
  const slabs = [
    [x0 - T, z0 - T, x1 + T, W.z0 - in_],
    [x0 - T, W.z1 + in_, x1 + T, z1 + T],
    [x0 - T, W.z0 - in_, W.x0 - in_, W.z1 + in_],
    [W.x1 + in_, W.z0 - in_, x1 + T, W.z1 + in_],
  ];
  for (const [a, b, c, d] of slabs) {
    kit.boxMM("deck", [a, y0 - 0.3, b], [c, y0, d], { color: P.impGreyDark, uv: "world", texel: 1 });
    kit.floor(a, b, c, d, y0);
  }
  // lighter lane plates: launch lane (forward) and recovery lane (aft)
  kit.boxMM("deck", [-5, y0, z0 + 0.5], [5, y0 + 0.006, W.z0 - 1.2], { color: P.impGrey, uv: "world", texel: 1 });
  kit.boxMM("deck", [-5, y0, W.z1 + 1.2], [5, y0 + 0.006, z1 - 0.5], { color: P.impGrey, uv: "world", texel: 1 });
}

// ---------------------------------------------------------------- railings, safety line, gap barriers
function wellEdge(kit, lib, y0, W) {
  const P = lib.PALETTE;
  const rx = W.x1 + 0.85; // rail line 0.25 m outside the curb
  const rz0 = W.z0 - 0.85;
  const rz1 = W.z1 + 0.85;
  const gap = 4.0; // launch / recovery lane openings, centred on x = 0
  const opts = { postEvery: 2.4, tag: "wellRail" };
  railing(kit, -rx, rz0, -rx, rz1, y0, opts);
  railing(kit, rx, rz0, rx, rz1, y0, opts);
  for (const z of [rz0, rz1]) {
    railing(kit, -rx, z, -gap, z, y0, opts);
    railing(kit, gap, z, rx, z, y0, opts);
  }
  // gap barriers: hazard posts, a red safety line on the curb and an invisible stop on the curb itself
  for (const [z, zc0, zc1] of [[W.z0, W.z0 - 0.62, W.z0 + 0.05], [W.z1, W.z1 - 0.05, W.z1 + 0.62]]) {
    for (const sx of [-1, 1]) {
      kit.box("hazard", sx * (gap + 0.15), y0 + 0.55, z + (z < 465 ? -0.55 : 0.55), 0.3, 1.1, 0.3, { uv: "world", texel: 1.5 });
      kit.box("emitAmber", sx * (gap + 0.15), y0 + 1.2, z + (z < 465 ? -0.55 : 0.55), 0.2, 0.12, 0.2);
    }
    kit.boxMM("emitAmber", [-gap, y0 + 0.25, z + (z < 465 ? -0.5 : 0.3)], [gap, y0 + 0.265, z + (z < 465 ? -0.3 : 0.5)], { uv: "keep" });
    kit.collider([-gap - 0.3, y0, zc0], [gap + 0.3, y0 + 0.3, zc1], "wellCurb");
  }
  // hazard bands and the yellow limit line around the well
  hazardBand(kit, -rx - 0.15, rz0 - 0.15, -rx - 0.95, rz1 + 0.15, y0);
  hazardBand(kit, rx + 0.15, rz0 - 0.15, rx + 0.95, rz1 + 0.15, y0);
  hazardBand(kit, -rx - 0.95, rz0 - 0.15, -gap, rz0 - 0.95, y0);
  hazardBand(kit, gap, rz0 - 0.15, rx + 0.95, rz0 - 0.95, y0);
  hazardBand(kit, -rx - 0.95, rz1 + 0.15, -gap, rz1 + 0.95, y0);
  hazardBand(kit, gap, rz1 + 0.15, rx + 0.95, rz1 + 0.95, y0);
  const ly = rx + 1.6;
  deckStrip(kit, "emitAmber", -ly - 0.08, rz0 - 1.6, -ly + 0.08, rz1 + 1.6, y0);
  deckStrip(kit, "emitAmber", ly - 0.08, rz0 - 1.6, ly + 0.08, rz1 + 1.6, y0);
  deckStrip(kit, "emitAmber", -ly, rz0 - 1.68, ly, rz0 - 1.52, y0);
  deckStrip(kit, "emitAmber", -ly, rz1 + 1.52, ly, rz1 + 1.68, y0);
  // "mind the gap" stencils at the lane openings, "no step" at the corners
  deckDecal(kit, 0, y0, W.z0 - 2.6, 2.2, 15, 0);
  deckDecal(kit, 0, y0, W.z1 + 2.6, 2.2, 15, Math.PI);
  for (const sx of [-1, 1]) for (const [sz, z] of [[-1, rz0 - 2.4], [1, rz1 + 2.4]]) deckDecal(kit, sx * (rx + 1.2), y0, z, 1.6, 7, sx * sz > 0 ? Math.PI / 2 : -Math.PI / 2);
}

// ---------------------------------------------------------------- lane markings and stencils
function markings(kit, lib, y0, W, z0, z1) {
  // launch lane: white edge lines and centre dashes from the shuttle-bay door to the forward well opening
  for (const sx of [-1, 1]) deckStrip(kit, "emitWhiteSoft", sx * 5.0 - 0.08, z0 + 1, sx * 5.0 + 0.08, W.z0 - 2.4, y0);
  for (let z = z0 + 2.5; z < W.z0 - 4; z += 3) deckStrip(kit, "emitWhiteSoft", -0.15, z, 0.15, z + 1.4, y0);
  deckDecal(kit, -7.4, y0, z0 + 6, 3.2, 0, Math.PI / 2);
  deckDecal(kit, 7.4, y0, z0 + 6, 3.2, 2, -Math.PI / 2);
  // recovery lane: amber
  for (const sx of [-1, 1]) deckStrip(kit, "emitAmber", sx * 5.0 - 0.08, W.z1 + 2.4, sx * 5.0 + 0.08, z1 - 1, y0);
  for (let z = W.z1 + 4; z < z1 - 3; z += 3) deckStrip(kit, "emitAmber", -0.15, z, 0.15, z + 1.4, y0);
  deckDecal(kit, -7.4, y0, z1 - 6, 3.2, 14, Math.PI / 2);
  deckDecal(kit, 7.4, y0, z1 - 6, 3.2, 2, -Math.PI / 2);
  // side-deck walk lanes (painted) and rack numbers on the deck below each clamp gantry
  for (const sx of [-1, 1]) {
    kit.boxMM("painted", [sx * 25.6 - 0.08, y0, W.z0 - 6], [sx * 25.6 + 0.08, y0 + 0.008, W.z1 + 6], { color: lib.PALETTE.impWhite, uv: "keep" });
    for (const rz of HANGAR.rackZ) deckDecal(kit, sx * 24.2, y0, rz, 2.4, 2, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
  }
}

// ---------------------------------------------------------------- walls: human-scale band + large plates above
function walls(kit, ctx, lib, room, shell, y0) {
  const P = lib.PALETTE;
  const h = room.height;
  // 2.4 m panel band, then plate rows; the 16.8..22 m row carries a wall light 1.4 m above the catwalks
  bayWalls(kit, room, shell, y0, { rows: [2.4, 5.4, 11.2, 16.8, 22, 27.2, 32.4, h], lightRow: 3, seed: 41 });
  // bay number plates high on the walls
  for (const [dir, { frame, length }] of Object.entries(shell.frames)) {
    for (let u = length * 0.25; u < length; u += length * 0.5) {
      frame.box("painted", u, 8.6, 0.02, 3.2, 3.2, 0.06, { color: P.creamDark, uv: "keep" });
      frame.add("decal", new THREE.PlaneGeometry(2.6, 2.6), u, 8.6, 0.06, { uv: "keep", uvRect: decalRect(dir === "-x" || dir === "+x" ? 2 : 14) });
    }
  }
}

// ---------------------------------------------------------------- ceiling structure and light banks
function ceiling(kit, lib, room, yTop, T) {
  const P = lib.PALETTE;
  const { x0, x1, z0, z1 } = room;
  kit.boxMM("paintedMetal", [x0 - T, yTop, z0 - T], [x1 + T, yTop + 0.12, z1 + T], { color: P.gunmetal, uv: "world", texel: 0.5 });
  for (let z = z0 + 11; z < z1 - 1; z += 11) {
    kit.boxMM("paintedMetal", [x0, yTop - 1.2, z - 0.7], [x1, yTop, z + 0.7], { color: P.darkMetal, uv: "world", texel: 0.6 });
    kit.boxMM("paintedMetal", [x0, yTop - 1.3, z - 0.9], [x1, yTop - 1.1, z + 0.9], { color: P.gunmetal, uv: "world", texel: 0.6 });
  }
  for (const x of [-20, -9, 9, 20]) kit.boxMM("paintedMetal", [x - 0.45, yTop - 0.9, z0], [x + 0.45, yTop, z1], { color: P.darkMetal, uv: "world", texel: 0.6 });
  // light banks in four rows between the longitudinal beams
  for (const x of [-25, -14.5, 14.5, 25]) for (let z = z0 + 6; z < z1 - 3; z += 11) lightBank(kit, x, yTop, z, 7, 1.2);
  // ducts and pipe runs along the long walls
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [s * 29.6 - 0.7, yTop - 1.6, z0], [s * 29.6 + 0.7, yTop - 0.4, z1], { color: P.slate, uv: "world", texel: 0.6 });
    pipeRun(kit, s * 31.2, yTop - 1.0, (z0 + z1) / 2, z1 - z0, "z", 0.22, P.steel, 8);
    pipeRun(kit, s * 31.2, yTop - 1.7, (z0 + z1) / 2, z1 - z0, "z", 0.14, P.orange, 8);
    pipeRun(kit, s * 27.6, yTop - 0.5, (z0 + z1) / 2, z1 - z0, "z", 0.16, P.gunmetal, 8);
  }
  // transverse pipe bundles at the end bays
  for (const z of [z0 + 5, z1 - 5]) {
    pipeRun(kit, 0, yTop - 0.6, z, x1 - x0, "x", 0.2, P.steel, 8);
    pipeRun(kit, 0, yTop - 1.1, z + 0.6, x1 - x0, "x", 0.12, P.orange, 8);
  }
}

// ---------------------------------------------------------------- fighter racks: girders, trusses, clamp gantries
function racks(kit, lib, yTop) {
  const P = lib.PALETTE;
  const W = HANGAR.well;
  let idx = 0;
  for (const gx of HANGAR.rackX) {
    const side = Math.sign(gx);
    kit.boxMM("paintedMetal", [gx - 0.7, GIRDER.y0, W.z0 + 1], [gx + 0.7, GIRDER.y1, W.z1 - 1], { color: P.gunmetal, uv: "world", texel: 0.6 });
    kit.boxMM("paintedMetal", [gx - 0.95, GIRDER.y1 - 0.14, W.z0 + 1], [gx + 0.95, GIRDER.y1, W.z1 - 1], { color: P.darkMetal, uv: "world", texel: 0.6 });
    kit.boxMM("paintedMetal", [gx - 0.95, GIRDER.y0, W.z0 + 1], [gx + 0.95, GIRDER.y0 + 0.14, W.z1 - 1], { color: P.darkMetal, uv: "world", texel: 0.6 });
    for (const s of [-1, 1]) kit.boxMM("emitAmber", [gx + s * 0.78 - 0.02, GIRDER.y0 + 0.4, W.z0 + 3], [gx + s * 0.78 + 0.02, GIRDER.y0 + 0.46, W.z1 - 3], { uv: "keep" });
    for (const hz of [W.z0 + 2, W.z1 - 2]) kit.boxMM("paintedMetal", [gx - 0.5, GIRDER.y1, hz - 0.5], [gx + 0.5, yTop, hz + 0.5], { color: P.gunmetal, uv: "world", texel: 0.6 });
    for (const rz of HANGAR.rackZ) {
      // truss to the side wall (the crane end trucks pass above it)
      const xa = Math.min(gx + side * 0.7, side * 32);
      const xb = Math.max(gx + side * 0.7, side * 32);
      kit.boxMM("paintedMetal", [xa, -49.7, rz - 0.4], [xb, -49.0, rz + 0.4], { color: P.gunmetal, uv: "world", texel: 0.6 });
      kit.boxMM("paintedMetal", [xa, -49.05, rz - 0.6], [xb, -48.9, rz + 0.6], { color: P.darkMetal, uv: "world", texel: 0.6 });
      for (let x = Math.min(xa, xb) + 2; x < Math.max(xa, xb) - 1; x += 4) kit.box("metal", x, -49.35, rz, 0.16, 0.5, 0.9, { color: P.steel, texel: 1.5 });
      clampGantry(kit, lib, gx, rz, idx++);
    }
  }
}

function clampGantry(kit, lib, gx, rz, idx) {
  const P = lib.PALETTE;
  const yC = GIRDER.y0; // carriage hangs from the girder underside
  kit.box("paintedMetal", gx, yC - 0.6, rz, 2.8, 1.2, 3.2, { color: P.slate, texel: 0.8 });
  kit.box("hazard", gx, yC - 0.95, rz, 2.82, 0.25, 3.22, { uv: "world", texel: 1.5 });
  for (const s of [-1, 1]) {
    kit.box("metal", gx + s * 1.1, yC + 0.1, rz - 1.2, 0.5, 0.3, 0.5, { color: P.darkMetal });
    kit.box("metal", gx + s * 1.1, yC + 0.1, rz + 1.2, 0.5, 0.3, 0.5, { color: P.darkMetal });
  }
  // rack number plate facing the side deck
  const face = Math.sign(gx);
  const plate = new THREE.PlaneGeometry(0.9, 0.9);
  plate.rotateY(face > 0 ? Math.PI / 2 : -Math.PI / 2);
  kit.add("decal", plate, { pos: [gx + face * 1.42, yC - 0.55, rz], uv: "keep", uvRect: decalRect(idx % 2 ? 14 : 0) });
  kit.box("emitBlue", gx - face * 1.42, yC - 0.4, rz + 0.9, 0.02, 0.1, 0.5);
  kit.box("emitAmber", gx - face * 1.42, yC - 0.4, rz - 0.9, 0.02, 0.1, 0.5);
  // clamp arm beam across the wings, two vertical arms with saddle pads that grip the wing tops.
  // A parked fighter (tie.js) has its wing rims topping out at rackY + 3.96 = -54.04 and the pod at -56.
  const beamY = yC - 1.5; // -51.7
  const armBottom = HANGAR.rackY + 4.0; // -54.0: arm ends a hair above the wing rim
  kit.box("paintedMetal", gx, beamY, rz, 9.4, 0.6, 0.7, { color: P.gunmetal, texel: 0.8 });
  for (const s of [-1, 1]) {
    const ax = gx + s * 4.1;
    kit.boxMM("metal", [ax - 0.21, armBottom, rz - 0.21], [ax + 0.21, beamY, rz + 0.21], { color: P.steel, texel: 1.5 });
    kit.box("paintedMetal", ax, armBottom - 0.05, rz, 1.1, 0.5, 2.3, { color: P.darkMetal, texel: 1 });
    kit.box(BLACK, ax, armBottom - 0.35, rz, 0.95, 0.12, 2.1);
    kit.box("emitBlue", ax + s * 0.56, armBottom, rz, 0.02, 0.12, 1.6);
    // hydraulic cylinders alongside the arm
    kit.cyl("metal", ax + s * 0.4, armBottom + 1.4, rz + 0.5, 0.09, 2.6, "y", { color: P.gunmetal, segments: 8 });
    kit.cyl("metal", ax + s * 0.4, armBottom + 1.4, rz - 0.5, 0.09, 2.6, "y", { color: P.gunmetal, segments: 8 });
  }
  // centre spine clamp over the pod, umbilical hose down to the hatch on the pod's shoulder
  const spineBottom = HANGAR.rackY + 2.45; // -55.55: pad + rubber end 0.05 above the pod top
  kit.boxMM("metal", [gx - 0.275, spineBottom, rz - 0.275], [gx + 0.275, yC - 1.2, rz + 0.275], { color: P.steel, texel: 1.5 });
  kit.box("paintedMetal", gx, spineBottom - 0.15, rz, 1.5, 0.3, 1.5, { color: P.darkMetal, texel: 1 });
  kit.box(BLACK, gx, spineBottom - 0.35, rz, 1.2, 0.1, 1.2);
  const hoseBottom = HANGAR.rackY + 1.35; // pod surface at (dx 1, dz 0.8) is rackY + 1.17
  kit.boxMM(BLACK, [gx + 0.94, hoseBottom, rz + 0.74], [gx + 1.06, yC - 1.2, rz + 0.86]);
  kit.box("metal", gx + 1.0, hoseBottom - 0.1, rz + 0.8, 0.25, 0.3, 0.25, { color: P.gunmetal });
}

// ---------------------------------------------------------------- catwalks, transverse galleries, stair towers
function catwalks(kit, ctx, lib, room, y0) {
  const P = lib.PALETTE;
  const { x0, x1, z0, z1 } = room;
  const inX = 28.5;
  const outX = 31.84;
  const towerZ = { fwd: [413.5, 420.7], aft: [509.2, 516.4] };
  for (const s of [-1, 1]) {
    const xa = Math.min(s * inX, s * outX);
    const xb = Math.max(s * inX, s * outX);
    catwalkSlab(kit, lib, xa, 412, xb, 518, CAT_Y);
    // inner railing skips the stair-tower exits and the platform stair landings
    const cuts = [towerZ.fwd, towerZ.aft, ...HANGAR.rackZ.map((rz) => [rz + 1.7, rz + 3.2])].sort((a, b) => a[0] - b[0]);
    let z = 413.4;
    for (const [c0, c1] of cuts) {
      if (c0 > z + 0.3) railing(kit, s * inX, z, s * inX, c0, CAT_Y, { postEvery: 2.2, tag: "catwalkRail" });
      z = c1;
    }
    if (516.5 > z + 0.3) railing(kit, s * inX, z, s * inX, 516.5, CAT_Y, { postEvery: 2.2, tag: "catwalkRail" });
    // flood fixtures under the catwalk
    for (let fz = 418; fz <= 506; fz += 22) {
      kit.box("darkGloss", s * 30.0, CAT_Y - 0.5, fz, 2.0, 0.2, 0.7);
      kit.box("emitWhiteSoft", s * 30.0, CAT_Y - 0.61, fz, 1.8, 0.02, 0.5, { uv: "keep" });
    }
    // stair towers (inboard of the catwalk, exiting sideways onto it)
    const tx0 = s > 0 ? 25.8 : -28.4;
    const tx1 = s > 0 ? 28.4 : -25.8;
    const exit = s > 0 ? "x1" : "x0";
    const towerLight = (x, y, z) => ctx.lights.cool.push(lib.pointLight(0xdfe8ff, 14, 14, [x, y, z]));
    stairTower(kit, { x0: tx0, x1: tx1, z0: towerZ.fwd[0], z1: towerZ.fwd[1], yBottom: y0, yTop: CAT_Y, entry: "+z", exit, light: towerLight });
    stairTower(kit, { x0: tx0, x1: tx1, z0: towerZ.aft[0], z1: towerZ.aft[1], yBottom: y0, yTop: CAT_Y, entry: "-z", exit, light: towerLight });
    for (const z of [towerZ.fwd[1] + 0.9, towerZ.aft[0] - 0.9]) deckDecal(kit, (tx0 + tx1) / 2, y0, z, 1.4, 1, z < 465 ? Math.PI : 0);
  }
  // transverse galleries along the forward and aft walls
  catwalkSlab(kit, lib, x0 - 0.0, z0 + 0.16, x1 + 0.0, 413.4, CAT_Y);
  railing(kit, -25.8, 413.4, 25.8, 413.4, CAT_Y, { postEvery: 2.2, tag: "catwalkRail" });
  catwalkSlab(kit, lib, x0 - 0.0, 516.5, x1 + 0.0, z1 - 0.16, CAT_Y);
  for (const [a, b] of [[-25.8, -23.2], [-18.8, 18.8], [23.2, 25.8]]) railing(kit, a, 516.5, b, 516.5, CAT_Y, { postEvery: 2.2, tag: "catwalkRail" });
  for (const x of [-12, 12]) for (const z of [412.4, 517.6]) {
    kit.box("darkGloss", x, CAT_Y - 0.5, z, 2.0, 0.2, 0.7);
    kit.box("emitWhiteSoft", x, CAT_Y - 0.61, z, 1.8, 0.02, 0.5, { uv: "keep" });
  }
  // wall brackets under the side catwalks
  for (const s of [-1, 1]) for (let z = 414; z < 518; z += 8) {
    kit.boxMM("paintedMetal", [Math.min(s * 28.7, s * 31.9), CAT_Y - 1.0, z - 0.2], [Math.max(s * 28.7, s * 31.9), CAT_Y - 0.25, z + 0.2], { color: P.darkMetal, texel: 0.8 });
  }
}

function catwalkSlab(kit, lib, xa, za, xb, zb, y) {
  const P = lib.PALETTE;
  kit.boxMM("paintedMetal", [xa, y - 0.25, za], [xb, y - 0.03, zb], { color: P.darkMetal, uv: "world", texel: 0.8 });
  grateFloor(kit, xa + 0.05, za + 0.05, xb - 0.05, zb - 0.05, y - 0.005);
  const alongZ = zb - za > xb - xa;
  if (alongZ) {
    for (const x of [xa + 0.1, xb - 0.1]) kit.boxMM("metal", [x - 0.08, y - 0.02, za], [x + 0.08, y + 0.03, zb], { color: P.gunmetal, uv: "world", texel: 1 });
    for (let z = za + 2; z < zb; z += 4) kit.boxMM("paintedMetal", [xa, y - 0.5, z - 0.12], [xb, y - 0.25, z + 0.12], { color: P.gunmetal, texel: 1 });
  } else {
    for (const z of [za + 0.1, zb - 0.1]) kit.boxMM("metal", [xa, y - 0.02, z - 0.08], [xb, y + 0.03, z + 0.08], { color: P.gunmetal, uv: "world", texel: 1 });
    for (let x = xa + 2; x < xb; x += 4) kit.boxMM("paintedMetal", [x - 0.12, y - 0.5, za], [x + 0.12, y - 0.25, zb], { color: P.gunmetal, texel: 1 });
  }
  kit.floor(xa, za, xb, zb, y);
}

// ---------------------------------------------------------------- maintenance platforms at the racks
function platforms(kit, lib) {
  const P = lib.PALETTE;
  for (const s of [-1, 1]) {
    for (const rz of HANGAR.rackZ) {
      const xi = s * 19.8; // inner edge, 1.6 m clear of the wing tips
      const xo = s * 28.5; // meets the catwalk (2 m lower)
      const xs = s * 25.7; // stair top
      const za = rz - 3.2;
      const zb = rz + 3.2;
      const zs = rz + 1.7; // stair well: x xs..xo, z zs..zb (the stair descends outboard onto the catwalk)
      const xa = Math.min(xi, xo);
      const xb = Math.max(xi, xo);
      const sxa = Math.min(xs, xo);
      const sxb = Math.max(xs, xo);
      // plate in two pieces around the stair well, grating on top
      kit.boxMM("paintedMetal", [xa, PLAT_Y - 0.16, za], [xb, PLAT_Y, zs], { color: P.gunmetal, uv: "world", texel: 0.8 });
      kit.boxMM("paintedMetal", [Math.min(xi, xs), PLAT_Y - 0.16, zs], [Math.max(xi, xs), PLAT_Y, zb], { color: P.gunmetal, uv: "world", texel: 0.8 });
      grateFloor(kit, xa + 0.05, za + 0.05, xb - 0.05, zs - 0.02, PLAT_Y + 0.004);
      grateFloor(kit, Math.min(xi, xs) + 0.05, zs - 0.02, Math.max(xi, xs) - 0.05, zb - 0.05, PLAT_Y + 0.004);
      hazardBand(kit, xi, za, xi + s * 0.3, zb, PLAT_Y + 0.006);
      kit.floor(Math.min(xi, xs), za, Math.max(xi, xs), zb, PLAT_Y);
      kit.floor(sxa, za, sxb, zs, PLAT_Y);
      kit.stairs("paintedMetal", sxa, zs, sxb, zb, s > 0 ? PLAT_Y : CAT_Y, s > 0 ? CAT_Y : PLAT_Y, "x", { color: P.slate });
      // rails: inner edge, forward edge, aft edge up to the stair, outer edge beside the stair, stair-side edge
      railing(kit, xi, za, xi, zb, PLAT_Y, { postEvery: 1.6, tag: "platRail" });
      railing(kit, xi, za, xo, za, PLAT_Y, { postEvery: 1.6, tag: "platRail" });
      railing(kit, xi, zb, xs, zb, PLAT_Y, { postEvery: 1.6, tag: "platRail" });
      railing(kit, xo, za, xo, zs, PLAT_Y, { postEvery: 1.6, tag: "platRail" });
      railing(kit, xs, zs, xo, zs, PLAT_Y, { postEvery: 1.4, tag: "platRail" });
      // nobody walks into the void under the plate from the stair; the aft side of the stair is railed
      kit.collider([sxa, CAT_Y, za], [sxb, PLAT_Y - 0.01, zs], "platVoid");
      kit.collider([sxa - 0.03, CAT_Y, zb - 0.03], [sxb + 0.03, PLAT_Y + RAIL_H, zb + 0.03], "platRail");
      grateScreen(kit, sxa, zs, sxb, zs, CAT_Y, PLAT_Y - 0.16);
      const L = Math.hypot(sxb - sxa, PLAT_Y - CAT_Y);
      const slope = -s * Math.atan2(PLAT_Y - CAT_Y, sxb - sxa); // +x end lower on starboard, higher on port
      kit.add("metal", new THREE.BoxGeometry(L, 0.05, 0.05), { pos: [(sxa + sxb) / 2, (PLAT_Y + CAT_Y) / 2 + 0.95, zb], rot: [0, 0, slope], color: P.steel, uv: "scale", uvScale: [4, 1] });
      for (const x of [sxa + 0.3, sxb - 0.3]) {
        const yBase = (x < (sxa + sxb) / 2) === (s > 0) ? PLAT_Y : CAT_Y;
        kit.box("metal", x, yBase + 0.5, zb, 0.06, 1.0, 0.06, { color: P.gunmetal });
      }
      // supports: cantilever beams from the wall (under the plate, clear of the stair well) with knee braces
      for (const z of [rz - 2.6, rz + 1.2]) {
        kit.boxMM("paintedMetal", [Math.min(xi, s * 31.9), PLAT_Y - 0.7, z - 0.2], [Math.max(xi, s * 31.9), PLAT_Y - 0.16, z + 0.2], { color: P.darkMetal, uv: "world", texel: 0.8 });
        const bx0 = s * 31.9;
        const bx1 = xi + s * 1.0;
        const dy = 2.4;
        const L = Math.hypot(bx1 - bx0, dy);
        kit.add("paintedMetal", new THREE.BoxGeometry(L, 0.24, 0.24), { pos: [(bx0 + bx1) / 2, PLAT_Y - 0.7 - dy / 2, z], rot: [0, 0, -s * Math.atan2(dy, Math.abs(bx1 - bx0))], color: P.darkMetal, uv: "scale", uvScale: [6, 1] });
      }
      // work lamp and a tool locker on each platform
      kit.box("metal", xi + s * 0.6, PLAT_Y + 1.5, rz, 0.08, 3.0, 0.08, { color: P.gunmetal });
      kit.box("darkGloss", xi + s * 0.6, PLAT_Y + 3.0, rz, 0.4, 0.2, 1.4);
      kit.box("emitWhiteSoft", xi + s * 0.6, PLAT_Y + 2.89, rz, 0.3, 0.02, 1.2, { uv: "keep" });
      const f = propFrame(kit, xo - s * 1.2, PLAT_Y, rz - 2.2, s > 0 ? -Math.PI / 2 : Math.PI / 2);
      cabinet(kit, f, { w: 1.0, h: 1.6, d: 0.5, screen: "screen6" });
    }
  }
}

// ---------------------------------------------------------------- refuelling / repair stations along the side decks
function stations(kit, ctx, lib, y0) {
  const P = lib.PALETTE;
  const wallX = 32;
  // [side, z, kind]
  const plan = [
    [-1, 430, "fuel"], [-1, 447, "repair"], [-1, 464, "fuel"], [-1, 492, "repair"],
    [1, 430, "repair"], [1, 446, "fuel"], [1, 472, "fuel"], [1, 490, "repair"],
  ];
  for (const [s, z, kind] of plan) {
    const face = s > 0 ? -Math.PI / 2 : Math.PI / 2; // props face the well
    // zone outline on the deck
    const zx0 = s * 26.2;
    const zx1 = s * 31.4;
    deckStrip(kit, "emitAmber", Math.min(zx0, zx1), z - 4.5, Math.max(zx0, zx1), z - 4.38, y0);
    deckStrip(kit, "emitAmber", Math.min(zx0, zx1), z + 4.38, Math.max(zx0, zx1), z + 4.5, y0);
    deckStrip(kit, "emitAmber", zx0 - 0.06, z - 4.5, zx0 + 0.06, z + 4.5, y0);
    if (kind === "fuel") {
      fuelBowser(kit, propFrame(kit, s * 28.6, y0, z - 1.6, face), { hoseTo: [-2.4, 0, 3.6] });
      toolCart(kit, propFrame(kit, s * 29.6, y0, z + 2.4, face + 0.4));
      crate(kit, propFrame(kit, s * 27.2, y0, z + 3.2, face), { decal: 5 });
      // fuel manifold on the wall with valves and a warning plate
      kit.box("darkGloss", s * (wallX - 0.25), y0 + 1.3, z, 0.5, 2.0, 2.4);
      for (let i = 0; i < 4; i++) {
        kit.cyl("metal", s * (wallX - 0.6), y0 + 0.9 + i * 0.35, z - 0.8 + i * 0.5, 0.08, 0.7, "x", { color: i % 2 ? P.orange : P.steel, segments: 8 });
        kit.box("metal", s * (wallX - 0.95), y0 + 0.9 + i * 0.35, z - 0.8 + i * 0.5, 0.2, 0.2, 0.2, { color: P.gunmetal });
      }
      kit.box("screen6", s * (wallX - 0.51), y0 + 1.9, z, 0.01, 0.35, 1.4, { uv: "keep" });
      kit.box("emitAmber", s * (wallX - 0.51), y0 + 2.25, z - 0.9, 0.01, 0.08, 0.3);
      ctx.lights.warm.push(lib.pointLight(0xffb347, 12, 14, [s * 28.4, y0 + 3.2, z]));
      // amber work lamp on a mast
      kit.box("metal", s * 30.8, y0 + 2.0, z - 3.6, 0.1, 4.0, 0.1, { color: P.gunmetal });
      kit.box("darkGloss", s * 30.6, y0 + 4.0, z - 3.6, 0.6, 0.3, 0.3);
      kit.box("emitAmber", s * 30.6, y0 + 3.84, z - 3.6, 0.5, 0.02, 0.2, { uv: "keep" });
    } else {
      pedestalConsole(kit, propFrame(kit, s * 27.4, y0, z - 2.6, face), "screen6");
      toolCart(kit, propFrame(kit, s * 29.2, y0, z - 3.4, face - 0.3));
      toolCart(kit, propFrame(kit, s * 28.4, y0, z + 1.2, face + 0.2));
      const cf = propFrame(kit, s * 30.4, y0, z + 3.0, face);
      crate(kit, cf, { decal: 6 });
      crate(kit, propFrame(kit, s * 30.4, y0 + 0.8, z + 3.0, face + 0.1), { decal: 11, h: 0.7 });
      crate(kit, propFrame(kit, s * 28.8, y0, z + 3.4, face), { w: 0.9, d: 0.9, h: 0.9, decal: 9 });
      cabinet(kit, propFrame(kit, s * (wallX - 0.35), y0, z - 1.2, face), { screen: "screen6" });
      cabinet(kit, propFrame(kit, s * (wallX - 0.35), y0, z + 0.2, face), { screen: null, color: P.slate });
      // parts rack: shelves with wing spars and canisters
      kit.box("metal", s * (wallX - 0.5), y0 + 1.1, z + 2.6, 0.9, 2.2, 1.8, { color: P.gunmetal, texel: 1 });
      for (let i = 0; i < 3; i++) kit.box("painted1", s * (wallX - 0.5), y0 + 0.5 + i * 0.7, z + 2.6, 0.86, 0.05, 1.7, { color: P.impGrey, uv: "world", texel: 1 });
      for (let i = 0; i < 3; i++) kit.cyl("metal", s * (wallX - 0.5), y0 + 0.75 + i * 0.7, z + 2.2 + i * 0.3, 0.14, 0.7, "z", { color: i === 1 ? P.orange : P.steel, segments: 10 });
      kit.collider([Math.min(s * (wallX - 0.95), s * wallX), y0, z + 1.7], [Math.max(s * (wallX - 0.95), s * wallX), y0 + 2.2, z + 3.5], "rack");
      lib.wallLightBar(propFrame(kit, s * (wallX - 0.02), y0, z, face), -3.6, 3.6, 2.9);
      ctx.lights.warm.push(lib.pointLight(0xffc880, 10, 12, [s * 29.0, y0 + 3.0, z]));
    }
  }
}

// ---------------------------------------------------------------- forward deck (containers, tug bay)
function forwardDeck(kit, lib, y0) {
  const P = lib.PALETTE;
  containerStack(kit, propFrame(kit, -14.5, y0, 421, Math.PI / 2), 6, 2, 2, 5, { open: true });
  containerStack(kit, propFrame(kit, -8.4, y0, 424, Math.PI / 2), 6, 1, 2, 9);
  // starboard forward: drum store, crates and a parts pallet
  for (let i = 0; i < 6; i++) {
    const x = 9 + (i % 3) * 1.1;
    const z = 415 + Math.floor(i / 3) * 1.1;
    kit.cyl("painted2", x, y0 + 0.6, z, 0.45, 1.2, "y", { color: i % 2 ? P.impGreyDark : P.orange, segments: 14, uv: "world", texel: 1 });
    kit.cyl("metal", x, y0 + 1.22, z, 0.42, 0.04, "y", { color: P.steel, segments: 14 });
  }
  kit.collider([8.4, y0, 414.4], [11.8, y0 + 1.25, 416.7], "drums");
  for (let i = 0; i < 4; i++) crate(kit, propFrame(kit, 14 + (i % 2) * 1.4, y0 + Math.floor(i / 2) * 0.8, 416, 0), { decal: [6, 11, 9, 5][i] });
  toolCart(kit, propFrame(kit, 10.5, y0, 421, 0.3));
  toolCart(kit, propFrame(kit, 18.2, y0, 421.5, -1.2));
  // tug / loader vehicle parked by the lane, clear of the well railing
  loaderVehicle(kit, propFrame(kit, 15, y0, 425.4, Math.PI));
  deckDecal(kit, 11.8, y0, 424.5, 1.6, 7, Math.PI);
}

// ---------------------------------------------------------------- aft deck: control cab, cargo lifts, container stacks
function aftDeck(kit, ctx, lib, y0, mats) {
  const P = lib.PALETTE;
  controlCab(kit, ctx, lib, y0);
  // cargo lifts up to the aft gallery, docking at z 516.5
  for (const s of [-1, 1]) {
    const lx0 = s > 0 ? 19 : -23;
    const lx1 = s > 0 ? 23 : -19;
    const lift = cargoLift(kit, ctx, mats, { x0: lx0, x1: lx1, z0: 512, z1: 516.5, yLow: y0, yHigh: CAT_Y, period: 48, dwell: 10, phase: s > 0 ? 0 : 24, openSides: ["-z", "+z"], frameSide: s > 0 ? "+x" : "-x", name: "hangar.cargoLift" + (s > 0 ? "S" : "P") });
    // gallery gate: closed unless the platform is docked at the top
    const gate = kit.collider([lx0, CAT_Y, 516.4], [lx1, CAT_Y + 1.2, 516.6], "liftGate");
    const base = lift.update;
    lift.update = (dt) => {
      base(dt);
      gate.disabled = lift.state.y > CAT_Y - 0.25;
    };
    deckDecal(kit, (lx0 + lx1) / 2, y0, 509.5, 1.8, 1, 0);
  }
  // container stacks between the recovery lane and the port cargo lift
  containerStack(kit, propFrame(kit, -13, y0, 508.4, Math.PI / 2), 6, 2, 2, 13, { open: true });
  containerStack(kit, propFrame(kit, -13.5, y0, 514.5, Math.PI / 2), 6, 1, 1, 17);
  for (let i = 0; i < 3; i++) crate(kit, propFrame(kit, -26 + i * 1.4, y0, 505.5, 0.1 * i), { decal: [11, 6, 9][i] });
  toolCart(kit, propFrame(kit, -21, y0, 505.5, 0.6));
}

function controlCab(kit, ctx, lib, y0) {
  const P = lib.PALETTE;
  const cx0 = 7;
  const cx1 = 15.2;
  const cz0 = 504.5;
  const cz1 = 510.7;
  const fy = y0 + 6; // cab floor
  const roofY = fy + 3.0;
  // pedestal core and corner columns
  kit.boxMM("paintedMetal", [9, y0, 506], [13.2, fy - 0.3, 509.2], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.collider([9, y0, 506], [13.2, fy, 509.2], "cabCore");
  for (let y = y0 + 0.8; y < fy - 1; y += 1.4) kit.box("metal", 9.0, y, 507.6, 0.06, 0.5, 2.6, { color: P.darkMetal, texel: 1 });
  kit.box("darkGloss", 11.1, y0 + 1.1, 505.98, 1.2, 2.2, 0.06);
  kit.box("emitBlue", 11.7, y0 + 1.6, 505.95, 0.06, 0.4, 0.02);
  for (const [px, pz] of [[cx0 + 0.3, cz0 + 0.3], [cx1 - 0.3, cz0 + 0.3], [cx0 + 0.3, cz1 - 0.3], [cx1 - 0.3, cz1 - 0.3]]) {
    kit.boxMM("paintedMetal", [px - 0.3, y0, pz - 0.3], [px + 0.3, fy, pz + 0.3], { color: P.darkMetal, uv: "world", texel: 0.8 });
    kit.collider([px - 0.3, y0, pz - 0.3], [px + 0.3, fy, pz + 0.3], "cabColumn");
  }
  // under-cab work lights
  for (const x of [8.5, 13.7]) {
    kit.box("darkGloss", x, fy - 0.45, 507.6, 0.5, 0.15, 3.0);
    kit.box("emitWhiteSoft", x, fy - 0.53, 507.6, 0.4, 0.02, 2.8, { uv: "keep" });
  }
  // floor, parapet, glazing, roof
  kit.boxMM("paintedMetal", [cx0, fy - 0.3, cz0], [cx1, fy, cz1], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("deck", [cx0 + 0.2, fy, cz0 + 0.2], [cx1 - 0.2, fy + 0.012, cz1 - 0.2], { color: P.impGreyDark, uv: "world", texel: 1 });
  kit.floor(cx0, cz0, cx1, cz1, fy);
  const par = 1.1;
  const wallsCab = [
    ["-z", [cx0, cz0 - 0.1], [cx1, cz0 + 0.1]],
    ["+z", [cx0, cz1 - 0.1], [cx1, cz1 + 0.1]],
    ["-x", [cx0 - 0.1, cz0], [cx0 + 0.1, cz1]],
    ["+x", [cx1 - 0.1, cz0], [cx1 + 0.1, 509.2]], // open to the stair landing at z 509.2..510.7
  ];
  for (const [dir, a, b] of wallsCab) {
    kit.boxMM("painted1", [a[0], fy, a[1]], [b[0], fy + par, b[1]], { color: P.impGreyDark, uv: "world", texel: 1 });
    kit.boxMM("darkGloss", [a[0] - 0.02, fy + par, a[1] - 0.02], [b[0] + 0.02, fy + par + 0.08, b[1] + 0.02]);
    if (dir === "+z" || dir === "+x") kit.boxMM("painted1", [a[0], fy + par, a[1]], [b[0], roofY, b[1]], { color: P.impGreyDark, uv: "world", texel: 1 });
    else {
      // glass with mullions
      kit.boxMM("glass", [a[0] + 0.09, fy + par + 0.08, a[1] + 0.09], [b[0] - 0.09, roofY, b[1] - 0.09], { uv: "keep" });
      const alongX = dir === "-z" || dir === "+z";
      const len = alongX ? b[0] - a[0] : b[1] - a[1];
      const n = Math.max(1, Math.round(len / 2.1));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        if (alongX) kit.boxMM("darkGloss", [a[0] + len * t - 0.05, fy + par, a[1]], [a[0] + len * t + 0.05, roofY, b[1]]);
        else kit.boxMM("darkGloss", [a[0], fy + par, a[1] + len * t - 0.05], [b[0], roofY, a[1] + len * t + 0.05]);
      }
    }
    kit.collider([a[0], fy, a[1]], [b[0], roofY, b[1]], "cabWall");
  }
  kit.boxMM("paintedMetal", [cx0 - 0.5, roofY, cz0 - 0.5], [cx1 + 0.5, roofY + 0.3, cz1 + 0.5], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("emitAmber", [cx0 - 0.45, roofY + 0.1, cz0 - 0.52], [cx1 + 0.45, roofY + 0.18, cz0 - 0.5], { uv: "keep" });
  kit.boxMM("emitAmber", [cx0 - 0.52, roofY + 0.1, cz0 - 0.45], [cx0 - 0.5, roofY + 0.18, cz1 + 0.45], { uv: "keep" });
  kit.boxMM("darkGloss", [cx0 + 1, roofY - 0.12, cz0 + 1], [cx1 - 1, roofY, cz1 - 1]);
  kit.boxMM("emitWhiteSoft", [cx0 + 1.2, roofY - 0.14, cz0 + 1.2], [cx1 - 1.2, roofY - 0.12, cz1 - 1.2], { uv: "keep" });
  // sensor mast and dish on the roof
  kit.box("metal", 8.2, roofY + 1.6, 509.6, 0.12, 2.6, 0.12, { color: P.gunmetal });
  kit.cyl("metal", 8.2, roofY + 2.9, 509.6, 0.5, 0.1, "y", { color: P.steel, segments: 12 });
  // consoles facing the well, equipment rack at the back, seats
  for (const x of [8.6, 10.2, 11.8, 13.4]) pedestalConsole(kit, propFrame(kit, x, fy, cz0 + 0.95, 0), "screen6", { w: 1.5 });
  for (const x of [8.6, 10.2, 11.8, 13.4]) {
    kit.box("darkGloss", x, fy + 0.5, cz0 + 1.9, 0.5, 0.1, 0.5);
    kit.box("darkGloss", x, fy + 0.3, cz0 + 1.9, 0.12, 0.4, 0.12);
    kit.box("darkGloss", x, fy + 0.8, cz0 + 2.12, 0.5, 0.5, 0.08);
  }
  cabinet(kit, propFrame(kit, 8.6, fy, cz1 - 0.42, Math.PI), { w: 2.6, h: 2.6, d: 0.6, screen: "screen6" });
  cabinet(kit, propFrame(kit, 12.4, fy, cz1 - 0.42, Math.PI), { w: 2.6, h: 2.6, d: 0.6, screen: "screen6" });
  pedestalConsole(kit, propFrame(kit, cx0 + 0.75, fy, 507.6, Math.PI / 2), "screen6", { w: 1.6 });
  ctx.lights.cool.push(lib.pointLight(0xfff0dd, 8, 10, [11.1, roofY - 0.4, 507.6]));
  // access stair tower (2 flights, exits through its x0 face onto the cab floor)
  stairTower(kit, { x0: cx1, x1: cx1 + 2.6, z0: cz0, z1: cz1, yBottom: y0, yTop: fy, entry: "+z", exit: "x0", flights: 2, light: null });
  deckDecal(kit, cx1 + 1.3, y0, cz1 + 1.0, 1.4, 3, 0);
}

// ---------------------------------------------------------------- light fixtures
function lights(ctx, lib, y0) {
  const cool = (i, d, p, c = 0xdfe8ff) => ctx.lights.cool.push(lib.pointLight(c, i, d, p));
  // The bay is 64 x 110 x 38 m and the pool only ever runs ~14 point lights: few, strong, long-reach
  // floods under the side catwalks so the far side of the bay stays lit from wherever the player stands.
  // (inverse-square: a 17 m drop to the deck needs ~600 cd for a lit deck, so these are big numbers)
  for (const s of [-1, 1]) for (const z of [424, 452, 480, 508]) cool(1000, 110, [s * 25, CAT_Y - 1.0, z]);
  for (const z of [412.5, 517.5]) cool(560, 80, [0, CAT_Y - 1.0, z]);
  // rack lights on the girder undersides: the parked fighters and the well mouth below them
  for (const s of [-1, 1]) for (const z of [448, 480]) cool(420, 70, [s * 14, GIRDER.y0 - 0.6, z], 0xe6eeff);
  // tractor glow: blue lights hovering in the beams above the well mouth
  for (const z of [448.5, 470.5, 492.5]) ctx.lights.teal.push(lib.pointLight(0x66b6ff, 170, 60, [0, -70, z]));
  // one shadowed flood from the starboard girder down onto the starboard side deck (catwalk, platform and
  // stair tower throw the shadows). Every pooled spot is a full shadow pass over the zone, so this is the
  // only spot fixture in the bay; its range (distance x 1.6 in the pool) stops short of the cargo bay and the
  // shuttle dock so it does not switch on (and render its shadow map) while the player is in those rooms.
  const sp = new THREE.SpotLight(0xe8f0ff, 2600 * lib.LIGHT_SCALE, 48, 0.62, 0.5, 1.8);
  sp.position.set(13, GIRDER.y0 - 0.4, 465);
  sp.target.position.set(27, y0, 465);
  sp.shadow.camera.near = 2;
  sp.shadow.camera.far = 50;
  sp.shadow.bias = -0.0004;
  sp.shadow.normalBias = 0.05;
  ctx.lights.spots.push(sp);
}

// ---------------------------------------------------------------- moving machinery
function dynamics(kit, ctx, mats, y0, yTop, W) {
  const P = ctx.lib.PALETTE;
  // crane rails along the long walls
  for (const s of [-1, 1]) {
    kit.boxMM("metal", [Math.min(s * 31.0, s * 31.6), CRANE_Y - 1.9, W.z0 + 1], [Math.max(s * 31.0, s * 31.6), CRANE_Y - 1.6, W.z1 - 1], { color: P.steel, uv: "world", texel: 1 });
    for (let z = W.z0 + 4; z < W.z1; z += 8) kit.boxMM("paintedMetal", [Math.min(s * 30.6, s * 32), CRANE_Y - 2.5, z - 0.3], [Math.max(s * 30.6, s * 32), CRANE_Y - 1.9, z + 0.3], { color: P.darkMetal, texel: 0.8 });
  }
  gantryCrane(ctx, mats, { x0: -31.0, x1: 31.0, y: CRANE_Y, zMin: W.z0 + 10, zMax: W.z1 - 10, trolleyRange: [-7.5, 7.5], hookDrop: 7, load: true, speed: 0.6, name: "hangar.crane" });
  blastLeaves(ctx, mats, { well: W, y: y0 - 0.95, thickness: 0.9, protrude: 1.0, travel: 0.6, period: 34 });
  tractorEmitters(kit, ctx, { positions: [[-4.5, 448.5], [4.5, 448.5], [-4.5, 470.5], [4.5, 470.5], [-4.5, 492.5], [4.5, 492.5]], yCeil: yTop, yTarget: y0 - 1.6, radius: 4.2 });
  const rx = W.x1 + 2.3;
  beacons(kit, ctx, mats, [
    [-rx, y0, W.z0 - 2.0, 3.0], [rx, y0, W.z0 - 2.0, 3.0], [-rx, y0, W.z1 + 2.0, 3.0], [rx, y0, W.z1 + 2.0, 3.0],
    [-4.9, y0, W.z0 - 1.9, 1.6], [4.9, y0, W.z0 - 1.9, 1.6], [-4.9, y0, W.z1 + 1.9, 1.6], [4.9, y0, W.z1 + 1.9, 1.6],
    [14.6, y0 + 9.3, 505.0, 0.4],
  ]);
}
