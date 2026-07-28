import type { GameContext } from '../../core/GameContext';
import type { QualityPreset, QualitySettings } from '../../core/Quality';
import type { IAudio, IPlayer } from '../../core/Interfaces';
import type { System } from '../../core/GameContext';
import { div, el } from '../dom';
import { group, header, OptionRow, SliderRow, ToggleRow } from './Widgets';

/**
 * Settings.
 *
 * Every control here writes through to the live game on the frame it is moved.
 * That is a deliberate constraint rather than a convenience: field of view and
 * sensitivity cannot be judged from a number, only from moving the view, and a
 * settings screen that requires an Apply button to find out what a value looks
 * like is a settings screen nobody tunes properly.
 *
 * The individual post-effect toggles mutate `ctx.quality` and then hand it back
 * through the pipeline's own `onQualityChange`, which is the same path
 * `Engine.setQuality` uses. Nothing here reaches inside another system.
 */

const PRESETS: QualityPreset[] = ['low', 'medium', 'high', 'ultra', 'cinematic'];
const PRESET_LABELS = ['Low', 'Medium', 'High', 'Ultra', 'Cinematic'];

/** The post chain's expensive switches, in the order a player would try them. */
const EFFECTS: Array<{ key: keyof QualitySettings; label: string; hint: string }> = [
  { key: 'bloom', label: 'Bloom', hint: 'Highlight glow around bright sources' },
  { key: 'volumetricLighting', label: 'Volumetric light', hint: 'God rays and light shafts' },
  { key: 'ssao', label: 'Ambient occlusion', hint: 'Contact shading in corners and creases' },
  { key: 'ssr', label: 'Screen-space reflections', hint: 'Wet ground and glass reflections' },
  { key: 'motionBlur', label: 'Motion blur', hint: 'Per-object blur from movement' },
  { key: 'depthOfField', label: 'Depth of field', hint: 'Focus falloff while aiming' },
  { key: 'filmGrain', label: 'Film grain', hint: 'Sensor grain over the image' },
  { key: 'chromaticAberration', label: 'Chromatic aberration', hint: 'Lens colour fringing' },
];

/** The engine, reached through the context it also implements. */
interface QualityHost {
  setQuality?(preset: QualityPreset): void;
}

export class SettingsScreen {
  readonly root: HTMLElement;
  private readonly effectRows: ToggleRow[] = [];
  private preset!: OptionRow;
  private fov!: SliderRow;
  private sensitivity!: SliderRow;
  private volume!: SliderRow;
  private ctx!: GameContext;

  constructor(parent: HTMLElement) {
    this.root = div('mscreen mscreen-settings', parent);
  }

  /** Built on first open, so the initial values are the ones actually in force. */
  build(ctx: GameContext): void {
    if (this.built) return;
    this.built = true;
    this.ctx = ctx;

    header(this.root, '03', 'Settings');
    const columns = div('mcolumns', this.root);
    const left = div('mcolumn', columns);
    const right = div('mcolumn', columns);

    /* ---- display ---- */
    const display = group(left, 'Display');
    this.preset = new OptionRow(
      display,
      'Quality preset',
      PRESET_LABELS,
      Math.max(0, PRESETS.indexOf(ctx.quality.preset)),
      (index) => {
        const host = ctx as unknown as QualityHost;
        host.setQuality?.(PRESETS[index]);
        // The preset rewrites every effect switch, so the toggles below have to
        // be re-read rather than left showing the old chain.
        this.syncEffects();
        this.publish('quality', PRESETS[index]);
      },
      'Resolution scale, shadows, reflections and post detail',
    );

    const player = ctx.tryGet<IPlayer>('player') ?? null;
    this.fov = new SliderRow(
      display,
      'Field of view',
      65,
      115,
      1,
      Math.round(player?.fov ?? ctx.camera.fov),
      (v) => `${v}°`,
      (v) => {
        player?.setBaseFov?.(v);
        if (!player?.setBaseFov) {
          ctx.camera.fov = v;
          ctx.camera.updateProjectionMatrix();
        }
        this.publish('fov', v);
      },
      'Vertical, at the hip. Aiming narrows it per weapon.',
    );

    /* ---- aiming ---- */
    const aim = group(left, 'Aiming');
    this.sensitivity = new SliderRow(
      aim,
      'Mouse sensitivity',
      0.2,
      3,
      0.05,
      Number((ctx.input.sensitivity / BASE_SENSITIVITY).toFixed(2)),
      (v) => `${v.toFixed(2)}×`,
      (v) => {
        ctx.input.sensitivity = BASE_SENSITIVITY * v;
        this.publish('sensitivity', v);
      },
    );
    new SliderRow(
      aim,
      'Aim sensitivity',
      0.3,
      1,
      0.05,
      Number(ctx.input.adsSensitivityScale.toFixed(2)),
      (v) => `${Math.round(v * 100)}%`,
      (v) => {
        ctx.input.adsSensitivityScale = v;
        this.publish('adsSensitivity', v);
      },
      'Multiplier applied while aiming down sights',
    );
    new ToggleRow(
      aim,
      'Invert vertical look',
      ctx.input.invertY,
      (on) => {
        ctx.input.invertY = on;
        this.publish('invertY', on);
      },
    );

    /* ---- audio ---- */
    const audio = group(left, 'Audio');
    const mixer = ctx.tryGet<IAudio>('audio') ?? null;
    this.volume = new SliderRow(
      audio,
      'Master volume',
      0,
      1,
      0.05,
      0.8,
      (v) => `${Math.round(v * 100)}%`,
      (v) => {
        mixer?.setMasterVolume?.(v);
        this.publish('volume', v);
      },
    );

    /* ---- post chain ---- */
    const post = group(right, 'Post processing');
    for (const effect of EFFECTS) {
      this.effectRows.push(
        new ToggleRow(
          post,
          effect.label,
          Boolean(ctx.quality[effect.key]),
          (on) => this.setEffect(effect.key, on),
          effect.hint,
        ),
      );
    }
    el('p', 'mnote', right).textContent =
      'Individual switches override the preset until it is changed again. Reflections and volumetric light are the two that cost real frames.';
  }

  private built = false;

  private setEffect(key: keyof QualitySettings, on: boolean): void {
    const quality = this.ctx.quality as unknown as Record<string, unknown>;
    quality[key] = on;
    // The pipeline owns which passes exist; telling it the settings changed is
    // the whole of the contract, and it is the same call the engine makes.
    const render = this.ctx.tryGet<System>('render');
    render?.onQualityChange?.(this.ctx.quality, this.ctx);
    this.publish(String(key), on);
  }

  private syncEffects(): void {
    for (let i = 0; i < this.effectRows.length; i++) {
      this.effectRows[i].set(Boolean(this.ctx.quality[EFFECTS[i].key]));
    }
    this.preset.set(Math.max(0, PRESETS.indexOf(this.ctx.quality.preset)));
  }

  /** Re-reads anything another system may have changed behind the screen's back. */
  refresh(): void {
    if (!this.built) return;
    this.syncEffects();
    const player = this.ctx.tryGet<IPlayer>('player');
    if (player?.fov) this.fov.set(Math.round(player.fov));
    this.sensitivity.set(Number((this.ctx.input.sensitivity / BASE_SENSITIVITY).toFixed(2)));
  }

  private publish(key: string, value: number | boolean | string): void {
    this.ctx.events.emit('settings:changed', { key, value });
  }
}

/** `InputManager.sensitivity` at a 1.00× multiplier. */
const BASE_SENSITIVITY = 0.0022;
