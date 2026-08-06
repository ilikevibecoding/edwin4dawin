// Effects: contrails, launch plumes, explosions, shockwaves, debris, sparks,
// ground dust, ambient motes and scorch decals. Everything is pooled and drawn
// through a small number of batched systems: one instanced-quad system per
// sprite sheet (smoke, dust, fire, sparks, rings, decals), one merged geometry
// for every ribbon, one instanced mesh for every debris shard.
//
// The whole layer is eight draw calls regardless of how much is on screen.
import * as THREE from 'three';
import { Pool } from './core/pool.js';
import * as T from './core/textures.js';
import { Noise2D } from './core/rng.js';
import { densityRatio } from './physics.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _side = new THREE.Vector3();
const _prevSide = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _view = new THREE.Vector3();

const TAU = Math.PI * 2;

// Emission colours live well above 1.0 on purpose: the frame is tone mapped
// with ACES at roughly 0.4 exposure, so a "white hot" core has to be deep into
// HDR before it clips to white and trips the bloom threshold.
const UP = new THREE.Vector3(0, 1, 0);
const WHITE = { r: 1, g: 1, b: 1 };
const FLASH_KILL = { r: 16, g: 15.2, b: 12.5 };
const FLASH_KILL_END = { r: 7.0, g: 5.6, b: 3.4 };
const FLASH_LAUNCH = { r: 6.5, g: 4.6, b: 2.3 };
const FLASH_IMPACT = { r: 8.0, g: 5.4, b: 2.4 };
const FIRE_CORE = { r: 5.2, g: 3.5, b: 1.5 };
const FIRE_HOT = { r: 2.6, g: 1.5, b: 0.52 };
const FIRE_COOL = { r: 1.15, g: 0.35, b: 0.09 };
const FIRE_DIRTY = { r: 0.72, g: 0.19, b: 0.05 };
const SPARK_WHITE = { r: 5.0, g: 4.2, b: 2.6 };
const SPARK_HOT = { r: 3.4, g: 2.1, b: 0.75 };
const SPARK_COOL = { r: 1.5, g: 0.42, b: 0.1 };
const FLARE_HOT = { r: 6.0, g: 5.2, b: 3.4 };
const FLARE_COOL = { r: 2.4, g: 1.0, b: 0.3 };
const RING_WARM = { r: 2.4, g: 2.0, b: 1.35 };
// Barely cool rather than actually blue: an additive ring this large lays a
// wash over the whole cloud, and a saturated blue one fringes it violet.
const RING_COLD = { r: 2.75, g: 2.9, b: 3.1 };

// Haze is a ground phenomenon: fade the fog contribution out with altitude so
// a contrail at 20 km is not washed out like a mountain 20 km downrange.
const FOG_HEIGHT_FALLOFF = 0.0004;

function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function smoothstep(e0, e1, x) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
// Procedural sprite sheets. Nothing is loaded: every particle texture is
// painted here once and cached. Smoke/dust/fire are 2x2 atlases so a single
// batched system can draw four different silhouettes and the repetition that
// gives billboard smoke away disappears.
// ---------------------------------------------------------------------------

const _texCache = new Map();

function fxTexture(key, build) {
  let t = _texCache.get(key);
  if (!t) {
    t = build();
    _texCache.set(key, t);
  }
  return t;
}

function fxCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d', { willReadFrequently: true }) };
}

/**
 * Wrap a canvas as a texture. Particle sprites are tagged NoColorSpace: their
 * RGB is a linear multiplier baked with soft shading, not an authored colour.
 */
function fxFinish(c) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * One lumpy smoke puff painted into `d` at cell (cx, cy) of a 2x2 atlas.
 * The silhouette is warped by low-frequency noise, the interior broken up by a
 * second octave set, and a cheap fake-volumetric shade term is baked into RGB
 * so a flat billboard still reads as a ball of smoke.
 */
function paintPuff(d, S, cx, cy, seed, {
  softness = 0.42, lumpiness = 0.34, detail = 3.1, shadeLo = 0.34, shadeHi = 0.78,
  density = 1.0, grain = 0.16,
} = {}) {
  const half = S / 2;
  const n1 = new Noise2D(seed);
  const n2 = new Noise2D(seed * 7 + 13);
  const ox = cx * S;
  const oy = cy * S;
  const W = S * 2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5 - half) / half;
      const dy = (y + 0.5 - half) / half;
      const r = Math.hypot(dx, dy);
      const warp = n1.fbm(dx * 1.55 + 5.5, dy * 1.55 + 5.5, 4);
      const rr = r * (1 + warp * lumpiness);
      let a = smoothstep(1.0, softness, rr);
      const t = n2.fbm(dx * detail + 2.3, dy * detail + 2.3, 5) * 0.5 + 0.5;
      a *= (1 - grain) + t * grain * 2.6;
      a = clamp01(a) * density;
      // fake sphere normal so the lighting term has some body to it
      const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, rr * rr)));
      const lam = Math.max(0, -dx * 0.5 - dy * 0.66 + nz * 0.62);
      const shade = clamp01(shadeLo + shadeHi * lam + (t - 0.5) * 0.18);
      const v = shade * 255;
      const i = ((oy + y) * W + (ox + x)) * 4;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = a * 255;
    }
  }
}

/** 2x2 atlas of rolling exhaust-smoke puffs. */
function smokeAtlas() {
  return fxTexture('fx_smoke', () => {
    const S = 128;
    const { c, ctx } = fxCanvas(S * 2);
    const img = ctx.createImageData(S * 2, S * 2);
    const d = img.data;
    paintPuff(d, S, 0, 0, 811, { lumpiness: 0.32, detail: 2.7 });
    paintPuff(d, S, 1, 0, 1493, { lumpiness: 0.42, detail: 3.4, softness: 0.36 });
    paintPuff(d, S, 0, 1, 2687, { lumpiness: 0.26, detail: 3.9, softness: 0.5, density: 0.94 });
    paintPuff(d, S, 1, 1, 3931, { lumpiness: 0.46, detail: 2.3, softness: 0.3, density: 0.88 });
    ctx.putImageData(img, 0, 0);
    return fxFinish(c);
  });
}

/** 2x2 atlas of gritty, wispier ground-dust puffs. */
function dustAtlas() {
  return fxTexture('fx_dust', () => {
    const S = 128;
    const { c, ctx } = fxCanvas(S * 2);
    const img = ctx.createImageData(S * 2, S * 2);
    const d = img.data;
    const o = { softness: 0.12, lumpiness: 0.5, detail: 4.6, shadeLo: 0.46, shadeHi: 0.6, grain: 0.3 };
    paintPuff(d, S, 0, 0, 5101, { ...o, density: 0.82 });
    paintPuff(d, S, 1, 0, 6217, { ...o, detail: 5.8, density: 0.7 });
    paintPuff(d, S, 0, 1, 7333, { ...o, lumpiness: 0.62, density: 0.76 });
    paintPuff(d, S, 1, 1, 8419, { ...o, detail: 3.6, softness: 0.2, density: 0.66 });
    ctx.putImageData(img, 0, 0);
    return fxFinish(c);
  });
}

/**
 * 2x2 atlas of hot blobs for additive fire. RGB stays near white so the
 * particle's own colour ramp controls temperature; the alpha carries the
 * turbulent shape.
 */
function fireAtlas() {
  return fxTexture('fx_fire', () => {
    const S = 128;
    const half = S / 2;
    const { c, ctx } = fxCanvas(S * 2);
    const img = ctx.createImageData(S * 2, S * 2);
    const d = img.data;
    const W = S * 2;
    const seeds = [317, 929, 1601, 2311];
    for (let cell = 0; cell < 4; cell++) {
      const cx = cell % 2;
      const cy = cell >> 1;
      const n1 = new Noise2D(seeds[cell]);
      const n2 = new Noise2D(seeds[cell] * 3 + 7);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const dx = (x + 0.5 - half) / half;
          const dy = (y + 0.5 - half) / half;
          const r = Math.hypot(dx, dy);
          const warp = n1.fbm(dx * 1.9 + 3, dy * 1.9 + 3, 4);
          const rr = r * (1 + warp * 0.3);
          let a = Math.pow(Math.max(0, 1 - rr), 1.9);
          const t = n2.fbm(dx * 3.6 + 9, dy * 3.6 + 9, 4) * 0.5 + 0.5;
          a *= 0.45 + t * 1.05;
          // a compact incandescent core inside the turbulence
          a += Math.pow(Math.max(0, 1 - r * 2.3), 3.0) * 0.85;
          a = clamp01(a);
          const core = Math.pow(Math.max(0, 1 - r * 1.5), 2.0);
          const i = ((cy * S + y) * W + (cx * S + x)) * 4;
          d[i] = 255;
          d[i + 1] = (206 + core * 49) | 0;
          d[i + 2] = (150 + core * 105) | 0;
          d[i + 3] = a * 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return fxFinish(c);
  });
}

/** Tight ember glow; the shader stretches it along the velocity into a streak. */
function emberTexture() {
  return fxTexture('fx_ember', () => {
    const S = 64;
    const { c, ctx } = fxCanvas(S);
    // The opaque core has to be a decent fraction of the quad. Sparks get
    // stretched along their velocity, and a pinprick core turns into a
    // sub-pixel line that pixel coverage erases completely.
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.27, 'rgba(255,250,236,0.92)');
    g.addColorStop(0.5, 'rgba(255,226,178,0.38)');
    g.addColorStop(0.76, 'rgba(255,188,120,0.08)');
    g.addColorStop(1, 'rgba(255,160,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return fxFinish(c);
  });
}

/** Expanding blast ring: a thin bright annulus with a faint inner wash. */
function ringTexture() {
  return fxTexture('fx_ring', () => {
    const S = 256;
    const half = S / 2;
    const { c, ctx } = fxCanvas(S);
    const img = ctx.createImageData(S, S);
    const d = img.data;
    const n = new Noise2D(4441);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = (x + 0.5 - half) / half;
        const dy = (y + 0.5 - half) / half;
        const r = Math.hypot(dx, dy);
        // break the perfect circle so it never reads as vector art
        const wob = n.fbm(dx * 2.2 + 11, dy * 2.2 + 11, 3) * 0.045;
        const rr = r + wob;
        let a = Math.pow(Math.max(0, 1 - Math.abs(rr - 0.80) / 0.19), 2.4);
        a += Math.max(0, 1 - rr / 0.80) * 0.055;
        a *= smoothstep(1.0, 0.9, rr);
        const i = (y * S + x) * 4;
        const warm = clamp01(1 - Math.abs(rr - 0.72) / 0.4);
        d[i] = 255;
        d[i + 1] = (232 + warm * 23) | 0;
        d[i + 2] = (200 + warm * 55) | 0;
        d[i + 3] = clamp01(a) * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return fxFinish(c);
  });
}

/**
 * Ribbon cross-section. V runs across the ribbon (soft aerofoil profile with a
 * denser core), U runs along it with a slow density variation so a long
 * contrail breaks into puffs instead of reading as a painted stripe.
 */
function ribbonTexture() {
  return fxTexture('fx_ribbon', () => {
    const S = 64;
    const { c, ctx } = fxCanvas(S);
    const img = ctx.createImageData(S, S);
    const d = img.data;
    const n = new Noise2D(1777);
    for (let y = 0; y < S; y++) {
      // y is across the ribbon after flipY, x is along it
      const v = (y + 0.5) / S;
      const across = Math.abs(v - 0.5) * 2;
      // a soft gaussian-ish core: a hard-shouldered profile clips to flat white
      // across the whole width and the ribbon reads as a cut-out blade
      const profile = Math.exp(-across * across * 3.1) - 0.045;
      for (let x = 0; x < S; x++) {
        const u = (x + 0.5) / S;
        // tile seamlessly along u by sampling noise on a circle
        const ang = u * TAU;
        const along = n.fbm(Math.cos(ang) * 1.9 + 3, Math.sin(ang) * 1.9 + 3, 3) * 0.5 + 0.5;
        // break the edges up with a second, higher-frequency band so the
        // silhouette frays instead of running dead straight
        const edge = n.fbm(Math.cos(ang) * 4.7 + 11, Math.sin(ang) * 4.7 + 11, 3) * 0.5 + 0.5;
        const frill = 1 - across * across * (0.55 + edge * 0.85);
        const a = profile * frill * (0.6 + along * 0.66) * (0.84 + 0.16 * edge);
        const i = (y * S + x) * 4;
        const v255 = (214 + along * 41) | 0;
        d[i] = v255;
        d[i + 1] = v255;
        d[i + 2] = v255;
        d[i + 3] = clamp01(a) * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = fxFinish(c);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  });
}

// ---------------------------------------------------------------------------
// Billboard particle system (one draw call for every soft particle it owns)
// ---------------------------------------------------------------------------

const PARTICLE_VS = /* glsl */`
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute vec3 iPos;
  attribute vec4 iColor;
  attribute vec4 iMisc; // x: size, y: rotation, z: ground-flat flag, w: atlas cell
  attribute float iFloor; // world height of the ground under this particle
  #ifdef STRETCH
    attribute vec4 iVel; // xyz: world velocity, w: stretch per unit speed
  #endif
  varying vec4 vColor;
  varying vec2 vUv;
  varying float vFogDepth;
  varying float vHeight;
  varying float vGround;
  varying float vNear;
  uniform vec2 uNearFade;

  /**
   * How far this corner sits above the ground, in units of the particle's own
   * size. A camera-facing quad whose lower half is below the terrain gets
   * sliced by the depth test along a dead straight line, which is the single
   * most obvious artefact in any shot with smoke lying on the pad. Fading the
   * corner out before it reaches the ground turns that cut into contact.
   * The offset is applied in view space, so the world rise of a corner is its
   * screen offset projected onto the world up axis, which is the second row of
   * the view rotation.
   */
  float groundFade(vec2 off, float size) {
    float worldY = iPos.y + off.x * viewMatrix[1][0] + off.y * viewMatrix[1][1];
    return clamp((worldY - iFloor) / max(size * 0.5, 0.35), 0.0, 1.0);
  }

  void main() {
    vColor = iColor;
    vHeight = iPos.y;
    vGround = 1.0;
    #ifdef ATLAS2
      vec2 cell = vec2(mod(iMisc.w, 2.0), floor(iMisc.w * 0.5));
      vUv = (uv + cell) * 0.5;
    #else
      vUv = uv;
    #endif
    float s = iMisc.x;
    vec4 mv;
    if (iMisc.z > 0.5) {
      // lies flat on the ground plane: dust rings, blast rings, scorch decals
      float r = iMisc.y;
      float cr = cos(r);
      float sr = sin(r);
      vec2 q = vec2(position.x * cr - position.y * sr, position.x * sr + position.y * cr) * s;
      mv = modelViewMatrix * vec4(iPos + vec3(q.x, 0.0, -q.y), 1.0);
    } else {
      mv = modelViewMatrix * vec4(iPos, 1.0);
      #ifdef STRETCH
        // Elongate along the screen-space velocity so fast sparks streak.
        // The bias keeps the normalisation defined for a stationary particle:
        // a select on a 0/0 division still lets the NaN through on some
        // drivers and the whole batch vanishes.
        // The perpendicular is (ay, -ax) and not (-ay, ax): the latter is a
        // mirrored basis, which reverses the quad's winding and hands the
        // whole batch to the backface cull.
        vec2 vd = (modelViewMatrix * vec4(iVel.xyz, 0.0)).xy;
        float dl = length(vd);
        vec2 ax = (vd + vec2(0.0, 1e-5)) / (dl + 1e-5);
        vec2 off = vec2(ax.y, -ax.x) * (position.x * s)
                 + ax * (position.y * s * (1.0 + iVel.w * dl));
        mv.xy += off;
        vGround = groundFade(off, s);
      #else
        float r = iMisc.y;
        float cr = cos(r);
        float sr = sin(r);
        vec2 off = vec2(position.x * cr - position.y * sr, position.x * sr + position.y * cr) * s;
        mv.xy += off;
        vGround = groundFade(off, s);
      #endif
    }
    vFogDepth = -mv.z;
    // Near-camera fade. These puffs are tens to hundreds of metres across, so
    // the view can end up *inside* one - and a camera-facing quad seen from
    // inside covers the entire frame as an opaque wall. Fading a particle out
    // as it approaches the near plane keeps a plume readable when the player is
    // standing in it, which is exactly where a launch is watched from.
    vNear = smoothstep(uNearFade.x, uNearFade.y, vFogDepth);
    gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
  }
`;

const PARTICLE_FS = /* glsl */`
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D map;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uFogAmount;
  uniform float uFogHeight;
  varying vec4 vColor;
  varying vec2 vUv;
  varying float vFogDepth;
  varying float vHeight;
  varying float vGround;
  varying float vNear;

  void main() {
    #include <logdepthbuf_fragment>
    vec4 t = texture2D(map, vUv);
    float a = vColor.a * t.a * vGround * vNear;
    if (a < 0.004) discard;
    vec3 c = vColor.rgb * t.rgb;
    float fd = uFogDensity * vFogDepth;
    float fog = (1.0 - exp(-fd * fd)) * exp(-max(vHeight, 0.0) * uFogHeight);
    #ifdef ADDITIVE
      a *= 1.0 - fog * uFogAmount;
    #else
      c = mix(c, uFogColor, fog * uFogAmount);
    #endif
    gl_FragColor = vec4(c, a);
  }
`;

class BillboardParticles {
  constructor(capacity, texture, {
    additive = false, stretch = false, atlas = false, renderOrder = 10,
    fogAmount = 1, depthWrite = false, polygonOffset = 0,
  } = {}) {
    this.capacity = capacity;
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    this.iPos = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.iColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.iMisc = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.iFloor = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    this.iPos.setUsage(THREE.DynamicDrawUsage);
    this.iColor.setUsage(THREE.DynamicDrawUsage);
    this.iMisc.setUsage(THREE.DynamicDrawUsage);
    this.iFloor.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', this.iPos);
    geo.setAttribute('iColor', this.iColor);
    geo.setAttribute('iMisc', this.iMisc);
    geo.setAttribute('iFloor', this.iFloor);
    this.stretched = stretch;
    if (stretch) {
      this.iVel = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
      this.iVel.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('iVel', this.iVel);
    }
    geo.instanceCount = 0;
    this.geometry = geo;

    const defines = {};
    if (additive) defines.ADDITIVE = '';
    if (stretch) defines.STRETCH = '';
    if (atlas) defines.ATLAS2 = '';
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        uFogColor: { value: new THREE.Color(0x9fb4c8) },
        uFogDensity: { value: 0 },
        uFogAmount: { value: fogAmount },
        uFogHeight: { value: FOG_HEIGHT_FALLOFF },
        // fully transparent within 3 m of the eye, fully opaque past 26 m
        uNearFade: { value: new THREE.Vector2(3, 26) },
      },
      vertexShader: PARTICLE_VS,
      fragmentShader: PARTICLE_FS,
      transparent: true,
      depthWrite,
      depthTest: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      defines,
    });
    if (polygonOffset) {
      this.material.polygonOffset = true;
      this.material.polygonOffsetFactor = polygonOffset;
      this.material.polygonOffsetUnits = polygonOffset;
    }
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder;

    // particle state (structure of arrays; nothing here ever allocates)
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
    this.sizeExp = new Float32Array(capacity);
    this.rot = new Float32Array(capacity);
    this.rotVel = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.turb = new Float32Array(capacity);
    this.phase = new Float32Array(capacity);
    this.wind = new Float32Array(capacity);
    this.cell = new Float32Array(capacity);
    this.flat = new Float32Array(capacity);
    this.stretch = new Float32Array(capacity);
    this.floorY = new Float32Array(capacity);
    this.c0 = new Float32Array(capacity * 3);
    this.c1 = new Float32Array(capacity * 3);
    this.alpha0 = new Float32Array(capacity);
    this.fadeIn = new Float32Array(capacity);
    this.fadeExp = new Float32Array(capacity);
    this.live = new Uint8Array(capacity);
    this.freeList = [];
    for (let i = capacity - 1; i >= 0; i--) this.freeList.push(i);
    this.liveCount = 0;
    // Quality tiers trade particle count for per-particle opacity. Compensating
    // with size instead would cancel the saving, because fill cost is the sum of
    // particle areas - opacity is free.
    this.alphaScale = 1;
    this.lifeScale = 1;
    this.drawn = 0;
  }

  spawn(x, y, z, o) {
    let i = this.freeList.pop();
    if (i === undefined) {
      if (!o.recycle) return -1;
      i = this._oldest();
      if (i < 0) return -1;
      this.live[i] = 0;
      this.liveCount--;
    }
    this.live[i] = 1;
    this.liveCount++;
    this.px[i] = x;
    this.py[i] = y;
    this.pz[i] = z;
    const v = o.vel;
    this.vx[i] = v ? v.x : 0;
    this.vy[i] = v ? v.y : 0;
    this.vz[i] = v ? v.z : 0;
    this.age[i] = 0;
    // lifeScale bounds how long smoke lingers. Without it, six launches over a
    // compact site leave enough long-lived, very large puffs to blanket the whole
    // sky, which destroys readability far more than it adds atmosphere.
    this.life[i] = (o.life ?? 1) * this.lifeScale;
    this.size0[i] = o.size0 ?? 1;
    this.size1[i] = o.size1 ?? this.size0[i] * 2;
    this.sizeExp[i] = o.sizeExp ?? 1;
    this.rot[i] = o.rot ?? 0;
    this.rotVel[i] = o.rotVel ?? 0;
    this.drag[i] = o.drag ?? 0.6;
    this.grav[i] = o.grav ?? 0;
    this.turb[i] = o.turb ?? 0;
    this.phase[i] = o.phase ?? 0;
    this.wind[i] = o.wind ?? 0;
    this.cell[i] = o.cell ?? 0;
    this.flat[i] = o.flat ? 1 : 0;
    this.stretch[i] = o.stretch ?? 0;
    this.floorY[i] = o.floorY ?? -1e9;
    const a = o.color0 || WHITE;
    const b = o.color1 || a;
    const k = i * 3;
    this.c0[k] = a.r;
    this.c0[k + 1] = a.g;
    this.c0[k + 2] = a.b;
    this.c1[k] = b.r;
    this.c1[k + 1] = b.g;
    this.c1[k + 2] = b.b;
    this.alpha0[i] = Math.min(0.96, (o.alpha ?? 1) * this.alphaScale);
    this.fadeIn[i] = o.fadeIn ?? 0.08;
    this.fadeExp[i] = o.fadeExp ?? 1.4;
    return i;
  }

  /** Index of the live particle closest to the end of its life. */
  _oldest() {
    let best = -1;
    let bestT = -1;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.live[i]) continue;
      const t = this.age[i] / this.life[i];
      if (t > bestT) {
        bestT = t;
        best = i;
      }
    }
    return best;
  }

  update(dt, windX, windZ) {
    let n = 0;
    const pos = this.iPos.array;
    const col = this.iColor.array;
    const misc = this.iMisc.array;
    const flr = this.iFloor.array;
    const vel = this.iVel ? this.iVel.array : null;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.live[i]) continue;
      const age = this.age[i] + dt;
      const life = this.life[i];
      if (age >= life) {
        this.live[i] = 0;
        this.liveCount--;
        this.freeList.push(i);
        continue;
      }
      this.age[i] = age;
      const t = age / life;
      // dt is small and drag is modest, so the linear term matches exp() to
      // within a fraction of a percent and saves a transcendental per particle
      let d = 1 - this.drag[i] * dt;
      if (d < 0) d = 0;
      let vxi = this.vx[i] * d;
      let vzi = this.vz[i] * d;
      let vyi = this.vy[i] * d + this.grav[i] * dt;
      const tb = this.turb[i];
      if (tb !== 0) {
        // cheap curl-ish swirl: enough to keep smoke boiling without a field
        const w = age * 1.9 + this.phase[i];
        const cw = Math.cos(w);
        const sw = Math.sin(w);
        const g = tb * dt;
        vxi += cw * g;
        vzi += (sw * 0.62 + cw * 0.78) * g;
        vyi += (cw * 0.46 - sw * 0.38) * g * 0.42;
      }
      const wm = this.wind[i];
      if (wm !== 0) {
        vxi += windX * wm * dt;
        vzi += windZ * wm * dt;
      }
      let py = this.py[i] + vyi * dt;
      const fy = this.floorY[i];
      if (py < fy) {
        // exhaust that hits the pad piles up and rolls outwards instead of
        // disappearing under the terrain
        py = fy;
        if (vyi < 0) vyi *= -0.12;
      }
      this.vx[i] = vxi;
      this.vy[i] = vyi;
      this.vz[i] = vzi;
      this.px[i] += vxi * dt;
      this.py[i] = py;
      this.pz[i] += vzi * dt;
      this.rot[i] += this.rotVel[i] * dt;

      const fi = this.fadeIn[i];
      const rampIn = t < fi ? t / fi : 1;
      const alpha = this.alpha0[i] * rampIn * Math.pow(1 - t, this.fadeExp[i]);
      const se = this.sizeExp[i];
      const st = se === 1 ? t : Math.pow(t, se);
      const size = this.size0[i] + (this.size1[i] - this.size0[i]) * st;

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
      misc[o4 + 2] = this.flat[i];
      misc[o4 + 3] = this.cell[i];
      flr[n] = fy;
      if (vel) {
        vel[o4] = vxi;
        vel[o4 + 1] = vyi;
        vel[o4 + 2] = vzi;
        vel[o4 + 3] = this.stretch[i];
      }
      n++;
    }
    this.geometry.instanceCount = n;
    if (n > 0) {
      this.iPos.needsUpdate = true;
      this.iColor.needsUpdate = true;
      this.iMisc.needsUpdate = true;
      this.iFloor.needsUpdate = true;
      this.iPos.addUpdateRange(0, n * 3);
      this.iColor.addUpdateRange(0, n * 4);
      this.iMisc.addUpdateRange(0, n * 4);
      this.iFloor.addUpdateRange(0, n);
      if (this.iVel) {
        this.iVel.needsUpdate = true;
        this.iVel.addUpdateRange(0, n * 4);
      }
    }
    this.drawn = n;
  }

  setFog(color, density) {
    const u = this.material.uniforms;
    u.uFogColor.value.copy(color);
    u.uFogDensity.value = density;
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
    this.drawn = 0;
  }
}

// ---------------------------------------------------------------------------
// Ribbon contrails (all trails share one geometry -> one draw call)
// ---------------------------------------------------------------------------

const TRAIL_VS = /* glsl */`
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute vec4 aColor;
  attribute vec2 aParam; // x: distance along the ribbon, y: unused
  varying vec4 vColor;
  varying vec2 vUv;
  varying float vFogDepth;
  varying float vHeight;
  void main() {
    vColor = aColor;
    vUv = vec2(aParam.x, uv.y);
    vHeight = position.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
  }
`;

const TRAIL_FS = /* glsl */`
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D map;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uFogHeight;
  varying vec4 vColor;
  varying vec2 vUv;
  varying float vFogDepth;
  varying float vHeight;
  void main() {
    #include <logdepthbuf_fragment>
    vec4 t = texture2D(map, vUv);
    float a = vColor.a * t.a;
    if (a < 0.003) discard;
    float fd = uFogDensity * vFogDepth;
    float fog = (1.0 - exp(-fd * fd)) * exp(-max(vHeight, 0.0) * uFogHeight);
    vec3 c = mix(vColor.rgb * t.rgb, uFogColor, fog);
    gl_FragColor = vec4(c, a);
  }
`;

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
    this.arc = new Float32Array(maxPoints);
    this.uu = new Float32Array(maxPoints);
    this.count = 0;
    this.active = false;
    this.emitting = false;
    this.color = new THREE.Color(0.85, 0.85, 0.88);
    this.alpha = 0.85;
    this.persistence = 4;
    this.minSpacing = 4;
    this.widthScale = 1;
    this.baseWidth = 3;
    this.soot = 0.3;
    this.seed = slot * 2.399963;
  }

  reset(opts = {}) {
    this.count = 0;
    this.active = true;
    this.emitting = true;
    this.color.set(opts.color ?? 0xd8d8dc);
    this.alpha = opts.alpha ?? 0.8;
    this.persistence = opts.persistence ?? 4;
    this.minSpacing = opts.minSpacing ?? 4;
    this.widthScale = opts.widthScale ?? 1;
    this.baseWidth = opts.baseWidth ?? 3;
    this.soot = opts.soot ?? 0.3;
    this.seed = (this.seed + 1.7305) % TAU;
  }

  /**
   * Point spacing and width both follow air density: a tight dark rope in the
   * lower atmosphere, a wide slowly-diffusing contrail in thin air. Spacing
   * grows with altitude too, so 128 points still cover a 20 km climb-out.
   */
  _sample(i, x, y, z) {
    const dr = densityRatio(y);
    this.dens[i] = dr;
    const thin = 1 - dr;
    const w0 = this.baseWidth * (0.35 + Math.pow(thin, 1.8) * 11.5) * this.widthScale;
    if (i === 0) {
      this.arc[i] = 0;
      this.uu[i] = 0;
      this.width[i] = w0;
      return;
    }
    const seg = Math.hypot(x - this.px[i - 1], y - this.py[i - 1], z - this.pz[i - 1]);
    const arc = this.arc[i - 1] + seg;
    this.arc[i] = arc;
    // A flat ribbon of constant width is a blade, not a plume. Beating two
    // slow waves against each other along the arc gives the silhouette the
    // lumpy, rolling edge a real contrail has, for the price of two sines.
    // The wavelength is a small multiple of the width, which is what makes the
    // billows read as the same size as the plume rather than as a slow bend.
    const f = TAU / Math.max(w0 * 3.0, 40);
    this.width[i] = w0 * (1
      + 0.27 * Math.sin(arc * f + this.seed)
      + 0.15 * Math.sin(arc * f * 2.7 + this.seed * 3.1));
    const w = (this.width[i] + this.width[i - 1]) * 0.5;
    // the along-ribbon texture must stretch over several widths: repeat it
    // every couple of segments and the noise reads as regular banding
    this.uu[i] = this.uu[i - 1] + seg / Math.max(w * 4.5, 24);
  }

  /**
   * The last point is provisional: it is dragged along with the round every
   * frame so the tip of the ribbon stays glued to the nozzle. A point is only
   * committed once it has separated from the last committed one, which is why
   * the spacing test is against `count - 2` and not against the head.
   */
  push(x, y, z) {
    const n = this.count;
    if (n < 2) {
      this._append(x, y, z);
      return;
    }
    const spacing = this.minSpacing * (1.4 + (1 - densityRatio(y)) * 8.5);
    const dx = x - this.px[n - 2];
    const dy = y - this.py[n - 2];
    const dz = z - this.pz[n - 2];
    if (dx * dx + dy * dy + dz * dz < spacing * spacing) {
      this.px[n - 1] = x;
      this.py[n - 1] = y;
      this.pz[n - 1] = z;
      this._sample(n - 1, x, y, z);
      return;
    }
    this._append(x, y, z);
  }

  _append(x, y, z) {
    if (this.count >= this.maxPoints) {
      this.px.copyWithin(0, 1);
      this.py.copyWithin(0, 1);
      this.pz.copyWithin(0, 1);
      this.age.copyWithin(0, 1);
      this.width.copyWithin(0, 1);
      this.dens.copyWithin(0, 1);
      this.arc.copyWithin(0, 1);
      this.uu.copyWithin(0, 1);
      this.count--;
    }
    const i = this.count++;
    this.px[i] = x;
    this.py[i] = y;
    this.pz[i] = z;
    this.age[i] = 0;
    this._sample(i, x, y, z);
  }

  tick(dt) {
    for (let i = 0; i < this.count; i++) this.age[i] += dt;
    let firstAlive = 0;
    while (firstAlive < this.count && this.age[firstAlive] > this.lifeOf(firstAlive)) firstAlive++;
    if (firstAlive > 0) {
      this.px.copyWithin(0, firstAlive);
      this.py.copyWithin(0, firstAlive);
      this.pz.copyWithin(0, firstAlive);
      this.age.copyWithin(0, firstAlive);
      this.width.copyWithin(0, firstAlive);
      this.dens.copyWithin(0, firstAlive);
      this.arc.copyWithin(0, firstAlive);
      this.uu.copyWithin(0, firstAlive);
      this.count -= firstAlive;
    }
    if (this.count <= 1 && !this.emitting) this.active = false;
  }

  /** Trails laid in thin air hang in the sky for the best part of a minute. */
  lifeOf(i) {
    const thin = 1 - this.dens[i];
    return this.persistence * (2.4 + Math.pow(thin, 1.5) * 10.0);
  }

  /** How faded the oldest surviving point is; used to pick a slot to reuse. */
  get staleness() {
    if (this.count === 0) return 1e9;
    return this.age[this.count - 1];
  }
}

class TrailSystem {
  constructor(maxTrails = 30, maxPoints = 128) {
    this.maxTrails = maxTrails;
    this.maxPoints = maxPoints;
    const vertsPerTrail = maxPoints * 2;
    const totalVerts = maxTrails * vertsPerTrail;
    this.positions = new Float32Array(totalVerts * 3);
    this.colors = new Float32Array(totalVerts * 4);
    this.params = new Float32Array(totalVerts * 2);
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
      this.uvs[i * 2] = 0;
      this.uvs[i * 2 + 1] = i % 2 === 0 ? 0 : 1;
    }
    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.colAttr = new THREE.BufferAttribute(this.colors, 4);
    this.parAttr = new THREE.BufferAttribute(this.params, 2);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr.setUsage(THREE.DynamicDrawUsage);
    this.parAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('aColor', this.colAttr);
    geo.setAttribute('aParam', this.parAttr);
    geo.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.setDrawRange(0, 0);
    this.geometry = geo;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: ribbonTexture() },
        uFogColor: { value: new THREE.Color(0x9fb4c8) },
        uFogDensity: { value: 0 },
        uFogHeight: { value: FOG_HEIGHT_FALLOFF },
      },
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
    // lighting mood applied to every ribbon: a contrail is lit by the same sun
    // the smoke is, so at night it must not stay a blown-out white streak
    this.mood = new THREE.Color(1, 1, 1);
    this.trails = [];
    this.free = [];
    for (let i = 0; i < maxTrails; i++) {
      const t = new Trail(i, maxPoints);
      this.trails.push(t);
      this.free.push(t);
    }
  }

  acquire(opts) {
    let t = this.free.pop();
    if (!t) {
      // every slot busy: steal whichever lingering contrail is oldest rather
      // than leaving a live round with no trail at all
      let best = null;
      let bestAge = -1;
      for (const x of this.trails) {
        if (x.emitting) continue;
        const a = x.staleness;
        if (a > bestAge) {
          bestAge = a;
          best = x;
        }
      }
      if (!best) return null;
      t = best;
      this._blank(t);
    }
    t.reset(opts);
    return t;
  }

  release(t) {
    if (!t) return;
    t.emitting = false;
  }

  /** Simulation half: age the points and retire dead trails. */
  tick(dt) {
    for (const t of this.trails) {
      if (!t.active) continue;
      t.tick(dt);
      if (!t.active) {
        this._blank(t);
        if (!this.free.includes(t)) this.free.push(t);
      }
    }
  }

  /** Presentation half: rebuild the camera-facing ribbon vertices. */
  present(camera) {
    camera.getWorldPosition(_view);
    let maxSlot = -1;
    for (const t of this.trails) {
      if (!t.active) continue;
      this._writeTrail(t);
      if (t.slot > maxSlot) maxSlot = t.slot;
    }
    this.geometry.setDrawRange(0, (maxSlot + 1) * (this.maxPoints - 1) * 6);
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.parAttr.needsUpdate = true;
  }

  setFog(color, density) {
    this.material.uniforms.uFogColor.value.copy(color);
    this.material.uniforms.uFogDensity.value = density;
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
    const par = this.params;
    const n = t.count;
    const headArc = n > 0 ? t.arc[n - 1] : 0;
    let hasPrev = false;
    for (let i = 0; i < this.maxPoints; i++) {
      const vi = base + i * 2;
      if (i >= n) {
        col[vi * 4 + 3] = 0;
        col[(vi + 1) * 4 + 3] = 0;
        const src = n > 0 ? n - 1 : 0;
        pos[vi * 3] = t.px[src];
        pos[vi * 3 + 1] = t.py[src];
        pos[vi * 3 + 2] = t.pz[src];
        pos[(vi + 1) * 3] = t.px[src];
        pos[(vi + 1) * 3 + 1] = t.py[src];
        pos[(vi + 1) * 3 + 2] = t.pz[src];
        continue;
      }
      const ia = i > 0 ? i - 1 : 0;
      const ib = i < n - 1 ? i + 1 : n - 1;
      _dir.set(t.px[ib] - t.px[ia], t.py[ib] - t.py[ia], t.pz[ib] - t.pz[ia]);
      if (_dir.lengthSq() < 1e-8) _dir.set(0, 1, 0);
      _v.set(t.px[i] - _view.x, t.py[i] - _view.y, t.pz[i] - _view.z);
      const dist = _v.length();
      _side.crossVectors(_dir, _v);
      const sl = _side.length();
      if (sl < 1e-6) {
        if (hasPrev) _side.copy(_prevSide);
        else _side.set(1, 0, 0);
      } else {
        _side.multiplyScalar(1 / sl);
      }
      // keep the ribbon from flipping over when the tangent crosses the view ray
      if (hasPrev && _side.dot(_prevSide) < 0) _side.negate();
      _prevSide.copy(_side);
      hasPrev = true;

      const dens = t.dens[i];
      const thin = 1 - dens;
      const age = t.age[i];
      const life = t.lifeOf(i);
      const lt = Math.min(1, age / life);
      // taper the newest metres so the ribbon grows out of a point, and do it
      // in world distance rather than point index so it never steps
      const headTaper = clamp01((headArc - t.arc[i]) / (t.width[i] * 2.2 + 6));
      const shape = 0.3 + 0.7 * headTaper;
      // the second term is an angular floor: a tight rope thirty kilometres
      // away is a couple of metres of subpixel nothing without it. It is
      // capped against the real width so wide contrails do not balloon.
      // diffusion: a rope in dense air stays a rope, a stratospheric contrail
      // keeps spreading for the whole minute it hangs there
      const wn = t.width[i] * (0.5 + lt * 1.8 * (0.3 + 0.7 * thin));
      const w = (wn + Math.min(dist * 0.0045, wn * 1.6)) * shape;
      _side.multiplyScalar(w * 0.5);
      const vi3 = vi * 3;
      pos[vi3] = t.px[i] + _side.x;
      pos[vi3 + 1] = t.py[i] + _side.y;
      pos[vi3 + 2] = t.pz[i] + _side.z;
      pos[vi3 + 3] = t.px[i] - _side.x;
      pos[vi3 + 4] = t.py[i] - _side.y;
      pos[vi3 + 5] = t.pz[i] - _side.z;

      // dark and sooty in dense air, luminous and cold in the stratosphere
      const bright = 0.62 + 1.15 * Math.pow(thin, 0.75);
      const sk = t.soot * dens;
      const m = bright * (1 - sk * 0.6);
      // A rope this dark only holds its own colour if it is close to opaque:
      // left translucent it picks up the sky behind it and fringes violet.
      const a = t.alpha * Math.pow(1 - lt, 1.15) * (0.82 + 0.18 * thin) * shape;
      const vi4 = vi * 4;
      // soot is warm and grey; only the thin-air vapour is allowed to go cold
      const r = t.color.r * m * (1 + sk * 0.12) * this.mood.r;
      const g = t.color.g * m * (1 - dens * 0.05) * this.mood.g;
      const b = t.color.b * m * (1 + thin * 0.06) * (1 - sk * 0.24) * this.mood.b;
      col[vi4] = r;
      col[vi4 + 1] = g;
      col[vi4 + 2] = b;
      col[vi4 + 3] = a;
      col[vi4 + 4] = r;
      col[vi4 + 5] = g;
      col[vi4 + 6] = b;
      col[vi4 + 7] = a;
      const u = t.uu[i];
      par[vi * 2] = u;
      par[(vi + 1) * 2] = u;
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

/**
 * One irregular shard. Instances vary it further with non-uniform scale, so a
 * single instanced mesh yields plates, splinters and chunks in one draw call.
 */
function shardGeometry() {
  const geo = new THREE.IcosahedronGeometry(0.5, 0);
  const p = geo.attributes.position;
  const n = new Noise2D(6151);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 0.62 + (n.fbm(x * 3 + 2, z * 3 + y * 1.7 + 2, 3) * 0.5 + 0.5) * 0.9;
    p.setXYZ(i, x * k, y * k * 0.86, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Seconds between smoke puffs behind a tumbling fragment. Emitting on a fixed
 * clock leaves a fast shard dropping a bead every ten metres, so the cadence
 * follows the speed. The puff emitter reads the same function to size its
 * puffs against the gap they have to cover, which is what keeps the trail
 * continuous instead of dotted.
 */
function debrisPuffInterval(speed) {
  return Math.min(0.13, Math.max(0.022, DEBRIS_PUFF_GAP / Math.max(speed, 1)));
}

/** Target spacing between debris smoke puffs, in metres. */
const DEBRIS_PUFF_GAP = 5.5;

class DebrisSystem {
  constructor(capacity = 240, rng) {
    this.rng = rng;
    const geo = shardGeometry();
    const mat = new THREE.MeshStandardMaterial({ color: 0x585349, roughness: 0.68, metalness: 0.5 });
    // per-instance incandescence for fragments straight out of a kill
    this.iHot = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    this.iHot.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iHot', this.iHot);
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = `attribute float iHot;\nvarying float vHot;\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvHot = iHot;');
      shader.fragmentShader = `varying float vHot;\n${shader.fragmentShader}`
        .replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += vHot * vec3(3.4, 0.95, 0.2);',
        );
    };
    mat.customProgramCacheKey = () => 'aegis-debris';
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.capacity = capacity;
    this.pos = [];
    this.vel = [];
    this.rot = [];
    this.rotVel = [];
    this.sx = new Float32Array(capacity);
    this.sy = new Float32Array(capacity);
    this.sz = new Float32Array(capacity);
    this.hot = new Float32Array(capacity);
    this.hotRate = new Float32Array(capacity);
    this.smokeT = new Float32Array(capacity);
    this.smoking = new Float32Array(capacity);
    this.floorY = new Float32Array(capacity);
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
  }

  spawn(p, v, { size = 0.4, life = 4, hot = 0, smoking = false, floorY = -1e9 } = {}) {
    const i = this.free.pop();
    if (i === undefined) return -1;
    const rng = this.rng;
    this.live[i] = 1;
    this.pos[i].copy(p);
    this.vel[i].copy(v);
    this.rot[i].set(rng.float() * TAU, rng.float() * TAU, rng.float() * TAU);
    const spin = 6 + rng.float() * 16;
    this.rotVel[i].set(
      (rng.float() - 0.5) * spin,
      (rng.float() - 0.5) * spin,
      (rng.float() - 0.5) * spin,
    );
    // shape variety: chunky, plate-like or splintered
    const kind = rng.float();
    if (kind < 0.4) {
      this.sx[i] = size * (0.8 + rng.float() * 0.5);
      this.sy[i] = size * (0.8 + rng.float() * 0.5);
      this.sz[i] = size * (0.8 + rng.float() * 0.5);
    } else if (kind < 0.75) {
      this.sx[i] = size * (1.1 + rng.float() * 1.1);
      this.sy[i] = size * (0.14 + rng.float() * 0.24);
      this.sz[i] = size * (0.9 + rng.float() * 1.0);
    } else {
      this.sx[i] = size * (0.2 + rng.float() * 0.28);
      this.sy[i] = size * (0.22 + rng.float() * 0.3);
      this.sz[i] = size * (1.6 + rng.float() * 2.0);
    }
    this.hot[i] = hot;
    this.hotRate[i] = hot > 0 ? 1 / (0.9 + rng.float() * 2.4) : 0;
    // a shard only trails for the first few seconds; bounding it here keeps a
    // saturation raid from drowning the smoke pool in fragment trails
    this.smoking[i] = smoking ? 2.6 + rng.float() * 3.4 : 0;
    this.smokeT[i] = 0;
    this.floorY[i] = floorY;
    this.life[i] = life;
    this.age[i] = 0;
    return i;
  }

  update(dt, onDebrisTick) {
    let n = 0;
    const hotArr = this.iHot.array;
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
      v.multiplyScalar(Math.exp(-0.2 * dt));
      this.pos[i].addScaledVector(v, dt);
      if (this.pos[i].y < this.floorY[i]) {
        // ejecta that lands: one last puff where it hit, then it is gone
        if (onDebrisTick) onDebrisTick(this.pos[i], v, 0, i);
        this.live[i] = 0;
        this.free.push(i);
        continue;
      }
      const r = this.rot[i];
      r.x += this.rotVel[i].x * dt;
      r.y += this.rotVel[i].y * dt;
      r.z += this.rotVel[i].z * dt;
      if (this.hot[i] > 0) this.hot[i] = Math.max(0, this.hot[i] - this.hotRate[i] * dt);
      if (this.smoking[i] > 0) {
        this.smoking[i] -= dt;
        this.smokeT[i] -= dt;
        if (this.smokeT[i] <= 0 && onDebrisTick) {
          this.smokeT[i] = debrisPuffInterval(v.length());
          onDebrisTick(this.pos[i], v, this.hot[i], i);
        }
      }
      const t = this.age[i] / this.life[i];
      const shrink = 1 - t * 0.25;
      this._q.setFromEuler(r);
      this._s.set(this.sx[i] * shrink, this.sy[i] * shrink, this.sz[i] * shrink);
      this._m.compose(this.pos[i], this._q, this._s);
      this.mesh.setMatrixAt(n, this._m);
      hotArr[n] = this.hot[i];
      n++;
    }
    this.mesh.count = n;
    if (n) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.iHot.needsUpdate = true;
      this.iHot.addUpdateRange(0, n);
    }
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
// Flash lights
//
// The point-light count is fixed and the lights stay in the scene with zero
// intensity: toggling `visible` would change the light count and force every
// lit material in the scene to recompile mid-launch.
// ---------------------------------------------------------------------------

class FlashLights {
  constructor(scene, capacity = 3) {
    this.pool = new Pool(capacity, () => {
      const l = new THREE.PointLight(0xffd6a0, 0, 600, 2);
      scene.add(l);
      return l;
    }, (l) => {
      l.intensity = 0;
    });
  }

  spawn(pos, { intensity = 6000, life = 0.35, color = 0xffd6a0, distance = 700 } = {}) {
    let l = this.pool.acquire();
    if (!l) {
      // steal whichever flash is closest to burning out
      let best = null;
      let bestT = -1;
      this.pool.forEachLive((x) => {
        const t = x.userData.age / x.userData.life;
        if (t > bestT) {
          bestT = t;
          best = x;
        }
      });
      if (!best) return;
      this.pool.release(best);
      l = this.pool.acquire();
      if (!l) return;
    }
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
      l.intensity = u.intensity * Math.pow(1 - t, 2.4);
    });
  }

  clear() {
    this.pool.releaseAll();
  }
}

// ---------------------------------------------------------------------------
// Ground scorch decals - flat quads inside the shared particle batch
// ---------------------------------------------------------------------------

class DecalLayer {
  constructor(system, rng) {
    this.system = system;
    this.rng = rng;
    this.color = new THREE.Color(0.95, 0.9, 0.86);
  }

  spawn(pos, size = 8, opacity = 0.85) {
    // the renderer uses a logarithmic depth buffer, so polygon offset does not
    // apply to shaders that write gl_FragDepth: lift the quad instead
    this.system.spawn(pos.x, pos.y + 0.12, pos.z, {
      life: 900,
      fadeIn: 0.00002,
      fadeExp: 0.06,
      size0: size,
      size1: size * 1.06,
      rot: this.rng.float() * TAU,
      flat: true,
      alpha: opacity,
      color0: this.color,
      recycle: true,
    });
  }

  clear() {
    this.system.clear();
  }
}

// ---------------------------------------------------------------------------
// Effects facade
// ---------------------------------------------------------------------------

const PLUME_LAUNCH = 0;
const PLUME_IMPACT = 1;

export class Effects {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.group = new THREE.Group();
    this.group.name = 'effects';
    scene.add(this.group);

    this.smoke = new BillboardParticles(3000, smokeAtlas(), { atlas: true, renderOrder: 10 });
    this.dust = new BillboardParticles(1900, dustAtlas(), { atlas: true, renderOrder: 9 });
    this.fire = new BillboardParticles(1100, fireAtlas(), { additive: true, atlas: true, renderOrder: 12, fogAmount: 0.75 });
    this.sparks = new BillboardParticles(1400, emberTexture(), { additive: true, stretch: true, renderOrder: 13, fogAmount: 0.6 });
    this.rings = new BillboardParticles(28, ringTexture(), { additive: true, renderOrder: 14, fogAmount: 0.6 });
    this.decalQuads = new BillboardParticles(28, T.scorch(), { renderOrder: 2, polygonOffset: -4 });
    // kept for source compatibility with anything that peeked at smoke2
    this.smoke2 = this.dust;
    this.group.add(
      this.decalQuads.mesh, this.smoke.mesh, this.dust.mesh,
      this.fire.mesh, this.sparks.mesh, this.rings.mesh,
    );

    this.trails = new TrailSystem(28, 192);
    this.group.add(this.trails.mesh);

    this.debris = new DebrisSystem(240, rng);
    this.group.add(this.debris.mesh);

    this.flashes = new FlashLights(scene, 3);
    this.decals = new DecalLayer(this.decalQuads, rng);

    // tint applied to smoke so it matches the current lighting mood
    this.smokeLight = new THREE.Color(0.86, 0.86, 0.9);
    this.smokeShadow = new THREE.Color(0.42, 0.44, 0.5);
    this.reducedMotion = false;
    this._c0 = new THREE.Color();
    this._c1 = new THREE.Color();
    this._fogColor = new THREE.Color(0x9fb4c8);

    // slow drifting wind that carries dust and lingering smoke across the pad
    this.wind = new THREE.Vector2(1.5, -0.9);
    this._windT = rng.float() * 40;

    // sustained plume emitters (launch columns, burning craters)
    this._plumes = [];
    for (let i = 0; i < 8; i++) {
      this._plumes.push({
        live: false, kind: 0, x: 0, y: 0, z: 0, gy: 0,
        dx: 0, dy: 1, dz: 0, s: 1, t: 0, dur: 1, a0: 0, a1: 0, a2: 0, a3: 0,
      });
    }

    // recent exhaust emission points, used to reconstruct the segment each
    // round flew during the last step (see `_exhaustSegment`)
    this._exX = new Float32Array(24);
    this._exY = new Float32Array(24);
    this._exZ = new Float32Array(24);
    this._exAge = new Float32Array(24).fill(1e6);
    this._exAcc = new Float32Array(24);
    this._exSlot = 0;
    this._exPrev = new THREE.Vector3();

    // ambient near-camera dust motes
    this._camPos = new THREE.Vector3();
    this._camValid = false;
    this._moteAcc = 0;

    this._debrisTick = (pos, vel, hot) => this._debrisPuff(pos, vel, hot);
  }

  setLightingMood(lightColor, shadowColor) {
    this.smokeLight.copy(lightColor);
    this.smokeShadow.copy(shadowColor);
    // 0.81 is the daylight value of this blend, so daylight comes out at 1
    const m = this.trails.mood.copy(lightColor).lerp(shadowColor, 0.3).multiplyScalar(1 / 0.81);
    // A contrail has no light of its own. The linear blend alone still leaves
    // a moonlit one reading as a white streak, so bend it down by its own
    // luminance: daylight is untouched, night loses roughly half again.
    const l = Math.min(1, m.r * 0.3 + m.g * 0.6 + m.b * 0.1);
    m.multiplyScalar(l * (0.55 + 0.45 * l));
  }

  // ---- helpers -----------------------------------------------------------

  /**
   * Set the particle budget multiplier. Large soft particles are the dominant
   * source of overdraw, so this is the main lever the quality setting pulls.
   */
  setDensity(scale) {
    this.density = Math.max(0.15, Math.min(1, scale));
    const alphaScale = 1 + (1 - this.density) * 0.32;
    for (const sys of [this.smoke, this.dust, this.fire]) {
      if (sys) sys.alphaScale = alphaScale;
    }
    // A shorter life also makes a particle reach its terminal size sooner, so
    // cutting persistence hard actually *raises* fill cost. Trim it only enough
    // to stop smoke blanketing the sky across several launches, and take the
    // fill saving out of the count instead.
    if (this.smoke) this.smoke.lifeScale = 0.7;
    if (this.dust) this.dust.lifeScale = 0.65;
  }

  /** Probabilistic rounding so low emission rates stay correct on average. */
  _n(x) {
    if (this.reducedMotion) x *= 0.55;
    if (this.density !== undefined) x *= this.density;
    const f = Math.floor(x);
    return this.rng.float() < x - f ? f + 1 : f;
  }

  /**
   * Blend the current lighting mood into `out`. `lit` 0 = shadow, 1 = key.
   * The shadow tone is sky-lit and therefore quite blue; exhaust smoke reads
   * better if some of that saturation is pulled back out.
   */
  _tint(out, lit, mul = 1) {
    out.copy(this.smokeShadow).lerp(this.smokeLight, lit).multiplyScalar(mul);
    const l = out.r * 0.3 + out.g * 0.5 + out.b * 0.2;
    out.r += (l - out.r) * 0.34;
    out.g += (l - out.g) * 0.34;
    out.b += (l - out.b) * 0.34;
    return out;
  }

  /**
   * As `_tint` but collapsed onto a warm neutral. Sky-lit shadow is very blue,
   * which is right for a water-vapour plume and completely wrong for soot: at
   * low brightness the blue is all that survives and the cloud fringes cyan.
   */
  _sootTint(out, lit, mul = 1) {
    this._tint(out, lit, 1);
    const l = out.r * 0.3 + out.g * 0.5 + out.b * 0.2;
    out.setRGB(l * 1.08 * mul, l * 0.97 * mul, l * 0.83 * mul);
    return out;
  }

  /**
   * Pull a colour towards warm neutral by `k`. Sky-lit shadow is very blue,
   * which is right for a vapour contrail in thin air and wrong for the sooty
   * rope near the pad, where the blue is all that survives the low brightness.
   */
  _sootify(out, k) {
    if (k <= 0) return out;
    const l = out.r * 0.3 + out.g * 0.5 + out.b * 0.2;
    out.r += (l * 1.07 - out.r) * k;
    out.g += (l * 0.97 - out.g) * k;
    out.b += (l * 0.82 - out.b) * k;
    return out;
  }

  /** As `_tint` but pushed towards dry earth. */
  _dustTint(out, lit, mul = 1) {
    this._tint(out, lit, mul);
    out.r *= 1.16;
    out.g *= 0.98;
    out.b *= 0.74;
    return out;
  }

  _cell() {
    return (this.rng.float() * 4) | 0;
  }

  // ---- emitters ----------------------------------------------------------

  /**
   * Rocket exhaust behind a flying missile. The character changes completely
   * with altitude: a tight dark rope of soot in dense air, a huge bright
   * slowly-dissipating cloud once the air thins out.
   */
  emitExhaust(pos, dir, dt, {
    scale = 1, hot = true, rate = 90, spread = 0.14, speed = 30, sooty = 0.5,
  } = {}) {
    if (dt <= 0) return;
    const rng = this.rng;
    const dens = densityRatio(pos.y);
    const thin = 1 - dens;

    // Recover the segment flown since this round's previous call so the puffs
    // can be laid along it. Emitting them all at `pos` turns a fast boosting
    // round into a string of beads with visible gaps between the sprites.
    const seg = this._exhaustSegment(pos, dt);
    const sx = seg ? seg.x : pos.x;
    const sy = seg ? seg.y : pos.y;
    const sz = seg ? seg.z : pos.z;
    const segLen = seg ? Math.hypot(pos.x - sx, pos.y - sy, pos.z - sz) : 0;

    // Emission is driven by distance flown, not by frame rate: a puff every
    // `pitch` metres is what makes the rope continuous, and in thin air the
    // puffs are so large that a handful per second already fills the volume.
    const puff0 = 1.7 * scale * (0.55 + thin * 1.1);
    const pitch = puff0 * 1.25 * (1 + thin * 5);
    this._exAcc[this._exSlot] += segLen;
    const byDist = Math.floor(this._exAcc[this._exSlot] / pitch);
    if (byDist > 0) this._exAcc[this._exSlot] -= byDist * pitch;
    // a baseline so a slow or hovering emitter still smokes
    let n = this._n(rate * dt * (0.1 + dens * 0.5));
    if (byDist > n) n = Math.min(byDist, 12);
    if (n <= 0) return;
    const hotEvery = hot ? 2 : 0;
    for (let i = 0; i < n; i++) {
      // walk from the old position up to the current one, newest puff last
      const f = n > 1 ? (i + rng.float() * 0.85) / n : 1;
      const ex = sx + (pos.x - sx) * f;
      const ey = sy + (pos.y - sy) * f;
      const ez = sz + (pos.z - sz) * f;
      const jx = (rng.float() - 0.5) * spread;
      const jy = (rng.float() - 0.5) * spread;
      const jz = (rng.float() - 0.5) * spread;
      _v.set(
        -dir.x * speed + jx * speed,
        -dir.y * speed + jy * speed,
        -dir.z * speed + jz * speed,
      );
      if (hotEvery && i % hotEvery === 0) {
        // the flame stays bunched at the nozzle: spreading it down the segment
        // like the smoke turns it into a chain of hot beads
        const hf = 0.82 + rng.float() * 0.18;
        this.fire.spawn(
          sx + (pos.x - sx) * hf,
          sy + (pos.y - sy) * hf,
          sz + (pos.z - sz) * hf,
          {
            vel: _v,
            life: (0.05 + rng.float() * 0.06) * (1 + thin * 3.4),
            size0: 1.6 * scale * (0.6 + thin * 1.0),
            size1: (4.0 + rng.float() * 2.4) * scale * (0.6 + thin * 3.0),
            drag: 3.4 - thin * 2.2,
            sizeExp: 0.7,
            cell: this._cell(),
            color0: FIRE_HOT,
            color1: FIRE_COOL,
            alpha: 0.5,
            fadeIn: 0.03,
            fadeExp: 1.5,
          },
        );
      }
      // dense air: dark, tight, short-lived. thin air: bright, wide, hanging.
      const grey = 0.3 + rng.float() * 0.3;
      const lit = clamp01(grey + thin * 0.55);
      // thin-air puffs get their punch from opacity, not from a colour
      // multiplier above 1: that only reads as "bright" against a lit sky and
      // turns into a self-luminous streak at night
      const sk = sooty * dens;
      // Dense-air exhaust is soot, and soot is warm grey however dim it gets.
      // Left on the sky-lit shadow tone it comes out cyan against the sky, so
      // the neutralisation is driven by air density rather than by the soot
      // fraction alone; up in the stratosphere the vapour is allowed to stay
      // cold. Aluminised smoke also scatters hard, so a rope that is too dark
      // never wins against a bright sky: it just lets it through.
      const nk = dens * (0.55 + sooty * 0.45);
      this._sootify(this._tint(this._c0, lit, (0.86 + thin * 0.42) * (1 - sk * 0.4)), nk);
      this._sootify(this._tint(this._c1, lit * 0.5, (0.55 + thin * 0.38) * (1 - sk * 0.32)), nk);
      _v.multiplyScalar(0.42);
      this.smoke.spawn(ex, ey, ez, {
        vel: _v,
        // the ribbon carries the long-lived contrail; these puffs only have to
        // give it body around the round, so their life is bounded
        life: (0.7 + rng.float() * 0.9) * (1.7 + Math.pow(thin, 1.4) * 5.5),
        size0: puff0 * (0.75 + rng.float() * 0.5),
        size1: (7 + rng.float() * 7) * scale * (0.5 + Math.pow(thin, 1.2) * 6.5),
        sizeExp: 0.45,
        drag: 1.7 - thin * 1.45,
        grav: 1.1 * dens,
        turb: 0.9 * scale * dens,
        phase: rng.float() * TAU,
        wind: 0.3 * dens,
        rot: rng.float() * TAU,
        rotVel: (rng.float() - 0.5) * 0.7,
        cell: this._cell(),
        color0: this._c0,
        color1: this._c1,
        alpha: (0.44 + dens * 0.24) * (0.7 + scale * 0.14),
        fadeIn: 0.05,
        fadeExp: 0.9 + dens * 0.55,
      });
    }
  }

  /**
   * `emitExhaust` is stateless from the caller's side, so the previous position
   * of each round is recovered by matching against a small ring of recent
   * emissions. Anything within one frame of travel is the same round.
   */
  _exhaustSegment(pos, dt) {
    const x = this._exX;
    const y = this._exY;
    const z = this._exZ;
    const age = this._exAge;
    // 3 km/s is well above anything that flies here, so this can only match
    // the same round's previous frame
    const reach = 3000 * Math.min(dt, 0.1) + 6;
    let best = -1;
    let bestD = reach * reach;
    let oldest = 0;
    for (let i = 0; i < x.length; i++) {
      if (age[i] > age[oldest]) oldest = i;
      if (age[i] > 0.25) continue;
      const dx = pos.x - x[i];
      const dy = pos.y - y[i];
      const dz = pos.z - z[i];
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    const slot = best >= 0 ? best : oldest;
    const out = best >= 0 ? this._exPrev.set(x[slot], y[slot], z[slot]) : null;
    if (best < 0) this._exAcc[slot] = 0;
    x[slot] = pos.x;
    y[slot] = pos.y;
    z[slot] = pos.z;
    age[slot] = 0;
    this._exSlot = slot;
    return out;
  }

  /**
   * The big ignition event at the launcher: ignition flash, fireball, a rolling
   * column that keeps building for several seconds and a dust ring driven out
   * across the pad. `scale` comes from the battery's plume scale (1 / 1.35 / 2)
   * and drives count, size, reach and duration.
   */
  emitLaunchBlast(pos, dir, { scale = 1, groundY = 0, color = 0xffc070 } = {}) {
    const S = scale;
    const rng = this.rng;
    const gy = groundY + 0.35;
    this.flashes.spawn(pos, { intensity: 5200 * S * S, life: 0.34, color, distance: 240 * S });

    // hard ignition flash, gone in a few frames
    for (let i = 0; i < 2; i++) {
      this.fire.spawn(pos.x, pos.y, pos.z, {
        vel: null,
        life: 0.1 + i * 0.05,
        size0: 4 * S,
        size1: (11 + i * 7) * S,
        sizeExp: 0.5,
        cell: this._cell(),
        color0: FLASH_LAUNCH,
        color1: FIRE_HOT,
        alpha: 0.9,
        fadeIn: 0.001,
        fadeExp: 1.6,
      });
    }
    this.rings.spawn(pos.x, gy + 0.5, pos.z, {
      life: 0.7 + 0.25 * S,
      size0: 5 * S,
      size1: 44 * S,
      sizeExp: 0.5,
      flat: true,
      rot: rng.float() * TAU,
      color0: RING_WARM,
      color1: RING_WARM,
      alpha: 0.38,
      fadeIn: 0.02,
      fadeExp: 2.1,
    });
    this.rings.spawn(pos.x, pos.y, pos.z, {
      life: 0.38,
      size0: 3 * S,
      size1: 24 * S,
      sizeExp: 0.55,
      rot: rng.float() * TAU,
      color0: RING_WARM,
      color1: RING_WARM,
      alpha: 0.3,
      fadeIn: 0.02,
      fadeExp: 2.2,
    });

    // core fireball out of the tube
    const nFire = this._n(14 + 12 * S);
    for (let i = 0; i < nFire; i++) {
      const sp = 22 + rng.float() * 40;
      _v.set(
        -dir.x * sp + (rng.float() - 0.5) * 22 * S,
        -dir.y * sp + (rng.float() - 0.5) * 18 * S,
        -dir.z * sp + (rng.float() - 0.5) * 22 * S,
      );
      this.fire.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 0.24 + rng.float() * 0.5,
        size0: 2.6 * S,
        size1: (9 + rng.float() * 11) * S,
        sizeExp: 0.62,
        drag: 2.4,
        grav: 6,
        cell: this._cell(),
        color0: FIRE_HOT,
        color1: FIRE_DIRTY,
        alpha: 0.8,
        fadeIn: 0.02,
        fadeExp: 1.7,
      });
    }

    // first violent slug of exhaust: the jet hits the deflector and splashes
    // outwards, so most of it leaves the pad horizontally rather than downwards
    const nSmoke = this._n(18 + 20 * S);
    for (let i = 0; i < nSmoke; i++) {
      const a = rng.float() * TAU;
      const sp = 8 + rng.float() * 16;
      _v.set(
        -dir.x * sp * 0.3 + Math.cos(a) * sp * (0.5 + S * 0.24),
        -dir.y * sp * 0.25 + 4 + rng.float() * 13,
        -dir.z * sp * 0.3 + Math.sin(a) * sp * (0.5 + S * 0.24),
      );
      const lit = rng.float();
      this._sootify(this._tint(this._c0, lit, 0.52 + lit * 0.68), 0.7);
      this._sootify(this._tint(this._c1, lit * 0.35, 0.34 + lit * 0.42), 0.9);
      this.smoke.spawn(pos.x, gy + rng.float() * 5 * S, pos.z, {
        vel: _v,
        life: 4.5 + rng.float() * 5,
        size0: 3 * S,
        size1: (8 + rng.float() * 10) * S,
        sizeExp: 0.62,
        drag: 1.3,
        grav: 1.5,
        floorY: gy,
        turb: 2.4 * S,
        phase: rng.float() * TAU,
        wind: 0.5,
        rot: rng.float() * TAU,
        rotVel: (rng.float() - 0.5) * 0.4,
        cell: this._cell(),
        color0: this._c0,
        color1: this._c1,
        alpha: 0.62,
        fadeIn: 0.015,
        fadeExp: 1.0,
      });
    }

    // ground interaction: a fast dust ring driven radially outwards
    const nDust = this._n(30 + 34 * S);
    for (let i = 0; i < nDust; i++) {
      const a = rng.float() * TAU;
      const sp = (13 + rng.float() * 24) * (0.6 + S * 0.6);
      _v.set(Math.cos(a) * sp, 1.5 + rng.float() * 6, Math.sin(a) * sp);
      const r = 1.5 + rng.float() * 5 * S;
      const lit = rng.float();
      this._dustTint(this._c0, 0.35 + lit * 0.6, 0.72 + lit * 0.5);
      this._dustTint(this._c1, lit * 0.4, 0.42 + lit * 0.3);
      this.dust.spawn(pos.x + Math.cos(a) * r, gy + rng.float() * 2, pos.z + Math.sin(a) * r, {
        vel: _v,
        life: 11 + rng.float() * 11,
        size0: 2.4 * S,
        size1: (14 + rng.float() * 16) * S,
        sizeExp: 0.5,
        drag: 0.4,
        grav: 0.3,
        floorY: gy,
        turb: 1.5,
        phase: rng.float() * TAU,
        wind: 1.3,
        rot: rng.float() * TAU,
        rotVel: (rng.float() - 0.5) * 0.5,
        cell: this._cell(),
        color0: this._c0,
        color1: this._c1,
        alpha: 0.62,
        fadeIn: 0.02,
        fadeExp: 1.05,
      });
    }

    // sparks and burning grain flecks thrown clear of the pad
    const nSpark = this._n(34 + 30 * S);
    for (let i = 0; i < nSpark; i++) {
      const a = rng.float() * TAU;
      const sp = 22 + rng.float() * 70;
      _v.set(Math.cos(a) * sp, rng.float() * 34 - 8, Math.sin(a) * sp);
      this.sparks.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 0.5 + rng.float() * 1.2,
        size0: 0.9,
        size1: 0.16,
        drag: 0.8,
        grav: -15,
        stretch: 0.02,
        color0: SPARK_HOT,
        color1: SPARK_COOL,
        alpha: 1,
        fadeIn: 0.02,
        fadeExp: 1.5,
      });
    }

    this.decals.spawn(_v2.set(pos.x, gy - 0.3, pos.z), 13 * S, 0.42);
    this._addPlume(PLUME_LAUNCH, pos, dir, S, gy, 4.5 + 6.5 * S);
  }

  /**
   * A successful intercept: hard white flash, shock rings, a fireball that
   * turns into a dirty expanding cloud, streaking sparks and tumbling debris
   * that smokes on its way down.
   */
  emitIntercept(pos, vel, { scale = 1, debrisCount = 22 } = {}) {
    const S = scale;
    const rng = this.rng;
    const dens = densityRatio(pos.y);
    const thin = 1 - dens;
    this.flashes.spawn(pos, { intensity: 34000 * S, life: 0.45, color: 0xfff0d4, distance: 3000 });

    // hard white core: two frames of genuinely blown-out highlight
    this.fire.spawn(pos.x, pos.y, pos.z, {
      vel: null,
      life: 0.12,
      size0: 16 * S,
      size1: 150 * S,
      sizeExp: 0.45,
      cell: this._cell(),
      color0: FLASH_KILL,
      color1: FLASH_KILL_END,
      alpha: 1,
      fadeIn: 0.001,
      fadeExp: 1.3,
    });
    this.fire.spawn(pos.x, pos.y, pos.z, {
      vel: null,
      life: 0.28,
      size0: 24 * S,
      size1: 250 * S,
      sizeExp: 0.5,
      cell: this._cell(),
      color0: FLASH_KILL_END,
      color1: FIRE_HOT,
      alpha: 0.9,
      fadeIn: 0.001,
      fadeExp: 1.9,
    });

    // shock rings: a fast bluish one and a slower dirty one behind it
    this.rings.spawn(pos.x, pos.y, pos.z, {
      life: 0.85,
      size0: 20 * S,
      size1: 620 * S,
      sizeExp: 0.45,
      rot: rng.float() * TAU,
      color0: RING_COLD,
      color1: RING_COLD,
      alpha: 0.95,
      fadeIn: 0.008,
      fadeExp: 1.9,
    });
    this.rings.spawn(pos.x, pos.y, pos.z, {
      life: 1.7,
      size0: 30 * S,
      size1: 430 * S,
      sizeExp: 0.5,
      rot: rng.float() * TAU,
      color0: RING_WARM,
      color1: RING_WARM,
      alpha: 0.42,
      fadeIn: 0.02,
      fadeExp: 2.4,
    });

    // fireball
    const nFire = this._n(18 + 16 * S);
    for (let i = 0; i < nFire; i++) {
      const a = rng.float() * TAU;
      const b = Math.acos(2 * rng.float() - 1);
      const sp = 40 + rng.float() * 200;
      const sb = Math.sin(b);
      _v.set(sb * Math.cos(a) * sp, Math.cos(b) * sp, sb * Math.sin(a) * sp);
      this.fire.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 0.35 + rng.float() * 0.8,
        size0: 9 * S,
        size1: (74 + rng.float() * 86) * S,
        sizeExp: 0.55,
        drag: 1.4,
        cell: this._cell(),
        color0: FIRE_CORE,
        color1: FIRE_DIRTY,
        alpha: 1,
        fadeIn: 0.015,
        fadeExp: 1.8,
      });
    }

    // the fireball's residue: a dirty cloud that keeps expanding for a minute.
    // High up it becomes the only thing marking the kill, so it has to grow to
    // hundreds of metres to stay readable from the site.
    const nSmoke = this._n(20 + 18 * S);
    for (let i = 0; i < nSmoke; i++) {
      const a = rng.float() * TAU;
      const b = Math.acos(2 * rng.float() - 1);
      const sp = 60 + rng.float() * 210;
      const sb = Math.sin(b);
      _v.set(sb * Math.cos(a) * sp, Math.cos(b) * sp, sb * Math.sin(a) * sp);
      // a third of the puffs are unburnt propellant and casing soot: keeping
      // them dark is what stops the cloud reading as a clean white cotton ball
      const soot = rng.float() < 0.42;
      const lit = soot ? rng.float() * 0.3 : 0.45 + rng.float() * 0.55;
      if (soot) {
        this._sootTint(this._c0, lit, 0.3 + lit * 0.6);
        this._sootTint(this._c1, lit * 0.4, 0.2 + lit * 0.35);
      } else {
        // Nothing shadows a cloud at twenty kilometres, so the non-soot half
        // stays bright even as it dissipates. Let the late tone fall away and
        // the thinning rim darkens instead of fading, which against a blue sky
        // composites into a deep blue halo rather than disappearing.
        this._sootTint(this._c0, lit, 1.05 + thin * 0.5);
        this._sootTint(this._c1, lit * 0.65, 0.85 + thin * 0.6);
      }
      this.smoke.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: (9 + rng.float() * 12) * (0.7 + thin * 0.9),
        size0: 12 * S,
        size1: (130 + rng.float() * 250) * S * (0.55 + thin * 1.1),
        sizeExp: 0.28,
        drag: 0.32,
        grav: 0.5 * dens,
        turb: 4.5,
        phase: rng.float() * TAU,
        wind: 0.25,
        rot: rng.float() * TAU,
        rotVel: (rng.float() - 0.5) * 0.25,
        cell: this._cell(),
        color0: this._c0,
        color1: this._c1,
        // The cloud has to carry its own colour rather than let the sky
        // through: a translucent grey puff over a saturated sky composites to
        // violet once the grade has had a go at it.
        alpha: soot ? 0.64 : 0.52,
        fadeIn: 0.05,
        fadeExp: 1.1,
      });
    }

    // Streaking sparks. They have to clear the fireball to be worth drawing at
    // all: anything slower than the cloud's own expansion is an additive dot
    // inside a saturated white ball. The cube skews the distribution towards a
    // few very fast ones that rake right out of the frame.
    const nSpark = this._n(38 + 22 * S);
    for (let i = 0; i < nSpark; i++) {
      const a = rng.float() * TAU;
      const b = Math.acos(2 * rng.float() - 1);
      const q = rng.float();
      const sp = (260 + q * q * q * 1500) * (0.7 + S * 0.3);
      const sb = Math.sin(b);
      _v.set(sb * Math.cos(a) * sp, Math.cos(b) * sp, sb * Math.sin(a) * sp);
      // half of them are burning casing rather than white-hot fragments
      const white = rng.float() < 0.45;
      // The stretch multiplies length only, so a thin spark turns into a
      // sub-pixel line that pixel coverage washes away: keep them fat and
      // stretch them gently instead.
      this.sparks.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 0.9 + rng.float() * 2.8,
        size0: (2.2 + rng.float() * 2.6) * S,
        size1: 0.4,
        sizeExp: 1.7,
        drag: 0.1,
        grav: -9,
        stretch: 0.019,
        color0: white ? SPARK_WHITE : SPARK_HOT,
        color1: SPARK_COOL,
        alpha: 1,
        fadeIn: 0.008,
        fadeExp: 1.4,
      });
    }

    // debris, the first third of it still incandescent and trailing smoke
    const nDebris = Math.round(debrisCount * (this.reducedMotion ? 0.6 : 1));
    for (let i = 0; i < nDebris; i++) {
      const a = rng.float() * TAU;
      const b = Math.acos(2 * rng.float() - 1);
      const sp = 55 + rng.float() * 240;
      const sb = Math.sin(b);
      _v.set(sb * Math.cos(a) * sp, Math.cos(b) * sp, sb * Math.sin(a) * sp);
      if (vel) _v.addScaledVector(vel, 0.35);
      const smoking = i < Math.min(12, nDebris * 0.6);
      this.debris.spawn(pos, _v, {
        size: 0.7 + rng.float() * 2.2 * S,
        life: 8 + rng.float() * 14,
        hot: i < Math.min(14, nDebris * 0.65) ? 0.6 + rng.float() * 0.4 : 0,
        smoking,
      });
    }
  }

  /** Ground impact of a leaker: dirt column, ejecta and a burning crater. */
  emitGroundImpact(pos, { scale = 1 } = {}) {
    const S = scale;
    const rng = this.rng;
    this.flashes.spawn(pos, { intensity: 20000 * S, life: 0.5, color: 0xffc060, distance: 1800 });

    this.fire.spawn(pos.x, pos.y + 2, pos.z, {
      vel: null,
      life: 0.16,
      size0: 9 * S,
      size1: 46 * S,
      sizeExp: 0.5,
      cell: this._cell(),
      color0: FLASH_IMPACT,
      color1: FIRE_HOT,
      alpha: 1,
      fadeIn: 0.001,
      fadeExp: 1.4,
    });
    this.rings.spawn(pos.x, pos.y + 0.6, pos.z, {
      life: 1.1,
      size0: 10 * S,
      size1: 190 * S,
      sizeExp: 0.5,
      flat: true,
      rot: rng.float() * TAU,
      color0: RING_WARM,
      color1: RING_WARM,
      alpha: 0.8,
      fadeIn: 0.01,
      fadeExp: 2.0,
    });
    this.rings.spawn(pos.x, pos.y + 6 * S, pos.z, {
      life: 0.6,
      size0: 12 * S,
      size1: 130 * S,
      sizeExp: 0.5,
      rot: rng.float() * TAU,
      color0: RING_COLD,
      color1: RING_COLD,
      alpha: 0.6,
      fadeIn: 0.01,
      fadeExp: 2.1,
    });
    // A single scorch disc reads as a scuff mark next to a hundred-metre dirt
    // column. Two overlapping discs give it a burnt core sitting inside a much
    // wider, fainter apron of thrown earth, which is what actually sells the
    // scale of the hit once the smoke has drifted off.
    this.decals.spawn(pos, 66 * S, 0.3);
    this.decals.spawn(pos, 30 * S, 0.95);

    // burning core of the crater
    const nFire = this._n(20 + 18 * S);
    for (let i = 0; i < nFire; i++) {
      const a = rng.float() * TAU;
      const sp = 16 + rng.float() * 80;
      _v.set(Math.cos(a) * sp * 0.55, 34 + rng.float() * 110, Math.sin(a) * sp * 0.55);
      this.fire.spawn(pos.x, pos.y + 1, pos.z, {
        vel: _v,
        life: 0.45 + rng.float() * 0.9,
        size0: 7 * S,
        size1: (24 + rng.float() * 32) * S,
        sizeExp: 0.6,
        drag: 1.15,
        grav: 12,
        cell: this._cell(),
        color0: i < 5 ? FIRE_CORE : FIRE_HOT,
        color1: FIRE_DIRTY,
        alpha: 0.85,
        fadeIn: 0.015,
        fadeExp: 1.8,
      });
    }

    // the dirt column: a narrow fast stalk that mushrooms as it slows
    const nColumn = this._n(22 + 20 * S);
    for (let i = 0; i < nColumn; i++) {
      const a = rng.float() * TAU;
      const r = rng.float() * 4 * S;
      const sp = 45 + rng.float() * 105;
      _v.set(Math.cos(a) * (3 + rng.float() * 12), sp, Math.sin(a) * (3 + rng.float() * 12));
      const lit = 0.28 + rng.float() * 0.4;
      this._dustTint(this._c0, lit, 0.8);
      this._dustTint(this._c1, lit * 0.35, 0.45);
      this.dust.spawn(pos.x + Math.cos(a) * r, pos.y + 1.5, pos.z + Math.sin(a) * r, {
        vel: _v,
        life: 8 + rng.float() * 9,
        size0: 6 * S,
        size1: (44 + rng.float() * 54) * S,
        sizeExp: 0.42,
        drag: 0.85,
        grav: 0.6,
        floorY: pos.y,
        turb: 3.2,
        phase: rng.float() * TAU,
        wind: 0.5,
        rot: rng.float() * TAU,
        rotVel: (rng.float() - 0.5) * 0.45,
        cell: this._cell(),
        color0: this._c0,
        color1: this._c1,
        alpha: 0.55,
        fadeIn: 0.05,
        fadeExp: 1.0,
      });
    }

    // base surge rolling out from the crater lip
    const nSurge = this._n(24 + 22 * S);
    for (let i = 0; i < nSurge; i++) {
      const a = rng.float() * TAU;
      const sp = 16 + rng.float() * 44;
      _v.set(Math.cos(a) * sp, 2 + rng.float() * 8, Math.sin(a) * sp);
      const lit = 0.34 + rng.float() * 0.45;
      this._dustTint(this._c0, lit, 1.0);
      this._dustTint(this._c1, lit * 0.4, 0.6);
      this.dust.spawn(pos.x + Math.cos(a) * 2, pos.y + 0.8, pos.z + Math.sin(a) * 2, {
        vel: _v,
        life: 9 + rng.float() * 9,
        size0: 5 * S,
        size1: (30 + rng.float() * 34) * S,
        sizeExp: 0.45,
        drag: 0.6,
        grav: 0.2,
        floorY: pos.y,
        turb: 1.6,
        phase: rng.float() * TAU,
        wind: 1.3,
        rot: rng.float() * TAU,
        rotVel: (rng.float() - 0.5) * 0.4,
        cell: this._cell(),
        color0: this._c0,
        color1: this._c1,
        alpha: 0.4,
        fadeIn: 0.09,
        fadeExp: 1.05,
      });
    }

    // ejecta
    const nSpark = this._n(60 + 40 * S);
    for (let i = 0; i < nSpark; i++) {
      const a = rng.float() * TAU;
      const sp = 30 + rng.float() * 150;
      _v.set(Math.cos(a) * sp * 0.5, 45 + rng.float() * 150, Math.sin(a) * sp * 0.5);
      this.sparks.spawn(pos.x, pos.y + 0.5, pos.z, {
        vel: _v,
        life: 0.8 + rng.float() * 1.9,
        size0: 1.7,
        size1: 0.24,
        drag: 0.3,
        grav: -13,
        stretch: 0.012,
        color0: SPARK_HOT,
        color1: SPARK_COOL,
        alpha: 1,
        fadeIn: 0.008,
        fadeExp: 1.4,
      });
    }
    const nDebris = Math.round((16 + 14 * S) * (this.reducedMotion ? 0.6 : 1));
    for (let i = 0; i < nDebris; i++) {
      const a = rng.float() * TAU;
      const sp = 18 + rng.float() * 80;
      _v.set(Math.cos(a) * sp * 0.7, 28 + rng.float() * 92, Math.sin(a) * sp * 0.7);
      const smoking = i < 5;
      this.debris.spawn(pos, _v, {
        size: 0.4 + rng.float() * 1.0 * S,
        life: 6 + rng.float() * 5,
        hot: smoking ? 0.5 + rng.float() * 0.4 : 0,
        smoking,
        floorY: pos.y - 0.4,
      });
    }

    this._addPlume(PLUME_IMPACT, pos, UP, S, pos.y, 7 + 4 * S);
  }

  /** Decoy flare ejection (night raid). */
  emitFlare(pos, vel) {
    const rng = this.rng;
    for (let i = 0; i < 3; i++) {
      _v.copy(vel).multiplyScalar(0.32);
      _v.x += (rng.float() - 0.5) * 44;
      _v.y += (rng.float() - 0.5) * 34;
      _v.z += (rng.float() - 0.5) * 44;
      this.sparks.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 2.4 + rng.float() * 2.2,
        size0: 9,
        size1: 2.4,
        drag: 0.22,
        grav: -3,
        stretch: 0.0016,
        color0: FLARE_HOT,
        color1: FLARE_COOL,
        alpha: 1,
        fadeIn: 0.03,
        fadeExp: 1.2,
      });
      this.smoke.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 3.5 + rng.float() * 3,
        size0: 3,
        size1: 34,
        sizeExp: 0.5,
        drag: 0.5,
        turb: 1.2,
        phase: rng.float() * TAU,
        rot: rng.float() * TAU,
        cell: this._cell(),
        color0: this._tint(this._c0, 0.75, 0.9),
        color1: this._tint(this._c1, 0.3, 0.5),
        alpha: 0.16,
        fadeIn: 0.1,
        fadeExp: 1.1,
      });
    }
  }

  /** Small puff and shrapnel when a canister cover is blown off. */
  emitCoverBlow(pos, dir) {
    const rng = this.rng;
    for (let i = 0; i < 6; i++) {
      _v.copy(dir).multiplyScalar(6 + rng.float() * 9);
      _v.x += (rng.float() - 0.5) * 11;
      _v.y += (rng.float() - 0.5) * 7;
      _v.z += (rng.float() - 0.5) * 11;
      this.debris.spawn(pos, _v, { size: 0.2 + rng.float() * 0.3, life: 2.2 });
    }
    for (let i = 0; i < 5; i++) {
      _v.copy(dir).multiplyScalar(5 + rng.float() * 8);
      _v.x += (rng.float() - 0.5) * 12;
      _v.z += (rng.float() - 0.5) * 12;
      this.dust.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 1.4 + rng.float() * 1.4,
        size0: 1.4,
        size1: 8 + rng.float() * 6,
        sizeExp: 0.55,
        drag: 1.6,
        rot: rng.float() * TAU,
        cell: this._cell(),
        color0: this._dustTint(this._c0, 0.7, 0.95),
        color1: this._dustTint(this._c1, 0.3, 0.55),
        alpha: 0.3,
        fadeIn: 0.1,
        fadeExp: 1.3,
      });
    }
  }

  acquireTrail(opts) {
    return this.trails.acquire(opts);
  }

  releaseTrail(t) {
    this.trails.release(t);
  }

  // ---- sustained emitters ------------------------------------------------

  _addPlume(kind, pos, dir, s, gy, dur) {
    let p = null;
    for (const q of this._plumes) {
      if (!q.live) {
        p = q;
        break;
      }
    }
    if (!p) {
      // reuse whichever plume is furthest through its run
      let bestU = -1;
      for (const q of this._plumes) {
        const u = q.t / q.dur;
        if (u > bestU) {
          bestU = u;
          p = q;
        }
      }
    }
    p.live = true;
    p.kind = kind;
    p.x = pos.x;
    p.y = pos.y;
    p.z = pos.z;
    p.gy = gy;
    p.dx = dir.x;
    p.dy = dir.y;
    p.dz = dir.z;
    p.s = s;
    p.t = 0;
    p.dur = dur;
    p.a0 = 0;
    p.a1 = 0;
    p.a2 = 0;
    p.a3 = 0;
  }

  _updatePlumes(dt) {
    for (const p of this._plumes) {
      if (!p.live) continue;
      p.t += dt;
      if (p.t >= p.dur) {
        p.live = false;
        continue;
      }
      const u = p.t / p.dur;
      if (p.kind === PLUME_LAUNCH) this._launchPlumeStep(p, dt, u);
      else this._impactPlumeStep(p, dt, u);
    }
  }

  /**
   * Keeps a launch pad producing for several seconds after ignition: the tube
   * jet while the round is still close, the rolling column boiling up off the
   * concrete, and dust still streaming outwards along the ground.
   */
  _launchPlumeStep(p, dt, u) {
    const rng = this.rng;
    const S = p.s;
    // the column keeps boiling long after the round has gone: a square falloff
    // shuts the pad down in a couple of seconds and reads as a puff, not a plume
    const k = Math.pow(1 - u, 1.3);

    // deflected jet, only while the round is still over the pad
    if (p.t < 0.85) {
      const jet = 1 - p.t / 0.85;
      p.a0 += (46 + 46 * S) * jet * dt;
      while (p.a0 >= 1) {
        p.a0 -= 1;
        const a = rng.float() * TAU;
        const sp = 8 + rng.float() * 15;
        _v.set(
          -p.dx * sp * 0.3 + Math.cos(a) * sp * (0.46 + S * 0.24),
          -p.dy * sp * 0.25 + 3 + rng.float() * 11,
          -p.dz * sp * 0.3 + Math.sin(a) * sp * (0.46 + S * 0.24),
        );
        const lit = rng.float();
        this.smoke.spawn(p.x, p.gy + rng.float() * 6 * S, p.z, {
          vel: _v,
          life: 4.5 + rng.float() * 5,
          size0: 2.6 * S,
          size1: (7 + rng.float() * 9) * S,
          sizeExp: 0.62,
          drag: 1.3,
          grav: 1.5,
          floorY: p.gy,
          turb: 2.2 * S,
          phase: rng.float() * TAU,
          wind: 0.55,
          rot: rng.float() * TAU,
          rotVel: (rng.float() - 0.5) * 0.4,
          cell: this._cell(),
          color0: this._sootify(this._tint(this._c0, lit, 0.5 + lit * 0.62), 0.7),
          color1: this._sootify(this._tint(this._c1, lit * 0.35, 0.32 + lit * 0.38), 0.9),
          alpha: 0.55,
          fadeIn: 0.07,
          fadeExp: 1.0,
        });
        if (rng.float() < 0.28 * jet) {
          this.fire.spawn(p.x, p.y, p.z, {
            vel: _v,
            life: 0.2 + rng.float() * 0.3,
            size0: 3 * S,
            size1: 11 * S,
            sizeExp: 0.6,
            drag: 2.6,
            cell: this._cell(),
            color0: FIRE_HOT,
            color1: FIRE_DIRTY,
            alpha: 0.7,
            fadeIn: 0.04,
            fadeExp: 1.8,
          });
        }
      }
    }

    // the rolling column: smoke boiling up off the concrete around the pad.
    // It has to climb slowly enough that the base stays fed, or the cloud
    // detaches and floats away from the launcher.
    p.a1 += (17 + 17 * S) * k * dt;
    while (p.a1 >= 1) {
      p.a1 -= 1;
      const a = rng.float() * TAU;
      const r = (2 + 7 * S) * (0.3 + u * 0.8) * (0.4 + rng.float());
      const rise = (13 + rng.float() * 23) * (0.7 + S * 0.6);
      _v.set(
        Math.cos(a) * (1.2 + rng.float() * 4.5),
        rise,
        Math.sin(a) * (1.2 + rng.float() * 4.5),
      );
      // Drag has to stay low or the puff sheds its launch velocity in the
      // first half second and the column tops out at head height. What lifts
      // it afterwards is buoyancy against that same low drag: grav/drag is
      // the terminal climb rate, and it is what sets the final column height.
      const lit = rng.float();
      this.smoke.spawn(p.x + Math.cos(a) * r, p.gy + rng.float() * 3 * S, p.z + Math.sin(a) * r, {
        vel: _v,
        life: 11 + rng.float() * 12,
        size0: 3.5 * S,
        size1: (20 + rng.float() * 24) * S,
        sizeExp: 0.5,
        drag: 0.3,
        grav: 2.6 * (1 - u * 0.5),
        floorY: p.gy,
        turb: 3.2 * S,
        phase: rng.float() * TAU,
        wind: 0.8,
        rot: rng.float() * TAU,
        rotVel: (rng.float() - 0.5) * 0.3,
        cell: this._cell(),
        // Wide lit/shadow spread so the column has bright sunlit crowns over
        // dark cores rather than reading as one flat grey mass. The shadow
        // tone is sky-lit and therefore blue, which is right for a vapour
        // cloud and wrong for a propellant column, so pull it back to neutral.
        color0: this._sootify(this._tint(this._c0, lit, 0.34 + lit * 0.95), 0.7),
        color1: this._sootify(this._tint(this._c1, lit * 0.4, 0.24 + lit * 0.56), 0.9),
        alpha: 0.63,
        fadeIn: 0.05,
        fadeExp: 0.95,
      });
    }

    // the pall that settles over the pad: barely buoyant, spreads sideways and
    // keeps the base of the column attached to the ground long after the
    // energetic part of the plume has climbed away
    p.a3 += (8 + 9 * S) * Math.pow(1 - u, 0.5) * dt;
    while (p.a3 >= 1) {
      p.a3 -= 1;
      const a = rng.float() * TAU;
      const r = (2.5 + 9 * S) * (0.3 + u * 1.1) * (0.3 + rng.float() * 0.9);
      _v.set(
        Math.cos(a) * (2 + rng.float() * 6),
        0.6 + rng.float() * 2.6,
        Math.sin(a) * (2 + rng.float() * 6),
      );
      const lit = rng.float();
      this.smoke.spawn(p.x + Math.cos(a) * r, p.gy + rng.float() * 2.5, p.z + Math.sin(a) * r, {
        vel: _v,
        life: 12 + rng.float() * 12,
        size0: 3.4 * S,
        size1: (12 + rng.float() * 15) * S,
        sizeExp: 0.5,
        drag: 0.6,
        grav: 0.16,
        floorY: p.gy,
        turb: 1.1,
        phase: rng.float() * TAU,
        wind: 1.0,
        rot: rng.float() * TAU,
        rotVel: (rng.float() - 0.5) * 0.25,
        cell: this._cell(),
        color0: this._sootify(this._tint(this._c0, lit, 0.48 + lit * 0.6), 0.7),
        color1: this._sootify(this._tint(this._c1, lit * 0.4, 0.3 + lit * 0.36), 0.9),
        alpha: 0.34,
        fadeIn: 0.06,
        fadeExp: 1.0,
      });
    }

    // dust still streaming outwards across the pad, front-loaded
    const kd = Math.pow(1 - u, 1.8);
    p.a2 += (20 + 22 * S) * kd * dt;
    while (p.a2 >= 1) {
      p.a2 -= 1;
      const a = rng.float() * TAU;
      const sp = (12 + rng.float() * 22) * (0.6 + S * 0.55);
      const r = (3.5 + 8 * S) * (0.4 + u * 1.2) * (0.4 + rng.float() * 0.8);
      _v.set(Math.cos(a) * sp, 0.8 + rng.float() * 4, Math.sin(a) * sp);
      const lit = rng.float();
      this.dust.spawn(p.x + Math.cos(a) * r, p.gy + rng.float() * 2, p.z + Math.sin(a) * r, {
        vel: _v,
        life: 12 + rng.float() * 12,
        size0: 2.4 * S,
        size1: (12 + rng.float() * 14) * S,
        sizeExp: 0.55,
        drag: 0.45,
        grav: 0.22,
        floorY: p.gy,
        turb: 1.4,
        phase: rng.float() * TAU,
        wind: 1.4,
        rot: rng.float() * TAU,
        rotVel: (rng.float() - 0.5) * 0.4,
        cell: this._cell(),
        color0: this._dustTint(this._c0, 0.35 + lit * 0.6, 0.7 + lit * 0.48),
        color1: this._dustTint(this._c1, lit * 0.4, 0.4 + lit * 0.3),
        alpha: 0.45,
        fadeIn: 0.11,
        fadeExp: 1.05,
      });
    }
  }

  /** A crater that keeps burning and venting black smoke after an impact. */
  _impactPlumeStep(p, dt, u) {
    const rng = this.rng;
    const S = p.s;
    const k = 1 - u;
    p.a0 += (12 + 12 * S) * k * dt;
    while (p.a0 >= 1) {
      p.a0 -= 1;
      const a = rng.float() * TAU;
      const r = rng.float() * 5 * S;
      _v.set(
        Math.cos(a) * (1 + rng.float() * 5),
        7 + rng.float() * 16,
        Math.sin(a) * (1 + rng.float() * 5),
      );
      const lit = 0.16 + rng.float() * 0.28;
      this.smoke.spawn(p.x + Math.cos(a) * r, p.gy + 1.5, p.z + Math.sin(a) * r, {
        vel: _v,
        life: 11 + rng.float() * 11,
        size0: 4 * S,
        size1: (32 + rng.float() * 38) * S,
        sizeExp: 0.44,
        drag: 0.45,
        grav: 2.2,
        floorY: p.gy,
        turb: 2.4,
        phase: rng.float() * TAU,
        wind: 1.0,
        rot: rng.float() * TAU,
        rotVel: (rng.float() - 0.5) * 0.3,
        cell: this._cell(),
        color0: this._sootTint(this._c0, lit, 0.62),
        color1: this._sootTint(this._c1, lit * 0.4, 0.38),
        alpha: 0.6,
        fadeIn: 0.08,
        fadeExp: 0.95,
      });
    }
    // Pulverised earth thrown up with the soot. Without it the column is pure
    // black and reads as a fuel fire rather than something that dug a hole.
    p.a2 += (30 + 28 * S) * Math.pow(1 - u, 1.5) * dt;
    while (p.a2 >= 1) {
      p.a2 -= 1;
      const a = rng.float() * TAU;
      const r = rng.float() * 7 * S;
      _v.set(
        Math.cos(a) * (3 + rng.float() * 10),
        11 + rng.float() * 30,
        Math.sin(a) * (3 + rng.float() * 10),
      );
      const lit = 0.35 + rng.float() * 0.6;
      this.dust.spawn(p.x + Math.cos(a) * r, p.gy + 1, p.z + Math.sin(a) * r, {
        vel: _v,
        life: 10 + rng.float() * 10,
        size0: 4 * S,
        size1: (28 + rng.float() * 32) * S,
        sizeExp: 0.46,
        drag: 0.34,
        grav: 0.9,
        floorY: p.gy,
        turb: 2.2,
        phase: rng.float() * TAU,
        wind: 1.1,
        rot: rng.float() * TAU,
        rotVel: (rng.float() - 0.5) * 0.3,
        cell: this._cell(),
        color0: this._dustTint(this._c0, lit, 1.0),
        color1: this._dustTint(this._c1, lit * 0.45, 0.6),
        alpha: 0.46,
        fadeIn: 0.07,
        fadeExp: 1.0,
      });
    }

    p.a1 += 9 * k * dt;
    while (p.a1 >= 1) {
      p.a1 -= 1;
      _v.set((rng.float() - 0.5) * 9, 10 + rng.float() * 24, (rng.float() - 0.5) * 9);
      this.fire.spawn(p.x, p.gy + 1, p.z, {
        vel: _v,
        life: 0.4 + rng.float() * 0.6,
        size0: 4 * S,
        size1: 14 * S,
        sizeExp: 0.6,
        drag: 1.4,
        grav: 8,
        cell: this._cell(),
        color0: FIRE_HOT,
        color1: FIRE_DIRTY,
        alpha: 0.75,
        fadeIn: 0.06,
        fadeExp: 1.8,
      });
    }
  }

  /** Small smoke and ember trail behind a tumbling fragment. */
  _debrisPuff(pos, vel, hot) {
    const rng = this.rng;
    const dens = densityRatio(pos.y);
    const thin = 1 - dens;
    const speed = vel.length();
    _v.set(vel.x * -0.05, vel.y * -0.05 + 1, vel.z * -0.05);
    const lit = 0.3 + hot * 0.4;
    // A puff has to be wider than the gap the shard opens up before the next
    // one, or the trail is a string of beads rather than a line of smoke. The
    // quad is soft-edged, so it needs to be comfortably wider than the gap,
    // not merely as wide.
    const gap = speed * debrisPuffInterval(speed);
    const size0 = Math.max(2.2 + hot * 2.0, gap * 1.5);
    this.smoke.spawn(pos.x, pos.y, pos.z, {
      vel: _v,
      life: 1.6 + rng.float() * 2.4 + thin * 3,
      size0,
      size1: Math.max((5 + rng.float() * 7) * (1 + thin * 1.1), size0 * 1.7),
      sizeExp: 0.55,
      drag: 0.9,
      grav: 0.6 * dens,
      turb: 0.8,
      phase: rng.float() * TAU,
      rot: rng.float() * TAU,
      rotVel: (rng.float() - 0.5) * 0.6,
      cell: this._cell(),
      color0: this._sootTint(this._c0, lit, 0.5 + thin * 0.45),
      color1: this._sootTint(this._c1, lit * 0.4, 0.3 + thin * 0.35),
      alpha: 0.34,
      fadeIn: 0.1,
      fadeExp: 1.2,
    });
    if (hot > 0.25) {
      this.sparks.spawn(pos.x, pos.y, pos.z, {
        vel: _v,
        life: 0.3 + rng.float() * 0.4,
        size0: 1.6 * hot,
        size1: 0.2,
        drag: 1.2,
        stretch: 0.004,
        color0: SPARK_HOT,
        color1: SPARK_COOL,
        alpha: hot,
        fadeIn: 0.04,
        fadeExp: 1.5,
      });
    }
  }

  /**
   * Always-on atmosphere: a few dozen dust motes drifting near the camera.
   * They ride the same wind as the launch dust and cost a handful of instances
   * in a batch that is already being drawn.
   */
  _ambient(dt) {
    if (this.reducedMotion || !this._camValid) return;
    const rng = this.rng;
    this._moteAcc += 7 * dt;
    while (this._moteAcc >= 1) {
      this._moteAcc -= 1;
      if (this.dust.liveCount > this.dust.capacity - 220) return;
      const cx = this._camPos.x;
      const cy = this._camPos.y - 1.7;
      const cz = this._camPos.z;
      const a = rng.float() * TAU;
      const r = 4 + rng.float() * 34;
      _v.set((rng.float() - 0.5) * 0.7, (rng.float() - 0.4) * 0.35, (rng.float() - 0.5) * 0.7);
      const lit = 0.55 + rng.float() * 0.45;
      this.dust.spawn(cx + Math.cos(a) * r, cy + 0.15 + rng.float() * 7, cz + Math.sin(a) * r, {
        vel: _v,
        life: 6 + rng.float() * 6,
        size0: 0.05 + rng.float() * 0.12,
        size1: 0.12 + rng.float() * 0.28,
        drag: 0.25,
        grav: -0.03,
        turb: 0.09,
        phase: rng.float() * TAU,
        wind: 1.6,
        rot: rng.float() * TAU,
        rotVel: (rng.float() - 0.5) * 0.8,
        cell: this._cell(),
        color0: this._dustTint(this._c0, lit, 1.25),
        color1: this._dustTint(this._c1, lit * 0.7, 0.9),
        alpha: 0.10 + rng.float() * 0.13,
        fadeIn: 0.22,
        fadeExp: 1.4,
      });
    }
  }

  /** Advance every particle system. Called once per fixed simulation step. */
  simulate(dt) {
    // slow, gentle wind variation so nothing on the ground is ever static
    this._windT += dt;
    const wx = 1.5 + Math.sin(this._windT * 0.11) * 0.9 + Math.sin(this._windT * 0.037) * 0.5;
    const wz = -0.9 + Math.cos(this._windT * 0.083) * 0.8 + Math.sin(this._windT * 0.029) * 0.4;
    this.wind.set(wx, wz);

    for (let i = 0; i < this._exAge.length; i++) this._exAge[i] += dt;

    this._updatePlumes(dt);
    this._ambient(dt);

    this.smoke.update(dt, wx, wz);
    this.dust.update(dt, wx, wz);
    this.fire.update(dt, wx, wz);
    this.sparks.update(dt, wx, wz);
    this.rings.update(dt, 0, 0);
    this.decalQuads.update(dt, 0, 0);
    this.trails.tick(dt);
    this.debris.update(dt, this._debrisTick);
    this.flashes.update(dt);
  }

  /** Camera-dependent work. Called once per rendered frame. */
  present(camera) {
    camera.getWorldPosition(this._camPos);
    this._camValid = true;

    // match the scene's aerial perspective so distant plumes sit in the haze
    const fog = this.scene.fog;
    const density = fog && fog.isFogExp2 ? fog.density : 0;
    if (fog) this._fogColor.copy(fog.color);
    this.smoke.setFog(this._fogColor, density);
    this.dust.setFog(this._fogColor, density);
    this.fire.setFog(this._fogColor, density);
    this.sparks.setFog(this._fogColor, density);
    this.rings.setFog(this._fogColor, density);
    this.decalQuads.setFog(this._fogColor, density);
    this.trails.setFog(this._fogColor, density);

    this.trails.present(camera);
  }

  get stats() {
    return {
      smoke: this.smoke.liveCount + this.dust.liveCount,
      fire: this.fire.liveCount,
      sparks: this.sparks.liveCount,
      trails: this.trails.maxTrails - this.trails.free.length,
      debris: this.debris.mesh.count,
    };
  }

  clear() {
    this.smoke.clear();
    this.dust.clear();
    this.fire.clear();
    this.sparks.clear();
    this.rings.clear();
    this.decalQuads.clear();
    this.trails.clear();
    this.debris.clear();
    this.flashes.clear();
    for (const p of this._plumes) p.live = false;
    this._exAge.fill(1e6);
    this._moteAcc = 0;
  }
}