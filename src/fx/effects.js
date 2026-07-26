import * as THREE from 'three';
import { bus, EVT } from '../core/events.js';
import { settings } from '../core/settings.js';
import { generateImageTexture } from '../art/texgen.js';
import { cyl } from '../map/kit.js';
import { plainMaterial } from '../art/materials.js';
import { registerCharacterAssets } from '../characters/manifest.js';

// ---------------------------------------------------------------------------
// EffectsSystem.  (owner: fable4)
//
// Everything is pooled: point-sprite particle pools (one draw call each),
// a camera-facing quad pool for large elements (muzzle flash cores, smoke
// volumes, rings), an instanced shell-casing pool with micro-physics, a
// tracer pool and a tiny point-light pool. Particle budgets scale with
// settings.quality.particleScale.
//
// Combat / AI may either call these methods directly (per the interface
// contract) or emit bus events — frame-stamped dedup makes both safe.
// ---------------------------------------------------------------------------

// ------------------------------------------------------------- sprite art --

function softTex() {
  return generateImageTexture('fx:soft', 64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

function smokeTex() {
  return generateImageTexture('fx:smoke', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // Layered soft blobs make a convincing puff after mipmapping.
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + i * 1.7;
      const r = 18 + (i * 37) % 26;
      const x = 64 + Math.cos(a) * (14 + (i * 13) % 22);
      const y = 64 + Math.sin(a) * (14 + (i * 7) % 22);
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.16)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  });
}

function sparkTex() {
  return generateImageTexture('fx:spark', 64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 32, 64, 32);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 26, 64, 12);
    const g2 = ctx.createRadialGradient(32, 32, 1, 32, 32, 10);
    g2.addColorStop(0, 'rgba(255,255,255,1)');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  });
}

function starTex() {
  return generateImageTexture('fx:star', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.translate(64, 64);
    for (let arm = 0; arm < 5; arm++) {
      const ang = (arm / 5) * Math.PI * 2 + (arm % 2) * 0.3;
      const len = arm % 2 ? 30 : 58;
      const g = ctx.createLinearGradient(0, 0, Math.cos(ang) * len, Math.sin(ang) * len);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = arm % 2 ? 7 : 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
      ctx.stroke();
    }
    const core = ctx.createRadialGradient(0, 0, 1, 0, 0, 26);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.fillRect(-64, -64, 128, 128);
  });
}

function shardTex() {
  return generateImageTexture('fx:shard', 64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(30, 6); ctx.lineTo(52, 30); ctx.lineTo(38, 58); ctx.lineTo(14, 40); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(30, 6); ctx.lineTo(38, 58); ctx.lineTo(26, 44); ctx.closePath();
    ctx.fill();
  });
}

function ringTex() {
  return generateImageTexture('fx:ring', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.stroke();
  });
}

// ---------------------------------------------------------- particle pool --

const VERT = /* glsl */`
attribute float aSize;
attribute vec3 aColor;
attribute float aAlpha;
attribute float aRot;
uniform float uProjScale;
varying vec3 vColor;
varying float vAlpha;
varying float vRot;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vRot = aRot;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(aSize * uProjScale / max(0.05, -mv.z), 0.0, 384.0);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */`
uniform sampler2D uMap;
varying vec3 vColor;
varying float vAlpha;
varying float vRot;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float c = cos(vRot), s = sin(vRot);
  uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;
  vec4 tex = texture2D(uMap, uv);
  gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha);
  if (gl_FragColor.a < 0.004) discard;
}`;

class ParticlePool {
  constructor(scene, capacity, texture, { additive = false } = {}) {
    this.capacity = capacity;
    this.cursor = 0;
    this.alive = 0;

    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.sizes = new Float32Array(capacity);
    this.alphas = new Float32Array(capacity);
    this.rots = new Float32Array(capacity);
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    geo.setAttribute('aRot', new THREE.BufferAttribute(this.rots, 1));

    this.mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: texture }, uProjScale: { value: 600 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 22 : 21;
    scene.add(this.points);

    // CPU simulation state.
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.age = new Float32Array(capacity).fill(1e9);
    this.size0 = new Float32Array(capacity);
    this.size1 = new Float32Array(capacity);
    this.alpha0 = new Float32Array(capacity);
    this.alpha1 = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.rotSpd = new Float32Array(capacity);
    this.floor = new Float32Array(capacity).fill(-1e9);
  }

  spawn(o) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    this.positions[i * 3] = o.pos.x;
    this.positions[i * 3 + 1] = o.pos.y;
    this.positions[i * 3 + 2] = o.pos.z;
    this.vel[i * 3] = o.vel?.x || 0;
    this.vel[i * 3 + 1] = o.vel?.y || 0;
    this.vel[i * 3 + 2] = o.vel?.z || 0;
    this.life[i] = o.life ?? 1;
    this.age[i] = 0;
    this.size0[i] = o.size0 ?? 0.1;
    this.size1[i] = o.size1 ?? this.size0[i];
    this.alpha0[i] = o.alpha0 ?? 1;
    this.alpha1[i] = o.alpha1 ?? 0;
    this.grav[i] = o.gravity ?? 0;
    this.drag[i] = o.drag ?? 0;
    this.rots[i] = o.rot ?? Math.random() * Math.PI * 2;
    this.rotSpd[i] = o.rotSpeed ?? 0;
    this.floor[i] = o.floor ?? -1e9;
    const c = o.color ?? 0xffffff;
    this.colors[i * 3] = ((c >> 16) & 255) / 255;
    this.colors[i * 3 + 1] = ((c >> 8) & 255) / 255;
    this.colors[i * 3 + 2] = (c & 255) / 255;
    this.alive++;
  }

  update(dt, projScale) {
    this.mat.uniforms.uProjScale.value = projScale;
    let any = false;
    for (let i = 0; i < this.capacity; i++) {
      if (this.age[i] >= this.life[i]) {
        if (this.sizes[i] !== 0) { this.sizes[i] = 0; any = true; }
        continue;
      }
      any = true;
      this.age[i] += dt;
      const k = Math.min(1, this.age[i] / this.life[i]);
      const dragF = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i * 3] *= dragF;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * dragF + this.grav[i] * dt;
      this.vel[i * 3 + 2] *= dragF;
      this.positions[i * 3] += this.vel[i * 3] * dt;
      this.positions[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.positions[i * 3 + 1] < this.floor[i]) {
        this.positions[i * 3 + 1] = this.floor[i];
        this.vel[i * 3 + 1] *= -0.25;
        this.vel[i * 3] *= 0.6;
        this.vel[i * 3 + 2] *= 0.6;
      }
      this.sizes[i] = this.size0[i] + (this.size1[i] - this.size0[i]) * k;
      this.alphas[i] = this.alpha0[i] + (this.alpha1[i] - this.alpha0[i]) * k;
      this.rots[i] += this.rotSpd[i] * dt;
    }
    if (any) {
      const g = this.points.geometry;
      g.attributes.position.needsUpdate = true;
      g.attributes.aColor.needsUpdate = true;
      g.attributes.aSize.needsUpdate = true;
      g.attributes.aAlpha.needsUpdate = true;
      g.attributes.aRot.needsUpdate = true;
    }
    this.points.visible = any;
  }

  reset() {
    this.age.fill(1e9);
    this.sizes.fill(0);
    this.alive = 0;
    this.points.geometry.attributes.aSize.needsUpdate = true;
  }
}

// -------------------------------------------------------------- quad pool --

/** Camera-facing quads for large elements (flash cores, smoke, rings). */
class QuadPool {
  constructor(scene, capacity, texture, { additive = false } = {}) {
    this.items = [];
    const geo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < capacity; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: texture, transparent: true, depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        opacity: 0, toneMapped: true,
      });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.renderOrder = additive ? 24 : 23;
      m.frustumCulled = false;
      scene.add(m);
      this.items.push({
        mesh: m, life: 0, age: 1e9, size0: 1, size1: 1,
        alpha0: 1, alpha1: 0, spin: 0, angle: 0, vel: new THREE.Vector3(), swirl: 0,
      });
    }
    this.cursor = 0;
  }

  spawn(o) {
    const it = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    it.mesh.position.copy(o.pos);
    it.mesh.material.color.set(o.color ?? 0xffffff);
    it.life = o.life ?? 1;
    it.age = 0;
    it.size0 = o.size0 ?? 1;
    it.size1 = o.size1 ?? it.size0;
    it.alpha0 = o.alpha0 ?? 1;
    it.alpha1 = o.alpha1 ?? 0;
    it.spin = o.spin ?? 0;
    it.angle = o.angle ?? Math.random() * Math.PI * 2;
    it.vel.copy(o.vel ?? ZERO3);
    it.swirl = o.swirl ?? 0;
    it.mesh.visible = true;
    return it;
  }

  update(dt, camera) {
    for (const it of this.items) {
      if (it.age >= it.life) {
        if (it.mesh.visible) it.mesh.visible = false;
        continue;
      }
      it.age += dt;
      const k = Math.min(1, it.age / it.life);
      const s = it.size0 + (it.size1 - it.size0) * k;
      it.mesh.scale.set(s, s, s);
      it.mesh.material.opacity = it.alpha0 + (it.alpha1 - it.alpha0) * k;
      it.angle += it.spin * dt;
      if (it.swirl) {
        it.mesh.position.x += Math.sin(it.angle * 2.1) * it.swirl * dt;
        it.mesh.position.z += Math.cos(it.angle * 1.7) * it.swirl * dt;
      }
      it.mesh.position.addScaledVector(it.vel, dt);
      it.mesh.quaternion.copy(camera.quaternion);
      it.mesh.rotateZ(it.angle);
    }
  }

  reset() {
    for (const it of this.items) { it.age = 1e9; it.mesh.visible = false; }
  }
}

const ZERO3 = new THREE.Vector3();

// ------------------------------------------------------------ shell pool --

const SHELL_SPECS = {
  pistol: { len: 0.019, r: 0.0048, color: 0xc9a24b },
  smg: { len: 0.019, r: 0.0048, color: 0xc9a24b },
  rifle: { len: 0.045, r: 0.0048, color: 0xb98f3e },
  shotgun: { len: 0.062, r: 0.0095, color: 0xa03428 },
  sniper: { len: 0.06, r: 0.0062, color: 0xb98f3e },
};

class ShellPool {
  constructor(scene, collision, capacity = 48) {
    this.collision = collision;
    this.capacity = capacity;
    this.mesh = new THREE.InstancedMesh(
      cyl(1, 1, 1, 6),
      plainMaterial(0xffffff, { roughness: 0.35, metalness: 0.85 }, 'fx-shell'),
      capacity
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = capacity;
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    this.color = new THREE.Color();
    if (!this.mesh.instanceColor) this.mesh.setColorAt(0, this.color.set(0xc9a24b));
    scene.add(this.mesh);
    this.items = new Array(capacity).fill(null).map(() => ({
      active: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      rot: new THREE.Euler(), angVel: new THREE.Vector3(), floor: 0,
      age: 0, len: 0.02, r: 0.005, bounced: false, family: 'pistol',
    }));
    this.cursor = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this._down = new THREE.Vector3(0, -1, 0);
  }

  spawn(pos, dir, family) {
    const spec = SHELL_SPECS[family] || SHELL_SPECS.pistol;
    const it = this.items[this.cursor];
    const idx = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    it.active = true;
    it.pos.copy(pos);
    it.vel.copy(dir).multiplyScalar(1.6 + Math.random() * 1.1);
    it.vel.y += 1.2 + Math.random() * 0.8;
    it.rot.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    it.angVel.set((Math.random() - 0.5) * 28, (Math.random() - 0.5) * 28, (Math.random() - 0.5) * 28);
    it.age = 0;
    it.len = spec.len;
    it.r = spec.r;
    it.family = family;
    it.bounced = false;
    if (this.mesh.instanceColor) this.mesh.setColorAt(idx, this.color.set(spec.color));
    else this.mesh.setColorAt(idx, this.color.set(spec.color));
    // Find the floor once (cheap raycast straight down).
    const hit = this.collision?.raycast?.(pos, this._down, 6);
    it.floor = hit?.hit ? hit.point.y : pos.y - 1.6;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < this.capacity; i++) {
      const it = this.items[i];
      if (!it.active) { this._hide(i); continue; }
      any = true;
      it.age += dt;
      if (it.age > 7) { it.active = false; this._hide(i); continue; }
      const resting = it.pos.y <= it.floor + it.r + 0.001 && Math.abs(it.vel.y) < 0.15;
      if (!resting) {
        it.vel.y -= 9.8 * dt;
        it.pos.addScaledVector(it.vel, dt);
        it.rot.x += it.angVel.x * dt;
        it.rot.y += it.angVel.y * dt;
        it.rot.z += it.angVel.z * dt;
        if (it.pos.y < it.floor + it.r) {
          it.pos.y = it.floor + it.r;
          it.vel.y = -it.vel.y * 0.38;
          it.vel.x *= 0.7;
          it.vel.z *= 0.7;
          it.angVel.multiplyScalar(0.5);
          if (!it.bounced) {
            it.bounced = true;
            bus.emit(EVT.WEAPON_SHELL, {
              position: [it.pos.x, it.pos.y, it.pos.z],
              family: it.family, event: 'bounce',
            });
          }
          if (Math.abs(it.vel.y) < 0.15) {
            it.vel.set(0, 0, 0);
            it.rot.x = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
          }
        }
      }
      this._q.setFromEuler(it.rot);
      this._s.set(it.r, it.len, it.r);
      this._m.compose(it.pos, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = any;
  }

  _hide(i) {
    this._m.makeScale(0, 0, 0);
    this.mesh.setMatrixAt(i, this._m);
  }

  reset() {
    for (let i = 0; i < this.capacity; i++) { this.items[i].active = false; this._hide(i); }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------ tracer pool --

class TracerPool {
  constructor(scene, capacity = 20) {
    this.items = [];
    const geo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < capacity; i++) {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd9a0, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const a = new THREE.Mesh(geo, mat);
      const b = new THREE.Mesh(geo, mat);
      b.rotation.y = Math.PI / 2;
      g.add(a, b);
      g.visible = false;
      g.frustumCulled = false;
      scene.add(g);
      this.items.push({ group: g, mat, life: 0, age: 1e9 });
    }
    this.cursor = 0;
    this._dir = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
  }

  spawn(from, to, family) {
    const it = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    this._dir.subVectors(to, from);
    const len = this._dir.length();
    if (len < 0.5) return;
    this._dir.divideScalar(len);
    it.group.position.copy(from).addScaledVector(this._dir, len * 0.5);
    it.group.quaternion.setFromUnitVectors(this._up, this._dir);
    const width = family === 'sniper' ? 0.014 : 0.009;
    it.group.scale.set(width, len, width);
    it.mat.color.set(family === 'sniper' ? 0xd8e8ff : 0xffd9a0);
    it.life = 0.09;
    it.age = 0;
    it.group.visible = true;
  }

  update(dt) {
    for (const it of this.items) {
      if (it.age >= it.life) { it.group.visible = false; continue; }
      it.age += dt;
      it.mat.opacity = 0.55 * (1 - it.age / it.life);
    }
  }

  reset() {
    for (const it of this.items) { it.age = 1e9; it.group.visible = false; }
  }
}

// ---------------------------------------------------------------- system --

const MUZZLE = {
  pistol: { size: 0.16, life: 0.05, color: 0xffca7a, light: 2.2, smoke: 1 },
  smg: { size: 0.14, life: 0.045, color: 0xffc06a, light: 1.9, smoke: 1 },
  rifle: { size: 0.24, life: 0.055, color: 0xffb85e, light: 3.0, smoke: 2 },
  shotgun: { size: 0.34, life: 0.07, color: 0xffa64e, light: 3.8, smoke: 3 },
  sniper: { size: 0.42, life: 0.08, color: 0xffd08a, light: 4.4, smoke: 3 },
};

export class EffectsSystem {
  constructor(game) {
    registerCharacterAssets();
    this.game = game;
    this.scene = game.scene;
    this.camera = game.camera;
    this.time = 0;

    const ps = settings.quality.particleScale;
    this.pScale = ps;
    const cap = (n) => Math.max(24, Math.round(n * ps));

    this.sparks = new ParticlePool(this.scene, cap(224), sparkTex(), { additive: true });
    this.glow = new ParticlePool(this.scene, cap(160), softTex(), { additive: true });
    this.smoke = new ParticlePool(this.scene, cap(320), smokeTex(), { additive: false });
    this.debris = new ParticlePool(this.scene, cap(192), shardTex(), { additive: false });
    this.mist = new ParticlePool(this.scene, cap(144), softTex(), { additive: false });
    this.dust = new ParticlePool(this.scene, cap(200), softTex(), { additive: false });

    this.quads = new QuadPool(this.scene, 20, starTex(), { additive: true });
    this.smokeQuads = new QuadPool(this.scene, 36, smokeTex(), { additive: false });
    this.rings = new QuadPool(this.scene, 10, ringTex(), { additive: true });

    this.shells = new ShellPool(this.scene, game.collision, Math.round(48 * Math.max(0.6, ps)));
    this.tracers = new TracerPool(this.scene, 20);

    // Pooled point lights for flashes.
    this.lights = [];
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xffc080, 0, 9, 2);
      l.castShadow = false;
      this.scene.add(l);
      this.lights.push({ light: l, life: 0, age: 1e9, peak: 1 });
    }

    /** Active smoke volumes for LOS queries. */
    this.smokeVolumes = [];
    /** Ambient dust emitters. */
    this.dustEmitters = [];
    /** Objective markers. */
    this.markers = [];

    // Dedup stamps so direct calls + bus events never double-spawn.
    this._stamps = new Map();

    this._offs = [
      bus.on(EVT.IMPACT, (p) => {
        if (!p || !p.point) return;
        const pos = toVec3(p.point);
        if (this._stamped('impact', pos)) return;
        this.spawnImpact(pos, toVec3(p.normal || { x: 0, y: 1, z: 0 }), p.surface || 'concrete', p);
      }),
      bus.on(EVT.GLASS_BREAK, (p) => {
        if (p?.pane && !p.pane.__fxShattered) this.glassShatter(p.pane);
      }),
      bus.on(EVT.SETTINGS_CHANGED, ({ key }) => {
        if (key === 'quality' || key === null) this.pScale = settings.quality.particleScale;
      }),
    ];
  }

  _stamped(kind, pos) {
    const frame = this.game.engine?.frame ?? 0;
    const key = `${kind}:${Math.round(pos.x * 4)},${Math.round(pos.y * 4)},${Math.round(pos.z * 4)}`;
    const prev = this._stamps.get(key);
    if (prev !== undefined && frame - prev <= 1) return true;
    this._stamps.set(key, frame);
    if (this._stamps.size > 128) this._stamps.clear();
    return false;
  }

  get projScale() {
    const e = this.game.engine;
    if (!this._sizeV2) this._sizeV2 = new THREE.Vector2();
    const h = e ? e.renderer.getSize(this._sizeV2).y * e.renderer.getPixelRatio() : 720;
    return h * 0.5 * (this.camera?.projectionMatrix.elements[5] || 1.7);
  }

  n(base) { return Math.max(1, Math.round(base * this.pScale)); }

  // ------------------------------------------------------------- muzzle --

  /**
   * @param {THREE.Vector3} worldPos
   * @param {THREE.Vector3} dir  bullet direction
   * @param {string} family pistol|smg|rifle|shotgun|sniper
   */
  muzzleFlash(worldPos, dir, family = 'rifle') {
    const spec = MUZZLE[family] || MUZZLE.rifle;
    this._stamped('muzzle', worldPos); // stamp so event-driven copies skip
    // Star core + halo.
    this.quads.spawn({
      pos: worldPos, size0: spec.size, size1: spec.size * 1.35,
      life: spec.life, color: spec.color, alpha0: 0.95, alpha1: 0, spin: 6,
    });
    this.glow.spawn({
      pos: worldPos, life: spec.life * 1.4, size0: spec.size * 0.9, size1: spec.size * 1.8,
      color: spec.color, alpha0: 0.6, alpha1: 0,
    });
    // Sparks flying forward in a shallow cone.
    const nS = this.n(family === 'shotgun' ? 8 : 4);
    for (let i = 0; i < nS; i++) {
      const v = jitterCone(dir, family === 'shotgun' ? 0.35 : 0.14);
      v.multiplyScalar(7 + Math.random() * 9);
      this.sparks.spawn({
        pos: worldPos, vel: v, life: 0.09 + Math.random() * 0.1,
        size0: 0.04, size1: 0.008, color: 0xffca7a, alpha0: 1, alpha1: 0, gravity: -4,
      });
    }
    // Muzzle smoke wisps drifting up.
    for (let i = 0; i < this.n(spec.smoke); i++) {
      this.smoke.spawn({
        pos: worldPos, vel: new THREE.Vector3(dir.x * 0.7 + rnd(0.3), 0.4 + Math.random() * 0.3, dir.z * 0.7 + rnd(0.3)),
        life: 0.5 + Math.random() * 0.4, size0: 0.07, size1: 0.30,
        color: 0x8d9096, alpha0: 0.28, alpha1: 0, drag: 2.2, rotSpeed: rnd(2),
      });
    }
    this._pulseLight(worldPos, spec.color, spec.light, 0.06);
  }

  _pulseLight(pos, color, intensity, life) {
    let slot = this.lights.find((l) => l.age >= l.life) || this.lights[0];
    slot.light.position.copy(pos);
    slot.light.color.set(color);
    slot.peak = intensity;
    slot.life = life;
    slot.age = 0;
    slot.light.intensity = intensity;
  }

  // ------------------------------------------------------------- impacts --

  /**
   * Per-surface bullet impact.
   * @param {THREE.Vector3} point @param {THREE.Vector3} normal
   * @param {string} surface  physics SURFACE value
   */
  spawnImpact(point, normal, surface = 'concrete', opts = {}) {
    const p = toVec3(point);
    const nrm = toVec3(normal);
    this._stamped('impact', p);
    const out = (spread, speed) => jitterCone(nrm, spread).multiplyScalar(speed);

    switch (surface) {
      case 'concrete':
      case 'tile': {
        for (let i = 0; i < this.n(3); i++) {
          this.sparks.spawn({ pos: p, vel: out(0.5, 5 + Math.random() * 5), life: 0.12 + Math.random() * 0.12, size0: 0.03, size1: 0.006, color: 0xffcf8f, alpha0: 1, alpha1: 0, gravity: -9 });
        }
        this._puff(p, nrm, 0x9b9c98, 0.35, 2);
        this._chips(p, nrm, 0x7f807c, 3);
        break;
      }
      case 'drywall': {
        this._puff(p, nrm, 0xd9d3c8, 0.5, 3);
        this._chips(p, nrm, 0xcdc7ba, 4);
        break;
      }
      case 'wood': {
        this._chips(p, nrm, 0x8a5f3c, 5, 0.05);
        this._puff(p, nrm, 0xa98c62, 0.22, 1);
        break;
      }
      case 'metal':
      case 'electronic': {
        for (let i = 0; i < this.n(6); i++) {
          this.sparks.spawn({ pos: p, vel: out(0.7, 6 + Math.random() * 8), life: 0.15 + Math.random() * 0.2, size0: 0.035, size1: 0.005, color: 0xffe2a0, alpha0: 1, alpha1: 0, gravity: -12, floor: p.y - 2 });
        }
        this.glow.spawn({ pos: p, life: 0.08, size0: 0.1, size1: 0.02, color: 0xfff0c0, alpha0: 0.9, alpha1: 0 });
        break;
      }
      case 'glass': {
        this._glassBits(p, nrm, this.n(8), 3);
        break;
      }
      case 'carpet':
      case 'fabric':
      case 'paper': {
        this._puff(p, nrm, surface === 'paper' ? 0xe8e2d2 : 0x6c7683, 0.28, 2);
        for (let i = 0; i < this.n(4); i++) {
          this.dust.spawn({ pos: p, vel: out(0.8, 0.8 + Math.random()), life: 0.8, size0: 0.02, size1: 0.05, color: 0xa8a49a, alpha0: 0.5, alpha1: 0, gravity: -0.8, drag: 1.5 });
        }
        break;
      }
      case 'snow': {
        for (let i = 0; i < this.n(6); i++) {
          this.mist.spawn({ pos: p, vel: out(0.7, 1.5 + Math.random() * 2), life: 0.5, size0: 0.05, size1: 0.14, color: 0xeef4fa, alpha0: 0.8, alpha1: 0, gravity: -3 });
        }
        break;
      }
      case 'flesh': {
        this.bloodSpray(p, nrm, opts);
        break;
      }
      case 'plastic':
      default: {
        this._chips(p, nrm, 0x3a4048, 3, 0.03);
        this._puff(p, nrm, 0x6b7178, 0.18, 1);
        break;
      }
    }
  }

  _puff(p, nrm, color, size, count) {
    for (let i = 0; i < this.n(count); i++) {
      this.smoke.spawn({
        pos: p, vel: jitterCone(nrm, 0.9).multiplyScalar(0.6 + Math.random() * 0.8),
        life: 0.5 + Math.random() * 0.35, size0: size * 0.35, size1: size,
        color, alpha0: 0.4, alpha1: 0, drag: 2.5, gravity: 0.15, rotSpeed: rnd(1.5),
      });
    }
  }

  _chips(p, nrm, color, count, size = 0.035) {
    for (let i = 0; i < this.n(count); i++) {
      this.debris.spawn({
        pos: p, vel: jitterCone(nrm, 0.8).multiplyScalar(2 + Math.random() * 3),
        life: 0.6 + Math.random() * 0.5, size0: size, size1: size * 0.7,
        color, alpha0: 1, alpha1: 0.4, gravity: -9.8, rotSpeed: rnd(14), floor: p.y - 3,
      });
    }
  }

  _glassBits(p, nrm, count, speed) {
    for (let i = 0; i < count; i++) {
      this.debris.spawn({
        pos: p, vel: jitterCone(nrm, 1.1).multiplyScalar(speed * (0.5 + Math.random())),
        life: 0.8 + Math.random() * 0.6, size0: 0.04, size1: 0.03,
        color: 0xd8ecf4, alpha0: 0.95, alpha1: 0.3, gravity: -9.8, rotSpeed: rnd(18), floor: p.y - 4,
      });
    }
  }

  // -------------------------------------------------------------- shells --

  /** Physical casing that arcs, bounces (emits a bus tink) and rests. */
  ejectShell(pos, dir, family = 'pistol') {
    this.shells.spawn(toVec3(pos), toVec3(dir), family);
  }

  // -------------------------------------------------------------- tracer --

  /** Subtle stretched streak along the bullet path (not a laser). */
  tracer(from, to, family = 'rifle') {
    this.tracers.spawn(toVec3(from), toVec3(to), family);
  }

  // ---------------------------------------------------------------- smoke --

  /**
   * Volumetric-looking smoke bloom that blocks AI line of sight.
   * @returns handle {pos, radius, expired}
   */
  smokeVolume(pos, radius = 2.6, duration = 14) {
    const p = toVec3(pos);
    const vol = { pos: p.clone(), radius, duration, age: 0, expired: false };
    this.smokeVolumes.push(vol);
    // A cluster of big slow quads plus filler particles.
    const shades = [0x9aa0a6, 0x8a9096, 0xa8adb2, 0x7e848a];
    const nQuads = Math.min(12, this.n(9));
    for (let i = 0; i < nQuads; i++) {
      const off = new THREE.Vector3(rnd(radius * 0.55), Math.random() * radius * 0.5, rnd(radius * 0.55));
      this.smokeQuads.spawn({
        pos: p.clone().add(off),
        life: duration * (0.75 + Math.random() * 0.25),
        size0: radius * 0.5, size1: radius * 1.7,
        color: shades[i % shades.length],
        alpha0: 0.88, alpha1: 0,
        spin: rnd(0.4), swirl: 0.12,
        vel: new THREE.Vector3(rnd(0.05), 0.05 + Math.random() * 0.05, rnd(0.05)),
      });
    }
    for (let i = 0; i < this.n(10); i++) {
      this.smoke.spawn({
        pos: p.clone().add(new THREE.Vector3(rnd(radius * 0.4), Math.random() * 0.5, rnd(radius * 0.4))),
        vel: new THREE.Vector3(rnd(0.4), 0.3 + Math.random() * 0.3, rnd(0.4)),
        life: 2 + Math.random() * 2, size0: 0.3, size1: radius * 0.8,
        color: 0x9aa0a6, alpha0: 0.5, alpha1: 0, drag: 0.8, rotSpeed: rnd(0.8),
      });
    }
    return vol;
  }

  /** True when the segment a→b passes through an active smoke volume. */
  blocksLineOfSight(a, b) {
    if (!this.smokeVolumes.length) return false;
    const A = toVec3(a);
    const B = toVec3(b);
    for (const v of this.smokeVolumes) {
      if (v.expired) continue;
      // Effective radius ramps in fast, holds, then decays.
      const k = v.age / v.duration;
      const eff = v.radius * (k < 0.08 ? k / 0.08 : k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1);
      if (eff <= 0.2) continue;
      if (segmentPointDistance(A, B, v.pos) < eff) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- flash --

  /** Flash-device detonation: blinding core, shock ring, smoke, light pop. */
  flashEffect(pos) {
    const p = toVec3(pos);
    this.quads.spawn({ pos: p, size0: 1.2, size1: 3.2, life: 0.22, color: 0xffffff, alpha0: 1, alpha1: 0 });
    this.rings.spawn({ pos: p, size0: 0.4, size1: 5.5, life: 0.4, color: 0xfff4d8, alpha0: 0.9, alpha1: 0 });
    for (let i = 0; i < this.n(14); i++) {
      const v = new THREE.Vector3(rnd(1), Math.random(), rnd(1)).normalize().multiplyScalar(6 + Math.random() * 8);
      this.sparks.spawn({ pos: p, vel: v, life: 0.3 + Math.random() * 0.3, size0: 0.05, size1: 0.01, color: 0xfff0c0, alpha0: 1, alpha1: 0, gravity: -10, floor: p.y - 2 });
    }
    this._puff(p, new THREE.Vector3(0, 1, 0), 0xb8bcc0, 0.9, 4);
    this._pulseLight(p, 0xfff2d8, 14, 0.3);
  }

  // ---------------------------------------------------------------- glass --

  /** Fracture + falling fragments for a level glass pane record. */
  glassShatter(pane) {
    if (!pane || pane.__fxShattered) return;
    pane.__fxShattered = true;
    const center = toVec3(pane.center || pane.mesh?.position || pane.position || ZERO3);
    if (pane.mesh) pane.mesh.visible = false;
    const w = pane.width || 1.2;
    const h = pane.height || 1.4;
    const rotY = pane.rotY || 0;
    const right = new THREE.Vector3(Math.cos(rotY), 0, -Math.sin(rotY));
    const nrm = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
    const count = Math.min(46, this.n(34));
    for (let i = 0; i < count; i++) {
      const u = (Math.random() - 0.5) * w;
      const vv = (Math.random() - 0.5) * h;
      const p = center.clone().addScaledVector(right, u);
      p.y += vv;
      this.debris.spawn({
        pos: p,
        vel: new THREE.Vector3(nrm.x * rnd(1.2), -0.5 - Math.random() * 1.5, nrm.z * rnd(1.2)),
        life: 0.9 + Math.random() * 0.7,
        size0: 0.03 + Math.random() * 0.07, size1: 0.03,
        color: 0xd8ecf4, alpha0: 0.95, alpha1: 0.25,
        gravity: -9.8, rotSpeed: rnd(20), floor: center.y - h / 2 - 0.02,
      });
    }
    this.glow.spawn({ pos: center, life: 0.12, size0: 0.5, size1: 1.1, color: 0xd8ecf4, alpha0: 0.4, alpha1: 0 });
    bus.emit(EVT.GLASS_BREAK, { pane, fx: true, position: [center.x, center.y, center.z] });
  }

  // ----------------------------------------------------------- misc events --

  /** Kick dust + splinters off a door that was shot or shouldered. */
  doorImpact(door, point) {
    const p = point
      ? toVec3(point)
      : door?.spec
        ? new THREE.Vector3(door.spec.x, (door.spec.y || 0) + 1.1, door.spec.z)
        : new THREE.Vector3();
    this._puff(p, new THREE.Vector3(0, 1, 0), 0xa08a68, 0.3, 2);
    this._chips(p, new THREE.Vector3(0, 0.8, 0), 0x8a5f3c, 3, 0.04);
  }

  /** Blood mist + droplets. Respects the reducedBlood accessibility setting. */
  bloodSpray(pos, dir, opts = {}) {
    const p = toVec3(pos);
    const d = toVec3(dir || { x: 0, y: 1, z: 0 });
    if (settings.get('reducedBlood')) {
      // Neutral grey puff communicates the hit without gore.
      this._puff(p, d, 0x8a8f94, 0.22, 1);
      return;
    }
    for (let i = 0; i < this.n(5); i++) {
      this.mist.spawn({
        pos: p, vel: jitterCone(d, 0.9).multiplyScalar(1 + Math.random() * 1.6),
        life: 0.35 + Math.random() * 0.25, size0: 0.05, size1: 0.16,
        color: 0x6a1512, alpha0: 0.7, alpha1: 0, gravity: -2.5, drag: 2,
      });
    }
    for (let i = 0; i < this.n(4); i++) {
      this.debris.spawn({
        pos: p, vel: jitterCone(d, 1).multiplyScalar(2 + Math.random() * 2.4),
        life: 0.5, size0: 0.016, size1: 0.01, color: 0x5a100e,
        alpha0: 0.9, alpha1: 0.2, gravity: -9.8, floor: p.y - 2.5,
      });
    }
  }

  /** Ambient dust drifting in light shafts. Registers a steady emitter. */
  dustMotes(roomBounds) {
    if (!roomBounds) return;
    const b = roomBounds;
    const min = toVec3(b.min || { x: b.x0 ?? 0, y: b.y0 ?? 0, z: b.z0 ?? 0 });
    const max = toVec3(b.max || { x: b.x1 ?? 1, y: (b.y0 ?? 0) + (b.ceiling || 3), z: b.z1 ?? 1 });
    const emitter = { min, max, next: 0 };
    this.dustEmitters.push(emitter);
    return emitter;
  }

  /** Pulsing world marker for objectives. Returns a removable handle. */
  objectiveMarker(pos, { color = 0x4fd0e8, radius = 0.5, label } = {}) {
    const p = toVec3(pos);
    const marker = { pos: p.clone(), color, radius, label, t: 0, removed: false };
    this.markers.push(marker);
    return {
      move: (np) => marker.pos.copy(toVec3(np)),
      remove: () => { marker.removed = true; },
    };
  }

  /** Feedback burst when a hostage is secured / interacts. */
  hostageFeedback(pos, kind = 'secured') {
    const p = toVec3(pos);
    const color = kind === 'secured' ? 0x4fe08a : kind === 'warning' ? 0xffb03a : 0x4fd0e8;
    this.rings.spawn({ pos: p, size0: 0.3, size1: 1.9, life: 0.7, color, alpha0: 0.85, alpha1: 0 });
    for (let i = 0; i < this.n(8); i++) {
      this.glow.spawn({
        pos: p.clone().add(new THREE.Vector3(rnd(0.3), Math.random() * 0.4, rnd(0.3))),
        vel: new THREE.Vector3(rnd(0.4), 0.8 + Math.random() * 0.8, rnd(0.4)),
        life: 0.8 + Math.random() * 0.4, size0: 0.03, size1: 0.01,
        color, alpha0: 0.9, alpha1: 0, drag: 1,
      });
    }
  }

  victoryTransition() {
    const cam = this.camera.position;
    this.game.postfx?.pulse?.(0x7fd4e8, 0.5, 1.6);
    for (let i = 0; i < this.n(24); i++) {
      const p = new THREE.Vector3(cam.x + rnd(4), cam.y - 1 + Math.random() * 0.5, cam.z + rnd(4));
      this.glow.spawn({
        pos: p, vel: new THREE.Vector3(rnd(0.2), 0.5 + Math.random() * 0.7, rnd(0.2)),
        life: 2 + Math.random() * 1.5, size0: 0.02, size1: 0.008,
        color: 0x7fd4e8, alpha0: 0.9, alpha1: 0, drag: 0.4,
      });
    }
  }

  defeatTransition() {
    this.game.postfx?.pulse?.(0xff4d43, 0.6, 2.2);
    const cam = this.camera.position;
    for (let i = 0; i < this.n(10); i++) {
      this.smoke.spawn({
        pos: new THREE.Vector3(cam.x + rnd(3), cam.y - 0.6, cam.z + rnd(3)),
        vel: new THREE.Vector3(rnd(0.2), 0.25, rnd(0.2)),
        life: 2.5, size0: 0.4, size1: 1.4, color: 0x38393c, alpha0: 0.3, alpha1: 0, drag: 0.5,
      });
    }
  }

  // ---------------------------------------------------------------- frame --

  update(dt) {
    this.time += dt;
    const proj = this.projScale;
    this.sparks.update(dt, proj);
    this.glow.update(dt, proj);
    this.smoke.update(dt, proj);
    this.debris.update(dt, proj);
    this.mist.update(dt, proj);
    this.dust.update(dt, proj);
    this.quads.update(dt, this.camera);
    this.smokeQuads.update(dt, this.camera);
    this.rings.update(dt, this.camera);
    this.shells.update(dt);
    this.tracers.update(dt);

    for (const l of this.lights) {
      if (l.age >= l.life) { l.light.intensity = 0; continue; }
      l.age += dt;
      l.light.intensity = l.peak * Math.max(0, 1 - l.age / l.life);
    }

    for (const v of this.smokeVolumes) {
      v.age += dt;
      if (v.age >= v.duration) v.expired = true;
    }
    if (this.smokeVolumes.length > 8) {
      this.smokeVolumes = this.smokeVolumes.filter((v) => !v.expired);
    }

    // Ambient dust: keep a light steady stream inside registered bounds
    // (only when the camera is near enough to see it).
    for (const em of this.dustEmitters) {
      em.next -= dt;
      if (em.next > 0) continue;
      em.next = 0.5 / Math.max(0.2, this.pScale);
      const cx = (em.min.x + em.max.x) / 2;
      const cz = (em.min.z + em.max.z) / 2;
      const dx = this.camera.position.x - cx;
      const dz = this.camera.position.z - cz;
      if (dx * dx + dz * dz > 400) continue;
      this.dust.spawn({
        pos: new THREE.Vector3(
          em.min.x + Math.random() * (em.max.x - em.min.x),
          em.min.y + 0.4 + Math.random() * Math.max(0.4, em.max.y - em.min.y - 0.8),
          em.min.z + Math.random() * (em.max.z - em.min.z)
        ),
        vel: new THREE.Vector3(rnd(0.03), -0.015 - Math.random() * 0.02, rnd(0.03)),
        life: 6 + Math.random() * 5, size0: 0.012, size1: 0.012,
        color: 0xd8dce2, alpha0: 0, alpha1: 0.32, // fades IN, killed by lifetime
      });
    }

    // Objective markers: pulsing ring + column glow.
    for (const m of this.markers) {
      if (m.removed) continue;
      m.t += dt;
      if (m.t % 0.9 < dt) {
        this.rings.spawn({
          pos: m.pos.clone().add(new THREE.Vector3(0, 0.06, 0)),
          size0: m.radius * 0.6, size1: m.radius * 2.4, life: 0.85,
          color: m.color, alpha0: 0.5, alpha1: 0,
        });
        this.glow.spawn({
          pos: m.pos.clone().add(new THREE.Vector3(0, 1.0, 0)),
          life: 0.8, size0: 0.35, size1: 0.2, color: m.color, alpha0: 0.16, alpha1: 0,
        });
      }
    }
    if (this.markers.length > 12) this.markers = this.markers.filter((m) => !m.removed);
  }

  reset() {
    this.sparks.reset();
    this.glow.reset();
    this.smoke.reset();
    this.debris.reset();
    this.mist.reset();
    this.dust.reset();
    this.quads.reset();
    this.smokeQuads.reset();
    this.rings.reset();
    this.shells.reset();
    this.tracers.reset();
    for (const l of this.lights) { l.age = 1e9; l.light.intensity = 0; }
    this.smokeVolumes.length = 0;
    this.markers.length = 0;
    this._stamps.clear();
    // dust emitters persist (ambient, re-seeded by the level) but restart clean
  }

  dispose() {
    for (const off of this._offs) off?.();
  }
}

// ------------------------------------------------------------------ utils --

function toVec3(v) {
  if (!v) return new THREE.Vector3();
  if (v.isVector3) return v;
  if (Array.isArray(v)) return new THREE.Vector3(v[0], v[1], v[2]);
  return new THREE.Vector3(v.x || 0, v.y || 0, v.z || 0);
}

function rnd(s) { return (Math.random() - 0.5) * 2 * s; }

const _jc = new THREE.Vector3();
function jitterCone(dir, spread) {
  _jc.set(rnd(1), rnd(1), rnd(1));
  return new THREE.Vector3().copy(dir).addScaledVector(_jc, spread).normalize();
}

const _sp = new THREE.Vector3();
const _sd = new THREE.Vector3();
function segmentPointDistance(a, b, p) {
  _sd.subVectors(b, a);
  const len2 = _sd.lengthSq();
  if (len2 < 1e-8) return a.distanceTo(p);
  const t = Math.max(0, Math.min(1, _sp.subVectors(p, a).dot(_sd) / len2));
  _sp.copy(a).addScaledVector(_sd, t);
  return _sp.distanceTo(p);
}
