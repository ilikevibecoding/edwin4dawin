// Deck 5 — Fighter Maintenance & Refuelling. A 33.6 × 50 × 14 m workshop off the main bay's starboard
// portal: two TIE-sized maintenance cradles — one holding a complete TIE/ln nose-on to the portal, the
// other receiving a wing panel slung from the overhead hoist — an engine pod on stands, diagnostic
// consoles, fuel tanks with gauges and hoses, tool walls, parts shelving and free-standing parts racks,
// a fuel bowser, tool carts and latched cargo pods on the work floor, and a grated service lane down
// the middle, under three floods: amber over the cradles, white over the lane. Walls are one panel
// tone (a mixed palette read as a checkerboard); the hoist carries a wing on twin chains, a hook
// block with an open hook and a heavy spreader bar.
//
// Deck-local metres, floor y = 0. Room bounds x 36.4..70, y 0..14, z -125..-75.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { impWall, impFloor, impCeiling, impConsole, wallScreen, equipmentRack, railing, pipeRun, pillar, wallSegment } from "../imperial.js";
import { pointLight, wallFrame } from "../builders.js";
import { Kit, rng } from "../../kit.js";
import { decalRect } from "../../textures.js";
import { tieGeometries } from "../../traffic/fighters.js";
import { bowser, toolCart, cargoPod } from "./hangar.js";

const WING_H = 7.2;
const WING_W = 3.9;
const WING_Z = 1.9 + 1.75; // wing planes sit at ±3.65 along z from the cradle centre (TIE yawed 90°)
const TIE_Y = WING_H / 2 + 0.5; // centre height of a fighter / wing held in the clamps
const CRADLES = [
  { x: 56, z: -110, tie: true },
  { x: 56, z: -90, tie: false },
];
const LANE = { z0: -101.6, z1: -98.4, x1: 59.6 }; // grated service lane from the portal to the diagnostics row

export function buildFighterBay(kit, ctx) {
  const [min, max] = ctx.bounds;
  const rand = rng(ctx.seed + 9);
  ensureMaterials(ctx);
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
    // one panel tone with a rare darker plate: a mixed palette here read as a light/dark checkerboard
    // on the rear wall; the rhythm comes from the rows, pilasters and fittings instead
    impWall(kit, ctx, side, {
      rows: [0, 0.5, 2.0, 3.4, 6.6, 10.2, H],
      panelW: 2.8,
      paints: [
        [PALETTE.impGrey, 0.92],
        [PALETTE.impMid, 0.08],
      ],
      styles: { panel: 0.7, vent: 0.07, greeble: 0.09, strip: 0.06, screen: 0.03, conduit: 0.05 },
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
      [PALETTE.impMid, 0.82],
      [PALETTE.impDark, 0.18],
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
    kit.boxMM("hazard", [min[0] + 0.5, portal.h + 0.35, portal.pos[1] - portal.w / 2 - 1.0], [min[0] + 0.52, portal.h + 0.95, portal.pos[1] + portal.w / 2 + 1.0], { texel: 1 });
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
    kit.boxMM("hazard", [x0, 0.0, z + (z === LANE.z0 ? -0.3 : 0.06)], [x1, 0.012, z + (z === LANE.z0 ? -0.06 : 0.3)], { texel: 1 });
  }
  // end rail and hazard band where the lane meets the diagnostics row
  kit.boxMM("metal", [x1 - 0.06, 0, LANE.z0], [x1 + 0.06, 0.03, LANE.z1], { color: PALETTE.steel });
  kit.boxMM("hazard", [x1 + 0.06, 0, LANE.z0 - 0.3], [x1 + 0.3, 0.012, LANE.z1 + 0.3], { texel: 1 });
  // cross bearers under the grate
  for (let x = x0 + 1.5; x < x1; x += 3) kit.boxMM("metal", [x - 0.06, -0.1, LANE.z0], [x + 0.06, 0, LANE.z1], { color: PALETTE.gunmetal });
  void ctx;
  void max;
}

// ---------------------------------------------------------------------------
// Maintenance cradle: floor rails, two A-frame uprights either side of the wing planes, a top beam
// with clamp arms; the first one holds a complete TIE, the second is receiving a wing from the hoist
// ---------------------------------------------------------------------------
function cradle(kit, ctx, { x, z, tie }, rand) {
  const wingZ = WING_Z;
  const top = WING_H + 1.6;
  // base frame: two heavy rails along z plus cross ties, hazard border on the floor
  for (const dx of [-2.4, 2.4]) kit.boxMM("paintedMetal", [x + dx - 0.25, 0, z - wingZ - 1.4], [x + dx + 0.25, 0.45, z + wingZ + 1.4], { color: PALETTE.impDark, texel: 1.5 });
  for (const dz of [-wingZ - 1.2, -wingZ + 1.2, wingZ - 1.2, wingZ + 1.2]) kit.boxMM("paintedMetal", [x - 2.4, 0.1, z + dz - 0.15], [x + 2.4, 0.4, z + dz + 0.15], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("hazard", [x - 3.2, 0, z - wingZ - 2.2], [x + 3.2, 0.012, z - wingZ - 1.9], { texel: 1 });
  kit.boxMM("hazard", [x - 3.2, 0, z + wingZ + 1.9], [x + 3.2, 0.012, z + wingZ + 2.2], { texel: 1 });
  kit.boxMM("hazard", [x - 3.2, 0, z - wingZ - 2.2], [x - 2.9, 0.012, z + wingZ + 2.2], { texel: 1 });
  kit.boxMM("hazard", [x + 2.9, 0, z - wingZ - 2.2], [x + 3.2, 0.012, z + wingZ + 2.2], { texel: 1 });
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
      kit.box("hazard", x, dy + 0.3, uz - s * 1.21, 0.9, 0.3, 0.02, { texel: 1 });
      kit.box(rand() < 0.5 ? "emitGreen" : "emitAmber", x + 0.3, dy + 0.55, uz - s * 1.2, 0.2, 0.05, 0.01);
    }
    kit.collider([x - 2.7, 0, uz - 0.3], [x + 2.7, top, uz + 0.3], "cradle");
  }
  // longitudinal top beams tying the two A-frames, with a lit work lamp bar underneath (the receiving
  // cradle has none: the wing coming down from the hoist hangs with its apex where the bar would be)
  for (const dx of [-2.4, 2.4]) kit.boxMM("paintedMetal", [x + dx - 0.2, top - 0.45, z - wingZ - 1.1], [x + dx + 0.2, top - 0.05, z + wingZ + 1.1], { color: PALETTE.impMid, texel: 1.5 });
  if (tie) {
    kit.boxMM("paintedMetal", [x - 0.4, top - 0.6, z - wingZ - 1.1], [x + 0.4, top - 0.4, z + wingZ + 1.1], { color: PALETTE.impBlack, texel: 2 });
    // dim lens: 7 m of strip seen end-on from the portal blew out on emitAmber
    kit.boxMM("emitAmberDim", [x - 0.25, top - 0.62, z - wingZ - 0.6], [x + 0.25, top - 0.6, z + wingZ + 0.6], {});
  }
  // service trolley-steps on the open side
  kit.box("paintedMetal", x - 3.6, 0.55, z, 0.9, 1.1, 1.6, { color: PALETTE.impDark, texel: 2 });
  kit.box("hazard", x - 3.6, 1.105, z, 0.9, 0.01, 1.6, { texel: 1 });
  kit.box("paintedMetal", x - 4.3, 0.28, z, 0.5, 0.56, 1.6, { color: PALETTE.impDark, texel: 2 });
  kit.box("hazard", x - 4.3, 0.565, z, 0.5, 0.01, 1.6, { texel: 1 });
  kit.collider([x - 4.55, 0, z - 0.8], [x - 3.15, 1.1, z + 0.8], "steps");
  if (tie) {
    // a complete TIE/ln held by both wings in the clamps, viewport toward the portal (-x): the traffic
    // system's own geometry, yawed 90° so the wing planes are normal to z
    const geo = tieGeometries();
    const rot = [0, Math.PI / 2, 0];
    kit.add("tieHull", geo.hull, { pos: [x, TIE_Y, z], rot, uv: "keep" });
    kit.add("tiePanel", geo.panel, { pos: [x, TIE_Y, z], rot, uv: "keep" });
    kit.add("tieGlass", geo.glass, { pos: [x, TIE_Y, z], rot, uv: "keep" });
    geo.glow.dispose(); // engines cold: no glow discs on a parked fighter
    // rubber-faced saddle blocks under the wing roots (the wings' lower vertices rest on them)
    for (const s of [-1, 1]) {
      kit.box("paintedMetal", x, 0.25, z + s * wingZ, 1.6, 0.5, 0.7, { color: PALETTE.impDark, texel: 2 });
      kit.box("rubber", x, 0.52, z + s * wingZ, 1.4, 0.06, 0.5, { color: PALETTE.impBlack });
    }
    kit.collider([x - 2.0, 0, z - wingZ - 0.3], [x + 2.0, WING_H + 0.5, z + wingZ + 0.3], "tie");
    // fuel hose from the trench to a coupling under the port pylon, power lead to the rear hatch
    pipeRun(kit, [[x - 1.4, -0.1, LANE.z1 - 0.5], [x - 1.4, 0.3, z - 1.0], [x - 0.7, 0.5, z - wingZ + 0.9], [x - 0.2, TIE_Y - 1.1, z - wingZ + 0.9]], 0.05, PALETTE.impMid, "rubber");
    kit.box("metal", x - 0.2, TIE_Y - 1.1, z - wingZ + 1.0, 0.3, 0.3, 0.3, { color: PALETTE.gunmetal });
    pipeRun(kit, [[x + 2.6, 0.0, LANE.z0 + 0.5], [x + 2.6, 0.25, z + 4.4], [x + 2.4, TIE_Y - 0.9, z + 0.9], [x + 2.05, TIE_Y - 0.25, z + 0.3]], 0.04, PALETTE.impBlack, "rubber");
    // status lamps on the clamp uprights read green: fighter secured
    for (const s of [-1, 1]) kit.box("emitGreen", x - 2.4, 1.4, z + s * (wingZ + 1.1) - s * 0.21, 0.3, 0.08, 0.01);
  } else {
    // receiving cradle: the wing is on the hoist above; the pylon collar it will bolt onto sits on a
    // pallet beside the cradle, a rolling stair waits at the wing plane
    kit.box("paintedMetal", x + 4.4, 0.08, z + 1.5, 1.6, 0.16, 1.6, { color: PALETTE.impDark, texel: 2 });
    kit.cyl("tieHull", x + 4.4, 0.9, z + 1.5, 0.9, 0.35, "y", { segments: 12 });
    kit.cyl("tieHull", x + 4.4, 0.45, z + 1.5, 0.62, 0.55, "y", { segments: 12 });
    kit.collider([x + 3.6, 0, z + 0.7], [x + 5.2, 1.1, z + 2.3], "pylon");
    kit.box("emitAmber", x - 2.4, 1.4, z - wingZ - 1.1 + 0.21, 0.3, 0.08, 0.01);
    // rolling stair outside the A-frame, climbing toward the wing plane, top step at clamp height
    const sx = x + 0.9;
    const sz = z - wingZ - 2.6;
    for (let i = 0; i < 6; i++) kit.box("paintedMetal", sx, 0.22 + i * 0.44, sz - 0.6 + i * 0.26, 1.2, 0.08, 0.3, { color: PALETTE.impDark, texel: 2 });
    for (const dx of [-0.58, 0.58]) {
      kit.add("paintedMetal", new THREE.BoxGeometry(0.06, 3.0, 0.06), { pos: [sx + dx, 1.4, sz + 0.05], rot: [-0.53, 0, 0], color: PALETTE.impDark, texel: 2 });
      kit.box("paintedMetal", sx + dx, 1.4, sz + 0.75, 0.06, 2.8, 0.06, { color: PALETTE.impDark, texel: 2 });
    }
    kit.box("paintedMetal", sx, 2.8, sz + 0.75, 1.2, 0.06, 0.6, { color: PALETTE.impDark, texel: 2 });
    kit.collider([sx - 0.65, 0, sz - 0.8], [sx + 0.65, 2.9, sz + 1.1], "rollstair");
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
    add("hazard", new THREE.BoxGeometry(1.5, 0.12, 0.3), 0, 1.16, lz, { texel: 1 });
  }
  // body along z at y = 1.9: dark painted housing with two mid-grey structural bands and exposed ribs
  // between them (hull-grey bands on a black barrel read as candy stripes and out-shouted the TIE)
  const body = new THREE.CylinderGeometry(0.66, 0.66, 3.2, 18).rotateX(Math.PI / 2);
  add("paintedMetal", body, 0, 1.9, 0, { color: PALETTE.impDark, texel: 1.5 });
  for (const bz of [-0.95, 0.75]) add("paintedMetal", new THREE.CylinderGeometry(0.74, 0.74, 0.34, 18).rotateX(Math.PI / 2), 0, 1.9, bz, { color: PALETTE.impMid, texel: 1.5 });
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
    frame.box("hazard", u, 0.03, 0.4, 1.8, 0.06, 0.8, { texel: 1 });
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
    kit.boxMM("hazard", [x - 0.6, 0, z0 - 0.1], [x + 0.45, 0.012, z1 + 0.1], { texel: 1 });
    kit.collider([x - 0.5, 0, z0 - 0.1], [max[0], 4.0, z1 + 0.1], "shelves");
  }
  // spare wing pylons stacked in a rack near the aft shelves
  kit.boxMM("paintedMetal", [max[0] - 3.4, 0, -76.6], [max[0] - 1.2, 0.2, -75.6], { color: PALETTE.impDark, texel: 2 });
  void min;
}

// ---------------------------------------------------------------------------
// Overhead hoist: two ceiling rails along x over the cradles and a bridge over the receiving cradle;
// its trolley hangs a wing panel on a spreader bar right over the cradle's outer wing plane, swaying
// gently as it is lowered onto the clamps
// ---------------------------------------------------------------------------
function hoist(kit, ctx, min, max) {
  const y = max[1] - 1.2;
  for (const z of [-114.5, -105.5, -94.5, -85.5]) {
    kit.boxMM("paintedMetal", [min[0] + 3, y, z - 0.25], [max[0] - 2, y + 0.5, z + 0.25], { color: PALETTE.impDark, texel: 1.5 });
    for (let x = min[0] + 5; x < max[0] - 2; x += 8) kit.box("paintedMetal", x, (y + 0.5 + max[1]) / 2, z, 0.25, max[1] - y - 0.5, 0.25, { color: PALETTE.impMid, texel: 2 });
  }
  const c = CRADLES[1];
  const wz = -WING_Z; // the wing goes into the cradle's -z clamps
  // ring centre: the spreader bar hangs at 9.2, above the cradle's top beams (8.75), so the rigging is
  // not hidden behind them from the portal; the wing's apex (8.8) sits between the beams
  const hookY = 10.0;
  const g = new THREE.Group();
  const k = new Kit(ctx.materials);
  k.box("paintedMetal", 0, y - 0.35, 0, 1.2, 0.6, 10.4, { color: PALETTE.impMid, texel: 1.5 });
  k.box("hazard", 0.61, y - 0.35, 0, 0.02, 0.3, 9.4, { texel: 1 });
  k.box("hazard", -0.61, y - 0.35, 0, 0.02, 0.3, 9.4, { texel: 1 });
  for (const dz of [-4.5, 4.5]) {
    k.box("paintedMetal", 0, y + 0.2, dz, 1.4, 0.5, 1.0, { color: PALETTE.impDark, texel: 2 });
    k.box("emitAmber", 0.71, y + 0.2, dz, 0.01, 0.1, 0.5);
  }
  // shallow trolley carriage under the girder over the wing plane; twin heavy chains set apart along
  // the girder (so both read as separate chains from the portal, which looks along the bar) down to a
  // hazard-banded hook block, and an open hook hanging face-on to the portal. The chains are built
  // from alternating link plates on a steel core (the bare rods read as hairlines at 20 m) and the
  // block / hook are 1.5× so they read past the cradle's A-frame
  k.box("paintedMetal", 0, y - 0.75, wz, 1.0, 0.3, 1.2, { color: PALETTE.impDark, texel: 2 });
  k.box("emitRed", 0, y - 0.75, wz + 0.61, 0.2, 0.12, 0.01);
  const chainTop = y - 0.9;
  const blockTop = hookY + 1.0;
  for (const dz of [-0.36, 0.36]) {
    k.cyl("metal", 0, (chainTop + blockTop) / 2, wz + dz, 0.06, chainTop - blockTop, "y", { color: PALETTE.gunmetal, segments: 8 });
    let i = 0;
    for (let cy = blockTop + 0.15; cy < chainTop - 0.1; cy += 0.3, i++) {
      if (i % 2 === 0) k.box("metal", 0, cy, wz + dz, 0.26, 0.4, 0.1, { color: PALETTE.steel });
      else k.box("metal", 0, cy, wz + dz, 0.1, 0.4, 0.26, { color: PALETTE.steel });
    }
  }
  k.box("paintedMetal", 0, hookY + 0.6, wz, 1.1, 0.8, 0.9, { color: PALETTE.impDark, texel: 2 });
  k.box("hazard", 0, hookY + 0.6, wz, 1.12, 0.3, 0.92, { texel: 1 });
  k.add("metal", new THREE.TorusGeometry(0.39, 0.11, 8, 16, Math.PI * 1.55).rotateZ(Math.PI * 0.72).rotateY(Math.PI / 2), { pos: [0, hookY + 0.02, wz], color: PALETTE.steel });
  k.build(g);
  // the load pivots at the ring: a heavy square-section spreader bar with hazard-banded end plates on
  // two slings, two more slings down to lugs on the wing's top edges
  const load = new THREE.Group();
  const lk = new Kit(ctx.materials);
  lk.add("metal", new THREE.TorusGeometry(0.32, 0.07, 8, 16), { pos: [0, -0.2, 0], color: PALETTE.steel });
  const barY = -0.8;
  const wingY = -4.8; // wing centre 5.2 abs: apex at 8.8, bottom at 1.6 (above the base rails), 0.7 above its clamps
  const lugY = wingY + 2.49; // where the hex's slanted top edge passes x = ±1.5
  lk.box("paintedMetal", 0, barY, 0, 3.6, 0.36, 0.36, { color: PALETTE.impDark, texel: 2 });
  for (const s of [-1, 1]) {
    lk.box("hazard", 0, barY, s * 0.181, 3.4, 0.28, 0.004, { texel: 1 });
    lk.box("paintedMetal", s * 1.8, barY, 0, 0.08, 0.72, 0.72, { color: PALETTE.impBlack, texel: 2 });
    lk.box("hazard", s * 1.845, barY, 0, 0.01, 0.6, 0.6, { texel: 1 });
    pipeRun(lk, [[0, -0.5, 0], [s * 1.5, barY + 0.18, 0]], 0.06, PALETTE.steel, "metal");
    pipeRun(lk, [[s * 1.5, barY - 0.18, 0], [s * 1.5, lugY + 0.12, 0.05]], 0.06, PALETTE.steel, "metal");
    lk.box("metal", s * 1.5, lugY + 0.05, 0.05, 0.2, 0.24, 0.1, { color: PALETTE.gunmetal });
  }
  wingPanel(lk, 0, wingY, -0.04, 0);
  lk.build(load);
  load.position.set(0, hookY, wz);
  g.add(load);
  g.position.set(c.x, 0, c.z);
  ctx.mesh(g);
  ctx.anim((dt, t) => {
    load.rotation.z = 0.014 * Math.sin(t * 0.9);
    load.rotation.x = 0.008 * Math.sin(t * 0.7 + 1.3);
  });
}

// ---------------------------------------------------------------------------
function props(kit, ctx, min, max, rand) {
  // containers (latched, labelled cargo pods): a stack in the forward corner and single pods on the work
  // floor either side of the lane where the portal view sees them; drums by the tanks, carts by the cradles
  for (let i = 0; i < 4; i++) cargoPod(kit, ctx, { x: 41 + (i % 2) * 1.7, z: -121.5 + Math.floor(i / 2) * 1.6, sx: 1.4, sy: 1.2, sz: 1.3, yaw: (rand() - 0.5) * 0.3, tone: i, label: [11, 6, 14, 9][i] });
  cargoPod(kit, ctx, { x: 41.8, y: 1.2, z: -120.7, sx: 1.2, sy: 0.8, sz: 1.1, yaw: 0.3, tone: 2, label: 6 });
  cargoPod(kit, ctx, { x: 48.6, z: -103.0, sx: 1.4, sy: 1.1, sz: 1.3, yaw: -1.05, tone: 0, label: 11 });
  cargoPod(kit, ctx, { x: 48.7, y: 1.1, z: -103.1, sx: 1.1, sy: 0.7, sz: 1.0, yaw: -1.25, tone: 2, label: 14 });
  cargoPod(kit, ctx, { x: 45.2, z: -106.6, sx: 1.4, sy: 1.2, sz: 1.3, yaw: -0.6, tone: 2, label: 9 });
  for (const [x, z] of [
    [58, -79.5],
    [59.4, -79.2],
    [60.8, -79.7],
  ]) {
    kit.cyl("paintedMetal", x, 0.6, z, 0.42, 1.2, "y", { color: PALETTE.impMid, segments: 14, texel: 1 });
    kit.cyl("hazard", x, 0.6, z, 0.43, 0.2, "y", { segments: 14, texel: 1 });
    kit.cyl("metal", x, 1.21, z, 0.4, 0.03, "y", { color: PALETTE.gunmetal, segments: 14 });
    kit.collider([x - 0.45, 0, z - 0.45], [x + 0.45, 1.25, z + 0.45], "drum");
  }
  // work floor either side of the lane: fuel bowser, tool carts and free-standing parts racks so the
  // foreground reads as a busy shop rather than empty deck; the bowser is parked pump-end toward the
  // portal so its valve panel, nozzle and hose reel face the fixed view instead of its tank cap
  bowser(kit, ctx, 45.0, -94.0, -2.6);
  toolCart(kit, ctx, 43.2, -104.8, 0.35);
  toolCart(kit, ctx, 46.8, -103.6, -1.1);
  toolCart(kit, ctx, 41.2, -95.6, 0.8);
  toolCart(kit, ctx, 52.6, -84.4, 0.2);
  toolCart(kit, ctx, 60.6, -115.8, -0.5);
  partsRack(kit, ctx, 43.4, -109.6, 0.0, rand);
  partsRack(kit, ctx, 50.9, -95.9, 0.0, rand);
  partsRack(kit, ctx, 46.2, -116.6, 1.1, rand);
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

/** Free-standing parts rack: two steel uprights, three shelves of boxes and TIE spares, a lit label strip. */
function partsRack(kit, ctx, x, z, yaw, rand) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const v = new THREE.Vector3(lx, ly, lz).applyQuaternion(q);
    return kit.add(mat, geo, { pos: [v.x + x, ly, v.z + z], quat: q, ...extra });
  };
  const W = 2.4;
  const D = 0.9;
  const H = 2.2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add("metal", new THREE.BoxGeometry(0.07, H, 0.07), sx * (W / 2 - 0.04), H / 2, sz * (D / 2 - 0.04), { color: PALETTE.gunmetal });
  for (const y of [0.15, 0.85, 1.55]) {
    add("metal", new THREE.BoxGeometry(W, 0.05, D), 0, y, 0, { color: PALETTE.steel });
    let u = -W / 2 + 0.15;
    while (u < W / 2 - 0.4) {
      const w = 0.35 + rand() * 0.55;
      const h = 0.25 + rand() * 0.4;
      if (rand() < 0.7) add("impPanel1", new THREE.BoxGeometry(w - 0.06, h, D - 0.25), u + w / 2, y + 0.025 + h / 2, 0, { color: rand() < 0.5 ? PALETTE.impMid : PALETTE.impDark, uv: "keep" });
      else add("tieHull", new THREE.CylinderGeometry(0.2, 0.2, Math.min(w, D) - 0.1, 10), u + w / 2, y + 0.025 + 0.2, 0);
      u += w + 0.1;
    }
  }
  add("paintedMetal", new THREE.BoxGeometry(W, 0.16, 0.04), 0, H - 0.08, D / 2 + 0.02, { color: PALETTE.impBlack, texel: 2 });
  add("emitAmber", new THREE.BoxGeometry(0.6, 0.06, 0.01), -0.6, H - 0.08, D / 2 + 0.045);
  add("leds", new THREE.BoxGeometry(0.5, 0.04, 0.01), 0.6, H - 0.08, D / 2 + 0.045, { uv: "keep" });
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (W * c + D * s) / 2 + 0.05;
  const ez = (W * s + D * c) / 2 + 0.05;
  kit.collider([x - ex, 0, z - ez], [x + ex, H, z + ez], "partsrack");
  void ctx;
}

// ---------------------------------------------------------------------------
// Lighting: three floods only (the pool is shared with the main bay): amber over each cradle, cool
// white over the lane; the other ceiling fixtures are emissive-only fill
// ---------------------------------------------------------------------------
function lighting(kit, ctx, min, max) {
  const y = max[1] - 2.2;
  // the receiving cradle's flood hangs 2.8 m past the hoist bridge: directly over the cradle it sat
  // 0.35 m under the girder, whose underside it lit to a white-out that bloomed over the hoist rigging
  // from the portal (the "rig head")
  const x1 = CRADLES[1].x + 2.8;
  ctx.light(pointLight(0xffb060, 120, 46, [CRADLES[0].x, y, CRADLES[0].z]));
  ctx.light(pointLight(0xffb060, 90, 40, [x1, y, CRADLES[1].z]));
  ctx.light(pointLight(0xe8f0ff, 75, 40, [47, y, -100]));
  // fixtures: amber-lensed floods under the ceiling above each light, dimmer lenses elsewhere. The
  // cradle floods sit ~20 m from the portal camera, which looks up at their lenses: those two run 30 %
  // dimmer and hang inside a 0.8 m hood, deep enough to hide the lens from that angle
  for (const [x, z, mat, hood] of [
    [CRADLES[0].x, CRADLES[0].z, "fb_emitAmberRig", true],
    [x1, CRADLES[1].z, "fb_emitAmberRig", true],
    [47, -100, "emitWhite", false],
    [46, -80, "emitAmberDim", false],
    [64, -100, "emitWhiteDim", false],
    [46, -118, "emitAmberDim", false],
  ]) {
    kit.box("paintedMetal", x, max[1] - 0.5, z, 1.6, 0.6, 1.6, { color: PALETTE.impDark, texel: 2 });
    kit.box(mat, x, max[1] - 0.81, z, 1.3, 0.03, 1.3);
    if (!hood) continue;
    const y0 = max[1] - 1.6;
    const y1 = max[1] - 0.8;
    kit.boxMM("paintedMetal", [x - 0.8, y0, z - 0.8], [x - 0.74, y1, z + 0.8], { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM("paintedMetal", [x + 0.74, y0, z - 0.8], [x + 0.8, y1, z + 0.8], { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM("paintedMetal", [x - 0.74, y0, z - 0.8], [x + 0.74, y1, z - 0.74], { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM("paintedMetal", [x - 0.74, y0, z + 0.74], [x + 0.74, y1, z + 0.8], { color: PALETTE.impBlack, texel: 2 });
  }
  void min;
}

/** Materials owned by this room, registered once on the shared dictionary. */
function ensureMaterials(ctx) {
  const m = ctx.materials;
  if (!m.fb_emitAmberRig) {
    m.fb_emitAmberRig = m.emitAmber.clone();
    m.fb_emitAmberRig.emissiveIntensity = m.emitAmber.emissiveIntensity * 0.7;
  }
}
