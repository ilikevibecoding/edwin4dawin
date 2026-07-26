import * as THREE from 'three';
import { settings } from '../core/settings.js';

/**
 * Pooled particle engine.
 * Owner: Fable 4 (VFX).
 *
 * Design: a SMALL number of THREE.Points batches (one draw call each) with
 * per-particle attributes (position, colour, size, alpha) that are simulated
 * on the CPU into pre-allocated typed arrays — never one Object3D per
 * particle. Tracers are one pooled THREE.LineSegments batch. The combined
 * slot count across the point batches never exceeds
 * `settings.preset.particleBudget`.
 *
 * Batches:
 *   add     — additive soft sprites: sparks, muzzle flash, glints, pulses
 *   smoke   — normal-blended soft sprites: smoke, dust puffs, powder, vapour
 *   solid   — normal-blended hard sprites: chips, splinters, shards, shells
 *   ambient — normal-blended soft sprites: snowfall, sunbeam motes
 */

const BATCH_DEFS = {
  add: { frac: 0.28, blending: THREE.AdditiveBlending, soft: true },
  smoke: { frac: 0.22, blending: THREE.NormalBlending, soft: true },
  solid: { frac: 0.3, blending: THREE.NormalBlending, soft: false },
  ambient: { frac: 0.2, blending: THREE.NormalBlending, soft: true },
};

const TRACER_CAP = 96;
const MAX_POINT_PX = 320;

/* ------------------------------------------------------------------ */
/* Sprite textures — DataTexture so no DOM/canvas is required          */
/* ------------------------------------------------------------------ */

let SOFT_TEX = null;
let HARD_TEX = null;

function discTexture(hard) {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - half) / half;
      const dy = (y + 0.5 - half) / half;
      const d = Math.sqrt(dx * dx + dy * dy);
      let a;
      if (hard) {
        // Hard-edged chip with a hint of top-left shading so debris reads 3D.
        a = d < 0.82 ? 1 : Math.max(0, 1 - (d - 0.82) / 0.14);
        const shade = 0.82 + 0.18 * Math.max(0, Math.min(1, 0.5 - (dx + dy) * 0.35));
        const i = (y * size + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = Math.round(255 * shade);
        data[i + 3] = Math.round(255 * a);
        continue;
      }
      // Soft gaussian puff
      a = Math.exp(-d * d * 3.4) * Math.max(0, 1 - d);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(255 * Math.min(1, a * 1.25));
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function softTex() {
  if (!SOFT_TEX) SOFT_TEX = discTexture(false);
  return SOFT_TEX;
}

function hardTex() {
  if (!HARD_TEX) HARD_TEX = discTexture(true);
  return HARD_TEX;
}

const VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float px = aSize * uScale / max(0.12, -mv.z);
  gl_PointSize = clamp(px, 0.0, ${MAX_POINT_PX.toFixed(1)});
  vAlpha = aAlpha;
  vColor = aColor;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 t = texture2D(uMap, gl_PointCoord);
  float a = t.a * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * t.rgb, a);
}`;

/* ------------------------------------------------------------------ */
/* One Points batch                                                    */
/* ------------------------------------------------------------------ */

class PointBatch {
  constructor(scene, capacity, def) {
    this.capacity = capacity;
    this.alive = 0;
    this.cursor = 0;

    // Simulation state (struct of arrays)
    this.px = new Float32Array(capacity);
    this.py = new Float32Array(capacity);
    this.pz = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.vz = new Float32Array(capacity);
    this.age = new Float32Array(capacity);
    this.ttl = new Float32Array(capacity); // 0 = dead
    this.size0 = new Float32Array(capacity);
    this.size1 = new Float32Array(capacity);
    this.cr = new Float32Array(capacity);
    this.cg = new Float32Array(capacity);
    this.cb = new Float32Array(capacity);
    this.a0 = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.rest = new Float32Array(capacity); // restitution; 0 = no ground collision
    this.groundY = new Float32Array(capacity);
    this.swirl = new Float32Array(capacity);
    this.phase = new Float32Array(capacity);
    this.fadeIn = new Float32Array(capacity);
    this.fadeOut = new Float32Array(capacity);
    this.settled = new Uint8Array(capacity);

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
    this.colAttr = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
    this.sizeAttr = new THREE.BufferAttribute(new Float32Array(capacity), 1);
    this.alphaAttr = new THREE.BufferAttribute(new Float32Array(capacity), 1);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr.setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr.setUsage(THREE.DynamicDrawUsage);
    this.alphaAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('aColor', this.colAttr);
    geo.setAttribute('aSize', this.sizeAttr);
    geo.setAttribute('aAlpha', this.alphaAttr);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: def.soft ? softTex() : hardTex() },
        uScale: { value: 700 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: def.blending,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = def.blending === THREE.AdditiveBlending ? 12 : 11;
    this.points.name = 'vfx.particles';
    this.points.userData.noHit = true;
    this.points.userData.transparentToSight = true;
    scene.add(this.points);
    this.scene = scene;

    // Park all slots far away so dead particles never rasterise on screen.
    for (let i = 0; i < capacity; i++) this.posAttr.setXYZ(i, 0, -9999, 0);
  }

  /** Find a slot: prefer a dead one, otherwise recycle round-robin (oldest-ish). */
  _slot() {
    const n = this.capacity;
    for (let k = 0; k < n; k++) {
      const i = (this.cursor + k) % n;
      if (this.ttl[i] <= 0) {
        this.cursor = (i + 1) % n;
        return i;
      }
    }
    const i = this.cursor;
    this.cursor = (i + 1) % n;
    return i;
  }

  spawn(o) {
    const i = this._slot();
    if (this.ttl[i] <= 0) this.alive++;
    this.px[i] = o.x; this.py[i] = o.y; this.pz[i] = o.z;
    this.vx[i] = o.vx ?? 0; this.vy[i] = o.vy ?? 0; this.vz[i] = o.vz ?? 0;
    this.age[i] = 0;
    this.ttl[i] = Math.max(0.016, o.ttl ?? 1);
    this.size0[i] = o.size ?? 0.05;
    this.size1[i] = o.size1 ?? this.size0[i];
    this.cr[i] = o.r ?? 1; this.cg[i] = o.g ?? 1; this.cb[i] = o.b ?? 1;
    this.a0[i] = o.alpha ?? 1;
    this.grav[i] = o.gravity ?? 0;
    this.drag[i] = o.drag ?? 0;
    this.rest[i] = o.restitution ?? 0;
    this.groundY[i] = o.groundY ?? 0;
    this.swirl[i] = o.swirl ?? 0;
    this.phase[i] = Math.random() * 6.283;
    this.fadeIn[i] = o.fadeIn ?? 0.06;
    this.fadeOut[i] = o.fadeOut ?? 0.3;
    this.settled[i] = 0;
    return i;
  }

  update(dt, time) {
    if (this.alive === 0) return;
    const n = this.capacity;
    for (let i = 0; i < n; i++) {
      let ttl = this.ttl[i];
      if (ttl <= 0) continue;
      const age = (this.age[i] += dt);
      if (age >= ttl) {
        this.ttl[i] = 0;
        this.alive--;
        this.alphaAttr.setX(i, 0);
        this.posAttr.setXYZ(i, 0, -9999, 0);
        continue;
      }
      if (!this.settled[i]) {
        this.vy[i] += this.grav[i] * dt;
        const dr = 1 - Math.min(0.95, this.drag[i] * dt);
        this.vx[i] *= dr; this.vy[i] *= dr; this.vz[i] *= dr;
        if (this.swirl[i] > 0) {
          const ph = this.phase[i];
          this.vx[i] += Math.sin(time * 1.7 + ph) * this.swirl[i] * dt;
          this.vz[i] += Math.cos(time * 1.3 + ph * 1.7) * this.swirl[i] * dt;
        }
        this.px[i] += this.vx[i] * dt;
        this.py[i] += this.vy[i] * dt;
        this.pz[i] += this.vz[i] * dt;
        if (this.rest[i] > 0) {
          const floor = this.groundY[i] + this.size0[i] * 0.5;
          if (this.py[i] < floor && this.vy[i] < 0) {
            this.py[i] = floor;
            this.vy[i] = -this.vy[i] * this.rest[i];
            this.vx[i] *= 0.62;
            this.vz[i] *= 0.62;
            const sp = Math.abs(this.vy[i]) + Math.abs(this.vx[i]) + Math.abs(this.vz[i]);
            if (sp < 0.28) {
              this.vx[i] = this.vy[i] = this.vz[i] = 0;
              this.settled[i] = 1;
            }
          }
        }
      }
      const t = age / ttl;
      const size = this.size0[i] + (this.size1[i] - this.size0[i]) * t;
      let a = this.a0[i];
      const fi = this.fadeIn[i];
      if (fi > 0 && age < fi) a *= age / fi;
      const fo = this.fadeOut[i];
      if (fo > 0 && t > 1 - fo) a *= (1 - t) / fo;
      this.posAttr.setXYZ(i, this.px[i], this.py[i], this.pz[i]);
      this.colAttr.setXYZ(i, this.cr[i], this.cg[i], this.cb[i]);
      this.sizeAttr.setX(i, size);
      this.alphaAttr.setX(i, a);
    }
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
  }

  reset() {
    this.ttl.fill(0);
    this.alive = 0;
    this.cursor = 0;
    for (let i = 0; i < this.capacity; i++) {
      this.alphaAttr.setX(i, 0);
      this.posAttr.setXYZ(i, 0, -9999, 0);
    }
    this.alphaAttr.needsUpdate = true;
    this.posAttr.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.material.dispose();
  }
}

/* ------------------------------------------------------------------ */
/* Tracer batch (additive line segments, colour fades to black)        */
/* ------------------------------------------------------------------ */

class TracerBatch {
  constructor(scene) {
    this.capacity = TRACER_CAP;
    this.alive = 0;
    this.cursor = 0;
    this.age = new Float32Array(this.capacity);
    this.ttl = new Float32Array(this.capacity);
    this.col = new Float32Array(this.capacity * 3);

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(this.capacity * 6), 3);
    this.colAttr = new THREE.BufferAttribute(new Float32Array(this.capacity * 6), 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('color', this.colAttr);

    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.lines = new THREE.LineSegments(geo, this.material);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 12;
    this.lines.name = 'vfx.tracers';
    this.lines.userData.noHit = true;
    this.lines.userData.transparentToSight = true;
    scene.add(this.lines);
    this.scene = scene;
  }

  spawn(from, to, r, g, b, ttl) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    if (this.ttl[i] <= 0) this.alive++;
    this.age[i] = 0;
    this.ttl[i] = ttl;
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b;
    this.posAttr.setXYZ(i * 2, from.x, from.y, from.z);
    this.posAttr.setXYZ(i * 2 + 1, to.x, to.y, to.z);
    this.posAttr.needsUpdate = true;
  }

  update(dt) {
    if (this.alive === 0) return;
    for (let i = 0; i < this.capacity; i++) {
      if (this.ttl[i] <= 0) continue;
      this.age[i] += dt;
      let k = 1 - this.age[i] / this.ttl[i];
      if (k <= 0) {
        this.ttl[i] = 0;
        this.alive--;
        k = 0;
      }
      k *= k; // sharper falloff — subtle path feedback, not a laser
      const r = this.col[i * 3] * k;
      const g = this.col[i * 3 + 1] * k;
      const b = this.col[i * 3 + 2] * k;
      this.colAttr.setXYZ(i * 2, r * 0.35, g * 0.35, b * 0.35);
      this.colAttr.setXYZ(i * 2 + 1, r, g, b);
    }
    this.colAttr.needsUpdate = true;
  }

  reset() {
    this.ttl.fill(0);
    this.alive = 0;
    for (let i = 0; i < this.capacity * 2; i++) this.colAttr.setXYZ(i, 0, 0, 0);
    this.colAttr.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.lines);
    this.lines.geometry.dispose();
    this.material.dispose();
  }
}

/* ------------------------------------------------------------------ */
/* Engine facade                                                       */
/* ------------------------------------------------------------------ */

export class ParticleEngine {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    this.budget = 0;
    this.batches = {};
    this.tracers = new TracerBatch(scene);
    this.setBudget(settings.preset.particleBudget ?? 320);
  }

  setBudget(budget) {
    if (budget === this.budget) return;
    this.budget = budget;
    for (const b of Object.values(this.batches)) b.dispose();
    this.batches = {};
    for (const [name, def] of Object.entries(BATCH_DEFS)) {
      this.batches[name] = new PointBatch(this.scene, Math.max(8, Math.floor(budget * def.frac)), def);
    }
  }

  /** Point-size projection scale: viewportHeightPx / (2 * tan(fovY / 2)). */
  setViewScale(heightPx, fovDeg) {
    const s = heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
    for (const b of Object.values(this.batches)) b.material.uniforms.uScale.value = s;
  }

  emit(batch, o) {
    const b = this.batches[batch];
    if (b) b.spawn(o);
  }

  /** Spawn `count` particles from a template with a jitter callback. */
  burst(batch, count, template, jitter) {
    const b = this.batches[batch];
    if (!b) return;
    for (let i = 0; i < count; i++) {
      const o = { ...template };
      if (jitter) jitter(o, i);
      b.spawn(o);
    }
  }

  tracer(from, to, { r = 1, g = 0.86, b = 0.55, ttl = 0.09 } = {}) {
    this.tracers.spawn(from, to, r, g, b, ttl);
  }

  update(dt) {
    this.time += dt;
    for (const b of Object.values(this.batches)) b.update(dt, this.time);
    this.tracers.update(dt);
  }

  get alive() {
    let n = this.tracers.alive;
    for (const b of Object.values(this.batches)) n += b.alive;
    return n;
  }

  get drawCalls() {
    return Object.keys(this.batches).length + 1;
  }

  reset() {
    for (const b of Object.values(this.batches)) b.reset();
    this.tracers.reset();
  }

  dispose() {
    for (const b of Object.values(this.batches)) b.dispose();
    this.batches = {};
    this.tracers.dispose();
  }
}
