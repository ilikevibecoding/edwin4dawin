import * as THREE from 'three';
import type { WeaponDefinition } from '../../core/Contracts';
import { GAMEPLAY } from '../../core/Config';
import { clamp, damp, DEG2RAD, saturate } from '../../core/MathUtils';
import { SwayNoise } from './Noise';
import { PoseDelta, Spring1, Spring3, type AnimLayer } from './Spring';
import type { ViewState } from './State';

/**
 * The additive animation layers.
 *
 * Each layer is a pure function of `ViewState` plus its own spring state, and
 * contributes a position/rotation offset to the running total. Keeping them
 * separate is what makes the feel tunable: recoil can be made snappier without
 * touching sway, and sway can be quietened when aiming without special-casing
 * the recoil.
 *
 * Sign conventions in view space: -Z is downrange, +X is right, +Y is up. A
 * positive X rotation raises the muzzle, a positive Y rotation swings it right,
 * and a positive Z rotation rolls the weapon clockwise from the shooter's view.
 */

const WALK = GAMEPLAY.player.walkSpeed;

// ---------------------------------------------------------------------------
// Stance: crouch, prone, slide, sprint, airborne
// ---------------------------------------------------------------------------

export class StanceLayer implements AnimLayer<ViewState> {
  readonly name = 'stance';
  weight = 1;

  private readonly pos = new Spring3(6.5, 1.0);
  private readonly rot = new Spring3(6.0, 0.95);
  private readonly land = new Spring1(0, 4.6, 0.42);
  private wasGrounded = true;

  /** Called on touchdown; drives the dip-and-recover on landing. */
  impact(speed: number): void {
    this.land.impulse(-clamp(speed * 0.05, 0.1, 0.9));
  }

  apply(dt: number, s: ViewState, out: PoseDelta): void {
    const tp = this.pos.target.set(0, 0, 0);
    const tr = this.rot.target.set(0, 0, 0);

    // Sprint: weapon drops off the shoulder and cants inboard. Tactical sprint
    // brings it across the chest with the muzzle up, arms tucked right in.
    if (s.sprint > 0.001) {
      const tac = s.tacticalSprint ? 1 : 0;
      const w = s.sprint * (1 - s.ads * 0.9);
      tp.x += (-0.022 - 0.03 * tac) * w;
      tp.y += (-0.05 - 0.028 * tac) * w;
      tp.z += (0.028 + 0.05 * tac) * w;
      tr.x += (-0.12 + 0.5 * tac) * w;
      tr.y += (-0.3 - 0.34 * tac) * w;
      tr.z += (0.34 + 0.62 * tac) * w;
    }

    if (s.stance === 'crouch') {
      tp.y += 0.008;
      tp.z += 0.008;
      tr.x += 0.02;
    } else if (s.stance === 'prone') {
      tp.y += 0.026;
      tp.z += 0.03;
      tr.x += 0.05;
      tr.z += 0.06;
    } else if (s.stance === 'slide') {
      tp.y += 0.014;
      tp.z += 0.026;
      tr.x += 0.12;
      tr.z += 0.3;
      tr.y += -0.12;
    }

    if (!s.grounded) {
      tp.y -= 0.012;
      tr.x -= 0.05;
    }
    if (s.grounded && !this.wasGrounded) this.impact(6);
    this.wasGrounded = s.grounded;

    this.pos.step(dt);
    this.rot.step(dt);
    this.land.step(dt);

    out.addVectors(this.pos.value, this.rot.value, this.weight);
    const dip = this.land.value;
    out.addPosition(0, dip * 0.05, dip * -0.03, this.weight);
    out.addRotation(dip * 0.5, 0, dip * 0.12, this.weight);
  }

  reset(): void {
    this.pos.snap();
    this.rot.snap();
    this.land.snap(0);
  }
}

// ---------------------------------------------------------------------------
// Movement bob
// ---------------------------------------------------------------------------

/**
 * Figure-eight bob locked to the footstep cycle: the weapon traces a horizontal
 * lissajous at half the vertical rate, which is what stops walk-bob reading as a
 * simple bounce. Sprint uses a longer, heavier stride with more roll.
 */
export class MovementLayer implements AnimLayer<ViewState> {
  readonly name = 'movement';
  weight = 1;

  private amount = 0;

  apply(dt: number, s: ViewState, out: PoseDelta): void {
    const target = s.grounded ? clamp(s.speed / WALK, 0, 2.1) : 0;
    this.amount = damp(this.amount, target, 7, dt);
    if (this.amount < 1e-4) return;

    const sprint = saturate((this.amount - 1.05) / 0.9);
    const scale = GAMEPLAY.camera.bobAmount * (1 - s.ads * 0.82) * this.amount * this.weight;
    const p = s.moveCycle;

    // Horizontal sweep at the stride rate, vertical at twice it.
    const x = Math.sin(p) * (1 + sprint * 0.55);
    const y = -Math.abs(Math.cos(p)) * (0.75 + sprint * 0.5) + 0.4;
    const z = Math.sin(p * 2 + 0.6) * 0.35 * (1 + sprint);

    out.addPosition(x * scale * 1.15, y * scale, z * scale * 0.5);
    // Roll into the step, plus a little muzzle wander from the shoulder.
    out.addRotation(
      Math.cos(p * 2) * 0.055 * this.amount * (1 - s.ads * 0.85) * (1 + sprint),
      Math.sin(p) * 0.05 * this.amount * (1 - s.ads * 0.85),
      -Math.sin(p) * 0.075 * this.amount * (1 - s.ads * 0.8) * (1 + sprint * 0.8),
      this.weight,
    );
  }

  reset(): void {
    this.amount = 0;
  }
}

// ---------------------------------------------------------------------------
// Idle sway and breathing
// ---------------------------------------------------------------------------

export class SwayLayer implements AnimLayer<ViewState> {
  readonly name = 'sway';
  weight = 1;

  private readonly noise = new SwayNoise(17);
  private t = 0;
  /** Held breath (sniper) collapses the breathing component. */
  hold = 0;

  apply(dt: number, s: ViewState, out: PoseDelta): void {
    this.t += dt;
    const t = this.t;
    const adsScale = 1 - s.ads * 0.78;
    const stanceScale = s.stance === 'prone' ? 0.55 : s.stance === 'crouch' ? 0.82 : 1;
    const w = this.weight * adsScale * stanceScale * (1 - this.hold * 0.85);
    if (w < 1e-4) return;

    const n0 = this.noise.sample(t, 0, 0.16);
    const n1 = this.noise.sample(t, 1, 0.13);
    const n2 = this.noise.sample(t, 2, 0.19);
    const n3 = this.noise.sample(t, 3, 0.11);

    out.addPosition(n0 * 0.0075, n1 * 0.0055, n2 * 0.0035, w);
    out.addRotation(n1 * 0.026, n0 * 0.034, n3 * 0.02, w);

    const breath = this.noise.breath(t, GAMEPLAY.camera.breathFrequency);
    out.addPosition(0, breath * GAMEPLAY.camera.breathAmount, breath * 0.0016, w);
    out.addRotation(breath * 0.012, 0, 0, w);
  }

  reset(): void {
    this.t = 0;
  }
}

// ---------------------------------------------------------------------------
// Look lag
// ---------------------------------------------------------------------------

/**
 * Weapon inertia under mouse movement.
 *
 * The single most important effect for weight: the weapon trails the view, then
 * catches up with a small overshoot. Implemented as an underdamped spring fed an
 * impulse proportional to the look delta, so the response is frame-rate
 * independent and a fast flick produces a visible swing that settles in about a
 * third of a second.
 */
export class LookLagLayer implements AnimLayer<ViewState> {
  readonly name = 'lookLag';
  weight = 1;

  private readonly lag = new Spring3(3.4, 0.52);
  private readonly maxOffset = 0.05;

  apply(dt: number, s: ViewState, out: PoseDelta): void {
    // x from yaw, y from pitch; z carries the roll/bank term.
    this.lag.impulse(-s.lookYawDelta * 3.4, -s.lookPitchDelta * 2.8, -s.lookYawDelta * 2.2);
    this.lag.step(dt);

    const v = this.lag.value;
    const k = this.weight * (1 - s.ads * 0.62) * (1 - s.sprint * 0.4);
    const x = clamp(v.x, -this.maxOffset * 2.4, this.maxOffset * 2.4);
    const y = clamp(v.y, -this.maxOffset * 2, this.maxOffset * 2);
    const roll = clamp(v.z, -0.5, 0.5);

    out.addPosition(x * 0.42, y * 0.34, Math.abs(x) * -0.12, k);
    out.addRotation(y * 1.5, x * 1.85, -roll * 0.72, k);
  }

  reset(): void {
    this.lag.snap();
  }
}

// ---------------------------------------------------------------------------
// Recoil
// ---------------------------------------------------------------------------

/**
 * Visual weapon recoil, distinct from the camera recoil that goes to the player
 * controller. Two springs carry the per-shot impulse; a separate exponentially
 * decaying accumulator adds the climb that builds up under sustained fire and
 * bleeds off at the weapon's recovery rate.
 */
export class RecoilLayer implements AnimLayer<ViewState> {
  readonly name = 'recoil';
  weight = 1;

  private readonly kick = new Spring3(7.5, 0.5);
  private readonly twist = new Spring3(6.4, 0.44);
  private readonly climb = new THREE.Vector3();
  private recovery = 9;

  /**
   * `pitch`/`yaw` are the pattern-scaled degrees for this shot, `kickback` the
   * authored rearward travel in metres.
   */
  fire(def: WeaponDefinition, pitch: number, yaw: number, roll: number, adsAmount: number): void {
    const adsScale = 1 - adsAmount * 0.42;
    this.recovery = def.recoilRecovery;
    const kb = def.kickback * adsScale;
    this.kick.impulse(yaw * DEG2RAD * 0.5, kb * 5.5, kb * 34);
    this.twist.impulse(pitch * DEG2RAD * 9.5, yaw * DEG2RAD * 5.5, roll * 5.0);
    this.climb.x += pitch * DEG2RAD * 0.42 * adsScale;
    this.climb.y += yaw * DEG2RAD * 0.3 * adsScale;
    this.climb.z += roll * 0.18;
  }

  apply(dt: number, s: ViewState, out: PoseDelta): void {
    this.kick.step(dt);
    this.twist.step(dt);
    const f = Math.exp(-this.recovery * 0.55 * dt);
    this.climb.multiplyScalar(f);

    const k = this.weight;
    out.addPosition(this.kick.value.x, this.kick.value.y, this.kick.value.z, k);
    out.addRotation(
      this.twist.value.x + this.climb.x,
      this.twist.value.y + this.climb.y,
      this.twist.value.z + this.climb.z,
      k,
    );
    void s;
  }

  reset(): void {
    this.kick.snap();
    this.twist.snap();
    this.climb.set(0, 0, 0);
  }
}

// ---------------------------------------------------------------------------
// Clip output, injected into the stack so ordering stays declarative
// ---------------------------------------------------------------------------

export class ClipLayer implements AnimLayer<ViewState> {
  readonly name = 'clip';
  weight = 1;
  readonly position = new THREE.Vector3();
  readonly rotation = new THREE.Vector3();

  apply(_dt: number, _s: ViewState, out: PoseDelta): void {
    out.addVectors(this.position, this.rotation, this.weight);
  }

  reset(): void {
    this.position.set(0, 0, 0);
    this.rotation.set(0, 0, 0);
  }
}

// ---------------------------------------------------------------------------
// Obstruction / low ready
// ---------------------------------------------------------------------------

/**
 * Muzzle-into-wall avoidance. Rotating the weapon up about its own origin, which
 * sits just above the grip, reproduces the low-ready every shooter adopts in a
 * doorway and keeps a metre of barrel out of the plaster.
 */
export class ObstructionLayer implements AnimLayer<ViewState> {
  readonly name = 'obstruction';
  weight = 1;

  private readonly blend = new Spring1(0, 4.2, 1.0);

  apply(dt: number, s: ViewState, out: PoseDelta): void {
    this.blend.target = s.obstruction;
    const v = this.blend.step(dt);
    if (v < 1e-4) return;
    out.addPosition(-0.012 * v, -0.026 * v, 0.05 * v, this.weight);
    out.addRotation(0.62 * v, -0.1 * v, 0.14 * v, this.weight);
  }

  reset(): void {
    this.blend.snap(0);
  }
}
