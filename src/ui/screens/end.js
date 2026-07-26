// Victory & defeat cards. Reads the EVT.MISSION_END payload (stored by the
// manager) and falls back to live systems for anything missing.
// (owner: fable1)

import { Screen, el, fmtTime } from './base.js';
import { icon, compassStar } from '../icons.js';

const REASONS = {
  victory: 'All hostages recovered. Extraction complete.',
  hostagesExtracted: 'All hostages recovered. Extraction complete.',
  playerDead: 'The operator was killed in action.',
  hostageDead: 'A hostage was lost. The operation is unrecoverable.',
  hostageKilled: 'A hostage was lost. The operation is unrecoverable.',
  timeout: 'The storm window closed before extraction.',
  timeLimit: 'The storm window closed before extraction.',
  aborted: 'The operation was aborted.',
};

export class EndScreen extends Screen {
  /** @param {'victory'|'defeat'} kind */
  constructor(ui, kind) {
    super(ui, kind);
    this.kind = kind;
  }

  build() {
    const content = this.scaffold();
    content.classList.add('end-content');

    const card = el('div', { class: `endcard ${this.kind} interactive` });
    card.append(
      el('div', { class: 'end-emblem', html: this.kind === 'victory' ? compassStar(52) : icon('skull', 'end-skull') }),
      el('p', { class: 'eyebrow', text: this.kind === 'victory' ? 'After-action report' : 'After-action report' }),
      this._verdict = el('h2', { class: 'verdict', text: this.kind === 'victory' ? 'Mission Accomplished' : 'Mission Failed' }),
      this._reason = el('p', { class: 'reason', text: '' }),
      this._grid = el('div', { class: 'result-grid' }),
    );

    this._restartBtn = el('button', { class: `btn ${this.kind === 'victory' ? '' : 'primary'}`, text: 'Restart Mission', onclick: () => this.game?.restart?.() });
    this._menuBtn = el('button', { class: `btn ${this.kind === 'victory' ? 'primary' : ''}`, text: 'Return to Menu', onclick: () => this.game?.returnToMenu?.() });
    card.append(el('div', { class: 'row' }, this._restartBtn, this._menuBtn));
    card.append(this.hints([['ENTER', 'Select'], ['ESC', 'Menu']]));

    content.append(card);
    this.nav = [this._restartBtn, this._menuBtn];
  }

  onShow(payload) {
    const data = this.ui.missionEndPayload || payload || {};
    const reasonKey = data.reason || data.cause || data.outcomeReason || (this.kind === 'victory' ? 'victory' : '');
    this._reason.textContent = REASONS[reasonKey] || String(reasonKey || (this.kind === 'victory'
      ? REASONS.victory : 'The operation could not be completed.'));

    const stats = data.stats || data.summary || safeStats(this.game) || {};
    const mission = safeMission(this.game) || {};
    const hostagesTotal = data.hostagesTotal ?? mission.hostagesTotal ?? 2;
    const time = data.time ?? data.elapsed ?? mission.elapsed ?? this.game?.engine?.simTime ?? 0;

    const rows = [
      ['Time', fmtTime(time)],
      ['Difficulty', String(data.difficulty ?? this.game?.difficulty ?? '—').toUpperCase()],
      ['Hostages saved', `${num(stats.hostagesSecured ?? data.hostagesSecured)} / ${hostagesTotal}`],
      ['Enemies neutralised', num(stats.enemiesNeutralised ?? data.enemiesNeutralised)],
      ['Accuracy', stats.accuracy !== undefined ? `${stats.accuracy}%` : '—'],
      ['Headshots', num(stats.headshots)],
      ['Shots fired', num(stats.shotsFired)],
      ['Damage taken', num(stats.damageTaken)],
    ];
    this._grid.replaceChildren(...rows.map(([k, v]) => el('div', { class: 'result-row' },
      el('span', { class: 'rl', text: k }), el('span', { class: 'rv', text: String(v) }))));
  }
}

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v)) : '—';
}

function safeStats(game) {
  try {
    return game?.combat?.summary?.() || null;
  } catch {
    return null;
  }
}

function safeMission(game) {
  try {
    return game?.director?.toJSON?.() || null;
  } catch {
    return null;
  }
}
