import * as THREE from 'three';
import { makeRNG } from '../core/utils.js';
import { SUN_DIR } from '../world/sky.js';

// ===========================================================================
// Pooled CPU particle system.
//  - Two point-sprite pools (additive fire/sparks, alpha smoke/dust) sharing a
//    4-frame procedural texture atlas (soft, fire blob, cauliflower, wisp).
//  - Two velocity-stretched instanced-quad pools (additive streaks for embers
//    and tracer-like debris, alpha streaks for dust/blood).
//  - Per-particle: 3-point color ramp, eased size curve, spin, turbulence,
//    floor bounce, sun-side rim lighting on the smoke pool.
// Public API preserved: constructor(scene), emit(cfg), update(dt).
// ===========================================================================

const MAX_ADDITIVE = 2496;
const MAX_ALPHA = 2176;
const MAX_STREAK_ADD = 640;
const MAX_STREAK_ALPHA = 640; // total capacity 5952 (<= ~6000 budget)

const rng = makeRNG(86420);

// ---------------------------------------------------------------------------
// Textures (each generated once)
// ---------------------------------------------------------------------------

// Atlas quadrants (uv frame index): 0 = soft circle, 1 = turbulent fire blob,
// 2 = dense cauliflower smoke, 3 = wispy dust.
function atlasTexture(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const q = size / 2;
  const r = makeRNG(1123);

  const blob = (cx, cy, rad, a) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rad, 1));
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.55, `rgba(255,255,255,${a * 0.55})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  };

  // --- q0 (top-left): plain soft circle ---
  {
    const cx = q * 0.5, cy = q * 0.5;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, q * 0.46);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.38, 'rgba(255,255,255,0.62)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, q, q);
  }

  // --- q1 (top-right): turbulent fire blob — hot core, ragged licks ---
  {
    const cx = q * 1.5, cy = q * 0.5;
    blob(cx, cy, q * 0.34, 0.95);
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.pow(r(), 1.35) * q * 0.36;
      const rad = q * (0.05 + r() * 0.13) * (1.15 - d / (q * 0.4));
      blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rad, 0.24 + r() * 0.4);
    }
  }

  // --- q2 (bottom-left): dense cauliflower smoke ---
  {
    const cx = q * 0.5, cy = q * 1.5;
    blob(cx, cy, q * 0.3, 0.72);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r() * 0.6;
      const d = q * (0.16 + r() * 0.1);
      blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, q * (0.13 + r() * 0.1), 0.5 + r() * 0.25);
    }
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.pow(r(), 0.8) * q * 0.34;
      blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, q * (0.05 + r() * 0.07), 0.2 + r() * 0.3);
    }
  }

  // --- q3 (bottom-right): wispy dust / haze ---
  {
    const cx = q * 1.5, cy = q * 1.5;
    for (let i = 0; i < 18; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.pow(r(), 0.75) * q * 0.34;
      const bx = cx + Math.cos(a) * d, by = cy + Math.sin(a) * d;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(r() * Math.PI);
      ctx.scale(1.0 + r() * 1.4, 0.55 + r() * 0.4);
      blob(0, 0, q * (0.08 + r() * 0.1), 0.1 + r() * 0.16);
      ctx.restore();
    }
    blob(cx, cy, q * 0.3, 0.3);
  }

  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// Streak: bright round head (right side) with a tapering tail to the left.
function streakTexture(w = 128, h = 64) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const hx = w * 0.78, hy = h * 0.5;
  // tail: shrinking soft blobs marching to the left
  for (let x = hx; x > w * 0.02; x -= 3) {
    const k = x / hx;
    const rad = h * (0.1 + 0.3 * k);
    const a = 0.5 * Math.pow(k, 1.5);
    const g = ctx.createRadialGradient(x, hy, 0, x, hy, rad);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, hy - rad, rad * 2, rad * 2);
  }
  // head
  const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, h * 0.42);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(hx - h * 0.42, hy - h * 0.42, h * 0.84, h * 0.84);
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const pointVert = /* glsl */`
  attribute float aSize;
  attribute vec4 aColor;
  attribute float aSpin;
  attribute float aTex;
  varying vec4 vColor;
  varying float vSpin;
  varying float vTex;
  void main() {
    vColor = aColor;
    vSpin = aSpin;
    vTex = aTex;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (280.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

// Sun-side rim lighting: uSunScreen is the sun direction projected to screen
// space; particles get a lit edge toward the sun and shade opposite (uLitAmp
// enables it — 1 on the smoke pool, 0 on the additive pool).
const pointFrag = /* glsl */`
  uniform sampler2D map;
  uniform vec2 uSunScreen;
  uniform vec3 uSunTint;
  uniform float uLitAmp;
  varying vec4 vColor;
  varying float vSpin;
  varying float vTex;
  void main() {
    vec2 off = gl_PointCoord - 0.5;
    float s = sin(vSpin), c = cos(vSpin);
    vec2 uv = mat2(c, -s, s, c) * off + 0.5;
    uv = clamp(uv, 0.004, 0.996) * 0.5;
    uv += vec2(mod(vTex, 2.0) * 0.5, (1.0 - floor(vTex * 0.5)) * 0.5);
    float texA = texture2D(map, uv).a;
    float side = dot(off, uSunScreen) * 2.4;
    float lit = clamp(side, 0.0, 1.0) * uLitAmp;
    float dk = clamp(-side, 0.0, 1.0) * uLitAmp;
    // Sun kiss scales with the particle's own brightness so black oily
    // smoke stays black while pale dust catches warm light.
    float lum = dot(vColor.rgb, vec3(0.35));
    float kiss = smoothstep(0.05, 0.5, lum);
    vec3 rgb = vColor.rgb * (1.0 + 0.55 * lit) * (1.0 - 0.45 * dk) + uSunTint * lit * lit * 0.22 * kiss * texA;
    gl_FragColor = vec4(rgb, vColor.a * texA);
    if (gl_FragColor.a < 0.003) discard;
  }
`;

const quadVert = /* glsl */`
  attribute vec3 iPos;
  attribute vec3 iVel;
  attribute vec3 iDim; // width, length, seed
  attribute vec4 iColor;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vSeed;
  void main() {
    vColor = iColor;
    vUv = uv;
    vSeed = iDim.z;
    vec4 c = modelViewMatrix * vec4(iPos, 1.0);
    vec3 vv = mat3(modelViewMatrix) * iVel;
    vec2 d2 = vv.xy;
    float dl = length(d2);
    vec2 dir2 = dl > 1e-5 ? d2 / dl : vec2(1.0, 0.0);
    // foreshorten when velocity points into/out of the screen
    float fore = dl / max(length(vv), 1e-5);
    float len = max(iDim.y * fore, iDim.x);
    vec2 perp = vec2(-dir2.y, dir2.x);
    // Taper: full width at the leading end, ~40% at the tail — no wires
    float tp = mix(0.4, 1.0, position.x + 0.5);
    c.xy += dir2 * (position.x * len) + perp * (position.y * iDim.x * tp);
    gl_Position = projectionMatrix * c;
  }
`;

const quadFrag = /* glsl */`
  uniform sampler2D map;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vSeed;
  void main() {
    float a = texture2D(map, vUv).a;
    // Low-frequency alpha erosion along the length: smooth ragged variation
    // (no per-segment dotting — seeds thread continuously through trails).
    float n = sin(vSeed + vUv.x * 2.9) * sin(vSeed * 1.7 + 1.3 + vUv.x * 5.1);
    a *= mix(0.68, 1.05, 0.5 + 0.5 * n);
    // Faint warm/cool gradient across the width (fake sun side)
    vec3 rgb = vColor.rgb * mix(vec3(1.07, 1.02, 0.94), vec3(0.95, 0.965, 1.03), vUv.y);
    gl_FragColor = vec4(rgb, vColor.a * a);
    if (gl_FragColor.a < 0.003) discard;
  }
`;

// ---------------------------------------------------------------------------
// Simulation shared by both pool kinds (no allocations in here)
// ---------------------------------------------------------------------------
function simulate(arr, dt) {
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    const p = arr[i];
    p.age += dt;
    if (p.age >= p.life) continue;
    // Wind is a constant acceleration: older particles have drifted further,
    // which is what bends/shears aged trail sections downwind.
    p.vel.x += p.wx * dt;
    p.vel.y += (p.wy - p.gravity) * dt;
    p.vel.z += p.wz * dt;
    if (p.turb > 0) {
      const ph = p.age * 2.3 + p.seed;
      p.vel.x += Math.sin(ph) * p.turb * dt;
      p.vel.z += Math.cos(ph * 0.77 + 1.3) * p.turb * dt;
      p.vel.y += Math.sin(ph * 0.53 + 2.1) * p.turb * 0.5 * dt;
    }
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
  return w;
}

// Two-segment color ramp + alpha envelope, written straight into a vec4 slot.
function writeColor(p, t, out, i4) {
  const fadeIn = Math.min(1, t / Math.max(p.fadeIn, 1e-4));
  const fadeOut = 1 - Math.max(0, (t - p.fadeOutStart) / (1 - p.fadeOutStart));
  const a = p.alpha * fadeIn * Math.max(0, fadeOut);
  let r, g, b;
  if (p.tm >= 0) {
    if (t < p.tm) {
      const k = t / p.tm;
      r = p.r0 + (p.rm - p.r0) * k; g = p.g0 + (p.gm - p.g0) * k; b = p.b0 + (p.bm - p.b0) * k;
    } else {
      const k = (t - p.tm) / (1 - p.tm);
      r = p.rm + (p.r1 - p.rm) * k; g = p.gm + (p.g1 - p.gm) * k; b = p.bm + (p.b1 - p.bm) * k;
    }
  } else {
    r = p.r0 + (p.r1 - p.r0) * t; g = p.g0 + (p.g1 - p.g0) * t; b = p.b0 + (p.b1 - p.b0) * t;
  }
  out[i4] = r; out[i4 + 1] = g; out[i4 + 2] = b; out[i4 + 3] = a;
}

// ---------------------------------------------------------------------------
// Point-sprite pool
// ---------------------------------------------------------------------------
const _sunView = new THREE.Vector3();

class PointPool {
  constructor(scene, max, { additive, texture, lit, renderOrder }) {
    this.max = max;
    this.particles = [];

    this.geo = new THREE.BufferGeometry();
    this.posArr = new Float32Array(max * 3);
    this.sizeArr = new Float32Array(max);
    this.colorArr = new Float32Array(max * 4);
    this.spinArr = new Float32Array(max);
    this.texArr = new Float32Array(max);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizeArr, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.colorArr, 4).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSpin', new THREE.BufferAttribute(this.spinArr, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aTex', new THREE.BufferAttribute(this.texArr, 1).setUsage(THREE.DynamicDrawUsage));

    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        uSunScreen: { value: new THREE.Vector2(0.7, -0.7) },
        uSunTint: { value: new THREE.Color(1.0, 0.78, 0.55) },
        uLitAmp: { value: lit },
      },
      vertexShader: pointVert,
      fragmentShader: pointFrag,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = renderOrder;
    if (lit > 0) {
      const uniform = this.mat.uniforms.uSunScreen.value;
      this.points.onBeforeRender = (renderer, sc, camera) => {
        _sunView.copy(SUN_DIR).transformDirection(camera.matrixWorldInverse);
        const l = Math.hypot(_sunView.x, _sunView.y);
        if (l > 1e-4) uniform.set(_sunView.x / l, -_sunView.y / l);
      };
    }
    scene.add(this.points);
  }

  spawn(p) {
    if (this.particles.length >= this.max) this.particles.shift();
    this.particles.push(p);
  }

  update(dt) {
    const arr = this.particles;
    const w = simulate(arr, dt);
    for (let i = 0; i < w; i++) {
      const p = arr[i];
      const t = p.age / p.life;
      const i3 = i * 3;
      this.posArr[i3] = p.pos.x; this.posArr[i3 + 1] = p.pos.y; this.posArr[i3 + 2] = p.pos.z;
      const st = p.ease === 1 ? t : Math.pow(t, p.ease);
      this.sizeArr[i] = p.size0 + (p.size1 - p.size0) * st;
      writeColor(p, t, this.colorArr, i * 4);
      this.spinArr[i] = p.spin;
      this.texArr[i] = p.tex;
    }
    this.geo.setDrawRange(0, w);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSpin.needsUpdate = true;
    this.geo.attributes.aTex.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// Velocity-stretched instanced-quad pool (embers, debris streaks, blood, dust)
// ---------------------------------------------------------------------------
class QuadPool {
  constructor(scene, max, { additive, texture, renderOrder }) {
    this.max = max;
    this.particles = [];

    const base = new THREE.PlaneGeometry(1, 1);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.attributes.position);
    this.geo.setAttribute('uv', base.attributes.uv);
    this.posArr = new Float32Array(max * 3);
    this.velArr = new Float32Array(max * 3);
    this.dimArr = new Float32Array(max * 3);
    this.colorArr = new Float32Array(max * 4);
    this.geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(this.posArr, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('iVel', new THREE.InstancedBufferAttribute(this.velArr, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('iDim', new THREE.InstancedBufferAttribute(this.dimArr, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('iColor', new THREE.InstancedBufferAttribute(this.colorArr, 4).setUsage(THREE.DynamicDrawUsage));
    this.geo.instanceCount = 0;

    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: texture } },
      vertexShader: quadVert,
      fragmentShader: quadFrag,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder;
    scene.add(this.mesh);
  }

  spawn(p) {
    if (this.particles.length >= this.max) this.particles.shift();
    this.particles.push(p);
  }

  update(dt) {
    const arr = this.particles;
    const w = simulate(arr, dt);
    for (let i = 0; i < w; i++) {
      const p = arr[i];
      const t = p.age / p.life;
      const i3 = i * 3;
      this.posArr[i3] = p.pos.x; this.posArr[i3 + 1] = p.pos.y; this.posArr[i3 + 2] = p.pos.z;
      this.velArr[i3] = p.vel.x; this.velArr[i3 + 1] = p.vel.y; this.velArr[i3 + 2] = p.vel.z;
      const st = p.ease === 1 ? t : Math.pow(t, p.ease);
      const width = p.size0 + (p.size1 - p.size0) * st;
      const speed = Math.hypot(p.vel.x, p.vel.y, p.vel.z);
      this.dimArr[i3] = width;
      this.dimArr[i3 + 1] = Math.min(speed * p.stretch, p.lenMax);
      this.dimArr[i3 + 2] = p.seed;
      writeColor(p, t, this.colorArr, i * 4);
    }
    this.geo.instanceCount = w;
    this.geo.attributes.iPos.needsUpdate = true;
    this.geo.attributes.iVel.needsUpdate = true;
    this.geo.attributes.iDim.needsUpdate = true;
    this.geo.attributes.iColor.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// Facade
// ---------------------------------------------------------------------------
export class ParticleSystem {
  constructor(scene) {
    const atlas = atlasTexture();
    const streak = streakTexture();
    this.smokePool = new PointPool(scene, MAX_ALPHA, { additive: false, texture: atlas, lit: 1, renderOrder: 19 });
    this.additivePool = new PointPool(scene, MAX_ADDITIVE, { additive: true, texture: atlas, lit: 0, renderOrder: 20 });
    this.streakAlphaPool = new QuadPool(scene, MAX_STREAK_ALPHA, { additive: false, texture: streak, renderOrder: 18 });
    this.streakAddPool = new QuadPool(scene, MAX_STREAK_ADD, { additive: true, texture: streak, renderOrder: 21 });
  }

  /**
   * Generic emit. cfg:
   *  pos, count, vel (base THREE.Vector3), spread (box jitter), spreadY,
   *  sphere:[min,max] (random 3D radial speed), radial:[min,max] (horizontal
   *  ring speed), life:[min,max], size:[s0,s1], sizeEase (pow exponent),
   *  color0/colorMid/color1 (THREE.Color), midT, alpha, gravity, drag,
   *  additive(bool), fadeIn, fadeOutStart, floor, spinVel, turb,
   *  wind (THREE.Vector3 acceleration — shears aged trails downwind),
   *  tex (0 soft, 1 fire, 2 smoke, 3 wisp),
   *  stretch (velocity->length factor; routes to streak pools), lenMax.
   */
  emit(cfg) {
    const stretched = cfg.stretch !== undefined;
    const pool = stretched
      ? (cfg.additive ? this.streakAddPool : this.streakAlphaPool)
      : (cfg.additive ? this.additivePool : this.smokePool);
    const c0 = cfg.color0, c1 = cfg.color1 ?? cfg.color0, cm = cfg.colorMid;
    const tex = cfg.tex ?? (cfg.additive ? 0 : 2);
    const spread = cfg.spread ?? 0;
    for (let i = 0; i < cfg.count; i++) {
      const vel = cfg.vel ? cfg.vel.clone() : new THREE.Vector3();
      if (cfg.sphere) {
        const z = rng() * 2 - 1, a = rng() * Math.PI * 2;
        const rr = Math.sqrt(Math.max(0, 1 - z * z));
        const sp = cfg.sphere[0] + rng() * (cfg.sphere[1] - cfg.sphere[0]);
        vel.x += rr * Math.cos(a) * sp; vel.y += z * sp; vel.z += rr * Math.sin(a) * sp;
      }
      if (cfg.radial) {
        const a = rng() * Math.PI * 2;
        const sp = cfg.radial[0] + rng() * (cfg.radial[1] - cfg.radial[0]);
        vel.x += Math.cos(a) * sp; vel.z += Math.sin(a) * sp;
      }
      vel.x += (rng() - 0.5) * 2 * spread;
      vel.y += (rng() - 0.5) * 2 * spread * (cfg.spreadY ?? 1);
      vel.z += (rng() - 0.5) * 2 * spread;
      const life = cfg.life[0] + rng() * (cfg.life[1] - cfg.life[0]);
      const sizeJitter = 0.75 + rng() * 0.5;
      const p = {
        pos: cfg.pos.clone().add(new THREE.Vector3(
          (rng() - 0.5) * (cfg.posJitter ?? 0),
          (rng() - 0.5) * (cfg.posJitter ?? 0),
          (rng() - 0.5) * (cfg.posJitter ?? 0)
        )),
        vel,
        age: 0, life,
        size0: cfg.size[0] * sizeJitter, size1: cfg.size[1] * sizeJitter,
        ease: cfg.sizeEase ?? 1,
        r0: c0.r, g0: c0.g, b0: c0.b,
        r1: c1.r, g1: c1.g, b1: c1.b,
        rm: cm ? cm.r : 0, gm: cm ? cm.g : 0, bm: cm ? cm.b : 0,
        tm: cm ? (cfg.midT ?? 0.35) : -1,
        alpha: cfg.alpha ?? 1,
        gravity: cfg.gravity ?? 0,
        drag: cfg.drag ?? 0,
        fadeIn: cfg.fadeIn ?? 0.05,
        fadeOutStart: cfg.fadeOutStart ?? 0.6,
        floor: cfg.floor,
        spin: rng() * Math.PI * 2,
        spinVel: (rng() - 0.5) * (cfg.spinVel ?? 1.4),
        turb: cfg.turb ?? 0,
        wx: cfg.wind ? cfg.wind.x : 0,
        wy: cfg.wind ? cfg.wind.y : 0,
        wz: cfg.wind ? cfg.wind.z : 0,
        // cfg.seed lets emitters thread a smoothly-increasing phase through
        // consecutive trail segments so shader noise stays continuous.
        seed: cfg.seed ?? rng() * 6.2832,
        tex,
        stretch: cfg.stretch ?? 0,
        lenMax: cfg.lenMax ?? 1e3,
      };
      pool.spawn(p);
    }
  }

  update(dt) {
    this.smokePool.update(dt);
    this.additivePool.update(dt);
    this.streakAlphaPool.update(dt);
    this.streakAddPool.update(dt);
  }
}
