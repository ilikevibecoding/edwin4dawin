import * as THREE from 'three';
import { createNoiseTexture, mulberry32, CELLS } from './textures.js';
import { rand } from './util.js';

const _col = new THREE.Color();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

/** Faceted, irregular chunk: every unique vertex of the base solid is displaced by a seeded offset. */
function chunkGeometry(base, seed, amount) {
  const rng = mulberry32(seed);
  const g = base.index ? base.toNonIndexed() : base.clone();
  const pos = g.attributes.position;
  const offsets = new Map();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let d = offsets.get(key);
    if (!d) {
      d = [(rng() - 0.5) * amount, (rng() - 0.5) * amount, (rng() - 0.5) * amount];
      offsets.set(key, d);
    }
    pos.setXYZ(i, x + d[0], y + d[1], z + d[2]);
  }
  g.computeVertexNormals();
  base.dispose();
  return g;
}

/**
 * Physics debris chunks (Rapier dynamic boxes/tetrahedra) rendered with two InstancedMeshes, pooled to
 * quality.maxDebris. The first few chunks of each burst leave a short dark smoke trail — the signature
 * "rubble arcing out of the blast" look. Chunks sink away 8–12 s after spawning.
 */
export class Debris {
  constructor(fx) {
    this.fx = fx;
    this.game = fx.game;
    const q = fx.game.settings.quality;
    this.max = Math.max(8, q.maxDebris || 40);
    const albedo = createNoiseTexture(64, 33, { scale: 5, contrast: 0.7, base: 0.55 });
    const rough = createNoiseTexture(64, 35, { scale: 3, contrast: 0.5, base: 0.8 });
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, map: albedo, roughnessMap: rough, flatShading: true });
    // kind 0: broken masonry block (jittered box), kind 1: rock-like lump (jittered dodecahedron)
    this.meshes = [
      new THREE.InstancedMesh(chunkGeometry(new THREE.BoxGeometry(1, 1, 1), 101, 0.42), mat, this.max),
      new THREE.InstancedMesh(chunkGeometry(new THREE.DodecahedronGeometry(0.6, 0), 202, 0.5), mat, this.max),
    ];
    for (const m of this.meshes) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0;
      m.visible = false;
      m.frustumCulled = false;
      m.castShadow = true;
      m.receiveShadow = true;
      m.name = 'Debris';
      const colors = new Float32Array(this.max * 3);
      for (let i = 0; i < this.max; i++) {
        _col.setHSL(rand(0.05, 0.11), rand(0.06, 0.28), rand(0.26, 0.55));
        colors[i * 3] = _col.r;
        colors[i * 3 + 1] = _col.g;
        colors[i * 3 + 2] = _col.b;
      }
      m.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
      fx.root.add(m);
    }
    fx.game.render.setupObject(this.meshes[0]);
    this.items = [];
    this._free = [];
    for (let i = 0; i < this.max; i++) this._free.push(new THREE.Object3D());
  }

  /**
   * Launch one chunk. `size` = approximate edge in meters. `trail` → smoke trail for the first ~1.5 s.
   */
  spawn(position, velocity, size = 0.2, { kind = Math.random() < 0.5 ? 0 : 1, trail = false, life = 9, color = null } = {}) {
    const { physics } = this.game;
    if (!physics) return null;
    if (this.items.length >= this.max) this._remove(0);
    const obj = this._free.pop() || new THREE.Object3D();
    _e.set(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28));
    _q.setFromEuler(_e);
    const sx = size * rand(0.6, 1.3);
    const sy = size * rand(0.5, 1.1);
    const sz = size * rand(0.6, 1.3);
    const half = kind === 0 ? 0.5 : 0.42;
    const wrapper = physics.addDynamicBody({
      position,
      quaternion: _q,
      shape: { type: 'box', hx: sx * half, hy: sy * half, hz: sz * half },
      mass: Math.max(0.05, sx * sy * sz * 1600),
      restitution: 0.22,
      friction: 0.9,
      linvel: velocity,
      angvel: { x: rand(-14, 14), y: rand(-14, 14), z: rand(-14, 14) },
      linearDamping: 0.05,
      angularDamping: 0.4,
      object: obj,
      data: { surface: 'stone', debris: true },
    });
    obj.position.copy(position);
    obj.quaternion.copy(_q);
    obj.scale.set(sx, sy, sz);
    const item = { wrapper, obj, age: 0, life, kind, sx, sy, sz, trail, trailAcc: 0, lastX: position.x, lastY: position.y, lastZ: position.z, color };
    this.items.push(item);
    return item;
  }

  _remove(index) {
    const it = this.items[index];
    if (!it) return;
    it.wrapper.remove();
    this._free.push(it.obj);
    this.items.splice(index, 1);
  }

  update(dt) {
    const ps = this.fx.particles;
    const counts = [0, 0];
    for (let i = 0; i < this.items.length; ) {
      const it = this.items[i];
      const o = it.obj;
      if (dt > 0) {
        it.age += dt;
        if (it.age > it.life + 0.6 || o.position.y < -30) {
          this._remove(i);
          continue;
        }
        if (it.trail && it.age < 1.6) {
          const dx = o.position.x - it.lastX, dy = o.position.y - it.lastY, dz = o.position.z - it.lastZ;
          it.trailAcc += Math.sqrt(dx * dx + dy * dy + dz * dz);
          it.lastX = o.position.x;
          it.lastY = o.position.y;
          it.lastZ = o.position.z;
          if (it.trailAcc > 0.45) {
            it.trailAcc = 0;
            const s = it.sx * 1.6;
            ps.emit({
              x: o.position.x, y: o.position.y, z: o.position.z, vx: rand(-0.3, 0.3), vy: rand(0.2, 0.8), vz: rand(-0.3, 0.3),
              life: rand(0.9, 1.5), size0: s, size1: s * 3.2, rot: rand(0, 6.28), rotVel: rand(-1, 1),
              r0: 0.12, g0: 0.11, b0: 0.1, r1: 0.3, g1: 0.3, b1: 0.3, alpha: 0.55, fadeIn: 0.05, fadeOut: 0.6,
              atlas: CELLS.SMOKE_A + (i % 3), blend0: 1, lit0: 1, gravity: -0.3, drag: 1.5, sizeEase: 2,
            });
          }
        }
      }
      // sink into the ground when expiring
      const k = it.age > it.life ? Math.max(0.001, 1 - (it.age - it.life) / 0.6) : 1;
      o.scale.set(it.sx, it.sy * k, it.sz);
      if (k < 1) o.position.y -= (1 - k) * it.sy * 0.5;
      o.updateMatrix();
      const m = this.meshes[it.kind];
      m.setMatrixAt(counts[it.kind]++, o.matrix);
      i++;
    }
    for (let k = 0; k < 2; k++) {
      const m = this.meshes[k];
      m.count = counts[k];
      m.visible = counts[k] > 0;
      m.instanceMatrix.needsUpdate = true;
    }
  }
}
