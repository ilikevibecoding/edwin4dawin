// Fighter maintenance & refuelling bay (workstream HANGAR): 50 × 14 × 80 m west of the main hangar,
// entered through the 16 m blast door in its E wall. Two TIE-sized maintenance cradles with work
// platforms and overhead hoists, parts racks with wing panels leaning against the W wall, fuel
// manifolds, diagnostic consoles, tool walls, floor drains and hazard lanes under orange-amber work
// lights. Room-local coordinates (floor centre, -z forward).
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { HANGAR } from "../spec.js";
import { lux, roomWalls } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { HG_DECAL, hgNumber } from "../textures_hangar.js";
import { rng } from "../kit.js";
import { kitbashTie } from "../fighters/tie.js";
import {
  hgSetup,
  Placer,
  placedKit,
  tiltedBox,
  tube,
  hose,
  deckDecal,
  deckDecalImp,
  dashedLine,
  hgRailing,
  hgRailingGaps,
  hgHazardBorder,
  hgFloorDrain,
  hgHoist,
  hgToolWall,
  hgShelfRack,
  hgBeacons,
  hgFuelBowser,
  hgHoseReel,
  hgToolCart,
  hgToolChest,
  hgPowerBox,
  hgDiagConsole,
  hgScissorLift,
  hgFloorSocket,
  hgDeckLamp,
  hgCrateStack,
  hgPallet,
  hgManifold,
  hgWall,
  hgWallOpenings,
  hgCeiling,
  hgTieCradle,
  hgGratedPit,
  hgLadder,
  hgBollard,
  hgDeckCable,
  hgPowerDroid,
  HG_PALETTE,
} from "./hangar_kit.js";

/** TIE wing panel: elongated hexagon (4.4 × 7.6) with a dark solar face on both sides and a hub. */
function wingPanelGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 3.8);
  s.lineTo(2.2, 2.4);
  s.lineTo(2.2, -2.4);
  s.lineTo(0, -3.8);
  s.lineTo(-2.2, -2.4);
  s.lineTo(-2.2, 2.4);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false });
  g.translate(0, 0, -0.15);
  return g;
}
/**
 * Wing panel standing on the deck at (x, y, z) in the plane facing ±x (before `yaw`), leaning by
 * `lean` radians (positive = top toward -x). The geometry is centred on the panel's own centre so the
 * lean pivots there: the bottom vertex lands at x + sin(lean) · 3.8.
 */
function wingPanel(kit, x, y, z, yaw, lean = 0, opts = {}) {
  const P = new Placer(kit, x, y, z, yaw);
  const q = P.rot({ spin: Math.PI / 2, roll: lean }); // extrude axis (+z) -> +x, then lean about z
  const p = P.p(0, 3.8, 0);
  kit.add("impTrim", wingPanelGeometry(), { pos: [p.x, p.y, p.z], quat: q, color: PALETTE.impBlack, texel: 1 });
  // solar cell faces (both sides) and the hub / pylon stub
  for (const side of [-1, 1]) {
    for (const dx of [-1.15, 1.15]) {
      const f = new THREE.PlaneGeometry(1.9, 7.0);
      if (side < 0) f.rotateY(Math.PI);
      f.translate(dx, 0, side * 0.16);
      kit.add("impGloss", f, { pos: [p.x, p.y, p.z], quat: q, color: new THREE.Color("#1c2026"), uv: "scale", uvScale: [1.9, 7] });
    }
  }
  const hub = new THREE.BoxGeometry(1.1, 1.1, 0.6);
  kit.add("impMetal", hub, { pos: [p.x, p.y, p.z], quat: q, color: PALETTE.impGreyDark, texel: 1 });
  if (opts.pylon !== false) {
    const py = new THREE.CylinderGeometry(0.3, 0.34, 0.9, 10).rotateX(Math.PI / 2).translate(0, 0, 0.6);
    kit.add("impMetal", py, { pos: [p.x, p.y, p.z], quat: q, color: PALETTE.impGrey, uv: "scale", uvScale: [1.9, 0.9] });
  }
  // spars (the raised frame ribs on the face)
  for (const side of [-1, 1]) {
    const spar = new THREE.BoxGeometry(0.16, 6.8, 0.06).translate(0, 0, side * 0.18);
    kit.add("impTrim", spar, { pos: [p.x, p.y, p.z], quat: q, color: PALETTE.impBlack });
    const spar2 = new THREE.BoxGeometry(4.3, 0.14, 0.06).translate(0, 0, side * 0.18);
    kit.add("impTrim", spar2, { pos: [p.x, p.y, p.z], quat: q, color: PALETTE.impBlack });
  }
}

export function buildFighterBay(kit, ctx, room) {
  hgSetup(kit);
  const materials = kit.materials;
  const [W, H, D] = room.size;
  const hx = W / 2;
  const hz = D / 2;
  const tie = HANGAR.tie;
  const accentKey = "emitAmber";
  const rand = rng(777);
  const amberBlink = [];
  const redBlink = [];

  // ---- maintenance cradles (declared first: the deck is split around the grated pit under cradle A)
  const cradles = [
    { x: -8, z: -19, yaw: 0, wing: true }, // fighter with the port wing panel off (on a stand alongside)
    { x: -8, z: 19, yaw: 0, wing: false }, // complete fighter on a hydraulic lift table
  ];
  const wingBottom = 1.1; // wing lower vertex rests here -> ball centre at 1.1 + 3.8
  const ballY = wingBottom + tie.wingH / 2;
  const frameTop = wingBottom + tie.wingH + 1.0;
  const pit = { x0: cradles[0].x - 2.6, x1: cradles[0].x + 2.6, z0: cradles[0].z - 1.3, z1: cradles[0].z + 1.3, edge: 0.3 };
  const ph = { x0: pit.x0 - pit.edge, x1: pit.x1 + pit.edge, z0: pit.z0 - pit.edge, z1: pit.z1 + pit.edge }; // deck hole

  // ---- deck: mid-grey grid plates with seams, tow lane from the blast door, hazard borders
  const deckOpts = { color: HG_PALETTE.deck, texel: 0.35 };
  kit.boxMM("impDeck", [-hx, -0.14, -hz], [hx, 0, ph.z0], deckOpts);
  kit.boxMM("impDeck", [-hx, -0.14, ph.z1], [hx, 0, hz], deckOpts);
  kit.boxMM("impDeck", [-hx, -0.14, ph.z0], [ph.x0, 0, ph.z1], deckOpts);
  kit.boxMM("impDeck", [ph.x1, -0.14, ph.z0], [hx, 0, ph.z1], deckOpts);
  for (let x = -20; x <= 20; x += 10) {
    const spans = x > ph.x0 && x < ph.x1 ? [[-hz + 0.5, ph.z0], [ph.z1, hz - 0.5]] : [[-hz + 0.5, hz - 0.5]];
    for (const [a, b] of spans) kit.boxMM("impTrim", [x - 0.04, 0.0005, a], [x + 0.04, 0.006, b], { color: PALETTE.impBlack, texel: 1 });
  }
  for (let z = -30; z <= 30; z += 10) {
    const spans = z > ph.z0 && z < ph.z1 ? [[-hx + 0.5, ph.x0], [ph.x1, hx - 0.5]] : [[-hx + 0.5, hx - 0.5]];
    for (const [a, b] of spans) kit.boxMM("impTrim", [a, 0.0005, z - 0.04], [b, 0.006, z + 0.04], { color: PALETTE.impBlack, texel: 1 });
  }
  hgGratedPit(kit, pit.x0, pit.z0, pit.x1, pit.z1, 1.7, { edge: pit.edge });
  // tow lane: from the door (x = 25, z -8..8) west to the cradle turn-off, chevron edges + dashed centre
  dashedLine(kit, [24, 0], [-12, 0], { dash: 2.4, gap: 1.8, w: 0.25 });
  kit.boxMM("chevronY", [-12, 0.002, -5.2], [24.5, 0.011, -4.6], { texel: 0.8 });
  kit.boxMM("chevronY", [-12, 0.002, 4.6], [24.5, 0.011, 5.2], { texel: 0.8 });
  deckDecal(kit, HG_DECAL.launch, 16, 0, 4.5, Math.PI / 2, 0.0065);
  deckDecal(kit, HG_DECAL.launch, 6, 0, 4.5, Math.PI / 2, 0.0065);
  // branches to the two cradles
  dashedLine(kit, [-12, -4], [-12, -14], { dash: 2, gap: 1.6, w: 0.2 });
  dashedLine(kit, [-12, 4], [-12, 14], { dash: 2, gap: 1.6, w: 0.2 });
  // door threshold hazard band
  kit.boxMM("chevronY", [23.6, 0.002, -9.5], [24.9, 0.012, 9.5], { texel: 0.6 });

  // ---- maintenance cradles: frame, saddles, clamps, the fighter itself, ball support, platform, hoist
  /** Static TIE merged into this kit at (x, ballY, z) facing `yaw` (nose = -z); opts as kitbashTie. */
  const staticTie = (x, y, z, yaw, opts = {}) => kitbashTie(placedKit(kit, [x, y, z], yaw), opts);
  cradles.forEach((c, ci) => {
    const P = new Placer(kit, c.x, 0, c.z, c.yaw);
    const fx = tie.wingHalfSpan + 0.9; // frame half-width (x)
    const fz = tie.wingW / 2 + 0.8; // frame half-depth (z)
    // base rails (z) and cross rails (x)
    for (const sx of [-fx, fx]) {
      P.box("impTrim", sx, 0.2, 0, 0.45, 0.4, fz * 2 + 0.5, { color: PALETTE.impBlack, texel: 1 });
      P.box("chevronY", sx, 0.2, 0, 0.46, 0.18, fz * 2 + 0.52, { texel: 1 });
    }
    for (const sz of [-fz, fz]) P.box("impTrim", 0, 0.18, sz, fx * 2 + 0.45, 0.36, 0.4, { color: PALETTE.impBlack, texel: 1 });
    // uprights (pale grey so the frame reads against the dark walls) with a lit strip and hazard collars,
    // grey top frame with black corner blocks. Rough painted steel, not impMetal: with the interior
    // environment fill at 0.55 the polished top rail mirrored the environment's light panel into a white
    // bloom at 10 m that read as lamp glare from the spawn
    for (const [sx, sz] of [[-fx, -fz], [fx, -fz], [-fx, fz], [fx, fz]]) {
      P.box("impMetalRough", sx, frameTop / 2, sz, 0.36, frameTop, 0.36, { color: PALETTE.impGrey, texel: 1 });
      P.box("chevronY", sx, 1.6, sz, 0.38, 0.6, 0.38, { texel: 1.5 });
      P.box("chevronY", sx, frameTop - 0.9, sz, 0.38, 0.6, 0.38, { texel: 1.5 });
      P.box(accentKey, sx + (sx < 0 ? 0.19 : -0.19), frameTop * 0.55, sz, 0.015, frameTop * 0.6, 0.08);
      P.box("impTrim", sx, frameTop + 0.25, sz, 0.6, 0.6, 0.6, { color: PALETTE.impBlack, texel: 1 });
      P.collider(sx - 0.2, 0, sz - 0.2, sx + 0.2, frameTop, sz + 0.2, "cradle-post");
    }
    for (const sx of [-fx, fx]) P.box("impMetalRough", sx, frameTop + 0.25, 0, 0.5, 0.5, fz * 2 + 0.5, { color: PALETTE.impGreyDark, texel: 1 });
    for (const sz of [-fz, fz]) P.box("impMetalRough", 0, frameTop + 0.25, sz, fx * 2 + 0.5, 0.5, 0.5, { color: PALETTE.impGreyDark, texel: 1 });
    // wing saddles: V-blocks along z at the wing stations, top clamps hanging from the frame
    for (const sx of [-tie.wingHalfSpan, tie.wingHalfSpan]) {
      P.box("impTrim", sx, 0.6, 0, 0.9, 0.4, tie.wingW - 0.4, { color: PALETTE.impBlack, texel: 1 });
      P.box("impMetal", sx - 0.32, wingBottom - 0.05, 0, 0.16, 0.5, tie.wingW - 0.6, { color: PALETTE.impGrey, roll: -0.35 });
      P.box("impMetal", sx + 0.32, wingBottom - 0.05, 0, 0.16, 0.5, tie.wingW - 0.6, { color: PALETTE.impGrey, roll: 0.35 });
      P.box("rubber", sx, 0.82, 0, 0.5, 0.06, tie.wingW - 0.7, { color: PALETTE.impCharcoal });
      P.box("impTrim", sx, frameTop - 0.5, 0, 0.7, 1.0, 1.4, { color: PALETTE.impBlack, texel: 1 });
      for (const dz of [-0.55, 0.55]) P.box("impMetal", sx, frameTop - 1.25, dz, 0.5, 0.5, 0.25, { color: PALETTE.impGrey });
      P.box(accentKey, sx, frameTop - 0.5, 0.71, 0.4, 0.1, 0.02);
      P.collider(sx - 0.45, 0, -tie.wingW / 2 + 0.2, sx + 0.45, 0.85, tie.wingW / 2 - 0.2, "saddle");
    }
    const ringY = ballY - tie.ballR - 0.15;
    if (ci === 0) {
      // cradle A: the fighter hangs in the clamps with its port wing panel off; two arms rising from the
      // aft cross rail carry a padded ring under the cockpit ball, over the grated pit
      staticTie(c.x, ballY, c.z, c.yaw, { wings: [1] });
      for (const sx of [-0.9, 0.9]) tiltedBox(kit, "impMetal", P.p(sx, 0.36, fz - 0.2), P.p(sx * 0.7, ringY - 0.2, 0.6), 0.18, 0.22, { color: PALETTE.impGrey });
      P.add("impMetal", new THREE.TorusGeometry(1.35, 0.1, 8, 24), 0, ringY, 0, { color: PALETTE.impGreyDark, uv: "scale", uvScale: [1, 1], tilt: Math.PI / 2 });
      P.add("rubber", new THREE.TorusGeometry(1.35, 0.06, 6, 24), 0, ringY + 0.1, 0, { color: PALETTE.impCharcoal, uv: "scale", uvScale: [1, 1], tilt: Math.PI / 2 });
      // the open wing root: pylon stub with exposed conduits, and the removed panel on an A-stand alongside
      P.cyl("impMetal", -tie.wingHalfSpan + 0.9, ballY, 0, 0.34, 0.5, "x", { color: PALETTE.impGreyDark, segments: 12 });
      P.box("impTrim", -tie.wingHalfSpan + 0.62, ballY, 0, 0.08, 0.9, 0.9, { color: PALETTE.impBlack });
      for (const [dy, dz] of [[0.25, 0.2], [-0.2, -0.25], [0.05, -0.05]]) P.cyl("rubber", -tie.wingHalfSpan + 0.58, ballY + dy, dz, 0.05, 0.3, "x", { color: PALETTE.impCharcoal, segments: 6 });
      P.box("emitAmber", -tie.wingHalfSpan + 0.57, ballY + 0.3, -0.25, 0.01, 0.06, 0.06);
      const stand = P.p(-fx - 3.4, 0, -fz - 3.2);
      for (const dz of [-2.4, 2.4]) {
        kit.box("impTrim", stand.x, 4.4, stand.z + dz, 0.26, 8.8, 0.26, { color: PALETTE.impBlack, texel: 1 });
        tiltedBox(kit, "impTrim", new THREE.Vector3(stand.x, 8.6, stand.z + dz), new THREE.Vector3(stand.x - 1.3, 8.0, stand.z + dz), 0.22, 0.22, { color: PALETTE.impBlack });
        kit.box("chevronY", stand.x, 1.2, stand.z + dz, 0.28, 0.5, 0.28, { texel: 1.5 });
      }
      kit.box("rubber", stand.x, 8.7, stand.z, 0.4, 0.2, 5.2, { color: PALETTE.impCharcoal });
      kit.box("impTrim", stand.x, 0.3, stand.z, 0.5, 0.2, 5.2, { color: PALETTE.impBlack });
      const lean = 0.2;
      wingPanel(kit, stand.x + 0.55 - Math.sin(lean) * 3.8, 0.25, stand.z, 0, lean, { pylon: false });
      kit.collider([stand.x - 0.5, 0, stand.z - 2.7], [stand.x + 1.4, 8.8, stand.z + 2.7], "wing-stand");
      hgHazardBorder(kit, stand.x - 0.9, stand.z - 3.1, stand.x + 1.9, stand.z + 3.1, 0.4);
    } else {
      // cradle B: complete fighter, its ball carried on a hydraulic lift table (scissor frame between a
      // base and a padded platform, ram on the diagonal); the saddles and clamps hold the wings
      staticTie(c.x, ballY, c.z, c.yaw);
      const topY = ringY - 0.45;
      P.box("impTrim", 0, 0.14, 0, 2.8, 0.28, 2.2, { color: PALETTE.impBlack, texel: 1 });
      P.box("chevronY", 0, 0.14, 0, 2.82, 0.14, 2.22, { texel: 1.5 });
      P.box("impMetal", 0, topY - 0.12, 0, 2.6, 0.24, 2.0, { color: PALETTE.impGreyDark, texel: 1 });
      P.box("chevronY", 0, topY - 0.12, 0, 2.62, 0.12, 2.02, { texel: 1.5 });
      for (const sx of [-1.15, 1.15]) {
        tiltedBox(kit, "impMetal", P.p(sx, 0.3, -0.9), P.p(sx, topY - 0.25, 0.9), 0.12, 0.2, { color: PALETTE.impGrey });
        tiltedBox(kit, "impMetal", P.p(sx, 0.3, 0.9), P.p(sx, topY - 0.25, -0.9), 0.12, 0.2, { color: PALETTE.impGrey });
      }
      P.cyl("impMetal", 0, (topY + 0.3) / 2, 0, 0.09, topY - 0.5, "y", { color: PALETTE.impGrey, segments: 8, tilt: 0.55 });
      P.box("impTrim", 0, topY + 0.15, 0, 1.4, 0.3, 1.4, { color: PALETTE.impBlack, texel: 1 });
      P.add("rubber", new THREE.TorusGeometry(1.2, 0.12, 8, 24), 0, topY + 0.3, 0, { color: PALETTE.impCharcoal, uv: "scale", uvScale: [1, 1], tilt: Math.PI / 2 });
      P.box("impMetal", 1.5, 0.75, 0, 0.3, 1.2, 0.4, { color: PALETTE.impGreyDark }); // control pedestal
      P.box(accentKey, 1.66, 1.2, 0, 0.02, 0.12, 0.25);
      P.collider(-1.4, 0, -1.1, 1.4, topY + 0.4, 1.1, "lift-table");
      // hose reel run to the fighter: power + fuel lines up to the starboard wing pylon
      const reel = P.p(-fx - 2.6, 0.6, 3.6);
      hose(kit, "rubber", reel, P.p(-tie.wingHalfSpan + 0.2, 0.3, 2.3), 0.05, 0.05, 4, { color: PALETTE.impCharcoal });
      hose(kit, "rubber", P.p(-tie.wingHalfSpan + 0.2, 0.3, 2.3), P.p(-tie.wingHalfSpan + 0.75, ballY - 0.25, 0.6), -0.4, 0.05, 6, { color: PALETTE.impCharcoal });
    }
    // umbilical post at the forward cross rail with hoses up to the ball station
    P.box("impTrim", 0, 0.9, -fz - 0.1, 0.8, 1.4, 0.6, { color: PALETTE.impBlack, texel: 1 });
    P.box("impMetal", 0, 1.1, -fz - 0.41, 0.6, 0.7, 0.02, { color: PALETTE.impCharcoal });
    for (let k = 0; k < 3; k++) P.box([accentKey, "emitAmber", "emitRedImp"][k], -0.18 + k * 0.18, 1.3, -fz - 0.42, 0.07, 0.07, 0.01);
    hose(kit, "rubber", P.p(0.2, 1.5, -fz - 0.1), P.p(0.3, ballY - 0.4, -tie.ballR + 0.2), 0.9, 0.06, 7, { color: PALETTE.impCharcoal });
    hose(kit, "rubber", P.p(-0.2, 1.5, -fz - 0.1), P.p(-0.4, ballY + 0.3, -tie.ballR + 0.3), 1.1, 0.045, 7, { color: PALETTE.impCharcoal });
    P.collider(-0.4, 0, -fz - 0.4, 0.4, 1.6, -fz + 0.2, "umbilical");
    // tool chests and a maintenance ladder at the work face
    if (ci) hgToolChest(kit, 1.8, 27.2, 0.3, { seed: 51, color: PALETTE.impGreyDark });
    else hgToolChest(kit, -1.4, -27.4, Math.PI - 0.2, { seed: 50, color: PALETTE.impRed });
    hgToolChest(kit, c.x - fx - 2.2, c.z + (ci ? -3.4 : 0.6), Math.PI / 2 + 0.15, { seed: 55 + ci, color: PALETTE.impCharcoal });
    hgLadder(kit, c.x + (ci ? 1.6 : -1.4), c.z + fz + 2.6, Math.PI + (ci ? 0.1 : -0.1), 2.8);
    // work platform (grated, y 4.4) on the room side of the cradle with a stair down to the deck
    const px0 = fx + 0.6;
    const platY = ballY - 0.6;
    const pw = 2.6;
    const pd = 6.4;
    const pp0 = P.p(px0, 0, -pd / 2);
    const pp1 = P.p(px0 + pw, 0, pd / 2);
    const X0 = Math.min(pp0.x, pp1.x);
    const X1 = Math.max(pp0.x, pp1.x);
    const Z0 = Math.min(pp0.z, pp1.z);
    const Z1 = Math.max(pp0.z, pp1.z);
    kit.boxMM("impMetalRough", [X0, platY - 0.12, Z0], [X1, platY - 0.02, Z1], { color: PALETTE.impCharcoal, texel: 0.5 });
    kit.boxMM("hangar_grate", [X0 + 0.02, platY - 0.02, Z0 + 0.02], [X1 - 0.02, platY, Z1 - 0.02], { texel: 1 });
    for (const [a, b] of [[X0, X0 + 0.12], [X1 - 0.12, X1]]) kit.boxMM("impTrim", [a, platY - 0.42, Z0], [b, platY - 0.1, Z1], { color: PALETTE.impBlack, texel: 1 });
    for (const [a, b] of [[Z0, Z0 + 0.12], [Z1 - 0.12, Z1]]) kit.boxMM("impTrim", [X0, platY - 0.42, a], [X1, platY - 0.1, b], { color: PALETTE.impBlack, texel: 1 });
    kit.floor(X0, Z0, X1, Z1, platY, "cradle-platform");
    kit.collider([X0, platY - 0.42, Z0], [X1, platY - 0.02, Z1], "cradle-platform-slab");
    kit.colliders[kit.colliders.length - 1].walkable = true;
    // legs
    for (const [lx, lz] of [[X0 + 0.25, Z0 + 0.25], [X1 - 0.25, Z0 + 0.25], [X0 + 0.25, Z1 - 0.25], [X1 - 0.25, Z1 - 0.25]]) {
      kit.box("impTrim", lx, (platY - 0.42) / 2, lz, 0.28, platY - 0.42, 0.28, { color: PALETTE.impBlack, texel: 1 });
      kit.collider([lx - 0.14, 0, lz - 0.14], [lx + 0.14, platY, lz + 0.14], "leg");
    }
    // railings: outer (room) side, both ends except the stair end, cradle side open (work face)
    hgRailing(kit, [X1 - 0.06, Z0], [X1 - 0.06, Z1], platY, { h: 1.1 });
    hgRailing(kit, [X0, Z0 + 0.06], [X1, Z0 + 0.06], platY, { h: 1.1 });
    hgRailingGaps(kit, "x", Z1 - 0.06, X0, X1, platY, [[X0 + 0.9, X0 + 2.1]], { h: 1.1 });
    // stair from the deck up to the platform's aft end (runs along +z away from the platform)
    const sx0 = X0 + 0.9;
    const sx1 = X0 + 2.1;
    const run = 5.6;
    kit.stairs(sx0, Z1, sx1, Z1 + run, "z", Z1 + run, Z1, 0, platY);
    const n = Math.round(platY / 0.18);
    for (let k = 0; k < n; k++) {
      const yt = (platY * (k + 1)) / n;
      const za = Z1 + run - (run * (k + 1)) / n;
      const zb = Z1 + run - (run * k) / n;
      kit.boxMM("impMetalRough", [sx0 + 0.05, yt - 0.05, za], [sx1 - 0.05, yt, zb], { color: PALETTE.impGreyDark, texel: 2 });
      kit.boxMM("chevronY", [sx0 + 0.08, yt + 0.001, za - 0.02], [sx1 - 0.08, yt + 0.008, za + 0.06], { texel: 3 });
    }
    for (const sx of [sx0 + 0.04, sx1 - 0.04]) tiltedBox(kit, "impTrim", new THREE.Vector3(sx, -0.15, Z1 + run), new THREE.Vector3(sx, platY - 0.15, Z1), 0.08, 0.34, { color: PALETTE.impBlack, texel: 1 });
    for (const sx of [sx0 + 0.06, sx1 - 0.06]) {
      const a = new THREE.Vector3(sx, 0, Z1 + run);
      const b = new THREE.Vector3(sx, platY, Z1);
      const up = new THREE.Vector3(0, 1.0, 0);
      tube(kit, "impMetal", a.clone().add(up), b.clone().add(up), 0.035, { color: PALETTE.impGreyDark, segments: 8 });
      tube(kit, "impMetal", a.clone().addScaledVector(up, 0.55), b.clone().addScaledVector(up, 0.55), 0.022, { color: PALETTE.impGreyDark, segments: 8 });
      for (let k = 0; k <= 3; k++) {
        const p = a.clone().lerp(b, k / 3);
        kit.box("impTrim", p.x, p.y + 0.5, p.z, 0.07, 1.0, 0.07, { color: PALETTE.impBlack });
      }
    }
    kit.collider([sx0 - 0.1, 0, Z1], [sx0 + 0.02, platY + 1.1, Z1 + run], "stair-rail");
    kit.collider([sx1 - 0.02, 0, Z1], [sx1 + 0.1, platY + 1.1, Z1 + run], "stair-rail");
    // hooded work light over the platform's work face: the lamp pane is on the underside of the housing,
    // so it lights the ball station without a bare emitter facing the room (glare from the spawn)
    kit.box("impTrim", X0 + 0.3, platY + 2.2, (Z0 + Z1) / 2, 0.5, 0.3, 0.6, { color: PALETTE.impBlack });
    kit.box("emitWhiteDim", X0 + 0.3, platY + 2.04, (Z0 + Z1) / 2, 0.4, 0.02, 0.5);
    kit.box("impTrim", X0 + 0.3, platY + 1.55, (Z0 + Z1) / 2, 0.1, 1.0, 0.1, { color: PALETTE.impBlack });
    deckDecal(kit, hgNumber(ci + 1), c.x + fx + 5.2, c.z - 4.5, 2.2, 0, 0.007);
    // hazard border and clamp sockets on the deck around the cradle
    hgHazardBorder(kit, c.x - fx - 1.0, c.z - fz - 1.0, c.x + fx + 1.0, c.z + fz + 1.0, 0.45);
    for (const [dx, dz] of [[-3.3, -1.4], [3.3, -1.4], [-3.3, 1.4], [3.3, 1.4]]) hgFloorSocket(kit, c.x + dx, c.z + dz);
    deckDecal(kit, HG_DECAL.tie, c.x, c.z, 8.4, 0, 0.0062);
    // overhead hoist runway along x above the cradle; the trolley is parked beside the frame
    hgHoist(kit, "x", -20, 6, c.z, H - 1.1, ci ? c.x - fx - 2.5 : c.x + fx + 1.7, ci ? 4.5 : 7.0, { accentKey, beacons: amberBlink });
    // diagnostic console facing the cradle, power boxes, hose reel, tool cart
    hgDiagConsole(kit, c.x + fx + 5.0, c.z + 2.6, -Math.PI / 2, { seed: 40 + ci, screens: ["scrAmber0", "scrAmber1"], cableTo: [c.x + fx + 0.2, c.z + 3.4], tall: true });
    hgPowerBox(kit, c.x + fx + 5.6, c.z + 5.4, -Math.PI / 2);
    hgHoseReel(kit, c.x - fx - 2.6, c.z + 3.6, Math.PI / 2, { hoseOut: true });
    hgToolCart(kit, c.x + fx + 1.5, c.z - fz - 2.6, 0.4 + ci, { seed: 12 + ci });
    // floor drain under the ball station side
    hgFloorDrain(kit, c.x - fx - 2.0, c.z - 2.0, 1.2, 1.2);
  });

  // ---- third fighter: just towed in, parked on a deck cradle 14 m from the room spawn (local 22, 30),
  //      nose to the door, being refuelled from a bowser with a power droid on its flank — this is what
  //      the spawn looks at (round 2: the TIEs sat 28 m back behind an empty foreground)
  const tow = { x: 12, z: 20, yaw: -Math.PI / 2 };
  {
    const { x: tx, z: tz, yaw: tyaw } = tow;
    hgTieCradle(kit, tx, tz, tyaw);
    staticTie(tx, 0.45 + tie.wingH / 2, tz, tyaw);
    hgHazardBorder(kit, tx - 3.4, tz - 4.3, tx + 4.4, tz + 4.3, 0.4);
    deckDecal(kit, hgNumber(3), tx + 5.6, tz, 2.0, -Math.PI / 2, 0.007);
    // bowser on the port (aft-left from the spawn) side with the fuel line to the wing root
    hgFuelBowser(kit, tx - 6.4, tz + 4.4, 0.12, { seed: 7 });
    hose(kit, "rubber", new THREE.Vector3(tx - 4.2, 0.7, tz + 3.8), new THREE.Vector3(tx - 0.4, 0.25, tz + 3.9), 0.1, 0.06, 4, { color: PALETTE.impCharcoal });
    hose(kit, "rubber", new THREE.Vector3(tx - 0.4, 0.25, tz + 3.9), new THREE.Vector3(tx + 0.2, 0.45 + tie.wingH / 2 - 0.3, tz + 2.6), -0.35, 0.06, 6, { color: PALETTE.impCharcoal });
    // power droid on the door side, cabled to the starboard wing pylon; chest, cable run and bollards
    hgPowerDroid(kit, tx + 5.4, tz - 3.9, Math.PI, { cableTo: [tx + 2.4, tz - 2.9], on: true });
    hgToolChest(kit, tx - 5.2, tz - 4.6, 0.15, { seed: 58, color: PALETTE.impRed });
    hgDeckCable(kit, [[tx - 4.6, tz - 4.1], [tx - 2.9, tz - 3.1], [tx - 1.7, tz - 2.9]]);
    for (const [bx, bz] of [[tx - 3.9, tz - 4.6], [tx + 4.9, tz - 4.6], [tx - 3.9, tz + 5.4], [tx + 4.9, tz + 5.4]]) hgBollard(kit, bx, bz, "emitAmber");
    // sodium work light over the cradle (the only amber light source besides the maintenance cradles): a
    // hooded lamp head on a drop rod, lit by a down-facing spot so the amber stays on the fighter and the
    // deck (a point light here painted a 6 m orange blob on the ceiling slab — the "murky amber" read)
    const lampY = 9.2;
    kit.cyl("impTrim", tx, (H + lampY + 0.3) / 2, tz, 0.05, H - lampY - 0.3, "y", { color: PALETTE.impBlack, segments: 6 });
    kit.box("impTrim", tx, lampY + 0.15, tz, 1.1, 0.3, 1.1, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetalRough", tx, lampY - 0.02, tz, 1.16, 0.06, 1.16, { color: PALETTE.impGreyDark });
    kit.box("emitAmberDim", tx, lampY - 0.06, tz, 0.9, 0.02, 0.9, { uv: "keep" });
    kit.light({ type: "spot", pos: [tx, lampY - 0.1, tz], target: [tx, 0, tz], color: 0xffa040, intensity: lux(lampY, 2.0), distance: 30, angle: 0.75, penumbra: 0.55, priority: 3.1 });
    // foreground at the spawn's feet: a ladder and tool chest waiting by the fighter, a hose reel, and a
    // second deck cable so the first metres read as a working deck instead of bare plate
    hgLadder(kit, tx + 3.2, tz + 6.2, Math.PI + 0.3, 3.0);
    hgToolChest(kit, tx + 6.2, tz + 6.4, 0.5, { seed: 59, color: PALETTE.impGreyDark });
    hgHoseReel(kit, tx + 8.6, tz + 3.4, Math.PI / 2, { hoseOut: false });
    hgDeckCable(kit, [[tx + 6.0, tz + 3.9], [tx + 4.2, tz + 3.4], [tx + 2.6, tz + 2.6]]);
    deckDecalImp(kit, IMP_DECAL.keepClear, tx + 7.5, tz - 2.2, 1.6, -Math.PI / 2, 0.0065);
  }

  // ---- fuel station between the cradles: bowser, manifold cabinet, drums, drains
  hgFuelBowser(kit, -12, 0, Math.PI / 2 + 0.12, { seed: 3 });
  hgScissorLift(kit, -19, -1.5, 0.3, 3.6);
  hgFloorDrain(kit, -3, -8, 1.4, 1.0);
  hgFloorDrain(kit, -3, 8, 1.4, 1.0);
  hgFloorDrain(kit, 12, -6.5, 1.0, 1.0);
  hgFloorDrain(kit, 12, 6.5, 1.0, 1.0);

  // ---- parts racks along the W wall: leaning wing panels in A-frames, shelving with parts
  const wallX = -hx;
  for (const [z0, count] of [[-32, 3], [10, 2]]) {
    // A-frame: two posts with a padded top bar; panels lean against it
    for (const dz of [0, 5.2]) {
      kit.box("impTrim", wallX + 1.3, 4.4, z0 + dz, 0.3, 8.8, 0.3, { color: PALETTE.impBlack, texel: 1 });
      tiltedBox(kit, "impTrim", new THREE.Vector3(wallX + 1.3, 8.6, z0 + dz), new THREE.Vector3(wallX + 0.05, 8.0, z0 + dz), 0.24, 0.24, { color: PALETTE.impBlack });
      kit.collider([wallX + 1.1, 0, z0 + dz - 0.2], [wallX + 1.5, 8.8, z0 + dz + 0.2], "aframe");
    }
    kit.box("rubber", wallX + 1.3, 8.7, z0 + 2.6, 0.4, 0.2, 5.6, { color: PALETTE.impCharcoal });
    kit.box("impTrim", wallX + 1.3, 0.5, z0 + 2.6, 0.5, 0.2, 5.6, { color: PALETTE.impBlack });
    for (let k = 0; k < count; k++) {
      const lean = 0.17 + k * 0.045;
      const bottomX = wallX + 1.9 + k * 0.62;
      wingPanel(kit, bottomX - Math.sin(lean) * 3.8, 0.25, z0 + 2.6 + (rand() - 0.5) * 0.3, 0, lean, { pylon: k === 0 });
    }
    kit.collider([wallX + 0.4, 0, z0 - 0.4], [wallX + 2.6 + count * 0.62, 8.5, z0 + 5.6], "wing-rack");
    hgHazardBorder(kit, wallX + 0.3, z0 - 0.8, wallX + 4.4 + count * 0.62, z0 + 6.0, 0.4);
    deckDecalImp(kit, IMP_DECAL.keepClear, wallX + 5.6, z0 + 2.6, 1.6, Math.PI / 2, 0.0065);
  }
  hgShelfRack(kit, wallX + 0.7, -12, Math.PI / 2, 5.0, 3.8, { seed: 5, levels: 3 });
  hgShelfRack(kit, wallX + 0.7, -5.5, Math.PI / 2, 4.6, 3.8, { seed: 8, levels: 3 });
  hgShelfRack(kit, wallX + 0.7, 2.5, Math.PI / 2, 4.0, 3.2, { seed: 11, levels: 2 });
  hgShelfRack(kit, wallX + 0.7, 30, Math.PI / 2, 5.0, 3.8, { seed: 14, levels: 3 });
  // spare hull rings / ion engine cones on the deck by the racks
  for (const [x, z, r] of [[-20, -4, 1.1], [-19.5, 35, 0.9]]) {
    kit.add("impMetal", new THREE.TorusGeometry(r, 0.14, 8, 24).rotateX(Math.PI / 2), { pos: [x, 0.2, z], color: PALETTE.impGreyDark, uv: "scale", uvScale: [1, 1] });
    kit.collider([x - r - 0.1, 0, z - r - 0.1], [x + r + 0.1, 0.4, z + r + 0.1], "ring");
  }
  kit.cyl("impMetal", -21, 0.9, 36.5, 0.9, 1.8, "y", { color: PALETTE.impGrey, segments: 16, r2: 0.5 });
  kit.collider([-22, 0, 35.5], [-20, 1.8, 37.5], "cone");

  // ---- crates and staging along the N / S walls, spawn corner kept clear (x > 17, z > 23)
  hgCrateStack(kit, 8, -36.5, 0.1, [["b", 0, 0, 0], ["a", 1.6, 0, 0.1, 0.2], ["c", 0.2, 1.2, 0, 0.6]], { seed: 21 });
  hgCrateStack(kit, -2, -36.5, -0.2, [["a", 0, 0, 0], ["a", 0, 1.0, 0.05, 0.1], ["b", 1.6, 0, 0, 0.3]], { seed: 22 });
  hgCrateStack(kit, 6, 36.5, 0.2, [["b", 0, 0, 0], ["c", 1.4, 0, 0.2, 0.9], ["c", 1.4, 0.8, 0.2, 0.4]], { seed: 23 });
  hgPowerBox(kit, 16, -37.6, 0);
  hgPowerBox(kit, 18, 37.6, Math.PI, { on: false });
  hgHoseReel(kit, -8, -37.2, 0);
  hgToolCart(kit, 0, 34.5, 1.9, { seed: 15 });
  // inbound staging beside the tow lane: parts pallets waiting for the cradles (W of the towed-in
  // fighter), a parked lift and cart by the door, a second bowser topping up from the door side
  hgPallet(kit, 3.5, 12.5, 0.15, { seed: 41 });
  hgCrateStack(kit, 1.5, 18.5, -0.1, [["a", 0, 0, 0], ["c", 1.3, 0, 0.2, 0.5], ["c", 0.1, 1.0, 0.1, 0.2]], { seed: 24 });
  hgScissorLift(kit, 19, 13, Math.PI / 2 - 0.2, 2.6);
  hgToolCart(kit, 17.5, 9.2, -1.2, { seed: 16 });
  hgPallet(kit, 12, -17, -0.2, { seed: 42, w: 2.8, d: 2.2 });
  hgCrateStack(kit, 7, -20, 0.3, [["b", 0, 0, 0], ["a", 0.1, 1.2, 0.1, 0.4]], { seed: 25 });
  hgFuelBowser(kit, 17, -20, -0.35, { seed: 4 });
  hgPowerBox(kit, 20, -12, Math.PI / 2);
  for (const z of [-14, 14]) hgDeckLamp(kit, 22.5, z, "emitAmber");

  // ---- walls: industrial, 14 m; blast door on the E wall; tool walls on the N / S plates
  const walls = roomWalls(kit, room);
  // Imperial neutral (shared HG_PALETTE): cool-grey plates on the clean impPanel maps, black ribs, hooded
  // white lamp rows at the 5 m and 8 m levels, white cornices. No wall flood banks: their bare lamp faces
  // at 11.6 m were the glare in the spawn view — the light comes from the recessed ceiling troughs and
  // the hooded lamps, with amber only at the cradles
  const wallOpts = {
    ribPitch: 10,
    plateH: 5,
    rowH: 3,
    floods: false,
    accentKey,
    bigDecals: false,
    ducts: false,
    lightKey: "emitWhiteDim", // lower-band wall lamps share the cornice material (mesh budget: ≤ 50)
    corniceKey: "emitWhiteDim",
    lightBays: false,
    lampRows: true,
    lampKey: "emitWhiteDim",
    lampStep: 3.4,
    plateColor: HG_PALETTE.plate,
    plateAlt: HG_PALETTE.plateAlt,
    upperColor: HG_PALETTE.upper,
    plateKey: "impPanel1",
    ribAccentKey: null,
  };
  hgWall(walls.N.frame, W, H, { ...wallOpts, openings: hgWallOpenings(room, ctx.doors, "N"), seed: 201, tag: "fbN", features: { gear: 0.3, light: 0.15, vent: 0.1, pipes: 0.15, stencil: 0.1 } });
  hgWall(walls.S.frame, W, H, { ...wallOpts, openings: hgWallOpenings(room, ctx.doors, "S"), seed: 203, tag: "fbS", features: { gear: 0.3, light: 0.15, vent: 0.1, pipes: 0.15, stencil: 0.1 } });
  hgWall(walls.W.frame, D, H, { ...wallOpts, openings: hgWallOpenings(room, ctx.doors, "W"), seed: 207, tag: "fbW", features: { light: 0.3, stencil: 0.2 } });
  const eOpen = hgWallOpenings(room, ctx.doors, "E");
  hgWall(walls.E.frame, D, H, { ...wallOpts, openings: eOpen, seed: 209, tag: "fbE" });
  // tool walls: N wall bays (u = lx + 25) and S wall bays (u = 25 - lx)
  hgToolWall(walls.N.frame, 15.5, 4.0, { seed: 31, accentKey, tag: "bench" }); // lx -9.5
  hgToolWall(walls.N.frame, 35.5, 4.0, { seed: 32, accentKey, tag: "bench" }); // lx 10.5
  hgToolWall(walls.S.frame, 15.5, 4.0, { seed: 33, accentKey, tag: "bench" }); // lx 9.5
  hgToolWall(walls.S.frame, 45.5, 3.6, { seed: 34, accentKey, tag: "bench" }); // lx -20.5
  // blast-door dressing: red beacons, hazard lintel, bay stencil
  for (const o of eOpen) {
    const f = walls.E.frame;
    for (const e of [o.u0 - 1.5, o.u1 + 1.5]) {
      const p = f.pos(e, o.v1 + 1.0, 0.62);
      f.box("impTrim", e, o.v1 + 1.0, 0.32, 0.6, 0.6, 0.6, { color: PALETTE.impBlack, texel: 1 });
      redBlink.push([p.x, p.y, p.z, 0.4, 0.4, 0.1]);
    }
    f.box("chevronY", (o.u0 + o.u1) / 2, o.v1 + 0.3, 0.2, o.u1 - o.u0 + 2.6, 0.45, 0.4, { texel: 0.8 });
    f.decal(IMP_DECAL.hazard, (o.u0 + o.u1) / 2, o.v1 + 1.2, 0.08, 1.2);
  }
  // giant bay ident on the W wall upper band and the E wall flanks
  const fw = walls.W.frame;
  fw.decal(IMP_DECAL.bay01, 40, 10.2, 0.08, 4.2);
  walls.E.frame.decal(IMP_DECAL.glyphs3, 14, 9.5, 0.08, 3.0);
  walls.E.frame.decal(IMP_DECAL.glyphs1, 66, 9.5, 0.08, 3.0);
  // fuel / coolant manifolds along the N and S walls at 3.4 m (valve drops between the tool walls)
  const mo = { r: 0.2, step: 10, accentKey, bracket: 1.0 };
  hgManifold(kit, [-20, -hz + 0.9], [20, -hz + 0.9], 3.6, mo);
  hgManifold(kit, [20, hz - 0.9], [-20, hz - 0.9], 3.6, mo);

  // ---- ceiling: beams across x every 10 m, three recessed light troughs, one round duct along the W side
  // troughs behind louvre fins (hgCeiling), cool-grey slab so the key lights read on it
  hgCeiling(kit, -hx, -hz, hx, hz, H, { beamStep: 10, beamAxis: "x", troughsX: [-18, -8, 14], ductsX: [-22.5], lightKey: "emitWhiteDim", beamH: 0.9, slabColor: HG_PALETTE.ceiling, slabKey: "paintedMetal" });
  // deck marker lamps on the tow lane and under the hoists
  for (let x = -10; x <= 22; x += 8) {
    hgDeckLamp(kit, x, -5.6, "emitAmber");
    hgDeckLamp(kit, x, 5.6, "emitAmber");
  }

  // ---- lights: neutral-white key from hooded pendants at mid-height, sodium-amber work floods only at
  // the cradles (down-facing spots). Round 2 "glare": the keys used to sit 0.45 m under the slab inside
  // the trough housings, which only cover 1.8 m — the slab and beams within 1.5 m of each point light
  // got ~180× the deck illuminance and read as white / orange blooms from the spawn. A point light only
  // lights a 14 m room evenly when it hangs near mid-height (7.2 m: the slab gets what the deck gets);
  // the amber floods are spots, so nothing above them is lit at all.
  const amber = 0xffa040;
  const white = HG_PALETTE.keyWhite;
  const PY = 7.2; // pendant height (TIE wing tops are at 8.05, the cradle frames at 10.2: pendants hang over the lanes)
  /**
   * Hooded fixture on a drop rod from the slab: black housing (y..y+0.3), grey rim, an emitter pane on the
   * underside only. A point light for it must sit INSIDE the housing (y + 0.15): every housing / rim / pane
   * face then has the light on its back side (N·L < 0, unlit), whereas a light hung 3 cm under the pane
   * blew the rim out to a 1.2 m white square. Point lights cast no shadows here, so the room is lit as if
   * the housing were not there.
   */
  const fixture = (x, y, z, key, w = 1.1) => {
    kit.cyl("impTrim", x, (H + y + 0.3) / 2, z, 0.05, H - y - 0.3, "y", { color: PALETTE.impBlack, segments: 6 });
    kit.box("impTrim", x, y + 0.15, z, w, 0.3, w, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetalRough", x, y - 0.02, z, w + 0.06, 0.06, w + 0.06, { color: PALETTE.impGreyDark });
    kit.box(key, x, y - 0.06, z, w - 0.2, 0.02, w - 0.2, { uv: "keep" });
  };
  // cradle work floods: spots beside the hoist runway (which runs along x at z = c.z, 12.9 m) aimed at the
  // cradle centre. Priority ≈ the hangar's berth spots (3.0x) so they hold their pool slots with the blast
  // door open (the current cell's +2 boost decides between the two rooms' spots).
  cradles.forEach((c, ci) => {
    const lz = c.z + (ci ? 2.8 : -2.8);
    fixture(c.x, 12.3, lz, "emitAmberDim", 1.3);
    kit.light({ type: "spot", pos: [c.x, 12.2, lz], target: [c.x, 0, c.z], color: amber, intensity: lux(12.2, 2.6), distance: 40, angle: 0.72, penumbra: 0.5, priority: 3.12 - ci * 0.01 });
  });
  // ten pendants on a ≈ 16 m pitch over the lanes and aisles (a 7.2 m mounting height needs the pitch:
  // laterally the falloff is twice as steep as it was from the slab)
  for (const [x, z, k, dist, pr] of [
    [14, 0, 4.0, 60, 0.58], // tow lane
    [18, 31, 3.6, 50, 0.57], // spawn corner (6.7 m from the towed fighter's wing: no blown-out panel)
    [14, -30, 3.2, 50, 0.53], // E forward
    [2, -10, 3.2, 48, 0.52], // centre aisle, forward (6.7 m from the cradle wings)
    [2, 10, 3.2, 48, 0.51], // centre aisle, aft
    [0, -33, 3.0, 48, 0.47], // forward cross aisle
    [0, 33, 3.0, 48, 0.46], // aft cross aisle
    [-20, 0, 3.0, 48, 0.48], // W aisle, centre
    [-19, -31, 3.0, 48, 0.5], // W aisle, forward
    [-19, 29, 3.0, 48, 0.49], // W aisle, aft
  ]) {
    fixture(x, PY, z, "emitWhiteDim");
    kit.light({ type: "point", pos: [x, PY + 0.15, z], color: white, intensity: lux(PY, k), distance: dist, priority: pr });
  }
  kit.light({ type: "point", pos: [19, 8, 0], color: 0xff3b2e, intensity: lux(8, 0.6), distance: 20, priority: 0.3 });
  // amber underlight in the grated pit (lights the pit walls and the fighter's belly through the grate)
  kit.light({ type: "point", pos: [cradles[0].x, -0.7, cradles[0].z], color: 0xffa040, intensity: 5, distance: 10, priority: 0.45 });

  // ---- animated beacons
  hgBeacons(kit, materials, "emitRedImp", redBlink, { period: 1.5, duty: 0.42, min: 0.15, max: 3.6 });
  hgBeacons(kit, materials, "emitAmber", amberBlink, { period: 2.4, duty: 0.5, phase: 0.2, min: 0.2, max: 3.2 });
}
