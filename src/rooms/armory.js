// Armory & Equipment Storage (Deck C): a caged quartermaster booth with an issue window beside the blast
// door (red "armed" beacon over the cage), a heavy floor grating down the central aisle, rifle racks
// along the walls, a kit-issue table, four armour stands under a white track-light rig in front of a mesh
// screen (the hero), power-cell cages with glowing cells, hazard-striped charge lockers and a maintenance
// bench with a pegboard on the east wall. Dark ribbed wall variant (narrow grey-dark panels, vents/conduits).
// Orange accent; amber slot pools over the aisle, white on the armour and the bench, cool white in the vestibule.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { impRoomShell, impConsole, impChair, impWallGear } from "./imperial_kit.js";
import { rng } from "../kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { Placer, compound, B, C, DECK_C, slotLight, cameraHousing, cableRun, wallSign, statusUnit, hoodLamp, crateStack, rifleRack, rifleGeo, helmet, boots, floorGrate, floorStripe, keyLight, rod, tube } from "./deck_c_kit.js";
import { lux } from "./imperial_kit.js";

const ACCENT = "emitOrange";
const WORK = "emitAmber";
const WHITE = PALETTE.impWhite;
const BLK = PALETTE.impBlack;
const CHR = PALETTE.impCharcoal;
const GD = PALETTE.impGreyDark;
const GREY = PALETTE.impGrey;
const STEEL = DECK_C.steel;
const ORANGE = DECK_C.orange;

function floorDecal(kit, index, x, z, size, yaw = 0, y = 0.008) {
  kit.add("decalImp", new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), { pos: [x, y, z], rot: [0, yaw, 0], uv: "keep", uvRect: impDecalRect(index) });
}

/**
 * Mesh cage wall from (x0,z0) to (x1,z1): posts, kick plate, top rail, vertical bars every 12 cm and
 * horizontal bars every 40 cm, optional framed window / gate section {u0,u1,v0,v1}. Local x runs along the wall.
 */
function cageWall(kit, x0, z0, x1, z1, h, opts = {}) {
  const { window = null, gate = null, postStep = 1.7, barStep = 0.12, rowStep = 0.4, kick = 0.25, color = GD } = opts;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const p = new Placer(kit, x0, 0, z0, Math.atan2(-dz, dx));
  const nPosts = Math.max(1, Math.round(len / postStep));
  for (let i = 0; i <= nPosts; i++) p.box("impTrim", (i / nPosts) * len, h / 2, 0, 0.08, h, 0.08, { color: BLK, texel: 1 });
  p.box("impTrim", len / 2, h - 0.03, 0, len, 0.06, 0.09, { color: BLK, texel: 1 });
  p.box(ACCENT, len / 2, h - 0.03, 0.05, len - 0.2, 0.02, 0.005);
  p.box("impTrim", len / 2, kick / 2, 0, len, kick, 0.07, { color: BLK, texel: 1 });
  const inWin = (u, v) => window && u > window.u0 && u < window.u1 && v > window.v0 && v < window.v1;
  for (let u = barStep; u < len - barStep / 2; u += barStep) {
    if (window && u > window.u0 && u < window.u1) {
      p.box("impMetal", u, (kick + window.v0) / 2, 0, 0.014, window.v0 - kick, 0.014, { color });
      p.box("impMetal", u, (window.v1 + h - 0.06) / 2, 0, 0.014, h - 0.06 - window.v1, 0.014, { color });
    } else p.box("impMetal", u, (kick + h - 0.06) / 2, 0, 0.014, h - 0.06 - kick, 0.014, { color });
  }
  for (let v = kick + rowStep; v < h - 0.1; v += rowStep) {
    if (window && v > window.v0 && v < window.v1) {
      p.box("impMetal", window.u0 / 2, v, 0.009, window.u0, 0.012, 0.012, { color });
      p.box("impMetal", (window.u1 + len) / 2, v, 0.009, len - window.u1, 0.012, 0.012, { color });
    } else p.box("impMetal", len / 2, v, 0.009, len, 0.012, 0.012, { color });
  }
  if (window) {
    const { u0, u1, v0, v1 } = window;
    p.box("impTrim", (u0 + u1) / 2, v0, 0, u1 - u0 + 0.06, 0.06, 0.12, { color: BLK });
    p.box("impTrim", (u0 + u1) / 2, v1, 0, u1 - u0 + 0.06, 0.06, 0.12, { color: BLK });
    for (const u of [u0, u1]) p.box("impTrim", u, (v0 + v1) / 2, 0, 0.06, v1 - v0, 0.12, { color: BLK });
    if (inWin((u0 + u1) / 2, (v0 + v1) / 2)) p.box(ACCENT, (u0 + u1) / 2, v1 - 0.045, 0.065, u1 - u0 - 0.1, 0.015, 0.005);
  }
  if (gate) {
    const { u0, u1 } = gate;
    p.box("impTrim", (u0 + u1) / 2, (kick + h) / 2, 0.02, u1 - u0, h - kick - 0.06, 0.05, { color: BLK, texel: 1 });
    for (let u = u0 + 0.1; u < u1 - 0.05; u += 0.1) p.box("impMetal", u, (kick + h - 0.06) / 2, 0.045, 0.02, h - kick - 0.1, 0.02, { color: STEEL });
    for (const v of [0.6, 1.4, 2.2]) p.box("impMetal", u0 - 0.02, v, 0.05, 0.06, 0.12, 0.08, { color: STEEL });
    p.box("impTrim", u1 - 0.14, 1.1, 0.06, 0.16, 0.24, 0.08, { color: BLK });
    p.box("emitRedImp", u1 - 0.14, 1.16, 0.105, 0.05, 0.03, 0.005);
    p.box("impMetal", u1 - 0.14, 1.02, 0.11, 0.1, 0.03, 0.03, { color: STEEL });
    p.decal(IMP_DECAL.restricted, (u0 + u1) / 2, 1.8, 0.06, 0.34);
  }
  p.collider(-0.05, 0, -0.07, len + 0.05, h, 0.07, "cage");
  return p;
}

/** Armour stand: post + T-bar with a plated white armour set (original design) facing local -z; helmet on top. */
function armourStand(kit, x, z, yaw, opts = {}) {
  const p = new Placer(kit, x, 0, z, yaw);
  const col = opts.color || WHITE;
  p.box("impTrim", 0, 0.05, 0, 0.7, 0.1, 0.7, { color: BLK, texel: 1 });
  p.box(ACCENT, 0, 0.1, 0, 0.5, 0.01, 0.5);
  p.cyl("impMetal", 0, 0.95, 0, 0.03, 1.7, "y", { color: GD, segments: 8 });
  p.box("impMetal", 0, 1.6, 0, 0.56, 0.04, 0.04, { color: GD });
  // legs: shin + thigh plates, boots
  for (const s of [-1, 1]) {
    p.box("impPanel1", s * 0.12, 0.5, 0, 0.15, 0.44, 0.17, { color: col, uv: "world", texel: 2 });
    p.box("impTrim", s * 0.12, 0.74, 0, 0.13, 0.06, 0.15, { color: BLK });
    p.box("impPanel1", s * 0.13, 0.93, 0.0, 0.17, 0.32, 0.19, { color: col, uv: "world", texel: 2 });
  }
  const bp = p.pos(0, 0, 0.02);
  boots(kit, bp.x, bp.z, yaw);
  // belt with pouches, abdomen, chest + back plates, shoulder pads, upper arms
  p.box("impTrim", 0, 1.12, 0, 0.46, 0.08, 0.26, { color: BLK });
  for (const dx of [-0.14, 0, 0.14]) p.box("impPanel1", dx, 1.11, -0.15, 0.1, 0.07, 0.05, { color: GREY, uv: "world", texel: 3 });
  p.box("impPanel1", 0, 1.22, 0, 0.38, 0.14, 0.22, { color: GREY, uv: "world", texel: 2 });
  p.box("impPanel1", 0, 1.43, -0.02, 0.46, 0.36, 0.24, { color: col, uv: "world", texel: 2 });
  p.box("impTrim", 0, 1.43, -0.145, 0.02, 0.3, 0.01, { color: BLK });
  p.box("impTrim", 0, 1.3, -0.145, 0.3, 0.02, 0.01, { color: BLK });
  p.box("impTrim", 0.12, 1.5, -0.145, 0.1, 0.06, 0.012, { color: BLK });
  p.box(opts.ledKey || "emitGreen", 0.12, 1.5, -0.152, 0.03, 0.02, 0.005);
  p.box("impPanel1", 0, 1.42, 0.12, 0.4, 0.4, 0.06, { color: col, uv: "world", texel: 2 });
  p.box("impTrim", 0, 1.42, 0.16, 0.2, 0.2, 0.03, { color: BLK });
  for (const s of [-1, 1]) {
    p.box("impPanel1", s * 0.31, 1.6, 0, 0.2, 0.09, 0.26, { color: col, uv: "world", texel: 2, roll: -s * 0.35 });
    p.box("impPanel1", s * 0.32, 1.38, 0, 0.13, 0.3, 0.15, { color: col, uv: "world", texel: 2 });
    p.box("impTrim", s * 0.32, 1.2, 0, 0.1, 0.06, 0.12, { color: BLK });
  }
  const hp = p.pos(0, 0, 0);
  helmet(kit, hp.x, 1.68, hp.z, yaw, { color: col });
  p.collider(-0.42, 0, -0.32, 0.42, 2.05, 0.32, "armour");
}

/** Power-cell charging cage: framed mesh box on a plinth, three shelves of cells with glowing amber caps, status panel. Faces +z. */
function cellCage(kit, ctx, x, z, yaw, opts = {}) {
  const { seed = 1, w = 1.3, d = 0.8, h = 1.9 } = opts;
  const rand = rng(seed);
  const p = new Placer(kit, x, 0, z, yaw);
  p.box("impTrim", 0, 0.08, 0, w, 0.16, d, { color: BLK, texel: 1 });
  p.box("impTrim", 0, h - 0.05, 0, w, 0.1, d, { color: BLK, texel: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box("impTrim", sx * (w / 2 - 0.03), h / 2, sz * (d / 2 - 0.03), 0.06, h, 0.06, { color: BLK, texel: 1 });
  p.box("impPanel2", 0, h / 2, -d / 2 + 0.03, w - 0.12, h - 0.26, 0.02, { color: CHR, uv: "world", texel: 1 });
  // mesh on front and sides
  for (let u = -w / 2 + 0.12; u < w / 2 - 0.06; u += 0.11) p.box("impMetal", u, h / 2, d / 2 - 0.02, 0.012, h - 0.26, 0.012, { color: GD });
  for (let v = 0.4; v < h - 0.1; v += 0.36) p.box("impMetal", 0, v, d / 2 - 0.01, w - 0.12, 0.012, 0.012, { color: GD });
  for (const s of [-1, 1]) {
    for (let u = -d / 2 + 0.12; u < d / 2 - 0.06; u += 0.11) p.box("impMetal", s * (w / 2 - 0.02), h / 2, u, 0.012, h - 0.26, 0.012, { color: GD });
    for (let v = 0.4; v < h - 0.1; v += 0.36) p.box("impMetal", s * (w / 2 - 0.01), v, 0, 0.012, 0.012, d - 0.12, { color: GD });
  }
  // door frame, hinges, latch light
  p.box("impTrim", 0, h / 2, d / 2 + 0.005, w - 0.1, h - 0.26, 0.03, { color: BLK, texel: 1 });
  p.box("impPanel2", 0, h / 2, d / 2 + 0.01, w - 0.22, h - 0.38, 0.01, { color: CHR, uv: "world", texel: 1 });
  for (let u = -w / 2 + 0.17; u < w / 2 - 0.12; u += 0.11) p.box("impMetal", u, h / 2, d / 2 + 0.03, 0.012, h - 0.4, 0.012, { color: STEEL });
  for (const v of [0.5, 1.4]) p.box("impMetal", -w / 2 + 0.08, v, d / 2 + 0.03, 0.05, 0.1, 0.05, { color: STEEL });
  p.box("impTrim", w / 2 - 0.16, 1.0, d / 2 + 0.04, 0.12, 0.2, 0.05, { color: BLK });
  p.box("emitRedImp", w / 2 - 0.16, 1.05, d / 2 + 0.068, 0.04, 0.03, 0.005);
  // cells on three shelves: charcoal drums with amber caps and a glowing band, some slots empty
  for (const y of [0.22, 0.75, 1.28]) {
    p.box("impMetal", 0, y, 0, w - 0.14, 0.03, d - 0.14, { color: GD });
    for (let k = 0; k < 5; k++) {
      if (rand() < 0.2) continue;
      const cx = -w / 2 + 0.2 + k * ((w - 0.4) / 4);
      const cz = (rand() - 0.5) * 0.1;
      p.cyl("impMetal", cx, y + 0.19, cz, 0.07, 0.34, "y", { color: CHR, segments: 12 });
      p.cyl(WORK, cx, y + 0.375, cz, 0.05, 0.03, "y", { segments: 12 });
      p.cyl(WORK, cx, y + 0.12, cz, 0.072, 0.02, "y", { segments: 12 });
      p.box("impTrim", cx, y + 0.24, cz + 0.06, 0.05, 0.1, 0.03, { color: BLK });
    }
  }
  // status panel on the top rail: screen + a sliding charge bar (animated), power stencil, cable to the wall
  p.box("impTrim", 0, h + 0.02, d / 2 - 0.1, w - 0.3, 0.26, 0.2, { color: BLK, texel: 1 });
  p.screen("scrAmber1", -0.22, h + 0.04, d / 2 + 0.005, 0.5, 0.16, "+z");
  p.decal(IMP_DECAL.power, 0.3, h + 0.04, d / 2 + 0.005, 0.16);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.01), ctx.materials.emitAmber);
  const bp = p.pos(-0.42, h + 0.04, d / 2 + 0.012);
  bar.position.copy(bp);
  bar.quaternion.copy(p.quat());
  kit.attach(bar);
  const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(p.quat());
  let s = rand();
  kit.onUpdate((dt) => {
    s = (s + dt * 0.25) % 1;
    bar.position.copy(bp).addScaledVector(axis, s * 0.4);
  });
  p.collider(-w / 2 - 0.02, 0, -d / 2 - 0.02, w / 2 + 0.02, h + 0.16, d / 2 + 0.08, "cellcage");
  return p;
}

/** Heavy charge locker with hazard band, keypad and blast hinges. Faces +z. */
function heavyLocker(kit, x, z, yaw, opts = {}) {
  const { seed = 1, w = 0.9, h = 2.0, d = 0.6 } = opts;
  const rand = rng(seed);
  const p = new Placer(kit, x, 0, z, yaw);
  p.box("impTrim", 0, h / 2, 0, w, h, d, { color: BLK, texel: 1 });
  p.box("impMetal", 0, h + 0.03, 0, w + 0.04, 0.06, d + 0.04, { color: CHR, texel: 1 });
  p.box("impPanel1", 0, h / 2 + 0.02, d / 2 + 0.014, w - 0.1, h - 0.3, 0.028, { color: GD, uv: "world", texel: 1 });
  p.box("chevronY", 0, h - 0.3, d / 2 + 0.03, w - 0.14, 0.12, 0.006, { texel: 3 });
  p.decal(IMP_DECAL.hazard, -0.08, 1.15, d / 2 + 0.03, 0.36);
  p.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.glyphs3][seed % 3], 0, 0.5, d / 2 + 0.03, 0.22);
  p.box("impTrim", w / 2 - 0.16, 1.3, d / 2 + 0.035, 0.14, 0.2, 0.02, { color: BLK });
  p.screen(rand() < 0.5 ? "scrRed1" : "scrAmber1", w / 2 - 0.16, 1.34, d / 2 + 0.047, 0.1, 0.06, "+z");
  p.box(rand() < 0.7 ? "emitRedImp" : "emitGreen", w / 2 - 0.16, 1.24, d / 2 + 0.047, 0.03, 0.02, 0.005);
  p.box("impMetal", w / 2 - 0.16, 0.95, d / 2 + 0.05, 0.03, 0.22, 0.03, { color: STEEL });
  for (const v of [0.4, 1.0, 1.6]) p.box("impMetal", -w / 2 + 0.06, v, d / 2 + 0.035, 0.07, 0.14, 0.05, { color: STEEL });
  for (let k = 0; k < 4; k++) p.box("impMetal", 0, 0.26 + k * 0.05, d / 2 + 0.03, w * 0.5, 0.014, 0.008, { color: CHR });
  p.box(ACCENT, 0, h - 0.1, d / 2 + 0.03, w - 0.3, 0.02, 0.006);
  p.collider(-w / 2 - 0.02, 0, -d / 2, w / 2 + 0.02, h + 0.06, d / 2 + 0.06, "locker");
}

/** Maintenance bench: steel top with a rubber mat, vise, tools, parts bins, a field-stripped rifle, magnifier lamp. Front is +z. */
function workBench(kit, x, z, yaw, len) {
  const p = new Placer(kit, x, 0, z, yaw);
  const dpt = 0.8;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box("impTrim", sx * (len / 2 - 0.08), 0.42, sz * (dpt / 2 - 0.08), 0.08, 0.84, 0.08, { color: BLK });
  p.box("impTrim", 0, 0.86, 0, len, 0.06, dpt, { color: BLK, texel: 1 });
  p.box("impMetal", 0, 0.905, 0, len + 0.02, 0.03, dpt + 0.02, { color: STEEL, texel: 1 });
  p.box("rubber", 0, 0.93, 0.05, len - 0.6, 0.02, 0.5, { color: CHR, texel: 1 });
  p.box("impMetal", 0, 0.3, 0, len - 0.2, 0.03, dpt - 0.2, { color: GD, texel: 1 });
  p.box("impPanel1", -len / 4, 0.44, 0, 0.6, 0.26, 0.5, { color: GD, uv: "world", texel: 1 });
  p.box("impPanel1", len / 4 - 0.2, 0.42, -0.05, 0.5, 0.22, 0.4, { color: GREY, uv: "world", texel: 1 });
  p.box(ACCENT, 0, 0.84, dpt / 2 + 0.005, len - 0.4, 0.015, 0.005);
  // vise
  p.box("impMetal", -len / 2 + 0.5, 0.98, 0.15, 0.22, 0.12, 0.16, { color: CHR });
  p.box("impMetal", -len / 2 + 0.5, 1.06, 0.15, 0.24, 0.05, 0.06, { color: STEEL });
  p.box("impMetal", -len / 2 + 0.5, 1.06, 0.25, 0.24, 0.05, 0.05, { color: STEEL });
  p.cyl("impMetal", -len / 2 + 0.5, 1.0, 0.36, 0.01, 0.26, "x", { color: STEEL, segments: 6 });
  // field-stripped rifle on the mat + loose parts
  const rq = p.quat(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.25));
  const rp = p.pos(0.3, 1.0, 0.05);
  kit.instance("dc_rifle", "impMetal", rifleGeo, new THREE.Matrix4().compose(rp, rq, new THREE.Vector3(1, 1, 1)), 0xffffff);
  p.cyl("impMetal", 0.4, 0.96, 0.3, 0.02, 0.36, "x", { color: GD, segments: 8 });
  p.cyl("impMetal", -0.2, 0.96, -0.2, 0.022, 0.24, "x", { color: BLK, segments: 8 });
  p.box("impTrim", 0.9, 0.98, -0.15, 0.08, 0.1, 0.05, { color: BLK });
  // tools scattered: drivers, a hammer, a scanner
  for (let k = 0; k < 4; k++) p.cyl("impMetal", -0.9 + k * 0.1, 0.955, 0.25 + (k % 2) * 0.04, 0.008, 0.2, "z", { color: k % 2 ? STEEL : BLK, segments: 6 });
  p.box("impMetal", 1.2, 0.97, 0.22, 0.09, 0.06, 0.05, { color: CHR });
  p.cyl("impMetal", 1.2, 0.96, 0.02, 0.012, 0.3, "z", { color: GD, segments: 6 });
  p.box("impGloss", -1.0, 0.955, -0.15, 0.16, 0.03, 0.1);
  p.screen("scrAmber0", -1.0, 0.972, -0.15, 0.12, 0.07, "up");
  // parts bins along the back edge
  for (let k = 0; k < 5; k++) p.box("impPanel1", -len / 2 + 0.5 + k * 0.5, 1.0, -0.3, 0.42, 0.16, 0.2, { color: k % 2 ? ORANGE : GD, uv: "world", texel: 2 });
  for (let k = 0; k < 5; k++) p.box("impTrim", -len / 2 + 0.5 + k * 0.5, 1.09, -0.3, 0.38, 0.02, 0.16, { color: BLK });
  // magnifier lamp on an articulated arm
  p.cyl("impMetal", len / 2 - 0.4, 1.2, -0.32, 0.02, 0.6, "y", { color: GD, segments: 8 });
  const a0 = p.pos(len / 2 - 0.4, 1.5, -0.32);
  const a1 = p.pos(len / 2 - 0.9, 1.7, 0.0);
  const a2 = p.pos(len / 2 - 1.3, 1.35, 0.1);
  rod(kit, "impMetal", [a0.x, a0.y, a0.z], [a1.x, a1.y, a1.z], 0.015, { color: GD });
  rod(kit, "impMetal", [a1.x, a1.y, a1.z], [a2.x, a2.y, a2.z], 0.015, { color: GD });
  p.cyl("impTrim", len / 2 - 1.3, 1.3, 0.1, 0.12, 0.06, "y", { color: BLK, segments: 14 });
  p.cyl("emitWhite", len / 2 - 1.3, 1.265, 0.1, 0.09, 0.012, "y", { segments: 14, uv: "keep" });
  p.collider(-len / 2 - 0.02, 0, -dpt / 2 - 0.02, len / 2 + 0.02, 1.0, dpt / 2 + 0.04, "bench");
  return p;
}

/** Kit-issue table: helmets, chest plates, belts and datapads laid out on a black-framed table. Long axis local x. */
function issueTable(kit, x, z, yaw, len) {
  const p = new Placer(kit, x, 0, z, yaw);
  const dpt = 1.0;
  p.box("impTrim", 0, 0.82, 0, len, 0.06, dpt, { color: BLK, texel: 1 });
  p.box("impMetal", 0, 0.86, 0, len - 0.04, 0.02, dpt - 0.04, { color: GREY, texel: 1 });
  for (const s of [-1, 1]) {
    p.box("impTrim", s * (len / 2 - 0.4), 0.4, 0, 0.1, 0.8, 0.7, { color: BLK, texel: 1 });
    p.box(ACCENT, s * (len / 2 - 0.4), 0.4, 0, 0.11, 0.4, 0.03);
  }
  p.box("impMetal", 0, 0.1, 0, len - 0.8, 0.06, 0.5, { color: CHR, texel: 1 });
  const hp1 = p.pos(-len / 2 + 0.5, 0, 0.2);
  const hp2 = p.pos(len / 2 - 0.5, 0, -0.2);
  helmet(kit, hp1.x, 0.87, hp1.z, yaw + 0.4);
  helmet(kit, hp2.x, 0.87, hp2.z, yaw - 0.6);
  for (const dx of [-0.6, 0.2]) {
    p.box("impPanel1", dx, 0.94, -0.15, 0.46, 0.14, 0.4, { color: WHITE, uv: "world", texel: 2 });
    p.box("impTrim", dx, 1.0, -0.15, 0.02, 0.03, 0.34, { color: BLK });
  }
  for (const dz of [0.22, 0.34]) p.box("impTrim", 0.6, 0.895, dz, 0.9, 0.05, 0.08, { color: BLK });
  for (let k = 0; k < 3; k++) p.box("impPanel1", 0.3 + k * 0.28, 0.9, 0.22, 0.1, 0.07, 0.06, { color: GREY, uv: "world", texel: 3 });
  p.box("impGloss", -1.0, 0.878, 0.3, 0.22, 0.015, 0.15);
  p.screen("scrAmber0", -1.0, 0.888, 0.3, 0.18, 0.11, "up");
  p.box("impGloss", 1.1, 0.878, 0.35, 0.22, 0.015, 0.15);
  p.screen("scrWhite0", 1.1, 0.888, 0.35, 0.18, 0.11, "up");
  p.collider(-len / 2, 0, -dpt / 2, len / 2, 0.9, dpt / 2, "table");
}

/** Parts shelving: open rack with orange bins, grey boxes and spare cells. Faces +z. */
function partsShelf(kit, x, z, yaw, seed) {
  const rand = rng(seed);
  const p = new Placer(kit, x, 0, z, yaw);
  const w = 1.5;
  const d = 0.7;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box("impTrim", sx * (w / 2 - 0.03), 1.15, sz * (d / 2 - 0.03), 0.06, 2.3, 0.06, { color: BLK });
  for (const y of [0.25, 0.85, 1.45, 2.05]) {
    p.box("impMetal", 0, y, 0, w - 0.04, 0.04, d - 0.04, { color: GD, texel: 1 });
    p.box(ACCENT, 0, y - 0.01, d / 2 - 0.01, w - 0.2, 0.012, 0.006);
    const n = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const cx = -w / 2 + 0.15 + (k + 0.5) * ((w - 0.3) / n);
      const kind = rand();
      if (kind < 0.45) p.box("impPanel1", cx, y + 0.13, (rand() - 0.5) * 0.15, 0.36, 0.22, 0.42, { color: ORANGE, uv: "world", texel: 2 });
      else if (kind < 0.8) p.box("impPanel1", cx, y + 0.16, (rand() - 0.5) * 0.15, 0.32, 0.28, 0.32, { color: rand() < 0.5 ? GD : GREY, uv: "world", texel: 2 });
      else {
        p.cyl("impMetal", cx, y + 0.19, 0, 0.07, 0.34, "y", { color: CHR, segments: 12 });
        p.cyl(WORK, cx, y + 0.375, 0, 0.05, 0.03, "y", { segments: 12 });
      }
    }
  }
  p.decal(IMP_DECAL.glyphs2, -w / 2 + 0.2, 2.2, d / 2 + 0.02, 0.2);
  p.collider(-w / 2 - 0.02, 0, -d / 2, w / 2 + 0.02, 2.3, d / 2 + 0.02, "shelf");
}

export function buildArmory(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = ACCENT;
  const walls = impRoomShell(kit, room, ctx.doors, {
    seed: 7404,
    accentKey,
    // wall variant: narrow dark ribbed panels (grey-dark / charcoal), heavy on vents and conduit, no bare wall light slots
    wall: { panelW: 1.2, bands: [1.15], features: { vent: 0.16, equipment: 0.1, conduit: 0.16, light: 0, screen: 0.03 }, altChance: 0.35, panelColor: GD, panelColorAlt: GREY, accent: ORANGE },
    floor: { lane: false },
    // ceiling troughs unlit: the armour rig is the only white in the room, the aisle slots are amber
    ceiling: { troughs: 2, troughW: 0.5, beamStep: 4.4, withLights: false },
  });
  const N = walls.N.frame; // u = x + hx
  const S = walls.S.frame; // u = hx - x
  const E = walls.E.frame; // u = z + hz
  const W = walls.W.frame; // u = hz - z

  // ---------------------------------------------------------------- central aisle: heavy grating in 2 m panels, edge stripes
  for (let x = -8.6; x < 13.4; x += 2.0) floorGrate(kit, x, -1.0, Math.min(x + 2.0, 13.4), 1.0);
  floorStripe(kit, -8.6, -1.2, 13.4, -1.2, 0.12, "chevronY", 0.016);
  floorStripe(kit, -8.6, 1.2, 13.4, 1.2, 0.12, "chevronY", 0.016);
  floorDecal(kit, IMP_DECAL.arrowRight, -7.2, 0, 0.7, 0, 0.04);
  floorDecal(kit, IMP_DECAL.keepClear, 12.4, 0, 0.7, -Math.PI / 2, 0.04);

  // ---------------------------------------------------------------- quartermaster booth: cage with issue window + gate, red beacon
  {
    const bx0 = -hx + 0.42;
    const bx1 = -9.6;
    const bz0 = -2.6;
    const bz1 = -hz + 0.42;
    cageWall(kit, bx0, bz0, bx1, bz0, 2.7, { window: { u0: 1.4, u1: 3.8, v0: 1.0, v1: 1.95 } });
    cageWall(kit, bx1, bz0, bx1, bz1, 2.7, { gate: { u0: 0.5, u1: 1.7 } });
    // counter through the window, datapad, stamp, comm unit; "wait here" line and stencil outside
    const cx = bx0 + 2.6;
    kit.box("impTrim", cx, 0.96, bz0, 2.5, 0.08, 0.7, { color: BLK, texel: 1 });
    kit.box("impMetal", cx, 1.025, bz0, 2.54, 0.05, 0.74, { color: STEEL, texel: 1 });
    kit.box("impTrim", cx, 0.5, bz0 - 0.2, 2.4, 0.9, 0.3, { color: BLK, texel: 1 });
    kit.box("impPanel1", cx, 0.5, bz0 - 0.36, 2.3, 0.7, 0.02, { color: GD, uv: "world", texel: 1 });
    kit.box("impGloss", cx - 0.6, 1.058, bz0 + 0.1, 0.22, 0.015, 0.15);
    kit.add("scrAmber0", new THREE.PlaneGeometry(0.18, 0.11).rotateX(-Math.PI / 2), { pos: [cx - 0.6, 1.068, bz0 + 0.1], uv: "keep" });
    kit.box("impTrim", cx + 0.7, 1.13, bz0 - 0.15, 0.24, 0.16, 0.16, { color: BLK });
    kit.box("emitGreen", cx + 0.7, 1.17, bz0 - 0.065, 0.04, 0.03, 0.005);
    kit.cyl("impMetal", cx + 0.2, 1.09, bz0 - 0.2, 0.03, 0.08, "y", { color: GD, segments: 8 });
    kit.box("chevronY", cx, 0.02, bz0 + 1.0, 2.6, 0.008, 0.1, { texel: 3 });
    floorDecal(kit, IMP_DECAL.keepClear, cx, bz0 + 1.6, 0.6, Math.PI);
    // beacon over the window: housing, rotating red lens pair (animated), ARMED strip, restricted stencil
    kit.box("impTrim", cx, 2.86, bz0, 0.9, 0.3, 0.3, { color: BLK, texel: 1 });
    kit.box("scrRed0", cx, 2.86, bz0 + 0.155, 0.7, 0.14, 0.01, { uv: "keep" });
    kit.box("scrRed0", cx, 2.86, bz0 - 0.155, 0.7, 0.14, 0.01, { uv: "keep" });
    kit.cyl("impTrim", cx, 3.06, bz0, 0.16, 0.1, "y", { color: BLK, segments: 16 });
    kit.cyl("impMetal", cx, 3.3, bz0, 0.05, 0.4, "y", { color: GD, segments: 8 });
    kit.cyl("impTrim", cx, 3.5, bz0, 0.18, 0.04, "y", { color: BLK, segments: 16 });
    const lens = new THREE.Mesh(compound([B(0.08, 0.16, 0.3, [0.1, 0, 0], PALETTE.impRed), B(0.08, 0.16, 0.3, [-0.1, 0, 0], PALETTE.impRed), C(0.06, 0.16, [0, 0, 0], PALETTE.impRed, "y", 12)]), ctx.materials.emitRedImp);
    lens.position.set(cx, 3.2, bz0);
    kit.attach(lens);
    kit.onUpdate((dt) => {
      lens.rotation.y += dt * 4.0;
    });
    kit.box("impTrim", cx + 1.0, 2.3, bz0, 0.46, 0.46, 0.06, { color: BLK });
    kit.add("decalImp", new THREE.PlaneGeometry(0.4, 0.4), { pos: [cx + 1.0, 2.3, bz0 + 0.035], uv: "keep", uvRect: impDecalRect(IMP_DECAL.hazard) });
    kit.light({ type: "point", pos: [cx, 2.7, bz0 + 0.6], color: 0xff3020, intensity: 1.8, decay: 1, distance: 5, priority: 0.42 });
    // inside: quartermaster console facing the window, chair, rifle rack, shelving, wall board
    // operator side (console local +z) toward the north, where the quartermaster sits facing the window
    impConsole(kit, cx, 0, -4.6, 2.2, 0.9, { yaw: Math.PI, seed: 74, screens: ["scrAmber0", "scrAmber1"], accentKey });
    impChair(kit, cx, 0, -5.7, Math.PI);
    rifleRack(kit, -12.1, -10.7, 0, 4, { accentKey, seed: 21 });
    partsShelf(kit, -14.2, -7.4, Math.PI / 2, 31);
    partsShelf(kit, -14.2, -5.6, Math.PI / 2, 32);
    N.box("impTrim", hx - 10.4, 1.8, 0.06, 1.4, 0.9, 0.12, { color: BLK, texel: 1 });
    N.screen("scrAmber2", hx - 10.4, 1.85, 0.125, 1.2, 0.6);
    N.box("leds", hx - 10.4, 1.4, 0.125, 1.0, 0.04, 0.01, { uv: "keep" });
    hoodLamp(N, hx - 12.1, 2.6, WORK, 0.8);
    N.decal(IMP_DECAL.glyphs3, 1.2, 2.3, 0.03, 0.4);
    crateStack(kit, -10.3, -9.8, 0.1, { seed: 41, decal: IMP_DECAL.power, n: 2 });
    keyLight(kit, -12.1, 2.6, -6.4, { color: 0xffc080, k: 2.0, distance: 9, priority: 0.45 });
  }

  // ---------------------------------------------------------------- vestibule: door wall signage, status, gear
  wallSign(W, hz - 4.6, 2.6, IMP_DECAL.cog, 0.6, accentKey);
  W.decal(IMP_DECAL.hazard, hz - 2.4, 2.6, 0.03, 0.44);
  statusUnit(W, hz - 3.8, 1.7, { screen: "scrAmber3", accentKey, w: 0.9 });
  impWallGear(W, hz - 6.8, 1.6, { seed: 75, accentKey });
  hoodLamp(W, hz - 8.6, 2.5, WORK, 0.9);
  hoodLamp(W, hz + 7.0, 2.5, WORK, 0.9);
  slotLight(kit, -12.2, 0, h, 1.8, "z", "emitWhiteDim");
  // cage top rail continues as a lintel over the vestibule's S half with a stencil
  S.decal(IMP_DECAL.glyphs1, hx + 12.0, 2.4, 0.03, 0.4);
  impWallGear(S, hx + 13.5, 1.6, { seed: 76, accentKey });
  crateStack(kit, -13.9, 9.6, -0.2, { seed: 42, decal: IMP_DECAL.hazard, n: 3 });
  crateStack(kit, -12.6, 9.7, 0.3, { seed: 43, decal: IMP_DECAL.glyphs2, n: 2 });

  // ---------------------------------------------------------------- north side: rifle racks, kit-issue table, shelving, cell cages
  for (const [k, rx] of [-6.5, -3.5, -0.5].entries()) rifleRack(kit, rx, -10.7, 0, 5, { accentKey, seed: 22 + k });
  cableRun(N, hx - 8.0, hx + 1.2, 2.9, { n: 3, seed: 12, accentKey });
  N.decal(IMP_DECAL.glyphs3, hx - 3.5, 2.5, 0.03, 0.44);
  hoodLamp(N, hx - 6.5, 2.55, WORK, 0.9);
  hoodLamp(N, hx - 0.5, 2.55, WORK, 0.9);
  issueTable(kit, -3.5, -5.6, 0, 3.2);
  floorDecal(kit, IMP_DECAL.glyphs2, -3.5, -3.6, 0.5);
  crateStack(kit, 1.9, -9.9, 0.15, { seed: 44, decal: IMP_DECAL.hazard, n: 3 });
  partsShelf(kit, 4.4, -10.2, 0, 33);
  partsShelf(kit, 6.2, -10.2, 0, 34);
  cellCage(kit, ctx, 9.6, -10.1, 0, { seed: 51 });
  cellCage(kit, ctx, 12.4, -10.1, 0, { seed: 52 });
  for (const cx of [9.6, 12.4]) tube(kit, "rubber", [[cx, 2.05, -10.2], [cx + 0.2, 2.3, -10.6], [cx + 0.3, 2.5, -hz + 0.1]], 0.025, { color: CHR });
  N.box("impTrim", hx + 11.0, 2.7, 0.07, 1.6, 0.4, 0.14, { color: BLK, texel: 1 });
  N.screen("scrAmber3", hx + 11.0, 2.72, 0.145, 1.3, 0.26);
  N.decal(IMP_DECAL.power, hx + 12.7, 2.7, 0.03, 0.36);
  kit.box("chevronY", 11.0, 0.02, -8.9, 3.6, 0.008, 0.12, { texel: 3 });
  floorDecal(kit, IMP_DECAL.power, 11.0, -8.3, 0.6);
  statusUnit(N, hx + 3.0, 1.9, { screen: "scrRed1", accentKey });

  // ---------------------------------------------------------------- south side: armour stands (the hero), rifle rack, open crate, lockers
  // Four stands on a rubber mat in front of a mesh screen; a white track-light rig overhead (one real spot +
  // fill point, four lit cans) makes them the brightest thing in the room.
  const standX = [-1.4, 1.3, 4.0, 6.7];
  for (const [k, ax] of standX.entries()) {
    armourStand(kit, ax, 9.2, 0, { ledKey: k === 2 ? "emitRedImp" : "emitGreen" });
    S.decal([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03, IMP_DECAL.glyphs2][k], hx - ax, 2.15, 0.03, 0.3);
  }
  kit.boxMM("rubber", [-2.4, 0.002, 8.2], [7.7, 0.014, 10.4], { color: CHR, texel: 1 });
  kit.boxMM(accentKey, [-2.4, 0.004, 8.2], [7.7, 0.016, 8.24]);
  cageWall(kit, 7.9, 10.45, -2.6, 10.45, 2.7, { color: GD, postStep: 2.1 });
  {
    const tz = 7.0;
    const tx = (standX[0] + standX[3]) / 2;
    const tl = standX[3] - standX[0] + 1.2;
    kit.box("impTrim", tx, h - 0.06, tz, tl, 0.12, 0.16, { color: BLK, texel: 1 });
    kit.box("impMetal", tx, h - 0.13, tz, tl - 0.1, 0.02, 0.06, { color: GD });
    for (const ax of standX) {
      const from = new THREE.Vector3(ax, h - 0.2, tz);
      const to = new THREE.Vector3(ax, 1.2, 9.2);
      const dir = to.clone().sub(from).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      kit.add("impTrim", new THREE.CylinderGeometry(0.15, 0.11, 0.34, 14), { pos: [ax, h - 0.34, tz + 0.12], quat: q, color: BLK, uv: "scale", uvScale: [1, 0.4] });
      kit.add("emitWhiteDim", new THREE.CylinderGeometry(0.105, 0.105, 0.012, 14), { pos: [ax + dir.x * 0.17, h - 0.34 + dir.y * 0.17, tz + 0.12 + dir.z * 0.17], quat: q, uv: "keep" });
      kit.box("impMetal", ax, h - 0.16, tz, 0.05, 0.1, 0.05, { color: GD });
    }
    kit.light({ type: "spot", pos: [tx, h - 0.3, tz], target: [tx, 1.0, 9.3], color: 0xf4f6ff, intensity: lux(2.7, 7.0), distance: 10, angle: 0.82, penumbra: 0.45, priority: 0.56 });
    keyLight(kit, tx, 3.0, 7.9, { color: 0xf4f6ff, k: 2.6, distance: 9, priority: 0.55 });
  }
  rifleRack(kit, -6.5, 10.7, Math.PI, 4, { accentKey, seed: 25 });
  hoodLamp(S, hx + 6.5, 2.55, WORK, 0.9);
  // heavy lockers W of the rack, and an inspection table on the open floor S of the aisle (two racked-out
  // rifles laid flat, a magazine tray with a charged cell, a stool) so the S half reads from the door
  for (const [k, lx] of [-10.9, -9.9, -8.9].entries()) heavyLocker(kit, lx, hz - 0.38, Math.PI, { seed: 66 + k });
  {
    const p = new Placer(kit, -7.0, 0, 5.4, 0.12);
    const len = 3.0;
    const dpt = 0.9;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box("impTrim", sx * (len / 2 - 0.1), 0.41, sz * (dpt / 2 - 0.1), 0.1, 0.82, 0.1, { color: BLK });
    p.box("impTrim", 0, 0.85, 0, len, 0.06, dpt, { color: BLK, texel: 1 });
    p.box("impMetal", 0, 0.895, 0, len + 0.02, 0.03, dpt + 0.02, { color: GREY, texel: 1 });
    p.box("rubber", 0, 0.92, 0, len - 0.4, 0.02, dpt - 0.3, { color: CHR, texel: 1 });
    p.box(ACCENT, 0, 0.83, dpt / 2 + 0.005, len - 0.4, 0.015, 0.005);
    p.box("impMetal", 0, 0.3, 0, len - 0.24, 0.03, dpt - 0.24, { color: GD, texel: 1 });
    for (const [rx, rz, ry] of [[-0.75, 0.05, 0.08], [0.7, -0.05, -0.12]]) {
      const q = p.quat(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry));
      const pos = p.pos(rx, 1.075, rz);
      kit.instance("dc_rifle", "impMetal", rifleGeo, new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1)), 0xffffff);
    }
    p.box("impTrim", -0.05, 0.96, 0.28, 0.6, 0.06, 0.24, { color: BLK });
    for (let k = 0; k < 3; k++) p.box("impMetal", -0.28 + k * 0.12, 1.0, 0.28, 0.05, 0.11, 0.03, { color: k % 2 ? GD : BLK });
    p.box(WORK, 0.14, 1.0, 0.28, 0.16, 0.02, 0.1);
    p.box("impGloss", 1.1, 0.945, -0.25, 0.16, 0.03, 0.1);
    p.screen("scrAmber1", 1.1, 0.962, -0.25, 0.12, 0.07, "up");
    p.collider(-len / 2 - 0.02, 0, -dpt / 2 - 0.02, len / 2 + 0.02, 0.95, dpt / 2 + 0.04, "inspect");
    const sp = p.pos(0.6, 0, -0.95);
    kit.cyl("impTrim", sp.x, 0.03, sp.z, 0.24, 0.06, "y", { color: BLK, segments: 14 });
    kit.cyl("impMetal", sp.x, 0.35, sp.z, 0.03, 0.6, "y", { color: GD, segments: 8 });
    kit.cyl("rubber", sp.x, 0.68, sp.z, 0.2, 0.06, "y", { color: CHR, segments: 16 });
    kit.collider([sp.x - 0.25, 0, sp.z - 0.25], [sp.x + 0.25, 0.72, sp.z + 0.25], "stool");
    floorDecal(kit, IMP_DECAL.glyphs3, -7.0, 3.2, 0.5);
  }
  cableRun(S, hx - 8.6, hx + 2.6, 2.95, { n: 2, seed: 13, accentKey });
  {
    // open equipment crate with a helmet and a folded cloth inside, lid leaning open
    const p = new Placer(kit, 10.2, 0, 4.2, 0.35);
    p.box("impPanel1", 0, 0.28, 0, 1.1, 0.56, 0.8, { color: GD, uv: "world", texel: 1 });
    for (const y of [0.05, 0.28, 0.53]) p.box("impTrim", 0, y, 0, 1.12, 0.06, 0.82, { color: BLK });
    p.box("impTrim", 0, 0.5, 0, 1.06, 0.02, 0.76, { color: CHR });
    p.box("fabric", 0, 0.54, 0.12, 0.9, 0.06, 0.5, { color: DECK_C.fabricDark, texel: 1 });
    p.box("impPanel1", 0, 0.936, -0.546, 1.1, 0.06, 0.8, { color: GD, uv: "world", texel: 1, tilt: -1.92 });
    p.decal(IMP_DECAL.bay03, 0, 0.3, 0.412, 0.3);
    const hp = p.pos(-0.2, 0, 0.1);
    helmet(kit, hp.x, 0.58, hp.z, 0.35 + 0.5);
    p.collider(-0.6, 0, -0.9, 0.6, 1.0, 0.45, "crate");
  }
  for (const [k, lz] of [-7.6, -6.6, -5.6, -4.6].entries()) heavyLocker(kit, hx - 0.38, lz, -Math.PI / 2, { seed: 61 + k });
  E.box("chevronY", hz - 6.1, 2.2, 0.03, 4.2, 0.1, 0.01, { texel: 3 });
  E.decal(IMP_DECAL.hazard, hz - 6.1, 2.6, 0.03, 0.44);
  E.decal(IMP_DECAL.glyphs3, hz - 3.4, 2.6, 0.03, 0.36);
  kit.box("chevronY", 13.6, 0.02, -6.1, 0.12, 0.008, 4.4, { texel: 3 });
  kit.cyl("impTrim", 14.4, 0.36, -2.6, 0.26, 0.72, "y", { color: BLK, segments: 16, texel: 1 });
  kit.cyl("impMetal", 14.4, 0.74, -2.6, 0.27, 0.04, "y", { color: ORANGE, segments: 16 });
  kit.add("decalImp", new THREE.PlaneGeometry(0.24, 0.24).rotateY(-Math.PI / 2), { pos: [14.13, 0.42, -2.6], uv: "keep", uvRect: impDecalRect(IMP_DECAL.hazard) });
  kit.collider([14.1, 0, -2.9], [14.7, 0.8, -2.3], "blastbin");

  // ---------------------------------------------------------------- east wall: maintenance bench, pegboard, stool, work light
  {
    workBench(kit, hx - 0.5, 5.6, -Math.PI / 2, 4.4);
    const pu = hz + 5.6;
    E.box("impTrim", pu, 1.75, 0.06, 3.4, 1.3, 0.12, { color: BLK, texel: 1 });
    E.box("impPanel2", pu, 1.75, 0.125, 3.2, 1.1, 0.02, { color: CHR, uv: "world", texel: 1 });
    // tool silhouettes clipped to the board
    for (let k = 0; k < 6; k++) {
      const u = pu - 1.3 + k * 0.5;
      E.box("impMetal", u, 1.9, 0.15, 0.03, 0.4, 0.02, { color: k % 2 ? STEEL : GD });
      E.box("impMetal", u, 2.12, 0.15, k % 3 === 0 ? 0.16 : 0.08, 0.06, 0.03, { color: k % 2 ? GD : STEEL });
    }
    for (let k = 0; k < 4; k++) E.cylN("impMetal", pu - 1.2 + k * 0.3, 1.45, 0.16, 0.05 + (k % 2) * 0.02, 0.04, { color: STEEL, segments: 12 });
    E.box("impMetal", pu + 1.0, 1.42, 0.15, 0.5, 0.08, 0.04, { color: GD });
    E.box("impMetal", pu + 1.0, 1.5, 0.15, 0.06, 0.24, 0.04, { color: STEEL });
    E.box(accentKey, pu, 2.36, 0.125, 3.0, 0.02, 0.006);
    E.decal(IMP_DECAL.glyphs1, pu + 1.4, 1.35, 0.135, 0.22);
    // stool + floor mat, wall gear
    kit.cyl("impTrim", 13.2, 0.03, 5.0, 0.24, 0.06, "y", { color: BLK, segments: 14 });
    kit.cyl("impMetal", 13.2, 0.35, 5.0, 0.03, 0.6, "y", { color: GD, segments: 8 });
    kit.cyl("rubber", 13.2, 0.68, 5.0, 0.2, 0.06, "y", { color: CHR, segments: 16 });
    kit.collider([12.95, 0, 4.75], [13.45, 0.72, 5.25], "stool");
    kit.boxMM("rubber", [12.6, 0.002, 3.2], [14.0, 0.014, 8.0], { color: CHR, texel: 1 });
    impWallGear(E, hz + 9.4, 1.6, { seed: 77, accentKey });
    statusUnit(E, hz + 8.6, 2.6, { screen: "scrAmber2", accentKey });
    hoodLamp(E, hz + 5.6, 2.75, "emitWhiteDim", 1.2);
    crateStack(kit, hx - 1.3, hz - 1.4, 0.1, { seed: 45, decal: IMP_DECAL.glyphs1, n: 2 });
  }
  cameraHousing(kit, hx - 0.3, h - 0.55, -hz + 0.3, Math.PI * 0.75);
  cameraHousing(kit, -hx + 0.3, h - 0.55, hz - 0.3, -Math.PI * 0.25);
  cameraHousing(kit, hx - 0.3, h - 0.55, hz - 0.3, Math.PI * 0.25);

  // ---------------------------------------------------------------- overhead: dim amber louvred slots over the aisle (no bare panels)
  for (const x of [-4.5, 3.0, 10.5]) slotLight(kit, x, 0, h, 2.4, "x", "emitAmberDim", { w: 0.4, bar: 0.1 });

  // ---------------------------------------------------------------- lights (8): armour spot + fill (above), booth amber + red beacon (above), vestibule white, 2 amber aisle, bench white
  // vestibule white sits a little S of the door so it also carries the inspection table and the S-wall lockers
  keyLight(kit, -11.5, 3.0, 2.5, { color: 0xe8eeff, k: 5.2, distance: 14, priority: 0.5 });
  // the two aisle keys sit just north of the aisle so the rifle racks / cell cages get direct light and the
  // grating still catches the pool; the armour rig carries the middle (pass 2: +30%, longer reach — the far
  // half of the room read as a black void at k 2.6 / 13 m)
  // (pass 3, round-2 critic: keys dropped from 3.4 to 2.7 m — 0.6 m under the ceiling they painted hot blobs on the
  // coffers — and +20 % so the room mean climbs into the 50–65 target)
  keyLight(kit, -4.5, 2.7, -2.5, { color: 0xffc38a, k: 5.7, distance: 16, priority: 0.49 });
  keyLight(kit, 10.5, 2.7, -2.5, { color: 0xffc38a, k: 5.7, distance: 16, priority: 0.47 });
  keyLight(kit, 13.2, 2.8, 5.6, { color: 0xf0f4ff, k: 3.5, distance: 8, priority: 0.44 });
}
