/**
 * Shared set-dressing library.
 *
 * Everything here is procedural: geometry is assembled from primitives and
 * surfaces come from `engine/Textures`. Props are handed to a `Batch`, which
 * merges every geometry that shares a material into a single draw call, so a
 * street full of clutter still costs a couple of dozen draws.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { QualityTier } from '../engine/PostFX';
import { Rng, clamp, lerp, smoothstep } from '../engine/Noise';
import {
  acousticPanel,
  asphalt,
  brick,
  brushedMetal,
  buildSurface,
  concrete,
  fabric,
  grimyGlass,
  panelMetal,
  plaster,
  radialAlphaTexture,
  rustedMetal,
  surfaceMaterial,
  tiles,
  woodFloor,
  type SurfaceFn,
  type SurfaceOptions,
} from '../engine/Textures';

// ---------------------------------------------------------------------------
// Detail scaling
// ---------------------------------------------------------------------------

/** Multiplier applied to optional clutter counts. */
export function detailScale(tier: QualityTier): number {
  switch (tier) {
    case 'low':
      return 0.4;
    case 'medium':
      return 0.7;
    case 'high':
      return 1;
    default:
      return 1.3;
  }
}

/** Texture resolution for the tier; keeps CPU-side synthesis affordable. */
export function texSize(tier: QualityTier, hi = 512): number {
  switch (tier) {
    case 'low':
      return Math.max(128, hi / 4);
    case 'medium':
      return Math.max(256, hi / 2);
    default:
      return hi;
  }
}

/** Radial segment count for cylinders, scaled by tier. */
export function radialSegs(tier: QualityTier, hi = 16): number {
  return tier === 'low' ? Math.max(6, Math.round(hi / 2)) : tier === 'medium' ? Math.max(8, Math.round(hi * 0.75)) : hi;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3(1, 1, 1);
const _quat = new THREE.Quaternion();
const _eul = new THREE.Euler();
const _mat4 = new THREE.Matrix4();

export interface Placement {
  /** Yaw about +Y, then pitch about +X, then roll about +Z. */
  ry?: number;
  rx?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
}

/** Bakes a translation/rotation into a geometry and returns it. */
export function at(
  geo: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  p: Placement = {}
): THREE.BufferGeometry {
  _pos.set(x, y, z);
  _eul.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0, 'YXZ');
  _quat.setFromEuler(_eul);
  _scl.set(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1);
  geo.applyMatrix4(_mat4.compose(_pos, _quat, _scl));
  return geo;
}

export function box(
  w: number,
  h: number,
  d: number,
  x = 0,
  y = 0,
  z = 0,
  p: Placement = {}
): THREE.BufferGeometry {
  return at(new THREE.BoxGeometry(w, h, d), x, y, z, p);
}

export function plane(w: number, h: number, x = 0, y = 0, z = 0, p: Placement = {}): THREE.BufferGeometry {
  return at(new THREE.PlaneGeometry(w, h), x, y, z, p);
}

export function cyl(
  rTop: number,
  rBot: number,
  h: number,
  segs: number,
  x = 0,
  y = 0,
  z = 0,
  p: Placement = {}
): THREE.BufferGeometry {
  return at(new THREE.CylinderGeometry(rTop, rBot, h, segs, 1), x, y, z, p);
}

export function sphere(r: number, segs: number, x = 0, y = 0, z = 0, p: Placement = {}): THREE.BufferGeometry {
  return at(new THREE.SphereGeometry(r, segs, Math.max(4, segs >> 1)), x, y, z, p);
}

/** Ground-facing quad (normal +Y) at height `y`. */
export function floorQuad(w: number, d: number, x = 0, y = 0, z = 0, ry = 0): THREE.BufferGeometry {
  return plane(w, d, x, y, z, { rx: -Math.PI / 2, ry });
}

/** Paints a uniform vertex colour so several tints can share one material. */
export function tint(geo: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// ---------------------------------------------------------------------------
// Draw-call batching
// ---------------------------------------------------------------------------

interface Bucket {
  material: THREE.Material;
  cast: boolean;
  receive: boolean;
  geos: THREE.BufferGeometry[];
}

/**
 * Accumulates geometry per (material, shadow flags) and emits one merged mesh
 * per bucket. Source geometries are disposed once merged.
 */
export class Batch {
  private buckets = new Map<string, Bucket>();

  add(material: THREE.Material, geo: THREE.BufferGeometry, cast = true, receive = true): void {
    const key = `${material.uuid}|${cast ? 1 : 0}|${receive ? 1 : 0}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { material, cast, receive, geos: [] };
      this.buckets.set(key, bucket);
    }
    bucket.geos.push(geo);
  }

  addAll(material: THREE.Material, geos: THREE.BufferGeometry[], cast = true, receive = true): void {
    for (const g of geos) this.add(material, g, cast, receive);
  }

  /** Merges everything into `parent`; returns the meshes created. */
  flush(parent: THREE.Object3D, name = 'batch'): THREE.Mesh[] {
    const made: THREE.Mesh[] = [];
    let i = 0;
    for (const bucket of this.buckets.values()) {
      const geos = bucket.geos.filter((g) => g.getAttribute('position'));
      if (!geos.length) continue;
      const keys = Object.keys(geos[0].attributes).sort().join(',');
      const uniform = geos.every((g) => Object.keys(g.attributes).sort().join(',') === keys);
      const merged = uniform && geos.length > 1 ? mergeGeometries(geos, false) : null;
      if (merged) {
        for (const g of geos) g.dispose();
        const mesh = new THREE.Mesh(merged, bucket.material);
        mesh.name = `${name}.${i++}`;
        mesh.castShadow = bucket.cast;
        mesh.receiveShadow = bucket.receive;
        parent.add(mesh);
        made.push(mesh);
      } else {
        for (const g of geos) {
          const mesh = new THREE.Mesh(g, bucket.material);
          mesh.name = `${name}.${i++}`;
          mesh.castShadow = bucket.cast;
          mesh.receiveShadow = bucket.receive;
          parent.add(mesh);
          made.push(mesh);
        }
      }
    }
    this.buckets.clear();
    return made;
  }
}

/** Collects anything that needs releasing when a scene is torn down. */
export class Disposal {
  private items: { dispose: () => void }[] = [];

  own<T extends { dispose: () => void }>(item: T): T {
    this.items.push(item);
    return item;
  }

  /** Disposes every geometry and non-shared material under a subtree. */
  ownTree(root: THREE.Object3D): void {
    this.items.push({
      dispose: () => {
        root.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) m.geometry.dispose();
        });
      },
    });
  }

  run(): void {
    for (const item of this.items) item.dispose();
    this.items.length = 0;
  }
}

// ---------------------------------------------------------------------------
// Material library (cached: surfaces are expensive to synthesise)
// ---------------------------------------------------------------------------

const materialCache = new Map<string, THREE.Material>();

function cached<T extends THREE.Material>(key: string, make: () => T): T {
  const hit = materialCache.get(key);
  if (hit) return hit as T;
  const made = make();
  materialCache.set(key, made);
  return made;
}

function surf(
  key: string,
  fn: SurfaceFn,
  opts: SurfaceOptions = {},
  params: Partial<THREE.MeshPhysicalMaterialParameters> = {}
): THREE.MeshPhysicalMaterial {
  const ck = `surf:${key}:${opts.size ?? 512}:${opts.repeat ?? 1}:${JSON.stringify(params)}`;
  return cached(ck, () => surfaceMaterial(buildSurface(key, fn, opts), params));
}

export interface MatOpts {
  tier: QualityTier;
}

/** Named, cached surfaces used across the three sets. */
export const mat = {
  asphalt: (o: MatOpts, repeat = 9) =>
    surf('asphalt', asphalt, { size: texSize(o.tier), repeat, normalStrength: 2.4 }, { envMapIntensity: 1.2 }),

  wetAsphalt: (o: MatOpts, repeat = 9) =>
    surf(
      'asphalt',
      asphalt,
      { size: texSize(o.tier), repeat, normalStrength: 1.2 },
      { roughness: 0.55, envMapIntensity: 1.6 }
    ),

  concrete: (o: MatOpts, repeat = 4) =>
    surf('concrete', concrete, { size: texSize(o.tier), repeat, normalStrength: 2 }, { envMapIntensity: 1 }),

  pavement: (o: MatOpts, repeat = 8) =>
    surf(
      'concrete',
      concrete,
      { size: texSize(o.tier), repeat, normalStrength: 2 },
      { roughness: 0.62, envMapIntensity: 1.3 }
    ),

  brick: (o: MatOpts, repeat = 5) =>
    surf('brick', brick, { size: texSize(o.tier), repeat, normalStrength: 2.6 }, { envMapIntensity: 1 }),

  panel: (o: MatOpts, tintRgb: [number, number, number], repeat = 3, cols = 4, rows = 3) =>
    surf(
      `panel:${cols}:${rows}:${tintRgb.join(',')}`,
      panelMetal(cols, rows, tintRgb),
      { size: texSize(o.tier), repeat, normalStrength: 2 },
      { envMapIntensity: 1.1 }
    ),

  rusted: (o: MatOpts, repeat = 2) =>
    surf('rustedMetal', rustedMetal, { size: texSize(o.tier, 384), repeat, normalStrength: 2.2 }, {}),

  brushed: (o: MatOpts, repeat = 2) =>
    surf('brushedMetal', brushedMetal, { size: texSize(o.tier, 384), repeat, normalStrength: 1.6 }, {}),

  tiles: (o: MatOpts, repeat = 6, count = 8, tintRgb: [number, number, number] = [0.7, 0.71, 0.7]) =>
    surf(
      `tiles:${count}:${tintRgb.join(',')}`,
      tiles(count, tintRgb),
      { size: texSize(o.tier), repeat, normalStrength: 2 },
      {}
    ),

  wood: (o: MatOpts, repeat = 4) =>
    surf('woodFloor', woodFloor, { size: texSize(o.tier), repeat, normalStrength: 1.8 }, { envMapIntensity: 0.9 }),

  plaster: (o: MatOpts, tintRgb: [number, number, number] = [0.62, 0.6, 0.58], repeat = 3) =>
    surf(`plaster:${tintRgb.join(',')}`, plaster(tintRgb), { size: texSize(o.tier, 384), repeat, normalStrength: 1.4 }, {}),

  fabric: (o: MatOpts, tintRgb: [number, number, number] = [0.28, 0.3, 0.34], repeat = 3, weave = 48) =>
    surf(
      `fabric:${weave}:${tintRgb.join(',')}`,
      fabric(tintRgb, weave),
      { size: texSize(o.tier, 384), repeat, normalStrength: 1.2 },
      {}
    ),

  acoustic: (o: MatOpts, repeat = 3) =>
    surf('acousticPanel', acousticPanel, { size: texSize(o.tier), repeat, normalStrength: 1.6 }, {}),

  grimyGlass: (o: MatOpts, repeat = 2) =>
    surf(
      'grimyGlass',
      grimyGlass,
      { size: texSize(o.tier, 384), repeat, normalStrength: 0.8 },
      { transparent: true, opacity: 0.26, roughness: 0.14, metalness: 0.0, envMapIntensity: 0.9, side: THREE.DoubleSide }
    ),
};

/** Flat painted material — cheap filler for objects that never fill frame. */
export function paint(
  color: THREE.ColorRepresentation,
  roughness = 0.6,
  metalness = 0
): THREE.MeshStandardMaterial {
  return cached(`paint:${new THREE.Color(color).getHexString()}:${roughness}:${metalness}`, () =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness })
  );
}

/** Painted material driven by vertex colours; lets many tints share one draw. */
export function paintVC(roughness = 0.6, metalness = 0): THREE.MeshStandardMaterial {
  return cached(`paintVC:${roughness}:${metalness}`, () =>
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness, metalness, vertexColors: true })
  );
}

/** HDR emitter. `intensity` above 1 pushes the surface into the bloom range. */
export function emitter(color: THREE.ColorRepresentation, intensity = 2): THREE.MeshStandardMaterial {
  return cached(`emit:${new THREE.Color(color).getHexString()}:${intensity}`, () =>
    new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 1,
      metalness: 0,
    })
  );
}

/** Uncached emitter, for surfaces whose intensity is animated. */
export function liveEmitter(color: THREE.ColorRepresentation, intensity = 2): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 1,
    metalness: 0,
  });
}

/** Additive, unlit quad material — glows, halos, light cones. */
export function additive(
  map: THREE.Texture | null,
  color: THREE.ColorRepresentation = 0xffffff,
  opacity = 1,
  vertexColors = false
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: map ?? undefined,
    color,
    opacity,
    vertexColors,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true,
  });
}

export function disposeMaterialCache(): void {
  for (const m of materialCache.values()) m.dispose();
  materialCache.clear();
}

// ---------------------------------------------------------------------------
// Procedural alpha stencils
// ---------------------------------------------------------------------------

const stencilCache = new Map<string, THREE.Texture>();

function alphaTexture(key: string, size: number, fill: (u: number, v: number) => number): THREE.Texture {
  const hit = stencilCache.get(key);
  if (hit) return hit;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = clamp(fill((x + 0.5) / size, (y + 0.5) / size));
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = a * 255;
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  stencilCache.set(key, t);
  return t;
}

/** Diamond wire lattice used for chain-link fencing. */
export function chainLinkAlpha(cells = 7, thickness = 0.055): THREE.Texture {
  return alphaTexture(`chain:${cells}:${thickness}`, 256, (u, v) => {
    const a = Math.abs(((u + v) * cells) % 1 - 0.5);
    const b = Math.abs(((u - v + 1) * cells) % 1 - 0.5);
    const d = Math.min(a, b);
    return 1 - smoothstep(thickness * 0.6, thickness, d);
  });
}

/** Irregular blob, for spilled fluids and grime decals. */
export function blotchAlpha(seed = 3): THREE.Texture {
  const rng = new Rng(seed * 977 + 13);
  const lobes: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) {
    lobes.push([rng.range(0.28, 0.72), rng.range(0.28, 0.72), rng.range(0.07, 0.2)]);
  }
  return alphaTexture(`blotch:${seed}`, 128, (u, v) => {
    let m = 0;
    for (const [cx, cy, r] of lobes) m = Math.max(m, 1 - smoothstep(r * 0.5, r, Math.hypot(u - cx, v - cy)));
    return m;
  });
}

/** Sole tread pattern for boot prints. */
export function bootPrintAlpha(): THREE.Texture {
  return alphaTexture('boot', 128, (u, v) => {
    const inSole = 1 - smoothstep(0.3, 0.42, Math.hypot((u - 0.5) * 2.4, (v - 0.42) * 1.05));
    const heel = 1 - smoothstep(0.22, 0.32, Math.hypot((u - 0.5) * 2.6, (v - 0.84) * 1.5));
    const tread = Math.abs((v * 16) % 1 - 0.5) > 0.22 ? 1 : 0.25;
    return Math.max(inSole * tread, heel * 0.9);
  });
}

export function disposeStencilCache(): void {
  for (const t of stencilCache.values()) t.dispose();
  stencilCache.clear();
}

// ---------------------------------------------------------------------------
// Lit window fields (instanced)
// ---------------------------------------------------------------------------

export interface WindowCell {
  /** Point on the wall surface. */
  center: THREE.Vector3;
  width: number;
  height: number;
  /** Facing of the wall: 0 looks along +Z. */
  yaw: number;
}

export interface WindowField {
  group: THREE.Group;
  update: (elapsed: number) => void;
}

const WINDOW_PALETTE: THREE.ColorRepresentation[] = [
  0xffb066, // tungsten
  0xffd2a0, // warm white
  0xd8e8ff, // cool fluorescent
  0xa8ffd0, // sickly green
  0x7fb4ff, // television
  0xff9a5c, // sodium spill
  0xf2f6ff, // clinical
];

/**
 * Builds two instanced meshes — recessed frames and emissive glass — from a
 * list of window openings, with a handful set to flicker.
 */
export function buildWindowField(cells: WindowCell[], rng: Rng, seedTint = 1): WindowField {
  const group = new THREE.Group();
  group.name = 'windows';
  const n = cells.length;
  if (!n) return { group, update: () => {} };

  const glassMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.72, metalness: 0.1 });
  const glass = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glassMat, n);
  const frames = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), frameMat, n);
  glass.castShadow = false;
  glass.receiveShadow = false;
  frames.castShadow = false;
  frames.receiveShadow = true;

  const base = new Float32Array(n * 3);
  const flickerIdx: number[] = [];
  const flickerPhase: number[] = [];
  const color = new THREE.Color();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();

  for (let i = 0; i < n; i++) {
    const c = cells[i];
    const nx = Math.sin(c.yaw);
    const nz = Math.cos(c.yaw);
    e.set(0, c.yaw, 0);
    q.setFromEuler(e);

    // The reveal box sits behind the pane, poking just proud of the wall, so
    // the lit glass is never swallowed by its own frame.
    p.set(c.center.x - nx * 0.05, c.center.y, c.center.z - nz * 0.05);
    s.set(c.width + 0.14, c.height + 0.14, 0.17);
    frames.setMatrixAt(i, m.compose(p, q, s));

    p.set(c.center.x + nx * 0.05, c.center.y, c.center.z + nz * 0.05);
    s.set(c.width, c.height, 1);
    glass.setMatrixAt(i, m.compose(p, q, s));

    const lit = rng.chance(0.72);
    if (lit) {
      color.set(rng.pick(WINDOW_PALETTE));
      const level = rng.range(0.16, 0.95) * (rng.chance(0.16) ? 2.1 : 1) * (0.85 + seedTint * 0.15);
      color.multiplyScalar(level);
      if (rng.chance(0.09)) {
        flickerIdx.push(i);
        flickerPhase.push(rng.range(0, 20));
      }
    } else {
      color.setRGB(0.012, 0.014, 0.02);
    }
    base[i * 3] = color.r;
    base[i * 3 + 1] = color.g;
    base[i * 3 + 2] = color.b;
    glass.setColorAt(i, color);
  }
  glass.instanceMatrix.needsUpdate = true;
  frames.instanceMatrix.needsUpdate = true;
  if (glass.instanceColor) glass.instanceColor.needsUpdate = true;
  group.add(frames, glass);

  const attr = glass.instanceColor;
  const update = (elapsed: number) => {
    if (!attr || !flickerIdx.length) return;
    for (let k = 0; k < flickerIdx.length; k++) {
      const i = flickerIdx[k];
      const t = elapsed * (3.1 + (k % 5) * 1.7) + flickerPhase[k];
      const wobble = Math.sin(t) * Math.sin(t * 2.37 + 1.1);
      const gate = wobble > 0.1 ? 1 : wobble > -0.35 ? 0.34 : 0.06;
      attr.setXYZ(i, base[i * 3] * gate, base[i * 3 + 1] * gate, base[i * 3 + 2] * gate);
    }
    attr.needsUpdate = true;
  };
  return { group, update };
}

// ---------------------------------------------------------------------------
// Animated shader props
// ---------------------------------------------------------------------------

const STEAM_VERT = /* glsl */ `
attribute vec3 seed;
uniform float uTime;
uniform float uRadius;
uniform float uHeight;
uniform float uRise;
uniform float uSize;
uniform vec3 uDrift;
varying float vLife;
varying float vSeed;

void main() {
  float life = fract(seed.z + uTime * uRise);
  vLife = life;
  vSeed = seed.y;
  float ang = seed.x * 6.28318;
  float spread = uRadius * (0.2 + seed.y * 0.8) * (0.3 + life * 1.9);
  vec3 p = vec3(cos(ang) * spread, life * uHeight, sin(ang) * spread) + uDrift * life * uHeight;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.35 + life * 2.6) * (300.0 / max(-mv.z, 0.4));
}
`;

const STEAM_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uOpacity;
varying float vLife;
varying float vSeed;

void main() {
  float a = texture2D(uMap, gl_PointCoord).a;
  a *= smoothstep(0.0, 0.14, vLife) * (1.0 - smoothstep(0.35, 1.0, vLife));
  a *= uOpacity * (0.4 + vSeed * 0.8);
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

export interface SteamOptions {
  count?: number;
  radius?: number;
  height?: number;
  rise?: number;
  size?: number;
  color?: THREE.ColorRepresentation;
  opacity?: number;
  drift?: THREE.Vector3;
  seed?: number;
}

export interface AnimatedProp {
  object: THREE.Object3D;
  update: (dt: number, elapsed: number) => void;
  dispose: () => void;
}

/** Rising vapour column — sewer vents, kettle steam, exhaust. */
export function buildSteam(opts: SteamOptions = {}): AnimatedProp {
  const count = Math.max(8, opts.count ?? 90);
  const rng = new Rng(opts.seed ?? 4242);
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = rng.next();
    seeds[i * 3 + 1] = rng.next();
    seeds[i * 3 + 2] = rng.next();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, (opts.height ?? 3) * 0.5, 0), (opts.height ?? 3) * 1.5);

  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uRadius: { value: opts.radius ?? 0.5 },
    uHeight: { value: opts.height ?? 3 },
    uRise: { value: opts.rise ?? 0.075 },
    uSize: { value: opts.size ?? 2.6 },
    uDrift: { value: (opts.drift ?? new THREE.Vector3(0.12, 0, 0.05)).clone() },
    uMap: { value: radialAlphaTexture(1.7, 96) },
    uColor: { value: new THREE.Color(opts.color ?? 0x8fa6c4) },
    uOpacity: { value: opts.opacity ?? 0.2 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: STEAM_VERT,
    fragmentShader: STEAM_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  return {
    object: points,
    update: (dt) => {
      uniforms.uTime.value = (uniforms.uTime.value as number) + dt;
    },
    dispose: () => {
      geo.dispose();
      material.dispose();
    },
  };
}

const WET_REFLECT_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const WET_REFLECT_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uTime;
uniform float uIntensity;
uniform float uWobble;
varying vec2 vUv;

void main() {
  // vUv.y == 1 sits against the wall, under the sign; 0 is the far end of the
  // smear, so the mirrored image runs away from the viewer as t grows.
  float t = 1.0 - vUv.y;
  float ripple =
    sin(t * 19.0 + uTime * 1.7) * 0.011 +
    sin(t * 43.0 - uTime * 2.9 + vUv.x * 6.0) * 0.006 +
    sin(t * 7.0 + uTime * 0.8) * 0.017;
  vec2 suv = vec2(clamp(vUv.x + ripple * uWobble * (0.2 + t * 1.6), 0.001, 0.999), clamp(t, 0.001, 0.999));
  vec3 c = texture2D(uMap, suv).rgb;
  // Canvas textures arrive sRGB-encoded; linearise before adding.
  c = c * c;
  float fade = smoothstep(0.0, 0.05, t) * pow(1.0 - t, 1.35);
  gl_FragColor = vec4(c * uColor * uIntensity * fade, 1.0);
}
`;

/**
 * Smeared reflection of a sign in standing water. Cheaper and more controllable
 * than a real planar reflection, and it can ripple.
 */
export function buildWetReflection(
  map: THREE.Texture,
  width: number,
  length: number,
  color: THREE.ColorRepresentation,
  intensity = 0.55,
  wobble = 1
): { mesh: THREE.Mesh; update: (dt: number) => void; dispose: () => void } {
  const uniforms: Record<string, THREE.IUniform> = {
    uMap: { value: map },
    uColor: { value: new THREE.Color(color) },
    uTime: { value: 0 },
    uIntensity: { value: intensity },
    uWobble: { value: wobble },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: WET_REFLECT_VERT,
    fragmentShader: WET_REFLECT_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const geo = new THREE.PlaneGeometry(width, length);
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -Math.PI / 2;
  return {
    mesh,
    update: (dt) => {
      uniforms.uTime.value = (uniforms.uTime.value as number) + dt;
    },
    dispose: () => {
      geo.dispose();
      material.dispose();
    },
  };
}

const GLASS_RAIN_FRAG = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor;
varying vec2 vUv;

float h21(vec2 p) {
  p = fract(p * vec2(127.31, 311.7));
  p += dot(p, p + 34.19);
  return fract(p.x * p.y);
}

float column(vec2 uv, float cols, float speed, float seedOff) {
  vec2 st = vec2(uv.x * cols, uv.y);
  float id = floor(st.x);
  float fx = fract(st.x) - 0.5;
  float r = h21(vec2(id, seedOff));
  float r2 = h21(vec2(id, seedOff + 5.1));
  // A head drop running down, leaving a thinning trail behind it.
  float head = fract(-uv.y * (0.6 + r2 * 0.5) - uTime * speed * (0.5 + r) + r * 7.0);
  float y = fract(uv.y * (0.6 + r2 * 0.5) + uTime * speed * (0.5 + r) + r * 7.0);
  float body = smoothstep(0.06, 0.0, abs(fx) * (1.6 + r2));
  float drop = smoothstep(0.045, 0.0, abs(y - 0.5)) * body;
  float trail = smoothstep(0.0, 0.55, y - 0.5) * smoothstep(0.055, 0.0, abs(fx) * (3.0 + r2 * 3.0)) * 0.35;
  return (drop + trail) * (0.35 + r * 0.65) * step(0.18, r) * (0.6 + 0.4 * head);
}

void main() {
  float s = column(vUv, 13.0, 0.11, 1.0) + column(vUv + vec2(0.31, 0.0), 23.0, 0.19, 9.0) * 0.7;
  // Static speckle of clinging droplets
  vec2 g = floor(vUv * vec2(70.0, 90.0));
  float sp = h21(g);
  s += step(0.965, sp) * 0.5 * h21(g + 3.0);
  float a = clamp(s, 0.0, 1.0) * uIntensity;
  if (a < 0.006) discard;
  gl_FragColor = vec4(uColor * a, a);
}
`;

/** Rain running down a pane; sits a few millimetres in front of the glass. */
export function buildGlassRain(
  width: number,
  height: number,
  intensity = 0.55,
  color: THREE.ColorRepresentation = 0x9fc4ff
): { mesh: THREE.Mesh; update: (dt: number) => void; dispose: () => void } {
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uIntensity: { value: intensity },
    uColor: { value: new THREE.Color(color) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: WET_REFLECT_VERT,
    fragmentShader: GLASS_RAIN_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const geo = new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geo, material);
  return {
    mesh,
    update: (dt) => {
      uniforms.uTime.value = (uniforms.uTime.value as number) + dt;
    },
    dispose: () => {
      geo.dispose();
      material.dispose();
    },
  };
}

/**
 * Visible cone of a practical light. Built open-ended and additive so it reads
 * as haze rather than a solid.
 */
export function lightCone(
  topRadius: number,
  bottomRadius: number,
  height: number,
  color: THREE.ColorRepresentation,
  segs = 16
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(topRadius, bottomRadius, height, segs, 4, true);
  const pos = geo.getAttribute('position');
  const n = pos.count;
  const arr = new Float32Array(n * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < n; i++) {
    const y = pos.getY(i);
    // Peaks just below the fitting and dies at both ends, so the volume reads
    // as haze rather than a hard-edged tube.
    const t = clamp((y + height / 2) / height);
    const f = Math.pow(t, 2.6) * (1 - Math.pow(t, 5)) * 1.7 + 0.015;
    arr[i * 3] = c.r * f;
    arr[i * 3 + 1] = c.g * f;
    arr[i * 3 + 2] = c.b * f;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Soft billboard halo around a light source. */
export function halo(size: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, ry = 0) {
  return tint(plane(size, size, x, y, z, { ry }), new THREE.Color(color));
}

// ---------------------------------------------------------------------------
// Street props
// ---------------------------------------------------------------------------

export interface StreetPropCtx {
  batch: Batch;
  opts: MatOpts;
  rng: Rng;
}

export function dumpster(ctx: StreetPropCtx, x: number, y: number, z: number, ry = 0): void {
  const { batch, opts, rng } = ctx;
  const body = mat.rusted(opts, 1.5);
  const dark = paint(0x1a2620, 0.85);
  const w = 1.85;
  const h = 1.15;
  const d = 1.05;
  const g: THREE.BufferGeometry[] = [];
  g.push(box(w, h, 0.06, 0, h / 2, d / 2));
  g.push(box(w, h, 0.06, 0, h / 2, -d / 2));
  g.push(box(0.06, h, d, -w / 2, h / 2, 0));
  g.push(box(0.06, h, d, w / 2, h / 2, 0));
  g.push(box(w, 0.05, d, 0, 0.16, 0));
  // Sloped, half-open lids
  g.push(box(w * 0.5, 0.05, d * 1.04, -w * 0.25, h + 0.06, 0.02, { rx: rng.range(-0.5, -0.25) }));
  g.push(box(w * 0.5, 0.05, d * 1.04, w * 0.25, h + 0.02, 0, { rx: 0.06 }));
  // Ribs
  for (let i = -1; i <= 1; i++) g.push(box(0.05, h * 0.9, 0.08, i * 0.5, h / 2, d / 2 + 0.04));
  for (const geo of g) batch.add(body, at(geo, x, y, z, { ry }));

  const wheels: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      wheels.push(cyl(0.1, 0.1, 0.07, 8, sx * (w / 2 - 0.16), 0.1, sz * (d / 2 - 0.12), { rz: Math.PI / 2 }));
    }
  }
  for (const geo of wheels) batch.add(dark, at(geo, x, y, z, { ry }));
}

export function trashBags(ctx: StreetPropCtx, x: number, y: number, z: number, count: number, spread = 0.9): void {
  const { batch, opts, rng } = ctx;
  const bagMat = paint(0x14161a, 0.42);
  void opts;
  for (let i = 0; i < count; i++) {
    const bx = x + rng.range(-spread, spread);
    const bz = z + rng.range(-spread * 0.6, spread * 0.6);
    const r = rng.range(0.2, 0.32);
    const g = sphere(r, 10, bx, y + r * 0.78, bz, { sy: rng.range(0.7, 0.95), sx: rng.range(0.85, 1.15) });
    batch.add(bagMat, g);
    // Knot
    batch.add(bagMat, cyl(0.03, 0.055, 0.12, 6, bx, y + r * 1.42, bz));
  }
}

export function wallPipes(
  ctx: StreetPropCtx,
  x: number,
  y0: number,
  y1: number,
  z: number,
  ry: number,
  count: number,
  spacing = 0.22
): void {
  const { batch, opts, rng } = ctx;
  const m = mat.rusted(opts, 1.2);
  const segs = radialSegs(opts.tier, 10);
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * spacing;
    const r = rng.range(0.035, 0.075);
    const h = y1 - y0;
    const nx = Math.sin(ry);
    const nz = Math.cos(ry);
    const px = x + Math.cos(ry) * off;
    const pz = z - Math.sin(ry) * off;
    batch.add(m, cyl(r, r, h, segs, px + nx * r, y0 + h / 2, pz + nz * r));
    // Brackets
    for (let k = 0; k <= 3; k++) {
      const by = y0 + (h * k) / 3;
      batch.add(m, box(r * 2.6, 0.05, 0.1, px + nx * r * 0.5, by, pz + nz * r * 0.5, { ry }));
    }
  }
}

export function fireEscape(
  ctx: StreetPropCtx,
  x: number,
  z: number,
  ry: number,
  levels: number,
  storey: number,
  base: number,
  width = 2.4
): void {
  const { batch, opts } = ctx;
  const m = mat.rusted(opts, 1.6);
  const g: THREE.BufferGeometry[] = [];
  const depth = 1.15;
  for (let l = 0; l < levels; l++) {
    const y = base + l * storey;
    // Grated deck (slats, so it reads as open metal)
    for (let s = 0; s < 7; s++) {
      g.push(box(width, 0.035, 0.075, 0, y, -depth / 2 + 0.1 + (s * (depth - 0.2)) / 6));
    }
    g.push(box(width, 0.06, 0.07, 0, y - 0.02, -depth + 0.06));
    // Railing
    g.push(box(width, 0.05, 0.05, 0, y + 1.0, -depth + 0.06));
    g.push(box(width, 0.03, 0.03, 0, y + 0.55, -depth + 0.06));
    for (let p = 0; p <= 5; p++) {
      g.push(box(0.035, 1.0, 0.035, -width / 2 + (p * width) / 5, y + 0.5, -depth + 0.06));
    }
    g.push(box(0.05, 1.0, depth, -width / 2, y + 0.5, -depth / 2));
    g.push(box(0.05, 1.0, depth, width / 2, y + 0.5, -depth / 2));
    // Diagonal stair to the level below
    if (l > 0) {
      const run = Math.hypot(storey, 1.0);
      const ang = Math.atan2(storey, 1.0);
      g.push(box(0.72, 0.05, run, width * 0.28, y - storey / 2, -depth * 0.42, { rx: Math.PI / 2 - ang }));
      g.push(box(0.03, 0.62, run, width * 0.28 + 0.36, y - storey / 2 + 0.32, -depth * 0.42, { rx: Math.PI / 2 - ang }));
    }
    // Supports back to the wall
    g.push(box(0.05, 0.05, depth, -width / 2 + 0.1, y - 0.14, -depth / 2, { rx: 0.5 }));
    g.push(box(0.05, 0.05, depth, width / 2 - 0.1, y - 0.14, -depth / 2, { rx: 0.5 }));
  }
  // Drop ladder
  g.push(box(0.05, storey * 0.85, 0.05, -0.3, base - storey * 0.42, -depth + 0.2));
  g.push(box(0.05, storey * 0.85, 0.05, 0.3, base - storey * 0.42, -depth + 0.2));
  for (let r = 0; r < 7; r++) {
    g.push(box(0.62, 0.03, 0.03, 0, base - storey * 0.82 + r * 0.17, -depth + 0.2));
  }
  for (const geo of g) batch.add(m, at(geo, x, 0, z, { ry }));
}

export function chainFence(
  parent: THREE.Object3D,
  ctx: StreetPropCtx,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  ry = 0
): void {
  const { batch, opts } = ctx;
  const post = mat.rusted(opts, 1);
  const g: THREE.BufferGeometry[] = [];
  const posts = Math.max(2, Math.round(width / 1.6) + 1);
  for (let i = 0; i < posts; i++) {
    const px = -width / 2 + (i * width) / (posts - 1);
    g.push(cyl(0.035, 0.04, height, 8, px, height / 2, 0));
  }
  g.push(cyl(0.03, 0.03, width, 8, 0, height - 0.03, 0, { rz: Math.PI / 2 }));
  g.push(cyl(0.025, 0.025, width, 6, 0, 0.06, 0, { rz: Math.PI / 2 }));
  for (const geo of g) batch.add(post, at(geo, x, y, z, { ry }));

  const meshTex = chainLinkAlpha(6, 0.05);
  const meshMat = new THREE.MeshStandardMaterial({
    color: 0x8d9299,
    roughness: 0.42,
    metalness: 0.85,
    alphaMap: meshTex,
    transparent: true,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
  });
  meshMat.alphaMap!.repeat.set(width * 1.1, height * 1.1);
  const wire = new THREE.Mesh(new THREE.PlaneGeometry(width, height - 0.08), meshMat);
  wire.position.set(x, y + height / 2 - 0.02, z);
  wire.rotation.y = ry;
  wire.castShadow = false;
  wire.receiveShadow = false;
  parent.add(wire);
}

export function streetLamp(
  ctx: StreetPropCtx,
  x: number,
  y: number,
  z: number,
  ry: number,
  height = 6.2,
  reach = 1.7
): THREE.Vector3 {
  const { batch, opts } = ctx;
  const m = mat.panel(opts, [0.19, 0.2, 0.22], 2, 2, 6);
  const segs = radialSegs(opts.tier, 10);
  const g: THREE.BufferGeometry[] = [];
  g.push(cyl(0.16, 0.24, 0.34, segs, 0, 0.17, 0));
  g.push(cyl(0.075, 0.11, height, segs, 0, height / 2 + 0.28, 0));
  // Curved arm approximated with three chords
  const steps = 3;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const p0 = new THREE.Vector3(reach * t0, height + 0.28 + Math.sin(t0 * Math.PI * 0.5) * 0.55, 0);
    const p1 = new THREE.Vector3(reach * t1, height + 0.28 + Math.sin(t1 * Math.PI * 0.5) * 0.55, 0);
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    const len = p0.distanceTo(p1);
    const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    g.push(cyl(0.06, 0.065, len, 8, mid.x, mid.y, mid.z, { rz: ang - Math.PI / 2 }));
  }
  const headX = reach;
  const headY = height + 0.78;
  g.push(box(0.62, 0.13, 0.36, headX, headY, 0));
  for (const geo of g) batch.add(m, at(geo, x, y, z, { ry }));

  const lens = emitter(0xffb45a, 6);
  batch.add(lens, at(box(0.5, 0.045, 0.28, headX, headY - 0.08, 0), x, y, z, { ry }), false, false);

  const nx = Math.cos(ry) * headX;
  const nz = -Math.sin(ry) * headX;
  return new THREE.Vector3(x + nx, y + headY - 0.12, z + nz);
}

export function trafficLight(ctx: StreetPropCtx, x: number, y: number, z: number, ry: number): THREE.Vector3 {
  const { batch, opts } = ctx;
  const m = mat.panel(opts, [0.16, 0.18, 0.17], 2, 2, 5);
  const segs = radialSegs(opts.tier, 10);
  const h = 3.5;
  const g: THREE.BufferGeometry[] = [];
  g.push(cyl(0.2, 0.26, 0.28, segs, 0, 0.14, 0));
  g.push(cyl(0.085, 0.1, h, segs, 0, h / 2 + 0.2, 0));
  g.push(cyl(0.06, 0.06, 1.05, 8, 0.5, h + 0.2, 0, { rz: Math.PI / 2 }));
  g.push(box(0.34, 0.95, 0.3, 1.0, h - 0.14, 0));
  // Hoods
  for (let i = 0; i < 3; i++) g.push(box(0.36, 0.05, 0.16, 1.0, h + 0.18 - i * 0.3, 0.19, { rx: -0.35 }));
  for (const geo of g) batch.add(m, at(geo, x, y, z, { ry }));

  batch.add(paint(0x2a0808, 0.5), at(cyl(0.1, 0.1, 0.05, 10, 1.0, h + 0.15, 0.16, { rx: Math.PI / 2 }), x, y, z, { ry }));
  batch.add(paint(0x2a2408, 0.5), at(cyl(0.1, 0.1, 0.05, 10, 1.0, h - 0.15, 0.16, { rx: Math.PI / 2 }), x, y, z, { ry }));
  const green = emitter(0x40ff88, 5);
  batch.add(
    green,
    at(cyl(0.1, 0.1, 0.05, 10, 1.0, h - 0.45, 0.16, { rx: Math.PI / 2 }), x, y, z, { ry }),
    false,
    false
  );
  return new THREE.Vector3(x + Math.cos(ry) * 1.0, y + h - 0.45, z - Math.sin(ry) * 1.0);
}

export function parkedCar(
  ctx: StreetPropCtx,
  x: number,
  y: number,
  z: number,
  ry: number,
  bodyColor: THREE.ColorRepresentation = 0x141a24
): void {
  const { batch, opts } = ctx;
  const bodyMat = cached(`carbody:${new THREE.Color(bodyColor).getHexString()}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: bodyColor,
      roughness: 0.19,
      metalness: 0.55,
      clearcoat: 0.85,
      clearcoatRoughness: 0.13,
      envMapIntensity: 1.5,
    })
  );
  const glassMat = cached('carglass', () =>
    new THREE.MeshPhysicalMaterial({
      color: 0x05070b,
      roughness: 0.07,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
      envMapIntensity: 2.4,
    })
  );
  const rubber = paint(0x0c0d10, 0.9);
  const chrome = mat.brushed(opts, 1);

  const L = 4.35;
  const W = 1.82;
  const g: THREE.BufferGeometry[] = [];
  g.push(box(W, 0.5, L, 0, 0.62, 0));
  g.push(box(W * 0.99, 0.26, L * 0.62, 0, 0.94, -0.12));
  g.push(box(W * 0.86, 0.36, L * 0.42, 0, 1.19, -0.16));
  // Bonnet and boot tapers
  g.push(box(W * 0.95, 0.2, L * 0.3, 0, 0.87, L * 0.32, { rx: -0.07 }));
  g.push(box(W * 0.95, 0.2, L * 0.24, 0, 0.9, -L * 0.36, { rx: 0.05 }));
  for (const geo of g) batch.add(bodyMat, at(geo, x, y, z, { ry }));

  const glass: THREE.BufferGeometry[] = [];
  glass.push(box(W * 0.8, 0.34, 0.04, 0, 1.19, L * 0.21 - 0.16, { rx: -0.38 }));
  glass.push(box(W * 0.8, 0.32, 0.04, 0, 1.18, -L * 0.21 - 0.16, { rx: 0.42 }));
  glass.push(box(0.04, 0.3, L * 0.4, W * 0.43, 1.19, -0.16));
  glass.push(box(0.04, 0.3, L * 0.4, -W * 0.43, 1.19, -0.16));
  for (const geo of glass) batch.add(glassMat, at(geo, x, y, z, { ry }), true, false);

  const segs = radialSegs(opts.tier, 14);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wx = sx * (W / 2 - 0.06);
      const wz = sz * (L * 0.31);
      batch.add(rubber, at(cyl(0.33, 0.33, 0.22, segs, wx, 0.33, wz, { rz: Math.PI / 2 }), x, y, z, { ry }));
      batch.add(chrome, at(cyl(0.19, 0.19, 0.235, 10, wx, 0.33, wz, { rz: Math.PI / 2 }), x, y, z, { ry }));
    }
  }
  // Lamps
  batch.add(
    emitter(0xffe0c0, 1.4),
    at(box(0.34, 0.13, 0.05, W * 0.28, 0.85, L * 0.48), x, y, z, { ry }),
    false,
    false
  );
  batch.add(
    emitter(0xffe0c0, 1.4),
    at(box(0.34, 0.13, 0.05, -W * 0.28, 0.85, L * 0.48), x, y, z, { ry }),
    false,
    false
  );
  batch.add(emitter(0xff2a1a, 2.2), at(box(0.3, 0.11, 0.05, W * 0.3, 0.88, -L * 0.48), x, y, z, { ry }), false, false);
  batch.add(emitter(0xff2a1a, 2.2), at(box(0.3, 0.11, 0.05, -W * 0.3, 0.88, -L * 0.48), x, y, z, { ry }), false, false);
}

export function busShelter(ctx: StreetPropCtx, x: number, y: number, z: number, ry: number): void {
  const { batch, opts } = ctx;
  const frame = mat.panel(opts, [0.2, 0.22, 0.25], 2, 3, 4);
  const glassMat = mat.grimyGlass(opts, 1);
  const W = 3.4;
  const D = 1.35;
  const H = 2.4;
  const g: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    g.push(box(0.09, H, 0.09, (sx * W) / 2, H / 2, -D / 2));
    g.push(box(0.09, H, 0.09, (sx * W) / 2, H / 2, D / 2));
  }
  g.push(box(W + 0.2, 0.1, D + 0.2, 0, H, 0));
  g.push(box(W, 0.09, 0.09, 0, H - 0.1, -D / 2));
  g.push(box(W, 0.42, 0.28, 0, 0.52, -D / 2 + 0.16));
  for (const geo of g) batch.add(frame, at(geo, x, y, z, { ry }));

  const panels: THREE.BufferGeometry[] = [];
  panels.push(plane(W - 0.12, H - 0.3, 0, H / 2, -D / 2));
  panels.push(plane(D - 0.12, H - 0.3, -W / 2, H / 2, 0, { ry: Math.PI / 2 }));
  for (const geo of panels) batch.add(glassMat, at(geo, x, y, z, { ry }), false, false);
}

/** Flat scatter of paper, cans and leaves. */
export function litter(ctx: StreetPropCtx, cx: number, y: number, cz: number, spread: number, count: number): void {
  const { batch, rng } = ctx;
  const paper = paintVC(0.85, 0);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const px = cx + rng.range(-spread, spread);
    const pz = cz + rng.range(-spread, spread);
    const kind = rng.next();
    if (kind < 0.55) {
      c.setHSL(0.09, 0.05, rng.range(0.24, 0.52));
      const g = plane(rng.range(0.1, 0.22), rng.range(0.1, 0.26), px, y + 0.004 + i * 0.0006, pz, {
        rx: -Math.PI / 2,
        ry: rng.range(0, Math.PI),
      });
      batch.add(paper, tint(g, c), false, true);
    } else if (kind < 0.82) {
      c.setHSL(rng.range(0.0, 0.14), 0.35, 0.2);
      const g = cyl(0.033, 0.033, 0.12, 7, px, y + 0.033, pz, { rz: Math.PI / 2, ry: rng.range(0, Math.PI) });
      batch.add(paper, tint(g, c), true, true);
    } else {
      c.setHSL(0.11, 0.3, rng.range(0.1, 0.22));
      const g = plane(rng.range(0.06, 0.11), rng.range(0.05, 0.09), px, y + 0.004 + i * 0.0006, pz, {
        rx: -Math.PI / 2,
        ry: rng.range(0, Math.PI),
      });
      batch.add(paper, tint(g, c), false, true);
    }
  }
}

/** Dark, near-mirror standing water. */
export function puddleMaterial(opts: MatOpts): THREE.MeshPhysicalMaterial {
  void opts;
  return cached('puddle', () =>
    new THREE.MeshPhysicalMaterial({
      color: 0x05070a,
      roughness: 0.03,
      metalness: 0.05,
      reflectivity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.6,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    })
  );
}

// ---------------------------------------------------------------------------
// Interior props
// ---------------------------------------------------------------------------

export interface RoomShell {
  /** Inner half-extent on X. */
  hx: number;
  /** Inner half-extent on Z. */
  hz: number;
  height: number;
}

/** Steel interrogation chair. */
export function steelChair(
  batch: Batch,
  opts: MatOpts,
  x: number,
  y: number,
  z: number,
  ry: number,
  seatH = 0.46
): void {
  const m = mat.brushed(opts, 1);
  const g: THREE.BufferGeometry[] = [];
  g.push(box(0.44, 0.035, 0.42, 0, seatH, 0));
  g.push(box(0.42, 0.5, 0.035, 0, seatH + 0.28, -0.2, { rx: -0.1 }));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.push(cyl(0.017, 0.02, seatH, 6, sx * 0.18, seatH / 2, sz * 0.17));
    }
    g.push(cyl(0.015, 0.015, 0.34, 6, sx * 0.18, 0.12, 0, { rz: Math.PI / 2, ry: Math.PI / 2 }));
  }
  for (const geo of g) batch.add(m, at(geo, x, y, z, { ry }));
}

/** Bolted-down steel table with a boxed pedestal. */
export function steelTable(
  batch: Batch,
  opts: MatOpts,
  x: number,
  y: number,
  z: number,
  w = 1.4,
  d = 0.82,
  h = 0.75
): void {
  const top = mat.brushed(opts, 1.4);
  const leg = mat.panel(opts, [0.32, 0.34, 0.37], 1, 2, 2);
  batch.add(top, box(w, 0.045, d, x, y + h, z));
  batch.add(top, box(w - 0.06, 0.05, d - 0.06, x, y + h - 0.06, z));
  batch.add(leg, box(0.14, h - 0.09, 0.14, x, y + (h - 0.09) / 2, z));
  batch.add(leg, box(0.62, 0.03, 0.5, x, y + 0.014, z));
  // Anchor bolts
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      batch.add(top, cyl(0.022, 0.022, 0.03, 6, x + sx * 0.24, y + 0.038, z + sz * 0.19));
    }
  }
  // Restraint ring
  batch.add(top, at(new THREE.TorusGeometry(0.05, 0.011, 6, 12), x, y + h + 0.03, z - d * 0.28, { rx: Math.PI / 2 }));
}

export function ceilingCamera(batch: Batch, opts: MatOpts, x: number, y: number, z: number, ry: number, rx = -0.42): void {
  const m = mat.panel(opts, [0.4, 0.42, 0.45], 1, 2, 2);
  const g: THREE.BufferGeometry[] = [];
  g.push(box(0.12, 0.12, 0.06, 0, 0, 0));
  g.push(cyl(0.03, 0.03, 0.16, 8, 0, -0.04, 0.1, { rx: Math.PI / 2 }));
  g.push(box(0.13, 0.12, 0.3, 0, -0.05, 0.28, { rx }));
  g.push(cyl(0.05, 0.055, 0.09, 10, 0, -0.05 + Math.sin(rx) * 0.15, 0.42, { rx: Math.PI / 2 + rx }));
  for (const geo of g) batch.add(m, at(geo, x, y, z, { ry }));
  batch.add(emitter(0xff3020, 3), at(sphere(0.011, 6, 0.05, -0.02, 0.14), x, y, z, { ry }), false, false);
}

/** Simple hinged door in a frame; returns nothing, everything is batched. */
export function doorway(
  batch: Batch,
  frameMat: THREE.Material,
  doorMat: THREE.Material,
  x: number,
  y: number,
  z: number,
  ry: number,
  w = 0.92,
  h = 2.08,
  withWindow = false,
  windowMat?: THREE.Material
): void {
  const g: THREE.BufferGeometry[] = [];
  g.push(box(0.09, h + 0.08, 0.16, -w / 2 - 0.045, y + (h + 0.08) / 2, 0));
  g.push(box(0.09, h + 0.08, 0.16, w / 2 + 0.045, y + (h + 0.08) / 2, 0));
  g.push(box(w + 0.18, 0.09, 0.16, 0, y + h + 0.045, 0));
  for (const geo of g) batch.add(frameMat, at(geo, x, 0, z, { ry }));

  if (withWindow) {
    // Door built around a small vision panel
    const pw = 0.22;
    const ph = 0.4;
    const py = y + 1.45;
    const d: THREE.BufferGeometry[] = [];
    d.push(box(w, py - ph / 2 - y, 0.05, 0, y + (py - ph / 2 - y) / 2, 0));
    d.push(box(w, y + h - (py + ph / 2), 0.05, 0, py + ph / 2 + (y + h - (py + ph / 2)) / 2, 0));
    d.push(box((w - pw) / 2, ph, 0.05, -(w + pw) / 4, py, 0));
    d.push(box((w - pw) / 2, ph, 0.05, (w + pw) / 4, py, 0));
    for (const geo of d) batch.add(doorMat, at(geo, x, 0, z, { ry }));
    if (windowMat) batch.add(windowMat, at(plane(pw, ph, 0, py, 0.001), x, 0, z, { ry }), false, false);
  } else {
    batch.add(doorMat, at(box(w, h, 0.05, 0, y + h / 2, 0), x, 0, z, { ry }));
  }
  batch.add(
    paint(0x9aa0a8, 0.3, 0.9),
    at(cyl(0.017, 0.017, 0.13, 6, w / 2 - 0.09, y + 1.03, 0.07, { rx: Math.PI / 2 }), x, 0, z, { ry })
  );
}

export function sofa(batch: Batch, opts: MatOpts, x: number, y: number, z: number, ry: number, len = 2.0): void {
  const cloth = mat.fabric(opts, [0.2, 0.19, 0.21], 2.2, 44);
  const worn = mat.fabric(opts, [0.24, 0.22, 0.22], 1.6, 40);
  const foot = paint(0x231a12, 0.7);
  const d = 0.88;
  const g: THREE.BufferGeometry[] = [];
  g.push(box(len, 0.28, d, 0, y + 0.28, 0));
  g.push(box(len, 0.58, 0.24, 0, y + 0.66, -d / 2 + 0.12, { rx: -0.12 }));
  for (const sx of [-1, 1]) {
    g.push(box(0.22, 0.58, d, (sx * (len - 0.22)) / 2, y + 0.42, 0));
  }
  for (const geo of g) batch.add(cloth, at(geo, x, 0, z, { ry }));

  const cushions = Math.max(2, Math.round(len / 0.72));
  for (let i = 0; i < cushions; i++) {
    const cx = -len / 2 + 0.16 + ((i + 0.5) * (len - 0.32)) / cushions;
    batch.add(
      worn,
      at(box((len - 0.4) / cushions, 0.17, d - 0.24, cx, y + 0.5, 0.05, { rx: -0.03 }), x, 0, z, { ry })
    );
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      batch.add(foot, at(cyl(0.03, 0.025, 0.14, 6, (sx * (len - 0.3)) / 2, y + 0.07, sz * (d / 2 - 0.14)), x, 0, z, { ry }));
    }
  }
}

export function coffeeTable(batch: Batch, opts: MatOpts, x: number, y: number, z: number, ry: number, w = 1.05, d = 0.58): void {
  const top = mat.wood(opts, 1.4);
  const leg = paint(0x2a2018, 0.6);
  batch.add(top, at(box(w, 0.04, d, 0, y + 0.42, 0), x, 0, z, { ry }));
  batch.add(top, at(box(w - 0.16, 0.03, d - 0.14, 0, y + 0.16, 0), x, 0, z, { ry }));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      batch.add(
        leg,
        at(box(0.045, 0.42, 0.045, (sx * (w - 0.12)) / 2, y + 0.21, (sz * (d - 0.12)) / 2), x, 0, z, { ry })
      );
    }
  }
}

export function mug(batch: Batch, x: number, y: number, z: number, color: THREE.ColorRepresentation, ry = 0): void {
  const m = paint(color, 0.35);
  batch.add(m, cyl(0.042, 0.036, 0.095, 12, x, y + 0.0475, z));
  batch.add(m, at(new THREE.TorusGeometry(0.028, 0.008, 5, 10), x + 0.05, y + 0.052, z, { ry: Math.PI / 2 + ry }));
  batch.add(paint(0x120a06, 0.25), cyl(0.034, 0.034, 0.004, 10, x, y + 0.082, z), false, false);
}

export function bookshelf(batch: Batch, opts: MatOpts, rng: Rng, x: number, y: number, z: number, ry: number): void {
  const wood = mat.wood(opts, 1.2);
  const carcass = paint(0x2b2118, 0.72);
  const W = 0.92;
  const H = 1.94;
  const D = 0.3;
  const g: THREE.BufferGeometry[] = [];
  g.push(box(0.03, H, D, -W / 2, y + H / 2, 0));
  g.push(box(0.03, H, D, W / 2, y + H / 2, 0));
  g.push(box(W, 0.03, 0.01, 0, y + H / 2, -D / 2));
  for (let s = 0; s <= 4; s++) g.push(box(W, 0.028, D, 0, y + 0.06 + (s * (H - 0.1)) / 4, 0));
  for (const geo of g) batch.add(carcass, at(geo, x, 0, z, { ry }));

  const bookMat = paintVC(0.78, 0);
  const c = new THREE.Color();
  for (let s = 0; s < 4; s++) {
    const shelfY = y + 0.06 + (s * (H - 0.1)) / 4 + 0.014;
    let cursor = -W / 2 + 0.04;
    let lean = 0;
    while (cursor < W / 2 - 0.08) {
      if (rng.chance(0.14)) {
        cursor += rng.range(0.04, 0.11);
        continue;
      }
      const bw = rng.range(0.018, 0.042);
      const bh = rng.range(0.17, 0.27);
      lean = rng.chance(0.12) ? rng.range(-0.28, 0.28) : 0;
      c.setHSL(rng.range(0, 1), rng.range(0.12, 0.42), rng.range(0.1, 0.3));
      const geo = box(bw, bh, D - 0.08, cursor + bw / 2, shelfY + bh / 2, 0.01, { rz: lean });
      batch.add(bookMat, tint(at(geo, x, 0, z, { ry }), c));
      cursor += bw + 0.004 + Math.abs(lean) * 0.08;
    }
  }
}

export function fridge(batch: Batch, opts: MatOpts, x: number, y: number, z: number, ry: number): void {
  const body = cached('fridgebody', () =>
    new THREE.MeshPhysicalMaterial({ color: 0xd8d5cc, roughness: 0.36, metalness: 0.15, clearcoat: 0.3 })
  );
  const trim = paint(0x8b8b8b, 0.35, 0.8);
  const W = 0.68;
  const H = 1.72;
  const D = 0.66;
  batch.add(body, at(box(W, H, D, 0, y + H / 2, 0), x, 0, z, { ry }));
  batch.add(body, at(box(W - 0.02, 0.02, 0.02, 0, y + H * 0.63, D / 2 + 0.005), x, 0, z, { ry }));
  batch.add(trim, at(box(0.03, 0.5, 0.04, W / 2 - 0.09, y + H * 0.78, D / 2 + 0.03), x, 0, z, { ry }));
  batch.add(trim, at(box(0.03, 0.7, 0.04, W / 2 - 0.09, y + H * 0.3, D / 2 + 0.03), x, 0, z, { ry }));
}

export function kitchenCounter(
  batch: Batch,
  opts: MatOpts,
  x: number,
  y: number,
  z: number,
  ry: number,
  len: number
): void {
  const carcass = paint(0x3a3630, 0.7);
  const top = mat.tiles(opts, 2, 4, [0.34, 0.34, 0.33]);
  const D = 0.62;
  const H = 0.9;
  batch.add(carcass, at(box(len, H - 0.06, D, 0, y + (H - 0.06) / 2 + 0.06, 0), x, 0, z, { ry }));
  batch.add(carcass, at(box(len - 0.1, 0.06, D - 0.1, 0, y + 0.03, 0.03), x, 0, z, { ry }));
  batch.add(top, at(box(len + 0.03, 0.045, D + 0.03, 0, y + H, 0), x, 0, z, { ry }));
  const doors = Math.max(2, Math.round(len / 0.55));
  for (let i = 0; i < doors; i++) {
    const dx = -len / 2 + 0.02 + ((i + 0.5) * (len - 0.04)) / doors;
    batch.add(
      paint(0x4a453d, 0.62),
      at(box((len - 0.06) / doors - 0.02, H - 0.2, 0.02, dx, y + H / 2 - 0.02, D / 2 + 0.011), x, 0, z, { ry })
    );
    batch.add(
      paint(0x9aa0a8, 0.3, 0.9),
      at(cyl(0.008, 0.008, 0.11, 6, dx, y + H - 0.2, D / 2 + 0.035), x, 0, z, { ry })
    );
  }
}

export function sink(batch: Batch, opts: MatOpts, x: number, y: number, z: number, ry: number): void {
  const steel = mat.brushed(opts, 1);
  batch.add(steel, at(box(0.52, 0.02, 0.4, 0, y - 0.005, 0), x, 0, z, { ry }));
  batch.add(steel, at(box(0.46, 0.14, 0.34, 0, y - 0.08, 0), x, 0, z, { ry }));
  batch.add(steel, at(cyl(0.014, 0.014, 0.28, 8, 0, y + 0.14, -0.16), x, 0, z, { ry }));
  batch.add(steel, at(cyl(0.012, 0.012, 0.19, 8, 0, y + 0.27, -0.08, { rx: Math.PI / 2 }), x, 0, z, { ry }));
}

export function pictureFrame(
  batch: Batch,
  x: number,
  y: number,
  z: number,
  ry: number,
  w: number,
  h: number,
  frameColor: THREE.ColorRepresentation,
  imageMat: THREE.Material
): void {
  const f = paint(frameColor, 0.55);
  const t = 0.035;
  batch.add(f, at(box(w + t * 2, t, 0.035, 0, y + h / 2 + t / 2, 0), x, 0, z, { ry }), false, false);
  batch.add(f, at(box(w + t * 2, t, 0.035, 0, y - h / 2 - t / 2, 0), x, 0, z, { ry }), false, false);
  batch.add(f, at(box(t, h, 0.035, -w / 2 - t / 2, y, 0), x, 0, z, { ry }), false, false);
  batch.add(f, at(box(t, h, 0.035, w / 2 + t / 2, y, 0), x, 0, z, { ry }), false, false);
  batch.add(imageMat, at(plane(w, h, 0, y, 0.014), x, 0, z, { ry }), false, false);
}

/** Crumpled clothing — a few squashed spheres. */
export function laundryPile(batch: Batch, opts: MatOpts, rng: Rng, x: number, y: number, z: number, count = 4): void {
  const cloths = [
    mat.fabric(opts, [0.26, 0.24, 0.3], 2, 40),
    mat.fabric(opts, [0.3, 0.22, 0.2], 2, 40),
    mat.fabric(opts, [0.2, 0.24, 0.26], 2, 40),
  ];
  for (let i = 0; i < count; i++) {
    const m = cloths[i % cloths.length];
    const r = rng.range(0.11, 0.2);
    batch.add(
      m,
      sphere(r, 8, x + rng.range(-0.3, 0.3), y + r * 0.42, z + rng.range(-0.25, 0.25), {
        sy: rng.range(0.32, 0.52),
        sx: rng.range(0.9, 1.4),
        ry: rng.range(0, Math.PI),
      })
    );
  }
}
