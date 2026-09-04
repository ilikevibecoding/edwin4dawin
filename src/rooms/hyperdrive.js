// Hyperdrive & Propulsion (deck D): an 18 m horizontal hyperdrive core on two cradles, wrapped in
// alternating armour and blue coil rings that pulse in sequence, power conduits arcing to the walls,
// a raised inspection catwalk ring at y = 3 with railings reached by two stair runs, a control pulpit
// on a dais by the door, coolant tanks in the aft corners, a power coupling block at the core's aft
// nozzle, hazard stripes around the cradle footprint, roof trusses and a hoist rail with a slowly
// traversing trolley. The forward nozzle is a dark aperture ring with a pulsing blue core behind a
// slowly turning rotor and coil rings. The N wall carries the equipment bank (racks, breaker board,
// cable trays from the cradles); the S wall the coolant manifold (header, valves, gauges, floor runs
// to the cradles). Light: the drive's own blue glow plus five hooded work lamps hung from the trusses
// and aimed at the drive / pulpit at half strength; no bare lamps under the ceiling.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impConsole, impChair, impRailing, impWallGear, impCrate, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { rng, insideOut } from "../kit.js";
import { ensureDeckDMaterials, shellNoFloor, deckFloor, screenBank, pipe, pipePath, valveWheel, gauge, junctionBox, tank, dais, hazardBorder, decalD, decalImp, DECK_D_DECAL, wallU, warningLamp, cable, solidStairs, catwalk, pulseRings, assembly, truss, blinkers, hexBolt, cableTray, shroudLamp, equipmentRack, breakerBoard } from "./deck_d_kit.js";

const LOW = "roomsd_blueLow"; // dim blue practicals: rail LEDs, strips, collar rings
const SLOT = "roomsd_slot"; // recessed white slots (screen-wall cornices)

export function buildHyperdrive(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = "emitBlue"; // small LEDs only
  ensureDeckDMaterials(kit);
  const rand = rng(8811);

  // --- shell: the two long walls differ (N: wide panels, equipment / screens; S: narrow grey panels, vents / conduit)
  const walls = shellNoFloor(kit, room, ctx.doors, {
    accentKey,
    seed: 2207,
    wall: { panelW: 2.1, features: { vent: 0.12, equipment: 0.1, conduit: 0.14, light: 0.0, screen: 0.04 }, altChance: 0.3, bands: [3.2, 5.6] },
    walls: {
      N: { panelW: 2.7, bands: [2.4, 5.4], features: { vent: 0.06, equipment: 0.14, conduit: 0.06, light: 0.0, screen: 0.08 }, altChance: 0.15 },
      S: { panelW: 1.6, bands: [3.8], features: { vent: 0.18, equipment: 0.02, conduit: 0.22, light: 0.0, screen: 0.0 }, altChance: 0.5, panelColor: PALETTE.impGrey, panelColorAlt: PALETTE.impGreyDark, kickH: 0.6 },
    },
    ceiling: { troughs: 2, troughW: 0.6, beamStep: 4.2, accentKey: LOW },
  });
  deckFloor(kit, -hx, -hz, hx, hz, []);
  // entry lane from the blast door, chevron lanes to both stairs (fine chevron repeat: no stair-stepped edges)
  kit.boxMM("impMetalRough", [-hx + 0.3, 0.0, -1.3], [-8.3, 0.012, 1.3], { color: PALETTE.impGreyDark, texel: 0.7 });
  for (const s of [-1, 1]) kit.boxMM("impTrim", [-hx + 0.3, 0, s * 1.3 - 0.03], [-8.3, 0.014, s * 1.3 + 0.03], { color: PALETTE.impBlack });
  for (const s of [-1, 1]) {
    kit.boxMM("chevronY", [-12.7, 0.003, s > 0 ? 1.3 : -12.3], [-11.5, 0.009, s > 0 ? 12.3 : -1.3], { texel: 3.0 });
    kit.boxMM("chevronY", [-11.5, 0.003, s > 0 ? 11.7 : -12.3], [-10.5, 0.009, s > 0 ? 12.3 : -11.7], { texel: 3.0 });
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
    const xc = (xa + xb) / 2;
    kit.cyl(i % 2 ? "impPanel1" : "impMetal", xc, cy, 0, R + 0.05, xb - xa, "x", { color: i % 2 ? PALETTE.impGrey : PALETTE.impCharcoal, segments: 40, uv: "world", texel: 0.6 });
    // recessed hex bolts along the top and both flanks of every band; inspection hatches on every fourth band
    for (const [a, facing] of [[0, "up"], [Math.PI / 2, "+z"], [-Math.PI / 2, "-z"]]) {
      const bp = [xc, cy + Math.cos(a) * (R + 0.05), Math.sin(a) * (R + 0.05)];
      if (i % 4 === 2 && facing !== "up") {
        kit.add("impTrim", new THREE.BoxGeometry(0.56, 0.05, 0.44), { pos: [bp[0], bp[1] + Math.cos(a) * 0.02, bp[2] + Math.sin(a) * 0.02], rot: [a, 0, 0], color: PALETTE.impBlack, texel: 1 });
        for (const [du, dv] of [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]]) hexBolt(kit, [bp[0] + du, bp[1] + Math.cos(a) * 0.05 + (facing === "up" ? 0 : dv), bp[2] + Math.sin(a) * 0.05], facing, 0.035);
        decalImp(kit, IMP_DECAL.glyphs3, [bp[0], bp[1] + Math.cos(a) * 0.056, bp[2] + Math.sin(a) * 0.056], facing, 0.22);
      } else {
        for (const du of [-0.22, 0.22]) hexBolt(kit, [bp[0] + du, bp[1] + Math.cos(a) * 0.012, bp[2] + Math.sin(a) * 0.012], facing, 0.04);
      }
    }
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
  // end caps: cone + flange (ring of recessed hex bolts) + nozzle stub at both ends
  for (const s of [-1, 1]) {
    const xe = s < 0 ? cx0 : cx1;
    // kit.cyl along x maps the geometry's top (r2) to the -x end
    kit.cyl("impMetal", xe + s * 0.6, cy, 0, s < 0 ? R : 1.5, 1.2, "x", { r2: s < 0 ? 1.5 : R, color: PALETTE.impGreyDark, segments: 40, texel: 0.5 });
    kit.cyl("impTrim", xe + s * 1.3, cy, 0, 1.7, 0.2, "x", { color: PALETTE.impBlack, segments: 32 });
    // the W stub is an open ring (the aperture cavity sits inside it); the E stub is solid
    kit.cyl("impMetal", xe + s * 1.65, cy, 0, 1.05, 0.5, "x", { color: PALETTE.impCharcoal, segments: 32, open: s < 0 });
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      hexBolt(kit, [xe + s * 1.4, cy + Math.cos(a) * 1.42, Math.sin(a) * 1.42], s < 0 ? "-x" : "+x", 0.07);
    }
    kit.add("impTrim", new THREE.TorusGeometry(1.12, 0.05, 6, 32), { pos: [xe + s * 1.91, cy, 0], rot: [0, Math.PI / 2, 0], color: PALETTE.impBlack, uv: "scale", uvScale: [8, 1] });
    kit.add(LOW, new THREE.TorusGeometry(1.1, 0.02, 6, 32), { pos: [xe + s * 1.915, cy, 0], rot: [0, Math.PI / 2, 0], uv: "keep" });
  }
  // W nozzle: the aperture seen from the door. A dark bezel ring inside the open stub around a short
  // cavity (the flange and cone behind are solid, so the cavity stays within the stub's 0.5 m); inside,
  // three coil rings (dim blue) step down to a white-blue core that pulses, with a six-blade rotor
  // turning at the mouth. A blue point in front of the aperture pulses with the core.
  const xa = cx0 - 1.9; // aperture plane
  const corePulse = (t) => {
    const p = 0.5 + 0.5 * Math.sin(t * 2.4);
    return p * p;
  };
  {
    kit.add("impTrim", new THREE.TorusGeometry(0.93, 0.13, 10, 40), { pos: [xa - 0.02, cy, 0], rot: [0, Math.PI / 2, 0], color: PALETTE.impBlack, uv: "scale", uvScale: [10, 1] });
    kit.add("impTrim", insideOut(new THREE.CylinderGeometry(0.82, 0.82, 0.46, 32, 1, true)), { pos: [xa + 0.23, cy, 0], rot: [0, 0, Math.PI / 2], color: PALETTE.impCharcoal, uv: "scale", uvScale: [6, 1] });
    kit.cyl("impMetal", xa + 0.48, cy, 0, 0.84, 0.04, "x", { color: PALETTE.impCharcoal, segments: 32 });
    for (const [dx, r] of [[0.16, 0.72], [0.26, 0.64], [0.36, 0.56]]) {
      kit.add("impTrim", new THREE.TorusGeometry(r + 0.045, 0.035, 6, 32), { pos: [xa + dx, cy, 0], rot: [0, Math.PI / 2, 0], color: PALETTE.impGreyDark, uv: "scale", uvScale: [8, 1] });
      kit.add(LOW, new THREE.TorusGeometry(r, 0.016, 6, 32), { pos: [xa + dx + 0.015, cy, 0], rot: [0, Math.PI / 2, 0], uv: "keep" });
    }
    kit.cyl("roomsd_coreBlue", xa + 0.44, cy, 0, 0.36, 0.05, "x", { segments: 24 });
    kit.add(LOW, new THREE.TorusGeometry(0.4, 0.022, 6, 32), { pos: [xa + 0.42, cy, 0], rot: [0, Math.PI / 2, 0], uv: "keep" });
    const rotor = assembly(kit, [xa + 0.08, cy, 0], (sub) => {
      sub.cyl("impTrim", 0, 0, 0, 0.13, 0.2, "x", { color: PALETTE.impGreyDark, segments: 12 });
      sub.cyl("impTrim", -0.11, 0, 0, 0.07, 0.04, "x", { color: PALETTE.impBlack, segments: 6 });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        sub.add("impTrim", new THREE.BoxGeometry(0.03, 0.56, 0.15), { pos: [0, Math.cos(a) * 0.4, Math.sin(a) * 0.4], rot: [a, 0.45, 0], color: PALETTE.impCharcoal, texel: 2 });
      }
    });
    const core = kit.materials.roomsd_coreBlue;
    const coreBase = new THREE.Color(0x9fd0ff);
    kit.onUpdate((dt) => {
      rotor.rotation.x += dt * 0.9;
      // same clock as the light pool's dim() hook so the point light and the lens pulse together
      core.color.copy(coreBase).multiplyScalar(1.0 + 1.1 * corePulse(performance.now() * 0.001));
    });
  }
  // E nozzle: conduit down into the coupling block
  pipePath(kit, [[cx1 + 1.9, cy, 0], [cx1 + 2.6, cy, 0], [cx1 + 2.6, 1.6, 0], [cx1 + 3.1, 1.6, 0]], 0.42, { color: PALETTE.impGreyDark, clampStep: 1.0 });
  // cradles: base slab, inclined struts, saddle band, hazard stencil, bolted feet, oil grime
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
      for (const dx of [-0.6, 0.6]) hexBolt(kit, [cxC + dx, 0.9, s * 2.45], s > 0 ? "+z" : "-z", 0.05);
    }
    kit.add("impTrim", new THREE.TorusGeometry(R + 0.28, 0.24, 10, 48), { pos: [cxC, cy, 0], rot: [0, Math.PI / 2, 0], color: PALETTE.impBlack, uv: "scale", uvScale: [12, 1] });
    for (const zz of [-2.2, 2.2]) kit.box("impMetal", cxC, 0.9, zz, 1.9, 0.6, 0.5, { color: PALETTE.impGreyDark, texel: 1 });
    decalD(kit, DECK_D_DECAL.oil, [cxC + 1.6, 0.018, 1.4], "up", 1.5);
  }
  kit.collider([cx0 - 2.0, 0, -3.0], [cx1 + 3.2, cy + R + 0.4, 3.0], "core");
  hazardBorder(kit, cx0 - 2.4, -3.5, cx1 + 3.5, 3.5, 0, 0.32, "chevronY", 3.0);
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
  // N side: cable trays on the floor from the cradle feet to the equipment bank on the wall
  cableTray(kit, [[-2.3, 0, -3.4], [-4.6, 0, -3.4], [-4.6, 0, -(hz - 0.45)]], { w: 0.5, seed: 21, cables: 4 });
  cableTray(kit, [[9.3, 0, -3.4], [10.4, 0, -3.4], [10.4, 0, -(hz - 0.45)]], { w: 0.42, seed: 22, cables: 3 });
  for (const x of [-4.6, 10.4]) {
    pipe(kit, [x, 0.1, -(hz - 0.3)], [x, 2.3, -(hz - 0.3)], 0.07, { color: PALETTE.impGreyDark, clampStep: 1.0 });
    kit.box("impTrim", x, 0.12, -(hz - 0.32), 0.7, 0.24, 0.3, { color: PALETTE.impBlack, texel: 1 });
  }
  // S side: coolant runs on the floor from the cradle feet up into the manifold header on the wall
  for (const x of [-4.0, 8.0]) {
    pipePath(kit, [[x, 0.17, 2.6], [x, 0.17, hz - 0.55], [x, 1.35, hz - 0.55]], 0.15, { color: PALETTE.impGreyDark, clampStep: 1.8 });
    decalD(kit, DECK_D_DECAL.grime, [x + 0.6, 0.018, 8.0], "up", 1.2);
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
    // inner rails (facing the core), dim LED strip
    rail([eI, s * (zi + 0.1)], [eE, s * (zi + 0.1)], LOW);
    // W run: inner edge segments beside the landings
    rail([eI - 0.1, s * (zo)], [eI - 0.1, s * 6.4]);
  }
  rail([N0 + 0.1, -6.4], [N0 + 0.1, 6.4]); // W run outer (west) edge, full
  rail([eI - 0.1, -zi], [eI - 0.1, zi], LOW); // W run inner edge facing the nozzle
  rail([eE + 0.1, -zi], [eE + 0.1, zi], LOW); // E run inner edge facing the aft nozzle
  rail([N1 - 0.1, -zo], [N1 - 0.1, zo]); // E run outer edge
  // stair runs up to the W run landings (rise toward the core along z)
  solidStairs(kit, N0, -11.6, N0 + 1.6, -6.5, "z", -11.6, -6.5, 0, Y, { rails: ["-", "+"], railKey: LOW });
  solidStairs(kit, N0, 6.5, N0 + 1.6, 11.6, "z", 11.6, 6.5, 0, Y, { rails: ["-", "+"], railKey: LOW });
  // inspection kit on the catwalk: a toolbox, a portable scanner post, a coiled hose
  impCrate(kit, 3.0, Y, -zo + 0.7, 0.9, 0.5, 0.6, { seed: 12, decal: IMP_DECAL.glyphs1 });
  kit.box("impTrim", 9.0, Y + 0.6, zo - 0.55, 0.3, 1.2, 0.3, { color: PALETTE.impBlack });
  kit.box(LOW, 9.0, Y + 1.15, zo - 0.55, 0.32, 0.05, 0.32);
  kit.collider([8.8, Y, zo - 0.75], [9.2, Y + 1.3, zo - 0.35], "post");
  kit.add("impMetal", new THREE.TorusGeometry(0.3, 0.05, 8, 20), { pos: [-3.5, Y + 0.06, zo - 0.7], rot: [Math.PI / 2, 0, 0], color: PALETTE.impGreyDark, uv: "scale", uvScale: [4, 1] });

  // --- control pulpit on a dais by the door (two consoles facing the core)
  {
    const x0 = -16.2;
    const x1 = -12.2;
    const z0 = 2.6;
    const z1 = 6.6;
    dais(kit, x0, z0, x1, z1, 0.3);
    for (const [i, z] of [3.6, 5.6].entries()) {
      impConsole(kit, -13.2, 0.32, z, 1.7, 0.9, { yaw: -Math.PI / 2, seed: 300 + Math.round(z * 10), screens: i === 0 ? ["scrBlue2", "scrWhite1"] : ["scrBlue0", "scrBlue1"], accentKey });
      impChair(kit, -14.25, 0.32, z, -Math.PI / 2);
    }
    impRailing(kit, [x0 + 0.1, z0 + 0.1], [x1 - 0.1, z0 + 0.1], 0.32, { light: LOW });
    impRailing(kit, [x1 - 0.1, z0 + 0.1], [x1 - 0.1, z1 - 0.1], 0.32, { light: LOW });
    const Wf = walls.W.frame;
    const u = wallU(room, "W", 4.6);
    Wf.box("impTrim", u, 2.6, 0.1, 3.6, 2.2, 0.2, { color: PALETTE.impBlack, texel: 1 });
    Wf.box("impGloss", u, 2.6, 0.21, 3.4, 2.0, 0.02);
    Wf.screen("scrBlue2", u, 2.9, 0.225, 3.1, 1.2);
    for (let k = 0; k < 4; k++) Wf.screen(k % 2 ? "scrBlue0" : "scrWhite1", u - 1.2 + k * 0.8, 1.95, 0.225, 0.7, 0.36);
    // recessed cornice slot over the screen wall (dim, in a black channel)
    Wf.box("impTrim", u, 3.78, 0.2, 3.4, 0.1, 0.04, { color: PALETTE.impBlack });
    Wf.box(SLOT, u, 3.78, 0.222, 3.2, 0.04, 0.012, { uv: "keep" });
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
    kit.add(LOW, new THREE.TorusGeometry(0.5, 0.03, 6, 32), { pos: [14.0, 1.6, 0], rot: [0, Math.PI / 2, 0], uv: "keep" });
    for (const zz of [-1.0, 1.0]) {
      kit.box("impMetal", 14.18, 1.2, zz, 0.04, 1.6, 0.9, { color: PALETTE.impCharcoal, texel: 1 });
      for (let k = 0; k < 5; k++) kit.box(k === 3 ? "emitRedImp" : accentKey, 14.21, 1.8 - k * 0.22, zz - 0.3, 0.01, 0.05, 0.05);
      gauge(kit, [14.21, 1.5, zz + 0.2], "-x", 0.1, { seed: 520 + zz });
    }
    for (let k = 0; k < 6; k++) cable(kit, [[14.4, 2.4, -1.3 + k * 0.5], [13.9, 2.9 + 0.1 * (k % 2), -1.3 + k * 0.5], [13.4, 2.4, -1.3 + k * 0.5]], 0.02, { color: k % 2 ? PALETTE.impBlack : PALETTE.impBlueDeep });
    decalImp(kit, IMP_DECAL.power, [14.19, 0.6, 0], "-x", 0.4);
    kit.collider([14.1, 0, -1.65], [hx, 2.6, 1.65], "coupling");
    screenBank(E, wallU(room, "E", 0) - 2.7, 4.6, 4, 2, 1.1, 0.6, 0.1, ["scrBlue0", "scrBlue2", "scrWhite1", "scrBlue1"], { seed: 530 });
    E.box("impTrim", wallU(room, "E", 0), 6.35, 0.06, 5.2, 0.12, 0.04, { color: PALETTE.impBlack });
    E.box(SLOT, wallU(room, "E", 0), 6.35, 0.082, 5.0, 0.05, 0.012, { uv: "keep" });
    E.decal(IMP_DECAL.glyphs1, wallU(room, "E", 0), 6.7, 0.03, 0.5);
  }

  // --- N wall: equipment bank (three racks + breaker board), junction boxes, wall cable tray up high
  {
    const F = walls.N.frame;
    for (const [i, x] of [-3.0, -1.6, -0.2].entries()) equipmentRack(kit, x, -(hz - 0.45), 1.2, 2.4, 0.7, "+z", { seed: 700 + i, accentKey, screens: false });
    breakerBoard(F, wallU(room, "N", 2.6), 0.3, 1.6, 2.2, { seed: 41, accentKey: "emitAmber" });
    hazardBorder(kit, -3.8, -(hz - 0.1), 3.6, -(hz - 1.25), 0, 0.2, "chevronY", 3.0);
    junctionBox(F, wallU(room, "N", -13.5), 2.2, 0.8, 1.0, { seed: 599, accentKey });
    junctionBox(F, wallU(room, "N", 6.4), 2.4, 0.7, 0.9, { seed: 609, accentKey, drops: 1 });
    impWallGear(F, wallU(room, "N", 11.0), 1.5, { seed: 619, accentKey });
    F.decal(IMP_DECAL.keepClear, wallU(room, "N", -9.7), 3.9, 0.03, 0.6);
    F.decal(IMP_DECAL.power, wallU(room, "N", -1.6), 3.4, 0.03, 0.7);
    cableTray(kit, [[-hx + 0.6, 6.6, -(hz - 0.5)], [hx - 3.2, 6.6, -(hz - 0.5)]], { w: 0.5, seed: 23, cables: 4, depth: 0.14 });
    for (let x = -hx + 1.5; x < hx - 3.2; x += 4.0) kit.box("impMetal", x, 6.55, -(hz - 0.25), 0.08, 0.1, 0.5, { color: PALETTE.impGreyDark });
    warningLamp(kit, [-9.7, 4.4, -(hz - 0.35)], "emitAmber");
  }
  // --- S wall: coolant manifold (header pipe, six valves with gauges, end blocks, drops from the ceiling mains)
  {
    const F = walls.S.frame;
    const zh = hz - 0.55;
    const yh = 1.5;
    pipe(kit, [-6.0, yh, zh], [12.0, yh, zh], 0.17, { color: PALETTE.impGrey, clampStep: 3.0, flanges: true });
    for (const x of [-6.0, 12.0]) {
      kit.box("impTrim", x, yh, hz - 0.3, 0.9, 1.4, 0.6, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impMetal", x, yh + 0.75, hz - 0.3, 1.0, 0.1, 0.7, { color: PALETTE.impCharcoal, texel: 1 });
      pipe(kit, [x, yh + 0.8, hz - 0.3], [x, 6.85, hz - 0.3], 0.12, { color: PALETTE.impGreyDark, clampStep: 2.0 });
      kit.collider([x - 0.45, 0, hz - 0.6], [x + 0.45, 2.3, hz], "manifoldBlock");
    }
    for (let k = 0; k < 6; k++) {
      const x = -4.0 + k * 3.0;
      // hand wheel on top of the header (stem down into the pipe), a drop to the floor under it
      // (the two floor coolant runs rise into the header at k = 0 and 4)
      valveWheel(kit, [x, yh + 0.45, zh], "y", 0.17, { color: k === 2 ? PALETTE.impAmber : PALETTE.impRed, stem: 0.3 });
      if (k !== 0 && k !== 4) kit.cyl("impTrim", x, yh - 0.6, zh, 0.09, 1.2, "y", { color: PALETTE.impBlack, segments: 10 });
      const gp = F.pos(wallU(room, "S", x), yh + 0.95, 0.18);
      gauge(kit, [gp.x, gp.y, gp.z], "-z", 0.11, { seed: 640 + k, warn: k === 4 });
      F.decal(IMP_DECAL.glyphs1, wallU(room, "S", x) + 0.45, yh + 0.95, 0.03, 0.22);
    }
    kit.collider([-6.4, 0, hz - 0.85], [12.4, 1.9, hz], "manifold");
    decalD(kit, DECK_D_DECAL.grime, [1.0, 0.018, hz - 1.3], "up", 1.4);
    decalD(kit, DECK_D_DECAL.oil, [6.5, 0.018, hz - 1.5], "up", 1.2);
    junctionBox(F, wallU(room, "S", -13.5), 2.2, 0.8, 1.0, { seed: 601, accentKey });
    junctionBox(F, wallU(room, "S", 3.2), 3.1, 0.7, 0.9, { seed: 611, accentKey, drops: 1 });
    impWallGear(F, wallU(room, "S", -7.6), 2.6, { seed: 621, accentKey });
    F.decal(IMP_DECAL.keepClear, wallU(room, "S", -9.7), 3.9, 0.03, 0.6);
    F.decal(IMP_DECAL.hazard, wallU(room, "S", 9.6), 3.0, 0.03, 0.6);
    pipe(kit, [-hx + 0.4, 6.9, hz - 0.32], [hx - 3.0, 6.9, hz - 0.32], 0.12, { color: PALETTE.impGrey, clampStep: 2.6 });
    pipe(kit, [-hx + 0.4, 7.2, hz - 0.28], [hx - 3.0, 7.2, hz - 0.28], 0.08, { color: PALETTE.impGreyDark, clampStep: 2.6 });
    warningLamp(kit, [-9.7, 4.4, hz - 0.35], "emitAmber");
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
  // (two materials only: every extra key in an assembly is one more mesh in the cell)
  const trolley = assembly(kit, [0, railY, railZ], (s) => {
    s.box("impTrim", 0, -0.35, 0, 0.9, 0.36, 0.6, { color: PALETTE.impBlack, texel: 1 });
    s.box("impMetal", 0, -0.62, 0, 0.5, 0.2, 0.5, { color: PALETTE.impCharcoal, texel: 1 });
    for (const dx of [-0.3, 0.3]) for (const dz of [-0.3, 0.3]) s.cyl("impMetal", dx, -0.05, dz, 0.12, 0.08, "z", { color: PALETTE.impGrey, segments: 12 });
    s.box("impMetal", 0.3, -0.5, 0.31, 0.12, 0.06, 0.01, { color: PALETTE.impAmber });
    for (const dx of [-0.1, 0.1]) s.cyl("impMetal", dx, -1.1, 0, 0.012, 0.8, "y", { color: PALETTE.impGreyDark, segments: 6 });
    s.box("impTrim", 0, -1.7, 0, 0.36, 0.5, 0.26, { color: PALETTE.impBlack, texel: 1 });
    s.box("impMetal", 0, -1.7, 0.135, 0.3, 0.3, 0.01, { color: PALETTE.impAmber });
    s.add("impMetal", new THREE.TorusGeometry(0.16, 0.035, 8, 16, Math.PI * 1.3), { pos: [0, -2.1, 0], rot: [0, 0, Math.PI * 0.85], color: PALETTE.impGrey, uv: "scale", uvScale: [4, 1] });
  });
  kit.onUpdate((dt, t) => {
    const u = 0.5 + 0.5 * Math.sin(t * 0.09);
    trolley.position.x = -12 + 24 * u;
  });

  // --- lights (8). Key: the drive's blue glow — a point in the coil area, one over the aft half, and
  // one in front of the aperture that pulses with the core. Work light: four hooded lamps hung from the
  // trusses beside the catwalks, aimed at the drive at about half the old bare lamps' strength (the pair
  // by the nozzle are spots, the aft pair points at the lens), and one over the pulpit. Nothing under
  // the ceiling itself, so the black ceiling carries no hotspots.
  const blue = 0x4f8dff;
  const work = 0xe4ecff;
  kit.light({ type: "point", pos: [3.0, cy, 0], color: blue, intensity: lux(4.5, 3.0), distance: 17, priority: 0.7 });
  kit.light({ type: "point", pos: [xa - 1.3, cy, 0], color: 0x8fbcff, intensity: lux(4.0, 2.6), distance: 15, priority: 0.68, dim: (t) => 0.55 + 0.45 * corePulse(t) });
  kit.light({ type: "point", pos: [8.5, cy + R + 1.2, 0], color: blue, intensity: lux(3.8, 3.0), distance: 16, priority: 0.65 });
  const yT = h - 0.95; // truss bottom chord
  for (const [i, [x, z]] of [[-7, -6.6], [-7, 6.6], [5, -6.6], [5, 6.6]].entries()) {
    const lamp = [x, 5.7, z];
    const aim = [x + 1.0, cy - 0.4, 0];
    shroudLamp(kit, [x, yT, z], lamp, aim, { key: "emitWhiteDim", size: 0.55 });
    if (x < 0) kit.light({ type: "spot", pos: lamp, target: aim, color: work, intensity: lux(5.5, 2.8), distance: 22, angle: 0.72, penumbra: 0.55, priority: 0.8 - i * 0.01 });
    else kit.light({ type: "point", pos: [lamp[0] + 0.15, lamp[1] - 0.35, lamp[2] - Math.sign(z) * 0.35], color: work, intensity: lux(5.5, 1.7), distance: 18, priority: 0.6 - i * 0.01 });
  }
  shroudLamp(kit, [-13, yT, 4.6], [-13.2, 5.3, 4.6], [-13.6, 0.9, 4.6], { key: "emitWhiteDim", size: 0.45 });
  kit.light({ type: "point", pos: [-13.3, 4.9, 4.6], color: 0xfff0dc, intensity: lux(4.6, 1.6), distance: 14, priority: 0.55 });
  void rand;
}
