/**
 * Global runtime configuration: quality tier detection, accessibility options
 * and the deterministic-test switches used by Playwright.
 */

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

function detectRenderer() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { vendor: 'none', renderer: 'none', webgl2: false };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    return { vendor: String(vendor), renderer: String(renderer), webgl2 };
  } catch {
    return { vendor: 'unknown', renderer: 'unknown', webgl2: false };
  }
}

const gpu = detectRenderer();
const softwareGL = /swiftshader|llvmpipe|software|microsoft basic/i.test(gpu.renderer);

/** Quality presets. `low` is what the software rasteriser in CI gets. */
export const QUALITY_TIERS = {
  low: {
    name: 'low',
    pixelRatio: 1,
    shadows: false,
    shadowMapSize: 1024,
    bloom: true,
    bloomQuality: 'cheap',
    maxSmokeParticles: 4500,
    maxSparks: 900,
    maxDebris: 160,
    terrainSegments: 110,
    cloudCount: 22,
    starCount: 1400,
    dustMotes: 0,
    anisotropy: 2,
    lightCones: true,
    groundDetail: 0.45,
    msaa: 0
  },
  medium: {
    name: 'medium',
    pixelRatio: 1.25,
    shadows: true,
    shadowMapSize: 2048,
    bloom: true,
    bloomQuality: 'full',
    maxSmokeParticles: 13000,
    maxSparks: 2400,
    maxDebris: 320,
    terrainSegments: 170,
    cloudCount: 40,
    starCount: 2600,
    dustMotes: 420,
    anisotropy: 8,
    lightCones: true,
    groundDetail: 1,
    msaa: 0
  },
  high: {
    name: 'high',
    pixelRatio: 1.6,
    shadows: true,
    shadowMapSize: 4096,
    bloom: true,
    bloomQuality: 'full',
    maxSmokeParticles: 22000,
    maxSparks: 4200,
    maxDebris: 520,
    terrainSegments: 190,
    cloudCount: 60,
    starCount: 4200,
    dustMotes: 900,
    anisotropy: 16,
    lightCones: true,
    groundDetail: 1.35,
    msaa: 0
  }
};

function autoTier() {
  if (softwareGL) return 'low';
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  if (mem <= 4 || cores <= 4) return 'medium';
  return 'high';
}

const requestedTier = params.get('quality');
const initialTier = QUALITY_TIERS[requestedTier] ? requestedTier : autoTier();

export const settings = {
  gpu,
  softwareGL,
  /** Deterministic mode: fixed seed, no wall-clock jitter, test hooks exposed. */
  testMode: params.has('test'),
  seed: params.has('seed') ? Number(params.get('seed')) >>> 0 : (Math.random() * 0xffffffff) >>> 0,
  /** Skip the title screen (tests and `?skipintro=1`). */
  skipIntro: params.has('skipintro') || params.has('test'),
  quality: QUALITY_TIERS[initialTier],
  qualityName: initialTier,
  reducedMotion:
    params.get('reducedmotion') === '1' ||
    (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches),
  audioEnabled: !params.has('test'),
  masterVolume: 0.8,
  fov: 68,
  mouseSensitivity: 1.0,
  invertY: false,
  showFps: params.has('fps') || params.has('test'),
  subtitles: true,
  highContrastHud: false,
  colorBlindMode: 'off',
  /** Fixed simulation step, 120 Hz, so physics never depends on frame rate. */
  fixedStep: 1 / 120,
  maxSubSteps: 8
};

const listeners = new Set();

export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function updateSettings(patch) {
  Object.assign(settings, patch);
  if (patch.qualityName && QUALITY_TIERS[patch.qualityName]) {
    settings.quality = QUALITY_TIERS[patch.qualityName];
  }
  for (const fn of listeners) fn(settings, patch);
}

export function setQuality(name) {
  if (!QUALITY_TIERS[name]) return;
  updateSettings({ qualityName: name, quality: QUALITY_TIERS[name] });
}
