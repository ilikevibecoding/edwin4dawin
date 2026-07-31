/**
 * Centre-screen callouts and corner toasts.
 *
 * An announcement is the loudest thing the HUD can do, so it is rationed: one at
 * a time, a slam-in with a letter-spacing flourish and a single scanline sweep,
 * then it leaves. Toasts are the quiet channel — weapon pickups, fire-mode
 * changes, streaks earned — and stack up to four deep.
 */
import { div, restartAnimation, setClass, setText, span } from '../Dom';
import { TIMING } from '../Theme';

interface Toast {
  node: HTMLDivElement;
  expires: number;
  removeAt: number;
}

const MAX_TOASTS = 4;
const EXIT_MS = 320;

export class Announce {
  readonly root: HTMLDivElement;
  readonly toastRoot: HTMLDivElement;

  private readonly mainEl: HTMLElement;
  private readonly subEl: HTMLElement;
  private readonly toasts: Toast[] = [];
  private hideAt = -1;
  private visible = false;

  constructor(parent: HTMLElement, toastParent: HTMLElement) {
    this.root = div('ob-ann', parent);
    this.mainEl = div('ob-ann-main', this.root);
    div('ob-ann-rule', this.root);
    this.subEl = div('ob-ann-sub', this.root);
    div('ob-ann-sweep', this.root);
    this.toastRoot = div('ob-toasts', toastParent);
  }

  announce(text: string, sub: string | undefined, duration: number, now: number, warn = false): void {
    setText(this.mainEl, text.toUpperCase());
    setText(this.subEl, (sub ?? '').toUpperCase());
    setClass(this.subEl, 'empty', !sub);
    setClass(this.root, 'warn', warn);
    this.root.classList.remove('hide');
    restartAnimation(this.root, 'show');
    this.hideAt = now + Math.max(0.4, duration);
    this.visible = true;
  }

  notify(text: string, sub: string | undefined, kind: 'info' | 'warn' | 'reward', now: number): void {
    const node = div(`ob-toast ${kind}`);
    span('ob-toast-main', node, text.toUpperCase());
    if (sub) span('ob-toast-sub', node, sub.toUpperCase());
    this.toastRoot.appendChild(node);
    this.toasts.push({
      node,
      expires: now + TIMING.toastLife,
      removeAt: Number.POSITIVE_INFINITY,
    });
    while (this.toasts.length > MAX_TOASTS) {
      const oldest = this.toasts.shift();
      oldest?.node.remove();
    }
  }

  update(now: number): void {
    if (this.visible && this.hideAt > 0 && now >= this.hideAt) {
      this.hideAt = -1;
      this.visible = false;
      this.root.classList.remove('show');
      restartAnimation(this.root, 'hide');
    }
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const toast = this.toasts[i];
      if (now >= toast.removeAt) {
        toast.node.remove();
        this.toasts.splice(i, 1);
        continue;
      }
      if (now >= toast.expires && !Number.isFinite(toast.removeAt)) {
        toast.node.classList.add('out');
        toast.removeAt = now + EXIT_MS / 1000;
      }
    }
  }

  clear(): void {
    this.root.classList.remove('show', 'hide');
    this.visible = false;
    this.hideAt = -1;
    for (const toast of this.toasts) toast.node.remove();
    this.toasts.length = 0;
  }
}
