// Emergency Evacuation Bay (Deck B): six escape-pod hatches along the N wall (circular doors set
// back in short launch tubes with heavy frames, hinge blocks, status lights and red chevron
// surrounds), a launch-control console, a countdown board on the W wall, supply lockers and a
// vac-suit rack along the S wall, crates by the door. Red/white route striping and floor arrows
// lead from the blast door to the hatches. Bright white emergency keys, red edge lighting and
// four rotating red beacons (pulsing domes) on the ceiling.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { insideOut, panelWithHoles } from "../kit.js";
import { impRoomShell, impConsole, impWallLight, impWallGear, impCrate, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { wallScreen, locker, cableRun, chairInstance, floorDecal, floorStrip, propFrame } from "./deck_b_props.js";

const RED = "emitRedImp";
const HATCH_X = [-10.5, -6.3, -2.1, 2.1, 6.3, 10.5];
const HATCH_V = 1.55;

export function buildEscapePods(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : RED;
  const walls = impRoomShell(kit, room, ctx.doors, {
    seed: 8819,
    accentKey,
    wall: { panelW: 1.7, features: { vent: 0.06, screen: 0.03 }, altChance: 0.35 },
    // the hatch wall and the wall behind the rack/lockers stay flush: the fittings dress them
    walls: { N: { features: { vent: 0.02 } }, S: { features: { vent: 0.05 } } },
    floor: { lane: false, edgeLight: RED },
    ceiling: { troughs: 3, troughW: 0.5, beamStep: 3.2 },
  });
  const N = walls.N.frame; // u = x + hx
  const S = walls.S.frame; // u = hx - x
  const E = walls.E.frame; // u = z + hz
  const W = walls.W.frame; // u = hz - z

  // --- six pod hatches, feed duct above them, threshold mats and arrows in front
  const labels = [IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03, IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.glyphs3];
  for (let i = 0; i < HATCH_X.length; i++) {
    const x = HATCH_X[i];
    podHatch(kit, N, x + hx, labels[i], i % 4 === 3);
    kit.box("chevronR", x, 0.007, -9.05, 2.2, 0.01, 0.8, { texel: 1.2 });
    floorDecal(kit, IMP_DECAL.arrowRight, x, -7.9, 1.0, Math.PI / 2);
    floorDecal(kit, IMP_DECAL.arrowRight, x, -3.0, 1.0, Math.PI / 2);
    // cable run in the gap to the next frame
    if (i < HATCH_X.length - 1) cableRun(N, x + hx + 1.6, HATCH_X[i + 1] + hx - 1.6, 2.3, { n: 2, seed: 71 + i, r: 0.028, clampStep: 2.0 });
    // feed pipe from the duct to the top of the frame
    kit.cyl("impMetal", x, h - 0.55, -9.15, 0.08, 1.5, "z", { color: PALETTE.impGreyDark, segments: 10 });
    N.cylV("impMetal", x + hx, 3.34, 0.14, 0.08, 0.7, { color: PALETTE.impGreyDark, segments: 10 });
    N.box("impTrim", x + hx, 3.05, 0.14, 0.3, 0.1, 0.3, { color: PALETTE.impBlack });
  }
  // overhead launch-system duct along the hatch wall with hangers, cable run between the frames
  kit.cyl("impMetal", 0, h - 0.55, -8.4, 0.28, w - 1.0, "x", { color: PALETTE.impGreyDark, segments: 16 });
  for (let k = 0; k <= 6; k++) {
    const x = -12.3 + (k * 24.6) / 6;
    kit.box("impTrim", x, h - 0.2, -8.4, 0.12, 0.4, 0.12, { color: PALETTE.impBlack });
    kit.box("impTrim", x, h - 0.55, -8.4, 0.1, 0.7, 0.7, { color: PALETTE.impBlack });
  }
  // striped band along the hatch row and red edge strips along the N and S walls
  stripeRow(kit, -12.5, 12.5, -7.0, 0.16);
  floorStrip(kit, RED, -hx + 0.5, -hz + 0.25, hx - 0.5, -hz + 0.31);
  floorStrip(kit, RED, -hx + 0.5, hz - 0.31, hx - 0.5, hz - 0.25);

  // --- evacuation route from the blast door (E) to the hatch row: dark lane, striped edges, arrows
  kit.boxMM("impMetalRough", [-11.5, 0.002, -1.2], [hx - 0.4, 0.012, 1.2], { color: PALETTE.impGreyDark, texel: 0.7 });
  stripeRow(kit, -11.5, hx - 0.4, -1.27, 0.12);
  stripeRow(kit, -11.5, hx - 0.4, 1.27, 0.12);
  for (let k = 0; k < 8; k++) floorDecal(kit, IMP_DECAL.arrowRight, 10.5 - k * 3.0, 0, 1.1, Math.PI, 0.014);
  for (const s of [-1, 1]) floorDecal(kit, IMP_DECAL.keepClear, hx - 1.8, s * 2.4, 1.3, 0);

  // --- launch control: console with a display column facing the hatches, chair, wall gear
  impConsole(kit, -8.4, 0, -4.6, 2.4, 0.9, { yaw: 0, seed: 44, screens: ["scrRed0", "scrRed1", "scrWhite0"], accentKey: RED, tall: true });
  chairInstance(kit, -8.4, -3.5, 0);
  impWallGear(W, hz + 6.8, 1.6, { seed: 15, accentKey: RED });
  impWallGear(W, hz + 8.2, 1.6, { seed: 16, accentKey: RED });

  // --- countdown / pod status board on the W wall, flanked by red light slots, pod indicator row below
  wallScreen(W, hz, 2.35, 3.2, 1.6, "scrRed0", { accentKey: RED, bezel: 0.2, leds: 3 });
  for (const s of [-1, 1]) {
    W.box("impTrim", hz + s * 2.2, 2.35, 0.07, 0.24, 2.4, 0.08, { color: PALETTE.impBlack });
    W.box(RED, hz + s * 2.2, 2.35, 0.115, 0.08, 2.2, 0.012, { uv: "keep" });
  }
  W.box("impTrim", hz, 1.05, 0.05, 3.4, 0.36, 0.1, { color: PALETTE.impBlack, texel: 1 });
  W.box("impMetal", hz, 1.05, 0.105, 3.3, 0.28, 0.012, { color: PALETTE.impCharcoal, texel: 2 });
  for (let i = 0; i < 6; i++) {
    const u = hz - 1.25 + i * 0.5;
    W.box(i % 4 === 3 ? RED : "emitGreen", u, 1.12, 0.115, 0.14, 0.06, 0.012);
    W.decal(labels[i], u, 0.98, 0.115, 0.14);
  }
  W.decal(IMP_DECAL.restricted, hz - 3.4, 1.3, 0.034, 0.6);
  W.decal(IMP_DECAL.vacuum, hz + 3.4, 1.3, 0.034, 0.6);
  W.collider(hz - 1.8, hz + 1.8, 0.85, 1.25, 0, 0.12, "board");

  // --- S wall: vac-suit rack (W half) and a bank of supply lockers (E half), white sconces above
  suitRack(kit, ctx, -9.6, -3.4, hz - 0.55);
  const lockerX = [2.6, 3.8, 5.0, 6.2];
  for (let i = 0; i < lockerX.length; i++) locker(S, hx - lockerX[i], 1.16, 2.1, { accentKey: RED, doors: 1, color: PALETTE.impWhite, decal: i % 2 ? IMP_DECAL.vacuum : IMP_DECAL.medical, vents: i % 2 === 0 });
  S.box("impTrim", hx - 4.4, 2.25, 0.05, 5.0, 0.3, 0.1, { color: PALETTE.impBlack, texel: 1 });
  S.box("impPanel1", hx - 4.4, 2.25, 0.105, 4.9, 0.22, 0.012, { color: PALETTE.impRed, uv: "world", texel: 1 });
  S.decal(IMP_DECAL.glyphs3, hx - 4.4, 2.25, 0.112, 1.6, { h: 0.2 });
  impWallLight(S, hx - 4.4, 2.9, { key: "emitWhiteSoft", w: 1.2 });
  impWallLight(S, hx + 6.5, 2.9, { key: "emitWhiteSoft", w: 1.2 });
  impWallLight(S, hx + 10.5, 2.9, { key: RED, w: 0.5 });
  impWallLight(S, hx - 10.5, 2.9, { key: RED, w: 0.5 });
  // stretcher hung flat on two wall hooks between the rack and the lockers
  for (const u of [hx + 0.6, hx - 1.2]) {
    S.box("impTrim", u, 1.4, 0.1, 0.16, 0.14, 0.2, { color: PALETTE.impBlack });
    S.box("impTrim", u, 1.5, 0.19, 0.16, 0.34, 0.03, { color: PALETTE.impBlack });
  }
  S.box("impMetal", hx - 0.3, 1.78, 0.2, 2.2, 0.62, 0.05, { color: PALETTE.impGrey, texel: 1 });
  S.box("fabric", hx - 0.3, 1.78, 0.238, 2.0, 0.5, 0.03, { color: PALETTE.impGreyDark, texel: 2 });
  for (const s of [-1, 1]) S.box("impTrim", hx - 0.3 + s * 0.75, 1.78, 0.26, 0.08, 0.6, 0.014, { color: PALETTE.impBlack });
  S.decal(IMP_DECAL.medical, hx - 0.3, 1.78, 0.26, 0.36);
  S.collider(hx - 1.5, hx + 0.9, 1.3, 2.1, 0, 0.3, "stretcher");

  // --- E wall beside the blast door: status board (N side), first-aid cabinet + gear (S side), crates
  wallScreen(E, hz - 4.0, 2.1, 1.6, 0.9, "scrRed1", { accentKey: RED, leds: 2 });
  E.decal(IMP_DECAL.arrowRight, hz - 4.0, 1.25, 0.034, 0.5);
  E.decal(IMP_DECAL.hazard, hz - 6.5, 2.0, 0.034, 0.7);
  medCabinet(E, hz + 3.8, 1.7);
  impWallGear(E, hz + 5.6, 1.6, { seed: 23, accentKey: RED });
  impWallLight(E, hz - 4.0, 3.2, { key: "emitWhiteSoft", w: 1.0 });
  impWallLight(E, hz + 4.6, 3.2, { key: "emitWhiteSoft", w: 1.0 });
  impCrate(kit, 11.4, 0, 8.0, 1.2, 0.8, 1.0, { seed: 3, decal: IMP_DECAL.medical, color: PALETTE.impGrey });
  impCrate(kit, 11.4, 0.8, 8.0, 1.0, 0.7, 0.9, { seed: 4, decal: IMP_DECAL.vacuum, color: PALETTE.impGreyDark });
  impCrate(kit, 10.0, 0, 8.2, 1.0, 0.7, 0.8, { seed: 5, decal: IMP_DECAL.vacuum, color: PALETTE.impGreyDark });
  impCrate(kit, 11.6, 0, 6.5, 0.8, 0.6, 0.8, { seed: 6, decal: IMP_DECAL.medical, color: PALETTE.impGrey });
  kit.box("chevronR", 10.9, 0.004, 7.6, 3.4, 0.008, 3.2, { texel: 0.8 });

  // --- rotating red beacons on the ceiling (attached, pulsing) and the door beacon
  const beacons = [];
  for (const [x, z, phase] of [[-11, -6, 0], [11, -6, 0.5], [-11, 6, 0.25], [11, 6, 0.75], [12.2, 0, 0.4]]) beacons.push(beacon(kit, ctx, x, h, z, phase));
  kit.onUpdate((dt, tt) => {
    for (let i = 0; i < beacons.length; i++) {
      const b = beacons[i];
      b.group.rotation.y += dt * 3.2;
      b.dome.visible = ((tt * 1.6 + b.phase) % 1) < 0.55;
    }
  });

  // --- lights (8): six bright white emergency keys, a red wash over the hatch row, red low at the board
  const drop = h - 0.5;
  let p = 0;
  for (const x of [-8.5, 0, 8.5]) {
    for (const z of [-4.5, 4.5]) {
      kit.light({ type: "point", pos: [x, drop, z], color: 0xeef2ff, intensity: lux(drop, 1.7), distance: 14, priority: 0.55 - p++ * 0.01 });
    }
  }
  kit.light({ type: "point", pos: [0, 2.6, -7.6], color: 0xff4a38, intensity: 7.0, distance: 15, priority: 0.42 });
  kit.light({ type: "point", pos: [-12.0, 1.0, 0], color: 0xff5040, intensity: 3.0, distance: 7, priority: 0.3 });
}

/** Row of alternating red / white floor stripe blocks along x at z (2 mm proud, 8 mm tall). */
function stripeRow(kit, x0, x1, z, wz) {
  const step = 0.5;
  const n = Math.floor((x1 - x0) / step);
  for (let k = 0; k < n; k++) {
    const xa = x0 + k * step;
    kit.boxMM("impPanel1", [xa + 0.01, 0.002, z - wz / 2], [xa + step - 0.01, 0.01, z + wz / 2], { color: k % 2 ? PALETTE.impRed : PALETTE.impWhite, uv: "world", texel: 1 });
  }
}

/**
 * Escape-pod hatch on a wall frame at u: red chevron surround, heavy black frame plate with a
 * circular opening, launch-tube lining with ribs receding to the wall, the round hatch door set
 * back in the tube (rim, dog bolts, boss + handle, viewport, pod label), hinge blocks, latch,
 * status lights and a readout under the opening.
 */
function podHatch(kit, frame, u, label, fault) {
  const v = HATCH_V;
  frame.box("chevronR", u, v, 0.04, 3.0, 2.9, 0.08, { texel: 1.2 });
  // frame plate with the circular opening (n 0.08 .. 0.42), black back plate at the bottom of the tube
  frame.add("impTrim", panelWithHoles(2.6, 2.6, 0.34, [{ x: 0, y: 0, r: 1.0 }]), u, v, 0.25, { color: PALETTE.impBlack, uv: "world", texel: 1 });
  frame.cylN("impTrim", u, v, 0.09, 0.99, 0.02, { color: PALETTE.impBlack, segments: 40 });
  // tube lining (seen from inside) and two ribs receding to the wall
  const tube = insideOut(new THREE.CylinderGeometry(0.99, 0.99, 0.34, 40, 1, true).rotateX(Math.PI / 2));
  frame.add("impPanel1", tube, u, v, 0.25, { color: PALETTE.impGrey, uv: "world", texel: 1 });
  for (const n of [0.17, 0.33]) frame.add("impMetal", new THREE.TorusGeometry(0.97, 0.025, 8, 40), u, v, n, { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
  // the door
  frame.cylN("impPanel1", u, v, 0.15, 0.9, 0.12, { color: PALETTE.impWhite, segments: 40, uv: "world", texel: 1 });
  frame.add("impTrim", new THREE.TorusGeometry(0.86, 0.03, 8, 40), u, v, 0.215, { color: PALETTE.impBlack, uv: "world", texel: 1 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    frame.cylN("impMetal", u + Math.cos(a) * 0.72, v + Math.sin(a) * 0.72, 0.225, 0.05, 0.03, { color: PALETTE.impGrey, segments: 10 });
  }
  frame.cylN("impTrim", u, v, 0.245, 0.28, 0.06, { color: PALETTE.impBlack, segments: 24 });
  frame.box("impMetal", u, v, 0.29, 0.56, 0.08, 0.06, { color: PALETTE.impGrey, texel: 1 });
  frame.box(fault ? "emitRedImp" : "emitGreen", u, v, 0.32, 0.08, 0.05, 0.012);
  frame.cylN("impTrim", u, v + 0.5, 0.212, 0.17, 0.012, { color: PALETTE.impBlack, segments: 24 });
  frame.cylN("impGloss", u, v + 0.5, 0.222, 0.14, 0.02, { segments: 24 });
  frame.decal(label, u - 0.45, v - 0.35, 0.216, 0.34);
  frame.decal(IMP_DECAL.arrowUp, u + 0.45, v - 0.35, 0.216, 0.3);
  // hinge blocks (W side) with a pin, latch block (E side)
  for (const s of [-1, 1]) frame.box("impTrim", u - 1.15, v + s * 0.55, 0.31, 0.3, 0.5, 0.46, { color: PALETTE.impBlack, texel: 1 });
  frame.cylV("impMetal", u - 1.15, v, 0.5, 0.05, 1.7, { color: PALETTE.impGrey, segments: 10 });
  frame.box("impMetal", u + 1.15, v, 0.47, 0.18, 0.34, 0.1, { color: PALETTE.impGreyDark, texel: 1 });
  frame.box("impTrim", u + 1.15, v, 0.53, 0.06, 0.2, 0.03, { color: PALETTE.impBlack });
  // status lights over the opening, readout under it
  frame.box("impTrim", u, v + 1.18, 0.44, 1.1, 0.16, 0.06, { color: PALETTE.impBlack });
  frame.box("emitRedImp", u - 0.3, v + 1.18, 0.475, 0.22, 0.07, 0.012, { uv: "keep" });
  frame.box("emitWhite", u + 0.3, v + 1.18, 0.475, 0.22, 0.07, 0.012, { uv: "keep" });
  frame.box("impGloss", u, v - 1.15, 0.43, 0.6, 0.24, 0.02);
  frame.screen(fault ? "scrRed0" : "scrRed1", u, v - 1.15, 0.442, 0.52, 0.18);
  frame.collider(u - 1.5, u + 1.5, 0, 3.0, 0, 0.56, "hatch");
}

/** Rack of four hanging vac-suits along a wall segment (x0..x1 at z, facing -z), helmet shelf above. */
function suitRack(kit, ctx, x0, x1, z) {
  const cx = (x0 + x1) / 2;
  const len = x1 - x0;
  for (const x of [x0, x1]) kit.box("impTrim", x, 1.25, z, 0.12, 2.5, 0.12, { color: PALETTE.impBlack, texel: 1 });
  kit.cyl("impMetal", cx, 2.36, z, 0.03, len, "x", { color: PALETTE.impGrey, segments: 10 });
  kit.box("impTrim", cx, 2.5, z + 0.15, len + 0.12, 0.05, 0.5, { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impMetal", [x0 + 0.1, 2.525, z - 0.08], [x1 - 0.1, 2.545, z + 0.38], { color: PALETTE.impCharcoal, texel: 1 });
  // spare helmets on the shelf
  for (const x of [x0 + 0.8, cx, x1 - 0.8]) {
    kit.add("impPanel1", new THREE.SphereGeometry(0.17, 14, 10), { pos: [x, 2.72, z + 0.15], color: PALETTE.impWhite, uv: "world", texel: 1 });
    kit.box("impGloss", x, 2.73, z - 0.01, 0.2, 0.1, 0.06);
  }
  const n = 4;
  for (let i = 0; i < n; i++) vacSuit(kit, x0 + ((i + 0.5) * len) / n, z);
  kit.collider([x0 - 0.1, 0, z - 0.45], [x1 + 0.1, 2.6, z + 0.4], "rack");
  kit.boxMM(RED, [x0, 0.002, z - 0.62], [x1, 0.012, z - 0.58]);
}

/** One hanging vac-suit (white enamel body, black joints, gloss visor, red shoulder stripes), facing -z. */
function vacSuit(kit, x, z) {
  const f = propFrame(kit, x, 0, z, 0);
  const white = { color: PALETTE.impWhite, uv: "world", texel: 1 };
  f.box("impMetal", 0, 2.28, 0, 0.04, 0.16, 0.04, { color: PALETTE.impGrey });
  f.add("impPanel1", new THREE.SphereGeometry(0.17, 14, 10), 0, 2.05, 0, white);
  f.box("impGloss", 0, 2.06, -0.14, 0.2, 0.11, 0.06);
  f.cylV("impTrim", 0, 1.88, 0, 0.12, 0.06, { color: PALETTE.impBlack, segments: 14 });
  f.box("impPanel1", 0, 1.54, 0, 0.5, 0.62, 0.3, white);
  f.box("impTrim", 0, 1.62, -0.18, 0.26, 0.16, 0.06, { color: PALETTE.impBlack });
  f.box("emitRedImp", -0.06, 1.64, -0.212, 0.05, 0.04, 0.012);
  f.box("emitGreen", 0.06, 1.64, -0.212, 0.05, 0.04, 0.012);
  for (const s of [-1, 1]) {
    f.box("impTrim", s * 0.3, 1.78, 0, 0.14, 0.14, 0.3, { color: PALETTE.impCharcoal, texel: 1 });
    f.box("emitRedImp", s * 0.3, 1.856, 0, 0.14, 0.012, 0.3, { uv: "keep" });
    const arm = new THREE.CylinderGeometry(0.07, 0.07, 0.62, 10);
    arm.rotateZ(s * 0.14);
    f.add("impPanel1", arm, s * 0.35, 1.38, 0, white);
    f.add("impTrim", new THREE.SphereGeometry(0.075, 10, 8), s * 0.4, 1.04, 0, { color: PALETTE.impCharcoal });
    f.cylV("impPanel1", s * 0.13, 0.82, 0, 0.1, 0.78, { ...white, segments: 10 });
    f.box("impTrim", s * 0.13, 0.36, -0.03, 0.16, 0.14, 0.3, { color: PALETTE.impBlack, texel: 1 });
  }
  f.box("impTrim", 0, 1.22, 0, 0.52, 0.08, 0.32, { color: PALETTE.impBlack, texel: 1 });
  f.box("impTrim", 0, 1.56, 0.22, 0.4, 0.5, 0.16, { color: PALETTE.impCharcoal, texel: 1 });
  f.box("impMetal", 0, 1.56, 0.305, 0.3, 0.3, 0.012, { color: PALETTE.impGreyDark });
}

/** Wall-mounted first-aid cabinet: white box, red cross decal, black frame, red status lamp. */
function medCabinet(frame, u, v) {
  frame.box("impTrim", u, v, 0.14, 0.9, 1.0, 0.28, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impPanel1", u, v, 0.286, 0.8, 0.9, 0.012, { color: PALETTE.impWhite, uv: "world", texel: 1 });
  frame.decal(IMP_DECAL.medical, u, v + 0.08, 0.294, 0.5);
  frame.box("impMetal", u + 0.3, v - 0.3, 0.3, 0.04, 0.16, 0.03, { color: PALETTE.impGrey });
  frame.box(RED, u - 0.3, v - 0.36, 0.293, 0.1, 0.04, 0.012);
  frame.collider(u - 0.45, u + 0.45, v - 0.5, v + 0.5, 0, 0.3, "cabinet");
}

/** Ceiling beacon: black base + cage (merged), red dome and rotating bar (attached). Returns { group, dome, phase }. */
function beacon(kit, ctx, x, y, z, phase) {
  kit.cyl("impTrim", x, y - 0.06, z, 0.18, 0.12, "y", { color: PALETTE.impBlack, segments: 16 });
  kit.cyl("impMetal", x, y - 0.13, z, 0.14, 0.02, "y", { color: PALETTE.impGrey, segments: 16 });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    kit.box("impMetal", x + Math.cos(a) * 0.15, y - 0.28, z + Math.sin(a) * 0.15, 0.02, 0.3, 0.02, { color: PALETTE.impGreyDark });
  }
  kit.cyl("impTrim", x, y - 0.43, z, 0.17, 0.02, "y", { color: PALETTE.impBlack, segments: 16 });
  const group = new THREE.Group();
  group.position.set(x, y - 0.27, z);
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.24, 14), ctx.materials.emitRedImp);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.025, 0.025), ctx.materials.emitRedImp);
  group.add(dome, bar);
  kit.attach(group);
  return { group, dome, phase };
}
