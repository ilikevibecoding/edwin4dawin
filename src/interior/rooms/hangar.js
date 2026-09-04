// Main hangar: a 64 x 110 x 38 m bay on the belly with the launch / recovery well open to space in the
// middle of the deck. Fighters (src/hangar/traffic.js) hang in clamp racks under two overhead girders, drop
// straight through the well and are pulled back by the tractor emitters on the ceiling. Around the well: a
// shaft-lined opening with a raised lip, rim lights and the stowed blast leaves; railed deck with lane
// markings and stencils; a kit-bashed fighter on a maintenance cradle on the port deck and another hanging
// from the drop-rail launch cradle over the well; refuelling and repair stations along the side decks;
// catwalks at y -62 with switchback stair towers and the glazed flight-control cab over the starboard deck;
// maintenance platforms at the racks; the traffic-control cab and cargo lifts on the aft deck; a travelling
// gantry crane under a dark trussed ceiling with recessed light banks.
import * as THREE from "three";
import { HANGAR, CORRIDORS, roomFloorY } from "../../config/shipSpec.js";
import { decalRect } from "../../textures.js";
import {
  propFrame, railing, deckStrip, hazardBand, deckDecal, grateFloor, grateScreen, bayWalls, containerStack,
  crate, toolCart, fuelBowser, pedestalConsole, cabinet, lightBar, recessedBank, floodFixture, truss, cableTray, pallet,
  pipeRun, stairTower, gantryCrane, blastLeaves, beacons, tractorEmitters, cargoLift, loaderVehicle, shadowCasters,
  RAIL_H, BLACK, ensureLabels, ensureDiffuser, frameLabel, deckLabel, launchCradle, doorSurround, wellShaft,
  shimmerSheet, tieCradle, tieShape, ladder, displayWall, glassCab, clampRack, corridorPortal,
} from "../../hangar/machinery.js";

const CAT_Y = -62; // service catwalks
const PLAT_Y = -60; // maintenance platforms beside the racks
const GIRDER = { y0: -50.2, y1: -48.6 }; // rack girders
const CRANE_Y = -46.8; // crane bridge centre
const RAIL = { y: -69.7, z: 466, x: -4 }; // launch-cradle drop rail (underside, z between the rack rows 456 / 472), carriage start
const CAB = { x0: 21.5, x1: 28.5, z0: 460, z1: 468 }; // flight-control cab on the starboard catwalk
// traffic.js parks its craft in racks 0..5 (createTraffic count 6, racks ordered z-major then x); the two
// aft racks stay free, so static kit fighters hang there "under maintenance"
const STATIC_RACKS = [6, 7];
const UP = new THREE.Vector3(0, 1, 0);

export function build(kit, ctx, room, lib) {
  const mats = ctx.materials;
  const y0 = roomFloorY(room);
  const yTop = y0 + room.height;
  const W = HANGAR.well;
  const T = lib.WALL_T;
  ensureLabels(mats);
  ensureDiffuser(mats);

  const shell = lib.roomShell(kit, ctx, room, { style: "dark", floor: false, ceiling: false, lights: false, skipWalls: ["-z", "+z", "-x", "+x"] });
  // only the structural plate material throws shadows (catwalks, platforms, stair towers, girders, cabs)
  shadowCasters(kit, ["paintedMetal"]);

  deck(kit, lib, room, y0, W, T);
  wellShaft(kit, W, y0);
  wellEdge(kit, lib, y0, W);
  markings(kit, lib, y0, W, room.z0, room.z1);
  walls(kit, ctx, lib, room, shell, y0);
  ceiling(kit, lib, room, yTop, T);
  racks(kit, lib, yTop);
  catwalks(kit, ctx, lib, room, y0);
  platforms(kit, lib);
  flightControl(kit, ctx, lib);
  stations(kit, ctx, lib, y0);
  cradleBay(kit, ctx, lib, y0);
  forwardDeck(kit, lib, y0);
  aftDeck(kit, ctx, lib, y0, mats);
  lights(ctx, lib, y0, yTop);
  dynamics(kit, ctx, mats, y0, yTop, W);
  return shell;
}

// ---------------------------------------------------------------- deck with the open well
function deck(kit, lib, room, y0, W, T) {
  const P = lib.PALETTE;
  const { x0, x1, z0, z1 } = room;
  // slabs stop 0.3 m short of the opening: the shaft lip cap covers the joint and the exterior curb
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
  const rx = W.x1 + 0.85; // rail line just outside the shaft lip
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
  // gap barriers: hazard posts with lamps (the shaft lip's own collider stops anyone at the edge)
  for (const z of [W.z0, W.z1]) {
    const dz = z < 465 ? -1.05 : 1.05;
    for (const sx of [-1, 1]) {
      kit.box("hazard", sx * (gap + 0.15), y0 + 0.55, z + dz, 0.3, 1.1, 0.3, { uv: "world", texel: 1.5 });
      kit.box("emitAmber", sx * (gap + 0.15), y0 + 1.2, z + dz, 0.2, 0.12, 0.2);
      kit.collider([sx * (gap + 0.15) - 0.15, y0, z + dz - 0.15], [sx * (gap + 0.15) + 0.15, y0 + 1.3, z + dz + 0.15], "gapPost");
    }
    kit.boxMM("emitAmber", [-gap, y0 + 0.43, z + dz - 0.1], [gap, y0 + 0.445, z + dz + 0.1], { uv: "keep" });
  }
  // the amber limit line around the well (the shaft lip carries the hazard chevrons: a second striped band
  // outside the railing made the whole edge one 2 m orange slab from anywhere near it)
  const ly = rx + 1.6;
  deckStrip(kit, "emitAmber", -ly - 0.08, rz0 - 1.6, -ly + 0.08, rz1 + 1.6, y0);
  deckStrip(kit, "emitAmber", ly - 0.08, rz0 - 1.6, ly + 0.08, rz1 + 1.6, y0);
  deckStrip(kit, "emitAmber", -ly, rz0 - 1.68, ly, rz0 - 1.52, y0);
  deckStrip(kit, "emitAmber", -ly, rz1 + 1.52, ly, rz1 + 1.68, y0);
  // "mind the gap" stencils at the lane openings, "no step" at the corners, DANGER stencils along both edges.
  // Deck text is read by someone walking up to the well: yaw 0 puts the top of the letters toward -z (reader
  // faces -z), PI toward +z, PI/2 toward -x (starboard reader), -PI/2 toward +x (port reader).
  deckDecal(kit, 0, y0, W.z0 - 2.6, 2.2, 15, Math.PI);
  deckDecal(kit, 0, y0, W.z1 + 2.6, 2.2, 15, 0);
  for (const sx of [-1, 1]) for (const z of [rz0 - 2.4, rz1 + 2.4]) deckDecal(kit, sx * (rx + 1.2), y0, z, 1.6, 7, sx * Math.PI / 2);
  for (const sx of [-1, 1]) for (const z of [440, 458, 478, 496]) deckLabel(kit, sx * (rx + 2.6), y0, z, 4.5, 16, sx * Math.PI / 2);
}

// ---------------------------------------------------------------- lane markings and stencils
function markings(kit, lib, y0, W, z0, z1) {
  // launch lane: white edge lines and centre dashes from the shuttle-bay door to the forward well opening
  for (const sx of [-1, 1]) deckStrip(kit, "emitWhiteSoft", sx * 5.0 - 0.08, z0 + 1.8, sx * 5.0 + 0.08, W.z0 - 2.4, y0);
  for (let z = z0 + 3.5; z < W.z0 - 4; z += 3) deckStrip(kit, "emitWhiteSoft", -0.15, z, 0.15, z + 1.4, y0);
  // (read walking in from the shuttle dock door, i.e. facing +z)
  deckLabel(kit, 0, y0, z0 + 9, 7, 4, Math.PI);
  deckDecal(kit, -7.4, y0, z0 + 6, 3.2, 0, Math.PI);
  deckDecal(kit, 7.4, y0, z0 + 6, 3.2, 2, Math.PI);
  // recovery lane: amber (read walking in from the cargo bay door, facing -z)
  for (const sx of [-1, 1]) deckStrip(kit, "emitAmber", sx * 5.0 - 0.08, W.z1 + 2.4, sx * 5.0 + 0.08, z1 - 1.8, y0);
  for (let z = W.z1 + 4; z < z1 - 3.5; z += 3) deckStrip(kit, "emitAmber", -0.15, z, 0.15, z + 1.4, y0);
  deckLabel(kit, 0, y0, z1 - 9, 7, 5, 0);
  deckDecal(kit, -7.4, y0, z1 - 6, 3.2, 14, 0);
  deckDecal(kit, 7.4, y0, z1 - 6, 3.2, 2, 0);
  // side-deck walk lanes (painted; the port lane stops at the cradle bay) and rack numbers on the deck
  // (read from the side decks facing the well)
  for (const sx of [-1, 1]) {
    const spans = sx > 0 ? [[W.z0 - 6, W.z1 + 6]] : [[W.z0 - 6, 464.5], [476, W.z1 + 6]];
    for (const [za, zb] of spans) kit.boxMM("painted", [sx * 25.6 - 0.08, y0, za], [sx * 25.6 + 0.08, y0 + 0.008, zb], { color: lib.PALETTE.impWhite, uv: "keep" });
    HANGAR.rackZ.forEach((rz, i) => deckLabel(kit, sx * 24.6, y0, rz, 3.6, 8 + i * 2 + (sx > 0 ? 1 : 0), sx * Math.PI / 2));
  }
}

// ---------------------------------------------------------------- walls: human-scale band + designed plate rows
function walls(kit, ctx, lib, room, shell, y0) {
  const h = room.height;
  // 2.4 m panel band, then plate rows with one feature each (access plates, conduits, a light row 1.4 m above
  // the catwalks, vents high up) so every wall reads as one designed elevation
  bayWalls(kit, room, shell, y0, {
    rows: [2.4, 5.4, 11.2, 16.8, 22, 27.2, 32.4, h], lightRow: 3, seed: 41, lightMat: "emitDiffuser",
    rowStyles: ["bays", "plate", "conduit", "plain", "plain", "vent", "plain"], pilasterW: 0.8, pilasterDepth: 0.36,
  });
  // deck name high on both long walls, bay numbers over the side decks
  for (const dir of ["-x", "+x"]) {
    const { frame, length } = shell.frames[dir];
    for (const u of [length * 0.22, length * 0.78]) {
      frame.box(BLACK, u, 8.6, 0.02, 8.6, 8.6 / 5 + 0.3, 0.05);
      frameLabel(frame, u, 8.6, 8.2, 0, 0.06);
    }
    frame.box("painted", length * 0.5, 24.6, 0.03, 3.2, 3.2, 0.06, { color: lib.PALETTE.creamDark, uv: "keep" });
    frame.add("decal", new THREE.PlaneGeometry(2.6, 2.6), length * 0.5, 24.6, 0.07, { uv: "keep", uvRect: decalRect(2) });
  }
  // blast-door surrounds on the three bay doors, a lighter one on the lift-corridor door
  const [lift, maint, shuttle, cargo] = room.doors;
  doorSurround(kit, room, maint, y0, { label: 1, labelW: 4.5 });
  doorSurround(kit, room, shuttle, y0, { label: 2, labelW: 5 });
  doorSurround(kit, room, cargo, y0, { label: 3, labelW: 5 });
  doorSurround(kit, room, lift, y0, { label: 0, labelW: 3.2 });
  // the same door from the lift corridor: its leaves fill the 3 m corridor end wall, so the corridor side
  // gets pilasters on the side walls, a labelled lintel and lamps (the leaves are the DoorSystem's)
  const liftCorridor = CORRIDORS.find((c) => c.id === "D-lift2");
  if (liftCorridor) corridorPortal(kit, room, lift, y0, liftCorridor, { label: 0 });
  // crew ready room: a closed door beside the lift corridor
  doorSurround(kit, room, [-32, 485.5, 2.6, "-x", 3.0], y0, { label: 7, labelW: 2.4, leaf: true });
  // traffic display beside the ready room, deck status display on the starboard wall by the maintenance door
  displayWall(shell.frames["-x"].frame, room.z1 - 490.5, 4.2, 5.2, 2.2, ["screen7", "screen8", "screen9", "screen10"], 19, { cols: 2 });
  displayWall(shell.frames["+x"].frame, 452 - room.z0, 4.2, 4.2, 2.0, ["screen9", "screen7"], 6, { cols: 2 });
}

// ---------------------------------------------------------------- ceiling: dark plate, trusses, trays, recessed banks
function ceiling(kit, lib, room, yTop, T) {
  const P = lib.PALETTE;
  const { x0, x1, z0, z1 } = room;
  kit.boxMM("paintedMetal", [x0 - T, yTop, z0 - T], [x1 + T, yTop + 0.12, z1 + T], { color: P.darkMetal, uv: "world", texel: 0.5 });
  // transverse Warren trusses every 10 m (z 420..510) and two longitudinal ones over the well edges
  for (let z = z0 + 10; z < z1 - 1; z += 10) truss(kit, { axis: "x", from: x0, to: x1, at: z, yTop, yBot: yTop - 2.6, panel: 4, chord: 0.5, web: 0.26, color: P.gunmetal, chordColor: P.slate });
  for (const x of [-21, 21]) truss(kit, { axis: "z", from: z0, to: z1, at: x, yTop, yBot: yTop - 2.0, panel: 4, chord: 0.45, web: 0.22, color: P.gunmetal, chordColor: P.slate });
  for (const x of [-7, 7]) kit.boxMM("paintedMetal", [x - 0.4, yTop - 1.4, z0], [x + 0.4, yTop, z1], { color: P.gunmetal, uv: "world", texel: 0.6 });
  // recessed light banks in four rows midway between the trusses; the six over the side decks at z 435 /
  // 465 / 495 carry the pooled high-bay point lights (see lights)
  for (const x of [-26, -8, 8, 26]) for (let z = z0 + 5; z < z1 - 3; z += 10) recessedBank(kit, x, yTop, z, 5, 1.4, "emitDiffuser");
  // cable trays and pipe runs under the trusses along the long walls, a big duct against each wall
  for (const s of [-1, 1]) {
    cableTray(kit, s * 24.5, yTop - 3.1, (z0 + z1) / 2, z1 - z0, "z", 0.9);
    cableTray(kit, s * 12, yTop - 3.0, (z0 + z1) / 2, z1 - z0, "z", 0.7);
    kit.boxMM("paintedMetal", [s * 29.6 - 0.7, yTop - 1.6, z0], [s * 29.6 + 0.7, yTop - 0.4, z1], { color: P.gunmetal, uv: "world", texel: 0.6 });
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

// ---------------------------------------------------------------- fighter racks: girders, trusses, clamp racks
function racks(kit, lib, yTop) {
  const P = lib.PALETTE;
  const W = HANGAR.well;
  const positions = [];
  for (const rz of HANGAR.rackZ) for (const gx of HANGAR.rackX) positions.push([gx, rz]);
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
    }
  }
  positions.forEach(([gx, rz], i) => {
    clampRack(kit, { gx, rz, rackY: HANGAR.rackY, girderY: GIRDER.y0, index: i, labelIdx: 8 + i, lampMat: "emitDiffuser" });
    if (STATIC_RACKS.includes(i)) {
      // a fighter held for maintenance: kit TIE nose forward (-z) like the parked traffic craft
      const f = new lib.Frame(kit, new THREE.Vector3(gx, HANGAR.rackY, rz), new THREE.Vector3(-1, 0, 0), UP);
      tieShape(kit, f, { variant: i, engines: null });
    }
  });
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
    // inner railing skips the stair-tower exits, the platform stair landings and (starboard) the cab
    const cuts = [towerZ.fwd, towerZ.aft, ...HANGAR.rackZ.map((rz) => [rz + 1.7, rz + 3.2])];
    if (s > 0) cuts.push([CAB.z0 - 0.15, CAB.z1 + 0.15]);
    cuts.sort((a, b) => a[0] - b[0]);
    let z = 413.4;
    for (const [c0, c1] of cuts) {
      if (c0 > z + 0.3) railing(kit, s * inX, z, s * inX, c0, CAT_Y, { postEvery: 2.2, tag: "catwalkRail" });
      z = Math.max(z, c1);
    }
    if (516.5 > z + 0.3) railing(kit, s * inX, z, s * inX, 516.5, CAT_Y, { postEvery: 2.2, tag: "catwalkRail" });
    // visored flood fixtures under the catwalk every 11 m (lit housings only: the pooled lights are the
    // high-bay banks, see lights)
    for (let fz = 418; fz <= 506; fz += 11) floodFixture(kit, s * 30.0, CAT_Y - 0.5, fz, "emitDiffuser", { w: 2.2 });
    // stair towers (inboard of the catwalk, exiting sideways onto it)
    const tx0 = s > 0 ? 25.8 : -28.4;
    const tx1 = s > 0 ? 28.4 : -25.8;
    const exit = s > 0 ? "x1" : "x0";
    const towerLight = (x, y, z) => ctx.lights.cool.push(lib.pointLight(0xdfe8ff, 14, 14, [x, y, z]));
    stairTower(kit, { x0: tx0, x1: tx1, z0: towerZ.fwd[0], z1: towerZ.fwd[1], yBottom: y0, yTop: CAT_Y, entry: "+z", exit, light: towerLight });
    stairTower(kit, { x0: tx0, x1: tx1, z0: towerZ.aft[0], z1: towerZ.aft[1], yBottom: y0, yTop: CAT_Y, entry: "-z", exit, light: towerLight });
    for (const z of [towerZ.fwd[1] + 0.9, towerZ.aft[0] - 0.9]) deckDecal(kit, (tx0 + tx1) / 2, y0, z, 1.4, 1, z < 465 ? 0 : Math.PI);
  }
  // transverse galleries along the forward and aft walls
  catwalkSlab(kit, lib, x0, z0 + 0.16, x1, 413.4, CAT_Y);
  railing(kit, -25.8, 413.4, 25.8, 413.4, CAT_Y, { postEvery: 2.2, tag: "catwalkRail" });
  catwalkSlab(kit, lib, x0, 516.5, x1, z1 - 0.16, CAT_Y);
  for (const [a, b] of [[-25.8, -23.2], [-18.8, 18.8], [23.2, 25.8]]) railing(kit, a, 516.5, b, 516.5, CAT_Y, { postEvery: 2.2, tag: "catwalkRail" });
  for (const x of [-18, -6, 6, 18]) for (const z of [412.4, 517.6]) floodFixture(kit, x, CAT_Y - 0.5, z, "emitDiffuser", { alongX: true, w: 2.2 });
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
        const L2 = Math.hypot(bx1 - bx0, dy);
        kit.add("paintedMetal", new THREE.BoxGeometry(L2, 0.24, 0.24), { pos: [(bx0 + bx1) / 2, PLAT_Y - 0.7 - dy / 2, z], rot: [0, 0, -s * Math.atan2(dy, Math.abs(bx1 - bx0))], color: P.darkMetal, uv: "scale", uvScale: [6, 1] });
      }
      // work lamp and a tool locker on each platform
      kit.box("metal", xi + s * 0.6, PLAT_Y + 1.5, rz, 0.08, 3.0, 0.08, { color: P.gunmetal });
      kit.box(BLACK, xi + s * 0.6, PLAT_Y + 3.0, rz, 0.4, 0.2, 1.4);
      kit.box("emitDiffuser", xi + s * 0.6, PLAT_Y + 2.89, rz, 0.3, 0.02, 1.2, { uv: "keep" });
      const f = propFrame(kit, xo - s * 1.2, PLAT_Y, rz - 2.2, s > 0 ? -Math.PI / 2 : Math.PI / 2);
      cabinet(kit, f, { w: 1.0, h: 1.6, d: 0.5, screen: "screen6" });
    }
  }
}

// ---------------------------------------------------------------- flight-control cab on the starboard catwalk
function flightControl(kit, ctx, lib) {
  const P = lib.PALETTE;
  glassCab(kit, {
    x0: CAB.x0, x1: CAB.x1, z0: CAB.z0, z1: CAB.z1, fy: CAT_Y, ch: 3.4, glazed: ["-x", "-z", "+z"],
    entry: { side: "+x", from: 462.6, to: 465.4 }, face: "-x", screens: ["screen7", "screen8", "screen6", "screen9"], consoles: 4, label: 6,
  });
  // cantilever beams from the wall under the cab floor with knee braces, work lamps on the underside
  for (const z of [CAB.z0 + 1.0, CAB.z1 - 1.0]) {
    kit.boxMM("paintedMetal", [CAB.x0 - 0.2, CAT_Y - 0.9, z - 0.25], [31.9, CAT_Y - 0.3, z + 0.25], { color: P.darkMetal, uv: "world", texel: 0.8 });
    const dy = 3.0;
    const L = Math.hypot(31.9 - (CAB.x0 + 0.6), dy);
    kit.add("paintedMetal", new THREE.BoxGeometry(L, 0.26, 0.26), { pos: [(31.9 + CAB.x0 + 0.6) / 2, CAT_Y - 0.9 - dy / 2, z], rot: [0, 0, -Math.atan2(dy, 31.9 - CAB.x0 - 0.6)], color: P.darkMetal, uv: "scale", uvScale: [6, 1] });
  }
  kit.box(BLACK, CAB.x0 + 1.2, CAT_Y - 0.45, (CAB.z0 + CAB.z1) / 2, 0.6, 0.2, 4.0);
  kit.box("emitDiffuser", CAB.x0 + 1.2, CAT_Y - 0.56, (CAB.z0 + CAB.z1) / 2, 0.45, 0.02, 3.8, { uv: "keep" });
  // beacon on the roof, antenna mast
  beacons(kit, ctx, ctx.materials, [[CAB.x1 - 0.8, CAT_Y + 3.4 + 0.3, CAB.z0 + 0.8, 0.5]]);
  ctx.lights.cool.push(lib.pointLight(0xfff0dd, 10, 12, [(CAB.x0 + CAB.x1) / 2, CAT_Y + 2.9, (CAB.z0 + CAB.z1) / 2]));
}

// ---------------------------------------------------------------- refuelling / repair stations along the side decks
function stations(kit, ctx, lib, y0) {
  const P = lib.PALETTE;
  const wallX = 32;
  // [side, z, kind] (the port 464 slot is the cradle bay, see cradleBay)
  const plan = [
    [-1, 430, "fuel"], [-1, 447, "repair"], [-1, 492, "repair"],
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
    const wall = propFrame(kit, s * (wallX - 0.02), y0, z, face);
    if (kind === "fuel") {
      fuelBowser(kit, propFrame(kit, s * 28.6, y0, z - 1.6, face), { hoseTo: [-2.4, 0, 3.6] });
      toolCart(kit, propFrame(kit, s * 29.6, y0, z + 2.4, face + 0.4));
      crate(kit, propFrame(kit, s * 27.2, y0, z + 3.2, face), { decal: 5 });
      ladder(kit, propFrame(kit, s * 30.4, y0, z + 3.6, face + Math.PI), { h: 2.0 });
      // fuel manifold on the wall with valves and a warning plate
      kit.box(BLACK, s * (wallX - 0.25), y0 + 1.3, z, 0.5, 2.0, 2.4);
      for (let i = 0; i < 4; i++) {
        kit.cyl("metal", s * (wallX - 0.6), y0 + 0.9 + i * 0.35, z - 0.8 + i * 0.5, 0.08, 0.7, "x", { color: i % 2 ? P.orange : P.steel, segments: 8 });
        kit.box("metal", s * (wallX - 0.95), y0 + 0.9 + i * 0.35, z - 0.8 + i * 0.5, 0.2, 0.2, 0.2, { color: P.gunmetal });
      }
      kit.box("screen6", s * (wallX - 0.51), y0 + 1.9, z, 0.01, 0.35, 1.4, { uv: "keep" });
      kit.box("emitAmber", s * (wallX - 0.51), y0 + 2.25, z - 0.9, 0.01, 0.08, 0.3);
      frameLabel(wall, 0, 3.4, 3.6, 18, 0.03);
      ctx.lights.warm.push(lib.pointLight(0xffb347, 12, 14, [s * 28.4, y0 + 3.2, z]));
      // amber work lamp on a mast
      kit.box("metal", s * 30.8, y0 + 2.0, z - 3.6, 0.1, 4.0, 0.1, { color: P.gunmetal });
      kit.box(BLACK, s * 30.6, y0 + 4.0, z - 3.6, 0.6, 0.3, 0.3);
      kit.box("emitAmber", s * 30.6, y0 + 3.84, z - 3.6, 0.5, 0.02, 0.2, { uv: "keep" });
    } else {
      pedestalConsole(kit, propFrame(kit, s * 27.4, y0, z - 2.6, face), "screen8");
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
      lightBar(wall, -3.6, 3.6, 2.9, "emitDiffuser");
      ctx.lights.warm.push(lib.pointLight(0xffc880, 10, 12, [s * 29.0, y0 + 3.0, z]));
    }
  }
  // starboard deck by the maintenance door: a container pair, a parked loader and a spares pallet
  containerStack(kit, propFrame(kit, 28.4, y0, 453.1, 0), 4.8, 1, 2, 21, { open: false });
  loaderVehicle(kit, propFrame(kit, 23.6, y0, 465.6, Math.PI / 2));
  for (let i = 0; i < 3; i++) crate(kit, propFrame(kit, 29.2 + (i % 2) * 1.3, y0 + Math.floor(i / 2) * 0.8, 466.2, 0.1 * i), { decal: [6, 11, 9][i] });
  deckDecal(kit, 25.6, y0, 454, 1.6, 7, -Math.PI / 2);
}

// ---------------------------------------------------------------- port deck: fighter on a maintenance cradle
function cradleBay(kit, ctx, lib, y0) {
  const P = lib.PALETTE;
  const cx = -25;
  const cz = 470;
  // nose toward the port wall, wings across the deck: the +z wing faces anyone coming in from the lift
  // corridor, the open shoulder hatch faces the well
  const podY = 4.5;
  tieCradle(kit, propFrame(kit, cx, y0, cz, -Math.PI / 2), { podY, variant: 2, hatch: true });
  // bay outline, stencils
  const bay = [cx - 4.6, cz - 6.6, cx + 4.2, cz + 6.6];
  deckStrip(kit, "emitAmber", bay[0], bay[1], bay[2], bay[1] + 0.12, y0);
  deckStrip(kit, "emitAmber", bay[0], bay[3] - 0.12, bay[2], bay[3], y0);
  deckStrip(kit, "emitAmber", bay[0], bay[1], bay[0] + 0.12, bay[3], y0);
  deckStrip(kit, "emitAmber", bay[2] - 0.12, bay[1], bay[2], bay[3], y0);
  // (the FUEL stencil on the aft edge reads for anyone walking in from the lift corridor, i.e. facing -z; it
  // sits toward the wall so its end clears the DANGER stencil along the well edge at x -23.5)
  deckLabel(kit, cx - 1.8, y0, cz + 5.6, 5, 18, 0);
  deckDecal(kit, cx + 3.2, y0, cz - 5.6, 1.4, 7, -Math.PI / 2);
  // ground kit. Two viewpoints are fixed: the lift-corridor door at (-30.6, 479.5) looks at the room centre
  // (room:hangar) and the hangarDeck view stands at (-26, 465) looking across the well. The lane from the door
  // to the well (x -32..-20, z 476..483) stays empty so neither the walk in nor the door view is blocked; the
  // bowser stands forward of the skid hosed to its fuel point, the carts turn their drawers to the viewer.
  fuelBowser(kit, propFrame(kit, -27.0, y0, 462.0, Math.PI), { hoseTo: [-1.6, 0, -3.3] });
  ladder(kit, propFrame(kit, -28.1, y0, 468.7, Math.PI / 2), { h: 3.2 });
  toolCart(kit, propFrame(kit, -21.8, y0, 477.8, -0.6));
  toolCart(kit, propFrame(kit, -23.0, y0, 462.2, -0.9));
  crate(kit, propFrame(kit, -30.4, y0, 465.6, 0.2), { decal: 5 });
  crate(kit, propFrame(kit, -30.4, y0 + 0.8, 465.6, 0.35), { decal: 11, h: 0.7 });
  pallet(kit, propFrame(kit, -23.6, y0, 459.6, 0.15), { tiers: 2, decal: 9 });
  pedestalConsole(kit, propFrame(kit, -22.0, y0, 467.6, -2.0), "screen7");
  // pod umbilical from a wall reel to the open hatch
  kit.box("paintedMetal", -31.6, y0 + 3.4, 468.7, 0.8, 1.4, 1.6, { color: P.gunmetal, texel: 1 });
  kit.cyl("metal", -31.05, y0 + 3.4, 468.7, 0.55, 0.5, "x", { color: P.slate, segments: 16 });
  kit.cyl(BLACK, -31.05, y0 + 3.4, 468.7, 0.4, 0.56, "x", { segments: 16 });
  const hatch = new THREE.Vector3(cx - 0.95 - 0.5, y0 + podY + 1.0, cz - 1.25);
  const pts = [new THREE.Vector3(-30.7, y0 + 3.4, 468.7), new THREE.Vector3(-29.2, y0 + 4.8, 468.7), new THREE.Vector3(-27.6, y0 + 5.7, 468.7), hatch];
  kit.add(BLACK, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5), 14, 0.07, 6, false), { uv: "scale", uvScale: [1, 10] });
  kit.box("emitAmber", -31.2, y0 + 4.3, 469.6, 0.2, 0.1, 0.02);
  lightBar(propFrame(kit, -31.98, y0, 470, Math.PI / 2), -6, 6, 2.9, "emitDiffuser");
  ctx.lights.warm.push(lib.pointLight(0xffc880, 20, 16, [cx - 1.5, y0 + 6.5, cz + 1.5]));
  ctx.lights.cool.push(lib.pointLight(0xe8f0ff, 40, 18, [cx + 3.5, y0 + 9.5, cz]));
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

// ---------------------------------------------------------------- aft deck: traffic-control cab, cargo lifts, containers
function aftDeck(kit, ctx, lib, y0, mats) {
  trafficCab(kit, ctx, lib, y0);
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
    deckDecal(kit, (lx0 + lx1) / 2, y0, 509.5, 1.8, 1, Math.PI);
  }
  // container stacks between the recovery lane and the port cargo lift
  containerStack(kit, propFrame(kit, -13, y0, 508.4, Math.PI / 2), 6, 2, 2, 13, { open: true });
  containerStack(kit, propFrame(kit, -13.5, y0, 514.5, Math.PI / 2), 6, 1, 1, 17);
  for (let i = 0; i < 3; i++) crate(kit, propFrame(kit, -26 + i * 1.4, y0, 505.5, 0.1 * i), { decal: [11, 6, 9][i] });
  toolCart(kit, propFrame(kit, -21, y0, 505.5, 0.6));
}

function trafficCab(kit, ctx, lib, y0) {
  const P = lib.PALETTE;
  const cx0 = 7;
  const cx1 = 15.2;
  const cz0 = 504.5;
  const cz1 = 510.7;
  const fy = y0 + 6; // cab floor
  // pedestal core and corner columns
  kit.boxMM("paintedMetal", [9, y0, 506], [13.2, fy - 0.3, 509.2], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.collider([9, y0, 506], [13.2, fy, 509.2], "cabCore");
  for (let y = y0 + 0.8; y < fy - 1; y += 1.4) kit.box("metal", 9.0, y, 507.6, 0.06, 0.5, 2.6, { color: P.darkMetal, texel: 1 });
  kit.box(BLACK, 11.1, y0 + 1.1, 505.98, 1.2, 2.2, 0.06);
  kit.box("emitBlue", 11.7, y0 + 1.6, 505.95, 0.06, 0.4, 0.02);
  for (const [px, pz] of [[cx0 + 0.3, cz0 + 0.3], [cx1 - 0.3, cz0 + 0.3], [cx0 + 0.3, cz1 - 0.3], [cx1 - 0.3, cz1 - 0.3]]) {
    kit.boxMM("paintedMetal", [px - 0.3, y0, pz - 0.3], [px + 0.3, fy, pz + 0.3], { color: P.darkMetal, uv: "world", texel: 0.8 });
    kit.collider([px - 0.3, y0, pz - 0.3], [px + 0.3, fy, pz + 0.3], "cabColumn");
  }
  // under-cab work lights
  for (const x of [8.5, 13.7]) {
    kit.box(BLACK, x, fy - 0.45, 507.6, 0.5, 0.15, 3.0);
    kit.box("emitDiffuser", x, fy - 0.53, 507.6, 0.4, 0.02, 2.8, { uv: "keep" });
  }
  const { roofY } = glassCab(kit, {
    x0: cx0, x1: cx1, z0: cz0, z1: cz1, fy, ch: 3.0, glazed: ["-z", "-x"], entry: { side: "+x", from: 509.2, to: 510.7 },
    face: "-z", screens: ["screen6", "screen10", "screen8"], consoles: 4, label: 19,
  });
  ctx.lights.cool.push(lib.pointLight(0xfff0dd, 8, 10, [11.1, roofY - 0.4, 507.6]));
  // access stair tower (2 flights, exits through its x0 face onto the cab floor)
  stairTower(kit, { x0: cx1, x1: cx1 + 2.6, z0: cz0, z1: cz1, yBottom: y0, yTop: fy, entry: "+z", exit: "x0", flights: 2, light: null });
  deckDecal(kit, cx1 + 1.3, y0, cz1 + 1.0, 1.4, 3, 0);
}

// ---------------------------------------------------------------- light fixtures
function lights(ctx, lib, y0, yTop) {
  const cool = (i, d, p, c = 0xdfe8ff) => ctx.lights.cool.push(lib.pointLight(c, i, d, p));
  // The bay is 64 x 110 x 38 m and the pool runs 14 point lights, chosen by their irradiance at the camera
  // (intensity / distance^2), so the plan is written for that budget seen from the decks: 6 high-bay banks,
  // 4 rack-row lights, the cradle bay's two and the tractor glow = 13, leaving one slot for whichever practical
  // (station, stair tower, cab interior) the player is standing next to.
  // The banks sit in the ceiling plane (inside the plate's thickness, in the recessed housings): a point light
  // in the plane of a surface leaves that surface unlit, so the ceiling stays dark around the fixtures instead
  // of blowing out in a halo, and nothing walkable is within 18 m of them, so the catwalks and platforms never
  // wash out as they did with floods hung 1 m under the catwalk grating.
  // (inverse-square: a 38 m drop to the deck needs ~2500 cd for a lit deck, so these are big numbers)
  for (const s of [-1, 1]) for (const z of [435, 465, 495]) cool(2600, 130, [s * 26, yTop + 0.04, z]);
  // rack-row lights: one per rack pair, hovering over the well between the two rows 3.5 m above rack height
  // (clear of the crane's slung load, whose top passes 6 m under them). 14 m from either pod, they light the
  // faces the deck sees (pod, pylons, the inner wing panels and the clamp arms) at ~1.8 cd/m^2 so the parked
  // craft read as lit fighters against the dark ceiling; a light per rack never reached the deck viewer
  // strongly enough to win a pool slot against the banks
  for (const rz of HANGAR.rackZ) cool(360, 40, [0, HANGAR.rackY + 3.5, rz], 0xe6eeff);
  // tractor glow: a blue light hovering in the beams above the well mouth, 5 m clear of the launch-cradle rail
  // (it also lights the fighter hanging from the cradle from above)
  ctx.lights.teal.push(lib.pointLight(0x66b6ff, 170, 60, [0, -71, 461]));
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
  // the slung load hangs 11 m under the trolley (16 m over the deck) so the crane reads from deck level, where
  // the bridge itself is at the top of the field of view
  gantryCrane(ctx, mats, { x0: -31.0, x1: 31.0, y: CRANE_Y, zMin: W.z0 + 10, zMax: W.z1 - 10, trolleyRange: [-7.5, 7.5], hookDrop: 11, load: true, speed: 0.6, zStart: 470, name: "hangar.crane" });
  // drop-rail launch cradle over the well: the carriage stays inside the opening (x -14.5..10, wing tips 1 m
  // clear of the shaft lining). The fighter hangs slewed 70 degrees off the launch line: the two fixed views
  // (hangarDeck at (-26, 465), the lift door at (-30.6, 479.5)) are 30 degrees apart, and this heading shows
  // the pod between both wings to each of them (17 degrees off the nose from the deck, 47 from the door)
  // instead of a lone wing panel hiding the pod from the door. The yoke work lamps are a real pooled light
  // riding with the carriage, so the hanging fighter is lit from its own cradle wherever the carriage is.
  const yokeLamp = ctx.lib.pointLight(0xfff0dd, 60, 18, [RAIL.x, RAIL.y - 2.95, RAIL.z]);
  yokeLamp.userData.moving = true;
  ctx.lights.cool.push(yokeLamp);
  launchCradle(kit, ctx, mats, { z: RAIL.z, y: RAIL.y, x0: -14.5, x1: 10, xStart: RAIL.x, wallX: 32, variant: 3, labelIdx: 4, heading: 1.22, lamp: yokeLamp });
  // (2.2 m of leaf in the opening: from the railing, the line of sight over the raised lip reaches the outer
  // 0.7 m of the leaf's hazard top; at 1.6 m the leaves were hidden by the lip from anywhere on the deck)
  blastLeaves(ctx, mats, { well: W, y: y0 - 0.95, thickness: 0.9, protrude: 2.2, travel: 0.6, period: 34 });
  shimmerSheet(ctx, W, y0 - 0.42);
  tractorEmitters(kit, ctx, { positions: [[-4.5, 445], [4.5, 445], [-4.5, 465], [4.5, 465], [-4.5, 485], [4.5, 485]], yCeil: yTop, yTarget: y0 - 1.6, radius: 4.2 });
  const rx = W.x1 + 2.3;
  beacons(kit, ctx, mats, [
    [-rx, y0, W.z0 - 2.0, 3.0], [rx, y0, W.z0 - 2.0, 3.0], [-rx, y0, W.z1 + 2.0, 3.0], [rx, y0, W.z1 + 2.0, 3.0],
    [-4.9, y0, W.z0 - 1.9, 1.6], [4.9, y0, W.z0 - 1.9, 1.6], [-4.9, y0, W.z1 + 1.9, 1.6], [4.9, y0, W.z1 + 1.9, 1.6],
    [14.6, y0 + 9.3, 505.0, 0.4],
  ]);
}
