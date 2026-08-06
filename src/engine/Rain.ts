/**
 * Rain: falling streaks and ground splashes.
 *
 * Drop positions are computed analytically in the vertex shader from a per-drop
 * seed and the elapsed time, wrapped inside a box that follows the camera, so
 * the CPU cost is zero regardless of drop count.
 */
import * as THREE from 'three';
import { radialAlphaTexture, rainDropTexture } from './Textures';

const DROP_VERT = /* glsl */ `
attribute vec3 seed;
uniform float uTime;
uniform vec3 uBoxSize;
uniform vec3 uCenter;
uniform float uSpeed;
uniform float uSize;
uniform float uWind;
varying float vFade;
varying float vSeed;

void main() {
  vSeed = seed.z;
  float rate = uSpeed * (0.75 + seed.z * 0.5);
  float fall = mod(seed.y * uBoxSize.y - uTime * rate, uBoxSize.y);
  vec3 p;
  p.x = (seed.x - 0.5) * uBoxSize.x + uWind * fall * 0.12;
  p.z = (fract(seed.x * 91.7 + seed.z * 13.3) - 0.5) * uBoxSize.z;
  p.y = fall;
  // Wrap horizontally so wind never empties the box
  p.x = mod(p.x + uBoxSize.x * 0.5, uBoxSize.x) - uBoxSize.x * 0.5;
  p += uCenter;
  p.y -= uBoxSize.y * 0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  vFade = smoothstep(0.35, 1.6, dist) * smoothstep(60.0, 24.0, dist);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (1.0 + seed.z * 0.8) * (300.0 / max(dist, 0.3));
}
`;

const DROP_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uOpacity;
varying float vFade;
varying float vSeed;

void main() {
  // Stretch the sprite vertically into a streak
  vec2 suv = vec2((gl_PointCoord.x - 0.5) * 5.0 + 0.5, gl_PointCoord.y);
  if (suv.x < 0.0 || suv.x > 1.0) discard;
  float a = texture2D(uMap, suv).a * vFade * uOpacity * (0.55 + vSeed * 0.6);
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

const SPLASH_VERT = /* glsl */ `
attribute vec3 seed;
uniform float uTime;
uniform vec2 uArea;
uniform vec3 uCenter;
uniform float uRate;
uniform float uSize;
varying float vLife;

void main() {
  float life = fract(uTime * uRate * (0.6 + seed.z * 0.8) + seed.z * 7.13);
  vLife = life;
  vec3 p = vec3((seed.x - 0.5) * uArea.x + uCenter.x, uCenter.y, (seed.y - 0.5) * uArea.y + uCenter.z);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.25 + life * 1.5) * (260.0 / max(-mv.z, 0.4));
}
`;

const SPLASH_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uOpacity;
varying float vLife;

void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  // Hollow ring that fades as it grows
  float ring = smoothstep(0.6, 0.88, r) * smoothstep(1.02, 0.92, r);
  float a = max(texture2D(uMap, gl_PointCoord).a * 0.15, ring * 0.55) * pow(1.0 - vLife, 1.6) * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

export interface RainOptions {
  dropCount?: number;
  splashCount?: number;
  boxSize?: THREE.Vector3;
  /** Ground plane height for splashes; null disables them. */
  groundY?: number | null;
  color?: THREE.ColorRepresentation;
  speed?: number;
  wind?: number;
}

export class RainSystem {
  readonly group = new THREE.Group();
  private drops: THREE.Points;
  private splashes: THREE.Points | null = null;
  private dropUniforms: Record<string, THREE.IUniform>;
  private splashUniforms: Record<string, THREE.IUniform> | null = null;
  private intensity = 1;
  private box: THREE.Vector3;

  constructor(opts: RainOptions = {}) {
    const count = opts.dropCount ?? 4000;
    this.box = opts.boxSize ?? new THREE.Vector3(34, 24, 34);

    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) seeds[i] = Math.random();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

    this.dropUniforms = {
      uTime: { value: 0 },
      uBoxSize: { value: this.box.clone() },
      uCenter: { value: new THREE.Vector3() },
      uSpeed: { value: opts.speed ?? 16 },
      uSize: { value: 0.85 },
      uWind: { value: opts.wind ?? 0.6 },
      uMap: { value: rainDropTexture(64) },
      uColor: { value: new THREE.Color(opts.color ?? 0xbfd6ff) },
      uOpacity: { value: 0.5 },
    };
    this.drops = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms: this.dropUniforms,
        vertexShader: DROP_VERT,
        fragmentShader: DROP_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.drops.frustumCulled = false;
    this.group.add(this.drops);

    if (opts.groundY !== null && opts.groundY !== undefined) {
      const sc = opts.splashCount ?? 700;
      const sseeds = new Float32Array(sc * 3);
      for (let i = 0; i < sc * 3; i++) sseeds[i] = Math.random();
      const sgeo = new THREE.BufferGeometry();
      sgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sc * 3), 3));
      sgeo.setAttribute('seed', new THREE.BufferAttribute(sseeds, 3));
      sgeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
      this.splashUniforms = {
        uTime: { value: 0 },
        uArea: { value: new THREE.Vector2(26, 26) },
        uCenter: { value: new THREE.Vector3(0, opts.groundY + 0.012, 0) },
        uRate: { value: 1.5 },
        uSize: { value: 0.95 },
        uMap: { value: radialAlphaTexture(2, 64) },
        uColor: { value: new THREE.Color(0xcfe2ff) },
        uOpacity: { value: 0.35 },
      };
      this.splashes = new THREE.Points(
        sgeo,
        new THREE.ShaderMaterial({
          uniforms: this.splashUniforms,
          vertexShader: SPLASH_VERT,
          fragmentShader: SPLASH_FRAG,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      this.splashes.frustumCulled = false;
      this.group.add(this.splashes);
    }
  }

  /** 0 = dry, 1 = downpour. */
  setIntensity(v: number) {
    this.intensity = THREE.MathUtils.clamp(v, 0, 1);
    this.dropUniforms.uOpacity.value = 0.55 * this.intensity;
    this.dropUniforms.uSize.value = 0.7 + this.intensity * 0.5;
    if (this.splashUniforms) {
      this.splashUniforms.uOpacity.value = 0.22 * this.intensity;
      this.splashUniforms.uRate.value = 0.9 + this.intensity * 1.4;
    }
    this.group.visible = this.intensity > 0.01;
  }

  setGroundY(y: number) {
    if (this.splashUniforms) (this.splashUniforms.uCenter.value as THREE.Vector3).y = y + 0.012;
  }

  update(dt: number, camera: THREE.Camera) {
    this.dropUniforms.uTime.value = (this.dropUniforms.uTime.value as number) + dt;
    const center = this.dropUniforms.uCenter.value as THREE.Vector3;
    camera.getWorldPosition(center);
    // Bias the box forward so drops appear where the camera is looking
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    center.addScaledVector(fwd, this.box.z * 0.25);
    center.y += this.box.y * 0.28;
    if (this.splashUniforms) {
      this.splashUniforms.uTime.value = (this.splashUniforms.uTime.value as number) + dt;
      const sc = this.splashUniforms.uCenter.value as THREE.Vector3;
      const camPos = camera.getWorldPosition(new THREE.Vector3());
      sc.x = camPos.x + fwd.x * 6;
      sc.z = camPos.z + fwd.z * 6;
    }
  }

  dispose() {
    this.drops.geometry.dispose();
    (this.drops.material as THREE.Material).dispose();
    this.splashes?.geometry.dispose();
    if (this.splashes) (this.splashes.material as THREE.Material).dispose();
    this.group.removeFromParent();
  }
}
