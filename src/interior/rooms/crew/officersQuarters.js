// Officers' quarters (Deck 7): a carpeted private corridor from the spine door with cabin doors on
// both sides, an east link corridor and two outer service corridors so every cabin row is double-
// loaded — four rows of five cabins. Half the doors stand open on furnished cabins (bed, desk with a
// console, wardrobe, viewscreen, rug), the others are closed with nameplates. The senior officer's
// suite fills the west end: sleeping cabin, lounge with a big viewscreen and drinks cabinet, office.
// Warmer light than the enlisted deck, gloss deck, carpet runners.
import * as THREE from "three";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { wallScreen, ceilingLight, pointLightDesc, lockers, chair, table, bench } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { ensureCrewMaterials, partition, fauxDoor, counter, wallCabinet, shelfUnit, floorDecal, ceilingStrip, namePlate, bed, loungeChair, sideTable, yawQ, boardMaterial, wallBoard } from "./crewKit.js";

const CARPET = 0x2b3140;
const RUG = 0x4a1c1c;
const WARM = 0xffe2c4;

export function buildOfficersQuarters(kit, ctx) {
  ensureCrewMaterials(ctx.mats);
  const { room, floorY: y } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const walls = roomWalls(room);
  const ph = h - 0.05; // partitions stop just under the ceiling panels

  buildShell(kit, ctx, ctx.id, room, {
    wall: { pitch: 3.6, tone: IMP.wallLight, toneAlt: IMP.wallMid, styles: { plain: 0.7, vent: 0.12, hatch: 0.12, pipes: 0.06 } },
    floor: { mat: "impGloss", tone: IMP.wallDark, texel: 0.35 },
    ceiling: { lights: false, panelW: 1.8 },
  });

  // ---- plan ------------------------------------------------------------------------------------
  const xE = x1 - STD.wallT; // east wall plane
  const xW = x0 + STD.wallT;
  const zN = z0 + STD.wallT;
  const zS = z1 - STD.wallT;
  const linkX = -5.7; // cabins end / east link corridor begins
  const suiteX = -27.0; // suite east wall
  const rowFront = [402.9, 416.5, 419.5, 433.1]; // corridor faces of the four cabin rows
  const rowDir = [1, -1, 1, -1]; // which way each row's cabins extend from its front
  const backZ = [409.7, 426.3];
  const cabW = (linkX - suiteX) / 5;
  const corrC = 418.0;
  const isOpen = (i, row) => (i + row) % 2 === 1;

  // ---- corridors: carpet runners, lights, strips, stencils ---------------------------------------
  const carpet = (ax0, az0, ax1, az1) => kit.boxMM("impFabric", [ax0, y + 0.004, az0], [ax1, y + 0.012, az1], { color: CARPET, uv: "world", texel: 1.5 });
  carpet(suiteX + 0.15, corrC - 0.9, xE - 0.2, corrC + 0.9);
  carpet(linkX + 0.4, rowFront[0] + 0.15, linkX + 2.6, rowFront[3] - 0.15);
  // the link's gloss margins mirrored the wall bands as blown streaks: soft-gloss borders either side of the runner
  kit.boxMM("impGlossSoft", [linkX + 0.05, y + 0.002, rowFront[0] + 0.1], [linkX + 0.4, y + 0.006, rowFront[3] - 0.1], { color: IMP.wallDark, texel: 0.3 });
  kit.boxMM("impGlossSoft", [linkX + 2.6, y + 0.002, rowFront[0] + 0.1], [xE - 0.05, y + 0.006, rowFront[3] - 0.1], { color: IMP.wallDark, texel: 0.3 });
  for (const lx of [-6.6, -13.6, -20.6]) ceilingLight(kit, ctx, [lx, y + h, corrC], 2.6, "x", { intensity: 6, distance: 11, priority: 1, color: WARM, mat: "lightBandWarm" });
  for (const lz of [409.5, 426.5]) ceilingLight(kit, ctx, [linkX + 1.5, y + h, lz], 2.6, "z", { intensity: 5, distance: 10, priority: 1, color: WARM, mat: "lightBandWarm" });
  for (const cz of [(zN + rowFront[0]) / 2, (rowFront[3] + zS) / 2]) {
    for (let k = 0; k < 4; k++) ceilingStrip(kit, [xW + 3.9 + k * 7.6, y + h, cz], 6.4, "x", { mat: "lightBandWarm", w: 0.22 });
    pointLightDesc(ctx, WARM, 5, 16, [-16.5, y + h - 0.4, cz], 0);
  }
  floorDecal(kit, xE - 1.2, y + 0.01, corrC, 0.9, 7, 90);
  floorDecal(kit, linkX + 1.5, y + 0.01, rowFront[0] + 1.0, 0.7, 2, 0);
  floorDecal(kit, linkX + 1.5, y + 0.01, rowFront[3] - 1.0, 0.7, 2, 180);
  floorDecal(kit, suiteX + 1.0, y + 0.01, corrC, 0.8, 15, 90);
  // outer-corridor west ends and the east link: screens, placards, an emergency locker
  {
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    wallScreen(frame, w.u(401.6), 1.75, 1.4, 0.8, 1);
    wallScreen(frame, w.u(434.4), 1.75, 1.4, 0.8, 2);
    frame.quad("impDecal", w.u(401.6) - 1.1, 1.7, 0.062, 0.45, 0.45, { uvRect: impDecalRect(2) });
    frame.quad("impDecal", w.u(434.4) + 1.1, 1.7, 0.062, 0.45, 0.45, { uvRect: impDecalRect(3) });
  }
  // the link corridor ends on authored displays: a holo-map to the south, a status board to the north
  for (const [w, idx] of [[walls.south, 2], [walls.north, 0]]) {
    const { frame } = wallFrame(kit, w.from, w.to, y);
    wallScreen(frame, w.u(linkX + 1.5), 1.75, 1.6, 0.9, idx);
    frame.quad("impDecal", w.u(linkX + 1.5) - 1.25, 1.75, 0.062, 0.45, 0.45, { uvRect: impDecalRect(idx === 2 ? 7 : 14) });
  }
  {
    const w = walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    wallScreen(frame, w.u(409.0), 1.75, 1.6, 0.9, 0);
    frame.quad("impDecal", w.u(409.0) - 1.3, 1.75, 0.062, 0.5, 0.5, { uvRect: impDecalRect(7) });
    frame.box("impPaintedMetal", w.u(427.0), 1.05, 0.16, 0.6, 0.5, 0.2, { color: IMP.trim, texel: 1 });
    frame.box("crewEmit", w.u(427.0), 1.2, 0.262, 0.4, 0.05, 0.01, { color: 0xff2a2a });
    frame.quad("impDecal", w.u(427.0), 0.95, 0.262, 0.26, 0.26, { uvRect: impDecalRect(13) });
    frame.quad("impDecal", w.u(429.5), 1.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(9) });
    namePlate(frame, w.u(415.6), 1.55, { decal: 0, led: "crewEmit", ledColor: 0x3a86ff });
  }

  // ---- cabin block: partitions -------------------------------------------------------------------
  // row fronts with a door opening for every open cabin (closed ones get a faux door)
  const rowFrames = [];
  for (let row = 0; row < 4; row++) {
    const z = rowFront[row];
    const openings = [];
    for (let i = 0; i < 5; i++) if (isOpen(i, row)) openings.push({ u0: i * cabW + 0.55, u1: i * cabW + 1.65, h: 2.2 });
    // draw from west to east when the corridor is south of the row (face +z) and the reverse otherwise,
    // so the returned frame faces the corridor and u increases with x either way for the caller
    const corridorSouth = rowDir[row] < 0;
    const from = corridorSouth ? [suiteX, z] : [linkX, z];
    const to = corridorSouth ? [linkX, z] : [suiteX, z];
    const len = linkX - suiteX;
    const ops = corridorSouth ? openings : openings.map((o) => ({ u0: len - o.u1, u1: len - o.u0, h: o.h }));
    const { frame } = partition(kit, from, to, y, ph, { openings: ops, tone: IMP.wallLight, toneAlt: IMP.wallMid, seed: 61 + row, tag: "cabinFront", pitch: cabW / 2 });
    rowFrames.push({ frame, u: (x) => (corridorSouth ? x - suiteX : linkX - x) });
  }
  for (const z of backZ) partition(kit, [suiteX, z], [linkX, z], y, ph, { tone: IMP.wallLight, seed: 71, tag: "cabinBack", features: false, pitch: cabW });
  for (let i = 1; i <= 5; i++) {
    const x = suiteX + i * cabW;
    partition(kit, [x, rowFront[0]], [x, rowFront[1]], y, ph, { tone: IMP.wallLight, seed: 80 + i, tag: "cabinSide", features: false, pitch: 3.4 });
    partition(kit, [x, rowFront[2]], [x, rowFront[3]], y, ph, { tone: IMP.wallLight, seed: 90 + i, tag: "cabinSide", features: false, pitch: 3.4 });
  }
  // suite east wall with its door
  partition(kit, [suiteX, rowFront[0]], [suiteX, rowFront[3]], y, ph, { openings: [{ u0: corrC - 1.0 - rowFront[0], u1: corrC + 1.0 - rowFront[0], h: 2.5 }], tone: IMP.wallLight, seed: 99, tag: "suiteWall" });

  // ---- cabins ----------------------------------------------------------------------------------
  const litCabins = new Set(["1:4"]);
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 5; i++) {
      const xL = suiteX + i * cabW;
      const dir = rowDir[row];
      const zFront = rowFront[row];
      const rf = rowFrames[row];
      const uDoor = rf.u(xL + 1.1);
      const n = 0.08 + 0.024;
      if (isOpen(i, row)) {
        officerCabin(kit, ctx, xL, zFront, dir, cabW, 6.8, { seed: 7 + row * 5 + i, light: litCabins.has(row + ":" + i) });
        namePlate(rf.frame, uDoor + 1.05, 1.5, { n, decal: [0, 3, 6, 9, 15][i], led: "crewEmit", ledColor: 0x40ff70 });
      } else {
        fauxDoor(rf.frame, uDoor, 1.1, 2.2, { n, tone: IMP.wallMid, plate: false });
        namePlate(rf.frame, uDoor + 1.05, 1.5, { n, decal: [0, 3, 6, 9, 15][i], led: "crewEmit", ledColor: 0xffb020 });
      }
    }
  }

  // ---- senior officer's suite --------------------------------------------------------------------
  buildSuite(kit, ctx, { xW, xE: suiteX, zN: rowFront[0], zS: rowFront[3], y, h, walls, doorZ: corrC });

  // ---- views -----------------------------------------------------------------------------------
  ctx.view("officersQuarters", xE - 0.9, y + STD.eye, corrC + 0.3, 92, -3);
  ctx.view("officersQuarters_cabin", suiteX + 4 * cabW + 1.7, y + STD.eye, rowFront[1] - 0.25, 10, -6);
  ctx.view("officersQuarters_suite", suiteX - 0.9, y + STD.eye, 422.6, 52, -4);
  ctx.view("officersQuarters_link", linkX + 1.5, y + STD.eye, 404.0, 180, -3);
}

/**
 * Furnished cabin. xL = west face of the cabin's west side partition plane, zFront = corridor face
 * plane, dir = +1 when the cabin extends toward +z. Local coordinates: lx from the west wall face,
 * lz from the corridor face into the cabin, both after the partition half-thickness.
 */
function officerCabin(kit, ctx, xL, zFront, dir, W, D, opts = {}) {
  const { seed = 1, light = false } = opts;
  const y = ctx.floorY;
  const h = ctx.room.h;
  const w = W - 0.16;
  const d = D - 0.16;
  const P = (lx, ly, lz) => [xL + 0.08 + lx, y + ly, zFront + dir * (0.08 + lz)];
  const box = (mat, lx, ly, lz, sx, sy, sz, extra = {}) => kit.box(mat, ...P(lx, ly, lz), sx, sy, sz, extra);
  const col = (a, b, tag) => {
    const pa = P(...a);
    const pb = P(...b);
    kit.collider([Math.min(pa[0], pb[0]), Math.min(pa[1], pb[1]), Math.min(pa[2], pb[2])], [Math.max(pa[0], pb[0]), Math.max(pa[1], pb[1]), Math.max(pa[2], pb[2])], tag);
  };
  // faces toward the corridor (-lz) for wall-hung decals on the back wall
  const faceQ = yawQ(dir > 0 ? Math.PI : 0);

  // bed against the east side wall, head at the back wall, drawers toward the room
  bed(kit, P(w - 0.6, 0, d - 1.15), dir > 0 ? Math.PI : 0, { w: 1.0, l: 2.1, color: IMP.fabricGrey, blanket: IMP.fabricBlack, tone: IMP.consoleDark, side: dir > 0 ? 1 : -1 });
  // wardrobe on the back wall (west end)
  box("impPaintedMetal", 0.85, 1.1, d - 0.32, 1.4, 2.2, 0.62, { color: IMP.trim, texel: 1 });
  for (const s of [-1, 1]) {
    box("impPanel", 0.85 + s * 0.345, 1.1, d - 0.64, 0.66, 2.1, 0.016, { color: IMP.wallMid, uv: "keep" });
    box("impMetal", 0.85 + s * 0.06, 1.05, d - 0.652, 0.025, 0.16, 0.02, { color: IMP.steel });
  }
  box("crewEmit", 0.3, 2.05, d - 0.652, 0.05, 0.02, 0.008, { color: 0x3a86ff });
  kit.add("impDecal", new THREE.PlaneGeometry(0.22, 0.22), { pos: P(1.2, 1.75, d - 0.655), quat: faceQ, uv: "keep", uvRect: impDecalRect(15) });
  col([0.15, 0, d - 0.63], [1.55, 2.2, d], "wardrobe");
  // viewscreen on the back wall between wardrobe and bed
  box("impPaintedMetal", 2.35, 1.7, d - 0.035, 1.28, 0.82, 0.07, { color: IMP.consoleDark, texel: 1 });
  box("darkGloss", 2.35, 1.7, d - 0.075, 1.18, 0.72, 0.01);
  box("screen1", 2.35, 1.7, d - 0.082, 1.14, 0.68, 0.004, { uv: "keep" });
  box("leds", 2.35, 1.2, d - 0.075, 0.7, 0.04, 0.01, { uv: "keep" });
  // desk along the west wall with a console, chair, shelves above
  box("darkGloss", 0.42, 0.755, 3.2, 0.78, 0.05, 2.0);
  box("impPaintedMetal", 0.42, 0.775, 3.2, 0.8, 0.03, 2.04, { color: IMP.trim, texel: 1 });
  box("impPaintedMetal", 0.38, 0.36, 2.55, 0.6, 0.72, 0.6, { color: IMP.consoleDark, texel: 1 });
  for (let k = 0; k < 3; k++) box("impMetal", 0.69, 0.2 + k * 0.22, 2.55, 0.012, 0.03, 0.14, { color: IMP.steel });
  box("impMetal", 0.76, 0.37, 4.12, 0.05, 0.74, 0.05, { color: IMP.gunmetal });
  box("impMetal", 0.2, 0.93, 3.25, 0.04, 0.3, 0.04, { color: IMP.gunmetal });
  box("darkGloss", 0.2, 1.24, 3.25, 0.03, 0.42, 0.62);
  box("screen2", 0.217, 1.24, 3.25, 0.004, 0.36, 0.56, { uv: "keep" });
  box("blink", 0.5, 0.79, 3.25, 0.22, 0.008, 0.5, { uv: "keep" });
  box("darkGloss", 0.55, 0.785, 3.95, 0.24, 0.01, 0.18);
  kit.add("impMetal", new THREE.CylinderGeometry(0.04, 0.035, 0.1, 10), { pos: P(0.6, 0.83, 2.4), color: IMP.gunmetal, uv: "scale", uvScale: [0.3, 0.2] });
  box("crewEmit", 0.2, 1.47, 3.25, 0.02, 0.02, 0.5, { color: 0xffc890 });
  col([0.0, 0, 2.2], [0.82, 0.8, 4.2], "desk");
  chair(kit, P(1.3, 0, 3.2), Math.PI / 2, { color: IMP.fabricBlack });
  for (const [k, sv] of [1.45, 1.9].entries()) {
    box("impMetal", 0.14, sv, 3.2, 0.28, 0.025, 1.7, { color: IMP.steel, texel: 1 });
    box("impPaintedMetal", 0.02, sv + 0.12, 3.2, 0.03, 0.24, 1.7, { color: IMP.trim, texel: 1 });
    const cols = [IMP.wallMid, IMP.gunmetal, IMP.white, IMP.consoleDark, 0x6f7f9a];
    let u = 2.45;
    let s = seed * 7 + k * 3;
    while (u < 3.9) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const bw = 0.08 + (s % 100) / 500;
      const bh = 0.12 + ((s >> 8) % 100) / 500;
      box(k === 1 && (s >> 4) % 3 === 0 ? "impMetal" : "impPaintedMetal", 0.15, sv + 0.013 + bh / 2, u + bw / 2, 0.2, bh, bw, { color: cols[(s >> 12) % 5], texel: 2 });
      u += bw + 0.03;
    }
  }
  // rug; a slim uniform locker by the door (framed door leaf, handle, vent slats, id plate) and a
  // mirror beside it; ceiling strip (+ a real light for the featured cabin)
  box("impFabric", 2.1, 0.006, 3.3, 1.6, 0.012, 2.4, { color: RUG, uv: "world", texel: 1.5 });
  box("impPaintedMetal", 0.2, 1.0, 1.2, 0.4, 2.0, 0.6, { color: IMP.trim, texel: 1 });
  box("impPanel", 0.405, 1.02, 1.2, 0.012, 1.84, 0.5, { color: IMP.wallMid, uv: "keep" });
  box("impMetal", 0.418, 1.05, 1.02, 0.014, 0.16, 0.024, { color: IMP.steel });
  for (let k = 0; k < 4; k++) box("impPaintedMetal", 0.412, 1.68 + k * 0.05, 1.2, 0.004, 0.012, 0.3, { color: IMP.consoleDark, texel: 1 });
  box("impPaintedMetal", 0.412, 0.42, 1.2, 0.004, 0.1, 0.24, { color: IMP.consoleDark, texel: 1 });
  {
    const g = new THREE.PlaneGeometry(0.14, 0.14);
    g.rotateY(Math.PI / 2);
    kit.add("impDecal", g, { pos: P(0.416, 0.42, 1.2), uv: "keep", uvRect: impDecalRect(6) });
  }
  box("crewEmit", 0.414, 1.9, 1.2, 0.004, 0.02, 0.1, { color: 0x3a86ff });
  col([0.0, 0, 0.9], [0.4, 2.0, 1.5], "locker");
  box("impMetal", 0.035, 1.6, 1.85, 0.02, 0.62, 0.42, { color: IMP.steel });
  box("crewMirror", 0.05, 1.6, 1.85, 0.01, 0.56, 0.36);
  ceilingStrip(kit, P(w / 2, h, 3.2), 1.8, "z", { mat: "lightBandWarm", w: 0.24 });
  if (light) pointLightDesc(ctx, WARM, 4, 8, P(w / 2, h - 0.5, 3.2), 0);
}

function buildSuite(kit, ctx, { xW, xE, zN, zS, y, h, walls, doorZ }) {
  const faceE = xE - 0.104; // west face of the suite's east partition
  const faceN = zN + 0.104;
  const faceS = zS - 0.104;
  // frames on the partition faces (normals into the suite)
  const eastF = wallFrame(kit, [faceE, zN], [faceE, zS], y).frame; // u = z - zN, N = -x
  const northF = wallFrame(kit, [xW, faceN], [faceE, faceN], y).frame; // u = x - xW, N = +z
  const southF = wallFrame(kit, [faceE, faceS], [xW, faceS], y).frame; // u = faceE - x, N = -z
  const west = walls.west;
  const westF = wallFrame(kit, west.from, west.to, y).frame; // u = z1 - z
  const cx = (xW + xE) / 2;

  // half-height partitions dividing sleeping cabin | lounge | office, opening next to the east wall
  const zA = 411.0;
  const zB = 425.0;
  for (const z of [zA, zB]) partition(kit, [xW + 0.18, z], [xE - 1.5, z], y, 1.3, { t: 0.12, tone: IMP.wallLight, band: null, features: false, kick: 0.12, cap: 0.08, tag: "suiteRail" });
  floorDecal(kit, xE - 0.8, y, doorZ, 0.8, 15, 90);

  // --- lounge (between the half partitions) ---
  wallScreen(westF, west.u(doorZ), 1.75, 2.8, 1.5, 0);
  westF.quad("impDecal", west.u(doorZ) - 1.9, 1.75, 0.062, 0.5, 0.5, { uvRect: impDecalRect(0) });
  westF.quad("impDecal", west.u(doorZ) + 1.9, 1.75, 0.062, 0.5, 0.5, { uvRect: impDecalRect(15) });
  // the metre of panel above the band: a raised Imperial cog roundel over the viewscreen between a lit
  // fleet status board and a holo-map, glyph plaques over the sideboard and the office wall
  {
    const cu = west.u(doorZ);
    westF.cylN("impPaintedMetal", cu, 3.0, 0.1, 0.44, 0.08, { color: IMP.trim, segments: 28 });
    westF.cylN("impPaintedMetal", cu, 3.0, 0.155, 0.37, 0.03, { color: IMP.wallMid, segments: 28 });
    westF.quad("impDecal", cu, 3.0, 0.172, 0.7, 0.7, { uvRect: impDecalRect(4) });
    for (const s of [-1, 1]) westF.box("impPaintedMetal", cu + s * 0.6, 3.0, 0.08, 0.2, 0.06, 0.04, { color: IMP.trim, texel: 1 });
    wallBoard(westF, cu - 2.15, 3.0, 1.6, 0.62, boardMaterial(ctx.mats, "crewBoardOfficers", { seed: 61, accent: "#5d8fe0", rows: 5, warnEvery: 4 }), { leds: false });
    wallScreen(westF, cu + 2.15, 3.0, 1.6, 0.62, 2, { leds: false });
    for (const [u, c] of [[cu - 5.2, 3], [cu + 5.2, 15]]) westF.quad("impDecal", u, 3.0, 0.062, 0.6, 0.6, { uvRect: impDecalRect(c) });
    eastF.quad("impDecal", doorZ + 3.6 - zN, 3.0, 0.062, 0.6, 0.6, { uvRect: impDecalRect(0) });
    eastF.quad("impDecal", doorZ - 3.6 - zN, 3.0, 0.062, 0.6, 0.6, { uvRect: impDecalRect(3) });
  }
  counter(kit, [xW + 0.36, y, 413.6], 2.2, -Math.PI / 2, { d: 0.5, h: 0.85, tone: IMP.consoleDark, tag: "sideboard" });
  wallCabinet(westF, west.u(414.7), west.u(412.5), 1.15, 1.95, { glass: true, seed: 8 });
  // bottles on the sideboard
  for (let k = 0; k < 4; k++) kit.add("impMetal", new THREE.CylinderGeometry(0.04, 0.045, 0.22 + (k % 2) * 0.08, 10), { pos: [xW + 0.3 + (k % 2) * 0.16, y + 0.85 + 0.11 + (k % 2) * 0.04, 413.0 + k * 0.28], color: [IMP.steel, IMP.gunmetal, 0x6fa0ff, IMP.white][k], uv: "scale", uvScale: [0.3, 0.3] });
  kit.boxMM("impFabric", [xW + 1.1, y + 0.004, 414.9], [xE - 1.6, y + 0.016, 421.4], { color: RUG, uv: "world", texel: 1.5 });
  loungeChair(kit, [xE - 3.0, y, 416.4], Math.PI / 2, { color: IMP.fabricBlack });
  loungeChair(kit, [xE - 3.0, y, 419.6], Math.PI / 2, { color: IMP.fabricBlack });
  sideTable(kit, [xE - 3.0, y, 418.0], 0.32, 0.55, { tone: IMP.consoleDark });
  table(kit, [xW + 2.4, y, 418.0], 1.4, 0.7, { h: 0.44, tone: IMP.consoleDark });
  loungeChair(kit, [xW + 1.7, y, 421.2], -Math.PI / 4, { color: IMP.fabricBlack });
  loungeChair(kit, [xW + 1.7, y, 414.8], (-3 * Math.PI) / 4, { color: IMP.fabricBlack });
  bench(kit, [cx - 0.4, y, zB - 0.5], 2.2, 0, { color: IMP.fabricBlack });
  // floor lamp behind the bench, hull model on a plinth by the door
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.16, 0.2, 0.04, 12), { pos: [cx + 1.2, y + 0.02, zB - 0.5], color: IMP.trim, uv: "scale", uvScale: [1, 1] });
  kit.add("impMetal", new THREE.CylinderGeometry(0.02, 0.02, 1.7, 8), { pos: [cx + 1.2, y + 0.89, zB - 0.5], color: IMP.gunmetal, uv: "scale", uvScale: [0.2, 1] });
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.16, 0.1, 0.22, 12, 1, true), { pos: [cx + 1.2, y + 1.82, zB - 0.5], color: IMP.consoleDark, uv: "scale", uvScale: [1, 0.3] });
  kit.add("crewEmit", new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12), { pos: [cx + 1.2, y + 1.72, zB - 0.5], color: 0xffc890 });
  kit.collider([cx + 1.0, y, zB - 0.7], [cx + 1.4, y + 1.9, zB - 0.3], "lamp");
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.26, 0.3, 1.05, 14), { pos: [xE - 1.1, y + 0.525, 414.6], color: IMP.consoleDark, uv: "scale", uvScale: [2, 1] });
  kit.add("impMetal", new THREE.CylinderGeometry(0.3, 0.3, 0.03, 14), { pos: [xE - 1.1, y + 1.06, 414.6], color: IMP.steel, uv: "scale", uvScale: [2, 0.1] });
  const wedge = new THREE.ConeGeometry(0.36, 0.9, 4);
  wedge.rotateX(-Math.PI / 2);
  wedge.scale(1, 0.28, 1);
  wedge.rotateY(Math.PI / 2);
  kit.add("impMetal", wedge, { pos: [xE - 1.1, y + 1.2, 414.6], color: IMP.steel, uv: "scale", uvScale: [1, 1] });
  kit.box("impPaintedMetal", xE - 1.1, y + 1.24, 414.6, 0.1, 0.14, 0.14, { color: IMP.gunmetal });
  kit.collider([xE - 1.42, y, 414.28], [xE - 0.78, y + 1.3, 414.92], "plinth");
  wallScreen(eastF, 422.6 - zN, 1.7, 1.3, 0.75, 2);
  wallCabinet(eastF, 412.6 - zN, 414.6 - zN, 1.1, 1.9, { glass: true, seed: 9, shelves: 2 });
  eastF.quad("impDecal", 421.2 - zN, 1.7, 0.062, 0.4, 0.4, { uvRect: impDecalRect(6) });
  ceilingLight(kit, ctx, [cx, y + h, doorZ], 3.0, "x", { intensity: 6, distance: 10, priority: 1, color: WARM, mat: "lightBandWarm" });
  pointLightDesc(ctx, 0xffb060, 1.5, 4, [xW + 0.9, y + 1.9, 413.6], 0);

  // --- sleeping cabin (north end) ---
  bed(kit, [xW + 1.35, y, 406.4], Math.PI / 2, { w: 1.7, l: 2.15, color: IMP.fabricGrey, blanket: 0x2a2e3a, tone: IMP.consoleDark });
  lockers(northF, 0.35, 3.35, 2.2, { seed: 12, tone: IMP.consoleDark, doorW: 0.75 });
  sideTable(kit, [xW + 0.5, y, 408.2], 0.28, 0.55, { tone: IMP.consoleDark });
  kit.boxMM("impFabric", [xW + 1.6, y + 0.004, 404.6], [xE - 1.2, y + 0.016, 409.6], { color: RUG, uv: "world", texel: 1.5 });
  wallScreen(eastF, 406.8 - zN, 1.6, 1.4, 0.8, 1);
  eastF.quad("impDecal", 409.3 - zN, 1.6, 0.062, 0.4, 0.4, { uvRect: impDecalRect(9) });
  westF.quad("impDecal", west.u(409.8), 1.7, 0.062, 0.45, 0.45, { uvRect: impDecalRect(3) });
  ceilingLight(kit, ctx, [cx, y + h, 406.5], 2.4, "x", { intensity: 4.5, distance: 9, priority: 0, color: WARM, mat: "lightBandWarm" });

  // --- office (south end) ---
  const dz = 429.6;
  counter(kit, [cx - 0.2, y, dz], 2.4, 0, { d: 0.9, h: 0.78, tone: IMP.consoleDark, doors: false, top: "darkGloss", tag: "desk" });
  kit.box("impMetal", cx - 1.0, y + 1.0, dz + 0.05, 0.04, 0.34, 0.04, { color: IMP.gunmetal });
  kit.box("darkGloss", cx - 1.0, y + 1.34, dz + 0.05, 0.7, 0.44, 0.03);
  kit.box("screen0", cx - 1.0, y + 1.34, dz + 0.033, 0.64, 0.38, 0.004, { uv: "keep" });
  kit.box("blink", cx - 0.9, y + 0.815, dz + 0.3, 0.56, 0.008, 0.2, { uv: "keep" });
  kit.box("darkGloss", cx + 0.3, y + 0.815, dz + 0.15, 0.28, 0.01, 0.2);
  kit.box("darkGloss", cx + 0.7, y + 0.815, dz - 0.15, 0.22, 0.01, 0.3);
  kit.box("impPaintedMetal", cx + 0.9, y + 1.0, dz - 0.25, 0.08, 0.4, 0.08, { color: IMP.consoleDark, texel: 1 });
  kit.box("crewEmit", cx + 0.9, y + 1.21, dz - 0.25, 0.14, 0.02, 0.14, { color: 0xffc890 });
  chair(kit, [cx - 0.2, y, dz + 1.15], 0, { color: IMP.fabricBlack });
  chair(kit, [cx - 1.0, y, dz - 1.25], Math.PI, { color: IMP.fabricBlack });
  chair(kit, [cx + 0.6, y, dz - 1.25], Math.PI, { color: IMP.fabricBlack });
  shelfUnit(southF, 1.4, 4.6, 2.1, { shelves: 4, seed: 14, tone: IMP.consoleDark, items: "mixed" });
  wallScreen(southF, 5.6, 1.7, 1.2, 0.7, 1);
  southF.quad("impDecal", 0.6, 1.75, 0.062, 0.45, 0.45, { uvRect: impDecalRect(0) });
  westF.quad("impDecal", west.u(428.0), 1.7, 0.062, 0.45, 0.45, { uvRect: impDecalRect(6) });
  wallCabinet(westF, west.u(431.5), west.u(429.5), 1.2, 2.0, { glass: false, seed: 15 });
  kit.boxMM("impFabric", [xW + 1.2, y + 0.004, 427.0], [xE - 1.2, y + 0.016, 432.4], { color: RUG, uv: "world", texel: 1.5 });
  ceilingLight(kit, ctx, [cx, y + h, dz], 2.4, "x", { intensity: 5, distance: 9, priority: 0, color: WARM, mat: "lightBandWarm" });
}
