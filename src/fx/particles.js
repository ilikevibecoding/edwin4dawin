import * as THREE from 'three';
import { makeRNG } from '../core/utils.js';

// ===========================================================================
// Pooled CPU particle system rendered as THREE.Points with a custom shader.
// Two pools: additive (fire/sparks/flash) and alpha-blended (smoke/dust).
// Per-particle: position, velocity, life, size curve, color curve, spin.
// ===========================================================================

const MAX_ADDITIVE = 4096;
const MAX_ALPHA = 4096;

const rng = makeRNG(86420);

function softCircleTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  return t;
}

function smokeTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const r = makeRNG(555);
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 42; i++) {
    const x = size / 2 + (r() - 0.5) * size * 0.55;
    const y = size / 2 + (r() - 0.5) * size * 0.55;
    const rad = size * (0.08 + r() * 0.16);
    const dist = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
    const a = Math.max(0, 0.16 * (1 - dist));
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(c);
}

const vert = /* glsl */`
  attribute float aSize;
  attribute vec4 aColor;
  attribute float aSpin;
  varying vec4 vColor;
  varying float vSpin;
  void main() {
    vColor = aColor;
    vSpin = aSpin;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (280.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const frag = /* glsl */`
  uniform sampler2D map;
  varying vec4 vColor;
  varying float vSpin;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float s = sin(vSpin), c = cos(vSpin);
    uv = mat2(c, -s, s, c) * uv + 0.5;
    vec4 tex = texture2D(map, uv);
    gl_FragColor = vec4(vColor.rgb, vColor.a) * tex;
    if (gl_FragColor.a < 0.003) discard;
  }
`;

class Pool {
  constructor(scene, max, { additive, texture, fog = true }) {
    this.max = max;
    this.count = 0;
    this.particles = []; // JS-side sim state

    this.geo = new THREE.BufferGeometry();
    this.posArr = new Float32Array(max * 3);
    this.sizeArr = new Float32Array(max);
    this.colorArr = new Float32Array(max * 4);
    this.spinArr = new Float32Array(max);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizeArr, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.colorArr, 4).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSpin', new THREE.BufferAttribute(this.spinArr, 1).setUsage(THREE.DynamicDrawUsage));

    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: texture } },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 20 : 19;
    scene.add(this.points);
  }

  spawn(p) {
    if (this.particles.length >= this.max) this.particles.shift();
    this.particles.push(p);
  }

  update(dt) {
    const arr = this.particles;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      p.age += dt;
      if (p.age >= p.life) continue;
      // integrate
      p.vel.y -= p.gravity * dt;
      p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.pos.addScaledVector(p.vel, dt);
      if (p.floor !== undefined && p.pos.y < p.floor) {
        p.pos.y = p.floor;
        p.vel.y = Math.abs(p.vel.y) * 0.3;
        p.vel.x *= 0.6; p.vel.z *= 0.6;
      }
      p.spin += p.spinVel * dt;
      arr[w++] = p;
    }
    arr.length = w;

    for (let i = 0; i < w; i++) {
      const p = arr[i];
      const t = p.age / p.life;
      const i3 = i * 3, i4 = i * 4;
      this.posArr[i3] = p.pos.x; this.posArr[i3 + 1] = p.pos.y; this.posArr[i3 + 2] = p.pos.z;
      this.sizeArr[i] = p.size0 + (p.size1 - p.size0) * t;
      const fadeIn = Math.min(1, t / Math.max(p.fadeIn, 1e-4));
      const fadeOut = 1 - Math.max(0, (t - p.fadeOutStart) / (1 - p.fadeOutStart));
      const a = p.alpha * fadeIn * Math.max(0, fadeOut);
      this.colorArr[i4] = p.r0 + (p.r1 - p.r0) * t;
      this.colorArr[i4 + 1] = p.g0 + (p.g1 - p.g0) * t;
      this.colorArr[i4 + 2] = p.b0 + (p.b1 - p.b0) * t;
      this.colorArr[i4 + 3] = a;
      this.spinArr[i] = p.spin;
    }
    this.geo.setDrawRange(0, w);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSpin.needsUpdate = true;
  }
}

export class ParticleSystem {
  constructor(scene) {
    this.additive = new Pool(scene, MAX_ADDITIVE, { additive: true, texture: softCircleTexture() });
    this.smoke = new Pool(scene, MAX_ALPHA, { additive: false, texture: smokeTexture() });
  }

  /**
   * Generic emit. cfg:
   *  pos, count, vel (base), spread (scalar), life[min,max], size:[s0,s1],
   *  color0/color1 (THREE.Color), alpha, gravity, drag, additive(bool),
   *  fadeIn, fadeOutStart, floor, spinVel
   */
  emit(cfg) {
    const pool = cfg.additive ? this.additive : this.smoke;
    const c0 = cfg.color0, c1 = cfg.color1 ?? cfg.color0;
    for (let i = 0; i < cfg.count; i++) {
      const vel = cfg.vel ? cfg.vel.clone() : new THREE.Vector3();
      vel.x += (rng() - 0.5) * 2 * cfg.spread;
      vel.y += (rng() - 0.5) * 2 * cfg.spread * (cfg.spreadY ?? 1);
      vel.z += (rng() - 0.5) * 2 * cfg.spread;
      const life = cfg.life[0] + rng() * (cfg.life[1] - cfg.life[0]);
      const sizeJitter = 0.75 + rng() * 0.5;
      pool.spawn({
        pos: cfg.pos.clone().add(new THREE.Vector3(
          (rng() - 0.5) * (cfg.posJitter ?? 0),
          (rng() - 0.5) * (cfg.posJitter ?? 0),
          (rng() - 0.5) * (cfg.posJitter ?? 0)
        )),
        vel,
        age: 0, life,
        size0: cfg.size[0] * sizeJitter, size1: cfg.size[1] * sizeJitter,
        r0: c0.r, g0: c0.g, b0: c0.b,
        r1: c1.r, g1: c1.g, b1: c1.b,
        alpha: cfg.alpha ?? 1,
        gravity: cfg.gravity ?? 0,
        drag: cfg.drag ?? 0,
        fadeIn: cfg.fadeIn ?? 0.05,
        fadeOutStart: cfg.fadeOutStart ?? 0.6,
        floor: cfg.floor,
        spin: rng() * Math.PI * 2,
        spinVel: (rng() - 0.5) * (cfg.spinVel ?? 1.4),
      });
    }
  }

  update(dt) {
    this.additive.update(dt);
    this.smoke.update(dt);
  }
}
