import * as THREE from 'three';
import type { EngineContext } from '../core/Engine';
import type { WeaponId } from '../core/Contracts';
import type { PhysicsSystem } from '../physics/PhysicsSystem';
import { Spring, Spring3, clamp, damp, smootherstep, TAU } from '../core/MathX';
import type { ViewModel } from './ViewModel';

/**
 * ViewModelAnimator — the layered, spring-driven procedural animation that
 * makes the weapon feel expensive. No imported clips. Layers, from base to top:
 *
 *   pose      hip / ADS / sprint blend (owns ADS sight-centring)
 *   overlay   reload, weapon-switch lower/raise, melee, inspect
 *   sway      idle breathing figure-8, look-lag lag, walk/sprint bob
 *   recoil    per-shot kick springs (translation + pitch/yaw/roll)
 *   parts     charging handle / slide / pump / bolt cycling, trigger finger,
 *             ejection-port cover
 */

interface Pose {
  hipPos: THREE.Vector3;
  hipEuler: THREE.Euler;
  sprintPos: THREE.Vector3;
  sprintEuler: THREE.Euler;
}

function pose(
  hp: [number, number, number],
  he: [number, number, number],
  sp: [number, number, number],
  se: [number, number, number]
): Pose {
  return {
    hipPos: new THREE.Vector3(...hp),
    hipEuler: new THREE.Euler(...he),
    sprintPos: new THREE.Vector3(...sp),
    sprintEuler: new THREE.Euler(...se),
  };
}

// Hip pose (CoD-style): offset to the lower right, pushed away from the eye so
// the gun reads small and its length recedes in perspective, with the muzzle
// yawed inward (+Y) toward screen centre and a slight cant (−Z roll).
const DEFAULT_POSE = pose(
  [0.115, -0.195, -0.45],
  [-0.1, 0.2, -0.13],
  [0.06, -0.22, -0.24],
  [-0.5, 0.7, 0.35]
);

const POSES: Partial<Record<WeaponId, Pose>> = {
  pistol_sidearm: pose(
    [0.09, -0.145, -0.32],
    [-0.01, 0.17, -0.05],
    [0.05, -0.18, -0.18],
    [-0.5, 0.7, 0.3]
  ),
  sniper_longbow: pose(
    [0.115, -0.155, -0.37],
    [-0.02, 0.18, -0.06],
    [0.06, -0.2, -0.24],
    [-0.45, 0.7, 0.35]
  ),
  lmg_bulwark: pose(
    [0.12, -0.17, -0.41],
    [-0.02, 0.2, -0.08],
    [0.07, -0.22, -0.26],
    [-0.5, 0.7, 0.4]
  ),
};

// ADS hand tuck: how far each hand anchor drops/retreats as ADS engages, so the
// gloves and sleeves sit below the sight line and behind the receiver instead of
// looming into the lens. Applied additively on top of the resting anchor.
const R_HAND_ADS = new THREE.Vector3(0.006, -0.075, -0.06); // firing hand: down + push away
const L_HAND_ADS = new THREE.Vector3(0.0, -0.042, -0.01); // support hand: down (a little grip shows)

export interface AnimParams {
  adsAmount: number;
  sprintAmount: number;
  /** Horizontal speed, m/s. */
  speed: number;
  grounded: boolean;
  /** Look deltas this frame (radians) for sway lag. */
  yawDelta: number;
  pitchDelta: number;
  /** Nothing happening → allow the idle inspect flourish. */
  idle: boolean;
}

type CycleMode = 'recip' | 'pump' | 'bolt';

export class ViewModelAnimator {
  // --- sway / bob ----------------------------------------------------------
  private bobPhase = 0;
  private swayRot = new Spring3(90, 16);
  private swayPos = new Spring3(80, 15);

  // --- recoil --------------------------------------------------------------
  private recPos = new Spring3(220, 22);
  private recPitch = new Spring(240, 20);
  private recYaw = new Spring(240, 22);
  private recRoll = new Spring(220, 22);

  // --- action / parts ------------------------------------------------------
  private cycleT = 0;
  private cycleDur = 0.07;
  private cycleMode: CycleMode = 'recip';
  private triggerPull = 0;

  // --- reload --------------------------------------------------------------
  private reloadT = 0;
  private reloadDur = 0;
  private reloadEmpty = false;
  private magDropped = false;
  reloading = false;

  // --- switch --------------------------------------------------------------
  private lowered = 0; // 0 raised .. 1 fully off-screen
  private loweredTarget = 0;

  // --- melee / inspect -----------------------------------------------------
  private meleeT = 0;
  private meleeDur = 0.45;
  private inspectT = 0;
  private idleTime = 0;

  private ctx: EngineContext;
  private dropGeo?: THREE.BufferGeometry;
  private dropMat?: THREE.Material;

  private _e = new THREE.Euler(0, 0, 0, 'YXZ');
  private _q = new THREE.Quaternion();
  private _qa = new THREE.Quaternion();
  private _p = new THREE.Vector3();
  private _wp = new THREE.Vector3();

  constructor(
    private vm: ViewModel,
    ctx: EngineContext
  ) {
    this.ctx = ctx;
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  fireKick(k: { back: number; pitch: number; yaw: number; roll: number }) {
    this.recPos.impulse(k.yaw * 0.4, 0.04 + k.pitch * 0.02, k.back);
    this.recPitch.impulse(k.pitch);
    this.recYaw.impulse(k.yaw);
    this.recRoll.impulse(k.roll);
    this.triggerPull = 1;
    const m = this.vm.current;
    // Auto/semi guns reciprocate the charging handle/slide quickly.
    if (m.action || m.charging) this.startCycle('recip', 0.075);
    this.inspectT = 0;
    this.idleTime = 0;
  }

  /** Manual pump/bolt cycle (shotgun/sniper), longer + distinct motion. */
  manualCycle(mode: 'pump' | 'bolt', duration: number) {
    this.startCycle(mode, duration);
  }

  private startCycle(mode: CycleMode, dur: number) {
    this.cycleMode = mode;
    this.cycleDur = dur;
    this.cycleT = dur;
  }

  beginReload(empty: boolean, duration: number) {
    this.reloading = true;
    this.reloadEmpty = empty;
    this.reloadDur = duration;
    this.reloadT = duration;
    this.magDropped = false;
    this.idleTime = 0;
    this.inspectT = 0;
  }

  cancelReload() {
    this.reloading = false;
    this.reloadT = 0;
    const mag = this.vm.current.mag;
    if (mag) mag.visible = true;
  }

  beginSwitchOut() {
    this.loweredTarget = 1;
  }
  beginSwitchIn() {
    this.loweredTarget = 0;
  }

  melee() {
    if (this.meleeT <= 0) this.meleeT = this.meleeDur;
    this.idleTime = 0;
    this.inspectT = 0;
  }

  reset() {
    this.recPos.reset();
    this.recPitch.reset();
    this.recYaw.reset();
    this.recRoll.reset();
    this.cycleT = 0;
    this.reloadT = 0;
    this.reloading = false;
    this.lowered = this.loweredTarget = 0;
    this.meleeT = 0;
    this.inspectT = 0;
  }

  // -------------------------------------------------------------------------
  // Per-frame
  // -------------------------------------------------------------------------

  update(dt: number, p: AnimParams) {
    const vm = this.vm;
    const poseDef = POSES[vm.currentId] ?? DEFAULT_POSE;
    const ads = clamp(p.adsAmount, 0, 1);
    const adsE = smootherstep(ads);
    // Snappy ADS with a small settle overshoot on the way in.
    const overshoot = ads > 0.001 && ads < 0.999 ? Math.sin(ads * Math.PI) * 0.06 : 0;

    // --- base pose (hip → ads → sprint) ------------------------------------
    // ADS target position centres the sight point on screen.
    const s = vm.sightLocal;
    this._p.set(-s.x, -s.y, -vm.current.adsDepth - s.z); // ads pos
    this._p.lerpVectors(poseDef.hipPos, this._p, adsE);
    this._p.lerp(poseDef.sprintPos, p.sprintAmount);
    // pull the gun in slightly on the ADS overshoot
    this._p.z -= overshoot;

    this._e.set(
      lerpAngle(poseDef.hipEuler.x, 0, adsE),
      lerpAngle(poseDef.hipEuler.y, 0, adsE),
      lerpAngle(poseDef.hipEuler.z, 0, adsE),
      'YXZ'
    );
    // blend toward sprint euler
    this._e.x = lerpAngle(this._e.x, poseDef.sprintEuler.x, p.sprintAmount);
    this._e.y = lerpAngle(this._e.y, poseDef.sprintEuler.y, p.sprintAmount);
    this._e.z = lerpAngle(this._e.z, poseDef.sprintEuler.z, p.sprintAmount);

    // --- overlays (reload / switch / melee / inspect) ----------------------
    this.applyReload(dt, this._p, this._e);
    this.applySwitch(dt, this._p, this._e);
    this.applyMelee(dt, this._p, this._e);
    this.applyInspect(dt, p, this._p, this._e);

    vm.pose.position.copy(this._p);
    vm.pose.quaternion.setFromEuler(this._e);

    // --- ADS hand tuck -----------------------------------------------------
    this.applyAdsHands(adsE);

    // --- sway: idle breathing + look-lag + bob -----------------------------
    this.updateSway(dt, p, ads);

    // --- recoil springs ----------------------------------------------------
    this.recPos.step(dt);
    const rp = this.recPitch.step(dt);
    const ry = this.recYaw.step(dt);
    const rr = this.recRoll.step(dt);
    vm.recoil.position.copy(this.recPos.value);
    this._e.set(-rp * 0.02, ry * 0.02, rr * 0.02, 'YXZ');
    vm.recoil.quaternion.setFromEuler(this._e);

    // --- moving parts ------------------------------------------------------
    this.updateParts(dt);
  }

  /**
   * In ADS the grips sit near the sight plane, so the hands (and especially the
   * forearm sleeves) would otherwise loom huge in front of the receiver. Tuck
   * the anchors down/away and collapse the sleeves as ADS engages, keeping a
   * clear sight picture with only a modest amount of hand showing. At hip
   * (adsE = 0) everything returns to the resting placement.
   */
  private applyAdsHands(adsE: number) {
    const vm = this.vm;
    vm.rightHandAnchor.position.copy(vm.rightAnchorBase).addScaledVector(R_HAND_ADS, adsE);
    vm.leftHandAnchor.position.copy(vm.leftAnchorBase).addScaledVector(L_HAND_ADS, adsE);

    // Retract the sleeves so they don't sweep toward the lens.
    const sleeve = 1 - 0.7 * adsE;
    vm.leftForearm.scale.set(sleeve, sleeve, 1 - 0.82 * adsE);
    vm.rightForearm.scale.set(sleeve, sleeve, 1 - 0.82 * adsE);

    // Curl the support fingers tighter around the handguard so they don't splay
    // up past the optic.
    const lc = 1.0 + 0.35 * adsE;
    for (const f of vm.leftFingers) f.rotation.x = lc;
  }

  private updateSway(dt: number, p: AnimParams, ads: number) {
    const vm = this.vm;
    const t = this.ctx.elapsed;
    const swayMul = 1 - ads * 0.85;

    // Idle breathing: gentle figure-eight.
    const breatheX = Math.sin(t * 1.1) * 0.006 * swayMul;
    const breatheY = Math.sin(t * 2.2) * 0.004 * swayMul;

    // Look-lag: the gun lags camera rotation, leaning into the turn.
    this.swayRot.target.set(
      clamp(-p.pitchDelta * 3.0, -0.12, 0.12),
      clamp(p.yawDelta * 3.0, -0.14, 0.14),
      clamp(-p.yawDelta * 2.2, -0.14, 0.14)
    );
    this.swayRot.target.multiplyScalar(swayMul);
    this.swayRot.step(dt);

    this.swayPos.target.set(
      clamp(p.yawDelta * 0.5, -0.02, 0.02) * swayMul,
      clamp(p.pitchDelta * 0.4, -0.02, 0.02) * swayMul,
      0
    );
    this.swayPos.step(dt);

    // Bob synced to footsteps; sprint bobs harder + faster.
    const moving = p.grounded && p.speed > 0.4;
    const sprintF = p.sprintAmount;
    const bobSpeed = (6.5 + sprintF * 4) * clamp(p.speed / 4, 0, 1.4);
    if (moving) this.bobPhase += dt * bobSpeed;
    const bobAmt = clamp(p.speed / 4, 0, 1) * (0.5 + sprintF * 0.7) * swayMul;
    const bobX = Math.cos(this.bobPhase) * 0.012 * bobAmt;
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.014 * bobAmt;

    vm.sway.position.set(
      this.swayPos.value.x + breatheX + bobX,
      this.swayPos.value.y + breatheY - bobY,
      this.swayPos.value.z
    );
    this._e.set(
      this.swayRot.value.x + bobY * 0.4,
      this.swayRot.value.y + bobX * 0.3,
      this.swayRot.value.z + bobX * 0.6,
      'YXZ'
    );
    vm.sway.quaternion.setFromEuler(this._e);
  }

  private updateParts(dt: number) {
    const m = this.vm.current;

    // Trigger finger pull.
    this.triggerPull = damp(this.triggerPull, 0, 0.0001, dt);
    if (m.trigger) m.trigger.rotation.x = this.triggerPull * 0.4;
    this.vm.triggerFinger.rotation.x = 0.35 + this.triggerPull * 0.35;

    // Action cycling.
    if (this.cycleT > 0) {
      this.cycleT = Math.max(0, this.cycleT - dt);
      const phase = 1 - this.cycleT / this.cycleDur; // 0..1
      if (this.cycleMode === 'recip') {
        const back = Math.sin(phase * Math.PI); // out and back
        if (m.charging) m.charging.position.z = (m.chargingTravel ?? 0.02) * back;
        if (m.action) m.action.position.z = (m.actionTravel ?? 0.02) * back;
        if (m.ejectionPort) m.ejectionPort.rotation.x = back * 0.9;
      } else if (this.cycleMode === 'pump') {
        // Forend racks back then forward.
        const back = Math.sin(phase * Math.PI);
        if (m.action) m.action.position.z = (m.actionTravel ?? 0.05) * back;
        if (m.ejectionPort) m.ejectionPort.rotation.x = back * 0.9;
      } else if (this.cycleMode === 'bolt') {
        // Lift → pull → push → close.
        const lift = Math.sin(clamp(phase * 2, 0, 1) * (Math.PI / 2));
        const settle = phase > 0.5 ? Math.cos((phase - 0.5) * 2 * (Math.PI / 2)) : 1;
        if (m.boltHandle) {
          m.boltHandle.rotation.z = -lift * settle * 1.2;
          m.boltHandle.position.z = Math.sin(phase * Math.PI) * (m.actionTravel ?? 0.04);
        }
        if (m.ejectionPort) m.ejectionPort.rotation.x = Math.sin(phase * Math.PI) * 0.9;
      }
    } else {
      if (m.charging) m.charging.position.z = 0;
      if (m.action && this.cycleMode !== 'pump') m.action.position.z = 0;
      if (m.action && this.cycleMode === 'pump') m.action.position.z = 0;
      if (m.ejectionPort) m.ejectionPort.rotation.x = 0;
      if (m.boltHandle) {
        m.boltHandle.rotation.z = 0;
        m.boltHandle.position.z = 0;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Overlays
  // -------------------------------------------------------------------------

  private applyReload(dt: number, pos: THREE.Vector3, e: THREE.Euler) {
    if (!this.reloading) return;
    this.reloadT = Math.max(0, this.reloadT - dt);
    const prog = 1 - this.reloadT / this.reloadDur; // 0..1
    const m = this.vm.current;

    // Bring the gun down/in and cant it toward the mag well.
    const tilt = Math.sin(prog * Math.PI);
    pos.y -= 0.06 * tilt;
    pos.x -= 0.02 * tilt;
    pos.z += 0.02 * tilt;
    e.x -= 0.35 * tilt;
    e.z += 0.5 * tilt;

    // Support hand dives to the mag well then returns.
    const handDown = prog < 0.5 ? prog / 0.5 : 1 - (prog - 0.5) / 0.5;
    this.vm.leftHandGroup.position.y = -0.12 * handDown;
    this.vm.leftHandGroup.position.z = 0.04 * handDown;

    // Mag out around 18%: hide the attached mag + spawn a physical drop.
    if (!this.magDropped && prog > 0.18) {
      this.magDropped = true;
      if (m.mag) m.mag.visible = false;
      this.spawnDroppedMag();
    }
    // New mag seated ~70%.
    if (prog > 0.7 && m.mag) m.mag.visible = true;

    // Empty reload: rack the bolt/charging handle at the very end.
    if (this.reloadEmpty && prog > 0.9 && this.cycleT <= 0) {
      this.startCycle(m.boltHandle ? 'bolt' : 'recip', 0.12);
    }

    if (this.reloadT <= 0) {
      this.reloading = false;
      this.vm.leftHandGroup.position.set(0, 0, 0);
      if (m.mag) m.mag.visible = true;
    }
  }

  private applySwitch(dt: number, pos: THREE.Vector3, e: THREE.Euler) {
    this.lowered = damp(this.lowered, this.loweredTarget, 0.00004, dt);
    if (this.lowered < 0.001) return;
    const l = smootherstep(this.lowered);
    pos.y -= 0.28 * l;
    pos.z += 0.05 * l;
    e.x -= 0.9 * l;
  }

  private applyMelee(dt: number, pos: THREE.Vector3, e: THREE.Euler) {
    if (this.meleeT <= 0) return;
    this.meleeT = Math.max(0, this.meleeT - dt);
    const prog = 1 - this.meleeT / this.meleeDur;
    // Fast swing across then recover.
    const swing = Math.sin(prog * Math.PI);
    const strike = prog < 0.4 ? prog / 0.4 : 0;
    pos.x -= 0.12 * swing;
    pos.z -= 0.1 * strike;
    e.y += 0.9 * swing;
    e.z -= 0.7 * swing;
  }

  private applyInspect(dt: number, p: AnimParams, pos: THREE.Vector3, e: THREE.Euler) {
    if (p.idle && !this.reloading && this.meleeT <= 0 && this.loweredTarget === 0) {
      this.idleTime += dt;
    } else {
      this.idleTime = 0;
    }
    const busy = this.reloading || this.meleeT > 0;
    if (this.idleTime > 6 && this.inspectT <= 0 && !busy) this.inspectT = 2.4;
    if (this.inspectT <= 0) return;
    this.inspectT = Math.max(0, this.inspectT - dt);
    const prog = 1 - this.inspectT / 2.4;
    const env = Math.sin(prog * Math.PI); // rise & fall
    // Tilt the gun up and rotate it to show the receiver.
    pos.y += 0.02 * env;
    pos.z -= 0.04 * env;
    e.y += 0.5 * env;
    e.x += 0.3 * env;
    e.z -= 0.4 * env;
  }

  private spawnDroppedMag() {
    if (!this.ctx.has('physics')) return;
    const physics = this.ctx.get<PhysicsSystem>('physics');
    if (!this.dropGeo) {
      this.dropGeo = new THREE.BoxGeometry(0.026, 0.18, 0.032);
      this.dropMat = new THREE.MeshStandardMaterial({
        color: 0x25282c,
        metalness: 0.1,
        roughness: 0.7,
      });
    }
    const mesh = new THREE.Mesh(this.dropGeo, this.dropMat!);
    mesh.castShadow = false;
    // Place it at the current mag-well in world space.
    this.vm.current.gripFront.getWorldPosition(this._wp);
    // Roughly the mag well: below the receiver near the firing hand.
    this.vm.current.gripRear.getWorldPosition(this._p);
    mesh.position.copy(this._p).addScaledVector(this._wp.sub(this._p), 0.3);
    mesh.position.y -= 0.05;
    physics.addDebris(mesh, { mass: 0.3, restitution: 0.2, friction: 0.8, ttl: 8 });
  }

  dispose() {
    this.dropGeo?.dispose();
    this.dropMat?.dispose();
  }
}

function lerpAngle(a: number, b: number, t: number) {
  let d = ((b - a + Math.PI) % TAU) - Math.PI;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}
