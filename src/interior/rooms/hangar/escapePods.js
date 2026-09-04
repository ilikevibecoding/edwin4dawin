// Emergency Escape Pod Bay — box [-100,120,-60,160], floor y = -20, 4 m tall, off the hangar's west
// wall. A muster hall inside the door (floor marking, benches, supply lockers, boards) and, past a row
// of columns, the boarding corridor along the outer wall: eight round pod hatches with red rims and
// status displays, red emergency light bands, evacuation stencils and benches between the hatches.
import { STD } from "../../../config/layout.js";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { pointLightDesc, walkable, lockers, wallScreen, bench, crate } from "../../impKit.js";
import { pillar, floorStencil, deckMark, statusBoard, fireStation } from "../../../hangar/hangarKit.js";

const RIB = "impPaintedMetal";

// Round escape-pod hatch in a wall frame: split door set in a red rim, viewport, latch dogs, numeral,
// status display and lamp, hazard threshold on the floor in front.
function podHatch(frame, kit, u, n, opts = {}) {
  const { r = 1.15, vC = 1.5, ready = true } = opts;
  frame.cylN(RIB, u, vC, -0.02, r, 0.28, { color: IMP.consoleDark, segments: 28, texel: 1 });
  frame.cylN(RIB, u, vC, 0.13, r + 0.12, 0.05, { color: IMP.red, segments: 28, texel: 1 });
  frame.cylN(RIB, u, vC, 0.14, r + 0.02, 0.04, { color: IMP.consoleDark, segments: 28, texel: 1 });
  frame.box(RIB, u, vC, 0.13, r * 2 - 0.1, 0.06, 0.02, { color: IMP.trim, texel: 1 });
  frame.box(RIB, u, vC + 0.5, 0.15, 0.36, 0.36, 0.03, { color: IMP.trim, texel: 1 });
  frame.box("glassDark", u, vC + 0.5, 0.165, 0.26, 0.26, 0.01);
  for (const a of [0.6, 2.5, 3.8, 5.7]) frame.box(RIB, u + Math.cos(a) * (r - 0.25), vC + Math.sin(a) * (r - 0.25), 0.15, 0.22, 0.22, 0.04, { color: IMP.gunmetal, texel: 1 });
  frame.box("hazard", u, vC - r - 0.22, 0.12, r * 2 + 0.4, 0.14, 0.02, { uv: "world", texel: 1 });
  // numeral, status display, lamp
  frame.quad("impDecal", u - 1.0, 3.25, 0.12, 0.7, 0.7, { uvRect: impDecalRect(2) });
  frame.box(RIB, u + 0.55, 3.25, 0.1, 1.4, 0.5, 0.08, { color: IMP.consoleDark, texel: 1 });
  frame.box("blinkSparse", u + 0.55, 3.25, 0.145, 1.2, 0.3, 0.01, { uv: "keep" });
  frame.box(ready ? "emitGreen" : "emitRed", u + 1.05, 3.6, 0.13, 0.14, 0.1, 0.03);
  frame.box("lightBandRed", u, 3.72, 0.08, 3.8, 0.1, 0.04, { uv: "keep" });
  // threshold on the deck
  const p0 = frame.pos(u - r - 0.2, 0, 0.1);
  const p1 = frame.pos(u + r + 0.2, 0, 0.9);
  kit.boxMM("hazard", [Math.min(p0.x, p1.x), p0.y + 0.004, Math.min(p0.z, p1.z)], [Math.max(p0.x, p1.x), p0.y + 0.012, Math.max(p0.z, p1.z)], { uv: "world", texel: 1 });
  void n;
}

export function buildEscapePods(kit, ctx) {
  const id = ctx.id;
  const room = ctx.room;
  const y = ctx.floorY; // -20
  const H = room.h; // 4
  const [x0, z0, x1, z1] = room.box;
  const t = STD.wallT;
  const walls = roomWalls(room);

  buildShell(kit, ctx, id, room, {
    skip: ["floor"],
    wall: { pitch: 5, bandMat: "lightBandRed", tone: IMP.wallMid, toneAlt: IMP.wallLight, styles: { plain: 0.62, control: 0.1, vent: 0.14, hatch: 0.04, pipes: 0.1 } },
    walls: { west: { styles: { plain: 1 }, band: false } },
    ceiling: { lightPitch: 8, bandMat: "lightBandRed", panelW: 2.5 },
  });
  // deck with a gloss walk strip from the door to the corridor
  kit.boxMM("impDeck", [x0, y - 0.12, z0], [x1, y, z1], { color: IMP.wallDark, texel: 0.5 });
  kit.boxMM("impGloss", [x0 + 2, y - 0.001, 139.2], [x1, y + 0.006, 140.8], { color: IMP.white, texel: 0.25 });
  walkable(ctx, x0, z0, x1, z1, y, id);

  // ---- boarding corridor along the west wall -------------------------------------------------------
  const west = walls.west;
  const { frame: wf } = wallFrame(kit, west.from, west.to, y);
  const hatchUs = [];
  for (let k = 0; k < 8; k++) hatchUs.push(2.5 + k * 5);
  hatchUs.forEach((u, i) => podHatch(wf, kit, u, 0, { ready: i !== 5 }));
  // benches between hatch pairs against the west wall, evacuation stencils on the deck
  for (const u of [10, 20, 30]) {
    const p = wf.pos(u, 0, 0.95);
    bench(kit, [p.x, p.y, p.z], 2.2, -Math.PI / 2);
  }
  for (const u of [5, 15, 25, 35]) {
    const p = wf.pos(u, 0, 3.2);
    floorStencil(kit, p.x, y, p.z, 1.6, 7, Math.PI / 2);
  }
  // column row with a header beam and red band separating the corridor from the hall
  const colX = -86;
  for (const z of [124, 132, 148, 156]) pillar(kit, colX, z, y, y + H - 0.02, 0.5, { tone: IMP.trim });
  kit.boxMM(RIB, [colX - 0.45, y + H - 0.7, z0 + t], [colX + 0.45, y + H - 0.02, z1 - t], { color: IMP.trim, texel: 0.5 });
  kit.boxMM("lightBandRed", [colX - 0.2, y + H - 0.74, z0 + 1], [colX + 0.2, y + H - 0.7, z1 - 1], { uv: "keep" });
  kit.boxMM("hazard", [colX - 0.46, y + H - 1.0, z0 + t], [colX + 0.46, y + H - 0.7, z1 - t], { uv: "world", texel: 1 });
  // half-height partitions with placards between the outer columns
  for (const [za, zb] of [[z0 + t, 124 - 0.25], [156 + 0.25, z1 - t]]) {
    kit.boxMM(RIB, [colX - 0.15, y, za], [colX + 0.15, y + 1.2, zb], { color: IMP.wallDark, texel: 1 });
    kit.boxMM("impMetal", [colX - 0.18, y + 1.2, za], [colX + 0.18, y + 1.26, zb], { color: IMP.steel });
    kit.collider([colX - 0.2, y, za], [colX + 0.2, y + 1.3, zb], "partition");
  }
  // corridor floor: lane edge along the columns, deck arrows toward the hatches
  deckMark(kit, colX - 2.0, 140, y, 2, 38, 0);
  for (const z of [128, 140, 152]) floorStencil(kit, -92, y, z, 1.4, 14, Math.PI / 2);

  // ---- muster hall ---------------------------------------------------------------------------------
  const mx = -72;
  const mz = 140;
  const mh = 6;
  const s = 0.3;
  kit.boxMM("hazard", [mx - mh, y + 0.004, mz - mh], [mx + mh, y + 0.012, mz - mh + s], { uv: "world", texel: 1 });
  kit.boxMM("hazard", [mx - mh, y + 0.004, mz + mh - s], [mx + mh, y + 0.012, mz + mh], { uv: "world", texel: 1 });
  kit.boxMM("hazard", [mx - mh, y + 0.004, mz - mh], [mx - mh + s, y + 0.012, mz + mh], { uv: "world", texel: 1 });
  kit.boxMM("hazard", [mx + mh - s, y + 0.004, mz - mh], [mx + mh, y + 0.012, mz + mh], { uv: "world", texel: 1 });
  floorStencil(kit, mx, y, mz, 4.2, 4);
  for (const [dx, dz, idx] of [[-4, -4, 2], [4, -4, 2], [-4, 4, 2], [4, 4, 2]]) floorStencil(kit, mx + dx, y, mz + dz, 1.4, idx);
  for (const [dx, dz] of [[0, -4.8], [0, 4.8]]) floorStencil(kit, mx + dx, y, mz + dz, 1.8, 15);
  // benches back to back on the hall's centre line north and south of the marking
  for (const z of [131, 149]) {
    bench(kit, [mx, y, z - 0.3], 5, Math.PI);
    bench(kit, [mx, y, z + 0.3], 5, 0);
  }
  // supply lockers, boards and stencils on the north / south walls; lockers + boards flanking the door
  {
    const n = walls.north;
    const { frame } = wallFrame(kit, n.from, n.to, y);
    lockers(frame, 16, 24, 2.2, { seed: 5 });
    lockers(frame, 27, 33, 2.2, { seed: 6 });
    statusBoard(frame, 36, 2.1, 4, 1.6, { seed: 7 });
    frame.quad("impDecal", 25.5, 3.1, 0.12, 0.9, 0.9, { uvRect: impDecalRect(13) });
    frame.quad("impDecal", 8, 2.2, 0.12, 1.0, 1.0, { uvRect: impDecalRect(7) });
    fireStation(frame, 12, {});
  }
  {
    const sw = walls.south;
    const { frame } = wallFrame(kit, sw.from, sw.to, y);
    lockers(frame, 8, 14, 2.2, { seed: 8 });
    lockers(frame, 17, 23, 2.2, { seed: 9 });
    wallScreen(frame, 4.5, 2.1, 2.4, 1.4, 0);
    frame.quad("impDecal", 15.5, 3.1, 0.12, 0.9, 0.9, { uvRect: impDecalRect(13) });
    frame.quad("impDecal", 30, 2.2, 0.12, 1.0, 1.0, { uvRect: impDecalRect(7) });
    fireStation(frame, 27, {});
  }
  {
    const e = walls.east;
    const { frame } = wallFrame(kit, e.from, e.to, y);
    statusBoard(frame, 8, 2.1, 5, 1.6, { seed: 10 });
    statusBoard(frame, 32, 2.1, 5, 1.6, { seed: 11 });
    frame.quad("impDecal", 15.5, 3.3, 0.12, 0.8, 0.8, { uvRect: impDecalRect(13) });
    frame.quad("impDecal", 24.5, 3.3, 0.12, 0.8, 0.8, { uvRect: impDecalRect(11) });
  }
  // supply crates in the corners of the hall
  crate(kit, [-62.5, y, 122.5], [1.6, 1.0, 1.2], { seed: 31, yaw: 0.1 });
  crate(kit, [-62.5, y + 1.0, 122.5], [1.3, 0.8, 1.0], { seed: 32, yaw: -0.1, collide: false });
  crate(kit, [-64.4, y, 122.7], [1.4, 0.9, 1.2], { seed: 33, yaw: 0.05 });
  crate(kit, [-62.5, y, 157.5], [1.6, 1.0, 1.2], { seed: 34, yaw: -0.05 });
  crate(kit, [-64.4, y, 157.3], [1.4, 0.9, 1.2], { seed: 35, yaw: 0.2 });

  // ---- lights: red emergency along the corridor, cool fill in the hall -------------------------------
  for (const z of [127, 140, 153]) pointLightDesc(ctx, IMP.red, 9, 14, [-93, y + 3.6, z], z === 140 ? 1 : 0);
  pointLightDesc(ctx, 0xbfd0ff, 16, 18, [-72, y + 3.6, 140], 1);
  pointLightDesc(ctx, 0xbfd0ff, 12, 16, [-72, y + 3.6, 127], 0);
  pointLightDesc(ctx, 0xbfd0ff, 12, 16, [-72, y + 3.6, 153], 0);
  pointLightDesc(ctx, 0xbfd0ff, 10, 14, [-63, y + 3.6, 140], 0);

  // ---- views ---------------------------------------------------------------------------------------
  ctx.view("escapePods", -62.5, y + STD.eye, 140, 90, -3);
  ctx.view("escapePods_row", -92.5, y + STD.eye, 157, 0, -2);
}
