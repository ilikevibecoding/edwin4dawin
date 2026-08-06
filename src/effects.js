// Pooled visual effects: smoke/fire particles, ribbon trails, explosions,
// debris, shockwaves, ground decals and flash lights. Everything procedural,
// everything pooled — nothing is allocated during gameplay.
import * as THREE from 'three';
import { airDensity } from './physics.js';
import { puffSprite, flareSprite, scorchTexture, trailNoiseTexture } from './textures.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _wind = new THREE.Vector3();
const _col = new THREE.Color();

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
    const c = typeof color === 'number' ? _col.set(color) : color;
    this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
    this.age[i] = 0; this.life[i] = life;
    this.baseSize[i] = size; this.size[i] = size;
    this.baseAlpha[i] = alpha; this.alpha[i] = 0;
    this.grow[i] = grow; this.damp[i] = damp; this.grav[i] = grav;
    this.fadeIn[i] = Math.max(0.016, fadeIn);
    return i;
  }

  update(dt, weather) {
    const { pos, vel, age, life, size, alpha, baseSize, baseAlpha, grow, damp, grav, fadeIn, alive } = this;
    let w = 0;
    for (let k = 0; k < alive.length; k++) {
      const i = alive[k];
      age[i] += dt;
      if (age[i] >= life[i]) {
        alpha[i] = 0; size[i] = 0;
        this.free.push(i);
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
      alive[w++] = i;
    }
    alive.length = w;
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
const TRAIL_MAX_NODES = 168;

class RibbonTrail {
  constructor(scene) {
    const verts = TRAIL_MAX_NODES * 2;
    this.positions = new Float32Array(verts * 3);
    this.alphas = new Float32Array(verts);
    this.us = new Float32Array(verts);       // along-trail texture coord
    this.sides = new Float32Array(verts);    // 0 / 1 across the ribbon
    for (let i = 0; i < TRAIL_MAX_NODES; i++) { this.sides[i * 2] = 0; this.sides[i * 2 + 1] = 1; }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aU', new THREE.BufferAttribute(this.us, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSide', new THREE.BufferAttribute(this.sides, 1));
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
        attribute float aU;
        attribute float aSide;
        varying float vAlpha;
        varying vec2 vUv;
        void main() {
          vAlpha = aAlpha;
          vUv = vec2(aU, aSide);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        precision mediump float;
        varying float vAlpha;
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform sampler2D uMap;
        void main() {
          float tex = texture2D(uMap, vUv).a;
          float a = vAlpha * tex;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
      uniforms: { uColor: { value: new THREE.Color(0xdedee2) }, uMap: { value: trailNoiseTexture() } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 16;
    this.mesh.visible = false;
    scene.add(this.mesh);

    this.nodes = []; // {x,y,z, age, w, lifeMul}
    this._freeNodes = [];
    for (let i = 0; i < TRAIL_MAX_NODES; i++) {
      this._freeNodes.push({ x: 0, y: 0, z: 0, age: 0, w: 1, lifeMul: 1 });
    }
    this.inUse = false;
    this.released = false;
    this.width = 2;
    this.life = 12;
    this.baseOpacity = 0.62;
    this.minDist = 5;
  }

  begin({ width = 2, life = 12, color = 0xdedee2, opacity = 0.62, uvOffset = 0 }) {
    while (this.nodes.length) this._freeNodes.push(this.nodes.pop());
    this.inUse = true;
    this.released = false;
    this.width = width;
    this.life = life;
    this.baseOpacity = opacity;
    this.uSeq = uvOffset;
    this.mat.uniforms.uColor.value.set(color);
    this.mesh.visible = true;
  }

  /** append a node at the emitter position */
  push(p) {
    const n = this.nodes;
    if (n.length) {
      const last = n[n.length - 1];
      const dx = p.x - last.x, dy = p.y - last.y, dz = p.z - last.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const md = this.minDist;
      let accept = d2 >= md * md;
      // insert early when the path bends — kills visible polygon kinks on
      // slow, tight turns (launch pitch-over, terminal weave)
      if (!accept && n.length >= 2 && d2 > md * md * 0.09) {
        const prev = n[n.length - 2];
        const ex = last.x - prev.x, ey = last.y - prev.y, ez = last.z - prev.z;
        const dot = ex * dx + ey * dy + ez * dz;
        const l2 = (ex * ex + ey * ey + ez * ez) * d2;
        if (l2 > 1e-12 && dot / Math.sqrt(l2) < 0.9925) accept = true;
      }
      if (!accept) return;
    }
    let node;
    if (this._freeNodes.length) node = this._freeNodes.pop();
    else node = n.shift();
    // density-driven profile: fat contrail up high (thin air) AND a fat
    // turbulent wake at very low altitude (reentry / pad column); leanest in
    // the mid band
    const rho = airDensity(p.y);
    const lowBoost = Math.max(0, (rho - 0.74) / 0.26);
    node.x = p.x; node.y = p.y; node.z = p.z;
    node.age = 0;
    node.w = this.width * (0.75 + (1 - rho) * 1.3 + lowBoost * 1.05);
    node.lifeMul = 0.55 + (1 - rho) * 1.15 + lowBoost * 0.25;
    node.u = (this.uSeq = (this.uSeq ?? 0) + 1);
    n.push(node);
  }

  release() { this.released = true; }

  update(dt, weather) {
    if (!this.inUse) return;
    const n = this.nodes;
    let w = 0;
    for (let i = 0; i < n.length; i++) {
      const node = n[i];
      node.age += dt;
      if (node.age > this.life * node.lifeMul) { this._freeNodes.push(node); continue; }
      weather.getWind(node.y, _wind);
      node.x += _wind.x * dt * 0.5;
      node.z += _wind.z * dt * 0.5;
      node.y += dt * 0.4; // slight buoyancy
      n[w++] = node;
    }
    n.length = w;
    if (this.released && n.length === 0) {
      this.inUse = false;
      this.mesh.visible = false;
    }
  }

  buildGeometry(camPos) {
    if (!this.inUse) return;
    const n = this.nodes;
    const P = this.positions, A = this.alphas, U = this.us;
    const count = n.length;
    for (let i = 0; i < TRAIL_MAX_NODES; i++) {
      const vi = i * 2;
      if (i >= count) { A[vi] = 0; A[vi + 1] = 0; continue; }
      const node = n[i];
      U[vi] = U[vi + 1] = node.u * 0.14;
      // tangent
      const prev = n[Math.max(0, i - 1)], next = n[Math.min(count - 1, i + 1)];
      _v.set(next.x - prev.x, next.y - prev.y, next.z - prev.z);
      if (_v.lengthSq() < 1e-8) _v.set(0, 1, 0);
      _v2.set(camPos.x - node.x, camPos.y - node.y, camPos.z - node.z);
      _v3.crossVectors(_v, _v2).normalize();
      const t = Math.min(1, node.age / (this.life * node.lifeMul));
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
    this.geo.attributes.aU.needsUpdate = true;
  }
}

// ===========================================================================
// Debris (instanced chunks with gravity + tumbling; big shards can smoke)
// ===========================================================================
class DebrisPool {
  constructor(scene, capacity = 128) {
    this.capacity = capacity;
    const geo = new THREE.TetrahedronGeometry(0.55);
    const mat = new THREE.MeshStandardMaterial({ color: 0x35322e, roughness: 0.9, metalness: 0.25, emissive: 0xff6a22, emissiveIntensity: 0 });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.data = [];
    for (let i = 0; i < capacity; i++) this.data.push({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), rot: new THREE.Euler(), rv: new THREE.Vector3(), s: 1, age: 0, life: 4, glow: 0, smoky: false });
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
  burst(pos, count, speed, { glow = 1, scale = 1, life = 5, smoky = false, upBias = 1 } = {}, rng) {
    let spawned = 0;
    for (let i = 0; i < this.capacity && spawned < count; i++) {
      const d = this.data[i];
      if (d.alive) continue;
      d.alive = true;
      d.p.copy(pos);
      d.v.set(rng.gauss(0, 1), rng.range(0.2, 1.4) * upBias, rng.gauss(0, 1)).normalize().multiplyScalar(speed * rng.range(0.4, 1.15));
      d.rot.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
      d.rv.set(rng.gauss(0, 5), rng.gauss(0, 5), rng.gauss(0, 5));
      d.s = scale * rng.range(0.5, 1.6);
      d.age = 0; d.life = life * rng.range(0.6, 1.2);
      d.glow = glow;
      d.smoky = smoky;
      spawned++;
    }
  }
  update(dt, effects) {
    const rng = effects.rng;
    let any = false;
    let count = 0;
    for (let i = 0; i < this.capacity; i++) {
      const d = this.data[i];
      if (!d.alive) continue;
      any = true;
      count++;
      d.age += dt;
      d.v.y -= 9.81 * dt;
      d.v.multiplyScalar(Math.max(0, 1 - 0.22 * dt));
      d.p.addScaledVector(d.v, dt);
      d.rot.x += d.rv.x * dt; d.rot.y += d.rv.y * dt; d.rot.z += d.rv.z * dt;
      if (d.glow > 0.3 && rng.next() < dt * 22) {
        effects.fire.spawn(d.p.x, d.p.y, d.p.z, 0, 0, 0, { size: 1.6 * d.s, life: 0.5, color: 0xffa04a, alpha: 0.7, grow: 0.5, damp: 1 });
      }
      // large shards leave a grey smoke trail as they fall
      if (d.smoky && rng.next() < dt * 40) {
        effects.smoke.spawn(
          d.p.x + rng.gauss(0, 0.4), d.p.y, d.p.z + rng.gauss(0, 0.4),
          -d.v.x * 0.08, -d.v.y * 0.08 + 1.2, -d.v.z * 0.08,
          { size: 3.2 * d.s, life: rng.range(3, 5), color: 0x8d8880, alpha: 0.55, grow: 2.4, damp: 0.8, fadeIn: 0.05 },
        );
      }
      if (d.p.y <= 0.3 || d.age > d.life) {
        d.alive = false;
        if (d.p.y <= 0.4) {
          effects.smoke.spawn(d.p.x, 0.8, d.p.z, 0, 1.8, 0, { size: 4 * d.s, life: 2, color: 0x8a8172, alpha: 0.34, grow: 2.2 });
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
    this._active = count;
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
  get activeCount() { return this._active ?? 0; }
}

// ===========================================================================
// Shockwave rings, dome flashes, flash sprites, light + decal pools
// ===========================================================================
class ShockwavePool {
  constructor(scene, capacity = 8) {
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
  /** sim-time ageing (deterministic, works in manual stepping too) */
  update(dt) {
    for (const it of this.items) {
      if (!it.alive) continue;
      it.age += dt;
      const t = it.age / it.dur;
      if (t >= 1) { it.alive = false; it.mesh.visible = false; continue; }
      const e = 1 - Math.pow(1 - t, 2.4);
      const r = Math.max(0.01, it.maxR * e);
      it.mesh.scale.setScalar(r);
      it.mesh.material.opacity = it.baseA * Math.pow(1 - t, 1.7);
    }
  }
  /** camera-dependent orientation only — call right before render */
  billboard(camera) {
    for (const it of this.items) {
      if (it.alive && it.billboard) it.mesh.quaternion.copy(camera.quaternion);
    }
  }
}
function ringTexture() {
  // thin crisp front: narrow bright band near the outer edge with a sharp
  // leading edge and a short inner tail
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 40, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,236,210,0)');
  gr.addColorStop(0.68, 'rgba(255,236,210,0)');
  gr.addColorStop(0.82, 'rgba(255,238,214,0.08)');
  gr.addColorStop(0.895, 'rgba(255,246,228,0.95)');
  gr.addColorStop(0.93, 'rgba(255,238,208,0.18)');
  gr.addColorStop(1, 'rgba(255,238,208,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  return t;
}

/** short-lived expanding hemispheres — subtle vertical blast dome on ground hits */
class DomePool {
  constructor(scene, capacity = 4) {
    this.items = [];
    const geo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    for (let i = 0; i < capacity; i++) {
      // thin pressure-front shell: transparent facing the camera, bright rim
      const mat = new THREE.ShaderMaterial({
        vertexShader: /* glsl */`
          varying vec3 vN;
          varying vec3 vW;
          void main() {
            vN = normalize(mat3(modelMatrix) * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vW = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }`,
        fragmentShader: /* glsl */`
          precision mediump float;
          varying vec3 vN;
          varying vec3 vW;
          uniform float uA;
          void main() {
            vec3 V = normalize(cameraPosition - vW);
            float rim = pow(1.0 - abs(dot(V, normalize(vN))), 2.4);
            gl_FragColor = vec4(vec3(1.0, 0.85, 0.66), rim * uA);
          }`,
        uniforms: { uA: { value: 0 } },
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 21;
      scene.add(mesh);
      this.items.push({ mesh, age: 0, dur: 0.6, maxR: 40, alive: false });
    }
  }
  spawn(pos, { maxR = 40, dur = 0.55 } = {}) {
    const it = this.items.find(i => !i.alive) || this.items[0];
    it.alive = true; it.age = 0; it.dur = dur; it.maxR = maxR;
    it.mesh.position.set(pos.x, 0.4, pos.z);
    it.mesh.visible = true;
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.alive) continue;
      it.age += dt;
      const t = it.age / it.dur;
      if (t >= 1) { it.alive = false; it.mesh.visible = false; continue; }
      const e = 1 - Math.pow(1 - t, 2.6);
      it.mesh.scale.setScalar(Math.max(0.01, it.maxR * e));
      it.mesh.material.uniforms.uA.value = 0.55 * Math.pow(1 - t, 2.0);
    }
  }
}

class FlashPool {
  constructor(scene, capacity = 20) {
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
  constructor(scene, capacity = 6) {
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
  constructor(scene, capacity = 16) {
    this.items = [];
    this._n = 0;
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
    this._n = (this._n + 1) % 8; // deterministic z-fight stagger
    it.m.position.set(pos.x, 0.14 + this._n * 0.004, pos.z);
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
const SCHED_SLOTS = 24;

export class Effects {
  constructor({ scene, events, rng, weather }) {
    this.scene = scene;
    this.events = events;
    this.rng = rng.fork(77);
    this.weather = weather;
    this.smoke = new PointPool(scene, 4096, { map: puffSprite(), additive: false, windFactor: 1 });
    this.fire = new PointPool(scene, 2048, { map: flareSprite(), additive: true, windFactor: 0 });
    this.trails = [];
    for (let i = 0; i < 26; i++) this.trails.push(new RibbonTrail(scene));
    this.debris = new DebrisPool(scene);
    this.shockwaves = new ShockwavePool(scene);
    this.domes = new DomePool(scene);
    this.flashes = new FlashPool(scene);
    this.lights = new LightPool(scene);
    this.decals = new DecalPool(scene);
    this.lastBurst = null;
    // last camera position (updated in renderPrep) → distance-compensated
    // flash sizes so far bursts still read
    this._camPos = new THREE.Vector3(0, 2, 0);
    // delayed one-shot events (secondary pops) — fixed slots, no allocation
    this._sched = [];
    for (let i = 0; i < SCHED_SLOTS; i++) this._sched.push({ alive: false, t: 0, x: 0, y: 0, z: 0, scale: 1 });
  }

  acquireTrail(opts) {
    let t = this.trails.find(t => !t.inUse);
    if (!t) t = this.trails.reduce((a, b) => (a.released && !b.released ? a : b));
    t.begin({ uvOffset: this.rng.int(0, 500), ...opts });
    return t;
  }

  /** apparent-size compensation: 1 near, up to 5× at >2.75 km (high-altitude
   *  intercepts at 6-8 km must still read as an event, not a pixel) */
  _distK(pos) {
    return THREE.MathUtils.clamp(this._camPos.distanceTo(pos) / 550, 1, 5);
  }

  _schedulePop(delay, x, y, z, scale) {
    for (const s of this._sched) {
      if (s.alive) continue;
      s.alive = true; s.t = delay; s.x = x; s.y = y; s.z = z; s.scale = scale;
      return;
    }
  }

  /** small delayed explosion — cooking-off munitions / fuel pockets */
  _firePop(x, y, z, scale) {
    const r = this.rng;
    _v.set(x, y, z);
    this.flashes.spawn(_v, { size: 26 * scale, dur: 0.3, color: 0xffd9a8 });
    this.lights.flash(_v, { intensity: 1100 * scale, dur: 0.45, color: 0xffab55 });
    const nf = Math.round(10 * scale) + 4;
    for (let i = 0; i < nf; i++) {
      this.fire.spawn(x + r.gauss(0, 0.8), y + r.range(0, 1.5), z + r.gauss(0, 0.8),
        r.gauss(0, 13), r.range(5, 26), r.gauss(0, 13),
        { size: r.range(2.5, 5) * scale, life: r.range(0.3, 0.7), color: 0xffc06a, alpha: 0.9, grow: 1.2, damp: 1.6 });
    }
    const ns = Math.round(6 * scale) + 3;
    for (let i = 0; i < ns; i++) {
      this.smoke.spawn(x + r.gauss(0, 1), y + r.range(0, 2), z + r.gauss(0, 1),
        r.gauss(0, 3), r.range(4, 11), r.gauss(0, 3),
        { size: r.range(4, 8) * scale, life: r.range(2.5, 4.5), color: 0x6b6258, alpha: 0.5, grow: 2.4, damp: 0.9 });
    }
    this.debris.burst(_v, 4, 26, { glow: 1, scale: 0.7 * scale, life: 3 }, r);
    this.events.emit('boom', { pos: _v.clone(), scale: scale * 0.5 });
  }

  /** big cinematic launch: opaque ignition plume, radial dust wash, flash,
   *  long pad light, lingering smoke, scorch */
  launchBlast(pos, scale = 1) {
    const r = this.rng;
    // tight hot flash + low wide ground glow (kept modest so smoke silhouette reads)
    this.flashes.spawn(_v.copy(pos).setY(pos.y + 2.5 * scale), { size: 14 * scale, dur: 0.38, color: 0xffdca8 });
    this.flashes.spawn(_v.copy(pos).setY(pos.y + 1.0), { size: 9 * scale, dur: 0.8, color: 0xffb46a });
    // long-duration light so night launches paint the pad while the plume climbs
    this.lights.flash(_v.copy(pos).setY(pos.y + 5), { intensity: 1500 * scale, dur: 2.6, color: 0xffb066 });
    this.shockwaves.spawn(_v.copy(pos).setY(1.2), { maxR: 42 * scale, dur: 1.0, horizontal: true, alpha: 0.62 });
    this.decals.spawn(pos, 6.5 * scale, r.range(0, 6));
    // dense opaque ignition plume hugging the pad
    const n1 = Math.round(30 * scale);
    for (let i = 0; i < n1; i++) {
      const a = r.range(0, Math.PI * 2);
      const rad = r.range(0.5, 3.4) * scale;
      this.smoke.spawn(
        pos.x + Math.cos(a) * rad, pos.y + r.range(0.3, 3.5), pos.z + Math.sin(a) * rad,
        Math.cos(a) * r.range(1, 5), r.range(4, 13), Math.sin(a) * r.range(1, 5),
        { size: r.range(7, 13) * scale, life: r.range(4, 8), color: 0xb9b3a8, alpha: r.range(0.55, 0.75), grow: 2.2, damp: 1.15, fadeIn: 0.05 },
      );
    }
    // radial ground dust wash
    const n2 = Math.round(54 * scale);
    for (let i = 0; i < n2; i++) {
      const a = (i / n2) * Math.PI * 2 + r.range(-0.12, 0.12);
      const sp = r.range(13, 30) * scale;
      this.smoke.spawn(
        pos.x + Math.cos(a) * 3, pos.y + r.range(0.3, 1.6), pos.z + Math.sin(a) * 3,
        Math.cos(a) * sp, r.range(0.5, 2.5), Math.sin(a) * sp,
        { size: r.range(6, 11) * scale, life: r.range(3.5, 6.5), color: 0xb8a98c, alpha: 0.5, grow: 3.2, damp: 1.25, fadeIn: 0.05 },
      );
    }
    // lingering pad smoke — a few cheap long-lived puffs (~20-30 s)
    const n3 = Math.round(7 * scale) + 3;
    for (let i = 0; i < n3; i++) {
      this.smoke.spawn(
        pos.x + r.gauss(0, 2.5) * scale, pos.y + r.range(1, 6), pos.z + r.gauss(0, 2.5) * scale,
        r.gauss(0, 0.4), r.range(0.7, 1.7), r.gauss(0, 0.4),
        { size: r.range(9, 15) * scale, life: r.range(17, 28), color: 0xaaa49a, alpha: 0.38, grow: 3.4, damp: 0.3, fadeIn: 0.35 },
      );
    }
    // hot core puffs
    const nf = Math.round(24 * scale);
    for (let i = 0; i < nf; i++) {
      this.fire.spawn(
        pos.x + r.gauss(0, 1.1), pos.y + r.range(0, 2.5), pos.z + r.gauss(0, 1.1),
        r.gauss(0, 3.5), r.range(5, 18), r.gauss(0, 3.5),
        { size: r.range(2.5, 5.5) * scale, life: r.range(0.25, 0.7), color: 0xffc06a, alpha: 0.8, grow: 1.6, damp: 2.2 },
      );
    }
    this.events.emit('shake', { amp: 0.35 * scale, dur: 0.7 });
  }

  /** continuous engine exhaust — call every sim step while boosting */
  exhaust(pos, vel, scale = 1, dtStep = 1 / 120) {
    const r = this.rng;
    const segLen = vel.length() * dtStep;
    const rho = airDensity(pos.y);
    // intense near-nozzle core, one per step (short-lived, additive)
    this.fire.spawn(
      pos.x + r.gauss(0, 0.3), pos.y + r.gauss(0, 0.3), pos.z + r.gauss(0, 0.3),
      -vel.x * 0.1 + r.gauss(0, 1.5), -vel.y * 0.1 + r.gauss(0, 1.5), -vel.z * 0.1 + r.gauss(0, 1.5),
      { size: r.range(1.8, 3.0) * scale, life: r.range(0.1, 0.2), color: 0xfff0c8, alpha: 1.0, grow: 0.4, damp: 3, fadeIn: 0.016 });
    // occasional wider pulse gives the plume a flickering body
    if (r.next() < dtStep * 60) {
      this.fire.spawn(pos.x, pos.y, pos.z,
        -vel.x * 0.06 + r.gauss(0, 1), -vel.y * 0.06 + r.gauss(0, 1), -vel.z * 0.06 + r.gauss(0, 1),
        { size: r.range(3.5, 5.5) * scale, life: r.range(0.15, 0.3), color: 0xffc478, alpha: 0.9, grow: 1.4, damp: 2.4 });
    }
    // flickering exhaust light while low — night launches paint the pad
    if (pos.y < 130 && r.next() < dtStep * 9) {
      this.lights.flash(_v.set(pos.x, Math.max(2, pos.y - 4), pos.z), { intensity: 700 * scale, dur: 0.3, color: 0xffb668 });
    }
    // billowy trail: distance-based spacing along this step's segment so fast
    // missiles don't leave dotted gaps (multiple puffs/step, capped)
    const want = segLen / 4.0;
    let nP = Math.floor(want);
    if (r.next() < want - nP) nP++;
    if (nP > 3) nP = 3;
    for (let i = 0; i < nP; i++) {
      const f = (i + r.next()) / nP;
      const px = pos.x - vel.x * dtStep * f;
      const py = pos.y - vel.y * dtStep * f;
      const pz = pos.z - vel.z * dtStep * f;
      this.smoke.spawn(px + r.gauss(0, 0.7), py + r.gauss(0, 0.7), pz + r.gauss(0, 0.7),
        -vel.x * 0.02 + r.gauss(0, 1.6), -vel.y * 0.02 + r.gauss(0, 1.6) + 1, -vel.z * 0.02 + r.gauss(0, 1.6),
        {
          size: r.range(4, 7.5) * scale, life: r.range(1.4, 2.6) * (0.75 + (1 - rho) * 0.9),
          color: 0xd6d4d0, alpha: 0.46 * (0.5 + rho * 0.5), grow: 2.8, damp: 1.0, fadeIn: 0.06,
        });
    }
    // extra low-altitude billow — thick column boiling off the pad
    if (rho > 0.86 && r.next() < dtStep * 55) {
      this.smoke.spawn(pos.x + r.gauss(0, 1.2), pos.y + r.gauss(0, 1.2), pos.z + r.gauss(0, 1.2),
        r.gauss(0, 2.2), r.gauss(0, 2) + 2, r.gauss(0, 2.2),
        { size: r.range(5, 9) * scale, life: r.range(2.5, 4.5), color: 0xcac6c0, alpha: 0.5, grow: 3, damp: 0.9, fadeIn: 0.08 });
    }
  }

  /** air intercept: flash, fragmentation shell, smoke ball, falling shards */
  airBurst(pos, scale = 1, color = 0xffe0b0) {
    const r = this.rng;
    this.lastBurst = { pos: pos.clone(), scale, type: 'air', time: performance.now() };
    const k = this._distK(pos);
    this.flashes.spawn(pos, { size: 70 * scale * k, dur: 0.5, color });
    this.flashes.spawn(pos, { size: 26 * scale * k, dur: 0.95, color: 0xfff6e0 });
    this.lights.flash(pos, { intensity: 3800 * scale, dur: 0.8, color: 0xffcf90 });
    this.shockwaves.spawn(pos, { maxR: 170 * scale, dur: 1.6, horizontal: false, alpha: 0.95 });
    // fireball
    const nf = Math.round(34 * scale);
    for (let i = 0; i < nf; i++) {
      this.fire.spawn(pos.x + r.gauss(0, 2), pos.y + r.gauss(0, 2), pos.z + r.gauss(0, 2),
        r.gauss(0, 26) * scale, r.gauss(0, 26) * scale, r.gauss(0, 26) * scale,
        { size: r.range(7, 14) * scale, life: r.range(0.5, 1.0), color: i % 3 ? 0xffab4e : 0xffd98e, alpha: 0.95, grow: 1.3, damp: 2.2 });
    }
    // fragmentation shell — fast thin sparks, slight gravity droop
    const nfr = Math.round(64 * scale);
    for (let i = 0; i < nfr; i++) {
      _v4.set(r.gauss(0, 1), r.gauss(0, 1), r.gauss(0, 1)).normalize();
      const sp = r.range(75, 135) * scale;
      this.fire.spawn(pos.x + _v4.x * 2, pos.y + _v4.y * 2, pos.z + _v4.z * 2,
        _v4.x * sp, _v4.y * sp, _v4.z * sp,
        { size: r.range(1.4, 2.4) * scale * Math.min(k, 2), life: r.range(0.55, 1.05), color: 0xffe2a8, alpha: 0.95, grow: 0.12, damp: 0.55, grav: -16, fadeIn: 0.016 });
    }
    // smoke ball that hangs ~10 s and drifts downwind — big chunky lobes so it
    // still reads as a volume from 600 m+
    const ns = Math.round(36 * scale);
    const smokeK = 1 + (k - 1) * 0.5; // partial distance compensation for the hang cloud
    for (let i = 0; i < ns; i++) {
      _v4.set(r.gauss(0, 1), r.gauss(0, 1), r.gauss(0, 1)).normalize().multiplyScalar(r.range(2, 9) * scale);
      this.smoke.spawn(pos.x + _v4.x, pos.y + _v4.y, pos.z + _v4.z,
        _v4.x * r.range(1.4, 3), _v4.y * r.range(1.4, 3), _v4.z * r.range(1.4, 3),
        { size: r.range(14, 24) * scale * smokeK, life: r.range(7, 12), color: 0x5c5852, alpha: 0.72, grow: 2.6, damp: 0.8, grav: 0.5, fadeIn: 0.1 });
    }
    // debris cloud + a few big glowing shards that trail smoke as they fall
    this.debris.burst(pos, Math.round(9 * scale), 65, { glow: 1, scale: 0.9 * scale, life: 6 }, r);
    this.debris.burst(pos, 3, 34, { glow: 1.6, scale: 1.9 * scale, life: 9, smoky: true }, r);
    this.events.emit('boom', { pos: pos.clone(), scale });
  }

  /** ground impact: fireball, dirt column, rolling dust ring, crater, debris,
   *  shockwave + dome, delayed secondary pops */
  groundImpact(pos, scale = 1) {
    const r = this.rng;
    this.lastBurst = { pos: pos.clone(), scale, type: 'ground', time: performance.now() };
    const p = _v.set(pos.x, Math.max(2, pos.y), pos.z);
    const k = this._distK(p);
    this.flashes.spawn(p, { size: 78 * scale * k, dur: 0.5, color: 0xffd0a0 });
    this.flashes.spawn(_v2.copy(p).setY(p.y + 6), { size: 32 * scale * k, dur: 0.95, color: 0xffe7c0 });
    this.lights.flash(_v2.copy(p).setY(8), { intensity: 5600 * scale, dur: 1.1, color: 0xff9a4a });
    this.shockwaves.spawn(p, { maxR: 120 * scale, dur: 1.6, horizontal: true, alpha: 0.65 });
    this.domes.spawn(p, { maxR: 21 * scale, dur: 0.42 });
    this.decals.spawn(p, 13 * scale, r.range(0, 6));
    // fireball
    const nf = Math.round(42 * scale);
    for (let i = 0; i < nf; i++) {
      this.fire.spawn(p.x + r.gauss(0, 2.5), 1 + r.range(0, 4), p.z + r.gauss(0, 2.5),
        r.gauss(0, 7), r.range(16, 50), r.gauss(0, 7),
        { size: r.range(5, 11) * scale, life: r.range(0.5, 1.4), color: i % 3 ? 0xff9a3e : 0xffd27a, alpha: 0.95, grow: 1.8, damp: 1.5 });
    }
    // tall dark dirt column hurled upward, mushrooms as it slows
    const nc = Math.round(34 * scale);
    for (let i = 0; i < nc; i++) {
      const a = r.range(0, Math.PI * 2);
      const rad = r.range(0, 2.5);
      this.smoke.spawn(p.x + Math.cos(a) * rad, r.range(0.5, 3), p.z + Math.sin(a) * rad,
        Math.cos(a) * r.range(1, 6), r.range(28, 68), Math.sin(a) * r.range(1, 6),
        { size: r.range(8, 14) * scale, life: r.range(4.5, 8), color: 0x4a4238, alpha: 0.68, grow: 1.9, damp: 0.65, grav: -7, fadeIn: 0.05 });
    }
    // low rolling dust ring that persists
    const nr = Math.round(40 * scale);
    for (let i = 0; i < nr; i++) {
      const a = (i / nr) * Math.PI * 2 + r.range(-0.1, 0.1);
      const sp = r.range(17, 36) * scale;
      this.smoke.spawn(p.x + Math.cos(a) * 4, r.range(0.4, 2.2), p.z + Math.sin(a) * 4,
        Math.cos(a) * sp, r.range(0.5, 2), Math.sin(a) * sp,
        { size: r.range(8, 14) * scale, life: r.range(7, 13), color: 0xa4937a, alpha: 0.5, grow: 2.6, damp: 1.05, fadeIn: 0.06 });
    }
    // lingering column haze — keeps a smoke pillar for a while
    const nh = Math.round(12 * scale);
    for (let i = 0; i < nh; i++) {
      this.smoke.spawn(p.x + r.gauss(0, 2), r.range(2, 10), p.z + r.gauss(0, 2),
        r.gauss(0, 0.6), r.range(4, 9), r.gauss(0, 0.6),
        { size: r.range(10, 16) * scale, life: r.range(12, 20), color: 0x5f5850, alpha: 0.42, grow: 2.8, damp: 0.35, fadeIn: 0.25 });
    }
    // debris arcs + two big smoking chunks
    this.debris.burst(_v2.copy(p).setY(2), Math.round(22 * scale), 52, { glow: 1, scale, life: 6, upBias: 1.5 }, r);
    this.debris.burst(_v2.copy(p).setY(2), 2, 30, { glow: 1.5, scale: 1.7 * scale, life: 7, smoky: true, upBias: 1.8 }, r);
    // delayed secondary pops
    const nPops = 2 + (r.next() < 0.5 ? 1 : 0);
    for (let i = 0; i < nPops; i++) {
      this._schedulePop(r.range(0.35, 1.5), p.x + r.gauss(0, 9), 1 + r.range(0, 2), p.z + r.gauss(0, 9), scale * r.range(0.35, 0.6));
    }
    this.events.emit('boom', { pos: p.clone(), scale: scale * 1.6 });
    this.events.emit('shake', { amp: 0.5 * scale, dur: 0.9, distFrom: p.clone() });
  }

  /** brief spark shower for decoy burn-up / small events */
  sparkle(pos, scale = 1) {
    const r = this.rng;
    const k = Math.min(this._distK(pos), 2.5);
    const n = Math.round(16 * scale);
    for (let i = 0; i < n; i++) {
      this.fire.spawn(pos.x, pos.y, pos.z, r.gauss(0, 16), r.gauss(0, 16) - 4, r.gauss(0, 16),
        { size: r.range(0.9, 2.0) * k, life: r.range(0.4, 1.1), color: 0xffe9b0, alpha: 0.9, grow: 0.25, damp: 0.7, grav: -9 });
    }
  }

  update(dt) {
    // delayed events first so their spawns integrate this same step
    for (const s of this._sched) {
      if (!s.alive) continue;
      s.t -= dt;
      if (s.t <= 0) { s.alive = false; this._firePop(s.x, s.y, s.z, s.scale); }
    }
    this.smoke.update(dt, this.weather);
    this.fire.update(dt, this.weather);
    for (const t of this.trails) t.update(dt, this.weather);
    this.debris.update(dt, this);
    this.flashes.update(dt);
    this.lights.update(dt);
    this.decals.update(dt);
    this.shockwaves.update(dt);
    this.domes.update(dt);
  }

  /** camera-dependent geometry, call right before render */
  renderPrep(camera, renderer, shockDt) { // eslint-disable-line no-unused-vars
    this._camPos.copy(camera.position);
    const h = renderer.domElement.height;
    const proj = camera.projectionMatrix.elements[5];
    const px = h * 0.5 * proj;
    this.smoke.setPixelScale(px);
    this.fire.setPixelScale(px);
    for (const t of this.trails) t.buildGeometry(camera.position);
    this.shockwaves.billboard(camera);
  }

  stats() {
    return {
      smoke: this.smoke.activeCount,
      fire: this.fire.activeCount,
      trails: this.trails.filter(t => t.inUse).length,
      debris: this.debris.activeCount,
    };
  }
}
