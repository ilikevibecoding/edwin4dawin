/**
 * Subtitles and the location slate.
 *
 * The line is anchored to the lower third and typed out on the UI clock. The
 * whole string is always present in the DOM with the un-typed tail rendered
 * transparent, so revealing a character can never reflow the block.
 */
import {
  UIClock,
  UIFader,
  uiClamp,
  uiDur,
  uiEl,
  uiLed,
  uiRegisterPulse,
  uiReveal,
  type UIHandle,
} from './UIRoot';

export interface DialogueLineOptions {
  speaker: string;
  text: string;
  color?: string;
  android?: boolean;
  /**
   * Seconds the line stays on screen before it hides itself. The promise still
   * resolves when the typewriter finishes; this only schedules the auto-hide.
   */
  duration?: number;
  typewriter?: boolean;
}

const CENTRE = 'translateX(-50%)';

export class DialogueUI {
  private readonly root: HTMLElement;
  private readonly clock = new UIClock();

  private readonly slate: HTMLElement;
  private readonly slateText: HTMLElement;
  private readonly slateFader: UIFader;
  private readonly block: HTMLElement;
  private readonly blockFader: UIFader;
  private readonly nameRow: HTMLElement;
  private readonly nameText: HTMLElement;
  private readonly led: HTMLElement;
  private readonly typed: HTMLElement;
  private readonly rest: HTMLElement;

  private resolveLine: (() => void) | null = null;
  private typeTween: UIHandle | null = null;
  private autoHide: UIHandle | null = null;
  private ledPulseOff: (() => void) | null = null;
  private slatePulseOff: (() => void) | null = null;
  private fullText = '';
  private disposed = false;

  constructor(parent: HTMLElement) {
    this.root = uiEl('div', 'dv-c dv-c-dlg');

    this.slate = uiEl('div', 'dv-slate');
    this.slateText = uiEl('span', 'dv-slate-t');
    this.slate.append(uiEl('i', 'dv-slate-tick'), this.slateText, uiEl('i', 'dv-slate-tick'));
    this.slate.style.transform = CENTRE;

    this.block = uiEl('div', 'dv-dlg');
    this.nameRow = uiEl('div', 'dv-dlg-name');
    this.led = uiLed();
    this.nameText = uiEl('span');
    this.nameRow.append(this.led, this.nameText);

    const body = uiEl('div', 'dv-dlg-body');
    const line = uiEl('span', 'dv-dlg-line');
    this.typed = uiEl('span', 'dv-dlg-typed');
    this.rest = uiEl('span', 'dv-dlg-rest');
    line.append(this.typed, this.rest);
    body.appendChild(line);

    this.block.append(this.nameRow, body);
    this.block.style.transform = CENTRE;

    this.root.append(this.slate, this.block);
    parent.appendChild(this.root);

    this.slateFader = new UIFader(this.clock, this.slate);
    this.blockFader = new UIFader(this.clock, this.block);
  }

  /** Resolves once the typewriter has finished (or the line is skipped/hidden). */
  show(opts: DialogueLineOptions): Promise<void> {
    if (this.disposed) return Promise.resolve();

    // A new line always supersedes the previous one.
    this.settle();
    this.stopTimers();

    this.fullText = opts.text ?? '';
    this.nameText.textContent = (opts.speaker ?? '').toUpperCase();
    this.nameText.style.color = opts.color ?? '';
    this.revealChars(0);

    const android = opts.android === true;
    this.led.style.display = android ? '' : 'none';
    if (android && !this.ledPulseOff) this.ledPulseOff = uiRegisterPulse(this.led, 1.6);
    if (!android && this.ledPulseOff) {
      this.ledPulseOff();
      this.ledPulseOff = null;
    }

    this.blockFader.reveal({ duration: 0.22, y: 8, base: CENTRE });
    uiReveal(this.clock, this.nameRow, { duration: 0.2, y: 4 });

    const chars = this.fullText.length;
    // How long the line takes to read. Reduced motion drops the typing
    // animation but keeps this timing, so the pacing of a scene survives it.
    let readTime: number;
    if (opts.typewriter === false) readTime = 0;
    else if (opts.duration && opts.duration > 0) readTime = Math.min(opts.duration * 0.55, chars / 28);
    else readTime = uiClamp(chars / 42, 0.28, 2.4);
    const typeDur = chars > 0 ? uiDur(readTime) : 0;

    const promise = new Promise<void>((resolve) => {
      this.resolveLine = resolve;
    });

    if (typeDur <= 0) {
      this.revealChars(chars);
      this.typeTween = this.clock.after(readTime, () => {
        this.typeTween = null;
        this.settle();
      });
    } else {
      let shown = -1;
      this.typeTween = this.clock.tween(
        typeDur,
        (p) => {
          const n = Math.round(p * chars);
          if (n !== shown) {
            shown = n;
            this.revealChars(n);
          }
        },
        () => {
          this.typeTween = null;
          this.revealChars(chars);
          this.settle();
        },
      );
    }

    if (opts.duration && opts.duration > 0) {
      this.autoHide = this.clock.after(opts.duration, () => {
        this.autoHide = null;
        this.hide();
      });
    }

    return promise;
  }

  /** Completes the current line immediately. */
  skip(): void {
    if (this.disposed) return;
    if (this.typeTween) {
      this.typeTween.cancel();
      this.typeTween = null;
    }
    this.revealChars(this.fullText.length);
    this.settle();
  }

  hide(): void {
    if (this.disposed) return;
    this.stopTimers();
    this.settle();
    this.blockFader.fade(0.18, () => {
      if (this.ledPulseOff) {
        this.ledPulseOff();
        this.ledPulseOff = null;
      }
    });
  }

  /** The location / time card, e.g. "FERNDALE — 23:41". */
  setSlate(text: string | null): void {
    if (this.disposed) return;
    if (!text) {
      this.slateFader.fade(0.2, () => {
        if (this.slatePulseOff) {
          this.slatePulseOff();
          this.slatePulseOff = null;
        }
      });
      return;
    }
    this.slateText.textContent = text;
    if (!this.slatePulseOff) this.slatePulseOff = uiRegisterPulse(this.slate, 4.2, 0.25);
    this.slateFader.reveal({ duration: 0.3, y: -6, base: CENTRE });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopTimers();
    this.settle();
    if (this.ledPulseOff) this.ledPulseOff();
    if (this.slatePulseOff) this.slatePulseOff();
    this.ledPulseOff = null;
    this.slatePulseOff = null;
    this.clock.dispose();
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }

  private revealChars(n: number): void {
    const count = n < 0 ? 0 : n > this.fullText.length ? this.fullText.length : n;
    this.typed.textContent = this.fullText.slice(0, count);
    this.rest.textContent = this.fullText.slice(count);
  }

  private stopTimers(): void {
    if (this.typeTween) {
      this.typeTween.cancel();
      this.typeTween = null;
    }
    if (this.autoHide) {
      this.autoHide.cancel();
      this.autoHide = null;
    }
  }

  private settle(): void {
    const resolve = this.resolveLine;
    this.resolveLine = null;
    if (resolve) resolve();
  }
}
