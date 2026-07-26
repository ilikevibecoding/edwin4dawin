// Weapon handling: slots, draw/holster, semi/auto/pump/bolt fire, magazine
// and shell-by-shell reloads, spread bloom, recoil, hitscan with glass
// punch-through and limited thin-wall penetration, knife melee, gadget throws.

import * as THREE from 'three';
import { WEAPONS } from './constants.js';
import { mouseButton, mousePressed, keyPressed, consumeWheel } from '../core/input.js';
import { emit } from '../core/events.js';
import { sfx } from '../core/audio.js';
import { rng } from '../core/rng.js';

const SLOT_ORDER = ['primary', 'secondary', 'melee', 'gadget'];

export class WeaponSystem {
  constructor(player, world, game) {
    this.player = player;
    this.world = world;
    this.game = game;
    this.slots = { primary: null, secondary: null, melee: null, gadget: null };
    this.ammo = {};      // weaponId -> {mag, reserve}
    this.gadgetCount = 0;
    this.slot = 'primary';
    this.prevSlot = 'secondary';
    this.state = 'draw';
    this.timer = 0.4;
    this.fireCooldown = 0;
    this.bloom = 0;
    this.adsHeld = false;
    this.stats = { shots: 0, hits: 0, kills: 0 };
    this._quickThrowReturn = null;
    this._shellReloadActive = false;
  }

  equipLoadout(loadout) {
    this.slots.primary = loadout.primary;
    this.slots.secondary = loadout.secondary;
    this.slots.melee = loadout.melee;
    this.slots.gadget = loadout.gadget;
    for (const id of [loadout.primary, loadout.secondary]) {
      const w = WEAPONS[id];
      this.ammo[id] = { mag: w.mag, reserve: w.reserve };
    }
    this.gadgetCount = WEAPONS[loadout.gadget].count;
    this.slot = 'primary';
    this.prevSlot = 'secondary';
    this.state = 'draw';
    this.timer = WEAPONS[loadout.primary].drawTime;
  }

  get weapon() { return WEAPONS[this.slots[this.slot]]; }
  get weaponId() { return this.slots[this.slot]; }
  ammoOf(id) { return this.ammo[id] || { mag: 0, reserve: 0 }; }

  addReserveAmmo(frac) {
    for (const id of [this.slots.primary, this.slots.secondary]) {
      const w = WEAPONS[id];
      const a = this.ammo[id];
      a.reserve = Math.min(w.reserve, a.reserve + Math.ceil(w.reserve * frac));
    }
  }

  switchTo(slot, { remember = true } = {}) {
    if (!this.slots[slot] || slot === this.slot) return;
    if (slot === 'gadget' && this.gadgetCount <= 0) return;
    if (remember) this.prevSlot = this.slot;
    this.slot = slot;
    this.state = 'draw';
    this.timer = this.weapon.drawTime || 0.4;
    this._shellReloadActive = false;
    sfx('weapon_draw', { vol: 0.5, rateJitter: 0.1 });
    emit('weapon-switch', { id: this.weaponId });
  }

  cycle(dir) {
    const idx = SLOT_ORDER.indexOf(this.slot);
    for (let i = 1; i <= SLOT_ORDER.length; i++) {
      const next = SLOT_ORDER[(idx + dir * i + SLOT_ORDER.length * 4) % SLOT_ORDER.length];
      if (this.slots[next] && !(next === 'gadget' && this.gadgetCount <= 0)) { this.switchTo(next); return; }
    }
  }

  update(dt, inputEnabled) {
    const p = this.player;
    const w = this.weapon;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.bloom = Math.max(0, this.bloom - dt * (w.recoilRecover || 8) * 0.35);

    // ADS
    this.adsHeld = inputEnabled && mouseButton(2) && w.class !== 'melee' && w.class !== 'gadget' && this.state !== 'reload';
    const adsTarget = this.adsHeld ? 1 : 0;
    p.adsFrac = THREE.MathUtils.damp(p.adsFrac, adsTarget, 1 / Math.max(0.06, w.adsTime || 0.2) * 0.25, dt * 4);
    if (Math.abs(p.adsFrac - adsTarget) < 0.01) p.adsFrac = adsTarget;

    if (!inputEnabled) return;

    // switching
    if (keyPressed('Digit1')) this.switchTo('primary');
    if (keyPressed('Digit2')) this.switchTo('secondary');
    if (keyPressed('Digit3')) this.switchTo('melee');
    if (keyPressed('Digit4')) this.switchTo('gadget');
    const wheel = consumeWheel();
    if (wheel) this.cycle(wheel > 0 ? 1 : -1);
    if (keyPressed('KeyG') && this.gadgetCount > 0 && this.slot !== 'gadget') {
      this._quickThrowReturn = this.slot;
      this.switchTo('gadget', { remember: false });
    }

    // state timers
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) this.onStateTimerDone();
      if (this.state === 'reload' || this.state === 'draw' || this.state === 'pump' || this.state === 'throw') return;
    }

    // reload input
    if (keyPressed('KeyR')) this.tryReload();
    if (this.state === 'reload') return;

    // fire input
    const wantFire = w.auto ? mouseButton(0) : mousePressed(0);
    if (wantFire) this.tryFire();
  }

  onStateTimerDone() {
    const w = this.weapon;
    if (this.state === 'draw') {
      this.state = 'idle';
      // quick-throw: gadget drawn via G throws immediately
      if (this.slot === 'gadget' && this._quickThrowReturn) this.tryFire();
    } else if (this.state === 'reload') {
      if (this._shellReloadActive) {
        // one shell in
        const a = this.ammoOf(this.weaponId);
        if (a.reserve > 0 && a.mag < w.mag) { a.mag++; a.reserve--; sfx('shell_insert', { vol: 0.55, rateJitter: 0.08 }); }
        if (a.reserve > 0 && a.mag < w.mag) { this.timer = w.reloadPerShell; }
        else { this.state = 'pump'; this.timer = 0.35; this._shellReloadActive = false; }
      } else {
        const a = this.ammoOf(this.weaponId);
        const take = Math.min(w.mag - a.mag, a.reserve);
        a.mag += take; a.reserve -= take;
        this.state = 'idle';
        sfx('reload_end', { vol: 0.5 });
        emit('weapon-reloaded', { id: this.weaponId });
      }
    } else if (this.state === 'pump') {
      this.state = 'idle';
    } else if (this.state === 'throw') {
      this.state = 'idle';
      if (this._quickThrowReturn) { const back = this._quickThrowReturn; this._quickThrowReturn = null; this.switchTo(back, { remember: false }); }
      else if (this.gadgetCount <= 0) this.switchTo(this.prevSlot === 'gadget' ? 'primary' : this.prevSlot, { remember: false });
    } else if (this.state === 'holster') {
      this.state = 'idle';
    }
  }

  tryReload() {
    const w = this.weapon;
    if (w.class === 'melee' || w.class === 'gadget') return;
    const a = this.ammoOf(this.weaponId);
    if (a.mag >= w.mag || a.reserve <= 0 || this.state === 'reload') return;
    this.state = 'reload';
    if (w.reloadPerShell) {
      this._shellReloadActive = true;
      this.timer = w.reloadPerShell;
      sfx('reload_start', { vol: 0.5 });
    } else {
      this.timer = a.mag === 0 ? w.reloadEmptyTime : w.reloadTime;
      sfx(a.mag === 0 ? 'reload_empty' : 'reload_mag', { vol: 0.6 });
    }
    emit('weapon-reload-start', { id: this.weaponId, empty: a.mag === 0 });
  }

  tryFire() {
    const w = this.weapon;
    if (this.fireCooldown > 0 || this.state === 'draw' || this.state === 'pump' || this.state === 'throw') return;
    // interrupt shell reload to fire
    if (this.state === 'reload') {
      if (this._shellReloadActive) { this.state = 'pump'; this.timer = 0.22; this._shellReloadActive = false; }
      return;
    }
    if (w.class === 'melee') { this.doMelee(); return; }
    if (w.class === 'gadget') { this.doThrow(); return; }
    const a = this.ammoOf(this.weaponId);
    if (a.mag <= 0) {
      sfx('dry_fire', { vol: 0.5 });
      this.fireCooldown = 0.28;
      if (a.reserve > 0) this.tryReload();
      return;
    }
    a.mag--;
    this.stats.shots++;
    this.fireCooldown = 60 / w.rpm;
    if (w.pump) { this.state = 'pump'; this.timer = w.pumpTime; setTimeoutSafe(() => sfx('pump', { vol: 0.55 }), 140); }
    if (w.bolt) { this.state = 'pump'; this.timer = w.boltTime; setTimeoutSafe(() => sfx('bolt_cycle', { vol: 0.55 }), 200); }

    const p = this.player;
    const eye = p.eyePos;
    const pellets = w.pellets || 1;
    const hits = [];
    for (let i = 0; i < pellets; i++) {
      const dir = this.aimDirWithSpread(w);
      const hit = this.traceShot(eye, dir, w);
      if (hit) hits.push(hit);
    }
    if (hits.some((h) => h.entity)) this.stats.hits++;

    // recoil
    const kick = THREE.MathUtils.degToRad(w.recoilPitch) * (0.85 + rng.random() * 0.3) * (this.adsHeld ? 0.82 : 1);
    p.recoilPitch += kick;
    p.recoilYaw += THREE.MathUtils.degToRad(w.recoilYaw) * (rng.random() * 2 - 1);
    this.bloom = Math.min(w.spreadMax, this.bloom + w.spreadPerShot);

    sfx(w.sfx, { vol: 0.9, rateJitter: 0.05 });
    emit('noise', { pos: p.pos, radius: w.noise, type: 'gunshot', source: 'player' });
    emit('weapon-fire', { id: this.weaponId, origin: eye, hits, byPlayer: true });
  }

  aimDirWithSpread(w) {
    const p = this.player;
    let spread = w.spreadBase + this.bloom;
    const hSpeed = Math.hypot(p.vel.x, p.vel.z);
    spread += w.spreadMove * Math.min(1, hSpeed / 4.4);
    if (p.crouchFrac > 0.5) spread *= 0.8;
    if (this.adsHeld) spread *= w.spreadAdsMult;
    if (!p.grounded) spread *= 2.1;
    const sRad = THREE.MathUtils.degToRad(spread);
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(p.pitch + p.recoilPitch, p.yaw + p.recoilYaw, 0, 'YXZ'));
    // random offset in cone
    const u = rng.random(), v = rng.random();
    const ang = u * Math.PI * 2;
    const rad = Math.sqrt(v) * sRad;
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(p.pitch, p.yaw, 0, 'YXZ'));
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    dir.addScaledVector(right, Math.cos(ang) * rad).addScaledVector(up, Math.sin(ang) * rad).normalize();
    return dir;
  }

  // Full shot trace: glass punch-through, enemy hit, limited wall penetration.
  traceShot(origin, dir, w, damageScale = 1, depth = 0) {
    const world = this.world;
    const maxDist = 200;
    const ignore = new Set();
    let ox = origin.x, oy = origin.y, oz = origin.z;
    let traveled = 0;
    let result = null;

    for (let guard = 0; guard < 6; guard++) {
      const solid = world.raycast(ox, oy, oz, dir.x, dir.y, dir.z, maxDist - traveled, { blocking: 'move', ignore });
      let solidT = solid && solid.collider ? solid.t : maxDist - traveled;

      // enemies between
      const enemyHit = this.game.raycastEntities(ox, oy, oz, dir, solidT);
      if (enemyHit) {
        const dist = traveled + enemyHit.t;
        const dmg = this.damageAtRange(w, dist) * damageScale * (enemyHit.part === 'head' ? w.headMult : 1);
        enemyHit.entity.takeDamage(dmg, enemyHit.part, origin, this.weaponId);
        emit('impact', { kind: 'flesh', point: enemyHit.point, normal: dir.clone().negate(), part: enemyHit.part });
        return { entity: enemyHit.entity, part: enemyHit.part, point: enemyHit.point, dist };
      }

      if (!solid || !solid.collider) return result;
      const c = solid.collider;
      const pt = solid.point;
      traveled += solid.t;

      // glass pane: crack/break and continue
      if (c.glass && c.pane) {
        this.game.damageGlass(c.pane, pt, dir);
        ignore.add(c);
        ox = pt.x + dir.x * 0.02; oy = pt.y + dir.y * 0.02; oz = pt.z + dir.z * 0.02;
        damageScale *= 0.92;
        continue;
      }
      if (c.glassSoft) { // glass door panel: pass with cosmetic effect
        emit('impact', { kind: 'glass', point: pt, normal: solid.normal });
        ignore.add(c);
        ox = pt.x + dir.x * 0.02; oy = pt.y + dir.y * 0.02; oz = pt.z + dir.z * 0.02;
        damageScale *= 0.9;
        continue;
      }

      emit('impact', { kind: c.surface || 'concrete', point: pt, normal: solid.normal, byPlayer: true });
      emit('noise', { pos: pt, radius: 6, type: 'impact', source: 'player' });

      // thin-wall penetration for capable weapons
      if (depth === 0 && (w.penetration || 0) >= 2 && (c.kind === 'wall' || c.kind === 'door')) {
        const thickness = thicknessAlong(c, dir);
        if (thickness <= 0.26) {
          const exit = new THREE.Vector3(pt.x + dir.x * (thickness + 0.04), pt.y + dir.y * (thickness + 0.04), pt.z + dir.z * (thickness + 0.04));
          emit('impact', { kind: c.surface || 'drywall', point: exit, normal: dir.clone(), exitWound: true });
          return this.traceShot(exit, dir, w, damageScale * 0.42, depth + 1) || { point: pt, dist: traveled };
        }
      }
      return { point: pt, dist: traveled, surface: c.surface };
    }
    return result;
  }

  damageAtRange(w, dist) {
    if (dist <= w.falloffStart) return w.damage;
    if (dist >= w.falloffEnd) return w.damage * w.minDmgFrac;
    const t = (dist - w.falloffStart) / (w.falloffEnd - w.falloffStart);
    return w.damage * (1 - t * (1 - w.minDmgFrac));
  }

  doMelee() {
    const w = this.weapon;
    this.fireCooldown = w.swingTime;
    sfx('knife_swing', { vol: 0.5, rateJitter: 0.1 });
    emit('weapon-fire', { id: 'talon', melee: true, byPlayer: true });
    const p = this.player;
    const eye = p.eyePos;
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(p.pitch, p.yaw, 0, 'YXZ'));
    const hit = this.game.raycastEntities(eye.x, eye.y, eye.z, dir, w.range);
    if (hit) {
      // backstab: attacking within the target's rear 120° arc
      const facing = hit.entity.facingDir ? hit.entity.facingDir() : null;
      let dmg = w.damage;
      if (facing) {
        const toTarget = new THREE.Vector3(hit.entity.pos.x - p.pos.x, 0, hit.entity.pos.z - p.pos.z).normalize();
        if (facing.dot(toTarget) > 0.35) dmg *= w.backMult;
      }
      hit.entity.takeDamage(dmg, 'body', eye, 'talon');
      sfx('knife_hit', { vol: 0.7 });
      emit('impact', { kind: 'flesh', point: hit.point, normal: dir.clone().negate() });
      this.stats.hits++; this.stats.shots++;
    } else {
      const wallHit = this.world.raycast(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, w.range, { blocking: 'move' });
      if (wallHit && wallHit.collider) {
        sfx('knife_wall', { vol: 0.5 });
        emit('impact', { kind: wallHit.collider.surface || 'concrete', point: wallHit.point, normal: wallHit.normal, light: true });
      }
      this.stats.shots++;
    }
    emit('noise', { pos: p.pos, radius: w.noise, type: 'impact', source: 'player' });
  }

  doThrow() {
    if (this.gadgetCount <= 0) return;
    this.gadgetCount--;
    this.state = 'throw';
    this.timer = 0.38;
    const w = this.weapon;
    const p = this.player;
    const eye = p.eyePos;
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(p.pitch + 0.08, p.yaw, 0, 'YXZ'));
    this.game.spawnGrenade(this.weaponId, eye, dir, 11);
    sfx('throw', { vol: 0.5 });
    emit('weapon-fire', { id: this.weaponId, thrown: true, byPlayer: true });
  }

  getHudState() {
    const w = this.weapon;
    const a = this.ammoOf(this.weaponId);
    return {
      id: this.weaponId, name: w.name, cls: w.class, state: this.state,
      mag: w.class === 'gadget' ? this.gadgetCount : a.mag,
      reserve: w.class === 'gadget' ? 0 : a.reserve,
      mode: w.auto ? 'AUTO' : w.pump ? 'PUMP' : w.bolt ? 'BOLT' : w.class === 'melee' ? 'BLADE' : w.class === 'gadget' ? 'THROW' : 'SEMI',
      gadget: { id: this.slots.gadget, count: this.gadgetCount },
      ads: this.adsHeld,
    };
  }
}

function thicknessAlong(c, dir) {
  // approximate wall thickness: smallest extent among dominant axes
  const ex = c.x1 - c.x0, ey = c.y1 - c.y0, ez = c.z1 - c.z0;
  if (Math.abs(dir.x) > Math.abs(dir.z)) return ex;
  return ez;
}

const timers = [];
function setTimeoutSafe(fn, ms) {
  // avoid real timers in deterministic mode: fire immediately (sound offset is cosmetic)
  if (window.__deterministic) { fn(); return; }
  timers.push(setTimeout(fn, ms));
}
