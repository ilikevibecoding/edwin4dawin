// Loading screen — progress from `setLoadProgress`, plus rotating tips.
// (owner: fable1)

import { Screen, el } from './base.js';
import { compassStar } from '../icons.js';

/** Original gameplay tips. Rotated on a timer; no interaction required. */
const TIPS = [
  ['Suppressed fire', 'The VK-7 Whisper barely carries beyond the room. Loud shots pull every patrol on the floor.'],
  ['Doors are information', 'An open door you did not open means someone moved. Close doors behind you to know your back is clear.'],
  ['Aim before the corner', 'Pre-aim where a hostile will appear. Aiming down sights tightens your cone before the fight starts.'],
  ['Bloom is real', 'Sustained automatic fire walks off target. Short bursts reset your spread and your recoil pattern.'],
  ['Hostages first', 'A firefight next to a hostage can end the mission. Clear the room before you cut anyone loose.'],
  ['Flash through glass', 'Flashbangs need line of sight. A window counts — a wall does not.'],
  ['Check the map', 'The building is a loop. If a corridor is defended, there is always a second approach.'],
  ['Walk, don\u2019t run', 'Holding walk silences your footsteps. Hostiles hear sprinting through walls.'],
  ['Partitions are thin', 'Office drywall stops nothing. The KD-4 will punish anyone hiding behind a cubicle wall.'],
  ['Escort with care', 'A following hostage stops when you sprint away. Keep them close, keep them behind you.'],
  ['The keycard opens the server room', 'Security doors need the guard\u2019s keycard. Watch for it near the vestibule desk.'],
  ['Extraction is the mission', 'Reaching a hostage is half the job. The garage bay is the only way anyone leaves.'],
];

export class LoadingScreen extends Screen {
  constructor(ui) {
    super(ui, 'loading');
    this._tip = 0;
    this._tipTimer = 0;
  }

  build() {
    const content = this.scaffold();
    content.classList.add('loading-content');
    content.append(
      el('div', { class: 'loading-centre' },
        el('span', { class: 'brand-wrap loading-brand', html: compassStar(58) }),
        el('p', { class: 'eyebrow', text: 'Deploying' }),
        el('h2', { class: 'screen-title', text: 'Northstar Administrative Center' }),
        el('div', { class: 'loading-bar-wrap' },
          el('div', { class: 'loading-bar' }, this._bar = el('i')),
          this._task = el('div', { class: 'loading-task', text: 'Standing by…' })),
        this._tipEl = el('p', { class: 'loading-tip' })),
    );
    this._renderTip();
  }

  setProgress(p, task) {
    if (!this._built) return;
    if (this._bar) this._bar.style.width = `${Math.round(Math.min(1, Math.max(0, p)) * 100)}%`;
    if (this._task && task) this._task.textContent = task;
  }

  onShow() {
    this._tip = (this._tip + 1) % TIPS.length;
    this._tipTimer = 0;
    this._renderTip();
    this.setProgress(1, 'Inserting operative…');
  }

  update(dt) {
    this._tipTimer += dt;
    if (this._tipTimer > 5) {
      this._tipTimer = 0;
      this._tip = (this._tip + 1) % TIPS.length;
      this._renderTip();
    }
  }

  _renderTip() {
    if (!this._tipEl) return;
    const [head, body] = TIPS[this._tip];
    this._tipEl.replaceChildren(el('b', { text: `${head} — ` }), document.createTextNode(body));
  }
}
