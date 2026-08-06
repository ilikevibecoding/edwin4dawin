// Pooled visual effects: billboard particles, ribbon trails, debris,
// shockwaves, craters, flash lights. Zero per-frame allocations in steady
// state — everything below is preallocated and recycled.
import * as THREE from 'three';
import { glowTexture, ringTexture, craterTexture, trailEdgeTexture } from './texgen.js';
import { mulberry32 } from './rng.js';
import { DEBRIS_GRAVITY, groundHeight, contrailFactor, airDensity } from './physics.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _side = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _p = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

// Local smoke sprite: denser cauliflower clumps + eroded ragged edge for more
// contrast than the old uniform fog blob. Kept local to effects (fx-only look).
function clumpySmokeTexture() {
  const S = 128;
  const cnv = document.createElement('canvas');
  cnv.width = S; cnv.height = S;
  const g = cnv.getContext('2d');
  const rnd = mulberry32(9137);
  g.clearRect(0, 0, S, S);
  const blob = (x, y, r, stops) => {
    const maxR = Math.min(x, y, S - x, S - y) - 1;
    const rr = Math.max(2, Math.min(r, maxR));
    const grad = g.createRadialGradient(x - rr * 0.2, y - rr * 0.2, 0, x, y, rr);
    for (const [o, a] of stops) grad.addColorStop(o, `rgba(255,255,255,${a})`);
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
  };
  // soft body — fat base mass so the sprite has real coverage
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * S * 0.13;
    blob(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r, S * (0.17 + rnd() * 0.14),
      [[0, 0.15], [0.6, 0.07], [1, 0]]);
  }
  // dense clumps (cauliflower lobes) — larger + hotter than the base
  for (let i = 0; i < 30; i++) {
    const a = rnd() * Math.PI * 2, r = Math.pow(rnd(), 0.8) * S * 0.27;
    blob(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r, S * (0.07 + rnd() * 0.075),
      [[0, 0.3 + rnd() * 0.25], [0.55, 0.13 + rnd() * 0.09], [1, 0]]);
  }
  // erode small ragged bites near the rim only (keeps the core solid)
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 8; i++) {
    const a = rnd() * Math.PI * 2, r = S * (0.3 + rnd() * 0.14);
    const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
    const rad = S * (0.035 + rnd() * 0.05);
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, `rgba(0,0,0,${0.25 + rnd() * 0.25})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(cnv);
  t.anisotropy = 2;
  return t;
}

// Local fire sprite: hotter core than texgen's fireTexture so fireballs and
// launch tongues stay readable against a bright day sky at km ranges.
function denseFireTexture() {
  const S = 128;
  const cnv = document.createElement('canvas');
  cnv.width = S; cnv.height = S;
  const g = cnv.getContext('2d');
  const rnd = mulberry32(7411);
  g.clearRect(0, 0, S, S);
  for (let i = 0; i < 22; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * S * 0.17;
    const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
    const rad = S * (0.09 + rnd() * 0.2);
    const maxR = Math.min(x, y, S - x, S - y) - 1;
    const rr = Math.max(3, Math.min(rad, maxR));
    const grad = g.createRadialGradient(x, y, 0, x, y, rr);
    grad.addColorStop(0, `rgba(255,255,255,${0.55 + rnd() * 0.3})`);
    grad.addColorStop(0.45, 'rgba(255,255,255,0.26)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(cnv);
  t.anisotropy = 2;
  return t;
}

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
    this.age[idx] = -(p.delay || 0); this.life[idx] = p.life || 1;
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
      if (this.age[i] < 0) continue; // delayed spawn: frozen + invisible until born
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
    this.kindA = new Uint8Array(capacity); // 0 = hot orange, 1 = cool cyan-white
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

  spawn(x, y, z, vx, vy, vz, life, kind = 0) {
    const i = this.cursor % this.capacity;
    this.cursor++;
    this.alive[i] = 1;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.age[i] = 0; this.life[i] = life;
    this.kindA[i] = kind;
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
      if (this.kindA[i]) {
        // cool cyan-white (decoy burnup streaks)
        C[n * 3] = 0.55 + 1.0 * heat * heat;
        C[n * 3 + 1] = 0.8 + 0.9 * heat;
        C[n * 3 + 2] = 1.1 + 0.9 * heat;
      } else {
        C[n * 3] = 1.6 * heat + 0.4;
        C[n * 3 + 1] = 1.1 * heat * heat + 0.15;
        C[n * 3 + 2] = 0.5 * heat * heat * heat;
      }
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
      const dist = _v.length();
      _side.crossVectors(_dir, _v).normalize();

      const age = now - this.born[i];
      const t = Math.min(1, age / this.life[i]);
      const grow = this.kind === 'core' ? 0.3 : this.kind === 'threat' ? 2.2 : 1.8;
      // enforce a minimum apparent width so trails still read from km away
      const wMin = dist * (this.kind === 'core' ? 0.0012 : 0.003);
      const w = Math.max(this.width[i] * (1 + t * grow), wMin);
      const alpha = this.baseA[i] * (1 - THREE.MathUtils.smoothstep(t, 0.42, 1));
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

    this.smoke = new QuadPool(scene, clumpySmokeTexture(), 1150, { additive: false });
    this.fire = new QuadPool(scene, denseFireTexture(), 400, { additive: true });
    this.flash = new QuadPool(scene, glowTexture(), 70, { additive: true });
    this.sparks = new SparkPool(scene, 900);
    this.debris = new DebrisPool(scene, 110);
    this.rings = new RingPool(scene, 16);

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

    // emitters (launch plumes, impact columns, mushroom heads)
    this.emitters = [];
    for (let i = 0; i < 12; i++) {
      this.emitters.push({ alive: false, pos: new THREE.Vector3(), dir: new THREE.Vector3(), age: 0, dur: 0, kind: '', rate: 0, acc: 0, scale: 1 });
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
    // widths scale with altitude so trails still subtend pixels at 4-8 km
    const width = (isDecoy ? 1.8 : 2.8) * (0.7 + cf * 0.7) + cf * cf * (isDecoy ? 6 : 13);
    const life = 3 + cf * 18;
    const alpha = 0.5 + cf * 0.32 + heat * 0.1;
    trail.push(pos, width, life, Math.min(0.9, alpha), this.now, 7 + cf * 12);
  }

  feedInterceptorTrail(smokeTrail, coreTrail, pos, vel, thrusting, def) {
    const cf = contrailFactor(pos.y);
    if (smokeTrail) {
      if (thrusting) {
        // slim, turbulent boost column: per-point width jitter (~±30%) and a
        // slight lateral offset off the flight axis so it billows instead of
        // reading as a ruler-straight solid slab. Widens with altitude so the
        // column still reads from km away.
        const width = 1.1 * (0.72 + Math.random() * 0.62) * (1 + cf * cf * 5);
        _dir.copy(vel).normalize();
        _p.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        _p.addScaledVector(_dir, -_p.dot(_dir)); // keep offset perpendicular
        const len = _p.length();
        if (len > 1e-4) _p.multiplyScalar((0.4 + Math.random() * 0.75) * (1 + cf * 2) / len);
        _p.add(pos);
        smokeTrail.push(_p, width, 8 + cf * 5, 0.65, this.now, 4 + cf * 9);
      } else {
        const width = 1.0 + cf * 1.3 + cf * cf * 7;
        const life = 2.5 + cf * 16;
        const alpha = 0.34 + cf * 0.48;
        smokeTrail.push(pos, width, life, alpha, this.now, 4 + cf * 12);
      }
    }
    if (coreTrail && thrusting) {
      coreTrail.push(pos, 0.8 + cf * cf * 3, 0.35, 0.95, this.now, 1.5);
    }
  }

  // ---------------- lights
  flashLight(pos, intensity, dur, color = 0xffcf9a, delay = 0) {
    const slot = this.lights.find(l => !l.alive) || this.lights[0];
    slot.alive = true;
    slot.age = -delay; slot.dur = dur; slot.peak = intensity;
    slot.light.position.copy(pos);
    slot.light.color.set(color);
    slot.light.intensity = delay > 0 ? 0 : intensity;
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
    // bright fire tongues punching radially through the dust ring (~first 0.5 s)
    const tongues = Math.max(4, Math.round(8 * scale * this.quality));
    for (let i = 0; i < tongues; i++) {
      const a = (i / tongues) * Math.PI * 2 + Math.random() * 0.7;
      const spd = (17 + Math.random() * 14) * scale;
      this.fire.spawn({
        x: ground.x + Math.cos(a) * 2.5, y: ground.y + 0.6 + Math.random() * 0.9, z: ground.z + Math.sin(a) * 2.5,
        vx: Math.cos(a) * spd, vy: 1.4 + Math.random() * 2.2, vz: Math.sin(a) * spd,
        size0: (2.2 + Math.random() * 1.6) * scale, size1: (3.6 + Math.random() * 2.6) * scale,
        life: 0.28 + Math.random() * 0.2, c0: 0xffe9b8, c1: 0xff6a1a, alpha: 0.9,
        fadeIn: 0.01, damp: 2.2, delay: Math.random() * 0.2,
      });
    }
    // pad smoke emitter
    this._emit('pad', ground, dir, kind === 'huge' ? 7 : 4.5, 26 * this.quality * scale);
    if (kind === 'huge') {
      // SENTINEL: tall steam-grey exhaust column climbing off the pad
      this._emit('padcol', ground, UP, 3.4, 30 * this.quality);
    }
    // shockwave ring on ground for big launches (wider for huge)
    if (kind !== 'compact') {
      const ringR = 26 * scale * (kind === 'huge' ? 1.45 : 1);
      this.rings.spawn(ground.clone().add(_v.set(0, 0.6, 0)), 2, ringR, 0.75, 0.5, { flat: true });
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
    const n = Math.max(4, Math.round(10 * this.quality));
    for (let i = 0; i < n; i++) {
      this.sparks.spawn(pos.x, pos.y, pos.z,
        (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 26, 0.8);
    }
  }

  interceptKill(pos, velA, velB) {
    const q = this.quality;
    // The money shot — usually seen 2-5 km away against open sky. Cinematic
    // distance compensation: gently inflate world sizes for far kills so the
    // event still reads from the base, without dwarfing close intercepts.
    const camDist = this.ctx.camera ? this.ctx.camera.position.distanceTo(pos) : 2500;
    const ds = THREE.MathUtils.clamp(camDist / 1500, 1, 4.2);   // flash + particle sizes
    const dsO = 1 + (ds - 1) * 0.5;                             // cluster offsets/speeds (tighter, keeps mass dense)
    const dsR = 1 + (ds - 1) * 0.7;                             // shock ring
    // primary flash + wide soft halo, delayed secondary pop, warm afterglow
    this.flash.spawn({ x: pos.x, y: pos.y, z: pos.z, size0: 50 * ds, size1: 150 * ds, life: 0.65, c0: 0xfff4d8, alpha: 1, fadeIn: 0.005 });
    this.flash.spawn({ x: pos.x, y: pos.y, z: pos.z, size0: 90 * ds, size1: 260 * ds, life: 0.55, c0: 0xfff8e8, alpha: 0.4, fadeIn: 0.005 });
    this.flash.spawn({ x: pos.x, y: pos.y, z: pos.z, size0: 20 * ds, size1: 70 * ds, life: 0.8, c0: 0xffc27a, alpha: 0.95, fadeIn: 0.005 });
    this.flash.spawn({ x: pos.x, y: pos.y, z: pos.z, size0: 34 * ds, size1: 100 * ds, life: 0.55, c0: 0xffdca0, alpha: 0.85, fadeIn: 0.02, delay: 0.28 });
    this.flash.spawn({ x: pos.x, y: pos.y, z: pos.z, size0: 34 * ds, size1: 95 * ds, life: 2.5, c0: 0xff9a4a, alpha: 0.6, fadeIn: 0.12, delay: 0.4 });
    this.flashLight(pos, 34000 * ds, 0.7, 0xffd9a8);
    this.flashLight(pos, 16000 * ds, 0.9, 0xff9a50, 0.28);
    this.rings.spawn(pos, 8 * dsR, 215 * dsR, 1.6, 1.0);

    // burning heart: tight, near-static hot cluster so the kill has a solid
    // incandescent core that survives the flash wash-out
    for (let i = 0; i < 8; i++) {
      this.fire.spawn({
        x: pos.x + (Math.random() - 0.5) * 7 * dsO, y: pos.y + (Math.random() - 0.5) * 7 * dsO, z: pos.z + (Math.random() - 0.5) * 7 * dsO,
        vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, vz: (Math.random() - 0.5) * 10,
        size0: (24 + Math.random() * 15) * ds, size1: (36 + Math.random() * 18) * ds,
        life: 1.5 + Math.random() * 0.7, c0: 0xfff0c8, c1: 0xff5a14, alpha: 1, damp: 1.2,
        delay: Math.random() * 0.1, fadeIn: 0.02,
      });
    }
    // fireball cluster: offset volume, sized to read at km range
    for (let i = 0; i < 34 * q; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      const spd = (16 + Math.random() * 44) * dsO;
      this.fire.spawn({
        x: pos.x + (Math.random() - 0.5) * 14 * dsO, y: pos.y + (Math.random() - 0.5) * 14 * dsO, z: pos.z + (Math.random() - 0.5) * 14 * dsO,
        vx: Math.cos(a) * Math.cos(b) * spd, vy: Math.sin(b) * spd, vz: Math.sin(a) * Math.cos(b) * spd,
        size0: (11 + Math.random() * 10) * ds, size1: (24 + Math.random() * 20) * ds,
        life: 0.7 + Math.random() * 0.9, c0: 0xffe8b8, c1: 0xff4a10, alpha: 0.95, damp: 1.8,
        delay: Math.random() * 0.14,
      });
    }
    // smoke: one cohesive dark cloud that marks the hit for 6-10 s. Blast
    // smoke expands violently then stalls, so spawn near-final size with slow
    // drift (fast dispersal would thin the cluster into invisibility at range).
    for (let i = 0; i < 10; i++) {
      const s1 = (95 + Math.random() * 40) * ds;
      this.smoke.spawn({
        x: pos.x + (Math.random() - 0.5) * 16 * dsO, y: pos.y + (Math.random() - 0.5) * 16 * dsO, z: pos.z + (Math.random() - 0.5) * 16 * dsO,
        vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, vz: (Math.random() - 0.5) * 5,
        size0: s1 * 0.7, size1: s1,
        life: 7 + Math.random() * 3, fadeIn: 0.5,
        c0: 0x67635e, c1: 0x4a4844, alpha: 0.95, damp: 0.9, grav: -0.25, wind: 1,
      });
    }
    for (let i = 0; i < 24 * q; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      const spd = 5 + Math.random() * 10;
      const s1 = (58 + Math.random() * 37) * ds;
      this.smoke.spawn({
        x: pos.x + (Math.random() - 0.5) * 26 * ds, y: pos.y + (Math.random() - 0.5) * 26 * ds, z: pos.z + (Math.random() - 0.5) * 26 * ds,
        vx: Math.cos(a) * Math.cos(b) * spd, vy: Math.sin(b) * spd * 0.7, vz: Math.sin(a) * Math.cos(b) * spd,
        size0: s1 * 0.6, size1: s1,
        life: 6 + Math.random() * 4, fadeIn: 0.35,
        c0: 0x6f6b66, c1: 0x4c4a46, alpha: 0.75, damp: 0.9, grav: -0.3, wind: 1,
      });
    }
    const spdS = 1 + (ds - 1) * 0.4;
    for (let i = 0; i < 130 * q; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      const spd = (26 + Math.random() * 85) * spdS;
      this.sparks.spawn(pos.x, pos.y, pos.z,
        Math.cos(a) * Math.cos(b) * spd, Math.sin(b) * spd, Math.sin(a) * Math.cos(b) * spd,
        0.7 + Math.random() * 1.3);
    }
    // burning fragments raining down in visible arcs (6-8)
    const frags = Math.round(4 + 4 * q);
    for (let i = 0; i < frags; i++) {
      const f = this.fragments.find(f => !f.alive);
      if (!f) break;
      f.alive = true;
      f.pos.copy(pos);
      f.vel.set((Math.random() - 0.5) * 80, (Math.random() - 0.2) * 50, (Math.random() - 0.5) * 80);
      f.age = 0; f.life = 5 + Math.random() * 3; f.acc = 0;
    }
    for (let i = 0; i < 12 * q; i++) {
      this.debris.spawn(pos, _v.set((Math.random() - 0.5) * 55, (Math.random() - 0.4) * 44, (Math.random() - 0.5) * 55), 0.5 + Math.random() * 0.9, 7);
    }
    this.ctx.player?.addShake(0.45, pos);
  }

  groundImpact(pos, scale = 1) {
    const q = this.quality;
    this.flash.spawn({ x: pos.x, y: pos.y + 3, z: pos.z, size0: 34 * scale, size1: 88 * scale, life: 0.3, c0: 0xfff0c8, alpha: 1, fadeIn: 0.004 });
    this.flash.spawn({ x: pos.x, y: pos.y + 6 * scale, z: pos.z, size0: 18 * scale, size1: 46 * scale, life: 0.9, c0: 0xff9a4a, alpha: 0.55, fadeIn: 0.08, delay: 0.25 });
    this.flashLight(_v.set(pos.x, pos.y + 8, pos.z), 42000 * scale, 0.8, 0xffc27a);

    // fire column
    for (let i = 0; i < 24 * q * scale; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 2.2 * scale;
      this.fire.spawn({
        x: pos.x + Math.cos(a) * r, y: pos.y + Math.random() * 2, z: pos.z + Math.sin(a) * r,
        vx: Math.cos(a) * (3 + Math.random() * 6), vy: 20 + Math.random() * 24 * scale, vz: Math.sin(a) * (3 + Math.random() * 6),
        size0: (3 + Math.random() * 3) * scale, size1: (8 + Math.random() * 5) * scale,
        life: 0.5 + Math.random() * 0.6, c0: 0xffe2a0, c1: 0xff3a08, alpha: 0.95, damp: 1.2,
      });
    }
    // dirt fountain — narrow + tall, a dark columnar geyser
    for (let i = 0; i < 26 * q * scale; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = 26 + Math.random() * 36 * scale;
      this.smoke.spawn({
        x: pos.x + (Math.random() - 0.5) * 1.6, y: pos.y + 1 + Math.random() * 2, z: pos.z + (Math.random() - 0.5) * 1.6,
        vx: Math.cos(a) * (1 + Math.random() * 4.5), vy: up, vz: Math.sin(a) * (1 + Math.random() * 4.5),
        size0: 1.8 * scale, size1: (7.5 + Math.random() * 5) * scale,
        life: 2.6 + Math.random() * 1.8, c0: 0x4a4038, c1: 0x2e2a24, alpha: 0.85, damp: 0.7, grav: 9.5, wind: 0.6,
      });
    }
    // rolling dust donut — wider and hugging the ground
    const donut = Math.round(30 * q * scale);
    for (let i = 0; i < donut; i++) {
      const a = (i / donut) * Math.PI * 2 + Math.random() * 0.4;
      const spd = (20 + Math.random() * 18) * scale;
      this.smoke.spawn({
        x: pos.x + Math.cos(a) * 2.5, y: pos.y + 0.7, z: pos.z + Math.sin(a) * 2.5,
        vx: Math.cos(a) * spd, vy: 0.6 + Math.random() * 1.3, vz: Math.sin(a) * spd,
        size0: 4 * scale, size1: (16 + Math.random() * 10) * scale,
        life: 4.4 + Math.random() * 2.6,
        c0: 0x9d8a68, c1: 0x6f6350, alpha: 0.55, damp: 1.0, grav: -0.06, wind: 1.5,
      });
    }
    // dark rolling mushroom head building over ~1.5 s, then the lingering stem
    this._emit('mushroom', pos, UP, 1.6, 34 * q * scale, scale);
    this._emit('column', pos, UP, 12, 11 * q * scale, scale);
    // sparks + debris + ring + crater
    for (let i = 0; i < 46 * q; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * 1.2;
      const spd = 24 + Math.random() * 55 * scale;
      this.sparks.spawn(pos.x, pos.y + 1, pos.z,
        Math.cos(a) * Math.cos(b) * spd, Math.sin(b) * spd + 12, Math.sin(a) * Math.cos(b) * spd,
        0.6 + Math.random() * 0.8);
    }
    // debris in big visible arcs
    for (let i = 0; i < 14 * q * scale; i++) {
      this.debris.spawn(_v.set(pos.x, pos.y + 2, pos.z),
        _v2.set((Math.random() - 0.5) * 56 * scale, 20 + Math.random() * 40 * scale, (Math.random() - 0.5) * 56 * scale),
        0.5 + Math.random() * 1.0, 8);
    }
    this.rings.spawn(_v.set(pos.x, pos.y + 1.2, pos.z), 3, 88 * scale, 1.15, 0.7, { flat: true });
    this.addCrater(pos, 13 * scale);
    this.ctx.player?.addShake(Math.min(1, 1.4 * scale), pos);
  }

  selfDestruct(pos) {
    const q = this.quality;
    this.flash.spawn({ x: pos.x, y: pos.y, z: pos.z, size0: 10, size1: 26, life: 0.25, c0: 0xffe2b0, alpha: 0.95 });
    this.flashLight(pos, 6000, 0.4);
    for (let i = 0; i < Math.round(8 * q); i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      const spd = 8 + Math.random() * 12;
      this.smoke.spawn({
        x: pos.x, y: pos.y, z: pos.z,
        vx: Math.cos(a) * Math.cos(b) * spd, vy: Math.sin(b) * spd, vz: Math.sin(a) * Math.cos(b) * spd,
        size0: 3, size1: 9, life: 2.4, c0: 0x77726a, c1: 0x4e4a44, alpha: 0.5, damp: 1.2,
      });
    }
    for (let i = 0; i < Math.round(20 * q); i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      const spd = 16 + Math.random() * 26;
      this.sparks.spawn(pos.x, pos.y, pos.z,
        Math.cos(a) * Math.cos(b) * spd, Math.sin(b) * spd, Math.sin(a) * Math.cos(b) * spd, 0.6);
    }
  }

  decoyBurnup(pos) {
    const q = this.quality;
    // decoys visibly "fizzle": cyan flash pair + big sparkle shower
    this.flash.spawn({ x: pos.x, y: pos.y, z: pos.z, size0: 12, size1: 32, life: 0.5, c0: 0x9fd8ff, alpha: 0.9 });
    this.flash.spawn({ x: pos.x, y: pos.y, z: pos.z, size0: 6, size1: 16, life: 0.3, c0: 0xeaf6ff, alpha: 0.95, fadeIn: 0.005 });
    for (let i = 0; i < 60 * q; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      const spd = 12 + Math.random() * 36;
      this.sparks.spawn(pos.x, pos.y, pos.z,
        Math.cos(a) * Math.cos(b) * spd, Math.sin(b) * spd - 6, Math.sin(a) * Math.cos(b) * spd,
        0.9 + Math.random() * 1.2);
    }
    // brief cyan-white streaks: short collinear spark strings raking downward
    const streaks = Math.max(3, Math.round(7 * q));
    for (let s = 0; s < streaks; s++) {
      const a = Math.random() * Math.PI * 2;
      _dir.set(Math.cos(a), -0.25 - Math.random() * 0.6, Math.sin(a)).normalize();
      const spd = 34 + Math.random() * 30;
      const life = 0.5 + Math.random() * 0.4;
      for (let k = 0; k < 5; k++) {
        this.sparks.spawn(
          pos.x + _dir.x * k * 2.2, pos.y + _dir.y * k * 2.2, pos.z + _dir.z * k * 2.2,
          _dir.x * spd, _dir.y * spd, _dir.z * spd, life + k * 0.06, 1);
      }
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

  _emit(kind, pos, dir, dur, rate, scale = 1) {
    const e = this.emitters.find(e => !e.alive) || this.emitters[0];
    e.alive = true;
    e.kind = kind;
    e.pos.copy(pos); e.dir.copy(dir);
    e.age = 0; e.dur = dur; e.rate = rate; e.acc = 0; e.scale = scale;
  }

  update(dt, camera) {
    this.now += dt;
    const wind = this.ctx.weather ? this.ctx.weather.wind : _v.set(1, 0, 0);

    // trail color follows time of day (moonlit at night, warm at sunset).
    // Threat trails run much darker so hostile tracks read against bright sky.
    if (this.ctx.weather && this.ctx.weather.trailTint) {
      this.trailMats.smoke.color.copy(this.ctx.weather.trailTint);
      this.trailMats.threat.color.copy(this.ctx.weather.trailTint).multiplyScalar(0.42);
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
          const s = e.scale;
          this.smoke.spawn({
            x: e.pos.x + (Math.random() - 0.5) * 4 * s, y: e.pos.y + 2 + Math.random() * 6 * s, z: e.pos.z + (Math.random() - 0.5) * 4 * s,
            vx: (Math.random() - 0.5) * 2, vy: 4 + Math.random() * 5, vz: (Math.random() - 0.5) * 2,
            size0: 6 * s, size1: 20 * s, life: 7 + Math.random() * 4,
            c0: 0x3c3630, c1: 0x27231e, alpha: 0.55 * fade + 0.18, damp: 0.5, grav: -0.55, wind: 1.0,
          });
        } else if (e.kind === 'mushroom') {
          // dark rolling head: spawn height climbs and the ring widens with
          // age, velocities push out + up so the cap appears to roll open
          const s = e.scale, prog = e.age / e.dur;
          const a = Math.random() * Math.PI * 2;
          const rad = (2 + prog * 6) * s;
          const s1 = (20 + Math.random() * 10) * s;
          this.smoke.spawn({
            x: e.pos.x + Math.cos(a) * rad, y: e.pos.y + (9 + prog * 26) * s + (Math.random() - 0.3) * 4 * s, z: e.pos.z + Math.sin(a) * rad,
            vx: Math.cos(a) * (2.5 + Math.random() * 2.5), vy: 6 + Math.random() * 5, vz: Math.sin(a) * (2.5 + Math.random() * 2.5),
            size0: s1 * 0.45, size1: s1,
            life: 9 + Math.random() * 4,
            c0: 0x3b342c, c1: 0x211d18, alpha: 0.7, damp: 0.55, grav: -0.55, wind: 0.6,
          });
        } else if (e.kind === 'padcol') {
          // SENTINEL launch: tall steam-grey column climbing off the pad
          this.smoke.spawn({
            x: e.pos.x + (Math.random() - 0.5) * 2.5, y: e.pos.y + 1 + Math.random() * 3, z: e.pos.z + (Math.random() - 0.5) * 2.5,
            vx: (Math.random() - 0.5) * 2, vy: 13 + Math.random() * 11, vz: (Math.random() - 0.5) * 2,
            size0: 3.5, size1: 12 + Math.random() * 6, life: 4.5 + Math.random() * 2.5,
            c0: 0xcdc5b6, c1: 0x9a9184, alpha: 0.5 * fade + 0.12, damp: 0.55, grav: -0.3, wind: 1.2,
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
      f.acc += dt * 30 * this.quality;
      while (f.acc >= 1) {
        f.acc -= 1;
        this.fire.spawn({
          x: f.pos.x, y: f.pos.y, z: f.pos.z,
          vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2,
          size0: 4, size1: 1.6, life: 0.32, c0: 0xffd898, c1: 0xff5a10, alpha: 0.9, fadeIn: 0.01,
        });
        if (Math.random() < 0.45) {
          this.smoke.spawn({
            x: f.pos.x, y: f.pos.y, z: f.pos.z,
            size0: 2.6, size1: 9, life: 2.4 + Math.random(), c0: 0x6e6a64, alpha: 0.42, damp: 0.4, wind: 1,
          });
        }
      }
    }

    // lights decay (negative age = delayed ignition)
    for (const l of this.lights) {
      if (!l.alive) continue;
      l.age += dt;
      if (l.age < 0) { l.light.intensity = 0; continue; }
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
