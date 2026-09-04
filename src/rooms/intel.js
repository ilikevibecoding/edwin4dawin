// Restricted Intelligence Room (deck A): a security vestibule behind the blast door (scanner arch,
// glass partition, guard post), then a red-lit analysis floor: central holo table carrying a navicomp
// data core (concentric scrolling glyph cylinders) under a single hard key spot, walls of blade racks
// each with its own cool practical, sealed restricted cabinets along the far wall, two analyst
// stations. Accent red; dim red area light from the ceiling troughs.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, impChair, impPillar, impWallGear, impWallLight, lux } from "./imperial_kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { deckASetup, yawFrame, station, dataBank, dataCore, sealedCabinet, wallScreen, holoTable, projectorCone, datapad, cup, indicatorRow, conduitRun } from "./deck_a_kit.js";

export function buildIntel(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const M = ctx.materials;
  deckASetup(kit);
  const accentKey = "emitRedImp";
  const red = new THREE.Color(room.accent || "#ff4a3a").getHex();

  // ---- shell: darker grey panels with a low dado band, narrow columns, no white cornice light ------
  const walls = impRoomShell(kit, room, ctx.doors, {
    accentKey,
    seed: 4021,
    wall: { panelW: 1.45, bands: [1.5], features: { vent: 0.06, equipment: 0.14, conduit: 0.0, light: 0.04, screen: 0.08 }, panelColor: PALETTE.impGrey, panelColorAlt: PALETTE.impGreyDark, altChance: 0.3, corniceLight: false },
    walls: { W: { features: { vent: 0.03, equipment: 0.06, conduit: 0.12, light: 0.0, screen: 0.0 } }, E: { features: { vent: 0.05, equipment: 0.1, conduit: 0.0, light: 0.06, screen: 0.1 } } },
    floor: { lane: false },
    ceiling: { troughs: 2, troughW: 0.4, beamStep: 3.2, withLights: false, dark: PALETTE.impCharcoal },
  });
  // red glow strips inside the two ceiling troughs (replaces the white diffusers)
  {
    const nB = Math.round(d / 3.2);
    for (const x of [-w / 4, w / 4]) {
      for (let i = 0; i < nB; i++) {
        const za = -hz + (i / nB) * d + 0.4;
        const zb = -hz + ((i + 1) / nB) * d - 0.4;
        kit.boxMM(accentKey, [x - 0.1, h - 0.1, za], [x + 0.1, h - 0.08, zb], { uv: "keep" });
      }
    }
  }
  // red floor-edge strips along the N / S banks and the W cabinets
  for (const s of [-1, 1]) kit.boxMM(accentKey, [-hx + 0.9, 0.002, s * (hz - 0.78) - 0.03], [7.6, 0.014, s * (hz - 0.78) + 0.03]);
  kit.boxMM(accentKey, [-hx + 0.72, 0.002, -6.4], [-hx + 0.78, 0.014, 6.4]);

  // ---- vestibule: glass partition at x = 8.2 with a scanner arch in the gap ---------------------
  const px = 8.2;
  for (const s of [-1, 1]) {
    const z0 = s < 0 ? -hz : 1.7;
    const z1 = s < 0 ? -1.7 : hz;
    const zc = (z0 + z1) / 2;
    const len = z1 - z0;
    kit.box("impTrim", px, 0.55, zc, 0.26, 1.1, len, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", px, 0.6, zc, 0.28, 0.3, len - 0.1, { color: PALETTE.impGreyDark, texel: 1 });
    kit.box(accentKey, px, 0.6, zc, 0.29, 0.02, len - 0.2);
    kit.box("viewGlass", px, 1.7, zc, 0.03, 1.2, len - 0.36, { uv: "keep" });
    kit.box("impTrim", px, 2.35, zc, 0.2, 0.1, len, { color: PALETTE.impBlack });
    kit.box(accentKey, px, 2.405, zc, 0.06, 0.01, len - 0.3);
    // end posts (wall end and arch end) with grey inset faces toward the vestibule; restricted stencil on
    // the wall-end post, vestibule side
    for (const z of [z0 + 0.15, z1 - 0.15]) {
      kit.box("impTrim", px, 1.25, z, 0.32, 2.5, 0.3, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impMetal", px + 0.163, 1.3, z, 0.01, 2.1, 0.2, { color: PALETTE.impGreyDark, texel: 2 });
    }
    kit.add("decalImp", new THREE.PlaneGeometry(0.26, 0.26), { pos: [px + 0.17, 1.6, s * (hz - 0.15)], rot: [0, Math.PI / 2, 0], uv: "keep", uvRect: impDecalRect(IMP_DECAL.restricted) });
    kit.collider([px - 0.16, 0, z0], [px + 0.16, 2.5, z1], "partition");
  }
  {
    // scanner arch: two posts with red scan bars, lintel with a status screen, hazard plate on the deck
    for (const s of [-1, 1]) {
      const z = s * 1.55;
      kit.box("impTrim", px, 1.4, z, 0.4, 2.8, 0.5, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impMetal", px, 1.4, z - s * 0.26, 0.3, 2.2, 0.02, { color: PALETTE.impCharcoal, texel: 2 });
      // grey inset panel on the vestibule face with a red status bar (the frame reads without being a black mass)
      kit.box("impMetal", px + 0.205, 1.45, z, 0.01, 2.3, 0.36, { color: PALETTE.impGreyDark, texel: 2 });
      kit.box("emitRedDim", px + 0.212, 1.45, z + s * 0.12, 0.006, 1.6, 0.03);
      kit.box(accentKey, px, 1.4, z - s * 0.275, 0.05, 2.0, 0.012);
      kit.box("impGloss", px, 2.45, z - s * 0.28, 0.18, 0.12, 0.02);
      for (let k = 0; k < 4; k++) kit.box(k % 2 ? "emitWhite" : accentKey, px - 0.1 + k * 0.066, 0.7, z - s * 0.28, 0.04, 0.04, 0.012);
      kit.collider([px - 0.2, 0, z - 0.25], [px + 0.2, 2.8, z + 0.25], "arch");
    }
    kit.boxMM("impTrim", [px - 0.22, 2.8, -1.85], [px + 0.22, 3.15, 1.85], { color: PALETTE.impBlack, texel: 1 });
    kit.boxMM("impMetal", [px - 0.24, 2.85, -1.6], [px + 0.24, 3.1, 1.6], { color: PALETTE.impCharcoal, texel: 2 });
    kit.boxMM(accentKey, [px - 0.25, 2.9, -1.4], [px + 0.25, 2.93, 1.4]);
    // status screen on the door side of the lintel + stencil on the room side
    kit.add("scrRed0", new THREE.PlaneGeometry(0.9, 0.22), { pos: [px + 0.25, 3.0, 0], rot: [0, Math.PI / 2, 0], uv: "keep" });
    kit.add("decalImp", new THREE.PlaneGeometry(0.5, 0.25), { pos: [px - 0.25, 2.98, 0], rot: [0, -Math.PI / 2, 0], uv: "keep", uvRect: impDecalRect(IMP_DECAL.keepClear) });
    kit.box("chevronR", px, 0.004, 0, 1.0, 0.008, 2.6, { texel: 1.5 });
    kit.box("impTrim", px, 0.006, 0, 0.06, 0.012, 2.6, { color: PALETTE.impBlack });
  }
  // guard post: station + chair facing the door, a sealed arms locker on the E wall behind
  station(kit, 10.3, 0, 3.4, 2.0, 0.9, { yaw: 0, seed: 21, screens: ["scrRed0", "scrWhite1", "scrRed3"], accentKey, hoodKey: "emitRedDim" });
  impChair(kit, 10.3, 0, 4.4, 0);
  sealedCabinet(walls.E.frame, 13.7, { w: 1.5, h: 2.3, accentKey, decal: IMP_DECAL.hazard, doorColor: PALETTE.impGrey });
  sealedCabinet(walls.E.frame, 2.6, { w: 1.5, h: 2.3, accentKey, decal: IMP_DECAL.restricted });
  // checkpoint stencils flanking the door + indicator rows over the lintel
  walls.E.frame.decal(IMP_DECAL.restricted, 5.3, 2.0, 0.09, 0.6);
  walls.E.frame.decal(IMP_DECAL.glyphs3, 10.7, 2.0, 0.09, 0.5);
  // a wall gear cluster and a red wall light in the vestibule
  impWallGear(walls.E.frame, 11.8, 1.5, { seed: 8, accentKey });
  impWallLight(walls.E.frame, 5.2, 3.3, { key: accentKey, w: 0.7 });
  impWallLight(walls.E.frame, 10.8, 3.3, { key: accentKey, w: 0.7 });

  // ---- central holo table + hologram ----------------------------------------------------------
  const tx = -1.5;
  const tz = 0;
  const th = 0.8;
  holoTable(kit, tx, tz, 2.8, 1.9, th, { accentKey });
  projectorCone(kit, tx, th + 0.07, tz, th + 0.34, 0.1, 0.46, "deckA_holoRed");
  datapad(kit, tx - 1.1, th + 0.04, tz + 0.7, 0.3, { screen: "scrRed2", accentKey });
  datapad(kit, tx + 1.15, th + 0.04, tz - 0.6, -2.9, { screen: "scrWhite0", accentKey });
  cup(kit, tx + 1.2, th + 0.04, tz + 0.75);
  {
    // navicomp data core: concentric scrolling glyph cylinders around a lit spindle, slow counter-rotation
    const coreH = 1.5;
    const { group, scrolls } = dataCore(M, 0.44, coreH);
    group.position.set(tx, th + 0.34 + coreH / 2 + 0.02, tz);
    kit.attach(group);
    // a slim collar ring at the core's foot and a cap emitter on the table
    kit.add("impGloss", new THREE.CylinderGeometry(0.5, 0.56, 0.05, 32), { pos: [tx, th + 0.08, tz] });
    kit.add(accentKey, new THREE.TorusGeometry(0.47, 0.01, 6, 48).rotateX(Math.PI / 2), { pos: [tx, th + 0.105, tz] });
    kit.onUpdate((dt, t) => {
      group.rotation.y = t * 0.06;
      if (scrolls[0]) scrolls[0].offset.y = (t * 0.045) % 1;
      if (scrolls[1]) scrolls[1].offset.y = (-t * 0.03) % 1;
    });
    // surveillance monitor pair at the table's W end, each angled toward one analyst station
    for (const s of [-1, 1]) {
      const mx = tx - 1.05;
      const mz = tz + s * 0.55;
      const f = yawFrame(kit, mx, th + 0.04, mz, Math.atan2(-6.5 - mx, s * 4.4 - mz));
      f.box("impMetal", 0, 0.025, 0, 0.16, 0.05, 0.16, { color: PALETTE.impCharcoal });
      f.box("impTrim", 0, 0.2, 0, 0.42, 0.3, 0.05, { color: PALETTE.impBlack, texel: 1 });
      f.screen(s > 0 ? "scrRed1" : "scrWhite2", 0, 0.21, 0.028, 0.36, 0.22);
      f.box(accentKey, -0.16, 0.07, 0.028, 0.03, 0.02, 0.006);
    }
  }

  // ---- analyst stations facing the table -------------------------------------------------------
  for (const s of [-1, 1]) {
    const cz = s * 4.4;
    const yaw = s > 0 ? 0 : Math.PI;
    station(kit, -6.5, 0, cz, 2.6, 0.95, { yaw, seed: s > 0 ? 31 : 32, screens: s > 0 ? ["scrRed1", "scrWhite0", "scrRed2"] : ["scrRed3", "scrWhite1", "scrRed0"], accentKey, hoodKey: "emitRedDim", tall: true, conduits: 0 });
    impChair(kit, -6.5 - 0.45, 0, cz + s * 1.02, yaw);
    impChair(kit, -6.5 + 0.55, 0, cz + s * 1.02, yaw);
  }

  // ---- central analyst table on the analysis floor between the arch and the holo table: black frame,
  // gloss top with two inset readouts and a centre data strip, datapads, four chairs -----------------
  {
    const ax = 3.6;
    const az = 0;
    const aw = 3.6;
    const ad = 1.6;
    const ah = 0.78;
    kit.box("impMetal", ax, 0.06, az, aw - 0.6, 0.12, ad - 0.6, { color: PALETTE.impCharcoal, texel: 1 });
    kit.box("impTrim", ax, ah / 2, az, aw - 1.0, ah - 0.1, ad - 0.8, { color: PALETTE.impBlack, texel: 1 });
    for (const s of [-1, 1]) kit.box("impMetal", ax + s * (aw / 2 - 0.5), ah / 2, az, 0.08, ah - 0.1, ad - 0.9, { color: PALETTE.impGreyDark, texel: 1 });
    kit.box("impTrim", ax, ah - 0.035, az, aw, 0.07, ad, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impGloss", ax, ah + 0.006, az, aw - 0.08, 0.012, ad - 0.08);
    for (const s of [-1, 1]) kit.box(accentKey, ax, ah - 0.035, az + s * (ad / 2 + 0.006), aw - 0.4, 0.014, 0.012);
    // centre data strip (dim red) flanked by two inset readouts, one per side
    kit.box("emitRedDim", ax, ah + 0.014, az, 1.6, 0.006, 0.08);
    kit.add("scrRed3", new THREE.PlaneGeometry(0.9, 0.5).rotateX(-Math.PI / 2), { pos: [ax - 1.1, ah + 0.014, az - 0.25], rot: [0, Math.PI, 0], uv: "keep" });
    kit.add("scrWhite3", new THREE.PlaneGeometry(0.9, 0.5).rotateX(-Math.PI / 2), { pos: [ax + 1.1, ah + 0.014, az + 0.25], uv: "keep" });
    datapad(kit, ax - 0.5, ah + 0.02, az + 0.5, 2.9, { screen: "scrRed0", accentKey });
    datapad(kit, ax + 0.6, ah + 0.02, az - 0.5, -0.3, { screen: "scrWhite1", accentKey });
    cup(kit, ax + 1.5, ah + 0.02, az - 0.55);
    kit.collider([ax - aw / 2, 0, az - ad / 2], [ax + aw / 2, ah + 0.03, az + ad / 2], "analyst table");
    for (const s of [-1, 1]) for (const dx of [-0.85, 0.85]) impChair(kit, ax + dx, 0, az + s * (ad / 2 + 0.55), s > 0 ? 0 : Math.PI);
  }
  // structural pillars mark the edge of the analysis floor
  impPillar(kit, 3.8, -6.3, h, { w: 0.5, accentKey });
  impPillar(kit, 3.8, 6.3, h, { w: 0.5, accentKey });

  // ---- data bank walls (N and S) with a framed readout screen between the groups ---------------
  for (const side of ["N", "S"]) {
    const f = walls[side].frame;
    const toU = (x) => (side === "N" ? x + hx : hx - x);
    let k = 0;
    for (const x of [-10.6, -9.3, -8.0, -2.9, -1.6, -0.3, 1.0]) {
      dataBank(f, toU(x), { w: 1.2, h: 2.3, accentKey, screen: ["scrRed1", "scrRed0", "scrWhite0", "scrRed2", "scrWhite3", "scrRed3"][k % 6], seed: 100 + k + (side === "N" ? 0 : 50), decal: k % 2 ? IMP_DECAL.glyphs1 : IMP_DECAL.glyphs3, practical: "deckA_emitWhiteCool" });
      k++;
    }
    wallScreen(f, toU(-5.4), 2.35, 2.2, 1.0, side === "N" ? "scrRed1" : "scrWhite2", { accentKey, n0: 0.08 });
    indicatorRow(f, toU(-5.4), 1.55, 0.1, 12, { accentKey, seed: side === "N" ? 7 : 8, step: 0.12, size: 0.05 });
    conduitRun(f, toU(side === "N" ? -11.6 : 1.6), toU(side === "N" ? 1.6 : -11.6), h - 0.75, { n: 0.16, pipes: 2, seed: side === "N" ? 11 : 12, clampStep: 2.2 });
  }

  // ---- W wall: sealed restricted cabinets, stencils, conduits ----------------------------------
  {
    const f = walls.W.frame;
    for (const [z, dec] of [[-5.0, IMP_DECAL.restricted], [-1.7, IMP_DECAL.glyphs2], [1.7, IMP_DECAL.restricted], [5.0, IMP_DECAL.vacuum]]) sealedCabinet(f, hz - z, { w: 1.5, h: 2.4, accentKey, decal: dec });
    f.decal(IMP_DECAL.restricted, hz, 3.3, 0.09, 0.7);
    f.decal(IMP_DECAL.cog, hz - 6.9, 3.0, 0.09, 0.5);
    f.decal(IMP_DECAL.cog, hz + 6.9, 3.0, 0.09, 0.5);
    impWallLight(f, hz - 3.4, 3.4, { key: accentKey, w: 0.8 });
    impWallLight(f, hz + 3.4, 3.4, { key: accentKey, w: 0.8 });
    impWallGear(f, hz - 6.9, 1.4, { seed: 9, accentKey });
  }

  // ---- lights: hard key over the core, white fills, a dim red area light from the ceiling troughs,
  // cool practicals along the rack walls; the vestibule fill stays off the door axis (dark door frame)
  kit.light({ type: "spot", pos: [tx, h - 0.25, tz], target: [tx, th, tz], color: 0xdfe6ff, intensity: lux(h - 0.25 - th, 3.2), distance: 10, angle: 0.5, penumbra: 0.45, shadow: true, priority: 0.95 });
  kit.light({ type: "point", pos: [4.0, h - 0.5, 0], color: 0xc8d0e0, intensity: lux(h - 0.5, 6.2), distance: 17, priority: 0.5 });
  kit.light({ type: "point", pos: [-7.5, h - 0.5, 0], color: 0xc8d0e0, intensity: lux(h - 0.5, 5.4), distance: 17, priority: 0.48 });
  kit.light({ type: "point", pos: [10.6, h - 0.5, -1.8], color: 0xc8d0e0, intensity: lux(h - 0.5, 5.4), distance: 13, priority: 0.46 });
  kit.light({ type: "point", pos: [-6.0, h - 0.4, -3.5], color: red, intensity: lux(h - 0.4, 3.4), distance: 15, priority: 0.42 });
  kit.light({ type: "point", pos: [-6.0, h - 0.4, 3.5], color: red, intensity: lux(h - 0.4, 3.4), distance: 15, priority: 0.41 });
  kit.light({ type: "point", pos: [-4.5, 2.3, -6.4], color: 0xcfe0ff, intensity: 10.0, distance: 10, priority: 0.36 });
  kit.light({ type: "point", pos: [-4.5, 2.3, 6.4], color: 0xcfe0ff, intensity: 10.0, distance: 10, priority: 0.35 });
}
