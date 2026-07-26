// Player settings with localStorage persistence and change notification.
const KEY = 'northstar.settings.v1';

export const DEFAULTS = {
  sensitivity: 1.0,        // 0.1 .. 3
  invertY: false,
  fov: 75,                 // 60 .. 100
  quality: 'high',         // low | medium | high | ultra
  resolutionScale: 1.0,    // 0.5 .. 1.0
  crosshair: true,
  reducedMotion: false,    // disables head bob / camera shake
  reducedBlood: false,
  subtitles: true,
  volMaster: 0.8,
  volEffects: 0.8,
  volMusic: 0.55,
  volUI: 0.7,
};

class Settings {
  constructor() {
    this.data = { ...DEFAULTS };
    this.listeners = new Set();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const k of Object.keys(DEFAULTS)) if (k in parsed) this.data[k] = parsed[k];
      }
    } catch { /* fresh defaults */ }
  }
  get(k) { return this.data[k]; }
  set(k, v) {
    if (this.data[k] === v) return;
    this.data[k] = v;
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* private mode */ }
    for (const fn of this.listeners) fn(k, v);
  }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  resetToDefaults() { for (const k of Object.keys(DEFAULTS)) this.set(k, DEFAULTS[k]); }
}

export const settings = new Settings();
