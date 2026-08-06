/**
 * Quality tiers. The game is designed to run on a GPU at 60fps, but it also has
 * to be renderable on a software rasteriser (CI / headless capture), where a
 * single full-quality 720p frame costs several hundred milliseconds. Tiers scale
 * the expensive things (fill rate, shadow maps, convolution passes) rather than
 * the art direction, so the look survives all the way down.
 */

export type TierName = 'low' | 'medium' | 'high' | 'cinema' | 'video';

export interface QualitySettings {
  name: TierName;
  /** Internal buffer scale relative to the display size. */
  renderScale: number;
  maxPixelRatio: number;
  shadows: boolean;
  shadowMapSize: number;
  /** Number of shadow-casting lights allowed at once. */
  shadowLights: number;
  softShadows: boolean;
  rainCount: number;
  splashCount: number;
  bloom: boolean;
  bloomResolution: number;
  dof: boolean;
  dofResolution: number;
  antialias: 'none' | 'fxaa' | 'smaa';
  /** Planar reflections for wet floors (expensive: re-renders tagged geometry). */
  planarReflections: boolean;
  reflectionScale: number;
  volumetrics: boolean;
  volumetricSteps: number;
  /** Screen-space raindrops on the lens. */
  lensRain: boolean;
  envMapSize: number;
  anisotropy: number;
  crowdActors: number;
  /** Bake character shadow contribution instead of per-frame updates. */
  staticShadowUpdates: boolean;
}

const TIERS: Record<TierName, QualitySettings> = {
  low: {
    name: 'low',
    renderScale: 0.62,
    maxPixelRatio: 1,
    shadows: true,
    shadowMapSize: 512,
    shadowLights: 1,
    softShadows: false,
    rainCount: 900,
    splashCount: 60,
    bloom: true,
    bloomResolution: 180,
    dof: false,
    dofResolution: 240,
    antialias: 'none',
    planarReflections: false,
    reflectionScale: 0.2,
    volumetrics: true,
    volumetricSteps: 6,
    lensRain: true,
    envMapSize: 128,
    anisotropy: 1,
    crowdActors: 4,
    staticShadowUpdates: true,
  },
  medium: {
    name: 'medium',
    renderScale: 0.8,
    maxPixelRatio: 1.25,
    shadows: true,
    shadowMapSize: 1024,
    shadowLights: 2,
    softShadows: true,
    rainCount: 2600,
    splashCount: 140,
    bloom: true,
    bloomResolution: 256,
    dof: true,
    dofResolution: 300,
    antialias: 'fxaa',
    planarReflections: true,
    reflectionScale: 0.28,
    volumetrics: true,
    volumetricSteps: 10,
    lensRain: true,
    envMapSize: 256,
    anisotropy: 4,
    crowdActors: 8,
    staticShadowUpdates: false,
  },
  high: {
    name: 'high',
    renderScale: 1,
    maxPixelRatio: 1.5,
    shadows: true,
    shadowMapSize: 2048,
    shadowLights: 3,
    softShadows: true,
    rainCount: 6000,
    splashCount: 260,
    bloom: true,
    bloomResolution: 360,
    dof: true,
    dofResolution: 480,
    antialias: 'smaa',
    planarReflections: true,
    reflectionScale: 0.4,
    volumetrics: true,
    volumetricSteps: 16,
    lensRain: true,
    envMapSize: 512,
    anisotropy: 8,
    crowdActors: 14,
    staticShadowUpdates: false,
  },
  // Offline frame-by-frame rendering: no frame budget, so everything is on.
  cinema: {
    name: 'cinema',
    renderScale: 1,
    maxPixelRatio: 1,
    shadows: true,
    shadowMapSize: 1536,
    shadowLights: 3,
    softShadows: true,
    rainCount: 4200,
    splashCount: 200,
    bloom: true,
    bloomResolution: 320,
    dof: true,
    dofResolution: 360,
    antialias: 'fxaa',
    planarReflections: true,
    reflectionScale: 0.34,
    volumetrics: true,
    volumetricSteps: 12,
    lensRain: true,
    envMapSize: 256,
    anisotropy: 4,
    crowdActors: 10,
    staticShadowUpdates: false,
  },
  // Offline video capture. Same art direction as `cinema`, with the costs that
  // do not survive compression pulled back: a ten-minute recording on a software
  // rasteriser is thirteen thousand frames, so an extra 200 ms per frame is an
  // extra forty-five minutes of wall time.
  video: {
    name: 'video',
    // Measured, not guessed: frame cost on the software rasteriser is almost
    // purely fill-rate bound, and nothing else came close as a lever — dropping
    // shadows saved 9%, dropping wet-floor reflections 7%, dropping the rain
    // nothing measurable, while rendering at 0.8 and letting the compositor scale
    // to the capture size saved 31%. At 540p under this much grain and rain the
    // softness costs less than the four hours it buys back.
    renderScale: 0.8,
    maxPixelRatio: 1,
    shadows: true,
    shadowMapSize: 1024,
    shadowLights: 2,
    softShadows: false,
    rainCount: 2400,
    splashCount: 120,
    bloom: true,
    bloomResolution: 240,
    dof: true,
    dofResolution: 260,
    antialias: 'fxaa',
    planarReflections: true,
    reflectionScale: 0.24,
    volumetrics: true,
    volumetricSteps: 8,
    lensRain: true,
    envMapSize: 256,
    anisotropy: 4,
    crowdActors: 8,
    staticShadowUpdates: false,
  },
};

export function getTier(name: TierName): QualitySettings {
  return { ...TIERS[name] };
}

/** SwiftShader and other software renderers cannot afford the upper tiers. */
export function isSoftwareRenderer(gl: WebGL2RenderingContext | WebGLRenderingContext): boolean {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (!ext) return false;
  const name = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '');
  return /swiftshader|software|llvmpipe|basic render/i.test(name);
}

export function detectTier(gl: WebGL2RenderingContext | WebGLRenderingContext): TierName {
  if (isSoftwareRenderer(gl)) return 'low';
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (cores <= 4 || mem <= 4) return 'medium';
  return 'high';
}
