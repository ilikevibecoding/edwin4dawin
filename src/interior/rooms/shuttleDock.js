// Shuttle docking bay (x -28..28, z 350..409.5, h 22): a kit-bashed folded-wing shuttle stands on the sealed
// belly door in the middle of the pad, nose toward the hangar blast door, held by four deck clamps gripping the
// lower hull outside the wing roots; ground crew kit (bowser, ladder, carts, console) around the open boarding
// ramp. The belly door is recessed into the deck under the pad (two leaves, hazard chevrons, blue edge lights,
// a pulsing seal strip; it never opens). Flood masts at the pad corners, fuel and power umbilical arms on
// pedestals, an elevated glass control booth and a big traffic display on the forward wall, a service catwalk
// along the port wall reached by a stair tower, blue accent lighting. The blast door to the hangar is in the
// +z wall.
import * as THREE from "three";
import { Kit } from "../../kit.js";
import { roomFloorY } from "../../config/shipSpec.js";
import {
  propFrame, railing, deckStrip, hazardBand, deckDecal, bayWalls, crate, toolCart, pedestalConsole, shadowCasters,
  cabinet, compactBank, lightBar, pipeRun, stairTower, stairRun, beacons, bayCeiling, shuttleShape, SHUTTLE, fuelBowser,
  ladder, doorSurround, displayWall, ensureLabels, ensureDiffuser, deckLabel, cableTray, BLACK,
} from "../../hangar/machinery.js";

const CAT_H = 8; // catwalk height above the deck
const DOOR = { x0: -10, x1: 10, z0: 364, z1: 396 }; // sealed belly door
const RECESS = 0.15;
const SHIP = { x: 0, z: 380 }; // shuttle hull centre on the pad, nose toward +z (the hangar door)

export function build(kit, ctx, room, lib) {
  const P = lib.PALETTE;
  const mats = ctx.materials;
  const { z0 } = room;
  const y0 = roomFloorY(room);
  const yTop = y0 + room.height;
  const T = lib.WALL_T;
  ensureLabels(mats);
  ensureDiffuser(mats);
  const shell = lib.roomShell(kit, ctx, room, { style: "dark", floor: false, ceiling: false, lights: false, skipWalls: ["-z", "+z", "-x", "+x"] });
  // light strip row 5.4..11.6 puts a wall light above the catwalk; no kick strip (keeps rubber out of the room)
  bayWalls(kit, room, shell, y0, { rows: [2.4, 5.4, 11.6, 16.8, room.height], lightRow: 1, kick: false, lampMat: "emitBlue", seed: 71, rowStyles: ["bays", null, "plate", "vent"] });
  bayCeiling(kit, room, y0, { rows: 3 });
  shadowCasters(kit, ["paintedMetal"]);
  doorSurround(kit, room, room.doors[0], y0, { label: 0, labelW: 5 });

  deck(kit, P, room, y0, T);
  bellyDoor(kit, ctx, mats, P, y0);
  padMarkings(kit, P, y0);
  const dy = y0 - RECESS;
  shuttleShape(kit, propFrame(kit, SHIP.x, dy, SHIP.z, 0), { hull: P.impGreyDark, fin: P.darkMetal, trim: P.slate });
  for (const sx of [-1, 1]) {
    deckClamp(kit, P, sx, SHIP.z + (SHUTTLE.hullN[0] + SHUTTLE.wingN[0]) / 2, (SHUTTLE.wingN[0] - SHUTTLE.hullN[0]) / 2 - 0.25, dy);
    deckClamp(kit, P, sx, SHIP.z + (SHUTTLE.wingN[1] + SHUTTLE.hullN[1]) / 2, (SHUTTLE.hullN[1] - SHUTTLE.wingN[1]) / 2 - 0.25, dy);
  }
  crewKit(kit, P, y0, dy);
  for (const sx of [-1, 1]) for (const z of [365.5, 394.5]) floodMast(kit, P, sx, z, y0);
  umbilical(kit, P, -1, 380, y0, "fuel");
  umbilical(kit, P, 1, 380, y0, "power");
  booth(kit, ctx, lib, y0, z0);
  displayWall(shell.frames["-z"].frame, 14, 7.6, 8.0, 3.4, ["screen7", "screen9", "screen10", "screen8"], 19, { cols: 2, lamp: "emitBlue" });
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
  // approach lane from the hangar door to the pad: painted edges, white centre dashes, bay stencil
  for (const sx of [-1, 1]) kit.boxMM("painted", [sx * 4.2 - 0.08, y0, DOOR.z1 + 4], [sx * 4.2 + 0.08, y0 + 0.008, z1 - 2.6], { color: P.impWhite, uv: "keep" });
  // (the dashes stop short of the bay stencil at z1 - 5.2)
  for (let z = DOOR.z1 + 3; z < z1 - 7; z += 3) deckStrip(kit, "emitWhiteSoft", -0.15, z, 0.15, z + 1.4, y0);
  deckLabel(kit, 0, y0, z1 - 5.2, 6, 2, 0);
}

// ---------------------------------------------------------------- sealed belly door: recessed leaves, chevrons, edge lights
function bellyDoor(kit, ctx, mats, P, y0) {
  const D = DOOR;
  const dy = y0 - RECESS;
  kit.boxMM("paintedMetal", [D.x0, dy - 0.3, D.z0], [D.x1, dy, D.z1], { color: P.darkMetal, uv: "world", texel: 0.8 });
  kit.floor(D.x0, D.z0, D.x1, D.z1, dy);
  // seam between the two leaves, leaf ribs and locking dogs
  kit.boxMM(BLACK, [-0.08, dy, D.z0], [0.08, dy + 0.012, D.z1]);
  for (let z = D.z0 + 4; z < D.z1 - 1; z += 4) kit.boxMM("paintedMetal", [D.x0 + 0.3, dy, z - 0.1], [D.x1 - 0.3, dy + 0.02, z + 0.1], { color: P.gunmetal, texel: 1 });
  for (const sx of [-1, 1]) kit.boxMM("paintedMetal", [sx * 5 - 0.1, dy, D.z0 + 0.3], [sx * 5 + 0.1, dy + 0.02, D.z1 - 0.3], { color: P.gunmetal, texel: 1 });
  for (let z = D.z0 + 2; z < D.z1; z += 4) for (const sx of [-1, 1]) {
    kit.box("metal", sx * 0.45, dy + 0.03, z, 0.5, 0.06, 0.9, { color: P.steel });
    kit.box("emitBlue", sx * 0.45, dy + 0.062, z, 0.12, 0.006, 0.5);
  }
  // hazard chevrons around the recess at deck level and NO STEP / EMERGENCY stencils
  hazardBand(kit, D.x0 - 0.8, D.z0 - 0.8, D.x0, D.z1 + 0.8, y0);
  hazardBand(kit, D.x1, D.z0 - 0.8, D.x1 + 0.8, D.z1 + 0.8, y0);
  hazardBand(kit, D.x0, D.z0 - 0.8, D.x1, D.z0, y0);
  hazardBand(kit, D.x0, D.z1, D.x1, D.z1 + 0.8, y0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) deckDecal(kit, sx * 7.5, dy, 380 + sz * 13.5, 2.0, 13, sz > 0 ? Math.PI : 0);
  for (const sx of [-1, 1]) for (const [sz, z] of [[-1, D.z0 - 1.8], [1, D.z1 + 1.8]]) deckDecal(kit, sx * 8.6, y0, z, 1.4, 7, sz > 0 ? Math.PI : 0);
  // blue edge lights flush in the deck along the chevron band
  for (let z = D.z0 - 0.4; z <= D.z1 + 0.4; z += 3.2) for (const x of [D.x0 - 1.1, D.x1 + 1.1]) kit.box("emitBlue", x, y0 + 0.004, z, 0.36, 0.01, 0.16);
  for (let x = D.x0 + 1.6; x < D.x1; x += 3.2) for (const z of [D.z0 - 1.1, D.z1 + 1.1]) kit.box("emitBlue", x, y0 + 0.004, z, 0.16, 0.01, 0.36);
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

// ---------------------------------------------------------------- landing pad markings (painted, not lit: the blue edge lights carry the pad)
function padMarkings(kit, P, y0) {
  const D = DOOR;
  const dy = y0 - RECESS;
  const px0 = D.x0 - 2.4;
  const px1 = D.x1 + 2.4;
  const pz0 = D.z0 - 2.4;
  const pz1 = D.z1 + 2.4;
  const white = (a, b, c, d, y) => kit.boxMM("painted", [Math.min(a, c), y, Math.min(b, d)], [Math.max(a, c), y + 0.008, Math.max(b, d)], { color: P.impWhite, uv: "keep" });
  white(px0 - 0.08, pz0, px0 + 0.08, pz1, y0);
  white(px1 - 0.08, pz0, px1 + 0.08, pz1, y0);
  white(px0, pz0 - 0.08, px1, pz0 + 0.08, y0);
  white(px0, pz1 - 0.08, px1, pz1 + 0.08, y0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx > 0 ? px1 + 1.0 : px0 - 1.0;
    const cz = sz > 0 ? pz1 + 1.0 : pz0 - 1.0;
    deckStrip(kit, "emitBlue", cx - (sx > 0 ? 0.3 : 0), Math.min(cz, cz - sz * 2.6), cx + (sx > 0 ? 0 : 0.3), Math.max(cz, cz - sz * 2.6), y0);
    deckStrip(kit, "emitBlue", Math.min(cx, cx - sx * 2.6), cz - (sz > 0 ? 0.3 : 0), Math.max(cx, cx - sx * 2.6), cz + (sz > 0 ? 0 : 0.3), y0);
  }
  // touchdown cross and centre line on the door leaves (under the parked shuttle)
  white(-4.5, 380 - 0.15, 4.5, 380 + 0.15, dy);
  white(-0.15, 374, 0.15, 386, dy);
  for (const z of [370, 390]) white(-2.5, z - 0.12, 2.5, z + 0.12, dy);
  // pad number and hatch code
  deckDecal(kit, -16.5, y0, 380, 3.6, 2, Math.PI / 2);
  deckDecal(kit, 16.5, y0, 380, 3.6, 2, -Math.PI / 2);
  deckDecal(kit, 0, y0, D.z0 - 4.6, 2.4, 3, 0);
  deckDecal(kit, 0, y0, D.z1 + 4.6, 2.4, 3, Math.PI);
}

// ---------------------------------------------------------------- deck clamps gripping the lower hull sides outside the wing roots
function deckClamp(kit, P, sx, z, halfLen, y) {
  const x = sx * 4.4; // column centre
  const hx = SHUTTLE.hullHalfW; // hull side the jaw presses
  const jy = y + SHUTTLE.gear + 0.9; // lower hull box centre height
  // base with hazard trim, column, head
  kit.boxMM("paintedMetal", [x - 0.9, y, z - 0.9], [x + 0.9, y + 0.7, z + 0.9], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("hazard", [x - 0.91, y + 0.25, z - 0.91], [x + 0.91, y + 0.5, z + 0.91], { uv: "world", texel: 1.2 });
  kit.boxMM("paintedMetal", [x - 0.45, y + 0.7, z - 0.45], [x + 0.45, jy + 1.3, z + 0.45], { color: P.slate, uv: "world", texel: 0.8 });
  kit.box("paintedMetal", x, jy + 1.45, z, 1.2, 0.3, 1.2, { color: P.gunmetal, texel: 1 });
  // arm to the jaw, rubber-faced jaw plate on the hull, hazard on the arm top
  const ax0 = Math.min(x, sx * (hx + 0.36));
  const ax1 = Math.max(x, sx * (hx + 0.36));
  kit.boxMM("paintedMetal", [ax0, jy + 0.25, z - 0.4], [ax1, jy + 0.95, z + 0.4], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("hazard", [ax0 + 0.2, jy + 0.95, z - 0.41], [ax1 - 0.2, jy + 0.97, z + 0.41], { uv: "world", texel: 1.2 });
  kit.boxMM("paintedMetal", [Math.min(sx * (hx + 0.06), sx * (hx + 0.36)), jy - 0.7, z - halfLen], [Math.max(sx * (hx + 0.06), sx * (hx + 0.36)), jy + 0.7, z + halfLen], { color: P.darkMetal, uv: "world", texel: 0.8 });
  kit.boxMM(BLACK, [Math.min(sx * hx, sx * (hx + 0.06)), jy - 0.6, z - halfLen + 0.1], [Math.max(sx * hx, sx * (hx + 0.06)), jy + 0.6, z + halfLen - 0.1]);
  kit.box("emitBlue", sx * (hx + 0.21), jy + 0.72, z, 0.3, 0.04, halfLen * 1.4, { uv: "keep" });
  // hydraulic ram from the base up to the arm underside near the jaw
  const r0 = new THREE.Vector3(x - sx * 0.3, y + 0.75, z);
  const r1 = new THREE.Vector3(sx * (hx + 1.0), jy + 0.2, z);
  const L = r0.distanceTo(r1);
  kit.add("metal", new THREE.CylinderGeometry(0.11, 0.11, L, 8), { pos: [(r0.x + r1.x) / 2, (r0.y + r1.y) / 2, z], rot: [0, 0, sx * Math.atan2(Math.abs(r1.x - r0.x), r1.y - r0.y)], color: P.steel, uv: "scale", uvScale: [1, 4] });
  // control panel on the outboard face
  kit.box(BLACK, x + sx * 0.46, y + 1.5, z, 0.04, 0.7, 0.7);
  kit.box("screen6", x + sx * 0.475, y + 1.6, z, 0.01, 0.3, 0.5, { uv: "keep" });
  kit.box("emitBlue", x + sx * 0.475, y + 1.3, z, 0.01, 0.05, 0.4, { uv: "keep" });
  kit.collider([x - 0.9, y, z - 0.9], [x + 0.9, jy + 1.6, z + 0.9], "deckClamp");
  kit.collider([ax0, jy + 0.25, z - 0.4], [ax1, jy + 1.0, z + 0.4], "clampArm");
}

// ---------------------------------------------------------------- ground crew kit around the boarding ramp (port side)
function crewKit(kit, P, y0, dy) {
  // bowser aft of the ramp, rear toward the hull, hose to the sponson fuel point
  fuelBowser(kit, propFrame(kit, -7.6, y0, 371.8, -Math.PI / 2), { hoseTo: [4.5, 0, -4.2] });
  toolCart(kit, propFrame(kit, -6.2, y0, 383.6, 1.2), { lamp: "emitBlue" });
  toolCart(kit, propFrame(kit, -8.4, y0, 378.0, -0.4), { lamp: "emitBlue" });
  crate(kit, propFrame(kit, -7.3, y0, 385.6, 0.2), { decal: 9 });
  crate(kit, propFrame(kit, -7.3, y0 + 0.8, 385.6, 0.35), { decal: 5, h: 0.7 });
  pedestalConsole(kit, propFrame(kit, -6.6, y0, 388.6, Math.PI / 2), "screen7", { w: 1.4, lamp: "emitBlue" });
  // tall rolling ladder at the cockpit on the starboard side, low steps at the ramp foot
  ladder(kit, propFrame(kit, 3.6, dy, 388.4, -Math.PI / 2), { h: 4.6, w: 0.8 });
  kit.box("paintedMetal", -5.4, y0 + 0.12, 381.5, 1.2, 0.24, 1.4, { color: P.slate, texel: 1 });
  kit.box("hazard", -5.4, y0 + 0.25, 381.5, 1.1, 0.02, 1.3, { uv: "world", texel: 1.2 });
  // ground power cart plugged into the port sponson
  const gp = propFrame(kit, -6.9, y0, 375.4, 0.2);
  gp.box("painted1", 0, 0.75, 0, 1.4, 1.1, 0.9, { color: P.impGreyDark, uv: "world", texel: 1 });
  gp.box(BLACK, 0, 0.75, 0.46, 1.2, 0.9, 0.02);
  gp.box("emitBlue", 0.3, 1.0, 0.48, 0.3, 0.06, 0.01, { uv: "keep" });
  gp.box("emitAmber", -0.3, 1.0, 0.48, 0.3, 0.06, 0.01, { uv: "keep" });
  for (const su of [-1, 1]) for (const sn of [-1, 1]) gp.cylU(BLACK, su * 0.6, 0.15, sn * 0.35, 0.15, 0.1, { segments: 10 });
  gp.collider(-0.7, 0.7, 0, 1.4, -0.5, 0.5, "gpu");
  const c0 = gp.pos(0.7, 0.9, 0);
  const c1 = new THREE.Vector3(-2.97, dy + SHUTTLE.gear + 1.3, 376.5);
  const pts = [c0, new THREE.Vector3((c0.x + c1.x) / 2, y0 + 0.1, (c0.z + c1.z) / 2), new THREE.Vector3(c1.x - 0.5, c1.y - 0.6, c1.z), c1];
  kit.add(BLACK, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5), 12, 0.05, 6, false), { uv: "scale", uvScale: [1, 8] });
  // deck stencils by the ramp and the nose
  deckDecal(kit, -6.0, y0, 380.2, 1.4, 5, Math.PI / 2);
  deckDecal(kit, 0, y0, DOOR.z1 + 1.6, 1.6, 7, Math.PI);
}

// ---------------------------------------------------------------- flood masts at the pad corners
function floodMast(kit, P, sx, z, y0) {
  const x = sx * 14.5;
  kit.boxMM("paintedMetal", [x - 1.4, y0, z - 1.4], [x + 1.4, y0 + 0.9, z + 1.4], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("hazard", [x - 1.41, y0 + 0.3, z - 1.41], [x + 1.41, y0 + 0.6, z + 1.41], { uv: "world", texel: 1.2 });
  kit.boxMM("paintedMetal", [x - 0.7, y0 + 0.9, z - 0.7], [x + 0.7, y0 + 8.0, z + 0.7], { color: P.slate, uv: "world", texel: 0.8 });
  for (const s of [-1, 1]) kit.boxMM("metal", [x + s * 0.72 - 0.04, y0 + 1.2, z - 0.4], [x + s * 0.72 + 0.04, y0 + 7.6, z + 0.4], { color: P.darkMetal, texel: 1 });
  kit.collider([x - 1.4, y0, z - 1.4], [x + 1.4, y0 + 8.0, z + 1.4], "floodMast");
  // cantilever arm toward the pad with a flood head at its end (well outside the folded wing tips)
  const ax = sx * 9.4;
  kit.boxMM("paintedMetal", [Math.min(x, ax), y0 + 7.0, z - 0.45], [Math.max(x, ax), y0 + 7.9, z + 0.45], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("hazard", [Math.min(x, ax) + 0.5, y0 + 7.2, z - 0.46], [Math.max(x, ax) - 0.5, y0 + 7.5, z - 0.44], { uv: "world", texel: 1.2 });
  kit.box(BLACK, ax + sx * 0.2, y0 + 6.6, z, 1.6, 0.5, 1.6);
  kit.box("emitWhiteSoft", ax + sx * 0.2, y0 + 6.34, z, 1.3, 0.02, 1.3, { uv: "keep" });
  kit.box("emitBlue", ax - sx * 0.61, y0 + 6.7, z, 0.02, 0.2, 0.8);
  // stays from the tower head down to the arm
  for (const dz of [-0.3, 0.3]) {
    const dx = sx * 8.8 - x;
    const dyy = (y0 + 7.9) - (y0 + 9.0);
    const L = Math.hypot(dx, dyy);
    kit.add("metal", new THREE.CylinderGeometry(0.1, 0.1, L, 8), { pos: [(x + sx * 8.8) / 2, y0 + 8.45, z + dz], rot: [0, 0, -Math.atan2(dx, dyy)], color: P.steel, uv: "scale", uvScale: [1, 4] });
  }
  kit.box("paintedMetal", x, y0 + 8.6, z, 1.6, 1.2, 1.6, { color: P.gunmetal, texel: 1 });
  kit.box("emitBlue", x + sx * 0.81, y0 + 8.6, z, 0.02, 0.2, 0.8);
  // control panel on the base facing the pad
  kit.box(BLACK, x - sx * 1.42, y0 + 1.5, z, 0.06, 1.2, 1.0);
  kit.box("screen6", x - sx * 1.46, y0 + 1.7, z, 0.01, 0.4, 0.8, { uv: "keep" });
  kit.box("emitBlue", x - sx * 1.46, y0 + 1.3, z, 0.01, 0.05, 0.6, { uv: "keep" });
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
  kit.box("emitBlue", bx, y0 + 5.0, z + 0.31, 0.2, 0.1, 0.02);
  if (kind === "fuel") {
    const hx = bx - sx * 1.2;
    const pts = [new THREE.Vector3(bx, y0 + 4.3, z), new THREE.Vector3(bx - sx * 0.3, y0 + 3.5, z + 0.35), new THREE.Vector3(hx, y0 + 2.95, z)];
    kit.add(BLACK, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5), 10, 0.09, 8, false), { uv: "scale", uvScale: [1, 6] });
    kit.cyl("metal", hx, y0 + 2.55, z, 0.22, 0.7, "y", { color: P.steel, segments: 12 });
    kit.cyl("hazard", hx, y0 + 2.3, z, 0.24, 0.16, "y", { segments: 12, uv: "world", texel: 1 });
    kit.box("emitBlue", hx, y0 + 2.85, z + 0.2, 0.1, 0.1, 0.1);
    // fuel line along the boom and up the column
    kit.cyl("metal", (x + bx) / 2, y0 + 5.6, z, 0.12, Math.abs(bx - x), "x", { color: P.orange, segments: 8 });
  } else {
    const px = bx - sx * 0.5;
    kit.cyl("metal", px, y0 + 3.6, z, 0.16, 1.5, "y", { color: P.gunmetal, segments: 10 });
    kit.box(BLACK, px, y0 + 2.6, z, 0.7, 0.5, 0.7);
    kit.box("emitBlue", px, y0 + 2.34, z, 0.5, 0.03, 0.5);
    for (const dz of [-0.12, 0.12]) kit.cyl("metal", (x + bx) / 2, y0 + 5.6, z + dz, 0.07, Math.abs(bx - x), "x", { color: P.steel, segments: 8 });
  }
  // pedestal panel and deck warning stencil
  kit.box(BLACK, x - sx * 1.12, y0 + 0.9, z, 0.06, 0.5, 0.7);
  kit.box("screen6", x - sx * 1.16, y0 + 0.95, z, 0.01, 0.3, 0.5, { uv: "keep" });
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
  for (let i = 0; i < 3; i++) cabinet(kit, propFrame(kit, bx0 + 1.6 + i * 1.4, y0, bz0 + 0.32, 0), { screen: i === 1 ? "screen6" : null, color: i === 2 ? P.slate : P.impGreyDark, lamp: "emitBlue" });
  crate(kit, propFrame(kit, bx1 - 1.6, y0, bz0 + 1.2, 0.2), { decal: 9 });
  kit.box(BLACK, (bx0 + bx1) / 2, fy - 0.45, (bz0 + bz1) / 2, 0.5, 0.15, 3.2);
  kit.box("emitWhiteSoft", (bx0 + bx1) / 2, fy - 0.53, (bz0 + bz1) / 2, 0.4, 0.02, 3.0, { uv: "keep" });
  // floor
  kit.boxMM("paintedMetal", [bx0, fy - 0.3, bz0], [bx1, fy, bz1], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("deck", [bx0 + 0.1, fy, bz0 + 0.1], [bx1 - 0.1, fy + 0.012, bz1 - 0.1], { color: P.impGreyDark, uv: "world", texel: 1 });
  kit.floor(bx0, bz0, bx1, bz1, fy);
  // walls: glass front (+z) and port side (-x); the +x side is glass beyond the stair doorway (z bz0..bz0+1.7)
  const glazed = (a, b, alongX) => {
    kit.boxMM("painted1", [a[0], fy, a[1]], [b[0], fy + par, b[1]], { color: P.impGreyDark, uv: "world", texel: 1 });
    kit.boxMM(BLACK, [a[0] - 0.02, fy + par, a[1] - 0.02], [b[0] + 0.02, fy + par + 0.08, b[1] + 0.02]);
    kit.boxMM("glass", [a[0] + 0.09, fy + par + 0.08, a[1] + 0.09], [b[0] - 0.09, roofY, b[1] - 0.09], { uv: "keep" });
    const len = alongX ? b[0] - a[0] : b[1] - a[1];
    const n = Math.max(1, Math.round(len / 2.1));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (alongX) kit.boxMM(BLACK, [a[0] + len * t - 0.05, fy + par, a[1]], [a[0] + len * t + 0.05, roofY, b[1]]);
      else kit.boxMM(BLACK, [a[0], fy + par, a[1] + len * t - 0.05], [b[0], roofY, a[1] + len * t + 0.05]);
    }
    kit.collider([a[0], fy, a[1]], [b[0], roofY, b[1]], "boothWall");
  };
  glazed([bx0, bz1 - 0.1], [bx1, bz1 + 0.1], true);
  glazed([bx0 - 0.1, bz0], [bx0 + 0.1, bz1], false);
  glazed([bx1 - 0.1, bz0 + 1.7], [bx1 + 0.1, bz1], false);
  // door frame posts at the stair doorway
  kit.boxMM(BLACK, [bx1 - 0.12, fy, bz0 + 1.62], [bx1 + 0.12, roofY, bz0 + 1.7]);
  kit.boxMM(BLACK, [bx1 - 0.12, fy + 2.3, bz0], [bx1 + 0.12, roofY, bz0 + 1.7]);
  kit.collider([bx1 - 0.12, fy + 2.3, bz0], [bx1 + 0.12, roofY, bz0 + 1.7], "boothWall");
  // roof with blue edge lights and a soft ceiling panel
  kit.boxMM("paintedMetal", [bx0 - 0.5, roofY, bz0 - 0.2], [bx1 + 0.5, roofY + 0.3, bz1 + 0.5], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("emitBlue", [bx0 - 0.45, roofY + 0.1, bz1 + 0.5], [bx1 + 0.45, roofY + 0.18, bz1 + 0.52], { uv: "keep" });
  kit.boxMM("emitBlue", [bx0 - 0.52, roofY + 0.1, bz0], [bx0 - 0.5, roofY + 0.18, bz1 + 0.45], { uv: "keep" });
  kit.boxMM(BLACK, [bx0 + 0.8, roofY - 0.12, bz0 + 0.8], [bx1 - 0.8, roofY, bz1 - 0.8]);
  kit.boxMM("emitWhiteSoft", [bx0 + 1.0, roofY - 0.14, bz0 + 1.0], [bx1 - 1.0, roofY - 0.12, bz1 - 1.0], { uv: "keep" });
  // consoles facing the pad, seats, screen bank on the back wall
  for (const x of [13.6, 15.4, 17.2, 19.0]) pedestalConsole(kit, propFrame(kit, x, fy, bz1 - 0.95, Math.PI), "screen6", { w: 1.6, lamp: "emitBlue" });
  for (const x of [13.6, 15.4, 17.2, 19.0]) {
    kit.box(BLACK, x, fy + 0.5, bz1 - 1.9, 0.5, 0.1, 0.5);
    kit.box(BLACK, x, fy + 0.3, bz1 - 1.9, 0.12, 0.4, 0.12);
    kit.box(BLACK, x, fy + 0.8, bz1 - 2.12, 0.5, 0.5, 0.08);
  }
  kit.box(BLACK, 16.3, fy + 1.9, bz0 + 0.03, 6.0, 1.2, 0.06);
  kit.box("screen6", 14.9, fy + 1.9, bz0 + 0.065, 2.6, 1.0, 0.01, { uv: "keep" });
  kit.box("screen6", 17.7, fy + 1.9, bz0 + 0.065, 2.6, 1.0, 0.01, { uv: "keep" });
  cabinet(kit, propFrame(kit, bx0 + 0.42, fy, bz0 + 1.6, Math.PI / 2), { w: 1.4, h: 2.4, d: 0.6, screen: "screen6", lamp: "emitBlue" });
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
  kit.boxMM("metal", [xa + 0.05, cy - 0.03, za + 0.05], [xb - 0.05, cy - 0.005, zb - 0.05], { color: P.darkMetal, uv: "world", texel: 2 });
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
    kit.box(BLACK, -26.2, cy - 0.5, z, 2.0, 0.2, 0.7);
    kit.box("emitWhiteSoft", -26.2, cy - 0.61, z, 1.8, 0.02, 0.5, { uv: "keep" });
  }
  // consoles and cabinets along the catwalk wall
  for (const z of [366, 380, 394]) pedestalConsole(kit, propFrame(kit, -25.4, cy, z, -Math.PI / 2), "screen6", { w: 1.4, lamp: "emitBlue" });
  for (const z of [372, 388]) cabinet(kit, propFrame(kit, x0 + 0.48, cy, z, Math.PI / 2), { w: 1.2, h: 2.0, d: 0.6, screen: null, color: P.slate, lamp: "emitBlue" });
}

// ---------------------------------------------------------------- ceiling: light banks, ducts, pipe runs, trusses
function ceiling(kit, P, room, yTop) {
  const { x0, x1, z0, z1 } = room;
  // compact high-bay fixtures at the eight pooled point lights (see lights): a 600 cd source blows anything
  // within a metre of it white, so the housing is small and its plate flush (a 7 m bank read as a 7 m white
  // slab); z between the bayCeiling ribs (every 3.3 m from z0)
  for (const sx of [-1, 1]) for (const z of [362, 381.4, 398]) compactBank(kit, sx * 13, yTop, z, "emitDiffuser");
  for (const z of [355, 405]) compactBank(kit, 0, yTop, z, "emitDiffuser");
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [s * 24 - 0.7, yTop - 1.6, z0], [s * 24 + 0.7, yTop - 0.4, z1], { color: P.slate, uv: "world", texel: 0.6 });
    pipeRun(kit, s * 26.4, yTop - 1.0, (z0 + z1) / 2, z1 - z0, "z", 0.2, P.steel, 8);
    pipeRun(kit, s * 26.4, yTop - 1.6, (z0 + z1) / 2, z1 - z0, "z", 0.12, P.orange, 8);
    cableTray(kit, s * 20, yTop - 1.9, (z0 + z1) / 2, z1 - z0 - 2, "z", 0.7);
  }
  pipeRun(kit, 0, yTop - 0.8, z0 + 4, x1 - x0, "x", 0.18, P.steel, 8);
  pipeRun(kit, 0, yTop - 0.8, z1 - 4, x1 - x0, "x", 0.18, P.gunmetal, 8);
  // transverse roof trusses (between the light banks)
  for (const z of [357.5, 366.5, 375.5, 384.5, 393.5, 402.5]) {
    kit.boxMM("paintedMetal", [-22.5, yTop - 1.4, z - 0.5], [22.5, yTop - 0.1, z + 0.5], { color: P.darkMetal, uv: "world", texel: 0.6 });
    for (let x = -21; x < 22; x += 6) kit.box("metal", x, yTop - 0.75, z, 0.2, 1.1, 1.1, { color: P.steel, texel: 1.5 });
  }
}

// ---------------------------------------------------------------- deck props: ground gear along the walls
function props(kit, lib, room, y0) {
  const P = lib.PALETTE;
  const { x1, z0, z1 } = room;
  // starboard wall: cabinets, power cart and crates
  for (let i = 0; i < 4; i++) cabinet(kit, propFrame(kit, x1 - 0.32, y0, 366 + i * 1.4, -Math.PI / 2), { screen: i % 2 ? "screen6" : null, color: i > 1 ? P.slate : P.impGreyDark, lamp: "emitBlue" });
  for (let i = 0; i < 3; i++) crate(kit, propFrame(kit, x1 - 1.2, y0, 388 + i * 1.3, 0.1 * i), { decal: [11, 6, 9][i] });
  crate(kit, propFrame(kit, x1 - 1.2, y0 + 0.8, 389.3, 0.15), { decal: 5, h: 0.7 });
  toolCart(kit, propFrame(kit, x1 - 2.4, y0, 384, Math.PI / 2 + 0.3), { lamp: "emitBlue" });
  toolCart(kit, propFrame(kit, -21, y0, 358, 0.4), { lamp: "emitBlue" });
  // forward wall under the catwalk end: pedestal consoles by the door lane and the pad
  pedestalConsole(kit, propFrame(kit, -8, y0, 401, Math.PI), "screen6", { w: 1.4, lamp: "emitBlue" });
  pedestalConsole(kit, propFrame(kit, 8, y0, 401, Math.PI), "screen6", { w: 1.4, lamp: "emitBlue" });
  // ground power drums and chocks
  for (let i = 0; i < 4; i++) {
    const dx = -18 + (i % 2) * 1.1;
    const dz = 402 + Math.floor(i / 2) * 1.1;
    kit.cyl("painted2", dx, y0 + 0.6, dz, 0.45, 1.2, "y", { color: i % 2 ? P.impGreyDark : P.orange, segments: 14, uv: "world", texel: 1 });
  }
  kit.collider([-18.6, y0, 401.4], [-16.3, y0 + 1.25, 403.7], "drums");
  lightBar(propFrame(kit, x1 - 0.02, y0, 380, -Math.PI / 2), -26, 26, 2.9);
  lightBar(propFrame(kit, 0, y0, z0 + 0.02, 0), -27, -11, 2.9);
  lightBar(propFrame(kit, 0, y0, z1 - 0.02, Math.PI), -27, -6, 2.9);
  lightBar(propFrame(kit, 0, y0, z1 - 0.02, Math.PI), 6, 27, 2.9);
}

// ---------------------------------------------------------------- lighting: cool floods, blue accents, amber practicals
function lights(ctx, lib, y0, yTop) {
  const cool = (i, d, p, c = 0xdfe8ff) => ctx.lights.cool.push(lib.pointLight(c, i, d, p));
  // (inverse-square: 22 m from the ceiling to the deck). The lights sit in the ceiling plane inside the recessed
  // bank housings: hung 1.2 m under the plate they lit it into four blown white halos
  for (const sx of [-1, 1]) for (const z of [362, 381.4, 398]) cool(600, 70, [sx * 13, yTop + 0.04, z]);
  cool(360, 50, [0, yTop + 0.04, 355]);
  cool(360, 50, [0, yTop + 0.04, 405]);
  // flood-mast heads light the pad ends, blue accents under the hull and at the nose
  for (const sx of [-1, 1]) for (const z of [365.5, 394.5]) cool(140, 30, [sx * 9.4, y0 + 6.2, z], 0xe8f0ff);
  // (the nose accent stands on the deck 3 m ahead of the nose tip: at 60 cd 0.7 m off the tip it blew the
  // nose faces white; under the hull the glow is what lights the gear and the pad between the struts)
  ctx.lights.teal.push(lib.pointLight(0x66b6ff, 80, 30, [0, y0 + 1.0, 380]));
  ctx.lights.teal.push(lib.pointLight(0x66b6ff, 24, 16, [0, y0 + 0.5, 394.5]));
  // catwalk and umbilical practicals, warm light at the crew kit by the ramp
  for (const z of [366, 394]) cool(60, 20, [-26.2, y0 + CAT_H + 2.4, z], 0xe8f0ff);
  for (const sx of [-1, 1]) ctx.lights.warm.push(lib.pointLight(0xffb347, 50, 18, [sx * 16, y0 + 4.5, 380]));
  ctx.lights.warm.push(lib.pointLight(0xffc880, 30, 14, [-6.5, y0 + 3.5, 382]));
  // shadowed spot from the forward-starboard mast onto the shuttle nose and the ramp side
  const sp = new THREE.SpotLight(0xe8f0ff, 900 * lib.LIGHT_SCALE, 40, 0.55, 0.5, 1.8);
  sp.position.set(12, yTop - 1.5, 398);
  sp.target.position.set(-1, y0, 382);
  sp.shadow.camera.near = 2;
  sp.shadow.camera.far = 42;
  sp.shadow.bias = -0.0004;
  sp.shadow.normalBias = 0.05;
  ctx.lights.spots.push(sp);
}
