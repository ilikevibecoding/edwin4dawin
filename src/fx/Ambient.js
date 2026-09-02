import * as THREE from 'three';
import { GROUP, groups } from '../core/Physics.js';
import { CELLS } from './textures.js';
import { rand, groundHeight } from './util.js';

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _eye = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * War-zone dressing: 2–3 tall smoke columns rising from far beyond the plaza rooftops (pre-warmed so they
 * are already there on the first frame) and a few sun-lit dust motes drifting near the camera.
 */
export class Ambient {
  constructor(fx) {
    this.fx = fx;
    this.game = fx.game;
    const world = this.game.world;
    let cx = 0, cz = 0, half = 40;
    try {
      const b = world?.getBounds?.();
      if (b && !b.isEmpty()) {
        cx = (b.min.x + b.max.x) * 0.5;
        cz = (b.min.z + b.max.z) * 0.5;
        half = Math.max(b.max.x - b.min.x, b.max.z - b.min.z) * 0.5;
      }
    } catch {
      /* stub world */
    }
    const dist = Math.max(85, half * 2.3);
    const wind = { x: 1.4, z: 0.5 };
    this.columns = [
      { az: 0.62, d: dist * 1.0, scale: 1.25, interval: 0.5 },
      { az: 2.75, d: dist * 1.15, scale: 1.0, interval: 0.6 },
      { az: 4.4, d: dist * 0.95, scale: 0.8, interval: 0.75 },
    ].map((c) => {
      const x = cx + Math.cos(c.az) * c.d;
      const z = cz + Math.sin(c.az) * c.d;
      return { x, z, y: groundHeight(this.game, x, z, 0), acc: 0, interval: c.interval, scale: c.scale, wind };
    });
    if (this.fx.density < 0.6) this.columns.length = 2;
    this.moteAcc = 0;
    this.moteTarget = Math.round(36 * this.fx.density);
    this.moteLife = 7;
    this.sunlit = 1;
    this.sunCheck = 0;
    this._sunFilter = groups(GROUP.ALL, GROUP.WORLD);
    this._prewarm();
  }

  _emitColumnPuff(c, age = 0) {
    const s = c.scale;
    const vy = rand(2.4, 3.6) * s;
    const t = age;
    const dark = rand(0.07, 0.11);
    this.fx.particles.emit({
      x: c.x + rand(-2, 2) * s + c.wind.x * t, y: c.y + 2 + vy * t * 0.85, z: c.z + rand(-2, 2) * s + c.wind.z * t,
      vx: c.wind.x + rand(-0.3, 0.3), vy, vz: c.wind.z + rand(-0.3, 0.3),
      life: rand(24, 30), age: t, size0: 5 * s, size1: rand(22, 30) * s, rot: rand(0, 6.28), rotVel: rand(-0.12, 0.12),
      r0: dark, g0: dark * 0.92, b0: dark * 0.85, r1: 0.3, g1: 0.29, b1: 0.29, alpha: rand(0.5, 0.7), fadeIn: 0.05, fadeOut: 0.45,
      atlas: CELLS.SMOKE_A + ((Math.random() * 3) | 0), blend0: 1, lit0: 1, gravity: -0.25, drag: 0.14, turb: 0.9, sizeEase: 1.6,
    });
  }

  _prewarm() {
    for (const c of this.columns) {
      for (let t = 27; t > 0; t -= c.interval) this._emitColumnPuff(c, t);
    }
  }

  update(dt) {
    if (dt <= 0) return;
    for (const c of this.columns) {
      c.acc += dt;
      while (c.acc >= c.interval) {
        c.acc -= c.interval;
        this._emitColumnPuff(c, 0);
      }
    }

    // dust motes near the camera (only where the camera is in sunlight)
    const cam = this.game.camera;
    this.sunCheck -= dt;
    if (this.sunCheck <= 0) {
      this.sunCheck = 0.5;
      cam.getWorldPosition(_eye);
      const hit = this.game.physics?.raycast(_eye, this.game.render.sunDirection, 80, { filter: this._sunFilter });
      this.sunlit = hit ? 0.25 : 1;
    }
    this.moteAcc += dt * (this.moteTarget / this.moteLife) * this.sunlit;
    if (this.moteAcc >= 1) {
      cam.getWorldPosition(_eye);
      cam.getWorldDirection(_fwd);
      _right.crossVectors(_fwd, UP).normalize();
      _up.crossVectors(_right, _fwd);
      while (this.moteAcc >= 1) {
        this.moteAcc -= 1;
        const dist = rand(0.7, 4.5);
        const tint = rand(1.0, 1.6);
        this.fx.particles.emit({
          x: _eye.x + _fwd.x * dist + _right.x * rand(-2.2, 2.2) * dist * 0.5 + _up.x * rand(-1, 1.2) * dist * 0.4,
          y: _eye.y + _fwd.y * dist + _right.y * rand(-2.2, 2.2) * dist * 0.5 + _up.y * rand(-1, 1.2) * dist * 0.4,
          z: _eye.z + _fwd.z * dist + _right.z * rand(-2.2, 2.2) * dist * 0.5 + _up.z * rand(-1, 1.2) * dist * 0.4,
          vx: rand(-0.08, 0.08), vy: rand(-0.06, 0.02), vz: rand(-0.08, 0.08),
          life: this.moteLife * rand(0.7, 1.3), size0: rand(0.006, 0.012), size1: rand(0.006, 0.012),
          r0: tint, g0: tint * 0.95, b0: tint * 0.85, alpha: rand(0.3, 0.6), fadeIn: 0.25, fadeOut: 0.3,
          atlas: CELLS.FLASH_CORE, blend0: 0, lit0: 0, turb: 0.12,
        });
      }
    }
  }
}
