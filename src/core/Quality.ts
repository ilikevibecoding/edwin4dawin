/**
 * Quality presets. Every renderer feature reads from here rather than
 * hard-coding constants, so the whole pipeline can scale from a laptop iGPU up
 * to a discrete GPU (and down to software rasterisation for headless capture).
 */

export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra' | 'cinematic';

export interface QualitySettings {
  preset: QualityPreset;

  /** Render scale applied on top of devicePixelRatio. */
  renderScale: number;
  maxPixelRatio: number;

  // Shadows
  shadows: boolean;
  shadowMapSize: number;
  /** Number of cascades in the CSM rig. */
  shadowCascades: number;
  shadowDistance: number;
  /** Percentage-closer soft shadows; falls back to PCF when false. */
  softShadows: boolean;
  contactShadows: boolean;

  // Ambient occlusion
  ssao: boolean;
  ssaoQuality: 'low' | 'medium' | 'high';
  /** Ground-truth AO uses more slices/steps than classic SSAO. */
  gtao: boolean;

  // Reflections
  ssr: boolean;
  ssrSteps: number;
  envMapResolution: number;
  /** Realtime local reflection probes rather than a single global env map. */
  reflectionProbes: number;

  // Anti-aliasing
  antialias: 'none' | 'fxaa' | 'smaa' | 'taa' | 'msaa';
  msaaSamples: number;
  /** TAA history blend factor; lower is sharper but noisier. */
  taaFeedback: number;

  // Post processing
  bloom: boolean;
  bloomQuality: number;
  motionBlur: boolean;
  motionBlurSamples: number;
  depthOfField: boolean;
  volumetricLighting: boolean;
  volumetricSteps: number;
  /** Raymarched height fog with in-scattering. */
  volumetricFog: boolean;
  chromaticAberration: boolean;
  filmGrain: boolean;
  vignette: boolean;
  lensFlare: boolean;
  lensDirt: boolean;
  colorGrading: boolean;
  sharpen: boolean;

  // World detail
  textureResolution: number;
  anisotropy: number;
  /** Parallax occlusion mapping step count; 0 disables POM. */
  parallaxSteps: number;
  detailNormals: boolean;
  vegetationDensity: number;
  debrisDensity: number;
  maxDecals: number;
  maxParticles: number;
  drawDistance: number;
  lodBias: number;

  // Simulation
  ragdolls: boolean;
  maxRagdolls: number;
  physicsSubsteps: number;
}

const BASE: QualitySettings = {
  preset: 'ultra',
  renderScale: 1,
  maxPixelRatio: 2,
  shadows: true,
  shadowMapSize: 2048,
  shadowCascades: 4,
  shadowDistance: 260,
  softShadows: true,
  contactShadows: true,
  ssao: true,
  ssaoQuality: 'high',
  gtao: true,
  ssr: true,
  ssrSteps: 32,
  envMapResolution: 512,
  reflectionProbes: 2,
  antialias: 'taa',
  msaaSamples: 4,
  taaFeedback: 0.9,
  bloom: true,
  bloomQuality: 6,
  motionBlur: true,
  motionBlurSamples: 12,
  depthOfField: true,
  volumetricLighting: true,
  volumetricSteps: 48,
  volumetricFog: true,
  chromaticAberration: true,
  filmGrain: true,
  vignette: true,
  lensFlare: true,
  lensDirt: true,
  colorGrading: true,
  sharpen: true,
  textureResolution: 1024,
  anisotropy: 16,
  parallaxSteps: 24,
  detailNormals: true,
  vegetationDensity: 1,
  debrisDensity: 1,
  maxDecals: 512,
  maxParticles: 20000,
  drawDistance: 1200,
  lodBias: 1,
  ragdolls: true,
  maxRagdolls: 12,
  physicsSubsteps: 2,
};

const PRESETS: Record<QualityPreset, Partial<QualitySettings>> = {
  low: {
    preset: 'low',
    renderScale: 0.7,
    maxPixelRatio: 1,
    shadowMapSize: 1024,
    shadowCascades: 2,
    shadowDistance: 90,
    softShadows: false,
    contactShadows: false,
    ssao: false,
    gtao: false,
    ssr: false,
    envMapResolution: 128,
    reflectionProbes: 0,
    antialias: 'fxaa',
    msaaSamples: 0,
    bloomQuality: 3,
    motionBlur: false,
    depthOfField: false,
    volumetricLighting: false,
    volumetricFog: false,
    chromaticAberration: false,
    lensFlare: false,
    lensDirt: false,
    sharpen: false,
    textureResolution: 256,
    anisotropy: 2,
    parallaxSteps: 0,
    detailNormals: false,
    vegetationDensity: 0.25,
    debrisDensity: 0.25,
    maxDecals: 64,
    maxParticles: 2000,
    drawDistance: 400,
    lodBias: 0.5,
    ragdolls: false,
    maxRagdolls: 2,
    physicsSubsteps: 1,
  },
  medium: {
    preset: 'medium',
    renderScale: 0.85,
    maxPixelRatio: 1.25,
    shadowMapSize: 1024,
    shadowCascades: 3,
    shadowDistance: 140,
    softShadows: false,
    ssao: true,
    ssaoQuality: 'low',
    gtao: false,
    ssr: false,
    envMapResolution: 256,
    reflectionProbes: 1,
    antialias: 'smaa',
    msaaSamples: 0,
    bloomQuality: 4,
    motionBlurSamples: 6,
    depthOfField: false,
    volumetricSteps: 16,
    textureResolution: 512,
    anisotropy: 4,
    parallaxSteps: 0,
    vegetationDensity: 0.5,
    debrisDensity: 0.5,
    maxDecals: 160,
    maxParticles: 6000,
    drawDistance: 700,
    lodBias: 0.75,
    maxRagdolls: 4,
  },
  high: {
    preset: 'high',
    renderScale: 1,
    shadowMapSize: 2048,
    shadowCascades: 3,
    shadowDistance: 200,
    ssaoQuality: 'medium',
    gtao: true,
    ssr: true,
    ssrSteps: 20,
    envMapResolution: 256,
    antialias: 'taa',
    bloomQuality: 5,
    motionBlurSamples: 8,
    volumetricSteps: 32,
    textureResolution: 1024,
    anisotropy: 8,
    parallaxSteps: 12,
    vegetationDensity: 0.8,
    debrisDensity: 0.8,
    maxDecals: 320,
    maxParticles: 12000,
    drawDistance: 900,
    maxRagdolls: 8,
  },
  ultra: { preset: 'ultra' },
  cinematic: {
    preset: 'cinematic',
    renderScale: 1,
    maxPixelRatio: 2,
    shadowMapSize: 4096,
    shadowCascades: 4,
    shadowDistance: 400,
    ssaoQuality: 'high',
    ssrSteps: 48,
    envMapResolution: 1024,
    reflectionProbes: 3,
    taaFeedback: 0.94,
    bloomQuality: 7,
    motionBlurSamples: 16,
    volumetricSteps: 96,
    textureResolution: 2048,
    parallaxSteps: 32,
    vegetationDensity: 1.4,
    debrisDensity: 1.4,
    maxDecals: 1024,
    maxParticles: 40000,
    drawDistance: 2000,
    lodBias: 1.6,
    maxRagdolls: 16,
  },
};

export function createQuality(preset: QualityPreset = 'ultra'): QualitySettings {
  return { ...BASE, ...PRESETS[preset] };
}

/**
 * Picks a starting preset from coarse hardware hints. Software rasterisers
 * (SwiftShader/llvmpipe, used by headless capture) are detected explicitly so
 * automated screenshots still exercise the full feature set at a small size.
 */
export function detectPreset(gl: WebGL2RenderingContext | null): QualityPreset {
  if (!gl) return 'medium';
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = String(
    dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
  ).toLowerCase();

  const software = /swiftshader|llvmpipe|softwarerasterizer|mesa offscreen/.test(renderer);
  if (software) return 'high';

  const mobile = /adreno|mali|apple a\d|powervr/.test(renderer);
  if (mobile) return 'medium';

  if (/rtx\s?(30|40|50)|rx\s?(6[89]|7[89])\d\d|apple m[1-9]\s?(pro|max|ultra)/.test(renderer)) {
    return 'ultra';
  }
  if (/gtx\s?1[06]|rtx\s?20|rx\s?5[５5]\d\d|intel/.test(renderer)) return 'high';
  return 'high';
}
