import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tex } from '../world/textures.js';

/**
 * GPU-billboarded particle pools (one draw call per pool) + debris bodies +
 * a small point-light pool. All game effects are composed from these.
 *
 * Render order contract: fire (11) is drawn first so smoke (12) swallows it;
 * additive flashes/tracers sit on top (13). Viewmodel-pass (layer 1) flash
 * pools are depth-free at 20 so they composite OVER the gun silhouette.
 */

const BILLBOARD_VERT = /* glsl */`
  attribute vec3 aCenter;
  attribute float aSize;
  attribute float aRot;
  attribute vec4 aColor;
  attribute vec3 aVel;
  attribute float aStretch;
  attribute float aAge;
  attribute float aAspect;
  attribute float aTile;
  varying vec2 vUv;
  varying vec2 vUvT;
  varying vec4 vColor;
  varying float vFog;
  varying float vAge;
  varying float vStretch;
  varying float vRand;
  varying float vNear;
  uniform float uFogDensity;
  uniform float uVelStretch;
  uniform float uDt;
  uniform float uNearFade;
  uniform float uTiles;
  void main() {
    vUv = uv;
    vColor = aColor;
    vAge = aAge;
    vStretch = aStretch;
    // Per-particle hash off the spawn-time rotation: free per-streak
    // randomness (alpha level, length jitter, bend) with no new attribute.
    vRand = fract(sin(aRot * 12.9898) * 43758.5453);
    // 2x2 sprite-sheet variety: hash bits pick the tile + mirror U — 8
    // texture variants per pool. aTile >= 0 FORCES a tile so recipes can
    // bias silhouette by role (0 dense boil / 1 tall ragged / 2 wide roller
    // / 3 wispy shred — see shadedSmokeAtlas); aTile < 0 keeps the random
    // pick. Only the TEXTURE coordinate is remapped; vUv keeps the raw quad
    // parametrisation for the procedural streak taper/alpha terms.
    vec2 uvt = uv;
    if (uTiles > 0.5) {
      float rA = fract(vRand * 8.191);
      float rB = fract(vRand * 37.77);
      uvt.x = mix(uvt.x, 1.0 - uvt.x, step(0.5, rB));
      float tSel = aTile >= 0.0 ? aTile : step(0.5, vRand) + 2.0 * step(0.5, rA);
      // Tiles 0/1 sit in the canvas TOP row = uv offset y 0.5 (flipY).
      uvt = uvt * 0.5 + vec2(mod(tSel, 2.0) * 0.5, (1.0 - floor(tSel * 0.5 + 0.001)) * 0.5);
    }
    vUvT = uvt;
    vec4 mv = modelViewMatrix * vec4(aCenter, 1.0);
    // Opt-in near-camera fade: a smoke/fire sprite drifting through the
    // camera must dissolve, not wash the whole frame with a salmon film.
    vNear = mix(1.0, smoothstep(1.1, 3.2, length(mv.xyz)), uNearFade);
    vec2 corner;
    if (abs(aStretch) > 0.001) {
      // Elongate along the particle's CURRENT screen-space velocity, so
      // arcs bend with gravity instead of freezing at the launch direction.
      vec3 vv = mat3(modelViewMatrix) * aVel;
      vec2 d2 = length(vv.xy) > 1e-4 ? normalize(vv.xy) : vec2(1.0, 0.0);
      float len;
      if (aStretch < 0.0) {
        // Fixed-length streak (|aStretch| metres), relaxing a bit with age.
        len = -aStretch * max(0.4, 1.0 - aAge * 0.45);
      } else if (uVelStretch > 0.5) {
        // Motion streaks: length follows actual per-frame travel
        // (max(0.22m, speed*dt*1.5)) and contracts as the mover ages —
        // embers shorten as drag/gravity bleed their speed.
        len = max(0.22, length(vv) * uDt * 1.5) * max(0.3, 1.0 - aAge * 0.55);
      } else {
        // Absolute ribbon length in metres, easing shorter over life.
        // (Length is frozen at spawn: the old size-multiplied variant kept
        // GROWING with the sprite and turned trails into 8m straight rays.)
        len = aStretch * (1.0 - aAge * 0.35);
      }
      // ±12% per-streak length jitter so parallel streaks never match.
      len *= 0.88 + 0.24 * vRand;
      // Slight per-streak bend (up to ~±4.5° at the tail): tail corners
      // swing off the head axis so streaks read as curved slivers rather
      // than ruler lines drawn from the burst centre.
      float bnd = (vRand - 0.5) * 0.16 * (1.0 - uv.x);
      vec2 bd = vec2(d2.x * cos(bnd) - d2.y * sin(bnd), d2.x * sin(bnd) + d2.y * cos(bnd));
      // Tip-to-tail width taper: full width at the head (u=1), collapsing
      // at the tail. Plain ribbon pools (contrail segment chains) keep some
      // tail body so overlapped segments still knit into an unbroken rope.
      float wt = uVelStretch > 0.5 ? smoothstep(-0.06, 0.88, uv.x)
                                   : mix(0.45, 1.0, smoothstep(0.0, 0.75, uv.x));
      vec2 p = vec2(position.x * len, position.y * aSize * wt);
      corner = vec2(p.x * bd.x - p.y * bd.y, p.x * bd.y + p.y * bd.x);
    } else {
      float c = cos(aRot), s = sin(aRot);
      corner = vec2(position.x * c - position.y * s, position.x * s + position.y * c) * aSize;
      // Screen-space vertical elongation (aAspect stores sqrt(aspect), so
      // footprint area is preserved): soot blobs shred into 2:1-4:1 rags
      // instead of reading as polka dots inside the fire.
      corner = vec2(corner.x / aAspect, corner.y * aAspect);
    }
    mv.xy += corner;
    float dist = length(mv.xyz);
    vFog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    gl_Position = projectionMatrix * mv;
  }
`;

const BILLBOARD_FRAG = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uFogColor;
  uniform float uAdditive;
  uniform float uPremult;
  uniform float uErode;
  uniform float uFireRamp;
  uniform float uVelStretch;
  varying vec2 vUv;
  varying vec2 vUvT;
  varying vec4 vColor;
  varying float vFog;
  varying float vAge;
  varying float vStretch;
  varying float vRand;
  varying float vNear;

  // Blackbody-ish ramp: soot -> deep ember red -> 2000K orange -> hot
  // yellow -> warm-white core. Round 8: the white plateau is CAPPED at
  // ~2.6 (was 4.8 — with vColor ~3.3 on top every core hit RGB ~15, ACES
  // clipped it flat white and bloom flooded the whole street end into one
  // 'sensor overexposure' mass). ~2.6 x unit vColor lands ~0.87 through
  // ACES: reads white-HOT with a mild bloom halo, but the orange mid and
  // soot rollover around it stay legible.
  vec3 fireRamp(float h) {
    vec3 c = mix(vec3(0.020, 0.015, 0.012), vec3(0.50, 0.075, 0.010), smoothstep(0.04, 0.34, h));
    c = mix(c, vec3(1.25, 0.36, 0.045), smoothstep(0.32, 0.60, h));
    c = mix(c, vec3(2.05, 1.42, 0.46), smoothstep(0.57, 0.80, h));
    c = mix(c, vec3(2.62, 2.44, 2.16), smoothstep(0.77, 0.94, h));
    return c;
  }

  void main() {
    vec4 t = texture2D(uMap, vUvT);
    vec3 col;
    float a;
    if (uFireRamp > 0.5) {
      // Fireball mode: R holds the baked heat field, B an erosion field
      // biased hot-at-centre. A rising threshold eats the rim over life and
      // pixels approaching the front cool through orange to soot BEFORE
      // they vanish, so age pushes the whole ramp outward: young = blown
      // white core, old = crumbling soot shell. Never a clean disc border.
      float e = mix(-0.32, 1.02, vAge);
      float keep = smoothstep(e, e + 0.26, t.b);
      float rim = smoothstep(e + 0.02, e + 0.52, t.b);
      float h = t.r * (0.15 + 0.85 * rim);
      h *= 1.12 - 0.68 * vAge;
      col = fireRamp(h) * vColor.rgb;
      a = t.a * vColor.a * keep;
    } else if (uErode > 0.5) {
      // Age-driven erosion: threshold climbs with particle age against the
      // noise baked in the sprite's B channel, so plume edges dissolve into
      // ragged fingers instead of resolving as overlapping discs. Starts
      // slightly ABOVE zero bite so even fresh dust carries carved
      // structure instead of pooling into a milky wash.
      col = vec3(t.r) * vColor.rgb;
      float e = mix(-0.12, 0.9, vAge);
      a = t.a * vColor.a * smoothstep(e, e + 0.3, t.b);
    } else {
      col = t.rgb * vColor.rgb;
      a = t.a * vColor.a;
    }
    a *= vNear;
    if (abs(vStretch) > 0.001) {
      // Per-streak alpha level + broken lengthwise modulation: every streak
      // carries its own patchy density, never one solid ruler line.
      a *= (0.78 + 0.22 * vRand) * (0.72 + 0.28 * sin(vUv.x * (9.0 + vRand * 12.0) + vRand * 41.0));
      if (uVelStretch > 0.5) {
        // Head-bright streak gradient: hot tip, tapered fading tail (u=1 head)
        a *= mix(0.08, 1.0, smoothstep(0.02, 0.88, vUv.x));
        col *= mix(0.65, 1.25, vUv.x);
      }
    }
    if (uPremult > 0.5) {
      // Premultiplied alpha: HDR fire rolls off in ACES instead of clipping,
      // and overlapping sprites can't stack into a white-out.
      a *= (1.0 - vFog);
      if (a < 0.004) discard;
      gl_FragColor = vec4(col * a, a);
    } else {
      if (uAdditive > 0.5) {
        a *= (1.0 - vFog);
      } else {
        col = mix(col, uFogColor, vFog);
      }
      if (a < 0.004) discard;
      gl_FragColor = vec4(col, a);
    }
  }
`;

export class ParticlePool {
  constructor(scene, spriteCanvas, {
    capacity = 256, additive = false, premultiplied = false,
    renderOrder = null, fogDensity = 0.0062, fogColor = 0xc9b490,
    upright = false, erode = false, velStretch = false, fireRamp = false,
    nearFade = false, noDepth = false, tiles = false,
  } = {}) {
    // tiles: sprite canvas is a 2x2 variant atlas; the shader picks a tile
    // (+ random U mirror) per particle off the spawn-rotation hash.
    // noDepth: skip the depth test and draw late (renderOrder ~20).
    // Viewmodel-pass pools need this — the weapon camera clears depth and
    // draws the gun first, so a depth-tested flash quad whose centre sits
    // behind the optic/barrel gets z-culled. Depth-free additive sprites
    // read as lens bloom OVER the weapon silhouette instead. World pools
    // keep the depth test so sprites still hide behind cover.
    this.capacity = capacity;
    // Upright pools (vertically shaded smoke) keep spawn rotation near zero
    // and clamp spin so the baked top-light/bottom-shadow never flips over.
    this.upright = upright;
    this.free = [];
    for (let i = 0; i < capacity; i++) this.free.push(i);
    this.data = new Array(capacity).fill(null);
    // Slot records preallocated once: spawn() copies into them, so the fire
    // hot path never allocates vectors/colors per particle.
    this.recs = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.recs[i] = {
        age: 0, delay: 0,
        pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        grav: 0, drag: 0, life: 1,
        size0: 1, size1: 1, rot: 0, rotVel: 0, stretch: 0, aspect: 1,
        tile: -1,
        color0: new THREE.Color(), color1: new THREE.Color(),
        alpha0: 1, alpha1: 0, fadeIn: 0.06, killY: -1e9,
        trail: null, trailAcc: 0,
      };
    }
    this._c = new THREE.Color();
    this._tv = new THREE.Vector3();

    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.attributes.position = base.attributes.position;
    geo.attributes.uv = base.attributes.uv;
    this.aCenter = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage);
    this.aRot = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage);
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aVel = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aStretch = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage);
    this.aAge = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage);
    this.aAspect = new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(1), 1).setUsage(THREE.DynamicDrawUsage);
    this.aTile = new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(-1), 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aCenter', this.aCenter);
    geo.setAttribute('aSize', this.aSize);
    geo.setAttribute('aRot', this.aRot);
    geo.setAttribute('aColor', this.aColor);
    geo.setAttribute('aVel', this.aVel);
    geo.setAttribute('aStretch', this.aStretch);
    geo.setAttribute('aAge', this.aAge);
    geo.setAttribute('aAspect', this.aAspect);
    geo.setAttribute('aTile', this.aTile);
    geo.instanceCount = 0;

    const map = tex(spriteCanvas);
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    const mat = new THREE.ShaderMaterial({
      vertexShader: BILLBOARD_VERT,
      fragmentShader: BILLBOARD_FRAG,
      uniforms: {
        uMap: { value: map },
        uFogColor: { value: new THREE.Color(fogColor) },
        uFogDensity: { value: fogDensity },
        uAdditive: { value: additive ? 1 : 0 },
        uPremult: { value: premultiplied ? 1 : 0 },
        uErode: { value: erode ? 1 : 0 },
        uFireRamp: { value: fireRamp ? 1 : 0 },
        uVelStretch: { value: velStretch ? 1 : 0 },
        uNearFade: { value: nearFade ? 1 : 0 },
        uTiles: { value: tiles ? 1 : 0 },
        uDt: { value: 1 / 60 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: !noDepth,
    });
    if (premultiplied) {
      mat.blending = THREE.CustomBlending;
      mat.blendEquation = THREE.AddEquation;
      mat.blendSrc = THREE.OneFactor;
      mat.blendDst = THREE.OneMinusSrcAlphaFactor;
    } else {
      mat.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    }
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder ?? (noDepth ? 20 : additive ? 12 : 11);
    scene.add(this.mesh);
    this.geo = geo;
  }

  /**
   * Spawn a particle.
   * o: { pos, vel, grav, drag, life, size0, size1, rot, rotVel,
   *      color0, color1, alpha0, alpha1, fadeIn, delay, stretch, aspect,
   *      killY, trail: { every, emit(pos) } }  — trail emits sub-stepped
   *      along the movement segment every `every` metres, so fast movers
   *      never dot.
   * stretch > 0 on a velStretch pool: flag for motion-length streaks.
   * stretch > 0 on a plain pool: ribbon of (stretch * size0) metres.
   * stretch < 0 anywhere: fixed streak of |stretch * size0| metres.
   * aspect (billboards only): screen-space vertical elongation, e.g. 3 =
   *      3:1 tall (area-preserving), for shredded-smoke soot rags.
   * tile (tiled pools only): force an atlas tile 0-3 so recipes can pick a
   *      silhouette by ROLE (see shadedSmokeAtlas); omit/-1 = random tile.
   * killY: particle dies when it sinks below this height (embers on dirt).
   */
  spawn(o) {
    if (!this.free.length) return;
    const i = this.free.pop();
    const p = this.recs[i];
    p.age = 0;
    p.delay = o.delay ?? 0;
    p.pos.copy(o.pos);
    if (o.vel) p.vel.copy(o.vel); else p.vel.set(0, 0, 0);
    p.grav = o.grav ?? 0;
    p.drag = o.drag ?? 0;
    p.life = o.life ?? 1;
    p.size0 = o.size0 ?? 1;
    p.size1 = o.size1 ?? p.size0;
    p.rot = o.rot ?? (this.upright ? (Math.random() - 0.5) * 0.7 : Math.random() * Math.PI * 2);
    p.rotVel = this.upright ? THREE.MathUtils.clamp(o.rotVel ?? 0, -0.3, 0.3) : (o.rotVel ?? 0);
    // Stored as absolute metres (sign selects fixed vs velocity mode).
    p.stretch = (o.stretch ?? 0) * p.size0;
    // Stored pre-square-rooted: the shader divides width / multiplies
    // height by this so the sprite's footprint area stays constant.
    p.aspect = Math.sqrt(o.aspect ?? 1);
    p.tile = o.tile ?? -1;
    if (o.color0) p.color0.copy(o.color0); else p.color0.setRGB(1, 1, 1);
    if (o.color1) p.color1.copy(o.color1); else p.color1.copy(p.color0);
    p.alpha0 = o.alpha0 ?? 1;
    p.alpha1 = o.alpha1 ?? 0;
    p.fadeIn = o.fadeIn ?? 0.06;
    p.killY = o.killY ?? -1e9;
    p.trail = o.trail ?? null;
    p.trailAcc = 0;
    this.data[i] = p;
  }

  update(dt) {
    let n = 0;
    const c = this._c;
    // Frame delta for velocity-length streaks (clamped so pauses/spikes
    // can't blow streaks across the screen)
    this.mesh.material.uniforms.uDt.value = Math.min(0.05, Math.max(0.004, dt));
    for (let i = 0; i < this.capacity; i++) {
      const p = this.data[i];
      if (!p) continue;
      if (p.delay > 0) { p.delay -= dt; continue; } // delayed emitter entry
      p.age += dt;
      if (p.age >= p.life || p.pos.y < p.killY) {
        this.data[i] = null; this.free.push(i); continue;
      }
      const t = p.age / p.life;
      p.vel.y -= p.grav * dt;
      if (p.drag) p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      const ox = p.pos.x, oy = p.pos.y, oz = p.pos.z;
      p.pos.addScaledVector(p.vel, dt);
      // Sub-stepped trail emission: interpolate spawn points along the
      // frame's movement segment so high speeds never leave dashed gaps.
      if (p.trail) {
        const dx = p.pos.x - ox, dy = p.pos.y - oy, dz = p.pos.z - oz;
        const seg = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (seg > 1e-6) {
          p.trailAcc += seg;
          const sp = p.trail.every ?? 0.4;
          while (p.trailAcc >= sp) {
            p.trailAcc -= sp;
            const k = p.trailAcc / seg;
            this._tv.set(p.pos.x - dx * k, p.pos.y - dy * k, p.pos.z - dz * k);
            p.trail.emit(this._tv);
          }
        }
      }
      p.rot += p.rotVel * dt;

      this.aCenter.setXYZ(n, p.pos.x, p.pos.y, p.pos.z);
      this.aSize.setX(n, p.size0 + (p.size1 - p.size0) * t);
      this.aRot.setX(n, p.rot);
      this.aVel.setXYZ(n, p.vel.x, p.vel.y, p.vel.z);
      this.aStretch.setX(n, p.stretch);
      this.aAspect.setX(n, p.aspect);
      this.aTile.setX(n, p.tile);
      this.aAge.setX(n, t);
      c.copy(p.color0).lerp(p.color1, t);
      let a = p.alpha0 + (p.alpha1 - p.alpha0) * t;
      if (p.age < p.fadeIn) a *= p.age / p.fadeIn;
      this.aColor.setXYZW(n, c.r, c.g, c.b, a);
      n++;
    }
    this.geo.instanceCount = n;
    if (n > 0) {
      this.aCenter.needsUpdate = true;
      this.aSize.needsUpdate = true;
      this.aRot.needsUpdate = true;
      this.aColor.needsUpdate = true;
      this.aVel.needsUpdate = true;
      this.aStretch.needsUpdate = true;
      this.aAspect.needsUpdate = true;
      this.aTile.needsUpdate = true;
      this.aAge.needsUpdate = true;
    }
  }
}

/* --------------------------- local sprite bakes -------------------------- */

// Hardcoded key-light direction for smoke sun-shading (matches the scene
// sun's azimuth closely; elevation slightly raised so plume crowns catch).
const SUN_DIR = new THREE.Vector3(0.45, 0.72, 0.53).normalize();

/**
 * Lambert-ish sun response for a puff offset (x,y,z) from its emitter:
 * shadow side falls to ~lo (cooled slightly), sun side rises to ~hi with a
 * warm shift — the single cheapest trick that makes plumes read volumetric.
 * Writes base*k into `out` (a scratch color) and returns it.
 */
export function sunShade(out, base, x, y, z, lo = 0.55, hi = 1.15) {
  const l = Math.sqrt(x * x + y * y + z * z) || 1;
  const d = ((x * SUN_DIR.x + y * SUN_DIR.y + z * SUN_DIR.z) / l) * 0.5 + 0.5;
  const k = lo + (hi - lo) * d;
  const w = (k - 1) * 0.3;
  out.copy(base).multiplyScalar(k);
  out.r *= 1 + w;
  out.b *= 1 - w * 0.8;
  return out;
}

/** Small value-noise for sprite bakes (deterministic, bilinear). */
export function bakeNoise(freq, seed) {
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const g = freq;
  const grid = new Float32Array((g + 1) * (g + 1));
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  const fade = (t) => t * t * (3 - 2 * t);
  return (u, v) => {
    const fx = ((u * g) % g + g) % g, fy = ((v * g) % g + g) % g;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fade(fx - x0), ty = fade(fy - y0);
    const a = grid[y0 * (g + 1) + x0], b = grid[y0 * (g + 1) + x0 + 1];
    const c2 = grid[(y0 + 1) * (g + 1) + x0], d2 = grid[(y0 + 1) * (g + 1) + x0 + 1];
    return a + (b - a) * tx + (c2 - a) * ty + (a - b - c2 + d2) * tx * ty;
  };
}

/**
 * 2x2 shaded smoke ATLAS — four ROLE silhouettes (round 7's tiles differed
 * only by noise seed, so the critic still saw "one round cauliflower
 * silhouette repeated at different scales"). Now each tile is a genuinely
 * different SHAPE — different ellipse ratio, angular lobe count, density
 * and carve — and recipes force tiles by role via spawn({ tile }):
 *  0 = dense cauliflower boil (fire swallow, plume body)
 *  1 = tall ragged column crown, torn top (dirt towers, pillars, soot rags)
 *  2 = wide flat roller (ground skirt, dust wave)
 *  3 = torn wispy shred, translucent (trails, haze, dissipating veils)
 * Channels per tile:
 *  R/G = luminance with baked vertical shading (+35% sky-lit crown, -40%
 *        shadowed belly) and interior mottling, capped ~0.82 so lit dust
 *        never clips white through the warm grade,
 *  B   = erosion field, fbm biased hot-at-centre so RIMS dissolve first,
 *  A   = fbm-warped, angularly LOBED density whose outer half is carved
 *        into ragged filaments — no clean disc border anywhere.
 */
function shadedSmokeAtlas(size = 256, seed = 7) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const half = size / 2;
  const cl = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  // ex > 1 squeezes x (tall mass), ex < 1 squeezes y (wide mass).
  // lob/lobA: angular lobe count/amplitude; den: density gain; cst: carve
  // start radius; fil: filament gate gain; wA: fbm rim-warp amplitude;
  // top: extra crown tear; aMul: overall translucency.
  const ROLES = [
    { ex: 1.02, lob: 5, lobA: 0.11, den: 2.3, cst: 0.32, fil: 2.3, wA: 0.80, top: 0.0, aMul: 1.0 },
    { ex: 1.52, lob: 3, lobA: 0.17, den: 1.9, cst: 0.24, fil: 2.6, wA: 1.05, top: 0.9, aMul: 1.0 },
    { ex: 0.62, lob: 7, lobA: 0.10, den: 2.1, cst: 0.30, fil: 2.4, wA: 0.85, top: 0.0, aMul: 1.0 },
    { ex: 0.96, lob: 4, lobA: 0.24, den: 1.45, cst: 0.10, fil: 3.1, wA: 1.50, top: 0.5, aMul: 0.8 },
  ];
  for (let t = 0; t < 4; t++) {
    const q = ROLES[t];
    const s = seed + t * 613;
    const w1 = bakeNoise(5, s * 977 + 11);
    const w2 = bakeNoise(11, s * 977 + 53);
    const w3 = bakeNoise(23, s * 977 + 97);
    const c1 = bakeNoise(9, s * 431 + 29);
    const c2 = bakeNoise(19, s * 431 + 71);
    const e1 = bakeNoise(7, s * 269 + 17);
    const e2 = bakeNoise(15, s * 269 + 59);
    const x0 = (t % 2) * half, y0 = (t >> 1) * half;
    const phase = ((seed * 13 + t * 733) % 628) / 100;
    for (let y = 0; y < half; y++) {
      const v = y / (half - 1);
      const shade = 1.35 + (0.6 - 1.35) * v;
      for (let x = 0; x < half; x++) {
        const u = x / (half - 1);
        const dx = (u - 0.5) * q.ex, dy = (v - 0.5) / q.ex;
        const r = Math.sqrt(dx * dx + dy * dy) * 2;
        // Unscaled quad radius: the stretched roles (wide/tall) push mass
        // toward the quad border, so the zero-alpha edge guarantee must
        // clamp on BOTH radii or the tile clips square.
        const du = u - 0.5, dv = v - 0.5;
        const rq = Math.sqrt(du * du + dv * dv) * 2;
        const th = Math.atan2(dy, dx);
        const wn = w1(u, v) * 0.5 + w2(u, v) * 0.32 + w3(u, v) * 0.18;
        const cn = c1(u, v) * 0.6 + c2(u, v) * 0.4;
        // Angular lobes give each role its own outline (billows, not fuzz)
        const lobe = Math.sin(th * q.lob + phase) * q.lobA
          + Math.sin(th * (q.lob * 2 + 1) - phase * 1.7) * q.lobA * 0.5;
        let rw = r * (0.88 + (wn - 0.5) * q.wA + lobe);
        // Torn crown: the tall/wispy roles shred their upper rim extra
        if (q.top) rw += Math.max(0, 0.42 - v) * q.top * (0.35 + cn * 0.9);
        const den = cl((1.0 - rw) * q.den);
        const fil = cl((cn - (rw - 0.34) * 1.35) * q.fil);
        const carve = cl((rw - q.cst) * 2.3);
        let a = den * (1 - carve * (1 - fil));
        a = Math.pow(cl(a), 1.2) * cl((0.97 - Math.max(r, rq)) * 6) * q.aMul;
        let lum = (0.72 + (wn - 0.5) * 0.4 + (cn - 0.5) * 0.2) * shade;
        lum = Math.min(0.82, Math.max(0.05, lum)) * 255;
        const b = cl((e1(u, v) * 0.62 + e2(u, v) * 0.38) * 0.70 + (1 - Math.min(rw, 1)) * 0.30);
        const i = ((y0 + y) * size + (x0 + x)) * 4;
        d[i] = lum;
        d[i + 1] = lum;
        d[i + 2] = b * 255;
        d[i + 3] = a * 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * Ribbon/contrail sprite (single tile): denser core than the main smoke
 * bake so chained segments knit into unbroken ropes, but fbm still tears
 * the silhouette — the falling-bomb columns stop reading as stacked discs.
 */
function ribbonSmokeCanvas(size = 64, seed = 5) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const cl = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  const n1 = bakeNoise(5, seed * 331 + 7);
  const n2 = bakeNoise(11, seed * 331 + 41);
  const n3 = bakeNoise(21, seed * 331 + 83);
  for (let y = 0; y < size; y++) {
    const v = y / (size - 1);
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      const dx = u - 0.5, dy = v - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2;
      const n = n1(u, v) * 0.5 + n2(u, v) * 0.32 + n3(u, v) * 0.18;
      const rw = r * (0.9 + (n - 0.5) * 0.6);
      let a = Math.pow(cl(1 - rw), 1.35) * (0.66 + 0.34 * n2(u, v));
      a *= cl((0.97 - r) * 6);
      const i = (y * size + x) * 4;
      const lum = 195 + n * 55;
      d[i] = lum; d[i + 1] = lum; d[i + 2] = lum;
      d[i + 3] = cl(a) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * 2x2 fireball data ATLAS for the blackbody-ramp pools. The old single
 * sprite died two ways: every fireball was the same canvas, and its alpha
 * hit zero at nearly the same radius as the heat — so the visible rim was
 * always mid-ramp ORANGE at half alpha ("flat orange sprites with borders",
 * soot band invisible). Per tile now:
 *  R/G = heat: plateau 1.0 over the inner ~third (WHITE-HOT through the
 *        ramp), fbm-warped falloff hitting ZERO well inside the density
 *        edge — so the outer shell renders as low-heat SOOT at readable
 *        alpha before the ragged rollover,
 *  B   = erosion field biased hot-at-centre (rims crumble first as the
 *        shader threshold rises with age),
 *  A   = density: near-solid to ~2/3 radius, then carved into noisy
 *        filaments — never a clean disc border.
 */
function fireballAtlas(size = 256, seed = 9) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const half = size / 2;
  const cl = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  for (let t = 0; t < 4; t++) {
    const s = seed + t * 811;
    const h1 = bakeNoise(5, s * 233 + 5), h2 = bakeNoise(11, s * 233 + 37), h3 = bakeNoise(23, s * 233 + 91);
    const c1 = bakeNoise(9, s * 389 + 23), c2 = bakeNoise(21, s * 389 + 67);
    const b1 = bakeNoise(6, s * 577 + 13), b2 = bakeNoise(14, s * 577 + 59);
    const x0 = (t % 2) * half, y0 = (t >> 1) * half;
    const ex = 0.92 + ((t * 53) % 4) * 0.05;
    for (let y = 0; y < half; y++) {
      const v = y / (half - 1);
      for (let x = 0; x < half; x++) {
        const u = x / (half - 1);
        const dx = (u - 0.5) * ex, dy = (v - 0.5) / ex;
        const r = Math.sqrt(dx * dx + dy * dy) * 2;
        const hn = h1(u, v) * 0.5 + h2(u, v) * 0.32 + h3(u, v) * 0.18;
        const rw = r * (0.88 + (hn - 0.5) * 0.75);
        // Heat: white plateau inside rw<0.30, gone by rw~0.84 — leaving a
        // broad low-heat (soot) shell that still owns visible alpha.
        const heat = Math.pow(cl(1 - (rw - 0.30) / 0.54), 1.35);
        // Density: solid heart, rim shredded by an independent carve field.
        const den = cl((1.02 - rw) * 2.6);
        const cn = c1(u, v) * 0.6 + c2(u, v) * 0.4;
        const fil = cl((cn - (rw - 0.40) * 1.30) * 2.5);
        const carve = cl((rw - 0.34) * 2.4);
        const a = cl(den * (1 - carve * (1 - fil))) * cl((0.97 - r) * 6);
        const bn = b1(u, v) * 0.62 + b2(u, v) * 0.38;
        const b = cl(bn * 0.68 + (1 - Math.min(rw, 1)) * 0.32);
        const i = ((y0 + y) * size + (x0 + x)) * 4;
        d[i] = heat * 255;
        d[i + 1] = heat * 255;
        d[i + 2] = b * 255;
        d[i + 3] = a * 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * 1-frame white-hot flash core: tiny blown centre with an fbm-feathered
 * warm falloff and 2-3 faint UNEVEN lobes — no symmetric star spikes (the
 * old 4-point cross read as a cartoon starburst on every muzzle/impact).
 * Also serves as the brass glint / impact pop / detonation flash sprite.
 */
function flashCoreCanvas(size = 96, seed = 23) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0, 'rgba(255,255,252,1)');
  g.addColorStop(0.15, 'rgba(255,247,226,0.98)');
  g.addColorStop(0.36, 'rgba(255,208,124,0.52)');
  g.addColorStop(0.66, 'rgba(255,152,52,0.16)');
  g.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // Irregular feathered lobes at seeded angles: asymmetry without spikes.
  ctx.globalCompositeOperation = 'lighter';
  let s = seed * 7919 + 13;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 3; i++) {
    const ang = rand() * Math.PI * 2;
    const len = cx * (0.45 + rand() * 0.3);
    const wid = cx * (0.17 + rand() * 0.1);
    ctx.save();
    ctx.translate(cx, cx);
    ctx.rotate(ang);
    ctx.scale(len / wid, 1);
    const lg = ctx.createRadialGradient(wid * 0.2, 0, 0, wid * 0.24, 0, wid);
    lg.addColorStop(0, `rgba(255,240,206,${(0.26 + rand() * 0.12).toFixed(3)})`);
    lg.addColorStop(0.6, `rgba(255,196,96,${(0.12 + rand() * 0.06).toFixed(3)})`);
    lg.addColorStop(1, 'rgba(255,160,50,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(wid * 0.24, 0, wid, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // fbm feathering beyond the core: the falloff never reads as a clean
  // radial gradient disc, and the quad edge is forced fully transparent.
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const n1 = bakeNoise(6, seed * 131 + 7);
  const n2 = bakeNoise(13, seed * 131 + 61);
  const cl = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  for (let y = 0; y < size; y++) {
    const v = y / (size - 1);
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      const dx = u - 0.5, dy = v - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2;
      const n = n1(u, v) * 0.6 + n2(u, v) * 0.4;
      const carve = cl((r - 0.2) * 1.7);
      const gate = cl((n - (r - 0.38) * 1.0) * 2.4);
      const i = (y * size + x) * 4;
      d[i + 3] *= (1 - carve * (1 - (0.3 + 0.7 * gate))) * cl((0.97 - r) * 8);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * 2x2 muzzle petal ATLAS: each tile bakes 3-4 UNEVEN petals at seeded
 * angles (mixed lengths/widths, white-hot roots, orange fbm-feathered
 * tips) around a tiny blown core. The pool picks tile + mirror per sprite
 * and two sprites stack per shot, so the flash reads as layered irregular
 * combustion petals — never the same star twice, never symmetric.
 */
function petalFlashAtlas(size = 256, seed = 31) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const half = size / 2;
  let s = seed * 2477 + 101;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let t = 0; t < 4; t++) {
    const x0 = (t % 2) * half, y0 = (t >> 1) * half;
    ctx.save();
    ctx.translate(x0, y0);
    ctx.beginPath();
    ctx.rect(0, 0, half, half);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const cx = half / 2;
    const nP = 3 + (t % 2);
    const a0 = rand() * Math.PI * 2;
    for (let i = 0; i < nP; i++) {
      const ang = a0 + (i / nP) * Math.PI * 2 + (rand() - 0.5) * 1.15;
      const len = cx * (0.42 + rand() * 0.3);
      const wid = cx * (0.13 + rand() * 0.12);
      const al = 0.62 + rand() * 0.33;
      ctx.save();
      ctx.translate(cx, cx);
      ctx.rotate(ang);
      ctx.scale(len / wid, 1);
      const g = ctx.createRadialGradient(wid * 0.24, 0, 0, wid * 0.3, 0, wid);
      g.addColorStop(0, `rgba(255,249,232,${al.toFixed(3)})`);
      g.addColorStop(0.4, `rgba(255,206,116,${(al * 0.66).toFixed(3)})`);
      g.addColorStop(0.75, `rgba(255,148,48,${(al * 0.28).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,110,25,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(wid * 0.26, 0, wid, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Tiny blown core knitting the petal roots together
    const g0 = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx * 0.24);
    g0.addColorStop(0, 'rgba(255,252,242,0.95)');
    g0.addColorStop(0.5, 'rgba(255,226,155,0.45)');
    g0.addColorStop(1, 'rgba(255,170,70,0)');
    ctx.fillStyle = g0;
    ctx.fillRect(0, 0, half, half);
    ctx.restore();
  }
  // Per-tile fbm erosion: solid roots, ragged feathered tips, hard zero at
  // the tile border so no seam survives mipmapping.
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const cl = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  for (let t = 0; t < 4; t++) {
    const n1 = bakeNoise(7, seed * 131 + 7 + t * 379);
    const n2 = bakeNoise(15, seed * 131 + 61 + t * 379);
    const n3 = bakeNoise(31, seed * 131 + 117 + t * 379);
    const x0 = (t % 2) * half, y0 = (t >> 1) * half;
    for (let y = 0; y < half; y++) {
      const v = y / (half - 1);
      for (let x = 0; x < half; x++) {
        const u = x / (half - 1);
        const dx = u - 0.5, dy = v - 0.5;
        const r = Math.sqrt(dx * dx + dy * dy) * 2;
        const n = n1(u, v) * 0.5 + n2(u, v) * 0.3 + n3(u, v) * 0.2;
        // Softer gate than round 7 (2.5 -> 2.0, bite starts closer in):
        // petal tips feather into combustion shreds instead of resolving
        // as crisp vector shapes.
        const k = cl((n - (r - 0.26) * 1.30) * 2.0);
        const i = ((y0 + y) * size + (x0 + x)) * 4;
        d[i + 3] *= (r < 0.20 ? 1 : (0.06 + 0.94 * k)) * cl((0.96 - r) * 8);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/* ------------------------------- debris -------------------------------- */

// Concrete/masonry albedo — bright enough that sun+sky lighting keeps chunks
// readable against the sky (the old x0.66 palette went black-on-sky). The
// material's emissive floor + hot-edge shader below carry the rest.
const DEBRIS_PALETTE = [
  new THREE.Color(0x8a7f70), // sunlit concrete
  new THREE.Color(0x6e6355), // dusty mortar
  new THREE.Color(0x57503f), // dry earth clod
  new THREE.Color(0x36302a), // charred (dark, never pure black)
];
const REBAR_PALETTE = [
  new THREE.Color(0x38322b), // scorched steel
  new THREE.Color(0x4c3a2a), // rust bloom
];

export class DebrisSystem {
  /** onPuff(pos, settle, heavy): callback airborne chunks use to drop smoke. */
  constructor(scene, capacity = 160, onPuff = null) {
    this.onPuff = onPuff;
    this._m = new THREE.Matrix4();
    this._sm = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
    this._c = new THREE.Color();
    this._pv = new THREE.Vector3();

    // SIX irregular silhouettes (round 7's tetra/box-plank/jittered-box
    // read as "flat rectangular cards with sharp clean corners... a filing
    // cabinet of cardboard sheets exploding"): two jagged concrete chunks,
    // a snapped slab plate, a splintered plank, a spalled shard spike and
    // a bent rebar sliver. All flat-shaded with per-face value mottle
    // baked as vertex colors so no face renders as one clean cardboard
    // tone; every spawn adds non-uniform per-axis scale jitter + 3-axis
    // tumble.
    const defs = [
      { geo: this._chunkGeo(0.085, false), frac: 0.20, restY: 0.05, kind: 'chunk' },
      { geo: this._chunkGeo(0.08, true), frac: 0.15, restY: 0.04, kind: 'chunk' },
      { geo: this._slabGeo(0.105, 0.024, 3), frac: 0.17, restY: 0.03, kind: 'slab' },
      { geo: this._plankGeo(0.46, 0.06, 0.026, 4), frac: 0.15, restY: 0.02, kind: 'plank' },
      { geo: this._shardGeo(0.085), frac: 0.21, restY: 0.03, kind: 'chunk' },
      { geo: this._rebarGeo(0.5, 0.011), frac: 0.12, restY: 0.015, kind: 'rebar' },
    ];
    this.weights = defs.map((d) => d.frac);
    // Heavy arc chunks bias to big masonry — a 2.4x shard needle over the
    // roofline reads wrong, a 2.4x slab of decking reads right.
    this.heavyWeights = [0.34, 0.24, 0.22, 0.10, 0.0, 0.10];

    const mat = this._makeMaterial();
    this.pools = [];
    let used = 0;
    for (let i = 0; i < defs.length; i++) {
      const n = i === defs.length - 1
        ? Math.max(4, capacity - used)
        : Math.max(4, Math.round(capacity * defs[i].frac));
      used += n;
      this.pools.push(this._makePool(scene, defs[i], n, mat));
    }
  }

  /** Weld-jitter: displace shared-position vertices TOGETHER (keyed weld)
   *  so silhouettes crack irregular without opening face seams. */
  _weld(geo, amp) {
    const p = geo.attributes.position;
    const map = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(4)}|${p.getY(i).toFixed(4)}|${p.getZ(i).toFixed(4)}`;
      let o = map.get(key);
      if (!o) {
        o = [(Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp];
        map.set(key, o);
      }
      p.setXYZ(i, p.getX(i) + o[0], p.getY(i) + o[1], p.getZ(i) + o[2]);
    }
    return geo;
  }

  /** Per-face gray mottle baked as vertex colors + flat facet normals:
   *  every fragment reads as a patchwork of dirt/dust/scorch tones under
   *  the sun instead of one flat cardboard sheet. */
  _mottle(geo, base = 0.92, amp = 0.3) {
    if (geo.index) geo = geo.toNonIndexed();
    const p = geo.attributes.position;
    const col = new Float32Array(p.count * 3);
    for (let f = 0; f < p.count; f += 3) {
      const v = base + (Math.random() - 0.5) * amp;
      const w = 1 + (Math.random() - 0.5) * 0.08; // warm/cool micro shift
      for (let k = f; k < f + 3; k++) {
        col[k * 3] = v * w;
        col[k * 3 + 1] = v;
        col[k * 3 + 2] = v * (2 - w);
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return geo;
  }

  /** Jagged concrete chunk: weld-jittered icosahedron squashed non-uniform
   *  so it tumbles as broken masonry, not a pebble. */
  _chunkGeo(s, squat) {
    const geo = new THREE.IcosahedronGeometry(s, 0);
    this._weld(geo, s * 0.55);
    geo.scale(1.2, squat ? 0.58 : 0.9, squat ? 1.28 : 0.75);
    return this._mottle(geo);
  }

  /** Snapped slab / roof tile: thin extruded plate with an irregular
   *  jagged 7-gon outline (alternating radii = broken-edge teeth). */
  _slabGeo(r, depth, seed) {
    let s = seed * 7477 + 19;
    const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const shape = new THREE.Shape();
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.5;
      const rr = r * (i % 2 === 0 ? 0.5 + rand() * 0.42 : 0.82 + rand() * 0.36);
      if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geo.translate(0, 0, -depth / 2);
    return this._mottle(geo);
  }

  /** Splintered plank: long thin extrusion with spiked broken ends. */
  _plankGeo(len, w, d, seed) {
    let s = seed * 5471 + 7;
    const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const hl = len / 2, hw = w / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-hl + rand() * 0.04, -hw * (0.8 + rand() * 0.2));
    shape.lineTo(hl - 0.09 - rand() * 0.04, -hw * (0.7 + rand() * 0.3));
    shape.lineTo(hl, -hw * 0.2);                          // long tip splinter
    shape.lineTo(hl - 0.06 - rand() * 0.03, hw * 0.1);
    shape.lineTo(hl - 0.02, hw * (0.65 + rand() * 0.3));  // second spike
    shape.lineTo(-hl + 0.1 + rand() * 0.05, hw);
    shape.lineTo(-hl + 0.015, hw * 0.25);                 // butt-end snap
    shape.lineTo(-hl + 0.05, -hw * 0.3);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    geo.translate(0, 0, -d / 2);
    return this._mottle(geo, 0.85, 0.34);
  }

  /** Spalled shard: weld-jittered tetra stretched into a sharp sliver. */
  _shardGeo(s) {
    const geo = new THREE.TetrahedronGeometry(s);
    this._weld(geo, s * 0.5);
    geo.scale(0.62, 0.55, 1.9);
    return this._mottle(geo);
  }

  /** Bent rebar sliver: thin tapered rod with a gentle bow and a kinked
   *  tip — the steel that comes out of blown masonry. */
  _rebarGeo(len, r) {
    const geo = new THREE.CylinderGeometry(r, r * 0.7, len, 5, 5);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = p.getY(i) / len + 0.5;
      p.setX(i, p.getX(i) + Math.sin(t * Math.PI) * len * 0.07);
      if (t > 0.82) p.setZ(i, p.getZ(i) + (t - 0.82) * len * 0.55);
    }
    return this._mottle(geo, 0.9, 0.14);
  }

  _makeMaterial() {
    // Emissive floor 0x1a1713 = constant ambient response: even a fully
    // shadowed face against the bright sky reads as warm dark masonry,
    // never a black cutout. Shared by all six pools (aHeat lives on each
    // pool's geometry); vertexColors carries the baked per-face mottle.
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.9, metalness: 0.04,
      emissive: 0x1a1713, emissiveIntensity: 1.0,
      vertexColors: true,
    });
    // Per-instance heat drives a cooling ember-edge gradient (fresh
    // explosion chunks glow ~1200K at their silhouette edges and cool to
    // ~800K-dark over 0.4s). Injected around the standard lighting chunks.
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aHeat;\nvarying float vHeat;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeat = aHeat;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vHeat;')
        .replace(
          '#include <normal_fragment_begin>',
          `#include <normal_fragment_begin>
          {
            // Sky-lit shading: crowns pick up sky, undersides fall to ~72%
            // (was 55% — read as soot cutouts against the bright sky).
            float dbWy = dot(normal, viewMatrix[1].xyz);
            diffuseColor.rgb *= mix(0.72, 1.08, smoothstep(-0.85, 0.5, dbWy));
          }`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          if (vHeat > 0.001) {
            // Hot fragment edges: 1200K orange at full heat cooling toward
            // 800K deep red as vHeat decays; strongest on grazing edges.
            float ndv = abs(dot(normalize(normal), normalize(vViewPosition)));
            float edge = pow(1.0 - ndv, 1.35);
            vec3 hot = mix(vec3(0.42, 0.045, 0.004), vec3(1.0, 0.30, 0.045), vHeat);
            totalEmissiveRadiance += hot * vHeat * (0.35 + 1.9 * edge) * 2.6;
          }`
        );
    };
    return mat;
  }

  _makePool(scene, def, n, mat) {
    const aHeat = new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    const geo = def.geo;
    geo.setAttribute('aHeat', aHeat);
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.castShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    for (let i = 0; i < n; i++) {
      mesh.setMatrixAt(i, this._zero);
      mesh.setColorAt(i, DEBRIS_PALETTE[0]);
    }
    mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    const free = [];
    const recs = new Array(n);
    for (let i = 0; i < n; i++) {
      free.push(i);
      recs[i] = {
        pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        rot: new THREE.Euler(), rotVel: new THREE.Vector3(),
        scl: new THREE.Vector3(1, 1, 1),
        mult: 1, life: 1, age: 0, rest: false, hot: 0,
        trailOn: false, heavyTrail: false, trailAcc: 0,
      };
    }
    return { mesh, items: new Array(n).fill(null), recs, free, restY: def.restY, kind: def.kind, aHeat };
  }

  /** scale is a characteristic size (m-ish); ~0.09 maps to 1x geometry.
   *  hot (optional, default 1): 0..1 strength of the cooling ember-edge
   *  glow on freshly blasted chunks.
   *  trail (optional): null = auto — only the LARGEST ~20% of small debris
   *  tow a thin smoke thread; true forces the HEAVY skyline trail (big,
   *  long-lived puffs, occasional ember spit) on high-arc money-shot
   *  chunks; false disables it. */
  spawn(pos, vel, scale = 0.09, life = 3.2, hot = 1, trail = null) {
    const heavy = trail === true;
    const w = heavy ? this.heavyWeights : this.weights;
    let roll = Math.random(), type = 0;
    for (let i = 0; i < w.length; i++) { roll -= w[i]; if (roll <= 0) { type = i; break; } }
    const pool = this.pools[type];
    if (!pool.free.length) return;
    const i = pool.free.pop();
    // Heavy trailed chunks get a taller size ceiling — they're read from
    // 40-70m against the sky, where 1.4x geometry vanishes.
    let mult = THREE.MathUtils.clamp(scale / 0.09, 0.45, heavy ? 2.4 : 1.4);
    if (pool.kind === 'plank' || pool.kind === 'rebar') mult = Math.min(mult, 1.5);
    const d = pool.recs[i];
    // NON-UNIFORM per-axis scale jitter: no two shards share a silhouette
    // even from the same pool. Long thin kinds jitter less across their
    // section so planks stay plank-like and rebar stays wire-thin.
    if (pool.kind === 'plank' || pool.kind === 'rebar') {
      d.scl.set(
        mult * (0.78 + Math.random() * 0.55),
        mult * (0.85 + Math.random() * 0.3),
        mult * (0.85 + Math.random() * 0.3)
      );
    } else {
      d.scl.set(
        mult * (0.72 + Math.random() * 0.56),
        mult * (0.72 + Math.random() * 0.56),
        mult * (0.72 + Math.random() * 0.56)
      );
    }
    const cr = Math.random();
    if (pool.kind === 'rebar') {
      this._c.copy(REBAR_PALETTE[cr < 0.65 ? 0 : 1]).multiplyScalar(0.85 + Math.random() * 0.3);
    } else {
      // Heavy arc chunks bias to the charred/earth end of the palette AND
      // run a darker value band: they must SILHOUETTE dark against the
      // bright fireball and the sky, never flash pale card faces.
      const cIdx = heavy
        ? (cr < 0.55 ? 3 : cr < 0.85 ? 2 : 1)
        : (cr < 0.38 ? 0 : cr < 0.66 ? 1 : cr < 0.88 ? 2 : 3);
      this._c.copy(DEBRIS_PALETTE[cIdx])
        .multiplyScalar(heavy ? 0.68 + Math.random() * 0.24 : 0.85 + Math.random() * 0.3);
    }
    pool.mesh.setColorAt(i, this._c);
    pool.mesh.instanceColor.needsUpdate = true;
    d.pos.copy(pos);
    d.vel.copy(vel);
    // Tumble on all 3 axes, quicker on the small stuff.
    d.rot.set(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3);
    const spin = 10 + 8 / Math.max(0.6, mult);
    d.rotVel.set((Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin);
    d.mult = mult;
    d.life = life;
    d.age = 0;
    d.rest = false;
    d.hot = hot;
    // Trails only where they read: heavy arc chunks always tow the fat
    // skyline ribbon; of the ordinary debris only the largest ~20%
    // (mult >= 1.25 + coin flip) tow a thin thread.
    d.trailOn = trail == null ? (mult >= 1.25 && Math.random() < 0.5) : !!trail;
    d.heavyTrail = heavy;
    d.trailAcc = Math.random() * 0.4;
    pool.items[i] = d;
  }

  update(dt) {
    for (const pool of this.pools) {
      let dirty = false;
      for (let i = 0; i < pool.items.length; i++) {
        const d = pool.items[i];
        if (!d) continue;
        d.age += dt;
        if (d.age > d.life) {
          pool.items[i] = null; pool.free.push(i);
          pool.mesh.setMatrixAt(i, this._zero);
          pool.aHeat.setX(i, 0);
          dirty = true;
          continue;
        }
        if (!d.rest) {
          d.vel.y -= 16 * dt;
          const ox = d.pos.x, oy = d.pos.y, oz = d.pos.z;
          d.pos.addScaledVector(d.vel, dt);
          const floor = pool.restY * d.mult;
          if (d.pos.y < floor) {
            d.pos.y = floor;
            d.vel.y = Math.abs(d.vel.y) * 0.3;
            d.vel.x *= 0.72; d.vel.z *= 0.72;
            d.rotVel.multiplyScalar(0.6);
            if (Math.abs(d.vel.y) < 0.6) d.vel.y = 0;
            if (d.vel.lengthSq() < 0.25) {
              d.vel.set(0, 0, 0); d.rotVel.set(0, 0, 0); d.rest = true;
              // Settled chunks fade out over ~2s + one dust puff, instead
              // of persisting as bright lumps on the deck.
              d.life = Math.min(d.life, d.age + 2.0);
              if (this.onPuff) this.onPuff(d.pos, true);
            }
          }
          // Sub-stepped dust trail on flagged chunks: puffs interpolated
          // every 0.6m of travel so arcs read as smoking debris (tighter
          // spacing saturated the dust pool during 7-bomb sticks). Heavy
          // trails use 1.8m spacing — their puffs are ~4x bigger and live
          // longer, so the ribbon stays unbroken while 8 chunks x 7 bombs
          // fit inside the pool budget (dropped spawns killed round 6 arcs).
          if (this.onPuff && d.trailOn && !d.rest) {
            const dx = d.pos.x - ox, dy = d.pos.y - oy, dz = d.pos.z - oz;
            const seg = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (seg > 1e-6) {
              d.trailAcc += seg;
              const sp = d.heavyTrail ? 1.8 : 0.6;
              while (d.trailAcc >= sp) {
                d.trailAcc -= sp;
                const k = d.trailAcc / seg;
                this._pv.set(d.pos.x - dx * k, d.pos.y - dy * k, d.pos.z - dz * k);
                if (this._pv.y > 0.15) this.onPuff(this._pv, false, d.heavyTrail);
              }
            }
          }
          d.rot.x += d.rotVel.x * dt; d.rot.y += d.rotVel.y * dt; d.rot.z += d.rotVel.z * dt;
        }
        const fadeSpan = d.rest ? 2.0 : d.life * 0.18;
        const fade = Math.min(1, Math.max(0, (d.life - d.age) / fadeSpan));
        // Shrink into the ground while settling so the chunk never floats
        if (d.rest) d.pos.y = pool.restY * d.mult * fade;
        this._q.setFromEuler(d.rot);
        this._m.compose(d.pos, this._q,
          this._s.set(d.scl.x * fade, d.scl.y * fade, d.scl.z * fade));
        // Velocity-aligned stretch while fast: ~1.5x fake motion blur along
        // the flight path, relaxing as drag/bounces bleed speed. Round 7
        // ran this to 3.6x, which smeared every chunk into the 'flat
        // rectangular card' the critics flagged — 1.55 keeps the smear
        // subliminal while the silhouette stays masonry.
        if (!d.rest) {
          const sp2 = d.vel.lengthSq();
          if (sp2 > 16) {
            const sp = Math.sqrt(sp2);
            const k = Math.min(1.55, 1 + sp * 0.05);
            const km = (k - 1);
            const vx = d.vel.x / sp, vy = d.vel.y / sp, vz = d.vel.z / sp;
            const e = this._sm.elements;
            e[0] = 1 + km * vx * vx; e[4] = km * vx * vy; e[8] = km * vx * vz; e[12] = 0;
            e[1] = km * vy * vx; e[5] = 1 + km * vy * vy; e[9] = km * vy * vz; e[13] = 0;
            e[2] = km * vz * vx; e[6] = km * vz * vy; e[10] = 1 + km * vz * vz; e[14] = 0;
            e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
            // M = T * S(v) * R * s  — stretch applied in world space
            this._m.setPosition(0, 0, 0);
            this._sm.multiply(this._m);
            this._sm.setPosition(d.pos);
            this._m.copy(this._sm);
          }
        }
        pool.mesh.setMatrixAt(i, this._m);
        // Ember-edge heat: full at spawn, cooled out by 0.4s.
        pool.aHeat.setX(i, d.hot > 0 ? Math.max(0, 1 - d.age / 0.4) * d.hot : 0);
        dirty = true;
      }
      if (dirty) {
        pool.mesh.instanceMatrix.needsUpdate = true;
        pool.aHeat.needsUpdate = true;
      }
    }
  }
}

/* ------------------------------ light pool ------------------------------ */

export class LightPool {
  constructor(scene, n = 8) {
    // 8 slots: a 7-bomb airstrike stick detonates inside ~0.35s and each
    // flash lives ~0.5s, so 6 slots evicted live strike lights mid-frame
    // (fireballs read as stickers on unlit facades).
    this.lights = [];
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffaa44, 0, 18, 2);
      l.visible = false;
      l.layers.enable(1); // also light the viewmodel pass
      scene.add(l);
      this.lights.push({ l, life: 0, age: 0, intensity: 0 });
    }
  }
  flash(pos, { color = 0xffaa44, intensity = 60, life = 0.25, distance = 20 } = {}) {
    // Prefer an expired slot; otherwise evict the MOST-elapsed one (the old
    // lights[0] fallback stole the newest detonation's light).
    let slot = this.lights.find((s) => s.age >= s.life);
    if (!slot) {
      slot = this.lights[0];
      for (const s of this.lights) {
        if (s.age / Math.max(1e-4, s.life) > slot.age / Math.max(1e-4, slot.life)) slot = s;
      }
    }
    slot.l.position.copy(pos);
    slot.l.color.set(color);
    slot.l.distance = distance;
    slot.intensity = intensity;
    slot.life = life;
    slot.age = 0;
    slot.l.visible = true;
  }
  update(dt) {
    for (const s of this.lights) {
      if (s.age >= s.life) { s.l.visible = false; continue; }
      s.age += dt;
      const t = Math.min(1, s.age / s.life);
      s.l.intensity = s.intensity * (1 - t) * (1 - t);
      if (s.age >= s.life) s.l.visible = false;
    }
  }
}

/* --------------------------- muzzle flash tongues ------------------------ */

/**
 * Feathered flash tongue: overlapping radial-gradient lobes (white-hot at
 * the muzzle, orange only at the tips) softened further with shadowBlur.
 * No polygon silhouette anywhere — every edge rolls off to zero alpha.
 */
function tongueCanvas(w = 256, h = 64) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const mid = h / 2;
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = 'rgba(255,180,95,0.8)';
  ctx.shadowBlur = 8;
  const lobe = (cx, cy, rx, ry, col, a) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx / ry, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
    g.addColorStop(0, `rgba(${col},${a})`);
    g.addColorStop(0.55, `rgba(${col},${(a * 0.42).toFixed(3)})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, ry, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  // Core lobes: near-white at the muzzle, shrinking + shifting orange out
  lobe(w * 0.06, mid, h * 0.95, h * 0.44, '255,250,236', 0.95);
  lobe(w * 0.21, mid, h * 0.88, h * 0.40, '255,240,205', 0.85);
  lobe(w * 0.38, mid, h * 0.75, h * 0.32, '255,216,150', 0.6);
  lobe(w * 0.56, mid, h * 0.58, h * 0.24, '255,178,92', 0.38);
  lobe(w * 0.73, mid, h * 0.42, h * 0.16, '255,148,58', 0.22);
  lobe(w * 0.88, mid, h * 0.28, h * 0.09, '255,122,36', 0.12);
  // Slim axial streak keeps a directional hint without a razor edge
  lobe(w * 0.62, mid, w * 0.38, h * 0.085, '255,196,120', 0.2);
  return c;
}

/** Two crossed quads (0.26 x 0.06 m) running along +Z from the muzzle.
 *  Rooted 1.5cm AHEAD of the anchor so the tongue never clips back through
 *  the flash hider. */
function tongueGeometry() {
  const p1 = new THREE.PlaneGeometry(0.26, 0.06);
  p1.rotateY(-Math.PI / 2);            // length along +Z, u=0 at z=0
  p1.translate(0, 0, 0.145);           // spans z in [0.015, 0.275]
  const p2 = p1.clone();
  p2.rotateZ(Math.PI / 2);             // roll the second quad 90° about the barrel axis
  return mergeGeometries([p1, p2]);
}

/* --------------------------------- FX hub -------------------------------- */

const _FWD = new THREE.Vector3(0, 0, 1);
const _UP = new THREE.Vector3(0, 1, 0);
const _RIGHT = new THREE.Vector3(1, 0, 0);
// Preallocated spawn colors for the per-shot muzzle rig (no allocs at 12 Hz)
const C_CORE = new THREE.Color(3.2, 3.0, 2.5);
const C_CORE1 = new THREE.Color(2.2, 1.2, 0.5);
const C_PETAL = new THREE.Color(2.2, 1.75, 1.15);
const C_PETAL1 = new THREE.Color(1.5, 0.8, 0.32);
const C_SPARK0 = new THREE.Color(3.2, 2.4, 1.3);
const C_SPARK1 = new THREE.Color(2.2, 0.8, 0.18);
// Muzzle smoke greys run DARK: a pale wisp at low alpha vanishes into the
// sunlit street + flash bloom; MW's post-shot smoke reads as a slightly
// dark translucent veil against bright backgrounds.
const C_WISP0 = new THREE.Color(0.36, 0.345, 0.325);
const C_WISP1 = new THREE.Color(0.33, 0.315, 0.3);

export class FX {
  constructor(scene, quality = 'high') {
    this.scene = scene;
    const big = quality !== 'medium';
    // Smoke draws over fire so fireballs get swallowed by their own smoke.
    // 2x2 shaded atlas + per-particle tile/mirror + upright spawns: lit
    // crowns, shadowed bellies, four silhouettes — no twin puffs. Capacity
    // raised: a 7-bomb stick + dust waves + columns exhausted 640 slots and
    // silently dropped the late spawns (the missing "wall of dust").
    this.smoke = new ParticlePool(scene, shadedSmokeAtlas(256, 7), { capacity: big ? 832 : 416, renderOrder: 12, upright: true, erode: true, nearFade: true, tiles: true });
    // Fire pool renders through the blackbody ramp: blown white core, 2000K
    // orange mid, broad soot shell with noise-eaten edges; age drives the
    // ramp outward (young = white, old = soot). velStretch: ember quads
    // re-orient along their CURRENT velocity and shorten as speed decays.
    const fireCnv = fireballAtlas(256, 9);
    this.fire = new ParticlePool(scene, fireCnv, { capacity: big ? 420 : 240, premultiplied: true, renderOrder: 11, velStretch: true, fireRamp: true, nearFade: true, tiles: true });
    this.flash = new ParticlePool(scene, flashCoreCanvas(96), { capacity: 60, additive: true, renderOrder: 13 });
    // Player muzzle flash sprites render in the viewmodel pass (layer 1).
    // noDepth: the vm pass draws with its own cleared depth, and the flash
    // quad's centre sits at the bore — BEHIND the optic/barrel meshes from
    // the 50° weapon camera — so a depth-tested flash was z-culled for the
    // whole ADS view. Depth-free + renderOrder 20 composites it as lens
    // bloom over the weapon silhouette, MWII-style.
    this.flashVM = new ParticlePool(scene, flashCoreCanvas(96), { capacity: 24, additive: true, renderOrder: 20, noDepth: true });
    this.flashVM.mesh.layers.set(1);
    // Radial flash petals (Layer B of the muzzle rig), world + viewmodel:
    // 2x2 atlas of 3-4 uneven petal layouts, tile+mirror picked per sprite.
    const petalCnv = petalFlashAtlas(256, 31);
    this.petal = new ParticlePool(scene, petalCnv, { capacity: 24, additive: true, renderOrder: 13, tiles: true });
    this.petalVM = new ParticlePool(scene, petalCnv, { capacity: 12, additive: true, renderOrder: 20, noDepth: true, tiles: true });
    this.petalVM.mesh.layers.set(1);
    // Viewmodel-layer fire pool: birdcage spark streaks on player shots
    // (world-pool sparks would draw underneath the gun). Depth-free like
    // the other vm pools so sparks never vanish behind the handguard.
    this.fireVM = new ParticlePool(scene, fireCnv, { capacity: 48, premultiplied: true, renderOrder: 20, velStretch: true, fireRamp: true, noDepth: true, tiles: true });
    this.fireVM.mesh.layers.set(1);
    // Dedicated pool for airborne-debris dust trails so heavy strikes can't
    // starve the explosion smoke of instances.
    this.debrisDust = new ParticlePool(scene, shadedSmokeAtlas(128, 11), { capacity: big ? 768 : 384, renderOrder: 12, upright: true, erode: true, nearFade: true, tiles: true });
    // High-capacity ribbon pool for jet contrails and falling-bomb trails —
    // fast movers need dense sub-stepped puffs that would starve the main
    // smoke pool. Non-upright so velocity-stretched segments work. No near
    // fade: it also hosts the player's muzzle wisps, which live ~0.5m from
    // the lens and must stay visible.
    this.contrail = new ParticlePool(scene, ribbonSmokeCanvas(64, 5), { capacity: big ? 3072 : 1536, renderOrder: 12 });
    this.debris = new DebrisSystem(scene, big ? 160 : 80, (pos, settle, heavy) => this._debrisPuff(pos, settle, heavy));
    this.lights = new LightPool(scene, 8);
    this.columns = []; // lingering smoke emitters
    this.onShake = null;
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._v3 = new THREE.Vector3();
    this._v4 = new THREE.Vector3();
    this._q1 = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();

    // Dedicated player muzzle light — never evicted by explosion flashes.
    // ~2 frames, short throw (3.0m, decay 2), warm; layers(1) so the
    // viewmodel camera sees it warm the handguard top and glove knuckles
    // while the world camera catches 1-2m of ground. Intensity 48: legible
    // on the gun without the round-5 frame white-out (that was a long-range
    // flash, not this short-throw light).
    this.muzzleLight = new THREE.PointLight(0xffc98e, 0, 3.0, 2);
    this.muzzleLight.visible = false;
    this.muzzleLight.layers.enable(1);
    scene.add(this.muzzleLight);
    this._muzzleAge = 1;
    this._muzzleLife = 0.05;
    this._muzzleIntensity = 48;

    // Barrel-aligned flash tongues (additive crossed quads; player shots
    // move them to layer 1 so they depth-sort against the viewmodel).
    const tTex = tex(tongueCanvas());
    tTex.wrapS = tTex.wrapT = THREE.ClampToEdgeWrapping;
    tTex.colorSpace = THREE.SRGBColorSpace;
    const tGeo = tongueGeometry();
    this.tongues = [];
    for (let i = 0; i < 12; i++) {
      // Each tongue carries a world material (depth-tested) and a vm
      // material (depthTest off, drawn late): a viewmodel tongue rooted at
      // the bore is z-culled behind the barrel/optic in the weapon pass,
      // exactly like the vm flash pools. Both stay per-tongue so the
      // opacity tail animation never crosstalks between active tongues.
      const mkMat = (noDepth) => {
        const mat = new THREE.MeshBasicMaterial({
          map: tTex, transparent: true, blending: THREE.AdditiveBlending,
          depthWrite: false, depthTest: !noDepth, side: THREE.DoubleSide, toneMapped: false,
        });
        mat.color.setRGB(2.6, 2.4, 2.0); // white-hot HDR core; tips stay orange via the map
        return mat;
      };
      const matWorld = mkMat(false);
      const matVM = mkMat(true);
      const m = new THREE.Mesh(tGeo, matWorld);
      m.visible = false;
      m.renderOrder = 13;
      m.frustumCulled = false;
      scene.add(m);
      this.tongues.push({ mesh: m, matWorld, matVM, age: 0, active: false });
    }
    this._shotN = 0;
  }

  update(dt, t) {
    this.smoke.update(dt);
    this.fire.update(dt);
    this.flash.update(dt);
    this.flashVM.update(dt);
    this.petal.update(dt);
    this.petalVM.update(dt);
    this.fireVM.update(dt);
    this.debrisDust.update(dt);
    this.contrail.update(dt);
    this.debris.update(dt);
    this.lights.update(dt);

    // Muzzle light decay
    if (this.muzzleLight.visible) {
      this._muzzleAge += dt;
      const k = 1 - Math.min(1, this._muzzleAge / this._muzzleLife);
      this.muzzleLight.intensity = this._muzzleIntensity * k * k;
      if (k <= 0) this.muzzleLight.visible = false;
    }
    // Tongues: ~45ms total — full for one frame, then a dim tail frame.
    for (const tn of this.tongues) {
      if (!tn.active) continue;
      tn.age += dt;
      if (tn.age > 0.045) { tn.active = false; tn.mesh.visible = false; continue; }
      tn.mesh.material.opacity = tn.age <= 0.02 ? 1 : 0.35;
    }

    for (let i = this.columns.length - 1; i >= 0; i--) {
      const c = this.columns[i];
      c.next -= dt;
      c.remaining -= dt;
      if (c.remaining <= 0) { this.columns.splice(i, 1); continue; }
      if (c.next <= 0) {
        // Anti-stepping pass: wider staggered spawn ring, per-puff lateral
        // DRIFT velocity, strong size/climb variance, jittered cadence and
        // sun-side shading by each puff's offset direction — the column
        // reads as one turbulent mass instead of a stack of identical discs.
        c.next = 0.14 + Math.random() * 0.11;
        const k = Math.min(1, c.remaining / c.total + 0.25);
        const ca = Math.random() * Math.PI * 2;
        const rad = Math.pow(Math.random(), 0.7) * 2.6;
        const ox = Math.cos(ca) * rad, oz = Math.sin(ca) * rad;
        // Skyline veil: mixes against BLUE SKY through the warm grade, so
        // red sits ~10% under green/blue — neutral grey, never magenta.
        this._cc0 = this._cc0 ?? new THREE.Color(0.125, 0.135, 0.13);
        this._cc1 = this._cc1 ?? new THREE.Color(0.37, 0.415, 0.4);
        this._cs0 = this._cs0 ?? new THREE.Color();
        this._cs1 = this._cs1 ?? new THREE.Color();
        sunShade(this._cs0, this._cc0, ox, 0.9, oz, 0.7, 1.12);
        sunShade(this._cs1, this._cc1, ox, 0.9, oz, 0.55, 1.15);
        // Tile by role: mostly tall ragged crowns with dense boils mixed
        // in and the odd wispy shred — a climbing column of DIFFERENT
        // silhouettes instead of one cauliflower at three scales.
        const tr = Math.random();
        this.smoke.spawn({
          pos: this._v.set(c.pos.x + ox, c.pos.y + 0.4 + Math.random() * 1.6, c.pos.z + oz),
          vel: this._v2.set(0.5 + Math.random() * 0.5 + ox * 0.35, 2.0 + Math.random() * 2.4, (Math.random() - 0.5) * 0.5 + oz * 0.35),
          life: 4.6 + Math.random() * 3.6,
          size0: 1.2 + Math.random() * 1.5, size1: 7 + Math.random() * 8,
          color0: this._cs0,
          color1: this._cs1,
          alpha0: (0.55 + Math.random() * 0.22) * k, alpha1: 0,
          rotVel: (Math.random() - 0.5) * 0.6, fadeIn: 0.3 + Math.random() * 0.25,
          aspect: 1.2 + Math.random() * 1.1,
          tile: tr < 0.5 ? 1 : tr < 0.8 ? 0 : 3,
        });
      }
    }
  }

  /** settle=true: the single soft puff a chunk kicks up as it comes to rest.
   *  heavy=true: fat, longer-lived trail puffs for the high-arc money-shot
   *  chunks — the trail (not the 0.3m chunk) is what reads at 40-70m, and
   *  it crosses BLUE SKY above the rooflines, so its greys run cool-neutral
   *  (red under green/blue) like the explosion pillars. */
  _debrisPuff(pos, settle = false, heavy = false) {
    if (heavy && !settle) {
      // Money-shot arc trails: fatter, longer-lived, slightly darker puffs
      // on wider spacing (see DebrisSystem) — the ribbon stays unbroken and
      // SILHOUETTES against the sky/fireball, and 7 bombs' worth of chunks
      // no longer exhaust the pool (dropped spawns = invisible arcs).
      // Three-way tile mix (wispy/tall/dense): forcing only the wispy tile
      // stacked the same Y-shaped shred up every arc — visible repetition
      // at 20-40m.
      const tr = Math.random();
      this.debrisDust.spawn({
        pos,
        vel: this._v4.set((Math.random() - 0.5) * 0.5, 0.5 + Math.random() * 0.4, (Math.random() - 0.5) * 0.5),
        life: 1.1 + Math.random() * 0.5,
        size0: 0.75, size1: 3.1 + Math.random() * 0.9,
        color0: this._dh0 ?? (this._dh0 = new THREE.Color(0.17, 0.18, 0.178)),
        color1: this._dh1 ?? (this._dh1 = new THREE.Color(0.31, 0.335, 0.328)),
        alpha0: 0.74, alpha1: 0, drag: 0.9, fadeIn: 0,
        rotVel: (Math.random() - 0.5) * 0.3,
        tile: tr < 0.4 ? 3 : tr < 0.7 ? 1 : 0,
        aspect: 1.1 + Math.random() * 0.7,
      });
      // ~1 in 5 heavy trail puffs also spits a brief gravity-bent ember
      // streak, so the biggest chunks read as BURNING masonry guttering
      // out along their arc.
      if (Math.random() < 0.2) {
        this.fire.spawn({
          pos,
          vel: this._v3.set((Math.random() - 0.5) * 1.6, -(0.5 + Math.random() * 1.4), (Math.random() - 0.5) * 1.6),
          grav: 7, life: 0.16 + Math.random() * 0.14,
          size0: 0.035, size1: 0.012,
          color0: C_SPARK0, color1: C_SPARK1,
          alpha0: 1, alpha1: 0, fadeIn: 0, stretch: 1,
        });
      }
      return;
    }
    this.debrisDust.spawn({
      pos,
      vel: settle
        ? this._v4.set((Math.random() - 0.5) * 0.3, 0.3 + Math.random() * 0.2, (Math.random() - 0.5) * 0.3)
        : this._v4.set((Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6),
      life: settle ? 0.7 + Math.random() * 0.3 : 0.35 + Math.random() * 0.2,
      size0: settle ? 0.24 : 0.26, size1: settle ? 1.0 : 0.8,
      color0: this._dp0 ?? (this._dp0 = new THREE.Color(0.42, 0.38, 0.32)),
      color1: this._dp1 ?? (this._dp1 = new THREE.Color(0.38, 0.35, 0.3)),
      alpha0: settle ? 0.55 : 0.42, alpha1: 0, drag: 1.4, fadeIn: 0,
      // Half wispy, half random: forcing tile 3 on every thin-trail puff
      // stamped the same pale flake across the smoke.
      tile: settle ? 2 : (Math.random() < 0.5 ? 3 : -1),
    });
  }

  /* -------- shots & impacts -------- */

  impactWall(pos, normal) {
    // Impact sparks: ALL velocity-streaked slivers now — round 7 launched
    // five round dots first ('uniform glowing round dots that float like
    // fireflies instead of streaking'). Fast ricochet launches; the pool
    // re-orients each quad along its CURRENT velocity so gravity bends the
    // streaks into hooks, and the velStretch shader tapers the tail alpha
    // head-to-tail. Thin width (2cm) keeps the bloom halo from rounding
    // them back into dots.
    const nSpark = 6 + ((Math.random() * 3) | 0);
    for (let i = 0; i < nSpark; i++) {
      const v = this._v.copy(normal).multiplyScalar(4 + Math.random() * 7);
      v.x += (Math.random() - 0.5) * 7; v.y += 1 + Math.random() * 5; v.z += (Math.random() - 0.5) * 7;
      this.fire.spawn({
        pos, vel: v, grav: 16, drag: 0.7, life: 0.14 + Math.random() * 0.2,
        size0: 0.02, size1: 0.007, killY: 0.01,
        color0: C_SPARK0, color1: C_SPARK1,
        alpha0: 1, alpha1: 0, fadeIn: 0, stretch: 1,
      });
    }
    // Brief hot pop at the hit point so impacts register at 30m
    this.flash.spawn({
      pos: this._v.copy(pos).addScaledVector(normal, 0.03), life: 0.05,
      size0: 0.15, size1: 0.06, alpha0: 0.7, alpha1: 0, fadeIn: 0, rot: Math.random() * 6.3,
    });
    // Dust puff — bigger/denser so the hit reads at range
    for (let i = 0; i < 4; i++) {
      this.smoke.spawn({
        pos: this._v.copy(pos).addScaledVector(normal, 0.05),
        vel: this._v2.copy(normal).multiplyScalar(1.1 + Math.random() * 1.1)
          .add(this._v3.set((Math.random() - 0.5) * 0.9, 0.6, (Math.random() - 0.5) * 0.9)),
        life: 0.6 + Math.random() * 0.5, size0: 0.2, size1: 1.0 + Math.random() * 0.5,
        color0: this._iw0 ?? (this._iw0 = new THREE.Color(0.62, 0.56, 0.47)),
        color1: this._iw1 ?? (this._iw1 = new THREE.Color(0.55, 0.5, 0.42)),
        alpha0: 0.85, alpha1: 0, drag: 2.2, fadeIn: 0,
      });
    }
  }

  impactDirt(pos) {
    for (let i = 0; i < 5; i++) {
      this.smoke.spawn({
        pos,
        vel: this._v.set((Math.random() - 0.5) * 1.5, 1.8 + Math.random() * 1.8, (Math.random() - 0.5) * 1.5),
        life: 0.7 + Math.random() * 0.5, size0: 0.24, size1: 1.25,
        color0: this._id0 ?? (this._id0 = new THREE.Color(0.66, 0.58, 0.45)),
        color1: this._id1 ?? (this._id1 = new THREE.Color(0.6, 0.53, 0.42)),
        alpha0: 0.85, alpha1: 0, drag: 1.6, grav: 1.2, fadeIn: 0,
      });
    }
  }

  bloodPuff(pos, dir) {
    for (let i = 0; i < 5; i++) {
      this.smoke.spawn({
        pos,
        vel: this._v.copy(dir).multiplyScalar(1 + Math.random() * 1.6)
          .add(this._v2.set((Math.random() - 0.5) * 1.6, Math.random() * 1.2, (Math.random() - 0.5) * 1.6)),
        life: 0.35 + Math.random() * 0.3, size0: 0.1, size1: 0.5,
        color0: this._bp0 ?? (this._bp0 = new THREE.Color(0.36, 0.04, 0.03)),
        color1: this._bp1 ?? (this._bp1 = new THREE.Color(0.22, 0.03, 0.02)),
        alpha0: 0.8, alpha1: 0, grav: 3, fadeIn: 0,
      });
    }
  }

  /**
   * 3-layer muzzle flash rig. vm=true routes sprites/sparks to layer 1
   * (player viewmodel pass) so the weapon camera depth-sorts them against
   * the gun; enemy shots stay in the world pools.
   *  A — 1-frame white-hot core (small, fully additive)
   *  B — radial petal sprites with fbm alpha erosion, random rot/scale
   *  C — 6-10 spark streaks venting sideways from the birdcage
   *  + barrel tongue, 2-frame point light (~3.0m), lingering smoke wisps.
   * ~30% of shots skip the flash/light entirely so bursts flicker.
   */
  muzzle(pos, dir, vm = false) {
    this._shotN++;
    const n10 = this._shotN % 10;
    // Deterministic 30% skip pattern (3 of every 10) so long bursts strobe
    // instead of glowing constantly.
    const skip = (n10 === 3 || n10 === 4 || n10 === 7) && !window.__PHOTO_MODE;
    const mul = this._shotN % 4 === 0 ? 1.2 : 1.0; // every 4th shot blooms bigger

    if (!skip) {
      // Layer A — white-hot core, 1 frame, rooted just off the crown.
      (vm ? this.flashVM : this.flash).spawn({
        pos: this._v.copy(pos).addScaledVector(dir, 0.01),
        life: 0.035,
        size0: (vm ? 0.11 : 0.16) * mul * (0.9 + Math.random() * 0.25),
        size1: (vm ? 0.08 : 0.12) * mul,
        color0: C_CORE, color1: C_CORE1,
        alpha0: 1, alpha1: 0.15, fadeIn: 0, rot: Math.random() * 6.3,
      });
      // Layer B — two radial petal sprites at random rotation/scale merge
      // into a 4-6 petal star that never repeats shot to shot.
      const petals = vm ? this.petalVM : this.petal;
      const pScale = (vm ? 0.17 : 0.34) * mul;
      petals.spawn({
        pos: this._v.copy(pos).addScaledVector(dir, 0.02),
        life: 0.04, size0: pScale * (0.9 + Math.random() * 0.35), size1: pScale * 0.75,
        color0: C_PETAL, color1: C_PETAL1,
        alpha0: 0.95, alpha1: 0, fadeIn: 0, rot: Math.random() * 6.3,
      });
      petals.spawn({
        pos: this._v.copy(pos).addScaledVector(dir, 0.045),
        life: 0.03, size0: pScale * (0.55 + Math.random() * 0.25), size1: pScale * 0.4,
        color0: C_PETAL, color1: C_PETAL1,
        alpha0: 0.8, alpha1: 0, fadeIn: 0, rot: Math.random() * 6.3,
      });
      // Barrel-aligned tongue, random roll, total scale capped at ~1.2
      const tn = this.tongues.find((x) => !x.active);
      if (tn) {
        tn.active = true;
        tn.age = 0;
        tn.mesh.visible = true;
        tn.mesh.layers.set(vm ? 1 : 0);
        // vm tongues swap to the depth-free material + late draw so the
        // weapon pass can't z-cull them behind the flash hider/optic.
        tn.mesh.material = vm ? tn.matVM : tn.matWorld;
        tn.mesh.renderOrder = vm ? 20 : 13;
        tn.mesh.material.opacity = 1;
        tn.mesh.position.copy(pos);
        this._q1.setFromUnitVectors(_FWD, dir);
        this._q2.setFromAxisAngle(dir, Math.random() * Math.PI * 2);
        tn.mesh.quaternion.multiplyQuaternions(this._q2, this._q1);
        const cap = vm ? 0.9 : 1.2;
        const w = Math.min(cap, (0.85 + Math.random() * 0.3) * mul);
        const l = Math.min(cap, (0.78 + Math.random() * 0.3) * mul);
        tn.mesh.scale.set(w, w, l);
      }
      // 2-frame muzzle light (player only — enemies at range don't need it
      // and must never steal the viewmodel's light mid-burst).
      if (vm) {
        this.muzzleLight.position.copy(pos);
        this.muzzleLight.visible = true;
        this._muzzleAge = 0;
        this._muzzleIntensity = 48 * mul;
      }
    }

    // Layer C — spark streaks venting from the birdcage side slots
    // (radially around the bore + slight forward carry). Skipped shots
    // still shed a couple so the weapon never fires visually dead.
    // Round 8: faster launches, thinner quads (1.1cm) and longer streaks —
    // the old short/fat sparks bloomed into 'round dots that float like
    // fireflies'. World sparks ride velocity-length streaks; vm sparks
    // (0.5m from the lens) use fixed ~8cm slivers so they stay needles.
    const sparks = vm ? this.fireVM : this.fire;
    const nSpark = skip ? 2 : 6 + ((Math.random() * 4) | 0);
    // Orthonormal frame around the bore
    const up = Math.abs(dir.y) > 0.94 ? _RIGHT : _UP;
    this._v2.crossVectors(dir, up).normalize();
    this._v3.crossVectors(dir, this._v2).normalize();
    for (let i = 0; i < nSpark; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 5 + Math.random() * 8;
      this._v.copy(this._v2).multiplyScalar(Math.cos(a) * sp)
        .addScaledVector(this._v3, Math.sin(a) * sp)
        .addScaledVector(dir, 2 + Math.random() * 4);
      sparks.spawn({
        pos: this._v4.copy(pos).addScaledVector(dir, 0.01),
        vel: this._v, grav: 13, drag: 2.2,
        life: 0.07 + Math.random() * 0.1,
        size0: 0.011, size1: 0.0045,
        color0: C_SPARK0, color1: C_SPARK1,
        alpha0: 1, alpha1: 0, fadeIn: 0, stretch: vm ? -7 : 1,
      });
    }

    // Muzzle smoke. PLAYER wisps must NOT use the main smoke pool — it
    // near-fades (uNearFade dissolves sprites inside ~1.1-3.2m of the
    // lens) and the vm muzzle sits ~0.5m away, so the wisp spawned at
    // alpha 0 and never escaped the fade window. The contrail pool has no
    // near fade; enemy muzzles are distant and keep the shaded smoke pool.
    const wisps = vm ? this.contrail : this.smoke;
    // Post-flash crown wisps: 2-3 small grey translucent puffs popping off
    // the muzzle crown 3-5 frames AFTER the flash core dies (delay 50-110
    // ms) and drifting UP over ~0.5s — the critic's fix for petals that
    // were 'crisp vector shapes with no post-shot smoke wisp'.
    const nWisp = 2 + (this._shotN & 1);
    for (let i = 0; i < nWisp; i++) {
      wisps.spawn({
        pos: this._v.copy(pos).addScaledVector(dir, 0.04 + i * 0.045),
        vel: this._v2.copy(dir).multiplyScalar(0.45 + Math.random() * 0.4)
          .add(this._v3.set((Math.random() - 0.5) * 0.3, 0.85 + Math.random() * 0.55, (Math.random() - 0.5) * 0.3)),
        delay: 0.05 + i * 0.028 + Math.random() * 0.02,
        life: 0.55 + Math.random() * 0.3,
        size0: 0.05, size1: 0.3 + Math.random() * 0.18,
        color0: C_WISP0, color1: C_WISP1,
        alpha0: 0.46, alpha1: 0, drag: 1.5, fadeIn: 0.03,
        rotVel: (Math.random() - 0.5) * 0.6, tile: 3,
      });
    }
    // ...a thin instant bore puff so the shot isn't smokeless during the
    // flash frames themselves...
    wisps.spawn({
      pos: this._v.copy(pos).addScaledVector(dir, 0.15),
      vel: this._v2.copy(dir).multiplyScalar(1.1).add(this._v3.set(0, 0.7, 0)),
      life: 0.6, size0: 0.09, size1: 0.45,
      color0: C_WISP0, color1: C_WISP1,
      alpha0: 0.3, alpha1: 0, drag: 2.4, fadeIn: 0, tile: 3,
    });
    // ...plus a faint lingering wisp (5-8s drift) on every 3rd shot, so a
    // burst leaves haze hanging at the muzzle after the flashes die.
    if (this._shotN % 3 === 0) {
      wisps.spawn({
        pos: this._v.copy(pos).addScaledVector(dir, 0.2),
        vel: this._v2.copy(dir).multiplyScalar(0.35).add(this._v3.set(0.12, 0.32, 0)),
        life: 5 + Math.random() * 3, size0: 0.14, size1: 1.25,
        color0: C_WISP0, color1: C_WISP1,
        alpha0: 0.16, alpha1: 0, drag: 0.6, rotVel: (Math.random() - 0.5) * 0.2, fadeIn: 0.25, tile: 3,
      });
    }
  }

  addSmokeColumn(pos, duration = 26) {
    this.columns.push({ pos: pos.clone(), remaining: duration, total: duration, next: 0 });
  }
}
