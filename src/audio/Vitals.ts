/**
 * The player's body: breathing, heartbeat, and the tinnitus that follows a
 * flashbang.
 *
 * All three are state machines rather than one-shots, because their whole job is
 * to communicate a continuous quantity — how hurt and how winded the player is —
 * without ever being the loudest thing in a quiet moment.
 *
 * Breathing is scheduled as alternating in/out one-shots at a rate driven by
 * exertion and injury, crossfading between three recorded intensities. Rate and
 * level both scale, which matters: a sprinting player at full health breathes
 * fast and shallow, a wounded player standing still breathes slowly and heavily,
 * and those are different sounds rather than the same sound at two volumes.
 *
 * The heartbeat only exists below a health threshold, and its rate rises as
 * health falls. It is nearly pure sub-bass so it reads as physical rather than as
 * a warning beep.
 */
import { clamp, damp, saturate } from '../core/MathUtils';
import type { AudioEngine, SoundHandle } from './AudioEngine';

const BREATH_TAG = 'vitals:breath';
const TINNITUS_TAG = 'vitals:tinnitus';

/** Health fraction below which the heartbeat starts. */
const HEARTBEAT_THRESHOLD = 0.45;
/** Health fraction below which the low-health tone plays. */
const CRITICAL_THRESHOLD = 0.22;

export class Vitals {
  /** 0..1 health fraction. */
  private health = 1;
  /** 0..1 exertion from sprinting and movement. */
  private exertion = 0;
  private exertionTarget = 0;
  private alive = true;

  private breathTimer = 1.2;
  private breathInhale = true;
  private heartTimer = 0;
  private criticalTimer = 0;

  private tinnitus: SoundHandle | null = null;
  private tinnitusLevel = 0;

  constructor(private readonly engine: AudioEngine) {}

  setHealth(fraction: number): void {
    this.health = saturate(fraction);
  }

  setExertion(v: number): void {
    this.exertionTarget = saturate(v);
  }

  setAlive(alive: boolean): void {
    this.alive = alive;
    if (!alive) {
      this.engine.stopTagged(BREATH_TAG, 0.3);
      this.heartTimer = 0;
      this.criticalTimer = 0;
    }
  }

  /** Effort level 0..1, the input to breathing rate and depth. */
  private get effort(): number {
    // Injury contributes to how hard the breathing sounds even at rest: a player
    // on 20 health is gasping whether or not they are moving.
    return saturate(this.exertion * 0.75 + (1 - this.health) * 0.55);
  }

  update(dt: number, deafen: number): void {
    if (!this.engine.ok) return;
    this.exertion = damp(this.exertion, this.exertionTarget, 2.2, dt);
    this.updateTinnitus(deafen);
    if (!this.alive) return;
    this.updateBreath(dt);
    this.updateHeart(dt);
  }

  private updateBreath(dt: number): void {
    const effort = this.effort;
    // Nothing to hear from a healthy, stationary player. Breathing that is
    // always present becomes wallpaper and stops carrying information.
    if (effort < 0.12) {
      this.breathTimer = 1.4;
      return;
    }
    this.breathTimer -= dt;
    if (this.breathTimer > 0) return;

    // 4.5 s per cycle at rest down to 1.1 s when gasping.
    const cycle = 4.5 - 3.4 * effort;
    const id = `player_breath_${this.breathInhale ? 'in' : 'out'}_${tierFor(effort)}`;
    this.engine.play2D(id, {
      // The exhale is the louder half of the cycle.
      volume: (0.4 + 0.6 * effort) * (this.breathInhale ? 0.85 : 1),
      tag: BREATH_TAG,
      immediate: true,
      noOcclusion: true,
      priorityScale: 0.5,
    });
    // The gap between inhale and exhale is much shorter than between cycles.
    this.breathTimer = this.breathInhale ? cycle * 0.22 : cycle * 0.78;
    this.breathInhale = !this.breathInhale;
  }

  private updateHeart(dt: number): void {
    if (this.health >= HEARTBEAT_THRESHOLD) {
      this.heartTimer = 0;
      this.criticalTimer = 0;
      return;
    }
    const urgency = saturate((HEARTBEAT_THRESHOLD - this.health) / HEARTBEAT_THRESHOLD);
    this.heartTimer -= dt;
    if (this.heartTimer <= 0) {
      // 78 bpm at the threshold rising to 150 bpm at death's door.
      const bpm = 78 + 72 * urgency;
      this.heartTimer = 60 / bpm;
      this.engine.play2D('heartbeat', {
        volume: 0.35 + 0.65 * urgency,
        pitch: 0.96 + 0.1 * urgency,
        tag: BREATH_TAG,
        immediate: true,
        noOcclusion: true,
        priorityScale: 0.7,
      });
    }

    if (this.health >= CRITICAL_THRESHOLD) {
      this.criticalTimer = 0;
      return;
    }
    this.criticalTimer -= dt;
    if (this.criticalTimer <= 0) {
      this.criticalTimer = 2.6;
      this.engine.play2D('low_health', { volume: 0.55, immediate: true, noOcclusion: true });
    }
  }

  /**
   * The tinnitus tone tracks the deafen amount and routes around the deafen
   * low-pass, so it gets *louder* as everything else is muffled — which is the
   * whole point of the effect.
   */
  private updateTinnitus(deafen: number): void {
    const target = deafen > 0.08 ? clamp(deafen * 1.15, 0, 1) : 0;
    if (target <= 0.001) {
      if (this.tinnitus) {
        this.tinnitus.stop(0.6);
        this.tinnitus = null;
        this.tinnitusLevel = 0;
      }
      return;
    }
    if (!this.tinnitus || !this.tinnitus.alive) {
      this.tinnitus = this.engine.play2D('tinnitus', {
        volume: 0.001,
        loop: true,
        tag: TINNITUS_TAG,
        // Bypasses the deafen chain: this is the one voice that must stay bright.
        direct: true,
        immediate: true,
        noOcclusion: true,
        priorityScale: 2,
      });
      this.tinnitusLevel = 0;
      if (!this.tinnitus.alive) return;
    }
    if (Math.abs(target - this.tinnitusLevel) > 0.01) {
      this.tinnitus.setVolume(target, 0.25);
      // The ringing drifts down in pitch as it fades, as real temporary
      // threshold shift does.
      this.tinnitus.setPitch(0.9 + 0.12 * target, 0.4);
      this.tinnitusLevel = target;
    }
  }

  stop(): void {
    this.engine.stopTagged(BREATH_TAG, 0.2);
    this.tinnitus?.stop(0.3);
    this.tinnitus = null;
    this.tinnitusLevel = 0;
  }
}

function tierFor(effort: number): string {
  if (effort > 0.68) return 'hard';
  if (effort > 0.34) return 'work';
  return 'calm';
}
