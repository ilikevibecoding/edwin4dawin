/**
 * Runtime settings. Quality presets drive rendering cost; URL params override anything
 * (e.g. ?quality=low&shot=1&fov=70). `shot` mode is used by tools/shot.mjs for deterministic
 * headless screenshots: fixed timestep, no pointer-lock gate, audio muted.
 */
export const QUALITY_PRESETS = {
  // Software-GL / integrated-GPU fallback: half-resolution, single shadow cascade, no post effects.
  potato: {
    pixelRatio: 0.5,
    shadows: true,
    shadowMapSize: 1024,
    shadowCascades: 1,
    ao: false,
    aoSamples: 4,
    bloom: false,
    smaa: false,
    anisotropy: 1,
    particles: 0.25,
    maxCasings: 12,
    maxDebris: 20,
    envMapSize: 128,
    parallax: false,
  },
  low: {
    pixelRatio: 1,
    shadows: true,
    shadowMapSize: 1024,
    shadowCascades: 2,
    ao: false,
    aoSamples: 8,
    bloom: true,
    smaa: false,
    anisotropy: 4,
    particles: 0.4,
    maxCasings: 24,
    maxDebris: 40,
    envMapSize: 256,
    parallax: false,
  },
  medium: {
    pixelRatio: 1,
    shadows: true,
    shadowMapSize: 2048,
    shadowCascades: 3,
    ao: true,
    aoSamples: 8,
    bloom: true,
    smaa: true,
    anisotropy: 8,
    particles: 0.7,
    maxCasings: 48,
    maxDebris: 80,
    envMapSize: 256,
    parallax: false,
  },
  high: {
    pixelRatio: 1,
    shadows: true,
    shadowMapSize: 2048,
    shadowCascades: 4,
    ao: true,
    aoSamples: 16,
    bloom: true,
    smaa: true,
    msaa: 4,
    anisotropy: 16,
    particles: 1.0,
    maxCasings: 64,
    maxDebris: 120,
    envMapSize: 512,
    parallax: true,
  },
  ultra: {
    pixelRatio: 1.5,
    shadows: true,
    shadowMapSize: 4096,
    shadowCascades: 4,
    ao: true,
    aoSamples: 32,
    bloom: true,
    smaa: true,
    msaa: 4,
    anisotropy: 16,
    particles: 1.0,
    maxCasings: 96,
    maxDebris: 200,
    envMapSize: 512,
    parallax: true,
  },
};

export class Settings {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.params = params;

    this.shotMode = params.get('shot') === '1';
    this.qualityName = params.get('quality') || (this.shotMode ? 'high' : this.autoDetectQuality());
    this.quality = { ...(QUALITY_PRESETS[this.qualityName] || QUALITY_PRESETS.high) };

    // Gameplay / camera
    this.fov = parseFloat(params.get('fov') || '62'); // vertical FOV in degrees (~94 horizontal @16:9)
    this.weaponFov = parseFloat(params.get('weaponFov') || '52'); // wider view-model FOV: MW-style rail convergence with the gun held close
    this.mouseSensitivity = parseFloat(params.get('sens') || '0.0022');
    this.invertY = params.get('invertY') === '1';

    // Debug toggles
    this.debug = params.get('debug') === '1';
    this.noEnemies = params.get('noEnemies') === '1';
    this.godMode = params.get('god') === '1';
    this.startPaused = params.get('paused') === '1';
    this.fixedDt = params.has('fixedDt') ? parseFloat(params.get('fixedDt')) : (this.shotMode ? 1 / 60 : 0);
    this.muted = this.shotMode || params.get('mute') === '1';
    this.map = params.get('map') || 'seaside';
    this.timeOfDay = params.get('tod') || 'afternoon';

    if (params.has('pixelRatio')) this.quality.pixelRatio = parseFloat(params.get('pixelRatio'));
    if (params.has('ao')) this.quality.ao = params.get('ao') === '1';
    if (params.has('shadows')) this.quality.shadows = params.get('shadows') === '1';
  }

  autoDetectQuality() {
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 8;
    if (cores >= 8 && mem >= 8) return 'high';
    if (cores >= 4) return 'medium';
    return 'low';
  }

  setQuality(name) {
    if (!QUALITY_PRESETS[name]) return;
    this.qualityName = name;
    this.quality = { ...QUALITY_PRESETS[name] };
  }
}
