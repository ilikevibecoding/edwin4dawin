// Crew Briefing Room. A five-step amphitheater: bench rows on 0.2 m tiers climb eastward from the
// entry aisle toward the back wall, all facing the west wall's mission map (a large wall screen flanked
// by Imperial roundels) and the lectern in front of it, which projects a small target hologram. Side
// wall screens on the north and south walls, a ready-room alcove with lockers and a kit bench in the NW
// corner under a lit soffit, neutral white light bands and troughs, a white spot on the lectern.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { bench, ceilingLight, pointLightDesc, spotLightDesc, platform, wallScreen, screenArray, alertBeacon, floorDecal, placard, lockers, pipeRun, cableTray } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";

export function buildBriefing(kit, ctx) {
  const { room, floorY: y } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const cz = (z0 + z1) / 2; // 616: the room's east-west axis (screen, lectern, aisle)
  const t = STD.wallT;
  const mats = ctx.mats;
  const yc = y + h;
  const WHITE = 0xeef2ff;

  buildShell(kit, ctx, ctx.id, room, {
    wall: { pitch: 4, tone: IMP.wallLight, toneAlt: IMP.wallMid, bandMat: "lightBand", styles: { plain: 0.62, control: 0.08, vent: 0.1, hatch: 0.08, pipes: 0.02, screen: 0.06, niche: 0.04 } },
    ceiling: { lights: false, tone: IMP.wallDark, panelW: 2.0 },
    floor: { strip: false, tone: IMP.wallMid }, // the deck has to return some of the white key
  });
  const walls = roomWalls(room);

  // ---- tiers and benches ----------------------------------------------------------------------------------
  const X_T0 = 68.0; // west edge of the first tier
  const TIER_D = 2.7;
  const RISE = 0.2;
  const N_TIERS = 5;
  const zA = [z0 + t + 0.6, z1 - t - 0.6]; // tier span along z
  const aisle = [613.9, 618.1]; // east-west aisle through the tiers
  for (let i = 0; i < N_TIERS; i++) {
    const xa = X_T0 + i * TIER_D;
    const xb = i === N_TIERS - 1 ? x1 - t : xa + TIER_D;
    const yi = y + RISE * (i + 1);
    platform(kit, ctx, [xa, zA[0], xb, zA[1]], y, RISE * (i + 1), { lit: ["w"], strip: "emitWhite", nosing: true });
    // bench rows either side of the aisle, facing west
    for (const [zc, len] of [[(zA[0] + aisle[0]) / 2 + 0.3, aisle[0] - zA[0] - 1.6], [(aisle[1] + zA[1]) / 2 - 0.3, zA[1] - aisle[1] - 1.6]]) {
      bench(kit, [xa + 1.55, yi, zc], len, Math.PI / 2, { color: i % 2 ? IMP.fabricBlack : IMP.fabricGrey });
    }
  }
  // floor-level front row (two short benches) and hazard band at the foot of the tiers
  bench(kit, [X_T0 - 2.6, y, 610.4], 5.6, Math.PI / 2, { color: IMP.fabricBlack });
  bench(kit, [X_T0 - 2.6, y, 621.6], 5.6, Math.PI / 2, { color: IMP.fabricBlack });
  floorDecal(kit, X_T0 - 0.9, y, aisle[0] + 0.7, 0.9, 1, Math.PI / 2);
  floorDecal(kit, X_T0 - 0.9, y, aisle[1] - 0.7, 0.9, 1, Math.PI / 2);
  // handrail down the aisle's south side, stepped with the tiers (posts only on every tier)
  for (let i = 0; i < N_TIERS; i++) {
    const xa = X_T0 + i * TIER_D;
    const yi = y + RISE * (i + 1);
    kit.box("impPaintedMetal", xa + 0.3, yi + 0.5, aisle[1] + 0.1, 0.06, 1.0, 0.06, { color: IMP.trim, texel: 1 });
    kit.box("impMetal", xa + TIER_D / 2, yi + 1.0, aisle[1] + 0.1, TIER_D + 0.02, 0.05, 0.06, { color: IMP.steel, texel: 1 });
  }
  kit.collider([X_T0, y, aisle[1] + 0.02], [x1 - t, y + RISE * N_TIERS + 1.1, aisle[1] + 0.18], "aisleRail");

  // ---- west wall: mission map, roundels, lectern with target hologram ---------------------------------------
  {
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    const uc = w.u(cz);
    // mission display: a 16.8 m triptych (tactical map centre, data panels either side) on one backing
    // plate that stands proud of the wall ribs (they would otherwise cut through the glass every 4 m),
    // spanning the tiers from the ready-room soffit to the south roundel
    const SW = [4.6, 7.0, 4.6];
    const GAP = 0.3;
    const TOTAL = SW[0] + SW[1] + SW[2] + 2 * GAP;
    const SH = 3.0;
    const SV = 2.75;
    const N0 = 0.15; // clear of the wall ribs (0.14 deep)
    frame.box("impPaintedMetal", uc, SV, N0 + 0.04, TOTAL + 0.5, SH + 0.5, 0.08, { color: IMP.trim, texel: 1 });
    let zs = cz - TOTAL / 2;
    for (const [i, sw] of SW.entries()) {
      const su = w.u(zs + sw / 2);
      frame.box("impPaintedMetal", su, SV, N0 + 0.11, sw + 0.14, SH + 0.14, 0.06, { color: IMP.consoleDark, texel: 1 });
      frame.box("darkGloss", su, SV, N0 + 0.143, sw + 0.04, SH + 0.04, 0.01);
      frame.box("screen" + [0, 1, 2][i], su, SV, N0 + 0.15, sw, SH, 0.004, { uv: "keep" });
      zs += sw + GAP;
    }
    frame.box("leds", uc, SV - SH / 2 - 0.11, N0 + 0.13, 1.2, 0.05, 0.01, { uv: "keep" });
    placard(frame, w.u(606.1), 2.75, 1.1, 4);
    placard(frame, w.u(626.0), 3.0, 1.1, 4);
    frame.quad("impDecal", w.u(626.0), 1.55, 0.062, 0.6, 0.6, { uvRect: impDecalRect(15) });
    // steel sill under the display with an indicator strip
    frame.box("impPaintedMetal", uc, 1.05, N0 + 0.14, TOTAL + 0.4, 0.1, 0.28, { color: IMP.consoleDark, texel: 1 });
    frame.box("leds", uc, 1.05, N0 + 0.285, TOTAL - 0.8, 0.05, 0.01, { uv: "keep" });
    kit.collider([x0 + t, y, cz - TOTAL / 2 - 0.25], [x0 + t + 0.45, y + SV + SH / 2 + 0.3, cz + TOTAL / 2 + 0.25], "missionDisplay");
    pointLightDesc(ctx, 0xc8d8ff, 2.0, 9, [x0 + 2.4, y + 3.2, cz], 1);
    // lectern: tapered plinth, sloped top with a screen and controls facing the speaker (west), emitter ring
    const lx = x0 + 6.0;
    const lz = cz;
    kit.box("impPaintedMetal", lx, y + 0.06, lz, 1.5, 0.12, 1.1, { color: IMP.trim, texel: 1 });
    kit.box("impPaintedMetal", lx, y + 0.62, lz, 1.2, 1.0, 0.8, { color: IMP.console, texel: 1 });
    kit.box("impPaintedMetal", lx, y + 1.17, lz, 1.3, 0.1, 0.95, { color: IMP.consoleDark, texel: 1 });
    kit.box("emitBlue", lx - 0.605, y + 0.16, lz, 0.01, 0.02, 0.9);
    // sloped control face toward the speaker on the west side
    kit.add("darkGloss", new THREE.BoxGeometry(0.02, 0.36, 0.7), { pos: [lx - 0.56, y + 1.32, lz], rot: [0, 0, -0.55] });
    const sg = new THREE.PlaneGeometry(0.6, 0.26);
    sg.rotateY(-Math.PI / 2);
    kit.add("screen2", sg, { pos: [lx - 0.56 - 0.0136, y + 1.32 + 0.0083, lz], rot: [0, 0, -0.55], uv: "keep" });
    kit.box("blinkSparse", lx - 0.66, y + 1.2, lz, 0.01, 0.08, 0.7, { uv: "keep" });
    // emitter disc and hologram: wireframe target planet with a reticle ring and a wedge (the strike group)
    kit.cyl("impMatte", lx, y + 1.235, lz, 0.32, 0.03, "y", { color: IMP.black, segments: 24 }); // matte: gloss mirrors the spot as a white ball
    kit.add("emitBlue", new THREE.TorusGeometry(0.3, 0.015, 6, 36), { pos: [lx, y + 1.25, lz], rot: [Math.PI / 2, 0, 0] });
    const planet = new THREE.SphereGeometry(0.28, 10, 6); // coarse: a dense additive wire ball saturates to white from the back rows
    const reticle = new THREE.TorusGeometry(0.42, 0.006, 4, 48);
    reticle.rotateX(Math.PI / 2);
    const shape = new THREE.Shape([new THREE.Vector2(0, 0.16), new THREE.Vector2(0.09, -0.1), new THREE.Vector2(-0.09, -0.1)]);
    const wedge = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
    wedge.rotateX(Math.PI / 2);
    wedge.rotateY(-Math.PI / 2);
    wedge.translate(0.62, 0.12, 0);
    const holoGeo = mergeGeometries([planet.toNonIndexed(), reticle.toNonIndexed(), wedge.toNonIndexed()], false);
    const holo = new THREE.Mesh(holoGeo, mats.holoWire);
    holo.position.set(lx, y + 1.85, lz);
    ctx.add(holo);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.28, 1.0, 24, 1, true), mats.beam);
    cone.position.set(lx, y + 1.76, lz);
    ctx.add(cone);
    ctx.animate((dt, tm) => {
      holo.rotation.y += dt * 0.4;
      holo.position.y = y + 1.85 + Math.sin(tm * 1.1) * 0.03;
    });
    kit.collider([lx - 0.75, y, lz - 0.6], [lx + 0.75, y + 1.3, lz + 0.6], "lectern");
    // speaker's mark on the deck and the spot over the lectern
    floorDecal(kit, lx - 1.3, y, lz, 0.9, 13, Math.PI / 2);
    spotLightDesc(ctx, 0xfff4e6, 4.5, 9, [lx + 0.6, yc - 0.25, lz], [lx, y, lz], { angle: 0.5, penumbra: 0.5, shadow: true, priority: 2 });
    kit.cyl("impPaintedMetal", lx + 0.6, yc - 0.12, lz, 0.3, 0.24, "y", { color: IMP.trim, segments: 20, texel: 1 });
    kit.cyl("emitWhite", lx + 0.6, yc - 0.245, lz, 0.19, 0.01, "y", { segments: 20 });
  }

  // ---- north wall: door, side screen, ready-room alcove in the NW corner --------------------------------------
  {
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    const ud = w.u(67);
    wallScreen(frame, w.u(62.2), 3.0, 2.6, 1.5, 0);
    frame.quad("impDecal", ud - 1.9, 1.6, 0.062, 0.6, 0.6, { uvRect: impDecalRect(0) });
    frame.quad("impDecal", ud + 1.9, 1.6, 0.062, 0.6, 0.6, { uvRect: impDecalRect(7) });
    alertBeacon(frame, ctx, ud + 4.0, 3.5, { intensity: 0 });
    screenArray(frame, w.u(75.5), 3.3, 3, 1, 1.3, 0.8, { seed: 301, variants: [0, 1, 2] });
    // alcove: lockers on the north wall, kit bench on the west wall, under a dropped soffit (edge-lit
    // fascia, 3.6 m clear) that lands on wall pilasters — no free-standing column, which stood in the
    // audience's sightline to the mission display
    const ax = 60.4; // alcove's east edge
    const az = 607.4; // alcove's south edge (north of the mission display)
    const SOF = 3.6;
    lockers(frame, w.u(53.4), w.u(59.4), 2.3, { seed: 303, tone: IMP.wallMid, doorW: 0.75 });
    bench(kit, [x0 + t + 0.55, y, 606.1], 2.2, -Math.PI / 2, { color: IMP.fabricGrey });
    kit.boxMM("impPaintedMetal", [x0 + t, y + SOF, z0 + t], [ax, yc, az], { color: IMP.trim, texel: 1 });
    kit.box("lightBand", ax - 0.22, y + SOF - 0.005, (z0 + t + az) / 2, 0.24, 0.01, az - z0 - t - 0.6, { uv: "keep" });
    kit.box("lightBand", (x0 + t + ax) / 2, y + SOF - 0.005, az - 0.22, ax - x0 - t - 0.6, 0.01, 0.24, { uv: "keep" });
    kit.box("impPaintedMetal", ax, y + SOF / 2, z0 + t + 0.2, 0.5, SOF, 0.4, { color: IMP.wallDark, texel: 1 });
    kit.box("impPaintedMetal", x0 + t + 0.2, y + SOF / 2, az, 0.4, SOF, 0.5, { color: IMP.wallDark, texel: 1 });
    kit.box("impMetal", ax, y + SOF / 2, z0 + t + 0.404, 0.04, SOF - 0.4, 0.008, { color: IMP.gunmetal });
    kit.box("impMetal", x0 + t + 0.404, y + SOF / 2, az, 0.008, SOF - 0.4, 0.04, { color: IMP.gunmetal });
    kit.collider([ax - 0.3, y, z0], [ax + 0.3, y + SOF, z0 + t + 0.45], "pilaster");
    kit.collider([x0, y, az - 0.3], [x0 + t + 0.45, y + SOF, az + 0.3], "pilaster");
    // helmet shelf over the bench and a duty roster screen
    kit.box("impPaintedMetal", x0 + t + 0.3, y + 1.9, 606.1, 0.5, 0.05, 2.2, { color: IMP.trim, texel: 1 });
    for (let i = 0; i < 3; i++) kit.add("impPaintedMetal", new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x0 + t + 0.3, y + 1.93, 605.4 + i * 0.7], color: IMP.wallLight, uv: "scale", uvScale: [1, 1] });
    placard(frame, w.u(56.4), 3.1, 0.6, 3);
    // the alcove's key under the soffit (its fascia bands light nothing since the dimming)
    pointLightDesc(ctx, WHITE, 2.6, 8, [56.4, y + 3.0, 606.6], 0);
    floorDecal(kit, 58.6, y, 607.2, 0.8, 13);
  }

  // ---- south wall: side screen, crew notices, kit lockers at the west end -------------------------------------
  {
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    wallScreen(frame, w.u(62.2), 3.0, 2.6, 1.5, 2);
    screenArray(frame, w.u(75.5), 3.3, 3, 1, 1.3, 0.8, { seed: 305, variants: [2, 0, 1] });
    placard(frame, w.u(57.0), 3.1, 0.6, 15);
    frame.quad("impDecal", w.u(57.0), 1.5, 0.062, 0.7, 0.7, { uvRect: impDecalRect(6) });
    alertBeacon(frame, ctx, w.u(70.5), 3.5, { intensity: 0 }); // passive: keeps the room at 12 light descriptors
    lockers(frame, w.u(56.6), w.u(53.4), 2.3, { seed: 307, tone: IMP.wallMid, doorW: 0.8 });
    pointLightDesc(ctx, WHITE, 1.2, 6, [62.2, y + 3.0, z1 - 1.8], 0);
  }

  // ---- east wall (behind the top tier): crest, status panels ----------------------------------------------------
  {
    const w = walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    const yTop = RISE * N_TIERS;
    placard(frame, w.u(cz), yTop + 2.4, 1.0, 4);
    screenArray(frame, w.u(609.5), yTop + 2.2, 2, 1, 1.2, 0.8, { seed: 309, variants: [1, 0] });
    screenArray(frame, w.u(622.5), yTop + 2.2, 2, 1, 1.2, 0.8, { seed: 311, variants: [0, 2] });
    frame.quad("impDecal", w.u(cz) - 2.2, yTop + 2.4, 0.062, 0.5, 0.5, { uvRect: impDecalRect(0) });
    frame.quad("impDecal", w.u(cz) + 2.2, yTop + 2.4, 0.062, 0.5, 0.5, { uvRect: impDecalRect(15) });
  }

  // ---- ceiling: white troughs over the tiers and the front, transverse beams framing the aisle -------------------
  {
    const L = zA[1] - zA[0] - 0.4;
    for (const tx of [61.0, X_T0 + TIER_D * 0.5, X_T0 + TIER_D * 2.5, X_T0 + TIER_D * 4.5]) {
      // two lights per long trough; the tier troughs carry the room's key (dark benches on a dark deck,
      // and the band emissives light nothing), the front trough sits near the display's own light
      const I = tx > X_T0 ? 7.5 : 5.0;
      ceilingLight(kit, ctx, [tx, yc, cz], L, "z", { color: WHITE, intensity: 0, w: 0.34 });
      pointLightDesc(ctx, WHITE, I, 11, [tx, yc - 0.6, 610.5], 1);
      pointLightDesc(ctx, WHITE, I, 11, [tx, yc - 0.6, 621.5], 1);
    }
    for (const bz of [aisle[0] - 0.5, aisle[1] + 0.5]) {
      kit.box("impPaintedMetal", (x0 + x1) / 2, yc - 0.24, bz, x1 - x0 - 0.6, 0.48, 0.4, { color: IMP.trim, texel: 1 });
    }
    pipeRun(kit, [[x0 + 0.5, yc - 0.6, aisle[0] - 0.95], [x1 - 0.5, yc - 0.6, aisle[0] - 0.95]], 0.07, { color: IMP.gunmetal, clampPitch: 3 });
    cableTray(kit, [x0 + 0.6, aisle[1] + 1.0], [x1 - 0.6, aisle[1] + 1.0], yc - 0.62, { w: 0.4, cables: 3, seed: 21 });
  }

  // ---- camera views ---------------------------------------------------------------------------------------------
  const eye = y + STD.eye;
  ctx.view("briefing", 64.5, eye, z0 + 2.4, 138, -4);
  ctx.view("briefing_tiers", x0 + 8.5, eye, cz - 0.6, -84, -2);
  ctx.view("briefing_screen", X_T0 + TIER_D * 2.5, eye, cz, 90, -4);
  ctx.view("briefing_ready", 58.5, eye, 611.8, 30, -4);
}
