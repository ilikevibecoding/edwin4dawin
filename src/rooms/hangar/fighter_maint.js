// Fighter Maintenance & Refuelling — a long service hall beside the main hangar. Two heavy TIE maintenance
// cradles face the hangar arches (bay 1 empty with its clamps open, bay 2 holding a pair of spare solar-panel
// wings in a rack), an animated gantry crane rides rails under the ceiling, refuelling pumps with hoses sit
// against the back wall under a raised inspection catwalk, plus tool boards, diagnostic carts and part bins.
import * as THREE from "three";
import { Kit, prism, rng } from "../../core/kit.js";
import { Placer, railing, stairs, pipeRun, cableBundle, barrel, computerBank } from "../../core/props.js";
import { hazardBay, floorDecal, floorLine, strip, workLight, screenPanel, frameScreen, ledCluster, placeCrate, column, catwalk, gantryCrane, machineBlock, valveStack, louvreVent, workbench, toolRack, shelving, terminalKiosk, doorThroat, wallU, setLightLevel } from "../engineering/machinery.js";
import { DECAL, screenRect, ledRect } from "../../textures.js";

export const meta = { id: "fighter_maint", stream: "deck-rooms" };

// TIE wing outline (local XY, metres): elongated hexagon 6.4 tall × 4.5 wide, points top and bottom
const WING_H = 6.4;
const WING_W = 4.5;
const WING_PTS = [
  [0, WING_H / 2],
  [WING_W / 2, WING_H * 0.21],
  [WING_W / 2, -WING_H * 0.21],
  [0, -WING_H / 2],
  [-WING_W / 2, -WING_H * 0.21],
  [-WING_W / 2, WING_H * 0.21],
];

/**
 * Spare TIE solar-panel wing standing in the world YZ plane (normal ±X) centred at (wx, wy, wz):
 * black cell panel, rim frame, six radiating spokes, central pylon hub. `inner` = which side the pylon faces.
 */
function tieWing(kit, IMP, wx, wy, wz, { inner = 1 } = {}) {
  const P = (lx, ly) => [wx, wy + ly, wz - lx];
  // solar cell panel (two dark sheets with a thin lighter core so the edge reads as a laminate)
  kit.add("darkGloss", prism(WING_PTS, 0.05), { pos: [wx - 0.05, wy, wz], rot: [0, Math.PI / 2, 0], color: IMP.gloss });
  kit.add("darkGloss", prism(WING_PTS, 0.05), { pos: [wx + 0.05, wy, wz], rot: [0, Math.PI / 2, 0], color: IMP.gloss });
  kit.add("paintedMetal", prism(WING_PTS.map(([x, y]) => [x * 0.985, y * 0.985]), 0.06), { pos: [wx, wy, wz], rot: [0, Math.PI / 2, 0], color: IMP.plateDark, uv: "world", texel: 1 });
  // rim frame members
  for (let i = 0; i < 6; i++) {
    const [ax, ay] = WING_PTS[i];
    const [bx, by] = WING_PTS[(i + 1) % 6];
    const L = Math.hypot(bx - ax, by - ay);
    const a = Math.atan2(by - ay, bx - ax);
    const [mx, my] = [(ax + bx) / 2, (ay + by) / 2];
    kit.box("paintedMetal", ...P(mx, my), L + 0.1, 0.3, 0.34, { rot: [0, Math.PI / 2, a], color: IMP.black, texel: 1 });
    kit.box("metal", ...P(mx, my), L - 0.3, 0.12, 0.38, { rot: [0, Math.PI / 2, a], color: IMP.steelDark, texel: 1 });
  }
  // radiating spokes from the hub to the six corners + a horizontal spar
  for (let i = 0; i < 6; i++) {
    const [vx, vy] = WING_PTS[i];
    const L = Math.hypot(vx, vy);
    const a = Math.atan2(vy, vx);
    kit.box("paintedMetal", ...P(vx / 2, vy / 2), L - 0.4, 0.2, 0.26, { rot: [0, Math.PI / 2, a], color: IMP.plateDark, texel: 1 });
  }
  kit.box("paintedMetal", ...P(0, 0), WING_W - 0.5, 0.16, 0.24, { rot: [0, Math.PI / 2, 0], color: IMP.plateDark, texel: 1 });
  // hub: outer boss, inner pylon ring on the fighter side, bolts
  kit.cyl("paintedMetal", wx, wy, wz, 0.95, 0.5, "x", { color: IMP.black, segments: 24 });
  kit.cyl("paintedMetal", wx + inner * 0.55, wy, wz, 0.6, 0.6, "x", { color: IMP.plateDark, segments: 24 });
  kit.cyl("metal", wx + inner * 0.95, wy, wz, 0.32, 0.3, "x", { color: IMP.gunmetal, segments: 16 });
  kit.add("metal", new THREE.TorusGeometry(0.45, 0.05, 6, 24), { pos: [wx + inner * 0.86, wy, wz], rot: [0, Math.PI / 2, 0], color: IMP.steel });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    kit.cyl("metal", wx - inner * 0.27, wy + Math.sin(a) * 0.75, wz + Math.cos(a) * 0.75, 0.06, 0.08, "x", { color: IMP.steel, segments: 6 });
  }
  kit.collider([wx - 0.3, wy - WING_H / 2, wz - WING_W / 2], [wx + 0.3, wy + WING_H / 2, wz + WING_W / 2], "wing");
}

/** Wing rack: floor beam with V-cradles for two wings plus upper clamp posts. Wings at x = cx ± gap/2. */
function wingRack(kit, IMP, cx, F, cz, { gap = 2.2 } = {}) {
  const P = new Placer(kit, [cx, F, cz], 0);
  P.box("paintedMetal", 0, 0.2, 0, gap + 2.4, 0.4, WING_W + 1.2, { color: IMP.black, texel: 1 });
  P.box("hazard", 0, 0.42, 0, gap + 2.2, 0.06, WING_W + 1.0, { texel: 2 });
  P.collider([-(gap + 2.4) / 2, 0, -(WING_W + 1.2) / 2], [(gap + 2.4) / 2, 0.45, (WING_W + 1.2) / 2], "rack");
  for (const s of [-1, 1]) {
    const x = s * (gap / 2);
    // V cradle for the lower point
    for (const q of [-1, 1]) P.box("paintedMetal", x, 0.75, q * 0.55, 0.5, 0.6, 0.16, { color: IMP.plateDark, rot: [q * 0.7, 0, 0], texel: 1 });
    P.box("rubber", x, 0.62, 0, 0.5, 0.1, 0.5, { color: IMP.black });
    // clamp posts at the vertical rim edges
    for (const q of [-1, 1]) {
      P.box("paintedMetal", x, 2.2, q * (WING_W / 2 + 0.45), 0.24, 4.4, 0.24, { color: IMP.gunmetal, texel: 1 });
      P.box("paintedMetal", x, 4.0, q * (WING_W / 2 + 0.2), 0.36, 0.3, 0.4, { color: IMP.hazardYellow, texel: 1 });
      P.box("paintedMetal", x, 2.8, q * (WING_W / 2 + 0.2), 0.36, 0.3, 0.4, { color: IMP.hazardYellow, texel: 1 });
      P.collider([x - 0.15, 0, q * (WING_W / 2 + 0.45) - 0.15], [x + 0.15, 4.4, q * (WING_W / 2 + 0.45) + 0.15], "rackpost");
    }
    tieWing(kit, IMP, cx + x, F + 0.7 + WING_H / 2, cz, { inner: -s });
  }
  P.box("paintedMetal", 0, 4.45, WING_W / 2 + 0.45, gap + 0.5, 0.2, 0.24, { color: IMP.gunmetal, texel: 1 });
  P.box("paintedMetal", 0, 4.45, -(WING_W / 2 + 0.45), gap + 0.5, 0.2, 0.24, { color: IMP.gunmetal, texel: 1 });
  P.decal(0, 0.43, -(WING_W + 1.0) / 2 + 0.5, 0.7, 0.7, DECAL.SPEC_PLATE, { rot: [-Math.PI / 2, 0, 0] });
}

/**
 * TIE maintenance cradle: four heavy posts, top frame, two clamp rails per side at wing height with
 * hazard-striped pads, service platform with stairs on the back (−X) side, lights and cable drops.
 */
function cradle(ctx, cx, cz, { size = 9, h = 7.5, seed = 1, open = true } = {}) {
  const { kit, IMP } = ctx;
  const F = ctx.floor;
  const s = size / 2;
  const post = 0.7;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      column(kit, cx + sx * s, cz + sz * s, F, F + h, post, { color: IMP.plateDark, hazard: true });
      kit.box("paintedMetal", cx + sx * s, F + 0.25, cz + sz * s, post + 0.9, 0.5, post + 0.9, { color: IMP.black, texel: 1 });
    }
  // top frame + cross beams
  for (const sz of [-1, 1]) kit.box("paintedMetal", cx, F + h + 0.3, cz + sz * s, size + post, 0.6, 0.5, { color: IMP.plateDark, texel: 1 });
  for (const sx of [-1, 1]) kit.box("paintedMetal", cx + sx * s, F + h + 0.3, cz, 0.5, 0.6, size + post, { color: IMP.plateDark, texel: 1 });
  kit.box("paintedMetal", cx, F + h + 0.35, cz, 0.4, 0.5, size, { color: IMP.black, texel: 1 });
  strip(kit, [cx - s + 0.5, F + h - 0.02, cz - 0.2], [cx + s - 0.5, F + h, cz + 0.2], "emitWhiteSoft");
  // clamp rails along X on both Z sides at wing heights, with pads reaching inward
  for (const sz of [-1, 1]) {
    for (const y of [F + 2.4, F + 4.9]) {
      kit.box("paintedMetal", cx, y, cz + sz * (s - 0.35), size - 1.2, 0.36, 0.5, { color: IMP.gunmetal, texel: 1 });
      for (const dx of [-2.6, 0, 2.6]) {
        const reach = open ? 0.9 : 1.6;
        kit.box("paintedMetal", cx + dx, y, cz + sz * (s - 0.6 - reach / 2), 0.5, 0.3, reach, { color: IMP.plateDark, texel: 1 });
        kit.box("hazard", cx + dx, y, cz + sz * (s - 0.6 - reach), 0.52, 0.32, 0.14, { texel: 2 });
        kit.box("rubber", cx + dx, y, cz + sz * (s - 0.6 - reach - 0.1), 0.42, 0.24, 0.06, { color: IMP.black });
      }
      // hydraulic cylinders behind the rail
      for (const dx of [-1.3, 1.3]) kit.cyl("metal", cx + dx, y, cz + sz * (s - 0.1), 0.12, 0.5, "z", { color: IMP.steel, segments: 10 });
    }
    // rail support struts to the posts
    kit.box("paintedMetal", cx, F + 3.65, cz + sz * (s - 0.35), 0.3, 2.9, 0.3, { color: IMP.black, texel: 1 });
    kit.collider([cx - s + 0.6, F + 2.2, cz + sz * (s - 0.6) - (sz > 0 ? 0 : 0.5)], [cx + s - 0.6, F + 5.1, cz + sz * (s - 0.6) + (sz > 0 ? 0.5 : 0)], "clamp");
  }
  // service platform along the back (−X) side with stairs down toward −Z
  const px0 = cx - s + 0.45,
    px1 = cx - s + 2.4;
  const py = F + 2.2;
  catwalk(kit, [px0, cz - s + 0.4], [px1, cz + s - 0.4], py, { rails: ["xmin", "zmax"], gaps: [], grate: true });
  stairs(kit, { pos: [(px0 + px1) / 2, F, cz - s + 0.4 - 3.3], yaw: Math.PI, width: 1.8, rise: 2.2, stepH: 0.2 });
  for (const z of [cz - s + 1.0, cz, cz + s - 1.0]) column(kit, px1 - 0.2, z, F, py - 0.3, 0.16, { collide: false });
  // console on the platform
  screenPanel(kit, { pos: [px0 + 0.4, py + 0.9, cz + 1.2], yaw: -Math.PI / 2, w: 1.2, h: 0.7, index: 12 + (seed % 4), accent: "emitAmber", stand: true, collide: true });
  // hazard bay + bay code stencils
  hazardBay(kit, [cx - s - 1.6, cz - s - 1.6], [cx + s + 1.6, cz + s + 1.6], F, { w: 0.35 });
  floorDecal(kit, [cx + s + 3.2, cz - s - 0.2], F, 2.6, DECAL.BAY_CODE, Math.PI / 2);
  floorDecal(kit, [cx + s + 3.2, cz + s + 0.2], F, 2.6, DECAL.NUMBER0 + (seed % 4), Math.PI / 2);
  floorDecal(kit, [cx, cz], F, 5.0, DECAL.EMBLEM, 0);
  // cable drops from a ceiling boom to the top frame
  const boomY = ctx.ceil - 6;
  kit.box("paintedMetal", cx, boomY, cz, 1.0, 0.6, size, { color: IMP.black, texel: 1 });
  kit.box("paintedMetal", cx, (boomY + ctx.ceil) / 2, cz, 0.5, ctx.ceil - boomY, 0.5, { color: IMP.plateDark, texel: 1 });
  for (const dz of [-3, 0, 3]) {
    cableBundle(kit, { from: [cx - 0.4, boomY - 0.3, cz + dz], to: [cx - 0.2, F + h + 0.6, cz + dz], sag: 0.6, n: 2, r: 0.03 });
    pipeRun(kit, { points: [[cx + 0.4, boomY - 0.3, cz + dz], [cx + 0.4, F + h + 0.6, cz + dz]], r: 0.06, color: IMP.steelDark });
  }
  // status lamp cluster on the +X (hangar-side) post
  ledCluster(kit, { pos: [cx + s + 0.36 + 0.02, F + 2.0, cz - s], yaw: -Math.PI / 2, w: 0.5, h: 0.25, index: 6 + seed, accent: "emitAmber" });
}

/** Diagnostic cart: wheeled cabinet with an angled screen and trailing leads. Faces −Z. */
function diagCart(kit, IMP, { pos, yaw = 0, index = 5, seed = 1 }) {
  const P = new Placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.62, 0, 0.9, 0.8, 0.7, { color: IMP.plateDark, texel: 1 });
  P.box("paintedMetal", 0, 0.25, 0, 0.94, 0.06, 0.74, { color: IMP.black });
  P.box("paintedMetal", 0, 1.03, 0, 0.94, 0.06, 0.74, { color: IMP.black });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.cyl("rubber", sx * 0.36, 0.13, sz * 0.26, 0.13, 0.08, "x", { color: IMP.black, segments: 10 });
  P.box("metal", 0.55, 0.9, 0, 0.04, 0.6, 0.04, { color: IMP.steel });
  P.box("metal", 0.55, 1.2, 0, 0.04, 0.04, 0.6, { color: IMP.steel });
  P.box("paintedMetal", 0, 1.25, -0.05, 0.8, 0.45, 0.06, { color: IMP.black, rot: [-0.45, 0, 0] });
  P.box("screen", 0, 1.25, -0.085, 0.7, 0.36, 0.01, { rot: [-0.45, 0, 0], uv: "keep", uvRect: screenRect(index) });
  P.box("leds", -0.2, 0.75, -0.36, 0.4, 0.06, 0.01, { uv: "keep", uvRect: ledRect(seed % 16) });
  P.box("emitAmber", 0.3, 0.85, -0.36, 0.05, 0.05, 0.01);
  const a = P.world(0.4, 0.8, 0.3).toArray();
  const b = P.world(1.6, 0.02, 1.4).toArray();
  cableBundle(kit, { from: a, to: b, sag: 0.3, n: 2, r: 0.015 });
  P.collider([-0.47, 0, -0.37], [0.47, 1.45, 0.37], "cart");
}

/** Refuelling station on the back wall: pump housing, supply pipes with valves, hose reel + hose to a nozzle post. */
function refuelStation(ctx, wx, z, { nozzleAt, seed = 1 }) {
  const { kit, IMP } = ctx;
  const F = ctx.floor;
  machineBlock(kit, { pos: [wx + 1.0, F, z], yaw: -Math.PI / 2, size: [2.6, 2.2, 1.6], color: IMP.plateWarm, accent: "emitAmber", seed, stencil: DECAL.WARNING });
  // supply pipes down the wall into the pump
  pipeRun(kit, { points: [[wx + 0.35, F + 4.3, z - 2.4], [wx + 0.35, F + 4.3, z - 0.6], [wx + 0.35, F + 2.2, z - 0.6]], r: 0.16, color: IMP.plateBlue, clamps: 1.2 });
  pipeRun(kit, { points: [[wx + 0.35, F + 4.3, z + 2.4], [wx + 0.35, F + 4.3, z + 0.6], [wx + 0.35, F + 2.2, z + 0.6]], r: 0.12, color: IMP.steelDark, clamps: 1.2 });
  valveStack(kit, { pos: [wx + 0.5, F, z + 2.6], yaw: -Math.PI / 2, n: 2, r: 0.1, h: 1.8, wheel: IMP.red });
  // hose reel on the housing side and the hose along the floor to the nozzle post
  kit.cyl("paintedMetal", wx + 1.0, F + 1.0, z - 1.35, 0.55, 0.5, "z", { color: IMP.black, segments: 20 });
  kit.cyl("rubber", wx + 1.0, F + 1.0, z - 1.35, 0.42, 0.42, "z", { color: IMP.black, segments: 20 });
  kit.box("paintedMetal", wx + 1.0, F + 0.5, z - 1.35, 0.6, 1.0, 0.16, { color: IMP.gunmetal, texel: 1 });
  const [nx, nz] = nozzleAt;
  const rand = rng(seed);
  const pts = [[wx + 1.0, F + 1.0, z - 1.9]];
  const n = 5;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    pts.push([wx + 1.0 + (nx - wx - 1.0) * t + (i < n ? (rand() - 0.5) * 1.2 : 0), F + 0.07, z - 1.9 + (nz - z + 1.9) * t + (i < n ? (rand() - 0.5) * 1.2 : 0)]);
  }
  pipeRun(kit, { points: pts, r: 0.07, color: IMP.black, mat: "rubber" });
  // nozzle post
  kit.box("paintedMetal", nx, F + 0.5, nz, 0.3, 1.0, 0.3, { color: IMP.hazardYellow, texel: 1 });
  kit.box("paintedMetal", nx, F + 0.05, nz, 0.6, 0.1, 0.6, { color: IMP.black });
  kit.cyl("metal", nx, F + 1.05, nz, 0.08, 0.5, "y", { color: IMP.steel, segments: 8 });
  kit.box("emitAmber", nx + 0.16, F + 0.8, nz, 0.01, 0.06, 0.12);
  kit.collider([nx - 0.2, F, nz - 0.2], [nx + 0.2, F + 1.3, nz + 0.2], "nozzle");
  hazardBay(kit, [wx + 0.05, z - 2.3], [wx + 2.6, z + 3.2], F, { w: 0.25, mat: "hazardRed" });
  floorDecal(kit, [wx + 3.4, z], F, 1.4, DECAL.WARNING, Math.PI / 2);
}

export function build(ctx) {
  const { kit, IMP } = ctx;
  const F = ctx.floor; // -40
  const C = ctx.ceil; // -22
  const { x0, x1, z0, z1 } = ctx.inner;
  const CRADLE_X = -58;
  const BAYS = [-40, 10];

  ctx.shell({ floorMat: "deckGrey", floorColor: IMP.plateDark, walls: { xmin: { pilasterEvery: 8.9 }, xmax: { pilasterEvery: 0 }, zmin: { pilasterEvery: 8.8 }, zmax: { pilasterEvery: 8.8 } }, stripSpacing: 8, seed: 45 });
  doorThroat(ctx, "hg_maint_a");
  doorThroat(ctx, "hg_maint_b");

  // ---- two maintenance cradles facing the arches; bay 2 holds the spare wing pair
  cradle(ctx, CRADLE_X, BAYS[0], { seed: 0, open: true });
  cradle(ctx, CRADLE_X, BAYS[1], { seed: 1, open: true });
  wingRack(kit, IMP, CRADLE_X + 1.0, F, BAYS[1], { gap: 2.4 });
  // tow lanes from the arches to the bays
  for (const bz of BAYS) {
    floorLine(kit, [x1 - 0.3, bz - 3.0], [CRADLE_X + 6.6, bz - 3.0], F, { w: 0.15 });
    floorLine(kit, [x1 - 0.3, bz + 3.0], [CRADLE_X + 6.6, bz + 3.0], F, { w: 0.15 });
    floorDecal(kit, [x1 - 4.5, bz], F, 2.2, DECAL.ARROW, Math.PI / 2);
  }

  // ---- overhead gantry crane on rails along the hall (bridge animated between the bays)
  const craneY = C - 1.6;
  const bridgeKit = new Kit(ctx.materials);
  gantryCrane(kit, { x0: -72, x1: -48, z0: z0 + 3, z1: z1 - 3, y: craneY, trolleyX: -58, hookDrop: 7.5, bridgeKit });
  bridgeKit.box("paintedMetal", -58, craneY - 0.9, 0, 0.8, 0.2, 0.8, { color: IMP.black, texel: 1 });
  bridgeKit.box("emitWarmSoft", -58, craneY - 1.01, 0, 0.6, 0.02, 0.6, { uv: "keep" });
  const bridge = new THREE.Group();
  bridgeKit.build(bridge);
  bridge.position.z = -12;
  ctx.add(bridge);
  // the crane lamp rides with the bridge (re-parented into the animated group; local z = 0 on the bridge)
  const craneLamp = ctx.light(0xffd2a0, 260, 30, [-58, craneY - 1.4, 0]);
  bridge.add(craneLamp);

  // ---- back wall: inspection catwalk with two stair flights, refuelling stations and tool boards beneath
  const CW = F + 4.5;
  const STAIR_Z = [-22, 22];
  catwalk(kit, [x0 + 0.3, z0 + 3], [x0 + 2.7, z1 - 3], CW, { rails: ["xmax", "zmin", "zmax"], gaps: STAIR_Z.map((z) => ({ side: "xmax", from: z - 1.25, to: z + 1.25 })) });
  for (const z of STAIR_Z) stairs(kit, { pos: [x0 + 2.7 + 6.9, F, z], yaw: Math.PI / 2, width: 2.4, rise: 4.5, stepH: 0.2 });
  for (let z = z0 + 6; z < z1 - 3; z += 8) column(kit, x0 + 2.55, z, F, CW - 0.3, 0.3, { color: IMP.black, collide: false });
  strip(kit, [x0 + 2.72, CW - 0.2, z0 + 3], [x0 + 2.76, CW - 0.16, z1 - 3], "emitAmber");
  // catwalk fittings: wall screens + lockers seen from the walkway
  {
    const { frame } = ctx.wall("xmin");
    for (const z of [-44, -6, 16]) frameScreen(frame, wallU(ctx, "xmin", z), CW + 1.6, 2.6, 1.3, 12 + ((z + 60) % 3), { accent: "emitAmber" });
    frame.decal(wallU(ctx, "xmin", -30), CW + 1.7, 0.01, 1.4, 1.4, DECAL.EMBLEM);
    frame.decal(wallU(ctx, "xmin", 4), CW + 1.7, 0.01, 1.4, 1.4, DECAL.WARNING);
    louvreVent(kit, { pos: [x0 + 0.05, CW + 4.0, -52], yaw: -Math.PI / 2, w: 3.2, h: 1.6 });
    louvreVent(kit, { pos: [x0 + 0.05, CW + 4.0, 26], yaw: -Math.PI / 2, w: 3.2, h: 1.6 });
  }
  refuelStation(ctx, x0, BAYS[0] + 1.5, { nozzleAt: [CRADLE_X - 7.2, BAYS[0] - 1.5], seed: 3 });
  refuelStation(ctx, x0, BAYS[1] + 1.5, { nozzleAt: [CRADLE_X - 7.2, BAYS[1] - 1.5], seed: 4 });
  // fuel main along the wall feeding both pumps, from a separator unit at the forward end
  pipeRun(kit, { points: [[x0 + 0.35, F + 4.3, -54], [x0 + 0.35, F + 4.3, 26]], r: 0.16, color: IMP.plateBlue, clamps: 4 });
  machineBlock(kit, { pos: [x0 + 2.2, F, z0 + 2.6], yaw: Math.PI, size: [3.6, 2.6, 2.0], color: IMP.plateDark, accent: "emitAmber", seed: 21, stencil: DECAL.TEXT_B });
  for (let i = 0; i < 5; i++) barrel(kit, { pos: [x0 + 5.2 + (i % 3) * 0.9, F, z0 + 1.2 + Math.floor(i / 3) * 0.9], r: 0.4, h: 1.1, color: IMP.plateWarm });
  hazardBay(kit, [x0 + 4.4, z0 + 0.4], [x0 + 8.2, z0 + 3.2], F, { w: 0.2, mat: "hazardRed" });
  for (const z of [-30, -12, -4, 2]) toolRack(kit, { pos: [x0 + 0.3, F, z], yaw: -Math.PI / 2, w: 2.6, h: 1.6, base: 1.0, seed: 40 + z });

  // ---- middle zone between the bays: workbenches, diagnostic carts, part bins
  workbench(kit, { pos: [x0 + 5.2, F, -18], yaw: -Math.PI / 2, w: 3.4, seed: 7, accent: "emitAmber" });
  workbench(kit, { pos: [x0 + 5.2, F, -13.5], yaw: -Math.PI / 2, w: 3.4, seed: 8, accent: "emitAmber" });
  workbench(kit, { pos: [CRADLE_X + 2, F, -15], yaw: 0, w: 4.0, seed: 9, accent: "emitAmber" });
  diagCart(kit, IMP, { pos: [CRADLE_X + 8.5, F, -30], yaw: 0.4, index: 5, seed: 1 });
  diagCart(kit, IMP, { pos: [CRADLE_X - 8, F, -20], yaw: -1.1, index: 8, seed: 2 });
  diagCart(kit, IMP, { pos: [CRADLE_X + 8.2, F, 2.5], yaw: 2.6, index: 12, seed: 3 });
  diagCart(kit, IMP, { pos: [CRADLE_X - 8.5, F, 20], yaw: 1.9, index: 6, seed: 4 });
  {
    const rand = rng(77);
    // part bins: instanced crates in low stacks around the middle and the aft end
    const spots = [
      [-66, -26],
      [-64, -26],
      [-62, -26],
      [-66, -24],
      [-64, -24],
      [-52, -8],
      [-50, -8],
      [-52, -6],
      [-70, 25.2],
      [-68, 25.2],
      [-66, 25.2],
      [-70, 27],
      [-68, 27],
      [-64, 27],
      [-50, 24],
      [-48, 24],
      [-50, 26],
    ];
    for (const [x, z] of spots) {
      const h = 0.7 + rand() * 0.4;
      placeCrate(kit, [x + (rand() - 0.5) * 0.2, F, z + (rand() - 0.5) * 0.2], (rand() - 0.5) * 0.3, { size: [1.6, h, 1.6], color: rand() < 0.3 ? IMP.plateWarm : IMP.plateDark, band: rand() < 0.5 });
      if (rand() < 0.45) placeCrate(kit, [x, F + h, z], (rand() - 0.5) * 0.4, { size: [1.2, 0.7, 1.2], color: IMP.gunmetal, band: rand() < 0.5, collide: false });
    }
    hazardBay(kit, [-67.2, -27.2], [-60.8, -22.8], F, { w: 0.2 });
    hazardBay(kit, [-71.2, 24.0], [-62.8, 28.2], F, { w: 0.2 });
    hazardBay(kit, [-51.2, 22.8], [-46.8, 27.2], F, { w: 0.2 });
  }
  shelving(kit, { pos: [-56, F, z1 - 0.7], yaw: 0, w: 4.2, h: 2.8, levels: 3, seed: 5 });
  shelving(kit, { pos: [-61, F, z1 - 0.7], yaw: 0, w: 4.2, h: 2.8, levels: 3, seed: 6 });
  shelving(kit, { pos: [-56, F, z0 + 0.7], yaw: Math.PI, w: 4.2, h: 2.8, levels: 3, seed: 7 });
  terminalKiosk(kit, { pos: [CRADLE_X + 8.5, F, -14], yaw: -Math.PI / 2, accent: "emitAmber", index: 14 });
  computerBank(kit, { pos: [x1 - 0.62, F, -18], yaw: -Math.PI / 2, w: 3.2, h: 2.4, seed: 12, accent: "emitAmber" });
  computerBank(kit, { pos: [x1 - 0.62, F, -10], yaw: -Math.PI / 2, w: 3.2, h: 2.4, seed: 13, accent: "emitAmber" });

  // ---- hangar-side wall between and beyond the arches: emblem, bay boards, warning stencils
  {
    const { frame } = ctx.wall("xmax");
    frame.decal(wallU(ctx, "xmax", -15), 9.0, 0.01, 4.0, 4.0, DECAL.EMBLEM);
    frameScreen(frame, wallU(ctx, "xmax", -22), 3.6, 3.0, 1.6, 14, { accent: "emitAmber" });
    frameScreen(frame, wallU(ctx, "xmax", -8), 3.6, 3.0, 1.6, 12, { accent: "emitAmber" });
    frame.decal(wallU(ctx, "xmax", -27.5), 2.2, 0.01, 1.2, 1.2, DECAL.RESTRICTED);
    frame.decal(wallU(ctx, "xmax", -2.5), 2.2, 0.01, 1.2, 1.2, DECAL.WARNING);
    frame.decal(wallU(ctx, "xmax", 25), 9.0, 0.01, 3.0, 3.0, DECAL.BAY_CODE);
    frame.decal(wallU(ctx, "xmax", -55), 9.0, 0.01, 3.0, 3.0, DECAL.BAY_CODE);
    // hazard chevrons framing each arch
    for (const [a, b] of [[-50, -30], [0, 20]]) {
      frame.box("hazard", wallU(ctx, "xmax", (a + b) / 2), 12.4, 0.02, b - a + 1.2, 0.5, 0.04, { texel: 1 });
      frame.box("hazard", wallU(ctx, "xmax", a - 0.35), 6.0, 0.02, 0.5, 12.0, 0.04, { texel: 1 });
      frame.box("hazard", wallU(ctx, "xmax", b + 0.35), 6.0, 0.02, 0.5, 12.0, 0.04, { texel: 1 });
    }
  }
  {
    const { frame } = ctx.wall("zmax");
    frame.decal(wallU(ctx, "zmax", -62), 6.5, 0.01, 3.0, 3.0, DECAL.NUMBER1);
    louvreVent(kit, { pos: [-70, F + 9, z1 - 0.02], yaw: 0, w: 4.0, h: 2.0 });
    louvreVent(kit, { pos: [-52, F + 9, z1 - 0.02], yaw: 0, w: 4.0, h: 2.0 });
  }
  {
    const { frame } = ctx.wall("zmin");
    frame.decal(wallU(ctx, "zmin", -62), 6.5, 0.01, 3.0, 3.0, DECAL.NUMBER0);
    louvreVent(kit, { pos: [-70, F + 9, z0 + 0.02], yaw: Math.PI, w: 4.0, h: 2.0 });
    louvreVent(kit, { pos: [-52, F + 9, z0 + 0.02], yaw: Math.PI, w: 4.0, h: 2.0 });
  }
  // amber marker strips down the hangar-side wall base
  strip(kit, [x1 - 0.09, F + 0.6, z0 + 1], [x1 - 0.05, F + 0.65, -51], "emitAmber");
  strip(kit, [x1 - 0.09, F + 0.6, -29], [x1 - 0.05, F + 0.65, -1], "emitAmber");
  strip(kit, [x1 - 0.09, F + 0.6, 21], [x1 - 0.05, F + 0.65, z1 - 1], "emitAmber");

  // ---- lights: one shadowed spot over the wing rack, work lights over bay 1 / catwalk / ends, amber pumps
  ctx.spot(0xfff1dc, 800, 40, 0.6, [CRADLE_X + 2, C - 4, BAYS[1] - 5], [CRADLE_X + 1, F + 2, BAYS[1]], { penumbra: 0.6, shadow: true, mapSize: 1024 });
  workLight(ctx, [CRADLE_X, C, BAYS[0]], { drop: 8.5, size: 2.2, intensity: 1100, distance: 55 });
  workLight(ctx, [CRADLE_X, C, -15], { drop: 8.5, size: 2.0, intensity: 1100, distance: 50 });
  workLight(ctx, [x0 + 4.5, C, -10], { drop: 10, size: 1.6, intensity: 700, distance: 40, warm: true });
  workLight(ctx, [-60, C, 25], { drop: 9, size: 1.8, intensity: 900, distance: 45 });
  const pumps = BAYS.map((bz) => ctx.light(0xffb547, 140, 16, [x0 + 2.6, F + 2.8, bz + 1.5]));
  const pumpBase = pumps.map((l) => l.intensity);

  ctx.animate((dt, t) => {
    // crane bridge shuttles slowly between the two bays; its lamp travels with it
    bridge.position.z = -15 + 25 * Math.sin(t * 0.08);
    pumps.forEach((l, i) => setLightLevel(l, pumpBase[i], 0.9 + 0.1 * Math.sin(t * 3 + i)));
  });
}
