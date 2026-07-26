// Pause menu. Escape resumes; nothing here can trap the player.
// (owner: fable1)

import { Screen, el } from './base.js';
import { compassStar } from '../icons.js';

export class PauseScreen extends Screen {
  constructor(ui) {
    super(ui, 'paused');
  }

  build() {
    // Lighter scrim: the frozen game stays visible behind the card.
    this.el.append(el('div', { class: 'pause-scrim' }));
    const content = el('div', { class: 'screen-content pause-content' });

    const card = el('div', { class: 'pause-card interactive' },
      el('div', { class: 'row pause-head' },
        el('span', { class: 'brand-wrap', html: compassStar(30) }),
        el('div', {},
          el('h2', { class: 'screen-title pause-title', text: 'Paused' }),
          this._sub = el('p', { class: 'subtitle', text: 'Operation Long Night' }))),
      el('div', { class: 'rule' }));

    const items = [
      ['Resume', () => this.game?.resume?.()],
      ['Restart Mission', async () => {
        const ok = await this.ui.confirm({
          title: 'Restart mission',
          body: 'Progress in this attempt is lost and the operation restarts from insertion.',
          yes: 'Restart', danger: true,
        });
        if (ok) this.game?.restart?.();
      }],
      ['Settings', () => this.ui.openSettings()],
      ['Controls', () => this.ui.openControls()],
      ['Abort to Menu', async () => {
        const ok = await this.ui.confirm({
          title: 'Abort operation',
          body: 'The mission is abandoned and you return to the main menu.',
          yes: 'Abort', danger: true,
        });
        if (ok) this.game?.returnToMenu?.();
      }],
    ];

    const list = el('nav', { class: 'menu-list pause-list', 'aria-label': 'Pause menu' });
    this.nav = [];
    for (const [label, fn] of items) {
      const btn = el('button', { class: 'menu-item', onclick: fn }, el('span', { text: label }));
      list.append(btn);
      this.nav.push(btn);
    }
    card.append(list);
    card.append(this.hints([['ESC', 'Resume'], ['\u2191\u2193', 'Navigate'], ['ENTER', 'Select']]));

    content.append(card);
    this.el.append(content);
  }

  onShow() {
    if (this._sub) {
      const d = this.game?.difficulty;
      this._sub.textContent = d ? `Operation Long Night · ${String(d).toUpperCase()}` : 'Operation Long Night';
    }
  }
}
