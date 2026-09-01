import * as THREE from 'three';
import { WEAPONS, RARITY_MULT, PICKAXE, CONSUMABLES, MATERIALS } from './config.js';
import { clamp } from './utils.js';

const SLOT_KEYS = { Digit1: -1, Digit2: 0, Digit3: 1, Digit4: 2, Digit5: 3, Digit6: 4 };

export class Combat {
  constructor(game) {
    this.game = game;
    this.fireCooldown = 0;
    this._origin = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._muzzle = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._right = new THREE.Vector3();
    this._camUp = new THREE.Vector3();
  }

  update(dt, input) {
    const p = this.game.player;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (!p.alive || p.phase !== 'ground') return;

    // slot selection works in either mode
    for (const [code, idx] of Object.entries(SLOT_KEYS)) {
      if (input.wasPressed(code)) {
        if (p.mode === 'build') this.game.building.exitBuildMode();
        p.selectSlot(idx);
      }
    }
    if (p.mode === 'build') return;
    if (input.wheel !== 0) p.cycleSlot(input.wheel > 0 ? 1 : -1);

    p.wantAds = input.buttons[2];

    if (input.wasPressed('KeyR')) this.startReload();
    if (input.wasPressed('KeyE')) this.interact();
    if (input.wasPressed('KeyG') && p.active >= 0) p.dropSlot(p.active);

    const item = p.activeItem;
    if (!item) {
      if (input.buttons[0]) this.swingPickaxe();
      return;
    }
    if (item.kind === 'weapon') {
      const def = WEAPONS[item.type];
      const wantFire = def.auto ? input.buttons[0] : input.clicked[0];
      if (wantFire) this.fireWeapon(item, def);
    } else if (item.kind === 'consumable') {
      if (input.clicked[0] && !p.using) this.startConsumable(item);
    }
  }

  startReload() {
    const p = this.game.player;
    const w = p.activeWeapon;
    if (!w || p.reload) return;
    const def = WEAPONS[w.type];
    if (w.mag >= def.mag) return;
    if (p.ammo[def.ammo] <= 0) {
      this.game.audio.play('empty');
      this.game.hud.toast('No ammo');
      return;
    }
    p.using = null;
    p.reload = { timer: 0, duration: def.reload };
    this.game.audio.play('reload');
  }

  startConsumable(item) {
    const p = this.game.player;
    if (!p.canUseConsumable(item)) {
      this.game.hud.toast(CONSUMABLES[item.type].kind === 'health' ? 'Health is full' : 'Shield is full');
      return;
    }
    p.reload = null;
    p.using = { item, timer: 0, duration: CONSUMABLES[item.type].time };
  }

  interact() {
    const game = this.game;
    const p = game.player;
    const c = game.loot.nearestContainer(p.pos);
    if (c) {
      game.loot.openContainer(c);
      return;
    }
    const pk = game.loot.nearestWeaponPickup(p.pos);
    if (pk) {
      if (p.slots.indexOf(null) < 0) {
        const dropIdx = p.active >= 0 ? p.active : 0;
        p.dropSlot(dropIdx, true);
      }
      if (p.tryPickup(pk.item)) {
        game.loot.removePickup(pk);
        game.audio.play('pickup');
        const idx = p.slots.indexOf(pk.item);
        if (idx >= 0) p.selectSlot(idx);
      }
    }
  }

  /** World position of the held item's barrel. */
  muzzlePos(out) {
    const p = this.game.player;
    p.char.hand.getWorldPosition(out);
    return out.addScaledVector(p.forward, 0.6);
  }

  fireWeapon(item, def) {
    const game = this.game;
    const p = game.player;
    if (this.fireCooldown > 0 || p.reload || p.using || p.switchTimer > 0) return;
    if (item.mag <= 0) {
      this.startReload();
      return;
    }
    item.mag--;
    p.inventoryVersion++;
    this.fireCooldown = 60 / def.rpm;
    const dmgMult = RARITY_MULT[item.rarity];
    let spread = def.spread;
    if (p.ads > 0.5) spread *= 0.5;
    if (p.moving) spread *= 1.5;
    if (!p.onGround) spread *= 1.8;
    p.aimOrigin(this._origin);
    this.muzzlePos(this._muzzle);
    this._right.copy(p.right);
    this._camUp.crossVectors(this._right, p.forward).normalize();
    for (let n = 0; n < def.pellets; n++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * spread;
      this._dir.copy(p.forward).addScaledVector(this._right, Math.cos(a) * r).addScaledVector(this._camUp, Math.sin(a) * r).normalize();
      const hit = game.world.raycast(this._origin, this._dir, def.range, (o) => !o.userData.player);
      const end = hit ? hit.point : this._origin.clone().addScaledVector(this._dir, def.range);
      game.effects.tracer(this._muzzle, end, 0xfff1b0);
      if (hit) this.applyHit(hit, def, dmgMult, item);
    }
    game.effects.muzzleFlash(this._muzzle);
    game.effects.addShake(def.kick * 6);
    p.pitch = clamp(p.pitch + def.kick * 0.6, -1.45, 1.35);
    p.recoil = 1;
    game.audio.play(`shot_${item.type}`);
    game.bots.onNoise(p.pos, 90);
  }

  applyHit(hit, def, dmgMult, item) {
    const game = this.game;
    const p = game.player;
    let falloff = 1;
    if (hit.distance > def.falloff[0]) {
      falloff = clamp(1 - ((hit.distance - def.falloff[0]) / (def.falloff[1] - def.falloff[0])) * 0.6, 0.4, 1);
    }
    if (hit.kind === 'bot') {
      const head = hit.part === 'head';
      const dmg = Math.max(1, Math.round(def.damage * dmgMult * falloff * (head ? def.headshot : 1)));
      const res = game.bots.damageBot(hit.bot, dmg, p, hit.point, head);
      game.effects.hitMarker(head);
      game.effects.damageNumber(hit.point, `${dmg}`, head ? 'head' : res.shieldHit ? 'shield' : '');
      game.effects.burst(hit.point, res.shieldHit ? 0x59b8ff : 0xffffff, 6, 2.5, 6, 0.4);
      game.audio.play(head ? 'headshot' : 'hit');
      p.damageDealt += dmg;
    } else if (hit.kind === 'solid') {
      const s = hit.solid;
      const dmg = Math.max(1, Math.round(def.damage * dmgMult * falloff));
      if (s.hp !== Infinity) {
        game.damageSolid(s, dmg, p, hit.point);
        game.effects.damageNumber(hit.point, `${dmg}`, 'struct');
      }
      const color = s.material ? MATERIALS[s.material].color : 0xcccccc;
      game.effects.burst(hit.point, color, 5, 2, 8, 0.4);
    } else if (hit.kind === 'terrain') {
      game.effects.burst(hit.point, 0x6b5a3a, 5, 2, 8, 0.4);
    }
  }

  swingPickaxe() {
    const game = this.game;
    const p = game.player;
    if (this.fireCooldown > 0 || p.using || p.switchTimer > 0) return;
    this.fireCooldown = PICKAXE.cooldown;
    p.swing = 0.35;
    game.audio.play('swing');
    setTimeout(() => this.pickaxeImpact(), 130);
  }

  pickaxeImpact() {
    const game = this.game;
    const p = game.player;
    if (!p.alive) return;
    p.aimOrigin(this._origin);
    const hit = game.world.raycast(this._origin, p.forward, PICKAXE.range + 0.6, (o) => !o.userData.player);
    if (!hit) return;
    if (hit.kind === 'bot') {
      const dmg = 20;
      const res = game.bots.damageBot(hit.bot, dmg, p, hit.point, false);
      game.effects.hitMarker(false);
      game.effects.damageNumber(hit.point, `${dmg}`, res.shieldHit ? 'shield' : '');
      game.audio.play('hit');
      p.damageDealt += dmg;
      return;
    }
    if (hit.kind !== 'solid') return;
    const s = hit.solid;
    if (s.hp === Infinity) {
      game.audio.play('harvest_metal', 0.4);
      return;
    }
    const material = s.material;
    let gained = 0;
    if (s.kind === 'structure') gained = MATERIALS[material].harvest;
    else if (s.yieldPerHit) gained = s.yieldPerHit;
    if (gained > 0) {
      const added = p.addMats(material, gained);
      if (added > 0) game.effects.damageNumber(hit.point, `+${added}`, 'struct');
      game.hud.pulseMat(material);
    }
    game.effects.burst(hit.point, MATERIALS[material].color, 10, 3, 9, 0.5);
    game.audio.play(`harvest_${material}`);
    game.damageSolid(s, PICKAXE.damage, p, hit.point);
    game.bots.onNoise(p.pos, 25);
  }
}
