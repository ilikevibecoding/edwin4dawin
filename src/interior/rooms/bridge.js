// Main Bridge (deck 1): the command deck of the Star Destroyer. A raised central walkway runs from the
// aft blast door to a wall of tall canted windows; two sunken crew pits flank it, lined with canted-back
// operator stations; equipment bays, tactical displays and a navigation cluster occupy the side
// floors; the commander's holo platform sits at the aft end just inside the door. Dark structural
// ceiling with a lowered spine beam. Low-key lighting: the pits glow blue, the walkway stays near
// black, the readouts and the glass are the light. Deck-local metres, floor y = 0 (the sector's y -2
// only exists for the pits).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE } from "../../materials.js";
import { impWall, impCeiling, impConsole, impChair, equipmentRack, pit, platform, railing, pipeRun, hologram, wallSegment } from "../imperial.js";
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
const WIN_Y0 = 0.7; // glass foot at knee height so the hull ahead shows through the lower panes (exterior hole y 0.35..6.85)
const WIN_Y1 = 6.5;
const SILL_D = 1.0; // the glass foot sits 1 m inside the wall plane; the panes lean out to the plane at the top
const APRON_D = 0.42; // sloped instrument apron in front of the sill base
const APRON_KICK = 0.24; // height of the apron's vertical kick; the readout face slopes from there up to the ledge
const PIT = { x0: 3, x1: 11, z0: -42, z1: -18, depth: 1.8 };
const STAIR_Z = -23.6; // pit stairs (walkway side, just forward of the command platform)
const STAIR_W = 1.6;
const CMD = { z0: -22.4, z1: -17.6, hz: -19.6, y: 0.3 }; // command platform + holo dais centre
const DAIS_R = 1.15; // holo dais radius (the tactical plot overhangs it slightly)
const DATUM = 1.45; // bottom edge shared by every wall display (side bays + aft wall)
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
    // hairline seams (waist rails, rib undersides, coves): below the bloom threshold so they read as
    // lines, never as blown bars
    m.brg_hair = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: new THREE.Color("#dfe6f2"), emissiveIntensity: 0.3, roughness: 0.5, metalness: 0 });
    // steady red for the corner-tower slots and the alert housings' standby glow
    m.brg_red = new THREE.MeshStandardMaterial({ color: 0x120404, emissive: new THREE.Color("#ff3a2a"), emissiveIntensity: 1.0, roughness: 0.5, metalness: 0 });
    // dais rim rings: blue kept under the bloom threshold (the shared emitBlue blows to white)
    m.brg_ring = m.emitBlue.clone();
    m.brg_ring.name = "brg_ring";
    m.brg_ring.emissiveIntensity = 1.2;
    m.brg_sweep = m.holo.clone();
    m.brg_sweep.opacity = 0.85;
    m.brg_sweep.color = new THREE.Color("#8ec5ff");
    m.brg_cone = m.holo.clone();
    m.brg_cone.opacity = 0.13;
    // brighter, untextured additive blue for the ship projection so it reads from the aft door
    m.brg_holoBright = m.holo.clone();
    m.brg_holoBright.map = null;
    m.brg_holoBright.color = new THREE.Color("#78bcff");
    m.brg_holoBright.opacity = 0.3;
    // the ship hologram: faint additive fill under a bright wire outline
    m.brg_holoFill = m.holo.clone();
    m.brg_holoFill.map = null;
    m.brg_holoFill.color = new THREE.Color("#6fb4ff");
    m.brg_holoFill.opacity = 0.07;
    m.brg_holoLine = new THREE.LineBasicMaterial({ color: 0x8ec5ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
    // unlit near-black for the window reveal (see buildWindowWall)
    m.brg_void = new THREE.MeshBasicMaterial({ color: 0x05060a });
    // window frame steel: matte near-black with almost no environment response, so the mullions stay
    // black against space instead of picking up the room environment as a blue-grey sheen
    m.brg_frame = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.82, metalness: 0.1, envMapIntensity: 0.15 });
    // bridgeGlass with the diffuse tint taken out (the shared material's light body colour lays a grey
    // veil over everything seen through the panes) and a sharper, slightly stronger reflection so the
    // panes read as glass: a faint sheen of the room, not a hole in the wall
    m.brg_glass = m.bridgeGlass.clone();
    m.brg_glass.name = "brg_glass";
    m.brg_glass.color.set(0x0c0f13);
    m.brg_glass.roughness = 0.06;
    m.brg_glass.envMapIntensity = 0.55;
    m.brg_glass.opacity = 0.1;
    // deck gloss with the environment reflection pulled back: the shared RoomEnvironment carries a
    // 43x area light low on its +Z side, and the stock floor mirrors it as a white flare whenever the
    // player looks aft along the walkway; the console/lane reflections survive at this level
    m.brg_floor = m.floorGloss.clone();
    m.brg_floor.name = "brg_floor";
    m.brg_floor.envMapIntensity = 0.1;
    m.brg_floor.roughness = 1.35;
    // and the deck albedo itself pulled down: the walkway must read as the film's near-black spine
    // under the side-bay fill lights, not as mid-grey tiles
    m.brg_floor.color.setScalar(0.6);
    m.brg_top = m.darkGloss.clone();
    m.brg_top.name = "brg_top";
    m.brg_top.envMapIntensity = 0.3;
    m.brg_top.roughness = 0.4;
  }
  return { pulse: m.brg_pulse, alert: m.brg_alert, sweep: m.brg_sweep, cone: m.brg_cone, bright: m.brg_holoBright, fill: m.brg_holoFill, line: m.brg_holoLine };
}

// ---------------------------------------------------------------------------
// Floor: black gloss deck in pieces around the two pit openings, dark gutters along the walls
// ---------------------------------------------------------------------------
function buildFloor(kit) {
  const pad = 0.4;
  const F = (x0, z0, x1, z1) => kit.boxMM("brg_floor", [x0, -0.12, z0], [x1, 0, z1], { texel: 0.33 });
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
    [PALETTE.impMid, 0.4],
    [PALETTE.impGrey, 0.28],
    [PALETTE.impDark, 0.26],
    [PALETTE.impLight, 0.06],
  ];
  const upPaints = [
    [PALETTE.impMid, 0.42],
    [PALETTE.impDark, 0.4],
    [PALETTE.impGrey, 0.18],
  ];
  const lowStyles = { panel: 0.56, vent: 0.1, greeble: 0.06, strip: 0.1, screen: 0.06, conduit: 0.12 };
  const upStyles = { panel: 0.8, vent: 0.08, strip: 0.06, conduit: 0.06 };
  const lowRows = [0, 0.5, 1.7, 2.9, SPLIT];
  const upRows = [0, 1.8, 3.0, H - SPLIT];
  let i = 0;
  for (const side of ["zmax", "xmin", "xmax"]) {
    impWall(kit, ctx, side, { bounds: lowB, rows: lowRows, paints: lowPaints, styles: lowStyles, seed: ctx.seed + 11 + i * 13, panelW: 1.3, theme: { accent: "brg_hair" } });
    impWall(kit, ctx, side, { bounds: upB, rows: upRows, paints: upPaints, styles: upStyles, seed: ctx.seed + 17 + i * 13, panelW: 2.6, kick: false, trim: false, noDoors: true, theme: { accent: "brg_hair" } });
    // dark waist rail where the two wall zones meet, a hairline under it, and a dark cove at the top
    const seg = wallSegment(B, side);
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    frame.box("paintedMetal", length / 2, SPLIT, 0.06, length, 0.22, 0.12, BLACK);
    frame.box("brg_hair", length / 2, SPLIT - 0.12, 0.09, length - 0.6, 0.015, 0.06, { uv: "keep" });
    frame.box("paintedMetal", length / 2, H - 0.1, 0.07, length, 0.16, 0.14, DARK);
    frame.box("brg_hair", length / 2, H - 0.12, 0.13, length - 0.4, 0.02, 0.03, { uv: "keep" });
    i++;
  }
}

// ---------------------------------------------------------------------------
// Window wall: low instrument sill, 15 canted panes between thick mullions read through hooded
// trapezoid viewports, a heavy header with a canted soffit, dark corner towers with red slots, and a
// black reveal tube through the hull so oblique views never leak past the frame.
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

  // --- sill: low dark base with the metal ledge at the glass foot, and a sloped instrument apron in
  // front of it (rubber kick, dim floor light channel, one slanted readout face per pane rising to the
  // ledge) so the band still reads as a deep console run while nothing stands in front of the glass
  const zApron = zFoot + APRON_D;
  kit.boxMM("paintedMetal", [X0, 0, Z0 - 0.16], [X1, WIN_Y0, zFoot], DARK);
  kit.boxMM("metal", [X0, WIN_Y0 - 0.04, Z0 - 0.16], [X1, WIN_Y0 + 0.04, zFoot + 0.12], { color: PALETTE.impMid, texel: 1 });
  const ax0 = -GLASS_X - 0.15;
  const ax1 = GLASS_X + 0.15;
  kit.boxMM("paintedMetal", [ax0, 0, zFoot], [ax1, APRON_KICK, zApron], DARK);
  kit.boxMM("rubber", [ax0, 0, zApron], [ax1, 0.14, zApron + 0.03], { color: PALETTE.rubber });
  kit.boxMM("paintedMetal", [-GLASS_X, 0, zApron + 0.03], [GLASS_X, 0.02, zApron + 0.2], BLACK);
  for (let k = 0; k < PANES; k++) kit.boxMM("emitWhiteDim", [paneX(k) - 0.8, 0.02, zApron + 0.09], [paneX(k) + 0.8, 0.03, zApron + 0.12], { uv: "keep" });
  for (const s of [-1, 1]) kit.boxMM("paintedMetal", [s * (GLASS_X + 0.1) - 0.05, 0, zFoot], [s * (GLASS_X + 0.1) + 0.05, WIN_Y0, zApron], BLACK); // end cheeks
  // the slanted face runs from the kick top (zApron) up to the ledge (zFoot); t = 0 at the kick, 1 at the ledge
  const slopeH = WIN_Y0 - APRON_KICK;
  const slopeL = Math.hypot(APRON_D, slopeH);
  const slopeQ = new THREE.Quaternion().setFromAxisAngle(X_AXIS, -Math.atan2(APRON_D, slopeH));
  const sUp = new THREE.Vector3(0, 1, 0).applyQuaternion(slopeQ);
  const sN = new THREE.Vector3(0, 0, 1).applyQuaternion(slopeQ); // up and into the room
  const sMid = new THREE.Vector3(0, (APRON_KICK + WIN_Y0) / 2, (zApron + zFoot) / 2);
  const onSlope = (mat, geo, x, t, lift, extra = {}) => {
    const p = sMid.clone().addScaledVector(sUp, (t - 0.5) * slopeL).addScaledVector(sN, lift);
    return kit.add(mat, geo, { pos: [x, p.y, p.z], quat: slopeQ, ...extra });
  };
  onSlope("paintedMetal", new THREE.BoxGeometry(ax1 - ax0, slopeL + 0.02, 0.08), 0, 0.5, -0.04, BLACK);
  const rand = rng(ctx.seed + 77);
  for (let k = 0; k < PANES; k++) {
    const xc = paneX(k);
    // one readout group per pane on the slope: bezelled screen, button row along the kick, led strip,
    // stencil and a status lamp; the dark inset panel keeps each group reading as its own bay
    onSlope("impPanel1", new THREE.BoxGeometry(2.6, slopeL - 0.06, 0.012), xc, 0.5, 0.006, { color: PALETTE.impDark, uv: "keep" });
    const scr = k % 3 === 1 ? "brg_pulse" : "impScreen" + [2, 2, 0, 1][k % 4];
    onSlope("darkGloss", new THREE.BoxGeometry(1.5, 0.36, 0.03), xc, 0.56, 0.027);
    onSlope(scr, new THREE.PlaneGeometry(1.4, 0.3), xc, 0.56, 0.044, { uv: "keep" });
    onSlope("paintedMetal", new THREE.BoxGeometry(1.6, 0.11, 0.02), xc, 0.15, 0.022, { color: PALETTE.impDark, texel: 2 });
    for (let b = 0; b < 12; b++) {
      const lit = rand() < 0.45;
      onSlope(lit ? (rand() < 0.6 ? "emitBlue" : rand() < 0.5 ? "emitAmber" : "emitRed") : "rubber", new THREE.BoxGeometry(0.07, 0.05, 0.02), xc - 0.7 + b * 0.125, 0.15, 0.04, { color: PALETTE.rubber });
    }
    onSlope("leds", new THREE.BoxGeometry(0.44, 0.04, 0.012), xc + 1.02, 0.56, 0.018, { uv: "keep" });
    onSlope("decal", new THREE.PlaneGeometry(0.24, 0.24), xc - 1.0, 0.56, 0.014, { uv: "keep", uvRect: decalRect([9, 6, 14, 0][k % 4]) });
    onSlope(k % 5 === 2 ? "emitAmber" : "emitBlue", new THREE.BoxGeometry(0.05, 0.18, 0.012), xc - 1.24, 0.56, 0.018);
  }

  // --- header: heavy dark beam, a canted soffit hooding the top of every pane, a bevelled fascia with
  // short dim downlights, lamp row, vent slats and stencils (this face is what the walkway sees above the glass)
  kit.boxMM("paintedMetal", [X0, WIN_Y1, Z0 - 0.16], [X1, H, Z0 + 0.7], DARK);
  kit.boxMM("paintedMetal", [X0, WIN_Y1 - 0.08, Z0 + 0.6], [X1, WIN_Y1 + 0.35, Z0 + 0.9], { color: PALETTE.impBlack, texel: 1.5 });
  {
    // soffit: from the fascia's underside down and out to just above the glass top
    const a = new THREE.Vector3(0, WIN_Y1 - 0.02, Z0 + 0.88);
    const b = new THREE.Vector3(0, WIN_Y1 - 0.42, Z0 + 0.1);
    const len = a.distanceTo(b);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const ang = Math.atan2(b.z - a.z, a.y - b.y); // rotation about X taking +Y onto the a→b direction
    const sq = new THREE.Quaternion().setFromAxisAngle(X_AXIS, -ang);
    // frame steel, not paint: this plate sits inside the exterior sun's shadow-map leak zone
    kit.add("brg_frame", new THREE.BoxGeometry(GLASS_X * 2 + 0.6, len, 0.08), { pos: [mid.x, mid.y, mid.z], quat: sq });
    // ribs under the soffit continuing every mullion
    for (let k = 0; k <= PANES; k++) {
      const x = -GLASS_X + PANE_W * k;
      kit.add("brg_frame", new THREE.BoxGeometry(0.3, len - 0.04, 0.16), { pos: [x, mid.y, mid.z], quat: sq });
    }
  }
  for (let k = 0; k < PANES; k++) {
    const xc = paneX(k);
    kit.box("impPanel", xc, WIN_Y1 + 0.95, Z0 + 0.71, 2.6, 0.9, 0.02, { color: PALETTE.impMid, uv: "keep" });
    kit.box("paintedMetal", xc, WIN_Y1 + 0.34, Z0 + 0.905, 1.4, 0.06, 0.16, BLACK);
    kit.box("emitWhiteDim", xc, WIN_Y1 + 0.34, Z0 + 0.905, 1.2, 0.025, 0.14, { uv: "keep" });
    // lamp pair + label on the fascia face, vent slats on every other pane
    kit.box("paintedMetal", xc - 0.9, WIN_Y1 + 0.75, Z0 + 0.73, 0.5, 0.16, 0.03, BLACK);
    kit.box(k % 4 === 1 ? "brg_red" : "emitBlue", xc - 1.05, WIN_Y1 + 0.75, Z0 + 0.75, 0.12, 0.05, 0.01, {});
    kit.box("leds", xc - 0.78, WIN_Y1 + 0.75, Z0 + 0.75, 0.22, 0.04, 0.01, { uv: "keep" });
    if (k % 2 === 0) {
      for (let v = 0; v < 4; v++) kit.box("paintedMetal", xc + 0.45, WIN_Y1 + 0.62 + v * 0.09, Z0 + 0.735, 1.1, 0.03, 0.03, BLACK);
    } else {
      kit.box("paintedMetal", xc + 0.45, WIN_Y1 + 0.76, Z0 + 0.735, 1.1, 0.4, 0.02, { color: PALETTE.impDark, texel: 2 });
      kit.add("decal", new THREE.PlaneGeometry(0.34, 0.34), { pos: [xc + 0.45, WIN_Y1 + 0.76, Z0 + 0.747], uv: "keep", uvRect: decalRect([2, 14, 9, 6, 0, 12, 5][k % 7]) });
    }
    kit.box("paintedMetal", xc, WIN_Y1 + 1.3, Z0 + 0.74, 2.4, 0.04, 0.06, BLACK);
  }

  // --- mullions (aligned with the exterior ones at x = -22.5 + 3k), bottom and top rails
  for (let k = 0; k <= PANES; k++) {
    const x = -GLASS_X + PANE_W * k;
    const c = new THREE.Vector3(x, yMid, zMid);
    kit.add("brg_frame", new THREE.BoxGeometry(0.3, paneLen + 0.25, 0.36), { pos: [c.x, c.y, c.z], quat: tilt });
  }
  const rail = (y, z, sy, sz) => kit.boxMM("brg_frame", [-GLASS_X - 0.15, y - sy / 2, z - sz / 2], [GLASS_X + 0.15, y + sy / 2, z + sz / 2], {});
  rail(WIN_Y0 + 0.05, zFoot - 0.08, 0.22, 0.28); // shallow: it must not shade the apron's readouts
  rail(WIN_Y1 - 0.02, Z0 + 0.1, 0.2, 0.5);

  // --- viewport masks: a frame plate on the room side of every pane with a tapered opening (nearly
  // the full pane width at the sill, narrower under the hood), so each window reads as a hooded
  // Imperial trapezoid rather than a plain rectangle of space. Frame steel like the mullions: the
  // plates sit inside the exterior sun's shadow-map leak zone and paint would render sunlit grey.
  {
    const hw = PANE_W / 2;
    const hl = paneLen / 2;
    const shape = new THREE.Shape([new THREE.Vector2(-hw, -hl), new THREE.Vector2(hw, -hl), new THREE.Vector2(hw, hl + 0.1), new THREE.Vector2(-hw, hl + 0.1)]);
    shape.holes.push(new THREE.Path([new THREE.Vector2(-1.3, -hl + 0.2), new THREE.Vector2(1.3, -hl + 0.2), new THREE.Vector2(1.1, hl - 0.5), new THREE.Vector2(-1.1, hl - 0.5)]));
    const maskGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
    for (let k = 0; k < PANES; k++) {
      const c = new THREE.Vector3(paneX(k), yMid, zMid).addScaledVector(nIn, 0.19);
      kit.add("brg_frame", maskGeo.clone(), { pos: [c.x, c.y, c.z], quat: tilt });
    }
  }

  // --- corner towers at x ±(22.5..24): dark, with an inset panel, a vertical red slot and an alert lamp
  for (const s of [-1, 1]) {
    const xa = s > 0 ? GLASS_X : X0;
    const xb = s > 0 ? X1 : -GLASS_X;
    const xc = s * (GLASS_X + (X1 - GLASS_X) / 2);
    kit.boxMM("paintedMetal", [xa, 0, Z0 - 0.16], [xb, H, Z0 + 0.75], DARK);
    kit.boxMM("impPanel", [xa + 0.15, 0.3, Z0 + 0.75], [xb - 0.15, H - 0.3, Z0 + 0.77], { color: PALETTE.impMid, uv: "keep" });
    kit.boxMM("paintedMetal", [xc - 0.09, 1.7, Z0 + 0.77], [xc + 0.09, 6.3, Z0 + 0.79], BLACK);
    kit.boxMM("brg_red", [xc - 0.025, 1.8, Z0 + 0.785], [xc + 0.025, 6.2, Z0 + 0.795], {});
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

  // --- reveal tube through the hull (z -49.95..-49.14), seen through the glass at oblique angles and,
  // from outside, as the dark margin between the exterior hole (x ±24.5, y 0.35..6.85, cut through the
  // face plate at z -50..-49.2) and the glass. Unlit black: the exterior sun's shadow map cannot resolve
  // the tower's front edge and leaks ~1.5 m into the room, so a lit material here would render as
  // sunlit grey instead of a dark recess. Starts 5 cm behind the plate's front so the two never z-fight.
  const zA = Z0 - 0.95;
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

  // collider: nothing walks into the apron / sill / glass
  kit.collider([X0, 0, Z0 - 0.2], [X1, H, zApron + 0.2], "windowwall");
}

// ---------------------------------------------------------------------------
// Ceiling: dark panelled grid, transverse ribs with hairline seams, a lowered spine beam over the
// walkway carrying four short dim downlights, blue troughs over the pits, alert lamp housings and
// conduits over the side floors
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
  // transverse ribs with a hairline seam on the underside
  for (const z of [-45.5, -39.5, -33.5, -27.5, -21.5]) {
    kit.boxMM("paintedMetal", [X0, H - 0.6, z - 0.32], [X1, H, z + 0.32], dark);
    kit.boxMM("paintedMetal", [X0, H - 0.66, z - 0.12], [X1, H - 0.6, z + 0.12], BLACK);
    kit.boxMM("brg_hair", [-23.4, H - 0.67, z - 0.015], [23.4, H - 0.66, z + 0.015], {});
    // alert lamp housings at the rib ends and over the pit outer edges
    for (const x of [-22.6, -12.2, 12.2, 22.6]) {
      kit.box("paintedMetal", x, H - 0.78, z, 0.42, 0.24, 0.3, BLACK);
      kit.box("brg_alert", x, H - 0.905, z, 0.3, 0.02, 0.16, {});
    }
  }
  // spine beam over the walkway: dark, with one recessed channel carrying four short dim downlights
  const bx = 2.1;
  const by = H - 0.85;
  kit.boxMM("paintedMetal", [-bx, by, Z0 + 0.9], [bx, H, Z1 - 0.2], dark);
  for (const s of [-1, 1]) kit.boxMM("paintedMetal", [Math.min(s * bx, s * (bx + 0.3)), by + 0.3, Z0 + 0.9], [Math.max(s * bx, s * (bx + 0.3)), H, Z1 - 0.2], { color: PALETTE.impMid, texel: 1.2 });
  kit.boxMM("paintedMetal", [-bx + 0.1, by - 0.05, Z0 + 0.9], [bx - 0.1, by, Z1 - 0.2], BLACK);
  kit.boxMM("paintedMetal", [-0.3, by - 0.09, Z0 + 1.0], [0.3, by - 0.05, Z1 - 0.4], BLACK);
  for (const z of [-42.5, -36.5, -30.5, -24.5]) kit.boxMM("emitWhiteDim", [-0.09, by - 0.085, z - 0.8], [0.09, by - 0.06, z + 0.8], { uv: "keep" });
  for (let z = Z0 + 3.7; z < Z1 - 1; z += 6) kit.boxMM("paintedMetal", [-bx - 0.32, by - 0.12, z - 0.15], [bx + 0.32, by + 0.1, z + 0.15], BLACK);
  // blue troughs over the pits (long segmented bars in a continuous black channel)
  for (const s of [-1, 1]) {
    for (const xo of [5.0, 9.0]) {
      const x = s * xo;
      kit.boxMM("paintedMetal", [x - 0.36, H - 0.2, PIT.z0 + 0.4], [x + 0.36, H, PIT.z1 - 0.4], BLACK);
      for (let z = PIT.z0 + 0.7; z < PIT.z1 - 1.5; z += 2.4) kit.boxMM("emitBlue", [x - 0.12, H - 0.19, z], [x + 0.12, H - 0.17, z + 2.0], {});
    }
  }
  // conduits over the side floors with junction boxes
  for (const s of [-1, 1]) {
    pipeRun(kit, [[s * 16.4, H - 0.22, Z0 + 1.2], [s * 16.4, H - 0.22, Z1 - 0.6]], 0.09, PALETTE.impMid);
    pipeRun(kit, [[s * 16.8, H - 0.16, Z0 + 1.2], [s * 16.8, H - 0.16, Z1 - 0.6]], 0.05, PALETTE.impDark);
    pipeRun(kit, [[s * 15.9, H - 0.16, Z0 + 1.2], [s * 15.9, H - 0.16, Z1 - 0.6]], 0.05, PALETTE.impGrey);
    for (let z = Z0 + 4; z < Z1 - 2; z += 8) {
      kit.box("paintedMetal", s * 16.4, H - 0.22, z, 1.3, 0.34, 0.5, BLACK);
      kit.box("emitBlue", s * 16.4, H - 0.4, z + 0.1, 0.4, 0.02, 0.06, {});
    }
  }
}

// ---------------------------------------------------------------------------
// Crew pits: sunken floor, two rows of canted-back stations in three alternating builds (outer row
// facing the hull, inner row facing the walkway wall, continued aft of the stairs), cabinets for
// variation, aisle grating, railings with a gap at the stairs
// ---------------------------------------------------------------------------
function buildPit(kit, ctx, s) {
  const x0 = Math.min(s * PIT.x0, s * PIT.x1);
  const x1 = Math.max(s * PIT.x0, s * PIT.x1);
  const stairSide = s > 0 ? "xmin" : "xmax";
  pit(kit, ctx, { x0, z0: PIT.z0, x1, z1: PIT.z1, depth: PIT.depth, stairs: { side: stairSide, u: STAIR_Z, w: STAIR_W }, floorMat: "brg_floor", seed: ctx.seed + (s > 0 ? 3 : 5) });
  const y = -PIT.depth;
  const yawOut = s > 0 ? -Math.PI / 2 : Math.PI / 2; // operator faces the hull side
  const yawIn = -yawOut; // operator faces the walkway wall
  const rand = rng(ctx.seed + 100 + s * 7);
  const screenSets = [[0, 1, 2], [1, 2, 0], [0, 2, 1], [2, 0, 1], [0, 0, 2], [1, 0, 2]];
  const gap = 0.45;
  // fill z0..z1 greedily: every fifth slot is a cabinet, the stations cycle through the three builds
  // and fall back to the narrow one when the row is nearly full
  const row = (x, yaw, zStart, zEnd, offset) => {
    let z = zStart;
    let i = offset;
    while (true) {
      const cabinet = i % 5 === 3;
      let variant = i % 3;
      let w = cabinet ? 1.3 : STATION_VARIANTS[variant].w;
      if (z + w > zEnd) {
        if (cabinet || z + STATION_VARIANTS[2].w > zEnd) break;
        variant = 2;
        w = STATION_VARIANTS[2].w;
      }
      const zc = z + w / 2;
      if (cabinet) pitCabinet(kit, x + (s > 0 ? 0.1 : -0.1) * (yaw === yawOut ? 1 : -1), zc, y, yaw, w, ctx.seed + i * 13 + s);
      else {
        pitStation(kit, ctx, {
          x,
          y,
          z: zc,
          yaw,
          variant,
          screens: screenSets[i % screenSets.length],
          pulse: rand() < 0.3 ? "brg_pulse" : null,
          seed: ctx.seed + i * 7 + s * 3,
          lampMat: i % 4 === 2 ? "emitAmber" : "emitBlue",
        });
      }
      z += w + gap;
      i++;
    }
  };
  row(s * (PIT.x1 - 0.62), yawOut, PIT.z0 + 0.5, PIT.z1 - 0.5, 0);
  row(s * (PIT.x0 + 0.62), yawIn, PIT.z0 + 0.5, STAIR_Z - STAIR_W / 2 - 0.35, 2);
  // aft of the stairs the inner row continues: one wide station and a cabinet up to the aft pit wall
  pitStation(kit, ctx, { x: s * (PIT.x0 + 0.62), y, z: -21.5, yaw: yawIn, variant: 0, screens: [2, 1], seed: ctx.seed + 190 + s, lampMat: "emitBlue" });
  pitCabinet(kit, s * (PIT.x0 + 0.52), -19.35, y, yawIn, 1.3, ctx.seed + 195 + s);
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
    kit.boxMM("emitBlue", [xw + (inner > 0 ? 0.0 : -0.03), -0.315, PIT.z0 + 0.3], [xw + (inner > 0 ? 0.03 : 0.0), -0.29, PIT.z1 - 0.3], {});
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

/** Three station builds alternated along a row: width, desk height, top of the canted back, screens. */
const STATION_VARIANTS = [
  { w: 1.9, h: 0.78, top: 1.5, n: 2 },
  { w: 2.3, h: 0.8, top: 1.66, n: 3 },
  { w: 1.6, h: 0.76, top: 1.38, n: 2 },
];

/**
 * Bridge crew station: a desk with a foot-well under the operator edge, a sloped control slab, and a
 * canted back joined to the desk carrying 2–3 bezelled screens. The rear plate carries vent slats, a
 * cable trunk running down to the floor, a status lamp and a stencil, so the rows read from behind
 * (most sightlines on the bridge see the backs). Local frame: operator at +Z, back at -Z. The back
 * tops out below deck level (pit stations) so nothing pokes up beside the walkway.
 */
function pitStation(kit, ctx, { x, y = 0, z, yaw, variant = 0, screens = [0, 1, 2], seed = 1, lampMat = "emitBlue", chair = true, pulse = null, trunk = true }) {
  const V = STATION_VARIANTS[variant % STATION_VARIANTS.length];
  const { w, h } = V;
  const d = 0.85;
  const well = 0.3;
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  const P = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
  const add = (mat, geo, lx, ly, lz, extra = {}, qq = q) => {
    const p = P(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: qq, ...extra });
  };
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
  const rand = rng(seed);
  // --- desk: plinth and body set back from the operator edge (foot-well), dark cheeks, black worktop
  const bodyD = d - well;
  add("paintedMetal", new THREE.BoxGeometry(w, 0.08, bodyD), 0, 0.04, -well / 2, BLACK);
  add("paintedMetal", new THREE.BoxGeometry(w - 0.1, h - 0.14, bodyD - 0.04), 0, 0.08 + (h - 0.14) / 2, -well / 2, DARK);
  add(lampMat, new THREE.BoxGeometry(w - 0.5, 0.02, 0.01), 0, 0.15, d / 2 - well + 0.005); // kick lamp at the back of the foot-well
  add("paintedMetal", new THREE.BoxGeometry(w - 0.4, 0.05, 0.03), 0, h - 0.11, d / 2 - well + 0.01, BLACK); // knee rail
  for (const s of [-1, 1]) {
    add("paintedMetal", new THREE.BoxGeometry(0.05, h - 0.1, bodyD), s * (w / 2 - 0.025), 0.05 + (h - 0.1) / 2, -well / 2, DARK);
    // cheek stencil
    const dq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y_AXIS, (s * Math.PI) / 2));
    add("decal", new THREE.PlaneGeometry(0.26, 0.26), s * (w / 2 + 0.001), h * 0.5, -well / 2, { uv: "keep", uvRect: decalRect((seed + s + 16) % 16) }, dq);
  }
  add("paintedMetal", new THREE.BoxGeometry(w, 0.06, d), 0, h - 0.03, 0, BLACK);
  add("rubber", new THREE.BoxGeometry(w, 0.03, 0.05), 0, h - 0.015, d / 2 - 0.025, { color: PALETTE.rubber });
  // --- sloped control slab on the rear half of the worktop: two button rows, a readout strip, a small screen
  const st = 0.3;
  const qs = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, st)); // operator edge lower
  const sUp = new THREE.Vector3(0, 1, 0).applyQuaternion(qs);
  const sFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(qs);
  const slabL = 0.42;
  const pS = P(0, h + 0.03 + (slabL / 2) * Math.sin(st), -0.12);
  kit.add("paintedMetal", new THREE.BoxGeometry(w - 0.16, 0.05, slabL), { pos: pS.toArray(), quat: qs, color: PALETTE.impBlack, texel: 2 });
  // solid wedge under the slab so it grows out of the worktop instead of floating over it
  kit.add("paintedMetal", new THREE.BoxGeometry(w - 0.18, 0.2, slabL - 0.02), { pos: pS.clone().addScaledVector(sUp, -0.125).toArray(), quat: qs, color: PALETTE.impDark, texel: 1.5 });
  const nb = Math.floor((w - 0.5) / 0.09);
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < nb; i++) {
      const off = -w / 2 + 0.25 + i * 0.09;
      const lit = rand() < 0.3;
      const mat = lit ? (rand() < 0.6 ? "emitBlue" : rand() < 0.5 ? "emitAmber" : "emitRed") : "rubber";
      const c = pS.clone().addScaledVector(right, off).addScaledVector(sFwd, 0.05 + r * 0.08).addScaledVector(sUp, 0.035);
      kit.add(mat, new THREE.BoxGeometry(0.05, 0.022, 0.04), { pos: c.toArray(), quat: qs, color: PALETTE.rubber });
    }
  }
  {
    const c = pS.clone().addScaledVector(right, -w * 0.22).addScaledVector(sFwd, -0.11).addScaledVector(sUp, 0.03);
    kit.add("leds", new THREE.BoxGeometry(w * 0.4, 0.012, 0.05), { pos: c.toArray(), quat: qs, uv: "keep" });
    const c2 = pS.clone().addScaledVector(right, w * 0.25).addScaledVector(sFwd, -0.1).addScaledVector(sUp, 0.03);
    kit.add("darkGloss", new THREE.BoxGeometry(w * 0.34, 0.012, 0.14), { pos: c2.toArray(), quat: qs });
    const sg = new THREE.PlaneGeometry(w * 0.3, 0.11);
    sg.rotateX(-Math.PI / 2);
    kit.add("impScreen4", sg, { pos: c2.clone().addScaledVector(sUp, 0.008).toArray(), quat: qs, uv: "keep" });
  }
  // --- canted back joined to the rear of the worktop, leaning away from the operator
  const bt = 0.14;
  const backH = V.top - h + 0.04;
  const qb = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, -bt));
  const bUp = new THREE.Vector3(0, 1, 0).applyQuaternion(qb);
  const bN = new THREE.Vector3(0, 0, 1).applyQuaternion(qb); // toward the operator, slightly up
  const foot = P(0, h - 0.02, -d / 2 + 0.1);
  const atB = (off, v, lift) => foot.clone().addScaledVector(right, off).addScaledVector(bUp, v).addScaledVector(bN, lift);
  kit.add("paintedMetal", new THREE.BoxGeometry(w, backH, 0.1), { pos: atB(0, backH / 2, 0).toArray(), quat: qb, color: PALETTE.impDark, texel: 1.5 });
  kit.add("paintedMetal", new THREE.BoxGeometry(w + 0.04, 0.06, 0.16), { pos: atB(0, backH - 0.03, 0).toArray(), quat: qb, color: PALETTE.impBlack, texel: 2 });
  const n = V.n;
  const cell = (w - 0.16) / n;
  const sw = cell - 0.08;
  const sh = backH - 0.4;
  for (let i = 0; i < n; i++) {
    const off = -w / 2 + 0.08 + (i + 0.5) * cell;
    const v = 0.26 + sh / 2;
    kit.add("darkGloss", new THREE.BoxGeometry(sw + 0.05, sh + 0.05, 0.012), { pos: atB(off, v, 0.056).toArray(), quat: qb });
    const mat = pulse && i === n - 1 ? pulse : "impScreen" + (screens[i % screens.length] % 5);
    kit.add(mat, new THREE.PlaneGeometry(sw, sh), { pos: atB(off, v, 0.064).toArray(), quat: qb, uv: "keep" });
  }
  kit.add("leds", new THREE.BoxGeometry(w * 0.45, 0.03, 0.01), { pos: atB(-w * 0.15, 0.2, 0.056).toArray(), quat: qb, uv: "keep" });
  kit.add(rand() < 0.75 ? lampMat : "emitRed", new THREE.BoxGeometry(0.14, 0.03, 0.01), { pos: atB(w / 2 - 0.2, 0.2, 0.056).toArray(), quat: qb });
  // --- rear plate: recessed panel, vent slats, status lamp, stencil, cable trunk down to the floor
  const qr = qb.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y_AXIS, Math.PI)); // faces away from the operator
  kit.add("impPanel1", new THREE.BoxGeometry(w - 0.3, backH - 0.3, 0.012), { pos: atB(0, backH / 2, -0.056).toArray(), quat: qb, color: PALETTE.impMid, uv: "keep" });
  for (let i = 0; i < 4; i++) kit.add("paintedMetal", new THREE.BoxGeometry(w * 0.42, 0.025, 0.03), { pos: atB(-w * 0.18, backH * 0.52 + i * 0.07, -0.07).toArray(), quat: qb, color: PALETTE.impBlack, texel: 2 });
  kit.add("paintedMetal", new THREE.BoxGeometry(0.3, 0.12, 0.02), { pos: atB(w * 0.3, backH - 0.2, -0.066).toArray(), quat: qb, color: PALETTE.impBlack, texel: 2 });
  kit.add(rand() < 0.6 ? lampMat : "emitAmber", new THREE.BoxGeometry(0.14, 0.04, 0.01), { pos: atB(w * 0.3, backH - 0.2, -0.078).toArray(), quat: qb });
  kit.add("decal", new THREE.PlaneGeometry(0.3, 0.3), { pos: atB(w * 0.28, backH * 0.38, -0.064).toArray(), quat: qr, uv: "keep", uvRect: decalRect((seed * 7 + variant) % 16) });
  kit.add("leds", new THREE.BoxGeometry(w * 0.3, 0.025, 0.01), { pos: atB(-w * 0.2, backH * 0.3, -0.064).toArray(), quat: qb, uv: "keep" });
  // rear kick and the body's rear panel
  add("paintedMetal", new THREE.BoxGeometry(w, 0.1, 0.03), 0, 0.05, -d / 2 - 0.015, BLACK);
  add("impPanel", new THREE.BoxGeometry(w - 0.3, h - 0.4, 0.012), 0, 0.12 + (h - 0.4) / 2, -d / 2 - 0.006, { color: PALETTE.impMid, uv: "keep" });
  add("hazard", new THREE.BoxGeometry(w * 0.5, 0.05, 0.012), 0, 0.3, -d / 2 - 0.012, { texel: 3 });
  if (trunk) {
    const tx = -w * 0.32;
    const th = h + backH * Math.cos(bt) - 0.32;
    const tg = new THREE.CylinderGeometry(0.035, 0.035, th, 10);
    add("metal", tg, tx, th / 2, -d / 2 - 0.09, { color: PALETTE.impDark, uv: "scale", uvScale: [0.22, th] });
    for (const yy of [0.35, h + 0.15]) add("metal", new THREE.BoxGeometry(0.12, 0.06, 0.12), tx, yy, -d / 2 - 0.05, { color: PALETTE.impBlack });
    add("paintedMetal", new THREE.BoxGeometry(0.22, 0.05, 0.42), tx, 0.025, -d / 2 - 0.26, BLACK);
    add("paintedMetal", new THREE.BoxGeometry(0.34, 0.08, 0.2), tx, 0.04, -d / 2 - 0.42, DARK);
  }
  if (chair) impChair(kit, ctx, { x: P(0, 0, d / 2 + 0.42).x, z: P(0, 0, d / 2 + 0.42).z, y, yaw });
  // collider (axis-aligned bound of the rotated footprint incl. the trunk stub behind)
  const cz = -0.1;
  const dz = d + 0.2;
  const c = Math.abs(Math.cos(yaw));
  const sn = Math.abs(Math.sin(yaw));
  const cc = P(0, 0, cz);
  const ex = (w * c + dz * sn) / 2;
  const ez = (w * sn + dz * c) / 2;
  kit.collider([cc.x - ex, y, cc.z - ez], [cc.x + ex, y + V.top, cc.z + ez], "station");
}

/** Free-standing dark equipment cabinet with lit slots (breaks up the console rows). */
function pitCabinet(kit, x, z, y, yaw, w, seed) {
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
  const add = (mat, geo, lx, ly, lz, extra = {}, qq = q) => {
    const p = local(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: qq, ...extra });
  };
  const h = 1.5;
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
  // rear face: vent slats and a stencil (the cabinets sit in the rows, seen from both sides)
  for (let i = 0; i < 5; i++) add("paintedMetal", new THREE.BoxGeometry(w * 0.6, 0.025, 0.02), 0, h * 0.62 + i * 0.07, -d / 2 - 0.01, BLACK);
  add("decal", new THREE.PlaneGeometry(0.3, 0.3), 0, h * 0.35, -d / 2 - 0.004, { uv: "keep", uvRect: decalRect(seed % 16) }, q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y_AXIS, Math.PI)));
  const c = Math.abs(Math.cos(yaw));
  const sn = Math.abs(Math.sin(yaw));
  const ex = (w * c + d * sn) / 2;
  const ez = (w * sn + d * c) / 2;
  kit.collider([x - ex, y, z - ez], [x + ex, y + h, z + ez], "cabinet");
}

// ---------------------------------------------------------------------------
// Walkway: the black spine. One dim recessed strip per side just inside the railings, a threshold
// plate at the forward apron; nothing else on the deck pulls the eye off the glass.
// ---------------------------------------------------------------------------
function buildWalkway(kit) {
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [s * 2.72 - 0.06, 0, PIT.z0 - 0.3], [s * 2.72 + 0.06, 0.02, STAIR_Z - 1.0], BLACK);
    kit.boxMM("emitWhiteDim", [s * 2.72 - 0.015, 0.02, PIT.z0], [s * 2.72 + 0.015, 0.028, STAIR_Z - 1.2], { uv: "keep" });
  }
  kit.boxMM("paintedMetal", [-2.9, 0, Z0 + 1.2], [2.9, 0.012, Z0 + 1.4], BLACK);
}

// ---------------------------------------------------------------------------
// Commander's position: a raised platform just inside the blast door carrying a low holo dais
// (tactical display + a spinning projection of the ship) with two rim consoles on its aft side,
// and two standing lectern consoles at the platform's forward corners facing the commander
// ---------------------------------------------------------------------------
function buildCommand(kit, ctx, mats) {
  const { y, hz } = CMD;
  platform(kit, ctx, { x0: -2.8, z0: CMD.z0, x1: 2.8, z1: CMD.z1, y, mat: "brg_floor", edge: false });
  // black step faces: the platform stays part of the black spine (no lit channels)
  kit.boxMM("paintedMetal", [-2.88, 0, CMD.z0 - 0.08], [2.88, 0.1, CMD.z1 + 0.08], DARK);
  kit.boxMM("paintedMetal", [-2.84, 0.1, CMD.z0 - 0.04], [2.84, y - 0.015, CMD.z1 + 0.04], BLACK);
  holoDais(kit, ctx, mats, 0, y, hz);
  // lectern consoles at the forward corners, screens toward the commander (operator side = aft), with
  // a vertical screen bank on the far edge; the passage between each lectern and the dais stays open
  for (const s of [-1, 1]) {
    slabConsole(kit, {
      x: s * 2.3,
      y,
      z: CMD.z0 + 0.42,
      yaw: 0,
      w: 0.9,
      d: 0.5,
      h: 1.1,
      tilt: 0.4,
      screens: [s > 0 ? "impScreen1" : "impScreen0"],
      riser: 0.42,
      riserScreens: s > 0 ? ["impScreen2", "impScreen0"] : ["brg_pulse", "impScreen2"],
      pulse: "brg_pulse",
      lampMat: "emitBlue",
      seed: ctx.seed + 300 + s,
    });
  }
}

/** Low octagonal holo dais: lit rings, two rim consoles on the aft side, tactical + ship holograms. */
function holoDais(kit, ctx, mats, x, yBase, z) {
  const top = yBase + 0.28;
  kit.cyl("paintedMetal", x, yBase + 0.03, z, DAIS_R, 0.06, "y", { color: PALETTE.impBlack, segments: 8 });
  kit.cyl("paintedMetal", x, yBase + 0.16, z, DAIS_R - 0.05, 0.2, "y", { color: PALETTE.impDark, segments: 8 });
  kit.cyl("brg_top", x, top - 0.01, z, DAIS_R - 0.03, 0.03, "y", { segments: 8 });
  const flat = (geo, yy, mat, opts = {}) => {
    geo.rotateX(-Math.PI / 2);
    kit.add(mat, geo, { pos: [x, yy, z], ...opts });
  };
  flat(new THREE.RingGeometry(0.8, 0.87, 48), top + 0.006, "brg_ring");
  flat(new THREE.RingGeometry(0.96, 1.0, 48), top + 0.006, "metal", { color: PALETTE.impMid });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    kit.box("brg_ring", x + Math.cos(a) * (DAIS_R - 0.09), yBase + 0.2, z + Math.sin(a) * (DAIS_R - 0.09), 0.1, 0.03, 0.1, {});
  }
  // rim consoles: two angled control slabs on the aft rim (the commander stands between them)
  for (const s of [-1, 1]) {
    const a = s * 0.62;
    slabConsole(kit, { x: x + Math.sin(a) * (DAIS_R - 0.17), y: top, z: z + Math.cos(a) * (DAIS_R - 0.17), yaw: a, w: 0.7, d: 0.38, h: 0.36, screens: [s > 0 ? "impScreen0" : "brg_pulse"], seed: ctx.seed + 40 + s, collide: false });
  }
  kit.collider([x - DAIS_R, yBase, z - DAIS_R], [x + DAIS_R, top + 0.5, z + DAIS_R], "holotable"); // taller than a step: nobody climbs onto the table

  // tactical hologram: the helper's disc + contacts, plus pins under each contact, range rings and a rim ring
  const hy = top + 0.38;
  const scale = 0.825;
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
    const mk = new THREE.RingGeometry(0.06, 0.09, 16);
    mk.rotateX(-Math.PI / 2);
    mk.translate(cx, 0.004, cz);
    extra.push(mk);
  }
  for (const [r0, r1] of [[0.4, 0.418], [0.8, 0.818], [1.4 * scale + 0.03, 1.4 * scale + 0.09]]) {
    const rg = new THREE.RingGeometry(r0, r1, 56);
    rg.rotateX(-Math.PI / 2);
    rg.translate(0, 0.003, 0);
    extra.push(rg);
  }
  for (const a of [0, Math.PI / 2]) {
    const bar = new THREE.BoxGeometry(2.8 * scale, 0.006, 0.014);
    bar.rotateY(a);
    bar.translate(0, 0.004, 0);
    extra.push(bar);
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
  // the ship itself above the tactical plot (kept below eye level so it sits against the dark sill
  // from the aft door rather than against the planet through the glass)
  shipHologram(ctx, mats, x, hy + 0.6, z, 0.42);
  // faint projector cone from the dais up to the plot
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.4 * scale, 0.5, hy - top - 0.02, 32, 1, true), mats.cone);
  cone.position.set(x, (top + hy) / 2, z);
  cone.castShadow = false;
  cone.receiveShadow = false;
  ctx.mesh(cone);
}

/**
 * Holographic Star Destroyer: two-tier wedge hull, ventral hangar bulge, neck + bridge tower with its
 * two sensor domes, five engine bells. Faint additive fill under a bright wire outline (two draw
 * calls), pitched nose-up so it reads from eye level, spinning slowly with a small bob.
 */
function shipHologram(ctx, mats, x, y, z, scale) {
  const parts = [];
  const wedge = (nose, aft, halfAft, halfNose, thick, y0) => {
    const pts = halfNose > 0 ? [[-halfNose, nose], [halfNose, nose], [halfAft, aft], [-halfAft, aft]] : [[0, nose], [halfAft, aft], [-halfAft, aft]];
    const shape = new THREE.Shape(pts.map(([px, pz]) => new THREE.Vector2(px, pz)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
    g.rotateX(Math.PI / 2); // shape y -> z, extrusion -> -y
    g.translate(0, y0 + thick, 0);
    return g;
  };
  const box = (sx, sy, sz, bx, by, bz) => {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    g.translate(bx, by, bz);
    return g;
  };
  parts.push(wedge(-1.6, 1.5, 0.95, 0, 0.14, -0.07)); // lower hull
  parts.push(wedge(-0.55, 1.35, 0.6, 0.14, 0.12, 0.07)); // upper tier
  parts.push(box(0.22, 0.3, 0.32, 0, 0.34, 0.98)); // neck
  parts.push(box(0.64, 0.12, 0.22, 0, 0.55, 0.98)); // bridge
  for (const s of [-1, 1]) {
    const dome = new THREE.SphereGeometry(0.07, 6, 4);
    dome.translate(s * 0.3, 0.68, 0.98);
    parts.push(dome);
  }
  parts.push(box(0.5, 0.1, 0.9, 0, -0.12, 0.45)); // ventral hangar bulge
  for (const [ex, r] of [[-0.32, 0.11], [0, 0.11], [0.32, 0.11], [-0.62, 0.06], [0.62, 0.06]]) {
    const c = new THREE.CylinderGeometry(r, r * 0.8, 0.26, 8);
    c.rotateX(Math.PI / 2);
    c.translate(ex, r > 0.1 ? -0.01 : 0.01, 1.63);
    parts.push(c);
  }
  const geos = parts.map((g) => {
    const ng = g.index ? g.toNonIndexed() : g;
    for (const key of Object.keys(ng.attributes)) if (!["position", "normal", "uv"].includes(key)) ng.deleteAttribute(key);
    if (!ng.attributes.normal) ng.computeVertexNormals();
    return ng;
  });
  const hull = mergeGeometries(geos, false);
  hull.scale(scale, scale, scale);
  const fill = new THREE.Mesh(hull, mats.fill);
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(hull, 20), mats.line);
  for (const o of [fill, outline]) {
    o.castShadow = false;
    o.receiveShadow = false;
  }
  const sub = new THREE.Group();
  sub.rotation.x = 0.2;
  sub.add(fill, outline);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.add(sub);
  ctx.mesh(group);
  ctx.anim((dt, t) => {
    group.rotation.y = t * 0.25 + 0.6;
    group.position.y = y + Math.sin(t * 0.8 + 1.3) * 0.03;
  });
  return group;
}

/**
 * Compact standing console built the way the bridge needs it: the operator stands at local +Z and
 * the top slab rises away from them, so its screens face the operator (and anyone behind them).
 * `screens` are material names. h < 0.6 builds just the slab on a short block (dais rim consoles).
 * `riser` > 0 adds a vertical screen bank standing on the slab's far edge, with a detailed rear plate.
 */
function slabConsole(kit, { x, y, z, yaw, w = 0.8, d = 0.5, h = 1.15, screens = ["impScreen0"], tilt = 0.5, lampMat = "emitBlue", pulse = null, seed = 1, collide = true, riser = 0, riserScreens = null }) {
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
    add("leds", new THREE.BoxGeometry(w * 0.45, 0.03, 0.01), -w * 0.12, bodyH - 0.3, d / 2 - 0.058, { uv: "keep" });
    add("decal", new THREE.PlaneGeometry(0.2, 0.2), w * 0.28, bodyH - 0.3, d / 2 - 0.057, { uv: "keep", uvRect: decalRect((seed + 3) % 16) });
    for (const s of [-1, 1]) add("paintedMetal", new THREE.BoxGeometry(0.04, bodyH - 0.2, d - 0.04), s * (w / 2 - 0.02), 0.1 + (bodyH - 0.2) / 2, -0.02, BLACK);
    // rear plate (faces away from the operator): recessed panel with vent slats and a lamp
    const zr = -0.02 - (d - 0.1) / 2;
    add("impPanel1", new THREE.BoxGeometry(w - 0.2, bodyH - 0.3, 0.012), 0, 0.12 + (bodyH - 0.3) / 2, zr - 0.006, { color: PALETTE.impMid, uv: "keep" });
    for (let i = 0; i < 4; i++) add("paintedMetal", new THREE.BoxGeometry(w * 0.5, 0.02, 0.02), 0, bodyH * 0.5 + i * 0.06, zr - 0.015, BLACK);
    add(lampMat, new THREE.BoxGeometry(0.12, 0.03, 0.01), w * 0.25, bodyH * 0.3, zr - 0.017);
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
  if (riser > 0) {
    // vertical screen bank standing on the slab's far edge, leaning back a little, facing the operator
    const rq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, -0.12));
    const rUp = new THREE.Vector3(0, 1, 0).applyQuaternion(rq);
    const rN = new THREE.Vector3(0, 0, 1).applyQuaternion(rq);
    const foot = pS.clone().addScaledVector(fwd, -slabD / 2 + 0.06).addScaledVector(up, 0.03);
    const c = foot.clone().addScaledVector(rUp, riser / 2);
    kit.add("paintedMetal", new THREE.BoxGeometry(w, riser, 0.08), { pos: c.toArray(), quat: rq, color: PALETTE.impDark, texel: 1.5 });
    const rs = riserScreens || screens;
    const rn = rs.length;
    const rcell = (w - 0.12) / rn;
    const rsw = rcell - 0.06;
    const rsh = riser - 0.16;
    for (let i = 0; i < rn; i++) {
      const off = -w / 2 + 0.06 + (i + 0.5) * rcell;
      const sc = c.clone().addScaledVector(right, off).addScaledVector(rN, 0.045);
      kit.add("darkGloss", new THREE.BoxGeometry(rsw + 0.04, rsh + 0.04, 0.01), { pos: sc.toArray(), quat: rq });
      kit.add(rs[i], new THREE.PlaneGeometry(rsw, rsh), { pos: sc.clone().addScaledVector(rN, 0.007).toArray(), quat: rq, uv: "keep" });
    }
    const topc = foot.clone().addScaledVector(rUp, riser + 0.02);
    kit.add("paintedMetal", new THREE.BoxGeometry(w + 0.04, 0.05, 0.12), { pos: topc.toArray(), quat: rq, color: PALETTE.impBlack, texel: 2 });
    kit.add(lampMat, new THREE.BoxGeometry(0.16, 0.02, 0.02), { pos: topc.clone().addScaledVector(rUp, 0.03).toArray(), quat: rq });
    // rear plate detail for the side facing away from the operator
    const rear = c.clone().addScaledVector(rN, -0.045);
    kit.add("impPanel1", new THREE.BoxGeometry(w - 0.14, riser - 0.14, 0.01), { pos: rear.toArray(), quat: rq, color: PALETTE.impMid, uv: "keep" });
    for (let i = 0; i < 3; i++) kit.add("paintedMetal", new THREE.BoxGeometry(w * 0.5, 0.02, 0.02), { pos: rear.clone().addScaledVector(rUp, -riser * 0.25 + i * 0.06).addScaledVector(rN, -0.01).toArray(), quat: rq, color: PALETTE.impBlack, texel: 2 });
    const dq = rq.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y_AXIS, Math.PI));
    kit.add("decal", new THREE.PlaneGeometry(0.22, 0.22), { pos: rear.clone().addScaledVector(rUp, riser * 0.22).addScaledVector(rN, -0.012).toArray(), quat: dq, uv: "keep", uvRect: decalRect(seed % 16) });
  }
  if (collide) {
    const c = Math.abs(Math.cos(yaw));
    const s = Math.abs(Math.sin(yaw));
    const ex = (w * c + slabD * s) / 2;
    const ez = (w * s + slabD * c) / 2;
    kit.collider([x - ex, y, z - ez], [x + ex, y + h + riser, z + ez], "console");
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
// Forward area between the pits and the windows: navigation stations facing the glass (the bridge's
// amber zone: amber lamps and the two amber pools live here)
// ---------------------------------------------------------------------------
function buildForward(kit, ctx) {
  for (const s of [-1, 1]) {
    impConsole(kit, ctx, { x: s * 5.1, z: -46.6, yaw: 0, w: 2.0, screens: [2, 2], chair: true, seed: ctx.seed + 400 + s, lampMat: "emitAmber" });
    impConsole(kit, ctx, { x: s * 7.6, z: -46.6, yaw: 0, w: 2.0, screens: [2, 0], chair: true, seed: ctx.seed + 402 + s, lampMat: "emitAmber" });
    // low equipment plinth between the nav pair and the pit head (keeps the aisle to the side floors open)
    kit.boxMM("paintedMetal", [Math.min(s * 4.2, s * 8.6), 0, -43.6], [Math.max(s * 4.2, s * 8.6), 0.45, -43.1], DARK);
    kit.boxMM("leds", [Math.min(s * 4.5, s * 8.3), 0.3, -43.1], [Math.max(s * 4.5, s * 8.3), 0.34, -43.09], { uv: "keep" });
    kit.collider([Math.min(s * 4.2, s * 8.6), 0, -43.6], [Math.max(s * 4.2, s * 8.6), 0.45, -43.1], "plinth");
  }
}

// ---------------------------------------------------------------------------
// Side floors: wall-mounted displays on a shared datum line, racks and status boards, a tactical
// station pair facing the big display, sensor stations back to back, floor trunks and hatches, and a
// forward station cluster
// ---------------------------------------------------------------------------
function buildSideBay(kit, ctx, s, B, mats) {
  const side = s > 0 ? "xmax" : "xmin";
  const u = (z) => (s > 0 ? z - Z0 : Z1 - z);
  const yawWall = s > 0 ? -Math.PI / 2 : Math.PI / 2; // operator faces the side wall
  const rand = rng(ctx.seed + 500 + s * 11);
  // --- wall furniture (forward to aft); every display's bottom edge sits on DATUM
  equipmentRack(kit, ctx, { side, u: u(-46.4), w: 1.4, h: 2.6, seed: ctx.seed + 1 + s, bounds: B });
  equipmentRack(kit, ctx, { side, u: u(-44.9), w: 1.4, h: 2.6, seed: ctx.seed + 2 + s, bounds: B, lit: "emitAmber" });
  deflectorBoard(kit, side, u(-41.2), B, s);
  display(kit, side, u(-37.2), DATUM + 0.45, 1.6, 0.9, s > 0 ? 1 : 2, B);
  display(kit, side, u(-33), DATUM + 1.15, 4.2, 2.3, 0, B, true);
  display(kit, side, u(-28.8), DATUM + 0.45, 1.6, 0.9, s > 0 ? 2 : 1, B);
  display(kit, side, u(-33), 5.6, 3.0, 0.6, 4, B); // amber status band high on the wall
  equipmentRack(kit, ctx, { side, u: u(-24.6), w: 1.4, h: 2.6, seed: ctx.seed + 3 + s, bounds: B });
  equipmentRack(kit, ctx, { side, u: u(-23.1), w: 1.4, h: 2.6, seed: ctx.seed + 4 + s, bounds: B, lit: s > 0 ? "emitRed" : "emitBlue" });
  display(kit, side, u(-19.5), DATUM + 0.6, 2.2, 1.2, 3, B);
  {
    const seg = wallSegment(B, side);
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    // datum rail tying the displays together, stencils high on the wall
    frame.box("paintedMetal", u(-31), DATUM - 0.12, 0.02, 24, 0.05, 0.04, BLACK);
    frame.add("decal", new THREE.PlaneGeometry(1.1, 1.1), u(-40), 5.6, 0.001, { uv: "keep", uvRect: decalRect(s > 0 ? 2 : 14) });
    frame.add("decal", new THREE.PlaneGeometry(0.8, 0.8), u(-24), 5.3, 0.001, { uv: "keep", uvRect: decalRect(0) });
  }
  // --- tactical station pair facing the big display (their detailed backs face the room)
  pitStation(kit, ctx, { x: s * 20.3, z: -34.4, yaw: yawWall, variant: 0, screens: [0, 1], seed: ctx.seed + 520 + s });
  pitStation(kit, ctx, { x: s * 20.3, z: -31.6, yaw: yawWall, variant: 2, screens: [1, 0], seed: ctx.seed + 522 + s, pulse: "brg_pulse" });
  // --- sensor station: two stations back to back with a spine cabinet between, operators facing ±Z
  pitStation(kit, ctx, { x: s * 16.2, z: -25.15, yaw: 0, variant: 2, screens: [1, 2], seed: ctx.seed + 530 + s, lampMat: "emitAmber", trunk: false });
  pitStation(kit, ctx, { x: s * 16.2, z: -26.85, yaw: Math.PI, variant: 2, screens: [0, 1], seed: ctx.seed + 531 + s, lampMat: "emitAmber", trunk: false });
  kit.box("paintedMetal", s * 16.2, 0.8, -26.0, 1.7, 1.6, 0.34, DARK);
  kit.box("emitAmber", s * 16.2, 1.62, -26.0, 1.1, 0.03, 0.36, {});
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
    // heavy sub-frame under the main tactical display with one readout strip and a label
    frame.box("paintedMetal", u, v - h / 2 - 0.36, 0.1, w + 0.4, 0.26, 0.2, DARK);
    frame.box("leds", u - w * 0.2, v - h / 2 - 0.36, 0.205, w * 0.4, 0.04, 0.01, { uv: "keep" });
    frame.add("decal", new THREE.PlaneGeometry(0.4, 0.4), u - w / 2 - 0.35, v + h / 2, 0.16, { uv: "keep", uvRect: decalRect(9) });
    frame.collider(u - w / 2 - 0.2, u + w / 2 + 0.2, 0, v + h / 2 + 0.2, 0, 0.22, "display");
  }
}

/** Deflector-shield status board: engineering bar gauges, amber lamp column and small readouts. */
function deflectorBoard(kit, side, u, B, s) {
  const seg = wallSegment(B, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, 0);
  const w = 2.8;
  const h = 2.1;
  const v = DATUM + h / 2;
  frame.box("paintedMetal", u, v, 0.09, w, h, 0.18, BLACK);
  frame.box("impPanel1", u, v, 0.185, w - 0.16, h - 0.16, 0.01, { color: PALETTE.impDark, uv: "keep" });
  frame.box("darkGloss", u - 0.3, v + 0.32, 0.195, 1.9, 0.9, 0.01);
  frame.add("impScreen1", new THREE.PlaneGeometry(1.8, 0.8), u - 0.3, v + 0.32, 0.202, { uv: "keep" });
  for (let i = 0; i < 7; i++) frame.box(i === 4 ? "emitRed" : i === 6 ? "emitGreen" : "emitAmber", u + 1.05, v + 0.72 - i * 0.2, 0.198, 0.18, 0.07, 0.012);
  for (let i = 0; i < 3; i++) {
    const x = u - 0.9 + i * 0.9;
    frame.box("darkGloss", x, v - 0.42, 0.195, 0.72, 0.4, 0.01);
    frame.add("impScreen" + [4, 1, 3][i], new THREE.PlaneGeometry(0.64, 0.32), x, v - 0.42, 0.202, { uv: "keep" });
  }
  frame.box("leds", u - 0.2, v - 0.75, 0.198, 1.6, 0.05, 0.012, { uv: "keep" });
  frame.box("hazard", u, v - h / 2 + 0.06, 0.19, w - 0.2, 0.07, 0.012, { texel: 3 });
  frame.add("decal", new THREE.PlaneGeometry(0.36, 0.36), u + 1.05, v - 0.55, 0.203, { uv: "keep", uvRect: decalRect(5) });
  frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), u - 1.0, v + 0.85, 0.203, { uv: "keep", uvRect: decalRect(s > 0 ? 12 : 6) });
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
// Aft wall furniture: dim sign and alert lamps over the blast door, lockers flanking it, ship
// status displays (on the datum, with the status band clear of the waist rail) and rack pairs further out
// ---------------------------------------------------------------------------
function buildAftWall(kit, ctx, B) {
  const u = (x) => X1 - x; // zmax wall runs from +X to -X
  const seg = wallSegment(B, "zmax");
  const { frame } = wallFrame(kit, seg.from, seg.to, 0);
  // sign bar over the door
  frame.box("paintedMetal", u(0), 3.9, 0.06, 3.4, 0.44, 0.12, BLACK);
  frame.box("emitWhiteDim", u(0), 3.9, 0.125, 2.9, 0.14, 0.01);
  for (const s of [-1, 1]) {
    frame.box("paintedMetal", u(s * 2.1), 3.9, 0.1, 0.4, 0.3, 0.2, DARK);
    frame.box("brg_alert", u(s * 2.1), 3.9, 0.205, 0.26, 0.14, 0.01);
    // tall lockers flanking the door
    equipmentRack(kit, ctx, { side: "zmax", u: u(s * 3.6), w: 1.2, h: 2.8, d: 0.5, seed: ctx.seed + 600 + s, bounds: B, lit: "emitAmber" });
    // ship status displays: main display on the datum, amber status band above the waist rail
    display(kit, "zmax", u(s * 8.5), DATUM + 0.85, 3.0, 1.7, s > 0 ? 0 : 1, B);
    display(kit, "zmax", u(s * 8.5), 5.3, 1.8, 0.5, 4, B);
    // rack pairs further out
    equipmentRack(kit, ctx, { side: "zmax", u: u(s * 14.2), w: 1.4, h: 2.6, seed: ctx.seed + 610 + s, bounds: B });
    equipmentRack(kit, ctx, { side: "zmax", u: u(s * 15.7), w: 1.4, h: 2.6, seed: ctx.seed + 611 + s, bounds: B, lit: "emitRed" });
    display(kit, "zmax", u(s * 20), DATUM + 0.45, 1.6, 0.9, 2, B);
    frame.add("decal", new THREE.PlaneGeometry(0.9, 0.9), u(s * 20), 3.4, 0.001, { uv: "keep", uvRect: decalRect(s > 0 ? 0 : 14) });
  }
}

// ---------------------------------------------------------------------------
// Lights (10), zoned: blue in the pits (four, low, strong), red at the two corner towers, amber at
// the navigation stations, one dim cool light per side bay. Nothing over the walkway: it stays near
// black between the blue pits, and the dais is lit by its own hologram and readouts.
// ---------------------------------------------------------------------------
function buildLights(ctx) {
  for (const s of [-1, 1]) for (const z of [-36, -25]) ctx.light(pointLight(0x4a9dff, 11, 11, [s * 7, -0.8, z]));
  for (const s of [-1, 1]) ctx.light(pointLight(0xff3a2a, 3.5, 9, [s * 23.2, 4.5, -47.6]));
  for (const s of [-1, 1]) ctx.light(pointLight(0xffb347, 3, 5.5, [s * 6.3, 1.8, -45.6]));
  for (const s of [-1, 1]) ctx.light(pointLight(0xdde8ff, 3.6, 13, [s * 18, 5.4, -33]));
}
