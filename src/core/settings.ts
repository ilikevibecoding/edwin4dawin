import { events } from './events';

export type Quality = 'low' | 'medium' | 'high' | 'ultra';

export interface Settings {
  masterVolume: number;   // 0..1
  effectsVolume: number;  // 0..1
  musicVolume: number;    // 0..1
  mouseSensitivity: number; // 0.2..3 multiplier
  invertY: boolean;
  fov: number;            // 60..110 vertical degrees
  quality: Quality;
  resolutionScale: number; // 0.5..1.5
  crosshair: boolean;
  reducedMotion: boolean; // reduces bob/sway/shake
  reducedBlood: boolean;
  subtitles: boolean;
}

const DEFAULTS: Settings = {
  masterVolume: 0.8,
  effectsVolume: 0.9,
  musicVolume: 0.5,
  mouseSensitivity: 1.0,
  invertY: false,
  fov: 75,
  quality: 'high',
  resolutionScale: 1.0,
  crosshair: true,
  reducedMotion: false,
  reducedBlood: false,
  subtitles: true,
};

const KEY = 'northstar-rescue.settings.v1';

class SettingsStore {
  private data: Settings;

  constructor() {
    this.data = { ...DEFAULTS };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        for (const k of Object.keys(DEFAULTS) as (keyof Settings)[]) {
          if (parsed[k] !== undefined && typeof parsed[k] === typeof DEFAULTS[k]) {
            (this.data as unknown as Record<string, unknown>)[k] = parsed[k];
          }
        }
      }
    } catch {
      /* fresh defaults */
    }
  }

  get<K extends keyof Settings>(key: K): Settings[K] {
    return this.data[key];
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    if (this.data[key] === value) return;
    this.data[key] = value;
    this.persist();
    events.emit('settings:changed', { key });
  }

  all(): Readonly<Settings> {
    return this.data;
  }

  resetToDefaults(): void {
    this.data = { ...DEFAULTS };
    this.persist();
    events.emit('settings:changed', { key: '*' });
  }

  private persist(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* private mode */
    }
  }
}

export const settings = new SettingsStore();
