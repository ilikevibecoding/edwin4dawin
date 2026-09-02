import * as THREE from 'three';
import { CELLS, DECALS } from './textures.js';
import { rand, randomCone, randomHemisphere, groundHeight } from './util.js';

const _n = new THREE.Vector3();
const _p = new THREE.Vector3();
const _d = new THREE.Vector3();
const _refl = new THREE.Vector3();
const _v = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/** Per-surface response tables (colours are linear albedo). */
const SURFACES = {
  stone: { dust: [0.5, 0.46, 0.4], chip: [0.42, 0.4, 0.36], decal: DECALS.HOLE_STONE, decalSize: 0.13, chips: 6, dustAlpha: 0.5, dustScale: 0.75 },
  concrete: { dust: [0.5, 0.49, 0.46], chip: [0.4, 0.4, 0.38], decal: DECALS.HOLE_STONE, decalSize: 0.13, chips: 6, dustAlpha: 0.5, dustScale: 0.75 },
  plaster: { dust: [0.72, 0.7, 0.65], chip: [0.82, 0.8, 0.74], decal: DECALS.HOLE_PLASTER, decalSize: 0.15, chips: 7, dustAlpha: 0.55, dustScale: 0.85 },
  brick: { dust: [0.52, 0.34, 0.26], chip: [0.5, 0.3, 0.22], decal: DECALS.HOLE_STONE, decalSize: 0.12, chips: 6, dustAlpha: 0.5, dustScale: 0.75, tint: [0.85, 0.6, 0.5] },
  dirt: { dust: [0.36, 0.27, 0.18], chip: [0.3, 0.22, 0.14], decal: DECALS.HOLE_DIRT, decalSize: 0.22, chips: 9, dustAlpha: 0.6, dustScale: 1.3 },
  sand: { dust: [0.6, 0.5, 0.34], chip: [0.6, 0.5, 0.34], decal: DECALS.HOLE_DIRT, decalSize: 0.2, chips: 8, dustAlpha: 0.6, dustScale: 1.2 },
  wood: { dust: [0.6, 0.5, 0.34], chip: [0.7, 0.55, 0.32], decal: DECALS.HOLE_WOOD, decalSize: 0.1, chips: 8, dustAlpha: 0.3, dustScale: 0.55 },
};

/**
 * Bullet impacts by surface: dust puffs + chips + decal for masonry, sparks/ricochet/dent for metal,
 * splinters for wood, clods for dirt, shards + spider-web for glass, leaf bits for foliage, splash for
 * water, blood for flesh. Everything goes through the shared particle batch and decal pool.
 */
export class Impacts {
  constructor(fx) {
    this.fx = fx;
    this.game = fx.game;
  }

  hit(point, normal, surface, direction, data) {
    const fx = this.fx;
    _n.copy(normal || _up);
    if (_n.lengthSq() < 0.5) _n.copy(_up);
    _n.normalize();
    _d.copy(direction || _n.clone().negate()).normalize();
    _p.copy(point).addScaledVector(_n, 0.015);
    const dynamic = data?.data?.type === 'dynamic';
    switch (surface) {
      case 'metal':
        this._metal(_p, _n, _d, dynamic);
        break;
      case 'glass':
        this._glass(_p, _n, _d, dynamic);
        break;
      case 'foliage':
        this._foliage(_p, _n, _d);
        break;
      case 'water':
        this._water(_p, _n, _d);
        break;
      case 'flesh':
        fx.blood(point, _d);
        break;
      case 'wood':
        this._wood(_p, _n, _d, dynamic);
        break;
      default:
        this._masonry(_p, _n, _d, SURFACES[surface] || SURFACES.stone, dynamic);
    }
  }

  _dust(p, n, color, { count = 2, alpha = 0.6, scale = 1, speed = 1, extra = 0 } = {}) {
    const ps = this.fx.particles;
    const dens = this.fx.density;
    // layer 1: dense fast puff near the hole
    const c1 = Math.max(1, Math.round((count + extra) * dens));
    for (let i = 0; i < c1; i++) {
      randomCone(n, 0.7, _v);
      const spd = rand(1.2, 2.6) * speed;
      ps.emit({
        x: p.x, y: p.y, z: p.z,
        vx: _v.x * spd, vy: _v.y * spd + 0.3, vz: _v.z * spd,
        life: rand(0.25, 0.45), size0: 0.05 * scale, size1: rand(0.24, 0.4) * scale, rot: rand(0, 6.28), rotVel: rand(-3, 3),
        r0: color[0] * 0.85, g0: color[1] * 0.85, b0: color[2] * 0.85, alpha: alpha * 0.65, fadeIn: 0.05, fadeOut: 0.65,
        atlas: CELLS.DUST, blend0: 1, lit0: 1, gravity: 1.5, drag: 4.5, sizeEase: 3,
      });
    }
    // layer 2: lingering thin haze drifting off
    const c2 = Math.max(1, Math.round(2 * dens));
    for (let i = 0; i < c2; i++) {
      randomCone(n, 1.0, _v);
      const spd = rand(0.4, 1.0) * speed;
      ps.emit({
        x: p.x + _v.x * 0.05, y: p.y + _v.y * 0.05, z: p.z + _v.z * 0.05,
        vx: _v.x * spd, vy: _v.y * spd + 0.3, vz: _v.z * spd,
        life: rand(0.8, 1.4), size0: 0.15 * scale, size1: rand(0.5, 0.8) * scale, rot: rand(0, 6.28), rotVel: rand(-0.8, 0.8),
        r0: color[0] * 0.85, g0: color[1] * 0.85, b0: color[2] * 0.85, alpha: alpha * 0.22, fadeIn: 0.15, fadeOut: 0.6,
        atlas: CELLS.SMOKE_A + (i % 3), blend0: 1, lit0: 1, gravity: 0.5, drag: 2.0, turb: 0.3, sizeEase: 2,
      });
    }
  }

  _chips(p, n, color, count, { size = 0.03, speed = 5, gravity = 14, bounce = 0.35, life = 1.4, atlas = CELLS.CHUNK_A, atlasVariants = 2, stretch = 0 } = {}) {
    const ps = this.fx.particles;
    const c = Math.round(count * this.fx.density);
    const ground = groundHeight(this.game, p.x, p.z, p.y - 3);
    for (let i = 0; i < c; i++) {
      randomHemisphere(n, _v);
      _v.addScaledVector(n, 0.6).normalize();
      const spd = rand(0.4, 1) * speed;
      const s = size * rand(0.6, 1.4);
      ps.emit({
        x: p.x, y: p.y, z: p.z,
        vx: _v.x * spd, vy: _v.y * spd + spd * 0.25, vz: _v.z * spd,
        life: life * rand(0.7, 1.3), size0: s, size1: s, rot: rand(0, 6.28), rotVel: rand(-25, 25),
        r0: color[0] * rand(0.75, 1.15), g0: color[1] * rand(0.75, 1.15), b0: color[2] * rand(0.75, 1.15),
        alpha: 1, fadeIn: 0, fadeOut: 0.25, atlas: atlas + (atlasVariants > 1 ? i % atlasVariants : 0),
        blend0: 1, lit0: 1, gravity, bounce, groundY: ground, stretch,
      });
    }
  }

  _masonry(p, n, d, s, dynamic) {
    this._dust(p, n, s.dust, { count: 2, alpha: s.dustAlpha, scale: s.dustScale, extra: 1 });
    this._chips(p, n, s.chip, s.chips, { size: 0.028, speed: 5.5, gravity: 14 });
    if (!dynamic) {
      const t = s.tint || [1, 1, 1];
      this.fx.decals.add(p, n, s.decal, s.decalSize, { r: t[0], g: t[1], b: t[2], lit: 1 });
    }
  }

  _wood(p, n, d, dynamic) {
    const s = SURFACES.wood;
    this._dust(p, n, s.dust, { count: 1, alpha: 0.35, scale: 0.7 });
    // splinters: long thin light-coloured chips
    this._chips(p, n, s.chip, 9, { size: 0.02, speed: 6, gravity: 12, bounce: 0.2, life: 1.2, stretch: 0.03 });
    if (!dynamic) this.fx.decals.add(p, n, DECALS.HOLE_WOOD, 0.11, { lit: 1 });
  }

  _metal(p, n, d, dynamic) {
    const ps = this.fx.particles;
    const dens = this.fx.density;
    _refl.copy(d).addScaledVector(n, -2 * d.dot(n)).normalize();
    const ground = groundHeight(this.game, p.x, p.z, p.y - 3);
    // bouncing yellow-white sparks
    const count = Math.round(rand(11, 18) * dens);
    for (let i = 0; i < count; i++) {
      randomCone(_refl, 0.55, _v);
      _v.lerp(n, 0.3).normalize();
      const spd = rand(5, 16);
      ps.emit({
        x: p.x, y: p.y, z: p.z,
        vx: _v.x * spd, vy: _v.y * spd, vz: _v.z * spd,
        life: rand(0.25, 0.7), size0: rand(0.014, 0.026), size1: 0.008,
        r0: 6.5, g0: 4.2, b0: 1.6, r1: 2.2, g1: 0.55, b1: 0.08, alpha: 1, fadeIn: 0, fadeOut: 0.35,
        atlas: CELLS.STREAK, blend0: 0, lit0: 0, gravity: 13, drag: 0.4, bounce: 0.45, groundY: ground, stretch: 0.022,
      });
    }
    // bright ricochet trail
    const spd = rand(55, 80);
    randomCone(_refl, 0.25, _v);
    ps.emit({
      x: p.x + _v.x * 0.4, y: p.y + _v.y * 0.4, z: p.z + _v.z * 0.4,
      vx: _v.x * spd, vy: _v.y * spd, vz: _v.z * spd,
      life: rand(0.1, 0.16), size0: 0.05, size1: 0.02, r0: 7, g0: 5, b0: 2.2, alpha: 1, fadeIn: 0, fadeOut: 0.5,
      atlas: CELLS.STREAK, blend0: 0, lit0: 0, gravity: 4, stretch: 0.03,
    });
    // flash + a wisp of grey smoke
    this.fx.particles.emit({
      x: p.x + n.x * 0.05, y: p.y + n.y * 0.05, z: p.z + n.z * 0.05, life: 0.07, size0: 0.25, size1: 0.35,
      r0: 5, g0: 3.5, b0: 1.8, alpha: 0.9, fadeIn: 0, fadeOut: 0.8, atlas: CELLS.FLASH_CORE, blend0: 0, lit0: 0,
    });
    this._dust(p, n, [0.45, 0.45, 0.47], { count: 1, alpha: 0.3, scale: 0.6, speed: 1.4 });
    this.fx.lights.flash(_p.copy(p).addScaledVector(n, 0.12), 0xffc27a, 7, 4.5, 0.14, { flicker: 0.7 });
    if (!dynamic) this.fx.decals.add(p, n, DECALS.DENT_METAL, 0.075, { lit: 1 });
  }

  _glass(p, n, d, dynamic) {
    const ps = this.fx.particles;
    const dens = this.fx.density;
    const ground = groundHeight(this.game, p.x, p.z, p.y - 3);
    // shards fly mostly through (along the bullet) with some back-spray
    const count = Math.round(rand(8, 12) * dens);
    for (let i = 0; i < count; i++) {
      const through = i % 3 !== 0;
      randomCone(through ? d : n, 0.8, _v);
      const spd = rand(1.5, 5);
      const s = rand(0.025, 0.07);
      ps.emit({
        x: p.x, y: p.y, z: p.z, vx: _v.x * spd, vy: _v.y * spd + 0.5, vz: _v.z * spd,
        life: rand(0.8, 1.6), size0: s, size1: s, rot: rand(0, 6.28), rotVel: rand(-20, 20),
        r0: 0.85, g0: 0.92, b0: 1.0, alpha: 0.85, fadeIn: 0, fadeOut: 0.2, atlas: CELLS.SHARD,
        blend0: 1, lit0: 1, gravity: 12, bounce: 0.3, groundY: ground,
      });
    }
    // glints
    for (let i = 0; i < 4; i++) {
      randomCone(n, 1.2, _v);
      const spd = rand(1, 3);
      ps.emit({
        x: p.x, y: p.y, z: p.z, vx: _v.x * spd, vy: _v.y * spd, vz: _v.z * spd, life: rand(0.08, 0.2), size0: 0.05, size1: 0.02,
        r0: 4, g0: 4.5, b0: 5, alpha: 1, fadeIn: 0, fadeOut: 0.6, atlas: CELLS.FLASH_CORE, blend0: 0, lit0: 0, gravity: 6,
      });
    }
    this._dust(p, n, [0.8, 0.85, 0.9], { count: 1, alpha: 0.25, scale: 0.6 });
    if (!dynamic) this.fx.decals.add(p, n, DECALS.GLASS_WEB, rand(0.28, 0.4), { lit: 0.6, alpha: 0.9 });
  }

  _foliage(p, n, d) {
    const ps = this.fx.particles;
    const count = Math.round(rand(6, 10) * this.fx.density);
    const ground = groundHeight(this.game, p.x, p.z, p.y - 4);
    for (let i = 0; i < count; i++) {
      randomCone(d, 1.3, _v);
      const spd = rand(0.8, 3.5);
      const s = rand(0.03, 0.07);
      const g = rand(0.7, 1.2);
      ps.emit({
        x: p.x, y: p.y, z: p.z, vx: _v.x * spd, vy: _v.y * spd + 0.6, vz: _v.z * spd,
        life: rand(1.2, 2.2), size0: s, size1: s, rot: rand(0, 6.28), rotVel: rand(-8, 8),
        r0: 0.16 * g, g0: 0.32 * g, b0: 0.1 * g, alpha: 1, fadeIn: 0, fadeOut: 0.3, atlas: CELLS.CHUNK_A + (i % 2),
        blend0: 1, lit0: 1, gravity: 2.5, drag: 1.8, turb: 0.8, bounce: 0.05, groundY: ground,
      });
    }
    this._dust(p, n, [0.45, 0.5, 0.3], { count: 1, alpha: 0.2, scale: 0.6 });
  }

  _water(p, n, d) {
    const ps = this.fx.particles;
    const dens = this.fx.density;
    const count = Math.round(rand(10, 16) * dens);
    for (let i = 0; i < count; i++) {
      randomCone(_up, 0.35, _v);
      const spd = rand(2.5, 6);
      ps.emit({
        x: p.x + rand(-0.05, 0.05), y: p.y, z: p.z + rand(-0.05, 0.05), vx: _v.x * spd, vy: _v.y * spd, vz: _v.z * spd,
        life: rand(0.5, 0.9), size0: rand(0.03, 0.06), size1: 0.02, r0: 0.9, g0: 0.95, b0: 1.0, alpha: 0.9, fadeIn: 0, fadeOut: 0.4,
        atlas: CELLS.STREAK, blend0: 0.7, lit0: 0.6, gravity: 11, drag: 0.3, stretch: 0.025,
      });
    }
    // mist column
    for (let i = 0; i < 3; i++) {
      ps.emit({
        x: p.x, y: p.y + 0.1, z: p.z, vx: rand(-0.3, 0.3), vy: rand(1.5, 3), vz: rand(-0.3, 0.3),
        life: rand(0.6, 1.0), size0: 0.15, size1: rand(0.5, 0.8), rot: rand(0, 6.28), rotVel: rand(-1, 1),
        r0: 0.85, g0: 0.9, b0: 0.95, alpha: 0.4, fadeIn: 0.1, fadeOut: 0.6, atlas: CELLS.DUST, blend0: 1, lit0: 1, gravity: 2, drag: 2.5, sizeEase: 2,
      });
    }
    this.fx.rings.spawn(p, _up, { s0: 0.15, s1: 1.4, life: 0.9, alpha: 0.6, color: 0xdfeeff });
  }
}
