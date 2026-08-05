/** Render quality tiers. `cinema` is the reference look used for stills/film capture. */
export type QualityName = 'cinema' | 'high' | 'medium' | 'low';

export type QualitySettings = {
  name: QualityName;
  label: string;
  /** Multiplier on devicePixelRatio-limited backing store. */
  scale: number;
  maxPixelRatio: number;
  shadowMapSize: number;
  softShadows: boolean;
  /** Ambient occlusion (GTAO) */
  ao: boolean;
  aoQuality: 'Low' | 'Medium' | 'High' | 'Ultra';
  bloom: boolean;
  anamorphic: boolean;
  dof: boolean;
  dofSamples: number;
  ssr: boolean;
  reflectionScale: number;
  volumetrics: boolean;
  volumetricSteps: number;
  rainCount: number;
  splashCount: number;
  smaa: boolean;
  textureSize: number;
  characterSegments: number;
  /** Extra light sources beyond the key set. */
  fillLights: boolean;
  /** Half-float HDR intermediate buffers. */
  hdr: boolean;
};

const TIERS: Record<QualityName, QualitySettings> = {
  cinema: {
    name: 'cinema', label: 'CINEMA', scale: 1, maxPixelRatio: 2,
    shadowMapSize: 2048, softShadows: true,
    ao: true, aoQuality: 'High', bloom: true, anamorphic: true,
    dof: true, dofSamples: 32, ssr: true, reflectionScale: 0.7,
    volumetrics: true, volumetricSteps: 36,
    rainCount: 16000, splashCount: 900, smaa: true,
    textureSize: 512, characterSegments: 1.0, fillLights: true, hdr: true,
  },
  high: {
    name: 'high', label: 'HIGH', scale: 1, maxPixelRatio: 1.75,
    shadowMapSize: 2048, softShadows: true,
    ao: true, aoQuality: 'Medium', bloom: true, anamorphic: true,
    dof: true, dofSamples: 20, ssr: true, reflectionScale: 0.55,
    volumetrics: true, volumetricSteps: 24,
    rainCount: 11000, splashCount: 560, smaa: true,
    textureSize: 512, characterSegments: 1.0, fillLights: true, hdr: true,
  },
  medium: {
    name: 'medium', label: 'MEDIUM', scale: 0.85, maxPixelRatio: 1.5,
    shadowMapSize: 1024, softShadows: true,
    ao: false, aoQuality: 'Low', bloom: true, anamorphic: false,
    dof: true, dofSamples: 12, ssr: true, reflectionScale: 0.4,
    volumetrics: true, volumetricSteps: 14,
    rainCount: 6000, splashCount: 280, smaa: false,
    textureSize: 256, characterSegments: 0.8, fillLights: true, hdr: true,
  },
  low: {
    name: 'low', label: 'PERFORMANCE', scale: 0.7, maxPixelRatio: 1,
    shadowMapSize: 512, softShadows: false,
    ao: false, aoQuality: 'Low', bloom: true, anamorphic: false,
    dof: false, dofSamples: 8, ssr: false, reflectionScale: 0.3,
    volumetrics: false, volumetricSteps: 8,
    rainCount: 2600, splashCount: 90, smaa: false,
    textureSize: 256, characterSegments: 0.6, fillLights: false, hdr: true,
  },
};

export const QUALITY_ORDER: QualityName[] = ['cinema', 'high', 'medium', 'low'];

export function getQuality(name: QualityName): QualitySettings {
  return { ...TIERS[name] };
}

/** Very rough auto-detect so first-run looks good without stalling. */
export function detectQuality(): QualityName {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return 'low';
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const info = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  const soft = /swiftshader|software|llvmpipe|mesa offscreen/i.test(info);
  if (soft) return 'medium';
  const cores = navigator.hardwareConcurrency ?? 4;
  if (/rtx|radeon rx|apple m[1-9]|arc a/i.test(info) && cores >= 8) return 'cinema';
  if (cores >= 8) return 'high';
  return 'medium';
}
