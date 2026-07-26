import * as THREE from 'three';
import { Spring, clamp, DEG } from '../core/MathX';
import type { PlayerState } from './PlayerMovement';

interface ShakeInstance {
  amp: number;
  dur: number;
  freq: number;
  age: number;
  seed: number;
  active: boolean;
}

/**
 * Additive first-person camera effects. Each effect has its own weight and
 * writes into the shared {@link posOffset} (camera-local: x=right, y=up,
 * z=forward) and pitch/yaw/roll offsets, so they compose cleanly on top of the
 * player's aim in {@link PlayerCamera}.
 */
export class CameraEffects {
  /** Camera-local positional offset (metres). */
  readonly posOffset = new THREE.Vector3();
  pitch = 0;
  yaw = 0;
  roll = 0;

  // View bob — phase is driven by distance travelled, not wall-clock time.
  private bobPhase = 0;

  // Weapon/camera sway (lagged springs fed by look velocity).
  private swayYaw = new Spring(70, 12);
  private swayPitch = new Spring(70, 12);

  // View punch / recoil — a snappy spring plus a slow-recovering residual.
  private punchPitch = new Spring(95, 13);
  private punchYaw = new Spring(95, 13);
  private punchRoll = new Spring(95, 13);

  // Landing dip.
  private landDip = new Spring(140, 15);

  private breatheT = 0;
  private recentSprint = 0;

  private shakes: ShakeInstance[] = [];
  private shakeGain = 1;

  addViewPunch(pitch: number, yaw: number, roll = 0) {
    // Snap kick (auto-recovers), plus a residual that accumulates so sustained
    // fire climbs and only recovers once firing stops.
    this.punchPitch.impulse(pitch * 11);
    this.punchPitch.target += pitch * 0.4;
    this.punchYaw.impulse(yaw * 11);
    this.punchYaw.target += yaw * 0.35;
    this.punchRoll.impulse(roll * 11);
    this.punchRoll.target += roll * 0.3;
  }

  addShake(amplitude: number, duration: number, frequency = 22) {
    if (amplitude <= 0 || duration <= 0) return;
    let slot = this.shakes.find((s) => !s.active);
    if (!slot) {
      slot = { amp: 0, dur: 0, freq: 0, age: 0, seed: 0, active: false };
      this.shakes.push(slot);
    }
    slot.amp = amplitude;
    slot.dur = duration;
    slot.freq = frequency;
    slot.age = 0;
    slot.seed = Math.random() * 100;
    slot.active = true;
  }

  onLand(impact: number) {
    // Downward dip proportional to fall speed.
    this.landDip.impulse(-clamp(impact, 0, 16) * 0.9);
  }

  /** Punch the view away from a hit coming from `fromYaw` (world radians). */
  onDamage(amount: number, relYaw: number) {
    const k = clamp(amount / 40, 0.15, 1.4);
    this.punchPitch.impulse(0.28 * k);
    this.punchYaw.impulse((relYaw >= 0 ? 1 : -1) * 0.35 * k);
    this.punchRoll.impulse((relYaw >= 0 ? 1 : -1) * 0.25 * k);
    this.addShake(0.06 * k, 0.35, 26);
  }

  /** Feed the raw look delta (radians) so sway lags fast turns. */
  addLook(dyaw: number, dpitch: number) {
    this.swayYaw.target = clamp(-dyaw * 0.5, -0.12, 0.12);
    this.swayPitch.target = clamp(-dpitch * 0.5, -0.09, 0.09);
  }

  compose(dt: number, p: PlayerState, sprintAmount: number, viewBob: number, cameraShake: number) {
    this.posOffset.set(0, 0, 0);
    this.pitch = 0;
    this.yaw = 0;
    this.roll = 0;
    this.shakeGain = clamp(cameraShake, 0, 2);

    // --- View bob --------------------------------------------------------
    const speedN = clamp(p.speed / 4.4, 0, 1.7);
    const stanceMul = p.stance === 'prone' ? 0.25 : p.stance === 'crouch' ? 0.6 : 1;
    const adsMul = 1 - 0.82 * p.adsAmount;
    const sprintMul = 1 + 0.45 * sprintAmount;
    const amp = speedN * stanceMul * adsMul * sprintMul * clamp(viewBob, 0, 2);
    if (p.grounded) this.bobPhase += p.speed * dt * 3.3;
    const ph = this.bobPhase;
    // Figure-eight: horizontal at the stride rate, vertical at twice.
    this.posOffset.x += Math.sin(ph) * amp * 0.032;
    this.posOffset.y += -Math.abs(Math.sin(ph)) * amp * 0.03 + Math.sin(ph * 2) * amp * 0.012;
    this.roll += Math.sin(ph) * amp * 0.9 * DEG;
    this.pitch += Math.sin(ph * 2) * amp * 0.35 * DEG;

    // --- Sway ------------------------------------------------------------
    this.yaw += this.swayYaw.step(dt);
    this.pitch += this.swayPitch.step(dt);
    this.posOffset.x += this.swayYaw.value * 0.06;
    this.posOffset.y += this.swayPitch.value * 0.05;
    // Targets bleed back to neutral each frame.
    this.swayYaw.target *= 1 - Math.min(1, dt * 9);
    this.swayPitch.target *= 1 - Math.min(1, dt * 9);

    // --- View punch / recoil --------------------------------------------
    this.punchPitch.target *= Math.pow(0.03, dt); // residual recovery
    this.punchYaw.target *= Math.pow(0.03, dt);
    this.punchRoll.target *= Math.pow(0.06, dt);
    this.pitch += this.punchPitch.step(dt);
    this.yaw += this.punchYaw.step(dt);
    this.roll += this.punchRoll.step(dt);

    // --- Landing dip -----------------------------------------------------
    this.landDip.target = 0;
    this.posOffset.y += this.landDip.step(dt);

    // --- Slide dip + roll ------------------------------------------------
    if (p.slideAmount > 0.001) {
      this.posOffset.y -= p.slideAmount * 0.12;
      this.roll += p.slideAmount * 4.5 * DEG;
      this.pitch += p.slideAmount * 1.5 * DEG;
    }

    // --- Mantle arc motion ----------------------------------------------
    if (p.mantleAmount > 0.001) {
      this.pitch += p.mantleAmount * 4 * DEG;
      this.roll += p.mantleAmount * 3 * DEG;
    }

    // --- Breathing -------------------------------------------------------
    this.breatheT += dt;
    if (sprintAmount > 0.3) this.recentSprint = 1;
    this.recentSprint = Math.max(0, this.recentSprint - dt * 0.5);
    const lowHealth = 1 - clamp(p.health / 100, 0, 1);
    const idle = 1 - clamp(p.speed / 1.5, 0, 1);
    const bAmp = (0.12 + 0.55 * lowHealth + 0.4 * this.recentSprint) * (0.35 + 0.65 * idle);
    this.pitch += Math.sin(this.breatheT * 1.5) * bAmp * 0.14 * DEG;
    this.roll += Math.sin(this.breatheT * 0.95) * bAmp * 0.1 * DEG;
    this.posOffset.y += Math.sin(this.breatheT * 1.5) * bAmp * 0.0018;

    // --- Camera shake (smooth noise) ------------------------------------
    this.updateShakes(dt);
  }

  private updateShakes(dt: number) {
    let px = 0,
      py = 0,
      rp = 0,
      ry = 0,
      rr = 0;
    for (const s of this.shakes) {
      if (!s.active) continue;
      s.age += dt;
      if (s.age >= s.dur) {
        s.active = false;
        continue;
      }
      const env = 1 - s.age / s.dur;
      const e = env * env * this.shakeGain;
      const t = s.age * s.freq;
      rp += smoothNoise(t, s.seed) * s.amp * e;
      ry += smoothNoise(t, s.seed + 11.3) * s.amp * e;
      rr += smoothNoise(t, s.seed + 27.7) * s.amp * e * 0.8;
      px += smoothNoise(t, s.seed + 5.1) * s.amp * e * 0.06;
      py += smoothNoise(t, s.seed + 19.9) * s.amp * e * 0.06;
    }
    this.pitch += rp;
    this.yaw += ry;
    this.roll += rr;
    this.posOffset.x += px;
    this.posOffset.y += py;
  }

  reset() {
    this.punchPitch.reset();
    this.punchYaw.reset();
    this.punchRoll.reset();
    this.landDip.reset();
    this.swayYaw.reset();
    this.swayPitch.reset();
    for (const s of this.shakes) s.active = false;
  }
}

/** Smooth, deterministic pseudo-noise in [-1, 1] — not per-frame jitter. */
function smoothNoise(t: number, seed: number): number {
  return (
    Math.sin(t * 1.0 + seed) * 0.6 +
    Math.sin(t * 2.27 + seed * 1.7) * 0.3 +
    Math.sin(t * 4.73 + seed * 2.31) * 0.1
  );
}
