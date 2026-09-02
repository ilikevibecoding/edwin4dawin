import * as THREE from 'three';
import { createNoiseTexture } from './textures.js';
import { viewModelToWorld, rand } from './util.js';

const _pos = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _col = new THREE.Color();

/**
 * Ejected brass: small tapered cylinders as Rapier dynamic bodies (pooled to quality.maxCasings),
 * rendered with a single InstancedMesh (metallic gold, per-instance tint + roughness variation).
 * Emits 'casing:bounce' { position } on the first ground contact for audio; removed after 12 s.
 */
export class Casings {
  constructor(fx) {
    this.fx = fx;
    this.game = fx.game;
    const q = fx.game.settings.quality;
    this.max = Math.max(4, q.maxCasings || 32);
    this.lifetime = 12;
    const geo = new THREE.CylinderGeometry(0.0034, 0.0048, 0.045, 10, 1, false);
    const rough = createNoiseTexture(64, 21, { scale: 5, contrast: 1.1, base: 0.4 });
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd2a94f,
      metalness: 1.0,
      roughness: 0.42,
      roughnessMap: rough,
      envMapIntensity: 1.3,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.name = 'Casings';
    this.mesh.visible = false;
    const colors = new Float32Array(this.max * 3);
    for (let i = 0; i < this.max; i++) {
      _col.setHSL(0.1 + rand(-0.012, 0.012), rand(0.55, 0.75), rand(0.5, 0.62));
      colors[i * 3] = _col.r;
      colors[i * 3 + 1] = _col.g;
      colors[i * 3 + 2] = _col.b;
    }
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    fx.root.add(this.mesh);
    fx.game.render.setupObject(this.mesh);
    this.items = [];
    this._free = [];
    for (let i = 0; i < this.max; i++) this._free.push(new THREE.Object3D());
  }

  spawn(position, velocity, angularVelocity) {
    const { physics, events } = this.game;
    if (!position || !physics) return;
    if (this.items.length >= this.max) this._remove(0);
    const obj = this._free.pop() || new THREE.Object3D();
    viewModelToWorld(this.game, position, _pos);
    _e.set(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
    _q.setFromEuler(_e);
    const lin = velocity || { x: rand(1.5, 3), y: rand(1.5, 2.5), z: 0 };
    const ang = angularVelocity || { x: rand(-30, 30), y: rand(-30, 30), z: rand(-30, 30) };
    const wrapper = physics.addDynamicBody({
      position: _pos,
      quaternion: _q,
      shape: { type: 'cylinder', halfHeight: 0.0225, r: 0.0045 },
      mass: 0.012,
      restitution: 0.35,
      friction: 0.5,
      linvel: lin,
      angvel: ang,
      linearDamping: 0.12,
      angularDamping: 0.35,
      ccd: true,
      object: obj,
      data: { surface: 'metal', casing: true },
    });
    obj.position.copy(_pos);
    obj.quaternion.copy(_q);
    this.items.push({ wrapper, obj, age: 0, bounced: false, prevY: _pos.y, prevDy: 0 });
    void events;
  }

  _remove(index) {
    const it = this.items[index];
    if (!it) return;
    it.wrapper.remove();
    this._free.push(it.obj);
    this.items.splice(index, 1);
  }

  update(dt) {
    const n = this.items.length;
    if (n === 0) {
      this.mesh.visible = false;
      return;
    }
    const events = this.game.events;
    let k = 0;
    for (let i = 0; i < this.items.length; ) {
      const it = this.items[i];
      if (dt > 0) {
        it.age += dt;
        const y = it.obj.position.y;
        const dy = y - it.prevY;
        if (!it.bounced && it.age > 0.08 && it.prevDy < -0.004 && dy > -0.0005) {
          it.bounced = true;
          events.emit('casing:bounce', { position: it.obj.position.clone() });
        }
        it.prevDy = dy;
        it.prevY = y;
        if (it.age > this.lifetime || y < -20) {
          this._remove(i);
          continue;
        }
      }
      it.obj.updateMatrix();
      this.mesh.setMatrixAt(k++, it.obj.matrix);
      i++;
    }
    this.mesh.count = k;
    this.mesh.visible = k > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
