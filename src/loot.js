import * as THREE from 'three';
import { WEAPONS, WEAPON_TYPES, AMMO, CONSUMABLES, RARITY_COLOR, MATERIALS } from './config.js';
import { createWeaponModel, createConsumableModel } from './characters.js';
import { structureMaterial } from './structures.js';

let itemId = 1;

export function makeWeapon(type, rarity) {
  const def = WEAPONS[type];
  return { id: itemId++, kind: 'weapon', type, rarity, name: def.name, mag: def.mag, count: 1 };
}
export function makeConsumable(type, count = 1) {
  const def = CONSUMABLES[type];
  return { id: itemId++, kind: 'consumable', type, rarity: def.rarity, name: def.name, count };
}
export function makeAmmo(type, count) {
  return { id: itemId++, kind: 'ammo', type, name: AMMO[type].name, count };
}
export function makeMats(material, count) {
  return { id: itemId++, kind: 'mats', material, name: MATERIALS[material].name, count };
}

export function itemLabel(item) {
  if (item.kind === 'weapon') return `${item.name}`;
  if (item.kind === 'consumable') return `${item.name} x${item.count}`;
  if (item.kind === 'ammo') return `${item.name} x${item.count}`;
  if (item.kind === 'mats') return `${item.name} x${item.count}`;
  return '?';
}

function rollRarity(rng, weights) {
  return rng.weighted(weights);
}

function weaponOfRarity(rng, rarity) {
  const options = WEAPON_TYPES.filter((t) => WEAPONS[t].rarities.includes(rarity));
  return makeWeapon(rng.pick(options), rarity);
}

export function rollFloorLoot(rng) {
  const roll = rng.next();
  if (roll < 0.42) {
    const rarity = rollRarity(rng, [['common', 55], ['uncommon', 30], ['rare', 13], ['epic', 2]]);
    return weaponOfRarity(rng, rarity);
  }
  if (roll < 0.72) {
    const type = rng.pick(Object.keys(AMMO));
    return makeAmmo(type, AMMO[type].pickup * rng.int(1, 2));
  }
  const type = rng.weighted([['bandage', 35], ['miniShield', 35], ['medkit', 12], ['shield', 18]]);
  const def = CONSUMABLES[type];
  const count = type === 'bandage' ? 5 : type === 'miniShield' ? 3 : 1;
  return makeConsumable(type, Math.min(def.stack, count));
}

export function rollChestLoot(rng) {
  const items = [];
  const rarity = rollRarity(rng, [['uncommon', 38], ['rare', 36], ['epic', 19], ['legendary', 7]]);
  const weapon = weaponOfRarity(rng, rarity);
  items.push(weapon);
  const ammoType = WEAPONS[weapon.type].ammo;
  items.push(makeAmmo(ammoType, AMMO[ammoType].pickup * 2));
  if (rng.chance(0.7)) {
    const type = rng.weighted([['bandage', 25], ['miniShield', 35], ['medkit', 15], ['shield', 25]]);
    const count = type === 'bandage' ? 5 : type === 'miniShield' ? 3 : type === 'shield' ? rng.int(1, 2) : 1;
    items.push(makeConsumable(type, count));
  }
  if (rng.chance(0.5)) items.push(makeMats(rng.pick(['wood', 'brick', 'metal']), 30));
  return items;
}

export function rollAmmoBox(rng) {
  const types = Object.keys(AMMO);
  const a = rng.pick(types);
  let b = rng.pick(types);
  if (b === a) b = types[(types.indexOf(a) + 1) % types.length];
  return [makeAmmo(a, AMMO[a].pickup * 2), makeAmmo(b, AMMO[b].pickup)];
}

export function botLootDrop(rng, bot) {
  const items = [];
  if (bot.weapon) {
    items.push(makeWeapon(bot.weapon.type, bot.weapon.rarity));
    const ammoType = WEAPONS[bot.weapon.type].ammo;
    items.push(makeAmmo(ammoType, AMMO[ammoType].pickup * 2));
  }
  if (rng.chance(0.6)) items.push(makeConsumable(rng.pick(['miniShield', 'shield', 'bandage', 'medkit']), 1));
  if (rng.chance(0.5)) items.push(makeMats(rng.pick(['wood', 'brick', 'metal']), rng.int(20, 60)));
  return items;
}

// ---------- Pickup visuals ----------

const beamGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.4, 10, 1, true);
const discGeo = new THREE.CircleGeometry(0.55, 16);
const ammoGeo = new THREE.BoxGeometry(0.34, 0.24, 0.24);
const matsGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
const kitGeo = new THREE.BoxGeometry(0.34, 0.2, 0.28);
const beamMats = new Map();
function beamMaterial(color) {
  let m = beamMats.get(color);
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    beamMats.set(color, m);
  }
  return m;
}

export function itemColor(item) {
  if (item.kind === 'weapon' || item.kind === 'consumable') return RARITY_COLOR[item.rarity];
  if (item.kind === 'ammo') return 0xe8e8e8;
  if (item.kind === 'mats') return MATERIALS[item.material].color;
  return 0xffffff;
}

function createItemMesh(item) {
  let mesh;
  if (item.kind === 'weapon') {
    mesh = createWeaponModel(item.type, item.rarity);
    mesh.scale.setScalar(1.35);
    mesh.rotation.set(0, 0, -0.35);
  } else if (item.kind === 'consumable') {
    const def = CONSUMABLES[item.type];
    if (def.kind === 'health') {
      mesh = new THREE.Mesh(kitGeo, new THREE.MeshLambertMaterial({ color: def.color }));
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.06), new THREE.MeshLambertMaterial({ color: 0xe23b3b }));
      const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.2), new THREE.MeshLambertMaterial({ color: 0xe23b3b }));
      cross.position.y = 0.11;
      cross2.position.y = 0.11;
      mesh.add(cross, cross2);
    } else {
      mesh = createConsumableModel(def.color);
      mesh.scale.setScalar(1.6);
    }
  } else if (item.kind === 'ammo') {
    mesh = new THREE.Mesh(ammoGeo, new THREE.MeshLambertMaterial({ color: AMMO[item.type].color }));
  } else {
    mesh = new THREE.Mesh(matsGeo, structureMaterial(item.material, 'wall'));
  }
  return mesh;
}

export class LootSystem {
  constructor(game) {
    this.game = game;
    this.pickups = [];
    this.containers = [];
    this.time = 0;
  }

  spawnPickup(item, x, y, z, vel = null) {
    const group = new THREE.Group();
    const mesh = createItemMesh(item);
    mesh.position.y = 0.45;
    const color = itemColor(item);
    const beam = new THREE.Mesh(beamGeo, beamMaterial(color));
    beam.position.y = 1.2;
    const disc = new THREE.Mesh(discGeo, beamMaterial(color));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.03;
    group.add(mesh, beam, disc);
    group.position.set(x, y, z);
    this.game.scene.add(group);
    const p = {
      item, group, mesh, beam,
      pos: group.position,
      vel: vel ? vel.clone() : new THREE.Vector3(),
      settled: !vel,
      phase: Math.random() * Math.PI * 2,
      age: 0,
    };
    this.pickups.push(p);
    return p;
  }

  removePickup(p) {
    const i = this.pickups.indexOf(p);
    if (i >= 0) this.pickups.splice(i, 1);
    this.game.scene.remove(p.group);
  }

  spawnItems(items, x, y, z, rng) {
    items.forEach((item, idx) => {
      const ang = (idx / items.length) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const vel = new THREE.Vector3(Math.cos(ang) * 1.6, 3.2, Math.sin(ang) * 1.6);
      this.spawnPickup(item, x, y + 0.6, z, vel);
    });
  }

  addContainer(solid) {
    this.containers.push(solid);
  }

  openContainer(c) {
    if (c.opened) return false;
    c.opened = true;
    const rng = this.game.rng;
    const items = c.kind === 'chest' ? rollChestLoot(rng) : rollAmmoBox(rng);
    this.spawnItems(items, c.centerX, c.bounds.minY, c.centerZ, rng);
    if (c.lidPivot) c.lidOpen = 0;
    if (c.kind === 'ammobox') {
      c.mesh.children[1].visible = false;
    }
    this.game.audio.play(c.kind === 'chest' ? 'chest' : 'ammo');
    return true;
  }

  /** Closest container the player can interact with, or null. */
  nearestContainer(pos, maxDist = 2.6) {
    let best = null;
    let bestD = maxDist;
    for (const c of this.containers) {
      if (c.opened) continue;
      const dx = c.centerX - pos.x;
      const dz = c.centerZ - pos.z;
      const dy = c.interactY - (pos.y + 0.9);
      const d = Math.sqrt(dx * dx + dz * dz + dy * dy * 0.5);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  nearestWeaponPickup(pos, maxDist = 1.8) {
    let best = null;
    let bestD = maxDist;
    for (const p of this.pickups) {
      if (p.item.kind !== 'weapon') continue;
      const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z);
      if (d < bestD && Math.abs(p.pos.y - pos.y) < 2.2) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  update(dt, player) {
    this.time += dt;
    const world = this.game.world;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.age += dt;
      if (!p.settled) {
        p.vel.y -= 14 * dt;
        p.pos.addScaledVector(p.vel, dt);
        const ground = world.groundAt(p.pos.x, p.pos.z, p.pos.y + 0.5, 0.2, 1.0);
        if (p.pos.y <= ground && p.vel.y <= 0) {
          p.pos.y = ground;
          p.settled = true;
        }
      }
      p.mesh.rotation.y += dt * 1.4;
      p.mesh.position.y = 0.45 + Math.sin(this.time * 2 + p.phase) * 0.08;

      if (player && player.alive && p.settled && p.age > 0.35) {
        const dx = p.pos.x - player.pos.x;
        const dz = p.pos.z - player.pos.z;
        if (dx * dx + dz * dz < 1.7 * 1.7 && Math.abs(p.pos.y - player.pos.y) < 2.2) {
          if (player.tryPickup(p.item)) {
            this.removePickup(p);
            this.game.audio.play('pickup');
          }
        }
      }
    }
    for (const c of this.containers) {
      if (c.lidPivot && c.lidOpen !== undefined && c.lidOpen < 1) {
        c.lidOpen = Math.min(1, c.lidOpen + dt * 2.5);
        c.lidPivot.rotation.x = -c.lidOpen * 1.9;
      }
    }
  }
}
