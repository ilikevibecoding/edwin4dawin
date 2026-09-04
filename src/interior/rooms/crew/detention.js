// Security & detention block (Deck 7). The locked door on the north wall opens through a scanner arch
// onto the guard station — a wide desk with two consoles facing the door, the cell-block gate behind
// it flanked by monitor banks. Down the middle runs the cell corridor: eight cells (four a side) behind
// flickering force fields under alternating red and white light bars, each with a bunk slab, a
// sanitation unit and a caged light. West: booking desk, height-chart wall, effects lockers, a barred
// holding pen, the evidence store. East: the guards' ready room, the observation room and, behind
// one-way glass, the interrogation chamber — a restraint chair under one lamp with the droid-like
// interrogation apparatus on its ceiling arm. Harsh red / white light, camera pods everywhere.
import * as THREE from "three";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { lockers, chair, table, ceilingLight, pointLightDesc, spotLightDesc, wallScreen, screenArray, doorSign, glassWall, pipeRun } from "../../impKit.js";
import { IMP, NO_SHADOW_KEYS } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { ensureCrewMaterials, instancedProp, partition, counter, shelfUnit, wallCabinet, floorDecal, floorLine, namePlate, cameraPod, ceilingStrip, medConsole, dispenser, yawQ, rng, boardMaterial, wallBoard } from "./crewKit.js";
import { buildRifle, rifleRack } from "./armory.js";

const RED = 0xff2a2a;
const WHITE = 0xf2f6ff;
const FIELD = 0x5aa0ff;
const OPEN_CELL = { s: -1, k: 2 }; // cell 3 (west side) stands open with its field down

export function buildDetention(kit, ctx) {
  ensureCrewMaterials(ctx.mats);
  if (!ctx.mats.crewField) {
    ctx.mats.crewField = makeFieldMaterial();
    NO_SHADOW_KEYS.add("crewField");
  }
  const { room, floorY: y } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const walls = roomWalls(room);
  const xW = x0 + STD.wallT;
  const xE = x1 - STD.wallT;
  const zN = z0 + STD.wallT;
  const zS = z1 - STD.wallT;

  buildShell(kit, ctx, ctx.id, room, {
    wall: { pitch: 3.4, tone: IMP.wallDark, toneAlt: IMP.wallMid, bandMat: "lightBand", styles: { plain: 0.6, vent: 0.16, hatch: 0.14, pipes: 0.1 } },
    floor: { tone: 0x484d54, strip: false },
    ceiling: { lights: false, panelW: 2.0, tone: IMP.wallDark },
  });

  // ---- plan ------------------------------------------------------------------------------------
  const blockX = 6.7; // cell block half width (back walls at ±blockX)
  const corrX = 2.2; // corridor half width (cell fronts at ±corrX)
  const blockZ0 = 460.6;
  const cellPitch = 3.7;
  const cells = 4;
  const blockZ1 = blockZ0 + cells * cellPitch; // 475.4
  const wallH = h - 0.05;
  const dark = { tone: IMP.wallDark, toneAlt: IMP.wallMid, band: null, features: false };

  // ---- entry: scanner arch, guard desk with consoles, chairs, floor markings -----------------------
  {
    const archZ = 454.9;
    for (const s of [-1, 1]) {
      kit.box("impPaintedMetal", s * 1.4, y + 1.2, archZ, 0.34, 2.4, 0.34, { color: IMP.trim, texel: 1 });
      kit.box("crewEmit", s * 1.4 - s * 0.175, y + 1.3, archZ, 0.006, 1.8, 0.06, { color: FIELD });
      // scanner state lamps (clear / field / alarm) in a dark inset, a restricted roundel lower down
      kit.box("darkGloss", s * 1.4, y + 2.15, archZ - 0.173, 0.26, 0.12, 0.006);
      for (const [k, c] of [0x40ff70, FIELD, 0x3a1010].entries()) kit.box("crewEmit", s * 1.4 - 0.075 + k * 0.075, y + 2.15, archZ - 0.177, 0.045, 0.045, 0.006, { color: c });
      kit.add("impDecal", new THREE.PlaneGeometry(0.26, 0.26), { pos: [s * 1.4, y + 0.9, archZ - 0.171], rot: [0, Math.PI, 0], uv: "keep", uvRect: impDecalRect(12) });
      kit.collider([s * 1.4 - 0.2, y, archZ - 0.2], [s * 1.4 + 0.2, y + 2.6, archZ + 0.2], "scannerPylon");
    }
    kit.box("impPaintedMetal", 0, y + 2.5, archZ, 3.14, 0.2, 0.34, { color: IMP.trim, texel: 1 });
    kit.box("crewEmit", 0, y + 2.39, archZ, 2.4, 0.006, 0.1, { color: FIELD });
    kit.box("crewEmit", 0, y + 2.5, archZ - 0.175, 1.2, 0.04, 0.006, { color: RED });
    floorLine(kit, [-2.0, archZ - 0.6], [2.0, archZ - 0.6], y, 0.08, "crewPaintWhite");
    floorLine(kit, [-2.0, archZ + 0.6], [2.0, archZ + 0.6], y, 0.08, "crewPaintWhite");
    floorDecal(kit, 0, y, archZ - 1.2, 0.7, 13, 0);
    // guard desk: long counter facing the door, two consoles behind it, chairs, red kick strip
    counter(kit, [0, y, 456.6], 5.2, Math.PI, { d: 0.8, h: 1.02, doors: true, tone: IMP.consoleDark, kickLight: "emitRed", top: "impPaintedMetal", topTone: IMP.wallDark, tag: "guardDesk" });
    kit.box("crewPaintRed", 0, y + 1.03, 456.6, 5.0, 0.004, 0.06);
    for (const s of [-1, 1]) {
      medConsole(kit, ctx, [s * 1.25, y, 458.3], 0);
      chair(kit, [s * 1.25, y, 459.0], 0);
    }
    // desk-top status pillar facing the door: a small status display over a keypad row, red header strip
    kit.box("impPaintedMetal", 0, y + 1.24, 456.55, 0.44, 0.44, 0.06, { color: IMP.consoleDark, texel: 1 });
    kit.box("darkGloss", 0, y + 1.24, 456.515, 0.38, 0.24, 0.006);
    kit.box("screen2", 0, y + 1.24, 456.511, 0.34, 0.17, 0.004, { uv: "keep" });
    kit.box("crewEmit", 0, y + 1.42, 456.515, 0.3, 0.02, 0.006, { color: RED });
    kit.box("leds", 0, y + 1.07, 456.515, 0.3, 0.03, 0.006, { uv: "keep" });
    ceilingLight(kit, ctx, [0, y + h, 456.4], 5.0, "x", { mat: "lightBand", color: WHITE, intensity: 7, distance: 10, priority: 2, drop: 0.5 });
    floorDecal(kit, -3.4, y, 457.6, 0.6, 15, 90);
    floorDecal(kit, 3.4, y, 457.6, 0.6, 15, -90);
    // north wall: door sign, warning stencils, comms panel, cameras
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    doorSign(frame, w.u(0), 2.75, { color: "emitRed", decal: 13 });
    frame.quad("impDecal", w.u(-1.9), 1.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(13) });
    frame.quad("impDecal", w.u(1.9), 1.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(15) });
    commsPanel(frame, w.u(2.8), 1.3, 0.03);
    wallScreen(frame, w.u(-4.6), 2.1, 1.6, 0.9, 1);
    wallScreen(frame, w.u(4.6), 2.1, 1.6, 0.9, 2);
    cameraPod(kit, [-2.6, y + h - 0.3, zN + 0.3], 160, -35);
    cameraPod(kit, [2.6, y + h - 0.3, zN + 0.3], -160, -35);
  }

  // ---- cell block ----------------------------------------------------------------------------------
  {
    // back walls, dividers, fronts with door frames; the corridor gate; force fields (one mesh)
    for (const s of [-1, 1]) {
      partition(kit, [s * blockX, blockZ0], [s * blockX, blockZ1], y, wallH, { t: 0.2, ...dark, seed: 70 + s, tag: "cellBack", pitch: cellPitch });
      for (let k = 0; k <= cells; k++) {
        const z = blockZ0 + k * cellPitch;
        partition(kit, [s * corrX, z], [s * blockX, z], y, wallH, { t: 0.16, ...dark, seed: 80 + k, tag: "cellWall", pitch: 4.5 });
      }
      for (let k = 0; k < cells; k++) {
        const zc = blockZ0 + (k + 0.5) * cellPitch;
        const open = s === OPEN_CELL.s && k === OPEN_CELL.k; // one empty cell stands open (field down)
        cell(kit, ctx, s, zc, k + 1 + (s > 0 ? 4 : 0), { corrX, blockX, pitch: cellPitch, wallH, y, open });
        floorDecal(kit, s * (corrX - 0.6), y, zc, 0.45, [0, 3, 6, 9, 15, 11, 5, 2][k + (s > 0 ? 4 : 0)], s > 0 ? -90 : 90);
      }
    }
    // force fields: one merged mesh, flickered by the room animator
    for (const s of [-1, 1]) {
      for (let k = 0; k < cells; k++) {
        if (s === OPEN_CELL.s && k === OPEN_CELL.k) continue;
        const zc = blockZ0 + (k + 0.5) * cellPitch;
        const g = new THREE.PlaneGeometry(1.4, 2.35);
        g.rotateY(Math.PI / 2);
        kit.add("crewField", g, { pos: [s * corrX, y + 1.2, zc], uv: "keep" });
        const g2 = new THREE.PlaneGeometry(1.4, 0.05);
        g2.rotateY(Math.PI / 2);
        kit.add("crewEmit", g2, { pos: [s * corrX, y + 0.12, zc], uv: "keep", color: FIELD });
      }
    }
    const fieldMat = ctx.mats.crewField;
    const r2 = rng(5);
    let glitch = 0;
    ctx.animate((dt, t) => {
      glitch = Math.max(0, glitch - dt * 3);
      if (r2() < dt * 0.6) glitch = 0.6 + r2() * 0.4;
      fieldMat.opacity = 0.5 + 0.06 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 23.1 + 1.0) - glitch * 0.3;
      fieldMat.map.offset.y = (t * 0.03) % 1;
    });
    // corridor: red centre line, white edge lines, alternating white bars / red strips, one red fill
    floorLine(kit, [0, blockZ0 + 0.3], [0, blockZ1 - 0.3], y, 0.12);
    floorLine(kit, [-corrX + 0.35, blockZ0 + 0.2], [-corrX + 0.35, blockZ1 - 0.2], y, 0.06, "crewPaintWhite");
    floorLine(kit, [corrX - 0.35, blockZ0 + 0.2], [corrX - 0.35, blockZ1 - 0.2], y, 0.06, "crewPaintWhite");
    for (const z of [blockZ0 + 3.7, blockZ0 + 11.1]) ceilingLight(kit, ctx, [0, y + h, z], 3.0, "z", { mat: "lightBand", color: WHITE, intensity: 9, distance: 13, priority: 1, drop: 0.4 });
    for (const z of [blockZ0 + 0.6, blockZ0 + 7.4, blockZ1 - 0.6]) ceilingStrip(kit, [0, y + h, z], 3.6, "x", { mat: "emitRed", w: 0.16 });
    pointLightDesc(ctx, RED, 3.0, 8, [0, y + h - 0.5, blockZ0 + 7.4], 1);
    // gate at the corridor mouth: jambs carrying field emitters (the gate field is down), header with
    // a red strip, warning plate and status lights
    for (const s of [-1, 1]) {
      kit.box("impPaintedMetal", s * (corrX + 0.05), y + wallH / 2, blockZ0, 0.3, wallH, 0.3, { color: IMP.trim, texel: 1 });
      kit.box("crewEmit", s * (corrX - 0.105), y + 1.3, blockZ0, 0.006, 2.2, 0.12, { color: 0x2a3a60 });
      kit.box("impMetal", s * (corrX - 0.1), y + 2.45, blockZ0, 0.02, 0.06, 0.2, { color: IMP.steel });
      kit.box("impMetal", s * (corrX - 0.1), y + 0.15, blockZ0, 0.02, 0.06, 0.2, { color: IMP.steel });
    }
    kit.box("impPaintedMetal", 0, y + 2.65, blockZ0, corrX * 2 + 0.4, wallH - 2.5, 0.3, { color: IMP.trim, texel: 1 });
    kit.box("crewEmit", 0, y + 2.56, blockZ0 - 0.155, 2.6, 0.05, 0.01, { color: RED });
    kit.box("crewEmit", 0, y + 2.56, blockZ0 + 0.155, 2.6, 0.05, 0.01, { color: RED });
    kit.box("impPaintedMetal", 0, y + 2.9, blockZ0 - 0.16, 1.4, 0.3, 0.02, { color: IMP.consoleDark, texel: 1 });
    kit.add("impDecal", new THREE.PlaneGeometry(0.26, 0.26), { pos: [-0.45, y + 2.9, blockZ0 - 0.175], rot: [0, Math.PI, 0], uv: "keep", uvRect: impDecalRect(13) });
    // one lamp per cell on the header plate: red = field up, green = the open cell
    for (let k = 0; k < cells * 2; k++) {
      const open = k === OPEN_CELL.k + (OPEN_CELL.s > 0 ? cells : 0);
      kit.box("crewEmit", -0.14 + k * 0.08, y + 2.9, blockZ0 - 0.175, 0.05, 0.05, 0.006, { color: open ? 0x40ff70 : RED });
    }
    kit.box("crewEmit", 0, y + 0.12, blockZ0, corrX * 2 - 0.2, 0.006, 0.08, { color: FIELD }); // gate field floor emitter
    // monitor banks flanking the gate on the block's north face (facing the guard station)
    for (const s of [-1, 1]) {
      const mf = wallFrame(kit, [s > 0 ? blockX : -corrX, blockZ0 - 0.104], [s > 0 ? corrX : -blockX, blockZ0 - 0.104], y).frame;
      const cu = (blockX - corrX) / 2;
      screenArray(mf, cu, 1.9, 3, 2, 0.62, 0.44, { seed: 11 + s, variants: [1, 2], leds: true });
      mf.box("crewPaintRed", cu, 2.85, 0.004, blockX - corrX - 0.6, 0.1, 0.004);
      mf.quad("impDecal", cu, 0.9, 0.004, 0.5, 0.5, { uvRect: impDecalRect(s > 0 ? 15 : 13) });
    }
    cameraPod(kit, [-corrX + 0.35, y + h - 0.3, blockZ0 + 0.4], 150, -30);
    cameraPod(kit, [corrX - 0.35, y + h - 0.3, blockZ1 - 0.4], -30, -30);
    // passage faces of the block's back walls: red band, lit cell number plates, a comms panel; the
    // west (holding) passage also gets fold-down wall benches, the detainee regulations board, rules
    // plates and restricted roundels over the benches
    for (const s of [-1, 1]) {
      const xf = s * (blockX + 0.136);
      const bf = s < 0 ? wallFrame(kit, [xf, blockZ0], [xf, blockZ1], y).frame : wallFrame(kit, [xf, blockZ1], [xf, blockZ0], y).frame;
      const L = blockZ1 - blockZ0;
      bf.box("crewPaintRed", L / 2, 1.15, 0.004, L - 0.4, 0.1, 0.004);
      for (let k = 0; k < cells; k++) {
        const cu = (k + 0.5) * cellPitch;
        bf.box("impPaintedMetal", cu, 1.75, 0.008, 0.5, 0.5, 0.016, { color: IMP.wallLight, texel: 2 });
        bf.quad("impDecal", cu, 1.75, 0.018, 0.4, 0.4, { uvRect: impDecalRect(s < 0 ? [0, 3, 6, 9][k] : [15, 11, 5, 2][cells - 1 - k]) });
        bf.box("crewEmit", cu, 2.08, 0.008, 0.2, 0.03, 0.006, { color: RED });
      }
      commsPanel(bf, 0.8, 1.55, 0);
      if (s < 0) {
        for (const bu of [3.7, 11.1]) {
          wallBench(bf, bu, 2.2);
          bf.box("impPaintedMetal", bu, 1.62, 0.008, 0.7, 0.5, 0.016, { color: IMP.wallLight, texel: 2 });
          bf.quad("impDecal", bu, 1.62, 0.018, 0.44, 0.44, { uvRect: impDecalRect(3) });
          bf.quad("impDecal", bu, 2.3, 0.006, 0.6, 0.6, { uvRect: impDecalRect(12) });
        }
        wallBoard(bf, L / 2, 1.95, 1.3, 0.8, boardMaterial(ctx.mats, "crewBoardRules", { seed: 23, accent: "#ff3b2a", rows: 8, values: false }));
      } else {
        bf.box("leds", L / 2, 2.3, 0.004, 1.2, 0.05, 0.01, { uv: "keep" });
      }
    }
    // south end of the block: the corridor opens onto the rear passage through a second gate frame
    for (const s of [-1, 1]) kit.box("impPaintedMetal", s * (corrX + 0.05), y + wallH / 2, blockZ1, 0.3, wallH, 0.3, { color: IMP.trim, texel: 1 });
    kit.box("impPaintedMetal", 0, y + 2.65, blockZ1, corrX * 2 + 0.4, wallH - 2.5, 0.3, { color: IMP.trim, texel: 1 });
    kit.box("crewEmit", 0, y + 2.56, blockZ1 + 0.155, 2.6, 0.05, 0.01, { color: RED });
    kit.box("crewEmit", 0, y + 2.56, blockZ1 - 0.155, 2.6, 0.05, 0.01, { color: RED });
    for (const s of [-1, 1]) {
      const sf = wallFrame(kit, [s > 0 ? corrX : -blockX, blockZ1 + 0.104], [s > 0 ? blockX : -corrX, blockZ1 + 0.104], y).frame;
      sf.quad("impDecal", 1.2, 1.7, 0.004, 0.5, 0.5, { uvRect: impDecalRect(s > 0 ? 9 : 3) });
      sf.box("crewPaintRed", (blockX - corrX) / 2, 1.1, 0.004, blockX - corrX - 0.6, 0.12, 0.004);
      sf.box("leds", 3.4, 1.7, 0.004, 0.8, 0.05, 0.01, { uv: "keep" });
    }
  }

  // ---- west: booking desk, height chart, effects lockers, holding pen, evidence store ----------------
  {
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    const nw = walls.north;
    const nf = wallFrame(kit, nw.from, nw.to, y).frame;
    lockers(nf, nw.u(-15.2), nw.u(-11.0), 2.0, { doorW: 0.6, tone: IMP.wallDark, seed: 61 });
    nf.quad("impDecal", nw.u(-13.1), 2.5, 0.062, 0.5, 0.5, { uvRect: impDecalRect(9) });
    steelBench(kit, [-8.9, y, 452.95], 2.4, 0);
    nf.quad("impDecal", nw.u(-8.9), 1.4, 0.062, 0.5, 0.5, { uvRect: impDecalRect(0) });
    // booking desk along z, officer on the west side, detainee on the east
    counter(kit, [-9.3, y, 456.6], 2.8, -Math.PI / 2, { d: 0.8, h: 1.0, doors: true, tone: IMP.consoleDark, kickLight: "emitRed", tag: "bookingDesk" });
    kit.box("impMetal", -9.2, y + 1.2, 456.0, 0.04, 0.36, 0.04, { color: IMP.gunmetal });
    kit.box("darkGloss", -9.18, y + 1.5, 456.0, 0.03, 0.4, 0.62, { texel: 1 });
    kit.box("screen2", -9.195, y + 1.5, 456.0, 0.004, 0.34, 0.56, { uv: "keep" });
    deskPad(kit, [-9.5, y + 1.01, 456.9], -Math.PI / 2, 0.44, 0.24, "screen1");
    kit.box("leds", -9.5, y + 1.015, 457.25, 0.04, 0.004, 0.3, { uv: "keep" }); // keypad row
    kit.box("impPaintedMetal", -9.1, y + 1.06, 457.4, 0.24, 0.12, 0.3, { color: IMP.wallDark, texel: 2 }); // hand scanner
    kit.box("crewEmit", -9.1, y + 1.125, 457.4, 0.16, 0.004, 0.2, { color: FIELD });
    chair(kit, [-10.4, y, 456.6], -Math.PI / 2);
    floorDecal(kit, -8.2, y, 456.6, 0.7, 15, 90);
    // height chart on the west wall with a camera on a tripod facing it
    const hu = w.u(456.6);
    frame.box("impPaintedMetal", hu, 1.2, 0.07, 2.2, 2.3, 0.02, { color: IMP.white, texel: 1 });
    for (let k = 0; k <= 10; k++) frame.box("impPaintedMetal", hu - 0.6, 1.2 + k * 0.1, 0.082, k % 5 === 0 ? 0.9 : 0.5, 0.012, 0.004, { color: IMP.black });
    for (let k = 0; k <= 10; k++) frame.box("impPaintedMetal", hu + 0.6, 1.2 + k * 0.1, 0.082, k % 5 === 0 ? 0.9 : 0.5, 0.012, 0.004, { color: IMP.black });
    frame.box("crewPaintRed", hu, 0.16, 0.082, 2.0, 0.08, 0.004);
    frame.quad("impDecal", hu, 2.6, 0.062, 0.5, 0.5, { uvRect: impDecalRect(6) });
    floorDecal(kit, xW + 0.55, y, 456.6, 0.5, 5, 90);
    kit.add("impMetal", new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), { pos: [-12.4, y + 0.75, 456.6], color: IMP.gunmetal, uv: "scale", uvScale: [0.2, 1] });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      kit.add("impMetal", new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), { pos: [-12.4 + Math.cos(a) * 0.2, y + 0.3, 456.6 + Math.sin(a) * 0.2], rot: [Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55], color: IMP.gunmetal, uv: "scale", uvScale: [0.1, 0.5] });
    }
    cameraPod(kit, [-12.4, y + 1.55, 456.6], 90, -8, { bracket: "ceiling" });
    kit.collider([-12.7, y, 456.3], [-12.1, y + 1.7, 456.9], "tripod");
    ceilingLight(kit, ctx, [-11.0, y + h, 456.6], 3.6, "x", { mat: "lightBand", color: WHITE, intensity: 8, distance: 11, priority: 1, drop: 0.5 });
    frame.quad("impDecal", w.u(453.4), 2.2, 0.062, 0.5, 0.5, { uvRect: impDecalRect(11) });
    wallScreen(frame, w.u(459.6), 2.1, 1.4, 0.9, 1);
    // holding pen against the west wall: bars on three sides, gate open, benches, drain, red light
    const pen = { x1: -9.6, z0: 461.8, z1: 466.4 };
    barWall(kit, [xW, pen.z0], [pen.x1, pen.z0], y, wallH);
    barWall(kit, [xW, pen.z1], [pen.x1, pen.z1], y, wallH);
    barWall(kit, [pen.x1, pen.z0], [pen.x1, pen.z1], y, wallH, { openings: [[2.3, 3.5]] });
    barLeaf(kit, [pen.x1, pen.z0 + 3.5], (-65 * Math.PI) / 180, 1.2, 2.3, y);
    steelBench(kit, [xW + 0.5, y, (pen.z0 + pen.z1) / 2], 3.2, Math.PI / 2);
    steelBench(kit, [-12.2, y, pen.z1 - 0.5], 2.4, 0);
    kit.add("impMetal", new THREE.CylinderGeometry(0.2, 0.2, 0.01, 12), { pos: [-12.6, y + 0.005, 463.4], color: IMP.black, uv: "scale", uvScale: [1, 0.1] });
    // holding-pen sign hung from the ceiling inside the pen: restricted roundel, glyph plate, red strip
    kit.box("impPaintedMetal", pen.x1 - 0.7, y + 2.95, pen.z0 + 1.6, 1.2, 0.3, 0.02, { color: IMP.consoleDark, texel: 1 });
    kit.add("impDecal", new THREE.PlaneGeometry(0.24, 0.24), { pos: [pen.x1 - 1.1, y + 2.94, pen.z0 + 1.6 + 0.012], uv: "keep", uvRect: impDecalRect(12) });
    kit.box("impPaintedMetal", pen.x1 - 0.5, y + 2.94, pen.z0 + 1.6 + 0.012, 0.6, 0.2, 0.006, { color: IMP.wallLight, texel: 2 });
    kit.add("impDecal", new THREE.PlaneGeometry(0.2, 0.2), { pos: [pen.x1 - 0.5, y + 2.94, pen.z0 + 1.6 + 0.017], uv: "keep", uvRect: impDecalRect(15) });
    kit.box("crewEmit", pen.x1 - 0.7, y + 3.12, pen.z0 + 1.6 + 0.012, 1.0, 0.03, 0.006, { color: RED });
    frame.quad("impDecal", w.u(464.1), 2.5, 0.062, 0.5, 0.5, { uvRect: impDecalRect(13) });
    frame.box("crewPaintRed", w.u(464.1), 2.0, 0.062, 4.0, 0.1, 0.004);
    pointLightDesc(ctx, RED, 2.5, 6, [-12.6, y + h - 0.4, 464.1], 0);
    floorLine(kit, [pen.x1 + 0.5, pen.z0 - 0.4], [pen.x1 + 0.5, pen.z1 + 0.4], y, 0.08);
    floorDecal(kit, pen.x1 + 1.2, y, pen.z0 + 2.9, 0.6, 13, -90);
    // evidence store: shelving on the west wall, a lock-up cabinet, a processing console, stencils
    shelfUnit(frame, w.u(475.4), w.u(469.0), 2.3, { d: 0.55, shelves: 5, seed: 62, items: "mixed", palette: [IMP.wallDark, IMP.gunmetal, 0xb8231c, IMP.steel, IMP.fabricOlive], tone: IMP.wallDark, fill: 0.85 });
    frame.box("crewPaintRed", w.u(472.2), 2.42, 0.062, 6.0, 0.06, 0.004);
    frame.quad("impDecal", w.u(472.2), 2.75, 0.062, 0.5, 0.5, { uvRect: impDecalRect(3) });
    lockers(frame, w.u(468.6), w.u(467.2), 2.2, { doorW: 0.7, tone: IMP.wallDark, seed: 63 });
    medConsole(kit, ctx, [-10.6, y, 470.6], Math.PI / 2);
    floorLine(kit, [xW + 0.9, 468.4], [xW + 0.9, 476.0], y, 0.08, "crewPaintWhite");
    floorDecal(kit, -12.6, y, 472.2, 0.6, 9, 90);
    ceilingLight(kit, ctx, [-12.0, y + h, 471.6], 4.0, "z", { mat: "lightBand", color: WHITE, intensity: 8, distance: 11, priority: 0, drop: 0.5 });
    cameraPod(kit, [xW + 0.3, y + h - 0.3, zS - 0.3], 45, -30);
  }

  // ---- east: ready room (north), observation room, interrogation chamber ---------------------------------
  {
    const w = walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    const nw = walls.north;
    const nf = wallFrame(kit, nw.from, nw.to, y).frame;
    // ready room: lockers, table with chairs, caf dispenser, wall screen, rifle rack
    lockers(nf, nw.u(8.6), nw.u(14.6), 2.1, { doorW: 0.6, tone: IMP.wallMid, seed: 64 });
    nf.box("crewPaintRed", nw.u(11.6), 2.24, 0.062, 5.8, 0.05, 0.004);
    table(kit, [11.2, y, 457.2], 1.8, 0.9, { tone: IMP.wallMid });
    for (const [dx, dz, yaw] of [[-0.55, -0.85, Math.PI], [0.55, -0.85, Math.PI], [-0.55, 0.85, 0], [0.55, 0.85, 0]]) chair(kit, [11.2 + dx, y, 457.2 + dz], yaw);
    dispenser(kit, [xE - 0.35, y, 454.0], -Math.PI / 2, { w: 0.8, d: 0.6, h: 1.9, accent: "crewEmit", accentColor: 0xffb060, decal: 6 });
    wallScreen(frame, w.u(457.6), 2.05, 1.6, 0.9, 2);
    frame.quad("impDecal", w.u(455.6), 2.1, 0.062, 0.5, 0.5, { uvRect: impDecalRect(6) });
    const rt = rifleRack(kit, [14.6, y, 459.3], Math.PI / 2, { len: 1.6, perSide: 4, seed: 12 });
    instancedProp(kit, (k) => buildRifle(k), rt.filter((_, i) => i !== 2));
    ceilingLight(kit, ctx, [11.2, y + h, 456.6], 3.6, "x", { mat: "lightBand", color: WHITE, intensity: 8, distance: 11, priority: 1, drop: 0.5 });
    // observation room (x 8.4..xE, z 461.6..467.4): consoles at the one-way glass into the chamber
    const obsZ0 = 461.6;
    const intZ0 = 467.4;
    partition(kit, [blockX, obsZ0], [xE, obsZ0], y, wallH, { t: 0.16, ...dark, seed: 65, tag: "obsWall", pitch: 4.5, openings: [{ u0: 0.3, u1: 1.9, h: 2.5, locked: true }] });
    glassWall(kit, [8.4, intZ0], [xE, intZ0], y, wallH, { mat: "glassDark", mullions: 2, sill: 0.9, tag: "obsGlass" });
    partition(kit, [8.4, intZ0], [8.4, zS - 3.6], y, wallH, { t: 0.16, ...dark, seed: 66, tag: "intWall", pitch: 4.5 });
    partition(kit, [8.4, zS - 3.6], [8.4, zS], y, wallH, { t: 0.16, ...dark, seed: 67, tag: "intWall", pitch: 3, openings: [{ u0: 0.5, u1: 2.1, h: 2.5, locked: true }] });
    counter(kit, [12.1, y, intZ0 - 0.75], 6.0, Math.PI, { d: 0.7, h: 0.9, doors: false, tone: IMP.consoleDark, top: "impPaintedMetal", topTone: IMP.wallDark, tag: "obsDesk" });
    for (const [k, x] of [10.4, 13.8].entries()) {
      // angled monitor pad with a keypad strip in front of it, an operator chair
      deskPad(kit, [x, y + 0.9, intZ0 - 0.72], Math.PI, 0.56, 0.3, k ? "screen2" : "screen1");
      kit.box("darkGloss", x, y + 0.906, intZ0 - 1.02, 0.5, 0.012, 0.12);
      kit.box("leds", x, y + 0.914, intZ0 - 1.02, 0.42, 0.004, 0.05, { uv: "keep" });
      chair(kit, [x, y, intZ0 - 1.6], Math.PI);
    }
    kit.box("impPaintedMetal", 12.1, y + 1.02, intZ0 - 0.75, 0.3, 0.24, 0.2, { color: IMP.consoleDark, texel: 1 });
    kit.box("crewEmit", 12.1, y + 1.1, intZ0 - 0.85, 0.2, 0.02, 0.006, { color: RED });
    screenArray(frame, w.u(464.6), 2.0, 2, 2, 0.7, 0.5, { seed: 13, variants: [1, 2], leds: true });
    frame.quad("impDecal", w.u(462.6), 1.5, 0.062, 0.5, 0.5, { uvRect: impDecalRect(11) });
    ceilingLight(kit, ctx, [12.1, y + h, 464.2], 4.0, "x", { mat: "lightBand", color: WHITE, intensity: 4.5, distance: 8, priority: 0, drop: 0.5 });
    floorDecal(kit, 8.6 + 0.8, y, obsZ0 + 1.0, 0.6, 15, 180);
    // interrogation chamber: black gloss deck, red skirting glow, the chair under a single lamp,
    // the interrogation apparatus on its ceiling arm, a tool cart, restraint rings on the wall
    kit.boxMM("impGlossSoft", [8.6, y + 0.001, intZ0 + 0.1], [xE - 0.1, y + 0.008, zS - 0.1], { color: IMP.trim, texel: 0.3 });
    const cx = 12.4;
    const cz = 473.2;
    interrogationChair(kit, [cx, y, cz], Math.PI * 0.9);
    interrogationArm(kit, [cx + 1.2, y + h, cz - 0.9], [cx + 0.55, y + 1.45, cz - 0.35]);
    spotLightDesc(ctx, 0xfff2e0, 14, 8, [cx, y + h - 0.35, cz], [cx, y + 0.6, cz], { angle: 0.55, penumbra: 0.6, shadow: true, priority: 2 });
    kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.28, 0.32, 0.18, 16), { pos: [cx, y + h - 0.12, cz], color: IMP.consoleDark, uv: "scale", uvScale: [2, 0.3] });
    kit.add("crewEmit", new THREE.CylinderGeometry(0.2, 0.2, 0.01, 16), { pos: [cx, y + h - 0.215, cz], color: 0xfff2e0, uv: "scale", uvScale: [1, 0.1] });
    pointLightDesc(ctx, RED, 2.0, 7, [xE - 0.6, y + 0.35, zS - 0.6], 0);
    floorLine(kit, [cx - 1.6, cz - 1.6], [cx + 1.6, cz - 1.6], y + 0.008, 0.08);
    floorLine(kit, [cx - 1.6, cz + 1.6], [cx + 1.6, cz + 1.6], y + 0.008, 0.08);
    floorLine(kit, [cx - 1.6, cz - 1.6], [cx - 1.6, cz + 1.6], y + 0.008, 0.08);
    floorLine(kit, [cx + 1.6, cz - 1.6], [cx + 1.6, cz + 1.6], y + 0.008, 0.08);
    // tool cart, wall rings, red skirting glow strips along the chamber walls, a drain
    toolCart(kit, [14.4, y, 476.6], 0.4);
    for (const z of [470.0, 471.0, 472.0]) kit.add("impMetal", new THREE.TorusGeometry(0.08, 0.015, 6, 16), { pos: [xE - 0.1, y + 1.2, z], rot: [0, Math.PI / 2, 0], color: IMP.steel, uv: "scale", uvScale: [1, 1] });
    frame.box("impPaintedMetal", w.u(471.0), 1.3, 0.07, 2.4, 0.08, 0.06, { color: IMP.trim, texel: 1 });
    kit.box("crewEmit", (8.6 + xE) / 2, y + 0.16, zS - 0.09, xE - 8.6 - 0.6, 0.02, 0.006, { color: RED });
    kit.box("crewEmit", xE - 0.09, y + 0.16, (intZ0 + zS) / 2, 0.006, 0.02, zS - intZ0 - 0.6, { color: RED });
    kit.box("crewEmit", 8.6 + 0.104, y + 0.16, (intZ0 + zS) / 2, 0.006, 0.02, zS - intZ0 - 0.6, { color: RED });
    // west wall of the chamber (the partition's chamber face, u = zS - z): restraint rack, glass-fronted
    // instrument cabinet, red band, restricted roundel, and the junction box that feeds the chair
    const lf = wallFrame(kit, [8.4 + 0.084, zS], [8.4 + 0.084, intZ0], y).frame;
    restraintRack(lf, zS - 471.4, 1.5);
    wallCabinet(lf, zS - 475.3, zS - 473.9, 1.05, 1.95, { glass: true, glassMat: "glassDark", tone: IMP.wallDark, seed: 71, shelves: 2 });
    lf.box("crewPaintRed", zS - 472.4, 2.3, 0.006, 5.8, 0.08, 0.004);
    lf.quad("impDecal", zS - 469.3, 1.5, 0.006, 0.5, 0.5, { uvRect: impDecalRect(12) });
    lf.box("impPaintedMetal", zS - 472.9, 0.45, 0.08, 0.3, 0.36, 0.16, { color: IMP.consoleDark, texel: 1 });
    lf.box("crewEmit", zS - 472.9, 0.56, 0.162, 0.08, 0.02, 0.006, { color: RED });
    // deck: power cable from the junction box to the chair pedestal, a drain grate, the interrogator's
    // chair with a side table and datapad facing the restraint chair, a restricted roundel by the glass
    pipeRun(kit, [[8.62, y + 0.043, 472.9], [10.2, y + 0.043, 473.05], [11.85, y + 0.043, 473.1]], 0.035, { color: IMP.black, mat: "impRubber", clamps: true, clampPitch: 1.0 });
    floorGrate(kit, [11.4, y + 0.008, 475.0], 0.7);
    chair(kit, [10.3, y, 474.2], -1.1);
    table(kit, [9.5, y, 474.9], 0.7, 0.5, { h: 0.74, yaw: -1.1, tone: IMP.consoleDark });
    kit.box("darkGloss", 9.5, y + 0.75, 474.9, 0.26, 0.012, 0.18);
    kit.box("screen1", 9.5, y + 0.758, 474.9, 0.22, 0.004, 0.14, { uv: "keep" });
    floorDecal(kit, 10.4, y + 0.008, 470.2, 1.0, 12, 90);
    floorDecal(kit, 14.2, y + 0.008, 476.8, 0.8, 1, 0);
    // holo-recorder on a tripod east of the chair, aimed at it, with its own cable back to the east wall
    kit.add("impMetal", new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), { pos: [14.3, y + 0.75, 471.0], color: IMP.gunmetal, uv: "scale", uvScale: [0.2, 1] });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      kit.add("impMetal", new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), { pos: [14.3 + Math.cos(a) * 0.2, y + 0.3, 471.0 + Math.sin(a) * 0.2], rot: [Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55], color: IMP.gunmetal, uv: "scale", uvScale: [0.1, 0.5] });
    }
    cameraPod(kit, [14.3, y + 1.55, 471.0], 138, -12, { bracket: "ceiling" });
    kit.collider([14.0, y, 470.7], [14.6, y + 1.7, 471.3], "tripod");
    pipeRun(kit, [[xE - 0.12, y + 0.043, 470.2], [14.3, y + 0.043, 470.85]], 0.03, { color: IMP.black, mat: "impRubber", clamps: false });
    frame.quad("impDecal", w.u(474.6), 2.2, 0.062, 0.5, 0.5, { uvRect: impDecalRect(13) });
    frame.quad("impDecal", w.u(477.8), 1.6, 0.062, 0.5, 0.5, { uvRect: impDecalRect(15) });
    cameraPod(kit, [xE - 0.3, y + h - 0.3, intZ0 + 0.4], -135, -35);
    cameraPod(kit, [xE - 0.3, y + h - 0.3, zN + 0.3], -135, -30);
    // door plates for the two chamber doors (observation room side, rear passage side)
    const of = wallFrame(kit, [xE, obsZ0 - 0.104], [blockX, obsZ0 - 0.104], y).frame;
    namePlate(of, xE - 9.3, 1.6, { n: 0.0, decal: 15, led: "crewEmit", ledColor: RED });
    const pf = wallFrame(kit, [8.4 - 0.104, zS - 3.6], [8.4 - 0.104, zS], y).frame;
    namePlate(pf, 2.65, 1.6, { n: 0.0, decal: 13, led: "crewEmit", ledColor: RED });
  }

  // ---- rear passage (south): pipes, red band, utility panels, stencils -----------------------------------
  {
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    pipeRun(kit, [[-15.4, y + 3.0, zS - 0.35], [7.6, y + 3.0, zS - 0.35]], 0.09, { color: IMP.gunmetal });
    pipeRun(kit, [[-15.4, y + 2.75, zS - 0.3], [7.6, y + 2.75, zS - 0.3]], 0.06, { color: IMP.steel });
    frame.box("crewPaintRed", w.u(-4.0), 1.15, 0.062, 22.0, 0.1, 0.004);
    for (const [i, x] of [-11.0, -5.5, 3.5].entries()) {
      // utility panel: breaker levers with state lamps over a dark inset, an LED row, a hazard stencil
      frame.box("impPaintedMetal", w.u(x), 1.7, 0.07, 1.0, 0.7, 0.05, { color: IMP.consoleDark, texel: 1 });
      frame.box("darkGloss", w.u(x), 1.82, 0.097, 0.8, 0.22, 0.006);
      for (let k = 0; k < 6; k++) {
        const off = (k + i) % 4 === 3;
        frame.box("impMetal", w.u(x) - 0.3 + k * 0.12, off ? 1.78 : 1.85, 0.11, 0.05, 0.11, 0.02, { color: off ? IMP.gunmetal : IMP.steel });
        frame.box("crewEmit", w.u(x) - 0.3 + k * 0.12, 1.96, 0.1, 0.03, 0.02, 0.006, { color: off ? RED : 0x40ff70 });
      }
      frame.box("leds", w.u(x), 1.5, 0.1, 0.6, 0.05, 0.006, { uv: "keep" });
      frame.quad("impDecal", w.u(x) + 0.38, 1.5, 0.098, 0.18, 0.18, { uvRect: impDecalRect(1) });
    }
    wallScreen(frame, w.u(0), 2.1, 1.4, 0.9, 1);
    frame.quad("impDecal", w.u(-8.2), 2.2, 0.062, 0.5, 0.5, { uvRect: impDecalRect(9) });
    frame.quad("impDecal", w.u(6.0), 2.2, 0.062, 0.5, 0.5, { uvRect: impDecalRect(3) });
    ceilingLight(kit, ctx, [-3.0, y + h, zS - 2.1], 6.0, "x", { mat: "lightBand", color: WHITE, intensity: 8, distance: 12, priority: 1, drop: 0.5 });
    ceilingStrip(kit, [4.6, y + h, zS - 2.1], 3.0, "x", { mat: "emitRed", w: 0.16 });
    floorDecal(kit, 0, y, zS - 2.1, 0.7, 11, 0);
    cameraPod(kit, [-corrX - 0.3, y + h - 0.3, zS - 0.3], 20, -30);
  }

  // ---- views --------------------------------------------------------------------------------------
  ctx.view("detention", 0, y + STD.eye, zN + 0.5, 180, -4);
  ctx.view("detention_desk", -5.6, y + STD.eye, 458.6, -104, -6);
  ctx.view("detention_cells", 0.6, y + STD.eye, blockZ0 + 0.9, 168, -4);
  ctx.view("detention_cell", 1.3, y + STD.eye, blockZ0 + (OPEN_CELL.k + 0.5) * cellPitch + 0.3, 96, -6);
  ctx.view("detention_observation", 12.1, y + STD.eye, 464.4, 180, -6);
  ctx.view("detention_interrogation", 10.0, y + STD.eye, 478.6, -30, -6);
  ctx.view("detention_holding", -8.6, y + STD.eye, 459.8, 158, -5);
}

// ---------------------------------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------------------------------
// Force-field material: additive blue with a scan-line texture (scrolled and flickered by the room
// animator). One material for every field in the block.
function makeFieldMaterial() {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#061030";
  g.fillRect(0, 0, 16, 64);
  g.fillStyle = "#234c9c";
  for (let v = 0; v < 64; v += 8) g.fillRect(0, v, 16, 2);
  g.fillStyle = "#8fb4ff";
  for (let v = 1; v < 64; v += 8) g.fillRect(0, v, 16, 1);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ color: 0xffffff, map: t, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
}

/**
 * One cell: front wall segments either side of the door frame (jambs with field emitter strips, header
 * with a status lamp), bunk slab with a thin mattress, sanitation unit, caged light with a lit strip,
 * cell number plate. side = -1 (west) | +1 (east), zc = cell centre.
 */
function cell(kit, ctx, side, zc, num, g) {
  const { corrX, blockX, pitch, wallH, y, open = false } = g;
  const s = side;
  const xf = s * corrX; // front wall plane
  const doorW = 1.4;
  const half = pitch / 2;
  const emitterColor = open ? 0x1a2440 : 0x3a70c0;
  const lampColor = open ? 0x40ff70 : RED;
  // front wall segments (solid) either side of the door
  for (const d of [-1, 1]) {
    const za = zc + d * (doorW / 2 + 0.06);
    const zb = zc + d * (half - 0.08);
    kit.boxMM("impPaintedMetal", [xf - 0.08, y, Math.min(za, zb)], [xf + 0.08, y + wallH, Math.max(za, zb)], { color: IMP.trim, texel: 1 });
    kit.boxMM("impPanel", [xf - 0.092, y + 0.15, Math.min(za, zb) + 0.03], [xf + 0.092, y + wallH - 0.12, Math.max(za, zb) - 0.03], { color: IMP.wallDark, uv: "keep" });
  }
  // jambs with the field emitters, header with a status lamp, collider on the solid parts
  for (const d of [-1, 1]) {
    const zj = zc + d * (doorW / 2 + 0.03);
    kit.box("impPaintedMetal", xf, y + 1.25, zj, 0.26, 2.5, 0.12, { color: IMP.trim, texel: 1 });
    kit.box("crewEmit", xf, y + 1.25, zj - d * 0.065, 0.14, 2.2, 0.006, { color: emitterColor });
  }
  kit.box("impPaintedMetal", xf, y + 2.5 + (wallH - 2.5) / 2, zc, 0.26, wallH - 2.5, doorW + 0.3, { color: IMP.trim, texel: 1 });
  kit.box("crewEmit", xf - s * 0.135, y + 2.56, zc, 0.006, 0.04, 0.6, { color: lampColor });
  kit.box("impPaintedMetal", xf - s * 0.135, y + 2.9, zc, 0.006, 0.28, 0.9, { color: IMP.consoleDark, texel: 1 });
  // cell state lamps beside the number: occupied / field / lock (the open cell shows only a green lock lamp)
  for (const [k, c] of (open ? [0x1c2228, 0x1c2228, 0x40ff70] : [RED, FIELD, 0xffb454]).entries()) kit.box("crewEmit", xf - s * 0.14, y + 2.9, zc + 0.08 + k * 0.11, 0.006, 0.055, 0.055, { color: c });
  kit.add("impDecal", new THREE.PlaneGeometry(0.22, 0.22), { pos: [xf - s * 0.14, y + 2.9, zc - 0.25], rot: [0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0], uv: "keep", uvRect: impDecalRect([0, 3, 6, 9, 15, 11, 5, 2][num - 1]) });
  kit.collider([xf - 0.14, y, zc - half], [xf + 0.14, y + wallH, zc - doorW / 2], "cellFront");
  kit.collider([xf - 0.14, y, zc + doorW / 2], [xf + 0.14, y + wallH, zc + half], "cellFront");
  if (!open) kit.collider([xf - 0.06, y, zc - doorW / 2], [xf + 0.06, y + wallH, zc + doorW / 2], "forceField");
  // interior: bunk slab along the back wall, mattress, sanitation unit, light cage, number plate
  const xb = s * (blockX - 0.1 - 0.024); // back wall face
  const bx = xb - s * 0.45;
  kit.box("impPaintedMetal", bx, y + 0.22, zc + 0.3, 0.9, 0.44, 2.0, { color: IMP.trim, texel: 1 });
  kit.box("impFabric", bx, y + 0.47, zc + 0.3, 0.84, 0.06, 1.9, { color: IMP.fabricBlack, uv: "world", texel: 2 });
  kit.box("impFabric", bx, y + 0.52, zc - 0.45, 0.6, 0.06, 0.34, { color: IMP.fabricGrey, uv: "world", texel: 2 });
  kit.collider([Math.min(xb, bx - s * 0.45), y, zc - 0.7], [Math.max(xb, bx - s * 0.45), y + 0.5, zc + 1.3], "bunk");
  const ux = xb - s * 0.32;
  const uz = zc - half + 0.55;
  kit.add("impMetal", new THREE.CylinderGeometry(0.22, 0.24, 0.42, 12), { pos: [ux, y + 0.21, uz], color: IMP.gunmetal, uv: "scale", uvScale: [1, 0.4] });
  kit.add("impMetal", new THREE.CylinderGeometry(0.16, 0.16, 0.02, 12), { pos: [ux, y + 0.43, uz], color: IMP.black, uv: "scale", uvScale: [1, 0.1] });
  kit.box("impPaintedMetal", xb - s * 0.12, y + 0.7, uz, 0.24, 0.3, 0.3, { color: IMP.wallDark, texel: 2 });
  kit.box("crewEmit", xb - s * 0.245, y + 0.78, uz, 0.006, 0.02, 0.12, { color: FIELD });
  kit.collider([Math.min(ux - 0.26, xb), y, uz - 0.26], [Math.max(ux + 0.26, xb), y + 0.5, uz + 0.26], "sanitation");
  // caged ceiling light: white strip behind bars, a red status lamp; number plate on the back wall
  kit.box("impPaintedMetal", s * (corrX + 2.2), y + wallH - 0.06, zc, 1.2, 0.12, 0.5, { color: IMP.trim, texel: 1 });
  kit.box("crewEmit", s * (corrX + 2.2), y + wallH - 0.125, zc, 1.0, 0.006, 0.3, { color: 0xffffff });
  for (let i = 0; i < 6; i++) kit.box("impMetal", s * (corrX + 2.2) - 0.5 + i * 0.2, y + wallH - 0.15, zc, 0.02, 0.02, 0.5, { color: IMP.steel });
  kit.box("impPaintedMetal", xb - s * 0.02, y + 1.9, zc + 0.3, 0.04, 0.3, 0.5, { color: IMP.consoleDark, texel: 1 });
  kit.add("impDecal", new THREE.PlaneGeometry(0.24, 0.24), { pos: [xb - s * 0.045, y + 1.9, zc + 0.42], rot: [0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0], uv: "keep", uvRect: impDecalRect([0, 3, 6, 9, 15, 11, 5, 2][num - 1]) });
  kit.box("crewEmit", xb - s * 0.045, y + 1.9, zc + 0.14, 0.006, 0.03, 0.08, { color: RED });
  kit.box("crewPaintRed", xb - s * 0.03, y + 1.1, zc + 0.3, 0.004, 0.06, 2.4);
}

// Barred wall from -> to ([x,z]) at floor y, height h: steel bars at 0.18 m, rails, posts, top plate,
// with `openings` [[u0,u1], ...] left clear (a header closes them above 2.3 m). One collider per span.
function barWall(kit, from, to, y, h, opts = {}) {
  const { openings = [] } = opts;
  const { frame, length } = wallFrame(kit, from, to, y);
  const inOpening = (u) => openings.some(([a, b]) => u > a && u < b);
  for (let u = 0.1; u < length - 0.05; u += 0.18) {
    const v0 = inOpening(u) ? 2.3 : 0.05;
    frame.box("impMetal", u, (v0 + h - 0.05) / 2, 0, 0.035, h - 0.05 - v0, 0.035, { color: IMP.steel });
  }
  for (const v of [0.05, 1.05, 2.3, h - 0.06]) frame.box("impPaintedMetal", length / 2, v, 0, length, 0.07, 0.09, { color: IMP.trim, texel: 1 });
  frame.box("impPaintedMetal", length / 2, h - 0.1, 0, length, 0.2, 0.3, { color: IMP.consoleDark, texel: 1 });
  for (const u of [0.07, length - 0.07]) frame.box("impPaintedMetal", u, h / 2, 0, 0.14, h, 0.14, { color: IMP.trim, texel: 1 });
  let cur = 0;
  const spans = [];
  for (const [a, b] of [...openings].sort((p, q) => p[0] - q[0])) {
    if (a > cur + 0.02) spans.push([cur, a]);
    for (const u of [a, b]) frame.box("impPaintedMetal", u, 1.15, 0, 0.14, 2.3, 0.2, { color: IMP.trim, texel: 1 });
    frame.box("crewEmit", (a + b) / 2, 2.36, 0.1, 0.6, 0.04, 0.01, { color: RED });
    cur = b;
  }
  if (cur < length - 0.02) spans.push([cur, length]);
  for (const [a, b] of spans) frame.collider(a, b, 0, h, -0.1, 0.1, "bars");
}

// Barred gate leaf hinged at `hinge` ([x,z]) swung to `angle` (world yaw of the leaf's direction), width w,
// height h. A collider covers the leaf's AABB.
function barLeaf(kit, hinge, angle, w, h, y) {
  const end = [hinge[0] + Math.cos(angle) * w, hinge[1] - Math.sin(angle) * w];
  const { frame, length } = wallFrame(kit, hinge, end, y);
  frame.box("impPaintedMetal", length / 2, h / 2, 0, length, h, 0.05, { color: IMP.trim, texel: 1 });
  frame.box("impPaintedMetal", length / 2, h / 2, 0, length - 0.16, h - 0.2, 0.02, { color: IMP.black, texel: 1 });
  for (let u = 0.1; u < length - 0.05; u += 0.18) frame.box("impMetal", u, h / 2, 0, 0.035, h - 0.14, 0.06, { color: IMP.steel });
  frame.box("impPaintedMetal", length / 2, h / 2, 0, length, 0.07, 0.09, { color: IMP.trim, texel: 1 });
  frame.box("impPaintedMetal", length - 0.2, 1.05, 0.06, 0.24, 0.3, 0.04, { color: IMP.consoleDark, texel: 1 });
  frame.box("crewEmit", length - 0.2, 1.12, 0.085, 0.14, 0.03, 0.006, { color: 0x40ff70 });
  kit.add("impMetal", new THREE.CylinderGeometry(0.05, 0.05, h + 0.05, 10), { pos: [hinge[0], y + h / 2, hinge[1]], color: IMP.gunmetal, uv: "scale", uvScale: [0.3, 2] });
  kit.collider([Math.min(hinge[0], end[0]) - 0.06, y, Math.min(hinge[1], end[1]) - 0.06], [Math.max(hinge[0], end[0]) + 0.06, y + h, Math.max(hinge[1], end[1]) + 0.06], "gateLeaf");
}

// Wall comms / call panel on a frame: dark housing (n0 .. n0 + 0.12) with two state lamps in a gloss
// inset, speaker slots and a call bar — replaces the old indicator-grid squares.
function commsPanel(frame, u, v, n0 = 0) {
  frame.box("impPaintedMetal", u, v, n0 + 0.06, 0.24, 0.36, 0.12, { color: IMP.consoleDark, texel: 1 });
  frame.box("darkGloss", u, v + 0.09, n0 + 0.122, 0.18, 0.09, 0.006);
  frame.box("crewEmit", u - 0.05, v + 0.09, n0 + 0.126, 0.03, 0.03, 0.006, { color: 0x40ff70 });
  frame.box("crewEmit", u + 0.05, v + 0.09, n0 + 0.126, 0.03, 0.03, 0.006, { color: RED });
  for (let k = 0; k < 4; k++) frame.box("impPaintedMetal", u, v - 0.02 - k * 0.03, n0 + 0.122, 0.16, 0.012, 0.006, { color: IMP.black, texel: 2 });
  frame.box("impMetal", u, v - 0.14, n0 + 0.128, 0.1, 0.02, 0.016, { color: IMP.steel });
}

// Fold-down wall bench on a frame face: steel slab on two brackets under a wall rail, one collider.
function wallBench(frame, u, len) {
  frame.box("impMetal", u, 0.47, 0.22, len, 0.05, 0.42, { color: IMP.steel, texel: 1 });
  frame.box("impPaintedMetal", u, 0.5, 0.22, len - 0.1, 0.02, 0.38, { color: IMP.wallDark, texel: 1 });
  for (const s of [-1, 1]) {
    frame.box("impPaintedMetal", u + s * (len / 2 - 0.2), 0.3, 0.2, 0.06, 0.3, 0.38, { color: IMP.trim, texel: 1 });
    frame.box("impPaintedMetal", u + s * (len / 2 - 0.2), 0.16, 0.03, 0.08, 0.32, 0.06, { color: IMP.trim, texel: 1 });
  }
  frame.box("impPaintedMetal", u, 0.62, 0.02, len, 0.06, 0.04, { color: IMP.trim, texel: 1 });
  frame.collider(u - len / 2, u + len / 2, 0, 0.55, 0, 0.45, "wallBench");
}

// Angled console pad on a desk top: dark base, gloss wedge and a lit display tilted toward the operator.
// pos = desk-top point under the pad centre; yaw as for a chair sat at the pad (yaw 0: operator at +Z).
function deskPad(kit, pos, yaw, w, h, mat, tilt = 0.32) {
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const rise = (Math.sin(tilt) * h) / 2;
  const tq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt));
  kit.add("impPaintedMetal", new THREE.BoxGeometry(w + 0.1, 0.03, h + 0.1), { pos: L(0, 0.015, 0).toArray(), quat: q, color: IMP.consoleDark, texel: 2 });
  kit.add("darkGloss", new THREE.BoxGeometry(w + 0.06, 0.02, h + 0.06), { pos: L(0, 0.03 + rise, 0).toArray(), quat: tq });
  const g = new THREE.PlaneGeometry(w, h);
  g.rotateX(-Math.PI / 2 + tilt);
  kit.add(mat, g, { pos: L(0, 0.045 + rise, 0).toArray(), quat: q, uv: "keep" });
}

// Wall-mounted restraint rack on a frame: framed back plate with a red stripe, two steel bars, hanging
// binder pairs, shackle bars with ankle rings, a collar, a coiled cable, a control box with a lamp.
function restraintRack(frame, u, v) {
  frame.box("impPaintedMetal", u, v, 0.03, 1.9, 1.4, 0.06, { color: IMP.consoleDark, texel: 1 });
  frame.box("impPanel", u, v, 0.062, 1.8, 1.3, 0.004, { color: IMP.wallDark, uv: "keep" });
  frame.box("crewPaintRed", u, v + 0.6, 0.066, 1.7, 0.05, 0.004);
  for (const dv of [0.4, -0.15]) {
    frame.cylU("impMetal", u, v + dv, 0.12, 0.018, 1.7, { color: IMP.steel, segments: 8 });
    for (const du of [-0.8, 0.8]) frame.box("impPaintedMetal", u + du, v + dv, 0.08, 0.06, 0.08, 0.1, { color: IMP.trim, texel: 2 });
  }
  const ring = (cu, cv, cn, r, tube = 0.012) => frame.add("impMetal", new THREE.TorusGeometry(r, tube, 6, 16), cu, cv, cn, { color: IMP.steel, uv: "scale", uvScale: [1, 1] });
  for (let k = 0; k < 3; k++) {
    const bu = u - 0.62 + k * 0.32;
    ring(bu - 0.05, v + 0.3, 0.12, 0.045);
    ring(bu + 0.05, v + 0.3, 0.12, 0.045);
    frame.box("impMetal", bu, v + 0.3, 0.12, 0.1, 0.02, 0.02, { color: IMP.gunmetal });
  }
  for (const du of [0.35, 0.55]) {
    frame.cylV("impMetal", u + du, v + 0.05, 0.12, 0.014, 0.7, { color: IMP.steel, segments: 8 });
    ring(u + du, v - 0.32, 0.12, 0.05);
  }
  ring(u - 0.55, v - 0.3, 0.12, 0.09, 0.016);
  for (let k = 0; k < 4; k++) ring(u + 0.1 + k * 0.01, v - 0.3, 0.1 + k * 0.014, 0.13, 0.01);
  frame.box("impPaintedMetal", u + 0.75, v - 0.36, 0.09, 0.22, 0.28, 0.12, { color: IMP.consoleDark, texel: 1 });
  frame.box("crewEmit", u + 0.75, v - 0.27, 0.152, 0.12, 0.03, 0.006, { color: RED });
  frame.box("leds", u + 0.75, v - 0.42, 0.152, 0.14, 0.05, 0.006, { uv: "keep" });
}

// Square deck drain: dark recess under a steel frame with bars. pos = [x, deck top y, z], s = size.
function floorGrate(kit, pos, s = 0.7) {
  const [x, y, z] = pos;
  kit.box("impPaintedMetal", x, y + 0.002, z, s, 0.004, s, { color: IMP.black, texel: 2 });
  for (const d of [-1, 1]) {
    kit.box("impMetal", x + d * (s / 2 - 0.02), y + 0.008, z, 0.04, 0.012, s, { color: IMP.steel, texel: 2 });
    kit.box("impMetal", x, y + 0.008, z + d * (s / 2 - 0.02), s, 0.012, 0.04, { color: IMP.steel, texel: 2 });
  }
  const n = Math.round(s / 0.08);
  for (let i = 1; i < n; i++) kit.box("impMetal", x - s / 2 + i * (s / n), y + 0.007, z, 0.02, 0.008, s - 0.08, { color: IMP.gunmetal, texel: 2 });
}

// Steel bench (no upholstery): slab on two pedestals with a boot rail. pos = floor centre, len along
// local x, yaw.
function steelBench(kit, pos, len, yaw = 0) {
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: L(x, y, z).toArray(), quat: q, ...extra });
  for (const s of [-1, 1]) box("impPaintedMetal", s * (len / 2 - 0.3), 0.21, 0, 0.12, 0.42, 0.4, { color: IMP.trim, texel: 1 });
  box("impPaintedMetal", 0, 0.12, 0, len - 0.7, 0.05, 0.05, { color: IMP.trim, texel: 1 });
  box("impMetal", 0, 0.45, 0, len, 0.06, 0.46, { color: IMP.steel, texel: 1 });
  box("impPaintedMetal", 0, 0.41, 0, len - 0.1, 0.03, 0.4, { color: IMP.wallDark, texel: 1 });
  const a = L(-len / 2, 0, -0.25);
  const b = L(len / 2, 0, 0.25);
  kit.collider([Math.min(a.x, b.x), pos[1], Math.min(a.z, b.z)], [Math.max(a.x, b.x), pos[1] + 0.5, Math.max(a.z, b.z)], "bench");
}

// Restraint chair: heavy pedestal bolted to a plate, seat and reclined back, arm rests with cuff rings,
// a foot plate with ankle clamps, a head brace. pos = floor centre, yaw 0 faces -Z.
function interrogationChair(kit, pos, yaw = 0) {
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: L(x, y, z).toArray(), quat: q, ...extra });
  box("impPaintedMetal", 0, 0.03, 0.1, 1.0, 0.06, 1.2, { color: IMP.trim, texel: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.add("impMetal", new THREE.CylinderGeometry(0.04, 0.04, 0.03, 8), { pos: L(sx * 0.42, 0.07, 0.1 + sz * 0.52).toArray(), color: IMP.steel, uv: "scale", uvScale: [0.3, 0.1] });
  box("impPaintedMetal", 0, 0.28, 0.1, 0.4, 0.44, 0.5, { color: IMP.consoleDark, texel: 1 });
  box("impMetal", 0, 0.53, 0.05, 0.62, 0.08, 0.6, { color: IMP.gunmetal, texel: 1 }); // seat
  box("impRubber", 0, 0.58, 0.05, 0.54, 0.04, 0.52, { color: IMP.rubber });
  const bq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.25));
  const bp = L(0, 1.02, 0.4);
  kit.add("impMetal", new THREE.BoxGeometry(0.6, 1.0, 0.1), { pos: [bp.x, bp.y, bp.z], quat: bq, color: IMP.gunmetal, texel: 1 });
  kit.add("impRubber", new THREE.BoxGeometry(0.5, 0.86, 0.04), { pos: L(0, 1.0, 0.33).toArray(), quat: bq, color: IMP.rubber });
  box("impMetal", 0, 1.56, 0.5, 0.36, 0.14, 0.08, { color: IMP.gunmetal }); // head brace
  for (const s of [-1, 1]) {
    box("impMetal", s * 0.36, 0.72, 0.05, 0.06, 0.3, 0.06, { color: IMP.gunmetal });
    box("impMetal", s * 0.36, 0.88, 0.0, 0.1, 0.05, 0.5, { color: IMP.gunmetal });
    kit.add("impMetal", new THREE.TorusGeometry(0.06, 0.012, 6, 14), { pos: L(s * 0.36, 0.95, -0.12).toArray(), quat: q, color: IMP.steel, uv: "scale", uvScale: [1, 1] });
    box("impMetal", s * 0.16, 0.12, -0.42, 0.14, 0.06, 0.28, { color: IMP.gunmetal });
    kit.add("impMetal", new THREE.TorusGeometry(0.07, 0.012, 6, 14), { pos: L(s * 0.16, 0.22, -0.42).toArray(), quat: q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)), color: IMP.steel, uv: "scale", uvScale: [1, 1] });
  }
  box("impMetal", 0, 0.1, -0.42, 0.5, 0.03, 0.34, { color: IMP.gunmetal, texel: 1 }); // foot plate
  box("crewEmit", 0.15, 0.32, -0.16, 0.08, 0.02, 0.006, { color: RED });
  const a = L(-0.5, 0, -0.6);
  const b = L(0.5, 0, 0.7);
  kit.collider([Math.min(a.x, b.x), pos[1], Math.min(a.z, b.z)], [Math.max(a.x, b.x), pos[1] + 1.6, Math.max(a.z, b.z)], "chair");
}

// Interrogation apparatus: a black sphere bristling with probes and a red optic, carried on a jointed
// ceiling arm from `mount` (ceiling point) to `head` (sphere centre).
function interrogationArm(kit, mount, head) {
  const m = new THREE.Vector3(...mount);
  const hd = new THREE.Vector3(...head);
  const elbow = new THREE.Vector3(m.x, (m.y + hd.y) / 2 + 0.45, m.z).lerp(new THREE.Vector3(hd.x, hd.y + 0.9, hd.z), 0.5);
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.22, 0.26, 0.16, 16), { pos: [m.x, m.y - 0.08, m.z], color: IMP.consoleDark, uv: "scale", uvScale: [2, 0.3] });
  const seg = (a, b, r) => {
    const d = b.clone().sub(a);
    const len = d.length();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    kit.add("impMetal", new THREE.CylinderGeometry(r, r, len, 10), { pos: mid.toArray(), quat: q, color: IMP.gunmetal, uv: "scale", uvScale: [0.5, len] });
  };
  seg(new THREE.Vector3(m.x, m.y - 0.16, m.z), elbow, 0.05);
  kit.add("impMetal", new THREE.SphereGeometry(0.1, 12, 8), { pos: elbow.toArray(), color: IMP.steel, uv: "scale", uvScale: [1, 1] });
  const wrist = hd.clone().add(new THREE.Vector3(0, 0.42, 0));
  seg(elbow, wrist, 0.04);
  kit.add("impMetal", new THREE.SphereGeometry(0.08, 12, 8), { pos: wrist.toArray(), color: IMP.steel, uv: "scale", uvScale: [1, 1] });
  seg(wrist, hd.clone().add(new THREE.Vector3(0, 0.3, 0)), 0.03);
  // the apparatus: gloss black sphere, equator band, probes, red optic, a hypo arm
  kit.add("darkGloss", new THREE.SphereGeometry(0.32, 20, 14), { pos: hd.toArray() });
  kit.add("impMetal", new THREE.TorusGeometry(0.325, 0.02, 8, 32), { pos: hd.toArray(), rot: [Math.PI / 2, 0, 0], color: IMP.gunmetal, uv: "scale", uvScale: [4, 1] });
  const rand = rng(17);
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const el = -0.9 + rand() * 1.0;
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    const len = 0.14 + rand() * 0.2;
    const p = hd.clone().addScaledVector(dir, 0.32 + len / 2);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    kit.add("impMetal", new THREE.CylinderGeometry(0.008, 0.016, len, 6), { pos: p.toArray(), quat: q, color: IMP.steel, uv: "scale", uvScale: [0.1, 0.3] });
  }
  const eye = hd.clone().add(new THREE.Vector3(-0.29, -0.06, 0.12));
  kit.add("crewEmit", new THREE.SphereGeometry(0.045, 10, 8), { pos: eye.toArray(), color: RED, uv: "scale", uvScale: [1, 1] });
  kit.add("impMetal", new THREE.TorusGeometry(0.06, 0.01, 6, 16), { pos: eye.toArray(), rot: [0, Math.PI / 2 + 0.4, 0], color: IMP.gunmetal, uv: "scale", uvScale: [1, 1] });
  const hypo = hd.clone().add(new THREE.Vector3(-0.2, -0.3, 0.05));
  kit.add("impMetal", new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), { pos: hypo.toArray(), rot: [0.3, 0, 0.9], color: IMP.steel, uv: "scale", uvScale: [0.2, 0.3] });
  kit.add("crewEmit", new THREE.CylinderGeometry(0.014, 0.014, 0.1, 8), { pos: hypo.clone().add(new THREE.Vector3(0.02, 0.02, 0)).toArray(), rot: [0.3, 0, 0.9], color: FIELD, uv: "scale", uvScale: [0.2, 0.2] });
  kit.collider([hd.x - 0.4, hd.y - 0.4, hd.z - 0.4], [hd.x + 0.4, hd.y + 0.4, hd.z + 0.4], "apparatus");
}

// Wheeled instrument cart with a tray of implements
function toolCart(kit, pos, yaw = 0) {
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: L(x, y, z).toArray(), quat: q, ...extra });
  box("impPaintedMetal", 0, 0.42, 0, 0.6, 0.6, 0.45, { color: IMP.consoleDark, texel: 1 });
  box("impPanel", 0, 0.42, 0.232, 0.5, 0.5, 0.012, { color: IMP.wallDark, uv: "keep" });
  box("impMetal", 0, 0.75, 0, 0.64, 0.04, 0.5, { color: IMP.steel, texel: 2 });
  box("impMetal", 0, 0.79, 0, 0.5, 0.04, 0.36, { color: IMP.gunmetal, texel: 2 });
  for (let k = 0; k < 6; k++) box("impMetal", -0.18 + k * 0.07, 0.83, (k % 2) * 0.08 - 0.04, 0.02, 0.012, 0.16 + (k % 3) * 0.04, { color: [IMP.steel, IMP.gunmetal][k % 2] });
  box("crewEmit", 0.15, 0.6, 0.24, 0.1, 0.02, 0.006, { color: RED });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.add("impMetal", new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), { pos: L(sx * 0.24, 0.06, sz * 0.16).toArray(), quat: q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)), color: IMP.rubber, uv: "scale", uvScale: [0.3, 0.1] });
  const a = L(-0.34, 0, -0.28);
  const b = L(0.34, 0, 0.28);
  kit.collider([Math.min(a.x, b.x), pos[1], Math.min(a.z, b.z)], [Math.max(a.x, b.x), pos[1] + 0.9, Math.max(a.z, b.z)], "cart");
}
