/**
 * DOM plumbing shared by every widget.
 *
 * Two rules run through all of it. Text and styles are written through the
 * cached setters so a value that has not changed costs a string compare instead
 * of a DOM mutation, and canvas layers keep their CSS size and their backing
 * store separate so drawing happens in device pixels while layout stays in CSS
 * pixels — that is what makes a 1 px stroke land on exactly one pixel at any
 * device pixel ratio.
 */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  parent?: Element | null,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (parent) parent.appendChild(node);
  return node;
}

export function div(className?: string, parent?: Element | null): HTMLDivElement {
  return el('div', className, parent);
}

export function span(className?: string, parent?: Element | null, text?: string): HTMLSpanElement {
  const node = el('span', className, parent);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Static markup, used for the generated SVG icons. Never fed user input. */
export function markup(className: string, html: string, parent?: Element | null): HTMLDivElement {
  const node = div(className, parent);
  node.innerHTML = html;
  return node;
}

interface CachedText extends HTMLElement {
  __t?: string;
}

/** Write `textContent` only when it actually differs. */
export function setText(node: HTMLElement | null | undefined, value: string): void {
  if (!node) return;
  const cached = node as CachedText;
  if (cached.__t === value) return;
  cached.__t = value;
  node.textContent = value;
}

interface CachedStyles extends HTMLElement {
  __s?: Record<string, string>;
}

/** Write a style property only when it differs from the last write. */
export function setStyle(node: HTMLElement | null | undefined, prop: string, value: string): void {
  if (!node) return;
  const cached = node as CachedStyles;
  const store = cached.__s ?? (cached.__s = {});
  if (store[prop] === value) return;
  store[prop] = value;
  // setProperty rather than an indexed assignment, so custom properties and
  // ordinary ones go down the same path.
  node.style.setProperty(prop, value);
}

/** Numeric custom property, rounded to `decimals` so noise does not thrash. */
export function setVar(
  node: HTMLElement | null | undefined,
  prop: string,
  value: number,
  decimals = 3,
): void {
  setStyle(node, prop, value.toFixed(decimals));
}

export function setClass(node: HTMLElement | null | undefined, name: string, on: boolean): void {
  if (!node) return;
  if (node.classList.contains(name) === on) return;
  node.classList.toggle(name, on);
}

/**
 * A canvas sub-layer.
 *
 * `measure()` is the only thing that reads layout, and it is called from resize
 * handling rather than from the frame, so the per-frame path is pure writes.
 */
export class CanvasLayer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** CSS pixel size of the element. */
  width = 1;
  height = 1;
  dpr = 1;

  constructor(className: string, parent: Element | null, alpha = true) {
    this.canvas = el('canvas', className, parent);
    const ctx = this.canvas.getContext('2d', { alpha, desynchronized: true });
    if (!ctx) throw new Error('[ui] 2D canvas context unavailable');
    this.ctx = ctx;
  }

  /**
   * Re-read the element's CSS box and rebuild the backing store.
   * Returns true when the size changed, so callers can invalidate their cache.
   */
  measure(maxDpr = 2): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === this.width && h === this.height && dpr === this.dpr) return false;
    this.width = w;
    this.height = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    return true;
  }

  /** Clear and reset the transform to CSS pixels with a half-pixel crispener. */
  begin(): CanvasRenderingContext2D {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    return ctx;
  }

  clear(): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  dispose(): void {
    this.canvas.remove();
  }
}

/** True when the user has asked the platform for less motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Restart a CSS animation on an element that may already be mid-animation.
 *
 * The usual idiom — remove the class, read `offsetWidth`, add it back — costs a
 * synchronous reflow of the whole document, and with several full-screen
 * backdrop-filters live that measured as the single worst frame in the HUD. So
 * the class is only added when it is absent (no restart needed, no reflow), and
 * an already-running animation is rewound through the animation object instead.
 */
export function restartAnimation(node: HTMLElement, className: string): void {
  if (!node.classList.contains(className)) {
    node.classList.add(className);
    return;
  }
  const running = node.getAnimations?.();
  if (running && running.length > 0) {
    for (const anim of running) {
      anim.cancel();
      anim.play();
    }
    return;
  }
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}
