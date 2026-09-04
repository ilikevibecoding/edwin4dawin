// Cargo Storage & Logistics — a square store off the hangar's forward-starboard arch. Container racks three
// high line the far wall, two more racks flank the room, a caged cargo lift rides 6 m up a shaft in the
// middle (animated, with its own beacon), a gantry crane carries a pod over the racks, a roller conveyor
// feeds the lift, loaders wait on the apron, and a foreman's booth watches the manifest wall by the arch.
import * as THREE from "three";
import { Kit, rng } from "../../core/kit.js";
import { Placer, railing, stairs, barrel, cableBundle, pipeRun, floorGrate } from "../../core/props.js";
import { hazardBay, floorDecal, floorLine, floorRect, strip, workLight, screenPanel, frameScreen, ledCluster, placeCrate, placeContainer, containerProtos, column, gantryCrane, terminalKiosk, louvreVent, doorThroat, fixDoorSides, wallU } from "../engineering/machinery.js";
import { DECAL, ledRect } from "../../textures.js";

export const meta = { id: "cargo_bay", stream: "deck-rooms" };

const CONT = { len: 4, w: 1.6, h: 1.7 };
const PALETTE = ["plate", "plateLight", "plateWarm", "plateBlue", "plateDark", "hazardYellow"];

/**
 * Container rack: steel uprights + level beams; containers (instanced) sit on every level.
 * along 'x': container length runs along X, slots step along Z (and vice versa). levels × slots.
 */
function containerRack(kit, IMP, { x0, z0, y, along = "x", slots = 6, levels = 3, seed = 1, fill = 0.85 }) {
  const rand = rng(seed);
  const L = CONT.len + 0.3;
  const S = CONT.w + 0.25;
  const H = CONT.h + 0.3;
  const lenX = along === "x" ? L : S * slots;
  const lenZ = along === "x" ? S * slots : L;
  const x1 = x0 + lenX;
  const z1 = z0 + lenZ;
  const top = levels * H;
  // uprights every 3 slots + at the ends, on both long sides
  const n = Math.ceil(slots / 3);
  for (let i = 0; i <= n; i++) {
    const t = Math.min(1, (i * 3) / slots);
    if (along === "x") for (const x of [x0, x1]) column(kit, x, z0 + lenZ * t, y, y + top, 0.22, { color: IMP.gunmetal, collide: false });
    else for (const z of [z0, z1]) column(kit, x0 + lenX * t, z, y, y + top, 0.22, { color: IMP.gunmetal, collide: false });
  }
  for (let l = 0; l < levels; l++) {
    const by = y + l * H;
    if (along === "x") {
      for (const x of [x0, x1]) kit.boxMM("paintedMetal", [x - 0.12, by, z0], [x + 0.12, by + 0.24, z1], { color: IMP.hazardYellow, texel: 1 });
      for (let s = 0; s <= slots; s++) kit.boxMM("paintedMetal", [x0, by + 0.02, z0 + s * S - 0.08], [x1, by + 0.2, z0 + s * S + 0.08], { color: IMP.plateDark, texel: 1 });
    } else {
      for (const z of [z0, z1]) kit.boxMM("paintedMetal", [x0, by, z - 0.12], [x1, by + 0.24, z + 0.12], { color: IMP.hazardYellow, texel: 1 });
      for (let s = 0; s <= slots; s++) kit.boxMM("paintedMetal", [x0 + s * S - 0.08, by + 0.02, z0], [x0 + s * S + 0.08, by + 0.2, z1], { color: IMP.plateDark, texel: 1 });
    }
  }
  // containers
  for (let l = 0; l < levels; l++) {
    const cy = y + l * H + 0.24;
    for (let s = 0; s < slots; s++) {
      if (rand() > fill - l * 0.12) continue;
      const color = IMP[PALETTE[Math.floor(rand() * PALETTE.length)]];
      if (along === "x") placeContainer(kit, [(x0 + x1) / 2, cy, z0 + (s + 0.5) * S], Math.PI / 2, { color, collide: l === 0 });
      else placeContainer(kit, [x0 + (s + 0.5) * S, cy, (z0 + z1) / 2], 0, { color, collide: l === 0 });
    }
  }
  kit.collider([x0 - 0.15, y, z0 - 0.15], [x1 + 0.15, y + top, z1 + 0.15], "rack");
  hazardBay(kit, [x0 - 0.6, z0 - 0.6], [x1 + 0.6, z1 + 0.6], y, { w: 0.25 });
  return { x0, x1, z0, z1, top };
}

/** Roller conveyor between two floor points (straight), rollers along the run, crates riding on it. */
function conveyor(kit, IMP, from, to, y, { h = 0.75, w = 0.9, seed = 1 }) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  const P = new Placer(kit, [from[0], y, from[1]], Math.atan2(-dz, dx));
  const rand = rng(seed);
  for (const s of [-1, 1]) P.box("paintedMetal", L / 2, h - 0.08, s * (w / 2), L, 0.16, 0.06, { color: IMP.hazardYellow, texel: 1 });
  const legs = Math.max(2, Math.round(L / 2.5));
  for (let i = 0; i <= legs; i++) {
    const x = Math.min(Math.max((i / legs) * L, 0.2), L - 0.2);
    for (const s of [-1, 1]) P.box("paintedMetal", x, (h - 0.16) / 2, s * (w / 2 - 0.04), 0.08, h - 0.16, 0.08, { color: IMP.black, texel: 1 });
    P.box("paintedMetal", x, 0.03, 0, 0.5, 0.06, w, { color: IMP.black });
  }
  const n = Math.floor(L / 0.28);
  for (let i = 0; i < n; i++) P.cyl("metal", 0.14 + i * 0.28, h - 0.02, 0, 0.06, w - 0.14, "z", { color: IMP.steel, segments: 8 });
  let x = 0.8;
  while (x < L - 1.2) {
    const bw = 0.6 + rand() * 0.5;
    if (rand() < 0.5) placeCrate(kit, P.world(x + bw / 2, h + 0.04, 0).toArray(), Math.atan2(-dz, dx), { size: [bw, 0.4 + rand() * 0.4, w - 0.3], color: rand() < 0.5 ? IMP.plateDark : IMP.plateWarm, band: rand() < 0.4, collide: false });
    x += bw + 0.6 + rand() * 1.5;
  }
  P.box("emitAmber", L - 0.3, h + 0.02, w / 2 + 0.04, 0.3, 0.03, 0.01);
  P.collider([0, 0, -w / 2 - 0.05], [L, h + 0.1, w / 2 + 0.05], "conveyor");
}

/** Cargo loader: tracked base, mast with fork tines, operator cage, beacon. Faces −Z (forks forward). */
function cargoLoader(kit, IMP, { pos, yaw = 0, seed = 1, lifted = 0.3 }) {
  const P = new Placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.7, 0.4, 1.6, 0.8, 2.2, { color: IMP.plateWarm, texel: 1 });
  P.box("paintedMetal", 0, 0.25, 0.4, 1.9, 0.5, 2.6, { color: IMP.black, texel: 1 });
  for (const s of [-1, 1]) P.box("rubber", s * 0.95, 0.3, 0.4, 0.3, 0.55, 2.6, { color: IMP.black });
  P.box("hazard", 0, 0.72, 0.4, 1.62, 0.12, 2.22, { texel: 3 });
  // mast + carriage + tines
  for (const s of [-1, 1]) P.box("paintedMetal", s * 0.55, 1.6, -0.75, 0.12, 3.2, 0.14, { color: IMP.gunmetal, texel: 1 });
  P.box("paintedMetal", 0, 3.2, -0.75, 1.3, 0.12, 0.14, { color: IMP.gunmetal });
  P.box("paintedMetal", 0, lifted + 0.35, -0.9, 1.3, 0.6, 0.1, { color: IMP.black, texel: 1 });
  for (const s of [-1, 1]) P.box("metal", s * 0.4, lifted + 0.03, -1.55, 0.14, 0.06, 1.3, { color: IMP.steel });
  // operator cage + seat + controls
  for (const s of [-1, 1]) P.box("paintedMetal", s * 0.7, 1.9, 1.0, 0.08, 1.6, 0.08, { color: IMP.black });
  P.box("paintedMetal", 0, 2.7, 0.6, 1.6, 0.08, 1.4, { color: IMP.black, texel: 1 });
  P.box("fabric", 0, 1.35, 1.1, 0.7, 0.5, 0.6, { color: IMP.fabricBlack });
  P.box("fabric", 0, 1.8, 1.4, 0.7, 0.7, 0.14, { color: IMP.fabricBlack });
  P.box("darkGloss", 0, 1.35, 0.1, 0.9, 0.1, 0.4);
  P.box("leds", 0, 1.41, 0.1, 0.5, 0.01, 0.2, { uv: "keep", uvRect: ledRect(seed % 16) });
  P.box("emitAmber", 0, 2.8, 1.2, 0.2, 0.12, 0.2, { uv: "keep" });
  P.decal(0.81, 0.85, 0.8, 0.45, 0.45, DECAL.NUMBER0 + (seed % 4), { rot: [0, Math.PI / 2, 0] });
  P.collider([-1.1, 0, -2.2], [1.1, 3.3, 1.7], "loader");
}

export function build(ctx) {
  const { kit, IMP } = ctx;
  const F = ctx.floor; // -40
  const C = ctx.ceil; // -22
  const { x0, x1, z0, z1 } = ctx.inner;
  fixDoorSides(ctx);
  ctx.shell({ floorMat: "deckGrey", floorColor: IMP.plateDark, walls: { xmin: { pilasterEvery: 0 }, xmax: { pilasterEvery: 8.9 }, zmin: { pilasterEvery: 8.9 }, zmax: { pilasterEvery: 8.9 } }, stripSpacing: 6, seed: 52 });
  doorThroat(ctx, "hg_cargo");
  containerProtos(kit, CONT);

  // ---- container racks: three high along the far wall (aft of the lift), two high along the fore and aft walls
  const rackA = containerRack(kit, IMP, { x0: x1 - 4.9, z0: -46, y: F, along: "x", slots: 11, levels: 3, seed: 3 });
  containerRack(kit, IMP, { x0: x0 + 10, z0: z0 + 0.6, y: F, along: "z", slots: 6, levels: 2, seed: 4, fill: 0.8 });
  containerRack(kit, IMP, { x0: x0 + 14, z0: z1 - 4.9, y: F, along: "z", slots: 8, levels: 2, seed: 5, fill: 0.75 });
  // loose pods on the apron and one in the crane's hook
  placeContainer(kit, [x0 + 7.5, F, z0 + 3.6], 0.15, { color: IMP.plateLight });
  placeContainer(kit, [x0 + 7.3, F, z0 + 5.8], -0.1, { color: IMP.plateWarm });
  placeContainer(kit, [x0 + 7.4, F + CONT.h, z0 + 4.7], 0.05, { color: IMP.plate, collide: false });

  // ---- floor: main lane from the arch, bay boxes, arrows, numbered stalls
  const laneZ0 = -50,
    laneZ1 = -30;
  floorLine(kit, [x0 + 0.3, laneZ0 + 0.6], [x1 - 6.2, laneZ0 + 0.6], F, { w: 0.18 });
  floorLine(kit, [x0 + 0.3, laneZ1 - 0.6], [x1 - 6.2, laneZ1 - 0.6], F, { w: 0.18 });
  for (const x of [x0 + 6, x0 + 14, x0 + 22]) floorDecal(kit, [x, -40], F, 2.4, DECAL.ARROW, -Math.PI / 2);
  floorRect(kit, [x0 + 8, -29.2], [x0 + 13, -25.6], F, { w: 0.14 });
  floorDecal(kit, [x0 + 10.5, -27.4], F, 1.6, DECAL.NUMBER0, 0);
  floorRect(kit, [x0 + 4.4, z0 + 0.8], [x0 + 9.6, z0 + 7.6], F, { w: 0.14 });
  floorDecal(kit, [x0 + 5.5, z0 + 8.6], F, 1.4, DECAL.NUMBER1, 0);
  floorDecal(kit, [x0 + 2.2, -52.6], F, 2.2, DECAL.BAY_CODE, -Math.PI / 2);

  // ---- cargo lift: caged shaft in the fore-starboard corner (the room centre is the teleport spawn),
  // 4 × 4 platform riding 6 m up (animated, with a beacon); its gate faces a loading zone by the far wall
  const LX = 72.5,
    LZ = -51.5;
  const LIFT_H = 6;
  {
    const s = 2.4;
    kit.boxMM("paintedMetal", [LX - s - 0.3, F, LZ - s - 0.3], [LX + s + 0.3, F + 0.12, LZ + s + 0.3], { color: IMP.black, texel: 1 });
    kit.boxMM("hazard", [LX - s - 0.3, F + 0.12, LZ - s - 0.3], [LX + s + 0.3, F + 0.126, LZ + s + 0.3], { texel: 1 });
    kit.boxMM("paintedMetal", [LX - 2.0, F, LZ - 2.0], [LX + 2.0, F + 0.1, LZ + 2.0], { color: IMP.gloss, texel: 1 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) column(kit, LX + sx * s, LZ + sz * s, F, C, 0.42, { color: IMP.plateDark, hazard: true });
    for (const y of [F + 7.5, F + 13.5, C - 0.5]) {
      for (const sz of [-1, 1]) kit.box("paintedMetal", LX, y, LZ + sz * s, 2 * s, 0.4, 0.3, { color: IMP.black, texel: 1 });
      for (const sx of [-1, 1]) kit.box("paintedMetal", LX + sx * s, y, LZ, 0.3, 0.4, 2 * s, { color: IMP.black, texel: 1 });
    }
    // guide rails on the −X posts and cage mesh (thin verticals) on three sides
    for (const sz of [-1, 1]) kit.box("metal", LX - s + 0.28, (F + C) / 2, LZ + sz * (s - 0.3), 0.1, C - F, 0.2, { color: IMP.steelDark, texel: 1 });
    for (const side of ["zmin", "zmax", "xmin"]) {
      for (let i = 1; i < 8; i++) {
        const t = -s + (2 * s * i) / 8;
        if (side === "zmin") kit.box("metal", LX + t, F + LIFT_H / 2 + 1.2, LZ - s, 0.03, LIFT_H + 2.4, 0.03, { color: IMP.steelDark });
        else if (side === "zmax") kit.box("metal", LX + t, F + LIFT_H / 2 + 1.2, LZ + s, 0.03, LIFT_H + 2.4, 0.03, { color: IMP.steelDark });
        else kit.box("metal", LX - s, F + LIFT_H / 2 + 1.2, LZ + t, 0.03, LIFT_H + 2.4, 0.03, { color: IMP.steelDark });
      }
    }
    // upper landing deck at +6 m on the −X side (where the pods go up to the store above) + gate on +X
    kit.boxMM("paintedMetal", [LX - s - 3.2, F + LIFT_H - 0.3, LZ - s], [LX - s, F + LIFT_H, LZ + s], { color: IMP.plateDark, texel: 1 });
    floorGrate(kit, [LX - s - 3.1, LZ - s + 0.1], [LX - s - 0.1, LZ + s - 0.1], F + LIFT_H + 0.005);
    railing(kit, { from: [LX - s - 3.2, LZ - s], to: [LX - s - 3.2, LZ + s], y: F + LIFT_H });
    railing(kit, { from: [LX - s - 3.2, LZ + s], to: [LX - s, LZ + s], y: F + LIFT_H });
    railing(kit, { from: [LX - s, LZ - s], to: [LX - s - 3.2, LZ - s], y: F + LIFT_H });
    for (const z of [LZ - s + 0.4, LZ + s - 0.4]) column(kit, LX - s - 2.8, z, F, F + LIFT_H - 0.3, 0.24, { color: IMP.black, collide: false });
    // access gate: chain across the +X opening (the platform is live)
    railing(kit, { from: [LX + s, LZ - s], to: [LX + s, LZ - 1.0], y: F });
    railing(kit, { from: [LX + s, LZ + 1.0], to: [LX + s, LZ + s], y: F });
    pipeRun(kit, { points: [[LX + s, F + 0.9, LZ - 1.0], [LX + s + 0.1, F + 0.7, LZ], [LX + s, F + 0.9, LZ + 1.0]], r: 0.03, color: IMP.hazardYellow, mat: "rubber" });
    kit.collider([LX + s - 0.1, F, LZ - 1.0], [LX + s + 0.1, F + 1.1, LZ + 1.0], "liftgate");
    screenPanel(kit, { pos: [LX + s + 0.3, F + 1.2, LZ - s - 0.2], yaw: Math.PI / 2, w: 0.9, h: 0.6, index: 15, accent: "emitAmber", stand: true, collide: true });
    hazardBay(kit, [LX - s - 1.4, LZ - s - 1.4], [LX + s + 1.4, LZ + s + 1.4], F, { w: 0.35 });
    floorDecal(kit, [LX + s + 2.4, LZ], F, 1.6, DECAL.WARNING, -Math.PI / 2);
  }
  // the platform (own kit → animated group)
  const liftGroup = new THREE.Group();
  {
    const pk = new Kit(ctx.materials);
    pk.box("paintedMetal", 0, 0.15, 0, 4.0, 0.3, 4.0, { color: IMP.plateDark, texel: 1 });
    pk.box("hazard", 0, 0.31, 0, 4.02, 0.02, 4.02, { texel: 1 });
    pk.box("paintedMetal", 0, 0.32, 0, 3.6, 0.02, 3.6, { color: IMP.black, texel: 1 });
    floorGrate(pk, [-1.75, -1.75], [1.75, 1.75], 0.335);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pk.box("paintedMetal", sx * 1.8, 0.75, sz * 1.8, 0.16, 0.9, 0.16, { color: IMP.hazardYellow, texel: 1 });
    for (const sz of [-1, 1]) pk.cyl("metal", 0, 1.15, sz * 1.8, 0.03, 3.6, "x", { color: IMP.steel, segments: 8 });
    pk.cyl("metal", -1.8, 1.15, 0, 0.03, 3.6, "z", { color: IMP.steel, segments: 8 });
    // carriage on the guide rails + beacon
    pk.box("paintedMetal", -2.2, 0.6, 0, 0.5, 1.2, 3.8, { color: IMP.black, texel: 1 });
    pk.box("paintedMetal", 0, -0.3, 0, 3.4, 0.6, 3.4, { color: IMP.black, texel: 1 });
    pk.box("emitAmber", 0, -0.61, 0, 3.0, 0.02, 3.0, { uv: "keep" });
    pk.cyl("paintedMetal", 1.6, 1.4, 1.6, 0.12, 0.3, "y", { color: IMP.black, segments: 10 });
    pk.box("emitAmber", 1.6, 1.62, 1.6, 0.2, 0.14, 0.2, { uv: "keep" });
    // a pod and crates riding up
    placeContainer(pk, [0.3, 0.34, -0.6], Math.PI / 2, { color: IMP.plateBlue, collide: false });
    placeCrate(pk, [-0.6, 0.34, 1.2], 0.2, { size: [1.2, 0.9, 1.0], color: IMP.plateWarm, collide: false });
    pk.build(liftGroup);
    liftGroup.position.set(LX, F, LZ);
    ctx.add(liftGroup);
  }
  const liftLamp = ctx.light(0xffb547, 90, 12, [0, 1.9, 0]);
  liftGroup.add(liftLamp);
  liftLamp.position.set(0, 1.9, 0);

  // ---- gantry crane over rack A with a pod in the hook
  const craneY = C - 2.0;
  gantryCrane(kit, { x0: x1 - 18, x1: x1 - 6.0, z0: -47, z1: z1 - 2, y: craneY, bridgeZ: -37, trolleyX: x1 - 11, hookDrop: 5 });
  placeContainer(kit, [x1 - 11, craneY + 0.2 - 5 - 0.6 - CONT.h, -37], 0, { color: IMP.plateLight, collide: false });
  for (const s of [-1, 1]) cableBundle(kit, { from: [x1 - 11, craneY + 0.2 - 5 - 0.5, -37 + s * 0.6], to: [x1 - 11 + s * 0.6, craneY + 0.2 - 5 - 0.6, -37 + s * 1.6], sag: 0.05, n: 1, r: 0.02, color: IMP.steel });

  // ---- roller conveyor from the fore rack toward the lift's landing side; loaders on the apron; drums
  conveyor(kit, IMP, [x0 + 11, -52.5], [LX - 7.0, -50.5], F, { seed: 5 });
  cargoLoader(kit, IMP, { pos: [x0 + 5.5, F, -33], yaw: -Math.PI / 2 + 0.25, seed: 1, lifted: 0.6 });
  cargoLoader(kit, IMP, { pos: [x0 + 17, F, z1 - 7.5], yaw: Math.PI - 0.3, seed: 2, lifted: 0.2 });
  {
    const rand = rng(31);
    for (let i = 0; i < 8; i++) barrel(kit, { pos: [x0 + 1.8 + (i % 4) * 0.85, F, z0 + 0.8 + Math.floor(i / 4) * 0.85], r: 0.38, h: 1.05, color: i % 3 ? IMP.plateDark : IMP.plateWarm, band: rand() < 0.7 ? IMP.hazardYellow : IMP.red });
    for (let i = 0; i < 3; i++) barrel(kit, { pos: [x0 + 2.2 + (i % 2) * 0.85, F + 1.05, z0 + 1.2 + Math.floor(i / 2) * 0.85], r: 0.38, h: 1.05, color: IMP.plateDark, collide: false });
    hazardBay(kit, [x0 + 1.0, z0 + 0.3], [x0 + 5.4, z0 + 2.6], F, { w: 0.2, mat: "hazardRed" });
    for (const [x, z, up] of [[x0 + 1.4, z0 + 4.2, 0], [x0 + 3.0, z0 + 4.2, 0], [x0 + 1.4, z0 + 6.0, 0], [x0 + 2.2, z0 + 5.1, 1]]) placeCrate(kit, [x, F + up * 0.9, z], rand() * 0.4, { size: [1.4, 0.9, 1.4], color: rand() < 0.5 ? IMP.plateDark : IMP.gunmetal, band: rand() < 0.6, collide: !up });
  }

  // ---- foreman's booth by the arch (raised 0.4 m) + manifest wall on the aft wall
  {
    const bx = x0 + 3.4,
      bz = z1 - 3.2;
    kit.boxMM("paintedMetal", [bx - 2.0, F, bz - 2.0], [bx + 2.0, F + 0.4, bz + 2.0], { color: IMP.black, texel: 1 });
    kit.boxMM("deckBlack", [bx - 1.9, F + 0.38, bz - 1.9], [bx + 1.9, F + 0.42, bz + 1.9], { color: IMP.plateLight, texel: 0.5 });
    kit.collider([bx - 2.0, F, bz - 2.0], [bx + 2.0, F + 0.42, bz + 2.0], "booth");
    railing(kit, { from: [bx - 2.0, bz - 2.0], to: [bx + 2.0, bz - 2.0], y: F + 0.42 });
    railing(kit, { from: [bx + 2.0, bz - 2.0], to: [bx + 2.0, bz + 0.8], y: F + 0.42 });
    stairs(kit, { pos: [bx + 2.0 + 0.6, F, bz + 1.4], yaw: Math.PI / 2, width: 1.2, rise: 0.4, stepH: 0.2, rails: false });
    terminalKiosk(kit, { pos: [bx - 0.6, F + 0.42, bz - 0.8], yaw: Math.PI, accent: "emitAmber", index: 15 });
    terminalKiosk(kit, { pos: [bx + 0.7, F + 0.42, bz - 0.8], yaw: Math.PI, accent: "emitAmber", index: 3 });
    strip(kit, [bx - 1.9, F + 0.2, bz - 2.02], [bx + 1.9, F + 0.24, bz - 2.0], "emitAmber");
    // manifest wall: big board + status columns
    screenPanel(kit, { pos: [x0 + 8.5, F + 1.4, z1 - 0.02], yaw: 0, w: 6.0, h: 3.0, index: 15, accent: "emitAmber" });
    screenPanel(kit, { pos: [x0 + 2.6, F + 1.6, z1 - 0.02], yaw: 0, w: 2.8, h: 1.8, index: 3, accent: "emitAmber" });
    ledCluster(kit, { pos: [x0 + 12.6, F + 3.2, z1 - 0.05], yaw: 0, w: 1.2, h: 0.35, index: 5, accent: "emitAmber" });
    ledCluster(kit, { pos: [x0 + 12.6, F + 2.5, z1 - 0.05], yaw: 0, w: 1.2, h: 0.35, index: 9, accent: "emitAmber" });
  }

  // ---- wall dressing: stencils, vents, arch chevrons, cable drops to the racks
  {
    const { frame } = ctx.wall("xmin");
    frame.box("hazard", wallU(ctx, "xmin", -40), 12.4, 0.02, 21.2, 0.5, 0.04, { texel: 1 });
    frame.box("hazard", wallU(ctx, "xmin", -50.35), 6.0, 0.02, 0.5, 12.0, 0.04, { texel: 1 });
    frame.box("hazard", wallU(ctx, "xmin", -29.65), 6.0, 0.02, 0.5, 12.0, 0.04, { texel: 1 });
    frame.decal(wallU(ctx, "xmin", -55), 3.0, 0.01, 2.0, 2.0, DECAL.BAY_CODE);
    frame.decal(wallU(ctx, "xmin", -26.5), 6.0, 0.01, 2.0, 2.0, DECAL.RESTRICTED);
    frameScreen(frame, wallU(ctx, "xmin", -55), 6.2, 2.6, 1.4, 15, { accent: "emitAmber" });
  }
  {
    const { frame } = ctx.wall("xmax");
    frame.decal(wallU(ctx, "xmax", -42), 12.5, 0.01, 4.5, 4.5, DECAL.EMBLEM);
    frame.decal(wallU(ctx, "xmax", -30), 9.5, 0.01, 1.8, 1.8, DECAL.NUMBER2);
    frame.decal(wallU(ctx, "xmax", -54), 9.5, 0.01, 1.8, 1.8, DECAL.NUMBER3);
  }
  {
    const { frame } = ctx.wall("zmin");
    frame.decal(wallU(ctx, "zmin", 60), 7.0, 0.01, 3.0, 3.0, DECAL.TEXT_C);
    louvreVent(kit, { pos: [52, F + 9.5, z0 + 0.02], yaw: Math.PI, w: 4.0, h: 2.0 });
    louvreVent(kit, { pos: [70, F + 9.5, z0 + 0.02], yaw: Math.PI, w: 4.0, h: 2.0 });
  }
  louvreVent(kit, { pos: [70, F + 9.5, z1 - 0.02], yaw: 0, w: 4.0, h: 2.0 });
  strip(kit, [x0 + 0.05, F + 0.6, z0 + 1], [x0 + 0.09, F + 0.65, -51], "emitAmber");
  strip(kit, [x0 + 0.05, F + 0.6, -29], [x0 + 0.09, F + 0.65, z1 - 1], "emitAmber");
  // conduit drops feeding the rack lighting
  for (const z of [-44, -36, -28]) pipeRun(kit, { points: [[x1 - 0.4, C - 0.2, z], [x1 - 0.4, rackA.top + F + 0.6, z], [x1 - 5.4, rackA.top + F + 0.6, z]], r: 0.1, color: IMP.steelDark, clamps: 2 });

  // ---- lights: work lights over the apron, the lift and the racks; amber over the manifest wall
  workLight(ctx, [x0 + 9, C, -40], { drop: 8, size: 2.0, intensity: 1300, distance: 52 });
  workLight(ctx, [LX - 6, C, LZ + 4], { drop: 8, size: 1.8, intensity: 1000, distance: 46 });
  workLight(ctx, [x1 - 9, C, -52], { drop: 7, size: 1.6, intensity: 800, distance: 42 });
  workLight(ctx, [x1 - 9, C, -28], { drop: 7, size: 1.6, intensity: 800, distance: 42 });
  workLight(ctx, [x0 + 7, C, z1 - 4], { drop: 9, size: 1.4, intensity: 500, distance: 30, warm: true });

  // ---- animation: the lift cycles floor → +6 m → floor with dwell; the beacon rides with it
  ctx.animate((dt, t) => {
    const period = 24;
    const p = (t % period) / period;
    let k;
    if (p < 0.15) k = 0;
    else if (p < 0.45) k = (p - 0.15) / 0.3;
    else if (p < 0.6) k = 1;
    else if (p < 0.9) k = 1 - (p - 0.6) / 0.3;
    else k = 0;
    const e = k * k * (3 - 2 * k);
    liftGroup.position.y = F + e * LIFT_H;
  });
}
