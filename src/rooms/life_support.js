// Life Support — Air / Water / Waste (deck D). A row of five water tanks with level gauges along the
// N wall tied together by header and collector pipes, three air scrubber units with big spoked fan
// grilles on the S wall (the middle fan turns), filter banks with instanced removable cartridges on
// the W wall, a waste processing hopper with hazard marking in the SE corner, a pump manifold rack
// along the N half, a monitoring console by the door, a grated service trench with lit pipes below,
// condensation streaks low on the walls; in the middle of the room the central manifold / scrubber
// stack: an octagonal plinth ringed by four grated trenches carrying a 3 m drum with bolted band
// flanges, sight glass and gauges toward the door, four satellite scrubber cylinders tied to it by a
// ring header and valved cross-pipes, and five risers into the ceiling; in the E half a run of engineering-style
// equipment cabinets and a chemical dosing skid under the N-wall gauges, and a CO2 processor column
// with its air-quality screen bank on the S wall.
// Light: the ship's cool white — four hooded spots (pump rack, door approach, central stack) and low pendants over
// the tanks, the scrubbers, the filter banks and the waste unit; green is reserved for the one status
// light / level gauge on each tank; wall and equipment accents are the ship's blue; the ceiling slots
// are dim recessed lines, never the key. The deck is plain tile (nothing drives through here).
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impConsole, impChair, impWallGear, impWallLight, impCrate, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { rng } from "../kit.js";
import { ensureDeckDMaterials, shellNoFloor, deckFloor, grateTrench, pipe, pipePath, valveWheel, gauge, junctionBox, tank, hazardBorder, decalD, decalImp, DECK_D_DECAL, wallU, warningLamp, assembly, blinkers, equipmentRack, screenBank, instGeo, shroudLamp, hexBolt, cabinetRow } from "./deck_d_kit.js";

export function buildLifeSupport(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = "emitBlue"; // wall / equipment LEDs: the ship's blue
  const TANK = "emitGreen"; // one green status light + level gauge per tank, the room's only green
  const DIM = "roomsd_blueLow"; // dim blue practicals (strips, ceiling coffer accents)
  const LENS = "emitWhiteDim"; // hooded lamp lenses
  ensureDeckDMaterials(kit);
  const rand = rng(6103);

  // --- shell + deck with the service trench cutout
  const walls = shellNoFloor(kit, room, ctx.doors, {
    accentKey,
    seed: 3301,
    wall: { panelW: 1.8, features: { vent: 0.16, equipment: 0.1, conduit: 0.16, light: 0.0, screen: 0.04 }, altChance: 0.35 },
    ceiling: { troughs: 2, troughW: 0.36, beamStep: 3.4, accentKey: DIM, lightKey: "roomsd_slot" },
  });
  const trench = { x0: -14.0, z0: 3.9, x1: 11.0, z1: 5.3 };
  // the central stack stands on an octagonal plinth ringed by four grated service trenches
  const SX = 4.0;
  const SZ = 0.0;
  const G0 = 2.4; // grate ring inner half-size
  const G1 = 3.4; // grate ring outer half-size
  const ring = [
    { x0: SX - G1, z0: SZ - G1, x1: SX + G1, z1: SZ - G0 },
    { x0: SX - G1, z0: SZ + G0, x1: SX + G1, z1: SZ + G1 },
    { x0: SX - G1, z0: SZ - G0, x1: SX - G0, z1: SZ + G0 },
    { x0: SX + G0, z0: SZ - G0, x1: SX + G1, z1: SZ + G0 },
  ];
  deckFloor(kit, -hx, -hz, hx, hz, [trench, ...ring]);
  grateTrench(kit, trench.x0, trench.z0, trench.x1, trench.z1, { depth: 0.7, seed: 44, cables: 4, accentKey });
  ring.forEach((r, i) => grateTrench(kit, r.x0, r.z0, r.x1, r.z1, { depth: 0.45, seed: 60 + i, cables: 2, accentKey: DIM }));
  // plain tile from the door (no lane, no mat); section stencils in dark deck paint
  decalImp(kit, IMP_DECAL.vacuum, [-8.0, 0.016, -7.45], "up", 1.2, { mat: "roomsd_stencil" });
  decalImp(kit, IMP_DECAL.cog, [11.0, 0.016, 0], "up", 1.6, { mat: "roomsd_stencil" });

  // --- central manifold / scrubber stack: octagonal plinth (blue hairline), a 3 m drum with bolted band
  // flanges, sight glass, gauge pair and LED row toward the door, four satellite scrubber cylinders on the
  // diagonals tied to the drum by a ring header below and valved cross-pipes above, and five risers into
  // the ceiling; hazard border around the grate ring
  {
    const R = 2.3; // plinth circumradius (vertices on the axes and diagonals)
    const PT = 0.3; // plinth height
    kit.cyl("impTrim", SX, PT / 2, SZ, R, PT, "y", { color: PALETTE.impBlack, segments: 8, texel: 1 });
    kit.cyl("impMetal", SX, PT + 0.02, SZ, R - 0.12, 0.04, "y", { color: PALETTE.impCharcoal, segments: 8, texel: 1 });
    kit.cyl(DIM, SX, PT - 0.08, SZ, R + 0.012, 0.03, "y", { segments: 8, uv: "keep" });
    kit.collider([SX - R, 0, SZ - R], [SX + R, 4.2, SZ + R], "stack");
    const top = PT + 0.04;
    const DR = 0.85;
    const DH = 3.0;
    kit.cyl("impMetal", SX, top + DH / 2, SZ, DR, DH, "y", { color: PALETTE.impGrey, segments: 28, texel: 0.8 });
    for (const yy of [top + 0.5, top + 1.5, top + 2.5]) {
      kit.cyl("impTrim", SX, yy, SZ, DR + 0.04, 0.12, "y", { color: PALETTE.impBlack, segments: 28 });
      for (let b = 0; b < 5; b++) {
        const a = -0.6 + (b / 4) * 1.2;
        hexBolt(kit, [SX + Math.cos(a) * (DR + 0.04), yy, SZ + Math.sin(a) * (DR + 0.04)], "+x", 0.035);
      }
    }
    kit.cyl("impMetal", SX, top + DH + 0.15, SZ, DR, 0.3, "y", { r2: DR * 0.42, color: PALETTE.impCharcoal, segments: 28 });
    pipe(kit, [SX, top + DH + 0.25, SZ], [SX, h - 0.3, SZ], 0.32, { color: PALETTE.impGreyDark, flanges: true, clampStep: 0.7 });
    // sight glass, gauges, LEDs and stencil on the drum's door-facing (+x) side
    kit.box("impTrim", SX + DR - 0.02, top + 1.35, SZ, 0.1, 1.0, 0.3, { color: PALETTE.impBlack });
    kit.box(DIM, SX + DR + 0.032, top + 1.35, SZ, 0.01, 0.84, 0.16, { uv: "keep" });
    gauge(kit, [SX + DR + 0.01, top + 2.15, SZ - 0.36], "+x", 0.11, { seed: 850 });
    gauge(kit, [SX + DR + 0.01, top + 2.15, SZ + 0.36], "+x", 0.11, { seed: 851, warn: true });
    for (let k = 0; k < 6; k++) kit.box(k === 4 ? "emitRedImp" : accentKey, SX + DR + 0.006, top + 0.62, SZ - 0.3 + k * 0.12, 0.012, 0.05, 0.05);
    decalImp(kit, IMP_DECAL.glyphs2, [SX + DR + 0.006, top + 2.72, SZ], "+x", 0.4);
    // ring header around the drum base with four radial stubs
    kit.add("impMetal", new THREE.TorusGeometry(1.3, 0.08, 8, 48).rotateX(Math.PI / 2), { pos: [SX, top + 0.55, SZ], color: PALETTE.impGreyDark, uv: "scale", uvScale: [16, 1] });
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      pipe(kit, [SX + Math.cos(a) * (DR - 0.05), top + 0.55, SZ + Math.sin(a) * (DR - 0.05)], [SX + Math.cos(a) * 1.3, top + 0.55, SZ + Math.sin(a) * 1.3], 0.07, { color: PALETTE.impGreyDark, flanges: true });
    }
    // four satellite scrubbers on the diagonals
    const SD = 1.77;
    const SR = 0.45;
    const SH = 2.3;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const ux = Math.cos(a);
      const uz = Math.sin(a);
      const sx = SX + ux * SD;
      const sz = SZ + uz * SD;
      kit.cyl("impMetal", sx, top + 0.08, sz, SR + 0.05, 0.16, "y", { color: PALETTE.impCharcoal, segments: 20 });
      kit.cyl("impPanel1", sx, top + 0.16 + SH / 2, sz, SR, SH, "y", { color: k % 2 ? PALETTE.impGreyDark : PALETTE.impGrey, segments: 20, uv: "world", texel: 0.8 });
      for (const yy of [top + 0.9, top + 1.9]) kit.cyl("impTrim", sx, yy, sz, SR + 0.03, 0.1, "y", { color: PALETTE.impBlack, segments: 20 });
      kit.cyl("impMetal", sx, top + 0.16 + SH + 0.1, sz, SR, 0.2, "y", { r2: 0.16, color: PALETTE.impGreyDark, segments: 20 });
      pipe(kit, [sx, top + 0.16 + SH + 0.2, sz], [sx, h - 0.3, sz], 0.13, { color: PALETTE.impGreyDark, flanges: true, clampStep: 0.9 });
      // valved cross-pipe to the drum at chest height
      pipe(kit, [SX + ux * (DR - 0.05), top + 1.75, SZ + uz * (DR - 0.05)], [SX + ux * (SD - SR + 0.05), top + 1.75, SZ + uz * (SD - SR + 0.05)], 0.09, { color: PALETTE.impGreyDark, flanges: true });
      valveWheel(kit, [SX + ux * 1.1, top + 1.75 + 0.09 + 0.16, SZ + uz * 1.1], "y", 0.14, { color: k === 2 ? PALETTE.impAmber : PALETTE.impRed, stem: 0.16 });
      // status lamp and a stencil on the outward face
      kit.add(k === 1 ? "emitRedImp" : accentKey, new THREE.BoxGeometry(0.07, 0.07, 0.012), { pos: [sx + ux * SR, top + 0.55, sz + uz * SR], rot: [0, Math.PI / 2 - a, 0] });
      kit.add("impTrim", new THREE.BoxGeometry(0.3, 0.16, 0.02), { pos: [sx + ux * (SR - 0.005), top + 0.36, sz + uz * (SR - 0.005)], rot: [0, Math.PI / 2 - a, 0], color: PALETTE.impBlack });
    }
    kit.box("impTrim", SX + 0.5, top + DH + 0.26, SZ, 0.16, 0.14, 0.16, { color: PALETTE.impBlack });
    warningLamp(kit, [SX + 0.5, top + DH + 0.38, SZ], accentKey);
    hazardBorder(kit, SX - G1 - 0.32, SZ - G1 - 0.32, SX + G1 + 0.32, SZ + G1 + 0.32, 0, 0.26);
  }

  // --- water tanks along the N wall + header / collector pipes + hazard border
  const tankXs = [-13.4, -9.6, -5.8, -2.0, 1.8];
  const tz = -hz + 1.45;
  const tr = 1.0;
  const th = 3.9;
  tankXs.forEach((x, i) => tank(kit, x, tz, tr, th, { color: i % 2 ? PALETTE.impGrey : PALETTE.impWhite, accentKey: TANK, seed: 700 + i, level: 0.35 + rand() * 0.55, bands: 3, facing: "+z", label: [IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03][i % 3] }));
  const topY = th - 0.3 + tr;
  pipe(kit, [tankXs[0] - 0.6, topY + 0.02, tz], [tankXs[4] + 0.6, topY + 0.02, tz], 0.11, { color: PALETTE.impGrey, clampStep: 1.9, flanges: true });
  for (const x of tankXs) pipe(kit, [x, topY - 0.25, tz], [x, topY + 0.02, tz], 0.08, { color: PALETTE.impGreyDark });
  pipe(kit, [tankXs[4] + 0.6, topY + 0.02, tz], [tankXs[4] + 0.6, topY + 0.02, tz + 1.0], 0.11, { color: PALETTE.impGrey });
  pipe(kit, [tankXs[4] + 0.6, topY + 0.02, tz + 1.0], [tankXs[4] + 0.6, h - 0.35, tz + 1.0], 0.11, { color: PALETTE.impGrey, flanges: true });
  // collector at the valve outlets, running to a pump at the E end of the row
  const cz = tz + tr + 0.35 + 0.3;
  pipe(kit, [tankXs[0] - 0.4, 0.55, cz], [4.6, 0.55, cz], 0.1, { color: PALETTE.impGreyDark, clampStep: 2.0 });
  kit.collider([tankXs[0] - 0.5, 0, cz - 0.15], [4.6, 0.75, cz + 0.15], "collector");
  hazardBorder(kit, tankXs[0] - 1.5, -hz + 0.05, tankXs[4] + 1.5, cz + 0.6, 0, 0.26);
  // transfer pump at the row's end
  {
    const px = 5.6;
    kit.box("impTrim", px, 0.25, cz, 1.4, 0.5, 1.2, { color: PALETTE.impBlack, texel: 1 });
    kit.cyl("impMetal", px + 0.2, 0.85, cz, 0.32, 0.9, "x", { color: PALETTE.impGreyDark, segments: 20 });
    kit.cyl("impTrim", px - 0.45, 0.85, cz, 0.36, 0.3, "x", { color: PALETTE.impBlack, segments: 20 });
    kit.box("impMetal", px + 0.2, 1.3, cz, 0.5, 0.2, 0.5, { color: PALETTE.impCharcoal });
    for (let k = 0; k < 6; k++) kit.box("impTrim", px + 0.2, 0.85, cz, 0.7, 0.72 + k * 0.02, 0.02 + k * 0.004, { color: PALETTE.impBlack });
    gauge(kit, [px - 0.3, 1.3, cz + 0.62], "+z", 0.1, { seed: 720 });
    kit.box(accentKey, px + 0.2, 1.42, cz + 0.2, 0.06, 0.04, 0.06);
    pipe(kit, [px + 0.85, 0.85, cz], [px + 1.4, 0.85, cz], 0.1, { color: PALETTE.impGreyDark, flanges: true });
    // discharge riser to the ceiling main (keeps the walk lane clear)
    pipePath(kit, [[px + 1.4, 0.85, cz], [px + 1.9, 0.85, cz], [px + 1.9, h - 0.3, cz]], 0.1, { color: PALETTE.impGreyDark, clampStep: 1.4 });
    kit.collider([px - 0.75, 0, cz - 0.65], [px + 2.1, 1.5, cz + 0.65], "pump");
    decalD(kit, DECK_D_DECAL.oil, [px + 0.4, 0.018, cz + 1.0], "up", 2.4);
  }
  // condensation streaks on the N wall behind / between the tanks and a damp band along the kick
  for (let i = 0; i < 4; i++) decalD(kit, DECK_D_DECAL.streak, [(tankXs[i] + tankXs[i + 1]) / 2, 1.0, -hz + 0.075], "+z", 1.4, { h: 1.3 });
  decalD(kit, DECK_D_DECAL.grime, [-6.0, 0.36, -hz + 0.075], "+z", 12, { h: 0.5 });

  // --- air scrubbers along the S wall: box units with spoked fan grilles; the middle fan turns
  const scrubXs = [-12.4, -7.4, -2.4];
  let fanGroup = null;
  scrubXs.forEach((x, i) => {
    const zc = hz - 0.9;
    const W = 3.6;
    const H = 2.9;
    const D = 1.6;
    kit.box("impTrim", x, H / 2, zc, W, H, D, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impPanel1", x, H / 2 + 0.05, zc - D / 2 - 0.006, W - 0.2, H - 0.3, 0.012, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    kit.box("impMetal", x, 0.1, zc, W + 0.08, 0.2, D + 0.08, { color: PALETTE.impCharcoal, texel: 1 });
    // fan housing: recessed dark disc, rim torus, hub, 8 spokes; blades behind the spokes
    const fz = zc - D / 2 - 0.02;
    const fr = 0.95;
    const fy = 1.55;
    kit.cyl("impTrim", x, fy, zc - D / 2 + 0.25, fr + 0.05, 0.5, "z", { color: PALETTE.impBlack, segments: 32 });
    kit.cyl("impGloss", x, fy, zc - D / 2 + 0.05, fr - 0.02, 0.02, "z", { segments: 32 });
    kit.add("impMetal", new THREE.TorusGeometry(fr, 0.05, 8, 40), { pos: [x, fy, fz], color: PALETTE.impGreyDark, uv: "scale", uvScale: [8, 1] });
    kit.add("impMetal", new THREE.TorusGeometry(fr * 0.55, 0.025, 6, 32), { pos: [x, fy, fz - 0.01], color: PALETTE.impGreyDark, uv: "scale", uvScale: [6, 1] });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      kit.add("impMetal", new THREE.BoxGeometry(0.035, fr * 2 - 0.08, 0.03), { pos: [x, fy, fz - 0.01], rot: [0, 0, a], color: PALETTE.impGreyDark });
    }
    kit.cyl("impMetal", x, fy, fz - 0.02, 0.16, 0.08, "z", { color: PALETTE.impGrey, segments: 16 });
    const blades = (s) => {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        s.add("impMetal", new THREE.BoxGeometry(0.34, fr * 0.78, 0.04), { pos: [Math.cos(a + Math.PI / 2) * fr * 0.5, Math.sin(a + Math.PI / 2) * fr * 0.5, 0], rot: [0.6, 0, a], color: PALETTE.impGrey });
      }
      s.cyl("impTrim", 0, 0, 0, 0.14, 0.12, "z", { color: PALETTE.impBlack, segments: 14 });
    };
    if (i === 1) fanGroup = assembly(kit, [x, fy, zc - D / 2 + 0.18], blades);
    else {
      const sub = { add: (m, g, o) => kit.add(m, g, { ...o, pos: [o.pos[0] + x, o.pos[1] + fy, o.pos[2] + zc - D / 2 + 0.18] }), cyl: (m, cx, cy, cz2, r, l, ax, o) => kit.cyl(m, cx + x, cy + fy, cz2 + zc - D / 2 + 0.18, r, l, ax, o) };
      blades(sub);
    }
    // filter drawers above the fan, status screen + LEDs, stencil, roof duct into the ceiling
    for (let k = 0; k < 2; k++) {
      kit.box("impGloss", x - 0.9 + k * 1.8, 2.72, fz - 0.005, 1.4, 0.16, 0.02);
      kit.box("impMetal", x - 0.9 + k * 1.8, 2.72, fz - 0.03, 0.4, 0.03, 0.03, { color: PALETTE.impGrey });
    }
    for (let k = 0; k < 6; k++) kit.box(k === 4 && i === 2 ? "emitRedImp" : accentKey, x - 1.5 + k * 0.22, 0.5, fz - 0.005, 0.06, 0.06, 0.01);
    kit.add(["scrBlue2", "scrWhite0", "scrGreen3"][i], new THREE.PlaneGeometry(0.7, 0.3), { pos: [x + 1.2, 0.5, fz - 0.006], rot: [0, Math.PI, 0], uv: "keep" });
    decalImp(kit, IMP_DECAL.glyphs1, [x - 1.3, 2.4, fz - 0.005], "-z", 0.3);
    kit.box("impMetal", x, H + (h - H) / 2, zc + 0.2, 0.9, h - H, 0.9, { color: PALETTE.impGreyDark, texel: 1 });
    for (let k = 0; k < 3; k++) kit.box("impTrim", x, H + 0.3 + k * 0.6, zc + 0.2, 0.98, 0.06, 0.98, { color: PALETTE.impBlack });
    kit.collider([x - W / 2, 0, zc - D / 2 - 0.1], [x + W / 2, H, hz], "scrubber");
    // wall streak above each unit (moist exhaust)
    decalD(kit, DECK_D_DECAL.streak, [x + 1.6, H + 0.9, hz - 0.075], "-z", 1.2, { h: 1.6 });
  });
  kit.onUpdate((dt) => {
    fanGroup.rotation.z += dt * 4.2;
  });
  // exhaust duct along the S wall linking the units
  pipe(kit, [scrubXs[0] - 1.0, h - 0.55, hz - 0.45], [scrubXs[2] + 3.4, h - 0.55, hz - 0.45], 0.24, { color: PALETTE.impGreyDark, clampStep: 2.4, flanges: true });

  // --- filter banks on the W wall: two frames with instanced cartridges + LEDs
  {
    const Wf = walls.W.frame;
    const cartGeo = () => {
      const g = new THREE.CylinderGeometry(0.17, 0.17, 0.5, 14);
      g.rotateZ(Math.PI / 2);
      return instGeo(g);
    };
    const capGeo = () => instGeo(new THREE.BoxGeometry(0.06, 0.16, 0.34));
    const m = new THREE.Matrix4();
    for (const zc of [-6.0, -1.6]) {
      const fw = 3.4;
      const fh = 2.6;
      const u = wallU(room, "W", zc);
      Wf.box("impTrim", u, 0.3 + fh / 2, 0.14, fw, fh, 0.28, { color: PALETTE.impBlack, texel: 1 });
      Wf.box("impMetal", u, 0.3 + fh / 2, 0.285, fw - 0.12, fh - 0.12, 0.01, { color: PALETTE.impCharcoal, texel: 1.5 });
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 6; c++) {
          const cu = u - fw / 2 + 0.35 + c * 0.54;
          const cv = 0.75 + r * 0.6;
          const p = Wf.pos(cu, cv, 0.29 + 0.25);
          m.makeTranslation(p.x, p.y, p.z);
          const bad = rand() < 0.08;
          kit.instance("roomsd_cart", "impPanel1", cartGeo, m, bad ? PALETTE.impGreyDark : PALETTE.impWhite);
          const pc = Wf.pos(cu, cv, 0.29 + 0.5 + 0.03);
          m.makeTranslation(pc.x, pc.y, pc.z);
          kit.instance("roomsd_cartCap", "impTrim", capGeo, m, PALETTE.impBlack);
          Wf.box(bad ? "emitRedImp" : accentKey, cu, cv + 0.25, 0.3, 0.05, 0.03, 0.01);
        }
      }
      Wf.box(DIM, u, 0.3 + fh - 0.08, 0.29, fw - 0.4, 0.03, 0.01);
      Wf.decal(IMP_DECAL.glyphs2, u, 0.3 + fh + 0.3, 0.03, 0.45);
      Wf.collider(u - fw / 2, u + fw / 2, 0, fh + 0.4, 0, 0.85, "filters");
    }
    // a lone rack and a wall junction on the W wall's S half
    equipmentRack(kit, -hx + 0.5, 4.2, 1.0, 2.2, 0.8, "+x", { seed: 730, accentKey });
    equipmentRack(kit, -hx + 0.5, 5.3, 1.0, 2.2, 0.8, "+x", { seed: 731, accentKey });
    junctionBox(Wf, wallU(room, "W", 8.6), 2.0, 0.8, 1.0, { seed: 740, accentKey });
    impWallGear(Wf, wallU(room, "W", 10.6), 1.5, { seed: 741, accentKey });
  }

  // --- waste processing unit (SE corner): hopper with sloped top, drum, compactor ram, hazard marking
  {
    const x = 12.6;
    const z = 8.6;
    kit.box("impTrim", x, 1.1, z, 3.0, 2.2, 2.4, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impPanel1", x, 1.15, z - 1.206, 2.6, 1.7, 0.012, { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
    kit.add("impMetal", new THREE.BoxGeometry(3.0, 0.2, 2.6), { pos: [x, 2.55, z + 0.05], rot: [-0.32, 0, 0], color: PALETTE.impCharcoal, texel: 1 });
    kit.box("impTrim", x, 2.35, z - 0.9, 3.0, 0.5, 0.3, { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("chevronR", [x - 1.5, 1.95, z - 1.215], [x + 1.5, 2.2, z - 1.2], { texel: 1.6 });
    kit.boxMM("chevronR", [x - 1.5, 0.15, z - 1.215], [x + 1.5, 0.4, z - 1.2], { texel: 1.6 });
    decalImp(kit, IMP_DECAL.hazard, [x - 0.8, 1.15, z - 1.215], "-z", 0.6);
    decalImp(kit, IMP_DECAL.restricted, [x + 0.8, 1.15, z - 1.215], "-z", 0.6);
    // drum beside it with a stirrer motor on top, feed pipe from the hopper
    kit.cyl("impMetal", x - 2.7, 1.2, z + 0.3, 0.9, 2.4, "y", { color: PALETTE.impGreyDark, segments: 28 });
    for (const yy of [0.5, 1.4, 2.25]) kit.cyl("impTrim", x - 2.7, yy, z + 0.3, 0.93, 0.1, "y", { color: PALETTE.impBlack, segments: 28 });
    kit.cyl("impTrim", x - 2.7, 2.6, z + 0.3, 0.3, 0.4, "y", { color: PALETTE.impBlack, segments: 16 });
    kit.box("impMetal", x - 2.7, 2.95, z + 0.3, 0.5, 0.3, 0.5, { color: PALETTE.impCharcoal });
    pipe(kit, [x - 1.5, 1.6, z + 0.3], [x - 1.8, 1.6, z + 0.3], 0.14, { color: PALETTE.impGreyDark, flanges: true });
    decalImp(kit, IMP_DECAL.hazard, [x - 2.7, 1.4, z + 0.3 - 0.905], "-z", 0.5);
    // compactor ram (cylinder + piston) on the hopper's W side, control box, blinking lamp
    kit.cyl("impMetal", x - 1.75, 0.8, z + 0.6, 0.22, 0.5, "x", { color: PALETTE.impCharcoal, segments: 16 });
    kit.box("impTrim", x - 1.55, 0.35, z + 0.6, 0.4, 0.3, 0.6, { color: PALETTE.impBlack });
    kit.box("impTrim", x + 1.65, 1.3, z - 0.5, 0.3, 0.8, 0.5, { color: PALETTE.impBlack });
    kit.box("impMetal", x + 1.82, 1.4, z - 0.5, 0.02, 0.4, 0.3, { color: PALETTE.impCharcoal });
    kit.box("emitRedImp", x + 1.84, 1.5, z - 0.6, 0.01, 0.05, 0.05);
    kit.box(accentKey, x + 1.84, 1.5, z - 0.45, 0.01, 0.05, 0.05);
    warningLamp(kit, [x, 2.85, z - 0.9], "emitRedImp");
    blinkers(kit, [{ pos: [x, 2.85, z - 0.9], size: [0.12, 0.12, 0.12], key: "emitRedImp", period: 1.0, duty: 0.45 }]);
    // feed line from the hopper down into the trench (inside its footprint, x < trench.x1)
    pipePath(kit, [[x, 0.5, z - 1.25], [x, 0.5, z - 2.2], [x - 2.4, 0.5, z - 2.2], [x - 2.4, 0.5, trench.z1 - 0.35], [x - 2.4, -0.4, trench.z1 - 0.35]], 0.1, { color: PALETTE.impGreyDark, clampStep: 1.2 });
    kit.collider([x - 3.7, 0, z - 1.3], [x + 1.9, 2.9, hz], "waste");
    kit.collider([x - 2.6, 0, z - 2.35], [x + 0.2, 0.7, z - 1.3], "wastePipe");
    kit.collider([x - 2.6, 0, trench.z1 - 0.5], [x - 2.2, 0.7, z - 2.2], "wastePipe");
    hazardBorder(kit, x - 4.0, z - 1.7, x + 2.2, hz - 0.05, 0, 0.26, "chevronR");
    decalD(kit, DECK_D_DECAL.grime, [x - 1.0, 0.018, z - 2.4], "up", 3.0);
    decalD(kit, DECK_D_DECAL.streak, [x, 3.6, hz - 0.075], "-z", 2.2, { h: 1.3 });
  }

  // --- pump manifold rack through the middle of the room (parallel pipes, valve wheels, three pumps)
  {
    const x0 = -14.2;
    const x1 = 6.6;
    const zr = -5.2; // pulled toward the tank row to leave a 2 m walk around the central stack's grates
    const lines = [
      [zr - 0.55, 0.85, 0.1, PALETTE.impGreyDark],
      [zr - 0.55, 1.25, 0.09, PALETTE.impGrey],
      [zr - 0.55, 1.6, 0.07, PALETTE.impBlueDeep],
      [zr + 0.55, 0.85, 0.1, PALETTE.impGreyDark],
      [zr + 0.55, 1.25, 0.09, PALETTE.impGrey],
      [zr + 0.55, 1.6, 0.06, PALETTE.impGreen],
    ];
    for (const [z, y, r, col] of lines) pipe(kit, [x0, y, z], [x1, y, z], r, { color: col, clampStep: 3.0, flanges: true });
    for (let x = x0 + 1.0; x < x1; x += 3.4) {
      for (const s of [-1, 1]) kit.box("impTrim", x, 0.95, zr + s * 0.95, 0.12, 1.9, 0.12, { color: PALETTE.impBlack });
      for (const y of [0.6, 1.05, 1.45, 1.85]) kit.box("impTrim", x, y, zr, 0.1, 0.06, 2.0, { color: PALETTE.impBlack });
      kit.box("impMetal", x, 0.06, zr, 0.5, 0.12, 2.2, { color: PALETTE.impCharcoal, texel: 1 });
    }
    let vi = 0;
    for (let x = x0 + 2.4; x < x1 - 0.5; x += 2.7, vi++) {
      const line = lines[vi % lines.length];
      valveWheel(kit, [x, line[1] + line[2] + 0.2, line[0]], "y", 0.15, { color: vi % 4 === 3 ? PALETTE.impAmber : PALETTE.impRed, stem: 0.16 });
      if (vi % 2 === 0) gauge(kit, [x + 0.7, line[1] + 0.22, line[0] + (line[0] < zr ? -0.14 : 0.14)], line[0] < zr ? "-z" : "+z", 0.08, { seed: 760 + vi });
    }
    for (const px of [-11.2, -4.4, 2.6]) {
      kit.box("impTrim", px, 0.2, zr, 1.3, 0.4, 0.8, { color: PALETTE.impBlack, texel: 1 });
      kit.cyl("impMetal", px + 0.15, 0.62, zr, 0.24, 0.8, "x", { color: PALETTE.impGreyDark, segments: 18 });
      kit.cyl("impTrim", px - 0.42, 0.62, zr, 0.28, 0.24, "x", { color: PALETTE.impBlack, segments: 18 });
      for (let k = 0; k < 5; k++) kit.box("impTrim", px + 0.15, 0.62, zr, 0.6, 0.56 + k * 0.02, 0.02 + k * 0.004, { color: PALETTE.impBlack });
      kit.box(accentKey, px + 0.15, 0.9, zr + 0.2, 0.05, 0.04, 0.05);
      pipe(kit, [px - 0.42, 0.85, zr - 0.55], [px - 0.42, 0.62, zr - 0.2], 0.06, { color: PALETTE.impGreyDark });
      pipe(kit, [px + 0.5, 0.85, zr + 0.55], [px + 0.5, 0.62, zr + 0.2], 0.06, { color: PALETTE.impGreyDark });
      decalD(kit, DECK_D_DECAL.oil, [px + 0.4, 0.018, zr + 0.9], "up", 2.0);
    }
    kit.collider([x0 - 0.2, 0, zr - 1.1], [x1 + 0.2, 1.9, zr + 1.1], "manifold");
    // feed drops from the ceiling into the rack at both ends
    for (const x of [x0 + 0.3, x1 - 0.3]) pipe(kit, [x, 1.7, zr], [x, h - 0.3, zr], 0.12, { color: PALETTE.impGreyDark, flanges: true, clampStep: 1.2 });
    hazardBorder(kit, x0 - 0.5, zr - 1.4, x1 + 0.5, zr + 1.4, 0, 0.24);
  }

  // --- monitoring console by the door, wall screens, deck gear on the E wall, crates
  impConsole(kit, 12.4, 0, -4.2, 2.6, 0.9, { yaw: Math.PI / 2, seed: 770, screens: ["scrBlue1", "scrGreen1", "scrWhite0"], accentKey });
  impChair(kit, 13.45, 0, -4.2, Math.PI / 2);
  {
    const E = walls.E.frame;
    screenBank(E, wallU(room, "E", -6.4), 1.5, 3, 2, 0.9, 0.5, 0.08, ["scrBlue0", "scrGreen3", "scrWhite1", "scrBlue1"], { seed: 780 });
    E.decal(IMP_DECAL.glyphs3, wallU(room, "E", -4.9), 3.2, 0.03, 0.5);
    impWallGear(E, wallU(room, "E", 4.0), 1.5, { seed: 781, accentKey });
    E.decal(IMP_DECAL.medical, wallU(room, "E", -2.3), 3.5, 0.03, 0.45);
    E.decal(IMP_DECAL.arrowUp, wallU(room, "E", 2.3), 3.5, 0.03, 0.45);
    impWallLight(E, wallU(room, "E", -8.5), h - 0.7, { key: DIM, w: 1.0 });
  }
  // --- chemical dosing skid under the N-wall gauge cluster: four drums on a bunded frame, dosing pump
  // box, feed hoses into the collector line, bolted lid rings
  {
    const sx0 = 8.6;
    const sz = -hz + 1.6;
    kit.box("impTrim", sx0 + 1.9, 0.1, sz, 4.2, 0.2, 1.7, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", sx0 + 1.9, 0.24, sz, 4.0, 0.08, 1.5, { color: PALETTE.impCharcoal, texel: 1 });
    for (let k = 0; k < 4; k++) {
      const dx = sx0 + 0.55 + k * 0.9;
      kit.cyl("impMetal", dx, 0.78, sz - 0.3, 0.36, 1.0, "y", { color: k % 2 ? PALETTE.impGreyDark : PALETTE.impWhite, segments: 20, texel: 1 });
      kit.cyl("impTrim", dx, 1.3, sz - 0.3, 0.38, 0.06, "y", { color: PALETTE.impBlack, segments: 20 });
      kit.cyl("impTrim", dx, 0.3, sz - 0.3, 0.38, 0.06, "y", { color: PALETTE.impBlack, segments: 20 });
      for (let b = 0; b < 4; b++) hexBolt(kit, [dx + Math.cos((b / 4) * Math.PI * 2 + 0.4) * 0.3, 1.335, sz - 0.3 + Math.sin((b / 4) * Math.PI * 2 + 0.4) * 0.3], "up", 0.03);
      decalImp(kit, k === 2 ? IMP_DECAL.hazard : IMP_DECAL.glyphs3, [dx, 0.8, sz - 0.3 - 0.365], "-z", 0.3);
      pipe(kit, [dx, 1.33, sz - 0.3], [dx, 1.55, sz - 0.3], 0.04, { color: PALETTE.impGreyDark, segments: 8 });
      pipe(kit, [dx, 1.55, sz - 0.3], [dx, 1.55, sz + 0.5], 0.04, { color: PALETTE.impGreyDark, segments: 8 });
    }
    pipe(kit, [sx0 + 0.55, 1.55, sz + 0.5], [sx0 + 3.25, 1.55, sz + 0.5], 0.05, { color: PALETTE.impGrey, segments: 10, flanges: true });
    // dosing pump box at the E end, hose from the header down into the pump and on to the collector
    kit.box("impTrim", sx0 + 3.6, 0.65, sz + 0.45, 0.6, 0.75, 0.6, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", sx0 + 3.6, 0.7, sz + 0.76, 0.5, 0.5, 0.01, { color: PALETTE.impCharcoal, texel: 1 });
    gauge(kit, [sx0 + 3.5, 0.82, sz + 0.77], "+z", 0.08, { seed: 810 });
    kit.box(accentKey, sx0 + 3.75, 0.82, sz + 0.77, 0.05, 0.05, 0.01);
    kit.box("emitRedImp", sx0 + 3.75, 0.7, sz + 0.77, 0.05, 0.05, 0.01);
    pipe(kit, [sx0 + 3.25, 1.55, sz + 0.5], [sx0 + 3.6, 1.55, sz + 0.5], 0.05, { color: PALETTE.impGrey, segments: 10 });
    pipe(kit, [sx0 + 3.6, 1.55, sz + 0.5], [sx0 + 3.6, 1.05, sz + 0.5], 0.05, { color: PALETTE.impGrey, segments: 10 });
    pipePath(kit, [[sx0 + 3.6, 0.5, sz + 0.75], [sx0 + 3.6, 0.5, sz + 1.2], [7.75, 0.5, sz + 1.2], [7.75, 0.5, cz - 0.05]], 0.045, { color: PALETTE.impGreyDark, clampStep: 1.6 });
    hazardBorder(kit, sx0 - 0.4, -hz + 0.05, sx0 + 4.3, sz + 1.0, 0, 0.24);
    kit.collider([sx0 - 0.25, 0, -hz], [sx0 + 4.05, 1.6, sz + 0.9], "dosing");
    decalD(kit, DECK_D_DECAL.grime, [sx0 + 1.6, 0.018, sz + 1.3], "up", 2.6);
  }
  // --- engineering-style equipment cabinets on the N wall between the last tank and the dosing skid (four
  // bays: amber top strips, blue status LEDs, readouts in the room's blue / white)
  cabinetRow(kit, 3.4, 7.8, -hz + 0.05, "+z", { seed: 840, accentKey, strip: "emitAmberDim", screens: ["scrBlue0", "scrWhite1", "scrBlue1", "scrWhite0"] });
  // --- CO2 processor column on the S wall between the scrubbers and the waste unit, with an air-quality
  // screen bank beside it: tall drum, bolted band flanges, sight glass, valve cluster, riser into the ceiling
  {
    const px = 4.4;
    const pz = hz - 1.35;
    kit.cyl("impTrim", px, 0.15, pz, 1.15, 0.3, "y", { color: PALETTE.impBlack, segments: 28 });
    kit.cyl("impMetal", px, 1.95, pz, 0.95, 3.3, "y", { color: PALETTE.impGrey, segments: 28, texel: 0.8 });
    for (const yy of [0.6, 1.7, 2.8, 3.5]) {
      kit.cyl("impTrim", px, yy, pz, 0.99, 0.12, "y", { color: PALETTE.impBlack, segments: 28 });
      for (let b = 0; b < 10; b++) hexBolt(kit, [px + Math.cos((b / 10) * Math.PI * 2) * 0.99, yy, pz + Math.sin((b / 10) * Math.PI * 2) * 0.99], b < 5 ? "-z" : "+z", 0.035);
    }
    kit.cyl("impMetal", px, 3.75, pz, 0.95, 0.3, "y", { r2: 0.45, color: PALETTE.impCharcoal, segments: 28 });
    pipe(kit, [px, 3.9, pz], [px, h - 0.3, pz], 0.22, { color: PALETTE.impGreyDark, flanges: true, clampStep: 1.0 });
    // sight glass (dim blue) and a gauge pair on the room-facing side, valve cluster at the base
    kit.box("impTrim", px, 2.25, pz - 0.98, 0.3, 0.9, 0.06, { color: PALETTE.impBlack });
    kit.box(DIM, px, 2.25, pz - 1.0, 0.16, 0.76, 0.01, { uv: "keep" });
    gauge(kit, [px - 0.45, 2.5, pz - 0.86], "-z", 0.1, { seed: 820 });
    gauge(kit, [px + 0.45, 2.5, pz - 0.86], "-z", 0.1, { seed: 821, warn: true });
    decalImp(kit, IMP_DECAL.glyphs2, [px, 1.2, pz - 0.97], "-z", 0.4);
    pipe(kit, [px - 0.9, 1.0, pz - 0.3], [px - 1.9, 1.0, pz - 0.3], 0.09, { color: PALETTE.impGreyDark, flanges: true });
    valveWheel(kit, [px - 1.5, 1.32, pz - 0.3], "y", 0.15, { color: PALETTE.impRed, stem: 0.2 });
    pipePath(kit, [[px - 1.9, 1.0, pz - 0.3], [px - 2.4, 1.0, pz - 0.3], [px - 2.4, 1.0, hz - 0.45], [scrubXs[2] + 1.8, 1.0, hz - 0.45]], 0.09, { color: PALETTE.impGreyDark, clampStep: 1.6 });
    pipe(kit, [px + 0.95, 1.5, pz], [px + 2.2, 1.5, pz], 0.12, { color: PALETTE.impGrey, flanges: true });
    kit.box("impTrim", px + 2.4, 1.5, pz, 0.4, 0.5, 0.5, { color: PALETTE.impBlack, texel: 1 });
    pipe(kit, [px + 2.4, 1.75, pz], [px + 2.4, h - 0.3, pz], 0.1, { color: PALETTE.impGreyDark, clampStep: 1.4 });
    hazardBorder(kit, px - 2.6, pz - 1.5, px + 2.8, hz - 0.05, 0, 0.24);
    kit.collider([px - 1.2, 0, pz - 1.2], [px + 1.2, 4.0, hz], "processor");
    kit.collider([px - 2.5, 0, pz - 0.5], [px - 1.0, 1.5, pz + 0.3], "processorValve");
    kit.collider([px + 2.1, 0, pz - 0.35], [px + 2.7, 1.9, pz + 0.35], "processorBox");
    const S = walls.S.frame;
    screenBank(S, wallU(room, "S", px + 3.6) - 1.0, 1.6, 2, 2, 0.9, 0.5, 0.08, ["scrBlue1", "scrWhite0", "scrGreen3", "scrBlue2"], { seed: 830 });
    S.decal(IMP_DECAL.vacuum, wallU(room, "S", px + 3.6), 3.1, 0.03, 0.5);
    decalD(kit, DECK_D_DECAL.streak, [px + 1.4, 3.8, hz - 0.075], "-z", 1.4, { h: 1.2 });
  }
  impCrate(kit, hx - 1.1, 0, -hz + 1.3, 1.2, 0.9, 1.1, { seed: 6, decal: IMP_DECAL.vacuum });
  impCrate(kit, hx - 2.4, 0, -hz + 1.1, 1.0, 0.7, 0.9, { seed: 7, decal: IMP_DECAL.bay03 });
  // N wall east part (behind the pump): junction box + gauges cluster
  {
    const N = walls.N.frame;
    junctionBox(N, wallU(room, "N", 9.0), 2.2, 0.9, 1.1, { seed: 790, accentKey });
    for (let k = 0; k < 3; k++) {
      const p = N.pos(wallU(room, "N", 12.2 + k * 0.5), 1.7, 0.16);
      gauge(kit, [p.x, p.y, p.z], "+z", 0.12, { seed: 795 + k, warn: k === 1 });
    }
    N.box("impTrim", wallU(room, "N", 12.7), 1.7, 0.05, 1.9, 0.5, 0.1, { color: PALETTE.impBlack });
    pipe(kit, [11.4, 1.95, -hz + 0.2], [13.9, 1.95, -hz + 0.2], 0.05, { color: PALETTE.impGreyDark });
    N.decal(IMP_DECAL.keepClear, wallU(room, "N", 6.4), 3.6, 0.03, 0.55);
  }

  // --- lights (8), one colour temperature: the ship's cool white. Three hooded SPOTS (two over the pump
  // rack, one over the door approach) whose cones light the equipment and the deck and never the ceiling
  // above the hood; four low hooded pendants (tank row, scrubbers, filter banks, waste unit) with linear
  // falloff — source 30 cm under the hood mouth, so the hood is dark inside and the ceiling over it gets
  // no more than the deck below; a cool blue point in the trench under the grate. No bare ceiling lamps.
  const work = 0xe4ecff;
  // (the E pump-rack spot is tilted 27° toward the N wall so its cone also carries the cabinet run and the
  // dosing skid; its upper edge stays 6° below the horizontal, so it puts nothing on the ceiling)
  // (a fourth spot hangs E of the central stack and rakes its door-facing side)
  for (const [i, [x, z, tx, tz, k]] of [[-8.0, -5.2, -8.0, -5.2, 6.2], [4.0, -7.0, 4.5, -8.5, 6.2], [10.0, 0.6, 10.0, 0.6, 7.2], [SX + 3.9, SZ, SX, SZ, 4.2]].entries()) {
    const mouth = shroudLamp(kit, [x, h - 0.08, z], [x, 3.95, z], [tx, i === 3 ? 1.2 : 0, tz], { key: LENS, size: 0.55 });
    kit.light({ type: "spot", pos: [mouth[0], mouth[1] - 0.1, mouth[2]], target: [tx, i === 3 ? 1.2 : 0, tz], color: work, intensity: lux(3.8, k), distance: 15, angle: i === 3 ? 1.0 : 1.2, penumbra: 0.5, priority: 0.62 - i * 0.01 });
  }
  const pendant = (x, z, y, target, k, priority) => {
    const mouth = shroudLamp(kit, [x, h - 0.08, z], [x, y, z], target, { key: LENS, size: 0.5 });
    kit.light({ type: "point", pos: [mouth[0], mouth[1] - 0.3, mouth[2]], color: work, intensity: k * (y - 0.4), decay: 1, distance: 14, priority });
  };
  pendant(-6.0, -8.6, 3.5, [-6.0, 1.5, -8.6], 5.2, 0.5);
  pendant(-7.4, 9.2, 3.5, [-7.4, 1.5, 9.4], 5.2, 0.49);
  pendant(11.5, 6.0, 3.4, [11.5, 1.2, 7.0], 4.0, 0.42);
  pendant(-14.2, -3.6, 3.6, [-15.5, 1.5, -3.6], 4.2, 0.45);
  // cool blue under the stack's E grate strip (the one the door sees)
  kit.light({ type: "point", pos: [SX + G0 + 0.5, -0.25, SZ], color: 0x8fb8ff, intensity: 5, distance: 7, priority: 0.35 });
}
