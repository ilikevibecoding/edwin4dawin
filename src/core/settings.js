// Persistent player settings. Quality presets drive renderer + FX budgets.
import { bus } from './events.js';

const KEY = 'nsr.settings.v1';

export const QUALITY_PRESETS = {
  low:    { shadowMapSize: 1024, shadows: true,  maxDynamicLights: 6,  particleBudget: 300,  anisotropy: 1, renderScaleDefault: 0.75, ambientDetail: false },
  medium: { shadowMapSize: 2048, shadows: true,  maxDynamicLights: 10, particleBudget: 700,  anisotropy: 2, renderScaleDefault: 1.0,  ambientDetail: true },
  high:   { shadowMapSize: 2048, shadows: true,  maxDynamicLights: 16, particleBudget: 1200, anisotropy: 4, renderScaleDefault: 1.0,  ambientDetail: true },
  ultra:  { shadowMapSize: 4096, shadows: true,  maxDynamicLights: 24, particleBudget: 2000, anisotropy: 8, renderScaleDefault: 1.0,  ambientDetail: true },
};

const DEFAULTS = {
  masterVolume: 0.8,
  sfxVolume: 1.0,
  musicVolume: 0.55,
  mouseSens: 0.5,      // 0.05 .. 2.0
  invertY: false,
  fov: 74,             // 60 .. 100
  quality: 'high',
  renderScale: 1.0,    // 0.5 .. 1.0
  crosshair: true,
  reducedMotion: false,
  reducedBlood: false,
  subtitles: true,
};

class Settings {
  constructor() {
    this.data = { ...DEFAULTS };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        for (const k of Object.keys(DEFAULTS)) if (k in saved) this.data[k] = saved[k];
      }
    } catch (e) { /* first run or blocked storage */ }
  }
  get(k) { return this.data[k]; }
  set(k, v) {
    if (this.data[k] === v) return;
    this.data[k] = v;
    this.save();
    bus.emit('settings-changed', k, v);
  }
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  }
  reset() {
    this.data = { ...DEFAULTS };
    this.save();
    bus.emit('settings-changed', '*', null);
  }
  quality() { return QUALITY_PRESETS[this.data.quality] || QUALITY_PRESETS.high; }
  // Radians of yaw per pixel of mouse movement.
  lookScale() { return 0.0032 * this.data.mouseSens; }
}

export const settings = new Settings();
