import * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import type {
  IAiDirector,
  IPhysics,
  IPlayer,
  IVfx,
  IWeapons,
  WeaponId,
  WeaponSpec,
} from '../core/Contracts';
import { clamp, DEG, makeRng, type Rng } from '../core/MathX';
import { WEAPON_SPECS, WEAPON_ORDER, TRACER_EVERY } from './WeaponSpecs';
import { ViewModel } from './ViewModel';
import { ViewModelAnimator, type AnimParams } from './ViewModelAnimator';
import { Ballistics } from './Ballistics';
import { RecoilPattern } from './RecoilPattern';

/**
 * WeaponSystem — the `IWeapons` service: viewmodel, animation, ballistics,
 * fire modes, ammo management, reloading and weapon switching.
 */
export class WeaponSystem implements Subsystem, IWeapons {
  readonly name = 'weapons';
  readonly order = 50;

  current: WeaponSpec = WEAPON_SPECS.ar_wolverine;
  magAmmo = WEAPON_SPECS.ar_wolverine.magSize;
  reserveAmmo = WEAPON_SPECS.ar_wolverine.reserveAmmo;
  reloading = false;
  adsAmount = 0;

  private ctx!: EngineContext;
  private vm!: ViewModel;
  private animator!: ViewModelAnimator;
  private ballistics!: Ballistics;
  private rng: Rng = makeRng(0xbadc0de);
  private patterns = new Map<WeaponId, RecoilPattern>();

  private ammo = new Map<WeaponId, { mag: number; reserve: number }>();
  private slots: [WeaponId, WeaponId] = ['ar_wolverine', 'pistol_sidearm'];
  private orderIndex = 0;

  private enabled = true;
  private forcedAds = false;
  private lastLook = { yaw: 0, pitch: 0 };

  // Fire timing.
  private nextShotAt = 0;
  private burstRemaining = 0;
  private cycleUntil = 0; // pump/bolt lockout
  private reloadEndAt = 0;
  private reloadPending: 'tactical' | 'empty' | null = null;

  // Switch state.
  private switching = false;
  private switchPhase: 'out' | 'in' = 'out';
  private switchAt = 0;
  private pendingSwitch: WeaponId | null = null;

  // Spread bloom.
  private bloom = 0;

  private _mp = new THREE.Vector3();
  private _md = new THREE.Vector3();
  private _aim = new THREE.Vector3();
  private _tmp = new THREE.Vector3();
  private _ejV = new THREE.Vector3();

  init(ctx: EngineContext) {
    this.ctx = ctx;

    for (const id of WEAPON_ORDER) {
      const s = WEAPON_SPECS[id];
      this.ammo.set(id, { mag: s.magSize, reserve: s.reserveAmmo });
      this.patterns.set(id, new RecoilPattern(id));
    }

    this.vm = new ViewModel(ctx, 'ar_wolverine');
    this.animator = new ViewModelAnimator(this.vm, ctx);
    this.ballistics = new Ballistics(ctx, this.rng);
    this.ballistics.setSpecs(WEAPON_SPECS);

    this.applyCaptureHooks();
    this.syncCurrent();
  }

  /** Query-param / capture hooks for deterministic screenshots. */
  private applyCaptureHooks() {
    if (typeof window === 'undefined') return;
    const shot = window.__CAPTURE__?.shot ?? null;
    const q = new URLSearchParams(location.search);
    const w = q.get('weapon') as WeaponId | null;
    if (w && WEAPON_SPECS[w]) {
      this.vm.setWeapon(w);
      this.current = WEAPON_SPECS[w];
      this.orderIndex = WEAPON_ORDER.indexOf(w);
      this.syncCurrent();
    }
    if (shot === 'ads' || q.get('ads') === '1') this.forcedAds = true;
    const anim = q.get('anim');
    if (anim === 'reload') this.beginReload();
    else if (anim === 'switch') this.requestSwitch(this.slots[1]);
    else if (anim === 'melee') this.animator?.melee();
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------

  update(dt: number, ctx: EngineContext) {
    const player = ctx.has('player') ? ctx.get<IPlayer>('player') : null;
    const input = ctx.input;
    const t = ctx.elapsed;

    // --- ADS blend ---------------------------------------------------------
    const canAds = !!player && !player.sprinting;
    const adsHeld =
      this.forcedAds || (canAds && input.enabled && input.isDown('ads') && !this.switching);
    const adsTarget = adsHeld ? 1 : 0;
    const prevAds = this.adsAmount;
    this.adsAmount = moveToward(this.adsAmount, adsTarget, dt / Math.max(0.05, this.current.adsTime));
    if ((prevAds < 0.5) !== (this.adsAmount < 0.5)) {
      ctx.events.emit('weapon:ads', this.adsAmount >= 0.5);
    }

    // --- Weapon switching --------------------------------------------------
    this.updateSwitch(t);
    if (input.enabled && !this.switching) {
      if (input.pressed('weapon1')) this.requestSwitch(this.slots[0]);
      else if (input.pressed('weapon2')) this.requestSwitch(this.slots[1]);
      else if (input.wheel !== 0) this.cycleWeapon(input.wheel > 0 ? 1 : -1);
    }

    // --- Reload ------------------------------------------------------------
    if (input.enabled && input.pressed('reload')) this.beginReload();
    this.updateReload(t);

    // --- Melee -------------------------------------------------------------
    if (input.enabled && input.pressed('melee')) this.doMelee(ctx, player);

    // --- Firing ------------------------------------------------------------
    this.updateFiring(dt, t, ctx, player, input);

    // --- Spread bloom decay ------------------------------------------------
    this.bloom = Math.max(0, this.bloom - dt * (this.current.recoilRecovery * 0.6));

    // --- Recoil pattern cooldown ------------------------------------------
    if (!input.isDown('fire')) this.patterns.get(this.current.id)?.cooldown(dt, 6);

    // --- Animator ----------------------------------------------------------
    const params = this.buildAnimParams(dt, player, input);
    this.animator.update(dt, params);
    this.vm.update();
  }

  fixedUpdate(dt: number) {
    this.ballistics.fixedUpdate(dt);
  }

  private buildAnimParams(dt: number, player: IPlayer | null, input: EngineContext['input']): AnimParams {
    let yawDelta = 0;
    let pitchDelta = 0;
    if (player) {
      yawDelta = shortestAngle(this.lastLook.yaw, player.yaw);
      pitchDelta = player.pitch - this.lastLook.pitch;
      this.lastLook.yaw = player.yaw;
      this.lastLook.pitch = player.pitch;
    }
    const speed = player ? Math.hypot(player.velocity.x, player.velocity.z) : 0;
    const sprintAmount = player?.sprinting ? 1 : 0;
    const busy =
      this.reloading || this.switching || input.isDown('fire') || this.adsAmount > 0.02;
    const idle =
      !busy && speed < 0.2 && !(input.enabled && (input.isDown('ads') || input.isDown('reload')));
    return {
      adsAmount: this.adsAmount,
      sprintAmount,
      speed,
      grounded: player?.grounded ?? true,
      yawDelta: yawDelta / Math.max(dt, 1e-3) * 0.016,
      pitchDelta: pitchDelta / Math.max(dt, 1e-3) * 0.016,
      idle,
    };
  }

  // -------------------------------------------------------------------------
  // Firing
  // -------------------------------------------------------------------------

  private updateFiring(
    dt: number,
    t: number,
    ctx: EngineContext,
    player: IPlayer | null,
    input: EngineContext['input']
  ) {
    if (!this.enabled) return;
    const spec = this.current;
    const interval = 60 / spec.rpm;
    const sprinting = player?.sprinting ?? false;
    const blocked = this.reloading || this.switching || sprinting || t < this.cycleUntil;

    const wantsTrigger =
      input.enabled &&
      (spec.fireMode === 'auto' ? input.isDown('fire') : input.pressed('fire'));

    // Burst latch.
    if (spec.fireMode === 'burst' && input.enabled && input.pressed('fire') && !blocked) {
      this.burstRemaining = spec.burstCount ?? 3;
    }
    const wantsBurst = spec.fireMode === 'burst' && this.burstRemaining > 0;

    const wants = spec.fireMode === 'burst' ? wantsBurst : wantsTrigger;
    if (!wants || blocked) return;
    if (t < this.nextShotAt) return;

    if (this.magAmmo <= 0) {
      // Click + auto-reload if we have reserve.
      if (input.pressed('fire')) {
        ctx.events.emit('weapon:dryfire', { weapon: spec.id });
        this.beginReload();
      }
      this.nextShotAt = t + interval;
      return;
    }

    this.fireOne(t, ctx, player);
    this.nextShotAt = t + interval;
    if (spec.fireMode === 'burst') this.burstRemaining--;

    // Manual actions lock out until cycled.
    if (spec.fireMode === 'pump') {
      this.cycleUntil = t + interval * 0.7;
      this.animator.manualCycle('pump', Math.min(0.5, interval * 0.6));
    } else if (spec.fireMode === 'bolt') {
      this.cycleUntil = t + interval * 0.8;
      this.animator.manualCycle('bolt', Math.min(0.7, interval * 0.7));
    }
  }

  private fireOne(t: number, ctx: EngineContext, player: IPlayer | null) {
    const spec = this.current;
    this.magAmmo--;

    // Muzzle world transform (FOV-compensated) + aim direction.
    this.vm.getMuzzleWorld(this._mp, this._md);
    ctx.camera.getWorldDirection(this._aim).normalize();

    // Spread: hip↔ads, movement, airborne, crouch, continuous-fire bloom.
    let spread = lerp(spec.spreadHip, spec.spreadAds, this.adsAmount);
    if (player) {
      const speed = Math.hypot(player.velocity.x, player.velocity.z);
      spread += spec.spreadMoving * clamp(speed / 4, 0, 1);
      if (!player.grounded) spread *= 1.6;
      if (player.stance === 'crouch') spread *= 0.7;
      else if (player.stance === 'prone') spread *= 0.5;
    }
    spread += this.bloom;
    this.bloom += spec.spreadHip * 0.14;

    const shotIndex = spec.magSize - this.magAmmo;
    const tracerN = TRACER_EVERY[spec.id];
    const tracer = tracerN > 0 && shotIndex % tracerN === 0;

    this.ballistics.fireShot(spec, this._mp, this._aim, {
      spreadDeg: spread,
      tracer,
      attackerId: -1,
    });

    // Recoil: deterministic pattern → view punch (auto-recovers) + climb.
    const pat = this.patterns.get(spec.id)!;
    const rec = pat.next(this.rng);
    player?.addViewPunch(
      rec.pitch * DEG,
      rec.yaw * DEG,
      this.rng.range(-0.5, 0.5) * spec.recoilHorizontal * DEG
    );
    // Viewmodel kick.
    this.animator.fireKick({
      back: 0.5 + spec.recoilVertical * 0.6,
      pitch: spec.recoilVertical * 90,
      yaw: rec.yaw * 60,
      roll: this.rng.range(-1, 1) * spec.recoilHorizontal * 60,
    });

    // VFX (guarded).
    if (ctx.has('vfx')) {
      const vfx = ctx.get<IVfx>('vfx');
      vfx.muzzleFlash(this._mp, this._md, this.vm.current.flashScale);
      this.computeEjectVelocity(ctx);
      this.vm.current.ejectPoint.getWorldPosition(this._tmp);
      vfx.ejectCasing(this._tmp, this._ejV, spec.caliber);
    }

    ctx.events.emit('weapon:fire', {
      weapon: spec.id,
      muzzle: this._mp.clone(),
      dir: this._md.clone(),
    });
    ctx.events.emit('weapon:ammo', { mag: this.magAmmo, reserve: this.reserveAmmo });

    // Camera shake for heavier calibres.
    if (spec.caliber === 'magnum' || spec.caliber === 'shell') {
      ctx.events.emit('camera:impulse', { pitch: 0, yaw: 0, roll: this.rng.range(-0.01, 0.01) });
    }
    void t;
  }

  private computeEjectVelocity(ctx: EngineContext) {
    // Eject up-right-back relative to the view.
    ctx.camera.matrixWorld.extractBasis(this._tmp, this._ejV, this._aim);
    // _tmp = right, _ejV = up, _aim = forward(+Z back)
    this._ejV.multiplyScalar(1.6).addScaledVector(this._tmp, 2.2).addScaledVector(this._aim, 1.2);
  }

  // -------------------------------------------------------------------------
  // Reload
  // -------------------------------------------------------------------------

  private beginReload() {
    const spec = this.current;
    if (this.reloading || this.switching) return;
    if (this.magAmmo >= spec.magSize || this.reserveAmmo <= 0) return;
    const empty = this.magAmmo === 0;
    const duration = empty ? spec.reloadEmptyTime : spec.reloadTime;
    this.reloading = true;
    this.reloadPending = empty ? 'empty' : 'tactical';
    this.reloadEndAt = this.ctx.elapsed + duration;
    this.animator.beginReload(empty, duration);
    this.ctx.events.emit('weapon:reload:start', { weapon: spec.id, duration });
  }

  private updateReload(t: number) {
    if (!this.reloading) return;
    // Cancel-on-fire when there is already a round chambered.
    if (
      this.magAmmo > 0 &&
      this.ctx.input.enabled &&
      this.ctx.input.pressed('fire') &&
      this.reloadPending === 'tactical'
    ) {
      this.reloading = false;
      this.reloadPending = null;
      this.animator.cancelReload();
      return;
    }
    if (t < this.reloadEndAt) return;

    const spec = this.current;
    const want = spec.magSize - this.magAmmo;
    const take = Math.min(want, this.reserveAmmo);
    this.magAmmo += take;
    this.reserveAmmo -= take;
    this.storeAmmo();
    this.reloading = false;
    this.reloadPending = null;
    this.ctx.events.emit('weapon:reload:end', { weapon: spec.id });
    this.ctx.events.emit('weapon:ammo', { mag: this.magAmmo, reserve: this.reserveAmmo });
  }

  // -------------------------------------------------------------------------
  // Switching
  // -------------------------------------------------------------------------

  private requestSwitch(id: WeaponId) {
    if (id === this.current.id || this.switching) return;
    this.storeAmmo();
    this.pendingSwitch = id;
    this.switching = true;
    this.switchPhase = 'out';
    this.switchAt = this.ctx.elapsed + this.current.drawTime * 0.4;
    this.animator.beginSwitchOut();
    if (this.reloading) {
      this.reloading = false;
      this.reloadPending = null;
      this.animator.cancelReload();
    }
  }

  private cycleWeapon(dir: number) {
    const n = WEAPON_ORDER.length;
    const next = WEAPON_ORDER[(this.orderIndex + dir + n) % n];
    this.requestSwitch(next);
  }

  private updateSwitch(t: number) {
    if (!this.switching || t < this.switchAt) return;
    if (this.switchPhase === 'out' && this.pendingSwitch) {
      const from = this.current.id;
      const to = this.pendingSwitch;
      this.vm.setWeapon(to);
      this.current = WEAPON_SPECS[to];
      this.orderIndex = WEAPON_ORDER.indexOf(to);
      this.loadAmmo();
      this.animator.beginSwitchIn();
      this.switchPhase = 'in';
      this.switchAt = t + this.current.drawTime * 0.6;
      this.pendingSwitch = null;
      this.ctx.events.emit('weapon:switch', { from, to });
      this.ctx.events.emit('weapon:ammo', { mag: this.magAmmo, reserve: this.reserveAmmo });
    } else {
      this.switching = false;
    }
  }

  // -------------------------------------------------------------------------
  // Melee
  // -------------------------------------------------------------------------

  private doMelee(ctx: EngineContext, player: IPlayer | null) {
    this.animator.melee();
    if (!player || !ctx.has('physics')) return;
    const phys = ctx.get<IPhysics>('physics');
    ctx.camera.getWorldDirection(this._aim).normalize();
    const hit = phys.raycast(player.eye, this._aim, 2.4, { ignoreActorId: -1 });
    if (hit && hit.actorId != null && hit.actorId >= 0 && ctx.has('ai')) {
      const actor = ctx.get<IAiDirector>('ai').actorById(hit.actorId);
      actor?.applyDamage({
        amount: 55,
        origin: player.eye.clone(),
        point: hit.point.clone(),
        direction: this._aim.clone(),
        weapon: `${this.current.id}_melee`,
        attackerId: -1,
        kind: 'melee',
      });
      ctx.events.emit('hit:confirm', {
        headshot: false,
        lethal: (actor?.health ?? 1) - 55 <= 0,
        position: hit.point.clone(),
      });
    }
  }

  // -------------------------------------------------------------------------
  // Ammo bookkeeping
  // -------------------------------------------------------------------------

  private storeAmmo() {
    this.ammo.set(this.current.id, { mag: this.magAmmo, reserve: this.reserveAmmo });
  }
  private loadAmmo() {
    const a = this.ammo.get(this.current.id)!;
    this.magAmmo = a.mag;
    this.reserveAmmo = a.reserve;
  }
  private syncCurrent() {
    this.orderIndex = Math.max(0, WEAPON_ORDER.indexOf(this.current.id));
    this.loadAmmo();
  }

  // -------------------------------------------------------------------------
  // IWeapons
  // -------------------------------------------------------------------------

  getMuzzleWorld(outPos: THREE.Vector3, outDir: THREE.Vector3) {
    this.vm.getMuzzleWorld(outPos, outDir);
  }

  switchTo(id: WeaponId) {
    this.requestSwitch(id);
  }

  giveAmmo(rounds: number) {
    const cap = this.current.reserveAmmo * 2;
    this.reserveAmmo = Math.min(cap, this.reserveAmmo + rounds);
    this.storeAmmo();
    this.ctx.events.emit('weapon:ammo', { mag: this.magAmmo, reserve: this.reserveAmmo });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.vm.setVisible(enabled);
    if (!enabled) this.adsAmount = 0;
  }

  dispose() {
    this.animator?.dispose();
    this.ballistics?.dispose();
    this.vm?.dispose();
  }
}

function moveToward(cur: number, target: number, maxDelta: number) {
  if (cur < target) return Math.min(cur + maxDelta, target);
  return Math.max(cur - maxDelta, target);
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function shortestAngle(from: number, to: number) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
