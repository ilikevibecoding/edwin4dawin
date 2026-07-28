/**
 * Settings.
 *
 * Every control writes straight through to the live systems — the quality tier
 * calls `engine.applyQuality`, the sliders write `input.sensitivity` and the
 * audio mixer, the FOV writes the tuning table the camera rig reads — and then
 * asks the model to persist. There is no apply button, because a graphics setting
 * you cannot see the effect of is a graphics setting you cannot judge.
 */
import { div, el, setClass, setText, span } from '../Dom';
import {
  BINDABLE,
  QUALITY_TOGGLES,
  bindingLabel,
  type Binding,
  type CrosshairStyle,
  type Settings,
} from '../Settings';
import type { ActionName } from '../../core/Input';
import type { QualityConfig, QualityTier } from '../../core/Config';
import {
  bindRow,
  button,
  degrees,
  fixed,
  percent,
  rule,
  segmentRow,
  sliderRow,
  tabs,
  toggleRow,
  type Control,
} from './Widgets';

type TabId = 'graphics' | 'gameplay' | 'audio' | 'interface' | 'controls';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'graphics', label: 'Graphics' },
  { id: 'gameplay', label: 'Gameplay' },
  { id: 'audio', label: 'Audio' },
  { id: 'interface', label: 'Interface' },
  { id: 'controls', label: 'Controls' },
];

const TIERS: ReadonlyArray<{ value: QualityTier; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
  { value: 'ultra', label: 'Ultra' },
];

const AA: ReadonlyArray<{ value: QualityConfig['antialias']; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: 'fxaa', label: 'FXAA' },
  { value: 'smaa', label: 'SMAA' },
  { value: 'taa', label: 'TAA' },
];

const CROSSHAIRS: ReadonlyArray<{ value: CrosshairStyle; label: string }> = [
  { value: 'dynamic', label: 'Dyn' },
  { value: 'cross', label: 'Cross' },
  { value: 'chevron', label: 'Chev' },
  { value: 'dot', label: 'Dot' },
  { value: 'none', label: 'Off' },
];

export class SettingsMenu {
  readonly root: HTMLDivElement;

  private readonly panes = new Map<TabId, HTMLDivElement>();
  private readonly controls: Control[] = [];
  private readonly binds: Array<{ action: ActionName; refresh(): void; node: HTMLButtonElement }> = [];
  private readonly strip: { select(id: string): void };

  private listening: ActionName | null = null;
  private listeningNode: HTMLButtonElement | null = null;
  private detachCapture: (() => void) | null = null;

  constructor(
    parent: HTMLElement,
    private readonly settings: Settings,
    private readonly onClose: () => void,
    private readonly onApplied: () => void,
  ) {
    this.root = div('ob-menu ob-settings', parent);
    const body = div('ob-menu-body', this.root);
    const card = div('ob-card ob-settings-card', body);

    const head = div('ob-menu-head', card);
    const title = el('h2', 'ob-h2', head);
    setText(title, 'Settings');
    span('lbl', head, 'CHANGES APPLY IMMEDIATELY');

    this.strip = tabs(card, TABS, (id) => this.show(id as TabId));
    rule(card);

    const scroll = div('ob-scroll ob-settings-scroll', card);
    for (const tab of TABS) {
      const pane = div('ob-pane', scroll);
      this.panes.set(tab.id, pane);
    }

    this.buildGraphics(this.paneOf('graphics'));
    this.buildGameplay(this.paneOf('gameplay'));
    this.buildAudio(this.paneOf('audio'));
    this.buildInterface(this.paneOf('interface'));
    this.buildControls(this.paneOf('controls'));

    rule(card);
    const foot = div('ob-settings-foot', card);
    button(foot, 'Back', () => this.close(), { hint: 'ESC', className: 'ghost' });
    button(foot, 'Restore defaults', () => this.restoreDefaults(), { className: 'ghost' });

    this.strip.select('graphics');
  }

  private paneOf(id: TabId): HTMLDivElement {
    const pane = this.panes.get(id);
    if (!pane) throw new Error(`[ui] settings pane "${id}" was not created`);
    return pane;
  }

  // -------------------------------------------------------------------------
  // Panes
  // -------------------------------------------------------------------------

  private buildGraphics(pane: HTMLElement): void {
    const rows = div('ob-rows', pane);
    const data = this.settings.data;

    this.add(
      segmentRow(
        rows,
        'Quality preset',
        'Retunes the whole pipeline; clears individual overrides',
        TIERS,
        () => this.settings.data.tier,
        (tier) => {
          this.settings.setTier(tier);
          this.refresh();
          this.onApplied();
        },
      ),
    );
    this.add(
      toggleRow(
        rows,
        'Adaptive resolution',
        'Trades internal resolution to hold 60 fps',
        () => data.adaptiveResolution,
        (value) => {
          data.adaptiveResolution = value;
          this.settings.applyQuality();
          this.settings.save();
        },
      ),
    );
    this.add(
      sliderRow(
        rows,
        'Render scale',
        'Upper bound the adaptive scaler works down from',
        { min: 0.5, max: 1, step: 0.05, format: percent },
        () => data.renderScale,
        (value) => {
          data.renderScale = value;
          this.settings.applyQuality();
          this.settings.save();
        },
      ),
    );
    this.add(
      segmentRow(
        rows,
        'Anti-aliasing',
        'TAA is the cleanest but ghosts on fast motion',
        AA,
        () => data.antialias,
        (value) => {
          data.antialias = value;
          this.settings.applyQuality();
          this.settings.save();
        },
      ),
    );

    rule(pane);
    span('lbl ob-pane-label', pane, 'Individual effects');
    const detail = div('ob-rows', pane);
    for (const entry of QUALITY_TOGGLES) {
      this.add(
        toggleRow(
          detail,
          entry.name,
          entry.hint,
          () => this.settings.toggleValue(entry.key),
          (value) => this.settings.setToggle(entry.key, value),
        ),
      );
    }
  }

  private buildGameplay(pane: HTMLElement): void {
    const rows = div('ob-rows', pane);
    const data = this.settings.data;

    this.add(
      sliderRow(
        rows,
        'Field of view',
        'Vertical FOV at the hip',
        { min: 65, max: 115, step: 1, format: degrees },
        () => data.fov,
        (value) => {
          data.fov = value;
          this.settings.applyFov();
          this.settings.save();
        },
      ),
    );
    this.add(
      sliderRow(
        rows,
        'Mouse sensitivity',
        'Multiplier on raw pointer motion',
        { min: 0.1, max: 4, step: 0.05, format: fixed(2) },
        () => data.sensitivity,
        (value) => {
          data.sensitivity = value;
          this.settings.applyInput();
          this.settings.save();
        },
      ),
    );
    this.add(
      sliderRow(
        rows,
        'ADS sensitivity',
        'Scale applied while aiming down sights',
        { min: 0.2, max: 1.4, step: 0.02, format: fixed(2) },
        () => data.adsSensitivity,
        (value) => {
          data.adsSensitivity = value;
          this.settings.applyInput();
          this.settings.save();
        },
      ),
    );
    this.add(
      toggleRow(
        rows,
        'Invert vertical look',
        undefined,
        () => data.invertY,
        (value) => {
          data.invertY = value;
          this.settings.applyInput();
          this.settings.save();
        },
      ),
    );
  }

  private buildAudio(pane: HTMLElement): void {
    const rows = div('ob-rows', pane);
    const data = this.settings.data;
    const volume = { min: 0, max: 1, step: 0.02, format: percent };

    this.add(
      sliderRow(rows, 'Master volume', undefined, volume, () => data.masterVolume, (value) => {
        data.masterVolume = value;
        this.settings.applyAudio();
        this.settings.save();
      }),
    );
    this.add(
      sliderRow(rows, 'Effects volume', 'Weapons, impacts, footsteps', volume, () => data.sfxVolume, (value) => {
        data.sfxVolume = value;
        this.settings.applyAudio();
        this.settings.save();
      }),
    );
    this.add(
      sliderRow(rows, 'Music volume', 'Combat score intensity', volume, () => data.musicVolume, (value) => {
        data.musicVolume = value;
        this.settings.applyAudio();
        this.settings.save();
      }),
    );
  }

  private buildInterface(pane: HTMLElement): void {
    const rows = div('ob-rows', pane);
    const data = this.settings.data;

    this.add(
      segmentRow(
        rows,
        'Crosshair',
        'Dynamic ticks track the live cone of fire',
        CROSSHAIRS,
        () => data.crosshair,
        (value) => {
          data.crosshair = value;
          this.settings.save();
          this.onApplied();
        },
      ),
    );
    this.add(
      toggleRow(
        rows,
        'Rotate minimap',
        'Off keeps the map north-up',
        () => data.minimapRotate,
        (value) => {
          data.minimapRotate = value;
          this.settings.save();
          this.onApplied();
        },
      ),
    );
    this.add(
      sliderRow(
        rows,
        'HUD opacity',
        'Dims the instrument chrome, not the reticle',
        { min: 0.25, max: 1, step: 0.05, format: percent },
        () => data.hudOpacity,
        (value) => {
          data.hudOpacity = value;
          this.settings.save();
          this.onApplied();
        },
      ),
    );
    this.add(
      toggleRow(
        rows,
        'HUD backdrop blur',
        'Costs a composited pass per panel',
        () => data.hudBlur,
        (value) => {
          data.hudBlur = value;
          this.settings.save();
          this.onApplied();
        },
      ),
    );
    this.add(
      toggleRow(
        rows,
        'HUD frame cost',
        'Shows the measured per-frame UI budget',
        () => data.showUiStats,
        (value) => {
          data.showUiStats = value;
          this.settings.save();
          this.onApplied();
        },
      ),
    );
  }

  private buildControls(pane: HTMLElement): void {
    span('lbl ob-pane-label', pane, 'Click a binding, then press a key or mouse button');
    // Two columns: 24 bindings in one column runs off the bottom of a 720p card,
    // and a rebinding screen that has to be scrolled to find an action is a
    // rebinding screen nobody finishes.
    const rows = div('ob-rows two', pane);
    for (const entry of BINDABLE) {
      const control = bindRow(
        rows,
        entry.label,
        () => bindingLabel(this.settings.bindings[entry.action]),
        () => this.beginCapture(entry.action, control.node),
      );
      this.binds.push({ action: entry.action, refresh: control.refresh, node: control.node });
    }
    const foot = div('ob-settings-foot start', pane);
    button(
      foot,
      'Reset bindings',
      () => {
        this.settings.resetBindings();
        for (const bind of this.binds) bind.refresh();
        this.markConflicts();
      },
      { className: 'ghost' },
    );
  }

  private add(control: Control): void {
    this.controls.push(control);
  }

  /**
   * Flags any key or button driving more than one listed action.
   *
   * The input layer accepts a clash silently and fires both, and the stock
   * bindings ship with one — Q is tactical and lean-left. A player who rebinds
   * to something already taken otherwise finds out in a firefight, so the rows
   * involved say so here instead.
   */
  private markConflicts(): void {
    const owners = new Map<string, number>();
    for (const bind of this.binds) {
      for (const token of tokensOf(this.settings.bindings[bind.action])) {
        owners.set(token, (owners.get(token) ?? 0) + 1);
      }
    }
    for (const bind of this.binds) {
      const clashes = tokensOf(this.settings.bindings[bind.action]).some(
        (token) => (owners.get(token) ?? 0) > 1,
      );
      setClass(bind.node, 'clash', clashes);
      bind.node.title = clashes ? 'Also bound to another action' : '';
    }
  }

  // -------------------------------------------------------------------------
  // Rebinding
  // -------------------------------------------------------------------------

  /**
   * Captures the next key or mouse press. The listeners run in the capture phase
   * and stop propagation, so the press cannot also reach the input layer and be
   * read as gameplay on the frame the menu closes.
   */
  private beginCapture(action: ActionName, node: HTMLButtonElement): void {
    this.cancelCapture();
    this.listening = action;
    this.listeningNode = node;
    setClass(node, 'listening', true);
    setText(node, 'PRESS ANY KEY');

    const onKey = (event: KeyboardEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === 'Escape') {
        this.cancelCapture();
        return;
      }
      this.commit(action, { keys: [event.code] });
    };
    const onMouse = (event: MouseEvent): void => {
      // The click that opened the capture must not be the one that answers it.
      event.preventDefault();
      event.stopPropagation();
      this.commit(action, { keys: [], mouse: [event.button] });
    };

    window.addEventListener('keydown', onKey, true);
    window.addEventListener('mousedown', onMouse, true);
    this.detachCapture = () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('mousedown', onMouse, true);
    };
  }

  private commit(action: ActionName, binding: Binding): void {
    this.settings.bindings[action] = binding;
    this.settings.applyBindings();
    this.settings.save();
    this.cancelCapture();
    for (const bind of this.binds) bind.refresh();
    this.markConflicts();
    // The killstreak tray prints the key that fires each slot, so a rebind has
    // to reach the HUD as well as the input layer.
    this.settings.notify();
  }

  cancelCapture(): void {
    this.detachCapture?.();
    this.detachCapture = null;
    if (this.listeningNode) {
      setClass(this.listeningNode, 'listening', false);
      const action = this.listening;
      setText(
        this.listeningNode,
        action ? bindingLabel(this.settings.bindings[action]) : '—',
      );
    }
    this.listening = null;
    this.listeningNode = null;
  }

  get isCapturing(): boolean {
    return this.listening !== null;
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  private show(id: TabId): void {
    for (const [key, pane] of this.panes) setClass(pane, 'on', key === id);
  }

  private close(): void {
    this.cancelCapture();
    this.onClose();
  }

  /** Called on open and after anything that could move several values at once. */
  refresh(): void {
    for (const control of this.controls) control.refresh();
    for (const bind of this.binds) bind.refresh();
    this.markConflicts();
  }

  openAt(tab: TabId): void {
    this.strip.select(tab);
    this.refresh();
  }

  private restoreDefaults(): void {
    this.settings.restoreDefaults();
    this.refresh();
    this.onApplied();
  }
}

/** Comparable identity for each key or button in a binding. */
function tokensOf(binding: Binding | undefined): string[] {
  if (!binding) return [];
  const out = binding.keys.slice();
  for (const button of binding.mouse ?? []) out.push(`mouse${button}`);
  return out;
}
