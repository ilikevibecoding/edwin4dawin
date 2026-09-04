import * as THREE from 'three';

/**
 * Shadow-caster routing and view culling shared by the world systems.
 *
 * Object layers route casters to cascades. Bit 0 is the three.js default: the camera sees the object
 * and every cascade renders it. Objects that should only cast into some cascades use bit 4 for camera
 * visibility plus one bit per cascade band; objects that are outside the view but can still throw a
 * shadow into it drop the visibility bit and keep their cascade bits, so the main pass skips them
 * while the shadow passes still draw them. three.js tests shadow casters against the *main* camera's
 * layers, so `installCascadeRouting` renders the cascades one light at a time with the camera mask
 * switched to that cascade's band.
 */
export const LAYER_DEFAULT = 0;
export const LAYER_CASCADE_NEAR = 1; // cascade 0
export const LAYER_CASCADE_MID = 2; // cascades 1 .. n-2
export const LAYER_CASCADE_FAR = 3; // cascade n-1
export const LAYER_CAMERA = 4; // camera visibility for objects that opt out of default casting

/** Which cascades an object casts into: every cascade, all but the far one, or the nearest only. */
export type CasterClass = 'all' | 'mid' | 'near';

const BIT = (layer: number) => 1 << layer;
const CAST_BITS: Record<CasterClass, number> = {
  all: BIT(LAYER_CASCADE_NEAR) | BIT(LAYER_CASCADE_MID) | BIT(LAYER_CASCADE_FAR),
  mid: BIT(LAYER_CASCADE_NEAR) | BIT(LAYER_CASCADE_MID),
  near: BIT(LAYER_CASCADE_NEAR),
};

/** Layer mask for an object of caster class `cls` that is (or is not) drawn by the camera this frame. */
export function layerMask(cls: CasterClass, cameraVisible: boolean): number {
  if (!cameraVisible) return CAST_BITS[cls];
  return cls === 'all' ? BIT(LAYER_DEFAULT) : BIT(LAYER_CAMERA) | CAST_BITS[cls];
}

export function setCasterClass(obj: THREE.Object3D, cls: CasterClass, cameraVisible = true): void {
  obj.layers.mask = layerMask(cls, cameraVisible);
}

/** Main camera: default objects plus the opt-out casters. */
export function configureMainCamera(camera: THREE.Camera): void {
  camera.layers.set(LAYER_DEFAULT);
  camera.layers.enable(LAYER_CAMERA);
}

/** Layer mask used while rendering cascade `index` of `count`: default objects plus that band. */
export function cascadeMask(index: number, count: number): number {
  const band = index === 0 ? LAYER_CASCADE_NEAR : index === count - 1 ? LAYER_CASCADE_FAR : LAYER_CASCADE_MID;
  return BIT(LAYER_DEFAULT) | BIT(band);
}

/**
 * Wrap the renderer's shadow pass so each cascade light is rendered on its own with the camera's layer
 * mask set to that cascade's band. `lights` is the renderer's list of shadow-casting lights in scene
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
    let count = 0;
    for (const l of lights) if (isCascade(l) >= 0) count++;
    for (const l of lights) {
      const i = isCascade(l);
      camera.layers.mask = i >= 0 ? cascadeMask(i, count) : saved;
      single[0] = l;
      sm.needsUpdate = needsUpdate;
      _activeCascade = i;
      original(single, scene, camera);
    }
    _activeCascade = -1;
    single.length = 0;
    sm.needsUpdate = false;
    camera.layers.mask = saved;
  };
}

let _activeCascade = -1;

/** Index of the cascade whose shadow map is being rendered (inside `onBeforeShadow`), -1 otherwise. */
export function activeCascade(): number {
  return _activeCascade;
}

const _sphere = new THREE.Sphere();
const _proj = new THREE.Matrix4();
const _mvp = new THREE.Matrix4();

/**
 * Per-frame culling volumes. `viewFrustum` is the camera frustum; `shadowFrustum` is the same frustum
 * cut at the CSM range, i.e. the volume that contains every shadow receiver. A caster can only matter
 * when its own volume, or the ground it shades (its footprint swept along the sun's shadow direction
 * by height / tan(elevation)), touches that volume.
 */
export class ViewCull {
  readonly viewFrustum = new THREE.Frustum();
  readonly shadowFrustum = new THREE.Frustum();
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
    _proj.makePerspective(-width / 2, width / 2, top, top - height, near, Math.max(near + 1, shadowFar), camera.coordinateSystem);
    _mvp.multiplyMatrices(_proj, camera.matrixWorldInverse);
    this.shadowFrustum.setFromProjectionMatrix(_mvp);
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
    const len = Math.max(0, height) * this.spread;
    this.tmp.copy(center).addScaledVector(this.shadowDir, len * 0.5);
    _sphere.set(this.tmp, radius + len * 0.5);
    return this.shadowFrustum.intersectsSphere(_sphere);
  }
}
