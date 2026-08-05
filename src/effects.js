// effects.js — pooled GPU particles, ribbon trails, flashes, debris, shockwaves,
// scorch decals, and composite effects (launch blasts, intercepts, impacts).
import * as THREE from 'three';
import { Pool, clamp, TAU } from './util.js';
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
attribute vec3 aCol0;
attribute vec3 aCol1;
uniform float uTime;
uniform float uScale;
varying float vAlpha;
varying vec3 vCol;
void main() {
  float age = uTime - aBirth;
  float t = age / max(aLife, 0.0001);
  if (t < 0.0 || t > 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    vCol = vec3(0.0);
    return;
  }
  vec3 pos = position + aVel * age + 0.5 * aAcc * age * age;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float size = mix(aSize0, aSize1, pow(t, 0.65));
  gl_PointSize = clamp(size * uScale / max(-mv.z, 0.5), 0.75, 300.0);
  float fadeIn = smoothstep(0.0, 0.07, t);
  float fadeOut = 1.0 - smoothstep(0.55, 1.0, t);
  vAlpha = aAlpha * fadeIn * fadeOut;
  vCol = mix(aCol0, aCol1, pow(t, 0.55));
  gl_Position = projectionMatrix * mv;
}
`;
const PARTICLE_FRAG = /* glsl */ `
precision mediump float;
uniform sampler2D uMap;
varying float vAlpha;
varying vec3 vCol;
void main() {
  vec4 tex = texture2D(uMap, gl_PointCoord);
  float a = tex.a * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vCol * tex.rgb, a);
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
      aAlpha: mk(1), aCol0: mk(3), aCol1: mk(3),
    };
    // park all particles as dead
    this.attrs.aBirth.array.fill(-1e9);
    for (const [name, attr] of Object.entries(this.attrs)) geo.setAttribute(name, attr);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
    this.uniforms = {
      uTime: { value: 0 },
      uScale: { value: 720 },
      uMap: { value: map },
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
  }
  /** spawn one particle; p = {pos, vel, acc, life, size0, size1, alpha, col0, col1, delay} */
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
  float w = aWidth * (0.45 + 2.4 * t);
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
  float a = edge * fade * uOpacity * vFade * (0.55 + 0.45 * n);
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
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
  configure({ color = 0xffffff, life = 10, opacity = 0.7 }) {
    this.uniforms.uColor.value.set(color);
    this.uniforms.uLife.value = life;
    this.uniforms.uOpacity.value = opacity;
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

// ============================================================ effects manager
export function createEffects(ctx) {
  const { scene, textures } = ctx;
  const puffTex = textures.softPuff();
  const flareTex = textures.hardFlare();
  const noiseTex = textures.noiseTex();

  const smoke = new ParticleSystem(scene, puffTex, 4096, false);
  const fire = new ParticleSystem(scene, flareTex, 3072, true);

  const trailPool = new Pool(() => new TrailRibbon(scene, noiseTex), 26);

  // ---- flash sprites
  const flashPool = new Pool(() => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flareTex, color: 0xffffff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    s.visible = false;
    scene.add(s);
    return { sprite: s, t: 0, dur: 0.3, size: 10, active: false };
  }, 16);
  const activeFlashes = [];

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
    });
  }
  const _m4 = new THREE.Matrix4();
  const _q4 = new THREE.Quaternion();
  const _s3 = new THREE.Vector3();
  const ZERO_SCALE = new THREE.Vector3(0.0001, 0.0001, 0.0001);

  // ---- shockwave rings
  const ringPool = new Pool(() => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 1.0, 48),
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

  function shakeFromDistance(pos, base) {
    const d = pos.distanceTo(ctx.camera.position);
    const amt = base * clamp(1 - d / 900, 0, 1);
    if (amt > 0.02) ctx.player?.addShake(amt);
  }

  function flash(pos, size, dur = 0.25, color = 0xfff2d8) {
    const f = flashPool.acquire();
    if (!f) return;
    f.sprite.position.copy(pos);
    f.sprite.material.color.set(color);
    f.sprite.material.opacity = 1;
    f.sprite.scale.setScalar(size * 0.4);
    f.sprite.visible = true;
    f.t = 0; f.dur = dur; f.size = size;
    f.active = true;
    activeFlashes.push(f);
  }

  function ring(pos, maxR, dur = 0.9) {
    const r = ringPool.acquire();
    if (!r) return;
    r.mesh.position.set(pos.x, Math.max(terrainHeight(pos.x, pos.z), 0) + 0.35, pos.z);
    r.mesh.scale.setScalar(0.5);
    r.mesh.material.opacity = 0.55;
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

  function throwDebris(pos, count, speed, glow = 0.6) {
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
      d.scale = ctx.vrng.range(0.3, 1.1);
      d.life = ctx.vrng.range(2.5, 5);
      d.age = 0;
      d.glow = glow;
      if (++thrown >= count) break;
    }
  }

  // ============================ composite effects ============================

  function launchBlast(pos, dir, scale = 1) {
    const ground = Math.max(terrainHeight(pos.x, pos.z), 0);
    flash(pos, 26 * scale, 0.22, 0xffe6b0);
    // exhaust fireball along -dir
    for (let i = 0; i < 22; i++) {
      _v.copy(dir).multiplyScalar(-ctx.vrng.range(4, 26) * scale).add(pos);
      fire.spawn(now, {
        pos: _v,
        vel: _v2.set(ctx.vrng.range(-4, 4), ctx.vrng.range(-2, 5), ctx.vrng.range(-4, 4)).addScaledVector(dir, -ctx.vrng.range(6, 20)),
        acc: { x: 0, y: 4, z: 0 },
        life: ctx.vrng.range(0.25, 0.7),
        size0: 3.5 * scale, size1: 10 * scale,
        alpha: 0.9,
        col0: 0xffdf9e, col1: 0xff7a2a,
      });
    }
    // billowing launch smoke column
    for (let i = 0; i < 46; i++) {
      _v.set(pos.x + ctx.vrng.range(-2, 2) * scale, ground + ctx.vrng.range(0.5, 3), pos.z + ctx.vrng.range(-2, 2) * scale);
      const a = ctx.vrng.next() * TAU;
      smoke.spawn(now, {
        pos: _v,
        vel: { x: Math.cos(a) * ctx.vrng.range(2, 9) * scale, y: ctx.vrng.range(1.5, 7), z: Math.sin(a) * ctx.vrng.range(2, 9) * scale },
        acc: { x: ctx.world.wind.x * 0.14, y: ctx.vrng.range(0.4, 1.2), z: ctx.world.wind.z * 0.14 },
        life: ctx.vrng.range(3.5, 9),
        size0: 2.5 * scale, size1: 16 * scale,
        alpha: ctx.vrng.range(0.35, 0.6),
        col0: 0xd9d2c6, col1: 0x8e887e,
        delay: ctx.vrng.range(0, 0.3),
      });
    }
    // ground dust ring kicked up by exhaust
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * TAU;
      _v.set(pos.x + Math.cos(a) * 2 * scale, ground + 0.4, pos.z + Math.sin(a) * 2 * scale);
      smoke.spawn(now, {
        pos: _v,
        vel: { x: Math.cos(a) * ctx.vrng.range(10, 22) * scale, y: ctx.vrng.range(0.6, 2.4), z: Math.sin(a) * ctx.vrng.range(10, 22) * scale },
        acc: { x: 0, y: -0.5, z: 0 },
        life: ctx.vrng.range(1.4, 3.2),
        size0: 2 * scale, size1: 11 * scale,
        alpha: 0.5,
        col0: 0xcbb590, col1: 0x9d8a68,
      });
    }
    ring(pos, 26 * scale, 0.8);
    shakeFromDistance(pos, 0.55 * scale);
    ctx.events.emit('fx-launch', { pos: pos.clone(), scale });
  }

  function explosionAir(pos, scale = 1) {
    flash(pos, 42 * scale, 0.3, 0xfff0cf);
    for (let i = 0; i < 26; i++) {
      _v.set(pos.x + ctx.vrng.gauss() * 3 * scale, pos.y + ctx.vrng.gauss() * 3 * scale, pos.z + ctx.vrng.gauss() * 3 * scale);
      fire.spawn(now, {
        pos: _v,
        vel: _v2.set(ctx.vrng.gauss(), ctx.vrng.gauss(), ctx.vrng.gauss()).multiplyScalar(14 * scale),
        acc: { x: 0, y: 3, z: 0 },
        life: ctx.vrng.range(0.3, 0.9),
        size0: 4 * scale, size1: 14 * scale,
        alpha: 0.95,
        col0: 0xffe8b0, col1: 0xff5f1f,
      });
    }
    for (let i = 0; i < 20; i++) {
      _v.set(pos.x + ctx.vrng.gauss() * 4 * scale, pos.y + ctx.vrng.gauss() * 4 * scale, pos.z + ctx.vrng.gauss() * 4 * scale);
      smoke.spawn(now, {
        pos: _v,
        vel: _v2.set(ctx.vrng.gauss(), ctx.vrng.gauss() * 0.6 + 0.5, ctx.vrng.gauss()).multiplyScalar(6 * scale),
        acc: { x: ctx.world.wind.x * 0.2, y: 0.8, z: ctx.world.wind.z * 0.2 },
        life: ctx.vrng.range(2.5, 7),
        size0: 5 * scale, size1: 20 * scale,
        alpha: 0.42,
        col0: 0x6b6660, col1: 0x3c3a38,
        delay: 0.08,
      });
    }
    // sparks
    for (let i = 0; i < 40; i++) {
      fire.spawn(now, {
        pos,
        vel: _v2.set(ctx.vrng.gauss(), ctx.vrng.gauss(), ctx.vrng.gauss()).multiplyScalar(52 * scale),
        acc: { x: 0, y: -22, z: 0 },
        life: ctx.vrng.range(0.5, 1.6),
        size0: 1.1 * scale, size1: 0.3,
        alpha: 0.95,
        col0: 0xffe2a8, col1: 0xff6a22,
      });
    }
    throwDebris(pos, Math.round(12 * scale), 44 * scale, 1);
    shakeFromDistance(pos, 0.5 * scale);
    ctx.events.emit('fx-explosion', { pos: pos.clone(), scale, air: true });
  }

  function explosionGround(pos, scale = 1) {
    const ground = Math.max(terrainHeight(pos.x, pos.z), 0);
    const gpos = _v.set(pos.x, ground + 1.5, pos.z).clone();
    flash(gpos, 50 * scale, 0.35, 0xffedc8);
    for (let i = 0; i < 30; i++) {
      _v.set(gpos.x + ctx.vrng.gauss() * 3 * scale, ground + ctx.vrng.range(0.5, 5) * scale, gpos.z + ctx.vrng.gauss() * 3 * scale);
      fire.spawn(now, {
        pos: _v,
        vel: _v2.set(ctx.vrng.gauss() * 9, ctx.vrng.range(10, 34), ctx.vrng.gauss() * 9).multiplyScalar(scale),
        acc: { x: 0, y: -6, z: 0 },
        life: ctx.vrng.range(0.35, 1.1),
        size0: 5 * scale, size1: 16 * scale,
        alpha: 0.95,
        col0: 0xffe0a0, col1: 0xd94f16,
      });
    }
    // dark smoke column
    for (let i = 0; i < 34; i++) {
      _v.set(gpos.x + ctx.vrng.gauss() * 2.5 * scale, ground + ctx.vrng.range(1, 8) * scale, gpos.z + ctx.vrng.gauss() * 2.5 * scale);
      smoke.spawn(now, {
        pos: _v,
        vel: { x: ctx.vrng.gauss() * 3, y: ctx.vrng.range(5, 14) * scale, z: ctx.vrng.gauss() * 3 },
        acc: { x: ctx.world.wind.x * 0.25, y: -0.35, z: ctx.world.wind.z * 0.25 },
        life: ctx.vrng.range(4, 11),
        size0: 5 * scale, size1: 26 * scale,
        alpha: 0.5,
        col0: 0x3f3a34, col1: 0x23211f,
        delay: ctx.vrng.range(0, 0.35),
      });
    }
    // dust skirt
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU + ctx.vrng.range(-0.1, 0.1);
      _v.set(gpos.x + Math.cos(a) * 3 * scale, ground + 0.6, gpos.z + Math.sin(a) * 3 * scale);
      smoke.spawn(now, {
        pos: _v,
        vel: { x: Math.cos(a) * ctx.vrng.range(14, 30) * scale, y: ctx.vrng.range(1, 4), z: Math.sin(a) * ctx.vrng.range(14, 30) * scale },
        acc: { x: 0, y: -1.2, z: 0 },
        life: ctx.vrng.range(1.6, 3.6),
        size0: 3 * scale, size1: 14 * scale,
        alpha: 0.55,
        col0: 0xc4ae8a, col1: 0x8f7c5e,
      });
    }
    throwDebris(gpos, Math.round(20 * scale), 52 * scale, 1);
    ring(gpos, 44 * scale, 1.1);
    scorchAt(gpos, 14 * scale);
    shakeFromDistance(gpos, 0.75 * scale);
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
    throwDebris(pos, 2, 16, 0);
  }

  function muzzlePuff(pos, scale = 1) {
    for (let i = 0; i < 8; i++) {
      smoke.spawn(now, {
        pos,
        vel: { x: ctx.vrng.gauss() * 3, y: ctx.vrng.range(1, 3), z: ctx.vrng.gauss() * 3 },
        acc: { x: ctx.world.wind.x * 0.2, y: 0.4, z: ctx.world.wind.z * 0.2 },
        life: ctx.vrng.range(1.5, 3.5),
        size0: 1.5 * scale, size1: 7 * scale,
        alpha: 0.4,
        col0: 0xcfc8bc, col1: 0x8e887e,
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
      smoke.setTime(now);
      fire.setTime(now);
      smoke.commit();
      fire.commit();
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
      // wind uniform
      for (const tr of trailPool.used) tr.uniforms.uWind.value.copy(ctx.world.wind);

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
        r.mesh.scale.setScalar(0.5 + k * r.maxR);
        r.mesh.material.opacity = 0.5 * Math.pow(1 - k, 1.7);
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
      let anyDebris = false;
      for (let i = 0; i < DEBRIS_N; i++) {
        const d = debris[i];
        if (!d.alive) {
          _m4.compose(d.pos, _q4.identity(), ZERO_SCALE);
          debrisMesh.setMatrixAt(i, _m4);
          continue;
        }
        anyDebris = true;
        d.age += dt;
        d.vel.y -= 22 * dt;
        d.pos.addScaledVector(d.vel, dt);
        d.rot.x += d.angVel.x * dt;
        d.rot.y += d.angVel.y * dt;
        d.rot.z += d.angVel.z * dt;
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
      void anyDebris;
    },
    setViewport(h, fov) {
      smoke.setViewport(h, fov);
      fire.setViewport(h, fov);
    },
    clearAll() {
      for (const f of [...activeFlashes]) { f.sprite.visible = false; flashPool.release(f); }
      activeFlashes.length = 0;
      for (const r of [...activeRings]) { r.mesh.visible = false; ringPool.release(r); }
      activeRings.length = 0;
      for (const d of debris) d.alive = false;
      for (const { t } of fadingTrails) { t.reset(); trailPool.release(t); }
      fadingTrails.length = 0;
    },
  };
  const fadingTrails = [];
  return api;
}
