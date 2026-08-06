/**
 * The persistent chrome: objective, relationship meters, contextual prompts,
 * analysis (scan) mode, clue readouts, notices, the android instability bar
 * and the film chapter card.
 *
 * Layout is fixed by zone so nothing can collide at the 960x540 capture size:
 * objective top-left, meters top-right, slate top-centre (owned by the
 * dialogue layer), notices below the slate, clue on the right flank,
 * instability bottom-right, subtitles centred in the lower third.
 */
import {
  UIClock,
  UIFader,
  uiClamp,
  uiClamp01,
  uiDur,
  uiEaseOut,
  uiEl,
  uiFadeOut,
  uiGrowRule,
  uiLed,
  uiPanel,
  uiRegisterPulse,
  uiReveal,
  type UIHandle,
} from './UIRoot';

export interface RelationshipMeter {
  id: string;
  name: string;
  /** 0..100. */
  value: number;
  trend?: -1 | 0 | 1;
}

const CENTRE_X = 'translateX(-50%)';

interface MeterRow {
  id: string;
  row: HTMLElement;
  name: HTMLElement;
  value: HTMLElement;
  fill: HTMLElement;
  trend: HTMLElement;
  shown: number;
  tween: UIHandle | null;
}

export class HUD {
  private readonly root: HTMLElement;
  private readonly clock = new UIClock();

  private readonly objective: HTMLElement;
  private readonly objectiveText: HTMLElement;
  private readonly objectiveLed: HTMLElement;
  private readonly objectiveFader: UIFader;

  private readonly meters: HTMLElement;
  private readonly metersFader: UIFader;

  private readonly instab: HTMLElement;
  private readonly instabFill: HTMLElement;
  private readonly instabValue: HTMLElement;
  private readonly instabFader: UIFader;

  private readonly prompt: HTMLElement;
  private readonly promptKey: HTMLElement;
  private readonly promptText: HTMLElement;
  private readonly promptFader: UIFader;

  private readonly scan: HTMLElement;
  private readonly scanValue: HTMLElement;
  private readonly crossRing: HTMLElement;
  private readonly scanFader: UIFader;

  private readonly clue: HTMLElement;
  private readonly clueLabel: HTMLElement;
  private readonly clueDetail: HTMLElement;
  private readonly clueLed: HTMLElement;
  private readonly clueFader: UIFader;

  private readonly notices: HTMLElement;

  private readonly chapter: HTMLElement;
  private readonly chapterNum: HTMLElement;
  private readonly chapterTitle: HTMLElement;
  private readonly chapterRule: HTMLElement;
  private readonly chapterSub: HTMLElement;
  private readonly chapterFader: UIFader;

  private meterRows: MeterRow[] = [];
  private meterKey = '';
  private instabShown = 0;
  private instabTween: UIHandle | null = null;
  private clueTimer: UIHandle | null = null;
  private scanTicker: (() => void) | null = null;
  private scanPulseOff: (() => void) | null = null;
  private objectivePulseOff: (() => void) | null = null;
  private cluePulseOff: (() => void) | null = null;
  private chapterTimers: UIHandle[] = [];
  private resolveChapter: (() => void) | null = null;
  private disposed = false;

  constructor(parent: HTMLElement) {
    this.root = uiEl('div', 'dv-c dv-c-hud');

    // --- objective ---------------------------------------------------------
    this.objective = uiEl('div', 'dv-obj');
    this.objectiveLed = uiLed();
    const objHead = uiEl('div', 'dv-obj-head');
    objHead.append(this.objectiveLed, uiEl('span', 'dv-label', 'Objective'));
    this.objectiveText = uiEl('div', 'dv-obj-text');
    this.objective.append(objHead, this.objectiveText);

    // --- meters ------------------------------------------------------------
    this.meters = uiEl('div', 'dv-meters');

    // --- instability -------------------------------------------------------
    this.instab = uiEl('div', 'dv-instab');
    this.instabValue = uiEl('span', 'dv-mono dv-instab-val', '0%');
    const instabHead = uiEl('div', 'dv-instab-head');
    instabHead.append(uiEl('span', 'dv-label', 'Instability'), this.instabValue);
    const instabTrack = uiEl('div', 'dv-track');
    this.instabFill = uiEl('i', 'dv-fill');
    instabTrack.appendChild(this.instabFill);
    this.instab.append(instabHead, instabTrack);

    // --- prompt ------------------------------------------------------------
    this.prompt = uiEl('div', 'dv-prompt');
    this.promptKey = uiEl('span', 'dv-key', 'E');
    this.promptText = uiEl('span', 'dv-prompt-t');
    this.prompt.append(this.promptKey, this.promptText);

    // --- scan chrome -------------------------------------------------------
    this.scan = uiEl('div', 'dv-scanmode');
    for (const corner of ['tl', 'tr', 'bl', 'br']) {
      this.scan.appendChild(uiEl('i', `dv-corner dv-corner-${corner}`));
    }
    this.crossRing = uiEl('i', 'dv-cross-ring');
    const cross = uiEl('div', 'dv-cross');
    cross.append(
      uiEl('i', 'dv-cross-h'),
      uiEl('i', 'dv-cross-v'),
      this.crossRing,
      uiEl('i', 'dv-cross-dot'),
    );
    const read = uiEl('div', 'dv-scan-read dv-mono');
    const readHead = uiEl('div');
    readHead.append(document.createTextNode('ANALYSIS \u25B8 '), uiEl('b', '', 'ACTIVE'));
    this.scanValue = uiEl('div', '', 'SAMPLING 00%');
    read.append(readHead, uiEl('div', '', 'OPTICAL UNIT \u25B8 NOMINAL'), this.scanValue);
    this.scan.append(cross, read);

    // --- clue --------------------------------------------------------------
    this.clue = uiPanel('dv-clue');
    this.clueLed = uiLed();
    const clueHead = uiEl('div', 'dv-clue-head');
    clueHead.append(this.clueLed, uiEl('span', 'dv-label', 'Evidence'));
    this.clueLabel = uiEl('div', 'dv-clue-label');
    this.clueDetail = uiEl('div', 'dv-clue-detail dv-mono');
    this.clue.append(clueHead, this.clueLabel, this.clueDetail);

    // --- notices -----------------------------------------------------------
    this.notices = uiEl('div', 'dv-notices');

    // --- chapter card ------------------------------------------------------
    this.chapter = uiEl('div', 'dv-chapter');
    this.chapterNum = uiEl('div', 'dv-chapter-num dv-label');
    this.chapterTitle = uiEl('div', 'dv-chapter-title');
    this.chapterRule = uiEl('i', 'dv-chapter-rule');
    this.chapterSub = uiEl('div', 'dv-chapter-sub dv-label');
    const chapterIn = uiEl('div', 'dv-chapter-in');
    chapterIn.append(this.chapterNum, this.chapterTitle, this.chapterRule, this.chapterSub);
    this.chapter.appendChild(chapterIn);

    this.root.append(
      this.objective,
      this.meters,
      this.instab,
      this.scan,
      this.clue,
      this.prompt,
      this.notices,
      this.chapter,
    );
    parent.appendChild(this.root);

    this.objectiveFader = new UIFader(this.clock, this.objective);
    this.metersFader = new UIFader(this.clock, this.meters);
    this.instabFader = new UIFader(this.clock, this.instab);
    this.promptFader = new UIFader(this.clock, this.prompt);
    this.scanFader = new UIFader(this.clock, this.scan);
    this.clueFader = new UIFader(this.clock, this.clue);
    this.chapterFader = new UIFader(this.clock, this.chapter);
  }

  /* --- objective -------------------------------------------------------- */

  setObjective(text: string | null): void {
    if (this.disposed) return;
    if (!text) {
      this.objectiveFader.fade(0.18, () => {
        if (this.objectivePulseOff) {
          this.objectivePulseOff();
          this.objectivePulseOff = null;
        }
      });
      return;
    }
    this.objectiveText.textContent = text;
    if (!this.objectivePulseOff) this.objectivePulseOff = uiRegisterPulse(this.objectiveLed, 2.6);
    this.objectiveFader.reveal({ duration: 0.28, x: -10 });
  }

  /* --- meters ----------------------------------------------------------- */

  setMeters(meters: RelationshipMeter[]): void {
    if (this.disposed) return;
    const list = meters ?? [];
    if (!list.length) {
      this.metersFader.fade(0.18, () => this.clearMeterRows());
      return;
    }

    const key = list.map((m) => m.id).join('|');
    const rebuild = key !== this.meterKey;
    if (rebuild) {
      this.clearMeterRows();
      this.meterKey = key;
      this.meterRows = list.map((meter) => this.buildMeterRow(meter));
      for (const row of this.meterRows) this.meters.appendChild(row.row);
      // The container itself does not animate; its rows do, staggered.
      this.metersFader.reveal({ duration: 0 });
      this.meterRows.forEach((row, i) => {
        uiReveal(this.clock, row.row, { duration: 0.24, x: 10, delay: i * 0.06 });
      });
    } else if (!this.metersFader.visible) {
      this.metersFader.reveal({ duration: 0.2 });
    }

    list.forEach((meter, i) => {
      const row = this.meterRows[i];
      if (row) this.applyMeter(row, meter, !rebuild);
    });
  }

  private buildMeterRow(meter: RelationshipMeter): MeterRow {
    const row = uiEl('div', 'dv-meter');
    const name = uiEl('span', 'dv-meter-name', meter.name);
    const value = uiEl('span', 'dv-mono dv-meter-val', '0');
    const trend = uiEl('i', 'dv-trend dv-trend-flat');
    const head = uiEl('div', 'dv-meter-head');
    head.append(name, value, trend);
    const track = uiEl('div', 'dv-track');
    const fill = uiEl('i', 'dv-fill');
    track.appendChild(fill);
    row.append(head, track);
    row.style.opacity = '0';
    return { id: meter.id, row, name, value, fill, trend, shown: 0, tween: null };
  }

  private applyMeter(row: MeterRow, meter: RelationshipMeter, animate: boolean): void {
    row.name.textContent = meter.name;
    const target = uiClamp(meter.value, 0, 100);
    const trend = meter.trend ?? 0;
    row.trend.className =
      'dv-trend ' + (trend > 0 ? 'dv-trend-up' : trend < 0 ? 'dv-trend-down' : 'dv-trend-flat');

    if (row.tween) {
      row.tween.cancel();
      row.tween = null;
    }
    const from = row.shown;
    row.tween = this.clock.tween(
      uiDur(animate ? 0.42 : 0.6),
      (p) => {
        const v = from + (target - from) * uiEaseOut(p);
        row.shown = v;
        row.fill.style.transform = `scaleX(${(v / 100).toFixed(4)})`;
        row.value.textContent = String(Math.round(v));
      },
      () => {
        row.tween = null;
        row.shown = target;
      },
    );
  }

  private clearMeterRows(): void {
    for (const row of this.meterRows) {
      if (row.tween) row.tween.cancel();
      if (row.row.parentNode) row.row.parentNode.removeChild(row.row);
    }
    this.meterRows = [];
    this.meterKey = '';
  }

  /* --- chapter card ----------------------------------------------------- */

  /** Film title card. Runs about 3.5 seconds and always resolves. */
  showChapterCard(chapter: string, title: string, subtitle?: string): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.settleChapter();
    this.clearChapterTimers();

    this.chapterNum.textContent = chapter;
    this.chapterTitle.textContent = title;
    this.chapterSub.textContent = subtitle ?? '';
    this.chapterSub.style.display = subtitle ? '' : 'none';
    this.chapterRule.style.transform = 'scaleX(0)';

    const promise = new Promise<void>((resolve) => {
      this.resolveChapter = resolve;
    });

    this.chapterFader.reveal({ duration: 0.34 });
    uiReveal(this.clock, this.chapterNum, { duration: 0.36, y: 6, delay: 0.14 });
    uiReveal(this.clock, this.chapterTitle, { duration: 0.42, y: 10, delay: 0.26 });
    this.chapterTimers.push(
      this.clock.after(uiDur(0.5), () => uiGrowRule(this.clock, this.chapterRule, 0.4, '50% 50%')),
    );
    uiReveal(this.clock, this.chapterSub, { duration: 0.36, y: 6, delay: 0.72 });

    // ~3.5s total: 0.34 in, hold, 0.44 out.
    this.chapterTimers.push(
      this.clock.after(hold(3.0), () => {
        this.chapterFader.fade(0.44, () => {
          this.chapterRule.style.transform = 'scaleX(0)';
          this.settleChapter();
        });
        // Belt and braces: the promise resolves even if the fade is interrupted.
        this.chapterTimers.push(this.clock.after(0.5, () => this.settleChapter()));
      }),
    );

    return promise;
  }

  /* --- prompt ----------------------------------------------------------- */

  setPrompt(text: string | null, key?: string, uv?: { x: number; y: number }): void {
    if (this.disposed) return;
    if (!text) {
      this.promptFader.fade(0.16);
      return;
    }
    this.promptText.textContent = text;
    this.promptKey.textContent = (key ?? 'E').toUpperCase();
    this.promptKey.style.display = key === '' ? 'none' : '';

    let base: string;
    if (uv) {
      // World-anchored: UV is full-frame, so it must not be inset by the bars.
      this.prompt.classList.add('dv-anchored');
      this.prompt.style.left = `${(uiClamp01(uv.x) * 100).toFixed(2)}%`;
      this.prompt.style.top = `${(uiClamp01(uv.y) * 100).toFixed(2)}%`;
      base = 'translate(-50%, -50%)';
    } else {
      this.prompt.classList.remove('dv-anchored');
      this.prompt.style.left = '50%';
      this.prompt.style.top = '';
      base = CENTRE_X;
    }
    this.promptFader.reveal({ duration: 0.2, y: 6, base });
  }

  /* --- scan mode -------------------------------------------------------- */

  setScanMode(on: boolean): void {
    if (this.disposed) return;
    if (on) {
      if (!this.scanPulseOff) this.scanPulseOff = uiRegisterPulse(this.crossRing, 1.5);
      if (!this.scanTicker) {
        this.scanTicker = this.clock.onTick((_dt, t) => {
          const pct = Math.floor((t * 37) % 100);
          this.scanValue.textContent = `SAMPLING ${String(pct).padStart(2, '0')}%`;
        });
      }
      this.scanFader.reveal({ duration: 0.26 });
      return;
    }
    this.scanFader.fade(0.2, () => {
      if (this.scanPulseOff) {
        this.scanPulseOff();
        this.scanPulseOff = null;
      }
      if (this.scanTicker) {
        this.scanTicker();
        this.scanTicker = null;
      }
    });
    this.hideClue();
  }

  showClue(label: string, detail: string): void {
    if (this.disposed) return;
    if (this.clueTimer) {
      this.clueTimer.cancel();
      this.clueTimer = null;
    }
    this.clueLabel.textContent = label;
    this.clueDetail.textContent = detail;
    if (!this.cluePulseOff) this.cluePulseOff = uiRegisterPulse(this.clueLed, 1.3);
    this.clueFader.reveal({ duration: 0.26, x: 12 });
    this.clueTimer = this.clock.after(5.5, () => {
      this.clueTimer = null;
      this.hideClue();
    });
  }

  private hideClue(): void {
    if (this.clueTimer) {
      this.clueTimer.cancel();
      this.clueTimer = null;
    }
    this.clueFader.fade(0.2, () => {
      if (this.cluePulseOff) {
        this.cluePulseOff();
        this.cluePulseOff = null;
      }
    });
  }

  /* --- notices ---------------------------------------------------------- */

  flashNotice(text: string, variant: 'neutral' | 'warn' | 'good' = 'neutral'): void {
    if (this.disposed) return;
    // Keep the stack short: the oldest notice steps aside immediately.
    while (this.notices.childElementCount >= 3 && this.notices.firstElementChild) {
      this.notices.removeChild(this.notices.firstElementChild);
    }

    const notice = uiEl('div', `dv-notice${variant === 'neutral' ? '' : ` dv-notice-${variant}`}`);
    const led = uiLed(variant === 'warn' ? 'dv-led-warn' : '');
    notice.append(led, uiEl('span', '', text));
    this.notices.appendChild(notice);

    const pulseOff = uiRegisterPulse(led, variant === 'warn' ? 0.7 : 1.6);
    uiReveal(this.clock, notice, { duration: 0.22, y: -6 });
    this.clock.after(2.4, () => {
      uiFadeOut(this.clock, notice, 0.26, () => {
        pulseOff();
        if (notice.parentNode) notice.parentNode.removeChild(notice);
      });
    });
  }

  /* --- instability ------------------------------------------------------ */

  setInstability(value: number): void {
    if (this.disposed) return;
    const target = uiClamp01(value);
    if (target <= 0.0005 && this.instabShown <= 0.0005) {
      this.instabFader.fade(0.18);
      return;
    }
    if (!this.instabFader.visible) this.instabFader.reveal({ duration: 0.26, y: 8 });

    if (this.instabTween) {
      this.instabTween.cancel();
      this.instabTween = null;
    }
    const from = this.instabShown;
    this.instabTween = this.clock.tween(
      uiDur(0.4),
      (p) => {
        const v = from + (target - from) * uiEaseOut(p);
        this.instabShown = v;
        this.instabFill.style.transform = `scaleX(${v.toFixed(4)})`;
        this.instabValue.textContent = `${Math.round(v * 100)}%`;
        this.instab.classList.toggle('dv-lvl-mid', v > 0.34 && v <= 0.66);
        this.instab.classList.toggle('dv-lvl-hi', v > 0.66);
      },
      () => {
        this.instabTween = null;
        this.instabShown = target;
      },
    );
  }

  /* --- lifecycle -------------------------------------------------------- */

  /**
   * Additive helper (not part of the published contract): clears every readout
   * and settles the chapter card. Used by `UIRoot.clearAll()`.
   */
  clear(): void {
    if (this.disposed) return;
    this.clearChapterTimers();
    this.chapterFader.hideNow();
    this.settleChapter();
    this.setObjective(null);
    this.setMeters([]);
    this.setPrompt(null);
    this.setScanMode(false);
    this.hideClue();
    if (this.instabTween) {
      this.instabTween.cancel();
      this.instabTween = null;
    }
    this.instabShown = 0;
    this.instabFill.style.transform = 'scaleX(0)';
    this.instabValue.textContent = '0%';
    this.instabFader.fade(0.18);
    while (this.notices.firstChild) this.notices.removeChild(this.notices.firstChild);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.settleChapter();
    this.clearChapterTimers();
    this.clearMeterRows();
    if (this.scanPulseOff) this.scanPulseOff();
    if (this.objectivePulseOff) this.objectivePulseOff();
    if (this.cluePulseOff) this.cluePulseOff();
    if (this.scanTicker) this.scanTicker();
    this.scanPulseOff = null;
    this.objectivePulseOff = null;
    this.cluePulseOff = null;
    this.scanTicker = null;
    this.clock.dispose();
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }

  private clearChapterTimers(): void {
    for (const timer of this.chapterTimers) timer.cancel();
    this.chapterTimers = [];
  }

  private settleChapter(): void {
    const resolve = this.resolveChapter;
    this.resolveChapter = null;
    if (resolve) resolve();
  }
}

/** Holds are shortened, not removed, when the player asked for less motion. */
function hold(seconds: number): number {
  return uiDur(seconds) > 0 ? seconds : Math.min(seconds, 0.6);
}
