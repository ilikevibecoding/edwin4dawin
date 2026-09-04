// Shuttle Docking Bay — box [-50,290,50,380], floor y = -20, 22 m tall, south of the main hangar through
// the wide blast door. A Lambda-class-style shuttle sits parked (wings folded, ramp down) on the raised
// landing pad that caps the closed SHUTTLE_WELL: the well's two door halves meet in a lit seam under the
// shuttle. Cargo loaders and containers on the east apron, the fuel point on the west, crew-shelter
// alcoves along both long walls, wall consoles by the door and a service gallery across the south wall.
import * as THREE from "three";
import { STD, SHUTTLE_WELL } from "../../../config/layout.js";
import { wallOpenings } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { console as impConsole, pipeRun, pointLightDesc, spotLightDesc, walkable, lockers, wallScreen, bench } from "../../impKit.js";
import { bayWall, bayCeiling, gallery, pillar, openStairs, deckMark, laneMarks, floorStencil, hoseReel, bowser, toolCart, wallLadder, fireStation, fuelTank, crateStack, statusBoard, floodMast } from "../../../hangar/hangarKit.js";
import { addShuttle } from "../../../hangar/shuttle.js";

const RIB = "impPaintedMetal";

// Cargo loader: a low tracked tug with a lift platform carrying a container
function cargoLoader(kit, pos, yaw, opts = {}) {
  const { seed = 1, lift = 0.6, collide = true } = opts;
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  // chassis on two track units
  box(RIB, 0, 0.55, 0.2, 2.2, 0.5, 3.6, { color: IMP.darkMetal, texel: 1 });
  for (const sx of [-1, 1]) {
    box("impRubber", sx * 1.25, 0.32, 0.2, 0.5, 0.64, 3.8, { color: IMP.rubber });
    box(RIB, sx * 1.25, 0.32, 0.2, 0.54, 0.3, 3.9, { color: IMP.trim, texel: 1 });
  }
  // driver's pulpit at the rear
  box(RIB, 0, 1.25, 1.9, 1.6, 1.0, 0.9, { color: IMP.wallMid, texel: 1 });
  box("glassDark", 0, 1.95, 1.9, 1.5, 0.5, 0.86);
  box(RIB, 0, 2.28, 1.9, 1.6, 0.1, 0.96, { color: IMP.trim, texel: 1 });
  box("blinkSparse", 0, 1.3, 1.44, 0.9, 0.2, 0.01, { uv: "keep" });
  box("emitAmber", 0.55, 2.36, 1.9, 0.24, 0.1, 0.24);
  // lift mast + platform + container
  for (const sx of [-1, 1]) box(RIB, sx * 0.95, 1.6, -1.55, 0.14, 2.2, 0.16, { color: IMP.hazardYellow, texel: 1 });
  box(RIB, 0, 0.85 + lift, -0.6, 2.0, 0.12, 2.0, { color: IMP.trim, texel: 1 });
  box("hazard", 0, 0.85 + lift, -0.6, 2.02, 0.08, 2.02, { uv: "world", texel: 1 });
  box(RIB, 0, 0.91 + lift + 0.65, -0.6, 1.7, 1.3, 1.7, { color: [IMP.wallMid, IMP.consoleDark, IMP.gunmetal][seed % 3], texel: 1 });
  box(RIB, 0, 0.91 + lift + 0.65, -0.6, 1.76, 0.12, 1.76, { color: IMP.trim, texel: 1 });
  box("impDecal", 0, 0.91 + lift + 0.75, -0.6 + 0.86, 0.6, 0.6, 0.004, { uv: "keep", uvRect: impDecalRect(6) });
  box("emitRed", 0, 0.5, -1.72, 0.3, 0.08, 0.02);
  if (collide) {
    const cs = [L(-1.5, 0, -2.0), L(1.5, 0, -2.0), L(-1.5, 0, 2.4), L(1.5, 0, 2.4)];
    kit.collider([Math.min(...cs.map((c) => c.x)), pos[1], Math.min(...cs.map((c) => c.z))], [Math.max(...cs.map((c) => c.x)), pos[1] + 2.4, Math.max(...cs.map((c) => c.z))], "loader");
  }
}

// Crew-shelter alcove in a wall frame at u (centre), w wide: blast-plated booth open to the bay with a
// bench against the wall, red standby band, hazard threshold and an evacuation placard. benchYaw turns
// the bench's back toward the wall (-π/2 west wall, π/2 east wall, π north, 0 south).
function shelter(frame, kit, u, w, benchYaw) {
  const d = 2.6;
  const h = 3.2;
  frame.box(RIB, u - w / 2, h / 2, d / 2, 0.3, h, d, { color: IMP.wallDark, texel: 0.5 });
  frame.box(RIB, u + w / 2, h / 2, d / 2, 0.3, h, d, { color: IMP.wallDark, texel: 0.5 });
  frame.box(RIB, u, h + 0.15, d / 2, w + 0.3, 0.3, d, { color: IMP.wallDark, texel: 0.5 });
  frame.box(RIB, u, h + 0.5, d / 2, w + 0.6, 0.4, d + 0.4, { color: IMP.trim, texel: 0.5 });
  frame.box("hazard", u, h + 0.34, d + 0.01, w + 0.3, 0.3, 0.02, { uv: "world", texel: 1 });
  frame.box("lightBandRed", u, h - 0.12, d - 0.4, w - 0.6, 0.08, 0.06, { uv: "keep" });
  frame.box("lightSoft", u, h - 0.02, d / 2, 0.3, 0.02, d - 0.8, { uv: "keep" });
  frame.quad("impDecal", u, 2.3, 0.02, 0.8, 0.8, { uvRect: impDecalRect(13) });
  frame.box("blinkSparse", u + w / 2 - 0.9, 1.6, 0.06, 0.6, 0.3, 0.01, { uv: "keep" });
  frame.box("hazard", u, 0.004, d + 0.2, w + 0.3, 0.008, 0.4, { uv: "world", texel: 1 });
  frame.collider(u - w / 2 - 0.15, u - w / 2 + 0.15, 0, h, 0, d, "shelter");
  frame.collider(u + w / 2 - 0.15, u + w / 2 + 0.15, 0, h, 0, d, "shelter");
  const p = frame.pos(u, 0, 0.45);
  bench(kit, [p.x, p.y, p.z], w - 1.0, benchYaw);
}

export function buildShuttleBay(kit, ctx) {
  const id = ctx.id;
  const room = ctx.room;
  const y = ctx.floorY; // -20
  const H = room.h; // 22
  const yC = y + H;
  const [x0, z0, x1, z1] = room.box;
  const t = STD.wallT;
  const W = SHUTTLE_WELL; // x -20..20, z 310..360
  const cx = (W.x0 + W.x1) / 2;
  const cz = (W.z0 + W.z1) / 2;

  // ---- enclosure ------------------------------------------------------------------------------
  const wallSpecs = {
    north: { from: [x0, z0 + t], to: [x1, z0 + t], inward: [0, 1] },
    south: { from: [x1, z1 - t], to: [x0, z1 - t], inward: [0, -1] },
    west: { from: [x0 + t, z1], to: [x0 + t, z0], inward: [1, 0] },
    east: { from: [x1 - t, z0], to: [x1 - t, z1], inward: [-1, 0] },
  };
  const frames = {};
  let wi = 0;
  for (const key of ["north", "south", "west", "east"]) {
    const w = wallSpecs[key];
    const { frame, length } = wallFrame(kit, w.from, w.to, y);
    frames[key] = { frame, length, spec: w };
    const openings = wallOpenings(id, room, key);
    bayWall(frame, length, H, { openings, ribPitch: 10, tiers: [0, 10, H], seed: 91 + wi++ * 7, tag: id + ":" + key, tone: IMP.wallMid, toneAlt: IMP.wallLight });
    for (const op of openings) {
      const u = (op.u0 + op.u1) / 2;
      frame.box(RIB, u, op.v1 + 0.9, 0.12, 6, 0.7, 0.1, { color: IMP.trim, texel: 1 });
      frame.box("emitBlue", u + 1.2, op.v1 + 0.9, 0.18, 0.5, 0.18, 0.02);
      frame.quad("impDecal", u - 1.0, op.v1 + 0.9, 0.18, 0.5, 0.5, { uvRect: impDecalRect(7) });
      frame.box("hazard", u, op.v1 + 0.35, 0.12, op.u1 - op.u0 + 1.6, 0.3, 0.05, { uv: "world", texel: 1 });
    }
  }
  const troughs = [];
  for (const z of [300, 320, 350, 370]) troughs.push([-30, z, 8, "x"], [30, z, 8, "x"]);
  troughs.push([0, 300, 10, "x"], [0, 370, 10, "x"]);
  bayCeiling(kit, room.box, yC, { girderPitch: 10, longitudinals: [-25, 25], panel: 10, troughs, seed: 8 });

  // ---- deck + the raised pad over the closed well -------------------------------------------------
  kit.boxMM("impDeck", [x0, y - 0.15, z0], [x1, y, z1], { color: IMP.wallDark, texel: 0.35 });
  walkable(ctx, x0, z0, x1, z1, y, id);
  for (let x = x0 + 10; x < x1; x += 10) kit.boxMM(RIB, [x - 0.05, y, z0], [x + 0.05, y + 0.006, z1], { color: IMP.trim });
  for (let z = z0 + 10; z < z1; z += 10) kit.boxMM(RIB, [x0, y, z - 0.05], [x1, y + 0.006, z + 0.05], { color: IMP.trim });
  // pad: door plates flush with the hull's shaft-wall tops (y + 0.5), one step up from the deck
  const lip = 1.2;
  const pY = y + 0.5;
  const px0 = W.x0 - lip;
  const px1 = W.x1 + lip;
  const pz0 = W.z0 - lip;
  const pz1 = W.z1 + lip;
  for (const sx of [-1, 1]) {
    const a = sx < 0 ? W.x0 : cx + 0.12;
    const b = sx < 0 ? cx - 0.12 : W.x1;
    kit.boxMM("impDeck", [a, y - 0.3, W.z0], [b, pY, W.z1], { color: IMP.wallMid, texel: 0.35 });
    // raised courses on each half, wheel-stop studs
    for (let z = W.z0 + 5; z < W.z1; z += 10) kit.boxMM(RIB, [a + 0.6, pY, z - 0.25], [b - 0.6, pY + 0.03, z + 0.25], { color: IMP.trim, texel: 0.5 });
  }
  // seam: dark groove, amber seam lights, door-edge beams
  kit.boxMM(RIB, [cx - 0.12, y - 0.3, W.z0], [cx + 0.12, pY - 0.05, W.z1], { color: IMP.trench, texel: 0.5 });
  for (let z = W.z0 + 4; z < W.z1; z += 8) kit.box("emitAmber", cx, pY - 0.02, z, 0.16, 0.04, 0.8);
  for (const sx of [-1, 1]) kit.boxMM("hazard", [cx + sx * 0.12 + (sx < 0 ? -0.8 : 0), pY, W.z0], [cx + sx * 0.12 + (sx < 0 ? 0 : 0.8), pY + 0.012, W.z1], { uv: "world", texel: 0.5 });
  // lip over the shaft walls with edge lights, hazard face and the walkable for the whole pad
  kit.boxMM(RIB, [px0, y, pz0], [px1, pY, W.z0], { color: IMP.trim, texel: 0.5 });
  kit.boxMM(RIB, [px0, y, W.z1], [px1, pY, pz1], { color: IMP.trim, texel: 0.5 });
  kit.boxMM(RIB, [px0, y, W.z0], [W.x0, pY, W.z1], { color: IMP.trim, texel: 0.5 });
  kit.boxMM(RIB, [W.x1, y, W.z0], [px1, pY, W.z1], { color: IMP.trim, texel: 0.5 });
  kit.boxMM("hazard", [px0 - 0.02, y, pz0 - 0.02], [px1 + 0.02, y + 0.5, pz0 + 0.02], { uv: "world", texel: 0.5 });
  kit.boxMM("hazard", [px0 - 0.02, y, pz1 - 0.02], [px1 + 0.02, y + 0.5, pz1 + 0.02], { uv: "world", texel: 0.5 });
  kit.boxMM("hazard", [px0 - 0.02, y, pz0], [px0 + 0.02, y + 0.5, pz1], { uv: "world", texel: 0.5 });
  kit.boxMM("hazard", [px1 - 0.02, y, pz0], [px1 + 0.02, y + 0.5, pz1], { uv: "world", texel: 0.5 });
  kit.boxMM("lightBand", [px0 + 0.3, pY + 0.001, pz0 + 0.3], [px1 - 0.3, pY + 0.02, pz0 + 0.5], { uv: "keep" });
  kit.boxMM("lightBand", [px0 + 0.3, pY + 0.001, pz1 - 0.5], [px1 - 0.3, pY + 0.02, pz1 - 0.3], { uv: "keep" });
  kit.boxMM("lightBand", [px0 + 0.3, pY + 0.001, pz0 + 0.5], [px0 + 0.5, pY + 0.02, pz1 - 0.5], { uv: "keep" });
  kit.boxMM("lightBand", [px1 - 0.5, pY + 0.001, pz0 + 0.5], [px1 - 0.3, pY + 0.02, pz1 - 0.5], { uv: "keep" });
  walkable(ctx, px0, pz0, px1, pz1, pY, "pad");
  // landing markings on the pad and the approach lanes on the deck
  deckMark(kit, cx, cz, pY, 20, 20, 1);
  for (const sz of [-1, 1]) deckMark(kit, cx, cz + sz * 19, pY, 6, 6, 3);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) deckMark(kit, cx + sx * 15, cz + sz * 19, pY, 6, 6, 2);
  laneMarks(kit, [0, z0 + 10.5], [0, pz0 - 0.6], y, 5);
  laneMarks(kit, [x1 - 4, cz], [px1 + 0.6, cz], y, 4);
  laneMarks(kit, [x0 + 4, cz], [px0 - 0.6, cz], y, 4);
  for (const [x, z] of [[-30, 300], [30, 300], [-30, 372], [30, 372]]) floorStencil(kit, x, y, z, 3, 10, Math.PI / 2);
  for (const [x, z] of [[-40, 335], [40, 335]]) floorStencil(kit, x, y, z, 2.6, 2);

  // ---- the shuttle ---------------------------------------------------------------------------------
  const shuttleYaw = 0.18;
  addShuttle(kit, [cx + 0.5, pY, cz + 1.5], shuttleYaw);
  // ground power / fuel connections: bowser on the west apron with hoses up onto the pad
  bowser(kit, [px0 - 5, y, cz + 9], Math.PI / 2 + 0.2);
  pipeRun(kit, [[px0 - 5.8, y + 1.3, cz + 10.8], [px0 - 2.5, y + 0.15, cz + 9.5], [px0 + 1.0, pY + 0.15, cz + 8.6], [cx - 2.2, pY + 0.15, cz + 6.0], [cx - 1.9, pY + 1.0, cz + 4.6]], 0.07, { mat: "impRubber", color: IMP.rubber, clamps: false });
  // power cart on the east side with a cable to the belly
  toolCart(kit, [px1 + 3.5, y, cz - 3], -Math.PI / 2 + 0.3, { seed: 21 });
  kit.box(RIB, px1 + 3.5, y + 0.6, cz + 1.0, 1.4, 1.2, 1.8, { color: IMP.consoleDark, texel: 1 });
  kit.box("blinkSparse", px1 + 2.79, y + 0.8, cz + 1.0, 0.01, 0.3, 1.2, { uv: "keep" });
  kit.box("hazard", px1 + 3.5, y + 0.06, cz + 1.0, 1.42, 0.12, 1.82, { uv: "world", texel: 1 });
  kit.collider([px1 + 2.7, y, cz], [px1 + 4.3, y + 1.3, cz + 2.0], "powerCart");
  pipeRun(kit, [[px1 + 2.8, y + 0.4, cz + 1.0], [px1 - 1.0, pY + 0.12, cz + 1.5], [cx + 2.6, pY + 0.12, cz + 3.6], [cx + 2.4, pY + 1.2, cz + 3.0]], 0.06, { mat: "impRubber", color: IMP.rubber, clamps: false });
  // wheel chocks around the skids
  for (const [dx, dz] of [[-1.5, 6.2], [1.5, 6.2], [0, -2.2]]) kit.box("impRubber", cx + 0.5 + dx, pY + 0.12, cz + 1.5 + dz + 1.0, 0.7, 0.24, 0.3, { color: IMP.rubber });

  // ---- east apron: cargo loaders + containers -----------------------------------------------------
  cargoLoader(kit, [33, y, 318], -Math.PI / 2 - 0.35, { seed: 1, lift: 0.8 });
  cargoLoader(kit, [38, y, 345], Math.PI / 2 + 0.25, { seed: 2, lift: 0.3 });
  crateStack(kit, [44, y, 300], 0.1, { seed: 71, n: 2 });
  crateStack(kit, [44, y, 303.6], -0.05, { seed: 74, n: 3, size: [2, 1.2, 1.6] });
  crateStack(kit, [40.5, y, 301], 0.25, { seed: 77, n: 1 });
  crateStack(kit, [45, y, 366], 0.05, { seed: 81, n: 2 });
  crateStack(kit, [41.5, y, 367.5], -0.2, { seed: 84, n: 2, size: [2, 1.2, 1.6] });
  crateStack(kit, [45.5, y, 372], 0.1, { seed: 87, n: 3, size: [1.8, 1.1, 1.5] });
  deckMark(kit, 43, 302, y, 9, 9, 2);
  deckMark(kit, 43.5, 369, y, 9, 9, 2);
  // ---- west apron: fuel point -----------------------------------------------------------------
  const wx = x0 + t;
  fuelTank(kit, [wx + 2.6, y, 318], 1.6, 8, "z", { tone: IMP.wallLight });
  fuelTank(kit, [wx + 2.6, y, 354], 1.6, 8, "z", { tone: IMP.wallMid });
  pipeRun(kit, [[wx + 0.9, y + 3.9, 312], [wx + 0.9, y + 3.9, 360]], 0.18, { color: IMP.steel });
  pipeRun(kit, [[wx + 0.9, y + 4.4, 312], [wx + 0.9, y + 4.4, 360]], 0.12, { color: IMP.gunmetal });
  for (const z of [318, 354]) pipeRun(kit, [[wx + 2.6, y + 3.7, z], [wx + 0.9, y + 3.9, z]], 0.12, { color: IMP.steel, clamps: false });
  hoseReel(kit, [wx + 1.2, y, 336], Math.PI / 2);
  hoseReel(kit, [wx + 1.2, y, 341], Math.PI / 2);
  toolCart(kit, [wx + 4.5, y, 330], 1.4, { seed: 22 });

  // ---- crew-shelter alcoves along both long walls, ladders, fire stations -------------------------
  for (const u of [16, 42, 68]) shelter(frames.west.frame, kit, u, 5, -Math.PI / 2);
  for (const u of [22, 66]) shelter(frames.east.frame, kit, u, 5, Math.PI / 2);
  wallLadder(frames.west.frame, 30, 0, 9.6, {});
  wallLadder(frames.east.frame, 40, 0, 9.6, {});
  fireStation(frames.west.frame, 8, { big: true });
  fireStation(frames.west.frame, 80, { big: true });
  fireStation(frames.east.frame, 10, { big: true });
  fireStation(frames.east.frame, 80, { big: true });

  // ---- north wall (door wall): wall consoles + boards each side of the blast door ------------------
  {
    const f = frames.north.frame;
    const zc = z0 + t + 0.45;
    for (const x of [-16, -12.5, 12.5, 16]) impConsole(kit, ctx, [x, y, zc], 0, { kind: "wall", width: 3.0, seed: 60 + Math.round(x), light: false });
    statusBoard(f, 22, 4.2, 8, 2.6, { seed: 61 });
    statusBoard(f, 78, 4.2, 8, 2.6, { seed: 62 });
    wallScreen(f, 33, 4.4, 3.0, 1.8, 1);
    wallScreen(f, 67, 4.4, 3.0, 1.8, 2);
    lockers(f, 6, 12, 2.1, { seed: 63 });
    lockers(f, 88, 94, 2.1, { seed: 64 });
    fireStation(f, 3, { big: true });
    fireStation(f, 97, { big: true });
  }
  // ---- south wall: service gallery at y + 9 with a stair at the east end, wall gear below ----------
  {
    const f = frames.south.frame;
    const gy = y + 9;
    const sx = x1 - t;
    gallery(kit, ctx, [sx, z1 - t], [x0 + t, z1 - t], [0, -1], gy, 3, { railGaps: [[1.1, 3.7]] });
    // stair up to the gallery's east end, climbing +z along the east wall (47 risers, 14.1 m run)
    const run = Math.round(9 / 0.19) * 0.3;
    const stairX = sx - 2.4;
    openStairs(kit, ctx, [stairX, z1 - t - 3 - run], [0, 1], 2.4, y, gy, { tread: 0.3 });
    pillar(kit, stairX - 1.15, z1 - t - 3 - run / 2, y, y + 4.5 - 0.55, 0.4);
    pillar(kit, stairX - 1.15, z1 - t - 3 - run * 0.25, y, y + 2.25 - 0.55, 0.4);
    statusBoard(f, 50, 4.6, 10, 3.0, { seed: 65 });
    lockers(f, 20, 28, 2.1, { seed: 66 });
    lockers(f, 72, 80, 2.1, { seed: 67 });
    for (const u of [12, 36, 64, 88]) f.quad("impDecal", u, 2.4, 0.02, 1.0, 1.0, { uvRect: impDecalRect([2, 9, 15, 4][(u / 4) % 4]) });
  }
  // floodlight masts at the pad corners
  const yawTo = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
  for (const [mx, mz] of [[px0 - 4, pz0 - 4], [px1 + 4, pz0 - 4], [px0 - 4, pz1 + 4], [px1 + 4, pz1 + 4]]) {
    floodMast(kit, ctx, [mx, y, mz], yawTo(mx, mz, cx, cz), { h: 7, intensity: 60, distance: 40, priority: 1 });
  }

  // ---- lights ------------------------------------------------------------------------------------
  spotLightDesc(ctx, 0xdfe8ff, 2200, 60, [cx - 22, yC - 1.2, cz - 10], [cx, pY, cz - 4], { angle: 0.7, penumbra: 0.5, shadow: true, priority: 2 });
  spotLightDesc(ctx, 0xdfe8ff, 2200, 60, [cx + 22, yC - 1.2, cz + 12], [cx, pY, cz + 4], { angle: 0.7, penumbra: 0.5, shadow: true, priority: 2 });
  pointLightDesc(ctx, 0xcfd9ff, 60, 40, [0, y + 9, 298], 1);
  pointLightDesc(ctx, 0xcfd9ff, 50, 36, [38, y + 9, 305], 0);
  pointLightDesc(ctx, 0xcfd9ff, 50, 36, [38, y + 9, 365], 0);
  pointLightDesc(ctx, 0xcfd9ff, 50, 36, [-38, y + 9, 335], 0);
  pointLightDesc(ctx, 0xa9c4ff, 40, 30, [0, y + 12, 374], 0);
  // shuttle engine glow spill
  pointLightDesc(ctx, 0x8fb4ff, 18, 14, [cx + 0.5, pY + 3.4, cz + 13], 0);

  // ---- views -------------------------------------------------------------------------------------
  ctx.view("shuttleBay", 0, y + STD.eye, 293.5, 180, -2);
  ctx.view("shuttleBay_ramp", -13, y + STD.eye, 318, 236, 4);
  ctx.view("shuttleBay_apron", 42, y + STD.eye, 350, 72, 2);
  // gallery view: not a ROOMS id on purpose, so the debug harness takes the floor from y (gallery level)
  ctx.views.shuttleBay_gallery = { x: 20, y: y + 9 + STD.eye, z: z1 - t - 1.5, yaw: 20, pitch: -12, room: "shuttleBay:gallery" };
}
