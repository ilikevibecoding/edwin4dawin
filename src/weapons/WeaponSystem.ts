import * as THREE from 'three';
import { Groups, Layers, type GameContext, type System } from '../core/GameContext';
import type { SurfaceKind } from '../core/Events';
import type { QualitySettings } from '../core/Quality';
import type {
  IAI,
  ILighting,
  IPhysics,
  IPlayer,
  IWeapons,
  WeaponStats,
} from '../core/Interfaces';
import { registerVantages } from '../core/Vantage';
import { Rng, clamp, damp, saturate } from '../core/MathUtils';
import {
  Ballistics,
  PenetrationRun,
  Spread,
  damageAtRange,
  defaultThickness,
  penetrationCost,
} from './Ballistics';
import { Grenades, type GrenadeKind } from './Grenades';
import { MuzzleFlash } from './MuzzleFlash';
import { makeOptic, type OpticKind } from './Optics';
import { WeaponRig } from './Rig';
import { Viewmodel } from './Viewmodel';
import { WEAPONS, weaponDef } from './models/Catalog';
import { RIG, type ModelVariant, type WeaponDef, type WeaponModel } from './WeaponModel';
import { WeaponShowcase } from './Showcase';

/**
 * The weapon system.
 *
 * It owns five weapons, each a code-built model plus its own animation rig, and
 * a single state machine that decides what the hands are allowed to do next.
 * Firing, reloading, cycling, swapping, meleeing and throwing are mutually
 * exclusive actions over one pair of hands, so they are one machine rather than
 * five flags, and every one of them is *observable* — the rig plays a sequence,
 * the sequence fires events, and the events are where ammunition moves and
 * physics bodies are spawned. Nothing changes state on a bare timer.
 *
 * Everything the frame loop touches is preallocated.
 */

type FireMode = WeaponStats['fireMode'];

interface Slot {
  def: WeaponDef;
  model: WeaponModel;
  rig: WeaponRig;
  mag: number;
  reserve: number;
  patternIndex: number;
  fireMode: FireMode;
  optic: OpticKind;
  suppressed: boolean;
  /** True once the chamber has been worked since the last shot. */
  chambered: boolean;
}

type Action = 'none' | 'reload' | 'cycle' | 'melee' | 'swap' | 'throw' | 'inspect';

/** Seconds off the trigger before the recoil pattern rewinds to its start. */
const PATTERN_RESET = 0.4;
/** Ring of the last view kicks, so a test can read the pattern back out. */
const KICK_LOG = 64;

const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q0 = new THREE.Quaternion();
const _fire = {
  weaponId: '',
  origin: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  ammoLeft: 0,
  suppressed: false,
};
const _flash = {
  position: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  scale: 1,
  parent: undefined as THREE.Object3D | undefined,
};
const _shell = {
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  caliber: 5.56,
};

export default class WeaponSystem implements System, IWeapons {
  readonly key = 'weapons';
  readonly order = 50;

  private ctx!: GameContext;
  private viewmodel!: Viewmodel;
  private ballistics!: Ballistics;
  private grenadeBag!: Grenades;
  private muzzle = new MuzzleFlash();
  private readonly spreadState = new Spread();
  /** Not readonly only so the test bridge can rewind it; never swapped in play. */
  private rng = new Rng(0x1234abcd);

  private slots: Slot[] = [];
  private index = 0;
  private nextIndex = 0;
  private action: Action = 'none';
  private visible = true;

  private fireTimer = 0;
  private triggerHeld = false;
  private triggerLatched = false;
  private burstLeft = 0;
  private burstGap = 0;
  private shotsThisTrigger = 0;
  private _ads = 0;
  private adsOverride = -1;
  private adsWanted = 0;
  private shellsToLoad = 0;
  private reloadCancel = false;
  private swapTimer = 0;
  private lastYaw = 0;
  private lastPitch = 0;
  private landImpact = 0;
  private patternRest = 0;
  private wasGrounded = true;
  private time = 0;
  private still = false;

  private readonly kickLog = new Float32Array(KICK_LOG * 2);
  private readonly shotLog = new Float64Array(KICK_LOG);
  private kickAt = 0;
  private scopeTarget: THREE.WebGLRenderTarget | null = null;
  private scopeSize = 0;
  private showcase: WeaponShowcase | null = null;
  private readonly onEvent = (name: string): void => this.handleSequenceEvent(name);
  private readonly ignore: THREE.Object3D[] = [];

  /* ============================== lifecycle ============================= */

  init(ctx: GameContext): void {
    this.ctx = ctx;
    this.viewmodel = new Viewmodel(ctx);
    this.ballistics = new Ballistics(ctx);
    this.grenadeBag = new Grenades(ctx, this.viewmodel);

    for (const def of WEAPONS) {
      this.slots.push(this.makeSlot(def, def.optics[0], false));
    }
    for (const slot of this.slots) this.viewmodel.root.add(slot.model.root);
    this.applyVisibility();
    this.slots[0].rig.raise = 1;
    this.slots[0].rig.raiseTarget = 1;
    this.viewmodel.root.add(this.muzzle.group);
    this.spreadState.reset(this.slots[0].def.stats);

    this.applyQuality(ctx.quality);
    this.registerShots();
    this.bridge();

    if (new URLSearchParams(location.search).get('showcase') === 'weapons') {
      this.showcase = new WeaponShowcase(ctx, {
        parent: this.viewmodel.root,
        materials: this.viewmodel,
        makeOptic: (kind, baseY) => makeOptic(kind, ctx.quality, this.viewmodel, baseY),
        onActiveChange: (active) => {
          this.lineupActive = active;
          if (active) this.adsOverride = 0;
          this.applyVisibility();
        },
        posePreset: (id, ads, still) => this.poseFor(id, ads, still),
        poseReload: (id, t) => this.poseReload(id, t),
      });
      this.showcase.setActive(true);
    }

    ctx.register('weapons', this);
    ctx.events.emit('weapon:ammo', { mag: this.mag, reserve: this.reserve });
    const p = ctx.tryGet<IPlayer>('player');
    p?.setAdsTime?.(this.stats.adsTime);
  }

  private makeSlot(def: WeaponDef, optic: OpticKind, suppressor: boolean): Slot {
    const variant: ModelVariant = { optic, suppressor };
    const model = def.build(
      {
        quality: this.ctx.quality,
        materials: this.viewmodel,
        makeOptic: (kind, baseY) => makeOptic(kind, this.ctx.quality, this.viewmodel, baseY),
      },
      variant,
    );
    model.root.visible = false;
    const rig = new WeaponRig(model, this.slots.length + 1);
    return {
      def,
      model,
      rig,
      mag: def.stats.magSize,
      reserve: def.stats.reserveAmmo,
      patternIndex: 0,
      fireMode: def.stats.fireMode,
      optic,
      suppressed: suppressor,
      chambered: true,
    };
  }

  private get slot(): Slot {
    return this.slots[this.index];
  }

  get stats(): WeaponStats {
    return this.slot.def.stats;
  }

  /* =============================== frame =============================== */

  update(dt: number, ctx: GameContext): void {
    this.time += dt;
    const slot = this.slot;
    const stats = slot.def.stats;
    const player = ctx.tryGet<IPlayer>('player');
    const enabled = (player as unknown as { enabled?: boolean } | undefined)?.enabled !== false;

    this.readInput(dt, ctx, player, enabled);
    this.updateAds(dt, stats, player, enabled);
    this.updateFiring(dt, ctx, slot, stats, player);
    this.updateSwap(dt);

    this.spreadState.update(dt, stats, {
      ads: this._ads,
      speed: player?.speedFactor ?? 0,
      crouch: player?.stance === 'crouch' || player?.stance === 'prone' ? 1 : 0,
      grounded: player?.grounded ?? true,
      reloading: this.action === 'reload',
    });

    this.ballistics.update(dt);
    this.grenadeBag.update(dt);
    this.muzzle.update(dt);
    this.updateRig(dt, ctx, slot, player);
    this.showcase?.update(dt);
  }

  lateUpdate(_dt: number, ctx: GameContext): void {
    this.viewmodel.sync(ctx);
    const slot = this.slot;
    // The lineup lays itself out in metres for a fixed frame, so while it is up
    // the field of view is its business rather than the held weapon's.
    ctx.viewmodelCamera.fov = this.lineupActive
      ? (this.showcase?.fov ?? slot.rig.vmFov)
      : slot.rig.vmFov;
    ctx.viewmodelCamera.updateProjectionMatrix();

    const optic = slot.model.optic;
    if (optic && this.visible) {
      optic.setEnvLevel(this.viewmodel.keyLevel);
      optic.update(ctx.viewmodelCamera.position, this._ads, this.time);
      if (optic.wantsRender && optic.scopeCamera && this.scopeTarget) {
        this.renderScope(ctx, optic.scopeCamera);
      } else if (!optic.wantsRender) {
        optic.setScopeTexture(null);
      }
    }
    this.showcase?.lateUpdate(this.viewmodel.keyLevel);
  }

  /* ============================== input ================================= */

  private readInput(dt: number, ctx: GameContext, player: IPlayer | undefined, enabled: boolean): void {
    const input = ctx.input;
    if (!enabled || !input.enabled) {
      this.triggerHeld = this.holdFireOverride;
      return;
    }
    const firing = input.isDown('fire') || input.stick.triggerR > 0.5;
    if (!firing) this.triggerLatched = false;
    this.triggerHeld = firing;
    this.adsWanted = input.isDown('ads') || input.stick.triggerL > 0.5 ? 1 : 0;

    if (input.wasPressed('reload')) this.reload();
    if (input.wasPressed('melee')) this.melee();
    if (input.wasPressed('tactical')) this.cycleFireMode();
    if (input.wasPressed('grenade')) this.cookGrenade('frag');
    if (input.wasReleased('grenade')) this.throwGrenade();
    if (input.wasPressed('weapon1')) this.switchTo(this.slots[0].def.stats.id);
    if (input.wasPressed('weapon2')) this.switchTo(this.slots[1 % this.slots.length].def.stats.id);
    if (input.wasPressed('weapon3')) this.switchTo(this.slots[4 % this.slots.length].def.stats.id);
    const wheel = input.consumeWheel();
    if (wheel !== 0) {
      const n = this.slots.length;
      const next = (this.index + (wheel > 0 ? 1 : n - 1)) % n;
      this.switchTo(this.slots[next].def.stats.id);
    }

    // Breath hold steadies a scoped shot; the player owns the reserve.
    if (player?.holdBreath && this.stats.scope === 'sniper') {
      player.holdBreath(this._ads > 0.85 && input.isDown('sprint'));
    }
    void dt;
  }

  /** Set by the headless bridge so tests can hold the trigger down. */
  private holdFireOverride = false;

  private updateAds(
    dt: number,
    stats: WeaponStats,
    player: IPlayer | undefined,
    enabled: boolean,
  ): void {
    const blocked = this.action === 'reload' || this.action === 'swap' || this.action === 'melee';
    if (this.adsOverride >= 0) {
      this._ads = this.adsOverride;
    } else if (player && enabled) {
      this._ads = blocked ? Math.min(player.adsFactor, this._ads) : player.adsFactor;
    } else {
      this._ads = damp(this._ads, blocked ? 0 : this.adsWanted, 3 / Math.max(0.05, stats.adsTime), dt);
    }
    // Cooperate on the world field of view rather than writing the camera.
    const want = this._ads > 0.02;
    if (want !== this.fovHeld || (want && this.fovWeapon !== stats.id)) {
      this.fovHeld = want;
      this.fovWeapon = stats.id;
      if (player?.requestFov) {
        player.requestFov(want ? stats.adsFov : (player.fov ?? 0) || 0, stats.adsTime);
      }
      if (!player?.requestFov && want) {
        this.ctx.events.emit('camera:fov', { fov: stats.adsFov, duration: stats.adsTime });
      }
      this.ctx.events.emit('weapon:ads', want);
    }
  }

  private fovHeld = false;
  private fovWeapon = '';

  /* ============================== firing ================================ */

  private updateFiring(
    dt: number,
    ctx: GameContext,
    slot: Slot,
    stats: WeaponStats,
    player: IPlayer | undefined,
  ): void {
    this.fireTimer -= dt;
    if (this.burstGap > 0) this.burstGap -= dt;

    const busy = this.action !== 'none' && this.action !== 'cycle';
    const canFire =
      this.visible &&
      !busy &&
      (player?.canFire ?? true) &&
      (player?.sprintOutRemaining ?? 0) <= 0 &&
      slot.rig.raise > 0.72;

    // A burst keeps going once it has started, even if the trigger is released.
    if (this.burstLeft > 0 && this.fireTimer <= 0 && canFire) {
      if (slot.mag > 0) {
        this.shoot(ctx, slot, stats, player);
        this.burstLeft--;
        if (this.burstLeft === 0) this.burstGap = stats.burstDelay ?? 0.18;
      } else {
        this.burstLeft = 0;
        this.dryFire(slot);
      }
      return;
    }

    if (!this.triggerHeld || !canFire) {
      if (!this.triggerHeld) {
        this.shotsThisTrigger = 0;
        /* The spray pattern only rewinds once the shooter has actually come off
           the trigger long enough for the muzzle to settle. Tapping does not
           reset it, which is what stops burst-tapping from dodging recoil. */
        this.patternRest += dt;
        if (this.patternRest > PATTERN_RESET) slot.patternIndex = 0;
      }
      return;
    }
    this.patternRest = 0;

    const mode = slot.fireMode;
    const semi = mode === 'semi' || mode === 'bolt' || mode === 'pump';
    if (semi && this.triggerLatched) return;
    if (mode === 'burst' && (this.triggerLatched || this.burstGap > 0)) return;
    if (this.fireTimer > 0) return;
    if (!slot.chambered) return;

    if (slot.mag <= 0) {
      this.triggerLatched = true;
      this.dryFire(slot);
      return;
    }

    this.triggerLatched = true;
    if (mode === 'burst') {
      this.burstLeft = Math.max(1, stats.burstCount ?? 3);
      return;
    }
    this.shoot(ctx, slot, stats, player);
  }

  private dryFire(slot: Slot): void {
    this.fireTimer = 0.28;
    this.ctx.events.emit('weapon:dryfire', { weaponId: slot.def.stats.id });
    this.ctx.events.emit('audio:play', { id: 'weapon_dryfire', volume: 0.6 });
    if (slot.reserve > 0) this.reload();
  }

  private shoot(
    ctx: GameContext,
    slot: Slot,
    stats: WeaponStats,
    player: IPlayer | undefined,
  ): void {
    const mode = slot.fireMode;
    const rpm = mode === 'burst' && this.burstLeft > 0 ? (stats.burstRpm ?? stats.rpm) : stats.rpm;
    const period = 60 / Math.max(1, rpm);
    /* Carry the overshoot rather than restarting the clock, so the average
       cyclic rate is the weapon's rpm instead of the frame rate rounded up to
       it — at 780 rpm on a 240 Hz step that is the difference between 780 and
       758. Clamped to one period so a pause cannot bank a free round. */
    this.fireTimer = Math.max(this.fireTimer, -period) + period;
    slot.mag--;
    this.shotsThisTrigger++;

    // Where the round goes: from the eye, along the view, inside the cone.
    const camera = ctx.camera;
    _v0.copy(camera.position);
    _v1.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const muzzleWorld = _v2.copy(slot.model.muzzle);
    slot.model.root.updateWorldMatrix(true, false);
    muzzleWorld.applyMatrix4(slot.model.root.matrixWorld);

    this.ballistics.fire({
      stats,
      origin: _v0,
      direction: _v1,
      muzzle: muzzleWorld,
      spread: this.spreadState.value,
      ignore: this.ignore,
      weaponName: stats.name,
    });
    this.spreadState.onShot(stats, this._ads);

    /* Recoil: the deterministic pattern first, a small random part second, so a
       spray is learnable but never mechanical. */
    const pattern = slot.def.pattern;
    const p = pattern[Math.min(slot.patternIndex, pattern.length - 1)];
    slot.patternIndex++;
    const adsScale = 1 - this._ads * 0.28;
    const up = stats.recoilVertical * p[0] * adsScale * this.rng.range(0.9, 1.1);
    const side =
      stats.recoilHorizontal * (p[1] + this.rng.range(-0.22, 0.22)) * adsScale;
    this.kickLog[(this.kickAt % KICK_LOG) * 2] = up;
    this.kickLog[(this.kickAt % KICK_LOG) * 2 + 1] = side;
    this.shotLog[this.kickAt % KICK_LOG] = this.time;
    this.kickAt++;
    player?.addViewKick(up, side);
    ctx.events.emit('camera:kick', { pitch: up, yaw: side, roll: side * 0.35 });
    slot.rig.fire(up, side, period, this._ads);

    // Flash, light and brass.
    const suppressed = slot.suppressed;
    const size = suppressed ? 0.055 : 0.11 + stats.caliber * 0.008;
    this.muzzle.group.position.copy(slot.model.muzzle);
    this.muzzle.group.position.applyMatrix4(slot.model.root.matrix);
    this.muzzle.group.quaternion.copy(slot.model.root.quaternion);
    this.muzzle.flash(size, this.rng.next() * 97, suppressed ? 0.03 : 0.05);
    _flash.position.copy(muzzleWorld);
    _flash.direction.copy(_v1);
    _flash.scale = suppressed ? 0.35 : 1;
    ctx.events.emit('fx:muzzleflash', _flash);
    ctx
      .tryGet<ILighting>('lighting')
      ?.flashLight(
        muzzleWorld,
        suppressed ? 0xff9a50 : 0xffb070,
        suppressed ? 6 : 42,
        suppressed ? 4 : 11,
        suppressed ? 0.035 : 0.06,
      );

    this.ejectShell(slot);

    _fire.weaponId = stats.id;
    _fire.origin.copy(muzzleWorld);
    _fire.direction.copy(_v1);
    _fire.ammoLeft = slot.mag;
    _fire.suppressed = suppressed;
    ctx.events.emit('weapon:fire', _fire);
    ctx.events.emit('weapon:ammo', { mag: slot.mag, reserve: slot.reserve });
    ctx.events.emit('audio:play', {
      id: suppressed ? `${stats.id}_fire_sup` : `${stats.id}_fire`,
      volume: 1,
    });

    if (slot.mag === 0) slot.rig.boltHold = slot.model.boltTravel;

    // Manually operated actions need working before the next round.
    if (mode === 'bolt' || mode === 'pump') {
      slot.chambered = false;
      if (slot.mag > 0) this.beginCycle(slot);
    }
  }

  private ejectShell(slot: Slot): void {
    const model = slot.model;
    model.root.updateWorldMatrix(true, false);
    _v0.copy(model.ejectPort).applyMatrix4(model.root.matrixWorld);
    _q0.setFromRotationMatrix(model.root.matrixWorld);
    _v1.copy(model.ejectDir).applyQuaternion(_q0).normalize();
    _shell.position.copy(_v0);
    _shell.velocity
      .copy(_v1)
      .multiplyScalar(2.4 + this.rng.next() * 1.4)
      .addScaledVector(_v2.set(0, 1, 0), 0.8);
    _shell.caliber = slot.def.caliber;
    this.ctx.events.emit('fx:shell', _shell);
  }

  /* ============================== actions =============================== */

  reload(): void {
    const slot = this.slot;
    const stats = slot.def.stats;
    if (this.action !== 'none' && this.action !== 'cycle') return;
    if (slot.reserve <= 0 || slot.mag >= stats.magSize) return;
    if (!this.visible) return;

    this.action = 'reload';
    this.reloadCancel = false;
    this.burstLeft = 0;
    const empty = slot.mag <= 0;
    this.ctx.events.emit('weapon:reload:start', { weaponId: stats.id, tactical: !empty });
    this.ctx.events.emit('audio:play', { id: `${stats.id}_reload`, volume: 0.9 });

    if (slot.model.reloadStyle === 'shellByShell') {
      this.shellsToLoad = Math.min(stats.magSize - slot.mag, slot.reserve);
      slot.rig.player.play(slot.rig.sequences.reloadStart!, stats.reloadEmptyTime);
    } else {
      const sequences = slot.rig.sequences;
      slot.rig.player.play(
        empty ? sequences.reloadEmpty : sequences.reload,
        empty ? stats.reloadEmptyTime : stats.reloadTime,
      );
    }
  }

  melee(): boolean {
    const slot = this.slot;
    if (this.action !== 'none' || !this.visible) return false;
    this.action = 'melee';
    this.burstLeft = 0;
    slot.rig.player.play(slot.rig.sequences.melee);
    this.ctx.events.emit('audio:play', { id: 'weapon_melee', volume: 0.8 });
    return true;
  }

  inspect(): boolean {
    const slot = this.slot;
    if (this.action !== 'none' || !this.visible) return false;
    this.action = 'inspect';
    slot.rig.player.play(slot.rig.sequences.inspect);
    this.ctx.events.emit('weapon:inspect', { weaponId: slot.def.stats.id });
    return true;
  }

  cookGrenade(kind: GrenadeKind = 'frag'): boolean {
    if (this.action !== 'none' || !this.visible) return false;
    if (!this.grenadeBag.cook(kind)) return false;
    this.action = 'throw';
    const slot = this.slot;
    slot.rig.player.play(slot.rig.sequences.throwGrenade, 1e6);
    return true;
  }

  throwGrenade(): boolean {
    if (this.action !== 'throw' || !this.grenadeBag.cooking) return false;
    const slot = this.slot;
    // Rejoin the throw sequence at its release beat and let it run out.
    const s = slot.rig.sequences.throwGrenade;
    slot.rig.player.play(s, s.duration);
    slot.rig.player.time = s.duration * 0.28;
    return true;
  }

  private beginCycle(slot: Slot): void {
    if (!slot.rig.sequences.cycle) {
      slot.chambered = true;
      return;
    }
    this.action = 'cycle';
    slot.rig.player.play(slot.rig.sequences.cycle);
    this.ctx.events.emit('weapon:cycle', { weaponId: slot.def.stats.id });
  }

  private handleSequenceEvent(name: string): void {
    const slot = this.slot;
    const stats = slot.def.stats;
    const rig = slot.rig;
    switch (name) {
      case 'mag:drop':
        rig.setMagVisible(false);
        this.dropMagazine(slot);
        break;
      case 'mag:show':
        rig.setMagVisible(true);
        break;
      case 'mag:seat': {
        const take = Math.min(stats.magSize - slot.mag, slot.reserve);
        slot.mag += take;
        slot.reserve -= take;
        slot.rig.boltHold = 0;
        slot.chambered = true;
        this.ctx.events.emit('weapon:ammo', { mag: slot.mag, reserve: slot.reserve });
        break;
      }
      case 'mag:tap':
        this.ctx.events.emit('audio:play', { id: 'weapon_magtap', volume: 0.6 });
        break;
      case 'bolt:release':
        slot.rig.boltHold = 0;
        this.ctx.events.emit('audio:play', { id: 'weapon_boltrelease', volume: 0.7 });
        break;
      case 'shell:show':
        rig.setShellVisible(true);
        break;
      case 'shell:load': {
        if (slot.reserve > 0 && slot.mag < stats.magSize) {
          slot.mag++;
          slot.reserve--;
          this.ctx.events.emit('weapon:reload:shell', { weaponId: stats.id, mag: slot.mag });
          this.ctx.events.emit('weapon:ammo', { mag: slot.mag, reserve: slot.reserve });
        }
        this.shellsToLoad--;
        break;
      }
      case 'shell:hide':
        rig.setShellVisible(false);
        break;
      case 'eject':
        this.ejectShell(slot);
        break;
      case 'chamber':
        slot.chambered = true;
        slot.rig.boltHold = 0;
        break;
      case 'melee:hit':
        this.resolveMelee();
        break;
      case 'grenade:release':
        this.releaseGrenade();
        break;
      case 'cycle':
        slot.chambered = true;
        break;
      case 'end':
        this.onSequenceEnd(slot);
        break;
      default:
        break;
    }
  }

  private onSequenceEnd(slot: Slot): void {
    const stats = slot.def.stats;
    if (this.action === 'reload' && slot.model.reloadStyle === 'shellByShell') {
      const more = !this.reloadCancel && this.shellsToLoad > 0 && slot.reserve > 0;
      const player = slot.rig.player;
      if (more) {
        player.play(slot.rig.sequences.reloadShell!, stats.reloadTime);
        return;
      }
      player.play(slot.rig.sequences.reloadEnd!, 0.62);
      this.action = 'reload';
      this.reloadCancel = true;
      return;
    }
    if (this.action === 'reload') {
      this.ctx.events.emit('weapon:reload:end', { weaponId: stats.id });
    }
    if (this.action === 'cycle') slot.chambered = true;
    this.action = 'none';
  }

  private dropMagazine(slot: Slot): void {
    const physics = this.ctx.tryGet<IPhysics>('physics');
    if (!physics) return;
    const model = slot.model;
    model.root.updateWorldMatrix(true, false);
    _v0.copy(model.magSocket).applyMatrix4(model.root.matrixWorld);
    _q0.setFromRotationMatrix(model.root.matrixWorld);
    const mesh = this.magProxy(slot);
    mesh.position.copy(_v0);
    mesh.quaternion.copy(_q0);
    mesh.visible = true;
    this.ctx.scene.add(mesh);
    _v1.set(0, -0.6, 0).applyQuaternion(_q0);
    _v2.set(this.rng.range(-4, 4), this.rng.range(-2, 2), this.rng.range(-3, 3));
    physics.addBody({
      mesh,
      mass: 0.24,
      shape: 'box',
      size: model.magSize,
      restitution: 0.15,
      friction: 0.72,
      linearVelocity: _v1,
      angularVelocity: _v2,
      lifetime: 12,
      group: Groups.DEBRIS,
    });
  }

  private readonly magProxies = new Map<string, THREE.Mesh[]>();

  /**
   * A dropped magazine is a real body, so it needs a real mesh in the world
   * scene. The viewmodel's own magazine is on the viewmodel layer and cannot be
   * reused; a stand-in of the same size, cloned once per weapon, can.
   */
  private magProxy(slot: Slot): THREE.Mesh {
    let list = this.magProxies.get(slot.def.stats.id);
    if (!list) {
      list = [];
      this.magProxies.set(slot.def.stats.id, list);
    }
    for (const m of list) if (!m.parent) return m;
    const size = slot.model.magSize;
    const geo = new THREE.BoxGeometry(size.x * 2, size.y * 2, size.z * 2);
    const mesh = new THREE.Mesh(geo, this.viewmodel.material('polymer'));
    mesh.name = `${slot.def.stats.id}:mag`;
    mesh.layers.set(Layers.DEFAULT);
    mesh.castShadow = true;
    list.push(mesh);
    return mesh;
  }

  private resolveMelee(): void {
    const physics = this.ctx.tryGet<IPhysics>('physics');
    const camera = this.ctx.camera;
    _v0.copy(camera.position);
    _v1.set(0, 0, -1).applyQuaternion(camera.quaternion);
    let hitSomething = false;
    if (physics) {
      const hit = physics.sphereCast(_v0, _v1, 0.22, 1.9, Groups.WORLD | Groups.ENEMY | Groups.PROP);
      if (hit) {
        hitSomething = true;
        if (hit.entityId !== undefined) {
          this.ctx.tryGet<IAI>('ai')?.damage(hit.entityId, {
            amount: 150,
            kind: 'melee',
            from: _v0,
            attacker: 'player',
            targetId: hit.entityId,
          });
          this.ctx.events.emit('ui:hitmarker', { lethal: true, headshot: false, damage: 150 });
        }
        this.ctx.events.emit('fx:impact', {
          point: hit.point,
          normal: hit.normal,
          surface: hit.surface,
          direction: _v1,
          energy: 0.5,
        });
      }
    }
    this.ctx.events.emit('weapon:melee', { hit: hitSomething });
  }

  private releaseGrenade(): void {
    const player = this.ctx.tryGet<IPlayer>('player');
    const camera = this.ctx.camera;
    _v0.copy(camera.position);
    _v1.set(0, 0, -1).applyQuaternion(camera.quaternion);
    _v2.copy(player?.velocity ?? _v2.set(0, 0, 0));
    this.grenadeBag.release(_v0, _v1, _v2, 1);
  }

  /* =============================== swap ================================= */

  switchTo(id: string): void {
    const target = this.slots.findIndex((s) => s.def.stats.id === id);
    if (target < 0 || target === this.index || this.action === 'swap') return;
    this.nextIndex = target;
    this.action = 'swap';
    this.swapTimer = 0.24;
    this.burstLeft = 0;
    this.slot.rig.player.stop();
    this.slot.rig.raiseTarget = 0;
  }

  private updateSwap(dt: number): void {
    if (this.action !== 'swap') return;
    this.swapTimer -= dt;
    if (this.swapTimer > 0) return;
    if (this.nextIndex !== this.index) {
      const old = this.slot;
      old.rig.reset();
      old.rig.raise = 0;
      this.index = this.nextIndex;
      const slot = this.slot;
      this.applyVisibility();
      slot.rig.raise = 0;
      slot.rig.raiseTarget = 1;
      slot.patternIndex = 0;
      this.spreadState.reset(slot.def.stats);
      this.swapTimer = 0.3;
      this.ctx.events.emit('weapon:switch', {
        weaponId: slot.def.stats.id,
        name: slot.def.stats.name,
      });
      this.ctx.events.emit('weapon:ammo', { mag: slot.mag, reserve: slot.reserve });
      this.ctx.tryGet<IPlayer>('player')?.setAdsTime?.(slot.def.stats.adsTime);
      return;
    }
    if (this.slot.rig.raise > 0.9) this.action = 'none';
  }

  /* ================================ rig ================================= */

  private updateRig(dt: number, ctx: GameContext, slot: Slot, player: IPlayer | undefined): void {
    const yaw = player?.viewYaw ?? this.lastYaw;
    const pitch = player?.viewPitch ?? this.lastPitch;
    const yawRate = dt > 0 ? angleDelta(this.lastYaw, yaw) / dt : 0;
    const pitchRate = dt > 0 ? (pitch - this.lastPitch) / dt : 0;
    this.lastYaw = yaw;
    this.lastPitch = pitch;

    const grounded = player?.grounded ?? true;
    if (grounded && !this.wasGrounded) slot.rig.land(Math.abs(player?.velocity.y ?? 0));
    this.wasGrounded = grounded;

    const input = this.rigInput;
    input.time = this.time;
    input.ads = this._ads;
    input.speed = player?.speedFactor ?? 0;
    input.sprint = player?.sprinting ? 1 : 0;
    input.crouch = player?.stance === 'crouch' ? 1 : player?.stance === 'prone' ? 1 : 0;
    input.grounded = grounded;
    input.airborne = player?.airborneTime ?? 0;
    input.yawRate = yawRate;
    input.pitchRate = pitchRate;
    input.winded = player?.winded ?? 0;
    input.holdBreath = player?.breathHeld ?? false;
    input.landImpact = this.landImpact;
    input.still = this.still;
    slot.rig.update(dt, input, this.onEvent);
    void ctx;
  }

  private readonly rigInput = {
    time: 0,
    ads: 0,
    speed: 0,
    sprint: 0,
    crouch: 0,
    grounded: true,
    airborne: 0,
    yawRate: 0,
    pitchRate: 0,
    winded: 0,
    holdBreath: false,
    landImpact: 0,
    still: false,
  };

  /* =============================== scope ================================ */

  private renderScope(ctx: GameContext, camera: THREE.PerspectiveCamera): void {
    const target = this.scopeTarget!;
    camera.position.copy(ctx.camera.position);
    camera.quaternion.copy(ctx.camera.quaternion);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const renderer = ctx.renderer;
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.clear(true, true, false);
    renderer.render(ctx.scene, camera);
    renderer.setRenderTarget(previous);
    this.slot.model.optic?.setScopeTexture(target.texture);
  }

  resize(_width: number, _height: number, _ctx: GameContext): void {
    this.showcase?.resize();
  }

  onQualityChange(quality: QualitySettings, _ctx: GameContext): void {
    this.applyQuality(quality);
  }

  private applyQuality(quality: QualitySettings): void {
    // The scope is a second full scene render, so it is the first thing to go.
    const size =
      quality.preset === 'low'
        ? 0
        : quality.preset === 'medium'
          ? 320
          : quality.preset === 'high'
            ? 512
            : 768;
    if (size === this.scopeSize) return;
    this.scopeSize = size;
    this.scopeTarget?.dispose();
    this.scopeTarget = null;
    if (size > 0) {
      this.scopeTarget = new THREE.WebGLRenderTarget(size, size, {
        type: THREE.HalfFloatType,
        depthBuffer: true,
        samples: quality.msaaSamples > 1 ? 2 : 0,
      });
      this.scopeTarget.texture.name = 'ScopeImage';
      this.scopeTarget.texture.minFilter = THREE.LinearFilter;
      this.scopeTarget.texture.magFilter = THREE.LinearFilter;
    }
  }

  /* ============================== IWeapons ============================== */

  get current(): WeaponStats | null {
    return this.slots.length ? this.slot.def.stats : null;
  }

  get mag(): number {
    return this.slot.mag;
  }

  get reserve(): number {
    return this.slot.reserve;
  }

  get reloading(): boolean {
    return this.action === 'reload';
  }

  get aiming(): boolean {
    return this._ads > 0.5;
  }

  get spread(): number {
    return this.spreadState.value;
  }

  get adsFactor(): number {
    return this._ads;
  }

  get grenades(): { frag: number; flash: number; smoke: number } {
    return this.grenadeBag.counts;
  }

  get loadout(): WeaponStats[] {
    return this.slots.map((s) => s.def.stats);
  }

  get fireMode(): FireMode {
    return this.slot.fireMode;
  }

  get reloadProgress(): number {
    return this.action === 'reload' ? this.slot.rig.player.progress : 0;
  }

  get switching(): boolean {
    return this.action === 'swap';
  }

  cycleFireMode(): FireMode {
    const slot = this.slot;
    const modes = slot.def.stats.fireModes;
    if (!modes || modes.length < 2) return slot.fireMode;
    const i = modes.indexOf(slot.fireMode);
    slot.fireMode = modes[(i + 1) % modes.length];
    this.burstLeft = 0;
    this.ctx.events.emit('weapon:firemode', {
      weaponId: slot.def.stats.id,
      mode: slot.fireMode,
    });
    return slot.fireMode;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.applyVisibility();
  }

  private lineupActive = false;

  /**
   * The held weapon and the showcase lineup share one root, so visibility is
   * resolved in one place: the harness hides the whole viewmodel for
   * environment shots, and the lineup hides only the gun in your hands.
   */
  private applyVisibility(): void {
    this.viewmodel.root.visible = this.visible;
    const held = this.visible && !this.lineupActive;
    for (const s of this.slots) s.model.root.visible = held && s === this.slot;
    this.muzzle.group.visible = held;
  }

  addAmmo(rounds: number): void {
    const slot = this.slot;
    slot.reserve = Math.min(slot.def.stats.reserveAmmo * 2, slot.reserve + rounds);
    this.ctx.events.emit('weapon:ammo', { mag: slot.mag, reserve: slot.reserve });
  }

  /* ============================== tooling =============================== */

  private registerShots(): void {
    const self = this;
    registerVantages([
      {
        name: 'wpn_hip',
        position: new THREE.Vector3(0, 1.65, 0),
        rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
        note: 'Weapon at the hip, idle.',
        setup: () => self.poseFor('rifle', 0, false),
      },
      {
        name: 'wpn_ads',
        position: new THREE.Vector3(0, 1.65, 0),
        rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
        note: 'Full ADS: the rear sight must be dead centre.',
        setup: () => self.poseFor('rifle', 1, true),
      },
      {
        name: 'wpn_reload',
        position: new THREE.Vector3(0, 1.65, 0),
        rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
        /* 0.38 of the empty reload, which is the frame where the sequence is
           legible: the old magazine has already been let go, the fresh one is
           at the well and still tilted, and the gun is at the bottom of its
           roll toward the chest. Later than this and the magazine is seated
           and a still just shows a canted rifle. */
        note: 'Mid-reload: fresh magazine entering the well.',
        setup: () => self.poseReload('rifle', 0.38),
      },
      {
        name: 'wpn_scope',
        position: new THREE.Vector3(0, 1.65, 0),
        rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
        note: 'Through the sniper scope.',
        setup: () => self.poseFor('sniper', 1, true),
      },
      {
        name: 'wpn_pistol_ads',
        position: new THREE.Vector3(0, 1.65, 0),
        rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
        note: 'Pistol ADS: three-dot alignment.',
        setup: () => self.poseFor('pistol', 1, true),
      },
      {
        name: 'wpn_shotgun_hip',
        position: new THREE.Vector3(0, 1.65, 0),
        rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
        note: 'Shotgun at the hip: wood furniture.',
        setup: () => self.poseFor('shotgun', 0, false),
      },
    ]);
  }

  /** Snaps a weapon into a pose and settles the rig, for reproducible shots. */
  poseFor(id: string, ads: number, still: boolean): void {
    this.showcase?.setActive(false);
    this.forceWeapon(id);
    this.adsOverride = ads;
    this.still = still;
    this.setVisible(true);
    for (let i = 0; i < 30; i++) {
      this.slot.rig.update(1 / 60, this.stillInput(ads, still), this.onEvent);
    }
  }

  poseReload(id: string, t: number): void {
    this.showcase?.setActive(false);
    this.forceWeapon(id);
    this.adsOverride = 0;
    this.still = true;
    this.setVisible(true);
    const slot = this.slot;
    slot.mag = 0;
    this.action = 'reload';
    slot.rig.player.play(slot.rig.sequences.reloadEmpty, slot.def.stats.reloadEmptyTime);
    const target = slot.def.stats.reloadEmptyTime * t;
    const step = 1 / 120;
    for (let time = 0; time < target; time += step) {
      slot.rig.update(step, this.stillInput(0, true), this.onEvent);
    }
  }

  private stillInput(ads: number, still: boolean) {
    const i = this.rigInput;
    i.ads = ads;
    i.speed = 0;
    i.sprint = 0;
    i.crouch = 0;
    i.grounded = true;
    i.airborne = 0;
    i.yawRate = 0;
    i.pitchRate = 0;
    i.winded = 0;
    i.holdBreath = true;
    i.still = still;
    i.time = this.time;
    return i;
  }

  private forceWeapon(id: string): void {
    const target = this.slots.findIndex((s) => s.def.stats.id === id);
    if (target < 0) return;
    if (target !== this.index) {
      this.slot.model.root.visible = false;
      this.slot.rig.reset();
      this.index = target;
      this.nextIndex = target;
      this.spreadState.reset(this.slot.def.stats);
    }
    const slot = this.slot;
    slot.rig.reset();
    slot.rig.raise = 1;
    slot.rig.raiseTarget = 1;
    slot.mag = slot.def.stats.magSize;
    slot.chambered = true;
    slot.patternIndex = 0;
    this.action = 'none';
    this.burstLeft = 0;
    this.fireTimer = 0;
    this.patternRest = 0;
    this.spreadState.reset(slot.def.stats);
    this.applyVisibility();
  }

  /** Swaps a weapon's optic, rebuilding the model. Not for the frame loop. */
  setOptic(id: string, kind: OpticKind): boolean {
    const i = this.slots.findIndex((s) => s.def.stats.id === id);
    if (i < 0) return false;
    const old = this.slots[i];
    if (old.optic === kind) return true;
    const mag = old.mag;
    const reserve = old.reserve;
    this.viewmodel.root.remove(old.model.root);
    old.model.dispose();
    const slot = this.makeSlot(old.def, kind, old.suppressed);
    slot.mag = mag;
    slot.reserve = reserve;
    this.slots[i] = slot;
    this.viewmodel.root.add(slot.model.root);
    if (i === this.index) {
      slot.rig.raise = 1;
      slot.rig.raiseTarget = 1;
    }
    this.applyVisibility();
    return true;
  }

  setSuppressor(id: string, on: boolean): boolean {
    const i = this.slots.findIndex((s) => s.def.stats.id === id);
    if (i < 0 || this.slots[i].suppressed === on) return i >= 0;
    const old = this.slots[i];
    const mag = old.mag;
    const reserve = old.reserve;
    this.viewmodel.root.remove(old.model.root);
    old.model.dispose();
    const slot = this.makeSlot(old.def, old.optic, on);
    slot.mag = mag;
    slot.reserve = reserve;
    slot.def.stats.suppressed = on;
    this.slots[i] = slot;
    this.viewmodel.root.add(slot.model.root);
    if (i === this.index) {
      slot.rig.raise = 1;
      slot.rig.raiseTarget = 1;
    }
    this.applyVisibility();
    return true;
  }

  /** Everything the headless harness needs to drive the weapon deterministically. */
  private bridge(): void {
    const self = this;
    const api = {
      system: self,
      list: (): string[] => self.slots.map((s) => s.def.stats.id),
      stats: (id?: string): WeaponStats => (id ? weaponDef(id)!.stats : self.stats),
      info(): Record<string, unknown> {
        const slot = self.slot;
        return {
          id: slot.def.stats.id,
          triangles: slot.model.triangles,
          mag: slot.mag,
          reserve: slot.reserve,
          spread: self.spreadState.value,
          ads: self._ads,
          fireMode: slot.fireMode,
          action: self.action,
          optic: slot.optic,
          suppressed: slot.suppressed,
          adsEyeRelief: slot.model.adsEyeRelief,
          vmFovAds: slot.model.vmFovAds,
          /** Key-light luminance the emissive reticle is scaled against. */
          envLevel: self.viewmodel.keyLevel,
          shotsFired: self.ballistics.shotsFired,
          reloadProgress: self.reloadProgress,
          boltHold: slot.rig.boltHold,
        };
      },
      triangles(): Record<string, number> {
        const out: Record<string, number> = {};
        for (const s of self.slots) out[s.def.stats.id] = s.model.triangles;
        return out;
      },
      select: (id: string): void => self.forceWeapon(id),
      switchTo: (id: string): void => self.switchTo(id),
      setOptic: (id: string, kind: OpticKind): boolean => self.setOptic(id, kind),
      setSuppressor: (id: string, on: boolean): boolean => self.setSuppressor(id, on),
      setAds: (v: number): void => {
        self.adsOverride = v < 0 ? -1 : clamp(v, 0, 1);
      },
      setStill: (v: boolean): void => {
        self.still = v;
      },
      setFireMode(mode: FireMode): FireMode {
        const slot = self.slot;
        slot.fireMode = mode;
        self.burstLeft = 0;
        return slot.fireMode;
      },
      cycleFireMode: (): FireMode => self.cycleFireMode(),
      /** The weapon's deterministic spray pattern, and where in it we are. */
      pattern: (id?: string): Array<[number, number]> =>
        (id ? weaponDef(id)! : self.slot.def).pattern,
      patternIndex: (): number => self.slot.patternIndex,
      /** The last `n` view kicks, newest last, as [up, side] pairs. */
      kicks(n = 16): Array<[number, number]> {
        const out: Array<[number, number]> = [];
        const count = Math.min(n, KICK_LOG, self.kickAt);
        for (let i = count; i > 0; i--) {
          const slot = (self.kickAt - i) % KICK_LOG;
          out.push([self.kickLog[slot * 2], self.kickLog[slot * 2 + 1]]);
        }
        return out;
      },
      /** Simulation times of the last `n` shots, newest last, in seconds. */
      shotTimes(n = 16): number[] {
        const out: number[] = [];
        const count = Math.min(n, KICK_LOG, self.kickAt);
        for (let i = count; i > 0; i--) out.push(self.shotLog[(self.kickAt - i) % KICK_LOG]);
        return out;
      },
      /** Rewinds the recoil dice so two sprays can be compared exactly. */
      reseed(seed = 0x1234abcd): void {
        self.rng = new Rng(seed);
        self.slot.patternIndex = 0;
        self.kickAt = 0;
      },
      hold: (down: boolean): void => {
        self.holdFireOverride = down;
        if (!down) self.triggerLatched = false;
      },
      /** One trigger pull: press, step a frame, release. */
      pull(): void {
        self.holdFireOverride = true;
        self.triggerHeld = true;
        self.triggerLatched = false;
      },
      release(): void {
        self.holdFireOverride = false;
        self.triggerHeld = false;
        self.triggerLatched = false;
      },
      reload: (): void => self.reload(),
      melee: (): boolean => self.melee(),
      inspect: (): boolean => self.inspect(),
      grenade(kind: GrenadeKind): void {
        self.cookGrenade(kind);
      },
      throw: (): boolean => self.throwGrenade(),
      setAmmo(mag: number, reserve: number): void {
        const slot = self.slot;
        slot.mag = clamp(Math.round(mag), 0, slot.def.stats.magSize);
        slot.reserve = Math.max(0, Math.round(reserve));
        slot.rig.boltHold = slot.mag === 0 ? slot.model.boltTravel : 0;
      },
      /** Advances only the weapon, so a test never has to render. */
      step(seconds: number, dt = 1 / 120): void {
        const steps = Math.max(1, Math.round(seconds / dt));
        for (let i = 0; i < steps; i++) self.update(dt, self.ctx);
      },
      /**
       * Where the sights actually land on screen, in pixels.
       *
       * Both of them, and the error of each against the frame centre. Reporting
       * only the model origin would be reporting the pose back to itself: the
       * origin is put on the camera axis by the ADS pose, so it is at the centre
       * whether or not there is a sight anywhere near it. Two points, measured
       * off the built geometry, is the difference between "the transform is
       * right" and "the sight picture is right".
       */
      sightPixel(width: number, height: number): Record<string, number | boolean> {
        const slot = self.slot;
        const camera = self.ctx.viewmodelCamera;
        camera.fov = slot.rig.vmFov;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        self.viewmodel.root.updateMatrixWorld(true);
        slot.model.root.updateWorldMatrix(true, false);
        const at = (v: THREE.Vector3): { x: number; y: number } => {
          _v0.copy(v).applyMatrix4(slot.model.root.matrixWorld).project(camera);
          return { x: (_v0.x * 0.5 + 0.5) * width, y: (0.5 - _v0.y * 0.5) * height };
        };
        const rear = at(slot.model.sightRear);
        const front = at(slot.model.sightFront);
        const cx = width / 2;
        const cy = height / 2;
        return {
          x: rear.x,
          y: rear.y,
          frontX: front.x,
          frontY: front.y,
          rearErr: Math.hypot(rear.x - cx, rear.y - cy),
          frontErr: Math.hypot(front.x - cx, front.y - cy),
          ok: Number.isFinite(rear.x) && Number.isFinite(front.x),
        };
      },
      /** Axis-aligned bounds of a weapon in its own space, in metres. */
      bounds(id?: string): Record<string, number> {
        const slot = id ? (self.slots.find((s) => s.def.stats.id === id) ?? self.slot) : self.slot;
        modelBounds(slot.model.root, _box);
        _box.getSize(_v0);
        return {
          minX: _box.min.x,
          minY: _box.min.y,
          minZ: _box.min.z,
          maxX: _box.max.x,
          maxY: _box.max.y,
          maxZ: _box.max.z,
          sizeX: _v0.x,
          sizeY: _v0.y,
          sizeZ: _v0.z,
        };
      },
      /** The weapon's bounding rectangle on screen, in pixels. */
      screenRect(width: number, height: number): Record<string, number> {
        const slot = self.slot;
        const camera = self.ctx.viewmodelCamera;
        camera.fov = slot.rig.vmFov;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        self.viewmodel.root.updateMatrixWorld(true);
        slot.model.root.updateWorldMatrix(true, true);
        modelBounds(slot.model.root, _box);
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        for (let i = 0; i < 8; i++) {
          _v0.set(
            i & 1 ? _box.max.x : _box.min.x,
            i & 2 ? _box.max.y : _box.min.y,
            i & 4 ? _box.max.z : _box.min.z,
          );
          _v0.applyMatrix4(slot.model.root.matrixWorld).project(camera);
          const px = (_v0.x * 0.5 + 0.5) * width;
          const py = (0.5 - _v0.y * 0.5) * height;
          x0 = Math.min(x0, px);
          y0 = Math.min(y0, py);
          x1 = Math.max(x1, px);
          y1 = Math.max(y1, py);
        }
        return { x0, y0, x1, y1, width: x1 - x0, height: y1 - y0 };
      },
      /** Same, but for an arbitrary point on the model, in weapon space. */
      projectPoint(
        x: number,
        y: number,
        z: number,
        width: number,
        height: number,
      ): { x: number; y: number } {
        const slot = self.slot;
        const camera = self.ctx.viewmodelCamera;
        camera.fov = slot.rig.vmFov;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        slot.model.root.updateWorldMatrix(true, false);
        const p = new THREE.Vector3(x, y, z).applyMatrix4(slot.model.root.matrixWorld);
        p.project(camera);
        return { x: (p.x * 0.5 + 0.5) * width, y: (0.5 - p.y * 0.5) * height };
      },
      ballistics: () => self.ballistics,
      spreadValue: (): number => self.spreadState.value,
      /** Damage at a range on this weapon's falloff curve. */
      damageAt: (distance: number, id?: string): number =>
        damageAtRange(id ? weaponDef(id)!.stats : self.stats, distance),
      /**
       * Runs the real penetration ledger over a synthetic stack of walls and
       * reports the damage each layer would take.
       */
      penetrate(
        layers: Array<{ surface: SurfaceKind; thickness?: number; distance?: number }>,
        id?: string,
      ): { damage: number[]; fraction: number[]; pierced: number; energy: number } {
        const stats = id ? weaponDef(id)!.stats : self.stats;
        const run = new PenetrationRun();
        run.begin(stats);
        const damage: number[] = [];
        const fraction: number[] = [];
        let pierced = 0;
        for (const layer of layers) {
          damage.push(run.damageAt(stats, layer.distance ?? 0));
          fraction.push(run.fraction);
          const thickness = layer.thickness ?? defaultThickness(layer.surface);
          if (run.spend(layer.surface, thickness)) pierced++;
          if (run.energy <= 0) break;
        }
        return { damage, fraction, pierced, energy: run.energy };
      },
      cost: (surface: SurfaceKind, thickness: number): number =>
        penetrationCost(surface, thickness),
      defaultThickness: (surface: SurfaceKind): number => defaultThickness(surface),
      /** Drives the spread model directly, without needing a rendered frame. */
      spreadStep(
        seconds: number,
        input: { ads: number; speed: number; crouch: number; grounded: boolean },
        dt = 1 / 120,
      ): number {
        const stats = self.stats;
        const steps = Math.max(1, Math.round(seconds / dt));
        for (let i = 0; i < steps; i++) {
          self.spreadState.update(dt, stats, {
            ads: input.ads,
            speed: input.speed,
            crouch: input.crouch,
            grounded: input.grounded,
            reloading: false,
          });
        }
        return self.spreadState.value;
      },
      spreadShot(ads: number): number {
        self.spreadState.onShot(self.stats, ads);
        return self.spreadState.bloom;
      },
      spreadReset(): void {
        self.spreadState.reset(self.stats);
      },
      /**
       * Live overrides for the framing and lighting constants, so the capture
       * harness can sweep them inside one boot. Every one of these has a
       * committed value in the model or the light rig; this only moves it.
       */
      tune(t: {
        gain?: number;
        vmFovHip?: number;
        vmFovAds?: number;
        eyeRelief?: number;
        dot?: number;
        reticle?: number;
        hip?: [number, number, number, number, number, number];
      }): Record<string, number> {
        const model = self.slot.model;
        if (t.gain !== undefined) self.viewmodel.gain = t.gain;
        if (t.dot !== undefined || t.reticle !== undefined) {
          model.optic?.setReticle(t.dot ?? 0.0011, t.reticle ?? 26);
        }
        if (t.vmFovHip !== undefined) model.vmFovHip = t.vmFovHip;
        if (t.vmFovAds !== undefined) model.vmFovAds = t.vmFovAds;
        if (t.eyeRelief !== undefined) {
          model.adsEyeRelief = t.eyeRelief;
          model.adsPose.pz = -t.eyeRelief;
        }
        if (t.hip) {
          const p = model.hipPose;
          [p.px, p.py, p.pz, p.rx, p.ry, p.rz] = t.hip;
        }
        return {
          gain: self.viewmodel.gain,
          vmFovHip: model.vmFovHip,
          vmFovAds: model.vmFovAds,
          eyeRelief: model.adsEyeRelief,
        };
      },
      /**
       * Distance from the viewmodel camera to a point on the weapon, in metres.
       * The viewmodel pass focuses at a fixed distance, so this is how a pose
       * is checked against it rather than against an opinion.
       */
      depthAt(x = 0, y = 0, z = 0): number {
        const slot = self.slot;
        slot.model.root.updateWorldMatrix(true, false);
        _v0.set(x, y, z).applyMatrix4(slot.model.root.matrixWorld);
        return _v0.distanceTo(self.ctx.viewmodelCamera.position);
      },
      showcase: (): WeaponShowcase | null => self.showcase,
      lineup(on: boolean, id?: string): boolean {
        const s = self.showcase;
        if (!s) return false;
        s.setActive(on);
        if (on) s.setFocus(id ? s.indexOf(id) : -1);
        return true;
      },
    };
    (window as unknown as Record<string, unknown>).__WEAPONS__ = api;
  }

  dispose(): void {
    for (const s of this.slots) s.model.dispose();
    this.slots.length = 0;
    this.muzzle.dispose();
    this.grenadeBag.dispose();
    this.viewmodel.dispose();
    this.scopeTarget?.dispose();
    this.showcase?.dispose();
    for (const list of this.magProxies.values()) {
      for (const m of list) m.geometry.dispose();
    }
  }
}

const _box = new THREE.Box3();
const _bmat = new THREE.Matrix4();
const _bbox = new THREE.Box3();

/** Union of a subtree's mesh bounds, expressed in the subtree root's space. */
function modelBounds(root: THREE.Object3D, out: THREE.Box3): THREE.Box3 {
  out.makeEmpty();
  root.updateWorldMatrix(false, true);
  const inverse = _bmat.copy(root.matrixWorld).invert();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible || !mesh.geometry || mesh.userData.noBounds) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    _bbox.copy(mesh.geometry.boundingBox!);
    _bbox.applyMatrix4(_q1.multiplyMatrices(inverse, mesh.matrixWorld));
    out.union(_bbox);
  });
  return out;
}

const _q1 = new THREE.Matrix4();

function angleDelta(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

void saturate;
void RIG;
