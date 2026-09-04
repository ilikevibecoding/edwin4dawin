// Maintenance & Repair Bay: a heavy turbolaser actuator sits half stripped on trestles under a
// travelling gantry crane (the bridge creeps along its runway with a removed armour ring on the hook),
// diagnostic stations face it; workbenches with tool boards line the north wall under a jib hoist that
// serves a lift motor on a stand; parts racks (instanced) fill the east side; a screened welding bay
// flickers in the south-west corner and four droid charging alcoves line the south wall. Bright, even
// work light — the one place on the deck where you can see what you are doing.
import * as THREE from "three";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { console as impConsole, chair, ceilingLight, pointLightDesc, spotLightDesc, pipeRun, wallScreen, lockers, table, crate, column, rng } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { addEngMaterials } from "./engMaterials.js";
import { miniKit, partsRackPrefab, instancePrefab, workbench, droid, gasCylinder, toolCart, craneRails, craneBridge, ibeam, hazardKerb, hazardBand, floorDecal, deckMark, relayCabinet, cableTray, screenBank, valve, stain, yawQ } from "./engKit.js";

export function buildMaintenance(kit, ctx) {
  addEngMaterials(ctx.mats);
  const { room, floorY: y, id } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const T = STD.wallT;
  const rand = rng(83);

  buildShell(kit, ctx, id, room, {
    wall: { pitch: 4, tone: IMP.wallMid, toneAlt: IMP.wallLight, bandMat: "lightBand", styles: { plain: 0.35, control: 0.15, vent: 0.15, hatch: 0.15, pipes: 0.15, screen: 0.05 } },
    ceiling: { lights: false, panelW: 2.5, tone: IMP.wallDark },
    floor: { tone: IMP.wallDark },
  });
  const walls = roomWalls(room);

  // ------------------------------------------------------------ gantry crane: runway on columns, creeping bridge
  const RX0 = x0 + T + 4.6;
  const RX1 = x1 - T - 4.6;
  const RY = y + h - 1.4;
  craneRails(kit, z0 + 1.5, z1 - 1.5, RX0, RX1, RY, "z", { brackets: false, h: 0.6, w: 0.34 });
  for (const rx of [RX0, RX1]) for (const cz of [618.5, 627.5, 640.5, 651.5]) column(kit, rx, cz, y, RY - 0.3, { w: 0.5, d: 0.5, lit: false });
  const ACT = { x: 23.5, z: 638.5 };
  {
    const tx = 18.2 - (RX0 + RX1) / 2; // trolley parked west of the actuator's breech
    const bridge = miniKit(ctx.mats, (k) => {
      craneBridge(k, RX1 - RX0, RY + 0.6, 0, { cx: 0, tx, drop: 1.3, girder: 0.7 });
      // the removed armour ring, slung from the hook (bottom stays above head height)
      const hy = RY + 0.6 - 1.3 - 0.75;
      k.add("impMetal", new THREE.TorusGeometry(1.15, 0.14, 8, 28), { pos: [tx, hy - 0.3 - 1.15, 0], rot: [0, Math.PI / 2, 0], color: IMP.gunmetal, uv: "scale", uvScale: [6, 1] });
      k.add("impMetal", new THREE.BoxGeometry(0.06, 0.6, 0.06), { pos: [tx, hy - 0.3, 0], color: IMP.steel });
    });
    bridge.position.set((RX0 + RX1) / 2, 0, ACT.z);
    ctx.add(bridge);
    ctx.animate((dt, t) => {
      bridge.position.z = ACT.z + 5.5 * Math.sin(t * 0.11);
    });
  }

  // ------------------------------------------------------------ turbolaser actuator, half stripped, on trestles
  {
    const { x: ax, z: az } = ACT;
    const R = 1.3;
    const cy = y + 1.0 + R;
    const X0 = ax - 3.5;
    const X1 = ax + 3.5;
    deckMark(kit, ax, y, az, 10.5, 6.2, 2, 0);
    for (const tx of [X0 + 1.0, X1 - 1.0]) {
      kit.box("impPaintedMetal", tx, y + 0.55, az, 0.5, 0.9, 3.2, { color: IMP.hazardYellow, texel: 1 });
      for (const s of [-1, 1]) kit.box("impPaintedMetal", tx, y + 0.1, az + s * 1.3, 1.1, 0.2, 0.5, { color: IMP.trim, texel: 1 });
      kit.add("impPaintedMetal", new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.5, 20, 1, true, Math.PI * 1.12, Math.PI * 0.76), { pos: [tx, cy, az], rot: [0, 0, Math.PI / 2], color: IMP.trim, uv: "scale", uvScale: [4, 1] });
    }
    // breech end: full housing with armour rings and a big mounting flange
    const xm = ax - 0.3;
    kit.cyl("impMetal", (X0 + xm) / 2, cy, az, R, xm - X0, "x", { color: IMP.gunmetal, segments: 26, texel: 0.5 });
    for (let rx = X0 + 0.5; rx < xm - 0.3; rx += 0.9) kit.cyl("impPaintedMetal", rx, cy, az, R + 0.14, 0.3, "x", { color: IMP.trim, segments: 26 });
    kit.cyl("impPaintedMetal", X0 - 0.15, cy, az, R + 0.5, 0.3, "x", { color: IMP.wallDark, segments: 26 });
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      kit.box("impMetal", X0 - 0.32, cy + Math.cos(a) * (R + 0.3), az + Math.sin(a) * (R + 0.3), 0.06, 0.16, 0.16, { color: IMP.steel });
    }
    kit.cyl("impMetal", X0 - 0.6, cy, az, 0.5, 0.6, "x", { color: IMP.steel, segments: 16 });
    // muzzle end: stripped to the ram cylinders and the field coil
    kit.cyl("impPaintedMetal", xm, cy, az, R + 0.06, 0.16, "x", { color: IMP.wallDark, segments: 26 });
    kit.cyl("impMetal", (xm + X1) / 2, cy, az, 0.55, X1 - xm, "x", { color: IMP.steel, segments: 18, texel: 0.5 });
    for (const a of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]) {
      kit.cyl("impMetal", (xm + X1) / 2, cy + Math.sin(a) * 0.95, az + Math.cos(a) * 0.95, 0.17, X1 - xm - 0.2, "x", { color: IMP.gunmetal, segments: 12 });
      kit.cyl("impMetal", X1 - 0.3, cy + Math.sin(a) * 0.95, az + Math.cos(a) * 0.95, 0.09, 0.9, "x", { color: IMP.steel, segments: 10 });
    }
    for (let rx = xm + 0.5; rx < X1 - 0.3; rx += 0.45) kit.add("impMetal", new THREE.TorusGeometry(0.72, 0.06, 6, 24), { pos: [rx, cy, az], rot: [0, Math.PI / 2, 0], color: IMP.amber, uv: "scale", uvScale: [4, 1] });
    kit.cyl("impPaintedMetal", X1 + 0.1, cy, az, R, 0.2, "x", { color: IMP.wallDark, segments: 26 });
    kit.box("blinkSparse", X1 + 0.21, cy + 0.3, az, 0.004, 0.3, 0.8, { uv: "keep" });
    kit.box("emitAmber", X1 + 0.21, cy - 0.4, az, 0.004, 0.06, 0.6);
    // removed housing shells leaning on the far trestle, ring segments and fasteners on the deck
    for (const s of [-1, 1]) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, s * 0.25 + Math.PI / 2));
      kit.add("impMetal", new THREE.CylinderGeometry(R, R, 2.6, 20, 1, true, Math.PI * 1.5, Math.PI), { pos: [X1 - 1.0 + s * 0.9, y + 1.25, az + 2.9], quat: q, color: IMP.gunmetal, uv: "scale", uvScale: [4, 1] });
    }
    kit.collider([X1 - 3.0, y, az + 1.9], [X1 + 1.0, y + 2.6, az + 3.3], "shells");
    for (let i = 0; i < 3; i++) kit.add("impPaintedMetal", new THREE.CylinderGeometry(R + 0.14, R + 0.14, 0.3, 20, 1, true, Math.PI * (1.2 + i * 0.1), Math.PI * 0.6), { pos: [X0 + 1.4 + i * 0.8, y + 0.15, az - 2.6], rot: [0, 0.3 * i, 0], color: IMP.trim, uv: "scale", uvScale: [4, 1] });
    kit.collider([X0 + 0.9, y, az - 3.4], [X0 + 3.4, y + 0.8, az - 1.9], "ringSegments");
    stain(kit, [ax + 1.5, y, az], 2.4, { rot: 0.5 });
    kit.collider([X0 - 0.9, y, az - 1.7], [X1 + 0.3, y + 3.0, az + 1.7], "actuator");
    // diagnostic stations facing the actuator, cabled into the breech end
    for (const cz of [az - 1.6, az + 1.2]) {
      impConsole(kit, ctx, [X0 - 4.6, y, cz], -Math.PI / 2, { kind: "station", width: 1.5, screens: 2, seed: 200 + cz, light: false });
      pipeRun(kit, [[X0 - 3.9, y + 0.15, cz], [X0 - 1.4, y + 0.15, cz], [X0 - 1.4, y + 0.15, az], [X0 - 0.9, cy - 0.6, az]], 0.04, { mat: "impRubber", color: IMP.rubber, clamps: false });
    }
    chair(kit, [X0 - 5.5, y, az - 1.6], -Math.PI / 2);
    toolCart(kit, [X0 - 1.6, y, az + 2.6], -0.4, { seed: 9 });
    toolCart(kit, [X1 + 2.4, y, az - 1.8], 1.2, { seed: 10 });
    floorDecal(kit, X0 - 4.6, y, az + 3.4, 1.2, 3, Math.PI / 2);
  }

  // ------------------------------------------------------------ north wall: workbenches, tool boards, jib hoist + lift motor
  const benchX = [x0 + T + 2.2, x0 + T + 6.0, x0 + T + 9.8, x0 + T + 13.6];
  for (let i = 0; i < benchX.length; i++) workbench(kit, [benchX[i], y, z0 + T + 0.56], Math.PI, 3.4, { seed: 210 + i });
  hazardKerb(kit, [benchX[0] - 1.7, z0 + T + 1.5], [benchX[3] + 1.7, z0 + T + 1.5], y, { w: 0.2, h: 0.04 });
  {
    // jib crane: column, slewing arm with a chain block over the lift-motor stand
    const jx = 23.5;
    const jz = z0 + T + 0.8;
    const jy = y + 4.6;
    kit.cyl("impPaintedMetal", jx, y + 0.1, jz, 0.55, 0.2, "y", { color: IMP.trim, segments: 16 });
    kit.cyl("impMetal", jx, (y + jy) / 2, jz, 0.22, jy - y, "y", { color: IMP.gunmetal, segments: 14 });
    ibeam(kit, [jx, jy - 0.35, jz], [jx, jy - 0.35, jz + 4.2], { h: 0.4, w: 0.22, color: IMP.hazardYellow });
    kit.box("impPaintedMetal", jx, jy - 0.35, jz + 3.2, 0.5, 0.6, 0.6, { color: IMP.trim, texel: 1 });
    kit.cyl("impMetal", jx, jy - 0.35 - 0.3 - 0.9, jz + 3.2, 0.02, 1.8, "y", { color: IMP.steel, segments: 6 });
    kit.box("impPaintedMetal", jx, jy - 2.5, jz + 3.2, 0.3, 0.4, 0.2, { color: IMP.hazardYellow, texel: 1 });
    kit.add("impMetal", new THREE.TorusGeometry(0.18, 0.04, 6, 12, Math.PI * 1.4), { pos: [jx, jy - 2.9, jz + 3.2], rot: [0, 0, Math.PI * 0.8], color: IMP.steel, uv: "scale", uvScale: [2, 1] });
    kit.collider([jx - 0.55, y, jz - 0.55], [jx + 0.55, jy, jz + 0.55], "jib");
    // lift motor on a stand, top cover off, winding exposed; the cover on the deck beside it
    const mx = jx;
    const mz = jz + 3.2;
    kit.box("impPaintedMetal", mx, y + 0.45, mz, 1.6, 0.9, 1.6, { color: IMP.trim, texel: 1 });
    kit.box("impMetal", mx, y + 0.92, mz, 1.7, 0.06, 1.7, { color: IMP.steel });
    kit.cyl("impMetal", mx, y + 0.95 + 0.55, mz, 0.62, 1.1, "y", { color: IMP.gunmetal, segments: 20, texel: 0.5 });
    kit.cyl("impMetal", mx, y + 2.05 + 0.2, mz, 0.42, 0.4, "y", { color: IMP.amber, segments: 20, texel: 0.5 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      kit.box("impMetal", mx + Math.cos(a) * 0.5, y + 2.25, mz + Math.sin(a) * 0.5, 0.12, 0.45, 0.06, { color: IMP.steel, rot: [0, -a, 0] });
    }
    kit.cyl("impMetal", mx, y + 2.5, mz, 0.08, 0.5, "y", { color: IMP.steel, segments: 8 });
    kit.cyl("impPaintedMetal", mx + 1.6, y + 0.06, mz + 0.4, 0.64, 0.12, "y", { color: IMP.wallDark, segments: 20 });
    kit.collider([mx - 0.85, y, mz - 0.85], [mx + 0.85, y + 2.5, mz + 0.85], "liftMotor");
    kit.collider([mx + 0.95, y, mz - 0.25], [mx + 2.25, y + 0.15, mz + 1.05], "cover");
    floorDecal(kit, mx + 2.6, y, mz + 1.4, 1.0, 6);
  }
  {
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    cableTray(frame, 1.0, w.length - 1.0, 4.6, { n: 0.5, cables: 4 });
    wallScreen(frame, w.u(29), 2.6, 1.8, 1.0, 1);
    relayCabinet(frame, w.u(32.5), 0, 2.4, 2.2, 220);
    lockers(frame, w.u(35), w.u(41), 2.1, { seed: 27 });
    frame.quad("impDecal", w.u(26), 2.2, 0.064, 0.9, 0.9, { uvRect: impDecalRect(14) });
  }

  // ------------------------------------------------------------ east side: instanced parts racks
  {
    const rack = partsRackPrefab(ctx.mats, { seed: 31 });
    const xf = [];
    const rx = x1 - T - 0.55;
    for (let z = 616.2; z < 631; z += 2.25) xf.push({ pos: [rx, y, z], quat: yawQ(-Math.PI / 2) });
    for (let z = 639.5; z < 654; z += 2.25) xf.push({ pos: [rx, y, z], quat: yawQ(-Math.PI / 2) });
    // free-standing double row
    const dx = 36.0;
    for (let z = 616.5; z < 627; z += 2.25) {
      xf.push({ pos: [dx - 0.52, y, z], quat: yawQ(Math.PI / 2) });
      xf.push({ pos: [dx + 0.52, y, z], quat: yawQ(-Math.PI / 2) });
    }
    instancePrefab(kit, rack, xf);
    kit.collider([rx - 0.55, y, 615.1], [x1, y + 3.0, 630.8], "racks");
    kit.collider([rx - 0.55, y, 638.4], [x1, y + 3.0, 654.1], "racks");
    kit.collider([dx - 1.1, y, 615.4], [dx + 1.1, y + 3.0, 626.9], "racks");
    // bay numerals and a lane between the rows
    deckMark(kit, dx + 3.6, y, 621.5, 2.4, 2.4, 3, Math.PI / 2);
    deckMark(kit, dx - 3.6, y, 621.5, 2.4, 2.4, 3, -Math.PI / 2);
    deckMark(kit, (dx + rx) / 2, y, 623, 12, 3.4, 0, Math.PI / 2);
    crate(kit, [dx + 3.4, y, 628.8], [1.4, 1.0, 1.1], { seed: 40 });
    crate(kit, [dx + 3.4, y + 1.0, 628.8], [1.1, 0.7, 0.9], { seed: 41, yaw: 0.2 });
    crate(kit, [dx - 3.2, y, 628.6], [1.2, 0.9, 1.0], { seed: 42, yaw: -0.15 });
  }
  {
    const w = walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    screenBank(frame, w.u(634.8), 2.8, 3, 2, 1.2, 0.75, 33);
    frame.quad("impDecal", w.u(631.6), 1.6, 0.064, 0.8, 0.8, { uvRect: impDecalRect(5) });
    frame.quad("impDecal", w.u(638.2), 1.6, 0.064, 0.8, 0.8, { uvRect: impDecalRect(9) });
    cableTray(frame, 1.0, w.length - 1.0, 4.4, { n: 0.5, cables: 3 });
  }
  impConsole(kit, ctx, [x1 - T - 1.6, y, 634.8], -Math.PI / 2, { kind: "station", width: 1.6, screens: 2, seed: 230, light: false });

  // ------------------------------------------------------------ south-west: screened welding bay
  {
    const bx0 = x0 + T + 1.2;
    const bx1 = x0 + T + 9.6;
    const bz0 = 642.0;
    const bz1 = z1 - T - 0.6;
    deckMark(kit, (bx0 + bx1) / 2, y, (bz0 + bz1) / 2, bx1 - bx0, bz1 - bz0, 2, 0);
    hazardKerb(kit, [bx0, bz0], [bx1, bz0], y, { w: 0.3, h: 0.08 });
    hazardKerb(kit, [bx1, bz0], [bx1, bz1], y, { w: 0.3, h: 0.08 });
    // welding screens: dark glass panels in steel frames along the north and east edges, gap at the NE
    const screen = (cx, cz, yaw, len) => {
      const q = yawQ(yaw);
      kit.add("impPaintedMetal", new THREE.BoxGeometry(len, 0.08, 0.08), { pos: [cx, y + 0.06, cz], quat: q, color: IMP.trim, texel: 1 });
      kit.add("impPaintedMetal", new THREE.BoxGeometry(len, 0.06, 0.06), { pos: [cx, y + 2.1, cz], quat: q, color: IMP.trim, texel: 1 });
      kit.add("glassDark", new THREE.BoxGeometry(len - 0.1, 1.9, 0.02), { pos: [cx, y + 1.08, cz], quat: q });
      for (const s of [-1, 1]) kit.add("impPaintedMetal", new THREE.BoxGeometry(0.08, 2.14, 0.08), { pos: [cx - Math.cos(yaw) * s * (len / 2), y + 1.07, cz + Math.sin(yaw) * s * (len / 2)], color: IMP.trim, texel: 1 });
      hazardBand(kit, [cx, y + 0.35, cz], yaw, len - 0.2, 0.3);
    };
    screen((bx0 + bx1 - 2.6) / 2, bz0 + 0.5, 0, bx1 - bx0 - 2.6);
    screen(bx1 - 0.5, (bz0 + 2.6 + bz1) / 2, Math.PI / 2, bz1 - bz0 - 2.6);
    kit.collider([bx0, y, bz0 + 0.4], [bx1 - 2.6, y + 2.2, bz0 + 0.6], "weldScreen");
    kit.collider([bx1 - 0.6, y, bz0 + 2.6], [bx1 - 0.4, y + 2.2, bz1], "weldScreen");
    // welding table with a clamped workpiece and a glowing seam, fume hood + duct above
    const tx = 9.0;
    const tz = 648.6;
    table(kit, [tx, y, tz], 2.4, 1.3, { h: 0.9, tone: IMP.gunmetal, top: "impMetal" });
    kit.box("impMetal", tx - 0.2, y + 1.06, tz, 1.4, 0.26, 0.5, { color: IMP.darkMetal, texel: 1 });
    kit.box("emitAmber", tx - 0.2, y + 1.2, tz, 1.2, 0.02, 0.03);
    kit.box("impMetal", tx + 0.75, y + 1.05, tz + 0.3, 0.2, 0.3, 0.2, { color: IMP.steel });
    kit.box("impPaintedMetal", tx, y + 3.2, tz, 2.2, 0.6, 1.4, { color: IMP.gunmetal, texel: 1 });
    kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.3, 1.3, 0.7, 4, 1, true), { pos: [tx, y + 3.85, tz], rot: [0, Math.PI / 4, 0], color: IMP.gunmetal, uv: "world", texel: 0.5 });
    kit.cyl("impMetal", tx, y + 4.2 + (h - 4.2) / 2, tz, 0.3, h - 4.2, "y", { color: IMP.gunmetal, segments: 14 });
    kit.box("lightBand", tx, y + 2.9, tz, 1.6, 0.01, 0.25, { uv: "keep" });
    // welder unit on wheels + gas cylinders chained to a wall rack
    kit.box("impPaintedMetal", bx0 + 1.2, y + 0.55, bz1 - 1.1, 0.9, 0.9, 0.7, { color: IMP.red, texel: 1 });
    kit.box("impPaintedMetal", bx0 + 1.2, y + 1.05, bz1 - 1.1, 0.7, 0.1, 0.5, { color: IMP.trim, texel: 1 });
    kit.box("blinkSparse", bx0 + 1.2, y + 0.75, bz1 - 0.74, 0.6, 0.2, 0.004, { uv: "keep" });
    kit.collider([bx0 + 0.7, y, bz1 - 1.5], [bx0 + 1.7, y + 1.1, bz1 - 0.7], "welder");
    pipeRun(kit, [[bx0 + 1.2, y + 1.0, bz1 - 0.75], [bx0 + 2.2, y + 0.3, bz1 - 2.0], [tx - 0.9, y + 0.3, tz + 0.6], [tx - 0.9, y + 0.95, tz + 0.2]], 0.03, { mat: "impRubber", color: IMP.rubber, clamps: false });
    gasCylinder(kit, [bx0 + 0.6, y, bz0 + 1.4], { color: IMP.red });
    gasCylinder(kit, [bx0 + 1.05, y, bz0 + 1.4], { color: IMP.steel });
    gasCylinder(kit, [bx0 + 1.5, y, bz0 + 1.4], { color: IMP.gunmetal, h: 1.4 });
    kit.box("impMetal", bx0 + 1.05, y + 1.15, bz0 + 1.1, 1.4, 0.04, 0.04, { color: IMP.steel });
    toolCart(kit, [bx1 - 1.6, y, bz1 - 1.2], 0.2, { seed: 11 });
    stain(kit, [tx + 0.4, y, tz + 1.4], 1.4, { rot: 1.9 });
    // arc flicker
    const arc = pointLightDesc(ctx, 0xa8c8ff, 3.5, 9, [tx - 0.2, y + 1.9, tz], 0);
    ctx.animate((dt, t) => {
      const f = Math.sin(t * 37) * Math.sin(t * 23.3) * Math.sin(t * 5.1);
      arc.dim = f > 0.15 ? 0.6 + 0.4 * Math.random() : 0.05;
    });
  }
  {
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    lockers(frame, w.u(641.6), w.u(636.6), 2.1, { seed: 29 });
    wallScreen(frame, w.u(629.5), 2.3, 1.6, 0.9, 4);
    frame.quad("impDecal", w.u(626.5), 1.8, 0.064, 0.9, 0.9, { uvRect: impDecalRect(1) });
    relayCabinet(frame, w.u(622.5), 0, 2.4, 2.4, 240);
  }

  // ------------------------------------------------------------ south wall: droid charging alcoves
  {
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    const alcoveX = [16.5, 20.0, 23.5, 27.0];
    const az = z1 - T;
    for (let i = 0; i <= alcoveX.length; i++) {
      const dx = alcoveX[0] - 1.75 + i * 3.5;
      kit.box("impPaintedMetal", dx, y + 1.3, az - 0.8, 0.16, 2.6, 1.6, { color: IMP.wallDark, texel: 1 });
      kit.collider([dx - 0.1, y, az - 1.6], [dx + 0.1, y + 2.6, az], "alcove");
    }
    kit.box("impPaintedMetal", (alcoveX[0] + alcoveX[3]) / 2, y + 2.6, az - 0.8, alcoveX[3] - alcoveX[0] + 3.66, 0.16, 1.6, { color: IMP.trim, texel: 1 });
    for (let i = 0; i < alcoveX.length; i++) {
      const ax = alcoveX[i];
      kit.box("lightBand", ax, y + 2.51, az - 0.8, 2.6, 0.01, 0.3, { uv: "keep" });
      // charger unit on the wall, pad on the deck
      frame.box("impPaintedMetal", w.u(ax), 1.3, 0.16, 0.7, 1.4, 0.32, { color: IMP.consoleDark, texel: 1 });
      frame.box("emitBlue", w.u(ax), 1.75, 0.325, 0.4, 0.05, 0.01);
      frame.box("blinkSparse", w.u(ax), 1.35, 0.325, 0.5, 0.3, 0.004, { uv: "keep" });
      frame.quad("impDecal", w.u(ax), 0.85, 0.325, 0.3, 0.3, { uvRect: impDecalRect(12 + (i % 4)) });
      kit.cyl("impPaintedMetal", ax, y + 0.02, az - 1.0, 0.7, 0.04, "y", { color: IMP.trim, segments: 20 });
      kit.add("emitBlue", new THREE.TorusGeometry(0.62, 0.03, 6, 28), { pos: [ax, y + 0.045, az - 1.0], rot: [Math.PI / 2, 0, 0], uv: "scale", uvScale: [4, 1] });
      pipeRun(kit, [[ax + 0.3, y + 0.6, az - 0.02], [ax + 0.3, y + 0.06, az - 0.4], [ax + 0.55, y + 0.06, az - 1.0]], 0.03, { mat: "impRubber", color: IMP.rubber, clamps: false });
      if (i === 0 || i === 2) droid(kit, [ax, y, az - 1.0], Math.PI, { color: i === 0 ? IMP.wallMid : IMP.hazardYellow, active: i === 0 });
    }
    hazardKerb(kit, [alcoveX[0] - 1.7, az - 2.0], [alcoveX[3] + 1.7, az - 2.0], y, { w: 0.2, h: 0.04 });
    floorDecal(kit, alcoveX[1] + 1.75, y, az - 3.0, 1.0, 11, Math.PI);
    wallScreen(frame, w.u(33), 2.4, 1.6, 0.9, 0);
    relayCabinet(frame, w.u(38), 0, 2.6, 2.6, 250);
    cableTray(frame, w.u(41), w.u(12), 4.4, { n: 0.5, cables: 3 });
    frame.quad("impDecal", w.u(9.5), 2.2, 0.064, 0.9, 0.9, { uvRect: impDecalRect(7) });
  }

  // ------------------------------------------------------------ deck marks, spare pipe bits
  deckMark(kit, x0 + T + 6.5, y, 634, 12, 3.4, 0, 0);
  floorDecal(kit, x0 + T + 3.5, y, 631.4, 1.2, 0);
  kit.boxMM("impGloss", [x0 + T + 0.6, y - 0.001, 633.3], [x0 + T + 12.5, y + 0.006, 634.7], { color: IMP.white, texel: 0.25 });
  valve(kit, [30.5, y + 3.2, z0 + T + 0.35], 0.3, "z", { stem: 0.3 });
  pipeRun(kit, [[30.5, y + 0.3, z0 + T + 0.35], [30.5, y + 3.2, z0 + T + 0.35], [30.5, y + h - 1.0, z0 + T + 0.35], [30.5, y + h - 1.0, z0 + T + 2.4]], 0.16, { color: IMP.steel, clampPitch: 2 });

  // ------------------------------------------------------------ lights: bright, even work light
  for (const lx of [14, 32]) for (const lz of [620, 634, 648]) ceilingLight(kit, ctx, [lx, y + h, lz], 7, "x", { color: 0xf0f4ff, intensity: 5.5, distance: 14, priority: lz === 634 ? 2 : 1 });
  spotLightDesc(ctx, 0xffffff, 6, 14, [ACT.x, y + h - 0.6, ACT.z], [ACT.x, y + 1, ACT.z], { angle: 0.55, penumbra: 0.5, priority: 2 });
  pointLightDesc(ctx, 0xdfe8ff, 2.4, 8, [x0 + T + 2.0, y + 3.0, 634], 1); // door
  pointLightDesc(ctx, IMP.blue, 1.6, 7, [21.75, y + 1.2, z1 - T - 1.0], 0); // charging alcoves

  // ------------------------------------------------------------ views
  ctx.view("maintenance", x0 + T + 1.6, y + STD.eye, 634, -90, -2);
  ctx.view("maintenance_bay", 37.5, y + STD.eye, 623.5, 132, 3);
  ctx.view("maintenance_welding", 17.5, y + STD.eye, 647.5, 90, 2);
  void rand;
}
