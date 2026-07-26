// Weapon handling: slots, draw/holster, semi/auto/pump/bolt fire, magazine
// and shell-by-shell reloads, spread bloom, recoil, hitscan with glass
// punch-through and limited thin-wall penetration, knife melee, gadget throws.

import * as THREE from 'three';
import { WEAPONS, COMBAT, PLAYER } from './constants.js';
import { mouseButton, mousePressed, keyDown, keyPressed, consumeWheel } from '../core/input.js';
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
    this.bloom = 0;        // recoil-driven spread, degrees (HUD crosshair reads it)
    this.adsHeld = false;
    this.adsT = 0;         // raw 0..1 ADS progress; player.adsFrac is the eased curve
    this.moveBloom = 0;    // 0..1 movement penalty, decays over COMBAT.moveSettleTime
    this.burstShots = 0;   // consecutive shots, drives the recoil ramp
    this.sinceShot = 99;
    this.breath = 1;       // 1 = lungs full; drains while holding breath
    this.steady = false;
    this.steadyFrac = 0;
    this.stats = { shots: 0, hits: 0, kills: 0 };
    this._quickThrowReturn = null;
    this._shellReloadActive = false;
    this._reloadQueued = 0;
    // deterministic builds expose the combat systems so QA probes can inspect
    // spread/bloom and stage test geometry (see docs/reports/opus2-combat.md)
    if (typeof window !== 'undefined' && window.__deterministic) window.__combat = this;
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
    // a reload in flight is abandoned, never half-applied: rounds only move
    // between mag and reserve when the reload timer completes
    if (this.state === 'reload') emit('weapon-reload-cancel', { id: this.weaponId });
    if (remember) {
      this.prevSlot = this.slot;
      this._quickThrowReturn = null; // a deliberate switch overrides a pending quick-throw
    }
    this.slot = slot;
    this.state = 'draw';
    this.timer = this.weapon.drawTime || 0.4;
    this._shellReloadActive = false;
    this._reloadQueued = 0;   // intent belongs to the weapon it was given for
    this.bloom = 0;
    this.burstShots = 0;
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
    this.bloom = Math.max(0, this.bloom - dt * (w.bloomDecay || 3.5));
    this.sinceShot += dt;
    if (this.sinceShot > 0.22) this.burstShots = Math.max(0, this.burstShots - dt * 9);

    // Movement penalty tracks speed instantly on the way up and settles over
    // moveSettleTime on the way down — that window is the stop-and-pop rhythm.
    const hSpeed = Math.hypot(p.vel.x, p.vel.z);
    const moveTarget = Math.min(1, hSpeed / (PLAYER.runSpeed * 0.95));
    this.moveBloom = moveTarget >= this.moveBloom
      ? moveTarget
      : Math.max(moveTarget, this.moveBloom - dt / COMBAT.moveSettleTime);

    // ADS: reloading drops the sights; the eased curve snaps in and settles soft
    const canAds = w.class !== 'melee' && w.class !== 'gadget' && this.state !== 'reload' && this.state !== 'throw';
    this.adsHeld = inputEnabled && mouseButton(2) && canAds;
    const adsIn = Math.max(0.06, w.adsTime || 0.2);
    this.adsT = THREE.MathUtils.clamp(this.adsT + (this.adsHeld ? dt / adsIn : -dt / (adsIn * 0.75)), 0, 1);
    p.adsFrac = adsEase(this.adsT);

    // hold breath: Shift while scoped with a steady-capable weapon
    const wantSteady = inputEnabled && this.adsHeld && !!w.steadyMult && p.adsFrac > 0.6
      && (keyDown('ShiftLeft') || keyDown('ShiftRight'));
    const breathTime = w.steadyTime || 4;
    this.steady = wantSteady && this.breath > 0;
    if (this.steady) this.breath = Math.max(0, this.breath - dt / breathTime);
    else this.breath = Math.min(1, this.breath + dt / (breathTime * COMBAT.breathRecoverMult));
    this.steadyFrac = THREE.MathUtils.damp(this.steadyFrac, this.steady ? 1 : 0, 9, dt);

    if (!inputEnabled) return;

    // switching
    if (keyPressed('Digit1')) this.switchTo('primary');
    if (keyPressed('Digit2')) this.switchTo('secondary');
    if (keyPressed('Digit3')) this.switchTo('melee');
    if (keyPressed('Digit4')) this.switchTo('gadget');
    const wheel = consumeWheel();
    if (wheel) this.cycle(wheel > 0 ? 1 : -1);
    if (keyPressed('KeyG') && this.gadgetCount > 0 && this.slot !== 'gadget') {
      const back = this.slot;
      this.switchTo('gadget', { remember: false });
      this._quickThrowReturn = back; // set after the switch so it survives the reset
    }

    // reload intent survives a draw/pump/bolt so the input is never swallowed;
    // it only ages out while the weapon is actually free to reload
    if (keyPressed('KeyR')) this._reloadQueued = 0.5;
    else if (this._reloadQueued > 0 && this.state === 'idle') this._reloadQueued -= dt;

    // state timers
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) this.onStateTimerDone();
      if (this.state === 'reload' || this.state === 'draw' || this.state === 'pump' || this.state === 'throw') {
        // firing is blocked while drawing/cycling; a shell reload can be cut short
        if (this.state === 'reload' && this._shellReloadActive && (w.auto ? mouseButton(0) : mousePressed(0))) this.tryFire();
        return;
      }
    }

    if (this._reloadQueued > 0) { this._reloadQueued = 0; this.tryReload(); }
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
    // a pump/bolt cycle, draw or throw always finishes first — the intent waits
    if (this.state !== 'idle') { this._reloadQueued = Math.max(this._reloadQueued, 0.5); return; }
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
    // interrupt shell reload to fire: rack what is already in the tube
    if (this.state === 'reload') {
      if (this._shellReloadActive) {
        this.state = 'pump';
        this.timer = 0.18;
        this._shellReloadActive = false;
        this._reloadQueued = 0;
        sfx('pump', { vol: 0.5 });
      }
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
    this.sinceShot = 0;
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

    // Recoil signature: a per-weapon climb that ramps as the burst runs on,
    // plus a constant drift (positive = to the right) and random lateral jitter.
    // recoilRecover controls how hard the muzzle snaps back to centre.
    this.burstShots++;
    const ramp = Math.min(w.recoilRampMax || 1, 1 + this.burstShots * (w.recoilRampPer || 0));
    const adsMult = this.adsHeld ? (w.adsRecoilMult ?? 0.82) : 1;
    const kick = THREE.MathUtils.degToRad(w.recoilPitch) * ramp * (0.88 + rng.random() * 0.24) * adsMult;
    const yawKick = THREE.MathUtils.degToRad(
      -(w.recoilDrift || 0) * ramp + (w.recoilJitter || 0) * (rng.random() * 2 - 1),
    ) * adsMult;
    p.applyRecoil(kick, yawKick, w.recoilRecover || 9);
    this.bloom = Math.min(w.spreadMax, this.bloom + w.spreadPerShot);

    sfx(w.sfx, { vol: 0.9, rateJitter: 0.05 });
    emit('noise', { pos: p.pos, radius: w.noise, type: 'gunshot', source: 'player' });
    emit('weapon-fire', { id: this.weaponId, origin: eye, hits, byPlayer: true });
  }

  // Current cone radius in degrees. Kept public so probes/HUD can reason about
  // the same number the bullets use.
  currentSpread(w = this.weapon) {
    const p = this.player;
    const share = COMBAT.bloomAdsShare;
    const adsF = this.adsHeld ? w.spreadAdsMult : 1;
    // aim quality: base + the part of recoil bloom the sights can discipline
    let spread = (w.spreadBase + this.bloom * share) * adsF + this.bloom * (1 - share);
    // movement: ADS only partly cancels it, so walking fire stays punished
    spread += (w.spreadMove || 0) * this.moveBloom * (this.adsHeld ? COMBAT.adsMoveSpreadMult : 1);
    if (p.crouchFrac > 0.5 && p.grounded) spread *= COMBAT.crouchSpreadMult;
    if (!p.grounded) spread *= COMBAT.airSpreadMult;
    if (w.steadyMult) spread *= THREE.MathUtils.lerp(1, w.steadyMult, this.steadyFrac);
    return spread;
  }

  aimDirWithSpread(w) {
    const p = this.player;
    const sRad = THREE.MathUtils.degToRad(this.currentSpread(w));
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
  // depth accumulates penetration "cost" (a fabric panel is cheaper than a
  // wall); startDist keeps range falloff measured from the muzzle, not the
  // last exit hole.
  traceShot(origin, dir, w, damageScale = 1, depth = 0, startDist = 0) {
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
        const dist = startDist + traveled + enemyHit.t;
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

      // penetration: material tier vs the distance actually traversed along the
      // shot line, so oblique angles through the same wall stop the bullet
      const spec = penetrationSpec(c, w);
      if (spec && depth + spec.cost <= maxPenetrationLayers(w)) {
        const thickness = traversalThickness(c, pt, dir);
        if (thickness <= spec.maxThick) {
          const out = thickness + 0.02;
          const exit = new THREE.Vector3(pt.x + dir.x * out, pt.y + dir.y * out, pt.z + dir.z * out);
          emit('impact', { kind: c.surface || 'drywall', point: exit, normal: dir.clone(), exitWound: true });
          const retain = Math.min(0.9, spec.retain * (COMBAT.penRetainByTier[w.penetration || 0] ?? 1));
          return this.traceShot(exit, dir, w, damageScale * retain, depth + spec.cost, startDist + traveled + out)
            || { point: pt, dist: startDist + traveled, surface: c.surface };
        }
      }
      return { point: pt, dist: startDist + traveled, surface: c.surface };
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
      // backstab: attacking from inside the target's rear ~140° arc
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
    const p = this.player;
    const eye = p.eyePos;
    // Looking down past 30° becomes an underhand toss: the charge lands a couple
    // of metres away instead of skipping down the corridor.
    const down = THREE.MathUtils.clamp((-p.pitch - 0.52) / 0.6, 0, 1);
    const speed = THREE.MathUtils.lerp(11, 4.4, down);
    const loft = THREE.MathUtils.lerp(0.08, 0.02, down);
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(p.pitch + loft, p.yaw, 0, 'YXZ'));
    this.game.spawnGrenade(this.weaponId, eye, dir, speed);
    sfx('throw', { vol: 0.5 });
    emit('weapon-fire', { id: this.weaponId, thrown: true, byPlayer: true, underhand: down > 0.5 });
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

// Exact distance from an entry point to the far face of an AABB along dir.
// Straight-on shots see the nominal thickness; a shallow angle through the same
// panel sees much more material, which is what stops the bullet.
function traversalThickness(c, entry, dir) {
  const eps = 1e-4;
  const px = entry.x + dir.x * eps, py = entry.y + dir.y * eps, pz = entry.z + dir.z * eps;
  let t = Infinity;
  const axes = [[px, dir.x, c.x0, c.x1], [py, dir.y, c.y0, c.y1], [pz, dir.z, c.z0, c.z1]];
  for (const [p, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) continue;
    const tf = d > 0 ? (hi - p) / d : (lo - p) / d;
    if (tf > 0) t = Math.min(t, tf);
  }
  return t === Infinity ? 0 : t + eps;
}

// How many penetration "layers" a weapon may spend on one shot.
function maxPenetrationLayers(w) {
  return THREE.MathUtils.clamp(w.penetration || 1, 1, 3);
}

// Material rules for shooting through a collider, or null for hard cover.
// Thin prop/rail panels (cubicle dividers, sheet rails) are penetrable by every
// bullet with light loss — they are furniture, not walls.
function penetrationSpec(c, w) {
  if (!['wall', 'door', 'prop', 'rail'].includes(c.kind)) return null;
  const surface = c.surface || (c.kind === 'wall' ? 'drywall' : 'wood');
  if (COMBAT.hardSurfaces.includes(surface)) return null;
  const pen = w.penetration || 0;
  if ((c.kind === 'prop' || c.kind === 'rail') && minExtent(c) <= COMBAT.thinPropThickness) {
    return COMBAT.thinPropSpec;
  }
  const spec = COMBAT.penetration[surface];
  if (!spec || pen < spec.minPen) return null;
  return spec;
}

function minExtent(c) {
  return Math.min(c.x1 - c.x0, c.y1 - c.y0, c.z1 - c.z0);
}

// ADS ease: quick off the mark, soft into the last few percent.
function adsEase(t) {
  return 1 - (1 - t) ** 2.4;
}

const timers = [];
function setTimeoutSafe(fn, ms) {
  // avoid real timers in deterministic mode: fire immediately (sound offset is cosmetic)
  if (window.__deterministic) { fn(); return; }
  timers.push(setTimeout(fn, ms));
}
