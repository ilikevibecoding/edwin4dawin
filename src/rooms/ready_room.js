// Officers' Ready Room (deck A): senior officers' briefing space. Long conference table with eight
// chairs under a suspended warm light bar, a table holo projector, a large framed wall display with
// a briefing podium, a service alcove (beverage dispenser, cups), honour boards and plaques, a
// padded bench, a datapad rack. Softer grey panels, dark carpet instead of the deck lane. Accent gold.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, impConsole, impChair, impWallLight, lux } from "./imperial_kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { deckASetup, wallScreen, wireSphereGeometry, lineSegments, mergedMesh, datapad, cup, datapadRack, indicatorRow, yawToward } from "./deck_a_kit.js";

const BRASS = new THREE.Color("#b08a52");
const GOLD = "deckA_emitGold";

export function buildReadyRoom(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const M = ctx.materials;
  deckASetup(kit);
  const accentKey = "emitAmber";
  const warm = 0xffe2c0;
  const panelColor = PALETTE.impWhite.clone().lerp(PALETTE.impGrey, 0.35);

  // ---- shell: softer panel tint, clean features, two lit troughs ----------------------------------
  const walls = impRoomShell(kit, room, ctx.doors, {
    accentKey,
    seed: 5177,
    wall: { panelW: 1.8, features: { vent: 0.03, equipment: 0.04, conduit: 0.0, light: 0.12, screen: 0.05 }, panelColor, panelColorAlt: PALETTE.impGrey, altChance: 0.25 },
    walls: { E: { features: { vent: 0.0, equipment: 0.0, conduit: 0.0, light: 0.16, screen: 0.0 } }, S: { features: { vent: 0.02, equipment: 0.0, conduit: 0.0, light: 0.1, screen: 0.0 } }, N: { features: { vent: 0.04, equipment: 0.0, conduit: 0.0, light: 0.1, screen: 0.06 } } },
    floor: { lane: false },
    ceiling: { troughs: 2, troughW: 0.6, beamStep: 4.0 },
  });
  // carpet strip with a brass edge trim replaces the deck lane
  kit.boxMM("fabric", [-6.6, 0, -4.3], [8.2, 0.014, 4.3], { color: new THREE.Color("#3a3c42"), texel: 2 });
  for (const [a, b] of [[[-6.66, -4.36], [8.26, -4.3]], [[-6.66, 4.3], [8.26, 4.36]], [[-6.66, -4.36], [-6.6, 4.36]], [[8.2, -4.36], [8.26, 4.36]]]) kit.boxMM("impMetal", [a[0], 0, a[1]], [b[0], 0.02, b[1]], { color: BRASS, texel: 2 });

  // ---- conference table ---------------------------------------------------------------------------
  const tx = 1.0;
  const tw = 6.0;
  const td = 1.6;
  const th = 0.76;
  for (const s of [-1, 1]) {
    kit.box("impTrim", tx + s * 1.8, 0.35, 0, 1.2, 0.7, 1.0, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", tx + s * 1.8, 0.06, 0, 1.28, 0.12, 1.08, { color: PALETTE.impCharcoal, texel: 1 });
    kit.box("impMetal", tx + s * 1.8, 0.4, 0, 1.22, 0.16, 1.02, { color: PALETTE.impGreyDark, texel: 1 });
    kit.box(GOLD, tx + s * 1.8, 0.4, 0, 1.23, 0.015, 1.03);
  }
  kit.box("impMetal", tx, 0.5, 0, 3.8, 0.14, 0.4, { color: PALETTE.impCharcoal, texel: 1 });
  kit.box("impMetal", tx, 0.71, 0, tw + 0.06, 0.04, td + 0.06, { color: BRASS, texel: 2 });
  kit.box("impGloss", tx, 0.76, 0, tw, 0.06, td);
  kit.box("impTrim", tx, 0.795, 0, 4.6, 0.012, 0.32, { color: PALETTE.impCharcoal });
  kit.box(GOLD, tx, 0.803, 0, 4.4, 0.008, 0.03);
  // seat-side control strips (one per chair) and datapads / cups
  const seatsX = [-2.25, -0.75, 0.75, 2.25];
  for (const s of [-1, 1]) {
    for (let i = 0; i < seatsX.length; i++) {
      const x = tx + seatsX[i];
      kit.box("impGloss", x, 0.795, s * (td / 2 - 0.16), 0.36, 0.012, 0.12);
      kit.box(i % 2 ? accentKey : GOLD, x - 0.1, 0.803, s * (td / 2 - 0.16), 0.05, 0.006, 0.05);
      kit.box("emitWhite", x + 0.06, 0.803, s * (td / 2 - 0.16), 0.05, 0.006, 0.05);
      impChair(kit, x, 0, s * 1.4, s > 0 ? 0 : Math.PI);
    }
  }
  datapad(kit, tx - 2.4, th + 0.03, 0.42, -0.2, { screen: "scrAmber0", accentKey });
  datapad(kit, tx - 0.6, th + 0.03, -0.45, 3.0, { screen: "scrWhite0", accentKey });
  datapad(kit, tx + 2.5, th + 0.03, 0.4, 0.4, { screen: "scrBlue0", accentKey });
  cup(kit, tx - 1.55, th + 0.03, 0.5);
  cup(kit, tx + 0.95, th + 0.03, -0.52);
  cup(kit, tx + 2.15, th + 0.03, -0.45);
  kit.collider([tx - tw / 2 - 0.04, 0, -td / 2 - 0.04], [tx + tw / 2 + 0.04, th + 0.06, td / 2 + 0.04], "table");
  // holo projector at the table centre + rotating briefing chart hologram
  kit.cyl("impGloss", tx, th + 0.06, 0, 0.14, 0.06, "y", { segments: 20 });
  kit.add(GOLD, new THREE.TorusGeometry(0.15, 0.008, 6, 40).rotateX(Math.PI / 2), { pos: [tx, th + 0.085, 0] });
  kit.add("holo", new THREE.CircleGeometry(0.6, 40).rotateX(-Math.PI / 2), { pos: [tx, th + 0.1, 0], uv: "keep" });
  {
    const chart = new THREE.Group();
    chart.position.set(tx, th + 0.5, 0);
    const geos = [new THREE.TorusGeometry(0.5, 0.006, 6, 64).rotateX(Math.PI / 2), new THREE.TorusGeometry(0.34, 0.005, 6, 48).rotateX(Math.PI / 2).translate(0, 0.25, 0)];
    const bars = [0.42, 0.66, 0.3, 0.55, 0.74, 0.36];
    for (let i = 0; i < bars.length; i++) {
      const a = (i / bars.length) * Math.PI * 2;
      geos.push(new THREE.BoxGeometry(0.05, bars[i], 0.05).translate(Math.cos(a) * 0.5, bars[i] / 2 - 0.1, Math.sin(a) * 0.5));
    }
    chart.add(mergedMesh(geos, M.holoBright));
    const globe = lineSegments(wireSphereGeometry(0.2, 5, 8, 24), M.deckA_holoLine);
    globe.position.y = 0.55;
    chart.add(globe);
    kit.attach(chart);
    kit.onUpdate((dt, t) => {
      chart.rotation.y = t * 0.3;
      globe.rotation.y = -t * 0.6;
    });
  }
  // suspended warm light bar over the table
  kit.box("impTrim", tx, 3.2, 0, 4.4, 0.12, 0.5, { color: PALETTE.impBlack, texel: 1 });
  kit.box("impMetal", tx, 3.13, 0, 4.2, 0.03, 0.4, { color: PALETTE.impCharcoal });
  kit.box("emitWarmSoft", tx, 3.11, 0, 4.0, 0.02, 0.3, { uv: "keep" });
  kit.box(GOLD, tx, 3.2, 0.256, 4.2, 0.02, 0.01);
  kit.box(GOLD, tx, 3.2, -0.256, 4.2, 0.02, 0.01);
  for (const x of [tx - 1.6, tx + 1.6]) kit.cyl("impMetal", x, (3.26 + h) / 2, 0, 0.015, h - 3.26, "y", { color: PALETTE.impGreyDark, segments: 8 });

  // ---- E wall: large briefing display with a brass surround, podium, indicator rows --------------
  {
    const f = walls.E.frame;
    f.box("impMetal", hz, 2.05, 0.085, 4.0, 2.16, 0.01, { color: BRASS, texel: 2 });
    wallScreen(f, hz, 2.05, 3.6, 1.8, "scrBlue1", { accentKey: GOLD, n0: 0.09, label: false });
    f.decal(IMP_DECAL.cog, hz, 3.35, 0.09, 0.36);
    indicatorRow(f, hz - 2.6, 1.6, 0.1, 6, { accentKey, seed: 21, step: 0.09, size: 0.045 });
    indicatorRow(f, hz + 2.6, 1.6, 0.1, 6, { accentKey, seed: 22, step: 0.09, size: 0.045 });
    impWallLight(f, hz - 3.6, 2.6, { key: "emitWhiteSoft", w: 0.7 });
    impWallLight(f, hz + 3.6, 2.6, { key: "emitWhiteSoft", w: 0.7 });
    // podium facing the table
    const pyaw = yawToward(8.3, 2.4, tx, 0);
    impConsole(kit, 8.3, 0, 2.4, 1.0, 0.6, { yaw: pyaw, seed: 41, screens: ["scrAmber1"], accentKey, height: 1.02 });
  }

  // ---- N wall: service alcove (counter, dispenser, cups, shelf) + a smaller display -----------
  {
    const f = walls.N.frame;
    const u0 = 3.6 + hx;
    const u1 = 8.6 + hx;
    const cu = (u0 + u1) / 2;
    const cw = u1 - u0;
    // counter: black base with two door leaves, gloss top with brass edge
    f.box("impTrim", cu, 0.44, 0.38, cw, 0.88, 0.6, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", cu, 0.06, 0.38, cw + 0.04, 0.12, 0.64, { color: PALETTE.impCharcoal, texel: 1 });
    for (let k = 0; k < 4; k++) {
      f.box("impPanel1", u0 + 0.1 + (k + 0.5) * ((cw - 0.2) / 4), 0.45, 0.685, (cw - 0.2) / 4 - 0.06, 0.6, 0.02, { color: panelColor, uv: "world", texel: 1 });
      f.box("impMetal", u0 + 0.1 + (k + 0.5) * ((cw - 0.2) / 4) + 0.2, 0.55, 0.705, 0.03, 0.18, 0.02, { color: BRASS });
    }
    f.box("impMetal", cu, 0.89, 0.39, cw + 0.06, 0.03, 0.66, { color: BRASS, texel: 2 });
    f.box("impGloss", cu, 0.92, 0.38, cw + 0.02, 0.04, 0.62);
    f.collider(u0, u1, 0, 0.95, 0.08, 0.7, "counter");
    // splash panel + shelf with cups
    f.box("impMetal", cu, 1.35, 0.1, cw, 0.82, 0.04, { color: PALETTE.impCharcoal, texel: 2 });
    f.box(GOLD, cu, 0.97, 0.13, cw - 0.2, 0.012, 0.01);
    f.box("impTrim", cu - 0.6, 1.62, 0.22, cw - 1.6, 0.04, 0.28, { color: PALETTE.impBlack });
    f.box("impMetal", cu - 0.6, 1.66, 0.22, cw - 1.7, 0.04, 0.24, { color: BRASS, texel: 2 });
    for (let k = 0; k < 7; k++) {
      const p = f.pos(u0 + 0.5 + k * 0.42, 1.68, 0.22);
      cup(kit, p.x, p.y, p.z, { color: k % 3 === 0 ? PALETTE.impGrey : PALETTE.impWhite });
    }
    for (let k = 0; k < 4; k++) {
      const p = f.pos(u0 + 0.5 + k * 0.32, 0.94, 0.5);
      cup(kit, p.x, p.y, p.z);
    }
    // beverage dispenser on the counter's east end
    const du = u1 - 0.55;
    f.box("impTrim", du, 1.3, 0.35, 0.7, 0.76, 0.5, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", du, 1.3, 0.605, 0.6, 0.66, 0.01, { color: PALETTE.impCharcoal, texel: 2 });
    f.screen("scrAmber0", du + 0.1, 1.5, 0.612, 0.3, 0.16);
    for (let k = 0; k < 3; k++) f.box(k === 1 ? GOLD : k === 0 ? "emitWhite" : "impGloss", du - 0.2, 1.55 - k * 0.1, 0.615, 0.08, 0.06, 0.012);
    f.box("impMetal", du, 1.12, 0.62, 0.5, 0.05, 0.03, { color: PALETTE.impGreyDark });
    f.cylV("impMetal", du, 1.06, 0.72, 0.015, 0.12, { color: PALETTE.impGrey, segments: 8 });
    f.box("impMetal", du, 0.96, 0.72, 0.36, 0.02, 0.22, { color: PALETTE.impGreyDark });
    f.decal(IMP_DECAL.glyphs2, du + 0.1, 1.28, 0.612, 0.16);
    cup(kit, ...f.pos(du, 0.98, 0.72).toArray());
    // stencils and a small display on the west part of the wall
    f.decal(IMP_DECAL.glyphs1, cu - 0.3, 2.2, 0.09, 0.5);
    f.decal(IMP_DECAL.glyphs3, cu + 1.1, 2.2, 0.09, 0.5);
    wallScreen(f, 5.5, 2.0, 1.6, 0.9, "scrWhite1", { accentKey: GOLD, n0: 0.08 });
    impWallLight(f, 1.6, 2.6, { key: "emitWhiteSoft", w: 0.7 });
  }

  // ---- S wall: plaques + honour board ---------------------------------------------------------
  {
    const f = walls.S.frame;
    const plaque = (u, v, pw, ph, decal) => {
      f.box("impMetal", u, v, 0.1, pw + 0.06, ph + 0.06, 0.03, { color: BRASS, texel: 2 });
      f.box("impTrim", u, v, 0.12, pw, ph, 0.03, { color: PALETTE.impBlack, texel: 1 });
      f.decal(decal, u, v + ph * 0.1, 0.137, Math.min(pw, ph) * 0.62);
      f.box(GOLD, u, v - ph / 2 + 0.06, 0.137, pw * 0.6, 0.01, 0.006);
    };
    for (const [x, dec] of [[-4.5, IMP_DECAL.cog], [-2.4, IMP_DECAL.bay01], [-0.3, IMP_DECAL.glyphs2], [1.8, IMP_DECAL.bay03]]) plaque(hx - x, 2.1, 1.0, 0.7, dec);
    // honour board: rows of small brass plates
    const bu = hx - 6.0;
    f.box("impMetal", bu, 2.0, 0.1, 2.16, 1.56, 0.03, { color: BRASS, texel: 2 });
    f.box("impTrim", bu, 2.0, 0.12, 2.1, 1.5, 0.03, { color: PALETTE.impBlack, texel: 1 });
    f.decal(IMP_DECAL.cog, bu, 2.55, 0.137, 0.32);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) f.box("impMetal", bu - 0.85 + c * 0.34, 2.25 - r * 0.2, 0.14, 0.26, 0.09, 0.01, { color: BRASS, texel: 4 });
    f.box(GOLD, bu, 1.3, 0.137, 1.6, 0.012, 0.006);
    impWallLight(f, bu, 3.0, { key: "emitWhiteSoft", w: 1.2 });
    impWallLight(f, hx + 1.5, 3.0, { key: "emitWhiteSoft", w: 1.2 });
  }

  // ---- W wall: padded bench south of the door, datapad rack north of it ------------------------
  {
    const f = walls.W.frame;
    const bz0 = 2.4;
    const bz1 = 6.6;
    const bu = hz - (bz0 + bz1) / 2;
    const bl = bz1 - bz0;
    f.box("impTrim", bu, 0.22, 0.42, bl, 0.44, 0.68, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", bu, 0.05, 0.42, bl + 0.04, 0.1, 0.72, { color: PALETTE.impCharcoal, texel: 1 });
    f.box("fabric", bu, 0.49, 0.42, bl - 0.08, 0.1, 0.62, { color: PALETTE.impGreyDark, texel: 2 });
    for (let k = 1; k < 4; k++) f.box("impTrim", bu - bl / 2 + (k * bl) / 4, 0.5, 0.42, 0.02, 0.11, 0.6, { color: PALETTE.impBlack });
    f.box("fabric", bu, 0.92, 0.13, bl - 0.08, 0.5, 0.1, { color: PALETTE.impGreyDark, texel: 2 });
    f.box("impTrim", bu, 1.2, 0.1, bl, 0.06, 0.12, { color: PALETTE.impBlack });
    f.box(GOLD, bu, 1.235, 0.1, bl - 0.2, 0.01, 0.06);
    f.collider(bu - bl / 2, bu + bl / 2, 0, 0.6, 0.08, 0.78, "bench");
    datapadRack(f, hz + 3.6, 1.3, { n: 5, accentKey: GOLD });
    f.decal(IMP_DECAL.glyphs1, hz + 3.6, 2.2, 0.09, 0.5);
    // side table with a cup at the bench end
    const p = f.pos(hz - 7.2, 0, 0.45);
    kit.box("impTrim", p.x, 0.3, p.z, 0.5, 0.6, 0.5, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impGloss", p.x, 0.62, p.z, 0.54, 0.04, 0.54);
    cup(kit, p.x + 0.1, 0.64, p.z - 0.08);
    datapad(kit, p.x - 0.08, 0.64, p.z + 0.1, 0.5, { screen: "scrAmber1", accentKey });
    kit.collider([p.x - 0.27, 0, p.z - 0.27], [p.x + 0.27, 0.66, p.z + 0.27], "sidetable");
  }
  // door-side stencils
  walls.W.frame.decal(IMP_DECAL.glyphs2, hz - 1.6, 2.2, 0.09, 0.45);
  walls.W.frame.decal(IMP_DECAL.cog, hz + 1.6, 2.2, 0.09, 0.45);

  // ---- lights: warm key over the table, warm fills, gold under-table glow ----------------------
  kit.light({ type: "spot", pos: [tx, h - 0.2, 0], target: [tx, th, 0], color: warm, intensity: lux(h - 0.2 - th, 2.8), distance: 10, angle: 0.75, penumbra: 0.6, shadow: true, priority: 0.95 });
  kit.light({ type: "point", pos: [tx - 3.0, h - 0.6, 0], color: 0xffd6a6, intensity: lux(h - 0.6, 1.5), distance: 12, priority: 0.55 });
  kit.light({ type: "point", pos: [tx + 3.0, h - 0.6, 0], color: 0xffd6a6, intensity: lux(h - 0.6, 1.5), distance: 12, priority: 0.54 });
  kit.light({ type: "point", pos: [6.0, h - 0.8, -6.4], color: 0xffd9b0, intensity: lux(h - 0.8, 1.0), distance: 9, priority: 0.45 });
  kit.light({ type: "point", pos: [8.6, 2.6, 0], color: 0xdfe8ff, intensity: lux(2.6, 0.9), distance: 8, priority: 0.42 });
  kit.light({ type: "point", pos: [-8.2, h - 0.7, 2.0], color: warm, intensity: lux(h - 0.7, 1.0), distance: 9, priority: 0.44 });
  kit.light({ type: "point", pos: [tx, 0.35, 0], color: 0xe8c98c, intensity: 3.0, distance: 6, priority: 0.3 });
}
