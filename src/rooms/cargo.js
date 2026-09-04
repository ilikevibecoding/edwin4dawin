// Cargo storage & logistics (workstream HANGAR): 80 × 14 × 60 m aft of the main hangar, entered
// through the 18 m blast door in its N wall. Four tall rack rows of stacked containers (instanced
// crates in five sizes) flank a central aisle that runs from the door to a recessed cargo lift at the
// aft end; roller conveyors, loader vehicles, manifest consoles, hazard markings and amber lighting.
// Room-local coordinates (floor centre, -z forward = toward the hangar).
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { lux, roomWalls, impChair } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { HG_DECAL, hgNumber, hgDecalRect } from "../textures_hangar.js";
import { rng } from "../kit.js";
import {
  hgSetup,
  inst,
  Placer,
  deckDecal,
  deckDecalImp,
  dashedLine,
  deckLine,
  hgRailing,
  hgHazardBorder,
  hgBeacons,
  hgToolCart,
  hgPowerBox,
  hgDiagConsole,
  hgScissorLift,
  hgDeckLamp,
  hgCrate,
  hgCrateStack,
  hgPallet,
  hgToolWall,
  hgHoist,
  hgWall,
  hgWallOpenings,
  hgCeiling,
  CRATE_SIZES,
} from "./hangar_kit.js";

/** Storage rack row along z: uprights, level beams, containers on the beams (instanced). */
function rackRow(kit, x, z0, z1, levels, opts = {}) {
  const { depth = 3.0, bayLen = 4.0, levelH = 3.0, rand, accentKey = "emitAmber", ident = 1, face = 1 } = opts;
  const n = Math.round((z1 - z0) / bayLen);
  const H = levels * levelH + 0.4;
  const xs = [x - depth / 2, x + depth / 2];
  for (let i = 0; i <= n; i++) {
    const z = z0 + (i * (z1 - z0)) / n;
    for (const ux of xs) kit.box("impTrim", ux, H / 2, z, 0.26, H, 0.26, { color: PALETTE.impBlack, texel: 1 });
    // cross ties between the front and back uprights at every level
    for (let l = 0; l <= levels; l++) kit.box("impMetal", x, l * levelH + 0.3, z, depth, 0.12, 0.12, { color: PALETTE.impGreyDark });
    // diagonal brace in every other bay (back face)
    if (i < n && i % 2 === 0) {
      const g = new THREE.BoxGeometry(0.08, Math.hypot(bayLen, levelH) - 0.4, 0.08);
      kit.add("impMetal", g, { pos: [x - face * (depth / 2 - 0.02), levelH / 2 + 0.3, z + bayLen / 2], rot: [Math.atan2(bayLen, levelH), 0, 0], color: PALETTE.impGrey, texel: 1 });
    }
  }
  for (let l = 0; l <= levels; l++) {
    const y = l * levelH + 0.3;
    for (const ux of xs) kit.boxMM("impMetal", [ux - 0.1, y - 0.12, z0 - 0.15], [ux + 0.1, y + 0.12, z1 + 0.15], { color: PALETTE.impGreyDark, texel: 1 });
    // level ident strip on the aisle face
    if (l > 0) kit.boxMM(accentKey, [x + face * (depth / 2 + 0.11), y - 0.02, z0 + 0.3], [x + face * (depth / 2 + 0.13), y + 0.02, z1 - 0.3]);
  }
  // containers: each bay × level gets 0..2 containers, sizes chosen to fit the bay
  for (let i = 0; i < n; i++) {
    const zc = z0 + ((i + 0.5) * (z1 - z0)) / n;
    for (let l = 0; l < levels; l++) {
      const y = l * levelH + 0.42;
      const r = rand();
      if (r < 0.18) continue; // empty slot
      if (r < 0.55) {
        hgCrate(kit, "e", x, y, zc, (rand() - 0.5) * 0.04, Math.floor(rand() * 6));
      } else if (r < 0.85) {
        hgCrate(kit, "d", x, y, zc - 0.7, (rand() - 0.5) * 0.06, Math.floor(rand() * 6));
        if (rand() < 0.6) hgCrate(kit, "b", x + (rand() - 0.5) * 0.4, y, zc + 1.2, (rand() - 0.5) * 0.3, Math.floor(rand() * 6));
      } else {
        hgCrate(kit, "b", x - 0.5, y, zc - 1.0, (rand() - 0.5) * 0.3, Math.floor(rand() * 6));
        hgCrate(kit, "a", x + 0.5, y, zc + 0.6, (rand() - 0.5) * 0.3, Math.floor(rand() * 6));
        if (rand() < 0.5) hgCrate(kit, "c", x - 0.4, y + CRATE_SIZES.b[1], zc - 1.0, (rand() - 0.5) * 0.5, Math.floor(rand() * 6));
      }
    }
  }
  // bay numbers on the aisle-side uprights (deck level) and a row ident at the top
  for (let i = 0; i < n; i += 2) {
    const z = z0 + ((i + 0.5) * (z1 - z0)) / n;
    const g = new THREE.PlaneGeometry(0.9, 0.9).rotateY(face > 0 ? Math.PI / 2 : -Math.PI / 2);
    kit.add("hangar_decal", g, { pos: [x + face * (depth / 2 + 0.14), 1.4, z], uv: "keep", uvRect: hgDecalRect(hgNumber(i + 1)) });
  }
  const top = new THREE.PlaneGeometry(2.2, 2.2).rotateY(face > 0 ? Math.PI / 2 : -Math.PI / 2);
  kit.add("hangar_decal", top, { pos: [x + face * (depth / 2 + 0.14), H - 1.6, (z0 + z1) / 2], uv: "keep", uvRect: hgDecalRect(hgNumber(ident)) });
  // one collider for the whole row (the player walks the aisles, not the racks)
  kit.collider([x - depth / 2 - 0.15, 0, z0 - 0.2], [x + depth / 2 + 0.15, H, z1 + 0.2], "rack-row");
  // yellow floor line along the aisle face
  deckLine(kit, [x + face * (depth / 2 + 0.9), z0 - 0.5], [x + face * (depth / 2 + 0.9), z1 + 0.5], 0.14);
}
/** Roller conveyor along z at x from z0 to z1, top at height y, with a few containers riding it. */
function conveyor(kit, x, z0, z1, y, opts = {}) {
  const { rand, loads = 3 } = opts;
  const w = 1.3;
  kit.boxMM("impTrim", [x - w / 2, y - 0.2, z0], [x - w / 2 + 0.1, y, z1], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impTrim", [x + w / 2 - 0.1, y - 0.2, z0], [x + w / 2, y, z1], { color: PALETTE.impBlack, texel: 1 });
  for (let z = z0 + 0.25; z < z1; z += 0.4) inst(kit, "hg_roller", "impMetal", () => new THREE.CylinderGeometry(0.08, 0.08, w - 0.24, 10).rotateZ(Math.PI / 2), [x, y - 0.1, z], null, PALETTE.impGrey);
  for (let z = z0 + 0.4; z <= z1 - 0.3; z += 3) {
    for (const sx of [-w / 2 + 0.06, w / 2 - 0.06]) kit.box("impTrim", x + sx, (y - 0.2) / 2, z, 0.1, y - 0.2, 0.1, { color: PALETTE.impBlack });
    kit.box("impMetal", x, 0.06, z, w, 0.06, 0.4, { color: PALETTE.impCharcoal });
  }
  for (let k = 0; k < loads; k++) {
    const z = z0 + 1.5 + rand() * (z1 - z0 - 3);
    const size = rand() < 0.5 ? "b" : "a";
    hgCrate(kit, size, x, y - 0.02, z, (rand() - 0.5) * 0.15, Math.floor(rand() * 6));
  }
  kit.collider([x - w / 2, 0, z0], [x + w / 2, y + 0.2, z1], "conveyor");
  // end stop + photo-eye posts
  for (const z of [z0 - 0.1, z1 + 0.1]) {
    kit.box("chevronY", x, y - 0.1, z, w, 0.4, 0.15, { texel: 1.5 });
    kit.box("impTrim", x + w / 2 + 0.25, 0.6, z, 0.08, 1.2, 0.08, { color: PALETTE.impBlack });
    kit.box("emitGreen", x + w / 2 + 0.25, 1.1, z, 0.06, 0.06, 0.06);
  }
}

/** Cargo loader vehicle (static): chassis, wheels, cab, mast with a container on the forks. */
function loader(kit, x, z, yaw, opts = {}) {
  const { load = true, accentKey = "emitAmber", beacons = null, seed = 1 } = opts;
  const P = new Placer(kit, x, 0, z, yaw);
  P.box("impTrim", 0, 0.75, 0.3, 2.2, 0.7, 3.4, { color: PALETTE.impBlack, texel: 1 });
  P.box("chevronY", 0, 0.5, 0.3, 2.22, 0.2, 3.42, { texel: 1.5 });
  P.box("impMetal", 0, 1.25, 1.2, 2.0, 0.3, 1.6, { color: PALETTE.impGreyDark, texel: 1 });
  for (const [sx, sz] of [[-1.05, -0.9], [1.05, -0.9], [-1.05, 1.5], [1.05, 1.5]]) {
    P.cyl("rubber", sx, 0.5, sz, 0.5, 0.4, "x", { color: PALETTE.impCharcoal, segments: 16 });
    P.cyl("impMetal", sx, 0.5, sz, 0.2, 0.44, "x", { color: PALETTE.impGrey, segments: 10 });
  }
  // cab at the rear: seat, controls, roll cage with an amber beacon
  P.box("impTrim", 0, 1.45, 1.6, 0.6, 0.12, 0.6, { color: PALETTE.impBlack });
  P.box("rubber", 0, 1.9, 1.85, 0.6, 0.8, 0.12, { color: PALETTE.impGreyDark, tilt: -0.15 });
  P.box("impTrim", 0, 1.6, 0.6, 1.0, 0.1, 0.4, { color: PALETTE.impBlack, tilt: 0.3 });
  for (let k = 0; k < 3; k++) P.box([accentKey, "emitGreen", "emitRedImp"][k], -0.25 + k * 0.25, 1.66, 0.55, 0.08, 0.03, 0.08);
  for (const sx of [-0.9, 0.9]) {
    P.box("impMetal", sx, 2.3, 1.9, 0.1, 1.8, 0.1, { color: PALETTE.impGrey });
    P.box("impMetal", sx, 2.3, 0.2, 0.1, 1.8, 0.1, { color: PALETTE.impGrey });
  }
  P.box("impTrim", 0, 3.2, 1.05, 2.0, 0.1, 1.9, { color: PALETTE.impBlack, texel: 1 });
  if (beacons) {
    const b = P.p(0, 3.4, 1.05);
    beacons.push([b.x, b.y, b.z, 0.3, 0.3, 0.3]);
  }
  // mast at the front, fork carriage, forks, container
  for (const sx of [-0.8, 0.8]) P.box("impMetal", sx, 2.2, -1.6, 0.2, 4.2, 0.3, { color: PALETTE.impGreyDark, texel: 1 });
  P.box("impTrim", 0, 4.25, -1.6, 1.9, 0.2, 0.3, { color: PALETTE.impBlack });
  const fy = load ? 1.0 : 0.3;
  P.box("impTrim", 0, fy + 0.5, -1.75, 1.9, 1.0, 0.16, { color: PALETTE.impBlack, texel: 1 });
  for (const sx of [-0.55, 0.55]) P.box("impMetal", sx, fy + 0.05, -3.0, 0.16, 0.1, 2.4, { color: PALETTE.impGrey });
  if (load) {
    const c = P.p(0, fy + 0.1, -3.05);
    hgCrate(kit, "d", c.x, c.y, c.z, yaw, seed);
  }
  P.box("impTrim", 0, 1.0, -1.3, 1.0, 0.5, 0.5, { color: PALETTE.impBlack, texel: 1 }); // hydraulics
  P.cyl("impMetal", -0.5, 2.5, -1.2, 0.06, 3.0, "y", { color: PALETTE.impGrey, segments: 8 });
  P.collider(-1.3, 0, -1.9, 1.3, 3.3, 2.1, "loader");
  if (load) P.collider(-1.25, 0, -4.3, 1.25, 3.4, -1.9, "loader-load");
  P.decal(IMP_DECAL.hazard, -1.11, 0.85, 0.4, 0.4, "-x");
  P.decal(IMP_DECAL.hazard, 1.11, 0.85, 0.4, 0.4, "+x");
}

export function buildCargo(kit, ctx, room) {
  hgSetup(kit);
  const materials = kit.materials;
  const [W, H, D] = room.size;
  const hx = W / 2;
  const hz = D / 2;
  const accentKey = "emitAmber";
  const rand = rng(1313);
  const amberBlink = [];
  const redBlink = [];

  // ---- lift platform (aft end of the aisle) and its channel
  const LP = { x0: -4, x1: 4, z0: 17, z1: 25 };
  const chan = 0.4;
  const LC = { x0: LP.x0 - chan, x1: LP.x1 + chan, z0: LP.z0 - chan, z1: LP.z1 + chan };

  // ---- deck (split around the lift channel), seams, aisle markings
  const deck = (x0, z0, x1, z1) => kit.boxMM("impDeck", [x0, -0.14, z0], [x1, 0, z1], { color: PALETTE.impGreyDark, texel: 0.35 });
  deck(-hx, -hz, hx, LC.z0);
  deck(-hx, LC.z1, hx, hz);
  deck(-hx, LC.z0, LC.x0, LC.z1);
  deck(LC.x1, LC.z0, hx, LC.z1);
  for (let x = -30; x <= 30; x += 10) if (Math.abs(x) > 5) kit.boxMM("impTrim", [x - 0.04, 0.0005, -hz + 0.5], [x + 0.04, 0.006, hz - 0.5], { color: PALETTE.impBlack, texel: 1 });
  for (let z = -20; z <= 20; z += 10) if (z < 15 || z > 27) kit.boxMM("impTrim", [-hx + 0.5, 0.0005, z - 0.04], [hx - 0.5, 0.006, z + 0.04], { color: PALETTE.impBlack, texel: 1 });
  // central aisle (x -6..6) from the door to the lift: chevron edges, dashed centre, keep-clear
  kit.boxMM("chevronY", [-6.3, 0.002, -hz + 0.6], [-5.7, 0.011, LC.z0 - 0.8], { texel: 0.8 });
  kit.boxMM("chevronY", [5.7, 0.002, -hz + 0.6], [6.3, 0.011, LC.z0 - 0.8], { texel: 0.8 });
  dashedLine(kit, [0, -hz + 1.5], [0, LC.z0 - 1.6], { dash: 2.4, gap: 1.8, w: 0.25 });
  deckDecal(kit, HG_DECAL.launch, 0, -20, 4.0, Math.PI, 0.0065);
  deckDecalImp(kit, IMP_DECAL.keepClear, 0, -8, 2.6, 0, 0.0068);
  deckDecalImp(kit, IMP_DECAL.keepClear, 0, 8, 2.6, 0, 0.0068);
  kit.boxMM("chevronY", [-9.5, 0.002, -hz + 0.2], [9.5, 0.012, -hz + 1.4], { texel: 0.6 });
  // cross aisles at z = -12 and z = 6
  for (const z of [-12, 6]) dashedLine(kit, [-37, z], [37, z], { dash: 2, gap: 2, w: 0.18 });

  // ---- lift platform: recessed slab, hazard frame, channel lights, corner posts, railing on 3 sides
  kit.boxMM("impMetalRough", [LC.x0, -0.56, LC.z0], [LC.x1, -0.42, LC.z1], { color: PALETTE.impBlack, texel: 0.5 });
  kit.boxMM("impMetalRough", [LP.x0, -0.42, LP.z0], [LP.x1, 0, LP.z1], { color: PALETTE.impCharcoal, texel: 0.4 });
  kit.floor(LP.x0, LP.z0, LP.x1, LP.z1, 0, "lift-platform");
  kit.collider([LP.x0, -0.42, LP.z0], [LP.x1, -0.02, LP.z1], "lift-slab");
  kit.colliders[kit.colliders.length - 1].walkable = true;
  hgHazardBorder(kit, LP.x0, LP.z0, LP.x1, LP.z1, 0.6, 0.001);
  hgHazardBorder(kit, LC.x0 - 0.6, LC.z0 - 0.6, LC.x1 + 0.6, LC.z1 + 0.6, 0.6, 0.001);
  kit.boxMM("emitAmber", [LP.x0 - 0.03, -0.3, LP.z0], [LP.x0, -0.2, LP.z1]);
  kit.boxMM("emitAmber", [LP.x1, -0.3, LP.z0], [LP.x1 + 0.03, -0.2, LP.z1]);
  kit.boxMM("emitAmber", [LP.x0, -0.3, LP.z0 - 0.03], [LP.x1, -0.2, LP.z0]);
  kit.boxMM("emitAmber", [LP.x0, -0.3, LP.z1], [LP.x1, -0.2, LP.z1 + 0.03]);
  deckDecal(kit, hgNumber(9), 0, (LP.z0 + LP.z1) / 2, 3.6, 0, 0.0065);
  for (const [cx, cz] of [[LC.x0 - 0.9, LC.z0 - 0.9], [LC.x1 + 0.9, LC.z0 - 0.9], [LC.x0 - 0.9, LC.z1 + 0.9], [LC.x1 + 0.9, LC.z1 + 0.9]]) {
    kit.box("impTrim", cx, 1.0, cz, 0.8, 2.0, 0.8, { color: PALETTE.impBlack, texel: 1 });
    kit.box("chevronY", cx, 0.4, cz, 0.82, 0.5, 0.82, { texel: 1.5 });
    kit.cyl("impMetal", cx, 2.4, cz, 0.2, 0.8, "y", { color: PALETTE.impGrey, segments: 12 });
    kit.box("impTrim", cx, 2.95, cz, 0.55, 0.3, 0.55, { color: PALETTE.impBlack });
    amberBlink.push([cx, 3.25, cz, 0.28, 0.28, 0.28]);
    kit.collider([cx - 0.4, 0, cz - 0.4], [cx + 0.4, 3.1, cz + 0.4], "lift-post");
  }
  // lift shaft head frame overhead (the lift is static): gantry beams + hoist over the platform
  hgHoist(kit, "x", -12, 12, (LP.z0 + LP.z1) / 2, H - 1.1, 0, 6.5, { accentKey, beacons: amberBlink });
  // lift control pedestal and a railing along the S wall side of the channel
  hgDiagConsole(kit, 7.2, LC.z1 + 1.6, -Math.PI / 2, { seed: 81, screens: ["scrAmber0", "scrAmber1"], w: 1.4, tall: true });
  hgRailing(kit, [LC.x0 - 0.3, LC.z1 + 0.35], [LC.x1 + 0.3, LC.z1 + 0.35], 0, { h: 1.05, light: accentKey, tag: "lift-rail" });

  // ---- rack rows: two pairs either side of the aisle, 4 levels, containers instanced
  const rackZ0 = -22;
  const rackZ1 = 14;
  const rows = [
    { x: -12.5, face: -1, ident: 1 },
    { x: -26.5, face: 1, ident: 2 },
    { x: 12.5, face: 1, ident: 3 },
    { x: 26.5, face: -1, ident: 4 },
  ];
  for (const r of rows) rackRow(kit, r.x, rackZ0, rackZ1, 4, { rand, accentKey, ident: r.ident, face: r.face });
  // giant row numbers on the deck at the aisle ends
  for (const r of rows) deckDecal(kit, hgNumber(r.ident), r.x + r.face * 4.2, rackZ0 - 3.2, 2.4, 0, 0.0068);

  // ---- conveyors in the side aisles (x = ±19.5) feeding the cross aisle at z = 6
  conveyor(kit, -19.5, -20, 4.5, 0.85, { rand, loads: 4 });
  conveyor(kit, 19.5, -20, 4.5, 0.85, { rand, loads: 3 });
  for (const x of [-19.5, 19.5]) {
    hgPowerBox(kit, x + 2.2, 6.2, Math.PI);
    deckDecalImp(kit, IMP_DECAL.arrowRight, x, 7.2, 1.6, Math.PI / 2, 0.0068);
  }

  // ---- loaders, staging pallets, consoles, crews' clutter
  loader(kit, -8.5, 10, Math.PI * 0.5 + 0.2, { accentKey, beacons: amberBlink, seed: 2 });
  loader(kit, 20, 20, -Math.PI * 0.35, { accentKey, beacons: amberBlink, seed: 4, load: false });
  loader(kit, -21, 22, Math.PI * 0.1, { accentKey, beacons: amberBlink, seed: 5 });
  for (const [x, z, kind, yaw] of [[-32, 22, 0, 0.1], [-35, 26, 1, -0.1], [-28, 26.5, 2, 0.2], [32, 22, 1, 0], [35.5, 26.5, 0, 0.15], [28.5, 26, 2, -0.2], [34, -24, 2, 0.1], [-34, -25, 0, -0.15]]) hgPallet(kit, x, z, yaw, { seed: 90 + Math.abs(x) + z, kind });
  hgHazardBorder(kit, -38, 19.5, -25, 29.5, 0.4);
  hgHazardBorder(kit, 25, 19.5, 38, 29.5, 0.4);
  hgCrateStack(kit, 9, -26.5, 0.1, [["b", 0, 0, 0], ["a", 1.6, 0, 0.1, 0.3], ["c", 0.2, 1.2, 0, 0.7], ["c", 1.5, 1.0, 0.1, 0.1]], { seed: 101 });
  hgCrateStack(kit, -9.5, -26.5, -0.15, [["a", 0, 0, 0], ["b", 1.5, 0, 0.1, 0.2], ["a", 0.1, 1.0, 0, 0.5]], { seed: 102 });
  hgCrateStack(kit, 0, 28, 0.05, [["e", 0, 0, 0], ["b", -0.6, 2.4, 0.2, 0.3], ["c", 1.1, 2.4, -0.3, 0.9]], { seed: 103, decal: true });
  // manifest stations: supervisor desk at the door, checkpoint consoles at the cross aisles
  hgDiagConsole(kit, 9.5, -21, Math.PI, { seed: 83, screens: ["scrAmber1", "scrBlue0"], tall: true, cableTo: [11.5, -24] });
  impChair(kit, 9.5, 0, -19.6, Math.PI);
  hgDiagConsole(kit, -9.5, -21, Math.PI, { seed: 84, screens: ["scrAmber0", "scrAmber1"], tall: true });
  hgDiagConsole(kit, 8.2, 3.8, -Math.PI / 2, { seed: 85, screens: ["scrAmber0", "scrGreen0"], w: 1.4 });
  hgDiagConsole(kit, -8.2, -14.2, Math.PI / 2, { seed: 86, screens: ["scrAmber1", "scrRed0"], w: 1.4 });
  hgToolCart(kit, 15.5, 9.5, 0.7, { seed: 19 });
  hgScissorLift(kit, -33, -14, Math.PI / 2 + 0.1, 3.6);
  hgScissorLift(kit, 33.5, -6, Math.PI / 2 - 0.2, 4.4);
  hgPowerBox(kit, -36.5, -1, Math.PI / 2);
  hgPowerBox(kit, 36.5, 1, -Math.PI / 2, { on: false });
  // deck marker lamps along the aisle
  for (let z = -24; z <= 12; z += 6) {
    hgDeckLamp(kit, -6.9, z, "emitAmber");
    hgDeckLamp(kit, 6.9, z, "emitAmber");
  }

  // ---- walls: 14 m industrial; blast door on the N wall (u = lx + 40)
  const walls = roomWalls(kit, room);
  const wallOpts = { ribPitch: 10, plateH: 5, rowH: 3, floodV: 11.6, floodAim: 14, accentKey, bigDecals: false, ducts: false, lightKey: "emitWhiteSoft" };
  const nOpen = hgWallOpenings(room, ctx.doors, "N");
  hgWall(walls.N.frame, W, H, { ...wallOpts, openings: nOpen, seed: 401, tag: "cgN" });
  hgWall(walls.S.frame, W, H, { ...wallOpts, openings: hgWallOpenings(room, ctx.doors, "S"), seed: 403, tag: "cgS", features: { gear: 0.25, light: 0.15, vent: 0.15, pipes: 0.15, cabinet: 0.1, stencil: 0.1 } });
  hgWall(walls.W.frame, D, H, { ...wallOpts, openings: hgWallOpenings(room, ctx.doors, "W"), seed: 407, tag: "cgW" });
  hgWall(walls.E.frame, D, H, { ...wallOpts, openings: hgWallOpenings(room, ctx.doors, "E"), seed: 409, tag: "cgE" });
  for (const o of nOpen) {
    const f = walls.N.frame;
    for (const e of [o.u0 - 1.5, o.u1 + 1.5]) {
      const p = f.pos(e, o.v1 + 1.2, 0.62);
      f.box("impTrim", e, o.v1 + 1.2, 0.32, 0.6, 0.6, 0.6, { color: PALETTE.impBlack, texel: 1 });
      redBlink.push([p.x, p.y, p.z, 0.4, 0.4, 0.1]);
    }
    f.box("chevronY", (o.u0 + o.u1) / 2, o.v1 + 0.3, 0.2, o.u1 - o.u0 + 2.6, 0.45, 0.4, { texel: 0.8 });
    f.decal(IMP_DECAL.hazard, (o.u0 + o.u1) / 2, o.v1 + 1.3, 0.08, 1.2);
  }
  // stencils and a tool wall on the S wall (u = 40 - lx), manifest board on the E wall
  walls.S.frame.decal(IMP_DECAL.bay03, 40, 10.5, 0.08, 4.5);
  hgToolWall(walls.S.frame, 26, 3.8, { seed: 36, accentKey, tag: "bench" }); // lx 14
  hgToolWall(walls.S.frame, 54, 3.8, { seed: 37, accentKey, tag: "bench" }); // lx -14
  {
    const f = walls.E.frame;
    f.box("impTrim", 30, 2.4, 0.12, 5.2, 2.6, 0.24, { color: PALETTE.impBlack, texel: 1 });
    f.screen("scrAmber1", 28.9, 2.5, 0.25, 2.2, 1.6);
    f.screen("scrAmber0", 31.3, 2.5, 0.25, 2.2, 1.6);
    f.box("impMetal", 30, 3.85, 0.2, 5.0, 0.12, 0.3, { color: PALETTE.impGreyDark });
    f.box("emitWhiteSoft", 30, 3.8, 0.34, 4.6, 0.03, 0.02, { uv: "keep" });
    f.collider(27.3, 32.7, 0, 3.9, 0, 0.3, "board");
  }

  // ---- ceiling: beams across x every 10 m, three light troughs, ducts along the side walls
  hgCeiling(kit, -hx, -hz, hx, hz, H, { beamStep: 10, beamAxis: "x", troughsX: [-19.5, 0, 19.5], ductsX: [-37.5, 37.5], lightKey: "emitWhiteSoft", beamH: 0.9 });

  // ---- lights: amber over the aisle and the lift, warm white over the side aisles, red at the door
  const amber = 0xffb45a;
  // three aisle floods + two rack-face lights (≈2.5× the default per-fixture output) + red door beacon
  kit.light({ type: "point", pos: [0, 12, -16], color: amber, intensity: lux(12, 2.8), distance: 64, priority: 0.62 });
  kit.light({ type: "point", pos: [0, 12, 2], color: amber, intensity: lux(12, 2.8), distance: 64, priority: 0.61 });
  kit.light({ type: "point", pos: [0, 11, 21], color: amber, intensity: lux(11, 2.6), distance: 56, priority: 0.58 });
  kit.light({ type: "point", pos: [-19.5, 12, -8], color: 0xffd7a0, intensity: lux(12, 2.0), distance: 52, priority: 0.5 });
  kit.light({ type: "point", pos: [19.5, 12, -8], color: 0xffd7a0, intensity: lux(12, 2.0), distance: 52, priority: 0.49 });
  kit.light({ type: "point", pos: [0, 8, -28], color: 0xff3b2e, intensity: lux(8, 0.6), distance: 20, priority: 0.3 });

  // ---- animated beacons
  hgBeacons(kit, materials, "emitRedImp", redBlink, { period: 1.5, duty: 0.42, min: 0.15, max: 3.6 });
  hgBeacons(kit, materials, "emitAmber", amberBlink, { period: 2.0, duty: 0.5, phase: 0.1, min: 0.2, max: 3.2 });
}
