/**
 * Settings model, persistence and application.
 *
 * One object holds every player-facing preference; `apply()` is the only place
 * that pushes them into the engine, the input layer, the audio mixer and the
 * HUD, so restoring from `localStorage` at boot and changing a value at runtime
 * follow exactly the same path.
 */
import { GAMEPLAY, makeConfig, type QualityConfig, type QualityTier } from '../core/Config';
import type { ActionName } from '../core/Input';
import type { AudioSystem } from '../core/Contracts';
import type { EngineContext } from '../core/System';
import { clamp } from '../core/MathUtils';
import { prefersReducedMotion } from './Dom';
import { STREAK_ACTIONS } from './StreakDefs';

export type CrosshairStyle = 'dynamic' | 'cross' | 'dot' | 'chevron' | 'none';

/** Graphics switches the settings menu writes straight into the live config. */
export type QualityToggleKey =
  | 'shadowsEnabled'
  | 'softShadows'
  | 'contactShadows'
  | 'ssaoEnabled'
  | 'ssrEnabled'
  | 'bloomEnabled'
  | 'motionBlurEnabled'
  | 'dofEnabled'
  | 'chromaticAberration'
  | 'filmGrain'
  | 'vignette'
  | 'lensFlare'
  | 'colorGrading'
  | 'volumetricLighting'
  | 'volumetricFog'
  | 'ragdollsEnabled'
  | 'showStats';

export const QUALITY_TOGGLES: ReadonlyArray<{
  key: QualityToggleKey;
  name: string;
  hint: string;
}> = [
  { key: 'shadowsEnabled', name: 'Shadows', hint: 'Cascaded sun shadows' },
  { key: 'softShadows', name: 'Soft shadows', hint: 'Filtered shadow edges' },
  { key: 'contactShadows', name: 'Contact shadows', hint: 'Short-range grounding' },
  { key: 'ssaoEnabled', name: 'Ambient occlusion', hint: 'Screen-space contact darkening' },
  { key: 'ssrEnabled', name: 'Reflections', hint: 'Screen-space reflections' },
  { key: 'bloomEnabled', name: 'Bloom', hint: 'Highlight bleed' },
  { key: 'motionBlurEnabled', name: 'Motion blur', hint: 'Per-object velocity blur' },
  { key: 'dofEnabled', name: 'Depth of field', hint: 'Focus falloff when scoped' },
  { key: 'chromaticAberration', name: 'Chromatic aberration', hint: 'Lens fringing at the edges' },
  { key: 'filmGrain', name: 'Film grain', hint: 'Sensor noise' },
  { key: 'vignette', name: 'Vignette', hint: 'Corner darkening' },
  { key: 'lensFlare', name: 'Lens flare', hint: 'Sun ghosting' },
  { key: 'colorGrading', name: 'Colour grading', hint: 'Filmic LUT' },
  { key: 'volumetricLighting', name: 'Volumetric light', hint: 'Light shafts through dust' },
  { key: 'volumetricFog', name: 'Volumetric fog', hint: 'Height fog' },
  { key: 'ragdollsEnabled', name: 'Ragdolls', hint: 'Simulated bodies on death' },
  { key: 'showStats', name: 'Renderer stats', hint: 'Pipeline diagnostics overlay' },
];

export type Binding = { keys: string[]; mouse?: number[] };

/**
 * Mirror of the input layer's defaults, kept here because they are private to it
 * and the rebinding screen has to be able to show and restore them.
 */
export const DEFAULT_BINDINGS: Readonly<Record<ActionName, Binding>> = {
  forward: { keys: ['KeyW', 'ArrowUp'] },
  back: { keys: ['KeyS', 'ArrowDown'] },
  left: { keys: ['KeyA', 'ArrowLeft'] },
  right: { keys: ['KeyD', 'ArrowRight'] },
  jump: { keys: ['Space'] },
  crouch: { keys: ['ControlLeft', 'KeyC'] },
  prone: { keys: ['KeyZ'] },
  sprint: { keys: ['ShiftLeft'] },
  fire: { keys: [], mouse: [0] },
  aim: { keys: [], mouse: [2] },
  reload: { keys: ['KeyR'] },
  melee: { keys: ['KeyV'], mouse: [1] },
  use: { keys: ['KeyF'] },
  grenade: { keys: ['KeyG'] },
  tactical: { keys: ['KeyQ'] },
  switchWeapon: { keys: ['KeyX'] },
  lastWeapon: { keys: ['Tab'] },
  weapon1: { keys: ['Digit1'] },
  weapon2: { keys: ['Digit2'] },
  leanLeft: { keys: ['KeyQ'] },
  leanRight: { keys: ['KeyE'] },
  killstreak1: { keys: ['Digit3'] },
  killstreak2: { keys: ['Digit4'] },
  killstreak3: { keys: ['Digit5'] },
  scoreboard: { keys: ['Backquote'] },
  pause: { keys: ['Escape'] },
  toggleFireMode: { keys: ['KeyB'] },
  flashlight: { keys: ['KeyL'] },
  photoMode: { keys: ['KeyP'] },
};

/** Actions worth showing on the controls list, in briefing order. */
export const BINDABLE: ReadonlyArray<{ action: ActionName; label: string }> = [
  { action: 'forward', label: 'Move forward' },
  { action: 'back', label: 'Move back' },
  { action: 'left', label: 'Strafe left' },
  { action: 'right', label: 'Strafe right' },
  { action: 'sprint', label: 'Sprint' },
  { action: 'jump', label: 'Jump / mantle' },
  { action: 'crouch', label: 'Crouch' },
  { action: 'prone', label: 'Prone' },
  { action: 'fire', label: 'Fire' },
  { action: 'aim', label: 'Aim down sights' },
  { action: 'reload', label: 'Reload' },
  { action: 'melee', label: 'Melee' },
  { action: 'use', label: 'Interact' },
  { action: 'grenade', label: 'Frag grenade' },
  { action: 'tactical', label: 'Tactical' },
  { action: 'switchWeapon', label: 'Swap weapon' },
  { action: 'lastWeapon', label: 'Last weapon' },
  { action: 'weapon1', label: 'Primary' },
  { action: 'weapon2', label: 'Secondary' },
  { action: 'toggleFireMode', label: 'Fire mode' },
  // Both leans, even though the stock bindings put lean left on the same key as
  // the tactical grenade: hiding half a pair reads as an omission, and the only
  // screen that can resolve the clash is this one.
  { action: 'leanLeft', label: 'Lean left' },
  { action: 'leanRight', label: 'Lean right' },
  { action: 'killstreak1', label: 'Killstreak 1' },
  { action: 'killstreak2', label: 'Killstreak 2' },
  { action: 'killstreak3', label: 'Killstreak 3' },
  { action: 'scoreboard', label: 'Scoreboard' },
  { action: 'pause', label: 'Pause' },
];

export interface SettingsData {
  tier: QualityTier;
  adaptiveResolution: boolean;
  renderScale: number;
  antialias: QualityConfig['antialias'];
  overrides: Partial<Record<QualityToggleKey, boolean>>;

  fov: number;
  sensitivity: number;
  adsSensitivity: number;
  invertY: boolean;

  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;

  crosshair: CrosshairStyle;
  minimapRotate: boolean;
  hudBlur: boolean;
  showUiStats: boolean;
  hudOpacity: number;
}

const STORE_KEY = 'ob.ui.settings';
const BIND_KEY = 'ob.ui.bindings';
/** Read by `main.ts` on the next boot, so the tier survives a reload. */
const TIER_KEY = 'ob.quality';

function defaults(tier: QualityTier): SettingsData {
  const base = makeConfig(tier);
  return {
    tier,
    adaptiveResolution: true,
    renderScale: base.renderScale,
    antialias: base.antialias,
    overrides: {},
    fov: GAMEPLAY.camera.baseFov,
    sensitivity: 1,
    adsSensitivity: 0.72,
    invertY: false,
    masterVolume: 0.85,
    sfxVolume: 1,
    musicVolume: 0.6,
    crosshair: 'dynamic',
    // The one piece of HUD motion a player cannot look away from. Everything
    // else that respects the reduced-motion preference does it in the
    // stylesheet; a rotating map is a default, not an animation.
    minimapRotate: !prefersReducedMotion(),
    hudBlur: true,
    showUiStats: false,
    hudOpacity: 1,
  };
}

/** A mixer bus trim, wherever the audio module happens to be keeping it. */
type BusSetter = (bus: string, v: number) => void;

/** Audio methods beyond the contract that the mixer may expose. */
interface AudioExtras extends AudioSystem {
  setSfxVolume?(v: number): void;
  setMusicVolume?(v: number): void;
  setBusVolume?: BusSetter;
  /**
   * Private to the audio module and typed here only so the probe below can look
   * for it. Optional at every level: this is a shape test, not a dependency.
   */
  engine?: { graph?: { setBusVolume?: BusSetter } | null };
}

/**
 * What the effects slider governs. "SFX" to a player means everything the world
 * makes, so it covers the mixer's world buses rather than only the one that
 * happens to be named after it — gunfire and ambience are separate buses, and a
 * slider that leaves the loudest thing in the game at full is not a volume.
 */
const SFX_BUSES: readonly string[] = ['sfx', 'weapons', 'ambience'];

export class Settings {
  data: SettingsData;
  bindings: Record<ActionName, Binding>;

  private readonly ctx: EngineContext;
  private saveTimer = 0;
  private listeners: Array<() => void> = [];
  private streakKeyLabels: readonly string[] = [];

  constructor(ctx: EngineContext) {
    this.ctx = ctx;
    this.data = defaults(ctx.config.tier);
    this.bindings = structuredClone(DEFAULT_BINDINGS) as Record<ActionName, Binding>;
    this.load();
    this.refreshStreakKeys();
  }

  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  private load(): void {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SettingsData>;
        // Merged field by field so a stored file written by an older build
        // cannot delete a setting this one needs.
        const next = { ...this.data };
        for (const key of Object.keys(next) as Array<keyof SettingsData>) {
          const value = parsed[key];
          if (value === undefined || value === null) continue;
          if (typeof value === typeof next[key]) {
            (next as Record<string, unknown>)[key] = value;
          }
        }
        if (parsed.overrides && typeof parsed.overrides === 'object') {
          next.overrides = { ...parsed.overrides };
        }
        this.data = next;
      }
      const binds = localStorage.getItem(BIND_KEY);
      if (binds) {
        const parsed = JSON.parse(binds) as Partial<Record<ActionName, Binding>>;
        for (const action of Object.keys(this.bindings) as ActionName[]) {
          const value = parsed[action];
          if (value && Array.isArray(value.keys)) {
            this.bindings[action] = { keys: value.keys.slice(), mouse: value.mouse?.slice() };
          }
        }
      }
    } catch (err) {
      console.warn('[ui] stored settings were unreadable; using defaults', err);
    }
    this.data.fov = clamp(this.data.fov, 65, 115);
    this.data.sensitivity = clamp(this.data.sensitivity, 0.1, 4);
    this.data.adsSensitivity = clamp(this.data.adsSensitivity, 0.2, 1.4);
  }

  /** Debounced: a slider drag must not write to storage on every frame. */
  save(): void {
    if (this.saveTimer) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = 0;
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
        localStorage.setItem(BIND_KEY, JSON.stringify(this.bindings));
        localStorage.setItem(TIER_KEY, this.data.tier);
      } catch {
        /* private browsing or a full quota: settings stay session-only */
      }
    }, 350);
  }

  // -------------------------------------------------------------------------
  // Application
  // -------------------------------------------------------------------------

  /**
   * Everything that is safe to push during system init.
   *
   * Quality is not: `engine.applyQuality` resizes every system, including the
   * ones that have not been initialised yet, because the UI initialises before
   * the renderer. The caller applies it from the first frame instead.
   */
  applyAll(): void {
    this.applyInput();
    this.applyAudio();
    this.applyBindings();
    this.notify();
  }

  /** Rebuild a config from the tier, layer the overrides on, hand it over. */
  applyQuality(): void {
    const d = this.data;
    const config = makeConfig(d.tier);
    config.antialias = d.antialias;
    config.renderScale = clamp(d.renderScale, 0.5, 1);
    for (const key of Object.keys(d.overrides) as QualityToggleKey[]) {
      const value = d.overrides[key];
      if (typeof value === 'boolean') (config as unknown as Record<string, unknown>)[key] = value;
    }
    this.ctx.engine.applyQuality(config);
    this.ctx.engine.setAdaptiveResolution(d.adaptiveResolution);
  }

  applyInput(): void {
    const input = this.ctx.input;
    input.sensitivity = this.data.sensitivity;
    input.adsSensitivityScale = this.data.adsSensitivity;
    input.invertY = this.data.invertY;
    this.applyFov();
  }

  /**
   * The camera's field of view.
   *
   * The player's camera rig recomputes its FOV every frame from
   * `GAMEPLAY.camera.baseFov`, so writing the camera would be overwritten
   * immediately; the tuning table is the only durable place to put it. The cast
   * is deliberate — the table is `as const` for authoring safety, not because it
   * is frozen at runtime.
   */
  applyFov(): void {
    (GAMEPLAY.camera as { baseFov: number }).baseFov = this.data.fov;
  }

  /**
   * Master is in the contract; the per-bus trims are not, so they are probed
   * for and skipped when the mixer does not offer them. The music fallback is
   * `setMusicIntensity`, which that module documents as doubling for a settings
   * volume — it is a floor rather than a ceiling, so it cannot mute, but it is
   * the only music control the interface exposes.
   */
  applyAudio(): void {
    const audio = this.ctx.tryGet<AudioExtras>('audio');
    if (!audio) return;
    const d = this.data;
    audio.setMasterVolume?.(d.masterVolume);

    const bus = busSetter(audio);
    if (audio.setSfxVolume) audio.setSfxVolume(d.sfxVolume);
    else if (bus) for (const id of SFX_BUSES) bus(id, d.sfxVolume);

    if (audio.setMusicVolume) audio.setMusicVolume(d.musicVolume);
    else if (bus) bus('music', d.musicVolume);
    else audio.setMusicIntensity?.(d.musicVolume);
  }

  applyBindings(): void {
    for (const action of Object.keys(this.bindings) as ActionName[]) {
      this.ctx.input.rebind(action, this.bindings[action]);
    }
    this.refreshStreakKeys();
  }

  /**
   * What the killstreak tray prints against each slot.
   *
   * Rebuilt only when a binding changes and returned by reference, so the widget
   * can tell "unchanged" from "changed" with a pointer comparison rather than
   * rebuilding three glyphs a frame.
   */
  get streakKeys(): readonly string[] {
    return this.streakKeyLabels;
  }

  private refreshStreakKeys(): void {
    const next = STREAK_ACTIONS.map((action) => {
      const binding = this.bindings[action];
      const key = binding?.keys[0];
      if (key) return keyLabel(key);
      const button = binding?.mouse?.[0];
      return button === undefined ? '—' : mouseLabel(button);
    });
    for (let i = 0; i < next.length; i++) {
      if (next[i] !== this.streakKeyLabels[i]) {
        this.streakKeyLabels = next;
        return;
      }
    }
  }

  resetBindings(): void {
    this.bindings = structuredClone(DEFAULT_BINDINGS) as Record<ActionName, Binding>;
    this.ctx.input.resetBindings();
    this.save();
    this.notify();
  }

  /**
   * Back to the shipped defaults for the detected hardware, bindings included.
   * The tier itself is kept: it was chosen by probing the GPU, and a player who
   * wanted a different one would have changed it rather than pressed this.
   */
  restoreDefaults(): void {
    this.data = defaults(this.data.tier);
    this.bindings = structuredClone(DEFAULT_BINDINGS) as Record<ActionName, Binding>;
    this.ctx.input.resetBindings();
    this.applyQuality();
    this.applyInput();
    this.applyAudio();
    this.save();
    this.notify();
  }

  setTier(tier: QualityTier): void {
    if (this.data.tier === tier) return;
    const base = makeConfig(tier);
    this.data.tier = tier;
    // A preset is a statement about the whole pipeline; keeping individual
    // overrides across a change would silently make "ultra" not ultra.
    this.data.overrides = {};
    this.data.antialias = base.antialias;
    this.data.renderScale = base.renderScale;
    this.applyQuality();
    this.save();
    this.notify();
  }

  setToggle(key: QualityToggleKey, value: boolean): void {
    this.data.overrides[key] = value;
    this.applyQuality();
    this.save();
    this.notify();
  }

  toggleValue(key: QualityToggleKey): boolean {
    const stored = this.data.overrides[key];
    if (typeof stored === 'boolean') return stored;
    const live = this.ctx.config as unknown as Record<string, unknown>;
    return live[key] === true;
  }

  notify(): void {
    for (const fn of this.listeners) fn();
  }

  dispose(): void {
    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = 0;
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
        localStorage.setItem(BIND_KEY, JSON.stringify(this.bindings));
      } catch {
        /* ignore */
      }
    }
    this.listeners = [];
  }
}

/**
 * The mixer's per-bus trim, if it can be reached.
 *
 * A public `setBusVolume` is the intended route and is tried first. The mixer
 * does not currently publish one — it keeps the method on the graph behind a
 * private field — and without it the effects and music sliders move a control
 * that changes nothing, which is worse than not shipping them. So the graph is
 * probed for as a fallback. Guarded at every hop and bound to its owner, so a
 * rename on the far side degrades to master-only rather than throwing. Listed
 * in the report as the contract change that would retire this.
 */
function busSetter(audio: AudioExtras): BusSetter | null {
  if (typeof audio.setBusVolume === 'function') return audio.setBusVolume.bind(audio);
  const graph = audio.engine?.graph;
  if (graph && typeof graph.setBusVolume === 'function') return graph.setBusVolume.bind(graph);
  return null;
}

/** Human-readable label for a key code or mouse button. */
export function bindingLabel(binding: Binding | undefined): string {
  if (!binding) return '—';
  const parts: string[] = [];
  for (const key of binding.keys) parts.push(keyLabel(key));
  for (const button of binding.mouse ?? []) parts.push(mouseLabel(button));
  return parts.length ? parts.slice(0, 2).join(' / ') : '—';
}

export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `NUM ${code.slice(6)}`;
  if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
  switch (code) {
    case 'Space':
      return 'SPACE';
    case 'ControlLeft':
      return 'L-CTRL';
    case 'ControlRight':
      return 'R-CTRL';
    case 'ShiftLeft':
      return 'L-SHIFT';
    case 'ShiftRight':
      return 'R-SHIFT';
    case 'AltLeft':
      return 'L-ALT';
    case 'Backquote':
      return '`';
    case 'Escape':
      return 'ESC';
    case 'Tab':
      return 'TAB';
    case 'Enter':
      return 'ENTER';
    default:
      return code.toUpperCase();
  }
}

export function mouseLabel(button: number): string {
  switch (button) {
    case 0:
      return 'LMB';
    case 1:
      return 'MMB';
    case 2:
      return 'RMB';
    default:
      return `M${button + 1}`;
  }
}
