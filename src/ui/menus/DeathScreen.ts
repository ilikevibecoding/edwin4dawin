/**
 * The death screen.
 *
 * Answers the only question that matters after dying — who killed you and with
 * what — and then gets out of the way. The countdown runs on the same unscaled
 * clock as the rest of the HUD, and the bar is a transform on one element rather
 * than an animated width.
 */
import { div, markup, setClass, setStyle, setText } from '../Dom';
import { headshotIcon, weaponIcon } from '../Icons';
import type { UiSound } from '../Sound';

export class DeathScreen {
  readonly root: HTMLDivElement;

  private readonly killerEl: HTMLDivElement;
  private readonly iconEl: HTMLDivElement;
  private readonly headshotEl: HTMLDivElement;
  private readonly timerEl: HTMLDivElement;
  private readonly barFill: HTMLElement;

  private open = false;
  private ready = false;
  private startedAt = 0;
  private duration = 3.2;
  private lastSeconds = -1;
  private lastFill = -1;
  private lastWeapon = 'bullet';

  constructor(parent: HTMLElement, private readonly sound: UiSound) {
    this.root = div('ob-death', parent);

    const headline = div('ob-death-kia', this.root);
    setText(headline, 'You were killed');

    const by = div('ob-death-by', this.root);
    this.killerEl = div('ob-death-killer', by);
    this.iconEl = markup('ob-death-icon', weaponIcon('bullet'), by);
    this.headshotEl = markup('ob-death-hs', headshotIcon(), by);

    this.timerEl = div('ob-death-timer', this.root);
    const bar = div('ob-death-bar', this.root);
    this.barFill = div(undefined, bar);
    const prompt = div('ob-death-prompt', this.root);
    setText(prompt, 'Redeploying');
  }

  show(duration: number, now: number): void {
    this.open = true;
    this.ready = false;
    this.startedAt = now;
    this.duration = Math.max(0.4, duration);
    this.lastSeconds = -1;
    this.lastFill = -1;
    setClass(this.root, 'open', true);
    setClass(this.root, 'ready', false);
    this.setKiller('', '', false);
  }

  /** Filled in from the killfeed, which lands a moment after the death event. */
  setKiller(name: string, weaponId: string, headshot: boolean): void {
    setText(this.killerEl, name ? name.toUpperCase() : 'Unknown contact');
    setStyle(this.iconEl, 'opacity', weaponId ? '1' : '0.3');
    setStyle(this.headshotEl, 'display', headshot ? 'block' : 'none');
    const key = weaponId || 'bullet';
    if (key !== this.lastWeapon) {
      this.lastWeapon = key;
      this.iconEl.innerHTML = weaponIcon(key);
    }
  }

  update(now: number): void {
    if (!this.open) return;
    const remaining = Math.max(0, this.duration - (now - this.startedAt));

    const seconds = Math.ceil(remaining);
    if (seconds !== this.lastSeconds) {
      const first = this.lastSeconds < 0;
      this.lastSeconds = seconds;
      setText(this.timerEl, seconds > 0 ? `Respawn in ${seconds}` : 'Standby');
      if (!first && seconds >= 0) this.sound.play(seconds === 0 ? 'countdownFinal' : 'countdown');
    }

    // Quantised to a sixtieth: the bar is 34 units wide, so finer steps write a
    // style property that cannot change a pixel.
    const fill = Math.round((1 - remaining / this.duration) * 60) / 60;
    if (fill !== this.lastFill) {
      this.lastFill = fill;
      setStyle(this.barFill, '--p', fill.toFixed(3));
    }

    if (!this.ready && remaining <= 0) {
      this.ready = true;
      setClass(this.root, 'ready', true);
    }
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.ready = false;
    setClass(this.root, 'open', false);
    setClass(this.root, 'ready', false);
  }

  get isOpen(): boolean {
    return this.open;
  }
}
