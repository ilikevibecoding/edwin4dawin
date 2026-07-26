// Mission briefing — the story, the plan, the intel. Detailed instruction
// lives HERE, so the HUD can stay quiet.  (owner: fable1)

import { Screen, el, fmtKey, fmtTime, uiSound } from './base.js';
import { EVT } from '../../core/events.js';
import { MinimapRenderer, layoutMarkers } from '../minimap.js';
import { icon } from '../icons.js';
import { HOSTAGE_POINTS, EXTRACTION, ENEMY_POSTS } from '../../map/layout.js';

const STORY = [
  ['Situation', [
    'At 17:40 an armed cell seized the Northstar Administrative Center, a two-storey '
    + 'regional headquarters on the edge of the Kier Valley, and took the late shift hostage. '
    + 'The winter storm "Long Night" has closed every road and grounded every aircraft; '
    + 'a negotiated surrender has collapsed.',
    'You are the only operator inside the cordon. Command can watch the building\u2019s '
    + 'cameras intermittently, but cannot reach you once you are through the door. '
    + 'The cell is preparing to move the hostages before the storm breaks.',
  ]],
  ['Execution', [
    'Insert through the north courtyard on foot. The building is a loop — lobby, work '
    + 'floor, service spine — with a mezzanine above the atrium. No corridor is the only way anywhere.',
    'Locate both hostages, neutralise or evade the hostile force, and walk the hostages '
    + 'to the vehicle bay on the east side. The roller shutter garage is the extraction point.',
  ]],
];

const RULES = [
  'Hostage casualties are mission failure. Check your target before you fire.',
  'Suppressed weapons and closed doors keep the building calm; gunfire travels.',
  'Security doors (server room, vestibule) need the guard keycard.',
  'Both hostages must reach the vehicle bay. Escort them one at a time if needed.',
];

const CONTROL_SUMMARY = [
  ['use', 'Interact / free hostage'],
  ['reload', 'Reload'],
  ['walk', 'Walk quietly'],
  ['crouch', 'Crouch'],
  ['flash', 'Flashbang'],
  ['map', 'Minimap'],
  ['objectives', 'Objectives (hold)'],
  ['pause', 'Pause'],
];

export class BriefingScreen extends Screen {
  constructor(ui) {
    super(ui, 'briefing');
    this.mode = 'deploy'; // 'deploy' (flow step) | 'browse' (from menu)
    this._floor = 'ground';
  }

  build() {
    const content = this.scaffold();
    content.append(this.header('Deployment · step 2 of 3', 'Operation Long Night', 'Northstar Administrative Center · single-operative entry'));

    const layout = el('div', { class: 'briefing-layout' });

    // ------------------------------------------------------------- story --
    const body = el('div', { class: 'briefing-body interactive' });
    for (const [head, paras] of STORY) {
      body.append(el('div', { class: 'brief-section', text: head }));
      for (const p of paras) body.append(el('p', { text: p }));
    }
    body.append(el('div', { class: 'brief-section', text: 'Objectives' }));
    this._objectiveList = el('ul', { class: 'brief-list' });
    body.append(this._objectiveList);
    body.append(el('div', { class: 'brief-section', text: 'Rules of engagement' }));
    body.append(el('ul', { class: 'brief-list' }, ...RULES.map((r) => el('li', { text: r }))));

    body.append(el('div', { class: 'brief-section', text: 'Control summary' }));
    const ctl = el('div', { class: 'brief-controls' });
    for (const [action, label] of CONTROL_SUMMARY) {
      const code = this.game?.input?.bindings?.[action]?.[0]
        || { use: 'KeyE', reload: 'KeyR', walk: 'ShiftLeft', crouch: 'ControlLeft', flash: 'KeyG', map: 'KeyM', objectives: 'Tab', pause: 'Escape' }[action];
      ctl.append(el('span', { class: 'brief-key' }, el('kbd', { text: fmtKey(code) }), el('span', { text: label })));
    }
    body.append(ctl);
    layout.append(body);

    // ---------------------------------------------------- map and intel --
    const side = el('div', { class: 'brief-map interactive' });

    const tabs = el('div', { class: 'row floor-tabs' },
      this._tabGround = el('button', { class: 'btn ghost floor-tab active', text: 'Ground floor', onclick: () => this._setFloor('ground') }),
      this._tabUpper = el('button', { class: 'btn ghost floor-tab', text: 'Mezzanine', onclick: () => this._setFloor('upper') }),
      el('span', { class: 'spacer' }),
      el('span', { class: 'map-caption', text: 'Field sketch — not to scale' }));
    side.append(tabs);

    this._canvas = el('canvas', { class: 'brief-canvas', width: 640, height: 560, 'aria-label': 'Mission floor plan' });
    side.append(this._canvas);
    this._map = new MinimapRenderer(this._canvas, { style: 'plan' });

    side.append(this._intelCards());
    layout.append(side);
    content.append(layout);

    // ------------------------------------------------------------- foot --
    this._backBtn = el('button', { class: 'btn ghost interactive', text: 'Back', 'data-uisound': 'none', onclick: () => this.ui.goBack() });
    this._nextBtn = el('button', { class: 'btn primary interactive', text: 'Continue to loadout \u2192', onclick: () => this.ui.briefingContinue() });
    content.append(
      el('div', { class: 'row screen-actions' }, this._backBtn, el('span', { class: 'spacer' }), this._nextBtn),
      this.hints([['TAB', 'Floor'], ['ENTER', 'Continue'], ['ESC', 'Back']]),
    );
    this.nav = [this._tabGround, this._tabUpper, this._backBtn, this._nextBtn];
  }

  _intelCards() {
    const hostiles = Array.isArray(ENEMY_POSTS) ? ENEMY_POSTS.length : null;
    const hostages = Array.isArray(HOSTAGE_POINTS) ? HOSTAGE_POINTS : [];
    const wrap = el('div', { class: 'intel-grid' });

    wrap.append(el('div', { class: 'intel-card' },
      el('h4', { html: `${icon('warning', 'intel-icon')} Hostile force` }),
      row('Strength', hostiles ? `~${hostiles} armed` : 'Unknown'),
      row('Posture', 'Patrols + fixed guards'),
      row('Armament', 'Small arms, body armour')));

    const hostageCard = el('div', { class: 'intel-card' },
      el('h4', { html: `${icon('hostage', 'intel-icon')} Hostages` }));
    if (hostages.length) {
      for (const h of hostages) {
        hostageCard.append(row(h.name || h.id || 'Unknown', h.room === 'conference' ? 'Conference, ground' : h.room === 'execoffice' ? 'Exec office, mezzanine' : (h.room || 'Location unknown')));
      }
    } else {
      hostageCard.append(row('Count', 'Unconfirmed'));
    }
    wrap.append(hostageCard);

    wrap.append(el('div', { class: 'intel-card' },
      el('h4', { html: `${icon('extraction', 'intel-icon')} Extraction` }),
      row('Point', EXTRACTION?.label || 'Vehicle bay, east side'),
      row('Route', 'Loading dock \u2192 garage'),
      this._timeRow = row('Time limit', this._timeLimitText())));

    return wrap;

    function row(k, v) {
      return el('div', { class: 'intel-row' }, el('span', { text: k }), el('span', { class: 'v', text: v }));
    }
  }

  _timeLimitText() {
    const m = safeMission(this.game);
    const limit = m?.timeLimit ?? m?.timeLimitSeconds ?? null;
    return typeof limit === 'number' && limit > 0 ? fmtTime(limit) : 'Storm window — move with purpose';
  }

  _defaultObjectives() {
    const names = (HOSTAGE_POINTS || []).map((h) => h.name).filter(Boolean);
    return [
      'Infiltrate the administrative center from the north courtyard.',
      names.length ? `Locate and free the hostages: ${names.join(' and ')}.` : 'Locate and free all hostages.',
      'Escort the hostages to the vehicle bay and extract.',
      'Optional: recover the security keycard to open locked sections.',
    ];
  }

  _renderObjectives() {
    const m = safeMission(this.game);
    const fromDirector = Array.isArray(m?.objectives)
      ? m.objectives.map((o) => o?.text || o?.label || o?.name || o?.title).filter(Boolean)
      : null;
    const list = (fromDirector && fromDirector.length) ? fromDirector : this._defaultObjectives();
    this._objectiveList.replaceChildren(...list.map((t) => el('li', { text: t })));
  }

  _setFloor(floor) {
    this._floor = floor;
    this._tabGround?.classList.toggle('active', floor === 'ground');
    this._tabUpper?.classList.toggle('active', floor === 'upper');
    this._renderMap();
  }

  _renderMap() {
    if (!this._map) return;
    const markers = layoutMarkers({ hostages: true, extraction: true, insertion: true });
    this._map.render({ floor: this._floor, markers, showLabels: true, showCompass: true });
  }

  onShow(payload) {
    this.mode = payload?.mode || this.mode || 'deploy';
    const deploying = this.mode === 'deploy';
    if (this._nextBtn) this._nextBtn.style.display = deploying ? '' : 'none';
    const head = this.el.querySelector('.eyebrow');
    if (head) head.textContent = deploying ? 'Deployment · step 2 of 3' : 'Reference';
    this._renderObjectives();
    if (this._timeRow) {
      const v = this._timeRow.querySelector('.v');
      if (v) v.textContent = this._timeLimitText();
    }
    // Draw after layout so the canvas has its final CSS size.
    requestAnimationFrame(() => this._renderMap());
  }

  handleKey(e) {
    if (e.code === 'Tab') {
      this._setFloor(this._floor === 'ground' ? 'upper' : 'ground');
      uiSound(EVT.UI_NAV, { kind: 'move' });
      return true;
    }
    return super.handleKey(e);
  }
}

/** The director may not exist (or expose toJSON) yet. */
function safeMission(game) {
  try {
    return game?.director?.toJSON?.() || null;
  } catch {
    return null;
  }
}
