import * as THREE from 'three';
import type { CSM } from 'three/examples/jsm/csm/CSM.js';
import { setCascades } from '../world/culling';
import type { Atmosphere } from '../world/atmosphere';
import { GLSL_ATMOS_UNIFORMS, GLSL_CLOUD_FIELD, GLSL_NOISE } from './shaders/common.glsl';

/**
 * Cascade placement for the CSM.
 *
 * Splits. The stock 'practical' scheme put the first break at ~17 % of the range (590 m of 3.5 km), so
 * the aircraft (always within a few tens of metres of the camera) shared a 0.4 m texel with half a
 * kilometre of scenery: contact shadows detached, the airframe did not shade itself, the cockpit got no
 * usable shadows. The first cascade now stops just beyond the aircraft (a few cm per texel); the second
 * reaches about twice the distance of the nearest visible ground, so a low camera keeps fine ground
 * shadows nearby and a high one does not spend a cascade on the empty air under it; the last one runs to
 * the range.
 *
 * Fit. Each cascade's shadow camera is fitted to its frustum slice clipped to the slab of the world that
 * can receive shadows (water .. tallest tower) instead of the slice's diagonal: from altitude most of a
 * slice is sky, and the light-space depth range now follows the slice (it was a fixed 2 km, which cut
 * the ground out of the far cascade of every high or low-sun view: no building shadows at all there).
 * The margin toward the light covers casters as tall as the towers at the current sun elevation, so long
 * sunset shadows arrive from outside the view. Ortho extents are quantised and the centre snapped to
 * texels so the maps do not shimmer as the camera moves.
 */

const _lightM = new THREE.Matrix4();
const _lightMInv = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _ndc = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _box = new THREE.Box3();
const _center = new THREE.Vector3();
const _corners = [0, 1, 2, 3].map(() => new THREE.Vector3());
const _pts = Array.from({ length: 32 }, () => new THREE.Vector3());
const EDGES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** geometric quantisation (steps of `ratio`): the splits change rarely while the camera moves */
const quant = (v: number, ratio = 1.12) => Math.pow(ratio, Math.round(Math.log(v) / Math.log(ratio)));
const quantUp = (v: number, ratio = 1.1) => Math.pow(ratio, Math.ceil(Math.log(v) / Math.log(ratio)));

export interface CascadeInfo { texel: number; near: number; far: number; }

/**
 * Debug switch `dbg=cascades`: every lit surface shows its cascade (red 0, green 1, blue 2, yellow 3;
 * grey = beyond the range) darkened by its shadow term. Patches the CSM lighting chunk, so it must run
 * after the CSM is constructed and before the materials compile.
 */
export function installCascadeDebug(): void {
  const chunk = THREE.ShaderChunk.lights_fragment_begin;
  THREE.ShaderChunk.lights_fragment_begin = chunk
    .replace('vec2 cascade;', 'vec2 cascade; float csmDbgShadow = 1.0; float csmDbgIdx = -1.0;')
    .replace('bool shouldFadeLastCascade', 'csmDbgShadow = min(csmDbgShadow, directLight.color.g / max(prevColor.g, 1e-5)); csmDbgIdx = float(UNROLLED_LOOP_INDEX);\n\t\t\t\t\tbool shouldFadeLastCascade')
    .replace('#elif defined (USE_SHADOWMAP)', `{
      vec3 tint = csmDbgIdx < -0.5 ? vec3(0.5) : csmDbgIdx < 0.5 ? vec3(1.0, 0.25, 0.25) : csmDbgIdx < 1.5 ? vec3(0.3, 1.0, 0.3) : csmDbgIdx < 2.5 ? vec3(0.3, 0.5, 1.0) : vec3(1.0, 1.0, 0.3);
      reflectedLight.directDiffuse = tint * mix(0.12, 1.0, csmDbgShadow) * 0.8;
      reflectedLight.indirectDiffuse = vec3(0.0); reflectedLight.directSpecular = vec3(0.0); reflectedLight.indirectSpecular = vec3(0.0);
    }
    #elif defined (USE_SHADOWMAP)`);
}

export class CascadeFitter {
  /** world-space slab that holds every shadow receiver except the aircraft: water .. tallest tower + spire */
  slabMin = -6;
  slabMax = 380;
  /** normal bias in texels per cascade band (fine / coarse): 1 texel keeps the low sun free of acne on flat ground */
  normalBiasTexels = 1.0;
  readonly info: CascadeInfo[] = [];
  /** cascade splits in metres (cascades - 1 entries) */
  readonly splits: number[] = [30, 400, 1400];
  private csm!: CSM;
  private lastKey = '';

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  /** `customSplitsCallback` for the CSM (mode 'custom'). */
  readonly splitsCallback = (cascades: number, _near: number, far: number, target: number[]): void => {
    for (let i = 0; i < cascades - 1; i++) target.push(clamp(this.splits[i] / far, 0.001, 0.999));
    target.push(1);
  };

  attach(csm: CSM): void {
    this.csm = csm;
    for (let i = 0; i < csm.cascades; i++) this.info.push({ texel: 1, near: 0, far: 0 });
  }

  /**
   * Choose the splits for this frame. `focus` / `focusRadius` bound the aircraft; `groundY` is the terrain
   * (or water) height under the camera. Re-fits the CSM frustums when a split or the range changes.
   */
  updateSplits(maxFar: number, focus: THREE.Vector3, focusRadius: number, groundY: number): void {
    const cam = this.camera;
    const n = this.csm.cascades;
    const d0 = quant(clamp(cam.position.distanceTo(focus) + focusRadius, 8, 200));
    // distance to the nearest ground in view: the camera height over the depression of the frame's bottom edge
    const h = Math.max(1, cam.position.y - groundY);
    cam.getWorldDirection(_fwd);
    const pitch = Math.asin(clamp(_fwd.y, -1, 1));
    const bottom = pitch - THREE.MathUtils.DEG2RAD * 0.5 * cam.fov / cam.zoom;
    const dGround = bottom < -0.03 ? h / Math.sin(-bottom) : maxFar;
    const d1 = quant(clamp(2.2 * dGround, Math.max(300, 4 * d0), 0.45 * maxFar));
    const s = this.splits;
    s.length = n - 1;
    if (n === 2) s[0] = h > 60 ? d1 : d0;
    else if (n >= 3) { s[0] = d0; s[1] = d1; for (let i = 2; i < n - 1; i++) s[i] = quant(Math.sqrt(s[i - 1] * maxFar)); }
    // the cockpit camera moves the near plane in (camera.ts): the CSM's cascade uniforms depend on it
    const key = `${maxFar}|${cam.near}|${s.join('|')}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.csm.maxFar = maxFar;
      this.csm.updateFrustums();
    }
  }

  /** Fit every cascade's shadow camera (replaces CSM.update). `focusTop`: world height of the aircraft's top. */
  fit(focusTop: number): void {
    const csm = this.csm;
    const cam = this.camera;
    const dir = csm.lightDirection;
    _lightM.lookAt(_center.set(0, 0, 0), dir, _up);
    _lightMInv.copy(_lightM).invert();
    const elevation = Math.max(0.06, -dir.y); // sin of the light's elevation
    const maxFar = csm.maxFar;
    const near = cam.near;
    // frame corner directions at unit depth
    for (let k = 0; k < 4; k++) {
      _ndc.set(k === 0 || k === 3 ? -1 : 1, k < 2 ? 1 : -1, 1).applyMatrix4(cam.projectionMatrixInverse);
      _corners[k].copy(_ndc).multiplyScalar(-1 / _ndc.z).transformDirection(cam.matrixWorld);
    }
    const mapSize = csm.shadowMapSize;
    const breaks = csm.breaks;
    for (let i = 0; i < csm.cascades; i++) {
      const light = csm.lights[i];
      const sc = light.shadow.camera;
      // depth range this cascade is sampled over, including the fade bands of the CSM shader
      const x = i === 0 ? 0 : breaks[i - 1], y = breaks[i];
      const t0 = Math.max(0, x - 0.125 * x * x), t1 = i === csm.cascades - 1 ? 1 : Math.min(1, y + 0.125 * y * y);
      const dNear = Math.max(near, t0 * (maxFar - near)), dFar = Math.max(dNear + 1, t1 * (maxFar - near));
      let count = 0;
      for (let k = 0; k < 4; k++) _pts[k].copy(cam.position).addScaledVector(_corners[k], dNear);
      for (let k = 0; k < 4; k++) _pts[4 + k].copy(cam.position).addScaledVector(_corners[k], dFar);
      // the near cascade holds the aircraft wherever it flies; the others only need the receiver slab
      if (i === 0) count = 8;
      else count = this.clipToSlab();
      if (count === 0) { count = 8; }
      // depth margin toward the light: enough for the tallest thing that can shade this slice (a tower, or
      // the aircraft over the ground cascades) standing on its lowest receiver; a slice up in the air above
      // the towers (the aircraft cascade from altitude) only needs the aircraft's own thickness
      let lowest = Infinity;
      for (let k = 0; k < count; k++) lowest = Math.min(lowest, _pts[k].y);
      lowest = Math.max(lowest, this.slabMin);
      const casterTop = Math.max(this.slabMax, i > 0 ? focusTop : -Infinity);
      const margin = clamp((casterTop - lowest) / elevation, 60, 7000);
      _box.makeEmpty();
      for (let k = 0; k < count; k++) _box.expandByPoint(_pts[k].applyMatrix4(_lightMInv));
      // quantised extents (4 % of padding for the PCF kernel at the edges), texel-snapped centre
      const w = quantUp(Math.max(2, (_box.max.x - _box.min.x) * 1.04));
      const hgt = quantUp(Math.max(2, (_box.max.y - _box.min.y) * 1.04));
      const texelX = w / mapSize, texelY = hgt / mapSize;
      _box.getCenter(_center);
      _center.x = Math.floor(_center.x / texelX) * texelX;
      _center.y = Math.floor(_center.y / texelY) * texelY;
      const depth = _box.max.z - _box.min.z;
      _center.z = _box.max.z + margin;
      sc.left = -w / 2; sc.right = w / 2; sc.top = hgt / 2; sc.bottom = -hgt / 2;
      sc.near = 1;
      sc.far = margin + depth + 4;
      sc.updateProjectionMatrix();
      _center.applyMatrix4(_lightM);
      light.position.copy(_center);
      light.target.position.copy(_center).add(dir);
      const texel = Math.max(texelX, texelY);
      const inf = this.info[i];
      inf.texel = texel; inf.near = dNear; inf.far = dFar;
      // biases in world units: the normal bias lifts the receiver off its surface by a texel, the depth bias
      // adds a fraction of a texel along the light (both fine enough that a float on the water keeps its shadow)
      light.shadow.normalBias = texel * this.normalBiasTexels;
      light.shadow.bias = -(0.25 * texel) / (sc.far - sc.near);
    }
    setCascades(this.info);
  }

  /** Clip the frustum slice in _pts[0..8) to slabMin <= y <= slabMax; returns the vertex count (in _pts). */
  private clipToSlab(): number {
    const lo = this.slabMin, hi = this.slabMax;
    let n = 8;
    const inside = (p: THREE.Vector3) => p.y >= lo && p.y <= hi;
    for (const [a, b] of EDGES) {
      const pa = _pts[a], pb = _pts[b];
      for (const plane of [lo, hi]) {
        const da = pa.y - plane, db = pb.y - plane;
        if ((da < 0) === (db < 0) || n >= _pts.length) continue;
        _pts[n++].lerpVectors(pa, pb, da / (da - pb.y + plane));
      }
    }
    // compact: keep the original vertices inside the slab plus every crossing (crossings are on the slab faces)
    let out = 0;
    for (let k = 0; k < n; k++) {
      if (k < 8 && !inside(_pts[k])) continue;
      if (out !== k) _pts[out].copy(_pts[k]);
      out++;
    }
    return out;
  }
}

/**
 * Cloud shadows on the direct light.
 *
 * A cloud's shadow is the direct beam missing under its footprint, so it belongs where the cast shadows are
 * applied: on the key light, before the surface's BRDF, in every lit material. Until round 7 the post pass
 * multiplied the finished pixel by the footprint instead, which took the same share out of everything the
 * pixel held: the sky mirrored by the water (never in a cloud's shadow), the sky light on a surface already
 * inside a cast shadow (no beam left to remove: the two shadows compounded), and the lamps and lit windows at
 * night. A cumulus shadow on water then read as a black, structureless patch (critic h03).
 *
 * The footprint is rendered once per frame into a small map over the cloud-base plane (`cloudFieldCS`, the
 * field the raymarch and the old post term share, in cloud space = world xz + wind), on a tile that follows
 * the camera's ground point projected up the key light. Every lit material samples it at its own fragment's
 * projection onto the cloud base (a texture read where the post pass evaluated the noise per pixel; the same
 * map serves the mirror pass, whose objects therefore carry the shadow already). What the map stores is the
 * share of the beam the cloud removes: a cloud base is not opaque, a stratocumulus 300-600 m thick passes
 * 30-40 % of the sunlight as diffuse and a fair-weather cumulus 20-30 % (two-stream, T = 2 / (2 + tau (1 - g)),
 * tau 25-45, g 0.85), which is why an overcast noon is a bright 10-20 klux and not a cave; the preset gives
 * the transmittance under a cell's core, the fringe passes more (`interior`, the field's second channel).
 */
const CLOUD_MAP_SIZE = 1024;

const CLOUD_MAP_FRAG = /* glsl */ `
${GLSL_ATMOS_UNIFORMS}
${GLSL_NOISE}
${GLSL_CLOUD_FIELD}
uniform vec4 uTile;      // xy origin of the tile in cloud-plane world xz, z its size (m)
uniform vec2 uTransmit;  // x transmittance under a cell's core, y under its fringe
varying vec2 vUv;
void main() {
  vec3 f = cloudFieldCS(uTile.xy + vUv * uTile.z + uCloudWind);
  // the raymarched cloud's footprint is cov^2 (sky.ts envelope), as cloudShadow() uses
  float foot = f.x * f.x;
  float T = mix(uTransmit.y, uTransmit.x, f.y);
  gl_FragColor = vec4(foot * (1.0 - T), 0.0, 0.0, 1.0);
}
`;

/** Sampler + uniforms for the lit materials (guarded: only materials registered with the game define it). */
const CLOUD_SHADOW_PARS = /* glsl */ `
#ifdef USE_CLOUD_SHADOW
uniform sampler2D uCloudShadowMap;
uniform vec4 uCloudShadowTile;  // xy tile origin (cloud-plane world xz), z 1 / tile size, w strength
uniform vec4 uCloudShadowKey;   // xyz key light direction (toward the light), w cloud base height (m)
float cloudShadowAt(vec3 wp) {
  float k = max(uCloudShadowKey.w - wp.y, 0.0) / max(uCloudShadowKey.y, 0.15);
  vec2 uv = (wp.xz + uCloudShadowKey.xz * k - uCloudShadowTile.xy) * uCloudShadowTile.z;
  // unshaded past the tile (a soft edge over its outer 4 %): the clouds there are beyond the resolved range
  vec2 e = smoothstep(vec2(0.0), vec2(0.04), uv) * smoothstep(vec2(0.0), vec2(0.04), 1.0 - uv);
  float removed = texture2D(uCloudShadowMap, clamp(uv, 0.0, 1.0)).r * e.x * e.y;
  return 1.0 - removed * uCloudShadowTile.w;
}
#endif
`;

/**
 * Patch the lighting chunk so the key light is attenuated by the cloud footprint before the BRDF and the CSM
 * shadow (the same place the cast shadow multiplies in). Must run after the CSM is constructed (it installs
 * its own copy of the chunk) and before the materials compile. The fragment's world position is rebuilt from
 * the view position with the camera of the pass being rendered, so the mirror pass shades its objects with the
 * mirror camera and no per-camera uniform is needed.
 */
export function installCloudShadowChunk(): void {
  const dl = 'getDirectionalLightInfo( directionalLight, directLight );';
  THREE.ShaderChunk.lights_pars_begin = CLOUD_SHADOW_PARS + THREE.ShaderChunk.lights_pars_begin;
  THREE.ShaderChunk.lights_fragment_begin = `
#ifdef USE_CLOUD_SHADOW
	float cloudLit = cloudShadowAt( cameraPosition + transpose( mat3( viewMatrix ) ) * ( - vViewPosition ) );
#else
	float cloudLit = 1.0;
#endif
` + THREE.ShaderChunk.lights_fragment_begin.split(dl).join(`${dl}\n\t\t\tdirectLight.color *= cloudLit;`);
}

export class CloudShadowMap {
  /** Multiplies the darkening (0 disables: `dbg=nocloudshadow`). */
  strength = 1.0;
  /** Shared by every lit material (registerLit) */
  readonly uniforms = {
    uCloudShadowMap: { value: null as THREE.Texture | null },
    uCloudShadowTile: { value: new THREE.Vector4(0, 0, 1, 0) },
    uCloudShadowKey: { value: new THREE.Vector4(0, 1, 0, 1500) },
  };
  private readonly rt: THREE.WebGLRenderTarget;
  private readonly mat: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly scene = new THREE.Scene();
  private readonly cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor(atmos: Atmosphere) {
    this.rt = new THREE.WebGLRenderTarget(CLOUD_MAP_SIZE, CLOUD_MAP_SIZE, { format: THREE.RedFormat, type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
    this.rt.texture.wrapS = this.rt.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.uniforms.uCloudShadowMap.value = this.rt.texture;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: CLOUD_MAP_FRAG,
      uniforms: { ...atmos.uniforms, uTile: { value: new THREE.Vector4() }, uTransmit: { value: new THREE.Vector2(0.2, 0.55) } },
      depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /**
   * Render this frame's footprint tile. The tile is centred on the camera's ground point carried up the key
   * light to the cloud base (where that ground's shadows come from), sized with the altitude (6 km half-width
   * at the surface, 16 km from 1.25 km up: 12-31 m texels against 1-4 km cells), quantised and texel-snapped so
   * it does not swim as the camera moves. `groundY`: terrain / water height under the camera.
   */
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera, atmos: Atmosphere, groundY: number): void {
    const s = atmos.state, p = atmos.preset;
    const key = s.sunDir;
    const ky = Math.max(key.y, 0.15);
    const k = Math.max(p.cloudBase - groundY, 0) / ky;
    const cx = camera.position.x + key.x * k, cz = camera.position.z + key.z * k;
    const half = quant(clamp(6000 + 8 * (camera.position.y - groundY), 6000, 16000), 1.15);
    const texel = (2 * half) / CLOUD_MAP_SIZE;
    const ox = Math.floor((cx - half) / texel) * texel, oz = Math.floor((cz - half) / texel) * texel;
    (this.mat.uniforms.uTile.value as THREE.Vector4).set(ox, oz, 2 * half, 0);
    (this.mat.uniforms.uTransmit.value as THREE.Vector2).set(p.cloudTransmit, Math.min(1, p.cloudTransmit + 0.35));
    // the footprint fades out below ~14 deg of key elevation as cloudShadow() did (the projection to the base
    // runs kilometres at grazing angles); the night key (moon) sits above that
    const fade = THREE.MathUtils.smoothstep(key.y, 0.0, 0.25);
    this.uniforms.uCloudShadowTile.value.set(ox, oz, 1 / (2 * half), this.strength * fade);
    this.uniforms.uCloudShadowKey.value.set(key.x, key.y, key.z, p.cloudBase);
    if (this.strength * fade <= 0) return;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.rt);
    renderer.render(this.scene, this.cam);
    renderer.setRenderTarget(prev);
  }
}
