// Main Bridge (deck 1): the command deck of the Star Destroyer. A raised central walkway runs from the
// aft blast door to a wall of tall canted windows; two sunken crew pits flank it, lined with tall
// operator stations; equipment bays, tactical displays and a navigation cluster occupy the side
// floors; the commander's holo platform sits at the aft end just inside the door. Dark structural
// ceiling with a lit spine beam. Deck-local metres, floor y = 0 (the sector's y -2 only exists for
// the pits).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE } from "../../materials.js";
import { impWall, impCeiling, impConsole, equipmentRack, pit, platform, railing, pipeRun, hologram, wallSegment } from "../imperial.js";
import { pointLight, wallFrame, X_AXIS } from "../builders.js";
import { rng } from "../../kit.js";
import { decalRect } from "../../textures.js";

const X0 = -24;
const X1 = 24;
const Z0 = -49; // window wall plane (world z 591; the exterior window strip sits at z 590)
const Z1 = -15; // aft wall (blast door at x 0)
const H = 8;
const GLASS_X = 22.5; // glass spans x ±22.5: 15 panes of 3 m, a pane (not a mullion) on the centreline
const PANES = 15;
const PANE_W = 3;
const WIN_Y0 = 1.5;
const WIN_Y1 = 6.5;
const SILL_D = 1.0; // the glass foot sits 1 m inside the wall plane; the panes lean out to the plane at the top
const PIT = { x0: 3, x1: 11, z0: -42, z1: -18, depth: 1.8 };
const STAIR_Z = -23.6; // pit stairs (walkway side, just forward of the command platform)
const STAIR_W = 1.6;
const CMD = { z0: -22.4, z1: -17.6, hz: -19.6, y: 0.3 }; // command platform + holo dais centre
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const BLACK = { color: PALETTE.impBlack, texel: 2 };
const DARK = { color: PALETTE.impDark, texel: 1.5 };

export function buildBridge(kit, ctx) {
  const B = [
    [X0, 0, Z0],
    [X1, H, Z1],
  ];
  const mats = ensureMaterials(ctx);
  buildFloor(kit);
  buildWalls(kit, ctx, B);
  buildWindowWall(kit, ctx);
  buildCeiling(kit, ctx, B);
  for (const s of [-1, 1]) buildPit(kit, ctx, s);
  buildWalkway(kit);
  buildCommand(kit, ctx, mats);
  buildForward(kit, ctx);
  for (const s of [-1, 1]) buildSideBay(kit, ctx, s, B, mats);
  buildAftWall(kit, ctx, B);
  buildLights(ctx);
  ctx.anim((dt, t) => {
    mats.pulse.emissiveIntensity = 1.25 + 0.3 * Math.sin(t * 1.7) + 0.08 * Math.sin(t * 7.3);
    mats.alert.emissiveIntensity = 0.25 + 0.22 * (0.5 + 0.5 * Math.sin(t * 0.9));
  });
  ctx.audioZone({ kind: "bridge", center: [0, 2, -32], radius: 26 });
}

// ---------------------------------------------------------------------------
// Materials (created once, shared through ctx.materials with the brg_ prefix)
// ---------------------------------------------------------------------------
function ensureMaterials(ctx) {
  const m = ctx.materials;
  if (!m.brg_pulse) {
    m.brg_pulse = m.impScreen0.clone();
    m.brg_pulse.name = "brg_pulse";
    m.brg_alert = new THREE.MeshStandardMaterial({ color: 0x1a0505, emissive: new THREE.Color("#ff2a1a"), emissiveIntensity: 0.35, roughness: 0.45, metalness: 0 });
    m.brg_sweep = m.holo.clone();
    m.brg_sweep.opacity = 0.85;
    m.brg_sweep.color = new THREE.Color("#8ec5ff");
    m.brg_cone = m.holo.clone();
    m.brg_cone.opacity = 0.13;
    // brighter, untextured additive blue for the ship projection so it reads from the aft door
    m.brg_holoBright = m.holo.clone();
    m.brg_holoBright.map = null;
    m.brg_holoBright.color = new THREE.Color("#78bcff");
    m.brg_holoBright.opacity = 0.7;
    // unlit near-black for the window reveal (see buildWindowWall)
    m.brg_void = new THREE.MeshBasicMaterial({ color: 0x05060a });
    // bridgeGlass with the diffuse tint taken out: the shared material's light body colour picks up the
    // (leaked) sun and the room lights and lays a grey veil over everything seen through the panes
    m.brg_glass = m.bridgeGlass.clone();
    m.brg_glass.name = "brg_glass";
    m.brg_glass.color.set(0x0c0f13);
  }
  return { pulse: m.brg_pulse, alert: m.brg_alert, sweep: m.brg_sweep, cone: m.brg_cone, bright: m.brg_holoBright };
}

// ---------------------------------------------------------------------------
// Floor: black gloss deck in pieces around the two pit openings, dark gutters along the walls
// ---------------------------------------------------------------------------
function buildFloor(kit) {
  const pad = 0.4;
  const F = (x0, z0, x1, z1) => kit.boxMM("floorGloss", [x0, -0.12, z0], [x1, 0, z1], { texel: 0.33 });
  F(-PIT.x0, Z0 - pad, PIT.x0, Z1 + pad); // walkway, full length
  for (const s of [-1, 1]) {
    const xa = Math.min(s * PIT.x0, s * PIT.x1);
    const xb = Math.max(s * PIT.x0, s * PIT.x1);
    F(xa, Z0 - pad, xb, PIT.z0); // forward apron
    F(xa, PIT.z1, xb, Z1 + pad); // aft strip
    if (s > 0) F(PIT.x1, Z0 - pad, X1 + pad, Z1 + pad);
    else F(X0 - pad, Z0 - pad, -PIT.x1, Z1 + pad);
  }
  const g = 0.18;
  for (const [x0, z0, x1, z1] of [
    [X0, Z1 - g, X1, Z1],
    [X0, Z0, X0 + g, Z1],
    [X1 - g, Z0, X1, Z1],
  ]) {
    kit.boxMM("paintedMetal", [x0, 0, z0], [x1, 0.015, z1], BLACK);
  }
}

// ---------------------------------------------------------------------------
// Walls: aft wall with the blast door and the two long side walls, each split into an
// equipment-dense lower zone and a calm, darker upper zone with a waist rail between them
// ---------------------------------------------------------------------------
function buildWalls(kit, ctx, B) {
  const SPLIT = 4.4;
  const lowB = [
    [X0, 0, Z0],
    [X1, SPLIT, Z1],
  ];
  const upB = [
    [X0, SPLIT, Z0],
    [X1, H, Z1],
  ];
  const lowPaints = [
    [PALETTE.impGrey, 0.36],
    [PALETTE.impMid, 0.34],
    [PALETTE.impLight, 0.12],
    [PALETTE.impDark, 0.18],
  ];
  const upPaints = [
    [PALETTE.impMid, 0.5],
    [PALETTE.impGrey, 0.28],
    [PALETTE.impDark, 0.22],
  ];
  const lowStyles = { panel: 0.56, vent: 0.1, greeble: 0.06, strip: 0.1, screen: 0.06, conduit: 0.12 };
  const upStyles = { panel: 0.8, vent: 0.08, strip: 0.06, conduit: 0.06 };
  const lowRows = [0, 0.5, 1.7, 2.9, SPLIT];
  const upRows = [0, 1.8, 3.0, H - SPLIT];
  let i = 0;
  for (const side of ["zmax", "xmin", "xmax"]) {
    impWall(kit, ctx, side, { bounds: lowB, rows: lowRows, paints: lowPaints, styles: lowStyles, seed: ctx.seed + 11 + i * 13, panelW: 1.3 });
    impWall(kit, ctx, side, { bounds: upB, rows: upRows, paints: upPaints, styles: upStyles, seed: ctx.seed + 17 + i * 13, panelW: 2.6, kick: false, trim: false, noDoors: true, cove: true });
    // dark waist rail where the two wall zones meet, with a hairline light underneath
    const seg = wallSegment(B, side);
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    frame.box("paintedMetal", length / 2, SPLIT, 0.06, length, 0.22, 0.12, BLACK);
    frame.box("emitWhiteSoft", length / 2, SPLIT - 0.12, 0.09, length - 0.6, 0.02, 0.06, { uv: "keep" });
    i++;
  }
}

// ---------------------------------------------------------------------------
// Window wall: deep instrument sill, 15 canted panes between thick mullions, heavy header, dark
// corner towers, and a black reveal tube through the hull so oblique views never leak past the frame.
// ---------------------------------------------------------------------------
function buildWindowWall(kit, ctx) {
  const zFoot = Z0 + SILL_D; // -48: glass foot on the sill
  const lean = Math.atan2(SILL_D, WIN_Y1 - WIN_Y0);
  const paneLen = Math.hypot(SILL_D, WIN_Y1 - WIN_Y0);
  const yMid = (WIN_Y0 + WIN_Y1) / 2;
  const zMid = (Z0 + zFoot) / 2;
  const tilt = new THREE.Quaternion().setFromAxisAngle(X_AXIS, -lean); // top of the pane leans to -Z
  const nIn = new THREE.Vector3(0, 0, 1).applyQuaternion(tilt); // pane normal pointing into the room
  const paneX = (k) => -GLASS_X + PANE_W / 2 + PANE_W * k;

  // --- sill: dark base, metal ledge, floor light channel, one angled instrument bay per pane
  kit.boxMM("paintedMetal", [X0, 0, Z0 - 0.16], [X1, WIN_Y0, zFoot], DARK);
  kit.boxMM("metal", [X0, WIN_Y0 - 0.04, Z0 - 0.16], [X1, WIN_Y0 + 0.04, zFoot + 0.12], { color: PALETTE.impMid, texel: 1 });
  kit.boxMM("rubber", [X0, 0, zFoot], [X1, 0.14, zFoot + 0.03], { color: PALETTE.rubber });
  kit.boxMM("paintedMetal", [-GLASS_X, 0, zFoot + 0.03], [GLASS_X, 0.02, zFoot + 0.2], BLACK);
  kit.boxMM("emitWhiteSoft", [-GLASS_X + 0.3, 0.02, zFoot + 0.07], [GLASS_X - 0.3, 0.035, zFoot + 0.13], { uv: "keep" });
  const rand = rng(ctx.seed + 77);
  for (let k = 0; k < PANES; k++) {
    const xc = paneX(k);
    // black instrument console under each pane: dark panel, bezelled readout slab tilted up toward
    // whoever stands at the glass, button block, leds, stencil, status lamp
    kit.box("impPanel1", xc, 0.85, zFoot + 0.008, 2.6, 1.14, 0.016, { color: PALETTE.impDark, uv: "keep" });
    kit.box("paintedMetal", xc, 0.85, zFoot + 0.012, 2.4, 1.0, 0.012, BLACK);
    const scr = k % 3 === 1 ? "brg_pulse" : "impScreen" + [2, 2, 0, 1][k % 4];
    kit.add("darkGloss", new THREE.BoxGeometry(1.5, 0.4, 0.04), { pos: [xc, 1.14, zFoot + 0.06], rot: [-0.55, 0, 0] });
    const sg = new THREE.PlaneGeometry(1.4, 0.32);
    sg.rotateX(-0.55);
    kit.add(scr, sg, { pos: [xc, 1.14 + 0.022 * Math.sin(0.55), zFoot + 0.06 + 0.022 * Math.cos(0.55)], uv: "keep" });
    kit.box("paintedMetal", xc, 0.62, zFoot + 0.03, 1.6, 0.16, 0.05, { color: PALETTE.impDark, texel: 2 });
    for (let b = 0; b < 12; b++) {
      const lit = rand() < 0.45;
      kit.box(lit ? (rand() < 0.6 ? "emitBlue" : rand() < 0.5 ? "emitAmber" : "emitRed") : "rubber", xc - 0.7 + b * 0.125, 0.62, zFoot + 0.06, 0.07, 0.05, 0.02, { color: PALETTE.rubber });
    }
    kit.box("leds", xc + 0.6, 0.4, zFoot + 0.03, 0.9, 0.04, 0.012, { uv: "keep" });
    kit.add("decal", new THREE.PlaneGeometry(0.28, 0.28), { pos: [xc - 0.95, 0.4, zFoot + 0.012], uv: "keep", uvRect: decalRect([9, 6, 14, 0][k % 4]) });
    kit.box(k % 5 === 2 ? "emitAmber" : "emitBlue", xc - 1.15, 1.2, zFoot + 0.012, 0.05, 0.2, 0.012);
  }

  // --- header: heavy dark beam with segmented downlights and a bevelled fascia
  kit.boxMM("paintedMetal", [X0, WIN_Y1, Z0 - 0.16], [X1, H, Z0 + 0.7], DARK);
  kit.boxMM("paintedMetal", [X0, WIN_Y1 - 0.08, Z0 + 0.6], [X1, WIN_Y1 + 0.35, Z0 + 0.9], { color: PALETTE.impBlack, texel: 1.5 });
  for (let k = 0; k < PANES; k++) {
    const xc = paneX(k);
    kit.box("impPanel", xc, WIN_Y1 + 0.95, Z0 + 0.71, 2.6, 0.9, 0.02, { color: PALETTE.impMid, uv: "keep" });
    kit.box("emitWhiteSoft", xc, WIN_Y1 + 0.34, Z0 + 0.905, 2.2, 0.03, 0.14, { uv: "keep" });
    if (k % 2 === 0) kit.box("paintedMetal", xc, WIN_Y1 + 1.2, Z0 + 0.76, 0.5, 0.25, 0.1, BLACK);
  }

  // --- mullions (aligned with the exterior ones at x = -22.5 + 3k), bottom and top rails
  for (let k = 0; k <= PANES; k++) {
    const x = -GLASS_X + PANE_W * k;
    const c = new THREE.Vector3(x, yMid, zMid);
    const pin = c.clone().addScaledVector(nIn, 0.19);
    kit.add("paintedMetal", new THREE.BoxGeometry(0.3, paneLen + 0.25, 0.36), { pos: [c.x, c.y, c.z], quat: tilt, color: PALETTE.impBlack, texel: 1.5 });
    kit.add("metal", new THREE.BoxGeometry(0.14, paneLen + 0.1, 0.03), { pos: [pin.x, pin.y, pin.z], quat: tilt, color: PALETTE.impMid });
  }
  const rail = (y, z, sy, sz, color) => kit.boxMM("paintedMetal", [-GLASS_X - 0.15, y - sy / 2, z - sz / 2], [GLASS_X + 0.15, y + sy / 2, z + sz / 2], { color, texel: 1.5 });
  rail(WIN_Y0 + 0.05, zFoot - 0.02, 0.22, 0.4, PALETTE.impBlack);
  rail(WIN_Y1 - 0.02, Z0 + 0.1, 0.2, 0.5, PALETTE.impBlack);

  // --- corner towers at x ±(22.5..24): dark, with an inset panel, a vertical light slot and an alert lamp
  for (const s of [-1, 1]) {
    const xa = s > 0 ? GLASS_X : X0;
    const xb = s > 0 ? X1 : -GLASS_X;
    const xc = s * (GLASS_X + (X1 - GLASS_X) / 2);
    kit.boxMM("paintedMetal", [xa, 0, Z0 - 0.16], [xb, H, Z0 + 0.75], DARK);
    kit.boxMM("impPanel", [xa + 0.15, 0.3, Z0 + 0.75], [xb - 0.15, H - 0.3, Z0 + 0.77], { color: PALETTE.impMid, uv: "keep" });
    kit.boxMM("emitWhite", [xc - 0.03, 1.8, Z0 + 0.77], [xc + 0.03, 6.2, Z0 + 0.79], {});
    kit.box("paintedMetal", xc, 7.0, Z0 + 0.76, 0.4, 0.2, 0.02, BLACK);
    kit.box("brg_alert", xc, 7.0, Z0 + 0.775, 0.3, 0.12, 0.02, {});
  }

  // --- glass: one merged transparent mesh (no shadow casting)
  const panes = [];
  for (let k = 0; k < PANES; k++) {
    const g = new THREE.PlaneGeometry(PANE_W - 0.3, paneLen);
    g.applyQuaternion(tilt);
    g.translate(paneX(k), yMid, zMid);
    panes.push(g);
  }
  const glass = new THREE.Mesh(mergeGeometries(panes, false), ctx.materials.brg_glass);
  glass.castShadow = false;
  glass.receiveShadow = false;
  glass.name = "bridge_glass";
  ctx.mesh(glass);

  // --- reveal tube through the hull (z -50..-49.14), seen through the glass at oblique angles. Unlit
  // black: the exterior sun's shadow map cannot resolve the tower's front edge and leaks ~1.5 m into the
  // room, so a lit material here would render as sunlit grey instead of a dark recess.
  const zA = Z0 - 1.0;
  const zB = Z0 - 0.14;
  kit.boxMM("brg_void", [-27, WIN_Y1 - 0.02, zA], [27, H + 0.5, zB], {});
  kit.boxMM("brg_void", [-27, -0.5, zA], [27, WIN_Y0 + 0.02, zB], {});
  for (const s of [-1, 1]) kit.boxMM("brg_void", [Math.min(s * (GLASS_X - 0.05), s * 27), WIN_Y0, zA], [Math.max(s * (GLASS_X - 0.05), s * 27), WIN_Y1, zB], {});
  // deep frame fins in the reveal, one per mullion: the exterior mullions (x = -22.5 + 3k, 0.5 wide)
  // continue into these, so from inside each mullion reads as one deep structural frame
  for (let k = 1; k < PANES; k++) {
    const x = -GLASS_X + PANE_W * k;
    kit.boxMM("brg_void", [x - 0.25, WIN_Y0, zA], [x + 0.25, WIN_Y1, zB], {});
  }

  // collider: nothing walks into the sill / glass
  kit.collider([X0, 0, Z0 - 0.2], [X1, H, zFoot + 0.2], "windowwall");
}

// ---------------------------------------------------------------------------
// Ceiling: dark panelled grid, transverse ribs, a lowered spine beam over the walkway with white
// strips, blue troughs over the pits, alert lamp housings and conduits over the side floors
// ---------------------------------------------------------------------------
function buildCeiling(kit, ctx, B) {
  impCeiling(kit, ctx, {
    bounds: B,
    lights: false,
    along: "z",
    spacing: 100,
    rowH: 1.7,
    panelW: 1.7,
    paints: [
      [PALETTE.impMid, 0.5],
      [PALETTE.impDark, 0.32],
      [PALETTE.impGrey, 0.18],
    ],
    styles: { panel: 0.72, greeble: 0.13, vent: 0.15 },
  });
  const dark = { color: PALETTE.impDark, texel: 1.2 };
  // transverse ribs with a hairline light on the underside
  for (const z of [-45.5, -39.5, -33.5, -27.5, -21.5]) {
    kit.boxMM("paintedMetal", [X0, H - 0.6, z - 0.32], [X1, H, z + 0.32], dark);
    kit.boxMM("paintedMetal", [X0, H - 0.66, z - 0.12], [X1, H - 0.6, z + 0.12], BLACK);
    kit.boxMM("emitWhite", [-23.4, H - 0.67, z - 0.02], [23.4, H - 0.66, z + 0.02], {});
    // alert lamp housings at the rib ends and over the pit outer edges
    for (const x of [-22.6, -12.2, 12.2, 22.6]) {
      kit.box("paintedMetal", x, H - 0.78, z, 0.42, 0.24, 0.3, BLACK);
      kit.box("brg_alert", x, H - 0.905, z, 0.3, 0.02, 0.16, {});
    }
  }
  // spine beam over the walkway
  const bx = 2.1;
  const by = H - 0.85;
  kit.boxMM("paintedMetal", [-bx, by, Z0 + 0.9], [bx, H, Z1 - 0.2], dark);
  for (const s of [-1, 1]) kit.boxMM("paintedMetal", [Math.min(s * bx, s * (bx + 0.3)), by + 0.3, Z0 + 0.9], [Math.max(s * bx, s * (bx + 0.3)), H, Z1 - 0.2], { color: PALETTE.impMid, texel: 1.2 });
  kit.boxMM("paintedMetal", [-bx + 0.1, by - 0.05, Z0 + 0.9], [bx - 0.1, by, Z1 - 0.2], BLACK);
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [s * 1.25 - 0.22, by - 0.08, Z0 + 1.0], [s * 1.25 + 0.22, by - 0.05, Z1 - 0.4], BLACK);
    for (let z = Z0 + 1.3; z < Z1 - 1.5; z += 3) {
      kit.boxMM("emitWhiteSoft", [s * 1.25 - 0.08, by - 0.075, z], [s * 1.25 + 0.08, by - 0.055, z + 2.5], { uv: "keep" });
    }
  }
  for (let z = Z0 + 3.7; z < Z1 - 1; z += 6) kit.boxMM("paintedMetal", [-bx - 0.32, by - 0.12, z - 0.15], [bx + 0.32, by + 0.1, z + 0.15], BLACK);
  // blue troughs over the pits (segmented bars)
  for (const s of [-1, 1]) {
    for (const xo of [5.0, 9.0]) {
      const x = s * xo;
      kit.boxMM("paintedMetal", [x - 0.32, H - 0.2, PIT.z0 + 0.4], [x + 0.32, H, PIT.z1 - 0.4], BLACK);
      for (let z = PIT.z0 + 0.7; z < PIT.z1 - 1.5; z += 2.4) kit.boxMM("emitBlue", [x - 0.1, H - 0.19, z], [x + 0.1, H - 0.17, z + 1.8], {});
    }
  }
  // conduits over the side floors with junction boxes
  for (const s of [-1, 1]) {
    pipeRun(kit, [[s * 16.4, H - 0.22, Z0 + 1.2], [s * 16.4, H - 0.22, Z1 - 0.6]], 0.09, PALETTE.impMid);
    pipeRun(kit, [[s * 16.8, H - 0.16, Z0 + 1.2], [s * 16.8, H - 0.16, Z1 - 0.6]], 0.05, PALETTE.impDark);
    pipeRun(kit, [[s * 15.9, H - 0.16, Z0 + 1.2], [s * 15.9, H - 0.16, Z1 - 0.6]], 0.05, PALETTE.impGrey);
    for (let z = Z0 + 4; z < Z1 - 2; z += 8) {
      kit.box("paintedMetal", s * 16.4, H - 0.22, z, 1.3, 0.34, 0.5, BLACK);
      kit.box("emitAmber", s * 16.4, H - 0.4, z + 0.1, 0.4, 0.02, 0.06, {});
    }
  }
}

// ---------------------------------------------------------------------------
// Crew pits: sunken floor, two rows of tall stations (outer row facing the hull, inner row facing
// the walkway wall), cabinets for variation, aisle grating, railings with a gap at the stairs
// ---------------------------------------------------------------------------
function buildPit(kit, ctx, s) {
  const x0 = Math.min(s * PIT.x0, s * PIT.x1);
  const x1 = Math.max(s * PIT.x0, s * PIT.x1);
  const stairSide = s > 0 ? "xmin" : "xmax";
  pit(kit, ctx, { x0, z0: PIT.z0, x1, z1: PIT.z1, depth: PIT.depth, stairs: { side: stairSide, u: STAIR_Z, w: STAIR_W }, seed: ctx.seed + (s > 0 ? 3 : 5) });
  const y = -PIT.depth;
  const yawOut = s > 0 ? -Math.PI / 2 : Math.PI / 2; // operator faces the hull side
  const yawIn = -yawOut; // operator faces the walkway wall
  const rand = rng(ctx.seed + 100 + s * 7);
  const screenSets = [[0, 1], [1, 2], [0, 2], [2, 0], [0, 0], [1, 0]];
  const row = (x, yaw, zEnd, offset) => {
    let z = PIT.z0 + 1.35;
    let i = offset;
    while (z < zEnd) {
      const w = i % 2 ? 2.2 : 1.8;
      if (z + w / 2 > zEnd) break;
      if (i % 5 === 3) pitCabinet(kit, x + (s > 0 ? 0.1 : -0.1) * (yaw === yawOut ? 1 : -1), z + w / 2, y, yaw, 1.3, ctx.seed + i * 13 + s);
      else {
        const pulse = rand() < 0.3;
        impConsole(kit, ctx, { x, z: z + w / 2, y, yaw, w, tall: true, screens: screenSets[i % screenSets.length], chair: true, seed: ctx.seed + i * 7 + s * 3, lampMat: i % 4 === 2 ? "emitAmber" : "emitBlue" });
        if (pulse) {
          // an extra pulsing status strip on the riser (cloned screen material animated by the room)
          const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
          const p = new THREE.Vector3(0, 1.74, -0.4 + 0.13).applyQuaternion(q).add(new THREE.Vector3(x, y, z + w / 2));
          kit.add("brg_pulse", new THREE.PlaneGeometry(w - 0.4, 0.1), { pos: [p.x, p.y, p.z], quat: q, uv: "keep" });
        }
      }
      z += w + 0.5;
      i++;
    }
  };
  row(s * (PIT.x1 - 0.55), yawOut, PIT.z1 - 0.9, 0);
  row(s * (PIT.x0 + 0.55), yawIn, STAIR_Z - STAIR_W / 2 - 0.4, 2);
  // aisle: grating strip, cable trunk covers, two floor-level marker lights
  const ax = s * 7;
  const grate = new THREE.PlaneGeometry(1.1, PIT.z1 - PIT.z0 - 2);
  grate.rotateX(-Math.PI / 2);
  kit.add("grate", grate, { pos: [ax, y + 0.006, (PIT.z0 + PIT.z1) / 2], uv: "scale", uvScale: [1.1 / 1.24, (PIT.z1 - PIT.z0 - 2) / 0.9] });
  for (const z of [-38, -30, -22]) kit.boxMM("paintedMetal", [x0 + 0.2, y, z - 0.12], [x1 - 0.2, y + 0.05, z + 0.12], BLACK);
  for (const z of [PIT.z0 + 0.6, PIT.z1 - 0.6]) kit.box("emitBlue", ax, y + 0.02, z, 0.6, 0.02, 0.06, {});
  // pit wall accents: a continuous blue light seam along the top of both long walls
  for (const xw of [x0, x1]) {
    const inner = xw === x0 ? 1 : -1;
    kit.boxMM("emitBlue", [xw + (inner > 0 ? 0.0 : -0.04), -0.32, PIT.z0 + 0.3], [xw + (inner > 0 ? 0.04 : 0.0), -0.28, PIT.z1 - 0.3], {});
  }
  // railings (walkway side split around the stairs)
  const xw = s * (PIT.x0 - 0.13);
  const xo = s * (PIT.x1 + 0.13);
  railing(kit, xw, PIT.z0 - 0.1, xw, STAIR_Z - STAIR_W / 2 - 0.15);
  railing(kit, xw, STAIR_Z + STAIR_W / 2 + 0.15, xw, PIT.z1 + 0.1);
  railing(kit, xo, PIT.z0 - 0.1, xo, PIT.z1 + 0.1);
  railing(kit, x0 - 0.1, PIT.z0 - 0.13, x1 + 0.1, PIT.z0 - 0.13);
  railing(kit, x0 - 0.1, PIT.z1 + 0.13, x1 + 0.1, PIT.z1 + 0.13);
  // caution stencil on the deck at the stair head
  const dg = new THREE.PlaneGeometry(0.5, 0.5);
  dg.rotateX(-Math.PI / 2);
  kit.add("decal", dg, { pos: [s * (PIT.x0 - 0.7), 0.004, STAIR_Z], uv: "keep", uvRect: decalRect(1) });
}

/** Free-standing dark equipment cabinet with lit slots (breaks up the console rows). */
function pitCabinet(kit, x, z, y, yaw, w, seed) {
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = local(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const h = 1.75;
  const d = 0.62;
  const rand = rng(seed);
  add("paintedMetal", new THREE.BoxGeometry(w, h, d), 0, h / 2, 0, DARK);
  add("impPanel", new THREE.BoxGeometry(w - 0.1, h - 0.1, 0.012), 0, h / 2, d / 2 + 0.006, { color: PALETTE.impMid, uv: "keep" });
  add("hazard", new THREE.BoxGeometry(w, 0.05, d), 0, 0.025, 0, { texel: 3 });
  let yy = 0.2;
  while (yy < h - 0.25) {
    const sh = 0.12 + rand() * 0.22;
    add("metal", new THREE.BoxGeometry(w - 0.24, sh - 0.03, 0.03), 0, yy + sh / 2, d / 2 + 0.02, { color: rand() < 0.5 ? PALETTE.impBlack : PALETTE.impMid, texel: 2 });
    const nl = 1 + Math.floor(rand() * 4);
    for (let i = 0; i < nl; i++) add(rand() < 0.2 ? "emitRed" : "emitBlue", new THREE.BoxGeometry(0.03, 0.02, 0.008), -w / 2 + 0.2 + i * 0.09, yy + sh / 2, d / 2 + 0.04);
    if (rand() < 0.4) add("leds", new THREE.BoxGeometry(w * 0.3, 0.02, 0.008), w * 0.2, yy + sh / 2, d / 2 + 0.04, { uv: "keep" });
    yy += sh;
  }
  const c = Math.abs(Math.cos(yaw));
  const sn = Math.abs(Math.sin(yaw));
  const ex = (w * c + d * sn) / 2;
  const ez = (w * sn + d * c) / 2;
  kit.collider([x - ex, y, z - ez], [x + ex, y + h, z + ez], "cabinet");
}

// ---------------------------------------------------------------------------
// Walkway: white lane lines, cross ticks, recessed edge glow along the pit section
// ---------------------------------------------------------------------------
function buildWalkway(kit) {
  const white = { color: PALETTE.impWhite, uv: "keep" };
  for (const s of [-1, 1]) {
    kit.boxMM("impPanel", [s * 2 - 0.045, 0, Z0 + 1.4], [s * 2 + 0.045, 0.008, CMD.z0 - 0.4], white);
    kit.boxMM("impPanel", [s * 2 - 0.045, 0, CMD.z1 + 0.4], [s * 2 + 0.045, 0.008, Z1 - 0.4], white);
    for (const z of [-45, -39, -33, -27]) kit.boxMM("impPanel", [Math.min(s * 2, s * 1.2), 0, z - 0.045], [Math.max(s * 2, s * 1.2), 0.008, z + 0.045], white);
    // edge glow channel just inside the railings
    kit.boxMM("paintedMetal", [s * 2.62 - 0.07, 0, PIT.z0], [s * 2.62 + 0.07, 0.02, CMD.z0 - 0.2], BLACK);
    for (let z = PIT.z0 + 0.4; z < CMD.z0 - 1.5; z += 3) kit.boxMM("emitWhiteSoft", [s * 2.62 - 0.025, 0.02, z], [s * 2.62 + 0.025, 0.03, z + 2.2], { uv: "keep" });
  }
  // threshold plate where the walkway meets the forward apron
  kit.boxMM("paintedMetal", [-2.9, 0, Z0 + 1.2], [2.9, 0.012, Z0 + 1.4], BLACK);
}

// ---------------------------------------------------------------------------
// Commander's position: a raised platform just inside the blast door carrying a low holo dais
// (tactical display + a spinning projection of the ship) with two rim consoles on its aft side,
// and two standing lectern consoles at the platform's forward corners facing the commander
// ---------------------------------------------------------------------------
function buildCommand(kit, ctx, mats) {
  const { y, hz } = CMD;
  platform(kit, ctx, { x0: -2.7, z0: CMD.z0, x1: 2.7, z1: CMD.z1, y });
  // amber edge channels along both long sides of the platform
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [s * 2.5 - 0.07, y, CMD.z0 + 0.25], [s * 2.5 + 0.07, y + 0.014, CMD.z1 - 0.25], BLACK);
    kit.boxMM("emitAmber", [s * 2.5 - 0.02, y + 0.014, CMD.z0 + 0.35], [s * 2.5 + 0.02, y + 0.022, CMD.z1 - 0.35], {});
  }
  holoDais(kit, ctx, mats, 0, y, hz);
  // lectern consoles at the forward corners, screens toward the commander (operator side = aft)
  for (const s of [-1, 1]) {
    slabConsole(kit, { x: s * 2.3, y, z: CMD.z0 + 0.42, yaw: 0, w: 0.76, d: 0.5, h: 1.15, screens: [s > 0 ? "impScreen1" : "impScreen0"], pulse: "brg_pulse", seed: ctx.seed + 300 + s });
  }
}

/** Low octagonal holo dais: lit rings, two rim consoles on the aft side, tactical + ship holograms. */
function holoDais(kit, ctx, mats, x, yBase, z) {
  const top = yBase + 0.28;
  kit.cyl("paintedMetal", x, yBase + 0.03, z, 1.1, 0.06, "y", { color: PALETTE.impBlack, segments: 8 });
  kit.cyl("paintedMetal", x, yBase + 0.16, z, 1.04, 0.2, "y", { color: PALETTE.impDark, segments: 8 });
  kit.cyl("darkGloss", x, top - 0.01, z, 1.06, 0.03, "y", { segments: 8 });
  const flat = (geo, yy, mat, opts = {}) => {
    geo.rotateX(-Math.PI / 2);
    kit.add(mat, geo, { pos: [x, yy, z], ...opts });
  };
  flat(new THREE.RingGeometry(0.8, 0.88, 40), top + 0.006, "emitBlue");
  flat(new THREE.RingGeometry(0.93, 0.97, 40), top + 0.006, "metal", { color: PALETTE.impMid });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    kit.box(i % 2 ? "emitAmber" : "emitBlue", x + Math.cos(a) * 1.0, yBase + 0.2, z + Math.sin(a) * 1.0, 0.1, 0.03, 0.1, {});
  }
  // rim consoles: two angled control slabs on the aft rim (the commander stands between them)
  for (const s of [-1, 1]) {
    const a = s * 0.62;
    slabConsole(kit, { x: x + Math.sin(a) * 0.98, y: top, z: z + Math.cos(a) * 0.98, yaw: a, w: 0.8, d: 0.4, h: 0.36, screens: [s > 0 ? "impScreen0" : "brg_pulse"], seed: ctx.seed + 40 + s, collide: false });
  }
  kit.collider([x - 1.1, yBase, z - 1.1], [x + 1.1, top + 0.5, z + 1.1], "holotable"); // taller than a step: nobody climbs onto the table

  // tactical hologram: the helper's disc + contacts, plus pins under each contact, range rings and a rim ring
  const hy = top + 0.36;
  const scale = 0.62;
  const tac = hologram(kit, ctx, { x, y: hy, z, kind: "tactical", scale });
  const holo = ctx.materials.holo;
  const rand = rng(11); // same stream as the helper: reproduces its contact positions
  const extra = [];
  for (let i = 0; i < 9; i++) {
    const cx = (rand() - 0.5) * 2.4 * scale;
    const cy = 0.1 + rand() * 0.9 * scale;
    const cz = (rand() - 0.5) * 2.4 * scale;
    const pin = new THREE.BoxGeometry(0.012, cy, 0.012);
    pin.translate(cx, cy / 2, cz);
    extra.push(pin);
    const mk = new THREE.RingGeometry(0.05, 0.075, 16);
    mk.rotateX(-Math.PI / 2);
    mk.translate(cx, 0.004, cz);
    extra.push(mk);
  }
  for (const [r0, r1] of [[0.3, 0.315], [0.6, 0.615], [1.4 * scale + 0.03, 1.4 * scale + 0.09]]) {
    const rg = new THREE.RingGeometry(r0, r1, 48);
    rg.rotateX(-Math.PI / 2);
    rg.translate(0, 0.003, 0);
    extra.push(rg);
  }
  for (const g of extra) tac.add(new THREE.Mesh(g, holo));
  mergeGroupMeshes(tac);
  // radar sweep (spins on top of the group's slow rotation)
  const wedge = new THREE.Mesh(new THREE.CircleGeometry(1.4 * scale, 16, 0, Math.PI / 5), mats.sweep);
  wedge.rotation.x = -Math.PI / 2;
  wedge.position.y = 0.006;
  wedge.castShadow = false;
  wedge.receiveShadow = false;
  tac.add(wedge);
  ctx.anim((dt, t) => {
    wedge.rotation.z = -t * 1.3;
  });
  // the ship itself above the tactical plot, pitched nose-up so it reads from eye level, in the
  // brighter untextured holo material with a wire outline of the wedge
  const ship = hologram(kit, ctx, { x, y: hy + 0.42, z, kind: "ship", scale: 0.45 });
  const sub = new THREE.Group();
  sub.rotation.x = 0.42;
  for (const c of [...ship.children]) {
    ship.remove(c);
    sub.add(c);
  }
  mergeGroupMeshes(sub);
  sub.children[0].material = mats.bright;
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(sub.children[0].geometry, 20), new THREE.LineBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  sub.add(outline);
  ship.add(sub);
  // faint projector cone from the dais up to the plot
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.4 * scale, 0.45, hy - top - 0.02, 32, 1, true), mats.cone);
  cone.position.set(x, (top + hy) / 2, z);
  cone.castShadow = false;
  cone.receiveShadow = false;
  ctx.mesh(cone);
}

/**
 * Compact standing console built the way the bridge needs it: the operator stands at local +Z and
 * the top slab rises away from them, so its screens face the operator (and anyone behind them).
 * `screens` are material names. h < 0.6 builds just the slab on a short block (dais rim consoles).
 */
function slabConsole(kit, { x, y, z, yaw, w = 0.8, d = 0.5, h = 1.15, screens = ["impScreen0"], tilt = 0.5, lampMat = "emitAmber", pulse = null, seed = 1, collide = true }) {
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  const qs = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt)); // +Z (operator) edge lower
  const P = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = P(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const rand = rng(seed);
  const bodyH = h - 0.26;
  const slabD = d + 0.12;
  if (bodyH > 0.4) {
    add("paintedMetal", new THREE.BoxGeometry(w, 0.08, d), 0, 0.04, 0, BLACK);
    add("paintedMetal", new THREE.BoxGeometry(w - 0.08, bodyH - 0.08, d - 0.1), 0, 0.08 + (bodyH - 0.08) / 2, -0.02, DARK);
    add("impPanel", new THREE.BoxGeometry(w - 0.2, bodyH - 0.34, 0.012), 0, 0.14 + (bodyH - 0.34) / 2, d / 2 - 0.07 + 0.006, { color: PALETTE.impMid, uv: "keep" });
    add(lampMat, new THREE.BoxGeometry(w - 0.3, 0.02, 0.01), 0, 0.11, d / 2 - 0.06);
    for (const s of [-1, 1]) add("paintedMetal", new THREE.BoxGeometry(0.04, bodyH - 0.2, d - 0.04), s * (w / 2 - 0.02), 0.1 + (bodyH - 0.2) / 2, -0.02, BLACK);
  } else {
    add("paintedMetal", new THREE.BoxGeometry(w - 0.1, bodyH, d - 0.1), 0, bodyH / 2, 0, DARK);
  }
  // slab
  const pS = P(0, bodyH + 0.1, 0.02);
  kit.add("paintedMetal", new THREE.BoxGeometry(w, 0.06, slabD), { pos: pS.toArray(), quat: qs, color: PALETTE.impBlack, texel: 2 });
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(qs);
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(qs); // along the slab toward the operator
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
  const n = screens.length;
  const cell = (w - 0.16) / n;
  const sw = cell - 0.06;
  const sh = slabD * 0.5;
  for (let i = 0; i < n; i++) {
    const off = -w / 2 + 0.08 + (i + 0.5) * cell;
    const c = pS.clone().addScaledVector(right, off).addScaledVector(fwd, -slabD * 0.14).addScaledVector(up, 0.033);
    kit.add("darkGloss", new THREE.BoxGeometry(sw + 0.04, 0.012, sh + 0.04), { pos: c.toArray(), quat: qs });
    const g = new THREE.PlaneGeometry(sw, sh);
    g.rotateX(-Math.PI / 2);
    const c2 = c.clone().addScaledVector(up, 0.008);
    kit.add(screens[i], g, { pos: c2.toArray(), quat: qs, uv: "keep" });
  }
  // button row along the operator edge
  const nb = Math.floor((w - 0.2) / 0.1);
  for (let i = 0; i < nb; i++) {
    const off = -w / 2 + 0.15 + i * 0.1;
    const lit = rand() < 0.45;
    const mat = lit ? (rand() < 0.5 ? "emitBlue" : rand() < 0.6 ? "emitAmber" : "emitRed") : "rubber";
    const c = pS.clone().addScaledVector(right, off).addScaledVector(fwd, slabD * 0.36).addScaledVector(up, 0.045);
    kit.add(mat, new THREE.BoxGeometry(0.06, 0.03, 0.05), { pos: c.toArray(), quat: qs, color: PALETTE.rubber });
  }
  if (pulse) {
    const c = pS.clone().addScaledVector(fwd, -slabD * 0.46).addScaledVector(up, 0.036);
    kit.add(pulse, new THREE.BoxGeometry(w - 0.2, 0.012, 0.035), { pos: c.toArray(), quat: qs, uv: "keep" });
  }
  if (collide) {
    const c = Math.abs(Math.cos(yaw));
    const s = Math.abs(Math.sin(yaw));
    const ex = (w * c + slabD * s) / 2;
    const ez = (w * s + slabD * c) / 2;
    kit.collider([x - ex, y, z - ez], [x + ex, y + h, z + ez], "console");
  }
}

/** Collapse a group's meshes into one (the hologram helper spawns one mesh per contact). */
function mergeGroupMeshes(group) {
  const geos = [];
  let mat = null;
  for (const c of [...group.children]) {
    if (!c.isMesh) continue;
    c.updateMatrix();
    const g = c.geometry.clone().applyMatrix4(c.matrix);
    const ng = g.index ? g.toNonIndexed() : g;
    for (const key of Object.keys(ng.attributes)) if (!["position", "normal", "uv"].includes(key)) ng.deleteAttribute(key);
    if (!ng.attributes.normal) ng.computeVertexNormals();
    geos.push(ng);
    mat = c.material;
    group.remove(c);
  }
  if (geos.length) {
    const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
    m.castShadow = false;
    m.receiveShadow = false;
    group.add(m);
  }
}

// ---------------------------------------------------------------------------
// Forward area between the pits and the windows: navigation stations facing the glass
// ---------------------------------------------------------------------------
function buildForward(kit, ctx) {
  for (const s of [-1, 1]) {
    impConsole(kit, ctx, { x: s * 5.1, z: -46.8, yaw: 0, w: 2.0, screens: [2, 2], chair: true, seed: ctx.seed + 400 + s });
    impConsole(kit, ctx, { x: s * 7.6, z: -46.8, yaw: 0, w: 2.0, screens: [2, 0], chair: true, seed: ctx.seed + 402 + s, lampMat: "emitAmber" });
    // low equipment plinth between the nav pair and the pit head (keeps the aisle to the side floors open)
    kit.boxMM("paintedMetal", [Math.min(s * 4.2, s * 8.6), 0, -43.6], [Math.max(s * 4.2, s * 8.6), 0.45, -43.1], DARK);
    kit.boxMM("leds", [Math.min(s * 4.5, s * 8.3), 0.3, -43.1], [Math.max(s * 4.5, s * 8.3), 0.34, -43.09], { uv: "keep" });
    kit.collider([Math.min(s * 4.2, s * 8.6), 0, -43.6], [Math.max(s * 4.2, s * 8.6), 0.45, -43.1], "plinth");
  }
}

// ---------------------------------------------------------------------------
// Side floors: wall-mounted displays / racks / status boards, tactical console pair facing the big
// display, sensor stations, floor trunks and hatches, and a forward station cluster
// ---------------------------------------------------------------------------
function buildSideBay(kit, ctx, s, B, mats) {
  const side = s > 0 ? "xmax" : "xmin";
  const u = (z) => (s > 0 ? z - Z0 : Z1 - z);
  const yawWall = s > 0 ? -Math.PI / 2 : Math.PI / 2; // operator faces the side wall
  const rand = rng(ctx.seed + 500 + s * 11);
  // --- wall furniture (forward to aft)
  equipmentRack(kit, ctx, { side, u: u(-46.4), w: 1.4, h: 2.6, seed: ctx.seed + 1 + s, bounds: B });
  equipmentRack(kit, ctx, { side, u: u(-44.9), w: 1.4, h: 2.6, seed: ctx.seed + 2 + s, bounds: B, lit: "emitAmber" });
  deflectorBoard(kit, side, u(-41.2), B, s);
  display(kit, side, u(-37.2), 1.7, 1.6, 0.9, s > 0 ? 1 : 2, B);
  display(kit, side, u(-33), 3.0, 4.2, 2.3, 0, B, true);
  display(kit, side, u(-28.8), 1.7, 1.6, 0.9, s > 0 ? 2 : 1, B);
  display(kit, side, u(-33), 5.6, 3.0, 0.6, 4, B); // amber status band high on the wall
  equipmentRack(kit, ctx, { side, u: u(-24.6), w: 1.4, h: 2.6, seed: ctx.seed + 3 + s, bounds: B });
  equipmentRack(kit, ctx, { side, u: u(-23.1), w: 1.4, h: 2.6, seed: ctx.seed + 4 + s, bounds: B, lit: s > 0 ? "emitRed" : "emitBlue" });
  display(kit, side, u(-19.5), 1.9, 2.2, 1.2, 3, B);
  // stencils high on the wall
  {
    const seg = wallSegment(B, side);
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    frame.add("decal", new THREE.PlaneGeometry(1.1, 1.1), u(-40), 5.6, 0.001, { uv: "keep", uvRect: decalRect(s > 0 ? 2 : 14) });
    frame.add("decal", new THREE.PlaneGeometry(0.8, 0.8), u(-24), 5.3, 0.001, { uv: "keep", uvRect: decalRect(0) });
  }
  // --- tactical console pair facing the big display
  for (const dz of [-1.35, 1.35]) impConsole(kit, ctx, { x: s * 20.3, z: -33 + dz, yaw: yawWall, w: 2.2, screens: dz < 0 ? [0, 1] : [1, 0], chair: true, seed: ctx.seed + 520 + s + dz });
  // --- sensor station: two consoles back to back (spine box between), operators facing ±Z
  impConsole(kit, ctx, { x: s * 16.2, z: -25.4, yaw: 0, w: 2.0, screens: [1, 2], chair: true, seed: ctx.seed + 530 + s, lampMat: "emitAmber" });
  impConsole(kit, ctx, { x: s * 16.2, z: -26.6, yaw: Math.PI, w: 2.0, screens: [0, 1], chair: true, seed: ctx.seed + 531 + s });
  kit.box("paintedMetal", s * 16.2, 0.75, -26.0, 1.8, 1.5, 0.42, DARK);
  kit.box("emitBlue", s * 16.2, 1.42, -26.0, 1.2, 0.03, 0.44, {});
  // --- forward station cluster near the windows
  impConsole(kit, ctx, { x: s * 14.2, z: -45.9, yaw: 0, w: 2.0, screens: [2, 1], chair: true, seed: ctx.seed + 540 + s });
  impConsole(kit, ctx, { x: s * 17.0, z: -45.9, yaw: 0, w: 2.4, screens: [2, 2, 0], chair: true, seed: ctx.seed + 541 + s });
  if (s > 0) sensorTable(kit, ctx, mats, 14.6, -40.2);
  else chartTable(kit, -14.6, -40.2);
  // --- floor: cable trunk covers from the pit edge to the wall, recessed hatches
  for (const z of [-36.5, -29.5]) {
    kit.boxMM("paintedMetal", [Math.min(s * (PIT.x1 + 0.4), s * 23.8), 0, z - 0.14], [Math.max(s * (PIT.x1 + 0.4), s * 23.8), 0.06, z + 0.14], BLACK);
    kit.collider([Math.min(s * (PIT.x1 + 0.4), s * 23.8), 0, z - 0.14], [Math.max(s * (PIT.x1 + 0.4), s * 23.8), 0.06, z + 0.14], "trunk");
  }
  for (const [x, z] of [[s * 18.5, -40.5], [s * 13.5, -21.5]]) {
    kit.box("paintedMetal", x, 0.005, z, 1.3, 0.01, 1.3, BLACK);
    kit.box("metal", x, 0.01, z, 1.1, 0.012, 1.1, { color: PALETTE.impMid, texel: 2 });
    kit.box("hazard", x, 0.012, z - 0.5, 1.1, 0.008, 0.08, { texel: 3 });
    kit.box("hazard", x, 0.012, z + 0.5, 1.1, 0.008, 0.08, { texel: 3 });
  }
  // --- equipment cases stacked by the aft racks
  for (let i = 0; i < 2; i++) {
    const cx = s * (21.5 + rand() * 0.6);
    const cz = -21.2 + i * 1.0;
    kit.box("impPanel1", cx, 0.35, cz, 0.9, 0.7, 0.7, { color: PALETTE.impDark, uv: "keep" });
    kit.box("paintedMetal", cx, 0.68, cz, 0.94, 0.06, 0.74, BLACK);
    kit.box("emitBlue", cx + (s > 0 ? -0.46 : 0.46), 0.45, cz, 0.01, 0.03, 0.12, {});
    kit.collider([cx - 0.47, 0, cz - 0.37], [cx + 0.47, 0.72, cz + 0.37], "case");
  }
}

/** Wall display with a deep bezel (hides wall greebles), lamp bar and label plate. */
function display(kit, side, u, v, w, h, screen, B, big = false) {
  const seg = wallSegment(B, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, 0);
  frame.box("paintedMetal", u, v, 0.075, w + 0.24, h + 0.28, 0.15, BLACK);
  frame.box("impPanel", u, v, 0.152, w + 0.16, h + 0.2, 0.01, { color: PALETTE.impDark, uv: "keep" });
  frame.box("darkGloss", u, v, 0.16, w + 0.05, h + 0.05, 0.008);
  frame.add("impScreen" + (screen % 5), new THREE.PlaneGeometry(w, h), u, v, 0.166, { uv: "keep" });
  frame.box("leds", u - w * 0.2, v - h / 2 - 0.09, 0.16, w * 0.5, 0.03, 0.012, { uv: "keep" });
  frame.box(screen === 3 ? "emitRed" : "emitBlue", u + w * 0.42, v - h / 2 - 0.09, 0.16, 0.12, 0.03, 0.012);
  if (big) {
    // heavy sub-frame and a row of readouts beneath the main tactical display
    frame.box("paintedMetal", u, v - h / 2 - 0.4, 0.1, w + 0.4, 0.34, 0.2, DARK);
    for (let i = 0; i < 4; i++) {
      frame.box("darkGloss", u - w * 0.36 + i * (w * 0.24), v - h / 2 - 0.4, 0.205, w * 0.2, 0.22, 0.008);
      frame.add("impScreen" + [1, 4, 2, 1][i], new THREE.PlaneGeometry(w * 0.18, 0.18), u - w * 0.36 + i * (w * 0.24), v - h / 2 - 0.4, 0.21, { uv: "keep" });
    }
    frame.add("decal", new THREE.PlaneGeometry(0.4, 0.4), u - w / 2 - 0.35, v + h / 2, 0.16, { uv: "keep", uvRect: decalRect(9) });
    frame.collider(u - w / 2 - 0.2, u + w / 2 + 0.2, 0, v + h / 2 + 0.2, 0, 0.22, "display");
  }
}

/** Deflector-shield status board: engineering bar gauges, amber lamp column and small readouts. */
function deflectorBoard(kit, side, u, B, s) {
  const seg = wallSegment(B, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, 0);
  const w = 2.8;
  const h = 2.5;
  const v = 1.65;
  frame.box("paintedMetal", u, v, 0.09, w, h, 0.18, BLACK);
  frame.box("impPanel1", u, v, 0.185, w - 0.16, h - 0.16, 0.01, { color: PALETTE.impDark, uv: "keep" });
  frame.box("darkGloss", u - 0.3, v + 0.4, 0.195, 1.9, 1.0, 0.01);
  frame.add("impScreen1", new THREE.PlaneGeometry(1.8, 0.9), u - 0.3, v + 0.4, 0.202, { uv: "keep" });
  for (let i = 0; i < 7; i++) frame.box(i === 4 ? "emitRed" : i === 6 ? "emitGreen" : "emitAmber", u + 1.05, v + 0.9 - i * 0.24, 0.198, 0.18, 0.08, 0.012);
  for (let i = 0; i < 3; i++) {
    const x = u - 0.9 + i * 0.9;
    frame.box("darkGloss", x, v - 0.55, 0.195, 0.72, 0.46, 0.01);
    frame.add("impScreen" + [4, 1, 3][i], new THREE.PlaneGeometry(0.64, 0.38), x, v - 0.55, 0.202, { uv: "keep" });
  }
  frame.box("leds", u - 0.2, v - 0.95, 0.198, 1.6, 0.05, 0.012, { uv: "keep" });
  frame.box("hazard", u, v - h / 2 + 0.06, 0.19, w - 0.2, 0.07, 0.012, { texel: 3 });
  frame.add("decal", new THREE.PlaneGeometry(0.42, 0.42), u + 1.05, v - 0.7, 0.203, { uv: "keep", uvRect: decalRect(5) });
  frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), u - 1.0, v + 1.05, 0.203, { uv: "keep", uvRect: decalRect(s > 0 ? 12 : 6) });
  frame.collider(u - w / 2, u + w / 2, 0, v + h / 2, 0, 0.2, "board");
}

/** Octagonal standing table with a flat holographic sensor sweep (animated wedge). */
function sensorTable(kit, ctx, mats, x, z) {
  tableBase(kit, x, z);
  const g = new THREE.Group();
  g.position.set(x, 0.985, z);
  const statics = [];
  const disc = new THREE.CircleGeometry(0.58, 40);
  disc.rotateX(-Math.PI / 2);
  statics.push(disc);
  const ring = new THREE.RingGeometry(0.5, 0.56, 40);
  ring.rotateX(-Math.PI / 2);
  ring.translate(0, 0.003, 0);
  statics.push(ring);
  const rand = rng(31);
  for (let i = 0; i < 7; i++) {
    const c = new THREE.OctahedronGeometry(0.03);
    const a = rand() * Math.PI * 2;
    const r = 0.1 + rand() * 0.42;
    c.translate(Math.cos(a) * r, 0.04 + rand() * 0.2, Math.sin(a) * r);
    statics.push(c);
  }
  for (const s of statics) if (!s.attributes.normal) s.computeVertexNormals();
  const sm = new THREE.Mesh(mergeGeometries(statics.map((s) => (s.index ? s.toNonIndexed() : s)), false), ctx.materials.holo);
  sm.castShadow = false;
  sm.receiveShadow = false;
  g.add(sm);
  const wedge = new THREE.Mesh(new THREE.CircleGeometry(0.56, 12, 0, Math.PI / 4), mats.sweep);
  wedge.rotation.x = -Math.PI / 2;
  wedge.position.y = 0.006;
  wedge.castShadow = false;
  wedge.receiveShadow = false;
  g.add(wedge);
  ctx.mesh(g);
  ctx.anim((dt, t) => {
    wedge.rotation.z = -t * 1.1;
  });
}

/** Chart table: same base, flat navigation map screen under a glass plate. */
function chartTable(kit, x, z) {
  tableBase(kit, x, z);
  const sg = new THREE.PlaneGeometry(1.0, 1.0);
  sg.rotateX(-Math.PI / 2);
  kit.add("impScreen2", sg, { pos: [x, 0.972, z], uv: "keep" });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    kit.box(i % 2 ? "emitBlue" : "emitAmber", x + Math.cos(a) * 0.62, 0.975, z + Math.sin(a) * 0.62, 0.1, 0.01, 0.1, {});
  }
}

function tableBase(kit, x, z) {
  kit.cyl("paintedMetal", x, 0.05, z, 0.72, 0.1, "y", { color: PALETTE.impBlack, segments: 8 });
  kit.cyl("paintedMetal", x, 0.5, z, 0.56, 0.8, "y", { color: PALETTE.impDark, segments: 8 });
  kit.cyl("darkGloss", x, 0.94, z, 0.7, 0.07, "y", { segments: 8 });
  kit.cyl("metal", x, 0.975, z, 0.68, 0.006, "y", { color: PALETTE.impMid, segments: 8 });
  kit.box("leds", x, 0.6, z + 0.56, 0.5, 0.03, 0.012, { uv: "keep" });
  kit.collider([x - 0.72, 0, z - 0.72], [x + 0.72, 1.0, z + 0.72], "table");
}

// ---------------------------------------------------------------------------
// Aft wall furniture: lit sign and alert lamps over the blast door, lockers flanking it, ship
// status displays and rack pairs further out
// ---------------------------------------------------------------------------
function buildAftWall(kit, ctx, B) {
  const u = (x) => X1 - x; // zmax wall runs from +X to -X
  const seg = wallSegment(B, "zmax");
  const { frame } = wallFrame(kit, seg.from, seg.to, 0);
  // sign bar over the door
  frame.box("paintedMetal", u(0), 3.9, 0.06, 3.4, 0.44, 0.12, BLACK);
  frame.box("emitWhite", u(0), 3.9, 0.125, 2.9, 0.14, 0.01);
  for (const s of [-1, 1]) {
    frame.box("paintedMetal", u(s * 2.1), 3.9, 0.1, 0.4, 0.3, 0.2, DARK);
    frame.box("brg_alert", u(s * 2.1), 3.9, 0.205, 0.26, 0.14, 0.01);
    // tall lockers flanking the door
    equipmentRack(kit, ctx, { side: "zmax", u: u(s * 3.6), w: 1.2, h: 2.8, d: 0.5, seed: ctx.seed + 600 + s, bounds: B, lit: "emitAmber" });
    // ship status displays
    display(kit, "zmax", u(s * 8.5), 2.3, 3.0, 1.7, s > 0 ? 0 : 1, B);
    display(kit, "zmax", u(s * 8.5), 4.6, 1.8, 0.5, 4, B);
    // rack pairs further out
    equipmentRack(kit, ctx, { side: "zmax", u: u(s * 14.2), w: 1.4, h: 2.6, seed: ctx.seed + 610 + s, bounds: B });
    equipmentRack(kit, ctx, { side: "zmax", u: u(s * 15.7), w: 1.4, h: 2.6, seed: ctx.seed + 611 + s, bounds: B, lit: "emitRed" });
    display(kit, "zmax", u(s * 20), 1.8, 1.6, 0.9, 2, B);
    frame.add("decal", new THREE.PlaneGeometry(0.9, 0.9), u(s * 20), 3.4, 0.001, { uv: "keep", uvRect: decalRect(s > 0 ? 0 : 14) });
  }
}

// ---------------------------------------------------------------------------
// Lights (10): blue pit lights, cool white walkway lights from the spine, an amber pool over the
// holo dais, a cool light at the windows, and one per side bay
// ---------------------------------------------------------------------------
function buildLights(ctx) {
  for (const s of [-1, 1]) for (const z of [-36, -25]) ctx.light(pointLight(0x4a9dff, 7, 9, [s * 7, -0.2, z]));
  for (const z of [-41, -29]) ctx.light(pointLight(0xdde8ff, 10, 15, [0, H - 1.1, z]));
  ctx.light(pointLight(0xffb347, 5, 7, [0, 3.0, CMD.hz]));
  // kept well back from the glass: anything closer lights the black mullions and sill up to grey
  ctx.light(pointLight(0xa9c6ff, 3.5, 12, [0, 5.2, -44]));
  for (const s of [-1, 1]) ctx.light(pointLight(0xdde8ff, 7, 14, [s * 18, 5.6, -33]));
}
