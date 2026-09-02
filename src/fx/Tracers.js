import * as THREE from 'three';
import { GROUP, groups } from '../core/Physics.js';
import { CELLS } from './textures.js';
import { viewModelToWorld } from './util.js';

const _from = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _end = new THREE.Vector3();

/**
 * Tracer rounds: a thin velocity-stretched additive streak (bright warm head, fading tail) travelling
 * from the muzzle to the hit point at ~300 m/s. Player shots every 3rd round, every enemy shot.
 * Rendered by the shared particle batch — no extra draw calls.
 */
export class Tracers {
  constructor(fx) {
    this.fx = fx;
    this.game = fx.game;
    this.speed = 300;
    this.everyNth = 3;
    this._shot = 0;
    this._hitFrame = -1;
    this._hitPoint = new THREE.Vector3();
    this._enemyFilter = groups(GROUP.ALL, GROUP.WORLD | GROUP.PLAYER | GROUP.DEBRIS);
    this._playerFilter = groups(GROUP.ALL, GROUP.WORLD | GROUP.ENEMY | GROUP.DEBRIS);
  }

  /** Called from 'bullet:hit' so the tracer can end exactly at the resolved hit point. */
  onHit(e) {
    if (e.source !== 'player') return;
    this._hitFrame = this.game.frame;
    this._hitPoint.copy(e.point);
  }

  /** 'weapon:fire' — `e.muzzle` world position, `e.origin/direction` view ray. */
  onPlayerFire(e) {
    this._shot++;
    if (this._shot % this.everyNth !== 0) return;
    const muzzle = e.muzzle || this.game.weapons?.getMuzzleWorldPosition?.(_from) || e.origin;
    viewModelToWorld(this.game, muzzle, _from);
    if (this._hitFrame === this.game.frame) {
      _end.copy(this._hitPoint);
    } else {
      _dir.copy(e.direction).normalize();
      const hit = this.game.physics.raycast(e.origin, _dir, 400, { filter: this._playerFilter, exclude: this.game.player.character?.collider });
      if (hit) _end.copy(hit.point);
      else _end.copy(e.origin).addScaledVector(_dir, 300);
    }
    this.fire(_from, _end, { r: 7.0, g: 4.6, b: 1.8, width: 0.09, length: 5 });
  }

  /** 'enemy:fire' — { origin, direction }. */
  onEnemyFire(e) {
    _dir.copy(e.direction).normalize();
    const hit = this.game.physics.raycast(e.origin, _dir, 400, { filter: this._enemyFilter });
    if (hit) _end.copy(hit.point);
    else _end.copy(e.origin).addScaledVector(_dir, 300);
    this.fire(e.origin, _end, { r: 6.5, g: 2.6, b: 0.8, width: 0.1, length: 6 });
  }

  /** Generic tracer between two world points. */
  fire(from, to, { r = 6.5, g = 4.0, b = 1.6, width = 0.09, length = 5, speed = this.speed } = {}) {
    _dir.copy(to).sub(from);
    const dist = _dir.length();
    if (dist < 0.5) return;
    _dir.multiplyScalar(1 / dist);
    const len = Math.min(length, dist * 0.6);
    const life = dist / speed;
    // start half a streak ahead so the tail begins at the muzzle (the quad is centred on the particle)
    this.fx.particles.emit({
      x: from.x + _dir.x * len * 0.5, y: from.y + _dir.y * len * 0.5, z: from.z + _dir.z * len * 0.5,
      vx: _dir.x * speed, vy: _dir.y * speed, vz: _dir.z * speed,
      life, size0: width, size1: width, r0: r, g0: g, b0: b, alpha: 1, fadeIn: 0.02, fadeOut: 0.1,
      atlas: CELLS.STREAK, blend0: 0, lit0: 0, stretch: len / speed,
    });
  }
}
