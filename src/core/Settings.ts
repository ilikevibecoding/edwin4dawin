/**
 * Player settings with local persistence. Owner: Opus 1.
 */
import type { Settings } from './Types';

const STORAGE_KEY = 'northstar-rescue.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  effectsVolume: 0.9,
  musicVolume: 0.45,
  mouseSensitivity: 1.0,
  invertY: false,
  fieldOfView: 90,
  quality: 'high',
  resolutionScale: 1,
  crosshairVisible: true,
  reducedCameraMotion: false,
  reducedBlood: false,
  subtitles: true,
  minimap: true,
  motionBlur: false,
  showFps: false,
};

export function loadSettings(): Settings {
  const base = { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(base, JSON.parse(raw) as Partial<Settings>);
  } catch {
    /* storage unavailable (private mode / automation) - defaults are fine */
  }
  return base;
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function clampSettings(s: Settings): Settings {
  s.masterVolume = clamp(s.masterVolume, 0, 1);
  s.effectsVolume = clamp(s.effectsVolume, 0, 1);
  s.musicVolume = clamp(s.musicVolume, 0, 1);
  s.mouseSensitivity = clamp(s.mouseSensitivity, 0.15, 4);
  s.fieldOfView = clamp(s.fieldOfView, 65, 110);
  s.resolutionScale = clamp(s.resolutionScale, 0.5, 1);
  return s;
}

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}
