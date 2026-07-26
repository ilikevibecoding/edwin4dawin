import { bus, EVT } from './events.js';

export const QUALITY_PRESETS = {
  low: {
    label: 'Low',
    shadows: false,
    shadowMapSize: 512,
    shadowRefreshInterval: 1,
    maxDynamicLights: 6,
    anisotropy: 1,
    textureScale: 0.5,
    particleScale: 0.4,
    decalBudget: 48,
    ssaa: false,
    bloom: false,
    propDensity: 0.55,
    lodBias: 1.6,
    resolutionScale: 0.75,
  },
  medium: {
    label: 'Medium',
    shadows: true,
    shadowMapSize: 1024,
    shadowRefreshInterval: 4,
    maxDynamicLights: 10,
    anisotropy: 4,
    textureScale: 0.75,
    particleScale: 0.7,
    decalBudget: 96,
    ssaa: false,
    bloom: true,
    propDensity: 0.8,
    lodBias: 1.2,
    resolutionScale: 0.9,
  },
  high: {
    label: 'High',
    shadows: true,
    shadowMapSize: 2048,
    shadowRefreshInterval: 3,
    maxDynamicLights: 16,
    anisotropy: 8,
    textureScale: 1,
    particleScale: 1,
    decalBudget: 160,
    ssaa: true,
    bloom: true,
    propDensity: 1,
    lodBias: 1,
    resolutionScale: 1,
  },
  ultra: {
    label: 'Ultra',
    shadows: true,
    shadowMapSize: 2048,
    shadowRefreshInterval: 2,
    maxDynamicLights: 24,
    anisotropy: 16,
    textureScale: 1,
    particleScale: 1.3,
    decalBudget: 240,
    ssaa: true,
    bloom: true,
    propDensity: 1,
    lodBias: 0.8,
    resolutionScale: 1,
  },
};

const DEFAULTS = {
  // audio
  masterVolume: 0.8,
  effectsVolume: 1.0,
  musicVolume: 0.5,
  voiceVolume: 1.0,
  // input
  mouseSensitivity: 0.16,
  adsSensitivityScale: 0.65,
  invertY: false,
  toggleCrouch: false,
  toggleAds: false,
  // view
  fov: 82,
  // graphics
  quality: 'high',
  resolutionScale: 1,
  motionBlur: false,
  bloom: true,
  filmGrain: true,
  vignette: true,
  // accessibility / comfort
  crosshair: true,
  crosshairStyle: 'dynamic',
  reducedCameraMotion: false,
  reducedBlood: false,
  subtitles: true,
  highContrastTargets: false,
  uiScale: 1,
  showFps: false,
  // gameplay
  difficulty: 'operator',
};

const STORAGE_KEY = 'northstar.settings.v1';

class SettingsStore {
  constructor() {
    this.values = { ...DEFAULTS };
    this.load();
  }

  get defaults() {
    return { ...DEFAULTS };
  }

  get quality() {
    return QUALITY_PRESETS[this.values.quality] || QUALITY_PRESETS.high;
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    if (this.values[key] === value) return value;
    this.values[key] = value;
    this.save();
    bus.emit(EVT.SETTINGS_CHANGED, { key, value, values: this.values });
    return value;
  }

  patch(obj) {
    let changed = false;
    for (const [k, v] of Object.entries(obj)) {
      if (this.values[k] !== v) {
        this.values[k] = v;
        changed = true;
      }
    }
    if (changed) {
      this.save();
      bus.emit(EVT.SETTINGS_CHANGED, { key: null, value: null, values: this.values });
    }
  }

  reset() {
    this.values = { ...DEFAULTS };
    this.save();
    bus.emit(EVT.SETTINGS_CHANGED, { key: null, value: null, values: this.values });
  }

  load() {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      for (const key of Object.keys(DEFAULTS)) {
        if (parsed[key] !== undefined) this.values[key] = parsed[key];
      }
    } catch {
      /* storage unavailable (private mode / automation) - defaults are fine */
    }
  }

  save() {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch {
      /* non-fatal */
    }
  }
}

export const settings = new SettingsStore();
