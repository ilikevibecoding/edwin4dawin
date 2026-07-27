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
  dirt: [0x3e2f1d, 0x4c3b26, 0x302518],
  concrete: [0x4a4338, 0x574c40, 0x3c362e],
  default: [0x483f35, 0x544a3e, 0x3a332c],
};
// sun-catching dust for the ground shock ring (warmer + a step lighter than
// the column dirt, but kept dark enough to sit in the scene)
const RING_PALETTES = {
  dirt: [0x59452c, 0x68543a, 0x4a3925],
  concrete: [0x6e6252, 0x5f5546, 0x7a6d5b],
  default: [0x685c4b, 0x5a5042, 0x726555],
};

/**
 * CPU-tracked embers that mirror the GPU ballistic integration so smoke
 * puffs can be dropped exactly along each ember's streak path.
 */
export class EmberTrails {
  constructor(smokePool, max = 40) {
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
          pos: _v, vel: _v2.set(randSpread(0.2), randRange(0.2, 0.5), randSpread(0.2)),
          life: randRange(0.9, 1.6) * it.size, size0: 0.16 * it.size, size1: randRange(0.8, 1.3) * it.size,
          color: randPick([0x2e2924, 0x262119, 0x3a332c]), alpha: randRange(0.28, 0.4),
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
    const groundHit = vfx.game.world.colliders.raycast(_v, _down, 9);
    const groundY = groundHit ? groundHit.point.y : 0;
    // generous threshold: a blast a couple meters up still kicks the ground
    // (tight 1.8*s silently dropped ring/column/scorch on elevated poses)
    const isGround = groundHit && (p.y - groundY) < 2.6 * s;
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

    // --- (h) HDR light flash + lingering ember glow --------------------------
    // main flash: paints nearby walls/ground orange for ~0.6-1s
    vfx.flashLight(p, 0xffb066, 900 * s, 3.2, 62 * s);
    // ember light: dim, warm, hangs around ~2s as the fireball chars out.
    // Held 1.8*s up so its ground pool grades off softly instead of stamping
    // a hard-edged glowing disc at the blast base.
    vfx.flashLight(_v.copy(p).setY(p.y + 1.8 * s), 0xff6a22, 170 * s, 1.1, 36 * s);

    // sprite counts grow with blast size so airstrike bombs dominate the frame
    const nMul = Math.min(s, 1.6);

    // --- (b) fireball -----------------------------------------------------
    // quick additive burst: the first ~0.3s of raw energy (washes hot, on purpose)
    vfx.fire.burst(Math.round(8 * nMul), () => {
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
    vfx.fireN.burst(Math.round(18 * nMul), () => {
      upDir(_dir, 0.5);
      _v.copy(p).addScaledVector(_dir, 0.85 * s);
      _v.y += 0.4 * s;
      _v2.copy(_dir).multiplyScalar(randRange(3, 6) * s);
      // modest vertical bonus: the fastest sprites must not out-run the
      // cluster and hang as lone opaque orange dots against the sky
      _v2.y += randRange(1.2, 2.8) * s;
      _c.setRGB(1, randRange(0.88, 1), randRange(0.82, 0.95));
      return {
        pos: _v, vel: _v2,
        // wide life spread so hot-yellow and deep-red sprites coexist; higher
        // drag + earlier fade keep dying red sprites inside the smoke mass
        // instead of drifting apart into isolated orange dots
        life: randRange(0.55, 1.18), size0: randRange(2.2, 3.2) * s, size1: randRange(4.0, 5.6) * s,
        color: _c, alpha: 1, ramp: 1, rotSpeed: randSpread(2.4), drag: 2.6, gravity: -1.5 * s,
        fadeIn: 0.005, fadeOut: 0.58,
      };
    });
    // rolling risers: keep burning upward a beat longer; half get a mild
    // velocity stretch so the top of the ball keeps tongue-shaped tips
    // instead of decaying into a row of round cotton dots
    vfx.fireN.burst(Math.round(8 * nMul), () => ({
      pos: _v.set(p.x + randSpread(0.6 * s), p.y + randRange(0.4, 1.2) * s, p.z + randSpread(0.6 * s)),
      vel: _v2.set(randSpread(1.0 * s), randRange(2.6, 4.6) * s, randSpread(1.0 * s)),
      // flames shrink as they burn out (size1 < peak) and every riser keeps a
      // little velocity stretch — a lofted flame is never a perfect circle
      life: randRange(0.8, 1.25), size0: randRange(1.6, 2.2) * s, size1: randRange(2.0, 3.0) * s,
      color: _c.setRGB(1, randRange(0.85, 1), randRange(0.8, 0.95)),
      alpha: 1, ramp: 1, rotSpeed: randSpread(3), drag: 2.0, gravity: -0.9 * s,
      stretch: randRange(0.05, 0.14),
      fadeIn: 0.005, fadeOut: 0.58,
    }));
    // charred cap: black tips rolling off the fireball — eased in so no dark
    // polygon ever pops inside the burning core (round-1 "hexagon" bug)
    vfx.smoke.burst(5, () => ({
      pos: _v.set(p.x + randSpread(0.6 * s), p.y + randRange(1.6, 2.6) * s, p.z + randSpread(0.6 * s)),
      vel: _v2.set(randSpread(1.4 * s), randRange(2.6, 4.2) * s, randSpread(1.4 * s)),
      life: randRange(2.5, 4), size0: randRange(1.6, 2.4) * s, size1: randRange(4.0, 5.5) * s,
      color: randPick([0x131110, 0x1c1815]), alpha: 0.85,
      rotSpeed: randSpread(1.2), drag: 1.5, gravity: -0.5,
      fadeIn: 0.16, fadeOut: 0.5,
    }));
    // fire licks: velocity-stretched flame tongues shooting through the
    // volume (0.15-0.35s) — internal structure so the ball never reads as
    // a stack of gaussian cotton puffs
    vfx.fire.burst(Math.round(10 * nMul), () => {
      upDir(_dir, 0.6);
      _v.copy(p).addScaledVector(_dir, randRange(0.3, 0.9) * s);
      _v2.copy(_dir).multiplyScalar(randRange(9, 16) * s);
      _v2.y += randRange(0.5, 2) * s;
      return {
        pos: _v, vel: _v2,
        life: randRange(0.15, 0.35), size0: randRange(0.55, 0.85) * s, size1: randRange(0.3, 0.5) * s,
        color: _c.setRGB(1, randRange(0.9, 1), randRange(0.8, 0.9)), alpha: 1, ramp: 1,
        drag: 1.1, stretch: randRange(0.12, 0.2), fadeIn: 0.005, fadeOut: 0.55,
      };
    });
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
    vfx.smoke.burst(Math.round(16 * nMul), () => {
      upDir(_dir, 0.65);
      _v.copy(p).addScaledVector(_dir, 0.5 * s);
      _v.y += 0.4 * s;
      _v2.copy(_dir).multiplyScalar(randRange(0.7, 1.5) * s);
      _v2.y += randRange(1.4, 2.6) * s;
      return {
        pos: _v, vel: _v2,
        life: randRange(4, 8), size0: randRange(2.4, 3.2) * s, size1: randRange(5.0, 7.0) * s,
        color: randPick([0x161310, 0x201c17, 0x2e2721, 0x221d18, 0x0e0d0b]), alpha: 1,
        rotSpeed: randSpread(0.7), drag: 1.3, gravity: -0.45,
        fadeIn: randRange(0.05, 0.16), fadeOut: 0.5,
      };
    });
    // grounded base smoke: keeps the column connected to the crater
    vfx.smoke.burst(Math.round(7 * nMul), () => ({
      pos: _v.set(p.x + randSpread(0.8 * s), groundY + randRange(0.4, 1.6) * s, p.z + randSpread(0.8 * s)),
      vel: _v2.set(randSpread(0.5), randRange(0.5, 1.0) * s, randSpread(0.5)),
      life: randRange(6, 10), size0: randRange(2.2, 3.0) * s, size1: randRange(5.0, 7.0) * s,
      color: randPick([0x1c1814, 0x262019, 0x2a241d, 0x14110e]), alpha: 0.95,
      rotSpeed: randSpread(0.4), drag: 1.5, gravity: -0.3,
      fadeIn: randRange(0.04, 0.1), fadeOut: 0.5,
    }));

    // --- (d) ground response: radial dust jets, then the expanding ring ------
    // frame 1 is short ground-hugging STREAKS, never 16 fat sprites overlapping
    // into a solid glowing pancake disc at the blast base
    if (isGround) {
      const ringY = groundY + 0.3 * s;
      vfx.smoke.burst(10, (i) => {
        const a = (i / 10) * Math.PI * 2 + randSpread(0.3);
        const ca = Math.cos(a), sa = Math.sin(a);
        const sp = randRange(16, 26) * s;
        return {
          pos: _v.set(p.x + ca * 0.6 * s, groundY + randRange(0.15, 0.4) * s, p.z + sa * 0.6 * s),
          vel: _v2.set(ca * sp, randRange(0.6, 1.6), sa * sp),
          life: randRange(0.22, 0.4), size0: 0.55 * s, size1: randRange(0.8, 1.2) * s,
          color: randPick(ringCols), alpha: 0.9, drag: 2.0,
          stretch: randRange(0.035, 0.06), fadeIn: 0.01, fadeOut: 0.5,
        };
      });
      // dust ring proper eases in a beat later, already spread out
      vfx.smoke.burst(16, (i) => {
        const a = (i / 16) * Math.PI * 2 + randSpread(0.2);
        const ca = Math.cos(a), sa = Math.sin(a);
        return {
          pos: _v.set(p.x + ca * 2.0 * s, ringY, p.z + sa * 2.0 * s),
          vel: _v2.set(ca * randRange(17, 27) * s, randRange(0.4, 1.4), sa * randRange(17, 27) * s),
          life: randRange(0.9, 1.5), size0: 0.9 * s, size1: randRange(4.2, 5.8) * s,
          color: randPick(ringCols), alpha: 0.75, rotSpeed: randSpread(0.4),
          drag: 2.6, fadeIn: 0.12, fadeOut: 0.45,
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
    // mid-gray concrete tones in the mix: lit faces stay readable against
    // the fireball instead of every chunk silhouetting to black
    for (let i = 0; i < 14; i++) {
      upDir(_dir, 0.5);
      vfx.debris.spawn({
        pos: p, vel: _v2.copy(_dir).multiplyScalar(randRange(8, 19) * s),
        size: randRange(0.07, 0.16) * s, life: randRange(1.6, 3),
        color: randPick([0x6a5f52, 0x4a4238, 0x7d7264, 0x35302a]), ground: groundY,
      });
    }
    for (let i = 0; i < 5; i++) {
      upDir(_dir, 0.7);
      _v2.copy(_dir).multiplyScalar(randRange(5, 9) * s);
      vfx.debris.spawn({
        pos: p, vel: _v2,
        size: randRange(0.18, 0.3) * s, life: randRange(2.5, 4), spin: 5,
        color: randPick([0x5c5248, 0x6a5f52, 0x3d362e]), ground: groundY, restitution: 0.22,
      });
      // dusty micro-trail behind the big chunks (drag~0 + g14 mirrors debris)
      if (i < 4) {
        this.trails.spawn({
          pos: p, vel: _v2, drag: 0.0001, gravity: 14,
          life: randRange(0.7, 1.1), size: Math.min(s, 1.3) * 0.85,
        });
      }
    }

    // --- (i) vertical dirt column for ground hits ----------------------------
    // COD artillery look: at radius 9+ this tops out 12-18m and reads from 80m
    if (isGround) {
      const gx = p.x, gy = groundY, gz = p.z;
      vfx.smoke.burst(14, (i) => ({
        pos: _v2.set(gx + randSpread(0.3 * s), gy + (i / 14) * 1.2 * s, gz + randSpread(0.3 * s)),
        // tight velocity spread keeps the shaft connected instead of beading
        vel: _v.set(randSpread(1.1), randRange(15, 20) * s, randSpread(1.1)),
        life: randRange(2.0, 3.0), size0: 1.1 * s, size1: randRange(3.2, 4.2) * s,
        color: randPick(dirtCols), alpha: 0.86, rotSpeed: randSpread(0.5),
        drag: 1.5, gravity: 1.7, fadeIn: 0.03, fadeOut: 0.5,
      }));
      // wide dusty base
      vfx.smoke.burst(6, () => ({
        pos: _v2.set(gx + randSpread(0.9 * s), gy + 0.5 * s, gz + randSpread(0.9 * s)),
        vel: _v.set(randSpread(2.8 * s), randRange(0.9, 1.8) * s, randSpread(2.8 * s)),
        life: randRange(1.3, 2.0), size0: 1.8 * s, size1: randRange(3.6, 4.6) * s,
        color: randPick(dirtCols), alpha: 0.55, rotSpeed: randSpread(0.8),
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
