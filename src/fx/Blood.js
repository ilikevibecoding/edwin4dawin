import * as THREE from 'three';
import { GROUP, groups } from '../core/Physics.js';
import { CELLS, DECALS } from './textures.js';
import { rand, randomCone, groundHeight } from './util.js';

const _d = new THREE.Vector3();
const _v = new THREE.Vector3();
const _o = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);

/**
 * Hit reactions on flesh: a red mist puff + droplets flying on along the bullet direction, and a small
 * dark blood decal on the nearest surface behind the target (raycast along the direction, then down).
 */
export class Blood {
  constructor(fx) {
    this.fx = fx;
    this.game = fx.game;
    this._filter = groups(GROUP.ALL, GROUP.WORLD);
    this._lastDecal = -1;
  }

  hit(point, direction, { headshot = false, amount = 1 } = {}) {
    if (!point) return;
    const ps = this.fx.particles;
    const dens = this.fx.density;
    _d.copy(direction || this.game.player.forward).normalize();
    const scale = headshot ? 1.5 : 1;
    const ground = groundHeight(this.game, point.x, point.z, point.y - 2);

    // mist: dark red, alpha blended, softly lit
    const mistN = Math.round(rand(3, 5) * dens);
    for (let i = 0; i < mistN; i++) {
      randomCone(_d, 0.9, _v);
      const spd = rand(1.0, 2.6) * scale;
      ps.emit({
        x: point.x + _d.x * 0.05, y: point.y + _d.y * 0.05, z: point.z + _d.z * 0.05,
        vx: _v.x * spd, vy: _v.y * spd + 0.2, vz: _v.z * spd,
        life: rand(0.45, 0.8), size0: 0.1 * scale, size1: rand(0.45, 0.7) * scale, rot: rand(0, 6.28), rotVel: rand(-2, 2),
        r0: 0.3, g0: 0.02, b0: 0.015, r1: 0.12, g1: 0.01, b1: 0.01, alpha: 0.6, fadeIn: 0.04, fadeOut: 0.65,
        atlas: CELLS.BLOOD, blend0: 1, lit0: 0.5, gravity: 2.2, drag: 3.2, sizeEase: 3,
      });
    }
    // droplets: small stretched dark red streaks with gravity
    const dropN = Math.round(rand(6, 10) * dens * scale);
    for (let i = 0; i < dropN; i++) {
      randomCone(_d, 0.7, _v);
      const spd = rand(2.5, 7);
      ps.emit({
        x: point.x, y: point.y, z: point.z, vx: _v.x * spd, vy: _v.y * spd + rand(0, 1), vz: _v.z * spd,
        life: rand(0.35, 0.8), size0: rand(0.012, 0.03), size1: 0.01, r0: 0.22, g0: 0.015, b0: 0.01, alpha: 1, fadeIn: 0, fadeOut: 0.3,
        atlas: CELLS.STREAK, blend0: 1, lit0: 0.5, gravity: 12, drag: 0.6, stretch: 0.02, bounce: 0.05, groundY: ground,
      });
    }

    // decal on the surface behind, else on the ground below (throttled to one per frame)
    if (this._lastDecal === this.game.frame) return;
    this._lastDecal = this.game.frame;
    const physics = this.game.physics;
    _o.copy(point).addScaledVector(_d, 0.25);
    let hit = physics?.raycast(_o, _d, 2.5, { filter: this._filter });
    if (hit) {
      this.fx.decals.add(hit.point, hit.normal, DECALS.BLOOD_SPLAT, rand(0.3, 0.5) * scale, { lit: 1, alpha: 0.9, sizeJitter: 0.1 });
      return;
    }
    _o.copy(point).addScaledVector(_d, 0.6);
    hit = physics?.raycast(_o, _down, 2.5, { filter: this._filter });
    if (hit) this.fx.decals.add(hit.point, hit.normal, DECALS.BLOOD_SPLAT, rand(0.25, 0.4) * scale, { lit: 1, alpha: 0.85, sizeJitter: 0.1 });
  }
}
