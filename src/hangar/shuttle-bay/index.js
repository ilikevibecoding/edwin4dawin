// d4-shuttle-bay — Shuttle Bay (Deck 4, port forward).
// One raised octagonal landing pad (api.shuttlePad() publishes it; the traffic system rests a ~20 m
// shuttle on the pad top: a 12 m radius × 16 m cylinder above the pad stays clear) with pulsing
// landing lights and white/yellow Imperial markings, a solid yellow keep-clear octagon that nothing
// stands on, umbilical posts and bollards outside it, a boarding-bridge gantry (retracted tunnel) clear
// of the ring, a mobile stair truck parked at the pad's -x flat, a crew ready area (Imperial benches,
// lockers, briefing board), a dark control booth recessed into the forward-starboard corner with its
// own door, coolant tanks in the opposite corner, wall gear at human height, pad key spots.
import * as THREE from "three";
import { rng } from "../../kit.js";
import { buildShell, floorMark, floorRect, floorCorners, wallJunction, crewHatch, WALL_T, YELLOW } from "../bays-shared/shell.js";
import { bayMaterials } from "../bays-shared/materials.js";
import { Placer, consoleUnit, wallScreen, handrail, stairs, crateKit, benchSeat, lockerBank, partsRack, beaconLamp, statusPost, hose, pipe, stripFixture, pointLight, spotLight } from "../bays-shared/props.js";

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
const RING_A = 14.5; // keep-clear octagon apothem (yellow line); nothing stands inside it but the pad
const LANE_Z = [15 - 8.1, 15 + 8.1];

// Octagon helpers (flats facing the axes)
const OCT_R = PAD_APOTHEM / Math.cos(Math.PI / 8);
function octagonPad(kit, P) {
  const [cx, cy, cz] = PAD.pos;
  const top = cy + PAD_H;
  const plate = new THREE.CylinderGeometry(OCT_R, OCT_R, PAD_H, 8, 1);
  plate.rotateY(Math.PI / 8);
  kit.add("bayFloor", plate, { pos: [cx, cy + PAD_H / 2, cz], color: P.impGrey, uv: "world", texel: 0.5 });
  // dark understructure lip (proud below the plate edge) + amber edge light on the vertical face
  const lip = new THREE.CylinderGeometry(OCT_R + 0.08, OCT_R + 0.08, PAD_H - 0.08, 8, 1);
  lip.rotateY(Math.PI / 8);
  kit.add("paintedMetal", lip, { pos: [cx, cy + (PAD_H - 0.08) / 2, cz], color: P.impBlack, uv: "world", texel: 1 });
  const edgeLen = 2 * (PAD_APOTHEM + 0.11) * Math.tan(Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const nx = Math.sin(a);
    const nz = Math.cos(a);
    const d = PAD_APOTHEM + 0.11;
    kit.add("emitAmber", new THREE.BoxGeometry(edgeLen - 0.4, 0.03, 0.02), { pos: [cx + nx * d, cy + PAD_H - 0.12, cz + nz * d], rot: [0, a, 0], uv: "keep" });
    // yellow outline ring on top (inset 0.6 m)
    const d2 = PAD_APOTHEM - 0.6;
    const len2 = 2 * d2 * Math.tan(Math.PI / 8);
    kit.add("painted", new THREE.BoxGeometry(len2 + 0.1, 0.012, 0.28), { pos: [cx + nx * d2, top + 0.006, cz + nz * d2], rot: [0, a, 0], color: YELLOW, texel: 1 });
    // landing lights: two per edge at 1/3 and 2/3, in dark housings (padLight pulses in update)
    const d3 = PAD_APOTHEM - 1.4;
    const half = d3 * Math.tan(Math.PI / 8);
    for (const t of [-0.5, 0.5]) {
      const px = cx + nx * d3 - nz * (half * t);
      const pz = cz + nz * d3 + nx * (half * t);
      kit.add("paintedMetal", new THREE.BoxGeometry(0.6, 0.08, 0.6), { pos: [px, top + 0.04, pz], rot: [0, a, 0], color: P.impBlack, texel: 2 });
      kit.add("padLight", new THREE.BoxGeometry(0.42, 0.03, 0.42), { pos: [px, top + 0.085, pz], rot: [0, a, 0], uv: "keep" });
    }
    // tie-down rings on the four cardinal edges only (r 8.5), so the plate does not read as a field of pucks
    if (i % 2 === 0) {
      const d4 = 8.5;
      kit.add("paintedMetal", new THREE.CylinderGeometry(0.42, 0.42, 0.02, 16), { pos: [cx + nx * d4, top + 0.005, cz + nz * d4], color: P.impBlack, uv: "world", texel: 1 });
      kit.add("metal", new THREE.TorusGeometry(0.22, 0.035, 6, 16), { pos: [cx + nx * d4, top + 0.035, cz + nz * d4], rot: [Math.PI / 2, 0, 0], color: P.impGrey, uv: "scale", uvScale: [4, 1] });
    }
  }
  // Imperial pad markings: white skid box, approach centreline along x with touchdown bars
  floorRect(kit, cx - 7.5, cz - 4.5, cx + 7.5, cz + 4.5, top, P.impWhite, 0.2);
  for (const [x0, x1] of [[cx - 10.4, cx - 2.2], [cx + 2.2, cx + 10.4]]) floorMark(kit, x0, cz - 0.12, x1, cz + 0.12, top, P.impWhite, { h: 0.012 });
  for (const x of [cx - 3.0, cx + 3.0]) floorMark(kit, x - 0.12, cz - 2.6, x + 0.12, cz + 2.6, top, P.impWhite, { h: 0.012 });
  // colliders approximating the octagon (three overlapping AABBs)
  const s = PAD_APOTHEM + 0.1;
  const k = 7.05; // half-width of the flats
  kit.collider([cx - s, cy, cz - k], [cx + s, cy + PAD_H, cz + k], "pad");
  kit.collider([cx - k, cy, cz - s], [cx + k, cy + PAD_H, cz + s], "pad");
  kit.collider([cx - 9.6, cy, cz - 9.6], [cx + 9.6, cy + PAD_H, cz + 9.6], "pad");
}

// Umbilical post: dark column on a plinth with a connector panel facing the pad, one lit lens, a coiled
// hose. Returns the connector's world point (for a cable from a ground unit).
function umbilicalPost(kit, P, x, z, yawDeg, kind) {
  const pl = new Placer(kit, [x, FLOOR, z], yawDeg);
  floorRect(kit, x - 1.4, z - 1.4, x + 1.4, z + 1.4, FLOOR, kind === "fuel" ? YELLOW : P.impWhite, 0.12);
  pl.box("paintedMetal", 0, 0.1, 0, 1.3, 0.2, 1.3, { color: P.impBlack, texel: 1.5 });
  pl.box("paintedMetal", 0, 1.3, 0, 0.7, 2.2, 0.7, { color: P.impDark, texel: 1.5 });
  pl.box("paintedMetal", 0, 2.5, 0, 0.8, 0.2, 0.8, { color: P.impBlack, texel: 1.5 });
  pl.box("emitAmber", 0, 0.9, 0, 0.71, 0.02, 0.71);
  // connector panel on the pad-facing side (-z local)
  pl.box("paintedMetal", 0, 1.35, -0.37, 0.56, 1.1, 0.06, { color: P.impBlack, texel: 2 });
  for (let i = 0; i < 3; i++) pl.cyl("metal", -0.16 + i * 0.16, 1.6, -0.42, 0.055, 0.1, "z", { color: P.impGrey, segments: 10 });
  for (let i = 0; i < 2; i++) pl.cyl("metal", -0.1 + i * 0.2, 1.25, -0.43, 0.08, 0.12, "z", { color: kind === "fuel" ? P.impAmber : P.impBlue, segments: 12 });
  pl.box("paintedMetal", 0, 2.05, -0.4, 0.5, 0.2, 0.06, { color: P.impBlack, texel: 2 });
  pl.box(kind === "fuel" ? "emitAmber" : "emitBlue", 0, 2.05, -0.435, 0.3, 0.08, 0.01);
  pl.box("emitRedImp", 0.18, 0.95, -0.41, 0.08, 0.08, 0.02);
  // coiled hose beside the base (flat torus) + a hose up into the panel
  const c = pl.point(0.9, 0, 0.5);
  kit.add("paintedMetal", new THREE.TorusGeometry(0.42, 0.07, 8, 20), { pos: [c[0], FLOOR + 0.07, c[2]], rot: [Math.PI / 2, 0, 0], color: P.impBlack, uv: "scale", uvScale: [6, 1] });
  kit.add("paintedMetal", new THREE.TorusGeometry(0.34, 0.07, 8, 20), { pos: [c[0], FLOOR + 0.2, c[2]], rot: [Math.PI / 2, 0, 0], color: P.impBlack, uv: "scale", uvScale: [6, 1] });
  hose(kit, "paintedMetal", [c[0], FLOOR + 0.25, c[2]], pl.point(0.1, 1.25, -0.45), -0.3, 0.06, P.impBlack);
  kit.collider([x - 0.7, FLOOR, z - 0.7], [x + 0.7, FLOOR + 2.6, z + 0.7], "umbilical");
  return pl.point(-0.1, 1.25, -0.5);
}

// Ring bollard: dark 1.0 m post, black base, amber ring lens, black cap
function bollard(kit, P, x, z) {
  kit.cyl("paintedMetal", x, FLOOR + 0.5, z, 0.14, 1.0, "y", { color: P.impDark, segments: 10 });
  kit.cyl("paintedMetal", x, FLOOR + 0.06, z, 0.26, 0.12, "y", { color: P.impBlack, segments: 12 });
  kit.cyl("emitAmber", x, FLOOR + 0.9, z, 0.15, 0.06, "y", { segments: 12 });
  kit.cyl("paintedMetal", x, FLOOR + 1.03, z, 0.17, 0.06, "y", { color: P.impBlack, segments: 12 });
  kit.collider([x - 0.26, FLOOR, z - 0.26], [x + 0.26, FLOOR + 1.1, z + 0.26], "bollard");
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
    "d4-shuttle-bay-pad": { pos: [-96, FLOOR, -6], yaw: 135, pitch: 4 },
    "d4-shuttle-bay-gantry": { pos: [-121, FLOOR, -13], yaw: -140, pitch: 6 },
    "d4-shuttle-bay-staging": { pos: [-83, FLOOR, 57], yaw: 56, pitch: 3 },
    "d4-shuttle-bay-booth": { pos: [-93, FLOOR, -27], yaw: -46, pitch: 4 },
  },
  materials(shared) {
    // pulsing landing-light emitter (animated in update, tuned around the bloom threshold)
    return { ...bayMaterials(shared), padLight: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, emissive: new THREE.Color("#dfe9ff"), emissiveIntensity: 1.6, roughness: 0.5, metalness: 0 }) };
  },
  build(ctx) {
    const { kit, PALETTE: P } = ctx;
    const rand = rng(ctx.seed);
    const shell = buildShell(ctx, {
      bounds: B,
      doors: DOORS,
      seed: 23,
      floor: { color: 0x3f434a, plate: 6 },
      ceiling: { beamAxis: "x", beamSpacing: 11, fixtureRows: 2, fixturesPerRow: 6, fixtureLen: 7, fixtureW: 1.0 },
    });
    const [px, , pz] = PAD.pos;

    // ---- landing pad + approach: white edge lines from the bay door to the pad flat, yellow chevrons
    //      pointing at the pad, one white hold bar
    octagonPad(kit, P);
    for (const z of LANE_Z) floorMark(kit, -80 - WALL_T - 1.2, z - 0.1, -97.6, z + 0.1, FLOOR, P.impWhite);
    floorMark(kit, -85.65, pz - 7.2, -85.35, pz + 7.2, FLOOR, P.impWhite, { h: 0.011 });
    for (const xt of [-88.5, -92.0, -95.5]) {
      for (const s of [-1, 1]) kit.add("painted", new THREE.BoxGeometry(0.25, 0.012, 3.6), { pos: [xt + 1.27, FLOOR + 0.006, pz + s * 1.27], rot: [0, s * Math.PI / 4, 0], color: YELLOW, texel: 1 });
    }
    // keep-clear octagon (solid yellow, apothem 14.5); the +x flat is left open for the approach lane
    for (let i = 0; i < 8; i++) {
      if (i === 2) continue;
      const a = (i * Math.PI) / 4;
      const len = 2 * RING_A * Math.tan(Math.PI / 8);
      kit.add("painted", new THREE.BoxGeometry(len + 0.06, 0.012, 0.14), { pos: [px + Math.sin(a) * RING_A, FLOOR + 0.006, pz + Math.cos(a) * RING_A], rot: [0, a, 0], color: YELLOW, texel: 1 });
    }
    // bollards outside the ring corners (r 17.5), none across the approach lane
    for (let i = 0; i < 8; i++) {
      if (i === 1 || i === 2) continue;
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      const r = RING_A / Math.cos(Math.PI / 8) + 1.8;
      bollard(kit, P, px + Math.sin(a) * r, pz + Math.cos(a) * r);
    }
    // umbilical posts on the diagonals at r 19 (bases clear of the ring corners), connectors facing the pad
    const powerA = umbilicalPost(kit, P, px - 13.4, pz - 13.4, -135, "power");
    umbilicalPost(kit, P, px + 13.4, pz - 13.4, 135, "fuel");
    umbilicalPost(kit, P, px - 13.4, pz + 13.4, -45, "fuel");
    umbilicalPost(kit, P, px + 13.4, pz + 13.4, 45, "power");

    // ---- mobile boarding-stair truck parked at the pad's -x flat (landing at the pad edge, x = -122.2)
    {
      const pl = new Placer(kit, [px - 12.2, FLOOR, pz], 90); // local +z → world +x (stairs rise toward the pad)
      floorCorners(kit, px - 22.2, pz - 1.9, px - 12.0, pz + 1.9, FLOOR, P.impWhite, 1.4, 0.14);
      // chassis + wheels + thin amber band
      pl.box("paintedMetal", 0, 0.55, -3.8, 2.2, 0.5, 7.2, { color: P.impDark, texel: 1.5 });
      pl.box("emitAmber", 0, 0.62, -3.8, 2.22, 0.025, 7.22);
      for (const [sx, sz] of [[-1, -1.4], [1, -1.4], [-1, -6.6], [1, -6.6]]) {
        pl.cyl("paintedMetal", sx * 1.0, 0.36, sz, 0.36, 0.3, "x", { color: P.impBlack, segments: 14 });
        pl.cyl("metal", sx * 1.16, 0.36, sz, 0.18, 0.02, "x", { color: P.impGrey, segments: 12 });
      }
      // stair flight from the chassis top (0.8) up to the landing at 3.4, rising toward +z (the pad)
      stairs(new Placer(kit, pl.point(0, 0.8, -7.4), 90), P, { w: 1.6, steps: 13, rise: 0.2, run: 0.4, collide: false });
      // landing platform (z -2.2..0) on four posts standing on the chassis, hydraulic ram under the flight
      pl.box("paintedMetal", 0, 3.35, -1.1, 1.9, 0.12, 2.2, { color: P.impDark, texel: 1.5 });
      pl.box("impPanel", 0, 3.43, -1.1, 1.8, 0.04, 2.1, { color: P.impGrey, texel: 0.5 });
      for (const sx of [-1, 1]) for (const z of [-1.6, -0.4]) pl.box("paintedMetal", sx * 0.8, 2.07, z, 0.16, 2.55, 0.16, { color: P.impBlack, texel: 2 });
      for (const z of [-1.6, -0.4]) pl.box("paintedMetal", 0, 1.0, z, 1.76, 0.1, 0.1, { color: P.impBlack, texel: 2 });
      pl.cyl("metal", 0.7, 1.45, -4.8, 0.1, 1.3, "y", { color: P.impGrey, segments: 10 });
      pl.cyl("paintedMetal", 0.7, 0.85, -4.8, 0.16, 0.1, "y", { color: P.impBlack, segments: 10 });
      // landing rails at x ±0.84 (in line with the stair rails), corner posts, chain across the pad end
      for (const sx of [-1, 1]) {
        pl.cyl("metal", sx * 0.84, 4.42, -1.1, 0.03, 2.2, "z", { color: P.impGrey, segments: 8 });
        pl.cyl("metal", sx * 0.84, 3.95, -1.1, 0.022, 2.2, "z", { color: P.impGrey, segments: 8 });
        for (const z of [-2.15, -0.05]) pl.box("paintedMetal", sx * 0.84, 3.92, z, 0.06, 1.04, 0.06, { color: P.impBlack, texel: 2 });
      }
      pl.cyl("metal", 0, 4.3, -0.05, 0.015, 1.62, "x", { color: P.impGrey, segments: 6 });
      beaconLamp(kit, P, ...pl.point(0.84, 4.44, -0.05), "emitAmber", { r: 0.09 });
      pl.box("emitAmber", 0, 3.3, -0.02, 1.6, 0.04, 0.02);
      pl.collider([-1.2, 0, -7.6], [1.2, 4.6, 0.0], "stair-truck");
    }
    // mobile power unit beside the power post: boxy generator on wheels with a cable to the post
    {
      const pl = new Placer(kit, [px - 16.5, FLOOR, pz - 10.5], 20);
      pl.box("paintedMetal", 0, 0.9, 0, 1.6, 1.3, 2.6, { color: P.impDark, texel: 1.5 });
      pl.box("paintedMetal", 0, 1.62, 0, 1.4, 0.16, 2.3, { color: P.impBlack, texel: 1.5 });
      pl.box("emitAmber", 0, 0.32, 0, 1.62, 0.025, 2.62);
      for (let i = 0; i < 6; i++) pl.box("paintedMetal", -0.81, 0.9, -1.0 + i * 0.4, 0.02, 0.9, 0.06, { color: P.impMid });
      for (let i = 0; i < 3; i++) pl.cyl("metal", 0.82, 1.1, -0.5 + i * 0.4, 0.07, 0.1, "x", { color: P.impBlue, segments: 10 });
      pl.box("emitBlue", 0.82, 1.4, 0, 0.02, 0.06, 0.5);
      pl.box("emitRedImp", 0.82, 0.7, -0.9, 0.02, 0.08, 0.08);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pl.cyl("paintedMetal", sx * 0.7, 0.22, sz * 0.95, 0.22, 0.2, "x", { color: P.impBlack, segments: 12 });
      pl.collider([-0.9, 0, -1.4], [0.9, 1.8, 1.4], "power-unit");
      hose(kit, "paintedMetal", pl.point(0.9, 1.1, -0.1), powerA, 0.6, 0.05, P.impBlack, { segments: 16 });
    }

    // ---- boarding-bridge gantry forward of the pad, wholly outside the ring (deck z -10..-0.5):
    //      raised deck on columns, rails, stairs on the forward side, retracted telescoping bridge,
    //      console, equipment cabinet, light mast
    const gY = FLOOR + 2.4;
    const gx0 = px - 4.5;
    const gx1 = px + 4.5;
    const gz0 = pz - 25.0; // -10
    const gz1 = pz - 15.5; // -0.5
    kit.boxMM("paintedMetal", [gx0, gY - 0.35, gz0], [gx1, gY, gz1], { color: P.impDark, texel: 1 });
    kit.boxMM("impPanel", [gx0 + 0.05, gY, gz0 + 0.05], [gx1 - 0.05, gY + 0.04, gz1 - 0.05], { color: P.impGrey, texel: 0.5 });
    for (const x of [gx0 + 0.5, gx1 - 0.5]) for (const z of [gz0 + 0.6, (gz0 + gz1) / 2, gz1 - 0.6]) kit.box("paintedMetal", x, (FLOOR + gY - 0.35) / 2, z, 0.5, gY - 0.35 - FLOOR, 0.5, { color: P.impDark, texel: 1 });
    for (const x of [gx0 + 0.3, gx1 - 0.36]) kit.boxMM("emitAmber", [x, gY - 0.24, gz0 + 0.3], [x + 0.06, gY - 0.2, gz1 - 0.3], { uv: "keep" });
    handrail(kit, P, [gx0 + 0.05, gz0 + 0.05], [gx0 + 0.05, gz1 - 0.05], gY + 0.04, { collide: false });
    handrail(kit, P, [gx1 - 0.05, gz0 + 0.05], [gx1 - 0.05, gz1 - 0.05], gY + 0.04, { collide: false });
    handrail(kit, P, [gx0 + 0.05, gz0 + 0.05], [px - 1.0, gz0 + 0.05], gY + 0.04, { collide: false });
    handrail(kit, P, [px + 1.0, gz0 + 0.05], [gx1 - 0.05, gz0 + 0.05], gY + 0.04, { collide: false });
    handrail(kit, P, [gx0 + 0.05, gz1 - 0.05], [px - 1.45, gz1 - 0.05], gY + 0.04, { collide: false });
    handrail(kit, P, [px + 1.45, gz1 - 0.05], [gx1 - 0.05, gz1 - 0.05], gY + 0.04, { collide: false });
    // stairs up from the floor on the forward side (rise toward +z onto the deck at gz0)
    stairs(new Placer(kit, [px, FLOOR, gz0 - 4.2], 0), P, { w: 1.8, steps: 14, rise: 2.4 / 14, run: 0.3 });
    // retracted boarding bridge: tunnel body, inner telescoping section, lit mouth frame, red lenses
    kit.boxMM("paintedMetal", [px - 1.3, gY + 0.04, gz0 + 2.6], [px + 1.3, gY + 2.6, gz1 + 0.3], { color: P.impMid, texel: 1 });
    kit.boxMM("paintedMetal", [px - 1.15, gY + 0.3, gz1 + 0.28], [px + 1.15, gY + 2.35, gz1 + 0.5], { color: P.impDark, texel: 1 });
    kit.boxMM("paintedMetal", [px - 1.0, gY + 0.42, gz1 + 0.49], [px + 1.0, gY + 2.2, gz1 + 0.52], { color: P.impBlack, texel: 1 });
    for (const sx of [-1, 1]) kit.boxMM("emitWhite", [px + sx * 1.08 - 0.04, gY + 0.42, gz1 + 0.5], [px + sx * 1.08 + 0.04, gY + 2.2, gz1 + 0.53], { uv: "keep" });
    kit.boxMM("emitWhite", [px - 1.12, gY + 2.2, gz1 + 0.5], [px + 1.12, gY + 2.28, gz1 + 0.53], { uv: "keep" });
    for (const sx of [-1, 1]) kit.boxMM("emitRedImp", [px + sx * 1.1 - 0.08, gY + 2.42, gz1 + 0.3], [px + sx * 1.1 + 0.08, gY + 2.54, gz1 + 0.33]);
    for (let z = gz0 + 3.4; z < gz1 - 0.2; z += 1.6) kit.boxMM("paintedMetal", [px - 1.34, gY + 0.3, z - 0.06], [px + 1.34, gY + 2.5, z + 0.06], { color: P.impDark, texel: 1 });
    kit.boxMM("emitAmber", [px - 0.6, gY + 2.61, gz0 + 2.8], [px + 0.6, gY + 2.64, gz1 + 0.1], { uv: "keep" });
    kit.collider([gx0, FLOOR, gz0], [gx1, gY + 1.1, gz1], "gantry");
    // deck equipment: boarding console facing the pad, equipment cabinet, light mast with a strip
    consoleUnit(new Placer(kit, [gx1 - 1.3, gY + 0.04, gz0 + 1.6], 0), P, { w: 1.4, screens: ["screenImp1"], collide: false });
    lockerBank(new Placer(kit, [gx0 + 0.75, gY + 0.04, gz0 + 1.9], -90), P, 2, { h: 1.8 });
    kit.box("paintedMetal", gx0 + 0.4, gY + 1.9, gz1 - 0.6, 0.12, 3.7, 0.12, { color: P.impBlack, texel: 2 });
    kit.box("paintedMetal", gx0 + 1.4, gY + 3.75, gz1 - 0.6, 2.0, 0.08, 0.08, { color: P.impBlack, texel: 2 });
    stripFixture(kit, P, gx0 + 1.9, gY + 3.62, gz1 - 0.6, 1.6, "x", "emitWhite");
    statusPost(kit, P, gx0 - 0.9, FLOOR, gz0 + 1.0, { face: 180, lens: "emitBlue" });
    statusPost(kit, P, gx1 + 0.9, FLOOR, gz0 + 1.0, { face: 180, lens: "emitAmber" });

    // ---- crew ready area (aft-starboard, near the spawn): Imperial benches facing the briefing board,
    //      lockers on the aft wall, kit racks on the east wall, crate stack + baggage carts
    floorRect(kit, -100, 42, -83, 66, FLOOR, P.impWhite, 0.12);
    // benches face west toward a free-standing briefing board (dark stand, screenImp display at 1.2–2.6 m,
    // lectern shelf at 0.9 m) so the staging frame carries the human-scale kit, not just seats
    for (const x of [-89, -92.5]) for (const z of [48.5, 53]) benchSeat(new Placer(kit, [x, FLOOR, z], 90), P, { len: 3.6 });
    {
      const pl = new Placer(kit, [-96.3, FLOOR, 50.75], -90);
      pl.box("paintedMetal", 0, 0.04, 0.1, 3.2, 0.08, 0.7, { color: P.impBlack, texel: 2 });
      for (const sx of [-1, 1]) pl.box("paintedMetal", sx * 1.45, 1.4, 0.12, 0.14, 2.8, 0.14, { color: P.impDark, texel: 2 });
      pl.box("paintedMetal", 0, 2.78, 0.12, 3.1, 0.1, 0.2, { color: P.impBlack, texel: 2 });
      pl.box("paintedMetal", 0, 1.9, 0.14, 2.9, 1.7, 0.1, { color: P.impBlack, texel: 2 }); // bezel
      pl.box("screenImp0", 0, 1.95, 0.085, 2.6, 1.4, 0.01, { uv: "keep" });
      pl.box("emitAmber", 0, 1.13, 0.085, 2.6, 0.03, 0.01);
      pl.box("paintedMetal", 0, 0.88, -0.25, 1.2, 0.05, 0.5, { color: P.impGrey, texel: 2 }); // lectern shelf
      pl.box("paintedMetal", 0, 0.45, -0.15, 0.5, 0.82, 0.3, { color: P.impDark, texel: 2 });
      pl.box("emitBlue", 0.3, 0.91, -0.3, 0.12, 0.01, 0.08);
      pl.collider([-1.6, 0, -0.5], [1.6, 2.85, 0.45], "briefing-board");
    }
    lockerBank(new Placer(kit, [-88.5, FLOOR, 70 - WALL_T - 0.06 - 0.3], 0), P, 8);
    lockerBank(new Placer(kit, [-100.5, FLOOR, 70 - WALL_T - 0.06 - 0.3], 0), P, 8);
    wallScreen(new Placer(kit, [-83, FLOOR, 70 - WALL_T - 0.08], 0), P, { w: 2.6, h: 1.3, mat: "screenImp0" });
    wallScreen(new Placer(kit, [-95, FLOOR, 70 - WALL_T - 0.08], 0), P, { w: 1.6, h: 1.0, mat: "screenImp1" });
    for (const z of [48.4, 51.8]) partsRack(new Placer(kit, [-80 - WALL_T - 0.06 - 0.45, FLOOR, z], 90), P, rand, { w: 3.0, h: 2.4, tiers: 4, d: 0.8 });
    lockerBank(new Placer(kit, [-80 - WALL_T - 0.06 - 0.3, FLOOR, 55.4], 90), P, 4);
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
    statusPost(kit, P, -100.6, FLOOR, 43.0, { face: 90, lens: "emitBlue" });
    // aft-west corner: kit racks + spares between the ribs at x -128 / -116
    for (const x of [-124.4, -121.0]) partsRack(new Placer(kit, [x, FLOOR, 70 - WALL_T - 0.06 - 0.45], 0), P, rand, { w: 3.0, h: 2.6, tiers: 4, d: 0.8 });
    crateKit(new Placer(kit, [-135.2, FLOOR, 68.4], 0), P, { color: P.impGrey, collide: true });
    crateKit(new Placer(kit, [-133.8, FLOOR, 68.5], 10), P, { color: P.impMid, collide: true });

    // ---- bay-control booth recessed into the forward-starboard corner (x -87.6..-80.86, z -39.14..-33):
    //      raised dark plinth, solid backs to the corner walls, glass toward the room, flat roof with a
    //      lit fascia, a door with a step on the aft face, consoles at 0.9, cable trunking up the wall
    {
      const bx0 = -87.6;
      const bx1 = -80 - WALL_T - 0.7;
      const bz0 = -40 + WALL_T + 0.7;
      const bz1 = -33.0;
      const by = FLOOR + 0.4;
      const sillH = 1.0;
      const roofY = by + 2.9;
      kit.boxMM("paintedMetal", [bx0, FLOOR, bz0 - 0.7], [bx1 + 0.7, by, bz1], { color: P.impDark, texel: 1 });
      kit.boxMM("impPanel", [bx0 + 0.05, by, bz0 + 0.05], [bx1 - 0.05, by + 0.03, bz1 - 0.05], { color: P.impMid, texel: 0.5 });
      kit.boxMM("emitAmber", [bx0 - 0.005, FLOOR + 0.3, bz0], [bx0 + 0.02, FLOOR + 0.33, bz1 - 0.2], { uv: "keep" });
      // solid backs (east + forward) reaching the room walls
      kit.boxMM("paintedMetal", [bx1 - 0.16, by, bz0 - 0.7], [bx1 + 0.7, roofY, bz1], { color: P.impDark, texel: 1 });
      kit.boxMM("paintedMetal", [bx0, by, bz0 - 0.7], [bx1, roofY, bz0 + 0.16], { color: P.impDark, texel: 1 });
      kit.boxMM("impPanel", [bx1 - 0.18, by + 0.2, bz0 + 0.4], [bx1 - 0.16, roofY - 0.4, bz1 - 0.4], { color: P.impGrey, uv: "keep" });
      kit.boxMM("impPanel", [bx0 + 0.4, by + 0.2, bz0 + 0.16], [bx1 - 0.4, roofY - 0.4, bz0 + 0.18], { color: P.impGrey, uv: "keep" });
      // glazed faces toward the room: west (x = bx0) and aft (z = bz1), sill wall + mullions
      const faces = [
        { a: [bx0, bz0], b: [bx0, bz1], out: [-1, 0] },
        { a: [bx0, bz1], b: [bx1, bz1], out: [0, 1] },
      ];
      for (const s of faces) {
        const along = s.a[0] === s.b[0] ? "z" : "x";
        const len = along === "z" ? s.b[1] - s.a[1] : s.b[0] - s.a[0];
        const cx = (s.a[0] + s.b[0]) / 2;
        const cz = (s.a[1] + s.b[1]) / 2;
        kit.box("paintedMetal", cx, by + sillH / 2, cz, along === "z" ? 0.16 : len, sillH, along === "z" ? len : 0.16, { color: P.impDark, texel: 1 });
        kit.box("impPanel", cx + s.out[0] * 0.1, by + sillH / 2, cz + s.out[1] * 0.1, along === "z" ? 0.04 : len - 0.3, sillH - 0.14, along === "z" ? len - 0.3 : 0.04, { color: P.impGrey, uv: "keep" });
        kit.box("glass", cx, by + sillH + (roofY - by - sillH) / 2, cz, along === "z" ? 0.02 : len, roofY - by - sillH, along === "z" ? len : 0.02, { uv: "keep" });
        const n = Math.max(1, Math.round(len / 1.6));
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          kit.box("paintedMetal", s.a[0] + (s.b[0] - s.a[0]) * t, by + sillH + (roofY - by - sillH) / 2, s.a[1] + (s.b[1] - s.a[1]) * t, 0.1, roofY - by - sillH, 0.1, { color: P.impBlack, texel: 2 });
        }
      }
      // door on the aft face (west end): recessed dark leaf in a lit frame, blue lamp, step with a yellow nosing
      const dx = bx0 + 1.2;
      kit.boxMM("paintedMetal", [dx - 0.6, by, bz1 - 0.1], [dx + 0.6, by + 2.3, bz1 + 0.1], { color: P.impBlack, texel: 1 });
      kit.boxMM("paintedMetal", [dx - 0.5, by + 0.02, bz1 - 0.05], [dx + 0.5, by + 2.2, bz1 + 0.05], { color: P.impDark, texel: 1 });
      kit.boxMM("paintedMetal", [dx - 0.015, by + 0.02, bz1 + 0.05], [dx + 0.015, by + 2.2, bz1 + 0.06], { color: P.impMid, texel: 2 });
      for (const sx of [-1, 1]) kit.boxMM("emitWhite", [dx + sx * 0.56 - 0.02, by + 0.1, bz1 + 0.1], [dx + sx * 0.56 + 0.02, by + 2.25, bz1 + 0.12], { uv: "keep" });
      kit.boxMM("emitBlue", [dx - 0.2, by + 2.36, bz1 + 0.1], [dx + 0.2, by + 2.44, bz1 + 0.12]);
      kit.boxMM("paintedMetal", [dx - 0.8, FLOOR, bz1], [dx + 0.8, FLOOR + 0.2, bz1 + 0.5], { color: P.impMid, texel: 1 });
      kit.boxMM("hazardImp", [dx - 0.8, FLOOR + 0.12, bz1 + 0.5], [dx + 0.8, FLOOR + 0.2, bz1 + 0.52], { texel: 0.5 });
      // flat roof with a heavy fascia + routed white strip, beacon, cable trunking up the east wall
      kit.boxMM("paintedMetal", [bx0 - 0.1, roofY - 0.2, bz0 - 0.7], [bx1 + 0.7, roofY + 0.1, bz1 + 0.1], { color: P.impDark, texel: 1 });
      kit.boxMM("paintedMetal", [bx0 - 0.16, roofY - 0.5, bz0], [bx0 - 0.1, roofY + 0.12, bz1 + 0.16], { color: P.impBlack, texel: 1 });
      kit.boxMM("paintedMetal", [bx0 - 0.16, roofY - 0.5, bz1 + 0.1], [bx1, roofY + 0.12, bz1 + 0.16], { color: P.impBlack, texel: 1 });
      kit.boxMM("emitWhite", [bx0 - 0.18, roofY - 0.36, bz0 + 0.2], [bx0 - 0.16, roofY - 0.3, bz1 + 0.1], { uv: "keep" });
      kit.boxMM("emitWhite", [bx0 - 0.1, roofY - 0.36, bz1 + 0.16], [bx1 - 0.2, roofY - 0.3, bz1 + 0.18], { uv: "keep" });
      kit.boxMM("emitWhite", [bx0 + 1.0, roofY - 0.22, bz0 + 1.0], [bx1 - 1.0, roofY - 0.2, bz0 + 1.3], { uv: "keep" });
      kit.boxMM("emitWhite", [bx0 + 1.0, roofY - 0.22, bz1 - 1.3], [bx1 - 1.0, roofY - 0.2, bz1 - 1.0], { uv: "keep" });
      beaconLamp(kit, P, bx0 + 0.4, roofY + 0.1, bz1 - 0.4, "emitRedImp");
      kit.boxMM("paintedMetal", [bx1 + 0.35, roofY + 0.1, bz0 + 2.0], [bx1 + 0.65, roofY + 1.4, bz0 + 2.3], { color: P.impBlack, texel: 2 });
      kit.boxMM("paintedMetal", [bx1 + 0.3, roofY + 1.4, bz0 + 1.6], [bx1 + 0.7, roofY + 2.2, bz0 + 2.7], { color: P.impBlack, texel: 2 });
      kit.boxMM("emitBlue", [bx1 + 0.28, roofY + 1.95, bz0 + 1.8], [bx1 + 0.3, roofY + 2.02, bz0 + 1.95]);
      // consoles inside facing the pad (through the aft glass), a second small station
      consoleUnit(new Placer(kit, [bx0 + 3.2, by + 0.03, bz1 - 1.5], -27), P, { w: 2.4, screens: ["screenImp0", "screenImp1", "screenImp0"], collide: false });
      consoleUnit(new Placer(kit, [bx1 - 1.3, by + 0.03, bz0 + 1.6], 90), P, { w: 1.4, screens: ["screenImp1"], collide: false });
      kit.collider([bx0 - 0.2, FLOOR, bz0 - 0.7], [bx1 + 0.7, roofY + 0.2, bz1 + 0.55], "booth");
    }
    // opposite forward corner: coolant tank group with a manifold to a floor connection, fenced
    {
      for (let i = 0; i < 3; i++) {
        const x = -136.4;
        const z = -35 + i * 3.4;
        kit.cyl("paintedMetal", x, FLOOR + 1.6, z, 1.15, 2.8, "y", { color: P.impGrey, segments: 20 });
        for (const y of [0.5, 2.7]) kit.cyl("paintedMetal", x, FLOOR + y, z, 1.19, 0.2, "y", { color: P.impDark, segments: 20 });
        kit.cyl("emitBlue", x, FLOOR + 0.66, z, 1.18, 0.04, "y", { segments: 20 });
        kit.cyl("paintedMetal", x, FLOOR + 3.15, z, 0.4, 0.3, "y", { color: P.impDark, segments: 12 });
        kit.box("paintedMetal", x + 1.16, FLOOR + 1.6, z, 0.02, 0.5, 1.2, { color: P.impBlack, texel: 2 });
        kit.box("emitBlue", x + 1.175, FLOOR + 1.72, z, 0.01, 0.1, 0.8);
        pipe(kit, P, [x, FLOOR + 3.3, z], [x, FLOOR + 4.0, z], 0.12, P.impDark);
      }
      pipe(kit, P, [-136.4, FLOOR + 4.0, -35.6], [-136.4, FLOOR + 4.0, -21], 0.14, P.impDark, { flanges: 4, bands: "emitBlue" });
      pipe(kit, P, [-136.4, FLOOR + 4.0, -21], [-136.4, FLOOR + 0.5, -21], 0.14, P.impDark);
      kit.box("paintedMetal", -136.4, FLOOR + 0.3, -21, 0.9, 0.6, 0.9, { color: P.impBlack, texel: 2 });
      kit.box("emitBlue", -136.4, FLOOR + 0.45, -20.54, 0.3, 0.05, 0.01);
      kit.collider([-138, FLOOR, -36.5], [-135, FLOOR + 3.5, -26.8], "tanks");
      kit.collider([-136.9, FLOOR, -21.5], [-135.9, FLOOR + 0.7, -20.5], "tank-manifold");
      handrail(kit, P, [-134.6, -37.2], [-134.6, -26.6], FLOOR, { kick: false });
      handrail(kit, P, [-139.6, -26.6], [-134.6, -26.6], FLOOR, { kick: false });
      handrail(kit, P, [-139.6, -37.2], [-134.6, -37.2], FLOOR, { kick: false });
    }

    // ---- wall gear at human height (ribs on x walls at z -27.8/-15.6/-3.3/8.9/21.1/33.3/45.6/57.8,
    //      on z walls at x -128/-116/-104/-92)
    const W = shell.walls;
    for (const z of [-21.7, 27.2, 51.7]) wallJunction(kit, W.west, z, P);
    crewHatch(kit, W.west, 2.8, P);
    wallScreen(new Placer(kit, [-140 + WALL_T + 0.1, FLOOR, 15], -90), P, { w: 3.0, h: 1.2, mat: "screenImp0" });
    wallScreen(new Placer(kit, [-140 + WALL_T + 0.1, FLOOR, 39.5], -90), P, { w: 2.0, h: 1.0, mat: "screenImp1" });
    for (const z of [-21.7, 39.5]) wallJunction(kit, W.east, z, P);
    crewHatch(kit, W.east, -9.5, P);
    wallScreen(new Placer(kit, [-80 - WALL_T - 0.1, FLOOR, 1.5], 90), P, { w: 2.2, h: 1.2, mat: "screenImp1" });
    wallScreen(new Placer(kit, [-80 - WALL_T - 0.1, FLOOR, 28.5], 90), P, { w: 2.2, h: 1.2, mat: "screenImp0" });
    wallJunction(kit, W.fwd, -122, P);
    crewHatch(kit, W.fwd, -110, P);
    wallScreen(new Placer(kit, [-98, FLOOR, -40 + WALL_T + 0.08], 180), P, { w: 2.4, h: 1.2, mat: "screenImp0" });
    wallJunction(kit, W.fwd, -94.5, P);
    for (const x of [-114.1, -107.0]) wallJunction(kit, W.aft, x, P);

    // ---- lighting
    const L = ctx.lights;
    for (const [x, z] of [[-125, -24], [-95, -24], [-127, 15], [-93, 15], [-125, 54], [-95, 54]]) L.push(pointLight([x, FLOOR + 11, z], 0xe6eeff, 260, 42, 0.5));
    L.push(pointLight([-84, FLOOR + 7, 15], 0xff4030, 40, 16, 0.5)); // red beacon wash at the bay door
    L.push(pointLight([-84, FLOOR + 2.8, -36], 0xcfe0ff, 12, 8, 0.45)); // booth interior
    L.push(pointLight([px, gY + 3.6, gz0 + 3], 0xe6eeff, 90, 18, 0.5)); // gantry deck
    for (const a of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
      L.push(spotLight([px + Math.sin(a) * 9, CEIL - 2.5, pz + Math.cos(a) * 9], [px, FLOOR + PAD_H, pz], 0xf2f6ff, 420, 40, 0.5, 0.5, 0.95));
    }
    L.push(spotLight([-84, CEIL - 3, 15], [-96, FLOOR, 15], 0xf2f6ff, 400, 40, 0.5, 0.5, 0.6));

    const padMat = ctx.materials.padLight;
    return {
      update(dt, t) {
        padMat.emissiveIntensity = 1.0 + 0.9 * (0.5 + 0.5 * Math.sin(t * 2.4));
      },
      api: {
        // pos.y is the pad's TOP surface: the traffic system rests the shuttle's skids on it
        shuttlePad: () => ({ pos: [PAD.pos[0], PAD.pos[1] + PAD_H, PAD.pos[2]], yaw: PAD.yaw, height: PAD_H }),
      },
    };
  },
};
