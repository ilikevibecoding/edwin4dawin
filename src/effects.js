// effects.js — pooled GPU particles, ribbon trails, velocity-stretched spark
// streaks, flashes, debris (with smoke trails + glints), shockwave rings,
// luminous blast shells, noise-displaced fireball cores, pooled explosion
// lights, scorch decals, and composite effects (launch blasts, air intercepts,
// ground impacts). Zero gameplay allocations: every system is pooled at
// creation and all randomness flows through ctx.vrng.
import * as THREE from 'three';
import { Pool, Rand, clamp, easeOutCubic, TAU } from './util.js';
import { terrainHeight } from './base.js';

// ============================================================ GPU point particles
const PARTICLE_VERT = /* glsl */ `
attribute vec3 aVel;
attribute vec3 aAcc;
attribute float aBirth;
attribute float aLife;
attribute float aSize0;
attribute float aSize1;
attribute float aAlpha;
attribute float aRot;
attribute float aRotVel;
attribute float aWob;
attribute float aCell;
attribute vec3 aCol0;
attribute vec3 aCol1;
uniform float uTime;
uniform float uScale;
uniform float uHot;
uniform float uFadeLate;
varying float vAlpha;
varying vec3 vCol;
varying float vRot;
varying float vT;
varying float vCell;
void main() {
  float age = uTime - aBirth;
  float t = age / max(aLife, 0.0001);
  if (t < 0.0 || t > 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    vCol = vec3(0.0);
    vRot = 0.0;
    vT = 0.0;
    vCell = 0.0;
    return;
  }
  vec3 pos = position + aVel * age + 0.5 * aAcc * age * age;
  // pseudo-turbulence: per-particle phase wobble that grows in as the puff
  // ages, so smoke boils instead of flying dead-straight ballistic paths
  float ph = aRot * 13.73;
  float wA = aWob * smoothstep(0.04, 0.5, t);
  pos += vec3(
    sin(age * 1.31 + ph),
    sin(age * 1.03 + ph * 1.71 + 2.1),
    cos(age * 1.19 + ph * 0.87 + 4.2)
  ) * wA;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float size = mix(aSize0, aSize1, pow(t, 0.62));
  gl_PointSize = clamp(size * uScale / max(-mv.z, 0.5), 0.75, 320.0);
  float fadeIn = smoothstep(0.0, 0.06, t);
  float fadeOut = 1.0 - smoothstep(uFadeLate, 1.0, t);
  // fade puffs that drift right up to the camera so they never become
  // screen-filling blobs (drifting launch smoke passing over the player)
  float nearFade = smoothstep(2.5, 18.0, -mv.z);
  vAlpha = aAlpha * fadeIn * fadeOut * nearFade;
  vCol = mix(aCol0, aCol1, pow(t, 0.55));
  // incandescence kick: fire systems flash white-hot at birth and cool fast
  vCol *= 1.0 + uHot * 2.1 * pow(1.0 - t, 2.4);
  vRot = aRot + age * aRotVel;
  vT = t;
  vCell = aCell;
  gl_Position = projectionMatrix * mv;
}
`;
const PARTICLE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform vec3 uTint;
uniform float uAtlas;
uniform float uErode;
varying float vAlpha;
varying vec3 vCol;
varying float vRot;
varying float vT;
varying float vCell;
void main() {
  float cs = cos(vRot), sn = sin(vRot);
  vec2 pc = gl_PointCoord - 0.5;
  vec2 uv = vec2(pc.x * cs - pc.y * sn, pc.x * sn + pc.y * cs) + 0.5;
  // 2x2 variant atlas: clamp inside the cell so rotated corners can't bleed
  // into the neighbour (cell borders are transparent anyway)
  vec2 uvc = clamp(uv, 0.004, 0.996);
  vec2 cellOff = vec2(mod(vCell, 2.0), floor(vCell * 0.5)) * 0.5;
  vec4 tex = texture2D(uMap, mix(uvc, uvc * 0.5 + cellOff, uAtlas));
  // ragged dissolve: threshold climbs over life so thin texture regions burn
  // off first and the puff erodes into shreds instead of ghost-fading whole.
  // At t=0 the threshold sits below 0 => birth look is unchanged.
  float er = mix(-0.5, uErode, vT);
  float a = tex.a * smoothstep(er, er + 0.5, tex.a) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vCol * tex.rgb * uTint, a);
}
`;

class ParticleSystem {
  constructor(scene, map, capacity, additive, { hot = 0, fadeLate = 0.55, atlas = 0, erode = 0 } = {}) {
    this.capacity = capacity;
    this.cursor = 0;
    const geo = new THREE.BufferGeometry();
    const mk = (n) => {
      const a = new THREE.BufferAttribute(new Float32Array(capacity * n), n);
      a.setUsage(THREE.DynamicDrawUsage);
      return a;
    };
    this.attrs = {
      position: mk(3), aVel: mk(3), aAcc: mk(3),
      aBirth: mk(1), aLife: mk(1), aSize0: mk(1), aSize1: mk(1),
      aAlpha: mk(1), aRot: mk(1), aRotVel: mk(1), aWob: mk(1), aCell: mk(1), aCol0: mk(3), aCol1: mk(3),
    };
    // park all particles as dead
    this.attrs.aBirth.array.fill(-1e9);
    for (const [name, attr] of Object.entries(this.attrs)) geo.setAttribute(name, attr);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
    this.uniforms = {
      uTime: { value: 0 },
      uScale: { value: 720 },
      uMap: { value: map },
      uTint: { value: new THREE.Color(1, 1, 1) },
      uHot: { value: hot },
      uFadeLate: { value: fadeLate },
      uAtlas: { value: atlas },
      uErode: { value: erode },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 20 : 19;
    scene.add(this.points);
    this._c0 = new THREE.Color();
    this._c1 = new THREE.Color();
    this.rand = new Rand(0xfeed);
  }
  /** spawn one particle; p = {pos, vel, acc, life, size0, size1, alpha, col0, col1, rot, rotVel, wob, delay} */
  spawn(now, p) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    const A = this.attrs;
    A.position.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
    A.aVel.setXYZ(i, p.vel?.x ?? 0, p.vel?.y ?? 0, p.vel?.z ?? 0);
    A.aAcc.setXYZ(i, p.acc?.x ?? 0, p.acc?.y ?? 0, p.acc?.z ?? 0);
    A.aBirth.setX(i, now + (p.delay ?? 0));
    A.aLife.setX(i, p.life ?? 1);
    A.aSize0.setX(i, p.size0 ?? 1);
    A.aSize1.setX(i, p.size1 ?? 2);
    A.aAlpha.setX(i, p.alpha ?? 1);
    A.aRot.setX(i, p.rot ?? this.rand.next() * 6.283);
    A.aRotVel.setX(i, p.rotVel ?? (this.rand.next() - 0.5) * 1.4);
    A.aWob.setX(i, p.wob ?? 0);
    // atlas variant pick uses the system-local rand, not ctx.vrng: cell choice
    // must never perturb the shared visual RNG stream
    A.aCell.setX(i, p.cell ?? ((this.rand.next() * 4) | 0));
    this._c0.set(p.col0 ?? 0xffffff);
    this._c1.set(p.col1 ?? p.col0 ?? 0xffffff);
    if (p.colJit) {
      // per-particle brightness jitter (system-local rand): neighboring puffs in a
      // big cloud get distinct tones instead of one flat beige mass
      const j = 1 + (this.rand.next() - 0.5) * 2 * p.colJit;
      this._c0.multiplyScalar(j);
      this._c1.multiplyScalar(j);
    }
    A.aCol0.setXYZ(i, this._c0.r, this._c0.g, this._c0.b);
    A.aCol1.setXYZ(i, this._c1.r, this._c1.g, this._c1.b);
    this.dirty = true;
  }
  commit() {
    if (!this.dirty) return;
    this.dirty = false;
    for (const attr of Object.values(this.attrs)) attr.needsUpdate = true;
  }
  setTime(t) { this.uniforms.uTime.value = t; }
  setViewport(h, fovDeg) {
    this.uniforms.uScale.value = h / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }
  parkAll() {
    this.attrs.aBirth.array.fill(-1e9);
    this.attrs.aBirth.needsUpdate = true;
  }
}

// ============================================================ spark streaks
// Camera-facing quads stretched along per-particle velocity: elongated sparks
// that arc under gravity and shorten as they slow. Additive, procedural falloff.
const STREAK_VERT = /* glsl */ `
attribute vec3 aVel;
attribute vec3 aAcc;
attribute float aBirth;
attribute float aLife;
attribute float aWidth;
attribute float aLen;
attribute float aAlpha;
attribute vec3 aCol0;
attribute vec3 aCol1;
attribute vec2 aCorner;
uniform float uTime;
uniform float uScale;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vCol;
void main() {
  float age = uTime - aBirth;
  float t = age / max(aLife, 0.0001);
  if (t < 0.0 || t > 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vUv = vec2(0.0); vAlpha = 0.0; vCol = vec3(0.0);
    return;
  }
  vec3 p = position + aVel * age + 0.5 * aAcc * age * age;
  vec3 v = aVel + aAcc * age;
  float sp = length(v);
  vec3 dir = sp > 0.001 ? v / sp : vec3(0.0, 1.0, 0.0);
  // motion-blur stretch: longer when fast, shrinking as the spark dies
  float len = aLen * clamp(sp * 0.022, 0.18, 1.0) * (1.0 - 0.45 * t);
  vec3 toCam = cameraPosition - p;
  vec3 side = cross(dir, toCam);
  float sl = length(side);
  side = sl > 0.001 ? side / sl : vec3(0.0, 1.0, 0.0);
  float w = aWidth * (1.0 - 0.4 * t);
  // keep sparks visible at km distances: clamp to a minimum on-screen width
  float depth = length(toCam);
  w = max(w, 1.6 * depth / uScale);
  len = max(len, 4.2 * depth / uScale);
  vec3 wp = p + dir * (aCorner.x * len * 0.5) + side * (aCorner.y * w * 0.5);
  float fadeIn = smoothstep(0.0, 0.04, t);
  float fadeOut = 1.0 - smoothstep(0.5, 1.0, t);
  vAlpha = aAlpha * fadeIn * fadeOut;
  vCol = mix(aCol0, aCol1, pow(t, 0.6));
  vUv = aCorner * 0.5 + 0.5;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;
const STREAK_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vCol;
void main() {
  float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
  float along = sin(clamp(vUv.x, 0.0, 1.0) * 3.14159);
  float head = smoothstep(0.55, 0.95, vUv.x);
  float a = pow(across, 1.9) * (0.3 + 0.7 * along) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vCol * (1.0 + head * 0.8), a);
}
`;

class StreakSystem {
  constructor(scene, capacity) {
    this.capacity = capacity;
    this.cursor = 0;
    const geo = new THREE.BufferGeometry();
    const mk = (n) => {
      const a = new THREE.BufferAttribute(new Float32Array(capacity * 4 * n), n);
      a.setUsage(THREE.DynamicDrawUsage);
      return a;
    };
    this.attrs = {
      position: mk(3), aVel: mk(3), aAcc: mk(3),
      aBirth: mk(1), aLife: mk(1), aWidth: mk(1), aLen: mk(1), aAlpha: mk(1),
      aCol0: mk(3), aCol1: mk(3),
    };
    this.attrs.aBirth.array.fill(-1e9);
    for (const [name, attr] of Object.entries(this.attrs)) geo.setAttribute(name, attr);
    // static corner layout: (tail,-) (tail,+) (head,-) (head,+)
    const corner = new THREE.BufferAttribute(new Float32Array(capacity * 4 * 2), 2);
    for (let i = 0; i < capacity; i++) {
      corner.array.set([-1, -1, -1, 1, 1, -1, 1, 1], i * 8);
    }
    geo.setAttribute('aCorner', corner);
    const idx = new Uint16Array(capacity * 6);
    for (let i = 0; i < capacity; i++) {
      const v = i * 4;
      idx.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], i * 6);
    }
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
    this.uniforms = { uTime: { value: 0 }, uScale: { value: 720 } };
    const mat = new THREE.ShaderMaterial({
      vertexShader: STREAK_VERT,
      fragmentShader: STREAK_FRAG,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 21;
    scene.add(this.mesh);
    this._c0 = new THREE.Color();
    this._c1 = new THREE.Color();
  }
  /** spawn one streak; p = {pos, vel, acc, life, width, len, alpha, col0, col1, delay} */
  spawn(now, p) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    const A = this.attrs;
    this._c0.set(p.col0 ?? 0xffffff);
    this._c1.set(p.col1 ?? p.col0 ?? 0xffffff);
    const v = i * 4;
    for (let k = 0; k < 4; k++) {
      A.position.setXYZ(v + k, p.pos.x, p.pos.y, p.pos.z);
      A.aVel.setXYZ(v + k, p.vel?.x ?? 0, p.vel?.y ?? 0, p.vel?.z ?? 0);
      A.aAcc.setXYZ(v + k, p.acc?.x ?? 0, p.acc?.y ?? 0, p.acc?.z ?? 0);
      A.aBirth.setX(v + k, now + (p.delay ?? 0));
      A.aLife.setX(v + k, p.life ?? 1);
      A.aWidth.setX(v + k, p.width ?? 0.5);
      A.aLen.setX(v + k, p.len ?? 6);
      A.aAlpha.setX(v + k, p.alpha ?? 1);
      A.aCol0.setXYZ(v + k, this._c0.r, this._c0.g, this._c0.b);
      A.aCol1.setXYZ(v + k, this._c1.r, this._c1.g, this._c1.b);
    }
    this.dirty = true;
  }
  commit() {
    if (!this.dirty) return;
    this.dirty = false;
    for (const attr of Object.values(this.attrs)) attr.needsUpdate = true;
  }
  setTime(t) { this.uniforms.uTime.value = t; }
  setViewport(h, fovDeg) {
    this.uniforms.uScale.value = h / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }
  parkAll() {
    this.attrs.aBirth.array.fill(-1e9);
    this.attrs.aBirth.needsUpdate = true;
  }
}

// ============================================================ ribbon trails
const TRAIL_VERT = /* glsl */ `
attribute vec3 aOther;
attribute float aSide;
attribute float aDirSign;
attribute float aBirth;
attribute float aOtherBirth;
attribute float aWidth;
attribute float aFade;
attribute vec3 aCol;
attribute float aGlow;
uniform float uTime;
uniform float uLife;
uniform float uCool;
uniform vec3 uWind;
varying float vT;
varying float vU;
varying float vFade;
varying float vSeed;
varying vec3 vCol;
varying float vGlow;
void main() {
  float age = max(uTime - aBirth, 0.0);
  float ageO = max(uTime - aOtherBirth, 0.0);
  float t = clamp(age / uLife, 0.0, 1.0);
  vec3 p = position + uWind * age * 0.7;
  vec3 po = aOther + uWind * ageO * 0.7;
  // slight buoyant rise as smoke ages
  p.y += age * 0.55;
  po.y += ageO * 0.55;
  // consistent flight direction for both quad ends (avoids side flipping)
  vec3 dir = (po - p) * aDirSign;
  float dl = length(dir);
  dir = dl > 0.0001 ? dir / dl : vec3(0.0, 1.0, 0.0);
  vec3 toCam = normalize(cameraPosition - p);
  vec3 side = normalize(cross(dir, toCam));
  float w = aWidth * (0.45 + 2.0 * t);
  vec3 wp = p + side * aSide * w;
  vT = t;
  vU = aSide * 0.5 + 0.5;
  vFade = aFade;
  vSeed = fract(aBirth * 7.13);
  vCol = aCol;
  // per-segment incandescence decays with segment age (plasma -> smoke)
  vGlow = aGlow * exp(-age / max(uCool, 0.001));
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;
const TRAIL_FRAG = /* glsl */ `
precision highp float;
uniform float uOpacity;
uniform vec3 uTint;
uniform float uEmissive;
uniform sampler2D uNoise;
varying float vT;
varying float vU;
varying float vFade;
varying float vSeed;
varying vec3 vCol;
varying float vGlow;
void main() {
  float edge = 1.0 - abs(vU * 2.0 - 1.0);
  edge = pow(edge, 1.4);
  float fade = pow(1.0 - vT, 1.15);
  float n = texture2D(uNoise, vec2(vSeed * 8.0 + vT * 2.0, vU * 0.8 + vSeed)).r;
  float a = edge * fade * uOpacity * vFade * (0.45 + 0.55 * n);
  float em = clamp(max(uEmissive, vGlow), 0.0, 1.0);
  // lit smoke goes dim under dark skies (night) so ribbons don't read as
  // bright tubes; emissive segments (plasma, fresh exhaust) keep their alpha
  float tl = dot(uTint, vec3(0.299, 0.587, 0.114));
  a *= mix(mix(0.5, 1.0, smoothstep(0.05, 0.85, tl)), 1.0, em);
  if (a < 0.004) discard;
  // smoke is lit by the environment (uTint); emissive segments ignore it and
  // get a brightness kick so fresh exhaust reads white-hot through bloom
  vec3 col = vCol * mix(uTint, vec3(1.0), em) * (1.0 + vGlow * 2.2);
  gl_FragColor = vec4(col, a);
}
`;

const TRAIL_SEGMENTS = 140;

class TrailRibbon {
  constructor(scene, noiseTex) {
    const segs = TRAIL_SEGMENTS;
    const geo = new THREE.BufferGeometry();
    const mk = (n) => {
      const a = new THREE.BufferAttribute(new Float32Array(segs * 4 * n), n);
      a.setUsage(THREE.DynamicDrawUsage);
      return a;
    };
    this.aPos = mk(3);
    this.aOther = mk(3);
    this.aSide = mk(1);
    this.aDirSign = mk(1);
    this.aBirth = mk(1);
    this.aOtherBirth = mk(1);
    this.aWidth = mk(1);
    this.aFade = mk(1);
    this.aCol = mk(3);
    this.aGlow = mk(1);
    this.aBirth.array.fill(-1e9);
    this.aOtherBirth.array.fill(-1e9);
    geo.setAttribute('position', this.aPos);
    geo.setAttribute('aOther', this.aOther);
    geo.setAttribute('aSide', this.aSide);
    geo.setAttribute('aDirSign', this.aDirSign);
    geo.setAttribute('aBirth', this.aBirth);
    geo.setAttribute('aOtherBirth', this.aOtherBirth);
    geo.setAttribute('aWidth', this.aWidth);
    geo.setAttribute('aFade', this.aFade);
    geo.setAttribute('aCol', this.aCol);
    geo.setAttribute('aGlow', this.aGlow);
    const idx = new Uint16Array(segs * 6);
    for (let i = 0; i < segs; i++) {
      const v = i * 4;
      idx.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], i * 6);
    }
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
    this.uniforms = {
      uTime: { value: 0 },
      uLife: { value: 10 },
      uCool: { value: 1.2 },
      uWind: { value: new THREE.Vector3() },
      uOpacity: { value: 0.7 },
      uTint: { value: new THREE.Color(1, 1, 1) },
      uEmissive: { value: 0.1 },
      uNoise: { value: noiseTex },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: TRAIL_VERT,
      fragmentShader: TRAIL_FRAG,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 18;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.cursor = 0;
    this.hasPrev = false;
    this.prev = new THREE.Vector3();
    this.prevBirth = 0;
    this.prevWidth = 1;
    this.baseColor = new THREE.Color(0xffffff);
    this.prevColor = new THREE.Color(0xffffff);
    this.prevGlow = 0;
    this.altPuff = 0;
    this._ec = new THREE.Color();
  }
  /** cfg: { color, life, opacity, emissive, cool, altPuff? } — old callers unchanged.
   *  altPuff: extra width fraction gained at high altitude (cold thin air =>
   *  fat persistent contrail). Defaults ON for long-lived smoke ribbons and
   *  OFF for short plumes; pass altPuff: 0 to disable explicitly. */
  configure({ color = 0xffffff, life = 10, opacity = 0.7, emissive = 0.1, cool = 1.2, altPuff = null }) {
    this.baseColor.set(color);
    this.prevColor.copy(this.baseColor);
    this.prevGlow = 0;
    this.altPuff = altPuff ?? (life >= 3 ? 0.55 : 0);
    this.uniforms.uLife.value = life;
    this.uniforms.uOpacity.value = opacity;
    this.uniforms.uEmissive.value = emissive;
    this.uniforms.uCool.value = cool;
    this.mesh.visible = true;
  }
  reset() {
    this.aBirth.array.fill(-1e9);
    this.aOtherBirth.array.fill(-1e9);
    this.aBirth.needsUpdate = true;
    this.aOtherBirth.needsUpdate = true;
    this.hasPrev = false;
    this.cursor = 0;
    this.mesh.visible = false;
  }
  /** emit a segment. Optional per-emit color/glow: a hot segment starts at
   *  `color` with `glow` incandescence and cools toward smoke over uCool.
   *  Old 3-arg calls behave exactly as before. */
  emit(pos, width, fade = 1, color = null, glow = 0) {
    const now = this.uniforms.uTime.value;
    // contrail physics on the cheap: above ~1.4 km the ribbon fattens toward
    // +altPuff% by 4.4 km, so high coast legs read puffy while low boost
    // plumes stay tight
    if (this.altPuff > 0) width *= 1 + this.altPuff * clamp((pos.y - 1400) / 3000, 0, 1);
    const col = color !== null && color !== undefined ? this._ec.set(color) : this.baseColor;
    if (!this.hasPrev) {
      this.hasPrev = true;
      this.prev.copy(pos);
      this.prevBirth = now;
      this.prevWidth = width;
      this.prevColor.copy(col);
      this.prevGlow = glow;
      return;
    }
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % TRAIL_SEGMENTS;
    const v = i * 4;
    // two verts at current pos (dir sign -1: other point is BEHIND us),
    // two at prev pos (dir sign +1: other point is AHEAD)
    for (let k = 0; k < 2; k++) {
      this.aPos.setXYZ(v + k, pos.x, pos.y, pos.z);
      this.aOther.setXYZ(v + k, this.prev.x, this.prev.y, this.prev.z);
      this.aDirSign.setX(v + k, -1);
      this.aBirth.setX(v + k, now);
      this.aOtherBirth.setX(v + k, this.prevBirth);
      this.aWidth.setX(v + k, width);
      this.aFade.setX(v + k, fade);
      this.aCol.setXYZ(v + k, col.r, col.g, col.b);
      this.aGlow.setX(v + k, glow);
    }
    for (let k = 2; k < 4; k++) {
      this.aPos.setXYZ(v + k, this.prev.x, this.prev.y, this.prev.z);
      this.aOther.setXYZ(v + k, pos.x, pos.y, pos.z);
      this.aDirSign.setX(v + k, 1);
      this.aBirth.setX(v + k, this.prevBirth);
      this.aOtherBirth.setX(v + k, now);
      this.aWidth.setX(v + k, this.prevWidth);
      this.aFade.setX(v + k, fade);
      this.aCol.setXYZ(v + k, this.prevColor.r, this.prevColor.g, this.prevColor.b);
      this.aGlow.setX(v + k, this.prevGlow);
    }
    this.aSide.setX(v, -1); this.aSide.setX(v + 1, 1);
    this.aSide.setX(v + 2, -1); this.aSide.setX(v + 3, 1);
    for (const a of [this.aPos, this.aOther, this.aSide, this.aDirSign, this.aBirth, this.aOtherBirth, this.aWidth, this.aFade, this.aCol, this.aGlow]) {
      a.needsUpdate = true;
    }
    this.prev.copy(pos);
    this.prevBirth = now;
    this.prevWidth = width;
    this.prevColor.copy(col);
    this.prevGlow = glow;
  }
}

// ============================================================ fireball cores
// Noise-displaced spheres with a blackbody-ish ramp: the boiling incandescent
// heart of large blasts. Normal blending so the fireball occludes bright sky
// (additive alone washes out at noon). One draw call per active fireball.
const FIREBALL_NOISE = /* glsl */ `
float hash31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i);
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}
float fbm3(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return s;
}
`;
const FIREBALL_VERT = /* glsl */ `
uniform float uT;
uniform float uR;
uniform float uSeed;
varying vec3 vP;
varying float vRim;
varying float vN;
${FIREBALL_NOISE}
void main() {
  vec3 dir = normalize(position);
  float n = fbm3(dir * 2.4 + vec3(uSeed, uSeed * 1.7, uSeed * 0.6) + vec3(0.0, uT * 1.1, 0.0));
  float r = uR * (0.68 + 0.62 * n);
  vec3 p = dir * r;
  vP = dir * 2.1 + vec3(uSeed * 3.7);
  vN = n;
  // facing ratio: sphere normal (pre-displacement) vs view direction —
  // 1 at the center facing the camera, 0 at the silhouette rim
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 nView = normalize((modelViewMatrix * vec4(dir, 0.0)).xyz);
  vRim = clamp(dot(normalize(-mv.xyz), nView), 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;
const FIREBALL_FRAG = /* glsl */ `
precision highp float;
uniform float uT;
uniform float uHeat;
varying vec3 vP;
varying float vRim;
varying float vN;
${FIREBALL_NOISE}
vec3 fireRamp(float w) {
  vec3 c = vec3(1.35, 0.22, 0.03) * clamp(w * 1.6, 0.0, 1.0);
  c += vec3(1.3, 0.85, 0.12) * smoothstep(0.42, 0.85, w);
  c += vec3(1.5, 1.45, 1.4) * smoothstep(0.78, 1.12, w);
  return c;
}
void main() {
  float n2 = fbm3(vP * 2.3 + vec3(0.0, -uT * 2.4, 0.0));
  // dissolve: threshold climbs over life so the ball breaks into rags and dies
  float cut = mix(0.16, 0.68, uT);
  float a = smoothstep(cut, cut + 0.2, n2 * 0.72 + vN * 0.38 + 0.18);
  a *= 1.0 - smoothstep(0.68, 1.0, uT);
  float rim = clamp(vRim, 0.0, 1.0);
  a *= smoothstep(0.02, 0.3, rim);
  // temperature: hot facing core, cooler broken rim, global cooling over life
  float w = (n2 * 0.85 + 0.42) * (1.05 - uT * 0.8) * (0.38 + 0.72 * rim) * uHeat;
  vec3 col = fireRamp(w);
  // late-life soot: survivors darken toward smoke before the dissolve finishes
  col = mix(col, vec3(0.16, 0.14, 0.13), smoothstep(0.55, 0.95, uT));
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}
`;

// ============================================================ local sprite textures
// (effect-private, procedural — shared canvas textures live in textures.js)
function makeShellTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  // thin, slightly ragged annulus — a fast pressure-wave glint, not a donut
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.0, 'rgba(255,255,255,0.10)');
  grad.addColorStop(0.62, 'rgba(255,255,255,0.02)');
  grad.addColorStop(0.80, 'rgba(255,255,255,0.10)');
  grad.addColorStop(0.875, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.93, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  // break the ring up so it doesn't read as a perfect lens artifact
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + (i % 3) * 0.41;
    const r = 55 + (i % 5) * 1.6;
    const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r;
    const bg = g.createRadialGradient(x, y, 0, x, y, 7 + (i % 4) * 3);
    bg.addColorStop(0, `rgba(0,0,0,${0.25 + (i % 3) * 0.16})`);
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = bg;
    g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

// fat-core flare with anisotropic spikes: reads at multi-km ranges
function makeBlastFlareTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  let grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,250,236,0.98)');
  grad.addColorStop(0.36, 'rgba(255,230,180,0.5)');
  grad.addColorStop(0.62, 'rgba(255,196,124,0.16)');
  grad.addColorStop(1.0, 'rgba(255,165,85,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'lighter';
  // 2 soft anisotropic smears (4 arms, anamorphic-flare feel). Wider + dimmer
  // than diffraction needles so a pad-filling flash stays a ball of light
  // with a hint of streak instead of a christmas star.
  for (let i = 0; i < 2; i++) {
    const a = (i / 2) * Math.PI + 0.22;
    const long = i === 0 ? 96 : 62;
    g.save();
    g.translate(128, 128);
    g.rotate(a);
    const lg = g.createLinearGradient(-long, 0, long, 0);
    lg.addColorStop(0, 'rgba(255,236,200,0)');
    lg.addColorStop(0.5, 'rgba(255,246,224,0.32)');
    lg.addColorStop(1, 'rgba(255,236,200,0)');
    g.fillStyle = lg;
    g.fillRect(-long, -5.5, long * 2, 11);
    g.restore();
  }
  return new THREE.CanvasTexture(c);
}

// dense lumpy smoke puffs, top-lit, as a 2x2 atlas of 4 variants so adjacent
// particles never read as clones. Each cell: opaque heart + a ring of
// cauliflower lobes, every lobe self-shadowed on its lower-right so the
// interior shows turbulent structure at close range instead of one soft ball.
// Rotation is kept small by spawners so the baked lighting holds up.
function makeThickPuffTexture() {
  const CELL = 256; // 512x512 atlas: enough texel density for pad-filling puffs
  const K = CELL / 160; // legacy layout was authored on a 160px cell
  const c = document.createElement('canvas');
  c.width = CELL * 2; c.height = CELL * 2;
  const g = c.getContext('2d');
  // local deterministic PRNG for lobe placement (never touches ctx.vrng)
  let s = 0x51ac3d7b;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const cx = 80 * K, cy = 82 * K;
  for (let cell = 0; cell < 4; cell++) {
    g.save();
    g.translate((cell % 2) * CELL, (cell >> 1) * CELL);
    g.beginPath(); g.rect(0, 0, CELL, CELL); g.clip();
    // soft heart keeps the silhouette filled behind the lobes
    const heart = g.createRadialGradient(cx, cy, 0, cx, cy, 52 * K);
    heart.addColorStop(0, 'rgba(255,255,255,0.92)');
    heart.addColorStop(0.6, 'rgba(255,255,255,0.55)');
    heart.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = heart;
    g.fillRect(0, 0, CELL, CELL);
    // cauliflower curds in two rings: a coarse ring of main lobes plus an
    // inner ring of smaller curds — finer granularity survives close-ups
    const drawLobe = (x, y, r, al) => {
      const body = g.createRadialGradient(x - r * 0.22, y - r * 0.26, 0, x, y, r);
      body.addColorStop(0, `rgba(255,255,255,${al})`);
      body.addColorStop(0.62, `rgba(255,255,255,${al * 0.62})`);
      body.addColorStop(0.88, `rgba(255,255,255,${al * 0.14})`);
      body.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = body;
      g.fillRect(0, 0, CELL, CELL);
      // per-lobe core shadow: a dark terminator on the lower-right of each
      // lobe is what makes the interior read as separate boiling masses
      g.globalCompositeOperation = 'source-atop';
      const shd = g.createRadialGradient(x + r * 0.34, y + r * 0.4, r * 0.1, x + r * 0.3, y + r * 0.34, r * 0.95);
      shd.addColorStop(0, `rgba(72,68,66,${0.30 + rnd() * 0.18})`);
      shd.addColorStop(0.55, 'rgba(90,86,84,0.12)');
      shd.addColorStop(1, 'rgba(120,116,112,0)');
      g.fillStyle = shd;
      g.fillRect(0, 0, CELL, CELL);
      g.globalCompositeOperation = 'source-over';
    };
    const nL = 10 + ((rnd() * 3) | 0);
    for (let i = 0; i < nL; i++) {
      const a = (i / nL) * TAU + rnd() * 0.55;
      const rr = (22 + rnd() * 22) * K;
      drawLobe(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92,
        (13 + rnd() * 15) * K, 0.62 + rnd() * 0.3);
    }
    const nS = 8 + ((rnd() * 4) | 0);
    for (let i = 0; i < nS; i++) {
      const a = rnd() * TAU;
      const rr = (8 + rnd() * 26) * K;
      drawLobe(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.9,
        (6 + rnd() * 8) * K, 0.4 + rnd() * 0.3);
    }
    // small outer knuckles breaking the silhouette
    for (let i = 0; i < 7; i++) {
      const a = rnd() * TAU;
      const rr = (46 + rnd() * 14) * K;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.9;
      const r = (8 + rnd() * 10) * K;
      const al = 0.34 + rnd() * 0.24;
      const kn = g.createRadialGradient(x, y, 0, x, y, r);
      kn.addColorStop(0, `rgba(255,255,255,${al})`);
      kn.addColorStop(0.7, `rgba(255,255,255,${al * 0.4})`);
      kn.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = kn;
      g.fillRect(0, 0, CELL, CELL);
    }
    // global directional shade baked into rgb only (alpha untouched)
    g.globalCompositeOperation = 'source-atop';
    const sh = g.createLinearGradient(30 * K, 20 * K, 120 * K, 150 * K);
    sh.addColorStop(0, 'rgba(255,255,255,0)');
    sh.addColorStop(0.55, 'rgba(120,116,112,0.4)');
    sh.addColorStop(1, 'rgba(56,52,50,0.6)');
    g.fillStyle = sh;
    g.fillRect(0, 0, CELL, CELL);
    // fine mottle: tiny dark/light speckles give high-frequency tooth so a
    // frame-filling puff still shows grain instead of airbrushed gradients
    for (let i = 0; i < 110; i++) {
      const a = rnd() * TAU, rr = Math.sqrt(rnd()) * 58 * K;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.92;
      const r = (2 + rnd() * 5.5) * K;
      const dark = rnd() < 0.58;
      const al = dark ? 0.10 + rnd() * 0.13 : 0.07 + rnd() * 0.10;
      const sp = g.createRadialGradient(x, y, 0, x, y, r);
      sp.addColorStop(0, dark ? `rgba(60,56,54,${al})` : `rgba(255,255,255,${al})`);
      sp.addColorStop(1, dark ? 'rgba(60,56,54,0)' : 'rgba(255,255,255,0)');
      g.fillStyle = sp;
      g.fillRect(0, 0, CELL, CELL);
    }
    // bright cap highlight
    const hi = g.createRadialGradient(62 * K, 46 * K, 4 * K, 62 * K, 46 * K, 70 * K);
    hi.addColorStop(0, 'rgba(255,255,255,0.5)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hi;
    g.fillRect(0, 0, CELL, CELL);
    g.restore();
    g.globalCompositeOperation = 'source-over';
  }
  return new THREE.CanvasTexture(c);
}

// lumpy fireball blob with a hot dense core and radial licks (fire sprite)
function makeFireballTexture() {
  const c = document.createElement('canvas');
  c.width = 160; c.height = 160;
  const g = c.getContext('2d');
  const blobs = [[80, 80, 64, 0.95], [56, 62, 36, 0.75], [104, 66, 36, 0.75], [70, 104, 34, 0.7], [100, 100, 30, 0.65], [80, 52, 26, 0.7]];
  for (const [x, y, r, a] of blobs) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255,255,255,${a})`);
    grad.addColorStop(0.4, `rgba(255,240,210,${a * 0.8})`);
    grad.addColorStop(0.78, `rgba(255,214,160,${a * 0.24})`);
    grad.addColorStop(1, 'rgba(255,195,135,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 160, 160);
  }
  // radial flame licks
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + (i % 2) * 0.31;
    const len = 58 + (i % 3) * 14;
    g.save();
    g.translate(80, 80);
    g.rotate(a);
    const lg = g.createLinearGradient(0, 0, len, 0);
    lg.addColorStop(0, 'rgba(255,236,200,0.5)');
    lg.addColorStop(1, 'rgba(255,200,130,0)');
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(10, -7);
    g.quadraticCurveTo(len * 0.6, -2.5, len, 0);
    g.quadraticCurveTo(len * 0.6, 2.5, 10, 7);
    g.closePath();
    g.fill();
    g.restore();
  }
  return new THREE.CanvasTexture(c);
}

// ============================================================ effects manager
export function createEffects(ctx) {
  const { scene, textures } = ctx;
  const noiseTex = textures.noiseTex();

  const fireballTex = makeFireballTexture();
  const blastFlareTex = makeBlastFlareTexture();
  const thickPuffTex = makeThickPuffTexture();

  const smoke = new ParticleSystem(scene, thickPuffTex, 6144, false, { hot: 0, fadeLate: 0.62, atlas: 1, erode: 0.52 });
  const fire = new ParticleSystem(scene, fireballTex, 4096, true, { hot: 1, fadeLate: 0.5, erode: 0.3 });
  const streaks = new StreakSystem(scene, 2048);

  const trailPool = new Pool(() => new TrailRibbon(scene, noiseTex), 30);

  // ---- quality / accessibility helpers
  const QK = { high: 1, medium: 0.72, low: 0.5 };
  const qk = () => QK[ctx.settings.quality] ?? 1;
  const qn = (n) => Math.max(1, Math.round(n * qk()));
  const reduced = () => !!ctx.settings.reducedMotion;
  const maxLights = () => (ctx.settings.quality === 'high' ? 3 : ctx.settings.quality === 'medium' ? 2 : 0);

  // ---- flash sprites
  const flashPool = new Pool(() => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: blastFlareTex, color: 0xffffff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    s.renderOrder = 23;
    s.visible = false;
    scene.add(s);
    return { sprite: s, t: 0, dur: 0.3, size: 10, active: false };
  }, 16);
  const activeFlashes = [];

  // ---- expanding luminous blast shells (camera-facing annulus)
  const shellTex = makeShellTexture();
  const shockPool = new Pool(() => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: shellTex, color: 0xffffff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    s.renderOrder = 22;
    s.visible = false;
    scene.add(s);
    return { sprite: s, t: 0, dur: 1, maxR: 40, aspect: 1, active: false };
  }, 6);
  const activeShocks = [];

  // ---- fireball cores (noise-displaced spheres, one shared geometry)
  const FIREBALL_N = 5;
  const fireballGeo = new THREE.IcosahedronGeometry(1, 3);
  const fireballs = [];
  for (let i = 0; i < FIREBALL_N; i++) {
    const uniforms = {
      uT: { value: 0 },
      uR: { value: 1 },
      uSeed: { value: i * 3.17 },
      uHeat: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: FIREBALL_VERT,
      fragmentShader: FIREBALL_FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(fireballGeo, mat);
    mesh.visible = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = 19;
    scene.add(mesh);
    fireballs.push({ mesh, uniforms, t: 0, dur: 1, maxR: 10, active: false, stretch: 1 });
  }
  function fireballAt(pos, maxR, dur, heat = 1, stretch = 1) {
    let fb = null;
    for (const f of fireballs) { if (!f.active) { fb = f; break; } }
    if (!fb) return; // all busy: sprites carry the blast alone
    fb.active = true;
    fb.t = 0;
    fb.dur = dur;
    fb.maxR = maxR;
    fb.stretch = stretch;
    fb.mesh.position.copy(pos);
    fb.uniforms.uT.value = 0;
    fb.uniforms.uR.value = maxR * 0.2;
    fb.uniforms.uSeed.value = ctx.vrng.next() * 37;
    fb.uniforms.uHeat.value = heat;
    fb.mesh.visible = true;
  }

  // ---- pooled explosion lights (always in the scene at intensity 0 so
  // shader programs compile once; pulses only animate intensity/position)
  const LIGHT_N = 3;
  const lightPulses = [];
  for (let i = 0; i < LIGHT_N; i++) {
    const l = new THREE.PointLight(0xffa050, 0, 600, 2);
    l.castShadow = false;
    scene.add(l);
    lightPulses.push({ light: l, t: 0, dur: 0, peak: 0, active: false });
  }
  function lightPulse(pos, peak, dist, dur, color = 0xffa050) {
    if (reduced()) return;
    if (ctx.weather?.timeOfDay === 'day') return; // sun swamps it — save the budget
    let slot = null;
    let usedCount = 0;
    let oldest = null;
    for (const lp of lightPulses) {
      if (!lp.active) { slot ??= lp; continue; }
      usedCount++;
      if (!oldest || lp.t / lp.dur > oldest.t / oldest.dur) oldest = lp;
    }
    if (usedCount >= maxLights()) return;
    if (!slot) slot = oldest; // steal the most-faded pulse
    if (!slot) return;
    slot.active = true;
    slot.t = 0;
    slot.dur = dur;
    slot.peak = peak;
    slot.light.position.copy(pos);
    slot.light.color.set(color);
    slot.light.distance = dist;
    slot.light.intensity = 0;
  }

  // ---- debris instanced mesh (elongated shards tumble better than blobs)
  const DEBRIS_N = 128;
  const debrisGeo = new THREE.TetrahedronGeometry(0.5);
  debrisGeo.scale(0.8, 0.55, 1.5);
  const debrisMat = new THREE.MeshStandardMaterial({ color: 0x4a4642, roughness: 0.9, metalness: 0.2, emissive: 0xff6a22, emissiveIntensity: 0 });
  const debrisMesh = new THREE.InstancedMesh(debrisGeo, debrisMat, DEBRIS_N);
  debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  debrisMesh.frustumCulled = false;
  scene.add(debrisMesh);
  const debris = [];
  for (let i = 0; i < DEBRIS_N; i++) {
    debris.push({
      alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      rot: new THREE.Euler(), angVel: new THREE.Vector3(), scale: 1, life: 0, age: 0, glow: 0,
      trailT: 0, trailAcc: 0, sizeK: 1,
    });
  }
  let debrisHeat = 0; // fresh blasts make every airborne shard glow, then cool
  const _m4 = new THREE.Matrix4();
  const _q4 = new THREE.Quaternion();
  const _s3 = new THREE.Vector3();
  const ZERO_SCALE = new THREE.Vector3(0.0001, 0.0001, 0.0001);

  // ---- shockwave rings (ground-hugging)
  const ringPool = new Pool(() => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.80, 1.0, 56),
      new THREE.MeshBasicMaterial({ color: 0xffe0b8, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    scene.add(m);
    return { mesh: m, t: 0, dur: 1, maxR: 30, active: false };
  }, 8);
  const activeRings = [];

  // ---- scorch decals
  const scorchPool = new Pool(() => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: textures.scorch(), transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })
    );
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 3;
    m.visible = false;
    scene.add(m);
    return { mesh: m, age: 0, active: false };
  }, 12);
  const activeScorches = [];

  let now = 0;
  const _v = new THREE.Vector3();
  const _v2 = new THREE.Vector3();
  const _v3 = new THREE.Vector3();

  const WHITE = new THREE.Color(1, 1, 1);

  function shakeFromDistance(pos, base) {
    const d = pos.distanceTo(ctx.camera.position);
    const amt = base * clamp(1 - d / 900, 0, 1);
    if (amt > 0.02) ctx.player?.addShake(amt);
  }

  function flash(pos, size, dur = 0.25, color = 0xfff2d8) {
    const f = flashPool.acquire();
    if (!f) return;
    // keep flashes readable at multi-km engagement distances, but sub-linear:
    // structure (fireball, smoke) carries the look, not one huge white blob
    let sizeAdj = size * Math.pow(distK(pos), 0.72);
    let durAdj = dur;
    if (reduced()) { sizeAdj *= 0.55; durAdj = Math.min(dur, 0.18); }
    f.sprite.position.copy(pos);
    f.sprite.material.color.set(color);
    f.sprite.material.opacity = 1;
    f.sprite.scale.setScalar(sizeAdj * 0.4);
    f.sprite.visible = true;
    f.t = 0; f.dur = durAdj; f.size = sizeAdj;
    f.active = true;
    activeFlashes.push(f);
  }

  /** expanding luminous ring/sphere shell, camera-facing (air-burst readability) */
  function shockSphere(pos, maxR, dur = 0.9, color = 0xffd9a8) {
    const s = shockPool.acquire();
    if (!s) return;
    s.sprite.position.copy(pos);
    s.sprite.material.color.set(color);
    s.sprite.material.opacity = 0.9;
    s.sprite.scale.setScalar(maxR * 0.1);
    // real pressure waves aren't compass-perfect circles: random roll plus a
    // squash + roll per activation keeps repeated bursts from looking stamped
    // (0.78 floor: at 0.84 the day halo still read as a compass circle)
    s.sprite.material.rotation = ctx.vrng.next() * TAU;
    s.aspect = ctx.vrng.range(0.78, 0.97);
    s.sprite.visible = true;
    s.t = 0; s.dur = dur; s.maxR = maxR;
    s.active = true;
    activeShocks.push(s);
  }

  function ring(pos, maxR, dur = 0.9, color = 0xffe0b8) {
    const r = ringPool.acquire();
    if (!r) return;
    r.mesh.position.set(pos.x, Math.max(terrainHeight(pos.x, pos.z), 0) + 0.35, pos.z);
    r.mesh.scale.setScalar(0.5);
    r.mesh.material.color.set(color);
    r.mesh.material.opacity = 0.42;
    r.mesh.visible = true;
    r.t = 0; r.dur = dur; r.maxR = maxR;
    r.active = true;
    activeRings.push(r);
  }

  function scorchAt(pos, size) {
    const s = scorchPool.acquire();
    if (!s) return;
    s.mesh.position.set(pos.x, Math.max(terrainHeight(pos.x, pos.z), 0) + 0.06, pos.z);
    s.mesh.scale.setScalar(size);
    s.mesh.rotation.z = ctx.vrng.next() * TAU;
    s.mesh.material.opacity = 0.85;
    s.mesh.visible = true;
    s.age = 0;
    s.active = true;
    activeScorches.push(s);
  }

  /** distance-based size boost so composites read at multi-km ranges */
  function distK(pos) {
    // cap low: this scales PARTICLE sizes, and a 12x puff at 6 km reads as a
    // cartoon balloon. Multi-km readability comes from flash/light, not size.
    return clamp(0.5 + pos.distanceTo(ctx.camera.position) * 0.0022, 1, 2.6);
  }

  /** hurl instanced fragments; trailTime > 0 gives them short smoke trails + glints */
  function throwDebris(pos, count, speed, glow = 0.6, trailTime = 0) {
    const sizeK = distK(pos);
    let thrown = 0;
    for (const d of debris) {
      if (d.alive) continue;
      d.alive = true;
      d.pos.copy(pos);
      const a = ctx.vrng.next() * TAU;
      const up = ctx.vrng.range(0.15, 1);
      d.vel.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(speed * ctx.vrng.range(0.3, 1) * Math.sqrt(1 - up * up));
      d.vel.y = speed * up * ctx.vrng.range(0.5, 1.1);
      d.angVel.set(ctx.vrng.range(-8, 8), ctx.vrng.range(-8, 8), ctx.vrng.range(-8, 8));
      d.rot.set(ctx.vrng.next() * 3, ctx.vrng.next() * 3, ctx.vrng.next() * 3);
      d.scale = ctx.vrng.range(0.3, 1.1) * (1 + (sizeK - 1) * 0.4);
      d.life = ctx.vrng.range(2.5, 5);
      d.age = 0;
      d.glow = glow;
      d.trailT = trailTime > 0 ? trailTime * ctx.vrng.range(0.75, 1.25) : 0;
      d.trailAcc = ctx.vrng.range(0, 0.05);
      d.sizeK = sizeK;
      if (++thrown >= count) break;
    }
    if (glow > 0.3) debrisHeat = Math.min(1, debrisHeat + 0.8);
  }

  // ============================ composite effects ============================

  function launchBlast(pos, dir, scale = 1) {
    const ground = Math.max(terrainHeight(pos.x, pos.z), 0);
    const k = (0.7 + 0.45 * scale) * qk(); // particle-count multiplier (Sentinel biggest)
    const wind = ctx.world.wind;

    // canister muzzle flash: hot white core + lingering orange halo
    flash(pos, 30 * scale, 0.16, 0xfff6dc);
    flash(pos, 20 * scale, 0.45, 0xffa64e);
    lightPulse(_v.set(pos.x, ground + 4, pos.z), 9000 * scale, 320, 0.7, 0xffb060);
    // radial flare tongues off the muzzle: few + chunky reads as burning gas
    // being shoved out; many thin needles read as a christmas star
    const nSpike = Math.round(7 * k);
    for (let i = 0; i < nSpike; i++) {
      _v2.set(ctx.vrng.gauss(), ctx.vrng.gauss() * 0.6, ctx.vrng.gauss()).normalize()
        .multiplyScalar(ctx.vrng.range(26, 52) * scale)
        .addScaledVector(dir, ctx.vrng.range(8, 26) * scale);
      _v3.copy(_v2).multiplyScalar(-2.2);
      streaks.spawn(now, {
        pos, vel: _v2, acc: _v3,
        life: ctx.vrng.range(0.12, 0.3),
        width: ctx.vrng.range(0.45, 0.85) * scale,
        len: ctx.vrng.range(3.5, 8) * scale,
        alpha: 0.95,
        col0: 0xfff7dd, col1: 0xff9838,
      });
    }
    // sabot / canister-cover fragments tumbling off the muzzle
    throwDebris(_v.copy(pos).addScaledVector(dir, 2.5), 3 + Math.round(2 * scale), 17 * scale, 0.15);

    // exhaust fireball along -dir: white-hot flame wash at ignition
    const nFire = Math.round(26 * k);
    for (let i = 0; i < nFire; i++) {
      _v.copy(dir).multiplyScalar(-ctx.vrng.range(2, 24) * scale).add(pos);
      fire.spawn(now, {
        pos: _v,
        vel: _v2.set(ctx.vrng.range(-4, 4), ctx.vrng.range(-2, 5), ctx.vrng.range(-4, 4)).addScaledVector(dir, -ctx.vrng.range(7, 24)),
        acc: { x: 0, y: 4, z: 0 },
        life: ctx.vrng.range(0.25, 0.7),
        size0: 4.5 * scale, size1: 12 * scale,
        alpha: 0.95,
        col0: 0xfff4d0, col1: 0xff7a2a,
        rotVel: ctx.vrng.range(-4, 4),
      });
    }
    // dense billowing pad cloud: opaque puffs born flame-lit (warm bright)
    // that cool to gray as the missile departs, boiling as they rise
    const nBillow = Math.round(46 * k);
    for (let i = 0; i < nBillow; i++) {
      const a = ctx.vrng.next() * TAU;
      const rr = ctx.vrng.range(1, 4.5) * scale;
      _v.set(pos.x + Math.cos(a) * rr, ground + ctx.vrng.range(0.4, 5), pos.z + Math.sin(a) * rr);
      const s1 = ctx.vrng.range(9, 16) * scale;
      smoke.spawn(now, {
        pos: _v,
        vel: {
          x: Math.cos(a) * ctx.vrng.range(2.5, 9) * scale + wind.x * 0.3,
          y: ctx.vrng.range(1.2, 5),
          z: Math.sin(a) * ctx.vrng.range(2.5, 9) * scale + wind.z * 0.3,
        },
        acc: { x: wind.x * 0.22, y: ctx.vrng.range(-0.1, 0.35), z: wind.z * 0.22 },
        life: ctx.vrng.range(4, 11),
        size0: ctx.vrng.range(2.5, 4.5) * scale, size1: s1,
        alpha: ctx.vrng.range(0.5, 0.8),
        col0: i % 3 === 0 ? 0xffd9a8 : 0xf2e6d4, col1: i % 2 === 0 ? 0x9a938a : 0x7c766e,
        colJit: 0.11,
        delay: ctx.vrng.range(0, 0.35),
        rot: ctx.vrng.range(-0.6, 0.6),
        rotVel: ctx.vrng.range(-0.5, 0.5),
        wob: s1 * 0.05,
      });
    }
    // fast dust wave kicked out by the exhaust
    const nWave = Math.round(28 * k);
    for (let i = 0; i < nWave; i++) {
      const a = (i / nWave) * TAU;
      _v.set(pos.x + Math.cos(a) * 2 * scale, ground + 0.4, pos.z + Math.sin(a) * 2 * scale);
      smoke.spawn(now, {
        pos: _v,
        vel: { x: Math.cos(a) * ctx.vrng.range(14, 30) * scale, y: ctx.vrng.range(0.6, 2.2), z: Math.sin(a) * ctx.vrng.range(14, 30) * scale },
        acc: { x: -Math.cos(a) * 3 * scale, y: -0.6, z: -Math.sin(a) * 3 * scale },
        life: ctx.vrng.range(1.4, 3.2),
        size0: 2 * scale, size1: ctx.vrng.range(8, 13) * scale,
        alpha: 0.55,
        col0: 0xd6c09a, col1: 0x9d8a68,
        rot: ctx.vrng.range(-0.6, 0.6),
      });
    }
    // slow rolling pad dust ring — hugs the ground and lingers
    const nRoll = Math.round(22 * k);
    for (let i = 0; i < nRoll; i++) {
      const a = (i / nRoll) * TAU + ctx.vrng.range(-0.12, 0.12);
      _v.set(pos.x + Math.cos(a) * 3.4 * scale, ground + 0.7, pos.z + Math.sin(a) * 3.4 * scale);
      const s1 = ctx.vrng.range(12, 18) * scale;
      smoke.spawn(now, {
        pos: _v,
        vel: {
          x: Math.cos(a) * ctx.vrng.range(3.5, 8) * scale + wind.x * 0.25,
          y: ctx.vrng.range(0.2, 1),
          z: Math.sin(a) * ctx.vrng.range(3.5, 8) * scale + wind.z * 0.25,
        },
        acc: { x: wind.x * 0.12, y: -0.35, z: wind.z * 0.12 },
        life: ctx.vrng.range(3.5, 8),
        size0: 2.6 * scale, size1: s1,
        alpha: 0.45,
        col0: 0xcdb48c, col1: 0x8a7a60,
        delay: ctx.vrng.range(0.1, 0.5),
        rot: ctx.vrng.range(-0.6, 0.6),
        rotVel: ctx.vrng.range(-0.5, 0.5),
        wob: s1 * 0.03,
      });
    }
    // rising exhaust pillar: puffs seeded along the departure path so the
    // first seconds of flight leave a fat connected column above the pad
    const nPillar = Math.round(16 * k);
    for (let i = 0; i < nPillar; i++) {
      const hh = (i / nPillar) * 15 * scale + ctx.vrng.range(0, 1.5);
      _v.copy(dir).multiplyScalar(hh).add(pos);
      _v.x += ctx.vrng.gauss() * 1.1 * scale;
      _v.z += ctx.vrng.gauss() * 1.1 * scale;
      // fat + soft so neighbours overlap into one connected column
      const s1 = ctx.vrng.range(9, 15) * scale;
      smoke.spawn(now, {
        pos: _v,
        vel: { x: ctx.vrng.gauss() * 1.6 + wind.x * 0.35, y: ctx.vrng.range(0.6, 2.4), z: ctx.vrng.gauss() * 1.6 + wind.z * 0.35 },
        acc: { x: wind.x * 0.18, y: 0.05, z: wind.z * 0.18 },
        life: ctx.vrng.range(5, 10),
        size0: s1 * 0.55, size1: s1,
        alpha: ctx.vrng.range(0.4, 0.58),
        col0: i % 4 === 0 ? 0xffe2b8 : 0xe8ddcc, col1: 0x8e877c,
        delay: (hh / (15 * scale)) * 0.5 + ctx.vrng.range(0, 0.15),
        rot: ctx.vrng.range(-0.6, 0.6),
        rotVel: ctx.vrng.range(-0.4, 0.4),
        wob: s1 * 0.05,
      });
    }
    // lingering pad haze: a few very slow, very long-lived wisps
    const nLinger = Math.round(9 * k);
    for (let i = 0; i < nLinger; i++) {
      const a = ctx.vrng.next() * TAU;
      _v.set(pos.x + Math.cos(a) * ctx.vrng.range(2, 7) * scale, ground + ctx.vrng.range(1.5, 6), pos.z + Math.sin(a) * ctx.vrng.range(2, 7) * scale);
      const s1 = ctx.vrng.range(14, 24) * scale;
      smoke.spawn(now, {
        pos: _v,
        vel: { x: wind.x * 0.45 + ctx.vrng.gauss(), y: ctx.vrng.range(0.25, 0.9), z: wind.z * 0.45 + ctx.vrng.gauss() },
        acc: { x: wind.x * 0.1, y: 0.02, z: wind.z * 0.1 },
        life: ctx.vrng.range(11, 20),
        size0: s1 * 0.4, size1: s1,
        alpha: ctx.vrng.range(0.22, 0.34),
        col0: 0xc9c2b6, col1: 0x8e887e,
        delay: ctx.vrng.range(0.6, 2.2),
        rot: ctx.vrng.range(-0.5, 0.5),
        rotVel: ctx.vrng.range(-0.3, 0.3),
        wob: s1 * 0.05,
      });
    }
    ring(pos, 26 * scale, 0.8);
    shakeFromDistance(pos, 0.55 * scale);
    ctx.events.emit('fx-launch', { pos: pos.clone(), scale });
  }

  function explosionAir(pos, scale = 1) {
    const highAlt = pos.y - Math.max(terrainHeight(pos.x, pos.z), 0) > 500;
    const dk = distK(pos); // keeps the composite readable from the base
    const big = scale >= 0.6; // warhead kill vs interceptor self-destruct
    const cnt = qk();
    const wind = ctx.world.wind;

    // layered flash: hot white core + short orange halo (halo must die fast so
    // the fire phase underneath gets its moment on screen)
    flash(pos, 40 * scale, 0.15, 0xffffff);
    flash(pos, 20 * scale, 0.3, 0xffa54a);
    // expanding pressure-wave glint — km-scale readability cue, quick + thin
    shockSphere(pos, (highAlt ? 34 : 24) * scale * Math.max(dk * 0.35, 1), highAlt ? 0.55 : 0.4, highAlt ? 0xcfdfff : 0xffe2c0);
    lightPulse(pos, 160000 * scale * scale, 1100 + 1300 * scale, 1.1, 0xffa860);

    // boiling incandescent core: noise-displaced sphere (big kills only)
    const fbR = (5.2 + 5.5 * scale) * (0.55 + dk * 0.45);
    if (big) fireballAt(pos, fbR, 1.0 + 0.45 * scale, 1.12);

    // hot fireball sprites: instant white-hot cluster + rolling flames
    const fbSpread = (8 + dk * 5) * scale;
    const nFlash = qn(Math.round(14 * Math.min(scale, 1.6)));
    for (let i = 0; i < nFlash; i++) {
      _v.set(pos.x + ctx.vrng.gauss() * fbSpread * 0.6, pos.y + ctx.vrng.gauss() * fbSpread * 0.6, pos.z + ctx.vrng.gauss() * fbSpread * 0.6);
      _v2.set(ctx.vrng.gauss(), ctx.vrng.gauss(), ctx.vrng.gauss()).multiplyScalar(22 * scale);
      _v3.copy(_v2).multiplyScalar(-1.5);
      fire.spawn(now, {
        pos: _v, vel: _v2, acc: _v3,
        life: ctx.vrng.range(0.3, 0.6),
        size0: 5 * scale * dk, size1: ctx.vrng.range(8, 12) * scale * dk,
        alpha: 0.95,
        col0: 0xfffbe8, col1: 0xffa040,
        rotVel: ctx.vrng.range(-4, 4),
      });
    }
    const nFire = qn(Math.round(24 * Math.min(scale, 1.6)));
    for (let i = 0; i < nFire; i++) {
      _v.set(pos.x + ctx.vrng.gauss() * fbSpread, pos.y + ctx.vrng.gauss() * fbSpread, pos.z + ctx.vrng.gauss() * fbSpread);
      _v2.set(ctx.vrng.gauss(), ctx.vrng.gauss(), ctx.vrng.gauss()).multiplyScalar(15 * scale);
      _v3.copy(_v2).multiplyScalar(-1.05);
      _v3.y += 5;
      fire.spawn(now, {
        pos: _v, vel: _v2, acc: _v3,
        life: ctx.vrng.range(0.65, 1.4),
        size0: 4.5 * scale * dk, size1: ctx.vrng.range(9, 15) * scale * dk,
        alpha: 0.92,
        col0: 0xffe8b0, col1: 0xff5a1a,
        delay: ctx.vrng.range(0.05, 0.32),
        rotVel: ctx.vrng.range(-3.5, 3.5),
      });
    }
    // bright core puffs (normal blend): give the fireball body against bright sky
    const nCore = qn(Math.round(13 * Math.min(scale, 1.6)));
    for (let i = 0; i < nCore; i++) {
      _v.set(pos.x + ctx.vrng.gauss() * fbSpread * 0.8, pos.y + ctx.vrng.gauss() * fbSpread * 0.8, pos.z + ctx.vrng.gauss() * fbSpread * 0.8);
      _v2.set(ctx.vrng.gauss(), ctx.vrng.gauss(), ctx.vrng.gauss()).multiplyScalar(11 * scale);
      _v3.copy(_v2).multiplyScalar(-0.9);
      smoke.spawn(now, {
        pos: _v, vel: _v2, acc: _v3,
        life: ctx.vrng.range(0.45, 0.9),
        size0: 5 * scale * dk, size1: ctx.vrng.range(10, 14) * scale * dk,
        alpha: 0.82,
        col0: 0xffedc8, col1: 0x8d7d68,
        rot: ctx.vrng.range(-0.7, 0.7),
        rotVel: ctx.vrng.range(-2.5, 2.5),
      });
    }
    // fire -> smoke transition shell (hot brown cooling to near-black)
    const trSpread = (11 + dk * 7) * scale;
    const nHot = qn(Math.round(22 * Math.min(scale, 1.6)));
    for (let i = 0; i < nHot; i++) {
      _v.set(pos.x + ctx.vrng.gauss() * trSpread, pos.y + ctx.vrng.gauss() * trSpread, pos.z + ctx.vrng.gauss() * trSpread);
      _v2.set(ctx.vrng.gauss(), ctx.vrng.gauss() * 0.8 + 0.4, ctx.vrng.gauss()).multiplyScalar(8 * scale);
      _v3.copy(_v2).multiplyScalar(-0.42);
      _v3.y += 1.1;
      const s1 = ctx.vrng.range(12, 19) * scale * dk;
      smoke.spawn(now, {
        pos: _v, vel: _v2, acc: _v3,
        life: ctx.vrng.range(1.6, 3.4),
        size0: 5 * scale * dk, size1: s1,
        alpha: 0.66,
        col0: 0x695140, col1: 0x38332d,
        delay: ctx.vrng.range(0.1, 0.35),
        rot: ctx.vrng.range(-0.7, 0.7),
        rotVel: ctx.vrng.range(-1.6, 1.6),
        wob: s1 * 0.04,
      });
    }
    // lingering dark smoke blot — lumpy cauliflower cloud that drifts downwind.
    // Two tones + wobble keep the interior boiling instead of flattening.
    const nBlot = qn(big ? (highAlt ? 30 : 25) : 10);
    const spread = (14 + dk * 15) * scale;
    // clamp the gaussian tail: a lone far-flung puff reads as a detached ball
    const g17 = () => clamp(ctx.vrng.gauss(), -1.7, 1.7);
    for (let i = 0; i < nBlot; i++) {
      _v.set(pos.x + g17() * spread, pos.y + g17() * spread * 0.85, pos.z + g17() * spread);
      const darker = (i & 1) === 0;
      // born near full size: the cloud forms in the first second, then drifts
      const s1 = ctx.vrng.range(21, 36) * scale * dk;
      smoke.spawn(now, {
        pos: _v,
        vel: { x: ctx.vrng.gauss() * 2 + wind.x * 0.5, y: ctx.vrng.gauss() * 1.4 + 0.5, z: ctx.vrng.gauss() * 2 + wind.z * 0.5 },
        acc: { x: wind.x * 0.2, y: 0.22, z: wind.z * 0.2 },
        life: ctx.vrng.range(highAlt ? 8 : 6, highAlt ? 17 : 12),
        size0: s1 * 0.55, size1: s1,
        alpha: ctx.vrng.range(0.55, 0.78),
        col0: darker ? 0x46403a : 0x5e564e, col1: darker ? 0x2b2825 : 0x37332e,
        colJit: 0.13,
        delay: ctx.vrng.range(0.15, 0.8),
        rot: ctx.vrng.range(-0.7, 0.7),
        rotVel: ctx.vrng.range(-0.4, 0.4),
        wob: s1 * 0.055,
      });
    }
    // smoke ring: a raggy expanding torus survives after the fireball (big only)
    if (big) {
      const nRing = qn(12);
      const tilt = ctx.vrng.range(-0.35, 0.35);
      for (let i = 0; i < nRing; i++) {
        const a = (i / nRing) * TAU + ctx.vrng.range(-0.15, 0.15);
        const ca = Math.cos(a), sa = Math.sin(a);
        _v.set(pos.x + ca * fbR * 0.5, pos.y + sa * fbR * 0.5 * tilt, pos.z + sa * fbR * 0.5);
        const s1 = ctx.vrng.range(10, 16) * scale * dk;
        smoke.spawn(now, {
          pos: _v,
          vel: { x: ca * ctx.vrng.range(7, 11) * scale + wind.x * 0.4, y: sa * tilt * 8 * scale + 0.8, z: sa * ctx.vrng.range(7, 11) * scale + wind.z * 0.4 },
          acc: { x: -ca * 1.1 * scale + wind.x * 0.15, y: 0.15, z: -sa * 1.1 * scale + wind.z * 0.15 },
          life: ctx.vrng.range(4, 8),
          size0: s1 * 0.4, size1: s1,
          alpha: ctx.vrng.range(0.4, 0.55),
          col0: 0x57504a, col1: 0x322f2b,
          delay: ctx.vrng.range(0.25, 0.6),
          rot: ctx.vrng.range(-0.7, 0.7),
          wob: s1 * 0.04,
        });
      }
    }
    // spark streaks: velocity-stretched, arc under gravity, fade out
    const nSpark = qn(Math.round((big ? 62 : 30) * Math.min(scale, 1.5)));
    for (let i = 0; i < nSpark; i++) {
      _v2.set(ctx.vrng.gauss(), ctx.vrng.gauss(), ctx.vrng.gauss()).normalize().multiplyScalar(ctx.vrng.range(34, 105) * scale);
      _v3.set(-_v2.x * 0.55, -_v2.y * 0.55 - 30, -_v2.z * 0.55);
      streaks.spawn(now, {
        pos, vel: _v2, acc: _v3,
        life: ctx.vrng.range(0.5, big ? 1.8 : 1.1),
        width: ctx.vrng.range(0.28, 0.55) * scale,
        len: ctx.vrng.range(5, 14) * scale,
        alpha: 0.95,
        col0: 0xfff2c4, col1: 0xff702a,
      });
    }
    // crackle: delayed micro-flashes popping around the young fireball
    if (big) {
      const nCr = qn(Math.round(7 * Math.min(scale, 1.5)));
      for (let i = 0; i < nCr; i++) {
        _v.set(pos.x + ctx.vrng.gauss() * fbSpread * 1.6, pos.y + ctx.vrng.gauss() * fbSpread * 1.6, pos.z + ctx.vrng.gauss() * fbSpread * 1.6);
        fire.spawn(now, {
          pos: _v,
          vel: { x: ctx.vrng.gauss() * 4, y: ctx.vrng.gauss() * 4, z: ctx.vrng.gauss() * 4 },
          life: ctx.vrng.range(0.08, 0.16),
          size0: 2.6 * scale * dk, size1: 1.2 * scale * dk,
          alpha: 0.95,
          col0: 0xffffff, col1: 0xffc060,
          delay: ctx.vrng.range(0.12, 0.7),
        });
      }
    }
    // a few slow glowing embers sinking out of the fireball
    const nEmber = qn(Math.round(10 * Math.min(scale, 1.5)));
    for (let i = 0; i < nEmber; i++) {
      fire.spawn(now, {
        pos,
        vel: _v2.set(ctx.vrng.gauss() * 7, ctx.vrng.gauss() * 5 - 3, ctx.vrng.gauss() * 7),
        acc: { x: 0, y: -9, z: 0 },
        life: ctx.vrng.range(0.9, 2.1),
        size0: 1.4 * scale * dk, size1: 0.4,
        alpha: 0.9,
        col0: 0xffc27a, col1: 0xff3a08,
      });
    }
    // glinting fragments arcing away trailing thin smoke
    if (big) throwDebris(pos, qn(highAlt ? 10 : 13), (highAlt ? 30 : 46) * scale, 1, ctx.vrng.range(1.3, 2.2));
    else throwDebris(pos, qn(5), 30 * scale, 0.8, 0.6);
    shakeFromDistance(pos, 0.5 * scale);
    ctx.events.emit('fx-explosion', { pos: pos.clone(), scale, air: true });
  }

  function explosionGround(pos, scale = 1) {
    const ground = Math.max(terrainHeight(pos.x, pos.z), 0);
    const gpos = _v.set(pos.x, ground + 1.5, pos.z).clone();
    const dks = Math.sqrt(distK(gpos)); // gentler boost: ground has scale references
    const wind = ctx.world.wind;
    // white core + orange halo + low luminous shell — kept small/short so the
    // dirt violence reads AT the impact frame instead of behind a white ball
    flash(gpos, 36 * scale, 0.14, 0xffffff);
    flash(gpos, 27 * scale, 0.45, 0xffa04a);
    _v2.set(gpos.x, ground + 7 * scale, gpos.z);
    shockSphere(_v2, 40 * scale * dks, 0.55, 0xffddb0);
    // night: throw real light across the terrain — a ground burst should paint
    // the midground, not just the crater lip
    lightPulse(_v2.set(gpos.x, ground + 14 * scale, gpos.z), 150000 * scale * scale, 1400 + 1300 * scale, 2.2, 0xffa050);

    // boiling core hugging the ground
    fireballAt(_v2.set(gpos.x, ground + 5.5 * scale * dks, gpos.z), (6.5 + 5.5 * scale) * dks, 0.85 + 0.35 * scale, 1.1);

    // fire column
    const nFire = qn(Math.round(34 * Math.min(scale, 1.7)));
    for (let i = 0; i < nFire; i++) {
      _v.set(gpos.x + ctx.vrng.gauss() * 8 * scale, ground + ctx.vrng.range(0.5, 7) * scale, gpos.z + ctx.vrng.gauss() * 8 * scale);
      fire.spawn(now, {
        pos: _v,
        vel: _v2.set(ctx.vrng.gauss() * 9, ctx.vrng.range(14, 46), ctx.vrng.gauss() * 9).multiplyScalar(scale),
        acc: { x: 0, y: -7, z: 0 },
        life: ctx.vrng.range(0.45, 1.5),
        size0: 7 * scale * dks, size1: 22 * scale * dks,
        alpha: 0.95,
        col0: 0xffedc0, col1: 0xd94f16,
        delay: ctx.vrng.range(0, 0.1),
        rotVel: ctx.vrng.range(-3, 3),
      });
    }
    // spark fountain
    const nSpark = qn(Math.round(60 * Math.min(scale, 1.6)));
    for (let i = 0; i < nSpark; i++) {
      _v2.set(ctx.vrng.gauss() * 26, ctx.vrng.range(28, 95), ctx.vrng.gauss() * 26).multiplyScalar(scale);
      _v3.set(-_v2.x * 0.4, -38, -_v2.z * 0.4);
      streaks.spawn(now, {
        pos: gpos, vel: _v2, acc: _v3,
        life: ctx.vrng.range(0.7, 2.2),
        width: ctx.vrng.range(0.3, 0.6) * scale,
        len: ctx.vrng.range(8, 18) * scale,
        alpha: 0.95,
        col0: 0xfff2c4, col1: 0xff702a,
      });
    }
    // instantaneous dirt spray: fast sandy streaks whipping out of the crater
    // in the first frames — the violence signature before the fountain reads.
    // Wide horizontal throw so the spray extends past the flash sprite radius.
    const nSpray = qn(Math.round(30 * Math.min(scale, 1.7)));
    for (let i = 0; i < nSpray; i++) {
      _v2.set(ctx.vrng.gauss() * 44, ctx.vrng.range(42, 110), ctx.vrng.gauss() * 44).multiplyScalar(scale);
      streaks.spawn(now, {
        pos: gpos, vel: _v2, acc: { x: -_v2.x * 0.5, y: -95, z: -_v2.z * 0.5 },
        life: ctx.vrng.range(0.28, 0.7),
        width: ctx.vrng.range(0.55, 1.0) * scale,
        len: ctx.vrng.range(7, 16) * scale,
        alpha: 0.95,
        col0: 0xe8d3a8, col1: 0x8f7648,
      });
    }
    // instant dark clods: chunky near-black puffs hurled through the flash at
    // frame 0 — their silhouettes against the glare sell "earth got thrown"
    const nClod = qn(Math.round(10 * Math.min(scale, 1.7)));
    for (let i = 0; i < nClod; i++) {
      _v2.set(ctx.vrng.gauss() * 26, ctx.vrng.range(30, 78), ctx.vrng.gauss() * 26).multiplyScalar(scale);
      smoke.spawn(now, {
        pos: gpos, vel: _v2, acc: { x: -_v2.x * 0.4, y: -70, z: -_v2.z * 0.4 },
        life: ctx.vrng.range(0.5, 1.1),
        size0: ctx.vrng.range(2, 4) * scale * dks, size1: ctx.vrng.range(4, 7) * scale * dks,
        alpha: 0.95,
        col0: 0x2e2820, col1: 0x1c1915,
        colJit: 0.15,
        rotVel: ctx.vrng.range(-3, 3),
      });
    }
    // dirt ejecta: dark soil fountain in a tight cone — the "ground got hit"
    // signature. Falls back down under strong gravity as the column builds.
    const nDirt = qn(Math.round(38 * Math.min(scale, 1.7)));
    for (let i = 0; i < nDirt; i++) {
      _v.set(gpos.x + ctx.vrng.gauss() * 3.5 * scale, ground + ctx.vrng.range(0.5, 3), gpos.z + ctx.vrng.gauss() * 3.5 * scale);
      const s1 = ctx.vrng.range(6, 14) * scale * dks;
      smoke.spawn(now, {
        pos: _v,
        vel: { x: ctx.vrng.gauss() * 13 * scale, y: ctx.vrng.range(28, 74) * scale, z: ctx.vrng.gauss() * 13 * scale },
        acc: { x: 0, y: -27, z: 0 },
        life: ctx.vrng.range(1.6, 3.4),
        size0: 2.5 * scale * dks, size1: s1,
        alpha: ctx.vrng.range(0.8, 0.95),
        col0: 0x51452f, col1: 0x39311f,
        delay: ctx.vrng.range(0, 0.12),
        rot: ctx.vrng.range(-0.6, 0.6),
        rotVel: ctx.vrng.range(-1, 1),
      });
    }
    // wide 45° dirt splash: the V-shaped crown around the fountain
    const nSplash = qn(Math.round(14 * Math.min(scale, 1.7)));
    for (let i = 0; i < nSplash; i++) {
      const a = (i / nSplash) * TAU + ctx.vrng.range(-0.2, 0.2);
      _v.set(gpos.x + Math.cos(a) * 2 * scale, ground + 1, gpos.z + Math.sin(a) * 2 * scale);
      const sp = ctx.vrng.range(24, 44) * scale;
      smoke.spawn(now, {
        pos: _v,
        vel: { x: Math.cos(a) * sp, y: ctx.vrng.range(26, 44) * scale, z: Math.sin(a) * sp },
        acc: { x: 0, y: -26, z: 0 },
        life: ctx.vrng.range(1.6, 3.0),
        size0: 2 * scale * dks, size1: ctx.vrng.range(6, 11) * scale * dks,
        alpha: ctx.vrng.range(0.75, 0.9),
        col0: 0x5c4e36, col1: 0x413826,
        delay: ctx.vrng.range(0, 0.1),
        rot: ctx.vrng.range(-0.6, 0.6),
      });
    }
    // bright core mass at the base (normal blend — reads on bright desert);
    // bridges the fireball into the dark column without hiding the dirt
    const nCore = qn(Math.round(12 * Math.min(scale, 1.7)));
    for (let i = 0; i < nCore; i++) {
      _v.set(gpos.x + ctx.vrng.gauss() * 5 * scale, ground + ctx.vrng.range(1, 6) * scale, gpos.z + ctx.vrng.gauss() * 5 * scale);
      _v2.set(ctx.vrng.gauss() * 6, ctx.vrng.range(7, 18), ctx.vrng.gauss() * 6).multiplyScalar(scale);
      _v3.copy(_v2).multiplyScalar(-0.55);
      smoke.spawn(now, {
        pos: _v, vel: _v2, acc: _v3,
        life: ctx.vrng.range(0.7, 1.6),
        size0: 7 * scale * dks, size1: 17 * scale * dks,
        alpha: 0.7,
        col0: 0xffe9c4, col1: 0x8d7c64,
        rot: ctx.vrng.range(-0.7, 0.7),
        rotVel: ctx.vrng.range(-2.5, 2.5),
      });
    }
    // tall dark smoke column: staggered, slow, long-lived, leaning downwind.
    // Wind acceleration grows with spawn height so the top shears over.
    // Tight radial spread + high alpha keeps it a connected mass, not blobs.
    const nCol = qn(Math.round(78 * Math.min(scale, 1.7)));
    for (let i = 0; i < nCol; i++) {
      const h = ctx.vrng.range(1, 18) * scale;
      const hf = h / (18 * scale); // 0 at base .. 1 at top
      const hK = 0.35 + hf * 1.1; // wind bites harder up high
      _v.set(gpos.x + ctx.vrng.gauss() * (4 + h * 0.8) * scale, ground + h, gpos.z + ctx.vrng.gauss() * (4 + h * 0.8) * scale);
      const darker = (i % 3) === 0;
      // tapered: bigger, looser puffs toward the top so the column widens as
      // it rises instead of reading as a stack of equal balls
      const s1 = ctx.vrng.range(20, 42) * (0.8 + hf * 0.7) * scale * dks;
      // low-end vel.y of ~4 keeps some smoke anchored at the base so the
      // column stays connected to the ground instead of lifting off as a ball
      smoke.spawn(now, {
        pos: _v,
        vel: { x: ctx.vrng.gauss() * (2 + hf * 2.5) + wind.x * 0.35 * hK, y: ctx.vrng.range(4, 30) * scale, z: ctx.vrng.gauss() * (2 + hf * 2.5) + wind.z * 0.35 * hK },
        acc: { x: wind.x * 0.38 * hK, y: -0.8, z: wind.z * 0.38 * hK },
        life: ctx.vrng.range(8, 18),
        size0: s1 * 0.5, size1: s1,
        alpha: ctx.vrng.range(0.58, 0.8),
        col0: darker ? 0x332e29 : 0x4a4239, col1: darker ? 0x1f1d1c : 0x2b2825,
        colJit: 0.14,
        delay: ctx.vrng.range(0, 2.6),
        rot: ctx.vrng.range(-0.6, 0.6),
        rotVel: ctx.vrng.range(-0.7, 0.7),
        wob: s1 * 0.06,
      });
    }
    // base anchors: a handful of near-static fat puffs at the crater so the
    // column stays rooted to the ground for its whole life instead of the
    // tail lifting off after ~8 s
    const nAnchor = qn(Math.round(7 * Math.min(scale, 1.7)));
    for (let i = 0; i < nAnchor; i++) {
      _v.set(gpos.x + ctx.vrng.gauss() * 5 * scale, ground + ctx.vrng.range(1.5, 7) * scale, gpos.z + ctx.vrng.gauss() * 5 * scale);
      const s1 = ctx.vrng.range(22, 34) * scale * dks;
      smoke.spawn(now, {
        pos: _v,
        vel: { x: ctx.vrng.gauss() * 0.8 + wind.x * 0.12, y: ctx.vrng.range(0.5, 2), z: ctx.vrng.gauss() * 0.8 + wind.z * 0.12 },
        acc: { x: wind.x * 0.08, y: -0.05, z: wind.z * 0.08 },
        life: ctx.vrng.range(12, 20),
        size0: s1 * 0.55, size1: s1,
        alpha: ctx.vrng.range(0.45, 0.6),
        col0: 0x453d33, col1: 0x2a2723,
        colJit: 0.12,
        delay: ctx.vrng.range(0.4, 1.6),
        rot: ctx.vrng.range(-0.4, 0.4),
        rotVel: ctx.vrng.range(-0.2, 0.2),
        wob: s1 * 0.03,
      });
    }
    // mushroom cap: late wide puffs that bloom where the column tops out
    const nCap = qn(Math.round(14 * Math.min(scale, 1.7)));
    for (let i = 0; i < nCap; i++) {
      _v.set(gpos.x + ctx.vrng.gauss() * 18 * scale, ground + ctx.vrng.range(30, 54) * scale, gpos.z + ctx.vrng.gauss() * 18 * scale);
      const s1 = ctx.vrng.range(26, 42) * scale * dks;
      smoke.spawn(now, {
        pos: _v,
        vel: { x: ctx.vrng.gauss() * 3.5 + wind.x * 0.55, y: ctx.vrng.range(1.5, 4.5), z: ctx.vrng.gauss() * 3.5 + wind.z * 0.55 },
        acc: { x: wind.x * 0.22, y: -0.12, z: wind.z * 0.22 },
        life: ctx.vrng.range(8, 16),
        size0: 9 * scale * dks, size1: s1,
        alpha: ctx.vrng.range(0.42, 0.58),
        col0: 0x4c443b, col1: 0x2e2b28,
        colJit: 0.12,
        delay: ctx.vrng.range(1.2, 3.0),
        rot: ctx.vrng.range(-0.5, 0.5),
        rotVel: ctx.vrng.range(-0.3, 0.3),
        wob: s1 * 0.05,
      });
    }
    // hot interior glow lighting the young column from inside
    const nGlow = qn(Math.round(10 * Math.min(scale, 1.6)));
    for (let i = 0; i < nGlow; i++) {
      _v.set(gpos.x + ctx.vrng.gauss() * 2 * scale, ground + ctx.vrng.range(1, 6) * scale, gpos.z + ctx.vrng.gauss() * 2 * scale);
      fire.spawn(now, {
        pos: _v,
        vel: { x: 0, y: ctx.vrng.range(4, 9) * scale, z: 0 },
        life: ctx.vrng.range(0.7, 1.5),
        size0: 6 * scale * dks, size1: 12 * scale * dks,
        alpha: 0.35,
        col0: 0xff8434, col1: 0x922e08,
        delay: 0.15,
      });
    }
    // lingering crater embers: small deep-orange motes that outlive the fire
    // phase and ride up inside the young column — at night these keep the
    // column readable after the flash dies instead of dark-on-dark
    const nEmber = qn(Math.round(14 * Math.min(scale, 1.6)));
    for (let i = 0; i < nEmber; i++) {
      _v.set(gpos.x + ctx.vrng.gauss() * 4 * scale, ground + ctx.vrng.range(0.5, 5) * scale, gpos.z + ctx.vrng.gauss() * 4 * scale);
      fire.spawn(now, {
        pos: _v,
        vel: { x: ctx.vrng.gauss() * 1.5 + wind.x * 0.15, y: ctx.vrng.range(2.5, 7.5), z: ctx.vrng.gauss() * 1.5 + wind.z * 0.15 },
        acc: { x: wind.x * 0.1, y: -0.4, z: wind.z * 0.1 },
        life: ctx.vrng.range(2.0, 4.5),
        size0: ctx.vrng.range(1.2, 2.4) * scale * dks, size1: ctx.vrng.range(2.5, 4.5) * scale * dks,
        alpha: 0.55,
        col0: 0xff7c2e, col1: 0x5a1404,
        delay: ctx.vrng.range(0.3, 1.4),
        rotVel: ctx.vrng.range(-1, 1),
      });
    }
    // fast shock skirt: thin dust flashing outward in the first half second
    const nShockDust = qn(Math.round(24 * Math.min(scale, 1.7)));
    for (let i = 0; i < nShockDust; i++) {
      const a = (i / nShockDust) * TAU + ctx.vrng.range(-0.1, 0.1);
      _v.set(gpos.x + Math.cos(a) * 4 * scale, ground + ctx.vrng.range(0.4, 1.6), gpos.z + Math.sin(a) * 4 * scale);
      smoke.spawn(now, {
        pos: _v,
        vel: { x: Math.cos(a) * ctx.vrng.range(55, 85) * scale, y: ctx.vrng.range(0.5, 2), z: Math.sin(a) * ctx.vrng.range(55, 85) * scale },
        acc: { x: -Math.cos(a) * 38 * scale, y: -0.8, z: -Math.sin(a) * 38 * scale },
        life: ctx.vrng.range(0.9, 1.6),
        size0: 3 * scale * dks, size1: ctx.vrng.range(10, 16) * scale * dks,
        alpha: 0.5,
        col0: 0xcbb590, col1: 0x8d7c5e,
        rot: ctx.vrng.range(-0.5, 0.5),
      });
    }
    // radial dust skirt: hugs the ground, rolls outward, lingers. Sandy desert
    // tones with height jitter so it reads as churned dust, not a dark band.
    const nSkirt = qn(Math.round(52 * Math.min(scale, 1.7)));
    for (let i = 0; i < nSkirt; i++) {
      const a = (i / nSkirt) * TAU + ctx.vrng.range(-0.1, 0.1);
      _v.set(gpos.x + Math.cos(a) * 3 * scale, ground + ctx.vrng.range(0.5, 3.5), gpos.z + Math.sin(a) * 3 * scale);
      const s1 = ctx.vrng.range(17, 28) * scale * dks;
      smoke.spawn(now, {
        pos: _v,
        vel: { x: Math.cos(a) * ctx.vrng.range(16, 38) * scale, y: ctx.vrng.range(0.6, 3.2), z: Math.sin(a) * ctx.vrng.range(16, 38) * scale },
        acc: { x: -Math.cos(a) * 2.4 * scale, y: -0.9, z: -Math.sin(a) * 2.4 * scale },
        life: ctx.vrng.range(6, 12),
        size0: 4.5 * scale * dks, size1: s1,
        alpha: ctx.vrng.range(0.52, 0.7),
        col0: 0xb59a6a, col1: 0x60533f,
        colJit: 0.1,
        delay: ctx.vrng.range(0, 0.15),
        rot: ctx.vrng.range(-0.5, 0.5),
        rotVel: ctx.vrng.range(-0.6, 0.6),
        wob: s1 * 0.035,
      });
    }
    // settled haze: after the skirt rolls out, churned dust should HANG — a
    // low dirty band drifting downwind for 15+ seconds, not vanish at 8 s
    const nHaze = qn(Math.round(16 * Math.min(scale, 1.7)));
    for (let i = 0; i < nHaze; i++) {
      const a = (i / nHaze) * TAU + ctx.vrng.range(-0.3, 0.3);
      const rr = ctx.vrng.range(8, 30) * scale;
      _v.set(gpos.x + Math.cos(a) * rr, ground + ctx.vrng.range(1, 5), gpos.z + Math.sin(a) * rr);
      const s1 = ctx.vrng.range(26, 44) * scale * dks;
      smoke.spawn(now, {
        pos: _v,
        vel: { x: Math.cos(a) * 2.2 + wind.x * 0.5, y: ctx.vrng.range(0.2, 1.1), z: Math.sin(a) * 2.2 + wind.z * 0.5 },
        acc: { x: wind.x * 0.14, y: -0.06, z: wind.z * 0.14 },
        life: ctx.vrng.range(11, 20),
        size0: s1 * 0.45, size1: s1,
        alpha: ctx.vrng.range(0.3, 0.44),
        col0: 0xa89272, col1: 0x5c503c,
        colJit: 0.1,
        delay: ctx.vrng.range(1.5, 4),
        rot: ctx.vrng.range(-0.4, 0.4),
        rotVel: ctx.vrng.range(-0.25, 0.25),
        wob: s1 * 0.03,
      });
    }
    throwDebris(gpos, qn(Math.round(26 * scale)), 62 * scale, 1, 1.2);
    ring(gpos, 62 * scale, 0.8);
    ring(gpos, 100 * scale, 1.7, 0xd9c09a);
    scorchAt(gpos, 22 * scale);
    shakeFromDistance(gpos, 0.8 * scale);
    ctx.events.emit('fx-explosion', { pos: gpos.clone(), scale, air: false });
  }

  function coverPop(pos, dir) {
    for (let i = 0; i < 6; i++) {
      fire.spawn(now, {
        pos,
        vel: _v2.copy(dir).multiplyScalar(20).add(_v.set(ctx.vrng.gauss() * 5, ctx.vrng.gauss() * 5, ctx.vrng.gauss() * 5)),
        life: 0.4,
        size0: 1.5, size1: 0.4,
        alpha: 0.9,
        col0: 0xffd9a0, col1: 0xff8830,
      });
    }
    for (let i = 0; i < 5; i++) {
      _v2.copy(dir).multiplyScalar(ctx.vrng.range(16, 30)).add(_v.set(ctx.vrng.gauss() * 6, ctx.vrng.gauss() * 6, ctx.vrng.gauss() * 6));
      streaks.spawn(now, {
        pos, vel: _v2, acc: { x: 0, y: -14, z: 0 },
        life: ctx.vrng.range(0.25, 0.5),
        width: 0.25, len: 3.5,
        alpha: 0.85,
        col0: 0xffe9bc, col1: 0xff8830,
      });
    }
    throwDebris(pos, 2, 16, 0);
  }

  function muzzlePuff(pos, scale = 1) {
    for (let i = 0; i < 8; i++) {
      smoke.spawn(now, {
        pos,
        vel: { x: ctx.vrng.gauss() * 3, y: ctx.vrng.range(0.8, 2.6), z: ctx.vrng.gauss() * 3 },
        acc: { x: ctx.world.wind.x * 0.2, y: 0.3, z: ctx.world.wind.z * 0.2 },
        life: ctx.vrng.range(1.2, 3),
        size0: 1.4 * scale, size1: 6.5 * scale,
        alpha: 0.35,
        col0: 0xd6cfc3, col1: 0x8e887e,
        rot: ctx.vrng.range(-0.6, 0.6),
        rotVel: ctx.vrng.range(-1, 1),
        wob: 0.3 * scale,
      });
    }
  }

  const api = {
    acquireTrail(cfg) {
      const t = trailPool.acquire();
      if (!t) return null;
      t.reset();
      t.configure(cfg);
      t.uniforms.uTime.value = now;
      return t;
    },
    releaseTrail(t) {
      if (!t) return;
      // let it fade naturally: keep visible until fully faded, then reset
      fadingTrails.push({ t, until: now + t.uniforms.uLife.value + 0.5 });
    },
    launchBlast, explosionAir, explosionGround, coverPop, muzzlePuff,
    flash, ring, scorchAt, throwDebris,
    update(dt, tNow) {
      now = tNow;
      for (const tr of trailPool.used) tr.uniforms.uTime.value = now;
      for (const tr of trailPool.free) tr.uniforms.uTime.value = now;
      // fading trail reclamation
      for (let i = fadingTrails.length - 1; i >= 0; i--) {
        if (fadingTrails[i].until <= now) {
          const { t } = fadingTrails[i];
          t.reset();
          trailPool.release(t);
          fadingTrails.splice(i, 1);
        }
      }
      // wind + lighting tint uniforms
      const tint = ctx.world.trailTint;
      smoke.uniforms.uTint.value.copy(tint ?? WHITE);
      for (const tr of trailPool.used) {
        tr.uniforms.uWind.value.copy(ctx.world.wind);
        if (tint) tr.uniforms.uTint.value.copy(tint);
      }

      // flashes
      for (let i = activeFlashes.length - 1; i >= 0; i--) {
        const f = activeFlashes[i];
        f.t += dt;
        const k = f.t / f.dur;
        if (k >= 1) {
          f.sprite.visible = false;
          f.active = false;
          activeFlashes.splice(i, 1);
          flashPool.release(f);
          continue;
        }
        f.sprite.scale.setScalar(f.size * (0.4 + k * 0.9));
        f.sprite.material.opacity = Math.pow(1 - k, 1.6);
      }
      // luminous blast shells
      for (let i = activeShocks.length - 1; i >= 0; i--) {
        const s = activeShocks[i];
        s.t += dt;
        const k = s.t / s.dur;
        if (k >= 1) {
          s.sprite.visible = false;
          s.active = false;
          activeShocks.splice(i, 1);
          shockPool.release(s);
          continue;
        }
        const e = easeOutCubic(k);
        const D = Math.max(s.maxR * e, 1.2) * 2.8;
        s.sprite.scale.set(D, D * (s.aspect ?? 1), 1);
        s.sprite.material.opacity = 0.9 * Math.pow(1 - k, 1.6);
      }
      // fireball cores: fast expansion easing into a slow boil, then dissolve
      for (const fb of fireballs) {
        if (!fb.active) continue;
        fb.t += dt;
        const k = fb.t / fb.dur;
        if (k >= 1) {
          fb.active = false;
          fb.mesh.visible = false;
          continue;
        }
        const grow = 1 - Math.pow(1 - Math.min(k * 1.45, 1), 3);
        fb.uniforms.uT.value = k;
        fb.uniforms.uR.value = fb.maxR * (0.3 + 0.7 * grow) * (1 + 0.22 * k);
      }
      // light pulses: sharp attack, exponential decay
      for (const lp of lightPulses) {
        if (!lp.active) continue;
        lp.t += dt;
        const k = lp.t / lp.dur;
        if (k >= 1) {
          lp.active = false;
          lp.light.intensity = 0;
          continue;
        }
        const env = k < 0.06 ? k / 0.06 : Math.pow(1 - (k - 0.06) / 0.94, 2.2);
        lp.light.intensity = lp.peak * env;
      }
      // rings
      for (let i = activeRings.length - 1; i >= 0; i--) {
        const r = activeRings[i];
        r.t += dt;
        const k = r.t / r.dur;
        if (k >= 1) {
          r.mesh.visible = false;
          r.active = false;
          activeRings.splice(i, 1);
          ringPool.release(r);
          continue;
        }
        r.mesh.scale.setScalar(0.5 + easeOutCubic(k) * r.maxR);
        r.mesh.material.opacity = 0.4 * Math.pow(1 - k, 1.7);
      }
      // scorches
      for (let i = activeScorches.length - 1; i >= 0; i--) {
        const s = activeScorches[i];
        s.age += dt;
        if (s.age > 70) {
          s.mesh.visible = false;
          s.active = false;
          activeScorches.splice(i, 1);
          scorchPool.release(s);
          continue;
        }
        if (s.age > 50) s.mesh.material.opacity = 0.85 * (1 - (s.age - 50) / 20);
      }
      // debris (fresh-blast glow cools over ~1.5 s)
      debrisHeat = Math.max(0, debrisHeat - dt * 0.7);
      debrisMat.emissiveIntensity = 2.4 * debrisHeat;
      for (let i = 0; i < DEBRIS_N; i++) {
        const d = debris[i];
        if (!d.alive) {
          _m4.compose(d.pos, _q4.identity(), ZERO_SCALE);
          debrisMesh.setMatrixAt(i, _m4);
          continue;
        }
        d.age += dt;
        d.vel.y -= 22 * dt;
        d.pos.addScaledVector(d.vel, dt);
        d.rot.x += d.angVel.x * dt;
        d.rot.y += d.angVel.y * dt;
        d.rot.z += d.angVel.z * dt;
        // short smoke trail + hot glint while the fragment is fresh
        if (d.trailT > 0 && d.age < d.trailT) {
          d.trailAcc += dt;
          if (d.trailAcc > 0.07) {
            d.trailAcc = 0;
            smoke.spawn(now, {
              pos: d.pos,
              vel: { x: ctx.vrng.gauss() * 0.7, y: ctx.vrng.range(0.2, 0.9), z: ctx.vrng.gauss() * 0.7 },
              acc: { x: ctx.world.wind.x * 0.15, y: 0.35, z: ctx.world.wind.z * 0.15 },
              life: ctx.vrng.range(0.8, 1.7),
              size0: (0.9 * d.scale + 0.4) * d.sizeK, size1: 4.5 * d.sizeK,
              alpha: 0.32,
              col0: 0x9a938a, col1: 0x565049,
              rot: ctx.vrng.range(-0.6, 0.6),
              rotVel: ctx.vrng.range(-1, 1),
            });
            if (d.glow > 0.5) {
              fire.spawn(now, {
                pos: d.pos,
                life: 0.22,
                size0: 1.8 * d.sizeK, size1: 0.5,
                alpha: 0.9,
                col0: 0xffd9a0, col1: 0xff5a14,
              });
            }
          }
        }
        const gh = Math.max(terrainHeight(d.pos.x, d.pos.z), 0);
        if (d.pos.y < gh + 0.2) {
          d.pos.y = gh + 0.2;
          if (Math.abs(d.vel.y) > 4) {
            d.vel.y *= -0.32;
            d.vel.x *= 0.55;
            d.vel.z *= 0.55;
          } else {
            d.vel.set(0, 0, 0);
            d.angVel.multiplyScalar(0.8);
          }
        }
        if (d.age > d.life) d.alive = false;
        const sc = d.scale * clamp(1 - Math.max(0, d.age - d.life + 0.5) * 2, 0.001, 1);
        _q4.setFromEuler(d.rot);
        _m4.compose(d.pos, _q4, _s3.setScalar(sc));
        debrisMesh.setMatrixAt(i, _m4);
      }
      debrisMesh.instanceMatrix.needsUpdate = true;
      debrisMesh.count = DEBRIS_N;

      // commit last so same-substep spawns (incl. debris trails) upload together
      smoke.setTime(now);
      fire.setTime(now);
      streaks.setTime(now);
      smoke.commit();
      fire.commit();
      streaks.commit();
    },
    setViewport(h, fov) {
      smoke.setViewport(h, fov);
      fire.setViewport(h, fov);
      streaks.setViewport(h, fov);
    },
    clearAll() {
      for (const f of [...activeFlashes]) { f.sprite.visible = false; flashPool.release(f); }
      activeFlashes.length = 0;
      for (const s of [...activeShocks]) { s.sprite.visible = false; shockPool.release(s); }
      activeShocks.length = 0;
      for (const r of [...activeRings]) { r.mesh.visible = false; ringPool.release(r); }
      activeRings.length = 0;
      for (const d of debris) d.alive = false;
      for (const fb of fireballs) { fb.active = false; fb.mesh.visible = false; }
      for (const lp of lightPulses) { lp.active = false; lp.light.intensity = 0; }
      debrisHeat = 0;
      for (const { t } of fadingTrails) { t.reset(); trailPool.release(t); }
      fadingTrails.length = 0;
      smoke.parkAll();
      fire.parkAll();
      streaks.parkAll();
    },
  };
  const fadingTrails = [];
  return api;
}
