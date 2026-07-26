import * as THREE from 'three';
import { rand, randRange, randSpread, randPick } from '../core/rand.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);
const _c = new THREE.Color();

/** Random direction in the upper-biased sphere (bias 0..1: 1 = hemisphere). */
function upDir(out, bias) {
  out.set(randSpread(1), randSpread(1), randSpread(1));
  if (out.lengthSq() < 1e-4) out.set(0, 1, 0);
  out.normalize();
  out.y = Math.abs(out.y) * bias + out.y * (1 - bias);
  return out.normalize();
}

const DIRT_PALETTES = {
  dirt: [0x4a3823, 0x5c4830, 0x3a2d1e],
  concrete: [0x5e5548, 0x6e6152, 0x4c443a],
  default: [0x5a5044, 0x6a5f50, 0x4a4238],
};
// sun-catching dust for the ground shock ring (brighter than the column dirt)
const RING_PALETTES = {
  dirt: [0x6b5439, 0x7d654a, 0x59442e],
  concrete: [0x9b8d78, 0x8a7c68, 0xa89a84],
  default: [0x93836c, 0x82755f, 0x9f9080],
};

/**
 * CPU-tracked embers that mirror the GPU ballistic integration so smoke
 * puffs can be dropped exactly along each ember's streak path.
 */
export class EmberTrails {
  constructor(smokePool, max = 28) {
    this.smoke = smokePool;
    this.items = new Array(max).fill(null).map(() => ({
      alive: false, p0: new THREE.Vector3(), v0: new THREE.Vector3(),
      drag: 0.5, gravity: 9, age: 0, life: 1, acc: 0, interval: 0.06, size: 1,
    }));
    this.cursor = 0;
  }

  spawn({ pos, vel, drag = 0.55, gravity = 9, life = 1.2, size = 1 }) {
    const it = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    it.alive = true;
    it.p0.copy(pos);
    it.v0.copy(vel);
    it.drag = drag; it.gravity = gravity; it.life = life;
    it.age = 0; it.acc = 0;
    it.interval = randRange(0.05, 0.075);
    it.size = size;
  }

  update(dt) {
    if (dt <= 0) return;
    for (const it of this.items) {
      if (!it.alive) continue;
      it.age += dt;
      if (it.age >= it.life) { it.alive = false; continue; }
      it.acc += dt;
      while (it.acc >= it.interval) {
        it.acc -= it.interval;
        const t = it.age - it.acc;
        const k = (1 - Math.exp(-it.drag * t)) / it.drag;
        _v.copy(it.v0).multiplyScalar(k).add(it.p0);
        _v.y -= 0.5 * it.gravity * t * t;
        if (_v.y < 0.05) { it.alive = false; break; }
        this.smoke.emit({
          pos: _v, vel: _v2.set(randSpread(0.25), randRange(0.2, 0.55), randSpread(0.25)),
          life: randRange(0.8, 1.5) * it.size, size0: 0.12 * it.size, size1: randRange(0.55, 0.9) * it.size,
          color: randPick([0x4c443c, 0x3c3630, 0x585048]), alpha: randRange(0.4, 0.55),
          rotSpeed: randSpread(1.5), drag: 1.6, fadeIn: 0.08, fadeOut: 0.35,
        });
      }
    }
  }
}

/**
 * Layered COD-style explosion. Owned by the VFX facade which provides the
 * pools; this module only composes them.
 */
export class ExplosionFX {
  constructor(vfx) {
    this.vfx = vfx;
    this.trails = new EmberTrails(vfx.smoke);
  }

  update(dt) { this.trails.update(dt); }

  /**
   * @param {THREE.Vector3} position
   * @param {object} o — {radius, scorch, scale}
   */
  spawn(position, { radius = 6, scorch = true, scale = 1 } = {}) {
    const vfx = this.vfx;
    const p = position;
    const s = scale * (radius / 6);

    // --- ground probe -----------------------------------------------------
    _v.copy(p); _v.y += 0.6;
    const groundHit = vfx.game.world.colliders.raycast(_v, _down, 8);
    const groundY = groundHit ? groundHit.point.y : 0;
    const isGround = groundHit && (p.y - groundY) < 1.8 * s;
    const surface = groundHit?.surface ?? 'concrete';
    const dirtCols = DIRT_PALETTES[surface] ?? DIRT_PALETTES.default;
    const ringCols = RING_PALETTES[surface] ?? RING_PALETTES.default;

    // --- (a) 2-frame white-hot core flash ----------------------------------
    vfx.soft.emit({
      pos: p, vel: _v.set(0, 1.5 * s, 0), life: 0.09,
      size0: 4.5 * s, size1: 8.5 * s, color: 0xfff3da, alpha: 1, fadeIn: 0.01, fadeOut: 0.25,
    });
    vfx.spark.emit({
      pos: p, vel: _v.set(0, 1 * s, 0), life: 0.07,
      size0: 2.2 * s, size1: 3.6 * s, color: 0xffffff, alpha: 1, fadeIn: 0.01, fadeOut: 0.3,
    });

    // --- (h) HDR light flash + lingering fire glow --------------------------
    vfx.flashLight(p, 0xffb066, 340 * s, 5.5, 52 * s);
    vfx.flashLight(_v.copy(p).setY(p.y + 0.8 * s), 0xff5a18, 70 * s, 2.4, 30 * s);

    // --- (b) fireball -----------------------------------------------------
    // quick additive burst: the first ~0.3s of raw energy (washes hot, on purpose)
    vfx.fire.burst(8, () => {
      upDir(_dir, 0.5);
      _v.copy(p).addScaledVector(_dir, 0.6 * s);
      _v.y += 0.3 * s;
      _v2.copy(_dir).multiplyScalar(randRange(4, 9) * s);
      _v2.y += randRange(1, 3) * s;
      return {
        pos: _v, vel: _v2,
        life: randRange(0.22, 0.38), size0: randRange(1.5, 2.2) * s, size1: randRange(2.6, 3.4) * s,
        color: _c.setRGB(1, randRange(0.9, 1), randRange(0.85, 0.95)), alpha: 1, ramp: 1,
        rotSpeed: randSpread(3), drag: 2.4, fadeIn: 0.005, fadeOut: 0.6,
      };
    });
    // volumetric body: normal-blended so overlap reads as rolling mass, ramp
    // takes each sprite white -> orange -> deep red -> smoke-black in place
    vfx.fireN.burst(18, () => {
      upDir(_dir, 0.5);
      _v.copy(p).addScaledVector(_dir, 0.85 * s);
      _v.y += 0.4 * s;
      _v2.copy(_dir).multiplyScalar(randRange(3.5, 7) * s);
      _v2.y += randRange(1.8, 4) * s;
      _c.setRGB(1, randRange(0.88, 1), randRange(0.82, 0.95));
      return {
        pos: _v, vel: _v2,
        // wide life spread so hot-yellow and deep-red sprites coexist
        life: randRange(0.5, 1.25), size0: randRange(2.0, 3.0) * s, size1: randRange(3.6, 5.0) * s,
        color: _c, alpha: 1, ramp: 1, rotSpeed: randSpread(2.4), drag: 2.2, gravity: -1.5 * s,
        fadeIn: 0.005, fadeOut: 0.72,
      };
    });
    // rolling risers: keep burning upward a beat longer
    vfx.fireN.burst(8, () => ({
      pos: _v.set(p.x + randSpread(0.7 * s), p.y + randRange(0.4, 1.2) * s, p.z + randSpread(0.7 * s)),
      vel: _v2.set(randSpread(1.8 * s), randRange(3, 5.5) * s, randSpread(1.8 * s)),
      life: randRange(0.8, 1.25), size0: randRange(1.6, 2.2) * s, size1: randRange(3.2, 4.4) * s,
      color: _c.setRGB(1, randRange(0.85, 1), randRange(0.8, 0.95)),
      alpha: 1, ramp: 1, rotSpeed: randSpread(3), drag: 1.7, gravity: -1.2 * s,
      fadeIn: 0.005, fadeOut: 0.75,
    }));
    // charred cap: black tips rolling off the fireball early
    vfx.smoke.burst(5, () => ({
      pos: _v.set(p.x + randSpread(0.6 * s), p.y + randRange(1.0, 1.9) * s, p.z + randSpread(0.6 * s)),
      vel: _v2.set(randSpread(1.4 * s), randRange(2.6, 4.2) * s, randSpread(1.4 * s)),
      life: randRange(2.5, 4), size0: randRange(1.6, 2.4) * s, size1: randRange(4.0, 5.5) * s,
      color: randPick([0x131110, 0x1c1815]), alpha: 0.95,
      rotSpeed: randSpread(1.2), drag: 1.5, gravity: -0.5,
      fadeIn: 0.02, fadeOut: 0.5,
    }));
    // fast hot fragments for a spiky silhouette
    vfx.fire.burst(6, () => {
      upDir(_dir, 0.35);
      return {
        pos: _v.copy(p).addScaledVector(_dir, 0.5 * s),
        vel: _v2.copy(_dir).multiplyScalar(randRange(10, 17) * s),
        life: randRange(0.3, 0.45), size0: 0.8 * s, size1: randRange(1.3, 1.8) * s,
        color: _c.setRGB(1, 0.95, 0.9), alpha: 1, ramp: 1,
        rotSpeed: randSpread(4), drag: 2.0, fadeIn: 0.005, fadeOut: 0.7,
      };
    });

    // --- (c) inner black smoke, inherits fireball motion, lingers -----------
    vfx.smoke.burst(16, () => {
      upDir(_dir, 0.65);
      _v.copy(p).addScaledVector(_dir, 0.5 * s);
      _v.y += 0.4 * s;
      _v2.copy(_dir).multiplyScalar(randRange(0.7, 1.5) * s);
      _v2.y += randRange(0.7, 1.6) * s;
      return {
        pos: _v, vel: _v2,
        life: randRange(4, 8), size0: randRange(2.0, 2.8) * s, size1: randRange(5.0, 7.0) * s,
        color: randPick([0x161310, 0x201c17, 0x2e2721, 0x221d18, 0x0e0d0b]), alpha: 1,
        rotSpeed: randSpread(0.7), drag: 1.3, gravity: -0.25,
        fadeIn: randRange(0.05, 0.16), fadeOut: 0.5,
      };
    });
    // grounded base smoke: keeps the column connected to the crater
    vfx.smoke.burst(7, () => ({
      pos: _v.set(p.x + randSpread(0.8 * s), groundY + randRange(0.4, 1.6) * s, p.z + randSpread(0.8 * s)),
      vel: _v2.set(randSpread(0.5), randRange(0.5, 1.0) * s, randSpread(0.5)),
      life: randRange(6, 10), size0: randRange(2.2, 3.0) * s, size1: randRange(5.0, 7.0) * s,
      color: randPick([0x1c1814, 0x262019, 0x2a241d, 0x14110e]), alpha: 0.95,
      rotSpeed: randSpread(0.4), drag: 1.5, gravity: -0.16,
      fadeIn: randRange(0.04, 0.1), fadeOut: 0.5,
    }));

    // --- (d) ground shock/dust ring -----------------------------------------
    if (isGround) {
      const ringY = groundY + 0.3 * s;
      vfx.smoke.burst(16, (i) => {
        const a = (i / 16) * Math.PI * 2 + randSpread(0.2);
        const ca = Math.cos(a), sa = Math.sin(a);
        return {
          pos: _v.set(p.x + ca * 1.2 * s, ringY, p.z + sa * 1.2 * s),
          vel: _v2.set(ca * randRange(14, 22) * s, randRange(0.4, 1.4), sa * randRange(14, 22) * s),
          life: randRange(0.8, 1.3), size0: 1.4 * s, size1: randRange(3.8, 5.2) * s,
          color: randPick(ringCols), alpha: 0.8, rotSpeed: randSpread(0.4),
          drag: 2.6, fadeIn: 0.04, fadeOut: 0.45,
        };
      });
    }

    // --- (e) sparks + embers with smoke trails -------------------------------
    vfx.spark.burst(30, () => {
      upDir(_dir, 0.55);
      return {
        pos: p, vel: _v2.copy(_dir).multiplyScalar(randRange(12, 30) * s),
        life: randRange(0.4, 0.9), size0: 0.11 * s, size1: 0.04 * s,
        color: randPick([0xffcf7a, 0xffe4a8, 0xffb050]), alpha: 1,
        gravity: 13, drag: 0.7, stretch: 0.5, fadeOut: 0.6,
      };
    });
    const nEmbers = Math.min(7, Math.round(4 + 2.5 * s));
    for (let i = 0; i < nEmbers; i++) {
      upDir(_dir, 0.75);
      _v2.copy(_dir).multiplyScalar(randRange(9, 17) * s);
      const life = randRange(1.0, 1.6);
      this.trails.spawn({ pos: p, vel: _v2, drag: 0.5, gravity: 9, life, size: Math.min(s, 1.5) });
      vfx.spark.emit({
        pos: p, vel: _v2, life, size0: 0.08 * s, size1: 0.035 * s,
        color: 0xffb050, alpha: 1, gravity: 9, drag: 0.5, stretch: 0.32, fadeOut: 0.5,
      });
    }

    // --- (f) debris: small fast + large slow tumbling chunks -----------------
    for (let i = 0; i < 14; i++) {
      upDir(_dir, 0.5);
      vfx.debris.spawn({
        pos: p, vel: _v2.copy(_dir).multiplyScalar(randRange(8, 19) * s),
        size: randRange(0.07, 0.16) * s, life: randRange(1.6, 3),
        color: randPick([0x4a4238, 0x35302a, 0x5c5248, 0x2e2a24]), ground: groundY,
      });
    }
    for (let i = 0; i < 5; i++) {
      upDir(_dir, 0.7);
      vfx.debris.spawn({
        pos: p, vel: _v2.copy(_dir).multiplyScalar(randRange(5, 9) * s),
        size: randRange(0.18, 0.3) * s, life: randRange(2.5, 4), spin: 5,
        color: randPick([0x3d362e, 0x4a4238, 0x2a2520]), ground: groundY, restitution: 0.22,
      });
    }

    // --- (i) vertical dirt column for ground hits ----------------------------
    if (isGround) {
      const gx = p.x, gy = groundY, gz = p.z;
      vfx.smoke.burst(10, (i) => ({
        pos: _v2.set(gx + randSpread(0.35 * s), gy + (i / 10) * 1.0 * s, gz + randSpread(0.35 * s)),
        vel: _v.set(randSpread(1.4), randRange(11, 18) * s, randSpread(1.4)),
        life: randRange(1.2, 2.1), size0: 0.9 * s, size1: randRange(2.2, 3.2) * s,
        color: randPick(dirtCols), alpha: 0.88, rotSpeed: randSpread(0.6),
        drag: 1.6, gravity: 2.4, fadeIn: 0.03, fadeOut: 0.5,
      }));
      // wide dusty base
      vfx.smoke.burst(6, () => ({
        pos: _v2.set(gx + randSpread(0.9 * s), gy + 0.5 * s, gz + randSpread(0.9 * s)),
        vel: _v.set(randSpread(2.8 * s), randRange(0.9, 1.8) * s, randSpread(2.8 * s)),
        life: randRange(1.3, 2.0), size0: 1.8 * s, size1: randRange(3.6, 4.6) * s,
        color: randPick(dirtCols), alpha: 0.62, rotSpeed: randSpread(0.8),
        drag: 2.0, fadeIn: 0.05, fadeOut: 0.5,
      }));
      // dirt clods thrown up the column
      for (let i = 0; i < 6; i++) {
        vfx.debris.spawn({
          pos: _v2.set(gx + randSpread(0.4 * s), gy + 0.2, gz + randSpread(0.4 * s)),
          vel: _v.set(randSpread(1.8 * s), randRange(9, 16) * s, randSpread(1.8 * s)),
          size: randRange(0.09, 0.2) * s, life: randRange(2, 3.2),
          color: randPick(dirtCols), ground: groundY,
        });
      }
    }

    // --- (g) scorch decal -----------------------------------------------------
    if (scorch && groundHit) {
      vfx._decal(groundHit.point, groundHit.normal, radius * randRange(1.0, 1.25), vfx.decalMats.scorch, 90);
    }
  }
}
