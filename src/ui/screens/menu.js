// Main menu.  (owner: fable1)

import { Screen, el } from './base.js';
import { compassStar } from '../icons.js';
import { BUILD_LINE } from './title.js';

const DEV = !!import.meta.env?.DEV;

export class MenuScreen extends Screen {
  constructor(ui) {
    super(ui, 'menu');
  }

  build() {
    const content = this.scaffold();

    content.append(
      el('header', { class: 'menu-head' },
        el('span', { class: 'brand-wrap menu-brand', html: compassStar(46) }),
        el('div', {},
          el('h2', { class: 'screen-title', text: 'Northstar Rescue' }),
          el('p', { class: 'subtitle', text: 'Operation Long Night · single operative' })),
      ),
      el('div', { class: 'rule' }),
    );

    const items = [
      ['deploy', 'Deploy', 'Begin the rescue operation', () => this.ui.startDeployFlow()],
      ['briefing', 'Mission Briefing', 'Situation, floor plan and intel', () => this.ui.openBriefing('browse')],
      ['settings', 'Settings', 'Audio, view, graphics, comfort', () => this.ui.openSettings()],
      ['controls', 'Controls', 'Bindings and rebinding', () => this.ui.openControls()],
      ...(DEV ? [['gallery', 'Asset Gallery', 'Dev build review tool', () => this.ui.openGallery()]] : []),
      ['quit', 'Quit to Title', '', () => this.ui.toTitle()],
    ];

    const list = el('nav', { class: 'menu-list interactive', 'aria-label': 'Main menu' });
    this.nav = [];
    for (const [id, label, hint, fn] of items) {
      const btn = el('button', { class: 'menu-item', dataset: { menu: id }, onclick: fn },
        el('span', { text: label }),
        hint ? el('span', { class: 'key-hint', text: hint }) : null);
      if (id === 'deploy') this._deployBtn = btn;
      list.append(btn);
      this.nav.push(btn);
    }
    content.append(list);

    content.append(el('div', { class: 'spacer' }));
    content.append(this.hints([['\u2191\u2193', 'Navigate'], ['ENTER', 'Select'], ['ESC', 'Title']]));
    content.append(el('p', { class: 'title-build menu-build', text: BUILD_LINE }));

    // Ghosted compass mark on the right as the screen's single ornament.
    this.el.append(el('div', { class: 'menu-emblem', html: compassStar(560, 'brand-ghost') }));
  }

  onShow() {
    this.refreshReady();
  }

  refreshReady() {
    if (!this._deployBtn) return;
    const ready = this.ui.levelReady;
    this._deployBtn.disabled = !ready;
    const hint = this._deployBtn.querySelector('.key-hint');
    if (hint) hint.textContent = ready ? 'Begin the rescue operation' : 'Preparing…';
  }
}
