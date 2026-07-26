import * as THREE from 'three';
import type { EngineContext } from '../core/Engine';
import type { IWeapons } from '../core/Contracts';
import type { PhysicsSystem } from '../physics/PhysicsSystem';
import type { PlayerState } from './PlayerMovement';
import { CameraEffects } from './CameraEffects';
import { clamp, damp, DEG } from '../core/MathX';

const LOOK_SENS = 0.0022; // radians per (pixel * user sensitivity)
const PITCH_LIMIT = 89 * DEG;
const MAX_LEAN = 0.45; // metres
const LEAN_ROLL = 14 * DEG;
const SPRINT_FOV = 9; // degrees added at full tactical sprint

/**
 * Look input + final camera assembly. Runs in `lateUpdate` (after movement) so
 * the eye transform reflects the settled body. Applies mouse look, ADS/sprint
 * FOV & sensitivity, lean (with a wall check), step-up smoothing, then adds the
 * composed {@link CameraEffects} and writes to both the world and viewmodel
 * cameras.
 */
export class PlayerCamera {
  readonly effects = new CameraEffects();

  adsAmount = 0;
  sprintAmount = 0;
  private leanAmount = 0;
  private lastFov = -1;

  constructor(private physics: PhysicsSystem) {}

  lateUpdate(dt: number, ctx: EngineContext, p: PlayerState) {
    const input = ctx.input;
    const weapon = ctx.has('weapons') ? ctx.get<IWeapons>('weapons').current : null;
    const adsTime = weapon?.adsTime ?? 0.25;
    const adsFovScale = weapon?.adsFovScale ?? ctx.settings.user.adsFovScale;

    // --- ADS / sprint amounts -------------------------------------------
    const adsHeld = p.inputEnabled && input.isDown('ads') && !p.sprinting && !p.mantling;
    this.adsAmount = moveToward(this.adsAmount, adsHeld ? 1 : 0, dt / Math.max(0.05, adsTime));
    p.adsAmount = smooth(this.adsAmount);
    this.sprintAmount = damp(this.sprintAmount, p.sprinting ? 1 : 0, 0.00005, dt);

    // --- Look ------------------------------------------------------------
    let dyaw = 0;
    let dpitch = 0;
    if (p.inputEnabled) {
      const [dx, dy] = input.consumeLook();
      const sens = LOOK_SENS * (1 - (1 - ctx.settings.user.adsSensitivity) * p.adsAmount);
      dyaw = -dx * sens;
      dpitch = -dy * sens;
      p.yaw += dyaw;
      p.pitch = clamp(p.pitch + dpitch, -PITCH_LIMIT, PITCH_LIMIT);
    }
    this.effects.addLook(dyaw, dpitch);

    // --- Lean (with wall check) -----------------------------------------
    const cosY = Math.cos(p.yaw);
    const sinY = Math.sin(p.yaw);
    _right.set(cosY, 0, -sinY);
    _fwd.set(-sinY, 0, -cosY);
    _eye.copy(p.position);
    _eye.y += p.eyeHeight + p.stepSmooth;

    let leanInput = 0;
    if (p.inputEnabled && p.grounded && !p.sliding) {
      leanInput = (input.isDown('lean_right') ? 1 : 0) - (input.isDown('lean_left') ? 1 : 0);
    }
    let leanTarget = leanInput;
    if (leanInput !== 0) {
      _dir.copy(_right).multiplyScalar(Math.sign(leanInput));
      const hit = this.physics.raycast(_eye, _dir, MAX_LEAN + 0.35, { staticOnly: true });
      if (hit) leanTarget = Math.sign(leanInput) * clamp((hit.distance - 0.35) / MAX_LEAN, 0, 1);
    }
    this.leanAmount = damp(this.leanAmount, leanTarget, 0.0001, dt);

    // --- Compose effects -------------------------------------------------
    this.effects.compose(
      dt,
      p,
      this.sprintAmount,
      ctx.settings.user.viewBob,
      ctx.settings.user.cameraShake
    );

    // --- FOV -------------------------------------------------------------
    const baseFov = ctx.settings.user.fov;
    let fov = baseFov + SPRINT_FOV * this.sprintAmount;
    fov = THREE.MathUtils.lerp(fov, baseFov * adsFovScale, p.adsAmount);
    if (Math.abs(fov - this.lastFov) > 0.01) {
      ctx.camera.fov = fov;
      ctx.camera.updateProjectionMatrix();
      this.lastFov = fov;
    }

    // --- Final transform -------------------------------------------------
    const e = this.effects;
    const leanOff = this.leanAmount * MAX_LEAN;
    const leanRoll = this.leanAmount * LEAN_ROLL;

    _pos.copy(_eye);
    _pos.addScaledVector(_right, e.posOffset.x + leanOff);
    _pos.y += e.posOffset.y;
    _pos.addScaledVector(_fwd, e.posOffset.z);

    const pitch = clamp(p.pitch + e.pitch, -PITCH_LIMIT - 0.2, PITCH_LIMIT + 0.2);
    const yaw = p.yaw + e.yaw;
    const roll = e.roll + leanRoll;

    const cam = ctx.camera;
    cam.position.copy(_pos);
    cam.rotation.set(pitch, yaw, roll, 'YXZ');

    // Viewmodel camera shares the eye transform; FOV is the weapon's business.
    const vc = ctx.viewCamera;
    vc.position.copy(_pos);
    vc.rotation.set(pitch, yaw, roll, 'YXZ');
  }

  reset() {
    this.effects.reset();
    this.adsAmount = 0;
    this.sprintAmount = 0;
    this.leanAmount = 0;
  }
}

function moveToward(cur: number, target: number, maxDelta: number) {
  if (cur < target) return Math.min(cur + maxDelta, target);
  return Math.max(cur - maxDelta, target);
}
function smooth(x: number) {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

const _right = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _pos = new THREE.Vector3();
