import * as THREE from 'three';
import { settings } from './settings.js';
import { Pool, SlotRing } from './util/pool.js';
import { Rng } from './util/rng.js';
import * as T from './util/textures.js';
import { clamp, saturate, lerp, damp } from './util/mathx.js';
import { airDensity, trailPersistence, SEA_LEVEL_DENSITY, GRAVITY } from './physics.js';

/**
 * All transient visuals: smoke trails, launch plumes, ground dust, sparks,
 * embers, debris, fireballs, shockwaves, ground decals and flare drops.
 *
 * Everything is pooled. Particle motion is evaluated on the GPU from a spawn
 * record, so emitting a thousand puffs per second costs a handful of typed
 * array writes rather than a per-particle CPU update.
 */

/* ------------------------------------------------------------------ *
 * Attribute helper - tracks a dirty range so we upload the minimum
 * ------------------------------------------------------------------ */
class Attr {
  constructor(count, itemSize) {
    this.array = new Float32Array(count * itemSize);
    this.itemSize = itemSize;
    this.attribute = new THREE.BufferAttribute(this.array, itemSize);
    this.attribute.setUsage(THREE.DynamicDrawUsage);
    this.lo = Infinity;
    this.hi = -Infinity;
  }

  touch(index) {
    if (index < this.lo) this.lo = index;
    if (index > this.hi) this.hi = index;
  }

  flush() {
    if (this.hi < this.lo) return;
    const a = this.attribute;
    if (a.clearUpdateRanges) {
      a.clearUpdateRanges();
      a.addUpdateRange(this.lo * this.itemSize, (this.hi - this.lo + 1) * this.itemSize);
    }
    a.needsUpdate = true;
    this.lo = Infinity;
    this.hi = -Infinity;
  }
}

/* ------------------------------------------------------------------ *
 * Smoke / plume particles
 * ------------------------------------------------------------------ */

const SMOKE_VERT = /* glsl */ `
precision highp float;
attribute vec3  aVel;
attribute vec4  aData;   // spawnTime, life, sizeStart, sizeEnd
attribute vec4  aStyle;  // seed, alpha, drag, buoyancy
attribute vec3  aColor;

uniform float uTime;
uniform vec3  uWind;
uniform float uPixelRatio;
uniform float uHeightScale;
uniform float fogDensity;

varying float vAlpha;
varying vec3  vColor;
varying float vSeed;
varying float vAge;
varying float vFog;
varying float vSoft;

void main() {
  float age = uTime - aData.x;
  float life = aData.y;
  if (age < 0.0 || age > life) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    return;
  }
  float t = age / life;

  // Exponential drag: the puff shoots out then settles into the wind.
  float drag = max(0.05, aStyle.z);
  float k = (1.0 - exp(-drag * age)) / drag;
  vec3 p = position + aVel * k;
  p += uWind * (age - k * 0.35);
  p.y += aStyle.w * age * age * 0.5;

  // Slow curl so big columns roll instead of drifting rigidly.
  float s = aStyle.x * 43.0;
  float curl = age * 0.55;
  p += vec3(sin(curl + s), cos(curl * 0.7 + s * 1.7) * 0.5, cos(curl + s * 0.6))
       * (0.35 + aData.z * 0.12) * age;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  gl_Position = projectionMatrix * mv;

  // uHeightScale is drawingBufferHeight / (2 tan(fov/2)), so this is the exact
  // projected diameter of a sphere of the given world size.
  float size = mix(aData.z, aData.w, pow(t, 0.62));
  gl_PointSize = clamp((size * uHeightScale) / max(0.5, dist), 1.0, 2400.0);

  float fadeIn = smoothstep(0.0, 0.045, t);
  float fadeOut = pow(1.0 - t, 1.35);
  vAlpha = aStyle.y * fadeIn * fadeOut;
  vColor = aColor;
  vSeed = aStyle.x;
  vAge = t;
  vSoft = smoothstep(0.0, 45.0, dist);

  #ifdef USE_FOG
    float fogFactor = 1.0 - exp(-fogDensity * fogDensity * dist * dist);
    vFog = clamp(fogFactor, 0.0, 1.0);
  #else
    vFog = 0.0;
  #endif
}
`;

const SMOKE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec3  uSunDirView;
uniform vec3  uSunColor;
uniform vec3  uAmbient;

varying float vAlpha;
varying vec3  vColor;
varying float vSeed;
varying float vAge;
varying float vFog;
varying float vSoft;

void main() {
  if (vAlpha <= 0.002) discard;

  // Rotate the sprite so neighbouring puffs never look stamped.
  float a = vSeed * 6.2831 + vAge * (vSeed - 0.5) * 1.4;
  float c = cos(a), s = sin(a);
  vec2 uv = gl_PointCoord - 0.5;
  uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;

  vec4 tex = texture2D(uTex, uv);
  float alpha = tex.a * vAlpha;
  if (alpha < 0.003) discard;

  // Fake spherical normal gives every puff real directional shading.
  vec2 pc = (gl_PointCoord - 0.5) * 2.0;
  float r2 = dot(pc, pc);
  vec3 n = normalize(vec3(pc.x, -pc.y, sqrt(max(0.02, 1.0 - r2))));
  float ndl = max(dot(n, uSunDirView), 0.0);
  float wrap = max(dot(n, uSunDirView) * 0.5 + 0.5, 0.0);

  vec3 lit = vColor * (uAmbient + uSunColor * (0.22 * wrap + 0.85 * ndl));
  lit = mix(lit, vColor * uAmbient * 1.4, vFog);

  gl_FragColor = vec4(lit, alpha * vSoft);
}
`;

class SmokeSystem {
  constructor(scene, capacity, { additive = false, texture = null, name = 'smoke' } = {}) {
    this.capacity = capacity;
    this.ring = new SlotRing(capacity);
    this.time = 0;

    const geo = new THREE.BufferGeometry();
    this.aPos = new Attr(capacity, 3);
    this.aVel = new Attr(capacity, 3);
    this.aData = new Attr(capacity, 4);
    this.aStyle = new Attr(capacity, 4);
    this.aColor = new Attr(capacity, 3);
    geo.setAttribute('position', this.aPos.attribute);
    geo.setAttribute('aVel', this.aVel.attribute);
    geo.setAttribute('aData', this.aData.attribute);
    geo.setAttribute('aStyle', this.aStyle.attribute);
    geo.setAttribute('aColor', this.aColor.attribute);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 3000, 0), 60000);

    // Fog uniforms are declared explicitly (rather than via UniformsUtils.merge)
    // so the shared smoke texture is not cloned into a second GPU upload.
    this.uniforms = {
      fogColor: { value: new THREE.Color(0xb6c8d6) },
      fogDensity: { value: 0.000034 },
      fogNear: { value: 1 },
      fogFar: { value: 40000 },
      uTime: { value: 0 },
      uWind: { value: new THREE.Vector3(2.4, 0, -1.6) },
      uPixelRatio: { value: 1 },
      uHeightScale: { value: 900 },
      uTex: { value: texture || T.smokeSprite(128) },
      uSunDirView: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color(1, 0.96, 0.9) },
      uAmbient: { value: new THREE.Color(0.35, 0.4, 0.5) }
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: SMOKE_VERT,
      fragmentShader: SMOKE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      fog: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.points = new THREE.Points(geo, mat);
    this.points.name = name;
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 12 : 10;
    scene.add(this.points);
  }

  /**
   * @param {THREE.Vector3} pos
   * @param {THREE.Vector3} vel
   */
  spawn(pos, vel, { life = 3, sizeStart = 2, sizeEnd = 10, alpha = 0.7, color = null, drag = 1.2, buoyancy = 0.4, seed = Math.random() }) {
    const i = this.ring.next();
    const p = this.aPos.array;
    p[i * 3] = pos.x;
    p[i * 3 + 1] = pos.y;
    p[i * 3 + 2] = pos.z;
    this.aPos.touch(i);
    const v = this.aVel.array;
    v[i * 3] = vel.x;
    v[i * 3 + 1] = vel.y;
    v[i * 3 + 2] = vel.z;
    this.aVel.touch(i);
    const d = this.aData.array;
    d[i * 4] = this.time;
    d[i * 4 + 1] = life;
    d[i * 4 + 2] = sizeStart;
    d[i * 4 + 3] = sizeEnd;
    this.aData.touch(i);
    const s = this.aStyle.array;
    s[i * 4] = seed;
    s[i * 4 + 1] = alpha;
    s[i * 4 + 2] = drag;
    s[i * 4 + 3] = buoyancy;
    this.aStyle.touch(i);
    const c = this.aColor.array;
    if (color) {
      c[i * 3] = color.r;
      c[i * 3 + 1] = color.g;
      c[i * 3 + 2] = color.b;
    } else {
      c[i * 3] = 0.82;
      c[i * 3 + 1] = 0.8;
      c[i * 3 + 2] = 0.78;
    }
    this.aColor.touch(i);
    return i;
  }

  update(dt) {
    this.time += dt;
    this.uniforms.uTime.value = this.time;
    this.aPos.flush();
    this.aVel.flush();
    this.aData.flush();
    this.aStyle.flush();
    this.aColor.flush();
  }

  clear() {
    // Expire everything by pushing spawn times far into the past.
    const d = this.aData.array;
    for (let i = 0; i < this.capacity; i++) d[i * 4] = -1e6;
    this.aData.lo = 0;
    this.aData.hi = this.capacity - 1;
    this.aData.flush();
    this.ring.clear();
  }
}

/* ------------------------------------------------------------------ *
 * Sparks / embers (additive, gravity affected, streaked)
 * ------------------------------------------------------------------ */

const SPARK_VERT = /* glsl */ `
precision highp float;
attribute vec3 aVel;
attribute vec4 aData; // spawn, life, size, seed
attribute vec3 aColor;
uniform float uTime;
uniform float uHeightScale;
uniform float uGravity;
varying float vAlpha;
varying vec3 vColor;
void main() {
  float age = uTime - aData.x;
  if (age < 0.0 || age > aData.y) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    return;
  }
  float t = age / aData.y;
  float k = (1.0 - exp(-1.8 * age)) / 1.8;
  vec3 p = position + aVel * k;
  p.y -= 0.5 * uGravity * age * age;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp((aData.z * uHeightScale) / max(0.5, dist), 1.0, 220.0);
  vAlpha = pow(1.0 - t, 1.8);
  // Embers cool from white to orange to deep red.
  vColor = mix(aColor, vec3(0.65, 0.12, 0.02), pow(t, 0.7));
}
`;

const SPARK_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
varying float vAlpha;
varying vec3 vColor;
void main() {
  if (vAlpha <= 0.004) discard;
  float a = texture2D(uTex, gl_PointCoord).a * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * (1.0 + vAlpha * 1.6), a);
}
`;

class SparkSystem {
  constructor(scene, capacity) {
    this.capacity = capacity;
    this.ring = new SlotRing(capacity);
    this.time = 0;
    const geo = new THREE.BufferGeometry();
    this.aPos = new Attr(capacity, 3);
    this.aVel = new Attr(capacity, 3);
    this.aData = new Attr(capacity, 4);
    this.aColor = new Attr(capacity, 3);
    geo.setAttribute('position', this.aPos.attribute);
    geo.setAttribute('aVel', this.aVel.attribute);
    geo.setAttribute('aData', this.aData.attribute);
    geo.setAttribute('aColor', this.aColor.attribute);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2000, 0), 60000);
    this.uniforms = {
      uTime: { value: 0 },
      uHeightScale: { value: 900 },
      uGravity: { value: GRAVITY },
      uTex: { value: T.sparkSprite(64) }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: SPARK_VERT,
      fragmentShader: SPARK_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 14;
    this.points.name = 'sparks';
    scene.add(this.points);
  }

  spawn(pos, vel, { life = 1.2, size = 0.5, color = null } = {}) {
    const i = this.ring.next();
    const p = this.aPos.array;
    p[i * 3] = pos.x;
    p[i * 3 + 1] = pos.y;
    p[i * 3 + 2] = pos.z;
    this.aPos.touch(i);
    const v = this.aVel.array;
    v[i * 3] = vel.x;
    v[i * 3 + 1] = vel.y;
    v[i * 3 + 2] = vel.z;
    this.aVel.touch(i);
    const d = this.aData.array;
    d[i * 4] = this.time;
    d[i * 4 + 1] = life;
    d[i * 4 + 2] = size;
    d[i * 4 + 3] = Math.random();
    this.aData.touch(i);
    const c = this.aColor.array;
    if (color) {
      c[i * 3] = color.r;
      c[i * 3 + 1] = color.g;
      c[i * 3 + 2] = color.b;
    } else {
      c[i * 3] = 1.0;
      c[i * 3 + 1] = 0.85;
      c[i * 3 + 2] = 0.55;
    }
    this.aColor.touch(i);
  }

  update(dt) {
    this.time += dt;
    this.uniforms.uTime.value = this.time;
    this.aPos.flush();
    this.aVel.flush();
    this.aData.flush();
    this.aColor.flush();
  }

  clear() {
    const d = this.aData.array;
    for (let i = 0; i < this.capacity; i++) d[i * 4] = -1e6;
    this.aData.lo = 0;
    this.aData.hi = this.capacity - 1;
    this.aData.flush();
    this.ring.clear();
  }
}

/* ------------------------------------------------------------------ *
 * Fireballs and shockwaves
 * ------------------------------------------------------------------ */

const FIREBALL_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosL;
varying vec3 vViewDir;
void main() {
  vPosL = position;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FIREBALL_FRAG = /* glsl */ `
precision highp float;
uniform float uAge;      // 0..1
uniform float uSeed;
uniform vec3  uHot;
uniform vec3  uMid;
uniform vec3  uCool;
uniform float uIntensity;
varying vec3 vNormalW;
varying vec3 vPosL;
varying vec3 vViewDir;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.07; a *= 0.5; }
  return s;
}

void main() {
  vec3 n = normalize(vPosL);
  // Billowing cells that expand and cool as the fireball ages.
  float turb = fbm(n * (3.4 + uSeed * 2.0) + vec3(uSeed * 31.0) - vec3(0.0, uAge * 1.6, 0.0));
  float turb2 = fbm(n * 9.0 + vec3(uSeed * 11.0) - vec3(0.0, uAge * 3.2, 0.0));
  float heat = clamp(turb * 1.35 + turb2 * 0.4 - uAge * 1.15, 0.0, 1.0);

  vec3 col = mix(uCool, uMid, smoothstep(0.06, 0.42, heat));
  col = mix(col, uHot, smoothstep(0.42, 0.86, heat));

  // Rim darkening: sooty edges around a bright core.
  float fres = pow(1.0 - abs(dot(normalize(vNormalW), vViewDir)), 1.6);
  col *= mix(1.0, 0.35, fres * (0.4 + uAge * 0.6));

  float alpha = clamp(heat * 1.7, 0.0, 1.0) * (1.0 - smoothstep(0.55, 1.0, uAge));
  alpha *= 1.0 - fres * 0.35;
  if (alpha < 0.008) discard;
  gl_FragColor = vec4(col * uIntensity, alpha);
}
`;

const SHOCK_FRAG = /* glsl */ `
precision highp float;
uniform float uAge;
uniform float uStrength;
varying vec3 vNormalW;
varying vec3 vPosL;
varying vec3 vViewDir;
void main() {
  // Thin, bright shell: only the silhouette edge is visible, like a
  // compression front catching the light.
  float fres = pow(1.0 - abs(dot(normalize(vNormalW), vViewDir)), 5.0);
  float fade = (1.0 - uAge) * (1.0 - uAge);
  float a = fres * fade * uStrength;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vec3(1.0, 0.96, 0.9) * (0.6 + fres), a);
}
`;

/* ------------------------------------------------------------------ *
 * Effects manager
 * ------------------------------------------------------------------ */

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _col = new THREE.Color();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

export class Effects {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.rng = new Rng(settings.seed ^ 0xefec);
    const q = settings.quality;

    this.smoke = new SmokeSystem(scene, q.maxSmokeParticles, { name: 'smoke' });
    this.fire = new SmokeSystem(scene, Math.floor(q.maxSmokeParticles * 0.28), {
      additive: true,
      name: 'firepuffs'
    });
    this.sparks = new SparkSystem(scene, q.maxSparks);

    this._initFireballs();
    this._initShockwaves();
    this._initDebris();
    this._initDecals();
    this._initFlashes();
    this._initFlares();

    this.wind = new THREE.Vector3(2.6, 0, -1.8);
    this.sunDirView = new THREE.Vector3(0, 1, 0);
    this.shake = 0;
    this.shakeSeed = this.rng.float() * 100;
  }

  /* ---------------- fireballs ---------------- */
  _initFireballs() {
    const geo = new THREE.IcosahedronGeometry(1, 3);
    this.fireballs = new Pool(
      () => {
        const mat = new THREE.ShaderMaterial({
          uniforms: {
            uAge: { value: 0 },
            uSeed: { value: Math.random() },
            uHot: { value: new THREE.Color(1.0, 0.96, 0.82) },
            uMid: { value: new THREE.Color(1.0, 0.52, 0.14) },
            uCool: { value: new THREE.Color(0.28, 0.1, 0.05) },
            uIntensity: { value: 2.4 }
          },
          vertexShader: FIREBALL_VERT,
          fragmentShader: FIREBALL_FRAG,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.FrontSide
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        mesh.frustumCulled = false;
        mesh.renderOrder = 16;
        this.scene.add(mesh);
        return { mesh, mat, age: 0, life: 1, radius: 10, growth: 1 };
      },
      14,
      (o) => {
        o.age = 0;
        o.mesh.visible = true;
      }
    );
  }

  /* ---------------- shockwaves ---------------- */
  _initShockwaves() {
    const geo = new THREE.IcosahedronGeometry(1, 2);
    this.shockwaves = new Pool(
      () => {
        const mat = new THREE.ShaderMaterial({
          uniforms: { uAge: { value: 0 }, uStrength: { value: 1 } },
          vertexShader: FIREBALL_VERT,
          fragmentShader: SHOCK_FRAG,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        mesh.frustumCulled = false;
        mesh.renderOrder = 15;
        this.scene.add(mesh);
        return { mesh, mat, age: 0, life: 1, radius: 40 };
      },
      10,
      (o) => {
        o.age = 0;
        o.mesh.visible = true;
      }
    );
  }

  /* ---------------- debris ---------------- */
  _initDebris() {
    const count = settings.quality.maxDebris;
    // Two chunk shapes merged into one instanced draw.
    const geo = new THREE.TetrahedronGeometry(0.5, 0);
    // Per-instance colour carries the cooling glow of freshly torn metal.
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.55,
      vertexColors: false
    });
    this.debrisMesh = new THREE.InstancedMesh(geo, mat, count);
    this.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debrisMesh.frustumCulled = false;
    this.debrisMesh.castShadow = false;
    this.debrisMesh.count = count;
    this.debrisColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    this.debrisMesh.instanceColor = this.debrisColor;
    this.debrisMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.debrisMesh);

    this.debris = new Pool(
      (i) => ({
        index: i,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        age: 0,
        life: 6,
        size: 0.4,
        smokes: false,
        smokeAcc: 0,
        heat: 1
      }),
      count,
      (o) => {
        o.age = 0;
        o.smokeAcc = 0;
      }
    );
    // Park everything off-screen initially.
    _mat4.makeScale(0, 0, 0);
    for (let i = 0; i < count; i++) this.debrisMesh.setMatrixAt(i, _mat4);
    this.debrisMesh.instanceMatrix.needsUpdate = true;
  }

  /* ---------------- ground decals ---------------- */
  _initDecals() {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    const tex = T.scorchSprite(256);
    this.decals = new Pool(
      () => {
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          opacity: 0.9,
          color: 0x2a2724
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        mesh.renderOrder = 2;
        this.scene.add(mesh);
        return { mesh, mat, age: 0, life: 40, fade: 0.9 };
      },
      48,
      (o) => {
        o.age = 0;
        o.mesh.visible = true;
      }
    );
  }

  /* ---------------- dynamic flash lights ---------------- */
  _initFlashes() {
    const n = settings.quality.shadows ? 5 : 3;
    this.flashes = new Pool(
      () => {
        const light = new THREE.PointLight(0xffb060, 0, 700, 1.6);
        light.visible = false;
        this.scene.add(light);
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: T.glowSprite(128, 2.0),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            color: 0xffc27a,
            toneMapped: false
          })
        );
        sprite.visible = false;
        sprite.renderOrder = 18;
        this.scene.add(sprite);
        return { light, sprite, age: 0, life: 0.5, power: 1, size: 20 };
      },
      n,
      (o) => {
        o.age = 0;
        o.light.visible = true;
        o.sprite.visible = true;
      }
    );
  }

  /* ---------------- decoy flares ---------------- */
  _initFlares() {
    this.flares = new Pool(
      () => {
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: T.glowSprite(64, 2.4),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            color: 0xfff0c0,
            toneMapped: false
          })
        );
        sprite.visible = false;
        sprite.renderOrder = 17;
        this.scene.add(sprite);
        return {
          sprite,
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          age: 0,
          life: 5,
          size: 6,
          smokeAcc: 0
        };
      },
      36,
      (o) => {
        o.age = 0;
        o.smokeAcc = 0;
        o.sprite.visible = true;
      }
    );
  }

  /* ================================================================ *
   * Public emitters
   * ================================================================ */

  /**
   * Emit one segment of a missile trail. Density and persistence are driven by
   * air density: dense low air shreds the smoke, thin high air leaves long
   * bright contrails.
   */
  emitTrail(pos, vel, dt, opts = {}) {
    const {
      rate = 90,
      color = null,
      widthStart = 1.4,
      widthEnd = 9,
      alpha = 0.55,
      hot = 0,
      accumulator
    } = opts;
    const alt = pos.y;
    const persistence = trailPersistence(alt);
    const rho = airDensity(alt) / SEA_LEVEL_DENSITY;
    const thin = saturate(1 - rho);
    const emitRate = rate * lerp(1.0, 0.62, thin);
    accumulator.value += emitRate * dt;
    let n = Math.floor(accumulator.value);
    if (n <= 0) return;
    accumulator.value -= n;
    n = Math.min(n, 14);

    const speed = vel.length();
    // Puffs must overlap or the trail beads. Size the head of each puff to the
    // gap it has to cover at this speed and emission rate.
    const spacing = speed / Math.max(1, emitRate);
    const head = Math.max(widthStart, spacing * 1.7);
    // Thin air lets a contrail bloom far wider before it dissipates.
    const tail = Math.max(head * 1.6, widthEnd * lerp(1, 14, thin));

    for (let i = 0; i < n; i++) {
      const back = (i + 0.5) / n;
      _v1.copy(pos).addScaledVector(vel, -back * dt);
      _v2.set(this.rng.spread(1), this.rng.spread(1), this.rng.spread(1));
      _v2.multiplyScalar(0.5 + speed * 0.004 + head * 0.12);
      _v2.addScaledVector(vel, -0.012);
      const life = (1.6 + this.rng.float() * 1.4) * persistence;
      this.smoke.spawn(_v1, _v2, {
        life,
        sizeStart: head * (0.78 + this.rng.float() * 0.5),
        sizeEnd: tail * (0.8 + this.rng.float() * 0.5),
        alpha: alpha * lerp(1, 0.8, thin),
        color: color ? _col.copy(color) : _col.setRGB(0.85, 0.84, 0.82).lerp(new THREE.Color(1, 1, 1), thin),
        drag: lerp(1.6, 0.28, thin),
        buoyancy: lerp(0.6, 0.02, thin),
        seed: this.rng.float()
      });
    }

    if (hot > 0) {
      _v1.copy(pos);
      _v2.copy(vel).multiplyScalar(-0.08);
      this.fire.spawn(_v1, _v2, {
        life: 0.16 + this.rng.float() * 0.12,
        sizeStart: widthStart * 2.2 * hot,
        sizeEnd: widthStart * 0.6,
        alpha: 0.9 * hot,
        color: _col.setRGB(1.0, 0.62, 0.24),
        drag: 3.5,
        buoyancy: 0,
        seed: this.rng.float()
      });
    }
  }

  /** The bright, dense column a launcher throws out at ignition. */
  launchPlume(origin, dir, { scale = 1, groundY = 0, color = null } = {}) {
    const n = Math.floor(90 * scale);
    for (let i = 0; i < n; i++) {
      const t = this.rng.float();
      _v1.copy(origin).addScaledVector(dir, -t * 6 * scale);
      _v1.x += this.rng.spread(1.4 * scale);
      _v1.z += this.rng.spread(1.4 * scale);
      _v1.y = Math.max(groundY + 0.15, _v1.y);
      _v2.set(this.rng.spread(1), this.rng.float() * 0.5, this.rng.spread(1)).normalize();
      _v2.multiplyScalar(8 + this.rng.float() * 26 * scale);
      _v2.addScaledVector(dir, -(6 + this.rng.float() * 22) * scale);
      this.smoke.spawn(_v1, _v2, {
        life: 3.6 + this.rng.float() * 3.4,
        sizeStart: 2.2 * scale,
        sizeEnd: (22 + this.rng.float() * 26) * scale,
        alpha: 0.72,
        color: color ? _col.copy(color) : _col.setRGB(0.86, 0.84, 0.8),
        drag: 1.1,
        buoyancy: 1.6,
        seed: this.rng.float()
      });
    }
    // Bright core.
    for (let i = 0; i < Math.floor(30 * scale); i++) {
      _v1.copy(origin).addScaledVector(dir, -this.rng.float() * 4 * scale);
      _v2.copy(dir).multiplyScalar(-(20 + this.rng.float() * 45) * scale);
      _v2.x += this.rng.spread(6);
      _v2.z += this.rng.spread(6);
      this.fire.spawn(_v1, _v2, {
        life: 0.35 + this.rng.float() * 0.4,
        sizeStart: 3 * scale,
        sizeEnd: 10 * scale,
        alpha: 0.85,
        color: _col.setRGB(1.0, 0.7, 0.3),
        drag: 2.4,
        buoyancy: 0.5,
        seed: this.rng.float()
      });
    }
    // Dust kicked off the pad - this is the part that sells scale.
    this.groundDust(_v3.set(origin.x, groundY, origin.z), 26 * scale, 22 * scale);
    this.sparkBurst(origin, 40 * scale, 26, 1.4);
    this.flash(origin, { power: 900 * scale, size: 26 * scale, life: 0.45, color: 0xffb066 });
    this.addDecal(_v3.set(origin.x, groundY + 0.03, origin.z), 12 * scale, 0.7);
  }

  /** Expanding ring of dust along the ground. */
  groundDust(center, radius, speed) {
    const n = Math.floor(52 * settings.quality.groundDetail);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.rng.spread(0.2);
      const r = 1.2 + this.rng.float() * 3.5;
      _v1.set(center.x + Math.cos(a) * r, center.y + 0.4 + this.rng.float() * 1.4, center.z + Math.sin(a) * r);
      _v2.set(Math.cos(a), 0.16 + this.rng.float() * 0.3, Math.sin(a)).multiplyScalar(
        speed * (0.55 + this.rng.float() * 0.8)
      );
      this.smoke.spawn(_v1, _v2, {
        life: 3.4 + this.rng.float() * 3.0,
        sizeStart: 3,
        sizeEnd: radius * (0.5 + this.rng.float() * 0.7),
        alpha: 0.5,
        color: _col.setRGB(0.78, 0.7, 0.56),
        drag: 1.5,
        buoyancy: 0.7,
        seed: this.rng.float()
      });
    }
  }

  sparkBurst(pos, count, speed, life = 1.2, color = null) {
    const n = Math.floor(count * (settings.quality.maxSparks / 2400 + 0.4));
    for (let i = 0; i < n; i++) {
      _v2.set(this.rng.spread(1), this.rng.float() * 1.2 - 0.2, this.rng.spread(1))
        .normalize()
        .multiplyScalar(speed * (0.3 + this.rng.float()));
      this.sparks.spawn(pos, _v2, {
        life: life * (0.5 + this.rng.float()),
        size: 0.25 + this.rng.float() * 0.6,
        color: color ? _col.copy(color) : _col.setRGB(1, 0.86 + this.rng.float() * 0.14, 0.5)
      });
    }
  }

  flash(pos, { power = 1200, size = 30, life = 0.4, color = 0xffb060 } = {}) {
    const f = this.flashes.acquire();
    if (!f) return null;
    f.life = life;
    f.power = power;
    f.size = size;
    f.light.position.copy(pos);
    f.light.color.setHex(color);
    f.light.distance = Math.max(120, size * 22);
    f.sprite.position.copy(pos);
    f.sprite.material.color.setHex(color);
    return f;
  }

  addDecal(pos, size, opacity = 0.85, life = 120) {
    const d = this.decals.acquire();
    if (!d) return null;
    d.life = life;
    d.fade = opacity;
    d.mesh.position.copy(pos);
    d.mesh.rotation.y = this.rng.float() * Math.PI * 2;
    d.mesh.scale.setScalar(size * (0.8 + this.rng.float() * 0.4));
    d.mat.opacity = opacity;
    return d;
  }

  /**
   * A full air-burst intercept: fireball, shell, embers, debris, smoke ball
   * and a lingering pall of grey.
   */
  explode(pos, {
    radius = 26,
    intensity = 1,
    debrisCount = 22,
    velocity = null,
    kind = 'intercept'
  } = {}) {
    const alt = pos.y;
    const thin = saturate(1 - airDensity(alt) / SEA_LEVEL_DENSITY);

    const fb = this.fireballs.acquire();
    if (fb) {
      fb.life = lerp(0.9, 1.5, thin) * (0.8 + intensity * 0.4);
      fb.radius = radius;
      fb.growth = lerp(2.1, 3.4, thin);
      fb.mesh.position.copy(pos);
      fb.mesh.scale.setScalar(radius * 0.35);
      fb.mat.uniforms.uSeed.value = this.rng.float();
      fb.mat.uniforms.uIntensity.value = 1.9 + intensity * 1.2;
      if (kind === 'decoy') {
        fb.mat.uniforms.uHot.value.setRGB(1.0, 0.98, 0.9);
        fb.mat.uniforms.uMid.value.setRGB(0.95, 0.75, 0.35);
        fb.mat.uniforms.uCool.value.setRGB(0.2, 0.16, 0.12);
      } else {
        fb.mat.uniforms.uHot.value.setRGB(1.0, 0.96, 0.82);
        fb.mat.uniforms.uMid.value.setRGB(1.0, 0.5, 0.13);
        fb.mat.uniforms.uCool.value.setRGB(0.26, 0.09, 0.04);
      }
    }

    const sw = this.shockwaves.acquire();
    if (sw) {
      sw.life = 0.85;
      sw.radius = radius * lerp(4.2, 7.5, thin);
      sw.mesh.position.copy(pos);
      sw.mesh.scale.setScalar(radius * 0.4);
      sw.mat.uniforms.uStrength.value = lerp(0.9, 0.35, thin) * intensity;
    }

    this.flash(pos, {
      power: 2600 * intensity,
      size: radius * 2.6,
      life: 0.55,
      color: kind === 'decoy' ? 0xfff0c0 : 0xffa050
    });

    // Fireball smoke ball -> lingering pall.
    const puffs = Math.floor(46 * intensity * settings.quality.groundDetail + 14);
    for (let i = 0; i < puffs; i++) {
      _v1.copy(pos);
      _v2.set(this.rng.spread(1), this.rng.spread(1), this.rng.spread(1))
        .normalize()
        .multiplyScalar(radius * (0.5 + this.rng.float() * 1.5));
      if (velocity) _v2.addScaledVector(velocity, 0.1);
      this.smoke.spawn(_v1, _v2, {
        life: lerp(5, 16, thin) * (0.7 + this.rng.float() * 0.7),
        sizeStart: radius * 0.35,
        sizeEnd: radius * (1.6 + this.rng.float() * 2.2),
        alpha: 0.7,
        color: _col.setRGB(0.30, 0.29, 0.28).lerp(new THREE.Color(0.8, 0.79, 0.78), this.rng.float() * 0.6),
        drag: lerp(1.4, 0.3, thin),
        buoyancy: lerp(1.2, 0.05, thin),
        seed: this.rng.float()
      });
    }
    // Hot inner puffs.
    for (let i = 0; i < Math.floor(26 * intensity); i++) {
      _v2.set(this.rng.spread(1), this.rng.spread(1), this.rng.spread(1))
        .normalize()
        .multiplyScalar(radius * (0.6 + this.rng.float() * 2.0));
      this.fire.spawn(pos, _v2, {
        life: 0.4 + this.rng.float() * 0.5,
        sizeStart: radius * 0.4,
        sizeEnd: radius * 1.1,
        alpha: 0.8,
        color: _col.setRGB(1.0, 0.62, 0.24),
        drag: 1.8,
        buoyancy: 0.4,
        seed: this.rng.float()
      });
    }

    this.sparkBurst(pos, 90 * intensity, radius * 3.2, 2.2);
    this.spawnDebris(pos, debrisCount, radius * 2.6, velocity);

    return { fireball: fb, shockwave: sw };
  }

  /** Ground impact: dirt column, scorch decal, low dust ring. */
  groundImpact(pos, { radius = 34, intensity = 1.4 } = {}) {
    this.explode(pos, { radius: radius * 0.7, intensity, debrisCount: 34, kind: 'impact' });
    this.groundDust(pos, radius * 2.2, radius * 1.2);
    this.addDecal(_v3.set(pos.x, pos.y + 0.04, pos.z), radius * 0.9, 0.95, 1e6);
    // Dirt column.
    for (let i = 0; i < 40; i++) {
      _v1.copy(pos);
      _v1.x += this.rng.spread(radius * 0.25);
      _v1.z += this.rng.spread(radius * 0.25);
      _v2.set(this.rng.spread(0.5), 1.6 + this.rng.float() * 1.6, this.rng.spread(0.5))
        .multiplyScalar(radius * (0.5 + this.rng.float() * 0.9));
      this.smoke.spawn(_v1, _v2, {
        life: 5 + this.rng.float() * 4,
        sizeStart: radius * 0.2,
        sizeEnd: radius * (1.0 + this.rng.float()),
        alpha: 0.72,
        color: _col.setRGB(0.55, 0.47, 0.36),
        drag: 1.2,
        buoyancy: 0.8,
        seed: this.rng.float()
      });
    }
  }

  spawnDebris(pos, count, speed, inherit = null) {
    for (let i = 0; i < count; i++) {
      const d = this.debris.acquire();
      if (!d) break;
      d.pos.copy(pos);
      d.vel
        .set(this.rng.spread(1), this.rng.spread(1), this.rng.spread(1))
        .normalize()
        .multiplyScalar(speed * (0.25 + this.rng.float() * 0.9));
      if (inherit) d.vel.addScaledVector(inherit, 0.35);
      d.spin.set(this.rng.spread(9), this.rng.spread(9), this.rng.spread(9));
      d.quat.set(this.rng.spread(1), this.rng.spread(1), this.rng.spread(1), this.rng.float()).normalize();
      d.life = 4.5 + this.rng.float() * 5;
      d.size = 0.35 + this.rng.float() * 1.5;
      d.smokes = this.rng.bool(0.55);
      d.heat = 1;
    }
  }

  /** Bright decoy flare dropped by a threat bus. */
  dropFlare(pos, vel) {
    const f = this.flares.acquire();
    if (!f) return null;
    f.pos.copy(pos);
    f.vel.copy(vel).multiplyScalar(0.55);
    f.vel.x += this.rng.spread(24);
    f.vel.y += this.rng.spread(14);
    f.vel.z += this.rng.spread(24);
    f.life = 5.5 + this.rng.float() * 3;
    f.size = 7 + this.rng.float() * 5;
    return f;
  }

  addShake(amount) {
    if (settings.reducedMotion) amount *= 0.18;
    this.shake = Math.min(1.4, this.shake + amount);
  }

  /** Camera shake offset for this frame (applied by the player controller). */
  sampleShake(t, out = new THREE.Vector3()) {
    if (this.shake < 0.001) return out.set(0, 0, 0);
    const s = this.shake * this.shake;
    const a = t * 34 + this.shakeSeed;
    out.set(Math.sin(a * 1.7) * 0.6 + Math.sin(a * 4.3) * 0.4, Math.sin(a * 2.3 + 1.7) * 0.7, Math.sin(a * 3.1 + 0.6) * 0.35);
    out.multiplyScalar(s * 0.22);
    return out;
  }

  /* ================================================================ *
   * Frame update
   * ================================================================ */

  update(dt, ctx) {
    const camera = ctx?.camera || this.camera;
    const pr = ctx?.pixelRatio ?? 1;

    // Sunlight direction in view space so smoke shading tracks the sun.
    if (ctx?.weather) {
      this.sunDirView
        .copy(ctx.weather.sunDirection)
        .transformDirection(camera.matrixWorldInverse);
      const p = ctx.weather.preset;
      this.smoke.uniforms.uSunColor.value.set(p.sunColor).multiplyScalar(lerp(0.25, 1.15, p.sunLight / 3.5));
      this.smoke.uniforms.uAmbient.value.set(p.hemiSky).multiplyScalar(0.25 + p.ambient * 0.8);
      this.smoke.uniforms.uSunDirView.value.copy(this.sunDirView);
      this.fire.uniforms.uSunDirView.value.copy(this.sunDirView);
      this.fire.uniforms.uSunColor.value.setRGB(1, 1, 1);
      this.fire.uniforms.uAmbient.value.setRGB(1, 1, 1);
      this.wind.copy(ctx.weather.windDir).multiplyScalar(ctx.weather.windSpeed * 0.55);
    }
    this.smoke.uniforms.uWind.value.copy(this.wind);
    this.fire.uniforms.uWind.value.copy(this.wind).multiplyScalar(0.4);

    // Exact projected-size scale: buffer height / (2 tan(fov/2)).
    const bufferHeight = (ctx?.viewportHeight ?? 900) * pr;
    const heightScale = bufferHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5));
    this.smoke.uniforms.uHeightScale.value = heightScale;
    this.fire.uniforms.uHeightScale.value = heightScale;
    this.sparks.uniforms.uHeightScale.value = heightScale;
    this.smoke.uniforms.uPixelRatio.value = pr;
    this.fire.uniforms.uPixelRatio.value = pr;

    this.smoke.update(dt);
    this.fire.update(dt);
    this.sparks.update(dt);

    this._updateFireballs(dt);
    this._updateShockwaves(dt);
    this._updateDebris(dt);
    this._updateDecals(dt);
    this._updateFlashes(dt);
    this._updateFlares(dt);

    this.shake = damp(this.shake, 0, 2.6, dt);
    if (this.shake < 0.001) this.shake = 0;
  }

  _updateFireballs(dt) {
    this.fireballs.forEachActive((o) => {
      o.age += dt;
      const t = o.age / o.life;
      if (t >= 1) {
        o.mesh.visible = false;
        this.fireballs.release(o);
        return;
      }
      o.mat.uniforms.uAge.value = t;
      const s = o.radius * (0.35 + Math.pow(t, 0.55) * o.growth);
      o.mesh.scale.setScalar(s);
    });
  }

  _updateShockwaves(dt) {
    this.shockwaves.forEachActive((o) => {
      o.age += dt;
      const t = o.age / o.life;
      if (t >= 1) {
        o.mesh.visible = false;
        this.shockwaves.release(o);
        return;
      }
      o.mat.uniforms.uAge.value = t;
      o.mesh.scale.setScalar(lerp(o.radius * 0.12, o.radius, Math.pow(t, 0.45)));
    });
  }

  _updateDebris(dt) {
    let dirty = false;
    this.debris.forEachActive((d) => {
      d.age += dt;
      if (d.age >= d.life || d.pos.y < -5) {
        _mat4.makeScale(0, 0, 0);
        this.debrisMesh.setMatrixAt(d.index, _mat4);
        this.debris.release(d);
        dirty = true;
        return;
      }
      d.vel.y -= GRAVITY * dt;
      d.vel.multiplyScalar(1 - Math.min(0.9, 0.55 * dt));
      d.pos.addScaledVector(d.vel, dt);
      if (d.pos.y < 0.2) {
        d.pos.y = 0.2;
        d.vel.y = Math.abs(d.vel.y) * 0.28;
        d.vel.x *= 0.6;
        d.vel.z *= 0.6;
        d.spin.multiplyScalar(0.5);
      }
      _quat.set(d.spin.x * dt * 0.5, d.spin.y * dt * 0.5, d.spin.z * dt * 0.5, 1).normalize();
      d.quat.multiply(_quat).normalize();
      const fade = saturate(1 - d.age / d.life);
      _scale.setScalar(d.size * (0.5 + fade * 0.5));
      _mat4.compose(d.pos, d.quat, _scale);
      this.debrisMesh.setMatrixAt(d.index, _mat4);
      d.heat = Math.max(0, d.heat - dt * 0.55);
      const h = d.heat * d.heat;
      this.debrisColor.setXYZ(d.index, 0.28 + h * 1.8, 0.26 + h * 0.6, 0.24 + h * 0.15);
      dirty = true;

      if (d.smokes) {
        d.smokeAcc += dt * 26;
        while (d.smokeAcc >= 1) {
          d.smokeAcc -= 1;
          _v2.set(this.rng.spread(1.4), this.rng.float() * 1.5, this.rng.spread(1.4));
          this.smoke.spawn(d.pos, _v2, {
            life: 1.6 + this.rng.float() * 1.6,
            sizeStart: 0.7,
            sizeEnd: 5 + this.rng.float() * 5,
            alpha: 0.4,
            color: _col.setRGB(0.32, 0.31, 0.3),
            drag: 1.6,
            buoyancy: 0.9,
            seed: this.rng.float()
          });
        }
      }
    });
    if (dirty) {
      this.debrisMesh.instanceMatrix.needsUpdate = true;
      this.debrisMesh.instanceColor.needsUpdate = true;
    }
  }

  _updateDecals(dt) {
    this.decals.forEachActive((d) => {
      d.age += dt;
      if (d.age >= d.life) {
        d.mesh.visible = false;
        this.decals.release(d);
        return;
      }
      const remaining = d.life - d.age;
      if (remaining < 6) d.mat.opacity = d.fade * (remaining / 6);
    });
  }

  _updateFlashes(dt) {
    this.flashes.forEachActive((f) => {
      f.age += dt;
      const t = f.age / f.life;
      if (t >= 1) {
        f.light.visible = false;
        f.sprite.visible = false;
        f.light.intensity = 0;
        this.flashes.release(f);
        return;
      }
      const k = Math.pow(1 - t, 2.4);
      f.light.intensity = f.power * k;
      f.sprite.material.opacity = k;
      f.sprite.scale.setScalar(f.size * (0.6 + t * 1.6));
    });
  }

  _updateFlares(dt) {
    this.flares.forEachActive((f) => {
      f.age += dt;
      const t = f.age / f.life;
      if (t >= 1 || f.pos.y < 0) {
        f.sprite.visible = false;
        this.flares.release(f);
        return;
      }
      f.vel.y -= GRAVITY * 0.55 * dt;
      f.vel.multiplyScalar(1 - Math.min(0.9, 0.9 * dt));
      f.pos.addScaledVector(f.vel, dt);
      f.sprite.position.copy(f.pos);
      const flick = 0.75 + Math.sin(f.age * 47 + f.__poolIndex) * 0.25;
      f.sprite.scale.setScalar(f.size * flick * (1 - t * 0.4));
      f.sprite.material.opacity = Math.pow(1 - t, 0.7) * flick;

      f.smokeAcc += dt * 42;
      while (f.smokeAcc >= 1) {
        f.smokeAcc -= 1;
        _v2.set(this.rng.spread(2), this.rng.spread(2), this.rng.spread(2));
        this.smoke.spawn(f.pos, _v2, {
          life: 2.4 + this.rng.float() * 2,
          sizeStart: 1.2,
          sizeEnd: 9,
          alpha: 0.42,
          color: _col.setRGB(0.85, 0.84, 0.83),
          drag: 1.1,
          buoyancy: 0.3,
          seed: this.rng.float()
        });
        this.sparks.spawn(f.pos, _v2.multiplyScalar(3), {
          life: 0.7,
          size: 0.4,
          color: _col.setRGB(1, 0.93, 0.7)
        });
      }
    });
  }

  reset() {
    this.smoke.clear();
    this.fire.clear();
    this.sparks.clear();
    this.fireballs.forEachActive((o) => {
      o.mesh.visible = false;
      this.fireballs.release(o);
    });
    this.shockwaves.forEachActive((o) => {
      o.mesh.visible = false;
      this.shockwaves.release(o);
    });
    this.flashes.forEachActive((f) => {
      f.light.visible = false;
      f.light.intensity = 0;
      f.sprite.visible = false;
      this.flashes.release(f);
    });
    this.flares.forEachActive((f) => {
      f.sprite.visible = false;
      this.flares.release(f);
    });
    _mat4.makeScale(0, 0, 0);
    this.debris.forEachActive((d) => {
      this.debrisMesh.setMatrixAt(d.index, _mat4);
      this.debris.release(d);
    });
    this.debrisMesh.instanceMatrix.needsUpdate = true;
    this.decals.forEachActive((d) => {
      d.mesh.visible = false;
      this.decals.release(d);
    });
    this.shake = 0;
  }

  get stats() {
    return {
      smoke: this.smoke.ring.count,
      fire: this.fire.ring.count,
      sparks: this.sparks.ring.count,
      debris: this.debris.activeCount,
      fireballs: this.fireballs.activeCount
    };
  }
}
