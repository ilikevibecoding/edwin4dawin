// d4-shuttle-bay — Shuttle Bay (Deck 4, port forward).
// One raised octagonal landing pad (api.shuttlePad() publishes it; the traffic system parks a ~20 m
// shuttle with folded wings: a 12 m radius × 16 m cylinder above the pad stays clear), landing-light
// ring (pulses with t), yellow/white markings, tie-downs, a boarding gantry with a ramp to the pad edge,
// a passenger/cargo staging area, a glass bay-control booth in the forward-starboard corner, fuel +
// power umbilical posts, ceiling floods.
import * as THREE from "three";
import { rng } from "../../kit.js";
import { buildShell, floorMark, floorRect, floorDashes, WALL_T } from "../bays-shared/shell.js";
import { Placer, consoleUnit, wallScreen, handrail, stairs, crateKit, benchSeat, beaconLamp, statusPost, hose, pipe, pointLight, spotLight } from "../bays-shared/props.js";

const FLOOR = -72;
const CEIL = -50;
const B = { min: [-140, FLOOR, -40], max: [-80, CEIL, 70] };
const DOORS = [
  { id: "d4-hangar-shuttle", pos: [-80, FLOOR, 15], dir: [1, 0, 0], kind: "bay", w: 16, h: 12, to: "d4-hangar" },
  { id: "d4-shuttle-repair", pos: [-111, FLOOR, 70], dir: [0, 0, 1], kind: "standard", to: "d4-repair-bay" },
];
const PAD = { pos: [-110, FLOOR, 15], yaw: 90 };
const PAD_APOTHEM = 12;
const PAD_H = 0.3;

// Octagon helpers (flats facing the axes)
const OCT_R = PAD_APOTHEM / Math.cos(Math.PI / 8);
function octagonPad(kit, P) {
  const [cx, cy, cz] = PAD.pos;
  const top = cy + PAD_H;
  const plate = new THREE.CylinderGeometry(OCT_R, OCT_R, PAD_H, 8, 1);
  plate.rotateY(Math.PI / 8);
  kit.add("impFloor", plate, { pos: [cx, cy + PAD_H / 2, cz], color: P.impHullLight, uv: "world", texel: 0.5 });
  // dark understructure lip (proud below the plate edge) + hazard band on the vertical face
  const lip = new THREE.CylinderGeometry(OCT_R + 0.08, OCT_R + 0.08, PAD_H - 0.08, 8, 1);
  lip.rotateY(Math.PI / 8);
  kit.add("paintedMetal", lip, { pos: [cx, cy + (PAD_H - 0.08) / 2, cz], color: P.impBlack, uv: "world", texel: 1 });
  const edgeLen = 2 * (PAD_APOTHEM + 0.09) * Math.tan(Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const nx = Math.sin(a);
    const nz = Math.cos(a);
    const d = PAD_APOTHEM + 0.09;
    kit.add("hazard", new THREE.BoxGeometry(edgeLen - 0.1, 0.16, 0.03), { pos: [cx + nx * d, cy + PAD_H - 0.1, cz + nz * d], rot: [0, a, 0], texel: 1.5 });
    // yellow outline ring on top (inset 0.5 m)
    const d2 = PAD_APOTHEM - 0.6;
    const len2 = 2 * d2 * Math.tan(Math.PI / 8);
    kit.add("painted", new THREE.BoxGeometry(len2 + 0.1, 0.012, 0.28), { pos: [cx + nx * d2, top + 0.006, cz + nz * d2], rot: [0, a, 0], color: P.impAmber, texel: 1 });
    // landing lights: two per edge at 1/3 and 2/3, in dark housings (padLight pulses in update)
    const d3 = PAD_APOTHEM - 1.4;
    const half = d3 * Math.tan(Math.PI / 8);
    for (const t of [-0.5, 0.5]) {
      const tx = -nz * (half * t);
      const tz = nx * (half * t);
      const px = cx + nx * d3 + tx;
      const pz = cz + nz * d3 + tz;
      kit.add("paintedMetal", new THREE.BoxGeometry(0.7, 0.08, 0.7), { pos: [px, top + 0.04, pz], rot: [0, a, 0], color: P.impBlack, texel: 2 });
      kit.add("padLight", new THREE.BoxGeometry(0.5, 0.03, 0.5), { pos: [px, top + 0.085, pz], rot: [0, a, 0], uv: "keep" });
    }
    // tie-down rings at r 8.5 on the edge normals
    const d4 = 8.5;
    kit.add("paintedMetal", new THREE.CylinderGeometry(0.42, 0.42, 0.02, 16), { pos: [cx + nx * d4, top + 0.005, cz + nz * d4], color: P.impBlack, uv: "world", texel: 1 });
    kit.add("metal", new THREE.TorusGeometry(0.22, 0.035, 6, 16), { pos: [cx + nx * d4, top + 0.035, cz + nz * d4], rot: [Math.PI / 2, 0, 0], color: P.impGrey, uv: "scale", uvScale: [4, 1] });
  }
  // white centre marks: circle + cross + inner amber lamps ring
  kit.add("painted", new THREE.RingGeometry(5.6, 5.95, 48), { pos: [cx, top + 0.012, cz], rot: [-Math.PI / 2, 0, 0], color: P.impWhite, uv: "keep" });
  kit.boxMM("painted", [cx - 0.15, top + 0.006, cz - 4.5], [cx + 0.15, top + 0.016, cz + 4.5], { color: P.impWhite, texel: 1 });
  kit.boxMM("painted", [cx - 4.5, top + 0.006, cz - 0.15], [cx + 4.5, top + 0.016, cz + 0.15], { color: P.impWhite, texel: 1 });
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    const px = cx + Math.sin(a) * 6.8;
    const pz = cz + Math.cos(a) * 6.8;
    kit.add("paintedMetal", new THREE.BoxGeometry(0.5, 0.08, 0.5), { pos: [px, top + 0.04, pz], rot: [0, a, 0], color: P.impBlack, texel: 2 });
    kit.add("emitAmber", new THREE.BoxGeometry(0.34, 0.03, 0.34), { pos: [px, top + 0.085, pz], rot: [0, a, 0], uv: "keep" });
  }
  // colliders approximating the octagon (three overlapping AABBs)
  const s = PAD_APOTHEM + 0.1;
  const k = 7.05; // half-width of the flats
  kit.collider([cx - s, cy, cz - k], [cx + s, cy + PAD_H, cz + k], "pad");
  kit.collider([cx - k, cy, cz - s], [cx + k, cy + PAD_H, cz + s], "pad");
  kit.collider([cx - 9.6, cy, cz - 9.6], [cx + 9.6, cy + PAD_H, cz + 9.6], "pad");
}

// Umbilical post: base, column with connector panels, status lamps, a coiled hose and a floor mark.
function umbilicalPost(kit, P, x, z, yawDeg, kind) {
  const pl = new Placer(kit, [x, FLOOR, z], yawDeg);
  floorRect(kit, x - 1.4, z - 1.4, x + 1.4, z + 1.4, FLOOR, kind === "fuel" ? P.impAmber : P.impWhite, 0.12);
  pl.box("paintedMetal", 0, 0.1, 0, 1.3, 0.2, 1.3, { color: P.impBlack, texel: 1.5 });
  pl.box("hazard", 0, 0.1, 0, 1.32, 0.14, 1.32, { texel: 2 });
  pl.box("paintedMetal", 0, 1.3, 0, 0.7, 2.2, 0.7, { color: P.impDark, texel: 1.5 });
  pl.box("paintedMetal", 0, 2.5, 0, 0.8, 0.2, 0.8, { color: P.impBlack, texel: 1.5 });
  // connector panel on the pad-facing side (-z local)
  pl.box("paintedMetal", 0, 1.35, -0.37, 0.56, 1.1, 0.06, { color: P.impBlack, texel: 2 });
  for (let i = 0; i < 3; i++) pl.cyl("metal", -0.16 + i * 0.16, 1.6, -0.42, 0.055, 0.1, "z", { color: P.impGrey, segments: 10 });
  for (let i = 0; i < 2; i++) pl.cyl("metal", -0.1 + i * 0.2, 1.25, -0.43, 0.08, 0.12, "z", { color: kind === "fuel" ? P.impAmber : P.impBlue, segments: 12 });
  pl.box(kind === "fuel" ? "emitAmber" : "emitBlue", 0, 2.0, -0.41, 0.4, 0.06, 0.02);
  pl.box("emitRedImp", 0.18, 0.95, -0.41, 0.08, 0.08, 0.02);
  pl.box("emitBlue", -0.18, 0.95, -0.41, 0.08, 0.08, 0.02);
  beaconLamp(kit, P, x, FLOOR + 2.6, z, kind === "fuel" ? "emitAmber" : "emitBlue", { r: 0.12 });
  // coiled hose beside the base (flat torus) + a hose up into the panel
  const c = pl.point(0.9, 0, 0.5);
  kit.add("paintedMetal", new THREE.TorusGeometry(0.42, 0.07, 8, 20), { pos: [c[0], FLOOR + 0.07, c[2]], rot: [Math.PI / 2, 0, 0], color: P.impBlack, uv: "scale", uvScale: [6, 1] });
  kit.add("paintedMetal", new THREE.TorusGeometry(0.34, 0.07, 8, 20), { pos: [c[0], FLOOR + 0.2, c[2]], rot: [Math.PI / 2, 0, 0], color: P.impBlack, uv: "scale", uvScale: [6, 1] });
  hose(kit, "paintedMetal", [c[0], FLOOR + 0.25, c[2]], pl.point(0.1, 1.25, -0.45), -0.3, 0.06, P.impBlack);
  kit.collider([x - 0.7, FLOOR, z - 0.7], [x + 0.7, FLOOR + 2.6, z + 0.7], "umbilical");
}

export default {
  id: "d4-shuttle-bay",
  name: "Shuttle Bay",
  kind: "room",
  deck: 4,
  owner: "D",
  bounds: B,
  doors: DOORS,
  lift: null,
  spawn: { pos: [-100, FLOOR, 50], yaw: 20 },
  apertures: [],
  views: {
    "d4-shuttle-bay-door": { pos: [-82.5, FLOOR, 15], yaw: 90, pitch: 4 },
    "d4-shuttle-bay-pad": { pos: [-99, FLOOR, 46], yaw: 22, pitch: 5 },
    "d4-shuttle-bay-gantry": { pos: [-121, FLOOR, -13], yaw: -140, pitch: 6 },
    "d4-shuttle-bay-staging": { pos: [-83, FLOOR, 57], yaw: 56, pitch: 3 },
    "d4-shuttle-bay-booth": { pos: [-93, FLOOR, -27], yaw: -46, pitch: 4 },
  },
  materials(shared) {
    // pulsing landing-light emitter (animated in update)
    return { padLight: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, emissive: new THREE.Color("#dfe9ff"), emissiveIntensity: 2.2, roughness: 0.5, metalness: 0 }) };
  },
  build(ctx) {
    const { kit, PALETTE: P } = ctx;
    const rand = rng(ctx.seed);
    buildShell(ctx, {
      bounds: B,
      doors: DOORS,
      seed: 23,
      floor: { color: P.impMid, plate: 6 },
      services: { v: 6.0 },
      ceiling: { beamAxis: "x", beamSpacing: 11, fixtureRows: 2, fixturesPerRow: 6, fixtureLen: 7, fixtureW: 1.0 },
    });
    const [px, , pz] = PAD.pos;

    // ---- landing pad
    octagonPad(kit, P);
    // approach lane from the bay door to the pad edge (pad flat at x = -98 for z 15 ± 4.97)
    floorMark(kit, -80 - WALL_T - 1.2, pz - 8.2, -97.6, pz - 8.0, FLOOR, P.impAmber);
    floorMark(kit, -80 - WALL_T - 1.2, pz + 8.0, -97.6, pz + 8.2, FLOOR, P.impAmber);
    floorDashes(kit, -82, pz, -97.4, pz, FLOOR, P.impWhite, { w: 0.2, dash: 1.6, gapLen: 1.0 });
    for (let i = 0; i < 4; i++) floorMark(kit, -84.2 - i * 3.2, pz - 7.2, -83.8 - i * 3.2, pz + 7.2, FLOOR, i % 2 ? P.impAmber : P.impWhite, { h: 0.011 });
    // keep-clear ring around the pad (dashed amber octagon at apothem 14.5)
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const d = 14.5;
      const len = 2 * d * Math.tan(Math.PI / 8);
      const nx = Math.sin(a);
      const nz = Math.cos(a);
      for (let s = -len / 2 + 0.6; s < len / 2 - 0.6; s += 2.0) {
        const ex = -nz;
        const ez = nx;
        kit.add("painted", new THREE.BoxGeometry(1.2, 0.012, 0.16), { pos: [px + nx * d + ex * s, FLOOR + 0.006, pz + nz * d + ez * s], rot: [0, a, 0], color: P.impAmber, texel: 1 });
      }
    }

    // light bollards at the keep-clear ring corners (1.1 m posts, amber caps) — outside the clear cylinder
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      const r = 14.5 / Math.cos(Math.PI / 8) + 0.5;
      const bx = px + Math.sin(a) * r;
      const bz = pz + Math.cos(a) * r;
      kit.cyl("paintedMetal", bx, FLOOR + 0.55, bz, 0.14, 1.1, "y", { color: P.impDark, segments: 10 });
      kit.cyl("paintedMetal", bx, FLOOR + 0.06, bz, 0.26, 0.12, "y", { color: P.impBlack, segments: 12 });
      kit.cyl("emitAmber", bx, FLOOR + 1.16, bz, 0.15, 0.12, "y", { segments: 12 });
      kit.cyl("paintedMetal", bx, FLOOR + 1.25, bz, 0.17, 0.06, "y", { color: P.impBlack, segments: 12 });
      kit.collider([bx - 0.26, FLOOR, bz - 0.26], [bx + 0.26, FLOOR + 1.3, bz + 0.26], "bollard");
    }
    // mobile boarding-stair truck parked at the pad's -x flat (top landing at the pad edge, x = -122.2)
    {
      const pl = new Placer(kit, [px - 12.2, FLOOR, pz], 90); // local +z → world +x (stairs rise toward the pad)
      // chassis + wheels
      pl.box("paintedMetal", 0, 0.55, -4.6, 2.2, 0.5, 5.6, { color: P.impMid, texel: 1.5 });
      pl.box("hazard", 0, 0.55, -4.6, 2.22, 0.2, 5.62, { texel: 2 });
      for (const [sx, sz] of [[-1, -2.4], [1, -2.4], [-1, -6.6], [1, -6.6]]) pl.cyl("paintedMetal", sx * 1.0, 0.36, sz, 0.36, 0.3, "x", { color: P.impBlack, segments: 14 });
      // stair flight from the chassis top (0.8) up to the landing at 3.4, rising toward +z (the pad)
      stairs(new Placer(kit, pl.point(0, 0.8, -7.4), 90), P, { w: 1.6, steps: 13, rise: 0.2, run: 0.4, collide: false });
      // landing platform at the pad end
      pl.box("paintedMetal", 0, 3.35, -1.2, 1.9, 0.12, 2.2, { color: P.impDark, texel: 1.5 });
      pl.box("impFloor", 0, 3.43, -1.2, 1.8, 0.04, 2.1, { color: P.impGrey, texel: 0.5 });
      for (const sx of [-1, 1]) {
        pl.box("paintedMetal", sx * 0.95, 4.0, -1.2, 0.06, 1.1, 2.2, { color: P.impBlack, texel: 2 });
        pl.cyl("metal", sx * 0.95, 4.5, -1.2, 0.03, 2.2, "z", { color: P.impGrey, segments: 8 });
      }
      pl.box("paintedMetal", 0, 4.0, -2.35, 1.9, 1.1, 0.06, { color: P.impBlack, texel: 2 });
      // support tower under the landing + hydraulic ram
      pl.box("paintedMetal", 0, 1.95, -1.6, 0.9, 2.7, 0.9, { color: P.impDark, texel: 1.5 });
      pl.cyl("metal", 0.7, 2.0, -3.4, 0.12, 2.6, "y", { color: P.impGrey, segments: 10, rot: [0.5, 0, 0] });
      pl.box("emitAmber", 0, 4.25, -2.38, 0.6, 0.06, 0.02);
      beaconLamp(kit, P, ...pl.point(0.8, 4.55, -2.3), "emitAmber", { r: 0.1 });
      pl.collider([-1.2, 0, -7.6], [1.2, 4.6, -0.1], "stair-truck");
    }
    // mobile power unit beside the stair truck: boxy generator on wheels with a cable to the power post
    {
      const pl = new Placer(kit, [px - 16.5, FLOOR, pz - 3.0], 20);
      pl.box("paintedMetal", 0, 0.9, 0, 1.6, 1.3, 2.6, { color: P.impDark, texel: 1.5 });
      pl.box("paintedMetal", 0, 1.62, 0, 1.4, 0.16, 2.3, { color: P.impBlack, texel: 1.5 });
      pl.box("hazard", 0, 0.3, 0, 1.62, 0.16, 2.62, { texel: 2 });
      for (let i = 0; i < 6; i++) pl.box("paintedMetal", -0.81, 0.9, -1.0 + i * 0.4, 0.02, 0.9, 0.06, { color: P.impMid });
      for (let i = 0; i < 3; i++) pl.cyl("metal", 0.82, 1.1, -0.5 + i * 0.4, 0.07, 0.1, "x", { color: P.impBlue, segments: 10 });
      pl.box("emitBlue", 0.82, 1.4, 0, 0.02, 0.06, 0.5);
      pl.box("emitRedImp", 0.82, 0.7, -0.9, 0.02, 0.08, 0.08);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pl.cyl("paintedMetal", sx * 0.7, 0.22, sz * 0.95, 0.22, 0.2, "x", { color: P.impBlack, segments: 12 });
      pl.collider([-0.9, 0, -1.4], [0.9, 1.8, 1.4], "power-unit");
      hose(kit, "paintedMetal", pl.point(0.9, 1.1, -0.1), [px - 11.3 - 0.4, FLOOR + 1.25, pz - 11.3 + 0.45], 0.9, 0.05, P.impBlack, { segments: 16 });
    }

    // ---- umbilical posts on the diagonals (r = 16, outside the keep-clear ring), connectors facing the pad
    umbilicalPost(kit, P, px - 11.3, pz - 11.3, -135, "power");
    umbilicalPost(kit, P, px + 11.3, pz - 11.3, 135, "fuel");
    umbilicalPost(kit, P, px - 11.3, pz + 11.3, -45, "fuel");
    umbilicalPost(kit, P, px + 11.3, pz + 11.3, 45, "power");

    // ---- boarding gantry (forward of the pad, z ≤ 2.4): raised deck on columns, rails, stairs from the
    //      floor on the forward side, ramp down to the pad edge, retracted boarding bridge on top
    const gY = FLOOR + 2.4;
    const gx0 = px - 4.5;
    const gx1 = px + 4.5;
    const gz0 = pz - 22.5; // -7.5
    const gz1 = pz - 13.0; // 2.0
    kit.boxMM("paintedMetal", [gx0, gY - 0.35, gz0], [gx1, gY, gz1], { color: P.impDark, texel: 1 });
    kit.boxMM("impFloor", [gx0 + 0.05, gY, gz0 + 0.05], [gx1 - 0.05, gY + 0.04, gz1 - 0.05], { color: P.impGrey, texel: 0.5 });
    kit.boxMM("hazard", [gx0 - 0.02, gY - 0.33, gz0], [gx1 + 0.02, gY - 0.05, gz0 + 0.02], { texel: 1.5 });
    for (const x of [gx0 + 0.5, gx1 - 0.5]) for (const z of [gz0 + 0.6, (gz0 + gz1) / 2, gz1 - 0.6]) kit.box("paintedMetal", x, (FLOOR + gY - 0.35) / 2, z, 0.5, gY - 0.35 - FLOOR, 0.5, { color: P.impDark, texel: 1 });
    handrail(kit, P, [gx0 + 0.05, gz0 + 0.05], [gx0 + 0.05, gz1 - 0.05], gY + 0.04, { collide: false });
    handrail(kit, P, [gx1 - 0.05, gz0 + 0.05], [gx1 - 0.05, gz1 - 0.05], gY + 0.04, { collide: false });
    handrail(kit, P, [gx0 + 0.05, gz0 + 0.05], [px - 1.0, gz0 + 0.05], gY + 0.04, { collide: false });
    handrail(kit, P, [px + 1.0, gz0 + 0.05], [gx1 - 0.05, gz0 + 0.05], gY + 0.04, { collide: false });
    // stairs up from the floor on the forward side (rise toward +z onto the deck at gz0)
    stairs(new Placer(kit, [px, FLOOR, gz0 - 4.2], 0), P, { w: 1.8, steps: 14, rise: 2.4 / 14, run: 0.3 });
    // ramp from the deck down to the pad edge (top at gz1, bottom on the pad top at z = pz - 12 + 0.1)
    {
      const zTop = gz1;
      const zBot = pz - PAD_APOTHEM - 0.1; // 2.9
      const yTop = gY;
      const yBot = FLOOR + PAD_H;
      const L = Math.hypot(zBot - zTop, yBot - yTop);
      const ang = Math.atan2(yTop - yBot, zBot - zTop);
      const cz = (zTop + zBot) / 2;
      const cy = (yTop + yBot) / 2;
      kit.add("paintedMetal", new THREE.BoxGeometry(2.4, 0.12, L), { pos: [px, cy, cz], rot: [ang, 0, 0], color: P.impMid, texel: 1 });
      kit.add("hazard", new THREE.BoxGeometry(2.42, 0.02, L), { pos: [px, cy + 0.065, cz], rot: [ang, 0, 0], texel: 1.5 });
      for (const sx of [-1, 1]) {
        kit.add("paintedMetal", new THREE.BoxGeometry(0.08, 0.3, L), { pos: [px + sx * 1.24, cy + 0.05, cz], rot: [ang, 0, 0], color: P.impDark, texel: 1 });
        kit.add("metal", new THREE.CylinderGeometry(0.03, 0.03, L, 10), { pos: [px + sx * 1.24, cy + 1.05, cz], rot: [ang + Math.PI / 2, 0, 0], color: P.impGrey, uv: "scale", uvScale: [0.2, L] });
        for (const t of [0.1, 0.5, 0.9]) kit.box("paintedMetal", px + sx * 1.24, yTop + (yBot - yTop) * t + 0.5, zTop + (zBot - zTop) * t, 0.06, 1.0, 0.06, { color: P.impBlack, texel: 2 });
      }
      kit.collider([px - 1.3, FLOOR, zTop - 0.1], [px + 1.3, gY + 1.1, zBot], "ramp");
    }
    // retracted boarding bridge on the deck (a boxy telescoping tunnel pointing at the pad, ends at z = 2.4)
    kit.boxMM("paintedMetal", [px - 1.3, gY + 0.04, gz0 + 1.0], [px + 1.3, gY + 2.6, gz1 + 0.4], { color: P.impMid, texel: 1 });
    kit.boxMM("paintedMetal", [px - 1.15, gY + 0.3, gz1 + 0.38], [px + 1.15, gY + 2.4, gz1 + 0.42], { color: P.impBlack, texel: 1 });
    kit.boxMM("hazard", [px - 1.32, gY + 2.2, gz1 - 0.2], [px + 1.32, gY + 2.5, gz1 + 0.42], { texel: 1.5 });
    kit.boxMM("emitCool", [px - 0.9, gY + 2.62, gz0 + 1.2], [px + 0.9, gY + 2.65, gz1 + 0.2], { uv: "keep" });
    for (const sx of [-1, 1]) kit.boxMM("emitRedImp", [px + sx * 1.1 - 0.08, gY + 2.3, gz1 + 0.42], [px + sx * 1.1 + 0.08, gY + 2.42, gz1 + 0.45]);
    kit.collider([gx0, FLOOR, gz0], [gx1, gY + 1.1, gz1], "gantry");
    // edge light strips under the deck lip + a lit mouth frame on the bridge end
    kit.boxMM("emitCool", [gx0 + 0.3, gY - 0.36, gz0 + 0.3], [gx0 + 0.36, gY - 0.33, gz1 - 0.3], { uv: "keep" });
    kit.boxMM("emitCool", [gx1 - 0.36, gY - 0.36, gz0 + 0.3], [gx1 - 0.3, gY - 0.33, gz1 - 0.3], { uv: "keep" });
    kit.boxMM("emitCool", [px - 1.28, gY + 0.32, gz1 + 0.43], [px - 1.2, gY + 2.36, gz1 + 0.45], { uv: "keep" });
    kit.boxMM("emitCool", [px + 1.2, gY + 0.32, gz1 + 0.43], [px + 1.28, gY + 2.36, gz1 + 0.45], { uv: "keep" });
    kit.boxMM("emitCool", [px - 1.28, gY + 2.36, gz1 + 0.43], [px + 1.28, gY + 2.44, gz1 + 0.45], { uv: "keep" });
    // gantry consoles (boarding control) at the deck's forward corners face the pad
    consoleUnit(new Placer(kit, [gx1 - 1.2, gY + 0.04, gz0 + 1.2], 0), P, { w: 1.4, screens: ["screenImp1"], indicators: 1, collide: false });
    statusPost(kit, P, gx0 - 0.9, FLOOR, gz1 + 0.3);
    statusPost(kit, P, gx1 + 0.9, FLOOR, gz1 + 0.3);

    // ---- passenger / cargo staging (aft-starboard, near the spawn): benches, queue rails, crates, board
    floorRect(kit, -100, 42, -83, 66, FLOOR, P.impWhite, 0.15);
    floorDashes(kit, -100, 42, -100, 66, FLOOR, P.impAmber, { w: 0.15, dash: 1.0, gapLen: 0.6 });
    for (let i = 0; i < 3; i++) {
      benchSeat(new Placer(kit, [-88.5, FLOOR, 46 + i * 3.0], 0), P, { len: 4.0 });
      benchSeat(new Placer(kit, [-93.5, FLOOR, 46 + i * 3.0], 0), P, { len: 4.0 });
    }
    // queue rail (two lines of posts with a rail) leading toward the pad approach
    handrail(kit, P, [-97.5, 44], [-97.5, 62], FLOOR, { postEvery: 2.0 });
    handrail(kit, P, [-96.0, 44], [-96.0, 62], FLOOR, { postEvery: 2.0 });
    floorDashes(kit, -96.75, 44, -96.75, 62, FLOOR, P.impWhite, { w: 0.4, dash: 0.6, gapLen: 0.6 });
    // cargo stack + baggage carts by the aft wall
    const crates = [[-86.2, 62.6, 0, 0], [-87.6, 62.8, 15, 0], [-86.2, 61.2, 0, 0], [-86.2, 62.6, 0, 1.2], [-89.4, 63.2, -8, 0], [-84.6, 61.0, 5, 0]];
    for (const [x, z, yaw, y] of crates) crateKit(new Placer(kit, [x, FLOOR + y, z], yaw), P, { color: yaw % 2 ? P.impGrey : P.impMid, collide: y === 0 });
    for (let i = 0; i < 2; i++) {
      const pl = new Placer(kit, [-92.5 + i * 2.2, FLOOR, 64.5], 0);
      pl.box("paintedMetal", 0, 0.3, 0, 1.6, 0.08, 1.0, { color: P.impDark, texel: 2 });
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pl.cyl("paintedMetal", sx * 0.65, 0.12, sz * 0.38, 0.12, 0.08, "x", { color: P.impBlack, segments: 10 });
      pl.box("metal", 0, 0.9, 0.48, 1.6, 0.05, 0.05, { color: P.impGrey });
      for (const sx of [-1, 1]) pl.box("metal", sx * 0.77, 0.62, 0.48, 0.05, 0.6, 0.05, { color: P.impGrey });
      pl.box("paintedMetal", 0, 0.62, -0.05, 1.2, 0.56, 0.7, { color: P.impGrey, texel: 2 });
      pl.box("paintedMetal", 0, 1.05, -0.05, 0.9, 0.3, 0.5, { color: P.impDark, texel: 2 });
      pl.collider([-0.8, 0, -0.5], [0.8, 1.2, 0.5], "cart");
    }
    // departure board + intercom on the aft wall (pilasters at x -128/-116/-104/-92)
    wallScreen(new Placer(kit, [-86, FLOOR, 70 - WALL_T - 0.08], 0), P, { w: 3.2, h: 1.6, y: 2.3, mat: "screenImp0" });
    wallScreen(new Placer(kit, [-98, FLOOR, 70 - WALL_T - 0.08], 0), P, { w: 1.6, h: 1.0, y: 2.0, mat: "screenImp1" });

    // ---- bay-control booth in the forward-starboard corner (x -87.5..-81, z -39.3..-33): plinth, glass, console
    {
      const bx0 = -87.6;
      const bx1 = -80 - WALL_T - 0.7;
      const bz0 = -40 + WALL_T + 0.7;
      const bz1 = -33.0;
      const by = FLOOR + 0.4;
      kit.boxMM("paintedMetal", [bx0, FLOOR, bz0], [bx1, by, bz1], { color: P.impDark, texel: 1 });
      kit.boxMM("impFloor", [bx0 + 0.05, by, bz0 + 0.05], [bx1 - 0.05, by + 0.03, bz1 - 0.05], { color: P.impMid, texel: 0.5 });
      kit.boxMM("hazard", [bx0 - 0.02, FLOOR + 0.05, bz0], [bx0, by - 0.05, bz1], { texel: 1.5 });
      kit.boxMM("hazard", [bx0, FLOOR + 0.05, bz1], [bx1, by - 0.05, bz1 + 0.02], { texel: 1.5 });
      // step down toward the room on the +z side
      kit.boxMM("paintedMetal", [bx0 + 1.5, FLOOR, bz1], [bx0 + 3.0, FLOOR + 0.2, bz1 + 0.4], { color: P.impMid, texel: 1 });
      // sill wall to 1.0 m, glass 1.0..2.7, roof at 2.9 (open toward the corner walls)
      const sillH = 1.0;
      const roofY = by + 2.9;
      const sides = [
        { a: [bx0, bz0], b: [bx0, bz1], out: [-1, 0] }, // west face
        { a: [bx0, bz1], b: [bx1, bz1], out: [0, 1] }, // aft (+z) face
        { a: [bx1, bz0], b: [bx1, bz1], out: [1, 0] }, // east face (toward the wall)
        { a: [bx0, bz0], b: [bx1, bz0], out: [0, -1] }, // forward face (toward the wall)
      ];
      for (const s of sides) {
        const along = s.a[0] === s.b[0] ? "z" : "x";
        const len = along === "z" ? s.b[1] - s.a[1] : s.b[0] - s.a[0];
        const cx = (s.a[0] + s.b[0]) / 2;
        const cz = (s.a[1] + s.b[1]) / 2;
        const sx = along === "z" ? 0.16 : len;
        const sz = along === "z" ? len : 0.16;
        kit.box("paintedMetal", cx, by + sillH / 2, cz, sx, sillH, sz, { color: P.impDark, texel: 1 });
        // light-grey sill plate proud on the outward side
        kit.box("impPanel", cx + s.out[0] * 0.1, by + sillH / 2, cz + s.out[1] * 0.1, along === "z" ? 0.04 : len - 0.3, sillH - 0.14, along === "z" ? len - 0.3 : 0.04, { color: P.impGrey, uv: "keep" });
        kit.box("glass", cx, by + sillH + (roofY - by - sillH) / 2, cz, along === "z" ? 0.02 : len, roofY - by - sillH, along === "z" ? len : 0.02, { uv: "keep" });
        // mullions
        const n = Math.max(1, Math.round(len / 1.6));
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          const mx = s.a[0] + (s.b[0] - s.a[0]) * t;
          const mz = s.a[1] + (s.b[1] - s.a[1]) * t;
          kit.box("paintedMetal", mx, by + sillH + (roofY - by - sillH) / 2, mz, 0.1, roofY - by - sillH, 0.1, { color: P.impBlack, texel: 2 });
        }
        kit.box("paintedMetal", cx, roofY - 0.1, cz, along === "z" ? 0.2 : len + 0.1, 0.2, along === "z" ? len + 0.1 : 0.2, { color: P.impBlack, texel: 1 });
      }
      kit.boxMM("paintedMetal", [bx0 - 0.1, roofY - 0.2, bz0 - 0.1], [bx1 + 0.1, roofY, bz1 + 0.1], { color: P.impDark, texel: 1 });
      kit.boxMM("emitCool", [bx0 + 1.0, roofY - 0.22, bz0 + 1.0], [bx1 - 1.0, roofY - 0.2, bz0 + 1.3], { uv: "keep" });
      kit.boxMM("emitCool", [bx0 + 1.0, roofY - 0.22, bz1 - 1.3], [bx1 - 1.0, roofY - 0.2, bz1 - 1.0], { uv: "keep" });
      // console inside facing the pad (hood toward -x/+z), with a second small station
      consoleUnit(new Placer(kit, [bx0 + 2.2, by + 0.03, bz1 - 1.6], -27), P, { w: 2.4, screens: ["screenImp0", "screenImp1", "screenImp0"], indicators: 2, collide: false });
      consoleUnit(new Placer(kit, [bx1 - 1.4, by + 0.03, bz0 + 1.4], 90), P, { w: 1.4, screens: ["screenImp1"], indicators: 1, collide: false });
      kit.collider([bx0 - 0.05, FLOOR, bz0], [bx1, roofY, bz1 + 0.45], "booth");
      beaconLamp(kit, P, bx0 + 0.4, roofY, bz1 - 0.4, "emitRedImp");
    }
    // opposite forward corner: coolant/fuel tank group with pipes to the fuel umbilical
    {
      for (let i = 0; i < 3; i++) {
        const x = -136.4;
        const z = -35 + i * 3.4;
        kit.cyl("paintedMetal", x, FLOOR + 1.6, z, 1.15, 2.8, "y", { color: P.impGrey, segments: 20 });
        kit.cyl("paintedMetal", x, FLOOR + 0.5, z, 1.2, 0.24, "y", { color: P.impAmber, segments: 20 });
        kit.cyl("paintedMetal", x, FLOOR + 2.7, z, 1.2, 0.24, "y", { color: P.impAmber, segments: 20 });
        kit.cyl("paintedMetal", x, FLOOR + 3.15, z, 0.4, 0.3, "y", { color: P.impDark, segments: 12 });
        kit.box("hazard", x - 1.2, FLOOR + 1.6, z, 0.02, 0.5, 1.2, { texel: 2 });
        pipe(kit, P, [x, FLOOR + 3.3, z], [x, FLOOR + 4.0, z], 0.12, P.impGrey);
      }
      pipe(kit, P, [-136.4, FLOOR + 4.0, -35.6], [-136.4, FLOOR + 4.0, -21], 0.14, P.impAmber, { mat: "paintedMetal", flanges: 4 });
      pipe(kit, P, [-136.4, FLOOR + 4.0, -21], [-136.4, FLOOR + 0.3, -21], 0.14, P.impAmber, { mat: "paintedMetal" });
      kit.collider([-138, FLOOR, -36.5], [-135, FLOOR + 3.5, -26.8], "tanks");
      handrail(kit, P, [-134.6, -37.2], [-134.6, -26.6], FLOOR, { kick: false });
    }

    // ---- lighting
    const L = ctx.lights;
    for (const [x, z] of [[-125, -24], [-95, -24], [-127, 15], [-93, 15], [-125, 54], [-95, 54]]) L.push(pointLight([x, FLOOR + 11, z], 0xe6eeff, 260, 42, 0.55));
    L.push(pointLight([-84, FLOOR + 7, 15], 0xff4030, 40, 16, 0.5)); // red beacon wash at the bay door
    L.push(pointLight([-84, FLOOR + 2.8, -36], 0xcfe0ff, 12, 8, 0.45)); // booth interior
    L.push(pointLight([px, gY + 3.6, gz0 - 1.5], 0xe6eeff, 90, 18, 0.5)); // gantry deck
    for (const a of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
      L.push(spotLight([px + Math.sin(a) * 9, CEIL - 2.5, pz + Math.cos(a) * 9], [px, FLOOR + PAD_H, pz], 0xf2f6ff, 420, 40, 0.5, 0.5, 0.9));
    }
    L.push(spotLight([-84, CEIL - 3, 15], [-96, FLOOR, 15], 0xf2f6ff, 400, 40, 0.5, 0.5, 0.6));

    const padMat = ctx.materials.padLight;
    return {
      update(dt, t) {
        padMat.emissiveIntensity = 1.4 + 1.2 * (0.5 + 0.5 * Math.sin(t * 2.4));
      },
      api: {
        // pos.y is the pad's TOP surface: the traffic system rests the shuttle's skids on it
        shuttlePad: () => ({ pos: [PAD.pos[0], PAD.pos[1] + PAD_H, PAD.pos[2]], yaw: PAD.yaw, height: PAD_H }),
      },
    };
  },
};
