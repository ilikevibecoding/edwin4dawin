export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra' | 'cinematic';

export interface QualityConfig {
  /** Render scale relative to CSS pixels (before DPR clamping). */
  renderScale: number;
  maxPixelRatio: number;
  shadowMapSize: number;
  shadowCascades: number;
  shadowDistance: number;
  softShadows: boolean;
  contactShadows: boolean;

  ssao: boolean;
  ssaoQuality: 'low' | 'medium' | 'high';
  ssr: boolean;
  bloom: boolean;
  volumetrics: boolean;
  volumetricSteps: number;
  motionBlur: boolean;
  depthOfField: boolean;
  chromaticAberration: boolean;
  filmGrain: boolean;
  antialias: 'none' | 'fxaa' | 'smaa' | 'taa';

  anisotropy: number;
  textureSize: number;
  detailNormals: boolean;

  particleBudget: number;
  decalBudget: number;
  debrisBudget: number;
  vegetationDensity: number;
  propDensity: number;
  corpseLimit: number;
}

const PRESETS: Record<QualityPreset, QualityConfig> = {
  low: {
    renderScale: 0.72,
    maxPixelRatio: 1,
    shadowMapSize: 1024,
    shadowCascades: 2,
    shadowDistance: 22,
    softShadows: false,
    contactShadows: false,
    ssao: false,
    ssaoQuality: 'low',
    ssr: false,
    bloom: true,
    volumetrics: false,
    volumetricSteps: 0,
    motionBlur: false,
    depthOfField: false,
    chromaticAberration: false,
    filmGrain: true,
    antialias: 'fxaa',
    anisotropy: 2,
    textureSize: 256,
    detailNormals: false,
    particleBudget: 900,
    decalBudget: 48,
    debrisBudget: 40,
    vegetationDensity: 0.25,
    propDensity: 0.45,
    corpseLimit: 3,
  },
  medium: {
    renderScale: 0.85,
    maxPixelRatio: 1.25,
    shadowMapSize: 2048,
    shadowCascades: 3,
    shadowDistance: 32,
    softShadows: true,
    contactShadows: false,
    ssao: true,
    ssaoQuality: 'low',
    ssr: false,
    bloom: true,
    volumetrics: true,
    volumetricSteps: 12,
    motionBlur: false,
    depthOfField: true,
    chromaticAberration: true,
    filmGrain: true,
    antialias: 'smaa',
    anisotropy: 4,
    textureSize: 512,
    detailNormals: true,
    particleBudget: 2200,
    decalBudget: 96,
    debrisBudget: 90,
    vegetationDensity: 0.55,
    propDensity: 0.7,
    corpseLimit: 6,
  },
  high: {
    renderScale: 1,
    maxPixelRatio: 1.5,
    shadowMapSize: 3072,
    shadowCascades: 3,
    shadowDistance: 45,
    softShadows: true,
    contactShadows: true,
    ssao: true,
    ssaoQuality: 'medium',
    ssr: false,
    bloom: true,
    volumetrics: true,
    volumetricSteps: 20,
    motionBlur: true,
    depthOfField: true,
    chromaticAberration: true,
    filmGrain: true,
    antialias: 'smaa',
    anisotropy: 8,
    textureSize: 1024,
    detailNormals: true,
    particleBudget: 4200,
    decalBudget: 160,
    debrisBudget: 160,
    vegetationDensity: 0.8,
    propDensity: 0.9,
    corpseLimit: 10,
  },
  ultra: {
    renderScale: 1,
    maxPixelRatio: 2,
    shadowMapSize: 4096,
    shadowCascades: 4,
    shadowDistance: 46,
    softShadows: true,
    contactShadows: true,
    ssao: true,
    ssaoQuality: 'high',
    ssr: true,
    bloom: true,
    volumetrics: true,
    volumetricSteps: 28,
    motionBlur: true,
    depthOfField: true,
    chromaticAberration: true,
    filmGrain: true,
    antialias: 'smaa',
    anisotropy: 16,
    textureSize: 1024,
    detailNormals: true,
    particleBudget: 7000,
    decalBudget: 256,
    debrisBudget: 260,
    vegetationDensity: 1,
    propDensity: 1,
    corpseLimit: 16,
  },
  /** Offline/screenshot preset — quality over frame rate. */
  cinematic: {
    renderScale: 1,
    maxPixelRatio: 2,
    shadowMapSize: 4096,
    shadowCascades: 4,
    shadowDistance: 48,
    softShadows: true,
    contactShadows: true,
    ssao: true,
    ssaoQuality: 'high',
    ssr: true,
    bloom: true,
    volumetrics: true,
    volumetricSteps: 40,
    motionBlur: false,
    depthOfField: true,
    chromaticAberration: true,
    filmGrain: true,
    antialias: 'smaa',
    anisotropy: 16,
    textureSize: 2048,
    detailNormals: true,
    particleBudget: 9000,
    decalBudget: 320,
    debrisBudget: 320,
    vegetationDensity: 1,
    propDensity: 1,
    corpseLimit: 24,
  },
};

export interface UserSettings {
  quality: QualityPreset;
  fov: number;
  adsFovScale: number;
  sensitivity: number;
  adsSensitivity: number;
  invertY: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  showFps: boolean;
  crosshair: boolean;
  viewBob: number;
  cameraShake: number;
  exposure: number;
  brightness: number;
  filmGrainAmount: number;
}

const DEFAULT_USER: UserSettings = {
  quality: 'high',
  fov: 80,
  adsFovScale: 0.62,
  sensitivity: 1,
  adsSensitivity: 0.72,
  invertY: false,
  masterVolume: 0.85,
  sfxVolume: 1,
  musicVolume: 0.5,
  showFps: true,
  crosshair: true,
  viewBob: 1,
  cameraShake: 1,
  exposure: 1,
  brightness: 1,
  filmGrainAmount: 1,
};

const STORAGE_KEY = 'blackout.settings.v1';

export class Settings {
  user: UserSettings;
  quality: QualityConfig;
  private listeners = new Set<(s: Settings) => void>();

  constructor(overrides?: Partial<UserSettings>) {
    let stored: Partial<UserSettings> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {
      /* private browsing / disabled storage */
    }
    this.user = { ...DEFAULT_USER, ...stored, ...overrides };
    this.quality = { ...PRESETS[this.user.quality] };
  }

  setPreset(p: QualityPreset) {
    this.user.quality = p;
    this.quality = { ...PRESETS[p] };
    this.save();
    this.notify();
  }

  patchQuality(patch: Partial<QualityConfig>) {
    Object.assign(this.quality, patch);
    this.notify();
  }

  set<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    this.user[key] = value;
    if (key === 'quality') this.quality = { ...PRESETS[value as QualityPreset] };
    this.save();
    this.notify();
  }

  onChange(fn: (s: Settings) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const fn of this.listeners) fn(this);
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.user));
    } catch {
      /* ignore */
    }
  }

  static presets = PRESETS;

  /** Rough hardware probe used to pick a sane default on first run. */
  static autoDetect(): QualityPreset {
    const mem = (navigator as any).deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 4;
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (mobile) return 'low';
    if (mem >= 8 && cores >= 8) return 'ultra';
    if (mem >= 8 && cores >= 4) return 'high';
    if (cores >= 4) return 'medium';
    return 'low';
  }
}
