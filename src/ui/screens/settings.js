// Settings — every key in src/core/settings.js, grouped, live-applied.
// (owner: fable1)

import { Screen, el, cycler, uiSound } from './base.js';
import { EVT } from '../../core/events.js';
import { settings, QUALITY_PRESETS } from '../../core/settings.js';

// The audio engine already ticks on SETTINGS_CHANGED for its own volume keys;
// every other slider gets its feedback through EVT.UI_NAV {kind:'slider'}.
const AUDIO_SELF_TICKING = new Set(['masterVolume', 'effectsVolume', 'musicVolume', 'voiceVolume']);

const pct = (v) => `${Math.round(v * 100)}%`;
const x100 = (v) => (Number(v) || 0).toFixed(2);
const deg = (v) => `${Math.round(v)}\u00B0`;

/** The full exposure table. One row per settings key (difficulty excluded —
 *  it has its own screen). */
const SECTIONS = [
  {
    title: 'Audio',
    rows: [
      { key: 'masterVolume', label: 'Master volume', type: 'range', min: 0, max: 1, step: 0.05, fmt: pct },
      { key: 'effectsVolume', label: 'Effects volume', type: 'range', min: 0, max: 1, step: 0.05, fmt: pct },
      { key: 'musicVolume', label: 'Music volume', type: 'range', min: 0, max: 1, step: 0.05, fmt: pct },
      { key: 'voiceVolume', label: 'Voice volume', type: 'range', min: 0, max: 1, step: 0.05, fmt: pct },
    ],
  },
  {
    title: 'Mouse & View',
    rows: [
      { key: 'mouseSensitivity', label: 'Mouse sensitivity', type: 'range', min: 0.02, max: 0.5, step: 0.01, fmt: x100 },
      { key: 'adsSensitivityScale', label: 'ADS sensitivity scale', type: 'range', min: 0.2, max: 1.2, step: 0.05, fmt: x100 },
      { key: 'invertY', label: 'Invert Y axis', type: 'toggle' },
      { key: 'toggleCrouch', label: 'Toggle crouch', type: 'toggle' },
      { key: 'toggleAds', label: 'Toggle aim-down-sights', type: 'toggle' },
      { key: 'fov', label: 'Field of view', type: 'range', min: 60, max: 110, step: 1, fmt: deg },
    ],
  },
  {
    title: 'Graphics',
    rows: [
      {
        key: 'quality', label: 'Quality preset', type: 'enum',
        options: Object.keys(QUALITY_PRESETS),
        fmt: (v) => QUALITY_PRESETS[v]?.label || v,
      },
      { key: 'resolutionScale', label: 'Resolution scale', type: 'range', min: 0.5, max: 1, step: 0.05, fmt: pct },
      { key: 'bloom', label: 'Bloom', type: 'toggle' },
      { key: 'motionBlur', label: 'Motion blur', type: 'toggle' },
      { key: 'filmGrain', label: 'Film grain', type: 'toggle' },
      { key: 'vignette', label: 'Vignette', type: 'toggle' },
      { key: 'showFps', label: 'Show FPS counter', type: 'toggle' },
    ],
  },
  {
    title: 'Accessibility & Comfort',
    rows: [
      { key: 'crosshair', label: 'Crosshair', type: 'toggle' },
      {
        key: 'crosshairStyle', label: 'Crosshair style', type: 'enum',
        options: ['dynamic', 'classic', 'dot'],
        fmt: (v) => ({ dynamic: 'Dynamic', classic: 'Classic', dot: 'Dot' }[v] || v),
      },
      { key: 'reducedCameraMotion', label: 'Reduced camera motion', type: 'toggle' },
      { key: 'reducedBlood', label: 'Reduced blood', type: 'toggle' },
      { key: 'subtitles', label: 'Subtitles', type: 'toggle' },
      { key: 'highContrastTargets', label: 'High-contrast targets', type: 'toggle' },
      { key: 'uiScale', label: 'Interface scale', type: 'range', min: 0.8, max: 1.4, step: 0.05, fmt: pct },
    ],
  },
];

export class SettingsScreen extends Screen {
  constructor(ui) {
    super(ui, 'settings');
    /** @type {Map<string, {refresh:()=>void}>} */
    this._rows = new Map();
  }

  build() {
    const content = this.scaffold();
    content.append(this.header('Configuration', 'Settings', 'Changes apply immediately'));

    const grid = el('div', { class: 'settings-grid interactive' });
    this.nav = [];
    for (const section of SECTIONS) {
      grid.append(el('div', { class: 'settings-section', text: section.title }));
      for (const row of section.rows) this._buildRow(grid, row);
    }
    content.append(grid);

    const resetBtn = el('button', {
      class: 'btn ghost interactive',
      text: 'Reset to defaults',
      onclick: async () => {
        const ok = await this.ui.confirm({
          title: 'Reset settings',
          body: 'Every setting returns to its factory default. Key bindings are not affected.',
          yes: 'Reset', danger: true,
        });
        if (!ok) return;
        settings.reset();
        this.refreshAll();
      },
    });
    const backBtn = el('button', { class: 'btn interactive', text: 'Back', 'data-uisound': 'none', onclick: () => this.ui.goBack() });
    content.append(
      el('div', { class: 'row screen-actions' }, resetBtn, el('span', { class: 'spacer' }), backBtn),
      this.hints([['\u2191\u2193', 'Navigate'], ['\u2190\u2192', 'Adjust'], ['ESC', 'Back']]),
    );
    this.nav.push(resetBtn, backBtn);
  }

  _buildRow(grid, row) {
    grid.append(el('label', { class: 'setting-label', text: row.label, for: `set-${row.key}` }));
    const fmt = row.fmt || ((v) => String(v));
    const valueCell = el('span', { class: 'setting-value' });
    let control;
    let refresh;

    if (row.type === 'range') {
      control = el('input', {
        type: 'range', id: `set-${row.key}`, class: 'interactive',
        min: row.min, max: row.max, step: row.step,
        oninput: (e) => {
          const v = Number(e.target.value);
          settings.set(row.key, v);
          valueCell.textContent = fmt(v);
          if (!AUDIO_SELF_TICKING.has(row.key)) {
            uiSound(EVT.UI_NAV, { kind: 'slider', value: (v - row.min) / (row.max - row.min || 1) });
          }
        },
      });
      refresh = () => {
        const v = Number(settings.get(row.key) ?? row.min);
        control.value = String(v);
        valueCell.textContent = fmt(v);
      };
    } else if (row.type === 'toggle') {
      control = el('button', {
        class: 'toggle interactive', id: `set-${row.key}`, type: 'button',
        role: 'switch',
        onclick: () => {
          const v = !settings.get(row.key);
          settings.set(row.key, v);
          refresh();
        },
      });
      refresh = () => {
        const v = !!settings.get(row.key);
        control.classList.toggle('on', v);
        control.setAttribute('aria-checked', String(v));
        valueCell.textContent = v ? 'On' : 'Off';
      };
    } else { // enum
      control = cycler({
        options: row.options,
        value: settings.get(row.key),
        format: fmt,
        onchange: (v) => {
          settings.set(row.key, v);
          valueCell.textContent = '';
        },
      });
      control.id = `set-${row.key}`;
      refresh = () => {
        control.setValue(settings.get(row.key));
        valueCell.textContent = '';
      };
    }

    refresh();
    grid.append(control, valueCell);
    this.nav.push(control);
    this._rows.set(row.key, { refresh });
  }

  refreshAll() {
    for (const { refresh } of this._rows.values()) refresh();
  }

  onShow() {
    if (this._built) this.refreshAll();
  }

  handleKey(e) {
    // Left/right belong to the focused control (range slider or cycler).
    if (['ArrowLeft', 'ArrowRight'].includes(e.code)) return false;
    if (['KeyA', 'KeyD'].includes(e.code) && document.activeElement?.tagName === 'INPUT') return false;
    return super.handleKey(e);
  }
}
