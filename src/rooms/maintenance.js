// Maintenance & Repair Bay (deck D). A yellow gantry crane on wall rails traverses the room with a
// hook block; three workbenches with tool boards along the N wall; a part-disassembled maintenance
// droid on a clamp stand; a fighter wing panel (hex plating) leaning on an A-frame stand; a welding
// station behind dark screens under an extraction hood with a flickering arc and a hard white spot;
// parts shelving with instanced bins; a scissor parts lift in the SW corner; cable reels, a hydraulic
// press, a drill press; a painted dashed vehicle lane from the blast door (geometry lines and bars, no
// textured stripes to stair-step), faint oil under the machines only.
// Light: the crane bridge sweeps the whole middle of the room just under the ceiling, so nothing hangs
// there: two flush hooded downlights (spots) pool light on the bays, two hooded pendants over the lane
// at either end (outside the bridge's travel) and a portable work-light stand light the rest, all
// amber-white (the deck's workshop temperature, shared with engineering); the amber pendant over the
// benches, the hard white welding lamp on the extraction duct and the parts-lift lamp are the
// practicals; the ceiling slots are dim recessed lines, never the key.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRailing, impWallGear, impWallLight, impCrate, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { rng, prism } from "../kit.js";
import { ensureDeckDMaterials, shellNoFloor, deckFloor, pipe, pipePath, valveWheel, gauge, junctionBox, hazardBorder, dashedLine, decalD, decalImp, DECK_D_DECAL, wallU, warningLamp, cable, assembly, blinkerField, instGeo, pendantLamp, shroudLamp } from "./deck_d_kit.js";

const YEL = PALETTE.yellow;
const UP = new THREE.Vector3(0, 1, 0);
const DIM = "emitAmberDim"; // amber practicals: wall lights, pendant lens, ceiling coffer accents

// Blinking lamps from every prop are collected here and built as ONE InstancedMesh at the end of the
// build (blinkers() costs a mesh per lamp; the room's mesh budget is 40).
const BLINK = { emitAmber: 0xffb040, emitRedImp: 0xff3b2e, emitGreen: 0x4fe08a, emitWhite: 0xffffff, emitCyan: 0x7fd8ff };
let blinks = [];
const blink = (pos, size, key, period, duty, phase = 0) => blinks.push({ pos, size, color: BLINK[key], period, duty, phase });

export function buildMaintenance(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = "emitAmber";
  const amber = 0xffb040;
  ensureDeckDMaterials(kit);
  const rand = rng(7719);
  blinks = [];

  // --- shell + deck
  // N / E walls are covered by benches and shelving: plain panels there so nothing pokes through
  const plain = { vent: 0, equipment: 0, conduit: 0, light: 0, screen: 0 };
  const walls = shellNoFloor(kit, room, ctx.doors, {
    accentKey,
    seed: 2207,
    wall: { panelW: 2.0, features: { vent: 0.15, equipment: 0, conduit: 0, light: 0.0, screen: 0.06 }, altChance: 0.4, panelColor: PALETTE.impGrey, panelColorAlt: PALETTE.impGreyDark },
    walls: { N: { features: plain, altChance: 0.5 }, E: { features: plain, altChance: 0.5 } },
    ceiling: { troughs: 2, troughW: 0.36, beamStep: 3.4, accentKey: DIM, lightKey: "roomsd_slotWarm" },
  });
  deckFloor(kit, -hx, -hz, hx, hz, []);
  // vehicle lane from the blast door: plain tile between two painted dashed yellow lines (geometry, so
  // the edges never stair-step), a solid stop bar at its end, deck stencils
  for (const s of [-1, 1]) dashedLine(kit, -hx + 0.3, s * 1.6, 14.2, s * 1.6, { w: 0.14, dash: 1.0, gap: 0.7 });
  kit.boxMM("impPanel1", [14.1, 0.002, -1.67], [14.3, 0.01, 1.67], { color: YEL, uv: "world", texel: 1 });
  decalImp(kit, IMP_DECAL.arrowRight, [-13.0, 0.016, 0], "up", 1.0, { spin: Math.PI });
  decalImp(kit, IMP_DECAL.keepClear, [-9.5, 0.016, 0], "up", 1.0, { spin: Math.PI / 2 });
  decalImp(kit, IMP_DECAL.bay02, [12.6, 0.016, 0], "up", 1.2, { spin: Math.PI / 2 });
  // wear: large faint oil smudges under the machines only (press, reels, welder), grime in the corners
  for (const [x, z, s] of [[1.4, -9.4, 2.6], [-14.4, -5.8, 2.4], [10.8, 8.0, 2.2]]) decalD(kit, DECK_D_DECAL.oil, [x, 0.018, z], "up", s, { spin: rand() * 3 });
  decalD(kit, DECK_D_DECAL.grime, [-14.2, 0.018, 4.8], "up", 2.8);
  decalD(kit, DECK_D_DECAL.grime, [14.6, 0.018, 9.4], "up", 2.4);

  // --- workbenches + tool boards along the N wall
  const N = walls.N.frame;
  for (const [i, bx] of [-12.2, -8.0, -3.8].entries()) workbench(kit, N, room, bx, 3.4, { seed: 100 + i, accentKey });
  // drill press between the benches and the corner, cable reels in the NW corner
  drillPress(kit, -15.2, -10.8);
  cableReel(kit, -15.2, -7.2, "z", { seed: 12 });
  cableReel(kit, -15.0, -4.4, "z", { seed: 13, small: true });

  // --- hydraulic press + droid stand + tool cart in the N-centre bay
  hydraulicPress(kit, N, room, 1.4);
  droidStand(kit, 5.2, -6.6, { accentKey, rand });

  // --- parts shelving: N wall east part + E wall both sides of the end of the lane
  shelving(kit, 10.6, -hz + 0.36, 4.2, 2.7, "+z", { rand });
  shelving(kit, 15.0, -hz + 0.36, 3.4, 2.7, "+z", { rand });
  shelving(kit, hx - 0.36, -6.0, 4.4, 2.7, "-x", { rand });
  shelving(kit, hx - 0.36, 6.0, 4.4, 2.7, "-x", { rand });
  {
    // end of the lane: bay stencils, junction box, fire cabinet, eyewash
    const E = walls.E.frame;
    E.decal(IMP_DECAL.bay02, wallU(room, "E", -1.1), 3.9, 0.03, 1.6);
    E.decal(IMP_DECAL.cog, wallU(room, "E", 1.1), 3.9, 0.03, 1.6);
    junctionBox(E, wallU(room, "E", -2.4), 1.9, 0.9, 1.1, { seed: 210, accentKey });
    E.box("impTrim", wallU(room, "E", 1.6), 1.6, 0.16, 0.7, 1.0, 0.32, { color: PALETTE.impRed, texel: 1 });
    E.box("impGloss", wallU(room, "E", 1.6), 1.7, 0.325, 0.5, 0.5, 0.01);
    E.box("emitRedImp", wallU(room, "E", 1.6), 2.2, 0.325, 0.5, 0.05, 0.01);
    E.decal(IMP_DECAL.hazard, wallU(room, "E", 1.6), 1.25, 0.33, 0.28);
    E.collider(wallU(room, "E", 1.2), wallU(room, "E", 2.0), 0, 2.2, 0, 0.4, "fireCab");
    E.box("impMetal", wallU(room, "E", 2.6), 1.1, 0.2, 0.5, 0.12, 0.4, { color: PALETTE.impGrey, texel: 1 });
    E.box("impMetal", wallU(room, "E", 2.6), 0.55, 0.16, 0.08, 1.1, 0.08, { color: PALETTE.impGreyDark });
    E.box("emitGreen", wallU(room, "E", 2.6), 1.75, 0.02, 0.35, 0.35, 0.01);
    impWallLight(E, wallU(room, "E", 0), h - 0.7, { key: DIM, w: 1.4 });
  }

  // --- S side: wing panel on its stand, welding station, parts lift
  wingPanel(kit, -5.0, 7.4, { rand });
  weldingStation(kit, walls.S.frame, room, 9.2, 7.0, h, { accentKey });
  partsLift(kit, -13.6, 8.4, h, { accentKey });
  {
    // S wall between the lift and the wing: hose reel, tool crib board, stencil; scorch near the welding bay
    const S = walls.S.frame;
    const u = wallU(room, "S", -9.6);
    S.box("impTrim", u, 1.5, 0.08, 0.5, 0.5, 0.16, { color: PALETTE.impBlack });
    S.add("impMetalRough", new THREE.TorusGeometry(0.42, 0.12, 10, 24), u, 1.5, 0.3, { color: PALETTE.impBlack, uv: "scale", uvScale: [6, 1] });
    S.cylN("impMetal", u, 1.5, 0.2, 0.1, 0.4, { color: PALETTE.impGrey, segments: 12 });
    S.collider(u - 0.6, u + 0.6, 0.9, 2.1, 0, 0.5, "hoseReel");
    S.decal(IMP_DECAL.glyphs3, u, 2.4, 0.03, 0.5);
    impWallGear(S, wallU(room, "S", -1.0), 1.6, { seed: 220, accentKey });
    S.decal(IMP_DECAL.restricted, wallU(room, "S", 2.2), 3.2, 0.03, 0.7);
    decalD(kit, DECK_D_DECAL.scorch, [7.2, 1.6, hz - 0.075], "-z", 1.8);
    impWallLight(S, wallU(room, "S", -5.0), h - 0.7, { key: DIM, w: 1.4 });
  }
  {
    // W wall (door wall): sign decals, warning lamp over the blast door, breaker-ish gear
    const W = walls.W.frame;
    W.decal(IMP_DECAL.arrowUp, wallU(room, "W", -2.8), 3.2, 0.03, 0.6);
    W.decal(IMP_DECAL.hazard, wallU(room, "W", 2.8), 3.2, 0.03, 0.6);
    W.decal(IMP_DECAL.glyphs1, wallU(room, "W", 0), 3.9, 0.03, 0.7);
    const lp = W.pos(wallU(room, "W", 0), 3.35, 0.18);
    warningLamp(kit, [lp.x, lp.y, lp.z], accentKey);
    blink([lp.x, lp.y, lp.z], [0.12, 0.1, 0.12], accentKey, 1.6, 0.5);
    impWallGear(W, wallU(room, "W", 6.0), 1.6, { seed: 230, accentKey });
    junctionBox(W, wallU(room, "W", -6.2), 2.0, 0.8, 1.0, { seed: 231, accentKey });
    W.decal(IMP_DECAL.bay01, wallU(room, "W", 8.8), 3.8, 0.03, 1.2);
  }
  // crates by the door (out of the lane)
  impCrate(kit, -14.6, 0, 3.4, 1.3, 0.9, 1.1, { seed: 21, decal: IMP_DECAL.bay02 });
  impCrate(kit, -13.3, 0, 3.6, 0.9, 0.6, 0.9, { seed: 22, decal: IMP_DECAL.glyphs2 });
  impCrate(kit, -14.6, 0.9, 3.4, 0.9, 0.6, 0.8, { seed: 23, decal: IMP_DECAL.bay03 });

  // --- gantry crane: wall rails along x, bridge across z with a trolley + hook block, traversing
  // (travel stops short of the welding station's duct riser at x = 9.2 and its duct along the S wall)
  gantryCrane(kit, room, { travel: [-6.5, 8.3], trolleyZ: -3.6 });

  // --- lights (8). Work light: two hooded pendants over the lane, hung outside the bridge's travel
  // (x < -6.8 and x > 8.6); two hooded downlights flush with the ceiling over the bays, as spots aimed
  // straight down (the cone never touches the ceiling or the hood's own reflector, so the fixture reads
  // as a dim lens in a black hood, and the dark girder passing under them just catches the light); a
  // portable work-light stand by the droid. Practicals: the dim amber pendant over the benches, the
  // hard white welding lamp clamped to the extraction duct, the parts-lift lamp. Three spots in all:
  // the pool has three spot slots and the current cell's lights always win them.
  const work = 0xffe0bc; // amber-white, as in engineering
  const WARM = "roomsd_warmLow";
  for (const [i, x] of [-10.5, 11.5].entries()) {
    // low pendant, source 30 cm under the hood mouth with linear falloff: dark hood, dim lens, no ceiling blob
    const mouth = shroudLamp(kit, [x, h - 0.08, 0], [x, 4.3, 0], [x, 0, 0], { key: WARM, size: 0.55 });
    kit.light({ type: "point", pos: [mouth[0], mouth[1] - 0.3, mouth[2]], color: work, intensity: 4.4 * 3.8, decay: 1, distance: 18, priority: 0.6 - i * 0.01 });
  }
  for (const [i, [x, z]] of [[3.5, -5.0], [-2.5, 5.2]].entries()) {
    // flush hooded downlight: the spot's source sits in the hood mouth, so the cone lights the bay below and
    // neither the hood interior nor the ceiling
    const mouth = shroudLamp(kit, [x, h - 0.05, z], [x, h - 0.32, z], [x, 0, z], { key: WARM, size: 0.5 });
    kit.light({ type: "spot", pos: [mouth[0], mouth[1] - 0.08, mouth[2]], target: [x, 0, z], color: work, intensity: lux(h - 0.5, 6.2), distance: 18, angle: 1.15, penumbra: 0.4, priority: 0.62 - i * 0.01 });
  }
  {
    const [x, z, target] = [2.8, -4.6, [5.2, 1.0, -6.6]];
    workLightStand(kit, x, z, target);
    const dx = target[0] - x;
    const dz = target[2] - z;
    const L = Math.hypot(dx, dz);
    kit.light({ type: "point", pos: [x + (dx / L) * 0.35, 2.32, z + (dz / L) * 0.35], color: work, intensity: lux(2.4, 3.0), distance: 14, priority: 0.58 });
  }
  pendantLamp(kit, -8.0, 3.6, -9.6, h, DIM);
  kit.light({ type: "point", pos: [-8.0, 3.6, -9.6], color: amber, intensity: lux(3.6, 2.0), distance: 13, priority: 0.55 });
  // welding lamp: hood on a bracket off the extraction duct riser, spot straight down onto the table
  kit.box("impTrim", 9.2, 4.38, 6.78, 0.08, 0.08, 0.44, { color: PALETTE.impBlack });
  shroudLamp(kit, [9.2, 4.42, 6.6], [9.2, 4.12, 6.62], [9.2, 0.9, 7.0], { key: "emitWhiteDim", size: 0.3 });
  kit.light({ type: "spot", pos: [9.2, 4.0, 6.65], target: [9.2, 0.9, 7.0], color: 0xffffff, intensity: lux(3.1, 4.5), distance: 9, angle: 0.5, penumbra: 0.35, priority: 0.57 });
  kit.light({ type: "point", pos: [-13.6, 4.4, 8.4], color: amber, intensity: lux(4.1, 1.5), distance: 10, priority: 0.42 });

  blinkerField(kit, blinks, { intensity: 2.4 });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
/**
 * Portable work-light stand: rubber-footed tripod, telescopic mast with a clamp collar, a crossbar
 * across the aim direction carrying two hooded heads aimed at `target`. The caller adds the point light
 * just in front of the heads.
 */
function workLightStand(kit, x, z, target) {
  const top = 2.1;
  kit.cyl("impMetal", x, 0.75, z, 0.04, 1.3, "y", { color: PALETTE.impGreyDark, segments: 8 });
  kit.cyl("impMetal", x, 1.75, z, 0.028, 0.75, "y", { color: PALETTE.impGrey, segments: 8 });
  kit.cyl("impTrim", x, 1.42, z, 0.06, 0.16, "y", { color: PALETTE.impBlack, segments: 8 });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.4;
    kit.add("impMetal", new THREE.BoxGeometry(0.04, 1.2, 0.04), { pos: [x + Math.cos(a) * 0.3, 0.56, z + Math.sin(a) * 0.3], rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], color: PALETTE.impGreyDark });
    kit.box("rubber", x + Math.cos(a) * 0.58, 0.03, z + Math.sin(a) * 0.58, 0.1, 0.06, 0.1, { color: PALETTE.impBlack });
  }
  const yaw = Math.atan2(target[0] - x, target[2] - z);
  const px = Math.cos(yaw);
  const pz = -Math.sin(yaw);
  kit.add("impTrim", new THREE.BoxGeometry(0.8, 0.06, 0.06), { pos: [x, top, z], rot: [0, yaw, 0], color: PALETTE.impBlack });
  for (const s of [-1, 1]) {
    const hx = x + px * s * 0.28;
    const hz = z + pz * s * 0.28;
    shroudLamp(kit, [hx, top + 0.03, hz], [hx, top + 0.2, hz], target, { key: "emitWhiteDim", size: 0.26 });
  }
  cable(kit, [[x + 0.04, 1.5, z], [x + 0.35, 0.6, z + 0.3], [x + 0.9, 0.02, z + 0.7], [x + 2.2, 0.02, z + 0.9]], 0.018, { color: PALETTE.impBlack });
  kit.collider([x - 0.65, 0, z - 0.65], [x + 0.65, 2.5, z + 0.65], "lightStand");
}

/** Workbench against the N wall at x = bx (len along x), tool board on the wall frame above it. */
function workbench(kit, N, room, bx, len, opts) {
  const { seed = 1, accentKey = "emitAmber" } = opts;
  const rand = rng(seed);
  const hz = room.size[2] / 2;
  const depth = 0.9;
  const bz = -hz + 0.12 + depth / 2;
  const topY = 0.9;
  // frame, top, lower shelf, drawer block
  kit.box("impMetal", bx, topY - 0.03, bz, len, 0.06, depth, { color: PALETTE.impGrey, texel: 1 });
  kit.box("impTrim", bx, topY - 0.09, bz, len - 0.04, 0.06, depth - 0.04, { color: PALETTE.impBlack, texel: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box("impTrim", bx + sx * (len / 2 - 0.06), (topY - 0.12) / 2, bz + sz * (depth / 2 - 0.06), 0.08, topY - 0.12, 0.08, { color: PALETTE.impBlack });
  kit.box("impMetal", bx, 0.28, bz, len - 0.2, 0.04, depth - 0.2, { color: PALETTE.impGreyDark, texel: 1 });
  kit.box("impTrim", bx - len / 2 + 0.55, 0.55, bz, 1.0, 0.56, depth - 0.1, { color: PALETTE.impBlack, texel: 1 });
  for (let k = 0; k < 3; k++) {
    kit.box("impMetal", bx - len / 2 + 0.55, 0.36 + k * 0.17, bz + depth / 2 - 0.04, 0.9, 0.14, 0.02, { color: PALETTE.impGreyDark, texel: 1.5 });
    kit.box("impMetal", bx - len / 2 + 0.55, 0.36 + k * 0.17, bz + depth / 2 - 0.02, 0.3, 0.03, 0.03, { color: PALETTE.impGrey });
  }
  kit.box("chevronY", bx + len / 2 - 0.5, 0.42, bz + depth / 2 - 0.035, 0.8, 0.2, 0.02, { texel: 2 });
  // things on the lower shelf
  kit.box("impTrim", bx + 0.3, 0.42, bz, 0.5, 0.24, 0.35, { color: PALETTE.impBlack });
  kit.box("impPanel1", bx + 0.3, 0.42, bz, 0.52, 0.06, 0.37, { color: YEL, uv: "world", texel: 1 });
  kit.cyl("impMetal", bx + 1.0, 0.45, bz + 0.1, 0.12, 0.3, "y", { color: PALETTE.impGreyDark, segments: 12 });
  // vise at the right end
  const vx = bx + len / 2 - 0.5;
  kit.box("impMetal", vx, topY + 0.06, bz + 0.15, 0.32, 0.12, 0.3, { color: PALETTE.impCharcoal, texel: 1 });
  kit.box("impMetal", vx, topY + 0.2, bz + 0.15, 0.14, 0.16, 0.28, { color: PALETTE.impCharcoal });
  kit.box("impMetal", vx + 0.22, topY + 0.2, bz + 0.15, 0.1, 0.16, 0.28, { color: PALETTE.impCharcoal });
  kit.cyl("impMetal", vx + 0.35, topY + 0.2, bz + 0.15, 0.025, 0.4, "x", { color: PALETTE.impGrey, segments: 8 });
  kit.cyl("impMetal", vx + 0.55, topY + 0.2, bz + 0.15, 0.012, 0.3, "z", { color: PALETTE.impGrey, segments: 6 });
  // tools and parts on the top
  for (let k = 0; k < 7; k++) {
    const tx = bx - len / 2 + 0.3 + rand() * (len - 1.4);
    const tz = bz - 0.3 + rand() * 0.55;
    const kind = rand();
    if (kind < 0.3) kit.cyl("impMetal", tx, topY + 0.08, tz, 0.05 + rand() * 0.04, 0.16, "y", { color: [PALETTE.impGrey, PALETTE.impRed, YEL][k % 3], segments: 10 });
    else if (kind < 0.55) kit.add("impMetal", new THREE.BoxGeometry(0.3 + rand() * 0.2, 0.02, 0.06), { pos: [tx, topY + 0.01, tz], rot: [0, rand() * Math.PI, 0], color: PALETTE.impGrey });
    else if (kind < 0.8) {
      kit.box("impTrim", tx, topY + 0.07, tz, 0.4, 0.14, 0.24, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impPanel1", tx, topY + 0.145, tz, 0.36, 0.01, 0.2, { color: YEL, uv: "world", texel: 1 });
    } else {
      kit.box("impGloss", tx, topY + 0.02, tz, 0.26, 0.03, 0.18);
      kit.add("scrAmber0", new THREE.PlaneGeometry(0.22, 0.14), { pos: [tx, topY + 0.037, tz], rot: [-Math.PI / 2, 0, 0], uv: "keep" });
    }
  }
  // articulated work lamp clamped to the back edge
  const lx = bx - 0.6;
  kit.cyl("impTrim", lx, topY + 0.1, bz - depth / 2 + 0.1, 0.06, 0.2, "y", { color: PALETTE.impBlack, segments: 10 });
  pipe(kit, [lx, topY + 0.2, bz - depth / 2 + 0.1], [lx + 0.25, topY + 0.85, bz - depth / 2 + 0.3], 0.02, { color: PALETTE.impGreyDark, segments: 8 });
  pipe(kit, [lx + 0.25, topY + 0.85, bz - depth / 2 + 0.3], [lx + 0.6, topY + 0.6, bz + 0.15], 0.02, { color: PALETTE.impGreyDark, segments: 8 });
  kit.cyl("impTrim", lx + 0.6, topY + 0.6, bz + 0.15, 0.1, 0.16, "y", { color: PALETTE.impBlack, segments: 14, r2: 0.05 });
  kit.cyl(accentKey, lx + 0.6, topY + 0.51, bz + 0.15, 0.085, 0.01, "y", { segments: 14 });
  // tool board on the wall above the bench
  const u = wallU(room, "N", bx);
  N.box("impTrim", u, 1.95, 0.03, len - 0.2, 1.3, 0.06, { color: PALETTE.impBlack, texel: 1 });
  N.box("impPanel1", u, 1.95, 0.065, len - 0.36, 1.14, 0.01, { color: PALETTE.impGreyDark, uv: "world", texel: 1.6 });
  for (let k = 0; k < 9; k++) {
    const tu = u - len / 2 + 0.35 + ((len - 0.7) * k) / 8;
    const kind = rand();
    if (kind < 0.4) N.box("impMetal", tu, 1.95 + (rand() - 0.5) * 0.3, 0.09, 0.05, 0.3 + rand() * 0.25, 0.02, { color: PALETTE.impGrey });
    else if (kind < 0.6) N.add("impMetalRough", new THREE.TorusGeometry(0.14, 0.03, 8, 16), tu, 2.0, 0.1, { color: PALETTE.impBlack, uv: "scale", uvScale: [4, 1] });
    else if (kind < 0.8) N.box("impMetal", tu, 1.85, 0.09, 0.12, 0.5, 0.03, { color: [YEL, PALETTE.impRed, PALETTE.impGrey][k % 3] });
    else N.box("impTrim", tu, 2.1, 0.1, 0.22, 0.14, 0.08, { color: PALETTE.impBlack });
    N.cylN("impMetal", tu, 2.4, 0.08, 0.012, 0.06, { color: PALETTE.impGrey, segments: 6 });
  }
  N.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.glyphs3][seed % 3], u + len / 2 - 0.5, 2.85, 0.02, 0.3);
  N.box(accentKey, u, 2.62, 0.07, len - 0.6, 0.03, 0.01);
  kit.collider([bx - len / 2 - 0.05, 0, -hz], [bx + len / 2 + 0.05, topY + 0.35, bz + depth / 2 + 0.05], "bench");
}

/** Floor-standing drill press: column, table, head with a motor, quill and a chuck. */
function drillPress(kit, x, z) {
  kit.box("impTrim", x, 0.06, z, 0.7, 0.12, 0.9, { color: PALETTE.impBlack, texel: 1 });
  kit.cyl("impMetal", x, 1.1, z + 0.25, 0.06, 2.0, "y", { color: PALETTE.impGreyDark, segments: 12 });
  kit.box("impMetal", x, 0.95, z - 0.05, 0.5, 0.06, 0.5, { color: PALETTE.impCharcoal, texel: 1 });
  kit.box("impTrim", x, 1.9, z, 0.3, 0.42, 0.9, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impPanel1", x, 1.9, z + 0.25, 0.32, 0.3, 0.3, { color: YEL, uv: "world", texel: 1 });
  kit.cyl("impMetal", x, 1.5, z - 0.3, 0.05, 0.4, "y", { color: PALETTE.impGrey, segments: 10 });
  kit.cyl("impTrim", x, 1.28, z - 0.3, 0.06, 0.1, "y", { color: PALETTE.impBlack, segments: 10 });
  kit.cyl("impMetal", x + 0.25, 1.9, z - 0.3, 0.14, 0.04, "x", { color: PALETTE.impGreyDark, segments: 14 });
  for (let k = 0; k < 3; k++) kit.cyl("impMetal", x + 0.27, 1.9, z - 0.3, 0.012, 0.3, "x", { color: PALETTE.impGrey, segments: 6, rot: [0, 0, (k * Math.PI) / 3] });
  kit.box("emitGreen", x + 0.16, 2.0, z + 0.15, 0.01, 0.04, 0.04);
  kit.collider([x - 0.4, 0, z - 0.5], [x + 0.4, 2.15, z + 0.5], "drill");
}

/** Cable drum on an A-stand, axis along `axis`; a tail of cable spills onto the floor. */
function cableReel(kit, x, z, axis, opts = {}) {
  const { seed = 1, small = false } = opts;
  const rand = rng(seed);
  const R = small ? 0.4 : 0.6;
  const L = small ? 0.5 : 0.75;
  const y = R + 0.12;
  const off = (d) => (axis === "x" ? [x + d, z] : [x, z + d]);
  for (const s of [-1, 1]) {
    const [fx, fz] = off(s * (L / 2 + 0.03));
    kit.cyl("impTrim", fx, y, fz, R, 0.06, axis, { color: PALETTE.impCharcoal, segments: 24 });
  }
  kit.cyl("impMetal", x, y, z, R * 0.42, L, axis, { color: PALETTE.impGreyDark, segments: 16 });
  kit.cyl("rubber", x, y, z, R * (0.72 + rand() * 0.16), L - 0.02, axis, { color: PALETTE.impBlack, segments: 24 });
  kit.cyl("impMetal", x, y, z, 0.04, L + 0.5, axis, { color: PALETTE.impGrey, segments: 8 });
  // A-stand: two sloped legs each side
  for (const s of [-1, 1]) {
    const [sx, sz] = off(s * (L / 2 + 0.2));
    for (const t of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.08, y + 0.1, 0.08);
      const lean = t * 0.32;
      const rot = axis === "x" ? [lean, 0, 0] : [0, 0, -lean];
      // legs meet at the axle on top and splay out at the floor
      const px = axis === "x" ? sx : sx - Math.sin(lean) * (y / 2);
      const pz = axis === "x" ? sz - Math.sin(lean) * (y / 2) : sz;
      kit.add("impTrim", g, { pos: [px, y / 2, pz], rot, color: PALETTE.impBlack });
    }
    kit.box("impTrim", sx, 0.04, sz, axis === "x" ? 0.12 : R * 1.2, 0.08, axis === "x" ? R * 1.2 : 0.12, { color: PALETTE.impBlack });
  }
  // cable tail
  const [tx, tz] = off(0);
  const side = axis === "x" ? [0, 1] : [1, 0];
  cable(kit, [[tx + side[0] * R * 0.9, y + 0.1, tz + side[1] * R * 0.9], [tx + side[0] * (R + 0.5), 0.35, tz + side[1] * (R + 0.5)], [tx + side[0] * (R + 1.2), 0.03, tz + side[1] * (R + 1.0) + 0.3], [tx + side[0] * (R + 1.0), 0.03, tz + side[1] * (R + 0.5) + 0.9]], 0.035, { segs: 16 });
  kit.collider([x - (axis === "x" ? L / 2 + 0.3 : R + 0.1), 0, z - (axis === "x" ? R + 0.1 : L / 2 + 0.3)], [x + (axis === "x" ? L / 2 + 0.3 : R + 0.1), y + R + 0.05, z + (axis === "x" ? R + 0.1 : L / 2 + 0.3)], "reel");
}

/** Hydraulic press against the N wall: H-frame, yellow ram cylinder, bed, pressure gauge. */
function hydraulicPress(kit, N, room, x) {
  const hz = room.size[2] / 2;
  const z = -hz + 0.7;
  for (const s of [-1, 1]) kit.box("impTrim", x + s * 0.7, 1.4, z, 0.16, 2.8, 0.5, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impTrim", x, 2.75, z, 1.7, 0.3, 0.55, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impTrim", x, 0.1, z, 1.7, 0.2, 0.7, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impMetal", x, 0.95, z, 1.4, 0.16, 0.5, { color: PALETTE.impCharcoal, texel: 1 });
  kit.cyl("impPanel1", x, 2.25, z, 0.22, 0.7, "y", { color: YEL, segments: 20, uv: "world", texel: 1 });
  kit.cyl("impMetal", x, 1.6, z, 0.09, 0.7, "y", { color: PALETTE.impGrey, segments: 12 });
  kit.box("impMetal", x, 1.22, z, 0.5, 0.1, 0.4, { color: PALETTE.impCharcoal });
  kit.cyl("impMetal", x, 1.09, z, 0.16, 0.12, "y", { color: PALETTE.impGreyDark, segments: 16 });
  kit.box("chevronY", x, 2.75, z + 0.28, 1.5, 0.22, 0.01, { texel: 2 });
  gauge(kit, [x + 0.5, 2.35, z + 0.26], "+z", 0.1, { seed: 44 });
  pipe(kit, [x + 0.22, 2.25, z], [x + 0.5, 2.25, z], 0.03, { color: PALETTE.impGreyDark, segments: 8 });
  pipe(kit, [x + 0.5, 2.25, z], [x + 0.5, 2.25, z + 0.2], 0.03, { color: PALETTE.impGreyDark, segments: 8 });
  N.decal(IMP_DECAL.hazard, wallU(room, "N", x), 3.4, 0.03, 0.5);
  kit.collider([x - 0.85, 0, -hz], [x + 0.85, 2.9, z + 0.35], "press");
}

/** Part-disassembled maintenance droid on a clamp stand: torso on the stand, dome and leg on the floor, cart. */
function droidStand(kit, x, z, opts) {
  const { accentKey, rand } = opts;
  // pedestal + clamp post
  kit.cyl("impTrim", x, 0.25, z, 0.6, 0.5, "y", { color: PALETTE.impBlack, segments: 24 });
  kit.cyl("impMetal", x, 0.52, z, 0.55, 0.04, "y", { color: PALETTE.impCharcoal, segments: 24 });
  kit.box("chevronY", x, 0.25, z, 1.22, 0.14, 1.22, { texel: 1.5 });
  kit.cyl("impMetal", x, 1.3, z - 0.62, 0.06, 1.6, "y", { color: PALETTE.impGreyDark, segments: 12 });
  for (const yy of [0.9, 1.45]) {
    kit.box("impMetal", x, yy, z - 0.45, 0.12, 0.08, 0.36, { color: PALETTE.impCharcoal });
    kit.add("impMetal", new THREE.TorusGeometry(0.47, 0.03, 8, 24, Math.PI * 1.25), { pos: [x, yy, z], rot: [Math.PI / 2, 0, Math.PI * 0.375], color: PALETTE.impCharcoal, uv: "scale", uvScale: [6, 1] });
  }
  // torso: white cylinder with dark bands, an opened service bay (dark recess, LEDs, hanging cables)
  kit.cyl("impPanel1", x, 1.1, z, 0.44, 1.1, "y", { color: PALETTE.impWhite, segments: 28, uv: "world", texel: 0.8 });
  kit.cyl("impTrim", x, 0.58, z, 0.46, 0.06, "y", { color: PALETTE.impBlack, segments: 28 });
  kit.cyl("impTrim", x, 1.62, z, 0.46, 0.06, "y", { color: PALETTE.impBlack, segments: 28 });
  kit.cyl("impMetal", x, 1.7, z, 0.36, 0.1, "y", { color: PALETTE.impGreyDark, segments: 28 });
  kit.box("impTrim", x + 0.2, 1.1, z + 0.4, 0.42, 0.6, 0.12, { color: PALETTE.impBlack, texel: 1 });
  for (let k = 0; k < 4; k++) kit.box("impMetal", x + 0.2, 0.9 + k * 0.13, z + 0.47, 0.3, 0.05, 0.02, { color: PALETTE.impGreyDark });
  blink([x + 0.08, 1.33, z + 0.465], [0.04, 0.04, 0.01], "emitRedImp", 0.7, 0.5);
  blink([x + 0.2, 1.33, z + 0.465], [0.04, 0.04, 0.01], accentKey, 1.1, 0.6, 0.3);
  blink([x + 0.32, 1.33, z + 0.465], [0.04, 0.04, 0.01], "emitGreen", 1.9, 0.8);
  cable(kit, [[x + 0.1, 0.95, z + 0.44], [x + 0.35, 0.7, z + 0.75], [x + 0.6, 0.02, z + 1.0]], 0.02, { color: PALETTE.impBlack });
  cable(kit, [[x + 0.25, 1.0, z + 0.44], [x + 0.15, 0.55, z + 0.85], [x - 0.3, 0.02, z + 1.15]], 0.016, { color: PALETTE.impRed });
  // removed side panel leaning on the pedestal, shoulder manipulators (one hanging, one clamped up)
  kit.add("impPanel1", new THREE.BoxGeometry(0.45, 0.6, 0.03), { pos: [x + 0.72, 0.32, z + 0.3], rot: [0, 0.4, -0.35], color: PALETTE.impWhite, uv: "world", texel: 0.8 });
  for (const s of [-1, 1]) {
    kit.cyl("impMetal", x + s * 0.5, 1.45, z, 0.07, 0.16, "x", { color: PALETTE.impCharcoal, segments: 12 });
    if (s < 0) {
      kit.cyl("impMetal", x - 0.62, 1.05, z, 0.035, 0.8, "y", { color: PALETTE.impGrey, segments: 8 });
      kit.box("impTrim", x - 0.62, 0.6, z, 0.06, 0.14, 0.16, { color: PALETTE.impBlack });
    } else {
      pipe(kit, [x + 0.58, 1.45, z], [x + 0.95, 1.85, z + 0.2], 0.035, { color: PALETTE.impGrey, segments: 8 });
      kit.box("impTrim", x + 0.98, 1.88, z + 0.22, 0.14, 0.08, 0.14, { color: PALETTE.impBlack });
    }
  }
  // dome head on the floor (eye lens toward the room), one leg lying beside the pedestal
  const dx = x + 1.35;
  const dz = z + 1.25;
  kit.add("impMetal", new THREE.SphereGeometry(0.44, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [dx, 0.02, dz], color: PALETTE.impGrey, uv: "scale", uvScale: [4, 1] });
  kit.cyl("impTrim", dx, 0.02, dz, 0.45, 0.04, "y", { color: PALETTE.impBlack, segments: 24 });
  kit.cyl("impGloss", dx + 0.32, 0.26, dz + 0.24, 0.09, 0.08, "z", { segments: 14, rot: [0.4, 0.9, 0] });
  kit.box("emitRedImp", dx + 0.33, 0.27, dz + 0.27, 0.05, 0.05, 0.03, { rot: [0.4, 0.9, 0] });
  for (let k = 0; k < 3; k++) kit.box("impTrim", dx, 0.05 + k * 0.08, dz, 0.9 - k * 0.1, 0.02, 0.9 - k * 0.1, { color: PALETTE.impBlack });
  kit.add("impTrim", new THREE.BoxGeometry(0.18, 0.75, 0.3), { pos: [x - 1.15, 0.12, z + 0.5], rot: [Math.PI / 2, 0.25, 0], color: PALETTE.impBlack, texel: 1 });
  kit.add("impMetal", new THREE.BoxGeometry(0.26, 0.14, 0.5), { pos: [x - 1.35, 0.1, z + 0.85], rot: [0, 0.25, 0], color: PALETTE.impCharcoal });
  // tool cart with a tray
  const cx = x - 1.6;
  const cz = z - 0.8;
  kit.box("impTrim", cx, 0.45, cz, 0.75, 0.5, 0.5, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impPanel1", cx, 0.45, cz + 0.26, 0.7, 0.4, 0.01, { color: PALETTE.impRed, uv: "world", texel: 1 });
  kit.box("impMetal", cx, 0.78, cz, 0.8, 0.04, 0.55, { color: PALETTE.impGrey, texel: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.cyl("rubber", cx + sx * 0.3, 0.08, cz + sz * 0.2, 0.08, 0.05, "x", { color: PALETTE.impBlack, segments: 10 });
  for (let k = 0; k < 4; k++) kit.box("impMetal", cx - 0.25 + k * 0.16, 0.82, cz + (rand() - 0.5) * 0.3, 0.03, 0.04, 0.25 + rand() * 0.1, { color: [PALETTE.impGrey, YEL][k % 2] });
  kit.cyl("impMetal", cx + 0.25, 0.9, cz - 0.15, 0.05, 0.2, "y", { color: PALETTE.impRed, segments: 10 });
  decalD(kit, DECK_D_DECAL.oil, [x - 0.5, 0.018, z + 1.6], "up", 1.0);
  hazardBorder(kit, x - 2.3, z - 1.4, x + 2.1, z + 1.9, 0, 0.24);
  kit.collider([x - 0.9, 0, z - 0.8], [x + 1.1, 1.9, z + 0.6], "droid");
  kit.collider([dx - 0.5, 0, dz - 0.5], [dx + 0.5, 0.5, dz + 0.5], "droidHead");
  kit.collider([cx - 0.42, 0, cz - 0.3], [cx + 0.42, 0.85, cz + 0.3], "cart");
  kit.collider([x - 1.6, 0, z + 0.25], [x - 0.95, 0.3, z + 1.1], "leg");
}

/** Parts shelving with instanced bins. facing '+z' (back to the N wall) or '-x' (back to the E wall). */
function shelving(kit, x, z, len, H, facing, opts) {
  const { rand } = opts;
  const depth = 0.62;
  const alongX = facing === "+z" || facing === "-z";
  const n = facing === "+z" ? [0, 0, 1] : facing === "-z" ? [0, 0, -1] : facing === "+x" ? [1, 0, 0] : [-1, 0, 0];
  const sz = (l, dd) => (alongX ? [l, dd] : [dd, l]);
  const [fw, fd] = sz(len, depth);
  // posts, back, shelves
  for (const s of [-1, 1]) {
    const [px, pz] = alongX ? [x + s * (len / 2 - 0.04), z] : [x, z + s * (len / 2 - 0.04)];
    for (const t of [-1, 1]) {
      const [qx, qz] = alongX ? [px, pz + t * (depth / 2 - 0.04)] : [px + t * (depth / 2 - 0.04), pz];
      kit.box("impTrim", qx, H / 2, qz, 0.08, H, 0.08, { color: PALETTE.impBlack });
    }
  }
  const [bx, bz] = [x - n[0] * (depth / 2 - 0.02), z - n[2] * (depth / 2 - 0.02)];
  kit.box("impMetal", bx, H / 2, bz, alongX ? len - 0.1 : 0.02, H - 0.1, alongX ? 0.02 : len - 0.1, { color: PALETTE.impCharcoal, texel: 1.5 });
  const shelfYs = [0.12, 0.72, 1.32, 1.92, 2.52];
  for (const sy of shelfYs) {
    kit.box("impMetal", x, sy, z, fw - 0.02, 0.04, fd - 0.02, { color: PALETTE.impGreyDark, texel: 1 });
    const [ex, ez] = [x + n[0] * (depth / 2 - 0.02), z + n[2] * (depth / 2 - 0.02)];
    kit.box("impTrim", ex, sy + 0.02, ez, alongX ? fw - 0.02 : 0.03, 0.08, alongX ? 0.03 : fw - 0.02, { color: PALETTE.impBlack });
  }
  // bins and parts (instanced)
  const binGeo = () => instGeo(new THREE.BoxGeometry(0.5, 0.34, 0.5));
  const canGeo = () => instGeo(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 12));
  const boxGeo = () => instGeo(new THREE.BoxGeometry(0.42, 0.22, 0.34));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const yaw = alongX ? 0 : Math.PI / 2;
  const cols = Math.floor((len - 0.2) / 0.58);
  const binCols = [PALETTE.impGreyDark, YEL, PALETTE.impGrey, PALETTE.impGreyDark, PALETTE.impBlueDeep];
  for (let r = 0; r < shelfYs.length - 1; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() < 0.12) continue;
      const o = -len / 2 + 0.35 + c * 0.58;
      const [ix, iz] = alongX ? [x + o, z + n[2] * 0.02] : [x + n[0] * 0.02, z + o];
      const kind = rand();
      if (kind < 0.62) {
        q.setFromAxisAngle(UP, yaw + (rand() - 0.5) * 0.08);
        m.compose(p.set(ix, shelfYs[r] + 0.02 + 0.17, iz), q, one);
        kit.instance("roomsd_bin", "impPanel1", binGeo, m, binCols[Math.floor(rand() * binCols.length)]);
      } else if (kind < 0.82) {
        q.identity();
        m.compose(p.set(ix, shelfYs[r] + 0.02 + 0.21, iz), q, one);
        kit.instance("roomsd_can", "impMetal", canGeo, m, rand() < 0.5 ? PALETTE.impGrey : PALETTE.impRed);
      } else {
        q.setFromAxisAngle(UP, yaw + (rand() - 0.5) * 0.4);
        m.compose(p.set(ix, shelfYs[r] + 0.02 + 0.11, iz), q, one);
        kit.instance("roomsd_case", "impTrim", boxGeo, m, PALETTE.impBlack);
      }
    }
  }
  // label strip + stencil on the top rail
  const [tx, tz] = [x + n[0] * (depth / 2 + 0.01), z + n[2] * (depth / 2 + 0.01)];
  decalImp(kit, [IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03][Math.floor(rand() * 3)], [tx, H - 0.25, tz], facing, 0.36);
  kit.collider([x - fw / 2 - 0.05, 0, z - fd / 2 - 0.05], [x + fw / 2 + 0.05, H + 0.05, z + fd / 2 + 0.05], "shelf");
}

/** Fighter wing panel: 7.6 × 4.4 hexagon of hex plating leaning back on an A-frame stand. */
function wingPanel(kit, x, z, opts) {
  const { rand } = opts;
  const tilt = 0.24;
  const pts = [[-3.8, 0], [-2.2, -2.2], [2.2, -2.2], [3.8, 0], [2.2, 2.2], [-2.2, 2.2]];
  const cy = 0.12 + 2.2 * Math.cos(tilt);
  const cz = z + 2.2 * Math.sin(tilt);
  kit.add("hexPanel", prism(pts, 0.12), { pos: [x, cy, cz], rot: [tilt, 0, 0], color: PALETTE.hullMid, uv: "world", texel: 1 });
  // edge frame + a few inset panels / access hatches on the room-facing side, a scorch and hazard tags
  const face = (u, v, sx, sy, mat, col, depthOff = 0.075, extra = {}) => {
    const p = new THREE.Vector3(u, v, -depthOff).applyEuler(new THREE.Euler(tilt, 0, 0));
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, 0.02), { pos: [x + p.x, cy + p.y, cz + p.z], rot: [tilt, 0, 0], color: col, ...extra });
  };
  face(0, 0, 7.4, 0.12, "impTrim", PALETTE.impBlack);
  face(-1.2, 1.0, 1.4, 0.9, "impMetal", PALETTE.hullDark, 0.075, { texel: 1 });
  face(1.6, -0.9, 1.1, 0.7, "impMetal", PALETTE.hullDark, 0.075, { texel: 1 });
  face(2.4, 0.9, 0.5, 0.5, "impTrim", PALETTE.impBlack);
  face(-2.6, -0.8, 0.6, 0.08, "emitRedImp", 0xffffff);
  // decals on the tilted face: quad normal = tilted -z
  const tiltQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.PI));
  const onFace = (u, v) => {
    const p = new THREE.Vector3(u, v, -0.095).applyEuler(new THREE.Euler(tilt, 0, 0));
    return [x + p.x, cy + p.y, cz + p.z];
  };
  decalImp(kit, IMP_DECAL.hazard, onFace(3.0, -0.2), "-z", 0.5, { quat: tiltQ });
  decalImp(kit, IMP_DECAL.bay03, onFace(-3.0, 0.4), "-z", 0.5, { quat: tiltQ });
  decalD(kit, DECK_D_DECAL.scorch, onFace(0.6, 1.2), "-z", 1.4, { quat: tiltQ });
  // A-frame stand behind the panel: two sloped backs, verticals, feet, diagonal brace, cross tie; rubber pads under the bottom edge
  for (const s of [-1, 1]) {
    const sx = x + s * 2.4;
    const gb = new THREE.BoxGeometry(0.14, 4.3, 0.14);
    const p = new THREE.Vector3(0, 2.15, 0.14).applyEuler(new THREE.Euler(tilt, 0, 0));
    kit.add("impTrim", gb, { pos: [sx, 0.1 + p.y, z + p.z], rot: [tilt, 0, 0], color: PALETTE.impBlack, texel: 1 });
    kit.box("impTrim", sx, 1.6, z + 1.9, 0.14, 3.2, 0.14, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impTrim", sx, 0.06, z + 1.0, 0.2, 0.12, 2.3, { color: PALETTE.impBlack, texel: 1 });
    kit.add("impMetal", new THREE.BoxGeometry(0.06, 2.4, 0.06), { pos: [sx, 1.35, z + 1.3], rot: [-0.52, 0, 0], color: PALETTE.impGreyDark });
    kit.box("rubber", x + s * 1.8, 0.06, z + 0.02, 0.6, 0.12, 0.45, { color: PALETTE.impBlack });
  }
  kit.box("impTrim", x, 3.0, z + 1.9, 4.9, 0.1, 0.1, { color: PALETTE.impBlack });
  kit.box("chevronY", x, 3.0, z + 1.84, 4.0, 0.08, 0.01, { texel: 3 });
  // a support trestle in front (low), inspection lamp on a tripod
  kit.box("impTrim", x + 1.0, 0.3, z - 1.4, 0.9, 0.6, 0.12, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impTrim", x + 1.0, 0.03, z - 1.4, 1.1, 0.06, 0.5, { color: PALETTE.impBlack });
  kit.cyl("impMetal", x - 3.2, 0.7, z - 1.8, 0.03, 1.4, "y", { color: PALETTE.impGreyDark, segments: 8 });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    kit.add("impMetal", new THREE.BoxGeometry(0.03, 0.7, 0.03), { pos: [x - 3.2 + Math.cos(a) * 0.15, 0.32, z - 1.8 + Math.sin(a) * 0.15], rot: [Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45], color: PALETTE.impGreyDark });
  }
  kit.box("impTrim", x - 3.2, 1.45, z - 1.7, 0.3, 0.22, 0.14, { color: PALETTE.impBlack });
  kit.box("emitWhiteDim", x - 3.2, 1.45, z - 1.62, 0.24, 0.16, 0.01, { uv: "keep" });
  hazardBorder(kit, x - 4.4, z - 2.2, x + 4.4, z + 2.4, 0, 0.26);
  kit.collider([x - 4.0, 0, z - 0.3], [x + 4.0, 4.5, z + 2.2], "wing");
  kit.collider([x + 0.4, 0, z - 1.7], [x + 1.6, 0.65, z - 1.1], "trestle");
  kit.collider([x - 3.45, 0, z - 2.05], [x - 2.95, 1.6, z - 1.55], "tripod");
  decalD(kit, DECK_D_DECAL.oil, [x - 1.5 + rand(), 0.018, z - 1.0], "up", 1.1);
}

/** Welding station: heavy table with a clamped part, flickering arc, welder unit, gas bottles, screens, hood + duct. */
function weldingStation(kit, S, room, x, z, h, opts) {
  const { accentKey } = opts;
  const hz = room.size[2] / 2;
  // table
  kit.box("impMetalRough", x, 0.86, z, 1.9, 0.08, 1.0, { color: PALETTE.impCharcoal, texel: 1 });
  kit.box("impTrim", x, 0.78, z, 1.8, 0.08, 0.9, { color: PALETTE.impBlack, texel: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box("impTrim", x + sx * 0.85, 0.37, z + sz * 0.4, 0.1, 0.74, 0.1, { color: PALETTE.impBlack });
  kit.box("impMetal", x, 0.2, z, 1.6, 0.04, 0.8, { color: PALETTE.impGreyDark, texel: 1 });
  decalD(kit, DECK_D_DECAL.scorch, [x - 0.2, 0.905, z], "up", 0.9);
  // jig with a clamped pipe section and the torch at the seam
  for (const sx of [-1, 1]) kit.box("impTrim", x + sx * 0.45, 1.0, z, 0.16, 0.2, 0.3, { color: PALETTE.impBlack });
  kit.cyl("impMetal", x, 1.02, z, 0.1, 1.2, "x", { color: PALETTE.impGrey, segments: 16 });
  kit.cyl("impTrim", x + 0.05, 1.02, z, 0.105, 0.02, "x", { color: PALETTE.impBlack, segments: 16 });
  pipe(kit, [x + 0.1, 1.14, z + 0.06], [x + 0.35, 1.5, z + 0.35], 0.03, { color: PALETTE.impBlack, segments: 8 });
  kit.cyl("impTrim", x + 0.36, 1.52, z + 0.36, 0.05, 0.14, "y", { color: PALETTE.impBlack, segments: 10 });
  blink([x + 0.07, 1.13, z + 0.04], [0.09, 0.09, 0.09], "emitWhite", 0.21, 0.55);
  blink([x + 0.07, 1.13, z + 0.04], [0.14, 0.05, 0.14], "emitCyan", 0.33, 0.4, 0.1);
  // welder unit (yellow) beside the table, torch cable and earth clamp
  const ux = x + 1.45;
  const uz = z + 0.5;
  kit.box("impTrim", ux, 0.47, uz, 0.62, 0.9, 0.6, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impPanel1", ux - 0.316, 0.55, uz, 0.012, 0.7, 0.52, { color: YEL, uv: "world", texel: 1 });
  gauge(kit, [ux - 0.33, 0.72, uz + 0.12], "-x", 0.08, { seed: 61 });
  gauge(kit, [ux - 0.33, 0.72, uz - 0.12], "-x", 0.08, { seed: 62, warn: true });
  kit.box(accentKey, ux - 0.33, 0.45, uz + 0.15, 0.01, 0.05, 0.05);
  kit.box("emitGreen", ux - 0.33, 0.45, uz + 0.05, 0.01, 0.05, 0.05);
  kit.cyl("impMetal", ux - 0.33, 0.45, uz - 0.12, 0.05, 0.03, "x", { color: PALETTE.impGrey, segments: 10 });
  kit.box("impMetal", ux, 0.96, uz, 0.5, 0.04, 0.06, { color: PALETTE.impGrey });
  for (const sz of [-1, 1]) kit.cyl("rubber", ux, 0.1, uz + sz * 0.22, 0.1, 0.06, "x", { color: PALETTE.impBlack, segments: 10 });
  cable(kit, [[x + 0.37, 1.45, z + 0.37], [x + 0.9, 1.25, z + 0.7], [x + 1.15, 0.7, z + 0.85], [ux - 0.3, 0.6, uz + 0.1]], 0.02, { color: PALETTE.impBlack });
  cable(kit, [[ux - 0.3, 0.5, uz - 0.1], [ux - 0.7, 0.2, uz - 0.4], [x + 0.6, 0.86, z - 0.4]], 0.016, { color: PALETTE.impGreen });
  // gas bottles chained to a wall bracket
  for (const [i, bx] of [x - 1.7, x - 1.35].entries()) {
    const bz = hz - 0.45;
    kit.cyl("impMetal", bx, 0.75, bz, 0.15, 1.5, "y", { color: i ? PALETTE.impGreyDark : YEL, segments: 16 });
    kit.cyl("impMetal", bx, 1.55, bz, 0.14, 0.14, "y", { color: PALETTE.impGrey, segments: 12, r2: 0.08 });
    kit.cyl("impTrim", bx, 1.68, bz, 0.05, 0.12, "y", { color: PALETTE.impBlack, segments: 10 });
    valveWheel(kit, [bx, 1.8, bz], "y", 0.07, { color: PALETTE.impRed, stem: 0.08 });
    kit.cyl("impMetal", bx, 1.62, bz - 0.14, 0.03, 0.1, "z", { color: PALETTE.impGrey, segments: 8 });
  }
  const bu = wallU(room, "S", x - 1.52);
  S.box("impTrim", bu, 1.2, 0.2, 0.9, 0.08, 0.4, { color: PALETTE.impBlack });
  S.box("impMetal", bu, 1.2, 0.42, 0.9, 0.04, 0.04, { color: PALETTE.impGrey });
  S.decal(IMP_DECAL.hazard, bu, 2.0, 0.03, 0.45);
  kit.collider([x - 1.95, 0, hz - 0.75], [x - 1.1, 1.95, hz], "bottles");
  // welding screens (L arrangement) on wheeled feet
  const screen = (sx, sz, alongX) => {
    const W = 1.8;
    const H = 1.9;
    kit.box("impTrim", sx, H / 2 + 0.1, sz, alongX ? W : 0.06, H, alongX ? 0.06 : W, { color: PALETTE.impBlack, texel: 1 });
    kit.box("rubber", sx, H / 2 + 0.1, sz, alongX ? W - 0.14 : 0.03, H - 0.14, alongX ? 0.03 : W - 0.14, { color: PALETTE.hullTrench });
    for (const s of [-1, 1]) {
      const [fx, fz] = alongX ? [sx + s * (W / 2 - 0.05), sz] : [sx, sz + s * (W / 2 - 0.05)];
      kit.box("impTrim", fx, 0.05, fz, alongX ? 0.08 : 0.5, 0.1, alongX ? 0.5 : 0.08, { color: PALETTE.impBlack });
    }
    kit.box("chevronY", sx, 0.3, sz, alongX ? W - 0.2 : 0.04, 0.14, alongX ? 0.04 : W - 0.2, { texel: 2 });
    kit.collider([sx - (alongX ? W / 2 : 0.25), 0, sz - (alongX ? 0.25 : W / 2)], [sx + (alongX ? W / 2 : 0.25), H + 0.1, sz + (alongX ? 0.25 : W / 2)], "screen");
  };
  screen(x - 0.4, z - 1.35, true);
  screen(x - 1.55, z - 0.55, false);
  // extraction hood + duct to the ceiling, along the S wall to the E corner
  kit.cyl("impMetal", x, 2.45, z, 0.75, 0.55, "y", { color: PALETTE.impCharcoal, segments: 20, r2: 0.16 });
  kit.cyl("impTrim", x, 2.18, z, 0.78, 0.05, "y", { color: PALETTE.impBlack, segments: 20 });
  kit.cyl("impMetal", x, 2.85, z, 0.16, 0.3, "y", { color: PALETTE.impGreyDark, segments: 14 });
  pipePath(kit, [[x, 2.95, z], [x, h - 0.6, z], [x, h - 0.6, hz - 0.5], [16.6, h - 0.6, hz - 0.5]], 0.16, { color: PALETTE.impGreyDark, clampStep: 2.2, flanges: true });
  kit.box(accentKey, x, 2.2, z + 0.5, 0.2, 0.03, 0.03);
  decalImp(kit, IMP_DECAL.hazard, [x, 0.018, z - 2.5], "up", 0.7);
  hazardBorder(kit, x - 2.5, z - 2.2, x + 2.3, hz - 0.05, 0, 0.26);
  kit.collider([x - 1.0, 0, z - 0.55], [x + 1.0, 1.6, z + 0.55], "weldTable");
  kit.collider([ux - 0.35, 0, uz - 0.35], [ux + 0.35, 1.0, uz + 0.35], "welder");
}

/** Scissor parts lift in the SW corner: raised platform (walkable), guide columns, gate rails, pedestal. */
function partsLift(kit, x, z, h, opts) {
  const { accentKey } = opts;
  const half = 1.5;
  const py = 0.32;
  kit.boxMM("impDeck", [x - half, py - 0.12, z - half], [x + half, py, z + half], { color: PALETTE.impGreyDark, texel: 0.5 });
  for (const s of [-1, 1]) {
    kit.boxMM("chevronY", [x - half - 0.01, py - 0.13, z + s * half - (s > 0 ? 0 : 0.02)], [x + half + 0.01, py + 0.005, z + s * half + (s > 0 ? 0.02 : 0)], { texel: 1.5 });
    kit.boxMM("chevronY", [x + s * half - (s > 0 ? 0 : 0.02), py - 0.13, z - half - 0.01], [x + s * half + (s > 0 ? 0.02 : 0), py + 0.005, z + half + 0.01], { texel: 1.5 });
  }
  kit.floor(x - half, z - half, x + half, z + half, py, "lift");
  // folded scissor arms under the platform (visible on the N and E faces)
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) {
      kit.add("impMetal", new THREE.BoxGeometry(2.7, 0.05, 0.06), { pos: [x, 0.1, z + s * 1.2], rot: [0, 0, t * 0.06], color: PALETTE.impGreyDark });
      kit.add("impMetal", new THREE.BoxGeometry(0.06, 0.05, 2.7), { pos: [x + s * 1.2, 0.1, z], rot: [-t * 0.06, 0, 0], color: PALETTE.impGreyDark });
    }
  }
  kit.box("impTrim", x, 0.03, z, 3.0, 0.06, 3.0, { color: PALETTE.impBlack, texel: 1 });
  // guide columns to the ceiling, top frame, hoist motor + lamp
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box("impTrim", x + sx * (half + 0.16), h / 2, z + sz * (half + 0.16), 0.2, h, 0.2, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impTrim", x, h - 0.45, z, 3.5, 0.3, 3.5, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impMetal", x, h - 0.75, z, 0.9, 0.5, 0.7, { color: PALETTE.impCharcoal, texel: 1 });
  kit.box("impPanel1", x, h - 0.75, z - 0.36, 0.7, 0.3, 0.02, { color: YEL, uv: "world", texel: 1 });
  // work lamp under the hoist motor (the amber point light sits 0.6 m below it)
  kit.box("impTrim", x, h - 1.04, z, 0.7, 0.08, 0.5, { color: PALETTE.impBlack });
  kit.box(accentKey, x, h - 1.09, z, 0.6, 0.02, 0.4);
  warningLamp(kit, [x + 1.2, h - 0.7, z - 1.2], accentKey);
  blink([x + 1.2, h - 0.7, z - 1.2], [0.14, 0.12, 0.14], accentKey, 2.2, 0.35, 0.7);
  for (const sx of [-1, 1]) kit.cyl("impMetal", x + sx * 0.6, h / 2 + 0.1, z + half + 0.16, 0.03, h - 1.0, "y", { color: PALETTE.impGrey, segments: 8 });
  // gate rails on the open sides (E full, N with a gap for access)
  impRailing(kit, [x + half - 0.08, z - half + 0.1], [x + half - 0.08, z + half - 0.1], py, { light: accentKey, postStep: 1.4 });
  impRailing(kit, [x - half + 0.1, z - half + 0.08], [x - half + 1.0, z - half + 0.08], py, { postStep: 1.0 });
  impRailing(kit, [x + 0.6, z - half + 0.08], [x + half - 0.1, z - half + 0.08], py, { postStep: 1.0 });
  // control pedestal, cargo on the platform, hazard border
  const cx = x + half + 0.75;
  const cz = z - half + 0.2;
  kit.box("impTrim", cx, 0.55, cz, 0.3, 1.1, 0.3, { color: PALETTE.impBlack, texel: 1 });
  kit.add("impMetal", new THREE.BoxGeometry(0.3, 0.04, 0.34), { pos: [cx, 1.12, cz], rot: [0.5, 0, 0], color: PALETTE.impCharcoal });
  for (const [k, key] of [accentKey, "emitGreen", "emitRedImp"].entries()) kit.add(key, new THREE.BoxGeometry(0.06, 0.02, 0.06), { pos: [cx - 0.08 + k * 0.08, 1.14 + 0.02 * Math.cos(0.5), cz - 0.02], rot: [0.5, 0, 0] });
  kit.collider([cx - 0.17, 0, cz - 0.17], [cx + 0.17, 1.2, cz + 0.17], "liftCtl");
  impCrate(kit, x - 0.5, py, z + 0.3, 1.2, 0.9, 1.0, { seed: 31, decal: IMP_DECAL.cog });
  kit.cyl("impMetal", x + 0.7, py + 0.35, z - 0.6, 0.3, 0.7, "y", { color: PALETTE.impGreyDark, segments: 16 });
  kit.collider([x + 0.4, py, z - 0.9], [x + 1.0, py + 0.75, z - 0.3], "drum");
  hazardBorder(kit, x - half - 0.55, z - half - 0.55, x + half + 1.1, z + half + 0.4, 0, 0.26);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.collider([x + sx * (half + 0.16) - 0.12, 0, z + sz * (half + 0.16) - 0.12], [x + sx * (half + 0.16) + 0.12, h, z + sz * (half + 0.16) + 0.12], "liftPost");
}

/**
 * Gantry crane: yellow rails on wall brackets, one dark bridge girder (yellow only at the chevron end
 * blocks and the trolley drum, so no lamp can blow out a 23 m yellow beam) with end trucks, trolley,
 * hook block; traverses along x.
 */
function gantryCrane(kit, room, opts) {
  const [w, , d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const { travel = [-8, 8], trolleyZ = -4 } = opts;
  const railY = 5.05;
  for (const s of [-1, 1]) {
    const rz = s * (hz - 0.6);
    kit.boxMM("impMetal", [-hx + 0.6, railY + 0.11, rz - 0.16], [hx - 0.6, railY + 0.15, rz + 0.16], { color: YEL, texel: 1 });
    kit.boxMM("impMetal", [-hx + 0.6, railY - 0.15, rz - 0.16], [hx - 0.6, railY - 0.11, rz + 0.16], { color: YEL, texel: 1 });
    kit.boxMM("impMetal", [-hx + 0.6, railY - 0.11, rz - 0.03], [hx - 0.6, railY + 0.11, rz + 0.03], { color: YEL, texel: 1 });
    for (let x = -hx + 1.2; x < hx - 0.8; x += 3.4) {
      kit.box("impTrim", x, railY - 0.02, s * (hz - 0.3), 0.18, 0.36, 0.62, { color: PALETTE.impBlack, texel: 1 });
      kit.add("impTrim", new THREE.BoxGeometry(0.1, 0.9, 0.1), { pos: [x, railY - 0.5, s * (hz - 0.35)], rot: [s * 0.55, 0, 0], color: PALETTE.impBlack });
    }
    for (const ex of [-hx + 0.65, hx - 0.65]) kit.box("impTrim", ex, railY, rz, 0.12, 0.5, 0.42, { color: PALETTE.impRed, texel: 1 });
  }
  // the bridge (animated group at x = 0)
  const span = hz - 0.6;
  const bridge = assembly(kit, [0, 0, 0], (s) => {
    s.box("impMetal", 0, railY - 0.07, 0, 0.56, 0.64, span * 2 + 0.3, { color: PALETTE.impGreyDark, texel: 1 });
    s.box("impTrim", 0, railY - 0.07, 0, 0.6, 0.1, span * 2 + 0.3, { color: PALETTE.impBlack, texel: 1 });
    for (const t of [-1, 1]) s.box("chevronY", 0, railY - 0.07, t * (span - 1.2), 0.58, 0.5, 0.6, { texel: 2 });
    for (const t of [-1, 1]) {
      const tz = t * span;
      s.box("impTrim", 0, railY + 0.32, tz, 1.1, 0.3, 0.6, { color: PALETTE.impBlack, texel: 1 });
      for (const dx of [-0.4, 0.4]) for (const dz of [-0.22, 0.22]) s.cyl("impMetal", dx, railY + 0.3, tz + dz, 0.15, 0.06, "z", { color: PALETTE.impGrey, segments: 14 });
      s.box("emitAmber", 0.56, railY + 0.36, tz, 0.01, 0.08, 0.2);
    }
    // trolley under the girder, cable drum, two hoist cables, hook block with hook, control pendant
    const tz = trolleyZ;
    s.box("impTrim", 0, railY - 0.66, tz, 0.9, 0.5, 1.0, { color: PALETTE.impBlack, texel: 1 });
    s.cyl("impMetal", 0, railY - 0.6, tz, 0.16, 0.6, "z", { color: YEL, segments: 14 });
    s.box("impMetal", 0, railY - 0.85, tz, 0.5, 0.12, 0.7, { color: PALETTE.impCharcoal, texel: 1 });
    s.box("emitRedImp", 0.46, railY - 0.6, tz + 0.3, 0.01, 0.08, 0.16);
    for (const dx of [-0.14, 0.14]) s.cyl("impMetal", dx, railY - 1.6, tz, 0.014, 1.5, "y", { color: PALETTE.impGreyDark, segments: 6 });
    s.box("impTrim", 0, railY - 2.55, tz, 0.4, 0.55, 0.28, { color: PALETTE.impBlack, texel: 1 });
    s.box("chevronY", 0, railY - 2.55, tz + 0.145, 0.34, 0.4, 0.01, { texel: 3 });
    s.box("chevronY", 0, railY - 2.55, tz - 0.145, 0.34, 0.4, 0.01, { texel: 3 });
    s.cyl("impMetal", 0, railY - 2.95, tz, 0.05, 0.3, "y", { color: PALETTE.impGrey, segments: 10 });
    s.add("impMetal", new THREE.TorusGeometry(0.2, 0.045, 8, 18, Math.PI * 1.35), { pos: [0, railY - 3.28, tz], rot: [0, 0, Math.PI * 0.82], color: PALETTE.impGrey, uv: "scale", uvScale: [4, 1] });
    s.cyl("impMetal", 0.5, railY - 1.8, tz + 0.6, 0.012, 2.2, "y", { color: PALETTE.impBlack, segments: 6 });
    s.box("impPanel1", 0.5, railY - 3.0, tz + 0.6, 0.12, 0.3, 0.08, { color: YEL, uv: "world", texel: 2 });
    for (let k = 0; k < 3; k++) s.box(["emitGreen", "emitRedImp", "emitAmber"][k], 0.5, railY - 2.9 - k * 0.08, tz + 0.645, 0.04, 0.03, 0.01);
  });
  kit.onUpdate((dt, t) => {
    const u = 0.5 + 0.5 * Math.sin(t * 0.11);
    bridge.position.x = travel[0] + (travel[1] - travel[0]) * u;
  });
}
