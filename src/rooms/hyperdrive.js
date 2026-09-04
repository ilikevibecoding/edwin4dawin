// Hyperdrive & Propulsion (deck D): an 18 m horizontal hyperdrive core on two cradles, wrapped in
// alternating armour and blue coil rings that pulse in sequence, power conduits arcing to the walls,
// a raised inspection catwalk ring at y = 3 with railings reached by two stair runs, a control pulpit
// on a dais by the door, coolant tanks in the aft corners, a power coupling block at the core's aft
// nozzle, hazard stripes around the cradle footprint, roof trusses and a hoist rail with a slowly
// traversing trolley. Deep blue glow from inside the coil area plus white work lights.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impConsole, impChair, impRailing, impWallGear, impWallLight, impCrate, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { rng } from "../kit.js";
import { ensureDeckDMaterials, shellNoFloor, deckFloor, screenBank, pipe, pipePath, valveWheel, gauge, junctionBox, tank, dais, hazardBorder, decalD, decalImp, DECK_D_DECAL, wallU, warningLamp, cable, solidStairs, catwalk, pulseRings, assembly, truss, blinkers, pendantLamp, ceilingLamp } from "./deck_d_kit.js";

export function buildHyperdrive(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = "emitBlue";
  ensureDeckDMaterials(kit);
  const rand = rng(8811);

  // --- shell
  const walls = shellNoFloor(kit, room, ctx.doors, {
    accentKey,
    seed: 2207,
    wall: { panelW: 2.1, features: { vent: 0.12, equipment: 0.1, conduit: 0.14, light: 0.06, screen: 0.04 }, altChance: 0.3, bands: [3.2, 5.6] },
    ceiling: { troughs: 2, troughW: 0.6, beamStep: 4.2, accentKey },
  });
  deckFloor(kit, -hx, -hz, hx, hz, []);
  // entry lane from the blast door, chevron lanes to both stairs
  kit.boxMM("impMetalRough", [-hx + 0.3, 0.0, -1.3], [-8.3, 0.012, 1.3], { color: PALETTE.impGreyDark, texel: 0.7 });
  for (const s of [-1, 1]) kit.boxMM("impTrim", [-hx + 0.3, 0, s * 1.3 - 0.03], [-8.3, 0.014, s * 1.3 + 0.03], { color: PALETTE.impBlack });
  for (const s of [-1, 1]) {
    kit.boxMM("chevronY", [-12.7, 0.003, s > 0 ? 1.3 : -12.3], [-11.5, 0.009, s > 0 ? 12.3 : -1.3], { texel: 1.0 });
    kit.boxMM("chevronY", [-11.5, 0.003, s > 0 ? 11.7 : -12.3], [-10.5, 0.009, s > 0 ? 12.3 : -11.7], { texel: 1.0 });
  }
  decalImp(kit, IMP_DECAL.arrowRight, [-14.5, 0.016, 0], "up", 1.0);
  decalImp(kit, IMP_DECAL.hazard, [-11.5, 0.016, 0], "up", 0.9);

  // --- the core
  const cy = 3.4;
  const R = 2.6;
  const cx0 = -6;
  const cx1 = 12;
  const cxm = (cx0 + cx1) / 2;
  kit.cyl("impMetal", cxm, cy, 0, R, cx1 - cx0, "x", { color: PALETTE.impGreyDark, segments: 40, texel: 0.5 });
  // armour plate bands between the rings (slightly larger radius, alternating tints) + longitudinal ribs
  const ringXs = [];
  for (let i = 0; i < 15; i++) ringXs.push(cx0 + 1.0 + i * 1.145);
  for (let i = 0; i < ringXs.length - 1; i++) {
    const xa = ringXs[i] + 0.22;
    const xb = ringXs[i + 1] - 0.22;
    kit.cyl(i % 2 ? "impPanel1" : "impMetal", (xa + xb) / 2, cy, 0, R + 0.05, xb - xa, "x", { color: i % 2 ? PALETTE.impGrey : PALETTE.impCharcoal, segments: 40, uv: "world", texel: 0.6 });
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    kit.add("impTrim", new THREE.BoxGeometry(cx1 - cx0 - 1.6, 0.16, 0.34), { pos: [cxm, cy + Math.cos(a) * (R + 0.1), Math.sin(a) * (R + 0.1)], rot: [a, 0, 0], color: PALETTE.impBlack, texel: 1 });
  }
  // coil rings: dark armour tori on even slots, pulsing blue rings on odd slots
  const pulses = [];
  ringXs.forEach((x, i) => {
    if (i % 2 === 0) kit.add("impMetal", new THREE.TorusGeometry(R + 0.16, 0.2, 10, 48), { pos: [x, cy, 0], rot: [0, Math.PI / 2, 0], color: PALETTE.impCharcoal, uv: "scale", uvScale: [12, 1] });
    else {
      kit.add("impTrim", new THREE.TorusGeometry(R + 0.12, 0.13, 8, 48), { pos: [x, cy, 0], rot: [0, Math.PI / 2, 0], color: PALETTE.impBlack, uv: "scale", uvScale: [12, 1] });
      pulses.push({ pos: [x, cy, 0], axis: "x", R: R + 0.19, tube: 0.06, phase: i * 0.55 });
    }
  });
  pulseRings(kit, pulses, { color: PALETTE.impBlue, intensity: 3.0, speed: 2.4, floor: 0.15, segments: [8, 56] });
  // end caps: cone + flange + nozzle stub at both ends
  for (const s of [-1, 1]) {
    const xe = s < 0 ? cx0 : cx1;
    // kit.cyl along x maps the geometry's top (r2) to the -x end
    kit.cyl("impMetal", xe + s * 0.6, cy, 0, s < 0 ? R : 1.5, 1.2, "x", { r2: s < 0 ? 1.5 : R, color: PALETTE.impGreyDark, segments: 40, texel: 0.5 });
    kit.cyl("impTrim", xe + s * 1.3, cy, 0, 1.7, 0.2, "x", { color: PALETTE.impBlack, segments: 32 });
    kit.cyl("impMetal", xe + s * 1.65, cy, 0, 1.05, 0.5, "x", { color: PALETTE.impCharcoal, segments: 32 });
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      kit.cyl("impMetal", xe + s * 1.3, cy + Math.cos(a) * 1.45, Math.sin(a) * 1.45, 0.06, 0.26, "x", { color: PALETTE.impGrey, segments: 8 });
    }
    kit.add(accentKey, new THREE.TorusGeometry(1.1, 0.04, 6, 32), { pos: [xe + s * 1.92, cy, 0], rot: [0, Math.PI / 2, 0] });
  }
  // W nozzle: lit aperture (the intake seen from the door) with a dark iris grille; E nozzle: conduit down into the coupling block
  kit.cyl("impGloss", cx0 - 1.95, cy, 0, 0.9, 0.06, "x", { segments: 24 });
  kit.cyl(accentKey, cx0 - 2.0, cy, 0, 0.82, 0.02, "x", { segments: 24 });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI;
    kit.add("impTrim", new THREE.BoxGeometry(0.03, 1.6, 0.05), { pos: [cx0 - 2.04, cy, 0], rot: [a, 0, 0], color: PALETTE.impBlack });
  }
  kit.cyl("impTrim", cx0 - 2.07, cy, 0, 0.22, 0.05, "x", { color: PALETTE.impBlack, segments: 16 });
  pipePath(kit, [[cx1 + 1.9, cy, 0], [cx1 + 2.6, cy, 0], [cx1 + 2.6, 1.6, 0], [cx1 + 3.1, 1.6, 0]], 0.42, { color: PALETTE.impGreyDark, clampStep: 1.0 });
  // cradles: base slab, inclined struts, saddle band, hazard stencil, oil grime
  for (const cxC of [-3.2, 8.4]) {
    kit.box("impTrim", cxC, 0.3, 0, 1.8, 0.6, 5.8, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", cxC, 0.66, 0, 1.6, 0.12, 5.4, { color: PALETTE.impCharcoal, texel: 1 });
    for (const s of [-1, 1]) {
      const zb = s * 2.5;
      const zt = s * 1.9;
      const L = Math.hypot(zb - zt, cy - 0.7);
      const ang = Math.atan2(zb - zt, cy - 0.7);
      kit.add("impTrim", new THREE.BoxGeometry(1.4, L, 0.35), { pos: [cxC, (0.7 + cy) / 2, (zb + zt) / 2], rot: [-ang, 0, 0], color: PALETTE.impBlack, texel: 1 });
      kit.add("impMetal", new THREE.BoxGeometry(1.2, L - 0.4, 0.06), { pos: [cxC, (0.7 + cy) / 2, (zb + zt) / 2 + s * 0.2], rot: [-ang, 0, 0], color: PALETTE.impCharcoal, texel: 1 });
      decalImp(kit, IMP_DECAL.hazard, [cxC, 0.35, s * (2.9 + 0.006)], s > 0 ? "+z" : "-z", 0.4);
      decalImp(kit, IMP_DECAL.glyphs2, [cxC + 0.6, 0.35, s * (2.9 + 0.006)], s > 0 ? "+z" : "-z", 0.35);
    }
    kit.add("impTrim", new THREE.TorusGeometry(R + 0.28, 0.24, 10, 48), { pos: [cxC, cy, 0], rot: [0, Math.PI / 2, 0], color: PALETTE.impBlack, uv: "scale", uvScale: [12, 1] });
    for (const zz of [-2.2, 2.2]) kit.box("impMetal", cxC, 0.9, zz, 1.9, 0.6, 0.5, { color: PALETTE.impGreyDark, texel: 1 });
    decalD(kit, DECK_D_DECAL.oil, [cxC + 1.6, 0.018, 1.4], "up", 1.5);
  }
  kit.collider([cx0 - 2.0, 0, -3.0], [cx1 + 3.2, cy + R + 0.4, 3.0], "core");
  hazardBorder(kit, cx0 - 2.4, -3.5, cx1 + 3.5, 3.5, 0, 0.32);
  // power conduits arcing from the core top to junction blocks on the N and S walls
  for (const x of [-1.2, 6.9]) {
    for (const s of [-1, 1]) {
      pipePath(kit, [[x, cy + R - 0.6, s * 1.6], [x, cy + R + 0.9, s * 4.0], [x, cy + R + 0.9, s * (hz - 1.2)], [x, cy + R + 0.9, s * (hz - 0.5)]], 0.3, { color: PALETTE.impGreyDark, clampStep: 2.0 });
      kit.box("impTrim", x, cy + R + 0.9, s * (hz - 0.35), 1.3, 1.3, 0.7, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impMetal", x, cy + R + 0.9, s * (hz - 0.72), 1.0, 1.0, 0.04, { color: PALETTE.impCharcoal, texel: 1 });
      for (let k = 0; k < 4; k++) kit.box(k === 2 ? "emitRedImp" : accentKey, x - 0.36 + k * 0.24, cy + R + 1.35, s * (hz - 0.75), 0.06, 0.06, 0.02);
      kit.box("impTrim", x, cy + R + 0.9, s * (hz - 0.74), 0.9, 0.06, 0.02, { color: PALETTE.impBlack });
    }
  }

  // --- catwalk ring at y = 3 (N/S runs, W/E runs) with columns; railings routed around the stair landings
  const Y = 3.0;
  const N0 = -10.5;
  const N1 = 15.5;
  const zi = 3.5;
  const zo = 5.3;
  const eI = N0 + 1.6; // W run east edge
  const eE = N1 - 1.6; // E run west edge
  catwalk(kit, eI, -zo, eE, -zi, Y, { columns: [[-6.5, -zo + 0.35], [-1.5, -zo + 0.35], [3.5, -zo + 0.35], [8.5, -zo + 0.35]], noTrim: ["W", "E"] });
  catwalk(kit, eI, zi, eE, zo, Y, { columns: [[-6.5, zo - 0.35], [-1.5, zo - 0.35], [3.5, zo - 0.35], [8.5, zo - 0.35]], noTrim: ["W", "E"] });
  catwalk(kit, N0, -6.5, eI, 6.5, Y, { columns: [[N0 + 0.5, -2.0], [N0 + 0.5, 2.0]] });
  catwalk(kit, eE, -zo, N1, zo, Y, { columns: [[N1 - 0.5, -2.2], [N1 - 0.5, 2.2]] });
  const rail = (a, b, light = null) => impRailing(kit, a, b, Y, { light, postStep: 1.5 });
  for (const s of [-1, 1]) {
    // outer rails (N/S edges) from the W run's east edge to the E end
    rail([eI, s * (zo - 0.1)], [N1 - 0.1, s * (zo - 0.1)]);
    // inner rails (facing the core), lit
    rail([eI, s * (zi + 0.1)], [eE, s * (zi + 0.1)], accentKey);
    // W run: inner edge segments beside the landings
    rail([eI - 0.1, s * (zo)], [eI - 0.1, s * 6.4]);
  }
  rail([N0 + 0.1, -6.4], [N0 + 0.1, 6.4]); // W run outer (west) edge, full
  rail([eI - 0.1, -zi], [eI - 0.1, zi], accentKey); // W run inner edge facing the nozzle
  rail([eE + 0.1, -zi], [eE + 0.1, zi], accentKey); // E run inner edge facing the aft nozzle
  rail([N1 - 0.1, -zo], [N1 - 0.1, zo]); // E run outer edge
  // stair runs up to the W run landings (rise toward the core along z)
  solidStairs(kit, N0, -11.6, N0 + 1.6, -6.5, "z", -11.6, -6.5, 0, Y, { rails: ["-", "+"], railKey: accentKey });
  solidStairs(kit, N0, 6.5, N0 + 1.6, 11.6, "z", 11.6, 6.5, 0, Y, { rails: ["-", "+"], railKey: accentKey });
  // inspection kit on the catwalk: a toolbox, a portable scanner post, a coiled hose
  impCrate(kit, 3.0, Y, -zo + 0.7, 0.9, 0.5, 0.6, { seed: 12, decal: IMP_DECAL.glyphs1 });
  kit.box("impTrim", 9.0, Y + 0.6, zo - 0.55, 0.3, 1.2, 0.3, { color: PALETTE.impBlack });
  kit.box(accentKey, 9.0, Y + 1.15, zo - 0.55, 0.32, 0.05, 0.32);
  kit.collider([8.8, Y, zo - 0.75], [9.2, Y + 1.3, zo - 0.35], "post");
  kit.add("impMetal", new THREE.TorusGeometry(0.3, 0.05, 8, 20), { pos: [-3.5, Y + 0.06, zo - 0.7], rot: [Math.PI / 2, 0, 0], color: PALETTE.impGreyDark, uv: "scale", uvScale: [4, 1] });

  // --- control pulpit on a dais by the door (two consoles facing the core)
  {
    const x0 = -16.2;
    const x1 = -12.2;
    const z0 = 2.6;
    const z1 = 6.6;
    dais(kit, x0, z0, x1, z1, 0.3);
    for (const z of [3.6, 5.6]) {
      impConsole(kit, -13.2, 0.32, z, 1.7, 0.9, { yaw: -Math.PI / 2, seed: 300 + Math.round(z * 10), screens: ["scrBlue0", "scrBlue1"], accentKey });
      impChair(kit, -14.25, 0.32, z, -Math.PI / 2);
    }
    impRailing(kit, [x0 + 0.1, z0 + 0.1], [x1 - 0.1, z0 + 0.1], 0.32, { light: accentKey });
    impRailing(kit, [x1 - 0.1, z0 + 0.1], [x1 - 0.1, z1 - 0.1], 0.32, { light: accentKey });
    const Wf = walls.W.frame;
    const u = wallU(room, "W", 4.6);
    Wf.box("impTrim", u, 2.6, 0.1, 3.6, 2.2, 0.2, { color: PALETTE.impBlack, texel: 1 });
    Wf.box("impGloss", u, 2.6, 0.21, 3.4, 2.0, 0.02);
    Wf.screen("scrBlue1", u, 2.9, 0.225, 3.1, 1.2);
    for (let k = 0; k < 4; k++) Wf.screen(k % 2 ? "scrBlue0" : "scrWhite0", u - 1.2 + k * 0.8, 1.95, 0.225, 0.7, 0.36);
    Wf.box(accentKey, u, 3.76, 0.22, 3.2, 0.04, 0.01);
    Wf.decal(IMP_DECAL.glyphs3, u, 4.1, 0.03, 0.5);
    Wf.collider(u - 1.9, u + 1.9, 0, 3.9, 0, 0.25, "pulpitScreen");
    impWallGear(Wf, wallU(room, "W", -4.5), 1.6, { seed: 17, accentKey });
    impWallGear(Wf, wallU(room, "W", -9.5), 1.6, { seed: 18, accentKey });
    Wf.decal(IMP_DECAL.restricted, wallU(room, "W", 2.6), 4.0, 0.03, 0.5);
    Wf.decal(IMP_DECAL.arrowUp, wallU(room, "W", -2.6), 4.0, 0.03, 0.5);
  }

  // --- aft (E) wall: coolant tanks in the corners, power coupling block under the E run, status bank above
  for (const s of [-1, 1]) {
    tank(kit, 14.6, s * 10.2, 1.25, 6.4, { color: PALETTE.impGrey, accentKey, seed: 500 + s, level: s < 0 ? 0.7 : 0.45, bands: 4, facing: "-x", label: IMP_DECAL.glyphs2 });
    // coolant feed from the tank base along the wall to the near cradle, valve + gauge at the tank
    pipePath(kit, [[13.2, 0.55, s * 10.2], [12.4, 0.55, s * 10.2], [12.4, 0.55, s * 4.0], [8.4, 0.55, s * 3.6]], 0.13, { color: PALETTE.impGreyDark, clampStep: 2.2 });
    valveWheel(kit, [12.4, 0.55 + 0.3, s * 7.0], "y", 0.16, { color: PALETTE.impRed, stem: 0.15 });
    gauge(kit, [12.8, 1.1, s * 7.0], "-x", 0.1, { seed: 510 + s });
    kit.collider([12.1, 0, s > 0 ? 3.4 : -10.4], [12.7, 0.9, s > 0 ? 10.4 : -3.4], "pipe");
    // riser from the tank top into the ceiling
    pipe(kit, [14.6, 6.9, s * 10.2], [14.6, h - 0.3, s * 10.2], 0.16, { color: PALETTE.impGreyDark, flanges: true });
  }
  {
    const E = walls.E.frame;
    kit.box("impTrim", 15.4, 1.2, 0, 2.4, 2.4, 3.2, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", 15.4, 2.46, 0, 2.5, 0.12, 3.3, { color: PALETTE.impCharcoal, texel: 1 });
    kit.cyl("impMetal", 14.15, 1.6, 0, 0.6, 0.3, "x", { color: PALETTE.impCharcoal, segments: 24 });
    kit.add(accentKey, new THREE.TorusGeometry(0.5, 0.03, 6, 32), { pos: [14.0, 1.6, 0], rot: [0, Math.PI / 2, 0] });
    for (const zz of [-1.0, 1.0]) {
      kit.box("impMetal", 14.18, 1.2, zz, 0.04, 1.6, 0.9, { color: PALETTE.impCharcoal, texel: 1 });
      for (let k = 0; k < 5; k++) kit.box(k === 3 ? "emitRedImp" : accentKey, 14.21, 1.8 - k * 0.22, zz - 0.3, 0.01, 0.05, 0.05);
      gauge(kit, [14.21, 1.5, zz + 0.2], "-x", 0.1, { seed: 520 + zz });
    }
    for (let k = 0; k < 6; k++) cable(kit, [[14.4, 2.4, -1.3 + k * 0.5], [13.9, 2.9 + 0.1 * (k % 2), -1.3 + k * 0.5], [13.4, 2.4, -1.3 + k * 0.5]], 0.02, { color: k % 2 ? PALETTE.impBlack : PALETTE.impBlueDeep });
    decalImp(kit, IMP_DECAL.power, [14.19, 0.6, 0], "-x", 0.4);
    kit.collider([14.1, 0, -1.65], [hx, 2.6, 1.65], "coupling");
    screenBank(E, wallU(room, "E", 0) - 2.7, 4.6, 4, 2, 1.1, 0.6, 0.1, ["scrBlue0", "scrBlue1", "scrWhite1", "scrBlue0"], { seed: 530 });
    E.box(accentKey, wallU(room, "E", 0), 6.35, 0.08, 5.0, 0.05, 0.02);
    E.decal(IMP_DECAL.glyphs1, wallU(room, "E", 0), 6.7, 0.03, 0.5);
    impWallLight(E, wallU(room, "E", -3.4), h - 0.7, { key: accentKey, w: 1.2 });
    impWallLight(E, wallU(room, "E", 3.4), h - 0.7, { key: accentKey, w: 1.2 });
  }
  // --- N/S walls: junction boxes, warning lamps near the stairs, coolant header pipes
  for (const s of [-1, 1]) {
    const F = s < 0 ? walls.N.frame : walls.S.frame;
    const side = s < 0 ? "N" : "S";
    junctionBox(F, wallU(room, side, -13.5), 2.2, 0.8, 1.0, { seed: 600 + s, accentKey });
    junctionBox(F, wallU(room, side, 3.2), 2.4, 0.7, 0.9, { seed: 610 + s, accentKey, drops: 1 });
    impWallGear(F, wallU(room, side, 11.0), 1.5, { seed: 620 + s, accentKey });
    F.decal(IMP_DECAL.keepClear, wallU(room, side, -9.7), 3.9, 0.03, 0.6);
    pipe(kit, [-hx + 0.4, 6.9, s * (hz - 0.32)], [hx - 3.0, 6.9, s * (hz - 0.32)], 0.12, { color: PALETTE.impGrey, clampStep: 2.6 });
    pipe(kit, [-hx + 0.4, 7.2, s * (hz - 0.28)], [hx - 3.0, 7.2, s * (hz - 0.28)], 0.08, { color: PALETTE.impGreyDark, clampStep: 2.6 });
    warningLamp(kit, [-9.7, 4.4, s * (hz - 0.35)], "emitAmber");
  }
  blinkers(kit, [
    { pos: [-9.7, 4.4, -(hz - 0.35)], size: [0.1, 0.1, 0.1], key: "emitAmber", period: 1.4, duty: 0.5, phase: 0 },
    { pos: [-9.7, 4.4, hz - 0.35], size: [0.1, 0.1, 0.1], key: "emitAmber", period: 1.4, duty: 0.5, phase: 0.7 },
  ]);

  // --- roof: trusses across the room, hoist rail with a traversing trolley + hook block
  for (const x of [-13, -7, -1, 5, 11]) truss(kit, "z", x, -hz + 0.4, hz - 0.4, h - 0.25, { depth: 0.7, step: 1.3 });
  const railZ = -7.2;
  const railY = h - 1.05;
  kit.boxMM("impTrim", [-14.5, railY - 0.16, railZ - 0.16], [15.0, railY + 0.16, railZ + 0.16], { color: PALETTE.impBlack, texel: 1 });
  kit.boxMM("impMetal", [-14.5, railY - 0.2, railZ - 0.24], [15.0, railY - 0.16, railZ + 0.24], { color: PALETTE.impGreyDark, texel: 1 });
  for (const x of [-13, -7, -1, 5, 11]) kit.box("impTrim", x, railY + 0.35, railZ, 0.3, 0.4, 0.3, { color: PALETTE.impBlack });
  const trolley = assembly(kit, [0, railY, railZ], (s) => {
    s.box("impTrim", 0, -0.35, 0, 0.9, 0.36, 0.6, { color: PALETTE.impBlack, texel: 1 });
    s.box("impMetal", 0, -0.62, 0, 0.5, 0.2, 0.5, { color: PALETTE.impCharcoal, texel: 1 });
    for (const dx of [-0.3, 0.3]) for (const dz of [-0.3, 0.3]) s.cyl("impMetal", dx, -0.05, dz, 0.12, 0.08, "z", { color: PALETTE.impGrey, segments: 12 });
    s.box("emitAmber", 0.3, -0.5, 0.31, 0.12, 0.06, 0.01);
    for (const dx of [-0.1, 0.1]) s.cyl("impMetal", dx, -1.1, 0, 0.012, 0.8, "y", { color: PALETTE.impGreyDark, segments: 6 });
    s.box("impTrim", 0, -1.7, 0, 0.36, 0.5, 0.26, { color: PALETTE.impBlack, texel: 1 });
    s.box("chevronY", 0, -1.7, 0.135, 0.3, 0.3, 0.01, { texel: 3 });
    s.add("impMetal", new THREE.TorusGeometry(0.16, 0.035, 8, 16, Math.PI * 1.3), { pos: [0, -2.1, 0], rot: [0, 0, Math.PI * 0.85], color: PALETTE.impGrey, uv: "scale", uvScale: [4, 1] });
  });
  kit.onUpdate((dt, t) => {
    const u = 0.5 + 0.5 * Math.sin(t * 0.09);
    trolley.position.x = -12 + 24 * u;
  });

  // --- lights: blue glow inside the coil area, white work lights over the catwalk / pulpit / aft end, blue floor fill
  const blue = 0x4f8dff;
  kit.light({ type: "point", pos: [3.0, cy, 0], color: blue, intensity: lux(4.5, 3.2), distance: 17, priority: 0.7 });
  kit.light({ type: "point", pos: [-2.5, cy + R + 1.2, 0], color: blue, intensity: lux(3.8, 3.2), distance: 16, priority: 0.66 });
  kit.light({ type: "point", pos: [8.5, cy + R + 1.2, 0], color: blue, intensity: lux(3.8, 3.2), distance: 16, priority: 0.65 });
  kit.light({ type: "point", pos: [1.5, h - 0.8, -4.6], color: 0xe4ecff, intensity: lux(h - 0.8, 2.8), distance: 22, priority: 0.6 });
  kit.light({ type: "point", pos: [1.5, h - 0.8, 4.6], color: 0xe4ecff, intensity: lux(h - 0.8, 2.8), distance: 22, priority: 0.59 });
  kit.light({ type: "point", pos: [-13.5, h - 0.8, 2.0], color: 0xe4ecff, intensity: lux(h - 0.8, 3.0), distance: 20, priority: 0.55 });
  kit.light({ type: "point", pos: [14.0, h - 0.8, 0], color: 0xe4ecff, intensity: lux(h - 0.8, 2.6), distance: 20, priority: 0.45 });
  // blue fill in front of the W nozzle: lights the end cap seen from the blast door
  pendantLamp(kit, -12.5, 5.0, 0, h, accentKey);
  kit.light({ type: "point", pos: [-12.5, 5.0, 0], color: blue, intensity: lux(4.5, 2.4), distance: 14, priority: 0.4 });
  for (const x of [-2.5, 8.5]) ceilingLamp(kit, x, 0, h, accentKey, 0.7);
}
