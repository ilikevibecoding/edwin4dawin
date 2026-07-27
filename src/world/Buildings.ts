/**
 * Buildings.ts — multi-storey facades, interiors, roofs and battle damage.
 *
 * Facades are NOT solid boxes: every wall is decomposed around its window and
 * door openings so the openings are real holes you can see and shoot through.
 * Each opening gets recessed reveals, a protruding sill and lintel, and — per
 * opening — real glass (transmissive hero panes near the player, cheap
 * reflective dark panes in the distance), timber boards, bricked-up infill or
 * a hanging cloth. Plinths, cornices and parapets add the horizontal banding
 * real masonry has, and ground-floor shopfronts, balconies and exposed-brick
 * patches break the repeating grid.
 *
 * Damage is concentrated and directional: the shelled side and the street-
 * facing side take large shell holes with spilled rubble and exposed rebar,
 * dense bullet-pock clusters around openings, blackened scorch fans venting
 * out of windows, and — where specified — a whole corner sheared off exposing
 * the interior floor slabs in cross-section.
 *
 * Geometry is bucketed by material and merged, so the whole city is a few dozen
 * draw calls. Glass, scorch, pockmarks, timber, cloth and exposed brick are
 * shared across ALL buildings and flushed once. The solid wall buckets double
 * as collision proxies and thin wall AABBs feed the nav/LoS grids.
 */

import * as THREE from 'three';
import type { SurfaceType } from '../core/Contracts';
import type { Rng } from '../core/MathX';
import type { Build, BuildingSpec, LevelPlan } from './Blockout';
import { worldBox, chamferedBox, worldCylinder, placed, mergeAll, tagSurface, freeze } from './GeometryKit';

type Treat = 'glass' | 'board' | 'brick' | 'cloth' | 'open';

interface Opening {
  /** Centre along wall length (metres from wall centre). */
  uc: number;
  uw: number;
  /** Centre height (world Y) and height. */
  vy: number;
  vh: number;
  kind: 'window' | 'door' | 'shell' | 'shop';
  /** How the window is filled. */
  treat?: Treat;
  /** Arched head. */
  arch?: boolean;
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

  flush(name: string): void {
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
      if (b.collider) this.env.colliders.push(mesh);
    }
    this.map.clear();
  }
}

/**
 * Shared, city-wide accumulators for the "dressing" layers that use one common
 * material each, so glass / scorch / pockmarks / timber / cloth / brick each
 * cost a single merged draw call for the whole map.
 */
class Decor {
  hero: THREE.BufferGeometry[] = [];
  dark: THREE.BufferGeometry[] = [];
  scorch: THREE.BufferGeometry[] = [];
  bullet: THREE.BufferGeometry[] = [];
  board: THREE.BufferGeometry[] = [];
  cloth: THREE.BufferGeometry[] = [];
  awning: THREE.BufferGeometry[] = [];
  brick: THREE.BufferGeometry[] = [];
  block: THREE.BufferGeometry[] = [];
  shutter: THREE.BufferGeometry[] = [];
  rebar: THREE.BufferGeometry[] = [];
  rubble: THREE.BufferGeometry[] = [];
  constructor(private env: Build) {}

  flush(): void {
    const e = this.env;
    this.emit(this.dark, e.windowDark(), 'glass', 'windows_dark', false, false, false, 0);
    this.emit(this.hero, e.glassHero(), 'glass', 'windows_hero', false, false, false, 0);
    this.emit(this.brick, e.mat('brick_clay', { tint: 0x7f7364, rough: 0.98, key: 'exposedbrick' }), 'concrete', 'exposed_brick', true, true, true, 0);
    this.emit(this.block, e.mat('concrete_rough', { tint: 0x938a7c, rough: 0.97, normalScale: 0.5, key: 'infillblock' }), 'concrete', 'infill_block', true, true, true, 0);
    this.emit(this.shutter, e.mat('corrugated_metal', { tint: 0x8f8578, normalScale: 0.8, key: 'shutter' }), 'metal', 'shutters', true, true, true, 0);
    this.emit(this.board, e.mat('wood_plank', { tint: 0x6e5636, key: 'boards' }), 'wood', 'boards', false, true, true, 0);
    this.emit(this.cloth, e.mat('fabric_camo', { tint: 0xb8afa0, rough: 0.96, key: 'sheeting' }), 'fabric', 'sheeting', false, true, true, 0);
    this.emit(this.awning, e.mat('fabric_camo', { tint: 0xa8483a, rough: 0.95, key: 'awning' }), 'fabric', 'awnings', false, true, true, 0);
    this.emit(this.rebar, e.mat('metal_rusted', { key: 'rebar' }), 'metal', 'rebar', false, false, true, 0);
    this.emit(this.rubble, e.mat('rubble', { tint: 0x9a8f80, key: 'facade_rubble' }), 'gravel', 'facade_rubble', false, true, true, 0);
    this.emit(this.scorch, e.decal('scorch'), 'concrete', 'scorch', false, false, false, 2);
    this.emit(this.bullet, e.decal('bullet_hole'), 'concrete', 'pockmarks', false, false, false, 2);
  }

  private emit(
    geos: THREE.BufferGeometry[],
    mat: THREE.Material,
    surface: SurfaceType,
    name: string,
    collider: boolean,
    cast: boolean,
    recv: boolean,
    renderOrder: number
  ): void {
    if (geos.length === 0) return;
    const geo = mergeAll(geos);
    for (const g of geos) g.dispose();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = recv;
    mesh.renderOrder = renderOrder;
    tagSurface(mesh, surface, collider);
    freeze(mesh);
    this.env.root.add(mesh);
    this.env.own(geo);
    if (collider) this.env.colliders.push(mesh);
  }
}

// ---------------------------------------------------------------------------

export function buildBuildings(env: Build, plan: LevelPlan): void {
  const decor = new Decor(env);
  for (const spec of plan.buildings) buildOne(env, spec, decor);
  buildMinaret(env, plan.minaret);
  decor.flush();
}

function facadeMat(env: Build, spec: BuildingSpec): THREE.Material {
  const kind = spec.wall === 'brick' ? 'brick_clay' : spec.wall === 'plaster' ? 'plaster_painted' : 'concrete_rough';
  return env.mat(kind, { tint: spec.tint, key: spec.id + '_facade' });
}

function buildOne(env: Build, spec: BuildingSpec, decor: Decor): void {
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

  const facadeKey = spec.id + 'F';
  const facadeBucket = () => buckets.get(facadeKey, facade, 'concrete', true);
  const trimBucket = () => buckets.get(spec.id + 'T', trimMat, 'concrete', true);

  const uvOff: [number, number] = [rng.range(0, 4), rng.range(0, 2)];

  const facingSide: 'E' | 'W' = spec.facing;
  const damaged = spec.damage;
  // Hero glass only for the primary sightline buildings (near the street,
  // between spawn and the crater) and only on their lower floors.
  const heroBuilding = spec.cz > -14 && spec.cz < 34;

  // Build the four walls.
  const walls: { side: 'N' | 'S' | 'E' | 'W'; def: WallDef }[] = [];
  walls.push({ side: 'E', def: mkWall('z', spec.cz, x1, +1, spec.d, H, T) });
  walls.push({ side: 'W', def: mkWall('z', spec.cz, x0, -1, spec.d, H, T) });
  walls.push({ side: 'S', def: mkWall('x', spec.cx, z1, +1, spec.w, H, T) });
  walls.push({ side: 'N', def: mkWall('x', spec.cx, z0, -1, spec.w, H, T) });

  const facingWall = walls.find((w) => w.side === facingSide)!;

  for (const w of walls) {
    const isFacing = w.side === facingSide;
    const isBack = (facingSide === 'E' && w.side === 'W') || (facingSide === 'W' && w.side === 'E');
    w.def.detail = !isBack || spec.enterable;
    populateOpenings(w.def, spec, isFacing, rng);
    if (damaged && damaged.side === w.side) addDamageOpenings(w.def, spec, damaged, rng);
    // Directional front damage: buildings in the shelled southern half also take
    // hits on their STREET-facing wall so the money shots read as a battle.
    if (isFacing && damaged && spec.cz < 34) addFrontDamage(w.def, spec, damaged.severity, rng);
  }

  // Ground-floor shopfront on the facing wall (clears its ground windows first).
  if (spec.shopfront) addShopfront(facingWall.def, spec);
  // Sheared corner: punch the upper floors out at the near (south) street corner,
  // exposing the interior floor slabs in cross-section.
  const collapse = damaged?.collapseCorner ? planCornerCollapse(spec, walls) : null;

  // Emit walls.
  for (const w of walls) {
    const isFacing = w.side === facingSide;
    emitWall(w.def, facadeBucket(), facadeUv, uvOff);
    if (w.def.detail) {
      emitOpeningTrim(w.def, spec, trimBucket(), decor, concreteUv, isFacing && heroBuilding, rng);
    }
    pushWallSolids(env, w.def);
  }

  // Plinth (base course) + cornice banding.
  emitBand(trimBucket(), x0, x1, z0, z1, 0, 0.55, 0.14, concreteUv);
  emitBand(trimBucket(), x0, x1, z0, z1, H - 0.45, 0.45, 0.22, concreteUv);

  // Roof slab + parapet (with an optional collapse notch).
  buildRoof(env, buckets, spec, x0, x1, z0, z1, H, concreteUv, collapse, decor);

  // Interior.
  const needInterior = spec.enterable || (damaged?.severity ?? 0) >= 0.5;
  if (needInterior) buildInterior(env, buckets, spec, x0, x1, z0, z1, T, concreteUv, decor, rng);

  // Facade dressing.
  if (spec.exposedBrick) addExposedBrick(facingWall.def, spec, decor, rng);
  if (spec.balconies) addBalconies(env, buckets, facingWall.def, spec, rng);
  addFacadeScars(facingWall.def, spec, decor, rng);
  if (collapse) dressCornerCollapse(env, spec, collapse, decor, rng);

  // Damage dressing: rubble spill + rebar + collapsed top floor on the shelled side.
  if (damaged) {
    const rubbleMat = env.mat('rubble', { tint: 0x9c9184, key: 'rubble' });
    const rebarMat = env.mat('metal_rusted', { key: 'rebar' });
    const rubbleBucket = buckets.get('rubble', rubbleMat, 'gravel', false, false, true);
    const rebarBucket = buckets.get('rebar', rebarMat, 'metal', false);
    buildDamageDressing(env, spec, damaged, x0, x1, z0, z1, H, rubbleBucket, rebarBucket, rng);
  }

  buckets.flush(spec.id);

  if (spec.enterable) {
    env.interiors.push(new THREE.Box3(new THREE.Vector3(x0 + T, 0.1, z0 + T), new THREE.Vector3(x1 - T, H, z1 - T)));
  }
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

function populateOpenings(def: WallDef, spec: BuildingSpec, facing: boolean, rng: Rng): void {
  const L = def.length;
  const inset = 1.6;
  const usable = L - inset * 2;
  const nWin = Math.max(2, Math.min(6, Math.floor(usable / 3.0)));
  const gap = usable / nWin;
  // Irregular window widths per floor break the mechanical grid.
  const doorFloorOnly = facing;

  for (let f = 0; f < spec.floors; f++) {
    const floorBase = f * spec.floorHeight;
    const sillY = floorBase + 0.95;
    // Vary window height/sill a touch per floor (added-on / mismatched floors).
    const winH = 1.55 + (f === spec.floors - 1 ? rng.range(-0.2, 0.15) : rng.range(-0.1, 0.1));
    for (let i = 0; i < nWin; i++) {
      const uc = -usable / 2 + gap * (i + 0.5);
      if (doorFloorOnly && f === 0 && Math.abs(uc) < gap * 0.55) {
        def.openings.push({ uc, uw: 1.5, vy: 0.05 + 2.35 / 2, vh: 2.35, kind: 'door' });
        continue;
      }
      // Occasionally skip an opening entirely (blank wall section).
      if (rng.chance(0.08)) continue;
      const winW = Math.min(1.5, gap * 0.5) * rng.range(0.82, 1.12);
      let treat: Treat = 'glass';
      const r = rng();
      const topFloor = f >= spec.floors - 1;
      if (r < 0.06) treat = 'brick'; // bricked-up
      else if (r < 0.2) treat = 'board'; // boarded up
      // Blown-out / cloth-hung openings only on the street-facing wall: on side
      // and back walls a real hole would look straight through to the garish
      // sunlit wall of the building across the alley, so those stay dark-glazed.
      else if (facing && r < 0.2 + (topFloor ? 0.34 : 0.14)) {
        treat = rng.chance(0.45) ? 'cloth' : 'open'; // blown out, maybe sheeting
      }
      // Reflective glass reflects the (un-occluded) bright sky IBL even indoors,
      // so on the side/back walls of enterable buildings it glows as a garish
      // orange pane from inside. Board or block those up instead — matte, and it
      // reads as a shuttered war-time interior.
      if (!facing && spec.enterable && treat === 'glass') {
        treat = rng.chance(0.5) ? 'board' : 'brick';
      }
      def.openings.push({
        uc: uc + rng.range(-0.06, 0.06),
        uw: winW,
        vy: sillY + winH / 2,
        vh: winH,
        kind: 'window',
        treat,
        arch: spec.arches === true && rng.chance(0.7),
      });
    }
  }
}

function addShopfront(def: WallDef, spec: BuildingSpec): void {
  // Clear the ground-floor windows/door in the central bays, replace with a
  // wide recessed shop opening (rendered as a roller shutter + awning).
  def.openings = def.openings.filter((o) => !(o.vy - o.vh / 2 < spec.floorHeight * 0.85));
  const bays = Math.min(3, Math.max(2, Math.floor(def.length / 5)));
  const span = def.length - 4;
  const bayW = span / bays;
  for (let i = 0; i < bays; i++) {
    const uc = -span / 2 + bayW * (i + 0.5);
    def.openings.push({ uc, uw: bayW - 0.7, vy: 0.05 + 1.35, vh: 2.7, kind: 'shop' });
  }
}

function addDamageOpenings(def: WallDef, spec: BuildingSpec, dmg: NonNullable<BuildingSpec['damage']>, rng: Rng): void {
  const holes = Math.round(1 + dmg.severity * 3);
  for (let i = 0; i < holes; i++) {
    const f = Math.min(spec.floors - 1, Math.floor(rng.range(0.4, spec.floors - 0.2)));
    const floorBase = f * spec.floorHeight;
    def.openings.push({
      uc: rng.range(-def.length / 2 + 2, def.length / 2 - 2),
      uw: rng.range(1.8, 3.4),
      vy: floorBase + rng.range(1.4, 2.4),
      vh: rng.range(1.8, 2.6),
      kind: 'shell',
    });
  }
}

function addFrontDamage(def: WallDef, spec: BuildingSpec, severity: number, rng: Rng): void {
  // Large shell holes punched through the upper facade, biased toward one side
  // (directional shelling) so it reads as a story, not random sprinkling.
  const holes = Math.max(3, Math.round(severity * 5));
  const bias = rng.sign();
  for (let i = 0; i < holes; i++) {
    // Spread hits across all floors including the first so the wound is plainly
    // in the eye-level sightline, not only up near the parapet.
    const f = Math.min(spec.floors - 1, Math.max(0, Math.round(rng.range(spec.floors * 0.15, spec.floors - 0.1))));
    const floorBase = f * spec.floorHeight;
    def.openings.push({
      uc: rng.range(0, def.length / 2 - 2) * bias + rng.range(-1.8, 1.8),
      uw: rng.range(2.2, 4.0),
      vy: floorBase + rng.range(1.2, 2.4),
      vh: rng.range(2.0, 3.0),
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
        emitWallBox(bucket, def, (runStart + u1) / 2, vc, u1 - runStart, vh, def.thickness, uvScale, uvOff);
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
  const { cx, cy, cz, w, hh, d } = worldFromWall(def, uc, vc, depth / 2, len, h, depth);
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
    return { cx: def.faceCoord - def.outSign * inwardCenter, cy: vc, cz: def.spanCenter + uc, w: depth, hh: h, d: len };
  }
  return { cx: def.spanCenter + uc, cy: vc, cz: def.faceCoord - def.outSign * inwardCenter, w: len, hh: h, d: depth };
}

// ---------------------------------------------------------------------------
// Opening trim: reveals, sills, lintels, glass, boards, brick, cloth, shopfronts
// ---------------------------------------------------------------------------

function emitOpeningTrim(def: WallDef, spec: BuildingSpec, trim: Bucket, decor: Decor, uvScale: number, hero: boolean, rng: Rng): void {
  for (const o of def.openings) {
    if (o.kind === 'shell') continue;
    if (o.kind === 'shop') {
      emitShopfront(def, o, trim, decor, uvScale, rng);
      continue;
    }
    const revealDepth = 0.34;
    const halfW = o.uw / 2;
    const halfH = o.vh / 2;
    const inwardC = revealDepth / 2 + 0.02;
    for (const s of [-1, 1]) {
      pushTrimBox(trim, def, o.uc + s * (halfW + 0.06), o.vy, inwardC, 0.12, o.vh + 0.12, revealDepth, uvScale);
    }
    pushTrimBox(trim, def, o.uc, o.vy + halfH + 0.06, inwardC, o.uw + 0.24, 0.12, revealDepth, uvScale);
    pushTrimBox(trim, def, o.uc, o.vy + halfH + 0.16, -0.06, o.uw + 0.4, 0.22, 0.16, uvScale);
    // Arched head voussoir.
    if (o.arch) {
      for (const [ah, aw] of [
        [0.24, o.uw + 0.05],
        [0.42, o.uw - 0.45],
      ] as [number, number][]) {
        if (aw <= 0.1) continue;
        pushTrimBox(trim, def, o.uc, o.vy + halfH + 0.06 + ah, -0.02, aw, 0.16, 0.2, uvScale);
      }
    }

    if (o.kind === 'door') {
      pushTrimBox(trim, def, o.uc, o.vy - halfH + 0.06, -0.02, o.uw + 0.3, 0.12, 0.24, uvScale);
      continue;
    }
    // Sill protrudes below the window.
    pushTrimBox(trim, def, o.uc, o.vy - halfH - 0.04, -0.05, o.uw + 0.34, 0.12, 0.26, uvScale);

    const treat = o.treat ?? 'glass';
    if (treat === 'glass') {
      pushPane(hero && o.vy < 8 ? decor.hero : decor.dark, def, o.uc, o.vy, 0.28, o.uw - 0.04, o.vh - 0.04);
    } else if (treat === 'brick') {
      // Bricked-up infill set back in the reveal — mismatched grey block/breeze
      // fill (reads as a later repair, not fresh red brick).
      pushInfill(decor.block, def, o.uc, o.vy, 0.22, o.uw - 0.02, o.vh - 0.02, 0.14, uvScale);
    } else if (treat === 'board') {
      pushBoards(decor.board, def, o.uc, o.vy, o.uw, o.vh, rng);
      // A dark void behind the boards.
      pushPane(decor.dark, def, o.uc, o.vy, 0.3, o.uw - 0.04, o.vh - 0.04);
    } else if (treat === 'cloth') {
      pushCloth(decor.cloth, def, o.uc, o.vy, o.uw, o.vh, rng);
    } else {
      // 'open' — blown out. A few shards clinging to the frame.
      if (rng.chance(0.7)) {
        for (let i = 0; i < 3; i++) {
          pushPane(
            decor.dark,
            def,
            o.uc + rng.range(-halfW, halfW) * 0.7,
            o.vy + halfH - rng.range(0.1, 0.4),
            0.26,
            rng.range(0.1, 0.3),
            rng.range(0.2, 0.5)
          );
        }
      }
    }
  }
}

function emitShopfront(def: WallDef, o: Opening, trim: Bucket, decor: Decor, uvScale: number, rng: Rng): void {
  const halfW = o.uw / 2;
  const halfH = o.vh / 2;
  // Heavy frame around the shop opening.
  for (const s of [-1, 1]) pushTrimBox(trim, def, o.uc + s * (halfW + 0.12), o.vy, 0.18, 0.24, o.vh + 0.3, 0.5, uvScale);
  pushTrimBox(trim, def, o.uc, o.vy + halfH + 0.12, 0.18, o.uw + 0.6, 0.24, 0.5, uvScale);
  // Roller shutter (partly rolled down, sometimes buckled/half-open).
  const closed = rng.range(0.35, 1.0);
  const shH = o.vh * closed;
  pushInfill(decor.shutter, def, o.uc, o.vy - halfH + shH / 2, 0.16, o.uw, shH, 0.06, uvScale);
  if (closed < 0.95) {
    // Dark interior visible below a raised shutter.
    pushPane(decor.dark, def, o.uc, o.vy - halfH + (shH + (o.vh - shH) / 2) - 0.02, 0.34, o.uw - 0.1, o.vh - shH - 0.05);
  }
  // Awning: sloped fabric sheet cantilevered over the front.
  pushAwning(decor.awning, def, o.uc, o.vy + halfH + 0.35, o.uw + 0.9);
}

function pushTrimBox(trim: Bucket, def: WallDef, uc: number, vc: number, inwardC: number, len: number, h: number, depth: number, uvScale: number): void {
  const { cx, cy, cz, w, hh, d } = worldFromWall(def, uc, vc, inwardC, len, h, depth);
  const geo = chamferedBox(w, hh, d, { chamfer: 0.02, uvScale });
  trim.geos.push(placed(geo, cx, cy, cz));
  geo.dispose();
}

/** A flat pane (glass / dark window) recessed into the reveal. */
function pushPane(arr: THREE.BufferGeometry[], def: WallDef, uc: number, vc: number, inwardC: number, len: number, h: number): void {
  const { cx, cy, cz, w, hh, d } = worldFromWall(def, uc, vc, inwardC, len, h, 0.03);
  const geo = worldBox(w, hh, d, { uvScale: Math.max(w, hh, d) });
  arr.push(placed(geo, cx, cy, cz));
  geo.dispose();
}

/** A solid infill slab (bricked-up window, roller shutter) set into the reveal. */
function pushInfill(arr: THREE.BufferGeometry[], def: WallDef, uc: number, vc: number, inwardC: number, len: number, h: number, depth: number, uvScale: number): void {
  const { cx, cy, cz, w, hh, d } = worldFromWall(def, uc, vc, inwardC, len, h, depth);
  const geo = chamferedBox(w, hh, d, { chamfer: 0.015, uvScale });
  arr.push(placed(geo, cx, cy, cz));
  geo.dispose();
}

function pushBoards(arr: THREE.BufferGeometry[], def: WallDef, uc: number, vc: number, uw: number, vh: number, rng: Rng): void {
  const n = 3;
  for (let i = 0; i < n; i++) {
    const yy = vc - vh / 2 + vh * ((i + 0.5) / n) + rng.range(-0.05, 0.05);
    const tilt = rng.range(-0.08, 0.08);
    const geo = plankGeo(def, uc, yy, 0.16, uw + 0.2, 0.14, tilt);
    arr.push(geo);
  }
}

/** A single board across an opening, tilted by `tilt` radians in the wall plane. */
function plankGeo(def: WallDef, uc: number, vc: number, inwardC: number, len: number, h: number, tilt: number): THREE.BufferGeometry {
  const { cx, cy, cz, w, hh, d } = worldFromWall(def, uc, vc, inwardC, len, h, 0.06);
  const geo = chamferedBox(w, hh, d, { chamfer: 0.01, uvScale: 1.2 });
  // Tilt about the wall-normal axis so the board stays in the facade plane.
  const rx = def.axis === 'z' ? tilt : 0;
  const rz = def.axis === 'x' ? tilt : 0;
  return placed(geo, cx, cy, cz, 0, rx, rz);
}

function pushCloth(arr: THREE.BufferGeometry[], def: WallDef, uc: number, vc: number, uw: number, vh: number, rng: Rng): void {
  // A limp sheet hanging out of the opening, drooping outward.
  const segs = 4;
  const width = uw * rng.range(0.7, 0.95);
  const topY = vc + vh / 2 - 0.1;
  const drop = vh * rng.range(0.8, 1.2);
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const outN = def.axis === 'z' ? [def.outSign, 0, 0] : [0, 0, def.outSign];
  const worldAt = (lu: number, ly: number, out: number): [number, number, number] => {
    const { cx, cy, cz } = worldFromWall(def, lu, ly, -out, 0.001, 0.001, 0.001);
    return [cx, cy, cz];
  };
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const y0 = topY - drop * t0;
    const y1 = topY - drop * t1;
    const out0 = 0.12 + Math.sin(t0 * Math.PI) * 0.28;
    const out1 = 0.12 + Math.sin(t1 * Math.PI) * 0.28;
    const a = worldAt(uc - width / 2, y0, out0);
    const b = worldAt(uc + width / 2, y0, out0);
    const c = worldAt(uc + width / 2, y1, out1);
    const dd = worldAt(uc - width / 2, y1, out1);
    quad(pos, nor, uv, a, b, c, dd, outN);
  }
  arr.push(bufFrom(pos, nor, uv));
}

function pushAwning(arr: THREE.BufferGeometry[], def: WallDef, uc: number, vc: number, uw: number): void {
  // A sloped fabric sheet cantilevered outward and down over a shopfront.
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const outN = def.axis === 'z' ? [def.outSign, 0, 0] : [0, 0, def.outSign];
  const worldAt = (lu: number, ly: number, out: number): [number, number, number] => {
    const { cx, cy, cz } = worldFromWall(def, lu, ly, -out, 0.001, 0.001, 0.001);
    return [cx, cy, cz];
  };
  const backY = vc;
  const frontY = vc - 0.8;
  const a = worldAt(-uw / 2 + uc, backY, 0.05);
  const b = worldAt(uw / 2 + uc, backY, 0.05);
  const c = worldAt(uw / 2 + uc, frontY, 1.5);
  const dd = worldAt(-uw / 2 + uc, frontY, 1.5);
  quad(pos, nor, uv, a, b, c, dd, outN);
  // Front valance (hanging scalloped edge).
  const e = worldAt(-uw / 2 + uc, frontY, 1.5);
  const f = worldAt(uw / 2 + uc, frontY, 1.5);
  const g = worldAt(uw / 2 + uc, frontY - 0.5, 1.46);
  const h = worldAt(-uw / 2 + uc, frontY - 0.5, 1.46);
  quad(pos, nor, uv, e, f, g, h, outN);
  arr.push(bufFrom(pos, nor, uv));
}

// ---------------------------------------------------------------------------
// Facade scars: scorch fans + bullet pockmark clusters (decals)
// ---------------------------------------------------------------------------

function addFacadeScars(def: WallDef, spec: BuildingSpec, decor: Decor, rng: Rng): void {
  const topY = spec.floors * spec.floorHeight - 0.2;
  for (const o of def.openings) {
    if (o.kind === 'shop') continue;
    // Scorch fan venting up out of shell holes and (some) blown windows.
    const vented = o.kind === 'shell' || o.treat === 'open' || o.treat === 'cloth';
    if (vented && o.uw < 4 && rng.chance(o.kind === 'shell' ? 0.95 : 0.6)) {
      const fanW = o.uw + rng.range(1.0, 2.0);
      const base = o.vy + o.vh / 2 - 0.5; // start just below the opening head
      // Clamp the fan so soot stays on the wall and never floats above the roof.
      const fanTop = Math.min(base + rng.range(3.0, 4.8), topY);
      const fanH = fanTop - base;
      if (fanH > 0.7) decor.scorch.push(facadeQuad(def, o.uc, base + fanH / 2, fanW, fanH, 0.05));
    }
    // Dense bullet-pock cluster around window/door frames — big enough to read
    // at gameplay distance.
    const clusters = o.kind === 'door' ? 14 : o.kind === 'window' ? 10 : 6;
    for (let i = 0; i < clusters; i++) {
      if (rng.chance(0.22)) continue;
      const pu = o.uc + rng.range(-o.uw / 2 - 0.8, o.uw / 2 + 0.8);
      const pv = o.vy + rng.range(-o.vh / 2 - 0.7, o.vh / 2 + 0.7);
      const s = rng.range(0.3, 0.66);
      decor.bullet.push(facadeQuad(def, pu, pv, s, s, 0.03));
    }
  }
  // Extra strafing bands of pockmarks across the lower facing wall.
  const bands = Math.round((spec.damage?.severity ?? 0) * 22);
  for (let i = 0; i < bands; i++) {
    const s = rng.range(0.3, 0.62);
    decor.bullet.push(facadeQuad(def, rng.range(-def.length / 2 + 1, def.length / 2 - 1), rng.range(0.8, spec.floorHeight * 1.9), s, s, 0.03));
  }
}

/** A single outward-facing quad on a wall face (for decals). UVs 0..1. */
function facadeQuad(def: WallDef, uc: number, vc: number, w: number, h: number, proud: number): THREE.BufferGeometry {
  const outN: [number, number, number] = def.axis === 'z' ? [def.outSign, 0, 0] : [0, 0, def.outSign];
  const worldAt = (lu: number, ly: number): [number, number, number] => {
    const { cx, cy, cz } = worldFromWall(def, lu, ly, -proud, 0.001, 0.001, 0.001);
    return [cx, cy, cz];
  };
  const a = worldAt(uc - w / 2, vc - h / 2);
  const b = worldAt(uc + w / 2, vc - h / 2);
  const c = worldAt(uc + w / 2, vc + h / 2);
  const d = worldAt(uc - w / 2, vc + h / 2);
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  // Explicit 0..1 UVs so the decal isn't tiled.
  pushUvQuad(pos, nor, uv, a, b, c, d, outN);
  return bufFrom(pos, nor, uv);
}

// ---------------------------------------------------------------------------
// Exposed brick where plaster has fallen away
// ---------------------------------------------------------------------------

function addExposedBrick(def: WallDef, spec: BuildingSpec, decor: Decor, rng: Rng): void {
  const patches = 3 + Math.round((spec.damage?.severity ?? 0) * 4);
  // Keep patches on SOLID wall only: a patch straddling a window hole shows its
  // brick slab through the opening from inside, reading as a fake red pane.
  const clearOfOpenings = (uc: number, vc: number, w: number, h: number): boolean => {
    for (const o of def.openings) {
      if (
        Math.abs(uc - o.uc) < (w + o.uw) / 2 + 0.35 &&
        Math.abs(vc - o.vy) < (h + o.vh) / 2 + 0.35
      )
        return false;
    }
    return true;
  };
  let count = 0;
  for (let attempt = 0; attempt < patches * 6 && count < patches; attempt++) {
    const w = rng.range(1.0, 2.6);
    const h = rng.range(1.2, 2.8);
    const uc = rng.range(-def.length / 2 + 1, def.length / 2 - 1);
    const vc = rng.range(1.2, spec.floors * spec.floorHeight - 1.5);
    if (!clearOfOpenings(uc, vc, w, h)) continue;
    // Set the brick just behind the plaster face so it reads as a fall-off scar.
    pushInfill(decor.brick, def, uc, vc, 0.06, w, h, 0.12, env_uv_brick(2));
    count++;
  }
}

// ---------------------------------------------------------------------------
// Balconies
// ---------------------------------------------------------------------------

function addBalconies(env: Build, buckets: BucketSet, def: WallDef, spec: BuildingSpec, rng: Rng): void {
  const railMat = env.mat('metal_painted', { tint: 0x3a3d40, key: spec.id + '_rail' });
  const rail = buckets.get(spec.id + 'BR', railMat, 'metal', false, true, true);
  const slabMat = env.mat('concrete_cast', { tint: spec.trim, key: spec.id + '_trim' });
  const slab = buckets.get(spec.id + 'T', slabMat, 'concrete', true);
  const uvC = env.uv('concrete_cast');
  for (let f = 1; f < spec.floors; f++) {
    if (!rng.chance(0.6)) continue;
    const uc = rng.range(-def.length / 2 + 2.5, def.length / 2 - 2.5);
    const y = f * spec.floorHeight + 0.1;
    const bw = rng.range(2.2, 3.4);
    // Slab cantilevered out.
    pushTrimBox(slab, def, uc, y, -0.55, bw, 0.16, 1.2, uvC);
    // Railing: top rail + a few balusters.
    pushTrimBox(rail, def, uc, y + 0.55, -1.05, bw, 0.08, 0.08, 1.2);
    const posts = Math.max(3, Math.round(bw / 0.4));
    for (let p = 0; p <= posts; p++) {
      const pu = uc - bw / 2 + bw * (p / posts);
      pushTrimBox(rail, def, pu, y + 0.3, -1.05, 0.05, 0.6, 0.05, 1.2);
    }
    for (const s of [-1, 1]) pushTrimBox(rail, def, uc + s * bw / 2, y + 0.3, -0.55, 0.05, 0.6, 1.1, 1.2);
  }
}

// ---------------------------------------------------------------------------
// Sheared corner collapse
// ---------------------------------------------------------------------------

interface CollapsePlan {
  /** World box of the removed corner volume (for roof/slab notching). */
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y0: number;
  /** Facing wall + the near cross wall the collapse straddles. */
  cornerX: number;
  cornerZ: number;
}

function planCornerCollapse(spec: BuildingSpec, walls: { side: 'N' | 'S' | 'E' | 'W'; def: WallDef }[]): CollapsePlan {
  const H = spec.floors * spec.floorHeight;
  const removeFloors = Math.min(2, spec.floors - 1);
  const y0 = (spec.floors - removeFloors) * spec.floorHeight;
  const facing = spec.facing;
  // Near-south corner (closer to the player) on the facing side.
  const facingWall = walls.find((w) => w.side === facing)!;
  const southWall = walls.find((w) => w.side === 'S')!;
  const fracF = 0.44;
  const fracS = 0.5;
  // Punch top openings so the interior floor slabs show in cross-section.
  // Facing wall: openings are along its length (z for E/W walls). South corner
  // is at the +u end for a 'z' wall whose spanCenter is cz (south = larger z).
  const fL = facingWall.def.length;
  facingWall.def.openings.push({
    uc: fL / 2 - (fL * fracF) / 2,
    uw: fL * fracF,
    vy: y0 + (H - y0) / 2 + 1.0,
    vh: H - y0 + 2.0,
    kind: 'shell',
  });
  const sL = southWall.def.length;
  const towardFacing = facing === 'E' ? +1 : -1;
  southWall.def.openings.push({
    uc: (towardFacing * (sL / 2 - (sL * fracS) / 2)),
    uw: sL * fracS,
    vy: y0 + (H - y0) / 2 + 1.0,
    vh: H - y0 + 2.0,
    kind: 'shell',
  });

  const cornerX = facing === 'E' ? spec.cx + spec.w / 2 : spec.cx - spec.w / 2;
  const cornerZ = spec.cz + spec.d / 2;
  const x0 = facing === 'E' ? cornerX - spec.w * fracF : cornerX;
  const x1 = facing === 'E' ? cornerX : cornerX + spec.w * fracF;
  return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: cornerZ - spec.d * fracS, z1: cornerZ, y0, cornerX, cornerZ };
}

function dressCornerCollapse(env: Build, spec: BuildingSpec, c: CollapsePlan, decor: Decor, rng: Rng): void {
  const H = spec.floors * spec.floorHeight;
  const cx = (c.x0 + c.x1) / 2;
  const cz = (c.z0 + c.z1) / 2;
  // Rebar bristling from the sheared top edge.
  for (let i = 0; i < 14; i++) {
    const x = rng.range(c.x0, c.x1);
    const z = rng.range(c.z0, c.z1);
    const len = rng.range(0.5, 1.4);
    const g = worldCylinder(0.014, 0.014, len, 4, env.uv('metal_rusted'), false);
    decor.rebar.push(placed(g, x, c.y0 + rng.range(-0.3, 0.6), z, rng.range(0, Math.PI), rng.range(-0.6, 0.6), rng.range(-0.6, 0.6)));
    g.dispose();
  }
  // A sagging slab tipping out of the wound.
  const slab = chamferedBox(rng.range(2.5, 3.5), 0.22, rng.range(2, 3), { chamfer: 0.04, uvScale: env.uv('concrete_cast') });
  const out = spec.facing === 'E' ? 1 : -1;
  decor.rubble.push(placed(slab, c.cornerX + out * 0.4, c.y0 - 0.2, cz, rng.range(-0.2, 0.2), 0.3 * out, 0.18));
  slab.dispose();
  // Big rubble heap spilling from the base of the sheared corner outward.
  const heapR = 3.2;
  const n = 46;
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = Math.pow(rng(), 0.6) * heapR;
    const px = cx + out * 1.2 + Math.cos(a) * rr;
    const pz = cz + Math.sin(a) * rr;
    const heap = Math.max(0, 1 - rr / heapR);
    const s = rng.range(0.2, 0.62);
    const g = chamferedBox(s, s * rng.range(0.5, 0.9), s * rng.range(0.7, 1.2), { chamfer: 0.03, uvScale: env.uv('debris') });
    decor.rubble.push(placed(g, px, 0.05 + heap * rng.range(0.2, 0.9), pz, rng.range(0, Math.PI), rng.range(-0.3, 0.3), rng.range(-0.3, 0.3)));
    g.dispose();
  }
  void H;
}

// ---------------------------------------------------------------------------
// Bands (plinth / cornice), roof, interior, damage dressing
// ---------------------------------------------------------------------------

function emitBand(bucket: Bucket, x0: number, x1: number, z0: number, z1: number, y: number, h: number, proud: number, uvScale: number): void {
  const cy = y + h / 2;
  const ox = x0 - proud;
  const ox1 = x1 + proud;
  const oz = z0 - proud;
  const oz1 = z1 + proud;
  const w = ox1 - ox;
  const d = oz1 - oz;
  const t = 0.26 + proud;
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
  uvScale: number,
  collapse: CollapsePlan | null,
  decor: Decor
): void {
  const roofMat = env.mat('concrete_cast', { tint: 0x9a9186, normalScale: 0.3, key: spec.id + '_roof' });
  const roof = buckets.get(spec.id + 'R', roofMat, 'concrete', true);
  // Roof slab, decomposed around a collapse notch / roofCollapse hole.
  let cut: { x0: number; x1: number; z0: number; z1: number } | null = collapse
    ? { x0: collapse.x0, x1: collapse.x1, z0: collapse.z0, z1: collapse.z1 }
    : null;
  if (!cut && spec.roofCollapse) {
    const cw = spec.w * 0.42;
    const cd = spec.d * 0.4;
    cut = { x0: spec.cx - cw / 2, x1: spec.cx + cw / 2, z0: spec.cz - cd / 2, z1: spec.cz + cd / 2 };
    // Rubble filling the caved roof.
    for (let i = 0; i < 40; i++) {
      const px = rng_range(env.rng, cut.x0, cut.x1);
      const pz = rng_range(env.rng, cut.z0, cut.z1);
      const s = env.rng.range(0.25, 0.7);
      const g = chamferedBox(s, s * 0.6, s, { chamfer: 0.03, uvScale: env.uv('debris') });
      decor.rubble.push(placed(g, px, H - env.rng.range(0.2, 1.6), pz, env.rng.range(0, Math.PI), env.rng.range(-0.3, 0.3), env.rng.range(-0.3, 0.3)));
      g.dispose();
    }
  }
  emitSlabWithHole(roof, x0, x1, z0, z1, H + 0.15, 0.3, uvScale, cut);

  // Parapet around the roof edge, skipping the collapsed corner span.
  const p = spec.parapetHeight;
  const t = 0.35;
  const trim = buckets.get(spec.id + 'T', env.mat('concrete_cast', { tint: spec.trim, key: spec.id + '_trim' }), 'concrete', true);
  const y = H + 0.3 + p / 2;
  emitParapetEdge(trim, 'x', z0 + t / 2, x0, x1, y, p, t, uvScale, cut, true);
  emitParapetEdge(trim, 'x', z1 - t / 2, x0, x1, y, p, t, uvScale, cut, true);
  emitParapetEdge(trim, 'z', x0 + t / 2, z0, z1, y, p, t, uvScale, cut, false);
  emitParapetEdge(trim, 'z', x1 - t / 2, z0, z1, y, p, t, uvScale, cut, false);
}

function emitParapetEdge(
  trim: Bucket,
  along: 'x' | 'z',
  fixed: number,
  a0: number,
  a1: number,
  y: number,
  p: number,
  t: number,
  uvScale: number,
  cut: { x0: number; x1: number; z0: number; z1: number } | null,
  isX: boolean
): void {
  // Subtract the cut span from the edge run.
  const spans: [number, number][] = [[a0, a1]];
  if (cut) {
    const cutMin = along === 'x' ? cut.x0 : cut.z0;
    const cutMax = along === 'x' ? cut.x1 : cut.z1;
    const fixedIn = along === 'x' ? fixed >= cut.z0 - 0.6 && fixed <= cut.z1 + 0.6 : fixed >= cut.x0 - 0.6 && fixed <= cut.x1 + 0.6;
    if (fixedIn) {
      spans.length = 0;
      if (cutMin > a0 + 0.2) spans.push([a0, cutMin]);
      if (cutMax < a1 - 0.2) spans.push([cutMax, a1]);
    }
  }
  for (const [s0, s1] of spans) {
    const mid = (s0 + s1) / 2;
    const len = s1 - s0;
    if (len < 0.2) continue;
    if (isX) push(trim, mid, y, fixed, len, p, t, uvScale);
    else push(trim, fixed, y, mid, t, p, len, uvScale);
  }
}

function emitSlabWithHole(bucket: Bucket, x0: number, x1: number, z0: number, z1: number, cy: number, th: number, uvScale: number, cut: { x0: number; x1: number; z0: number; z1: number } | null): void {
  if (!cut) {
    const slab = worldBox(x1 - x0, th, z1 - z0, { uvScale });
    bucket.geos.push(placed(slab, (x0 + x1) / 2, cy, (z0 + z1) / 2));
    slab.dispose();
    return;
  }
  const hx0 = Math.max(x0, cut.x0);
  const hx1 = Math.min(x1, cut.x1);
  const hz0 = Math.max(z0, cut.z0);
  const hz1 = Math.min(z1, cut.z1);
  const rects: [number, number, number, number][] = [
    [x0, x1, z0, hz0],
    [x0, x1, hz1, z1],
    [x0, hx0, hz0, hz1],
    [hx1, x1, hz0, hz1],
  ];
  for (const [ax0, ax1, az0, az1] of rects) {
    const w = ax1 - ax0;
    const d = az1 - az0;
    if (w < 0.05 || d < 0.05) continue;
    const g = worldBox(w, th, d, { uvScale });
    bucket.geos.push(placed(g, (ax0 + ax1) / 2, cy, (az0 + az1) / 2));
    g.dispose();
  }
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
  uvScale: number,
  decor: Decor,
  rng: Rng
): void {
  // Bare, dusty concrete slabs — NOT ceramic tile — so the ceiling (underside of
  // the slab above) reads as raw bombed-out concrete, not a clean drop ceiling.
  const floorMat = env.mat('concrete_rough', { tint: 0x8c8377, rough: 0.95, normalScale: 0.4, key: spec.id + '_floor' });
  const floor = buckets.get(spec.id + 'FL', floorMat, 'concrete', true);
  const wallMat = env.mat('plaster_painted', { tint: 0xbcb2a0, key: spec.id + '_int' });
  const iwall = buckets.get(spec.id + 'IW', wallMat, 'concrete', true);
  const ix0 = x0 + T;
  const ix1 = x1 - T;
  const iz0 = z0 + T;
  const iz1 = z1 - T;
  const iw = ix1 - ix0;
  const id = iz1 - iz0;

  const stairX = spec.facing === 'E' ? ix0 + 1.6 : ix1 - 1.6;
  const stairZ = iz0 + 1.8;
  const damaged = (spec.damage?.severity ?? 0) >= 0.5;

  // A jagged shell hole caved through the ground-floor ceiling (the first-floor
  // slab), letting daylight and rubble spill down into the room the "interior"
  // camera sees. Biased toward the street-facing side.
  const holeX = spec.facing === 'E' ? ix1 - iw * 0.34 : ix0 + iw * 0.34;
  const holeZ = (iz0 + iz1) / 2 - id * 0.14;
  const cave = damaged ? { x0: holeX - 1.7, x1: holeX + 1.7, z0: holeZ - 1.5, z1: holeZ + 1.5 } : null;

  for (let f = 1; f <= spec.floors; f++) {
    const y = f * spec.floorHeight;
    if (f >= spec.floors) continue;
    const holes: { x0: number; x1: number; z0: number; z1: number }[] = [
      { x0: stairX - 0.8, x1: stairX + 0.8, z0: stairZ - 1.3, z1: stairZ + 1.3 },
    ];
    if (cave && f === 1) holes.push(cave);
    emitSlabHoles(floor, ix0, ix1, iz0, iz1, y, 0.24, uvScale, holes);
  }
  const g = worldBox(iw, 0.08, id, { uvScale });
  floor.geos.push(placed(g, (ix0 + ix1) / 2, 0.06, (iz0 + iz1) / 2));
  g.dispose();

  if (damaged) buildInteriorDamage(env, spec, decor, ix0, ix1, iz0, iz1, cave, rng);

  for (let f = 0; f < spec.floors; f++) {
    const yBase = f * spec.floorHeight;
    const partZ = (iz0 + iz1) / 2 + (f % 2 === 0 ? 2 : -2);
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
  }
}

/** Emit a horizontal slab decomposed around any number of rectangular holes. */
function emitSlabHoles(
  floor: Bucket,
  ix0: number,
  ix1: number,
  iz0: number,
  iz1: number,
  y: number,
  th: number,
  uvScale: number,
  holes: { x0: number; x1: number; z0: number; z1: number }[]
): void {
  const xs = new Set<number>([ix0, ix1]);
  const zs = new Set<number>([iz0, iz1]);
  for (const h of holes) {
    xs.add(clampN(h.x0, ix0, ix1));
    xs.add(clampN(h.x1, ix0, ix1));
    zs.add(clampN(h.z0, iz0, iz1));
    zs.add(clampN(h.z1, iz0, iz1));
  }
  const X = [...xs].sort((a, b) => a - b);
  const Z = [...zs].sort((a, b) => a - b);
  const inHole = (cx: number, cz: number): boolean =>
    holes.some((h) => cx > h.x0 + 1e-4 && cx < h.x1 - 1e-4 && cz > h.z0 + 1e-4 && cz < h.z1 - 1e-4);
  for (let xi = 0; xi < X.length - 1; xi++) {
    for (let zi = 0; zi < Z.length - 1; zi++) {
      const ax0 = X[xi];
      const ax1 = X[xi + 1];
      const az0 = Z[zi];
      const az1 = Z[zi + 1];
      const w = ax1 - ax0;
      const d = az1 - az0;
      if (w < 0.05 || d < 0.05) continue;
      if (inHole((ax0 + ax1) / 2, (az0 + az1) / 2)) continue;
      const geo = worldBox(w, th, d, { uvScale });
      floor.geos.push(placed(geo, (ax0 + ax1) / 2, y - th / 2, (az0 + az1) / 2));
      geo.dispose();
    }
  }
}

/**
 * Interior battle damage for the enterable/shelled buildings: rubble strewn and
 * heaped across the ground floor, a spill mound beneath the caved ceiling with
 * broken slab chunks and dangling rebar, and scorch fans up the inner walls.
 */
function buildInteriorDamage(
  env: Build,
  spec: BuildingSpec,
  decor: Decor,
  ix0: number,
  ix1: number,
  iz0: number,
  iz1: number,
  cave: { x0: number; x1: number; z0: number; z1: number } | null,
  rng: Rng
): void {
  const uvD = env.uv('debris');
  const uvC = env.uv('concrete_cast');
  // Loose rubble scattered over the whole floor, pooling toward the walls.
  const scatter = 40;
  for (let i = 0; i < scatter; i++) {
    const x = rng.range(ix0 + 0.3, ix1 - 0.3);
    const z = rng.range(iz0 + 0.3, iz1 - 0.3);
    const s = rng.range(0.16, 0.5);
    const g = chamferedBox(s, s * rng.range(0.4, 0.8), s * rng.range(0.7, 1.2), { chamfer: 0.03, uvScale: uvD });
    decor.rubble.push(placed(g, x, s * 0.3 + rng.range(0, 0.08), z, rng.range(0, Math.PI), rng.range(-0.3, 0.3), rng.range(-0.3, 0.3)));
    g.dispose();
  }
  if (cave) {
    const cx = (cave.x0 + cave.x1) / 2;
    const cz = (cave.z0 + cave.z1) / 2;
    // Heaped mound of debris directly under the ceiling wound.
    const heapR = 2.6;
    for (let i = 0; i < 40; i++) {
      const a = rng.range(0, Math.PI * 2);
      const rr = Math.pow(rng(), 0.55) * heapR;
      const heap = Math.max(0, 1 - rr / heapR);
      const s = rng.range(0.2, 0.6);
      const g = chamferedBox(s, s * rng.range(0.5, 0.9), s * rng.range(0.7, 1.2), { chamfer: 0.03, uvScale: uvD });
      decor.rubble.push(placed(g, cx + Math.cos(a) * rr, 0.05 + heap * rng.range(0.3, 1.2), cz + Math.sin(a) * rr, rng.range(0, Math.PI), rng.range(-0.3, 0.3), rng.range(-0.3, 0.3)));
      g.dispose();
    }
    // A couple of broken slab chunks tipped into the mound.
    for (let i = 0; i < 3; i++) {
      const slab = chamferedBox(rng.range(1.0, 1.8), 0.2, rng.range(0.8, 1.4), { chamfer: 0.04, uvScale: uvC });
      decor.rubble.push(placed(slab, cx + rng.range(-0.8, 0.8), rng.range(0.4, 1.1), cz + rng.range(-0.8, 0.8), rng.range(0, Math.PI), rng.range(0.2, 0.7), rng.range(-0.4, 0.4)));
      slab.dispose();
    }
    // Rebar dangling from the ceiling wound.
    for (let i = 0; i < 8; i++) {
      const bar = worldCylinder(0.014, 0.014, rng.range(0.5, 1.1), 4, env.uv('metal_rusted'), false);
      decor.rebar.push(placed(bar, rng.range(cave.x0, cave.x1), spec.floorHeight - rng.range(0.1, 0.8), rng.range(cave.z0, cave.z1), rng.range(0, Math.PI), rng.range(-0.5, 0.5), rng.range(-0.5, 0.5)));
      bar.dispose();
    }
  }
  // Scorch fans licking up the inner faces of the side walls.
  const wallW = { axis: 'z' as const, spanCenter: (iz0 + iz1) / 2, faceCoord: ix0, outSign: 1, length: iz1 - iz0, height: spec.floorHeight * spec.floors, thickness: 0.1, openings: [], detail: false };
  for (let i = 0; i < 3; i++) {
    const zc = rng.range(iz0 + 1.5, iz1 - 1.5);
    decor.scorch.push(facadeQuad(wallW, zc - (iz0 + iz1) / 2, rng.range(1.4, 2.6), rng.range(1.6, 2.6), rng.range(2.0, 3.2), 0.06));
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
  const side = dmg.side;
  const along = side === 'E' || side === 'W' ? 'z' : 'x';
  const faceX = side === 'E' ? x1 : side === 'W' ? x0 : (x0 + x1) / 2;
  const faceZ = side === 'S' ? z1 : side === 'N' ? z0 : (z0 + z1) / 2;
  const outX = side === 'E' ? 1 : side === 'W' ? -1 : 0;
  const outZ = side === 'S' ? 1 : side === 'N' ? -1 : 0;

  const spanMin = along === 'z' ? z0 + 1 : x0 + 1;
  const spanMax = along === 'z' ? z1 - 1 : x1 - 1;
  const count = Math.round(10 + dmg.severity * 26);
  for (let i = 0; i < count; i++) {
    const u = rng.range(spanMin, spanMax);
    const out = rng.range(0.2, 2.6 + dmg.severity * 2.6);
    const bx = (along === 'z' ? faceX : u) + outX * out;
    const bz = (along === 'z' ? u : faceZ) + outZ * out;
    const s = rng.range(0.14, 0.5);
    const geo = chamferedBox(s, s * rng.range(0.5, 0.9), s * rng.range(0.7, 1.2), { chamfer: 0.03, uvScale: env.uv('debris') });
    rubble.geos.push(placed(geo, bx, s * 0.35 + rng.range(0, 0.15), bz, rng.range(0, Math.PI), rng.range(-0.3, 0.3), rng.range(-0.3, 0.3)));
    geo.dispose();
  }

  if (dmg.collapseCorner || dmg.severity > 0.5) {
    const bars = Math.round(4 + dmg.severity * 6);
    for (let i = 0; i < bars; i++) {
      const u = rng.range(spanMin, spanMax);
      const bx = along === 'z' ? faceX + outX * 0.1 : u;
      const bz = along === 'z' ? u : faceZ + outZ * 0.1;
      const len = rng.range(0.6, 1.3);
      const geo = worldCylinder(0.015, 0.015, len, 5, env.uv('metal_rusted'), false);
      const topY = rng.range(H - spec.floorHeight, H - 0.2);
      rebar.geos.push(placed(geo, bx, topY, bz, rng.range(0, Math.PI), rng.range(-0.5, 0.5), rng.range(-0.5, 0.5)));
      geo.dispose();
    }
  }
}

// ---------------------------------------------------------------------------
// Minaret landmark
// ---------------------------------------------------------------------------

function buildMinaret(env: Build, m: LevelPlan['minaret']): void {
  const bodyGeos: THREE.BufferGeometry[] = [];
  const uvP = env.uv('wall_plaster');
  const uvC = env.uv('concrete_cast');
  // Square base plinth.
  const base = chamferedBox(m.radius * 2.6, 3.2, m.radius * 2.6, { chamfer: 0.06, uvScale: uvP });
  bodyGeos.push(placed(base, m.x, 1.6, m.z));
  base.dispose();
  const base2 = chamferedBox(m.radius * 2.2, 1.0, m.radius * 2.2, { chamfer: 0.05, uvScale: uvP });
  bodyGeos.push(placed(base2, m.x, 3.6, m.z));
  base2.dispose();
  // Tapered octagonal shaft.
  const shaftH = m.height * 0.62;
  const shaft = worldCylinder(m.radius * 0.78, m.radius, shaftH, 8, uvP);
  bodyGeos.push(placed(shaft, m.x, 4.1 + shaftH / 2, m.z));
  shaft.dispose();
  const galleryY = 4.1 + shaftH;
  // Muezzin gallery: a wider ring + railing.
  const ring = worldCylinder(m.radius * 1.35, m.radius * 1.35, 1.4, 8, uvC);
  bodyGeos.push(placed(ring, m.x, galleryY + 0.7, m.z));
  ring.dispose();
  // Upper drum.
  const drumH = 3.0;
  const drum = worldCylinder(m.radius * 0.62, m.radius * 0.78, drumH, 8, uvP);
  bodyGeos.push(placed(drum, m.x, galleryY + 1.4 + drumH / 2, m.z));
  drum.dispose();
  // Finial pole.
  const poleY = galleryY + 1.4 + drumH;
  const pole = worldCylinder(0.06, 0.06, 2.4, 6, uvC);
  bodyGeos.push(placed(pole, m.x, poleY + 1.2 + 1.5, m.z));
  pole.dispose();

  const bodyMat = env.mat('plaster_painted', { tint: 0xd9d2c0, normalScale: 0.25, key: 'minaret' });
  const bodyGeo = mergeAll(bodyGeos);
  for (const g of bodyGeos) g.dispose();
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.name = 'Minaret';
  body.castShadow = true;
  body.receiveShadow = true;
  tagSurface(body, 'concrete', true);
  freeze(body);
  env.root.add(body);
  env.own(bodyGeo);
  env.colliders.push(body);

  // Turquoise dome cap.
  const dome = new THREE.SphereGeometry(m.radius * 0.95, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  scaleUvSphere(dome, uvP);
  const domeMesh = new THREE.Mesh(placed(dome, m.x, poleY + 1.2, m.z), env.mat('tile_ceramic', { tint: 0x2f8f86, rough: 0.5, key: 'dome' }));
  dome.dispose();
  domeMesh.name = 'MinaretDome';
  domeMesh.castShadow = true;
  tagSurface(domeMesh, 'tile');
  freeze(domeMesh);
  env.root.add(domeMesh);
  env.own(domeMesh.geometry);

  // Finial ball.
  const ball = new THREE.SphereGeometry(0.28, 8, 6);
  const ballMesh = new THREE.Mesh(placed(ball, m.x, poleY + 1.2 + 3.0, m.z), env.mat('metal_brushed', { tint: 0xd8c46a, key: 'finial' }));
  ball.dispose();
  ballMesh.castShadow = true;
  tagSurface(ballMesh, 'metal');
  freeze(ballMesh);
  env.root.add(ballMesh);
  env.own(ballMesh.geometry);

  // Solid + tall LoS blocker.
  env.solids.push({ minX: m.x - m.radius, maxX: m.x + m.radius, minZ: m.z - m.radius, maxZ: m.z + m.radius, minY: 0, maxY: m.height });
}

function scaleUvSphere(g: THREE.BufferGeometry, uv: number): void {
  const a = g.getAttribute('uv');
  if (!a) return;
  for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * (Math.PI * 2) / uv, a.getY(i) * 2 / uv);
  a.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Nav / cover integration
// ---------------------------------------------------------------------------

function pushWallSolids(env: Build, def: WallDef): void {
  const uHalf = def.length / 2;
  const doorSpans: [number, number][] = [];
  for (const o of def.openings) {
    if (o.kind === 'door' || o.kind === 'shop' || (o.kind === 'shell' && o.vy - o.vh / 2 < 0.6)) {
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
    env.solids.push({
      minX: box.cx - box.w / 2,
      maxX: box.cx + box.w / 2,
      minZ: box.cz - box.d / 2,
      maxZ: box.cz + box.d / 2,
      minY: 0,
      maxY: def.height,
    });
  }
}

function addWallCover(env: Build, spec: BuildingSpec, facing: 'E' | 'W'): void {
  const faceX = facing === 'E' ? spec.cx + spec.w / 2 : spec.cx - spec.w / 2;
  const out = facing === 'E' ? 1 : -1;
  const n = 4;
  for (let i = 0; i < n; i++) {
    const z = spec.cz - spec.d / 2 + spec.d * ((i + 0.5) / n);
    env.covers.push({ pos: new THREE.Vector3(faceX + out * 0.8, 0, z), normal: new THREE.Vector3(out, 0, 0), low: false });
  }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function env_uv_brick(fallback: number): number {
  // Bricks want ~ their own world scale; callers pass a concrete uv fallback,
  // but exposed brick reads best a touch tighter.
  return fallback;
}

function rng_range(rng: Rng, a: number, b: number): number {
  return rng.range(a, b);
}

function clampN(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

function quad(pos: number[], nor: number[], uv: number[], a: number[], b: number[], c: number[], d: number[], n: number[]): void {
  for (const p of [a, b, c, a, c, d]) {
    pos.push(p[0], p[1], p[2]);
    nor.push(n[0], n[1], n[2]);
    uv.push(p[0] * 0.4, p[1] * 0.4);
  }
}

function pushUvQuad(pos: number[], nor: number[], uv: number[], a: number[], b: number[], c: number[], d: number[], n: number[]): void {
  const uvs = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 0],
    [1, 1],
    [0, 1],
  ];
  const ps = [a, b, c, a, c, d];
  for (let i = 0; i < 6; i++) {
    pos.push(ps[i][0], ps[i][1], ps[i][2]);
    nor.push(n[0], n[1], n[2]);
    uv.push(uvs[i][0], uvs[i][1]);
  }
}

function bufFrom(pos: number[], nor: number[], uv: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
