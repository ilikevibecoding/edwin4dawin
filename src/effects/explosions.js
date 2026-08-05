/**
 * Blast components: shockwave shells, ground rings, debris, decals and the
 * pooled dynamic lights that make an intercept flash actually light the site.
 */

import * as THREE from 'three';
import { Pool } from '../util/pool.js';
import { scorchDecal, noiseTexture } from '../util/textures.js';
import { clamp01 } from '../util/mathx.js';

// ---------------------------------------------------------------------------
// Shockwave shell - a thin expanding sphere seen edge-on as a bright ring.
// ---------------------------------------------------------------------------

const SHOCK_VERT = /* glsl */`
  varying vec3 vNormalView;
  varying vec3 vViewPos;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormalView = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const SHOCK_FRAG = /* glsl */`
  uniform float uAge;       // 0..1
  uniform vec3  uColor;
  uniform float uOpacity;
  uniform float uRimPower;
  varying vec3 vNormalView;
  varying vec3 vViewPos;
  varying vec2 vUv;
  void main() {
    vec3 v = normalize(-vViewPos);
    float f = 1.0 - abs(dot(normalize(vNormalView), v));
    float rim = pow(clamp(f, 0.0, 1.0), uRimPower);
    float fade = (1.0 - uAge) * (1.0 - uAge);
    float a = rim * fade * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor * (0.6 + rim * 1.8), a);
  }
`;

export class ShockwavePool {
  constructor(scene, capacity = 10) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'shockwaves';
    scene.add(this.group);
    const geo = new THREE.SphereGeometry(1, 24, 16);
    this.pool = new Pool(() => {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uAge: { value: 0 }, uColor: { value: new THREE.Color(0xdff0ff) },
          uOpacity: { value: 0.8 }, uRimPower: { value: 2.4 },
        },
        vertexShader: SHOCK_VERT,
        fragmentShader: SHOCK_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return { mesh, mat, t: 0, life: 1, r0: 1, r1: 10, flat: false };
    }, (it) => { it.mesh.visible = false; }, capacity, capacity);
  }

  spawn(pos, { r0 = 2, r1 = 90, life = 0.85, colour = 0xdff0ff, opacity = 0.85, flat = false, rim = 2.4 } = {}) {
    const it = this.pool.acquire();
    if (!it) return null;
    it.t = 0; it.life = life; it.r0 = r0; it.r1 = r1; it.flat = flat;
    it.mesh.position.copy(pos);
    it.mesh.scale.setScalar(r0);
    if (flat) it.mesh.scale.y = r0 * 0.16;
    it.mesh.visible = true;
    it.mat.uniforms.uColor.value.set(colour);
    it.mat.uniforms.uOpacity.value = opacity;
    it.mat.uniforms.uRimPower.value = rim;
    it.mat.uniforms.uAge.value = 0;
    return it;
  }

  update(dt) {
    this.pool.sweep((it) => {
      it.t += dt;
      const k = it.t / it.life;
      if (k >= 1) return true;
      // Fast then decelerating expansion reads as a pressure front.
      const e = 1 - Math.pow(1 - k, 2.6);
      const r = it.r0 + (it.r1 - it.r0) * e;
      it.mesh.scale.setScalar(r);
      if (it.flat) it.mesh.scale.y = r * (0.1 + k * 0.18);
      it.mat.uniforms.uAge.value = k;
      return false;
    });
  }

  clear() { this.pool.releaseAll(); }
}

// ---------------------------------------------------------------------------
// Debris - instanced chunks with spin, drag and optional smoke tags.
// ---------------------------------------------------------------------------

export class DebrisField {
  constructor(scene, capacity = 260) {
    this.capacity = capacity;
    // Irregular chunk: a squashed low-poly icosahedron reads as torn metal.
    const geo = new THREE.IcosahedronGeometry(0.5, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i,
        pos.getX(i) * (0.6 + Math.random() * 0.9),
        pos.getY(i) * (0.4 + Math.random() * 1.4),
        pos.getZ(i) * (0.6 + Math.random() * 0.9));
    }
    geo.computeVertexNormals();
    this.material = new THREE.MeshStandardMaterial({
      color: 0x50524f, roughness: 0.72, metalness: 0.65,
    });
    this.mesh = new THREE.InstancedMesh(geo, this.material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.count = capacity;
    scene.add(this.mesh);

    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.spin = new Float32Array(capacity * 3);
    this.rot = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.age = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.smoky = new Uint8Array(capacity);
    this.alive = new Uint8Array(capacity);
    this.cursor = 0;
    this.count = 0;

    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, this._hidden);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  spawn(pos, vel, { size = 0.5, life = 4, smoky = false } = {}) {
    let i = -1;
    for (let k = 0; k < this.capacity; k++) {
      const j = (this.cursor + k) % this.capacity;
      if (!this.alive[j]) { i = j; break; }
    }
    if (i < 0) { i = this.cursor; }
    this.cursor = (i + 1) % this.capacity;
    const i3 = i * 3;
    this.pos[i3] = pos.x; this.pos[i3 + 1] = pos.y; this.pos[i3 + 2] = pos.z;
    this.vel[i3] = vel.x; this.vel[i3 + 1] = vel.y; this.vel[i3 + 2] = vel.z;
    this.spin[i3] = (Math.random() - 0.5) * 14;
    this.spin[i3 + 1] = (Math.random() - 0.5) * 14;
    this.spin[i3 + 2] = (Math.random() - 0.5) * 14;
    this.rot[i3] = Math.random() * 6.28;
    this.rot[i3 + 1] = Math.random() * 6.28;
    this.rot[i3 + 2] = Math.random() * 6.28;
    this.life[i] = life; this.age[i] = 0; this.size[i] = size;
    this.smoky[i] = smoky ? 1 : 0;
    if (!this.alive[i]) this.count++;
    this.alive[i] = 1;
    return i;
  }

  /** @param {(pos:THREE.Vector3, vel:THREE.Vector3, i:number)=>void} onSmoke */
  update(dt, onSmoke) {
    if (this.count === 0) return;
    const g = 9.81;
    let dirty = false;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.alive[i]) continue;
      const i3 = i * 3;
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) {
        this.alive[i] = 0; this.count--;
        this.mesh.setMatrixAt(i, this._hidden);
        dirty = true;
        continue;
      }
      // Drag rises with size; tumbling chunks slow noticeably.
      const drag = 0.22 + this.size[i] * 0.5;
      const vx = this.vel[i3], vy = this.vel[i3 + 1], vz = this.vel[i3 + 2];
      const sp = Math.hypot(vx, vy, vz);
      const f = sp > 0.01 ? (drag * sp * dt) / sp : 0;
      this.vel[i3] = vx - vx * f;
      this.vel[i3 + 1] = vy - vy * f - g * dt;
      this.vel[i3 + 2] = vz - vz * f;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;

      if (this.pos[i3 + 1] < 0.05) {
        // Bounce and lose most of the energy, then settle.
        this.pos[i3 + 1] = 0.05;
        this.vel[i3 + 1] = Math.abs(this.vel[i3 + 1]) * 0.24;
        this.vel[i3] *= 0.5; this.vel[i3 + 2] *= 0.5;
        this.spin[i3] *= 0.5; this.spin[i3 + 1] *= 0.5; this.spin[i3 + 2] *= 0.5;
        if (Math.abs(this.vel[i3 + 1]) < 0.6) this.life[i] = Math.min(this.life[i], this.age[i] + 1.6);
      }

      this.rot[i3] += this.spin[i3] * dt;
      this.rot[i3 + 1] += this.spin[i3 + 1] * dt;
      this.rot[i3 + 2] += this.spin[i3 + 2] * dt;

      const fade = 1 - clamp01((this.age[i] - this.life[i] * 0.7) / (this.life[i] * 0.3));
      this._e.set(this.rot[i3], this.rot[i3 + 1], this.rot[i3 + 2]);
      this._q.setFromEuler(this._e);
      this._v.set(this.pos[i3], this.pos[i3 + 1], this.pos[i3 + 2]);
      this._s.setScalar(this.size[i] * (0.4 + fade * 0.6));
      this._m.compose(this._v, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
      dirty = true;

      if (this.smoky[i] && onSmoke && Math.random() < dt * 22) {
        onSmoke(this._v, this._v.clone().set(this.vel[i3] * 0.1, this.vel[i3 + 1] * 0.1, this.vel[i3 + 2] * 0.1), i);
      }
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear() {
    for (let i = 0; i < this.capacity; i++) {
      this.alive[i] = 0;
      this.mesh.setMatrixAt(i, this._hidden);
    }
    this.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// Ground decals
// ---------------------------------------------------------------------------

export class DecalPool {
  constructor(scene, capacity = 26) {
    this.group = new THREE.Group();
    this.group.name = 'decals';
    scene.add(this.group);
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    const tex = scorchDecal(256, 12);
    this.pool = new Pool(() => {
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0.9, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 2;
      this.group.add(mesh);
      return { mesh, mat, t: 0, life: 999, fadeIn: 0.4 };
    }, (it) => { it.mesh.visible = false; }, capacity, capacity);
  }

  spawn(pos, radius, { life = 999, opacity = 0.9, rot = Math.random() * 6.28 } = {}) {
    const it = this.pool.acquire();
    if (!it) return null;
    it.t = 0; it.life = life; it.peak = opacity;
    it.mesh.position.set(pos.x, 0.035, pos.z);
    it.mesh.scale.set(radius * 2, 1, radius * 2);
    it.mesh.rotation.y = rot;
    it.mesh.visible = true;
    it.mat.opacity = 0;
    return it;
  }

  update(dt) {
    this.pool.sweep((it) => {
      it.t += dt;
      if (it.t > it.life) return true;
      const inA = clamp01(it.t / it.fadeIn);
      const out = it.life > 900 ? 1 : 1 - clamp01((it.t - it.life * 0.7) / (it.life * 0.3));
      it.mat.opacity = it.peak * inA * out;
      return false;
    });
  }

  clear() { this.pool.releaseAll(); }
}

// ---------------------------------------------------------------------------
// Pooled dynamic lights for flashes
// ---------------------------------------------------------------------------

export class FlashLights {
  constructor(scene, capacity = 4) {
    this.items = [];
    for (let i = 0; i < capacity; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 800, 2);
      l.visible = false;
      scene.add(l);
      this.items.push({ light: l, t: 0, life: 0, peak: 0 });
    }
  }

  flash(pos, { colour = 0xffe0b0, intensity = 4000, life = 0.5, distance = 900 } = {}) {
    // Steal the dimmest slot when saturated so the biggest event always shows.
    let slot = this.items.find((it) => !it.light.visible);
    if (!slot) {
      slot = this.items.reduce((a, b) => (a.peak < b.peak ? a : b));
    }
    slot.light.position.copy(pos);
    slot.light.color.set(colour);
    slot.light.distance = distance;
    slot.light.intensity = intensity;
    slot.light.visible = true;
    slot.t = 0; slot.life = life; slot.peak = intensity;
    return slot;
  }

  update(dt) {
    for (const it of this.items) {
      if (!it.light.visible) continue;
      it.t += dt;
      const k = it.t / it.life;
      if (k >= 1) { it.light.visible = false; it.light.intensity = 0; it.peak = 0; continue; }
      // Sharp spike then exponential decay.
      const env = k < 0.08 ? k / 0.08 : Math.exp(-(k - 0.08) * 6.2);
      it.light.intensity = it.peak * env;
    }
  }

  clear() { for (const it of this.items) { it.light.visible = false; it.light.intensity = 0; } }
}

// ---------------------------------------------------------------------------
// Volumetric-ish fireball: a noise-displaced sphere for the core of a big blast
// ---------------------------------------------------------------------------

const FIRE_VERT = /* glsl */`
  uniform float uTime;
  uniform float uAge;
  uniform sampler2D uNoise;
  uniform float uDisplace;
  varying vec3 vNormalView;
  varying vec3 vViewPos;
  varying float vNoise;
  void main() {
    vec3 n = normalize(normal);
    float s = texture2D(uNoise, vec2(n.x * 0.5 + 0.5 + uTime * 0.05, n.y * 0.5 + 0.5)).r;
    float s2 = texture2D(uNoise, vec2(n.z * 0.5 + 0.5, n.y * 0.5 + 0.5 - uTime * 0.07)).g;
    vNoise = s * 0.6 + s2 * 0.4;
    vec3 p = position * (1.0 + (vNoise - 0.5) * uDisplace);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vNormalView = normalize(normalMatrix * n);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const FIRE_FRAG = /* glsl */`
  uniform float uAge;
  uniform vec3 uHot;
  uniform vec3 uCool;
  uniform float uOpacity;
  varying vec3 vNormalView;
  varying vec3 vViewPos;
  varying float vNoise;
  void main() {
    vec3 v = normalize(-vViewPos);
    float ndv = clamp(dot(normalize(vNormalView), v), 0.0, 1.0);
    float core = pow(ndv, 1.4);
    float temp = clamp(vNoise * 1.3 - uAge * 1.1, 0.0, 1.0);
    vec3 col = mix(uCool, uHot, temp);
    float a = (0.25 + core * 0.9) * (1.0 - uAge) * uOpacity;
    a *= mix(0.5, 1.2, vNoise);
    if (a < 0.004) discard;
    gl_FragColor = vec4(col * (0.7 + temp * 1.5), clamp(a, 0.0, 1.0));
  }
`;

export class FireballPool {
  constructor(scene, capacity = 8) {
    this.group = new THREE.Group();
    this.group.name = 'fireballs';
    scene.add(this.group);
    const geo = new THREE.SphereGeometry(1, 20, 14);
    const noise = noiseTexture(128, 17);
    this.pool = new Pool(() => {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 }, uAge: { value: 0 },
          uNoise: { value: noise }, uDisplace: { value: 0.55 },
          uHot: { value: new THREE.Color(0xfff0c0) },
          uCool: { value: new THREE.Color(0xd8501c) },
          uOpacity: { value: 1 },
        },
        vertexShader: FIRE_VERT, fragmentShader: FIRE_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return { mesh, mat, t: 0, life: 1, r0: 1, r1: 10 };
    }, (it) => { it.mesh.visible = false; }, capacity, capacity);
  }

  spawn(pos, { r0 = 3, r1 = 26, life = 1.1, hot = 0xfff0c0, cool = 0xd8501c, opacity = 1 } = {}) {
    const it = this.pool.acquire();
    if (!it) return null;
    it.t = 0; it.life = life; it.r0 = r0; it.r1 = r1;
    it.mesh.position.copy(pos);
    it.mesh.scale.setScalar(r0);
    it.mesh.rotation.set(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3);
    it.mesh.visible = true;
    it.mat.uniforms.uHot.value.set(hot);
    it.mat.uniforms.uCool.value.set(cool);
    it.mat.uniforms.uOpacity.value = opacity;
    it.mat.uniforms.uAge.value = 0;
    return it;
  }

  update(dt) {
    this.pool.sweep((it) => {
      it.t += dt;
      const k = it.t / it.life;
      if (k >= 1) return true;
      const e = 1 - Math.pow(1 - k, 3);
      it.mesh.scale.setScalar(it.r0 + (it.r1 - it.r0) * e);
      it.mat.uniforms.uAge.value = k;
      it.mat.uniforms.uTime.value += dt;
      return false;
    });
  }

  clear() { this.pool.releaseAll(); }
}
