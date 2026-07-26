// Title screen — the front door. The live 3D level renders behind a
// translucent storm scrim (never an opaque cover).  (owner: fable1)

import { Screen, el } from './base.js';
import { compassStar } from '../icons.js';

export const BUILD_LINE = `BUILD 0.1.0 · VERTICAL SLICE · ${import.meta.env?.DEV ? 'DEV' : 'RELEASE'}`;

export class TitleScreen extends Screen {
  constructor(ui) {
    super(ui, 'title');
    this._progress = 0;
    this._task = '';
  }

  build() {
    // Translucent scrim + drifting snow streaks; the level shows through.
    this.el.append(el('div', { class: 'title-scrim' }));
    this.el.append(el('div', { class: 'title-storm' }));
    this.el.append(el('div', { class: 'screen-noise' }));

    const content = el('div', { class: 'screen-content title-content' });

    content.append(
      el('div', { class: 'title-stack' },
        el('p', { class: 'eyebrow', text: 'Northstar Crisis Response Division' }),
        el('div', { class: 'title-mark' },
          el('span', { class: 'brand-wrap', html: compassStar(82) }),
          el('div', {},
            el('h1', { class: 'game-title', html: 'Northstar<br>Rescue' }),
            el('p', { class: 'subtitle title-sub', text: 'Tactical hostage recovery · Winter storm "Long Night"' }))),
        this._status = el('div', { class: 'title-status' },
          this._statusText = el('span', { class: 'title-status-text', text: 'Preparing operation…' }),
          this._statusBar = el('span', { class: 'title-status-bar' }, el('i')))),
    );

    content.append(
      el('div', { class: 'title-foot' },
        el('span', { class: 'title-build', text: BUILD_LINE }),
        el('span', { class: 'spacer' }),
        el('span', { class: 'title-build', text: 'An original work · No affiliation with any real agency' })),
    );

    this.el.append(content);
    this.el.addEventListener('click', () => this._proceed());
  }

  setProgress(p, task) {
    this._progress = p;
    this._task = task || '';
    if (!this._built || !this._statusText) return;
    if (this.ui.levelReady) return;
    this._statusText.textContent = this._task ? `${this._task}…` : 'Preparing operation…';
    const bar = this._statusBar?.querySelector('i');
    if (bar) bar.style.width = `${Math.round(Math.min(1, Math.max(0, p)) * 100)}%`;
  }

  /** Level finished loading: swap the progress line for the key prompt. */
  setReady() {
    if (!this._built) return;
    this._status.classList.add('ready');
    this._status.replaceChildren(
      el('span', { class: 'press-any', text: 'Press any key' }));
  }

  onShow() {
    if (this.ui.levelReady) this.setReady();
  }

  _proceed() {
    if (!this.ui.levelReady) return;
    this.ui.toMenu();
  }

  handleKey(e) {
    // Ignore bare modifiers and the fullscreen toggle so F still works.
    if (['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
      'MetaLeft', 'MetaRight', 'KeyF', 'F11'].includes(e.code)) return false;
    this._proceed();
    return true;
  }
}
