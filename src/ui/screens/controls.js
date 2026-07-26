// Controls reference + rebinding. Click a row (or press Enter on it), then
// press the new key. Escape cancels the capture.  (owner: fable1)

import { Screen, el, fmtKey } from './base.js';
import { DEFAULT_BINDINGS } from '../../core/input.js';

/** Display order + labels. Only actions in DEFAULT_BINDINGS are rebindable. */
const GROUPS = [
  ['Movement', [
    ['forward', 'Move forward'],
    ['back', 'Move backward'],
    ['left', 'Strafe left'],
    ['right', 'Strafe right'],
    ['jump', 'Jump / vault'],
    ['crouch', 'Crouch'],
    ['walk', 'Walk (quiet)'],
  ]],
  ['Combat', [
    ['attack', 'Fire', 'MouseLeft'],
    ['aim', 'Aim down sights', 'MouseRight'],
    ['reload', 'Reload'],
    ['sprint', 'Toggle fire mode'],
    ['lastWeapon', 'Previous weapon'],
    ['flash', 'Quick-throw flashbang'],
    ['smoke', 'Quick-throw smoke'],
    ['inspect', 'Inspect weapon'],
  ]],
  ['Inventory', [
    ['slot1', 'Slot 1 — primary'],
    ['slot2', 'Slot 2 — sidearm'],
    ['slot3', 'Slot 3 — knife'],
    ['slot4', 'Slot 4 — flashbang'],
    ['slot5', 'Slot 5 — smoke'],
  ]],
  ['World & Interface', [
    ['use', 'Interact'],
    ['objectives', 'Hold — objectives'],
    ['map', 'Toggle minimap'],
    ['flashlight', 'Flashlight'],
    ['fullscreen', 'Toggle fullscreen'],
    ['pause', 'Pause / menu'],
  ]],
];

const UNBINDABLE = new Set(['Escape']);

export class ControlsScreen extends Screen {
  constructor(ui) {
    super(ui, 'controls');
    this._capture = null; // { action, cell, restore }
    this._rows = new Map();
  }

  /** True while waiting for a key — the manager must not treat keys as nav. */
  get capturing() {
    return !!this._capture;
  }

  build() {
    const content = this.scaffold();
    content.append(this.header('Reference', 'Controls', 'Select a binding and press a key to reassign it'));

    const cols = el('div', { class: 'controls-columns interactive' });
    this.nav = [];
    for (const [title, rows] of GROUPS) {
      const colBlock = el('div', { class: 'controls-group' },
        el('div', { class: 'settings-section', text: title }));
      for (const [action, label, fixed] of rows) {
        colBlock.append(this._buildRow(action, label, fixed));
      }
      cols.append(colBlock);
    }
    content.append(cols);

    const resetBtn = el('button', {
      class: 'btn ghost interactive', text: 'Reset bindings',
      onclick: async () => {
        const ok = await this.ui.confirm({
          title: 'Reset bindings',
          body: 'All key bindings return to their defaults.',
          yes: 'Reset', danger: true,
        });
        if (!ok) return;
        for (const [action, codes] of Object.entries(DEFAULT_BINDINGS)) {
          this.game?.input?.setBinding?.(action, [...codes]);
        }
        this.refreshAll();
      },
    });
    const backBtn = el('button', { class: 'btn interactive', text: 'Back', onclick: () => this.ui.goBack() });
    content.append(
      el('div', { class: 'row screen-actions' }, resetBtn, el('span', { class: 'spacer' }), backBtn),
      this.hints([['\u2191\u2193', 'Navigate'], ['ENTER', 'Rebind'], ['ESC', 'Back / cancel']]),
    );
    this.nav.push(resetBtn, backBtn);
  }

  _buildRow(action, label, fixed) {
    const keys = el('span', { class: 'ck' });
    const row = el('button', {
      class: `control-row interactive${fixed ? ' fixed' : ''}`,
      type: 'button',
      dataset: { action },
      onclick: () => { if (!fixed) this._beginCapture(action, keys); },
    },
    el('span', { class: 'cd', text: label }), keys);
    if (!fixed) this.nav.push(row);
    this._rows.set(action, { keys, fixed });
    this._renderKeys(action);
    return row;
  }

  _bindingsOf(action) {
    return this.game?.input?.bindings?.[action] || DEFAULT_BINDINGS[action] || [];
  }

  _renderKeys(action) {
    const entry = this._rows.get(action);
    if (!entry) return;
    const codes = entry.fixed ? [entry.fixed] : this._bindingsOf(action);
    entry.keys.replaceChildren(...(
      codes.length ? codes.map((c) => el('kbd', { text: fmtKey(c) })) : [el('kbd', { text: '—' })]
    ));
  }

  refreshAll() {
    for (const action of this._rows.keys()) this._renderKeys(action);
  }

  _beginCapture(action, cell) {
    this._endCapture();
    cell.replaceChildren(el('kbd', { class: 'capturing', text: 'PRESS KEY…' }));
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!UNBINDABLE.has(e.code)) {
        this.game?.input?.setBinding?.(action, [e.code]);
      }
      this._endCapture();
    };
    window.addEventListener('keydown', onKey, true);
    this._capture = {
      action,
      end: () => window.removeEventListener('keydown', onKey, true),
    };
  }

  _endCapture() {
    if (!this._capture) return;
    this._capture.end();
    const action = this._capture.action;
    this._capture = null;
    this._renderKeys(action);
  }

  onShow() {
    if (this._built) this.refreshAll();
  }

  onHide() {
    this._endCapture();
  }
}
