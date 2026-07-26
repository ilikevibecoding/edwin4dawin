import * as THREE from 'three';
import { WEAPONS } from './defs';
import type { WeaponDef, WeaponId } from '../types';
import type { Player } from '../player';
import type { CombatSystem, ShotOutcome } from '../combat';
import { input } from '../../core/input';
import { events } from '../../core/events';
import { Rng } from '../../core/rng';
import { settings } from '../../core/settings';

export type WeaponPhase = 'idle' | 'draw' | 'holster' | 'reload' | 'melee' | 'throw';

export interface WeaponSlotState {
  def: WeaponDef;
  mag: number;
  reserve: number;
}

export interface FireEventDetail {
  weapon: WeaponDef;
  origin: THREE.Vector3;
  dir: THREE.Vector3;
  outcomes: ShotOutcome[];
}

const DRAW_TIME = 0.42;
const HOLSTER_TIME = 0.28;

/**
 * Player weapon rig (Opus 2): inventory, firing, spread/recoil, reloading,
 * switching, ADS, throwables. View-model animation reads phase/timers.
 */
export class WeaponRig {
  slots = new Map<number, WeaponSlotState>();
  activeSlot = 1;
  pendingSlot: number | null = null;
  phase: WeaponPhase = 'idle';
  phaseT = 0;
  phaseDur = 0;
  cooldown = 0;
  aimT = 0;
  /** true while reload will fill from empty (chambering anim) */
  reloadingEmpty = false;
  private rng: Rng;
  private player: Player;
  private combat: CombatSystem;
  private lastFireAt = -99;
  private now = 0;
  private triggerHeld = false;
  onFire: (detail: FireEventDetail) => void = () => {};
  onThrow: (kind: 'flash' | 'smoke', origin: THREE.Vector3, dir: THREE.Vector3) => void = () => {};

  constructor(player: Player, combat: CombatSystem, rng: Rng) {
    this.player = player;
    this.combat = combat;
    this.rng = rng;
  }

  setLoadout(primary: WeaponId, utilityFlash = 2, utilitySmoke = 1): void {
    this.slots.clear();
    const mk = (id: WeaponId): WeaponSlotState => ({
      def: WEAPONS[id], mag: WEAPONS[id].magSize, reserve: WEAPONS[id].reserveMax,
    });
    const p = mk(primary);
    this.slots.set(1, p);
    this.slots.set(2, mk('vp9'));
    this.slots.set(3, mk('knife'));
    const fl = mk('flash');
    fl.mag = utilityFlash;
    fl.reserve = 0;
    this.slots.set(4, fl);
    const sm = mk('smoke');
    sm.mag = utilitySmoke;
    sm.reserve = 0;
    this.slots.set(5, sm);
    this.activeSlot = 1;
    this.pendingSlot = null;
    this.phase = 'draw';
    this.phaseT = 0;
    this.phaseDur = DRAW_TIME;
    this.cooldown = 0;
    this.aimT = 0;
    events.emit('weapon:switched', { weaponId: p.def.id });
  }

  get active(): WeaponSlotState {
    return this.slots.get(this.activeSlot)!;
  }

  get def(): WeaponDef {
    return this.active.def;
  }

  /** effective spread radians for current stance */
  currentSpread(): number {
    const d = this.def;
    const hSpeed = Math.hypot(this.player.vel.x, this.player.vel.z);
    const moveFrac = Math.min(1, hSpeed / 4);
    let s = d.spreadBase + d.spreadMove * moveFrac;
    if (this.player.crouchT > 0.5) s *= 0.72;
    if (!this.player.onGround) s *= 2.2;
    s *= THREE.MathUtils.lerp(1, this.def.spreadAds, this.aimT);
    return s;
  }

  step(dt: number): void {
    this.now += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    const wantAim = input.isDown('aim') && this.phase !== 'reload' && this.def.category !== 'knife'
      && this.def.category !== 'flash' && this.def.category !== 'smoke';
    this.aimT = THREE.MathUtils.damp(this.aimT, wantAim ? 1 : 0, 12, dt);
    this.player.speedMult = this.def.moveSpeedMult * THREE.MathUtils.lerp(1, 0.72, this.aimT);

    // slot selection
    for (const slot of [1, 2, 3, 4, 5]) {
      if (input.wasPressed(`slot${slot}` as 'slot1')) this.requestSlot(slot);
    }

    // phase progression
    if (this.phase !== 'idle') {
      this.phaseT += dt;
      if (this.phaseT >= this.phaseDur) {
        if (this.phase === 'holster' && this.pendingSlot !== null) {
          this.activeSlot = this.pendingSlot;
          this.pendingSlot = null;
          this.phase = 'draw';
          this.phaseT = 0;
          this.phaseDur = DRAW_TIME;
          events.emit('weapon:switched', { weaponId: this.def.id });
        } else if (this.phase === 'reload') {
          const st = this.active;
          const need = st.def.magSize - st.mag;
          const take = Math.min(need, st.reserve);
          st.mag += take;
          st.reserve -= take;
          this.phase = 'idle';
          events.emit('weapon:reload', { weaponId: st.def.id, stage: 'done' });
        } else {
          this.phase = 'idle';
        }
      }
    }

    // reload input
    if (input.wasPressed('reload')) this.tryReload();

    // fire input
    const fireHeld = input.isDown('fire');
    const firePressed = input.wasPressed('fire');
    if (this.phase === 'idle' || this.phase === 'melee') {
      const d = this.def;
      if (d.category === 'knife') {
        if (firePressed && this.cooldown <= 0) this.melee();
      } else if (d.category === 'flash' || d.category === 'smoke') {
        if (firePressed && this.cooldown <= 0) this.throwUtility();
      } else if ((d.auto && fireHeld) || (!d.auto && firePressed)) {
        this.tryFire();
      } else if (firePressed && this.active.mag <= 0) {
        this.dryFire();
      }
    }
    this.triggerHeld = fireHeld;
  }

  private requestSlot(slot: number): void {
    if (slot === this.activeSlot || !this.slots.has(slot)) return;
    const st = this.slots.get(slot)!;
    if ((st.def.category === 'flash' || st.def.category === 'smoke') && st.mag <= 0) return;
    this.pendingSlot = slot;
    this.phase = 'holster';
    this.phaseT = 0;
    this.phaseDur = HOLSTER_TIME;
  }

  tryReload(): void {
    const st = this.active;
    if (this.phase !== 'idle') return;
    if (st.def.magSize === 0 || st.mag >= st.def.magSize || st.reserve <= 0) return;
    this.reloadingEmpty = st.mag === 0;
    this.phase = 'reload';
    this.phaseT = 0;
    // shotgun: per-shell loading (duration scales with need)
    if (st.def.category === 'shotgun') {
      const need = Math.min(st.def.magSize - st.mag, st.reserve);
      this.phaseDur = 0.55 + need * st.def.reloadTime;
    } else {
      this.phaseDur = this.reloadingEmpty ? st.def.reloadTimeEmpty : st.def.reloadTime;
    }
    events.emit('weapon:reload', { weaponId: st.def.id, stage: this.reloadingEmpty ? 'empty-start' : 'start' });
  }

  private tryFire(): void {
    const st = this.active;
    if (this.cooldown > 0) return;
    if (st.mag <= 0) {
      if (!this.triggerHeld) this.dryFire();
      return;
    }
    st.mag--;
    this.cooldown = 60 / st.def.rpm;
    this.lastFireAt = this.now;

    const origin = this.player.eyePos();
    const outcomes: ShotOutcome[] = [];
    const baseDir = this.player.forward();
    const spread = this.currentSpread();
    for (let i = 0; i < st.def.pellets; i++) {
      const dir = baseDir.clone();
      // deterministic spread offsets
      const a = this.rng.next() * Math.PI * 2;
      const r = (st.def.pellets > 1 ? Math.sqrt(this.rng.next()) : Math.abs(this.rng.gauss()) * 0.55) * spread;
      const right = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw));
      const up = new THREE.Vector3().crossVectors(right, dir).normalize();
      dir.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
      outcomes.push(this.combat.shoot(origin, dir, st.def, 'player'));
    }

    // recoil
    const reduced = settings.get('reducedMotion') ? 0.6 : 1;
    this.player.recoilPitch += st.def.recoilKick * reduced * (1 - this.aimT * 0.25);
    this.player.recoilYaw += (this.rng.next() - 0.5) * 2 * st.def.recoilYaw * reduced;

    events.emit('weapon:fired', {
      weaponId: st.def.id,
      pos: [origin.x, origin.y, origin.z],
      loudness: st.def.loudness,
    });
    events.emit('noise', { pos: [origin.x, origin.y, origin.z], radius: st.def.loudness, kind: 'gunshot' });
    this.onFire({ weapon: st.def, origin, dir: baseDir, outcomes });

    if (st.mag === 0 && st.reserve > 0 && st.def.category !== 'shotgun') {
      // auto tactical prompt: schedule an automatic reload shortly for usability
      this.tryReload();
    }
  }

  private dryFire(): void {
    if (this.cooldown > 0) return;
    this.cooldown = 0.32;
    events.emit('weapon:reload', { weaponId: this.def.id, stage: 'dryfire' });
  }

  private melee(): void {
    this.cooldown = 60 / this.def.rpm;
    this.phase = 'melee';
    this.phaseT = 0;
    this.phaseDur = 0.32;
    const origin = this.player.eyePos();
    const dir = this.player.forward();
    const outcome = this.combat.shoot(origin, dir, this.def, 'player');
    events.emit('weapon:fired', { weaponId: 'knife', pos: [origin.x, origin.y, origin.z], loudness: 2 });
    this.onFire({ weapon: this.def, origin, dir, outcomes: [outcome] });
  }

  private throwUtility(): void {
    const st = this.active;
    if (st.mag <= 0) return;
    st.mag--;
    this.cooldown = 60 / st.def.rpm;
    this.phase = 'throw';
    this.phaseT = 0;
    this.phaseDur = 0.45;
    const origin = this.player.eyePos();
    const dir = this.player.forward();
    this.onThrow(st.def.category as 'flash' | 'smoke', origin, dir);
    events.emit('weapon:fired', { weaponId: st.def.id, pos: [origin.x, origin.y, origin.z], loudness: 4 });
    // if now empty, fall back to primary
    if (st.mag <= 0) {
      setTimeoutSlot(this, 1);
    }
  }

  /** time since last shot (viewmodel anim) */
  sinceFire(): number {
    return this.now - this.lastFireAt;
  }

  snapshot(): { id: WeaponId; name: string; mag: number; reserve: number; phase: WeaponPhase; aim: number } {
    const st = this.active;
    return { id: st.def.id, name: st.def.name, mag: st.mag, reserve: st.reserve, phase: this.phase, aim: Math.round(this.aimT * 100) / 100 };
  }
}

function setTimeoutSlot(rig: WeaponRig, slot: number): void {
  // deterministic "next step" switch (no real timers in sim code)
  rig.pendingSlot = slot;
  rig.phase = 'holster';
  rig.phaseT = 0;
  rig.phaseDur = 0.3;
}
