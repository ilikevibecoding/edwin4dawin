import { bus, EV } from './events.js';

/**
 * Player-facing settings with persistence.
 *
 * Quality presets drive renderer configuration (shadow map size, pixel ratio,
 * post-processing, prop density and light counts) so the game scales down to
 * weak hardware without changing the art direction.
 */

const STORAGE_KEY = 'northstar.settings.v1';

export const QUALITY_PRESETS = {
  low: {
    label: 'Low',
    pixelRatioCap: 1.0,
    resolutionScale: 0.75,
    shadowMapSize: 1024,
    shadowInterval: 4,
    shadowsEnabled: false,
    sunShadows: false,
    localShadowLights: 0,
    maxDynamicLights: 5,
    anisotropy: 2,
    antialias: false,
    ssaoEnabled: false,
    bloomEnabled: false,
    decalBudget: 48,
    particleBudget: 160,
    clutterDensity: 0.35,
    lodBias: 0.6,
    reflections: false,
  },
  medium: {
    label: 'Medium',
    pixelRatioCap: 1.25,
    resolutionScale: 0.9,
    shadowMapSize: 1536,
    shadowInterval: 3,
    shadowsEnabled: true,
    sunShadows: true,
    localShadowLights: 0,
    maxDynamicLights: 9,
    anisotropy: 4,
    antialias: true,
    ssaoEnabled: false,
    bloomEnabled: true,
    decalBudget: 96,
    particleBudget: 320,
    clutterDensity: 0.75,
    lodBias: 0.85,
    reflections: false,
  },
  high: {
    label: 'High',
    pixelRatioCap: 1.5,
    resolutionScale: 1.0,
    shadowMapSize: 2048,
    shadowInterval: 2,
    shadowsEnabled: true,
    sunShadows: true,
    localShadowLights: 0,
    maxDynamicLights: 14,
    anisotropy: 8,
    antialias: true,
    ssaoEnabled: true,
    bloomEnabled: true,
    decalBudget: 160,
    particleBudget: 640,
    clutterDensity: 1.0,
    lodBias: 1.0,
    reflections: true,
  },
  ultra: {
    label: 'Ultra',
    pixelRatioCap: 2.0,
    resolutionScale: 1.0,
    shadowMapSize: 3072,
    shadowInterval: 1,
    shadowsEnabled: true,
    sunShadows: true,
    localShadowLights: 2,
    maxDynamicLights: 20,
    anisotropy: 16,
    antialias: true,
    ssaoEnabled: true,
    bloomEnabled: true,
    decalBudget: 240,
    particleBudget: 1024,
    clutterDensity: 1.0,
    lodBias: 1.25,
    reflections: true,
  },
};

export const DEFAULTS = {
  masterVolume: 0.8,
  sfxVolume: 0.9,
  musicVolume: 0.45,
  mouseSensitivity: 0.14,
  adsSensitivityScale: 0.65,
  invertY: false,
  fov: 82,
  quality: 'high',
  resolutionScale: 1.0,
  crosshairVisible: true,
  crosshairStyle: 'dynamic',
  reducedCameraMotion: false,
  reducedBlood: false,
  motionBlur: false,
  subtitles: true,
  showMinimap: true,
  showHitmarkers: true,
  colorBlindMode: 'off',
  uiScale: 1.0,
  toggleCrouch: false,
  toggleAds: false,
};

class Settings {
  constructor() {
    this.values = { ...DEFAULTS };
    this.load();
  }

  get preset() {
    return QUALITY_PRESETS[this.values.quality] ?? QUALITY_PRESETS.high;
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    if (this.values[key] === value) return;
    this.values[key] = value;
    this.save();
    bus.emit(EV.SETTINGS_CHANGED, { key, value, settings: this.values });
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
      bus.emit(EV.SETTINGS_CHANGED, { key: null, value: null, settings: this.values });
    }
  }

  reset() {
    this.values = { ...DEFAULTS };
    this.save();
    bus.emit(EV.SETTINGS_CHANGED, { key: null, value: null, settings: this.values });
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(this.values, JSON.parse(raw));
    } catch {
      /* storage unavailable (private mode / automation) - defaults are fine */
    }
    // Automation override: ?quality=low&seed=5 keeps Playwright runs deterministic.
    try {
      const q = new URLSearchParams(location.search);
      if (q.has('quality') && QUALITY_PRESETS[q.get('quality')]) {
        this.values.quality = q.get('quality');
      }
      if (q.has('sens')) this.values.mouseSensitivity = parseFloat(q.get('sens'));
      if (q.has('fov')) this.values.fov = parseFloat(q.get('fov'));
    } catch {
      /* no location in some contexts */
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch {
      /* ignore */
    }
  }
}

export const settings = new Settings();
