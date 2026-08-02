/**
 * Quality tiers and persisted viewer preferences.
 *
 * A tier is a plain data record consumed by the renderer, the asset factories
 * and the particle systems, so switching tiers only requires rebuilding the
 * objects that read the changed fields (see `App.applyQuality`).
 */

export type QualityName = 'low' | 'medium' | 'high';

export interface QualityTier {
  readonly name: QualityName;
  readonly label: string;
  /** Upper bound applied to `window.devicePixelRatio`. */
  readonly maxPixelRatio: number;
  readonly shadows: boolean;
  readonly shadowMapSize: number;
  /** Multiplier applied to every particle pool budget. */
  readonly particleScale: number;
  /** Multiplier applied to greeble / hull-detail counts. */
  readonly detailScale: number;
  readonly bloom: boolean;
  readonly bloomStrength: number;
  readonly starCount: number;
  readonly anisotropy: number;
  /** Enable the cheap separable depth-of-field pass. */
  readonly depthOfField: boolean;
  readonly planetSegments: number;
}

export const QUALITY_TIERS: Record<QualityName, QualityTier> = {
  low: {
    name: 'low',
    label: 'Low — integrated graphics',
    maxPixelRatio: 1,
    shadows: false,
    shadowMapSize: 512,
    particleScale: 0.35,
    detailScale: 0.4,
    bloom: true,
    bloomStrength: 0.5,
    starCount: 2600,
    anisotropy: 1,
    depthOfField: false,
    planetSegments: 64,
  },
  medium: {
    name: 'medium',
    label: 'Medium — balanced',
    maxPixelRatio: 1.5,
    shadows: true,
    shadowMapSize: 1024,
    particleScale: 1,
    detailScale: 1,
    bloom: true,
    bloomStrength: 0.62,
    starCount: 7000,
    anisotropy: 4,
    depthOfField: true,
    planetSegments: 128,
  },
  high: {
    name: 'high',
    label: 'High — dedicated GPU',
    maxPixelRatio: 2,
    shadows: true,
    shadowMapSize: 2048,
    particleScale: 1.8,
    detailScale: 1.7,
    bloom: true,
    bloomStrength: 0.68,
    starCount: 14000,
    anisotropy: 8,
    depthOfField: true,
    planetSegments: 192,
  },
};

export interface Preferences {
  quality: QualityName;
  masterVolume: number;
  musicVolume: number;
  narrationVolume: number;
  effectsVolume: number;
  subtitles: boolean;
  debug: boolean;
}

export const DEFAULT_PREFS: Preferences = {
  quality: 'medium',
  masterVolume: 0.85,
  musicVolume: 0.7,
  narrationVolume: 1.0,
  effectsVolume: 0.8,
  subtitles: true,
  debug: false,
};

const STORAGE_KEY = 'shadow-of-the-first-star:prefs:v1';

export function loadPreferences(): Preferences {
  const prefs: Preferences = { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return prefs;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    for (const key of Object.keys(prefs) as (keyof Preferences)[]) {
      const value = parsed[key];
      if (value === undefined || value === null) continue;
      if (typeof value === typeof prefs[key]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prefs as any)[key] = value;
      }
    }
    if (!QUALITY_TIERS[prefs.quality]) prefs.quality = DEFAULT_PREFS.quality;
  } catch {
    /* Private-mode browsers reject storage; defaults are fine. */
  }
  return prefs;
}

export function savePreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
