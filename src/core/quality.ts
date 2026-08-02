/**
 * Quality tiers.
 *
 * Every subsystem reads its budgets from the active `QualitySettings` object so
 * a tier change is a single, cheap, well-defined rebuild rather than a scatter
 * of conditionals.
 */

export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualitySettings {
  level: QualityLevel;
  /** Upper bound applied to devicePixelRatio. */
  pixelRatio: number;
  shadows: boolean;
  shadowMapSize: number;
  /** Multiplier on every particle budget. */
  particleScale: number;
  starCount: number;
  /** Instanced greeble blocks per large hull. */
  greebleScale: number;
  bloom: boolean;
  bloomStrength: number;
  grain: boolean;
  /** Radial segments for planets/domes/cylinders. */
  sphereSegments: number;
  /** Anisotropic filtering request. */
  anisotropy: number;
  /** Crowd size multiplier for corridor figures. */
  crowdScale: number;
  antialias: boolean;
  /** Enables the cheap screen-space depth-cue pass. */
  depthCue: boolean;
  planetDetail: number;
}

const TIERS: Record<QualityLevel, QualitySettings> = {
  low: {
    level: 'low',
    pixelRatio: 1,
    shadows: false,
    shadowMapSize: 512,
    particleScale: 0.34,
    starCount: 4200,
    greebleScale: 0.3,
    bloom: true,
    bloomStrength: 0.34,
    grain: false,
    sphereSegments: 32,
    anisotropy: 1,
    crowdScale: 0.68,
    antialias: false,
    depthCue: false,
    planetDetail: 256,
  },
  medium: {
    level: 'medium',
    pixelRatio: 1.5,
    shadows: true,
    shadowMapSize: 1024,
    particleScale: 1,
    starCount: 12000,
    greebleScale: 1,
    bloom: true,
    bloomStrength: 0.36,
    grain: true,
    sphereSegments: 64,
    anisotropy: 4,
    crowdScale: 1,
    antialias: true,
    depthCue: true,
    planetDetail: 512,
  },
  high: {
    level: 'high',
    pixelRatio: 2,
    shadows: true,
    shadowMapSize: 2048,
    particleScale: 1.8,
    starCount: 20000,
    greebleScale: 1.9,
    bloom: true,
    bloomStrength: 0.42,
    grain: true,
    sphereSegments: 96,
    anisotropy: 8,
    crowdScale: 1,
    antialias: true,
    depthCue: true,
    planetDetail: 1024,
  },
};

export function qualityFor(level: QualityLevel): QualitySettings {
  return { ...TIERS[level] };
}

export const QUALITY_BLURB: Record<QualityLevel, string> = {
  low: 'Fewer particles, no shadows, native pixel ratio. Best for integrated graphics and laptops on battery.',
  medium: 'The intended presentation: soft shadows, full particle budget, moderate bloom.',
  high: 'Doubled pixel ratio, extra hull greebling, larger shadow maps and a denser starfield.',
};

/**
 * A short GPU probe. We render the real scene for a handful of frames before
 * the gate opens and read back the achieved frame time, then suggest a tier.
 * The user can always override; the suggestion is only a starting point.
 */
export class StartupBenchmark {
  private samples: number[] = [];
  private last = 0;

  begin(): void {
    this.samples.length = 0;
    this.last = performance.now();
  }

  sample(): void {
    const now = performance.now();
    const dt = now - this.last;
    this.last = now;
    // Discard the first few frames: shader compilation dominates them.
    if (dt > 0 && dt < 500) this.samples.push(dt);
  }

  get count(): number {
    return this.samples.length;
  }

  /** Median frame time in ms across the collected samples. */
  medianFrameMs(): number {
    if (!this.samples.length) return 16.7;
    const sorted = [...this.samples].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  suggest(): { level: QualityLevel; frameMs: number; reason: string } {
    const frameMs = this.medianFrameMs();
    // Probe runs at full scene complexity, so thresholds are deliberately generous.
    if (frameMs > 34) {
      return { level: 'low', frameMs, reason: `probe rendered at ~${Math.round(1000 / frameMs)} fps` };
    }
    if (frameMs < 11.5) {
      return { level: 'high', frameMs, reason: `probe rendered at ~${Math.round(1000 / frameMs)} fps` };
    }
    return { level: 'medium', frameMs, reason: `probe rendered at ~${Math.round(1000 / frameMs)} fps` };
  }
}
