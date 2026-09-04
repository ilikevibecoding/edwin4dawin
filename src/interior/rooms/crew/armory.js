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
    // counter under the hatch (doors on the store side), datapad, a rifle laid out on it
    counter(kit, [cageX, y, (hatch[0] + hatch[1]) / 2], hatch[1] - hatch[0] + 0.8, Math.PI / 2, { d: 1.0, h: 0.92, doors: true, tone: IMP.consoleDark, kickLight: "emitRed", tag: "issueCounter" });
    kit.box("darkGloss", cageX + 0.3, y + 0.93, hatch[1] - 0.8, 0.22, 0.012, 0.3);
    kit.box("blink", cageX - 0.25, y + 0.93, hatch[0] + 0.7, 0.3, 0.008, 0.5, { uv: "keep" });
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
    kit.box("impPaintedMetal", laneX - 0.45, y + 0.99, 329.15, 0.5, 0.06, 0.4, { color: IMP.wallDark, texel: 1 });
    kit.box("blink", laneX - 1.1, y + 0.98, 329.2, 0.4, 0.008, 0.3, { uv: "keep" });
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
  const rifleT = [];
  const rand = rng(41);
  for (const rx of rowsX) {
    for (const rz of rackZ) {
      const t = rifleRack(kit, [rx, y, rz], Math.PI / 2, { len: 4.6, perSide: 12, seed: Math.floor(rand() * 1000) });
      for (const tr of t) if (rand() < 0.86) rifleT.push(tr);
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
    for (const [i, x] of [-13.6, -18.3, -23.0, -27.4].entries()) ceilingLight(kit, ctx, [x, y + h, z], 8.0, "z", { mat: "lightBand", color: HARSH, intensity: i % 2 === 0 ? 12 : 0, distance: 14, priority: 1, drop: 0.5 });
  }
  for (const x of [-12.6, -19.6, -26.4]) ceilingLight(kit, ctx, [x, y + h, 322.0], 5.0, "x", { mat: "lightBand", color: HARSH, intensity: 11, distance: 13, priority: 1, drop: 0.5 });
  ceilingLight(kit, ctx, [-4.9, y + h, 312.6], 8.0, "z", { mat: "lightBand", color: HARSH, intensity: 7, distance: 10, priority: 1, drop: 0.5 });
  ceilingLight(kit, ctx, [-4.9, y + h, 322.0], 6.0, "z", { mat: "lightBand", color: HARSH, intensity: 8, distance: 10, priority: 2, drop: 0.5 });
  ceilingLight(kit, ctx, [-9.6, y + h, 322.0], 6.0, "z", { mat: "lightBand", color: HARSH, intensity: 6, distance: 9, priority: 0, drop: 0.5 });

  // ---- views --------------------------------------------------------------------------------------
  ctx.view("armory", xE - 0.7, y + STD.eye, doorZ + 1.4, 42, -4);
  ctx.view("armory_counter", -9.4, y + STD.eye, 313.4, 172, -6);
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
  const { len = 3.8, perSide = 10, seed = 1 } = opts;
  const rand = rng(seed);
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: L(x, y, z).toArray(), quat: q, ...extra });
  box("impPaintedMetal", 0, 0.06, 0, len, 0.12, 0.8, { color: IMP.trim, texel: 1 });
  box("impMetal", 0, 0.125, 0, len - 0.1, 0.01, 0.74, { color: IMP.gunmetal, texel: 1 });
  box("impPaintedMetal", 0, 0.72, 0, len - 0.2, 1.2, 0.05, { color: IMP.wallMid, texel: 1 });
  for (const s of [-1, 1]) {
    box("impPaintedMetal", 0, 0.95, s * 0.2, len, 0.05, 0.05, { color: IMP.trim, texel: 1 });
    box("impMetal", 0, 0.93, s * 0.2, len - 0.1, 0.02, 0.09, { color: IMP.steel, texel: 1 });
    box("crewEmit", 0, 1.3, s * 0.03, len - 0.4, 0.02, 0.006, { color: RED });
    for (let i = 0; i < perSide; i++) box("impPaintedMetal", -((perSide - 1) * 0.38) / 2 + i * 0.38 + 0.19, 0.95, s * 0.2, 0.03, 0.06, 0.09, { color: IMP.black, texel: 2 });
  }
  for (const s of [-1, 1]) {
    box("impPaintedMetal", s * (len / 2 - 0.05), 0.7, 0, 0.1, 1.4, 0.8, { color: IMP.trim, texel: 1 });
    box("impPanel", s * (len / 2 + 0.002), 0.9, 0, 0.004, 0.5, 0.6, { color: IMP.consoleDark, uv: "keep" });
    const dp = L(s * (len / 2 + 0.006), 1.0, 0);
    const dg = new THREE.PlaneGeometry(0.3, 0.3);
    dg.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2);
    kit.add("impDecal", dg, { pos: [dp.x, dp.y, dp.z], quat: q, uv: "keep", uvRect: impDecalRect([0, 3, 6, 9, 11][Math.floor(rand() * 5)]) });
    box("crewEmit", s * (len / 2 + 0.006), 0.72, 0, 0.004, 0.03, 0.3, { color: rand() < 0.8 ? 0x40ff70 : RED });
  }
  const c0 = L(-len / 2, 0, -0.4);
  const c1 = L(len / 2, 0, 0.4);
  kit.collider([Math.min(c0.x, c1.x), pos[1], Math.min(c0.z, c1.z)], [Math.max(c0.x, c1.x), pos[1] + 1.4, Math.max(c0.z, c1.z)], "rack");
  // rifle slots: standing on the base, leaning 9° in against the centre panel, grip facing out
  const out = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < perSide; i++) {
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
  // stand + armour
  box("impMetal", 0, 0.9, -0.1, 0.06, 1.0, 0.06, { color: IMP.gunmetal });
  box("impPaintedMetal", 0, 1.5, 0, 0.48, 0.5, 0.26, { color: IMP.white, texel: 2 }); // chest + back plates
  box("impPaintedMetal", 0, 1.5, 0.135, 0.36, 0.34, 0.02, { color: IMP.white, texel: 2 });
  box("impPaintedMetal", 0, 1.32, 0.14, 0.34, 0.1, 0.02, { color: IMP.black, texel: 2 }); // abdomen bands
  box("impPaintedMetal", 0, 1.2, 0, 0.36, 0.1, 0.24, { color: IMP.black, texel: 2 }); // belt
  box("impPaintedMetal", 0, 1.19, 0.125, 0.2, 0.08, 0.02, { color: IMP.wallMid, texel: 2 });
  for (const s of [-1, 1]) {
    kit.add("impPaintedMetal", new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), { pos: L(s * 0.3, 1.66, 0).toArray(), quat: q, color: IMP.white, uv: "scale", uvScale: [1, 1] });
    box("impPaintedMetal", s * 0.3, 1.3, 0, 0.12, 0.42, 0.12, { color: IMP.black, texel: 2 }); // arm (black under-suit)
    box("impPaintedMetal", s * 0.3, 1.36, 0.005, 0.14, 0.24, 0.14, { color: IMP.white, texel: 2 }); // bicep plate
  }
  buildHelmet(kit, L(0, 1.78, 0).toArray(), q);
  kit.collider([Math.min(L(-W / 2, 0, -D / 2).x, L(W / 2, 0, D / 2).x), pos[1], Math.min(L(-W / 2, 0, -D / 2).z, L(W / 2, 0, D / 2).z)], [Math.max(L(-W / 2, 0, -D / 2).x, L(W / 2, 0, D / 2).x), pos[1] + 2.6, Math.max(L(-W / 2, 0, -D / 2).z, L(W / 2, 0, D / 2).z)], "displayCase");
}

// Heavy repeating blaster on a tripod with its generator pack (original E-Web-like silhouette).
// pos = tripod centre, yaw 0 => barrel toward -Z.
function heavyBlaster(kit, pos, yaw = 0) {
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: L(x, y, z).toArray(), quat: q, ...extra });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const lq = q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5)));
    kit.add("impMetal", new THREE.CylinderGeometry(0.025, 0.03, 1.15, 8), { pos: L(Math.cos(a) * 0.3, 0.55, Math.sin(a) * 0.3).toArray(), quat: lq, color: IMP.gunmetal, uv: "scale", uvScale: [0.2, 1] });
  }
  kit.add("impMetal", new THREE.CylinderGeometry(0.09, 0.12, 0.18, 12), { pos: L(0, 1.1, 0).toArray(), quat: q, color: IMP.gunmetal, uv: "scale", uvScale: [1, 0.3] });
  box("impPaintedMetal", 0, 1.28, 0.1, 0.24, 0.2, 0.7, { color: IMP.black, texel: 2 });
  box("impPaintedMetal", 0, 1.42, 0.3, 0.12, 0.1, 0.24, { color: IMP.consoleDark, texel: 2 }); // sight
  box("blinkSparse", 0, 1.42, 0.425, 0.1, 0.06, 0.006, { uv: "keep" });
  const bq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
  kit.add("impMetal", new THREE.CylinderGeometry(0.035, 0.035, 1.5, 10), { pos: L(0, 1.28, -0.95).toArray(), quat: bq, color: IMP.gunmetal, uv: "scale", uvScale: [0.3, 1.5] });
  kit.add("impMetal", new THREE.CylinderGeometry(0.065, 0.065, 0.6, 12), { pos: L(0, 1.28, -0.6).toArray(), quat: bq, color: IMP.steel, uv: "scale", uvScale: [0.5, 0.6] });
  kit.add("impMetal", new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12), { pos: L(0, 1.28, -1.72).toArray(), quat: bq, color: IMP.steel, uv: "scale", uvScale: [0.5, 0.2] });
  for (const s of [-1, 1]) box("impMetal", s * 0.16, 1.22, 0.45, 0.04, 0.04, 0.2, { color: IMP.steel }); // grips
  // generator pack beside the tripod with a power cable up to the gun
  box("impPaintedMetal", 0.75, 0.32, 0.35, 0.5, 0.64, 0.45, { color: IMP.wallDark, texel: 1 });
  box("impPaintedMetal", 0.75, 0.66, 0.35, 0.44, 0.04, 0.4, { color: IMP.trim, texel: 1 });
  box("blink", 0.75, 0.45, 0.58, 0.3, 0.14, 0.006, { uv: "keep" });
  box("crewEmit", 0.75, 0.2, 0.58, 0.2, 0.02, 0.006, { color: RED });
  kit.add("impMetal", new THREE.TorusGeometry(0.45, 0.02, 6, 18, Math.PI * 0.9), { pos: L(0.42, 0.9, 0.2).toArray(), quat: q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.3)), color: IMP.rubber, uv: "scale", uvScale: [2, 1] });
  const a = L(-0.5, 0, -0.5);
  const b = L(1.05, 0, 0.7);
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
