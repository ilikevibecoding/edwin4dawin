// Main Command Bridge — the heart of the ISD Redoubt (owner: bridge workstream).
//
// Layout (world metres, floor y = 210, ceiling 217): a central command walkway 8 m wide runs from the aft
// blast door (z 206) to the forward glazing (z 172.25). Two crew pits 1.4 m lower flank it (|x| 4..12,
// z 176..202) with operator consoles along the walkway-side and outer pit walls, a cable trench down the
// middle and step flights at both ends of each pit. A raised command dais (z 176..180) carries the
// commander's station and the tactical holo projector; the forward wall is the film's wide band of tall,
// outward-leaning panes. Side walls carry tactical screen arrays between structural pilasters; the aft wall
// carries computer banks and the Imperial emblem above the blast door.
// Contract: src/core/room.js (BuildContext), PLAN.md §3. This module owns only itself.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Kit, prism } from "../../core/kit.js";
import { Frame, panelGrid, pilaster } from "../../core/frame.js";
import { Placer } from "../../core/props.js";
import { IMP } from "../../core/palette.js";
import { screenRect, ledRect, decalRect, DECAL } from "../../textures.js";

export const meta = { id: "bridge", stream: "bridge" };

const FLOOR = 210;
const CEIL = 217;
const PIT_Y = 208.6; // crew pit floor
const WALK_X = 4; // walkway half width
const PIT_X0 = 4; // pits span |x| 4..12
const PIT_X1 = 12;
const PIT_Z0 = 176;
const PIT_Z1 = 202;
const DAIS = { z0: 176, z1: 180, h: 0.3 };
const STAIR_W = 2.4;
const STAIR_RUN = 2.1;
// step flights (z centre) along each pit's walkway-side edge: one beside the dais, one against the aft wall
const STAIR_Z = [181.2, 200.45];
const RAIL_IN = 0.15; // railings stand this far inside a deck edge
const TRENCH = { x0: 7.4, x1: 8.6, z0: 177.5, z1: 200.5 }; // |x| range of the pit cable trench
const UP = new THREE.Vector3(0, 1, 0);
const XAXIS = new THREE.Vector3(1, 0, 0);

export function build(ctx) {
  buildShell(ctx);
  buildDecks(ctx);
  buildPits(ctx);
  buildGlazing(ctx);
  buildSideWalls(ctx);
  buildAftWall(ctx);
  buildCeiling(ctx);
  buildDais(ctx);
  buildStations(ctx);
  buildLights(ctx);
  buildAnimated(ctx);
}

// ---------------------------------------------------------------------------------------------------
// Shell: ceiling slab + three panelled walls with the door openings carved (the glazing wall is ours)
// ---------------------------------------------------------------------------------------------------
function buildShell(ctx) {
  const sideRows = [0, 0.35, 1.7, 1.95, 4.1, 5.6, ctx.h];
  const side = (seed) => ({ rows: sideRows, panelW: 1.6, seed, styles: { plate: 0.5, panel: 0.28, vent: 0.08, hatch: 0.08, pipes: 0.06 }, tints: [[IMP.plateDark, 0.5], [IMP.plate, 0.25], [IMP.plateBlue, 0.15], [IMP.trim, 0.1]] });
  ctx.shell({
    skipFloor: true,
    ceiling: false,
    walls: {
      zmin: false,
      xmin: side(101),
      xmax: side(103),
      zmax: { rows: [0, 0.35, 1.7, 1.95, 3.7, 5.4, ctx.h], panelW: 1.6, seed: 107, styles: { plate: 0.55, panel: 0.15, vent: 0.1, hatch: 0.1, pipes: 0.1 }, tints: [[IMP.plateDark, 0.6], [IMP.plate, 0.25], [IMP.plateBlue, 0.15]] },
    },
  });
}

// ---------------------------------------------------------------------------------------------------
// Decks: black gloss upper deck (walkway, galleries, side ledges), grey pit floors, hazard rims
// ---------------------------------------------------------------------------------------------------
function buildDecks(ctx) {
  const { kit } = ctx;
  const { x0, x1, z0, z1 } = ctx.box;
  const upper = [
    [x0, z0, x1, PIT_Z0], // forward gallery (under the glazing)
    [x0, PIT_Z1, x1, z1], // aft gallery (door wall)
    [x0, PIT_Z0, -PIT_X1, PIT_Z1], // port ledge
    [PIT_X1, PIT_Z0, x1, PIT_Z1], // starboard ledge
    [-WALK_X, PIT_Z0, WALK_X, PIT_Z1], // command walkway
  ];
  for (const [a, b, c, d] of upper) {
    kit.boxMM("deckBlack", [a, FLOOR - 0.3, b], [c, FLOOR, d], { color: 0xffffff, texel: 0.5 });
    kit.collider([a, FLOOR - 0.6, b], [c, FLOOR, d], "floor");
  }
  // walkway centre line: two thin steel inlays running the full length (the officers' lane)
  for (const s of [-1, 1]) kit.boxMM("metal", [s * 2.6 - 0.03, FLOOR + 0.002, z0 + 1.6], [s * 2.6 + 0.03, FLOOR + 0.006, z1 - 0.3], { color: IMP.steelDark });
  // solid void fill under the walkway between the pits (never seen, keeps the pits light-tight)
  kit.boxMM("paintedMetal", [-WALK_X, PIT_Y - 0.3, PIT_Z0], [WALK_X, FLOOR - 0.3, PIT_Z1], { color: IMP.black, texel: 1 });

  for (const s of [-1, 1]) {
    const xi = s * PIT_X0; // walkway-side pit edge
    const xo = s * PIT_X1; // outer pit edge
    // pit floor (grey) split around the cable trench
    const tx0 = s * TRENCH.x0;
    const tx1 = s * TRENCH.x1;
    const lo = Math.min(tx0, tx1);
    const hi = Math.max(tx0, tx1);
    const slabs = [
      [Math.min(xi, xo), PIT_Z0, lo, PIT_Z1],
      [hi, PIT_Z0, Math.max(xi, xo), PIT_Z1],
      [lo, PIT_Z0, hi, TRENCH.z0],
      [lo, TRENCH.z1, hi, PIT_Z1],
    ];
    for (const [a, b, c, d] of slabs) {
      kit.boxMM("deckGrey", [a, PIT_Y - 0.3, b], [c, PIT_Y, d], { color: IMP.plateLight, texel: 0.5 });
      kit.collider([a, PIT_Y - 0.6, b], [c, PIT_Y, d], "floor");
    }
    // cable trench: dark channel, cable runs, grating flush with the pit floor (walkable)
    kit.boxMM("paintedMetal", [lo - 0.02, PIT_Y - 0.5, TRENCH.z0 - 0.02], [hi + 0.02, PIT_Y - 0.4, TRENCH.z1 + 0.02], { color: IMP.black, texel: 1 });
    kit.boxMM("paintedMetal", [lo - 0.02, PIT_Y - 0.4, TRENCH.z0], [lo + 0.04, PIT_Y - 0.02, TRENCH.z1], { color: IMP.black, texel: 1 });
    kit.boxMM("paintedMetal", [hi - 0.04, PIT_Y - 0.4, TRENCH.z0], [hi + 0.02, PIT_Y - 0.02, TRENCH.z1], { color: IMP.black, texel: 1 });
    kit.boxMM("paintedMetal", [lo, PIT_Y - 0.4, TRENCH.z0 - 0.02], [hi, PIT_Y - 0.02, TRENCH.z0 + 0.04], { color: IMP.black, texel: 1 });
    kit.boxMM("paintedMetal", [lo, PIT_Y - 0.4, TRENCH.z1 - 0.04], [hi, PIT_Y - 0.02, TRENCH.z1 + 0.02], { color: IMP.black, texel: 1 });
    const cx = (lo + hi) / 2;
    for (const [dx, r, col, m] of [[-0.3, 0.05, IMP.black, "rubber"], [-0.1, 0.035, IMP.gunmetal, "metal"], [0.12, 0.05, IMP.black, "rubber"], [0.32, 0.03, IMP.steelDark, "metal"]]) {
      ctx.props.pipeRun(kit, { points: [[cx + dx, PIT_Y - 0.3, TRENCH.z0 + 0.1], [cx + dx, PIT_Y - 0.3, TRENCH.z1 - 0.1]], r, color: col, mat: m, clamps: m === "metal" ? 4 : 0 });
    }
    ctx.props.floorGrate(kit, [lo, TRENCH.z0], [hi, TRENCH.z1], PIT_Y + 0.002);
    kit.collider([lo, PIT_Y - 0.6, TRENCH.z0], [hi, PIT_Y, TRENCH.z1], "grate");

    // hazard strips on the upper deck along every pit rim
    const hz = (a, b, c, d) => kit.boxMM("hazard", [Math.min(a, c), FLOOR + 0.004, Math.min(b, d)], [Math.max(a, c), FLOOR + 0.012, Math.max(b, d)], { texel: 1 });
    hz(xi, PIT_Z0, xi + s * -0.36, PIT_Z1); // walkway edge (strip lies on the walkway side)
    hz(xo, PIT_Z0, xo + s * 0.36, PIT_Z1); // ledge edge
    hz(xi, PIT_Z0, xo, PIT_Z0 - 0.36); // forward gallery edge
    hz(xi, PIT_Z1, xo, PIT_Z1 + 0.36); // aft gallery edge
  }
}

// ---------------------------------------------------------------------------------------------------
// Pits: panelled pit walls with LED matrices, nosings, railings with gaps at the steps, step flights
// ---------------------------------------------------------------------------------------------------
const PIT_WALL_D = 0.12; // pit wall panels stand this far proud of the deck edge (panelGrid builds behind its plane)

/** Panelled pit wall; origin lies on the panel face, panels recess toward the deck edge behind it. */
function pitWall(ctx, origin, dir, length, seed, openings = []) {
  const f = new Frame(ctx.kit, new THREE.Vector3(...origin), new THREE.Vector3(...dir), UP);
  const H = FLOOR - PIT_Y;
  panelGrid(f, length, H, {
    openings,
    rows: [0, 0.28, H],
    panelW: 1.62,
    depth: PIT_WALL_D,
    seed,
    styles: { panel: 0.55, plate: 0.3, vent: 0.15 },
    tints: [[IMP.plateDark, 0.6], [IMP.trim, 0.4]],
    kick: true,
    cornice: false,
    collide: true,
    tag: "pitwall",
    accent: "emitBlue",
  });
  // LED matrix strip high on every bay (skipping the step openings)
  const n = Math.max(1, Math.round(length / 1.62));
  for (let i = 0; i < n; i++) {
    const cu = ((i + 0.5) * length) / n;
    if (openings.some((o) => cu > o.u0 - 0.6 && cu < o.u1 + 0.6)) continue;
    f.box("darkGloss", cu, H - 0.19, 0.02, 1.16, 0.15, 0.04);
    f.box("leds", cu, H - 0.19, 0.043, 1.06, 0.09, 0.006, { uv: "keep", uvRect: ledRect((seed * 7 + i * 5) % 16) });
  }
  return f;
}

function buildPits(ctx) {
  const { kit, props } = ctx;
  const H = FLOOR - PIT_Y;
  const anim = animState(ctx);
  // railing with optional indicator caps on its end posts (posts sit 4 cm in from the endpoints)
  const rail = (from, to, y, ends = []) => {
    props.railing(kit, { from, to, y, color: IMP.black });
    const L = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const d = [(to[0] - from[0]) / L, (to[1] - from[1]) / L];
    for (const e of ends) {
      const p = e === 0 ? [from[0] + d[0] * 0.04, from[1] + d[1] * 0.04] : [to[0] - d[0] * 0.04, to[1] - d[1] * 0.04];
      kit.box("paintedMetal", p[0], y + 1.11, p[1], 0.1, 0.06, 0.1, { color: IMP.black });
      anim.blinkRed.push([p[0], y + 1.175, p[1]]);
    }
  };
  for (const s of [-1, 1]) {
    const xi = s * PIT_X0;
    const xo = s * PIT_X1;
    const e = PIT_WALL_D; // panel faces stand this far into the pit, panels recess back to the deck edge
    // walkway-side wall (faces the outer wall) with the wall carved away behind the step flights
    const uz = s < 0 ? (z) => z - PIT_Z0 : (z) => PIT_Z1 - z;
    const stepOps = STAIR_Z.map((zc) => {
      // opening clears the flight and its side rails (which run 0.1 m outside the treads)
      const [u0, u1] = [uz(zc - STAIR_W / 2 - 0.2), uz(zc + STAIR_W / 2 + 0.2)].sort((a, b) => a - b);
      return { type: "door", u0, u1, v0: 0, v1: H };
    });
    pitWall(ctx, [xi + s * e, PIT_Y, s < 0 ? PIT_Z0 : PIT_Z1], [0, 0, s < 0 ? 1 : -1], PIT_Z1 - PIT_Z0, 211 + s, stepOps);
    // outer wall (faces the walkway), end walls
    pitWall(ctx, [xo - s * e, PIT_Y, s < 0 ? PIT_Z1 : PIT_Z0], [0, 0, s < 0 ? -1 : 1], PIT_Z1 - PIT_Z0, 223 + s);
    pitWall(ctx, [s < 0 ? xo : xi, PIT_Y, PIT_Z0 + e], [1, 0, 0], PIT_X1 - PIT_X0, 227 + s);
    pitWall(ctx, [s < 0 ? xi : xo, PIT_Y, PIT_Z1 - e], [-1, 0, 0], PIT_X1 - PIT_X0, 229 + s);
    // steel nosings cap the panel tops along the rims (2 cm lip above the deck, 2 cm past the panel face)
    const nose = (min, max) => kit.boxMM("metal", min, max, { color: IMP.steelDark });
    const y0 = FLOOR - 0.06;
    const y1 = FLOOR + 0.02;
    const span = (a, b) => [Math.min(a, b), Math.max(a, b)];
    const [nix0, nix1] = span(xi + s * (e + 0.02), xi - s * 0.05);
    const [nox0, nox1] = span(xo - s * (e + 0.02), xo + s * 0.05);
    // walkway edge, interrupted by the step flights (the dais carries its own lip)
    const gaps = STAIR_Z.map((z) => [z - STAIR_W / 2, z + STAIR_W / 2]);
    let z = DAIS.z1;
    for (const [g0, g1] of gaps) {
      if (g0 > z + 0.01) nose([nix0, y0, z], [nix1, y1, g0]);
      z = g1;
    }
    if (z < PIT_Z1 - 0.01) nose([nix0, y0, z], [nix1, y1, PIT_Z1]);
    nose([nox0, y0, PIT_Z0], [nox1, y1, PIT_Z1]);
    nose([Math.min(xi, xo), y0, PIT_Z0 - 0.05], [Math.max(xi, xo), y1, PIT_Z0 + e + 0.02]);
    nose([Math.min(xi, xo), y0, PIT_Z1 - e - 0.02], [Math.max(xi, xo), y1, PIT_Z1 + 0.05]);

    // railings (black, 1.05 m): walkway edge beside the dais and between the flights (red indicator caps on
    // the posts that flank the stair gaps), outer ledge, gallery edges
    const rx = xi - s * RAIL_IN;
    rail([rx, DAIS.z0 + 0.15], [rx, DAIS.z1 - 0.1], FLOOR + DAIS.h, [1]);
    rail([rx, STAIR_Z[0] + STAIR_W / 2 + 0.15], [rx, STAIR_Z[1] - STAIR_W / 2 - 0.15], FLOOR, [0, 1]);
    rail([xo + s * RAIL_IN, PIT_Z0 + 0.15], [xo + s * RAIL_IN, PIT_Z1 - 0.15], FLOOR);
    rail([xo + s * RAIL_IN, PIT_Z0 - RAIL_IN], [xi - s * 0.3, PIT_Z0 - RAIL_IN], FLOOR);
    rail([xo + s * RAIL_IN, PIT_Z1 + RAIL_IN], [xi - s * 0.15, PIT_Z1 + RAIL_IN], FLOOR, [1]);

    // step flights: bottom edge in the pit at |x| = 4 + run, climbing toward the walkway (every step collides)
    for (const zc of STAIR_Z) {
      props.stairs(kit, { pos: [s * (PIT_X0 + STAIR_RUN), PIT_Y, zc], yaw: s < 0 ? -Math.PI / 2 : Math.PI / 2, width: STAIR_W, rise: H, run: STAIR_RUN, stepH: 0.2, color: IMP.plateDark });
      // stair-head marker light let into the walkway deck (sits on top of the hazard strip)
      kit.box("emitWhiteSoft", xi - s * 0.2, FLOOR + 0.015, zc, 0.06, 0.006, STAIR_W - 0.4, { uv: "keep" });
    }
    // amber work lights along the top of the outer pit wall (practicals for the outer console row)
    for (let k = 0; k < 6; k++) {
      const zl = PIT_Z0 + 2.2 + k * 4.3;
      const x = xo - s * 0.16;
      kit.box("paintedMetal", x, FLOOR - 0.28, zl, 0.16, 0.2, 0.5, { color: IMP.black, texel: 1 });
      kit.box("emitAmber", x - s * 0.085, FLOOR - 0.3, zl, 0.01, 0.06, 0.36);
    }
  }
}

// ---------------------------------------------------------------------------------------------------
// Forward glazing. The exterior tower carries the outer pane 2.5 m outside our wall plane, at the far end of a
// dark slot whose sill/lintel boxes poke 15 cm into the room. We build the inner band: a deep steel sill deck
// running out to the exterior pane, tall panes that lean ~11° outward from a lip at the room side of the sill
// up to the wall plane at the head (nothing we build passes the tower's front face), tapered black mullions,
// a black plinth under the lip, jamb returns and a head beam that swallow the exterior intrusions.
// The sill height follows the layout's window opening (v0, currently 0.5 m so a standing officer sees the hull).
// ---------------------------------------------------------------------------------------------------
function buildGlazing(ctx) {
  const { kit } = ctx;
  const win = ctx.wall("zmin").openings.find((o) => o.type === "window");
  const wx0 = win ? ctx.inner.x0 + win.u0 : -13;
  const wx1 = win ? ctx.inner.x0 + win.u1 : 13;
  const ySill = FLOOR + (win ? win.v0 : 1.0) + 0.02; // sill deck top / glass foot (2 cm over the exterior sill)
  const y1 = FLOOR + (win ? win.v1 : 6.5) - 0.02; // glass head, tucked under the exterior lintel
  const zf = ctx.inner.z0; // 172.25: inner wall plane
  const zOut = ctx.box.z0 - 1.95; // 170.05: just inside the tower's front face
  const X0 = ctx.inner.x0;
  const X1 = ctx.inner.x1;
  const W = X1 - X0;
  const D = 1.15; // horizontal run of the lean
  const zFoot = zf + D;
  const zLip = zFoot + 0.15;
  const lean = Math.atan2(D, y1 - ySill);
  const PH = Math.hypot(D, y1 - ySill);
  const wc = (wx0 + wx1) / 2;
  const ww = wx1 - wx0;

  // --- sill deck (behind the glass): plated deck out to the exterior pane, recessed sensor channel with LEDs
  kit.boxMM("plate", [X0, ySill - 0.06, zOut], [X1, ySill, zFoot + 0.02], { color: IMP.plate, uv: "world", texel: 1 });
  kit.boxMM("darkGloss", [wx0 + 0.3, ySill, zOut + 0.9], [wx1 - 0.3, ySill + 0.03, zOut + 1.3]);
  for (let x = wx0 + 1.3; x < wx1 - 1.0; x += 4.4) kit.box("leds", x, ySill + 0.033, zOut + 1.1, 2.2, 0.004, 0.09, { uv: "keep", uvRect: ledRect(Math.floor(ctx.rand() * 16)) });

  // --- plinth on the room side: black wall under the sill deck with a recessed kick, a steel cap that carries
  //     the glass foot and overhangs the face, and a channel under the cap with one blue light bar per pane bay
  const zFace = zLip + 0.25; // room-side face of the plinth
  // mullion x positions match the exterior tower mullions (x = -32 + 2.2k)
  const mull = [];
  for (let x = -32; x < 40; x += 2.2) if (x > wx0 + 0.3 && x < wx1 - 0.3) mull.push(+x.toFixed(2));
  const edges = [wx0, ...mull, wx1];
  const pl = prism(
    [
      [zf - 0.45, FLOOR],
      [zf - 0.45, ySill - 0.02],
      [zFace, ySill - 0.02],
      [zFace, FLOOR + 0.12],
      [zFace - 0.06, FLOOR + 0.12],
      [zFace - 0.06, FLOOR],
    ],
    W,
  );
  kit.add("paintedMetal", pl, { rot: [0, -Math.PI / 2, 0], color: IMP.black, uv: "world", texel: 1 });
  kit.boxMM("metal", [X0, ySill - 0.04, zFoot + 0.02], [X1, ySill + 0.04, zFace + 0.02], { color: IMP.steelDark }); // cap
  kit.boxMM("paintedMetal", [wx0 - 0.05, ySill - 0.16, zFace - 0.02], [wx1 + 0.05, ySill - 0.06, zFace + 0.01], { color: IMP.black, texel: 1 });
  for (let i = 0; i < edges.length - 1; i++) {
    const cx = (edges[i] + edges[i + 1]) / 2;
    const bw = edges[i + 1] - edges[i] - 0.7;
    if (bw < 0.5) continue; // the narrow end bays beside the jambs stay dark
    kit.boxMM("emitBlue", [cx - bw / 2, ySill - 0.12, zFace + 0.01], [cx + bw / 2, ySill - 0.1, zFace + 0.018]);
  }
  kit.collider([ctx.box.x0, FLOOR, ctx.box.z0 - 0.5], [ctx.box.x1, y1, zFace + 0.02], "sill");

  // --- jamb returns (x 13..13.75) reaching out along the slot, plated on the room face, lit slot on the return
  for (const s of [-1, 1]) {
    const jx0 = s < 0 ? X0 : wx1;
    const jx1 = s < 0 ? wx0 : X1;
    const fx = s < 0 ? wx0 : wx1; // inner return face
    kit.boxMM("paintedMetal", [jx0, FLOOR, zOut], [jx1, CEIL, zf + 0.05], { color: IMP.black, texel: 1 });
    kit.boxMM("plate", [jx0 + 0.05, FLOOR + 0.35, zf + 0.05], [jx1 - 0.05, CEIL - 0.4, zf + 0.11], { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.boxMM("metal", [fx - 0.02, ySill - 0.06, zf - 0.03], [fx + 0.02, y1 + 0.02, zf + 0.06], { color: IMP.steelDark });
    kit.boxMM("emitBlue", [fx + (s < 0 ? 0 : -0.01), ySill + 0.6, zOut + 1.2], [fx + (s < 0 ? 0.01 : 0), y1 - 0.6, zOut + 1.26]);
  }

  // --- head beam over the panes (swallows the exterior lintel), head channel, cool strip, fascia LEDs
  const zHead = zf + 0.45;
  kit.boxMM("paintedMetal", [X0, y1, zOut], [X1, CEIL, zHead], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [wx0 - 0.05, y1 - 0.09, zf - 0.14], [wx1 + 0.05, y1 + 0.01, zf + 0.16], { color: IMP.black, texel: 1 });
  kit.boxMM("emitBlue", [wx0 + 0.5, y1 - 0.075, zf + 0.16], [wx1 - 0.5, y1 - 0.035, zf + 0.17]);
  kit.boxMM("darkGloss", [X0 + 1.5, y1 + 0.14, zHead], [X1 - 1.5, y1 + 0.36, zHead + 0.04]);
  for (let x = wx0 + 1.4; x < wx1 - 1.0; x += 3.3) kit.box("leds", x, y1 + 0.25, zHead + 0.045, 1.6, 0.1, 0.006, { uv: "keep", uvRect: ledRect(Math.floor(ctx.rand() * 16)) });

  // --- glazing frame: origin on the lip, V leans outward so the head lands on the wall plane
  const V = new THREE.Vector3(0, Math.cos(lean), -Math.sin(lean));
  const gf = new Frame(kit, new THREE.Vector3(0, ySill, zFoot), XAXIS, V);
  gf.box("paintedMetal", wc, 0.03, 0, ww + 0.1, 0.12, 0.14, { color: IMP.black, texel: 1 }); // foot bead
  // panes: one merged mesh on a darker, rougher clone of the glass so the room lights do not paint milky
  // highlights over the view (the exterior pane already adds its own layer of reflection)
  const panes = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i];
    const b = edges[i + 1];
    const g = new THREE.PlaneGeometry(b - a - 0.02, PH - 0.02);
    g.applyQuaternion(gf.q);
    const p = gf.pos((a + b) / 2, PH / 2, 0);
    g.translate(p.x, p.y, p.z);
    panes.push(g);
  }
  const glassMat = ctx.materials.glass.clone();
  glassMat.color.setHex(0x2a3640);
  glassMat.opacity = 0.05;
  glassMat.roughness = 0.5;
  glassMat.specularIntensity = 0.3;
  glassMat.envMapIntensity = 0.08;
  const glassMesh = new THREE.Mesh(mergeGeometries(panes, false), glassMat);
  glassMesh.name = "bridge_glazing";
  glassMesh.castShadow = false;
  glassMesh.receiveShadow = false;
  ctx.add(glassMesh);
  for (const x of mull) {
    // tapered mullion (wider at the foot), steel inlay on the room face, foot and head shoes
    gf.add("paintedMetal", prism([[-0.19, 0], [0.19, 0], [0.12, PH], [-0.12, PH]], 0.34), x, 0, 0.02, { color: IMP.black, uv: "world", texel: 1 });
    gf.box("metal", x, PH / 2, 0.19, 0.1, PH - 0.5, 0.02, { color: IMP.steelDark });
    gf.box("paintedMetal", x, 0.16, 0.05, 0.46, 0.32, 0.24, { color: IMP.black, texel: 1 });
    gf.box("paintedMetal", x, PH - 0.16, 0.06, 0.36, 0.32, 0.26, { color: IMP.black, texel: 1 });
  }
}

// ---------------------------------------------------------------------------------------------------
// Side walls: pilasters, tactical screen arrays, access panels and door signage on top of the panel grid
// ---------------------------------------------------------------------------------------------------
function screenArray(kit, frame, u, v, rects, animated = null) {
  const pw = 1.9;
  const ph = 1.45;
  const gap = 0.12;
  const bez = 0.14;
  const W = 2 * pw + gap + 2 * bez;
  const H = ph + 2 * bez;
  frame.box("paintedMetal", u, v, 0.12, W + 0.1, H + 0.1, 0.16, { color: IMP.black, texel: 1 });
  frame.box("darkGloss", u, v, 0.205, W, H, 0.02);
  for (const s of [-1, 1]) {
    const cu = u + (s * (pw + gap)) / 2;
    if (animated && s === animated.side) {
      animated.pos = frame.pos(cu, v, 0.224);
      animated.quat = frame.q.clone();
      animated.size = [pw, ph];
      continue;
    }
    frame.box("screen", cu, v, 0.22, pw, ph, 0.006, { uv: "keep", uvRect: screenRect(rects[s < 0 ? 0 : 1]) });
  }
  // divider, LED strip below, status lights, wall brackets
  frame.box("paintedMetal", u, v, 0.222, 0.06, ph, 0.01, { color: IMP.black });
  frame.box("darkGloss", u, v - H / 2 - 0.14, 0.1, W - 0.4, 0.2, 0.06);
  frame.box("leds", u, v - H / 2 - 0.14, 0.135, W - 0.7, 0.09, 0.006, { uv: "keep", uvRect: ledRect(rects[2]) });
  frame.box("emitBlue", u - W / 2 + 0.12, v + H / 2 - 0.08, 0.216, 0.07, 0.04, 0.005);
  frame.box("emitRed", u + W / 2 - 0.12, v + H / 2 - 0.08, 0.216, 0.07, 0.04, 0.005);
  for (const s of [-1, 1]) frame.box("paintedMetal", u + s * (W / 2 - 0.35), v, 0.02, 0.24, H - 0.3, 0.06, { color: IMP.darkMetal, texel: 1 });
}

/** Positions/meshes collected during the static build for the animated pass. */
function animState(ctx) {
  return ctx._bridgeAnim || (ctx._bridgeAnim = { screens: [], blinkRed: [], blinkAmber: [] });
}

function buildSideWalls(ctx) {
  const { kit, props } = ctx;
  const anim = animState(ctx);
  // pilasters flank the side doors (z 186..189) and repeat forward / aft every 5 m
  const pilZ = [175.1, 180.1, 185.1, 189.9, 194.9, 199.9];
  const bays = [
    [177.6, [0, 1, 5]],
    [182.6, [4, 3, 9]],
    [192.4, [8, 10, 13]],
    [197.4, [12, 1, 6]],
  ];
  for (const side of ["xmin", "xmax"]) {
    const { frame, length, openings } = ctx.wall(side);
    const uOf = side === "xmin" ? (z) => ctx.inner.z1 - z : (z) => z - ctx.inner.z0;
    for (const z of pilZ) pilaster(frame, uOf(z), ctx.h, 0.34, { depth: 0.24 });
    bays.forEach(([z, rects], i) => {
      const a = i === 0 ? { side: side === "xmin" ? 1 : -1 } : null;
      screenArray(kit, frame, uOf(z), 3.05, rects, a);
      if (a) anim.screens.push(a);
    });
    // door signage + access panels beside the doorway
    const door = openings.find((o) => o.type === "door");
    if (door) {
      const um = (door.u0 + door.u1) / 2;
      frame.box("paintedMetal", um, 3.55, 0.05, 1.3, 0.62, 0.06, { color: IMP.black, texel: 1 });
      frame.decal(um, 3.55, 0.085, 0.56, 0.56, side === "xmin" ? DECAL.TEXT_A : DECAL.TEXT_B);
      frame.box("emitWhiteSoft", um, 3.92, 0.06, 1.1, 0.03, 0.02, { uv: "keep" });
      props.wallPanel(kit, frame, door.u0 - 0.75, 1.35, { w: 0.8, h: 0.7, seed: side === "xmin" ? 5 : 9 });
      props.wallPanel(kit, frame, door.u1 + 0.75, 1.35, { w: 0.8, h: 0.7, screen: false, seed: side === "xmin" ? 6 : 10 });
    }
    // long LED status runs at the top of the lower panel band (behind the ledge railing)
    for (let u = 1.2; u < length - 1.2; u += 5.0) {
      if (door && u > door.u0 - 1.4 && u < door.u1 + 1.4) continue;
      frame.box("darkGloss", u, 1.5, 0.06, 1.5, 0.18, 0.04);
      frame.box("leds", u, 1.5, 0.085, 1.3, 0.1, 0.006, { uv: "keep", uvRect: ledRect(Math.floor(ctx.rand() * 16)) });
    }
    // red alert beacons high on the wall between the screen bays
    for (const z of [187.5, 172.25 + 1.4, ctx.inner.z1 - 1.4]) {
      const p = frame.pos(uOf(z), 6.1, 0.1);
      frame.box("paintedMetal", uOf(z), 6.1, 0.06, 0.26, 0.26, 0.1, { color: IMP.black });
      anim.blinkRed.push([p.x, p.y, p.z]);
    }
  }
}

// ---------------------------------------------------------------------------------------------------
// Aft wall: computer banks flanking the blast door, status boards, the emblem plaque above the door
// ---------------------------------------------------------------------------------------------------
function buildAftWall(ctx) {
  const { kit, props } = ctx;
  const { frame } = ctx.wall("zmax");
  const zw = ctx.inner.z1;
  let seed = 31;
  for (const s of [-1, 1]) {
    for (const x of [4.75, 8.1, 11.35]) {
      props.computerBank(kit, { pos: [s * x, FLOOR, zw - 0.6], yaw: Math.PI, w: 3, h: 2.5, d: 0.6, seed: seed++, accent: s < 0 ? "emitBlue" : "emitRed" });
      // status board above each bank
      const u = ctx.inner.x1 - s * x;
      frame.box("paintedMetal", u, 2.95, 0.05, 2.9, 0.5, 0.08, { color: IMP.black, texel: 1 });
      frame.box("darkGloss", u, 2.95, 0.095, 2.7, 0.36, 0.02);
      frame.box("screen", u - 0.75, 2.95, 0.108, 1.0, 0.3, 0.006, { uv: "keep", uvRect: screenRect([3, 6, 7, 11, 15, 9][(seed + (s < 0 ? 0 : 3)) % 6]) });
      frame.box("leds", u + 0.6, 2.95, 0.108, 1.1, 0.12, 0.006, { uv: "keep", uvRect: ledRect((seed * 3) % 16) });
    }
    // slim light slots between the banks
    for (const x of [6.4, 9.75]) {
      const u = ctx.inner.x1 - s * x;
      frame.box("paintedMetal", u, 1.25, 0.04, 0.16, 2.5, 0.08, { color: IMP.black });
      frame.box("emitWhiteSoft", u, 1.25, 0.085, 0.03, 2.2, 0.01, { uv: "keep" });
    }
  }
  // emblem plaque above the blast door (door lintel tops out at y 213.8)
  const uc = ctx.inner.x1; // x = 0
  frame.box("paintedMetal", uc, 5.05, 0.05, 2.9, 2.5, 0.1, { color: IMP.black, texel: 1 });
  frame.box("plate", uc, 5.05, 0.105, 2.6, 2.2, 0.02, { color: IMP.plateDark, uv: "keep" });
  frame.box("metal", uc, 5.05 + 1.12, 0.11, 2.9, 0.04, 0.03, { color: IMP.steelDark });
  frame.box("metal", uc, 5.05 - 1.12, 0.11, 2.9, 0.04, 0.03, { color: IMP.steelDark });
  frame.decal(uc, 5.05, 0.118, 2.0, 2.0, DECAL.EMBLEM);
  for (const s of [-1, 1]) frame.box("emitRed", uc + s * 1.25, 5.05, 0.11, 0.05, 1.6, 0.01);
  // door approach: hazard chevrons on the deck in front of the blast door
  kit.boxMM("hazardRed", [-2.2, FLOOR + 0.004, zw - 1.2], [2.2, FLOOR + 0.012, zw - 0.9], { texel: 2 });
}

// ---------------------------------------------------------------------------------------------------
// Ceiling: dark panels, a central light trough over the walkway, transverse channels over the pits, conduits
// ---------------------------------------------------------------------------------------------------
function buildCeiling(ctx) {
  const { kit, props } = ctx;
  const { frame, w, d } = ctx.ceilingFrame();
  const rows = [];
  for (let v = 0; v < d - 0.5; v += 2.4) rows.push(+v.toFixed(3));
  rows.push(d);
  panelGrid(frame, w, d, { rows, panelW: 2.5, kick: false, cornice: false, seed: 77, collide: false, styles: { plate: 0.86, vent: 0.1, pipes: 0.04 }, bands: [], tints: [[IMP.plateDark, 0.55], [IMP.trim, 0.3], [IMP.darkMetal, 0.15]], detail: 0 }); // dark plating, not black: the ceiling wash needs albedo to work on
  const U = (x) => x - ctx.inner.x0;
  const Vv = (z) => z - ctx.inner.z0;
  // central trough over the walkway: black housing, two diffuser strips, dark gloss channel between them
  const zc0 = 174.6;
  const zc1 = 204.6;
  const L = zc1 - zc0;
  frame.box("paintedMetal", U(0), Vv((zc0 + zc1) / 2), 0.1, 3.6, L, 0.2, { color: IMP.black, texel: 1 });
  frame.box("darkGloss", U(0), Vv((zc0 + zc1) / 2), 0.205, 1.4, L - 0.4, 0.02);
  for (const s of [-1, 1]) {
    frame.box("metal", U(s * 1.15), Vv((zc0 + zc1) / 2), 0.2, 0.5, L - 0.2, 0.03, { color: IMP.steelDark });
    frame.box("emitWhiteSoft", U(s * 1.15), Vv((zc0 + zc1) / 2), 0.222, 0.32, L - 0.5, 0.01, { uv: "keep" });
  }
  // cross ribs on the trough every 5 m
  for (let z = zc0 + 2.5; z < zc1; z += 5) frame.box("paintedMetal", U(0), Vv(z), 0.2, 3.7, 0.18, 0.16, { color: IMP.darkMetal, texel: 1 });
  // transverse light channels over each pit
  for (const s of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const z = 178.5 + k * 5.6;
      frame.box("paintedMetal", U(s * 8.4), Vv(z), 0.08, 8.2, 0.5, 0.16, { color: IMP.black, texel: 1 });
      frame.box("emitWhiteSoft", U(s * 8.4), Vv(z), 0.165, 7.4, 0.2, 0.01, { uv: "keep" });
    }
    // exposed conduit runs near the side walls, with clamps and junction boxes
    const x = s * 13.05;
    props.pipeRun(kit, { points: [[x, CEIL - 0.34, 173.0], [x, CEIL - 0.34, 205.3]], r: 0.075, color: IMP.steelDark, clamps: 3.2 });
    props.pipeRun(kit, { points: [[x + s * -0.28, CEIL - 0.24, 173.0], [x + s * -0.28, CEIL - 0.24, 205.3]], r: 0.045, color: IMP.gunmetal, clamps: 3.2 });
    for (const z of [184.5, 195.5]) kit.box("paintedMetal", x + s * -0.1, CEIL - 0.3, z, 0.5, 0.34, 0.6, { color: IMP.black, texel: 1 });
    // drops from the conduits down to the screen arrays
    for (const z of [177.6, 197.4]) props.pipeRun(kit, { points: [[x, CEIL - 0.34, z], [x + s * 0.45, CEIL - 0.34, z], [x + s * 0.45, FLOOR + 4.15, z]], r: 0.04, color: IMP.steelDark });
  }
}

// ---------------------------------------------------------------------------------------------------
// Command dais: raised black platform, commander's station, holo projector pedestal
// ---------------------------------------------------------------------------------------------------
function buildDais(ctx) {
  const { kit, props } = ctx;
  const y = FLOOR + DAIS.h;
  kit.boxMM("deckBlack", [-WALK_X, FLOOR, DAIS.z0], [WALK_X, y, DAIS.z1], { color: 0xffffff, texel: 0.5 });
  kit.collider([-WALK_X, FLOOR - 0.3, DAIS.z0], [WALK_X, y, DAIS.z1], "dais");
  // lips + recessed toe lights on both risers, steel side nosings over the pits
  for (const z of [DAIS.z0, DAIS.z1]) {
    kit.boxMM("metal", [-WALK_X, y - 0.02, z - 0.05], [WALK_X, y + 0.02, z + 0.05], { color: IMP.steelDark });
    const zz = z === DAIS.z0 ? z - 0.012 : z + 0.012;
    kit.boxMM("emitWhiteSoft", [-3.4, FLOOR + 0.1, Math.min(z, zz)], [3.4, FLOOR + 0.14, Math.max(z, zz)], { uv: "keep" });
  }
  for (const s of [-1, 1]) kit.boxMM("metal", [Math.min(s * WALK_X - s * 0.05, s * WALK_X + s * 0.07), y - 0.06, DAIS.z0], [Math.max(s * WALK_X - s * 0.05, s * WALK_X + s * 0.07), y + 0.02, DAIS.z1], { color: IMP.steelDark });
  // inlaid emblem on the dais deck
  // toned-down inlay (vertex tint): a white stencil under the dais spot bloomed
  kit.add("decal", new THREE.PlaneGeometry(1.8, 1.8), { pos: [0, y + 0.003, 178.8], rot: [-Math.PI / 2, 0, 0], uv: "keep", uvRect: decalRect(DECAL.EMBLEM), color: 0x5c6068 });
  // commander's station (starboard, facing the glazing) with its seat
  props.consoleStation(kit, { pos: [2.45, y, 177.05], yaw: 0, w: 2.1, d: 0.85, h: 1.0, screens: 3, accent: "emitBlue", seed: 41, screenSet: [1, 0, 4] });
  props.chair(kit, { pos: [2.45, y, 177.75], yaw: 0 });
  // holo projector pedestal (port)
  props.holoTable(kit, { pos: [-2.25, y, 178.0], r: 0.95, h: 0.95, accent: "emitBlue" });
}

// ---------------------------------------------------------------------------------------------------
// Stations: instanced pit consoles + seats (one draw call per material part), a few one-off stations
// ---------------------------------------------------------------------------------------------------
/** Build a prop once into a scratch kit and register one instanced prototype per (material, tint). */
function protoSet(kit, name, buildFn) {
  const scratch = new Kit(kit.materials);
  buildFn(scratch);
  const groups = new Map();
  for (const [mat, geos] of scratch.groups) {
    for (const g of geos) {
      const c = g.attributes.color;
      const col = c ? new THREE.Color(c.getX(0), c.getY(0), c.getZ(0)) : new THREE.Color(1, 1, 1);
      const key = mat + ":" + col.getHexString();
      if (!groups.has(key)) groups.set(key, { mat, col, geos: [] });
      groups.get(key).geos.push(g);
    }
  }
  const parts = [];
  for (const [key, g] of groups) {
    const merged = g.geos.length === 1 ? g.geos[0] : mergeGeometries(g.geos, false);
    const pname = name + "|" + key;
    kit.proto(pname, g.mat, merged, { uv: "keep" });
    parts.push({ pname, col: g.col });
  }
  return {
    place(pos, yaw, tint = null) {
      for (const p of parts) kit.place(p.pname, { pos, rot: [0, yaw, 0], color: tint && p.pname.includes("plate:") ? tint : p.col });
    },
  };
}

/** Bridge pit console (local frame: operator edge at z = 0, body toward −Z, faces −Z). */
function pitConsole(kit, screens) {
  const P = new Placer(kit, [0, 0, 0], 0);
  const w = 1.5;
  const d = 0.85;
  P.box("paintedMetal", 0, 0.06, -d / 2 + 0.05, w - 0.2, 0.12, d - 0.2, { color: IMP.black, texel: 1 });
  P.box("plate", 0, 0.44, -d / 2, w, 0.64, d, { color: IMP.plateDark, uv: "keep" });
  P.box("metal", 0, 0.78, -d / 2, w + 0.04, 0.05, d + 0.04, { color: IMP.steelDark, texel: 1 });
  // sloped work surface rising toward the back
  const tilt = 0.3;
  P.box("darkGloss", 0, 0.86, -d / 2 - 0.02, w - 0.08, 0.05, d * 0.86, { rot: [tilt, 0, 0] });
  P.box("paintedMetal", 0, 0.83, -d / 2 - 0.02, w, 0.04, d * 0.86 + 0.04, { color: IMP.black, rot: [tilt, 0, 0] });
  const q = new THREE.Quaternion().setFromAxisAngle(XAXIS, tilt);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
  const at = (x, along, lift) => new THREE.Vector3(x, 0.86, -d / 2 - 0.02).addScaledVector(fwd, along).addScaledVector(up, 0.026 + lift);
  // two key fields (LED atlas cells) near the operator, a status strip further up the slope
  for (const [sx, cell] of [[-0.29, screens[3]], [0.29, screens[6]]]) {
    const p = at(sx, -d * 0.24, 0.004);
    P.box("leds", p.x, p.y, p.z, 0.5, 0.006, 0.22, { rot: [tilt, 0, 0], uv: "keep", uvRect: ledRect(cell) });
  }
  const p = at(0, d * 0.02, 0.004);
  P.box("leds", p.x, p.y, p.z, w - 0.5, 0.006, 0.08, { rot: [tilt, 0, 0], uv: "keep", uvRect: ledRect(screens[4]) });
  // three screens on a raked riser at the back
  P.box("plate", 0, 1.0, -d + 0.09, w - 0.1, 0.44, 0.16, { color: IMP.plateDark, uv: "keep", rot: [-0.35, 0, 0] });
  P.box("paintedMetal", 0, 1.0, -d + 0.09, w - 0.04, 0.48, 0.1, { color: IMP.black, rot: [-0.35, 0, 0] });
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.46;
    const s = new THREE.Quaternion().setFromAxisAngle(XAXIS, -0.35);
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(s);
    const c = new THREE.Vector3(x, 1.0, -d + 0.09).addScaledVector(n, 0.055);
    P.box("darkGloss", c.x, c.y, c.z, 0.44, 0.36, 0.01, { rot: [-0.35, 0, 0] });
    const c2 = c.clone().addScaledVector(n, 0.008);
    P.box("screen", c2.x, c2.y, c2.z, 0.4, 0.3, 0.004, { rot: [-0.35, 0, 0], uv: "keep", uvRect: screenRect(screens[i]) });
  }
  // riser back: LED matrix visible from the walkway
  P.box("leds", 0, 1.02, -d - 0.005, w - 0.5, 0.1, 0.006, { uv: "keep", uvRect: ledRect(screens[5]) });
  P.box("emitBlue", 0, 0.14, -0.06, w - 0.5, 0.02, 0.01);
  P.box("metal", 0, 0.16, 0.22, w - 0.3, 0.04, 0.04, { color: IMP.steelDark }); // footrest bar
  for (const s of [-1, 1]) P.box("paintedMetal", s * (w / 2 - 0.2), 0.08, 0.22, 0.04, 0.16, 0.04, { color: IMP.black });
}

function buildStations(ctx) {
  const { kit, props } = ctx;
  const consoles = [
    // [screen0, screen1, screen2, keyfield L, status strip, riser back LEDs, keyfield R]
    protoSet(kit, "pitConsoleA", (k) => pitConsole(k, [0, 3, 8, 13, 4, 9, 6])),
    protoSet(kit, "pitConsoleB", (k) => pitConsole(k, [10, 1, 12, 8, 12, 5, 11])),
  ];
  const seat = protoSet(kit, "pitSeat", (k) => props.chair(k, { pos: [0, 0, 0], yaw: 0, collide: false }));
  let n = 0;
  const station = (x, z, yaw, tint) => {
    consoles[n++ % 2].place([x, PIT_Y, z], yaw, tint);
    const P = new Placer(kit, [x, PIT_Y, z], yaw);
    P.collider([-0.75, 0, -0.85], [0.75, 1.2, 0], "console");
    // seat 0.6 m behind the operator edge, facing the console
    const c = new Placer(kit, [x, PIT_Y, z], yaw).world(0, 0, 0.62);
    seat.place([c.x, PIT_Y, c.z], yaw);
    new Placer(kit, [c.x, PIT_Y, c.z], yaw).collider([-0.3, 0, -0.3], [0.3, 1.2, 0.36], "chair");
  };
  const tints = [IMP.plateDark, IMP.plateBlue, IMP.plateDark, IMP.trim];
  for (const s of [-1, 1]) {
    // walkway-side row (operators face the walkway wall): operator edge 1 m off the wall
    const xIn = s * (PIT_X0 + 0.15 + 0.85);
    const yawIn = s < 0 ? -Math.PI / 2 : Math.PI / 2; // local −Z → toward the walkway
    [184.2, 185.9, 189.4, 191.1, 194.6, 196.3].forEach((z, i) => station(xIn, z, yawIn, tints[i % 4]));
    // outer row (operators face the outer wall and the tactical screens above it)
    const xOut = s * (PIT_X1 - 0.15 - 0.85);
    const yawOut = s < 0 ? Math.PI / 2 : -Math.PI / 2;
    [177.6, 179.3, 182.2, 183.9, 186.8, 188.5, 191.4, 193.1, 196.0, 197.7, 200.45].forEach((z, i) => station(xOut, z, yawOut, tints[(i + 1) % 4]));
    // forward-facing sensor stations at the pit's front end (operators look toward the glazing)
    for (const x of [6.7, 9.5]) station(s * x, 178.7, 0, IMP.plateBlue);
  }
  // the forward and aft galleries stay clear: they are the crew's 2 m circulation routes between the ledges,
  // the dais and the blast door
}

// ---------------------------------------------------------------------------------------------------
// Lights: 1 shadow spot over the dais, cool window fill, walkway lights, red/amber pit practicals (8 total)
// ---------------------------------------------------------------------------------------------------
function buildLights(ctx) {
  ctx.spot(0xe4ecff, 120, 18, 0.58, [0, CEIL - 0.5, 179.6], [0, FLOOR + DAIS.h, 178.0], { shadow: true, mapSize: 1024, penumbra: 0.55 });
  ctx.light(0xa9c6ff, 62, 24, [0, CEIL - 1.4, 176.8]); // cool fill over the dais / glazing side
  // walkway fills hang below the trough so they also reach the pit console rows
  ctx.light(0xdfe8ff, 60, 22, [0, CEIL - 2.4, 190.5]);
  ctx.light(0xdfe8ff, 55, 20, [0, CEIL - 2.0, 203.2]);
  // pit practicals hang low over the console rows so they light desks and pit walls, not the ceiling
  for (const s of [-1, 1]) {
    ctx.light(0xff6a55, 24, 10, [s * 8.0, PIT_Y + 1.9, 182.5]);
    ctx.light(0xffb868, 20, 10, [s * 8.0, PIT_Y + 1.9, 195.5]);
  }
}

// ---------------------------------------------------------------------------------------------------
// Animated elements: tactical hologram, page-cycling wall screens, blinking indicator groups
// ---------------------------------------------------------------------------------------------------
function setRect(geo, [u0, v0, u1, v1]) {
  const uv = geo.attributes.uv;
  const base = geo.userData.baseUV || (geo.userData.baseUV = uv.array.slice());
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + base[i * 2] * (u1 - u0), v0 + base[i * 2 + 1] * (v1 - v0));
  uv.needsUpdate = true;
}

function wedgeGeometry() {
  // schematic Star Destroyer: dagger hull, dorsal terrace, bridge tower — low-poly on purpose (wireframe)
  const hull = prism([[0, -1.0], [0.52, 0.72], [0.34, 0.6], [-0.34, 0.6], [-0.52, 0.72]], 0.1);
  hull.rotateX(Math.PI / 2);
  const terrace = prism([[0, -0.35], [0.26, 0.62], [-0.26, 0.62]], 0.08);
  terrace.rotateX(Math.PI / 2);
  terrace.translate(0, 0.09, 0);
  const tower = new THREE.BoxGeometry(0.22, 0.1, 0.1).toNonIndexed();
  tower.translate(0, 0.18, 0.45);
  const planet = new THREE.IcosahedronGeometry(0.28, 1);
  planet.translate(-0.95, 0.12, 0.1);
  const ring = new THREE.TorusGeometry(0.42, 0.006, 4, 40).toNonIndexed();
  ring.rotateX(Math.PI / 2 - 0.3);
  ring.translate(-0.95, 0.12, 0.1);
  for (const g of [hull, terrace, tower, planet, ring]) {
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
  }
  return mergeGeometries([hull, terrace, tower, planet, ring], false);
}

/**
 * Opacity setter that works for both hologram material flavours: the plain additive MeshBasicMaterial and the
 * atmosphere system's ShaderMaterial (which reads `uniforms.opacity`, synced from `.opacity` only on the shared
 * instance, never on clones).
 */
function setHoloOpacity(m, v) {
  m.opacity = v;
  if (m.uniforms && m.uniforms.opacity) m.uniforms.opacity.value = v;
}

function buildAnimated(ctx) {
  const M = ctx.materials;
  const anim = animState(ctx);
  // --- hologram over the dais projector
  const wire = M.holo.clone();
  const shaderHolo = !!wire.uniforms; // the shader flavour modulates alpha itself (scanlines, rim), so it runs hotter
  const wireBase = shaderHolo ? 0.78 : 0.4;
  const beamBase = shaderHolo ? 0.12 : 0.03;
  wire.wireframe = true;
  setHoloOpacity(wire, wireBase + 0.1);
  const holo = new THREE.Mesh(wedgeGeometry(), wire);
  const baseY = FLOOR + DAIS.h + 0.95 + 0.8;
  holo.position.set(-2.25, baseY, 178.0);
  holo.scale.setScalar(0.9);
  ctx.add(holo);
  const beamMat = M.holo.clone();
  setHoloOpacity(beamMat, beamBase);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.14, 1.6, 28, 1, true), beamMat);
  beam.position.set(-2.25, FLOOR + DAIS.h + 0.95 + 0.8, 178.0);
  ctx.add(beam);
  // --- page-cycling tactical screens (one per side wall, shared material clone)
  const screenMat = M.screen.clone();
  const pages = [0, 1, 4, 8, 10, 12, 3];
  const screens = anim.screens.map((a, i) => {
    const geo = new THREE.PlaneGeometry(a.size[0], a.size[1]);
    setRect(geo, screenRect(pages[i % pages.length]));
    const m = new THREE.Mesh(geo, screenMat);
    m.position.copy(a.pos);
    m.quaternion.copy(a.quat);
    ctx.add(m);
    return { mesh: m, page: i, next: 3.5 + i * 1.7, blank: 0 };
  });
  // --- blinking indicator groups (one merged mesh per colour)
  const blinkMesh = (positions, size, mat) => {
    if (!positions.length) return null;
    const geos = positions.map(([x, y, z]) => new THREE.BoxGeometry(size, size, size).translate(x, y, z));
    const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
    ctx.add(mesh);
    return mesh;
  };
  const red = M.emitRed.clone();
  const amber = M.emitAmber.clone();
  // amber: on the outer pit-wall work-light housings and the conduit junction boxes
  const amberPos = [...anim.blinkAmber];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++) amberPos.push([s * (PIT_X1 - 0.16), FLOOR - 0.15, PIT_Z0 + 2.2 + k * 4.3 + 0.18]);
    amberPos.push([s * 12.95, CEIL - 0.48, 184.5], [s * 12.95, CEIL - 0.48, 195.5]);
  }
  blinkMesh(anim.blinkRed, 0.07, red);
  blinkMesh(amberPos, 0.06, amber);
  const redBase = M.emitRed.emissiveIntensity;
  const amberBase = M.emitAmber.emissiveIntensity;
  const screenBase = M.screen.emissiveIntensity;

  ctx.animate((dt, t) => {
    holo.rotation.y = t * 0.35;
    holo.position.y = baseY + Math.sin(t * 1.1) * 0.03;
    setHoloOpacity(wire, wireBase + 0.08 * Math.sin(t * 17.0) + 0.06 * Math.sin(t * 3.1));
    setHoloOpacity(beamMat, beamBase * (1 + 0.3 * Math.sin(t * 5.3)));
    for (const m of [wire, beamMat]) if (m.uniforms && m.uniforms.time) m.uniforms.time.value = t;
    red.emissiveIntensity = redBase * (0.12 + 0.88 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.6), 3));
    amber.emissiveIntensity = amberBase * (Math.sin(t * 7.0) > 0.2 ? 1 : 0.08);
    for (const s of screens) {
      s.next -= dt;
      if (s.blank > 0) {
        s.blank -= dt;
        if (s.blank <= 0) {
          s.page = (s.page + 1) % pages.length;
          setRect(s.mesh.geometry, screenRect(pages[s.page]));
        }
      } else if (s.next <= 0) {
        s.next = 4.5 + Math.random() * 2;
        s.blank = 0.14;
      }
    }
    screenMat.emissiveIntensity = screenBase * (screens.some((s) => s.blank > 0) ? 0.25 : 0.93 + 0.07 * Math.sin(t * 9.0));
  });
}
