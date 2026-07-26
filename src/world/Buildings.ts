/**
 * Buildings.ts — multi-storey facades, interiors, roofs and battle damage.
 *
 * Facades are NOT solid boxes: every wall is decomposed around its window and
 * door openings so the openings are real holes you can see and shoot through.
 * Each opening gets recessed reveals, a protruding sill and lintel, and (for
 * windows) a recessed dirty-glass pane — the depth that separates a real
 * building from a textured cuboid. Plinths, cornices and parapets add the
 * horizontal banding real masonry has.
 *
 * Enterable buildings get interior floor slabs, a partition with a doorway, and
 * a staircase to the next floor. Damaged buildings get shell holes punched
 * through the shelled side, exposed rebar, spilled rubble and, where specified,
 * a blown-open top floor showing the rooms in cross-section.
 *
 * Geometry is bucketed by material and merged per building, so the whole city
 * is a few dozen draw calls. The solid wall buckets double as collision proxies
 * (holes included), and thin wall AABBs feed the nav/LoS grids.
 */

import * as THREE from 'three';
import type { SurfaceType } from '../core/Contracts';
import type { Rng } from '../core/MathX';
import type { Build, BuildingSpec, LevelPlan, Solid } from './Blockout';
import { worldBox, chamferedBox, worldCylinder, placed, mergeAll, tagSurface, freeze } from './GeometryKit';

interface Opening {
  /** Centre along wall length (metres from wall centre). */
  uc: number;
  uw: number;
  /** Centre height (world Y) and height. */
  vy: number;
  vh: number;
  kind: 'window' | 'door' | 'shell';
  /** Window has glass unless blown out. */
  glass?: boolean;
}

interface WallDef {
  axis: 'x' | 'z';
  /** Position along the length axis of the wall centre. */
  spanCenter: number;
  /** Outer face coordinate on the facing axis. */
  faceCoord: number;
  outSign: number;
  length: number;
  height: number;
  thickness: number;
  openings: Opening[];
  /** Suppress reveals/sills (e.g. bare back walls) to save geometry. */
  detail: boolean;
}

interface Bucket {
  mat: THREE.Material;
  geos: THREE.BufferGeometry[];
  collider: boolean;
  surface: SurfaceType;
  cast: boolean;
  recv: boolean;
}

class BucketSet {
  private map = new Map<string, Bucket>();
  constructor(private env: Build) {}

  get(key: string, mat: THREE.Material, surface: SurfaceType, collider: boolean, cast = true, recv = true): Bucket {
    let b = this.map.get(key);
    if (!b) {
      b = { mat, geos: [], collider, surface, cast, recv };
      this.map.set(key, b);
    }
    return b;
  }

  flush(name: string): { colliders: THREE.Object3D[] } {
    const colliders: THREE.Object3D[] = [];
    for (const [key, b] of this.map) {
      if (b.geos.length === 0) continue;
      const geo = mergeAll(b.geos);
      for (const g of b.geos) g.dispose();
      const mesh = new THREE.Mesh(geo, b.mat);
      mesh.name = `${name}_${key}`;
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.recv;
      tagSurface(mesh, b.surface, b.collider);
      freeze(mesh);
      this.env.root.add(mesh);
      this.env.own(geo);
      if (b.collider) {
        this.env.colliders.push(mesh);
        colliders.push(mesh);
      }
    }
    this.map.clear();
    return { colliders };
  }
}

// ---------------------------------------------------------------------------

export function buildBuildings(env: Build, plan: LevelPlan): void {
  for (const spec of plan.buildings) buildOne(env, spec);
}

function facadeMat(env: Build, spec: BuildingSpec): THREE.Material {
  const kind = spec.wall === 'brick' ? 'brick_clay' : spec.wall === 'plaster' ? 'plaster_painted' : 'concrete_rough';
  return env.mat(kind, { tint: spec.tint, key: spec.id + '_facade' });
}

function buildOne(env: Build, spec: BuildingSpec): void {
  const rng = env.rng;
  const buckets = new BucketSet(env);
  const H = spec.floors * spec.floorHeight;
  const x0 = spec.cx - spec.w / 2;
  const x1 = spec.cx + spec.w / 2;
  const z0 = spec.cz - spec.d / 2;
  const z1 = spec.cz + spec.d / 2;
  const T = 0.5;

  const facade = facadeMat(env, spec);
  const facadeUv = env.uv(spec.wall === 'brick' ? 'brick_clay' : spec.wall === 'plaster' ? 'plaster_painted' : 'concrete_rough');
  const trimMat = env.mat('concrete_cast', { tint: spec.trim, key: spec.id + '_trim' });
  const concreteUv = env.uv('concrete_cast');
  const glassMat = env.mat('glass_dirty', { key: 'glass' });
  const rebarMat = env.mat('metal_rusted', { key: 'rebar' });
  const rubbleMat = env.mat('rubble', { tint: 0x9c9184, key: 'rubble' });

  const facadeKey = spec.id + 'F';
  const facadeBucket = () => buckets.get(facadeKey, facade, wallSurface(spec.wall), true);
  const trimBucket = () => buckets.get(spec.id + 'T', trimMat, 'concrete', true);
  const glassBucket = () => buckets.get('glass', glassMat, 'glass', false, false, false);
  const rebarBucket = () => buckets.get('rebar', rebarMat, 'metal', false);
  const rubbleBucket = () => buckets.get('rubble', rubbleMat, 'gravel', false, false, true);

  const uvOff: [number, number] = [rng.range(0, 4), rng.range(0, 2)];

  // Which world wall faces the street.
  const facingSide: 'E' | 'W' = spec.facing;
  const damaged = spec.damage;

  // Build the four walls.
  const walls: { side: 'N' | 'S' | 'E' | 'W'; def: WallDef }[] = [];
  // East wall (+X)
  walls.push({ side: 'E', def: mkWall('z', spec.cz, x1, +1, spec.d, H, T) });
  // West wall (−X)
  walls.push({ side: 'W', def: mkWall('z', spec.cz, x0, -1, spec.d, H, T) });
  // South wall (+Z)
  walls.push({ side: 'S', def: mkWall('x', spec.cx, z1, +1, spec.w, H, T) });
  // North wall (−Z)
  walls.push({ side: 'N', def: mkWall('x', spec.cx, z0, -1, spec.w, H, T) });

  for (const w of walls) {
    const isFacing =
      (facingSide === 'E' && w.side === 'E') || (facingSide === 'W' && w.side === 'W');
    const isBack = (facingSide === 'E' && w.side === 'W') || (facingSide === 'W' && w.side === 'E');
    w.def.detail = !isBack || spec.enterable;
    populateOpenings(w.def, spec, isFacing, w.side, rng);
    if (damaged && damaged.side === w.side) addDamageOpenings(w.def, spec, damaged, rng);
    // Directional front damage: buildings in the shelled north half of the map
    // also take hits on their STREET-facing wall so the money shots read as a
    // battle, with impacts concentrated toward the upper floors.
    if (isFacing && damaged && spec.cz < 22) {
      addFrontDamage(w.def, spec, damaged.severity, rng);
    }
  }

  // Emit walls.
  for (const w of walls) {
    emitWall(w.def, facadeBucket(), facadeUv, uvOff);
    if (w.def.detail) emitOpeningTrim(w.def, trimBucket(), glassBucket(), concreteUv, rng);
    pushWallSolids(env, w.def);
  }

  // Plinth (base course) wraps the footprint, slightly proud.
  emitBand(trimBucket(), x0, x1, z0, z1, 0, 0.55, 0.14, concreteUv);
  // Cornice just below the roof.
  emitBand(trimBucket(), x0, x1, z0, z1, H - 0.45, 0.45, 0.22, concreteUv);

  // Roof slab + parapet.
  buildRoof(env, buckets, spec, x0, x1, z0, z1, H, concreteUv);

  // Interior: floors, partition, stairs (enterable or heavily damaged).
  const needInterior = spec.enterable || (damaged?.severity ?? 0) >= 0.5;
  if (needInterior) buildInterior(env, buckets, spec, x0, x1, z0, z1, T, concreteUv);

  // Damage dressing: rubble spill + rebar + collapsed top floor.
  if (damaged) buildDamageDressing(env, spec, damaged, x0, x1, z0, z1, H, rubbleBucket(), rebarBucket(), rng);

  buckets.flush(spec.id);

  // Nav/LoS footprint solid — thin perimeter walls (door gaps handled in solids).
  // (already pushed per-wall in pushWallSolids)
  // Interior volume for isIndoors.
  if (spec.enterable) {
    env.interiors.push(
      new THREE.Box3(new THREE.Vector3(x0 + T, 0.1, z0 + T), new THREE.Vector3(x1 - T, H, z1 - T))
    );
  }

  // Cover seeds along the street-facing wall base.
  addWallCover(env, spec, facingSide);
}

// ---------------------------------------------------------------------------
// Wall definition + opening population
// ---------------------------------------------------------------------------

function mkWall(
  axis: 'x' | 'z',
  spanCenter: number,
  faceCoord: number,
  outSign: number,
  length: number,
  height: number,
  thickness: number
): WallDef {
  return { axis, spanCenter, faceCoord, outSign, length, height, thickness, openings: [], detail: true };
}

function populateOpenings(def: WallDef, spec: BuildingSpec, facing: boolean, _side: string, rng: Rng): void {
  const L = def.length;
  const inset = 1.6;
  const usable = L - inset * 2;
  const nWin = Math.max(2, Math.min(6, Math.floor(usable / 3.0)));
  const gap = usable / nWin;
  const winW = Math.min(1.35, gap * 0.5);
  const doorFloorOnly = facing;

  for (let f = 0; f < spec.floors; f++) {
    const floorBase = f * spec.floorHeight;
    const sillY = floorBase + 0.95;
    const winH = 1.55;
    for (let i = 0; i < nWin; i++) {
      const uc = -usable / 2 + gap * (i + 0.5);
      // Ground-floor centre becomes a door on the facing wall.
      if (doorFloorOnly && f === 0 && Math.abs(uc) < gap * 0.55) {
        def.openings.push({ uc, uw: 1.5, vy: 0.05 + 2.35 / 2, vh: 2.35, kind: 'door' });
        continue;
      }
      const blownOut = rng.chance(0.16) || (f >= spec.floors - 1 && rng.chance(0.3));
      def.openings.push({
        uc: uc + rng.range(-0.05, 0.05),
        uw: winW,
        vy: sillY + winH / 2,
        vh: winH,
        kind: 'window',
        glass: !blownOut,
      });
    }
  }
}

function addDamageOpenings(def: WallDef, spec: BuildingSpec, dmg: NonNullable<BuildingSpec['damage']>, rng: Rng): void {
  const holes = Math.round(1 + dmg.severity * 3);
  for (let i = 0; i < holes; i++) {
    const f = Math.min(spec.floors - 1, Math.floor(rng.range(0.4, spec.floors - 0.2)));
    const floorBase = f * spec.floorHeight;
    const uw = rng.range(1.6, 3.0);
    const vh = rng.range(1.6, 2.4);
    def.openings.push({
      uc: rng.range(-def.length / 2 + 2, def.length / 2 - 2),
      uw,
      vy: floorBase + rng.range(1.4, 2.4),
      vh,
      kind: 'shell',
    });
  }
}

function addFrontDamage(def: WallDef, spec: BuildingSpec, severity: number, rng: Rng): void {
  const holes = Math.max(1, Math.round(severity * 2.5));
  for (let i = 0; i < holes; i++) {
    // Bias toward upper floors (shells hit high) and a random bay.
    const f = Math.min(spec.floors - 1, Math.max(1, Math.round(rng.range(spec.floors * 0.5, spec.floors - 0.2))));
    const floorBase = f * spec.floorHeight;
    def.openings.push({
      uc: rng.range(-def.length / 2 + 2, def.length / 2 - 2),
      uw: rng.range(1.4, 2.6),
      vy: floorBase + rng.range(1.2, 2.2),
      vh: rng.range(1.4, 2.2),
      kind: 'shell',
    });
  }
  // Scattered smaller pockmarks lower down.
  for (let i = 0; i < Math.round(severity * 3); i++) {
    def.openings.push({
      uc: rng.range(-def.length / 2 + 1.5, def.length / 2 - 1.5),
      uw: rng.range(0.5, 0.9),
      vy: rng.range(1.5, spec.floorHeight * 1.6),
      vh: rng.range(0.5, 0.9),
      kind: 'shell',
    });
  }
}

// ---------------------------------------------------------------------------
// Wall emission (punched into solid runs)
// ---------------------------------------------------------------------------

function emitWall(def: WallDef, bucket: Bucket, uvScale: number, uvOff: [number, number]): void {
  const uHalf = def.length / 2;
  const H = def.height;
  const ops = def.openings;

  // Build sorted cut lines.
  const uCuts = new Set<number>([-uHalf, uHalf]);
  const vCuts = new Set<number>([0, H]);
  for (const o of ops) {
    uCuts.add(clampN(o.uc - o.uw / 2, -uHalf, uHalf));
    uCuts.add(clampN(o.uc + o.uw / 2, -uHalf, uHalf));
    vCuts.add(clampN(o.vy - o.vh / 2, 0, H));
    vCuts.add(clampN(o.vy + o.vh / 2, 0, H));
  }
  const us = [...uCuts].sort((a, b) => a - b);
  const vs = [...vCuts].sort((a, b) => a - b);

  const inside = (u: number, v: number): boolean => {
    for (const o of ops) {
      if (
        u > o.uc - o.uw / 2 + 1e-4 &&
        u < o.uc + o.uw / 2 - 1e-4 &&
        v > o.vy - o.vh / 2 + 1e-4 &&
        v < o.vy + o.vh / 2 - 1e-4
      )
        return true;
    }
    return false;
  };

  // Greedy horizontal runs per v-band.
  for (let vi = 0; vi < vs.length - 1; vi++) {
    const v0 = vs[vi];
    const v1 = vs[vi + 1];
    const vc = (v0 + v1) / 2;
    const vh = v1 - v0;
    if (vh < 1e-3) continue;
    let runStart: number | null = null;
    for (let ui = 0; ui < us.length - 1; ui++) {
      const u0 = us[ui];
      const u1 = us[ui + 1];
      const uc = (u0 + u1) / 2;
      const solid = !inside(uc, vc);
      if (solid && runStart === null) runStart = u0;
      const nextSolid = ui < us.length - 2 && !inside((us[ui + 1] + us[ui + 2]) / 2, vc);
      if (solid && !nextSolid && runStart !== null) {
        const len = u1 - runStart;
        emitWallBox(bucket, def, (runStart + u1) / 2, vc, len, vh, def.thickness, uvScale, uvOff);
        runStart = null;
      }
    }
  }
}

function emitWallBox(
  bucket: Bucket,
  def: WallDef,
  uc: number,
  vc: number,
  len: number,
  h: number,
  depth: number,
  uvScale: number,
  uvOff: [number, number]
): void {
  const inwardCenter = depth / 2;
  const { cx, cy, cz, w, hh, d } = worldFromWall(def, uc, vc, inwardCenter, len, h, depth);
  const geo = worldBox(w, hh, d, { uvScale, uvOffset: uvOff });
  bucket.geos.push(placed(geo, cx, cy, cz));
  geo.dispose();
}

/** Convert wall-local (uc,vc,inward, len,h,depth) into a world-space box. */
function worldFromWall(
  def: WallDef,
  uc: number,
  vc: number,
  inwardCenter: number,
  len: number,
  h: number,
  depth: number
): { cx: number; cy: number; cz: number; w: number; hh: number; d: number } {
  if (def.axis === 'z') {
    return {
      cx: def.faceCoord - def.outSign * inwardCenter,
      cy: vc,
      cz: def.spanCenter + uc,
      w: depth,
      hh: h,
      d: len,
    };
  }
  return {
    cx: def.spanCenter + uc,
    cy: vc,
    cz: def.faceCoord - def.outSign * inwardCenter,
    w: len,
    hh: h,
    d: depth,
  };
}

// ---------------------------------------------------------------------------
// Opening trim: reveals, sills, lintels, glass
// ---------------------------------------------------------------------------

function emitOpeningTrim(def: WallDef, trim: Bucket, glass: Bucket, uvScale: number, rng: Rng): void {
  for (const o of def.openings) {
    if (o.kind === 'shell') continue;
    const revealDepth = 0.34;
    const halfW = o.uw / 2;
    const halfH = o.vh / 2;
    // Reveal: two vertical jambs + head, inset behind the face.
    const inwardC = revealDepth / 2 + 0.02;
    // Left/right jambs
    for (const s of [-1, 1]) {
      pushTrimBox(trim, def, o.uc + s * (halfW + 0.06), o.vy, inwardC, 0.12, o.vh + 0.12, revealDepth, uvScale);
    }
    // Head (lintel underside) + a protruding lintel beam
    pushTrimBox(trim, def, o.uc, o.vy + halfH + 0.06, inwardC, o.uw + 0.24, 0.12, revealDepth, uvScale);
    pushTrimBox(trim, def, o.uc, o.vy + halfH + 0.16, -0.06, o.uw + 0.4, 0.22, 0.16, uvScale);

    if (o.kind === 'door') {
      // Threshold.
      pushTrimBox(trim, def, o.uc, o.vy - halfH + 0.06, -0.02, o.uw + 0.3, 0.12, 0.24, uvScale);
    } else {
      // Sill protrudes below the window.
      pushTrimBox(trim, def, o.uc, o.vy - halfH - 0.04, -0.05, o.uw + 0.34, 0.12, 0.26, uvScale);
      // Recessed glass pane (or a couple of shards if blown out).
      if (o.glass) {
        pushGlass(glass, def, o.uc, o.vy, 0.28, o.uw - 0.04, o.vh - 0.04);
      } else if (rng.chance(0.7)) {
        // A few triangular shards clinging to the frame.
        for (let i = 0; i < 3; i++) {
          const sw = rng.range(0.1, 0.3);
          const sh = rng.range(0.2, 0.5);
          pushGlass(
            glass,
            def,
            o.uc + rng.range(-halfW, halfW) * 0.7,
            o.vy + halfH - sh / 2 - rng.range(0, 0.1),
            0.26,
            sw,
            sh
          );
        }
      }
    }
  }
}

function pushTrimBox(
  trim: Bucket,
  def: WallDef,
  uc: number,
  vc: number,
  inwardC: number,
  len: number,
  h: number,
  depth: number,
  uvScale: number
): void {
  const { cx, cy, cz, w, hh, d } = worldFromWall(def, uc, vc, inwardC, len, h, depth);
  const geo = chamferedBox(w, hh, d, { chamfer: 0.02, uvScale });
  trim.geos.push(placed(geo, cx, cy, cz));
  geo.dispose();
}

function pushGlass(glass: Bucket, def: WallDef, uc: number, vc: number, inwardC: number, len: number, h: number): void {
  const depth = 0.03;
  const { cx, cy, cz, w, hh, d } = worldFromWall(def, uc, vc, inwardC, len, h, depth);
  const geo = worldBox(w, hh, d, { uvScale: 1 });
  glass.geos.push(placed(geo, cx, cy, cz));
  geo.dispose();
}

// ---------------------------------------------------------------------------
// Bands (plinth / cornice), roof, interior, damage dressing
// ---------------------------------------------------------------------------

function emitBand(
  bucket: Bucket,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y: number,
  h: number,
  proud: number,
  uvScale: number
): void {
  const cy = y + h / 2;
  const ox = x0 - proud;
  const ox1 = x1 + proud;
  const oz = z0 - proud;
  const oz1 = z1 + proud;
  const w = ox1 - ox;
  const d = oz1 - oz;
  const t = 0.26 + proud;
  // Four sides of the band.
  push(bucket, (ox + ox1) / 2, cy, oz + t / 2, w, h, t, uvScale);
  push(bucket, (ox + ox1) / 2, cy, oz1 - t / 2, w, h, t, uvScale);
  push(bucket, ox + t / 2, cy, (oz + oz1) / 2, t, h, d, uvScale);
  push(bucket, ox1 - t / 2, cy, (oz + oz1) / 2, t, h, d, uvScale);
}

function push(b: Bucket, x: number, y: number, z: number, w: number, h: number, d: number, uvScale: number): void {
  const geo = chamferedBox(w, h, d, { chamfer: 0.03, uvScale });
  b.geos.push(placed(geo, x, y, z));
  geo.dispose();
}

function buildRoof(
  env: Build,
  buckets: BucketSet,
  spec: BuildingSpec,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  H: number,
  uvScale: number
): void {
  const roofMat = env.mat('concrete_cast', { tint: 0x9a9186, normalScale: 0.3, key: spec.id + '_roof' });
  const roof = buckets.get(spec.id + 'R', roofMat, 'concrete', true);
  const slab = worldBox(x1 - x0, 0.3, z1 - z0, { uvScale });
  roof.geos.push(placed(slab, (x0 + x1) / 2, H + 0.15, (z0 + z1) / 2));
  slab.dispose();
  // Parapet: a low wall around the roof edge.
  const p = spec.parapetHeight;
  const t = 0.35;
  const trim = buckets.get(spec.id + 'T', env.mat('concrete_cast', { tint: spec.trim, key: spec.id + '_trim' }), 'concrete', true);
  const y = H + 0.3 + p / 2;
  push(trim, (x0 + x1) / 2, y, z0 + t / 2, x1 - x0, p, t, uvScale);
  push(trim, (x0 + x1) / 2, y, z1 - t / 2, x1 - x0, p, t, uvScale);
  push(trim, x0 + t / 2, y, (z0 + z1) / 2, t, p, z1 - z0, uvScale);
  push(trim, x1 - t / 2, y, (z0 + z1) / 2, t, p, z1 - z0, uvScale);
}

function buildInterior(
  env: Build,
  buckets: BucketSet,
  spec: BuildingSpec,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  T: number,
  uvScale: number
): void {
  const floorMat = env.mat('tile_ceramic', { tint: 0xb7ada0, rough: 0.72, normalScale: 0.4, key: spec.id + '_floor' });
  const floor = buckets.get(spec.id + 'FL', floorMat, 'tile', true);
  const wallMat = env.mat('plaster_painted', { tint: 0xcfc6b4, key: spec.id + '_int' });
  const iwall = buckets.get(spec.id + 'IW', wallMat, 'concrete', true);
  const ix0 = x0 + T;
  const ix1 = x1 - T;
  const iz0 = z0 + T;
  const iz1 = z1 - T;
  const iw = ix1 - ix0;
  const id = iz1 - iz0;

  // Stairwell footprint in a back corner (opposite the facing wall).
  const stairX = spec.facing === 'E' ? ix0 + 1.6 : ix1 - 1.6;
  const stairZ = iz0 + 1.8;

  for (let f = 1; f <= spec.floors; f++) {
    const y = f * spec.floorHeight;
    // Floor slab with a stair hole (skip the top "roof" — roof slab already there).
    if (f < spec.floors) {
      emitFloorWithHole(floor, ix0, ix1, iz0, iz1, y, uvScale, stairX, stairZ, 1.6, 2.6);
    }
  }
  // Ground interior tile.
  const g = worldBox(iw, 0.08, id, { uvScale });
  floor.geos.push(placed(g, (ix0 + ix1) / 2, 0.06, (iz0 + iz1) / 2));
  g.dispose();

  // Partition wall per floor with a doorway.
  for (let f = 0; f < spec.floors; f++) {
    const yBase = f * spec.floorHeight;
    const partZ = (iz0 + iz1) / 2 + (f % 2 === 0 ? 2 : -2);
    // Two segments leaving a 1.1m doorway near one third.
    const doorU = ix0 + iw * 0.62;
    const segAw = doorU - 0.55 - ix0;
    const segBw = ix1 - (doorU + 0.55);
    if (segAw > 0.4) {
      const geo = worldBox(segAw, spec.floorHeight - 0.3, 0.24, { uvScale });
      iwall.geos.push(placed(geo, ix0 + segAw / 2, yBase + (spec.floorHeight - 0.3) / 2, partZ));
      geo.dispose();
    }
    if (segBw > 0.4) {
      const geo = worldBox(segBw, spec.floorHeight - 0.3, 0.24, { uvScale });
      iwall.geos.push(placed(geo, ix1 - segBw / 2, yBase + (spec.floorHeight - 0.3) / 2, partZ));
      geo.dispose();
    }
  }

  // Staircase: a run of steps to the first floor.
  const stepMat = env.mat('concrete_cast', { tint: 0xa39a8c, key: spec.id + '_step' });
  const steps = buckets.get(spec.id + 'ST', stepMat, 'concrete', true);
  const nSteps = Math.round(spec.floorHeight / 0.2);
  const dir = spec.facing === 'E' ? 1 : -1;
  for (let i = 0; i < nSteps; i++) {
    const sy = (i + 0.5) * (spec.floorHeight / nSteps);
    const sz = stairZ + i * (2.4 / nSteps);
    const geo = worldBox(1.3, sy + 0.1, 0.55, { uvScale });
    steps.geos.push(placed(geo, stairX + dir * 0.2, (sy + 0.1) / 2, sz));
    geo.dispose();
    void sz;
  }
}

function emitFloorWithHole(
  floor: Bucket,
  ix0: number,
  ix1: number,
  iz0: number,
  iz1: number,
  y: number,
  uvScale: number,
  holeX: number,
  holeZ: number,
  holeW: number,
  holeD: number
): void {
  // Decompose the slab into up to 4 rectangles around the hole.
  const hx0 = holeX - holeW / 2;
  const hx1 = holeX + holeW / 2;
  const hz0 = holeZ - holeD / 2;
  const hz1 = holeZ + holeD / 2;
  const th = 0.24;
  const rects: [number, number, number, number][] = [
    [ix0, ix1, iz0, hz0],
    [ix0, ix1, hz1, iz1],
    [ix0, hx0, hz0, hz1],
    [hx1, ix1, hz0, hz1],
  ];
  for (const [ax0, ax1, az0, az1] of rects) {
    const w = ax1 - ax0;
    const d = az1 - az0;
    if (w < 0.05 || d < 0.05) continue;
    const geo = worldBox(w, th, d, { uvScale });
    floor.geos.push(placed(geo, (ax0 + ax1) / 2, y - th / 2, (az0 + az1) / 2));
    geo.dispose();
  }
}

function buildDamageDressing(
  env: Build,
  spec: BuildingSpec,
  dmg: NonNullable<BuildingSpec['damage']>,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  H: number,
  rubble: Bucket,
  rebar: Bucket,
  rng: Rng
): void {
  // Determine the shelled wall's outward direction and base line.
  const side = dmg.side;
  const along = side === 'E' || side === 'W' ? 'z' : 'x';
  const faceX = side === 'E' ? x1 : side === 'W' ? x0 : (x0 + x1) / 2;
  const faceZ = side === 'S' ? z1 : side === 'N' ? z0 : (z0 + z1) / 2;
  const outX = side === 'E' ? 1 : side === 'W' ? -1 : 0;
  const outZ = side === 'S' ? 1 : side === 'N' ? -1 : 0;

  // Rubble spill at the wall base, pooling outward.
  const spanMin = along === 'z' ? z0 + 1 : x0 + 1;
  const spanMax = along === 'z' ? z1 - 1 : x1 - 1;
  const count = Math.round(10 + dmg.severity * 26);
  for (let i = 0; i < count; i++) {
    const u = rng.range(spanMin, spanMax);
    const out = rng.range(0.2, 2.6 + dmg.severity * 2.2);
    const bx = (along === 'z' ? faceX : u) + outX * out;
    const bz = (along === 'z' ? u : faceZ) + outZ * out;
    const s = rng.range(0.14, 0.5);
    const geo = chamferedBox(s, s * rng.range(0.5, 0.9), s * rng.range(0.7, 1.2), {
      chamfer: 0.03,
      uvScale: env.uv('debris'),
    });
    rubble.geos.push(
      placed(geo, bx, s * 0.35 + rng.range(0, 0.15), bz, rng.range(0, Math.PI), rng.range(-0.3, 0.3), rng.range(-0.3, 0.3))
    );
    geo.dispose();
  }

  // Exposed rebar bars poking out of the top of the shelled wall.
  if (dmg.collapseCorner || dmg.severity > 0.5) {
    const bars = Math.round(4 + dmg.severity * 6);
    for (let i = 0; i < bars; i++) {
      const u = rng.range(spanMin, spanMax);
      const bx = along === 'z' ? faceX + outX * 0.1 : u;
      const bz = along === 'z' ? u : faceZ + outZ * 0.1;
      const len = rng.range(0.6, 1.3);
      const geo = worldCylinder(0.015, 0.015, len, 5, env.uv('metal_rusted'), false);
      const topY = rng.range(H - spec.floorHeight, H - 0.2);
      rebar.geos.push(
        placed(geo, bx, topY, bz, rng.range(0, Math.PI), rng.range(-0.5, 0.5), rng.range(-0.5, 0.5))
      );
      geo.dispose();
    }
  }
}

// ---------------------------------------------------------------------------
// Nav / cover integration
// ---------------------------------------------------------------------------

function pushWallSolids(env: Build, def: WallDef): void {
  // A wall becomes 1..n thick slabs, split around ground-level door openings so
  // AI can path through doorways.
  const uHalf = def.length / 2;
  const doorSpans: [number, number][] = [];
  for (const o of def.openings) {
    if (o.kind === 'door' || (o.kind === 'shell' && o.vy - o.vh / 2 < 0.6)) {
      doorSpans.push([o.uc - o.uw / 2, o.uc + o.uw / 2]);
    }
  }
  doorSpans.sort((a, b) => a[0] - b[0]);
  const segments: [number, number][] = [];
  let cursor = -uHalf;
  for (const [d0, d1] of doorSpans) {
    if (d0 > cursor + 0.1) segments.push([cursor, d0]);
    cursor = Math.max(cursor, d1);
  }
  if (cursor < uHalf - 0.1) segments.push([cursor, uHalf]);

  for (const [s0, s1] of segments) {
    const uc = (s0 + s1) / 2;
    const len = s1 - s0;
    const box = worldFromWall(def, uc, def.height / 2, def.thickness / 2, len, def.height, def.thickness);
    const solid: Solid = {
      minX: box.cx - box.w / 2,
      maxX: box.cx + box.w / 2,
      minZ: box.cz - box.d / 2,
      maxZ: box.cz + box.d / 2,
      minY: 0,
      maxY: def.height,
    };
    env.solids.push(solid);
  }
}

function addWallCover(env: Build, spec: BuildingSpec, facing: 'E' | 'W'): void {
  // Cover crouched behind the plinth/sill line along the street-facing wall.
  const faceX = facing === 'E' ? spec.cx + spec.w / 2 : spec.cx - spec.w / 2;
  const out = facing === 'E' ? 1 : -1;
  const n = 4;
  for (let i = 0; i < n; i++) {
    const z = spec.cz - spec.d / 2 + spec.d * ((i + 0.5) / n);
    env.covers.push({
      pos: new THREE.Vector3(faceX + out * 0.8, 0, z),
      normal: new THREE.Vector3(out, 0, 0),
      low: false,
    });
  }
}

function wallSurface(wall: BuildingSpec['wall']): SurfaceType {
  return wall === 'brick' ? 'concrete' : 'concrete';
}

function clampN(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}
