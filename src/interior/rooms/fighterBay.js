// Deck 5 — Fighter Maintenance & Refuelling. A 33.6 × 50 × 14 m workshop off the main bay's starboard
// portal: two TIE-sized maintenance cradles (one holding a wing panel pulled off its pylon), an engine
// pod on stands, diagnostic consoles, fuel tanks with gauges and hoses, tool walls, parts shelving, an
// overhead hoist on ceiling rails and a grated service lane down the middle, all under amber work lights.
//
// Deck-local metres, floor y = 0. Room bounds x 36.4..70, y 0..14, z -125..-75.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { impWall, impFloor, impCeiling, impConsole, wallScreen, equipmentRack, crate, railing, pipeRun, pillar, wallSegment } from "../imperial.js";
import { pointLight, wallFrame } from "../builders.js";
import { Kit, rng } from "../../kit.js";
import { decalRect } from "../../textures.js";

const WING_H = 7.2;
const WING_W = 3.9;
const CRADLES = [
  { x: 56, z: -110, wing: true },
  { x: 56, z: -90, wing: false },
];
const LANE = { z0: -101.6, z1: -98.4, x1: 59.6 }; // grated service lane from the portal to the diagnostics row

export function buildFighterBay(kit, ctx) {
  const [min, max] = ctx.bounds;
  const rand = rng(ctx.seed + 9);
  shell(kit, ctx);
  serviceLane(kit, ctx, min, max);
  for (const c of CRADLES) cradle(kit, ctx, c, rand);
  enginePod(kit, ctx, 49, -107.5, 0.35);
  consoles(kit, ctx);
  fuelTanks(kit, ctx, min, max);
  toolWalls(kit, ctx, min, max, rand);
  shelving(kit, ctx, min, max, rand);
  hoist(kit, ctx, min, max);
  props(kit, ctx, min, max, rand);
  lighting(kit, ctx, min, max);
}

// ---------------------------------------------------------------------------
function shell(kit, ctx) {
  const [min, max] = ctx.bounds;
  const H = max[1];
  impFloor(kit, ctx, {});
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
    impWall(kit, ctx, side, {
      rows: [0, 0.5, 2.0, 3.4, 6.6, 10.2, H],
      panelW: 2.8,
      paints: [
        [PALETTE.impGrey, 0.5],
        [PALETTE.impLight, 0.34],
        [PALETTE.impMid, 0.16],
      ],
      styles: { panel: 0.64, vent: 0.08, greeble: 0.1, strip: 0.08, screen: 0.04, conduit: 0.06 },
      seed: ctx.seed * 5 + side.length,
      cove: true,
    });
  }
  impCeiling(kit, ctx, {
    panelW: 3.4,
    rowH: 3.4,
    spacing: 8,
    lights: false,
    styles: { panel: 0.86, greeble: 0.04, vent: 0.1 },
    paints: [
      [PALETTE.impGrey, 0.6],
      [PALETTE.impMid, 0.3],
      [PALETTE.impLight, 0.1],
    ],
  });
  // pilasters between the wall bays and a heavy lintel over the portal
  for (const z of [-123.5, -111, -89, -76.5]) pillar(kit, max[0] - 0.36, z, 0, H, 0.7, PALETTE.impMid);
  for (const x of [42, 50, 58, 66]) {
    pillar(kit, x, min[2] + 0.36, 0, H, 0.7, PALETTE.impMid);
    pillar(kit, x, max[2] - 0.36, 0, H, 0.7, PALETTE.impMid);
  }
  const portal = ctx.doors.find((d) => d.wall === "z");
  if (portal) {
    kit.boxMM("paintedMetal", [min[0] - 0.3, portal.h + 0.3, portal.pos[1] - portal.w / 2 - 1.2], [min[0] + 0.5, portal.h + 1.5, portal.pos[1] + portal.w / 2 + 1.2], { color: PALETTE.impDark, texel: 1.5 });
    kit.boxMM("hazard", [min[0] + 0.5, portal.h + 0.35, portal.pos[1] - portal.w / 2 - 1.0], [min[0] + 0.52, portal.h + 0.95, portal.pos[1] + portal.w / 2 + 1.0], { texel: 2 });
    kit.boxMM("emitAmber", [min[0] + 0.5, portal.h + 1.1, portal.pos[1] - portal.w / 2], [min[0] + 0.51, portal.h + 1.26, portal.pos[1] + portal.w / 2], {});
  }
}

// ---------------------------------------------------------------------------
// Grated service lane: recessed black trench with steel edge rails and a grate deck
// ---------------------------------------------------------------------------
function serviceLane(kit, ctx, min, max) {
  const x0 = min[0] + 0.4;
  const x1 = LANE.x1;
  kit.boxMM("paintedMetal", [x0, -0.3, LANE.z0], [x1, -0.05, LANE.z1], { color: PALETTE.impBlack, texel: 2 });
  // hoses and a cable tray running inside the trench
  kit.boxMM("metal", [x0 + 1, -0.22, LANE.z0 + 0.4], [x1 - 1, -0.12, LANE.z0 + 1.0], { color: PALETTE.gunmetal });
  pipeRun(kit, [[x0 + 2, -0.16, LANE.z1 - 0.5], [x1 - 2, -0.16, LANE.z1 - 0.5]], 0.06, PALETTE.impMid, "rubber");
  pipeRun(kit, [[x0 + 2, -0.16, LANE.z1 - 0.75], [x1 - 2, -0.16, LANE.z1 - 0.75]], 0.05, PALETTE.impDark, "rubber");
  for (let x = x0 + 1; x < x1; x += 4) kit.boxMM("emitAmber", [x, -0.2, LANE.z0 + 1.3], [x + 0.6, -0.17, LANE.z0 + 1.5], {});
  // grate deck flush with the floor
  const g = new THREE.PlaneGeometry(x1 - x0, LANE.z1 - LANE.z0);
  g.rotateX(-Math.PI / 2);
  kit.add("grate", g, { pos: [(x0 + x1) / 2, 0.005, (LANE.z0 + LANE.z1) / 2], uv: "world", texel: 2 });
  for (const z of [LANE.z0, LANE.z1]) {
    kit.boxMM("metal", [x0, 0, z - 0.06], [x1, 0.03, z + 0.06], { color: PALETTE.steel });
    kit.boxMM("hazard", [x0, 0.0, z + (z === LANE.z0 ? -0.3 : 0.06)], [x1, 0.012, z + (z === LANE.z0 ? -0.06 : 0.3)], { texel: 2 });
  }
  // end rail and hazard band where the lane meets the diagnostics row
  kit.boxMM("metal", [x1 - 0.06, 0, LANE.z0], [x1 + 0.06, 0.03, LANE.z1], { color: PALETTE.steel });
  kit.boxMM("hazard", [x1 + 0.06, 0, LANE.z0 - 0.3], [x1 + 0.3, 0.012, LANE.z1 + 0.3], { texel: 2 });
  // cross bearers under the grate
  for (let x = x0 + 1.5; x < x1; x += 3) kit.boxMM("metal", [x - 0.06, -0.1, LANE.z0], [x + 0.06, 0, LANE.z1], { color: PALETTE.gunmetal });
  void ctx;
  void max;
}

// ---------------------------------------------------------------------------
// Maintenance cradle: floor rails, two A-frame uprights either side of the wing planes, a top beam
// with clamp arms; the first one holds a wing panel lifted off its pylon
// ---------------------------------------------------------------------------
function cradle(kit, ctx, { x, z, wing }, rand) {
  const halfZ = WING_W / 2 + 0.5; // the wing planes sit at ±(1.9 + 1.75) = ±3.65 along z
  const wingZ = 1.9 + 1.75;
  const top = WING_H + 1.6;
  // base frame: two heavy rails along z plus cross ties, hazard border on the floor
  for (const dx of [-2.4, 2.4]) kit.boxMM("paintedMetal", [x + dx - 0.25, 0, z - wingZ - 1.4], [x + dx + 0.25, 0.45, z + wingZ + 1.4], { color: PALETTE.impDark, texel: 1.5 });
  for (const dz of [-wingZ - 1.2, -wingZ + 1.2, wingZ - 1.2, wingZ + 1.2]) kit.boxMM("paintedMetal", [x - 2.4, 0.1, z + dz - 0.15], [x + 2.4, 0.4, z + dz + 0.15], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("hazard", [x - 3.2, 0, z - wingZ - 2.2], [x + 3.2, 0.012, z - wingZ - 1.9], { texel: 2 });
  kit.boxMM("hazard", [x - 3.2, 0, z + wingZ + 1.9], [x + 3.2, 0.012, z + wingZ + 2.2], { texel: 2 });
  kit.boxMM("hazard", [x - 3.2, 0, z - wingZ - 2.2], [x - 2.9, 0.012, z + wingZ + 2.2], { texel: 2 });
  kit.boxMM("hazard", [x + 2.9, 0, z - wingZ - 2.2], [x + 3.2, 0.012, z + wingZ + 2.2], { texel: 2 });
  // uprights (A-frames) outside each wing plane, braced, with the top beam over both
  for (const s of [-1, 1]) {
    const uz = z + s * (wingZ + 1.1);
    for (const dx of [-2.4, 2.4]) {
      kit.box("paintedMetal", x + dx, top / 2, uz, 0.4, top, 0.4, { color: PALETTE.impMid, texel: 1.5 });
      kit.box("paintedMetal", x + dx, top - 0.2, uz, 0.5, 0.4, 0.5, { color: PALETTE.impBlack, texel: 2 });
    }
    kit.box("paintedMetal", x, top - 0.25, uz, 5.2, 0.4, 0.4, { color: PALETTE.impMid, texel: 1.5 });
    kit.box("paintedMetal", x, 4.2, uz, 5.0, 0.2, 0.2, { color: PALETTE.impDark, texel: 2 });
    kit.add("paintedMetal", new THREE.BoxGeometry(0.14, 5.6, 0.14), { pos: [x, top / 2 - 1.2, uz], rot: [0, 0, 0.71], color: PALETTE.impDark, texel: 2 });
    kit.add("paintedMetal", new THREE.BoxGeometry(0.14, 5.6, 0.14), { pos: [x, top / 2 - 1.2, uz], rot: [0, 0, -0.71], color: PALETTE.impDark, texel: 2 });
    // wing clamps: pads on arms reaching in from the upright toward the wing plane
    for (const dy of [WING_H / 2 - 1.2, WING_H / 2 + 2.6]) {
      kit.box("metal", x, dy + 0.3, uz - s * 0.7, 0.9, 0.5, 1.0, { color: PALETTE.gunmetal });
      kit.box("hazard", x, dy + 0.3, uz - s * 1.21, 0.9, 0.3, 0.02, { texel: 3 });
      kit.box(rand() < 0.5 ? "emitGreen" : "emitAmber", x + 0.3, dy + 0.55, uz - s * 1.2, 0.2, 0.05, 0.01);
    }
    kit.collider([x - 2.7, 0, uz - 0.3], [x + 2.7, top, uz + 0.3], "cradle");
  }
  // longitudinal top beams tying the two A-frames, with a lit work lamp bar underneath
  for (const dx of [-2.4, 2.4]) kit.boxMM("paintedMetal", [x + dx - 0.2, top - 0.45, z - wingZ - 1.1], [x + dx + 0.2, top - 0.05, z + wingZ + 1.1], { color: PALETTE.impMid, texel: 1.5 });
  kit.boxMM("paintedMetal", [x - 0.4, top - 0.6, z - wingZ - 1.1], [x + 0.4, top - 0.4, z + wingZ + 1.1], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("emitAmber", [x - 0.25, top - 0.62, z - wingZ - 0.6], [x + 0.25, top - 0.6, z + wingZ + 0.6], {});
  // service trolley-steps on the open side
  kit.box("paintedMetal", x - 3.6, 0.55, z, 0.9, 1.1, 1.6, { color: PALETTE.impDark, texel: 2 });
  kit.box("hazard", x - 3.6, 1.105, z, 0.9, 0.01, 1.6, { texel: 3 });
  kit.box("paintedMetal", x - 4.3, 0.28, z, 0.5, 0.56, 1.6, { color: PALETTE.impDark, texel: 2 });
  kit.box("hazard", x - 4.3, 0.565, z, 0.5, 0.01, 1.6, { texel: 3 });
  kit.collider([x - 4.55, 0, z - 0.8], [x - 3.15, 1.1, z + 0.8], "steps");
  if (wing) {
    // one wing panel standing in the cradle (its pylon side toward the centre), second one missing
    wingPanel(kit, x, WING_H / 2 + 0.5, z - wingZ, 0);
    // the removed pylon collar lying on a pallet beside the cradle
    kit.box("paintedMetal", x + 4.4, 0.08, z + 1.5, 1.6, 0.16, 1.6, { color: PALETTE.impDark, texel: 2 });
    kit.cyl("tieHull", x + 4.4, 0.9, z + 1.5, 0.9, 0.35, "y", { segments: 12 });
    kit.cyl("tieHull", x + 4.4, 0.45, z + 1.5, 0.62, 0.55, "y", { segments: 12 });
    kit.collider([x + 3.6, 0, z + 0.7], [x + 5.2, 1.1, z + 2.3], "pylon");
    // hose from the trench to the wing's power coupling
    pipeRun(kit, [[x - 1.4, -0.1, LANE.z1 - 0.5], [x - 1.4, 0.3, z - 1.0], [x - 0.2, 0.6, z - wingZ + 0.6], [x, 1.3, z - wingZ + 0.25]], 0.05, PALETTE.impMid, "rubber");
    kit.box("metal", x, 1.3, z - wingZ + 0.2, 0.3, 0.3, 0.3, { color: PALETTE.gunmetal });
  } else {
    // empty cradle: chains from the top beam and a lit status light
    for (const dz of [-1.2, 1.2]) kit.cyl("metal", x, top - 2.2, z + dz, 0.03, 3.2, "y", { color: PALETTE.steel, segments: 6 });
    kit.box("metal", x, top - 3.9, z, 0.6, 0.3, 3.0, { color: PALETTE.gunmetal });
    kit.box("emitRed", x, top - 4.1, z, 0.3, 0.1, 0.3);
  }
}

/** TIE wing panel (hexagon, same outline as the traffic TIE) standing upright in a plane normal to z. */
function wingPanel(kit, x, y, z, yaw) {
  const H = WING_H;
  const W = WING_W;
  const hex = new THREE.Shape([
    new THREE.Vector2(-W / 2, -H * 0.3),
    new THREE.Vector2(0, -H / 2),
    new THREE.Vector2(W / 2, -H * 0.3),
    new THREE.Vector2(W / 2, H * 0.3),
    new THREE.Vector2(0, H / 2),
    new THREE.Vector2(-W / 2, H * 0.3),
  ]);
  const pg = new THREE.ExtrudeGeometry(hex, { depth: 0.08, bevelEnabled: false });
  kit.add("tiePanel", pg, { pos: [x, y, z], rot: [0, yaw, 0], uv: "keep" });
  const pts = hex.getPoints();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const len = a.distanceTo(b);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const g = new THREE.BoxGeometry(len, 0.22, 0.22);
    g.rotateZ(ang);
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, 0.04);
    kit.add("tieHull", g, { pos: [x, y, z], rot: [0, yaw, 0] });
  }
  kit.add("tieHull", new THREE.BoxGeometry(0.2, H * 0.98, 0.3), { pos: [x, y, z + 0.04], rot: [0, yaw, 0] });
  kit.add("tieHull", new THREE.BoxGeometry(W * 0.98, 0.3, 0.2), { pos: [x, y, z + 0.04], rot: [0, yaw, 0] });
  // pylon stub (the collar the wing was unbolted from) on the inner face
  kit.cyl("tieHull", x, y, z + 0.28, 0.9, 0.3, "z", { segments: 12 });
  kit.collider([x - W / 2, y - H / 2, z - 0.2], [x + W / 2, y + H / 2, z + 0.5], "wing");
}

/** Twin ion engine pod on two cradle stands: cylinder body, rear nozzle ring, front intake, cabling. */
function enginePod(kit, ctx, x, z, yaw) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const P = (lx, ly, lz) => {
    const v = new THREE.Vector3(lx, ly, lz).applyQuaternion(q);
    return [v.x + x, ly, v.z + z];
  };
  const add = (mat, geo, lx, ly, lz, extra = {}) => kit.add(mat, geo, { pos: P(lx, ly, lz), quat: q, ...extra });
  // stands
  for (const lz of [-1.1, 1.1]) {
    add("paintedMetal", new THREE.BoxGeometry(1.8, 0.16, 0.5), 0, 0.08, lz, { color: PALETTE.impDark, texel: 2 });
    add("paintedMetal", new THREE.BoxGeometry(0.3, 1.0, 0.3), -0.6, 0.6, lz, { color: PALETTE.impMid, texel: 2 });
    add("paintedMetal", new THREE.BoxGeometry(0.3, 1.0, 0.3), 0.6, 0.6, lz, { color: PALETTE.impMid, texel: 2 });
    add("hazard", new THREE.BoxGeometry(1.5, 0.12, 0.3), 0, 1.16, lz, { texel: 3 });
  }
  // body along z at y = 1.9: dark housing with light structural bands, exposed ribs between them
  const body = new THREE.CylinderGeometry(0.66, 0.66, 3.2, 18).rotateX(Math.PI / 2);
  add("tiePanel", body, 0, 1.9, 0);
  for (const bz of [-1.1, -0.2, 0.7]) add("tieHull", new THREE.CylinderGeometry(0.74, 0.74, 0.34, 18).rotateX(Math.PI / 2), 0, 1.9, bz);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    add("metal", new THREE.BoxGeometry(0.1, 0.1, 2.6), 0.68 * Math.cos(a), 1.9 + 0.68 * Math.sin(a), -0.1, { color: PALETTE.gunmetal });
  }
  // nozzle ring + glow disc at the rear, intake cone at the front
  add("tieHull", new THREE.CylinderGeometry(0.55, 0.78, 0.6, 18, 1, true).rotateX(Math.PI / 2), 0, 1.9, 1.9);
  add("emitBlue", new THREE.CircleGeometry(0.5, 18), 0, 1.9, 1.62);
  add("tieHull", new THREE.CylinderGeometry(0.5, 0.72, 0.5, 18).rotateX(Math.PI / 2), 0, 1.9, -1.85);
  add("tiePanel", new THREE.CircleGeometry(0.48, 18).rotateY(Math.PI), 0, 1.9, -2.11);
  // fittings and a service cable to the floor
  for (let k = 0; k < 4; k++) add("metal", new THREE.BoxGeometry(0.16, 0.12, 0.5), 0.6 * Math.cos((k / 4) * Math.PI * 2 + 0.4), 1.9 + 0.6 * Math.sin((k / 4) * Math.PI * 2 + 0.4), 0.25 + (k % 2) * 0.6, { color: PALETTE.gunmetal });
  add("emitAmber", new THREE.BoxGeometry(0.3, 0.06, 0.01), 0, 2.5, -0.35);
  pipeRun(kit, [P(0.5, 2.2, 0.2), P(1.4, 1.2, 0.6), P(2.4, 0.1, 1.2)], 0.04, PALETTE.impBlack, "rubber");
  kit.collider([x - 1.2, 0, z - 2.3], [x + 1.2, 2.7, z + 2.3], "pod");
  void ctx;
}

// ---------------------------------------------------------------------------
function consoles(kit, ctx) {
  // diagnostics row at the end of the service lane: three consoles whose screens face the lane (-x)
  for (const z of [-103.6, -100, -96.4]) impConsole(kit, ctx, { x: 62.2, z, yaw: -Math.PI / 2, w: 2.6, d: 0.9, screens: [1, 2], chair: z === -100, seed: ctx.seed + z, lampMat: "emitAmber" });
  // a tall status board behind them on the far wall
  wallScreen(kit, ctx, { side: "xmax", u: 25, v: 2.4, w: 3.2, h: 1.6, screen: 2 }); // z = -100
  wallScreen(kit, ctx, { side: "xmax", u: 21.4, v: 2.0, w: 1.6, h: 0.9, screen: 1 });
  wallScreen(kit, ctx, { side: "xmax", u: 28.6, v: 2.0, w: 1.6, h: 0.9, screen: 0 });
}

// ---------------------------------------------------------------------------
// Fuel tanks along the aft wall (zmax): vertical cylinders with hazard bands, gauges, feed pipes
// ---------------------------------------------------------------------------
function fuelTanks(kit, ctx, min, max) {
  const z = max[2] - 2.2;
  const xs = [42, 46.4, 50.8];
  for (const x of xs) {
    kit.cyl("paintedMetal", x, 0.25, z, 1.5, 0.5, "y", { color: PALETTE.impBlack, segments: 18, texel: 1 });
    kit.cyl("paintedMetal", x, 3.0, z, 1.25, 5.0, "y", { color: PALETTE.impGrey, segments: 18, texel: 1 });
    kit.add("paintedMetal", new THREE.SphereGeometry(1.25, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, 5.5, z], color: PALETTE.impGrey, texel: 1 });
    kit.cyl("hazard", x, 1.6, z, 1.27, 0.5, "y", { segments: 18, texel: 1 });
    kit.cyl("paintedMetal", x, 4.4, z, 1.27, 0.25, "y", { color: PALETTE.impDark, segments: 18, texel: 2 });
    // gauge cluster on the front (-z side)
    kit.box("paintedMetal", x, 2.4, z - 1.3, 0.7, 1.0, 0.16, { color: PALETTE.impDark, texel: 2 });
    kit.box("impScreen4", x, 2.6, z - 1.39, 0.5, 0.35, 0.01, { uv: "keep" });
    kit.box("emitAmber", x - 0.15, 2.15, z - 1.39, 0.12, 0.08, 0.01);
    kit.box("emitGreen", x + 0.15, 2.15, z - 1.39, 0.12, 0.08, 0.01);
    kit.cyl("metal", x, 6.3, z, 0.18, 0.8, "y", { color: PALETTE.steel, segments: 10 });
    // feed pipe up the wall and a hose to the floor manifold
    pipeRun(kit, [[x, 6.6, z], [x, 7.4, z], [x, 7.4, max[2] - 0.4]], 0.12, PALETTE.impMid, "metal");
    pipeRun(kit, [[x, 1.0, z - 1.25], [x, 0.35, z - 2.2], [x, 0.25, z - 4.0]], 0.07, PALETTE.impBlack, "rubber");
    kit.collider([x - 1.35, 0, z - 1.45], [x + 1.35, 6.5, z + 1.35], "tank");
  }
  // floor manifold with valves, then a hose run along the aft wall to the trench
  const mz = z - 4.2;
  kit.boxMM("paintedMetal", [xs[0] - 1.0, 0, mz - 0.3], [xs[2] + 1.0, 0.5, mz + 0.3], { color: PALETTE.impDark, texel: 2 });
  for (const x of xs) {
    kit.cyl("metal", x, 0.75, mz, 0.12, 0.5, "y", { color: PALETTE.steel, segments: 10 });
    kit.cyl("metal", x, 1.0, mz, 0.3, 0.06, "y", { color: new THREE.Color("#b8352a"), segments: 12 });
  }
  kit.collider([xs[0] - 1.0, 0, mz - 0.3], [xs[2] + 1.0, 1.0, mz + 0.3], "manifold");
  pipeRun(kit, [[xs[2] + 1.0, 0.25, mz], [56, 0.25, mz], [56, 0.25, LANE.z1 + 0.3], [56, -0.1, LANE.z1 - 0.3]], 0.07, PALETTE.impBlack, "rubber");
  // fuel warning signage on the wall behind the tanks
  const seg = wallSegment(ctx.bounds, "zmax");
  const { frame } = wallFrame(kit, seg.from, seg.to, 0);
  frame.add("decal", new THREE.PlaneGeometry(1.6, 1.6), seg.from[0] - 46.4, 8.2, 0.012, { uv: "keep", uvRect: decalRect(13) });
  frame.box("paintedMetal", seg.from[0] - 46.4, 9.8, 0.05, 7.0, 0.8, 0.1, { color: PALETTE.impBlack, texel: 2 });
  frame.box("emitRed", seg.from[0] - 46.4, 9.8, 0.11, 6.4, 0.16, 0.02);
  void min;
}

// ---------------------------------------------------------------------------
// Tool walls: pegboards with hanging tools, cabinets, racks; along the forward wall (zmin)
// ---------------------------------------------------------------------------
function toolWalls(kit, ctx, min, max, rand) {
  const seg = wallSegment(ctx.bounds, "zmin");
  const { frame } = wallFrame(kit, seg.from, seg.to, 0);
  const u0 = 40 - min[0];
  // pegboard panels with tool silhouettes (metal boxes / cylinders) and a lit shelf lip
  for (let i = 0; i < 3; i++) {
    const u = u0 + 8 + i * 3.2;
    frame.box("impPanel", u, 1.7, 0.08, 2.8, 1.8, 0.06, { color: PALETTE.impMid, uv: "keep" });
    frame.box("paintedMetal", u, 1.7, 0.05, 2.9, 1.9, 0.02, { color: PALETTE.impBlack, texel: 2 });
    const n = 7 + Math.floor(rand() * 5);
    for (let k = 0; k < n; k++) {
      const tu = u - 1.2 + rand() * 2.4;
      const tv = 1.05 + rand() * 1.3;
      if (rand() < 0.5) frame.box("metal", tu, tv, 0.14, 0.06 + rand() * 0.1, 0.25 + rand() * 0.45, 0.05, { color: rand() < 0.5 ? PALETTE.steel : PALETTE.gunmetal });
      else frame.cylV("metal", tu, tv, 0.14, 0.03 + rand() * 0.04, 0.3 + rand() * 0.4, { color: PALETTE.steel, segments: 8 });
    }
    frame.box("paintedMetal", u, 0.72, 0.18, 2.8, 0.06, 0.36, { color: PALETTE.impDark, texel: 2 });
    frame.box("emitAmber", u, 2.66, 0.1, 2.4, 0.04, 0.02);
    frame.collider(u - 1.45, u + 1.45, 0, 0.75, 0, 0.4, "shelf");
  }
  // tool cabinets between the boards and racks further along
  for (const u of [u0 + 4.6, u0 + 20]) {
    frame.box("paintedMetal", u, 1.0, 0.4, 1.8, 2.0, 0.8, { color: PALETTE.impDark, texel: 1.5 });
    frame.box("impPanel1", u, 1.0, 0.806, 1.7, 1.9, 0.012, { color: PALETTE.impGrey, uv: "keep" });
    for (let r = 0; r < 5; r++) frame.box("metal", u, 0.3 + r * 0.36, 0.82, 1.5, 0.03, 0.02, { color: PALETTE.steel });
    frame.box("emitBlue", u - 0.6, 1.95, 0.815, 0.3, 0.03, 0.01);
    frame.box("hazard", u, 0.03, 0.4, 1.8, 0.06, 0.8, { texel: 3 });
    frame.collider(u - 0.9, u + 0.9, 0, 2.0, 0, 0.82, "cabinet");
  }
  equipmentRack(kit, ctx, { side: "zmin", u: u0 + 22, w: 1.4, h: 2.6, seed: ctx.seed + 3, lit: "emitAmber" });
  equipmentRack(kit, ctx, { side: "zmin", u: u0 + 23.6, w: 1.4, h: 2.6, seed: ctx.seed + 4, lit: "emitAmber" });
  wallScreen(kit, ctx, { side: "zmin", u: u0 + 28, v: 1.8, w: 1.6, h: 0.9, screen: 1 });
  void max;
}

// ---------------------------------------------------------------------------
// Parts shelving along the far wall (xmax): steel uprights, four shelves, boxes and TIE spares
// ---------------------------------------------------------------------------
function shelving(kit, ctx, min, max, rand) {
  const x = max[0] - 0.9;
  for (const [z0, z1] of [
    [-122, -114],
    [-86, -78],
  ]) {
    for (let z = z0; z <= z1; z += 2) kit.box("metal", x, 2.0, z, 0.9, 4.0, 0.08, { color: PALETTE.gunmetal });
    for (const y of [0.3, 1.4, 2.5, 3.6]) {
      kit.boxMM("metal", [x - 0.45, y, z0], [x + 0.45, y + 0.05, z1], { color: PALETTE.steel });
      let z = z0 + 0.2;
      while (z < z1 - 0.4) {
        const w = 0.5 + rand() * 0.9;
        const h = 0.35 + rand() * 0.6;
        if (rand() < 0.75) kit.box("impPanel1", x, y + 0.05 + h / 2, z + w / 2, 0.7, h, w - 0.1, { color: rand() < 0.5 ? PALETTE.impMid : PALETTE.impDark, uv: "keep" });
        else kit.cyl("tieHull", x, y + 0.05 + 0.3, z + w / 2, 0.28, 0.6, "y", { segments: 10 });
        if (rand() < 0.4) kit.box(rand() < 0.5 ? "emitBlue" : "emitAmber", x - 0.36, y + 0.15, z + w / 2, 0.01, 0.03, 0.14);
        z += w + 0.15;
      }
    }
    kit.boxMM("hazard", [x - 0.6, 0, z0 - 0.1], [x + 0.45, 0.012, z1 + 0.1], { texel: 2 });
    kit.collider([x - 0.5, 0, z0 - 0.1], [max[0], 4.0, z1 + 0.1], "shelves");
  }
  // spare wing pylons stacked in a rack near the aft shelves
  kit.boxMM("paintedMetal", [max[0] - 3.4, 0, -76.6], [max[0] - 1.2, 0.2, -75.6], { color: PALETTE.impDark, texel: 2 });
  void min;
}

// ---------------------------------------------------------------------------
// Overhead hoist: two ceiling rails along x over the cradles, a bridge trolley with a hook over the
// empty cradle (slow travel along x)
// ---------------------------------------------------------------------------
function hoist(kit, ctx, min, max) {
  const y = max[1] - 1.2;
  for (const z of [-114.5, -105.5, -94.5, -85.5]) {
    kit.boxMM("paintedMetal", [min[0] + 3, y, z - 0.25], [max[0] - 2, y + 0.5, z + 0.25], { color: PALETTE.impDark, texel: 1.5 });
    for (let x = min[0] + 5; x < max[0] - 2; x += 8) kit.box("paintedMetal", x, (y + 0.5 + max[1]) / 2, z, 0.25, max[1] - y - 0.5, 0.25, { color: PALETTE.impMid, texel: 2 });
  }
  // moving bridge over the empty cradle: spans the two rails, carries a trolley + chain + hook
  const c = CRADLES[1];
  const g = new THREE.Group();
  const k = new Kit(ctx.materials);
  k.box("paintedMetal", 0, y - 0.35, 0, 1.2, 0.6, 10.4, { color: PALETTE.impMid, texel: 1.5 });
  k.box("hazard", 0.61, y - 0.35, 0, 0.02, 0.3, 9.4, { texel: 1 });
  k.box("hazard", -0.61, y - 0.35, 0, 0.02, 0.3, 9.4, { texel: 1 });
  for (const dz of [-4.5, 4.5]) {
    k.box("paintedMetal", 0, y + 0.2, dz, 1.4, 0.5, 1.0, { color: PALETTE.impDark, texel: 2 });
    k.box("emitAmber", 0.71, y + 0.2, dz, 0.01, 0.1, 0.5);
  }
  k.box("paintedMetal", 0, y - 1.0, 0, 1.0, 0.7, 1.2, { color: PALETTE.impDark, texel: 2 });
  k.box("emitRed", 0, y - 1.0, 0.61, 0.2, 0.15, 0.01);
  k.cyl("metal", 0, y - 3.4, 0, 0.035, 4.2, "y", { color: PALETTE.steel, segments: 6 });
  k.box("paintedMetal", 0, y - 5.7, 0, 0.6, 0.7, 0.4, { color: PALETTE.impDark, texel: 2 });
  k.add("metal", new THREE.TorusGeometry(0.28, 0.06, 8, 16), { pos: [0, y - 6.3, 0], color: PALETTE.steel });
  k.build(g);
  g.position.set(c.x, 0, c.z);
  ctx.mesh(g);
  ctx.anim((dt, t) => {
    g.position.x = c.x + Math.sin(t * 0.09) * 5.5;
  });
}

// ---------------------------------------------------------------------------
function props(kit, ctx, min, max, rand) {
  // crates and a parts pallet near the forward corner, drums by the tanks, tool carts by the cradles
  for (let i = 0; i < 4; i++) crate(kit, ctx, { x: 41 + (i % 2) * 1.7, z: -121.5 + Math.floor(i / 2) * 1.6, sx: 1.4, sy: 0.9 + rand() * 0.6, sz: 1.3, yaw: (rand() - 0.5) * 0.3, seed: ctx.seed + i });
  crate(kit, ctx, { x: 41.8, y: 1.6, z: -120.7, sx: 1.2, sy: 0.8, sz: 1.1, yaw: 0.3, seed: ctx.seed + 8 });
  for (const [x, z] of [
    [58, -79.5],
    [59.4, -79.2],
    [60.8, -79.7],
  ]) {
    kit.cyl("paintedMetal", x, 0.6, z, 0.42, 1.2, "y", { color: PALETTE.impMid, segments: 14, texel: 1 });
    kit.cyl("hazard", x, 0.6, z, 0.43, 0.2, "y", { segments: 14, texel: 2 });
    kit.cyl("metal", x, 1.21, z, 0.4, 0.03, "y", { color: PALETTE.gunmetal, segments: 14 });
    kit.collider([x - 0.45, 0, z - 0.45], [x + 0.45, 1.25, z + 0.45], "drum");
  }
  // hazard lane markings around the work area + wall decals
  for (const c of CRADLES) {
    kit.boxMM("emitAmber", [c.x - 3.4, 0.006, c.z - 6.1], [c.x + 3.4, 0.016, c.z - 5.98], {});
    kit.boxMM("emitAmber", [c.x - 3.4, 0.006, c.z + 5.98], [c.x + 3.4, 0.016, c.z + 6.1], {});
  }
  const decal = (side, u, v, idx, size = 1.2) => {
    const seg = wallSegment(ctx.bounds, side);
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    frame.add("decal", new THREE.PlaneGeometry(size, size), u, v, 0.012, { uv: "keep", uvRect: decalRect(idx) });
  };
  decal("xmin", 5, 2.4, 1, 1.4); // z = -80
  decal("xmin", 38, 2.4, 7, 1.4); // z = -113
  decal("xmax", 17, 5.0, 10, 2.0); // z = -108
  // a short railing guarding the hose manifold corner, a fire cabinet by the portal
  railing(kit, 41, -80.5, 52, -80.5, 0);
  const seg = wallSegment(ctx.bounds, "xmin");
  const { frame } = wallFrame(kit, seg.from, seg.to, 0);
  const u = seg.from[1] - -92;
  frame.box("paintedMetal", u, 1.1, 0.22, 0.9, 1.8, 0.44, { color: PALETTE.impDark, texel: 2 });
  frame.box("impPanel", u, 1.1, 0.446, 0.8, 1.6, 0.012, { color: new THREE.Color("#b8352a"), uv: "keep" });
  frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), u, 1.5, 0.454, { uv: "keep", uvRect: decalRect(13) });
  frame.box("emitRed", u, 2.08, 0.4, 0.5, 0.06, 0.06);
  frame.collider(u - 0.45, u + 0.45, 0, 2.0, 0, 0.46, "cabinet");
  void min;
  void max;
}

// ---------------------------------------------------------------------------
// Lighting: amber work lights over the cradles and the tanks, cool white over the lane / consoles
// ---------------------------------------------------------------------------
function lighting(kit, ctx, min, max) {
  const y = max[1] - 2.2;
  for (const c of CRADLES) ctx.light(pointLight(0xffb060, 44, 40, [c.x, y, c.z]));
  ctx.light(pointLight(0xffb060, 22, 28, [46, y, -80]));
  ctx.light(pointLight(0xe8f0ff, 40, 44, [46, y, -100]));
  ctx.light(pointLight(0xe8f0ff, 34, 40, [64, y, -100]));
  ctx.light(pointLight(0xffb060, 14, 20, [49, 6, -107.5]));
  // fixtures: amber-lensed floods under the ceiling above each light
  for (const [x, z, amber] of [
    [CRADLES[0].x, CRADLES[0].z, true],
    [CRADLES[1].x, CRADLES[1].z, true],
    [46, -80, true],
    [46, -100, false],
    [64, -100, false],
  ]) {
    kit.box("paintedMetal", x, max[1] - 0.5, z, 1.6, 0.6, 1.6, { color: PALETTE.impDark, texel: 2 });
    kit.box(amber ? "emitAmber" : "emitWhite", x, max[1] - 0.81, z, 1.3, 0.03, 1.3);
  }
  void min;
}
