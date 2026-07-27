import type { WeaponId } from '../core/Contracts';
import type { Rng } from '../core/MathX';

/**
 * Deterministic, learnable recoil spray patterns — the CoD/CS staple.
 *
 * Each weapon has an ordered list of per-shot [pitch, yaw] kicks in degrees.
 * `pitch` is upward climb, `yaw` is horizontal drift (signed). Sustained fire
 * walks along the pattern; when the pattern runs out it holds the last entry
 * with a touch more randomness. A small per-shot random component is layered on
 * top so the spray is recognisable but never robotic.
 *
 * The system applies part of each kick as an auto-recovering view punch and
 * lets part of it persist so long bursts genuinely climb.
 */

export interface RecoilStep {
  /** Upward view kick in degrees. */
  pitch: number;
  /** Horizontal view kick in degrees (signed). */
  yaw: number;
  /** Random cone added on top, degrees. */
  jitter: number;
}

const P = (pitch: number, yaw: number, jitter = 0.05): RecoilStep => ({ pitch, yaw, jitter });

/**
 * Patterns are authored so the first shots are near-vertical (easy to counter)
 * and later shots drift into a signature shape.
 */
const PATTERNS: Record<WeaponId, RecoilStep[]> = {
  ar_wolverine: [
    P(0.42, 0.02), P(0.5, 0.06), P(0.55, 0.12), P(0.58, 0.05), P(0.6, -0.08),
    P(0.62, -0.16), P(0.6, -0.22), P(0.58, -0.12), P(0.56, 0.1), P(0.55, 0.24),
    P(0.54, 0.3), P(0.52, 0.22), P(0.5, 0.05), P(0.5, -0.14), P(0.48, -0.26),
  ],
  smg_viper: [
    P(0.3, 0.04, 0.09), P(0.34, 0.1, 0.09), P(0.36, 0.16, 0.1), P(0.36, 0.1, 0.11),
    P(0.35, -0.06, 0.12), P(0.34, -0.18, 0.12), P(0.33, -0.24, 0.13), P(0.32, -0.14, 0.13),
    P(0.31, 0.12, 0.14), P(0.3, 0.26, 0.15),
  ],
  sniper_longbow: [P(2.2, 0.12, 0.06)],
  shotgun_breacher: [P(1.6, 0.1, 0.12)],
  pistol_sidearm: [
    P(0.7, 0.05, 0.08), P(0.74, 0.14, 0.09), P(0.72, -0.1, 0.1), P(0.7, 0.18, 0.11),
  ],
  lmg_bulwark: [
    P(0.5, 0.03, 0.06), P(0.56, 0.08, 0.07), P(0.6, 0.16, 0.08), P(0.62, 0.24, 0.09),
    P(0.62, 0.18, 0.1), P(0.6, 0.02, 0.11), P(0.58, -0.16, 0.12), P(0.56, -0.28, 0.12),
    P(0.55, -0.34, 0.13), P(0.54, -0.22, 0.13), P(0.53, 0.04, 0.14), P(0.52, 0.24, 0.14),
  ],
};

export class RecoilPattern {
  private steps: RecoilStep[];
  private index = 0;

  constructor(private id: WeaponId) {
    this.steps = PATTERNS[id];
  }

  reset() {
    this.index = 0;
  }

  /** Advance one shot; returns the pitch/yaw kick (degrees) for this shot. */
  next(rng: Rng): { pitch: number; yaw: number } {
    const idx = Math.floor(this.index);
    const i = Math.min(idx, this.steps.length - 1);
    const base = this.steps[i];
    // Beyond the authored pattern, drift a little extra so it never freezes.
    const overrun = idx >= this.steps.length ? 1 : 0;
    const jitter = base.jitter + overrun * 0.06;
    this.index++;
    return {
      pitch: base.pitch + rng.gauss(0, jitter),
      yaw: base.yaw + rng.gauss(0, jitter),
    };
  }

  /** Called when firing stops so the next burst restarts the pattern. */
  cooldown(dt: number, rate: number) {
    // Recover the pattern index at `rate` steps/sec once the trigger releases.
    this.index = Math.max(0, this.index - rate * dt);
  }
}
