/**
 * Quality tiers. Every renderer subsystem reads from this object rather than
 * hardcoding values, so the whole pipeline can be re-tuned from one place and
 * scaled down automatically when the frame budget is blown.
 */
export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';

export interface QualityConfig {
  tier: QualityTier;

  // --- Resolution ---
  /** Render scale multiplier applied on top of devicePixelRatio. */
  renderScale: number;
  maxPixelRatio: number;

  // --- Shadows ---
  shadowsEnabled: boolean;
  /** Cascaded shadow map resolution per cascade. */
  shadowMapSize: number;
  shadowCascades: number;
  shadowDistance: number;
  softShadows: boolean;
  contactShadows: boolean;

  // --- Global illumination / reflections ---
  iblResolution: number;
  ssaoEnabled: boolean;
  ssaoQuality: 'low' | 'high';
  ssrEnabled: boolean;
  ssrSteps: number;

  // --- Anti-aliasing ---
  antialias: 'off' | 'fxaa' | 'smaa' | 'taa';

  // --- Post processing ---
  bloomEnabled: boolean;
  motionBlurEnabled: boolean;
  motionBlurSamples: number;
  dofEnabled: boolean;
  chromaticAberration: boolean;
  filmGrain: boolean;
  vignette: boolean;
  lensFlare: boolean;
  colorGrading: boolean;

  // --- Volumetrics ---
  volumetricLighting: boolean;
  volumetricSteps: number;
  volumetricFog: boolean;

  // --- Content density ---
  particleBudget: number;
  decalBudget: number;
  debrisBudget: number;
  vegetationDensity: number;
  maxDynamicLights: number;
  anisotropy: number;
  textureResolution: number;

  // --- Gameplay-adjacent visuals ---
  ragdollsEnabled: boolean;
  maxRagdolls: number;

  // --- Debug ---
  showStats: boolean;
  wireframe: boolean;
  freezeCulling: boolean;
}

const ULTRA: QualityConfig = {
  tier: 'ultra',
  renderScale: 1.0,
  maxPixelRatio: 2,
  shadowsEnabled: true,
  shadowMapSize: 2048,
  shadowCascades: 4,
  shadowDistance: 140,
  softShadows: true,
  contactShadows: true,
  iblResolution: 512,
  ssaoEnabled: true,
  ssaoQuality: 'high',
  ssrEnabled: true,
  ssrSteps: 32,
  antialias: 'taa',
  bloomEnabled: true,
  motionBlurEnabled: true,
  motionBlurSamples: 12,
  dofEnabled: true,
  chromaticAberration: true,
  filmGrain: true,
  vignette: true,
  lensFlare: true,
  colorGrading: true,
  volumetricLighting: true,
  volumetricSteps: 48,
  volumetricFog: true,
  particleBudget: 24000,
  decalBudget: 512,
  debrisBudget: 400,
  vegetationDensity: 1.0,
  maxDynamicLights: 24,
  anisotropy: 16,
  textureResolution: 1024,
  ragdollsEnabled: true,
  maxRagdolls: 12,
  showStats: false,
  wireframe: false,
  freezeCulling: false,
};

const HIGH: QualityConfig = {
  ...ULTRA,
  tier: 'high',
  renderScale: 1.0,
  shadowMapSize: 1536,
  shadowCascades: 3,
  shadowDistance: 110,
  iblResolution: 256,
  ssrSteps: 20,
  motionBlurSamples: 8,
  volumetricSteps: 32,
  particleBudget: 14000,
  decalBudget: 320,
  debrisBudget: 240,
  maxDynamicLights: 16,
  anisotropy: 8,
  textureResolution: 1024,
  maxRagdolls: 8,
};

const MEDIUM: QualityConfig = {
  ...HIGH,
  tier: 'medium',
  renderScale: 0.85,
  maxPixelRatio: 1.5,
  shadowMapSize: 1024,
  shadowCascades: 2,
  shadowDistance: 80,
  softShadows: false,
  contactShadows: false,
  ssaoQuality: 'low',
  ssrEnabled: false,
  antialias: 'smaa',
  motionBlurEnabled: false,
  dofEnabled: false,
  lensFlare: false,
  volumetricLighting: false,
  volumetricSteps: 16,
  particleBudget: 7000,
  decalBudget: 160,
  debrisBudget: 120,
  vegetationDensity: 0.6,
  maxDynamicLights: 10,
  anisotropy: 4,
  textureResolution: 512,
  maxRagdolls: 4,
};

const LOW: QualityConfig = {
  ...MEDIUM,
  tier: 'low',
  renderScale: 0.7,
  maxPixelRatio: 1,
  shadowsEnabled: true,
  shadowMapSize: 1024,
  shadowCascades: 1,
  shadowDistance: 50,
  ssaoEnabled: false,
  antialias: 'fxaa',
  bloomEnabled: true,
  chromaticAberration: false,
  filmGrain: false,
  volumetricFog: true,
  particleBudget: 2500,
  decalBudget: 64,
  debrisBudget: 48,
  vegetationDensity: 0.3,
  maxDynamicLights: 6,
  anisotropy: 2,
  textureResolution: 256,
  ragdollsEnabled: false,
  maxRagdolls: 0,
};

export const QUALITY_PRESETS: Record<QualityTier, QualityConfig> = {
  low: LOW,
  medium: MEDIUM,
  high: HIGH,
  ultra: ULTRA,
};

export function makeConfig(tier: QualityTier): QualityConfig {
  return { ...QUALITY_PRESETS[tier] };
}

/**
 * Heuristic first-run guess based on the GPU string and screen size.
 * The adaptive resolution scaler corrects any mistake within a few seconds.
 */
export function detectQualityTier(gl: WebGL2RenderingContext | null): QualityTier {
  if (!gl) return 'medium';
  let renderer = '';
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '');
  } catch {
    /* blocked by privacy settings */
  }
  const r = renderer.toLowerCase();

  // Software rasterisers (CI, VMs, headless capture) must not attempt ultra.
  if (r.includes('swiftshader') || r.includes('llvmpipe') || r.includes('software')) return 'low';

  const isMobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
  if (isMobile) return 'low';

  const highEnd = /rtx\s*(30|40|50)|rx\s*(6[7-9]|7[0-9]|9[0-9])|apple m[1-4]\s*(pro|max|ultra)/i;
  const midEnd = /gtx\s*1[06]|rtx\s*20|rx\s*5[5-7]|apple m[1-4]|iris xe|arc a/i;
  if (highEnd.test(r)) return 'ultra';
  if (midEnd.test(r)) return 'high';

  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  if (cores >= 8 && mem >= 8) return 'high';
  if (cores >= 4) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Gameplay tuning that designers touch often. Kept apart from graphics so a
// quality change can never alter game feel.
// ---------------------------------------------------------------------------
export const GAMEPLAY = {
  player: {
    height: 1.78,
    crouchHeight: 1.05,
    proneHeight: 0.55,
    radius: 0.34,
    eyeOffset: -0.14,
    mass: 82,

    walkSpeed: 4.1,
    sprintSpeed: 6.6,
    tacticalSprintSpeed: 8.2,
    tacticalSprintDuration: 2.4,
    crouchSpeed: 2.05,
    proneSpeed: 0.95,
    adsSpeedScale: 0.42,
    airControl: 0.22,
    acceleration: 62,
    airAcceleration: 14,
    friction: 11.5,
    jumpVelocity: 5.05,
    gravity: -18.6,
    stepHeight: 0.42,
    maxSlopeDeg: 48,

    slideSpeedBoost: 2.9,
    slideDuration: 0.95,
    slideFriction: 3.1,
    slideMinSpeed: 3.4,
    slideCooldown: 0.65,

    mantleMaxHeight: 1.55,
    mantleDuration: 0.52,

    maxHealth: 100,
    regenDelay: 4.25,
    regenRate: 26,

    leanAngleDeg: 17,
    leanOffset: 0.42,

    fallDamageMinSpeed: 12.5,
    fallDamageMaxSpeed: 26,
    fallDamageMax: 95,
  },
  camera: {
    baseFov: 80,
    sprintFovBoost: 6.5,
    tacSprintFovBoost: 11,
    viewmodelFov: 62,
    near: 0.05,
    far: 1600,
    /** Head-bob amplitude in metres at walk speed. */
    bobAmount: 0.021,
    bobFrequency: 8.4,
    breathAmount: 0.0055,
    breathFrequency: 0.85,
  },
  combat: {
    /** Metres the bullet travels per second for hitscan tracer visuals. */
    tracerSpeed: 340,
    headshotMultiplier: 2.35,
    limbMultiplier: 0.82,
    /** Damage falloff is defined per weapon; this is the global floor. */
    minDamageScale: 0.32,
    friendlyFire: false,
  },
} as const;
