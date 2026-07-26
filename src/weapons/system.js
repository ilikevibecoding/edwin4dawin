import * as THREE from 'three';
import { bus, EVT } from '../core/events.js';
import { settings } from '../core/settings.js';
import {
  WEAPON_DEFS, SLOT_ORDER, FIRE_MODE, resolveKey, scaleForDifficulty, recoilStep,
} from './defs.js';
import { buildWeaponModel } from '../characters/weapons-models.js';

// ---------------------------------------------------------------------------
// WeaponSystem.  (owner: opus2)
//
// Owns the inventory, the firing cadence, ammunition accounting, spread,
// recoil, aim-down-sights blending and the two throwable gadgets. Everything
// is driven from the fixed 1/120 s step, so `window.advanceTime(ms)` replays
// bit-identically.
//
// AMMUNITION MODEL (the thing that must never be wrong)
// ----------------------------------------------------
// `state.ammo` is the number of rounds IN THE WEAPON: magazine plus the one in
// the chamber. `state.reserve` is everything in the vest.
//   * firing            ammo -= 1, reserve untouched
//   * tactical reload    (ammo > 0) tops up to magSize + 1, because the round
//                        already in the chamber is kept
//   * empty reload       (ammo === 0) tops up to magSize only — the chamber is
//                        filled from the fresh magazine, not out of thin air
//   * either way         reserve -= (newAmmo - oldAmmo)
// Rounds are therefore conserved exactly: nothing is created or destroyed
// outside of `refillReserve()`.
//
// The CS-12 Breaker is tube fed, so it loads shell by shell: each insert moves
// exactly one round from reserve to weapon and the reload can be abandoned at
// any point with the already-inserted shells kept.
//
// EVENTS EMITTED (see also src/player/combat.js)
//   EVT.WEAPON_FIRE, EVT.WEAPON_DRY, EVT.WEAPON_RELOAD_START/END,
//   EVT.WEAPON_SWITCH, EVT.WEAPON_SHELL
//   'weapon:mode'            fire-mode toggled
//   'weapon:inspect'         inspect animation requested
//   'gadget:throw'           a flash / smoke left the hand
//   'gadget:bounce'          projectile hit geometry
//   'gadget:flash'           flash detonated  { position, radius, duration, blind[] }
//   'gadget:smoke'           smoke detonated  { position, radius, duration }
//   'world:noise'            AI-audible noise (also emitted per gunshot by
//                            CombatSystem — see the note there, Opus 3)
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180;
/** Converts a desired peak view-punch angle into the controller's spring impulse. */
const PUNCH_SPRING = 13.78; // sqrt(190), the stiffness used by PlayerController
/** Smallest cooldown a shot ever leaves behind, so cadence can't run away. */
const MIN_COOLDOWN = 1 / 240;

const GADGET_SLOTS = ['flash', 'smoke'];

// ------------------------------------------------------------- projectiles --

class Projectile {
  constructor(kind, def) {
    this.kind = kind;
    this.def = def;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.spin = new THREE.Vector3();
    this.rotation = new THREE.Euler();
    this.fuse = 0;
    this.age = 0;
    this.alive = false;
    this.bounces = 0;
    this.mesh = null;
  }

  launch(origin, velocity, fuse) {
    this.position.copy(origin);
    this.velocity.copy(velocity);
    this.fuse = fuse;
    this.age = 0;
    this.bounces = 0;
    this.alive = true;
    this.spin.set(9.4, 6.1, 4.7);
    this.rotation.set(0, 0, 0);
    if (this.mesh) {
      this.mesh.visible = true;
      this.mesh.position.copy(this.position);
    }
  }

  retire() {
    this.alive = false;
    if (this.mesh) this.mesh.visible = false;
  }
}

// ------------------------------------------------------------------ system --

export class WeaponSystem {
  constructor(game) {
    this.game = game;

    /** @type {Record<string, object>} live weapon state per slot name */
    this.slots = {};
    this.activeSlot = 'primary';
    this.previousSlot = 'secondary';
    this.difficulty = game?.difficulty || settings.get('difficulty');

    // Transition state machine: draw -> ready -> holster -> draw ...
    this.phase = 'ready';
    this.phaseTimer = 0;
    this.phaseDuration = 0;
    this.pendingSlot = null;

    // Firing / recoil / spread.
    this.cooldown = 0;
    this.time = 0;
    this.lastShotTime = -99;
    this.bloom = 0;               // degrees of accumulated firing spread
    this.recoilLedger = { pitch: 0, yaw: 0 }; // radians of aim we still owe back
    this.shotsThisTrigger = 0;
    this.triggerHeld = false;

    // ADS.
    this.adsFactor = 0;
    this.adsHeld = false;
    this.adsToggleState = false;
    this._fovApplied = false;

    // Scope sway (applied to the true aim, deterministic sine of sim time).
    this.swayApplied = { yaw: 0, pitch: 0 };

    // Reload.
    this.reloadState = null;

    // Gadget projectiles + flash blindness.
    /** @type {Projectile[]} */
    this.projectiles = [];
    this.pendingThrow = null;
    this.quickThrowReturnSlot = null;
    /** Player blindness from a flash: read by UI / PostFX via `blindFactor`. */
    this.playerBlind = { duration: 0, remaining: 0, deaf: 0 };
    /** Last flash detonation — `EnemyManager` may poll this instead of the bus. */
    this.lastFlash = null;
    this.projectileGroup = null;

    this.inspecting = 0;
    this.dryFireLock = 0;

    this.reset(game?.loadout);
  }

  // ------------------------------------------------------------------ setup --

  /** @param {{primary?:string, secondary?:string, gadget?:string}} loadout */
  reset(loadout = {}) {
    this.difficulty = this.game?.difficulty || settings.get('difficulty');
    const primaryKey = resolveKey(loadout.primary, 'carbine');
    const secondaryKey = resolveKey(loadout.secondary, 'pistol');
    const preferredGadget = resolveKey(loadout.gadget, 'flash');

    this.slots = {};
    this._makeSlot('primary', primaryKey);
    this._makeSlot('secondary', secondaryKey);
    this._makeSlot('melee', 'knife');
    this._makeSlot('flash', 'flash');
    this._makeSlot('smoke', 'smoke');

    // The chosen gadget is the one you get a spare of.
    for (const g of GADGET_SLOTS) {
      const s = this.slots[g];
      const base = s.def.count ?? 2;
      s.count = g === preferredGadget ? base : Math.max(1, base - 1);
      s.startCount = s.count;
    }

    this.activeSlot = this.slots.primary ? 'primary' : 'secondary';
    this.previousSlot = 'secondary';
    this.phase = 'draw';
    this.phaseDuration = this.current.def.drawTime;
    this.phaseTimer = this.phaseDuration;
    this.pendingSlot = null;

    this.cooldown = 0;
    this.time = 0;
    this.lastShotTime = -99;
    this.bloom = 0;
    this.recoilLedger.pitch = 0;
    this.recoilLedger.yaw = 0;
    this.shotsThisTrigger = 0;
    this.triggerHeld = false;
    this.adsFactor = 0;
    this.adsHeld = false;
    this.adsToggleState = false;
    this.reloadState = null;
    this.pendingThrow = null;
    this.quickThrowReturnSlot = null;
    this.playerBlind = { duration: 0, remaining: 0, deaf: 0 };
    this.lastFlash = null;
    this.inspecting = 0;
    this.dryFireLock = 0;
    this.swayApplied.yaw = 0;
    this.swayApplied.pitch = 0;
    for (const p of this.projectiles) p.retire();
    this._restoreFov();
    if (this.game?.player) this.game.player.moveScale = 1;
    return this;
  }

  _makeSlot(slotName, key) {
    const def = scaleForDifficulty(WEAPON_DEFS[key], this.difficulty);
    const state = {
      slot: slotName,
      slotIndex: SLOT_ORDER.indexOf(slotName) + 1,
      key,
      kind: key,                 // ViewModel resolves the art from this
      id: def.id,
      name: def.name,
      def,
      ammo: 0,
      reserve: 0,
      chambered: false,
      count: 0,
      startCount: 0,
      mode: def.fireModes[0],
      modeIndex: 0,
      cycling: 0,                // pump / bolt action timer
      shotsFired: 0,
    };
    if (def.isFirearm) {
      state.ammo = def.loadedMax;   // full magazine plus one chambered
      state.chambered = true;
      state.reserve = def.reserve;
    } else if (def.isGadget) {
      state.count = def.count ?? 2;
      state.startCount = state.count;
    }
    this.slots[slotName] = state;
    return state;
  }

  // --------------------------------------------------------------- getters --

  get current() {
    return this.slots[this.activeSlot] || this.slots.primary || this.slots.secondary;
  }

  get def() {
    return this.current?.def;
  }

  /** 0..1 aim-down-sights blend. Read by the player controller and viewmodel. */
  get adsFactor() {
    return this._ads || 0;
  }

  set adsFactor(v) {
    this._ads = v;
  }

  get isAiming() {
    return this.adsFactor > 0.5;
  }

  get reloading() {
    return !!this.reloadState;
  }

  get switching() {
    return this.phase !== 'ready';
  }

  /** Current spread cone half-angle in degrees. */
  get spreadDegrees() {
    const state = this.current;
    if (!state) return 0;
    const def = state.def;
    const sp = def.spread;
    if (!sp || (!def.isFirearm && !def.isMelee)) return 0;
    const player = this.game?.player;
    const speed = player ? Math.hypot(player.velocity.x, player.velocity.z) : 0;
    const grounded = player ? player.grounded : true;
    const crouched = player ? player.crouchBlend > 0.5 : false;
    const moveK = Math.min(1, speed / 3.35);

    let hip;
    if (!grounded) hip = sp.jumping;
    else {
      const base = crouched ? sp.crouched : sp.standing;
      hip = base + (sp.moving - base) * moveK;
    }
    // ADS tightens the cone hard, but moving while aimed still costs accuracy.
    const aimed = sp.ads * (1 + moveK * 1.6) + (grounded ? 0 : sp.jumping * 0.5);
    const t = this.adsFactor;
    const cone = hip + (aimed - hip) * t;
    const bloomScale = 1 - t * 0.35;
    return Math.max(0, cone + this.bloom * bloomScale);
  }

  get spreadRadians() {
    return this.spreadDegrees * DEG;
  }

  /** Player blind level 0..1 from the most recent flash. */
  get blindFactor() {
    const b = this.playerBlind;
    if (!b.duration || b.remaining <= 0) return 0;
    const k = b.remaining / b.duration;
    // Hold near-full for the first third, then fall off.
    return Math.min(1, k > 0.66 ? 1 : k / 0.66);
  }

  get canFire() {
    const state = this.current;
    if (!state) return false;
    if (this.phase !== 'ready') return false;
    if (this.cooldown > 0) return false;
    if (state.cycling > 0) return false;
    if (this.pendingThrow) return false;
    const def = state.def;
    if (def.isGadget) return state.count > 0;
    if (def.isMelee) return true;
    if (this.reloadState && !this.reloadState.perShell) return false;
    return state.ammo > 0;
  }

  get canReload() {
    const state = this.current;
    if (!state || !state.def.isFirearm) return false;
    if (this.phase !== 'ready' || this.reloadState) return false;
    if (state.cycling > 0) return false;
    return state.ammo < state.def.loadedMax && state.reserve > 0;
  }

  // ---------------------------------------------------------------- update --

  /**
   * Fixed-step update. `playing` gates input but NOT timers: draw/holster,
   * reload, projectile and recoil-recovery timers all keep their state so a
   * pause never corrupts them (they simply stop advancing).
   */
  update(dt, playing) {
    if (!this.current) return;
    this.time += dt;

    if (!playing) {
      // Freeze inputs but keep the ADS/FOV state coherent for the pause frame.
      this.triggerHeld = false;
      this._updateAds(dt, false);
      this._applyFov();
      return;
    }

    const input = this.game.input;
    this._firedThisStep = false;

    this.cooldown -= dt;
    this.dryFireLock = Math.max(0, this.dryFireLock - dt);
    if (this.inspecting > 0) this.inspecting = Math.max(0, this.inspecting - dt);

    this._updateSlotSelection(input);
    this._updatePhase(dt);
    this._updateAds(dt, playing);
    this._applyFov();
    this._updateReload(dt);
    this._updateCycling(dt);
    this._updateFireInput(input);
    this._updateRecoilRecovery(dt);
    this._updateSpreadRecovery(dt);
    this._updateSway(dt);
    this._updateThrow(dt);
    this._updateProjectiles(dt);
    this._updateBlind(dt);
    this._applyMoveScale();

    if (input.wasPressed('inspect') && this.phase === 'ready' && !this.reloadState) {
      this.inspect();
    }
    // AltLeft ("sprint", unused by the tactical controller) toggles fire mode.
    if (input.wasPressed('sprint')) this.cycleFireMode();

    // Only a shot may carry a negative cooldown forward; that remainder is what
    // makes sustained automatic fire hit the exact nominal rate instead of
    // quantising to the 1/120 s step. Idling resets it so the next trigger pull
    // can never produce two shots in consecutive steps.
    if (!this._firedThisStep && this.cooldown < 0) this.cooldown = 0;
  }

  // ------------------------------------------------------- slot management --

  _updateSlotSelection(input) {
    for (let i = 0; i < SLOT_ORDER.length; i++) {
      if (input.wasPressed(`slot${i + 1}`)) this.select(i + 1);
    }
    if (input.wasPressed('lastWeapon')) this.select(this.previousSlot);
    // Dedicated gadget keys quick-throw and return to the previous weapon.
    if (input.wasPressed('flash')) this.quickThrow('flash');
    if (input.wasPressed('smoke')) this.quickThrow('smoke');
  }

  /**
   * Equip a slot. Accepts a 1-5 index, a slot name, or a weapon key.
   * Starts the holster animation; the swap happens when it completes.
   */
  select(slot) {
    const name = this._slotName(slot);
    if (!name || !this.slots[name]) return false;
    const target = this.slots[name];
    if (target.def.isGadget && target.count <= 0) return false;
    const effective = this.pendingSlot || this.activeSlot;
    if (name === effective) return false;
    if (this.pendingThrow) return false;

    // A weapon switch always interrupts a reload — rounds already inserted by
    // a shell-by-shell reload are kept, an in-flight magazine swap is lost.
    this._cancelReload('switch');
    this.pendingSlot = name;
    this.phase = 'holster';
    this.phaseDuration = Math.max(0.01, this.current.def.holsterTime);
    this.phaseTimer = this.phaseDuration;
    this.cooldown = Math.max(this.cooldown, 0);
    return true;
  }

  _slotName(slot) {
    if (typeof slot === 'number') return SLOT_ORDER[slot - 1] || null;
    if (typeof slot !== 'string') return null;
    if (this.slots[slot]) return slot;
    const n = Number(slot);
    if (Number.isFinite(n)) return SLOT_ORDER[n - 1] || null;
    const key = resolveKey(slot, null);
    if (!key) return null;
    for (const name of SLOT_ORDER) {
      if (this.slots[name]?.key === key) return name;
    }
    return null;
  }

  _updatePhase(dt) {
    if (this.phase === 'ready') return;
    this.phaseTimer -= dt;
    if (this.phaseTimer > 0) return;
    if (this.phase === 'holster') {
      const from = this.activeSlot;
      this.previousSlot = from;
      this.activeSlot = this.pendingSlot || this.activeSlot;
      this.pendingSlot = null;
      this.phase = 'draw';
      this.phaseDuration = Math.max(0.01, this.current.def.drawTime);
      this.phaseTimer = this.phaseDuration;
      this.bloom = 0;
      this.shotsThisTrigger = 0;
      this.cooldown = 0;
      bus.emit(EVT.WEAPON_SWITCH, {
        from, to: this.activeSlot,
        weapon: this.current.key, id: this.current.id, name: this.current.name,
        slot: this.current.slotIndex, audioId: this.current.def.audio?.draw,
      });
    } else if (this.phase === 'draw') {
      this.phase = 'ready';
      this.phaseTimer = 0;
      // A gadget selected purely to throw it fires as soon as it is up.
      if (this.quickThrowReturnSlot && this.current.def.isGadget) this.fire();
    }
  }

  // ------------------------------------------------------------------- ADS --

  _updateAds(dt, playing) {
    const state = this.current;
    const def = state.def;
    let want = false;
    if (playing) {
      const input = this.game.input;
      if (def.isMelee || def.isGadget) {
        // The knife's secondary is a heavy attack and the gadgets use the
        // aim button for an underhand lob, so neither actually scopes in.
        want = false;
        this.adsHeld = input.isDown('aim');
      } else if (settings.get('toggleAds')) {
        if (input.wasPressed('aim')) this.adsToggleState = !this.adsToggleState;
        want = this.adsToggleState;
      } else {
        want = input.isDown('aim');
      }
      if (this.phase !== 'ready') want = false;
    }
    const time = Math.max(0.02, def.ads.time);
    const rate = dt / time;
    const target = want ? 1 : 0;
    const next = this.adsFactor + Math.sign(target - this.adsFactor) * rate;
    this.adsFactor = target > this.adsFactor ? Math.min(target, next) : Math.max(target, next);
  }

  _baseFov() {
    const base = settings.get('fov');
    const cam = this.game.camera;
    const ref = 16 / 9;
    if (!cam || !(cam.aspect < ref)) return base;
    const hFov = 2 * Math.atan(Math.tan((base * Math.PI) / 360) * ref);
    return (2 * Math.atan(Math.tan(hFov / 2) / cam.aspect) * 180) / Math.PI;
  }

  _applyFov() {
    const cam = this.game.camera;
    if (!cam) return;
    const def = this.current.def;
    const mul = def.ads?.fovMultiplier ?? 1;
    const base = this._baseFov();
    if (this.adsFactor <= 0.0001) {
      if (this._fovApplied) {
        cam.fov = base;
        cam.updateProjectionMatrix();
        this._fovApplied = false;
      }
      return;
    }
    const eased = this.adsFactor * this.adsFactor * (3 - 2 * this.adsFactor);
    const target = base * (1 + (mul - 1) * eased);
    if (Math.abs(cam.fov - target) > 0.01) {
      cam.fov = target;
      cam.updateProjectionMatrix();
    }
    this._fovApplied = true;
  }

  _restoreFov() {
    const cam = this.game?.camera;
    if (cam && this._fovApplied) {
      cam.fov = this._baseFov();
      cam.updateProjectionMatrix();
    }
    this._fovApplied = false;
  }

  _applyMoveScale() {
    const player = this.game.player;
    if (!player) return;
    const def = this.current.def;
    const hip = def.moveMultiplier ?? 1;
    const aimed = def.adsMoveMultiplier ?? hip;
    player.moveScale = hip + (aimed - hip) * this.adsFactor;
  }

  // ---------------------------------------------------------------- firing --

  _updateFireInput(input) {
    const state = this.current;
    const def = state.def;
    const held = input.isDown('attack');
    const pressed = input.wasPressed('attack');
    const wasHeld = this.triggerHeld;
    this.triggerHeld = held;

    if (!held && wasHeld) {
      // Trigger released: the recoil pattern restarts on the next pull.
      this.shotsThisTrigger = 0;
    }

    if (def.isMelee) {
      if (input.wasPressed('aim')) this.melee('heavy');
      else if (pressed) this.melee('light');
      return;
    }

    if (def.isGadget) {
      if (pressed) this.fire();
      return;
    }

    const auto = state.mode === FIRE_MODE.AUTO;
    const want = auto ? held : pressed;
    if (!want) return;

    if (state.ammo <= 0) {
      if (pressed || (auto && this.cooldown <= 0)) this._dryFire();
      return;
    }
    if (this.reloadState) {
      // A tube-fed reload can be abandoned to get a shot off immediately.
      if (this.reloadState.perShell && pressed) this._cancelReload('fire');
      else return;
    }
    if (this.phase !== 'ready' || state.cycling > 0) return;
    if (this.cooldown > 0) return;
    this._fireNow(state);
  }

  /** Public: fire one shot / throw one gadget if the weapon is able to. */
  fire() {
    const state = this.current;
    if (!state) return false;
    const def = state.def;
    if (def.isMelee) return this.melee('light');
    if (def.isGadget) {
      if (this.phase !== 'ready' || state.count <= 0 || this.pendingThrow) return false;
      return this._beginThrow(state);
    }
    if (this.reloadState?.perShell) this._cancelReload('fire');
    if (!this.canFire) {
      if (state.ammo <= 0 && this.phase === 'ready') this._dryFire();
      return false;
    }
    this._fireNow(state);
    return true;
  }

  _dryFire() {
    if (this.dryFireLock > 0) return;
    const state = this.current;
    this.dryFireLock = 0.28;
    bus.emit(EVT.WEAPON_DRY, {
      weapon: state.key, id: state.id, name: state.name,
      slot: state.slotIndex, reserve: state.reserve,
      audioId: state.def.audio?.dry || 'weapon_dry',
      position: this._eye().toArray(),
    });
    this.game.viewmodel?.dryFire?.();
  }

  _fireNow(state) {
    const def = state.def;
    const interval = Math.max(0.02, def.shotInterval);

    // The bullet leaves along the aim as it was BEFORE this shot's own kick,
    // and through the cone as it was before this shot's own bloom.
    const origin = this._eye();
    const dir = this._aimDirection();
    const shotSpread = this.spreadDegrees;
    state.shotSpreadDegrees = shotSpread;

    // --- ammunition -------------------------------------------------------
    state.ammo -= 1;
    state.shotsFired += 1;
    const manualAction = def.fireModes[0] === FIRE_MODE.PUMP || def.fireModes[0] === FIRE_MODE.BOLT;
    if (manualAction) {
      state.chambered = false;
      state.cycling = def.pumpTime || def.boltTime || 0.5;
    } else {
      state.chambered = state.ammo > 0;
    }

    // --- cadence ----------------------------------------------------------
    this.cooldown += interval;
    if (this.cooldown < MIN_COOLDOWN) this.cooldown = MIN_COOLDOWN;
    this._firedThisStep = true;

    // --- spread + recoil --------------------------------------------------
    const shotIndex = this.shotsThisTrigger;
    this.shotsThisTrigger += 1;
    this.bloom = Math.min(def.spread.max, this.bloom + def.spread.perShot);
    this._applyRecoil(def, shotIndex);
    this.lastShotTime = this.time;

    // --- notify everything else ------------------------------------------
    const payload = {
      weapon: state.key, id: state.id, name: state.name, family: def.family,
      slot: state.slotIndex, mode: state.mode,
      ammo: state.ammo, reserve: state.reserve,
      suppressed: def.suppressed, loudness: def.loudness,
      spreadDegrees: +shotSpread.toFixed(3),
      shotIndex, position: origin.toArray(), direction: dir.toArray(),
      audioId: def.suppressed && def.audio.fireSuppressed ? def.audio.fireSuppressed : def.audio.fire,
      tailId: def.audio.tail, def,
    };
    bus.emit(EVT.WEAPON_FIRE, payload);
    this.game.viewmodel?.onFire?.(def);
    if (!manualAction) this._emitShell(state, 'eject');

    // --- the actual bullets ----------------------------------------------
    this.game.combat?.traceShot?.(origin, dir, state);
    return true;
  }

  _emitShell(state, event) {
    bus.emit(EVT.WEAPON_SHELL, {
      weapon: state.key, family: state.def.family, event,
      audioId: state.def.audio?.shell,
      position: this._eye().toArray(),
    });
  }

  _applyRecoil(def, shotIndex) {
    const player = this.game.player;
    const step = recoilStep(def, shotIndex);
    const rc = def.recoil;
    const pitch = step.pitch * DEG;
    // Positive pattern yaw means the muzzle walks to the player's right, which
    // is a DECREASE in yaw (yaw increases turning left).
    const yaw = -step.yaw * DEG;
    if (!player) return;

    // Visual kick: `viewPunch*` values are peak degrees of camera bounce.
    const punchPitch = ((rc.viewPunchPitch || 0) * DEG) * PUNCH_SPRING;
    const punchYaw = ((rc.viewPunchYaw || 0) * DEG) * PUNCH_SPRING * Math.sign(step.yaw || 1);
    player.addViewPunch(-punchYaw, punchPitch);

    // True aim: recoil actually moves where the bullets go.
    const beforePitch = player.pitch;
    const beforeYaw = player.yaw;
    player.applyLook(yaw, pitch);
    const dPitch = player.pitch - beforePitch;
    const dYaw = wrapAngle(player.yaw - beforeYaw);
    const frac = rc.recoverFraction ?? 0.9;
    this.recoilLedger.pitch += dPitch * frac;
    this.recoilLedger.yaw += dYaw * frac;
  }

  _updateRecoilRecovery(dt) {
    const def = this.current.def;
    const rc = def.recoil;
    if (!rc || !rc.recovery) return;
    if (this.time - this.lastShotTime < (rc.recoverDelay || 0)) return;
    const ledger = this.recoilLedger;
    const mag = Math.hypot(ledger.pitch, ledger.yaw);
    if (mag < 1e-6) {
      ledger.pitch = 0;
      ledger.yaw = 0;
      return;
    }
    const player = this.game.player;
    if (!player) return;
    const move = Math.min(mag, rc.recovery * DEG * dt);
    const kPitch = (ledger.pitch / mag) * move;
    const kYaw = (ledger.yaw / mag) * move;
    const beforePitch = player.pitch;
    const beforeYaw = player.yaw;
    player.applyLook(-kYaw, -kPitch);
    // Fold back exactly what the controller accepted, so a clamped pitch can
    // never leave the ledger dragging the view down forever.
    ledger.pitch += player.pitch - beforePitch;
    ledger.yaw += wrapAngle(player.yaw - beforeYaw);
  }

  _updateSpreadRecovery(dt) {
    const def = this.current.def;
    const rec = def.spread?.recovery || 0;
    if (this.bloom <= 0 || !rec) return;
    // The delay is longer than the shot interval on purpose, so bloom actually
    // accumulates through a burst instead of being cancelled between rounds.
    if (this.time - this.lastShotTime < (def.spread.recoveryDelay ?? 0.12)) return;
    this.bloom = Math.max(0, this.bloom - rec * dt);
    if (this.bloom === 0 && !this.triggerHeld) this.shotsThisTrigger = 0;
  }

  _updateCycling(dt) {
    const state = this.current;
    if (state.cycling <= 0) return;
    state.cycling = Math.max(0, state.cycling - dt);
    if (state.cycling === 0) {
      state.chambered = state.ammo > 0;
      this._emitShell(state, 'eject');
    }
  }

  _updateSway(dt) {
    const def = this.current.def;
    const player = this.game.player;
    if (!player) return;
    const scope = def.scope;
    let targetYaw = 0;
    let targetPitch = 0;
    if (scope && this.adsFactor > 0.35) {
      const speed = Math.hypot(player.velocity.x, player.velocity.z);
      const steadiness = player.crouchBlend > 0.5 ? 0.45 : 1;
      const amp = scope.swayAmplitude * DEG * this.adsFactor * steadiness
        * (1 + Math.min(1.5, speed * 0.6));
      const t = this.time * scope.swayRate * Math.PI * 2;
      targetYaw = Math.sin(t) * amp;
      targetPitch = Math.sin(t * 1.37 + 0.9) * amp * 0.62;
    }
    const dYaw = targetYaw - this.swayApplied.yaw;
    const dPitch = targetPitch - this.swayApplied.pitch;
    if (Math.abs(dYaw) > 1e-7 || Math.abs(dPitch) > 1e-7) {
      player.applyLook(dYaw, dPitch);
      this.swayApplied.yaw = targetYaw;
      this.swayApplied.pitch = targetPitch;
    }
  }

  // ---------------------------------------------------------------- reload --

  reload() {
    if (!this.canReload) return false;
    const state = this.current;
    const def = state.def;
    const empty = state.ammo <= 0;
    const kind = empty ? 'empty' : 'tactical';

    if (def.reload.perShell) {
      const space = def.loadedMax - state.ammo;
      const shells = Math.min(space, state.reserve);
      if (shells <= 0) return false;
      this.reloadState = {
        slot: state.slot, kind, perShell: true,
        t: 0, shellsDone: 0, shells,
        start: def.reload.startTime, per: def.reload.shellTime, end: def.reload.endTime,
        duration: def.reload.startTime + shells * def.reload.shellTime + def.reload.endTime,
      };
    } else {
      // Tactical keeps the chambered round (magSize + 1); empty does not.
      const cap = empty ? def.magSize : def.loadedMax;
      const target = Math.min(cap, state.ammo + state.reserve);
      if (target <= state.ammo) return false;
      this.reloadState = {
        slot: state.slot, kind, perShell: false,
        t: 0,
        duration: empty ? def.reload.empty : def.reload.tactical,
        ammoAt: empty ? def.reload.emptyAmmoAt : def.reload.tacticalAmmoAt,
        target, applied: false,
      };
    }
    bus.emit(EVT.WEAPON_RELOAD_START, {
      weapon: state.key, id: state.id, name: state.name, family: def.family,
      kind, empty, ammo: state.ammo, reserve: state.reserve,
      duration: +this.reloadState.duration.toFixed(3),
      audioId: def.audio?.reloadStart,
      magOutId: def.audio?.magOut, magInId: def.audio?.magIn,
    });
    this.game.viewmodel?.onReload?.(kind);
    return true;
  }

  _updateReload(dt) {
    const input = this.game.input;
    if (input?.wasPressed('reload')) this.reload();
    const r = this.reloadState;
    if (!r) return;
    const state = this.slots[r.slot];
    if (!state) { this.reloadState = null; return; }
    const def = state.def;
    r.t += dt;

    if (r.perShell) {
      // Every shell moves exactly one round from reserve into the weapon.
      const wanted = Math.floor(Math.max(0, r.t - r.start) / r.per);
      while (r.shellsDone < Math.min(wanted, r.shells)) {
        if (state.reserve <= 0 || state.ammo >= def.loadedMax) { r.shells = r.shellsDone; break; }
        state.reserve -= 1;
        state.ammo += 1;
        state.chambered = true;
        r.shellsDone += 1;
        bus.emit(EVT.WEAPON_SHELL, {
          weapon: state.key, family: def.family, event: 'insert',
          audioId: def.audio?.magIn, ammo: state.ammo, reserve: state.reserve,
        });
      }
      r.duration = r.start + r.shells * r.per + r.end;
      if (r.t >= r.duration) this._finishReload(state, r);
      return;
    }

    if (!r.applied && r.t >= r.ammoAt) {
      const gained = r.target - state.ammo;
      state.ammo = r.target;
      state.reserve = Math.max(0, state.reserve - gained);
      state.chambered = state.ammo > 0;
      state.cycling = 0;
      r.applied = true;
    }
    if (r.t >= r.duration) this._finishReload(state, r);
  }

  _finishReload(state, r) {
    if (!r.applied && !r.perShell) {
      const gained = r.target - state.ammo;
      state.ammo = r.target;
      state.reserve = Math.max(0, state.reserve - gained);
      state.chambered = state.ammo > 0;
      r.applied = true;
    }
    this.reloadState = null;
    this.bloom = Math.min(this.bloom, state.def.spread.standing);
    this.shotsThisTrigger = 0;
    bus.emit(EVT.WEAPON_RELOAD_END, {
      weapon: state.key, id: state.id, name: state.name, kind: r.kind,
      ammo: state.ammo, reserve: state.reserve,
      audioId: state.def.audio?.reloadEnd,
    });
  }

  _cancelReload(reason) {
    const r = this.reloadState;
    if (!r) return;
    this.reloadState = null;
    const state = this.slots[r.slot];
    bus.emit(EVT.WEAPON_RELOAD_END, {
      weapon: state?.key, kind: r.kind, cancelled: true, reason,
      ammo: state?.ammo, reserve: state?.reserve,
    });
  }

  // ------------------------------------------------------------ fire modes --

  cycleFireMode() {
    const state = this.current;
    const def = state.def;
    if (!def.modeSwitchable || def.fireModes.length < 2) return false;
    state.modeIndex = (state.modeIndex + 1) % def.fireModes.length;
    state.mode = def.fireModes[state.modeIndex];
    this.shotsThisTrigger = 0;
    bus.emit('weapon:mode', {
      weapon: state.key, mode: state.mode, audioId: def.audio?.modeSwitch,
    });
    return true;
  }

  inspect() {
    if (this.phase !== 'ready' || this.reloadState) return false;
    this.inspecting = 2.4;
    this.game.viewmodel?.inspect?.();
    bus.emit('weapon:inspect', { weapon: this.current.key, audioId: this.current.def.audio?.inspect });
    return true;
  }

  // ----------------------------------------------------------------- melee --

  melee(attack = 'light') {
    const state = this.current;
    const def = state.def;
    if (!def.isMelee) return false;
    if (this.phase !== 'ready' || this.cooldown > 0) return false;
    const spec = def.attacks[attack] || def.attacks.light;
    this.cooldown = spec.interval;
    this.lastShotTime = this.time;
    const origin = this._eye();
    const dir = this._aimDirection();
    bus.emit(EVT.WEAPON_FIRE, {
      weapon: state.key, id: state.id, name: state.name, family: 'melee',
      slot: state.slotIndex, mode: attack, melee: true,
      suppressed: true, loudness: def.loudness,
      position: origin.toArray(), direction: dir.toArray(),
      audioId: spec.audioId, def,
    });
    this.game.viewmodel?.onFire?.(def);
    const player = this.game.player;
    player?.addViewPunch(0.02 * (attack === 'heavy' ? 2 : 1), 0.03);
    this.game.combat?.meleeAttack?.(origin, dir, state, attack);
    return true;
  }

  // --------------------------------------------------------------- gadgets --

  /** Equip a gadget, throw it, and swap back to the previous weapon. */
  quickThrow(which) {
    const slot = this.slots[which];
    if (!slot || slot.count <= 0) return false;
    if (this.activeSlot === which) return this.fire();
    // `previousSlot` only updates once the holster completes, which is too late
    // here, so remember the slot the player is on (or already switching to).
    const from = this.pendingSlot || this.activeSlot;
    if (!this.select(which)) return false;
    this.quickThrowReturnSlot = from === which ? 'primary' : from;
    return true;
  }

  _beginThrow(state) {
    const def = state.def;
    state.count -= 1;
    this.pendingThrow = {
      slot: state.slot,
      t: def.throw.windup,
      lob: this.game.input?.isDown('aim') || this.adsHeld,
    };
    bus.emit('gadget:throw', {
      weapon: state.key, id: state.id, name: state.name,
      remaining: state.count, audioId: def.audio?.throw,
      position: this._eye().toArray(),
    });
    this.game.viewmodel?.onFire?.(def);
    return true;
  }

  _updateThrow(dt) {
    const p = this.pendingThrow;
    if (!p) return;
    p.t -= dt;
    if (p.t > 0) return;
    this.pendingThrow = null;
    const state = this.slots[p.slot];
    if (state) this._launchProjectile(state, p.lob);
    // Out of gadgets, or thrown from a quick-throw: go back to shooting.
    const back = this.quickThrowReturnSlot;
    this.quickThrowReturnSlot = null;
    if (back && this.select(back)) return;
    // Either there was nothing to go back to, or the slot refused (an emptied
    // gadget). Either way, never leave the player holding a spent gadget.
    if (state && state.count <= 0) {
      const fallback = this.slots.primary?.def.isFirearm ? 'primary' : 'secondary';
      this.select(fallback);
    }
  }

  _launchProjectile(state, lob) {
    const def = state.def;
    const t = def.throw;
    const player = this.game.player;
    const origin = this._eye();
    const dir = this._aimDirection();
    // Start slightly ahead and to the right of the eye so the grenade never
    // spawns inside the player's own capsule.
    const right = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    origin.addScaledVector(dir, 0.42).addScaledVector(right, 0.14).add(new THREE.Vector3(0, -0.06, 0));

    const speed = lob ? t.lobSpeed : t.speed;
    const velocity = dir.clone();
    // Lift the throw line so the arc clears cover instead of nosing into it.
    const boost = Math.sin(t.pitchBoost * DEG);
    velocity.y += boost * (lob ? 1.4 : 1);
    velocity.normalize().multiplyScalar(speed);
    if (player) {
      velocity.x += player.velocity.x * 0.5;
      velocity.z += player.velocity.z * 0.5;
    }

    const proj = this._acquireProjectile(state.key, def);
    proj.launch(origin, velocity, def.fuse);
    return proj;
  }

  _acquireProjectile(kind, def) {
    let proj = this.projectiles.find((p) => !p.alive && p.kind === kind);
    if (!proj) {
      proj = new Projectile(kind, def);
      proj.mesh = this._buildProjectileMesh(kind);
      this.projectiles.push(proj);
    }
    proj.def = def;
    return proj;
  }

  _buildProjectileMesh(kind) {
    const scene = this.game.scene;
    if (!scene) return null;
    if (!this.projectileGroup) {
      this.projectileGroup = new THREE.Group();
      this.projectileGroup.name = 'gadget-projectiles';
      scene.add(this.projectileGroup);
    }
    let mesh = null;
    try {
      // Reuse Fable 4's grenade geometry so the thrown object matches the hand.
      mesh = buildWeaponModel(kind, { world: true });
    } catch {
      mesh = null;
    }
    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.5, metalness: 0.5 })
      );
    }
    mesh.visible = false;
    this.projectileGroup.add(mesh);
    return mesh;
  }

  _updateProjectiles(dt) {
    const collision = this.game.collision;
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      const t = p.def.throw;
      p.age += dt;
      p.fuse -= dt;
      p.velocity.y -= t.gravity * dt;

      let remaining = dt;
      let guard = 0;
      while (remaining > 1e-6 && guard++ < 4) {
        const stepLen = p.velocity.length() * remaining;
        if (stepLen < 1e-6) break;
        const dir = p.velocity.clone().divideScalar(p.velocity.length());
        const hit = collision?.raycast?.(p.position, dir, stepLen + t.radius, projectileFilter);
        if (hit?.hit && hit.distance <= stepLen + t.radius) {
          const travel = Math.max(0, hit.distance - t.radius);
          p.position.addScaledVector(dir, travel);
          p.position.addScaledVector(hit.normal, t.radius * 1.2);
          const vn = p.velocity.dot(hit.normal);
          if (vn < 0) {
            const tangent = p.velocity.clone().addScaledVector(hit.normal, -vn);
            p.velocity.copy(tangent.multiplyScalar(t.friction)).addScaledVector(hit.normal, -vn * t.restitution);
          }
          p.bounces += 1;
          if (p.bounces <= 6) {
            bus.emit('gadget:bounce', {
              weapon: p.kind, surface: hit.surface,
              position: p.position.toArray(), audioId: p.def.audio?.bounce,
              loudness: 0.16,
            });
          }
          const consumed = remaining * (stepLen > 0 ? travel / stepLen : 1);
          remaining = Math.max(0, remaining - consumed - 1e-6);
          if (p.velocity.lengthSq() < 0.04) { p.velocity.set(0, 0, 0); break; }
        } else {
          p.position.addScaledVector(dir, stepLen);
          remaining = 0;
        }
      }

      if (p.mesh) {
        p.mesh.position.copy(p.position);
        p.rotation.x += p.spin.x * dt;
        p.rotation.y += p.spin.y * dt;
        p.rotation.z += p.spin.z * dt;
        p.mesh.rotation.copy(p.rotation);
      }
      if (p.fuse <= 0) this._detonate(p);
      else if (p.age > 12) p.retire();
    }
  }

  _detonate(p) {
    const def = p.def;
    const pos = p.position.clone();
    p.retire();
    if (p.kind === 'flash') this._detonateFlash(pos, def);
    else this._detonateSmoke(pos, def);
  }

  _detonateFlash(pos, def) {
    const fx = this.game.effects;
    const e = def.effect;
    fx?.flashEffect?.(pos);

    const blinded = [];
    // --- the player -------------------------------------------------------
    const player = this.game.player;
    if (player) {
      const eye = player.eyePosition;
      const dur = this._blindDuration(pos, eye, player.forward, def);
      if (dur > 0) {
        this.playerBlind = {
          duration: Math.max(dur, this.playerBlind.remaining || 0),
          remaining: Math.max(dur, this.playerBlind.remaining || 0),
          deaf: Math.max(e.deafDuration * (dur / e.blindDuration), this.playerBlind.deaf || 0),
        };
        this.game.postfx?.pulse?.(0xffffff, 1, Math.min(1.4, dur * 0.4));
      }
    }
    // --- enemies ----------------------------------------------------------
    const list = this.game.enemies?.list;
    if (Array.isArray(list)) {
      for (const enemy of list) {
        if (!enemy || enemy.alive === false || enemy.dead) continue;
        const ePos = enemyEye(enemy);
        if (!ePos) continue;
        const facing = enemyForward(enemy);
        const dur = this._blindDuration(pos, ePos, facing, def)
          * (def.difficultyScalars?.flashBlindEnemy ?? 1);
        if (dur <= 0) continue;
        // EnemyManager may implement any of these; the plain fields are the
        // documented fallback so the AI can just read `enemy.blindUntil`.
        if (typeof enemy.blind === 'function') enemy.blind(dur, pos);
        else if (typeof enemy.applyFlash === 'function') enemy.applyFlash(dur, pos);
        enemy.blindDuration = dur;
        enemy.blindRemaining = Math.max(enemy.blindRemaining || 0, dur);
        enemy.blindUntil = (this.game.engine?.simTime || 0) + dur;
        blinded.push({ enemy, duration: +dur.toFixed(3) });
      }
    }

    this.lastFlash = {
      position: pos.toArray(), radius: e.radius,
      duration: e.blindDuration, time: this.game.engine?.simTime || this.time,
      blinded: blinded.length,
    };
    bus.emit('gadget:flash', {
      position: pos.toArray(), radius: e.radius, duration: e.blindDuration,
      blinded, audioId: def.audio?.detonate, loudness: def.loudness,
    });
    this.emitNoise(pos, def.loudness, def.noiseRadius, 'flashbang');
  }

  /**
   * Blind duration for an observer, from distance, facing and line of sight.
   * Public so `EnemyManager` can ask about a stored `lastFlash` if it prefers.
   */
  _blindDuration(flashPos, eyePos, forward, def) {
    const e = def.effect;
    const dist = flashPos.distanceTo(eyePos);
    if (dist > e.radius) return 0;
    if (e.requiresLineOfSight && this.game.collision?.lineOfSight) {
      if (!this.game.collision.lineOfSight(flashPos, eyePos)) return 0;
    }
    const near = 1 - Math.max(0, dist - e.coreRadius) / Math.max(0.01, e.radius - e.coreRadius);
    const distanceFactor = Math.max(0, Math.min(1, near));
    let facing = 1;
    if (forward) {
      const to = flashPos.clone().sub(eyePos);
      const len = to.length();
      if (len > 1e-4) {
        const dot = to.divideScalar(len).dot(forward);
        facing = e.facingFloor + (1 - e.facingFloor) * Math.max(0, dot);
      }
    }
    const dur = e.blindDuration * distanceFactor * facing;
    return dur < e.minBlindDuration ? (distanceFactor > 0.05 ? e.minBlindDuration : 0) : dur;
  }

  /** Blind seconds an observer at `eyePos` would take from the last flash. */
  blindDurationAt(eyePos, forward = null) {
    if (!this.lastFlash) return 0;
    const def = this.slots.flash?.def || WEAPON_DEFS.flash;
    const pos = new THREE.Vector3().fromArray(this.lastFlash.position);
    return this._blindDuration(pos, toVec3(eyePos), forward, def);
  }

  _detonateSmoke(pos, def) {
    const e = def.effect;
    // EffectsSystem registers the volume; `effects.blocksLineOfSight(a, b)` is
    // what the AI must use for sight checks (Opus 3).
    const volume = this.game.effects?.smokeVolume?.(pos, e.radius, e.duration);
    bus.emit('gadget:smoke', {
      position: pos.toArray(), radius: e.radius, duration: e.duration,
      volume, audioId: def.audio?.detonate, hissId: def.audio?.hiss,
      loudness: def.loudness,
    });
    this.emitNoise(pos, def.loudness, def.noiseRadius, 'smoke');
  }

  _updateBlind(dt) {
    const b = this.playerBlind;
    if (b.remaining > 0) b.remaining = Math.max(0, b.remaining - dt);
    if (b.deaf > 0) b.deaf = Math.max(0, b.deaf - dt);
    if (b.remaining === 0) b.duration = 0;
  }

  /**
   * Broadcast a noise the AI can hear.  EVENT NAME: 'world:noise'
   * Payload: { position:[x,y,z], loudness:0..1.5, radius:metres, kind, source }
   * (Opus 3: subscribe to this for perception; gunshots are emitted by
   * CombatSystem so they carry the shot's surface context.)
   */
  emitNoise(position, loudness, radius, kind, source = 'player') {
    bus.emit('world:noise', {
      position: toVec3(position).toArray(),
      loudness, radius, kind, source,
      time: this.game.engine?.simTime || this.time,
    });
  }

  // ------------------------------------------------------------------ ammo --

  /** Resupply: reserves and gadget counts back to their starting values. */
  refillReserve() {
    for (const name of SLOT_ORDER) {
      const s = this.slots[name];
      if (!s) continue;
      if (s.def.isFirearm) {
        s.reserve = Math.max(s.reserve, s.def.reserve);
        if (s.ammo <= 0) {
          const take = Math.min(s.def.magSize, s.reserve);
          s.ammo = take;
          s.reserve -= take;
          s.chambered = s.ammo > 0;
        }
      } else if (s.def.isGadget) {
        s.count = Math.max(s.count, s.startCount || s.def.count || 1);
      }
    }
    return true;
  }

  /** Add rounds to a slot's reserve (ammo pickups). Returns rounds accepted. */
  addAmmo(slotOrKey, rounds) {
    const name = this._slotName(slotOrKey);
    const s = name ? this.slots[name] : null;
    if (!s || !s.def.isFirearm) return 0;
    const room = Math.max(0, s.def.maxReserve - s.reserve);
    const take = Math.min(room, Math.max(0, Math.round(rounds)));
    s.reserve += take;
    return take;
  }

  /** Add a gadget (pickups). Returns true when it fitted. */
  addGadget(kind, count = 1) {
    const key = resolveKey(kind, 'flash');
    const s = this.slots[key];
    if (!s || !s.def.isGadget) return false;
    const max = s.def.maxCount ?? 3;
    if (s.count >= max) return false;
    s.count = Math.min(max, s.count + count);
    return true;
  }

  // ----------------------------------------------------------------- utils --

  _eye() {
    const player = this.game.player;
    if (player?.eyePosition) return player.eyePosition.clone();
    return this.game.camera ? this.game.camera.position.clone() : new THREE.Vector3();
  }

  /** True aim (yaw/pitch), which recoil has already moved. */
  _aimDirection() {
    const player = this.game.player;
    if (player?.forward) return player.forward.clone().normalize();
    const dir = new THREE.Vector3(0, 0, -1);
    if (this.game.camera) dir.applyQuaternion(this.game.camera.quaternion);
    return dir;
  }

  // ------------------------------------------------------------- text state --

  toJSON() {
    const state = this.current;
    const def = state.def;
    const reloadProgress = this.reloadState
      ? +Math.min(1, this.reloadState.t / Math.max(0.001, this.reloadState.duration)).toFixed(3)
      : 0;
    return {
      id: state.id,
      name: state.name,
      displayName: state.name,
      manufacturer: def.brand,
      key: state.key,
      slot: state.slot,
      slotIndex: state.slotIndex,
      family: def.family,
      fireMode: state.mode,
      fireModes: def.fireModes.slice(),
      modeSwitchable: !!def.modeSwitchable,
      roundsPerMinute: def.rpm,
      magazineAmmo: state.ammo,
      magazineSize: def.loadedMax,
      reserveAmmo: state.reserve,
      totalAmmo: state.ammo + state.reserve,
      chambered: !!state.chambered,
      cyclingAction: +state.cycling.toFixed(3),
      reloading: this.reloading,
      reloadKind: this.reloadState?.kind || null,
      reloadProgress,
      shellsLoaded: this.reloadState?.shellsDone ?? 0,
      ads: this.isAiming,
      adsFactor: +this.adsFactor.toFixed(3),
      adsFovMultiplier: def.ads.fovMultiplier,
      scopeMagnification: def.scope?.magnification ?? 1,
      spreadDegrees: +this.spreadDegrees.toFixed(3),
      bloomDegrees: +this.bloom.toFixed(3),
      recoilIndex: this.shotsThisTrigger,
      canFire: this.canFire,
      canReload: this.canReload,
      switching: this.switching,
      transition: this.phase,
      transitionProgress: this.phaseDuration > 0
        ? +Math.min(1, 1 - this.phaseTimer / this.phaseDuration).toFixed(3)
        : 1,
      suppressed: !!def.suppressed,
      damage: def.isMelee ? def.attacks.light.damage : def.damage,
      pellets: def.pellets,
      shotsFired: state.shotsFired,
      blindFactor: +this.blindFactor.toFixed(3),
      gadgets: {
        flash: this.slots.flash?.count ?? 0,
        smoke: this.slots.smoke?.count ?? 0,
      },
      projectilesInFlight: this.projectiles.filter((p) => p.alive).length,
      inventory: SLOT_ORDER.map((name) => {
        const s = this.slots[name];
        if (!s) return null;
        return {
          slot: s.slotIndex,
          slotName: name,
          key: s.key,
          id: s.id,
          name: s.name,
          family: s.def.family,
          equipped: name === this.activeSlot,
          ...(s.def.isFirearm
            ? { magazineAmmo: s.ammo, magazineSize: s.def.loadedMax, reserveAmmo: s.reserve, fireMode: s.mode }
            : {}),
          ...(s.def.isGadget ? { count: s.count } : {}),
        };
      }).filter(Boolean),
    };
  }
}

// ------------------------------------------------------------------ helpers --

function projectileFilter(c) {
  if (!c.enabled) return false;
  const tag = c.tag || '';
  // Grenades pass through people (they get knocked about, not stopped).
  return !tag.startsWith('character');
}

function wrapAngle(a) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function toVec3(v) {
  if (!v) return new THREE.Vector3();
  if (v.isVector3) return v.clone();
  if (Array.isArray(v)) return new THREE.Vector3(v[0], v[1], v[2]);
  return new THREE.Vector3(v.x || 0, v.y || 0, v.z || 0);
}

/** Best-effort eye position for an enemy record, whatever shape it has. */
function enemyEye(enemy) {
  const p = enemy.eyePosition || enemy.headPosition;
  if (p) return toVec3(p);
  const base = enemy.position || enemy.group?.position;
  if (!base) return null;
  const v = toVec3(base);
  v.y += enemy.eyeHeight ?? 1.6;
  return v;
}

function enemyForward(enemy) {
  if (enemy.forward) return toVec3(enemy.forward).normalize();
  const yaw = enemy.yaw ?? enemy.group?.rotation?.y;
  if (typeof yaw === 'number') return new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  return null;
}
