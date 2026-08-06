// effects.js — pooled visual effects: GPU-simulated particles (smoke/fire/sparks/dust),
// CPU ribbon trails, shockwave rings, instanced debris, flashes, decals, fire columns.
// Everything is object-pooled; nothing allocates during gameplay.
import * as THREE from 'three';
import { softCircleTexture, smokeTexture, scorchTexture, rngFx, clamp, lerp } from './utils.js';

const _v1 = new THREE.Vector3(); const _v2 = new THREE.Vector3(); const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _white = new THREE.Color(1, 1, 1);

// ================================================================ particle pool (GPU-integrated)
// Analytic motion in the vertex shader: pos = p0 + v*(1-e^{-kt})/k + 0.5*g*t^2 + wind*t
class ParticlePool {
  constructor(scene, { capacity, texture, additive, name }) {
    this.capacity = capacity;
    this.cursor = 0;
    this.name = name;

    const geo = new THREE.BufferGeometry();
    const mk = (n) => new THREE.BufferAttribute(new Float32Array(capacity * n), n).setUsage(THREE.DynamicDrawUsage);
    this.aPos = mk(3); this.aVel = mk(3);
    this.aTime = mk(2);       // birth, life
    this.aSize = mk(2);       // size0, size1
    this.aCol = mk(3);        // start color
    this.aMisc = mk(4);       // damp k, gravity, windFactor, rotSpeed
    this.aAlpha = mk(1);
    geo.setAttribute('position', this.aPos);
    geo.setAttribute('aVel', this.aVel);
    geo.setAttribute('aTime', this.aTime);
    geo.setAttribute('aSize', this.aSize);
    geo.setAttribute('aCol', this.aCol);
    geo.setAttribute('aMisc', this.aMisc);
    geo.setAttribute('aAlpha', this.aAlpha);
    // park all particles in the past so they render dead
    for (let i = 0; i < capacity; i++) { this.aTime.array[i * 2] = -1e6; this.aTime.array[i * 2 + 1] = 1; }
    this.geo = geo;

    this.uniforms = {
      uTime: { value: 0 },
      uMap: { value: texture },
      uPointScale: { value: 700 },
      uWind: { value: new THREE.Vector3(1.6, 0, 0.7) },
      uAmbient: { value: new THREE.Color(1, 1, 1) },
      uFogColor: { value: new THREE.Color(0.7, 0.75, 0.85) },
      uFogDensity: { value: 0.00005 },
      uAdditive: { value: additive ? 1 : 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: /* glsl */`
        attribute vec3 aVel;
        attribute vec2 aTime;
        attribute vec2 aSize;
        attribute vec3 aCol;
        attribute vec4 aMisc;
        attribute float aAlpha;
        uniform float uTime;
        uniform float uPointScale;
        uniform vec3 uWind;
        uniform float uAdditive;
        varying vec3 vCol;
        varying float vAlpha;
        varying float vRot;
        varying float vFog;
        varying float vT;
        uniform float uFogDensity;
        void main() {
          float age = uTime - aTime.x;
          float t = clamp(age / aTime.y, 0.0, 1.0);
          vT = t;
          float k = max(aMisc.x, 0.0001);
          vec3 disp = aVel * (1.0 - exp(-k * age)) / k;
          vec3 p = position + disp;
          p.y -= 0.5 * 9.81 * aMisc.y * age * age;
          p += uWind * aMisc.z * age;
          if (p.y < 0.05 && aMisc.y > 0.0) p.y = 0.05;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float size = mix(aSize.x, aSize.y, pow(t, 0.65));
          gl_PointSize = clamp(size * uPointScale / max(-mv.z, 1.0), 0.0, 1400.0);
          gl_Position = projectionMatrix * mv;
          // alpha curve: quick in, smooth out
          float fadeIn = smoothstep(0.0, 0.07, t);
          float fadeOut = 1.0 - smoothstep(0.55, 1.0, t);
          vAlpha = aAlpha * fadeIn * fadeOut * step(age, aTime.y) * step(0.0, age);
          vCol = aCol;
          vRot = aMisc.w * age;
          float dist = length(mv.xyz);
          vFog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist * 2000.0);
          // smoke dissolves at extreme close range so puffs never white-out the camera
          if (uAdditive < 0.5) vAlpha *= smoothstep(6.0, 26.0, dist);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap;
        uniform vec3 uAmbient;
        uniform vec3 uFogColor;
        uniform float uAdditive;
        varying vec3 vCol;
        varying float vAlpha;
        varying float vRot;
        varying float vFog;
        varying float vT;
        void main() {
          if (vAlpha < 0.004) discard;
          vec2 uv = gl_PointCoord - 0.5;
          float c = cos(vRot), s = sin(vRot);
          uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;
          vec4 tex = texture2D(uMap, uv);
          vec3 col = vCol;
          if (uAdditive < 0.5) {
            col *= uAmbient;                       // smoke is lit by ambient
            col = mix(col, uFogColor, vFog * 0.85);
          } else {
            // hot particles cool over life: white->color->dark
            col = mix(col * 2.2, col * 0.45, pow(vT, 0.75));
            col *= (1.0 - vFog * 0.65);
          }
          gl_FragColor = vec4(col, tex.a * vAlpha);
          if (gl_FragColor.a < 0.003) discard;
        }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 12 : 11;
    scene.add(this.points);
    this._touched = false;
  }

  emit(now, { pos, vel, life = 2, size0 = 1, size1 = 3, color = 0xffffff, alpha = 0.7, damp = 0.9, gravity = 0, wind = 0.35, rot = 0.6 }) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    const c = typeof color === 'number' ? _tmpColor.setHex(color) : color;
    this.aPos.array[i * 3] = pos.x; this.aPos.array[i * 3 + 1] = pos.y; this.aPos.array[i * 3 + 2] = pos.z;
    this.aVel.array[i * 3] = vel.x; this.aVel.array[i * 3 + 1] = vel.y; this.aVel.array[i * 3 + 2] = vel.z;
    this.aTime.array[i * 2] = now; this.aTime.array[i * 2 + 1] = life;
    this.aSize.array[i * 2] = size0; this.aSize.array[i * 2 + 1] = size1;
    this.aCol.array[i * 3] = c.r; this.aCol.array[i * 3 + 1] = c.g; this.aCol.array[i * 3 + 2] = c.b;
    this.aMisc.array[i * 4] = damp; this.aMisc.array[i * 4 + 1] = gravity;
    this.aMisc.array[i * 4 + 2] = wind; this.aMisc.array[i * 4 + 3] = (rngFx.next() - 0.5) * rot * 2;
    this.aAlpha.array[i] = alpha;
    this._touched = true;
  }

  flush() {
    if (!this._touched) return;
    // simple full-buffer refresh only on frames with emissions
    this.aPos.needsUpdate = true; this.aVel.needsUpdate = true; this.aTime.needsUpdate = true;
    this.aSize.needsUpdate = true; this.aCol.needsUpdate = true; this.aMisc.needsUpdate = true;
    this.aAlpha.needsUpdate = true;
    this._touched = false;
  }

  clear() {
    for (let i = 0; i < this.capacity; i++) this.aTime.array[i * 2] = -1e6;
    this.aTime.needsUpdate = true;
  }
}
const _tmpColor = new THREE.Color();

// ================================================================ ribbon trails
const TRAIL_MAX = 170;
class Trail {
  constructor() {
    this.pos = new Float32Array(TRAIL_MAX * 3);
    this.time = new Float32Array(TRAIL_MAX);
    this.width = new Float32Array(TRAIL_MAX);
    this.alpha = new Float32Array(TRAIL_MAX);
    this.count = 0;
    this.head = 0; // index of newest
    this.active = false;
    this.released = false;
    this.fadeTime = 9;
    this.spacing = 6;
    this.color = new THREE.Color(1, 1, 1);

    const geo = new THREE.BufferGeometry();
    this.vPos = new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.vA = new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 2), 1).setUsage(THREE.DynamicDrawUsage);
    this.vU = new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 2), 1).setUsage(THREE.DynamicDrawUsage);
    this.vSide = new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 2), 1);
    for (let i = 0; i < TRAIL_MAX; i++) { this.vSide.array[i * 2] = 1; this.vSide.array[i * 2 + 1] = -1; }
    const idx = [];
    for (let i = 0; i < TRAIL_MAX - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      idx.push(a, b, c, b, d, c);
    }
    geo.setAttribute('position', this.vPos);
    geo.setAttribute('aA', this.vA);
    geo.setAttribute('aU', this.vU);
    geo.setAttribute('aSide', this.vSide);
    geo.setIndex(idx);
    geo.setDrawRange(0, 0);
    this.geo = geo;
  }
}

class TrailPool {
  constructor(scene, count = 26, { additive = false, color = [1, 1, 1] } = {}) {
    this.additive = additive;
    this.uniforms = {
      uColorMul: { value: new THREE.Color(color[0], color[1], color[2]) },
      uFogColor: { value: new THREE.Color(0.7, 0.75, 0.85) },
      uFogDensity: { value: 0.00005 },
    };
    this.mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: /* glsl */`
        attribute float aA;
        attribute float aSide;
        attribute float aU;
        varying float vA;
        varying float vSide;
        varying float vU;
        varying float vFog;
        uniform float uFogDensity;
        void main() {
          vA = aA; vSide = aSide; vU = aU;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float dist = length(mv.xyz);
          vFog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist * 2000.0);
          // dissolve only at extreme close range (walking through a drifting ribbon)
          vA *= smoothstep(10.0, 48.0, dist);
        }`,
      fragmentShader: /* glsl */`
        varying float vA;
        varying float vSide;
        varying float vU;
        varying float vFog;
        uniform vec3 uColorMul;
        uniform vec3 uFogColor;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p){
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }
        void main() {
          float edge = 1.0 - abs(vSide);
          ${additive
            ? `float a = vA * smoothstep(0.0, 0.55, edge);
          vec3 col = uColorMul * (1.0 - vFog * 0.7);`
            : `// wispy structure: 2-octave noise along the ribbon breaks up flat alpha
          float n = vnoise(vec2(vU, vSide * 1.4)) * 0.65 + vnoise(vec2(vU * 2.7 + 13.1, vSide * 3.1)) * 0.35;
          float mask = 0.62 + 0.76 * (n - 0.5);
          float a = vA * smoothstep(0.0, 0.42 + 0.35 * n, edge) * mask;
          vec3 col = mix(uColorMul, uFogColor, vFog * 0.8);`}
          gl_FragColor = vec4(col, a);
          if (a < 0.004) discard;
        }`,
    });
    this.pool = [];
    this.activeList = [];
    for (let i = 0; i < count; i++) {
      const t = new Trail();
      t.mesh = new THREE.Mesh(t.geo, this.mat);
      t.mesh.frustumCulled = false;
      t.mesh.visible = false;
      t.mesh.renderOrder = 10;
      scene.add(t.mesh);
      this.pool.push(t);
    }
  }

  acquire({ color = 0xffffff, fadeTime = 9, spacing = 6 } = {}) {
    let t = this.pool.find((x) => !x.active);
    if (!t) { // steal oldest released
      t = this.activeList.find((x) => x.released) || this.activeList[0];
      this._deactivate(t);
    }
    t.active = true; t.released = false;
    t.count = 0; t.head = 0;
    t.fadeTime = fadeTime; t.spacing = spacing;
    t.color.setHex(color);
    t.mesh.visible = true;
    t.pool = this;
    this.activeList.push(t);
    return t;
  }

  push(t, now, pos, width, alpha) {
    // skip if too close to previous point
    if (t.count > 0) {
      const h = ((t.head - 1) + TRAIL_MAX) % TRAIL_MAX;
      _v1.set(t.pos[h * 3], t.pos[h * 3 + 1], t.pos[h * 3 + 2]);
      if (_v1.distanceTo(pos) < t.spacing) {
        return;
      }
    }
    const i = t.head;
    t.head = (t.head + 1) % TRAIL_MAX;
    t.count = Math.min(t.count + 1, TRAIL_MAX);
    t.pos[i * 3] = pos.x; t.pos[i * 3 + 1] = pos.y; t.pos[i * 3 + 2] = pos.z;
    t.time[i] = now;
    t.width[i] = width;
    t.alpha[i] = alpha;
  }

  release(t) { if (t) t.released = true; }

  _deactivate(t) {
    t.active = false; t.released = false; t.count = 0;
    t.mesh.visible = false;
    const i = this.activeList.indexOf(t);
    if (i >= 0) this.activeList.splice(i, 1);
  }

  update(now, camera) {
    const camPos = camera.position;
    for (let li = this.activeList.length - 1; li >= 0; li--) {
      const t = this.activeList[li];
      const visiblePoints = this._buildRibbon(t, now, camPos);
      if (t.released && visiblePoints === 0) this._deactivate(t);
    }
  }

  _buildRibbon(t, now, camPos) {
    const n = t.count;
    if (n < 2) { t.geo.setDrawRange(0, 0); return t.released ? 0 : 1; }
    let vi = 0;
    let visible = 0;
    let along = 0;
    // iterate oldest -> newest
    const start = (t.head - n + TRAIL_MAX) % TRAIL_MAX;
    for (let k = 0; k < n; k++) {
      const i = (start + k) % TRAIL_MAX;
      const age = now - t.time[i];
      const fade = clamp(1 - age / t.fadeTime, 0, 1);
      _v1.set(t.pos[i * 3], t.pos[i * 3 + 1], t.pos[i * 3 + 2]);
      // direction along trail
      const iNext = (start + Math.min(k + 1, n - 1)) % TRAIL_MAX;
      const iPrev = (start + Math.max(k - 1, 0)) % TRAIL_MAX;
      _v2.set(t.pos[iNext * 3] - t.pos[iPrev * 3], t.pos[iNext * 3 + 1] - t.pos[iPrev * 3 + 1], t.pos[iNext * 3 + 2] - t.pos[iPrev * 3 + 2]);
      if (_v2.lengthSq() < 1e-6) _v2.set(0, 1, 0);
      along += _v2.length() * 0.5 * (k > 0 ? 1 : 0);
      _v3.subVectors(_v1, camPos);
      const side = _v2.cross(_v3).normalize();
      // billow with age (capped) + per-point jitter so ribbons don't read as perfect cones
      const jitter = 0.82 + 0.36 * ((i * 2654435761 >>> 16) % 1000) / 1000;
      const w = t.width[i] * (0.75 + Math.min(age * 0.14, 0.85)) * jitter;
      const a = t.alpha[i] * Math.pow(fade, 1.35);
      if (a > 0.003) visible++;
      const u = along * 0.045;
      this._setVert(t, vi, _v1.x + side.x * w, _v1.y + side.y * w, _v1.z + side.z * w, a);
      t.vU.array[vi++] = u;
      this._setVert(t, vi, _v1.x - side.x * w, _v1.y - side.y * w, _v1.z - side.z * w, a);
      t.vU.array[vi++] = u;
    }
    t.vPos.needsUpdate = true;
    t.vA.needsUpdate = true;
    t.vU.needsUpdate = true;
    t.geo.setDrawRange(0, Math.max(0, (n - 1) * 6));
    // per-trail color: multiply into vertex alpha only; color via material is global.
    return visible;
  }

  _setVert(t, vi, x, y, z, a) {
    t.vPos.array[vi * 3] = x; t.vPos.array[vi * 3 + 1] = y; t.vPos.array[vi * 3 + 2] = z;
    t.vA.array[vi] = a;
  }

  clear() { [...this.activeList].forEach((t) => this._deactivate(t)); }
}

// ================================================================ shockwaves
class ShockPool {
  constructor(scene, count = 10) {
    this.items = [];
    const tex = softCircleTexture(64, 0.72, [255, 240, 220]);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, fog: false,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      m.visible = false;
      m.renderOrder = 13;
      scene.add(m);
      this.items.push({ mesh: m, t: 1e9, dur: 1, size: 10, ground: false, alpha: 1 });
    }
    this.cursor = 0;
  }
  spawn(pos, { size = 40, dur = 0.9, ground = false, alpha = 0.75 }) {
    const it = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    it.mesh.position.copy(pos);
    if (ground) { it.mesh.rotation.set(-Math.PI / 2, 0, 0); it.mesh.position.y = Math.max(pos.y, 0.3); }
    it.t = 0; it.dur = dur; it.size = size; it.ground = ground; it.alpha = alpha;
    it.mesh.visible = true;
  }
  update(dt, camera) {
    for (const it of this.items) {
      if (!it.mesh.visible) continue;
      it.t += dt;
      const p = it.t / it.dur;
      if (p >= 1) { it.mesh.visible = false; continue; }
      const e = 1 - Math.pow(1 - p, 2.4);
      const s = 1 + e * it.size;
      it.mesh.scale.set(s, s, s);
      it.mesh.material.opacity = it.alpha * Math.pow(1 - p, 1.7);
      if (!it.ground) it.mesh.quaternion.copy(camera.quaternion);
    }
  }
  clear() { this.items.forEach((it) => (it.mesh.visible = false)); }
}

// ================================================================ debris
class DebrisPool {
  constructor(scene, count = 220) {
    const geo = new THREE.TetrahedronGeometry(0.5, 0);
    this.mat = new THREE.MeshStandardMaterial({ color: 0x2c2a26, roughness: 0.85, metalness: 0.35 });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.count = count;
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.rot = new Float32Array(count * 4); // axis xyz + speed
    this.life = new Float32Array(count);    // remaining
    this.size = new Float32Array(count);
    this.cursor = 0;
    this._m4 = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._axis = new THREE.Vector3();
    for (let i = 0; i < count; i++) this.life[i] = -1;
  }
  burst(pos, vel, n, speed, size = 1) {
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.count;
      this.pos[i * 3] = pos.x; this.pos[i * 3 + 1] = pos.y; this.pos[i * 3 + 2] = pos.z;
      const th = rngFx.range(0, Math.PI * 2), ph = Math.acos(rngFx.range(-1, 1));
      const sp = speed * rngFx.range(0.35, 1);
      this.vel[i * 3] = vel.x + Math.sin(ph) * Math.cos(th) * sp;
      this.vel[i * 3 + 1] = vel.y + Math.cos(ph) * sp * 0.8;
      this.vel[i * 3 + 2] = vel.z + Math.sin(ph) * Math.sin(th) * sp;
      this.rot[i * 4] = rngFx.range(-1, 1); this.rot[i * 4 + 1] = rngFx.range(-1, 1);
      this.rot[i * 4 + 2] = rngFx.range(-1, 1); this.rot[i * 4 + 3] = rngFx.range(2, 9);
      this.life[i] = rngFx.range(2.5, 5);
      this.size[i] = size * rngFx.range(0.4, 1.3);
    }
  }
  update(dt, now) {
    let any = false;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] < 0) { if (this.size[i] !== 0) { this._m4.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this._m4); this.size[i] = 0; any = true; } continue; }
      this.life[i] -= dt;
      any = true;
      this.vel[i * 3 + 1] -= 9.81 * dt;
      let x = this.pos[i * 3] + this.vel[i * 3] * dt;
      let y = this.pos[i * 3 + 1] + this.vel[i * 3 + 1] * dt;
      let z = this.pos[i * 3 + 2] + this.vel[i * 3 + 2] * dt;
      if (y < 0.2) { y = 0.2; this.vel[i * 3 + 1] *= -0.3; this.vel[i * 3] *= 0.6; this.vel[i * 3 + 2] *= 0.6; }
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this._axis.set(this.rot[i * 4], this.rot[i * 4 + 1], this.rot[i * 4 + 2]).normalize();
      this._q.setFromAxisAngle(this._axis, now * this.rot[i * 4 + 3] % (Math.PI * 2));
      const s = this.size[i] * clamp(this.life[i], 0, 1);
      this._m4.compose(_v1.set(x, y, z), this._q, _v2.set(s, s, s));
      this.mesh.setMatrixAt(i, this._m4);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() { for (let i = 0; i < this.count; i++) this.life[i] = -1; }
}

// ================================================================ decals (scorch/craters)
class DecalPool {
  constructor(scene, count = 26) {
    const tex = scorchTexture(256);
    this.items = [];
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 3;
      scene.add(m);
      this.items.push(m);
    }
    this.cursor = 0;
  }
  spawn(pos, size, opacity = 0.85) {
    const m = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    m.position.set(pos.x, 0.12 + this.cursor * 0.004, pos.z);
    m.rotation.z = rngFx.range(0, Math.PI * 2);
    m.scale.set(size, size, size);
    m.material.opacity = opacity;
    m.visible = true;
  }
  update(dt) {
    for (const m of this.items) {
      if (!m.visible) continue;
      m.material.opacity -= dt * 0.005; // slow fade over ~3 min
      if (m.material.opacity <= 0.02) m.visible = false;
    }
  }
  clear() { this.items.forEach((m) => (m.visible = false)); }
}

// ================================================================ flashes (light pool)
class FlashPool {
  constructor(scene, count = 3) {
    this.lights = [];
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(0xffcc88, 0, 800, 1.4);
      scene.add(l);
      this.lights.push({ l, t: 1e9, dur: 1, peak: 0 });
    }
    this.cursor = 0;
  }
  flash(pos, intensity, dur = 0.45, color = 0xffcc88) {
    const it = this.lights[this.cursor];
    this.cursor = (this.cursor + 1) % this.lights.length;
    it.l.position.copy(pos);
    it.l.color.setHex(color);
    it.t = 0; it.dur = dur; it.peak = intensity;
  }
  update(dt) {
    for (const it of this.lights) {
      if (it.t > it.dur) { it.l.intensity = 0; continue; }
      it.t += dt;
      const p = clamp(it.t / it.dur, 0, 1);
      it.l.intensity = it.peak * Math.pow(1 - p, 2.2);
    }
  }
}

// ================================================================ effects facade
export class Effects {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.now = 0;
    this.smoke = new ParticlePool(scene, { capacity: 6000, texture: smokeTexture(128), additive: false, name: 'smoke' });
    this.fire = new ParticlePool(scene, { capacity: 4500, texture: softCircleTexture(64), additive: true, name: 'fire' });
    this.trails = new TrailPool(scene, 26);
    this.glowTrails = new TrailPool(scene, 14, { additive: true, color: [1.0, 0.62, 0.3] });
    this.shock = new ShockPool(scene, 10);
    this.debris = new DebrisPool(scene, 220);
    this.decals = new DecalPool(scene, 26);
    this.flash = new FlashPool(scene, 3);
    this.emitters = [];    // {pos, until, rate, acc, kind}
    this.onShake = null;   // cb(amount)
    this.onBoom = null;    // cb(pos, size, kind)
    this.quality = 1;      // particle multiplier
  }

  setPointScale(heightPx, camera) {
    const s = heightPx * 0.5 * Math.abs(camera.projectionMatrix.elements[5]);
    this.smoke.uniforms.uPointScale.value = s;
    this.fire.uniforms.uPointScale.value = s;
  }

  setEnvironment({ ambient, fogColor, fogDensity, wind }) {
    for (const p of [this.smoke, this.fire]) {
      p.uniforms.uAmbient.value.copy(ambient);
      p.uniforms.uFogColor.value.copy(fogColor);
      p.uniforms.uFogDensity.value = fogDensity;
      p.uniforms.uWind.value.copy(wind);
    }
    // sunlit exhaust smoke reads brighter than flat ambient
    this.smoke.uniforms.uAmbient.value.lerp(_white, 0.28);
    this.trails.uniforms.uFogColor.value.copy(fogColor);
    this.trails.uniforms.uFogDensity.value = fogDensity;
    // exhaust smoke reads brighter than generic ambient (sun-catching white plume)
    this.trails.uniforms.uColorMul.value.copy(ambient).lerp(_white, 0.4);
    this.glowTrails.uniforms.uFogColor.value.copy(fogColor);
    this.glowTrails.uniforms.uFogDensity.value = fogDensity;
  }

  // ---------------- trail API
  createTrail(opts) { return this.trails.acquire(opts); }
  createGlowTrail(opts) { return this.glowTrails.acquire(opts); }
  pushTrail(trail, pos, width, alpha) { trail.pool.push(trail, this.now, pos, width, alpha); }
  releaseTrail(trail) { trail.pool.release(trail); }

  // ---------------- composite effects
  airBurst(pos, { size = 1, kind = 'intercept' } = {}) {
    const q = this.quality;
    const n = Math.round(26 * size * q);
    for (let i = 0; i < n; i++) {
      _v1.set(rngFx.gauss(), rngFx.gauss(), rngFx.gauss()).multiplyScalar(26 * size);
      this.fire.emit(this.now, {
        pos, vel: _v1, life: rngFx.range(0.35, 0.9), size0: 2.5 * size, size1: 7 * size,
        color: i % 3 === 0 ? 0xffd9a0 : 0xff8a3c, alpha: 0.9, damp: 2.2, gravity: 0, wind: 0.1,
      });
    }
    const ns = Math.round(20 * size * q);
    for (let i = 0; i < ns; i++) {
      _v1.set(rngFx.gauss(), rngFx.gauss() * 0.7, rngFx.gauss()).multiplyScalar(15 * size);
      this.smoke.emit(this.now, {
        pos, vel: _v1, life: rngFx.range(3, 7), size0: 4 * size, size1: 16 * size,
        color: 0x8a8a8a, alpha: 0.5, damp: 1.4, gravity: -0.004, wind: 0.9,
      });
    }
    // sparks
    const np = Math.round(30 * size * q);
    for (let i = 0; i < np; i++) {
      _v1.set(rngFx.gauss(), rngFx.gauss(), rngFx.gauss()).multiplyScalar(55 * size);
      this.fire.emit(this.now, {
        pos, vel: _v1, life: rngFx.range(0.7, 1.8), size0: 0.7, size1: 0.25,
        color: 0xffc37a, alpha: 1, damp: 0.55, gravity: 0.55, wind: 0.1,
      });
    }
    // core flash (double-pulse) — scaled up with camera distance so far intercepts stay readable
    const d = this.camera.position.distanceTo(pos);
    const ds = clamp(d / 950, 0.75, 6.5) * size;
    this.fire.emit(this.now, { pos, vel: _v2.set(0, 0, 0), life: 0.34, size0: 55 * ds, size1: 100 * ds, color: 0xfff3dc, alpha: 1, damp: 1, gravity: 0 });
    this.fire.emit(this.now, { pos, vel: _v2.set(0, 0, 0), life: 0.9, size0: 30 * ds, size1: 70 * ds, color: 0xffb060, alpha: 0.85, damp: 1, gravity: 0 });
    this.shock.spawn(pos, { size: 130 * clamp(ds, 1, 3.6), dur: 1.0, alpha: 0.55 });
    this.debris.burst(pos, _v2.set(0, 0, 0), Math.round(10 * size), 62 * size, 0.8 * size);
    this.flash.flash(pos, 1100 * size, 0.45);
    if (this.onShake) this.onShake(clamp(1 - d / 1500, 0, 1) * 0.5 * size);
    if (this.onBoom) this.onBoom(pos, size, kind);
  }

  groundImpact(pos, { size = 1.6 } = {}) {
    const q = this.quality;
    const p = _v3.set(pos.x, Math.max(pos.y, 1), pos.z);
    const n = Math.round(34 * size * q);
    for (let i = 0; i < n; i++) {
      _v1.set(rngFx.gauss() * 14, Math.abs(rngFx.gauss()) * 30 + 12, rngFx.gauss() * 14).multiplyScalar(size);
      this.fire.emit(this.now, {
        pos: p, vel: _v1, life: rngFx.range(0.4, 1.3), size0: 3.5 * size, size1: 10 * size,
        color: i % 2 ? 0xff7a30 : 0xffb054, alpha: 0.95, damp: 1.6, gravity: 0.12,
      });
    }
    // dust ring
    const nd = Math.round(30 * size * q);
    for (let i = 0; i < nd; i++) {
      const a = (i / nd) * Math.PI * 2;
      _v1.set(Math.cos(a) * 30 * size, rngFx.range(2, 7), Math.sin(a) * 30 * size);
      this.smoke.emit(this.now, {
        pos: p, vel: _v1, life: rngFx.range(2.5, 5), size0: 3 * size, size1: 13 * size,
        color: 0x9a8468, alpha: 0.55, damp: 2.2, gravity: 0.02, wind: 0.7,
      });
    }
    // smoke column
    const nsm = Math.round(26 * size * q);
    for (let i = 0; i < nsm; i++) {
      _v1.set(rngFx.gauss() * 4, rngFx.range(12, 30) * size, rngFx.gauss() * 4);
      this.smoke.emit(this.now, {
        pos: p, vel: _v1, life: rngFx.range(5, 11), size0: 5 * size, size1: 22 * size,
        color: 0x4c4640, alpha: 0.6, damp: 1.1, gravity: -0.012, wind: 1.1,
      });
    }
    this.shock.spawn(p, { size: 90 * size, dur: 1.1, ground: true, alpha: 0.55 });
    this.shock.spawn(p, { size: 55 * size, dur: 0.7, alpha: 0.4 });
    this.debris.burst(p, _v2.set(0, 8, 0), Math.round(14 * size), 40 * size, size);
    this.decals.spawn(p, 16 * size);
    this.flash.flash(_v1.set(p.x, p.y + 6, p.z), 1400 * size, 0.5, 0xffb066);
    // burning aftermath emitter
    this.emitters.push({ pos: p.clone(), until: this.now + 16, rate: 14, acc: 0, kind: 'fire' });
    const d = this.camera.position.distanceTo(p);
    if (this.onShake) this.onShake(clamp(1 - d / 900, 0, 1) * 1.0 * size);
    if (this.onBoom) this.onBoom(p, size * 1.6, 'impact');
  }

  launchPlume(pos, dir, { scale = 1 } = {}) {
    const q = this.quality;
    // violent backblast opposite the launch direction + omni ground dust
    const back = _v1.copy(dir).multiplyScalar(-1);
    const n = Math.round(38 * scale * q);
    for (let i = 0; i < n; i++) {
      _v2.copy(back).multiplyScalar(rngFx.range(18, 60) * scale)
        .add(_v3.set(rngFx.gauss() * 9, rngFx.gauss() * 6, rngFx.gauss() * 9));
      this.fire.emit(this.now, {
        pos, vel: _v2, life: rngFx.range(0.25, 0.75), size0: 2.6 * scale, size1: 8 * scale,
        color: i % 3 ? 0xffc060 : 0xfff0c8, alpha: 1, damp: 2.4, gravity: 0,
      });
    }
    const groundP = _v3.set(pos.x, 0.6, pos.z);
    const nd = Math.round(44 * scale * q);
    for (let i = 0; i < nd; i++) {
      const a = rngFx.range(0, Math.PI * 2);
      _v2.set(Math.cos(a) * rngFx.range(10, 26) * scale, rngFx.range(1.5, 6), Math.sin(a) * rngFx.range(10, 26) * scale);
      this.smoke.emit(this.now, {
        pos: groundP, vel: _v2, life: rngFx.range(3, 8), size0: 3.5 * scale, size1: 16 * scale,
        color: 0xb8a98e, alpha: 0.62, damp: 1.7, gravity: 0.01, wind: 1.0,
      });
    }
    this.shock.spawn(groundP, { size: 34 * scale, dur: 0.8, ground: true, alpha: 0.5 });
    this.decals.spawn(groundP, 7 * scale, 0.5);
    this.flash.flash(_v2.set(pos.x, pos.y + 2, pos.z), 700 * scale, 0.5, 0xffd9a0);
    const d = this.camera.position.distanceTo(pos);
    if (this.onShake) this.onShake(clamp(1 - d / 260, 0, 1) * 0.45 * scale);
    if (this.onBoom) this.onBoom(pos, scale, 'launch');
  }

  // continuous motor exhaust — called per-frame per missile while burning
  motorExhaust(pos, vel, intensity, scale = 1) {
    // fire glow puff (short) + smoke puff (long) with probabilistic thinning
    if (rngFx.next() < 0.6 * intensity) {
      _v1.copy(vel).multiplyScalar(-0.04).add(_v2.set(rngFx.gauss(), rngFx.gauss(), rngFx.gauss()).multiplyScalar(1.5));
      this.smoke.emit(this.now, {
        pos, vel: _v1, life: rngFx.range(5, 11) * scale, size0: 2.2 * scale, size1: 12 * scale,
        color: 0xd6d6d6, alpha: 0.44 * intensity, damp: 1.2, gravity: -0.002, wind: 1.0,
      });
    }
    if (rngFx.next() < 0.5 * intensity) {
      _v1.copy(vel).multiplyScalar(-0.06);
      this.fire.emit(this.now, {
        pos, vel: _v1, life: 0.16, size0: 1.8 * scale, size1: 0.6 * scale,
        color: 0xffc98a, alpha: 0.9 * intensity, damp: 1, gravity: 0,
      });
    }
  }

  // threat reentry glow puffs
  plasmaWake(pos, vel, intensity) {
    if (rngFx.next() < 0.75 * intensity) {
      _v1.copy(vel).multiplyScalar(-0.02);
      this.fire.emit(this.now, {
        pos, vel: _v1, life: rngFx.range(0.25, 0.6), size0: 2.2, size1: 0.7,
        color: 0xffa04a, alpha: 0.75 * intensity, damp: 1, gravity: 0,
      });
    }
  }

  destroyedThreatDebris(pos, vel) {
    this.debris.burst(pos, _v1.copy(vel).multiplyScalar(0.35), 8, 30, 0.9);
    // falling burning chunks
    for (let i = 0; i < 6; i++) {
      _v2.copy(vel).multiplyScalar(0.25).add(_v3.set(rngFx.gauss() * 22, rngFx.gauss() * 12, rngFx.gauss() * 22));
      this.fire.emit(this.now, {
        pos, vel: _v2, life: rngFx.range(1.5, 3.2), size0: 1.6, size1: 0.5,
        color: 0xff8438, alpha: 1, damp: 0.35, gravity: 0.85, wind: 0.2,
      });
    }
  }

  update(dt, now) {
    this.now = now;
    // emitters (burning craters etc.)
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];
      if (now > e.until) { this.emitters.splice(i, 1); continue; }
      e.acc += dt * e.rate * this.quality;
      while (e.acc >= 1) {
        e.acc -= 1;
        _v1.set(rngFx.gauss() * 1.5, rngFx.range(4, 10), rngFx.gauss() * 1.5);
        if (rngFx.next() < 0.5) {
          this.fire.emit(now, { pos: e.pos, vel: _v1, life: rngFx.range(0.5, 1.2), size0: 2.4, size1: 0.8, color: 0xff9040, alpha: 0.8, damp: 1.4, gravity: -0.02 });
        } else {
          this.smoke.emit(now, { pos: e.pos, vel: _v1.multiplyScalar(1.6), life: rngFx.range(4, 9), size0: 3, size1: 14, color: 0x35312c, alpha: 0.5, damp: 1.2, gravity: -0.01, wind: 1.2 });
        }
      }
    }
    this.smoke.uniforms.uTime.value = now;
    this.fire.uniforms.uTime.value = now;
    this.smoke.flush();
    this.fire.flush();
    this.trails.update(now, this.camera);
    this.glowTrails.update(now, this.camera);
    this.shock.update(dt, this.camera);
    this.debris.update(dt, now);
    this.decals.update(dt);
    this.flash.update(dt);
  }

  reset() {
    this.smoke.clear();
    this.fire.clear();
    this.trails.clear();
    this.glowTrails.clear();
    this.shock.clear();
    this.debris.clear();
    this.emitters.length = 0;
  }
}
