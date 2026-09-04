// Armory & equipment storage (Deck 7): the locked door opens onto a narrow issue lobby along the east
// wall — kit-up benches, personal lockers, a trooper armour display case, a test-fire lane at the
// south end — facing a floor-to-ceiling steel cage. The issue counter sits under a shuttered hatch in
// the cage on the door axis; a barred gate stands open at the north end. Behind the bars: four rows of
// double-sided rifle racks (instanced rifles) split by a cross aisle, armour lockers along the north
// and west walls, helmet shelving on the west wall, heavy repeating blasters, power-cell crate stacks,
// a maintenance bench and the security console. Harsh white light, red restricted lines and stencils.
import * as THREE from "three";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { lockers, crate, ceilingLight, wallScreen, screenArray, doorSign } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { ensureCrewMaterials, instancedProp, partition, counter, shelfUnit, wallCabinet, floorDecal, floorLine, namePlate, cameraPod, medConsole, yawQ, rng } from "./crewKit.js";

const HARSH = 0xf2f6ff;
const RED = 0xff2a2a;

export function buildArmory(kit, ctx) {
  ensureCrewMaterials(ctx.mats);
  const { room, floorY: y } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const walls = roomWalls(room);
  const xW = x0 + STD.wallT;
  const xE = x1 - STD.wallT;
  const zN = z0 + STD.wallT;
  const zS = z1 - STD.wallT;
  const doorZ = 322;

  buildShell(kit, ctx, ctx.id, room, {
    wall: { pitch: 3.5, tone: IMP.wallMid, toneAlt: IMP.wallDark, bandMat: "lightBand", styles: { plain: 0.55, vent: 0.18, hatch: 0.17, pipes: 0.1 } },
    floor: { tone: 0x5e636a, strip: false },
    ceiling: { lights: false, panelW: 2.0, tone: IMP.wallMid },
  });

  // ---- plan ------------------------------------------------------------------------------------
  const cageX = -7.0; // the bars
  const hatch = [320.0, 324.0]; // hatch opening over the counter
  const gate = [311.4, 313.0]; // gate opening (leaf stands open into the store)
  const rowsX = [-12.0, -16.2, -20.4, -24.6]; // rifle rack rows (racks run north–south)
  const rackZ = [312.2, 317.2, 326.8, 331.8]; // rack centres (4.6 m racks); cross aisle z 319.5–324.5

  // ---- the cage --------------------------------------------------------------------------------
  {
    const bars = [];
    const pitch = 0.19;
    const inOpening = (z, o) => z > o[0] && z < o[1];
    for (let z = zN + 0.12; z < zS - 0.06; z += pitch) {
      let v0 = 0.05;
      let v1 = h - 0.05;
      if (inOpening(z, gate)) v0 = 2.3;
      if (inOpening(z, hatch)) v0 = 2.3;
      const g = new THREE.BoxGeometry(0.03, v1 - v0, 0.03);
      g.translate(cageX, y + (v0 + v1) / 2, z);
      bars.push(g);
    }
    for (const g of bars) kit.add("impMetal", g, { color: IMP.steel, texel: 1 });
    // rails, posts, top plate
    for (const v of [0.05, 1.05, 2.3, h - 0.06]) kit.box("impPaintedMetal", cageX, y + v, (zN + zS) / 2, 0.09, 0.07, zS - zN, { color: IMP.trim, texel: 1 });
    for (const z of [zN + 0.07, 309.2, gate[0] - 0.1, gate[1] + 0.1, 316.6, hatch[0] - 0.12, hatch[1] + 0.12, 327.6, 331.2, 334.8, zS - 0.07]) kit.box("impPaintedMetal", cageX, y + h / 2, z, 0.14, h, 0.14, { color: IMP.trim, texel: 1 });
    kit.box("impPaintedMetal", cageX, y + h - 0.12, (zN + zS) / 2, 0.5, 0.24, zS - zN, { color: IMP.consoleDark, texel: 1 });
    kit.box("crewEmit", cageX + 0.26, y + h - 0.12, (zN + zS) / 2, 0.006, 0.05, zS - zN - 0.4, { color: RED });
    kit.box("crewEmit", cageX - 0.26, y + h - 0.12, (zN + zS) / 2, 0.006, 0.05, zS - zN - 0.4, { color: RED });
    // hatch: sill trim on the counter top, header with a status strip, half-closed shutter
    kit.box("impPaintedMetal", cageX, y + 2.3, (hatch[0] + hatch[1]) / 2, 0.3, 0.14, hatch[1] - hatch[0] + 0.3, { color: IMP.trim, texel: 1 });
    kit.box("blinkSparse", cageX + 0.152, y + 2.3, (hatch[0] + hatch[1]) / 2, 0.006, 0.08, hatch[1] - hatch[0] - 0.4, { uv: "keep" });
    for (const s of [-1, 1]) kit.box("impPaintedMetal", cageX, y + 1.6, s > 0 ? hatch[1] + 0.06 : hatch[0] - 0.06, 0.24, 1.4, 0.12, { color: IMP.trim, texel: 1 });
    kit.box("impPaintedMetal", cageX, y + 1.63, hatch[0] + 0.95, 0.06, 1.3, 1.9, { color: IMP.wallDark, texel: 1 });
    kit.box("impPanel", cageX + 0.035, y + 1.63, hatch[0] + 0.95, 0.012, 1.1, 1.7, { color: IMP.wallMid, uv: "keep" });
    kit.box("crewPaintRed", cageX + 0.045, y + 2.1, hatch[0] + 0.95, 0.004, 0.12, 1.7);
    kit.box("impMetal", cageX + 0.06, y + 1.63, hatch[0] + 1.85, 0.03, 0.9, 0.05, { color: IMP.steel }); // shutter handle bar
    // counter under the hatch (doors on the store side) with the issue terminal inset in the top on
    // the store side, and a kit being issued through the open half of the hatch: helmet, folded chest
    // and back plates with the belt on top, a rifle laid across, a tray of power cells, a datapad
    counter(kit, [cageX, y, (hatch[0] + hatch[1]) / 2], hatch[1] - hatch[0] + 0.8, Math.PI / 2, { d: 1.0, h: 0.92, doors: true, tone: IMP.consoleDark, kickLight: "emitRed", tag: "issueCounter" });
    kit.box("darkGloss", cageX - 0.25, y + 0.925, hatch[0] + 0.7, 0.32, 0.012, 0.5);
    kit.box("screen2", cageX - 0.25, y + 0.933, hatch[0] + 0.7, 0.28, 0.004, 0.44, { uv: "keep" });
    kit.box("darkGloss", cageX - 0.32, y + 0.93, hatch[1] - 0.35, 0.22, 0.012, 0.3);
    buildHelmet(kit, [cageX + 0.25, y + 0.92, hatch[1] - 0.45], yawQ(Math.PI / 2 + 0.3));
    kit.box("impPaintedMetal", cageX + 0.24, y + 0.98, hatch[1] - 1.05, 0.42, 0.12, 0.5, { color: IMP.white, texel: 2 });
    kit.box("impPaintedMetal", cageX + 0.24, y + 1.07, hatch[1] - 1.05, 0.3, 0.06, 0.34, { color: IMP.black, texel: 2 });
    kit.box("impPaintedMetal", cageX + 0.24, y + 1.11, hatch[1] - 1.05, 0.2, 0.03, 0.16, { color: IMP.wallMid, texel: 2 });
    // rifle laid along the counter behind the kit (grip down, scope up), stock toward the shutter
    buildRifle(kit, [cageX - 0.28, y + 1.02, hatch[0] + 2.05], yawQ(0.12).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)));
    kit.box("impMetal", cageX + 0.3, y + 0.94, hatch[0] + 2.2, 0.3, 0.04, 0.24, { color: IMP.steel, texel: 2 });
    for (let k = 0; k < 4; k++) kit.add("impMetal", new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), { pos: [cageX + 0.3, y + 0.985, hatch[0] + 2.11 + k * 0.06], rot: [0, 0, Math.PI / 2], color: k === 2 ? IMP.gunmetal : IMP.steel, uv: "scale", uvScale: [0.2, 0.3] });
    kit.box("crewEmit", cageX + 0.3, y + 0.965, hatch[0] + 2.31, 0.28, 0.008, 0.02, { color: 0x40ff70 });
    // requisition slip and stylus by the terminal on the store side
    kit.box("impPaintedMetal", cageX - 0.3, y + 0.928, hatch[0] + 1.35, 0.22, 0.006, 0.3, { color: IMP.wallLight, texel: 2 });
    kit.add("impMetal", new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6), { pos: [cageX - 0.22, y + 0.94, hatch[0] + 1.42], rot: [0, 0, Math.PI / 2], color: IMP.steel, uv: "scale", uvScale: [0.1, 0.3] });
    // issue trolley inside the cage beside the counter: a rack of two helmets and a stack of chest plates
    kit.box("impPaintedMetal", cageX - 1.05, y + 0.45, hatch[0] - 0.9, 0.6, 0.06, 0.9, { color: IMP.trim, texel: 1 });
    kit.box("impPaintedMetal", cageX - 1.05, y + 0.9, hatch[0] - 0.9, 0.6, 0.04, 0.9, { color: IMP.trim, texel: 1 });
    for (const dz of [-0.4, 0.4]) for (const dx of [-0.26, 0.26]) kit.box("impMetal", cageX - 1.05 + dx, y + 0.5, hatch[0] - 0.9 + dz, 0.03, 1.0, 0.03, { color: IMP.steel });
    for (const [k, dz] of [-0.22, 0.22].entries()) buildHelmet(kit, [cageX - 1.05, y + 0.92, hatch[0] - 0.9 + dz], yawQ(Math.PI / 2 + (k ? 0.2 : -0.15)));
    for (let k = 0; k < 3; k++) kit.box("impPaintedMetal", cageX - 1.05, y + 0.54 + k * 0.1, hatch[0] - 0.9, 0.4, 0.09, 0.5, { color: k === 1 ? IMP.wallLight : IMP.white, texel: 2 });
    kit.collider([cageX - 1.4, y, hatch[0] - 1.4], [cageX - 0.7, y + 1.0, hatch[0] - 0.4], "issueTrolley");
    kit.collider([cageX - 0.12, y, zN], [cageX + 0.12, y + h, gate[0]], "cage");
    kit.collider([cageX - 0.12, y, gate[1]], [cageX + 0.12, y + h, zS], "cage");
    // gate leaf: hinged at the north jamb, standing open 70° into the store
    const a = (70 * Math.PI) / 180;
    const d = [-Math.sin(a), Math.cos(a)];
    const hinge = [cageX, gate[1]];
    const end = [hinge[0] + d[0] * (gate[1] - gate[0]), hinge[1] - d[1] * (gate[1] - gate[0])];
    const { frame: gf, length: gl } = wallFrame(kit, hinge, end, y);
    gf.box("impPaintedMetal", gl / 2, 1.15, 0, gl, 2.2, 0.05, { color: IMP.trim, texel: 1 });
    gf.box("impPaintedMetal", gl / 2, 1.15, 0, gl - 0.16, 2.0, 0.02, { color: IMP.black, texel: 1 });
    for (let u = 0.1; u < gl - 0.05; u += 0.14) gf.box("impMetal", u, 1.15, 0, 0.035, 2.06, 0.06, { color: IMP.steel });
    gf.box("impPaintedMetal", gl / 2, 1.15, 0, gl, 0.07, 0.09, { color: IMP.trim, texel: 1 });
    gf.box("impPaintedMetal", gl - 0.2, 1.05, 0.06, 0.24, 0.3, 0.04, { color: IMP.consoleDark, texel: 1 });
    gf.box("crewEmit", gl - 0.2, 1.12, 0.085, 0.14, 0.03, 0.006, { color: 0x40ff70 });
    kit.collider([Math.min(hinge[0], end[0]) - 0.06, y, Math.min(hinge[1], end[1]) - 0.06], [Math.max(hinge[0], end[0]) + 0.06, y + 2.2, Math.max(hinge[1], end[1]) + 0.06], "gateLeaf");
    // gate header + lamp, hinge post
    kit.box("impPaintedMetal", cageX, y + 2.3, (gate[0] + gate[1]) / 2, 0.3, 0.14, gate[1] - gate[0] + 0.3, { color: IMP.trim, texel: 1 });
    kit.box("crewEmit", cageX + 0.152, y + 2.3, (gate[0] + gate[1]) / 2, 0.006, 0.05, 0.9, { color: RED });
    kit.box("crewEmit", cageX - 0.152, y + 2.3, (gate[0] + gate[1]) / 2, 0.006, 0.05, 0.9, { color: RED });
    kit.add("impMetal", new THREE.CylinderGeometry(0.05, 0.05, 2.25, 10), { pos: [cageX, y + 1.125, gate[1] + 0.02], color: IMP.gunmetal, uv: "scale", uvScale: [0.3, 2] });
    // restricted line on the lobby side: red line with hatch marks along the cage, stop line at the gate
    floorLine(kit, [cageX + 0.75, zN + 0.3], [cageX + 0.75, 329.3], y, 0.1);
    for (let z = zN + 0.8; z < 328.8; z += 1.0) floorLine(kit, [cageX + 0.3, z], [cageX + 0.7, z + 0.4], y, 0.08);
    floorDecal(kit, cageX + 1.6, y, gate[0] - 0.6, 0.7, 13, 90);
    floorDecal(kit, cageX + 1.6, y, hatch[1] + 0.8, 0.6, 15, 90);
    floorDecal(kit, cageX - 1.4, y, (gate[0] + gate[1]) / 2, 0.6, 5, -90);
  }

  // ---- lobby: east wall — lockers, roster screens, door signs, benches, armour display ----------------
  {
    const w = walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    lockers(frame, w.u(307.0), w.u(310.6), 2.1, { doorW: 0.6, tone: IMP.wallDark, seed: 21 });
    frame.box("crewPaintRed", (w.u(307.0) + w.u(310.6)) / 2, 1.5, 0.575, 3.4, 0.05, 0.004);
    wallScreen(frame, w.u(312.6), 2.05, 1.8, 1.0, 1);
    frame.quad("impDecal", w.u(314.2), 2.05, 0.062, 0.5, 0.5, { uvRect: impDecalRect(6) });
    wallScreen(frame, w.u(319.4), 2.1, 1.2, 0.8, 2);
    doorSign(frame, w.u(doorZ), 2.75, { color: "emitRed", decal: 15 });
    frame.quad("impDecal", w.u(doorZ - 1.8), 1.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(13) });
    frame.quad("impDecal", w.u(doorZ + 1.8), 1.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(15) });
    wallScreen(frame, w.u(325.0), 2.1, 1.2, 0.8, 1);
    screenArray(frame, w.u(327.2), 2.1, 1, 2, 0.7, 0.5, { seed: 3, variants: [1, 2] });
    // emergency point + comms panel
    frame.box("impPaintedMetal", w.u(315.75), 1.05, 0.16, 0.6, 0.5, 0.2, { color: IMP.trim, texel: 1 });
    frame.box("crewEmit", w.u(315.75), 1.2, 0.262, 0.4, 0.05, 0.01, { color: RED });
    frame.quad("impDecal", w.u(315.75), 0.95, 0.262, 0.26, 0.26, { uvRect: impDecalRect(13) });
    frame.box("impPaintedMetal", w.u(324.6), 1.3, 0.09, 0.24, 0.36, 0.12, { color: IMP.consoleDark, texel: 1 });
    frame.box("blinkSparse", w.u(324.6), 1.36, 0.152, 0.18, 0.12, 0.006, { uv: "keep" });
    cameraPod(kit, [xE - 0.3, y + h - 0.35, zN + 0.3], -135, -30);
    cameraPod(kit, [xE - 0.3, y + h - 0.35, zS - 0.3], -45, -30);
    cameraPod(kit, [cageX + 0.25, y + h - 0.3, 325.6], -70, -35);
  }
  steelBench(kit, [xE - 0.55, y, 313.9], 3.2, Math.PI / 2);
  steelBench(kit, [xE - 1.0, y, 308.6], 3.0, Math.PI / 2);
  steelBench(kit, [xE - 0.55, y, 326.4], 2.6, Math.PI / 2);
  armourDisplay(kit, [xE - 0.85, y, 316.9], -Math.PI / 2);
  floorDecal(kit, xE - 1.6, y, doorZ, 1.0, 15, -90);
  floorLine(kit, [xE - 0.2, doorZ - 1.4], [cageX + 1.0, doorZ - 1.4], y, 0.08, "crewPaintWhite");
  floorLine(kit, [xE - 0.2, doorZ + 1.4], [cageX + 1.0, doorZ + 1.4], y, 0.08, "crewPaintWhite");

  // ---- test-fire lane at the south end of the lobby ----------------------------------------------------
  {
    const laneX = (cageX + 0.4 + xE) / 2;
    partition(kit, [cageX + 0.5, 329.6], [cageX + 0.5, zS], y, 2.4, { t: 0.1, tone: IMP.wallDark, toneAlt: IMP.wallMid, band: null, features: false, seed: 31, tag: "baffle", pitch: 2.7 });
    // firing stand butts against the baffle; a 1 m gap at the east wall leads downrange to the target
    counter(kit, [laneX - 0.45, y, 329.2], 2.0, 0, { d: 0.6, h: 0.95, doors: false, tone: IMP.consoleDark, top: "impMetal", tag: "firingStand" });
    // on the stand: a closed pistol case, the range log datapad, a rack of spare power cells, ear defenders
    kit.box("impPaintedMetal", laneX - 0.45, y + 0.99, 329.15, 0.5, 0.06, 0.4, { color: IMP.wallDark, texel: 1 });
    kit.box("impMetal", laneX - 0.45, y + 1.0, 329.15, 0.52, 0.01, 0.06, { color: IMP.steel });
    kit.box("darkGloss", laneX - 1.1, y + 0.965, 329.25, 0.3, 0.012, 0.22);
    kit.box("screen1", laneX - 1.1, y + 0.973, 329.25, 0.26, 0.004, 0.18, { uv: "keep" });
    kit.box("impMetal", laneX + 0.25, y + 0.98, 329.15, 0.32, 0.04, 0.2, { color: IMP.steel, texel: 2 });
    for (let k = 0; k < 4; k++) kit.add("impMetal", new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), { pos: [laneX + 0.14 + k * 0.07, y + 1.02, 329.15], rot: [Math.PI / 2, 0, 0], color: k === 1 ? IMP.gunmetal : IMP.steel, uv: "scale", uvScale: [0.2, 0.3] });
    kit.add("impPaintedMetal", new THREE.TorusGeometry(0.09, 0.02, 6, 16, Math.PI), { pos: [laneX + 0.62, y + 0.98, 329.25], rot: [0, 0.3, 0], color: IMP.black, uv: "scale", uvScale: [2, 1] });
    for (const s of [-1, 1]) kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.045, 0.045, 0.04, 10), { pos: [laneX + 0.62 + s * 0.09 * Math.cos(0.3), y + 0.98, 329.25 - s * 0.09 * Math.sin(0.3)], rot: [0, 0.3, Math.PI / 2], color: IMP.black, uv: "scale", uvScale: [0.3, 0.1] });
    floorLine(kit, [cageX + 0.7, 329.9], [xE - 0.2, 329.9], y, 0.12);
    floorDecal(kit, xE - 0.55, y, 329.2, 0.5, 13, 180);
    floorDecal(kit, laneX, y, 330.6, 0.6, 13, 180);
    const w = walls.south;
    const sf = wallFrame(kit, w.from, w.to, y).frame;
    // target: dark board, painted rings, scorch marks, hit-counter screen, range lamp
    sf.box("impPaintedMetal", w.u(laneX), 1.55, 0.09, 1.4, 2.2, 0.06, { color: IMP.consoleDark, texel: 1 });
    sf.box("impPanel", w.u(laneX), 1.55, 0.125, 1.2, 2.0, 0.012, { color: IMP.wallDark, uv: "keep" });
    for (const [r, mat] of [[0.5, "crewPaintWhite"], [0.34, "crewPaintRed"], [0.18, "crewPaintWhite"]]) {
      const t = new THREE.TorusGeometry(r, 0.014, 4, 32);
      const p = sf.pos(w.u(laneX), 1.55, 0.135);
      kit.add(mat, t, { pos: [p.x, p.y, p.z], quat: sf.quat() });
    }
    sf.box("crewPaintRed", w.u(laneX), 1.55, 0.135, 0.05, 0.05, 0.004);
    const rand = rng(9);
    for (let i = 0; i < 9; i++) sf.box("impPaintedMetal", w.u(laneX) + (rand() - 0.5) * 0.9, 1.55 + (rand() - 0.5) * 1.3, 0.134, 0.05 + rand() * 0.06, 0.05 + rand() * 0.06, 0.004, { color: IMP.black });
    wallScreen(sf, w.u(laneX + 1.3), 2.5, 0.7, 0.5, 2, { leds: false });
    sf.box("impPaintedMetal", w.u(laneX - 1.3), 2.6, 0.08, 0.3, 0.2, 0.14, { color: IMP.trim, texel: 1 });
    sf.box("crewEmit", w.u(laneX - 1.3), 2.6, 0.155, 0.22, 0.12, 0.01, { color: RED });
    sf.quad("impDecal", w.u(laneX - 1.3), 2.15, 0.062, 0.4, 0.4, { uvRect: impDecalRect(13) });
    ceilingLight(kit, ctx, [laneX, y + h, 333.6], 5.0, "z", { mat: "lightBand", color: HARSH, intensity: 6, distance: 9, priority: 0, drop: 0.5 });
    // lane baffle face: stripe + "hot range" plate
    const bf = wallFrame(kit, [cageX + 0.5, zS], [cageX + 0.5, 329.6], y).frame;
    bf.box("crewPaintRed", 4.0, 1.1, 0.078, 7.8, 0.12, 0.004);
    namePlate(bf, 1.2, 1.6, { n: 0.074, decal: 13, led: "crewEmit", ledColor: RED });
  }

  // ---- rifle racks (instanced rifles) ------------------------------------------------------------------
  // rack variants per [row][rack]: 0 standard, 1 sealed (red lamps, red band, hazard plates, full),
  // 2 half-issued (amber lamps, issue log on the rail, gaps in the slots), 3 empty (dark, maintenance tags)
  const VARIANTS = [[0, 1, 0, 2], [2, 0, 1, 0], [0, 0, 3, 1], [0, 2, 0, 0]];
  const rifleT = [];
  const rand = rng(41);
  for (const [ri, rx] of rowsX.entries()) {
    for (const [ci, rz] of rackZ.entries()) {
      rifleT.push(...rifleRack(kit, [rx, y, rz], Math.PI / 2, { len: 4.6, perSide: 12, seed: Math.floor(rand() * 1000), variant: VARIANTS[ri][ci] }));
    }
  }
  instancedProp(kit, (k) => buildRifle(k), rifleT);
  // row markers on the deck at the cross aisle + end plates on the racks facing the aisle
  for (const [i, rx] of rowsX.entries()) {
    floorDecal(kit, rx, y, 319.9, 0.6, [0, 3, 6, 9][i], 0);
    floorDecal(kit, rx, y, 324.1, 0.6, [0, 3, 6, 9][i], 180);
  }
  floorLine(kit, [rowsX[3] - 1.2, 319.1], [cageX - 0.6, 319.1], y, 0.08, "crewPaintWhite");
  floorLine(kit, [rowsX[3] - 1.2, 324.9], [cageX - 0.6, 324.9], y, 0.08, "crewPaintWhite");

  // ---- north wall: armour lockers, red band, stencils ---------------------------------------------------
  {
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    lockers(frame, w.u(xW + 0.6), w.u(-9.4), 2.2, { doorW: 0.62, tone: IMP.wallMid, seed: 23 });
    frame.box("crewPaintRed", (w.u(xW + 0.6) + w.u(-9.4)) / 2, 2.34, 0.062, -9.4 - (xW + 0.6) - 0.1, 0.06, 0.004);
    for (const x of [-27, -22, -17, -12]) frame.quad("impDecal", w.u(x), 2.85, 0.062, 0.5, 0.5, { uvRect: impDecalRect([9, 15, 3, 11][((x + 27) / 5) | 0]) });
    wallScreen(frame, w.u(-8.4), 2.2, 1.4, 0.9, 1);
    cameraPod(kit, [xW + 0.3, y + h - 0.35, zN + 0.3], 135, -30);
  }

  // ---- west wall: lockers (north half), helmet shelving (south half), heavy blasters ---------------------
  {
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    lockers(frame, w.u(318.4), w.u(zN + 0.6), 2.2, { doorW: 0.62, tone: IMP.wallMid, seed: 24 });
    frame.box("crewPaintRed", (w.u(318.4) + w.u(zN + 0.6)) / 2, 2.34, 0.062, 318.4 - zN - 0.7, 0.06, 0.004);
    const helmetT = [];
    for (const [a, b] of [[319.4, 327.6], [328.4, 336.6]]) {
      const slots = helmetShelf(frame, w.u(b), w.u(a), 2.2, { shelves: 3, seed: a });
      for (const s of slots) if (rand() < 0.9) helmetT.push(s);
    }
    instancedProp(kit, (k) => buildHelmet(k), helmetT);
    frame.quad("impDecal", w.u(328.0), 2.6, 0.062, 0.5, 0.5, { uvRect: impDecalRect(6) });
    wallScreen(frame, w.u(zS - 1.4), 2.6, 1.0, 0.6, 2, { leds: false });
    cameraPod(kit, [xW + 0.3, y + h - 0.35, zS - 0.3], 45, -30);
  }
  heavyBlaster(kit, [-27.2, y, 321.0], -Math.PI / 2 + 0.25);
  heavyBlaster(kit, [-27.4, y, 324.0], -Math.PI / 2 - 0.15);
  floorLine(kit, [-29.0, 319.4], [-25.6, 319.4], y, 0.08);
  floorLine(kit, [-29.0, 325.6], [-25.6, 325.6], y, 0.08);
  floorDecal(kit, -25.2, y, 322.5, 0.6, 9, 90);

  // ---- south wall: maintenance bench, crate stacks, tool cabinets -------------------------------------
  {
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    counter(kit, [-19.0, y, zS - 0.45], 4.4, 0, { d: 0.9, h: 0.92, doors: true, tone: IMP.consoleDark, top: "impMetal", tag: "bench" });
    // a rifle stripped on the bench, tools, a clamp lamp, parts bins
    buildRifle(kit, [-19.9, y + 0.95, zS - 0.5], new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.4, -Math.PI / 2)));
    kit.box("impPaintedMetal", -18.2, y + 1.0, zS - 0.55, 0.5, 0.1, 0.34, { color: IMP.wallDark, texel: 2 });
    for (let k = 0; k < 5; k++) kit.box("impMetal", -18.4 + k * 0.09, y + 1.06, zS - 0.55 + (k % 2) * 0.06, 0.02, 0.012, 0.2, { color: [IMP.steel, IMP.gunmetal][k % 2] });
    kit.box("impPaintedMetal", -17.3, y + 1.03, zS - 0.5, 0.36, 0.16, 0.3, { color: 0xb8231c, texel: 2 });
    kit.box("impPaintedMetal", -16.95, y + 1.03, zS - 0.5, 0.3, 0.16, 0.3, { color: IMP.wallMid, texel: 2 });
    kit.add("impMetal", new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8), { pos: [-20.9, y + 1.4, zS - 0.8], color: IMP.gunmetal, uv: "scale", uvScale: [0.2, 1] });
    kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.06, 0.12, 0.16, 12), { pos: [-20.6, y + 1.75, zS - 0.95], rot: [0.5, 0, 0.6], color: IMP.consoleDark, uv: "scale", uvScale: [1, 0.3] });
    kit.add("crewEmit", new THREE.CylinderGeometry(0.1, 0.1, 0.01, 12), { pos: [-20.55, y + 1.68, zS - 1.0], rot: [0.5, 0, 0.6], color: 0xfff0d0 });
    wallCabinet(frame, w.u(-17.4), w.u(-20.6), 1.3, 2.05, { glass: false, tone: IMP.wallDark, seed: 27 });
    wallScreen(frame, w.u(-15.6), 1.75, 1.0, 0.7, 2, { leds: false });
    frame.quad("impDecal", w.u(-22.2), 1.8, 0.062, 0.5, 0.5, { uvRect: impDecalRect(3) });
    shelfUnit(frame, w.u(-9.4), w.u(-12.8), 2.2, { d: 0.5, shelves: 4, seed: 28, items: "mixed", palette: [IMP.wallDark, IMP.gunmetal, 0xb8231c, IMP.steel, IMP.consoleDark], tone: IMP.wallDark, fill: 0.8 });
    frame.quad("impDecal", w.u(-11.1), 2.6, 0.062, 0.5, 0.5, { uvRect: impDecalRect(15) });
    frame.box("crewPaintRed", w.u(-14.2), 0.9, 0.062, 1.6, 0.08, 0.004);
    frame.box("crewPaintRed", w.u(-14.2), 1.2, 0.062, 1.6, 0.08, 0.004);
    ceilingLight(kit, ctx, [-19.0, y + h, zS - 1.2], 4.0, "x", { mat: "lightBand", color: HARSH, intensity: 6, distance: 9, priority: 0, drop: 0.5 });
  }
  // power-cell crate stacks: SW corner, behind the counter, on a pallet in the NE of the store
  {
    const r2 = rng(52);
    const stack = (x, z, cols, rows, size, yaw = 0) => {
      const [cw, ch, cd] = size;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) crate(kit, [x + i * (cw + 0.08) * Math.cos(yaw), y + j * ch, z - i * (cw + 0.08) * Math.sin(yaw)], [cw, ch, cd], { yaw, seed: Math.floor(r2() * 999), tone: j % 2 ? IMP.gunmetal : IMP.wallDark, collide: j === 0 });
    };
    stack(-28.6, 336.4, 3, 2, [1.0, 0.7, 0.9]);
    stack(-25.0, 336.6, 2, 3, [0.8, 0.55, 0.7], 0.12);
    stack(-28.8, 333.4, 1, 2, [1.0, 0.7, 0.9], 1.3);
    stack(-8.9, 327.2, 2, 2, [0.8, 0.6, 0.8], Math.PI / 2 + 0.1);
    // pallet with crates and a hover-lifter parked
    kit.box("impPaintedMetal", -9.6, y + 0.07, 308.4, 2.2, 0.14, 1.6, { color: IMP.gunmetal, texel: 1 });
    kit.box("crewPaintRed", -9.6, y + 0.145, 308.4, 2.1, 0.004, 0.1);
    stack(-10.3, 308.4, 2, 2, [0.9, 0.6, 0.9]);
    kit.collider([-10.7, y, 307.6], [-8.5, y + 1.4, 309.2], "pallet");
  }

  // ---- security console inside the cage by the counter, camera-feed screens on the cage post ----------
  medConsole(kit, ctx, [-9.7, y, 316.3], -Math.PI / 2);
  {
    // monitor pillar the operator faces: screens on its west face
    const pf = wallFrame(kit, [-8.38, 313.4], [-8.38, 319.2], y).frame;
    kit.box("impPaintedMetal", -8.3, y + h / 2, 316.3, 0.16, h, 0.9, { color: IMP.trim, texel: 1 });
    screenArray(pf, 2.9, 2.1, 1, 3, 0.6, 0.42, { seed: 7, variants: [1, 2] });
    pf.box("crewEmit", 2.9, 3.1, 0.04, 0.6, 0.03, 0.01, { color: RED });
    kit.collider([-8.4, y, 315.8], [-8.2, y + h, 316.8], "screenPost");
  }
  floorDecal(kit, -9.4, y, 313.8, 0.6, 11, 90);

  // ---- lighting: harsh white bars over every rack aisle and along the cross aisle ------------------------
  // (every second rack-aisle bar carries a real light; the others are emissive only)
  for (const z of [313.4, 330.6]) {
    for (const [i, x] of [-13.6, -18.3, -23.0, -27.4].entries()) ceilingLight(kit, ctx, [x, y + h, z], 8.0, "z", { mat: "lightBand", color: HARSH, intensity: i % 2 === 0 ? 9 : 0, distance: 14, priority: 1, drop: 0.5 });
  }
  for (const x of [-12.6, -19.6, -26.4]) ceilingLight(kit, ctx, [x, y + h, 322.0], 5.0, "x", { mat: "lightBand", color: HARSH, intensity: 8.5, distance: 13, priority: 1, drop: 0.5 });
  ceilingLight(kit, ctx, [-4.9, y + h, 312.6], 8.0, "z", { mat: "lightBand", color: HARSH, intensity: 6.5, distance: 10, priority: 1, drop: 0.5 });
  ceilingLight(kit, ctx, [-4.9, y + h, 322.0], 6.0, "z", { mat: "lightBand", color: HARSH, intensity: 7.5, distance: 10, priority: 2, drop: 0.5 });
  ceilingLight(kit, ctx, [-9.6, y + h, 322.0], 6.0, "z", { mat: "lightBand", color: HARSH, intensity: 6, distance: 9, priority: 0, drop: 0.5 });

  // ---- views --------------------------------------------------------------------------------------
  ctx.view("armory", xE - 0.7, y + STD.eye, doorZ + 1.4, 42, -4);
  ctx.view("armory_counter", -4.9, y + STD.eye, 323.4, 72, -14);
  ctx.view("armory_racks", -9.6, y + STD.eye, 326.6, 62, -5);
  ctx.view("armory_helmets", -23.6, y + STD.eye, 320.6, 122, -5);
  ctx.view("armory_range", -4.7, y + STD.eye, 327.4, 180, -4);
}

// ---------------------------------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------------------------------
/**
 * Blaster rifle in its racked pose: standing on its stock, barrel up (+Y), scope side toward -Z, grip
 * and power pack toward +Z. Drawn at the origin for instancing, or at pos/quat when given.
 */
export function buildRifle(k, pos = [0, 0, 0], quat = null) {
  const q = quat || new THREE.Quaternion();
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => k.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: L(x, y, z).toArray(), quat: q, ...extra });
  const cyl = (mat, x, y, z, r, len, extra = {}) => k.add(mat, new THREE.CylinderGeometry(r, r, len, 8), { pos: L(x, y, z).toArray(), quat: q, uv: "scale", uvScale: [0.3, 0.5], ...extra });
  box("impPaintedMetal", 0, 0.03, 0.01, 0.05, 0.06, 0.1, { color: IMP.black, texel: 2 }); // butt plate
  box("impMetal", 0, 0.2, 0.02, 0.035, 0.3, 0.04, { color: IMP.gunmetal }); // stock bar
  box("impPaintedMetal", 0, 0.5, 0, 0.06, 0.34, 0.11, { color: IMP.black, texel: 2 }); // receiver
  box("impPaintedMetal", 0, 0.39, 0.075, 0.035, 0.12, 0.05, { color: IMP.black, texel: 2 }); // grip
  box("impMetal", 0, 0.46, 0.085, 0.04, 0.14, 0.05, { color: IMP.gunmetal }); // power pack
  box("impPaintedMetal", 0, 0.72, -0.075, 0.03, 0.22, 0.03, { color: IMP.black, texel: 2 }); // scope rail
  cyl("impMetal", 0, 0.74, -0.09, 0.02, 0.24, { color: IMP.gunmetal }); // scope
  box("impMetal", 0, 0.7, -0.005, 0.045, 0.16, 0.06, { color: IMP.gunmetal }); // fore-end
  cyl("impMetal", 0, 1.0, 0.0, 0.014, 0.5, { color: IMP.gunmetal }); // barrel
  cyl("impMetal", 0, 1.24, 0.0, 0.022, 0.06, { color: IMP.steel }); // muzzle
  box("impPaintedMetal", 0.031, 0.56, 0.0, 0.004, 0.02, 0.03, { color: 0xb8231c, texel: 2 }); // charge indicator
  return k;
}

/**
 * Double-sided rifle rack: base plate, centre panel, top rails with slots, end posts, section plate.
 * pos = floor centre, len along local x, yaw. Returns rifle transforms (pos + quat) for instancing.
 */
export function rifleRack(kit, pos, yaw = 0, opts = {}) {
  const { len = 3.8, perSide = 10, seed = 1, variant = 0 } = opts;
  const rand = rng(seed);
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: L(x, y, z).toArray(), quat: q, ...extra });
  // variant: 0 standard, 1 sealed (locked), 2 half-issued, 3 empty / in maintenance
  const panelTone = [IMP.wallMid, IMP.wallDark, IMP.wallMid, IMP.consoleDark][variant];
  const lamp = [0x40ff70, RED, 0xffb454, null][variant];
  const fill = [[0.94, 0.94], [1, 1], [0.35, 0.6], [0, 0]][variant];
  const stripe = variant === 1 ? RED : variant === 3 ? 0xffb454 : RED;
  box("impPaintedMetal", 0, 0.06, 0, len, 0.12, 0.8, { color: IMP.trim, texel: 1 });
  box("impMetal", 0, 0.125, 0, len - 0.1, 0.01, 0.74, { color: IMP.gunmetal, texel: 1 });
  box("impPaintedMetal", 0, 0.72, 0, len - 0.2, 1.2, 0.05, { color: panelTone, texel: 1 });
  for (const s of [-1, 1]) {
    box("impPaintedMetal", 0, 0.95, s * 0.2, len, 0.05, 0.05, { color: IMP.trim, texel: 1 });
    box("impMetal", 0, 0.93, s * 0.2, len - 0.1, 0.02, 0.09, { color: IMP.steel, texel: 1 });
    if (variant !== 3) box("crewEmit", 0, 1.3, s * 0.03, len - 0.4, 0.02, 0.006, { color: stripe });
    // sealed racks carry a red band and hazard plates across the centre panel; empty racks a maintenance stripe
    if (variant === 1) {
      box("crewPaintRed", 0, 1.12, s * 0.028, len - 0.4, 0.1, 0.004);
      for (const dx of [-len / 4, len / 4]) {
        const dg = new THREE.PlaneGeometry(0.26, 0.26);
        if (s < 0) dg.rotateY(Math.PI);
        const dp = L(dx, 0.62, s * 0.03);
        kit.add("impDecal", dg, { pos: [dp.x, dp.y, dp.z], quat: q, uv: "keep", uvRect: impDecalRect(13) });
      }
    } else if (variant === 3) {
      for (let k = -2; k <= 2; k++) box("impPaintedMetal", k * (len / 6), 1.12, s * 0.028, 0.3, 0.1, 0.006, { color: 0xffb454, texel: 2 });
    }
    for (let i = 0; i < perSide; i++) box("impPaintedMetal", -((perSide - 1) * 0.38) / 2 + i * 0.38 + 0.19, 0.95, s * 0.2, 0.03, 0.06, 0.09, { color: IMP.black, texel: 2 });
  }
  // half-issued: the issue log datapad lies on the top rail at one end; empty: two tags hang from the rail
  if (variant === 2) {
    box("darkGloss", len / 2 - 0.5, 0.965, 0.2, 0.24, 0.012, 0.16);
    box("screen1", len / 2 - 0.5, 0.973, 0.2, 0.2, 0.004, 0.12, { uv: "keep" });
  } else if (variant === 3) {
    for (const dx of [-len / 3, len / 3]) box("impPaintedMetal", dx, 0.8, 0.26, 0.12, 0.18, 0.01, { color: 0xffb454, texel: 2 });
  }
  for (const s of [-1, 1]) {
    box("impPaintedMetal", s * (len / 2 - 0.05), 0.7, 0, 0.1, 1.4, 0.8, { color: IMP.trim, texel: 1 });
    box("impPanel", s * (len / 2 + 0.002), 0.9, 0, 0.004, 0.5, 0.6, { color: IMP.consoleDark, uv: "keep" });
    const dp = L(s * (len / 2 + 0.006), 1.0, 0);
    const dg = new THREE.PlaneGeometry(0.3, 0.3);
    dg.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2);
    const id = variant === 1 ? 13 : variant === 3 ? 15 : [0, 3, 6, 9, 11][Math.floor(rand() * 5)];
    kit.add("impDecal", dg, { pos: [dp.x, dp.y, dp.z], quat: q, uv: "keep", uvRect: impDecalRect(id) });
    if (lamp !== null) box("crewEmit", s * (len / 2 + 0.006), 0.72, 0, 0.004, 0.03, 0.3, { color: lamp });
    else box("impPaintedMetal", s * (len / 2 + 0.006), 0.72, 0, 0.004, 0.03, 0.3, { color: IMP.black, texel: 2 });
  }
  const c0 = L(-len / 2, 0, -0.4);
  const c1 = L(len / 2, 0, 0.4);
  kit.collider([Math.min(c0.x, c1.x), pos[1], Math.min(c0.z, c1.z)], [Math.max(c0.x, c1.x), pos[1] + 1.4, Math.max(c0.z, c1.z)], "rack");
  // rifle slots: standing on the base, leaning 9° in against the centre panel, grip facing out;
  // the variant's fill decides which slots are occupied
  const out = [];
  for (const [si, s] of [-1, 1].entries()) {
    for (let i = 0; i < perSide; i++) {
      if (rand() >= fill[si]) continue;
      const lx = -((perSide - 1) * 0.38) / 2 + i * 0.38;
      const p = L(lx, 0.12, s * 0.245);
      const rq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -s * 0.16)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s > 0 ? 0 : Math.PI));
      out.push({ pos: [p.x, p.y, p.z], quat: rq });
    }
  }
  return out;
}

// Trooper helmet silhouette (original): white dome and face plate, dark visor band, brow, vocoder and
// cheek tubes. Drawn at the origin facing +Z for instancing (or at pos / quat).
function buildHelmet(k, pos = [0, 0, 0], quat = null) {
  const q = quat || new THREE.Quaternion();
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => k.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: L(x, y, z).toArray(), quat: q, ...extra });
  k.add("impPaintedMetal", new THREE.SphereGeometry(0.14, 12, 8), { pos: L(0, 0.16, 0).toArray(), quat: q, color: IMP.white, uv: "scale", uvScale: [1, 1] });
  box("impPaintedMetal", 0, 0.09, 0.07, 0.2, 0.14, 0.14, { color: IMP.white, texel: 2 }); // face / jaw
  box("impPaintedMetal", 0, 0.16, 0.125, 0.19, 0.05, 0.04, { color: IMP.black, texel: 2 }); // visor band
  box("impPaintedMetal", 0, 0.2, 0.11, 0.22, 0.03, 0.06, { color: IMP.black, texel: 2 }); // brow
  box("impPaintedMetal", 0, 0.085, 0.145, 0.09, 0.045, 0.02, { color: IMP.black, texel: 2 }); // vocoder
  for (const s of [-1, 1]) box("impPaintedMetal", s * 0.085, 0.07, 0.11, 0.03, 0.05, 0.05, { color: IMP.black, texel: 2 }); // cheek tubes
  k.add("impPaintedMetal", new THREE.CylinderGeometry(0.11, 0.12, 0.03, 12), { pos: L(0, 0.015, 0).toArray(), quat: q, color: IMP.black, uv: "scale", uvScale: [1, 0.2] }); // neck ring
  return k;
}

/**
 * Open helmet shelving on a wall frame from u0 to u1: back, sides, `shelves` steel shelves with a lip,
 * red section stripe. Returns helmet instance transforms (pos on each shelf, facing out of the wall).
 */
function helmetShelf(frame, u0, u1, h, opts = {}) {
  const { d = 0.5, shelves = 3, seed = 1, pitch = 0.62 } = opts;
  const rand = rng(seed);
  const len = u1 - u0;
  const cu = (u0 + u1) / 2;
  frame.box("impPaintedMetal", cu, h / 2, 0.015, len, h, 0.03, { color: IMP.wallDark, texel: 1 });
  for (const s of [-1, 1]) frame.box("impPaintedMetal", cu + s * (len / 2 - 0.03), h / 2, d / 2, 0.06, h, d, { color: IMP.trim, texel: 1 });
  frame.box("impPaintedMetal", cu, h - 0.03, d / 2, len, 0.06, d, { color: IMP.trim, texel: 1 });
  frame.box("crewPaintRed", cu, h - 0.03, d + 0.002, len - 0.2, 0.03, 0.004);
  const base = 0.14;
  frame.box("impPaintedMetal", cu, base / 2, d / 2, len, base, d, { color: IMP.trim, texel: 1 });
  const sp = (h - base - 0.1) / shelves;
  const out = [];
  // the wall's outward direction as a yaw for the instanced helmets
  const yaw = Math.atan2(frame.N.x, frame.N.z);
  const hq = yawQ(yaw);
  for (let s = 0; s < shelves; s++) {
    const v = base + s * sp;
    if (s > 0) frame.box("impMetal", cu, v, d / 2, len - 0.12, 0.03, d - 0.04, { color: IMP.gunmetal, texel: 1 });
    frame.box("impMetal", cu, v + 0.03, d - 0.01, len - 0.12, 0.03, 0.02, { color: IMP.steel });
    const n = Math.floor((len - 0.3) / pitch);
    const start = cu - ((n - 1) * pitch) / 2;
    for (let i = 0; i < n; i++) {
      const p = frame.pos(start + i * pitch + (rand() - 0.5) * 0.04, v + 0.016, d / 2 + 0.02);
      const jq = hq.clone().multiply(yawQ((rand() - 0.5) * 0.3));
      out.push({ pos: [p.x, p.y, p.z], quat: jq });
    }
  }
  frame.collider(u0, u1, 0, h, -0.02, d + 0.05, "helmetShelf");
  return out;
}

// Armour display case: glass case on a plinth with a trooper armour set on a stand (helmet, chest and
// back plates, shoulder bells, belt), lit from the plinth. pos = floor centre, yaw 0 faces +Z.
function armourDisplay(kit, pos, yaw = 0) {
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: L(x, y, z).toArray(), quat: q, ...extra });
  const W = 1.3;
  const D = 1.1;
  box("impPaintedMetal", 0, 0.2, 0, W, 0.4, D, { color: IMP.consoleDark, texel: 1 });
  box("impPaintedMetal", 0, 0.41, 0, W - 0.1, 0.02, D - 0.1, { color: IMP.trim, texel: 1 });
  box("crewEmit", 0, 0.43, 0, W - 0.5, 0.004, D - 0.5, { color: 0x5a7090 });
  box("impPaintedMetal", 0, 2.55, 0, W, 0.1, D, { color: IMP.trim, texel: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("impPaintedMetal", sx * (W / 2 - 0.03), 1.48, sz * (D / 2 - 0.03), 0.06, 2.1, 0.06, { color: IMP.trim, texel: 1 });
  for (const sx of [-1, 1]) box("glass", sx * (W / 2 - 0.01), 1.48, 0, 0.006, 2.06, D - 0.12);
  box("glass", 0, 1.48, D / 2 - 0.01, W - 0.12, 2.06, 0.006);
  box("impPaintedMetal", 0, 1.48, -D / 2 + 0.02, W - 0.12, 2.06, 0.03, { color: IMP.wallDark, texel: 1 });
  box("blinkSparse", 0, 2.2, -D / 2 + 0.04, 0.6, 0.12, 0.006, { uv: "keep" });
  // full-height (1.85 m) armour set on a mannequin standing on the plinth, support post behind
  box("impMetal", 0, 1.1, -0.16, 0.05, 1.34, 0.05, { color: IMP.gunmetal });
  trooperFigure(kit, L(0, 0.43, 0), q);
  // placard on the plinth face
  box("impPaintedMetal", 0, 0.22, D / 2 + 0.005, 0.5, 0.16, 0.01, { color: IMP.wallDark, texel: 2 });
  box("crewEmit", -0.16, 0.22, D / 2 + 0.012, 0.04, 0.04, 0.004, { color: 0x40ff70 });
  kit.collider([Math.min(L(-W / 2, 0, -D / 2).x, L(W / 2, 0, D / 2).x), pos[1], Math.min(L(-W / 2, 0, -D / 2).z, L(W / 2, 0, D / 2).z)], [Math.max(L(-W / 2, 0, -D / 2).x, L(W / 2, 0, D / 2).x), pos[1] + 2.6, Math.max(L(-W / 2, 0, -D / 2).z, L(W / 2, 0, D / 2).z)], "displayCase");
}

/**
 * Full-height trooper armour set on a mannequin (1.85 m, original silhouette): boots, shin and knee
 * plates, thigh plates, belt with pouches, abdomen with black bands, chest and back plates, shoulder
 * bells, biceps and forearm plates over a black under-suit, gloves, helmet. base = feet centre (world),
 * q = yaw quaternion (faces +Z local).
 */
function trooperFigure(kit, base, q) {
  const L = (x, y, z) => base.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: L(x, y, z).toArray(), quat: q, ...extra });
  const W = (x, y, z, sx, sy, sz) => box("impPaintedMetal", x, y, z, sx, sy, sz, { color: IMP.white, texel: 2 });
  const B = (x, y, z, sx, sy, sz) => box("impPaintedMetal", x, y, z, sx, sy, sz, { color: IMP.black, texel: 2 });
  for (const s of [-1, 1]) {
    B(s * 0.12, 0.06, 0.03, 0.14, 0.12, 0.3); // boot
    W(s * 0.12, 0.33, 0.0, 0.14, 0.4, 0.16); // shin plate
    W(s * 0.12, 0.56, 0.01, 0.15, 0.09, 0.18); // knee plate
    B(s * 0.12, 0.62, 0.0, 0.12, 0.06, 0.14); // under-suit at the knee
    W(s * 0.12, 0.8, 0.0, 0.16, 0.34, 0.18); // thigh plate
    B(s * 0.12, 0.96, 0.0, 0.13, 0.06, 0.15); // hip gap
    // arms hang beside the chest: bell, bicep plate, elbow, forearm plate, glove
    kit.add("impPaintedMetal", new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), { pos: L(s * 0.28, 1.53, 0).toArray(), quat: q, color: IMP.white, uv: "scale", uvScale: [1, 1] });
    B(s * 0.3, 1.36, 0.0, 0.11, 0.3, 0.11);
    W(s * 0.3, 1.4, 0.005, 0.14, 0.2, 0.14);
    W(s * 0.31, 1.07, 0.05, 0.11, 0.28, 0.11);
    B(s * 0.31, 0.88, 0.07, 0.08, 0.1, 0.08);
  }
  B(0, 1.01, 0.0, 0.38, 0.14, 0.26); // belt / codpiece
  W(0, 1.02, 0.135, 0.36, 0.08, 0.02);
  for (const x of [-0.11, 0, 0.11]) W(x, 1.0, 0.15, 0.08, 0.07, 0.03); // pouches
  W(0, 1.17, 0.0, 0.34, 0.18, 0.22); // abdomen
  for (const yb of [1.12, 1.2]) B(0, yb, 0.112, 0.3, 0.02, 0.006);
  W(0, 1.42, 0.0, 0.44, 0.34, 0.28); // chest + back plates
  B(0, 1.42, -0.145, 0.3, 0.26, 0.01); // back detail
  W(0, 1.47, 0.145, 0.34, 0.2, 0.01); // chest plate raised centre
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.07, 0.08, 0.1, 10), { pos: L(0, 1.6, 0).toArray(), quat: q, color: IMP.black, uv: "scale", uvScale: [1, 0.2] }); // collar
  buildHelmet(kit, L(0, 1.56, 0).toArray(), q);
}

// Heavy repeating blaster on a tripod with its generator (original E-Web-like silhouette): three
// braced legs on foot pads under a yoke head, gun body with sight and grips, and the generator unit on
// a framed base with a cooling-fin stack, readout, hazard chevrons and the power cable up to the gun.
// pos = tripod centre, yaw 0 => barrel toward -Z.
function heavyBlaster(kit, pos, yaw = 0) {
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: L(x, y, z).toArray(), quat: q, ...extra });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    // legs meet under the head and splay outward to the deck (the sign puts the foot end outboard)
    const lq = q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5)));
    kit.add("impMetal", new THREE.CylinderGeometry(0.03, 0.025, 1.15, 8), { pos: L(Math.cos(a) * 0.3, 0.55, Math.sin(a) * 0.3).toArray(), quat: lq, color: IMP.gunmetal, uv: "scale", uvScale: [0.2, 1] });
    // foot pad where the leg meets the deck, and a brace strut from the centre hub down to the leg
    kit.add("impMetal", new THREE.CylinderGeometry(0.07, 0.08, 0.04, 10), { pos: L(Math.cos(a) * 0.58, 0.02, Math.sin(a) * 0.58).toArray(), quat: q, color: IMP.black, uv: "scale", uvScale: [0.5, 0.1] });
    const bq = q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.sin(a) * 0.83, 0, Math.cos(a) * 0.83)));
    kit.add("impMetal", new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), { pos: L(Math.cos(a) * 0.2, 0.535, Math.sin(a) * 0.2).toArray(), quat: bq, color: IMP.steel, uv: "scale", uvScale: [0.1, 0.5] });
  }
  kit.add("impMetal", new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), { pos: L(0, 0.72, 0).toArray(), quat: q, color: IMP.gunmetal, uv: "scale", uvScale: [0.5, 0.1] }); // brace hub
  kit.add("impMetal", new THREE.CylinderGeometry(0.09, 0.12, 0.18, 12), { pos: L(0, 1.1, 0).toArray(), quat: q, color: IMP.gunmetal, uv: "scale", uvScale: [1, 0.3] });
  for (const s of [-1, 1]) box("impMetal", s * 0.14, 1.24, 0.05, 0.04, 0.16, 0.2, { color: IMP.steel }); // yoke cheeks
  box("impPaintedMetal", 0, 1.28, 0.1, 0.24, 0.2, 0.7, { color: IMP.black, texel: 2 });
  box("impPaintedMetal", 0, 1.42, 0.3, 0.12, 0.1, 0.24, { color: IMP.consoleDark, texel: 2 }); // sight
  box("blinkSparse", 0, 1.42, 0.425, 0.1, 0.06, 0.006, { uv: "keep" });
  const bq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
  kit.add("impMetal", new THREE.CylinderGeometry(0.035, 0.035, 1.5, 10), { pos: L(0, 1.28, -0.95).toArray(), quat: bq, color: IMP.gunmetal, uv: "scale", uvScale: [0.3, 1.5] });
  kit.add("impMetal", new THREE.CylinderGeometry(0.065, 0.065, 0.6, 12), { pos: L(0, 1.28, -0.6).toArray(), quat: bq, color: IMP.steel, uv: "scale", uvScale: [0.5, 0.6] });
  kit.add("impMetal", new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12), { pos: L(0, 1.28, -1.72).toArray(), quat: bq, color: IMP.steel, uv: "scale", uvScale: [0.5, 0.2] });
  for (const s of [-1, 1]) box("impMetal", s * 0.16, 1.22, 0.45, 0.04, 0.04, 0.2, { color: IMP.steel }); // grips
  // generator unit: framed skid base with hazard chevrons, horizontal drum with a fin stack, end-cap
  // readout and status lamp, carry handles, cable up to the gun
  const gx = 0.8;
  const gz = 0.35;
  box("impPaintedMetal", gx, 0.04, gz, 0.66, 0.08, 0.56, { color: IMP.trim, texel: 1 });
  for (const s of [-1, 1]) box("impMetal", gx + s * 0.31, 0.3, gz, 0.04, 0.52, 0.5, { color: IMP.gunmetal, texel: 1 });
  for (const k of [-1, 0, 1]) box("impPaintedMetal", gx + k * 0.2, 0.04, gz + 0.283, 0.1, 0.06, 0.006, { color: k ? 0xffb454 : IMP.black, texel: 2 });
  const dq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2));
  kit.add("impMetal", new THREE.CylinderGeometry(0.2, 0.2, 0.58, 16), { pos: L(gx, 0.32, gz).toArray(), quat: dq, color: IMP.gunmetal, uv: "scale", uvScale: [1, 1] });
  for (let k = 0; k < 6; k++) box("impMetal", gx, 0.5 + k * 0.02, gz, 0.5, 0.008, 0.36 - k * 0.03, { color: IMP.steel });
  box("impPaintedMetal", gx, 0.32, gz + 0.215, 0.44, 0.24, 0.03, { color: IMP.consoleDark, texel: 1 }); // front face panel
  box("darkGloss", gx - 0.08, 0.34, gz + 0.234, 0.18, 0.1, 0.006);
  box("screen1", gx - 0.08, 0.34, gz + 0.238, 0.15, 0.08, 0.004, { uv: "keep" });
  box("leds", gx + 0.12, 0.37, gz + 0.234, 0.1, 0.02, 0.006, { uv: "keep" });
  box("crewEmit", gx + 0.12, 0.28, gz + 0.234, 0.08, 0.02, 0.006, { color: RED });
  box("impMetal", gx, 0.64, gz, 0.3, 0.025, 0.025, { color: IMP.steel }); // carry handle
  for (const s of [-1, 1]) box("impMetal", gx + s * 0.14, 0.6, gz, 0.025, 0.08, 0.025, { color: IMP.steel });
  kit.add("impMetal", new THREE.TorusGeometry(0.45, 0.02, 6, 18, Math.PI * 0.9), { pos: L(0.42, 0.9, 0.2).toArray(), quat: q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.3)), color: IMP.rubber, uv: "scale", uvScale: [2, 1] });
  const a = L(-0.6, 0, -0.6);
  const b = L(1.15, 0, 0.7);
  kit.collider([Math.min(a.x, b.x), pos[1], Math.min(a.z, b.z)], [Math.max(a.x, b.x), pos[1] + 1.4, Math.max(a.z, b.z)], "heavyBlaster");
}

// Steel kit-up bench (no upholstery): slab on two pedestals with a boot rail. pos = floor centre,
// len along local x, yaw.
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
