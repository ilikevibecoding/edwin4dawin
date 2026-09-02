import * as THREE from 'three';
import { LAYER } from '../rendering/RenderSystem.js';
import { CELLS, setPlaneUvToCell } from './textures.js';
import { viewModelToWorld, rand } from './util.js';

const _dir = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _world = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qInv = new THREE.Quaternion();
const _qRoll = new THREE.Quaternion();
const _local = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

/**
 * Layered additive muzzle flash: a star/cross plane + hot round core perpendicular to the barrel and two
 * crossed flame "petal" planes along it, randomised per shot, alive for ~3 frames, plus a warm point light
 * and a few smoke wisps / powder sparks in the world batch. The planes are parented to the weapon's
 * `muzzle` Object3D (view-model layer) so they stay glued to the barrel while it recoils.
 */
export class MuzzleFlash {
  constructor(fx) {
    this.fx = fx;
    this.game = fx.game;
    const atlas = fx.atlas;
    const mkMat = (r, g, b) =>
      new THREE.MeshBasicMaterial({
        map: atlas.map,
        color: new THREE.Color(r, g, b),
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
        fog: false,
      });
    const plane = (cell, translateBase = false) => {
      const g = new THREE.PlaneGeometry(1, 1);
      if (translateBase) g.translate(0, 0.5, 0); // base at the origin, flame extends along +Y
      return setPlaneUvToCell(g, atlas, cell);
    };
    this.group = new THREE.Group();
    this.group.name = 'MuzzleFlash';
    this.group.visible = false;
    this.star = new THREE.Mesh(plane(CELLS.FLASH_STAR), mkMat(3.2, 2.3, 1.2));
    this.core = new THREE.Mesh(plane(CELLS.FLASH_CORE), mkMat(4.5, 3.9, 2.8));
    this.petalA = new THREE.Mesh(plane(CELLS.FLASH_PETAL, true), mkMat(2.8, 1.8, 0.8));
    this.petalB = new THREE.Mesh(plane(CELLS.FLASH_PETAL, true), mkMat(2.8, 1.8, 0.8));
    this.meshes = [this.star, this.core, this.petalA, this.petalB];
    for (const m of this.meshes) {
      m.renderOrder = 30;
      m.frustumCulled = false;
      this.group.add(m);
    }
    this.parent = null;
    this.age = 0;
    this.life = 0;
    this.heat = 0;
    this.enabled = true;
  }

  _attach() {
    const muzzle = this.game.weapons?.muzzle;
    const target = muzzle && muzzle.isObject3D ? muzzle : null;
    if (target === this.parent && this.group.parent) return target;
    this.group.removeFromParent();
    if (target) {
      target.add(this.group);
      this.game.render.setViewModel(this.group);
    } else {
      this.fx.root.add(this.group);
      this.group.traverse((o) => o.layers.set(LAYER.WORLD));
    }
    this.parent = target;
    return target;
  }

  /** `position`: world muzzle position; `direction`: world firing direction. */
  fire(position, direction) {
    if (!this.enabled) return;
    const { game } = this;
    const muzzle = this._attach();
    _dir.copy(direction || game.player.forward).normalize();
    const g = this.group;
    if (muzzle) {
      g.position.set(0, 0, 0);
      muzzle.getWorldQuaternion(_q);
      _qInv.copy(_q).invert();
      _local.copy(_dir).applyQuaternion(_qInv); // barrel direction in muzzle-local space
    } else {
      viewModelToWorld(game, position, g.position);
      _local.copy(_dir);
    }
    const s = rand(0.85, 1.25);
    const roll = rand(0, Math.PI * 2);

    // star + core: planes perpendicular to the barrel (their +Z normal along the barrel)
    _q.setFromUnitVectors(Z, _local);
    _qRoll.setFromAxisAngle(_local, roll);
    this.star.quaternion.copy(_qRoll).multiply(_q);
    this.star.position.copy(_local).multiplyScalar(0.07);
    this.star.scale.setScalar(0.5 * s);
    _qRoll.setFromAxisAngle(_local, roll * 1.7);
    this.core.quaternion.copy(_qRoll).multiply(_q);
    this.core.position.copy(_local).multiplyScalar(0.03);
    this.core.scale.setScalar(0.2 * s);

    // petals: crossed planes containing the barrel axis (+Y along the barrel)
    _q.setFromUnitVectors(Y, _local);
    _qRoll.setFromAxisAngle(_local, roll);
    this.petalA.quaternion.copy(_qRoll).multiply(_q);
    this.petalA.position.copy(_local).multiplyScalar(0.01);
    this.petalA.scale.set(0.26 * s, rand(0.5, 0.8) * s, 1);
    _qRoll.setFromAxisAngle(_local, roll + Math.PI / 2);
    this.petalB.quaternion.copy(_qRoll).multiply(_q);
    this.petalB.position.copy(this.petalA.position);
    this.petalB.scale.set(0.22 * s, rand(0.4, 0.65) * s, 1);

    for (const m of this.meshes) m.material.opacity = 1;
    g.visible = true;
    this.age = 0;
    this.life = 0.055;

    // light on the environment + view model
    _world.copy(position);
    this.fx.lights.flash(_world, 0xffb26a, 32, 9, 0.07, { priority: 1 });

    // smoke wisps + powder sparks in the world batch, at the screen-matched position
    viewModelToWorld(game, position, _pos);
    this.heat = Math.min(1, this.heat + 0.12);
    const ps = this.fx.particles;
    const density = this.fx.density;
    const wisps = Math.round((1 + this.heat * 2) * density);
    _right.crossVectors(_dir, Y).normalize();
    _up.crossVectors(_right, _dir);
    for (let i = 0; i < wisps; i++) {
      const spd = rand(1.5, 3.5);
      ps.emit({
        x: _pos.x + _dir.x * 0.08, y: _pos.y + _dir.y * 0.08, z: _pos.z + _dir.z * 0.08,
        vx: _dir.x * spd + _up.x * 0.6 + rand(-0.3, 0.3), vy: _dir.y * spd + 0.7 + rand(0, 0.4), vz: _dir.z * spd + _up.z * 0.6 + rand(-0.3, 0.3),
        life: rand(0.45, 0.9), size0: 0.05, size1: rand(0.28, 0.45), rot: rand(0, 6.28), rotVel: rand(-2, 2),
        r0: 0.62, g0: 0.6, b0: 0.58, alpha: 0.22 + this.heat * 0.15, fadeIn: 0.1, fadeOut: 0.6,
        atlas: CELLS.SMOKE_A + (i % 3), blend0: 1, lit0: 1, gravity: -0.6, drag: 2.5, turb: 0.4, sizeEase: 2.5,
      });
    }
    const sparks = Math.round(rand(2, 4) * density);
    for (let i = 0; i < sparks; i++) {
      const spd = rand(10, 22);
      ps.emit({
        x: _pos.x, y: _pos.y, z: _pos.z,
        vx: _dir.x * spd + rand(-1.5, 1.5), vy: _dir.y * spd + rand(-1, 1.5), vz: _dir.z * spd + rand(-1.5, 1.5),
        life: rand(0.06, 0.16), size0: 0.012, size1: 0.006, r0: 3.5, g0: 1.9, b0: 0.7, r1: 2.0, g1: 0.5, b1: 0.1,
        alpha: 1, fadeIn: 0, fadeOut: 0.5, atlas: CELLS.STREAK, blend0: 0, lit0: 0, gravity: 9, stretch: 0.03,
      });
    }
  }

  update(dt) {
    if (this.heat > 0) this.heat = Math.max(0, this.heat - dt * 0.35);
    if (!this.group.visible) return;
    if (dt <= 0) return;
    this.age += dt;
    const t = this.age / this.life;
    if (t >= 1) {
      this.group.visible = false;
      return;
    }
    // full brightness on the first frame, then a fast decay
    const k = t < 0.34 ? 1 : Math.pow(1 - (t - 0.34) / 0.66, 1.6);
    for (const m of this.meshes) m.material.opacity = k;
    const sh = 1 - t * 0.25;
    this.star.scale.setScalar(this.star.scale.x * (1 - dt * 3));
    this.petalA.scale.y *= sh;
    this.petalB.scale.y *= sh;
  }
}
