// Deck 5 — Main Hangar Bay. A 72 × 120 × 30 m cavern over the ventral opening: the deck is built as
// slabs around the hole, the well below the deck drops to the hull skin (y = -10), a magnetic
// containment field hangs at y = -9 and two pairs of blast-door leaves slide over the opening driven
// by the traffic system's bay state. TIE racks hang from ceiling gantries along both long walls with
// boarding gantries, a flight-control tower sits on a mezzanine over the aft door, catwalks at y = 8
// run along the long walls, and a bridge crane travels the ceiling.
//
// Deck-local metres, floor y = 0. Room bounds x -36..36, y -10..30, z -155..-35.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { impWall, impConsole, wallScreen, equipmentRack, crate, stairs, platform, railing, pipeRun, pillar, doorOpenings, wallSegment } from "../imperial.js";
import { pointLight, wallFrame } from "../builders.js";
import { Kit, rng } from "../../kit.js";
import { makeHangarMarkings, decalRect } from "../../textures.js";
import { HANGAR_OPENING } from "../layout.js";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
const HOLE = { x0: HANGAR_OPENING.x[0], x1: HANGAR_OPENING.x[1], z0: HANGAR_OPENING.z[0], z1: HANGAR_OPENING.z[1] };
const WELL_DEPTH = 10; // deck → hull skin
const FIELD_Y = -9;
const CEIL = 30;
const RACK_X = 29;
const RACK_Y = 16; // TIE centre height (wing 12.4..19.6, ball top 17.9)
const RACK_Z = [-124, -106, -88, -70];
const TIE_R = 1.9;
const WING_H = 7.2;
const WING_X = TIE_R + 1.75; // wing plane offset from the ball centre
const CAT_Y = 8; // catwalk / mezzanine level
const GANTRY_Y = RACK_Y + WING_H / 2 + 0.9; // boarding gantry, 0.9 above the wing apex (clears the clamps)
const BEAM_Y0 = GANTRY_Y + 1.8;
const BEAM_Y1 = BEAM_Y0 + 1.4;
const LOWER_H = 4.2; // human-scale panel band at the bottom of the walls
const TOWER = { x0: -13, x1: 13, z0: -44, z1: -35.16, y0: CAT_Y, y1: 12 };
// gantry stairs: two straight flights (catwalk → landing → gantry) along the long walls from z = -37.2
const STAIR_Z0 = -37.2;
const FLIGHT = Math.round((GANTRY_Y - CAT_Y) / 2 / 0.18) * 0.3; // run of one flight (stairs() geometry)
const LANDING = 2.6;
const GANTRY_Z1 = STAIR_Z0 - FLIGHT - LANDING - FLIGHT; // aft end of the boarding gantry (= top of the stairs)

const LOWER_PAINTS = [
  [PALETTE.impGrey, 0.42],
  [PALETTE.impMid, 0.3],
  [PALETTE.impLight, 0.18],
  [PALETTE.impDark, 0.1],
];
// near-uniform light plates: at 4 m scale any tonal mix reads as a checkerboard from across the bay
const UPPER_PAINTS = [
  [PALETTE.impLight, 0.74],
  [PALETTE.impGrey, 0.18],
  [PALETTE.impWhite, 0.08],
];
const WELL_PAINTS = [
  [PALETTE.impMid, 0.5],
  [PALETTE.impDark, 0.35],
  [PALETTE.impGrey, 0.15],
];

// 7-segment numerals built from lit boxes (a: top … g: middle), unit digit 1 wide × 1.8 tall
const SEG = { a: [0.5, 1.72, 0.7, 0.16], b: [0.85, 1.31, 0.16, 0.66], c: [0.85, 0.49, 0.16, 0.66], d: [0.5, 0.08, 0.7, 0.16], e: [0.15, 0.49, 0.16, 0.66], f: [0.15, 1.31, 0.16, 0.66], g: [0.5, 0.9, 0.7, 0.16] };
const DIGITS = ["abcdef", "bc", "abged", "abgcd", "fgbc", "afgcd", "afgedc", "abc", "abcdefg", "abcfg"];

// ---------------------------------------------------------------------------
export function buildHangar(kit, ctx) {
  const [min, max] = ctx.bounds;
  // helpers that read bounds[0][1] as the floor must see y = 0, not the -10 of the well
  const B0 = [
    [min[0], 0, min[2]],
    [max[0], max[1], max[2]],
  ];
  ensureMaterials(ctx);
  const rand = rng(ctx.seed + 5);

  floorSlabs(kit, B0);
  shellWalls(kit, ctx, B0);
  ceiling(kit, ctx, B0);
  well(kit, ctx);
  curbAndRails(kit, ctx);
  deckMarkings(kit, ctx, B0);
  structure(kit, ctx, B0);
  towerAndMezzanine(kit, ctx, B0);
  racks(kit, ctx, B0);
  props(kit, ctx, B0, rand);
  lighting(kit, ctx, B0);

  // --- animated systems (separate meshes, driven per frame while the bay is visible)
  const applyDoors = bayDoors(ctx);
  const beacon = beacons(ctx);
  const field = containmentField(ctx);
  const crane = gantryCrane(ctx);
  const lift = cargoLift(kit, ctx, -27, -147);
  const traffic = ctx.traffic;
  if (traffic && traffic.setRacks) {
    const o = ctx.deck.origin;
    const list = [];
    for (const s of [-1, 1]) for (const rz of RACK_Z) list.push({ pos: new THREE.Vector3(s * RACK_X + o[0], RACK_Y + o[1], rz + o[2]), yaw: 0 });
    traffic.setRacks(list);
  }
  let prevOpen = traffic ? traffic.bay.openness : 0;
  applyDoors(prevOpen);
  const tick = (dt, t) => {
    const o = traffic ? traffic.bay.openness : 0;
    applyDoors(o);
    beacon(o, t, o > 0.001 && o < 0.999);
    field(t);
    crane(t);
    lift(t);
    prevOpen = o;
  };
  ctx.anim(tick);
  // the exterior camera shows the bay through the opening while the room's anims are not stepped
  // (the visibility graph only runs anims for the current interior set) — keep the doors in sync
  // from the leaf meshes themselves so the bay reads correctly from space
  for (const m of applyDoors.meshes) {
    m.onBeforeRender = () => {
      const o = traffic ? traffic.bay.openness : 0;
      if (o !== prevOpen) {
        applyDoors(o);
        prevOpen = o;
      }
    };
  }
  void rand;
}

// ---------------------------------------------------------------------------
// Materials owned by this room (registered once on the shared dictionary)
// ---------------------------------------------------------------------------
function ensureMaterials(ctx) {
  const m = ctx.materials;
  if (!m.hg_markings) {
    m.hg_markings = new THREE.MeshStandardMaterial({
      map: makeHangarMarkings(2048, 1024),
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      roughness: 0.6,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      envMapIntensity: 0.4,
    });
  }
  if (!m.hg_field) {
    const f = m.forceField.clone();
    f.map = m.forceField.map.clone();
    f.map.repeat.set(11, 17.5); // 4 m tiles → 0.5 m cells over the 44 × 70 m opening
    f.map.needsUpdate = true;
    f.opacity = 0.24;
    m.hg_field = f;
  }
  if (!m.hg_beaconRed) m.hg_beaconRed = m.emitRed.clone();
  if (!m.hg_beaconAmber) m.hg_beaconAmber = m.emitAmber.clone();
  if (!m.hg_seam) m.hg_seam = m.emitAmber.clone();
  if (!m.hg_lane) m.hg_lane = m.emitWhite.clone();
}

// ---------------------------------------------------------------------------
// Floor: black gloss slabs around the opening
// ---------------------------------------------------------------------------
function floorSlabs(kit, B0) {
  const [min, max] = B0;
  const pad = 0.4;
  const slab = (x0, z0, x1, z1) => kit.boxMM("floorGloss", [x0, -0.12, z0], [x1, 0, z1], { texel: 0.33 });
  slab(min[0] - pad, min[2] - pad, max[0] + pad, HOLE.z0); // forward apron
  slab(min[0] - pad, HOLE.z1, max[0] + pad, max[2] + pad); // aft apron
  slab(min[0] - pad, HOLE.z0, HOLE.x0, HOLE.z1); // port strip
  slab(HOLE.x1, HOLE.z0, max[0] + pad, HOLE.z1); // starboard strip
  // dark gutter along the walls
  const g = 0.2;
  for (const [x0, z0, x1, z1] of [
    [min[0], min[2], max[0], min[2] + g],
    [min[0], max[2] - g, max[0], max[2]],
    [min[0], min[2], min[0] + g, max[2]],
    [max[0] - g, min[2], max[0], max[2]],
  ]) {
    kit.boxMM("paintedMetal", [x0, 0, z0], [x1, 0.015, z1], { color: PALETTE.impBlack, texel: 2 });
  }
}

// ---------------------------------------------------------------------------
// Walls: a human-scale lower band with the door openings, big panels above, pilasters
// ---------------------------------------------------------------------------
function shiftedOpenings(ctx, side, bounds, base) {
  const out = [];
  for (const op of doorOpenings(ctx, side, bounds)) {
    const v1 = op.v1 - base;
    if (v1 <= 0.05) continue;
    out.push({ ...op, v0: Math.max(0, op.v0 - base), v1 });
  }
  return out;
}

function shellWalls(kit, ctx, B0) {
  const H = B0[1][1];
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
    impWall(kit, ctx, side, {
      bounds: B0,
      base: 0,
      height: LOWER_H,
      rows: [0, 0.5, 2.0, 3.2, LOWER_H],
      panelW: 1.6,
      paints: LOWER_PAINTS,
      styles: { panel: 0.58, vent: 0.08, greeble: 0.1, strip: 0.1, screen: 0.06, conduit: 0.08 },
      seed: ctx.seed * 3 + side.length,
      tag: "wall",
    });
    // upper band: big calm plates (the cavern reads through its silhouette, not its greebles)
    const UH = H - LOWER_H;
    impWall(kit, ctx, side, {
      bounds: B0,
      base: LOWER_H,
      height: UH,
      noDoors: true,
      openings: shiftedOpenings(ctx, side, B0, LOWER_H),
      rows: [0, 4.4, 9.8, 15.2, 20.6, UH],
      panelW: 4.0,
      kick: false,
      trim: false,
      collide: false,
      paints: UPPER_PAINTS,
      styles: { panel: 0.86, vent: 0.0, greeble: 0.02, strip: 0.08, conduit: 0.04 },
      seed: ctx.seed * 7 + side.length * 5,
    });
    // dark cornice band under the ceiling with a recessed white cove
    const seg = wallSegment(B0, side);
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    frame.box("paintedMetal", length / 2, H - 0.7, 0.12, length, 1.4, 0.24, { color: PALETTE.impDark, texel: 1.5 });
    frame.box("emitWhiteSoft", length / 2, H - 1.45, 0.22, length - 0.4, 0.08, 0.04, { uv: "keep" });
    // string course between the bands
    frame.box("paintedMetal", length / 2, LOWER_H + 0.08, 0.08, length, 0.16, 0.16, { color: PALETTE.impBlack, texel: 2 });
  }
}

// ---------------------------------------------------------------------------
// Ceiling: big dark panels, trusses with light lines, flood housings
// ---------------------------------------------------------------------------
function ceiling(kit, ctx, B0) {
  const [min, max] = B0;
  const W = max[0] - min[0];
  const D = max[2] - min[2];
  // black backing slab, then a coarse field of 6 × 6 m plates hanging 0.12 below it (the gaps read
  // as dark seams); a few plates are swapped for recessed vent grilles
  kit.boxMM("paintedMetal", [min[0] - 0.4, CEIL, min[2] - 0.4], [max[0] + 0.4, CEIL + 0.3, max[2] + 0.4], { color: PALETTE.impBlack, texel: 2 });
  const rand = rng(ctx.seed * 17 + 3);
  const cols = Math.round(W / 6);
  const rows = Math.round(D / 6);
  const pw = W / cols;
  const ph = D / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x0 = min[0] + i * pw + 0.1;
      const z0 = min[2] + j * ph + 0.1;
      const r = rand();
      if (r < 0.07) {
        // vent grille: dark recess with slats
        kit.boxMM("paintedMetal", [x0 + 0.3, CEIL - 0.04, z0 + 0.3], [x0 + pw - 0.5, CEIL, z0 + ph - 0.5], { color: PALETTE.impBlack, texel: 2 });
        for (let k = 0; k < 7; k++) {
          const z = z0 + 0.7 + (k / 6) * (ph - 1.6);
          kit.boxMM("metal", [x0 + 0.5, CEIL - 0.1, z - 0.12], [x0 + pw - 0.7, CEIL - 0.04, z + 0.12], { color: PALETTE.gunmetal });
        }
        continue;
      }
      // mostly one mid-grey tone so the floods read on it (it is what the exterior camera sees through
      // the opening); a few darker plates and recessed service hatches break it up
      const col = r < 0.72 ? PALETTE.impGrey : r < 0.9 ? PALETTE.impMid : PALETTE.impLight;
      kit.boxMM("impPanel1", [x0, CEIL - 0.12, z0], [x0 + pw - 0.2, CEIL, z0 + ph - 0.2], { color: col, uv: "keep" });
      if (r > 0.94) kit.boxMM("impPanel", [x0 + 0.8, CEIL - 0.2, z0 + 0.8], [x0 + pw - 1.0, CEIL - 0.12, z0 + ph - 1.0], { color: PALETTE.impMid, uv: "keep" });
    }
  }
  // big service ducts along the long walls under the ceiling, with hanger straps
  for (const s of [-1, 1]) {
    for (const [dx, r] of [
      [3.2, 0.75],
      [5.2, 0.45],
    ]) {
      const x = s * (max[0] - dx);
      kit.cyl("paintedMetal", x, CEIL - 2.7, (min[2] + max[2]) / 2, r, D - 3, "z", { color: PALETTE.impDark, segments: 14, texel: 0.5 });
      for (let z = min[2] + 4; z < max[2] - 2; z += 12) kit.box("metal", x, CEIL - 1.35, z, r * 2 + 0.2, 2.7, 0.16, { color: PALETTE.gunmetal });
    }
  }
  // transverse trusses every ~13 m: two chords, verticals, alternating diagonals, a light line
  const n = 9;
  for (let i = 0; i < n; i++) {
    const z = min[2] + 6 + (i / (n - 1)) * (max[2] - min[2] - 12);
    const yTop = CEIL - 0.25;
    const yBot = CEIL - 1.35;
    kit.box("paintedMetal", 0, yTop, z, W, 0.35, 0.4, { color: PALETTE.impDark, texel: 1.2 });
    kit.box("paintedMetal", 0, yBot, z, W, 0.3, 0.4, { color: PALETTE.impDark, texel: 1.2 });
    const bays = 18;
    for (let k = 0; k <= bays; k++) {
      const x = min[0] + (k / bays) * W;
      kit.box("paintedMetal", x, (yTop + yBot) / 2, z, 0.16, yTop - yBot, 0.3, { color: PALETTE.impMid, texel: 2 });
      if (k < bays) {
        const x2 = min[0] + ((k + 1) / bays) * W;
        const len = Math.hypot(x2 - x, yTop - yBot);
        const ang = Math.atan2(yTop - yBot, x2 - x) * (k % 2 ? 1 : -1);
        kit.add("paintedMetal", new THREE.BoxGeometry(len - 0.1, 0.1, 0.16), { pos: [(x + x2) / 2, (yTop + yBot) / 2, z], rot: [0, 0, ang], color: PALETTE.impMid, texel: 2 });
      }
    }
    kit.box("emitWhiteSoft", 0, yBot - 0.16, z, W - 1.2, 0.03, 0.14, { uv: "keep" });
  }
  // longitudinal crane rails and their hangers are added with the crane (structure())
}

// ---------------------------------------------------------------------------
// The well: dark panelled walls from the hull skin to the deck, hazard lip, blue rim, guide lights
// ---------------------------------------------------------------------------
function well(kit, ctx) {
  const wb = [
    [HOLE.x0 + 0.1, -WELL_DEPTH, HOLE.z0 + 0.1],
    [HOLE.x1 - 0.1, 0, HOLE.z1 - 0.1],
  ];
  const fake = { doors: [], bounds: wb, seed: ctx.seed + 3 };
  const SLOT = 1.25; // door-leaf slot under the deck (leaves run at y -1.1 .. -0.02)
  const LIP = 0.6;
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
    impWall(kit, fake, side, {
      bounds: wb,
      base: -WELL_DEPTH,
      height: WELL_DEPTH - SLOT - LIP,
      noDoors: true,
      rows: [0, 1.6, 4.6, 6.6, WELL_DEPTH - SLOT - LIP],
      panelW: 3.5,
      kick: false,
      trim: false,
      collide: false,
      paints: WELL_PAINTS,
      styles: { panel: 0.62, vent: 0.1, greeble: 0.06, conduit: 0.14, strip: 0.08 },
      seed: ctx.seed + side.length * 3,
    });
    const seg = wallSegment(wb, side);
    const { frame, length } = wallFrame(kit, seg.from, seg.to, -WELL_DEPTH);
    // hazard lip under the door slot, then the black slot / track band right under the deck edge
    frame.box("hazard", length / 2, WELL_DEPTH - SLOT - LIP / 2, 0.02, length, LIP, 0.04, { texel: 2 });
    frame.box("paintedMetal", length / 2, WELL_DEPTH - SLOT / 2, 0.03, length, SLOT, 0.06, { color: PALETTE.impBlack, texel: 2 });
    frame.box("metal", length / 2, WELL_DEPTH - 0.08, 0.065, length, 0.05, 0.02, { color: PALETTE.steel });
    frame.box("metal", length / 2, WELL_DEPTH - SLOT + 0.04, 0.065, length, 0.05, 0.02, { color: PALETTE.steel });
    // continuous white approach strip under the hazard lip: outlines the bay from space
    frame.box("paintedMetal", length / 2, WELL_DEPTH - SLOT - LIP - 0.45, 0.05, length, 0.5, 0.1, { color: PALETTE.impBlack, texel: 2 });
    frame.box("emitWhite", length / 2, WELL_DEPTH - SLOT - LIP - 0.45, 0.105, length - 0.4, 0.22, 0.01);
    // containment-field emitter rim at y = -9
    frame.box("paintedMetal", length / 2, 1.0, 0.08, length, 0.36, 0.16, { color: PALETTE.impBlack, texel: 2 });
    frame.box("emitBlue", length / 2, 1.0, 0.165, length - 0.3, 0.14, 0.01);
    // amber guide lights half way down, every 5 m
    for (let u = 2.5; u < length - 1.5; u += 5) {
      frame.box("paintedMetal", u, 5.0, 0.05, 1.0, 0.4, 0.1, { color: PALETTE.impDark, texel: 2 });
      frame.box("emitAmber", u, 5.0, 0.105, 0.8, 0.2, 0.01);
    }
  }
}

// ---------------------------------------------------------------------------
// Curb, railings and barrier posts fencing the opening; lane lights
// ---------------------------------------------------------------------------
function curbAndRails(kit, ctx) {
  const c = 0.9;
  const cx0 = HOLE.x0 - c;
  const cx1 = HOLE.x1 + c;
  const cz0 = HOLE.z0 - c;
  const cz1 = HOLE.z1 + c;
  for (const [x0, z0, x1, z1] of [
    [cx0, cz0, cx1, HOLE.z0],
    [cx0, HOLE.z1, cx1, cz1],
    [cx0, HOLE.z0, HOLE.x0, HOLE.z1],
    [HOLE.x1, HOLE.z0, cx1, HOLE.z1],
  ]) {
    kit.boxMM("paintedMetal", [x0, 0, z0], [x1, 0.2, z1], { color: PALETTE.impDark, texel: 1.5 });
    kit.boxMM("hazard", [x0 + 0.02, 0.2, z0 + 0.02], [x1 - 0.02, 0.215, z1 - 0.02], { texel: 2 });
    kit.collider([x0, 0, z0], [x1, 0.2, z1], "curb"); // steppable: the player stands on it, the railing stops them
  }
  const ry = 0.2;
  const rx0 = HOLE.x0 - 0.35;
  const rx1 = HOLE.x1 + 0.35;
  const rz0 = HOLE.z0 - 0.35;
  const rz1 = HOLE.z1 + 0.35;
  // long sides: continuous railing
  railing(kit, rx0, rz0, rx0, rz1, ry);
  railing(kit, rx1, rz0, rx1, rz1, ry);
  // fore / aft sides: railing with a barrier-post section across the launch lane (x -5..5)
  for (const z of [rz0, rz1]) {
    railing(kit, rx0, z, -5, z, ry);
    railing(kit, 5, z, rx1, z, ry);
    barrierPosts(kit, -5, 5, z, ry);
  }
  // recessed lane lights around the opening (amber) just outside the curb
  const lane = (x0, z0, x1, z1) => {
    kit.boxMM("paintedMetal", [x0 - 0.16, 0, z0 - 0.16], [x1 + 0.16, 0.02, z1 + 0.16], { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM("emitAmber", [x0, 0.02, z0], [x1, 0.032, z1], {});
  };
  lane(cx0 - 0.9, cz0 - 0.9, cx0 - 0.76, cz1 + 0.9);
  lane(cx1 + 0.76, cz0 - 0.9, cx1 + 0.9, cz1 + 0.9);
  lane(cx0 - 0.9, cz0 - 0.9, cx1 + 0.9, cz0 - 0.76);
  lane(cx0 - 0.9, cz1 + 0.76, cx1 + 0.9, cz1 + 0.9);
  // white launch-lane dashes from the aft door to the opening and on the forward apron
  for (const [zA, zB] of [
    [cz1 + 3, -40],
    [-151, cz0 - 3],
  ]) {
    for (let z = Math.min(zA, zB); z < Math.max(zA, zB); z += 2.4) {
      for (const s of [-1, 1]) {
        kit.boxMM("paintedMetal", [s * 4 - 0.2, 0, z], [s * 4 + 0.2, 0.02, z + 1.4], { color: PALETTE.impBlack, texel: 2 });
        kit.boxMM("hg_lane", [s * 4 - 0.08, 0.02, z + 0.1], [s * 4 + 0.08, 0.032, z + 1.3], {});
      }
    }
  }
  void ctx;
}

/** Retractable barrier posts with a lit bar between them; collides like a railing. */
function barrierPosts(kit, x0, x1, z, y) {
  const n = 5;
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / (n - 1);
    kit.box("paintedMetal", x, y + 0.55, z, 0.22, 1.1, 0.22, { color: PALETTE.impDark, texel: 2 });
    kit.box("hazard", x, y + 0.98, z, 0.24, 0.16, 0.24, { texel: 3 });
    kit.box("emitAmber", x, y + 1.12, z, 0.1, 0.05, 0.1);
    kit.box("metal", x, y + 0.03, z, 0.34, 0.06, 0.34, { color: PALETTE.gunmetal });
  }
  kit.box("paintedMetal", (x0 + x1) / 2, y + 0.85, z, x1 - x0, 0.06, 0.06, { color: PALETTE.impBlack, texel: 2 });
  kit.box("emitAmber", (x0 + x1) / 2, y + 0.85, z, x1 - x0 - 0.3, 0.03, 0.07);
  kit.box("metal", (x0 + x1) / 2, y + 0.45, z, x1 - x0, 0.03, 0.03, { color: PALETTE.steel });
  kit.collider([x0 - 0.15, y, z - 0.15], [x1 + 0.15, y + 1.15, z + 0.15], "barrier");
}

// ---------------------------------------------------------------------------
// Deck markings: the shared hangar-markings decal on both aprons
// ---------------------------------------------------------------------------
function deckMarkings(kit, ctx, B0) {
  const [min, max] = B0;
  const w = max[0] - min[0] - 3; // the whole 2048 px texture width spans the deck width
  // the parking aprons either side of the launch lane get the marked-up decal (numbered bays, boundary
  // stroke, worn paint); the 22 m centre lane stays black gloss with only the lit lane dashes
  const uCut = 0.34;
  for (const [z0, z1, flip] of [
    [HOLE.z1 + 2.2, max[2] - 3.2, false],
    [min[2] + 3.2, HOLE.z0 - 2.2, true],
  ]) {
    const d = z1 - z0;
    // uniform texel scale: 2048 px across w metres; take the matching slice of the 1024 px height
    const vSpan = Math.min(1, (d / w) * 2);
    for (const s of [-1, 1]) {
      const pw = w * uCut;
      const g = new THREE.PlaneGeometry(pw, d);
      g.rotateX(-Math.PI / 2);
      if (flip) g.rotateY(Math.PI);
      const cx = s * (w / 2 - pw / 2);
      const u0 = (flip ? -s : s) < 0 ? 0 : 1 - uCut;
      kit.add("hg_markings", g, { pos: [cx, 0.012, (z0 + z1) / 2], uv: "keep", uvRect: [u0, 1 - vSpan, u0 + uCut, 1] });
    }
  }
  void ctx;
}

// ---------------------------------------------------------------------------
// Structure: pilasters, catwalks at y = 8, stairs, crane rails, flood housings, big numerals
// ---------------------------------------------------------------------------
function structure(kit, ctx, B0) {
  const [min, max] = B0;
  // pilasters along the long walls (skipping the portals) and the end walls
  const portals = ctx.doors.filter((d) => d.wall === "z");
  for (const s of [-1, 1]) {
    const x = s * (max[0] - 0.32);
    for (const z of [-149, -137, -125, -113, -101, -89, -77]) {
      const blocked = portals.some((d) => Math.sign(d.pos[0]) === s && Math.abs(d.pos[1] - z) < d.w / 2 + 2.5);
      if (blocked) continue;
      pillar(kit, x, z, 0, CEIL, 0.64, PALETTE.impMid);
    }
  }
  for (const x of [-30, -12, 12, 30]) {
    pillar(kit, x, min[2] + 0.32, 0, CEIL, 0.64, PALETTE.impMid);
    pillar(kit, x, max[2] - 0.32, 0, CEIL, 0.64, PALETTE.impMid);
  }

  // long catwalks at y = 8 (ending before the portals) with brackets and railings
  for (const s of [-1, 1]) {
    const portal = portals.find((d) => Math.sign(d.pos[0]) === s);
    const zEnd = portal ? portal.pos[1] + portal.w / 2 + 1.6 : -95;
    const xi = s * 32.6; // inner edge
    const xoNarrow = s * 34.1; // beside the gantry stairs
    const xoWide = s * 35.3;
    const zStairEnd = GANTRY_Z1;
    platform(kit, ctx, { x0: Math.min(xi, xoNarrow), z0: zStairEnd, x1: Math.max(xi, xoNarrow), z1: -39.6, y: CAT_Y, thickness: 0.25, mat: "grate" });
    platform(kit, ctx, { x0: Math.min(xi, xoWide), z0: zEnd, x1: Math.max(xi, xoWide), z1: zStairEnd, y: CAT_Y, thickness: 0.25, mat: "grate" });
    railing(kit, xi, -39.6, xi, zEnd, CAT_Y);
    railing(kit, xi, zEnd, xoWide, zEnd, CAT_Y);
    railing(kit, xoWide, zEnd, xoWide, zStairEnd - 0.1, CAT_Y);
    // the gantry stairs climb beside the narrow catwalk; where they are above head height the void
    // under them is fenced (outer edge of the narrow walk + the dead end of the wide walk)
    const zUnder = STAIR_Z0 - (2.0 / ((GANTRY_Y - CAT_Y) / 2)) * FLIGHT;
    railing(kit, xoNarrow, zStairEnd - 0.1, xoNarrow, zUnder, CAT_Y);
    railing(kit, xoNarrow, zStairEnd - 0.1, xoWide, zStairEnd - 0.1, CAT_Y);
    // wall brackets: a beam under the walk every 6 m plus a knee brace
    for (let z = zEnd + 1; z < -40; z += 6) {
      kit.box("paintedMetal", s * 34.3, CAT_Y - 0.4, z, 3.4, 0.24, 0.24, { color: PALETTE.impDark, texel: 2 });
      kit.add("paintedMetal", new THREE.BoxGeometry(0.16, 3.6, 0.16), { pos: [s * 34.2, CAT_Y - 1.9, z], rot: [0, 0, s * 0.62], color: PALETTE.impDark, texel: 2 });
    }
    // stairs from the catwalk up to the boarding gantry: two straight flights with a landing, hugging
    // the wall (x 34.4 .. 35.9) so the catwalk beside them stays walkable
    const sx = s * 35.15;
    const midY = (CAT_Y + GANTRY_Y) / 2;
    const a = stairs(kit, ctx, { x: sx, z: STAIR_Z0, y0: CAT_Y, y1: midY, axis: "z", dir: -1, w: 1.5 });
    const landZ0 = STAIR_Z0 - a.total;
    platform(kit, ctx, { x0: Math.min(sx - 0.75, sx + 0.75), z0: landZ0 - LANDING, x1: Math.max(sx - 0.75, sx + 0.75), z1: landZ0, y: midY, thickness: 0.25, mat: "grate" });
    railing(kit, s * 34.4, landZ0 - LANDING, s * 34.4, landZ0, midY);
    const b = stairs(kit, ctx, { x: sx, z: landZ0 - LANDING, y0: midY, y1: GANTRY_Y, axis: "z", dir: -1, w: 1.5 });
    stairGuard(kit, { x: sx, z: STAIR_Z0, axis: "z", dir: -1, w: 1.5, y0: CAT_Y, y1: midY, total: a.total, sides: [-s] });
    stairGuard(kit, { x: sx, z: landZ0 - LANDING, axis: "z", dir: -1, w: 1.5, y0: midY, y1: GANTRY_Y, total: b.total, sides: [-s] });
    // columns from the deck carrying the landing
    for (const z of [landZ0 - LANDING + 0.3, landZ0 - 0.3]) pillar(kit, sx, z, 0, midY - 0.25, 0.4, PALETTE.impDark);
  }

  // flood housings hanging from the trusses (the lights themselves are in lighting())
  for (const [x, z] of FLOODS) {
    kit.box("paintedMetal", x, CEIL - 2.2, z, 2.6, 0.9, 2.6, { color: PALETTE.impDark, texel: 1.5 });
    kit.box("paintedMetal", x, CEIL - 1.5, z, 0.5, 0.6, 0.5, { color: PALETTE.impBlack, texel: 2 });
    kit.box("emitWhite", x, CEIL - 2.67, z, 2.2, 0.04, 2.2);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      kit.box("metal", x + dx * 1.35, CEIL - 2.2, z + dz * 1.35, dx ? 0.1 : 2.4, 0.5, dz ? 0.1 : 2.4, { color: PALETTE.gunmetal });
    }
  }

  // crane rails along z on both sides of the opening, hung from the trusses
  for (const s of [-1, 1]) {
    const x = s * 24.6;
    kit.boxMM("paintedMetal", [x - 0.35, 24.7, HOLE.z0 - 4], [x + 0.35, 25.3, HOLE.z1 + 4], { color: PALETTE.impDark, texel: 1.5 });
    kit.boxMM("metal", [x - 0.08, 25.3, HOLE.z0 - 4], [x + 0.08, 25.42, HOLE.z1 + 4], { color: PALETTE.steel });
    for (let z = HOLE.z0 - 3; z <= HOLE.z1 + 3; z += 9.5) {
      kit.box("paintedMetal", x, (25.3 + CEIL - 1.5) / 2, z, 0.3, CEIL - 1.5 - 25.3, 0.3, { color: PALETTE.impMid, texel: 2 });
    }
  }

  // bay numerals: big lit "05" on the forward wall, rack numbers on the side walls
  {
    const seg = wallSegment(B0, "zmin");
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    frame.box("paintedMetal", length / 2, 18.5, 0.06, 9.2, 6.4, 0.12, { color: PALETTE.impBlack, texel: 2 });
    segDigit(frame, "emitWhite", length / 2 - 2.2, 16.0, 0.13, 0, 5.0);
    segDigit(frame, "emitWhite", length / 2 + 2.2, 16.0, 0.13, 5, 5.0);
    frame.box("emitRed", length / 2, 14.6, 0.13, 8.4, 0.12, 0.02);
    frame.box("emitRed", length / 2, 22.3, 0.13, 8.4, 0.12, 0.02);
  }
  // rack numbers between the racks (clear of the wings and the portal heads), lit white on black
  RACK_Z.forEach((rz, i) => {
    for (const s of [-1, 1]) {
      const side = s < 0 ? "xmin" : "xmax";
      const seg = wallSegment(B0, side);
      const { frame } = wallFrame(kit, seg.from, seg.to, 0);
      const zz = rz + 6.5;
      const u = side === "xmax" ? zz - min[2] : max[2] - zz;
      const digit = i + 1 + (s > 0 ? 4 : 0);
      frame.box("paintedMetal", u, 15.0, 0.05, 2.4, 3.2, 0.1, { color: PALETTE.impBlack, texel: 2 });
      segDigit(frame, "emitWhite", u, 13.7, 0.11, digit, 2.4);
      frame.box("emitAmber", u, 16.45, 0.11, 2.0, 0.08, 0.02);
    }
  });
}

/** Invisible guard boxes following a stair flight so the player cannot walk off its open side(s). */
function stairGuard(kit, { x, z, axis, dir, w, y0, y1, total, sides }) {
  const n = Math.max(1, Math.ceil(total / 1.5));
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * total;
    const a1 = ((i + 1) / n) * total;
    const ya = y0 + (((a0 + a1) / 2) / total) * (y1 - y0);
    for (const sd of sides) {
      const off = sd * (w / 2 + 0.06);
      if (axis === "z") {
        const zA = z + dir * a0;
        const zB = z + dir * a1;
        kit.collider([x + off - 0.05, ya - 0.3, Math.min(zA, zB)], [x + off + 0.05, ya + 1.05, Math.max(zA, zB)], "stairguard");
      } else {
        const xA = x + dir * a0;
        const xB = x + dir * a1;
        kit.collider([Math.min(xA, xB), ya - 0.3, z + off - 0.05], [Math.max(xA, xB), ya + 1.05, z + off + 0.05], "stairguard");
      }
    }
  }
}

function segDigit(frame, mat, u, v, n, digit, h) {
  const s = h / 1.8;
  for (const k of DIGITS[digit]) {
    const [cx, cy, w, hh] = SEG[k];
    frame.box(mat, u + (cx - 0.5) * s, v + cy * s, n, w * s, hh * s, 0.03);
  }
}

// ---------------------------------------------------------------------------
// Flight-control tower on a mezzanine over the aft door, stairs and the y = 8 aft walkway
// ---------------------------------------------------------------------------
function towerAndMezzanine(kit, ctx, B0) {
  const [min, max] = B0;
  const T = TOWER;
  // mezzanine floor + roof
  platform(kit, ctx, { x0: T.x0, z0: T.z0, x1: T.x1, z1: T.z1, y: T.y0, thickness: 0.4 });
  kit.boxMM("paintedMetal", [T.x0 - 0.4, T.y1, T.z0 - 0.4], [T.x1 + 0.4, T.y1 + 0.45, T.z1], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("impPanel", [T.x0 - 0.3, T.y1 + 0.45, T.z0 - 0.3], [T.x1 + 0.3, T.y1 + 0.6, T.z1], { color: PALETTE.impGrey, uv: "keep" });
  // underside: dark soffit with light strips lighting the entry below
  kit.boxMM("paintedMetal", [T.x0 - 0.4, T.y0 - 0.55, T.z0 - 0.4], [T.x1 + 0.4, T.y0 - 0.4, T.z1], { color: PALETTE.impDark, texel: 1.5 });
  for (const x of [-8, 0, 8]) kit.boxMM("emitWhiteSoft", [x - 2.6, T.y0 - 0.58, T.z0 + 1.5], [x + 2.6, T.y0 - 0.55, T.z0 + 1.9], { uv: "keep" });
  // front parapet + glass + mullions, side walls (front half only; the rear is open to the stairs)
  const zf = T.z0 + 0.1;
  kit.boxMM("impPanel1", [T.x0, T.y0, zf - 0.12], [T.x1, T.y0 + 1.05, zf + 0.12], { color: PALETTE.impMid, uv: "keep" });
  kit.boxMM("paintedMetal", [T.x0 - 0.1, T.y0 + 1.05, zf - 0.14], [T.x1 + 0.1, T.y0 + 1.2, zf + 0.14], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("paintedMetal", [T.x0 - 0.1, T.y1 - 0.25, zf - 0.14], [T.x1 + 0.1, T.y1, zf + 0.14], { color: PALETTE.impBlack, texel: 2 });
  const panes = 5;
  for (let i = 0; i <= panes; i++) {
    const x = T.x0 + ((T.x1 - T.x0) * i) / panes;
    kit.box("paintedMetal", x, (T.y0 + 1.2 + T.y1 - 0.25) / 2, zf, 0.16, T.y1 - 0.25 - (T.y0 + 1.2), 0.24, { color: PALETTE.impBlack, texel: 2 });
  }
  const gg = new THREE.PlaneGeometry(T.x1 - T.x0, T.y1 - 0.25 - (T.y0 + 1.2));
  kit.add("bridgeGlass", gg, { pos: [0, (T.y0 + 1.2 + T.y1 - 0.25) / 2, zf], rot: [0, Math.PI, 0], uv: "keep" });
  kit.collider([T.x0 - 0.1, T.y0, zf - 0.2], [T.x1 + 0.1, T.y1, zf + 0.2], "towerglass");
  for (const s of [-1, 1]) {
    const x = s > 0 ? T.x1 : T.x0;
    const zEnd = -39.6;
    kit.boxMM("impPanel", [x - 0.1, T.y0, T.z0], [x + 0.1, T.y1, zEnd], { color: PALETTE.impLight, uv: "keep" });
    kit.boxMM("paintedMetal", [x - 0.14, T.y0, zEnd - 0.14], [x + 0.14, T.y1, zEnd], { color: PALETTE.impBlack, texel: 2 });
    kit.collider([x - 0.14, T.y0, T.z0], [x + 0.14, T.y1, zEnd], "towerwall");
    // corner pillars supporting the mezzanine
    pillar(kit, x, T.z0 + 0.4, 0, T.y0 - 0.4, 0.7, PALETTE.impMid);
  }
  // consoles facing the bay + operator screens on the aft wall
  for (const x of [-6.5, 0, 6.5]) impConsole(kit, ctx, { x, y: T.y0, z: T.z0 + 1.9, yaw: 0, w: 3.2, d: 0.9, screens: [0, 2, 0], chair: true, seed: ctx.seed + x });
  const tw = wallSegment(B0, "zmax");
  for (const x of [-9, -5.5, 5.5, 9]) wallScreen(kit, ctx, { side: "zmax", u: tw.from[0] - x, v: T.y0 + 2.1, w: 1.6, h: 0.9, screen: x < 0 ? 0 : 2, bounds: B0 });
  wallScreen(kit, ctx, { side: "zmax", u: tw.from[0], v: T.y0 + 2.4, w: 3.2, h: 1.5, screen: 1, bounds: B0 });
  equipmentRack(kit, ctx, { side: "zmax", u: tw.from[0] + 11.2, w: 1.4, h: 2.4, seed: ctx.seed + 1, bounds: B0 });
  // hologram table between the consoles and the glass: a small deck plan
  const holo = ctx.materials.holo;
  kit.box("paintedMetal", 0, T.y0 + 0.45, T.z0 + 4.4, 1.6, 0.9, 1.0, { color: PALETTE.impBlack, texel: 2 });
  kit.box("emitBlue", 0, T.y0 + 0.905, T.z0 + 4.4, 1.3, 0.01, 0.7);
  kit.collider([-0.8, T.y0, T.z0 + 3.9], [0.8, T.y0 + 0.9, T.z0 + 4.9], "holotable");
  void holo;
  // ceiling light fixture inside the tower
  kit.box("paintedMetal", 0, T.y1 - 0.06, T.z0 + 4.4, 12, 0.1, 0.6, { color: PALETTE.impBlack, texel: 2 });
  kit.box("emitWhiteSoft", 0, T.y1 - 0.11, T.z0 + 4.4, 11.6, 0.03, 0.3, { uv: "keep" });
  // lit lettering: "FLIGHT CONTROL" stand-in — a lit bar with the deck number over the glass
  kit.box("paintedMetal", 0, T.y1 + 0.25, zf - 0.32, 6, 0.5, 0.2, { color: PALETTE.impBlack, texel: 2 });
  kit.box("emitBlue", 0, T.y1 + 0.25, zf - 0.43, 5.4, 0.16, 0.02);

  // stairs from the deck up to the mezzanine, hugging the aft wall on both sides
  for (const s of [-1, 1]) {
    const run = stairs(kit, ctx, { x: s * 13.3, z: -36.1, y0: 0, y1: T.y0, axis: "x", dir: s, w: 1.8 });
    stairGuard(kit, { x: s * 13.3, z: -36.1, axis: "x", dir: s, w: 1.8, y0: 0, y1: T.y0, total: run.total, sides: [-1] });
    // walkway in front of the stairs at y = 8, out to the long catwalks
    const xa = s * 13.0;
    const xb = s * 35.9;
    const xStairEnd = s * (13.3 + run.total);
    platform(kit, ctx, { x0: Math.min(xa, xb), z0: -39.6, x1: Math.max(xa, xb), z1: -37.0, y: T.y0, thickness: 0.25, mat: "grate" });
    platform(kit, ctx, { x0: Math.min(xStairEnd, xb), z0: -37.0, x1: Math.max(xStairEnd, xb), z1: T.z1, y: T.y0, thickness: 0.25, mat: "grate" });
    railing(kit, xa, -39.6, s * 32.5, -39.6, T.y0);
    // railing along the walkway edge above the stair flight (the flight's top lands beyond it)
    railing(kit, s * 13.3, -37.0, s * (13.3 + run.total - 0.4), -37.0, T.y0);
    // solid parapet under the walkway edge so the stair well below reads as a bay, not a hole
    kit.boxMM("paintedMetal", [Math.min(xa, xStairEnd), T.y0 - 0.5, -37.1], [Math.max(xa, xStairEnd), T.y0 - 0.25, -36.95], { color: PALETTE.impBlack, texel: 2 });
  }
  void min;
  void max;
}

// ---------------------------------------------------------------------------
// TIE racks: ceiling gantries, clamp yokes, boarding gantries with bridges, refuelling, umbilicals
// ---------------------------------------------------------------------------
function racks(kit, ctx, B0) {
  const [min, max] = B0;
  for (const s of [-1, 1]) {
    const rx = s * RACK_X;
    const wallX = s * max[0];
    const zA = RACK_Z[0] - 3.5;
    const zB = RACK_Z[RACK_Z.length - 1] + 3.5;
    // main gantry beam along the row + lit underside
    kit.boxMM("paintedMetal", [rx - 0.8, BEAM_Y0, zA], [rx + 0.8, BEAM_Y1, zB], { color: PALETTE.impDark, texel: 1.2 });
    kit.boxMM("hazard", [rx - 0.82, BEAM_Y0 + 0.2, zA], [rx + 0.82, BEAM_Y0 + 0.5, zB], { texel: 2 });
    kit.boxMM("emitWhiteSoft", [rx - 0.2, BEAM_Y0 - 0.03, zA + 0.5], [rx + 0.2, BEAM_Y0, zB - 0.5], { uv: "keep" });
    // boarding gantry along the wall at the wing-apex level, from the forward rack to the stair head;
    // the inner railing is broken where the bridges leave it
    const gx0 = Math.min(s * 34.4, s * 35.9);
    const gx1 = Math.max(s * 34.4, s * 35.9);
    const gz0 = RACK_Z[0] - 3;
    platform(kit, ctx, { x0: gx0, z0: gz0, x1: gx1, z1: GANTRY_Z1, y: GANTRY_Y, thickness: 0.25, mat: "grate" });
    let zr = gz0;
    for (const rz of RACK_Z) {
      railing(kit, s * 34.4, zr, s * 34.4, rz - 0.75, GANTRY_Y);
      zr = rz + 0.75;
    }
    railing(kit, s * 34.4, zr, s * 34.4, GANTRY_Z1, GANTRY_Y);
    railing(kit, s * 34.4, gz0, s * 35.9, gz0, GANTRY_Y);
    for (let z = gz0 + 2; z < GANTRY_Z1; z += 9) {
      kit.box("paintedMetal", s * 35.2, GANTRY_Y - 0.45, z, 1.6, 0.2, 0.2, { color: PALETTE.impDark, texel: 2 });
      kit.add("paintedMetal", new THREE.BoxGeometry(0.14, 1.9, 0.14), { pos: [s * 35.0, GANTRY_Y - 1.2, z], rot: [0, 0, -s * 0.72], color: PALETTE.impDark, texel: 2 });
    }
    RACK_Z.forEach((rz, i) => {
      // cross beam from the wall to the inner rail
      const xin = s * (HOLE.x1 + 1.4);
      kit.boxMM("paintedMetal", [Math.min(wallX, xin), BEAM_Y0 + 0.35, rz - 0.5], [Math.max(wallX, xin), BEAM_Y1 - 0.15, rz + 0.5], { color: PALETTE.impMid, texel: 1.2 });
      kit.boxMM("emitWhite", [Math.min(rx - 6, rx + 6), BEAM_Y0 + 0.33, rz - 0.08], [Math.max(rx - 6, rx + 6), BEAM_Y0 + 0.35, rz + 0.08], {});
      // clamp yokes: two arms per wing gripping the top edge at z = rz ± 1.2 (the boarding bridge
      // passes between them), hazard-striped clamp blocks with a green "locked" lamp
      // (the wing hexagon's upper slanted edges pass y = RACK_Y + 2.7 at z = ±1.2, so the blocks straddle them)
      const grip = RACK_Y + 3.05;
      for (const w of [-1, 1]) {
        const wx = rx + w * WING_X;
        for (const dz of [-1.2, 1.2]) {
          kit.box("paintedMetal", wx, (BEAM_Y0 + grip + 0.4) / 2, rz + dz, 0.5, BEAM_Y0 - (grip + 0.4), 0.6, { color: PALETTE.impDark, texel: 1.5 });
          kit.box("metal", wx, grip, rz + dz, 0.8, 0.8, 0.8, { color: PALETTE.gunmetal });
          kit.box("hazard", wx, grip, rz + dz + Math.sign(dz) * 0.41, 0.82, 0.5, 0.02, { texel: 3 });
          kit.cyl("metal", wx + w * 0.5, BEAM_Y0 - 0.9, rz + dz, 0.12, 1.5, "y", { color: PALETTE.steel, segments: 8 });
          kit.box("emitGreen", wx + w * 0.41, grip + 0.27, rz + dz, 0.02, 0.08, 0.3);
        }
        // grip bar bridging the two blocks over the wing apex
        kit.box("metal", wx, grip + 0.45, rz, 0.5, 0.2, 2.4, { color: PALETTE.gunmetal });
      }
      // power umbilical from the beam to the hull, with a coupling block
      pipeRun(kit, [[rx + 0.6, BEAM_Y0, rz + 1.2], [rx + 1.1, RACK_Y + 3.1, rz + 1.9], [rx + 0.35, RACK_Y + 1.95, rz + 0.7]], 0.07, PALETTE.impBlack, "rubber");
      kit.box("metal", rx + 0.35, RACK_Y + 1.9, rz + 0.7, 0.36, 0.3, 0.36, { color: PALETTE.gunmetal });
      // boarding bridge over the outer wing to a ladder head above the hatch
      const bx0 = Math.min(s * 34.4, rx + s * 1.3);
      const bx1 = Math.max(s * 34.4, rx + s * 1.3);
      platform(kit, ctx, { x0: bx0, z0: rz - 0.55, x1: bx1, z1: rz + 0.55, y: GANTRY_Y, thickness: 0.2, mat: "grate" });
      railing(kit, bx0, rz - 0.55, bx1, rz - 0.55, GANTRY_Y);
      railing(kit, bx0, rz + 0.55, bx1, rz + 0.55, GANTRY_Y);
      railing(kit, rx + s * 1.3, rz - 0.55, rx + s * 1.3, rz + 0.55, GANTRY_Y);
      // ladder from the bridge end down to the hatch
      const lx = rx + s * 1.2;
      for (const dz of [-0.3, 0.3]) kit.box("metal", lx, (GANTRY_Y - 0.2 + RACK_Y + 1.5) / 2, rz + dz, 0.05, GANTRY_Y - 0.2 - (RACK_Y + 1.5), 0.05, { color: PALETTE.steel });
      for (let y = RACK_Y + 1.7; y < GANTRY_Y - 0.3; y += 0.3) kit.box("metal", lx, y, rz, 0.04, 0.04, 0.6, { color: PALETTE.steel });
      // refuelling station on the gantry: pump cabinet, gauge, hose to the hull
      const cz = rz + 2.6;
      kit.box("paintedMetal", s * 35.6, GANTRY_Y + 0.8, cz, 0.6, 1.6, 0.7, { color: PALETTE.impDark, texel: 2 });
      kit.box("impPanel", s * 35.29, GANTRY_Y + 0.9, cz, 0.02, 1.2, 0.5, { color: PALETTE.impGrey, uv: "keep" });
      kit.box("emitAmber", s * 35.27, GANTRY_Y + 1.35, cz, 0.01, 0.12, 0.3);
      kit.box("leds", s * 35.27, GANTRY_Y + 1.1, cz, 0.01, 0.05, 0.3, { uv: "keep" });
      kit.cyl("metal", s * 35.6, GANTRY_Y + 1.62, cz, 0.16, 0.3, "y", { color: PALETTE.steel, segments: 10 });
      kit.collider([Math.min(s * 35.3, s * 35.9), GANTRY_Y, cz - 0.35], [Math.max(s * 35.3, s * 35.9), GANTRY_Y + 1.6, cz + 0.35], "pump");
      pipeRun(kit, [[s * 35.3, GANTRY_Y + 0.5, cz], [s * 34.2, GANTRY_Y + 0.25, rz + 2.0], [rx + s * 2.6, RACK_Y + 2.6, rz + 1.3], [rx + s * 1.1, RACK_Y + 1.55, rz - 0.5]], 0.06, PALETTE.impMid, "rubber");
      kit.box("metal", rx + s * 1.1, RACK_Y + 1.5, rz - 0.5, 0.3, 0.3, 0.3, { color: PALETTE.gunmetal });
      void i;
    });
  }
  void min;
}

// ---------------------------------------------------------------------------
// Props: bowsers, tool carts, crates, fire cabinets, signage, wall equipment
// ---------------------------------------------------------------------------
function props(kit, ctx, B0, rand) {
  const [min, max] = B0;
  // forward apron: container clusters in the corners, two bowsers, tool carts
  crateCluster(kit, ctx, -31, -150, 3, rand, ctx.seed + 11);
  crateCluster(kit, ctx, 31, -150, 3, rand, ctx.seed + 17);
  crateCluster(kit, ctx, 29, -134, 2, rand, ctx.seed + 23);
  bowser(kit, ctx, -12, -146, 0.3);
  bowser(kit, ctx, 14, -138, -0.5);
  toolCart(kit, ctx, -4, -150, 0.2);
  toolCart(kit, ctx, 5, -149, -0.4);
  toolCart(kit, ctx, -30, -132, 1.2);
  // aft apron: a bowser and carts off the lane, crates by the stairs
  bowser(kit, ctx, 26, -50, 1.4);
  toolCart(kit, ctx, -24, -46, -0.3);
  toolCart(kit, ctx, -18, -57, 0.9);
  toolCart(kit, ctx, 20, -58, 0.1);
  crateCluster(kit, ctx, -30, -50, 2, rand, ctx.seed + 29);
  // side strips beside the opening: rack-servicing carts and cabinets under each rack
  for (const s of [-1, 1]) {
    RACK_Z.forEach((rz, i) => {
      if (i % 2 === 0) toolCart(kit, ctx, s * 30, rz + 5, s * 0.4);
      else fireCabinet(kit, ctx, s < 0 ? "xmin" : "xmax", rz + 6, B0);
    });
  }
  // wall equipment: racks + screens on the forward wall, fire cabinets by the aft door
  for (const u of [8, 14, 58, 64]) equipmentRack(kit, ctx, { side: "zmin", u, w: 1.6, h: 2.8, seed: ctx.seed + u, bounds: B0, lit: u < 30 ? "emitAmber" : "emitBlue" });
  for (const u of [11, 61]) wallScreen(kit, ctx, { side: "zmin", u, v: 3.1, w: 1.8, h: 0.9, screen: 1, bounds: B0 });
  fireCabinet(kit, ctx, "zmax", 36 + 4.2, B0);
  fireCabinet(kit, ctx, "zmax", 36 - 4.2, B0);
  // warning decals beside the portals and the aft door
  const decal = (side, u, v, idx, size = 1.2) => {
    const seg = wallSegment(B0, side);
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    frame.add("decal", new THREE.PlaneGeometry(size, size), u, v, 0.012, { uv: "keep", uvRect: decalRect(idx) });
  };
  for (const d of ctx.doors) {
    if (d.wall === "z") {
      const side = d.pos[0] < 0 ? "xmin" : "xmax";
      const u = side === "xmax" ? d.pos[1] - min[2] : max[2] - d.pos[1];
      decal(side, u - d.w / 2 - 1.4, 2.2, 1, 1.4);
      decal(side, u + d.w / 2 + 1.4, 2.2, 7, 1.4);
      decal(side, u, d.h + 1.2, 10, 2.4);
    } else {
      const u = max[0] - d.pos[0];
      decal("zmax", u - 3.2, 2.0, 8, 1.2);
      decal("zmax", u + 3.2, 2.0, 5, 1.2);
    }
  }
  // hazard-stripe stencils where the launch lane meets the aprons' edges
  for (const x of [-30, 30]) decal(x < 0 ? "xmin" : "xmax", x < 0 ? max[2] - -140 : -140 - min[2], 1.6, 13, 1.0);
}

function crateCluster(kit, ctx, x, z, n, rand, seed) {
  for (let i = 0; i < n; i++) {
    const ang = rand() * Math.PI * 2;
    const r = i === 0 ? 0 : 1.6 + rand() * 1.2;
    const sx = 1.4 + rand() * 1.4;
    const sz = 1.2 + rand() * 1.2;
    crate(kit, ctx, { x: x + Math.cos(ang) * r, z: z + Math.sin(ang) * r, sx, sy: 1.0 + rand() * 1.2, sz, yaw: (rand() - 0.5) * 0.8, seed: seed + i });
  }
  if (n >= 3) crate(kit, ctx, { x, z, y: 1.0 + 1.1, sx: 1.4, sy: 0.9, sz: 1.2, yaw: 0.2, seed: seed + 9 });
}

/** Fuel bowser: a horizontal tank on a wheeled chassis with a pump housing and a hose reel. */
function bowser(kit, ctx, x, z, yaw) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const P = (lx, ly, lz) => {
    const v = new THREE.Vector3(lx, ly, lz).applyQuaternion(q);
    return [v.x + x, ly, v.z + z];
  };
  const add = (mat, geo, lx, ly, lz, extra = {}) => kit.add(mat, geo, { pos: P(lx, ly, lz), quat: q, ...extra });
  add("paintedMetal", new THREE.BoxGeometry(2.2, 0.3, 4.6), 0, 0.55, 0, { color: PALETTE.impBlack, texel: 2 });
  for (const sx of [-1, 1]) for (const sz of [-1.5, 1.5]) add("rubber", new THREE.CylinderGeometry(0.42, 0.42, 0.34, 14).rotateZ(Math.PI / 2), sx * 1.15, 0.42, sz, { color: PALETTE.impDark });
  const tank = new THREE.CylinderGeometry(0.95, 0.95, 3.6, 18).rotateX(Math.PI / 2);
  add("paintedMetal", tank, 0, 1.7, -0.2, { color: PALETTE.impGrey, texel: 1 });
  for (const sz of [-1, 1]) add("paintedMetal", new THREE.SphereGeometry(0.95, 18, 10), 0, 1.7, -0.2 + sz * 1.8, { color: PALETTE.impGrey, texel: 1 });
  add("hazard", new THREE.CylinderGeometry(0.97, 0.97, 0.3, 18).rotateX(Math.PI / 2), 0, 1.7, -0.2, { texel: 2 });
  add("paintedMetal", new THREE.BoxGeometry(1.4, 1.3, 0.9), 0, 1.35, 2.05, { color: PALETTE.impDark, texel: 2 });
  add("impPanel", new THREE.BoxGeometry(1.0, 0.6, 0.02), 0, 1.5, 2.51, { color: PALETTE.impGrey, uv: "keep" });
  add("emitAmber", new THREE.BoxGeometry(0.5, 0.08, 0.01), 0, 1.65, 2.525);
  add("leds", new THREE.BoxGeometry(0.6, 0.05, 0.01), 0, 1.4, 2.525, { uv: "keep" });
  add("metal", new THREE.TorusGeometry(0.5, 0.12, 8, 20).rotateY(Math.PI / 2), 1.2, 1.4, 1.2, { color: PALETTE.impMid });
  pipeRun(kit, [P(1.25, 1.4, 1.2), P(1.6, 0.6, 1.8), P(1.3, 0.2, 2.9), P(0.4, 0.15, 3.4)], 0.06, PALETTE.impBlack, "rubber");
  for (const sx of [-1, 1]) add("metal", new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), sx * 0.9, 1.2, 2.55, { color: PALETTE.steel });
  add("emitRed", new THREE.BoxGeometry(0.15, 0.08, 0.05), 0.9, 2.55, -0.2);
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (2.4 * c + 5.2 * s) / 2;
  const ez = (2.4 * s + 5.2 * c) / 2;
  kit.collider([x - ex, 0, z - ez], [x + ex, 2.7, z + ez], "bowser");
  void ctx;
}

/** Tool cart: a drawer cabinet on castors with tools on top and a lit status strip. */
function toolCart(kit, ctx, x, z, yaw) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const v = new THREE.Vector3(lx, ly, lz).applyQuaternion(q);
    return kit.add(mat, geo, { pos: [v.x + x, ly, v.z + z], quat: q, ...extra });
  };
  add("paintedMetal", new THREE.BoxGeometry(1.1, 0.9, 0.7), 0, 0.6, 0, { color: PALETTE.impDark, texel: 2 });
  for (let i = 0; i < 4; i++) add("metal", new THREE.BoxGeometry(0.9, 0.16, 0.02), 0, 0.28 + i * 0.2, 0.36, { color: i % 2 ? PALETTE.impMid : PALETTE.gunmetal });
  for (let i = 0; i < 4; i++) add("metal", new THREE.BoxGeometry(0.3, 0.03, 0.03), 0, 0.28 + i * 0.2, 0.38, { color: PALETTE.steel });
  add("rubber", new THREE.BoxGeometry(1.14, 0.06, 0.74), 0, 1.08, 0, { color: PALETTE.impBlack });
  add("emitBlue", new THREE.BoxGeometry(0.5, 0.03, 0.01), -0.2, 0.98, 0.361);
  for (const [sx, sz] of [
    [-0.45, -0.25],
    [0.45, -0.25],
    [-0.45, 0.25],
    [0.45, 0.25],
  ]) {
    add("rubber", new THREE.CylinderGeometry(0.08, 0.08, 0.08, 10).rotateZ(Math.PI / 2), sx, 0.08, sz, { color: PALETTE.impBlack });
  }
  // tools / parts on top
  add("metal", new THREE.CylinderGeometry(0.06, 0.06, 0.5, 10).rotateZ(Math.PI / 2), -0.2, 1.17, -0.1, { color: PALETTE.steel });
  add("metal", new THREE.BoxGeometry(0.3, 0.12, 0.2), 0.3, 1.17, 0.1, { color: PALETTE.gunmetal });
  add("hazard", new THREE.BoxGeometry(0.2, 0.1, 0.14), 0.2, 1.16, -0.2, { texel: 4 });
  // handle
  add("metal", new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), -0.6, 1.1, 0, { color: PALETTE.steel });
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (1.3 * c + 0.8 * s) / 2;
  const ez = (1.3 * s + 0.8 * c) / 2;
  kit.collider([x - ex, 0, z - ez], [x + ex, 1.2, z + ez], "cart");
  void ctx;
}

/** Red fire-suppression cabinet on a wall with a stencil and a lamp. */
function fireCabinet(kit, ctx, side, u, bounds) {
  const seg = wallSegment(bounds, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, 0);
  frame.box("paintedMetal", u, 1.1, 0.22, 0.9, 1.8, 0.44, { color: PALETTE.impDark, texel: 2 });
  frame.box("impPanel", u, 1.1, 0.446, 0.8, 1.6, 0.012, { color: new THREE.Color("#b8352a"), uv: "keep" });
  frame.box("metal", u + 0.3, 1.0, 0.47, 0.05, 0.25, 0.04, { color: PALETTE.steel });
  frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), u, 1.5, 0.454, { uv: "keep", uvRect: decalRect(13) });
  frame.box("emitRed", u, 2.08, 0.4, 0.5, 0.06, 0.06);
  frame.collider(u - 0.45, u + 0.45, 0, 2.0, 0, 0.46, "cabinet");
  void ctx;
}

// ---------------------------------------------------------------------------
// Lighting: white floods, tower, blue containment rim, red beacon (pulsed by the doors)
// ---------------------------------------------------------------------------
const FLOODS = [
  [-16, -118],
  [16, -118],
  [-16, -72],
  [16, -72],
  [0, -143],
  [0, -47],
];
function lighting(kit, ctx, B0) {
  FLOODS.forEach(([x, z], i) => {
    const apron = i >= 4;
    ctx.light(pointLight(0xf3f6ff, apron ? 34 : 58, apron ? 55 : 80, [x, CEIL - 3.4, z]));
  });
  ctx.light(pointLight(0x9fc4ff, 7, 14, [0, TOWER.y1 - 0.6, TOWER.z0 + 4.4]));
  ctx.light(pointLight(0x3f8cff, 16, 46, [0, FIELD_Y + 3.5, (HOLE.z0 + HOLE.z1) / 2]));
  void kit;
  void B0;
}

// ---------------------------------------------------------------------------
// Bay blast doors: two pairs of leaves sliding over the opening, driven by traffic.bay.openness
// ---------------------------------------------------------------------------
function bayDoors(ctx) {
  const groups = [];
  const meshes = [];
  const zMid = (HOLE.z0 + HOLE.z1) / 2;
  const W = HOLE.x1 + 0.7; // leaf reaches under the deck slab
  for (const s of [-1, 1]) {
    const k = new Kit(ctx.materials);
    const g = new THREE.Group();
    g.name = "bayDoor_" + (s < 0 ? "port" : "stbd");
    for (const [za, zb] of [
      [HOLE.z0 + 0.25, zMid - 0.2],
      [zMid + 0.2, HOLE.z1 - 0.25],
    ]) {
      const lo = Math.min(0, s * W);
      const hi = Math.max(0, s * W);
      const zc = (za + zb) / 2;
      const len = zb - za;
      // slab
      k.boxMM("paintedMetal", [lo, -1.1, za], [hi, -0.1, zb], { color: PALETTE.impMid, texel: 0.6 });
      // top: raised armour plates in a 3 × 4 grid with dark seams, hazard band at the meeting edge
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 4; j++) {
          const px0 = lo + 0.5 + (i / 3) * (hi - lo - 1.0);
          const px1 = lo + 0.5 + ((i + 1) / 3) * (hi - lo - 1.0) - 0.25;
          const pz0 = za + 0.5 + (j / 4) * (len - 1.0);
          const pz1 = za + 0.5 + ((j + 1) / 4) * (len - 1.0) - 0.25;
          k.boxMM("impPanel1", [px0, -0.1, pz0], [px1, -0.02, pz1], { color: (i + j) % 3 ? PALETTE.impGrey : PALETTE.impMid, uv: "keep" });
        }
      }
      k.boxMM("hazard", [s < 0 ? -1.6 : 0.05, -0.02, za], [s < 0 ? -0.05 : 1.6, 0.0, zb], { texel: 1 });
      k.boxMM("hg_seam", [s < 0 ? -0.55 : 0.2, -0.02, za + 0.6], [s < 0 ? -0.2 : 0.55, 0.01, zb - 0.6], {});
      // guide shoes at the fore / aft edges (ride in the well tracks)
      for (const z of [za + 0.15, zb - 0.15]) k.boxMM("metal", [lo, -1.0, z - 0.14], [hi, -0.2, z + 0.14], { color: PALETTE.gunmetal });
      // underside: deep ribs and running lights (the face seen from space)
      for (let i = 1; i < 6; i++) {
        const x = lo + (i / 6) * (hi - lo);
        k.boxMM("paintedMetal", [x - 0.3, -1.7, za + 0.6], [x + 0.3, -1.1, zb - 0.6], { color: PALETTE.impDark, texel: 1 });
      }
      for (const z of [za + 2, zc, zb - 2]) k.boxMM("paintedMetal", [lo + 0.6, -1.5, z - 0.3], [hi - 0.6, -1.1, z + 0.3], { color: PALETTE.impDark, texel: 1 });
      for (let z = za + 3; z < zb - 1; z += 6) k.box("emitRed", s * 1.3, -1.12, z, 0.5, 0.06, 0.5);
      k.boxMM("hazard", [lo + 0.05, -1.11, za + 0.3], [hi - 0.05, -1.1, za + 1.5], { texel: 1 });
      k.boxMM("hazard", [lo + 0.05, -1.11, zb - 1.5], [hi - 0.05, -1.1, zb - 0.3], { texel: 1 });
    }
    const built = k.build(g, { castShadow: true, receiveShadow: true });
    meshes.push(...built);
    ctx.mesh(g);
    groups.push({ g, s });
  }
  const travel = W + 0.3;
  const apply = (o) => {
    const e = o < 0.5 ? 2 * o * o : 1 - Math.pow(-2 * o + 2, 2) / 2;
    for (const { g, s } of groups) g.position.x = s * travel * e;
  };
  apply.meshes = meshes;
  return apply;
}

// ---------------------------------------------------------------------------
// Warning beacons around the opening: pulse red / amber while the doors move, plus a red light
// ---------------------------------------------------------------------------
function beacons(ctx) {
  const k = new Kit(ctx.materials);
  const g = new THREE.Group();
  const pts = [];
  for (const x of [HOLE.x0 - 2.6, HOLE.x1 + 2.6]) for (const z of [HOLE.z0 - 2.6, (HOLE.z0 + HOLE.z1) / 2, HOLE.z1 + 2.6]) pts.push([x, z]);
  for (const z of [HOLE.z0 - 2.6, HOLE.z1 + 2.6]) for (const x of [-11, 11]) pts.push([x, z]);
  pts.forEach(([x, z], i) => {
    k.cyl("paintedMetal", x, 0.75, z, 0.16, 1.5, "y", { color: PALETTE.impDark, segments: 12 });
    k.box("hazard", x, 0.3, z, 0.36, 0.5, 0.36, { texel: 3 });
    k.cyl("metal", x, 1.55, z, 0.3, 0.1, "y", { color: PALETTE.gunmetal, segments: 14 });
    k.add(i % 2 ? "hg_beaconRed" : "hg_beaconAmber", new THREE.SphereGeometry(0.26, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, 1.6, z] });
    ctx.collider([x - 0.22, 0, z - 0.22], [x + 0.22, 1.9, z + 0.22], "beacon");
  });
  k.build(g);
  ctx.mesh(g);
  const red = ctx.materials.hg_beaconRed;
  const amber = ctx.materials.hg_beaconAmber;
  const light = ctx.light(pointLight(0xff3a20, 0, 50, [0, 5, (HOLE.z0 + HOLE.z1) / 2]));
  return (o, t, moving) => {
    if (moving) {
      const p = Math.max(0, Math.sin(t * 7));
      const q = Math.max(0, Math.sin(t * 7 + Math.PI));
      red.emissiveIntensity = 0.6 + 5 * p;
      amber.emissiveIntensity = 0.6 + 4 * q;
      light.intensity = 30 * p;
    } else {
      red.emissiveIntensity = 0.5;
      amber.emissiveIntensity = 0.5;
      light.intensity = 0;
    }
    void o;
  };
}

// ---------------------------------------------------------------------------
// Magnetic containment field across the opening
// ---------------------------------------------------------------------------
function containmentField(ctx) {
  const mat = ctx.materials.hg_field;
  const geo = new THREE.PlaneGeometry(HOLE.x1 - HOLE.x0 - 0.3, HOLE.z1 - HOLE.z0 - 0.3);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, FIELD_Y, (HOLE.z0 + HOLE.z1) / 2);
  mesh.renderOrder = 4;
  mesh.frustumCulled = true;
  ctx.mesh(mesh);
  return (t) => {
    mat.map.offset.set((t * 0.011) % 1, (-t * 0.017) % 1);
    mat.opacity = 0.22 + 0.04 * Math.sin(t * 1.6) + 0.02 * Math.sin(t * 4.3);
  };
}

// ---------------------------------------------------------------------------
// Overhead bridge crane travelling along z on the rails over the opening
// ---------------------------------------------------------------------------
function gantryCrane(ctx) {
  const k = new Kit(ctx.materials);
  const g = new THREE.Group();
  const span = 24.6 * 2;
  k.box("paintedMetal", 0, 24.9, 0, span + 1.6, 0.9, 1.2, { color: PALETTE.impMid, texel: 1 });
  k.box("hazard", 0, 24.9, 0.61, span - 2, 0.35, 0.02, { texel: 1 });
  k.box("hazard", 0, 24.9, -0.61, span - 2, 0.35, 0.02, { texel: 1 });
  for (const s of [-1, 1]) {
    k.box("paintedMetal", s * 24.6, 25.55, 0, 1.6, 0.4, 2.2, { color: PALETTE.impDark, texel: 2 });
    k.box("emitAmber", s * 24.6, 25.55, 1.11, 0.6, 0.12, 0.01);
    k.box("emitAmber", s * 24.6, 25.55, -1.11, 0.6, 0.12, 0.01);
  }
  k.box("emitWhite", 0, 24.44, 0, span - 4, 0.02, 0.3);
  k.build(g);
  // trolley + hook on the bridge
  const tk = new Kit(ctx.materials);
  const trolley = new THREE.Group();
  tk.box("paintedMetal", 0, 24.3, 0, 2.0, 1.3, 1.8, { color: PALETTE.impDark, texel: 2 });
  tk.box("hazard", 0, 23.62, 0, 2.02, 0.12, 1.82, { texel: 2 });
  tk.box("emitRed", 0.7, 24.3, 0.91, 0.2, 0.2, 0.02);
  tk.cyl("metal", 0, 21.6, 0, 0.04, 4.2, "y", { color: PALETTE.steel });
  tk.box("paintedMetal", 0, 19.4, 0, 0.7, 0.9, 0.5, { color: PALETTE.impDark, texel: 2 });
  tk.add("metal", new THREE.TorusGeometry(0.28, 0.07, 8, 16), { pos: [0, 18.7, 0], rot: [0, 0, 0], color: PALETTE.steel });
  tk.build(trolley);
  g.add(trolley);
  ctx.mesh(g);
  const zMid = (HOLE.z0 + HOLE.z1) / 2;
  return (t) => {
    g.position.z = zMid + Math.sin(t * 0.045) * 28;
    trolley.position.x = Math.sin(t * 0.07 + 1) * 12;
  };
}

// ---------------------------------------------------------------------------
// Fenced cargo lift: a platform in a four-post cage cycling slowly between the deck and +2.6 m
// ---------------------------------------------------------------------------
function cargoLift(kit, ctx, x, z) {
  const half = 2.3;
  // static cage: posts, top frame, railing fence around the pit, hazard curb
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      kit.box("paintedMetal", x + sx * (half + 0.3), 3.6, z + sz * (half + 0.3), 0.3, 7.2, 0.3, { color: PALETTE.impDark, texel: 2 });
      kit.box("metal", x + sx * (half + 0.3), 3.6, z + sz * (half + 0.3), 0.12, 7.0, 0.36, { color: PALETTE.steel });
    }
  }
  kit.boxMM("paintedMetal", [x - half - 0.45, 7.2, z - half - 0.45], [x + half + 0.45, 7.6, z + half + 0.45], { color: PALETTE.impDark, texel: 2 });
  kit.box("emitAmber", x, 7.18, z, half * 1.6, 0.02, 0.2);
  kit.boxMM("hazard", [x - half - 0.5, 0, z - half - 0.5], [x + half + 0.5, 0.05, z + half + 0.5], { texel: 2 });
  const f = half + 0.6;
  railing(kit, x - f, z - f, x + f, z - f, 0.05);
  railing(kit, x - f, z + f, x + f, z + f, 0.05);
  railing(kit, x - f, z - f, x - f, z + f, 0.05);
  railing(kit, x + f, z - f, x + f, z + f, 0.05);
  // control pedestal outside the fence
  kit.box("paintedMetal", x + f + 0.6, 0.6, z, 0.4, 1.2, 0.4, { color: PALETTE.impDark, texel: 2 });
  kit.box("impScreen4", x + f + 0.6, 1.22, z, 0.3, 0.02, 0.3, { uv: "keep" });
  kit.collider([x + f + 0.4, 0, z - 0.2], [x + f + 0.8, 1.25, z + 0.2], "pedestal");
  // moving platform
  const k = new Kit(ctx.materials);
  const g = new THREE.Group();
  k.box("floorGloss", 0, -0.12, 0, half * 2, 0.24, half * 2, { texel: 0.5 });
  k.box("hazard", 0, 0.005, 0, half * 2, 0.01, half * 2, { texel: 1.5 });
  k.box("paintedMetal", 0, -0.35, 0, half * 2 - 0.4, 0.3, half * 2 - 0.4, { color: PALETTE.impBlack, texel: 2 });
  crateOn(k, 0.6, 0.0, 0.5, 1.4, 1.2, 1.3, PALETTE.impMid);
  crateOn(k, -1.0, 0.0, -0.9, 1.1, 0.9, 1.1, PALETTE.impGrey);
  k.build(g);
  g.position.set(x, 0, z);
  ctx.mesh(g);
  return (t) => {
    const c = (Math.sin(t * 0.25) + 1) / 2;
    const e = c * c * (3 - 2 * c);
    g.position.y = 0.05 + e * 2.6;
  };
}

function crateOn(k, x, y, z, sx, sy, sz, col) {
  k.box("impPanel1", x, y + sy / 2, z, sx, sy, sz, { color: col, uv: "keep" });
  k.box("paintedMetal", x, y + sy * 0.06, z, sx + 0.03, sy * 0.12, sz + 0.03, { color: PALETTE.impBlack, texel: 2 });
  k.box("paintedMetal", x, y + sy * 0.95, z, sx + 0.03, sy * 0.1, sz + 0.03, { color: PALETTE.impBlack, texel: 2 });
  k.box("emitBlue", x + sx * 0.25, y + sy * 0.5, z + sz / 2 + 0.006, 0.12, 0.03, 0.01);
}