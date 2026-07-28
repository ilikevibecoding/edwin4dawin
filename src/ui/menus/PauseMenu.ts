/**
 * The pause menu.
 *
 * Four choices and a mission strip. Resume is first and largest because it is
 * what the player wants nine times out of ten, and the hints spell out the key
 * that would have done the same thing without opening this at all.
 */
import { div, el, setText, span } from '../Dom';
import { button, rule } from './Widgets';

export interface PauseActions {
  resume(): void;
  loadout(): void;
  settings(): void;
  controls(): void;
  restart(): void;
}

export class PauseMenu {
  readonly root: HTMLDivElement;

  private readonly statusEl: HTMLElement;
  private readonly stats: HTMLElement[] = [];

  constructor(parent: HTMLElement, actions: PauseActions) {
    this.root = div('ob-menu ob-pause', parent);
    const body = div('ob-menu-body', this.root);
    const card = div('ob-card ob-pause-card', body);

    const head = div('ob-menu-head', card);
    const title = el('h2', 'ob-h2', head);
    setText(title, 'Mission Paused');
    this.statusEl = span('lbl', head, 'AL-RASHID CROSSING');
    rule(card);

    const list = div('ob-pause-list', card);
    button(list, 'Resume', actions.resume, { hint: 'ESC', className: 'primary' });
    button(list, 'Loadout', actions.loadout);
    button(list, 'Settings', actions.settings);
    button(list, 'Controls', actions.controls);
    button(list, 'Restart mission', actions.restart);

    rule(card);
    // Four labelled cells rather than one dot-separated line: the line wrapped
    // at narrow widths and split a number away from its own label.
    const strip = div('ob-pause-stats', card);
    for (const label of ['Score', 'Kills', 'Deaths', 'Streak']) {
      const cell = div('ob-pause-stat', strip);
      span('lbl', cell, label);
      this.stats.push(span('n', cell, '0'));
    }
  }

  setStatus(place: string): void {
    setText(this.statusEl, place.toUpperCase());
  }

  setScore(score: number, kills: number, deaths: number, streak: number): void {
    const values = [score, kills, deaths, streak];
    for (let i = 0; i < this.stats.length; i++) setText(this.stats[i], String(values[i]));
  }
}
