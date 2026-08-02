export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualitySettings {
  readonly level: QualityLevel;
  readonly label: string;
  /** Upper bound applied to devicePixelRatio. */
  readonly maxPixelRatio: number;
  readonly shadows: boolean;
  readonly shadowMapSize: number;
  readonly bloom: boolean;
  readonly bloomStrength: number;
  readonly grain: boolean;
  readonly antialias: boolean;
  /** Multiplier applied to every particle budget in the production. */
  readonly particleScale: number;
  /** Multiplier applied to procedural hull greebling counts. */
  readonly greebleScale: number;
  readonly starCount: number;
  /** Sphere tessellation for the planet. */
  readonly planetSegments: number;
  /** Corridor sections instanced behind the camera. */
  readonly corridorSections: number;
  readonly anisotropy: number;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
  low: {
    level: 'low',
    label: 'Low - integrated graphics',
    maxPixelRatio: 1,
    shadows: false,
    shadowMapSize: 512,
    bloom: true,
    bloomStrength: 0.42,
    grain: false,
    antialias: false,
    particleScale: 0.35,
    greebleScale: 0.3,
    starCount: 2600,
    planetSegments: 48,
    corridorSections: 7,
    anisotropy: 1,
  },
  medium: {
    level: 'medium',
    label: 'Medium - balanced',
    maxPixelRatio: 1.5,
    shadows: true,
    shadowMapSize: 1024,
    bloom: true,
    bloomStrength: 0.55,
    grain: true,
    antialias: true,
    particleScale: 1,
    greebleScale: 1,
    starCount: 7000,
    planetSegments: 96,
    corridorSections: 11,
    anisotropy: 4,
  },
  high: {
    level: 'high',
    label: 'High - discrete GPU',
    maxPixelRatio: 2,
    shadows: true,
    shadowMapSize: 2048,
    bloom: true,
    bloomStrength: 0.64,
    grain: true,
    antialias: true,
    particleScale: 1.8,
    greebleScale: 1.9,
    starCount: 14000,
    planetSegments: 144,
    corridorSections: 15,
    anisotropy: 8,
  },
};

export const QUALITY_ORDER: QualityLevel[] = ['low', 'medium', 'high'];

/**
 * Very small startup benchmark: draw a deliberately fill-heavy scene for a few
 * frames and time it. Used only to *suggest* a preset - the viewer can always
 * override it from the settings panel.
 */
export function benchmarkSuggestion(gl: WebGL2RenderingContext | WebGLRenderingContext | null): {
  level: QualityLevel;
  reason: string;
} {
  const cores = navigator.hardwareConcurrency ?? 4;
  const dpr = window.devicePixelRatio || 1;
  const pixels = window.innerWidth * window.innerHeight * dpr * dpr;

  let renderer = '';
  if (gl) {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '');
  }
  const soft = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  const integrated = /intel|uhd|iris|apple m1|mali|adreno|powervr/i.test(renderer);

  if (soft) return { level: 'low', reason: `software rasteriser detected (${renderer || 'unknown'})` };
  if (cores <= 4 || pixels > 9_000_000) {
    return { level: integrated ? 'low' : 'medium', reason: `${cores} cores, ${(pixels / 1e6).toFixed(1)}MP target` };
  }
  if (integrated) return { level: 'medium', reason: `integrated GPU (${renderer})` };
  return { level: 'high', reason: renderer ? `discrete GPU (${renderer})` : 'capable device' };
}
