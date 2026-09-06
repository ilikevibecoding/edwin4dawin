// Far-LOD layer: the terrain beyond the ring of real chunks, so the view distance can reach 32 chunks (512 blocks)
// while full chunks only stream to `terrain.nearRadius` (12 / 16 / 20 by quality preset, terrain.js).
//
//   - Tiles of 256 x 256 blocks (64 x 64 cells of 4 blocks; render/farlod/tiles.js) built from the worldgen column
//     sampler, incrementally within `budgetMs` (2 ms) per frame, nearest first, as the player moves; all tiles live
//     in ONE pooled indexed geometry (fixed slot per tile, partial buffer uploads) = one draw call; the frontier
//     town's buildings are one more merged box mesh (render/farlod/town.js) = a second draw call. The Coruscant far
//     city is the skyline impostor mesh (coruscant/skyline.js: towers, landmarks, boulevard decks, skybridges).
//   - Where real chunks exist they win: the far surface sits SURFACE_DROP under the block tops and is depth tested,
//     and inside `terrain.nearCullRadius()` (the radius within which every chunk of the near ring has a mesh) its
//     fragments are discarded outright, so nothing pokes through the near ring - while the ring is still streaming
//     the far layer shows under the unmeshed chunks, so moving fast never opens a hole to the sky.
//   - Shading: the shared sun / sky uniforms (render/shading.js) and the same height-aware fog as the chunks (SHARED
//     fog uniforms, which game.js sets to the sky's near/far every frame - the sky fog follows the view distance).
//   - Disasters, block edits and saves never touch the far layer: it is a picture of the generator's world. Damage is
//     confined to the near ring, which draws over it.
import * as THREE from 'three';
import { SHARED } from '../entityMaterial.js';
import { SHADING_PARS, bindShading } from './shading.js';
import { TileBuilder, VERTS_PER_TILE, INDICES_PER_TILE, TILE_BYTES, TILE as TILE_SIZE, tilesNeeded, tileStale, farRadiusFor } from './farlod/tiles.js';
import { townBoxes, boxGeometry } from './farlod/town.js';

export { TILE, CELL, tilesNeeded, farRadiusFor, farMemoryEstimate } from './farlod/tiles.js';

const VERT = /* glsl */ `
attribute vec4 aColor;
varying vec3 vColor; varying float vWater; varying vec3 vNormal; varying vec3 vWorldPos;
varying float vDist; varying float vFogDist;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vColor = aColor.rgb; vWater = 1.0 - aColor.a;
  vNormal = normal;
  vec4 mv = viewMatrix * wp;
  vDist = length(mv.xyz);
  // same aerial-perspective fog distance as the chunk shader: the vertical offset counts 0.45
  { float fdy = dot(mv.xyz, (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz); vFogDist = sqrt(max(dot(mv.xyz, mv.xyz) - fdy * fdy * 0.7975, 0.0)); }
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uFlash;
uniform float uNearCull; uniform vec2 uPlayerXZ;
varying vec3 vColor; varying float vWater; varying vec3 vNormal; varying vec3 vWorldPos;
varying float vDist; varying float vFogDist;
#if FANCY
${SHADING_PARS}
#endif
void main() {
  // inside the fully meshed near ring the real chunks are the terrain
  if (distance(vWorldPos.xz, uPlayerXZ) < uNearCull) discard;
  vec3 N = normalize(vNormal);
  vec3 albedo = vColor;
#if FANCY
  vec3 V = normalize(uCamPos - vWorldPos);
  // open-sky column (sky light 1): ambient share of the sky light + the directional sun, no block light
  vec3 light = shadingLight(vec3(uSkyLight) * uSkyTint, vec3(0.0), vWorldPos, N, 1.0, vDist);
  light = max(light, vec3(0.035)) + vec3(uFlash);
  vec3 col = albedo * light;
  if (vWater > 0.5) {
    float ndv = max(dot(N, V), 0.0);
    float F = 0.02 + 0.70 * pow(1.0 - ndv, 5.0);
    vec3 refl = mix(skyGradient(reflect(-V, N)), uSkyHorizon, 0.4) * mix(0.6, 1.0, uSkyLight);
    col = mix(col, refl, F * 0.85);
    vec3 glint = sunSpecular(vWorldPos, N, N, V, 0.14, 0.0, albedo, 1.0, vDist);
    col += min(glint, vec3(0.9)) * mix(0.35, 1.0, ndv);
  }
  vec3 fogC = fogColorDir(uFogColor, -V);
#else
  // the block shader's per-face shade (tops 1.0, sides 0.6..0.8) as a function of the slope
  float shade = mix(0.62, 1.0, smoothstep(0.35, 0.95, N.y));
  vec3 light = max(vec3(uSkyLight) * uSkyTint, vec3(0.035)) + vec3(uFlash);
  vec3 col = albedo * light * shade;
  vec3 fogC = uFogColor;
#endif
  float f = smoothstep(uFogNear, uFogFar, vFogDist);
  gl_FragColor = vec4(mix(col, fogC, f), 1.0);
}`;

export function makeFarMaterial() {
  const m = new THREE.ShaderMaterial({
    defines: { FANCY: 0 },
    uniforms: {
      uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar, uFlash: SHARED.uFlash,
      uNearCull: { value: 0 }, uPlayerXZ: { value: new THREE.Vector2() },
    },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.FrontSide, depthWrite: true,
  });
  bindShading(m);   // sun / sky / camera uniforms; FANCY flips with the render pipeline's preset
  return m;
}

// Fixed-slot pool: `capacity` tiles in one indexed geometry. A released slot's indices collapse onto its first
// vertex (degenerate triangles), so the geometry never has to be compacted or re-uploaded as a whole.
class TilePool {
  constructor(capacity) {
    this.capacity = capacity;
    this.pos = new Float32Array(capacity * VERTS_PER_TILE * 3);
    this.col = new Uint8Array(capacity * VERTS_PER_TILE * 4);
    this.nrm = new Int8Array(capacity * VERTS_PER_TILE * 3);
    this.idx = new Uint32Array(capacity * INDICES_PER_TILE);
    for (let s = 0; s < capacity; s++) this.idx.fill(s * VERTS_PER_TILE, s * INDICES_PER_TILE, (s + 1) * INDICES_PER_TILE);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 4, true).setUsage(THREE.DynamicDrawUsage);
    this.aNrm = new THREE.BufferAttribute(this.nrm, 3, true).setUsage(THREE.DynamicDrawUsage);
    this.aIdx = new THREE.BufferAttribute(this.idx, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos);
    g.setAttribute('aColor', this.aCol);
    g.setAttribute('normal', this.aNrm);
    g.setIndex(this.aIdx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
    g.boundingBox = new THREE.Box3(new THREE.Vector3(-1e7, -1e7, -1e7), new THREE.Vector3(1e7, 1e7, 1e7));
    this.geometry = g;
    this.free = [];
    for (let s = capacity - 1; s >= 0; s--) this.free.push(s);
  }
  target(slot) { return { pos: this.pos, col: this.col, nrm: this.nrm, idx: this.idx, vBase: slot * VERTS_PER_TILE, iBase: slot * INDICES_PER_TILE }; }
  commit(slot) {
    const vb = slot * VERTS_PER_TILE, ib = slot * INDICES_PER_TILE;
    this.aPos.addUpdateRange(vb * 3, VERTS_PER_TILE * 3); this.aPos.needsUpdate = true;
    this.aCol.addUpdateRange(vb * 4, VERTS_PER_TILE * 4); this.aCol.needsUpdate = true;
    this.aNrm.addUpdateRange(vb * 3, VERTS_PER_TILE * 3); this.aNrm.needsUpdate = true;
    this.aIdx.addUpdateRange(ib, INDICES_PER_TILE); this.aIdx.needsUpdate = true;
  }
  release(slot) {
    const vb = slot * VERTS_PER_TILE, ib = slot * INDICES_PER_TILE;
    this.idx.fill(vb, ib, ib + INDICES_PER_TILE);
    this.aIdx.addUpdateRange(ib, INDICES_PER_TILE); this.aIdx.needsUpdate = true;
    this.free.push(slot);
  }
  get bytes() { return this.capacity * TILE_BYTES; }
  dispose() { this.geometry.dispose(); }
}

export class FarLOD {
  // opts: { x, z, prebuildMs } - with prebuildMs > 0 the tiles around (x, z) are built synchronously now (loading
  // screen) instead of over the first seconds of play.
  constructor(game, opts = {}) {
    this.game = game;
    this.gen = game.gen || (game.world && game.world.gen);
    this.budgetMs = opts.budgetMs ?? 2;
    this.enabled = true;
    this.tiles = new Map();       // key -> { tx, tz, slot, builder | null }
    this.queue = [];              // tiles being built, nearest first (queue[0] is the active builder)
    this.material = makeFarMaterial();
    this.pool = null;
    this.mesh = null;
    this.townMesh = null;
    this.frame = 0;
    this.lastPlan = { x: Infinity, z: Infinity, farR: 0, nearCull: 0 };
    this.stats = { tiles: 0, building: 0, queued: 0, poolCapacity: 0, bytes: 0, buildMs: 0, builtTotal: 0, nearCull: 0, farRadius: 0, drawCalls: 0 };
    const rd = game.terrain ? game.terrain.renderDistance : 8;
    const px = opts.x ?? 0, pz = opts.z ?? 0;
    this._ensurePool(tilesNeeded(px, pz, farRadiusFor(rd, 0)).length + 6);
    this.mesh = new THREE.Mesh(this.pool.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;         // after the solid chunks: early depth rejects everything they cover
    this.mesh.name = 'far-lod';
    this.mesh.matrixAutoUpdate = false;
    if (game.scene) game.scene.add(this.mesh);
    this._buildTown(game.town);
    if (opts.prebuildMs > 0) this.prebuild(px, pz, opts.prebuildMs, opts.fogFar || 0);
  }

  _ensurePool(capacity) {
    if (this.pool && this.pool.capacity >= capacity && this.pool.capacity <= capacity * 2 + 8) return false;
    // (re)allocate: every built tile is dropped and rebuilt into the new pool over the next frames
    const old = this.pool;
    this.pool = new TilePool(Math.max(capacity, 8));
    if (this.mesh) this.mesh.geometry = this.pool.geometry;
    if (old) old.dispose();
    this.tiles.clear(); this.queue.length = 0;
    this.lastPlan.x = Infinity;
    return true;
  }

  _buildTown(town) {
    if (!town) return;
    let boxes = [];
    try { boxes = townBoxes(town); } catch (e) { console.warn('farlod: town boxes failed', e); }
    if (!boxes.length) return;
    const g = boxGeometry(boxes);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(g.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(g.col, 4, true));
    geo.setAttribute('normal', new THREE.BufferAttribute(g.nrm, 3, true));
    geo.setIndex(new THREE.BufferAttribute(g.idx, 1));
    geo.computeBoundingSphere();
    this.townMesh = new THREE.Mesh(geo, this.material);
    this.townMesh.renderOrder = 1;
    this.townMesh.name = 'far-lod-town';
    this.townBoxes = boxes;
    if (this.game.scene) this.game.scene.add(this.townMesh);
  }

  // Decides which tiles should exist for the player at (px, pz): drops stale ones, queues missing ones nearest first.
  plan(px, pz, farR, nearCull) {
    const needed = tilesNeeded(px, pz, farR, nearCull);
    this._ensurePool(needed.length + 6);   // a reallocation drops every tile; they are all re-queued below
    const neededKeys = new Set();
    for (const n of needed) neededKeys.add(n.key);
    this._drop = this._drop || [];
    this._drop.length = 0;
    for (const t of this.tiles.values()) {
      const dx = Math.max(t.tx * TILE_SIZE - px, 0, px - (t.tx + 1) * TILE_SIZE), dz = Math.max(t.tz * TILE_SIZE - pz, 0, pz - (t.tz + 1) * TILE_SIZE);
      t.dNear = Math.sqrt(dx * dx + dz * dz);
      if (tileStale(t, px, pz, farR, nearCull)) this._drop.push(t);
    }
    for (const t of this._drop) this._release(t);
    for (const n of needed) {
      if (this.tiles.has(n.key)) continue;
      const t = { tx: n.tx, tz: n.tz, key: n.key, slot: -1, builder: null, dNear: n.dNear };
      this.tiles.set(n.key, t);
      this.queue.push(t);
    }
    // make room: tiles in the hysteresis band (built, no longer needed) give their slots to needed ones, farthest first
    let want = 0;
    for (const t of this.queue) if (t.slot < 0) want++;
    while (this.pool.free.length < want) {
      let victim = null;
      for (const t of this.tiles.values()) if (!t.builder && t.slot >= 0 && !neededKeys.has(t.key) && (!victim || t.dNear > victim.dNear)) victim = t;
      if (!victim) break;
      this._release(victim);
    }
    // nearest first; the builder already in progress keeps the head so its sampling is never thrown away
    this.queue.sort((a, b) => (a.builder && !b.builder ? -1 : b.builder && !a.builder ? 1 : a.dNear - b.dNear));
    this.lastPlan = { x: px, z: pz, farR, nearCull };
  }

  _release(t) {
    if (t.builder || t.slot < 0) { const qi = this.queue.indexOf(t); if (qi >= 0) this.queue.splice(qi, 1); }
    if (t.slot >= 0) this.pool.release(t.slot);
    this.tiles.delete(t.key);
  }

  // Runs builders until `budgetMs` is spent; returns the number of tiles completed.
  build(budgetMs) {
    const t0 = performance.now();
    let done = 0;
    while (this.queue.length) {
      const t = this.queue[0];
      if (t.slot < 0) {
        if (!this.pool.free.length) break;   // plan() frees slots as tiles go stale
        t.slot = this.pool.free.pop();
      }
      if (!t.builder) t.builder = new TileBuilder(this.gen, t.tx, t.tz, this.pool.target(t.slot));
      const left = budgetMs - (performance.now() - t0);
      if (left <= 0.05) break;
      if (t.builder.step(left)) {
        this.pool.commit(t.slot);
        this.stats.buildMs += t.builder.stats.ms;
        t.builder = null;
        this.queue.shift();
        done++; this.stats.builtTotal++;
      } else break;
    }
    return done;
  }

  // Synchronous warm-up (loading screen): builds the nearest tiles for up to `ms` milliseconds.
  prebuild(px, pz, ms, fogFar = 0) {
    const terrain = this.game.terrain;
    const rd = terrain ? terrain.renderDistance : 8;
    this.plan(px, pz, farRadiusFor(rd, fogFar), 0);
    const t0 = performance.now();
    while (this.queue.length && performance.now() - t0 < ms) this.build(Math.max(1, ms - (performance.now() - t0)));
    this._refreshStats();
  }

  // Per frame. playerPos: the player's position (the near ring is centred on it); fogFar: the sky's fog end
  // (blocks) so the far coverage always reaches the fog, e.g. Coruscant's longer haze.
  update(dt, playerPos, fogFar = 0) {
    this.frame++;
    const terrain = this.game.terrain;
    if (!terrain || !this.enabled) return;
    const px = playerPos.x, pz = playerPos.z;
    const t0 = performance.now();
    const farR = farRadiusFor(terrain.renderDistance, fogFar);
    const nearCull = terrain.nearCullRadius(px, pz);
    const u = this.material.uniforms;
    u.uNearCull.value = Math.max(0, nearCull - 2);
    u.uPlayerXZ.value.set(px, pz);
    const lp = this.lastPlan;
    const moved = Math.hypot(px - lp.x, pz - lp.z);
    if (moved > 24 || Math.abs(farR - lp.farR) > 32 || Math.abs(nearCull - lp.nearCull) > 48 || (this.frame % 60 === 0)) this.plan(px, pz, farR, nearCull);
    const left = this.budgetMs - (performance.now() - t0);
    if (this.queue.length && left > 0.1) this.build(left);
    this.stats.nearCull = nearCull; this.stats.farRadius = farR;
    this._refreshStats();
  }

  _refreshStats() {
    const s = this.stats;
    s.tiles = this.tiles.size - this.queue.length; s.queued = this.queue.length; s.building = this.queue.length && this.queue[0].builder ? 1 : 0;
    s.poolCapacity = this.pool.capacity; s.bytes = this.memoryBytes(); s.drawCalls = 1 + (this.townMesh ? 1 : 0);
  }

  // CPU-side bytes of the far layer (the GPU holds a copy of the same buffers).
  memoryBytes() {
    let b = this.pool ? this.pool.bytes : 0;
    if (this.townMesh) for (const a of Object.values(this.townMesh.geometry.attributes)) b += a.array.byteLength;
    if (this.townMesh && this.townMesh.geometry.index) b += this.townMesh.geometry.index.array.byteLength;
    return b;
  }

  setVisible(v) { if (this.mesh) this.mesh.visible = v; if (this.townMesh) this.townMesh.visible = v; }

  dispose() {
    if (this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh);
    if (this.townMesh && this.townMesh.parent) { this.townMesh.parent.remove(this.townMesh); this.townMesh.geometry.dispose(); }
    if (this.pool) this.pool.dispose();
    this.material.dispose();
    this.tiles.clear(); this.queue.length = 0;
  }
}
