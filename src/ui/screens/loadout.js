// Loadout — primary / secondary / gadget selection from the real weapon
// table, with normalised stat bars and canvas side profiles.  (owner: fable1)

import { Screen, el } from './base.js';
import { drawWeaponProfile, weaponGlyph } from '../icons.js';
import { WEAPON_DEFS } from '../../weapons/defs.js';

const SLOTS = [
  { slot: 'primary', title: 'Primary weapon', keys: ['carbine', 'smg', 'shotgun', 'sniper'] },
  { slot: 'secondary', title: 'Sidearm', keys: ['pistol'] },
  { slot: 'gadget', title: 'Gadget (spare)', keys: ['flash', 'smoke'] },
];

/** Normalise a def into 0..1 bars. Honest relative maths over the table. */
function statsOf(def) {
  if (!def) return null;
  const rpm = def.rpm > 0 ? def.rpm : (def.cycleTime ? 60 / def.cycleTime : 0);
  const dmg = (def.damage || 0) * (def.pellets || 1);
  const adsSpread = def.spread?.ads ?? 0.5;
  const kick = (def.recoil?.pattern || [[0.4]]).slice(0, 6)
    .reduce((a, p) => a + Math.abs(p[0] || 0), 0) / Math.min(6, (def.recoil?.pattern || [1]).length || 1);
  const move = def.moveMultiplier ?? 1;
  const capacity = (def.loadedMax || 0) + (def.reserve || 0);
  const clamp01 = (v) => Math.max(0.04, Math.min(1, v));
  return [
    ['Damage', clamp01(dmg / 120), Math.round(dmg)],
    ['Rate of fire', clamp01(rpm / 900), rpm ? Math.round(rpm) : '—'],
    ['Accuracy', clamp01(1 - adsSpread / 0.6), null],
    ['Control', clamp01(1 - kick / 3.2), null],
    ['Mobility', clamp01((move - 0.8) / 0.28), null],
    ['Capacity', clamp01(capacity / 280), capacity || '—'],
  ];
}

function gadgetStats(def) {
  if (!def) return null;
  const e = def.effect || {};
  const clamp01 = (v) => Math.max(0.04, Math.min(1, v));
  return [
    ['Effect radius', clamp01((e.radius || 0) / 10), `${e.radius ?? '—'} m`],
    ['Duration', clamp01((e.blindDuration || e.duration || 0) / 16), `${e.blindDuration ?? e.duration ?? '—'} s`],
    ['Fuse', clamp01(1 - (def.fuse || 1) / 2), `${def.fuse ?? '—'} s`],
    ['Carried', clamp01((def.count || 1) / 3), def.count ?? 1],
  ];
}

export class LoadoutScreen extends Screen {
  constructor(ui) {
    super(ui, 'loadout');
    this.picks = { primary: 'carbine', secondary: 'pistol', gadget: 'flash' };
    this._options = new Map(); // key -> button
    this._detailCanvas = null;
  }

  build() {
    const content = this.scaffold();
    content.append(this.header('Deployment · step 3 of 3', 'Loadout', 'The knife, both gadgets and a sidearm always travel with you'));

    const layout = el('div', { class: 'loadout-layout' });

    // --------------------------------------------------------- pick lists --
    const lists = el('div', { class: 'loadout-lists interactive' });
    this.nav = [];
    for (const group of SLOTS) {
      const block = el('div', { class: 'slot-group' },
        el('div', { class: 'slot-title', text: group.title }));
      for (const key of group.keys) {
        const def = WEAPON_DEFS?.[key];
        const btn = el('button', {
          class: 'weapon-option', type: 'button', dataset: { weapon: key, slot: group.slot },
          onclick: () => this.pick(group.slot, key),
          onfocus: () => this._showDetail(key),
          onmouseenter: () => this._showDetail(key),
        },
        el('span', { class: 'weapon-option-glyph', html: weaponGlyph(def?.family || key) }),
        el('span', { class: 'grow' },
          el('span', { class: 'wname', text: def?.name || key }),
          el('br'),
          el('span', { class: 'wmake', text: def?.brand || 'Northstar' })));
        block.append(btn);
        this._options.set(key, btn);
        this.nav.push(btn);
      }
      lists.append(block);
    }
    layout.append(lists);

    // ------------------------------------------------------------ detail --
    const detail = el('div', { class: 'weapon-detail interactive' });
    this._detailName = el('h3', { class: 'detail-name', text: '' });
    this._detailMake = el('p', { class: 'detail-make', text: '' });
    this._detailCanvas = el('canvas', { class: 'weapon-profile', width: 420, height: 150, 'aria-hidden': 'true' });
    this._detailStats = el('div', { class: 'detail-stats' });
    this._detailNotes = el('p', { class: 'detail-notes', text: '' });
    detail.append(this._detailName, this._detailMake, this._detailCanvas, this._detailStats, this._detailNotes);
    layout.append(detail);
    content.append(layout);

    const backBtn = el('button', { class: 'btn ghost interactive', text: 'Back', 'data-uisound': 'none', onclick: () => this.ui.goBack() });
    const deployBtn = el('button', { class: 'btn primary interactive', text: 'Deploy', onclick: () => this.ui.deploy({ ...this.picks }) });
    content.append(
      el('div', { class: 'row screen-actions' }, backBtn, el('span', { class: 'spacer' }), deployBtn),
      this.hints([['\u2191\u2193', 'Browse'], ['ENTER', 'Select'], ['ESC', 'Back']]),
    );
    this.nav.push(backBtn, deployBtn);
    this._deployBtn = deployBtn;

    this._syncSelected();
    this._showDetail(this.picks.primary);
  }

  pick(slot, key) {
    this.picks[slot] = key;
    this._syncSelected();
    this._showDetail(key);
  }

  _syncSelected() {
    for (const [key, btn] of this._options) {
      const slot = btn.dataset.slot;
      btn.classList.toggle('selected', this.picks[slot] === key);
    }
  }

  _showDetail(key) {
    const def = WEAPON_DEFS?.[key];
    this._detailName.textContent = def?.name || key;
    this._detailMake.textContent = def
      ? `${def.brand || 'Northstar'} · ${String(def.family || '').toUpperCase()}${def.suppressed ? ' · INTEGRAL SUPPRESSOR' : ''}`
      : '';
    const ctx = this._detailCanvas?.getContext('2d');
    if (ctx) drawWeaponProfile(ctx, key, this._detailCanvas.width, this._detailCanvas.height);

    const rows = def?.isGadget ? gadgetStats(def) : statsOf(def);
    this._detailStats.replaceChildren(...(rows || []).map(([label, t, raw]) => el('div', { class: 'stat-row' },
      el('span', { class: 'sl', text: label }),
      el('span', { class: 'stat-bar' }, el('i', { style: `width:${Math.round(t * 100)}%` })),
      el('span', { class: 'sv', text: raw === null || raw === undefined ? `${Math.round(t * 100)}` : String(raw) }))));

    this._detailNotes.textContent = NOTES[key] || '';
  }

  onShow() {
    // Keep the previous mission's picks if the player restarts.
    const prev = this.game?.loadout;
    if (prev?.primary && WEAPON_DEFS?.[prev.primary]) this.picks.primary = prev.primary;
    if (prev?.secondary && WEAPON_DEFS?.[prev.secondary]) this.picks.secondary = prev.secondary;
    if (prev?.gadget && WEAPON_DEFS?.[prev.gadget]) this.picks.gadget = prev.gadget;
    this._syncSelected();
    this._showDetail(this.picks.primary);
  }
}

/** One line of honest doctrine per option. Original copy. */
const NOTES = {
  carbine: 'The all-round choice: reaches across the open office, punches through cubicle partitions, and holds a burst if you control it.',
  smg: 'Integrally suppressed. Shots barely carry beyond the room — the quiet way through a building that listens.',
  shotgun: 'Ends any conversation inside eight metres. Pump between shots; plan every entry.',
  sniper: 'A marksman\u2019s answer to the atrium and the service corridor. Slow between shots; the scope hides your crosshair, not your flanks.',
  pistol: 'Always with you. Fast to draw, honest to fifteen metres, and quicker than reloading when the magazine runs dry.',
  flash: 'Blinds everyone with line of sight to the burst — including you. Throw it around the corner, not at your own feet.',
  smoke: 'A wall of cover on demand. Breaks line of sight for fifteen seconds; hostiles will not shoot what they cannot see.',
};
