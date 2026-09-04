// Main Hangar Bay (Deck 19) — hero room. A 120 x 190 m, 42 m tall ventral bay built around the launch
// well: an opening in the deck with the keel shaft below it (hull.js builds the shaft walls). Twelve
// ceiling racks hold the TIE wing over the well; traffic.js positions the fighters, this module builds
// the bay itself and everything that reacts to traffic through hangarBus: the keel blast doors, the
// rotating warning beacons, the tractor emitters and the rack rams.
//
// Layout (world): box [-60,100,60,290], floor y = -20, ceiling y = 22. Well x -24..24, z 130..250.
// North wall carries the lobby door and the raised flight-control booth (ROOMS.flightControl, floor
// y = -8, a `sub` room of the hangar handled by the zone manager; we just build it here).
import * as THREE from "three";
import { ROOMS, HANGAR_WELL, HANGAR_RACKS, STD } from "../../../config/layout.js";
import { wallOpenings } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { console as impConsole, chair, stairs, railing, pipeRun, pointLightDesc, spotLightDesc, walkable, wallScreen, lockers } from "../../impKit.js";
import { bayWall, bayCeiling, gallery, slab, pillar, deckMark, laneMarks, hazardKerb, floorStencil, hoseReel, bowser, toolCart, wallLadder, fireStation, floodMast, serviceGantry, crateStack, statusBoard, bakeParts, instancedSet, bakeGroup } from "../../../hangar/hangarKit.js";
import { addTIE } from "../../../hangar/tie.js";
import { hangarBus } from "../../../hangar/hangarBus.js";

const RIB = "impPaintedMetal";
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Blast door controls (also driven by traffic through hangarBus). Exposed for scripts / the flight
// systems: blastDoors.open(), blastDoors.close(), blastDoors.isOpen.
export const blastDoors = {
  k: 0, // 0 closed .. 1 open
  target: 0,
  travelTime: 7,
  open() {
    blastDoors.target = 1;
  },
  close() {
    blastDoors.target = 0;
  },
  get isOpen() {
    return blastDoors.k > 0.98;
  },
  get isClosed() {
    return blastDoors.k < 0.02;
  },
};

export function buildHangar(kit, ctx) {
  const mats = ctx.mats;
  const id = ctx.id;
  const room = ctx.room;
  const y = ctx.floorY; // -20
  const H = room.h; // 42
  const yC = y + H; // 22
  const [x0, z0, x1, z1] = room.box;
  const t = STD.wallT;
  const W = HANGAR_WELL;
  const booth = ROOMS.flightControl;
  const yB = booth.floorY; // -8
  const GAL_LO = y + 12; // -8
  const GAL_HI = y + 26; // +6
  const GAL_W = 3;

  // =========================================================================================
  // Enclosure
  // =========================================================================================
  const wallSpecs = {
    north: { from: [x0, z0 + t], to: [x1, z0 + t] },
    south: { from: [x1, z1 - t], to: [x0, z1 - t] },
    west: { from: [x0 + t, z1], to: [x0 + t, z0] },
    east: { from: [x1 - t, z0], to: [x1 - t, z1] },
  };
  const frames = {};
  let wi = 0;
  for (const key of ["north", "south", "west", "east"]) {
    const w = wallSpecs[key];
    const { frame, length } = wallFrame(kit, w.from, w.to, y);
    frames[key] = { frame, length };
    const openings = wallOpenings(id, room, key);
    bayWall(frame, length, H, { openings, ribPitch: 10, tiers: [0, 11.25, 25.25, H], seed: 41 + wi++ * 17, tag: id + ":" + key, tone: IMP.wallMid, toneAlt: IMP.wallLight });
    // door sign above every opening
    for (const op of openings) {
      const u = (op.u0 + op.u1) / 2;
      frame.box(RIB, u, op.v1 + 0.9, 0.12, Math.min(op.u1 - op.u0, 6), 0.7, 0.1, { color: IMP.trim, texel: 1 });
      frame.box("emitBlue", u + 1.2, op.v1 + 0.9, 0.18, 0.5, 0.18, 0.02);
      frame.quad("impDecal", u - 1.0, op.v1 + 0.9, 0.18, 0.5, 0.5, { uvRect: impDecalRect(7) });
      frame.box("hazard", u, op.v1 + 0.35, 0.12, op.u1 - op.u0 + 1.6, 0.3, 0.05, { uv: "world", texel: 1 });
    }
  }

  // ceiling with cross girders every 10 m (aligned with the wall ribs), rack girders at x = ±12,
  // crane girders at x = ±40, floodlight troughs over the decks and the well
  const troughs = [];
  for (let z = z0 + 15; z < z1 - 5; z += 20) {
    troughs.push([-40, z, 8, "z"], [40, z, 8, "z"]);
    troughs.push([0, z, 10, "x"]);
  }
  bayCeiling(kit, room.box, yC, { girderPitch: 10, longitudinals: [-12, 12, -40, 40], panel: 10, troughs, seed: 5 });

  // =========================================================================================
  // Deck around the well, kerb, rails, markings
  // =========================================================================================
  const kerb = 1.2;
  const deckTone = IMP.wallDark;
  const deckSlab = (bx0, bz0, bx1, bz1) => kit.boxMM("impDeck", [bx0, y - 0.15, bz0], [bx1, y, bz1], { color: deckTone, texel: 0.35 });
  deckSlab(x0, z0, x1, W.z0 - kerb);
  deckSlab(x0, W.z1 + kerb, x1, z1);
  deckSlab(x0, W.z0 - kerb, W.x0 - kerb, W.z1 + kerb);
  deckSlab(W.x1 + kerb, W.z0 - kerb, x1, W.z1 + kerb);
  walkable(ctx, x0, z0, x1, W.z0, y, id);
  walkable(ctx, x0, W.z1, x1, z1, y, id);
  walkable(ctx, x0, W.z0, W.x0, W.z1, y, id);
  walkable(ctx, W.x1, W.z0, x1, W.z1, y, id);
  // deck plate seams: a coarse grid of dark lines
  for (let x = x0 + 10; x < x1; x += 10) {
    for (const [za, zb] of [[z0, W.z0 - kerb], [W.z1 + kerb, z1]]) kit.boxMM(RIB, [x - 0.06, y, za], [x + 0.06, y + 0.006, zb], { color: IMP.trim });
    if (x < W.x0 - kerb || x > W.x1 + kerb) kit.boxMM(RIB, [x - 0.06, y, W.z0 - kerb], [x + 0.06, y + 0.006, W.z1 + kerb], { color: IMP.trim });
  }
  for (let z = z0 + 10; z < z1; z += 10) {
    if (z < W.z0 - kerb || z > W.z1 + kerb) kit.boxMM(RIB, [x0, y, z - 0.06], [x1, y + 0.006, z + 0.06], { color: IMP.trim });
    else {
      kit.boxMM(RIB, [x0, y, z - 0.06], [W.x0 - kerb, y + 0.006, z + 0.06], { color: IMP.trim });
      kit.boxMM(RIB, [W.x1 + kerb, y, z - 0.06], [x1, y + 0.006, z + 0.06], { color: IMP.trim });
    }
  }
  // hazard kerb over the shaft wall tops (hull.js raises them 0.5 m), safety rail on top
  const kY = y + 0.6;
  hazardKerb(kit, [W.x0 - kerb, y, W.z0 - kerb], [W.x0, kY, W.z1 + kerb]);
  hazardKerb(kit, [W.x1, y, W.z0 - kerb], [W.x1 + kerb, kY, W.z1 + kerb]);
  hazardKerb(kit, [W.x0, y, W.z0 - kerb], [W.x1, kY, W.z0]);
  hazardKerb(kit, [W.x0, y, W.z1], [W.x1, kY, W.z1 + kerb]);
  const rin = 0.5;
  railing(kit, [W.x0 - rin, W.z1 + rin], [W.x0 - rin, W.z0 - rin], kY, { h: 1.1, lit: true, postPitch: 2.5 });
  railing(kit, [W.x1 + rin, W.z0 - rin], [W.x1 + rin, W.z1 + rin], kY, { h: 1.1, lit: true, postPitch: 2.5 });
  railing(kit, [W.x0 - rin, W.z0 - rin], [W.x1 + rin, W.z0 - rin], kY, { h: 1.1, lit: true, postPitch: 2.5 });
  railing(kit, [W.x1 + rin, W.z1 + rin], [W.x0 - rin, W.z1 + rin], kY, { h: 1.1, lit: true, postPitch: 2.5 });
  // shaft lining just below the deck: a lit rim so the opening reads from across the bay
  kit.boxMM("lightBandWarm", [W.x0 + 0.02, y - 0.9, W.z0], [W.x0 + 0.08, y - 0.6, W.z1], { uv: "keep" });
  kit.boxMM("lightBandWarm", [W.x1 - 0.08, y - 0.9, W.z0], [W.x1 - 0.02, y - 0.6, W.z1], { uv: "keep" });
  kit.boxMM("lightBandWarm", [W.x0, y - 0.9, W.z0 + 0.02], [W.x1, y - 0.6, W.z0 + 0.08], { uv: "keep" });
  kit.boxMM("lightBandWarm", [W.x0, y - 0.9, W.z1 - 0.08], [W.x1, y - 0.6, W.z1 - 0.02], { uv: "keep" });
  // keep-clear hatching around the kerb, lane from the lobby to the well, bay numerals
  const hz = 6;
  for (let z = W.z0 - kerb; z < W.z1 + kerb; z += hz) {
    deckMark(kit, W.x0 - kerb - hz / 2, z + hz / 2, y, hz, hz, 2);
    deckMark(kit, W.x1 + kerb + hz / 2, z + hz / 2, y, hz, hz, 2);
  }
  for (let x = W.x0 - kerb - hz; x < W.x1 + kerb + hz; x += hz) {
    deckMark(kit, x + hz / 2, W.z0 - kerb - hz / 2, y, hz, hz, 2);
    deckMark(kit, x + hz / 2, W.z1 + kerb + hz / 2, y, hz, hz, 2);
  }
  laneMarks(kit, [0, 104.5], [0, W.z0 - kerb - hz - 0.5], y, 4);
  laneMarks(kit, [0, z1 - 8], [0, W.z1 + kerb + hz + 0.5], y, 4);
  laneMarks(kit, [x0 + 4, 190], [W.x0 - kerb - hz - 0.5, 190], y, 4);
  laneMarks(kit, [x1 - 4, 190], [W.x1 + kerb + hz + 0.5, 190], y, 4);
  // parking pads: landing crosses + numerals on both side decks
  const pads = [
    { x: -43, z: 160, n: 1 },
    { x: -43, z: 222, n: 2 },
    { x: 43, z: 160, n: 3 },
    { x: 43, z: 222, n: 4 },
  ];
  for (const p of pads) {
    deckMark(kit, p.x, p.z, y, 12, 12, 1);
    deckMark(kit, p.x, p.z - 9, y, 4, 4, 3);
    floorStencil(kit, p.x + 7.5, y, p.z - 7.5, 2.2, 8);
  }
  for (const [x, z] of [[-30, 118], [30, 118], [-30, 264], [30, 264], [-40, 190], [40, 190]]) floorStencil(kit, x, y, z, 3, 10, Math.PI / 2);

  // =========================================================================================
  // Well: blast doors at the keel end, tractor emitters, warning beacons, planet light
  // =========================================================================================
  const wellCX = (W.x0 + W.x1) / 2;
  const wellCZ = (W.z0 + W.z1) / 2;
  const halfW = (W.x1 - W.x0) / 2; // 24
  const halfD = (W.z1 - W.z0) / 2; // 60
  const doorT = 1.2;
  // one half (starboard, x 0..halfW in local space, seam at x = 0); the port half is the same geometry
  // rotated 180° about Y so its seam edge also lands at x = 0
  const doorParts = bakeParts(mats, (k) => {
    k.boxMM(RIB, [0, -doorT / 2, -halfD], [halfW, doorT / 2, halfD], { color: IMP.wallDark, texel: 0.3 });
    // top plating: raised courses + seam edge beam with hazard stripes
    for (let z = -halfD + 5; z < halfD; z += 10) k.boxMM(RIB, [0.4, doorT / 2, z - 0.35], [halfW - 0.4, doorT / 2 + 0.25, z + 0.35], { color: IMP.trim, texel: 0.5 });
    k.boxMM(RIB, [0, doorT / 2, -halfD], [1.6, doorT / 2 + 0.3, halfD], { color: IMP.trim, texel: 0.5 });
    k.boxMM("hazard", [0.1, doorT / 2 + 0.3, -halfD + 0.2], [1.5, doorT / 2 + 0.32, halfD - 0.2], { uv: "world", texel: 0.5 });
    for (let z = -halfD + 6; z < halfD; z += 12) k.box("emitAmber", 2.3, doorT / 2 + 0.16, z, 0.6, 0.06, 0.6);
    k.boxMM(RIB, [halfW - 1.2, doorT / 2, -halfD], [halfW, doorT / 2 + 0.2, halfD], { color: IMP.trim, texel: 0.5 });
    // underside: hull-coloured plate with girders (this is what the exterior camera sees)
    k.boxMM(RIB, [0.2, -doorT / 2 - 0.12, -halfD + 0.2], [halfW - 0.2, -doorT / 2, halfD - 0.2], { color: IMP.hullDark, texel: 0.3 });
    for (let z = -halfD + 5; z < halfD; z += 10) k.boxMM(RIB, [0.6, -doorT / 2 - 0.5, z - 0.3], [halfW - 0.6, -doorT / 2 - 0.12, z + 0.3], { color: IMP.trench, texel: 0.5 });
    k.boxMM(RIB, [0, -doorT / 2 - 0.5, -halfD], [1.0, -doorT / 2, halfD], { color: IMP.trench, texel: 0.5 });
    for (let z = -halfD + 6; z < halfD; z += 12) k.box("emitRed", 3.0, -doorT / 2 - 0.2, z, 0.6, 0.06, 0.6);
  });
  const doors = instancedSet(kit, mats, doorParts, 2);
  const doorPose = (k) => {
    const shift = halfW * smooth(k);
    _p.set(wellCX + shift, W.yKeel, wellCZ);
    doors.set(0, _m.compose(_p, _q.identity(), _s.set(1, 1, 1)));
    _p.set(wellCX - shift, W.yKeel, wellCZ);
    doors.set(1, _m.compose(_p, _q.setFromAxisAngle(UP, Math.PI), _s.set(1, 1, 1)));
    doors.commit();
  };
  doorPose(0);
  // door pockets: recesses in the shaft wall the halves slide into (visual only, they sit inside the hull)
  for (const sx of [-1, 1]) {
    kit.boxMM(RIB, [sx > 0 ? W.x1 : W.x0 - 2.4, W.yKeel - doorT / 2 - 0.8, W.z0 - 0.5], [sx > 0 ? W.x1 + 2.4 : W.x0, W.yKeel + doorT / 2 + 0.8, W.z1 + 0.5], { color: IMP.trench, texel: 0.3 });
    // door tracks along the shaft wall at the keel end
    kit.boxMM("impMetal", [sx > 0 ? W.x1 - 0.3 : W.x0, W.yKeel + doorT / 2 + 0.2, W.z0], [sx > 0 ? W.x1 : W.x0 + 0.3, W.yKeel + doorT / 2 + 0.5, W.z1], { color: IMP.gunmetal });
  }
  // shaft floodlights: cool strips on the shaft walls halfway down (visible from the deck edge)
  for (const yy of [y - 8, y - 18]) {
    kit.boxMM("lightBand", [W.x0 + 0.02, yy - 0.15, W.z0 + 4], [W.x0 + 0.1, yy + 0.15, W.z1 - 4], { uv: "keep" });
    kit.boxMM("lightBand", [W.x1 - 0.1, yy - 0.15, W.z0 + 4], [W.x1 - 0.02, yy + 0.15, W.z1 - 4], { uv: "keep" });
  }

  // tractor emitters on the ceiling girders at the well edge, cones aimed into the shaft
  const tractorMat = mats.beam.clone();
  tractorMat.opacity = 0;
  const emitters = [];
  for (const sx of [-1, 1]) for (const z of [150, 190, 230]) emitters.push({ pos: new THREE.Vector3(sx * 30, yC - 2.2, z), aim: new THREE.Vector3(0, y - 12, z) });
  for (const e of emitters) {
    kit.box(RIB, e.pos.x, e.pos.y + 0.9, e.pos.z, 2.4, 1.6, 2.4, { color: IMP.darkMetal, texel: 1 });
    kit.cyl(RIB, e.pos.x, e.pos.y + 0.1, e.pos.z, 0.9, 0.5, "y", { color: IMP.trim, segments: 16, texel: 1 });
    const ring = new THREE.TorusGeometry(0.75, 0.08, 8, 24);
    ring.rotateX(Math.PI / 2);
    kit.add("impMetal", ring, { pos: [e.pos.x, e.pos.y - 0.15, e.pos.z], color: IMP.steel, uv: "scale", uvScale: [4, 1] });
    kit.cyl("emitBlue", e.pos.x, e.pos.y - 0.15, e.pos.z, 0.55, 0.1, "y", { segments: 16 });
    kit.box("blinkSparse", e.pos.x + (e.pos.x > 0 ? -1.21 : 1.21), e.pos.y + 0.9, e.pos.z, 0.01, 0.4, 1.2, { uv: "keep" });
  }
  const coneGeo = new THREE.CylinderGeometry(4.5, 0.4, 1, 20, 1, true);
  coneGeo.translate(0, -0.5, 0); // apex at the origin, opening along -y
  const cones = new THREE.InstancedMesh(coneGeo, tractorMat, emitters.length);
  cones.name = "tractor_cones";
  cones.frustumCulled = true;
  cones.castShadow = false;
  cones.receiveShadow = false;
  cones.renderOrder = 4;
  emitters.forEach((e, i) => {
    const dir = e.aim.clone().sub(e.pos);
    const len = dir.length();
    dir.normalize();
    _q.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    _p.copy(e.pos).addScaledVector(dir, 0.6);
    cones.setMatrixAt(i, _m.compose(_p, _q, _s.set(1, len - 1, 1)));
  });
  cones.instanceMatrix.needsUpdate = true;
  cones.computeBoundingSphere();
  ctx.add(cones);

  // warning beacons on the kerb: static post + housing + lens, instanced rotating lobes
  const beaconPos = [];
  for (const sx of [-1, 1]) for (const z of [W.z0 - kerb / 2, wellCZ - 30, wellCZ + 30, W.z1 + kerb / 2]) beaconPos.push([sx * (W.x1 + kerb / 2), z]);
  for (const [bx, bz] of beaconPos) {
    kit.cyl(RIB, bx, kY + 0.7, bz, 0.08, 1.4, "y", { color: IMP.darkMetal, segments: 8, texel: 1 });
    kit.cyl(RIB, bx, kY + 1.5, bz, 0.26, 0.24, "y", { color: IMP.trim, segments: 12, texel: 1 });
    kit.cyl("emitAmber", bx, kY + 1.78, bz, 0.2, 0.3, "y", { segments: 12 });
    kit.cyl(RIB, bx, kY + 1.98, bz, 0.24, 0.08, "y", { color: IMP.trim, segments: 12, texel: 1 });
  }
  const lobeGeo = new THREE.PlaneGeometry(2.2, 0.5);
  lobeGeo.translate(1.3, 0, 0);
  const lobes = new THREE.InstancedMesh(lobeGeo, mats.beaconGlow, beaconPos.length * 2);
  lobes.name = "beacon_lobes";
  lobes.castShadow = false;
  lobes.receiveShadow = false;
  lobes.frustumCulled = true;
  lobes.renderOrder = 4;
  ctx.add(lobes);
  const poseLobes = (phase, level) => {
    beaconPos.forEach(([bx, bz], i) => {
      for (let k = 0; k < 2; k++) {
        _q.setFromAxisAngle(UP, phase + i * 0.7 + k * Math.PI);
        _p.set(bx, kY + 1.78, bz);
        lobes.setMatrixAt(i * 2 + k, _m.compose(_p, _q, _s.set(level, level, level)));
      }
    });
    lobes.instanceMatrix.needsUpdate = true;
    lobes.computeBoundingSphere();
  };
  poseLobes(0, 0.35);

  // =========================================================================================
  // TIE racks: static ceiling towers + instanced rams / clamp heads / jaws
  // =========================================================================================
  const RACK_HEAD_Y = 14.45; // top of the clamp head at ext = 0 (fighter hangs with its wing tops at 13.75)
  const TOWER_BOT = 14.6;
  for (const r of HANGAR_RACKS) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box(RIB, r.x + sx * 0.8, (yC + TOWER_BOT) / 2, r.z + sz * 0.8, 0.3, yC - TOWER_BOT, 0.3, { color: IMP.trim, texel: 1 });
    for (let yy = TOWER_BOT + 1.2; yy < yC - 0.5; yy += 2.4) {
      kit.box("impMetal", r.x, yy, r.z - 0.8, 1.9, 0.12, 0.12, { color: IMP.gunmetal });
      kit.box("impMetal", r.x, yy, r.z + 0.8, 1.9, 0.12, 0.12, { color: IMP.gunmetal });
      kit.box("impMetal", r.x - 0.8, yy, r.z, 0.12, 0.12, 1.9, { color: IMP.gunmetal });
      kit.box("impMetal", r.x + 0.8, yy, r.z, 0.12, 0.12, 1.9, { color: IMP.gunmetal });
    }
    kit.box(RIB, r.x, TOWER_BOT + 0.35, r.z, 2.6, 0.7, 2.6, { color: IMP.darkMetal, texel: 1 });
    kit.box(RIB, r.x, TOWER_BOT + 0.9, r.z, 2.0, 0.4, 2.0, { color: IMP.trim, texel: 1 });
    kit.box("emitAmber", r.x + (r.x > 0 ? 1.31 : -1.31), TOWER_BOT + 0.35, r.z, 0.01, 0.16, 0.6);
    kit.box("hazard", r.x, TOWER_BOT + 0.35, r.z, 2.62, 0.2, 2.62, { uv: "world", texel: 1 });
    // rack id plate facing the deck centre
    const g = new THREE.PlaneGeometry(0.9, 0.9);
    g.rotateY(r.x > 0 ? -Math.PI / 2 : Math.PI / 2);
    kit.add("impDecal", g, { pos: [r.x + (r.x > 0 ? -1.31 : 1.31), TOWER_BOT + 3.2, r.z], uv: "keep", uvRect: impDecalRect(8) });
  }
  const ramParts = bakeParts(mats, (k) => {
    k.cyl(RIB, 0, -0.5, 0, 0.36, 1.0, "y", { color: IMP.gunmetal, segments: 12, texel: 1 });
  });
  const headParts = bakeParts(mats, (k) => {
    k.box(RIB, 0, RACK_HEAD_Y - 0.3, 0, 8.4, 0.6, 1.1, { color: IMP.darkMetal, texel: 1 });
    k.box(RIB, 0, RACK_HEAD_Y - 0.3, 0, 1.6, 0.7, 1.6, { color: IMP.trim, texel: 1 });
    k.box("impMetal", 0, RACK_HEAD_Y - 0.62, 0, 8.0, 0.06, 0.4, { color: IMP.steel });
    k.box("hazard", 0, RACK_HEAD_Y - 0.3, 0, 8.42, 0.14, 1.12, { uv: "world", texel: 1 });
  });
  const jawParts = bakeParts(mats, (k) => {
    // U-bracket hanging from the head around one wing's top edge (wing plane at local x = 0)
    k.box(RIB, 0, RACK_HEAD_Y - 0.66, 0, 0.9, 0.12, 0.9, { color: IMP.darkMetal, texel: 1 });
    for (const s of [-1, 1]) k.box(RIB, s * 0.28, RACK_HEAD_Y - 0.98, 0, 0.14, 0.56, 0.8, { color: IMP.darkMetal, texel: 1 });
    k.box("emitGreen", 0, RACK_HEAD_Y - 0.78, 0.46, 0.3, 0.06, 0.01);
  });
  const rams = instancedSet(kit, mats, ramParts, HANGAR_RACKS.length);
  const heads = instancedSet(kit, mats, headParts, HANGAR_RACKS.length);
  const jaws = instancedSet(kit, mats, jawParts, HANGAR_RACKS.length * 2);
  const rackState = HANGAR_RACKS.map(() => ({ ext: 0, target: 0, clamped: true, jaw: 0 }));
  const poseRacks = () => {
    HANGAR_RACKS.forEach((r, i) => {
      const st = rackState[i];
      _p.set(r.x, TOWER_BOT, r.z);
      rams.set(i, _m.compose(_p, _q.identity(), _s.set(1, TOWER_BOT - RACK_HEAD_Y + st.ext, 1)));
      _p.set(r.x, -st.ext, r.z);
      heads.set(i, _m.compose(_p, _q, _s.set(1, 1, 1)));
      for (const s of [-1, 1]) {
        _p.set(r.x + s * (3.35 + st.jaw * 0.45), -st.ext, r.z);
        jaws.set(i * 2 + (s > 0 ? 1 : 0), _m.compose(_p, _q, _s.set(1, 1, 1)));
      }
    });
    rams.commit();
    heads.commit();
    jaws.commit();
  };
  poseRacks();

  // =========================================================================================
  // Galleries (y = -8 and y = +6) along the long walls, stairs down, landings, ladders
  // =========================================================================================
  const wx = x0 + t; // west wall face
  const ex = x1 - t;
  // stair positions: west stairs near the north end, east stairs near the south end
  const westLo = { z0: 118, top: 136.9 }; // ascends +z
  const eastLo = { z0: 272, top: 253.1 }; // ascends -z
  const westHi = { z0: 139.9, top: 162.1 };
  const eastHi = { z0: 250.1, top: 227.9 };
  const sw = 2.4;
  const sxW = wx + GAL_W + 0.15 + sw / 2; // stair centre x (west), just inboard of the gallery rail
  const sxE = ex - GAL_W - 0.15 - sw / 2;
  // west gallery: u = z1 - z
  gallery(kit, ctx, [wx, z1], [wx, z0], [1, 0], GAL_LO, GAL_W, { railGaps: [[z1 - (westLo.top + 3), z1 - westLo.top]] });
  gallery(kit, ctx, [wx, z1], [wx, z0], [1, 0], GAL_HI, GAL_W, { railGaps: [[z1 - (westHi.top + 3), z1 - westHi.top]] });
  // east gallery: u = z - z0
  gallery(kit, ctx, [ex, z0], [ex, z1], [-1, 0], GAL_LO, GAL_W, { railGaps: [[eastLo.top - 3 - z0, eastLo.top - z0]] });
  gallery(kit, ctx, [ex, z0], [ex, z1], [-1, 0], GAL_HI, GAL_W, { railGaps: [[eastHi.top - 3 - z0, eastHi.top - z0]] });
  // stairs + landings (west)
  stairs(kit, ctx, [sxW, westLo.z0], [0, 1], sw, y, GAL_LO, { tread: 0.3 });
  slab(kit, ctx, [wx + GAL_W, westLo.top, sxW + sw / 2, westLo.top + 3], GAL_LO, { rails: ["e"] });
  stairs(kit, ctx, [sxW, westHi.z0], [0, 1], sw, GAL_LO, GAL_HI, { tread: 0.3 });
  slab(kit, ctx, [wx + GAL_W, westHi.top, sxW + sw / 2, westHi.top + 3], GAL_HI, { rails: ["e", "s"] });
  for (const z of [138.4, 146, 156]) pillar(kit, sxW, z, y, GAL_LO, 0.8);
  // stairs + landings (east)
  stairs(kit, ctx, [sxE, eastLo.z0], [0, -1], sw, y, GAL_LO, { tread: 0.3 });
  slab(kit, ctx, [sxE - sw / 2, eastLo.top - 3, ex - GAL_W, eastLo.top], GAL_LO, { rails: ["w"] });
  stairs(kit, ctx, [sxE, eastHi.z0], [0, -1], sw, GAL_LO, GAL_HI, { tread: 0.3 });
  slab(kit, ctx, [sxE - sw / 2, eastHi.top - 3, ex - GAL_W, eastHi.top], GAL_HI, { rails: ["w", "n"] });
  for (const z of [251.6, 244, 234]) pillar(kit, sxE, z, y, GAL_LO, 0.8);
  // wall ladders between the deck and the galleries, fire stations by the doors, hose reels along the walls
  for (const u of [40, 95, 175]) wallLadder(frames.west.frame, u, 0, 11, {});
  for (const u of [15, 40, 140]) wallLadder(frames.east.frame, u, 0, 11, {});
  for (const u of [70, 125]) wallLadder(frames.west.frame, u, 11.6, 25, {});
  for (const u of [70, 115]) wallLadder(frames.east.frame, u, 11.6, 25, {});
  fireStation(frames.west.frame, 143, { big: true });
  fireStation(frames.west.frame, 157, { big: true });
  fireStation(frames.east.frame, 84, { big: true });
  fireStation(frames.east.frame, 97, { big: true });
  fireStation(frames.south.frame, 50, { big: true });
  fireStation(frames.south.frame, 70, { big: true });
  fireStation(frames.north.frame, 20, { big: true });
  fireStation(frames.north.frame, 100, { big: true });

  // =========================================================================================
  // Flight control booth (ROOMS.flightControl) on the north wall, core block below with the lobby tunnel
  // =========================================================================================
  {
    const [bx0, bz0, bx1, bz1] = booth.box; // [-12,100,12,108]
    const bh = booth.h; // 3.2
    const zFace = z0 + t; // 100.25
    const tunnelHW = 2.3;
    const tunnelTop = y + 3.7;
    const coreZ1 = 104.2;
    const slabBot = yB - 0.5;
    // core block with the tunnel through it
    kit.boxMM(RIB, [bx0, y, zFace], [-tunnelHW, slabBot, coreZ1], { color: IMP.wallDark, texel: 0.5 });
    kit.boxMM(RIB, [tunnelHW, y, zFace], [bx1, slabBot, coreZ1], { color: IMP.wallDark, texel: 0.5 });
    kit.boxMM(RIB, [-tunnelHW, tunnelTop, zFace], [tunnelHW, slabBot, coreZ1], { color: IMP.wallDark, texel: 0.5 });
    kit.collider([bx0, y, zFace - 0.1], [-tunnelHW, slabBot, coreZ1], "boothCore");
    kit.collider([tunnelHW, y, zFace - 0.1], [bx1, slabBot, coreZ1], "boothCore");
    // tunnel dressing: light bands, kick plates, hazard lintel
    for (const sx of [-1, 1]) {
      kit.boxMM("lightBand", [sx * tunnelHW - (sx > 0 ? 0.03 : -0.03) - 0.015, y + 2.1, zFace + 0.2], [sx * tunnelHW - (sx > 0 ? 0.03 : -0.03) + 0.015, y + 2.3, coreZ1 - 0.2], { uv: "keep" });
      kit.boxMM(RIB, [sx > 0 ? tunnelHW - 0.08 : -tunnelHW, y, zFace], [sx > 0 ? tunnelHW : -tunnelHW + 0.08, y + 0.4, coreZ1], { color: IMP.trim, texel: 1 });
    }
    kit.boxMM("lightSoft", [-1.2, tunnelTop - 0.03, zFace + 0.5], [1.2, tunnelTop - 0.01, coreZ1 - 0.5], { uv: "keep" });
    kit.boxMM("hazard", [-tunnelHW - 0.4, tunnelTop, coreZ1 - 0.02], [tunnelHW + 0.4, tunnelTop + 0.4, coreZ1 + 0.03], { uv: "world", texel: 1 });
    // core south face: screens, a big bay-status board, vents
    {
      const { frame } = wallFrame(kit, [bx0, coreZ1], [bx1, coreZ1], y);
      statusBoard(frame, 6.5 + 12, 8.2, 7, 2.6, { seed: 21 });
      statusBoard(frame, -6.5 + 12, 8.2, 7, 2.6, { seed: 22 });
      frame.quad("impDecal", 12, 5.2, 0.02, 2.4, 2.4, { uvRect: impDecalRect(4) });
      frame.box("lightBandRed", 12, 10.6, 0.05, 20, 0.16, 0.03, { uv: "keep" });
      for (const u of [3, 21]) {
        frame.box(RIB, u, 2.2, 0.08, 3, 3.2, 0.06, { color: IMP.trim, texel: 1 });
        for (let s = 0; s < 8; s++) frame.box("impMetal", u, 0.9 + s * 0.36, 0.14, 2.7, 0.1, 0.12, { color: IMP.gunmetal, tilt: 0.5 });
      }
      lockers(frame, 5.6, 8.6, 2.1, { seed: 3 });
      lockers(frame, 15.4, 18.4, 2.1, { seed: 4 });
    }
    // booth floor slab, cantilevered beyond the core, on two pillars
    kit.boxMM(RIB, [bx0, slabBot, zFace], [bx1, yB - 0.01, bz1], { color: IMP.trim, texel: 0.5 });
    kit.boxMM("impDeck", [bx0 + t, yB - 0.02, zFace], [bx1 - t, yB, bz1 - t], { color: IMP.wallDark, texel: 0.5 });
    walkable(ctx, bx0 + t, zFace, bx1 + 0.3, bz1 - t, yB, "flightControl");
    kit.boxMM("lightBand", [bx0 + 0.5, slabBot - 0.02, bz1 - 0.3], [bx1 - 0.5, slabBot, bz1 - 0.1], { uv: "keep" });
    pillar(kit, bx0 + 1.2, bz1 - 0.9, y, slabBot, 0.9);
    pillar(kit, bx1 - 1.2, bz1 - 0.9, y, slabBot, 0.9);
    // side walls with the door on the east side
    const doorZ0 = 103.3;
    const doorZ1 = 104.9;
    kit.boxMM(RIB, [bx0, yB, zFace], [bx0 + t, yB + bh, bz1], { color: IMP.trim, texel: 0.5 });
    kit.collider([bx0 - 0.1, yB, zFace], [bx0 + t, yB + bh, bz1], "boothWall");
    kit.boxMM(RIB, [bx1 - t, yB, zFace], [bx1, yB + bh, doorZ0], { color: IMP.trim, texel: 0.5 });
    kit.boxMM(RIB, [bx1 - t, yB, doorZ1], [bx1, yB + bh, bz1], { color: IMP.trim, texel: 0.5 });
    kit.boxMM(RIB, [bx1 - t, yB + 2.4, doorZ0], [bx1, yB + bh, doorZ1], { color: IMP.trim, texel: 0.5 });
    kit.collider([bx1 - t, yB, zFace], [bx1 + 0.1, yB + bh, doorZ0], "boothWall");
    kit.collider([bx1 - t, yB, doorZ1], [bx1 + 0.1, yB + bh, bz1], "boothWall");
    // door frame + blue status light
    kit.boxMM(RIB, [bx1 - t - 0.06, yB, doorZ0 - 0.16], [bx1 + 0.06, yB + 2.56, doorZ0], { color: IMP.darkMetal, texel: 1 });
    kit.boxMM(RIB, [bx1 - t - 0.06, yB, doorZ1], [bx1 + 0.06, yB + 2.56, doorZ1 + 0.16], { color: IMP.darkMetal, texel: 1 });
    kit.boxMM(RIB, [bx1 - t - 0.06, yB + 2.4, doorZ0 - 0.16], [bx1 + 0.06, yB + 2.56, doorZ1 + 0.16], { color: IMP.darkMetal, texel: 1 });
    kit.box("emitBlue", bx1 + 0.07, yB + 2.7, (doorZ0 + doorZ1) / 2, 0.01, 0.06, 0.6);
    // glass front: sill, mullions, header, glass panes
    const sillH = 1.0;
    kit.boxMM(RIB, [bx0, yB, bz1 - t], [bx1, yB + sillH, bz1], { color: IMP.trim, texel: 0.5 });
    kit.boxMM(RIB, [bx0, yB + bh - 0.25, bz1 - t], [bx1, yB + bh, bz1], { color: IMP.trim, texel: 0.5 });
    kit.collider([bx0, yB, bz1 - t], [bx1, yB + bh, bz1 + 0.1], "boothGlass");
    for (let x = bx0; x <= bx1 + 0.01; x += 6) kit.boxMM(RIB, [x - 0.08, yB + sillH, bz1 - t], [x + 0.08, yB + bh - 0.25, bz1], { color: IMP.trim, texel: 1 });
    const pane = new THREE.PlaneGeometry(bx1 - bx0 - 0.2, bh - sillH - 0.25);
    kit.add("glassDark", pane, { pos: [(bx0 + bx1) / 2, yB + sillH + (bh - sillH - 0.25) / 2, bz1 - t / 2], uv: "keep" });
    kit.boxMM("impMetal", [bx0, yB + sillH, bz1 - t - 0.02], [bx1, yB + sillH + 0.04, bz1 + 0.02], { color: IMP.steel });
    // roof slab with a sensor mast and a red beacon
    kit.boxMM(RIB, [bx0, yB + bh, zFace], [bx1, yB + bh + 0.5, bz1], { color: IMP.trim, texel: 0.5 });
    kit.boxMM(RIB, [bx0 + 0.3, yB + bh + 0.5, zFace + 0.3], [bx1 - 0.3, yB + bh + 0.62, bz1 - 0.3], { color: IMP.wallDark, texel: 0.5 });
    kit.cyl(RIB, 0, yB + bh + 1.6, 106, 0.1, 2.2, "y", { color: IMP.darkMetal, segments: 8, texel: 1 });
    kit.box("emitRed", 0, yB + bh + 2.8, 106, 0.3, 0.2, 0.3);
    for (const sx of [-1, 1]) kit.box(RIB, sx * 8, yB + bh + 0.9, 104, 1.2, 0.6, 0.8, { color: IMP.darkMetal, texel: 1 });
    // booth ceiling: light strips
    for (const x of [-6, 0, 6]) kit.boxMM("lightBand", [x - 2, yB + bh - 0.03, 102], [x + 2, yB + bh - 0.01, 106.5], { uv: "keep" });
    // interior: console row along the glass facing the bay (+z), chairs, back-wall boards, wall console
    for (const x of [-7, 0, 7]) {
      impConsole(kit, ctx, [x, yB, bz1 - 1.9], Math.PI, { kind: "wide", width: 2.6, screens: 3, seed: 30 + x, light: false });
      chair(kit, [x, yB, bz1 - 2.6], Math.PI);
    }
    {
      const { frame } = wallFrame(kit, [bx0 + t, zFace + 0.02], [bx1 - t, zFace + 0.02], yB);
      statusBoard(frame, 6, 1.9, 8, 1.6, { seed: 31 });
      statusBoard(frame, 17.5, 1.9, 8, 1.6, { seed: 32 });
      wallScreen(frame, 11.75, 2.0, 1.6, 1.0, 1);
    }
    impConsole(kit, ctx, [bx0 + t + 0.64, yB, 104.5], Math.PI / 2, { kind: "wall", width: 2.4, seed: 33, light: false });
    pointLightDesc(ctx, 0x8fb0ff, 9, 14, [-4, yB + 2.4, 104.5], 1);
    pointLightDesc(ctx, 0x8fb0ff, 9, 14, [6, yB + 2.4, 104.5], 0);
    // landing east of the booth + the long stair from the deck along the north wall
    const landX1 = 15.6;
    slab(kit, ctx, [bx1, zFace, landX1, bz1], yB, { rails: ["s"] });
    railing(kit, [landX1 - 0.08, 103.0], [landX1 - 0.08, bz1], yB, { h: 1.1, lit: true });
    stairs(kit, ctx, [34.5, 101.75], [-1, 0], 2.4, y, yB, { tread: 0.3 });
    kit.boxMM(RIB, [landX1 - 0.2, slabBot, zFace], [landX1, yB - 0.3, bz1], { color: IMP.trim, texel: 0.5 });
    pillar(kit, landX1 - 0.6, bz1 - 0.6, y, slabBot, 0.7);
  }

  // =========================================================================================
  // Deck equipment: parked fighters, refuelling, carts, crates, gantries, flood masts, cranes
  // =========================================================================================
  // parked fighters on pads 1 and 4 (wing bottoms on the deck)
  addTIE(kit, [pads[0].x, y + 3.75, pads[0].z], 0.25, { lod: 0 });
  addTIE(kit, [pads[3].x, y + 3.75, pads[3].z], Math.PI - 0.3, { lod: 0 });
  serviceGantry(kit, [pads[0].x - 7.5, y, pads[0].z + 1], Math.PI / 2, { h: 3.4 });
  serviceGantry(kit, [pads[3].x + 7.5, y, pads[3].z - 1], -Math.PI / 2, { h: 3.4 });
  bowser(kit, [pads[0].x + 8, y, pads[0].z + 5], 0.4);
  bowser(kit, [pads[3].x - 8.5, y, pads[3].z - 5], Math.PI + 0.3);
  bowser(kit, [pads[1].x + 6, y, pads[1].z + 8], -0.2);
  hoseReel(kit, [x0 + 1.4, y, 168], Math.PI / 2);
  hoseReel(kit, [x0 + 1.4, y, 214], Math.PI / 2);
  hoseReel(kit, [x1 - 1.4, y, 168], -Math.PI / 2);
  hoseReel(kit, [x1 - 1.4, y, 214], -Math.PI / 2);
  hoseReel(kit, [x0 + 1.4, y, 262], Math.PI / 2);
  hoseReel(kit, [x1 - 1.4, y, 126], -Math.PI / 2);
  // fuel manifold lines along the wall bases feeding the reels
  pipeRun(kit, [[x0 + 0.9, y + 0.9, 110], [x0 + 0.9, y + 0.9, 280]], 0.18, { color: IMP.steel });
  pipeRun(kit, [[x0 + 0.9, y + 1.4, 110], [x0 + 0.9, y + 1.4, 280]], 0.12, { color: IMP.gunmetal });
  pipeRun(kit, [[x1 - 0.9, y + 0.9, 110], [x1 - 0.9, y + 0.9, 280]], 0.18, { color: IMP.steel });
  pipeRun(kit, [[x1 - 0.9, y + 1.4, 110], [x1 - 0.9, y + 1.4, 280]], 0.12, { color: IMP.gunmetal });
  // tool carts and crate stacks
  toolCart(kit, [pads[0].x + 6, y, pads[0].z - 6], 0.3, { seed: 1 });
  toolCart(kit, [pads[3].x - 6, y, pads[3].z + 6], 2.4, { seed: 2 });
  toolCart(kit, [pads[1].x - 3, y, pads[1].z - 2], 1.1, { seed: 3 });
  toolCart(kit, [pads[2].x + 2, y, pads[2].z + 3], -0.7, { seed: 4 });
  crateStack(kit, [x0 + 4, y, 250], 0.1, { seed: 11, n: 2 });
  crateStack(kit, [x0 + 4, y, 253.5], -0.05, { seed: 14, n: 3, size: [2, 1.2, 1.6] });
  crateStack(kit, [x0 + 7.5, y, 250.5], 0.2, { seed: 17, n: 1 });
  crateStack(kit, [x1 - 4, y, 128], 0.1, { seed: 21, n: 2 });
  crateStack(kit, [x1 - 4, y, 131.5], 0, { seed: 24, n: 2, size: [2, 1.2, 1.6] });
  crateStack(kit, [x1 - 8, y, 129], -0.3, { seed: 27, n: 1 });
  crateStack(kit, [-20, y, z1 - 6], 0.15, { seed: 31, n: 2 });
  crateStack(kit, [-16.5, y, z1 - 6], -0.1, { seed: 34, n: 3, size: [2, 1.2, 1.6] });
  crateStack(kit, [22, y, z0 + 8], 0.3, { seed: 41, n: 2 });
  // floodlight masts at the well corners (points), panels aimed at the well — the big spots come
  // from the ceiling
  const yawTo = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
  for (const [mx, mz] of [[W.x0 - 6, W.z0 - 6], [W.x1 + 6, W.z0 - 6], [W.x0 - 6, W.z1 + 6], [W.x1 + 6, W.z1 + 6]]) {
    floodMast(kit, ctx, [mx, y, mz], yawTo(mx, mz, wellCX, wellCZ), { h: 8, intensity: 40, distance: 44, priority: 1 });
  }

  // cranes: rails on wall brackets over both end decks; the south crane travels
  const craneY = yC - 4.0;
  for (const [za, zb] of [[z0 + 2, W.z0 - 2], [W.z1 + 2, z1 - 2]]) {
    for (const sx of [-1, 1]) {
      const rx = sx * (x1 - t - 1.0);
      kit.boxMM(RIB, [rx - 0.5, craneY - 0.6, za], [rx + 0.5, craneY, zb], { color: IMP.trim, texel: 0.5 });
      kit.boxMM("impMetal", [rx - 0.25, craneY, za], [rx + 0.25, craneY + 0.12, zb], { color: IMP.steel });
      for (let z = za + 3; z < zb; z += 6) kit.box(RIB, sx * (x1 - t - 0.5), craneY - 1.0, z, 1.0, 1.6, 0.5, { color: IMP.darkMetal, texel: 1 });
    }
  }
  // bridge crane geometry at origin [ox, oy, oz] (origin = bridge centre at rail height)
  const craneParts = (k, trolleyX, hookDrop, [ox, oy, oz] = [0, 0, 0]) => {
    const L = 2 * (x1 - t - 1.0);
    const B = (mat, x, yy, z, sx, sy, sz, o = {}) => k.box(mat, ox + x, oy + yy, oz + z, sx, sy, sz, o);
    B(RIB, 0, 0.9, 0, L, 1.6, 1.2, { color: IMP.wallDark, texel: 0.5 });
    B(RIB, 0, 0.9, 0, L, 0.3, 1.4, { color: IMP.trim, texel: 0.5 });
    B("hazard", 0, 1.75, 0, L, 0.14, 1.22, { uv: "world", texel: 1 });
    for (const sx of [-1, 1]) B(RIB, sx * (L / 2 - 0.6), 0.6, 0, 1.6, 1.4, 2.4, { color: IMP.darkMetal, texel: 1 });
    for (const sx of [-1, 1]) B("emitAmber", sx * (L / 2 - 1.4), 1.8, 0, 0.5, 0.12, 0.5);
    // trolley + hoist + cable + hook block
    B(RIB, trolleyX, 0.1, 0, 3.0, 1.2, 2.2, { color: IMP.darkMetal, texel: 1 });
    k.cyl("impMetal", ox + trolleyX, oy - 0.3, oz, 0.5, 1.6, "x", { color: IMP.gunmetal, segments: 14 });
    B("emitAmber", trolleyX, 0.72, 1.12, 1.4, 0.08, 0.01);
    B("impMetal", trolleyX, -hookDrop / 2 - 0.5, 0, 0.06, hookDrop, 0.06, { color: IMP.steel });
    B(RIB, trolleyX, -hookDrop - 0.9, 0, 1.2, 0.8, 0.6, { color: IMP.hazardYellow, texel: 1 });
    B("impMetal", trolleyX, -hookDrop - 1.7, 0, 0.2, 0.9, 0.5, { color: IMP.steel });
    B("impMetal", trolleyX, -hookDrop - 2.1, 0, 4.0, 0.16, 0.2, { color: IMP.steel });
  };
  // north crane: static, baked into the room kit; south crane: its own meshes, driven by the animator
  craneParts(kit, -30, 9, [0, craneY, 116]);
  const crane = bakeGroup(mats, (k) => craneParts(k, 22, 12));
  crane.position.set(0, craneY, 270);
  ctx.add(crane);

  // =========================================================================================
  // Lights
  // =========================================================================================
  // big cool floodlights: spot descriptors with shadow (two are live at any time — the nearest)
  const spotI = 2600;
  spotLightDesc(ctx, 0xdfe8ff, spotI, 70, [-40, yC - 1, 116], [-40, y, 118], { angle: 0.85, penumbra: 0.5, shadow: true, priority: 2 });
  spotLightDesc(ctx, 0xdfe8ff, spotI, 70, [40, yC - 1, 116], [40, y, 118], { angle: 0.85, penumbra: 0.5, shadow: true, priority: 2 });
  spotLightDesc(ctx, 0xdfe8ff, spotI, 70, [-40, yC - 1, 274], [-40, y, 272], { angle: 0.85, penumbra: 0.5, shadow: true, priority: 2 });
  spotLightDesc(ctx, 0xdfe8ff, spotI, 70, [40, yC - 1, 274], [40, y, 272], { angle: 0.85, penumbra: 0.5, shadow: true, priority: 2 });
  spotLightDesc(ctx, 0xdfe8ff, spotI, 70, [-42, yC - 1, 190], [-42, y, 190], { angle: 0.85, penumbra: 0.5, shadow: true, priority: 2 });
  spotLightDesc(ctx, 0xdfe8ff, spotI, 70, [42, yC - 1, 190], [42, y, 190], { angle: 0.85, penumbra: 0.5, shadow: true, priority: 2 });
  // planet light coming up through the open well (no shadow; only bound while the doors are open)
  const planetLight = spotLightDesc(ctx, 0xa9c4ff, 1800, 120, [wellCX, W.yKeel - 30, wellCZ], [wellCX, yC, wellCZ], { angle: 0.75, penumbra: 0.6, shadow: false, priority: 0 });
  planetLight.dim = 0;
  // amber well-alert lights on the kerb, pulsing while the well is active
  const amberN = pointLightDesc(ctx, IMP.amber, 30, 46, [wellCX, y + 3, W.z0 - 3], 1);
  const amberS = pointLightDesc(ctx, IMP.amber, 30, 46, [wellCX, y + 3, W.z1 + 3], 1);
  amberN.dim = 0.15;
  amberS.dim = 0.15;
  // fill lights over the parking pads and the entrance deck (20 descriptors in total for the room)
  for (const p of pads) pointLightDesc(ctx, 0xcfd9ff, 55, 40, [p.x, y + 9, p.z], 0);
  pointLightDesc(ctx, 0xcfd9ff, 55, 40, [0, y + 8, 116], 1);

  // =========================================================================================
  // Views
  // =========================================================================================
  ctx.view("hangar", 0, y + STD.eye, 104.6, 180, 8);
  ctx.view("hangar_well", -31.5, y + STD.eye, 190, 270, -8);
  ctx.view("hangar_racks", 34, y + STD.eye, 200, 90, 32);
  // views whose feet are not on the hangar floor borrow the booth's floor height (y = -8)
  ctx.views.hangar_gantry = { x: wx + 1.4, y: GAL_LO + STD.eye, z: 172, yaw: 236, pitch: -6, room: "flightControl" };
  ctx.views.hangar_booth = { x: 0.5, y: yB + STD.eye, z: 104.4, yaw: 180, pitch: -9, room: "flightControl" };

  // =========================================================================================
  // Animation + traffic wiring
  // =========================================================================================
  const anim = { tractorHold: 0, tractorLevel: 0, wellActive: false, phase: 0, lastT: null };
  hangarBus.on("wellOpen", () => {
    blastDoors.open();
    anim.wellActive = true;
  });
  hangarBus.on("wellClose", () => {
    blastDoors.close();
    anim.wellActive = false;
  });
  hangarBus.on("passing", ({ duration }) => {
    anim.tractorHold = Math.max(anim.tractorHold, duration || 5);
  });
  hangarBus.on("rack", ({ rack, ext, clamped }) => {
    const st = rackState[rack];
    if (!st) return;
    st.target = ext;
    st.clamped = clamped;
    if (clamped) st.ext = ext; // the ram carries the fighter: follow exactly
  });
  ctx.animate((dt, tNow) => {
    // the room was hidden for a while: catch up instantly instead of animating stale transitions
    const snap = anim.lastT !== null && tNow - anim.lastT > 0.5;
    anim.lastT = tNow;
    // blast doors
    const dk = dt / blastDoors.travelTime;
    if (snap) blastDoors.k = blastDoors.target;
    else if (blastDoors.k < blastDoors.target) blastDoors.k = Math.min(blastDoors.target, blastDoors.k + dk);
    else if (blastDoors.k > blastDoors.target) blastDoors.k = Math.max(blastDoors.target, blastDoors.k - dk);
    doorPose(blastDoors.k);
    planetLight.dim = smooth(blastDoors.k);
    planetLight.priority = blastDoors.k > 0.05 ? 3 : 0;
    // beacons: slow idle spin, fast and bright while the well is active
    const active = anim.wellActive || blastDoors.k > 0.02;
    anim.phase += dt * (active ? 4.2 : 0.9);
    const pulse = 0.5 + 0.5 * Math.sin(tNow * 6);
    poseLobes(anim.phase, active ? 0.9 + 0.3 * pulse : 0.3);
    const amber = active ? 0.55 + 0.45 * pulse : 0.15;
    amberN.dim = amber;
    amberS.dim = amber;
    // tractor cones fade in while a fighter transits the shaft
    anim.tractorHold = Math.max(0, anim.tractorHold - dt);
    const want = anim.tractorHold > 0 ? 1 : 0;
    anim.tractorLevel = snap ? want : anim.tractorLevel + (want - anim.tractorLevel) * Math.min(1, dt * 2.5);
    tractorMat.opacity = 0.22 * anim.tractorLevel * (0.85 + 0.15 * Math.sin(tNow * 9));
    cones.visible = anim.tractorLevel > 0.01;
    // rack rams / jaws
    for (const st of rackState) {
      if (!st.clamped || snap) st.ext += (st.target - st.ext) * (snap ? 1 : Math.min(1, dt * 3));
      const jawTarget = st.clamped ? 0 : 1;
      st.jaw = snap ? jawTarget : st.jaw + (jawTarget - st.jaw) * Math.min(1, dt * 4);
    }
    poseRacks();
    // travelling crane over the south deck, trolley drifting along the bridge
    crane.position.z = 270 + 14 * Math.sin(tNow * 0.09);
    crane.position.x = 3 * Math.sin(tNow * 0.05);
  });
}
