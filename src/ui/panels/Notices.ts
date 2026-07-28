import type { NotifyEvent } from '../../core/Events';
import { StyleCell, TextCell, div, el, markup } from '../dom';
import { glyph } from '../Icons';

/**
 * Notifications, top centre under the heading strip.
 *
 * Four tones, and the tone is carried by a coloured rule and the title colour
 * rather than by a coloured panel: a solid red banner over a sunlit street is a
 * hole in the frame, and the point of a notification is that you can keep
 * playing through it.
 *
 * Three slots, pooled, aged from the frame loop. When a fourth arrives the
 * oldest is retired early rather than queued, because a queue means the player
 * reads a warning about something that finished happening four seconds ago.
 */

interface Slot {
  node: HTMLElement;
  title: TextCell;
  subtitle: TextCell;
  transform: StyleCell;
  opacity: StyleCell;
  age: number;
  life: number;
  live: boolean;
  tone: string;
}

export class Notifications {
  readonly root: HTMLElement;
  private readonly slots: Slot[] = [];

  constructor(parent: HTMLElement) {
    this.root = div('hud-notices', parent);
    for (let i = 0; i < 3; i++) {
      const node = div('notice', this.root);
      node.style.display = 'none';
      this.slots.push({
        node,
        title: new TextCell(el('span', 'notice-title', node)),
        subtitle: new TextCell(el('span', 'notice-sub', node)),
        transform: new StyleCell(node, 'transform'),
        opacity: new StyleCell(node, 'opacity'),
        age: 99,
        life: 3,
        live: false,
        tone: '',
      });
    }
  }

  /** @param age Seconds to backdate the notice by, for the screenshot harness. */
  push(evt: NotifyEvent, age = 0): void {
    let slot = this.slots[0];
    for (const s of this.slots) if (!s.live) { slot = s; break; }
    if (slot.live) {
      for (const s of this.slots) if (s.age > slot.age) slot = s;
    }
    const tone = evt.tone ?? 'neutral';
    if (slot.tone !== tone) {
      slot.node.classList.remove(`tone-${slot.tone}`);
      slot.node.classList.add(`tone-${tone}`);
      slot.tone = tone;
    }
    slot.title.set(evt.title.toUpperCase());
    slot.subtitle.set((evt.subtitle ?? '').toUpperCase());
    slot.node.classList.toggle('has-sub', !!evt.subtitle);
    slot.life = Math.max(1.2, evt.duration ?? 3.4);
    slot.age = age;
    slot.live = true;
    slot.node.style.display = 'flex';
    this.root.appendChild(slot.node);
  }

  update(dt: number): void {
    for (const s of this.slots) {
      if (!s.live) continue;
      s.age += dt;
      if (s.age >= s.life) {
        s.live = false;
        s.node.style.display = 'none';
        continue;
      }
      const rise = Math.min(1, s.age / 0.18);
      const ease = 1 - (1 - rise) * (1 - rise);
      const fade = Math.max(0, (s.age - (s.life - 0.45)) / 0.45);
      s.opacity.set((ease * (1 - fade)).toFixed(3));
      s.transform.set(`translate3d(0, ${(-14 * (1 - ease)).toFixed(2)}px, 0)`);
    }
  }

  clear(): void {
    for (const s of this.slots) {
      s.live = false;
      s.node.style.display = 'none';
    }
  }
}

/**
 * The inbound clock.
 *
 * Up only while ordnance is in the air, and the only element on the HUD allowed
 * to be this loud: everything the player should do in the next four seconds is
 * decided by this number. Counted down locally from the last
 * `airstrike:inbound`, so it stays smooth between the coarse updates the
 * killstreak system sends.
 */
export class InboundChip {
  readonly root: HTMLElement;
  private readonly clock: TextCell;
  private readonly label: TextCell;
  private readonly bar: StyleCell;
  private readonly opacity: StyleCell;
  private seconds = 0;
  private total = 1;
  private shown = false;

  constructor(parent: HTMLElement) {
    this.root = div('hud-inbound', parent);
    this.root.style.display = 'none';
    const head = div('inbound-head', this.root);
    markup('inbound-icon', glyph('bomb', 'ic'), head);
    this.label = new TextCell(el('span', 'inbound-label', head));
    this.clock = new TextCell(el('span', 'inbound-clock', head));
    const track = div('inbound-bar', this.root);
    this.bar = new StyleCell(div('inbound-bar-fill', track), 'transform');
    this.opacity = new StyleCell(this.root, 'opacity');
  }

  /**
   * @param total Length of the whole run, so the bar reads as progress toward
   *   impact rather than as the last fraction of a second. Defaults to whatever
   *   is left, which is right for the first update of a strike and wrong after.
   */
  set(seconds: number, label = 'ORDNANCE INBOUND', total?: number): void {
    this.label.set(label);
    if (total !== undefined) this.total = Math.max(0.5, total);
    else if (seconds > this.seconds || !this.shown) this.total = Math.max(0.5, seconds);
    this.seconds = seconds;
    this.shown = true;
    this.root.style.display = 'flex';
    this.opacity.set('1');
  }

  update(dt: number): void {
    if (!this.shown) return;
    this.seconds -= dt;
    if (this.seconds <= -0.6) {
      this.hide();
      return;
    }
    const left = Math.max(0, this.seconds);
    this.clock.set(left > 0 ? `${left.toFixed(1)}s` : 'IMPACT');
    this.bar.set(`scaleX(${(1 - Math.min(1, left / this.total)).toFixed(3)})`);
    this.root.classList.toggle('critical', left < 2.2);
  }

  hide(): void {
    if (!this.shown) return;
    this.shown = false;
    this.seconds = 0;
    this.root.style.display = 'none';
    this.root.classList.remove('critical');
  }

  get visible(): boolean {
    return this.shown;
  }
}
