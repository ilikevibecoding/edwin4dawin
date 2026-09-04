// Hyperdrive & Propulsion Systems — three 20 m hyperdrive motivators (r 2.5) lie across the hall on heavy
// saddle cradles, wrapped in pulsing violet field rings; coil towers stand between them, conduit bundles rise
// to a ceiling manifold, a raised control dais faces the machinery from the entrance, cable trenches feed
// the motivators and the far wall is a coolant manifold of pipes, valves and gauges.
import * as THREE from "three";
import { consoleStation, chair, railing, stairs, pipeRun, cableBundle, pillar } from "../../core/props.js";
import { prism } from "../../core/kit.js";
import { hazardBay, floorDecal, cableTrench, screenPanel, ledCluster, valveStack, workLight, strip, machineBlock, setLightLevel, frameScreen, wallU } from "./machinery.js";
import { DECAL, decalRect } from "../../textures.js";

export const meta = { id: "hyperdrive", stream: "deck-rooms" };

export function build(ctx) {
  const { kit, IMP } = ctx;
  const F = ctx.floor; // -10
  const C = ctx.ceil; // 2
  const { x0, x1, z0, z1 } = ctx.inner;
  const CX = -54;
  const R = 2.5;
  const LEN = 20;
  const AXIS = F + 3.2;
  const MOTORS = [297, 311, 325];

  ctx.shell({ floorMat: "deckGrey", floorColor: IMP.plateDark, walls: { xmin: { pilasterEvery: 8.7 }, xmax: { pilasterEvery: 8.7 }, zmax: { pilasterEvery: 0 } }, stripSpacing: 8, seed: 71 });

  // ---- violet ring material (pulsed) + animated group
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x0a0810, emissive: new THREE.Color(0x8a7cff), emissiveIntensity: 2.0, roughness: 0.4, metalness: 0 });
  const rings = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(R + 0.12, 0.1, 6, 48);
  const coreGeo = new THREE.CircleGeometry(0.9, 24);

  // ---- motivators on cradles
  const saddle = [
    [-3.2, 0],
    [3.2, 0],
    [3.2, 2.5],
    [2.4, 2.33],
    [1.8, 1.4],
    [0.87, 0.8],
    [0, 0.65],
    [-0.87, 0.8],
    [-1.8, 1.4],
    [-2.4, 2.33],
    [-3.2, 2.5],
  ];
  MOTORS.forEach((mz, mi) => {
    const xa = CX - LEN / 2,
      xb = CX + LEN / 2;
    // body: long cylinder along X with rib rings, seam and an inspection hatch
    kit.cyl("plate", CX, AXIS, mz, R, LEN, "x", { color: IMP.plateBlue, segments: 40, texel: 0.5 });
    for (const dx of [-8.5, -5, 0, 5, 8.5]) kit.cyl("paintedMetal", CX + dx, AXIS, mz, R + 0.06, 0.5, "x", { color: IMP.black, segments: 40 });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      kit.box("paintedMetal", CX, AXIS + Math.sin(a) * (R + 0.04), mz + Math.cos(a) * (R + 0.04), LEN - 2, 0.16, 0.5, { color: IMP.plateDark, rot: [a + Math.PI / 2, 0, 0], texel: 1 });
    }
    // end caps: disc + dome + glowing centre + bolts
    for (const s of [-1, 1]) {
      const ex = s < 0 ? xa : xb;
      kit.cyl("paintedMetal", ex + s * 0.25, AXIS, mz, R + 0.2, 0.5, "x", { color: IMP.black, segments: 40 });
      kit.add("plate", new THREE.SphereGeometry(R * 0.8, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [ex + s * 0.5, AXIS, mz], rot: [0, 0, s < 0 ? Math.PI / 2 : -Math.PI / 2], scale: [1, 0.55, 1], color: IMP.plateDark, uv: "scale", uvScale: [6, 2] });
      const core = new THREE.Mesh(coreGeo, ringMat);
      core.position.set(ex + s * 1.62, AXIS, mz);
      core.rotation.y = s < 0 ? -Math.PI / 2 : Math.PI / 2;
      rings.add(core);
      kit.cyl("paintedMetal", ex + s * 1.5, AXIS, mz, 1.1, 0.3, "x", { color: IMP.black, segments: 24 });
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        kit.cyl("metal", ex + s * 0.55, AXIS + Math.sin(a) * (R - 0.15), mz + Math.cos(a) * (R - 0.15), 0.12, 0.25, "x", { color: IMP.steel, segments: 8 });
      }
      // coupling flange to the floor trench (cable bundle)
      kit.box("paintedMetal", ex + s * 0.9, AXIS - 1.6, mz, 0.6, 0.6, 0.8, { color: IMP.gunmetal, texel: 1 });
      cableBundle(kit, { from: [ex + s * 1.2, AXIS - 1.6, mz], to: [ex + s * 3.0, F + 0.1, mz], sag: 0.25, n: 3, r: 0.035 });
    }
    // field rings (pulsing) with dark housings
    for (const dx of [-6.5, -2.2, 2.2, 6.5]) {
      kit.add("paintedMetal", new THREE.TorusGeometry(R + 0.16, 0.26, 8, 48), { pos: [CX + dx, AXIS, mz], rot: [0, Math.PI / 2, 0], color: IMP.black, uv: "scale", uvScale: [20, 2] });
      const rm = new THREE.Mesh(ringGeo, ringMat);
      rm.position.set(CX + dx + 0.2, AXIS, mz);
      rm.rotation.y = Math.PI / 2;
      rings.add(rm);
      const rm2 = rm.clone();
      rm2.position.x = CX + dx - 0.2;
      rings.add(rm2);
    }
    // saddle cradles
    for (const sx of [CX - 6.5, CX + 6.5]) {
      kit.add("paintedMetal", prism(saddle, 1.8), { pos: [sx, F, mz], rot: [0, Math.PI / 2, 0], color: IMP.plateDark, uv: "world", texel: 1 });
      kit.box("paintedMetal", sx, F + 0.2, mz, 2.4, 0.4, 7.2, { color: IMP.black, texel: 1 });
      kit.box("hazard", sx, F + 1.1, mz, 1.82, 0.3, 6.42, { texel: 2 });
      for (const sz of [-1, 1]) {
        kit.box("metal", sx, F + 2.5, mz + sz * 3.05, 1.6, 0.12, 0.3, { color: IMP.steel });
        ledCluster(kit, { pos: [sx, F + 1.7, mz + sz * 3.22], yaw: sz > 0 ? Math.PI : 0, w: 0.5, h: 0.2, index: 3 + mi, accent: "emitViolet" });
      }
    }
    kit.collider([xa - 1.8, F, mz - R - 0.9], [xb + 1.8, F + 7, mz + R + 0.9], "motivator");
    hazardBay(kit, [xa - 3.4, mz - 4.6], [xb + 3.4, mz + 4.6], F, { w: 0.3, decal: DECAL.NUMBER0 + mi, decalSize: 1.6, decalAt: [xa - 2.2, mz + 3.6] });
    floorDecal(kit, [xb + 2.2, mz - 3.6], F, 1.6, DECAL.WARNING, Math.PI);
    // spec plate + access hatch on the near (−Z) face of the cylinder
    kit.box("plate", CX + 3, AXIS - 0.4, mz - R + 0.28, 1.4, 1.0, 0.1, { color: IMP.plateDark, uv: "keep", rot: [0.18, 0, 0] });
    kit.add("decal", new THREE.PlaneGeometry(0.9, 0.9), { pos: [CX + 3, AXIS - 0.4, mz - R + 0.22], rot: [0.18, Math.PI, 0], uv: "keep", uvRect: decalRect(DECAL.SPEC_PLATE) });
    // conduit bundles from the top of the motivator to the ceiling manifold
    for (const dx of [-4, 0, 4]) {
      pipeRun(kit, { points: [[CX + dx, AXIS + R - 0.2, mz], [CX + dx, C - 0.9, mz], [CX + dx, C - 0.9, mz + 1.6]], r: 0.28, color: IMP.steelDark, clamps: 2.2, clampColor: IMP.black });
      pipeRun(kit, { points: [[CX + dx + 0.7, AXIS + R - 0.2, mz], [CX + dx + 0.7, C - 1.4, mz]], r: 0.14, color: IMP.plateBlue, clamps: 2 });
    }
    kit.box("paintedMetal", CX, C - 0.7, mz + 1.6, LEN - 6, 0.6, 0.8, { color: IMP.plateDark, texel: 1 });
    kit.box("emitViolet", CX, C - 1.02, mz + 1.6, LEN - 7, 0.02, 0.15, { uv: "keep" });
  });
  ctx.add(rings);

  // ---- coil towers between the motivators (torus stacks on a column)
  for (const [tx, tz] of [[x0 + 2.6, 304], [x0 + 2.6, 318], [x1 - 2.6, 304], [x1 - 2.6, 318]]) {
    kit.cyl("paintedMetal", tx, F + 0.3, tz, 1.7, 0.6, "y", { color: IMP.black, segments: 24 });
    kit.cyl("plate", tx, F + 3.6, tz, 0.55, 6.6, "y", { color: IMP.plateDark, segments: 16, texel: 1 });
    for (let k = 0; k < 5; k++) {
      const y = F + 1.4 + k * 1.1;
      kit.add("paintedMetal", new THREE.TorusGeometry(1.15, 0.28, 8, 32), { pos: [tx, y, tz], rot: [Math.PI / 2, 0, 0], color: IMP.plateDark, uv: "scale", uvScale: [12, 2] });
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.05, 5, 32), ringMat);
      r.position.set(tx, y + 0.55, tz);
      r.rotation.x = Math.PI / 2;
      rings.add(r);
    }
    kit.cyl("paintedMetal", tx, F + 7.0, tz, 0.9, 0.5, "y", { color: IMP.black, segments: 24 });
    pipeRun(kit, { points: [[tx, F + 7.2, tz], [tx, C - 0.3, tz]], r: 0.2, color: IMP.steelDark, clamps: 2 });
    kit.collider([tx - 1.5, F, tz - 1.5], [tx + 1.5, F + 7.5, tz + 1.5], "coil");
    hazardBay(kit, [tx - 2.0, tz - 2.0], [tx + 2.0, tz + 2.0], F, { w: 0.2 });
  }

  // ---- control dais facing the motivators
  {
    const dz0 = 281,
      dz1 = 287,
      dx = 4.2;
    kit.boxMM("paintedMetal", [CX - dx - 0.1, F, dz0 - 0.1], [CX + dx + 0.1, F + 0.5, dz1 + 0.1], { color: IMP.black, texel: 1 });
    kit.boxMM("deckBlack", [CX - dx, F + 0.47, dz0], [CX + dx, F + 0.52, dz1], { color: IMP.plateLight, texel: 0.5 });
    kit.collider([CX - dx, F, dz0], [CX + dx, F + 0.52, dz1], "dais");
    strip(kit, [CX - dx + 0.3, F + 0.3, dz1 + 0.1], [CX + dx - 0.3, F + 0.34, dz1 + 0.12], "emitViolet");
    for (let i = 0; i < 4; i++) {
      const x = CX - 3.0 + i * 2.0;
      consoleStation(kit, { pos: [x, F + 0.52, dz1 - 0.6], yaw: Math.PI, w: 1.9, d: 0.85, screens: 2, accent: "emitViolet", seed: 60 + i, screenSet: [[14, 9], [9, 6], [14, 3], [6, 14]][i] });
      chair(kit, { pos: [x, F + 0.52, dz1 - 1.45], yaw: Math.PI });
    }
    railing(kit, { from: [CX - dx, dz1], to: [CX - 3.9, dz1], y: F + 0.52 });
    railing(kit, { from: [CX + 3.9, dz1], to: [CX + dx, dz1], y: F + 0.52 });
    railing(kit, { from: [CX + dx, dz0], to: [CX + dx, dz1], y: F + 0.52 });
    railing(kit, { from: [CX - dx, dz1], to: [CX - dx, dz0], y: F + 0.52 });
    railing(kit, { from: [CX - dx, dz0], to: [CX - 2.2, dz0], y: F + 0.52 });
    railing(kit, { from: [CX + 2.2, dz0], to: [CX + dx, dz0], y: F + 0.52 });
    stairs(kit, { pos: [CX, F, dz0 - 0.9], yaw: Math.PI, width: 4.0, rise: 0.5, stepH: 0.17, rails: false });
    // status pedestals at the back corners of the dais, angled toward the operators (centre line stays open)
    screenPanel(kit, { pos: [CX - 3.2, F + 0.52 + 1.0, dz0 + 0.8], yaw: -0.5, w: 1.8, h: 1.0, index: 14, accent: "emitViolet", stand: true, collide: true });
    screenPanel(kit, { pos: [CX + 3.2, F + 0.52 + 1.0, dz0 + 0.8], yaw: 0.5, w: 1.8, h: 1.0, index: 9, accent: "emitViolet", stand: true, collide: true });
  }

  // ---- cable trenches: spine from the dais to the last motivator, cross feeds under each motivator
  cableTrench(kit, [CX - 0.4, 287.2], [CX + 0.4, MOTORS[2] + 6], F, { cables: 4, colors: [IMP.black, IMP.violet, IMP.gunmetal, IMP.plateBlue] });
  for (const mz of MOTORS) cableTrench(kit, [CX - LEN / 2 - 3.2, mz - 0.3], [CX + LEN / 2 + 3.2, mz + 0.3], F, { cables: 3 });

  // ---- wall displays: hyperdrive plot + gauges near the dais, spec stencils along the walls
  screenPanel(kit, { pos: [x0 + 0.2, F + 1.3, 284], yaw: -Math.PI / 2, w: 4.5, h: 2.2, index: 14, accent: "emitViolet" });
  screenPanel(kit, { pos: [x1 - 0.2, F + 1.3, 284], yaw: Math.PI / 2, w: 4.5, h: 2.2, index: 9, accent: "emitViolet" });
  {
    const { frame } = ctx.wall("zmin");
    frameScreen(frame, wallU(ctx, "zmin", -63), 2.6, 3.6, 1.6, 9, { accent: "emitViolet" });
    frameScreen(frame, wallU(ctx, "zmin", -45), 2.6, 3.6, 1.6, 6, { accent: "emitViolet" });
    frame.decal(wallU(ctx, "zmin", -49.5), 4.6, 0.01, 1.2, 1.2, DECAL.EMBLEM);
    frame.decal(wallU(ctx, "zmin", -58.5), 4.6, 0.01, 1.2, 1.2, DECAL.WARNING);
  }

  // ---- coolant manifold wall (aft): header pipe, risers, valves, gauges, pump skids
  {
    const wz = z1 - 0.9;
    pipeRun(kit, { points: [[x0 + 1.5, F + 6.5, wz], [x1 - 1.5, F + 6.5, wz]], r: 0.45, color: IMP.steelDark, clamps: 4, clampColor: IMP.black });
    pipeRun(kit, { points: [[x0 + 1.5, F + 8.2, wz + 0.3], [x1 - 1.5, F + 8.2, wz + 0.3]], r: 0.3, color: IMP.plateBlue, clamps: 4 });
    for (let i = 0; i < 7; i++) {
      const x = x0 + 3.5 + i * 4.1;
      pipeRun(kit, { points: [[x, F + 0.4, wz], [x, F + 6.5, wz]], r: 0.22, color: i % 2 ? IMP.steel : IMP.gunmetal, clamps: 2.0 });
      valveStack(kit, { pos: [x, F, wz - 0.5], yaw: 0, n: 2, r: 0.12, h: 2.2, wheel: i % 3 === 0 ? IMP.red : IMP.hazardYellow });
      ledCluster(kit, { pos: [x + 0.9, F + 3.4, wz - 0.3], yaw: 0, w: 0.5, h: 0.22, index: (i * 3) % 16, accent: "emitViolet" });
    }
    machineBlock(kit, { pos: [x0 + 5.5, F, wz - 3.2], yaw: 0, size: [4.2, 2.6, 2.2], accent: "emitViolet", seed: 130, stencil: DECAL.TEXT_B });
    machineBlock(kit, { pos: [x1 - 5.5, F, wz - 3.2], yaw: 0, size: [4.2, 2.6, 2.2], accent: "emitViolet", seed: 131, stencil: DECAL.TEXT_B });
    pipeRun(kit, { points: [[x0 + 5.5, F + 2.6, wz - 3.2], [x0 + 5.5, F + 6.5, wz - 3.2], [x0 + 5.5, F + 6.5, wz]], r: 0.3, color: IMP.steelDark, clamps: 2 });
    pipeRun(kit, { points: [[x1 - 5.5, F + 2.6, wz - 3.2], [x1 - 5.5, F + 6.5, wz - 3.2], [x1 - 5.5, F + 6.5, wz]], r: 0.3, color: IMP.steelDark, clamps: 2 });
    hazardBay(kit, [x0 + 0.5, z1 - 5.0], [x1 - 0.5, z1 - 0.3], F, { w: 0.3, mat: "hazard" });
    kit.boxMM("hazard", [x0 + 0.5, F + 3.9, z1 - 0.26], [x1 - 0.5, F + 4.2, z1 - 0.24], { texel: 1 });
    floorDecal(kit, [CX, z1 - 7], F, 2.4, DECAL.RESTRICTED, 0);
  }

  // ---- structure: pilasters at the aisle corners, violet edge strips along the side walls
  pillar(kit, { pos: [x0 + 1.0, F, z0 + 1.0], h: ctx.h, w: 0.9 });
  pillar(kit, { pos: [x1 - 1.0, F, z0 + 1.0], h: ctx.h, w: 0.9 });
  strip(kit, [x0 + 0.05, F + 2.0, z0 + 3], [x0 + 0.09, F + 2.05, z1 - 3], "emitViolet");
  strip(kit, [x1 - 0.09, F + 2.0, z0 + 3], [x1 - 0.05, F + 2.05, z1 - 3], "emitViolet");

  // ---- lights: violet over each motivator, white work lights over the dais and aisles
  const violet = MOTORS.map((mz) => ctx.light(0xa596ff, 420, 36, [CX, C - 4.0, mz - 4.5]));
  const vBase = violet.map((l) => l.intensity);
  workLight(ctx, [CX, C, 279], { drop: 4.5, size: 1.6, intensity: 420, distance: 36 });
  workLight(ctx, [x0 + 3.5, C, 311], { drop: 4.0, size: 1.4, intensity: 320, distance: 32 });
  workLight(ctx, [x1 - 3.5, C, 311], { drop: 4.0, size: 1.4, intensity: 320, distance: 32 });
  workLight(ctx, [CX, C, 334], { drop: 4.5, size: 1.6, intensity: 360, distance: 34 });

  ctx.animate((dt, t) => {
    const p = 0.5 + 0.5 * Math.sin(t * 2.2);
    ringMat.emissiveIntensity = 1.5 + 1.1 * p;
    violet.forEach((l, i) => setLightLevel(l, vBase[i], 0.85 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.9))));
  });
}
