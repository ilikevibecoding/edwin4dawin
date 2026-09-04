// Shuttle docking bay (x -28..28, z 350..409.5, h 22): a kit-bashed folded-wing shuttle (the machinery.js
// shuttle at 1.5x: 28 m nose to tail, 17 m to the wing tips) stands on the sealed belly door in the middle of
// the pad, nose toward the hangar blast door, held by four deck clamps gripping the lower hull outside the
// wing roots; ground crew kit (power cart, carts, console) around the lit starboard boarding ramp, a wheeled
// boarding stair up to the lit starboard crew hatch ahead of it with a pallet, crates and a hose reel beside
// it, a tall ladder at the cockpit, the bowser hosed to the port fuel point. The belly door is recessed into
// the deck under the pad (two leaves, hazard chevrons, blue edge lights, a pulsing seal strip; it never opens).
// Flood masts at the pad corners, fuel and power umbilical arms on pedestals, an elevated glass control booth
// and a big traffic display on the forward wall, equipment bays (suit lockers, tool and parts stores) and a
// pad status board along the side walls, a service catwalk along the port wall (with the pad's shadow spot on
// its railing) reached by stair towers at both ends, blue accent lighting. The blast door to the hangar is in
// the +z wall.
import * as THREE from "three";
import { Kit } from "../../kit.js";
import { roomFloorY } from "../../config/shipSpec.js";
import {
  propFrame, railing, deckStrip, hazardBand, deckDecal, bayWalls, crate, toolCart, pedestalConsole, shadowCasters,
  cabinet, compactBank, lightBar, pipeRun, stairTower, stairRun, beacons, bayCeiling, shuttleShape, shuttleDims, scaledKit,
  fuelBowser, hoseReel, pallet, ladder, doorSurround, displayWall, equipmentBay, ensureLabels, ensureDiffuser, deckLabel,
  cableTray, truss, floodFixture, BLACK,
} from "../../hangar/machinery.js";

const CAT_H = 8; // catwalk height above the deck
const DOOR = { x0: -10, x1: 10, z0: 364, z1: 396 }; // sealed belly door
const RECESS = 0.15;
const S = 1.5; // shuttle scale (the kit shuttle is authored at 19 m; at 1.5x it fills the 32 m pad)
const SH = shuttleDims(S);
// The shuttle stands 30 degrees off the pad axis, nose toward the door's starboard side: nose-on from the door
// (the room view at (0, 408)) a folded-wing shuttle is a dark box with three edge-on fins, and this parks it
// so that view gets the front three-quarter of the hull, the starboard wing face, the lit ramp and the crew
// hatch with its stair. Everything shuttle-relative is built in the SF frame (n = nose, u = port: the nose
// is +n, so the starboard side is -u); the belly door recess (|x| < 10, z 364..396) just holds the four
// clamps and the nose gear at this heading.
const YAW = Math.PI / 6;
const SHIP = { x: 0.3, z: 379 }; // shuttle hull centre on the pad
// pooled high-bay lights and their fixtures: a 3 x 3 grid, rows midway between the bayCeiling ribs (every
// 3.3 m from z0) and 5 m from the roof trusses, columns clear of the four ceiling light strips (x +-7 / +-21)
const CEIL_LIGHTS = [];
for (const z of [358.2, 378, 397.9]) for (const x of [-13, 0, 13]) CEIL_LIGHTS.push([x, z]);

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
  bayCeiling(kit, room, y0, { rows: 4, gaps: CEIL_LIGHTS.map(([x, z]) => [x, z, 2.6]) });
  shadowCasters(kit, ["paintedMetal"]);
  doorSurround(kit, room, room.doors[0], y0, { label: 0, labelW: 5 });

  deck(kit, P, room, y0, T);
  bellyDoor(kit, ctx, mats, P, y0);
  const dy = y0 - RECESS;
  const SF = propFrame(kit, SHIP.x, dy, SHIP.z, YAW);
  padMarkings(kit, P, y0, SF);
  // the shuttle is authored in metres and merged at 1.5x about its pad point (geometry, colliders, hatch sills)
  scaledKit(kit, SF.o, S, (sub) => shuttleShape(sub, propFrame(sub, SHIP.x, dy, SHIP.z, YAW), { hull: P.impGreyDark, fin: P.darkMetal, trim: P.slate, crewHatch: "starboard" }));
  for (const su of [-1, 1]) {
    deckClamp(kit, P, SF, su, (SH.hullN[0] + SH.wingN[0]) / 2, (SH.wingN[0] - SH.hullN[0]) / 2 - 0.3);
    deckClamp(kit, P, SF, su, (SH.wingN[1] + SH.hullN[1]) / 2, (SH.hullN[1] - SH.wingN[1]) / 2 - 0.3);
  }
  crewKit(kit, P, SF, y0, dy);
  boardingStair(kit, ctx, lib, SF);
  for (const sx of [-1, 1]) for (const z of [365.5, 394.5]) floodMast(kit, P, sx, z, y0);
  umbilical(kit, P, -1, 380, y0, "fuel");
  umbilical(kit, P, 1, 380, y0, "power");
  booth(kit, ctx, lib, y0, z0);
  displayWall(shell.frames["-z"].frame, 14, 7.6, 8.0, 3.4, ["screen7", "screen9", "screen10", "screen8"], 19, { cols: 2, lamp: "emitBlue" });
  catwalk(kit, ctx, lib, room, y0);
  ceiling(kit, P, room, yTop);
  props(kit, lib, room, shell, y0);
  lights(ctx, lib, SF, y0, yTop);
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
function padMarkings(kit, P, y0, SF) {
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
  // touchdown cross, centre line and gear bars on the door leaves, painted at the parking heading (under the shuttle)
  const mark = (u, n, w, l) => SF.box("painted", u, 0.004, n, w, 0.008, l, { color: P.impWhite, uv: "keep" });
  mark(0, 0, 9, 0.3);
  mark(0, 0, 0.3, 12);
  for (const n of [-10, 10]) mark(0, n, 5, 0.24);
  // pad number and hatch code
  deckDecal(kit, -16.5, y0, 380, 3.6, 2, Math.PI / 2);
  deckDecal(kit, 16.5, y0, 380, 3.6, 2, -Math.PI / 2);
  deckDecal(kit, 0, y0, D.z0 - 4.6, 2.4, 3, 0);
  deckDecal(kit, 0, y0, D.z1 + 4.6, 2.4, 3, Math.PI);
}

// ---------------------------------------------------------------- deck clamps gripping the lower hull sides outside the wing roots
// Built in the shuttle frame f (u = port, v up from the pad, n = nose): side su, jaw centred at n, halfLen along n.
function deckClamp(kit, P, f, su, n, halfLen) {
  const hx = SH.hullHalfW; // hull side the jaw presses
  const x = su * (hx + 2.1); // column centre
  const jy = SH.gear + 0.9 * S; // lower hull box centre height
  const jh = 0.9 * S - 0.3; // jaw half height (inside the lower hull's side face)
  const box = (mat, a, b, opts = {}) => f.box(mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), opts);
  // base with hazard trim, column, head
  box("paintedMetal", [x - 0.9, 0, n - 0.9], [x + 0.9, 0.7, n + 0.9], { color: P.gunmetal, uv: "world", texel: 0.8 });
  box("hazard", [x - 0.91, 0.25, n - 0.91], [x + 0.91, 0.5, n + 0.91], { uv: "world", texel: 1.2 });
  box("paintedMetal", [x - 0.45, 0.7, n - 0.45], [x + 0.45, jy + 1.3, n + 0.45], { color: P.slate, uv: "world", texel: 0.8 });
  f.box("paintedMetal", x, jy + 1.45, n, 1.2, 0.3, 1.2, { color: P.gunmetal, texel: 1 });
  // arm to the jaw, rubber-faced jaw plate on the hull, hazard on the arm top
  const ax = su * (hx + 0.36);
  box("paintedMetal", [x, jy + 0.25, n - 0.4], [ax, jy + 0.95, n + 0.4], { color: P.gunmetal, uv: "world", texel: 0.8 });
  box("hazard", [x - su * 0.2, jy + 0.95, n - 0.41], [ax + su * 0.2, jy + 0.97, n + 0.41], { uv: "world", texel: 1.2 });
  box("paintedMetal", [su * (hx + 0.06), jy - jh, n - halfLen], [ax, jy + jh, n + halfLen], { color: P.darkMetal, uv: "world", texel: 0.8 });
  box(BLACK, [su * hx, jy - jh + 0.1, n - halfLen + 0.1], [su * (hx + 0.06), jy + jh - 0.1, n + halfLen - 0.1]);
  f.box("emitBlue", su * (hx + 0.21), jy + jh + 0.02, n, 0.3, 0.04, halfLen * 1.4, { uv: "keep" });
  // hydraulic ram from the base up to the arm underside near the jaw (a rotation about n by a tips v toward -u by sin a)
  const r0 = new THREE.Vector3(x - su * 0.3, 0.75, n);
  const r1 = new THREE.Vector3(su * (hx + 1.0), jy + 0.2, n);
  const L = r0.distanceTo(r1);
  const q = f.quat(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(-(r1.x - r0.x), r1.y - r0.y)));
  f.add("metal", new THREE.CylinderGeometry(0.11, 0.11, L, 8), (r0.x + r1.x) / 2, (r0.y + r1.y) / 2, n, { quat: q, color: P.steel, uv: "scale", uvScale: [1, 4] });
  // control panel on the outboard face
  f.box(BLACK, x + su * 0.46, 1.5, n, 0.04, 0.7, 0.7);
  f.box("screen6", x + su * 0.475, 1.6, n, 0.01, 0.3, 0.5, { uv: "keep" });
  f.box("emitBlue", x + su * 0.475, 1.3, n, 0.01, 0.05, 0.4, { uv: "keep" });
  f.collider(x - 0.9, x + 0.9, 0, jy + 1.6, n - 0.9, n + 0.9, "deckClamp");
  f.collider(Math.min(x, ax), Math.max(x, ax), jy + 0.25, jy + 1.0, n - 0.4, n + 0.4, "clampArm");
}

// A prop frame at shuttle-local (u, n) turned phi off the shuttle heading, standing on the recessed pad inside
// the belly door and on the deck outside it.
function shipProp(kit, SF, y0, dy, u, n, phi = 0) {
  const p = SF.pos(u, 0, n);
  const onPad = Math.abs(p.x) < DOOR.x1 && p.z > DOOR.z0 && p.z < DOOR.z1;
  return propFrame(kit, p.x, onPad ? dy : y0, p.z, YAW + phi);
}

// ---------------------------------------------------------------- ground crew kit (shuttle-local u / n)
// Starboard side (-u, the side the door view sees): the ramp comes down from the hull at u -3.5 to its foot
// at u -6.6 (n 1.2..3.3) with a hazard mat, a hose reel aft of it paying out to the starboard fuel point, the
// power cart plugged into the sponson, carts and a console; the crew stair at the hatch (n 6.5..8.5) has the
// pallet and crates ahead of it and the tall cockpit ladder beyond. Port (+u): the bowser hosed to the port
// fuel point and a cart. Props turned toward the hull face phi = +-PI/2 (n' along +-u).
function crewKit(kit, P, SF, y0, dy) {
  const at = (u, n, phi = 0) => shipProp(kit, SF, y0, dy, u, n, phi);
  // hose reel (its n' = +u, u' = -n): coupling at the starboard fuel point (-4.9, -5.25)
  hoseReel(kit, at(-7.2, -2.0, Math.PI / 2), { hoseTo: [3.25, 2.3], color: P.orange });
  // bowser on the port side, rear toward the hull (n' = +u, u' = -n): nozzle at (5.0, -5.25)
  fuelBowser(kit, at(8.5, -6.5, Math.PI / 2), { hoseTo: [-1.25, 0, -3.5] });
  toolCart(kit, at(6.5, 2.8, -1.3), { lamp: "emitBlue" });
  toolCart(kit, at(-10.2, 2.4, -0.4), { lamp: "emitBlue" });
  toolCart(kit, at(-8.2, 5.8, 1.2), { lamp: "emitBlue" });
  pedestalConsole(kit, at(-8.4, -4.0, Math.PI / 2), "screen7", { w: 1.4, lamp: "emitBlue" });
  crate(kit, at(-7.6, 10.4, 0.2), { decal: 9 });
  const c2 = at(-7.6, 10.4, 0.35);
  c2.o.y += 0.8;
  crate(kit, c2, { decal: 5, h: 0.7 });
  pallet(kit, at(-6.0, 10.0, 0.15), { tiers: 2, decal: 6 });
  // hazard mat at the ramp foot
  SF.box("hazard", -7.5, 0.012, SH.rampN, 1.6, 0.02, 2.6, { uv: "world", texel: 1.2 });
  // tall rolling ladder at the cockpit, platform toward the hull (its n' = -u)
  ladder(kit, at(-5.0, 11.4, -Math.PI / 2), { h: 5.0, w: 0.8 });
  // ground power cart plugged into the starboard sponson
  const gp = at(-8.4, 0.2, 0.2);
  gp.box("painted1", 0, 0.75, 0, 1.4, 1.1, 0.9, { color: P.impGreyDark, uv: "world", texel: 1 });
  gp.box(BLACK, 0, 0.75, 0.46, 1.2, 0.9, 0.02);
  gp.box("emitBlue", 0.3, 1.0, 0.48, 0.3, 0.06, 0.01, { uv: "keep" });
  gp.box("emitAmber", -0.3, 1.0, 0.48, 0.3, 0.06, 0.01, { uv: "keep" });
  for (const su of [-1, 1]) for (const sn of [-1, 1]) gp.cylU(BLACK, su * 0.6, 0.15, sn * 0.35, 0.15, 0.1, { segments: 10 });
  gp.collider(-0.7, 0.7, 0, 1.4, -0.5, 0.5, "gpu");
  const c0 = gp.pos(0.7, 0.9, 0);
  const c1 = SF.pos(-SH.sponsonX - 0.02, (1.2 + 0.8) * S, -1.0 * S);
  const mid = c0.clone().add(c1).multiplyScalar(0.5);
  mid.y = dy + 0.1;
  const pts = [c0, mid, SF.pos(-SH.sponsonX - 0.6, (1.2 + 0.8) * S - 0.7, -1.0 * S), c1];
  kit.add(BLACK, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5), 12, 0.05, 6, false), { uv: "scale", uvScale: [1, 8] });
  SF.box(BLACK, -SH.sponsonX - 0.05, (1.2 + 0.8) * S, -1.0 * S, 0.12, 0.4, 0.4);
  SF.box("emitBlue", -SH.sponsonX - 0.12, (1.2 + 0.8) * S + 0.25, -1.0 * S, 0.02, 0.05, 0.2);
  // deck stencils: FUEL by the bowser nozzle (between the gear and the aft clamp), NO STEP ahead of the nose
  const fs = SF.pos(3.2, 0, -7.4);
  deckDecal(kit, fs.x, dy, fs.z, 1.4, 5, YAW + Math.PI / 2);
  const ns = SF.pos(0, 0, SH.noseTip + 5.2);
  deckDecal(kit, ns.x, y0, ns.z, 1.6, 7, YAW + Math.PI);
}

// ---------------------------------------------------------------- wheeled boarding stair up to the starboard crew hatch
// Built in the shuttle frame: the hatch sill is SH.hatchSill above the pad at n SH.hatchN on the hull side
// u = -SH.hullHalfW; the landing stops 0.25 m short of the hull and the flight climbs toward the hull from
// 4.2 m outboard (26 degrees). Visual only (it stands on the recessed pad at the shuttle's heading, and the
// walkable floors are axis-aligned): one collider block each for the landing and the flight. A warm
// practical over the hatch lights the stair and the hull side.
function boardingStair(kit, ctx, lib, SF) {
  const P = lib.PALETTE;
  const hn = SH.hatchN;
  const top = SH.hatchSill - 0.02;
  const lu1 = -(SH.hullHalfW + 0.25); // landing edge at the hull
  const lu0 = lu1 - 1.6; // outer edge, where the flight arrives
  const box = (mat, a, b, opts = {}) => SF.box(mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), opts);
  box("paintedMetal", [lu0, top - 0.22, hn - 1.0], [lu1, top, hn + 1.0], { color: P.slate, uv: "world", texel: 1 });
  box("hazard", [lu1 - 0.35, top, hn - 0.9], [lu1 - 0.05, top + 0.008, hn + 0.9], { uv: "world", texel: 1.2 });
  // frame under the landing: four legs on wheels, cross braces
  for (const u of [lu0 + 0.15, lu1 - 0.15]) for (const n of [hn - 0.85, hn + 0.85]) {
    SF.box("metal", u, (0.3 + top - 0.22) / 2, n, 0.08, top - 0.22 - 0.3, 0.08, { color: P.gunmetal });
    SF.cylU(BLACK, u, 0.15, n, 0.15, 0.1, { segments: 10 });
  }
  for (const n of [hn - 0.85, hn + 0.85]) SF.box("metal", (lu0 + lu1) / 2, top - 1.55, n, 1.4, 0.1, 0.1, { color: P.gunmetal, texel: 1 });
  // landing rails on both n edges
  for (const n of [hn - 0.85, hn + 0.85]) {
    for (const u of [lu0 + 0.06, lu1 - 0.06]) SF.box("metal", u, top + 0.5, n, 0.05, 1.0, 0.05, { color: P.gunmetal });
    SF.box("metal", (lu0 + lu1) / 2, top + 1.0, n, 1.6, 0.04, 0.04, { color: P.steel });
    SF.box("metal", (lu0 + lu1) / 2, top + 0.55, n, 1.6, 0.03, 0.03, { color: P.steel });
  }
  // the flight: risers as solid blocks down to the pad, rails along both edges, wheels, tow bar, hazard sill
  const run = 4.2;
  const steps = Math.round(top / 0.2);
  const fu0 = lu0 - run; // foot
  for (let i = 0; i < steps; i++) {
    const h = (top / steps) * (i + 1);
    SF.box("paintedMetal", fu0 + (run / steps) * (i + 0.5), h / 2, hn, run / steps, h, 1.6, { color: P.gunmetal, uv: "world", texel: 1.5 });
  }
  const L = Math.hypot(run, top);
  const rq = SF.quat(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(top, run)));
  for (const n of [hn - 0.85, hn + 0.85]) {
    SF.add("metal", new THREE.BoxGeometry(L, 0.05, 0.05), (fu0 + lu0) / 2, top / 2 + 0.95, n, { quat: rq, color: P.steel, uv: "scale", uvScale: [4, 1] });
    SF.box("metal", fu0 + 0.1, 0.5, n, 0.06, 1.0, 0.06, { color: P.gunmetal });
    SF.cylU(BLACK, fu0 - 0.12, 0.15, n - (n > hn ? 0.25 : -0.25), 0.15, 0.1, { segments: 10 });
  }
  SF.box("hazard", fu0 - 0.25, 0.008, hn, 0.45, 0.008, 1.8, { uv: "world", texel: 1.2 });
  SF.cylU("metal", fu0 - 0.55, 0.35, hn, 0.03, 0.8, { color: P.steel, segments: 6 });
  SF.box("emitWarmSoft", lu1 - 0.04, top + 0.012, hn, 0.06, 0.006, 1.6, { uv: "keep" });
  SF.collider(lu0, lu1, 0, top + 1.05, hn - 1.0, hn + 1.0, "boardingStair");
  SF.collider(fu0, lu0, 0, top, hn - 0.85, hn + 0.85, "boardingStair");
  const lp = SF.pos(lu0 - 0.4, top + 1.6, hn);
  ctx.lights.warm.push(lib.pointLight(0xffc880, 18, 11, lp.toArray()));
}

// ---------------------------------------------------------------- flood masts at the pad corners
function floodMast(kit, P, sx, z, y0) {
  const x = sx * 14.5;
  kit.boxMM("paintedMetal", [x - 1.4, y0, z - 1.4], [x + 1.4, y0 + 0.9, z + 1.4], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("hazard", [x - 1.41, y0 + 0.3, z - 1.41], [x + 1.41, y0 + 0.6, z + 1.41], { uv: "world", texel: 1.2 });
  kit.boxMM("paintedMetal", [x - 0.7, y0 + 0.9, z - 0.7], [x + 0.7, y0 + 8.0, z + 0.7], { color: P.slate, uv: "world", texel: 0.8 });
  for (const s of [-1, 1]) kit.boxMM("metal", [x + s * 0.72 - 0.04, y0 + 1.2, z - 0.4], [x + s * 0.72 + 0.04, y0 + 7.6, z + 0.4], { color: P.darkMetal, texel: 1 });
  kit.collider([x - 1.4, y0, z - 1.4], [x + 1.4, y0 + 8.0, z + 1.4], "floodMast");
  // cantilever arm toward the pad with a louvred flood head at its end (well outside the folded wing tips).
  // The head is a floodFixture on the dim diffuser: its 1.3 m emitWhiteSoft plate, seen from the door 14 m
  // away, bloomed into a 3 m white blob at both near masts
  const ax = sx * 9.4;
  kit.boxMM("paintedMetal", [Math.min(x, ax), y0 + 7.0, z - 0.45], [Math.max(x, ax), y0 + 7.9, z + 0.45], { color: P.gunmetal, uv: "world", texel: 0.8 });
  kit.boxMM("hazard", [Math.min(x, ax) + 0.5, y0 + 7.2, z - 0.46], [Math.max(x, ax) - 0.5, y0 + 7.5, z - 0.44], { uv: "world", texel: 1.2 });
  kit.box(BLACK, ax + sx * 0.2, y0 + 6.85, z, 0.5, 0.3, 0.5);
  floodFixture(kit, ax + sx * 0.2, y0 + 6.6, z, "emitDiffuser", { alongX: true, w: 1.6, lip: 0.3 });
  kit.box("emitBlue", ax - sx * 0.61, y0 + 6.6, z, 0.02, 0.16, 0.6);
  // stays from the tower head down to the middle of the arm (their old anchor hung 0.6 m past the arm tip,
  // right under where the pooled light now sits above the arm)
  const stayX = sx * 11.6;
  for (const dz of [-0.3, 0.3]) {
    const dx = stayX - x;
    const dyy = (y0 + 7.9) - (y0 + 9.0);
    const L = Math.hypot(dx, dyy);
    kit.add("metal", new THREE.CylinderGeometry(0.1, 0.1, L, 8), { pos: [(x + stayX) / 2, y0 + 8.45, z + dz], rot: [0, 0, -Math.atan2(dx, dyy)], color: P.steel, uv: "scale", uvScale: [1, 4] });
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
  // stair towers inboard of the catwalk at both ends, exiting sideways onto it (the aft one is entered from
  // the door lane, the forward one from the pad side)
  const tower = { x0: -24.4, x1: -21.8, z0: 400, z1: 407.2 };
  const fwd = { x0: -24.4, x1: -21.8, z0: z0 + 1.2, z1: z0 + 8.4 };
  railing(kit, xb, fwd.z1, xb, tower.z0, cy, { postEvery: 2.2, tag: "catwalkRail" });
  railing(kit, xb, tower.z1, xb, zb, cy, { postEvery: 2.2, tag: "catwalkRail" });
  railing(kit, xa, za, xb, za, cy, { postEvery: 2.2, tag: "catwalkRail" });
  railing(kit, xa, zb, xb, zb, cy, { postEvery: 2.2, tag: "catwalkRail" });
  const towerLight = (x, y, z) => ctx.lights.cool.push(lib.pointLight(0xdfe8ff, 10, 12, [x, y, z]));
  stairTower(kit, { ...tower, yBottom: y0, yTop: cy, entry: "-z", exit: "x0", light: towerLight });
  deckDecal(kit, (tower.x0 + tower.x1) / 2, y0, tower.z0 - 0.9, 1.4, 1, Math.PI);
  stairTower(kit, { ...fwd, yBottom: y0, yTop: cy, entry: "+z", exit: "x0", light: towerLight });
  deckDecal(kit, (fwd.x0 + fwd.x1) / 2, y0, fwd.z1 + 0.9, 1.4, 1, 0);
  // wall brackets and floods under the catwalk
  for (let z = za + 2; z < zb; z += 8) kit.boxMM("paintedMetal", [xa, cy - 1.0, z - 0.2], [xb - 0.3, cy - 0.25, z + 0.2], { color: P.darkMetal, texel: 0.8 });
  for (let z = 358; z <= 402; z += 22) {
    kit.box(BLACK, -26.2, cy - 0.5, z, 2.0, 0.2, 0.7);
    kit.box("emitWhiteSoft", -26.2, cy - 0.61, z, 1.8, 0.02, 0.5, { uv: "keep" });
  }
  // pad spot on a railing post abeam the hull (the pooled shadow spot in lights() sits inside this housing)
  kit.box("metal", xb + 0.2, cy + 0.55, 390, 0.12, 1.1, 0.12, { color: P.gunmetal });
  kit.box(BLACK, xb + 0.3, cy + 1.2, 390, 0.7, 0.5, 0.6);
  kit.box("emitWhiteSoft", xb + 0.66, cy + 1.2, 390, 0.01, 0.34, 0.44, { uv: "keep" });
  kit.box("hazard", xb + 0.3, cy + 1.47, 390, 0.72, 0.04, 0.62, { uv: "world", texel: 1.5 });
  // consoles and cabinets along the catwalk wall
  for (const z of [366, 380, 394]) pedestalConsole(kit, propFrame(kit, -25.4, cy, z, -Math.PI / 2), "screen6", { w: 1.4, lamp: "emitBlue" });
  for (const z of [372, 388]) cabinet(kit, propFrame(kit, x0 + 0.48, cy, z, Math.PI / 2), { w: 1.2, h: 2.0, d: 0.6, screen: null, color: P.slate, lamp: "emitBlue" });
}

// ---------------------------------------------------------------- ceiling: light banks, ducts, pipe runs, trusses
function ceiling(kit, P, room, yTop) {
  const { x0, x1, z0, z1 } = room;
  // compact high-bay fixtures at the nine pooled point lights (see lights): a 600 cd source blows anything
  // within a metre of it white, so the housing is small and its plate flush (a 7 m bank read as a 7 m white slab)
  for (const [x, z] of CEIL_LIGHTS) compactBank(kit, x, yTop, z, "emitDiffuser");
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [s * 24 - 0.7, yTop - 1.6, z0], [s * 24 + 0.7, yTop - 0.4, z1], { color: P.slate, uv: "world", texel: 0.6 });
    pipeRun(kit, s * 26.4, yTop - 1.0, (z0 + z1) / 2, z1 - z0, "z", 0.2, P.steel, 8);
    pipeRun(kit, s * 26.4, yTop - 1.6, (z0 + z1) / 2, z1 - z0, "z", 0.12, P.orange, 8);
    cableTray(kit, s * 20, yTop - 1.9, (z0 + z1) / 2, z1 - z0 - 2, "z", 0.7);
  }
  pipeRun(kit, 0, yTop - 0.8, z0 + 1.5, x1 - x0, "x", 0.18, P.steel, 8);
  pipeRun(kit, 0, yTop - 0.8, z1 - 1.5, x1 - x0, "x", 0.18, P.gunmetal, 8);
  // two heavy open Warren roof girders midway between the light rows (9.9 m from any 600 cd source; the
  // ribs are the secondary structure). Anything with a face toward the door within ~6 m of those lights,
  // like the six solid beams that stood here, renders as a blown bar that bloom turns into a halo
  for (const z of [368.1, 387.95]) truss(kit, { axis: "x", from: -22.5, to: 22.5, at: z, yTop: yTop - 0.02, yBot: yTop - 2.0, panel: 3, chord: 0.45, web: 0.22, color: P.darkMetal, chordColor: P.slate });
}

// ---------------------------------------------------------------- deck props and wall modules
// The long walls were one repeated plate row at deck level. Now the starboard wall carries three open
// equipment bays (suit lockers, tool store, parts store) with the pad status board between them, the port wall
// two more under the catwalk, and the wall light bars run only between the modules.
function props(kit, lib, room, shell, y0) {
  const P = lib.PALETTE;
  const { x1, z0, z1 } = room;
  const starboard = shell.frames["+x"].frame; // u = z - z0
  const port = shell.frames["-x"].frame; // u = z1 - z
  equipmentBay(starboard, 362 - z0, 4.4, 3.4, 1.5, { fit: "suits" });
  equipmentBay(starboard, 373 - z0, 4.4, 3.4, 1.5, { fit: "tools" });
  displayWall(starboard, 385 - z0, 4.6, 5.2, 2.2, ["screen10", "screen7", "screen9", "screen8"], 22, { cols: 2 });
  equipmentBay(starboard, 397 - z0, 4.4, 3.4, 1.5, { fit: "parts" });
  equipmentBay(port, z1 - 368, 4.4, 3.4, 1.5, { fit: "parts" });
  equipmentBay(port, z1 - 390, 4.4, 3.4, 1.5, { fit: "tools" });
  // starboard wall between the modules: cabinets, crates under the status board, a cart
  for (let i = 0; i < 3; i++) cabinet(kit, propFrame(kit, x1 - 0.32, y0, 366.2 + i * 1.4, -Math.PI / 2), { screen: i % 2 ? "screen6" : null, color: i > 1 ? P.slate : P.impGreyDark, lamp: "emitBlue" });
  for (let i = 0; i < 3; i++) crate(kit, propFrame(kit, x1 - 1.2, y0, 388.4 + i * 1.3, 0.1 * i), { decal: [11, 6, 9][i] });
  crate(kit, propFrame(kit, x1 - 1.2, y0 + 0.8, 389.7, 0.15), { decal: 5, h: 0.7 });
  toolCart(kit, propFrame(kit, x1 - 2.4, y0, 383.6, Math.PI / 2 + 0.3), { lamp: "emitBlue" });
  toolCart(kit, propFrame(kit, -19.6, y0, 364.2, 0.4), { lamp: "emitBlue" });
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
  // wall light bars in the runs between the modules (u = z - 380 on the starboard frame)
  const sb = propFrame(kit, x1 - 0.02, y0, 380, -Math.PI / 2);
  for (const [a, b] of [[354.5, 359.3], [364.7, 370.3], [375.7, 394.3], [399.7, 407.5]]) lightBar(sb, a - 380, b - 380, 2.9);
  const pb = propFrame(kit, -x1 + 0.02, y0, 380, Math.PI / 2); // u = 380 - z
  for (const [a, b] of [[370.7, 387.3], [392.7, 399.3]]) lightBar(pb, 380 - b, 380 - a, 2.9);
  lightBar(propFrame(kit, 0, y0, z0 + 0.02, 0), -27, -11, 2.9);
  lightBar(propFrame(kit, 0, y0, z1 - 0.02, Math.PI), -27, -6, 2.9);
  lightBar(propFrame(kit, 0, y0, z1 - 0.02, Math.PI), 6, 27, 2.9);
}

// ---------------------------------------------------------------- lighting: cool floods, blue accents, amber practicals
function lights(ctx, lib, SF, y0, yTop) {
  const cool = (i, d, p, c = 0xdfe8ff) => ctx.lights.cool.push(lib.pointLight(c, i, d, p));
  // (inverse-square: 22 m from the ceiling to the deck). The lights sit in the ceiling plane inside the fixture
  // housings (hung 1.2 m under the plate they lit it into blown white halos); the centre column over the hull
  // is a step weaker so the shuttle's top reads as shape, not glare, from the catwalk
  for (const [x, z] of CEIL_LIGHTS) cool(x === 0 ? 480 : 600, 70, [x, yTop + 0.04, z]);
  // flood-mast heads light the pad ends, blue accents under the hull and at the nose. The mast light sits
  // 0.6 m above the arm over its head (nothing there but the arm's top face): inside the head it lit the
  // housing and the arm's underside from 0.3 m into a blown blob at both near masts
  for (const sx of [-1, 1]) for (const z of [365.5, 394.5]) cool(140, 30, [sx * 9.6, y0 + 8.5, z], 0xe8f0ff);
  // (the nose accent stands on the deck 3 m ahead of the nose tip: at 60 cd 0.7 m off the tip it blew the
  // nose faces white; under the hull the glow is what lights the gear and the pad between the struts)
  // (under the nose it hangs 1 m below the skin, 1.5 m aft of the tip: on the open deck ahead of the nose
  // it burned a white disc into the plates in the middle of the door view)
  ctx.lights.teal.push(lib.pointLight(0x66b6ff, 80, 30, SF.pos(0, 1.0, 0).toArray()));
  ctx.lights.teal.push(lib.pointLight(0x66b6ff, 14, 12, SF.pos(0, 1.6, SH.noseTip - 1.5).toArray()));
  // catwalk and umbilical practicals, warm light at the crew kit by the ramp
  for (const z of [366, 394]) cool(60, 20, [-26.2, y0 + CAT_H + 2.4, z], 0xe8f0ff);
  for (const sx of [-1, 1]) ctx.lights.warm.push(lib.pointLight(0xffb347, 50, 18, [sx * 16, y0 + 4.5, 380]));
  ctx.lights.warm.push(lib.pointLight(0xffc880, 30, 14, SF.pos(-7.8, 3.4, 2.2).toArray()));
  // shadowed spot from the port catwalk railing, abeam the hull, onto the near hull face and the near wing:
  // the side the door view sees. The folded wing's outer face leans 24 degrees outward and DOWN, so light
  // from above (the ceiling banks, a spot near the roof) grazes it and it stayed a black plate with the
  // hull; from the catwalk, 9 m up and 25 m to the side, the light meets that face at ~35 degrees and the
  // hull side square-on (2400 cd, decay 1.8: ~5 lux there against ~1.2 per ceiling light). It stands 10 m
  // aft of the fuel umbilical so the boom sits at the cone's edge (abeam of it at 384 the boom's end was
  // 11 degrees off the axis and lit into a white bar in the door view); the aft flood-mast arm is 35
  // degrees off, outside the cone
  const sp = new THREE.SpotLight(0xe8f0ff, 2400 * lib.LIGHT_SCALE, 40, 0.5, 0.5, 1.8);
  sp.position.set(-24.2, y0 + 9.2, 390);
  sp.target.position.copy(SF.pos(-1, 2.5, 3));
  sp.shadow.camera.near = 2;
  sp.shadow.camera.far = 42;
  sp.shadow.bias = -0.0004;
  sp.shadow.normalBias = 0.05;
  ctx.lights.spots.push(sp);
}
