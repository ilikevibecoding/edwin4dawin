import type { KillfeedEvent } from '../../core/Events';
import { div, el } from '../dom';
import { glyph, weaponIcon } from '../Icons';

/**
 * The killfeed, top right.
 *
 * Rows are pooled and reused. A feed that creates and destroys nodes during a
 * firefight is a feed that runs the style engine over a fresh subtree eight
 * times in two seconds, and it is the easiest HUD element to accidentally make
 * the most expensive one. Six rows are built at construction and thereafter
 * only their text, their icons and one class ever change.
 *
 * The slide-in is a CSS transition on `transform` and `opacity` and the removal
 * is driven from the frame loop rather than from `setTimeout`, so the feed
 * freezes with the game when the game is paused instead of quietly expiring
 * behind the pause menu.
 */

const LIFE = 6.2;
const FADE = 0.9;
const ROWS = 6;

interface Row {
  node: HTMLElement;
  attacker: HTMLElement;
  victim: HTMLElement;
  icons: HTMLElement;
  age: number;
  live: boolean;
  weapon: string;
  headshot: boolean;
}

export class Killfeed {
  readonly root: HTMLElement;
  private readonly rows: Row[] = [];

  constructor(parent: HTMLElement) {
    this.root = div('hud-killfeed', parent);
    for (let i = 0; i < ROWS; i++) {
      const node = div('kf', this.root);
      node.style.display = 'none';
      this.rows.push({
        node,
        attacker: el('span', 'kf-name kf-attacker', node),
        icons: div('kf-icons', node),
        victim: el('span', 'kf-name kf-victim', node),
        age: LIFE + 1,
        live: false,
        weapon: '',
        headshot: false,
      });
    }
  }

  /** @param age Seconds to backdate the row by, for the screenshot harness. */
  push(evt: KillfeedEvent, age = 0): void {
    // Oldest slot wins, and the feed is ordered by the DOM rather than by an
    // index, so a recycled row is moved to the bottom of the list.
    let slot = this.rows[0];
    for (const r of this.rows) if (r.age > slot.age) slot = r;

    slot.age = age;
    slot.live = true;
    slot.attacker.textContent = evt.attacker.toUpperCase();
    slot.victim.textContent = evt.victim.toUpperCase();
    if (slot.weapon !== evt.weapon || slot.headshot !== !!evt.headshot) {
      slot.weapon = evt.weapon;
      slot.headshot = !!evt.headshot;
      slot.icons.innerHTML =
        weaponIcon(evt.weapon, 'ic-weapon') + (evt.headshot ? glyph('skull', 'ic kf-head') : '');
    }
    slot.node.classList.toggle('mine', !!evt.highlight);
    slot.node.classList.remove('in', 'out');
    slot.node.style.display = 'flex';
    this.root.appendChild(slot.node);
    // The transition needs one resolved style at the entry transform before the
    // class lands, or it collapses to its end state and nothing slides. Reading
    // a layout property forces that resolution synchronously, which is both
    // cheaper and more reliable than deferring a frame — a deferred frame never
    // arrives under the screenshot harness, which steps the loop by hand.
    void slot.node.offsetWidth;
    slot.node.classList.add('in');
  }

  update(dt: number): void {
    for (const r of this.rows) {
      if (!r.live) continue;
      r.age += dt;
      if (r.age > LIFE - FADE) r.node.classList.add('out');
      if (r.age > LIFE) {
        r.live = false;
        r.node.classList.remove('out', 'in');
        r.node.style.display = 'none';
      }
    }
  }

  clear(): void {
    for (const r of this.rows) {
      r.live = false;
      r.age = LIFE + 1;
      r.node.classList.remove('in', 'out');
      r.node.style.display = 'none';
    }
  }
}
