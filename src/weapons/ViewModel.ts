import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import type { WeaponSystem } from './WeaponSystem';
import type { PlayerSystem } from '../player/Player';
import type { LevelSystem } from '../world/Level';
import type { WeaponDef } from './WeaponDefs';
import { buildWeaponModel, type WeaponFrame, type WeaponModel } from './WeaponMesh';

/**
 * The first-person view model.
 *
 * Nearly all of the "feel" of a shooter lives here. The weapon is driven by a
 * stack of independent additive layers rather than by baked animation:
 *
 *   rest pose → ADS blend → sway (spring) → bob (gait) → breathing → idle
 *   drift → recoil (6-DOF spring) → reload procedural → sprint pose → lower
 *
 * Each layer is an under-damped spring, so the weapon carries consistent mass
 * across every action instead of snapping between authored keyframes. The
 * result reads as a heavy object held by a person, which is what separates a
 * convincing FPS from one where the gun is welded to the camera.
 */
export class ViewModelSystem implements System {
  readonly name = 'viewmodel';
  readonly order = 60;

  private ctx!: EngineContext;
  private weapons!: WeaponSystem;
  private player!: PlayerSystem;

  private readonly root = new THREE.Group();
  private readonly models = new Map<string, WeaponModel>();
  /**
   * ADS pose solved from each model's own optic rather than authored by hand:
   * the pose that puts the optical axis exactly on the camera axis at the
   * optic's eye relief. Hand-tuned numbers drift out of alignment the moment
   * anything about the optic geometry moves, and a sight picture that is two
   * millimetres off is both immediately visible and maddening to aim with.
   */
  private readonly adsPose = new Map<string, { pos: THREE.Vector3; rot: THREE.Euler }>();
  private current: WeaponModel | null = null;

  // ---- animation state ----
  private readonly swayPos = new THREE.Vector3();
  private readonly swayVel = new THREE.Vector3();
  private readonly swayRot = new THREE.Vector3();
  private readonly swayRotVel = new THREE.Vector3();

  private readonly recoilPos = new THREE.Vector3();
  private readonly recoilPosVel = new THREE.Vector3();
  private readonly recoilRot = new THREE.Vector3();
  private readonly recoilRotVel = new THREE.Vector3();
  /** Pitch impulse still waiting to be delivered; see `update`. */
  private pitchPending = 0;
  private climb = 0;

  private bobPhase = 0;
  private breathPhase = 0;
  private idlePhase = 0;
  private reloadClock = -1;
  private reloadDuration = 1;
  private reloadEmpty = false;
  private inspectClock = -1;
  private landDip = 0;
  private landDipVel = 0;
  private wasGrounded = true;

  private readonly lookQuat = new THREE.Quaternion();
  private lookInit = false;

  private readonly _tmpV = new THREE.Vector3();
  private readonly _tmpV2 = new THREE.Vector3();
  private readonly _tmpE = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly _tmpQ = new THREE.Quaternion();
  private readonly _frame: WeaponFrame = {
    dt: 0,
    ads: 0,
    elapsed: 0,
    eye: new THREE.Vector3(),
  };
  private readonly _reloadPos = new THREE.Vector3();
  private readonly _reloadRot = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly _extraPos = new THREE.Vector3();
  private readonly _extraRot = new THREE.Euler(0, 0, 0, 'YXZ');

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.weapons = ctx.get<WeaponSystem>('weapons')!;
    this.player = ctx.get<PlayerSystem>('player')!;
    const level = ctx.get<LevelSystem>('level')!;

    // The view camera is moved to the player's world position every frame, so
    // a view model parented to the scene root sits tens of metres behind it
    // and falls outside the 12 m far plane — which is exactly why the weapon
    // was not being drawn at all. Hanging the model off the camera makes the
    // pose camera-relative by construction, and picks up the shake applied
    // after this system runs for free.
    this.root.name = 'viewmodel';
    ctx.viewScene.add(ctx.viewCamera);
    ctx.viewCamera.add(this.root);

    // A key that travels with the camera. The scene's own view lights are
    // fixed in world space, so with the sun behind the player the weapon has
    // no form at all; this guarantees a highlight down the top plane of the
    // receiver and a rim on the near edge whatever direction the player faces.
    const key = new THREE.DirectionalLight(0xfff2e2, 1.15);
    key.position.set(-0.55, 0.85, 0.35);
    const keyTarget = new THREE.Object3D();
    keyTarget.position.set(0.05, -0.10, -0.40);
    key.target = keyTarget;
    const rim = new THREE.DirectionalLight(0xbcd4ff, 0.55);
    rim.position.set(0.75, 0.25, -0.9);
    const rimTarget = new THREE.Object3D();
    rimTarget.position.set(0.05, -0.10, -0.30);
    rim.target = rimTarget;
    ctx.viewCamera.add(key, keyTarget, rim, rimTarget);

    for (const slot of this.weapons.slots) {
      const model = buildWeaponModel(slot.def, level.materials);
      model.group.visible = false;
      this.root.add(model.group);
      this.models.set(slot.def.id, model);
      this.adsPose.set(slot.def.id, solveAdsPose(slot.def, model));
      model.sprintPose.position.set(
        slot.def.hipPosition.x + 0.052,
        slot.def.hipPosition.y - 0.055,
        slot.def.hipPosition.z + 0.045,
      );
    }
    this.setActive(this.weapons.def.id);

    Signals.on('weapon:fire', ({ weaponId }) => {
      if (this.weapons.def.id !== weaponId) return;
      this.kick(this.weapons.def, this.weapons.adsProgress);
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

  /**
   * Recoil impulse.
   *
   * A shot is a sequence, not an offset. The rearward travel is instant
   * because that is what the shoulder actually feels; the muzzle rise is
   * delivered over the next thirty milliseconds through `pitchPending`,
   * because the barrel climbs *after* the bolt has started moving and a
   * simultaneous kick reads as a single flat jolt. Aiming cuts the
   * translation hard but only trims the rotation, which is why an aimed
   * burst looks controlled without looking inert.
   */
  private kick(def: WeaponDef, ads: number): void {
    const r = def.recoil;
    const trans = 1 - ads * 0.62;
    const rot = 1 - ads * 0.26;
    const sign = Math.random() < 0.5 ? -1 : 1;

    this.recoilPosVel.z += r.kickback * 62 * trans;
    this.recoilPosVel.y += r.kickback * 11 * trans;
    this.recoilPosVel.x += sign * r.kickback * 14 * trans;

    this.pitchPending += r.visualPitch * 52 * rot;
    this.recoilRotVel.y += sign * r.visualPitch * 12 * rot;
    this.recoilRotVel.z += -sign * r.visualPitch * 26 * rot;

    // Sustained fire walks the muzzle up and it does not come all the way
    // back between shots, which is what makes a long burst feel like work.
    this.climb = Math.min(this.climb + r.visualPitch * 0.34, r.visualPitch * 3.4);
    this.current?.onFire();
  }

  update(dt: number, ctx: EngineContext): void {
    if (!this.current) return;
    const def = this.weapons.def;
    const input = ctx.input;
    const ads = this.weapons.adsProgress;
    const step = Math.min(dt, 1 / 30);

    // ---- sway from the camera's own rotation ----------------------------
    // Taken from the camera quaternion delta rather than from a private field
    // on the player: this picks up mouse look, controller look, recoil kick
    // and camera shake in one measurement, and cannot silently read undefined
    // when the player's internals are refactored.
    let yawRate = 0;
    let pitchRate = 0;
    const camQ = ctx.viewCamera.quaternion;
    if (this.lookInit && step > 1e-5) {
      this._tmpQ.copy(this.lookQuat).invert().premultiply(camQ);
      this._tmpE.setFromQuaternion(this._tmpQ, 'YXZ');
      yawRate = THREE.MathUtils.clamp(this._tmpE.y / step, -14, 14);
      pitchRate = THREE.MathUtils.clamp(this._tmpE.x / step, -14, 14);
    }
    this.lookQuat.copy(camQ);
    this.lookInit = true;

    // Look rate drives an *acceleration*, so the impulse has to be scaled by
    // the timestep. Adding a fixed nudge per frame instead — which is what
    // this did — makes the weapon trail two and a half times as far on a
    // 144 Hz display as on a 60 Hz one, and tuning it on either leaves it
    // wrong on the other.
    const swayScale = THREE.MathUtils.lerp(1, 0.24, ads) * step * 60;
    this.swayVel.x += yawRate * 0.020 * swayScale;
    this.swayVel.y += pitchRate * 0.016 * swayScale;
    this.swayRotVel.y += -yawRate * 0.30 * swayScale;
    this.swayRotVel.x += -pitchRate * 0.26 * swayScale;
    this.swayRotVel.z += yawRate * 0.34 * swayScale;

    springDamp3(this.swayPos, this.swayVel, 128, 17, step);
    springDamp3(this.swayRot, this.swayRotVel, 108, 15, step);
    this.swayPos.clampScalar(-0.055, 0.055);
    this.swayRot.clampScalar(-0.20, 0.20);

    // ---- recoil ----------------------------------------------------------
    const deliver = Math.min(1, step * 42);
    this.recoilRotVel.x += this.pitchPending * deliver;
    this.pitchPending *= 1 - deliver;

    // Translation is stiff and quick; rotation is looser and overshoots, so
    // the weapon is already coming back when the muzzle is still climbing.
    springDamp3(this.recoilPos, this.recoilPosVel, THREE.MathUtils.lerp(300, 430, ads), THREE.MathUtils.lerp(23, 29, ads), step);
    springDamp3(this.recoilRot, this.recoilRotVel, THREE.MathUtils.lerp(178, 240, ads), THREE.MathUtils.lerp(15.5, 19, ads), step);
    this.climb = THREE.MathUtils.damp(this.climb, 0, 4.2, step);

    // ---- gait ------------------------------------------------------------
    const speed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    const moving = this.player.grounded && speed > 0.4;
    const bobFreq = this.player.sprinting ? 9.1 : 7.0;
    if (moving) this.bobPhase += step * bobFreq * THREE.MathUtils.clamp(speed / 4.1, 0.5, 1.7);
    const bobStrength = THREE.MathUtils.lerp(
      moving ? THREE.MathUtils.clamp(speed / 6.6, 0, 1) : 0,
      0,
      ads * 0.85,
    );

    if (!this.player.grounded) this.wasGrounded = false;
    else if (!this.wasGrounded) {
      this.wasGrounded = true;
      this.landDipVel -= 1.9;
    }
    const [ld, ldv] = spring1(this.landDip, this.landDipVel, 210, 19, step);
    this.landDip = ld;
    this.landDipVel = ldv;

    this.breathPhase += step * (ads > 0.5 ? 1.05 : 1.5);
    this.idlePhase += step;

    // ---- pose blend ------------------------------------------------------
    const solved = this.adsPose.get(def.id);
    const adsPos = solved ? solved.pos : def.adsPosition;
    const adsRot = solved ? solved.rot : def.adsRotation;
    // Ease the ADS blend: linear reads as mechanical. Fast out of the hip,
    // settling gently onto the sight picture.
    const adsEase = ads * ads * (3 - 2 * ads);

    this._tmpV.lerpVectors(def.hipPosition, adsPos, adsEase);
    this._tmpE.set(
      THREE.MathUtils.lerp(def.hipRotation.x, adsRot.x, adsEase),
      THREE.MathUtils.lerp(def.hipRotation.y, adsRot.y, adsEase),
      THREE.MathUtils.lerp(def.hipRotation.z, adsRot.z, adsEase),
      'YXZ',
    );

    // ---- sprint ----------------------------------------------------------
    const sprintBlend = (this.player.sprinting && moving ? 1 : 0) * (1 - ads);
    this.current.sprintBlend = THREE.MathUtils.damp(this.current.sprintBlend, sprintBlend, 8.5, step);
    const sb = this.current.sprintBlend;
    const sprint = this.current.sprintPose;
    this._tmpV.lerp(sprint.position, sb);
    this._tmpE.x = THREE.MathUtils.lerp(this._tmpE.x, sprint.rotation.x, sb);
    this._tmpE.y = THREE.MathUtils.lerp(this._tmpE.y, sprint.rotation.y, sb);
    this._tmpE.z = THREE.MathUtils.lerp(this._tmpE.z, sprint.rotation.z, sb);

    // ---- reload ----------------------------------------------------------
    this._reloadPos.set(0, 0, 0);
    this._reloadRot.set(0, 0, 0, 'YXZ');
    if (this.reloadClock >= 0) {
      this.reloadClock += step;
      const t = THREE.MathUtils.clamp(this.reloadClock / this.reloadDuration, 0, 1);
      reloadCurve(t, this.reloadEmpty, this._reloadPos, this._reloadRot, this.current);
      if (this.reloadClock >= this.reloadDuration) {
        this.reloadClock = -1;
        this.current.setMagazineVisible(true);
        this.current.setBoltBack(0);
      }
    } else {
      // Last round out and the bolt stays back. It is a tiny thing that no
      // player would ever ask for and every player reads instantly: the gun
      // tells you it is empty before the ammo counter does, and the ejection
      // port standing open is the only reason a dry click needs no explaining.
      this.current.setBoltBack(this.weapons.active.mag === 0 ? 1 : 0);
    }

    // ---- inspect ---------------------------------------------------------
    this._extraPos.set(0, 0, 0);
    this._extraRot.set(0, 0, 0, 'YXZ');
    if (input.pressed('inspect') && this.inspectClock < 0 && this.reloadClock < 0) {
      this.inspectClock = 0;
    }
    if (this.inspectClock >= 0) {
      this.inspectClock += step;
      const t = this.inspectClock / 2.1;
      if (t >= 1) {
        this.inspectClock = -1;
      } else {
        // Roll the weapon over to look down the left side, hold, and return.
        const e = Math.sin(Math.min(t * 1.35, 1) * Math.PI) ** 0.7;
        this._extraRot.set(-0.30 * e, 0.66 * e, 0.52 * e, 'YXZ');
        this._extraPos.set(-0.055 * e, 0.012 * e, 0.075 * e);
      }
    }

    // ---- assemble --------------------------------------------------------
    const bobX = Math.sin(this.bobPhase) * 0.020 * bobStrength;
    const bobY = -Math.abs(Math.cos(this.bobPhase)) * 0.016 * bobStrength;
    const bobRoll = Math.sin(this.bobPhase) * 0.030 * bobStrength;
    const bobPitch = Math.cos(this.bobPhase * 2) * 0.013 * bobStrength;

    const breathAmp = ads > 0.5 ? 0.0013 : 0.0038;
    const breathY = Math.sin(this.breathPhase) * breathAmp;
    const breathX = Math.sin(this.breathPhase * 0.63) * breathAmp * 0.75;

    // Idle drift. Three decorrelated periods so the weapon never repeats and
    // never sits perfectly still — a motionless view model is the single
    // clearest tell that a gun is a prop parented to the camera.
    const idleScale = (1 - ads * 0.72) * (1 - bobStrength * 0.6);
    const idleYaw = (Math.sin(this.idlePhase * 0.47) + Math.sin(this.idlePhase * 0.83) * 0.6) * 0.0075 * idleScale;
    const idlePitch = (Math.sin(this.idlePhase * 0.61 + 1.3) + Math.sin(this.idlePhase * 1.07) * 0.5) * 0.0062 * idleScale;
    const idleRoll = Math.sin(this.idlePhase * 0.39 + 2.1) * 0.0090 * idleScale;

    const raise = this.weapons.raise;
    const lowered = (1 - raise) * (1 - raise) * 0.34;

    this.root.position.set(
      this._tmpV.x + this.swayPos.x + this.recoilPos.x + bobX + breathX + this._reloadPos.x + this._extraPos.x,
      this._tmpV.y + this.swayPos.y + this.recoilPos.y + bobY + breathY + this._reloadPos.y + this._extraPos.y - lowered + this.landDip * 0.055,
      this._tmpV.z + this.swayPos.z + this.recoilPos.z + this._reloadPos.z + this._extraPos.z,
    );

    this.root.rotation.set(
      this._tmpE.x + this.swayRot.x + this.recoilRot.x + this.climb + bobPitch + idlePitch + this._reloadRot.x + this._extraRot.x + lowered * 2.3,
      this._tmpE.y + this.swayRot.y + this.recoilRot.y + idleYaw + this._reloadRot.y + this._extraRot.y,
      this._tmpE.z + this.swayRot.z + this.recoilRot.z + bobRoll + idleRoll + this._reloadRot.z + this._extraRot.z,
      'YXZ',
    );

    this._frame.dt = step;
    this._frame.ads = ads;
    this._frame.elapsed = ctx.time.elapsed;
    this._frame.eye.copy(ctx.viewCamera.position);
    this.current.update(this._frame);

    // A fixed view FOV so the weapon does not distort when the world FOV
    // changes for sprint; only aiming narrows it, and only a little, so the
    // optic grows without the arms ballooning.
    const targetFov = THREE.MathUtils.lerp(60, 47, adsEase);
    if (Math.abs(ctx.viewCamera.fov - targetFov) > 0.02) {
      ctx.viewCamera.fov = targetFov;
      ctx.viewCamera.updateProjectionMatrix();
    }
  }

  /**
   * World-space position of a view-model point, corrected for the FOV split.
   *
   * The view model is drawn with a narrower camera than the world, so a world
   * effect placed at the view model's literal 3D position lands somewhere else
   * on screen — a muzzle flash floating off the barrel by half its own width.
   * Scaling the lateral offset by the ratio of the two half-angle tangents
   * puts the effect where the muzzle *appears*, which is the only place it can
   * be right.
   */
  private projectToWorld(node: THREE.Object3D, out: THREE.Vector3): THREE.Vector3 {
    const vc = this.ctx.viewCamera;
    const cam = this.ctx.camera;
    node.getWorldPosition(out);
    vc.worldToLocal(out);
    const k =
      Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5)) /
      Math.tan(THREE.MathUtils.degToRad(vc.fov * 0.5));
    out.x *= k;
    out.y *= k;
    return cam.localToWorld(out);
  }

  /** World-space muzzle position, for VFX that must line up exactly. */
  getMuzzleWorld(out: THREE.Vector3): THREE.Vector3 {
    if (!this.current) return out.set(0, 0, 0);
    return this.projectToWorld(this.current.muzzle, out);
  }

  /** World-space ejection port, so brass leaves the weapon and not the camera. */
  getEjectionWorld(out: THREE.Vector3): THREE.Vector3 {
    if (!this.current) return out.set(0, 0, 0);
    return this.projectToWorld(this.current.ejectionPort, out);
  }

  dispose(): void {
    for (const m of this.models.values()) m.dispose();
    this.models.clear();
    void this._tmpV2;
  }
}

// ------------------------------------------------------------- helpers -----

/**
 * Solves the aim pose: the transform that lands the optic's optical axis on
 * the camera axis, at the optic's own eye relief.
 *
 * `adsPosition` in the weapon data is kept as documentation of the intent,
 * but the number that ships is this one, because it is derived from the same
 * geometry the player is looking through.
 */
function solveAdsPose(
  def: WeaponDef,
  model: WeaponModel,
): { pos: THREE.Vector3; rot: THREE.Euler } {
  const rot = def.adsRotation.clone();
  const q = new THREE.Quaternion().setFromEuler(rot);
  const centre = model.opticCentre.position.clone().applyQuaternion(q);
  const pos = new THREE.Vector3(0, 0, -model.eyeRelief).sub(centre);
  return { pos, rot };
}

function spring1(x: number, v: number, k: number, d: number, dt: number): [number, number] {
  const nv = v + (-k * x - d * v) * dt;
  return [x + nv * dt, nv];
}

function springDamp3(pos: THREE.Vector3, vel: THREE.Vector3, k: number, d: number, dt: number): void {
  vel.x += (-k * pos.x - d * vel.x) * dt;
  vel.y += (-k * pos.y - d * vel.y) * dt;
  vel.z += (-k * pos.z - d * vel.z) * dt;
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
  pos.z += vel.z * dt;
}

/**
 * Procedural reload.
 *
 * Four phases: tilt the weapon in and drop the magazine, reach off-screen,
 * seat the new one, then run the bolt on an empty reload. Timings are
 * normalised so the same curve works for a 1.4 s pistol reload and a 2.9 s
 * rifle reload.
 */
function reloadCurve(
  t: number,
  empty: boolean,
  pos: THREE.Vector3,
  rot: THREE.Euler,
  model: WeaponModel,
): void {
  const ease = (a: number, b: number, x: number): number => {
    const u = THREE.MathUtils.clamp((x - a) / Math.max(b - a, 1e-4), 0, 1);
    return u * u * (3 - 2 * u);
  };

  // Phase 1: tilt in and down as the support hand comes off the handguard.
  const tilt = ease(0, 0.17, t) * (1 - ease(0.66, 0.92, t));
  rot.z += tilt * 0.52;
  rot.y += tilt * 0.30;
  rot.x += tilt * 0.14;
  pos.y -= tilt * 0.052;
  pos.x -= tilt * 0.028;

  // Phase 2: the magazine drops free.
  model.setMagazineVisible(!(t > 0.20 && t < (empty ? 0.60 : 0.56)));

  // Phase 3: the new magazine seats with a short upward shove.
  const seat = ease(0.42, 0.56, t) * (1 - ease(0.56, 0.68, t));
  pos.y += seat * 0.021;
  rot.x -= seat * 0.085;

  // Phase 4: bolt release on an empty reload.
  //
  // An empty reload starts with the bolt already locked back — that is what
  // makes it empty — so the bolt is held at 1 from the first frame and *drops*
  // when the hand hits the release. The first version eased it back at t=0.7
  // and forward again at t=0.9, which had the weapon cycling itself halfway
  // through a reload, backwards.
  let bolt = 0;
  if (empty) {
    bolt = 1 - ease(0.74, 0.82, t);
    // The shove is the release, not the whole travel: a short knock forward as
    // the carrier slams home, gone within a tenth of a second.
    const slam = ease(0.74, 0.80, t) * (1 - ease(0.80, 0.88, t));
    pos.z += slam * 0.011;
    rot.z += slam * 0.09;
  }
  model.setBoltBack(bolt);

  const settle = 1 - ease(0.80, 1.0, t);
  pos.multiplyScalar(settle);
  rot.x *= settle;
  rot.y *= settle;
  rot.z *= settle;
}

export type { WeaponDef };
