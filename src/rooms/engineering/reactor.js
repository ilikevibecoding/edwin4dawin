// Main Reactor Chamber — 64 × 64 × 40 m hall around the glowing core column: emissive core with pulsing
// translucent field shells, heavy bolted containment rings every 5 m, a sunken pit with railing, a grated
// catwalk ring at y 0 reached by two switchback stairs, gantries to all four walls with control pulpits and
// manifolds, massive coolant pipes with clamps and valve stacks, warning stencils, and the window + airlock
// passage toward Engineering Control on the forward wall. Lighting is sparse: the core dominates.
import * as THREE from "three";
import { consoleStation, railing, pipeRun, pillar } from "../../core/props.js";
import { SYSTEMS } from "../../core/systems.js";
import { windowWall, wallU, catwalk, column, beam, stairSwitchback, valveStack, hazardBay, floorDecal, strip, ledCluster, screenPanel, workLight, machineBlock, setLightLevel } from "./machinery.js";
import { WINDOW } from "./engineering.js";
import { DECAL } from "../../textures.js";

export const meta = { id: "reactor", stream: "deck-rooms" };

export function build(ctx) {
  const { kit, IMP } = ctx;
  const F = ctx.floor; // -10
  const C = ctx.ceil; // 30
  const { x0, x1, z0, z1 } = ctx.inner;
  const B = ctx.box;
  const CX = 0,
    CZ = 336; // core axis
  const PIT = { x0: -9, x1: 9, z0: CZ - 9, z1: CZ + 9, depth: 4 };
  const CW = { o: 12, i: 8, y: 0 }; // catwalk ring: outer / inner half-size, deck height

  // ---- shell (no floor; the forward wall carries the window and is built below). The layout currently
  // reports the airlock door on the far wall because the door plane (z 300) is 4 m from this room's box;
  // the far wall is built without openings and the true opening is added to the forward wall by hand.
  ctx.shell({
    skipFloor: true,
    walls: { zmin: false, zmax: { openings: [], panelW: 3.6, pilasterEvery: 12.7 }, xmin: { panelW: 3.6, pilasterEvery: 12.7 }, xmax: { panelW: 3.6, pilasterEvery: 12.7 } },
    ceiling: { panelW: 4.0 },
    stripSpacing: 16,
    seed: 55,
  });
  const fwd = windowWall(ctx, "zmin", [WINDOW], { extraDoors: [{ c0: -3, c1: 3, v1: 3.6 }], seed: 66, panelGridOpts: { panelW: 3.6, pilasterEvery: 12.7 } });
  {
    const f = fwd.frame;
    const u0 = wallU(ctx, "zmin", WINDOW.c0);
    const u1 = wallU(ctx, "zmin", WINDOW.c1);
    const d = fwd.openings.find((o) => o.type === "door");
    f.box("paintedMetal", (u0 + u1) / 2, WINDOW.v1 + 0.14, 0.06, u1 - u0 + 0.7, 0.28, 0.12, { color: IMP.black, texel: 1 });
    for (const [a, b] of [[u0, d.u0], [d.u1, u1]]) {
      f.box("paintedMetal", (a + b) / 2, WINDOW.v0 - 0.14, 0.06, b - a + 0.35, 0.28, 0.12, { color: IMP.black, texel: 1 });
      f.box("hazardRed", (a + b) / 2, WINDOW.v0 - 0.31, 0.06, b - a, 0.06, 0.13, { texel: 2 });
    }
    for (const u of [u0 - 0.14, u1 + 0.14]) f.box("paintedMetal", u, (WINDOW.v0 + WINDOW.v1) / 2, 0.06, 0.28, WINDOW.v1 - WINDOW.v0 + 0.55, 0.12, { color: IMP.black, texel: 1 });
    f.decal(d.u0 - 1.6, 2.4, 0.01, 1.2, 1.2, DECAL.WARNING);
    f.decal(d.u1 + 1.6, 2.4, 0.01, 1.2, 1.2, DECAL.RESTRICTED);
    f.decal(u1 + 4, 6.5, 0.01, 2.4, 2.4, DECAL.EMBLEM);
  }

  // ---- airlock passage lining between the two rooms (z 300.3 .. 304.3), the door slab sits at z 300
  {
    const pz0 = 300.3,
      pz1 = B.z0 + 0.3;
    kit.boxMM("deckGrey", [-3.6, F - 0.3, pz0], [3.6, F, pz1], { color: IMP.plateDark, texel: 0.5 });
    kit.collider([-3.6, F - 0.6, pz0 - 0.2], [3.6, F, pz1], "floor");
    for (const s of [-1, 1]) {
      kit.boxMM("plate", [s > 0 ? 3.0 : -3.6, F, pz0], [s > 0 ? 3.6 : -3.0, F + 3.6, pz1], { color: IMP.plateDark, texel: 1 });
      kit.boxMM("paintedMetal", [s > 0 ? 2.96 : -3.05, F + 1.6, pz0 + 0.2], [s > 0 ? 3.05 : -2.96, F + 1.85, pz1 - 0.2], { color: IMP.black, texel: 1 });
      kit.boxMM("emitWhiteSoft", [s > 0 ? 2.95 : -2.97, F + 1.64, pz0 + 0.3], [s > 0 ? 2.97 : -2.95, F + 1.81, pz1 - 0.3], { uv: "keep" });
      kit.collider([s > 0 ? 3.0 : -3.6, F, pz0], [s > 0 ? 3.6 : -3.0, F + 3.6, pz1], "airlock");
      kit.boxMM("paintedMetal", [s > 0 ? 2.9 : -3.0, F, pz0], [s > 0 ? 3.0 : -2.9, F + 0.35, pz1], { color: IMP.black, texel: 1 });
    }
    kit.boxMM("paintedMetal", [-3.6, F + 3.6, pz0], [3.6, F + 4.0, pz1], { color: IMP.black, texel: 1 });
    kit.boxMM("emitWhiteSoft", [-0.2, F + 3.58, pz0 + 0.4], [0.2, F + 3.6, pz1 - 0.4], { uv: "keep" });
    kit.boxMM("hazardRed", [-2.9, F + 0.004, pz1 - 0.6], [2.9, F + 0.012, pz1 - 0.1], { texel: 2 });
    kit.boxMM("hazard", [-2.9, F + 0.004, pz0 + 0.1], [2.9, F + 0.012, pz0 + 0.6], { texel: 2 });
  }

  // ---- floor slabs around the pit + pit walls / floor + core pedestal
  const P = PIT;
  for (const [a, b, c, d] of [
    [B.x0, B.z0, B.x1, P.z0],
    [B.x0, P.z1, B.x1, B.z1],
    [B.x0, P.z0, P.x0, P.z1],
    [P.x1, P.z0, B.x1, P.z1],
  ]) {
    kit.boxMM("deckGrey", [a, F - 0.4, b], [c, F, d], { color: IMP.plateDark, texel: 0.5 });
    kit.collider([a, F - 0.6, b], [c, F, d], "floor");
  }
  const PF = F - P.depth;
  kit.boxMM("paintedMetal", [P.x0 - 0.5, PF - 0.3, P.z0 - 0.5], [P.x1 + 0.5, PF, P.z1 + 0.5], { color: IMP.black, texel: 1 });
  kit.collider([P.x0, PF - 0.6, P.z0], [P.x1, PF, P.z1], "pitfloor");
  // pit walls (faces toward the core) with a light band
  kit.boxMM("plate", [P.x0 - 0.5, PF, P.z0 - 0.5], [P.x0, F, P.z1 + 0.5], { color: IMP.plateDark, texel: 1 });
  kit.boxMM("plate", [P.x1, PF, P.z0 - 0.5], [P.x1 + 0.5, F, P.z1 + 0.5], { color: IMP.plateDark, texel: 1 });
  kit.boxMM("plate", [P.x0, PF, P.z0 - 0.5], [P.x1, F, P.z0], { color: IMP.plateDark, texel: 1 });
  kit.boxMM("plate", [P.x0, PF, P.z1], [P.x1, F, P.z1 + 0.5], { color: IMP.plateDark, texel: 1 });
  strip(kit, [P.x0 + 0.01, PF + 1.4, P.z0 + 0.3], [P.x0 + 0.03, PF + 1.5, P.z1 - 0.3], "emitCyan");
  strip(kit, [P.x1 - 0.03, PF + 1.4, P.z0 + 0.3], [P.x1 - 0.01, PF + 1.5, P.z1 - 0.3], "emitCyan");
  strip(kit, [P.x0 + 0.3, PF + 1.4, P.z0 + 0.01], [P.x1 - 0.3, PF + 1.5, P.z0 + 0.03], "emitCyan");
  strip(kit, [P.x0 + 0.3, PF + 1.4, P.z1 - 0.03], [P.x1 - 0.3, PF + 1.5, P.z1 - 0.01], "emitCyan");
  // rim: hazard band, raised lip, railing 1.2 m back, RESTRICTED / HIGH ENERGY stencils on the deck
  hazardBay(kit, [P.x0 - 1.2, P.z0 - 1.2], [P.x1 + 1.2, P.z1 + 1.2], F, { w: 1.2, mat: "hazardRed" });
  kit.boxMM("paintedMetal", [P.x0 - 0.3, F - 0.1, P.z0 - 0.3], [P.x1 + 0.3, F + 0.15, P.z0], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [P.x0 - 0.3, F - 0.1, P.z1], [P.x1 + 0.3, F + 0.15, P.z1 + 0.3], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [P.x0 - 0.3, F - 0.1, P.z0], [P.x0, F + 0.15, P.z1], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [P.x1, F - 0.1, P.z0], [P.x1 + 0.3, F + 0.15, P.z1], { color: IMP.black, texel: 1 });
  const rr = 1.8;
  railing(kit, { from: [P.x0 - rr, P.z0 - rr], to: [P.x1 + rr, P.z0 - rr], y: F });
  railing(kit, { from: [P.x1 + rr, P.z1 + rr], to: [P.x0 - rr, P.z1 + rr], y: F });
  railing(kit, { from: [P.x0 - rr, P.z1 + rr], to: [P.x0 - rr, P.z0 - rr], y: F });
  railing(kit, { from: [P.x1 + rr, P.z0 - rr], to: [P.x1 + rr, P.z1 + rr], y: F });
  kit.collider([P.x0 - rr - 0.1, F - 0.6, P.z0 - rr - 0.1], [P.x1 + rr + 0.1, F + 1.2, P.z1 + rr + 0.1], "pit");
  floorDecal(kit, [CX, P.z0 - rr - 1.6], F, 2.4, DECAL.WARNING, 0);
  floorDecal(kit, [CX, P.z1 + rr + 1.6], F, 2.4, DECAL.WARNING, Math.PI);
  floorDecal(kit, [P.x0 - rr - 1.6, CZ], F, 2.4, DECAL.WARNING, Math.PI / 2);
  floorDecal(kit, [P.x1 + rr + 1.6, CZ], F, 2.4, DECAL.WARNING, -Math.PI / 2);
  // core pedestal + glow ring at the pit floor
  kit.cyl("paintedMetal", CX, PF + 0.5, CZ, 5.2, 1.0, "y", { color: IMP.black, segments: 48 });
  kit.cyl("plate", CX, PF + 1.3, CZ, 4.6, 0.6, "y", { color: IMP.plateDark, segments: 48 });
  kit.add("emitCyan", new THREE.TorusGeometry(4.9, 0.12, 8, 64), { pos: [CX, PF + 1.02, CZ], rot: [Math.PI / 2, 0, 0], uv: "keep" });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    kit.box("paintedMetal", CX + Math.cos(a) * 6.2, PF + 0.4, CZ + Math.sin(a) * 6.2, 1.6, 0.8, 0.8, { color: IMP.plateDark, rot: [0, -a, 0], texel: 1 });
    pipeRun(kit, { points: [[CX + Math.cos(a) * 7.0, PF + 0.4, CZ + Math.sin(a) * 7.0], [CX + Math.cos(a) * 8.6, PF + 0.4, CZ + Math.sin(a) * 8.6], [CX + Math.cos(a) * 8.6, F - 0.2, CZ + Math.sin(a) * 8.6]], r: 0.16, color: IMP.steelDark, clamps: 1.5 });
  }

  // ---- the core: emissive column with dark sleeve bands; field shells (own additive material) pulse
  const coreBottom = PF + 1.6;
  const coreTop = C;
  const shellGroup = new THREE.Group();
  // core column: own emissive material (the shared emitCyan family is too hot at this size)
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x06141a, emissive: new THREE.Color(0x5ad8ff), emissiveIntensity: 1.35, roughness: 0.5, metalness: 0 });
  const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, coreTop - coreBottom, 48, 1, false), coreMat);
  coreMesh.position.set(CX, (coreBottom + coreTop) / 2, CZ);
  shellGroup.add(coreMesh);
  // hot filament down the axis, seen through the sleeve gaps
  for (let y = coreBottom + 2.5; y < coreTop - 1; y += 5) kit.cyl("paintedMetal", CX, y, CZ, 3.55, 0.5, "y", { color: IMP.black, segments: 48 });
  for (let y = coreBottom + 5; y < coreTop - 1; y += 5) kit.add("emitWhite", new THREE.TorusGeometry(3.5, 0.05, 6, 48), { pos: [CX, y, CZ], rot: [Math.PI / 2, 0, 0], uv: "keep" });
  const shells = [];
  const shellSpecs = [
    { r: 4.2, opacity: 0.13, color: 0x7fe6ff, seg: 48 },
    { r: 5.0, opacity: 0.07, color: 0xa8f0ff, seg: 64 },
    { r: 5.7, opacity: 0.045, color: 0xffffff, seg: 64 },
  ];
  for (const s of shellSpecs) {
    const g = new THREE.CylinderGeometry(s.r, s.r, coreTop - coreBottom - 1.2, s.seg, 1, true);
    const m = new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: s.opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide, fog: false });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(CX, (coreBottom + coreTop) / 2, CZ);
    shellGroup.add(mesh);
    shells.push({ mesh, m, base: s.opacity });
  }
  ctx.add(shellGroup);

  // ---- containment rings every 5 m: dark torus, bolt ring (instanced), cyan slot ring
  kit.proto("bolt", "metal", new THREE.CylinderGeometry(0.16, 0.16, 0.3, 8).rotateZ(Math.PI / 2), { texel: 2 });
  for (let y = F + 2; y < C - 1; y += 5) {
    kit.add("paintedMetal", new THREE.TorusGeometry(6.0, 0.55, 10, 48), { pos: [CX, y, CZ], rot: [Math.PI / 2, 0, 0], color: IMP.plateDark, uv: "scale", uvScale: [30, 3] });
    kit.add("paintedMetal", new THREE.TorusGeometry(6.0, 0.62, 6, 16), { pos: [CX, y, CZ], rot: [Math.PI / 2, 0, 0], color: IMP.black, uv: "scale", uvScale: [16, 2] });
    kit.add("emitCyan", new THREE.TorusGeometry(6.55, 0.05, 6, 48), { pos: [CX, y + 0.3, CZ], rot: [Math.PI / 2, 0, 0], uv: "keep" });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + (y % 10 === 2 ? 0 : Math.PI / 16);
      kit.place("bolt", { pos: [CX + Math.cos(a) * 6.6, y, CZ + Math.sin(a) * 6.6], rot: [0, -a, 0], color: IMP.steel });
    }
  }

  // ---- catwalk ring at y 0 (grated, railed inside and out; gaps where gantries and stairs connect)
  const y0 = CW.y;
  const o = CW.o,
    i = CW.i;
  catwalk(kit, [CX - o, CZ - o], [CX + o, CZ - i], y0, { rails: ["zmax", "zmin"], gaps: [{ side: "zmin", from: CX - 1.6, to: CX + 1.6 }] }); // N
  catwalk(kit, [CX - o, CZ + i], [CX + o, CZ + o], y0, { rails: ["zmin", "zmax"], gaps: [{ side: "zmax", from: CX - 1.6, to: CX + 1.6 }] }); // S
  // the W / E decks' outer rails open at z CZ+5.6..CZ+8 where the stair bridges join
  catwalk(kit, [CX - o, CZ - i], [CX - i, CZ + i], y0, { rails: ["xmin", "xmax"], gaps: [{ side: "xmin", from: CZ - 1.6, to: CZ + 1.6 }, { side: "xmin", from: CZ + 5.6, to: CZ + 8 }] }); // W
  catwalk(kit, [CX + i, CZ - i], [CX + o, CZ + i], y0, { rails: ["xmin", "xmax"], gaps: [{ side: "xmax", from: CZ - 1.6, to: CZ + 1.6 }, { side: "xmax", from: CZ + 5.6, to: CZ + 8 }] }); // E
  // outer-edge rails of the corner squares (the N/S decks already span the full width)
  railing(kit, { from: [CX - o + 0.1, CZ - i], to: [CX - o + 0.1, CZ - o + 0.1], y: y0 });
  railing(kit, { from: [CX - o + 0.1, CZ + o - 0.1], to: [CX - o + 0.1, CZ + i], y: y0 });
  railing(kit, { from: [CX + o - 0.1, CZ - o + 0.1], to: [CX + o - 0.1, CZ - i], y: y0 });
  railing(kit, { from: [CX + o - 0.1, CZ + i], to: [CX + o - 0.1, CZ + o - 0.1], y: y0 });
  // hazard edge along the inner rim + support columns
  for (const [a, b, c, d] of [[CX - i, CZ - i - 0.3, CX + i, CZ - i], [CX - i, CZ + i, CX + i, CZ + i + 0.3], [CX - i - 0.3, CZ - i, CX - i, CZ + i], [CX + i, CZ - i, CX + i + 0.3, CZ + i]]) kit.boxMM("hazard", [a, y0 - 0.3, b], [c, y0 + 0.02, d], { texel: 1 });
  for (const [px, pz] of [[-o, -o], [o, -o], [-o, o], [o, o], [-i, -o], [i, -o], [-i, o], [i, o], [-o, -i], [-o, i], [o, -i], [o, i]]) column(kit, CX + px + (px < 0 ? 0.35 : -0.35), CZ + pz + (pz < 0 ? 0.35 : -0.35), F, y0 - 0.28, 0.6, { hazard: true });
  // cross braces under the ring
  for (const s of [-1, 1]) {
    beam(kit, [CX + s * (o - 0.35), F + 4, CZ - o + 0.35], [CX + s * (i + 0.35), y0 - 0.5, CZ - o + 0.35], 0.25);
    beam(kit, [CX + s * (o - 0.35), F + 4, CZ + o - 0.35], [CX + s * (i + 0.35), y0 - 0.5, CZ + o - 0.35], 0.25);
  }

  // ---- control pulpits on the catwalk (facing the core) with cyan status clusters
  consoleStation(kit, { pos: [CX, y0, CZ - i - 0.9], yaw: Math.PI, w: 2.2, d: 0.8, accent: "emitCyan", seed: 501, screenSet: [9, 6] });
  consoleStation(kit, { pos: [CX, y0, CZ + i + 0.9], yaw: 0, w: 2.2, d: 0.8, accent: "emitCyan", seed: 502, screenSet: [2, 9] });
  consoleStation(kit, { pos: [CX - i - 0.9, y0, CZ], yaw: -Math.PI / 2, w: 2.2, d: 0.8, accent: "emitCyan", seed: 503, screenSet: [6, 3] });
  consoleStation(kit, { pos: [CX + i + 0.9, y0, CZ], yaw: Math.PI / 2, w: 2.2, d: 0.8, accent: "emitCyan", seed: 504, screenSet: [3, 9] });

  // ---- gantries from the ring to the four walls (grated bridges on columns) + wall platforms
  const gw = 1.6; // half width
  catwalk(kit, [CX - gw, z0 + 3.0], [CX + gw, CZ - o], y0, { rails: ["xmin", "xmax"] });
  catwalk(kit, [CX - gw, CZ + o], [CX + gw, z1 - 3.0], y0, { rails: ["xmin", "xmax"] });
  catwalk(kit, [x0 + 3.0, CZ - gw], [CX - o, CZ + gw], y0, { rails: ["zmin", "zmax"] });
  catwalk(kit, [CX + o, CZ - gw], [x1 - 3.0, CZ + gw], y0, { rails: ["zmin", "zmax"] });
  for (const t of [0.36, 0.7]) {
    // the forward gantry's columns stand further in so they do not crowd the airlock spawn view
    const zN = z0 + 3 + (CZ - o - z0 - 3) * (t + 0.16);
    const zS = CZ + o + (z1 - 3 - CZ - o) * t;
    const xW = x0 + 3 + (CX - o - x0 - 3) * t;
    const xE = CX + o + (x1 - 3 - CX - o) * t;
    for (const s of [-1, 1]) {
      column(kit, CX + s * (gw - 0.25), zN, F, y0 - 0.28, 0.4);
      column(kit, CX + s * (gw - 0.25), zS, F, y0 - 0.28, 0.4);
      column(kit, xW, CZ + s * (gw - 0.25), F, y0 - 0.28, 0.4);
      column(kit, xE, CZ + s * (gw - 0.25), F, y0 - 0.28, 0.4);
    }
  }
  // wall platforms: forward (overlook above the window), aft (manifold), port / starboard (valve galleries)
  catwalk(kit, [CX - 5, z0], [CX + 5, z0 + 3.0], y0, { rails: ["zmax", "xmin", "xmax"], gaps: [{ side: "zmax", from: CX - gw, to: CX + gw }] });
  catwalk(kit, [CX - 5, z1 - 3.0], [CX + 5, z1], y0, { rails: ["zmin", "xmin", "xmax"], gaps: [{ side: "zmin", from: CX - gw, to: CX + gw }] });
  catwalk(kit, [x0, CZ - 5], [x0 + 3.0, CZ + 5], y0, { rails: ["xmax", "zmin", "zmax"], gaps: [{ side: "xmax", from: CZ - gw, to: CZ + gw }] });
  catwalk(kit, [x1 - 3.0, CZ - 5], [x1, CZ + 5], y0, { rails: ["xmin", "zmin", "zmax"], gaps: [{ side: "xmin", from: CZ - gw, to: CZ + gw }] });
  for (const [px, pz] of [[CX - 4.7, z0 + 2.7], [CX + 4.7, z0 + 2.7], [CX - 4.7, z1 - 2.7], [CX + 4.7, z1 - 2.7], [x0 + 2.7, CZ - 4.7], [x0 + 2.7, CZ + 4.7], [x1 - 2.7, CZ - 4.7], [x1 - 2.7, CZ + 4.7]]) column(kit, px, pz, F, y0 - 0.28, 0.5);
  consoleStation(kit, { pos: [CX - 2.6, y0, z0 + 2.2], yaw: Math.PI, w: 1.8, accent: "emitCyan", seed: 511, screenSet: [1, 9] });
  consoleStation(kit, { pos: [CX + 2.6, y0, z0 + 2.2], yaw: Math.PI, w: 1.8, accent: "emitCyan", seed: 512, screenSet: [6, 2] });
  screenPanel(kit, { pos: [CX, y0 + 0.6, z0 + 0.25], yaw: 0, w: 6, h: 2.2, index: 6, accent: "emitCyan" });
  screenPanel(kit, { pos: [CX, y0 + 0.6, z1 - 0.25], yaw: Math.PI, w: 6, h: 2.2, index: 9, accent: "emitCyan" });
  machineBlock(kit, { pos: [CX - 3.2, y0, z1 - 1.3], yaw: Math.PI, size: [2.6, 2.2, 1.4], accent: "emitCyan", seed: 91, stencil: DECAL.TEXT_B });
  machineBlock(kit, { pos: [CX + 3.2, y0, z1 - 1.3], yaw: Math.PI, size: [2.6, 2.2, 1.4], accent: "emitCyan", seed: 92, stencil: DECAL.TEXT_B });
  for (const s of [-1, 1]) {
    valveStack(kit, { pos: [x0 + 1.3, y0, CZ + s * 3.4], yaw: -Math.PI / 2, n: 3, r: 0.14 });
    valveStack(kit, { pos: [x1 - 1.3, y0, CZ + s * 3.4], yaw: Math.PI / 2, n: 3, r: 0.14 });
    ledCluster(kit, { pos: [x0 + 0.3, y0 + 1.6, CZ + s * 1.2], yaw: -Math.PI / 2, w: 0.7, h: 0.3, index: 6 + s, accent: "emitCyan" });
    ledCluster(kit, { pos: [x1 - 0.3, y0 + 1.6, CZ + s * 1.2], yaw: Math.PI / 2, w: 0.7, h: 0.3, index: 9 + s, accent: "emitCyan" });
  }

  // ---- switchback stairs from the floor to the ring: both flights 1 run aft (+z) from z CZ+i beside the
  // ring, the landings sit at z CZ+i+7.5..+10.1 and flights 2 (on the inner side, x ±17) return to short
  // bridges at z CZ+5.6..CZ+8 that join the W / E decks (mirror-symmetric, clear of the side gantries)
  const sw = stairSwitchback(kit, { pos: [-14.5, F, CZ + i], yaw: Math.PI, rise: y0 - F, width: 2.2 });
  const se = stairSwitchback(kit, { pos: [19.5, F, CZ + i], yaw: Math.PI, rise: y0 - F, width: 2.2 });
  catwalk(kit, [sw.top.x - 1.15, CZ + i - 2.4], [CX - o, CZ + i], y0, { rails: ["zmin", "xmin"], gaps: [] });
  railing(kit, { from: [sw.top.x + 1.1, CZ + i - 0.1], to: [CX - o, CZ + i - 0.1], y: y0 });
  catwalk(kit, [CX + o, CZ + i - 2.4], [se.top.x + 1.15, CZ + i], y0, { rails: ["zmin", "xmax"], gaps: [] });
  railing(kit, { from: [CX + o, CZ + i - 0.1], to: [se.top.x - 1.1, CZ + i - 0.1], y: y0 });
  hazardBay(kit, [-18.6, CZ + i - 0.4], [-12.9, CZ + i + 10.6], F, { w: 0.25 });
  hazardBay(kit, [15.4, CZ + i - 0.4], [21.1, CZ + i + 10.6], F, { w: 0.25 });

  // ---- massive coolant pipes: side risers to the y 12 ring, aft feeds to the y 22 ring, ceiling drops
  for (const s of [-1, 1]) {
    const wx = s > 0 ? x1 - 1.3 : x0 + 1.3;
    pipeRun(kit, { points: [[wx, F + 0.6, CZ], [wx, 12, CZ], [CX + s * 7.1, 12, CZ]], r: 1.0, color: IMP.steelDark, clamps: 6, clampColor: IMP.black });
    pipeRun(kit, { points: [[wx + s * 0.2, F + 0.6, CZ + 4.5], [wx + s * 0.2, 6.5, CZ + 4.5], [wx + s * 0.2, 6.5, CZ + 1.4]], r: 0.5, color: IMP.plateBlue, clamps: 4 });
    pipeRun(kit, { points: [[wx + s * 0.2, F + 0.6, CZ - 4.5], [wx + s * 0.2, 6.5, CZ - 4.5], [wx + s * 0.2, 6.5, CZ - 1.4]], r: 0.5, color: IMP.plateBlue, clamps: 4 });
    // riser base: pump skid + valves on the floor
    machineBlock(kit, { pos: [wx - s * 2.4, F, CZ], yaw: s > 0 ? -Math.PI / 2 : Math.PI / 2, size: [3.6, 2.6, 2.2], accent: "emitCyan", seed: 120 + s, stencil: DECAL.WARNING });
    valveStack(kit, { pos: [wx - s * 1.2, F, CZ + 6.2], yaw: s > 0 ? Math.PI / 2 : -Math.PI / 2, n: 4, r: 0.16, h: 3.0 });
    valveStack(kit, { pos: [wx - s * 1.2, F, CZ - 6.2], yaw: s > 0 ? Math.PI / 2 : -Math.PI / 2, n: 4, r: 0.16, h: 3.0 });
    // aft feeds
    pipeRun(kit, { points: [[CX + s * 10, 20, z1 - 0.3], [CX + s * 10, 20, CZ + 8.5], [CX + s * 4.9, 20, CZ + 4.9]], r: 0.7, color: IMP.steelDark, clamps: 6, clampColor: IMP.black });
    pipeRun(kit, { points: [[CX + s * 10, F + 0.5, z1 - 1.0], [CX + s * 10, 20, z1 - 1.0], [CX + s * 10, 20, z1 - 0.3]], r: 0.7, color: IMP.steelDark, clamps: 6, clampColor: IMP.black });
    // ceiling drops onto the top ring
    for (const a of [0.9 * s, 2.25 * s, 3.9 * s]) pipeRun(kit, { points: [[CX + Math.cos(a) * 6.6, C, CZ + Math.sin(a) * 6.6], [CX + Math.cos(a) * 6.6, C - 3.5, CZ + Math.sin(a) * 6.6]], r: 0.45, color: IMP.gunmetal, clamps: 2 });
  }
  // thin service conduits along the forward wall base
  pipeRun(kit, { points: [[x0 + 0.5, F + 2.3, z0 + 0.4], [-9.5, F + 2.3, z0 + 0.4], [-9.5, F + 5.2, z0 + 0.4]], r: 0.12, color: IMP.steel, clamps: 3 });
  pipeRun(kit, { points: [[x1 - 0.5, F + 2.3, z0 + 0.4], [9.5, F + 2.3, z0 + 0.4], [9.5, F + 5.2, z0 + 0.4]], r: 0.12, color: IMP.steel, clamps: 3 });

  // ---- floor stencils and lane markings toward the stairs
  floorDecal(kit, [CX, z0 + 6], F, 3.0, DECAL.RESTRICTED, 0);
  floorDecal(kit, [-14.5, CZ + i - 3.5], F, 2.0, DECAL.ARROW, Math.PI); // toward the west stair foot (z CZ+i, flight runs +z)
  floorDecal(kit, [19.5, CZ + i - 3.5], F, 2.0, DECAL.ARROW, Math.PI); // toward the east stair foot
  pillar(kit, { pos: [x0 + 1.2, F, z0 + 1.2], h: 12, w: 1.0 });
  pillar(kit, { pos: [x1 - 1.2, F, z0 + 1.2], h: 12, w: 1.0 });

  // ---- lights (≤ 6): three cyan-white sources along the core axis, two work lights, one at the airlock
  const coreLights = [ctx.light(0x8fe8ff, 900, 80, [CX, F + 4, CZ]), ctx.light(0xa4ecff, 1100, 95, [CX, 10, CZ]), ctx.light(0x8fe8ff, 900, 90, [CX, 23, CZ])];
  const coreBase = coreLights.map((l) => l.intensity);
  workLight(ctx, [CX, C, z0 + 4.5], { drop: 20, size: 1.6, intensity: 650, distance: 50 });
  workLight(ctx, [CX, C, z1 - 4.5], { drop: 20, size: 1.6, intensity: 650, distance: 50 });
  ctx.light(0xe8f0ff, 90, 20, [CX, F + 4.6, z0 + 3]);

  ctx.animate((dt, t) => {
    const p = 0.5 + 0.5 * Math.sin(t * 1.4);
    const p2 = 0.5 + 0.5 * Math.sin(t * 0.9 + 1.7);
    shells[0].m.opacity = shells[0].base * (0.75 + 0.5 * p);
    shells[1].m.opacity = shells[1].base * (0.7 + 0.6 * p2);
    shells[2].m.opacity = shells[2].base * (0.8 + 0.4 * p);
    shells[1].mesh.rotation.y += dt * 0.15;
    shells[2].mesh.rotation.y -= dt * 0.08;
    shells[0].mesh.scale.set(1 + 0.03 * p, 1, 1 + 0.03 * p);
    const k = 0.88 + 0.12 * p;
    coreLights.forEach((l, n) => setLightLevel(l, coreBase[n], k));
  });

  if (SYSTEMS.doors) SYSTEMS.doors.setForceOpen("eng_ctrl_reactor", true);
}
