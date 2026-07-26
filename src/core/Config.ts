/**
 * Global quality + tuning configuration.
 *
 * `QUALITY` is chosen at boot from a hardware probe, but can be forced with
 * `?q=low|medium|high|ultra`. Every renderer subsystem reads from here rather
 * than hardcoding, so the whole pipeline scales from an integrated GPU up to a
 * discrete card, and down to software rasterisation for automated screenshots.
 */

export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';

export interface QualitySettings {
  tier: QualityTier;
  /** Device-pixel-ratio ceiling. */
  maxDpr: number;
  /** Internal render scale applied on top of DPR. */
  renderScale: number;
  shadowMapSize: number;
  shadowCascades: number;
  shadowDistance: number;
  softShadows: boolean;
  contactShadows: boolean;
  ssao: boolean;
  ssaoSamples: number;
  ssr: boolean;
  bloom: boolean;
  bloomMips: number;
  motionBlur: boolean;
  depthOfField: boolean;
  volumetricLight: boolean;
  volumetricSteps: number;
  taa: boolean;
  /** Number of jittered samples accumulated when the camera is still. */
  taaSamples: number;
  filmGrain: boolean;
  chromaticAberration: boolean;
  lensDirt: boolean;
  anisotropy: number;
  textureSize: number;
  /** Max simultaneous GPU particles. */
  particleBudget: number;
  decalBudget: number;
  maxDynamicLights: number;
  foliageDensity: number;
  ragdolls: number;
  reflectionProbeSize: number;
}

const TIERS: Record<QualityTier, QualitySettings> = {
  low: {
    tier: 'low',
    maxDpr: 1,
    renderScale: 0.8,
    shadowMapSize: 1024,
    shadowCascades: 2,
    shadowDistance: 60,
    softShadows: false,
    contactShadows: false,
    ssao: false,
    ssaoSamples: 8,
    ssr: false,
    bloom: true,
    bloomMips: 3,
    motionBlur: false,
    depthOfField: false,
    volumetricLight: false,
    volumetricSteps: 8,
    taa: false,
    taaSamples: 0,
    filmGrain: true,
    chromaticAberration: false,
    lensDirt: false,
    anisotropy: 2,
    textureSize: 512,
    particleBudget: 2000,
    decalBudget: 64,
    maxDynamicLights: 4,
    foliageDensity: 0.25,
    ragdolls: 2,
    reflectionProbeSize: 128,
  },
  medium: {
    tier: 'medium',
    maxDpr: 1.25,
    renderScale: 0.9,
    shadowMapSize: 2048,
    shadowCascades: 3,
    shadowDistance: 90,
    softShadows: true,
    contactShadows: true,
    ssao: true,
    ssaoSamples: 10,
    ssr: false,
    bloom: true,
    bloomMips: 4,
    motionBlur: true,
    depthOfField: false,
    volumetricLight: true,
    volumetricSteps: 16,
    taa: true,
    taaSamples: 8,
    filmGrain: true,
    chromaticAberration: true,
    lensDirt: true,
    anisotropy: 4,
    textureSize: 1024,
    particleBudget: 6000,
    decalBudget: 128,
    maxDynamicLights: 8,
    foliageDensity: 0.55,
    ragdolls: 4,
    reflectionProbeSize: 256,
  },
  high: {
    tier: 'high',
    maxDpr: 1.5,
    renderScale: 1,
    shadowMapSize: 2048,
    shadowCascades: 4,
    shadowDistance: 140,
    softShadows: true,
    contactShadows: true,
    ssao: true,
    ssaoSamples: 16,
    ssr: true,
    bloom: true,
    bloomMips: 5,
    motionBlur: true,
    depthOfField: true,
    volumetricLight: true,
    volumetricSteps: 32,
    taa: true,
    taaSamples: 16,
    filmGrain: true,
    chromaticAberration: true,
    lensDirt: true,
    anisotropy: 8,
    textureSize: 1024,
    particleBudget: 12000,
    decalBudget: 256,
    maxDynamicLights: 12,
    foliageDensity: 0.85,
    ragdolls: 6,
    reflectionProbeSize: 256,
  },
  ultra: {
    tier: 'ultra',
    maxDpr: 2,
    renderScale: 1,
    shadowMapSize: 4096,
    shadowCascades: 4,
    shadowDistance: 200,
    softShadows: true,
    contactShadows: true,
    ssao: true,
    ssaoSamples: 24,
    ssr: true,
    bloom: true,
    bloomMips: 6,
    motionBlur: true,
    depthOfField: true,
    volumetricLight: true,
    volumetricSteps: 48,
    taa: true,
    taaSamples: 24,
    filmGrain: true,
    chromaticAberration: true,
    lensDirt: true,
    anisotropy: 16,
    textureSize: 2048,
    particleBudget: 24000,
    decalBudget: 512,
    maxDynamicLights: 16,
    foliageDensity: 1,
    ragdolls: 10,
    reflectionProbeSize: 512,
  },
};

function probeTier(): QualityTier {
  const forced = new URLSearchParams(location.search).get('q');
  if (forced && forced in TIERS) return forced as QualityTier;

  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') as WebGL2RenderingContext | null;
    if (!gl) return 'low';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '')
      : String(gl.getParameter(gl.RENDERER) ?? '');
    const r = renderer.toLowerCase();

    // Software rasterisers (headless CI, no GPU) must stay cheap or they
    // time out; the screenshot harness overrides this with ?q= anyway.
    if (r.includes('swiftshader') || r.includes('llvmpipe') || r.includes('software')) {
      return 'medium';
    }
    if (/rtx\s*(30|40|50)|radeon rx (6|7|9)\d00|apple m[2-9]/.test(r)) return 'ultra';
    if (/rtx|radeon rx|apple m1|geforce gtx 1[06]/.test(r)) return 'high';
    if (/intel|uhd|iris|mali|adreno|powervr/.test(r)) return 'medium';
    return 'high';
  } catch {
    return 'medium';
  }
}

export const QUALITY: QualitySettings = { ...TIERS[probeTier()] };

export function setQuality(tier: QualityTier): void {
  Object.assign(QUALITY, TIERS[tier]);
}

export function qualityPreset(tier: QualityTier): QualitySettings {
  return TIERS[tier];
}

/**
 * Deterministic screenshot/benchmark mode. Disables random jitter, fixes the
 * clock, and exposes `window.__SHOT__` hooks for the capture harness.
 */
export const SHOT_MODE = new URLSearchParams(location.search).has('shot');
export const SHOT_SCENARIO = new URLSearchParams(location.search).get('scenario') ?? 'default';

/** Gameplay tunables shared across systems (metres, seconds, m/s). */
export const TUNING = {
  gravity: 22.5,
  playerHeight: 1.78,
  eyeHeight: 1.62,
  crouchEyeHeight: 1.05,
  proneEyeHeight: 0.42,
  playerRadius: 0.34,
  walkSpeed: 4.1,
  sprintSpeed: 6.9,
  tacticalSprintSpeed: 8.4,
  crouchSpeed: 2.3,
  proneSpeed: 1.05,
  adsSpeedScale: 0.48,
  jumpVelocity: 6.4,
  airControl: 0.28,
  groundAccel: 62,
  airAccel: 14,
  groundFriction: 11.5,
  slideImpulse: 9.2,
  slideDuration: 0.95,
  mantleMaxHeight: 1.65,
  maxStepHeight: 0.42,
  maxSlopeDeg: 48,
  /** Metres per second, muzzle velocity fallback. */
  defaultMuzzleVelocity: 780,
  /** Speed of sound for supersonic crack timing. */
  speedOfSound: 343,
} as const;
