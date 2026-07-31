import * as THREE from 'three';
import type { MaterialId } from '../../core/Contracts';
import type { QualityConfig } from '../../core/Config';
import type { SurfaceType, Team } from '../../core/GameTypes';
import type { Rng } from '../../core/MathUtils';
import { MATERIAL_SPECS } from '../../procgen';
import { applyWorldUv, bevelBox, mergeGeometries, roundedBoxGeometry } from '../../procgen';

/**
 * Shared vocabulary for the level kit.
 *
 * Every kit module talks to the world through `Sink`, which hides how geometry
 * is batched, how colliders reach physics and how navigation is rasterised. The
 * kit therefore stays pure authoring code: it describes a town, not a renderer.
 */

/**
 * Draw-order/cull class.
 *
 * `structure` is everything that defines the silhouette of the map and must cast
 * shadows. `detail` is the decoration layer, which is culled at medium range and
 * never casts. `ground` is the terrain shell: it receives but does not cast.
 */
export type DetailTier = 'ground' | 'structure' | 'detail';

export interface StaticOptions {
  material: MaterialId;
  tier?: DetailTier;
  /** Metres per texture tile; defaults to the size the material was authored for. */
  tile?: number;
  /** Rewrite UVs as a world-space projection at `tile` metres. */
  reproject?: boolean;
  /**
   * Shifts the world UV origin by a per-piece amount.
   *
   * Several of the wall materials carry a large-scale field — flaking paint,
   * blown render — whose blobs are a good fraction of a tile across. Projected
   * from one world origin those blobs line up into a grid across a facade and the
   * wall reads as wallpaper, or worse, as camouflage netting. Jittering the
   * origin per panel puts the break at the piers and lintels, where a real wall
   * has been patched and repainted anyway.
   */
  uvJitter?: boolean;
  /** Multiplied into the vertex colour, for sun-bleach and grime variation. */
  tint?: number;
  /** Amplitude of large-scale per-vertex tint noise, 0..1. */
  mottle?: number;
  /** Overrides the chunk the geometry is filed under (defaults to its centre). */
  chunkAt?: THREE.Vector3;
}

export interface PropOptions {
  material: MaterialId;
  tier?: DetailTier;
  tile?: number;
  reproject?: boolean;
  /** Per-instance tint. */
  tint?: number;
  /** Low-detail stand-in swapped in beyond the LOD distance. */
  lod?: THREE.BufferGeometry | null;
  /** Overrides the tier's shadow-casting default (glass must not cast). */
  castShadow?: boolean;
  /**
   * Opts a prop out of receiving shadow. Only honoured on instanced groups.
   *
   * For thin cloth slung overhead, which is the only thing that wants it. Such a
   * sheet is inside the shadow it casts, so the face the player stands under is
   * lit by ambient alone and goes to a dark slab — the opposite of what a canopy
   * with the sun on it looks like from below. Dropping the shadow lookup and
   * shading it skyward gets the light through it.
   */
  receiveShadow?: boolean;
  /** Animate with the foliage wind shader; forces instancing. */
  wind?: boolean;
  /**
   * Strength of the backlit glow through a thin leaf, 0 for none.
   *
   * Only meaningful with `wind`, which is also the flag that gets the geometry
   * onto a two-sided material — the term needs to be able to shade the face the
   * sun is not on.
   */
  transmit?: number;
  /**
   * Pools every copy on the map into one instanced draw instead of one per chunk.
   *
   * Chunking exists so a district can be culled wholesale, but it also splits an
   * instance group nine ways. For map-wide scatter that is a bad trade: a tuft of
   * dry grass is eight triangles, so nine groups of two copies cost nine draw
   * calls to save almost no vertex work. Pooling gives one call for the lot at the
   * price of never culling it, which for something this small is free.
   *
   * Only for geometry that is tiny and casts no shadow. Anything with real
   * triangle count or a shadow to project should stay chunked.
   */
  global?: boolean;
  /**
   * Micro clutter: pooled, never shadow-casting, and collapsed by the vertex
   * shader past `CLUTTER_FAR` metres from the camera.
   *
   * Litter is the one class of prop where per-chunk culling is the wrong tool.
   * Thousands of ten-triangle scraps want to be one draw call, which means one
   * map-wide instanced mesh, which means chunk visibility can never touch them.
   * Collapsing each copy to its own pivot in the vertex shader gets the effect
   * culling was for — no raster work for a crushed can forty metres away, and no
   * shimmering carpet of sub-pixel geometry down the street — while keeping the
   * single draw call. Forces instancing, since the shader lives on a material the
   * merged batches do not use.
   */
  clutter?: boolean;
}

/** Handle to one copy of an instanced prop, so destructibles can address it. */
export interface InstanceRef {
  key: string;
  index: number;
}

export interface ObjectOptions {
  tier?: DetailTier;
  castShadow?: boolean;
  chunkAt?: THREE.Vector3;
}

/**
 * Options for geometry batched under a material the kit owns rather than one the
 * material library published.
 */
export interface CustomOptions {
  tier?: DetailTier;
  /** Metres per texture tile, when the geometry arrives without UVs. */
  tile?: number;
  tint?: number;
  mottle?: number;
  chunkAt?: THREE.Vector3;
  /** Pool every piece on the map into one batch instead of one per chunk. */
  global?: boolean;
  castShadow?: boolean;
}

export interface ColliderSpec {
  surface: SurfaceType;
  /** Skip cover-point generation from this box (floors, ceilings, lintels). */
  noCover?: boolean;
  /** Skip navigation blocking (kerbs, sills, thin lips, stair treads). */
  noNav?: boolean;
  /** Links the collider to a destructible so its surface response can change. */
  destructible?: number;
}

export interface NavSurfaceSpec {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  /** Surface height at the minimum end of the ramp axis (constant if flat). */
  height: number;
  /** Height change from the minimum to the maximum end of `axis`; may be negative. */
  ramp?: { axis: 'x' | 'z'; rise: number };
  /** Traversal cost multiplier (chokepoints, stairs, rubble). */
  costMul?: number;
  /** Follow the terrain field rather than a constant height. */
  terrain?: boolean;
}

export type DestructibleKind =
  | 'glass'
  | 'crate'
  | 'stall'
  | 'sandbag'
  | 'lamp'
  | 'awning'
  | 'sign'
  | 'plaster'
  | 'barrel';

export interface DestructibleSpec {
  kind: DestructibleKind;
  position: THREE.Vector3;
  radius: number;
  health: number;
  surface: SurfaceType;
  /** Object hidden when the piece breaks. */
  object?: THREE.Object3D;
  /** Instanced prop to zero out (or slump) when the piece breaks. */
  instance?: InstanceRef;
  /** Several instanced copies that break together (the bags of one emplacement). */
  instances?: InstanceRef[];
  /** Shown when the piece breaks. */
  debris?: THREE.Object3D;
  /** Light to extinguish. */
  light?: THREE.PointLight;
  /** Local size of the piece; glass uses it to leave a jagged remnant. */
  size?: THREE.Vector2;
}

export interface Sink {
  readonly rng: Rng;
  readonly config: QualityConfig;
  /** Unit vector towards the sun, so daylight effects can be aimed at it. */
  readonly sunDirection: THREE.Vector3;
  /** Terrain height at a world XZ. */
  ground(x: number, z: number): number;
  /** World-space geometry; ownership transfers to the sink. */
  addStatic(geometry: THREE.BufferGeometry, opts: StaticOptions): void;
  /** Local-space geometry plus a placement matrix; instanced when repeated. */
  addProp(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, opts: PropOptions): InstanceRef;
  /** As `addProp`, but always instanced so the copy stays individually addressable. */
  addInstancedProp(
    geometry: THREE.BufferGeometry,
    matrix: THREE.Matrix4,
    opts: PropOptions,
  ): InstanceRef;
  /**
   * World-space geometry merged into a batch under a caller-supplied material.
   *
   * The material library covers surfaces; signage, decals and light shafts need
   * a texture atlas and a blend mode of their own, which no `MaterialId` can
   * name. Pieces sharing a `key` merge together exactly as the library-backed
   * batches do, so a hundred painted signs across a district cost one draw.
   */
  addCustom(
    key: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    opts?: CustomOptions,
  ): void;
  /** A loose object kept as-is (glass, cloth, lights, LOD groups). */
  addObject(object: THREE.Object3D, opts?: ObjectOptions): void;
  /** Map-wide object exempt from chunk culling; use sparingly. */
  addOverlay(object: THREE.Object3D): void;
  addCollider(center: THREE.Vector3, half: THREE.Vector3, yaw: number, spec: ColliderSpec): void;
  /**
   * True when something solid already stands on the ground at this XZ.
   *
   * The collider list is the occupancy map the level already keeps, so a late
   * scatter pass can reject a position inside a wall, a wreck or a barrier
   * without every set piece having to declare a footprint of its own. Only valid
   * once the geometry it should avoid has been emitted.
   */
  groundClaimed(x: number, z: number, pad?: number): boolean;
  addTrimesh(mesh: THREE.Mesh, surface: SurfaceType): void;
  addWalkable(spec: NavSurfaceSpec): void;
  addSpawn(x: number, z: number, yaw: number, team: Team, priority?: number): void;
  addLandmark(name: string, x: number, y: number, z: number): void;
  addInterior(name: string, box: THREE.Box3): void;
  addDestructible(spec: DestructibleSpec): void;
  addLight(light: THREE.PointLight): void;
  /** Shared material for loose objects (no vertex-colour attribute required). */
  material(id: MaterialId): THREE.MeshStandardMaterial;
  /** One-off tweak to the batch material every merged/instanced use shares. */
  tuneMaterial(id: MaterialId, setup: (m: THREE.MeshStandardMaterial) => void): void;
  /** Cloned material for loose objects that need their own parameters. */
  ownMaterial(key: string, id: MaterialId, setup: (m: THREE.MeshStandardMaterial) => void): THREE.MeshStandardMaterial;
  /** Registers a foliage material for wind animation. */
  windMaterial(id: MaterialId, tint: number, doubleSided: boolean): THREE.MeshStandardMaterial;
  /**
   * Bakes an emissive bounce into everything emitted until it is switched off.
   *
   * The renderer keeps a fixed pool of point lights, so a lamp in every room is
   * not on offer — and with the ambient term now as low as it is, an unlit room
   * comes back as a black rectangle. A surface inside a building instead carries
   * a share of its own albedo as emission, which is what a bounce term is: the
   * room lights itself, at the level given here. 0 is outdoors and 1 is a
   * shopfront with the shutter up; a back room sits around a half.
   */
  interiorFill(level: number): void;
  /** The level in force, so kit-owned materials can match the batch variants. */
  currentFill(): number;
}

// ---------------------------------------------------------------------------
// Metrics the whole kit shares
// ---------------------------------------------------------------------------

export const METRICS = {
  /** Comfortable doorway for a 0.34 m radius player. */
  doorWidth: 1.55,
  doorHeight: 2.35,
  windowWidth: 1.45,
  windowHeight: 1.35,
  windowSill: 0.95,
  wallThickness: 0.34,
  partitionThickness: 0.18,
  slabThickness: 0.3,
  floorHeight: 3.4,
  parapet: 1.05,
  /** Highest ledge the player can mantle onto. */
  mantle: 1.55,
  stepRise: 0.185,
  stepRun: 0.29,
} as const;

/** Metres of world space one texture tile of a material covers. */
export function tileOf(id: MaterialId): number {
  return MATERIAL_SPECS.get(id)?.tileMeters ?? 2;
}

export function surfaceOf(id: MaterialId): SurfaceType {
  return MATERIAL_SPECS.get(id)?.surface ?? 'concrete';
}

// ---------------------------------------------------------------------------
// Geometry cache — instancing depends on repeated props sharing one buffer
// ---------------------------------------------------------------------------

const CACHE = new Map<string, THREE.BufferGeometry>();

export function cachedGeometry(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let geometry = CACHE.get(key);
  if (!geometry) {
    geometry = build();
    geometry.name = key;
    CACHE.set(key, geometry);
  }
  return geometry;
}

export function disposeGeometryCache(): void {
  for (const geometry of CACHE.values()) geometry.dispose();
  CACHE.clear();
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Bevelled box with UVs projected at `tile` metres per texture tile.
 *
 * Bevels are not decoration: the chamfer is what catches a specular highlight
 * and separates a silhouette from what is behind it. Nothing manufactured in
 * this map has a truly sharp edge.
 */
/**
 * Box with chamfered edges, or a plain one when the chamfer cannot be seen.
 *
 * A chamfer is thirty-two triangles on top of a box's twelve, spent entirely on
 * catching a highlight along each edge. That is worth paying on a crate or a
 * plinth. It is not worth paying on a glazing bar, a fence wire, a shelf slat or
 * a sign board eight centimetres thick — and those, by count, are most of the
 * boxes in the map. Below the floor the piece is thinner than the chamfer would
 * be wide at any range it resolves at, so the chamfer is bought and never seen.
 *
 * The offset reproduces `bevelBox`'s half-tile UV shift exactly, so swapping
 * topology does not slide the texture on a piece that changes path.
 */
export function boxGeometry(
  width: number,
  height: number,
  depth: number,
  bevel: number,
  tile: number,
): THREE.BufferGeometry {
  const plain = Math.min(width, height, depth) < BEVEL_FLOOR;
  const key = `box|${r3(width)}|${r3(height)}|${r3(depth)}|${plain ? 'p' : r3(bevel)}|${r3(tile)}`;
  return cachedGeometry(key, () =>
    plain
      ? applyWorldUv(
          new THREE.BoxGeometry(width, height, depth),
          tile,
          new THREE.Vector3(tile / 2, tile / 2, tile / 2),
        )
      : bevelBox(width, height, depth, bevel, 1 / tile),
  );
}

/** Smallest dimension that still earns a chamfer, in metres. */
const BEVEL_FLOOR = 0.1;

export function roundedGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments: number,
  tile: number,
): THREE.BufferGeometry {
  const key = `round|${r3(width)}|${r3(height)}|${r3(depth)}|${r3(radius)}|${segments}|${r3(tile)}`;
  return cachedGeometry(key, () =>
    applyWorldUv(roundedBoxGeometry(width, height, depth, radius, segments), tile),
  );
}

/**
 * Rounded bag whose UVs sit inside one cell of the bag texture.
 *
 * `sandbag` is authored as a whole revetment — three bags across by six down per
 * tile — so a world projection at its natural scale paints the texture's own bag
 * edges and course dirt across a single bag mesh, and a stack of them reads as a
 * pile of doughnuts. The box's own face UVs are remapped onto one texture bag
 * instead, so the mesh carries the form and the texture only has to supply cloth.
 *
 * The window is kept near the full cell deliberately. Cropping tightly into the
 * taut middle looks safer, but the map is authored at medium resolution and a
 * 0.54 m bag mesh over a 0.47 m texture bag is already close to 1:1 — crop to
 * half a cell and the hessian is magnified past its texel density and goes to
 * mush, which is what turns a revetment into a stack of smooth bread rolls.
 */
export function bagGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
): THREE.BufferGeometry {
  const key = `bag|${r3(width)}|${r3(height)}|${r3(depth)}|${r3(radius)}`;
  return cachedGeometry(key, () => {
    // One segment, not three. A revetment is the most repeated mesh in the map —
    // upwards of fifteen hundred bags, the single heaviest thing in the world at
    // any subdivision — so this one number is worth about a twentieth of the
    // world's triangles. At half a metre across, one ring of subdivision still
    // pillows the faces and rounds the corners, and the hessian in the material
    // supplies everything past that; the rings above it were paying for
    // silhouette detail no player is close enough to resolve.
    const geometry = roundedBoxGeometry(width, height, depth, radius, 1);
    const uv = geometry.attributes.uv as THREE.BufferAttribute;
    const u0 = 0.07 / 3;
    const uSpan = 0.86 / 3;
    const v0 = 0.07 / 6;
    const vSpan = 0.86 / 6;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, u0 + uv.getX(i) * uSpan, v0 + uv.getY(i) * vSpan);
    }
    uv.needsUpdate = true;
    return geometry;
  });
}

export function cylinderGeometry(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
  tile: number,
  capped = true,
): THREE.BufferGeometry {
  const key = `cyl|${r3(radiusTop)}|${r3(radiusBottom)}|${r3(height)}|${segments}|${r3(tile)}|${capped}`;
  return cachedGeometry(key, () => {
    const geometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      segments,
      1,
      !capped,
    );
    return applyWorldUv(geometry, tile);
  });
}

export function planeGeometry(width: number, height: number, tile: number): THREE.BufferGeometry {
  const key = `plane|${r3(width)}|${r3(height)}|${r3(tile)}`;
  return cachedGeometry(key, () => {
    const geometry = new THREE.PlaneGeometry(width, height);
    const uv = geometry.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (uv.getX(i) - 0.5) * (width / tile), (uv.getY(i) - 0.5) * (height / tile));
    }
    uv.needsUpdate = true;
    return geometry;
  });
}

/** Axis-aligned slab in world space, UV-projected for `tile`. */
export function slab(
  centerX: number,
  centerY: number,
  centerZ: number,
  width: number,
  height: number,
  depth: number,
  bevel: number,
  tile: number,
): THREE.BufferGeometry {
  const geometry = bevelBox(width, height, depth, bevel, 1);
  geometry.translate(centerX, centerY, centerZ);
  return applyWorldUv(geometry, tile);
}

/**
 * Transformed copy of a cached geometry, ready to merge into a static batch.
 * `clone()` shares `userData` by reference, so the copy gets a fresh one.
 */
export function placed(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4): THREE.BufferGeometry {
  const copy = cloneGeometry(geometry);
  copy.applyMatrix4(matrix);
  return copy;
}

/** Independent copy of a (possibly cached) geometry, safe to mutate or dispose. */
export function cloneGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const copy = geometry.clone();
  copy.userData = {};
  return copy;
}

/**
 * Merges sub-assembly parts into one buffer and releases them.
 *
 * Props are authored as a handful of boxes and cylinders, but a prop that stays
 * split is a prop that cannot be instanced as one draw call.
 */
export function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (parts.length === 1) return parts[0];
  const merged = mergeGeometries(parts, false);
  if (!merged) return parts[0];
  for (const part of parts) part.dispose();
  return merged;
}

const SCRATCH_EULER = new THREE.Euler();
const SCRATCH_QUAT = new THREE.Quaternion();
const SCRATCH_SCALE = new THREE.Vector3(1, 1, 1);
const SCRATCH_POS = new THREE.Vector3();

/**
 * Rounds a dimension onto a coarse ladder so sized props can share one buffer.
 *
 * Anything built through `cachedGeometry` with a continuous dimension in its key
 * defeats the cache: twenty awnings authored at twenty slightly different widths
 * are twenty geometries and therefore twenty draw calls. Snapping to a quarter of
 * a metre collapses them onto a handful of shared buffers, and a 12 cm change in
 * the width of a market awning is not a difference anybody can see.
 */
export function snap(value: number, step = 0.25): number {
  return Math.round(value / step) * step;
}

/** Placement matrix from a position, a yaw and optional extra rotation/scale. */
export function transform(
  x: number,
  y: number,
  z: number,
  yaw = 0,
  pitch = 0,
  roll = 0,
  scale: number | THREE.Vector3 = 1,
  out = new THREE.Matrix4(),
): THREE.Matrix4 {
  SCRATCH_EULER.set(pitch, yaw, roll, 'YXZ');
  SCRATCH_QUAT.setFromEuler(SCRATCH_EULER);
  if (typeof scale === 'number') SCRATCH_SCALE.set(scale, scale, scale);
  else SCRATCH_SCALE.copy(scale);
  SCRATCH_POS.set(x, y, z);
  return out.compose(SCRATCH_POS, SCRATCH_QUAT, SCRATCH_SCALE);
}

/**
 * Tapered ribbon used for palm fronds, hanging cloth and torn awnings.
 * `bend` droops the strip, `twist` rolls it so it never reads as a flat card.
 */
export function ribbonGeometry(
  length: number,
  rootWidth: number,
  tipWidth: number,
  segments: number,
  bend: number,
  twist: number,
  tile: number,
): THREE.BufferGeometry {
  const key = `ribbon|${r3(length)}|${r3(rootWidth)}|${r3(tipWidth)}|${segments}|${r3(bend)}|${r3(twist)}|${r3(tile)}`;
  return cachedGeometry(key, () => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const halfWidth = THREE.MathUtils.lerp(rootWidth, tipWidth, t) * 0.5;
      const along = t * length;
      const drop = -bend * t * t;
      const roll = twist * t;
      const cos = Math.cos(roll);
      const sin = Math.sin(roll);
      for (const s of [-1, 1]) {
        positions.push(along, drop + s * halfWidth * sin, s * halfWidth * cos);
        uvs.push(along / tile, (s * halfWidth) / tile);
      }
      if (i > 0) {
        const base = (i - 1) * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  });
}

/**
 * Reverses triangle winding in place, without touching the normals.
 *
 * For a sheet of cloth on a two-sided material the winding is what decides which
 * side the renderer treats as the front, and only the front keeps the normal it
 * was given: a back face has its normal negated before shading. So a sheet that
 * is meant to be looked at from below has to be wound to face down, whatever its
 * normals then say.
 */
export function flipWinding(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const index = geometry.getIndex();
  if (!index) return geometry;
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    index.setX(i, index.getX(i + 2));
    index.setX(i + 2, a);
  }
  index.needsUpdate = true;
  return geometry;
}

/**
 * Leans a surface's normals towards the sky, keeping `lateral` of their spread.
 *
 * Awnings and shade cloth are seen from underneath, where an honest normal points
 * at the ground and the surface comes back as a dark plate hung over the street.
 * Real cloth this thin is lit through as much as off, and what a player reads as
 * "canvas in the sun" is the sky value, not the floor value. Some lateral spread
 * is kept so the shading still varies with the folds.
 */
export function skywardNormals(
  geometry: THREE.BufferGeometry,
  lateral = 0.62,
): THREE.BufferGeometry {
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (!normal) return geometry;
  for (let i = 0; i < normal.count; i++) {
    const x = normal.getX(i) * lateral;
    const z = normal.getZ(i) * lateral;
    const length = Math.hypot(x, 1, z);
    normal.setXYZ(i, x / length, 1 / length, z / length);
  }
  normal.needsUpdate = true;
  return geometry;
}

/**
 * Two-sided copy of an open surface (cloth, fence mesh, foliage cards).
 *
 * Flipping the index winding alone would leave the two faces sharing vertex
 * normals, which average out to nothing and shade black. The back face gets its
 * own vertices with inverted normals instead.
 */
export function makeDoubleSided(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const back = geometry.clone();
  back.userData = {};
  const normal = back.getAttribute('normal');
  if (normal) {
    for (let i = 0; i < normal.count; i++) {
      normal.setXYZ(i, -normal.getX(i), -normal.getY(i), -normal.getZ(i));
    }
    normal.needsUpdate = true;
  }
  const index = back.getIndex();
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      index.setX(i, index.getX(i + 2));
      index.setX(i + 2, a);
    }
    index.needsUpdate = true;
  }
  const merged = mergeGeometries([geometry, back], false);
  back.dispose();
  if (!merged) return geometry;
  geometry.dispose();
  merged.userData.worldUvApplied = true;
  return merged;
}

/**
 * Sagging catenary tube between two points, for power lines and laundry ropes.
 */
export function catenaryGeometry(
  from: THREE.Vector3,
  to: THREE.Vector3,
  sag: number,
  radius: number,
  segments = 10,
): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = from.clone().lerp(to, t);
    p.y -= sag * Math.sin(Math.PI * t);
    points.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, segments, radius, 4, false);
  return applyWorldUv(geometry, 1.4);
}

/** Convex lathe from a profile, used for barrels, water tanks and domes. */
export function latheGeometry(
  key: string,
  profile: ReadonlyArray<readonly [number, number]>,
  segments: number,
  tile: number,
): THREE.BufferGeometry {
  return cachedGeometry(`lathe|${key}`, () => {
    const points = profile.map(([x, y]) => new THREE.Vector2(x, y));
    return applyWorldUv(new THREE.LatheGeometry(points, segments), tile);
  });
}

// ---------------------------------------------------------------------------
// Small numeric helpers
// ---------------------------------------------------------------------------

export const r3 = (v: number): string => v.toFixed(3);

export interface Rect {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export function rect(centerX: number, centerZ: number, width: number, depth: number): Rect {
  return {
    minX: centerX - width / 2,
    minZ: centerZ - depth / 2,
    maxX: centerX + width / 2,
    maxZ: centerZ + depth / 2,
  };
}

export function inflate(r: Rect, amount: number): Rect {
  return {
    minX: r.minX - amount,
    minZ: r.minZ - amount,
    maxX: r.maxX + amount,
    maxZ: r.maxZ + amount,
  };
}

/** Rotates a local offset by a yaw and adds it to a world origin. */
export function localToWorld(
  originX: number,
  originZ: number,
  yaw: number,
  localX: number,
  localZ: number,
  out: THREE.Vector2 = new THREE.Vector2(),
): THREE.Vector2 {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return out.set(originX + localX * cos + localZ * sin, originZ - localX * sin + localZ * cos);
}
