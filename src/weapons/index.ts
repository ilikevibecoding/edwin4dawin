import * as THREE from 'three';
import { GAMEPLAY } from '../core/Config';
import type {
  AudioSystem,
  CombatSystem,
  FXSystem,
  PhysicsSystem,
  PlayerSystem,
  ProcgenSystem,
  RenderSystem,
  UISystem,
  WeaponDefinition,
  WeaponSystem,
} from '../core/Contracts';
import type { GameEvents } from '../core/GameTypes';
import { COLLISION_GROUP } from '../core/GameTypes';
import { angleDelta, clamp, DEG2RAD, Rng, saturate, smoothstep } from '../core/MathUtils';
import { ORDER, type EngineContext, type System } from '../core/System';
import {
  createRecoilImpulse,
  FireClock,
  flashScale,
  impulseFor,
  pelletPattern,
  RecoilState,
  SpreadState,
  spreadDirection,
} from './Ballistics';
import {
  BoltCycleClip,
  ButtStrikeClip,
  DrawClip,
  GrenadeThrowClip,
  HolsterClip,
  InspectClip,
  KnifeSlashClip,
  MagReloadClip,
  PumpCycleClip,
  RevolverReloadClip,
  RocketReloadClip,
  ShellInsertClip,
  type Clip,
  type CueId,
} from './anim/Clips';
import { WeaponModelFactory } from './models';
import { buildGenericMagModel, buildGrenadeModel } from './models/Ordnance';
import { ProjectileManager } from './Projectiles';
import { ViewModel, type ViewInputs } from './ViewModel';
import {
  DEFAULT_LOADOUT,
  getWeaponDef,
  THROWABLES,
  WEAPONS,
  type ThrowableId,
} from './WeaponDefs';

export { WEAPONS, DEFAULT_LOADOUT, getWeaponDef, WEAPON_SOUND_IDS, THROWABLES } from './WeaponDefs';
export type { ThrowableDefinition, ThrowableId } from './WeaponDefs';

/**
 * The weapon system.
 *
 * Owns the arsenal, the ammunition, the viewmodel and everything that happens
 * between the trigger being pulled and the bullet being handed to combat. The
 * split inside the module is deliberate: `ViewModel` knows how the gun looks and
 * moves, `Ballistics` knows where the bullet goes, `Projectiles` knows what
 * happens to anything that leaves the gun and is not a bullet, and this file is
 * the state machine that decides which of those runs when.
 */

/** What the weapon is busy doing. Only one of these can run at a time. */
type Action = 'none' | 'draw' | 'holster' | 'reload' | 'cycle' | 'melee' | 'throw' | 'inspect';

interface AmmoState {
  mag: number;
  reserve: number;
}

const IDLE_INSPECT_DELAY = 13;
const INSPECT_DURATION = 2.9;
const THROW_DURATION = 0.92;
const MELEE_DURATION = 0.62;
const BUTT_DURATION = 0.72;
const MAX_COOK = 3.2;

export class WeaponSystemImpl implements WeaponSystem, System {
  readonly name = 'weapons' as const;
  readonly order = ORDER.WEAPONS;
  readonly dependencies = ['procgen'] as const;

  current: WeaponDefinition | null = null;
  isAiming = false;
  adsAmount = 0;
  isReloading = false;
  isFiring = false;
  currentSpread = 0.02;
  loadout: readonly string[] = DEFAULT_LOADOUT;

  private ctx!: EngineContext;
  private factory!: WeaponModelFactory;
  private readonly view = new ViewModel();
  private readonly projectiles = new ProjectileManager();
  private readonly rng = new Rng(0x1f2e3d4c);

  private readonly ammo = new Map<string, AmmoState>();
  private readonly fireModes = new Map<string, WeaponDefinition['fireMode']>();
  private slot = 0;
  private previousSlot = 1;
  private pendingWeapon: string | null = null;

  private action: Action = 'none';
  private readonly clock = new FireClock();
  private readonly spread = new SpreadState();
  private recoilState = new RecoilState(DEFAULT_LOADOUT[0]);
  private readonly impulse = createRecoilImpulse();

  private inputEnabled = true;
  private triggerHeld = false;
  private semiLatched = false;
  private burstRemaining = 0;
  private burstCooldown = 0;
  private shotsThisTrigger = 0;
  private pendingShellReloads = 0;
  private shellReloadTime = 0.6;
  private reloadWasEmpty = false;
  private breathHold = 0;
  private breathBudget = 4;

  private grenadeKind: ThrowableId = 'frag';
  private readonly grenadeStock: Record<ThrowableId, number> = { frag: 0, flash: 0, smoke: 0 };
  private cooking = false;
  private cookTime = 0;
  private throwQueued: ThrowableId | null = null;

  private lastYaw = 0;
  private lastPitch = 0;
  private lookYawDelta = 0;
  private lookPitchDelta = 0;

  private readonly clips = {
    draw: new DrawClip(),
    holster: new HolsterClip(),
    inspect: new InspectClip(),
    reload: new MagReloadClip(false),
    reloadEmpty: new MagReloadClip(true),
    shell: new ShellInsertClip(),
    revolver: new RevolverReloadClip(),
    rocket: new RocketReloadClip(),
    knife: new KnifeSlashClip(),
    butt: new ButtStrikeClip(),
    bolt: new BoltCycleClip(),
    pump: new PumpCycleClip(),
    throw: new GrenadeThrowClip(),
  };

  private readonly inputs: ViewInputs = {
    wantAds: false,
    sprint: 0,
    tacticalSprint: false,
    stance: 'stand',
    grounded: true,
    speed: 0,
    lookYawDelta: 0,
    lookPitchDelta: 0,
    firing: false,
    magFraction: 1,
    empty: false,
  };

  private readonly vMuzzle = new THREE.Vector3();
  private readonly vDir = new THREE.Vector3();
  private readonly vAim = new THREE.Vector3();
  private readonly vEye = new THREE.Vector3();
  private readonly vShot = new THREE.Vector3();
  private readonly vTmp = new THREE.Vector3();
  private readonly vTmp2 = new THREE.Vector3();
  private readonly qTmp = new THREE.Quaternion();
  private readonly pellets: THREE.Vector3[] = [];

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    const procgen = ctx.tryGet<ProcgenSystem>('procgen');
    this.factory = new WeaponModelFactory(procgen?.materials ?? null);

    this.view.init(ctx, this.factory);
    this.view.onCue = (id) => this.onCue(id);
    this.projectiles.init(ctx);

    for (const def of WEAPONS) {
      this.ammo.set(def.id, { mag: def.magSize, reserve: def.reserveAmmo });
      this.fireModes.set(def.id, def.fireMode);
    }
    for (const id of Object.keys(THROWABLES) as ThrowableId[]) {
      this.grenadeStock[id] = THROWABLES[id].count;
    }

    const player = ctx.tryGet<PlayerSystem>('player');
    this.lastYaw = player?.yaw ?? 0;
    this.lastPitch = player?.pitch ?? 0;

    // Deploy immediately so the viewmodel is on screen with no input at all.
    this.equipSlot(0, true);
  }

  dispose(): void {
    this.view.dispose();
    this.projectiles.dispose();
    this.factory.dispose();
  }

  // -------------------------------------------------------------------------
  // WeaponSystem surface
  // -------------------------------------------------------------------------

  get ammoInMag(): number {
    return this.current ? (this.ammo.get(this.current.id)?.mag ?? 0) : 0;
  }

  get reserveAmmo(): number {
    return this.current ? (this.ammo.get(this.current.id)?.reserve ?? 0) : 0;
  }

  /** Live fire mode, which the player may have toggled away from the default. */
  get fireMode(): WeaponDefinition['fireMode'] {
    const def = this.current;
    if (!def) return 'semi';
    return this.fireModes.get(def.id) ?? def.fireMode;
  }

  getMuzzlePosition(out: THREE.Vector3): THREE.Vector3 {
    const model = this.view.model;
    if (!model) return out.set(0, 0, 0);
    return this.view.anchorWorld(model.anchors.muzzle, out);
  }

  equip(weaponId: string): void {
    const index = this.loadout.indexOf(weaponId);
    if (index >= 0) {
      this.equipSlot(index, false);
      return;
    }
    // Not in the loadout: replace the current slot with it.
    if (!getWeaponDef(weaponId)) return;
    const next = this.loadout.slice();
    next[this.slot] = weaponId;
    this.loadout = next;
    this.equipSlot(this.slot, true);
  }

  giveAmmo(amount: number): void {
    const def = this.current;
    if (!def) return;
    const state = this.ammo.get(def.id);
    if (!state) return;
    state.reserve = Math.min(def.reserveAmmo * 2, state.reserve + Math.max(0, Math.round(amount)));
  }

  forceReload(): void {
    this.beginReload();
  }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
    if (enabled) return;
    this.triggerHeld = false;
    this.isFiring = false;
    this.burstRemaining = 0;
    this.cooking = false;
    this.inputs.wantAds = false;
  }

  /** Ammunition counts for the HUD, including the grenade pouch. */
  grenadeCount(kind: ThrowableId): number {
    return this.grenadeStock[kind];
  }

  get selectedGrenade(): ThrowableId {
    return this.grenadeKind;
  }

  /** Triangles the viewmodel is currently drawing, for the debug overlay. */
  get viewmodelTriangles(): number {
    return this.view.currentTriangles();
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------

  update(dt: number, ctx: EngineContext): void {
    const player = ctx.tryGet<PlayerSystem>('player');
    this.sampleLook(player);
    this.readInput(dt, ctx, player);

    const def = this.current;
    if (def) {
      this.updateAction(dt);
      this.updateFiring(dt, def, player);
      this.updateSpread(dt, def, player);
    }

    this.view.update(dt, this.inputs, def, this.isReloading);
    this.adsAmount = this.view.adsAmount;
    if (this.view.isAiming !== this.isAiming) {
      this.isAiming = this.view.isAiming;
      this.emit('weapon:adsChanged', { aiming: this.isAiming });
    }

    this.updateBreath(dt, def, player);
    this.projectiles.update(dt);
    this.updateIdle(dt);
    this.publish(ctx, def);
  }

  /**
   * Look delta for the inertia layer, taken by differencing the player's yaw and
   * pitch. The input's own mouse delta is consumed by the player controller, and
   * differencing the result means the weapon lags the camera that was actually
   * rendered rather than the raw input, which is what the eye compares it to.
   */
  private sampleLook(player: PlayerSystem | undefined): void {
    let yaw: number;
    let pitch: number;
    if (player) {
      yaw = player.yaw;
      pitch = player.pitch;
    } else {
      this.ctx.camera.getWorldQuaternion(this.qTmp);
      EULER.setFromQuaternion(this.qTmp, 'YXZ');
      yaw = EULER.y;
      pitch = EULER.x;
    }
    this.lookYawDelta = angleDelta(this.lastYaw, yaw);
    this.lookPitchDelta = angleDelta(this.lastPitch, pitch);
    this.lastYaw = yaw;
    this.lastPitch = pitch;
  }

  private readInput(dt: number, ctx: EngineContext, player: PlayerSystem | undefined): void {
    const input = ctx.input;
    const ui = ctx.tryGet<UISystem>('ui');
    const blocked = !this.inputEnabled || (ui?.isMenuOpen ?? false);
    const i = this.inputs;

    i.sprint = player?.sprintAmount ?? 0;
    i.tacticalSprint = player?.isTacticalSprinting ?? false;
    i.stance = player?.stance ?? 'stand';
    i.grounded = player?.grounded ?? true;
    i.speed = player?.speed ?? 0;
    i.lookYawDelta = this.lookYawDelta;
    i.lookPitchDelta = this.lookPitchDelta;
    i.magFraction = this.current && this.current.magSize > 0 ? this.ammoInMag / this.current.magSize : 1;
    i.empty = this.current !== null && this.current.magSize > 0 && this.ammoInMag <= 0;

    if (blocked) {
      i.wantAds = false;
      i.firing = false;
      this.triggerHeld = false;
      this.isFiring = false;
      return;
    }

    i.wantAds = input.isDown('aim');

    const pressed = input.wasPressed('fire');
    this.triggerHeld = input.isDown('fire');
    if (pressed) this.semiLatched = false;
    if (!this.triggerHeld) {
      this.semiLatched = false;
      this.shotsThisTrigger = 0;
    }

    if (input.wasPressed('reload')) this.beginReload();
    if (input.wasPressed('melee')) this.beginMelee();
    if (input.wasPressed('toggleFireMode')) this.cycleFireMode();
    if (input.wasPressed('weapon1')) this.equipSlot(0, false);
    if (input.wasPressed('weapon2')) this.equipSlot(1, false);
    if (input.wasPressed('switchWeapon')) this.equipSlot((this.slot + 1) % this.loadout.length, false);
    if (input.wasPressed('lastWeapon')) this.equipSlot(this.previousSlot, false);

    this.readThrowInput(dt, input);
  }

  private readThrowInput(dt: number, input: EngineContext['input']): void {
    const lethal = input.isDown('grenade');
    const tactical = input.isDown('tactical');
    if (input.wasPressed('grenade')) this.selectGrenade('frag');
    else if (input.wasPressed('tactical')) {
      this.selectGrenade(this.grenadeStock.flash > 0 ? 'flash' : 'smoke');
    }

    const def = THROWABLES[this.grenadeKind];
    const holding = lethal || tactical;
    const pressedThis = input.wasPressed('grenade') || input.wasPressed('tactical');

    if (pressedThis && this.grenadeStock[this.grenadeKind] > 0 && this.canAct()) {
      if (def.cookable) {
        this.cooking = true;
        this.cookTime = 0;
      } else {
        this.throwGrenade();
      }
    }

    if (!this.cooking) return;
    this.cookTime += dt;
    // Hold too long and it goes off in your hand; that is the deal with cooking.
    if (!holding || this.cookTime >= MAX_COOK) this.throwGrenade();
  }

  private selectGrenade(kind: ThrowableId): void {
    if (this.grenadeKind === kind) return;
    this.grenadeKind = kind;
    this.view.setGrenadeKind(kind);
  }

  // -------------------------------------------------------------------------
  // Firing
  // -------------------------------------------------------------------------

  private updateFiring(dt: number, def: WeaponDefinition, player: PlayerSystem | undefined): void {
    const mode = this.fireMode;
    this.clock.setRpm(def.rpm);
    this.burstCooldown = Math.max(0, this.burstCooldown - dt);
    this.recoilState.update(dt, def, this.isFiring);

    if (def.class === 'melee') {
      this.inputs.firing = false;
      this.isFiring = false;
      if (this.triggerHeld && !this.semiLatched && this.canAct()) {
        this.semiLatched = true;
        this.beginMelee();
      }
      return;
    }

    const blocking = this.action !== 'none' && this.action !== 'inspect';
    if (blocking) {
      this.clock.clear();
      this.isFiring = false;
      this.inputs.firing = false;
      if (this.action === 'inspect') return;
      return;
    }

    let wants = false;
    if (mode === 'auto') wants = this.triggerHeld;
    else if (mode === 'semi' || mode === 'bolt' || mode === 'pump') wants = this.triggerHeld && !this.semiLatched;
    else if (mode === 'burst') {
      if (this.triggerHeld && !this.semiLatched && this.burstCooldown <= 0 && this.burstRemaining === 0) {
        this.burstRemaining = def.burstCount ?? 3;
        this.semiLatched = true;
      }
      wants = this.burstRemaining > 0;
    }

    this.inputs.firing = wants && this.ammoInMag > 0;

    if (!wants) {
      this.isFiring = false;
      this.clock.advance(dt, 1);
      return;
    }

    if (this.ammoInMag <= 0) {
      this.isFiring = false;
      if (!this.semiLatched) {
        this.semiLatched = true;
        this.dryFire(def);
      }
      if (mode === 'auto' || mode === 'burst') {
        this.burstRemaining = 0;
        this.beginReload();
      }
      return;
    }

    this.clock.advance(dt, mode === 'auto' ? 4 : 1);
    let fired = 0;
    // Sub-frame accurate: a 1150 rpm weapon legitimately gets two shots in one
    // 60 Hz frame, and dropping them would make it slower than its stated rpm.
    while (this.clock.take() && this.ammoInMag > 0) {
      this.fireShot(def, player);
      fired++;
      if (mode === 'semi' || mode === 'bolt' || mode === 'pump') {
        this.semiLatched = true;
        break;
      }
      if (mode === 'burst') {
        this.burstRemaining--;
        if (this.burstRemaining <= 0) {
          this.burstCooldown = 0.24;
          break;
        }
      }
      if (fired >= 4) break;
    }
    this.isFiring = fired > 0;
    if (fired > 0) this.afterShot(def);
  }

  private fireShot(def: WeaponDefinition, player: PlayerSystem | undefined): void {
    const state = this.ammo.get(def.id);
    if (!state) return;
    state.mag--;
    this.shotsThisTrigger++;

    const model = this.view.model;
    const combat = this.ctx.tryGet<CombatSystem>('combat');
    const fx = this.ctx.tryGet<FXSystem>('fx');
    const render = this.ctx.tryGet<RenderSystem>('render');
    const audio = this.ctx.tryGet<AudioSystem>('audio');

    // Aim line: the crosshair, converged a long way out, is what the player is
    // pointing at. The muzzle is where the round leaves. Firing along the line
    // between them keeps tracers attached to the barrel and impacts under the
    // crosshair, which is the compromise every shooter of this kind makes.
    if (player) {
      player.getEyePosition(this.vEye);
      player.getLookDirection(this.vAim);
    } else {
      this.ctx.camera.getWorldPosition(this.vEye);
      this.ctx.camera.getWorldDirection(this.vAim);
    }
    if (model) this.view.anchorWorld(model.anchors.muzzle, this.vMuzzle, this.vDir);
    else {
      this.vMuzzle.copy(this.vEye);
      this.vDir.copy(this.vAim);
    }

    const physics = this.ctx.tryGet<PhysicsSystem>('physics');
    let origin = this.vMuzzle;
    if (physics && physics.ready && !physics.lineOfSight(this.vEye, this.vMuzzle, COLLISION_GROUP.STATIC)) {
      // Muzzle is buried in geometry: fall back to the eye so the shot is not
      // eaten by the wall the barrel has clipped into.
      origin = this.vEye;
    }
    this.vTmp.copy(this.vEye).addScaledVector(this.vAim, 400).sub(origin).normalize();

    const attacker = player?.entity ?? null;
    const spread = this.currentSpread;

    if (def.muzzleVelocity !== undefined) {
      this.launchRocket(def, origin, this.vTmp, attacker);
    } else if (def.pellets && def.pellets > 1) {
      pelletPattern(this.vTmp, spread, def.pellets, this.rng, this.pellets);
      for (let i = 0; i < this.pellets.length; i++) {
        combat?.fireBullet({
          origin,
          direction: this.pellets[i],
          damage: def.damage,
          falloffStart: def.falloffStart,
          falloffEnd: def.falloffEnd,
          minDamageScale: def.minDamageScale,
          penetrationPower: def.penetrationPower,
          attacker,
          weaponId: def.id,
          tracer: i === 0 && def.tracerEvery > 0,
          tracerColor: def.tracerColor,
          impulse: impulseFor(def) / def.pellets,
        });
      }
    } else {
      spreadDirection(this.vTmp, spread, this.rng, this.vShot);
      const tracer = def.tracerEvery > 0 && (def.magSize - state.mag) % def.tracerEvery === 0;
      combat?.fireBullet({
        origin,
        direction: this.vShot,
        damage: def.damage,
        falloffStart: def.falloffStart,
        falloffEnd: def.falloffEnd,
        minDamageScale: def.minDamageScale,
        penetrationPower: def.penetrationPower,
        attacker,
        weaponId: def.id,
        tracer,
        tracerColor: def.tracerColor,
        impulse: impulseFor(def),
      });
    }

    // First-person flash lives in the viewmodel scene, so it is authored in view
    // space; the world only sees the light it throws.
    if (model && fx) {
      this.view.anchorView(model.anchors.muzzle, this.vTmp2, this.qTmp);
      this.vTmp.set(0, 0, -1).applyQuaternion(this.qTmp);
      fx.muzzleFlash(this.vTmp2, this.vTmp, flashScale(def), def.suppressed, true);
    }
    if (render && !def.suppressed) {
      render.requestDynamicLight(
        this.vMuzzle,
        0xffd08a,
        18 + flashScale(def) * 26,
        3.4 + flashScale(def) * 2.6,
        0.055,
      );
    }
    audio?.gunshot(def.id, this.vMuzzle, def.suppressed, true);

    this.spread.addShot(def, this.adsAmount);
    this.recoilState.next(def, this.adsAmount, this.rng, this.impulse);
    this.view.fireRecoil(def, this.impulse.pitch, this.impulse.yaw, this.impulse.roll);
    player?.addCameraRecoil(this.impulse.pitch * DEG2RAD, this.impulse.yaw * DEG2RAD);
    if (def.kickback > 0.03) render?.addScreenShake(def.kickback * 5.5, 0.16, 24);

    this.emit('weapon:fire', {
      weaponId: def.id,
      muzzlePosition: this.vMuzzle.clone(),
      direction: this.vAim.clone(),
      ammoLeft: state.mag,
      suppressed: def.suppressed,
    });
    if (state.mag === 0) this.emit('weapon:empty', { weaponId: def.id });

    if (def.class !== 'launcher' && def.class !== 'shotgun') this.ejectCase(def);
  }

  /** Case ejection, in view space for the brass you see and world for listeners. */
  private ejectCase(def: WeaponDefinition): void {
    const model = this.view.model;
    if (!model) return;
    const fx = this.ctx.tryGet<FXSystem>('fx');
    this.view.anchorView(model.anchors.eject, this.vTmp2, this.qTmp);
    this.vTmp.set(0, 0, -1).applyQuaternion(this.qTmp).multiplyScalar(2.1 + this.rng.next() * 0.9);
    this.vTmp.y += 0.7;
    fx?.shellEject(this.vTmp2, this.vTmp, def.caliber, true);

    this.view.anchorWorld(model.anchors.eject, this.vTmp2, this.vTmp);
    this.vTmp.multiplyScalar(2.4);
    this.emit('weapon:shellEject', {
      position: this.vTmp2.clone(),
      velocity: this.vTmp.clone(),
      caliber: def.caliber,
    });
  }

  private launchRocket(
    def: WeaponDefinition,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    attacker: PlayerSystem['entity'] | null,
  ): void {
    const model = this.view.model;
    const source = model?.part('ordnance')?.children[0];
    const object = source ? (source.clone(true) as THREE.Object3D) : buildGenericMagModel(this.factory.paletteFor(def.id));
    object.position.set(0, 0, 0);
    object.quaternion.identity();
    // The loaded round is modelled pointing down -Z in weapon space; the
    // projectile is oriented from its own forward, so strip the mount rotation.
    object.rotation.set(0, 0, 0);
    this.projectiles.spawnRocket({
      object,
      position: origin.clone().addScaledVector(direction, 0.15),
      direction: direction.clone(),
      speed: def.muzzleVelocity ?? 60,
      damage: def.damage,
      radius: 5.6,
      owner: attacker,
    });
    this.ctx.tryGet<RenderSystem>('render')?.addScreenShake(0.9, 0.3, 18);
  }

  /** Post-shot bookkeeping: cycle the action, or work the bolt/pump. */
  private afterShot(def: WeaponDefinition): void {
    const mode = this.fireMode;
    const empty = this.ammoInMag <= 0;
    if (mode === 'bolt') {
      if (!empty) {
        this.startClip('cycle', this.clips.bolt, 60 / def.rpm);
        this.clock.hold(60 / def.rpm);
      }
      return;
    }
    if (mode === 'pump') {
      if (!empty) {
        this.startClip('cycle', this.clips.pump, 60 / def.rpm);
        this.clock.hold(60 / def.rpm);
      }
      return;
    }
    if (def.class === 'launcher') return;
    const channel = def.class === 'pistol' ? 'slide' : 'bolt';
    if (def.id === 'pistol_revolver') {
      this.view.parts.cylinder += Math.PI / 3;
      return;
    }
    this.view.cycleAction(Math.min(0.11, (60 / def.rpm) * 0.82), channel);
  }

  private dryFire(def: WeaponDefinition): void {
    this.ctx.tryGet<AudioSystem>('audio')?.play2D('weapon_dry_fire', { volume: 0.5 });
    this.emit('weapon:empty', { weaponId: def.id });
  }

  private cycleFireMode(): void {
    const def = this.current;
    if (!def) return;
    const options: WeaponDefinition['fireMode'][] =
      def.fireMode === 'auto'
        ? ['auto', 'burst', 'semi']
        : def.fireMode === 'burst'
          ? ['burst', 'semi', 'auto']
          : [def.fireMode];
    if (options.length < 2) return;
    const cur = this.fireMode;
    const next = options[(options.indexOf(cur) + 1) % options.length];
    this.fireModes.set(def.id, next);
    this.ctx.tryGet<AudioSystem>('audio')?.play2D('weapon_selector', { volume: 0.6 });
    this.ctx.tryGet<UISystem>('ui')?.notify(def.displayName, next.toUpperCase(), 'info');
    this.view.parts.safety = 0.4;
  }

  // -------------------------------------------------------------------------
  // Spread
  // -------------------------------------------------------------------------

  private updateSpread(dt: number, def: WeaponDefinition, player: PlayerSystem | undefined): void {
    const moveFactor = (player?.speed ?? 0) / GAMEPLAY.player.walkSpeed;
    const stance = player?.stance ?? 'stand';
    this.currentSpread = this.spread.update(
      dt,
      def,
      this.adsAmount,
      moveFactor,
      !(player?.grounded ?? true),
      stance === 'crouch' || stance === 'prone',
    );
  }

  /**
   * Held breath on a scoped rifle. Costs a budget that refills when the player
   * comes off the trigger, which is what stops it being free stability.
   */
  private updateBreath(dt: number, def: WeaponDefinition | null, player: PlayerSystem | undefined): void {
    const eligible =
      def !== null &&
      def.class === 'sniper' &&
      this.adsAmount > 0.85 &&
      (player?.speed ?? 0) < 0.4 &&
      this.breathBudget > 0.05;
    if (eligible) {
      this.breathBudget = Math.max(0, this.breathBudget - dt);
      this.breathHold = Math.min(1, this.breathHold + dt * 3.2);
    } else {
      this.breathHold = Math.max(0, this.breathHold - dt * 2.4);
      this.breathBudget = Math.min(4, this.breathBudget + dt * 0.7);
    }
    this.view.setBreathHold(this.breathHold);
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  private canAct(): boolean {
    return this.action === 'none' || this.action === 'inspect';
  }

  private startClip(action: Action, clip: Clip, duration: number): void {
    this.action = action;
    this.view.play(clip, duration);
  }

  private updateAction(dt: number): void {
    void dt;
    if (this.action === 'none') return;
    if (this.view.clipActive) return;

    const finished = this.action;
    this.action = 'none';

    switch (finished) {
      case 'holster':
        this.completeSwitch();
        break;
      case 'reload':
        this.completeReload();
        break;
      case 'draw':
        this.clock.prime();
        break;
      case 'cycle':
      case 'melee':
      case 'throw':
      case 'inspect':
      default:
        break;
    }
  }

  private beginReload(): void {
    const def = this.current;
    if (!def || def.magSize <= 0 || !this.canAct()) return;
    const state = this.ammo.get(def.id);
    if (!state || state.reserve <= 0 || state.mag >= def.magSize) return;

    this.burstRemaining = 0;
    this.reloadWasEmpty = state.mag <= 0;
    this.view.setClipEnv(this.reloadWasEmpty);
    this.isReloading = true;
    this.inputs.wantAds = false;

    if (def.class === 'shotgun') {
      const need = Math.min(def.magSize - state.mag, state.reserve);
      const total = this.reloadWasEmpty ? def.reloadEmptyTime : def.reloadTime * need;
      this.pendingShellReloads = need;
      this.shellReloadTime = total / Math.max(1, need);
      this.emit('weapon:reloadStart', { weaponId: def.id, tactical: !this.reloadWasEmpty, duration: total });
      this.startClip('reload', this.clips.shell, this.shellReloadTime);
      return;
    }

    const duration = this.reloadWasEmpty ? def.reloadEmptyTime : def.reloadTime;
    const clip =
      def.id === 'pistol_revolver'
        ? this.clips.revolver
        : def.class === 'launcher'
          ? this.clips.rocket
          : this.reloadWasEmpty
            ? this.clips.reloadEmpty
            : this.clips.reload;
    this.emit('weapon:reloadStart', { weaponId: def.id, tactical: !this.reloadWasEmpty, duration });
    this.startClip('reload', clip, duration);
  }

  private completeReload(): void {
    const def = this.current;
    if (!def) return;
    const state = this.ammo.get(def.id);
    if (!state) {
      this.isReloading = false;
      return;
    }

    if (def.class === 'shotgun') {
      this.pendingShellReloads--;
      if (this.pendingShellReloads > 0 && state.reserve > 0 && state.mag < def.magSize) {
        this.startClip('reload', this.clips.shell, this.shellReloadTime);
        return;
      }
      this.isReloading = false;
      this.emit('weapon:reloadEnd', { weaponId: def.id, ammo: state.mag });
      this.clock.prime();
      return;
    }

    const want = def.magSize - state.mag;
    const take = Math.min(want, state.reserve);
    state.mag += take;
    state.reserve -= take;
    this.isReloading = false;
    this.view.resetParts();
    this.clock.prime();
    this.emit('weapon:reloadEnd', { weaponId: def.id, ammo: state.mag });
  }

  private beginMelee(): void {
    const def = this.current;
    if (!def || !this.canAct()) return;
    const knife = def.class === 'melee';
    this.startClip('melee', knife ? this.clips.knife : this.clips.butt, knife ? MELEE_DURATION : BUTT_DURATION);
    this.inputs.wantAds = false;
  }

  private applyMeleeDamage(heavy: boolean): void {
    const player = this.ctx.tryGet<PlayerSystem>('player');
    const combat = this.ctx.tryGet<CombatSystem>('combat');
    const fx = this.ctx.tryGet<FXSystem>('fx');
    const def = this.current;
    if (!combat || !def) return;

    if (player) {
      player.getEyePosition(this.vEye);
      player.getLookDirection(this.vAim);
    } else {
      this.ctx.camera.getWorldPosition(this.vEye);
      this.ctx.camera.getWorldDirection(this.vAim);
    }
    const range = heavy ? 1.9 : 2.2;
    const hit = combat.raycastEntities(this.vEye, this.vAim, range, player?.entity ?? null);
    if (hit?.target) {
      combat.applyDamage(hit.target, {
        amount: heavy ? 60 : def.damage,
        source: player?.entity ?? null,
        point: hit.point.clone(),
        direction: this.vAim.clone(),
        bodyPart: hit.bodyPart ?? 'chest',
        type: 'melee',
        impulse: heavy ? 22 : 12,
        weaponId: def.id,
        distance: hit.distance,
      });
      fx?.bloodSpray(hit.point.clone(), this.vAim.clone(), heavy ? 0.7 : 1);
    } else {
      const physics = this.ctx.tryGet<PhysicsSystem>('physics');
      const world = physics?.raycast(this.vEye, this.vAim, { maxDistance: range });
      if (world) fx?.impact(world.point.clone(), world.normal.clone(), world.surface, heavy ? 0.5 : 0.3);
    }
    this.ctx
      .tryGet<AudioSystem>('audio')
      ?.play2D(heavy ? 'weapon_melee_butt' : 'weapon_knife_hit', { volume: 0.85 });
  }

  private throwGrenade(): void {
    this.cooking = false;
    const kind = this.grenadeKind;
    if (this.grenadeStock[kind] <= 0) return;
    if (!this.canAct() && this.action !== 'throw') return;
    this.throwQueued = kind;
    this.grenadeStock[kind]--;
    this.startClip('throw', this.clips.throw, THROW_DURATION);
    this.inputs.wantAds = false;
  }

  private releaseGrenade(): void {
    const kind = this.throwQueued;
    this.throwQueued = null;
    if (!kind) return;
    const def = THROWABLES[kind];
    const player = this.ctx.tryGet<PlayerSystem>('player');
    const model = this.view.model;

    if (model) this.view.anchorWorld(model.anchors.support, this.vTmp2);
    else if (player) player.getEyePosition(this.vTmp2);
    else this.ctx.camera.getWorldPosition(this.vTmp2);

    if (player) player.getLookDirection(this.vAim);
    else this.ctx.camera.getWorldDirection(this.vAim);

    // Elevate the throw so a flat aim still produces a usable arc.
    this.vTmp.copy(this.vAim);
    this.vTmp.y += def.throwPitch * (1 + saturate(-this.vAim.y));
    this.vTmp.normalize();

    const object = buildGrenadeModel(this.factory.paletteFor(this.current?.id ?? 'ar_mk4'), kind, true);
    this.projectiles.spawnGrenade({
      object,
      kind,
      position: this.vTmp2.clone().addScaledVector(this.vTmp, 0.22),
      direction: this.vTmp,
      speed: def.throwSpeed,
      cook: def.cookable ? this.cookTime : 0,
      owner: player?.entity ?? null,
      inheritVelocity: player?.velocity,
    });
    this.cookTime = 0;
    this.ctx.tryGet<AudioSystem>('audio')?.play2D('weapon_grenade_throw', { volume: 0.8 });
  }

  // -------------------------------------------------------------------------
  // Weapon switching
  // -------------------------------------------------------------------------

  private equipSlot(index: number, immediate: boolean): void {
    if (this.loadout.length === 0) return;
    const target = clamp(index, 0, this.loadout.length - 1);
    if (!immediate && target === this.slot) return;
    const def = getWeaponDef(this.loadout[target]);
    if (!def) return;

    this.pendingWeapon = this.loadout[target];
    if (immediate || !this.current) {
      this.completeSwitch();
      return;
    }
    if (!this.canAct() && this.action !== 'reload') return;
    this.isReloading = false;
    this.startClip('holster', this.clips.holster, this.current.holsterTime);
  }

  private completeSwitch(): void {
    const id = this.pendingWeapon;
    this.pendingWeapon = null;
    if (!id) return;
    const def = getWeaponDef(id);
    if (!def) return;

    const from = this.current?.id ?? null;
    const nextSlot = this.loadout.indexOf(id);
    if (nextSlot >= 0 && nextSlot !== this.slot) {
      this.previousSlot = this.slot;
      this.slot = nextSlot;
    }

    this.current = def;
    this.recoilState = new RecoilState(def.id);
    this.spread.reset();
    this.clock.setRpm(def.rpm);
    this.clock.clear();
    this.semiLatched = true;
    this.burstRemaining = 0;
    this.isReloading = false;
    this.isFiring = false;

    this.view.setWeapon(def);
    this.view.setBipod(false);
    this.startClip('draw', this.clips.draw, def.drawTime);
    this.ctx.tryGet<AudioSystem>('audio')?.play2D('weapon_draw', { volume: 0.7 });
    this.emit('weapon:switch', { from, to: def.id });
  }

  // -------------------------------------------------------------------------
  // Animation cues
  // -------------------------------------------------------------------------

  private onCue(id: CueId): void {
    const audio = this.ctx.tryGet<AudioSystem>('audio');
    const def = this.current;
    switch (id) {
      case 'magOut':
        audio?.play2D('weapon_mag_out', { volume: 0.7 });
        break;
      case 'magDrop':
        audio?.play2D('weapon_mag_out', { volume: 0.35, pitch: 0.9 });
        this.dropMagazine();
        break;
      case 'magIn':
        audio?.play2D('weapon_mag_in', { volume: 0.8 });
        break;
      case 'tap':
        audio?.play2D('weapon_mag_tap', { volume: 0.6 });
        break;
      case 'boltBack':
        audio?.play2D('weapon_bolt_back', { volume: 0.75 });
        break;
      case 'boltForward':
        audio?.play2D('weapon_bolt_forward', { volume: 0.85 });
        break;
      case 'pumpBack':
        audio?.play2D('weapon_pump_back', { volume: 0.85 });
        break;
      case 'pumpForward':
        audio?.play2D('weapon_pump_forward', { volume: 0.9 });
        break;
      case 'shellInsert':
        audio?.play2D('weapon_shell_insert', { volume: 0.8 });
        this.insertShell();
        break;
      case 'cylinderOpen':
        audio?.play2D('weapon_cylinder_open', { volume: 0.8 });
        break;
      case 'cylinderClose':
        audio?.play2D('weapon_cylinder_close', { volume: 0.85 });
        break;
      case 'rocketLoad':
        audio?.play2D('weapon_rocket_load', { volume: 0.85 });
        break;
      case 'eject':
        if (def) this.ejectCase(def);
        break;
      case 'inspect':
        audio?.play2D('weapon_inspect', { volume: 0.5 });
        break;
      case 'knifeSwing':
        audio?.play2D('weapon_knife_swing', { volume: 0.8 });
        break;
      case 'knifeHit':
        this.applyMeleeDamage(false);
        break;
      case 'buttStrike':
        this.applyMeleeDamage(true);
        break;
      case 'grenadePin':
        audio?.play2D('weapon_grenade_pin', { volume: 0.7 });
        break;
      case 'grenadeThrow':
        this.releaseGrenade();
        break;
      case 'selector':
        audio?.play2D('weapon_selector', { volume: 0.4 });
        break;
      default:
        break;
    }
  }

  /** The magazine that just left the gun, dropped as a real falling object. */
  private dropMagazine(): void {
    const model = this.view.model;
    const def = this.current;
    if (!model || !def) return;
    const source = model.part('magazine');
    const object =
      source && source.children.length > 0
        ? (source.clone(true) as THREE.Object3D)
        : buildGenericMagModel(this.factory.paletteFor(def.id));
    object.position.set(0, 0, 0);
    object.quaternion.identity();
    object.scale.setScalar(1);

    this.view.anchorWorld(model.anchors.magWell, this.vTmp2);
    const player = this.ctx.tryGet<PlayerSystem>('player');
    this.view.anchorWorld(model.anchors.magWell, this.vTmp2, this.vTmp);
    this.vTmp.multiplyScalar(0.4);
    this.vTmp.y -= 1.1;
    if (player) this.vTmp.addScaledVector(player.velocity, 0.9);
    this.ctx.camera.getWorldQuaternion(this.qTmp);
    this.projectiles.spawnDebris({
      object,
      position: this.vTmp2,
      velocity: this.vTmp,
      quaternion: this.qTmp,
      life: 9,
    });
  }

  private insertShell(): void {
    const def = this.current;
    if (!def) return;
    const state = this.ammo.get(def.id);
    if (!state || state.reserve <= 0 || state.mag >= def.magSize) return;
    state.mag++;
    state.reserve--;
  }

  // -------------------------------------------------------------------------
  // Idle and publishing
  // -------------------------------------------------------------------------

  private updateIdle(dt: number): void {
    const busy =
      this.action !== 'none' ||
      this.triggerHeld ||
      this.inputs.wantAds ||
      this.inputs.speed > 0.2 ||
      Math.abs(this.lookYawDelta) > 0.004 ||
      Math.abs(this.lookPitchDelta) > 0.004;
    const idle = this.view.tickIdle(dt, busy);
    if (idle > IDLE_INSPECT_DELAY && this.canAct() && this.current) {
      this.view.clearIdle();
      this.startClip('inspect', this.clips.inspect, INSPECT_DURATION);
    }

    // Bipod comes down when an LMG goes prone.
    if (this.current?.class === 'lmg') this.view.setBipod(this.inputs.stance === 'prone');
  }

  private publish(ctx: EngineContext, def: WeaponDefinition | null): void {
    const ui = ctx.tryGet<UISystem>('ui');
    ui?.setCrosshairSpread(this.currentSpread);
    const scope = def?.scope ?? 'none';
    const magnified = scope === 'acog' || scope === 'sniper' || scope === 'thermal';
    ui?.setScopeOverlay(scope, magnified ? this.adsAmount : 0);

    const render = ctx.tryGet<RenderSystem>('render');
    if (!render) return;
    if (def && magnified && this.adsAmount > 0.4) {
      render.setFocusDistance(this.focusDistance());
    } else if (this.adsAmount < 0.05) {
      render.setFocusDistance(null);
    }
  }

  /** Where the scope is looking, so depth of field can focus on it. */
  private focusDistance(): number {
    const player = this.ctx.tryGet<PlayerSystem>('player');
    const physics = this.ctx.tryGet<PhysicsSystem>('physics');
    if (!player || !physics || !physics.ready) return 70;
    player.getEyePosition(this.vEye);
    player.getLookDirection(this.vAim);
    const hit = physics.raycast(this.vEye, this.vAim, { maxDistance: 260 });
    return hit ? clamp(hit.distance, 2, 240) : 120;
  }

  private emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]): void {
    this.ctx.events.emit(type, payload);
  }

  /** Exposed so the HUD can draw a cook timer without reaching into internals. */
  get grenadeCook(): number {
    return this.cooking ? saturate(this.cookTime / MAX_COOK) : 0;
  }

  /** 0..1 remaining breath-hold budget, for the sniper HUD. */
  get breathRemaining(): number {
    return smoothstep(0, 4, this.breathBudget);
  }
}

const EULER = /* @__PURE__ */ new THREE.Euler();
