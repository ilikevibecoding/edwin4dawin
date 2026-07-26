// Difficulty selection — four cards with concrete, honest differences.
// (owner: fable1)
//
// The scalar numbers are read from the live weapons table when available
// (src/weapons/defs.js DIFFICULTY_SCALARS); the descriptive copy is ours.
// src/mission/objectives.js does not exist yet, so a local table carries the
// card copy either way.

import { Screen, el, uiSound } from './base.js';
import { EVT } from '../../core/events.js';
import { DIFFICULTY_SCALARS } from '../../weapons/defs.js';

const CARDS = [
  {
    id: 'recruit', name: 'Recruit', tag: 'Learn the building',
    blurb: 'A guided first pass. Hostiles are slow to react and forgiving in a firefight; your vest and ammunition go further.',
  },
  {
    id: 'operator', name: 'Operator', tag: 'The intended experience',
    blurb: 'The mission as designed. Hostiles patrol with intent, hear gunfire from across the floor, and punish carelessness.',
  },
  {
    id: 'veteran', name: 'Veteran', tag: 'No easy rooms',
    blurb: 'Armoured, accurate and fast to react. Every entry needs a plan, every reload needs cover, and noise is a decision.',
  },
  {
    id: 'blackout', name: 'Blackout', tag: 'One clean run',
    blurb: 'Maximum resistance and thin supplies. Hostiles shoot to end the mission. Built for players who already own this map.',
  },
];

const fp = (v, digits = 0) => (typeof v === 'number' ? v.toFixed(digits) : '—');

/** Turn the scalar table into plain-language deltas. Defensive throughout. */
function detailLines(id) {
  const s = DIFFICULTY_SCALARS?.[id];
  if (!s) return ['Standard hostile force', 'Standard supplies'];
  const pct = (v) => `${Math.round((v - 1) * 100) >= 0 ? '+' : ''}${Math.round((v - 1) * 100)}%`;
  return [
    `Hostile damage ${pct(s.enemyDamage ?? 1)} · accuracy ${pct(s.enemyAccuracy ?? 1)}`,
    `Hostile health ${pct(s.enemyHealth ?? 1)} · armour ${pct(s.enemyArmor ?? 1)}`,
    `Reaction time \u00D7${fp(s.enemyReactionTime, 2)} · alert radius ${pct(s.enemyAlertRadius ?? 1)}`,
    `Your damage ${pct(s.playerDamage ?? 1)} · reserve ammo ${pct(s.reserveAmmo ?? 1)}`,
    `Spare gadgets ${s.gadgetCount > 0 ? `+${s.gadgetCount}` : s.gadgetCount < 0 ? `${s.gadgetCount}` : '±0'}`,
  ];
}

export class DifficultyScreen extends Screen {
  constructor(ui) {
    super(ui, 'difficulty');
    this.selected = 'operator';
    this._cards = new Map();
  }

  build() {
    const content = this.scaffold();
    content.append(this.header('Deployment · step 1 of 3', 'Rules of Engagement', 'Choose the resistance level'));

    const grid = el('div', { class: 'difficulty-grid interactive' });
    this.nav = [];
    for (const card of CARDS) {
      const node = el('button', {
        class: 'difficulty-card', type: 'button', dataset: { difficulty: card.id },
        onclick: () => {
          if (this.selected === card.id) this._continue();
          else this.select(card.id);
        },
      },
      el('span', { class: 'tag', text: card.tag }),
      el('h3', { text: card.name }),
      el('p', { text: card.blurb }),
      el('ul', {}, ...detailLines(card.id).map((t) => el('li', { text: t }))));
      grid.append(node);
      this.nav.push(node);
      this._cards.set(card.id, node);
    }
    content.append(grid);

    const backBtn = el('button', { class: 'btn ghost interactive', text: 'Back', 'data-uisound': 'none', onclick: () => this.ui.goBack() });
    const nextBtn = el('button', { class: 'btn primary interactive', text: 'Continue \u2192', onclick: () => this._continue() });
    content.append(
      el('div', { class: 'row screen-actions' }, backBtn, el('span', { class: 'spacer' }), nextBtn),
      this.hints([['\u2190\u2192', 'Choose'], ['ENTER', 'Confirm'], ['ESC', 'Back']]),
    );
    this.nav.push(backBtn, nextBtn);
  }

  select(id) {
    this.selected = id;
    for (const [cid, node] of this._cards) node.classList.toggle('selected', cid === id);
    this._cards.get(id)?.focus();
  }

  _continue() {
    this.ui.chooseDifficulty(this.selected);
  }

  onShow() {
    const current = this.game?.difficulty;
    this.select(this._cards.has(current) ? current : 'operator');
  }

  handleKey(e) {
    // The cards read better with left/right movement as well.
    if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'].includes(e.code)) {
      const ids = CARDS.map((c) => c.id);
      const idx = ids.indexOf(this.selected);
      const dir = (e.code === 'ArrowLeft' || e.code === 'KeyA') ? -1 : 1;
      this.select(ids[(idx + dir + ids.length) % ids.length]);
      uiSound(EVT.UI_NAV, { kind: 'move' });
      return true;
    }
    return super.handleKey(e);
  }
}
