import * as THREE from 'three';
import { WEAPONS, RECOIL_PATTERNS, shotInterval, WEAPON_SLOTS } from '../weapons/defs.js';
import { collision } from '../map/collision.js';
import { bus, EV } from '../core/events.js';
import { settings } from '../core/settings.js';
import { grand } from '../core/rng.js';

/**
 * PLAYER COMBAT
 * Owner: Opus 2.
 *
 * Hitscan ballistics with authored spread, a per-weapon recoil pattern, range
 * falloff, armour penetration and limited surface penetration. Every shot
 * publishes the full cause-and-effect chain on the event bus so audio, VFX,
 * AI hearing and the HUD all react from one source of truth.
 */

const PENETRABLE = {
  drywall: { cost: 0.45, maxThickness: 0.28 },
  wood: { cost: 0.55, maxThickness: 0.2 },
  glass: { cost: 0.12, maxThickness: 0.08 },
  plastic: { cost: 0.5, maxThickness: 0.14 },
  tile: { cost: 0.75, maxThickness: 0.12 },
  ceramic: { cost: 0.8, maxThickness: 0.1 },
  carpet: { cost: 0.6, maxThickness: 0.1 },
  metal: { cost: 0.92, maxThickness: 0.05 },
  concrete: { cost: 1.0, maxThickness: 0 },
  snow: { cost: 0.3, maxThickness: 0.5 },
};

export class WeaponInstance {
  constructor(def) {
    this.def = def;
    this.id = def.id;
    this.magazine = def.magazine ?? 0;
    this.reserve = def.reserve ?? 0;
    this.shotIndex = 0;
    this.lastShot = -99;
    this.chambered = true;
  }

  reset() {
    this.magazine = this.def.magazine ?? 0;
    this.reserve = this.def.reserve ?? 0;
    this.shotIndex = 0;
    this.lastShot = -99;
    this.chambered = true;
  }
}

export class PlayerCombat {
  constructor(player, opts = {}) {
    this.player = player;
    this.vfx = opts.vfx ?? null;
    this.audio = opts.audio ?? null;
    this.viewModel = opts.viewModel ?? null;
    this.level = opts.level ?? null;
    this.getTargets = opts.getTargets ?? (() => []);
    this.difficulty = opts.difficulty ?? null;

    this.weapons = new Map();
    this.slots = { 1: null, 2: null, 3: null, 4: null };
    this.utilityStock = new Map();
    this.utilityOrder = [];
    this.utilityIndex = 0;

    this.currentSlot = 1;
    this.current = null;
    this.time = 0;
    this.aiming = false;
    this.adsFactor = 0;
    this.reloading = false;
    this.reloadEnd = 0;
    this.reloadStart = 0;
    this.reloadShells = 0;
    this.switching = false;
    this.switchEnd = 0;
    this.pendingSlot = null;
    this.meleeEnd = 0;
    this.grenades = [];
    this.lastFireTime = -99;
    this.consecutiveShots = 0;
    this.spreadDegrees = 0;
    this.stats = { shotsFired: 0, shotsHit: 0, headshots: 0, kills: 0, damageDealt: 0 };
    this._ray = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
    this._tmp2 = new THREE.Vector3();
  }

  /* ---------------- Inventory ---------------- */

  setLoadout(preset) {
    this.weapons.clear();
    this.slots = { 1: null, 2: null, 3: null, 4: null };
    this.utilityStock.clear();
    this.utilityOrder = [];

    const give = (id) => {
      const def = WEAPONS[id];
      if (!def) return null;
      const inst = new WeaponInstance(def);
      this.weapons.set(id, inst);
      return inst;
    };
    const primary = give(preset.primary);
    const secondary = give(preset.secondary);
    const knife = give('knife.talon');
    if (primary) this.slots[WEAPON_SLOTS.PRIMARY] = primary;
    if (secondary) this.slots[WEAPON_SLOTS.SECONDARY] = secondary;
    if (knife) this.slots[WEAPON_SLOTS.MELEE] = knife;

    for (const uid of preset.utility ?? []) {
      const def = WEAPONS[uid];
      if (!def) continue;
      const have = this.utilityStock.get(uid) ?? 0;
      this.utilityStock.set(uid, have + (def.magazine ?? 1));
      if (!this.utilityOrder.includes(uid)) this.utilityOrder.push(uid);
    }
    if (preset.extraFlash) {
      this.utilityStock.set('flash.halo', (this.utilityStock.get('flash.halo') ?? 0) + preset.extraFlash);
      if (!this.utilityOrder.includes('flash.halo')) this.utilityOrder.push('flash.halo');
    }
    this.utilityIndex = 0;
    this.player.armor = preset.armor ?? 100;
    this.player.speedScale = 1 + (preset.speedBonus ?? 0);
    this.currentSlot = WEAPON_SLOTS.PRIMARY;
    this.current = this.slots[WEAPON_SLOTS.PRIMARY] ?? this.slots[WEAPON_SLOTS.SECONDARY];
    this.currentSlot = this.current === this.slots[WEAPON_SLOTS.PRIMARY] ? 1 : 2;
    this._applyViewModel(true);
  }

  reset(preset) {
    for (const w of this.weapons.values()) w.reset();
    this.reloading = false;
    this.switching = false;
    this.aiming = false;
    this.adsFactor = 0;
    this.grenades.length = 0;
    this.stats = { shotsFired: 0, shotsHit: 0, headshots: 0, kills: 0, damageDealt: 0 };
    if (preset) this.setLoadout(preset);
    else this._applyViewModel(true);
  }

  get currentUtility() {
    return this.utilityOrder[this.utilityIndex] ?? null;
  }

  utilityList() {
    return this.utilityOrder.map((id) => ({
      id, name: WEAPONS[id]?.name ?? id,
      count: this.utilityStock.get(id) ?? 0,
      icon: WEAPONS[id]?.hudIcon ?? 'flash',
      active: id === this.currentUtility,
    }));
  }

  _applyViewModel(instant = false) {
    if (!this.viewModel) return;
    const id = this.currentSlot === 4 ? this.currentUtility : this.current?.id;
    if (!id) return;
    this.viewModel.setWeapon(id, this.arms ?? null);
    this.viewModel.play(instant ? 'idle' : 'draw');
  }

  selectSlot(slot) {
    if (slot === this.currentSlot) return false;
    if (this.switching) return false;
    if (slot === 4 && !this.currentUtility) return false;
    const target = slot === 4 ? { def: WEAPONS[this.currentUtility] } : this.slots[slot];
    if (!target) return false;
    const outDef = this.currentSlot === 4 ? WEAPONS[this.currentUtility] : this.current?.def;
    this.switching = true;
    this.pendingSlot = slot;
    this.switchEnd = this.time + (outDef?.holsterTime ?? 0.3);
    this.reloading = false;
    this.aiming = false;
    this.viewModel?.play('holster');
    this.audio?.play('wpn.holster', { volume: 0.5 });
    return true;
  }

  cycleUtility() {
    if (this.utilityOrder.length < 2) return;
    this.utilityIndex = (this.utilityIndex + 1) % this.utilityOrder.length;
    if (this.currentSlot === 4) this._applyViewModel();
  }

  /* ---------------- Spread ---------------- */

  computeSpread() {
    const w = this.current?.def;
    if (!w) return 0;
    const p = this.player;
    let s = w.spreadStand;
    if (p.isCrouched) s = w.spreadCrouch;
    const speed = p.horizontalSpeed;
    const moveFactor = Math.min(1, speed / 4.2);
    s = s + (w.spreadMove - s) * moveFactor;
    if (!p.grounded) s = w.spreadJump;
    if (this.aiming && this.adsFactor > 0.6) s = Math.min(s, w.spreadAds + moveFactor * w.spreadMove * 0.35);
    // Sustained fire opens the cone
    s += Math.min(2.4, this.consecutiveShots * (w.auto ? 0.075 : 0.035));
    const scale = this.difficulty?.playerSpreadScale ?? 1;
    return s * scale;
  }

  /* ---------------- Firing ---------------- */

  canFire() {
    const w = this.current;
    if (!w || !this.player.alive) return false;
    if (this.switching || this.reloading) return false;
    if (w.def.category === 'melee') return this.time >= this.meleeEnd;
    if (w.def.category === 'utility') return false;
    if (this.time - w.lastShot < shotInterval(w.def)) return false;
    return true;
  }

  tryFire(held) {
    const w = this.current;
    if (!w) return false;
    if (this.currentSlot === 4) return this.throwUtility(held);
    if (w.def.category === 'melee') return this.melee();
    if (!this.canFire()) return false;
    if (!w.def.auto && held) return false;
    if (w.magazine <= 0) {
      if (!held) {
        bus.emit(EV.DRY_FIRE, { weapon: w.def.id });
        this.audio?.play('wpn.dry', { volume: 0.6 });
        this.viewModel?.play('dryFire');
        w.lastShot = this.time;
      }
      return false;
    }
    this.fire();
    return true;
  }

  fire() {
    const w = this.current;
    const def = w.def;
    w.magazine--;
    w.lastShot = this.time;
    this.lastFireTime = this.time;
    this.consecutiveShots++;
    this.stats.shotsFired++;

    const spread = this.computeSpread();
    this.spreadDegrees = spread;
    const origin = this.player.eyePosition;
    const baseDir = this.player.lookDirection;
    const pellets = def.pellets ?? 1;
    const pelletSpread = pellets > 1
      ? (this.adsFactor > 0.6 ? def.adsPelletSpread : def.pelletSpread)
      : 0;

    const results = [];
    for (let i = 0; i < pellets; i++) {
      const dir = baseDir.clone();
      applyCone(dir, spread + (pellets > 1 ? pelletSpread : 0));
      results.push(this.traceShot(origin, dir, def));
    }

    /* ---- Recoil ---- */
    const pattern = RECOIL_PATTERNS[def.recoilPattern] ?? RECOIL_PATTERNS.none;
    const step = pattern[Math.min(this.consecutiveShots - 1, pattern.length - 1)];
    const jitter = (grand() - 0.5) * 0.35;
    this.player.addRecoil(
      THREE.MathUtils.degToRad(def.recoilPitch * step[0] * (this.aiming ? 0.78 : 1)) * 9,
      THREE.MathUtils.degToRad(def.recoilYaw * (step[1] + jitter) * (this.aiming ? 0.78 : 1)) * 9,
    );

    /* ---- Presentation ---- */
    const muzzle = this._tmp.copy(origin).addScaledVector(baseDir, 0.42);
    this.viewModel?.getMuzzleWorldPosition?.(muzzle);
    this.vfx?.muzzleFlash(muzzle.clone(), baseDir.clone(), def.family);
    this.viewModel?.play('fire');
    this.audio?.play(def.sounds.fire, { pos: origin.clone(), volume: 1 });
    if (def.sounds.tail) this.audio?.play(def.sounds.tail, { pos: origin.clone(), volume: 0.55, delay: 0.06 });
    if (def.shellSize) {
      const ep = this._tmp2.copy(origin).addScaledVector(baseDir, 0.25);
      this.viewModel?.getEjectWorldPosition?.(ep);
      this.vfx?.shell(ep.clone(), baseDir.clone(), def.family);
    }
    if (def.boltAction) {
      this.viewModel?.play('bolt');
      this.audio?.play('wpn.dmr.bolt', { volume: 0.6, delay: 0.25 });
    } else if (def.category === 'shotgun') {
      this.viewModel?.play('pump');
    }

    bus.emit(EV.SHOT_FIRED, {
      weapon: def.id, magazine: w.magazine, reserve: w.reserve,
      origin: origin.clone(), direction: baseDir.clone(), spread, results,
    });
    bus.emit(EV.NOISE, { pos: origin.clone(), radius: def.noise, kind: 'gunshot', source: 'player' });

    if (w.magazine === 0 && w.reserve > 0) {
      // Auto-reload after a short beat feels better than a dead trigger
      this.autoReloadAt = this.time + 0.28;
    }
  }

  /**
   * Trace one projectile, resolving character hitboxes, glass and penetration.
   */
  traceShot(origin, dir, def, depth = 0, energy = 1, travelled = 0) {
    if (depth > 3 || energy < 0.12) return null;
    const maxDist = Math.max(2, def.range - travelled);
    const targets = this.getTargets();

    // Character hitboxes first — they are cheap and take priority at equal range
    let charHit = null;
    for (const t of targets) {
      if (!t.alive) continue;
      const hit = t.raycastHitboxes(origin, dir, maxDist);
      if (hit && (!charHit || hit.distance < charHit.distance)) charHit = { ...hit, target: t };
    }
    const worldHit = collision.raycast(origin, dir, maxDist);

    if (charHit && (!worldHit || charHit.distance < worldHit.distance)) {
      const dist = travelled + charHit.distance;
      const falloff = rangeFalloff(def, dist);
      let dmg = def.damage * charHit.multiplier * falloff * energy;
      const headshot = charHit.name === 'head';
      const applied = charHit.target.damage(dmg, {
        from: origin.clone(), part: charHit.name, headshot,
        armorPen: def.armorPenetration, weapon: def.id, byPlayer: true,
      });
      this.stats.shotsHit++;
      this.stats.damageDealt += applied.amount;
      if (headshot) this.stats.headshots++;
      if (applied.killed) this.stats.kills++;
      this.vfx?.bloodHit(charHit.point.clone(), dir.clone().negate());
      this.audio?.play(applied.armorHit ? 'hit.armor' : 'hit.flesh', { pos: charHit.point.clone(), volume: 0.8 });
      this.vfx?.tracer(origin.clone(), charHit.point.clone(), { family: def.family });
      bus.emit(EV.DAMAGE_DEALT, {
        target: charHit.target, amount: applied.amount, part: charHit.name,
        headshot, killed: applied.killed, byPlayer: true,
      });
      return { kind: 'character', part: charHit.name, killed: applied.killed, damage: applied.amount, point: charHit.point };
    }

    if (worldHit) {
      const dist = travelled + worldHit.distance;
      const surface = surfaceFromMat(worldHit.matName);
      this.vfx?.tracer(origin.clone(), worldHit.point.clone(), { family: def.family });

      // Glass takes damage and may shatter, then the round continues
      const pane = this.level?.glass?.paneFromObject(worldHit.object);
      if (pane && pane.state !== 'broken') {
        pane.damage(def.damage * 0.8, worldHit.point.clone(), dir.clone());
        this.vfx?.impact(worldHit.point.clone(), worldHit.normal.clone(), 'glass');
        this.audio?.play(pane.state === 'broken' ? 'glass.shatter' : 'glass.crack', { pos: worldHit.point.clone() });
        const next = worldHit.point.clone().addScaledVector(dir, 0.06);
        return this.traceShot(next, dir, def, depth + 1, energy * 0.88, dist);
      }

      const door = worldHit.object?.parent?.userData?.door ?? findDoor(worldHit.object);
      if (door) door.damage(def.damage * 0.6);

      this.vfx?.impact(worldHit.point.clone(), worldHit.normal.clone(), surface, { energy });
      this.audio?.play(`impact.${surface}`, { pos: worldHit.point.clone(), volume: 0.7 });
      bus.emit(EV.BULLET_IMPACT, { point: worldHit.point.clone(), normal: worldHit.normal.clone(), surface, weapon: def.id });
      bus.emit(EV.NOISE, { pos: worldHit.point.clone(), radius: 10, kind: 'impact', source: 'player' });

      // Penetration
      const pen = PENETRABLE[surface];
      if (pen && def.penetration > 0 && pen.maxThickness > 0) {
        const exit = findExit(worldHit.point, dir, pen.maxThickness);
        if (exit) {
          const lost = pen.cost / Math.max(0.15, def.penetration);
          const remaining = energy - lost;
          if (remaining > 0.15) {
            this.vfx?.impact(exit.clone(), dir.clone().negate(), surface, { energy: remaining * 0.6 });
            return this.traceShot(exit.addScaledVector(dir, 0.02), dir, def, depth + 1, remaining, dist);
          }
        }
      }
      return { kind: 'surface', surface, point: worldHit.point, distance: dist };
    }
    return { kind: 'miss' };
  }

  /* ---------------- Melee ---------------- */

  melee() {
    const def = this.current.def;
    this.meleeEnd = this.time + 60 / def.rpm;
    this.viewModel?.play('melee');
    this.audio?.play('wpn.knife.swing', { volume: 0.7 });
    bus.emit(EV.MELEE_SWING, { weapon: def.id });
    const origin = this.player.eyePosition;
    const dir = this.player.lookDirection;
    const targets = this.getTargets();
    let best = null;
    for (const t of targets) {
      if (!t.alive) continue;
      const hit = t.raycastHitboxes(origin, dir, def.meleeRange);
      if (hit && (!best || hit.distance < best.distance)) best = { ...hit, target: t };
    }
    if (best) {
      const facing = best.target.forwardDot ? best.target.forwardDot(dir) : 0;
      const back = facing > 0.35;
      const dmg = (back ? def.backstabDamage : def.damage) * best.multiplier;
      const applied = best.target.damage(dmg, { from: origin.clone(), part: best.name, weapon: def.id, armorPen: def.armorPenetration, byPlayer: true, melee: true });
      this.stats.shotsFired++;
      this.stats.shotsHit++;
      this.stats.damageDealt += applied.amount;
      if (applied.killed) this.stats.kills++;
      this.vfx?.bloodHit(best.point.clone(), dir.clone().negate());
      this.audio?.play('wpn.knife.hit', { pos: best.point.clone(), volume: 0.9 });
      bus.emit(EV.DAMAGE_DEALT, { target: best.target, amount: applied.amount, part: best.name, killed: applied.killed, byPlayer: true, melee: true });
    } else {
      this.stats.shotsFired++;
      const wh = collision.raycast(origin, dir, def.meleeRange);
      if (wh) {
        const surface = surfaceFromMat(wh.matName);
        this.vfx?.impact(wh.point.clone(), wh.normal.clone(), surface, { energy: 0.4 });
        this.audio?.play(`impact.${surface}`, { pos: wh.point.clone(), volume: 0.5 });
      }
    }
    bus.emit(EV.NOISE, { pos: origin.clone(), radius: 5, kind: 'melee', source: 'player' });
    return true;
  }

  /* ---------------- Utility ---------------- */

  throwUtility() {
    const id = this.currentUtility;
    if (!id) return false;
    const stock = this.utilityStock.get(id) ?? 0;
    if (stock <= 0 || this.time < (this.throwReadyAt ?? 0)) return false;
    const def = WEAPONS[id];
    this.utilityStock.set(id, stock - 1);
    this.throwReadyAt = this.time + 0.85;
    this.viewModel?.play('throw');
    this.audio?.play('nade.throw', { volume: 0.7 });
    const origin = this.player.eyePosition.clone().addScaledVector(this.player.lookDirection, 0.4);
    const vel = this.player.lookDirection.clone().multiplyScalar(def.throwForce).add(new THREE.Vector3(0, 2.2, 0));
    vel.add(this.player.velocity.clone().multiplyScalar(0.4));
    this.grenades.push({
      id, def, pos: origin, vel, fuse: def.fuse, age: 0, bounces: 0, byPlayer: true, mesh: null,
    });
    bus.emit(EV.GRENADE_THROWN, { id, origin: origin.clone() });
    if ((this.utilityStock.get(id) ?? 0) <= 0) {
      const other = this.utilityOrder.find((u) => (this.utilityStock.get(u) ?? 0) > 0);
      if (other) { this.utilityIndex = this.utilityOrder.indexOf(other); this._applyViewModel(); }
      else this.selectSlot(this.slots[1] ? 1 : 2);
    }
    return true;
  }

  updateGrenades(dt) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.age += dt;
      g.vel.y -= 19.5 * dt;
      const step = g.vel.clone().multiplyScalar(dt);
      const dist = step.length();
      if (dist > 0.001) {
        const hit = collision.raycast(g.pos, step.clone().normalize(), dist + 0.06);
        if (hit) {
          g.pos.copy(hit.point).addScaledVector(hit.normal, 0.05);
          const vn = hit.normal.clone().multiplyScalar(g.vel.dot(hit.normal));
          g.vel.sub(vn.multiplyScalar(1.5)).multiplyScalar(0.55);
          g.bounces++;
          if (g.vel.length() > 1.4) {
            this.audio?.play('nade.bounce', { pos: g.pos.clone(), volume: 0.5 });
            bus.emit(EV.NOISE, { pos: g.pos.clone(), radius: 8, kind: 'grenade', source: 'player' });
          }
        } else {
          g.pos.add(step);
        }
      }
      if (g.age >= g.fuse) {
        this.detonate(g);
        this.grenades.splice(i, 1);
      }
    }
  }

  detonate(g) {
    if (g.id === 'flash.halo') {
      this.vfx?.flashBang(g.pos.clone());
      this.vfx?.screenWash?.('flash', 0.4);
      this.audio?.play('nade.flash', { pos: g.pos.clone(), volume: 1 });
      bus.emit(EV.FLASH_DETONATE, { pos: g.pos.clone(), radius: g.def.effectRadius, duration: g.def.blindDuration });
    } else {
      const handle = this.vfx?.smokeVolume(g.pos.clone(), g.def.effectRadius, g.def.smokeDuration);
      this.audio?.play('nade.smoke', { pos: g.pos.clone(), volume: 0.9 });
      bus.emit(EV.SMOKE_DETONATE, { pos: g.pos.clone(), radius: g.def.effectRadius, duration: g.def.smokeDuration, handle });
    }
    bus.emit(EV.NOISE, { pos: g.pos.clone(), radius: g.def.noise, kind: 'explosion', source: 'player' });
  }

  /* ---------------- Reload ---------------- */

  tryReload() {
    const w = this.current;
    if (!w || this.reloading || this.switching) return false;
    if (!w.def.magazine) return false;
    if (w.magazine >= w.def.magazine || w.reserve <= 0) return false;
    this.reloading = true;
    this.aiming = false;
    const empty = w.magazine === 0;
    if (w.def.shellReload) {
      this.reloadShells = Math.min(w.def.magazine - w.magazine, w.reserve);
      this.reloadStart = this.time;
      this.reloadEnd = this.time + w.def.reloadStartTime + this.reloadShells * w.def.reloadTime + w.def.reloadEndTime;
      this.nextShellAt = this.time + w.def.reloadStartTime;
      this.viewModel?.play('reload');
    } else {
      const dur = empty ? w.def.reloadEmptyTime : w.def.reloadTime;
      this.reloadStart = this.time;
      this.reloadEnd = this.time + dur;
      this.viewModel?.play(empty ? 'reloadEmpty' : 'reload');
    }
    this.audio?.play(w.def.sounds.reload ?? 'wpn.magOut', { volume: 0.8 });
    bus.emit(EV.RELOAD_START, { weapon: w.def.id, empty, duration: this.reloadEnd - this.time });
    bus.emit(EV.NOISE, { pos: this.player.position.clone(), radius: 7, kind: 'reload', source: 'player' });
    return true;
  }

  _finishReload() {
    const w = this.current;
    if (!w) return;
    const need = w.def.magazine - w.magazine;
    const take = Math.min(need, w.reserve);
    w.magazine += take;
    w.reserve -= take;
    this.reloading = false;
    this.consecutiveShots = 0;
    bus.emit(EV.RELOAD_END, { weapon: w.def.id, magazine: w.magazine, reserve: w.reserve });
  }

  cancelReload() {
    if (!this.reloading) return;
    this.reloading = false;
    bus.emit(EV.RELOAD_END, { weapon: this.current?.def.id, magazine: this.current?.magazine, reserve: this.current?.reserve, cancelled: true });
  }

  /* ---------------- Frame ---------------- */

  update(dt, input, ctx = {}) {
    this.time += dt;
    const p = this.player;

    if (this.switching && this.time >= this.switchEnd) {
      this.switching = false;
      this.currentSlot = this.pendingSlot;
      if (this.currentSlot !== 4) this.current = this.slots[this.currentSlot];
      else this.current = { def: WEAPONS[this.currentUtility], magazine: this.utilityStock.get(this.currentUtility) ?? 0, reserve: 0, lastShot: -99 };
      this._applyViewModel();
      this.audio?.play('wpn.draw', { volume: 0.5 });
      bus.emit(EV.WEAPON_SWITCH, { weapon: this.current?.def?.id, slot: this.currentSlot });
    }

    if (this.reloading) {
      const w = this.current;
      if (w?.def.shellReload) {
        if (this.time >= this.nextShellAt && this.reloadShells > 0 && w.magazine < w.def.magazine && w.reserve > 0) {
          w.magazine++;
          w.reserve--;
          this.reloadShells--;
          this.nextShellAt = this.time + w.def.reloadTime;
          this.audio?.play('wpn.shotgun.shell', { volume: 0.7 });
          if (this.reloadShells <= 0) {
            this.reloading = false;
            this.consecutiveShots = 0;
            this.audio?.play('wpn.shotgun.pump', { volume: 0.7, delay: 0.12 });
            bus.emit(EV.RELOAD_END, { weapon: w.def.id, magazine: w.magazine, reserve: w.reserve });
          }
        }
      } else if (this.time >= this.reloadEnd) {
        this._finishReload();
      }
    }

    if (!p.alive) {
      this.aiming = false;
      this.adsFactor = 0;
      this.updateGrenades(dt);
      return;
    }

    if (!ctx.uiCaptured) {
      if (input.wasPressed('slot1')) this.selectSlot(1);
      if (input.wasPressed('slot2')) this.selectSlot(2);
      if (input.wasPressed('slot3')) this.selectSlot(3);
      if (input.wasPressed('slot4')) { if (this.currentSlot === 4) this.cycleUtility(); else this.selectSlot(4); }
      if (input.wasPressed('flash')) { this._quickUtility('flash.halo'); }
      if (input.wasPressed('smoke')) { this._quickUtility('smoke.veil'); }
      if (input.wasPressed('melee') && this.currentSlot !== 3) { this.quickMelee(); }
      if (input.wasPressed('reload')) this.tryReload();
      if (input.mouse.wheel) this.selectSlot(this.currentSlot === 1 ? 2 : 1);

      const wantAds = settings.get('toggleAds')
        ? (input.mouse.rightPressed ? !this.aiming : this.aiming)
        : input.mouse.right;
      const canAds = this.current && this.current.def.category !== 'utility' && !this.reloading && !this.switching;
      this.aiming = !!(wantAds && canAds && this.current?.def.category !== 'melee');

      if (input.mouse.left) {
        if (this.reloading && this.current?.def.shellReload && this.current.magazine > 0) {
          this.reloading = false;
          this.audio?.play('wpn.shotgun.pump', { volume: 0.7 });
        }
        this.tryFire(!input.mouse.leftPressed);
      }
    } else {
      this.aiming = false;
    }

    if (this.autoReloadAt && this.time >= this.autoReloadAt) {
      this.autoReloadAt = 0;
      this.tryReload();
    }
    if (this.time - this.lastFireTime > 0.32) this.consecutiveShots = 0;

    const adsSpeed = this.current?.def?.adsTime ? 1 / this.current.def.adsTime : 4;
    this.adsFactor += ((this.aiming ? 1 : 0) - this.adsFactor) * Math.min(1, adsSpeed * dt);
    this.spreadDegrees = this.computeSpread();
    this.updateGrenades(dt);

    if (this.viewModel) {
      this.viewModel.update(dt, {
        moveSpeed: p.horizontalSpeed, aiming: this.aiming, adsFactor: this.adsFactor,
        grounded: p.grounded, crouched: p.isCrouched, firing: input.mouse?.left ?? false,
        yawDelta: 0, pitchDelta: 0, landImpact: p.landingDip,
      });
    }
  }

  _quickUtility(id) {
    if ((this.utilityStock.get(id) ?? 0) <= 0) return;
    const idx = this.utilityOrder.indexOf(id);
    if (idx < 0) return;
    this.utilityIndex = idx;
    if (this.currentSlot !== 4) {
      this.returnSlot = this.currentSlot;
      this.selectSlot(4);
      this.pendingThrow = true;
    } else {
      this.throwUtility();
    }
  }

  quickMelee() {
    this.returnSlot = this.currentSlot;
    if (this.selectSlot(3)) this.pendingMelee = true;
  }

  postSwitch() {
    if (this.pendingThrow && this.currentSlot === 4 && !this.switching) {
      this.pendingThrow = false;
      this.throwUtility();
    }
    if (this.pendingMelee && this.currentSlot === 3 && !this.switching) {
      this.pendingMelee = false;
      this.melee();
    }
  }

  get adsFov() {
    const base = settings.get('fov');
    const def = this.current?.def;
    if (!def || !def.adsFov) return base;
    return THREE.MathUtils.lerp(base, def.adsFov, this.adsFactor);
  }

  serialize() {
    const w = this.current;
    return {
      activeWeapon: w?.def?.id ?? null,
      activeWeaponName: w?.def?.name ?? null,
      slot: this.currentSlot,
      magazine: w?.magazine ?? 0,
      magazineSize: w?.def?.magazine ?? 0,
      reserve: w?.reserve ?? 0,
      reloading: this.reloading,
      reloadProgress: this.reloading ? clamp01((this.time - this.reloadStart) / Math.max(0.01, this.reloadEnd - this.reloadStart)) : 0,
      aiming: this.aiming,
      adsFactor: Math.round(this.adsFactor * 100) / 100,
      spreadDegrees: Math.round(this.spreadDegrees * 100) / 100,
      utility: this.utilityList(),
      grenadesInFlight: this.grenades.length,
      stats: { ...this.stats },
    };
  }
}

/* ---------------- helpers ---------------- */

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function applyCone(dir, degrees) {
  if (degrees <= 0.0001) return dir;
  const rad = THREE.MathUtils.degToRad(degrees);
  const a = grand() * Math.PI * 2;
  const r = Math.sqrt(grand()) * rad;
  const up = Math.abs(dir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(dir, up).normalize();
  const realUp = new THREE.Vector3().crossVectors(right, dir).normalize();
  dir.addScaledVector(right, Math.cos(a) * Math.tan(r));
  dir.addScaledVector(realUp, Math.sin(a) * Math.tan(r));
  return dir.normalize();
}

function rangeFalloff(def, dist) {
  if (dist <= def.falloffStart) return 1;
  if (dist >= def.falloffEnd) return def.falloffMin;
  const t = (dist - def.falloffStart) / (def.falloffEnd - def.falloffStart);
  return 1 + (def.falloffMin - 1) * t;
}

export function surfaceFromMat(matName) {
  if (!matName) return 'concrete';
  const fam = String(matName).split('.')[0];
  switch (fam) {
    case 'drywall': case 'plaster': return 'drywall';
    case 'ceiling': return 'tile';
    case 'carpet': case 'fabric': case 'leather': return 'carpet';
    case 'vinyl': return 'vinyl';
    case 'tile': return 'ceramic';
    case 'concrete': return 'concrete';
    case 'wood': case 'laminate': return 'wood';
    case 'cardboard': case 'paper': return 'wood';
    case 'metal': case 'emissive': return 'metal';
    case 'glass': return 'glass';
    case 'plastic': return 'plastic';
    case 'rubber': return 'rubber';
    case 'snow': case 'ice': return 'snow';
    default: return 'concrete';
  }
}

function findExit(entry, dir, maxThickness) {
  // March through the solid and find where it ends
  const step = 0.02;
  const probe = entry.clone();
  for (let d = step; d <= maxThickness; d += step) {
    probe.copy(entry).addScaledVector(dir, d);
    const back = collision.raycast(probe, dir.clone().negate(), d + 0.05);
    if (!back) return probe.clone();
  }
  return null;
}

function findDoor(obj) {
  let o = obj;
  let guard = 0;
  while (o && guard++ < 6) {
    if (o.userData?.doorRef) return o.userData.doorRef;
    o = o.parent;
  }
  return null;
}
