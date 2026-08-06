/**
 * The "what everyone else did" card and the ending card.
 *
 * Both are self-dismissing: they resolve on Enter / Space / Escape or a click,
 * and on a timeout regardless, because the auto-demo has no player and a
 * dangling promise here would hang the whole recording.
 */
import {
  UIClock,
  UIFader,
  uiCaptureKeys,
  uiClamp,
  uiDur,
  uiEaseOut,
  uiEl,
  uiGrowRule,
  uiLed,
  uiPanel,
  uiRegisterPulse,
  uiReveal,
  type UIHandle,
} from './UIRoot';

export interface ChoiceStat {
  label: string;
  /** 0..100. */
  percent: number;
  chosen: boolean;
}

const CENTRE = 'translate(-50%, -50%)';
/** Fallback dismissal for the stats card when no duration is supplied. */
const DEFAULT_STAT_SECONDS = 6;
/** Hard ceiling on the ending card, whatever the epilogue length. */
const ENDING_MAX = 18;

export class StatsCard {
  private readonly root: HTMLElement;
  private readonly clock = new UIClock();

  private readonly card: HTMLElement;
  private readonly cardFader: UIFader;
  private readonly question: HTMLElement;
  private readonly bars: HTMLElement;
  private readonly cardLed: HTMLElement;

  private readonly ending: HTMLElement;
  private readonly endingFader: UIFader;
  private readonly endingTitle: HTMLElement;
  private readonly endingRule: HTMLElement;
  private readonly endingDesc: HTMLElement;
  private readonly endingLines: HTMLElement;
  private readonly endingFoot: HTMLElement;
  private readonly endingKicker: HTMLElement;

  private resolveCard: (() => void) | null = null;
  private releaseKeys: (() => void) | null = null;
  private autoTimer: UIHandle | null = null;
  private cardPulseOff: (() => void) | null = null;
  private mode: 'none' | 'stats' | 'ending' = 'none';
  private disposed = false;

  constructor(parent: HTMLElement) {
    this.root = uiEl('div', 'dv-c dv-c-stats');

    // --- stats card --------------------------------------------------------
    this.card = uiPanel('dv-stats');
    this.cardLed = uiLed();
    const head = uiEl('div', 'dv-clue-head');
    head.append(this.cardLed, uiEl('span', 'dv-label', 'Global decisions'));
    this.question = uiEl('div', 'dv-stats-q');
    this.bars = uiEl('div', 'dv-stats-bars');
    const foot = uiEl('div', 'dv-stats-foot');
    foot.append(
      uiEl('span', 'dv-mono', 'DEVIANT NETWORK'),
      uiEl('span', 'dv-label', 'Enter — Continue'),
    );
    this.card.append(head, this.question, this.bars, foot);
    this.card.style.transform = CENTRE;

    // --- ending card -------------------------------------------------------
    this.ending = uiEl('div', 'dv-ending');
    const endingIn = uiEl('div', 'dv-ending-in');
    this.endingKicker = uiEl('div', 'dv-ending-kicker dv-label', 'End of line');
    this.endingTitle = uiEl('div', 'dv-ending-title');
    this.endingRule = uiEl('i', 'dv-ending-rule');
    this.endingDesc = uiEl('div', 'dv-ending-desc');
    this.endingLines = uiEl('div', 'dv-ending-lines');
    this.endingFoot = uiEl('div', 'dv-ending-foot dv-label', 'Enter — Continue');
    endingIn.append(
      this.endingKicker,
      this.endingTitle,
      this.endingRule,
      this.endingDesc,
      this.endingLines,
      this.endingFoot,
    );
    this.ending.appendChild(endingIn);

    this.root.append(this.card, this.ending);
    parent.appendChild(this.root);
    this.cardFader = new UIFader(this.clock, this.card);
    this.endingFader = new UIFader(this.clock, this.ending);

    this.card.addEventListener('click', this.onClick);
    this.ending.addEventListener('click', this.onClick);
  }

  show(question: string, stats: ChoiceStat[], seconds?: number): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.reset();

    this.question.textContent = question;
    const list = (stats ?? []).slice(0, 6);
    clearChildren(this.bars);

    if (!this.cardPulseOff) this.cardPulseOff = uiRegisterPulse(this.cardLed, 1.8);
    this.mode = 'stats';
    this.card.style.pointerEvents = 'auto';
    this.cardFader.reveal({ duration: 0.28, y: 10, base: CENTRE });

    list.forEach((stat, i) => {
      const row = uiEl('div', `dv-stat${stat.chosen ? ' dv-chosen' : ''}`);
      const head = uiEl('div', 'dv-stat-head');
      head.appendChild(uiEl('span', 'dv-stat-label', stat.label));
      if (stat.chosen) head.appendChild(uiEl('span', 'dv-stat-you', 'YOU'));
      const value = uiEl('span', 'dv-mono', '0%');
      head.appendChild(value);
      const track = uiEl('div', 'dv-track');
      const fill = uiEl('i', 'dv-fill');
      track.appendChild(fill);
      row.append(head, track);
      this.bars.appendChild(row);

      const target = uiClamp(stat.percent, 0, 100);
      const delay = 0.18 + i * 0.12;
      uiReveal(this.clock, row, { duration: 0.24, x: -8, delay });
      this.clock.after(uiDur(delay), () => {
        this.clock.tween(uiDur(0.6), (p) => {
          const v = target * uiEaseOut(p);
          fill.style.transform = `scaleX(${(v / 100).toFixed(4)})`;
          value.textContent = `${Math.round(v)}%`;
        });
      });
    });

    const wait = seconds && seconds > 0 ? seconds : DEFAULT_STAT_SECONDS;
    return this.arm(wait);
  }

  showEnding(title: string, description: string, epilogue: string[]): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.reset();

    this.endingTitle.textContent = title;
    this.endingDesc.textContent = description;
    this.endingRule.style.transform = 'scaleX(0)';
    clearChildren(this.endingLines);

    const lines = (epilogue ?? []).slice(0, 8);
    this.mode = 'ending';
    this.ending.style.pointerEvents = 'auto';
    this.endingFader.reveal({ duration: 0.4 });
    uiReveal(this.clock, this.endingKicker, { duration: 0.4, y: 6, delay: 0.2 });
    uiReveal(this.clock, this.endingTitle, { duration: 0.5, y: 12, delay: 0.4 });
    this.clock.after(uiDur(0.8), () => uiGrowRule(this.clock, this.endingRule, 0.5, '50% 50%'));
    uiReveal(this.clock, this.endingDesc, { duration: 0.5, y: 8, delay: 1.0 });

    lines.forEach((text, i) => {
      const row = uiEl('div');
      row.append(uiEl('i'), uiEl('span', '', text));
      this.endingLines.appendChild(row);
      uiReveal(this.clock, row, { duration: 0.34, x: -10, delay: 1.4 + i * 0.55 });
    });

    const lastLine = 1.4 + Math.max(0, lines.length - 1) * 0.55 + 0.4;
    uiReveal(this.clock, this.endingFoot, { duration: 0.4, delay: lastLine + 0.4 });

    // Always self-dismisses, even with nobody watching.
    return this.arm(uiClamp(lastLine + 2.6, 3, ENDING_MAX));
  }

  hide(): void {
    if (this.disposed) return;
    this.close();
    this.settle();
  }

  dispose(): void {
    if (this.disposed) return;
    this.close();
    this.settle();
    this.disposed = true;
    this.card.removeEventListener('click', this.onClick);
    this.ending.removeEventListener('click', this.onClick);
    if (this.cardPulseOff) this.cardPulseOff();
    this.cardPulseOff = null;
    this.clock.dispose();
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }

  /* --- internals -------------------------------------------------------- */

  private arm(seconds: number): Promise<void> {
    this.releaseKeys = uiCaptureKeys({ down: (e) => this.onKey(e) });
    this.autoTimer = this.clock.after(Math.max(0.2, seconds), () => {
      this.autoTimer = null;
      this.hide();
    });
    return new Promise<void>((resolve) => {
      this.resolveCard = resolve;
    });
  }

  private onKey(e: KeyboardEvent): void {
    if (this.mode === 'none') return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.hide();
    }
  }

  private onClick = (): void => {
    if (this.mode === 'none') return;
    this.hide();
  };

  /** Drops input and timers, and takes whichever card is up off the screen. */
  private close(): void {
    this.stopInput();
    this.cardFader.fade(0.22, () => {
      if (this.cardPulseOff) {
        this.cardPulseOff();
        this.cardPulseOff = null;
      }
    });
    this.endingFader.fade(0.4);
  }

  private stopInput(): void {
    this.mode = 'none';
    this.card.style.pointerEvents = 'none';
    this.ending.style.pointerEvents = 'none';
    if (this.releaseKeys) {
      this.releaseKeys();
      this.releaseKeys = null;
    }
    if (this.autoTimer) {
      this.autoTimer.cancel();
      this.autoTimer = null;
    }
  }

  /**
   * Clears state before a new card. Cards are swapped without a cross-fade so
   * that dropping every running tween cannot leave the previous one stranded
   * half-visible.
   */
  private reset(): void {
    this.stopInput();
    this.settle();
    this.clock.cancelAll();
    this.cardFader.hideNow();
    this.endingFader.hideNow();
    if (this.cardPulseOff) {
      this.cardPulseOff();
      this.cardPulseOff = null;
    }
  }

  private settle(): void {
    const resolve = this.resolveCard;
    this.resolveCard = null;
    if (resolve) resolve();
  }
}

function clearChildren(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}
