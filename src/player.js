import * as THREE from 'three';
import { PLAYER, WEAPONS, CONSUMABLES, AMMO, MAX_MATS, MATERIAL_ORDER } from './config.js';
import { clamp, lerp } from './utils.js';
import { createCharacter, animateCharacter, createWeaponModel, createPickaxeModel, createConsumableModel, flashCharacter } from './characters.js';
import { WATER_Y } from './world.js';

const PHYS_STEP = 1 / 90;

export class Player {
  constructor(game) {
    this.game = game;
    this.pos = new THREE.Vector3(0, 50, 0);
    this.vel = new THREE.Vector3();
    this.radius = PLAYER.radius;
    this.height = PLAYER.height;
    this.step = PLAYER.step;
    this.onGround = false;
    this.groundSolid = null;
    this.yaw = 0;
    this.pitch = -0.15;
    this.hp = PLAYER.maxHp;
    this.shield = 0;
    this.alive = true;
    this.mats = { wood: 0, brick: 0, metal: 0 };
    this.ammo = { light: 0, medium: 0, heavy: 0, shells: 0 };
    this.slots = [null, null, null, null, null];
    this.active = -1; // -1 = pickaxe
    this.mode = 'combat';
    this.buildPiece = 'wall';
    this.buildMat = 'wood';
    this.buildRot = 0;
    this.phase = 'ground';
    this.kills = 0;
    this.damageDealt = 0;
    this.speedXZ = 0;
    this.sprinting = false;
    this.ads = 0;
    this.wantAds = false;
    this.using = null;
    this.reload = null;
    this.switchTimer = 0;
    this.swing = 0;
    this.recoil = 0;
    this.lastHurt = -10;
    this.inStorm = false;
    this.stormTick = 0;
    this.camDist = 4.2;
    this.fov = 70;
    this.inventoryVersion = 0;

    const outfit = { shirt: 0x2f8fff, pants: 0x1d2538, skin: 0xf1c27d, hair: 0x2b1b12 };
    this.char = createCharacter(outfit, 'player');
    for (const m of this.char.meshes) {
      m.userData.player = true;
      game.world.addRaycastTarget(m);
    }
    game.scene.add(this.char.group);

    this.held = null;
    this.heldKind = null;
    this.pickaxeModel = createPickaxeModel();
    this.setHeld(this.pickaxeModel, 'pickaxe');

    // glider
    this.glider = this.buildGlider();
    this.glider.visible = false;
    game.scene.add(this.glider);

    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.flatForward = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
  }

  buildGlider() {
    const g = new THREE.Group();
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(2.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.4),
      new THREE.MeshLambertMaterial({ color: 0xff8f2b, side: THREE.DoubleSide }),
    );
    canopy.scale.set(1.25, 0.55, 1);
    canopy.position.y = 2.5;
    g.add(canopy);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
    for (const [x, z] of [[-1.6, 0.6], [1.6, 0.6], [-1.6, -0.6], [1.6, -0.6]]) {
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4), lineMat);
      line.position.set(x * 0.4, 1.9, z * 0.5);
      line.lookAt(new THREE.Vector3(x, 3.2, z));
      line.rotateX(Math.PI / 2);
      g.add(line);
    }
    return g;
  }

  get activeItem() {
    return this.active >= 0 ? this.slots[this.active] : null;
  }

  get activeWeapon() {
    const it = this.activeItem;
    return it && it.kind === 'weapon' ? it : null;
  }

  get moving() {
    return this.speedXZ > 0.5;
  }

  updateVectors() {
    const cp = Math.cos(this.pitch);
    this.forward.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
    this.flatForward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  /** Point on the camera's central ray at the player's head; shots originate here. */
  aimOrigin(out) {
    return out.copy(this.pos).add(this._tmp.set(0, PLAYER.eye, 0)).addScaledVector(this.right, 0.55);
  }

  startDrop(x, z) {
    this.pos.set(x, 330, z);
    this.vel.set(0, 0, 0);
    this.phase = 'skydive';
    this.glider.visible = false;
  }

  setHeld(model, kind) {
    if (this.held) this.char.hand.remove(this.held);
    this.held = model;
    this.heldKind = kind;
    if (model) {
      model.rotation.set(-Math.PI / 2, 0, 0);
      model.position.set(0, 0, 0);
      if (kind === 'pickaxe') {
        model.rotation.set(0, 0, 0);
        model.position.set(0, -0.15, 0);
      }
      this.char.hand.add(model);
    }
  }

  refreshHeld() {
    const item = this.activeItem;
    if (!item) {
      if (this.heldKind !== 'pickaxe') this.setHeld(this.pickaxeModel, 'pickaxe');
      return;
    }
    if (item.kind === 'weapon') {
      if (this.heldKind !== `w:${item.id}`) this.setHeld(createWeaponModel(item.type, item.rarity), `w:${item.id}`);
    } else if (item.kind === 'consumable') {
      if (this.heldKind !== `c:${item.type}`) this.setHeld(createConsumableModel(CONSUMABLES[item.type].color), `c:${item.type}`);
    }
  }

  selectSlot(idx) {
    if (idx === this.active) return;
    if (idx >= 0 && !this.slots[idx]) return;
    this.active = idx;
    this.reload = null;
    this.using = null;
    this.switchTimer = 0.22;
    this.refreshHeld();
    this.game.audio.play('switch');
    this.inventoryVersion++;
  }

  cycleSlot(dir) {
    const order = [-1, 0, 1, 2, 3, 4].filter((i) => i === -1 || this.slots[i]);
    let idx = order.indexOf(this.active);
    idx = (idx + dir + order.length) % order.length;
    this.selectSlot(order[idx]);
  }

  addMats(material, n) {
    const before = this.mats[material];
    this.mats[material] = Math.min(MAX_MATS, before + n);
    return this.mats[material] - before;
  }

  /** Attempts to take an item. Returns true if consumed. */
  tryPickup(item) {
    if (item.kind === 'ammo') {
      if (this.ammo[item.type] >= AMMO[item.type].max) return false;
      this.ammo[item.type] = Math.min(AMMO[item.type].max, this.ammo[item.type] + item.count);
      this.inventoryVersion++;
      return true;
    }
    if (item.kind === 'mats') {
      if (this.mats[item.material] >= MAX_MATS) return false;
      this.addMats(item.material, item.count);
      return true;
    }
    if (item.kind === 'consumable') {
      const def = CONSUMABLES[item.type];
      const existing = this.slots.find((s) => s && s.kind === 'consumable' && s.type === item.type);
      if (existing) {
        if (existing.count >= def.stack) return false;
        const take = Math.min(item.count, def.stack - existing.count);
        existing.count += take;
        item.count -= take;
        this.inventoryVersion++;
        return item.count <= 0;
      }
    }
    const free = this.slots.indexOf(null);
    if (free < 0) return false;
    this.slots[free] = item;
    this.inventoryVersion++;
    if (this.active === -1 && item.kind === 'weapon') this.selectSlot(free);
    return true;
  }

  dropSlot(idx, throwIt = true) {
    const item = this.slots[idx];
    if (!item) return null;
    this.slots[idx] = null;
    if (this.active === idx) {
      this.active = -1;
      this.reload = null;
      this.using = null;
      this.refreshHeld();
    }
    this.inventoryVersion++;
    if (throwIt) {
      const vel = this.flatForward.clone().multiplyScalar(3.5).setY(2.5);
      this.game.loot.spawnPickup(item, this.pos.x + this.flatForward.x * 0.8, this.pos.y + 1.2, this.pos.z + this.flatForward.z * 0.8, vel);
    }
    return item;
  }

  takeDamage(amount, source, kind = 'bullet') {
    if (!this.alive) return;
    let remaining = amount;
    let shieldDmg = 0;
    if (kind !== 'storm' && this.shield > 0) {
      shieldDmg = Math.min(this.shield, remaining);
      this.shield -= shieldDmg;
      remaining -= shieldDmg;
    }
    this.hp -= remaining;
    this.lastHurt = this.game.time;
    if (kind !== 'storm') {
      this.game.audio.play(shieldDmg > 0 && remaining <= 0 ? 'shield_hit' : 'hurt');
      flashCharacter(this.char);
      this.game.effects.addShake(0.25);
    }
    this.game.hud.flashDamage();
    if (this.hp <= 0) {
      this.hp = 0;
      this.die(source, kind);
    }
  }

  die(source, kind) {
    if (!this.alive) return;
    this.alive = false;
    this.using = null;
    this.reload = null;
    this.game.onPlayerDeath(source, kind);
  }

  applyConsumable(item) {
    const def = CONSUMABLES[item.type];
    if (def.kind === 'health') {
      const before = this.hp;
      this.hp = Math.max(this.hp, Math.min(def.cap, this.hp + def.heal));
      this.game.audio.play('heal');
      this.game.effects.damageNumber(this.pos.clone().setY(this.pos.y + 2.2), `+${Math.round(this.hp - before)}`, 'heal');
    } else {
      const before = this.shield;
      this.shield = Math.max(this.shield, Math.min(def.cap, this.shield + def.shield));
      this.game.audio.play('shield');
      this.game.effects.damageNumber(this.pos.clone().setY(this.pos.y + 2.2), `+${Math.round(this.shield - before)}`, 'shield');
    }
    item.count--;
    if (item.count <= 0) {
      const idx = this.slots.indexOf(item);
      if (idx >= 0) this.slots[idx] = null;
      if (this.active === idx) {
        this.active = -1;
        this.refreshHeld();
      }
    }
    this.inventoryVersion++;
  }

  canUseConsumable(item) {
    const def = CONSUMABLES[item.type];
    if (def.kind === 'health') return this.hp < def.cap;
    return this.shield < def.cap;
  }

  // ---------- per-frame ----------

  update(dt, input) {
    const game = this.game;
    if (this.alive && input.locked) {
      this.yaw -= input.mouseDX * input.sensitivity * (this.ads > 0.5 && this.activeWeapon && WEAPONS[this.activeWeapon.type].scope ? 0.45 : 1);
      this.pitch -= input.mouseDY * input.sensitivity * (this.ads > 0.5 && this.activeWeapon && WEAPONS[this.activeWeapon.type].scope ? 0.45 : 1);
      this.pitch = clamp(this.pitch, -1.45, 1.35);
    }
    this.updateVectors();

    if (this.phase === 'skydive' || this.phase === 'glide') this.updateDrop(dt, input);
    else this.updateGround(dt, input);

    // timers
    if (this.switchTimer > 0) this.switchTimer -= dt;
    if (this.reload) {
      this.reload.timer += dt;
      if (this.reload.timer >= this.reload.duration) this.finishReload();
    }
    if (this.using) {
      this.using.timer += dt;
      if (this.using.timer >= this.using.duration) {
        const it = this.using.item;
        this.using = null;
        if (this.slots.includes(it)) this.applyConsumable(it);
      }
    }
    if (this.swing > 0) this.swing -= dt;
    this.recoil = Math.max(0, this.recoil - dt * 6);

    // storm damage
    const storm = game.storm;
    this.inStorm = this.phase === 'ground' && storm.isOutside(this.pos.x, this.pos.z);
    if (this.inStorm && this.alive) {
      this.stormTick += dt;
      if (this.stormTick >= 1) {
        this.stormTick -= 1;
        this.takeDamage(storm.dps, null, 'storm');
        game.audio.play('storm', 0.6);
      }
    } else {
      this.stormTick = 0;
    }

    // ADS smoothing
    const wantAds = this.wantAds && this.activeWeapon && this.phase === 'ground' && this.mode === 'combat';
    this.ads = lerp(this.ads, wantAds ? 1 : 0, 1 - Math.pow(0.0001, dt));

    this.updateCharacter(dt);
    this.updateCamera(dt);
  }

  finishReload() {
    const w = this.activeWeapon;
    this.reload = null;
    if (!w) return;
    const def = WEAPONS[w.type];
    const need = def.mag - w.mag;
    const take = Math.min(need, this.ammo[def.ammo]);
    w.mag += take;
    this.ammo[def.ammo] -= take;
    this.inventoryVersion++;
  }

  updateDrop(dt, input) {
    const game = this.game;
    const dir = this._tmp.set(0, 0, 0);
    if (input.isDown('KeyW')) dir.add(this.flatForward);
    if (input.isDown('KeyS')) dir.sub(this.flatForward);
    if (input.isDown('KeyA')) dir.sub(this.right);
    if (input.isDown('KeyD')) dir.add(this.right);
    if (dir.lengthSq() > 0) dir.normalize();
    const ground = game.world.groundAt(this.pos.x, this.pos.z, this.pos.y, this.radius, this.step);
    const alt = this.pos.y - ground;
    if (this.phase === 'skydive') {
      const speed = 26;
      this.vel.x = lerp(this.vel.x, dir.x * speed, 1 - Math.pow(0.05, dt));
      this.vel.z = lerp(this.vel.z, dir.z * speed, 1 - Math.pow(0.05, dt));
      this.vel.y = Math.max(-48, this.vel.y - 30 * dt);
      if (alt < 75 || (input.wasPressed('Space') && alt < 250)) {
        this.phase = 'glide';
        this.glider.visible = true;
        game.audio.play('glider');
        game.hud.announce('GLIDER DEPLOYED', '', 1.2);
      }
    } else {
      const speed = 17;
      this.vel.x = lerp(this.vel.x, dir.x * speed, 1 - Math.pow(0.02, dt));
      this.vel.z = lerp(this.vel.z, dir.z * speed, 1 - Math.pow(0.02, dt));
      this.vel.y = lerp(this.vel.y, -8.5, 1 - Math.pow(0.02, dt));
    }
    this.pos.addScaledVector(this.vel, dt);
    const lim = 398;
    this.pos.x = clamp(this.pos.x, -lim, lim);
    this.pos.z = clamp(this.pos.z, -lim, lim);
    const g2 = game.world.groundAt(this.pos.x, this.pos.z, this.pos.y, this.radius, this.step);
    if (this.pos.y <= g2) {
      this.pos.y = g2;
      this.vel.set(0, 0, 0);
      this.phase = 'ground';
      this.glider.visible = false;
      game.audio.play('land');
      game.onLanded();
    }
    this.speedXZ = Math.hypot(this.vel.x, this.vel.z);
    this.glider.position.copy(this.pos).add(new THREE.Vector3(0, 1.6, 0));
    this.glider.rotation.y = this.yaw;
  }

  updateGround(dt, input) {
    const game = this.game;
    const dir = this._tmp.set(0, 0, 0);
    if (this.alive) {
      if (input.isDown('KeyW')) dir.add(this.flatForward);
      if (input.isDown('KeyS')) dir.sub(this.flatForward);
      if (input.isDown('KeyA')) dir.sub(this.right);
      if (input.isDown('KeyD')) dir.add(this.right);
    }
    const hasInput = dir.lengthSq() > 0;
    if (hasInput) dir.normalize();
    this.sprinting = hasInput && input.isDown('ShiftLeft') && this.ads < 0.5 && !this.using;
    let speed = this.sprinting ? PLAYER.sprint : PLAYER.walk;
    if (this.ads > 0.5) speed *= 0.62;
    if (this.using) speed *= 0.55;
    const terrainH = game.terrain.heightAt(this.pos.x, this.pos.z);
    const inWater = this.pos.y < WATER_Y - 0.2 && terrainH < WATER_Y;
    if (inWater) speed *= 0.6;

    const accel = this.onGround ? 42 : 14;
    const tvx = dir.x * speed;
    const tvz = dir.z * speed;
    this.vel.x += clamp(tvx - this.vel.x, -accel * dt, accel * dt);
    this.vel.z += clamp(tvz - this.vel.z, -accel * dt, accel * dt);

    if (this.alive && input.wasPressed('Space') && this.onGround) {
      this.vel.y = PLAYER.jump;
      this.onGround = false;
      game.audio.play('jump');
    }

    let remaining = dt;
    while (remaining > 0) {
      const h = Math.min(PHYS_STEP, remaining);
      remaining -= h;
      this.vel.y -= PLAYER.gravity * h;
      if (this.vel.y < -60) this.vel.y = -60;
      game.world.resolveEntity(this, h);
    }
    this.speedXZ = Math.hypot(this.vel.x, this.vel.z);
  }

  updateCharacter(dt) {
    const g = this.char.group;
    g.position.copy(this.pos);
    g.rotation.y = this.yaw + Math.PI;
    const holdingWeapon = !!this.activeWeapon && this.mode === 'combat';
    const aiming = holdingWeapon || this.phase !== 'ground' || this.mode === 'build' || !!this.using || this.heldKind === 'pickaxe';
    animateCharacter(this.char, dt, this.phase === 'ground' ? this.speedXZ : 0, aiming);
    if (aiming) {
      let armX = -Math.PI / 2 - this.pitch * 0.85 + 0.1;
      if (this.swing > 0) {
        const t = 1 - this.swing / 0.35;
        armX += Math.sin(t * Math.PI) * -1.4 + 0.6;
      }
      this.char.parts.rightArmPivot.rotation.x = armX;
      this.char.parts.leftArmPivot.rotation.x = holdingWeapon ? armX + 0.25 : -0.2;
      this.char.parts.leftArmPivot.rotation.z = holdingWeapon ? -0.5 : 0;
    }
    if (this.phase !== 'ground') {
      this.char.parts.leftArmPivot.rotation.z = 1.2;
      this.char.parts.rightArmPivot.rotation.z = -1.2;
      this.char.parts.leftArmPivot.rotation.x = 0;
      this.char.parts.rightArmPivot.rotation.x = 0;
      this.char.parts.leftLeg.rotation.x = 0.3;
      this.char.parts.rightLeg.rotation.x = -0.3;
    } else {
      this.char.parts.leftArmPivot.rotation.z = holdingWeapon ? -0.5 : 0;
      this.char.parts.rightArmPivot.rotation.z = 0;
    }
    if (this.held) this.held.visible = this.phase === 'ground';
  }

  updateCamera(dt) {
    const cam = this.game.camera;
    const scoped = this.activeWeapon && WEAPONS[this.activeWeapon.type].scope;
    let targetDist = this.phase !== 'ground' ? 7.5 : lerp(4.2, scoped ? 0.9 : 2.4, this.ads);
    let targetFov = lerp(72, scoped ? 24 : 52, this.ads);
    if (this.mode === 'build') targetDist = 4.8;
    if (!this.alive) {
      targetDist = 9;
      targetFov = 60;
    }
    this.camDist = lerp(this.camDist, targetDist, 1 - Math.pow(0.001, dt));
    this.fov = lerp(this.fov, targetFov, 1 - Math.pow(0.001, dt));
    if (Math.abs(cam.fov - this.fov) > 0.05) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }

    const pivot = this.aimOrigin(new THREE.Vector3());
    if (this.phase !== 'ground') pivot.y += 1.2;
    if (!this.alive) pivot.y += 2.5;
    let dist = this.camDist;
    // keep the camera out of walls
    const back = this.forward.clone().negate();
    const hit = this.game.world.raycast(pivot, back, dist + 0.3, (o) => !o.userData.player && !o.userData.bot);
    if (hit) dist = Math.max(0.6, hit.distance - 0.35);
    cam.position.copy(pivot).addScaledVector(back, dist);
    const shake = this.game.effects.shake;
    if (shake > 0) {
      cam.position.x += (Math.random() - 0.5) * shake * 0.25;
      cam.position.y += (Math.random() - 0.5) * shake * 0.25;
    }
    const look = pivot.clone().addScaledVector(this.forward, 20);
    cam.lookAt(look);
    // hide own body when the camera gets very close (scoped)
    this.char.group.visible = dist > 1.3;
  }
}
