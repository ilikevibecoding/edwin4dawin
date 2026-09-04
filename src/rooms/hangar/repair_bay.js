// Ship-wide Maintenance & Repair Bay — the general workshop off the hangar's aft-starboard arch. A stripped
// repulsor engine sits on stands under the ceiling crane; benches with tools line the forward wall, droid
// charging alcoves the outer wall, parts shelving the aft wall; a welding cell flickers by the drum store and
// a caged parts elevator climbs the corner.
import * as THREE from "three";
import { rng } from "../../core/kit.js";
import { Placer, barrel, cableBundle, pipeRun, pillar } from "../../core/props.js";
import { hazardBay, floorDecal, floorLine, strip, workLight, screenPanel, frameScreen, placeCrate, gantryCrane, machineBlock, valveStack, louvreVent, workbench, toolRack, shelving, terminalKiosk, droidAlcove, doorThroat, fixDoorSides, wallU, setLightLevel } from "../engineering/machinery.js";
import { DECAL, ledRect } from "../../textures.js";

export const meta = { id: "repair_bay", stream: "deck-rooms" };

/** Disassembled repulsor engine: main casing on A-frame stands, nose cone slid off, rings and coils on the deck. */
function repulsorEngine(ctx, cx, cz) {
  const { kit, IMP } = ctx;
  const F = ctx.floor;
  const R = 1.5;
  const AX = F + 2.3;
  const P = new Placer(kit, [cx, F, cz], 0);
  // stands (A-frames) with rubber saddles
  for (const dx of [-2.2, 2.2]) {
    for (const s of [-1, 1]) P.box("paintedMetal", dx, 1.0, s * 1.1, 0.3, 2.1, 0.3, { color: IMP.hazardYellow, rot: [s * 0.5, 0, 0], texel: 1 });
    P.box("paintedMetal", dx, 0.1, 0, 0.6, 0.2, 3.0, { color: IMP.black, texel: 1 });
    P.box("rubber", dx, 1.95, 0, 0.5, 0.2, 1.6, { color: IMP.black });
    P.box("paintedMetal", dx, 1.5, 0, 0.5, 0.16, 2.2, { color: IMP.black, texel: 1 });
  }
  // main casing: plated cylinder with an open front showing the core, rib rings, one side panel removed
  kit.cyl("plate", cx - 0.5, AX, cz, R, 5.0, "x", { color: IMP.plateDark, segments: 32, texel: 0.6, open: true });
  kit.cyl("metal", cx - 0.5, AX, cz, R * 0.55, 5.2, "x", { color: IMP.gunmetal, segments: 20 });
  for (let i = 0; i < 6; i++) kit.add("metal", new THREE.TorusGeometry(R * 0.75, 0.08, 6, 24), { pos: [cx - 2.6 + i * 0.85, AX, cz], rot: [0, Math.PI / 2, 0], color: IMP.steel, uv: "scale", uvScale: [8, 1] });
  for (const dx of [-2.5, -1.2, 0.4, 1.6]) kit.cyl("paintedMetal", cx + dx, AX, cz, R + 0.06, 0.3, "x", { color: IMP.black, segments: 32 });
  kit.cyl("paintedMetal", cx - 3.05, AX, cz, R + 0.12, 0.2, "x", { color: IMP.black, segments: 32 });
  // rear bell
  kit.cyl("plate", cx - 3.5, AX, cz, R * 0.8, 0.8, "x", { color: IMP.plateBlue, segments: 32, r2: R + 0.1, texel: 0.6 });
  // nose cone slid off on the +X side, sitting on a cradle
  kit.cyl("plate", cx + 4.4, AX - 0.1, cz, R, 1.8, "x", { color: IMP.plateDark, segments: 32, r2: R * 0.35, texel: 0.6 });
  kit.cyl("paintedMetal", cx + 3.55, AX - 0.1, cz, R + 0.08, 0.16, "x", { color: IMP.black, segments: 32 });
  P.box("paintedMetal", 4.4, 0.35, 0, 1.4, 0.7, 2.4, { color: IMP.black, texel: 1 });
  P.box("rubber", 4.4, 0.75, 0, 1.2, 0.12, 1.4, { color: IMP.black });
  // removed rings and coil packs on the floor + a coil hanging on a strap
  for (let i = 0; i < 3; i++) kit.add("metal", new THREE.TorusGeometry(R * 0.75, 0.08, 6, 24), { pos: [cx - 1.5 + i * 0.4, F + 0.09, cz + 3.0], rot: [Math.PI / 2, 0, 0], color: IMP.steel, uv: "scale", uvScale: [8, 1] });
  kit.cyl("paintedMetal", cx + 1.6, F + 0.35, cz + 3.0, 0.6, 0.7, "y", { color: IMP.plateBlue, segments: 18 });
  kit.add("metal", new THREE.TorusGeometry(0.52, 0.12, 8, 20), { pos: [cx + 1.6, F + 0.75, cz + 3.0], rot: [Math.PI / 2, 0, 0], color: IMP.gunmetal, uv: "scale", uvScale: [6, 1] });
  kit.collider([cx + 1.0, F, cz + 2.4], [cx + 2.2, F + 0.9, cz + 3.6], "coil");
  kit.collider([cx - 2.4, F, cz + 2.6], [cx - 0.2, F + 0.2, cz + 3.4], "rings");
  // access panel leaning on a stand, cables from the casing to a diagnostics cart
  P.box("plate", 3.2, 0.9, -2.6, 1.6, 1.8, 0.08, { color: IMP.plateDark, rot: [0.25, 0, 0], uv: "world", texel: 1 });
  cableBundle(kit, { from: [cx - 0.5, AX + R * 0.5, cz - R], to: [cx - 0.5, F + 0.9, cz - 3.4], sag: 0.5, n: 3, r: 0.025 });
  machineBlock(kit, { pos: [cx - 0.5, F, cz - 3.9], yaw: Math.PI, size: [1.4, 1.1, 0.9], accent: "emitCyan", seed: 8, hazard: false, vents: false });
  // colliders for the casing, stands and cone
  kit.collider([cx - 3.9, F, cz - R - 0.2], [cx + 2.0, AX + R, cz + R + 0.2], "engine");
  kit.collider([cx + 3.5, F, cz - 1.3], [cx + 5.4, AX + R, cz + 1.3], "cone");
  kit.collider([cx + 2.4, F, cz - 3.0], [cx + 4.0, F + 1.8, cz - 2.4], "panel");
  hazardBay(kit, [cx - 5.0, cz - 4.8], [cx + 6.4, cz + 4.4], F, { w: 0.3, decal: DECAL.RESTRICTED, decalSize: 1.6, decalAt: [cx - 4.0, cz - 3.9] });
  floorDecal(kit, [cx + 5.4, cz + 3.6], F, 1.4, DECAL.NUMBER2, 0);
}

/** Welding cell: bench, screens, gas bottles, torch arm with a flickering arc point. Returns the arc mesh. */
function weldingCell(ctx, cx, cz, yaw) {
  const { kit, IMP } = ctx;
  const F = ctx.floor;
  const P = new Placer(kit, [cx, F, cz], yaw);
  workbench(kit, { pos: [cx, F, cz], yaw, w: 2.8, d: 1.0, seed: 33, accent: "emitCyan", lamp: false });
  // dark welding screens on three sides
  for (const [lx, lz, ly, w] of [[0, 1.1, 0, 3.4], [-1.9, 0.1, Math.PI / 2, 2.2], [1.9, 0.1, Math.PI / 2, 2.2]]) {
    P.box("paintedMetal", lx, 1.1, lz, w, 2.2, 0.06, { color: IMP.gloss, rot: [0, ly, 0], texel: 1 });
    P.box("paintedMetal", lx, 2.22, lz, w, 0.06, 0.1, { color: IMP.black, rot: [0, ly, 0] });
  }
  P.collider([-2.0, 0, 1.0], [2.0, 2.3, 1.2], "screen");
  P.collider([-2.0, 0, -1.0], [-1.8, 2.3, 1.2], "screen");
  P.collider([1.8, 0, -1.0], [2.0, 2.3, 1.2], "screen");
  // gas bottles in a rack
  for (let i = 0; i < 3; i++) {
    P.cyl("plate", -1.4 + i * 0.4, 0.75, 0.75, 0.16, 1.5, "y", { color: i === 1 ? IMP.plateBlue : IMP.plateWarm, segments: 12 });
    P.cyl("metal", -1.4 + i * 0.4, 1.58, 0.75, 0.05, 0.16, "y", { color: IMP.steel, segments: 8 });
  }
  P.box("paintedMetal", -1.0, 1.0, 0.75, 1.4, 0.05, 0.4, { color: IMP.gunmetal });
  // torch arm from a wall-mounted boom to the workpiece
  P.box("paintedMetal", 0.8, 2.0, 0.9, 0.12, 1.8, 0.12, { color: IMP.gunmetal, texel: 1 });
  P.box("paintedMetal", 0.4, 2.85, 0.3, 0.12, 0.12, 1.4, { color: IMP.gunmetal, texel: 1 });
  P.cyl("metal", 0.2, 2.0, -0.1, 0.05, 1.6, "y", { color: IMP.steel, segments: 8 });
  P.cyl("paintedMetal", 0.2, 1.15, -0.1, 0.06, 0.24, "y", { color: IMP.black, segments: 8, r2: 0.03 });
  // workpiece: a plate with a weld seam
  P.box("plate", 0, 1.02, -0.1, 1.2, 0.08, 0.6, { color: IMP.plateDark, uv: "world", texel: 1 });
  P.box("emitAmber", 0.1, 1.07, -0.1, 0.6, 0.012, 0.03, { uv: "keep" });
  cableBundle(kit, { from: P.world(0.4, 2.85, 0.9).toArray(), to: P.world(-1.0, 1.66, 0.75).toArray(), sag: 0.35, n: 2, r: 0.02 });
  // arc point: own additive material so it can flicker
  const arcMat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const arc = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), arcMat);
  const ap = P.world(0.2, 1.06, -0.1);
  arc.position.copy(ap);
  ctx.add(arc);
  const light = ctx.light(0x9fd4ff, 90, 14, [ap.x, ap.y + 0.4, ap.z]);
  hazardBay(kit, [cx - 2.6, cz - 2.2], [cx + 2.6, cz + 1.6], F, { w: 0.25 });
  floorDecal(kit, [cx, cz - 1.7], F, 1.0, DECAL.WARNING, 0);
  return { arc, arcMat, light, base: light.intensity };
}

/** Caged parts elevator: shaft frame floor→ceiling, mesh, closed hatch, call panel, the car parked above. */
function partsElevator(ctx, cx, cz, { size = 2.6, yaw = 0 } = {}) {
  const { kit, IMP } = ctx;
  const F = ctx.floor,
    C = ctx.ceil;
  const s = size / 2;
  const P = new Placer(kit, [cx, F, cz], yaw);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.box("paintedMetal", sx * s, (C - F) / 2, sz * s, 0.24, C - F, 0.24, { color: IMP.plateDark, texel: 1 });
  for (const y of [F + 3.2, F + 8, C - 0.4]) {
    P.box("paintedMetal", 0, y - F, s, size, 0.3, 0.2, { color: IMP.black, texel: 1 });
    P.box("paintedMetal", 0, y - F, -s, size, 0.3, 0.2, { color: IMP.black, texel: 1 });
    P.box("paintedMetal", s, y - F, 0, 0.2, 0.3, size, { color: IMP.black, texel: 1 });
    P.box("paintedMetal", -s, y - F, 0, 0.2, 0.3, size, { color: IMP.black, texel: 1 });
  }
  // mesh sides (thin verticals) on the back and sides above the hatch
  for (let i = 1; i < 6; i++) {
    const t = -s + (size * i) / 6;
    P.box("metal", t, (C - F) / 2, s, 0.03, C - F, 0.03, { color: IMP.steelDark });
    P.box("metal", s, (C - F) / 2, t, 0.03, C - F, 0.03, { color: IMP.steelDark });
    P.box("metal", -s, (C - F) / 2, t, 0.03, C - F, 0.03, { color: IMP.steelDark });
  }
  // front hatch (closed) with hazard chevrons + call panel
  P.box("plate", 0, 1.6, -s, size - 0.3, 3.0, 0.1, { color: IMP.plateDark, uv: "world", texel: 1 });
  P.box("hazard", 0, 1.6, -s - 0.06, size - 0.4, 0.3, 0.02, { texel: 2 });
  P.box("paintedMetal", 0, 1.6, -s - 0.05, 0.08, 2.9, 0.02, { color: IMP.black });
  P.box("emitWhiteSoft", 0, 3.25, -s - 0.06, size - 0.6, 0.04, 0.02, { uv: "keep" });
  P.box("darkGloss", s + 0.4, 1.4, -s - 0.03, 0.3, 0.5, 0.05);
  P.box("leds", s + 0.4, 1.5, -s - 0.06, 0.2, 0.06, 0.01, { uv: "keep", uvRect: ledRect(7) });
  P.box("emitCyan", s + 0.4, 1.3, -s - 0.06, 0.06, 0.06, 0.01);
  P.decal(-s - 0.5, 2.6, -s - 0.02, 0.6, 0.6, DECAL.ARROW, { rot: [0, 0, Math.PI / 2] });
  // the car parked at the top of the shaft
  P.box("paintedMetal", 0, C - F - 3.2, 0, size - 0.5, 2.6, size - 0.5, { color: IMP.black, texel: 1 });
  P.box("emitAmber", 0, C - F - 4.55, 0, size - 0.8, 0.02, size - 0.8, { uv: "keep" });
  P.collider([-s - 0.15, 0, -s - 0.15], [s + 0.15, C - F, s + 0.15], "elevator");
  hazardBay(kit, [cx - s - 1.2, cz - s - 1.2], [cx + s + 1.2, cz + s + 1.2], F, { w: 0.25 });
}

export function build(ctx) {
  const { kit, IMP } = ctx;
  const F = ctx.floor; // -40
  const C = ctx.ceil; // -26
  const { x0, x1, z0, z1 } = ctx.inner;
  fixDoorSides(ctx);
  ctx.shell({ floorMat: "deckGrey", floorColor: IMP.plateDark, walls: { xmin: { pilasterEvery: 0 }, xmax: { pilasterEvery: 0 }, zmin: { pilasterEvery: 8.9 }, zmax: { pilasterEvery: 8.9 } }, stripSpacing: 6, seed: 58 });
  doorThroat(ctx, "hg_repair", { accent: "emitCyan" });

  // ---- the engine under the crane, in view of the arch
  const EX = 62,
    EZ = 47;
  repulsorEngine(ctx, EX, EZ);
  const craneY = C - 1.4;
  gantryCrane(kit, { x0: 52, x1: 74, z0: z0 + 2, z1: z1 - 2, y: craneY, bridgeZ: EZ + 1.5, trolleyX: EX - 1.0, hookDrop: 5.5 });
  // sling from the hook to the casing
  for (const s of [-1, 1]) cableBundle(kit, { from: [EX - 1.0, craneY + 0.2 - 5.5 - 0.5, EZ + 1.5], to: [EX - 1.0 + s * 1.2, F + 3.8, EZ + 0.4], sag: 0.02, n: 1, r: 0.02, color: IMP.steel });
  // tow lane from the arch to the engine bay
  floorLine(kit, [x0 + 0.3, 42], [EX - 6, 42], F, { w: 0.15, color: IMP.cyan });
  floorLine(kit, [x0 + 0.3, 54], [EX - 6, 54], F, { w: 0.15, color: IMP.cyan });
  floorDecal(kit, [x0 + 4.5, 48], F, 2.2, DECAL.ARROW, -Math.PI / 2);

  // ---- forward wall: bench row with tool boards, parts kiosk, vents
  for (let i = 0; i < 5; i++) {
    const x = x0 + 4.2 + i * 4.6;
    workbench(kit, { pos: [x, F, z0 + 0.75], yaw: Math.PI, w: 3.6, d: 1.0, seed: 10 + i, accent: "emitCyan" });
    toolRack(kit, { pos: [x, F, z0 + 0.25], yaw: Math.PI, w: 3.0, h: 1.4, base: 1.5, seed: 20 + i });
  }
  terminalKiosk(kit, { pos: [x0 + 27.5, F, z0 + 1.2], yaw: Math.PI, accent: "emitCyan", index: 6 });
  {
    const { frame } = ctx.wall("zmin");
    frameScreen(frame, wallU(ctx, "zmin", 70), 4.2, 3.6, 1.6, 6, { accent: "emitCyan" });
    frame.decal(wallU(ctx, "zmin", 50), 5.4, 0.01, 2.2, 2.2, DECAL.EMBLEM);
    louvreVent(kit, { pos: [58, F + 8.5, z0 + 0.02], yaw: Math.PI, w: 4.0, h: 2.0 });
  }
  // parts crates under the far benches
  for (const [x, z] of [[x0 + 24.5, z0 + 2.8], [x0 + 26.2, z0 + 2.8], [x0 + 25.3, z0 + 4.4]]) placeCrate(kit, [x, F, z], 0.1, { size: [1.4, 0.8, 1.4], color: IMP.plateDark, band: true });

  // ---- outer wall: five droid charging alcoves (empty) with a cyan status strip and a service panel
  for (let i = 0; i < 5; i++) {
    const z = 60 + i * 4.4;
    droidAlcove(kit, { pos: [x1 - 1.7, F, z], yaw: Math.PI / 2, w: 2.2, h: 2.8, d: 1.6, accent: "emitCyan", seed: 30 + i, occupiedLight: i === 2 });
    floorDecal(kit, [x1 - 3.4, z], F, 1.0, DECAL.NUMBER0 + (i % 4), Math.PI / 2);
  }
  strip(kit, [x1 - 1.72, F + 3.05, 58.5], [x1 - 1.68, F + 3.1, 79.5], "emitCyan");
  kit.boxMM("hazard", [x1 - 3.0, F + 0.003, 58.6], [x1 - 2.7, F + 0.011, 79.4], { texel: 1 });
  {
    const { frame } = ctx.wall("xmax");
    frameScreen(frame, wallU(ctx, "xmax", 85), 2.6, 3.0, 1.5, 7, { accent: "emitCyan" });
    frame.decal(wallU(ctx, "xmax", 52), 6.0, 0.01, 2.4, 2.4, DECAL.TEXT_C);
    frame.decal(wallU(ctx, "xmax", 70), 6.5, 0.01, 2.0, 2.0, DECAL.WARNING);
  }
  machineBlock(kit, { pos: [x1 - 1.3, F, 84.5], yaw: Math.PI / 2, size: [3.0, 2.2, 1.6], accent: "emitCyan", seed: 44, stencil: DECAL.TEXT_B });
  pipeRun(kit, { points: [[x1 - 0.4, F + 2.2, 84.5], [x1 - 0.4, F + 5.0, 84.5], [x1 - 0.4, F + 5.0, 58]], r: 0.14, color: IMP.steelDark, clamps: 3 });
  for (let i = 0; i < 5; i++) pipeRun(kit, { points: [[x1 - 0.4, F + 5.0, 60 + i * 4.4], [x1 - 0.4, F + 3.2, 60 + i * 4.4]], r: 0.06, color: IMP.plateBlue });

  // ---- aft wall: parts shelving + spare bins
  for (let i = 0; i < 6; i++) shelving(kit, { pos: [x0 + 4.5 + i * 4.6, F, z1 - 0.7], yaw: 0, w: 4.2, h: 3.0, levels: 3, seed: 50 + i });
  hazardBay(kit, [x0 + 1.8, z1 - 1.8], [x0 + 30.2, z1 - 0.2], F, { w: 0.2 });
  {
    const rand = rng(61);
    for (const [x, z] of [[x0 + 8, z1 - 3.6], [x0 + 9.6, z1 - 3.6], [x0 + 8.8, z1 - 5.2], [x0 + 20, z1 - 3.6], [x0 + 21.6, z1 - 3.6]]) placeCrate(kit, [x, F, z], rand() * 0.3, { size: [1.4, 0.8 + rand() * 0.4, 1.4], color: rand() < 0.5 ? IMP.plateDark : IMP.gunmetal, band: rand() < 0.5 });
  }

  // ---- welding cell + fluid drum store (inner corner by the arch, aft side)
  const weld = weldingCell(ctx, 50.5, 70, Math.PI);
  {
    const rand = rng(23);
    for (let i = 0; i < 10; i++) barrel(kit, { pos: [46.2 + (i % 5) * 0.85, F, 64 + Math.floor(i / 5) * 0.85], r: 0.38, h: 1.05, color: i % 4 === 0 ? IMP.plateBlue : IMP.plateDark, band: rand() < 0.6 ? IMP.hazardYellow : IMP.red });
    for (let i = 0; i < 4; i++) barrel(kit, { pos: [46.6 + i * 0.85, F + 1.05, 64.4], r: 0.38, h: 1.05, color: IMP.plateDark, collide: false });
    // drum rack (two tiers of horizontal drums with taps)
    for (let t = 0; t < 2; t++)
      for (let i = 0; i < 3; i++) {
        const y = F + 0.55 + t * 0.95;
        kit.cyl("plate", 46.8, y, 58 + i * 1.0, 0.4, 1.0, "x", { color: t ? IMP.plateWarm : IMP.plateDark, segments: 16, texel: 1 });
        kit.cyl("paintedMetal", 47.35, y - 0.25, 58 + i * 1.0, 0.04, 0.12, "x", { color: IMP.red, segments: 6 });
      }
    for (const z of [57.4, 60.6]) for (const y of [F + 0.55, F + 1.5]) kit.box("paintedMetal", 46.8, y - 0.45, z, 1.1, 0.12, 0.12, { color: IMP.gunmetal, texel: 1 });
    for (const z of [57.4, 60.6]) for (const x of [46.3, 47.3]) kit.box("paintedMetal", x, F + 1.0, z, 0.1, 2.0, 0.1, { color: IMP.gunmetal, texel: 1 });
    kit.collider([46.2, F, 57.3], [47.4, F + 2.0, 60.7], "drumrack");
    hazardBay(kit, [45.6, 57.0], [50.8, 66.0], F, { w: 0.25, mat: "hazardRed", decal: DECAL.WARNING, decalSize: 1.2, decalAt: [49.4, 60.5] });
    valveStack(kit, { pos: [x0 + 0.5, F, 62], yaw: -Math.PI / 2, n: 3, r: 0.1, h: 2.2, wheel: IMP.red });
  }

  // ---- parts elevator in the forward-outer corner + spare engine parts beside it
  partsElevator(ctx, x1 - 2.2, z0 + 6.5, { size: 2.6, yaw: Math.PI / 2 });
  screenPanel(kit, { pos: [x1 - 0.02, F + 1.4, z0 + 12.5], yaw: Math.PI / 2, w: 2.4, h: 1.4, index: 3, accent: "emitCyan" });
  for (const [x, z] of [[x1 - 6.5, z0 + 3.2], [x1 - 6.5, z0 + 5.0], [x1 - 6.5, z0 + 6.8]]) {
    kit.cyl("plate", x, F + 0.5, z, 0.5, 1.0, "z", { color: IMP.plateBlue, segments: 16 });
    kit.box("paintedMetal", x, F + 0.15, z, 1.2, 0.3, 0.9, { color: IMP.black, texel: 1 });
  }
  kit.collider([x1 - 7.2, F, z0 + 2.6], [x1 - 5.8, F + 1.0, z0 + 7.4], "spares");

  // ---- structure + strips: corner pilasters, cyan wall base strip along the alcove wall, arch chevrons
  pillar(kit, { pos: [x1 - 0.9, F, z1 - 0.9], h: ctx.h, w: 0.8 });
  pillar(kit, { pos: [x0 + 0.9, F, z1 - 0.9], h: ctx.h, w: 0.8 });
  {
    const { frame } = ctx.wall("xmin");
    frame.box("hazard", wallU(ctx, "xmin", 48), 10.4, 0.02, 17.2, 0.5, 0.04, { texel: 1 });
    frame.box("hazard", wallU(ctx, "xmin", 39.65), 5.0, 0.02, 0.5, 10.0, 0.04, { texel: 1 });
    frame.box("hazard", wallU(ctx, "xmin", 56.35), 5.0, 0.02, 0.5, 10.0, 0.04, { texel: 1 });
    frame.decal(wallU(ctx, "xmin", 35), 7.0, 0.01, 2.6, 2.6, DECAL.BAY_CODE);
    frame.decal(wallU(ctx, "xmin", 75), 7.0, 0.01, 3.0, 3.0, DECAL.EMBLEM);
    frameScreen(frame, wallU(ctx, "xmin", 84), 2.6, 3.0, 1.5, 11, { accent: "emitCyan" });
  }
  strip(kit, [x0 + 0.05, F + 0.6, 57], [x0 + 0.09, F + 0.65, z1 - 1], "emitCyan");
  strip(kit, [x0 + 0.05, F + 0.6, z0 + 1], [x0 + 0.09, F + 0.65, 39], "emitCyan");

  // ---- lights: shadowed spot on the engine, work lights over benches / alcoves / shelving, welding arc
  ctx.spot(0xf4f8ff, 1600, 34, 0.7, [EX + 1, C - 3, EZ - 3], [EX, F, EZ], { penumbra: 0.5, shadow: true, mapSize: 1024 });
  workLight(ctx, [x0 + 14, C, z0 + 4], { drop: 6, size: 1.8, intensity: 900, distance: 44 });
  workLight(ctx, [x1 - 5, C, 70], { drop: 6, size: 1.6, intensity: 800, distance: 40, color: 0xcfefff });
  workLight(ctx, [x0 + 16, C, z1 - 4], { drop: 6, size: 1.8, intensity: 850, distance: 42 });
  workLight(ctx, [x0 + 6, C, 48], { drop: 6.5, size: 1.6, intensity: 700, distance: 38, warm: true });
  workLight(ctx, [x0 + 24, C, 60], { drop: 6, size: 2.0, intensity: 1000, distance: 46 });

  ctx.animate((dt, t) => {
    // welding arc: bursts of flicker with pauses
    const burst = Math.sin(t * 0.7) > 0.2;
    const f = burst ? 0.35 + 0.65 * Math.abs(Math.sin(t * 37) * Math.sin(t * 11.3)) : 0;
    weld.arcMat.opacity = 0.15 + 0.85 * f;
    weld.arc.scale.setScalar(0.6 + 1.4 * f);
    setLightLevel(weld.light, weld.base, 0.05 + 2.5 * f);
  });
}
