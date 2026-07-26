// Combat VFX — owner: Fable 4b (VFX & atmosphere).
// Pooled, quality-scaled, deterministic effects driven by combat events:
//   muzzle flashes by weapon family, shell casings, tracers, per-surface
//   impact bursts, glass shatter, smoke/flash grenades, kill feedback,
//   and ambient emitters (van exhaust, extraction signal smoke).
// Contract with game.js (unchanged): new Vfx(scene); vfx.muzzleFlash(pos, dir,
// weaponId); vfx.spawnSmoke(pos, radius, duration); vfx.smokeBlocks(a, b);
// vfx.update(dt); vfx.dispose().
//
// Hard rules honored here: everything is pooled (no unbounded allocation, no
// per-frame material creation), all randomness routes through worldRng, all
// textures are canvas-generated, all counts respect qualityPreset().

import * as THREE from 'three';
import { on } from '../core/events.js';
import { getSetting, qualityPreset } from '../core/settings.js';
import { worldRng } from '../core/rng.js';
import { sfx } from '../core/audio.js';

// ---------------------------------------------------------------------------
// Shared session state (set by sibling owned files, consumed here)
// ---------------------------------------------------------------------------
let sharedWorld = null;                    // set by weather.js each session
export function setVfxWorld(w) { sharedWorld = w; }

// Ambient emitters: persistent diegetic particle sources registered by
// vehicles.js (van exhaust, extraction signal smoke). Cleared on dispose.
const ambientEmitters = [];
export function registerAmbientEmitter(spec) {
  const e = { rate: 1, acc: 0, ...spec };
  ambientEmitters.push(e);
  return e;
}

// Decals module is written by a sibling agent in parallel — import it lazily
// and feature-check so this file works before/without it.
let decalsMod = null;
import('../world/decals.js')
  .then((m) => { decalsMod = m; })
  .catch(() => { decalsMod = null; });
function tryImpactDecal(surface, point, normal) {
  if (decalsMod && typeof decalsMod.spawnImpactDecal === 'function') {
    try { decalsMod.spawnImpactDecal(surface, point, normal); } catch { /* decal errors never break combat */ }
  }
}
function tryBloodDecal(point, normal) {
  if (decalsMod && typeof decalsMod.spawnBloodDecal === 'function') {
    try { decalsMod.spawnBloodDecal(point, normal); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Canvas textures (generated once per page, shared by every session)
// ---------------------------------------------------------------------------
let TEX = null;
function makeCanvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function textures() {
  if (TEX) return TEX;
  // soft round dot: puff cores, glow heads
  const soft = makeCanvas(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
  // blotchy smoke puff: 5 offset radial blobs
  const puff = makeCanvas(128, (ctx, s) => {
    const blobs = [[0.5, 0.5, 0.46, 0.85], [0.34, 0.42, 0.3, 0.5], [0.66, 0.44, 0.28, 0.5], [0.44, 0.64, 0.3, 0.45], [0.62, 0.62, 0.26, 0.4]];
    for (const [x, y, r, a] of blobs) {
      const g = ctx.createRadialGradient(x * s, y * s, 0, x * s, y * s, r * s);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }
  });
  // layered muzzle star: hot core + 6 tapered spokes (warm-white core is the
  // readability rule from the visual bible: reads on snow AND office interiors)
  const star = makeCanvas(128, (ctx, s) => {
    const cx = s / 2, cy = s / 2;
    ctx.translate(cx, cy);
    for (let i = 0; i < 6; i++) {
      const len = (i % 2 === 0 ? 0.48 : 0.3) * s;
      const wid = (i % 2 === 0 ? 0.055 : 0.04) * s;
      ctx.rotate(Math.PI / 3);
      const g = ctx.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, 'rgba(255,236,200,0.95)');
      g.addColorStop(0.5, 'rgba(255,190,110,0.5)');
      g.addColorStop(1, 'rgba(255,150,70,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -wid);
      ctx.lineTo(len, 0);
      ctx.lineTo(0, wid);
      ctx.closePath();
      ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 0.2 * s);
    core.addColorStop(0, 'rgba(255,255,246,1)');
    core.addColorStop(0.55, 'rgba(255,214,150,0.85)');
    core.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, s, s);
  });
  // flashbang ray burst: many thin rays + blown core
  const rays = makeCanvas(256, (ctx, s) => {
    const cx = s / 2, cy = s / 2;
    ctx.translate(cx, cy);
    for (let i = 0; i < 14; i++) {
      ctx.rotate((Math.PI * 2) / 14);
      const len = (0.34 + (i % 3) * 0.07) * s;
      const g = ctx.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(230,240,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -0.012 * s);
      ctx.lineTo(len, 0);
      ctx.lineTo(0, 0.012 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 0.3 * s);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(0.6, 'rgba(240,246,255,0.7)');
    core.addColorStop(1, 'rgba(230,240,255,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, s, s);
  });
  TEX = { soft, puff, star, rays };
  return TEX;
}

// ---------------------------------------------------------------------------
// Effect design tables
// ---------------------------------------------------------------------------
// Muzzle flash family per weapon id. size = star sprite scale (m), lance =
// forward streak length (m, 0 = none), light intensity, wisps = smoke count.
const FLASH_FAMILY = {
  vireo:     { size: 0.34, lance: 0,    light: 8,  wisps: 1, ttl: 0.05 }, // pistol: small
  kestrel:   { size: 0.3,  lance: 0,    light: 7,  wisps: 1, ttl: 0.04 }, // smg: rapid small
  ridgeline: { size: 0.46, lance: 0.55, light: 12, wisps: 1, ttl: 0.055 }, // carbine: medium
  boreas:    { size: 0.72, lance: 0.4,  light: 16, wisps: 2, ttl: 0.07 }, // shotgun: wide
  longwatch: { size: 0.5,  lance: 1.35, light: 15, wisps: 2, ttl: 0.075 }, // rifle: long lance
};
// Shell casing look per family: [len, radius-ish width, color]
const CASING_FAMILY = {
  vireo: [0.024, 0.009, 0xc8a24a], kestrel: [0.024, 0.009, 0xc8a24a],
  ridgeline: [0.042, 0.01, 0xc8a24a], boreas: [0.062, 0.019, 0xa03c30],
  longwatch: [0.056, 0.012, 0xb08a3e],
};

// Per-surface impact recipe. debris: [count, color list, speed, size, ttl,
// gravity, additive]; puffs: [count, color, size, riseSpeed, ttl].
const IMPACTS = {
  concrete: { debris: [6, [0xc9c5ba, 0x9a968c, 0x8d8d88], 2.6, 0.028, 0.42, 12, false], puffs: [1, 0xb5b2a8, 0.5, 0.5, 0.7] },
  drywall:  { debris: [4, [0xe6e2d8, 0xd8d4c8], 2.0, 0.026, 0.4, 10, false],           puffs: [2, 0xeae6da, 0.55, 0.32, 1.25] },
  wood:     { debris: [7, [0xa07850, 0x6f5230, 0x8a6a48], 2.8, 0.03, 0.5, 13, false], puffs: [1, 0xa89878, 0.34, 0.4, 0.55], splinter: true },
  metal:    { debris: [9, [0xffe9a8, 0xffd890, 0xfff4d0], 4.4, 0.02, 0.32, 7, true],  puffs: [0], light: [0xffd890, 6, 0.05] },
  glass:    { debris: [8, [0xd8ecf4, 0xeef7fb, 0xb8dcE8], 2.4, 0.02, 0.45, 11, true], puffs: [0] },
  carpet:   { debris: [4, [0x8a8478, 0x6e685e], 1.5, 0.024, 0.4, 8, false],           puffs: [1, 0x968e80, 0.36, 0.3, 0.8] },
  fabric:   { debris: [4, [0x8a8478, 0x7a7468], 1.5, 0.024, 0.4, 8, false],           puffs: [1, 0x9a948a, 0.36, 0.3, 0.8] },
  tile:     { debris: [6, [0xd0d4d2, 0xb0b4b2], 2.6, 0.024, 0.4, 12, false],          puffs: [1, 0xc4c8c6, 0.36, 0.4, 0.5] },
  vinyl:    { debris: [4, [0x9fa39c, 0x83877f], 2.0, 0.024, 0.38, 10, false],         puffs: [1, 0xa8aca4, 0.32, 0.35, 0.5] },
  snow:     { debris: [3, [0xffffff, 0xeef4f9], 1.6, 0.03, 0.5, 6, false],            puffs: [2, 0xf4f8fc, 0.6, 0.42, 0.9] },
  flesh:    { debris: [5, [0x7a1f18, 0x5a1410], 2.2, 0.022, 0.36, 12, false],         puffs: [1, 0x69201a, 0.34, 0.2, 0.5] },
  paper:    { debris: [4, [0xe8e6dd, 0xd8d6cd], 1.4, 0.03, 0.6, 5, false],            puffs: [1, 0xdcdacf, 0.3, 0.3, 0.6] },
};
IMPACTS.plaster = IMPACTS.drywall;
IMPACTS.brick = IMPACTS.concrete;
IMPACTS.default = IMPACTS.concrete;

const SMOKE_TONES = [0xaeb4ba, 0xc0c6cb, 0x9aa0a6]; // 3 gray tones

// scratch vectors (never allocate in update loops)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function groundYAt(x, z, y) {
  if (sharedWorld) {
    const g = sharedWorld.groundAt(x, z, y + 0.3, 0.4);
    if (g.y > -100) return g.y;
  }
  return y < -1.6 ? -3.6 : 0; // two flat levels — safe fallback
}

// ---------------------------------------------------------------------------
export class Vfx {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'vfx';
    scene.add(this.group);
    const T = textures();

    // ---- pools (fixed caps; created once per session) ----
    this._disposables = [];

    // additive sprites: muzzle stars, glows, sparkles, flash bursts
    this.sprites = this._makeSpritePool(30, T.star, THREE.AdditiveBlending);
    // normal-blended puff sprites: dust, smoke wisps, blood mist, exhaust
    this.puffs = this._makeSpritePool(56, T.puff, THREE.NormalBlending);

    // debris: shared unit cube, per-color cached materials (bounded set)
    this._debrisGeo = new THREE.BoxGeometry(1, 1, 1);
    this._disposables.push(this._debrisGeo);
    this._debrisMats = new Map();
    const debrisPlaceholder = this._debrisMat(0xffffff, false);
    this.debris = [];
    for (let i = 0; i < 160; i++) {
      const m = new THREE.Mesh(this._debrisGeo, debrisPlaceholder);
      m.visible = false;
      m.matrixAutoUpdate = true;
      this.group.add(m);
      this.debris.push({ mesh: m, free: true, vel: new THREE.Vector3(), ttl: 0, life: 1, size: 0.02, grav: 10, spinX: 0, spinZ: 0 });
    }

    // shell casings
    this._casingGeo = new THREE.BoxGeometry(1, 1, 1);
    this._disposables.push(this._casingGeo);
    this.casings = [];
    for (let i = 0; i < 40; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xc8a24a, roughness: 0.35, metalness: 0.8, transparent: true });
      this._disposables.push(mat);
      const m = new THREE.Mesh(this._casingGeo, mat);
      m.visible = false;
      this.group.add(m);
      this.casings.push({ mesh: m, free: true, vel: new THREE.Vector3(), ttl: 0, groundY: 0, bounces: 0, spinX: 0, spinY: 0, rest: false });
    }

    // tracers: thin additive box + glow head sprite
    this._tracerGeo = new THREE.BoxGeometry(1, 1, 1);
    this._disposables.push(this._tracerGeo);
    this.tracers = [];
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      this._disposables.push(mat);
      const m = new THREE.Mesh(this._tracerGeo, mat);
      m.visible = false;
      this.group.add(m);
      const hm = new THREE.SpriteMaterial({ map: T.soft, color: 0xffedca, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      this._disposables.push(hm);
      const head = new THREE.Sprite(hm);
      head.visible = false;
      this.group.add(head);
      this.tracers.push({ mesh: m, head, free: true, ttl: 0, life: 1, from: new THREE.Vector3(), to: new THREE.Vector3() });
    }

    // glass shards
    this._shardGeo = new THREE.PlaneGeometry(1, 1);
    this._disposables.push(this._shardGeo);
    this.shards = [];
    for (let i = 0; i < 56; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xdcedf4, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      this._disposables.push(mat);
      const m = new THREE.Mesh(this._shardGeo, mat);
      m.visible = false;
      this.group.add(m);
      this.shards.push({ mesh: m, free: true, vel: new THREE.Vector3(), ttl: 0, life: 1, spinX: 0, spinY: 0, phase: 0, floorY: 0 });
    }

    // short-lived point lights (muzzle, metal sparks, flash pop)
    this.lights = [];
    for (let i = 0; i < 4; i++) {
      const L = new THREE.PointLight(0xffc36a, 0, 7, 2);
      L.visible = false;
      this.group.add(L);
      this.lights.push({ light: L, free: true, ttl: 0, life: 1, peak: 10 });
    }

    // smoke volume blobs (grenade smoke + signal column share this pool)
    this._smokeGeo = new THREE.SphereGeometry(1, 10, 7);
    this._disposables.push(this._smokeGeo);
    this.smokeBlobs = [];
    for (let i = 0; i < 34; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: SMOKE_TONES[i % 3], transparent: true, opacity: 0, roughness: 1, depthWrite: false });
      this._disposables.push(mat);
      const m = new THREE.Mesh(this._smokeGeo, mat);
      m.visible = false;
      this.group.add(m);
      this.smokeBlobs.push({ mesh: m, free: true });
    }
    this.smokes = []; // active clouds {blobs:[{blob,base,phase,targetO,rise}], ttl, age, duration, pos, radius}

    // ---- event wiring ----
    this._playerShotCount = 0;
    this._pendingTracerTo = null;   // set on weapon-fire, consumed by muzzleFlash
    this.unsubs = [];
    this.unsubs.push(on('impact', (e) => this.impact(e)));
    this.unsubs.push(on('enemy-shot', (e) => this.enemyShot(e)));
    this.unsubs.push(on('glassbreak', (e) => this.glassBurst(e)));
    this.unsubs.push(on('kill', (e) => this.killFeedback(e)));
    this.unsubs.push(on('weapon-fire', (e) => {
      if (!e || !e.byPlayer || e.melee || e.thrown) return;
      this._playerShotCount++;
      if (this._playerShotCount % 3 === 1) { // every 3rd shot (incl. the first)
        const hit = e.hits && e.hits[0] && e.hits[0].point;
        this._pendingTracerTo = hit ? { x: hit.x, y: hit.y, z: hit.z } : null;
        this._pendingTracerArmed = true;
      } else {
        this._pendingTracerArmed = false;
      }
    }));
  }

  _makeSpritePool(n, map, blending) {
    const pool = [];
    for (let i = 0; i < n; i++) {
      const mat = new THREE.SpriteMaterial({ map, transparent: true, opacity: 0, blending, depthWrite: false, rotation: 0 });
      this._disposables.push(mat);
      const s = new THREE.Sprite(mat);
      s.visible = false;
      this.group.add(s);
      pool.push({
        spr: s, free: true, ttl: 0, life: 1, vel: new THREE.Vector3(),
        size0: 1, grow: 0, o0: 1, rotV: 0, fadeIn: 0,
      });
    }
    return pool;
  }

  _alloc(pool) {
    for (const p of pool) if (p.free) { p.free = false; return p; }
    return null; // pool exhausted: skip (bounded by design)
  }

  // sprite spawn helper
  _sprite(pool, map, pos, { size = 0.3, color = 0xffffff, ttl = 0.5, vel = null, grow = 0, opacity = 1, rot = null, rotV = 0, fadeIn = 0 } = {}) {
    const p = this._alloc(pool);
    if (!p) return null;
    const m = p.spr.material;
    m.map = map;
    m.color.setHex(color);
    m.opacity = fadeIn > 0 ? 0 : opacity;
    m.rotation = rot !== null ? rot : worldRng.random() * Math.PI * 2;
    p.spr.position.copy(pos);
    p.spr.scale.setScalar(size);
    p.spr.visible = true;
    p.ttl = ttl; p.life = ttl; p.size0 = size; p.grow = grow; p.o0 = opacity; p.rotV = rotV; p.fadeIn = fadeIn;
    if (vel) p.vel.copy(vel); else p.vel.set(0, 0, 0);
    return p;
  }

  _debrisMat(color, additive) {
    const key = color * 2 + (additive ? 1 : 0);
    if (!this._debrisMats.has(key)) {
      const m = new THREE.MeshBasicMaterial({
        color, transparent: additive, depthWrite: !additive,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      this._disposables.push(m);
      this._debrisMats.set(key, m);
    }
    return this._debrisMats.get(key);
  }

  _spawnDebris(point, normal, { count, colors, speed, size, ttl, grav, additive, splinter = false, spreadUp = 1 }) {
    const scale = qualityPreset().particleScale;
    const n = Math.max(1, Math.round(count * scale));
    for (let i = 0; i < n; i++) {
      const d = this._alloc(this.debris);
      if (!d) return;
      d.mesh.material = this._debrisMat(colors[i % colors.length], additive);
      d.mesh.position.set(point.x, point.y, point.z);
      const sp = speed * (0.55 + worldRng.random() * 0.9);
      d.vel.set(
        (normal?.x ?? 0) * 1.2 + (worldRng.random() - 0.5) * 1.6,
        (normal?.y ?? 0) * 1.2 + worldRng.random() * 1.15 * spreadUp,
        (normal?.z ?? 0) * 1.2 + (worldRng.random() - 0.5) * 1.6,
      ).normalize().multiplyScalar(sp);
      d.ttl = d.life = ttl * (0.7 + worldRng.random() * 0.6);
      d.size = size * (0.7 + worldRng.random() * 0.7);
      d.grav = grav;
      d.spinX = (worldRng.random() - 0.5) * 18;
      d.spinZ = (worldRng.random() - 0.5) * 18;
      d.splinter = splinter;
      if (splinter) d.mesh.scale.set(d.size * 0.5, d.size * 0.5, d.size * 3.2);
      else d.mesh.scale.setScalar(d.size);
      d.mesh.rotation.set(worldRng.random() * 3, worldRng.random() * 3, 0);
      d.mesh.visible = true;
    }
  }

  _flashLight(pos, color, intensity, ttl, distance = 7) {
    const f = this._alloc(this.lights);
    if (!f) return;
    f.light.color.setHex(color);
    f.light.intensity = intensity;
    f.light.distance = distance;
    f.light.position.copy(pos);
    f.light.visible = true;
    f.ttl = f.life = ttl;
    f.peak = intensity;
  }

  // ------------------------------------------------------------ muzzle flash
  muzzleFlash(pos, dir, weaponId) {
    const T = textures();
    const cfg = FLASH_FAMILY[weaponId];
    _v1.set(pos.x, pos.y, pos.z);
    if (!cfg) { this._flashbangBurst(_v1); return; } // grenade detonation path
    const at = _v2.copy(_v1).addScaledVector(dir, 0.06);

    // layered star: hot core sprite + rotated star sprite
    this._sprite(this.sprites, T.star, at, { size: cfg.size, color: 0xffffff, ttl: cfg.ttl, opacity: 1 });
    this._sprite(this.sprites, T.star, at, { size: cfg.size * 1.7, color: 0xffb454, ttl: cfg.ttl * 1.25, opacity: 0.8 });
    // forward lance for carbine/shotgun/rifle
    if (cfg.lance > 0) {
      const t = this._alloc(this.tracers);
      if (t) {
        t.from.copy(at);
        t.to.copy(at).addScaledVector(dir, cfg.lance);
        this._placeTracer(t, 0.03, cfg.ttl * 1.3, 0xffd9a0, false);
      }
    }
    this._flashLight(at, 0xffc36a, cfg.light, 0.05);

    // drifting smoke wisp(s)
    const scale = qualityPreset().particleScale;
    const wisps = Math.max(1, Math.round(cfg.wisps * scale));
    for (let i = 0; i < wisps; i++) {
      _v3.copy(at).addScaledVector(dir, 0.12 + worldRng.random() * 0.15);
      const p = this._sprite(this.puffs, T.puff, _v3, {
        size: 0.14 + worldRng.random() * 0.1, color: 0xb9bec2, ttl: 0.65 + worldRng.random() * 0.3,
        opacity: 0.34, grow: 0.55, rotV: (worldRng.random() - 0.5) * 2, fadeIn: 0.06,
      });
      if (p) p.vel.set(dir.x * 0.5 + (worldRng.random() - 0.5) * 0.3, 0.55 + worldRng.random() * 0.3, dir.z * 0.5 + (worldRng.random() - 0.5) * 0.3);
    }

    this._ejectCasing(at, dir, weaponId);

    // player tracer (armed every 3rd shot by the weapon-fire listener)
    if (this._pendingTracerArmed) {
      this._pendingTracerArmed = false;
      const t = this._alloc(this.tracers);
      if (t) {
        t.from.copy(at).addScaledVector(dir, 0.4);
        if (this._pendingTracerTo) t.to.set(this._pendingTracerTo.x, this._pendingTracerTo.y, this._pendingTracerTo.z);
        else t.to.copy(at).addScaledVector(dir, 36);
        this._placeTracer(t, 0.016, 0.075, 0xffe2b0, true);
      }
      this._pendingTracerTo = null;
    }
  }

  _flashbangBurst(pos) {
    const T = textures();
    // white sphere flash + rays + brief lingering glow
    this._sprite(this.sprites, T.soft, pos, { size: 2.6, color: 0xffffff, ttl: 0.09, opacity: 1 });
    this._sprite(this.sprites, T.rays, pos, { size: 4.2, color: 0xeef4ff, ttl: 0.14, opacity: 0.95 });
    this._sprite(this.sprites, T.soft, pos, { size: 1.3, color: 0xdfe9ff, ttl: 0.7, opacity: 0.55, grow: 0.8 });
    this._flashLight(pos, 0xf2f7ff, 90, 0.1, 16);
    const p = this._sprite(this.puffs, T.puff, pos, { size: 0.8, color: 0xd8dce0, ttl: 1.6, opacity: 0.4, grow: 0.7, fadeIn: 0.1 });
    if (p) p.vel.set(0, 0.6, 0);
  }

  _ejectCasing(pos, dir, weaponId) {
    const spec = CASING_FAMILY[weaponId];
    if (!spec) return;
    const c = this._alloc(this.casings);
    if (!c) return;
    const [len, wid, color] = spec;
    c.mesh.material.color.setHex(color);
    c.mesh.material.opacity = 1;
    c.mesh.scale.set(wid, wid, len);
    // eject right + up from a small rearward muzzle offset
    _v3.crossVectors(dir, UP).normalize(); // right
    c.mesh.position.copy(pos).addScaledVector(dir, -0.25).addScaledVector(_v3, 0.06);
    c.vel.copy(_v3).multiplyScalar(1.5 + worldRng.random() * 1.1)
      .addScaledVector(UP, 1.7 + worldRng.random() * 0.7)
      .addScaledVector(dir, (worldRng.random() - 0.4) * 0.6);
    c.mesh.rotation.set(worldRng.random() * 3, worldRng.random() * 3, 0);
    c.spinX = (worldRng.random() - 0.5) * 30;
    c.spinY = (worldRng.random() - 0.5) * 30;
    c.ttl = 2.2;
    c.bounces = 0;
    c.rest = false;
    c.groundY = groundYAt(c.mesh.position.x, c.mesh.position.z, c.mesh.position.y);
    c.mesh.visible = true;
  }

  // ---------------------------------------------------------------- tracers
  _placeTracer(t, width, ttl, color, withHead) {
    _v3.subVectors(t.to, t.from);
    const len = _v3.length();
    if (len < 0.05) { t.free = true; return; }
    t.mesh.material.color.setHex(color);
    t.mesh.material.opacity = 0.9;
    t.mesh.position.copy(t.from).addScaledVector(_v3, 0.5);
    t.mesh.scale.set(width, width, len);
    t.mesh.lookAt(_v1.copy(t.to));
    t.mesh.visible = true;
    t.ttl = t.life = ttl;
    if (withHead) {
      t.head.material.opacity = 0.85;
      t.head.scale.setScalar(0.16);
      t.head.position.copy(t.from);
      t.head.visible = true;
    } else {
      t.head.visible = false;
    }
  }

  enemyShot(e) {
    if (!e || !e.from || !e.to) return;
    // tracer on every enemy shot (combat readability)
    const t = this._alloc(this.tracers);
    if (t) {
      t.from.set(e.from.x, e.from.y, e.from.z);
      t.to.set(e.to.x, e.to.y, e.to.z);
      this._placeTracer(t, 0.026, 0.1, 0xffcf96, true);
      t.head.scale.setScalar(0.24);
    }
    // small sprite-only muzzle pop at the shooter (no light — budget)
    _v1.set(e.to.x - e.from.x, e.to.y - e.from.y, e.to.z - e.from.z).normalize();
    _v2.set(e.from.x, e.from.y, e.from.z).addScaledVector(_v1, 0.55);
    this._sprite(this.sprites, textures().star, _v2, { size: 0.3, color: 0xffc98c, ttl: 0.05, opacity: 0.9 });
  }

  // ---------------------------------------------------------------- impacts
  impact({ kind, point, normal, light, exitWound }) {
    if (!point) return;
    const isBlood = kind === 'flesh';
    if (isBlood && getSetting('reducedBlood')) return; // skip entirely
    const cfg = IMPACTS[kind] || IMPACTS.default;
    const T = textures();
    const boost = exitWound ? 1.45 : 1;
    const lightMul = light ? 0.5 : 1;

    const [count, colors, speed, size, ttl, grav, additive] = cfg.debris;
    this._spawnDebris(point, normal, {
      count: count * boost * lightMul, colors, speed: speed * boost,
      size: size * boost, ttl, grav, additive, splinter: !!cfg.splinter,
    });
    if (cfg.puffs && cfg.puffs[0] > 0 && !light) {
      const [pc, pcol, psize, prise, pttl] = cfg.puffs;
      const n = Math.max(1, Math.round(pc * qualityPreset().particleScale));
      for (let i = 0; i < n; i++) {
        _v1.set(
          point.x + (normal?.x ?? 0) * 0.06 + (worldRng.random() - 0.5) * 0.08,
          point.y + (normal?.y ?? 0) * 0.06 + (worldRng.random() - 0.5) * 0.08,
          point.z + (normal?.z ?? 0) * 0.06 + (worldRng.random() - 0.5) * 0.08,
        );
        const p = this._sprite(this.puffs, T.puff, _v1, {
          size: psize * 0.55 * boost, color: pcol, ttl: pttl * (0.8 + worldRng.random() * 0.4),
          opacity: isBlood ? 0.5 : 0.42, grow: psize * 0.8, rotV: (worldRng.random() - 0.5) * 1.6, fadeIn: 0.04,
        });
        if (p) p.vel.set((normal?.x ?? 0) * 0.4 + (worldRng.random() - 0.5) * 0.25, prise, (normal?.z ?? 0) * 0.4 + (worldRng.random() - 0.5) * 0.25);
      }
    }
    if (cfg.light && !light) {
      const [lc, li, lt] = cfg.light;
      this._flashLight(_v1.set(point.x + (normal?.x ?? 0) * 0.1, point.y + (normal?.y ?? 0) * 0.1, point.z + (normal?.z ?? 0) * 0.1), lc, li, lt, 3.5);
    }
    // decals (sibling module, guarded)
    if (isBlood) tryBloodDecal(point, normal);
    else tryImpactDecal(kind, point, normal);
  }

  // ---------------------------------------------------------- glass shatter
  glassBurst({ pane, point }) {
    if (!pane) return;
    const scale = qualityPreset().particleScale;
    const count = Math.round((20 + worldRng.random() * 20) * scale);
    const floorY = pane.y0 - 0.02;
    for (let i = 0; i < count; i++) {
      const s = this._alloc(this.shards);
      if (!s) break;
      const along = pane.a + worldRng.random() * (pane.b - pane.a);
      const y = pane.y0 + worldRng.random() * (pane.y1 - pane.y0);
      if (pane.dir === 'x') s.mesh.position.set(along, y, pane.line);
      else s.mesh.position.set(pane.line, y, along);
      const sz = 0.05 + worldRng.random() * 0.1;
      s.mesh.scale.set(sz, sz * (0.6 + worldRng.random() * 0.8), 1);
      s.mesh.rotation.set(worldRng.random() * 3, worldRng.random() * 3, worldRng.random() * 3);
      s.mesh.material.opacity = 0.85;
      s.mesh.visible = true;
      s.vel.set((worldRng.random() - 0.5) * 1.4, -0.3 - worldRng.random() * 0.8, (worldRng.random() - 0.5) * 1.4);
      s.spinX = (worldRng.random() - 0.5) * 14;
      s.spinY = (worldRng.random() - 0.5) * 14;
      s.phase = worldRng.random() * Math.PI * 2;
      s.ttl = s.life = 0.9 + worldRng.random() * 0.6;
      s.floorY = floorY;
    }
    // sparkle burst at the hit point
    if (point) {
      _v1.set(point.x, point.y, point.z);
      this._sprite(this.sprites, textures().soft, _v1, { size: 0.5, color: 0xe8f4fa, ttl: 0.18, opacity: 0.9 });
    }
  }

  // ---------------------------------------------------------- kill feedback
  killFeedback(e) {
    if (!e || !e.entity || e.entity === 'player' || !e.entity.pos) return;
    const T = textures();
    const pos = e.entity.pos;
    const reduced = getSetting('reducedBlood');
    // subtle dark puff at chest height (neutral when reducedBlood)
    _v1.set(pos.x, pos.y + 1.2, pos.z);
    const p = this._sprite(this.puffs, T.puff, _v1, {
      size: 0.35, color: reduced ? 0x3c4044 : 0x4a2b26, ttl: 0.8,
      opacity: 0.4, grow: 0.4, fadeIn: 0.05,
    });
    if (p) p.vel.set(0, 0.35, 0);
    if (e.headshot) {
      _v1.set(pos.x, pos.y + 1.62, pos.z);
      this._sprite(this.sprites, T.soft, _v1, { size: 0.24, color: 0xfff2dc, ttl: 0.14, opacity: 0.95 });
    }
  }

  // -------------------------------------------------------------- smoke API
  // (signature preserved: game.js calls spawnSmoke(pos, radius, duration))
  spawnSmoke(pos, radius, duration, tint = null) {
    const wanted = Math.round(10 * qualityPreset().particleScale) + 4;
    const blobs = [];
    for (let i = 0; i < wanted; i++) {
      const b = this._alloc(this.smokeBlobs);
      if (!b) break;
      // first two blobs anchor the core so the cloud has no see-through center
      const core = i < 2;
      const s = core ? radius * (0.5 + worldRng.random() * 0.15) : radius * (0.3 + worldRng.random() * 0.42);
      const spread = core ? 0.3 : 1.15;
      b.mesh.position.set(
        pos.x + (worldRng.random() - 0.5) * radius * spread,
        pos.y + 0.15 + worldRng.random() * radius * (core ? 0.3 : 0.55),
        pos.z + (worldRng.random() - 0.5) * radius * spread,
      );
      if (tint) b.mesh.material.color.setHex(tint);
      else b.mesh.material.color.setHex(SMOKE_TONES[i % 3]);
      b.mesh.material.opacity = 0;
      b.mesh.visible = true;
      blobs.push({
        blob: b, base: s, phase: worldRng.random() * Math.PI * 2,
        targetO: (core ? 0.62 : 0.5) + worldRng.random() * 0.25, rise: 0.045 + worldRng.random() * 0.04,
      });
    }
    const cloud = { blobs, ttl: duration, age: 0, duration, pos: { ...pos }, radius };
    this.smokes.push(cloud);
    return cloud;
  }

  smokeBlocks(a, b) {
    for (const s of this.smokes) {
      if (s.age < 0.8) continue;
      const cx = s.pos.x, cy = s.pos.y + 1, cz = s.pos.z;
      const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
      const len2 = abx * abx + aby * aby + abz * abz || 1;
      let t = ((cx - a.x) * abx + (cy - a.y) * aby + (cz - a.z) * abz) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + abx * t, py = a.y + aby * t, pz = a.z + abz * t;
      const d2 = (px - cx) ** 2 + (py - cy) ** 2 + (pz - cz) ** 2;
      if (d2 < s.radius * s.radius) return true;
    }
    return false;
  }

  // ------------------------------------------------------- ambient emitters
  _tickAmbient(dt) {
    const T = textures();
    const scale = qualityPreset().particleScale;
    for (const em of ambientEmitters) {
      em.acc += dt * em.rate * Math.max(0.4, scale);
      while (em.acc >= 1) {
        em.acc -= 1;
        if (em.type === 'signal') {
          // green extraction signal smoke: emissive-lit rising column
          _v1.set(em.pos.x + (worldRng.random() - 0.5) * 0.22, em.pos.y, em.pos.z + (worldRng.random() - 0.5) * 0.22);
          const p = this._sprite(this.puffs, T.puff, _v1, {
            size: 0.24 + worldRng.random() * 0.14, color: worldRng.chance(0.5) ? 0x63c273 : 0x3f9a56,
            ttl: 2.4 + worldRng.random() * 0.9, opacity: 0.5, grow: 0.5,
            rotV: (worldRng.random() - 0.5) * 1.2, fadeIn: 0.25,
          });
          if (p) p.vel.set((worldRng.random() - 0.5) * 0.12, 0.85 + worldRng.random() * 0.3, (worldRng.random() - 0.5) * 0.12);
          // occasional additive core glint at the canister mouth
          if (worldRng.chance(0.3)) {
            this._sprite(this.sprites, T.soft, _v1, { size: 0.3, color: 0x7dd87d, ttl: 0.4, opacity: 0.5 });
          }
        } else if (em.type === 'exhaust') {
          _v1.set(em.pos.x, em.pos.y, em.pos.z);
          const p = this._sprite(this.puffs, T.puff, _v1, {
            size: 0.1 + worldRng.random() * 0.06, color: 0xb4b9bd,
            ttl: 1.2 + worldRng.random() * 0.5, opacity: 0.26, grow: 0.32,
            rotV: (worldRng.random() - 0.5) * 1.4, fadeIn: 0.12,
          });
          if (p && em.dir) p.vel.set(em.dir.x * 0.5 + (worldRng.random() - 0.5) * 0.1, 0.28 + worldRng.random() * 0.15, em.dir.z * 0.5 + (worldRng.random() - 0.5) * 0.1);
          else if (p) p.vel.set(0, 0.3, 0);
        }
      }
    }
  }

  // ----------------------------------------------------------------- update
  update(dt) {
    this._tickAmbient(dt);

    // additive sprites + puffs share behavior
    for (const pool of [this.sprites, this.puffs]) {
      for (const p of pool) {
        if (p.free) continue;
        p.ttl -= dt;
        if (p.ttl <= 0) { p.spr.visible = false; p.free = true; continue; }
        const age = p.life - p.ttl;
        p.spr.position.addScaledVector(p.vel, dt);
        const sz = p.size0 + p.grow * age;
        p.spr.scale.setScalar(sz);
        const fadeOut = Math.min(1, p.ttl / (p.life * 0.55));
        const fadeIn = p.fadeIn > 0 ? Math.min(1, age / p.fadeIn) : 1;
        p.spr.material.opacity = p.o0 * fadeOut * fadeIn;
        if (p.rotV) p.spr.material.rotation += p.rotV * dt;
      }
    }

    // debris
    for (const d of this.debris) {
      if (d.free) continue;
      d.ttl -= dt;
      if (d.ttl <= 0) { d.mesh.visible = false; d.free = true; continue; }
      d.vel.y -= d.grav * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.spinX * dt;
      d.mesh.rotation.z += d.spinZ * dt;
      const k = Math.max(0.15, d.ttl / d.life);
      const sz = d.size * (0.4 + 0.6 * k);
      if (d.splinter) d.mesh.scale.set(sz * 0.5, sz * 0.5, sz * 3.2);
      else d.mesh.scale.setScalar(sz);
    }

    // shell casings
    for (const c of this.casings) {
      if (c.free) continue;
      c.ttl -= dt;
      if (c.ttl <= 0) { c.mesh.visible = false; c.free = true; continue; }
      if (!c.rest) {
        c.vel.y -= 9.8 * dt;
        c.mesh.position.addScaledVector(c.vel, dt);
        c.mesh.rotation.x += c.spinX * dt;
        c.mesh.rotation.y += c.spinY * dt;
        if (c.mesh.position.y <= c.groundY + 0.012 && c.vel.y < 0) {
          c.mesh.position.y = c.groundY + 0.012;
          c.bounces++;
          if (c.bounces === 1) { try { sfx('casing', { pos: c.mesh.position, vol: 0.3, rateJitter: 0.2 }); } catch { /* audio agent may not have it yet */ } }
          if (c.bounces >= 3 || Math.abs(c.vel.y) < 0.5) {
            c.rest = true;
            c.mesh.rotation.x = Math.round(c.mesh.rotation.x / Math.PI) * Math.PI + Math.PI / 2;
          } else {
            c.vel.y = -c.vel.y * 0.34;
            c.vel.x *= 0.55; c.vel.z *= 0.55;
            c.spinX *= 0.4; c.spinY *= 0.4;
            c.groundY = groundYAt(c.mesh.position.x, c.mesh.position.z, c.mesh.position.y);
          }
        }
      }
      if (c.ttl < 0.5) c.mesh.material.opacity = c.ttl / 0.5;
    }

    // tracers
    for (const t of this.tracers) {
      if (t.free) continue;
      t.ttl -= dt;
      if (t.ttl <= 0) { t.mesh.visible = false; t.head.visible = false; t.free = true; continue; }
      const k = t.ttl / t.life;
      t.mesh.material.opacity = 0.9 * k;
      if (t.head.visible) {
        const prog = Math.min(1, (t.life - t.ttl) / t.life * 1.6);
        t.head.position.lerpVectors(t.from, t.to, prog);
        t.head.material.opacity = 0.85 * k;
      }
    }

    // glass shards
    for (const s of this.shards) {
      if (s.free) continue;
      s.ttl -= dt;
      if (s.ttl <= 0) { s.mesh.visible = false; s.free = true; continue; }
      s.vel.y -= 11 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += s.spinX * dt;
      s.mesh.rotation.y += s.spinY * dt;
      if (s.mesh.position.y < s.floorY - 2.2) { s.mesh.visible = false; s.free = true; continue; }
      // sparkle: deterministic shimmer + fade
      const k = Math.min(1, s.ttl / (s.life * 0.4));
      s.phase += dt * 9;
      s.mesh.material.opacity = (0.5 + 0.35 * Math.sin(s.phase)) * k;
    }

    // point lights
    for (const f of this.lights) {
      if (f.free) continue;
      f.ttl -= dt;
      if (f.ttl <= 0) { f.light.visible = false; f.light.intensity = 0; f.free = true; continue; }
      f.light.intensity = f.peak * (f.ttl / f.life);
    }

    // smoke clouds
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      s.age += dt;
      s.ttl -= dt;
      const fadeIn = Math.min(1, s.age / 1.2);
      const fadeOut = Math.min(1, Math.max(0, s.ttl / 2));
      for (const e of s.blobs) {
        const m = e.blob.mesh;
        m.material.opacity = e.targetO * fadeIn * fadeOut;
        m.position.y += dt * e.rise;
        // slow roil: scale pulse per-blob
        e.phase += dt * 0.7;
        const pulse = 1 + Math.sin(e.phase) * 0.07 + s.age * 0.012;
        m.scale.setScalar(e.base * pulse);
      }
      if (s.ttl <= 0) {
        for (const e of s.blobs) { e.blob.mesh.visible = false; e.blob.free = true; }
        this.smokes.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------- dispose
  dispose() {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    ambientEmitters.length = 0;
    this.scene.remove(this.group);
    for (const d of this._disposables) d.dispose(); // includes cached debris materials
    this._debrisMats.clear();
  }
}
