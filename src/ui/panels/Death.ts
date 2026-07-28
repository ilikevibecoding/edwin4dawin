import { StyleCell, TextCell, div, el, markup, grouped } from '../dom';
import { glyph, ring } from '../Icons';

/**
 * The death screen.
 *
 * One question matters when you die — *what killed me, and from where* — and one
 * thing matters after that: how long until you are back. So the card is built
 * around exactly those two, and the match statistics are subordinate to both.
 *
 * The countdown is a ring rather than a number alone because a ring is readable
 * without being looked at, and the whole point of a respawn timer is that the
 * player spends it deciding where to go rather than watching a digit.
 */

const CLOCK_RING = ring(26, 3.4, 'death-ring');

export class DeathCard {
  readonly root: HTMLElement;
  private readonly killer: TextCell;
  private readonly cause: TextCell;
  private readonly clock: TextCell;
  private readonly prompt: TextCell;
  private readonly score: TextCell;
  private readonly kills: TextCell;
  private readonly streak: TextCell;
  private readonly ringOffset: StyleCell | null;
  private readonly livesRow: HTMLElement;
  private readonly pips: HTMLElement[] = [];
  private total = 5;

  constructor(parent: HTMLElement) {
    this.root = div('hud-death', parent);

    const card = div('death-card', this.root);
    el('span', 'death-heading', card).textContent = 'KILLED IN ACTION';

    const by = div('death-by', card);
    markup('death-skull', glyph('skull', 'ic'), by);
    const byText = div('death-by-text', by);
    this.killer = new TextCell(el('span', 'death-killer', byText));
    this.cause = new TextCell(el('span', 'death-cause', byText));

    const timer = div('death-timer', card);
    const clockHolder = markup('death-clock', CLOCK_RING.html, timer);
    this.clock = new TextCell(el('span', 'death-clock-value', clockHolder));
    const ringFill = clockHolder.querySelector('.ring-fill');
    this.ringOffset = ringFill
      ? new StyleCell(ringFill as unknown as HTMLElement, 'stroke-dashoffset')
      : null;
    const prompt = div('death-prompt', timer);
    el('span', 'death-prompt-label', prompt).textContent = 'SECONDS TO REDEPLOY';
    this.prompt = new TextCell(el('span', 'death-prompt-body', prompt));

    this.livesRow = div('death-lives', card);
    el('span', 'lives-label', this.livesRow).textContent = 'LIVES REMAINING';
    for (let i = 0; i < 5; i++) {
      const pip = div('life-pip', this.livesRow);
      pip.style.display = 'none';
      this.pips.push(pip);
    }

    const stats = div('death-stats', card);
    this.score = new TextCell(statCell(stats, 'SCORE'));
    this.kills = new TextCell(statCell(stats, 'KILLS'));
    this.streak = new TextCell(statCell(stats, 'BEST STREAK'));
  }

  show(by: string, cause: string): void {
    this.killer.set(by.toUpperCase());
    this.cause.set(cause.toUpperCase());
  }

  update(state: {
    respawnIn: number;
    respawnTotal: number;
    lives: number;
    maxLives: number;
    score: number;
    kills: number;
    bestStreak: number;
  }): void {
    const left = Math.max(0, state.respawnIn);
    this.clock.set(Math.ceil(left).toString());
    this.prompt.set(left > 0.05 ? 'STAND BY FOR INSERTION' : 'REDEPLOYING NOW');
    if (this.ringOffset) {
      const t = state.respawnTotal > 0 ? 1 - left / state.respawnTotal : 1;
      this.ringOffset.set((CLOCK_RING.circumference * (1 - t)).toFixed(2));
    }
    this.score.set(grouped(state.score));
    this.kills.set(state.kills.toString());
    this.streak.set(state.bestStreak.toString());

    if (state.maxLives !== this.total) {
      this.total = state.maxLives;
    }
    this.livesRow.style.display = state.maxLives > 0 ? 'flex' : 'none';
    for (let i = 0; i < this.pips.length; i++) {
      const shown = i < state.maxLives;
      this.pips[i].style.display = shown ? 'block' : 'none';
      if (shown) this.pips[i].classList.toggle('spent', i >= state.lives);
    }
  }
}

function statCell(parent: HTMLElement, label: string): HTMLElement {
  const node = div('death-stat', parent);
  el('span', 'stat-key', node).textContent = label;
  return el('span', 'stat-value', node);
}
