/**
 * CH3 — Ferndale street corner and alley. Night, heavy rain.
 *
 * The frame is built around one idea: a wet road that turns every neon sign
 * into a vertical smear of colour. Everything else — the facades, the alley,
 * the sodium lamps — exists to feed that reflection or to frame the actors at
 * the alley mouth.
 *
 * World layout (metres):
 *   z = 0        near building line, facades look along +Z
 *   z = 0..2.6   raised pavement (y = 0.15)
 *   z = 2.78..13 carriageway
 *   z = 15.4     far building line, facades look along -Z
 *   x = -5.2..-2.4, z = 0..-18   the alley
 *   x = 21..30   cross street, making the corner
 */
import * as THREE from 'three';
import type { Stage } from '../engine/Stage';
import { Rng } from '../engine/Noise';
import { neonSignTexture, radialAlphaTexture, screenTexture } from '../engine/Textures';
import { mark, type ClueSpec, type Mark, type SceneBuild } from './SceneTypes';
import {
  Batch,
  Disposal,
  additive,
  at,
  blotchAlpha,
  bootPrintAlpha,
  box,
  buildSteam,
  buildWetReflection,
  buildWindowField,
  busShelter,
  chainFence,
  cyl,
  detailScale,
  dumpster,
  emitter,
  fireEscape,
  floorQuad,
  halo,
  lightCone,
  litter,
  mat,
  paint,
  paintVC,
  parkedCar,
  plane,
  puddleMaterial,
  radialSegs,
  sphere,
  streetLamp,
  tint,
  trafficLight,
  trashBags,
  wallPipes,
  type MatOpts,
  type StreetPropCtx,
  type WindowCell,
} from './Props';

const PAVE_Y = 0.15;
const FACADE_Z = 0;
const KERB_Z = 2.62;
const ROAD_Z = 2.78;
const FAR_KERB_Z = 13.2;
const FAR_FACADE_Z = 15.4;

/** Yaw that makes something at `from` look at `to`. */
function facing(from: THREE.Vector3Like, to: THREE.Vector3Like): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

interface FacadeSpec {
  /** Ground-level corner on the wall surface. */
  origin: THREE.Vector3;
  /** Outward normal as a yaw: 0 looks along +Z. */
  yaw: number;
  /** Extent along the wall, measured from `origin` along (cos yaw, 0, -sin yaw). */
  length: number;
  groundHeight: number;
  storey: number;
  floors: number;
  colSpacing: number;
  winW: number;
  winH: number;
  /** Skips openings inside this span along the wall (e.g. a shopfront). */
  gap?: [number, number];
}

/** Lays a regular grid of openings over a wall and appends them to `cells`. */
function gridWindows(cells: WindowCell[], spec: FacadeSpec): void {
  const ax = Math.cos(spec.yaw);
  const az = -Math.sin(spec.yaw);
  const cols = Math.max(1, Math.floor((spec.length - 1.4) / spec.colSpacing));
  const margin = (spec.length - (cols - 1) * spec.colSpacing) / 2;
  for (let c = 0; c < cols; c++) {
    const t = margin + c * spec.colSpacing;
    for (let f = 0; f < spec.floors; f++) {
      const y = spec.groundHeight + f * spec.storey + spec.storey * 0.52;
      if (spec.gap && f === 0 && t > spec.gap[0] && t < spec.gap[1]) continue;
      cells.push({
        center: new THREE.Vector3(spec.origin.x + ax * t, spec.origin.y + y, spec.origin.z + az * t),
        width: spec.winW,
        height: spec.winH,
        yaw: spec.yaw,
      });
    }
  }
}

/** Hanging cable approximated by straight segments through a catenary. */
function cable(
  batch: Batch,
  material: THREE.Material,
  a: THREE.Vector3,
  b: THREE.Vector3,
  sag: number,
  segs = 8,
  radius = 0.025
): void {
  const prev = a.clone();
  const cur = new THREE.Vector3();
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    cur.lerpVectors(a, b, t);
    cur.y -= Math.sin(t * Math.PI) * sag;
    const mid = prev.clone().add(cur).multiplyScalar(0.5);
    const len = prev.distanceTo(cur);
    const dir = cur.clone().sub(prev).normalize();
    const g = new THREE.CylinderGeometry(radius, radius, len, 5, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
    batch.add(material, g, false, false);
    prev.copy(cur);
  }
}

interface NeonSpec {
  text: string;
  sub?: string;
  color: string;
  light: number;
  vertical: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  w: number;
  h: number;
  flicker?: number;
  /** Length of the smeared reflection cast on the wet ground, 0 for none. */
  reflect?: number;
}

const NEON: NeonSpec[] = [
  // Blade signs, projecting out of the facades so they read down the street.
  { text: 'NOIR', color: '#ff3ca8', light: 0xff3ca8, vertical: true, x: -8.6, y: 6.4, z: 0.72, yaw: Math.PI / 2, w: 0.92, h: 3.3, reflect: 11 },
  { text: 'RAMEN', color: '#3ff2ff', light: 0x3ff2ff, vertical: true, x: 1.1, y: 4.6, z: 0.7, yaw: Math.PI / 2, w: 0.86, h: 3.1, reflect: 10, flicker: 0.35 },
  { text: 'HOTEL', color: '#ffab34', light: 0xffab34, vertical: true, x: 13.6, y: 7.6, z: 0.7, yaw: Math.PI / 2, w: 0.98, h: 3.4, reflect: 9 },
  { text: 'BAR', color: '#ff2f5e', light: 0xff2f5e, vertical: true, x: -16.2, y: 3.9, z: 0.66, yaw: Math.PI / 2, w: 0.8, h: 2.3, reflect: 7 },
  { text: '24H', color: '#63ff9c', light: 0x63ff9c, vertical: true, x: 6.4, y: 9.2, z: 0.68, yaw: Math.PI / 2, w: 0.8, h: 2.4 },
  { text: 'CYBER', color: '#b06cff', light: 0xb06cff, vertical: true, x: 18.4, y: 4.4, z: 0.68, yaw: Math.PI / 2, w: 0.9, h: 3.0, flicker: 0.55 },
  // Fascia signs, flush to the wall above the shopfronts.
  { text: 'BLUE MOON', sub: 'LOUNGE', color: '#43d8ff', light: 0x43d8ff, vertical: false, x: -11.5, y: 3.75, z: 0.09, yaw: 0, w: 3.9, h: 0.98, reflect: 8 },
  { text: 'PAWN', sub: 'CASH TODAY', color: '#ffc24a', light: 0xffc24a, vertical: false, x: 3.4, y: 4.15, z: 0.09, yaw: 0, w: 3.4, h: 0.86, reflect: 7 },
];

export function buildStreetScene(stage: Stage): SceneBuild {
  const root = new THREE.Group();
  root.name = 'street';
  const rng = new Rng(20477);
  const opts: MatOpts = { tier: stage.tier };
  const detail = detailScale(stage.tier);
  const segs = radialSegs(stage.tier, 14);
  const batch = new Batch();
  const ctx: StreetPropCtx = { batch, opts, rng };
  const disposal = new Disposal();

  const mAsphalt = mat.asphalt(opts, 14);
  const mPave = mat.pavement(opts, 10);
  const mConcrete = mat.concrete(opts, 6);
  const mBrick = mat.brick(opts, 7);
  const mPanelA = mat.panel(opts, [0.26, 0.28, 0.31], 5, 5, 8);
  const mRust = mat.rusted(opts, 2);
  const mGlass = mat.grimyGlass(opts, 2);
  const mDarkWall = paint(0x0d0f13, 0.92);

  // -------------------------------------------------------------------------
  // Ground
  // -------------------------------------------------------------------------
  batch.add(mAsphalt, box(58, 0.3, FAR_KERB_Z - ROAD_Z, 2, -0.15, (ROAD_Z + FAR_KERB_Z) / 2), false, true);
  batch.add(mAsphalt, box(9, 0.3, 30, 25.5, -0.15, -13.5), false, true);
  batch.add(mPave, box(48, PAVE_Y, KERB_Z + 0.2, -2.6, PAVE_Y / 2, (FACADE_Z - 0.2 + KERB_Z) / 2), false, true);
  batch.add(mPave, box(2.7, PAVE_Y, 30, 22.3, PAVE_Y / 2, -13.4), false, true);
  batch.add(mConcrete, box(48, 0.17, 0.18, -2.6, 0.085, KERB_Z + 0.08), false, true);
  batch.add(mConcrete, box(0.18, 0.17, 30, 20.94, 0.085, -13.4), false, true);
  // Far pavement and kerb
  batch.add(mPave, box(64, PAVE_Y, FAR_FACADE_Z - FAR_KERB_Z, 2, PAVE_Y / 2, (FAR_KERB_Z + FAR_FACADE_Z) / 2), false, true);
  batch.add(mConcrete, box(64, 0.17, 0.18, 2, 0.085, FAR_KERB_Z - 0.08), false, true);
  // Alley floor, a touch below the pavement so water pools at the mouth
  batch.add(mAsphalt, box(2.8, PAVE_Y, 18.2, -3.8, PAVE_Y / 2 - 0.012, -9.0), false, true);

  // Road markings and ironwork
  const paintLine = paint(0x6f6a5f, 0.78);
  for (let x = -26; x < 32; x += 4.2) {
    batch.add(paintLine, floorQuad(2.1, 0.15, x, 0.004, 8.0), false, true);
  }
  batch.add(paintLine, floorQuad(56, 0.1, 2, 0.004, ROAD_Z + 0.45), false, true);
  for (const [mx, mz] of [
    [-6.2, 5.4],
    [9.4, 9.8],
    [16.2, 4.6],
  ] as const) {
    batch.add(mRust, at(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 14), mx, 0.012, mz), false, true);
  }
  // Kerbside drains
  for (const dx of [-9.5, 2.4, 14.8]) {
    batch.add(mRust, box(0.6, 0.04, 0.34, dx, 0.03, ROAD_Z + 0.2), false, true);
  }

  // -------------------------------------------------------------------------
  // Building masses
  // -------------------------------------------------------------------------
  const cells: WindowCell[] = [];

  interface Block {
    x0: number;
    x1: number;
    height: number;
    material: THREE.Material;
    storey: number;
    ground: number;
    floors: number;
    /** Shopfront span in world X, carved out of the ground floor. */
    shop?: [number, number];
  }
  const nearBlocks: Block[] = [
    { x0: -21.5, x1: -5.2, height: 22.8, material: mBrick, storey: 3.2, ground: 3.6, floors: 6, shop: [-14.6, -8.4] },
    { x0: -2.4, x1: 8.5, height: 28.6, material: mConcrete, storey: 3.1, ground: 4.0, floors: 8, shop: [0.4, 5.4] },
    { x0: 8.5, x1: 21, height: 18.2, material: mPanelA, storey: 3.5, ground: 4.2, floors: 4 },
  ];

  const bodyDepth = 13;
  for (const b of nearBlocks) {
    const w = b.x1 - b.x0;
    const cx = (b.x0 + b.x1) / 2;
    // Deep body, then a front slab carved around the shopfront.
    batch.add(b.material, box(w, b.height, bodyDepth, cx, b.height / 2, FACADE_Z - 0.55 - bodyDepth / 2));
    if (b.shop) {
      const [s0, s1] = b.shop;
      const shopTop = 3.05;
      batch.add(b.material, box(s0 - b.x0, b.height, 0.55, (b.x0 + s0) / 2, b.height / 2, -0.275));
      batch.add(b.material, box(b.x1 - s1, b.height, 0.55, (s1 + b.x1) / 2, b.height / 2, -0.275));
      batch.add(b.material, box(s1 - s0, 0.4, 0.55, (s0 + s1) / 2, 0.2, -0.275));
      batch.add(b.material, box(s1 - s0, b.height - shopTop, 0.55, (s0 + s1) / 2, (b.height + shopTop) / 2, -0.275));
      // Recessed shop interior
      const iz = -2.9;
      batch.add(mDarkWall, box(s1 - s0, shopTop, 0.1, (s0 + s1) / 2, shopTop / 2, iz), false, true);
      batch.add(mDarkWall, box(0.1, shopTop, 2.4, s0 + 0.05, shopTop / 2, iz / 2), false, true);
      batch.add(mDarkWall, box(0.1, shopTop, 2.4, s1 - 0.05, shopTop / 2, iz / 2), false, true);
      batch.add(mPave, box(s1 - s0, 0.1, 2.5, (s0 + s1) / 2, PAVE_Y - 0.05, iz / 2), false, true);
      const glow = b.shop[0] < 0 ? emitter(0xffc07a, 1.5) : emitter(0xc8e6ff, 1.4);
      batch.add(glow, plane(s1 - s0 - 0.4, shopTop - 0.7, (s0 + s1) / 2, shopTop * 0.55, iz + 0.06), false, false);
      // Silhouetted stock so the interior is not a flat card
      const shelf = paint(0x1a1c20, 0.8);
      for (let i = 0; i < 5; i++) {
        const px = s0 + 0.5 + ((i + 0.5) * (s1 - s0 - 1)) / 5;
        batch.add(shelf, box(0.6, rng.range(0.9, 1.9), 0.42, px, rng.range(0.5, 1.1), iz + 0.55));
      }
      batch.add(shelf, box(s1 - s0 - 1.2, 0.9, 0.55, (s0 + s1) / 2, 0.6, -0.95));
      // Grimy glazing across the opening
      batch.add(mGlass, plane(s1 - s0 - 0.1, shopTop - 0.45, (s0 + s1) / 2, 0.4 + (shopTop - 0.45) / 2, 0.02), false, false);
      // Awning
      batch.add(
        paint(0x2b1620, 0.85),
        box(s1 - s0 + 0.3, 0.06, 1.1, (s0 + s1) / 2, shopTop + 0.22, 0.5, { rx: -0.16 })
      );
    } else {
      batch.add(b.material, box(w, b.height, 0.55, cx, b.height / 2, -0.275));
    }

    gridWindows(cells, {
      origin: new THREE.Vector3(b.x0, 0, FACADE_Z + 0.01),
      yaw: 0,
      length: w,
      groundHeight: b.ground,
      storey: b.storey,
      floors: b.floors,
      colSpacing: 2.15,
      winW: 1.12,
      winH: 1.55,
    });

    // Cornice bands and a parapet
    for (let f = 1; f <= b.floors; f++) {
      const y = b.ground + f * b.storey - 0.28;
      batch.add(b.material, box(w + 0.12, 0.16, 0.16, cx, y, 0.06));
    }
    batch.add(mConcrete, box(w + 0.3, 0.5, 0.5, cx, b.height + 0.25, -0.1));
    batch.add(mConcrete, box(w + 0.2, 0.9, 0.14, cx, b.height + 0.95, -0.35));
    // Rooftop clutter
    for (let i = 0; i < Math.round(4 * detail) + 2; i++) {
      const px = rng.range(b.x0 + 1, b.x1 - 1);
      batch.add(mRust, box(rng.range(0.7, 1.5), rng.range(0.6, 1.4), rng.range(0.7, 1.3), px, b.height + 1.0, rng.range(-5, -1.2)));
    }
    batch.add(mRust, cyl(0.28, 0.32, 3.2, 8, b.x0 + 2.4, b.height + 2.2, -3.6));
  }

  // Alley walls (the flanks of blocks A and B)
  batch.add(mBrick, box(0.55, 22.8, bodyDepth + 0.55, -5.47, 11.4, -0.275 - (bodyDepth + 0.55) / 2 + 0.275));
  batch.add(mConcrete, box(0.55, 24, bodyDepth + 0.55, -2.13, 12, -0.275 - (bodyDepth + 0.55) / 2 + 0.275));
  batch.add(mBrick, box(3.4, 16, 0.6, -3.8, 8, -18.2));
  gridWindows(cells, {
    origin: new THREE.Vector3(-5.19, 0, FACADE_Z - 0.6),
    yaw: Math.PI / 2,
    length: 12,
    groundHeight: 4.4,
    storey: 3.2,
    floors: 4,
    colSpacing: 2.6,
    winW: 0.95,
    winH: 1.35,
  });
  gridWindows(cells, {
    origin: new THREE.Vector3(-2.41, 0, FACADE_Z - 12.6),
    yaw: -Math.PI / 2,
    length: 12,
    groundHeight: 4.2,
    storey: 3.1,
    floors: 5,
    colSpacing: 2.6,
    winW: 0.95,
    winH: 1.35,
  });

  // Far side of the street: a wall of lit windows for depth
  const farBlocks: [number, number, number][] = [
    [-30, -17, 17.5],
    [-17, -4, 23],
    [-4, 9, 14.5],
    [9, 22, 20.5],
    [22, 36, 16],
  ];
  for (const [x0, x1, h] of farBlocks) {
    const w = x1 - x0;
    const cx = (x0 + x1) / 2;
    batch.add(mConcrete, box(w, h, 11, cx, h / 2, FAR_FACADE_Z + 5.5), false, true);
    batch.add(mConcrete, box(w + 0.2, 0.4, 0.4, cx, h + 0.2, FAR_FACADE_Z), false, true);
    gridWindows(cells, {
      origin: new THREE.Vector3(x1, 0, FAR_FACADE_Z - 0.01),
      yaw: Math.PI,
      length: w,
      groundHeight: 3.4,
      storey: 3.2,
      floors: Math.max(2, Math.floor((h - 3.4) / 3.2)),
      colSpacing: 2.4,
      winW: 1.15,
      winH: 1.5,
    });
  }

  // The corner: block across the cross street
  batch.add(mBrick, box(12, 21, 26, 36, 10.5, -13));
  gridWindows(cells, {
    origin: new THREE.Vector3(29.99, 0, -26),
    yaw: -Math.PI / 2,
    length: 24,
    groundHeight: 4,
    storey: 3.2,
    floors: 5,
    colSpacing: 2.6,
    winW: 1.1,
    winH: 1.45,
  });

  // Window sills, merged
  for (const c of cells) {
    const nx = Math.sin(c.yaw);
    const nz = Math.cos(c.yaw);
    batch.add(
      mConcrete,
      box(c.width + 0.3, 0.09, 0.26, c.center.x + nx * 0.07, c.center.y - c.height / 2 - 0.1, c.center.z + nz * 0.07, {
        ry: c.yaw,
      }),
      false,
      true
    );
  }

  const windows = buildWindowField(cells, new Rng(9911));
  root.add(windows.group);

  // -------------------------------------------------------------------------
  // Alley dressing
  // -------------------------------------------------------------------------
  const ALLEY_X = -3.8;
  dumpster(ctx, ALLEY_X - 0.55, PAVE_Y, -4.2, 0.06);
  trashBags(ctx, ALLEY_X + 0.75, PAVE_Y, -3.4, Math.round(5 * detail) + 3, 0.55);
  trashBags(ctx, ALLEY_X - 0.3, PAVE_Y, -6.6, Math.round(3 * detail) + 2, 0.5);
  wallPipes(ctx, -2.42, PAVE_Y, 9.2, -7.4, -Math.PI / 2, 3, 0.24);
  wallPipes(ctx, -5.18, PAVE_Y, 6.5, -2.6, Math.PI / 2, 2, 0.28);
  fireEscape(ctx, -5.1, -5.4, Math.PI / 2, 4, 3.2, 4.6, 2.6);
  chainFence(root, ctx, ALLEY_X, PAVE_Y, -12.6, 2.7, 2.2, 0);

  // Roll-up service door plus the door the trail leads to
  batch.add(mRust, box(0.08, 2.3, 2.2, -2.44, PAVE_Y + 1.15, -8.6));
  for (let i = 0; i < 12; i++) batch.add(mRust, box(0.05, 0.03, 2.16, -2.39, PAVE_Y + 0.16 + i * 0.18, -8.6));
  const doorMat = paint(0x2a3a34, 0.72, 0.2);
  batch.add(doorMat, box(0.09, 2.1, 0.95, -2.44, PAVE_Y + 1.05, -5.4));
  batch.add(mRust, box(0.12, 2.24, 1.12, -2.46, PAVE_Y + 1.06, -5.4));
  batch.add(paint(0x9aa0a8, 0.3, 0.9), cyl(0.02, 0.02, 0.14, 6, -2.39, PAVE_Y + 1.0, -5.02, { rz: Math.PI / 2 }));
  batch.add(emitter(0xffb066, 2.6), box(0.16, 0.1, 0.3, -2.5, PAVE_Y + 2.42, -5.4), false, false);
  batch.add(mRust, box(0.24, 0.09, 0.4, -2.52, PAVE_Y + 2.52, -5.4));

  // Air-conditioning condensers on the alley walls
  for (const [az, ay, side] of [
    [-3.2, 3.4, -1],
    [-6.9, 5.2, -1],
    [-10.4, 3.9, -1],
    [-4.8, 6.6, 1],
    [-9.1, 4.3, 1],
  ] as const) {
    const wx = side < 0 ? -2.44 : -5.16;
    batch.add(mRust, box(0.6, 0.62, 0.78, wx + side * 0.32, ay, az));
    batch.add(paint(0x14161a, 0.85), box(0.02, 0.5, 0.5, wx + side * 0.63, ay, az));
    batch.add(mRust, box(0.66, 0.06, 0.1, wx + side * 0.32, ay - 0.34, az));
  }

  // Steam from the vent grate
  const grate = mat.brushed(opts, 1);
  batch.add(grate, box(1.0, 0.03, 0.7, ALLEY_X + 0.2, PAVE_Y + 0.01, -2.2), false, true);
  for (let i = 0; i < 7; i++) batch.add(grate, box(0.94, 0.05, 0.05, ALLEY_X + 0.2, PAVE_Y + 0.03, -2.5 + i * 0.1));
  const steam = buildSteam({
    count: Math.round(110 * detail) + 40,
    radius: 0.55,
    height: 4.6,
    rise: 0.062,
    size: 3.4,
    color: 0x9db4d6,
    opacity: 0.17,
    drift: new THREE.Vector3(0.16, 0, 0.42),
    seed: 771,
  });
  steam.object.position.set(ALLEY_X + 0.2, PAVE_Y, -2.2);
  root.add(steam.object);
  disposal.own(steam);

  const manholeSteam = buildSteam({
    count: Math.round(60 * detail) + 24,
    radius: 0.42,
    height: 3.4,
    rise: 0.05,
    size: 3.0,
    color: 0x8ea6c8,
    opacity: 0.12,
    drift: new THREE.Vector3(0.3, 0, 0.1),
    seed: 313,
  });
  manholeSteam.object.position.set(-6.2, 0.02, 5.4);
  root.add(manholeSteam.object);
  disposal.own(manholeSteam);

  // -------------------------------------------------------------------------
  // Street furniture
  // -------------------------------------------------------------------------
  const lampHeadA = streetLamp(ctx, -0.55, PAVE_Y, 2.2, Math.PI, 6.2, 1.75);
  const lampHeadB = streetLamp(ctx, 9.6, PAVE_Y, 2.2, Math.PI, 6.2, 1.75);
  const lampHeadC = streetLamp(ctx, -13.4, PAVE_Y, 2.2, 0, 6.0, 1.65);
  const tlHead = trafficLight(ctx, 20.2, PAVE_Y, 2.1, -Math.PI / 2);
  busShelter(ctx, 15.4, PAVE_Y, 1.3, 0);
  parkedCar(ctx, 6.4, 0, 4.9, Math.PI / 2 + 0.02, 0x11161f);
  parkedCar(ctx, -14.2, 0, 4.85, Math.PI / 2 - 0.015, 0x1d1512);

  // Bollards and a hydrant near the corner
  for (let i = 0; i < 4; i++) {
    batch.add(mRust, cyl(0.075, 0.085, 0.75, 8, 17.4 + i * 0.9, PAVE_Y + 0.375, 2.35));
  }
  batch.add(paint(0x6d2020, 0.7), cyl(0.11, 0.13, 0.62, 10, 11.2, PAVE_Y + 0.31, 2.2));
  batch.add(paint(0x6d2020, 0.7), sphere(0.11, 8, 11.2, PAVE_Y + 0.63, 2.2));
  batch.add(paint(0x6d2020, 0.7), cyl(0.05, 0.05, 0.34, 8, 11.2, PAVE_Y + 0.45, 2.2, { rz: Math.PI / 2 }));

  // Overhead cables crossing the street
  const cableMat = paint(0x0a0b0e, 0.85);
  cable(batch, cableMat, new THREE.Vector3(-18, 9.4, 0.4), new THREE.Vector3(-12, 10.2, FAR_FACADE_Z - 0.4), 1.5);
  cable(batch, cableMat, new THREE.Vector3(4.2, 11.6, 0.4), new THREE.Vector3(9.5, 10.8, FAR_FACADE_Z - 0.4), 1.8);
  cable(batch, cableMat, new THREE.Vector3(-5.4, 7.4, 0.4), new THREE.Vector3(-5.4, 7.4, -17.6), 0.9, 6, 0.02);

  litter(ctx, -3.6, PAVE_Y, -1.4, 1.1, Math.round(16 * detail) + 6);
  litter(ctx, -2.2, PAVE_Y, 1.6, 1.4, Math.round(10 * detail) + 4);
  litter(ctx, 3.5, 0.0, 3.6, 2.2, Math.round(10 * detail) + 4);

  // -------------------------------------------------------------------------
  // Standing water
  // -------------------------------------------------------------------------
  const puddleMat = puddleMaterial(opts);
  const puddleGeos: THREE.BufferGeometry[] = [];
  const puddleSpots: [number, number, number, number][] = [
    [-4.3, 0.156, 0.6, 1.5],
    [-3.4, 0.156, -1.9, 1.2],
    [-1.2, 0.156, 1.9, 1.0],
    [-7.6, 0.008, 5.2, 2.6],
    [1.4, 0.008, 6.4, 3.2],
    [10.8, 0.008, 5.0, 2.4],
    [-13.5, 0.008, 7.2, 2.9],
    [17.5, 0.008, 6.2, 2.2],
    [-3.8, 0.148, -6.2, 1.4],
    [21.8, 0.008, -4.5, 2.4],
  ];
  for (const [px, py, pz, r] of puddleSpots) {
    const g = new THREE.CircleGeometry(r, 18);
    puddleGeos.push(at(g, px, py, pz, { rx: -Math.PI / 2, sy: rng.range(0.55, 0.95) }));
  }
  for (const g of puddleGeos) batch.add(puddleMat, g, false, false);

  // -------------------------------------------------------------------------
  // Neon
  // -------------------------------------------------------------------------
  const haloGeos: THREE.BufferGeometry[] = [];
  const flickerSigns: { material: THREE.MeshBasicMaterial; light: THREE.PointLight | null; rate: number; phase: number }[] = [];
  const reflections: { update: (dt: number) => void; dispose: () => void }[] = [];
  const neonLights: THREE.PointLight[] = [];

  NEON.forEach((spec, i) => {
    const tex = neonSignTexture(spec.text, spec.color, { vertical: spec.vertical, sub: spec.sub });
    const signMat = additive(tex, 0xffffff, 1);
    signMat.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, spec.h), signMat);
    mesh.position.set(spec.x, spec.y, spec.z);
    mesh.rotation.y = spec.yaw;
    mesh.renderOrder = 2;
    root.add(mesh);
    disposal.own(mesh.geometry);
    disposal.own(signMat);

    // Housing behind the sign so it does not float
    if (spec.vertical) {
      batch.add(paint(0x121317, 0.8), box(0.1, spec.h + 0.3, spec.w + 0.24, spec.x, spec.y, spec.z, { ry: spec.yaw }));
      batch.add(mRust, box(0.07, 0.07, spec.z + 0.3, spec.x, spec.y + spec.h / 2 + 0.1, spec.z / 2 - 0.15, { ry: spec.yaw }));
      batch.add(mRust, box(0.07, 0.07, spec.z + 0.3, spec.x, spec.y - spec.h / 2 - 0.1, spec.z / 2 - 0.15, { ry: spec.yaw }));
    } else {
      batch.add(paint(0x121317, 0.8), box(spec.w + 0.28, spec.h + 0.24, 0.14, spec.x, spec.y, spec.z - 0.06));
    }

    haloGeos.push(halo(Math.max(spec.w, spec.h) * 1.9, spec.light, spec.x, spec.y, spec.z + (spec.vertical ? 0 : 0.02), spec.yaw));

    if (spec.reflect) {
      const refl = buildWetReflection(tex, spec.w * 2.4, spec.reflect, spec.light, spec.vertical ? 0.5 : 0.4, 1);
      refl.mesh.position.set(spec.x, 0.026, spec.z + spec.reflect / 2 - 0.4);
      refl.mesh.rotation.set(-Math.PI / 2, 0, 0);
      refl.mesh.renderOrder = 3;
      root.add(refl.mesh);
      reflections.push(refl);
      disposal.own(refl);
    }

    // Only the three biggest signs pay for a real light.
    let pl: THREE.PointLight | null = null;
    if (i < 3) {
      pl = new THREE.PointLight(spec.light, 90, 26, 2);
      pl.position.set(spec.x + (spec.vertical ? 0 : 0), spec.y - spec.h * 0.35, spec.z + 0.6);
      pl.castShadow = false;
      root.add(pl);
      neonLights.push(pl);
    }
    if (spec.flicker) flickerSigns.push({ material: signMat, light: pl, rate: 4 + i * 1.3, phase: i * 2.7 });
  });

  const haloMat = additive(radialAlphaTexture(2.2, 128), 0xffffff, 0.5, true);
  batch.add(haloMat, haloGeos[0], false, false);
  for (let i = 1; i < haloGeos.length; i++) batch.add(haloMat, haloGeos[i], false, false);

  // Sodium cones under the lamp heads
  const coneMat = additive(null, 0xffffff, 0.14, true);
  for (const head of [lampHeadA, lampHeadB, lampHeadC]) {
    const cone = lightCone(0.32, 3.1, head.y - PAVE_Y, 0xffb264, segs);
    batch.add(coneMat, at(cone, head.x, PAVE_Y + (head.y - PAVE_Y) / 2, head.z), false, false);
    batch.add(haloMat, halo(2.2, 0xffb264, head.x, head.y - 0.1, head.z), false, false);
  }
  batch.add(haloMat, halo(1.0, 0x40ff88, tlHead.x, tlHead.y, tlHead.z, -Math.PI / 2), false, false);

  // A wall-mounted display in the bus shelter
  const adTex = screenTexture(
    [
      { text: 'CYBERLIFE', size: 46, color: '#dff2ff', align: 'center' },
      { text: 'YOUR ANDROID', size: 26, color: '#8fd6ff', align: 'center' },
      { text: 'COMPANION', size: 26, color: '#8fd6ff', align: 'center' },
    ],
    { w: 384, h: 512, bg: '#04121c', grid: true, scan: true }
  );
  const adMat = additive(adTex, 0xffffff, 0.85);
  adMat.side = THREE.FrontSide;
  const ad = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), adMat);
  ad.position.set(15.4 + 1.6, PAVE_Y + 1.35, 1.3);
  ad.rotation.y = Math.PI / 2;
  root.add(ad);
  disposal.own(ad.geometry);
  disposal.own(adMat);
  const adLight = new THREE.PointLight(0x74c8ff, 22, 7, 2);
  adLight.position.set(16.4, PAVE_Y + 1.4, 1.3);
  root.add(adLight);

  // -------------------------------------------------------------------------
  // Clues
  // -------------------------------------------------------------------------
  const bloodMat = new THREE.MeshStandardMaterial({
    color: 0x2a0508,
    roughness: 0.18,
    metalness: 0,
    alphaMap: blotchAlpha(7),
    transparent: true,
    depthWrite: false,
  });
  disposal.own(bloodMat);
  const bloodSpots: [number, number, number][] = [
    [-4.05, -0.55, 0.55],
    [-4.2, -1.5, 0.34],
    [-3.95, -2.5, 0.4],
    [-3.7, -3.5, 0.26],
    [-3.5, 0.4, 0.3],
    [-4.35, -4.6, 0.22],
  ];
  for (const [bx, bz, r] of bloodSpots) {
    batch.add(bloodMat, floorQuad(r * 2, r * 2.4, bx, PAVE_Y + 0.004, bz, rng.range(0, Math.PI)), false, false);
  }

  const printMat = new THREE.MeshStandardMaterial({
    color: 0x1b1d1f,
    roughness: 0.32,
    metalness: 0,
    alphaMap: bootPrintAlpha(),
    transparent: true,
    depthWrite: false,
  });
  disposal.own(printMat);
  for (let i = 0; i < 5; i++) {
    batch.add(
      printMat,
      floorQuad(0.19, 0.34, -3.5 + (i % 2 === 0 ? -0.16 : 0.16), PAVE_Y + 0.005, -1.6 - i * 0.62, 0.12 + i * 0.02),
      false,
      false
    );
  }

  // Dropped satchel
  const bagMat = paint(0x231f1c, 0.78);
  batch.add(bagMat, box(0.42, 0.28, 0.17, -3.1, PAVE_Y + 0.14, 1.85, { ry: 0.5, rz: 0.16 }));
  batch.add(bagMat, box(0.44, 0.1, 0.19, -3.1, PAVE_Y + 0.27, 1.85, { ry: 0.5, rz: 0.16 }));
  batch.add(
    paint(0x14110f, 0.85),
    at(new THREE.TorusGeometry(0.2, 0.018, 5, 12), -3.34, PAVE_Y + 0.14, 1.72, { rx: Math.PI / 2, ry: 0.5, rz: 1.2 })
  );
  batch.add(paintVC(0.9), tint(plane(0.16, 0.22, -2.82, PAVE_Y + 0.004, 2.02, { rx: -Math.PI / 2, ry: 0.7 }), new THREE.Color(0.55, 0.52, 0.46)), false, true);

  const meshes = batch.flush(root, 'street');
  for (const m of meshes) disposal.own(m.geometry);

  // -------------------------------------------------------------------------
  // Lighting
  // -------------------------------------------------------------------------
  const lights: Record<string, THREE.Light> = {};

  const skyFill = new THREE.HemisphereLight(0x33455f, 0x120e14, 0.42);
  root.add(skyFill);
  lights.skyFill = skyFill;

  const ambient = new THREE.AmbientLight(0x1a2334, 0.35);
  root.add(ambient);
  lights.ambient = ambient;

  // Shadow caster 1: cold skyglow raking across the street.
  const moon = new THREE.DirectionalLight(0x7d9ad6, 1.15);
  moon.position.set(-17, 21, 15);
  moon.target.position.set(-3.6, 0, -1);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.bias = -0.0008;
  moon.shadow.normalBias = 0.02;
  moon.shadow.camera.near = 6;
  moon.shadow.camera.far = 62;
  moon.shadow.camera.left = -16;
  moon.shadow.camera.right = 14;
  moon.shadow.camera.top = 18;
  moon.shadow.camera.bottom = -10;
  root.add(moon, moon.target);
  lights.moon = moon;

  // Shadow caster 2: the sodium lamp standing over the actors.
  const lamp = new THREE.SpotLight(0xffa752, 900, 22, 0.62, 0.45, 2);
  lamp.position.copy(lampHeadA);
  lamp.target.position.set(-3.9, PAVE_Y, 0.9);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.bias = -0.0008;
  lamp.shadow.normalBias = 0.02;
  lamp.shadow.camera.near = 1.2;
  lamp.shadow.camera.far = 24;
  root.add(lamp, lamp.target);
  lights.lamp = lamp;

  const lampB = new THREE.PointLight(0xffa752, 320, 18, 2);
  lampB.position.copy(lampHeadB).add(new THREE.Vector3(0, -0.2, 0));
  root.add(lampB);
  lights.lampB = lampB;

  const lampC = new THREE.PointLight(0xffa752, 300, 17, 2);
  lampC.position.copy(lampHeadC).add(new THREE.Vector3(0, -0.2, 0));
  root.add(lampC);
  lights.lampC = lampC;

  // Deep alley: a cold shaft so the far mark is not swallowed.
  const alleyLight = new THREE.PointLight(0x9fc4ff, 46, 13, 2);
  alleyLight.position.set(ALLEY_X - 0.2, 4.4, -8.4);
  root.add(alleyLight);
  lights.alley = alleyLight;

  const doorLight = new THREE.PointLight(0xffb066, 16, 6.5, 2);
  doorLight.position.set(-2.72, PAVE_Y + 2.3, -5.4);
  root.add(doorLight);
  lights.alleyDoor = doorLight;

  const shopLight = new THREE.PointLight(0xffc07a, 60, 12, 2);
  shopLight.position.set(-11.5, 2.1, -1.4);
  root.add(shopLight);
  lights.shop = shopLight;

  lights.adScreen = adLight;
  neonLights.forEach((l, i) => {
    lights[`neon${i}`] = l;
  });

  // -------------------------------------------------------------------------
  // Marks
  // -------------------------------------------------------------------------
  const heroPos = new THREE.Vector3(-4.6, PAVE_Y, 1.4);
  const otherPos = new THREE.Vector3(-3.05, PAVE_Y, 0.95);
  const heroYaw = facing(heroPos, otherPos);
  const alleyEnd = new THREE.Vector3(ALLEY_X, PAVE_Y, -8.4);
  const establishPos = new THREE.Vector3(5.4, 1.95, 8.4);
  const closePos = new THREE.Vector3(-1.9, 1.62, 2.7);
  const mouthPos = new THREE.Vector3(ALLEY_X, 1.62, 3.5);

  const marks: Record<string, Mark> = {
    'cam.establish': mark(
      establishPos.x,
      establishPos.y,
      establishPos.z,
      facing(establishPos, new THREE.Vector3(-3.9, 1.5, 0.9))
    ),
    'cam.close': mark(closePos.x, closePos.y, closePos.z, facing(closePos, heroPos)),
    'cam.alleyMouth': mark(mouthPos.x, mouthPos.y, mouthPos.z, facing(mouthPos, alleyEnd)),
    'actor.hero': mark(heroPos.x, heroPos.y, heroPos.z, heroYaw),
    'actor.other': mark(otherPos.x, otherPos.y, otherPos.z, heroYaw - Math.PI),
    'actor.alleyEnd': mark(alleyEnd.x, alleyEnd.y, alleyEnd.z, 0),
    'look.hero': mark(heroPos.x, heroPos.y + 1.58, heroPos.z, heroYaw),
    'look.other': mark(otherPos.x, otherPos.y + 1.58, otherPos.z, heroYaw - Math.PI),
  };

  const clues: ClueSpec[] = [
    {
      id: 'blood_trail',
      label: 'Blood trail',
      position: new THREE.Vector3(-4.05, PAVE_Y + 0.02, -0.55),
      detail: 'Thirium 310. Two hours old and already fading from human sight. It leads into the alley.',
    },
    {
      id: 'dropped_bag',
      label: 'Dropped satchel',
      position: new THREE.Vector3(-3.1, PAVE_Y + 0.2, 1.85),
      detail: 'Courier satchel, strap torn at the buckle. Whoever carried it did not put it down willingly.',
    },
    {
      id: 'boot_print',
      label: 'Boot print',
      position: new THREE.Vector3(-3.5, PAVE_Y + 0.02, -2.2),
      detail: 'Size 44 work boot, deep on the toe. The wearer was running, and carrying weight.',
    },
    {
      id: 'alley_door',
      label: 'Service door',
      position: new THREE.Vector3(-2.5, PAVE_Y + 1.05, -5.4),
      detail: 'Maglock forced from the outside. Fresh scoring on the strike plate, still bright under the rain.',
    },
  ];

  // -------------------------------------------------------------------------
  // Animation
  // -------------------------------------------------------------------------
  const update = (dt: number, elapsed: number) => {
    windows.update(elapsed);
    steam.update(dt, elapsed);
    manholeSteam.update(dt, elapsed);
    for (const r of reflections) r.update(dt);
    for (const s of flickerSigns) {
      const t = elapsed * s.rate + s.phase;
      const n = Math.sin(t) * Math.sin(t * 2.71 + 0.7) * Math.sin(t * 0.37);
      const gate = n > 0.05 ? 1 : n > -0.25 ? 0.28 : 0.05;
      s.material.opacity = gate;
      if (s.light) s.light.intensity = 90 * gate;
    }
    // The ad panel breathes so the shelter never sits still.
    adLight.intensity = 22 + Math.sin(elapsed * 1.7) * 4;
    doorLight.intensity = 16 + Math.sin(elapsed * 9.3) * Math.sin(elapsed * 3.1) * 3;
  };

  return {
    root,
    sky: 'nightRain',
    showSkyBackground: true,
    atmosphere: {
      fogColor: new THREE.Color(0x0b1018),
      fogColorFar: new THREE.Color(0x191324),
      density: 0.034,
      heightFalloff: 0.072,
      fogBase: -0.5,
      noise: 0.62,
    },
    grade: {
      lift: new THREE.Vector3(0.008, 0.02, 0.036),
      gamma: new THREE.Vector3(1.0, 1.02, 1.06),
      gain: new THREE.Vector3(1.06, 1.0, 1.07),
      shadowTint: new THREE.Vector3(0.0, 0.17, 0.26),
      highlightTint: new THREE.Vector3(0.24, 0.07, 0.14),
      saturation: 1.24,
      contrast: 1.15,
      temperature: -0.04,
      bleach: 0.04,
      vignette: 0.46,
    },
    rain: 0.95,
    shafts: [
      { position: lampHeadA.clone(), color: new THREE.Color(0xffa752), intensity: 0.34 },
      { position: new THREE.Vector3(NEON[0].x, NEON[0].y, NEON[0].z), color: new THREE.Color(0xff3ca8), intensity: 0.26 },
    ],
    marks,
    lights,
    clues,
    cameraBounds: new THREE.Box3(new THREE.Vector3(-19, 0.5, -16.5), new THREE.Vector3(20, 9.5, 12.4)),
    update,
    dispose: () => {
      disposal.run();
      root.clear();
    },
  };
}
