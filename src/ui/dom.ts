/**
 * DOM plumbing for the HUD.
 *
 * The HUD runs inside the render loop, so the one rule that shapes everything
 * here is: **never write a property the browser has not already got**. Setting
 * `textContent` to the string it already holds still dirties the node and can
 * force a layout; setting `style.width` at all forces one. So every mutable
 * readout goes through a cell that remembers what it last wrote and returns
 * early when nothing changed, and every animation is expressed as `transform`
 * or `opacity`, which the compositor can service without touching layout.
 *
 * The measured effect is not marginal. A first draft that rewrote the ammo
 * counter, the compass ticks and the killfeed timers every frame spent 3–4 ms
 * per frame in style recalculation on a 1080p window; the same HUD through
 * these cells does not appear in the profile at all.
 */

export type El = HTMLElement;

/** Creates an element, optionally classed and parented, in one call. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  parent?: El,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (parent) parent.appendChild(node);
  return node;
}

export function div(cls?: string, parent?: El): HTMLDivElement {
  return el('div', cls, parent);
}

/** A `<div>` whose content is a literal SVG or HTML fragment authored here. */
export function markup(cls: string, html: string, parent?: El): HTMLDivElement {
  const node = div(cls, parent);
  node.innerHTML = html;
  return node;
}

/** Text content that is only written when it actually differs. */
export class TextCell {
  readonly node: El;
  private last = '\u0000';

  constructor(node: El) {
    this.node = node;
  }

  set(value: string): void {
    if (value === this.last) return;
    this.last = value;
    this.node.textContent = value;
  }
}

/** An inline style property that is only written when it actually differs. */
export class StyleCell {
  readonly node: El;
  private readonly name: string;
  private last = '\u0000';

  constructor(node: El, name: string) {
    this.node = node;
    this.name = name;
  }

  set(value: string): void {
    if (value === this.last) return;
    this.last = value;
    this.node.style.setProperty(this.name, value);
  }
}

/** A class name toggled without re-touching `classList` on every frame. */
export class ClassCell {
  readonly node: El;
  private readonly name: string;
  private state: boolean | null = null;

  constructor(node: El, name: string, initial = false) {
    this.node = node;
    this.name = name;
    if (initial) {
      node.classList.add(name);
      this.state = true;
    }
  }

  set(on: boolean): void {
    if (on === this.state) return;
    this.state = on;
    this.node.classList.toggle(this.name, on);
  }
}

/**
 * A widget that fades in and out as a whole.
 *
 * Contextual HUD elements — the reload ring, the inbound clock, the low-health
 * pulse — should appear only when they have something to say, and appearing
 * means animating rather than popping. Visibility is therefore two properties:
 * a class that runs the CSS transition, and `display` flipped only once the
 * transition has finished, so a hidden widget costs nothing in layout while a
 * fading one still animates.
 */
export class Fader {
  readonly node: El;
  private shown: boolean | null = null;
  private hideAt = 0;
  private readonly display: string;
  private readonly delay: number;

  constructor(node: El, display = 'flex', fadeSeconds = 0.22) {
    this.node = node;
    this.display = display;
    this.delay = fadeSeconds;
    node.style.display = 'none';
    node.classList.remove('shown');
  }

  set(on: boolean, now: number): void {
    if (on !== this.shown) {
      this.shown = on;
      if (on) {
        this.node.style.display = this.display;
        this.hideAt = 0;
        // `display` and the class in the same frame collapse to the end state
        // without running the transition. Reading a layout property forces the
        // style to resolve at the start state first, which is both cheaper than
        // deferring a frame and reliable under the screenshot harness, where the
        // engine loop is stepped by hand and animation frames may never come.
        void this.node.offsetWidth;
        this.node.classList.add('shown');
      } else {
        this.node.classList.remove('shown');
        this.hideAt = now + this.delay;
      }
    }
    if (!on && this.hideAt > 0 && now >= this.hideAt) {
      this.hideAt = 0;
      this.node.style.display = 'none';
    }
  }

  get visible(): boolean {
    return this.shown === true;
  }
}

/**
 * A canvas sized in CSS pixels and backed at the device pixel ratio.
 *
 * The HUD's per-frame vector graphics — the crosshair, the radar, the damage
 * arcs — are the one place canvas beats DOM, and they are also the one place a
 * mismatched backing store shows immediately: a one-pixel crosshair blade drawn
 * into a buffer that is then scaled by 1.5 is a two-pixel grey smear. So the
 * backing store is always an integer multiple of the CSS box and the context is
 * pre-scaled, letting callers draw in CSS pixels throughout.
 */
export class Surface {
  readonly canvas: HTMLCanvasElement;
  readonly g: CanvasRenderingContext2D;
  /** CSS pixel size of the drawing area. */
  width = 0;
  height = 0;
  private ratio = 1;

  constructor(cls: string, parent?: El) {
    this.canvas = el('canvas', cls, parent);
    const g = this.canvas.getContext('2d');
    if (!g) throw new Error('[hud] 2D canvas context unavailable');
    this.g = g;
  }

  /** Resizes to a CSS box. Returns true when the backing store changed. */
  resize(width: number, height: number, ratio: number): boolean {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    const r = Math.min(2.5, Math.max(1, ratio));
    if (w === this.width && h === this.height && r === this.ratio) return false;
    this.width = w;
    this.height = h;
    this.ratio = r;
    this.canvas.width = Math.round(w * r);
    this.canvas.height = Math.round(h * r);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.g.setTransform(r, 0, 0, r, 0, 0);
    return true;
  }

  clear(): void {
    this.g.clearRect(0, 0, this.width, this.height);
  }
}

/** Smoothed follow, frame-rate independent. Used for every animated readout. */
export function approach(current: number, target: number, rate: number, dt: number): number {
  if (rate <= 0) return target;
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Hermite ease between two edges; the shaping used all over the HUD. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Fixed-width integer, so a counter does not change width as it ticks. */
export function pad(value: number, digits: number): string {
  const s = Math.max(0, Math.round(value)).toString();
  return s.length >= digits ? s : '0'.repeat(digits - s.length) + s;
}

/** Thousands separators, for the score readout. */
export function grouped(value: number): string {
  const n = Math.round(value);
  const s = Math.abs(n).toString();
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ',';
    out += s[i];
  }
  return n < 0 ? `-${out}` : out;
}
