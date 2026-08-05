// Effects: contrails, launch plumes, explosions, shockwaves, debris, sparks,
// ground dust and scorch decals. Everything is pooled and drawn through a
// small number of batched systems (one instanced quad system for all
// billboards, one merged geometry for all ribbons).
import * as THREE from 'three';
import { Pool } from './core/pool.js';
import * as T from './core/textures.js';
import { densityRatio } from './physics.js';
import { mats } from './core/materials.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _side = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _view = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Billboard particle system (one draw call for every soft particle on screen)
// ---------------------------------------------------------------------------

const PARTICLE_VS = /* glsl */`
  attribute vec3 iPos;
  attribute vec4 iColor;
  attribute vec4 iMisc; // x: size, y: rotation, z: unused, w: unused
  varying vec4 vColor;
  varying vec2 vUv;
  void main() {
    vColor = iColor;
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
    float s = iMisc.x;
    float r = iMisc.y;
    float cr = cos(r);
    float sr = sin(r);
    vec2 p = vec2(position.x * cr - position.y * sr, position.x * sr + position.y * cr) * s;
    mv.xy += p;
    gl_Position = projectionMatrix * mv;
  }
`;

const PARTICLE_FS = /* glsl */`
  uniform sampler2D map;
  uniform float uFogDensity;
  uniform vec3 uFogColor;
  uniform float uFogBlend;
  varying vec4 vColor;
  varying vec2 vUv;
  void main() {
    vec4 t = texture2D(map, vUv);
    vec3 c = vColor.rgb * t.rgb;
    float a = vColor.a * t.a;
    if (a < 0.004) discard;
    #ifdef ADDITIVE_FOG
      a *= 1.0 - uFogBlend;
    #else
      c = mix(c, uFogColor, uFogBlend * 0.0);
    #endif
    gl_FragColor = vec4(c, a);
  }
`;

class BillboardParticles {
  constructor(capacity, texture, { additive = false, sizeAttenuation = true } = {}) {
    this.capacity = capacity;
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    this.iPos = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.iColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.iMisc = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.iPos.setUsage(THREE.DynamicDrawUsage);
    this.iColor.setUsage(THREE.DynamicDrawUsage);
    this.iMisc.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', this.iPos);
    geo.setAttribute('iColor', this.iColor);
    geo.setAttribute('iMisc', this.iMisc);
    geo.instanceCount = 0;
    this.geometry = geo;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        uFogColor: { value: new THREE.Color(0x9fb4c8) },
        uFogBlend: { value: 0 },
        uFogDensity: { value: 0 },
      },
      vertexShader: PARTICLE_VS,
      fragmentShader: PARTICLE_FS,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      defines: additive ? { ADDITIVE_FOG: '' } : {},
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 12 : 10;

    // particle state (structure-of-arrays)
    this.px = new Float32Array(capacity);
    this.py = new Float32Array(capacity);
    this.pz = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.vz = new Float32Array(capacity);
    this.age = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.size0 = new Float32Array(capacity);
    this.size1 = new Float32Array(capacity);
    this.rot = new Float32Array(capacity);
    this.rotVel = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.c0 = new Float32Array(capacity * 3);
    this.c1 = new Float32Array(capacity * 3);
    this.alpha0 = new Float32Array(capacity);
    this.fadeIn = new Float32Array(capacity);
    this.live = new Uint8Array(capacity);
    this.freeList = [];
    for (let i = capacity - 1; i >= 0; i--) this.freeList.push(i);
    this.liveCount = 0;
  }

  spawn(x, y, z, opts) {
    const i = this.freeList.pop();
    if (i === undefined) return -1;
    this.live[i] = 1;
    this.liveCount++;
    this.px[i] = x; this.py[i] = y; this.pz[i] = z;
    const v = opts.vel;
    this.vx[i] = v ? v.x : 0;
    this.vy[i] = v ? v.y : 0;
    this.vz[i] = v ? v.z : 0;
    this.age[i] = 0;
    this.life[i] = opts.life ?? 1;
    this.size0[i] = opts.size0 ?? 1;
    this.size1[i] = opts.size1 ?? this.size0[i] * 2;
    this.rot[i] = opts.rot ?? Math.random() * Math.PI * 2;
    this.rotVel[i] = opts.rotVel ?? 0;
    this.drag[i] = opts.drag ?? 0.6;
    this.grav[i] = opts.grav ?? 0;
    const a = opts.color0 || { r: 1, g: 1, b: 1 };
    const b = opts.color1 || a;
    this.c0[i * 3] = a.r; this.c0[i * 3 + 1] = a.g; this.c0[i * 3 + 2] = a.b;
    this.c1[i * 3] = b.r; this.c1[i * 3 + 1] = b.g; this.c1[i * 3 + 2] = b.b;
    this.alpha0[i] = opts.alpha ?? 1;
    this.fadeIn[i] = opts.fadeIn ?? 0.08;
    return i;
  }

  update(dt) {
    let n = 0;
    const pos = this.iPos.array;
    const col = this.iColor.array;
    const misc = this.iMisc.array;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.live[i]) continue;
      let age = this.age[i] + dt;
      const life = this.life[i];
      if (age >= life) {
        this.live[i] = 0;
        this.liveCount--;
        this.freeList.push(i);
        continue;
      }
      this.age[i] = age;
      const t = age / life;
      const d = Math.exp(-this.drag[i] * dt);
      this.vx[i] *= d;
      this.vz[i] *= d;
      this.vy[i] = this.vy[i] * d + this.grav[i] * dt;
      this.px[i] += this.vx[i] * dt;
      this.py[i] += this.vy[i] * dt;
      this.pz[i] += this.vz[i] * dt;
      this.rot[i] += this.rotVel[i] * dt;

      const fi = this.fadeIn[i];
      const alpha = this.alpha0[i] * Math.min(1, t / Math.max(fi, 1e-4)) * (1 - t) * (1 - t * 0.35);
      const size = this.size0[i] + (this.size1[i] - this.size0[i]) * t;

      const o3 = n * 3;
      pos[o3] = this.px[i];
      pos[o3 + 1] = this.py[i];
      pos[o3 + 2] = this.pz[i];
      const o4 = n * 4;
      const k = i * 3;
      col[o4] = this.c0[k] + (this.c1[k] - this.c0[k]) * t;
      col[o4 + 1] = this.c0[k + 1] + (this.c1[k + 1] - this.c0[k + 1]) * t;
      col[o4 + 2] = this.c0[k + 2] + (this.c1[k + 2] - this.c0[k + 2]) * t;
      col[o4 + 3] = alpha;
      misc[o4] = size;
      misc[o4 + 1] = this.rot[i];
      n++;
    }
    this.geometry.instanceCount = n;
    if (n > 0) {
      this.iPos.needsUpdate = true;
      this.iColor.needsUpdate = true;
      this.iMisc.needsUpdate = true;
      this.iPos.addUpdateRange(0, n * 3);
      this.iColor.addUpdateRange(0, n * 4);
      this.iMisc.addUpdateRange(0, n * 4);
    }
    this.drawn = n;
  }

  clear() {
    for (let i = 0; i < this.capacity; i++) {
      if (this.live[i]) {
        this.live[i] = 0;
        this.freeList.push(i);
      }
    }
    this.liveCount = 0;
    this.geometry.instanceCount = 0;
  }
}

// ---------------------------------------------------------------------------
// Ribbon contrails (all trails share one geometry -> one draw call)
// ---------------------------------------------------------------------------

const TRAIL_VS = /* glsl */`
  attribute vec4 aColor;
  varying vec4 vColor;
  varying vec2 vUv;
  void main() {
    vColor = aColor;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const TRAIL_FS = /* glsl */`
  uniform sampler2D map;
  varying vec4 vColor;
  varying vec2 vUv;
  void main() {
    vec4 t = texture2D(map, vUv);
    float a = vColor.a * t.a;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor.rgb * t.rgb, a);
  }
`;

function bandTexture() {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,1)');
  g.addColorStop(0.78, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

class Trail {
  constructor(slot, maxPoints) {
    this.slot = slot;
    this.maxPoints = maxPoints;
    this.px = new Float32Array(maxPoints);
    this.py = new Float32Array(maxPoints);
    this.pz = new Float32Array(maxPoints);
    this.age = new Float32Array(maxPoints);
    this.width = new Float32Array(maxPoints);
    this.dens = new Float32Array(maxPoints);
    this.count = 0;
    this.active = false;
    this.color = new THREE.Color(0.85, 0.85, 0.88);
    this.alpha = 0.85;
    this.persistence = 4;
    this.minSpacing = 4;
    this.widthScale = 1;
  }

  reset(opts = {}) {
    this.count = 0;
    this.active = true;
    this.color.set(opts.color ?? 0xd8d8dc);
    this.alpha = opts.alpha ?? 0.8;
    this.persistence = opts.persistence ?? 4;
    this.minSpacing = opts.minSpacing ?? 4;
    this.widthScale = opts.widthScale ?? 1;
    this.baseWidth = opts.baseWidth ?? 3;
  }

  push(x, y, z) {
    const n = this.count;
    if (n > 0) {
      const dx = x - this.px[n - 1];
      const dy = y - this.py[n - 1];
      const dz = z - this.pz[n - 1];
      if (dx * dx + dy * dy + dz * dz < this.minSpacing * this.minSpacing) {
        // extend the newest point instead of adding one
        this.px[n - 1] = x;
        this.py[n - 1] = y;
        this.pz[n - 1] = z;
        return;
      }
    }
    if (n >= this.maxPoints) {
      // shift out the oldest point
      this.px.copyWithin(0, 1);
      this.py.copyWithin(0, 1);
      this.pz.copyWithin(0, 1);
      this.age.copyWithin(0, 1);
      this.width.copyWithin(0, 1);
      this.dens.copyWithin(0, 1);
      this.count--;
    }
    const i = this.count++;
    this.px[i] = x;
    this.py[i] = y;
    this.pz[i] = z;
    this.age[i] = 0;
    const dr = densityRatio(y);
    this.dens[i] = dr;
    // thin air -> wide, slowly-dissipating contrail; dense air -> tight plume
    this.width[i] = this.baseWidth * (0.55 + (1 - dr) * 1.9) * this.widthScale;
  }

  tick(dt) {
    for (let i = 0; i < this.count; i++) this.age[i] += dt;
    // retire fully faded points from the tail
    let firstAlive = 0;
    while (firstAlive < this.count && this.age[firstAlive] > this.lifeOf(firstAlive)) firstAlive++;
    if (firstAlive > 0) {
      this.px.copyWithin(0, firstAlive);
      this.py.copyWithin(0, firstAlive);
      this.pz.copyWithin(0, firstAlive);
      this.age.copyWithin(0, firstAlive);
      this.width.copyWithin(0, firstAlive);
      this.dens.copyWithin(0, firstAlive);
      this.count -= firstAlive;
    }
    if (this.count <= 1 && !this.emitting) this.active = false;
  }

  lifeOf(i) {
    // trails laid in thin air hang in the sky far longer
    return this.persistence * (0.45 + (1 - this.dens[i]) * 2.6);
  }
}

class TrailSystem {
  constructor(maxTrails = 26, maxPoints = 120) {
    this.maxTrails = maxTrails;
    this.maxPoints = maxPoints;
    const vertsPerTrail = maxPoints * 2;
    const totalVerts = maxTrails * vertsPerTrail;
    this.positions = new Float32Array(totalVerts * 3);
    this.colors = new Float32Array(totalVerts * 4);
    this.uvs = new Float32Array(totalVerts * 2);
    const indices = new Uint32Array(maxTrails * (maxPoints - 1) * 6);
    let k = 0;
    for (let t = 0; t < maxTrails; t++) {
      const base = t * vertsPerTrail;
      for (let p = 0; p < maxPoints - 1; p++) {
        const a = base + p * 2;
        indices[k++] = a;
        indices[k++] = a + 1;
        indices[k++] = a + 2;
        indices[k++] = a + 1;
        indices[k++] = a + 3;
        indices[k++] = a + 2;
      }
    }
    for (let i = 0; i < totalVerts; i++) {
      this.uvs[i * 2] = (i >> 1) / 8;
      this.uvs[i * 2 + 1] = i % 2 === 0 ? 0 : 1;
    }
    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.colAttr = new THREE.BufferAttribute(this.colors, 4);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('aColor', this.colAttr);
    geo.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.setDrawRange(0, 0);
    this.geometry = geo;
    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: bandTexture() } },
      vertexShader: TRAIL_VS,
      fragmentShader: TRAIL_FS,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 8;
    this.trails = [];
    this.free = [];
    for (let i = 0; i < maxTrails; i++) {
      const t = new Trail(i, maxPoints);
      this.trails.push(t);
      this.free.push(t);
    }
  }

  acquire(opts) {
    const t = this.free.pop();
    if (!t) return null;
    t.reset(opts);
    t.emitting = true;
    return t;
  }

  release(t) {
    if (!t) return;
    t.emitting = false;
  }

  update(dt, camera) {
    camera.getWorldPosition(_view);
    let maxIndex = 0;
    for (const t of this.trails) {
      if (!t.active) {
        this._blank(t);
        continue;
      }
      t.tick(dt);
      if (!t.active) {
        this._blank(t);
        this.free.push(t);
        continue;
      }
      this._writeTrail(t);
      maxIndex = Math.max(maxIndex, (t.slot + 1) * (this.maxPoints - 1) * 6);
    }
    this.geometry.setDrawRange(0, this.maxTrails * (this.maxPoints - 1) * 6);
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }

  _blank(t) {
    const base = t.slot * this.maxPoints * 2;
    const col = this.colors;
    for (let i = 0; i < this.maxPoints * 2; i++) col[(base + i) * 4 + 3] = 0;
  }

  _writeTrail(t) {
    const base = t.slot * this.maxPoints * 2;
    const pos = this.positions;
    const col = this.colors;
    const n = t.count;
    for (let i = 0; i < this.maxPoints; i++) {
      const vi = base + i * 2;
      if (i >= n) {
        col[vi * 4 + 3] = 0;
        col[(vi + 1) * 4 + 3] = 0;
        // collapse degenerate verts onto the last real point to avoid stretching
        const src = n > 0 ? n - 1 : 0;
        pos[vi * 3] = t.px[src];
        pos[vi * 3 + 1] = t.py[src];
        pos[vi * 3 + 2] = t.pz[src];
        pos[(vi + 1) * 3] = t.px[src];
        pos[(vi + 1) * 3 + 1] = t.py[src];
        pos[(vi + 1) * 3 + 2] = t.pz[src];
        continue;
      }
      // tangent from neighbours
      const ia = Math.max(0, i - 1);
      const ib = Math.min(n - 1, i + 1);
      _dir.set(t.px[ib] - t.px[ia], t.py[ib] - t.py[ia], t.pz[ib] - t.pz[ia]);
      if (_dir.lengthSq() < 1e-8) _dir.set(0, 1, 0);
      _v.set(t.px[i] - _view.x, t.py[i] - _view.y, t.pz[i] - _view.z);
      const dist = _v.length();
      _side.crossVectors(_dir, _v).normalize();
      if (!isFinite(_side.x)) _side.set(1, 0, 0);
      const age = t.age[i];
      const life = t.lifeOf(i);
      const lt = Math.min(1, age / life);
      // widen with age (diffusion) and keep a minimum on-screen thickness
      const w = t.width[i] * (0.45 + lt * 1.35) + dist * 0.0016;
      _side.multiplyScalar(w * 0.5);
      const vi3 = vi * 3;
      pos[vi3] = t.px[i] + _side.x;
      pos[vi3 + 1] = t.py[i] + _side.y;
      pos[vi3 + 2] = t.pz[i] + _side.z;
      pos[vi3 + 3] = t.px[i] - _side.x;
      pos[vi3 + 4] = t.py[i] - _side.y;
      pos[vi3 + 5] = t.pz[i] - _side.z;

      // head is denser and hotter than the tail
      const headFade = Math.min(1, (n - i) / 3);
      const a = t.alpha * (1 - lt) * (1 - lt * 0.4) * (0.35 + 0.65 * headFade);
      const vi4 = vi * 4;
      col[vi4] = t.color.r;
      col[vi4 + 1] = t.color.g;
      col[vi4 + 2] = t.color.b;
      col[vi4 + 3] = a;
      col[vi4 + 4] = t.color.r;
      col[vi4 + 5] = t.color.g;
      col[vi4 + 6] = t.color.b;
      col[vi4 + 7] = a;
    }
  }

  clear() {
    for (const t of this.trails) {
      t.active = false;
      t.emitting = false;
      t.count = 0;
      this._blank(t);
      if (!this.free.includes(t)) this.free.push(t);
    }
  }
}

// ---------------------------------------------------------------------------
// Debris shards
// ---------------------------------------------------------------------------

class DebrisSystem {
  constructor(capacity = 220) {
    const geo = new THREE.TetrahedronGeometry(0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a4642, roughness: 0.75, metalness: 0.6 });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.capacity = capacity;
    this.pos = [];
    this.vel = [];
    this.rot = [];
    this.rotVel = [];
    this.scale = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.age = new Float32Array(capacity);
    this.live = new Uint8Array(capacity);
    this.free = [];
    for (let i = capacity - 1; i >= 0; i--) {
      this.pos.push(new THREE.Vector3());
      this.vel.push(new THREE.Vector3());
      this.rot.push(new THREE.Euler());
      this.rotVel.push(new THREE.Vector3());
      this.free.push(i);
    }
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this.trailHook = null;
  }

  spawn(p, v, { size = 0.4, life = 4 } = {}) {
    const i = this.free.pop();
    if (i === undefined) return -1;
    this.live[i] = 1;
    this.pos[i].copy(p);
    this.vel[i].copy(v);
    this.rot[i].set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    this.rotVel[i].set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
    this.scale[i] = size;
    this.life[i] = life;
    this.age[i] = 0;
    return i;
  }

  update(dt, onDebrisTick) {
    let n = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.live[i]) continue;
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) {
        this.live[i] = 0;
        this.free.push(i);
        continue;
      }
      const v = this.vel[i];
      v.y -= 9.81 * dt;
      v.multiplyScalar(Math.exp(-0.22 * dt));
      this.pos[i].addScaledVector(v, dt);
      const r = this.rot[i];
      r.x += this.rotVel[i].x * dt;
      r.y += this.rotVel[i].y * dt;
      r.z += this.rotVel[i].z * dt;
      if (onDebrisTick) onDebrisTick(this.pos[i], this.age[i], this.life[i], i);
      const t = this.age[i] / this.life[i];
      const s = this.scale[i] * (1 - t * 0.3);
      this._q.setFromEuler(r);
      this._s.set(s, s, s);
      this._m.compose(this.pos[i], this._q, this._s);
      this.mesh.setMatrixAt(n, this._m);
      n++;
    }
    this.mesh.count = n;
    if (n) this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear() {
    for (let i = 0; i < this.capacity; i++) {
      if (this.live[i]) {
        this.live[i] = 0;
        this.free.push(i);
      }
    }
    this.mesh.count = 0;
  }
}

// ---------------------------------------------------------------------------
// Shockwave rings
// ---------------------------------------------------------------------------

class ShockwaveSystem {
  constructor(capacity = 12) {
    this.capacity = capacity;
    const geo = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.MeshBasicMaterial({
      map: T.shockRing(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.pool = new Pool(capacity, () => {
      const m = new THREE.Mesh(geo, this.material.clone());
      m.visible = false;
      m.frustumCulled = false;
      m.renderOrder = 13;
      return m;
    }, (m) => {
      m.visible = false;
    });
    this.group = new THREE.Group();
    for (const m of this.pool.items) this.group.add(m);
  }

  spawn(pos, { size = 40, life = 0.6, color = 0xfff2d8, alpha = 0.85 } = {}) {
    const m = this.pool.acquire();
    if (!m) return;
    m.visible = true;
    m.position.copy(pos);
    m.scale.setScalar(1);
    m.material.color.set(color);
    m.material.opacity = alpha;
    m.userData = { age: 0, life, size, alpha };
  }

  update(dt, camera) {
    this.pool.forEachLive((m) => {
      const u = m.userData;
      u.age += dt;
      const t = u.age / u.life;
      if (t >= 1) {
        this.pool.release(m);
        return;
      }
      const s = u.size * Math.pow(t, 0.55);
      m.scale.setScalar(s);
      m.material.opacity = u.alpha * (1 - t) * (1 - t);
      m.quaternion.copy(camera.quaternion);
    });
  }

  clear() {
    this.pool.releaseAll();
  }
}

// ---------------------------------------------------------------------------
// Flash lights
// ---------------------------------------------------------------------------

class FlashLights {
  constructor(scene, capacity = 6) {
    this.pool = new Pool(capacity, () => {
      const l = new THREE.PointLight(0xffd6a0, 0, 600, 2);
      l.visible = false;
      scene.add(l);
      return l;
    }, (l) => {
      l.visible = false;
      l.intensity = 0;
    });
  }

  spawn(pos, { intensity = 6000, life = 0.35, color = 0xffd6a0, distance = 700 } = {}) {
    const l = this.pool.acquire();
    if (!l) return;
    l.visible = true;
    l.position.copy(pos);
    l.color.set(color);
    l.distance = distance;
    l.userData = { age: 0, life, intensity };
    l.intensity = intensity;
  }

  update(dt) {
    this.pool.forEachLive((l) => {
      const u = l.userData;
      u.age += dt;
      const t = u.age / u.life;
      if (t >= 1) {
        this.pool.release(l);
        return;
      }
      l.intensity = u.intensity * Math.pow(1 - t, 2.2);
    });
  }

  clear() {
    this.pool.releaseAll();
  }
}

// ---------------------------------------------------------------------------
// Ground scorch decals
// ---------------------------------------------------------------------------

class DecalSystem {
  constructor(capacity = 24) {
    const geo = new THREE.PlaneGeometry(1, 1);
    this.pool = new Pool(capacity, () => {
      const m = new THREE.Mesh(geo, mats().scorch.clone());
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 2;
      return m;
    }, (m) => {
      m.visible = false;
    });
    this.group = new THREE.Group();
    for (const m of this.pool.items) this.group.add(m);
  }

  spawn(pos, size = 8, opacity = 0.85) {
    const m = this.pool.acquire();
    if (!m) {
      // recycle the oldest
      const oldest = this.pool.active[0];
      if (!oldest) return;
      this.pool.release(oldest);
      return this.spawn(pos, size, opacity);
    }
    m.visible = true;
    m.position.set(pos.x, pos.y + 0.06, pos.z);
    m.rotation.z = Math.random() * Math.PI * 2;
    m.scale.set(size, size, 1);
    m.material.opacity = opacity;
    m.userData = { age: 0 };
  }

  clear() {
    this.pool.releaseAll();
  }
}

// ---------------------------------------------------------------------------
// Effects facade
// ---------------------------------------------------------------------------

export class Effects {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.group = new THREE.Group();
    this.group.name = 'effects';
    scene.add(this.group);

    this.smoke = new BillboardParticles(2600, T.smokePuff(0), { additive: false });
    this.smoke2 = new BillboardParticles(1200, T.smokePuff(1), { additive: false });
    this.fire = new BillboardParticles(1400, T.flare(), { additive: true });
    this.sparks = new BillboardParticles(1600, T.glow(0.3), { additive: true });
    this.group.add(this.smoke.mesh, this.smoke2.mesh, this.fire.mesh, this.sparks.mesh);

    this.trails = new TrailSystem(26, 120);
    this.group.add(this.trails.mesh);

    this.debris = new DebrisSystem(240);
    this.group.add(this.debris.mesh);

    this.shockwaves = new ShockwaveSystem(14);
    this.group.add(this.shockwaves.group);

    this.flashes = new FlashLights(scene, 6);
    this.decals = new DecalSystem(24);
    this.group.add(this.decals.group);

    // tint applied to smoke so it matches the current lighting mood
    this.smokeLight = new THREE.Color(0.86, 0.86, 0.9);
    this.smokeShadow = new THREE.Color(0.42, 0.44, 0.5);
    this.reducedMotion = false;
    this._c0 = new THREE.Color();
    this._c1 = new THREE.Color();
  }

  setLightingMood(lightColor, shadowColor) {
    this.smokeLight.copy(lightColor);
    this.smokeShadow.copy(shadowColor);
  }

  // ---- emitters ----------------------------------------------------------

  /** Rocket exhaust behind a flying missile. */
  emitExhaust(pos, dir, dt, {
    scale = 1, hot = true, rate = 90, spread = 0.14, speed = 30, sooty = 0.5,
  } = {}) {
    const dens = densityRatio(pos.y);
    const n = Math.max(1, Math.round(rate * dt * (0.5 + dens * 0.9)));
    for (let i = 0; i < n; i++) {
      const jx = (this.rng.float() - 0.5) * spread;
      const jy = (this.rng.float() - 0.5) * spread;
      const jz = (this.rng.float() - 0.5) * spread;
      _v.set(-dir.x * speed + jx * speed, -dir.y * speed + jy * speed, -dir.z * speed + jz * speed);
      if (hot && i % 3 === 0) {
        this.fire.spawn(pos.x, pos.y, pos.z, {
          vel: _v,
          life: 0.16 + this.rng.float() * 0.16,
          size0: 1.6 * scale,
          size1: 5.5 * scale,
          drag: 3.2,
          color0: { r: 1.0, g: 0.86, b: 0.55 },
          color1: { r: 1.0, g: 0.4, b: 0.12 },
          alpha: 0.9,
          fadeIn: 0.05,
        });
      }
      const grey = 0.55 + this.rng.float() * 0.35 * (1 - sooty);
      this._c0.copy(this.smokeLight).multiplyScalar(grey + 0.25);
      this._c1.copy(this.smokeShadow).multiplyScalar(0.9 + grey * 0.3);
      this.smoke.spawn(pos.x, pos.y, pos.z, {
        vel: _v.multiplyScalar(0.5),
        life: (0.9 + this.rng.float() * 1.6) * (0.6 + (1 - dens) * 2.4),
        size0: 2.2 * scale,
        size1: (14 + this.rng.float() * 16) * scale * (0.6 + (1 - dens) * 1.4),
        drag: 1.1,
        grav: 0.6,
        rotVel: (this.rng.float() - 0.5) * 1.4,
        color0: { r: this._c0.r, g: this._c0.g, b: this._c0.b },
        color1: { r: this._c1.r, g: this._c1.g, b: this._c1.b },
        alpha: 0.32 * (0.4 + dens * 0.9),
        fadeIn: 0.1,
      });
    }
  }

  /** The big ignition event at the launcher: plume, dust ring, sparks, flash. */
  emitLaunchBlast(pos, dir, { scale = 1, groundY = 0, color = 0xffc070 } = {}) {
    const S = scale;
    this.flashes.spawn(pos, { intensity: 9000 * S, life: 0.55, color: 0xffbb70, distance: 400 * S });
    this.shockwaves.spawn(pos, { size: 26 * S, life: 0.5, alpha: 0.5 });

    // core fireball
    for (let i = 0; i < 26 * S; i++) {
      _v.set(
        -dir.x * 42 + (this.rng.float() - 0.5) * 26,
        -dir.y * 42 + (this.rng.float() - 0.5) * 26,
        -dir.z * 42 + (this.rng.float() - 0.5) * 26,
      );
      this.fire.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 0.3 + this.rng.float() * 0.4,
        size0: 3 * S,
        size1: (14 + this.rng.float() * 14) * S,
        drag: 2.2,
        color0: { r: 1, g: 0.93, b: 0.72 },
        color1: { r: 1, g: 0.34, b: 0.08 },
        alpha: 0.95,
        fadeIn: 0.03,
      });
    }
    // billowing smoke column
    for (let i = 0; i < 44 * S; i++) {
      _v.set(
        -dir.x * 20 + (this.rng.float() - 0.5) * 24,
        -dir.y * 20 + this.rng.float() * 8,
        -dir.z * 20 + (this.rng.float() - 0.5) * 24,
      );
      this._c0.copy(this.smokeLight).multiplyScalar(0.95);
      this._c1.copy(this.smokeShadow).multiplyScalar(1.05);
      this.smoke.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 3.5 + this.rng.float() * 4.5,
        size0: 5 * S,
        size1: (34 + this.rng.float() * 40) * S,
        drag: 0.65,
        grav: 1.6,
        rotVel: (this.rng.float() - 0.5) * 0.9,
        color0: { r: this._c0.r, g: this._c0.g, b: this._c0.b },
        color1: { r: this._c1.r, g: this._c1.g, b: this._c1.b },
        alpha: 0.5,
        fadeIn: 0.12,
      });
    }
    // ground-interaction dust: an expanding low ring kicked outwards
    const dustY = groundY + 0.4;
    for (let i = 0; i < 70 * S; i++) {
      const a = this.rng.float() * Math.PI * 2;
      const sp = 14 + this.rng.float() * 34;
      _v.set(Math.cos(a) * sp, this.rng.float() * 5.5, Math.sin(a) * sp);
      const r = 1.5 + this.rng.float() * 4;
      this._c0.set(0.78, 0.68, 0.52).multiply(this.smokeLight);
      this._c1.set(0.5, 0.44, 0.35).multiply(this.smokeLight);
      this.smoke2.spawn(pos.x + Math.cos(a) * r, dustY, pos.z + Math.sin(a) * r, {
        vel: _v,
        life: 2.6 + this.rng.float() * 3.4,
        size0: 4 * S,
        size1: (26 + this.rng.float() * 26) * S,
        drag: 1.0,
        grav: -0.5,
        rotVel: (this.rng.float() - 0.5) * 0.8,
        color0: { r: this._c0.r, g: this._c0.g, b: this._c0.b },
        color1: { r: this._c1.r, g: this._c1.g, b: this._c1.b },
        alpha: 0.42,
        fadeIn: 0.14,
      });
    }
    // sparks and hot flecks
    for (let i = 0; i < 60 * S; i++) {
      const a = this.rng.float() * Math.PI * 2;
      const sp = 20 + this.rng.float() * 60;
      _v.set(Math.cos(a) * sp, this.rng.float() * 30 - 6, Math.sin(a) * sp);
      this.sparks.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 0.5 + this.rng.float() * 1.1,
        size0: 0.5,
        size1: 0.14,
        drag: 0.8,
        grav: -14,
        color0: { r: 1, g: 0.92, b: 0.6 },
        color1: { r: 1, g: 0.35, b: 0.1 },
        alpha: 1,
        fadeIn: 0.02,
      });
    }
  }

  /** A successful intercept: bright kill flash, expanding fireball, debris. */
  emitIntercept(pos, vel, { scale = 1, debrisCount = 22 } = {}) {
    const S = scale;
    this.flashes.spawn(pos, { intensity: 26000 * S, life: 0.5, color: 0xfff0d0, distance: 3000 });
    this.shockwaves.spawn(pos, { size: 190 * S, life: 0.85, alpha: 0.9 });
    this.shockwaves.spawn(pos, { size: 90 * S, life: 0.45, alpha: 0.7, color: 0xd8e8ff });

    for (let i = 0; i < 40 * S; i++) {
      const a = this.rng.float() * Math.PI * 2;
      const b = Math.acos(2 * this.rng.float() - 1);
      const sp = 40 + this.rng.float() * 190;
      _v.set(
        Math.sin(b) * Math.cos(a) * sp,
        Math.cos(b) * sp,
        Math.sin(b) * Math.sin(a) * sp,
      );
      this.fire.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 0.35 + this.rng.float() * 0.65,
        size0: 8 * S,
        size1: (46 + this.rng.float() * 48) * S,
        drag: 1.5,
        color0: { r: 1, g: 0.97, b: 0.86 },
        color1: { r: 1, g: 0.36, b: 0.1 },
        alpha: 1,
        fadeIn: 0.02,
      });
    }
    for (let i = 0; i < 34 * S; i++) {
      const a = this.rng.float() * Math.PI * 2;
      const b = Math.acos(2 * this.rng.float() - 1);
      const sp = 18 + this.rng.float() * 70;
      _v.set(Math.sin(b) * Math.cos(a) * sp, Math.cos(b) * sp, Math.sin(b) * Math.sin(a) * sp);
      this._c0.copy(this.smokeLight).multiplyScalar(0.8);
      this._c1.copy(this.smokeShadow).multiplyScalar(0.85);
      this.smoke.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 5 + this.rng.float() * 7,
        size0: 10 * S,
        size1: (70 + this.rng.float() * 90) * S,
        drag: 0.5,
        grav: 0.4,
        rotVel: (this.rng.float() - 0.5) * 0.5,
        color0: { r: this._c0.r, g: this._c0.g, b: this._c0.b },
        color1: { r: this._c1.r, g: this._c1.g, b: this._c1.b },
        alpha: 0.55,
        fadeIn: 0.08,
      });
    }
    for (let i = 0; i < 90; i++) {
      const a = this.rng.float() * Math.PI * 2;
      const b = Math.acos(2 * this.rng.float() - 1);
      const sp = 120 + this.rng.float() * 420;
      _v.set(Math.sin(b) * Math.cos(a) * sp, Math.cos(b) * sp, Math.sin(b) * Math.sin(a) * sp);
      this.sparks.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 0.6 + this.rng.float() * 1.6,
        size0: 1.6,
        size1: 0.3,
        drag: 0.35,
        grav: -9,
        color0: { r: 1, g: 0.95, b: 0.7 },
        color1: { r: 1, g: 0.42, b: 0.14 },
        alpha: 1,
        fadeIn: 0.01,
      });
    }
    for (let i = 0; i < debrisCount; i++) {
      const a = this.rng.float() * Math.PI * 2;
      const b = Math.acos(2 * this.rng.float() - 1);
      const sp = 40 + this.rng.float() * 170;
      _v.set(Math.sin(b) * Math.cos(a) * sp, Math.cos(b) * sp, Math.sin(b) * Math.sin(a) * sp);
      if (vel) _v.addScaledVector(vel, 0.35);
      this.debris.spawn(pos, _v, { size: 0.6 + this.rng.float() * 2.4, life: 5 + this.rng.float() * 5 });
    }
  }

  /** Ground impact of a leaker. */
  emitGroundImpact(pos, { scale = 1 } = {}) {
    const S = scale;
    this.flashes.spawn(pos, { intensity: 30000 * S, life: 0.6, color: 0xffc060, distance: 2000 });
    this.shockwaves.spawn(pos, { size: 120 * S, life: 0.8, alpha: 0.8 });
    this.decals.spawn(pos, 22 * S, 0.9);
    for (let i = 0; i < 46 * S; i++) {
      const a = this.rng.float() * Math.PI * 2;
      const sp = 20 + this.rng.float() * 110;
      _v.set(Math.cos(a) * sp * 0.6, 30 + this.rng.float() * 110, Math.sin(a) * sp * 0.6);
      this.fire.spawn(pos.x, pos.y + 1, pos.z, {
        vel: _v,
        life: 0.5 + this.rng.float() * 0.8,
        size0: 8 * S,
        size1: (40 + this.rng.float() * 40) * S,
        drag: 1.1,
        color0: { r: 1, g: 0.9, b: 0.62 },
        color1: { r: 0.7, g: 0.2, b: 0.05 },
        alpha: 1,
        fadeIn: 0.02,
      });
    }
    for (let i = 0; i < 70 * S; i++) {
      const a = this.rng.float() * Math.PI * 2;
      const sp = 12 + this.rng.float() * 70;
      _v.set(Math.cos(a) * sp, 6 + this.rng.float() * 40, Math.sin(a) * sp);
      this._c0.set(0.72, 0.63, 0.48).multiply(this.smokeLight);
      this._c1.set(0.34, 0.3, 0.26);
      this.smoke2.spawn(pos.x, pos.y + 0.5, pos.z, {
        vel: _v,
        life: 6 + this.rng.float() * 8,
        size0: 8 * S,
        size1: (56 + this.rng.float() * 70) * S,
        drag: 0.6,
        grav: 1.4,
        rotVel: (this.rng.float() - 0.5) * 0.5,
        color0: { r: this._c0.r, g: this._c0.g, b: this._c0.b },
        color1: { r: this._c1.r, g: this._c1.g, b: this._c1.b },
        alpha: 0.62,
        fadeIn: 0.08,
      });
    }
    for (let i = 0; i < 120; i++) {
      const a = this.rng.float() * Math.PI * 2;
      const sp = 40 + this.rng.float() * 180;
      _v.set(Math.cos(a) * sp * 0.5, 40 + this.rng.float() * 150, Math.sin(a) * sp * 0.5);
      this.sparks.spawn(pos.x, pos.y + 0.5, pos.z, {
        vel: _v,
        life: 0.8 + this.rng.float() * 1.8,
        size0: 1.2,
        size1: 0.2,
        drag: 0.3,
        grav: -12,
        color0: { r: 1, g: 0.9, b: 0.6 },
        color1: { r: 0.9, g: 0.3, b: 0.08 },
        alpha: 1,
        fadeIn: 0.01,
      });
    }
    for (let i = 0; i < 26; i++) {
      const a = this.rng.float() * Math.PI * 2;
      const sp = 20 + this.rng.float() * 90;
      _v.set(Math.cos(a) * sp * 0.7, 30 + this.rng.float() * 90, Math.sin(a) * sp * 0.7);
      this.debris.spawn(pos, _v, { size: 0.8 + this.rng.float() * 2.6, life: 6 + this.rng.float() * 4 });
    }
  }

  /** Decoy flare ejection (night raid). */
  emitFlare(pos, vel) {
    for (let i = 0; i < 3; i++) {
      _v.copy(vel).multiplyScalar(0.35);
      _v.x += (this.rng.float() - 0.5) * 40;
      _v.y += (this.rng.float() - 0.5) * 30;
      _v.z += (this.rng.float() - 0.5) * 40;
      this.fire.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 2.4 + this.rng.float() * 2.0,
        size0: 6,
        size1: 2,
        drag: 0.25,
        grav: -3,
        color0: { r: 1, g: 0.96, b: 0.8 },
        color1: { r: 1, g: 0.5, b: 0.2 },
        alpha: 1,
        fadeIn: 0.04,
      });
    }
  }

  /** Small puff when a canister cover is blown off. */
  emitCoverBlow(pos, dir) {
    for (let i = 0; i < 8; i++) {
      _v.copy(dir).multiplyScalar(10 + this.rng.float() * 14);
      _v.x += (this.rng.float() - 0.5) * 8;
      _v.y += (this.rng.float() - 0.5) * 8;
      _v.z += (this.rng.float() - 0.5) * 8;
      this.debris.spawn(pos, _v, { size: 0.3 + this.rng.float() * 0.4, life: 2.5 });
    }
  }

  acquireTrail(opts) {
    return this.trails.acquire(opts);
  }

  releaseTrail(t) {
    this.trails.release(t);
  }

  update(dt, camera) {
    this.smoke.update(dt);
    this.smoke2.update(dt);
    this.fire.update(dt);
    this.sparks.update(dt);
    this.trails.update(dt, camera);
    this.debris.update(dt);
    this.shockwaves.update(dt, camera);
    this.flashes.update(dt);
  }

  get stats() {
    return {
      smoke: this.smoke.liveCount + this.smoke2.liveCount,
      fire: this.fire.liveCount,
      sparks: this.sparks.liveCount,
      trails: this.trails.maxTrails - this.trails.free.length,
      debris: this.debris.mesh.count,
    };
  }

  clear() {
    this.smoke.clear();
    this.smoke2.clear();
    this.fire.clear();
    this.sparks.clear();
    this.trails.clear();
    this.debris.clear();
    this.shockwaves.clear();
    this.flashes.clear();
    this.decals.clear();
  }
}
