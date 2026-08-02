import * as THREE from 'three';
import { Rng } from '../core/Rng';
import type { MaterialLibrary } from '../assets/materials';

/**
 * GPU particle field driven purely by the master clock.
 *
 * Every particle's entire life is described by attributes uploaded once
 * (spawn time, start position, velocity, colour, size, lifetime). The vertex
 * shader evaluates its state from `uTime`, so the whole system is a pure
 * function of the timeline: scrubbing backwards, jumping between chapters and
 * re-rendering the same timestamp all produce identical frames, and nothing can
 * "double fire" after a seek.
 */

export interface Emission {
  /** Timeline time the burst starts. */
  t0: number;
  position: THREE.Vector3;
  count: number;
  /** Base speed; each particle gets a seeded variation. */
  speed: number;
  /** Cone half-angle in radians; Math.PI for a full sphere. */
  spread?: number;
  /** Preferred emission direction (normalised internally). */
  direction?: THREE.Vector3;
  color: THREE.Color | number;
  /** Optional second colour, randomly mixed per particle. */
  colorB?: THREE.Color | number;
  size: number;
  sizeJitter?: number;
  life: number;
  lifeJitter?: number;
  /** Staggered spawn across this many seconds. */
  stagger?: number;
  /** Extra outward radius at spawn. */
  radius?: number;
}

export interface ParticleFieldOptions {
  name: string;
  capacity: number;
  texture: THREE.Texture;
  /** Velocity damping coefficient (per second). Higher = stops faster. */
  drag?: number;
  gravity?: THREE.Vector3;
  /** Multiplier applied to size over the particle's life (1 = constant). */
  growth?: number;
  /** Alpha curve exponent: >1 fades late, <1 fades early. */
  fade?: number;
  blending?: THREE.Blending;
  additive?: boolean;
  depthWrite?: boolean;
  /** Fraction of life spent fading in. */
  attack?: number;
  softness?: number;
}

const vertexShader = /* glsl */ `
  attribute float aT0;
  attribute float aLife;
  attribute float aSize;
  attribute vec3 aVel;
  attribute vec3 aColor;
  attribute float aSpin;

  uniform float uTime;
  uniform float uDrag;
  uniform vec3 uGravity;
  uniform float uGrowth;
  uniform float uFade;
  uniform float uAttack;
  uniform float uScale;
  uniform float uOpacity;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vSpin;

  void main() {
    float age = uTime - aT0;
    float f = age / aLife;
    if (age < 0.0 || f > 1.0) {
      gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      vColor = vec3(0.0);
      vSpin = 0.0;
      return;
    }

    float k = max(uDrag, 0.0001);
    vec3 displaced = position + aVel * ((1.0 - exp(-k * age)) / k) + uGravity * age * age * 0.5;

    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mv;

    float grow = mix(1.0, uGrowth, f);
    gl_PointSize = max(1.0, aSize * grow * uScale / max(0.001, -mv.z));

    float attack = smoothstep(0.0, max(uAttack, 0.0001), f);
    float decay = pow(1.0 - f, uFade);
    vAlpha = attack * decay * uOpacity;
    vColor = aColor;
    vSpin = aSpin;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uSoftness;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSpin;

  void main() {
    if (vAlpha <= 0.001) discard;
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vSpin);
    float s = sin(vSpin);
    uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y) + 0.5;
    vec4 tex = texture2D(uMap, uv);
    float a = tex.a * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor * tex.rgb * uSoftness, a);
  }
`;

export class ParticleField {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry;
  private capacity: number;
  private cursor = 0;
  private rng: Rng;

  private posArr: Float32Array;
  private velArr: Float32Array;
  private colArr: Float32Array;
  private t0Arr: Float32Array;
  private lifeArr: Float32Array;
  private sizeArr: Float32Array;
  private spinArr: Float32Array;

  /** Latest spawn time seen, used by QA to verify effects exist for a chapter. */
  lastEmission = -1;

  constructor(lib: MaterialLibrary, opts: ParticleFieldOptions) {
    this.capacity = opts.capacity;
    this.rng = new Rng(`particles:${opts.name}`);

    this.posArr = new Float32Array(this.capacity * 3);
    this.velArr = new Float32Array(this.capacity * 3);
    this.colArr = new Float32Array(this.capacity * 3);
    this.t0Arr = new Float32Array(this.capacity).fill(-1e9);
    this.lifeArr = new Float32Array(this.capacity).fill(1);
    this.sizeArr = new Float32Array(this.capacity);
    this.spinArr = new Float32Array(this.capacity);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    this.geometry.setAttribute('aVel', new THREE.BufferAttribute(this.velArr, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colArr, 3));
    this.geometry.setAttribute('aT0', new THREE.BufferAttribute(this.t0Arr, 1));
    this.geometry.setAttribute('aLife', new THREE.BufferAttribute(this.lifeArr, 1));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizeArr, 1));
    this.geometry.setAttribute('aSpin', new THREE.BufferAttribute(this.spinArr, 1));
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
    lib.registry.track(this.geometry);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMap: { value: opts.texture },
        uDrag: { value: opts.drag ?? 1.2 },
        uGravity: { value: opts.gravity?.clone() ?? new THREE.Vector3() },
        uGrowth: { value: opts.growth ?? 1 },
        uFade: { value: opts.fade ?? 1.6 },
        uAttack: { value: opts.attack ?? 0.06 },
        uScale: { value: 600 },
        uSoftness: { value: opts.softness ?? 1 },
        uOpacity: { value: 1 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: opts.depthWrite ?? false,
      depthTest: true,
      blending: opts.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    lib.registry.track(this.material);

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = `particles:${opts.name}`;
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
  }

  /** Append a burst. Called during scene construction, never during playback. */
  emit(e: Emission): void {
    const dir = (e.direction ?? new THREE.Vector3(0, 1, 0)).clone().normalize();
    const spread = e.spread ?? Math.PI;
    const colorA = new THREE.Color(e.color);
    const colorB = e.colorB !== undefined ? new THREE.Color(e.colorB) : colorA;
    const basis = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, Math.abs(dir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0));
    const v = new THREE.Vector3();
    const c = new THREE.Color();

    for (let i = 0; i < e.count; i++) {
      const idx = this.cursor % this.capacity;
      this.cursor++;

      const cosA = Math.cos(spread);
      const u = this.rng.range(cosA, 1);
      const phi = this.rng.range(0, Math.PI * 2);
      const sinT = Math.sqrt(Math.max(0, 1 - u * u));
      v.set(sinT * Math.cos(phi), sinT * Math.sin(phi), u).applyMatrix4(basis);
      const speed = e.speed * this.rng.range(0.35, 1.25);

      const r = e.radius ?? 0;
      this.posArr[idx * 3] = e.position.x + v.x * r;
      this.posArr[idx * 3 + 1] = e.position.y + v.y * r;
      this.posArr[idx * 3 + 2] = e.position.z + v.z * r;
      this.velArr[idx * 3] = v.x * speed;
      this.velArr[idx * 3 + 1] = v.y * speed;
      this.velArr[idx * 3 + 2] = v.z * speed;

      c.copy(colorA).lerp(colorB, this.rng.next());
      this.colArr[idx * 3] = c.r;
      this.colArr[idx * 3 + 1] = c.g;
      this.colArr[idx * 3 + 2] = c.b;

      this.t0Arr[idx] = e.t0 + (e.stagger ? this.rng.range(0, e.stagger) : 0);
      this.lifeArr[idx] = e.life * (1 + this.rng.signed(e.lifeJitter ?? 0.3));
      this.sizeArr[idx] = e.size * (1 + this.rng.signed(e.sizeJitter ?? 0.4));
      this.spinArr[idx] = this.rng.range(0, Math.PI * 2);
    }
    this.lastEmission = Math.max(this.lastEmission, e.t0);
    this.markDirty();
  }

  private dirty = false;
  private markDirty(): void {
    this.dirty = true;
  }

  /** Upload after all emissions have been registered. */
  commit(): void {
    if (!this.dirty) return;
    for (const key of ['position', 'aVel', 'aColor', 'aT0', 'aLife', 'aSize', 'aSpin']) {
      (this.geometry.getAttribute(key) as THREE.BufferAttribute).needsUpdate = true;
    }
    this.dirty = false;
  }

  /** Screen-space point scaling factor; recomputed on resize. */
  setViewportScale(heightPx: number, fovDeg: number): void {
    this.material.uniforms.uScale.value = heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }

  setOpacity(v: number): void {
    this.material.uniforms.uOpacity.value = v;
  }

  update(t: number): void {
    this.commit();
    this.material.uniforms.uTime.value = t;
  }

  get used(): number {
    return Math.min(this.cursor, this.capacity);
  }

  get overflowed(): boolean {
    return this.cursor > this.capacity;
  }
}
