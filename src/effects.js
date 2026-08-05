// Pooled visual effects: billboard particles, ribbon trails, debris,
// shockwaves, craters, flash lights. Zero per-frame allocations in steady
// state — everything below is preallocated and recycled.
import * as THREE from 'three';
import { softSmokeTexture, fireTexture, glowTexture, ringTexture, craterTexture, trailEdgeTexture } from './texgen.js';
import { DEBRIS_GRAVITY, groundHeight, contrailFactor, airDensity } from './physics.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _side = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

// ------------------------------------------------------------------ QuadPool
class QuadPool {
  constructor(scene, tex, capacity, { additive = false, lit = false } = {}) {
    this.capacity = capacity;
    this.lit = lit;
    // sim state
    this.alive = new Uint8Array(capacity);
    this.px = new Float32Array(capacity); this.py = new Float32Array(capacity); this.pz = new Float32Array(capacity);
    this.vx = new Float32Array(capacity); this.vy = new Float32Array(capacity); this.vz = new Float32Array(capacity);
    this.age = new Float32Array(capacity); this.life = new Float32Array(capacity);
    this.size0 = new Float32Array(capacity); this.size1 = new Float32Array(capacity);
    this.rot = new Float32Array(capacity); this.rotV = new Float32Array(capacity);
    this.r0 = new Float32Array(capacity); this.g0 = new Float32Array(capacity); this.b0 = new Float32Array(capacity);
    this.r1 = new Float32Array(capacity); this.g1 = new Float32Array(capacity); this.b1 = new Float32Array(capacity);
    this.a0 = new Float32Array(capacity);
    this.grav = new Float32Array(capacity); this.damp = new Float32Array(capacity);
    this.fadeIn = new Float32Array(capacity);
    this.windF = new Float32Array(capacity);
    this.cursor = 0;

    // render buffers
    const quad = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = quad.index;
    geo.attributes.position = quad.attributes.position;
    geo.attributes.uv = quad.attributes.uv;
    this.iPos = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.iSR = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2); // size, rot
    this.iCol = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4); // rgb, alpha
    this.iPos.setUsage(THREE.DynamicDrawUsage);
    this.iSR.setUsage(THREE.DynamicDrawUsage);
    this.iCol.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', this.iPos);
    geo.setAttribute('iSR', this.iSR);
    geo.setAttribute('iCol', this.iCol);
    geo.instanceCount = 0;
    this.geo = geo;

    this.uniforms = {
      uMap: { value: tex },
      uTint: { value: new THREE.Color(1, 1, 1) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: /* glsl */`
        attribute vec3 iPos; attribute vec2 iSR; attribute vec4 iCol;
        varying vec2 vUv; varying vec4 vCol;
        void main() {
          vUv = uv; vCol = iCol;
          vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
          vec2 corner = (uv - 0.5) * iSR.x;
          float c = cos(iSR.y), s = sin(iSR.y);
          mv.xy += vec2(corner.x * c - corner.y * s, corner.x * s + corner.y * c);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap; uniform vec3 uTint;
        varying vec2 vUv; varying vec4 vCol;
        void main() {
          vec4 t = texture2D(uMap, vUv);
          float a = t.a * vCol.a;
          if (a < 0.004) discard;
          gl_FragColor = vec4(vCol.rgb * uTint, a);
        }
      `,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 12 : 10;
    scene.add(this.mesh);
  }

  spawn(p) {
    // find slot
    let idx = -1;
    for (let k = 0; k < this.capacity; k++) {
      const i = (this.cursor + k) % this.capacity;
      if (!this.alive[i]) { idx = i; break; }
    }
    if (idx < 0) idx = this.cursor % this.capacity; // overwrite oldest-ish
    this.cursor = idx + 1;
    this.alive[idx] = 1;
    this.px[idx] = p.x; this.py[idx] = p.y; this.pz[idx] = p.z;
    this.vx[idx] = p.vx || 0; this.vy[idx] = p.vy || 0; this.vz[idx] = p.vz || 0;
    this.age[idx] = 0; this.life[idx] = p.life || 1;
    this.size0[idx] = p.size0 ?? 1; this.size1[idx] = p.size1 ?? (p.size0 ?? 1) * 2;
    this.rot[idx] = p.rot ?? Math.random() * 6.28;
    this.rotV[idx] = p.rotV ?? (Math.random() - 0.5) * 1.4;
    const c0 = p.c0 || 0xffffff, c1 = p.c1 ?? c0;
    _c.set(c0); this.r0[idx] = _c.r; this.g0[idx] = _c.g; this.b0[idx] = _c.b;
    _c.set(c1); this.r1[idx] = _c.r; this.g1[idx] = _c.g; this.b1[idx] = _c.b;
    this.a0[idx] = p.alpha ?? 1;
    this.grav[idx] = p.grav ?? 0;
    this.damp[idx] = p.damp ?? 0.2;
    this.fadeIn[idx] = p.fadeIn ?? 0.08;
    this.windF[idx] = p.wind ?? 0.4;
  }

  update(dt, wind) {
    let n = 0;
    const P = this.iPos.array, SR = this.iSR.array, C = this.iCol.array;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.alive[i]) continue;
      this.age[i] += dt;
      const t = this.age[i] / this.life[i];
      if (t >= 1) { this.alive[i] = 0; continue; }
      const damp = Math.max(0, 1 - this.damp[i] * dt);
      this.vx[i] = this.vx[i] * damp + wind.x * this.windF[i] * dt;
      this.vy[i] = this.vy[i] * damp - this.grav[i] * dt;
      this.vz[i] = this.vz[i] * damp + wind.z * this.windF[i] * dt;
      this.px[i] += this.vx[i] * dt;
      this.py[i] += this.vy[i] * dt;
      this.pz[i] += this.vz[i] * dt;
      this.rot[i] += this.rotV[i] * dt;

      const fin = Math.min(1, this.age[i] / Math.max(1e-4, this.fadeIn[i]));
      const fout = 1 - THREE.MathUtils.smoothstep(t, 0.55, 1);
      const alpha = this.a0[i] * fin * fout;
      const size = this.size0[i] + (this.size1[i] - this.size0[i]) * t;
      P[n * 3] = this.px[i]; P[n * 3 + 1] = this.py[i]; P[n * 3 + 2] = this.pz[i];
      SR[n * 2] = size; SR[n * 2 + 1] = this.rot[i];
      C[n * 4] = this.r0[i] + (this.r1[i] - this.r0[i]) * t;
      C[n * 4 + 1] = this.g0[i] + (this.g1[i] - this.g0[i]) * t;
      C[n * 4 + 2] = this.b0[i] + (this.b1[i] - this.b0[i]) * t;
      C[n * 4 + 3] = alpha;
      n++;
    }
    this.geo.instanceCount = n;
    if (n > 0 || this._hadAny) {
      this.iPos.needsUpdate = true; this.iSR.needsUpdate = true; this.iCol.needsUpdate = true;
    }
    this._hadAny = n > 0;
  }
}

// ------------------------------------------------------------------ Sparks
class SparkPool {
  constructor(scene, capacity) {
    this.capacity = capacity;
    this.alive = new Uint8Array(capacity);
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.age = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.cursor = 0;
    const geo = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
    this.attr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
    this.colAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.attr);
    geo.setAttribute('color', this.colAttr);
    geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({
      size: 1.6, map: glowTexture(), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, vertexColors: true, sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 13;
    scene.add(this.points);
    this.geo = geo;
  }

  spawn(x, y, z, vx, vy, vz, life) {
    const i = this.cursor % this.capacity;
    this.cursor++;
    this.alive[i] = 1;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.age[i] = 0; this.life[i] = life;
  }

  update(dt) {
    let n = 0;
    const P = this.attr.array, C = this.colAttr.array;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.alive[i]) continue;
      this.age[i] += dt;
      const t = this.age[i] / this.life[i];
      if (t >= 1) { this.alive[i] = 0; continue; }
      this.vel[i * 3 + 1] -= DEBRIS_GRAVITY * 2.2 * dt;
      const damp = Math.max(0, 1 - 0.6 * dt);
      this.vel[i * 3] *= damp; this.vel[i * 3 + 1] *= damp; this.vel[i * 3 + 2] *= damp;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      P[n * 3] = this.pos[i * 3]; P[n * 3 + 1] = this.pos[i * 3 + 1]; P[n * 3 + 2] = this.pos[i * 3 + 2];
      const heat = 1 - t;
      C[n * 3] = 1.6 * heat + 0.4;
      C[n * 3 + 1] = 1.1 * heat * heat + 0.15;
      C[n * 3 + 2] = 0.5 * heat * heat * heat;
      n++;
    }
    this.geo.setDrawRange(0, n);
    this.attr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ Debris
class DebrisPool {
  constructor(scene, capacity) {
    this.capacity = capacity;
    const geo = new THREE.TetrahedronGeometry(0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a3733, roughness: 0.9, metalness: 0.3 });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);
    this.items = [];
    for (let i = 0; i < capacity; i++) {
      this.items.push({
        alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        rot: new THREE.Euler(), rotV: new THREE.Vector3(), age: 0, life: 4, scale: 1, bounced: false,
      });
    }
    this.cursor = 0;
  }

  spawn(pos, vel, scale = 1, life = 4) {
    const d = this.items[this.cursor % this.capacity];
    this.cursor++;
    d.alive = true;
    d.pos.copy(pos); d.vel.copy(vel);
    d.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    d.rotV.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9);
    d.age = 0; d.life = life; d.scale = scale; d.bounced = false;
  }

  update(dt) {
    let n = 0;
    for (const d of this.items) {
      if (!d.alive) continue;
      d.age += dt;
      if (d.age >= d.life) { d.alive = false; continue; }
      d.vel.y -= DEBRIS_GRAVITY * dt;
      d.pos.addScaledVector(d.vel, dt);
      d.rot.x += d.rotV.x * dt; d.rot.y += d.rotV.y * dt; d.rot.z += d.rotV.z * dt;
      const gy = groundHeight(d.pos.x, d.pos.z);
      if (d.pos.y < gy + 0.2) {
        d.pos.y = gy + 0.2;
        if (!d.bounced && d.vel.y < -2) {
          d.vel.y = -d.vel.y * 0.3;
          d.vel.x *= 0.5; d.vel.z *= 0.5;
          d.rotV.multiplyScalar(0.4);
          d.bounced = true;
        } else {
          d.vel.set(0, 0, 0);
          d.rotV.set(0, 0, 0);
        }
      }
      const fade = 1 - THREE.MathUtils.smoothstep(d.age / d.life, 0.75, 1);
      _q.setFromEuler(d.rot);
      _s.setScalar(d.scale * fade);
      _m.compose(d.pos, _q, _s);
      this.mesh.setMatrixAt(n, _m);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ Rings
class RingPool {
  constructor(scene, capacity) {
    this.items = [];
    const tex = ringTexture();
    for (let i = 0; i < capacity; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.visible = false;
      m.renderOrder = 11;
      scene.add(m);
      this.items.push({ mesh: m, age: 0, life: 1, size0: 1, size1: 10, alpha: 1, alive: false, billboard: false });
    }
    this.cursor = 0;
  }

  spawn(pos, size0, size1, life, alpha, { flat = false, color = 0xfff2d0 } = {}) {
    const r = this.items[this.cursor % this.items.length];
    this.cursor++;
    r.alive = true; r.age = 0; r.life = life;
    r.size0 = size0; r.size1 = size1; r.alpha = alpha;
    r.billboard = !flat;
    r.mesh.visible = true;
    r.mesh.position.copy(pos);
    r.mesh.material.color.set(color);
    if (flat) r.mesh.rotation.set(-Math.PI / 2, 0, Math.random() * 6);
  }

  update(dt, camera) {
    for (const r of this.items) {
      if (!r.alive) continue;
      r.age += dt;
      const t = r.age / r.life;
      if (t >= 1) { r.alive = false; r.mesh.visible = false; continue; }
      const size = r.size0 + (r.size1 - r.size0) * Math.pow(t, 0.55);
      r.mesh.scale.setScalar(size);
      r.mesh.material.opacity = r.alpha * (1 - t) * (1 - t);
      if (r.billboard) r.mesh.quaternion.copy(camera.quaternion);
    }
  }
}

// ------------------------------------------------------------------ Trails
const TRAIL_POINTS = 140;
class Trail {
  constructor(scene) {
    this.scene = scene;
    this.pts = new Float32Array(TRAIL_POINTS * 3);
    this.born = new Float32Array(TRAIL_POINTS);
    this.width = new Float32Array(TRAIL_POINTS);
    this.life = new Float32Array(TRAIL_POINTS);
    this.baseA = new Float32Array(TRAIL_POINTS);
    this.count = 0;
    this.active = false;
    this.kind = 'smoke';

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 2 * 3), 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 2 * 4), 4);
    this.colAttr.setUsage(THREE.DynamicDrawUsage);
    // static uvs: u runs across the strip for the soft-edge gradient
    const uvs = new Float32Array(TRAIL_POINTS * 2 * 2);
    for (let i = 0; i < TRAIL_POINTS; i++) {
      uvs[i * 4] = 0; uvs[i * 4 + 1] = i / TRAIL_POINTS;
      uvs[i * 4 + 2] = 1; uvs[i * 4 + 3] = i / TRAIL_POINTS;
    }
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('color', this.colAttr);
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    const idx = [];
    for (let i = 0; i < TRAIL_POINTS - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      idx.push(a, b, c, b, d, c);
    }
    geo.setIndex(idx);
    geo.setDrawRange(0, 0);
    this.geo = geo;
    this.mesh = null; // material assigned on acquire
  }

  reset(kind, material) {
    this.kind = kind;
    this.count = 0;
    this.lastEmit = new THREE.Vector3(1e9, 1e9, 1e9);
    if (!this.mesh) {
      this.mesh = new THREE.Mesh(this.geo, material);
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = kind === 'core' ? 12 : 9;
      this.scene.add(this.mesh);
    } else {
      this.mesh.material = material;
      this.mesh.renderOrder = kind === 'core' ? 12 : 9;
    }
    this.mesh.visible = true;
    this.active = true;
    this.geo.setDrawRange(0, 0);
  }

  push(pos, width, life, alpha, now, minStep) {
    if (this.lastEmit.distanceToSquared(pos) < minStep * minStep) return;
    this.lastEmit.copy(pos);
    if (this.count >= TRAIL_POINTS) {
      // shift down (rare; trails usually expire first)
      this.pts.copyWithin(0, 3);
      this.born.copyWithin(0, 1);
      this.width.copyWithin(0, 1);
      this.life.copyWithin(0, 1);
      this.baseA.copyWithin(0, 1);
      this.count--;
    }
    const i = this.count++;
    this.pts[i * 3] = pos.x; this.pts[i * 3 + 1] = pos.y; this.pts[i * 3 + 2] = pos.z;
    this.born[i] = now;
    this.width[i] = width;
    this.life[i] = life;
    this.baseA[i] = alpha;
  }

  update(now, camera, wind, dt, releaseIfDead) {
    if (!this.active) return;
    // drop expired head points
    let start = 0;
    while (start < this.count && now - this.born[start] > this.life[start]) start++;
    if (start > 0) {
      this.pts.copyWithin(0, start * 3, this.count * 3);
      this.born.copyWithin(0, start, this.count);
      this.width.copyWithin(0, start, this.count);
      this.life.copyWithin(0, start, this.count);
      this.baseA.copyWithin(0, start, this.count);
      this.count -= start;
    }
    if (this.count < 2) {
      this.geo.setDrawRange(0, 0);
      if (releaseIfDead && this.count === 0) { this.active = false; this.mesh.visible = false; }
      return;
    }
    const P = this.posAttr.array, C = this.colAttr.array;
    const camPos = camera.position;
    for (let i = 0; i < this.count; i++) {
      const x = this.pts[i * 3], y = this.pts[i * 3 + 1], z = this.pts[i * 3 + 2];
      // wind drift (stronger low)
      const drift = 1.2 * airDensity(y) + 0.25;
      this.pts[i * 3] = x + wind.x * drift * dt;
      this.pts[i * 3 + 2] = z + wind.z * drift * dt;
      this.pts[i * 3 + 1] = y + 1.4 * dt * (this.kind === 'smoke' ? airDensity(y) : 0); // hot smoke rises a bit

      // tangent
      const i0 = Math.max(0, i - 1), i1 = Math.min(this.count - 1, i + 1);
      _dir.set(this.pts[i1 * 3] - this.pts[i0 * 3], this.pts[i1 * 3 + 1] - this.pts[i0 * 3 + 1], this.pts[i1 * 3 + 2] - this.pts[i0 * 3 + 2]);
      _v.set(camPos.x - x, camPos.y - y, camPos.z - z);
      _side.crossVectors(_dir, _v).normalize();

      const age = now - this.born[i];
      const t = Math.min(1, age / this.life[i]);
      const grow = this.kind === 'core' ? 0.3 : this.kind === 'threat' ? 2.2 : 1.8;
      const w = this.width[i] * (1 + t * grow);
      const alpha = this.baseA[i] * (1 - THREE.MathUtils.smoothstep(t, 0.3, 1));
      P[i * 6] = x + _side.x * w; P[i * 6 + 1] = y + _side.y * w; P[i * 6 + 2] = z + _side.z * w;
      P[i * 6 + 3] = x - _side.x * w; P[i * 6 + 4] = y - _side.y * w; P[i * 6 + 5] = z - _side.z * w;
      C[i * 8 + 3] = alpha;
      C[i * 8 + 7] = alpha;
      // rgb constant white — tinted by material
      C[i * 8] = C[i * 8 + 1] = C[i * 8 + 2] = 1;
      C[i * 8 + 4] = C[i * 8 + 5] = C[i * 8 + 6] = 1;
    }
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.geo.setDrawRange(0, (this.count - 1) * 6);
  }
}

// ------------------------------------------------------------------ Effects
export class Effects {
  constructor(ctx) {
    this.ctx = ctx;
    const scene = ctx.scene;
    this.now = 0;
    this.quality = 1;

    this.smoke = new QuadPool(scene, softSmokeTexture(), 900, { additive: false });
    this.fire = new QuadPool(scene, fireTexture(), 320, { additive: true });
    this.flash = new QuadPool(scene, glowTexture(), 70, { additive: true });
    this.sparks = new SparkPool(scene, 700);
    this.debris = new DebrisPool(scene, 90);
    this.rings = new RingPool(scene, 14);

    // trails
    const edgeTex = trailEdgeTexture();
    this.trailMats = {
      smoke: new THREE.MeshBasicMaterial({
        color: 0xc9c4bb, transparent: true, depthWrite: false, vertexColors: true,
        side: THREE.DoubleSide, map: edgeTex,
      }),
      threat: new THREE.MeshBasicMaterial({
        color: 0xb8b2a8, transparent: true, depthWrite: false, vertexColors: true,
        side: THREE.DoubleSide, map: edgeTex,
      }),
      core: new THREE.MeshBasicMaterial({
        color: 0xffc074, transparent: true, depthWrite: false, vertexColors: true,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, map: edgeTex,
      }),
    };
    this.trails = [];
    for (let i = 0; i < 26; i++) this.trails.push(new Trail(scene));

    // emitters (launch plumes etc.)
    this.emitters = [];
    for (let i = 0; i < 12; i++) {
      this.emitters.push({ alive: false, pos: new THREE.Vector3(), dir: new THREE.Vector3(), age: 0, dur: 0, kind: '', rate: 0, acc: 0 });
    }

    // burning fragments
    this.fragments = [];
    for (let i = 0; i < 30; i++) {
      this.fragments.push({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), age: 0, life: 0, acc: 0 });
    }

    // flash lights
    this.lights = [];
    for (let i = 0; i < 5; i++) {
      const l = new THREE.PointLight(0xffcf9a, 0, 900, 1.6);
      scene.add(l);
      this.lights.push({ light: l, age: 0, dur: 0, peak: 0, alive: false });
    }

    // craters
    this.craters = [];
    const cTex = craterTexture();
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: cTex, transparent: true, opacity: 0, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -4,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      scene.add(m);
      this.craters.push({ mesh: m, age: 0, alive: false });
    }
    this.craterCursor = 0;
  }

  setLightTint(color) {
    this.smoke.uniforms.uTint.value.copy(color);
  }

  // ---------------- trails
  acquireTrail(kind) {
    const t = this.trails.find(t => !t.active);
    if (!t) return null;
    const mat = kind === 'core' ? this.trailMats.core : (kind === 'threat' ? this.trailMats.threat : this.trailMats.smoke);
    t.reset(kind, mat);
    t.releasing = false;
    return t;
  }

  releaseTrail(t) {
    if (!t) return;
    t.releasing = true; // let it fade out, then auto-deactivate
  }

  feedThreatTrail(trail, pos, vel, heat, isDecoy) {
    const cf = contrailFactor(pos.y);
    const width = (isDecoy ? 1.8 : 2.8) * (0.7 + cf * 0.7);
    const life = 3 + cf * 11;
    const alpha = 0.4 + cf * 0.3 + heat * 0.1;
    trail.push(pos, width, life, Math.min(0.85, alpha), this.now, 7);
  }

  feedInterceptorTrail(smokeTrail, coreTrail, pos, vel, thrusting, def) {
    const cf = contrailFactor(pos.y);
    if (smokeTrail) {
      const width = thrusting ? 1.7 : 1.0 + cf * 1.3;
      const life = thrusting ? 8 : 2.5 + cf * 13;
      const alpha = thrusting ? 0.85 : 0.26 + cf * 0.45;
      smokeTrail.push(pos, width, life, alpha, this.now, 4);
    }
    if (coreTrail && thrusting) {
      coreTrail.push(pos, 0.8, 0.35, 0.95, this.now, 1.5);
    }
  }

  // ---------------- lights
  flashLight(pos, intensity, dur, color = 0xffcf9a) {
    const slot = this.lights.find(l => !l.alive) || this.lights[0];
    slot.alive = true;
    slot.age = 0; slot.dur = dur; slot.peak = intensity;
    slot.light.position.copy(pos);
    slot.light.color.set(color);
    slot.light.intensity = intensity;
  }

  // ---------------- compound effects
  launchPlume(pos, dir, kind) {
    const scale = kind === 'huge' ? 2.2 : kind === 'tall' ? 1.5 : 1.0;
    const gy = groundHeight(pos.x, pos.z);
    const ground = _v2.set(pos.x, gy + 0.5, pos.z);

    // flash + light
    this.flash.spawn({ x: pos.x, y: pos.y, z: pos.z, size0: 10 * scale, size1: 22 * scale, life: 0.22, c0: 0xffe9b0, alpha: 0.95, fadeIn: 0.01 });
    this.flashLight(pos, 2600 * scale, 0.5, 0xffd9a0);

    // fire cone along dir
    const n = Math.round(26 * scale * this.quality);
    for (let i = 0; i < n; i++) {
      const t = Math.random();
      const spread = 2.2 * t * scale;
      this.fire.spawn({
        x: pos.x - dir.x * t * 7 * scale + (Math.random() - 0.5) * spread,
        y: pos.y - dir.y * t * 7 * scale + (Math.random() - 0.5) * spread,
        z: pos.z - dir.z * t * 7 * scale + (Math.random() - 0.5) * spread,
        vx: -dir.x * 14 * (1 - t) + (Math.random() - 0.5) * 5,
        vy: -dir.y * 14 * (1 - t) + (Math.random() - 0.5) * 5,
        vz: -dir.z * 14 * (1 - t) + (Math.random() - 0.5) * 5,
        size0: (1.6 + t * 3.2) * scale, size1: (3.2 + t * 5) * scale,
        life: 0.35 + Math.random() * 0.4,
        c0: 0xffe4a8, c1: 0xff5a18, alpha: 0.9, fadeIn: 0.01, damp: 1.6,
      });
    }
    // ground dust ring
    const rings = Math.round(22 * this.quality);
    for (let i = 0; i < rings; i++) {
      const a = (i / rings) * Math.PI * 2 + Math.random() * 0.3;
      const spd = (8 + Math.random() * 10) * scale;
      this.smoke.spawn({
        x: ground.x + Math.cos(a) * 2, y: ground.y + 0.4, z: ground.z + Math.sin(a) * 2,
        vx: Math.cos(a) * spd, vy: 1.2 + Math.random() * 1.6, vz: Math.sin(a) * spd,
        size0: 2.4 * scale, size1: (7 + Math.random() * 4) * scale,
        life: 2.2 + Math.random() * 1.6,
        c0: 0xa4906c, c1: 0x8d7f66, alpha: 0.5, damp: 1.4, grav: -0.4, wind: 1.2,
      });
    }
    // pad smoke emitter
    this._emit('pad', ground, dir, kind === 'huge' ? 7 : 4.5, 26 * this.quality * scale);
    // shockwave ring on ground for big launches
    if (kind !== 'compact') {
      this.rings.spawn(ground.clone().add(_v.set(0, 0.6, 0)), 2, 26 * scale, 0.7, 0.5, { flat: true });
    }
    this.ctx.player?.addShake(kind === 'huge' ? 0.5 : 0.3, pos);
  }

  stageSeparation(pos, vel) {
    this.flash.spawn({ x: pos.x, y: pos.y, z: pos.z, size0: 6, size1: 14, life: 0.3, c0: 0xffe0a0, alpha: 0.9 });
    // booster falls away burning
    const f = this.fragments.find(f => !f.alive) || this.fragments[0];
    f.alive = true;
    f.pos.copy(pos);
    f.vel.copy(vel).multiplyScalar(0.55);
    f.vel.x += (Math.random() - 0.5) * 12;
    f.vel.z += (Math.random() - 0.5) * 12;
    f.age = 0; f.life = 7; f.acc = 0;
    for (let i = 0; i < 10; i++) {
      this.sparks.spawn(pos.x, pos.y, pos.z,
        (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 26, 0.8);
    }
  }

  interceptKill(pos, velA, velB) {
    const q = this.quality;
    this.flash.spawn({ x: pos.x, y: pos.y, z: pos.z, size0: 26, size1: 70, life: 0.3, c0: 0xfff4d8, alpha: 1, fadeIn: 0.005 });
    this.flash.spawn({ x: pos.x, y: pos.y, z: pos.z, size0: 10, size1: 30, life: 0.55, c0: 0xffc27a, alpha: 0.9, fadeIn: 0.005 });
    this.flashLight(pos, 30000, 0.7, 0xffd9a8);
    this.rings.spawn(pos, 4, 90, 0.9, 0.85);

    for (let i = 0; i < 18 * q; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      const spd = 12 + Math.random() * 30;
      this.fire.spawn({
        x: pos.x, y: pos.y, z: pos.z,
        vx: Math.cos(a) * Math.cos(b) * spd, vy: Math.sin(b) * spd, vz: Math.sin(a) * Math.cos(b) * spd,
        size0: 3 + Math.random() * 4, size1: 7 + Math.random() * 6,
        life: 0.5 + Math.random() * 0.5, c0: 0xffe8b8, c1: 0xff4a10, alpha: 0.95, damp: 1.8,
      });
    }
    for (let i = 0; i < 16 * q; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      const spd = 6 + Math.random() * 14;
      this.smoke.spawn({
        x: pos.x, y: pos.y, z: pos.z,
        vx: Math.cos(a) * Math.cos(b) * spd, vy: Math.sin(b) * spd * 0.7, vz: Math.sin(a) * Math.cos(b) * spd,
        size0: 5, size1: 16 + Math.random() * 8,
        life: 4 + Math.random() * 5,
        c0: 0x8e8a84, c1: 0x55534e, alpha: 0.55, damp: 0.9, grav: -0.3, wind: 1,
      });
    }
    for (let i = 0; i < 60 * q; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      const spd = 24 + Math.random() * 60;
      this.sparks.spawn(pos.x, pos.y, pos.z,
        Math.cos(a) * Math.cos(b) * spd, Math.sin(b) * spd, Math.sin(a) * Math.cos(b) * spd,
        0.7 + Math.random() * 0.9);
    }
    // burning fragments raining down
    const frags = Math.round(5 * q);
    for (let i = 0; i < frags; i++) {
      const f = this.fragments.find(f => !f.alive);
      if (!f) break;
      f.alive = true;
      f.pos.copy(pos);
      f.vel.set((Math.random() - 0.5) * 55, (Math.random() - 0.3) * 40, (Math.random() - 0.5) * 55);
      f.age = 0; f.life = 3.5 + Math.random() * 3; f.acc = 0;
    }
    for (let i = 0; i < 8 * q; i++) {
      this.debris.spawn(pos, _v.set((Math.random() - 0.5) * 45, (Math.random() - 0.4) * 36, (Math.random() - 0.5) * 45), 0.4 + Math.random() * 0.7, 6);
    }
    this.ctx.player?.addShake(0.35, pos);
  }

  groundImpact(pos, scale = 1) {
    const q = this.quality;
    this.flash.spawn({ x: pos.x, y: pos.y + 3, z: pos.z, size0: 30 * scale, size1: 80 * scale, life: 0.3, c0: 0xfff0c8, alpha: 1, fadeIn: 0.004 });
    this.flashLight(_v.set(pos.x, pos.y + 8, pos.z), 42000 * scale, 0.8, 0xffc27a);

    // fire column
    for (let i = 0; i < 24 * q * scale; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 3 * scale;
      this.fire.spawn({
        x: pos.x + Math.cos(a) * r, y: pos.y + Math.random() * 2, z: pos.z + Math.sin(a) * r,
        vx: Math.cos(a) * (4 + Math.random() * 8), vy: 18 + Math.random() * 22 * scale, vz: Math.sin(a) * (4 + Math.random() * 8),
        size0: (3 + Math.random() * 3) * scale, size1: (8 + Math.random() * 5) * scale,
        life: 0.5 + Math.random() * 0.6, c0: 0xffe2a0, c1: 0xff3a08, alpha: 0.95, damp: 1.2,
      });
    }
    // dirt fountain (dark)
    for (let i = 0; i < 22 * q * scale; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = 14 + Math.random() * 26 * scale;
      this.smoke.spawn({
        x: pos.x, y: pos.y + 1, z: pos.z,
        vx: Math.cos(a) * (3 + Math.random() * 12), vy: up, vz: Math.sin(a) * (3 + Math.random() * 12),
        size0: 2.5 * scale, size1: (9 + Math.random() * 6) * scale,
        life: 2.2 + Math.random() * 2, c0: 0x4a4038, c1: 0x2e2a24, alpha: 0.85, damp: 0.8, grav: 9, wind: 0.6,
      });
    }
    // rolling dust donut
    for (let i = 0; i < 26 * q * scale; i++) {
      const a = (i / 26) * Math.PI * 2 + Math.random() * 0.4;
      const spd = (14 + Math.random() * 14) * scale;
      this.smoke.spawn({
        x: pos.x + Math.cos(a) * 2, y: pos.y + 1, z: pos.z + Math.sin(a) * 2,
        vx: Math.cos(a) * spd, vy: 2 + Math.random() * 3, vz: Math.sin(a) * spd,
        size0: 3.5 * scale, size1: (13 + Math.random() * 8) * scale,
        life: 3.4 + Math.random() * 2.4,
        c0: 0x9d8a68, c1: 0x6f6350, alpha: 0.6, damp: 1.15, grav: -0.2, wind: 1.3,
      });
    }
    // lingering column
    this._emit('column', _v2.copy(pos), new THREE.Vector3(0, 1, 0), 6.5, 8 * q * scale);
    // sparks + debris + ring + crater
    for (let i = 0; i < 40 * q; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * 1.2;
      const spd = 24 + Math.random() * 50 * scale;
      this.sparks.spawn(pos.x, pos.y + 1, pos.z,
        Math.cos(a) * Math.cos(b) * spd, Math.sin(b) * spd + 10, Math.sin(a) * Math.cos(b) * spd,
        0.6 + Math.random() * 0.8);
    }
    for (let i = 0; i < 12 * q * scale; i++) {
      this.debris.spawn(_v.set(pos.x, pos.y + 2, pos.z),
        _v2.set((Math.random() - 0.5) * 40 * scale, 14 + Math.random() * 30 * scale, (Math.random() - 0.5) * 40 * scale),
        0.5 + Math.random() * 0.9, 7);
    }
    this.rings.spawn(_v.set(pos.x, pos.y + 1.2, pos.z), 3, 70 * scale, 1.1, 0.7, { flat: true });
    this.addCrater(pos, 9 * scale);
    this.ctx.player?.addShake(Math.min(1, 1.4 * scale), pos);
  }

  selfDestruct(pos) {
    this.flash.spawn({ x: pos.x, y: pos.y, z: pos.z, size0: 10, size1: 26, life: 0.25, c0: 0xffe2b0, alpha: 0.95 });
    this.flashLight(pos, 6000, 0.4);
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      const spd = 8 + Math.random() * 12;
      this.smoke.spawn({
        x: pos.x, y: pos.y, z: pos.z,
        vx: Math.cos(a) * Math.cos(b) * spd, vy: Math.sin(b) * spd, vz: Math.sin(a) * Math.cos(b) * spd,
        size0: 3, size1: 9, life: 2.4, c0: 0x77726a, c1: 0x4e4a44, alpha: 0.5, damp: 1.2,
      });
    }
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      const spd = 16 + Math.random() * 26;
      this.sparks.spawn(pos.x, pos.y, pos.z,
        Math.cos(a) * Math.cos(b) * spd, Math.sin(b) * spd, Math.sin(a) * Math.cos(b) * spd, 0.6);
    }
  }

  decoyBurnup(pos) {
    this.flash.spawn({ x: pos.x, y: pos.y, z: pos.z, size0: 8, size1: 20, life: 0.5, c0: 0x9fd8ff, alpha: 0.8 });
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      const spd = 10 + Math.random() * 30;
      this.sparks.spawn(pos.x, pos.y, pos.z,
        Math.cos(a) * Math.cos(b) * spd, Math.sin(b) * spd - 6, Math.sin(a) * Math.cos(b) * spd,
        0.9 + Math.random() * 1.1);
    }
  }

  correctionPuff(pos, vel) {
    _dir.copy(vel).normalize();
    this.smoke.spawn({
      x: pos.x - _dir.x * 2, y: pos.y - _dir.y * 2, z: pos.z - _dir.z * 2,
      vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, vz: (Math.random() - 0.5) * 6,
      size0: 1.4, size1: 4.5, life: 1.1, c0: 0xd9d4c8, alpha: 0.5, damp: 1.4,
    });
  }

  addCrater(pos, size) {
    const c = this.craters[this.craterCursor % this.craters.length];
    this.craterCursor++;
    c.alive = true; c.age = 0;
    c.mesh.visible = true;
    c.mesh.position.set(pos.x, groundHeight(pos.x, pos.z) + 0.25, pos.z);
    c.mesh.scale.setScalar(size);
    c.mesh.rotation.z = Math.random() * 6;
    c.mesh.material.opacity = 0.95;
  }

  _emit(kind, pos, dir, dur, rate) {
    const e = this.emitters.find(e => !e.alive) || this.emitters[0];
    e.alive = true;
    e.kind = kind;
    e.pos.copy(pos); e.dir.copy(dir);
    e.age = 0; e.dur = dur; e.rate = rate; e.acc = 0;
  }

  update(dt, camera) {
    this.now += dt;
    const wind = this.ctx.weather ? this.ctx.weather.wind : _v.set(1, 0, 0);

    // trail color follows time of day (moonlit at night, warm at sunset)
    if (this.ctx.weather && this.ctx.weather.trailTint) {
      this.trailMats.smoke.color.copy(this.ctx.weather.trailTint);
      this.trailMats.threat.color.copy(this.ctx.weather.trailTint).multiplyScalar(0.92);
    }

    // emitters
    for (const e of this.emitters) {
      if (!e.alive) continue;
      e.age += dt;
      if (e.age > e.dur) { e.alive = false; continue; }
      const fade = 1 - e.age / e.dur;
      e.acc += e.rate * fade * dt;
      while (e.acc >= 1) {
        e.acc -= 1;
        if (e.kind === 'pad') {
          this.smoke.spawn({
            x: e.pos.x + (Math.random() - 0.5) * 3, y: e.pos.y + Math.random() * 1.5, z: e.pos.z + (Math.random() - 0.5) * 3,
            vx: (Math.random() - 0.5) * 3, vy: 2.5 + Math.random() * 3.5, vz: (Math.random() - 0.5) * 3,
            size0: 3, size1: 10 + Math.random() * 5, life: 3.5 + Math.random() * 3,
            c0: 0xbdb5a6, c1: 0x8d867a, alpha: 0.42 * fade + 0.1, damp: 0.7, grav: -0.5, wind: 1.4,
          });
        } else if (e.kind === 'column') {
          this.smoke.spawn({
            x: e.pos.x + (Math.random() - 0.5) * 4, y: e.pos.y + 2 + Math.random() * 6, z: e.pos.z + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 2, vy: 5 + Math.random() * 6, vz: (Math.random() - 0.5) * 2,
            size0: 5, size1: 17, life: 5 + Math.random() * 4,
            c0: 0x3c3630, c1: 0x27231e, alpha: 0.5 * fade + 0.12, damp: 0.5, grav: -0.8, wind: 1.1,
          });
        }
      }
    }

    // burning fragments
    for (const f of this.fragments) {
      if (!f.alive) continue;
      f.age += dt;
      f.vel.y -= DEBRIS_GRAVITY * 1.6 * dt;
      f.pos.addScaledVector(f.vel, dt);
      const gy = groundHeight(f.pos.x, f.pos.z);
      if (f.age > f.life || f.pos.y < gy + 0.5) {
        if (f.pos.y < gy + 0.5) {
          // small ground puff
          this.smoke.spawn({
            x: f.pos.x, y: gy + 0.5, z: f.pos.z, vy: 2,
            size0: 2, size1: 6, life: 2, c0: 0x8d7f66, alpha: 0.45, damp: 1,
          });
        }
        f.alive = false;
        continue;
      }
      f.acc += dt * 30;
      while (f.acc >= 1) {
        f.acc -= 1;
        this.fire.spawn({
          x: f.pos.x, y: f.pos.y, z: f.pos.z,
          vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2,
          size0: 1.6, size1: 0.6, life: 0.3, c0: 0xffd898, c1: 0xff5a10, alpha: 0.9, fadeIn: 0.01,
        });
        if (Math.random() < 0.4) {
          this.smoke.spawn({
            x: f.pos.x, y: f.pos.y, z: f.pos.z,
            size0: 1.2, size1: 4, life: 1.8 + Math.random(), c0: 0x6e6a64, alpha: 0.4, damp: 0.4, wind: 1,
          });
        }
      }
    }

    // lights decay
    for (const l of this.lights) {
      if (!l.alive) continue;
      l.age += dt;
      const t = l.age / l.dur;
      if (t >= 1) { l.alive = false; l.light.intensity = 0; continue; }
      l.light.intensity = l.peak * (1 - t) * (1 - t);
    }

    // craters fade
    for (const c of this.craters) {
      if (!c.alive) continue;
      c.age += dt;
      if (c.age > 50) {
        c.mesh.material.opacity = Math.max(0, 0.95 * (1 - (c.age - 50) / 25));
        if (c.mesh.material.opacity <= 0) { c.alive = false; c.mesh.visible = false; }
      }
    }

    this.smoke.update(dt, wind);
    this.fire.update(dt, wind);
    this.flash.update(dt, wind);
    this.sparks.update(dt);
    this.debris.update(dt);
    this.rings.update(dt, camera);
    for (const t of this.trails) t.update(this.now, camera, wind, dt, t.releasing);
  }
}
