import type { IKillstreaks, KillstreakDef } from '../../core/Interfaces';
import { ClassCell, StyleCell, TextCell, div, el, markup } from '../dom';
import { streakGlyph, glyph } from '../Icons';

/**
 * The killstreak tray, under the radar.
 *
 * Two halves with two different jobs. The **ladder readout** is aspiration: the
 * next reward, how far away it is, and a bar that moves on every kill, which is
 * what makes a streak feel like something being built rather than something
 * that arrives. The **tray** below it is inventory: what you are holding and the
 * key that spends it, which is the only thing a player needs mid-firefight.
 *
 * Rows are rebuilt only when the set of held streaks changes — compared as a
 * joined key, since it changes a handful of times a match — and the progress bar
 * is a `scaleX` on a pre-sized element so it never touches layout.
 */

const KEYS = ['4', '5', '6'];

interface Row {
  node: HTMLElement;
  key: TextCell;
  name: TextCell;
  icon: HTMLElement;
  ready: ClassCell;
}

export class StreakTray {
  readonly root: HTMLElement;
  private readonly nextName: TextCell;
  private readonly nextCount: TextCell;
  private readonly bar: StyleCell;
  private readonly nextBlock: HTMLElement;
  private readonly rows: Row[] = [];
  private signature = '\u0000';
  private iconNames: string[] = [];

  constructor(parent: HTMLElement) {
    this.root = div('hud-streaks', parent);

    this.nextBlock = div('streak-next', this.root);
    const head = div('streak-next-head', this.nextBlock);
    el('span', 'streak-next-label', head).textContent = 'NEXT REWARD';
    this.nextCount = new TextCell(el('span', 'streak-next-count', head));
    this.nextName = new TextCell(el('span', 'streak-next-name', this.nextBlock));
    const track = div('streak-bar', this.nextBlock);
    this.bar = new StyleCell(div('streak-bar-fill', track), 'transform');

    const list = div('streak-list', this.root);
    for (let i = 0; i < 3; i++) {
      const node = div('streak', list);
      node.style.display = 'none';
      const key = el('span', 'streak-key', node);
      const icon = div('streak-icon', node);
      const name = el('span', 'streak-name', node);
      this.rows.push({
        node,
        key: new TextCell(key),
        name: new TextCell(name),
        icon,
        ready: new ClassCell(node, 'ready'),
      });
      this.iconNames.push('');
    }
  }

  /**
   * @param kills Streak kills so far this life, from `killstreak:progress`.
   */
  update(
    streaks: IKillstreaks | null,
    kills: number,
    nextName: string | null,
    killsToNext: number,
  ): void {
    const available = streaks?.available ?? [];
    const next = nextName
      ? (available.find((d) => d.name === nextName) ?? null)
      : (streaks?.next ?? null);

    if (next) {
      const need = killsToNext > 0 ? killsToNext : Math.max(0, next.killsRequired - kills);
      this.nextName.set(next.name);
      this.nextCount.set(need === 1 ? '1 KILL' : `${need} KILLS`);
      const from = previousRung(available, next);
      const span = Math.max(1, next.killsRequired - from);
      const progress = Math.max(0, Math.min(1, (kills - from) / span));
      this.bar.set(`scaleX(${progress.toFixed(3)})`);
      this.nextBlock.style.display = 'block';
    } else {
      this.nextName.set('LADDER COMPLETE');
      this.nextCount.set('MAX');
      this.bar.set('scaleX(1)');
      this.nextBlock.style.display = 'block';
    }

    const earned = streaks?.earned ?? EMPTY;
    const signature = earned.join('|');
    if (signature === this.signature) return;
    this.signature = signature;

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      const id = earned[i];
      if (!id) {
        row.node.style.display = 'none';
        continue;
      }
      const def = available.find((d) => d.id === id);
      const iconName = streakGlyph(def?.icon ?? id);
      if (this.iconNames[i] !== iconName) {
        this.iconNames[i] = iconName;
        row.icon.innerHTML = glyph(iconName, 'ic');
      }
      row.key.set(KEYS[i] ?? '·');
      row.name.set(def?.name ?? id.toUpperCase());
      row.ready.set(true);
      row.node.style.display = 'flex';
    }
  }

  clear(): void {
    this.signature = '\u0000';
    for (const r of this.rows) r.node.style.display = 'none';
  }
}

const EMPTY: readonly string[] = [];

/** The rung below `next`, so the bar spans this step rather than the whole ladder. */
function previousRung(all: KillstreakDef[], next: KillstreakDef): number {
  let best = 0;
  for (const d of all) {
    if (d.killsRequired < next.killsRequired && d.killsRequired > best) best = d.killsRequired;
  }
  return best;
}

/**
 * The earned banner.
 *
 * Separate from the tray because it is an interruption rather than a readout: it
 * takes the middle of the screen for a second and a half, announces the reward
 * by name, and leaves. Driven from the frame loop so its timing is the game's
 * and not the browser's, which also means it can be posed for a screenshot.
 */
export class StreakBanner {
  readonly root: HTMLElement;
  private readonly title: TextCell;
  private readonly name: TextCell;
  private readonly icon: HTMLElement;
  private readonly transform: StyleCell;
  private readonly opacity: StyleCell;
  private age = 99;
  private life = 2.6;
  private iconName = '';

  constructor(parent: HTMLElement) {
    this.root = div('hud-streak-banner', parent);
    this.root.style.display = 'none';
    const inner = div('sb-inner', this.root);
    this.icon = div('sb-icon', inner);
    const text = div('sb-text', inner);
    this.title = new TextCell(el('span', 'sb-title', text));
    this.name = new TextCell(el('span', 'sb-name', text));
    this.transform = new StyleCell(this.root, 'transform');
    this.opacity = new StyleCell(this.root, 'opacity');
  }

  /** @param age Seconds to backdate the banner by, for the screenshot harness. */
  show(name: string, icon: string, title = 'KILLSTREAK READY', age = 0): void {
    this.title.set(title);
    this.name.set(name.toUpperCase());
    const glyphName = streakGlyph(icon);
    if (this.iconName !== glyphName) {
      this.iconName = glyphName;
      this.icon.innerHTML = glyph(glyphName, 'ic');
    }
    this.age = age;
    this.root.style.display = 'flex';
  }

  update(dt: number): void {
    if (this.age > this.life) return;
    this.age += dt;
    const t = Math.min(1, this.age / this.life);
    // In fast, hold, out slow, with a small settle on the way in. The scale is
    // deliberately tiny: a banner that zooms reads as a mobile game.
    const rise = Math.min(1, this.age / 0.16);
    const fall = Math.max(0, (t - 0.72) / 0.28);
    const ease = 1 - (1 - rise) * (1 - rise);
    this.opacity.set((ease * (1 - fall * fall)).toFixed(3));
    this.transform.set(
      `translate3d(-50%, ${(-10 * (1 - ease) + fall * -8).toFixed(2)}px, 0) scale(${(0.97 + ease * 0.03).toFixed(3)})`,
    );
    if (this.age > this.life) this.root.style.display = 'none';
  }

  clear(): void {
    this.age = 99;
    this.root.style.display = 'none';
  }
}
