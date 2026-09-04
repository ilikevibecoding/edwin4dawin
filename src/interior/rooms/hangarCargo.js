// Deck 5 — Cargo Lift & Logistics. A 25 × 22 × 7 m logistics hall between the access corridor and
// the hangar: a big fenced cargo lift that cycles between the deck and +3 m, a long roller conveyor
// feeding it on the forward side with a container wall behind it, and on the aft side (no conveyor) a
// weigh station, a loader tug, drums and pallets, a logistics station with inventory screens, a
// ceiling hoist on a rail carrying a slung container over the lane, and hazard-striped traffic lanes.
// Three real lights: two ceiling floods and the amber lift lamp.
//
// Deck-local metres, floor y = 0. Room bounds x 2.9..28, y 0..7, z -30..-8; blast door on xmin at z = -19.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, impConsole, wallScreen, equipmentRack, railing, pipeRun, pillar, wallSegment } from "../imperial.js";
import { pointLight, wallFrame } from "../builders.js";
import { Kit, rng } from "../../kit.js";
import { decalRect } from "../../textures.js";
import { cargoPod } from "./hangar.js";

const LIFT = { x: 22.5, z: -19, half: 3.2 };
const LANES = [-24.5, -13.5]; // forward (long roller conveyor) / aft (weigh station + handling apron)

export function buildHangarCargo(kit, ctx) {
  const [min, max] = ctx.bounds;
  const rand = rng(ctx.seed + 33);
  ensureMaterials(ctx);
  roomShell(kit, ctx, {
    // the same dark gloss deck as the hangar: darkened, and lit softly enough that the plate speckle
    // does not read as a light terrazzo
    floor: { color: 0x666c74, texel: 0.4 },
    walls: {
      rows: [0, 0.5, 2.0, 3.4, 5.2, max[1]],
      panelW: 1.8,
      paints: [
        [PALETTE.impGrey, 0.42],
        [PALETTE.impLight, 0.28],
        [PALETTE.impMid, 0.2],
        [PALETTE.impDark, 0.1],
      ],
      styles: { panel: 0.6, vent: 0.1, greeble: 0.1, strip: 0.08, screen: 0.04, conduit: 0.08 },
      cove: true,
    },
    ceiling: {
      panelW: 2.6,
      rowH: 2.6,
      spacing: 6,
      maxLights: 2, // two floods + the amber lift light: the pool is shared with the hangar next door
      lightIntensity: 17,
      lightDistance: 24,
      styles: { panel: 0.86, greeble: 0.06, vent: 0.08 },
      paints: [
        [PALETTE.impMid, 0.7],
        [PALETTE.impGrey, 0.3],
      ],
    },
  });
  for (const z of [-27.5, -10.5]) {
    pillar(kit, 11, z, 0, max[1], 0.6, PALETTE.impMid);
    pillar(kit, 18, z, 0, max[1], 0.6, PALETTE.impMid);
  }
  hazardLanes(kit, min, max);
  // forward side: the long roller conveyor feeding the lift, a container wall behind it;
  // aft side: no conveyor — the weigh station, a loader tug, drums and low pallets (the two sides
  // of the lane read differently)
  conveyor(kit, ctx, 6.5, LIFT.x - LIFT.half - 1.6, LANES[0], rand, { density: 0.55 });
  weighStation(kit, ctx, 7.6, LANES[1]);
  handlingApron(kit, ctx, min, max, rand);
  cargoLift(kit, ctx);
  containers(kit, ctx, min, max, rand);
  logistics(kit, ctx, min, max);
  hoist(kit, ctx, min, max);
  ctx.light(pointLight(0xffb060, 14, 18, [LIFT.x, 5.6, LIFT.z]));
}

function ensureMaterials(ctx) {
  const m = ctx.materials;
  // lane edge / lift frame lamps: 20 m of amber strip 2 m from the camera bloomed white at emitAmber's 2.2
  if (!m.hc_amber) {
    m.hc_amber = m.emitAmber.clone();
    m.hc_amber.emissiveIntensity = 0.9;
  }
}

// ---------------------------------------------------------------------------
function hazardLanes(kit, min, max) {
  // a black lane from the door to the lift with amber edge lights; hazard bands at the conveyor ends
  const z0 = -20.8;
  const z1 = -17.2;
  // the lane itself is a darker band of the same gloss deck (a black painted-metal slab here read as a
  // speckled terrazzo under the floods)
  kit.boxMM("floorGloss", [min[0] + 0.4, 0, z0], [LIFT.x - LIFT.half - 1.0, 0.012, z1], { color: 0x2c3036, texel: 0.33 });
  for (const z of [z0, z1]) {
    kit.boxMM("hazard", [min[0] + 0.4, 0, z - 0.2], [LIFT.x - LIFT.half - 1.0, 0.014, z + 0.2], { texel: 0.7 });
    for (let x = min[0] + 1.5; x < LIFT.x - LIFT.half - 1.6; x += 2.2) kit.boxMM("hc_amber", [x, 0.014, z - 0.06], [x + 1.0, 0.026, z + 0.06], {});
  }
  void max;
}

// ---------------------------------------------------------------------------
// Aft handling apron (no conveyor on this side): a loader tug with a container on its forks, a drum
// row against the wall, a stack of empty pallets and a hand pallet jack
// ---------------------------------------------------------------------------
function handlingApron(kit, ctx, min, max, rand) {
  // loader tug: low chassis on four wheels, cab with dark glazing, forks carrying a container
  const tx = 13.2;
  const tz = -12.6;
  kit.box("paintedMetal", tx, 0.5, tz, 3.0, 0.6, 1.6, { color: PALETTE.impMid, texel: 1.5 });
  kit.box("hazard", tx, 0.2, tz, 3.04, 0.2, 1.64, { texel: 1 });
  kit.box("paintedMetal", tx + 0.9, 1.35, tz, 1.2, 1.1, 1.4, { color: PALETTE.impDark, texel: 1.5 });
  kit.box("tieGlass", tx + 0.29, 1.5, tz, 0.04, 0.6, 1.2);
  kit.box("emitAmber", tx + 0.9, 1.95, tz, 0.3, 0.1, 0.3);
  for (const sx of [-1.0, 1.0]) for (const sz of [-0.85, 0.85]) kit.cyl("rubber", tx + sx, 0.3, tz + sz, 0.3, 0.3, "z", { color: PALETTE.impBlack, segments: 12 });
  kit.box("paintedMetal", tx - 1.6, 0.9, tz, 0.2, 1.6, 1.3, { color: PALETTE.impDark, texel: 2 });
  for (const sz of [-0.45, 0.45]) kit.box("metal", tx - 2.4, 0.25, tz + sz, 1.6, 0.1, 0.14, { color: PALETTE.steel });
  cargoPod(kit, ctx, { x: tx - 2.4, y: 0.3, z: tz, sx: 1.3, sy: 1.0, sz: 1.3, yaw: Math.PI / 2, tone: 1, label: 14, collide: false });
  kit.collider([tx - 3.2, 0, tz - 0.95], [tx + 1.6, 2.0, tz + 0.95], "tug");
  // drums against the aft wall
  for (let i = 0; i < 5; i++) {
    const x = 15.5 + i * 1.05 + (rand() - 0.5) * 0.2;
    const z = max[2] - 1.2 + (rand() - 0.5) * 0.3;
    kit.cyl("paintedMetal", x, 0.6, z, 0.42, 1.2, "y", { color: i % 3 ? PALETTE.impMid : PALETTE.impGrey, segments: 14, texel: 1 });
    kit.cyl("hazard", x, 0.6, z, 0.43, 0.2, "y", { segments: 14, texel: 1 });
    kit.collider([x - 0.45, 0, z - 0.45], [x + 0.45, 1.25, z + 0.45], "drum");
  }
  // empty pallets and a hand pallet jack parked by the weigh station
  for (let i = 0; i < 5; i++) kit.box("paintedMetal", 10.4, 0.08 + i * 0.18, -10.4, 2.4, 0.14, 1.8, { color: i % 2 ? PALETTE.impDark : PALETTE.impMid, texel: 2 });
  kit.collider([9.2, 0, -11.3], [11.6, 1.0, -9.5], "pallets");
  for (const sz of [-0.3, 0.3]) kit.box("metal", 7.4, 0.12, -10.6 + sz, 1.6, 0.08, 0.16, { color: PALETTE.steel });
  kit.box("paintedMetal", 6.5, 0.35, -10.6, 0.4, 0.5, 0.7, { color: PALETTE.impDark, texel: 2 });
  kit.add("metal", new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), { pos: [6.1, 0.9, -10.6], rot: [0, 0, 0.5], color: PALETTE.steel });
  kit.collider([6.2, 0, -11.0], [8.2, 0.6, -10.2], "jack");
  void min;
}

// ---------------------------------------------------------------------------
// Roller conveyor along x: tall dark side rails (hazard band outside, steel lip on top) on legs, a black
// belt band between them and fat steel rollers standing proud of the belt, a drive box at the lift end,
// a control post at the door end, containers riding it (`density` = share of the run)
// ---------------------------------------------------------------------------
function conveyor(kit, ctx, x0, x1, z, rand, { density = 0.5 } = {}) {
  const y = 0.85; // roller axis height
  const w = 1.4; // rail spacing
  for (const s of [-1, 1]) {
    const rz = z + s * (w / 2);
    kit.boxMM("paintedMetal", [x0, y - 0.45, rz - 0.05], [x1, y + 0.06, rz + 0.05], { color: PALETTE.impDark, texel: 2 });
    kit.boxMM("hazard", [x0 + 0.3, y - 0.36, rz + s * 0.051], [x1 - 0.3, y - 0.14, rz + s * 0.056], { texel: 0.7 });
    kit.boxMM("metal", [x0, y + 0.06, rz - 0.07], [x1, y + 0.1, rz + 0.07], { color: PALETTE.steel });
  }
  // belt band under the rollers and the legs / cross ties
  kit.boxMM("rubber", [x0 + 0.1, y - 0.2, z - w / 2 + 0.05], [x1 - 0.1, y - 0.06, z + w / 2 - 0.05], { color: PALETTE.impBlack });
  for (let x = x0 + 0.4; x < x1; x += 2.2) {
    for (const s of [-1, 1]) kit.box("paintedMetal", x, (y - 0.45) / 2, z + s * (w / 2), 0.12, y - 0.45, 0.12, { color: PALETTE.impDark, texel: 2 });
    kit.box("paintedMetal", x, 0.04, z, 0.3, 0.08, w + 0.3, { color: PALETTE.impBlack, texel: 2 });
    kit.box("paintedMetal", x, y - 0.5, z, 0.1, 0.08, w, { color: PALETTE.impDark, texel: 2 });
  }
  for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.42) kit.cyl("metal", x, y, z, 0.11, w - 0.12, "z", { color: PALETTE.steel, segments: 12 });
  // drive housing at the lift end, control post at the door end
  kit.box("paintedMetal", x1 - 0.5, y - 0.3, z, 1.0, 0.7, w + 0.3, { color: PALETTE.impDark, texel: 2 });
  kit.box("emitGreen", x1 - 0.5, y - 0.2, z + w / 2 + 0.16, 0.3, 0.08, 0.01);
  kit.box("paintedMetal", x0 - 0.2, 0.6, z + w / 2 + 0.5, 0.3, 1.2, 0.3, { color: PALETTE.impDark, texel: 2 });
  kit.box("impScreen1", x0 - 0.2, 1.22, z + w / 2 + 0.5, 0.26, 0.02, 0.26, { uv: "keep" });
  kit.box("emitAmber", x0 - 0.05, 1.0, z + w / 2 + 0.5, 0.01, 0.06, 0.16);
  kit.collider([x0 - 0.1, 0, z - w / 2 - 0.15], [x1, y + 0.1, z + w / 2 + 0.15], "conveyor");
  kit.collider([x0 - 0.35, 0, z + w / 2 + 0.35], [x0 - 0.05, 1.25, z + w / 2 + 0.65], "post");
  // containers riding the rollers
  let x = x0 + 1.0 + rand() * 1.5;
  let n = 0;
  while (x < x1 - 1.8) {
    const sx = 0.9 + rand() * 0.6;
    cargoPod(kit, ctx, { x: x + sx / 2, y: y + 0.11, z, sx, sy: 0.7 + rand() * 0.5, sz: 1.0 + rand() * 0.2, yaw: 0, tone: n, label: [11, 6, 14, 9][n % 4], collide: false });
    x += sx + (1.2 + rand() * 3.5) * (0.5 / density);
    n++;
  }
}

/** Weigh / scan station at the door end of the aft conveyor: a scale plate on the floor, a scanner arch, a console. */
function weighStation(kit, ctx, x, z) {
  kit.boxMM("paintedMetal", [x - 1.4, 0, z - 1.2], [x + 1.4, 0.12, z + 1.2], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("impPanel", [x - 1.3, 0.12, z - 1.1], [x + 1.3, 0.14, z + 1.1], { color: PALETTE.impMid, uv: "keep" });
  kit.boxMM("hazard", [x - 1.42, 0.12, z - 1.22], [x + 1.42, 0.125, z - 1.1], { texel: 0.5 });
  kit.boxMM("hazard", [x - 1.42, 0.12, z + 1.1], [x + 1.42, 0.125, z + 1.22], { texel: 0.5 });
  kit.collider([x - 1.4, 0, z - 1.2], [x + 1.4, 0.14, z + 1.2], "scale");
  // scanner arch over the plate
  for (const s of [-1, 1]) kit.box("paintedMetal", x, 1.3, z + s * 1.35, 0.3, 2.6, 0.3, { color: PALETTE.impDark, texel: 2 });
  kit.box("paintedMetal", x, 2.72, z, 0.36, 0.24, 3.0, { color: PALETTE.impDark, texel: 2 });
  kit.box("emitBlue", x, 2.59, z, 0.2, 0.02, 2.4);
  for (const s of [-1, 1]) kit.box("emitBlueDim", x + 0.16, 1.4, z + s * 1.35, 0.01, 1.6, 0.12);
  for (const s of [-1, 1]) kit.collider([x - 0.2, 0, z + s * 1.35 - 0.2], [x + 0.2, 2.9, z + s * 1.35 + 0.2], "arch");
  impConsole(kit, ctx, { x: x - 2.2, z: z + 0.2, yaw: -Math.PI / 2, w: 1.4, d: 0.7, screens: [1], seed: ctx.seed + 8, lampMat: "emitAmber" });
}

// ---------------------------------------------------------------------------
// Fenced cargo lift: four-post cage with an overhead frame, railings around the pit with a gate, the
// platform (a ctx.mesh) cycling 0 .. 3 m with a pallet of containers on it
// ---------------------------------------------------------------------------
function cargoLift(kit, ctx) {
  const { x, z, half } = LIFT;
  const H = 6.6;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      kit.box("paintedMetal", x + sx * (half + 0.35), H / 2, z + sz * (half + 0.35), 0.4, H, 0.4, { color: PALETTE.impDark, texel: 2 });
      kit.box("metal", x + sx * (half + 0.35), H / 2, z + sz * (half + 0.35), 0.14, H - 0.2, 0.46, { color: PALETTE.steel });
      kit.collider([x + sx * (half + 0.35) - 0.25, 0, z + sz * (half + 0.35) - 0.25], [x + sx * (half + 0.35) + 0.25, H, z + sz * (half + 0.35) + 0.25], "post");
    }
  }
  kit.boxMM("paintedMetal", [x - half - 0.55, H - 0.5, z - half - 0.55], [x + half + 0.55, H, z + half + 0.55], { color: PALETTE.impDark, texel: 2 });
  kit.boxMM("hazard", [x - half - 0.56, H - 0.45, z - half - 0.56], [x + half + 0.56, H - 0.15, z - half - 0.54], { texel: 1 });
  kit.boxMM("hc_amber", [x - half, H - 0.52, z - 0.15], [x + half, H - 0.5, z + 0.15], {});
  kit.boxMM("hc_amber", [x - 0.15, H - 0.52, z - half], [x + 0.15, H - 0.5, z + half], {});
  // recessed pit (dark) under the platform and the hazard curb around it
  kit.boxMM("paintedMetal", [x - half - 0.1, -0.5, z - half - 0.1], [x + half + 0.1, -0.02, z + half + 0.1], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("hazard", [x - half - 0.7, 0, z - half - 0.7], [x + half + 0.7, 0.04, z + half + 0.7], { texel: 1 });
  kit.boxMM("paintedMetal", [x - half - 0.2, 0, z - half - 0.2], [x + half + 0.2, 0.05, z + half + 0.2], { color: PALETTE.impBlack, texel: 2 });
  // railings around the pit; the door-side (−x) run is split by a lit gate that stays shut
  const f = half + 0.75;
  railing(kit, x - f, z - f, x + f, z - f, 0.04);
  railing(kit, x - f, z + f, x + f, z + f, 0.04);
  railing(kit, x + f, z - f, x + f, z + f, 0.04);
  railing(kit, x - f, z - f, x - f, z - 1.2, 0.04);
  railing(kit, x - f, z + 1.2, x - f, z + f, 0.04);
  kit.box("paintedMetal", x - f, 0.6, z, 0.08, 1.1, 2.4, { color: PALETTE.impDark, texel: 2 });
  kit.box("hazard", x - f - 0.045, 0.6, z, 0.01, 0.5, 2.2, { texel: 1 });
  kit.box("emitRed", x - f - 0.05, 1.0, z, 0.01, 0.08, 1.6);
  kit.collider([x - f - 0.1, 0, z - 1.25], [x - f + 0.1, 1.15, z + 1.25], "gate");
  // control pedestal outside the gate
  kit.box("paintedMetal", x - f - 0.9, 0.6, z + 1.9, 0.4, 1.2, 0.4, { color: PALETTE.impDark, texel: 2 });
  kit.box("impScreen4", x - f - 0.9, 1.22, z + 1.9, 0.3, 0.02, 0.3, { uv: "keep" });
  kit.box("emitGreen", x - f - 1.11, 1.0, z + 1.9, 0.01, 0.06, 0.2);
  kit.collider([x - f - 1.1, 0, z + 1.7], [x - f - 0.7, 1.25, z + 2.1], "pedestal");
  // guide rails on the posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box("metal", x + sx * (half + 0.1), H / 2 - 0.3, z + sz * (half + 0.1), 0.1, H - 0.8, 0.1, { color: PALETTE.gunmetal });
  // moving platform
  const k = new Kit(ctx.materials);
  const g = new THREE.Group();
  k.box("floorGloss", 0, -0.14, 0, half * 2, 0.28, half * 2, { texel: 0.5 });
  k.box("hazard", 0, 0.005, 0, half * 2, 0.01, half * 2, { texel: 1 });
  k.box("paintedMetal", 0, -0.42, 0, half * 2 - 0.4, 0.3, half * 2 - 0.4, { color: PALETTE.impBlack, texel: 2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box("metal", sx * (half + 0.02), -0.1, sz * (half + 0.02), 0.3, 0.5, 0.3, { color: PALETTE.gunmetal });
  k.box("emitWhite", 0, -0.29, half + 0.01, half * 2 - 0.6, 0.04, 0.01);
  k.box("emitWhite", 0, -0.29, -half - 0.01, half * 2 - 0.6, 0.04, 0.01);
  // pallet of containers riding the lift
  k.box("paintedMetal", 0, 0.08, 0, 2.8, 0.16, 2.2, { color: PALETTE.impDark, texel: 2 });
  cargoPod(k, ctx, { x: -0.7, y: 0.16, z: -0.4, sx: 1.3, sy: 1.1, sz: 1.3, yaw: -Math.PI / 2, tone: 1, label: 11, collide: false });
  cargoPod(k, ctx, { x: 0.7, y: 0.16, z: -0.4, sx: 1.2, sy: 0.9, sz: 1.3, yaw: -Math.PI / 2, tone: 0, label: 6, collide: false });
  cargoPod(k, ctx, { x: 0.0, y: 0.16, z: 0.7, sx: 1.4, sy: 0.8, sz: 0.8, yaw: -Math.PI / 2, tone: 3, label: 9, collide: false });
  cargoPod(k, ctx, { x: -0.65, y: 1.26, z: -0.4, sx: 1.1, sy: 0.8, sz: 1.1, yaw: -Math.PI / 2, tone: 2, label: 14, collide: false });
  k.build(g);
  g.position.set(x, 0.05, z);
  ctx.mesh(g);
  ctx.anim((dt, t) => {
    const c = (Math.sin(t * 0.22) + 1) / 2;
    const e = c * c * (3 - 2 * c);
    g.position.y = 0.05 + e * 3.0;
  });
}

// ---------------------------------------------------------------------------
function containers(kit, ctx, min, max, rand) {
  // forward wall: a container wall behind the conveyor, two and three high with a ragged top line;
  // aft wall: only a low pair by the door (the rest of that side is the handling apron)
  const wall = (x, z, heights, tone0) => {
    heights.forEach((h, i) => {
      for (let j = 0; j < h; j++) {
        cargoPod(kit, ctx, { x: x + i * 1.55, y: j * 1.12, z, sx: 1.4, sy: 1.1, sz: 1.35, yaw: (rand() - 0.5) * 0.05, tone: tone0 + i + j, label: [11, 6, 14, 9, 11][(i + j) % 5] });
      }
    });
    kit.boxMM("hazard", [x - 0.9, 0, z - 0.95], [x + (heights.length - 1) * 1.55 + 0.9, 0.012, z - 0.91], { texel: 1 });
  };
  wall(6.5, min[2] + 1.05, [3, 3, 2, 3, 3, 1, 2, 3], 0);
  wall(6.5, max[2] - 1.05, [1, 1], 2);
  // loose containers waiting at the lift gate
  cargoPod(kit, ctx, { x: 16.5, z: -16.0, sx: 1.6, sy: 1.3, sz: 1.4, yaw: 0.2 - Math.PI / 2, tone: 2, label: 11 });
  cargoPod(kit, ctx, { x: 16.3, z: -22.3, sx: 1.2, sy: 0.9, sz: 1.2, yaw: -0.3 - Math.PI / 2, tone: 3, label: 6 });
  void max;
}

// ---------------------------------------------------------------------------
// Logistics station on the aft wall (zmax): console, inventory screens, racks, manifest board
// ---------------------------------------------------------------------------
function logistics(kit, ctx, min, max) {
  const seg = wallSegment(ctx.bounds, "zmax");
  const u = (x) => seg.from[0] - x;
  impConsole(kit, ctx, { x: 21.5, z: max[2] - 1.6, yaw: Math.PI, w: 2.4, d: 0.85, screens: [1, 1, 2], chair: true, seed: ctx.seed + 3, lampMat: "emitAmber" });
  wallScreen(kit, ctx, { side: "zmax", u: u(20.0), v: 2.3, w: 1.6, h: 0.9, screen: 1 });
  wallScreen(kit, ctx, { side: "zmax", u: u(22.0), v: 2.3, w: 1.6, h: 0.9, screen: 2 });
  wallScreen(kit, ctx, { side: "zmax", u: u(24.0), v: 2.3, w: 1.6, h: 0.9, screen: 1 });
  equipmentRack(kit, ctx, { side: "zmax", u: u(26.4), w: 1.4, h: 2.6, seed: ctx.seed + 5, lit: "emitAmber" });
  // manifest board: a big lit panel with rows of amber/blue entries
  const { frame } = wallFrame(kit, seg.from, seg.to, 0);
  frame.box("paintedMetal", u(22.0), 4.1, 0.06, 5.2, 1.6, 0.12, { color: PALETTE.impBlack, texel: 2 });
  frame.box("darkGloss", u(22.0), 4.1, 0.125, 5.0, 1.45, 0.01);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      const lit = (r * 7 + c * 3) % 5 !== 0;
      frame.box(lit ? ((r + c) % 3 ? "emitAmber" : "emitBlue") : "emitRed", u(22.0) - 2.2 + c * 0.82, 3.55 + r * 0.26, 0.135, 0.6, 0.12, 0.01);
    }
  }
  frame.box("emitWhite", u(22.0), 4.78, 0.135, 4.6, 0.06, 0.01);
  // decals by the door and a hazard stencil on the forward wall
  const decal = (side, uu, v, idx, size = 1.2) => {
    const sg = wallSegment(ctx.bounds, side);
    const { frame: f } = wallFrame(kit, sg.from, sg.to, 0);
    f.add("decal", new THREE.PlaneGeometry(size, size), uu, v, 0.012, { uv: "keep", uvRect: decalRect(idx) });
  };
  decal("xmin", -8 - -19 + 3.0, 2.2, 8, 1.2); // z = -22 (xmin u = max z - z)
  decal("xmin", -8 - -19 - 3.0, 2.2, 5, 1.2); // z = -16
  decal("zmin", 20 - min[0], 3.0, 13, 1.4);
  // pipes and a cable tray along the forward wall over the container stacks
  pipeRun(kit, [[min[0] + 0.3, 4.1, min[2] + 0.5], [max[0] - 0.3, 4.1, min[2] + 0.5]], 0.09, PALETTE.impMid, "metal");
  pipeRun(kit, [[min[0] + 0.3, 4.4, min[2] + 0.5], [max[0] - 0.3, 4.4, min[2] + 0.5]], 0.06, PALETTE.impDark, "metal");
}

// ---------------------------------------------------------------------------
// Ceiling hoist: I-beam rail along x over the lane, trolley with a hook that travels slowly
// ---------------------------------------------------------------------------
function hoist(kit, ctx, min, max) {
  const y = max[1] - 0.6;
  // the rail runs between the lane and the forward conveyor (not down the lane's axis, where the load
  // would swing through the fixed camera's foreground), from mid-room to the lift
  const hz = -22.6;
  const x0 = min[0] + 6;
  kit.boxMM("paintedMetal", [x0, y, hz - 0.2], [LIFT.x - LIFT.half - 1.2, y + 0.4, hz + 0.2], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("metal", [x0, y - 0.08, hz - 0.3], [LIFT.x - LIFT.half - 1.2, y, hz + 0.3], { color: PALETTE.steel });
  for (let x = x0 + 1; x < LIFT.x - LIFT.half - 1.2; x += 4) kit.box("paintedMetal", x, y + 0.5, hz, 0.2, 0.3, 0.2, { color: PALETTE.impMid, texel: 2 });
  const k = new Kit(ctx.materials);
  const g = new THREE.Group();
  k.box("paintedMetal", 0, y - 0.45, 0, 0.9, 0.7, 0.8, { color: PALETTE.impDark, texel: 2 });
  k.box("hazard", 0, y - 0.82, 0, 0.92, 0.06, 0.82, { texel: 1 });
  k.box("emitRed", 0.3, y - 0.45, 0.41, 0.15, 0.1, 0.01);
  // twin chains to a hook block, a proper hook (open torus on a shank) and a container slung from it
  for (const dz of [-0.14, 0.14]) k.cyl("metal", 0, y - 1.3, dz, 0.045, 1.0, "y", { color: PALETTE.steel, segments: 6 });
  k.box("paintedMetal", 0, y - 2.05, 0, 0.5, 0.5, 0.42, { color: PALETTE.impDark, texel: 2 });
  k.box("hazard", 0, y - 2.05, 0, 0.52, 0.16, 0.44, { texel: 1 });
  k.cyl("metal", 0, y - 2.45, 0, 0.05, 0.3, "y", { color: PALETTE.steel, segments: 8 });
  k.add("metal", new THREE.TorusGeometry(0.2, 0.06, 8, 16, Math.PI * 1.55).rotateZ(Math.PI * 0.72), { pos: [0, y - 2.8, 0], color: PALETTE.steel });
  const loadY = y - 3.05; // sling ring hooked under the hook's tip
  k.add("metal", new THREE.TorusGeometry(0.14, 0.03, 6, 12), { pos: [0, loadY, 0], color: PALETTE.steel });
  const podY = loadY - 0.8; // container top under the slings (bottom 1.75 m over the lane)
  for (const [sx, sz] of [
    [-0.6, -0.55],
    [0.6, -0.55],
    [-0.6, 0.55],
    [0.6, 0.55],
  ]) {
    pipeRun(k, [[0, loadY - 0.1, 0], [sx, podY + 0.02, sz]], 0.02, PALETTE.steel, "metal");
  }
  cargoPod(k, ctx, { x: 0, y: podY - 0.8, z: 0, sx: 1.3, sy: 0.8, sz: 1.2, yaw: Math.PI / 2, tone: 3, label: 14, collide: false });
  k.build(g);
  g.position.set(13.5, 0, hz);
  ctx.mesh(g);
  ctx.anim((dt, t) => {
    g.position.x = 13.5 + Math.sin(t * 0.13) * 3.2;
    g.rotation.z = 0.01 * Math.sin(t * 0.8);
  });
}
