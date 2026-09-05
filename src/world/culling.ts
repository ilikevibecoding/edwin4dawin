import * as THREE from 'three';

/**
 * Shadow-caster routing and view culling shared by the world systems.
 *
 * Object layers route casters to cascades. Bit 0 is the three.js default: the camera sees the object
 * and every cascade renders it. Objects that should only cast into some cascades use bit 1 for camera
 * visibility plus one bit per cascade (bits 2..5); objects that are outside the view but can still
 * throw a shadow into it drop the visibility bit and keep their cascade bits, so the main pass skips
 * them while the shadow passes still draw them. three.js tests shadow casters against the *main*
 * camera's layers, so `installCascadeRouting` renders the cascades one light at a time with the camera
 * mask switched to that cascade's bit.
 *
 * Which cascades an object is eligible for comes from two tests: its caster class against the texel
 * size of each cascade this frame (a piling is not worth drawing into a 3 m texel), and, through
 * `ViewCull.casterCascades`, whether the ground it shades can reach the slice of the view that cascade
 * covers (a tile 1 km away has nothing to add to the 4-8 km cascade).
 */
export const LAYER_DEFAULT = 0;
export const LAYER_CAMERA = 1; // camera visibility for objects that opt out of default casting
export const LAYER_CASCADE0 = 2; // cascade i renders layer LAYER_CASCADE0 + i
export const MAX_CASCADES = 4;
export const LAYER_MIRROR = 6; // seen by the water's mirror camera only (objects that stand in for others there)

/** Which cascades an object casts into: every cascade, those with texels under MID_TEXEL, or under NEAR_TEXEL only. */
export type CasterClass = 'all' | 'mid' | 'near';

/** Texel size (m) of a cascade below which thin casters (pilings, railings, lamp poles: class 'near')
 *  and small ones (cars, boats, thin steel: class 'mid') are worth drawing into it. */
export const NEAR_TEXEL = 0.6;
export const MID_TEXEL = 3.0;

const BIT = (layer: number) => 1 << layer;
export const ALL_CASCADES = (1 << MAX_CASCADES) - 1;
let _cascadeCount = 3;
const _cascadeTexel: number[] = [];
/** cascade-index bitmask each class is eligible for this frame */
const _classCascades: Record<CasterClass, number> = { all: ALL_CASCADES, mid: ALL_CASCADES, near: ALL_CASCADES };
/** per-cascade sampled depth range (m), set by the cascade fitter */
const _cascadeDepth: { near: number; far: number }[] = [];

/** Record this frame's cascades (texel size and sampled depth range), set by the cascade fitter before the culling runs. */
export function setCascades(info: { texel: number; near: number; far: number }[]): void {
  _cascadeCount = info.length;
  _cascadeTexel.length = 0;
  _cascadeDepth.length = 0;
  let all = 0, mid = 0, near = 0;
  for (let i = 0; i < info.length; i++) {
    const c = info[i];
    _cascadeTexel.push(c.texel);
    _cascadeDepth.push({ near: c.near, far: c.far });
    all |= 1 << i;
    if (c.texel < MID_TEXEL) mid |= 1 << i;
    if (c.texel < NEAR_TEXEL) near |= 1 << i;
  }
  _classCascades.all = all; _classCascades.mid = mid; _classCascades.near = near;
}

/** Layer mask for an object of caster class `cls` that is (or is not) drawn by the camera this frame and
 *  can shade the cascades in `cascadeBits` (default: every cascade). */
export function layerMask(cls: CasterClass, cameraVisible: boolean, cascadeBits = ALL_CASCADES): number {
  const bits = _classCascades[cls] & cascadeBits;
  if (cameraVisible && bits === _classCascades.all) return BIT(LAYER_DEFAULT);
  return (cameraVisible ? BIT(LAYER_CAMERA) : 0) | (bits << LAYER_CASCADE0);
}

/** True when a layer mask from `layerMask` reaches at least one cascade (i.e. the object should cast this frame). */
export function maskCasts(mask: number): boolean {
  return (mask & BIT(LAYER_DEFAULT)) !== 0 || (mask >> LAYER_CASCADE0) !== 0;
}

export function setCasterClass(obj: THREE.Object3D, cls: CasterClass, cameraVisible = true): void {
  obj.layers.mask = layerMask(cls, cameraVisible);
}

/** Main camera: default objects plus the opt-out casters. */
export function configureMainCamera(camera: THREE.Camera): void {
  camera.layers.set(LAYER_DEFAULT);
  camera.layers.enable(LAYER_CAMERA);
}

/** Layer mask used while rendering cascade `index`: default objects plus that cascade's bit. */
export function cascadeMask(index: number): number {
  return BIT(LAYER_DEFAULT) | BIT(LAYER_CASCADE0 + index);
}

/**
 * Wrap the renderer's shadow pass so each cascade light is rendered on its own with the camera's layer
 * mask set to that cascade's bit. `lights` is the renderer's list of shadow-casting lights in scene
 * order, which for the CSM is cascade 0 .. n-1. Lights that are not CSM cascades render as usual.
 */
export function installCascadeRouting(renderer: THREE.WebGLRenderer, isCascade: (light: THREE.Light) => number): void {
  const sm = renderer.shadowMap;
  const original = sm.render.bind(sm);
  const single: THREE.Light[] = [];
  sm.render = (lights: THREE.Light[], scene: THREE.Scene, camera: THREE.Camera) => {
    if (!sm.enabled || lights.length === 0) return;
    if (!sm.autoUpdate && !sm.needsUpdate) return;
    const needsUpdate = sm.needsUpdate;
    const saved = camera.layers.mask;
    const info = renderer.info.render;
    shadowPassStats.calls.length = shadowPassStats.triangles.length = 0;
    for (const l of lights) {
      const i = isCascade(l);
      camera.layers.mask = i >= 0 ? cascadeMask(i) : saved;
      single[0] = l;
      sm.needsUpdate = needsUpdate;
      _activeCascade = i;
      _activeFine = i < 0 || (_cascadeTexel[i] ?? 0) < NEAR_TEXEL;
      const c0 = info.calls, t0 = info.triangles;
      original(single, scene, camera);
      shadowPassStats.calls.push(info.calls - c0);
      shadowPassStats.triangles.push(info.triangles - t0);
    }
    _activeCascade = -1;
    _activeFine = false;
    single.length = 0;
    sm.needsUpdate = false;
    camera.layers.mask = saved;
  };
}

let _activeCascade = -1;
let _activeFine = false;

/** Draw calls / triangles of the last shadow pass, one entry per light (cascade order). */
export const shadowPassStats: { calls: number[]; triangles: number[] } = { calls: [], triangles: [] };

/** Index of the cascade whose shadow map is being rendered (inside `onBeforeShadow`), -1 otherwise. */
export function activeCascade(): number {
  return _activeCascade;
}

/** True when cascade `index` samples texels under NEAR_TEXEL this frame (casters under a metre wide are worth drawing into it). */
export function cascadeIsFine(index: number): boolean {
  return (_cascadeTexel[index] ?? 0) < NEAR_TEXEL;
}

/** True while a cascade with texels under NEAR_TEXEL (or a non-CSM light) renders its shadow map: the
 *  pass where casters under a metre wide are worth drawing. */
export function activeShadowPassIsFine(): boolean {
  return _activeFine;
}

const _sphere = new THREE.Sphere();
const _proj = new THREE.Matrix4();
const _mvp = new THREE.Matrix4();

/**
 * Per-frame culling volumes. `viewFrustum` is the camera frustum; `shadowFrustum` is the same frustum
 * cut at the CSM range, i.e. the volume that contains every shadow receiver; `cascadeFrustums[i]` is
 * the slice of it sampled by cascade i. A caster can only matter to a cascade when its own volume, or
 * the ground it shades (its footprint swept along the sun's shadow direction by height / tan(elevation)),
 * touches that slice.
 */
export class ViewCull {
  readonly viewFrustum = new THREE.Frustum();
  readonly shadowFrustum = new THREE.Frustum();
  readonly cascadeFrustums: THREE.Frustum[] = [];
  /** number of cascade frustums valid this frame */
  cascadeCount = 0;
  /** horizontal unit vector from a caster toward its shadow */
  readonly shadowDir = new THREE.Vector3(1, 0, 0);
  /** shadow length per metre of caster height (1 / tan elevation, capped for a grazing sun) */
  spread = 1;
  private readonly tmp = new THREE.Vector3();

  update(camera: THREE.PerspectiveCamera, shadowFar: number, sunDir: THREE.Vector3): void {
    _mvp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.viewFrustum.setFromProjectionMatrix(_mvp);
    const near = camera.near;
    const top = (near * Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * camera.fov)) / camera.zoom;
    const height = 2 * top, width = camera.aspect * height;
    const slice = (frustum: THREE.Frustum, n: number, f: number) => {
      // a slice of the view frustum between depths n and f: the same perspective with its near plane moved out
      const s = n / near;
      _proj.makePerspective((-width / 2) * s, (width / 2) * s, top * s, (top - height) * s, n, Math.max(n + 1, f), camera.coordinateSystem);
      _mvp.multiplyMatrices(_proj, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(_mvp);
    };
    slice(this.shadowFrustum, near, shadowFar);
    this.cascadeCount = Math.min(_cascadeDepth.length, MAX_CASCADES);
    for (let i = 0; i < this.cascadeCount; i++) {
      const f = this.cascadeFrustums[i] ??= new THREE.Frustum();
      slice(f, Math.max(near, _cascadeDepth[i].near), Math.min(shadowFar, _cascadeDepth[i].far));
    }
    const h = Math.hypot(sunDir.x, sunDir.z);
    if (h > 1e-5) this.shadowDir.set(-sunDir.x / h, 0, -sunDir.z / h);
    this.spread = Math.min(20, h / Math.max(sunDir.y, 1e-3));
  }

  boxInView(box: THREE.Box3): boolean {
    return this.viewFrustum.intersectsBox(box);
  }

  sphereInView(center: THREE.Vector3, radius: number): boolean {
    _sphere.set(center, radius);
    return this.viewFrustum.intersectsSphere(_sphere);
  }

  /** True when a caster bounded by the sphere (center, radius) and standing `height` metres tall could
   *  shade anything inside the shadow range of the view. */
  casterInView(center: THREE.Vector3, radius: number, height: number): boolean {
    this.sweep(center, radius, height);
    return this.shadowFrustum.intersectsSphere(_sphere);
  }

  /** Bitmask of the cascades whose slice the caster (see `casterInView`) could shade; ALL_CASCADES when
   *  the cascade slices are unknown this frame. */
  casterCascades(center: THREE.Vector3, radius: number, height: number): number {
    if (this.cascadeCount === 0) return this.casterInView(center, radius, height) ? ALL_CASCADES : 0;
    this.sweep(center, radius, height);
    let bits = 0;
    for (let i = 0; i < this.cascadeCount; i++) if (this.cascadeFrustums[i].intersectsSphere(_sphere)) bits |= 1 << i;
    return bits;
  }

  /** Same for a world-space box swept along the shadow direction (tight for long slivers such as a causeway). */
  boxCasterCascades(box: THREE.Box3, height: number): number {
    const len = Math.max(0, height) * this.spread;
    const sd = this.shadowDir;
    _swept.copy(box);
    if (sd.x > 0) _swept.max.x += sd.x * len; else _swept.min.x += sd.x * len;
    if (sd.z > 0) _swept.max.z += sd.z * len; else _swept.min.z += sd.z * len;
    if (this.cascadeCount === 0) return this.shadowFrustum.intersectsBox(_swept) ? ALL_CASCADES : 0;
    let bits = 0;
    for (let i = 0; i < this.cascadeCount; i++) if (this.cascadeFrustums[i].intersectsBox(_swept)) bits |= 1 << i;
    return bits;
  }

  private sweep(center: THREE.Vector3, radius: number, height: number): void {
    const len = Math.max(0, height) * this.spread;
    this.tmp.copy(center).addScaledVector(this.shadowDir, len * 0.5);
    _sphere.set(this.tmp, radius + len * 0.5);
  }
}

const _swept = new THREE.Box3();
