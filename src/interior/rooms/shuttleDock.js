// Shuttle docking bay (x -28..28, z 350..409.5, h 22): secondary bay reserved for a future shuttle. An empty
// docking cradle (four clamp towers whose jaws hang in the air over the marked landing pad), the sealed belly
// door recessed into the deck under the pad (two leaves, hazard chevrons, red edge lights, a pulsing blue
// seal strip; it never opens), fuel and power umbilical arms on pedestals, an elevated glass control booth on
// the forward wall, a service catwalk along the port wall reached by a stair tower, blue accent lighting.
// The blast door to the hangar is in the +z wall.
import * as THREE from "three";
import { Kit } from "../../kit.js";
import { roomFloorY } from "../../config/shipSpec.js";
import {
  propFrame, railing, deckStrip, hazardBand, deckDecal, grateFloor, bayWalls, crate, toolCart, pedestalConsole,
  cabinet, lightBank, pipeRun, stairTower, stairRun, beacons,
} from "../../hangar/machinery.js";

const CAT_H = 8; // catwalk height above the deck
const DOOR = { x0: -10, x1: 10, z0: 364, z1: 396 }; // sealed belly door
const RECESS = 0.15;

export function build(kit, ctx, room, lib) {
  const P = lib.PALETTE;
  const mats = ctx.materials;
  const { z0 } = room;
  const y0 = roomFloorY(room);
  const yTop = y0 + room.height;
  const T = lib.WALL_T;
  const shell = lib.roomShell(kit, ctx, room, { style: "dark", floor: false, lights: false, lightRows: 3, skipWalls: ["-z", "+z", "-x", "+x"] });
  // light strip row 6.4..11.6 puts a wall light 1 m above the catwalk
  bayWalls(kit, room, shell, y0, { lower: 6.4, rows: [6.4, 11.6, 16.8, room.height], lightRow: 0, seed: 71 });

  deck(kit, P, room, y0, T);
  bellyDoor(kit, ctx, mats, P, y0);
  padMarkings(kit, P, y0);
  for (const sx of [-1, 1]) for (const z of [365.5, 394.5]) clampTower(kit, P, sx, z, y0);
  umbilical(kit, P, -1, 380, y0, "fuel");
  umbilical(kit, P, 1, 380, y0, "power");
  booth(kit, ctx, lib, y0, z0);
  catwalk(kit, ctx, lib, room, y0);
  ceiling(kit, P, room, yTop);
  props(kit, lib, room, y0);
  lights(ctx, lib, y0, yTop);
  beacons(kit, ctx, mats, [[-14.5, y0 + 9.2, 365.5, 0.3], [14.5, y0 + 9.2, 394.5, 0.3]], "shuttleDock.beacons");
  return shell;
}

// ---------------------------------------------------------------- deck slabs around the belly door recess
function deck(kit, P, room, y0, T) {
  const { x0, x1, z0, z1 } = room;
  const D = DOOR;
  const slabs = [
    [x0 - T, z0 - T, x1 + T, D.z0],
    [x0 - T, D.z1, x1 + T, z1 + T],
    [x0 - T, D.z0, D.x0, D.z1],
    [D.x1, D.z0, x1 + T, D.z1],
  ];
  for (const [a, b, c, d] of slabs) {
    kit.boxMM("deck", [a, y0 - 0.3, b], [c, y0, d], { color: P.impGreyDark, uv: "world", texel: 1 });
    kit.floor(a, b, c, d, y0);
  }
  // door sill to the hangar
  hazardBand(kit, -4.4, z1 - 1.2, 4.4, z1, y0);
  deckDecal(kit, 0, y0, z1 - 2.6, 1.8, 1, Math.PI);
  // approach lane from the hangar door to the pad
  for (const sx of [-1, 1]) deckStrip(kit, "emitWhite", sx * 4.2 - 0.08, DOOR.z1 + 4, sx * 4.2 + 0.08, z1 - 1.5, y0);
  for (let z = DOOR.z1 + 5; z < z1 - 3; z += 3) deckStrip(kit, "emitWhite", -0.15, z, 0.15, z + 1.4, y0);
}

// ---------------------------------------------------------------- sealed belly door: recessed leaves, chevrons, edge lights
function bellyDoor(kit, ctx, mats, P, y0) {
  const D = DOOR;
  const dy = y0 - RECESS;
  kit.boxMM("paintedMetal", [D.x0, dy - 0.3, D.z0], [D.x1, dy, D.z1], { color: P.darkMetal, uv: "world", texel: 0.8 });
  kit.floor(D.x0, D.z0, D.x1, D.z1, dy);
  // seam between the two leaves, leaf ribs and locking dogs
  kit.boxMM("satinBlack", [-0.08, dy, D.z0], [0.08, dy + 0.012, D.z1]);
  for (let z = D.z0 + 4; z < D.z1 - 1; z += 4) kit.boxMM("paintedMetal", [D.x0 + 0.3, dy, z - 0.1], [D.x1 - 0.3, dy + 0.02, z + 0.1], { color: P.gunmetal, texel: 1 });
  for (const sx of [-1, 1]) kit.boxMM("paintedMetal", [sx * 5 - 0.1, dy, D.z0 + 0.3], [sx * 5 + 0.1, dy + 0.02, D.z1 - 0.3], { color: P.gunmetal, texel: 1 });
  for (let z = D.z0 + 2; z < D.z1; z += 4) for (const sx of [-1, 1]) {
    kit.box("metal", sx * 0.45, dy + 0.03, z, 0.5, 0.06, 0.9, { color: P.steel });
    kit.box("emitRed", sx * 0.45, dy + 0.062, z, 0.12, 0.006, 0.5);
  }
  // hazard chevrons around the recess at deck level and NO STEP / EMERGENCY stencils
  hazardBand(kit, D.x0 - 0.8, D.z0 - 0.8, D.x0, D.z1 + 0.8, y0);
  hazardBand(kit, D.x1, D.z0 - 0.8, D.x1 + 0.8, D.z1 + 0.8, y0);
  hazardBand(kit, D.x0, D.z0 - 0.8, D.x1, D.z0, y0);
  hazardBand(kit, D.x0, D.z1, D.x1, D.z1 + 0.8, y0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) deckDecal(kit, sx * 7.5, dy, 380 + sz * 13.5, 2.0, 13, sz > 0 ? Math.PI : 0);
  for (const sx of [-1, 1]) for (const [sz, z] of [[-1, D.z0 - 1.8], [1, D.z1 + 1.8]]) deckDecal(kit, sx * 8.6, y0, z, 1.4, 7, sz > 0 ? Math.PI : 0);
  deckDecal(kit, 0, dy, 380, 3.2, 8, 0);
  // red edge lights flush in the deck along the chevron band
  for (let z = D.z0 - 0.4; z <= D.z1 + 0.4; z += 3.2) for (const x of [D.x0 - 1.1, D.x1 + 1.1]) kit.box("emitRed", x, y0 + 0.004, z, 0.36, 0.01, 0.16);
  for (let x = D.x0 + 1.6; x < D.x1; x += 3.2) for (const z of [D.z0 - 1.1, D.z1 + 1.1]) kit.box("emitRed", x, y0 + 0.004, z, 0.16, 0.01, 0.36);
  // pulsing blue seal strip on the recess walls (own mesh so the emissive can breathe)
  const seal = new THREE.Group();
  seal.name = "shuttleDock.seal";
  const mat = mats.emitBlue.clone();
  const k = new Kit({ emitBlue: mat });
  k.boxMM("emitBlue", [D.x0 + 0.02, dy + 0.04, D.z0 + 0.1], [D.x0 + 0.04, dy + 0.1, D.z1 - 0.1]);
  k.boxMM("emitBlue", [D.x1 - 0.04, dy + 0.04, D.z0 + 0.1], [D.x1 - 0.02, dy + 0.1, D.z1 - 0.1]);
  k.boxMM("emitBlue", [D.x0 + 0.1, dy + 0.04, D.z0 + 0.02], [D.x1 - 0.1, dy + 0.1, D.z0 + 0.04]);
  k.boxMM("emitBlue", [D.x0 + 0.1, dy + 0.04, D.z1 - 0.04], [D.x1 - 0.1, dy + 0.1, D.z1 - 0.02]);
  k.build(seal, { castShadow: false, receiveShadow: false });
  const state = { t: 0 };
  ctx.dynamic.push({
    object: seal, name: "shuttleDock.seal", state,
    update(dt) {
      state.t += dt;
      mat.emissiveIntensity = 1.2 + 1.3 * (0.5 + 0.5 * Math.sin(state.t * 1.4));
    },
  });
}

// ---------------------------------------------------------------- landing pad markings
function padMarkings(kit, P, y0) {
  const D = DOOR;
  const dy = y0 - RECESS;
  const px0 = D.x0 - 2.4;
  const px1 = D.x1 + 2.4;
  const pz0 = D.z0 - 2.4;
  const pz1 = D.z1 + 2.4;
  // white pad outline, blue corner brackets
  deckStrip(kit, "emitWhite", px0 - 0.08, pz0, px0 + 0.08, pz1, y0);
  deckStrip(kit, "emitWhite", px1 - 0.08, pz0, px1 + 0.08, pz1, y0);
  deckStrip(kit, "emitWhite", px0, pz0 - 0.08, px1, pz0 + 0.08, y0);
  deckStrip(kit, "emitWhite", px0, pz1 - 0.08, px1, pz1 + 0.08, y0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx > 0 ? px1 + 1.0 : px0 - 1.0;
    const cz = sz > 0 ? pz1 + 1.0 : pz0 - 1.0;
    deckStrip(kit, "emitBlue", cx - (sx > 0 ? 0.3 : 0), Math.min(cz, cz - sz * 2.6), cx + (sx > 0 ? 0 : 0.3), Math.max(cz, cz - sz * 2.6), y0);
    deckStrip(kit, "emitBlue", Math.min(cx, cx - sx * 2.6), cz - (sz > 0 ? 0.3 : 0), Math.max(cx, cx - sx * 2.6), cz + (sz > 0 ? 0 : 0.3), y0);
  }
  // touchdown cross and centre line on the door leaves
  deckStrip(kit, "emitWhite", -4.5, 380 - 0.15, 4.5, 380 + 0.15, dy);
  deckStrip(kit, "emitWhite", -0.15, 374, 0.15, 386, dy);
  for (const z of [370, 390]) deckStrip(kit, "emitWhite", -2.5, z - 0.12, 2.5, z + 0.12, dy);
  // pad number and hatch code
  deckDecal(kit, -16.5, y0, 380, 3.6, 2, Math.PI / 2);
  deckDecal(kit, 16.5, y0, 380, 3.6, 2, -Math.PI / 2);
  deckDecal(kit, 0, y0, D.z0 - 4.6, 2.4, 3, 0);
  deckDecal(kit, 0, y0, D.z1 + 4.6, 2.4, 3, Math.PI);
}

// ---------------------------------------------------------------- docking cradle: clamp towers with jaws over the pad
function clampTower(kit, P, sx, z, y0) {
  const x = sx * 14.5;
  kit.boxMM("paintedMetal", [x - 1.4, y0, z - 1.4], [x + 1.4, y0 + 0.9, z + 1.4], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("hazard", [x - 1.41, y0 + 0.3, z - 1.41], [x + 1.41, y0 + 0.6, z + 1.41], { uv: "world", texel: 1.2 });
  kit.boxMM("paintedMetal", [x - 0.7, y0 + 0.9, z - 0.7], [x + 0.7, y0 + 8.0, z + 0.7], { color: P.slate, uv: "world", texel: 0.8 });
  for (const s of [-1, 1]) kit.boxMM("metal", [x + s * 0.72 - 0.04, y0 + 1.2, z - 0.4], [x + s * 0.72 + 0.04, y0 + 7.6, z + 0.4], { color: P.darkMetal, texel: 1 });
  kit.collider([x - 1.4, y0, z - 1.4], [x + 1.4, y0 + 8.0, z + 1.4], "clampTower");
  // cantilever arm toward the pad, jaw with rubber face and blue ready light
  const ax = sx * 8.6;
  kit.boxMM("paintedMetal", [Math.min(x, ax), y0 + 7.0, z - 0.45], [Math.max(x, ax), y0 + 7.9, z + 0.45], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("hazard", [Math.min(x, ax) + 0.5, y0 + 7.2, z - 0.46], [Math.max(x, ax) - 0.5, y0 + 7.5, z - 0.44], { uv: "world", texel: 1.2 });
  const jx = sx * 8.9;
  kit.boxMM("paintedMetal", [jx - 0.5, y0 + 5.3, z - 1.0], [jx + 0.5, y0 + 7.0, z + 1.0], { color: P.darkMetal, uv: "world", texel: 0.8 });
  kit.boxMM("rubber", [sx > 0 ? jx - 0.62 : jx + 0.5, y0 + 5.4, z - 0.9], [sx > 0 ? jx - 0.5 : jx + 0.62, y0 + 6.9, z + 0.9], { color: P.rubber });
  kit.box("emitBlue", jx, y0 + 5.26, z, 0.9, 0.08, 1.8);
  // hydraulic rams from the tower head down to the arm
  for (const dz of [-0.3, 0.3]) {
    const dx = sx * 10.5 - x;
    const dyy = (y0 + 7.9) - (y0 + 9.0);
    const L = Math.hypot(dx, dyy);
    kit.add("metal", new THREE.CylinderGeometry(0.1, 0.1, L, 8), { pos: [(x + sx * 10.5) / 2, y0 + 8.45, z + dz], rot: [0, 0, -Math.atan2(dx, dyy)], color: P.steel, uv: "scale", uvScale: [1, 4] });
  }
  kit.box("paintedMetal", x, y0 + 8.6, z, 1.6, 1.2, 1.6, { color: P.gunmetal, texel: 1 });
  kit.box("emitAmber", x + sx * 0.81, y0 + 8.6, z, 0.02, 0.2, 0.8);
  // control panel on the base facing the pad
  kit.box("satinBlack", x - sx * 1.42, y0 + 1.5, z, 0.06, 1.2, 1.0);
  kit.box("screen4", x - sx * 1.46, y0 + 1.7, z, 0.01, 0.4, 0.8, { uv: "keep" });
  kit.box("leds", x - sx * 1.46, y0 + 1.3, z, 0.01, 0.05, 0.6, { uv: "keep" });
}

// ---------------------------------------------------------------- umbilical arms: fuel (hose) and power (rigid conduit)
function umbilical(kit, P, sx, z, y0, kind) {
  const x = sx * 20;
  kit.boxMM("paintedMetal", [x - 1.1, y0, z - 0.9], [x + 1.1, y0 + 1.2, z + 0.9], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("hazard", [x - 1.11, y0 + 0.2, z - 0.91], [x + 1.11, y0 + 0.45, z + 0.91], { uv: "world", texel: 1.2 });
  kit.cyl("metal", x, y0 + 3.2, z, 0.38, 4.0, "y", { color: P.slate, segments: 14 });
  kit.cyl("metal", x, y0 + 5.3, z, 0.5, 0.5, "y", { color: P.darkMetal, segments: 14 });
  kit.collider([x - 1.1, y0, z - 0.9], [x + 1.1, y0 + 5.6, z + 0.9], "umbilical");
  // boom toward the pad with an elbow block at its end
  const bx = sx * 13.6;
  kit.boxMM("paintedMetal", [Math.min(x, bx), y0 + 4.95, z - 0.25], [Math.max(x, bx), y0 + 5.45, z + 0.25], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.box("metal", bx, y0 + 4.75, z, 0.6, 1.0, 0.6, { color: P.darkMetal });
  kit.box("emitAmber", bx, y0 + 5.0, z + 0.31, 0.2, 0.1, 0.02);
  if (kind === "fuel") {
    const hx = bx - sx * 1.2;
    const pts = [new THREE.Vector3(bx, y0 + 4.3, z), new THREE.Vector3(bx - sx * 0.3, y0 + 3.5, z + 0.35), new THREE.Vector3(hx, y0 + 2.95, z)];
    kit.add("rubber", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5), 10, 0.09, 8, false), { color: P.rubber, uv: "scale", uvScale: [1, 6] });
    kit.cyl("metal", hx, y0 + 2.55, z, 0.22, 0.7, "y", { color: P.steel, segments: 12 });
    kit.cyl("hazard", hx, y0 + 2.3, z, 0.24, 0.16, "y", { segments: 12, uv: "world", texel: 1 });
    kit.box("emitAmber", hx, y0 + 2.85, z + 0.2, 0.1, 0.1, 0.1);
    // fuel line along the boom and up the column
    kit.cyl("metal", (x + bx) / 2, y0 + 5.6, z, 0.12, Math.abs(bx - x), "x", { color: P.orange, segments: 8 });
  } else {
    const px = bx - sx * 0.5;
    kit.cyl("metal", px, y0 + 3.6, z, 0.16, 1.5, "y", { color: P.gunmetal, segments: 10 });
    kit.box("satinBlack", px, y0 + 2.6, z, 0.7, 0.5, 0.7);
    kit.box("emitBlue", px, y0 + 2.34, z, 0.5, 0.03, 0.5);
    for (const dz of [-0.12, 0.12]) kit.cyl("metal", (x + bx) / 2, y0 + 5.6, z + dz, 0.07, Math.abs(bx - x), "x", { color: P.steel, segments: 8 });
  }
  // pedestal panel and deck warning stencil
  kit.box("satinBlack", x - sx * 1.12, y0 + 0.9, z, 0.06, 0.5, 0.7);
  kit.box(kind === "fuel" ? "screen6" : "screen4", x - sx * 1.16, y0 + 0.95, z, 0.01, 0.3, 0.5, { uv: "keep" });
  deckDecal(kit, x - sx * 2.4, y0, z, 1.4, 5, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
}

// ---------------------------------------------------------------- elevated control booth on the forward wall
function booth(kit, ctx, lib, y0, z0) {
  const P = lib.PALETTE;
  const bx0 = 12;
  const bx1 = 21;
  const bz0 = z0 + 0.2;
  const bz1 = z0 + 4.8;
  const fy = y0 + 4.0;
  const roofY = fy + 3.0;
  const par = 1.1;
  for (const [px, pz] of [[bx0 + 0.3, bz1 - 0.3], [bx1 - 0.3, bz1 - 0.3], [bx0 + 0.3, bz0 + 0.3], [bx1 - 0.3, bz0 + 0.3]]) {
    kit.boxMM("paintedMetal", [px - 0.3, y0, pz - 0.3], [px + 0.3, fy, pz + 0.3], { color: P.darkMetal, uv: "world", texel: 0.8 });
    kit.collider([px - 0.3, y0, pz - 0.3], [px + 0.3, fy, pz + 0.3], "boothColumn");
  }
  // storage alcove underneath
  for (let i = 0; i < 3; i++) cabinet(kit, propFrame(kit, bx0 + 1.6 + i * 1.4, y0, bz0 + 0.32, 0), { screen: i === 1 ? "screen6" : null, color: i === 2 ? P.slate : P.impGreyDark });
  crate(kit, propFrame(kit, bx1 - 1.6, y0, bz0 + 1.2, 0.2), { decal: 9 });
  kit.box("satinBlack", (bx0 + bx1) / 2, fy - 0.45, (bz0 + bz1) / 2, 0.5, 0.15, 3.2);
  kit.box("emitWhiteSoft", (bx0 + bx1) / 2, fy - 0.53, (bz0 + bz1) / 2, 0.4, 0.02, 3.0, { uv: "keep" });
  // floor
  kit.boxMM("paintedMetal", [bx0, fy - 0.3, bz0], [bx1, fy, bz1], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("deck", [bx0 + 0.1, fy, bz0 + 0.1], [bx1 - 0.1, fy + 0.012, bz1 - 0.1], { color: P.impGreyDark, uv: "world", texel: 1 });
  kit.floor(bx0, bz0, bx1, bz1, fy);
  // walls: glass front (+z) and port side (-x); the +x side is glass beyond the stair doorway (z bz0..bz0+1.7)
  const glazed = (a, b, alongX) => {
    kit.boxMM("painted1", [a[0], fy, a[1]], [b[0], fy + par, b[1]], { color: P.impGreyDark, uv: "world", texel: 1 });
    kit.boxMM("satinBlack", [a[0] - 0.02, fy + par, a[1] - 0.02], [b[0] + 0.02, fy + par + 0.08, b[1] + 0.02]);
    kit.boxMM("glass", [a[0] + 0.09, fy + par + 0.08, a[1] + 0.09], [b[0] - 0.09, roofY, b[1] - 0.09], { uv: "keep" });
    const len = alongX ? b[0] - a[0] : b[1] - a[1];
    const n = Math.max(1, Math.round(len / 2.1));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (alongX) kit.boxMM("satinBlack", [a[0] + len * t - 0.05, fy + par, a[1]], [a[0] + len * t + 0.05, roofY, b[1]]);
      else kit.boxMM("satinBlack", [a[0], fy + par, a[1] + len * t - 0.05], [b[0], roofY, a[1] + len * t + 0.05]);
    }
    kit.collider([a[0], fy, a[1]], [b[0], roofY, b[1]], "boothWall");
  };
  glazed([bx0, bz1 - 0.1], [bx1, bz1 + 0.1], true);
  glazed([bx0 - 0.1, bz0], [bx0 + 0.1, bz1], false);
  glazed([bx1 - 0.1, bz0 + 1.7], [bx1 + 0.1, bz1], false);
  // door frame posts at the stair doorway
  kit.boxMM("satinBlack", [bx1 - 0.12, fy, bz0 + 1.62], [bx1 + 0.12, roofY, bz0 + 1.7]);
  kit.boxMM("satinBlack", [bx1 - 0.12, fy + 2.3, bz0], [bx1 + 0.12, roofY, bz0 + 1.7]);
  kit.collider([bx1 - 0.12, fy + 2.3, bz0], [bx1 + 0.12, roofY, bz0 + 1.7], "boothWall");
  // roof with blue edge lights and a soft ceiling panel
  kit.boxMM("paintedMetal", [bx0 - 0.5, roofY, bz0 - 0.2], [bx1 + 0.5, roofY + 0.3, bz1 + 0.5], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("emitBlue", [bx0 - 0.45, roofY + 0.1, bz1 + 0.5], [bx1 + 0.45, roofY + 0.18, bz1 + 0.52], { uv: "keep" });
  kit.boxMM("emitBlue", [bx0 - 0.52, roofY + 0.1, bz0], [bx0 - 0.5, roofY + 0.18, bz1 + 0.45], { uv: "keep" });
  kit.boxMM("satinBlack", [bx0 + 0.8, roofY - 0.12, bz0 + 0.8], [bx1 - 0.8, roofY, bz1 - 0.8]);
  kit.boxMM("emitWhiteSoft", [bx0 + 1.0, roofY - 0.14, bz0 + 1.0], [bx1 - 1.0, roofY - 0.12, bz1 - 1.0], { uv: "keep" });
  // consoles facing the pad, seats, screen bank on the back wall
  for (const x of [13.6, 15.4, 17.2, 19.0]) pedestalConsole(kit, propFrame(kit, x, fy, bz1 - 0.95, Math.PI), x < 16 ? "screen4" : "screen6", { w: 1.6 });
  for (const x of [13.6, 15.4, 17.2, 19.0]) {
    kit.box("satinBlack", x, fy + 0.5, bz1 - 1.9, 0.5, 0.1, 0.5);
    kit.box("satinBlack", x, fy + 0.3, bz1 - 1.9, 0.12, 0.4, 0.12);
    kit.box("satinBlack", x, fy + 0.8, bz1 - 2.12, 0.5, 0.5, 0.08);
  }
  kit.box("satinBlack", 16.3, fy + 1.9, bz0 + 0.03, 6.0, 1.2, 0.06);
  kit.box("screen4", 14.9, fy + 1.9, bz0 + 0.065, 2.6, 1.0, 0.01, { uv: "keep" });
  kit.box("screen6", 17.7, fy + 1.9, bz0 + 0.065, 2.6, 1.0, 0.01, { uv: "keep" });
  cabinet(kit, propFrame(kit, bx0 + 0.42, fy, bz0 + 1.6, Math.PI / 2), { w: 1.4, h: 2.4, d: 0.6, screen: "screen6" });
  ctx.lights.warm.push(lib.pointLight(0xfff0dd, 8, 9, [16.5, roofY - 0.4, bz0 + 2.4]));
  // stair from the deck up to the doorway (climbs toward -x)
  stairRun(kit, bx1, bz0 + 0.1, bx1 + 5.6, bz0 + 1.6, fy, y0, "x");
  hazardBand(kit, bx1 + 5.6, bz0 + 0.1, bx1 + 6.4, bz0 + 1.6, y0);
  deckDecal(kit, bx1 + 2.8, y0, bz0 + 3.0, 1.4, 1, Math.PI / 2);
}

// ---------------------------------------------------------------- service catwalk along the port wall + stair tower
function catwalk(kit, ctx, lib, room, y0) {
  const P = lib.PALETTE;
  const { x0, z0, z1 } = room;
  const cy = y0 + CAT_H;
  const xa = x0 + 0.16;
  const xb = -24.5;
  const za = z0 + 1.0;
  const zb = z1 - 1.0;
  kit.boxMM("paintedMetal", [xa, cy - 0.25, za], [xb, cy - 0.03, zb], { color: P.darkMetal, uv: "world", texel: 0.8 });
  grateFloor(kit, xa + 0.05, za + 0.05, xb - 0.05, zb - 0.05, cy - 0.005);
  for (const x of [xa + 0.1, xb - 0.1]) kit.boxMM("metal", [x - 0.08, cy - 0.02, za], [x + 0.08, cy + 0.03, zb], { color: P.gunmetal, uv: "world", texel: 1 });
  for (let z = za + 2; z < zb; z += 4) kit.boxMM("paintedMetal", [xa, cy - 0.5, z - 0.12], [xb, cy - 0.25, z + 0.12], { color: P.gunmetal, texel: 1 });
  kit.floor(xa, za, xb, zb, cy);
  // stair tower inboard of the catwalk at the aft end, exiting sideways onto it
  const tower = { x0: -24.4, x1: -21.8, z0: 400, z1: 407.2 };
  railing(kit, xb, za, xb, tower.z0, cy, { postEvery: 2.2, tag: "catwalkRail" });
  railing(kit, xb, tower.z1, xb, zb, cy, { postEvery: 2.2, tag: "catwalkRail" });
  railing(kit, xa, za, xb, za, cy, { postEvery: 2.2, tag: "catwalkRail" });
  railing(kit, xa, zb, xb, zb, cy, { postEvery: 2.2, tag: "catwalkRail" });
  stairTower(kit, { ...tower, yBottom: y0, yTop: cy, entry: "-z", exit: "x0", light: (x, y, z) => ctx.lights.cool.push(lib.pointLight(0xdfe8ff, 10, 12, [x, y, z])) });
  deckDecal(kit, (tower.x0 + tower.x1) / 2, y0, tower.z0 - 0.9, 1.4, 1, Math.PI);
  // wall brackets and floods under the catwalk
  for (let z = za + 2; z < zb; z += 8) kit.boxMM("paintedMetal", [xa, cy - 1.0, z - 0.2], [xb - 0.3, cy - 0.25, z + 0.2], { color: P.darkMetal, texel: 0.8 });
  for (let z = 358; z <= 402; z += 22) {
    kit.box("satinBlack", -26.2, cy - 0.5, z, 2.0, 0.2, 0.7);
    kit.box("emitWhiteSoft", -26.2, cy - 0.61, z, 1.8, 0.02, 0.5, { uv: "keep" });
  }
  // consoles and cabinets along the catwalk wall
  for (const z of [366, 380, 394]) pedestalConsole(kit, propFrame(kit, -25.4, cy, z, -Math.PI / 2), z === 380 ? "screen4" : "screen6", { w: 1.4 });
  for (const z of [372, 388]) cabinet(kit, propFrame(kit, x0 + 0.48, cy, z, Math.PI / 2), { w: 1.2, h: 2.0, d: 0.6, screen: null, color: P.slate });
}

// ---------------------------------------------------------------- ceiling: light banks, ducts, pipe runs
function ceiling(kit, P, room, yTop) {
  const { x0, x1, z0, z1 } = room;
  for (const z of [368, 380, 392]) lightBank(kit, 0, yTop, z, 12, 1.6);
  for (const sx of [-1, 1]) for (const z of [360, 400]) lightBank(kit, sx * 16, yTop, z, 6, 1.2);
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [s * 24 - 0.7, yTop - 1.6, z0], [s * 24 + 0.7, yTop - 0.4, z1], { color: P.slate, uv: "world", texel: 0.6 });
    pipeRun(kit, s * 26.4, yTop - 1.0, (z0 + z1) / 2, z1 - z0, "z", 0.2, P.steel, 8);
    pipeRun(kit, s * 26.4, yTop - 1.6, (z0 + z1) / 2, z1 - z0, "z", 0.12, P.orange, 8);
  }
  pipeRun(kit, 0, yTop - 0.8, z0 + 4, x1 - x0, "x", 0.18, P.steel, 8);
  pipeRun(kit, 0, yTop - 0.8, z1 - 4, x1 - x0, "x", 0.18, P.gunmetal, 8);
  // transverse roof trusses
  for (const z of [362, 374, 386, 398]) {
    kit.boxMM("paintedMetal", [-22.5, yTop - 1.4, z - 0.5], [22.5, yTop - 0.1, z + 0.5], { color: P.darkMetal, uv: "world", texel: 0.6 });
    for (let x = -21; x < 22; x += 6) kit.box("metal", x, yTop - 0.75, z, 0.2, 1.1, 1.1, { color: P.steel, texel: 1.5 });
  }
}

// ---------------------------------------------------------------- deck props: ground gear along the walls
function props(kit, lib, room, y0) {
  const P = lib.PALETTE;
  const { x1, z0, z1 } = room;
  // starboard wall: cabinets, power cart and crates
  for (let i = 0; i < 4; i++) cabinet(kit, propFrame(kit, x1 - 0.32, y0, 366 + i * 1.4, -Math.PI / 2), { screen: i % 2 ? "screen4" : null, color: i > 1 ? P.slate : P.impGreyDark });
  for (let i = 0; i < 3; i++) crate(kit, propFrame(kit, x1 - 1.2, y0, 388 + i * 1.3, 0.1 * i), { decal: [11, 6, 9][i] });
  crate(kit, propFrame(kit, x1 - 1.2, y0 + 0.8, 389.3, 0.15), { decal: 5, h: 0.7 });
  toolCart(kit, propFrame(kit, x1 - 2.4, y0, 384, Math.PI / 2 + 0.3));
  toolCart(kit, propFrame(kit, -21, y0, 358, 0.4));
  // forward wall under the catwalk end: pedestal consoles by the door lane and the pad
  pedestalConsole(kit, propFrame(kit, -8, y0, 401, Math.PI), "screen4", { w: 1.4 });
  pedestalConsole(kit, propFrame(kit, 8, y0, 401, Math.PI), "screen6", { w: 1.4 });
  // ground power drums and chocks
  for (let i = 0; i < 4; i++) {
    const dx = -18 + (i % 2) * 1.1;
    const dz = 402 + Math.floor(i / 2) * 1.1;
    kit.cyl("painted2", dx, y0 + 0.6, dz, 0.45, 1.2, "y", { color: i % 2 ? P.impGreyDark : P.orange, segments: 14, uv: "world", texel: 1 });
  }
  kit.collider([-18.6, y0, 401.4], [-16.3, y0 + 1.25, 403.7], "drums");
  lib.wallLightBar(propFrame(kit, x1 - 0.02, y0, 380, -Math.PI / 2), -26, 26, 2.9);
  lib.wallLightBar(propFrame(kit, 0, y0, z0 + 0.02, 0), -27, -11, 2.9);
  lib.wallLightBar(propFrame(kit, 0, y0, z1 - 0.02, Math.PI), -27, -5, 2.9);
  lib.wallLightBar(propFrame(kit, 0, y0, z1 - 0.02, Math.PI), 5, 27, 2.9);
}

// ---------------------------------------------------------------- lighting: cool floods, blue accents, amber practicals
function lights(ctx, lib, y0, yTop) {
  const cool = (i, d, p, c = 0xdfe8ff) => ctx.lights.cool.push(lib.pointLight(c, i, d, p));
  // (inverse-square: ~21 m from the ceiling to the deck)
  for (const sx of [-1, 1]) for (const z of [362, 380, 398]) cool(520, 70, [sx * 13, yTop - 1.2, z]);
  cool(300, 50, [0, yTop - 1.2, 356]);
  cool(300, 50, [0, yTop - 1.2, 404]);
  // blue accents at the clamp jaws and low over the belly door
  for (const sx of [-1, 1]) for (const z of [365.5, 394.5]) ctx.lights.teal.push(lib.pointLight(0x66b6ff, 110, 32, [sx * 9.5, y0 + 6.5, z]));
  ctx.lights.teal.push(lib.pointLight(0x66b6ff, 130, 36, [0, y0 + 2.5, 380]));
  // catwalk and umbilical practicals
  for (const z of [366, 394]) cool(60, 20, [-26.2, y0 + CAT_H + 2.4, z], 0xe8f0ff);
  for (const sx of [-1, 1]) ctx.lights.warm.push(lib.pointLight(0xffb347, 50, 18, [sx * 16, y0 + 4.5, 380]));
}
