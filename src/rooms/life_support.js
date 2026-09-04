// Life Support — Air / Water / Waste (deck D). A row of five water tanks with level gauges along the
// N wall tied together by header and collector pipes, three air scrubber units with big spoked fan
// grilles on the S wall (the middle fan turns), filter banks with instanced removable cartridges on
// the W wall, a waste processing hopper with hazard marking in the SE corner, a pump manifold rack
// through the middle of the room, a monitoring console by the door, a grated service trench with
// lit pipes below, condensation streaks low on the walls. Green status light, white work light.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impConsole, impChair, impWallGear, impWallLight, impCrate, lux } from "./imperial_kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { rng } from "../kit.js";
import { ensureDeckDMaterials, shellNoFloor, deckFloor, grateTrench, pipe, pipePath, valveWheel, gauge, junctionBox, tank, hazardBorder, decalD, decalImp, DECK_D_DECAL, wallU, warningLamp, assembly, blinkers, equipmentRack, screenBank, instGeo, pendantLamp } from "./deck_d_kit.js";

export function buildLifeSupport(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = "emitGreen";
  const green = 0x4fe08a;
  ensureDeckDMaterials(kit);
  const rand = rng(6103);

  // --- shell + deck with the service trench cutout
  const walls = shellNoFloor(kit, room, ctx.doors, {
    accentKey,
    seed: 3301,
    wall: { panelW: 1.8, features: { vent: 0.16, equipment: 0.1, conduit: 0.16, light: 0.05, screen: 0.04 }, altChance: 0.35 },
    ceiling: { troughs: 2, troughW: 0.55, beamStep: 3.4, accentKey },
  });
  const trench = { x0: -14.0, z0: 2.6, x1: 11.0, z1: 4.0 };
  deckFloor(kit, -hx, -hz, hx, hz, [trench]);
  grateTrench(kit, trench.x0, trench.z0, trench.x1, trench.z1, { depth: 0.7, seed: 44, cables: 4, accentKey });
  // walk lane from the door, floor stencils
  kit.boxMM("impMetalRough", [-6.0, 0.0, -1.1], [hx - 0.3, 0.012, 1.1], { color: PALETTE.impGreyDark, texel: 0.7 });
  for (const s of [-1, 1]) kit.boxMM("impTrim", [-6.0, 0, s * 1.1 - 0.03], [hx - 0.3, 0.014, s * 1.1 + 0.03], { color: PALETTE.impBlack });
  decalImp(kit, IMP_DECAL.arrowRight, [13.0, 0.016, 0], "up", 0.9, { spin: Math.PI });
  decalImp(kit, IMP_DECAL.vacuum, [-8.0, 0.016, -6.6], "up", 0.9);

  // --- water tanks along the N wall + header / collector pipes + hazard border
  const tankXs = [-13.4, -9.6, -5.8, -2.0, 1.8];
  const tz = -hz + 1.45;
  const tr = 1.0;
  const th = 3.9;
  tankXs.forEach((x, i) => tank(kit, x, tz, tr, th, { color: i % 2 ? PALETTE.impGrey : PALETTE.impWhite, accentKey, seed: 700 + i, level: 0.35 + rand() * 0.55, bands: 3, facing: "+z", label: [IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03][i % 3] }));
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
    decalD(kit, DECK_D_DECAL.oil, [px + 0.6, 0.018, cz + 1.1], "up", 1.1);
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
    kit.add("scrGreen0", new THREE.PlaneGeometry(0.7, 0.3), { pos: [x + 1.2, 0.5, fz - 0.006], rot: [0, Math.PI, 0], uv: "keep" });
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
      Wf.box(accentKey, u, 0.3 + fh - 0.08, 0.29, fw - 0.4, 0.03, 0.01);
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
    decalD(kit, DECK_D_DECAL.grime, [x - 1.0, 0.018, z - 2.6], "up", 1.6);
    decalD(kit, DECK_D_DECAL.streak, [x, 3.6, hz - 0.075], "-z", 2.2, { h: 1.3 });
  }

  // --- pump manifold rack through the middle of the room (parallel pipes, valve wheels, three pumps)
  {
    const x0 = -14.2;
    const x1 = 6.6;
    const zr = -3.4;
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
      decalD(kit, DECK_D_DECAL.oil, [px + 0.4, 0.018, zr + 1.0], "up", 0.9);
    }
    kit.collider([x0 - 0.2, 0, zr - 1.1], [x1 + 0.2, 1.9, zr + 1.1], "manifold");
    // feed drops from the ceiling into the rack at both ends
    for (const x of [x0 + 0.3, x1 - 0.3]) pipe(kit, [x, 1.7, zr], [x, h - 0.3, zr], 0.12, { color: PALETTE.impGreyDark, flanges: true, clampStep: 1.2 });
    hazardBorder(kit, x0 - 0.5, zr - 1.4, x1 + 0.5, zr + 1.4, 0, 0.24);
  }

  // --- monitoring console by the door, wall screens, deck gear on the E wall, crates
  impConsole(kit, 12.4, 0, -4.2, 2.6, 0.9, { yaw: Math.PI / 2, seed: 770, screens: ["scrGreen0", "scrGreen1", "scrWhite0"], accentKey });
  impChair(kit, 13.45, 0, -4.2, Math.PI / 2);
  {
    const E = walls.E.frame;
    screenBank(E, wallU(room, "E", -6.4), 1.5, 3, 2, 0.9, 0.5, 0.08, ["scrGreen0", "scrGreen1", "scrWhite1"], { seed: 780 });
    E.decal(IMP_DECAL.glyphs3, wallU(room, "E", -4.9), 3.2, 0.03, 0.5);
    impWallGear(E, wallU(room, "E", 4.0), 1.5, { seed: 781, accentKey });
    E.decal(IMP_DECAL.medical, wallU(room, "E", -2.3), 3.5, 0.03, 0.45);
    E.decal(IMP_DECAL.arrowUp, wallU(room, "E", 2.3), 3.5, 0.03, 0.45);
    impWallLight(E, wallU(room, "E", -8.5), h - 0.7, { key: accentKey, w: 1.0 });
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

  // --- lights: white work lights down the room, green status light over tanks / scrubbers / waste, lit trench
  kit.light({ type: "point", pos: [-10.0, h - 0.6, -0.5], color: 0xe4ecff, intensity: lux(h - 0.6, 3.0), distance: 15, priority: 0.6 });
  kit.light({ type: "point", pos: [-1.0, h - 0.6, -0.5], color: 0xe4ecff, intensity: lux(h - 0.6, 3.0), distance: 15, priority: 0.59 });
  kit.light({ type: "point", pos: [8.5, h - 0.6, 0.5], color: 0xe4ecff, intensity: lux(h - 0.6, 2.8), distance: 15, priority: 0.58 });
  pendantLamp(kit, -6.0, 3.4, -8.6, h, accentKey);
  pendantLamp(kit, -7.4, 3.6, 9.2, h, accentKey);
  pendantLamp(kit, 11.5, 3.2, 6.0, h, "emitAmber");
  pendantLamp(kit, -14.2, 4.0, -3.6, h, "emitWhite");
  kit.light({ type: "point", pos: [-6.0, 3.4, -8.6], color: green, intensity: lux(3.4, 1.6), distance: 12, priority: 0.5 });
  kit.light({ type: "point", pos: [-7.4, 3.6, 9.2], color: green, intensity: lux(3.6, 1.6), distance: 12, priority: 0.49 });
  kit.light({ type: "point", pos: [11.5, 3.2, 6.0], color: 0xffb040, intensity: lux(3.2, 1.2), distance: 10, priority: 0.42 });
  kit.light({ type: "point", pos: [-2.0, -0.35, 3.3], color: green, intensity: 6, distance: 9, priority: 0.35 });
  // fill for the filter banks on the W wall
  kit.light({ type: "point", pos: [-14.2, 4.0, -3.6], color: 0xdfe8ff, intensity: lux(4.0, 2.0), distance: 12, priority: 0.45 });
}
