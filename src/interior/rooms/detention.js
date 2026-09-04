// Deck 3 — Security & Detention Block (d3_detention). Red light, black deck, warning stripes. A guard
// station inside the secure door (monitor wall, consoles, scanner arch, weapons locker), a cell
// corridor with six force-field cells (three a side, benches, sanitary units, a prisoner or two), the
// interrogation chamber at the far end (restraint chair, a hovering interrogation droid, harsh white
// light) and two service passages behind the cells that loop round to the chamber. Deck-local, y = 0.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, impWall, wallScreen, impConsole, impChair, crate, pipeRun, wallSegment } from "../imperial.js";
import { pointLight, wallFrame } from "../builders.js";
import { Kit } from "../../kit.js";
import { decalRect } from "../../textures.js";
import { ensureCrewMaterials, SIGN, signRect, wallSign, signQuad, floorSign, floorGrime, scuffRun, wallGrime, cableTray, ventGrille, intercom, lockerBank, propFrame } from "./crewProps.js";

const DET_PAINTS = [
  [PALETTE.impGrey, 0.4],
  [PALETTE.impMid, 0.35],
  [PALETTE.impDark, 0.25],
];
const DET_STYLES = { panel: 0.66, vent: 0.1, greeble: 0.1, strip: 0.05, screen: 0.02, conduit: 0.07 };
const CELL_H = 3.6;

/** Plain dark partition: a panelled slab with a black kick and a top trim, plus its collider. */
function slabWall(kit, x0, z0, x1, z1, h = CELL_H, t = 0.16, color = PALETTE.impDark) {
  const min = [Math.min(x0, x1) - (x0 === x1 ? t / 2 : 0), 0, Math.min(z0, z1) - (z0 === z1 ? t / 2 : 0)];
  const max = [Math.max(x0, x1) + (x0 === x1 ? t / 2 : 0), h, Math.max(z0, z1) + (z0 === z1 ? t / 2 : 0)];
  kit.boxMM("impPanel1", min, max, { color, uv: "world", texel: 0.5 });
  kit.boxMM("paintedMetal", [min[0] - 0.01, 0, min[2] - 0.01], [max[0] + 0.01, 0.12, max[2] + 0.01], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("paintedMetal", [min[0] - 0.01, h - 0.1, min[2] - 0.01], [max[0] + 0.01, h, max[2] + 0.01], { color: PALETTE.impBlack, texel: 2 });
  kit.collider(min, max, "partition");
}

/** Hovering interrogation droid: black sphere, sensor ring, probe needles with red tips, one red eye. */
function interrogationDroid(kit, ctx, x, y, z) {
  const mk = new Kit(ctx.materials);
  mk.add("rubber", new THREE.SphereGeometry(0.3, 20, 14), { pos: [0, 0, 0], color: PALETTE.rubber });
  mk.add("paintedMetal", new THREE.TorusGeometry(0.31, 0.03, 8, 32), { pos: [0, -0.05, 0], rot: [Math.PI / 2, 0, 0], color: PALETTE.impMid, texel: 2 });
  mk.add("paintedMetal", new THREE.TorusGeometry(0.2, 0.025, 8, 24), { pos: [0, -0.25, 0], rot: [Math.PI / 2, 0, 0], color: PALETTE.impDark, texel: 2 });
  mk.box("emitRed", 0.0, 0.05, 0.3, 0.1, 0.05, 0.02);
  mk.box("darkGloss", 0.0, 0.05, 0.29, 0.16, 0.09, 0.02);
  // probes: syringes and manipulators around the lower hemisphere
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const tilt = -0.6 - (i % 2) * 0.3;
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(tilt), Math.sin(tilt), Math.sin(a) * Math.cos(tilt));
    const len = 0.28 + (i % 3) * 0.08;
    const p = dir.clone().multiplyScalar(0.28 + len / 2);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    mk.add("metal", new THREE.CylinderGeometry(0.012, 0.02, len, 8), { pos: [p.x, p.y, p.z], quat: q, color: PALETTE.steel });
    const tip = dir.clone().multiplyScalar(0.28 + len + 0.02);
    mk.add(i % 3 === 0 ? "emitRed" : "metal", new THREE.CylinderGeometry(0.004, 0.012, 0.06, 6), { pos: [tip.x, tip.y, tip.z], quat: q, color: PALETTE.impBlack });
  }
  // sensor studs around the equator
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    mk.box(i % 2 ? "emitRed" : "darkGloss", Math.cos(a) * 0.29, 0.12, Math.sin(a) * 0.29, 0.05, 0.04, 0.05, { rot: [0, -a, 0] });
  }
  const group = new THREE.Group();
  group.position.set(x, y, z);
  mk.build(group, { castShadow: false, receiveShadow: true });
  ctx.mesh(group);
  ctx.anim((dt, t) => {
    group.position.y = y + Math.sin(t * 1.3) * 0.07;
    group.position.x = x + Math.sin(t * 0.5) * 0.12;
    group.rotation.y = Math.sin(t * 0.7) * 0.6;
  });
}

/** Restraint chair on a plinth, reclined, with cuff rings and a head clamp; faces +X when yaw = 0. */
function restraintChair(kit, x, z, yaw) {
  const F = propFrame(kit, x, z, yaw);
  kit.cyl("paintedMetal", x, 0.08, z, 0.7, 0.16, "y", { color: PALETTE.impBlack, segments: 24, texel: 2 });
  kit.add("emitRed", new THREE.TorusGeometry(0.66, 0.012, 6, 40), { pos: [x, 0.165, z], rot: [Math.PI / 2, 0, 0] });
  F.box("paintedMetal", 0, 0.4, 0, 0.5, 0.5, 0.4, { color: PALETTE.impDark, texel: 2 });
  const recl = F.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.25));
  F.box("paintedMetal", 0.1, 0.7, 0, 0.9, 0.1, 0.6, { color: PALETTE.impBlack, texel: 2, quat: recl });
  F.box("rubber", 0.1, 0.76, 0, 0.8, 0.06, 0.5, { color: PALETTE.rubber, quat: recl });
  const back = F.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.35));
  F.box("paintedMetal", -0.42, 1.2, 0, 0.1, 1.1, 0.6, { color: PALETTE.impBlack, texel: 2, quat: back });
  F.box("rubber", -0.36, 1.2, 0, 0.05, 1.0, 0.5, { color: PALETTE.rubber, quat: back });
  // arm rests with cuff rings, leg clamps, head clamp on a stalk
  for (const s of [-1, 1]) {
    F.box("paintedMetal", 0.0, 0.95, s * 0.36, 0.7, 0.06, 0.1, { color: PALETTE.impMid, texel: 2 });
    F.add("metal", new THREE.TorusGeometry(0.07, 0.012, 6, 16), 0.25, 1.0, s * 0.36, { color: PALETTE.steel, quat: F.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)) });
    F.add("metal", new THREE.TorusGeometry(0.08, 0.012, 6, 16), 0.5, 0.62, s * 0.16, { color: PALETTE.steel, quat: F.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)) });
  }
  F.cyl("metal", -0.55, 1.6, 0, 0.02, 0.6, "y", { color: PALETTE.steel, segments: 8 });
  F.add("paintedMetal", new THREE.TorusGeometry(0.16, 0.025, 8, 20, Math.PI * 1.3), -0.42, 1.75, 0, { color: PALETTE.impDark, texel: 2, quat: F.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2 + 0.3)) });
  F.box("emitRed", -0.34, 1.75, 0.0, 0.02, 0.02, 0.06);
  F.collider(-0.6, -0.45, 0.6, 0.45, 1.2, "chair");
}

export function buildDetention(kit, ctx) {
  ensureCrewMaterials(ctx);
  const [min, max] = ctx.bounds; // x 42.4..62, y 0..3.6, z -46..-26
  const H = max[1];

  // zones
  const guardX1 = 48.4;
  const chamberX0 = 56.0;
  const corrZ0 = -37.7; // corridor south edge (cell fields)
  const corrZ1 = -34.3;
  const cellBackS = -41.6;
  const cellBackN = -30.4;
  const cellW = (chamberX0 - guardX1) / 3;

  roomShell(kit, ctx, {
    floor: { color: 0x6a6a70 },
    ceiling: false,
    walls: { rows: [0, 0.5, 1.6, 2.6, H], paints: DET_PAINTS, styles: DET_STYLES, theme: { accent: "emitRed", accent2: "emitRed", screenMats: ["impScreen1"] } },
  });
  // dark ceiling with red strips over the corridor and passages, white over the guard station
  kit.boxMM("paintedMetal", [min[0] - 0.2, H, min[2] - 0.2], [max[0] + 0.2, H + 0.12, max[2] + 0.2], { color: PALETTE.impDark, texel: 1.5 });
  for (let x = min[0] + 1.0; x < max[0] - 0.5; x += 2.0) kit.box("paintedMetal", x, H - 0.03, (min[2] + max[2]) / 2, 0.08, 0.06, max[2] - min[2] - 0.4, { color: PALETTE.impBlack, texel: 2 });
  for (let z = min[2] + 1.0; z < max[2] - 0.5; z += 2.0) kit.box("paintedMetal", (min[0] + max[0]) / 2, H - 0.03, z, max[0] - min[0] - 0.4, 0.06, 0.08, { color: PALETTE.impBlack, texel: 2 });
  const strip = (mat, x0, z0, x1, z1) => {
    kit.boxMM("paintedMetal", [Math.min(x0, x1) - 0.14, H - 0.1, Math.min(z0, z1) - 0.14], [Math.max(x0, x1) + 0.14, H, Math.max(z0, z1) + 0.14], { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM(mat, [Math.min(x0, x1), H - 0.11, Math.min(z0, z1)], [Math.max(x0, x1), H - 0.09, Math.max(z0, z1)]);
  };
  strip("emitRedSoft", guardX1 + 0.4, -36.04, chamberX0 - 0.4, -35.96);
  strip("emitRedSoft", guardX1 + 0.6, -43.84, max[0] - 0.6, -43.76);
  strip("emitRedSoft", guardX1 + 0.6, -28.24, max[0] - 0.6, -28.16);
  strip("emitWhiteSoft", 43.4, -33.0, 47.6, -32.92);
  strip("emitWhiteSoft", 43.4, -39.0, 47.6, -38.92);
  // black rubber deck in the corridor and the chamber, hazard edge lines along the corridor
  kit.boxMM("rubber", [guardX1, 0, corrZ0], [chamberX0, 0.012, corrZ1], { color: PALETTE.rubber });
  kit.boxMM("rubber", [chamberX0, 0, cellBackS], [max[0] - 0.2, 0.012, cellBackN], { color: PALETTE.rubber });
  kit.boxMM("hazard", [guardX1, 0, corrZ0 + 0.1], [chamberX0, 0.014, corrZ0 + 0.26], { texel: 4 });
  kit.boxMM("hazard", [guardX1, 0, corrZ1 - 0.26], [chamberX0, 0.014, corrZ1 - 0.1], { texel: 4 });

  // ------------------------------------------------------------------ lights (6)
  ctx.light(pointLight(0xff3a2a, 12, 13, [52.2, H - 0.5, -36.0]));
  ctx.light(pointLight(0xe8eeff, 16, 13, [45.4, H - 0.5, -36.0]));
  ctx.light(pointLight(0xdfe8ff, 12, 9, [59.0, H - 0.6, -36.0]));
  ctx.light(pointLight(0xff3020, 6, 10, [55.0, H - 0.6, -43.8]));
  ctx.light(pointLight(0xff3020, 6, 10, [55.0, H - 0.6, -28.2]));
  ctx.light(pointLight(0xe0e8ff, 9, 9, [45.4, H - 0.6, -29.6]));

  // ------------------------------------------------------------------ cell block: corridor walls with field openings, cells
  const fieldW = cellW - 0.7;
  const openings = [];
  for (let i = 0; i < 3; i++) openings.push({ type: "door", u0: i * cellW + 0.35, u1: (i + 1) * cellW - 0.35, v0: 0, v1: 2.6 });
  const wallOpts = { height: H, rows: [0, 0.5, 1.6, 2.6, H], paints: DET_PAINTS, styles: { panel: 0.72, vent: 0.08, greeble: 0.12, strip: 0.02, screen: 0.0, conduit: 0.06 }, noDoors: true, theme: { accent: "emitRed", accent2: "emitRed" } };
  impWall(kit, ctx, "zmin", { ...wallOpts, from: [guardX1, corrZ0], to: [chamberX0, corrZ0], openings, seed: ctx.seed + 3, tag: "cellwallS" });
  impWall(kit, ctx, "zmax", { ...wallOpts, from: [chamberX0, corrZ1], to: [guardX1, corrZ1], openings: openings.map((o) => ({ ...o })), seed: ctx.seed + 4, tag: "cellwallN" });
  // back walls and side partitions
  slabWall(kit, guardX1, cellBackS, chamberX0, cellBackS);
  slabWall(kit, guardX1, cellBackN, chamberX0, cellBackN);
  for (let i = 0; i <= 3; i++) {
    const x = guardX1 + i * cellW;
    if (i === 3) continue; // the chamber wall closes the east side
    slabWall(kit, x, cellBackS, x, corrZ0 - 0.16);
    slabWall(kit, x, corrZ1 + 0.16, x, cellBackN);
  }
  // the block's west face looks onto the guard station: a panelled wall face set just proud of the
  // slab (the slab stays as the cells' west wall), hazard bands and red lamps flanking the entrance
  const faceX = guardX1 - 0.17;
  impWall(kit, ctx, "xmax", { ...wallOpts, from: [faceX, cellBackS - 0.16], to: [faceX, corrZ0 - 0.16], openings: [], seed: ctx.seed + 5, tag: "blockWS" });
  impWall(kit, ctx, "xmax", { ...wallOpts, from: [faceX, corrZ1 + 0.16], to: [faceX, cellBackN + 0.16], openings: [], seed: ctx.seed + 6, tag: "blockWN" });
  // close the reveal between the face and the slab at all four ends
  for (const z of [cellBackS - 0.16, corrZ0 - 0.16, corrZ1 + 0.16, cellBackN + 0.16]) {
    kit.box("paintedMetal", (faceX + guardX1) / 2, H / 2, z, guardX1 - faceX + 0.2, H, 0.05, { color: PALETTE.impBlack, texel: 2 });
  }
  for (const z of [corrZ0 - 0.45, corrZ1 + 0.45]) {
    kit.box("hazard", faceX - 0.02, 1.5, z, 0.03, 3.0, 0.3, { texel: 3 });
    kit.box("paintedMetal", faceX - 0.06, 3.2, z, 0.12, 0.2, 0.3, { color: PALETTE.impBlack, texel: 2 });
    kit.box("emitRed", faceX - 0.125, 3.2, z, 0.01, 0.12, 0.2);
  }
  const fieldMat = ctx.materials.crew_cellField;
  const fieldMap = fieldMat.map;
  ctx.anim((dt, t) => {
    fieldMap.offset.y = (t * 0.35) % 1;
    fieldMap.offset.x = Math.sin(t * 0.7) * 0.05;
    fieldMat.opacity = 0.28 + 0.06 * Math.sin(t * 23) * Math.sin(t * 5.1) + (Math.sin(t * 61) > 0.97 ? 0.15 : 0);
  });
  for (let side = 0; side < 2; side++) {
    const south = side === 0;
    const faceZ = south ? corrZ0 : corrZ1; // wall line on the corridor side
    const dirZ = south ? -1 : 1; // into the cell
    for (let i = 0; i < 3; i++) {
      const x0 = guardX1 + i * cellW;
      const xc = x0 + cellW / 2;
      const n = side * 3 + i; // 0..5
      const back = south ? cellBackS : cellBackN;
      const zc = (faceZ + back) / 2;
      // force field set into the opening (fz = the corridor face plane), dark jambs and lintel, emitter
      // studs, keypad + status lamp on the pier, cell number sign, hazard strip on the corridor deck
      const fz = faceZ - dirZ * 0.02;
      const fg = new THREE.PlaneGeometry(fieldW, 2.6);
      kit.add("crew_cellField", fg, { pos: [xc, 1.3, fz + dirZ * 0.1], rot: [0, south ? 0 : Math.PI, 0], uv: "scale", uvScale: [fieldW / 1.2, 2.6 / 1.2] });
      kit.collider([xc - fieldW / 2, 0, faceZ - 0.12], [xc + fieldW / 2, 2.6, faceZ + 0.12], "field");
      for (const s of [-1, 1]) kit.box("paintedMetal", xc + s * (fieldW / 2 + 0.06), 1.3, fz + dirZ * 0.1, 0.12, 2.6, 0.2, { color: PALETTE.impBlack, texel: 2 });
      kit.box("paintedMetal", xc, 2.66, fz + dirZ * 0.1, fieldW + 0.24, 0.14, 0.2, { color: PALETTE.impBlack, texel: 2 });
      kit.box("emitRed", xc, 2.58, fz + dirZ * 0.06, fieldW - 0.1, 0.02, 0.02);
      kit.box("emitRed", xc, 0.03, fz + dirZ * 0.06, fieldW - 0.1, 0.02, 0.02);
      for (let k = 0; k < 5; k++) for (const s of [-1, 1]) kit.box("emitRed", xc + s * (fieldW / 2 - 0.01), 0.4 + k * 0.5, fz + dirZ * 0.1, 0.03, 0.06, 0.03);
      const px = xc + fieldW / 2 + 0.3;
      kit.box("paintedMetal", px, 1.35, fz - dirZ * 0.03, 0.2, 0.3, 0.06, { color: PALETTE.impDark, texel: 2 });
      for (let k = 0; k < 4; k++) kit.box("rubber", px - 0.05 + (k % 2) * 0.1, 1.42 - Math.floor(k / 2) * 0.09, fz - dirZ * 0.065, 0.05, 0.05, 0.01, { color: PALETTE.rubber });
      kit.box(n === 4 ? "emitGreen" : "emitRed", px, 1.25, fz - dirZ * 0.065, 0.1, 0.03, 0.01);
      signQuad(kit, SIGN.CELL1 + n, [xc - fieldW / 2 - 0.35, 2.15, fz - dirZ * 0.012], [0, south ? 0 : Math.PI, 0], 0.5, true);
      kit.boxMM("hazard", [xc - fieldW / 2, 0.012, Math.min(faceZ, faceZ - dirZ * 0.5)], [xc + fieldW / 2, 0.02, Math.max(faceZ, faceZ - dirZ * 0.5)], { texel: 3 });
      // cell interior: bench shelf along the back wall, sanitary unit, red ceiling light, drain, grime
      const bz = back - dirZ * 0.4;
      kit.box("paintedMetal", xc, 0.42, bz, cellW - 0.5, 0.08, 0.7, { color: PALETTE.impMid, texel: 2 });
      kit.box("paintedMetal", xc, 0.2, bz, cellW - 0.6, 0.36, 0.6, { color: PALETTE.impBlack, texel: 2 });
      kit.box("fabric", xc, 0.49, bz, cellW - 0.6, 0.06, 0.6, { color: PALETTE.impDark, uv: "world", texel: 2 });
      kit.collider([x0 + 0.25, 0, Math.min(bz - 0.35, bz + 0.35)], [x0 + cellW - 0.25, 0.55, Math.max(bz - 0.35, bz + 0.35)], "cellbench");
      const sx = x0 + 0.45;
      const sz = faceZ + dirZ * 0.9;
      kit.box("paintedMetal", sx, 0.3, sz, 0.5, 0.6, 0.5, { color: PALETTE.impMid, texel: 2 });
      kit.cyl("metal", sx, 0.62, sz, 0.18, 0.04, "y", { color: PALETTE.steel, segments: 14 });
      kit.cyl("paintedMetal", sx, 0.6, sz, 0.14, 0.02, "y", { color: PALETTE.impBlack, segments: 14 });
      kit.collider([sx - 0.25, 0, sz - 0.25], [sx + 0.25, 0.65, sz + 0.25], "sanitary");
      kit.box("paintedMetal", xc, H - 0.06, zc, 0.6, 0.1, 0.3, { color: PALETTE.impBlack, texel: 2 });
      kit.box("emitRedSoft", xc, H - 0.1, zc, 0.5, 0.02, 0.2, { uv: "keep" });
      kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [xc + 0.4, 0.014, zc], rot: [-Math.PI / 2, 0, 0], uv: "keep", uvRect: decalRect(3) });
      floorGrime(kit, xc, zc, cellW - 0.6, 2.4, 0.1);
      wallGrime(kit, ctx, south ? "zmin" : "zmax", cellW / 2, 0.5, 1.2, 0.6, [[x0, 0, Math.min(back, faceZ)], [x0 + cellW, H, Math.max(back, faceZ)]]);
      // prisoners: a seated figure in two cells, a standing one at the field in another
      if (n === 1 || n === 5) {
        const F = propFrame(kit, xc + 0.3, bz - dirZ * 0.1, south ? 0 : Math.PI);
        F.box("rubber", 0, 0.78, 0, 0.42, 0.56, 0.24, { color: PALETTE.rubber });
        F.add("rubber", new THREE.SphereGeometry(0.12, 12, 8), 0, 1.2, 0, { color: PALETTE.impDark });
        for (const s of [-1, 1]) {
          F.box("rubber", s * 0.12, 0.62, 0.32, 0.14, 0.12, 0.5, { color: PALETTE.rubber });
          F.box("rubber", s * 0.12, 0.3, 0.5, 0.13, 0.5, 0.13, { color: PALETTE.rubber });
          F.box("rubber", s * 0.28, 0.85, 0.1, 0.1, 0.44, 0.1, { color: PALETTE.rubber, quat: F.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.5)) });
        }
      } else if (n === 3) {
        const F = propFrame(kit, xc - 0.2, faceZ + dirZ * 0.7, south ? Math.PI : 0);
        F.box("rubber", 0, 1.15, 0, 0.44, 0.62, 0.24, { color: PALETTE.rubber });
        F.box("rubber", 0, 0.42, 0, 0.36, 0.84, 0.22, { color: PALETTE.rubber });
        F.add("rubber", new THREE.SphereGeometry(0.12, 12, 8), 0, 1.6, 0, { color: PALETTE.impDark });
        for (const s of [-1, 1]) F.box("rubber", s * 0.28, 1.1, 0.02, 0.1, 0.6, 0.1, { color: PALETTE.rubber });
      }
    }
  }
  // corridor end frame into the chamber + sign, cable trays high on both corridor walls
  {
    const seg = { from: [chamberX0, cellBackS], to: [chamberX0, cellBackN] };
    impWall(kit, ctx, "xmax", { ...wallOpts, from: seg.from, to: seg.to, openings: [{ type: "door", u0: corrZ0 - cellBackS + 0.3, u1: corrZ1 - cellBackS - 0.3, v0: 0, v1: 2.9 }], seed: ctx.seed + 5, tag: "chamberW" });
    const dw = corrZ1 - corrZ0 - 0.6;
    kit.box("paintedMetal", chamberX0, 3.1, -36, 0.6, 0.4, dw + 0.5, { color: PALETTE.impBlack, texel: 2 });
    for (const s of [-1, 1]) kit.box("paintedMetal", chamberX0, 1.45, -36 + s * (dw / 2 + 0.12), 0.6, 2.9, 0.24, { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM("hazard", [chamberX0 - 0.31, 0, -36 - dw / 2 - 0.24], [chamberX0 - 0.29, 2.9, -36 - dw / 2], { texel: 3 });
    kit.boxMM("hazard", [chamberX0 - 0.31, 0, -36 + dw / 2], [chamberX0 - 0.29, 2.9, -36 + dw / 2 + 0.24], { texel: 3 });
    kit.box("emitRed", chamberX0 - 0.31, 2.92, -36, 0.02, 0.03, dw - 0.2);
    signQuad(kit, SIGN.INTERROGATION, [chamberX0 - 0.31, 3.15, -36], [0, -Math.PI / 2, 0], 1.6, true);
    kit.collider([chamberX0 - 0.3, 0, -36 - dw / 2 - 0.24], [chamberX0 + 0.3, H, -36 - dw / 2], "jamb");
    kit.collider([chamberX0 - 0.3, 0, -36 + dw / 2], [chamberX0 + 0.3, H, -36 + dw / 2 + 0.24], "jamb");
    cableTray(kit, ctx, "zmin", 0.3, chamberX0 - guardX1 - 0.3, 3.15, [[guardX1, 0, corrZ0], [chamberX0, H, corrZ1]]);
    cableTray(kit, ctx, "zmax", 0.3, chamberX0 - guardX1 - 0.3, 3.15, [[guardX1, 0, corrZ0], [chamberX0, H, corrZ1]]);
    scuffRun(kit, guardX1 + 0.5, -36, chamberX0 - 0.5, -36, 6, ctx.seed + 51, 1.0);
    floorSign(kit, SIGN.DETENTION, guardX1 + 1.4, -36, 1.8, Math.PI / 2, false);
  }

  // ------------------------------------------------------------------ interrogation chamber
  {
    // inner faces of the chamber walls (plain slabs) with side openings into the passages
    slabWall(kit, chamberX0 + 0.16, cellBackS, 59.2, cellBackS);
    slabWall(kit, 61.2, cellBackS, max[0], cellBackS);
    slabWall(kit, chamberX0 + 0.16, cellBackN, 59.2, cellBackN);
    slabWall(kit, 61.2, cellBackN, max[0], cellBackN);
    for (const z of [cellBackS, cellBackN]) {
      kit.box("paintedMetal", 60.2, 2.95, z, 2.3, 0.3, 0.3, { color: PALETTE.impBlack, texel: 2 });
      kit.box("emitRed", 60.2, 2.82, z, 1.8, 0.02, 0.02);
      kit.collider([59.05, 2.8, z - 0.15], [61.35, H, z + 0.15], "lintel");
    }
    restraintChair(kit, 59.2, -36.0, 0);
    interrogationDroid(kit, ctx, 60.3, 1.75, -34.9);
    // overhead lamp: harsh white ring on a stem
    kit.cyl("paintedMetal", 59.2, H - 0.3, -36, 0.06, 0.6, "y", { color: PALETTE.impBlack, segments: 10 });
    kit.cyl("paintedMetal", 59.2, H - 0.62, -36, 0.5, 0.08, "y", { color: PALETTE.impBlack, segments: 20, texel: 2 });
    kit.cyl("emitWhite", 59.2, H - 0.67, -36, 0.42, 0.02, "y", { segments: 20 });
    // console + chair for the interrogator against the east wall, screens above, tool cart, drain
    impConsole(kit, ctx, { x: 61.2, z: -36.0, yaw: -Math.PI / 2, w: 1.6, d: 0.7, screens: [1, 3], chair: false, seed: ctx.seed + 61, lampMat: "emitRed" });
    impChair(kit, ctx, { x: 60.3, z: -36.6, yaw: -Math.PI / 2 - 0.5 });
    wallScreen(kit, ctx, { side: "xmax", u: -36.0 - min[2], v: 2.1, w: 1.4, h: 0.8, screen: 1 });
    wallScreen(kit, ctx, { side: "xmax", u: -38.0 - min[2], v: 2.1, w: 1.0, h: 0.6, screen: 3 });
    kit.box("paintedMetal", 57.4, 0.45, -38.6, 0.7, 0.9, 0.5, { color: PALETTE.impDark, texel: 1.5 });
    kit.box("metal", 57.4, 0.92, -38.6, 0.74, 0.04, 0.54, { color: PALETTE.steel, texel: 1 });
    for (let k = 0; k < 6; k++) kit.box("metal", 57.15 + k * 0.1, 0.96, -38.6, 0.02, 0.012, 0.3, { color: PALETTE.steel });
    kit.cyl("crew_glass", 57.55, 0.99, -38.5, 0.03, 0.09, "y", { segments: 8 });
    kit.collider([57.05, 0, -38.85], [57.75, 1.0, -38.35], "cart");
    kit.add("decal", new THREE.PlaneGeometry(0.5, 0.5), { pos: [59.2, 0.014, -35.0], rot: [-Math.PI / 2, 0, 0], uv: "keep", uvRect: decalRect(3) });
    floorGrime(kit, 59.2, -36, 3.0, 3.0, 0.3);
    wallGrime(kit, ctx, "xmax", -33.0 - min[2], 0.5, 2.0, 0.7);
    // wall restraint rings + a hazard-striped equipment locker
    {
      const seg = wallSegment(ctx.bounds, "xmax");
      const { frame } = wallFrame(kit, seg.from, seg.to, 0); // u = z - min.z
      for (let k = 0; k < 3; k++) frame.add("metal", new THREE.TorusGeometry(0.08, 0.012, 6, 16), -33.6 - min[2] + k * 0.5, 1.7, 0.03, { color: PALETTE.steel });
      frame.box("paintedMetal", -33.6 - min[2] + 0.5, 1.82, 0.02, 1.5, 0.06, 0.04, { color: PALETTE.impMid, texel: 2 });
      ventGrille(frame, -40.4 - min[2], 0.4, 0.8, 0.35);
      ventGrille(frame, -31.6 - min[2], 0.4, 0.8, 0.35);
    }
    lockerBank(kit, ctx, { x: 61.6, z: -40.2, yaw: -Math.PI / 2, n: 2, w: 0.5, h: 2.0, d: 0.5, seed: ctx.seed + 63, color: PALETTE.impDark, lamp: "emitRed" });
  }

  // ------------------------------------------------------------------ guard station
  {
    // monitor wall on the north wall: 3x2 cell feeds + a block map, console with chair facing it
    const seg = wallSegment(ctx.bounds, "zmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0); // u = max.x - x
    const mu = max[0] - 45.4;
    frame.box("paintedMetal", mu, 2.0, 0.03, 4.2, 2.2, 0.06, { color: PALETTE.impDark, texel: 2 });
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const u = mu - 1.3 + c * 1.3;
        const v = 2.5 - r * 0.85;
        frame.box("darkGloss", u, v, 0.062, 1.16, 0.7, 0.006);
        frame.add(r === 1 && c === 1 ? "impScreen3" : "impScreen1", new THREE.PlaneGeometry(1.06, 0.6), u, v, 0.067, { uv: "keep" });
        frame.add("crew_signLit", new THREE.PlaneGeometry(0.4, 0.1), u - 0.3, v - 0.36, 0.068, { uv: "keep", uvRect: signRect(SIGN.CELL1 + r * 3 + c) });
      }
    }
    frame.box("leds", mu, 1.05, 0.05, 3.6, 0.03, 0.01, { uv: "keep" });
    impConsole(kit, ctx, { x: 45.4, z: -29.2, yaw: Math.PI, w: 2.4, d: 0.85, screens: [1, 3, 1], chair: true, seed: ctx.seed + 71, lampMat: "emitRed" });
    // a second console facing the door: ident check, with a chair
    impConsole(kit, ctx, { x: 46.2, z: -39.6, yaw: Math.PI / 2, w: 1.6, d: 0.75, screens: [3, 1], chair: true, seed: ctx.seed + 72, lampMat: "emitRed" });
    // scanner arch across the approach to the cell corridor (posts clear of the walking line)
    for (const s of [-1, 1]) {
      kit.box("paintedMetal", 47.6, 1.4, -36 + s * 1.75, 0.3, 2.8, 0.3, { color: PALETTE.impDark, texel: 1.5 });
      kit.box("hazard", 47.6, 0.3, -36 + s * 1.75, 0.32, 0.6, 0.32, { texel: 3 });
      kit.box("leds", 47.45, 1.6, -36 + s * 1.75, 0.006, 1.2, 0.08, { uv: "keep", rot: [0, 0, Math.PI / 2] });
      kit.collider([47.45, 0, -36 + s * 1.75 - 0.15], [47.75, 2.8, -36 + s * 1.75 + 0.15], "archpost");
    }
    kit.box("paintedMetal", 47.6, 2.95, -36, 0.4, 0.3, 3.8, { color: PALETTE.impDark, texel: 1.5 });
    kit.box("emitRed", 47.6, 2.79, -36, 0.2, 0.02, 3.2);
    kit.box("darkGloss", 47.4, 3.0, -36, 0.02, 0.2, 1.2);
    signQuad(kit, SIGN.DETENTION, [47.39, 3.0, -36], [0, -Math.PI / 2, 0], 1.0, true);
    kit.boxMM("hazard", [47.3, 0.012, -37.6], [47.9, 0.02, -34.4], { texel: 3 });
    // weapons locker + holding bench with cuff rings on the south wall
    lockerBank(kit, ctx, { x: 45.0, z: min[2], yaw: 0, n: 4, w: 0.5, h: 2.0, d: 0.5, seed: ctx.seed + 73, color: PALETTE.impDark, lamp: "emitRed" });
    const bx = 43.6;
    const bz = -41.5;
    kit.box("paintedMetal", bx, 0.42, bz, 0.4, 0.06, 3.0, { color: PALETTE.impDark, texel: 2 });
    kit.box("rubber", bx, 0.475, bz, 0.36, 0.05, 2.96, { color: PALETTE.rubber });
    for (const s of [-1, 1]) kit.box("paintedMetal", bx, 0.2, bz + s * 1.3, 0.34, 0.4, 0.08, { color: PALETTE.impBlack, texel: 2 });
    for (let k = 0; k < 3; k++) kit.add("metal", new THREE.TorusGeometry(0.06, 0.01, 6, 14), { pos: [bx + 0.22, 0.5, bz - 1.0 + k], rot: [0, 0, Math.PI / 2], color: PALETTE.steel });
    kit.collider([bx - 0.22, 0, bz - 1.55], [bx + 0.25, 0.55, bz + 1.55], "bench");
    wallSign(kit, ctx, { side: "xmin", u: max[2] - -36, v: 3.25, w: 1.8, cell: SIGN.DETENTION, lit: true });
    wallScreen(kit, ctx, { side: "xmin", u: max[2] - -31.6, v: 1.9, w: 1.3, h: 0.75, screen: 1 });
    wallScreen(kit, ctx, { side: "xmin", u: max[2] - -40.4, v: 1.9, w: 1.3, h: 0.75, screen: 3 });
    {
      const segW = wallSegment(ctx.bounds, "xmin");
      const fw = wallFrame(kit, segW.from, segW.to, 0).frame; // u = max.z - z
      intercom(fw, max[2] - -38.0, 1.5);
      fw.add("decal", new THREE.PlaneGeometry(0.4, 0.4), max[2] - -33.8, 2.6, 0.004, { uv: "keep", uvRect: decalRect(5) });
      ventGrille(fw, max[2] - -44.6, 0.4, 0.8, 0.35);
      ventGrille(fw, max[2] - -27.4, 0.4, 0.8, 0.35);
    }
    wallGrime(kit, ctx, "zmin", 2.0, 0.5, 1.6, 0.7);
    scuffRun(kit, 43.4, -36, 47.4, -36, 4, ctx.seed + 74, 1.0);
    floorGrime(kit, 43.2, -26.8, 1.4, 1.0, 0.2);
  }

  // ------------------------------------------------------------------ service passages behind the cells
  {
    // south: pipes and cable runs along the outer wall, crates, a security droid alcove
    pipeRun(kit, [[guardX1 + 0.2, 2.6, -45.75], [max[0] - 0.5, 2.6, -45.75]], 0.08, PALETTE.impMid);
    pipeRun(kit, [[guardX1 + 0.2, 2.35, -45.78], [max[0] - 0.5, 2.35, -45.78]], 0.05, PALETTE.steel);
    pipeRun(kit, [[52.0, 2.6, -45.75], [52.0, 3.5, -45.75]], 0.08, PALETTE.impMid);
    cableTray(kit, ctx, "zmin", guardX1 - min[0] + 0.4, max[0] - min[0] - 0.4, 3.1);
    crate(kit, ctx, { x: 50.0, z: -44.8, sx: 1.1, sy: 0.9, sz: 1.1, yaw: 0.1, seed: ctx.seed + 81, color: PALETTE.impDark });
    crate(kit, ctx, { x: 51.3, z: -44.9, sx: 0.9, sy: 0.7, sz: 0.9, yaw: -0.2, seed: ctx.seed + 82, color: PALETTE.impMid });
    for (let i = 0; i < 3; i++) {
      const x = 54.5 + i * 2.2;
      kit.box("paintedMetal", x, 1.2, -45.5, 1.4, 2.4, 0.8, { color: PALETTE.impDark, texel: 1.5 });
      kit.box("impPanel", x, 1.25, -45.09, 1.3, 2.2, 0.02, { color: PALETTE.impMid, uv: "keep" });
      kit.box("emitRed", x, 2.2, -45.08, 1.0, 0.02, 0.01);
      kit.box("darkGloss", x, 1.6, -45.07, 0.5, 0.3, 0.01);
      kit.collider([x - 0.7, 0, -46], [x + 0.7, 2.4, -45.08], "cabinet");
    }
    floorSign(kit, SIGN.AUTHORISED, 50.0, -43.6, 1.4, Math.PI / 2, false);
    // north: evidence lockers, a records desk, hazard stripes
    lockerBank(kit, ctx, { x: 51.0, z: max[2], yaw: Math.PI, n: 6, w: 0.5, h: 2.0, d: 0.5, seed: ctx.seed + 83, color: PALETTE.impMid, lamp: "emitRed" });
    lockerBank(kit, ctx, { x: 57.0, z: max[2], yaw: Math.PI, n: 6, w: 0.5, h: 2.0, d: 0.5, seed: ctx.seed + 84, color: PALETTE.impDark, lamp: "emitRed" });
    impConsole(kit, ctx, { x: 60.8, z: -27.4, yaw: Math.PI, w: 1.4, d: 0.7, screens: [1], chair: true, seed: ctx.seed + 85, lampMat: "emitRed" });
    cableTray(kit, ctx, "zmax", 0.4, max[0] - guardX1 - 0.4, 3.1);
    kit.boxMM("hazard", [guardX1 + 0.3, 0.012, cellBackN + 0.2], [max[0] - 0.3, 0.02, cellBackN + 0.36], { texel: 4 });
    kit.boxMM("hazard", [guardX1 + 0.3, 0.012, cellBackS - 0.36], [max[0] - 0.3, 0.02, cellBackS - 0.2], { texel: 4 });
    floorGrime(kit, 55, -28.2, 6.0, 1.6, 0.0);
    floorGrime(kit, 55, -43.8, 6.0, 1.6, 0.0);
  }
  if (ctx.audioZone) ctx.audioZone({ kind: "hum", pos: [52, 1.5, -36], radius: 10 });
}
