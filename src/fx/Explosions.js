import * as THREE from 'three';
import { GROUP, groups } from '../core/Physics.js';
import { CELLS, DECALS } from './textures.js';
import { rand, randomCone, groundHeight } from './util.js';

const _c = new THREE.Vector3();
const _g = new THREE.Vector3();
const _gn = new THREE.Vector3();
const _v = new THREE.Vector3();
const _p = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Multi-stage explosion, everything scaled by radius:
 *  (a) 1-frame white flash sprite + big orange point light (300 / 40 m) decaying over 0.4 s
 *  (b) core fireball: animated fire sprites expanding fast, transitioning to dark smoke
 *  (c) dark sun-lit smoke plume rising with turbulence for 6–15 s (mushroom cap + column)
 *  (d) ground shockwave / dust ring + low dust curtain racing outward
 *  (e) physics debris chunks with smoke trails + embers/sparks
 *  (f) large scorch decal on the ground
 *  (g) lingering thin smoke column at the site for 20 s
 * The visual centre sits at ground level (raycast) so decals, ring and debris interact with the floor.
 */
export class Explosions {
  constructor(fx) {
    this.fx = fx;
    this.game = fx.game;
    this.emitters = []; // lingering smoke columns
    this._worldFilter = groups(GROUP.ALL, GROUP.WORLD);
  }

  /** Find the ground under the blast (point + normal); falls back to world.getGroundHeight. */
  _ground(position) {
    _p.copy(position).addScaledVector(UP, 1.5);
    const hit = this.game.physics?.raycast(_p, _down, 12, { filter: this._worldFilter });
    if (hit && hit.point.y <= position.y + 1.5) {
      _g.copy(hit.point);
      _gn.copy(hit.normal);
      if (_gn.y < 0.5) _gn.copy(UP);
    } else {
      _g.set(position.x, groundHeight(this.game, position.x, position.z, position.y), position.z);
      _gn.copy(UP);
    }
  }

  explode(position, radius = 6, kind = 'bomb') {
    const fx = this.fx;
    const ps = fx.particles;
    const dens = fx.density;
    const R = Math.max(2, radius);
    const k = R / 9; // 1 for the air-strike bomb
    this._ground(position);
    // visual centre a bit above the ground so big sprites don't get clipped by the floor
    _c.set(_g.x, Math.max(position.y, _g.y) + R * 0.12, _g.z);
    const onGround = position.y - _g.y < R * 0.5;

    // (a) flash + light
    ps.emit({
      x: _c.x, y: _c.y + R * 0.2, z: _c.z, life: 0.08, size0: R * 1.6, size1: R * 2.4,
      r0: 6, g0: 5.2, b0: 4.2, alpha: 1, fadeIn: 0, fadeOut: 0.7, atlas: CELLS.FLASH_CORE, blend0: 0, lit0: 0,
    });
    ps.emit({
      x: _c.x, y: _c.y + R * 0.2, z: _c.z, life: 0.14, size0: R * 2.2, size1: R * 3.4, rot: rand(0, 6.28),
      r0: 5, g0: 3.2, b0: 1.4, alpha: 0.8, fadeIn: 0, fadeOut: 0.8, atlas: CELLS.FLASH_STAR, blend0: 0, lit0: 0,
    });
    // 300 cd for the first frames (blinding), quadratic decay so by 0.2 s the floor is a warm glow, not white
    fx.lights.flash(_p.set(_c.x, _c.y + R * 0.35, _c.z), 0xff8a3a, 300 * k, 40 * Math.sqrt(k), 0.3, { priority: 2 });
    fx.lights.flash(_p.set(_c.x, _c.y + R * 0.5, _c.z), 0xff6a20, 30 * k, 18 * Math.sqrt(k), 1.6, { priority: 1, flicker: 0.6 });

    // (b) fireball: animated fire sprites bursting up and out — mostly alpha-blended so overlapping sprites
    // occlude instead of summing to white; the colour ramp goes saturated orange → smouldering dark red
    const fireN = Math.round(rand(5, 7) * Math.max(0.6, dens));
    for (let i = 0; i < fireN; i++) {
      randomCone(UP, 1.1, _v);
      const spd = rand(3, 8) * k;
      const s0 = R * rand(0.3, 0.5);
      ps.emit({
        x: _c.x + rand(-0.2, 0.2) * R, y: _c.y + rand(0.05, 0.35) * R, z: _c.z + rand(-0.2, 0.2) * R,
        vx: _v.x * spd, vy: _v.y * spd + 2 * k, vz: _v.z * spd,
        life: rand(0.45, 0.7), size0: s0, size1: R * rand(0.85, 1.15), rot: rand(0, 6.28), rotVel: rand(-1.5, 1.5),
        r0: 1.75, g0: 0.95, b0: 0.38, r1: 0.25, g1: 0.1, b1: 0.04, alpha: 1, fadeIn: 0.02, fadeOut: 0.45,
        atlas: CELLS.FIRE_A, atlasCount: 3, blend0: 0.62, blend1: 1, lit0: 0, lit1: 1, drag: 1.8, gravity: -2, sizeEase: 3.5,
      });
    }
    // hot core: a couple of very bright short-lived sprites
    for (let i = 0; i < 2; i++) {
      ps.emit({
        x: _c.x, y: _c.y + R * 0.25, z: _c.z, vy: 3 * k, life: rand(0.12, 0.2), size0: R * 0.45, size1: R * 0.9, rot: rand(0, 6.28), rotVel: rand(-3, 3),
        r0: 3.6, g0: 2.3, b0: 1.1, r1: 1.8, g1: 0.6, b1: 0.12, alpha: 1, fadeIn: 0, fadeOut: 0.6,
        atlas: CELLS.FIRE_B, atlasCount: 2, blend0: 0, lit0: 0, sizeEase: 3,
      });
    }
    // dirt eruption: dark opaque dust thrown straight up with the fire, falling back over a few seconds
    const dirtN = Math.round(rand(10, 14) * dens);
    for (let i = 0; i < dirtN; i++) {
      randomCone(UP, 0.55, _v);
      const spd = rand(6, 14) * k;
      const d = rand(0.13, 0.2);
      ps.emit({
        x: _c.x + rand(-0.25, 0.25) * R, y: _g.y + R * rand(0.05, 0.3), z: _c.z + rand(-0.25, 0.25) * R,
        vx: _v.x * spd, vy: _v.y * spd, vz: _v.z * spd,
        life: rand(1.6, 3.2), size0: R * rand(0.25, 0.4), size1: R * rand(1.0, 1.4), rot: rand(0, 6.28), rotVel: rand(-0.8, 0.8),
        r0: d * 1.15, g0: d, b0: d * 0.82, r1: 0.3, g1: 0.28, b1: 0.25, alpha: rand(0.75, 0.9), fadeIn: 0.08, fadeOut: 0.5,
        atlas: CELLS.SMOKE_A + (i % 3), blend0: 1, lit0: 1, gravity: 1.6, drag: 1.4, turb: 0.6, sizeEase: 2.6, groundY: _g.y, hover: 0.42,
      });
    }

    // (c) dark smoke: fast cap, slower column, heavy ground-hugging rollers
    const smokeN = Math.round(rand(28, 40) * dens);
    for (let i = 0; i < smokeN; i++) {
      const kind = i % 4; // 0 cap, 1-2 column, 3 ground roller
      randomCone(UP, kind === 0 ? 0.3 : kind === 3 ? 1.35 : 0.8, _v);
      const spd = (kind === 0 ? rand(6, 9) : kind === 3 ? rand(1.5, 3.5) : rand(2.5, 6)) * k;
      const dark = rand(0.05, 0.12);
      ps.emit({
        x: _c.x + rand(-0.3, 0.3) * R, y: _c.y + (kind === 3 ? rand(0, 0.2) : rand(0.1, 0.6)) * R, z: _c.z + rand(-0.3, 0.3) * R,
        vx: _v.x * spd, vy: kind === 3 ? rand(0.4, 1.2) * k : _v.y * spd, vz: _v.z * spd,
        life: kind === 3 ? rand(8, 14) : rand(6, 13), size0: R * rand(0.3, 0.5), size1: R * rand(1.0, 1.6), rot: rand(0, 6.28), rotVel: rand(-0.35, 0.35),
        r0: dark * 1.1, g0: dark * 0.95, b0: dark * 0.85, r1: 0.31, g1: 0.3, b1: 0.29, alpha: rand(0.7, 0.9), fadeIn: 0.03, fadeOut: 0.55,
        atlas: CELLS.SMOKE_A + (i % 3), blend0: 1, lit0: 1, gravity: kind === 3 ? -0.08 : -0.4, drag: kind === 0 ? 0.55 : 0.75, turb: 1.2 * k, sizeEase: 2.2,
        groundY: _g.y, hover: 0.4,
      });
    }

    // (d) ground shockwave + dust curtain (two waves; the slow one hangs around for a while)
    if (onGround) {
      fx.rings.spawn(_g, _gn, { s0: R * 0.5, s1: R * 3.4, life: 0.75, alpha: 0.75, color: 0x9a8f80, ease: 2.6 });
      fx.rings.spawn(_g, _gn, { s0: R * 0.3, s1: R * 5.5, life: 0.32, alpha: 0.35, color: 0xffe0b0, additive: true, ease: 1.8 });
      const dustN = Math.round(rand(20, 28) * dens);
      for (let i = 0; i < dustN; i++) {
        const a = (i / dustN) * Math.PI * 2 + rand(-0.2, 0.2);
        const fast = i % 2 === 0;
        const spd = (fast ? rand(9, 15) : rand(3, 6)) * k;
        ps.emit({
          x: _g.x + Math.cos(a) * R * 0.3, y: _g.y + R * 0.1, z: _g.z + Math.sin(a) * R * 0.3,
          vx: Math.cos(a) * spd, vy: rand(1.0, 2.5) * k, vz: Math.sin(a) * spd,
          life: fast ? rand(2.5, 4) : rand(5, 9), size0: R * 0.22, size1: R * rand(0.8, 1.3), rot: rand(0, 6.28), rotVel: rand(-0.5, 0.5),
          r0: 0.46, g0: 0.41, b0: 0.34, r1: 0.4, g1: 0.37, b1: 0.33, alpha: rand(0.55, 0.8), fadeIn: 0.05, fadeOut: 0.55,
          atlas: CELLS.DUST, blend0: 1, lit0: 1, gravity: 0.6, drag: fast ? 2.0 : 1.2, turb: 0.5, sizeEase: 2.5, groundY: _g.y, hover: 0.42,
        });
      }
    }

    // (e) debris + sparks + embers
    const debrisN = Math.round(rand(12, 22) * dens);
    for (let i = 0; i < debrisN; i++) {
      randomCone(UP, 0.85, _v);
      const spd = rand(9, 24) * Math.sqrt(k);
      _p.set(_c.x + rand(-0.15, 0.15) * R, _g.y + R * 0.15 + rand(0, 0.2) * R, _c.z + rand(-0.15, 0.15) * R);
      fx.debris.spawn(_p, { x: _v.x * spd, y: _v.y * spd, z: _v.z * spd }, rand(0.1, 0.36) * Math.sqrt(k), { trail: i < 7, life: rand(7, 11) });
    }
    const sparkN = Math.round(rand(34, 50) * dens);
    const groundY = _g.y;
    for (let i = 0; i < sparkN; i++) {
      randomCone(UP, 1.15, _v);
      const spd = rand(12, 34) * Math.sqrt(k);
      ps.emit({
        x: _c.x, y: _c.y + R * 0.15, z: _c.z, vx: _v.x * spd, vy: _v.y * spd, vz: _v.z * spd,
        life: rand(0.5, 1.4), size0: rand(0.03, 0.07) * Math.sqrt(k), size1: 0.02, r0: 6, g0: 3.4, b0: 1.2, r1: 2.5, g1: 0.6, b1: 0.05,
        alpha: 1, fadeIn: 0, fadeOut: 0.4, atlas: CELLS.STREAK, blend0: 0, lit0: 0, gravity: 14, drag: 0.5, bounce: 0.4, groundY, stretch: 0.03,
      });
    }
    const emberN = Math.round(rand(10, 16) * dens);
    for (let i = 0; i < emberN; i++) {
      randomCone(UP, 0.9, _v);
      const spd = rand(5, 14) * Math.sqrt(k);
      ps.emit({
        x: _c.x, y: _c.y + R * 0.3, z: _c.z, vx: _v.x * spd, vy: _v.y * spd, vz: _v.z * spd,
        life: rand(1.4, 2.6), size0: rand(0.05, 0.1), size1: 0.03, r0: 4.5, g0: 1.6, b0: 0.3, r1: 1.2, g1: 0.2, b1: 0.02,
        alpha: 1, fadeIn: 0, fadeOut: 0.5, atlas: CELLS.FLASH_CORE, blend0: 0, lit0: 0, gravity: 6, drag: 1.2, turb: 2.0, bounce: 0.2, groundY,
      });
    }

    // (f) scorch decal
    if (onGround) fx.decals.add(_g, _gn, DECALS.SCORCH, R * 1.4, { lit: 1, alpha: 0.95, sizeJitter: 0.1 });

    // (g) lingering thin smoke column
    this.emitters.push({ x: _g.x, y: _g.y, z: _g.z, R, time: 0, duration: 20 * Math.min(1.3, k), acc: 0, interval: 0.22 / Math.max(0.5, dens) });
  }

  update(dt) {
    if (dt <= 0 || this.emitters.length === 0) return;
    const ps = this.fx.particles;
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];
      e.time += dt;
      if (e.time > e.duration) {
        this.emitters.splice(i, 1);
        continue;
      }
      e.acc += dt;
      const fade = 1 - e.time / e.duration;
      while (e.acc >= e.interval) {
        e.acc -= e.interval;
        const R = e.R;
        ps.emit({
          x: e.x + rand(-0.15, 0.15) * R, y: e.y + 0.3, z: e.z + rand(-0.15, 0.15) * R,
          vx: rand(-0.4, 0.4), vy: rand(1.6, 2.8), vz: rand(-0.4, 0.4),
          life: rand(4.5, 7), size0: R * 0.12, size1: R * rand(0.5, 0.8), rot: rand(0, 6.28), rotVel: rand(-0.4, 0.4),
          r0: 0.14, g0: 0.13, b0: 0.12, r1: 0.36, g1: 0.36, b1: 0.36, alpha: (0.22 + 0.25 * fade) * fade, fadeIn: 0.12, fadeOut: 0.6,
          atlas: CELLS.SMOKE_A + ((Math.random() * 3) | 0), blend0: 1, lit0: 1, gravity: -0.35, drag: 0.5, turb: 0.9, sizeEase: 1.8,
        });
      }
    }
  }
}
