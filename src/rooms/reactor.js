// Main Reactor Chamber (deck D): the showpiece. A 7 m radius reactor column rises from a dark pit
// (y = -6, coolant pools glowing cyan) through the chamber to the 30 m ceiling: stacked armour bands,
// slotted plate sections with the white-hot core showing through the slots, pulsing containment rings,
// a conduit collar with eight energy conduits radiating to junction blocks on the walls. The walkable
// deck at y = 0 is the entrance bridge from the N blast door and the main catwalk ring around the
// column; everything else at that level is grating (0.6 m lower) over the pit. Two switchback stair
// towers (E / W) climb to the upper catwalk ring at y = 9 with control alcoves N / S. Wall buttresses
// with recessed slots, huge stencils, blinking warning lamps.
// Light hierarchy: the column core is the only strong warm emissive and the key light; everything
// else (handrail LEDs, pillar slots, buttress slots, conduit tracers, the coolant pit) is a dim
// practical at roughly a fifth of the kit's emitters, so the chamber reads as a dark void with one
// glowing source.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impConsole, impChair, impRailing, wallFrame, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { rng, panelWithHoles, insideOut } from "../kit.js";
import { ensureDeckDMaterials, shellNoFloor, grateQuad, pipe, pipePath, gauge, junctionBox, screenBank, decalImp, decalD, DECK_D_DECAL, wallU, pulseRings, blinkerField, ringDeck, ringRail, solidStairs, catwalk, assembly, valveWheel, cable, hexBolt } from "./deck_d_kit.js";

const UP = new THREE.Vector3(0, 1, 0);
// practical emitters (all ~20% of the kit's full emitters)
const RAIL = "roomsd_amberLow"; // handrail LED strips
const RAIL_IN = "emitRedDim"; // inner (column-side) rails: red warning edge
const SLOT = "roomsd_slot"; // recessed white slots (buttresses, landing lamps, beam downlights)
const TRACER = "roomsd_blueLow"; // coolant / conduit tracer lines
const WARM = RAIL; // dim warm accents on the column plates (same mesh as the rail LEDs)

export function buildReactor(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const hot = 0xfff0c0;
  const cyan = 0x7fd8ff;
  const pool = 0x3a7fb0; // coolant pool glow tint (additive planes): deep, not neon
  ensureDeckDMaterials(kit);
  const rand = rng(9901);
  const yG = -0.6; // grating level
  const yP = -6.0; // pit floor
  const R_IN = 8.4; // main ring inner radius
  const R_OUT = 11.5; // main ring outer radius
  const Y2 = 9.0; // upper ring level
  const R2_IN = 8.7;
  const R2_OUT = 10.6;

  // --- shell: 30 m walls cut into 5 m bands, dark ceiling; the deck below is all ours. No "light"
  // feature cells: the walls carry only equipment LEDs; the buttress slots below are the wall practicals.
  const walls = shellNoFloor(kit, room, ctx.doors, {
    accentKey: "emitAmberDim",
    seed: 5150,
    wall: { panelW: 2.5, kickH: 0.9, corniceH: 1.3, bands: [5, 10, 15, 20, 25], features: { vent: 0.12, equipment: 0.05, conduit: 0.1, light: 0.0, screen: 0.02 }, altChance: 0.3, panelColor: PALETTE.impGrey, panelColorAlt: PALETTE.impGreyDark },
    ceiling: { troughs: 2, troughW: 0.9, beamStep: 6, withLights: false, dark: PALETTE.impBlack },
  });

  // --- pit: floor, walls below the panels, coolant mains, glow pools
  kit.boxMM("impTrim", [-hx, yP - 0.3, -hz], [hx, yP, hz], { color: PALETTE.impBlack, texel: 0.2 });
  for (const side of ["N", "S", "E", "W"]) {
    const f = walls[side].frame;
    const L = walls[side].length;
    f.box("impTrim", L / 2, yP / 2, -0.19, L, -yP, 0.42, { color: PALETTE.impCharcoal, texel: 0.4 });
    f.box(TRACER, L / 2, -3.0, 0.03, L - 2, 0.05, 0.02);
    for (let u = 3; u < L - 1; u += 6) {
      f.box("impTrim", u, yP / 2, 0.12, 0.5, -yP, 0.24, { color: PALETTE.impBlack, texel: 1 });
      f.cylV("impMetal", u + 1.2, -3.3, 0.25, 0.16, 5.2, { color: PALETTE.impGreyDark, segments: 10 });
    }
  }
  // support grid under the grating (hides the grate seams too)
  for (const x of [-24, -18, -11.7, 11.7, 18, 24]) kit.boxMM("impTrim", [x - 0.15, yG - 0.5, -hz], [x + 0.15, yG - 0.02, hz], { color: PALETTE.impCharcoal, texel: 0.5 });
  for (const z of [-24, -18, -11.7, 11.7, 18, 24]) kit.boxMM("impTrim", [-hx, yG - 0.5, z - 0.15], [hx, yG - 0.02, z + 0.15], { color: PALETTE.impCharcoal, texel: 0.5 });
  for (let x = -27; x <= 27; x += 6) for (let z = -27; z <= 27; z += 6) if (Math.hypot(x, z) > 12.5) kit.box("impTrim", x, (yP + yG) / 2, z, 0.3, yG - yP, 0.3, { color: PALETTE.impCharcoal, texel: 1 });
  // coolant main ring + radial coolant pipes on the pit floor, glow pools around the base
  kit.add("impMetal", new THREE.TorusGeometry(9.6, 0.32, 10, 64), { pos: [0, yP + 0.5, 0], rot: [Math.PI / 2, 0, 0], color: PALETTE.impGreyDark, uv: "scale", uvScale: [40, 1] });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const L = 26 / Math.max(Math.abs(dx), Math.abs(dz));
    pipe(kit, [dx * 9.6, yP + 0.5, dz * 9.6], [dx * L, yP + 0.5, dz * L], 0.28, { color: PALETTE.impGreyDark, clampStep: 5.0, segments: 12 });
    kit.add("roomsd_glow", new THREE.PlaneGeometry(5, 5), { pos: [dx * 11.5, yP + 0.03, dz * 11.5], rot: [-Math.PI / 2, 0, 0], color: pool, uv: "keep" });
    // dim tracer along each main, a pump block + glow pool where it meets the pit wall
    const Lm = (L + 9.6) / 2;
    kit.add(TRACER, new THREE.BoxGeometry(L - 9.6 - 1.0, 0.04, 0.06), { pos: [dx * Lm, yP + 0.8, dz * Lm], rot: [0, -a, 0] });
    const pe = L - 1.6;
    kit.add("impTrim", new THREE.BoxGeometry(1.6, 1.4, 2.0), { pos: [dx * pe, yP + 0.7, dz * pe], rot: [0, -a, 0], color: PALETTE.impBlack, texel: 1 });
    kit.add("impMetal", new THREE.BoxGeometry(1.7, 0.3, 2.1), { pos: [dx * pe, yP + 1.45, dz * pe], rot: [0, -a, 0], color: PALETTE.impCharcoal, texel: 1 });
    kit.add(TRACER, new THREE.BoxGeometry(0.06, 0.4, 1.4), { pos: [dx * (pe - 0.82), yP + 0.7, dz * (pe - 0.82)], rot: [0, -a, 0] });
    kit.add("roomsd_glow", new THREE.PlaneGeometry(4, 4), { pos: [dx * (pe - 1.8), yP + 0.03, dz * (pe - 1.8)], rot: [-Math.PI / 2, 0, 0], color: pool, uv: "keep" });
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    kit.add("roomsd_glow", new THREE.PlaneGeometry(3.5, 3.5), { pos: [Math.cos(a) * 8.9, yP + 0.02, Math.sin(a) * 8.9], rot: [-Math.PI / 2, 0, 0], color: pool, uv: "keep" });
  }
  // dashed guide ring on the pit floor at r = 20 (between the mains)
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    if (i % 6 === 0) continue;
    kit.add(TRACER, new THREE.BoxGeometry(1.2, 0.03, 0.1), { pos: [Math.cos(a) * 20, yP + 0.02, Math.sin(a) * 20], rot: [0, -a, 0] });
  }
  // slow coolant pulses in the pit: below the bloom threshold, a breathing glow under the grating
  pulseRings(
    kit,
    [
      { pos: [0, yP + 0.25, 0], axis: "y", R: 8.7, tube: 0.1, phase: 0 },
      { pos: [0, yP + 0.25, 0], axis: "y", R: 10.4, tube: 0.1, phase: 1.2 },
      { pos: [0, -1.0, 0], axis: "y", R: 7.75, tube: 0.1, phase: 2.4 },
    ],
    { color: cyan, intensity: 0.9, speed: 0.7, floor: 0.35, segments: [8, 96] },
  );

  // --- grating at y = -0.6 everywhere outside the main ring
  grateQuad(kit, -hx, -hz, hx, -11.7, yG, { bars: false });
  grateQuad(kit, -hx, 11.7, hx, hz, yG, { bars: false });
  grateQuad(kit, -hx, -11.7, -11.7, 11.7, yG, { bars: false, axis: "x" });
  grateQuad(kit, 11.7, -11.7, hx, 11.7, yG, { bars: false, axis: "x" });
  {
    const ann = panelWithHoles(23.4, 23.4, 0.02, [{ x: 0, y: 0, r: R_OUT + 0.08 }]);
    ann.rotateX(-Math.PI / 2);
    kit.add("grate", ann, { pos: [0, yG - 0.011, 0], uv: "world", texel: 1 / 1.1 });
  }

  // --- the column
  reactorColumn(kit, { yP, h, hot, cyan });

  // --- main catwalk ring at y = 0 and the entrance bridge from the N door
  ringDeck(kit, "impDeck", R_IN, R_OUT, 0, { segments: 96, color: PALETTE.impGrey, texel: 0.5 });
  kit.add("impTrim", new THREE.CylinderGeometry(R_OUT, R_OUT, 0.7, 96, 1, true), { pos: [0, -0.35, 0], color: PALETTE.impBlack, uv: "scale", uvScale: [40, 1] });
  kit.add("impTrim", insideOut(new THREE.CylinderGeometry(R_IN, R_IN, 0.7, 96, 1, true)), { pos: [0, -0.35, 0], color: PALETTE.impBlack, uv: "scale", uvScale: [30, 1] });
  ringDeck(kit, "impTrim", R_IN, R_OUT, -0.7, { segments: 96, faceDown: true, color: PALETTE.impBlack });
  ringDeck(kit, "chevronY", R_OUT - 0.5, R_OUT - 0.1, 0.006, { segments: 96, texel: 1.2 });
  ringDeck(kit, "chevronR", R_IN + 0.1, R_IN + 0.5, 0.006, { segments: 96, texel: 1.2 });
  ringDeck(kit, "impMetalRough", R_IN + 1.3, R_OUT - 1.3, 0.008, { segments: 96, color: PALETTE.impGreyDark, texel: 0.7 });
  // radial deck seams + floor stencils
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    kit.add("impTrim", new THREE.BoxGeometry(R_OUT - R_IN - 0.3, 0.012, 0.05), { pos: [Math.cos(a) * (R_IN + R_OUT) / 2, 0.004, Math.sin(a) * (R_IN + R_OUT) / 2], rot: [0, -a, 0], color: PALETTE.impBlack });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    decalImp(kit, [IMP_DECAL.hazard, IMP_DECAL.restricted, IMP_DECAL.power, IMP_DECAL.glyphs3][i], [Math.cos(a) * 10.4, 0.016, Math.sin(a) * 10.4], "up", 1.2, { spin: -a - Math.PI / 2 });
  }
  const stairGapLo = [-0.12, 0.32];
  const stairGapLoW = [Math.PI - 0.32, -(Math.PI - 0.12)];
  const entryGap = [-Math.PI / 2 - 0.2, -Math.PI / 2 + 0.2];
  ringRail(kit, R_OUT - 0.15, 0, { segments: 96, gaps: [entryGap, stairGapLo, stairGapLoW], light: RAIL });
  ringRail(kit, R_IN + 0.15, 0, { segments: 80, gaps: [], light: RAIL_IN });
  // entrance bridge (slab top 1.5 cm under the ring deck where the two overlap)
  {
    const z0 = -hz;
    const z1 = -R_OUT + 0.3;
    kit.boxMM("impDeck", [-2.2, -0.16, z0], [2.2, -0.015, z1], { color: PALETTE.impGrey, texel: 0.5 });
    for (const s of [-1, 1]) {
      kit.boxMM("impTrim", [s * 2.2 - (s > 0 ? 0 : 0.08), -0.8, z0], [s * 2.2 + (s > 0 ? 0.08 : 0), 0.02, -11.6], { color: PALETTE.impBlack, texel: 1 });
      kit.boxMM("chevronY", [s * 1.9 - 0.14, -0.014, z0 + 0.4], [s * 1.9 + 0.14, 0.008, -11.7], { texel: 1.2 });
      impRailing(kit, [s * 2.05, z0 + 2.2], [s * 2.05, -11.7], 0, { light: RAIL, postStep: 2.0 });
      for (let z = z0 + 2.5; z < z1 - 1; z += 3.2) kit.box("impTrim", s * 1.75, (yG - 0.3 - 0.16) / 2, z, 0.3, 0.16 - yG + 0.3, 0.3, { color: PALETTE.impCharcoal, texel: 1 });
      // scanner posts by the door
      kit.box("impTrim", s * 1.8, 0.7, z0 + 1.6, 0.3, 1.4, 0.3, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impMetal", s * 1.8, 1.42, z0 + 1.6, 0.34, 0.06, 0.34, { color: PALETTE.impCharcoal });
      kit.box("emitRedImp", s * 1.8 - s * 0.16, 1.1, z0 + 1.6, 0.012, 0.06, 0.16);
      kit.box("emitWhiteDim", s * 1.8, 1.1, z0 + 1.76, 0.16, 0.04, 0.012);
      kit.collider([s * 1.8 - 0.17, 0, z0 + 1.43], [s * 1.8 + 0.17, 1.5, z0 + 1.77], "scanner");
    }
    kit.boxMM("impMetalRough", [-1.0, -0.003, z0 + 0.4], [1.0, 0.012, z1 - 0.2], { color: PALETTE.impGreyDark, texel: 0.7 });
    decalImp(kit, IMP_DECAL.arrowUp, [0, 0.016, -25.5], "up", 1.6, { spin: Math.PI });
    decalImp(kit, IMP_DECAL.restricted, [0, 0.016, -21.0], "up", 1.6);
    decalImp(kit, IMP_DECAL.power, [0, 0.016, -16.5], "up", 1.6);
    decalD(kit, DECK_D_DECAL.grime, [1.2, 0.018, -13.5], "up", 1.6);
    // overhead sign frame at the bridge start (readable from both sides)
    kit.box("impTrim", 0, 4.6, z0 + 3.0, 5.0, 0.6, 0.2, { color: PALETTE.impBlack, texel: 1 });
    for (const s of [-1, 1]) kit.box("impTrim", s * 2.4, (yG + 4.6) / 2, z0 + 3.0, 0.16, 4.6 - yG, 0.16, { color: PALETTE.impBlack });
    kit.add("scrRed0", new THREE.PlaneGeometry(4.4, 0.4), { pos: [0, 4.6, z0 + 3.11], uv: "keep" });
    kit.add("scrRed0", new THREE.PlaneGeometry(4.4, 0.4), { pos: [0, 4.6, z0 + 2.89], rot: [0, Math.PI, 0], uv: "keep" });
    kit.box("emitRedDim", 0, 4.95, z0 + 3.0, 4.6, 0.04, 0.22);
    for (const s of [-1, 1]) kit.collider([s * 2.4 - 0.1, 0, z0 + 2.9], [s * 2.4 + 0.1, 4.6, z0 + 3.1], "signPost");
  }

  // --- upper ring at y = 9: grate deck over a dark plate, railings, support columns from the main ring
  ringDeck(kit, "impTrim", R2_IN, R2_OUT, Y2 - 0.1, { segments: 96, color: PALETTE.impCharcoal });
  ringDeck(kit, "grate", R2_IN + 0.06, R2_OUT - 0.06, Y2, { segments: 96, texel: 1 / 1.1 });
  ringDeck(kit, "impTrim", R2_IN, R2_OUT, Y2 - 0.3, { segments: 96, faceDown: true, color: PALETTE.impBlack });
  kit.add("impTrim", new THREE.CylinderGeometry(R2_OUT, R2_OUT, 0.32, 96, 1, true), { pos: [0, Y2 - 0.15, 0], color: PALETTE.impBlack, uv: "scale", uvScale: [40, 1] });
  kit.add("impTrim", insideOut(new THREE.CylinderGeometry(R2_IN, R2_IN, 0.32, 96, 1, true)), { pos: [0, Y2 - 0.15, 0], color: PALETTE.impBlack, uv: "scale", uvScale: [30, 1] });
  kit.floor(-R2_OUT, -R2_OUT, R2_OUT, R2_OUT, Y2, "upperRing");
  const stairGapHi = [0.12, 0.35];
  const stairGapHiW = [Math.PI - 0.35, Math.PI - 0.12];
  const alcoveN = [-Math.PI / 2 - 0.27, -Math.PI / 2 + 0.27];
  const alcoveS = [Math.PI / 2 - 0.27, Math.PI / 2 + 0.27];
  ringRail(kit, R2_OUT - 0.15, Y2, { segments: 88, gaps: [stairGapHi, stairGapHiW, alcoveN, alcoveS], light: RAIL });
  ringRail(kit, R2_IN + 0.15, Y2, { segments: 72, gaps: [], light: RAIL_IN, kick: "chevronR" });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const cx = Math.cos(a) * 9.65;
    const cz = Math.sin(a) * 9.65;
    kit.add("impTrim", new THREE.BoxGeometry(0.45, Y2 - 0.3, 0.45), { pos: [cx, (Y2 - 0.3) / 2, cz], rot: [0, -a, 0], color: PALETTE.impBlack, texel: 1 });
    kit.add("impMetal", new THREE.BoxGeometry(0.6, 0.35, 0.6), { pos: [cx, 0.17, cz], rot: [0, -a, 0], color: PALETTE.impCharcoal, texel: 1 });
    kit.add("impMetal", new THREE.BoxGeometry(2.0, 0.3, 0.5), { pos: [cx, Y2 - 0.45, cz], rot: [0, -a, 0], color: PALETTE.impCharcoal, texel: 1 });
    // recessed amber slot on the outer face: dark housing, narrow dim strip, three fins across it
    kit.add("impTrim", new THREE.BoxGeometry(0.14, Y2 - 1.8, 0.16), { pos: [Math.cos(a) * 9.9, (Y2 - 0.3) / 2, Math.sin(a) * 9.9], rot: [0, -a, 0], color: PALETTE.impBlack, texel: 1 });
    kit.add(RAIL, new THREE.BoxGeometry(0.02, Y2 - 2.0, 0.05), { pos: [Math.cos(a) * 9.96, (Y2 - 0.3) / 2, Math.sin(a) * 9.96], rot: [0, -a, 0] });
    for (const yy of [2.4, 4.35, 6.3]) kit.add("impTrim", new THREE.BoxGeometry(0.04, 0.08, 0.16), { pos: [Math.cos(a) * 9.97, yy, Math.sin(a) * 9.97], rot: [0, -a, 0], color: PALETTE.impBlack });
    kit.collider([cx - 0.4, 0, cz - 0.4], [cx + 0.4, Y2, cz + 0.4], "ringColumn");
  }

  // --- stair towers E / W, control alcoves N / S
  stairTower(kit, 1, { yG, Y2, hot });
  stairTower(kit, -1, { yG, Y2, hot });
  controlAlcove(kit, -1, { yG, Y2, rand });
  controlAlcove(kit, 1, { yG, Y2, rand, holo: true });

  // --- energy conduits at the collar (y = 12.3) to wall junction blocks; coolant risers from the pit
  const yC = 12.3;
  const blockLamps = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const diag = i % 2 === 1;
    const t = diag ? (hx - 1.3) / Math.abs(dx) : hx - 0.7;
    const end = [dx * t, yC, dz * t];
    pipe(kit, [dx * 7.0, yC, dz * 7.0], end, 0.55, { color: PALETTE.impGreyDark, clampStep: 4.0, segments: 16, flanges: true });
    // twin dim tracer lines ride the conduit and terminate inside the collar flanges at both ends
    for (const s of [-1, 1]) pipe(kit, [dx * 7.85 - dz * s * 0.62, yC + 0.1, dz * 7.85 + dx * s * 0.62], [end[0] - dx * 1.25 - dz * s * 0.62, yC + 0.1, end[2] - dz * 1.25 + dx * s * 0.62], 0.035, { mat: TRACER, segments: 6 });
    // column-end collar: black torus + charcoal flange with a recessed dim ring where the conduit leaves the column
    kit.add("impTrim", new THREE.TorusGeometry(0.95, 0.16, 8, 24), { pos: [dx * 7.6, yC, dz * 7.6], rot: [0, -a + Math.PI / 2, 0], color: PALETTE.impBlack, uv: "scale", uvScale: [8, 1] });
    pipe(kit, [dx * 7.62, yC, dz * 7.62], [dx * 7.95, yC, dz * 7.95], 0.86, { color: PALETTE.impCharcoal, segments: 24 });
    kit.add("impTrim", new THREE.TorusGeometry(0.72, 0.05, 6, 24), { pos: [dx * 7.96, yC, dz * 7.96], rot: [0, -a + Math.PI / 2, 0], color: PALETTE.impBlack, uv: "scale", uvScale: [8, 1] });
    kit.add(TRACER, new THREE.TorusGeometry(0.7, 0.02, 6, 24), { pos: [dx * 7.955, yC, dz * 7.955], rot: [0, -a + Math.PI / 2, 0], uv: "keep" });
    // junction block on the wall, with a collar, gauges and a lamp
    const bc = [end[0] - dx * 0.4, yC, end[2] - dz * 0.4];
    kit.add("impTrim", new THREE.BoxGeometry(1.4, 3.2, 2.6), { pos: bc, rot: [0, -a, 0], color: PALETTE.impBlack, texel: 1 });
    kit.add("impMetal", new THREE.BoxGeometry(1.5, 0.4, 2.8), { pos: [bc[0], yC + 1.4, bc[2]], rot: [0, -a, 0], color: PALETTE.impCharcoal, texel: 1 });
    kit.add("impMetal", new THREE.BoxGeometry(1.5, 0.4, 2.8), { pos: [bc[0], yC - 1.4, bc[2]], rot: [0, -a, 0], color: PALETTE.impCharcoal, texel: 1 });
    // wall-end collar bolted to the block face: flange, bolt ring, recessed dim ring (no detached bright torus)
    const fe = 1.1; // block face distance from `end`
    pipe(kit, [end[0] - dx * (fe + 0.32), yC, end[2] - dz * (fe + 0.32)], [end[0] - dx * (fe - 0.02), yC, end[2] - dz * (fe - 0.02)], 0.86, { color: PALETTE.impCharcoal, segments: 24 });
    kit.add("impTrim", new THREE.TorusGeometry(0.72, 0.05, 6, 24), { pos: [end[0] - dx * (fe + 0.33), yC, end[2] - dz * (fe + 0.33)], rot: [0, -a + Math.PI / 2, 0], color: PALETTE.impBlack, uv: "scale", uvScale: [8, 1] });
    kit.add(TRACER, new THREE.TorusGeometry(0.7, 0.02, 6, 24), { pos: [end[0] - dx * (fe + 0.325), yC, end[2] - dz * (fe + 0.325)], rot: [0, -a + Math.PI / 2, 0], uv: "keep" });
    if (!diag) {
      const facing = dx > 0.5 ? "-x" : dx < -0.5 ? "+x" : dz > 0.5 ? "-z" : "+z";
      for (let k = 0; k < 8; k++) {
        const b = (k / 8) * Math.PI * 2 + Math.PI / 8;
        hexBolt(kit, [end[0] - dx * (fe + 0.32) - dz * Math.cos(b) * 0.78, yC + Math.sin(b) * 0.78, end[2] - dz * (fe + 0.32) + dx * Math.cos(b) * 0.78], facing, 0.05);
      }
    }
    kit.add("chevronY", new THREE.BoxGeometry(0.02, 0.3, 2.4), { pos: [end[0] - dx * 1.12, yC - 1.0, end[2] - dz * 1.12], rot: [0, -a, 0], texel: 2 });
    blockLamps.push({ pos: [end[0] - dx * 1.15, yC + 1.9, end[2] - dz * 1.15], color: hot, period: 2.6, duty: 0.5, phase: i * 0.3 });
    // drop pipe from the block down the wall to the grating
    pipe(kit, [end[0] - dx * 0.9, yC - 1.6, end[2] - dz * 0.9], [end[0] - dx * 0.9, yG + 0.1, end[2] - dz * 0.9], 0.22, { color: PALETTE.impGreyDark, clampStep: 3.0, segments: 12 });
  }
  // coolant risers between the column and the ring (in the 1.2 m gap), from the pit to the collar
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * 7.95;
    const z = Math.sin(a) * 7.95;
    pipe(kit, [x, yP + 0.3, z], [x, 10.6, z], 0.22, { color: PALETTE.impGreyDark, clampStep: 2.4, segments: 12 });
    for (const yy of [-2.5, 3.6, 8.4]) kit.add(TRACER, new THREE.TorusGeometry(0.27, 0.035, 6, 16), { pos: [x, yy, z], rot: [Math.PI / 2, 0, 0], uv: "keep" });
    pipePath(kit, [[x, yP + 0.5, z], [Math.cos(a) * 9.6, yP + 0.5, Math.sin(a) * 9.6]], 0.22, { color: PALETTE.impGreyDark, segments: 12 });
    valveWheel(kit, [Math.cos(a) * 8.1, 1.6, Math.sin(a) * 8.1], "y", 0.16, { color: PALETTE.impRed, stem: 0.14 });
  }

  // --- wall buttresses with lit slots, huge stencils, warning lamps; wall gear at the entrance
  const lamps = [...blockLamps];
  for (const side of ["N", "E", "S", "W"]) {
    const f = walls[side].frame;
    const L = walls[side].length;
    for (const [k, off] of [-20, -9, 9, 20].entries()) {
      const u = L / 2 + off;
      f.box("impTrim", u, (yP + 28.7) / 2, 0.7, 2.4, 28.7 - yP, 1.4, { color: PALETTE.impBlack, texel: 0.5 });
      f.box("impMetal", u, 0.2, 0.72, 2.6, 0.5, 1.5, { color: PALETTE.impCharcoal, texel: 1 });
      // recessed slot: one dim fixture per band between the collar rings, in a black channel
      f.box("impTrim", u, 14.5, 1.405, 0.36, 22, 0.02, { color: PALETTE.impCharcoal });
      for (const [v0, v1] of [[4.6, 11.7], [12.9, 19.9], [21.1, 27.4]]) {
        f.box("impTrim", u, (v0 + v1) / 2, 1.41, 0.2, v1 - v0, 0.03, { color: PALETTE.impBlack });
        f.box(SLOT, u, (v0 + v1) / 2, 1.425, 0.09, v1 - v0 - 0.3, 0.012, { uv: "keep" });
      }
      for (const v of [4.0, 12.3, 20.5]) f.box("impMetal", u, v, 0.72, 2.6, 0.5, 1.5, { color: PALETTE.impCharcoal, texel: 1 });
      f.decal([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03, IMP_DECAL.cog][k], u, 7.0, 1.42, 1.8);
      f.box("chevronR", u, 1.3, 1.41, 2.0, 0.3, 0.012, { texel: 2 });
      const lp = f.pos(u, 3.6, 1.52);
      f.box("impTrim", u, 3.6, 1.46, 0.3, 0.3, 0.12, { color: PALETTE.impBlack });
      lamps.push({ pos: [lp.x, lp.y, lp.z], size: [0.14, 0.14, 0.14], color: 0xff3b2e, period: 1.4 + k * 0.15, duty: 0.45, phase: k * 0.35 + (side === "N" ? 0.2 : 0) });
      f.collider(u - 1.3, u + 1.3, 0, 28.7, 0, 1.5, "buttress");
    }
    // huge stencilled numbers between the buttresses, hazard tags low
    f.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.glyphs3, IMP_DECAL.cog][side.charCodeAt(0) % 4], L / 2 - 14.5, 17, 0.04, 6);
    f.decal([IMP_DECAL.bay03, IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.glyphs2][side.charCodeAt(0) % 4], L / 2 + 14.5, 17, 0.04, 6);
    if (side !== "N") f.decal(IMP_DECAL.hazard, L / 2, 3.2, 0.04, 2.4);
    f.decal(IMP_DECAL.restricted, L / 2 - 26.5, 3.4, 0.04, 2.2);
    f.decal(IMP_DECAL.keepClear, L / 2 + 26.5, 3.4, 0.04, 2.2);
    junctionBox(f, L / 2 - 4.5, 2.6, 1.2, 1.4, { seed: 300 + side.charCodeAt(0), accentKey: "emitAmberDim" });
    junctionBox(f, L / 2 + 4.5, 2.6, 1.2, 1.4, { seed: 310 + side.charCodeAt(0), accentKey: TRACER });
  }
  // entrance: door number + hazard stripes on the N wall flanks
  {
    const N = walls.N.frame;
    N.decal(IMP_DECAL.glyphs2, wallU(room, "N", 0), 7.5, 0.04, 2.4);
    N.box("chevronY", wallU(room, "N", -3.0), 2.6, 0.045, 0.6, 5.2, 0.012, { texel: 2 });
    N.box("chevronY", wallU(room, "N", 3.0), 2.6, 0.045, 0.6, 5.2, 0.012, { texel: 2 });
    for (let k = 0; k < 3; k++) {
      const p = N.pos(wallU(room, "N", 4.2 + k * 0.5), 1.6, 0.2);
      gauge(kit, [p.x, p.y, p.z], "+z", 0.14, { seed: 320 + k, warn: k === 2 });
    }
    N.box("impTrim", wallU(room, "N", 4.7), 1.6, 0.08, 2.0, 0.6, 0.16, { color: PALETTE.impBlack });
  }
  blinkerField(kit, lamps, { intensity: 2.2 });

  // --- ceiling: radial beams from the column collar to the walls (dark structure with two recessed
  // downlight cans each: no lit strips floating in the upper corners), top collar ring
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const L = (hx - 0.5) / Math.max(Math.abs(dx), Math.abs(dz)) - 8.6;
    const mid = 8.6 + L / 2;
    kit.add("impTrim", new THREE.BoxGeometry(L, 0.9, 0.7), { pos: [dx * mid, h - 0.45, dz * mid], rot: [0, -a, 0], color: PALETTE.impBlack, texel: 0.5 });
    kit.add("impMetal", new THREE.BoxGeometry(L - 1, 0.08, 0.8), { pos: [dx * mid, h - 0.92, dz * mid], rot: [0, -a, 0], color: PALETTE.impCharcoal, texel: 1 });
    for (const r of [14.5, 23.0]) {
      if (r > 8.6 + L - 1) continue;
      kit.add("impTrim", new THREE.BoxGeometry(0.7, 0.3, 0.9), { pos: [dx * r, h - 1.05, dz * r], rot: [0, -a, 0], color: PALETTE.impBlack, texel: 1 });
      kit.add(SLOT, new THREE.BoxGeometry(0.4, 0.02, 0.6), { pos: [dx * r, h - 1.21, dz * r], rot: [0, -a, 0], uv: "keep" });
    }
  }
  kit.add("impTrim", new THREE.TorusGeometry(9.0, 0.5, 8, 64), { pos: [0, h - 0.5, 0], rot: [Math.PI / 2, 0, 0], color: PALETTE.impBlack, uv: "scale", uvScale: [40, 1] });

  // --- lights: the column is the key (white-hot at y 6.5 and 16); everything else is weak so the
  // walls fall away into the dark: faint cool fills in the quadrants, a low warm entrance light, a
  // deep blue pit light under the grating
  kit.light({ type: "point", pos: [0, 6.5, 0], color: hot, intensity: lux(12, 2.6), distance: 52, priority: 0.95 });
  kit.light({ type: "point", pos: [0, 16, 0], color: hot, intensity: lux(14, 2.2), distance: 58, priority: 0.9 });
  kit.light({ type: "point", pos: [-17, 13, -17], color: 0x9fb2d0, intensity: lux(13, 0.55), distance: 36, priority: 0.62 });
  kit.light({ type: "point", pos: [17, 13, -17], color: 0x9fb2d0, intensity: lux(13, 0.55), distance: 36, priority: 0.61 });
  kit.light({ type: "point", pos: [-17, 13, 17], color: 0x9fb2d0, intensity: lux(13, 0.55), distance: 36, priority: 0.6 });
  kit.light({ type: "point", pos: [17, 13, 17], color: 0x9fb2d0, intensity: lux(13, 0.55), distance: 36, priority: 0.59 });
  kit.light({ type: "point", pos: [0, 5.5, -23], color: 0xfff4e0, intensity: lux(5.5, 2.0), distance: 20, priority: 0.7 });
  kit.light({ type: "point", pos: [0, -2.6, 0], color: 0x3f8fd0, intensity: lux(10, 0.9), distance: 40, priority: 0.5 });
}

// ---------------------------------------------------------------------------
/** The reactor column: base in the pit, stacked bands / slotted plate sections / containment rings, core, flare. */
function reactorColumn(kit, { yP, h, hot, cyan }) {
  const RC = 7.2;
  // base and lower shaft
  kit.cyl("impTrim", 0, (yP - 2.0) / 2, 0, 8.0, -2.0 - yP, "y", { color: PALETTE.impCharcoal, segments: 64, texel: 0.3 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    kit.add("impTrim", new THREE.BoxGeometry(0.5, -2.0 - yP - 0.4, 0.5), { pos: [Math.cos(a) * 8.05, (yP - 2.0) / 2, Math.sin(a) * 8.05], rot: [0, -a, 0], color: PALETTE.impBlack, texel: 1 });
  }
  kit.add(TRACER, new THREE.TorusGeometry(8.15, 0.08, 8, 96), { pos: [0, -3.2, 0], rot: [Math.PI / 2, 0, 0], uv: "keep" });
  kit.cyl("impTrim", 0, -0.5, 0, 7.6, 3.0, "y", { color: PALETTE.impBlack, segments: 64, texel: 0.5 });
  kit.cyl("impMetal", 0, -2.1, 0, 8.3, 0.4, "y", { color: PALETTE.impCharcoal, segments: 64 });
  // the core (unlit, blooms), visible through the slots
  kit.cyl("roomsd_core", 0, 15.0, 0, 6.6, 28.2, "y", { segments: 64 });
  // stacked segments
  const rings = [];
  const band = (y0, y1) => {
    kit.cyl("impTrim", 0, (y0 + y1) / 2, 0, RC, y1 - y0, "y", { color: PALETTE.impBlack, segments: 64, texel: 0.5 });
    kit.cyl("impMetal", 0, y0 + 0.2, 0, RC + 0.16, 0.34, "y", { color: PALETTE.impCharcoal, segments: 64 });
    kit.cyl("impMetal", 0, y1 - 0.2, 0, RC + 0.16, 0.34, "y", { color: PALETTE.impCharcoal, segments: 64 });
    // bolt bosses
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      kit.add("impMetal", new THREE.BoxGeometry(0.2, y1 - y0 - 0.9, 0.5), { pos: [Math.cos(a) * (RC + 0.04), (y0 + y1) / 2, Math.sin(a) * (RC + 0.04)], rot: [0, -a, 0], color: PALETTE.impGreyDark });
    }
  };
  const slots = (y0, y1) => {
    const yc = (y0 + y1) / 2;
    const hh = y1 - y0;
    const n = 10;
    const span = (Math.PI * 2) / n;
    const plate = span * 0.82;
    for (let p = 0; p < n; p++) {
      const t0 = p * span + (span - plate) / 2;
      kit.add("impMetal", new THREE.CylinderGeometry(7.0, 7.0, hh, 7, 1, true, t0, plate), { pos: [0, yc, 0], color: PALETTE.impGreyDark, uv: "scale", uvScale: [4, 1] });
      kit.add("impTrim", insideOut(new THREE.CylinderGeometry(6.84, 6.84, hh, 7, 1, true, t0, plate)), { pos: [0, yc, 0], color: PALETTE.impBlack, uv: "scale", uvScale: [4, 1] });
      // slot edges (radial boxes) and a centre rib; CylinderGeometry puts theta at (sin, cos), so a
      // box whose local x must point radially is yawed by theta - 90°
      for (const te of [t0, t0 + plate]) {
        const sx = Math.sin(te);
        const cz = Math.cos(te);
        kit.add("impTrim", new THREE.BoxGeometry(0.34, hh, 0.06), { pos: [sx * 6.92, yc, cz * 6.92], rot: [0, te - Math.PI / 2, 0], color: PALETTE.impBlack });
      }
      const tm = t0 + plate / 2;
      kit.add("impTrim", new THREE.BoxGeometry(0.3, hh - 0.2, 0.3), { pos: [Math.sin(tm) * 7.08, yc, Math.cos(tm) * 7.08], rot: [0, tm - Math.PI / 2, 0], color: PALETTE.impBlack, texel: 1 });
      kit.add(WARM, new THREE.BoxGeometry(0.05, hh * 0.5, 0.04), { pos: [Math.sin(tm) * 7.25, yc, Math.cos(tm) * 7.25], rot: [0, tm - Math.PI / 2, 0] });
    }
  };
  const ring = (y0, y1) => {
    const yc = (y0 + y1) / 2;
    kit.cyl("impTrim", 0, yc, 0, RC - 0.15, y1 - y0, "y", { color: PALETTE.impBlack, segments: 64, texel: 0.5 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      kit.add("impMetal", new THREE.BoxGeometry(0.7, 0.62, 0.5), { pos: [Math.cos(a) * 7.45, yc, Math.sin(a) * 7.45], rot: [0, -a, 0], color: PALETTE.impCharcoal, texel: 1 });
    }
    rings.push({ pos: [0, yc, 0], axis: "y", R: 7.45, tube: 0.09, phase: rings.length * 0.9 });
  };
  const stack = [
    ["band", 1.0, 2.4],
    ["slots", 2.4, 5.0],
    ["ring", 5.0, 5.8],
    ["band", 5.8, 7.2],
    ["slots", 7.2, 9.8],
    ["ring", 9.8, 10.6],
    ["band", 10.6, 13.4],
    ["slots", 13.4, 16.0],
    ["ring", 16.0, 16.8],
    ["band", 16.8, 18.2],
    ["slots", 18.2, 20.8],
    ["ring", 20.8, 21.6],
    ["band", 21.6, 23.0],
    ["slots", 23.0, 25.6],
    ["ring", 25.6, 26.4],
    ["band", 26.4, 27.8],
    ["slots", 27.8, 29.0],
  ];
  for (const [kind, y0, y1] of stack) (kind === "band" ? band : kind === "slots" ? slots : ring)(y0, y1);
  // conduit collar detail (the tall band at 10.6–13.4): a stencil ring of hazard tape + numbers
  kit.cyl("chevronY", 0, 13.15, 0, RC + 0.02, 0.24, "y", { segments: 64, texel: 1.5 });
  kit.cyl("chevronY", 0, 10.85, 0, RC + 0.02, 0.24, "y", { segments: 64, texel: 1.5 });
  // flare + top collar
  kit.cyl("impTrim", 0, h - 0.5, 0, RC, 1.0, "y", { color: PALETTE.impBlack, segments: 64, r2: 8.5, texel: 0.5 });
  kit.cyl("impMetal", 0, h - 0.15, 0, 8.7, 0.3, "y", { color: PALETTE.impCharcoal, segments: 64 });
  // containment rings: thin hot lines in the dark bands between the tiers, breathing just across the
  // bloom threshold at their peak (same warm as the core: still one glowing source, not cream hoops)
  pulseRings(kit, rings, { color: hot, intensity: 1.35, speed: 0.8, floor: 0.25, segments: [10, 96] });
  // unreachable, but a collider for the shaft anyway (well inside the inner railing)
  kit.collider([-5, -2, -5], [5, h, 5], "column");
  void cyan;
}

/** Switchback stair tower on the E (s = 1) or W (s = -1) side: foot platform, two runs, landings, posts. */
function stairTower(kit, s, { yG, Y2 }) {
  const mx = (x) => s * x;
  const X = (a, b) => [Math.min(mx(a), mx(b)), Math.max(mx(a), mx(b))];
  // foot platform (1.5 cm under the ring deck where they overlap)
  {
    const [x0, x1] = X(11.0, 12.1);
    kit.boxMM("impDeck", [x0, -0.16, -1.3], [x1, -0.015, 3.5], { color: PALETTE.impGrey, texel: 0.5 });
    kit.boxMM("impTrim", [mx(12.1) - (s > 0 ? 0 : 0.06), yG - 0.1, -1.3], [mx(12.1) + (s > 0 ? 0.06 : 0), 0.0, 3.5], { color: PALETTE.impBlack, texel: 1 });
    for (const z of [-1.3, 3.5]) kit.boxMM("impTrim", [x0, yG - 0.1, z - 0.03], [x1, 0.0, z + 0.03], { color: PALETTE.impBlack, texel: 1 });
    impRailing(kit, [mx(11.0), -1.3], [mx(12.1), -1.3], 0, { light: RAIL, postStep: 1.2 });
    impRailing(kit, [mx(11.0), 3.5], [mx(12.1), 3.5], 0, { light: RAIL, postStep: 1.2 });
    impRailing(kit, [mx(12.05), 0.9], [mx(12.05), 1.3], 0, { postStep: 1.0 });
  }
  // run 1: outward, 0 -> 4.5
  {
    const [x0, x1] = X(12.1, 19.1);
    solidStairs(kit, x0, -1.2, x1, 0.8, "x", mx(12.1), mx(19.1), 0, 4.5, { rails: ["-", "+"], railKey: RAIL, tag: "stairE1" });
  }
  // mid landing at 4.5
  {
    const [x0, x1] = X(19.1, 21.3);
    catwalk(kit, x0, -1.3, x1, 3.5, 4.5, { grate: true, rails: { N: [], S: [], [s > 0 ? "E" : "W"]: [] }, railKey: RAIL, tag: "landing1" });
    for (const z of [-0.9, 3.1]) {
      kit.box("impTrim", mx(20.2), (yG + 4.4) / 2, z, 0.32, 4.4 - yG, 0.32, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impMetal", mx(20.2), yG + 0.2, z, 0.5, 0.4, 0.5, { color: PALETTE.impCharcoal, texel: 1 });
      kit.collider([mx(20.2) - 0.2, 0, z - 0.2], [mx(20.2) + 0.2, 4.5, z + 0.2], "landingPost");
    }
    // rail closing the small gap between the two runs on the landing's inner side
    impRailing(kit, [mx(19.15), 0.8], [mx(19.15), 1.4], 4.5, { postStep: 1.0 });
  }
  // run 2: inward, 4.5 -> 9
  {
    const [x0, x1] = X(12.1, 19.1);
    solidStairs(kit, x0, 1.4, x1, 3.4, "x", mx(19.1), mx(12.1), 4.5, Y2, { rails: ["-", "+"], railKey: RAIL, tag: "stairE2" });
  }
  // top landing at 9, joining the upper ring
  {
    const [x0, x1] = X(10.35, 12.1);
    catwalk(kit, x0, 1.3, x1, 3.5, Y2, { grate: false, rails: { N: [], S: [] }, railKey: RAIL, noTrim: [s > 0 ? "W" : "E"], tag: "landing2" });
    kit.box("impTrim", mx(11.6), (yG + Y2 - 0.1) / 2, 3.9, 0.32, Y2 - 0.1 - yG, 0.32, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", mx(11.6), Y2 - 0.3, 3.7, 0.3, 0.25, 0.7, { color: PALETTE.impCharcoal, texel: 1 });
    kit.collider([mx(11.6) - 0.2, 0, 3.7], [mx(11.6) + 0.2, Y2, 4.1], "landingPost");
    // underside skirt + recessed dim lamp lighting the mid landing below
    kit.boxMM("impTrim", [x0, Y2 - 0.35, 1.3], [x1, Y2 - 0.1, 3.5], { color: PALETTE.impCharcoal, texel: 1 });
    kit.box("impTrim", mx(11.2), Y2 - 0.36, 2.4, 1.0, 0.04, 0.3, { color: PALETTE.impBlack });
    kit.box(SLOT, mx(11.2), Y2 - 0.385, 2.4, 0.8, 0.012, 0.16, { uv: "keep" });
  }
  // floor stencils at the foot
  decalImp(kit, IMP_DECAL.arrowUp, [mx(13.5), 0.016 + 0.18 * 0 + 0.0, -0.2], "up", 0.9, { spin: s > 0 ? -Math.PI / 2 : Math.PI / 2 });
}

/** Control alcove on the upper ring: N (sz = -1) or S (sz = 1). Two consoles facing the column, screen wall, posts. */
function controlAlcove(kit, sz, { yG, Y2, rand, holo = false }) {
  const z0 = sz > 0 ? 9.6 : -14.2;
  const z1 = sz > 0 ? 14.2 : -9.6;
  const yD = Y2 + 0.02;
  kit.boxMM("impDeck", [-3.0, yD - 0.14, z0], [3.0, yD, z1], { color: PALETTE.impGrey, texel: 0.5 });
  kit.boxMM("impTrim", [-3.06, yD - 0.4, sz > 0 ? z1 - 0.06 : z0 - 0.06], [3.06, yD + 0.02, sz > 0 ? z1 + 0.06 : z0 + 0.06], { color: PALETTE.impBlack, texel: 1 });
  for (const s of [-1, 1]) kit.boxMM("impTrim", [s * 3.0 - 0.03, yD - 0.4, Math.min(z0, z1) + 0.6], [s * 3.0 + 0.03, yD + 0.02, Math.max(z0, z1)], { color: PALETTE.impBlack, texel: 1 });
  kit.floor(-3.0, z0, 3.0, z1, yD, "alcove");
  const zOuter = sz > 0 ? z1 : z0;
  const zInner = sz > 0 ? z0 : z1;
  for (const s of [-1, 1]) impRailing(kit, [s * 2.85, zInner + sz * 0.9], [s * 2.85, zOuter - sz * 0.3], yD, { light: RAIL, postStep: 1.5 });
  // support posts down to the grating
  for (const s of [-1, 1]) {
    const pz = zOuter - sz * 0.6;
    kit.box("impTrim", s * 2.4, (yG + yD - 0.14) / 2, pz, 0.36, yD - 0.14 - yG, 0.36, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", s * 2.4, yG + 0.2, pz, 0.55, 0.4, 0.55, { color: PALETTE.impCharcoal, texel: 1 });
    kit.collider([s * 2.4 - 0.22, 0, pz - 0.22], [s * 2.4 + 0.22, Y2, pz + 0.22], "alcovePost");
  }
  // screen wall on the outer edge (2.5 m: the N/S energy conduits pass overhead at y 11.75+)
  const bf = sz > 0 ? wallFrame(kit, [2.8, zOuter - sz * 0.2], [-2.8, zOuter - sz * 0.2], yD) : wallFrame(kit, [-2.8, zOuter - sz * 0.2], [2.8, zOuter - sz * 0.2], yD);
  const B = bf.frame;
  B.box("impTrim", 2.8, 1.25, -0.12, 5.6, 2.5, 0.24, { color: PALETTE.impBlack, texel: 1 });
  B.box("impMetal", 2.8, 1.25, 0.006, 5.4, 2.3, 0.012, { color: PALETTE.impCharcoal, texel: 1.5 });
  // N alcove: white/blue telemetry (layouts 0–2); S alcove: amber/white diagnostics (layouts 0–2).
  // Every distinct screen key is one more mesh in the cell, so the room draws from seven keys in total.
  const bankKeys = sz > 0 ? ["scrAmber0", "scrWhite2", "scrAmber1", "scrWhite2"] : ["scrWhite1", "scrBlue2", "scrWhite1", "scrBlue0"];
  screenBank(B, 0.4, 1.0, 4, 2, 1.1, 0.55, 0.08, bankKeys, { seed: 400 + sz });
  B.screen("scrRed0", 2.8, 0.7, 0.03, 4.4, 0.46);
  // recessed dim cornice slot over the screen wall, in a black channel
  B.box("impTrim", 2.8, 2.42, 0.02, 5.2, 0.1, 0.03, { color: PALETTE.impBlack });
  B.box(SLOT, 2.8, 2.42, 0.036, 5.0, 0.04, 0.012, { uv: "keep" });
  B.decal(IMP_DECAL.power, 0.3, 0.7, 0.03, 0.4);
  B.decal(IMP_DECAL.glyphs1, 5.3, 0.7, 0.03, 0.4);
  B.collider(0, 5.6, 0, 2.5, -0.3, 0.1, "alcoveWall");
  // two consoles + chairs facing the column
  const yaw = sz > 0 ? 0 : Math.PI;
  const cz = zInner + sz * 2.6;
  for (const s of [-1, 1]) {
    const scr = sz > 0 ? (s < 0 ? ["scrAmber1", "scrWhite2", "scrAmber0"] : ["scrWhite2", "scrAmber0", "scrRed0"]) : s < 0 ? ["scrBlue0", "scrWhite1", "scrBlue2"] : ["scrWhite1", "scrBlue2", "scrBlue0"];
    impConsole(kit, s * 1.45, yD, cz, 2.3, 0.9, { yaw, seed: 410 + s + sz * 3, screens: scr, accentKey: "emitWhiteDim" });
    impChair(kit, s * 1.45, yD, cz + sz * 1.0, yaw);
  }
  cable(kit, [[-0.3, yD + 0.3, cz + sz * 0.5], [0, yD + 0.05, cz + sz * 1.6], [1.2, yD + 0.02, zOuter - sz * 0.6]], 0.02, { color: PALETTE.impBlack });
  decalD(kit, DECK_D_DECAL.grime, [1.8, yD + 0.018, zOuter - sz * 1.2], "up", 1.0);
  decalImp(kit, IMP_DECAL.keepClear, [0, yD + 0.016, zInner + sz * 0.7], "up", 0.9, { spin: sz > 0 ? Math.PI : 0 });
  if (holo) {
    // holo projector between the consoles: a slowly turning schematic of the column
    const hx0 = 0;
    const hz0 = zOuter - sz * 1.4;
    kit.cyl("impTrim", hx0, yD + 0.35, hz0, 0.45, 0.7, "y", { color: PALETTE.impBlack, segments: 20 });
    kit.cyl("impMetal", hx0, yD + 0.72, hz0, 0.4, 0.04, "y", { color: PALETTE.impCharcoal, segments: 20 });
    kit.box(TRACER, hx0, yD + 0.5, hz0 - sz * 0.46, 0.5, 0.03, 0.01);
    kit.collider([hx0 - 0.45, yD, hz0 - 0.45], [hx0 + 0.45, yD + 0.8, hz0 + 0.45], "holoBase");
    const g = assembly(kit, [hx0, yD + 0.75, hz0], (sub) => {
      sub.cyl("holo", 0, 0.7, 0, 0.28, 1.3, "y", { segments: 24 });
      for (const yy of [0.25, 0.7, 1.15]) sub.add("holoBright", new THREE.TorusGeometry(0.34, 0.02, 6, 32), { pos: [0, yy, 0], rot: [Math.PI / 2, 0, 0], uv: "keep" });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        sub.add("holoBright", new THREE.BoxGeometry(0.3, 0.02, 0.02), { pos: [Math.cos(a) * 0.5, 0.95, Math.sin(a) * 0.5], rot: [0, -a, 0], uv: "keep" });
      }
      sub.add("holo", new THREE.CylinderGeometry(0.62, 0.62, 0.02, 32, 1, true), { pos: [0, 0.02, 0], uv: "keep" });
    });
    kit.onUpdate((dt) => {
      g.rotation.y += dt * 0.35;
    });
  }
  void rand;
  void UP;
}
