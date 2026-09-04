// Cargo storage and logistics (x -30..30, z 520.5..570, h 16): container blocks in the ship's greys and black
// (corner castings, latches, stencils, some open on lit interiors) stacked up to three high on pallets with
// tie-down straps along walkable aisles, a marked loader lane from the hangar blast door to a logistics
// console island and a cross lane under the overhead monorail (a crane trolley with a slung container), two
// cargo lifts that ride up to a storage mezzanine along the aft wall (stair at the starboard end), pallet
// stacks, loader vehicles and sealed loading-dock doors under the mezzanine. Cool white work lighting with
// warm practicals under the mezzanine; the blast door to the hangar is on -z.
import { roomFloorY } from "../../config/shipSpec.js";
import { decalRect } from "../../textures.js";
import * as THREE from "three";
import {
  propFrame, railing, deckStrip, hazardBand, deckDecal, bayWalls, containerStack, crate, toolCart, shadowCasters,
  pedestalConsole, cabinet, recessedBank, compactBank, pipeRun, stairRun, beacons, cargoLift, monorail, craneTrolley, loaderVehicle,
  pallet, bayCeiling, cableTray, doorSurround, ensureLabels, deckLabel, displayWall, floodFixture,
} from "../../hangar/machinery.js";

const MEZZ_H = 6; // storage mezzanine height above the deck
const MEZZ_Z = 563; // mezzanine front edge
const LANE = { x0: -4, x1: 4, z0: 522, z1: 549.5 }; // loader lane from the door
const CROSS = { z0: 540, z1: 548.5 }; // cross lane under the crane rail
// pooled ceiling lights and their fixtures: over the loader lane and the forward aisles, then along the cross
// lane (x between the bayCeiling ribs, which run along z every 3.33 m from x0)
const CEILING_LIGHTS = [[0, 530], [-15, 530], [15, 530], [0, 546.5], [-18.3, 546.5], [18.3, 546.5]];
const ROWS = [9.6, 12.1, 16.8, 19.3, 24.0, 26.5]; // container row centres (mirrored)

export function build(kit, ctx, room, lib) {
  const P = lib.PALETTE;
  const mats = ctx.materials;
  const y0 = roomFloorY(room);
  const yTop = y0 + room.height;
  ensureLabels(mats);
  const shell = lib.roomShell(kit, ctx, room, { style: "dark", ceiling: false, lights: false, skipWalls: ["-z", "+z", "-x", "+x"] });
  // light strip row 5.4..11.2 puts a wall light above the mezzanine floor; no kick strip (no rubber in the bay)
  bayWalls(kit, room, shell, y0, { rows: [2.4, 5.4, 11.2, room.height], lightRow: 1, kick: false, seed: 81, rowStyles: ["bays", null, "vent"] });
  bayCeiling(kit, room, y0, { rows: 4, gaps: CEILING_LIGHTS.map(([x, z]) => [x, z, 2.4]) });
  shadowCasters(kit, ["paintedMetal"]);
  doorSurround(kit, room, room.doors[0], y0, { label: 0, labelW: 5 });

  lanes(kit, P, room, y0);
  containers(kit, y0);
  island(kit, ctx, lib, y0);
  mezzanine(kit, ctx, lib, room, y0, mats);
  craneRail(kit, ctx, mats, yTop);
  props(kit, P, room, y0);
  lanePoles(kit, ctx, lib, P, y0);
  displayWall(shell.frames["+x"].frame, 544.25 - room.z0, 4.4, 4.2, 2.0, ["screen9", "screen7"], 3, { cols: 2 });
  ceiling(kit, P, room, yTop);
  lights(ctx, lib, y0, yTop);
  return shell;
}

// ---------------------------------------------------------------- loader lanes
function lanes(kit, P, room, y0) {
  const { x0, x1 } = room;
  // the lane from the door to the island: amber edges, white centre dashes, bay stencil 8 m in from the door
  // view between two dashes (at 3 m it lay under the camera's feet and filled the bottom of the frame as one
  // blown band; the door surround draws the sill band)
  deckLabel(kit, 0, y0, 530.2, 6, 3, Math.PI);
  for (const x of [LANE.x0, LANE.x1]) deckStrip(kit, "emitAmber", x - 0.08, LANE.z0, x + 0.08, LANE.z1, y0);
  for (let z = LANE.z0 + 3; z < LANE.z1 - 2; z += 3) deckStrip(kit, "emitAmber", -0.15, z, 0.15, z + 1.4, y0);
  deckDecal(kit, -6.2, y0, 528, 2.6, 11, Math.PI / 2);
  deckDecal(kit, 6.2, y0, 528, 2.6, 2, -Math.PI / 2);
  deckDecal(kit, 0, y0, 536, 2.4, 3, 0);
  // cross lane: amber edges interrupted by the loader lane, arrows and lane numbers at the ends
  for (const z of [CROSS.z0, CROSS.z1]) {
    deckStrip(kit, "emitAmber", x0 + 1.5, z - 0.08, LANE.x0, z + 0.08, y0);
    deckStrip(kit, "emitAmber", LANE.x1, z - 0.08, x1 - 1.5, z + 0.08, y0);
  }
  for (const sx of [-1, 1]) {
    deckDecal(kit, sx * 26, y0, 544.25, 2.6, 2, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
    deckDecal(kit, sx * 14.4, y0, 544.25, 2.0, 3, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
    // aisle mouths between the container pairs
    for (const ax of [14.45, 21.65, 28.85]) {
      hazardBand(kit, sx * ax - 1.15, 538.9, sx * ax + 1.15, 539.6, y0);
      hazardBand(kit, sx * ax - 1.15, 549.4, sx * ax + 1.15, 550.1, y0);
    }
  }
}

// ---------------------------------------------------------------- container blocks
function containers(kit, y0) {
  let seed = 3;
  for (const sx of [-1, 1]) {
    ROWS.forEach((rx, i) => {
      // forward block: two containers deep, doors toward the cross lane (+z)
      containerStack(kit, propFrame(kit, sx * rx, y0, 532.3, Math.PI), 6, 2, 3, seed++, { open: i % 2 === 1 });
      // aft block: one container deep, doors toward the cross lane (-z)
      containerStack(kit, propFrame(kit, sx * rx, y0, 553, 0), 6, 1, 3, seed++, { open: i % 3 === 0 });
    });
  }
}

// ---------------------------------------------------------------- logistics console island
function island(kit, ctx, lib, y0) {
  const P = lib.PALETTE;
  const iz = 554;
  const ty = y0 + 0.15;
  kit.boxMM("paintedMetal", [-3, y0, iz - 2.5], [3, ty, iz + 2.5], { color: P.slate, uv: "world", texel: 0.8 });
  kit.boxMM("hazard", [-3.01, y0 + 0.02, iz - 2.51], [3.01, y0 + 0.13, iz + 2.51], { uv: "world", texel: 1.2 });
  kit.floor(-3, iz - 2.5, 3, iz + 2.5, ty);
  pedestalConsole(kit, propFrame(kit, -2.3, ty, iz, -Math.PI / 2), "screen6", { w: 1.6 });
  pedestalConsole(kit, propFrame(kit, 2.3, ty, iz, Math.PI / 2), "screen6", { w: 1.6 });
  pedestalConsole(kit, propFrame(kit, 0, ty, iz - 1.85, Math.PI), "screen6", { w: 1.8 });
  pedestalConsole(kit, propFrame(kit, 0, ty, iz + 1.85, 0), "screen6", { w: 1.8 });
  // central pillar with four screens and an amber "LOGISTICS" halo
  kit.boxMM("darkGloss", [-0.45, ty, iz - 0.45], [0.45, ty + 3.6, iz + 0.45]);
  kit.collider([-0.45, ty, iz - 0.45], [0.45, ty + 3.6, iz + 0.45], "islandPillar");
  for (const [dx, dz, rot] of [[0.46, 0, Math.PI / 2], [-0.46, 0, -Math.PI / 2], [0, 0.46, 0], [0, -0.46, Math.PI]]) {
    const g = new THREE.PlaneGeometry(0.8, 0.5);
    g.rotateY(rot);
    kit.add("screen6", g, { pos: [dx, ty + 2.5, iz + dz], uv: "keep" });
    const d = new THREE.PlaneGeometry(0.6, 0.6);
    d.rotateY(rot);
    kit.add("decal", d, { pos: [dx, ty + 1.7, iz + dz], uv: "keep", uvRect: decalRect(11) });
  }
  kit.boxMM("emitAmber", [-0.6, ty + 3.6, iz - 0.6], [0.6, ty + 3.7, iz + 0.6], { uv: "keep" });
  kit.boxMM("darkGloss", [-0.7, ty + 3.7, iz - 0.7], [0.7, ty + 3.8, iz + 0.7]);
  recessedBank(kit, 0, y0 + 16, iz, 5, 1.2, "emitWhiteSoft");
  ctx.lights.cool.push(lib.pointLight(0xe8f0ff, 80, 22, [0, ty + 4.5, iz]));
}

// ---------------------------------------------------------------- storage mezzanine with two cargo lifts and a stair
function mezzanine(kit, ctx, lib, room, y0, mats) {
  const P = lib.PALETTE;
  const { x0, x1, z1 } = room;
  const my = y0 + MEZZ_H;
  const xa = x0 + 0.16;
  const xb = x1 - 0.16;
  const zb = z1 - 0.16;
  kit.boxMM("paintedMetal", [xa, my - 0.3, MEZZ_Z], [xb, my - 0.02, zb], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("deck", [xa, my - 0.02, MEZZ_Z], [xb, my, zb], { color: P.impGreyDark, uv: "world", texel: 1 });
  kit.boxMM("metal", [xa + 0.3, my, MEZZ_Z + 0.4], [xb - 0.3, my + 0.004, MEZZ_Z + 1.6], { color: P.darkMetal, uv: "world", texel: 2 });
  hazardBand(kit, xa, MEZZ_Z, xb, MEZZ_Z + 0.35, my + 0.006);
  kit.floor(xa, MEZZ_Z, xb, zb, my);
  // edge lip, cut at the lift docks so the platforms can meet the floor
  for (const [a, b] of [[xa, -19], [-15, 15], [19, xb]]) kit.boxMM("metal", [a, my - 0.32, MEZZ_Z - 0.05], [b, my + 0.03, MEZZ_Z + 0.08], { color: P.gunmetal, uv: "world", texel: 1 });
  // columns under the front edge (clear of the lifts)
  for (const cx of [-26, -13, 0, 13, 26]) {
    kit.boxMM("paintedMetal", [cx - 0.25, y0, MEZZ_Z + 0.2], [cx + 0.25, my - 0.3, MEZZ_Z + 0.7], { color: P.darkMetal, uv: "world", texel: 0.8 });
    kit.collider([cx - 0.25, y0, MEZZ_Z + 0.2], [cx + 0.25, my - 0.3, MEZZ_Z + 0.7], "mezzColumn");
    kit.boxMM("hazard", [cx - 0.26, y0 + 0.3, MEZZ_Z + 0.19], [cx + 0.26, y0 + 0.6, MEZZ_Z + 0.71], { uv: "world", texel: 1.2 });
  }
  // cargo lifts docking at the front edge; gallery gates open only when the platform is docked
  for (const s of [-1, 1]) {
    const lx0 = s > 0 ? 15 : -19;
    const lx1 = s > 0 ? 19 : -15;
    const lift = cargoLift(kit, ctx, mats, { x0: lx0, x1: lx1, z0: MEZZ_Z - 4.5, z1: MEZZ_Z, yLow: y0, yHigh: my, period: 40, dwell: 8, phase: s > 0 ? 0 : 20, openSides: ["-z", "+z"], frameSide: s > 0 ? "+x" : "-x", name: "cargo.lift" + (s > 0 ? "S" : "P") });
    const gate = kit.collider([lx0, my, MEZZ_Z - 0.1], [lx1, my + 1.2, MEZZ_Z + 0.1], "liftGate");
    const base = lift.update;
    lift.update = (dt) => {
      base(dt);
      gate.disabled = lift.state.y > my - 0.25;
    };
    deckDecal(kit, (lx0 + lx1) / 2, y0, MEZZ_Z - 6.2, 1.8, 1, 0);
    hazardBand(kit, lx0 - 0.3, MEZZ_Z - 5.4, lx1 + 0.3, MEZZ_Z - 4.8, y0);
  }
  beacons(kit, ctx, mats, [[-19.35, my + 3.2, MEZZ_Z - 2.25, 0.3], [19.35, my + 3.2, MEZZ_Z - 2.25, 0.3]], "cargo.beacons");
  // stair along the starboard wall up to the mezzanine
  const sx0 = 27.8;
  const sx1 = xb;
  stairRun(kit, sx0, MEZZ_Z - 7.5, sx1, MEZZ_Z, y0, my, "z");
  hazardBand(kit, sx0, MEZZ_Z - 8.3, sx1, MEZZ_Z - 7.5, y0);
  deckDecal(kit, (sx0 + sx1) / 2, y0, MEZZ_Z - 9.2, 1.4, 1, 0);
  // front railing with gaps at the lift gates and the stair head
  for (const [a, b] of [[xa, -19], [-15, 15], [19, sx0]]) railing(kit, a, MEZZ_Z, b, MEZZ_Z, my, { postEvery: 2.2, tag: "mezzRail" });
  // stored goods on the mezzanine: single containers along the aft wall, pallets, a console
  let seed = 61;
  for (const cx of [-22, -8, 8, 22]) containerStack(kit, propFrame(kit, cx, my, zb - 1.3, Math.PI / 2), 6, 1, 1, seed++);
  for (const [px, pz] of [[-27, 566.2], [-15.5, 566], [-14, 567.4], [0, 566.2], [1.5, 567.6], [15, 566], [26, 566.3]]) pallet(kit, propFrame(kit, px, my, pz, (px * 7) % 1), { tiers: 1 + (Math.abs(px) % 2), tone: [P.impGrey, P.impGreyDark, P.slate][Math.abs(Math.round(px)) % 3] });
  pedestalConsole(kit, propFrame(kit, -26, my, MEZZ_Z + 1.9, Math.PI), "screen6", { w: 1.4 });
  cabinet(kit, propFrame(kit, xb - 0.32, my, 567.5, -Math.PI / 2), { screen: "screen6" });
  // under the mezzanine: sealed loading-dock doors on the aft wall, work lights, pallets
  for (const dx of [-24, -10, 10, 24]) {
    kit.boxMM("paintedMetal", [dx - 2.3, y0, zb - 0.34], [dx + 2.3, y0 + 4.9, zb], { color: P.gunmetal, uv: "world", texel: 0.8 });
    kit.boxMM("darkGloss", [dx - 2.0, y0 + 0.05, zb - 0.4], [dx + 2.0, y0 + 4.6, zb - 0.32]);
    for (let y = y0 + 0.6; y < y0 + 4.4; y += 0.8) kit.boxMM("paintedMetal", [dx - 1.95, y, zb - 0.42], [dx + 1.95, y + 0.08, zb - 0.38], { color: P.darkMetal, texel: 1 });
    kit.boxMM("hazard", [dx - 2.3, y0 + 4.6, zb - 0.36], [dx + 2.3, y0 + 4.9, zb - 0.34], { uv: "world", texel: 1.2 });
    hazardBand(kit, dx - 2.3, zb - 1.4, dx + 2.3, zb - 0.4, y0);
    kit.add("decal", new THREE.PlaneGeometry(1.2, 1.2), { pos: [dx, y0 + 3.2, zb - 0.41], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(11) });
    kit.box("emitAmber", dx + 2.0, y0 + 3.4, zb - 0.41, 0.3, 0.12, 0.02);
    kit.collider([dx - 2.3, y0, zb - 0.42], [dx + 2.3, y0 + 4.9, zb], "dockDoor");
    kit.box("darkGloss", dx, my - 0.5, MEZZ_Z + 3.4, 2.0, 0.2, 0.7);
    kit.box("emitWarmSoft", dx, my - 0.61, MEZZ_Z + 3.4, 1.8, 0.02, 0.5, { uv: "keep" });
  }
  for (const [px, pz, t] of [[-5, 566.5, 2], [-3.4, 566.2, 1], [4.5, 567, 2], [6.2, 565.6, 1], [-17, 565.8, 2], [17, 565.8, 1]]) pallet(kit, propFrame(kit, px, y0, pz, (px * 3) % 1), { tiers: t, tone: [P.impGrey, P.impGreyDark, P.slate][Math.abs(Math.round(px)) % 3], decal: t === 2 ? 11 : 6 });
  loaderVehicle(kit, propFrame(kit, -9.5, y0, 560.5, -Math.PI / 2 + 0.15), { workLight: "emitWarmSoft" });
}

// ---------------------------------------------------------------- overhead monorail with a crane trolley carrying a container
function craneRail(kit, ctx, mats, yTop) {
  const z = (CROSS.z0 + CROSS.z1) / 2;
  const y = yTop - 2.0;
  monorail(kit, { x0: -27.5, x1: 27.5, y, z, yTop, hangEvery: 9 });
  // slung container bottom ends up 4.9 m over the cross lane: clear of the loader and anyone walking it
  craneTrolley(ctx, mats, { x0: -24, x1: 24, y, z, drop: 5, speed: 0.45, load: "container", name: "cargo.crane" });
}

// ---------------------------------------------------------------- deck props
function props(kit, P, room, y0) {
  const { z0 } = room;
  // near the door: pallets, a parked loader, crates and carts
  for (const [px, pz, t] of [[-6.6, 524.6, 2], [-8.2, 524.3, 1], [6.8, 524.4, 2], [8.4, 525.2, 1]]) pallet(kit, propFrame(kit, px, y0, pz, (px * 3) % 1), { tiers: t, tone: t === 2 ? P.impGrey : P.slate });
  loaderVehicle(kit, propFrame(kit, 6.5, y0, 545.5, Math.PI / 2 - 0.1), { workLight: "emitWarmSoft" });
  toolCart(kit, propFrame(kit, -6.5, y0, 546.8, 0.3));
  toolCart(kit, propFrame(kit, -7.2, y0, 542.2, -1.1));
  for (let i = 0; i < 3; i++) crate(kit, propFrame(kit, -26.5 + i * 1.4, y0, 523, 0.1 * i), { decal: [11, 6, 9][i] });
  crate(kit, propFrame(kit, -25.1, y0 + 0.8, 523, 0.15), { decal: 5, h: 0.7 });
  for (let i = 0; i < 4; i++) {
    const dx = 25 + (i % 2) * 1.1;
    const dz = 522.8 + Math.floor(i / 2) * 1.1;
    kit.cyl("painted2", dx, y0 + 0.6, dz, 0.45, 1.2, "y", { color: i % 2 ? P.impGreyDark : P.orange, segments: 14, uv: "world", texel: 1 });
  }
  kit.collider([24.4, y0, 522.2], [26.7, y0 + 1.25, 524.5], "drums");
  // wall cabinets and consoles on the forward wall beside the door
  for (let i = 0; i < 3; i++) cabinet(kit, propFrame(kit, -12 + i * 1.4, y0, z0 + 0.32, 0), { screen: i === 1 ? "screen6" : null });
  for (let i = 0; i < 3; i++) cabinet(kit, propFrame(kit, 12 + i * 1.4, y0, z0 + 0.32, 0), { screen: i === 1 ? "screen6" : null, color: P.slate });
  pedestalConsole(kit, propFrame(kit, -19, y0, z0 + 1.0, 0), "screen6", { w: 1.4 });
}

// ---------------------------------------------------------------- lane light poles along the loader lane
function lanePoles(kit, ctx, lib, P, y0) {
  // slim poles just outside the amber lane edges, a flood head cantilevered toward the container faces: the
  // ceiling banks 16 m up leave the lane-side faces of the forward blocks in shadow from the door
  for (const sx of [-1, 1]) for (const z of [530, 538.6]) {
    const x = sx * 5.6;
    const hx = x + sx * 1.3;
    kit.boxMM("paintedMetal", [x - 0.45, y0, z - 0.45], [x + 0.45, y0 + 0.2, z + 0.45], { color: P.gunmetal, uv: "world", texel: 0.8 });
    kit.boxMM("hazard", [x - 0.46, y0 + 0.2, z - 0.46], [x + 0.46, y0 + 0.5, z + 0.46], { uv: "world", texel: 1.2 });
    kit.box("paintedMetal", x, y0 + 3.5, z, 0.24, 6.6, 0.24, { color: P.slate, texel: 1 });
    kit.boxMM("paintedMetal", [Math.min(x, hx), y0 + 6.5, z - 0.12], [Math.max(x, hx), y0 + 6.74, z + 0.12], { color: P.gunmetal, uv: "world", texel: 0.8 });
    floodFixture(kit, hx, y0 + 6.3, z, "emitWhiteSoft", { w: 1.2, lip: 0.2 });
    kit.box("emitBlue", x - sx * 0.125, y0 + 5.6, z, 0.01, 0.4, 0.08, { uv: "keep" });
    kit.collider([x - 0.46, y0, z - 0.46], [x + 0.46, y0 + 6.8, z + 0.46], "lanePole");
    // the pooled light sits just above the head, outboard of the arm: under the head it lit the housing's
    // black underside from 0.3 m into a blown blob, above it only the emitter plates show
    ctx.lights.cool.push(lib.pointLight(0xdfe8ff, 140, 24, [hx + sx * 0.3, y0 + 6.55, z]));
  }
}

// ---------------------------------------------------------------- ceiling: recessed banks over the lanes, trays, ducts, pipes
function ceiling(kit, P, room, yTop) {
  const { x0, x1, z0, z1 } = room;
  // compact high-bay fixtures at the six pooled point lights (see lights); the housings are small because a
  // 380 cd source blows anything within a metre of it white
  for (const [x, z] of CEILING_LIGHTS) compactBank(kit, x, yTop, z, "emitWhiteSoft");
  for (const s of [-1, 1]) {
    pipeRun(kit, s * 28.6, yTop - 0.9, (z0 + z1) / 2, z1 - z0, "z", 0.18, P.steel, 8);
    pipeRun(kit, s * 28.6, yTop - 1.4, (z0 + z1) / 2, z1 - z0, "z", 0.12, P.orange, 8);
    cableTray(kit, s * 9, yTop - 1.2, (z0 + z1) / 2, z1 - z0 - 2, "z", 0.7);
  }
  // (the duct's 1.1 m face turned into a blown band when it ran 2.5 m from the cross-lane lights)
  kit.boxMM("paintedMetal", [x0, yTop - 1.5, 556.0], [x1, yTop - 0.4, 557.4], { color: P.slate, uv: "world", texel: 0.6 });
  pipeRun(kit, 0, yTop - 0.7, 525, x1 - x0, "x", 0.2, P.gunmetal, 8);
}

// ---------------------------------------------------------------- lighting: cool white work light, warm practicals under the mezzanine
function lights(ctx, lib, y0, yTop) {
  const cool = (i, d, p, c = 0xdfe8ff) => ctx.lights.cool.push(lib.pointLight(c, i, d, p));
  const warm = (i, d, p, c = 0xffb347) => ctx.lights.warm.push(lib.pointLight(c, i, d, p));
  // (inverse-square: 16 m from the ceiling to the deck). Over the lanes, not the blocks: the loader lane and
  // the two forward aisles, then the cross lane a metre aft of the crane girder. In the ceiling plane inside
  // the fixture housings: hung 1.5 m under the plate they lit it into white halos
  for (const [x, z] of CEILING_LIGHTS) cool(380, 44, [x, yTop + 0.04, z]);
  for (const x of [-14, 14]) warm(55, 16, [x, y0 + MEZZ_H - 0.7, 566.5], 0xffc880);
  cool(80, 20, [0, y0 + 5.5, 523.5], 0xe8f0ff);
  for (const x of [-22, 22]) warm(60, 20, [x, y0 + MEZZ_H + 4, 566], 0xffc880);
}
