/**
 * Quality tiers.
 *
 * A tier is a plain data record consumed by the renderer, the asset factories
 * and the particle systems. Switching tiers rebuilds the world, so every
 * factory must read these numbers instead of hard-coding detail.
 */

export type QualityName = 'low' | 'medium' | 'high';

export interface QualitySettings {
  readonly name: QualityName;
  readonly label: string;
  /** Multiplier applied to devicePixelRatio (result is clamped). */
  readonly pixelRatioScale: number;
  readonly maxPixelRatio: number;
  readonly shadows: boolean;
  readonly shadowMapSize: number;
  /** MSAA samples on the HDR target (WebGL2). */
  readonly msaa: number;
  readonly bloom: boolean;
  readonly bloomIterations: number;
  readonly depthOfField: boolean;
  readonly grain: boolean;
  /** Scales every particle budget. */
  readonly particleScale: number;
  /** Scales procedural hull greeble counts. */
  readonly greebleScale: number;
  readonly starCount: number;
  readonly planetSegments: number;
  readonly anisotropy: number;
  readonly volumetricLightShafts: boolean;
}

export const QUALITY_TIERS: Record<QualityName, QualitySettings> = {
  low: {
    name: 'low',
    label: 'Low — integrated graphics',
    pixelRatioScale: 0.72,
    maxPixelRatio: 1,
    shadows: false,
    shadowMapSize: 512,
    msaa: 0,
    bloom: true,
    bloomIterations: 3,
    depthOfField: false,
    grain: false,
    particleScale: 0.34,
    greebleScale: 0.34,
    starCount: 2600,
    planetSegments: 64,
    anisotropy: 1,
    volumetricLightShafts: false,
  },
  medium: {
    name: 'medium',
    label: 'Medium — balanced',
    pixelRatioScale: 1,
    maxPixelRatio: 1.5,
    shadows: true,
    shadowMapSize: 1024,
    msaa: 4,
    bloom: true,
    bloomIterations: 4,
    depthOfField: false,
    grain: true,
    particleScale: 1,
    greebleScale: 1,
    starCount: 7000,
    planetSegments: 128,
    anisotropy: 4,
    volumetricLightShafts: true,
  },
  high: {
    name: 'high',
    label: 'High — desktop GPU',
    pixelRatioScale: 1,
    maxPixelRatio: 2,
    shadows: true,
    shadowMapSize: 2048,
    msaa: 4,
    bloom: true,
    bloomIterations: 5,
    depthOfField: true,
    grain: true,
    particleScale: 1.7,
    greebleScale: 1.8,
    starCount: 14000,
    planetSegments: 192,
    anisotropy: 8,
    volumetricLightShafts: true,
  },
};

export const QUALITY_ORDER: QualityName[] = ['low', 'medium', 'high'];

export function isQualityName(v: string): v is QualityName {
  return v === 'low' || v === 'medium' || v === 'high';
}
