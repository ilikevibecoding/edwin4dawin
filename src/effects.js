// effects.js — pooled GPU particles, ribbon trails, velocity-stretched spark
// streaks, flashes, debris (with smoke trails + glints), shockwave rings,
// luminous blast shells, scorch decals, and composite effects (launch blasts,
// air intercepts, ground impacts).
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
attribute vec3 aCol0;
attribute vec3 aCol1;
uniform float uTime;
uniform float uScale;
varying float vAlpha;
varying vec3 vCol;
varying float vRot;
void main() {
  float age = uTime - aBirth;
  float t = age / max(aLife, 0.0001);
  if (t < 0.0 || t > 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    vCol = vec3(0.0);
    vRot = 0.0;
    return;
  }
  vec3 pos = position + aVel * age + 0.5 * aAcc * age * age;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float size = mix(aSize0, aSize1, pow(t, 0.65));
  gl_PointSize = clamp(size * uScale / max(-mv.z, 0.5), 0.75, 300.0);
  float fadeIn = smoothstep(0.0, 0.07, t);
  float fadeOut = 1.0 - smoothstep(0.55, 1.0, t);
  // fade puffs that drift right up to the camera so they never become
  // screen-filling blobs (drifting launch smoke passing over the player)
  float nearFade = smoothstep(2.5, 18.0, -mv.z);
  vAlpha = aAlpha * fadeIn * fadeOut * nearFade;
  vCol = mix(aCol0, aCol1, pow(t, 0.55));
  vRot = aRot + age * aRotVel;
  gl_Position = projectionMatrix * mv;
}
`;
const PARTICLE_FRAG = /* glsl */ `
precision mediump float;
uniform sampler2D uMap;
uniform vec3 uTint;
varying float vAlpha;
varying vec3 vCol;
varying float vRot;
void main() {
  float cs = cos(vRot), sn = sin(vRot);
  vec2 pc = gl_PointCoord - 0.5;
  vec2 uv = vec2(pc.x * cs - pc.y * sn, pc.x * sn + pc.y * cs) + 0.5;
  vec4 tex = texture2D(uMap, uv);
  float a = tex.a * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vCol * tex.rgb * uTint, a);
}
`;

class ParticleSystem {
  constructor(scene, map, capacity, additive) {
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
      aAlpha: mk(1), aRot: mk(1), aRotVel: mk(1), aCol0: mk(3), aCol1: mk(3),
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
  /** spawn one particle; p = {pos, vel, acc, life, size0, size1, alpha, col0, col1, rot, rotVel, delay} */
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
    this._c0.set(p.col0 ?? 0xffffff);
    this._c1.set(p.col1 ?? p.col0 ?? 0xffffff);
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
precision mediump float;
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
uniform float uTime;
uniform float uLife;
uniform vec3 uWind;
varying float vT;
varying float vU;
varying float vFade;
varying float vSeed;
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
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;
const TRAIL_FRAG = /* glsl */ `
precision mediump float;
uniform vec3 uColor;
uniform float uOpacity;
uniform vec3 uTint;
uniform float uEmissive;
uniform sampler2D uNoise;
varying float vT;
varying float vU;
varying float vFade;
varying float vSeed;
void main() {
  float edge = 1.0 - abs(vU * 2.0 - 1.0);
  edge = pow(edge, 1.4);
  float fade = pow(1.0 - vT, 1.15);
  float n = texture2D(uNoise, vec2(vSeed * 8.0 + vT * 2.0, vU * 0.8 + vSeed)).r;
  float a = edge * fade * uOpacity * vFade * (0.45 + 0.55 * n);
  // lit smoke goes dim under dark skies (night) so ribbons don't read as
  // bright tubes; emissive trails (plasma, exhaust glow) keep their alpha
  float tl = dot(uTint, vec3(0.299, 0.587, 0.114));
  a *= mix(mix(0.5, 1.0, smoothstep(0.05, 0.85, tl)), 1.0, uEmissive);
  if (a < 0.004) discard;
  // smoke is lit by the environment (uTint); emissive trails ignore it
  vec3 col = uColor * mix(uTint, vec3(1.0), uEmissive);
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
      uWind: { value: new THREE.Vector3() },
      uColor: { value: new THREE.Color(0xffffff) },
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
  }
  configure({ color = 0xffffff, life = 10, opacity = 0.7, emissive = 0.1 }) {
    this.uniforms.uColor.value.set(color);
    this.uniforms.uLife.value = life;
    this.uniforms.uOpacity.value = opacity;
    this.uniforms.uEmissive.value = emissive;
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
  emit(pos, width, fade = 1) {
    const now = this.uniforms.uTime.value;
    if (!this.hasPrev) {
      this.hasPrev = true;
      this.prev.copy(pos);
      this.prevBirth = now;
      this.prevWidth = width;
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
    }
    for (let k = 2; k < 4; k++) {
      this.aPos.setXYZ(v + k, this.prev.x, this.prev.y, this.prev.z);
      this.aOther.setXYZ(v + k, pos.x, pos.y, pos.z);
      this.aDirSign.setX(v + k, 1);
      this.aBirth.setX(v + k, this.prevBirth);
      this.aOtherBirth.setX(v + k, now);
      this.aWidth.setX(v + k, this.prevWidth);
      this.aFade.setX(v + k, fade);
    }
    this.aSide.setX(v, -1); this.aSide.setX(v + 1, 1);
    this.aSide.setX(v + 2, -1); this.aSide.setX(v + 3, 1);
    for (const a of [this.aPos, this.aOther, this.aSide, this.aDirSign, this.aBirth, this.aOtherBirth, this.aWidth, this.aFade]) {
      a.needsUpdate = true;
    }
    this.prev.copy(pos);
    this.prevBirth = now;
    this.prevWidth = width;
  }
}

// ============================================================ local sprite textures
// (effect-private, procedural — shared canvas textures live in textures.js)
function makeShellTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.0, 'rgba(255,255,255,0.30)');
  grad.addColorStop(0.42, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.62, 'rgba(255,255,255,0.22)');
  grad.addColorStop(0.72, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.82, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// fat-core flare: reads at multi-km ranges where soft flares vanish
function makeBlastFlareTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  let grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.26, 'rgba(255,250,235,0.96)');
  grad.addColorStop(0.48, 'rgba(255,228,175,0.55)');
  grad.addColorStop(0.72, 'rgba(255,190,120,0.18)');
  grad.addColorStop(1.0, 'rgba(255,160,80,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  g.globalCompositeOperation = 'lighter';
  grad = g.createLinearGradient(0, 60, 128, 68);
  grad.addColorStop(0, 'rgba(255,230,180,0)');
  grad.addColorStop(0.5, 'rgba(255,240,210,0.55)');
  grad.addColorStop(1, 'rgba(255,230,180,0)');
  g.fillStyle = grad;
  g.fillRect(0, 56, 128, 16);
  g.fillRect(56, 0, 16, 128);
  return new THREE.CanvasTexture(c);
}

// dense lumpy smoke puff: opaque heart + broken edge (explosion smoke must
// read against bright sky where the shared soft puff washes out)
function makeThickPuffTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const blobs = [
    [64, 64, 46, 0.92], [46, 52, 27, 0.8], [82, 54, 26, 0.8],
    [56, 82, 25, 0.75], [80, 80, 22, 0.7], [64, 42, 22, 0.7], [42, 70, 20, 0.65],
  ];
  for (const [x, y, r, a] of blobs) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255,255,255,${a})`);
    grad.addColorStop(0.55, `rgba(255,255,255,${a * 0.66})`);
    grad.addColorStop(0.85, `rgba(255,255,255,${a * 0.18})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

// lumpy fireball blob with a hot dense core (fire particle sprite)
function makeFireballTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const blobs = [[64, 64, 54, 0.95], [46, 52, 30, 0.7], [82, 56, 30, 0.7], [58, 82, 28, 0.65], [78, 80, 24, 0.6]];
  for (const [x, y, r, a] of blobs) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255,255,255,${a})`);
    grad.addColorStop(0.45, `rgba(255,244,220,${a * 0.75})`);
    grad.addColorStop(0.8, `rgba(255,220,170,${a * 0.22})`);
    grad.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
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

  const smoke = new ParticleSystem(scene, thickPuffTex, 6144, false);
  const fire = new ParticleSystem(scene, fireballTex, 4096, true);
  const streaks = new StreakSystem(scene, 2048);

  const trailPool = new Pool(() => new TrailRibbon(scene, noiseTex), 30);

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
    return { sprite: s, t: 0, dur: 1, maxR: 40, active: false };
  }, 6);
  const activeShocks = [];

  // ---- debris instanced mesh
  const DEBRIS_N = 128;
  const debrisGeo = new THREE.TetrahedronGeometry(0.5);
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
    // keep flashes readable at multi-km engagement distances
    const sizeAdj = size * distK(pos);
    f.sprite.position.copy(pos);
    f.sprite.material.color.set(color);
    f.sprite.material.opacity = 1;
    f.sprite.scale.setScalar(sizeAdj * 0.4);
    f.sprite.visible = true;
    f.t = 0; f.dur = dur; f.size = sizeAdj;
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
    r.mesh.material.opacity = 0.6;
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
    return clamp(0.5 + pos.distanceTo(ctx.camera.position) * 0.0022, 1, 12);
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
  }

  // ============================ composite effects ============================

  function launchBlast(pos, dir, scale = 1) {
    const ground = Math.max(terrainHeight(pos.x, pos.z), 0);
    const k = 0.7 + 0.45 * scale; // particle-count multiplier (Sentinel biggest)

    // canister muzzle flash: hot white core + lingering orange halo
    flash(pos, 30 * scale, 0.18, 0xfff6dc);
    flash(pos, 20 * scale, 0.5, 0xffa64e);
    // radial flare spikes off the muzzle
    const nSpike = Math.round(12 * k);
    for (let i = 0; i < nSpike; i++) {
      _v2.set(ctx.vrng.gauss(), ctx.vrng.gauss() * 0.6, ctx.vrng.gauss()).normalize()
        .multiplyScalar(ctx.vrng.range(26, 58) * scale)
        .addScaledVector(dir, ctx.vrng.range(8, 26) * scale);
      _v3.copy(_v2).multiplyScalar(-2.2);
      streaks.spawn(now, {
        pos, vel: _v2, acc: _v3,
        life: ctx.vrng.range(0.12, 0.3),
        width: ctx.vrng.range(0.3, 0.6) * scale,
        len: ctx.vrng.range(4, 10) * scale,
        alpha: 0.95,
        col0: 0xfff7dd, col1: 0xff9838,
      });
    }
    // sabot / canister-cover fragments tumbling off the muzzle
    throwDebris(_v.copy(pos).addScaledVector(dir, 2.5), 3 + Math.round(2 * scale), 17 * scale, 0.15);

    // exhaust fireball along -dir
    const nFire = Math.round(24 * k);
    for (let i = 0; i < nFire; i++) {
      _v.copy(dir).multiplyScalar(-ctx.vrng.range(3, 26) * scale).add(pos);
      fire.spawn(now, {
        pos: _v,
        vel: _v2.set(ctx.vrng.range(-4, 4), ctx.vrng.range(-2, 5), ctx.vrng.range(-4, 4)).addScaledVector(dir, -ctx.vrng.range(7, 22)),
        acc: { x: 0, y: 4, z: 0 },
        life: ctx.vrng.range(0.25, 0.75),
        size0: 4 * scale, size1: 11 * scale,
        alpha: 0.92,
        col0: 0xfff0c4, col1: 0xff7a2a,
        rotVel: ctx.vrng.range(-4, 4),
      });
    }
    // billowing pad smoke — slow rise, long life, drifts downwind
    const nSmoke = Math.round(42 * k);
    for (let i = 0; i < nSmoke; i++) {
      _v.set(pos.x + ctx.vrng.range(-2.5, 2.5) * scale, ground + ctx.vrng.range(0.4, 4), pos.z + ctx.vrng.range(-2.5, 2.5) * scale);
      const a = ctx.vrng.next() * TAU;
      smoke.spawn(now, {
        pos: _v,
        vel: {
          x: Math.cos(a) * ctx.vrng.range(1.5, 8) * scale + ctx.world.wind.x * 0.3,
          y: ctx.vrng.range(0.5, 2.6),
          z: Math.sin(a) * ctx.vrng.range(1.5, 8) * scale + ctx.world.wind.z * 0.3,
        },
        acc: { x: ctx.world.wind.x * 0.22, y: ctx.vrng.range(0.05, 0.3), z: ctx.world.wind.z * 0.22 },
        life: ctx.vrng.range(4, 12),
        size0: ctx.vrng.range(2, 3.6) * scale, size1: ctx.vrng.range(10, 17) * scale,
        alpha: ctx.vrng.range(0.26, 0.5),
        col0: 0xddd6ca, col1: 0x8e887e,
        delay: ctx.vrng.range(0, 0.4),
        rotVel: ctx.vrng.range(-0.8, 0.8),
      });
    }
    // fast dust wave kicked out by the exhaust
    const nWave = Math.round(26 * k);
    for (let i = 0; i < nWave; i++) {
      const a = (i / nWave) * TAU;
      _v.set(pos.x + Math.cos(a) * 2 * scale, ground + 0.4, pos.z + Math.sin(a) * 2 * scale);
      smoke.spawn(now, {
        pos: _v,
        vel: { x: Math.cos(a) * ctx.vrng.range(12, 24) * scale, y: ctx.vrng.range(0.6, 2.2), z: Math.sin(a) * ctx.vrng.range(12, 24) * scale },
        acc: { x: 0, y: -0.6, z: 0 },
        life: ctx.vrng.range(1.2, 2.8),
        size0: 2 * scale, size1: 10 * scale,
        alpha: 0.5,
        col0: 0xcbb590, col1: 0x9d8a68,
      });
    }
    // slow rolling pad dust ring — hugs the ground and lingers
    const nRoll = Math.round(22 * k);
    for (let i = 0; i < nRoll; i++) {
      const a = (i / nRoll) * TAU + ctx.vrng.range(-0.12, 0.12);
      _v.set(pos.x + Math.cos(a) * 3.4 * scale, ground + 0.7, pos.z + Math.sin(a) * 3.4 * scale);
      smoke.spawn(now, {
        pos: _v,
        vel: {
          x: Math.cos(a) * ctx.vrng.range(3.5, 8) * scale + ctx.world.wind.x * 0.25,
          y: ctx.vrng.range(0.2, 1),
          z: Math.sin(a) * ctx.vrng.range(3.5, 8) * scale + ctx.world.wind.z * 0.25,
        },
        acc: { x: ctx.world.wind.x * 0.12, y: -0.35, z: ctx.world.wind.z * 0.12 },
        life: ctx.vrng.range(3.5, 8),
        size0: 2.6 * scale, size1: ctx.vrng.range(12, 18) * scale,
        alpha: 0.38,
        col0: 0xc9b28c, col1: 0x8a7a60,
        delay: ctx.vrng.range(0.1, 0.5),
        rotVel: ctx.vrng.range(-0.6, 0.6),
      });
    }
    ring(pos, 26 * scale, 0.8);
    shakeFromDistance(pos, 0.55 * scale);
    ctx.events.emit('fx-launch', { pos: pos.clone(), scale });
  }

  function explosionAir(pos, scale = 1) {
    const highAlt = pos.y - Math.max(terrainHeight(pos.x, pos.z), 0) > 500;
    const dk = distK(pos); // keeps the composite readable from the base

    // layered flash: hot white core + wider lingering orange halo
    flash(pos, 44 * scale, 0.22, 0xffffff);
    flash(pos, 28 * scale, 0.55, 0xffa54a);
    // expanding luminous shell — km-scale readability cue (bluish at altitude)
    shockSphere(pos, (highAlt ? 62 : 36) * scale * Math.max(dk * 0.45, 1), highAlt ? 1.15 : 0.7, highAlt ? 0xbcd6ff : 0xffd9a8);

    // hot fireball: decelerating turbulent puffs, white -> orange.
    // spawn spread ~ particle radius so the silhouette boils instead of
    // merging into one smooth disc (vrng.gauss sigma is ~0.29, hence the
    // large-looking constants).
    const fbSpread = (10 + dk * 6) * scale;
    const nFire = Math.round(30 * Math.min(scale, 1.6));
    for (let i = 0; i < nFire; i++) {
      _v.set(pos.x + ctx.vrng.gauss() * fbSpread, pos.y + ctx.vrng.gauss() * fbSpread, pos.z + ctx.vrng.gauss() * fbSpread);
      _v2.set(ctx.vrng.gauss(), ctx.vrng.gauss(), ctx.vrng.gauss()).multiplyScalar(16 * scale);
      _v3.copy(_v2).multiplyScalar(-1.05);
      _v3.y += 5;
      fire.spawn(now, {
        pos: _v, vel: _v2, acc: _v3,
        life: ctx.vrng.range(0.45, 1.1),
        size0: 4.5 * scale * dk, size1: ctx.vrng.range(9, 15) * scale * dk,
        alpha: 0.95,
        col0: 0xfff6da, col1: 0xff5a1a,
        delay: ctx.vrng.range(0, 0.12),
        rotVel: ctx.vrng.range(-3.5, 3.5),
      });
    }
    // bright core puffs (normal blend): give the fireball body against bright sky
    const nCore = Math.round(14 * Math.min(scale, 1.6));
    for (let i = 0; i < nCore; i++) {
      _v.set(pos.x + ctx.vrng.gauss() * fbSpread * 0.8, pos.y + ctx.vrng.gauss() * fbSpread * 0.8, pos.z + ctx.vrng.gauss() * fbSpread * 0.8);
      _v2.set(ctx.vrng.gauss(), ctx.vrng.gauss(), ctx.vrng.gauss()).multiplyScalar(11 * scale);
      _v3.copy(_v2).multiplyScalar(-0.9);
      smoke.spawn(now, {
        pos: _v, vel: _v2, acc: _v3,
        life: ctx.vrng.range(0.5, 1.0),
        size0: 5 * scale * dk, size1: ctx.vrng.range(11, 16) * scale * dk,
        alpha: 0.85,
        col0: 0xfff3da, col1: 0x9c8c76,
        rotVel: ctx.vrng.range(-2.5, 2.5),
      });
    }
    // fire -> smoke transition shell (hot brown cooling to near-black)
    const trSpread = (12 + dk * 8) * scale;
    const nHot = Math.round(24 * Math.min(scale, 1.6));
    for (let i = 0; i < nHot; i++) {
      _v.set(pos.x + ctx.vrng.gauss() * trSpread, pos.y + ctx.vrng.gauss() * trSpread, pos.z + ctx.vrng.gauss() * trSpread);
      _v2.set(ctx.vrng.gauss(), ctx.vrng.gauss() * 0.8 + 0.4, ctx.vrng.gauss()).multiplyScalar(8 * scale);
      _v3.copy(_v2).multiplyScalar(-0.42);
      _v3.y += 1.1;
      smoke.spawn(now, {
        pos: _v, vel: _v2, acc: _v3,
        life: ctx.vrng.range(1.6, 3.4),
        size0: 5 * scale * dk, size1: ctx.vrng.range(12, 19) * scale * dk,
        alpha: 0.7,
        col0: 0x6b5140, col1: 0x38332d,
        delay: ctx.vrng.range(0.08, 0.3),
        rotVel: ctx.vrng.range(-1.6, 1.6),
      });
    }
    // lingering dark smoke blot — lumpy cauliflower cloud, not a dot. Center
    // spread stays comparable to puff radius so edges break up; two tones keep
    // the interior from flattening to one value.
    const nBlot = highAlt ? 30 : 24;
    const spread = (16 + dk * 18) * scale;
    for (let i = 0; i < nBlot; i++) {
      _v.set(pos.x + ctx.vrng.gauss() * spread, pos.y + ctx.vrng.gauss() * spread * 0.85, pos.z + ctx.vrng.gauss() * spread);
      const darker = (i & 1) === 0;
      // born near full size: the cloud forms in the first second, then drifts
      const s1 = ctx.vrng.range(21, 36) * scale * dk;
      smoke.spawn(now, {
        pos: _v,
        vel: { x: ctx.vrng.gauss() * 2 + ctx.world.wind.x * 0.4, y: ctx.vrng.gauss() * 1.4 + 0.5, z: ctx.vrng.gauss() * 2 + ctx.world.wind.z * 0.4 },
        acc: { x: ctx.world.wind.x * 0.18, y: 0.22, z: ctx.world.wind.z * 0.18 },
        life: ctx.vrng.range(highAlt ? 7 : 5, highAlt ? 16 : 11),
        size0: s1 * 0.55, size1: s1,
        alpha: ctx.vrng.range(0.5, 0.75),
        col0: darker ? 0x453f39 : 0x5c554d, col1: darker ? 0x2b2825 : 0x37332e,
        delay: ctx.vrng.range(0.1, 0.7),
        rotVel: ctx.vrng.range(-0.5, 0.5),
      });
    }
    // spark streaks: velocity-stretched, arc under gravity, fade out
    const nSpark = Math.round(60 * Math.min(scale, 1.5));
    for (let i = 0; i < nSpark; i++) {
      _v2.set(ctx.vrng.gauss(), ctx.vrng.gauss(), ctx.vrng.gauss()).normalize().multiplyScalar(ctx.vrng.range(34, 95) * scale);
      _v3.set(-_v2.x * 0.55, -_v2.y * 0.55 - 30, -_v2.z * 0.55);
      streaks.spawn(now, {
        pos, vel: _v2, acc: _v3,
        life: ctx.vrng.range(0.5, 1.6),
        width: ctx.vrng.range(0.28, 0.55) * scale,
        len: ctx.vrng.range(5, 13) * scale,
        alpha: 0.95,
        col0: 0xfff2c4, col1: 0xff702a,
      });
    }
    // a few slow glowing embers sinking out of the fireball
    const nEmber = Math.round(10 * Math.min(scale, 1.5));
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
    // glinting fragments; at altitude they fall trailing thin smoke
    if (highAlt) throwDebris(pos, 9, 26 * scale, 1, ctx.vrng.range(1.2, 2));
    else throwDebris(pos, Math.round(12 * scale), 44 * scale, 1, 0.5);
    shakeFromDistance(pos, 0.5 * scale);
    ctx.events.emit('fx-explosion', { pos: pos.clone(), scale, air: true });
  }

  function explosionGround(pos, scale = 1) {
    const ground = Math.max(terrainHeight(pos.x, pos.z), 0);
    const gpos = _v.set(pos.x, ground + 1.5, pos.z).clone();
    const dks = Math.sqrt(distK(gpos)); // gentler boost: ground has scale references
    // white core + orange halo + low luminous shell
    flash(gpos, 54 * scale, 0.26, 0xffffff);
    flash(gpos, 34 * scale, 0.6, 0xffa04a);
    _v2.set(gpos.x, ground + 7 * scale, gpos.z);
    shockSphere(_v2, 48 * scale * dks, 0.85, 0xffcf96);

    // fire column
    const nFire = Math.round(36 * Math.min(scale, 1.7));
    for (let i = 0; i < nFire; i++) {
      _v.set(gpos.x + ctx.vrng.gauss() * 8 * scale, ground + ctx.vrng.range(0.5, 7) * scale, gpos.z + ctx.vrng.gauss() * 8 * scale);
      fire.spawn(now, {
        pos: _v,
        vel: _v2.set(ctx.vrng.gauss() * 9, ctx.vrng.range(14, 44), ctx.vrng.gauss() * 9).multiplyScalar(scale),
        acc: { x: 0, y: -7, z: 0 },
        life: ctx.vrng.range(0.45, 1.5),
        size0: 7 * scale * dks, size1: 22 * scale * dks,
        alpha: 0.95,
        col0: 0xfff0c0, col1: 0xd94f16,
        rotVel: ctx.vrng.range(-3, 3),
      });
    }
    // spark fountain
    const nSpark = Math.round(56 * Math.min(scale, 1.6));
    for (let i = 0; i < nSpark; i++) {
      _v2.set(ctx.vrng.gauss() * 24, ctx.vrng.range(28, 88), ctx.vrng.gauss() * 24).multiplyScalar(scale);
      _v3.set(-_v2.x * 0.4, -38, -_v2.z * 0.4);
      streaks.spawn(now, {
        pos: gpos, vel: _v2, acc: _v3,
        life: ctx.vrng.range(0.7, 2.0),
        width: ctx.vrng.range(0.3, 0.6) * scale,
        len: ctx.vrng.range(8, 18) * scale,
        alpha: 0.95,
        col0: 0xfff2c4, col1: 0xff702a,
      });
    }
    // bright core mass at the base (normal blend — reads on bright desert);
    // lives long enough to bridge the fireball into the dark column
    const nCore = Math.round(16 * Math.min(scale, 1.7));
    for (let i = 0; i < nCore; i++) {
      _v.set(gpos.x + ctx.vrng.gauss() * 6 * scale, ground + ctx.vrng.range(1, 6) * scale, gpos.z + ctx.vrng.gauss() * 6 * scale);
      _v2.set(ctx.vrng.gauss() * 6, ctx.vrng.range(7, 18), ctx.vrng.gauss() * 6).multiplyScalar(scale);
      _v3.copy(_v2).multiplyScalar(-0.55);
      smoke.spawn(now, {
        pos: _v, vel: _v2, acc: _v3,
        life: ctx.vrng.range(0.8, 2.0),
        size0: 8 * scale * dks, size1: 24 * scale * dks,
        alpha: 0.8,
        col0: 0xfff0d2, col1: 0x8d7c64,
        rotVel: ctx.vrng.range(-2.5, 2.5),
      });
    }
    // tall dark smoke column: staggered, slow, long-lived. Two tones + wide
    // center jitter keep the column ragged instead of a solid silhouette.
    const nCol = Math.round(60 * Math.min(scale, 1.7));
    for (let i = 0; i < nCol; i++) {
      const h = ctx.vrng.range(1, 18) * scale;
      _v.set(gpos.x + ctx.vrng.gauss() * (9 + h * 0.9) * scale, ground + h, gpos.z + ctx.vrng.gauss() * (9 + h * 0.9) * scale);
      const darker = (i % 3) === 0;
      const s1 = ctx.vrng.range(24, 40) * scale * dks;
      // low-end vel.y of ~4 keeps some smoke anchored at the base so the
      // column stays connected to the ground instead of lifting off as a ball
      smoke.spawn(now, {
        pos: _v,
        vel: { x: ctx.vrng.gauss() * 2.8 + ctx.world.wind.x * 0.3, y: ctx.vrng.range(4, 30) * scale, z: ctx.vrng.gauss() * 2.8 + ctx.world.wind.z * 0.3 },
        acc: { x: ctx.world.wind.x * 0.3, y: -0.8, z: ctx.world.wind.z * 0.3 },
        life: ctx.vrng.range(6, 15),
        size0: s1 * 0.45, size1: s1,
        alpha: ctx.vrng.range(0.45, 0.66),
        col0: darker ? 0x332e29 : 0x4a4239, col1: darker ? 0x1f1d1c : 0x2b2825,
        delay: ctx.vrng.range(0, 0.9),
        rotVel: ctx.vrng.range(-0.7, 0.7),
      });
    }
    // mushroom cap: late wide puffs that bloom where the column tops out
    const nCap = Math.round(14 * Math.min(scale, 1.7));
    for (let i = 0; i < nCap; i++) {
      _v.set(gpos.x + ctx.vrng.gauss() * 18 * scale, ground + ctx.vrng.range(30, 52) * scale, gpos.z + ctx.vrng.gauss() * 18 * scale);
      smoke.spawn(now, {
        pos: _v,
        vel: { x: ctx.vrng.gauss() * 3.5 + ctx.world.wind.x * 0.45, y: ctx.vrng.range(1.5, 4.5), z: ctx.vrng.gauss() * 3.5 + ctx.world.wind.z * 0.45 },
        acc: { x: ctx.world.wind.x * 0.2, y: -0.12, z: ctx.world.wind.z * 0.2 },
        life: ctx.vrng.range(7, 15),
        size0: 9 * scale * dks, size1: ctx.vrng.range(26, 42) * scale * dks,
        alpha: ctx.vrng.range(0.38, 0.55),
        col0: 0x4c443b, col1: 0x2e2b28,
        delay: ctx.vrng.range(1.2, 2.8),
        rotVel: ctx.vrng.range(-0.4, 0.4),
      });
    }
    // hot interior glow lighting the young column from inside
    const nGlow = Math.round(10 * Math.min(scale, 1.6));
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
    // radial dust skirt: hugs the ground, rolls outward, lingers. Sandy desert
    // tones with height jitter so it reads as churned dust, not a dark band.
    const nSkirt = Math.round(60 * Math.min(scale, 1.7));
    for (let i = 0; i < nSkirt; i++) {
      const a = (i / nSkirt) * TAU + ctx.vrng.range(-0.1, 0.1);
      _v.set(gpos.x + Math.cos(a) * 3 * scale, ground + ctx.vrng.range(0.5, 3.5), gpos.z + Math.sin(a) * 3 * scale);
      smoke.spawn(now, {
        pos: _v,
        vel: { x: Math.cos(a) * ctx.vrng.range(16, 38) * scale, y: ctx.vrng.range(0.6, 3.2), z: Math.sin(a) * ctx.vrng.range(16, 38) * scale },
        acc: { x: -Math.cos(a) * 2.4 * scale, y: -0.9, z: -Math.sin(a) * 2.4 * scale },
        life: ctx.vrng.range(4, 9),
        size0: 4.5 * scale * dks, size1: ctx.vrng.range(17, 28) * scale * dks,
        alpha: ctx.vrng.range(0.5, 0.68),
        col0: 0xa8905f, col1: 0x60533f,
        delay: ctx.vrng.range(0, 0.15),
        rotVel: ctx.vrng.range(-0.8, 0.8),
      });
    }
    throwDebris(gpos, Math.round(28 * scale), 60 * scale, 1, 0.8);
    ring(gpos, 62 * scale, 1.0);
    ring(gpos, 100 * scale, 2.2, 0xd9c09a);
    scorchAt(gpos, 15 * scale);
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
        rotVel: ctx.vrng.range(-1.2, 1.2),
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
        s.sprite.scale.setScalar(Math.max(s.maxR * e, 1.2) * 2.8);
        s.sprite.material.opacity = 0.9 * Math.pow(1 - k, 1.6);
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
        r.mesh.material.opacity = 0.55 * Math.pow(1 - k, 1.7);
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
      // debris
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
