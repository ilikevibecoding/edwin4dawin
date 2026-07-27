import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { smokeSprite, fireSprite, muzzleSprite, tex } from '../world/textures.js';

/**
 * GPU-billboarded particle pools (one draw call per pool) + debris bodies +
 * a small point-light pool. All game effects are composed from these.
 *
 * Render order contract: fire (11) is drawn first so smoke (12) swallows it;
 * additive flashes/tracers sit on top (13).
 */

const BILLBOARD_VERT = /* glsl */`
  attribute vec3 aCenter;
  attribute float aSize;
  attribute float aRot;
  attribute vec4 aColor;
  attribute vec3 aVel;
  attribute float aStretch;
  attribute float aAge;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFog;
  varying float vAge;
  varying float vStretch;
  uniform float uFogDensity;
  uniform float uVelStretch;
  uniform float uDt;
  void main() {
    vUv = uv;
    vColor = aColor;
    vAge = aAge;
    vStretch = aStretch;
    vec4 mv = modelViewMatrix * vec4(aCenter, 1.0);
    vec2 corner;
    if (aStretch > 0.001) {
      // Elongate along screen-space velocity (embers/sparks streak with motion).
      vec3 vv = mat3(modelViewMatrix) * aVel;
      vec2 d2 = length(vv.xy) > 1e-4 ? normalize(vv.xy) : vec2(1.0, 0.0);
      float len = aStretch * aSize;
      if (uVelStretch > 0.5) {
        // Motion-blur streaks: length follows actual speed each frame
        // (max(0.25m, speed*dt*1.5)) and contracts with age.
        len = max(0.25, length(vv) * uDt * 1.5) * max(0.3, 1.0 - aAge * 0.55);
      }
      vec2 p = vec2(position.x * len, position.y * aSize);
      corner = vec2(p.x * d2.x - p.y * d2.y, p.x * d2.y + p.y * d2.x);
    } else {
      float c = cos(aRot), s = sin(aRot);
      corner = vec2(position.x * c - position.y * s, position.x * s + position.y * c) * aSize;
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
  uniform float uVelStretch;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFog;
  varying float vAge;
  varying float vStretch;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    vec3 col;
    float a;
    if (uErode > 0.5) {
      // Age-driven erosion: threshold climbs with particle age against the
      // noise baked in the sprite's B channel, so plume edges dissolve into
      // ragged fingers instead of resolving as overlapping discs.
      col = vec3(t.r) * vColor.rgb;
      float e = mix(-0.3, 0.85, vAge);
      a = t.a * vColor.a * smoothstep(e, e + 0.25, t.b);
    } else {
      col = t.rgb * vColor.rgb;
      a = t.a * vColor.a;
    }
    if (uVelStretch > 0.5 && vStretch > 0.001) {
      // Head-bright streak gradient: hot tip, fading tail (u=1 is the head)
      a *= mix(0.12, 1.0, smoothstep(0.05, 0.9, vUv.x));
      col *= mix(0.7, 1.25, vUv.x);
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
    upright = false, erode = false, velStretch = false,
  } = {}) {
    this.capacity = capacity;
    // Upright pools (vertically shaded smoke) keep spawn rotation near zero
    // and clamp spin so the baked top-light/bottom-shadow never flips over.
    this.upright = upright;
    this.particles = [];
    this.free = [];
    for (let i = 0; i < capacity; i++) this.free.push(i);
    this.data = new Array(capacity).fill(null);

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
    geo.setAttribute('aCenter', this.aCenter);
    geo.setAttribute('aSize', this.aSize);
    geo.setAttribute('aRot', this.aRot);
    geo.setAttribute('aColor', this.aColor);
    geo.setAttribute('aVel', this.aVel);
    geo.setAttribute('aStretch', this.aStretch);
    geo.setAttribute('aAge', this.aAge);
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
        uVelStretch: { value: velStretch ? 1 : 0 },
        uDt: { value: 1 / 60 },
      },
      transparent: true,
      depthWrite: false,
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
    this.mesh.renderOrder = renderOrder ?? (additive ? 12 : 11);
    scene.add(this.mesh);
    this.geo = geo;
  }

  /**
   * Spawn a particle.
   * o: { pos, vel, grav, drag, life, size0, size1, rot, rotVel,
   *      color0, color1, alpha0, alpha1, fadeIn, delay, stretch,
   *      trail: { every, emit(pos) } }  — trail emits sub-stepped along the
   *      movement segment every `every` metres, so fast movers never dot.
   */
  spawn(o) {
    if (!this.free.length) return;
    const i = this.free.pop();
    this.data[i] = {
      age: 0,
      delay: o.delay ?? 0,
      pos: o.pos.clone(),
      vel: o.vel ? o.vel.clone() : new THREE.Vector3(),
      grav: o.grav ?? 0,
      drag: o.drag ?? 0,
      life: o.life ?? 1,
      size0: o.size0 ?? 1, size1: o.size1 ?? o.size0 ?? 1,
      rot: o.rot ?? (this.upright ? (Math.random() - 0.5) * 0.7 : Math.random() * Math.PI * 2),
      rotVel: this.upright ? THREE.MathUtils.clamp(o.rotVel ?? 0, -0.3, 0.3) : (o.rotVel ?? 0),
      stretch: o.stretch ?? 0,
      color0: o.color0 ?? new THREE.Color(1, 1, 1),
      color1: o.color1 ?? o.color0 ?? new THREE.Color(1, 1, 1),
      alpha0: o.alpha0 ?? 1, alpha1: o.alpha1 ?? 0,
      fadeIn: o.fadeIn ?? 0.06,
      trail: o.trail ?? null,
      trailAcc: 0,
    };
  }

  update(dt) {
    let n = 0;
    const c = new THREE.Color();
    if (!this._tv) this._tv = new THREE.Vector3();
    // Frame delta for velocity-length streaks (clamped so pauses/spikes
    // can't blow streaks across the screen)
    this.mesh.material.uniforms.uDt.value = Math.min(0.05, Math.max(0.004, dt));
    for (let i = 0; i < this.capacity; i++) {
      const p = this.data[i];
      if (!p) continue;
      if (p.delay > 0) { p.delay -= dt; continue; } // delayed emitter entry
      p.age += dt;
      if (p.age >= p.life) { this.data[i] = null; this.free.push(i); continue; }
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
      this.aAge.needsUpdate = true;
    }
  }
}

/* --------------------------- local sprite bakes -------------------------- */

/**
 * Smoke sprite with baked vertical shading: +35% luminance at the top edge,
 * -40% at the bottom, so puffs read volumetric (sky-lit crown, shadowed
 * underside). Pools using it should be `upright` so the bake never flips.
 *
 * Channel layout for `erode` pools: R/G = shaded luminance capped at 0.82
 * (lit dust must never clip to white through the warm grade), B = erosion
 * noise field consumed by the shader's age-driven dissolve.
 */
function shadedSmokeCanvas(size = 128, seed = 7) {
  const c = smokeSprite(size, seed);
  const ctx = c.getContext('2d');
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const n1 = bakeNoise(7, seed * 977 + 11);
  const n2 = bakeNoise(15, seed * 977 + 53);
  const n3 = bakeNoise(29, seed * 977 + 97);
  for (let y = 0; y < size; y++) {
    const v = y / (size - 1);
    const shade = 1.35 + (0.6 - 1.35) * v;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const lum = Math.min(209, d[i] * shade); // cap ~0.82
      d[i] = lum;
      d[i + 1] = lum;
      const u = x / (size - 1);
      d[i + 2] = (n1(u, v) * 0.55 + n2(u, v) * 0.3 + n3(u, v) * 0.15) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Small value-noise for sprite bakes (deterministic, bilinear). */
function bakeNoise(freq, seed) {
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
 * Fire sprite with erosion-noise rim: instead of a smooth radial falloff,
 * the outer half is eaten by thresholded fbm (ragged holes and fingers) and
 * the rgb ramps hard toward dark ember red at the boundary — overlapping
 * fireball sprites stop reading as a cauliflower of circles.
 */
function erodedFireCanvas(size = 128, seed = 9) {
  const c = fireSprite(size, seed);
  const ctx = c.getContext('2d');
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const n1 = bakeNoise(6, seed * 131 + 7);
  const n2 = bakeNoise(13, seed * 131 + 61);
  const n3 = bakeNoise(27, seed * 131 + 113);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const cx = u - 0.5, cy = v - 0.5;
      const r = Math.sqrt(cx * cx + cy * cy) * 2;
      const n = n1(u, v) * 0.5 + n2(u, v) * 0.32 + n3(u, v) * 0.18;
      // Erosion mask: interior intact, rim increasingly carved where the
      // noise dips — sharp-ish threshold makes holes, not a soft fade.
      const e = (n - (r - 0.38) * 1.5) * 3.4;
      const k = e < 0 ? 0 : e > 1 ? 1 : e;
      const i = (y * size + x) * 4;
      // Fast color ramp to dark at the rim so sprite silhouettes vanish
      const dark = Math.max(0.16, Math.min(1, 1.35 - r * 1.15 - (1 - k) * 0.35));
      d[i] = d[i] * dark;
      d[i + 1] = d[i + 1] * dark * 0.9;
      d[i + 2] = d[i + 2] * dark * 0.8;
      d[i + 3] = d[i + 3] * (k * k);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/* ------------------------------- debris -------------------------------- */

// Palette pre-multiplied ~0.65: sunlit dust otherwise reads landed chunks
// as pale crumpled paper. Everything sits between scorched earth and char.
const DEBRIS_PALETTE = [
  new THREE.Color(0x3d372f), // dusty mortar (0x5c5348 x 0.66)
  new THREE.Color(0x312c25), // dark earth  (0x4a4238 x 0.66)
  new THREE.Color(0x4c463e), // concrete    (0x6b6156 x 0.72)
  new THREE.Color(0x151412), // char
];

export class DebrisSystem {
  /** onPuff(pos): callback used by large airborne chunks to drop smoke. */
  constructor(scene, capacity = 160, onPuff = null) {
    this.onPuff = onPuff;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._eu = new THREE.Euler();
    this._s = new THREE.Vector3();
    this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
    this._c = new THREE.Color();
    this._pv = new THREE.Vector3();

    // Three silhouettes: stretched shard, plank, vertex-jittered chunk.
    const shard = new THREE.TetrahedronGeometry(0.08);
    shard.scale(0.6, 0.6, 1.9);
    const plank = new THREE.BoxGeometry(0.4, 0.06, 0.03);
    const chunk = this._jitteredBox(0.15);

    const nShard = Math.max(4, Math.round(capacity * 0.375));
    const nPlank = Math.max(4, Math.round(capacity * 0.25));
    const nChunk = Math.max(4, capacity - nShard - nPlank);
    this.pools = [
      this._makePool(scene, shard, nShard, 0.045, false),
      this._makePool(scene, plank, nPlank, 0.022, false),
      this._makePool(scene, chunk, nChunk, 0.08, true),
    ];
  }

  _jitteredBox(s) {
    // Subdivided box with per-vertex displacement (welded across faces):
    // 26 jittered vertices make an irregular rock, not an 8-corner crate.
    const geo = new THREE.BoxGeometry(s, s, s, 2, 2, 2);
    const p = geo.attributes.position;
    const map = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(4)}|${p.getY(i).toFixed(4)}|${p.getZ(i).toFixed(4)}`;
      let o = map.get(key);
      if (!o) {
        o = [(Math.random() - 0.5) * s * 0.5, (Math.random() - 0.5) * s * 0.5, (Math.random() - 0.5) * s * 0.5];
        map.set(key, o);
      }
      p.setXYZ(i, p.getX(i) + o[0], p.getY(i) + o[1], p.getZ(i) + o[2]);
    }
    geo.computeVertexNormals();
    return geo;
  }

  _makePool(scene, geo, n, restY, chunky) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0.02 });
    // Down-facing fragments drop to ~55% albedo (world-normal Y darken):
    // undersides read shadowed instead of flat paper-bright.
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
        {
          float dbWy = dot(normal, viewMatrix[1].xyz);
          diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(-0.85, 0.4, dbWy));
        }`
      );
    };
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
    for (let i = 0; i < n; i++) free.push(i);
    return { mesh, items: new Array(n).fill(null), free, restY, chunky };
  }

  /** scale is a characteristic size (m-ish); ~0.09 maps to 1x geometry. */
  spawn(pos, vel, scale = 0.09, life = 3.2) {
    const roll = Math.random();
    const type = roll < 0.4 ? 0 : roll < 0.6 ? 1 : 2;
    const pool = this.pools[type];
    if (!pool.free.length) return;
    const i = pool.free.pop();
    let mult = THREE.MathUtils.clamp(scale / 0.09, 0.45, 1.4);
    if (type === 1) mult = Math.min(mult, 1.35); // planks stay plank-sized
    const cr = Math.random();
    const cIdx = cr < 0.4 ? 0 : cr < 0.65 ? 1 : cr < 0.85 ? 2 : 3;
    this._c.copy(DEBRIS_PALETTE[cIdx]).multiplyScalar(0.85 + Math.random() * 0.25);
    pool.mesh.setColorAt(i, this._c);
    pool.mesh.instanceColor.needsUpdate = true;
    pool.items[i] = {
      pos: pos.clone(), vel: vel.clone(),
      rot: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3),
      rotVel: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12),
      mult, life, age: 0, rest: false,
      // Distance-based dust trail (sub-stepped); staggered start offset
      trailAcc: Math.random() * 0.4,
    };
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
          // Sub-stepped dust trail: puffs interpolated every 0.4m of travel
          // (interval timers dotted the arcs at launch speeds).
          if (this.onPuff && !d.rest) {
            const dx = d.pos.x - ox, dy = d.pos.y - oy, dz = d.pos.z - oz;
            const seg = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (seg > 1e-6) {
              d.trailAcc += seg;
              while (d.trailAcc >= 0.4) {
                d.trailAcc -= 0.4;
                const k = d.trailAcc / seg;
                this._pv.set(d.pos.x - dx * k, d.pos.y - dy * k, d.pos.z - dz * k);
                if (this._pv.y > 0.15) this.onPuff(this._pv, false);
              }
            }
          }
          d.rot.x += d.rotVel.x * dt; d.rot.y += d.rotVel.y * dt; d.rot.z += d.rotVel.z * dt;
        }
        const fadeSpan = d.rest ? 2.0 : d.life * 0.18;
        const fade = Math.min(1, Math.max(0, (d.life - d.age) / fadeSpan));
        const s = d.mult * fade;
        // Shrink into the ground while settling so the chunk never floats
        if (d.rest) d.pos.y = pool.restY * d.mult * fade;
        this._q.setFromEuler(d.rot);
        this._m.compose(d.pos, this._q, this._s.set(s, s, s));
        pool.mesh.setMatrixAt(i, this._m);
        dirty = true;
      }
      if (dirty) pool.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

/* ------------------------------ light pool ------------------------------ */

export class LightPool {
  constructor(scene, n = 6) {
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
    let slot = this.lights.find((s) => s.age >= s.life);
    if (!slot) slot = this.lights[0];
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
  // Slim axial streak keeps a directional spike without a razor edge
  lobe(w * 0.62, mid, w * 0.38, h * 0.085, '255,196,120', 0.3);
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

export class FX {
  constructor(scene, quality = 'high') {
    this.scene = scene;
    const big = quality !== 'medium';
    // Smoke draws over fire so fireballs get swallowed by their own smoke.
    // Vertically-shaded sprite + upright spawns: lit crowns, shadowed bellies.
    this.smoke = new ParticlePool(scene, shadedSmokeCanvas(128, 7), { capacity: big ? 640 : 320, renderOrder: 12, upright: true, erode: true });
    // Fire uses the erosion-rim sprite: ragged alpha holes at the boundary
    // hide individual sprite silhouettes inside fireballs. velStretch: ember
    // quads elongate to real per-frame travel with a head-bright gradient.
    this.fire = new ParticlePool(scene, erodedFireCanvas(128, 9), { capacity: big ? 420 : 240, premultiplied: true, renderOrder: 11, velStretch: true });
    this.flash = new ParticlePool(scene, muzzleSprite(128), { capacity: 60, additive: true, renderOrder: 13 });
    // Player muzzle flash sprites render in the viewmodel pass (layer 1) so
    // the 50° weapon camera depth-sorts them against the gun.
    this.flashVM = new ParticlePool(scene, muzzleSprite(128), { capacity: 24, additive: true, renderOrder: 13 });
    this.flashVM.mesh.layers.set(1);
    // Dedicated pool for airborne-debris dust trails so heavy strikes can't
    // starve the explosion smoke of instances.
    this.debrisDust = new ParticlePool(scene, shadedSmokeCanvas(64, 11), { capacity: big ? 768 : 384, renderOrder: 12, upright: true, erode: true });
    // High-capacity ribbon pool for jet contrails and falling-bomb trails —
    // fast movers need dense sub-stepped puffs that would starve the main
    // smoke pool. Non-upright so velocity-stretched segments work.
    this.contrail = new ParticlePool(scene, smokeSprite(64, 5), { capacity: big ? 3072 : 1536, renderOrder: 12 });
    this.debris = new DebrisSystem(scene, big ? 160 : 80, (pos, settle) => this._debrisPuff(pos, settle));
    this.lights = new LightPool(scene, 6);
    this.columns = []; // lingering smoke emitters
    this.onShake = null;
    this._v = new THREE.Vector3();
    this._q1 = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();

    // Dedicated muzzle light — never evicted by explosion flashes. Tame:
    // warm, short-throw, and skipped on the shots that skip the sprite.
    this.muzzleLight = new THREE.PointLight(0xffd9a0, 0, 4, 2);
    this.muzzleLight.visible = false;
    this.muzzleLight.layers.enable(1);
    scene.add(this.muzzleLight);
    this._muzzleAge = 1;
    this._muzzleLife = 0.045;
    this._muzzleIntensity = 20;

    // Barrel-aligned flash tongues (additive crossed quads; player shots
    // move them to layer 1 so they depth-sort against the viewmodel).
    const tTex = tex(tongueCanvas());
    tTex.wrapS = tTex.wrapT = THREE.ClampToEdgeWrapping;
    tTex.colorSpace = THREE.SRGBColorSpace;
    const tGeo = tongueGeometry();
    this.tongues = [];
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: tTex, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      });
      mat.color.setRGB(2.6, 2.4, 2.0); // white-hot HDR core; tips stay orange via the map
      const m = new THREE.Mesh(tGeo, mat);
      m.visible = false;
      m.renderOrder = 13;
      m.frustumCulled = false;
      scene.add(m);
      this.tongues.push({ mesh: m, age: 0, active: false });
    }
    this._shotN = 0;
  }

  update(dt, t) {
    this.smoke.update(dt);
    this.fire.update(dt);
    this.flash.update(dt);
    this.flashVM.update(dt);
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
        c.next = 0.12 + Math.random() * 0.08;
        const k = Math.min(1, c.remaining / c.total + 0.25);
        this.smoke.spawn({
          pos: c.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.8, 0.5, (Math.random() - 0.5) * 1.8)),
          vel: new THREE.Vector3(0.6 + Math.random() * 0.5, 2.8 + Math.random() * 1.6, (Math.random() - 0.5) * 0.4),
          life: 5.5 + Math.random() * 3,
          size0: 1.8, size1: 9 + Math.random() * 5,
          color0: new THREE.Color(0.14, 0.13, 0.12), color1: new THREE.Color(0.42, 0.4, 0.38),
          alpha0: 0.7 * k, alpha1: 0, rotVel: (Math.random() - 0.5) * 0.5, fadeIn: 0.4,
        });
      }
    }
  }

  /** settle=true: the single soft puff a chunk kicks up as it comes to rest. */
  _debrisPuff(pos, settle = false) {
    this.debrisDust.spawn({
      pos: pos.clone(),
      vel: settle
        ? new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.3 + Math.random() * 0.2, (Math.random() - 0.5) * 0.3)
        : new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6),
      life: settle ? 0.7 + Math.random() * 0.3 : 0.5 + Math.random() * 0.3,
      size0: settle ? 0.24 : 0.3, size1: settle ? 1.0 : 0.9,
      color0: new THREE.Color(0.42, 0.38, 0.32), color1: new THREE.Color(0.38, 0.35, 0.3),
      alpha0: settle ? 0.55 : 0.5, alpha1: 0, drag: 1.4, fadeIn: 0,
    });
  }

  /* -------- shots & impacts -------- */

  impactWall(pos, normal) {
    // Sparks (premultiplied fire pool — HDR colors carry the punch)
    for (let i = 0; i < 5; i++) {
      const v = normal.clone().multiplyScalar(2 + Math.random() * 4);
      v.x += (Math.random() - 0.5) * 4; v.y += Math.random() * 3.5; v.z += (Math.random() - 0.5) * 4;
      this.fire.spawn({
        pos: pos.clone(), vel: v, grav: 14, life: 0.16 + Math.random() * 0.22,
        size0: 0.055, size1: 0.015,
        color0: new THREE.Color(3.2, 2.5, 1.3), color1: new THREE.Color(2.4, 0.9, 0.2),
        alpha0: 1, alpha1: 0, fadeIn: 0,
      });
    }
    // 2-3 hard-surface spark STREAKS — faster, velocity-stretched slivers
    const nStreak = 2 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < nStreak; i++) {
      const v = normal.clone().multiplyScalar(3.5 + Math.random() * 5);
      v.x += (Math.random() - 0.5) * 5; v.y += 1 + Math.random() * 4; v.z += (Math.random() - 0.5) * 5;
      this.fire.spawn({
        pos: pos.clone(), vel: v, grav: 18, life: 0.13 + Math.random() * 0.12,
        size0: 0.05, size1: 0.02,
        color0: new THREE.Color(3.6, 2.9, 1.5), color1: new THREE.Color(2.6, 1.0, 0.2),
        alpha0: 1, alpha1: 0, fadeIn: 0, stretch: 4.5 + Math.random() * 2,
      });
    }
    // Brief hot pop at the hit point so impacts register at 30m
    this.flash.spawn({
      pos: pos.clone().addScaledVector(normal, 0.03), life: 0.05,
      size0: 0.15, size1: 0.06, alpha0: 0.7, alpha1: 0, fadeIn: 0, rot: Math.random() * 6.3,
    });
    // Dust puff — bigger/denser so the hit reads at range
    for (let i = 0; i < 4; i++) {
      this.smoke.spawn({
        pos: pos.clone().addScaledVector(normal, 0.05),
        vel: normal.clone().multiplyScalar(1.1 + Math.random() * 1.1).add(new THREE.Vector3((Math.random() - 0.5) * 0.9, 0.6, (Math.random() - 0.5) * 0.9)),
        life: 0.6 + Math.random() * 0.5, size0: 0.2, size1: 1.0 + Math.random() * 0.5,
        color0: new THREE.Color(0.62, 0.56, 0.47), color1: new THREE.Color(0.55, 0.5, 0.42),
        alpha0: 0.85, alpha1: 0, drag: 2.2, fadeIn: 0,
      });
    }
  }

  impactDirt(pos) {
    for (let i = 0; i < 5; i++) {
      this.smoke.spawn({
        pos: pos.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.8 + Math.random() * 1.8, (Math.random() - 0.5) * 1.5),
        life: 0.7 + Math.random() * 0.5, size0: 0.24, size1: 1.25,
        color0: new THREE.Color(0.66, 0.58, 0.45), color1: new THREE.Color(0.6, 0.53, 0.42),
        alpha0: 0.85, alpha1: 0, drag: 1.6, grav: 1.2, fadeIn: 0,
      });
    }
  }

  bloodPuff(pos, dir) {
    for (let i = 0; i < 5; i++) {
      this.smoke.spawn({
        pos: pos.clone(),
        vel: dir.clone().multiplyScalar(1 + Math.random() * 1.6).add(new THREE.Vector3((Math.random() - 0.5) * 1.6, Math.random() * 1.2, (Math.random() - 0.5) * 1.6)),
        life: 0.35 + Math.random() * 0.3, size0: 0.1, size1: 0.5,
        color0: new THREE.Color(0.36, 0.04, 0.03), color1: new THREE.Color(0.22, 0.03, 0.02),
        alpha0: 0.8, alpha1: 0, grav: 3, fadeIn: 0,
      });
    }
  }

  /** vm=true routes the flash to layer 1 (player viewmodel pass) so the
   *  weapon camera depth-sorts it against the gun. Enemy shots stay world. */
  muzzle(pos, dir, vm = false) {
    this._shotN++;
    const mul = this._shotN % 4 === 0 ? 1.15 : 1.0; // every 4th shot blooms a touch bigger
    // ~30% of shots skip both the sprite and the light so bursts flicker.
    const skip = Math.random() < 0.3;
    if (!skip) {
      (vm ? this.flashVM : this.flash).spawn({
        pos: pos.clone(), life: 0.03,
        size0: (0.13 + Math.random() * 0.07) * mul, size1: 0.1 * mul,
        alpha0: 0.85, alpha1: 0.2, fadeIn: 0, rot: Math.random() * 6.3,
      });
    }
    // Barrel-aligned tongues, random roll, total scale capped at ~1.2
    const tn = this.tongues.find((x) => !x.active);
    if (tn) {
      tn.active = true;
      tn.age = 0;
      tn.mesh.visible = true;
      tn.mesh.layers.set(vm ? 1 : 0);
      tn.mesh.material.opacity = 1;
      tn.mesh.position.copy(pos);
      this._q1.setFromUnitVectors(_FWD, dir);
      this._q2.setFromAxisAngle(dir, Math.random() * Math.PI * 2);
      tn.mesh.quaternion.multiplyQuaternions(this._q2, this._q1);
      const w = Math.min(1.2, (0.85 + Math.random() * 0.3) * mul);
      // Length capped so the streak tops out ~0.35m instead of reading 0.5m
      const l = Math.min(1.1, (0.78 + Math.random() * 0.3) * mul);
      tn.mesh.scale.set(w, w, l);
    }
    // Dedicated muzzle light (skipped with the sprite)
    if (!skip) {
      this.muzzleLight.position.copy(pos);
      this.muzzleLight.visible = true;
      this._muzzleAge = 0;
      this._muzzleIntensity = 20 * mul;
    }
    // Smoke wisp — alpha 0.4 so burst frames read case + wisp + flash
    this.smoke.spawn({
      pos: pos.clone().addScaledVector(dir, 0.15),
      vel: dir.clone().multiplyScalar(1.1).add(new THREE.Vector3(0, 0.7, 0)),
      life: 0.7, size0: 0.1, size1: 0.55,
      color0: new THREE.Color(0.55, 0.53, 0.5), color1: new THREE.Color(0.5, 0.48, 0.46),
      alpha0: 0.4, alpha1: 0, drag: 2.4, fadeIn: 0,
    });
  }

  addSmokeColumn(pos, duration = 26) {
    this.columns.push({ pos: pos.clone(), remaining: duration, total: duration, next: 0 });
  }
}
