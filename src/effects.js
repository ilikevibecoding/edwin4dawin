// Pooled visual effects: smoke/fire particles, ribbon trails, explosions,
// debris, shockwaves, ground decals and flash lights. Everything procedural,
// everything pooled — nothing is allocated during gameplay.
import * as THREE from 'three';
import { airDensity } from './physics.js';
import { puffSprite, flareSprite, scorchTexture } from './textures.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _wind = new THREE.Vector3();

// ===========================================================================
// Generic CPU-simulated point-sprite pool
// ===========================================================================
const POINT_VERT = /* glsl */`
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uPxScale;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = max(0.1, -mv.z);
    gl_PointSize = clamp(aSize * uPxScale / dist, 0.0, 420.0);
    gl_Position = projectionMatrix * mv;
  }
`;
const POINT_FRAG = /* glsl */`
  precision mediump float;
  uniform sampler2D uMap;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    float a = tex.a * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor * tex.rgb, a);
  }
`;

class PointPool {
  constructor(scene, capacity, { map, additive = false, windFactor = 1 }) {
    this.capacity = capacity;
    this.windFactor = windFactor;
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    // sim state
    this.vel = new Float32Array(capacity * 3);
    this.age = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.grow = new Float32Array(capacity);
    this.baseSize = new Float32Array(capacity);
    this.baseAlpha = new Float32Array(capacity);
    this.damp = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.fadeIn = new Float32Array(capacity);
    this.alive = [];
    this.free = [];
    for (let i = capacity - 1; i >= 0; i--) this.free.push(i);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = geo;
    this.uniforms = { uMap: { value: map }, uPxScale: { value: 600 } };
    const mat = new THREE.ShaderMaterial({
      vertexShader: POINT_VERT, fragmentShader: POINT_FRAG,
      uniforms: this.uniforms,
      transparent: true, depthWrite: false, depthTest: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 20 : 18;
    scene.add(this.points);
    this._sphere = geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
  }

  spawn(x, y, z, vx, vy, vz, { size = 4, life = 3, color = 0xffffff, alpha = 0.5, grow = 1.4, damp = 1.2, grav = 0, fadeIn = 0.08 } = {}) {
    let i;
    if (this.free.length) i = this.free.pop();
    else { i = this.alive.shift(); if (i === undefined) return -1; }
    this.alive.push(i);
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    const c = typeof color === 'number' ? new THREE.Color(color) : color;
    this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
    this.age[i] = 0; this.life[i] = life;
    this.baseSize[i] = size; this.size[i] = size;
    this.baseAlpha[i] = alpha; this.alpha[i] = 0;
    this.grow[i] = grow; this.damp[i] = damp; this.grav[i] = grav;
    this.fadeIn[i] = Math.max(0.016, fadeIn);
    return i;
  }

  update(dt, weather) {
    const { pos, vel, age, life, size, alpha, baseSize, baseAlpha, grow, damp, grav, fadeIn } = this;
    for (let k = this.alive.length - 1; k >= 0; k--) {
      const i = this.alive[k];
      age[i] += dt;
      if (age[i] >= life[i]) {
        alpha[i] = 0; size[i] = 0;
        this.alive.splice(k, 1); this.free.push(i);
        continue;
      }
      const t = age[i] / life[i];
      const d = Math.max(0, 1 - damp[i] * dt);
      vel[i * 3] *= d; vel[i * 3 + 1] *= d; vel[i * 3 + 2] *= d;
      vel[i * 3 + 1] += grav[i] * dt;
      if (this.windFactor > 0 && weather) {
        weather.getWind(pos[i * 3 + 1], _wind);
        pos[i * 3] += _wind.x * this.windFactor * dt * 0.35;
        pos[i * 3 + 2] += _wind.z * this.windFactor * dt * 0.35;
      }
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (pos[i * 3 + 1] < 0.2) pos[i * 3 + 1] = 0.2;
      size[i] = baseSize[i] * (1 + grow[i] * t);
      const in_ = Math.min(1, age[i] / fadeIn[i]);
      alpha[i] = baseAlpha[i] * in_ * (1 - t) * (1 - t * 0.4);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }

  setPixelScale(v) { this.uniforms.uPxScale.value = v; }
  get activeCount() { return this.alive.length; }
}

// ===========================================================================
// Ribbon trails (camera-facing strips built on CPU)
// ===========================================================================
const TRAIL_MAX_NODES = 84;

class RibbonTrail {
  constructor(scene) {
    const verts = TRAIL_MAX_NODES * 2;
    this.positions = new Float32Array(verts * 3);
    this.alphas = new Float32Array(verts);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < TRAIL_MAX_NODES - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      idx.push(a, b, c, b, d, c);
    }
    this.geo.setIndex(idx);
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */`
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        precision mediump float;
        varying float vAlpha;
        uniform vec3 uColor;
        void main() {
          if (vAlpha < 0.004) discard;
          gl_FragColor = vec4(uColor, vAlpha);
        }`,
      uniforms: { uColor: { value: new THREE.Color(0xdedee2) } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 16;
    this.mesh.visible = false;
    scene.add(this.mesh);

    this.nodes = []; // {x,y,z, age, w}
    this.inUse = false;
    this.released = false;
    this.width = 2;
    this.life = 12;
    this.baseOpacity = 0.62;
    this.minDist = 5;
  }

  begin({ width = 2, life = 12, color = 0xdedee2, opacity = 0.62 }) {
    this.nodes.length = 0;
    this.inUse = true;
    this.released = false;
    this.width = width;
    this.life = life;
    this.baseOpacity = opacity;
    this.mat.uniforms.uColor.value.set(color);
    this.mesh.visible = true;
  }

  /** append a node at the emitter position */
  push(p) {
    const n = this.nodes;
    if (n.length) {
      const last = n[n.length - 1];
      const dx = p.x - last.x, dy = p.y - last.y, dz = p.z - last.z;
      if (dx * dx + dy * dy + dz * dz < this.minDist * this.minDist) return;
    }
    if (n.length >= TRAIL_MAX_NODES) n.shift();
    // density: thicker/longer-lasting contrail up high, thin quick smoke low
    const rho = airDensity(p.y);
    n.push({
      x: p.x, y: p.y, z: p.z, age: 0,
      w: this.width * (0.75 + (1 - rho) * 1.3),
      lifeMul: 0.55 + (1 - rho) * 1.15,
    });
  }

  release() { this.released = true; }

  update(dt, weather) {
    if (!this.inUse) return;
    const n = this.nodes;
    for (let i = n.length - 1; i >= 0; i--) {
      const node = n[i];
      node.age += dt;
      if (node.age > this.life * node.lifeMul) { n.splice(i, 1); continue; }
      weather.getWind(node.y, _wind);
      node.x += _wind.x * dt * 0.5;
      node.z += _wind.z * dt * 0.5;
      node.y += dt * 0.4; // slight buoyancy
    }
    if (this.released && n.length === 0) {
      this.inUse = false;
      this.mesh.visible = false;
    }
  }

  buildGeometry(camPos) {
    if (!this.inUse) return;
    const n = this.nodes;
    const P = this.positions, A = this.alphas;
    const count = n.length;
    for (let i = 0; i < TRAIL_MAX_NODES; i++) {
      const vi = i * 2;
      if (i >= count) { A[vi] = 0; A[vi + 1] = 0; continue; }
      const node = n[i];
      // tangent
      const prev = n[Math.max(0, i - 1)], next = n[Math.min(count - 1, i + 1)];
      _v.set(next.x - prev.x, next.y - prev.y, next.z - prev.z);
      if (_v.lengthSq() < 1e-8) _v.set(0, 1, 0);
      _v2.set(camPos.x - node.x, camPos.y - node.y, camPos.z - node.z);
      _v3.crossVectors(_v, _v2).normalize();
      const t = node.age / (this.life * node.lifeMul);
      const w = node.w * (0.5 + t * 2.1); // widen as it ages
      P[vi * 3] = node.x + _v3.x * w; P[vi * 3 + 1] = node.y + _v3.y * w; P[vi * 3 + 2] = node.z + _v3.z * w;
      P[vi * 3 + 3] = node.x - _v3.x * w; P[vi * 3 + 4] = node.y - _v3.y * w; P[vi * 3 + 5] = node.z - _v3.z * w;
      const headFade = i === count - 1 ? 0.7 : 1;
      const a = this.baseOpacity * (1 - t) * (1 - t) * headFade;
      A[vi] = a; A[vi + 1] = a;
    }
    // collapse unused verts onto last node to avoid stray triangles
    if (count > 0) {
      const last = n[count - 1];
      for (let i = count; i < TRAIL_MAX_NODES; i++) {
        const vi = i * 2;
        for (let s = 0; s < 2; s++) {
          P[(vi + s) * 3] = last.x; P[(vi + s) * 3 + 1] = last.y; P[(vi + s) * 3 + 2] = last.z;
        }
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }
}

// ===========================================================================
// Debris (instanced chunks with gravity + tumbling)
// ===========================================================================
class DebrisPool {
  constructor(scene, capacity = 112) {
    this.capacity = capacity;
    const geo = new THREE.TetrahedronGeometry(0.55);
    const mat = new THREE.MeshStandardMaterial({ color: 0x35322e, roughness: 0.9, metalness: 0.25, emissive: 0xff6a22, emissiveIntensity: 0 });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.data = [];
    for (let i = 0; i < capacity; i++) this.data.push({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), rot: new THREE.Euler(), rv: new THREE.Vector3(), s: 1, age: 0, life: 4, glow: 0 });
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this._hide();
  }
  _hide() {
    this._m.makeScale(0, 0, 0);
    for (let i = 0; i < this.capacity; i++) this.mesh.setMatrixAt(i, this._m);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  burst(pos, count, speed, { glow = 1, scale = 1, life = 5 } = {}, rng) {
    let spawned = 0;
    for (let i = 0; i < this.capacity && spawned < count; i++) {
      const d = this.data[i];
      if (d.alive) continue;
      d.alive = true;
      d.p.copy(pos);
      d.v.set(rng.gauss(0, 1), rng.range(0.2, 1.4), rng.gauss(0, 1)).normalize().multiplyScalar(speed * rng.range(0.4, 1.15));
      d.rot.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
      d.rv.set(rng.gauss(0, 5), rng.gauss(0, 5), rng.gauss(0, 5));
      d.s = scale * rng.range(0.5, 1.6);
      d.age = 0; d.life = life * rng.range(0.6, 1.2);
      d.glow = glow;
      spawned++;
    }
  }
  update(dt, effects) {
    let any = false;
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i];
      if (!d.alive) continue;
      any = true;
      d.age += dt;
      d.v.y -= 9.81 * dt;
      d.v.multiplyScalar(Math.max(0, 1 - 0.22 * dt));
      d.p.addScaledVector(d.v, dt);
      d.rot.x += d.rv.x * dt; d.rot.y += d.rv.y * dt; d.rot.z += d.rv.z * dt;
      if (d.glow > 0.3 && Math.random() < dt * 22) {
        effects.fire.spawn(d.p.x, d.p.y, d.p.z, 0, 0, 0, { size: 1.6 * d.s, life: 0.5, color: 0xffa04a, alpha: 0.6, grow: 0.5, damp: 1 });
      }
      if (d.p.y <= 0.3 || d.age > d.life) {
        d.alive = false;
        if (d.p.y <= 0.4) {
          effects.smoke.spawn(d.p.x, 0.8, d.p.z, 0, 1.5, 0, { size: 3.5 * d.s, life: 1.6, color: 0x8a8172, alpha: 0.3, grow: 2 });
        }
        this._m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this._m);
        continue;
      }
      this._q.setFromEuler(d.rot);
      this._s.setScalar(d.s);
      this._m.compose(d.p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ===========================================================================
// Shockwave rings, flash sprites, light + decal pools
// ===========================================================================
class ShockwavePool {
  constructor(scene, capacity = 10) {
    this.items = [];
    const tex = ringTexture();
    for (let i = 0; i < capacity; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, fog: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      mesh.visible = false;
      mesh.renderOrder = 22;
      scene.add(mesh);
      this.items.push({ mesh, age: 0, dur: 1, maxR: 10, alive: false, billboard: false, baseA: 0.8 });
    }
  }
  spawn(pos, { maxR = 60, dur = 1.1, horizontal = true, alpha = 0.75 } = {}) {
    const it = this.items.find(i => !i.alive) || this.items[0];
    it.alive = true; it.age = 0; it.dur = dur; it.maxR = maxR; it.baseA = alpha;
    it.mesh.position.copy(pos);
    it.billboard = !horizontal;
    if (horizontal) {
      it.mesh.rotation.set(-Math.PI / 2, 0, 0);
      it.mesh.position.y = Math.max(pos.y, 0.6);
    }
    it.mesh.visible = true;
  }
  update(dt, camera) {
    for (const it of this.items) {
      if (!it.alive) continue;
      it.age += dt;
      const t = it.age / it.dur;
      if (t >= 1) { it.alive = false; it.mesh.visible = false; continue; }
      const e = 1 - Math.pow(1 - t, 2.4);
      const r = Math.max(0.01, it.maxR * e);
      it.mesh.scale.setScalar(r);
      it.mesh.material.opacity = it.baseA * (1 - t) * (1 - t);
      if (it.billboard) it.mesh.quaternion.copy(camera.quaternion);
    }
  }
}
function ringTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 30, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.72, 'rgba(255,235,210,0.0)');
  gr.addColorStop(0.86, 'rgba(255,235,210,0.9)');
  gr.addColorStop(1, 'rgba(255,235,210,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  return t;
}

class FlashPool {
  constructor(scene, capacity = 16) {
    this.items = [];
    const map = flareSprite();
    for (let i = 0; i < capacity; i++) {
      const mat = new THREE.SpriteMaterial({ map, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: 0xffffff });
      const s = new THREE.Sprite(mat);
      s.visible = false; s.renderOrder = 24;
      scene.add(s);
      this.items.push({ s, age: 0, dur: 0.3, size: 10, alive: false });
    }
  }
  spawn(pos, { size = 20, dur = 0.32, color = 0xffffff } = {}) {
    const it = this.items.find(i => !i.alive) || this.items[0];
    it.alive = true; it.age = 0; it.dur = dur; it.size = size;
    it.s.material.color.set(color);
    it.s.position.copy(pos);
    it.s.visible = true;
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.alive) continue;
      it.age += dt;
      const t = it.age / it.dur;
      if (t >= 1) { it.alive = false; it.s.visible = false; continue; }
      const pop = t < 0.25 ? t / 0.25 : 1;
      it.s.scale.setScalar(it.size * (0.6 + pop * 0.7 + t * 0.5));
      it.s.material.opacity = (1 - t) * (1 - t);
    }
  }
}

class LightPool {
  constructor(scene, capacity = 5) {
    this.items = [];
    for (let i = 0; i < capacity; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 900, 1.8);
      l.castShadow = false;
      scene.add(l);
      this.items.push({ l, age: 0, dur: 1, peak: 0, alive: false });
    }
  }
  flash(pos, { intensity = 900, dur = 0.6, color = 0xffaa55 } = {}) {
    let it = this.items.find(i => !i.alive);
    if (!it) { // steal weakest
      it = this.items.reduce((a, b) => (a.l.intensity < b.l.intensity ? a : b));
    }
    it.alive = true; it.age = 0; it.dur = dur; it.peak = intensity;
    it.l.color.set(color);
    it.l.position.copy(pos);
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.alive) continue;
      it.age += dt;
      const t = it.age / it.dur;
      if (t >= 1) { it.alive = false; it.l.intensity = 0; continue; }
      const env = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92;
      it.l.intensity = it.peak * env * env;
    }
  }
}

class DecalPool {
  constructor(scene, capacity = 14) {
    this.items = [];
    const map = scorchTexture();
    for (let i = 0; i < capacity; i++) {
      const mat = new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 2;
      scene.add(m);
      this.items.push({ m, age: 0, life: 90, alive: false });
    }
  }
  spawn(pos, radius, rot = 0) {
    const it = this.items.find(i => !i.alive) || this.items.reduce((a, b) => (a.age > b.age ? a : b));
    it.alive = true; it.age = 0;
    it.m.position.set(pos.x, 0.14 + Math.random() * 0.03, pos.z);
    it.m.rotation.z = rot;
    it.m.scale.setScalar(radius * 2);
    it.m.material.opacity = 0.95;
    it.m.visible = true;
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.alive) continue;
      it.age += dt;
      if (it.age > it.life) { it.alive = false; it.m.visible = false; continue; }
      if (it.age > it.life * 0.6) {
        it.m.material.opacity = 0.95 * (1 - (it.age - it.life * 0.6) / (it.life * 0.4));
      }
    }
  }
}

// ===========================================================================
// Facade
// ===========================================================================
export class Effects {
  constructor({ scene, events, rng, weather }) {
    this.scene = scene;
    this.events = events;
    this.rng = rng.fork(77);
    this.weather = weather;
    this.smoke = new PointPool(scene, 3400, { map: puffSprite(), additive: false, windFactor: 1 });
    this.fire = new PointPool(scene, 1600, { map: flareSprite(), additive: true, windFactor: 0 });
    this.trails = [];
    for (let i = 0; i < 26; i++) this.trails.push(new RibbonTrail(scene));
    this.debris = new DebrisPool(scene);
    this.shockwaves = new ShockwavePool(scene);
    this.flashes = new FlashPool(scene);
    this.lights = new LightPool(scene);
    this.decals = new DecalPool(scene);
    this.lastBurst = null;
  }

  acquireTrail(opts) {
    let t = this.trails.find(t => !t.inUse);
    if (!t) t = this.trails.reduce((a, b) => (a.released && !b.released ? a : b));
    t.begin(opts);
    return t;
  }

  /** big cinematic launch: dust ring, plume, flash, scorch */
  launchBlast(pos, scale = 1) {
    const r = this.rng;
    this.flashes.spawn(_v.copy(pos).setY(pos.y + 2 * scale), { size: 26 * scale, dur: 0.5, color: 0xffd9a0 });
    this.lights.flash(_v.copy(pos).setY(pos.y + 4), { intensity: 1400 * scale, dur: 0.9, color: 0xffb066 });
    this.shockwaves.spawn(_v.copy(pos).setY(1.2), { maxR: 34 * scale, dur: 1.15, horizontal: true, alpha: 0.5 });
    this.decals.spawn(pos, 6.5 * scale, r.range(0, 6));
    // radial ground dust ring
    const n = Math.round(46 * scale);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r.range(-0.1, 0.1);
      const sp = r.range(9, 21) * scale;
      this.smoke.spawn(
        pos.x + Math.cos(a) * 2.4, pos.y + r.range(0.4, 2.2), pos.z + Math.sin(a) * 2.4,
        Math.cos(a) * sp, r.range(1.5, 5), Math.sin(a) * sp,
        { size: r.range(5, 9) * scale, life: r.range(2.6, 4.6), color: 0xb8a98c, alpha: 0.42, grow: 2.6, damp: 1.6 },
      );
    }
    // hot core puffs
    for (let i = 0; i < 22 * scale; i++) {
      this.fire.spawn(
        pos.x + r.gauss(0, 1.2), pos.y + r.range(0, 3), pos.z + r.gauss(0, 1.2),
        r.gauss(0, 4), r.range(4, 16), r.gauss(0, 4),
        { size: r.range(3, 7) * scale, life: r.range(0.3, 0.8), color: 0xffc06a, alpha: 0.85, grow: 1.5, damp: 2 },
      );
    }
    this.events.emit('shake', { amp: 0.35 * scale, dur: 0.7 });
  }

  /** continuous engine exhaust — call every sim step while boosting */
  exhaust(pos, vel, scale = 1, dtStep = 1 / 120) {
    const r = this.rng;
    // dense hot core (short-lived)
    if (r.next() < dtStep * 220) {
      this.fire.spawn(pos.x, pos.y, pos.z,
        -vel.x * 0.12 + r.gauss(0, 2), -vel.y * 0.12 + r.gauss(0, 2), -vel.z * 0.12 + r.gauss(0, 2),
        { size: r.range(1.6, 3.2) * scale, life: r.range(0.14, 0.3), color: 0xffd28a, alpha: 0.95, grow: 0.6, damp: 3 });
    }
    // billowing smoke behind
    if (r.next() < dtStep * 130) {
      const rho = airDensity(pos.y);
      this.smoke.spawn(pos.x + r.gauss(0, 0.8), pos.y + r.gauss(0, 0.8), pos.z + r.gauss(0, 0.8),
        -vel.x * 0.03 + r.gauss(0, 1.5), -vel.y * 0.03 + r.gauss(0, 1.5), -vel.z * 0.03 + r.gauss(0, 1.5),
        {
          size: r.range(2.5, 4.5) * scale, life: r.range(2, 5) * (0.6 + (1 - rho)),
          color: 0xcfcecd, alpha: 0.34 * (0.45 + rho * 0.55), grow: 3, damp: 1.2,
        });
    }
  }

  /** air intercept: flash, fragment sparks, smoke ball, falling debris */
  airBurst(pos, scale = 1, color = 0xffe0b0) {
    const r = this.rng;
    this.lastBurst = { pos: pos.clone(), scale, type: 'air', time: performance.now() };
    this.flashes.spawn(pos, { size: 88 * scale, dur: 0.55, color });
    this.lights.flash(pos, { intensity: 3600 * scale, dur: 0.8, color: 0xffcf90 });
    this.shockwaves.spawn(pos, { maxR: 150 * scale, dur: 1.7, horizontal: false, alpha: 0.9 });
    for (let i = 0; i < 40 * scale; i++) {
      this.fire.spawn(pos.x, pos.y, pos.z, r.gauss(0, 58) * scale, r.gauss(0, 58) * scale, r.gauss(0, 58) * scale,
        { size: r.range(2.4, 5.4) * scale, life: r.range(0.4, 1.1), color: 0xffc47a, alpha: 0.95, grow: 0.3, damp: 1.4 });
    }
    for (let i = 0; i < 30 * scale; i++) {
      this.smoke.spawn(pos.x + r.gauss(0, 4), pos.y + r.gauss(0, 4), pos.z + r.gauss(0, 4),
        r.gauss(0, 13), r.gauss(0, 13), r.gauss(0, 13),
        { size: r.range(9, 17) * scale, life: r.range(5, 11), color: 0x55534f, alpha: 0.52, grow: 2.4, damp: 1.1 });
    }
    this.debris.burst(pos, Math.round(12 * scale), 70, { glow: 1, scale: 0.9 * scale, life: 7 }, r);
    this.events.emit('boom', { pos: pos.clone(), scale });
  }

  /** ground impact: fireball, dust, crater, debris, shockwave */
  groundImpact(pos, scale = 1) {
    const r = this.rng;
    this.lastBurst = { pos: pos.clone(), scale, type: 'ground', time: performance.now() };
    const p = _v.set(pos.x, Math.max(2, pos.y), pos.z);
    this.flashes.spawn(p, { size: 95 * scale, dur: 0.55, color: 0xffd0a0 });
    this.lights.flash(_v2.copy(p).setY(8), { intensity: 5200 * scale, dur: 1.0, color: 0xff9a4a });
    this.shockwaves.spawn(p, { maxR: 200 * scale, dur: 2.1, horizontal: true, alpha: 0.9 });
    this.decals.spawn(p, 13 * scale, r.range(0, 6));
    // fireball column
    for (let i = 0; i < 42 * scale; i++) {
      this.fire.spawn(p.x + r.gauss(0, 2.5), 1 + r.range(0, 4), p.z + r.gauss(0, 2.5),
        r.gauss(0, 7), r.range(14, 46), r.gauss(0, 7),
        { size: r.range(4, 9) * scale, life: r.range(0.5, 1.3), color: i % 3 ? 0xff9a3e : 0xffd27a, alpha: 0.95, grow: 1.6, damp: 1.5 });
    }
    // dirt / smoke column + ring
    for (let i = 0; i < 60 * scale; i++) {
      const a = r.range(0, Math.PI * 2);
      const ring = i % 2 === 0;
      const sp = ring ? r.range(14, 34) : r.range(2, 8);
      this.smoke.spawn(p.x + Math.cos(a) * (ring ? 3 : 1), r.range(0.5, ring ? 3 : 14), p.z + Math.sin(a) * (ring ? 3 : 1),
        Math.cos(a) * sp, ring ? r.range(1, 5) : r.range(9, 30), Math.sin(a) * sp,
        {
          size: r.range(6, 13) * scale, life: r.range(3.5, 8), color: ring ? 0x9a8b70 : 0x4c4a45,
          alpha: 0.5, grow: 2.4, damp: 1.3,
        });
    }
    this.debris.burst(_v2.copy(p).setY(2), Math.round(16 * scale), 42, { glow: 1, scale: scale, life: 6 }, r);
    this.events.emit('boom', { pos: p.clone(), scale: scale * 1.6 });
    this.events.emit('shake', { amp: 0.5 * scale, dur: 0.9, distFrom: p.clone() });
  }

  /** brief spark shower for decoy burn-up / small events */
  sparkle(pos, scale = 1) {
    const r = this.rng;
    for (let i = 0; i < 16 * scale; i++) {
      this.fire.spawn(pos.x, pos.y, pos.z, r.gauss(0, 16), r.gauss(0, 16), r.gauss(0, 16),
        { size: r.range(0.8, 1.8), life: r.range(0.4, 1.1), color: 0xffe9b0, alpha: 0.85, grow: 0.2, damp: 0.8 });
    }
  }

  update(dt) {
    this.smoke.update(dt, this.weather);
    this.fire.update(dt, this.weather);
    for (const t of this.trails) t.update(dt, this.weather);
    this.debris.update(dt, this);
    this.flashes.update(dt);
    this.lights.update(dt);
    this.decals.update(dt);
  }

  /** camera-dependent geometry, call right before render */
  renderPrep(camera, renderer, shockDt) {
    const h = renderer.domElement.height;
    const proj = camera.projectionMatrix.elements[5];
    const px = h * 0.5 * proj;
    this.smoke.setPixelScale(px);
    this.fire.setPixelScale(px);
    for (const t of this.trails) t.buildGeometry(camera.position);
    this.shockwaves.update(shockDt, camera);
  }

  stats() {
    return {
      smoke: this.smoke.activeCount,
      fire: this.fire.activeCount,
      trails: this.trails.filter(t => t.inUse).length,
    };
  }
}
