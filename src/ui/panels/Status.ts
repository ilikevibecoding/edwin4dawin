import { ClassCell, StyleCell, TextCell, div, el, markup, grouped, pad } from '../dom';
import { glyph } from '../Icons';

/**
 * Objective and score, bottom left.
 *
 * The counterweight to the ammunition block: what the match wants from you on
 * the left, what your weapon can do about it on the right, and nothing in the
 * middle where you are aiming. The objective line is the only piece of the HUD
 * that carries a sentence, so it gets a rule and an icon to separate it from the
 * numbers underneath, which are read as glances.
 *
 * `SCORE` is grouped with separators and `WAVE` is zero-padded, both so their
 * width stops changing: a bottom-left block that reflows every time the score
 * crosses a power of ten pulls the eye away from the middle of the screen for no
 * reason at all.
 */

export class StatusPanel {
  readonly root: HTMLElement;
  private readonly objective: TextCell;
  private readonly objectiveBlock: HTMLElement;
  private readonly score: TextCell;
  private readonly kills: TextCell;
  private readonly wave: TextCell;
  private readonly hostiles: TextCell;
  private readonly hostileBar: StyleCell;
  private readonly hostileBlock: HTMLElement;
  private readonly lives: HTMLElement[] = [];
  private readonly livesRow: HTMLElement;
  private readonly urgent: ClassCell;

  constructor(parent: HTMLElement) {
    this.root = div('hud-status', parent);

    this.objectiveBlock = div('hud-objective', this.root);
    markup('obj-icon', glyph('objective', 'ic'), this.objectiveBlock);
    const objText = div('obj-text', this.objectiveBlock);
    el('span', 'obj-label', objText).textContent = 'OBJECTIVE';
    this.objective = new TextCell(el('span', 'obj-body', objText));
    this.urgent = new ClassCell(this.objectiveBlock, 'urgent');

    this.hostileBlock = div('hud-hostiles', this.root);
    const head = div('hostiles-head', this.hostileBlock);
    el('span', 'hostiles-label', head).textContent = 'HOSTILES';
    this.hostiles = new TextCell(el('span', 'hostiles-count', head));
    const track = div('hostiles-bar', this.hostileBlock);
    this.hostileBar = new StyleCell(div('hostiles-bar-fill', track), 'transform');

    const stats = div('hud-stats', this.root);
    this.score = new TextCell(cell(stats, 'SCORE'));
    this.kills = new TextCell(cell(stats, 'KILLS'));
    this.wave = new TextCell(cell(stats, 'WAVE'));

    this.livesRow = div('hud-lives', this.root);
    el('span', 'lives-label', this.livesRow).textContent = 'LIVES';
    for (let i = 0; i < 5; i++) {
      const pip = div('life-pip', this.livesRow);
      pip.style.display = 'none';
      this.lives.push(pip);
    }
  }

  setObjective(text: string, urgent = false): void {
    this.objective.set(text.toUpperCase());
    this.urgent.set(urgent);
    this.objectiveBlock.style.display = text ? 'flex' : 'none';
  }

  update(state: {
    score: number;
    kills: number;
    wave: number;
    hostilesLeft: number;
    waveSize: number;
    lives: number;
    maxLives: number;
  }): void {
    this.score.set(grouped(state.score));
    this.kills.set(pad(state.kills, 2));
    this.wave.set(pad(state.wave, 2));

    if (state.waveSize > 0) {
      this.hostileBlock.style.display = 'block';
      this.hostiles.set(`${state.hostilesLeft} / ${state.waveSize}`);
      this.hostileBar.set(
        `scaleX(${Math.max(0, Math.min(1, state.hostilesLeft / state.waveSize)).toFixed(3)})`,
      );
    } else {
      this.hostileBlock.style.display = 'none';
    }

    if (state.maxLives > 0) {
      this.livesRow.style.display = 'flex';
      for (let i = 0; i < this.lives.length; i++) {
        const pip = this.lives[i];
        const shown = i < state.maxLives;
        pip.style.display = shown ? 'block' : 'none';
        if (shown) pip.classList.toggle('spent', i >= state.lives);
      }
    } else {
      this.livesRow.style.display = 'none';
    }
  }
}

function cell(parent: HTMLElement, label: string): HTMLElement {
  const node = div('stat', parent);
  el('span', 'stat-key', node).textContent = label;
  return el('span', 'stat-value', node);
}

/**
 * Floating score pops.
 *
 * The immediate, per-event half of scoring — the number that leaps off a kill —
 * as opposed to the running total in the panel. Deliberately near the crosshair
 * and deliberately short: it exists to confirm that the thing you just did
 * counted, and the player should never have to look away from the middle of the
 * frame to find out.
 */
interface Pop {
  node: HTMLElement;
  value: TextCell;
  reason: TextCell;
  transform: StyleCell;
  opacity: StyleCell;
  age: number;
  live: boolean;
  /** Which of the three stacked lanes this pop rises in. */
  lane: number;
}

const LANES = 3;
/** Lane pitch and rise distance, in `--u`, so both scale with the viewport. */
const LANE_PITCH = 2.4;
const RISE = 2.6;

export class ScorePops {
  readonly root: HTMLElement;
  private readonly pops: Pop[] = [];
  private next = 0;
  private lane = 0;

  constructor(parent: HTMLElement) {
    this.root = div('hud-pops', parent);
    for (let i = 0; i < 6; i++) {
      const node = div('pop', this.root);
      node.style.display = 'none';
      this.pops.push({
        node,
        value: new TextCell(el('span', 'pop-value', node)),
        reason: new TextCell(el('span', 'pop-reason', node)),
        transform: new StyleCell(node, 'transform'),
        opacity: new StyleCell(node, 'opacity'),
        age: 99,
        live: false,
        lane: 0,
      });
    }
  }

  /** @param age Seconds to backdate the pop by, for the screenshot harness. */
  push(delta: number, reason: string, age = 0): void {
    if (delta === 0) return;
    const pop = this.pops[this.next];
    this.next = (this.next + 1) % this.pops.length;
    pop.value.set(`${delta > 0 ? '+' : ''}${delta}`);
    pop.reason.set(reason.toUpperCase());
    pop.node.classList.toggle('negative', delta < 0);
    // Three lanes, taken in turn. A headshot and the kill it caused arrive a
    // third of a second apart, which is close enough that both are still rising
    // together — in one lane they overprint into an unreadable smear, which the
    // first capture showed as "+16100".
    pop.lane = this.lane;
    this.lane = (this.lane + 1) % LANES;
    pop.age = age;
    pop.live = true;
    pop.node.style.display = 'flex';
  }

  update(dt: number): void {
    for (const p of this.pops) {
      if (!p.live) continue;
      p.age += dt;
      const life = 1.15;
      const t = p.age / life;
      if (t >= 1) {
        p.live = false;
        p.node.style.display = 'none';
        continue;
      }
      const rise = 1 - Math.pow(1 - Math.min(1, p.age / 0.5), 3);
      p.opacity.set((t < 0.1 ? t / 0.1 : 1 - Math.max(0, (t - 0.55) / 0.45)).toFixed(3));
      // Expressed in `--u` inside the transform so the travel is the same
      // fraction of the frame at 720p and at 4K, without ever writing a property
      // that could trigger layout.
      const lift = (-p.lane * LANE_PITCH - RISE * rise).toFixed(3);
      p.transform.set(
        `translate3d(0, calc(var(--u) * ${lift}), 0) scale(${(0.92 + rise * 0.08).toFixed(3)})`,
      );
    }
  }

  clear(): void {
    for (const p of this.pops) {
      p.live = false;
      p.node.style.display = 'none';
    }
  }
}
