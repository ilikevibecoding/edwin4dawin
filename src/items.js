// Inventory (stacks) and dropped item entities.
import * as THREE from 'three';
import { BLOCKS, B, SHAPE } from './blocks.js';
import { tileUV } from './textures.js';
import { AABB, moveBox } from './player.js';

export const MAX_STACK = 64;

export class Inventory {
  constructor(size = 36) {
    this.slots = new Array(size).fill(null); // {id, count}
    this.selected = 0;
  }
  get held() { return this.slots[this.selected]; }

  add(id, count = 1) {
    // fill existing stacks first (hotbar first)
    for (let i = 0; i < this.slots.length && count > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id && s.count < MAX_STACK) { const n = Math.min(MAX_STACK - s.count, count); s.count += n; count -= n; }
    }
    for (let i = 0; i < this.slots.length && count > 0; i++) {
      if (!this.slots[i]) { const n = Math.min(MAX_STACK, count); this.slots[i] = { id, count: n }; count -= n; }
    }
    return count === 0;
  }
  consume(slot, n = 1) {
    const s = this.slots[slot];
    if (!s) return false;
    s.count -= n;
    if (s.count <= 0) this.slots[slot] = null;
    return true;
  }
  set(slot, id, count) { this.slots[slot] = id ? { id, count } : null; }
}

const ITEM_GEO_CACHE = new Map();
function itemGeometry(id) {
  if (ITEM_GEO_CACHE.has(id)) return ITEM_GEO_CACHE.get(id);
  const def = BLOCKS[id];
  const g = new THREE.BufferGeometry();
  const pos = [], uv = [], idx = [];
  const s = 0.25;
  const isFlat = def.icon === 'flat';
  const h = def.icon === 'slab' ? s * 0.5 : s;
  const faces = [
    { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], uv: (x, y, z) => [1 - z, 1 - y] },
    { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], uv: (x, y, z) => [z, 1 - y] },
    { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], uv: (x, y, z) => [x, z] },
    { n: [0, -1, 0], v: [[1, 0, 1], [0, 0, 1], [0, 0, 0], [1, 0, 0]], uv: (x, y, z) => [1 - x, z] },
    { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], uv: (x, y, z) => [x, 1 - y] },
    { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], uv: (x, y, z) => [1 - x, 1 - y] },
  ];
  if (isFlat) {
    const [tu, tv, ts] = tileUV(def.tex[0]);
    const quad = [[0, 0, 0.5], [1, 0, 0.5], [1, 1, 0.5], [0, 1, 0.5]];
    for (let side = 0; side < 2; side++) {
      const base = pos.length / 3;
      const order = side === 0 ? [0, 1, 2, 3] : [3, 2, 1, 0];
      for (const k of order) { const p = quad[k]; pos.push((p[0] - 0.5) * s, p[1] * s, (p[2] - 0.5) * s * 0.1); uv.push(tu + p[0] * ts, tv + (1 - p[1]) * ts); }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  } else {
    for (let d = 0; d < 6; d++) {
      const f = faces[d];
      const [tu, tv, ts] = tileUV(def.tex[d]);
      const base = pos.length / 3;
      for (const vv of f.v) {
        pos.push((vv[0] - 0.5) * s, vv[1] * h, (vv[2] - 0.5) * s);
        const [u, v] = f.uv(vv[0], vv[1], vv[2]);
        uv.push(tu + u * ts, tv + v * ts);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  ITEM_GEO_CACHE.set(id, g);
  return g;
}

export class ItemDrops {
  constructor(scene, world, material) {
    this.scene = scene;
    this.world = world;
    this.material = material; // entity material (uniform light)
    this.items = [];
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  spawn(id, x, y, z, count = 1, vel = null) {
    const mesh = new THREE.Mesh(itemGeometry(id), this.material.clone());
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    const it = {
      id, count, mesh, x, y, z, age: 0,
      vx: vel ? vel.x : (Math.random() - 0.5) * 0.1, vy: vel ? vel.y : 0.15, vz: vel ? vel.z : (Math.random() - 0.5) * 0.1,
      pickup: false,
    };
    this.items.push(it);
    return it;
  }

  // tick at 20 tps; returns list of picked up items
  tick(playerBox, playerPos) {
    const picked = [];
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age++;
      if (it.pickup) {
        const dx = playerPos.x - it.x, dy = playerPos.y + 0.9 - it.y, dz = playerPos.z - it.z;
        it.x += dx * 0.5; it.y += dy * 0.5; it.z += dz * 0.5;
        if (dx * dx + dy * dy + dz * dz < 0.1 || it.age > it.pickupAge + 8) {
          picked.push(it);
          this.group.remove(it.mesh);
          it.mesh.material.dispose();
          this.items.splice(i, 1);
        }
        continue;
      }
      const box = new AABB(it.x - 0.125, it.y, it.z - 0.125, it.x + 0.125, it.y + 0.25, it.z + 0.125);
      const res = moveBox(this.world, box, it.vx, it.vy, it.vz, 0, false);
      it.x = box.x0 + 0.125; it.y = box.y0; it.z = box.z0 + 0.125;
      if (res.hitY) it.vy = 0; else it.vy -= 0.04;
      it.vy *= 0.98;
      const friction = res.hitY && res.oy < 0 ? 0.6 : 0.98;
      it.vx *= friction; it.vz *= friction;
      if (this.world.getBlock(Math.floor(it.x), Math.floor(it.y), Math.floor(it.z)) === B.WATER) { it.vy += 0.06; it.vy *= 0.8; }
      // stuck inside a block -> pop up
      if (BLOCKS[this.world.getBlock(Math.floor(it.x), Math.floor(it.y + 0.1), Math.floor(it.z))].opaque) it.y += 1;
      if (it.age > 10) {
        // Minecraft rule: item box intersects the player box expanded by (1, 0.5, 1)
        const pb = playerBox;
        if (it.x + 0.125 > pb.x0 - 1 && it.x - 0.125 < pb.x1 + 1 && it.y + 0.25 > pb.y0 - 0.5 && it.y < pb.y1 + 0.5 && it.z + 0.125 > pb.z0 - 1 && it.z - 0.125 < pb.z1 + 1) {
          it.pickup = true; it.pickupAge = it.age;
        }
      }
      if (it.age > 20 * 60 * 5) { this.group.remove(it.mesh); this.items.splice(i, 1); }
    }
    return picked;
  }

  // Smooth render update
  render(alpha, time, lightSampler) {
    for (const it of this.items) {
      const bobY = Math.sin(time * 2 + it.age * 0.05) * 0.03 + 0.1;
      it.mesh.position.set(it.x, it.y + bobY, it.z);
      it.mesh.rotation.y = time * 1.5 + it.age * 0.01;
      const l = lightSampler(it.x, it.y + 0.3, it.z);
      it.mesh.material.uniforms.uLight.value.set(l[0], l[1]);
    }
  }
}
