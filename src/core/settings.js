// Player-facing settings with persistence. `apply` listeners let systems react
// (renderer scale, fov, audio volumes) without importing each other.

const DEFAULTS = {
  masterVolume: 0.8,
  sfxVolume: 0.9,
  musicVolume: 0.55,
  mouseSensitivity: 0.55,   // 0.05 .. 1.5
  invertY: false,
  fov: 74,                  // 60..100
  quality: 'high',          // low | medium | high | ultra
  resolutionScale: 1.0,     // 0.5 .. 1.0
  crosshair: true,
  reducedMotion: false,
  reducedBlood: false,
  subtitles: true,
};

const KEY = 'northstar-rescue.settings.v1';
let current = { ...DEFAULTS };
const appliers = new Set();

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      for (const k of Object.keys(DEFAULTS)) if (k in saved) current[k] = saved[k];
    }
  } catch { /* private mode etc: run on defaults */ }
  return current;
}

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* ignore */ }
}

export function getSetting(k) { return current[k]; }
export function allSettings() { return { ...current }; }

export function setSetting(k, v) {
  if (!(k in DEFAULTS)) { console.warn('[settings] unknown key', k); return; }
  current[k] = v;
  saveSettings();
  for (const fn of appliers) { try { fn(k, v, current); } catch (e) { console.error(e); } }
}

export function resetSettings() {
  current = { ...DEFAULTS };
  saveSettings();
  for (const fn of appliers) { try { fn('*', null, current); } catch (e) { console.error(e); } }
}

export function onSettingsApplied(fn) { appliers.add(fn); return () => appliers.delete(fn); }

export const QUALITY_PRESETS = {
  low:    { shadows: false, shadowMapSize: 512,  maxPixelRatio: 1.0, particleScale: 0.4, anisotropy: 1, dynamicLights: 4,  fxaa: false },
  medium: { shadows: true,  shadowMapSize: 1024, maxPixelRatio: 1.0, particleScale: 0.7, anisotropy: 2, dynamicLights: 8,  fxaa: false },
  high:   { shadows: true,  shadowMapSize: 2048, maxPixelRatio: 1.5, particleScale: 1.0, anisotropy: 4, dynamicLights: 17, fxaa: false },
  ultra:  { shadows: true,  shadowMapSize: 2048, maxPixelRatio: 2.0, particleScale: 1.0, anisotropy: 8, dynamicLights: 21, fxaa: false },
};
export function qualityPreset() { return QUALITY_PRESETS[current.quality] || QUALITY_PRESETS.high; }
