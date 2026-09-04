// Deck 5 — Cargo Lift & Logistics. A 25 × 22 × 7 m logistics hall between the access corridor and
// the hangar: a big fenced cargo lift that cycles between the deck and +3 m, two roller conveyors
// feeding it, container stacks, a logistics station with inventory screens, a ceiling hoist on a rail
// and hazard-striped traffic lanes.
//
// Deck-local metres, floor y = 0. Room bounds x 2.9..28, y 0..7, z -30..-8; blast door on xmin at z = -19.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, impConsole, wallScreen, equipmentRack, crate, railing, pipeRun, pillar, wallSegment } from "../imperial.js";
import { pointLight, wallFrame } from "../builders.js";
import { Kit, rng } from "../../kit.js";
import { decalRect } from "../../textures.js";

const LIFT = { x: 22.5, z: -19, half: 3.2 };
const LANES = [-24.5, -13.5]; // conveyor centre lines (z)

export function buildHangarCargo(kit, ctx) {
  const [min, max] = ctx.bounds;
  const rand = rng(ctx.seed + 33);
  roomShell(kit, ctx, {
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
      maxLights: 4, // 2 × 2 grid + the amber lift light = 5 of the 6 allowed
      lightIntensity: 18,
      lightDistance: 22,
      styles: { panel: 0.86, greeble: 0.06, vent: 0.08 },
      paints: [
        [PALETTE.impLight, 0.5],
        [PALETTE.impGrey, 0.35],
        [PALETTE.impMid, 0.15],
      ],
    },
  });
  for (const z of [-27.5, -10.5]) {
    pillar(kit, 11, z, 0, max[1], 0.6, PALETTE.impMid);
    pillar(kit, 18, z, 0, max[1], 0.6, PALETTE.impMid);
  }
  hazardLanes(kit, min, max);
  for (const z of LANES) conveyor(kit, ctx, 6.5, LIFT.x - LIFT.half - 1.6, z, rand);
  cargoLift(kit, ctx);
  containers(kit, ctx, min, max, rand);
  logistics(kit, ctx, min, max);
  hoist(kit, ctx, min, max);
  ctx.light(pointLight(0xffb060, 12, 16, [LIFT.x, 5.6, LIFT.z]));
}

// ---------------------------------------------------------------------------
function hazardLanes(kit, min, max) {
  // a black lane from the door to the lift with amber edge lights; hazard bands at the conveyor ends
  const z0 = -20.8;
  const z1 = -17.2;
  kit.boxMM("paintedMetal", [min[0] + 0.4, 0, z0], [LIFT.x - LIFT.half - 1.0, 0.012, z1], { color: PALETTE.impBlack, texel: 2 });
  for (const z of [z0, z1]) {
    kit.boxMM("hazard", [min[0] + 0.4, 0, z - 0.2], [LIFT.x - LIFT.half - 1.0, 0.014, z + 0.2], { texel: 2 });
    for (let x = min[0] + 1.5; x < LIFT.x - LIFT.half - 1.6; x += 2.2) kit.boxMM("emitAmber", [x, 0.014, z - 0.06], [x + 1.0, 0.026, z + 0.06], {});
  }
  void max;
}

// ---------------------------------------------------------------------------
// Roller conveyor along x: two side rails on legs, rollers, a drive box, crates riding on it
// ---------------------------------------------------------------------------
function conveyor(kit, ctx, x0, x1, z, rand) {
  const y = 0.85;
  const w = 1.3;
  for (const s of [-1, 1]) kit.boxMM("paintedMetal", [x0, y - 0.12, z + s * (w / 2) - 0.06], [x1, y + 0.08, z + s * (w / 2) + 0.06], { color: PALETTE.impDark, texel: 2 });
  for (let x = x0 + 0.4; x < x1; x += 2.2) {
    for (const s of [-1, 1]) kit.box("paintedMetal", x, (y - 0.12) / 2, z + s * (w / 2), 0.1, y - 0.12, 0.1, { color: PALETTE.impDark, texel: 2 });
    kit.box("paintedMetal", x, 0.04, z, 0.3, 0.08, w + 0.3, { color: PALETTE.impBlack, texel: 2 });
  }
  for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.36) kit.cyl("metal", x, y - 0.02, z, 0.06, w - 0.16, "z", { color: PALETTE.steel, segments: 8 });
  // drive housing at the lift end, control post at the door end
  kit.box("paintedMetal", x1 - 0.5, y - 0.35, z, 1.0, 0.5, w + 0.2, { color: PALETTE.impDark, texel: 2 });
  kit.box("emitGreen", x1 - 0.5, y - 0.35, z + w / 2 + 0.11, 0.3, 0.08, 0.01);
  kit.box("paintedMetal", x0 - 0.2, 0.6, z + w / 2 + 0.5, 0.3, 1.2, 0.3, { color: PALETTE.impDark, texel: 2 });
  kit.box("impScreen1", x0 - 0.2, 1.22, z + w / 2 + 0.5, 0.26, 0.02, 0.26, { uv: "keep" });
  kit.box("emitAmber", x0 - 0.05, 1.0, z + w / 2 + 0.5, 0.01, 0.06, 0.16);
  kit.collider([x0 - 0.1, 0, z - w / 2 - 0.15], [x1, y + 0.1, z + w / 2 + 0.15], "conveyor");
  kit.collider([x0 - 0.35, 0, z + w / 2 + 0.35], [x0 - 0.05, 1.25, z + w / 2 + 0.65], "post");
  // crates riding the rollers
  let x = x0 + 1.0 + rand() * 1.5;
  while (x < x1 - 1.8) {
    const sx = 0.8 + rand() * 0.7;
    crate(kit, ctx, { x: x + sx / 2, y: y + 0.04, z, sx, sy: 0.6 + rand() * 0.6, sz: 0.9 + rand() * 0.3, yaw: 0, seed: ctx.seed + Math.floor(x * 7) });
    x += sx + 1.2 + rand() * 3.5;
  }
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
  kit.boxMM("hazard", [x - half - 0.56, H - 0.45, z - half - 0.56], [x + half + 0.56, H - 0.15, z - half - 0.54], { texel: 2 });
  kit.boxMM("emitAmber", [x - half, H - 0.52, z - 0.15], [x + half, H - 0.5, z + 0.15], {});
  kit.boxMM("emitAmber", [x - 0.15, H - 0.52, z - half], [x + 0.15, H - 0.5, z + half], {});
  // recessed pit (dark) under the platform and the hazard curb around it
  kit.boxMM("paintedMetal", [x - half - 0.1, -0.5, z - half - 0.1], [x + half + 0.1, -0.02, z + half + 0.1], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("hazard", [x - half - 0.7, 0, z - half - 0.7], [x + half + 0.7, 0.04, z + half + 0.7], { texel: 2 });
  kit.boxMM("paintedMetal", [x - half - 0.2, 0, z - half - 0.2], [x + half + 0.2, 0.05, z + half + 0.2], { color: PALETTE.impBlack, texel: 2 });
  // railings around the pit; the door-side (−x) run is split by a lit gate that stays shut
  const f = half + 0.75;
  railing(kit, x - f, z - f, x + f, z - f, 0.04);
  railing(kit, x - f, z + f, x + f, z + f, 0.04);
  railing(kit, x + f, z - f, x + f, z + f, 0.04);
  railing(kit, x - f, z - f, x - f, z - 1.2, 0.04);
  railing(kit, x - f, z + 1.2, x - f, z + f, 0.04);
  kit.box("paintedMetal", x - f, 0.6, z, 0.08, 1.1, 2.4, { color: PALETTE.impDark, texel: 2 });
  kit.box("hazard", x - f - 0.045, 0.6, z, 0.01, 0.5, 2.2, { texel: 3 });
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
  k.box("hazard", 0, 0.005, 0, half * 2, 0.01, half * 2, { texel: 1.5 });
  k.box("paintedMetal", 0, -0.42, 0, half * 2 - 0.4, 0.3, half * 2 - 0.4, { color: PALETTE.impBlack, texel: 2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box("metal", sx * (half + 0.02), -0.1, sz * (half + 0.02), 0.3, 0.5, 0.3, { color: PALETTE.gunmetal });
  k.box("emitWhite", 0, -0.29, half + 0.01, half * 2 - 0.6, 0.04, 0.01);
  k.box("emitWhite", 0, -0.29, -half - 0.01, half * 2 - 0.6, 0.04, 0.01);
  // pallet of containers riding the lift
  k.box("paintedMetal", 0, 0.08, 0, 2.8, 0.16, 2.2, { color: PALETTE.impDark, texel: 2 });
  crateOn(k, -0.7, 0.16, -0.4, 1.3, 1.1, 1.3, PALETTE.impMid);
  crateOn(k, 0.7, 0.16, -0.4, 1.2, 0.9, 1.3, PALETTE.impGrey);
  crateOn(k, 0.0, 0.16, 0.7, 1.4, 0.8, 0.8, PALETTE.impDark);
  crateOn(k, -0.65, 1.26, -0.4, 1.1, 0.8, 1.1, PALETTE.impGrey);
  k.build(g);
  g.position.set(x, 0.05, z);
  ctx.mesh(g);
  ctx.anim((dt, t) => {
    const c = (Math.sin(t * 0.22) + 1) / 2;
    const e = c * c * (3 - 2 * c);
    g.position.y = 0.05 + e * 3.0;
  });
}

function crateOn(k, x, y, z, sx, sy, sz, col) {
  k.box("impPanel1", x, y + sy / 2, z, sx, sy, sz, { color: col, uv: "keep" });
  k.box("paintedMetal", x, y + sy * 0.06, z, sx + 0.03, sy * 0.12, sz + 0.03, { color: PALETTE.impBlack, texel: 2 });
  k.box("paintedMetal", x, y + sy * 0.95, z, sx + 0.03, sy * 0.1, sz + 0.03, { color: PALETTE.impBlack, texel: 2 });
  k.box("emitBlue", x + sx * 0.25, y + sy * 0.5, z + sz / 2 + 0.006, 0.12, 0.03, 0.01);
}

// ---------------------------------------------------------------------------
function containers(kit, ctx, min, max, rand) {
  // stacks along the forward and aft walls, a tall stack by the lift, numbered bay marks on the floor
  const stack = (x, z, cols, rows, seed) => {
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (j > 0 && rand() < 0.3) continue;
        crate(kit, ctx, { x: x + i * 1.5, y: j * 1.15, z, sx: 1.35, sy: 1.1, sz: 1.35, yaw: (rand() - 0.5) * 0.06, seed: seed + i * 3 + j });
      }
    }
    kit.boxMM("hazard", [x - 0.9, 0, z - 0.9], [x + (cols - 1) * 1.5 + 0.9, 0.012, z - 0.86], { texel: 2 });
  };
  stack(6.5, min[2] + 1.0, 5, 2, ctx.seed + 11);
  stack(15.5, min[2] + 1.0, 3, 3, ctx.seed + 21);
  stack(6.5, max[2] - 1.0, 4, 2, ctx.seed + 31);
  stack(14.0, max[2] - 1.0, 2, 2, ctx.seed + 41);
  // loose containers waiting at the lift gate and a stack of empty pallets
  crate(kit, ctx, { x: 16.5, z: -16.0, sx: 1.6, sy: 1.3, sz: 1.4, yaw: 0.2, seed: ctx.seed + 51 });
  crate(kit, ctx, { x: 16.3, z: -22.3, sx: 1.2, sy: 0.9, sz: 1.2, yaw: -0.3, seed: ctx.seed + 52 });
  for (let i = 0; i < 4; i++) kit.box("paintedMetal", 25.5, 0.08 + i * 0.18, -10.5, 2.4, 0.14, 1.8, { color: i % 2 ? PALETTE.impDark : PALETTE.impMid, texel: 2 });
  kit.collider([24.3, 0, -11.4], [26.7, 0.8, -9.6], "pallets");
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
  pipeRun(kit, [[min[0] + 0.3, 3.2, min[2] + 0.5], [max[0] - 0.3, 3.2, min[2] + 0.5]], 0.09, PALETTE.impMid, "metal");
  pipeRun(kit, [[min[0] + 0.3, 3.5, min[2] + 0.5], [max[0] - 0.3, 3.5, min[2] + 0.5]], 0.06, PALETTE.impDark, "metal");
}

// ---------------------------------------------------------------------------
// Ceiling hoist: I-beam rail along x over the lane, trolley with a hook that travels slowly
// ---------------------------------------------------------------------------
function hoist(kit, ctx, min, max) {
  const y = max[1] - 0.6;
  kit.boxMM("paintedMetal", [min[0] + 2, y, LIFT.z - 0.2], [LIFT.x - LIFT.half - 1.2, y + 0.4, LIFT.z + 0.2], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("metal", [min[0] + 2, y - 0.08, LIFT.z - 0.3], [LIFT.x - LIFT.half - 1.2, y, LIFT.z + 0.3], { color: PALETTE.steel });
  for (let x = min[0] + 3; x < LIFT.x - LIFT.half - 1.2; x += 4) kit.box("paintedMetal", x, y + 0.5, LIFT.z, 0.2, 0.3, 0.2, { color: PALETTE.impMid, texel: 2 });
  const k = new Kit(ctx.materials);
  const g = new THREE.Group();
  k.box("paintedMetal", 0, y - 0.45, 0, 0.9, 0.7, 0.8, { color: PALETTE.impDark, texel: 2 });
  k.box("hazard", 0, y - 0.82, 0, 0.92, 0.06, 0.82, { texel: 3 });
  k.box("emitRed", 0.3, y - 0.45, 0.41, 0.15, 0.1, 0.01);
  k.cyl("metal", 0, y - 2.0, 0, 0.025, 2.4, "y", { color: PALETTE.steel, segments: 6 });
  k.box("paintedMetal", 0, y - 3.3, 0, 0.4, 0.3, 0.3, { color: PALETTE.impDark, texel: 2 });
  k.add("metal", new THREE.TorusGeometry(0.18, 0.04, 6, 12), { pos: [0, y - 3.62, 0], color: PALETTE.steel });
  k.build(g);
  g.position.set(12, 0, LIFT.z);
  ctx.mesh(g);
  ctx.anim((dt, t) => {
    g.position.x = 12 + Math.sin(t * 0.13) * 5;
  });
}
