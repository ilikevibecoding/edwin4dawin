// Deck 5 — Main Hangar Bay. A 72 × 120 × 30 m cavern over the ventral opening: the deck is built as
// slabs around the hole, the well below the deck drops to the hull skin (module bottom), a magnetic
// containment field hangs just under deck level (y = -1.6, so it reads from the entry) and two pairs
// of blast-door leaves slide over the opening driven by the traffic system's bay state. TIE racks hang
// from ceiling gantries along both long walls with boarding gantries, a flight-control tower sits on a
// mezzanine over the aft door, catwalks at y = 8 run along the long walls, and a bridge crane travels
// the ceiling. The cavern is dark: a few strong floods (two ceiling spots over the aprons, four hanging
// rigs at the opening's ends) pool light on the deck; the ceiling itself carries no light lines.
//
// Deck-local metres, floor y = 0. Room bounds x -36..36, y -16..30, z -155..-35.
import * as THREE from "three";
import { HANGAR } from "../../exterior/dims.js";
import { PALETTE } from "../../materials.js";
import { impWall, impConsole, wallScreen, equipmentRack, crate, stairs, platform, railing, pipeRun, pillar, doorOpenings, wallSegment } from "../imperial.js";
import { pointLight, wallFrame, LIGHT_SCALE } from "../builders.js";
import { Kit, rng } from "../../kit.js";
import { decalRect, makeCanvas, toTexture } from "../../textures.js";
import { HANGAR_OPENING } from "../layout.js";
import { signPlate } from "../corridor.js";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
const HOLE = { x0: HANGAR_OPENING.x[0], x1: HANGAR_OPENING.x[1], z0: HANGAR_OPENING.z[0], z1: HANGAR_OPENING.z[1] };
const WELL_DEPTH = HANGAR.deckY - HANGAR.module.bottomY; // deck → hull skin (module bottom)
const SLOT = 1.25; // door-leaf slot under the deck (leaves run at y -1.1 .. -0.02)
const RIM = 0.32; // containment-field emitter rim right under the slot
const FIELD_Y = -(SLOT + RIM + 0.03); // -1.6: just under deck level, visible from the entry
const CEIL = 30;
const RACK_X = 29;
const RACK_Y = 16; // TIE centre height (wing 12.4..19.6, ball top 17.9)
const RACK_Z = [-124, -106, -88, -70];
const TIE_R = 1.9;
const WING_H = 7.2;
const WING_W = 3.9;
const WING_X = TIE_R + 1.75; // wing plane offset from the ball centre
const CAT_Y = 8; // catwalk / mezzanine level
const GANTRY_Y = RACK_Y + WING_H / 2 + 0.9; // boarding gantry, 0.9 above the wing apex (clears the clamps)
const BEAM_Y0 = GANTRY_Y + 1.8;
const BEAM_Y1 = BEAM_Y0 + 1.4;
const LOWER_H = 4.2; // human-scale panel band at the bottom of the walls
const TOWER = { x0: -13, x1: 13, z0: -44, z1: -35.16, y0: CAT_Y, y1: 15 }; // flight control: mezzanine 8 → roof 15
const GLASS_CANT = 1.3; // the glass leans out over the bay by this much at the top
// gantry stairs: two straight flights (catwalk → landing → gantry) along the long walls from z = -37.2
const STAIR_Z0 = -37.2;
const FLIGHT = Math.round((GANTRY_Y - CAT_Y) / 2 / 0.18) * 0.3; // run of one flight (stairs() geometry)
const LANDING = 2.6;
const GANTRY_Z1 = STAIR_Z0 - FLIGHT - LANDING - FLIGHT; // aft end of the boarding gantry (= top of the stairs)
// floods: two ceiling spots over the apron centres, four rigs hanging to y = 11.5 over the aprons'
// inner edges (clear of the opening and of the TIE paths, which run along the racks and the well)
const SPOTS = [
  [0, -47],
  [0, -143],
];
const RIGS = [
  [-14, -134.5],
  [14, -134.5],
  [-14, -55.5],
  [14, -55.5],
];
const RIG_Y = 11.5;
const YELLOW = new THREE.Color("#e2b93f");
const PAINT_W = new THREE.Color("#dfe4ea");

const LOWER_PAINTS = [
  [PALETTE.impGrey, 0.42],
  [PALETTE.impMid, 0.3],
  [PALETTE.impLight, 0.18],
  [PALETTE.impDark, 0.1],
];
// near-uniform light plates: at 6 m scale any tonal mix reads as a checkerboard from across the bay
const UPPER_PAINTS = [
  [PALETTE.impLight, 0.82],
  [PALETTE.impGrey, 0.08],
  [PALETTE.impWhite, 0.1],
];
const WELL_PAINTS = [
  [PALETTE.impDark, 0.78],
  [PALETTE.impBlack, 0.12],
  [PALETTE.impMid, 0.1],
];

// 7-segment numerals built from lit boxes (a: top … g: middle), unit digit 1 wide × 1.8 tall
const SEG = { a: [0.5, 1.72, 0.7, 0.16], b: [0.85, 1.31, 0.16, 0.66], c: [0.85, 0.49, 0.16, 0.66], d: [0.5, 0.08, 0.7, 0.16], e: [0.15, 0.49, 0.16, 0.66], f: [0.15, 1.31, 0.16, 0.66], g: [0.5, 0.9, 0.7, 0.16] };
const DIGITS = ["abcdef", "bc", "abged", "abgcd", "fgbc", "afgcd", "afgedc", "abc", "abcdefg", "abcfg"];

// ---------------------------------------------------------------------------
export function buildHangar(kit, ctx) {
  const [min, max] = ctx.bounds;
  // helpers that read bounds[0][1] as the floor must see y = 0, not the -16 of the well
  const B0 = [
    [min[0], 0, min[2]],
    [max[0], max[1], max[2]],
  ];
  ensureMaterials(ctx);
  const rand = rng(ctx.seed + 5);

  floorSlabs(kit, B0);
  shellWalls(kit, ctx, B0);
  ceiling(kit, ctx, B0);
  const wellGroup = well(ctx);
  curbAndRails(kit, ctx);
  deckMarkings(kit, ctx, B0);
  structure(kit, ctx, B0);
  towerAndMezzanine(kit, ctx, B0);
  racks(kit, ctx, B0);
  props(kit, ctx, B0, rand);
  lighting(kit, ctx, B0);

  // --- animated systems (separate meshes, driven per frame while the bay is visible)
  const applyDoors = bayDoors(ctx, wellGroup);
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
    field(t, o);
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
}

// ---------------------------------------------------------------------------
// Materials owned by this room (registered once on the shared dictionary)
// ---------------------------------------------------------------------------
function ensureMaterials(ctx) {
  const m = ctx.materials;
  // deck paint: opaque, slightly self-lit so the markings register on the black gloss from 100 m
  const paint = (col, glow) => new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: glow, roughness: 0.78, metalness: 0.0, envMapIntensity: 0.3 });
  if (!m.hg_paintY) m.hg_paintY = paint(YELLOW, 0.32);
  if (!m.hg_paintW) m.hg_paintW = paint(PAINT_W, 0.22);
  if (!m.hg_paintR) m.hg_paintR = paint(new THREE.Color("#c8382c"), 0.3);
  if (!m.hg_field) {
    // translucent energy plane: additive, low opacity, ~1 m cells, vertex colours fade the outer 2 m
    // to nothing (black adds nothing) so the field has a soft edge and the well below stays visible
    const f = m.forceField.clone();
    f.map = m.forceField.map.clone();
    f.map.repeat.set((HOLE.x1 - HOLE.x0) / 8, (HOLE.z1 - HOLE.z0) / 8); // 8 cells per tile → 1 m cells
    f.map.needsUpdate = true;
    f.color = new THREE.Color("#4f9cff");
    f.opacity = 0.3;
    f.vertexColors = true;
    m.hg_field = f;
  }
  if (!m.hg_beaconRed) m.hg_beaconRed = m.emitRed.clone();
  if (!m.hg_beaconAmber) m.hg_beaconAmber = m.emitAmber.clone();
  if (!m.hg_seam) {
    // door seam lamps: 60 m of strip seen at grazing angles from the deck, so keep it just over the bloom threshold
    m.hg_seam = m.emitAmber.clone();
    m.hg_seam.emissiveIntensity = 1.35;
  }
  if (!m.hg_rim) {
    m.hg_rim = m.emitBlue.clone();
    m.hg_rim.emissiveIntensity = 3.4;
  }
  // recessed deck lights: well under the bloom threshold (1.15 linear) so they read as fixtures set
  // into the deck, not as blown-out bars (emitWhite itself is 2.6)
  if (!m.hg_lane) {
    m.hg_lane = m.emitWhite.clone();
    m.hg_lane.emissiveIntensity = 0.7;
  }
  if (!m.hg_laneAmber) {
    m.hg_laneAmber = m.emitAmber.clone();
    m.hg_laneAmber.emissiveIntensity = 1.0;
  }
  // well approach strip / cornice cove: guidance lines, not room light
  if (!m.hg_approach) {
    m.hg_approach = m.emitWhite.clone();
    m.hg_approach.emissiveIntensity = 0.55;
  }
  if (!m.hg_cove) {
    m.hg_cove = m.emitWhiteSoft.clone();
    m.hg_cove.emissiveIntensity = 0.3;
  }
  if (!m.hg_edge) {
    m.hg_edge = m.emitWhite.clone();
    m.hg_edge.emissiveIntensity = 0.85;
  }
  // flight-control cab: warm ceiling panels and a soft white band along the back wall (seen through
  // the canted glass from the deck; both under the bloom threshold)
  if (!m.hg_cabLight) {
    m.hg_cabLight = m.emitAmber.clone();
    m.hg_cabLight.emissiveIntensity = 1.0;
  }
  if (!m.hg_cabBack) {
    m.hg_cabBack = m.emitWhiteSoft.clone();
    m.hg_cabBack.emissiveIntensity = 0.8;
  }
  // the cab ceiling is what the deck actually sees through the canted glass (the sightline from the
  // apron clears the parapet only near the roof), so it is a soft warm lit surface, not black
  if (!m.hg_cabCeil) {
    m.hg_cabCeil = m.emitWhiteSoft.clone();
    m.hg_cabCeil.emissive = new THREE.Color("#ffd6a4");
    m.hg_cabCeil.emissiveIntensity = 0.5;
  }
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
    // lower band: 3.2 m plates in three rows (the finer 1.6 m grid sat behind cabinets and carts)
    impWall(kit, ctx, side, {
      bounds: B0,
      base: 0,
      height: LOWER_H,
      rows: [0, 0.5, 2.4, LOWER_H],
      panelW: 3.2,
      paints: LOWER_PAINTS,
      styles: { panel: 0.64, vent: 0.08, greeble: 0.08, strip: 0.08, screen: 0.05, conduit: 0.07 },
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
      rows: [0, 6.4, 12.9, 19.4, UH],
      panelW: 6.0,
      kick: false,
      trim: false,
      collide: false,
      paints: UPPER_PAINTS,
      styles: { panel: 0.88, vent: 0.0, greeble: 0.02, strip: 0.06, conduit: 0.04 },
      seed: ctx.seed * 7 + side.length * 5,
    });
    // dark cornice band under the ceiling with a faint recessed cove
    const seg = wallSegment(B0, side);
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    frame.box("paintedMetal", length / 2, H - 0.7, 0.12, length, 1.4, 0.24, { color: PALETTE.impDark, texel: 1.5 });
    frame.box("hg_cove", length / 2, H - 1.45, 0.22, length - 0.4, 0.06, 0.04, { uv: "keep" });
    // string course between the bands
    frame.box("paintedMetal", length / 2, LOWER_H + 0.08, 0.08, length, 0.16, 0.16, { color: PALETTE.impBlack, texel: 2 });
  }
}

// ---------------------------------------------------------------------------
// Ceiling: big dark panels, a few coarse trusses, dimmed approach channels; no light lines
// ---------------------------------------------------------------------------
function ceiling(kit, ctx, B0) {
  const [min, max] = B0;
  const W = max[0] - min[0];
  const D = max[2] - min[2];
  // black backing slab, then a coarse field of 8 × 8 m plates hanging 0.12 below it (the gaps read
  // as dark seams); a few plates are swapped for recessed vent grilles
  kit.boxMM("paintedMetal", [min[0] - 0.4, CEIL, min[2] - 0.4], [max[0] + 0.4, CEIL + 0.3, max[2] + 0.4], { color: PALETTE.impBlack, texel: 2 });
  const rand = rng(ctx.seed * 17 + 3);
  const cols = Math.round(W / 8);
  const rows = Math.round(D / 8);
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
        for (let k = 0; k < 5; k++) {
          const z = z0 + 0.9 + (k / 4) * (ph - 2.0);
          kit.boxMM("metal", [x0 + 0.5, CEIL - 0.1, z - 0.16], [x0 + pw - 0.7, CEIL - 0.04, z + 0.16], { color: PALETTE.gunmetal });
        }
        continue;
      }
      // dark grey plates: the ceiling is a dark lid over the lit deck (it is also what the exterior
      // camera sees through the opening); a few mid plates and recessed hatches break it up
      const col = r < 0.72 ? PALETTE.impMid : r < 0.9 ? PALETTE.impDark : PALETTE.impGrey;
      kit.boxMM("impPanel1", [x0, CEIL - 0.12, z0], [x0 + pw - 0.2, CEIL, z0 + ph - 0.2], { color: col, uv: "keep" });
      if (r > 0.94) kit.boxMM("impPanel", [x0 + 1.0, CEIL - 0.2, z0 + 1.0], [x0 + pw - 1.2, CEIL - 0.12, z0 + ph - 1.2], { color: PALETTE.impDark, uv: "keep" });
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
  // transverse trusses every ~27 m: two chords, verticals every 8 m, alternating diagonals
  const n = 5;
  for (let i = 0; i < n; i++) {
    const z = min[2] + 6 + (i / (n - 1)) * (max[2] - min[2] - 12);
    const yTop = CEIL - 0.25;
    const yBot = CEIL - 1.55;
    kit.box("paintedMetal", 0, yTop, z, W, 0.4, 0.5, { color: PALETTE.impDark, texel: 1.2 });
    kit.box("paintedMetal", 0, yBot, z, W, 0.35, 0.5, { color: PALETTE.impDark, texel: 1.2 });
    const bays = 9;
    for (let k = 0; k <= bays; k++) {
      const x = min[0] + (k / bays) * W;
      kit.box("paintedMetal", x, (yTop + yBot) / 2, z, 0.22, yTop - yBot, 0.36, { color: PALETTE.impDark, texel: 2 });
      if (k < bays) {
        const x2 = min[0] + ((k + 1) / bays) * W;
        const len = Math.hypot(x2 - x, yTop - yBot);
        const ang = Math.atan2(yTop - yBot, x2 - x) * (k % 2 ? 1 : -1);
        kit.add("paintedMetal", new THREE.BoxGeometry(len - 0.1, 0.14, 0.2), { pos: [(x + x2) / 2, (yTop + yBot) / 2, z], rot: [0, 0, ang], color: PALETTE.impDark, texel: 2 });
      }
    }
  }
  // no light lines up here: the ceiling is a dark lid; guidance for a pilot looking up through the
  // hole is the lit curb / the well rim, not ceiling channels
  // longitudinal crane rails and their hangers are added with the crane (structure())
}

// ---------------------------------------------------------------------------
// The well: dark panelled walls from the hull skin up to the field, the blue emitter rim under the
// door slot, a dim approach strip and amber guide lights. Built as its own group so the door
// animation can hide it while the leaves are shut (nothing of it is visible then).
// ---------------------------------------------------------------------------
function well(ctx) {
  const k = new Kit(ctx.materials);
  const g = new THREE.Group();
  g.name = "hangarWell";
  const wb = [
    [HOLE.x0 + 0.1, -WELL_DEPTH, HOLE.z0 + 0.1],
    [HOLE.x1 - 0.1, 0, HOLE.z1 - 0.1],
  ];
  const fake = { doors: [], bounds: wb, seed: ctx.seed + 3 };
  const wallH = WELL_DEPTH - SLOT - RIM; // hull skin → underside of the emitter rim
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
    impWall(k, fake, side, {
      bounds: wb,
      base: -WELL_DEPTH,
      height: wallH,
      noDoors: true,
      rows: [0, wallH / 3, (2 * wallH) / 3, wallH],
      panelW: 6,
      kick: false,
      trim: false,
      collide: false,
      paints: WELL_PAINTS,
      styles: { panel: 0.9, vent: 0.0, greeble: 0.0, conduit: 0.1, strip: 0.0 },
      seed: ctx.seed + side.length * 3,
    });
    const seg = wallSegment(wb, side);
    const { frame, length } = wallFrame(k, seg.from, seg.to, -WELL_DEPTH);
    // black slot / track band right under the deck edge
    frame.box("paintedMetal", length / 2, WELL_DEPTH - SLOT / 2, 0.03, length, SLOT, 0.06, { color: PALETTE.impBlack, texel: 2 });
    frame.box("metal", length / 2, WELL_DEPTH - 0.08, 0.065, length, 0.05, 0.02, { color: PALETTE.steel });
    frame.box("metal", length / 2, WELL_DEPTH - SLOT + 0.04, 0.065, length, 0.05, 0.02, { color: PALETTE.steel });
    // containment-field emitter rim: a bright blue line all round the opening at field level
    frame.box("paintedMetal", length / 2, WELL_DEPTH - SLOT - RIM / 2, 0.08, length, RIM, 0.16, { color: PALETTE.impBlack, texel: 2 });
    frame.box("hg_rim", length / 2, WELL_DEPTH - SLOT - RIM / 2, 0.165, length - 0.3, 0.16, 0.01);
    // dim approach strip 3 m under the field: outlines the bay for a pilot looking up from space
    frame.box("paintedMetal", length / 2, WELL_DEPTH - 4.6, 0.05, length, 0.5, 0.1, { color: PALETTE.impBlack, texel: 2 });
    frame.box("hg_approach", length / 2, WELL_DEPTH - 4.6, 0.105, length - 0.4, 0.12, 0.01);
    // amber guide lights half way down, every 8 m
    for (let u = 4; u < length - 2; u += 8) {
      frame.box("paintedMetal", u, WELL_DEPTH * 0.45, 0.05, 1.2, 0.5, 0.1, { color: PALETTE.impDark, texel: 2 });
      frame.box("emitAmber", u, WELL_DEPTH * 0.45, 0.105, 1.0, 0.22, 0.01);
    }
  }
  k.build(g);
  ctx.mesh(g);
  return g;
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
    // coarse stripes (0.7 m period) so the curb still reads as hazard from the far end of the bay
    kit.boxMM("hazard", [x0 + 0.02, 0.2, z0 + 0.02], [x1 - 0.02, 0.215, z1 - 0.02], { texel: 0.35 });
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
    kit.boxMM("hg_laneAmber", [x0, 0.02, z0], [x1, 0.032, z1], {});
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
    kit.box("hg_paintY", x, y + 0.98, z, 0.24, 0.16, 0.24);
    kit.box("emitAmber", x, y + 1.12, z, 0.1, 0.05, 0.1);
    kit.box("metal", x, y + 0.03, z, 0.34, 0.06, 0.34, { color: PALETTE.gunmetal });
  }
  kit.box("paintedMetal", (x0 + x1) / 2, y + 0.85, z, x1 - x0, 0.06, 0.06, { color: PALETTE.impBlack, texel: 2 });
  kit.box("emitAmber", (x0 + x1) / 2, y + 0.85, z, x1 - x0 - 0.3, 0.03, 0.07);
  kit.box("metal", (x0 + x1) / 2, y + 0.45, z, x1 - x0, 0.03, 0.03, { color: PALETTE.steel });
  kit.collider([x0 - 0.15, y, z - 0.15], [x1 + 0.15, y + 1.15, z + 0.15], "barrier");
}

// ---------------------------------------------------------------------------
// Deck markings: opaque painted geometry (yellow bay outlines and numbers, white lane edges,
// chevrons and the big "05", TIE-plan pads under each rack). Geometry rather than a decal so the
// lines stay crisp at any distance and never wash out against the black gloss.
// ---------------------------------------------------------------------------
function deckMarkings(kit, ctx, B0) {
  const [min, max] = B0;
  const T = 0.3;
  const Y0 = 0.004;
  const Y1 = 0.012;
  const hl = (mat, x0, x1, z, w = T) => kit.boxMM(mat, [Math.min(x0, x1), Y0, z - w / 2], [Math.max(x0, x1), Y1, z + w / 2], {});
  const vl = (mat, x, z0, z1, w = T) => kit.boxMM(mat, [x - w / 2, Y0, Math.min(z0, z1)], [x + w / 2, Y1, Math.max(z0, z1)], {});
  const rect = (mat, x0, z0, x1, z1, w = T) => {
    hl(mat, x0, x1, z0, w);
    hl(mat, x0, x1, z1, w);
    vl(mat, x0, z0, z1, w);
    vl(mat, x1, z0, z1, w);
  };
  const LANE = 11; // half width of the launch lane
  let bay = 1;
  for (const [z0, z1, toward] of [
    [HOLE.z1 + 2.2, max[2] - 3.2, -1], // aft apron: chevrons point forward (toward the opening)
    [min[2] + 3.2, HOLE.z0 - 2.2, 1], // forward apron
  ]) {
    // apron boundary + lane edges + hold line where the lane meets the curb
    rect("hg_paintY", min[0] + 1.2, z0, max[0] - 1.2, z1, 0.35);
    vl("hg_paintW", -LANE, z0, z1);
    vl("hg_paintW", LANE, z0, z1);
    const zHold = toward < 0 ? z0 + 0.6 : z1 - 0.6;
    hl("hg_paintY", -LANE + 0.4, LANE - 0.4, zHold, 0.55);
    // chevrons down the lane, tips toward the opening (a +x arm rotated by +θ about y swings its
    // outer end to -z, so the arm on side s needs θ = s · toward · 0.7 for the tip to face `toward`)
    for (let z = z0 + 5; z < z1 - 3; z += 6) {
      for (const s of [-1, 1]) {
        const g = new THREE.BoxGeometry(4.2, Y1 - Y0, 0.4);
        kit.add("hg_paintW", g, { pos: [s * 1.6, (Y0 + Y1) / 2, z], rot: [0, s * toward * 0.7, 0] });
      }
    }
    // two numbered parking bays either side of the lane
    for (const s of [-1, 1]) {
      const bx0 = s * (LANE + 1.6);
      const bx1 = s * (max[0] - 2.2);
      const mid = (z0 + z1) / 2;
      for (const [bz0, bz1] of [
        [z0 + 1.2, mid - 0.5],
        [mid + 0.5, z1 - 1.2],
      ]) {
        rect("hg_paintY", Math.min(bx0, bx1), bz0, Math.max(bx0, bx1), bz1, 0.28);
        // corner ticks toward the lane side + bay number readable from the lane
        const nx = s * (LANE + 3.2);
        const nz = toward < 0 ? bz1 - 3.0 : bz0 + 1.0;
        floorNumber(kit, "hg_paintY", nx, nz, bay, 2.0, [0, toward]);
        bay++;
      }
    }
  }
  // the big deck number in the lane of the aft apron, readable from the entry (viewer faces -z)
  floorNumber(kit, "hg_paintW", -3.4, -46.5, 0, 6.0, [0, -1]);
  floorNumber(kit, "hg_paintW", 3.4, -46.5, 5, 6.0, [0, -1]);
  // TIE-plan pads under each rack on the side strips: outline, two wing lines, ball ring, pylons
  RACK_Z.forEach((rz, i) => {
    for (const s of [-1, 1]) {
      const px = s * RACK_X;
      rect("hg_paintY", px - 4.4, rz - 2.8, px + 4.4, rz + 2.8, 0.26);
      for (const w of [-1, 1]) vl("hg_paintW", px + w * WING_X, rz - WING_W / 2, rz + WING_W / 2, 0.28);
      const ring = new THREE.RingGeometry(TIE_R - 0.16, TIE_R + 0.12, 36);
      ring.rotateX(-Math.PI / 2);
      kit.add("hg_paintW", ring, { pos: [px, Y1, rz], uv: "keep" });
      hl("hg_paintW", px - WING_X + 0.1, px - TIE_R + 0.1, rz, 0.24);
      hl("hg_paintW", px + TIE_R - 0.1, px + WING_X - 0.1, rz, 0.24);
      // rack number in the wall-side corner of the pad, readable when facing the wall
      const digit = i + 1 + (s > 0 ? 4 : 0);
      floorNumber(kit, "hg_paintY", px + s * 3.0, rz - 4.4, digit, 1.3, [s, 0]);
    }
  });
  void ctx;
}

/**
 * Painted 7-segment digit lying on the deck at (cx, cz). `up` is the axis-aligned unit vector ([dx, dz])
 * the intended viewer faces (text "up" on the deck); text "right" follows from it (right = forward × y).
 */
function floorNumber(kit, mat, cx, cz, digit, h, up) {
  const right = [-up[1], up[0]];
  const s = h / 1.8;
  for (const k of DIGITS[digit]) {
    const [u, v, w, hh] = SEG[k];
    const du = (u - 0.5) * s;
    const dv = v * s;
    const x = cx + du * right[0] + dv * up[0];
    const z = cz + du * right[1] + dv * up[1];
    const sx = w * s * Math.abs(right[0]) + hh * s * Math.abs(up[0]);
    const sz = w * s * Math.abs(right[1]) + hh * s * Math.abs(up[1]);
    kit.box(mat, x, 0.008, z, sx, 0.008, sz);
  }
}

// ---------------------------------------------------------------------------
// Structure: pilasters, catwalks at y = 8, stairs, crane rails, flood fixtures, big numerals
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

  // ceiling flood housings over the aprons (the spot lights sit in them, lighting()): a deep hood
  // with the dim lamp face recessed 0.5 m behind its rim and three louvre slats across the mouth, so
  // from the deck it reads as a floodlight fixture, not a lit hatch in the ceiling
  for (const [x, z] of SPOTS) {
    kit.box("paintedMetal", x, CEIL - 1.0, z, 3.4, 0.5, 3.4, { color: PALETTE.impDark, texel: 1.5 });
    kit.box("paintedMetal", x, CEIL - 0.4, z, 0.6, 0.8, 0.6, { color: PALETTE.impBlack, texel: 2 });
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      kit.box("paintedMetal", x + dx * 1.6, CEIL - 2.0, z + dz * 1.6, dx ? 0.2 : 3.4, 1.6, dz ? 0.2 : 3.4, { color: PALETTE.impDark, texel: 1.5 });
    }
    kit.box("hg_lane", x, CEIL - 2.3, z, 2.6, 0.04, 2.6);
    for (const dz of [-0.85, 0, 0.85]) kit.box("paintedMetal", x, CEIL - 2.7, z + dz, 3.0, 0.08, 0.36, { color: PALETTE.impBlack, texel: 2 });
  }
  // flood rigs hanging on stems from the trusses to y = 16 at the opening's ends: four lamp heads on
  // a square frame, a red anti-collision lamp on the hub (the point lights sit under them)
  for (const [x, z] of RIGS) floodRig(kit, x, z);

  // crane rails along z on both sides of the opening, hung from the trusses
  for (const s of [-1, 1]) {
    const x = s * 24.6;
    kit.boxMM("paintedMetal", [x - 0.35, 24.7, HOLE.z0 - 4], [x + 0.35, 25.3, HOLE.z1 + 4], { color: PALETTE.impDark, texel: 1.5 });
    // matte rail head: a bare-metal strip up here catches the rigs as a white line across the ceiling
    kit.boxMM("paintedMetal", [x - 0.08, 25.3, HOLE.z0 - 4], [x + 0.08, 25.42, HOLE.z1 + 4], { color: PALETTE.impBlack, texel: 2 });
    for (let z = HOLE.z0 - 3; z <= HOLE.z1 + 3; z += 9.5) {
      kit.box("paintedMetal", x, (25.3 + CEIL - 1.5) / 2, z, 0.3, CEIL - 1.5 - 25.3, 0.3, { color: PALETTE.impMid, texel: 2 });
    }
  }

  // deck / bay code on the forward wall: a lit "H-05" (the sign gantry at the entry already says
  // "BAY 05", so the wall carries the hangar code, not the same number again); rack numbers on the side walls
  {
    const seg = wallSegment(B0, "zmin");
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    frame.box("paintedMetal", length / 2, 18.5, 0.06, 12.0, 5.6, 0.12, { color: PALETTE.impBlack, texel: 2 });
    const chars = ["bcefg", "g", DIGITS[0], DIGITS[5]]; // H - 0 5
    chars.forEach((pat, i) => segChar(frame, "emitWhite", length / 2 + (i - 1.5) * 2.7, 16.5, 0.13, pat, 4.0));
    frame.box("emitRed", length / 2, 15.2, 0.13, 11.2, 0.12, 0.02);
    frame.box("emitRed", length / 2, 21.8, 0.13, 11.2, 0.12, 0.02);
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

/** Hanging flood rig: stem from the ceiling, square frame, four lamp heads, anti-collision lamp. */
function floodRig(kit, x, z) {
  const y = RIG_Y;
  const stemTop = CEIL - 0.3;
  kit.cyl("paintedMetal", x, (stemTop + y + 0.45) / 2, z, 0.16, stemTop - (y + 0.45), "y", { color: PALETTE.impDark, segments: 8, texel: 0.5 });
  kit.box("paintedMetal", x, y + 0.6, z, 0.9, 0.3, 0.9, { color: PALETTE.impBlack, texel: 2 });
  kit.box("paintedMetal", x, y + 0.32, z, 3.4, 0.26, 3.4, { color: PALETTE.impDark, texel: 1.5 });
  kit.box("paintedMetal", x, y - 0.1, z, 1.0, 0.6, 1.0, { color: PALETTE.impBlack, texel: 2 });
  for (const [dx, dz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    // lamp head: a hollow black hood (top plate + four lips) with the dim emitter face recessed 0.25 m
    // behind the rim; the real light is the pool point light hung well below, and an exposed face
    // here blooms out to a white blob in the entry view's top corners
    const hx = x + dx * 1.05;
    const hz = z + dz * 1.05;
    kit.box("paintedMetal", hx, y + 0.05, hz, 1.2, 0.2, 1.2, { color: PALETTE.impBlack, texel: 2 });
    for (const [lx, lz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      kit.box("paintedMetal", hx + lx * 0.56, y - 0.25, hz + lz * 0.56, lx ? 0.08 : 1.2, 0.5, lz ? 0.08 : 1.2, { color: PALETTE.impBlack, texel: 2 });
    }
    kit.box("hg_lane", hx, y - 0.24, hz, 0.9, 0.03, 0.9);
  }
  kit.box("emitRed", x, y + 0.85, z, 0.24, 0.2, 0.24);
  // hoist cable loop to the truss for servicing
  kit.cyl("rubber", x + 0.9, (stemTop + y + 0.45) / 2, z + 0.9, 0.03, stemTop - (y + 0.45), "y", { color: PALETTE.impBlack, segments: 6 });
}

/** Invisible guard boxes following a stair flight so the player cannot walk off its open side(s). */
function stairGuard(kit, { x, z, axis, dir, w, y0, y1, total, sides }) {
  const n = Math.max(1, Math.ceil(total / 1.5));
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * total;
    const a1 = ((i + 1) / n) * total;
    const ya = y0 + ((a0 + a1) / 2 / total) * (y1 - y0);
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
  segChar(frame, mat, u, v, n, DIGITS[digit], h);
}

/**
 * High-contrast lit lettering: bold white text (amber sub line) on black, brighter than signPlate so
 * it still reads white from 30 m across the bay. The plane faces -z; `key` names the material.
 */
function letterPlate(kit, ctx, { key, text, sub, x, y, z, w, h }) {
  if (!ctx.materials[key]) {
    const c = makeCanvas(1024, 128);
    const g = c.getContext("2d");
    g.fillStyle = "#050608";
    g.fillRect(0, 0, 1024, 128);
    g.fillStyle = "#ffb347";
    g.fillRect(18, 16, 8, 96);
    g.fillRect(998, 16, 8, 96);
    g.textBaseline = "middle";
    g.textAlign = "center";
    g.font = "bold 74px 'Helvetica Neue', Arial, sans-serif";
    g.fillStyle = "#ffffff";
    g.fillText(text, 512, sub ? 50 : 64);
    if (sub) {
      g.font = "bold 30px 'Helvetica Neue', Arial, sans-serif";
      g.fillStyle = "#ffb347";
      g.fillText(sub, 512, 104);
    }
    ctx.materials[key] = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: toTexture(c, { srgb: true, wrap: false }), emissiveIntensity: 1.7, roughness: 0.4, metalness: 0 });
  }
  kit.add(key, new THREE.PlaneGeometry(w, h), { pos: [x, y, z], rot: [0, Math.PI, 0], uv: "keep" });
}

/** Seven-segment character from a segment pattern string (a..g), `h` tall, centred on u. */
function segChar(frame, mat, u, v, n, pattern, h) {
  const s = h / 1.8;
  for (const k of pattern) {
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
  // mezzanine floor + roof (the roof reaches out over the canted glass)
  const zf = T.z0 + 0.1; // glass foot
  const zt = zf - GLASS_CANT; // glass head
  platform(kit, ctx, { x0: T.x0, z0: T.z0, x1: T.x1, z1: T.z1, y: T.y0, thickness: 0.4 });
  kit.boxMM("paintedMetal", [T.x0 - 0.4, T.y1, zt - 0.4], [T.x1 + 0.4, T.y1 + 0.5, T.z1], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("impPanel", [T.x0 - 0.3, T.y1 + 0.5, zt - 0.3], [T.x1 + 0.3, T.y1 + 0.65, T.z1], { color: PALETTE.impGrey, uv: "keep" });
  // underside: dark soffit with light strips lighting the entry below
  kit.boxMM("paintedMetal", [T.x0 - 0.4, T.y0 - 0.55, T.z0 - 0.4], [T.x1 + 0.4, T.y0 - 0.4, T.z1], { color: PALETTE.impDark, texel: 1.5 });
  for (const x of [-8, 0, 8]) kit.boxMM("hg_cabBack", [x - 2.6, T.y0 - 0.58, T.z0 + 1.5], [x + 2.6, T.y0 - 0.55, T.z0 + 1.9], { uv: "keep" });
  // front parapet, then the canted glass (leaning out over the bay) with its mullions and head beam
  kit.boxMM("impPanel1", [T.x0, T.y0, zf - 0.12], [T.x1, T.y0 + 1.05, zf + 0.12], { color: PALETTE.impMid, uv: "keep" });
  kit.boxMM("paintedMetal", [T.x0 - 0.1, T.y0 + 1.05, zf - 0.16], [T.x1 + 0.1, T.y0 + 1.25, zf + 0.14], { color: PALETTE.impBlack, texel: 2 });
  const gy0 = T.y0 + 1.25;
  const gy1 = T.y1 - 0.25;
  const gh = Math.hypot(gy1 - gy0, GLASS_CANT);
  const cant = -Math.atan2(GLASS_CANT, gy1 - gy0); // tilt about x: the top swings toward -z (the bay)
  const gmid = [0, (gy0 + gy1) / 2, (zf + zt) / 2];
  kit.boxMM("paintedMetal", [T.x0 - 0.1, gy1, zt - 0.16], [T.x1 + 0.1, T.y1, zt + 0.14], { color: PALETTE.impBlack, texel: 2 });
  const panes = 5;
  for (let i = 0; i <= panes; i++) {
    const x = T.x0 + ((T.x1 - T.x0) * i) / panes;
    kit.add("paintedMetal", new THREE.BoxGeometry(0.16, gh, 0.24), { pos: [x, gmid[1], gmid[2]], rot: [cant, 0, 0], color: PALETTE.impBlack, texel: 2 });
  }
  kit.add("paintedMetal", new THREE.BoxGeometry(T.x1 - T.x0, 0.1, 0.2), { pos: [0, gmid[1], gmid[2]], rot: [cant, 0, 0], color: PALETTE.impBlack, texel: 2 });
  // "glass" (not bridgeGlass): the kit's glass key does not cast shadows, so the cab interior is not
  // blacked out of the aft flood's shadow map
  kit.add("glass", new THREE.PlaneGeometry(T.x1 - T.x0, gh), { pos: gmid, rot: [cant, Math.PI, 0], uv: "keep" });
  kit.collider([T.x0 - 0.1, T.y0, zt - 0.2], [T.x1 + 0.1, T.y1, zf + 0.2], "towerglass");
  // big white-on-black lettering board standing on the roof edge over the glass, facing the bay
  const boardZ = zt - 0.5;
  kit.boxMM("paintedMetal", [-6.6, T.y1 + 0.65, boardZ - 0.06], [6.6, T.y1 + 2.35, boardZ + 0.14], { color: PALETTE.impBlack, texel: 2 });
  for (const x of [-5.6, 5.6]) kit.box("paintedMetal", x, T.y1 + 0.55, boardZ + 0.3, 0.3, 0.3, 0.7, { color: PALETTE.impBlack, texel: 2 });
  letterPlate(kit, ctx, { key: "hg_signFlightControl", text: "FLIGHT CONTROL", sub: "DECK 05 · BAY OPERATIONS", x: 0, y: T.y1 + 1.5, z: boardZ - 0.07, w: 12.6, h: 1.5 });
  for (const s of [-1, 1]) {
    const x = s > 0 ? T.x1 : T.x0;
    const zEnd = -39.6;
    kit.boxMM("impPanel", [x - 0.1, T.y0, T.z0], [x + 0.1, T.y1, zEnd], { color: PALETTE.impLight, uv: "keep" });
    // triangular cheek closing the side under the canted glass (a box wedge is enough at this size)
    kit.add("impPanel", new THREE.BoxGeometry(0.2, gh, 0.7), { pos: [x, gmid[1], gmid[2] + 0.3], rot: [cant, 0, 0], color: PALETTE.impLight, uv: "keep" });
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
  kit.box("paintedMetal", 0, T.y0 + 0.45, T.z0 + 4.4, 1.6, 0.9, 1.0, { color: PALETTE.impBlack, texel: 2 });
  kit.box("emitBlue", 0, T.y0 + 0.905, T.z0 + 4.4, 1.3, 0.01, 0.7);
  kit.collider([-0.8, T.y0, T.z0 + 3.9], [0.8, T.y0 + 0.9, T.z0 + 4.9], "holotable");
  // the cab reads as a lit room through the canted glass: two wide warm ceiling panels (what the deck
  // sees first, looking up through the glass), a lit band along the back wall at desk height that
  // silhouettes the consoles and chairs, and a row of status screens facing the bay behind the glass
  kit.box("hg_cabCeil", 0, T.y1 - 0.03, (zt + 0.3 + T.z1 - 0.2) / 2, T.x1 - T.x0 - 0.6, 0.02, T.z1 - 0.2 - (zt + 0.3), { uv: "keep" });
  for (const z of [T.z0 + 2.4, T.z0 + 5.8]) {
    kit.box("paintedMetal", 0, T.y1 - 0.06, z, 20, 0.1, 1.4, { color: PALETTE.impBlack, texel: 2 });
    kit.box("hg_cabLight", 0, T.y1 - 0.115, z, 19.4, 0.03, 1.0, { uv: "keep" });
  }
  kit.box("paintedMetal", 0, T.y0 + 0.95, T.z1 - 0.06, 24, 1.2, 0.08, { color: PALETTE.impBlack, texel: 2 });
  kit.box("hg_cabBack", 0, T.y0 + 0.95, T.z1 - 0.1, 23.4, 0.9, 0.02, { uv: "keep" });
  for (const x of [-10.5, -8.5, 8.5, 10.5]) {
    kit.box("paintedMetal", x, T.y0 + 2.2, zf + 0.9, 1.7, 1.1, 0.12, { color: PALETTE.impBlack, texel: 2 });
    kit.box(x < 0 ? "impScreen1" : "impScreen3", x, T.y0 + 2.2, zf + 0.83, 1.5, 0.9, 0.01, { uv: "keep" });
  }
  // blue status strip along the parapet top, readable from the deck below
  kit.box("emitBlueDim", 0, T.y0 + 1.26, zf - 0.02, T.x1 - T.x0 - 0.6, 0.02, 0.12);

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
    // main gantry beam along the row (no light strip under it: 60 m of emitter over the TIEs read as a
    // white-hot line from the deck)
    kit.boxMM("paintedMetal", [rx - 0.8, BEAM_Y0, zA], [rx + 0.8, BEAM_Y1, zB], { color: PALETTE.impDark, texel: 1.2 });
    kit.boxMM("hazard", [rx - 0.82, BEAM_Y0 + 0.2, zA], [rx + 0.82, BEAM_Y0 + 0.5, zB], { texel: 0.5 });
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
      for (const dx of [-3.2, 3.2]) kit.box("emitAmber", rx + dx, BEAM_Y0 + 0.3, rz, 0.5, 0.06, 0.2);
      rackFrame(kit, s, rx, rz, wallX, i);
      // clamp yokes: two arms per wing gripping the top edge at z = rz ± 1.2 (the boarding bridge
      // passes between them), yellow-banded clamp blocks with a green "locked" lamp
      // (the wing hexagon's upper slanted edges pass y = RACK_Y + 2.7 at z = ±1.2, so the blocks straddle them)
      const grip = RACK_Y + 3.05;
      for (const w of [-1, 1]) {
        const wx = rx + w * WING_X;
        for (const dz of [-1.2, 1.2]) {
          kit.box("paintedMetal", wx, (BEAM_Y0 + grip + 0.4) / 2, rz + dz, 0.5, BEAM_Y0 - (grip + 0.4), 0.6, { color: PALETTE.impDark, texel: 1.5 });
          kit.box("metal", wx, grip, rz + dz, 0.8, 0.8, 0.8, { color: PALETTE.gunmetal });
          kit.box("hg_paintY", wx, grip, rz + dz + Math.sign(dz) * 0.41, 0.82, 0.5, 0.02);
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

/**
 * Wall-mounted rack frame around one TIE so "rack" reads from the deck: two heavy uprights behind the
 * outer wing (x = ±33.4: clear of the wing plane at ±32.65 and of the boarding gantry at ±34.4), wall
 * brackets tying them back at two heights, a lower rail with two saddle arms reaching under the outer
 * wing's bottom edge, a mid rail at wing-centre height and a lit status plate. Nothing sits inboard of
 * the wings or under the TIE's inner half: the taxi path leaves the rack sideways toward the lane.
 */
function rackFrame(kit, s, rx, rz, wallX, i) {
  const ux = s * 33.4;
  const yBot = RACK_Y - WING_H / 2 - 0.9; // 0.9 under the wing's bottom edge
  const yTop = BEAM_Y0;
  for (const dz of [-2.6, 2.6]) {
    kit.box("paintedMetal", ux, (yBot + yTop) / 2, rz + dz, 0.5, yTop - yBot, 0.5, { color: PALETTE.impMid, texel: 1.5 });
    for (const y of [yBot + 0.3, RACK_Y + 2.6]) {
      kit.boxMM("paintedMetal", [Math.min(ux, wallX), y - 0.18, rz + dz - 0.18], [Math.max(ux, wallX), y + 0.18, rz + dz + 0.18], { color: PALETTE.impDark, texel: 2 });
    }
  }
  // lower rail with a yellow band, saddle arms + rubber pads under the outer wing
  kit.boxMM("paintedMetal", [ux - 0.22, yBot, rz - 2.6], [ux + 0.22, yBot + 0.44, rz + 2.6], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("hg_paintY", [ux - 0.23, yBot + 0.1, rz - 2.3], [ux + 0.23, yBot + 0.34, rz + 2.3], {});
  const wx = rx + s * WING_X;
  for (const dz of [-1.5, 1.5]) {
    kit.boxMM("paintedMetal", [Math.min(ux, wx - s * 0.3), yBot + 0.1, rz + dz - 0.2], [Math.max(ux, wx - s * 0.3), yBot + 0.4, rz + dz + 0.2], { color: PALETTE.impDark, texel: 2 });
    kit.box("rubber", wx - s * 0.1, yBot + 0.5, rz + dz, 0.6, 0.2, 0.5, { color: PALETTE.impBlack });
  }
  // mid rail at wing-centre height
  kit.boxMM("paintedMetal", [ux - 0.18, RACK_Y - 0.18, rz - 2.6], [ux + 0.18, RACK_Y + 0.18, rz + 2.6], { color: PALETTE.impDark, texel: 1.5 });
  // status plate on the lower rail facing the deck: black plate, green "secured" bar, rack index pips
  const px = ux - s * 0.26;
  kit.box("paintedMetal", px, yBot - 0.55, rz, 0.06, 0.7, 1.6, { color: PALETTE.impBlack, texel: 2 });
  kit.box("emitGreen", px - s * 0.035, yBot - 0.35, rz, 0.01, 0.1, 1.3);
  for (let p = 0; p <= i; p++) kit.box("emitAmber", px - s * 0.035, yBot - 0.72, rz - 0.6 + p * 0.4, 0.01, 0.12, 0.2);
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
export function bowser(kit, ctx, x, z, yaw) {
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
  add("hazard", new THREE.CylinderGeometry(0.97, 0.97, 0.3, 18).rotateX(Math.PI / 2), 0, 1.7, -0.2, { texel: 1 });
  // tank furniture: yellow product band, manhole cap with a red vent, hazard placard on each side
  add("hg_paintY", new THREE.CylinderGeometry(0.965, 0.965, 0.16, 18).rotateX(Math.PI / 2), 0, 1.7, -1.3);
  add("paintedMetal", new THREE.CylinderGeometry(0.34, 0.34, 0.16, 14), 0, 2.72, -0.6, { color: PALETTE.impDark, texel: 2 });
  add("emitRed", new THREE.BoxGeometry(0.1, 0.12, 0.1), 0.2, 2.86, -0.6);
  for (const sx of [-1, 1]) {
    add("paintedMetal", new THREE.BoxGeometry(0.04, 0.74, 0.74), sx * 0.96, 1.75, 0.5, { color: PALETTE.impBlack, texel: 2 });
    add("decal", new THREE.PlaneGeometry(0.62, 0.62).rotateY(sx * (Math.PI / 2)), sx * 0.985, 1.75, 0.5, { uv: "keep", uvRect: decalRect(1) });
  }
  // pump housing with a valve panel: two red valve wheels, a pressure gauge, lit readout + LEDs
  add("paintedMetal", new THREE.BoxGeometry(1.4, 1.3, 0.9), 0, 1.35, 2.05, { color: PALETTE.impDark, texel: 2 });
  add("impPanel", new THREE.BoxGeometry(1.0, 0.6, 0.02), 0, 1.5, 2.51, { color: PALETTE.impGrey, uv: "keep" });
  add("emitAmber", new THREE.BoxGeometry(0.5, 0.08, 0.01), 0, 1.65, 2.525);
  add("leds", new THREE.BoxGeometry(0.6, 0.05, 0.01), 0, 1.4, 2.525, { uv: "keep" });
  for (const sx of [-0.45, 0.45]) {
    add("metal", new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8).rotateX(Math.PI / 2), sx, 1.05, 2.55, { color: PALETTE.steel });
    add("metal", new THREE.TorusGeometry(0.13, 0.025, 6, 14), sx, 1.05, 2.66, { color: new THREE.Color("#b8352a") });
  }
  add("metal", new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12).rotateX(Math.PI / 2), 0, 1.06, 2.54, { color: PALETTE.steel });
  add("emitGreen", new THREE.BoxGeometry(0.02, 0.02, 0.08), 0.04, 1.11, 2.58);
  // hose reel on the starboard side: drum between two discs, coiled hose, hose to the nozzle on its hook
  add("paintedMetal", new THREE.BoxGeometry(0.3, 0.6, 0.12), 1.2, 1.05, 1.2, { color: PALETTE.impDark, texel: 2 });
  for (const dx of [-0.24, 0.24]) add("metal", new THREE.CylinderGeometry(0.5, 0.5, 0.04, 20).rotateZ(Math.PI / 2), 1.2 + dx, 1.4, 1.2, { color: PALETTE.impMid });
  add("rubber", new THREE.CylinderGeometry(0.42, 0.42, 0.4, 16).rotateZ(Math.PI / 2), 1.2, 1.4, 1.2, { color: PALETTE.impBlack });
  add("rubber", new THREE.TorusGeometry(0.42, 0.055, 8, 22).rotateY(Math.PI / 2), 1.1, 1.4, 1.2, { color: PALETTE.impBlack });
  add("rubber", new THREE.TorusGeometry(0.42, 0.055, 8, 22).rotateY(Math.PI / 2), 1.3, 1.4, 1.2, { color: PALETTE.impBlack });
  pipeRun(kit, [P(1.25, 1.0, 1.2), P(1.6, 0.6, 1.8), P(1.3, 0.2, 2.9), P(0.9, 0.5, 3.0), P(0.86, 1.1, 2.62)], 0.06, PALETTE.impBlack, "rubber");
  add("metal", new THREE.CylinderGeometry(0.06, 0.09, 0.42, 10), 0.86, 1.32, 2.62, { color: PALETTE.gunmetal });
  add("hg_paintY", new THREE.BoxGeometry(0.08, 0.16, 0.08), 0.86, 1.4, 2.7);
  add("metal", new THREE.BoxGeometry(0.16, 0.05, 0.06), 0.86, 1.55, 2.58, { color: PALETTE.steel });
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
export function toolCart(kit, ctx, x, z, yaw) {
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
  add("hg_paintY", new THREE.BoxGeometry(0.2, 0.1, 0.14), 0.2, 1.16, -0.2);
  // handle
  add("metal", new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), -0.6, 1.1, 0, { color: PALETTE.steel });
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (1.3 * c + 0.8 * s) / 2;
  const ez = (1.3 * s + 0.8 * c) / 2;
  kit.collider([x - ex, 0, z - ez], [x + ex, 1.2, z + ez], "cart");
  void ctx;
}

/**
 * Detailed cargo container (the generic `crate` is a plain box): panelled body on two skids inside a
 * black frame with corner posts, two latch bars with steel latches on the front face, a white label
 * plate with a stencil and a status lamp. The front face is +z before `yaw`; `tone` picks the body
 * colour, `label` the decal cell (11 cargo, 6 barcode label, 14 B-12, 9 spec plate).
 */
export function cargoPod(kit, ctx, { x, y = 0, z, sx = 1.4, sy = 1.1, sz = 1.3, yaw = 0, tone = 0, label = 11, collide = true }) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const v = new THREE.Vector3(lx, ly, lz).applyQuaternion(q);
    return kit.add(mat, geo, { pos: [v.x + x, y + ly, v.z + z], quat: q, ...extra });
  };
  const box = (mat, lx, ly, lz, w, h, d, extra = {}) => add(mat, new THREE.BoxGeometry(w, h, d), lx, ly, lz, extra);
  const body = [PALETTE.impGrey, PALETTE.impMid, PALETTE.impLight, PALETTE.impDark][((tone % 4) + 4) % 4];
  box("impPanel1", 0, sy / 2 + 0.04, 0, sx - 0.1, sy - 0.16, sz - 0.1, { color: body, uv: "keep" });
  for (const s of [-1, 1]) box("paintedMetal", s * (sx / 2 - 0.16), 0.04, 0, 0.22, 0.08, sz - 0.1, { color: PALETTE.impBlack, texel: 2 });
  for (const ly of [0.12, sy - 0.04]) box("paintedMetal", 0, ly, 0, sx, 0.08, sz, { color: PALETTE.impBlack, texel: 2 });
  for (const s of [-1, 1]) for (const t of [-1, 1]) box("paintedMetal", s * (sx / 2 - 0.06), sy / 2, t * (sz / 2 - 0.06), 0.12, sy, 0.12, { color: PALETTE.impBlack, texel: 2 });
  const fz = sz / 2 - 0.05;
  for (const ly of [sy * 0.34, sy * 0.72]) {
    box("metal", 0, ly, fz + 0.03, sx - 0.36, 0.05, 0.04, { color: PALETTE.gunmetal });
    for (const s of [-1, 1]) box("metal", s * (sx / 2 - 0.32), ly, fz + 0.05, 0.12, 0.16, 0.06, { color: PALETTE.steel });
  }
  const lw = Math.min(sx * 0.32, sy * 0.5);
  box("impPanel", -sx * 0.2, sy * 0.53, fz + 0.012, lw, lw * 0.7, 0.012, { color: PALETTE.impWhite, uv: "keep" });
  add("decal", new THREE.PlaneGeometry(lw * 0.6, lw * 0.6), -sx * 0.2, sy * 0.53, fz + 0.02, { uv: "keep", uvRect: decalRect(label) });
  box(tone % 2 ? "emitGreen" : "emitAmber", sx * 0.24, sy * 0.53, fz + 0.02, 0.12, 0.04, 0.01);
  if (collide) {
    const c = Math.abs(Math.cos(yaw));
    const s = Math.abs(Math.sin(yaw));
    const ex = (sx * c + sz * s) / 2;
    const ez = (sx * s + sz * c) / 2;
    kit.collider([x - ex, y, z - ez], [x + ex, y + sy, z + ez], "container");
  }
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
// Lighting: two ceiling spots pooling light on the aprons, four warm hanging rigs over the aprons'
// inner edges (warm so the lit deck reads through the field from outside), and a warm lamp inside
// the flight-control cab. Five point lights + two spots in total so the pool (14 + 2) has room for
// the corridor and the two side bays (3 each).
// ---------------------------------------------------------------------------
function lighting(kit, ctx, B0) {
  SPOTS.forEach(([x, z], i) => {
    const s = new THREE.SpotLight(0xfff1de, 540 * LIGHT_SCALE, 62, 0.8, 0.6, 2);
    s.position.set(x, CEIL - 2.9, z);
    s.target.position.set(x, 0, z);
    s.castShadow = i === 0; // the pool's shadow-casting slot goes to the aft apron flood
    ctx.light(s);
  });
  // hung 2.6 m under the rig so the rig's own underside is not the brightest thing in the room
  for (const [x, z] of RIGS) ctx.light(pointLight(0xffe0bd, 190, 60, [x, RIG_Y - 2.6, z]));
  // cab light: warm, inside the tower, lights the consoles and crew silhouettes behind the glass
  ctx.light(pointLight(0xffc27a, 34, 18, [0, TOWER.y1 - 0.6, TOWER.z0 + 3.6]));
  void kit;
  void B0;
}

// ---------------------------------------------------------------------------
// Bay blast doors: two pairs of leaves sliding over the opening, driven by traffic.bay.openness.
// Heavy plates in 0.15 m relief, a 1.2 m hazard seam at the centre join with lit amber edge bars,
// white edge bars along the leaf ends: legible as doors from the entry when shut.
// ---------------------------------------------------------------------------
function bayDoors(ctx, wellGroup) {
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
      // slab (its top is the seam floor between the raised plates)
      k.boxMM("paintedMetal", [lo, -1.1, za], [hi, -0.17, zb], { color: PALETTE.impDark, texel: 0.6 });
      // top: raised armour plates in a 3 × 4 grid with deep dark seams
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 4; j++) {
          const px0 = lo + 0.9 + (i / 3) * (hi - lo - 1.8);
          const px1 = lo + 0.9 + ((i + 1) / 3) * (hi - lo - 1.8) - 0.35;
          const pz0 = za + 0.5 + (j / 4) * (len - 1.0);
          const pz1 = za + 0.5 + ((j + 1) / 4) * (len - 1.0) - 0.35;
          k.boxMM("impPanel1", [px0, -0.17, pz0], [px1, -0.02, pz1], { color: (i + j) % 3 ? PALETTE.impGrey : PALETTE.impMid, uv: "keep" });
          // recessed lifting-eye plate on every other panel
          if ((i + j) % 2 === 0) k.boxMM("paintedMetal", [(px0 + px1) / 2 - 0.5, -0.03, (pz0 + pz1) / 2 - 0.5], [(px0 + px1) / 2 + 0.5, -0.015, (pz0 + pz1) / 2 + 0.5], { color: PALETTE.impBlack, texel: 2 });
        }
      }
      // meeting edge: 0.6 m hazard band per leaf (1.2 m seam), coarse stripes, amber lit bar
      const ex0 = s < 0 ? -0.7 : 0.05;
      const ex1 = s < 0 ? -0.05 : 0.7;
      k.boxMM("paintedMetal", [ex0 - 0.1, -0.17, za], [ex1 + 0.1, -0.03, zb], { color: PALETTE.impBlack, texel: 2 });
      k.boxMM("hazard", [ex0, -0.03, za], [ex1, 0.0, zb], { texel: 0.35 });
      k.boxMM("hg_seam", [s < 0 ? -0.2 : 0.06, -0.02, za + 0.6], [s < 0 ? -0.06 : 0.2, 0.012, zb - 0.6], {});
      // white edge bars along the leaf ends (fore / aft)
      for (const z of [za + 0.2, zb - 0.2]) k.boxMM("hg_edge", [lo + 1.2, -0.02, z - 0.06], [hi - 1.2, 0.006, z + 0.06], {});
      // guide shoes at the fore / aft edges (ride in the well tracks)
      for (const z of [za + 0.15, zb - 0.15]) k.boxMM("metal", [lo, -1.0, z - 0.14], [hi, -0.2, z + 0.14], { color: PALETTE.gunmetal });
      // underside: deep ribs and running lights (the face seen from space)
      for (let i = 1; i < 6; i++) {
        const x = lo + (i / 6) * (hi - lo);
        k.boxMM("paintedMetal", [x - 0.3, -1.7, za + 0.6], [x + 0.3, -1.1, zb - 0.6], { color: PALETTE.impDark, texel: 1 });
      }
      for (const z of [za + 2, zc, zb - 2]) k.boxMM("paintedMetal", [lo + 0.6, -1.5, z - 0.3], [hi - 0.6, -1.1, z + 0.3], { color: PALETTE.impDark, texel: 1 });
      for (let z = za + 3; z < zb - 1; z += 6) k.box("emitRed", s * 1.3, -1.12, z, 0.5, 0.06, 0.5);
      k.boxMM("hazard", [lo + 0.05, -1.11, za + 0.3], [hi - 0.05, -1.1, za + 1.5], { texel: 0.5 });
      k.boxMM("hazard", [lo + 0.05, -1.11, zb - 1.5], [hi - 0.05, -1.1, zb - 0.3], { texel: 0.5 });
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
    // the well is only visible through the open doors
    if (wellGroup) wellGroup.visible = o > 0.002;
  };
  apply.meshes = meshes;
  return apply;
}

// ---------------------------------------------------------------------------
// Warning beacons: four slim 6 m poles with red dome heads a few metres beyond the curb corners
// (set 6.5 m off the well's ends so none stands in the foreground of the fixed deck / rack cameras
// at the aft corners), and a sign gantry across the launch lane at the aft curb carrying the lit
// "BAY 05" plate toward the entry (with two more beacons). The lamps breathe slowly when idle and
// strobe while the doors move; they are emissive only (the pool slot went to the tower cab light).
// ---------------------------------------------------------------------------
const MAST_H = 6;
const MAST_OFF = 6.5; // masts sit this far beyond the well's ends along z
const GANTRY = { x: 12.5, z: -56.2, h: 7.0 };
function beacons(ctx) {
  const k = new Kit(ctx.materials);
  const g = new THREE.Group();
  const head = (x, z, y) => {
    k.box("paintedMetal", x, y + 0.08, z, 0.7, 0.16, 0.7, { color: PALETTE.impBlack, texel: 2 });
    k.cyl("hg_beaconRed", x, y + 0.48, z, 0.26, 0.64, "y", { segments: 14 });
    k.cyl("paintedMetal", x, y + 0.86, z, 0.3, 0.12, "y", { color: PALETTE.impBlack, segments: 14, texel: 2 });
    k.box("hg_beaconAmber", x, y + 1.06, z, 0.18, 0.28, 0.18);
    k.cyl("metal", x, y + 1.24, z, 0.1, 0.08, "y", { color: PALETTE.gunmetal, segments: 8 });
  };
  // slim poles: 0.28 m tube on a low plinth, two yellow bands, a red ring lamp, black collar + red dome
  for (const x of [HOLE.x0 - 2.6, HOLE.x1 + 2.6]) {
    for (const z of [HOLE.z0 - MAST_OFF, HOLE.z1 + MAST_OFF]) {
      k.box("paintedMetal", x, 0.1, z, 0.6, 0.2, 0.6, { color: PALETTE.impBlack, texel: 2 });
      k.cyl("paintedMetal", x, MAST_H / 2 + 0.2, z, 0.14, MAST_H, "y", { color: PALETTE.impDark, segments: 10, texel: 1.5 });
      k.cyl("hg_paintY", x, 1.3, z, 0.15, 0.5, "y", { segments: 10 });
      k.cyl("hg_paintY", x, 4.8, z, 0.15, 0.36, "y", { segments: 10 });
      k.cyl("emitRed", x, 3.1, z, 0.152, 0.06, "y", { segments: 10 });
      const top = MAST_H + 0.2;
      k.cyl("paintedMetal", x, top + 0.07, z, 0.21, 0.14, "y", { color: PALETTE.impBlack, segments: 12, texel: 2 });
      k.add("hg_beaconRed", new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, top + 0.14, z] });
      ctx.collider([x - 0.25, 0, z - 0.25], [x + 0.25, top + 0.4, z + 0.25], "mast");
    }
  }
  // sign gantry: two posts outside the lane edges, a header beam with the plate facing the entry
  const G = GANTRY;
  for (const s of [-1, 1]) {
    k.box("paintedMetal", s * G.x, 0.25, G.z, 1.1, 0.5, 1.1, { color: PALETTE.impBlack, texel: 2 });
    k.box("paintedMetal", s * G.x, G.h / 2, G.z, 0.7, G.h, 0.7, { color: PALETTE.impDark, texel: 1.5 });
    k.box("hg_paintY", s * G.x, 1.5, G.z, 0.72, 1.0, 0.72);
    ctx.collider([s * G.x - 0.55, 0, G.z - 0.55], [s * G.x + 0.55, G.h, G.z + 0.55], "gantry");
  }
  k.box("paintedMetal", 0, G.h - 0.5, G.z, G.x * 2 + 0.7, 1.0, 0.9, { color: PALETTE.impDark, texel: 1.2 });
  k.box("paintedMetal", 0, G.h - 1.05, G.z, G.x * 2 + 0.7, 0.1, 1.1, { color: PALETTE.impBlack, texel: 2 });
  k.box("hg_laneAmber", 0, G.h - 1.11, G.z, G.x * 2 - 1.6, 0.02, 0.5);
  for (const s of [-1, 1]) head(s * 6, G.z, G.h);
  signPlate(k, ctx, { side: "zmin", u: 8, v: G.h - 0.5, w: 10.5, h: 1.6, text: "BAY 05", sub: "Main hangar · launch lane", accent: "#ffb347", bounds: [[-8, 0, G.z + 0.45], [8, G.h, G.z + 1]] });
  k.build(g);
  ctx.mesh(g);
  const red = ctx.materials.hg_beaconRed;
  const amber = ctx.materials.hg_beaconAmber;
  return (o, t, moving) => {
    if (moving) {
      const p = Math.max(0, Math.sin(t * 7));
      const q = Math.max(0, Math.sin(t * 7 + Math.PI));
      red.emissiveIntensity = 0.6 + 5 * p;
      amber.emissiveIntensity = 0.6 + 4 * q;
    } else {
      red.emissiveIntensity = 1.7 + 0.9 * Math.sin(t * 2.4);
      amber.emissiveIntensity = 1.3 + 0.5 * Math.sin(t * 2.4 + Math.PI);
    }
    void o;
  };
}

// ---------------------------------------------------------------------------
// Magnetic containment field across the opening, just under deck level
// ---------------------------------------------------------------------------
function containmentField(ctx) {
  const mat = ctx.materials.hg_field;
  const w = HOLE.x1 - HOLE.x0 - 0.3;
  const d = HOLE.z1 - HOLE.z0 - 0.3;
  const FADE = 2.0; // the outer 2 m fade out (vertex colour → black adds nothing)
  // 3 × 3 quads: the 16 vertices of a 4 × 4 grid are pulled to the fade ring, then coloured
  const geo = new THREE.PlaneGeometry(w, d, 3, 3);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const stops = (len) => [-len / 2, -len / 2 + FADE, len / 2 - FADE, len / 2];
  const sx = stops(w);
  const sy = stops(d);
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      const v = j * 4 + i;
      pos.setXY(v, sx[i], sy[3 - j]);
      const inner = i > 0 && i < 3 && j > 0 && j < 3 ? 1 : 0;
      col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = inner;
    }
  }
  // uvs follow the vertex positions so the 1 m cells stay square across the ring
  const uv = geo.attributes.uv;
  for (let v = 0; v < pos.count; v++) uv.setXY(v, pos.getX(v) / w + 0.5, pos.getY(v) / d + 0.5);
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, FIELD_Y, (HOLE.z0 + HOLE.z1) / 2);
  mesh.renderOrder = 4;
  mesh.frustumCulled = true;
  ctx.mesh(mesh);
  return (t, o) => {
    // slow drift + gentle breathing; it must stay see-through (0.3 ± 0.04)
    mat.map.offset.set((t * 0.006) % 1, (-t * 0.009) % 1);
    mat.opacity = 0.3 + 0.03 * Math.sin(t * 1.1) + 0.012 * Math.sin(t * 3.7);
    // nothing of it shows under the shut leaves; skip the blend when closed
    mesh.visible = o > 0.002;
  };
}

// ---------------------------------------------------------------------------
// Overhead bridge crane travelling along z on the rails over the opening: a 1.6 m box girder on end
// trucks, a trolley underneath with twin cables down to a hook block at ~6 m carrying a wing panel
// flat in four slings. The trolley keeps to |x| ≤ 4 so the load stays clear of the TIE descent
// columns at x = ±10 (the launch path drops through the well there).
// ---------------------------------------------------------------------------
function gantryCrane(ctx) {
  const k = new Kit(ctx.materials);
  const g = new THREE.Group();
  const span = 24.6 * 2;
  const GY0 = 23.9;
  const GY1 = 25.5;
  k.box("paintedMetal", 0, (GY0 + GY1) / 2, 0, span + 1.6, GY1 - GY0, 1.4, { color: PALETTE.impMid, texel: 1 });
  k.box("paintedMetal", 0, GY1 - 0.1, 0, span + 1.6, 0.2, 1.7, { color: PALETTE.impDark, texel: 1.5 });
  k.box("paintedMetal", 0, GY0 + 0.1, 0, span + 1.6, 0.2, 1.7, { color: PALETTE.impDark, texel: 1.5 });
  for (const s of [-1, 1]) k.box("hazard", 0, GY0 + 0.6, s * 0.71, span - 4, 0.5, 0.02, { texel: 0.35 });
  for (let x = -span / 2 + 2; x < span / 2; x += 4) k.box("paintedMetal", x, (GY0 + GY1) / 2, 0, 0.24, GY1 - GY0 - 0.4, 1.56, { color: PALETTE.impDark, texel: 2 });
  for (const s of [-1, 1]) {
    k.box("paintedMetal", s * 24.6, 25.65, 0, 1.6, 0.5, 2.4, { color: PALETTE.impDark, texel: 2 });
    k.box("emitAmber", s * 24.6, 25.65, 1.21, 0.6, 0.12, 0.01);
    k.box("emitAmber", s * 24.6, 25.65, -1.21, 0.6, 0.12, 0.01);
    k.box("emitRed", s * 24.9, 26.05, 0, 0.3, 0.3, 0.3);
  }
  k.box("hg_lane", 0, GY0 - 0.01, 0, span - 4, 0.02, 0.4);
  k.build(g);
  // trolley under the girder, twin cables, hook block, spreader frame and the slung wing
  const tk = new Kit(ctx.materials);
  const trolley = new THREE.Group();
  const HOOK = 6.2;
  tk.box("paintedMetal", 0, GY0 - 0.6, 0, 2.4, 1.2, 2.0, { color: PALETTE.impDark, texel: 2 });
  tk.box("hg_paintY", 0, GY0 - 1.12, 0, 2.44, 0.16, 2.04);
  tk.box("emitRed", 0.8, GY0 - 0.6, 1.01, 0.2, 0.2, 0.02);
  for (const dx of [-0.5, 0.5]) tk.cyl("metal", dx, (GY0 - 1.2 + HOOK + 0.5) / 2, 0, 0.035, GY0 - 1.2 - (HOOK + 0.5), "y", { color: PALETTE.steel, segments: 6 });
  tk.box("paintedMetal", 0, HOOK + 0.2, 0, 1.4, 0.6, 0.5, { color: PALETTE.impDark, texel: 2 });
  tk.add("metal", new THREE.TorusGeometry(0.3, 0.07, 8, 16), { pos: [0, HOOK - 0.3, 0], color: PALETTE.steel });
  const BAR = HOOK - 0.9;
  const WY = HOOK - 2.2;
  tk.box("paintedMetal", 0, BAR, 0, 3.2, 0.14, 0.14, { color: PALETTE.impDark, texel: 2 });
  tk.box("paintedMetal", 0, BAR, 0, 0.14, 0.14, 5.8, { color: PALETTE.impDark, texel: 2 });
  for (const [dx, dz] of [
    [-1.5, -2.8],
    [1.5, -2.8],
    [-1.5, 2.8],
    [1.5, 2.8],
  ]) {
    pipeRun(tk, [[0, HOOK - 0.58, 0], [dx, BAR + 0.07, dz]], 0.025, PALETTE.steel, "metal");
    pipeRun(tk, [[dx, BAR - 0.07, dz], [dx, WY + 0.2, dz]], 0.025, PALETTE.steel, "metal");
  }
  flatWing(tk, 0, WY, 0);
  tk.build(trolley);
  g.add(trolley);
  ctx.mesh(g);
  const zMid = (HOLE.z0 + HOLE.z1) / 2;
  return (t) => {
    g.position.z = zMid + Math.sin(t * 0.045) * 28;
    trolley.position.x = Math.sin(t * 0.07 + 1) * 4;
  };
}

/** TIE wing panel lying flat (plane normal y, long axis along z) centred at (x, y, z). */
function flatWing(k, x, y, z) {
  const H = WING_H;
  const W = WING_W;
  const hex = new THREE.Shape([
    new THREE.Vector2(-W / 2, -H * 0.3),
    new THREE.Vector2(0, -H / 2),
    new THREE.Vector2(W / 2, -H * 0.3),
    new THREE.Vector2(W / 2, H * 0.3),
    new THREE.Vector2(0, H / 2),
    new THREE.Vector2(-W / 2, H * 0.3),
  ]);
  const lay = (geo) => geo.rotateX(-Math.PI / 2); // hex (x, y) plane → (x, z) plane
  k.add("tiePanel", lay(new THREE.ExtrudeGeometry(hex, { depth: 0.08, bevelEnabled: false })), { pos: [x, y - 0.04, z], uv: "keep" });
  const pts = hex.getPoints();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const geo = new THREE.BoxGeometry(a.distanceTo(b), 0.22, 0.22);
    geo.rotateZ(Math.atan2(b.y - a.y, b.x - a.x));
    geo.translate((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
    k.add("tieHull", lay(geo), { pos: [x, y, z] });
  }
  k.add("tieHull", lay(new THREE.BoxGeometry(0.2, H * 0.98, 0.3)), { pos: [x, y, z] });
  k.add("tieHull", lay(new THREE.BoxGeometry(W * 0.98, 0.3, 0.2)), { pos: [x, y, z] });
  k.cyl("tieHull", x, y + 0.25, z, 0.9, 0.3, "y", { segments: 12 }); // pylon collar on the upper face
}

// ---------------------------------------------------------------------------
// Fenced cargo lift: a platform in a four-post cage cycling slowly between the deck and +2.6 m
// ---------------------------------------------------------------------------
function cargoLift(kit, ctx, x, z) {
  const half = 2.3;
  // static cage: posts, top frame, railing fence around the pit, painted curb
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      kit.box("paintedMetal", x + sx * (half + 0.3), 3.6, z + sz * (half + 0.3), 0.3, 7.2, 0.3, { color: PALETTE.impDark, texel: 2 });
      kit.box("metal", x + sx * (half + 0.3), 3.6, z + sz * (half + 0.3), 0.12, 7.0, 0.36, { color: PALETTE.steel });
    }
  }
  kit.boxMM("paintedMetal", [x - half - 0.45, 7.2, z - half - 0.45], [x + half + 0.45, 7.6, z + half + 0.45], { color: PALETTE.impDark, texel: 2 });
  kit.box("emitAmber", x, 7.18, z, half * 1.6, 0.02, 0.2);
  kit.boxMM("hazard", [x - half - 0.5, 0, z - half - 0.5], [x + half + 0.5, 0.05, z + half + 0.5], { texel: 0.5 });
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
  k.box("hazard", 0, 0.005, 0, half * 2, 0.01, half * 2, { texel: 0.5 });
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
