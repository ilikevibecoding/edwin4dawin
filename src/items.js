// Items (non-block registry + food values), inventory (stacks) and dropped item entities.
import * as THREE from 'three';
import { BLOCKS, B, SHAPE, ITEM_ID_BASE, isItemId, registerItemDef } from './blocks.js';
import { tileUV } from './textures.js';
import { AABB, moveBox } from './player.js';

export const MAX_STACK = 64;

// Item ids share the inventory id space with blocks; everything >= ITEM_ID_BASE (1000) is a non-block item.
export const I = {
  APPLE: 1000, BREAD: 1001, WHEAT: 1002, SEEDS: 1003, BEEF_RAW: 1004, BEEF_COOKED: 1005, PORKCHOP_RAW: 1006, PORKCHOP_COOKED: 1007,
  CHICKEN_RAW: 1008, CHICKEN_COOKED: 1009, BONE: 1010, LEATHER: 1011, FEATHER: 1012, STICK: 1013,
};

// ITEMS[id] = {id, name, displayName, tile, food: {hunger, saturation} | null, cooked: id | null}
// Food values are Minecraft's (hunger points / saturation). Raw chicken's 30% "Hunger" status effect is not
// modelled (no status effects exist); it simply keeps its low values.
export const ITEMS = {};
const item = (id, name, displayName, tile, extra = {}) => { ITEMS[id] = { id, name, displayName, tile, food: null, cooked: null, ...extra }; };
item(I.APPLE, 'apple', 'Apple', 'item_apple', { food: { hunger: 4, saturation: 2.4 } });
item(I.BREAD, 'bread', 'Bread', 'item_bread', { food: { hunger: 5, saturation: 6 } });
item(I.WHEAT, 'wheat', 'Wheat', 'item_wheat');
item(I.SEEDS, 'wheat_seeds', 'Wheat Seeds', 'item_seeds');
item(I.BEEF_RAW, 'beef', 'Raw Beef', 'item_beef_raw', { food: { hunger: 3, saturation: 1.8 }, cooked: I.BEEF_COOKED });
item(I.BEEF_COOKED, 'cooked_beef', 'Steak', 'item_beef_cooked', { food: { hunger: 8, saturation: 12.8 } });
item(I.PORKCHOP_RAW, 'porkchop', 'Raw Porkchop', 'item_porkchop_raw', { food: { hunger: 3, saturation: 1.8 }, cooked: I.PORKCHOP_COOKED });
item(I.PORKCHOP_COOKED, 'cooked_porkchop', 'Cooked Porkchop', 'item_porkchop_cooked', { food: { hunger: 8, saturation: 12.8 } });
item(I.CHICKEN_RAW, 'chicken', 'Raw Chicken', 'item_chicken_raw', { food: { hunger: 2, saturation: 1.2 }, cooked: I.CHICKEN_COOKED });
item(I.CHICKEN_COOKED, 'cooked_chicken', 'Cooked Chicken', 'item_chicken_cooked', { food: { hunger: 6, saturation: 7.2 } });
item(I.BONE, 'bone', 'Bone', 'item_bone');
item(I.LEATHER, 'leather', 'Leather', 'item_leather');
item(I.FEATHER, 'feather', 'Feather', 'item_feather');
item(I.STICK, 'stick', 'Stick', 'item_stick');

// Palette order for the inventory screen's Items tab
export const ITEM_PALETTE = [I.APPLE, I.BREAD, I.WHEAT, I.SEEDS, I.BEEF_RAW, I.BEEF_COOKED, I.PORKCHOP_RAW, I.PORKCHOP_COOKED, I.CHICKEN_RAW, I.CHICKEN_COOKED, I.BONE, I.LEATHER, I.FEATHER, I.STICK];

export const isItem = (id) => isItemId(id) && !!ITEMS[id];
export const foodOf = (id) => (ITEMS[id] && ITEMS[id].food) || null;
export const cookedOf = (id) => (ITEMS[id] && ITEMS[id].cooked) || null;
export const displayName = (id) => (ITEMS[id] ? ITEMS[id].displayName : BLOCKS[id] ? BLOCKS[id].displayName : '?');

// Registers block-like entries in BLOCKS for every item so the existing icon / hand / drop renderers work.
// Call once after initBlocks() (tiles must exist).
export function initItems() {
  for (const it of Object.values(ITEMS)) registerItemDef(it.id, it.name, it.displayName, it.tile);
}
export { ITEM_ID_BASE, isItemId };

export class Inventory {
  constructor(size = 36) {
    this.slots = new Array(size).fill(null); // {id, count}
    this.selected = 0;
  }
  get held() { return this.slots[this.selected]; }

  add(id, count = 1) { return this.addStack(id, count) === 0; }
  // Adds up to `count` items (existing stacks first, hotbar first) and returns how many did not fit.
  addStack(id, count) {
    for (let i = 0; i < this.slots.length && count > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id && s.count < MAX_STACK) { const n = Math.min(MAX_STACK - s.count, count); s.count += n; count -= n; }
    }
    for (let i = 0; i < this.slots.length && count > 0; i++) {
      if (!this.slots[i]) { const n = Math.min(MAX_STACK, count); this.slots[i] = { id, count: n }; count -= n; }
    }
    return count;
  }
  // Room for `count` more of `id` without changing anything (item pickup only happens when everything fits)
  canAdd(id, count) {
    let room = 0;
    for (const s of this.slots) { if (!s) room += MAX_STACK; else if (s.id === id) room += MAX_STACK - s.count; if (room >= count) return true; }
    return room >= count;
  }
  consume(slot, n = 1) {
    const s = this.slots[slot];
    if (!s) return false;
    s.count -= n;
    if (s.count <= 0) this.slots[slot] = null;
    return true;
  }
  set(slot, id, count) { this.slots[slot] = id ? { id, count } : null; }
  count(id) { let n = 0; for (const s of this.slots) if (s && s.id === id) n += s.count; return n; }
  // Removes n items of id anywhere in the inventory (hotbar last). Returns true if all were removed.
  remove(id, n) {
    if (this.count(id) < n) return false;
    for (let i = this.slots.length - 1; i >= 0 && n > 0; i--) {
      const s = this.slots[i];
      if (!s || s.id !== id) continue;
      const k = Math.min(s.count, n); s.count -= k; n -= k;
      if (s.count <= 0) this.slots[i] = null;
    }
    return true;
  }
  serialize() { return { slots: this.slots.map((s) => (s ? [s.id, s.count] : null)), selected: this.selected }; }
  deserialize(data) {
    if (!data || !Array.isArray(data.slots)) return false;
    for (let i = 0; i < this.slots.length; i++) {
      const s = data.slots[i];
      this.slots[i] = s && BLOCKS[s[0]] && s[1] > 0 ? { id: s[0], count: Math.min(MAX_STACK, s[1] | 0) } : null;
    }
    this.selected = Math.min(8, Math.max(0, data.selected | 0));
    return true;
  }
}

// Stack helpers shared by the inventory / chest screens (slots are {id, count} | null)
export const sameStack = (a, b) => !!(a && b && a.id === b.id);
// Merge stack `from` into slot array `slots`, visiting the given slot indices in order (existing stacks first, then
// empty slots). Mutates `from.count`; returns true when everything was moved.
export function mergeInto(slots, from, order = slots.map((_, i) => i)) {
  for (const i of order) { const s = slots[i]; if (from.count > 0 && s && s.id === from.id && s.count < MAX_STACK) { const n = Math.min(MAX_STACK - s.count, from.count); s.count += n; from.count -= n; } }
  for (const i of order) { if (from.count > 0 && !slots[i]) { const n = Math.min(MAX_STACK, from.count); slots[i] = { id: from.id, count: n }; from.count -= n; } }
  return from.count === 0;
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
    this.canPickup = null;    // (id, count) => bool, set by the game (inventory room check)
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
        // Minecraft rule: item box intersects the player box expanded by (1, 0.5, 1); a full inventory leaves it lying
        const pb = playerBox;
        if (it.x + 0.125 > pb.x0 - 1 && it.x - 0.125 < pb.x1 + 1 && it.y + 0.25 > pb.y0 - 0.5 && it.y < pb.y1 + 0.5 && it.z + 0.125 > pb.z0 - 1 && it.z - 0.125 < pb.z1 + 1) {
          if (!this.canPickup || this.canPickup(it.id, it.count)) { it.pickup = true; it.pickupAge = it.age; }
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
