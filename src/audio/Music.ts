/**
 * The adaptive score.
 *
 * Design constraints, in priority order:
 *
 *  1. It must never cost the player information. Gunfire owns 500 Hz to 8 kHz,
 *     so the score stays under 500 Hz apart from one tension layer, and the
 *     whole music bus is sidechained from the weapons bus. When a fight starts
 *     the music gets out of the way; it does not fight for the same space.
 *  2. It must never become annoying. That means sparse, mostly sustained, and —
 *     critically — willing to stop. Below the idle threshold everything fades
 *     out and the map is left to its own ambience.
 *  3. It must be tempo-locked. Percussion is scheduled ahead on the audio clock
 *     rather than triggered from `update`, so a frame-rate dip cannot make the
 *     pulse stumble. The scheduler runs one bar ahead.
 *
 * Intensity 0..1 drives four bands: a drone from the bottom, a pulse from about
 * 0.2, percussion from 0.45, and the tension layer from 0.6. Each has hysteresis
 * so a kill that briefly spikes intensity does not switch a layer on and off.
 */
import { Rng, clamp, damp, saturate } from '../core/MathUtils';
import type { AudioEngine, SoundHandle } from './AudioEngine';
import { MUSIC_TEMPO } from './sounds';

const BEAT = 60 / MUSIC_TEMPO;
const BAR = BEAT * 4;
/**
 * Schedule this far ahead of the audio clock. Every queued hit holds a pool
 * voice from the moment it is scheduled, so a full bar of lookahead parks most
 * of a bar's worth of sixteenths in the budget for nothing. Two beats still
 * absorbs a frame stall an order of magnitude worse than anything survivable.
 */
const LOOKAHEAD = BEAT * 2;
const TAG = 'music';

interface SustainLayer {
  id: string;
  /** Intensity at which the layer starts to come in. */
  from: number;
  /** Intensity at which it reaches full level. */
  to: number;
  gain: number;
}

const SUSTAINED: readonly SustainLayer[] = [
  { id: 'mus_drone', from: 0.04, to: 0.4, gain: 0.85 },
  { id: 'mus_pad', from: 0.3, to: 0.7, gain: 0.6 },
  { id: 'mus_tension', from: 0.58, to: 0.95, gain: 0.7 },
];

/**
 * One bar of percussion per intensity tier. Sixteen slots of a sixteenth each;
 * an empty slot is a rest. Sparse on purpose — the low tiers are almost silent,
 * which is what lets the high tiers actually mean something.
 */
interface Pattern {
  from: number;
  kick: readonly number[];
  taiko: readonly number[];
  rim: readonly number[];
  pulse: readonly number[];
}

const PATTERNS: readonly Pattern[] = [
  // Idle-to-alert: a heartbeat under the drone and nothing else.
  { from: 0.2, kick: [0], taiko: [], rim: [], pulse: [0, 8] },
  // Contact.
  { from: 0.45, kick: [0, 10], taiko: [6], rim: [12], pulse: [0, 4, 8, 12] },
  // Firefight.
  { from: 0.68, kick: [0, 6, 10], taiko: [3, 12], rim: [7, 14], pulse: [0, 2, 4, 6, 8, 10, 12, 14] },
  // Overwhelmed.
  {
    from: 0.86,
    kick: [0, 3, 6, 10, 13],
    taiko: [0, 8, 12],
    rim: [2, 5, 7, 11, 15],
    pulse: [0, 2, 4, 6, 8, 10, 12, 14],
  },
];

interface LiveLayer {
  handle: SoundHandle;
  level: number;
}

export class Music {
  private intensity = 0;
  private smoothed = 0;
  private enabled = true;
  private volume = 1;
  private readonly layers = new Map<string, LiveLayer>();
  private readonly rng = new Rng(0x1d3a77);
  /** Audio-clock time of the next bar to be scheduled. */
  private nextBarAt = 0;
  private bar = 0;
  /** Bars since the last riser, so the build-ups do not stack. */
  private lastRiserBar = -99;
  private lastDropBar = -99;
  private running = false;

  constructor(private readonly engine: AudioEngine) {}

  /** Target intensity, 0..1. Smoothed internally. */
  setIntensity(v: number): void {
    this.intensity = saturate(v);
  }

  get level(): number {
    return this.smoothed;
  }

  /** Music volume from the settings menu, separate from intensity. */
  setVolume(v: number): void {
    this.volume = saturate(v);
    this.enabled = this.volume > 0.001;
    if (!this.enabled) this.stop(1.2);
  }

  update(dt: number, weaponsLevel: number): void {
    if (!this.engine.ok) return;
    // Asymmetric smoothing: intensity rises quickly when a fight starts and
    // decays slowly, so the score does not flicker between states.
    const rate = this.intensity > this.smoothed ? 2.6 : 0.32;
    this.smoothed = damp(this.smoothed, this.intensity, rate, dt);

    // Sidechain. The music bus is ducked by measured weapon activity rather
    // than by a "someone is shooting" flag, so a single distant shot barely
    // moves it and sustained close fire pushes it right down.
    const duck = clamp(1 - weaponsLevel * 3.4, 0.18, 1);
    this.engine.graph?.duckMusic(this.enabled ? duck : 1, dt);

    if (!this.enabled) return;
    if (this.smoothed < 0.03) {
      if (this.running) this.stop(3.5);
      return;
    }
    this.running = true;
    this.updateSustained();
    this.scheduleBars();
  }

  private updateSustained(): void {
    for (const layer of SUSTAINED) {
      const t = saturate((this.smoothed - layer.from) / Math.max(1e-3, layer.to - layer.from));
      // Equal-power so two layers crossfading do not dip in the middle.
      const target = Math.sin(t * Math.PI * 0.5) * layer.gain * this.volume;
      const live = this.layers.get(layer.id);

      if (target < 0.005) {
        if (live) {
          live.handle.stop(2.5);
          this.layers.delete(layer.id);
        }
        continue;
      }
      if (!live || !live.handle.alive) {
        const handle = this.engine.play(layer.id, null, {
          volume: 0.0001,
          loop: true,
          tag: TAG,
          immediate: true,
          noOcclusion: true,
          priorityScale: 1.6,
        });
        if (!handle.alive) continue;
        handle.setVolume(target, 2.5);
        this.layers.set(layer.id, { handle, level: target });
        continue;
      }
      if (Math.abs(target - live.level) > 0.01) {
        live.handle.setVolume(target, 1.6);
        live.level = target;
      }
    }
  }

  /**
   * Schedule percussion up to `LOOKAHEAD` seconds ahead. Every hit is placed at
   * an absolute audio-clock time, which is the only way to keep a groove tight
   * across a frame-time spike.
   */
  private scheduleBars(): void {
    const now = this.engine.now;
    if (this.nextBarAt < now) {
      // First bar, or a resume after a suspend: restart on the next beat
      // boundary rather than immediately.
      this.nextBarAt = now + BEAT * 0.5;
    }
    while (this.nextBarAt < now + LOOKAHEAD) {
      this.emitBar(this.nextBarAt);
      this.nextBarAt += BAR;
      this.bar++;
    }
  }

  private emitBar(at: number): void {
    const pattern = this.patternFor(this.smoothed);
    const now = this.engine.now;
    const sixteenth = BEAT * 0.25;
    const level = this.volume * (0.45 + 0.55 * this.smoothed);

    if (pattern) {
      for (const slot of pattern.kick) {
        this.hit('mus_kick', at - now + slot * sixteenth, level * 0.9);
      }
      for (const slot of pattern.taiko) {
        this.hit('mus_taiko', at - now + slot * sixteenth, level * 0.8);
      }
      for (const slot of pattern.rim) {
        this.hit('mus_rim', at - now + slot * sixteenth, level * 0.5);
      }
      for (const slot of pattern.pulse) {
        // Alternate the pulse timbre so a bar of sixteenths has internal shape.
        const id = slot % 4 === 0 ? 'mus_pulse' : 'mus_pulse_alt';
        this.hit(id, at - now + slot * sixteenth, level * (slot % 4 === 0 ? 0.72 : 0.44));
      }
    }

    // A riser into the bar where the fight tips over into serious, and a sub
    // drop on the downbeat after it. Rate-limited: these are punctuation.
    if (this.smoothed > 0.72 && this.bar - this.lastRiserBar > 12 && this.rng.bool(0.5)) {
      this.lastRiserBar = this.bar;
      this.hit('mus_riser', at - now, level * 0.55);
    }
    if (this.smoothed > 0.55 && this.bar - this.lastDropBar > 8 && this.rng.bool(0.35)) {
      this.lastDropBar = this.bar;
      this.hit('mus_sub_drop', at - now, level * 0.7);
    }
  }

  private hit(id: string, delay: number, volume: number): void {
    if (delay < 0 || volume < 0.01) return;
    this.engine.play(id, null, {
      volume,
      delay,
      tag: TAG,
      // Humanise: a few milliseconds of pitch drift per hit, no timing drift.
      pitch: this.rng.range(0.995, 1.005),
      immediate: true,
      noOcclusion: true,
      priorityScale: 0.6,
    });
  }

  private patternFor(intensity: number): Pattern | null {
    let found: Pattern | null = null;
    for (const pattern of PATTERNS) {
      if (intensity >= pattern.from) found = pattern;
    }
    return found;
  }

  stop(fade = 2): void {
    for (const layer of this.layers.values()) layer.handle.stop(fade);
    this.layers.clear();
    this.running = false;
    this.nextBarAt = 0;
  }

  /** Live layer count, for the debug report. */
  get activeLayers(): number {
    return this.layers.size;
  }
}
