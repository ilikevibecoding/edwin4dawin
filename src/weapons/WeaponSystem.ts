import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import { WEAPONS, DEFAULT_LOADOUT, type WeaponDef } from './WeaponDefs';
import type { PlayerSystem } from '../player/Player';
import type { BallisticsSystem } from './Ballistics';

/** Structural view of the view model; avoids an import cycle for one call. */
interface MuzzleSource extends System {
  getMuzzleWorld(out: THREE.Vector3): THREE.Vector3;
}

export interface WeaponState {
  def: WeaponDef;
  mag: number;
  reserve: number;
  fireModeIndex: number;
  /** Shot index within the current trigger pull, drives the recoil pattern. */
  shotIndex: number;
  /** Accumulated bloom, milliradians. */
  spread: number;
  heat: number;
}

/**
 * Trigger logic, ammunition, recoil, and spread.
 *
 * Recoil is split into two independent budgets, which is the detail that makes
 * a shooter feel controllable rather than random:
 *
 *  - *view recoil* moves the camera and is partially recovered automatically,
 *    so a player who pulls down can hold a laser at range;
 *  - *spread* grows per shot and shrinks over time, so spraying is punished
 *    at distance without making the first shot unreliable.
 *
 * The horizontal component follows a fixed per-weapon pattern with only a
 * small random overlay, so the recoil is learnable.
 */
export class WeaponSystem implements System {
  readonly name = 'weapons';
  readonly order = 20;

  readonly slots: WeaponState[] = [];
  activeIndex = 0;
  lastIndex = 1;

  /** 0 = holstered, 1 = fully raised. */
  raise = 1;
  reloading = false;
  reloadTimer = 0;
  reloadDuration = 0;
  switching = false;
  switchTimer = 0;
  inspecting = false;

  private ctx!: EngineContext;
  private player!: PlayerSystem;
  private ballistics!: BallisticsSystem;

  private cooldown = 0;
  private burstRemaining = 0;
  private burstCooldown = 0;
  private triggerHeld = false;
  private triggerWasHeld = false;
  private pendingSwitch = -1;

  private readonly _muzzle = new THREE.Vector3();
  private readonly _dir = new THREE.Vector3();
  private readonly _tmp = new THREE.Vector3();

  private _ads = 0;
  private _adsInternal = false;
  private _adsHold = false;
  private _adsWasHeld = false;
  private readonly _adsWasAt = new THREE.Vector3(NaN, NaN, NaN);

  /** 0 = hip, 1 = fully aimed. */
  get adsProgress(): number {
    return this._ads;
  }

  /**
   * Writing this from outside the trigger loop pins the aim state rather than
   * setting it for a single frame.
   *
   * Anything that needs a sight picture without a held aim button — the
   * capture harness, a scripted beat, a tutorial prompt — otherwise sets the
   * value and watches the next tick decay it straight back to the hip, which
   * is exactly what was happening to the `ads` screenshot: it has been
   * photographing hip fire. The pin is released the moment the player touches
   * their own aim control or is teleported somewhere else, so it can neither
   * strand someone in a stuck stance nor leak from one scripted set-up into
   * whatever runs after it.
   */
  set adsProgress(v: number) {
    this._ads = THREE.MathUtils.clamp(v, 0, 1);
    if (!this._adsInternal) this._adsHold = this._ads > 0.5;
  }

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.player = ctx.get<PlayerSystem>('player')!;
    this.ballistics = ctx.get<BallisticsSystem>('ballistics')!;

    for (const id of DEFAULT_LOADOUT) {
      const def = WEAPONS[id];
      this.slots.push({
        def,
        mag: def.magSize,
        reserve: def.reserveAmmo,
        fireModeIndex: 0,
        shotIndex: 0,
        spread: def.spreadAds,
        heat: 0,
      });
    }
    this.emitAmmo();
  }

  get active(): WeaponState {
    return this.slots[this.activeIndex];
  }

  get def(): WeaponDef {
    return this.active.def;
  }

  get fireMode(): 'auto' | 'semi' | 'burst' {
    return this.def.fireModes[this.active.fireModeIndex];
  }

  /** Current cone half-angle in radians, including all modifiers. */
  get currentSpread(): number {
    const w = this.active;
    const d = w.def;
    const base = THREE.MathUtils.lerp(d.spreadHip, d.spreadAds, this.adsProgress);
    let mrad = base + w.spread;

    const speed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    const moveFactor = THREE.MathUtils.clamp(speed / 6.9, 0, 1);
    mrad *= 1 + moveFactor * (d.spreadMoveScale - 1);
    if (!this.player.grounded) mrad *= d.spreadJumpScale;
    if (this.player.stance === 'crouch') mrad *= 0.78;
    if (this.player.stance === 'prone') mrad *= 0.56;

    return (mrad / 1000) * 0.5;
  }

  update(dt: number, ctx: EngineContext): void {
    const input = ctx.input;
    const w = this.active;
    const d = w.def;

    if (!this.player.alive) {
      this.triggerHeld = false;
      return;
    }

    this.cooldown = Math.max(0, this.cooldown - dt);
    this.burstCooldown = Math.max(0, this.burstCooldown - dt);

    // ---- ADS ----
    // A teleport ends the pin. Nothing that survives being moved eight metres
    // sideways is transient state worth keeping, and without this the aim
    // pinned for one scripted set-up is still pinned for the next one.
    if (this._adsWasAt.distanceToSquared(this.player.position) > 1) this._adsHold = false;
    this._adsWasAt.copy(this.player.position);
    if (this.player.ads !== this._adsWasHeld) this._adsHold = false;
    this._adsWasHeld = this.player.ads;
    const wantAds =
      (this.player.ads || this._adsHold) && !this.reloading && !this.switching && this.raise > 0.75;
    const adsRate = 1 / Math.max(d.adsTime, 0.01);
    const prevAds = this._ads;
    this._adsInternal = true;
    this.adsProgress = this._ads + (wantAds ? adsRate : -adsRate * 1.35) * dt;
    this._adsInternal = false;
    if ((prevAds < 0.5) !== (this._ads < 0.5)) {
      Signals.emit('weapon:ads', { active: this._ads >= 0.5, weaponId: d.id });
    }

    // ADS narrows the FOV and opens the aperture, which is what sells the
    // "the world falls away and the target pops" feeling of aiming.
    const cam = ctx.camera;
    const targetFov = THREE.MathUtils.lerp(this.player['fovBase' as keyof PlayerSystem] as number ?? 80, d.adsFov, this.adsProgress);
    void targetFov;
    const pipeline = ctx.engine.pipeline;
    pipeline.dofEnabled = this.adsProgress > 0.15;
    pipeline.aperture = THREE.MathUtils.lerp(8, d.optic === 'sniper' || d.optic === 'acog' ? 1.8 : 2.8, this.adsProgress);
    pipeline.focalLength = THREE.MathUtils.lerp(0.035, 0.05 + d.opticMagnification * 0.012, this.adsProgress);
    void cam;

    // ---- raise / switch ----
    if (this.switching) {
      this.switchTimer -= dt;
      if (this.switchTimer <= 0) {
        if (this.pendingSwitch >= 0) {
          this.lastIndex = this.activeIndex;
          this.activeIndex = this.pendingSwitch;
          this.pendingSwitch = -1;
          this.switchTimer = this.def.drawTime;
          Signals.emit('weapon:switch', { fromId: null, toId: this.def.id });
          Signals.emit('audio:oneshot', { id: 'weapon_draw', volume: 0.7 });
          this.emitAmmo();
        } else {
          this.switching = false;
          this.raise = 1;
        }
      } else if (this.pendingSwitch >= 0) {
        this.raise = THREE.MathUtils.clamp(this.switchTimer / Math.max(this.def.holsterTime, 0.01), 0, 1);
      } else {
        this.raise = 1 - THREE.MathUtils.clamp(this.switchTimer / Math.max(this.def.drawTime, 0.01), 0, 1);
      }
    }

    // ---- reload ----
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this.finishReload();
    }

    // ---- input ----
    if (input.pressed('weapon1')) this.switchTo(0);
    if (input.pressed('weapon2')) this.switchTo(1);
    if (input.pressed('lastWeapon')) this.switchTo(this.lastIndex);
    if (input.pressed('reload')) this.startReload();
    if (input.pressed('fireMode')) this.cycleFireMode();

    this.triggerWasHeld = this.triggerHeld;
    this.triggerHeld = input.down('fire') && !this.player.sprinting && !this.player.sliding;

    if (this.burstRemaining > 0 && this.burstCooldown <= 0 && this.cooldown <= 0) {
      this.fire();
      this.burstRemaining--;
      if (this.burstRemaining === 0) this.burstCooldown = d.burstDelay;
    } else if (this.canFire()) {
      const mode = this.fireMode;
      if (mode === 'auto' && this.triggerHeld) this.fire();
      else if (mode === 'semi' && this.triggerHeld && !this.triggerWasHeld) this.fire();
      else if (mode === 'burst' && this.triggerHeld && !this.triggerWasHeld && this.burstCooldown <= 0) {
        this.burstRemaining = d.burstCount;
      }
    } else if (
      this.triggerHeld && !this.triggerWasHeld && w.mag === 0 && !this.reloading
    ) {
      Signals.emit('weapon:dryfire', { weaponId: d.id });
      Signals.emit('audio:oneshot', { id: 'dryfire', volume: 0.6 });
      this.startReload();
    }

    // ---- trigger release resets the recoil pattern ----
    if (!this.triggerHeld && this.triggerWasHeld) w.shotIndex = 0;

    // ---- spread and heat recovery ----
    w.spread = Math.max(0, w.spread - d.spreadRecovery * dt);
    w.heat = Math.max(0, w.heat - dt * 0.55);
  }

  private canFire(): boolean {
    return (
      this.cooldown <= 0 &&
      !this.reloading &&
      !this.switching &&
      this.raise > 0.85 &&
      this.active.mag > 0 &&
      this.player.alive &&
      this.burstRemaining === 0
    );
  }

  private fire(): void {
    const w = this.active;
    const d = w.def;
    if (w.mag <= 0) return;

    w.mag--;
    this.cooldown = 60 / d.rpm;
    w.heat = Math.min(1, w.heat + 0.08);

    const cam = this.ctx.camera;
    this._dir.set(0, 0, -1).applyQuaternion(cam.quaternion).normalize();

    // The muzzle is taken from the view model when one exists, because that is
    // the only source that knows where the barrel *currently* is: the weapon is
    // mid-recoil, mid-sway and mid-bob when the shot goes off, and it is drawn
    // with a narrower camera than the world, so a fixed offset in camera space
    // puts the flash and the tracer somewhere off the end of the visible
    // barrel. The static offset stays as the answer before the model exists.
    const vm = this.ctx.get<MuzzleSource>('viewmodel');
    if (vm) vm.getMuzzleWorld(this._muzzle);
    else this._muzzle.copy(d.muzzleOffset).applyQuaternion(cam.quaternion).add(cam.position);

    const spread = this.currentSpread;
    for (let i = 0; i < d.pellets; i++) {
      const dir = this._tmp.copy(this._dir);
      if (spread > 0) applyConeSpread(dir, spread);
      this.ballistics.fireProjectile({
        origin: this._muzzle,
        direction: dir,
        def: d,
        ownerId: this.player.actorId,
        isPlayer: true,
      });
    }

    // ---- recoil ----
    const r = d.recoil;
    const adsScale = THREE.MathUtils.lerp(1, r.adsScale, this.adsProgress);
    const stanceScale =
      this.player.stance === 'prone' ? 0.55 : this.player.stance === 'crouch' ? 0.8 : 1;
    const idx = w.shotIndex;
    const patternYaw = r.pattern[idx % r.pattern.length] ?? 0;
    // Recoil ramps up over the first several rounds instead of being constant,
    // which is what makes short bursts controllable and long sprays not.
    const ramp = 0.62 + Math.min(idx / 9, 1) * 0.38;

    const pitch = r.pitch * ramp * adsScale * stanceScale * (1 + (Math.random() - 0.5) * 0.18);
    const yaw = (r.yaw * patternYaw + (Math.random() - 0.5) * 2 * r.randomYaw) * adsScale * stanceScale;
    const roll = r.roll * (patternYaw >= 0 ? 1 : -1) * adsScale * stanceScale;

    this.player.addRecoil(pitch, yaw, roll);
    w.shotIndex++;
    w.spread = Math.min(w.spread + d.spreadPerShot, d.spreadHip * 1.6);

    Signals.emit('weapon:fire', {
      weaponId: d.id,
      muzzleWorld: this._muzzle.clone(),
      direction: this._dir.clone(),
      silenced: d.suppressed,
      ammoLeft: w.mag,
    });
    Signals.emit('camera:shake', {
      amplitude: r.pitch * 0.32 * (1 - this.adsProgress * 0.55),
      duration: 0.07,
      frequency: 42,
    });
    Signals.emit('weapon:casing', {
      position: this._muzzle.clone().addScaledVector(this._dir, -0.28),
      velocity: new THREE.Vector3(
        2.4 + Math.random() * 1.2, 1.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.6,
      ).applyQuaternion(cam.quaternion),
      caliber: d.id,
    });
    this.emitAmmo();
  }

  startReload(): void {
    const w = this.active;
    const d = w.def;
    if (this.reloading || this.switching) return;
    if (w.mag >= d.magSize || w.reserve <= 0) return;
    this.reloading = true;
    // Tactical reload keeps the chambered round and is meaningfully faster.
    const tactical = w.mag > 0;
    this.reloadDuration = tactical ? d.reloadTime : d.reloadEmptyTime;
    this.reloadTimer = this.reloadDuration;
    Signals.emit('weapon:reloadStart', { weaponId: d.id, tactical, duration: this.reloadDuration });
    Signals.emit('audio:oneshot', { id: tactical ? 'reload_tac' : 'reload_empty', volume: 0.8 });
  }

  private finishReload(): void {
    const w = this.active;
    const d = w.def;
    const chambered = w.mag > 0 ? 1 : 0;
    const want = d.magSize + chambered - w.mag;
    const take = Math.min(want, w.reserve);
    w.mag += take;
    w.reserve -= take;
    this.reloading = false;
    w.shotIndex = 0;
    Signals.emit('weapon:reloadEnd', { weaponId: d.id });
    this.emitAmmo();
  }

  switchTo(index: number): void {
    if (index === this.activeIndex || index < 0 || index >= this.slots.length) return;
    if (this.switching) return;
    this.reloading = false;
    this.switching = true;
    this.pendingSwitch = index;
    this.switchTimer = this.def.holsterTime;
    Signals.emit('audio:oneshot', { id: 'weapon_holster', volume: 0.55 });
  }

  cycleFireMode(): void {
    const w = this.active;
    if (w.def.fireModes.length < 2) return;
    w.fireModeIndex = (w.fireModeIndex + 1) % w.def.fireModes.length;
    Signals.emit('audio:oneshot', { id: 'firemode', volume: 0.5 });
    Signals.emit('ui:notify', {
      title: this.fireMode.toUpperCase(),
      tone: 'neutral',
    });
  }

  addAmmo(fraction: number): void {
    for (const w of this.slots) {
      w.reserve = Math.min(w.def.reserveAmmo, w.reserve + Math.ceil(w.def.reserveAmmo * fraction));
    }
    this.emitAmmo();
  }

  private emitAmmo(): void {
    const w = this.active;
    Signals.emit('weapon:ammoChanged', { weaponId: w.def.id, mag: w.mag, reserve: w.reserve });
  }
}

/**
 * Perturbs a direction within a cone.
 *
 * Uses an area-uniform disc sample rather than uniform angle, so shots
 * genuinely cluster toward the centre. Sampling the angle uniformly biases
 * hits toward the edge of the cone and makes weapons feel unreliable.
 */
export function applyConeSpread(dir: THREE.Vector3, halfAngle: number): void {
  if (halfAngle <= 0) return;
  const r = Math.sqrt(Math.random()) * Math.tan(halfAngle);
  const theta = Math.random() * Math.PI * 2;

  const up = Math.abs(dir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(dir, up).normalize();
  const realUp = new THREE.Vector3().crossVectors(right, dir).normalize();

  dir.addScaledVector(right, Math.cos(theta) * r);
  dir.addScaledVector(realUp, Math.sin(theta) * r);
  dir.normalize();
}
