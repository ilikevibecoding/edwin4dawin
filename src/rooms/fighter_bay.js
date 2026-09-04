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
import {
  hgSetup,
  Placer,
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
  hgPowerBox,
  hgDiagConsole,
  hgScissorLift,
  hgFloorSocket,
  hgDeckLamp,
  hgCrateStack,
  hgManifold,
  hgWall,
  hgWallOpenings,
  hgCeiling,
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

  // ---- deck: dark grid plates with seams, tow lane from the blast door, hazard borders
  kit.boxMM("impDeck", [-hx, -0.14, -hz], [hx, 0, hz], { color: PALETTE.impGreyDark, texel: 0.35 });
  for (let x = -20; x <= 20; x += 10) kit.boxMM("impTrim", [x - 0.04, 0.0005, -hz + 0.5], [x + 0.04, 0.006, hz - 0.5], { color: PALETTE.impBlack, texel: 1 });
  for (let z = -30; z <= 30; z += 10) kit.boxMM("impTrim", [-hx + 0.5, 0.0005, z - 0.04], [hx - 0.5, 0.006, z + 0.04], { color: PALETTE.impBlack, texel: 1 });
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

  // ---- maintenance cradles
  const cradles = [
    { x: -8, z: -19, yaw: 0, wing: true },
    { x: -8, z: 19, yaw: 0, wing: false },
  ];
  const wingBottom = 1.1; // wing lower vertex rests here -> ball centre at 1.1 + 3.8
  const ballY = wingBottom + tie.wingH / 2;
  const frameTop = wingBottom + tie.wingH + 1.0;
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
    // uprights with a lit strip, top frame
    for (const [sx, sz] of [[-fx, -fz], [fx, -fz], [-fx, fz], [fx, fz]]) {
      P.box("impMetal", sx, frameTop / 2, sz, 0.36, frameTop, 0.36, { color: PALETTE.impGreyDark, texel: 1 });
      P.box(accentKey, sx + (sx < 0 ? 0.19 : -0.19), frameTop * 0.55, sz, 0.015, frameTop * 0.6, 0.08);
      P.collider(sx - 0.2, 0, sz - 0.2, sx + 0.2, frameTop, sz + 0.2, "cradle-post");
    }
    for (const sx of [-fx, fx]) P.box("impTrim", sx, frameTop + 0.25, 0, 0.5, 0.5, fz * 2 + 0.5, { color: PALETTE.impBlack, texel: 1 });
    for (const sz of [-fz, fz]) P.box("impTrim", 0, frameTop + 0.25, sz, fx * 2 + 0.5, 0.5, 0.5, { color: PALETTE.impBlack, texel: 1 });
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
    // ball cradle: two arms rising from the aft cross rail to a padded ring under the cockpit ball
    const ringY = ballY - tie.ballR - 0.15;
    for (const sx of [-0.9, 0.9]) tiltedBox(kit, "impMetal", P.p(sx, 0.36, fz - 0.2), P.p(sx * 0.7, ringY - 0.2, 0.6), 0.18, 0.22, { color: PALETTE.impGrey });
    P.add("impMetal", new THREE.TorusGeometry(1.35, 0.1, 8, 24), 0, ringY, 0, { color: PALETTE.impGreyDark, uv: "scale", uvScale: [1, 1], tilt: Math.PI / 2 });
    P.add("rubber", new THREE.TorusGeometry(1.35, 0.06, 6, 24), 0, ringY + 0.1, 0, { color: PALETTE.impCharcoal, uv: "scale", uvScale: [1, 1], tilt: Math.PI / 2 });
    // umbilical post at the forward cross rail with hoses up to the ball station
    P.box("impTrim", 0, 0.9, -fz - 0.1, 0.8, 1.4, 0.6, { color: PALETTE.impBlack, texel: 1 });
    P.box("impMetal", 0, 1.1, -fz - 0.41, 0.6, 0.7, 0.02, { color: PALETTE.impCharcoal });
    for (let k = 0; k < 3; k++) P.box([accentKey, "emitGreen", "emitRedImp"][k], -0.18 + k * 0.18, 1.3, -fz - 0.42, 0.07, 0.07, 0.01);
    hose(kit, "rubber", P.p(0.2, 1.5, -fz - 0.1), P.p(0.3, ballY - 0.4, -tie.ballR + 0.2), 0.9, 0.06, 7, { color: PALETTE.impCharcoal });
    hose(kit, "rubber", P.p(-0.2, 1.5, -fz - 0.1), P.p(-0.4, ballY + 0.3, -tie.ballR + 0.3), 1.1, 0.045, 7, { color: PALETTE.impCharcoal });
    P.collider(-0.4, 0, -fz - 0.4, 0.4, 1.6, -fz + 0.2, "umbilical");
    // wing being fitted: one panel clamped in cradle A, the other side empty (the ball is not ours)
    if (c.wing) {
      const wp = P.p(-tie.wingHalfSpan, wingBottom, 0);
      wingPanel(kit, wp.x, wp.y, wp.z, c.yaw, 0);
    }
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
    // gantry-mounted work light aimed at the ball station, ident stencil
    kit.box("impTrim", X0 + 0.3, platY + 2.2, (Z0 + Z1) / 2, 0.5, 0.3, 0.6, { color: PALETTE.impBlack });
    kit.box("emitWhite", X0 + 0.04, platY + 2.2, (Z0 + Z1) / 2, 0.02, 0.2, 0.5);
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

  // ---- walls: industrial, 14 m; blast door on the E wall; tool walls on the N / S plates
  const walls = roomWalls(kit, room);
  const wallOpts = { ribPitch: 10, plateH: 5, rowH: 3, floodV: 11.6, floodAim: 14, accentKey, bigDecals: false, ducts: false, lightKey: "emitWhiteSoft" };
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

  // ---- ceiling: beams across x every 10 m, two light troughs, one round duct along the W side
  hgCeiling(kit, -hx, -hz, hx, hz, H, { beamStep: 10, beamAxis: "x", troughsX: [-16, 12], ductsX: [-22.5], lightKey: "emitWhiteSoft", beamH: 0.9 });
  // deck marker lamps on the tow lane and under the hoists
  for (let x = -10; x <= 22; x += 8) {
    hgDeckLamp(kit, x, -5.6, "emitAmber");
    hgDeckLamp(kit, x, 5.6, "emitAmber");
  }

  // ---- lights: orange-amber work lights over the cradles and racks, cool key at the door
  const amber = 0xffa040;
  // six fixtures stand in for the default rig's two dozen, so each carries ~2.5× the default output
  kit.light({ type: "point", pos: [-8, 11.5, -19], color: amber, intensity: lux(11.5, 3.0), distance: 64, priority: 0.62 });
  kit.light({ type: "point", pos: [-8, 11.5, 19], color: amber, intensity: lux(11.5, 3.0), distance: 64, priority: 0.61 });
  kit.light({ type: "point", pos: [-18, 10, -22], color: 0xffb060, intensity: lux(10, 2.0), distance: 44, priority: 0.5 });
  kit.light({ type: "point", pos: [-18, 10, 24], color: 0xffb060, intensity: lux(10, 2.0), distance: 44, priority: 0.49 });
  kit.light({ type: "point", pos: [14, 12, 0], color: 0xdfe8ff, intensity: lux(12, 2.6), distance: 60, priority: 0.55 });
  kit.light({ type: "point", pos: [22, 8, 0], color: 0xff3b2e, intensity: lux(8, 0.6), distance: 20, priority: 0.3 });

  // ---- animated beacons
  hgBeacons(kit, materials, "emitRedImp", redBlink, { period: 1.5, duty: 0.42, min: 0.15, max: 3.6 });
  hgBeacons(kit, materials, "emitAmber", amberBlink, { period: 2.4, duty: 0.5, phase: 0.2, min: 0.2, max: 3.2 });
}
