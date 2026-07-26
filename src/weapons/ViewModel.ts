import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import type { WeaponSystem } from './WeaponSystem';
import type { PlayerSystem } from '../player/Player';
import type { LevelSystem } from '../world/Level';
import type { WeaponDef } from './WeaponDefs';
import { buildWeaponModel, type WeaponModel } from './WeaponMesh';

/**
 * The first-person view model.
 *
 * Nearly all of the "feel" of a shooter lives here. The weapon is driven by a
 * stack of independent additive layers rather than by baked animation:
 *
 *   rest pose → ADS blend → sway (spring) → bob (gait) → breathing →
 *   recoil (spring) → reload procedural → sprint pose → landing dip
 *
 * Each layer is a critically-or-under-damped spring, so the weapon has
 * consistent mass across every action instead of snapping between authored
 * keyframes. The result reads as a heavy object held by a person, which is
 * what separates a convincing FPS from one where the gun is glued to the
 * camera.
 */
export class ViewModelSystem implements System {
  readonly name = 'viewmodel';
  readonly order = 60;

  private ctx!: EngineContext;
  private weapons!: WeaponSystem;
  private player!: PlayerSystem;

  private readonly root = new THREE.Group();
  private readonly models = new Map<string, WeaponModel>();
  private current: WeaponModel | null = null;

  // ---- animation state ----
  private readonly swayPos = new THREE.Vector3();
  private readonly swayVel = new THREE.Vector3();
  private readonly swayRot = new THREE.Vector3();
  private readonly swayRotVel = new THREE.Vector3();

  private recoilPos = 0;
  private recoilPosVel = 0;
  private recoilRot = 0;
  private recoilRotVel = 0;
  private recoilYaw = 0;
  private recoilYawVel = 0;

  private bobPhase = 0;
  private breathPhase = 0;
  private reloadClock = -1;
  private reloadDuration = 1;
  private reloadEmpty = false;
  private inspectClock = -1;

  private readonly _mouse = { x: 0, y: 0 };
  private readonly _tmpV = new THREE.Vector3();
  private readonly _tmpE = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly _tmpQ = new THREE.Quaternion();

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.weapons = ctx.get<WeaponSystem>('weapons')!;
    this.player = ctx.get<PlayerSystem>('player')!;
    const level = ctx.get<LevelSystem>('level')!;

    this.root.name = 'viewmodel';
    ctx.viewScene.add(this.root);

    for (const slot of this.weapons.slots) {
      const model = buildWeaponModel(slot.def, level.materials);
      model.group.visible = false;
      this.root.add(model.group);
      this.models.set(slot.def.id, model);
    }
    this.setActive(this.weapons.def.id);

    Signals.on('weapon:fire', ({ weaponId }) => {
      const def = this.weapons.def;
      if (def.id !== weaponId) return;
      const ads = this.weapons.adsProgress;
      // Under-damped springs: the kick overshoots and settles, which is what
      // makes a weapon read as recoiling rather than teleporting.
      this.recoilPosVel -= def.recoil.kickback * (1 - ads * 0.45) * 62;
      this.recoilRotVel -= def.recoil.visualPitch * (1 - ads * 0.4) * 46;
      this.recoilYawVel += (Math.random() - 0.5) * def.recoil.visualPitch * 30;
      this.current?.onFire();
    });

    Signals.on('weapon:reloadStart', ({ duration, tactical }) => {
      this.reloadClock = 0;
      this.reloadDuration = duration;
      this.reloadEmpty = !tactical;
    });
    Signals.on('weapon:reloadEnd', () => {
      this.reloadClock = -1;
    });
    Signals.on('weapon:switch', ({ toId }) => this.setActive(toId));
  }

  private setActive(id: string): void {
    for (const [key, m] of this.models) m.group.visible = key === id;
    this.current = this.models.get(id) ?? null;
  }

  update(dt: number, ctx: EngineContext): void {
    if (!this.current) return;
    const def = this.weapons.def;
    const input = ctx.input;
    const ads = this.weapons.adsProgress;

    // Read look delta without consuming it (the player already consumed it,
    // so mirror from the player's stored sway instead).
    this._mouse.x = 0;
    this._mouse.y = 0;

    // ---- sway from look velocity ----
    const lookVel = this.player['swayVelocity' as keyof PlayerSystem] as unknown as THREE.Vector2 | undefined;
    const lx = lookVel ? lookVel.x : 0;
    const ly = lookVel ? lookVel.y : 0;

    const swayScale = THREE.MathUtils.lerp(1, 0.28, ads);
    this.swayVel.x += -lx * 0.55 * swayScale;
    this.swayVel.y += -ly * 0.45 * swayScale;
    this.swayRotVel.y += lx * 1.6 * swayScale;
    this.swayRotVel.x += -ly * 1.4 * swayScale;

    springDamp3(this.swayPos, this.swayVel, 165, 21, dt);
    springDamp3(this.swayRot, this.swayRotVel, 145, 19, dt);
    this.swayPos.clampScalar(-0.06, 0.06);
    this.swayRot.clampScalar(-0.16, 0.16);

    // ---- recoil springs ----
    const recoilStiffness = THREE.MathUtils.lerp(210, 320, ads);
    const recoilDamping = THREE.MathUtils.lerp(21, 27, ads);
    [this.recoilPos, this.recoilPosVel] = spring1(this.recoilPos, this.recoilPosVel, recoilStiffness, recoilDamping, dt);
    [this.recoilRot, this.recoilRotVel] = spring1(this.recoilRot, this.recoilRotVel, recoilStiffness, recoilDamping, dt);
    [this.recoilYaw, this.recoilYawVel] = spring1(this.recoilYaw, this.recoilYawVel, recoilStiffness * 0.8, recoilDamping, dt);

    // ---- gait ----
    const speed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    const moving = this.player.grounded && speed > 0.4;
    const bobFreq = this.player.sprinting ? 9.4 : 7.2;
    if (moving) this.bobPhase += dt * bobFreq * THREE.MathUtils.clamp(speed / 4.1, 0.5, 1.7);
    const bobStrength = THREE.MathUtils.lerp(
      moving ? THREE.MathUtils.clamp(speed / 6.9, 0, 1) : 0,
      0,
      ads * 0.82,
    );

    this.breathPhase += dt * (ads ? 1.1 : 1.5);

    // ---- pose blend ----
    const hipPos = def.hipPosition;
    const adsPos = def.adsPosition;
    // Ease the ADS blend: a linear lerp reads as mechanical. This curve is
    // fast out of the hip and settles gently onto the sight picture.
    const adsEase = ads * ads * (3 - 2 * ads);

    this._tmpV.lerpVectors(hipPos, adsPos, adsEase);

    const hipRot = def.hipRotation;
    const adsRot = def.adsRotation;
    this._tmpE.set(
      THREE.MathUtils.lerp(hipRot.x, adsRot.x, adsEase),
      THREE.MathUtils.lerp(hipRot.y, adsRot.y, adsEase),
      THREE.MathUtils.lerp(hipRot.z, adsRot.z, adsEase),
      'YXZ',
    );

    // ---- sprint pose ----
    const sprintBlend = THREE.MathUtils.clamp(
      (this.player.sprinting ? 1 : 0) * (1 - ads), 0, 1,
    );
    const sprintTarget = this.current.sprintPose;
    this.current.sprintBlend = THREE.MathUtils.damp(this.current.sprintBlend, sprintBlend, 9, dt);
    const sb = this.current.sprintBlend;

    this._tmpV.lerp(sprintTarget.position, sb);
    this._tmpE.x = THREE.MathUtils.lerp(this._tmpE.x, sprintTarget.rotation.x, sb);
    this._tmpE.y = THREE.MathUtils.lerp(this._tmpE.y, sprintTarget.rotation.y, sb);
    this._tmpE.z = THREE.MathUtils.lerp(this._tmpE.z, sprintTarget.rotation.z, sb);

    // ---- reload ----
    let reloadPos = new THREE.Vector3();
    let reloadRot = new THREE.Euler(0, 0, 0, 'YXZ');
    if (this.reloadClock >= 0) {
      this.reloadClock += dt;
      const t = THREE.MathUtils.clamp(this.reloadClock / this.reloadDuration, 0, 1);
      const anim = reloadCurve(t, this.reloadEmpty);
      reloadPos = anim.position;
      reloadRot = anim.rotation;
      this.current.setMagazineVisible(anim.magVisible);
      this.current.setBoltBack(anim.bolt);
      if (this.reloadClock >= this.reloadDuration) {
        this.reloadClock = -1;
        this.current.setMagazineVisible(true);
        this.current.setBoltBack(0);
      }
    }

    // ---- inspect ----
    if (input.pressed('inspect') && this.inspectClock < 0 && this.reloadClock < 0) this.inspectClock = 0;
    let inspectRot = new THREE.Euler(0, 0, 0, 'YXZ');
    let inspectPos = new THREE.Vector3();
    if (this.inspectClock >= 0) {
      this.inspectClock += dt;
      const t = this.inspectClock / 2.4;
      if (t >= 1) {
        this.inspectClock = -1;
      } else {
        const e = Math.sin(t * Math.PI);
        inspectRot.set(-0.42 * e, 0.62 * e, 0.24 * e, 'YXZ');
        inspectPos.set(-0.05 * e, 0.03 * e, 0.1 * e);
      }
    }

    // ---- assemble ----
    const bobX = Math.sin(this.bobPhase) * 0.021 * bobStrength;
    const bobY = -Math.abs(Math.cos(this.bobPhase)) * 0.017 * bobStrength;
    const bobRoll = Math.sin(this.bobPhase) * 0.028 * bobStrength;
    const bobPitch = Math.cos(this.bobPhase * 2) * 0.012 * bobStrength;

    const breathY = Math.sin(this.breathPhase) * (ads > 0.5 ? 0.0016 : 0.0042);
    const breathX = Math.sin(this.breathPhase * 0.63) * (ads > 0.5 ? 0.0012 : 0.0031);

    // A weapon that has just been fired sits slightly lower and further back.
    const raise = this.weapons.raise;
    const lowered = (1 - raise) * 0.45;

    this.root.position.set(
      this._tmpV.x + this.swayPos.x + bobX + breathX + reloadPos.x + inspectPos.x,
      this._tmpV.y + this.swayPos.y + bobY + breathY + reloadPos.y + inspectPos.y - lowered,
      this._tmpV.z + this.swayPos.z + this.recoilPos + reloadPos.z + inspectPos.z,
    );

    this.root.rotation.set(
      this._tmpE.x + this.swayRot.x + bobPitch + this.recoilRot + reloadRot.x + inspectRot.x + lowered * 1.1,
      this._tmpE.y + this.swayRot.y + reloadRot.y + inspectRot.y + this.recoilYaw,
      this._tmpE.z + this.swayRot.z + bobRoll + reloadRot.z + inspectRot.z,
      'YXZ',
    );

    this.current.update(dt, ads, ctx.time.elapsed);

    // The view camera keeps a fixed FOV so the weapon does not distort when
    // the world FOV changes for sprint; only ADS narrows it, and only a
    // little, so the optic grows without the arms ballooning.
    const targetFov = THREE.MathUtils.lerp(60, 48, adsEase);
    if (Math.abs(ctx.viewCamera.fov - targetFov) > 0.02) {
      ctx.viewCamera.fov = targetFov;
      ctx.viewCamera.updateProjectionMatrix();
    }
    void this._tmpQ;
  }

  /** World-space muzzle position, for VFX that must line up exactly. */
  getMuzzleWorld(out: THREE.Vector3): THREE.Vector3 {
    if (!this.current) return out.set(0, 0, 0);
    this.current.muzzle.getWorldPosition(out);
    // The view scene has its own camera; convert into world space by
    // reapplying the world camera transform.
    const vc = this.ctx.viewCamera;
    out.applyMatrix4(vc.matrixWorldInverse);
    out.applyMatrix4(this.ctx.camera.matrixWorld);
    return out;
  }

  dispose(): void {
    for (const m of this.models.values()) m.dispose();
    this.models.clear();
  }
}

// ------------------------------------------------------------- helpers -----

function spring1(x: number, v: number, k: number, d: number, dt: number): [number, number] {
  // Semi-implicit Euler; stable at the step sizes used here and cheaper than
  // an analytic solution, with no visible difference.
  const a = -k * x - d * v;
  const nv = v + a * dt;
  const nx = x + nv * dt;
  return [nx, nv];
}

function springDamp3(pos: THREE.Vector3, vel: THREE.Vector3, k: number, d: number, dt: number): void {
  vel.x += (-k * pos.x - d * vel.x) * dt;
  vel.y += (-k * pos.y - d * vel.y) * dt;
  vel.z += (-k * pos.z - d * vel.z) * dt;
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
  pos.z += vel.z * dt;
}

interface ReloadFrame {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  magVisible: boolean;
  bolt: number;
}

/**
 * Procedural reload animation.
 *
 * Four phases: tilt the weapon in and drop the magazine, reach off-screen,
 * seat the new magazine, then (on an empty reload) run the bolt. Timings are
 * normalised so the same curve works for a 1.4 s pistol reload and a 2.9 s
 * rifle reload.
 */
function reloadCurve(t: number, empty: boolean): ReloadFrame {
  const pos = new THREE.Vector3();
  const rot = new THREE.Euler(0, 0, 0, 'YXZ');
  let magVisible = true;
  let bolt = 0;

  const ease = (a: number, b: number, x: number): number => {
    const u = THREE.MathUtils.clamp((x - a) / Math.max(b - a, 1e-4), 0, 1);
    return u * u * (3 - 2 * u);
  };

  // Phase 1 (0 - 0.22): tilt in and down as the support hand comes off.
  const tilt = ease(0, 0.18, t) * (1 - ease(0.62, 0.9, t));
  rot.z += tilt * 0.5;
  rot.y += tilt * 0.34;
  rot.x += tilt * 0.16;
  pos.y -= tilt * 0.055;
  pos.x -= tilt * 0.03;

  // Phase 2 (0.18 - 0.40): magazine drops free.
  if (t > 0.2 && t < (empty ? 0.62 : 0.58)) magVisible = false;

  // Phase 3 (0.40 - 0.70): new magazine seats — a short upward shove.
  const seat = ease(0.42, 0.58, t) * (1 - ease(0.58, 0.68, t));
  pos.y += seat * 0.022;
  rot.x -= seat * 0.09;

  // Phase 4: bolt release on an empty reload, plus a settle.
  if (empty) {
    const boltPull = ease(0.72, 0.82, t) * (1 - ease(0.82, 0.9, t));
    bolt = boltPull;
    pos.z += boltPull * 0.012;
    rot.z += boltPull * 0.1;
  }

  // Settle back to rest.
  const settle = 1 - ease(0.78, 1.0, t);
  pos.multiplyScalar(settle);
  rot.x *= settle;
  rot.y *= settle;
  rot.z *= settle;

  return { position: pos, rotation: rot, magVisible, bolt };
}

export type { WeaponDef };
