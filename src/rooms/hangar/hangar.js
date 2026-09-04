// Main Hangar Bay — the fighter deck: an 80 × 160 m hall around the launch well (x -22..22, z -70..50) that
// drops 28 m to the containment field at the belly. Deck zones: forward personnel strip (turbolift lobby door,
// ready lockers), port service strip (TIE cradles, refuelling stations, maintenance scaffolds, gantry crane),
// starboard strip (stair tower to the flight-control gallery, cargo hoist, ops banks), aft logistics strip
// (container blocks, recovery lane to the shuttle-bay blast door). Catwalks at y -32 along both long walls,
// heavy ceiling beams with light channels, and the TIE racks + parked fighters (placed by src/fighters).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Kit } from "../../core/kit.js";
import { IMP } from "../../core/palette.js";
import { SYSTEMS } from "../../core/systems.js";
import { Placer } from "../../core/props.js";
import { DECAL, decalRect, screenRect, ledRect } from "../../textures.js";
import { CRADLES, CRADLE_Y } from "../../fighters/index.js";

export const meta = { id: "hangar", stream: "hangar" };

const Y = -40; // deck
const CAT_Y = -32; // service catwalks
const GAL_Y = -22; // flight-control gallery (booth floor level)
const DECK_TINT = new THREE.Color("#6f757d");
const PAINT_WHITE = new THREE.Color("#c9ced6");
const PAINT_RED = new THREE.Color("#b2382c");
const PAINT_AMBER = IMP.hazardYellow;
const HOIST = { x0: 26.6, x1: 31.0, z0: -12.2, z1: -7.8 };
// fixture positions (lights hang ~0.5 m under the pendant lenses)
const SPOT_XZ = [0, -10];
const SPOT_Y = -14.3;
const PENDANT_Y = -20.6;
const PENDANT_COOL_Y = -17.1;
const PENDANTS_AMBER = [[-27, -50], [27, -50], [-27, 30], [27, 30]];
const PENDANTS_COOL = [[0, -82], [0, 62]];
const GALLERY_LAMP = [26, -14.6, -18];
// heavy wall ribs at the transverse-beam pitch, skipping the arches / the flight-control opening
const RIBS = { xmin: [-82, -66, -18, -2, 30, 46, 62], xmax: [-82, -66, 14, 30, 62] };

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();
const Z_AXIS = new THREE.Vector3(0, 0, 1);

// ---- small helpers -------------------------------------------------------------------------------------
/** Box beam between two world points with a w × h cross-section. */
function bar(kit, mat, a, b, w, h, opts = {}) {
  _a.set(a[0], a[1], a[2]);
  _b.set(b[0], b[1], b[2]);
  _d.subVectors(_b, _a);
  const L = _d.length();
  _q.setFromUnitVectors(Z_AXIS, _d.normalize());
  _a.lerp(_b, 0.5);
  return kit.add(mat, new THREE.BoxGeometry(w, h, L), { pos: [_a.x, _a.y, _a.z], quat: _q, ...opts });
}

/** Painted deck marking (thin box just above the deck plates). */
function paint(kit, x0, z0, x1, z1, color, { mat = "paintedMetal", y = Y } = {}) {
  kit.boxMM(mat, [Math.min(x0, x1), y + 0.006, Math.min(z0, z1)], [Math.max(x0, x1), y + 0.018, Math.max(z0, z1)], { color, texel: 1 });
}

/** Dashed painted line from (ax, az) to (bx, bz). */
function dashed(kit, ax, az, bx, bz, w, dash, gap, color, y = Y) {
  const L = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / L;
  const uz = (bz - az) / L;
  for (let s = 0; s + dash <= L + 1e-3; s += dash + gap) {
    const cx = ax + ux * (s + dash / 2);
    const cz = az + uz * (s + dash / 2);
    if (Math.abs(ux) > 0.5) paint(kit, cx - dash / 2, cz - w / 2, cx + dash / 2, cz + w / 2, color, { y });
    else paint(kit, cx - w / 2, cz - dash / 2, cx + w / 2, cz + dash / 2, color, { y });
  }
}

/** Decal lying on the deck; (dirX, dirZ) is the direction the decal's "up" points to. */
function decalFlat(kit, x, z, w, h, idx, dirX = 0, dirZ = -1, y = Y) {
  const theta = Math.atan2(-dirX, -dirZ);
  kit.add("decal", new THREE.PlaneGeometry(w, h), { pos: [x, y + 0.02, z], rot: [-Math.PI / 2, 0, theta], uv: "keep", uvRect: decalRect(idx) });
}

/** Walkable slab (catwalk / landing / gallery): plate + grate + collider. */
function slab(kit, x0, z0, x1, z1, y, tag, { thick = 0.3, color = IMP.trim, grate = true } = {}) {
  kit.boxMM("paintedMetal", [x0, y - thick, z0], [x1, y, z1], { color, texel: 1 });
  if (grate) {
    const g = new THREE.PlaneGeometry(x1 - x0 - 0.16, z1 - z0 - 0.16);
    g.rotateX(-Math.PI / 2);
    kit.add("grate", g, { pos: [(x0 + x1) / 2, y + 0.012, (z0 + z1) / 2], uv: "scale", uvScale: [(x1 - x0) / 1.24, (z1 - z0) / 0.9], color: 0xffffff });
  }
  kit.collider([x0, y - 0.6, z0], [x1, y, z1], tag);
}

/**
 * Guard railing with a painted (dielectric) top rail: the polished-steel tube of props.railing turns into a
 * blown-out specular streak under the hangar's strong overhead lights. Same contract as props.railing.
 */
function railing(kit, { from, to, y, h = 1.05, color = IMP.gunmetal, kick = true, collide = true }) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  const P = new Placer(kit, [from[0], y, from[1]], Math.atan2(-dz, dx));
  P.cyl("paintedMetal", L / 2, h, 0, 0.035, L, "x", { color: IMP.steelDark, segments: 8 });
  P.box("paintedMetal", L / 2, h * 0.55, 0, L, 0.06, 0.03, { color, texel: 1 });
  if (kick) P.box("paintedMetal", L / 2, 0.08, 0, L, 0.16, 0.03, { color: IMP.black, texel: 1 });
  const n = Math.max(2, Math.round(L / 2.2) + 1);
  for (let i = 0; i < n; i++) {
    const x = Math.min(Math.max((i / (n - 1)) * L, 0.04), L - 0.04);
    P.box("paintedMetal", x, h / 2, 0, 0.07, h, 0.07, { color, texel: 1 });
  }
  if (collide) P.collider([0, 0, -0.08], [L, h + 0.05, 0.08], "railing");
  return P;
}

/** Recessed amber deck light (runway-edge style). */
function edgeLight(kit, x, z) {
  kit.box("paintedMetal", x, Y + 0.02, z, 0.5, 0.03, 0.5, { color: IMP.black });
  kit.box("emitAmber", x, Y + 0.04, z, 0.34, 0.012, 0.34);
}

// ---- build ---------------------------------------------------------------------------------------------
export function build(ctx) {
  const { kit } = ctx;
  // big plates at hangar scale (the panel grid is the dominant build cost: ~1500 panels for the shell)
  const longRows = [0, 0.5, 2.2, 8.9, 9.3, 15.2, 20.9, 21.3, 27.0, 32];
  ctx.shell({
    skipFloor: true,
    pilasterEvery: 16,
    seed: 11,
    walls: {
      xmin: { panelW: 4, rows: longRows, detail: 0, pilasterEvery: 0 },
      xmax: { panelW: 4, rows: longRows, detail: 0, pilasterEvery: 0 },
      zmin: { panelW: 4, detail: 0 },
      zmax: { panelW: 4, detail: 0 },
    },
    ceiling: { panelW: 5, stripSpacing: 11, stripW: 0.5 },
  });
  // deckGrey × plateDark is ~0.7 % diffuse albedo (reads black under any light); the fighter deck gets a
  // lighter worn-plate tint so the pools of work light and the painted lane markings have a base to sit on
  ctx.floorWithWell("deckGrey", DECK_TINT, { railing: false });
  setupProtos(kit);

  deckMarkings(ctx);
  wellRailings(ctx);
  ceilingStructure(ctx);
  wallRibs(ctx);
  wallDressing(ctx);
  portStrip(ctx);
  starboardStrip(ctx);
  catwalks(ctx);
  forwardStrip(ctx);
  aftStrip(ctx);
  crane(ctx);
  cargoHoist(ctx);
  beacons(ctx);
  lightTowers(ctx);
  lights(ctx);

  if (SYSTEMS.fighters && SYSTEMS.fighters.attachHangar) SYSTEMS.fighters.attachHangar(ctx);
}

// ---- instanced protos (many small repeated props) --------------------------------------------------------
function setupProtos(kit) {
  kit.proto("crate", "plate", new THREE.BoxGeometry(1.2, 1.0, 1.2), { texel: 1 });
  const frame = mergeGeometries([
    new THREE.BoxGeometry(1.24, 0.16, 1.24).translate(0, -0.42, 0),
    new THREE.BoxGeometry(1.24, 0.16, 1.24).translate(0, 0.42, 0),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => new THREE.BoxGeometry(0.08, 0.86, 0.08).translate(sx * 0.6, 0, sz * 0.6))),
  ]);
  kit.proto("crateFrame", "paintedMetal", frame, { texel: 1 });
  kit.proto("barrel", "plate", new THREE.CylinderGeometry(0.36, 0.36, 0.9, 14), { uv: "keep" });
  const bands = mergeGeometries([new THREE.CylinderGeometry(0.375, 0.375, 0.08, 14), new THREE.CylinderGeometry(0.38, 0.38, 0.08, 14).translate(0, -0.41, 0), new THREE.CylinderGeometry(0.38, 0.38, 0.08, 14).translate(0, 0.41, 0)]);
  kit.proto("barrelBand", "paintedMetal", bands, { uv: "keep" });
}

const CRATE_COLORS = [IMP.plateDark, IMP.plateBlue, IMP.plate, IMP.plateWarm];
function crateAt(kit, x, z, yaw, color, tier = 0, collide = true) {
  const y = Y + 0.5 + tier * 1.0;
  kit.place("crate", { pos: [x, y, z], rot: [0, yaw, 0], color });
  kit.place("crateFrame", { pos: [x, y, z], rot: [0, yaw, 0], color: IMP.black });
  if (collide && tier === 0) kit.collider([x - 0.66, Y, z - 0.66], [x + 0.66, Y + 1.0, z + 0.66], "crate");
}
function barrelAt(kit, x, z, color = IMP.plateDark, band = IMP.hazardYellow) {
  kit.place("barrel", { pos: [x, Y + 0.45, z], color });
  kit.place("barrelBand", { pos: [x, Y + 0.45, z], color: band });
  kit.collider([x - 0.38, Y, z - 0.38], [x + 0.38, Y + 0.9, z + 0.38], "barrel");
}
/** A tight cluster of crates (2 tiers) with a few barrels — a logistics stack. */
function crateStack(kit, rand, x, z, cols, rows, { tiers = 2, yaw = 0 } = {}) {
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const cx = x + (i - (cols - 1) / 2) * 1.32;
      const cz = z + (j - (rows - 1) / 2) * 1.32;
      const c = CRATE_COLORS[Math.floor(rand() * CRATE_COLORS.length)];
      crateAt(kit, cx, cz, yaw + (rand() - 0.5) * 0.08, c, 0);
      if (tiers > 1 && rand() < 0.65) crateAt(kit, cx, cz, yaw + (rand() - 0.5) * 0.12, CRATE_COLORS[Math.floor(rand() * CRATE_COLORS.length)], 1, false);
    }
  }
}

// ---- deck markings -------------------------------------------------------------------------------------
function deckMarkings(ctx) {
  const { kit } = ctx;
  const w = ctx.def.well;
  // amber keep-out line 4 m off the well mouth with recessed edge lights outside it
  const o = 4;
  const [ax, bx, az, bz] = [w.x0 - o, w.x1 + o, w.z0 - o, w.z1 + o];
  const lw = 0.28;
  paint(kit, ax, az, bx, az + lw, PAINT_AMBER);
  paint(kit, ax, bz - lw, bx, bz, PAINT_AMBER);
  paint(kit, ax, az, ax + lw, bz, PAINT_AMBER);
  paint(kit, bx - lw, az, bx, bz, PAINT_AMBER);
  for (let x = ax + 3; x < bx - 1; x += 6) for (const z of [az - 0.7, bz + 0.7]) edgeLight(kit, x, z);
  for (let z = az + 3; z < bz - 1; z += 6) for (const x of [ax - 0.7, bx + 0.7]) edgeLight(kit, x, z);
  // bay codes at the corners of the keep-out zone
  for (const [x, z] of [[ax - 3.2, az - 3.2], [bx + 3.2, az - 3.2], [ax - 3.2, bz + 3.2], [bx + 3.2, bz + 3.2]]) decalFlat(kit, x, z, 3.2, 3.2, DECAL.BAY_CODE, 0, z < 0 ? 1 : -1);
  // fine hazard chevrons at the well corners (inside the hazard rim)
  for (const [x, z] of [[w.x0 - 0.6, w.z0 - 0.6], [w.x1 + 0.6, w.z0 - 0.6], [w.x0 - 0.6, w.z1 + 0.6], [w.x1 + 0.6, w.z1 + 0.6]]) kit.box("hazardRed", x, Y + 0.014, z, 1.2, 0.006, 1.2, { texel: 2 });

  // recovery lane: well aft rim -> shuttle-bay blast door (x -10..10 at z 70)
  for (const s of [-1, 1]) paint(kit, s * 4.7 - 0.1, w.z1 + 1.8, s * 4.7 + 0.1, 66.6, PAINT_WHITE);
  dashed(kit, 0, w.z1 + 2.2, 0, 66, 0.16, 1.6, 1.2, PAINT_WHITE);
  decalFlat(kit, 0, 58, 3.4, 3.4, DECAL.ARROW, 0, -1);
  decalFlat(kit, 0, 63.5, 3.4, 3.4, DECAL.ARROW, 0, -1);
  paint(kit, -8.5, 66.8, 8.5, 67.3, PAINT_RED);
  for (let x = -8; x <= 8; x += 4) kit.box("hazard", x, Y + 0.014, 68.2, 2.6, 0.006, 0.8, { texel: 3 });

  // forward walkway: lobby door (x -3..3 at z -90) to the cross aisle along z -76
  for (const s of [-1, 1]) paint(kit, s * 3.4 - 0.08, -89.6, s * 3.4 + 0.08, -76, PAINT_WHITE);
  paint(kit, -30, -76.08, 30, -75.92, PAINT_WHITE);
  paint(kit, -30, -80.08, -3.4, -79.92, PAINT_WHITE);
  paint(kit, 3.4, -80.08, 30, -79.92, PAINT_WHITE);
  decalFlat(kit, 0, -84, 5.5, 5.5, DECAL.EMBLEM, 0, 1);
  decalFlat(kit, -14, -78, 2.2, 2.2, DECAL.ARROW, -1, 0);
  decalFlat(kit, 14, -78, 2.2, 2.2, DECAL.ARROW, 1, 0);

  // drainage grates along both long walls
  for (const s of [-1, 1]) {
    const g = new THREE.PlaneGeometry(1.2, 154);
    g.rotateX(-Math.PI / 2);
    kit.add("grate", g, { pos: [s * 36.2, Y + 0.012, -10], uv: "scale", uvScale: [1, 154 / 0.9], color: 0xffffff });
  }
  // darker service plates under the cradle strip and the aft storage blocks
  kit.boxMM("deckBlack", [-39.7, Y + 0.003, -70], [-26.5, Y + 0.005, 50], { texel: 0.5 });
  for (const s of [-1, 1]) kit.boxMM("deckBlack", [s > 0 ? 12 : -38, Y + 0.003, 55], [s > 0 ? 38 : -12, Y + 0.005, 68.5], { texel: 0.5 });
}

// ---- well railings + lane hardware ----------------------------------------------------------------------
function wellRailings(ctx) {
  const { kit } = ctx;
  const w = ctx.def.well;
  const r = 1.6;
  const xL = w.x0 - r;
  const xR = w.x1 + r;
  const zF = w.z0 - r;
  const zA = w.z1 + r;
  const rail = (from, to) => railing(kit, { from, to, y: Y, color: IMP.gunmetal });
  rail([xL, zF], [xR, zF]);
  rail([xR, zF], [xR, zA]);
  rail([xR, zA], [4.8, zA]);
  rail([-4.8, zA], [xL, zA]);
  // port edge: gaps at the cradle lanes
  const lanes = CRADLES.map((c) => c.z).sort((a, b) => a - b);
  let z = zA;
  for (let i = lanes.length - 1; i >= 0; i--) {
    const g1 = lanes[i] + 3.6;
    const g0 = lanes[i] - 3.6;
    if (z > g1 + 0.2) rail([xL, z], [xL, g1]);
    z = g0;
  }
  if (z > zF + 0.2) rail([xL, z], [xL, zF]);
  // cantilever handling rails over the well at every lane
  for (const zc of lanes) laneRails(kit, [w.x0, Y, zc], -Math.PI / 2);
  laneRails(kit, [0, Y, w.z1], 0);
}

/** Handling rails reaching over the well at a lane (pos = deck edge point; local -Z points over the well). */
function laneRails(kit, pos, yaw) {
  const P = new Placer(kit, pos, yaw);
  for (const s of [-1, 1]) {
    P.box("paintedMetal", s * 2.6, -0.32, -1.2, 0.5, 0.5, 6.4, { color: IMP.gunmetal, texel: 1 });
    P.box("metal", s * 2.6, -0.04, -1.2, 0.72, 0.08, 6.4, { color: IMP.steelDark });
    P.box("hazardRed", s * 2.6, -0.3, -4.55, 0.56, 0.56, 0.36, { texel: 2 });
    for (let k = 0; k < 4; k++) P.cyl("metal", s * 2.6, 0.06, -0.8 - k * 1.1, 0.12, 0.62, "x", { color: IMP.steel, segments: 10 });
  }
  P.box("paintedMetal", 0, -0.6, -3.4, 5.9, 0.36, 0.36, { color: IMP.black, texel: 1 });
  P.box("paintedMetal", 0, -0.6, -1.4, 5.9, 0.36, 0.36, { color: IMP.black, texel: 1 });
  // wheel stop on the deck with an amber marker strip (steppable)
  P.box("hazard", 0, 0.1, 1.0, 5.2, 0.2, 0.28, { texel: 2 });
  P.box("emitAmber", 0, 0.205, 1.0, 4.8, 0.012, 0.08);
  P.collider([-2.6, 0, 0.86], [2.6, 0.2, 1.14], "stop");
}

// ---- ceiling structure -------------------------------------------------------------------------------------
function ceilingStructure(ctx) {
  const { kit, props } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner;
  const cy = ctx.ceil;
  // longitudinal girders over both deck strips
  for (const x of [-31, 31]) {
    kit.boxMM("paintedMetal", [x - 0.6, cy - 1.8, z0], [x + 0.6, cy, z1], { color: IMP.plateDark, texel: 0.5 });
    kit.boxMM("paintedMetal", [x - 0.95, cy - 2.0, z0], [x + 0.95, cy - 1.8, z1], { color: IMP.trim, texel: 0.5 });
    props.pipeRun(kit, { points: [[x + 1.4, cy - 1.0, z0], [x + 1.4, cy - 1.0, z1]], r: 0.16, color: IMP.steelDark, clamps: 12 });
    props.pipeRun(kit, { points: [[x - 1.4, cy - 0.7, z0], [x - 1.4, cy - 0.7, z1]], r: 0.1, color: IMP.gunmetal, clamps: 12 });
  }
  // transverse beams every 16 m with wall haunches and floodlight banks over the deck strips
  for (let z = -82; z < z1 - 1; z += 16) {
    kit.boxMM("paintedMetal", [x0, cy - 2.2, z - 0.7], [x1, cy, z + 0.7], { color: IMP.plateDark, texel: 0.5 });
    kit.boxMM("paintedMetal", [x0, cy - 2.45, z - 1.0], [x1, cy - 2.2, z + 1.0], { color: IMP.trim, texel: 0.5 });
    kit.boxMM("metal", [x0, cy - 1.25, z - 0.74], [x1, cy - 1.05, z + 0.74], { color: IMP.steelDark, texel: 0.5 });
    for (const s of [-1, 1]) {
      const xw = s < 0 ? x0 : x1;
      kit.boxMM("paintedMetal", [Math.min(xw, xw - s * 2.6), cy - 4.2, z - 1.1], [Math.max(xw, xw - s * 2.6), cy - 2.45, z + 1.1], { color: IMP.plateDark, texel: 1 });
      bar(kit, "paintedMetal", [xw, cy - 8.5, z], [xw - s * 5.0, cy - 2.6, z], 0.6, 0.6, { color: IMP.gunmetal, texel: 1 });
    }
    for (const x of [-31, 31]) {
      kit.boxMM("paintedMetal", [x - 1.8, cy - 3.1, z - 0.7], [x + 1.8, cy - 2.45, z + 0.7], { color: IMP.black, texel: 1 });
      kit.boxMM("emitWhiteSoft", [x - 1.6, cy - 3.12, z - 0.5], [x + 1.6, cy - 3.1, z + 0.5], { uv: "keep" });
      kit.box("emitAmber", x, cy - 2.8, z + 0.72, 0.5, 0.1, 0.02);
    }
  }
  // the shadow floodlight over the well hangs on a mast between the two rack rows (below rack level so the
  // whole shaft is in its cone); the spot itself sits just under the lens
  const [sx, sz] = SPOT_XZ;
  kit.boxMM("paintedMetal", [sx - 0.8, cy - 0.5, sz - 0.8], [sx + 0.8, cy, sz + 0.8], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [sx - 0.25, SPOT_Y + 1.7, sz - 0.25], [sx + 0.25, cy, sz + 0.25], { color: IMP.gunmetal, texel: 1 });
  kit.cyl("paintedMetal", sx, SPOT_Y + 1.0, sz, 1.7, 1.4, "y", { color: IMP.black, segments: 20, texel: 1 });
  kit.cyl("paintedMetal", sx, SPOT_Y + 0.35, sz, 1.85, 0.16, "y", { color: IMP.trim, segments: 20 });
  kit.cyl("emitWhite", sx, SPOT_Y + 0.26, sz, 1.45, 0.06, "y", { segments: 20 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    kit.box("paintedMetal", sx + Math.cos(a) * 2.05, SPOT_Y + 1.25, sz + Math.sin(a) * 2.05, 0.4, 0.9, 0.4, { color: IMP.black, rot: [0, -a, 0] });
    kit.box("emitRed", sx + Math.cos(a) * 2.05, SPOT_Y + 1.78, sz + Math.sin(a) * 2.05, 0.14, 0.1, 0.14);
  }
  // work-light pendants hung from the transverse beams (the point lights sit under the lenses)
  for (const [x, z] of PENDANTS_AMBER) pendant(kit, x, PENDANT_Y, z, { lamp: "emitAmber" });
  for (const [x, z] of PENDANTS_COOL) pendant(kit, x, PENDANT_COOL_Y, z, { lamp: "emitWhiteSoft" });
  pendant(kit, GALLERY_LAMP[0], GALLERY_LAMP[1], GALLERY_LAMP[2], { lamp: "emitWhiteSoft", w: 1.6, d: 1.0 });
}

/** Industrial pendant: mast from the beam above, black housing with a lens underneath and a wire cage. */
function pendant(kit, x, y, z, { lamp = "emitAmber", w = 2.8, d = 1.6 } = {}) {
  const top = -8 - 2.45; // underside of the transverse beams
  kit.boxMM("paintedMetal", [x - 0.16, y + 1.0, z - 0.16], [x + 0.16, top, z + 0.16], { color: IMP.gunmetal, texel: 1 });
  kit.boxMM("paintedMetal", [x - 0.5, top - 0.4, z - 0.5], [x + 0.5, top, z + 0.5], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [x - w / 2, y, z - d / 2], [x + w / 2, y + 1.0, z + d / 2], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [x - w / 2 - 0.1, y + 0.88, z - d / 2 - 0.1], [x + w / 2 + 0.1, y + 1.0, z + d / 2 + 0.1], { color: IMP.trim, texel: 1 });
  kit.boxMM(lamp, [x - w / 2 + 0.15, y - 0.02, z - d / 2 + 0.15], [x + w / 2 - 0.15, y, z + d / 2 - 0.15], { uv: "keep" });
  for (const s of [-1, 1]) kit.box("hazard", x, y + 0.45, z + s * (d / 2 + 0.01), w - 0.4, 0.14, 0.02, { texel: 3 });
  for (const k of [-1, 0, 1]) kit.boxMM("metal", [x - w / 2, y - 0.3, z + (k * d) / 3 - 0.03], [x + w / 2, y - 0.24, z + (k * d) / 3 + 0.03], { color: IMP.steelDark });
  for (const s of [-1, 1]) kit.boxMM("metal", [x + (s * w) / 2 - 0.04, y - 0.3, z - d / 2], [x + (s * w) / 2 + 0.04, y, z + d / 2], { color: IMP.steelDark });
  kit.box("emitRed", x, y + 1.14, z, 0.16, 0.18, 0.16);
}

// ---- heavy wall ribs on the long walls (in place of the panel-grid pilasters) ----------------------------
function wallRibs(ctx) {
  const { kit } = ctx;
  const { x0, x1 } = ctx.inner;
  const cy = ctx.ceil;
  for (const [side, zs] of [[-1, RIBS.xmin], [1, RIBS.xmax]]) {
    const xw = side < 0 ? x0 : x1;
    const span = (dep) => [Math.min(xw, xw - side * dep), Math.max(xw, xw - side * dep)];
    for (const z of zs) {
      let [xa, xb] = span(0.9);
      kit.boxMM("plate", [xa, Y, z - 0.6], [xb, cy, z + 0.6], { color: IMP.plateDark, uv: "world", texel: 1 });
      [xa, xb] = span(1.1);
      kit.boxMM("paintedMetal", [xa, Y, z - 0.32], [xb, cy - 0.3, z + 0.32], { color: IMP.black, texel: 1 });
      [xa, xb] = span(1.35);
      kit.boxMM("paintedMetal", [xa, Y, z - 0.85], [xb, Y + 1.3, z + 0.85], { color: IMP.black, texel: 1 });
      kit.boxMM("hazard", [xa, Y + 1.3, z - 0.85], [xb, Y + 1.31, z + 0.85], { texel: 2 });
      // amber marker strip at catwalk height + a status lamp near the top
      kit.box("emitAmber", xw - side * 1.115, CAT_Y + 3.6, z, 0.02, 2.4, 0.14);
      kit.box("emitRed", xw - side * 1.115, cy - 1.6, z, 0.02, 0.3, 0.3);
      kit.collider([Math.min(xw, xw - side * 1.35), Y, z - 0.85], [Math.max(xw, xw - side * 1.35), cy, z + 0.85], "rib");
    }
  }
}

// ---- wall dressing (screens, decals, panels) -------------------------------------------------------------
function wallDressing(ctx) {
  const { kit, props } = ctx;
  const inner = ctx.inner;
  // long walls: big emblems high up, status boards near the arches, control panels at deck level
  const xminF = ctx.wall("xmin").frame; // u = z1 - z
  const xmaxF = ctx.wall("xmax").frame; // u = z - z0
  const uMin = (z) => inner.z1 - z;
  const uX = (z) => z - inner.z0;
  for (const [F, u] of [[xminF, uMin], [xmaxF, uX]]) {
    for (const z of [-74, 54]) {
      F.decal(u(z), 24, 0.03, 7, 7, DECAL.EMBLEM);
      F.box("paintedMetal", u(z), 17.5, 0.04, 6.2, 0.5, 0.06, { color: IMP.black });
      F.box("emitAmber", u(z), 17.5, 0.075, 5.8, 0.18, 0.01);
    }
    for (const z of [-62, 24]) {
      F.decal(u(z), 11.5, 0.03, 2.6, 2.6, DECAL.BAY_CODE);
      F.box("darkGloss", u(z), 4.6, 0.05, 4.2, 1.7, 0.08);
      F.box("screen", u(z), 4.6, 0.095, 4.0, 1.5, 0.01, { uv: "keep", uvRect: screenRect(z < 0 ? 7 : 12) });
      F.box("leds", u(z), 3.6, 0.09, 3.6, 0.1, 0.01, { uv: "keep", uvRect: ledRect(4) });
    }
    for (const z of [-88.5, -70, -6, 36, 68]) props.wallPanel(kit, F, u(z), 1.55, { w: 1.1, h: 0.75, accent: "emitAmber", seed: Math.abs(z) + 3 });
  }
  // flight-control opening framing seen from the hangar (x 40, z -20..0, y -22..-18): jambs, lintel, amber strip
  const F = xmaxF;
  const zc = -10;
  for (const s of [-1, 1]) F.box("paintedMetal", uX(zc + s * 10.4), 20.0, 0.25, 0.8, 5.2, 0.5, { color: IMP.black, texel: 1 });
  F.box("paintedMetal", uX(zc), 22.35, 0.25, 21.6, 0.7, 0.5, { color: IMP.black, texel: 1 });
  F.box("paintedMetal", uX(zc), 22.35, 0.55, 22.0, 0.5, 0.2, { color: IMP.trim, texel: 1 });
  F.box("emitAmber", uX(zc), 22.35, 0.66, 20.6, 0.16, 0.02);
  F.decal(uX(-22.2), 20.4, 0.04, 1.4, 1.4, DECAL.TEXT_B);
  F.decal(uX(2.2), 20.4, 0.04, 1.4, 1.4, DECAL.WARNING);
  // the wall panel grid leaves the whole opening column without a collider — close the wall below and above
  kit.collider([inner.x1 - 0.3, Y, -20.4], [40.3, GAL_Y - 0.05, 0.4], "wall");
  kit.collider([inner.x1 - 0.3, GAL_Y + 4, -20.4], [40.3, ctx.ceil, 0.4], "wall");
  // forward / aft walls: emblem + bay designation over the doors
  const zminF = ctx.wall("zmin").frame; // u = x - x0
  const zmaxF = ctx.wall("zmax").frame; // u = x1 - x
  zminF.decal(39.75 + 0, 14, 0.03, 8, 8, DECAL.EMBLEM);
  zminF.decal(39.75 - 18, 9, 0.03, 3.5, 3.5, DECAL.BAY_CODE);
  zminF.decal(39.75 + 18, 9, 0.03, 3.5, 3.5, DECAL.BAY_CODE);
  zmaxF.decal(39.75, 22, 0.03, 8, 8, DECAL.EMBLEM_RED);
  zmaxF.decal(39.75 - 20, 18, 0.03, 3.5, 3.5, DECAL.RESTRICTED);
  zmaxF.decal(39.75 + 20, 18, 0.03, 3.5, 3.5, DECAL.RESTRICTED);
  // big traffic boards flanking the shuttle-bay blast door
  for (const s of [-1, 1]) {
    zmaxF.box("darkGloss", 39.75 + s * 16, 5.5, 0.05, 5.2, 2.2, 0.08);
    zmaxF.box("screen", 39.75 + s * 16, 5.5, 0.095, 5.0, 2.0, 0.01, { uv: "keep", uvRect: screenRect(s < 0 ? 7 : 1) });
    zmaxF.box("leds", 39.75 + s * 16, 4.2, 0.09, 4.4, 0.12, 0.01, { uv: "keep", uvRect: ledRect(s < 0 ? 2 : 11) });
  }
}

// ---- port strip: cradles, refuelling, maintenance -------------------------------------------------------
function portStrip(ctx) {
  const { kit, props } = ctx;
  const xw = ctx.inner.x0;
  CRADLES.forEach((c, i) => {
    cradle(ctx, c, i);
    refuelStation(kit, props, xw, c.z + (i === 3 ? 9.4 : 7.4), c.x, c.z); // the last one clears the rib at z 46
    if (i % 2 === 0) scaffold(kit, c.x + 0.5, c.z - 6.6, 0);
    else toolCart(kit, c.x - 3.2, c.z - 5.2, 0.4, CRATE_COLORS[(i + 1) % 4]);
  });
  // between the cradle bays: barrels, spares racks, carts
  for (let i = 0; i < 5; i++) barrelAt(kit, -37.6 + (i % 2) * 0.8, -74 + i * 0.8, i % 3 === 0 ? IMP.plateBlue : IMP.plateDark);
  for (let i = 0; i < 4; i++) barrelAt(kit, -36.2 + (i % 2) * 0.8, 6 + Math.floor(i / 2) * 0.8, IMP.plateDark, i % 2 ? IMP.hazardYellow : IMP.red);
  toolCart(kit, -34, -40, -0.3, IMP.plateBlue);
  toolCart(kit, -35.5, 33.5, 1.2, IMP.plateWarm);
  sparesRack(kit, xw + 0.7, -12);
  sparesRack(kit, xw + 0.7, 56);
}

function cradle(ctx, c, i) {
  const { kit, props } = ctx;
  const well = ctx.def.well;
  const { x, z } = c;
  // parking-bay lane toward the well: white edges, arrow, bay number
  for (const s of [-1, 1]) paint(kit, x - 4.4, z + s * 4.3 - 0.08, well.x0 - 1.3, z + s * 4.3 + 0.08, PAINT_WHITE);
  paint(kit, x - 4.4, z - 4.3, x - 4.24, z + 4.3, PAINT_WHITE);
  decalFlat(kit, well.x0 - 3.2, z, 2.4, 2.4, DECAL.ARROW, 1, 0);
  decalFlat(kit, x - 2.2, z + 3.2, 1.3, 1.3, DECAL.NUMBER0 + (i % 4), 1, 0);
  const P = new Placer(kit, [x, Y, z], 0);
  for (const s of [-1, 1]) {
    // rail under each wing with saddle blocks either side of the wing's bottom rim
    P.box("paintedMetal", 0, 0.2, s * 3.25, 7.0, 0.4, 0.62, { color: IMP.black, texel: 1 });
    P.box("hazard", 0, 0.41, s * 3.25, 6.8, 0.02, 0.5, { texel: 2 });
    for (const q of [-1, 1]) {
      P.box("plate", 0, 0.65, s * 3.25 + q * 0.42, 4.6, 0.5, 0.36, { color: IMP.plateDark, uv: "world", texel: 1 });
      P.box("rubber", 0, 0.92, s * 3.25 + q * 0.3, 4.4, 0.06, 0.14, { color: IMP.black });
    }
    P.collider([-3.5, 0, s * 3.25 - 0.65], [3.5, 0.95, s * 3.25 + 0.65], "cradle");
    // end stops
    for (const e of [-3.3, 3.3]) P.box("paintedMetal", e, 0.55, s * 3.25, 0.3, 0.3, 0.7, { color: IMP.gunmetal });
  }
  for (const xx of [-3.0, 3.0]) P.box("paintedMetal", xx, 0.15, 0, 0.5, 0.3, 7.2, { color: IMP.gunmetal, texel: 1 });
  // umbilical coupling on the deck feeding the pod's ventral hatch
  P.box("paintedMetal", 0.6, 0.12, 0.8, 1.2, 0.24, 1.0, { color: IMP.black });
  P.box("emitGreen", 0.6, 0.25, 0.8, 0.3, 0.02, 0.3);
  props.cableBundle(kit, { from: [x + 0.6, Y + 0.24, z + 0.8], to: [x, CRADLE_Y - 2.15, z + 0.2], sag: 0.2, n: 3, r: 0.03 });
  // pod access ladder leaning on the cradle rail
  for (let k = 0; k < 6; k++) P.box("metal", 2.2 + k * 0.05, 0.5 + k * 0.32, -4.0, 0.5, 0.04, 0.04, { color: IMP.steel });
  for (const q of [-0.25, 0.25]) P.box("metal", 2.35, 1.2, -4.0 + q, 0.05, 2.3, 0.05, { color: IMP.steelDark, rot: [0, 0, -0.18] });
  // status lamp post at the lane entrance
  P.cyl("metal", 4.2, 0.9, -4.6, 0.05, 1.8, "y", { color: IMP.steelDark, segments: 8 });
  P.box("paintedMetal", 4.2, 1.9, -4.6, 0.3, 0.4, 0.3, { color: IMP.black });
  P.box("emitGreen", 4.2, 1.9, -4.44, 0.16, 0.16, 0.02);
  P.collider([4.0, 0, -4.8], [4.4, 2.1, -4.4], "lamp");
}

/** Refuelling / power station at the port wall with hose reels and a hose laid to the fighter. */
function refuelStation(kit, props, xw, z, tx, tz) {
  const P = new Placer(kit, [xw + 0.6, Y, z], -Math.PI / 2); // faces +X (into the bay)
  P.box("plate", 0, 1.15, 0, 1.9, 2.3, 1.15, { color: IMP.plateDark, uv: "world", texel: 1 });
  P.box("paintedMetal", 0, 0.1, 0, 2.0, 0.2, 1.25, { color: IMP.black, texel: 1 });
  P.box("paintedMetal", 0, 2.25, 0, 2.0, 0.12, 1.25, { color: IMP.trim, texel: 1 });
  P.box("hazard", 0, 1.45, -0.585, 1.7, 0.12, 0.02, { texel: 3 });
  P.box("darkGloss", 0.4, 1.85, -0.585, 0.8, 0.44, 0.03);
  P.box("screen", 0.4, 1.85, -0.605, 0.7, 0.34, 0.006, { uv: "keep", uvRect: screenRect(3) });
  P.box("leds", -0.5, 1.9, -0.605, 0.6, 0.08, 0.006, { uv: "keep", uvRect: ledRect(5) });
  P.box("emitAmber", -0.5, 2.1, -0.605, 0.14, 0.14, 0.006);
  P.decal(-0.5, 1.2, -0.61, 0.5, 0.5, DECAL.WARNING);
  for (const hx of [-0.5, 0.5]) {
    P.cyl("paintedMetal", hx, 0.85, -0.78, 0.38, 0.3, "z", { color: IMP.gunmetal, segments: 14 });
    P.cyl("rubber", hx, 0.85, -0.78, 0.31, 0.36, "z", { color: IMP.black, segments: 14 });
    P.cyl("metal", hx, 0.85, -0.78, 0.05, 0.44, "z", { color: IMP.steel, segments: 8 });
  }
  P.collider([-1.0, 0, -0.95], [1.0, 2.35, 0.65], "refuel");
  const a = P.world(0.5, 0.55, -0.95);
  props.pipeRun(kit, { points: [[a.x, a.y, a.z], [a.x + 0.9, Y + 0.08, a.z - 0.3], [tx - 4.2, Y + 0.075, tz + 4.6], [tx - 3.4, Y + 0.08, tz + 2.6], [tx - 3.3, Y + 1.0, tz + 1.4], [tx - 2.8, CRADLE_Y - 0.5, tz + 0.7]], r: 0.075, color: IMP.black, mat: "rubber" });
}

/** Rolling maintenance scaffold with a ladder and a tool box. */
function scaffold(kit, x, z, yaw) {
  const P = new Placer(kit, [x, Y, z], yaw);
  const h = 2.9;
  for (const [px, pz] of [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]]) {
    P.box("metal", px, h / 2 + 0.15, pz, 0.1, h, 0.1, { color: IMP.steelDark });
    P.cyl("rubber", px, 0.15, pz, 0.15, 0.1, "x", { color: IMP.black, segments: 10 });
  }
  for (const pz of [-0.9, 0.9]) bar(kit, "metal", [...P.world(-1.4, 0.4, pz).toArray()], [...P.world(1.4, 2.4, pz).toArray()], 0.05, 0.05, { color: IMP.steelDark });
  P.box("paintedMetal", 0, h + 0.1, 0, 3.0, 0.12, 2.0, { color: IMP.trim, texel: 1 });
  const g = new THREE.PlaneGeometry(2.8, 1.8);
  g.rotateX(-Math.PI / 2);
  P.add("grate", g, 0, h + 0.172, 0, { uv: "scale", uvScale: [2.8 / 1.24, 1.8 / 0.9], color: 0xffffff });
  const r = (a, b) => {
    const A = P.world(a[0], 0, a[1]);
    const B = P.world(b[0], 0, b[1]);
    railing(kit, { from: [A.x, A.z], to: [B.x, B.z], y: Y + h + 0.16, h: 0.95, collide: false });
  };
  r([-1.5, -1.0], [1.5, -1.0]);
  r([1.5, -1.0], [1.5, 1.0]);
  r([1.5, 1.0], [-1.5, 1.0]);
  for (let k = 0; k < 8; k++) P.box("metal", -1.55, 0.35 + k * 0.36, 0, 0.04, 0.04, 0.5, { color: IMP.steel });
  for (const pz of [-0.27, 0.27]) P.box("metal", -1.55, h / 2 + 0.1, pz, 0.05, h, 0.05, { color: IMP.steelDark });
  P.box("plate", 0.8, h + 0.36, -0.4, 0.6, 0.4, 0.4, { color: IMP.plateBlue, uv: "world", texel: 2 });
  P.box("hazard", 0, 0.5, 0, 3.0, 0.08, 2.0, { texel: 2 });
  P.collider([-1.6, 0, -1.05], [1.6, h + 0.2, 1.05], "scaffold");
}

/** Small wheeled tool cart. */
function toolCart(kit, x, z, yaw, color = IMP.plateBlue) {
  const P = new Placer(kit, [x, Y, z], yaw);
  P.box("plate", 0, 0.55, 0, 1.0, 0.7, 0.6, { color, uv: "world", texel: 1 });
  P.box("paintedMetal", 0, 0.93, 0, 1.06, 0.06, 0.66, { color: IMP.black, texel: 1 });
  P.box("paintedMetal", 0, 0.22, 0, 1.02, 0.04, 0.62, { color: IMP.black });
  for (let k = 0; k < 3; k++) P.box("metal", 0, 0.36 + k * 0.18, -0.305, 0.8, 0.02, 0.02, { color: IMP.steel });
  for (const [wx, wz] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) P.cyl("rubber", wx, 0.1, wz, 0.1, 0.08, "x", { color: IMP.black, segments: 8 });
  P.cyl("metal", 0.58, 0.9, 0, 0.02, 0.6, "z", { color: IMP.steel, segments: 6 });
  P.box("leds", 0.2, 0.75, -0.305, 0.3, 0.06, 0.01, { uv: "keep", uvRect: ledRect(9) });
  P.box("paintedMetal", -0.2, 1.0, 0.1, 0.3, 0.08, 0.2, { color: IMP.gunmetal });
  P.box("metal", 0.25, 0.99, -0.1, 0.4, 0.05, 0.12, { color: IMP.steel });
  P.collider([-0.55, 0, -0.35], [0.65, 1.0, 0.35], "cart");
}

/** Wall spares rack: shelves with parts (boxes) and a spare TIE wing panel leaning against it. */
function sparesRack(kit, x, z) {
  const P = new Placer(kit, [x, Y, z], -Math.PI / 2); // faces +X
  P.box("paintedMetal", 0, 1.6, 0, 3.4, 3.2, 1.1, { color: IMP.black, texel: 1 });
  for (let s = 0; s < 4; s++) {
    P.box("plate", 0, 0.5 + s * 0.8, 0, 3.3, 0.08, 1.05, { color: IMP.plateDark, uv: "world", texel: 1 });
    for (let k = 0; k < 4; k++) if ((s + k) % 3 !== 1) P.box("plate", -1.2 + k * 0.8, 0.5 + s * 0.8 + 0.28, 0.02, 0.6, 0.48, 0.7, { color: CRATE_COLORS[(s + k) % 4], uv: "world", texel: 2 });
  }
  P.box("hazard", 0, 3.24, -0.55, 3.4, 0.08, 0.02, { texel: 3 });
  P.box("leds", 1.2, 3.0, -0.56, 0.6, 0.08, 0.01, { uv: "keep", uvRect: ledRect(12) });
  P.collider([-1.7, 0, -0.6], [1.7, 3.3, 0.6], "rack");
}

// ---- starboard strip: stair tower, gallery, ops banks ---------------------------------------------------
function starboardStrip(ctx) {
  const { kit, props } = ctx;
  const xw = ctx.inner.x1; // 39.75
  // stair tower: flight A (deck -> landing at catwalk level) against the wall climbing -z, a 6 m landing that
  // also receives the forward catwalk, flight B (landing -> gallery) outboard climbing +z.
  props.stairs(kit, { pos: [38.55, Y, -18], yaw: 0, rise: 8, stepH: 0.25, width: 2.4 }); // top z -27.6
  slab(kit, 32.4, -33.6, xw, -27.6, CAT_Y, "landing");
  props.stairs(kit, { pos: [33.75, CAT_Y, -33.6], yaw: Math.PI, rise: 10, stepH: 0.25, width: 2.4 }); // top z -21.6
  railing(kit, { from: [32.4, -33.6], to: [32.4, -27.6], y: CAT_Y, color: IMP.gunmetal });
  railing(kit, { from: [35.0, -33.75], to: [37.3, -33.75], y: CAT_Y, color: IMP.gunmetal });
  railing(kit, { from: [32.4, -27.45], to: [37.3, -27.45], y: CAT_Y, color: IMP.gunmetal });
  // gallery in front of the flight-control booth (its slab bridges the wall gap into the booth floor)
  slab(kit, 31, -21.6, 40.0, 3, GAL_Y, "gallery");
  railing(kit, { from: [31.15, -21.6], to: [31.15, HOIST.z0], y: GAL_Y, color: IMP.gunmetal });
  railing(kit, { from: [31.15, HOIST.z1], to: [31.15, 3], y: GAL_Y, color: IMP.gunmetal });
  railing(kit, { from: [31, -21.45], to: [32.45, -21.45], y: GAL_Y, color: IMP.gunmetal });
  railing(kit, { from: [35.05, -21.45], to: [xw, -21.45], y: GAL_Y, color: IMP.gunmetal });
  railing(kit, { from: [31, 2.85], to: [37.25, 2.85], y: GAL_Y, color: IMP.gunmetal });
  // tower frame: four columns, top frame, X-bracing on the outboard and forward faces, gallery columns
  const cols = [[32.1, -34.1], [32.1, -21.1], [36.15, -34.1], [36.15, -21.1]];
  for (const [x, z] of cols) {
    kit.boxMM("paintedMetal", [x - 0.25, Y, z - 0.25], [x + 0.25, GAL_Y + 1.4, z + 0.25], { color: IMP.plateDark, texel: 1 });
    kit.boxMM("paintedMetal", [x - 0.4, Y, z - 0.4], [x + 0.4, Y + 0.5, z + 0.4], { color: IMP.black, texel: 1 });
    kit.collider([x - 0.3, Y, z - 0.3], [x + 0.3, GAL_Y, z + 0.3], "column");
  }
  kit.boxMM("paintedMetal", [31.85, GAL_Y + 1.1, -34.35], [36.4, GAL_Y + 1.4, -20.85], { color: IMP.trim, texel: 1 });
  kit.boxMM("paintedMetal", [31.85, GAL_Y + 1.1, -34.35], [xw, GAL_Y + 1.4, -33.85], { color: IMP.trim, texel: 1 });
  kit.boxMM("emitAmber", [32.0, GAL_Y + 1.2, -34.5], [36.25, GAL_Y + 1.3, -34.36]);
  for (const [ya, yb] of [[Y + 0.5, CAT_Y - 0.4], [CAT_Y - 0.4, GAL_Y + 1.0]]) {
    bar(kit, "paintedMetal", [32.1, ya, -34.1], [32.1, yb, -21.1], 0.16, 0.3, { color: IMP.gunmetal });
    bar(kit, "paintedMetal", [32.1, ya, -21.1], [32.1, yb, -34.1], 0.16, 0.3, { color: IMP.gunmetal });
  }
  bar(kit, "paintedMetal", [32.1, Y + 0.5, -34.1], [36.15, CAT_Y - 0.4, -34.1], 0.3, 0.16, { color: IMP.gunmetal });
  bar(kit, "paintedMetal", [36.15, Y + 0.5, -34.1], [32.1, CAT_Y - 0.4, -34.1], 0.3, 0.16, { color: IMP.gunmetal });
  for (const z of [-14.5, 2.6]) {
    kit.boxMM("paintedMetal", [31.15, Y, z - 0.25], [31.65, GAL_Y - 0.3, z + 0.25], { color: IMP.plateDark, texel: 1 });
    kit.collider([31.1, Y, z - 0.3], [31.7, GAL_Y, z + 0.3], "column");
  }
  // gallery underside: stiffeners + a lit soffit so the space below is not a black slab
  for (let z = -20; z < 3; z += 4) kit.boxMM("paintedMetal", [31, GAL_Y - 0.6, z - 0.15], [xw, GAL_Y - 0.3, z + 0.15], { color: IMP.black, texel: 1 });
  kit.boxMM("paintedMetal", [34.6, GAL_Y - 0.44, -21], [35.4, GAL_Y - 0.3, 2.5], { color: IMP.black, texel: 1 });
  kit.boxMM("emitWhiteSoft", [34.75, GAL_Y - 0.45, -20.5], [35.25, GAL_Y - 0.44, 2], { uv: "keep" });
  // gallery furniture: observation console at the rail, status board on the wall
  props.consoleStation(kit, { pos: [32.6, GAL_Y, -8.5], yaw: Math.PI / 2, w: 2.2, d: 0.8, screens: 3, accent: "emitAmber", seed: 21, screenSet: [7, 2, 12] });
  props.chair(kit, { pos: [33.6, GAL_Y, -8.5], yaw: Math.PI / 2 });
  // ops banks and stores under the gallery
  props.computerBank(kit, { pos: [xw - 0.6, Y, -16.2], yaw: -Math.PI / 2, w: 3.2, h: 2.4, d: 0.6, seed: 5, accent: "emitAmber" });
  props.computerBank(kit, { pos: [xw - 0.6, Y, -12.7], yaw: -Math.PI / 2, w: 3.2, h: 2.4, d: 0.6, seed: 6, accent: "emitAmber" });
  props.consoleStation(kit, { pos: [36.6, Y, -6.5], yaw: Math.PI / 2, w: 1.8, d: 0.8, screens: 2, accent: "emitAmber", seed: 8 });
  props.chair(kit, { pos: [37.6, Y, -6.5], yaw: Math.PI / 2 });
  crateStack(kit, ctx.rand, 37.2, -1.5, 2, 2, { tiers: 2 });
  toolCart(kit, 34.5, -17.5, -1.3, IMP.plateBlue);
  // starboard mid-bay: containers and a second cargo stack near the repair arch approach
  props.cargoContainer(kit, { pos: [30.5, Y, 24], yaw: 0, len: 6, w: 2.0, h: 2.2, color: IMP.plate });
  props.cargoContainer(kit, { pos: [33.2, Y, 24], yaw: 0, len: 6, w: 2.0, h: 2.2, color: IMP.plateBlue });
  props.cargoContainer(kit, { pos: [31.85, Y + 2.24, 24], yaw: 0, len: 6, w: 2.0, h: 2.2, color: IMP.plateDark, collide: false });
  crateStack(kit, ctx.rand, 35, 14, 2, 3, { tiers: 2 });
  for (let i = 0; i < 6; i++) barrelAt(kit, 37.2 + (i % 2) * 0.8, 29 + Math.floor(i / 2) * 0.8, i % 2 ? IMP.plateBlue : IMP.plateDark);
  toolCart(kit, 28.5, 18, 2.0, IMP.plateWarm);
  // forward starboard bay (in front of the cargo arch approach): fuel cell pallets
  for (let i = 0; i < 8; i++) barrelAt(kit, 28 + (i % 4) * 0.8, -62 + Math.floor(i / 4) * 0.8, IMP.plateDark, IMP.hazardYellow);
  crateStack(kit, ctx.rand, 34, -64, 3, 2, { tiers: 2 });
}

// ---- service catwalks at y -32 along both long walls ----------------------------------------------------
function catwalks(ctx) {
  const { kit, props } = ctx;
  const { x0, x1 } = ctx.inner;
  const W = 2.4;
  // port: continuous z -76.4..56.4 with stairs at both ends
  props.stairs(kit, { pos: [-38.55, Y, -86], yaw: Math.PI, rise: 8, stepH: 0.25, width: W });
  props.stairs(kit, { pos: [-38.55, Y, 66], yaw: 0, rise: 8, stepH: 0.25, width: W });
  catwalkRun(ctx, x0, x0 + W, -76.4, 56.4, +1);
  // starboard: forward run to the tower landing, aft run from the gallery stair to the aft stair
  props.stairs(kit, { pos: [38.55, Y, -86], yaw: Math.PI, rise: 8, stepH: 0.25, width: W });
  catwalkRun(ctx, x1 - W, x1, -76.4, -33.6, -1);
  props.stairs(kit, { pos: [38.55, CAT_Y, 15], yaw: 0, rise: 10, stepH: 0.25, width: W });
  props.stairs(kit, { pos: [38.55, Y, 67], yaw: 0, rise: 8, stepH: 0.25, width: W });
  catwalkRun(ctx, x1 - W, x1, 15, 57.4, -1);
}

/** One catwalk run: slab, inner railing, wall brackets, conduits and wall lamps. side = +1 (wall at -x) or -1. */
function catwalkRun(ctx, xa, xb, z0, z1, side) {
  const { kit, props } = ctx;
  const xIn = side > 0 ? xb : xa; // inner (room-side) edge
  const xWall = side > 0 ? xa : xb;
  slab(kit, xa, z0, xb, z1, CAT_Y, "catwalk", { thick: 0.16 });
  kit.boxMM("paintedMetal", [xIn - 0.05, CAT_Y - 0.3, z0], [xIn + 0.05, CAT_Y + 0.14, z1], { color: IMP.black, texel: 1 });
  railing(kit, { from: [xIn - side * 0.12, z0], to: [xIn - side * 0.12, z1], y: CAT_Y, color: IMP.gunmetal });
  for (let z = z0 + 4; z < z1 - 1; z += 8) {
    kit.boxMM("paintedMetal", [Math.min(xa, xb), CAT_Y - 0.5, z - 0.12], [Math.max(xa, xb), CAT_Y - 0.16, z + 0.12], { color: IMP.gunmetal, texel: 1 });
    bar(kit, "paintedMetal", [xWall, CAT_Y - 2.2, z], [xIn - side * 0.2, CAT_Y - 0.5, z], 0.2, 0.2, { color: IMP.gunmetal });
    // wall lamp above the walkway
    kit.box("paintedMetal", xWall + side * 0.12, CAT_Y + 2.4, z, 0.2, 0.2, 0.9, { color: IMP.black });
    kit.box("emitWhiteSoft", xWall + side * 0.23, CAT_Y + 2.4, z, 0.02, 0.14, 0.7, { uv: "keep" });
  }
  // conduits under the walkway along the wall
  props.pipeRun(kit, { points: [[xWall + side * 0.35, CAT_Y - 0.9, z0], [xWall + side * 0.35, CAT_Y - 0.9, z1]], r: 0.14, color: IMP.steelDark, clamps: 10 });
  props.pipeRun(kit, { points: [[xWall + side * 0.75, CAT_Y - 1.1, z0], [xWall + side * 0.75, CAT_Y - 1.1, z1]], r: 0.09, color: IMP.gunmetal, clamps: 10 });
  props.pipeRun(kit, { points: [[xWall + side * 0.35, CAT_Y - 1.35, z0], [xWall + side * 0.35, CAT_Y - 1.35, z1]], r: 0.06, color: IMP.steel });
}

// ---- forward strip: lobby approach, lockers, stores ------------------------------------------------------
function forwardStrip(ctx) {
  const { kit, props } = ctx;
  const inner = ctx.inner;
  const F = ctx.wall("zmin").frame; // u = x - x0
  const u = (x) => x - inner.x0;
  // ready lockers + benches starboard of the lobby door
  props.lockerRow(kit, F, u(9), 14, { lw: 0.6, h: 2.0, d: 0.5 });
  for (const x of [11.5, 15.5]) {
    kit.boxMM("paintedMetal", [x - 1.6, Y + 0.42, -88.2], [x + 1.6, Y + 0.5, -87.6], { color: IMP.black, texel: 1 });
    for (const bx of [x - 1.3, x + 1.3]) kit.boxMM("metal", [bx - 0.05, Y, -88.15], [bx + 0.05, Y + 0.42, -87.65], { color: IMP.steelDark });
    kit.collider([x - 1.6, Y, -88.2], [x + 1.6, Y + 0.5, -87.6], "bench");
  }
  // briefing board + ops consoles port of the door
  F.box("darkGloss", u(-16), 3.0, 0.05, 6.2, 2.6, 0.08);
  F.box("screen", u(-16), 3.0, 0.095, 6.0, 2.4, 0.01, { uv: "keep", uvRect: screenRect(7) });
  F.box("leds", u(-16), 1.5, 0.09, 5.4, 0.12, 0.01, { uv: "keep", uvRect: ledRect(6) });
  props.consoleStation(kit, { pos: [-18, Y, -86.6], yaw: Math.PI, w: 2.4, d: 0.8, screens: 3, accent: "emitAmber", seed: 31, screenSet: [7, 12, 2] });
  props.consoleStation(kit, { pos: [-14, Y, -86.6], yaw: Math.PI, w: 2.4, d: 0.8, screens: 3, accent: "emitAmber", seed: 32, screenSet: [1, 7, 5] });
  props.chair(kit, { pos: [-18, Y, -87.2], yaw: Math.PI });
  props.chair(kit, { pos: [-14, Y, -87.2], yaw: Math.PI });
  props.computerBank(kit, { pos: [-28, Y, -89.15], yaw: 0, w: 3.0, h: 2.4, d: 0.6, seed: 9, accent: "emitAmber" });
  props.computerBank(kit, { pos: [-10.5, Y, -89.15], yaw: 0, w: 2.4, h: 2.4, d: 0.6, seed: 10, accent: "emitAmber" });
  // stores flanking the approach (the spawn corner x < -30 stays clear)
  crateStack(kit, ctx.rand, -24, -85.8, 3, 2, { tiers: 2 });
  crateStack(kit, ctx.rand, 25, -86, 4, 2, { tiers: 2 });
  for (let i = 0; i < 6; i++) barrelAt(kit, 33 + (i % 3) * 0.8, -88.4 + Math.floor(i / 3) * 0.8, IMP.plateDark, i % 2 ? IMP.hazardYellow : IMP.red);
  toolCart(kit, 21, -82.5, 0.3, IMP.plateWarm);
  toolCart(kit, -9, -82, -0.9, IMP.plateBlue);
  props.cargoContainer(kit, { pos: [-33.5, Y, -78.6], yaw: Math.PI / 2, len: 5, w: 1.8, h: 2.0, color: IMP.plate });
}

// ---- aft strip: container blocks around the recovery lane ------------------------------------------------
function aftStrip(ctx) {
  const { kit, props } = ctx;
  for (const s of [-1, 1]) {
    for (const [k, col] of [[0, IMP.plate], [1, IMP.plateBlue], [2, IMP.plateDark]]) {
      props.cargoContainer(kit, { pos: [s * (30 + k * 3.0), Y, 63], yaw: 0, len: 6, w: 2.0, h: 2.2, color: col });
    }
    props.cargoContainer(kit, { pos: [s * 31.5, Y + 2.24, 63], yaw: 0, len: 6, w: 2.0, h: 2.2, color: IMP.plateWarm, collide: false });
    props.cargoContainer(kit, { pos: [s * 34.5, Y + 2.24, 63], yaw: 0, len: 6, w: 2.0, h: 2.2, color: IMP.plate, collide: false });
    props.cargoContainer(kit, { pos: [s * 19, Y, 66.8], yaw: Math.PI / 2, len: 6, w: 2.0, h: 2.2, color: IMP.plateBlue });
    crateStack(kit, ctx.rand, s * 22, 60, 3, 2, { tiers: 2 });
    for (let i = 0; i < 8; i++) barrelAt(kit, s * (13 + (i % 4) * 0.8), 64.5 + Math.floor(i / 4) * 0.8, i % 3 ? IMP.plateDark : IMP.plateBlue);
    toolCart(kit, s * 26, 57, s * 1.4, IMP.plateBlue);
  }
  // loading dock light masts either side of the blast door approach
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [s * 11.5 - 0.3, Y, 68.6], [s * 11.5 + 0.3, Y + 9, 69.2], { color: IMP.plateDark, texel: 1 });
    kit.boxMM("paintedMetal", [s * 11.5 - 0.7, Y + 8.2, 68.3], [s * 11.5 + 0.7, Y + 8.9, 69.3], { color: IMP.black, texel: 1 });
    kit.boxMM("emitAmber", [s * 11.5 - 0.6, Y + 8.25, 68.28], [s * 11.5 + 0.6, Y + 8.85, 68.3]);
    kit.collider([s * 11.5 - 0.35, Y, 68.5], [s * 11.5 + 0.35, Y + 9, 69.3], "mast");
  }
}

// ---- gantry crane over the port strip (animated) ----------------------------------------------------------
function crane(ctx) {
  const { kit } = ctx;
  const xWall = ctx.inner.x0;
  const xIn = -26.8;
  const railY = -14.3;
  const zA = -84;
  const zB = 54;
  // rails: wall-bracketed outer rail (in front of the wall ribs), column-supported inner rail
  const xOut = xWall + 1.6;
  kit.boxMM("paintedMetal", [xOut - 0.35, railY - 0.6, zA], [xOut + 0.35, railY, zB], { color: IMP.gunmetal, texel: 1 });
  kit.boxMM("metal", [xOut - 0.45, railY, zA], [xOut + 0.45, railY + 0.16, zB], { color: IMP.steelDark, texel: 1 });
  kit.boxMM("paintedMetal", [xIn - 0.35, railY - 0.6, zA], [xIn + 0.35, railY, zB], { color: IMP.gunmetal, texel: 1 });
  kit.boxMM("metal", [xIn - 0.45, railY, zA], [xIn + 0.45, railY + 0.16, zB], { color: IMP.steelDark, texel: 1 });
  for (let z = zA + 2; z <= zB; z += 12) {
    kit.boxMM("paintedMetal", [xWall, railY - 1.6, z - 0.3], [xOut + 0.35, railY - 0.6, z + 0.3], { color: IMP.plateDark, texel: 1 });
    bar(kit, "paintedMetal", [xWall, railY - 4.5, z], [xOut + 0.2, railY - 0.8, z], 0.3, 0.3, { color: IMP.gunmetal });
  }
  for (const z of [-80, -48, -26, 4, 34, 50]) {
    kit.boxMM("paintedMetal", [xIn - 0.35, Y, z - 0.35], [xIn + 0.35, railY - 0.6, z + 0.35], { color: IMP.plateDark, texel: 1 });
    kit.boxMM("paintedMetal", [xIn - 0.6, Y, z - 0.6], [xIn + 0.6, Y + 0.6, z + 0.6], { color: IMP.black, texel: 1 });
    kit.box("hazard", xIn, Y + 0.61, z, 1.1, 0.01, 1.1, { texel: 1 });
    kit.collider([xIn - 0.6, Y, z - 0.6], [xIn + 0.6, railY, z + 0.6], "column");
  }
  // moving bridge + trolley + hoist
  const bk = new Kit(ctx.materials);
  const bridge = new THREE.Group();
  bk.boxMM("paintedMetal", [xOut - 0.5, railY + 0.3, -0.7], [xIn + 0.5, railY + 1.5, 0.7], { color: IMP.plateDark, texel: 1 });
  bk.boxMM("paintedMetal", [xOut - 0.5, railY + 0.16, -1.0], [xIn + 0.5, railY + 0.3, 1.0], { color: IMP.trim, texel: 1 });
  bk.boxMM("emitAmber", [xOut + 0.6, railY + 0.9, 0.7], [xIn - 0.6, railY + 1.05, 0.72]);
  bk.boxMM("emitAmber", [xOut + 0.6, railY + 0.9, -0.72], [xIn - 0.6, railY + 1.05, -0.7]);
  for (const x of [xOut, xIn]) {
    bk.boxMM("paintedMetal", [x - 0.5, railY + 0.16, -1.3], [x + 0.5, railY + 1.1, 1.3], { color: IMP.black, texel: 1 });
    for (const z of [-0.9, 0.9]) bk.cyl("metal", x, railY + 0.3, z, 0.24, 0.5, "x", { color: IMP.steel, segments: 12 });
  }
  bk.box("paintedMetal", (xOut + xIn) / 2, railY + 1.85, 0, 1.4, 0.7, 1.2, { color: IMP.gunmetal });
  bk.box("emitRed", (xOut + xIn) / 2, railY + 2.3, 0, 0.2, 0.2, 0.2);
  bk.build(bridge);
  const tk = new Kit(ctx.materials);
  const trolley = new THREE.Group();
  tk.box("paintedMetal", 0, railY - 0.4, 0, 1.8, 1.2, 1.9, { color: IMP.black, texel: 1 });
  tk.box("paintedMetal", 0, railY + 0.0, 0, 2.0, 0.3, 2.1, { color: IMP.trim, texel: 1 });
  for (const s of [-1, 1]) tk.cyl("metal", s * 0.7, railY - 0.6, 0, 0.35, 0.5, "z", { color: IMP.steelDark, segments: 12 });
  tk.box("hazard", 0, railY - 0.4, 0.96, 1.6, 0.16, 0.02, { texel: 3 });
  tk.build(trolley);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8).translate(0, -0.5, 0), ctx.materials.metal);
  cable.position.y = railY - 1.0;
  const hk = new Kit(ctx.materials);
  const hook = new THREE.Group();
  hk.box("paintedMetal", 0, -0.4, 0, 0.7, 0.8, 0.5, { color: IMP.gunmetal, texel: 1 });
  hk.box("hazard", 0, -0.4, 0, 0.72, 0.16, 0.52, { texel: 3 });
  hk.cyl("metal", 0, -1.0, 0, 0.06, 0.6, "y", { color: IMP.steel, segments: 8 });
  // slung cargo pod under the hook
  hk.box("plate", 0, -2.2, 0, 1.6, 1.3, 1.6, { color: IMP.plateBlue, uv: "world", texel: 1 });
  hk.box("paintedMetal", 0, -2.2, 0, 1.66, 0.16, 1.66, { color: IMP.black });
  hk.box("paintedMetal", 0, -1.62, 0, 1.66, 0.14, 1.66, { color: IMP.black });
  hk.box("paintedMetal", 0, -2.78, 0, 1.66, 0.14, 1.66, { color: IMP.black });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(hk, "metal", [0, -1.25, 0], [sx * 0.75, -1.6, sz * 0.75], 0.03, 0.03, { color: IMP.steelDark });
  hk.build(hook);
  trolley.add(cable, hook);
  bridge.add(trolley);
  ctx.add(bridge);
  ctx.kit.meshes.push(...bk.meshes, ...tk.meshes, ...hk.meshes, cable);
  let acc = 17;
  ctx.animate((dt) => {
    acc += dt;
    bridge.position.z = -13 + 51 * Math.sin((acc * Math.PI * 2) / 110);
    trolley.position.x = -33.2 + 4.4 * Math.sin((acc * Math.PI * 2) / 41 + 1.0);
    const len = 7 + 5 * (0.5 + 0.5 * Math.sin((acc * Math.PI * 2) / 63 + 2.0));
    cable.scale.y = len;
    hook.position.y = railY - 1.0 - len;
  });
}

// ---- cargo hoist beside the gallery (animated platform) -------------------------------------------------
function cargoHoist(ctx) {
  const { kit } = ctx;
  const { x0, x1, z0, z1 } = HOIST;
  const top = GAL_Y + 1.6;
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    kit.boxMM("paintedMetal", [x - 0.2, Y, z - 0.2], [x + 0.2, top, z + 0.2], { color: IMP.plateDark, texel: 1 });
    kit.boxMM("metal", [x - 0.08, Y + 0.3, z - 0.08], [x + 0.08, top - 0.4, z + 0.08], { color: IMP.steelDark });
  }
  kit.boxMM("paintedMetal", [x0 - 0.25, top - 0.4, z0 - 0.25], [x1 + 0.25, top, z1 + 0.25], { color: IMP.trim, texel: 1 });
  kit.boxMM("paintedMetal", [x0 + 0.4, top - 0.4, z0 + 0.4], [x1 - 0.4, top - 0.35, z1 - 0.4], { color: IMP.black, texel: 1 });
  kit.box("paintedMetal", (x0 + x1) / 2, top + 0.4, (z0 + z1) / 2, 1.6, 0.8, 1.4, { color: IMP.gunmetal });
  kit.box("emitAmber", (x0 + x1) / 2, top + 0.85, (z0 + z1) / 2, 0.3, 0.1, 0.3);
  kit.box("hazard", (x0 + x1) / 2, Y + 0.012, (z0 + z1) / 2, x1 - x0 + 1.2, 0.006, z1 - z0 + 1.2, { texel: 1 });
  // deck-level guard rails on the wall side and the two ends; the well side is the loading face
  railing(kit, { from: [x1, z0], to: [x1, z1], y: Y, color: IMP.gunmetal });
  kit.collider([x0 - 0.2, Y, z0 - 0.2], [x1 + 0.2, GAL_Y + 1.2, z1 + 0.2], "hoist");
  // moving platform with its load
  const pk = new Kit(ctx.materials);
  const plat = new THREE.Group();
  pk.boxMM("paintedMetal", [x0 + 0.3, -0.3, z0 + 0.3], [x1 - 0.3, 0, z1 - 0.3], { color: IMP.trim, texel: 1 });
  pk.boxMM("hazard", [x0 + 0.3, 0.001, z0 + 0.3], [x1 - 0.3, 0.012, z1 - 0.3], { texel: 1 });
  pk.boxMM("paintedMetal", [x0 + 0.5, 0.012, z0 + 0.5], [x1 - 0.5, 0.02, z1 - 0.5], { color: IMP.plateDark, texel: 1 });
  for (const x of [x0 + 0.3, x1 - 0.3]) pk.boxMM("paintedMetal", [x - 0.15, -0.3, z0 + 0.3], [x + 0.15, 1.1, z1 - 0.3], { color: IMP.black, texel: 1 });
  for (const z of [z0 + 0.3, z1 - 0.3]) for (const yy of [0.5, 1.05]) pk.boxMM("metal", [x0 + 0.3, yy - 0.03, z - 0.03], [x1 - 0.3, yy + 0.03, z + 0.03], { color: IMP.steel });
  for (const yy of [0.5, 1.05]) pk.boxMM("metal", [x1 - 0.33, yy - 0.03, z0 + 0.3], [x1 - 0.27, yy + 0.03, z1 - 0.3], { color: IMP.steel });
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  pk.box("plate", cx - 0.7, 0.52, cz - 0.6, 1.2, 1.0, 1.2, { color: IMP.plateBlue, uv: "world", texel: 1 });
  pk.box("plate", cx + 0.7, 0.52, cz - 0.6, 1.2, 1.0, 1.2, { color: IMP.plate, uv: "world", texel: 1 });
  pk.box("plate", cx, 1.52, cz - 0.6, 1.2, 1.0, 1.2, { color: IMP.plateDark, uv: "world", texel: 1 });
  for (const [bx, bz] of [[cx - 0.9, cz + 0.9], [cx - 0.1, cz + 0.9], [cx + 0.7, cz + 0.9]]) pk.cyl("plate", bx, 0.47, bz, 0.36, 0.9, "y", { color: IMP.plateDark, segments: 12 });
  pk.build(plat);
  ctx.add(plat);
  ctx.kit.meshes.push(...pk.meshes);
  let acc = 5;
  const period = 44;
  ctx.animate((dt) => {
    acc += dt;
    const p = (acc % period) / period;
    // dwell low, rise, dwell high, descend
    let k;
    if (p < 0.2) k = 0;
    else if (p < 0.45) k = (p - 0.2) / 0.25;
    else if (p < 0.65) k = 1;
    else if (p < 0.9) k = 1 - (p - 0.65) / 0.25;
    else k = 0;
    const s = k * k * (3 - 2 * k);
    plat.position.y = Y + 0.3 + (GAL_Y - (Y + 0.3)) * s;
  });
}

// ---- rotating amber beacons at the well corners ---------------------------------------------------------
function beacons(ctx) {
  const w = ctx.def.well;
  const heads = [];
  for (const [x, z] of [[w.x0 - 2.7, w.z0 - 2.7], [w.x1 + 2.7, w.z0 - 2.7], [w.x0 - 2.7, w.z1 + 2.7], [w.x1 + 2.7, w.z1 + 2.7]]) {
    const k = ctx.kit;
    k.cyl("paintedMetal", x, Y + 0.1, z, 0.4, 0.2, "y", { color: IMP.black, segments: 12 });
    k.cyl("metal", x, Y + 1.1, z, 0.09, 1.8, "y", { color: IMP.steelDark, segments: 8 });
    k.cyl("paintedMetal", x, Y + 2.05, z, 0.36, 0.14, "y", { color: IMP.black, segments: 12 });
    k.cyl("emitAmber", x, Y + 2.38, z, 0.27, 0.52, "y", { segments: 12 });
    k.cyl("paintedMetal", x, Y + 2.7, z, 0.34, 0.12, "y", { color: IMP.black, segments: 12 });
    k.collider([x - 0.4, Y, z - 0.4], [x + 0.4, Y + 2.8, z + 0.4], "beacon");
    const bk = new Kit(ctx.materials);
    bk.add("paintedMetal", new THREE.CylinderGeometry(0.31, 0.31, 0.5, 12, 1, true, 0, Math.PI), { color: IMP.black, uv: "scale", uvScale: [1, 1] });
    bk.box("emitAmber", -0.55, 0, 0, 0.6, 0.12, 0.14); // beam bar out of the open half of the shroud
    const g = new THREE.Group();
    bk.build(g);
    g.position.set(x, Y + 2.38, z);
    ctx.add(g);
    ctx.kit.meshes.push(...bk.meshes);
    heads.push(g);
  }
  let acc = 0;
  ctx.animate((dt) => {
    acc += dt;
    for (let i = 0; i < heads.length; i++) heads[i].rotation.y = acc * 4.0 + i * 1.3;
  });
}

// ---- mobile work-light towers (emissive lamp heads; the real lights are the pendants) -------------------
function lightTowers(ctx) {
  const { kit } = ctx;
  for (const [x, z] of [[-27.5, -83], [27.5, -83], [-31.5, 58.5], [31.5, 58.5]]) {
    const fx = -x;
    const fz = z < 0 ? 30 : -30; // aim toward the well centre-ish
    const P = new Placer(kit, [x, Y, z], Math.atan2(-fx, -fz));
    P.box("paintedMetal", 0, 0.15, 0, 1.9, 0.3, 1.9, { color: IMP.black, texel: 1 });
    P.box("hazard", 0, 0.32, 0, 1.5, 0.04, 1.5, { texel: 1 });
    P.box("plate", 0, 3.7, 0, 0.72, 6.8, 0.72, { color: IMP.plateDark, uv: "world", texel: 1 });
    for (const s of [-1, 1]) P.box("metal", s * 0.37, 3.7, 0, 0.04, 6.2, 0.5, { color: IMP.steelDark });
    P.box("paintedMetal", 0, 7.15, -0.2, 3.4, 0.36, 0.6, { color: IMP.black, texel: 1 });
    for (const lx of [-1.15, 0, 1.15]) {
      P.box("paintedMetal", lx, 6.65, -0.5, 0.9, 0.7, 0.7, { color: IMP.gunmetal, rot: [-0.6, 0, 0], texel: 1 });
      P.box("emitAmber", lx, 6.45, -0.8, 0.74, 0.54, 0.03, { rot: [-0.6, 0, 0] });
    }
    P.box("paintedMetal", 0, 7.45, 0.1, 0.5, 0.3, 0.5, { color: IMP.black });
    P.box("emitRed", 0, 7.65, 0.1, 0.16, 0.12, 0.16);
    P.cyl("metal", 0, 8.0, 0.1, 0.03, 0.6, "y", { color: IMP.steel, segments: 6 });
    P.box("darkGloss", 0, 1.4, -0.38, 0.5, 0.4, 0.04);
    P.box("leds", 0, 1.4, -0.4, 0.4, 0.1, 0.005, { uv: "keep", uvRect: ledRect(7) });
    P.collider([-0.95, 0, -0.95], [0.95, 7.7, 0.95], "tower");
  }
}

// ---- lights (8): one shadow spot over the well, four amber work-light pendants over the deck strips, cool
// fills at both ends of the hall and one over the flight-control gallery. Decay 1.3 (instead of the physical
// 2) so eight fixtures can carry a 80 × 160 m hall; emissive strips / beacons do the rest.
function lights(ctx) {
  // the Imperial plate tints are dark (≈ 7 % albedo): surfaces need ~10 W/m² to read as lit grey
  const decay = 1.1;
  ctx.spot(0xfff3e0, 520, 130, 0.95, [SPOT_XZ[0], SPOT_Y, SPOT_XZ[1]], [SPOT_XZ[0], -68, SPOT_XZ[1]], { penumbra: 0.45, decay, shadow: true, mapSize: 1024 });
  // the amber work lights are wide downward spots: strong pools on the deck strips, no hot spot on the
  // ceiling / upper wall right next to the fixture
  for (const [x, z] of PENDANTS_AMBER) ctx.spot(0xffb25c, 420, 120, 1.3, [x, PENDANT_Y - 0.5, z], [x, Y, z], { penumbra: 0.35, decay });
  for (const [x, z] of PENDANTS_COOL) ctx.light(0xc8d6ff, 240, 120, [x, PENDANT_COOL_Y - 0.5, z], { decay });
  ctx.light(0xd6e0ff, 90, 80, [GALLERY_LAMP[0], GALLERY_LAMP[1] - 0.5, GALLERY_LAMP[2]], { decay });
}
