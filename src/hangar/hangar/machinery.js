// d4-hangar machinery: the ceiling crane (two full-length gantry rails at y -16 hung from the ceiling
// ribs, an underslung bridge with maintenance walkway, trolley, hoist and hook block, all driven by t),
// and the deck-level utility clutter clustered under the racks, along the end walls and by the spawn:
// fuel bowsers, ground-power carts, tool carts, crate stacks, cable reels, mobile access platforms,
// drums. Nothing stands on a landing pad, taxi lane or door approach.
import * as THREE from "three";
import { Batch, Batcher } from "./batch.js";
import { FLOOR, CEIL, WALL_T, HALL, RIB_Z, RIB_D, RAIL_H, HG } from "./layout.js";
import { label, railRun } from "./util.js";

// ---------------------------------------------------------------------------
// Crane
// ---------------------------------------------------------------------------
const RAIL_X = 64;
const RAIL_TOP = -16;
const RIB_BOTTOM = CEIL - WALL_T - RIB_D; // underside of the transverse ceiling ribs
const GIRDER_Z = 1.4; // half distance between the two bridge girders
const DRUM_Y = -20.75; // hoist drum axis (trolley local)

/** static rails + hangers (kit) and the moving bridge/trolley/hook (meshes on ctx.group). Returns {update}. */
export function buildCrane(ctx) {
  const { kit, group, materials, PALETTE } = ctx;
  const B = new Batcher(kit);
  const impDark = PALETTE.impDark, impMid = PALETTE.impMid;
  const z0 = HALL.z0 + 1.5, z1 = HALL.z1 - 1.5;
  for (const s of [-1, 1]) {
    const x = s * RAIL_X;
    const mm = (a, b) => [Math.min(x + s * a, x + s * b), Math.max(x + s * a, x + s * b)];
    // I-beam rail: top flange, web, bottom flange (the trucks ride the bottom flange)
    B.boxMM("paintedMetal", impDark, [x - 0.32, RAIL_TOP - 0.12, z0], [x + 0.32, RAIL_TOP, z1], { texel: 0.5 });
    B.boxMM("paintedMetal", impDark, [x - 0.07, RAIL_TOP - 0.9, z0 + 0.02], [x + 0.07, RAIL_TOP - 0.12, z1 - 0.02], { texel: 0.5 });
    B.boxMM("metal", HG.steel, [x - 0.32, RAIL_TOP - 1.02, z0], [x + 0.32, RAIL_TOP - 0.9, z1]);
    // hangers to the transverse ceiling ribs with foot plates and a knee gusset toward the wall
    for (const z of RIB_Z) {
      B.boxMM("paintedMetal", impDark, [x - 0.25, RAIL_TOP + 0.1, z - 0.25], [x + 0.25, RIB_BOTTOM, z + 0.25], { texel: 0.5 });
      B.boxMM("paintedMetal", impMid, [x - 0.5, RAIL_TOP - 0.02, z - 0.5], [x + 0.5, RAIL_TOP + 0.14, z + 0.5], { texel: 0.5 });
      B.tube("metal", HG.gunmetal, [x + s * 0.3, RAIL_TOP + 0.3, z], [x + s * 2.4, RIB_BOTTOM - 0.05, z], 0.08, 8);
    }
    // festoon cable tray outboard of the truck path (feeds the bridge), on brackets off the top flange
    let [a, b] = mm(1.7, 2.0);
    B.boxMM("paintedMetal", PALETTE.impBlack, [a, RAIL_TOP - 0.5, z0], [b, RAIL_TOP - 0.2, z1], { texel: 0.5 });
    [a, b] = mm(1.75, 1.95);
    B.boxMM("rubber", HG.rubber, [a, RAIL_TOP - 0.42, z0 + 0.1], [b, RAIL_TOP - 0.28, z1 - 0.1]);
    [a, b] = mm(0.3, 2.0);
    for (let z = z0 + 6; z < z1 - 2; z += 12) B.boxMM("metal", HG.gunmetal, [a, RAIL_TOP - 0.1, z - 0.06], [b, RAIL_TOP, z + 0.06]);
    // end stops in the truck path
    for (const z of [z0 + 0.6, z1 - 0.6]) B.boxMM("hgHazard", 0xffffff, [x - 0.6, RAIL_TOP - 2.5, z - 0.2], [x + 0.6, RAIL_TOP - 1.05, z + 0.2], { texel: 1 });
  }
  B.flush();

  // ---- bridge (moves along z)
  const bridge = new THREE.Group();
  bridge.name = "crane-bridge";
  const bb = new Batch(), be = new Batch(), bp = new Batch();
  const L = 2 * RAIL_X - 2.2; // girder length (ends buried 10 cm in the trucks)
  for (const s of [-1, 1]) {
    const x = s * RAIL_X;
    bb.box(x, -17.35, 0, 2.4, 2.3, 4.0, { color: impDark, texel: 0.5 }); // end truck around the rail
    for (const dz of [-1.3, 1.3]) bb.box(x, -17.0, dz, 2.6, 0.7, 0.9, { color: impMid, texel: 0.5 }); // wheel covers
    bb.box(x + s * 1.3, -16.7, 0, 0.2, 0.2, 3.6, { color: HG.steel });
    for (const dz of [-1.5, 1.5]) bp.box(x + s * 1.35, -16.55, dz, 0.3, 0.3, 0.3); // beacons on the truck faces
  }
  for (const zs of [-GIRDER_Z, GIRDER_Z]) {
    bb.box(0, -17.6, zs, L, 1.4, 0.7, { color: impDark, texel: 0.5 });
    bb.box(0, -16.84, zs, L, 0.12, 0.9, { color: impMid, texel: 0.5 });
    bb.box(0, -18.36, zs, L, 0.12, 0.9, { color: impMid, texel: 0.5 });
    // stiffener plates every 6 m on the outer face
    for (let x = -60; x <= 60; x += 6) bb.box(x, -17.6, zs + Math.sign(zs) * 0.36, 0.25, 1.3, 0.04, { color: impMid });
  }
  for (let x = -60; x <= 60; x += 12) bb.box(x, -17.15, 0, 0.3, 0.3, 2 * GIRDER_Z - 0.6, { color: impDark });
  // maintenance walkway along the +z girder with a 1.02 m rail
  const wz = GIRDER_Z + 0.35 + 0.05;
  bb.box(0, -16.95, wz + 0.4, L - 2, 0.1, 0.8, { color: impMid, texel: 0.5 });
  for (let x = -60; x <= 60; x += 6) bb.box(x, -17.15, wz + 0.4, 0.15, 0.3, 0.8, { color: impDark });
  for (let x = -61; x <= 61; x += 2.5) bb.box(x, -16.9 + RAIL_H / 2, wz + 0.78, 0.06, RAIL_H, 0.06, { color: HG.gunmetal });
  bb.box(0, -16.9 + RAIL_H, wz + 0.78, L - 2, 0.05, 0.06, { color: HG.steel });
  bb.box(0, -16.9 + RAIL_H * 0.55, wz + 0.78, L - 2, 0.04, 0.05, { color: HG.steel });
  bb.box(0, -16.8, wz + 0.78, L - 2, 0.2, 0.03, { color: HG.gunmetal });
  // work lights under both girders every 10 m
  for (let x = -55; x <= 55; x += 10) for (const zs of [-GIRDER_Z, GIRDER_Z]) be.box(x, -18.48, zs, 0.8, 0.1, 0.5);
  const meshB = new THREE.Mesh(bb.geometry(), materials.paintedMetal);
  const meshE = new THREE.Mesh(be.geometry(0xffffff), materials.emitWhite);
  const meshP = new THREE.Mesh(bp.geometry(0xffffff), materials.hgPulse);
  bridge.add(meshB, meshE, meshP);

  // ---- trolley (moves along x on the bridge)
  const trolley = new THREE.Group();
  trolley.name = "crane-trolley";
  const tb = new Batch();
  for (const sx of [-1, 1]) tb.box(sx * 1.1, -18.05, 0, 0.8, 0.9, 2.0, { color: impMid, texel: 0.5 }); // wheel carriages between the girders
  tb.box(0, -19.1, 0, 2.6, 1.1, 3.4, { color: impDark, texel: 0.5 }); // hoist body
  for (const sx of [-1, 1]) tb.box(sx * 1.31, -19.1, 0, 0.02, 0.7, 2.6, { color: impMid }); // side panels
  for (const sx of [-1, 1]) tb.box(sx * 1.0, -20.1, 0, 0.2, 0.9, 0.6, { color: impDark }); // drum mounts
  tb.addGeometry(new THREE.CylinderGeometry(0.45, 0.45, 1.8, 14), { pos: [0, DRUM_Y, 0], quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), color: HG.gunmetal });
  tb.addGeometry(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 10), { pos: [0, -19.1, -1.9], quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), color: HG.steel }); // motor stub
  const meshT = new THREE.Mesh(tb.geometry(), materials.paintedMetal);
  const te = new Batch();
  for (const sx of [-1, 1]) te.box(sx * 0.8, -19.68, 1.2, 0.5, 0.06, 0.3);
  te.box(0, -18.75, -1.72, 0.9, 0.08, 0.02);
  const meshTE = new THREE.Mesh(te.geometry(0xffffff), materials.emitWhite);
  // two hoist cables: unit-height boxes hanging from the drum, scaled to the hook height each frame
  const cb = new Batch();
  for (const sx of [-0.45, 0.45]) cb.box(sx, -0.5, 0, 0.07, 1, 0.07, { color: HG.steel });
  const cables = new THREE.Mesh(cb.geometry(), materials.paintedMetal);
  cables.position.y = DRUM_Y;
  // hook block: sheave block, side plates, shank + hook
  const hook = new THREE.Group();
  const hb = new Batch();
  hb.box(0, 0, 0, 0.9, 1.2, 0.5, { color: impDark, texel: 1 });
  for (const sz of [-1, 1]) hb.box(0, 0, sz * 0.26, 1.0, 1.0, 0.02, { color: impMid });
  hb.box(0, 0.35, 0, 1.1, 0.14, 0.14, { color: HG.steel });
  hb.box(0, -0.85, 0, 0.16, 0.5, 0.16, { color: HG.steel });
  // J hook: half torus whose upper end meets the shank at (0, -1.1), curving down and round on +x
  hb.addGeometry(new THREE.TorusGeometry(0.34, 0.09, 8, 18, Math.PI), { pos: [0, -1.44, 0], quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2), color: HG.steel });
  const hazard = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.3, 0.52), materials.hgHazard);
  hazard.position.y = -0.4;
  hook.add(new THREE.Mesh(hb.geometry(), materials.paintedMetal), hazard);
  trolley.add(meshT, meshTE, cables, hook);
  bridge.add(trolley);
  group.add(bridge);

  // moving work light under the trolley (descriptor pos is re-read every frame by the pool)
  const light = { type: "point", pos: [0, -22, 32], color: 0xf4f7ff, intensity: 90, distance: 45, priority: 0.5 };
  ctx.lights.push(light);

  const update = (t) => {
    const zc = 32 + 40 * Math.sin((t * Math.PI * 2) / 120);
    const xt = 30 * Math.sin((t * Math.PI * 2) / 75 + 1.2);
    const yH = -35 + 3 * Math.sin((t * Math.PI * 2) / 50 + 0.5);
    bridge.position.z = zc;
    trolley.position.x = xt;
    hook.position.y = yH;
    cables.scale.y = DRUM_Y - (yH + 0.6);
    light.pos[0] = xt;
    light.pos[2] = zc;
  };
  update(0);
  return { update };
}

// ---------------------------------------------------------------------------
// Deck clutter. Placer maps prop-local coordinates (origin on the deck, +lz = prop front) into the
// world with a quarter-turn yaw so everything stays axis-aligned for the box batcher.
// ---------------------------------------------------------------------------
class Placer {
  constructor(ctx, B, x, z, q) {
    this.ctx = ctx;
    this.B = B;
    this.kit = ctx.kit;
    this.P = ctx.PALETTE;
    this.x = x;
    this.z = z;
    this.q = ((q % 4) + 4) % 4;
  }
  dir(lx, lz) {
    switch (this.q) {
      case 0: return [lx, lz];
      case 1: return [lz, -lx];
      case 2: return [-lx, -lz];
      default: return [-lz, lx];
    }
  }
  w(lx, lz) {
    const [dx, dz] = this.dir(lx, lz);
    return [this.x + dx, this.z + dz];
  }
  ext(sx, sz) {
    return this.q & 1 ? [sz, sx] : [sx, sz];
  }
  box(mat, color, lx, ly, lz, sx, sy, sz, opts) {
    const [x, z] = this.w(lx, lz);
    const [ex, ez] = this.ext(sx, sz);
    this.B.box(mat, color, x, ly, z, ex, sy, ez, opts);
  }
  /** batched cylinder from shared geometry (wheels, drums, hubs: the primitive's own UVs are fine) */
  cyl(mat, color, lx, ly, lz, r, len, axis = "y", opts = {}) {
    const [x, z] = this.w(lx, lz);
    const a = axis === "y" ? "y" : this.q & 1 ? (axis === "x" ? "z" : "x") : axis;
    this.B.cyl(mat, color, x, ly, z, r, len, a, opts.segments || 12);
  }
  /** textured cylinder through the kit (world-scaled UVs: hazard rings, big tanks) */
  kcyl(mat, color, lx, ly, lz, r, len, axis = "y", opts = {}) {
    const [x, z] = this.w(lx, lz);
    const a = axis === "y" ? "y" : this.q & 1 ? (axis === "x" ? "z" : "x") : axis;
    this.kit.cyl(mat, x, ly, z, r, len, a, { color, ...opts });
  }
  tube(mat, color, a, b, r, opts = {}) {
    const [ax, az] = this.w(a[0], a[2]);
    const [bx, bz] = this.w(b[0], b[2]);
    this.B.tube(mat, color, [ax, a[1], az], [bx, b[1], bz], r, opts.segments || 8);
  }
  label(mat, name, l, normal, width, opts) {
    const [x, z] = this.w(l[0], l[2]);
    const [nx, nz] = this.dir(normal[0], normal[2]);
    label(this.kit, mat, name, [x, l[1], z], [nx, normal[1], nz], width, opts);
  }
  /** geometry tilted about its own x axis then yawed into the world (leaning ladders etc.) */
  add(mat, geo, l, tilt, opts = {}) {
    const [x, z] = this.w(l[0], l[2]);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (this.q * Math.PI) / 2);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt));
    this.kit.add(mat, geo, { pos: [x, l[1], z], quat: q, ...opts });
  }
  collider(lmin, lmax, tag) {
    const [ax, az] = this.w(lmin[0], lmin[2]);
    const [bx, bz] = this.w(lmax[0], lmax[2]);
    this.kit.collider([Math.min(ax, bx), lmin[1], Math.min(az, bz)], [Math.max(ax, bx), lmax[1], Math.max(az, bz)], tag);
  }
}

const F = FLOOR;

/** 1.2 m (default) crate on skids with corner posts and a lid frame; level stacks them */
function crate(P, lx, lz, s = 1.2, tone = "mid", level = 0, text = null) {
  const y0 = F + level * (s + 0.11);
  const color = tone === "dark" ? P.P.impDark : tone === "grey" ? P.P.impGrey : P.P.impMid;
  P.box("paintedMetal", color, lx, y0 + 0.08 + s / 2, lz, s, s, s, { texel: 1 });
  for (const d of [-1, 1]) P.box("metal", HG.gunmetal, lx + d * s * 0.35, y0 + 0.04, lz, 0.12, 0.08, s * 0.9);
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) P.box("metal", HG.gunmetal, lx + (dx * s) / 2, y0 + 0.08 + s / 2, lz + (dz * s) / 2, 0.09, s + 0.02, 0.09);
  P.box("paintedMetal", P.P.impDark, lx, y0 + 0.08 + s + 0.02, lz, s - 0.24, 0.04, s - 0.24, { texel: 1 });
  P.box("metal", HG.gunmetal, lx, y0 + 0.08 + s * 0.5, lz, s + 0.03, 0.06, s + 0.03);
  if (text) P.label("hgDecal", text, [lx, y0 + 0.08 + s * 0.72, lz - s / 2 - 0.006], [0, 0, -1], s * 0.62, { color: HG.white });
}

function drum(P, lx, lz, color) {
  P.kcyl("paintedMetal", color, lx, F + 0.45, lz, 0.3, 0.9, "y", { segments: 14, texel: 1 });
  for (const y of [0.28, 0.62]) P.cyl("metal", HG.steel, lx, F + y, lz, 0.315, 0.05, "y", { segments: 14 });
}

function toolCart(P, lx, lz) {
  P.box("paintedMetal", HG.red, lx, F + 0.575, lz, 1.1, 0.85, 0.6, { texel: 1 });
  for (const dx of [-0.45, 0.45]) for (const dz of [-0.22, 0.22]) P.cyl("metal", HG.gunmetal, lx + dx, F + 0.075, lz + dz, 0.075, 0.05, "x", { segments: 8 });
  for (let i = 0; i < 4; i++) {
    const y = F + 0.25 + i * 0.19;
    P.box("paintedMetal", P.P.impMid, lx, y, lz - 0.31, 1.0, 0.15, 0.02, { texel: 1 });
    P.box("metal", HG.steel, lx, y, lz - 0.335, 0.34, 0.03, 0.03);
  }
  P.box("metal", HG.gunmetal, lx, F + 1.02, lz, 1.14, 0.04, 0.64);
  P.box("metal", HG.steel, lx - 0.25, F + 1.08, lz + 0.05, 0.4, 0.08, 0.25);
  P.box("metal", HG.gunmetal, lx + 0.25, F + 1.07, lz - 0.1, 0.25, 0.06, 0.18);
  P.tube("metal", HG.steel, [lx + 0.6, F + 0.4, lz], [lx + 0.6, F + 1.0, lz], 0.025, { segments: 8 });
  P.tube("metal", HG.steel, [lx + 0.6, F + 1.0, lz - 0.28], [lx + 0.6, F + 1.0, lz + 0.28], 0.025, { segments: 8 });
}

/** ground power unit: dark cabinet on wheels, vents, indicator panel, a heavy cable on the deck */
function gpu(P, lx, lz, cableTo = null) {
  P.box("paintedMetal", P.P.impDark, lx, F + 0.77, lz, 1.5, 0.9, 0.95, { texel: 1 });
  for (const dx of [-0.55, 0.55]) for (const dz of [-0.38, 0.38]) P.cyl("metal", HG.gunmetal, lx + dx, F + 0.2, lz + dz, 0.2, 0.14, "x", { segments: 10 });
  for (let i = 0; i < 3; i++) P.box("paintedMetal", P.P.impBlack, lx + 0.76, F + 0.55 + i * 0.2, lz, 0.02, 0.1, 0.7, { texel: 1 });
  P.box("paintedMetal", P.P.impBlack, lx, F + 1.0, lz - 0.485, 0.6, 0.32, 0.02, { texel: 1 });
  P.box("emitBlue", 0xffffff, lx - 0.18, F + 1.05, lz - 0.5, 0.06, 0.06, 0.02);
  P.box("emitGreen", 0xffffff, lx - 0.06, F + 1.05, lz - 0.5, 0.06, 0.06, 0.02);
  P.box("emitAmber", 0xffffff, lx + 0.12, F + 0.93, lz - 0.5, 0.2, 0.04, 0.02);
  P.cyl("metal", HG.gunmetal, lx - 0.45, F + 1.4, lz + 0.2, 0.09, 0.36, "y", { segments: 10 });
  P.tube("metal", HG.steel, [lx - 0.75, F + 0.5, lz], [lx - 0.75, F + 1.05, lz], 0.025, { segments: 8 });
  if (cableTo) {
    P.tube("rubber", HG.rubber, [lx + 0.5, F + 0.6, lz + 0.48], [lx + 0.5, F + 0.06, lz + 1.1], 0.05, { segments: 8 });
    P.tube("rubber", HG.rubber, [lx + 0.5, F + 0.06, lz + 1.1], [cableTo[0], F + 0.06, cableTo[1]], 0.05, { segments: 8 });
  }
}

/** fuel bowser: tank trailer with pump cabinet, hose reel, beacon and tow bar (long axis local z) */
function bowser(P, lx, lz) {
  P.box("paintedMetal", P.P.impDark, lx, F + 0.68, lz, 2.0, 0.25, 4.4, { texel: 0.5 });
  for (const dx of [-1.05, 1.05]) for (const dz of [-1.45, 1.45]) {
    P.cyl("rubber", HG.rubber, lx + dx, F + 0.45, lz + dz, 0.45, 0.34, "x", { segments: 16 });
    P.cyl("metal", HG.steel, lx + dx, F + 0.45, lz + dz, 0.2, 0.38, "x", { segments: 10 });
  }
  P.kcyl("paintedMetal", P.P.impGrey, lx, F + 1.75, lz - 0.3, 0.95, 3.4, "z", { segments: 20, texel: 0.5 });
  for (const dz of [-2.05, 1.45]) P.cyl("metal", HG.gunmetal, lx, F + 1.75, lz + dz, 0.8, 0.14, "z", { segments: 20 });
  P.kcyl("hgHazard", 0xffffff, lx, F + 1.75, lz + 0.6, 0.965, 0.3, "z", { segments: 20, texel: 1 });
  for (const dx of [-0.92, 0.92]) for (const dz of [-1.2, 0.6]) P.box("metal", HG.gunmetal, lx + dx, F + 1.25, lz + dz, 0.12, 0.9, 0.16);
  P.cyl("metal", HG.gunmetal, lx, F + 2.72, lz - 0.3, 0.3, 0.24, "y", { segments: 14 });
  P.box("paintedMetal", P.P.impMid, lx, F + 1.36, lz + 2.0, 1.6, 1.1, 0.8, { texel: 1 });
  P.box("paintedMetal", P.P.impBlack, lx - 0.3, F + 1.4, lz + 2.41, 0.7, 0.5, 0.02, { texel: 1 });
  P.box("emitGreen", 0xffffff, lx - 0.5, F + 1.55, lz + 2.425, 0.06, 0.06, 0.02);
  P.box("emitRedImp", 0xffffff, lx - 0.38, F + 1.55, lz + 2.425, 0.06, 0.06, 0.02);
  P.box("screenImp1", 0xffffff, lx - 0.2, F + 1.32, lz + 2.425, 0.4, 0.22, 0.02, { fit: true });
  P.cyl("metal", HG.gunmetal, lx + 0.4, F + 2.25, lz + 2.0, 0.34, 0.3, "x", { segments: 16 });
  P.cyl("rubber", HG.rubber, lx + 0.4, F + 2.25, lz + 2.0, 0.28, 0.34, "x", { segments: 16 });
  P.box("metal", HG.gunmetal, lx + 0.4, F + 2.05, lz + 2.0, 0.08, 0.3, 0.4);
  P.box("metal", HG.gunmetal, lx - 0.5, F + 2.05, lz + 2.0, 0.08, 0.3, 0.08);
  P.box("emitAmber", 0xffffff, lx - 0.5, F + 2.3, lz + 2.0, 0.18, 0.2, 0.18);
  P.tube("metal", HG.steel, [lx, F + 0.62, lz - 2.2], [lx, F + 0.45, lz - 3.0], 0.05, { segments: 8 });
  P.cyl("metal", HG.gunmetal, lx, F + 0.16, lz - 3.0, 0.16, 0.12, "x", { segments: 10 });
  P.tube("metal", HG.steel, [lx, F + 0.45, lz - 3.0], [lx, F + 0.16, lz - 3.0], 0.03, { segments: 6 });
  P.label("hgDecal", "FUEL", [lx - 0.965, F + 1.85, lz - 0.3], [-1, 0, 0], 1.6, { color: HG.red });
  P.label("hgDecal", "FUEL", [lx + 0.965, F + 1.85, lz - 0.3], [1, 0, 0], 1.6, { color: HG.red });
}

function cableReel(P, lx, lz) {
  for (const dx of [-0.42, 0.42]) P.cyl("metal", HG.gunmetal, lx + dx, F + 0.95, lz, 0.75, 0.06, "x", { segments: 18 });
  P.cyl("rubber", HG.rubber, lx, F + 0.95, lz, 0.45, 0.8, "x", { segments: 16 });
  P.cyl("metal", HG.steel, lx, F + 0.95, lz, 0.05, 1.3, "x", { segments: 8 });
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) P.tube("metal", HG.gunmetal, [lx + dx * 0.6, F + 0.93, lz], [lx + dx * 0.72, F + 0.03, lz + dz * 0.55], 0.04, { segments: 8 });
  for (const dx of [-0.72, 0.72]) P.box("metal", HG.gunmetal, lx + dx, F + 0.03, lz, 0.14, 0.06, 1.3);
  P.tube("rubber", HG.rubber, [lx, F + 0.5, lz + 0.6], [lx, F + 0.05, lz + 1.8], 0.045, { segments: 8 });
}

/** mobile access platform: castored base, four posts, braces, grate at 2.9 m, rails, end ladder */
function accessPlatform(P, lx, lz) {
  P.box("paintedMetal", P.P.impDark, lx, F + 0.28, lz, 1.6, 0.12, 2.4, { texel: 0.5 });
  for (const dx of [-0.65, 0.65]) for (const dz of [-1.05, 1.05]) P.cyl("metal", HG.gunmetal, lx + dx, F + 0.11, lz + dz, 0.11, 0.08, "x", { segments: 10 });
  for (const dz of [-1.2, 1.2]) P.box("hgHazard", 0xffffff, lx, F + 0.28, lz + dz, 1.62, 0.13, 0.03, { texel: 1 });
  for (const dx of [-0.72, 0.72]) for (const dz of [-1.12, 1.12]) P.box("metal", HG.gunmetal, lx + dx, F + 1.84, lz + dz, 0.08, 3.0, 0.08);
  for (const dx of [-0.72, 0.72]) {
    P.tube("metal", HG.steel, [lx + dx, F + 0.4, lz - 1.1], [lx + dx, F + 2.8, lz + 1.1], 0.025, { segments: 6 });
    P.tube("metal", HG.steel, [lx + dx, F + 2.8, lz - 1.1], [lx + dx, F + 0.4, lz + 1.1], 0.025, { segments: 6 });
  }
  P.box("grate", 0xffffff, lx, F + 2.95, lz, 1.6, 0.1, 2.4, { texel: 0.8 });
  const y = F + 3.0;
  const [a, b] = P.w(lx - 0.76, lz - 1.16), [c, d] = P.w(lx + 0.76, lz - 1.16), [e, f] = P.w(lx + 0.76, lz + 1.16), [g, h] = P.w(lx - 0.76, lz + 1.16);
  railRun(P.B, P.kit, [a, b], [c, d], y, { collide: false, postEvery: 1.6 });
  railRun(P.B, P.kit, [c, d], [e, f], y, { collide: false, postEvery: 1.6 });
  railRun(P.B, P.kit, [g, h], [a, b], y, { collide: false, postEvery: 1.6 });
  // end ladder on the +lz face
  for (const dx of [-0.3, 0.3]) P.box("metal", HG.gunmetal, lx + dx, F + 1.7, lz + 1.32, 0.05, 2.7, 0.05);
  for (let yy = 0.6; yy < 3.0; yy += 0.3) P.box("metal", HG.steel, lx, F + yy, lz + 1.32, 0.6, 0.03, 0.03);
  P.box("emitWhite", 0xffffff, lx, F + 2.88, lz - 0.4, 0.5, 0.04, 0.2);
  P.box("paintedMetal", HG.red, lx + 0.4, F + 3.15, lz + 0.6, 0.5, 0.3, 0.3, { texel: 1 });
}

/** maintenance ladder with its foot at (lx, lz), leaning 14 deg toward -lz (its top lands 0.63 m back) */
function leanLadder(P, lx, lz, h = 2.6) {
  const g = new Batch();
  for (const dx of [-0.22, 0.22]) g.box(dx, h / 2, 0, 0.05, h, 0.04);
  for (let y = 0.3; y < h; y += 0.3) g.box(0, y, 0, 0.44, 0.03, 0.03);
  P.add("metal", g.geometry(), [lx, F, lz], -0.245, { color: HG.gunmetal, uv: "keep" });
}

// cluster definitions: [x, z, quarter turn, builder, local collider min/max]
function clusters(s) {
  const q0 = s > 0 ? 0 : 2;
  return [
    // under the racks, forward end (z -7..5): bowser + power cart + crates
    { x: s * 64, z: -1, q: q0, cmin: [-3.2, -3.3], cmax: [3.6, 3.3], f(P) { bowser(P, -1.7, 0.2); gpu(P, 1.8, -1.9, [3.3, 2.4]); crate(P, 1.7, 1.3, 1.2, "mid", 0, "CAUTION"); crate(P, 1.7, 1.3, 1.2, "dark", 1); crate(P, 3.0, 1.4, 1.0, "grey"); } },
    // under the racks, aft of the stairs (z 36..48): crate stack + tool carts + drums
    { x: s * 66, z: 42, q: q0 + 1, cmin: [-3.4, -2.2], cmax: [3.4, 2.4], f(P) { crate(P, -2.2, 0.3); crate(P, -2.2, 0.3, 1.2, "dark", 1); crate(P, -0.9, 0.3, 1.2, "grey", 0, "DECK 4"); crate(P, -2.2, -1.0, 1.0, "mid"); toolCart(P, 1.0, -0.6); drum(P, 2.4, 0.4, HG.red); drum(P, 2.4, -0.4, P.P.impGrey); drum(P, 3.0, 0.0, P.P.impGrey); leanLadder(P, -2.2, 1.56); } },
    // under the racks, aft end (z 56..66): access platform + cable reel + crates
    { x: s * 65, z: 61, q: q0, cmin: [-3.6, -3.0], cmax: [3.4, 3.0], f(P) { accessPlatform(P, -2.2, 0); cableReel(P, 1.2, -1.6); crate(P, 1.6, 1.4, 1.2, "dark", 0, "FUEL"); crate(P, 2.8, 1.5, 1.0, "mid"); gpu(P, 2.6, -1.2); } },
    // bow wall corner (behind pad 05/06): crates + drums
    { x: s * 45, z: -64, q: q0 + 3, cmin: [-2.8, -2.4], cmax: [2.8, 2.4], f(P) { crate(P, -1.6, 0, 1.2, "mid", 0, "CAUTION"); crate(P, -0.3, 0, 1.2, "dark"); crate(P, -0.3, 0, 1.2, "mid", 1); crate(P, -1.6, 1.3, 1.0, "grey"); drum(P, 1.4, -0.6, HG.red); drum(P, 1.4, 0.3, HG.red); toolCart(P, 2.2, 1.0); } },
    // aft apron, forward of the cargo/repair doors (z 98..108): bowser + crates
    { x: s * 66, z: 103, q: q0, cmin: [-3.2, -3.4], cmax: [3.2, 3.4], f(P) { bowser(P, 1.2, 0.3); crate(P, -1.6, -1.6, 1.2, "grey", 0, "FUEL"); crate(P, -1.6, -0.3, 1.2, "dark"); crate(P, -1.6, -0.3, 1.2, "mid", 1); drum(P, -1.8, 1.4, P.P.impGrey); drum(P, -1.0, 1.6, P.P.impGrey); } },
    // aft apron, aft of the doors (z 134..146): access platform + power cart + tool cart
    { x: s * 66, z: 140, q: q0 + 2, cmin: [-3.4, -3.2], cmax: [3.4, 3.2], f(P) { accessPlatform(P, 1.8, -0.4); gpu(P, -1.6, 1.4, [-3.0, 2.8]); toolCart(P, -1.6, -1.4); crate(P, -0.2, -1.6, 1.0, "mid"); cableReel(P, -1.0, 0.0); } },
    // aft wall corner (z 156..164)
    { x: s * 60, z: 160, q: q0 + 1, cmin: [-3.0, -2.2], cmax: [3.0, 2.2], f(P) { crate(P, -1.8, 0); crate(P, -0.5, 0, 1.2, "dark", 0, "DECK 4"); crate(P, -1.8, 0, 1.2, "grey", 1); crate(P, 1.2, -0.4, 1.0, "mid"); drum(P, 2.4, 0.6, HG.red); leanLadder(P, -1.8, 1.26); } },
    // ahead of the spawn, either side of the aft door approach (z 147..152): close-range scale references
    { x: s * 8.5, z: 149.5, q: s > 0 ? 3 : 1, cmin: [-2.6, -1.6], cmax: [2.6, 1.6], f(P) { if (s > 0) { gpu(P, -0.9, 0, [0.4, -1.5]); drum(P, 1.3, -0.5, HG.red); drum(P, 1.3, 0.4, P.P.impGrey); crate(P, 2.2, 0.2, 1.0, "mid"); } else { toolCart(P, -1.4, 0.3); crate(P, 0.3, 0, 1.2, "dark", 0, "CAUTION"); crate(P, 0.3, 0, 1.2, "mid", 1); crate(P, 1.6, 0.1, 1.0, "grey"); } } },
  ];
}

export function buildClutter(ctx) {
  const { kit } = ctx;
  const B = new Batcher(kit);
  for (const s of [-1, 1]) {
    for (const c of clusters(s)) {
      const P = new Placer(ctx, B, c.x, c.z, c.q);
      c.f(P);
      P.collider([c.cmin[0], FLOOR, c.cmin[1]], [c.cmax[0], FLOOR + 3.4, c.cmax[1]], "clutter");
    }
  }
  B.flush();
}
