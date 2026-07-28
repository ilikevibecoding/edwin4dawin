import { clamp01, div, el, StyleCell, TextCell } from '../dom';

/**
 * Menu controls.
 *
 * Four widgets cover every setting in the game, and they are all built the same
 * way: a label on the left, a value on the right, and a hit target that spans
 * the row. That last part is the whole point — a menu navigated with a mouse at
 * arm's length, or with a stick, needs targets measured in centimetres, not the
 * eight-pixel thumb a web slider ships with.
 *
 * Everything that can be driven by the keyboard is, because a shooter's options
 * screen is opened mid-match with a hand already on WASD.
 */

export type Cleanup = () => void;

/* -------------------------------- button -------------------------------- */

export interface ButtonOpts {
  label: string;
  hint?: string;
  kind?: 'primary' | 'normal' | 'quiet' | 'danger';
  onClick(): void;
}

export function button(parent: HTMLElement, opts: ButtonOpts): HTMLElement {
  const node = el('button', `mbtn interactive ${opts.kind ?? 'normal'}`, parent);
  node.type = 'button';
  div('mbtn-edge', node);
  const body = div('mbtn-body', node);
  el('span', 'mbtn-label', body).textContent = opts.label;
  if (opts.hint) el('span', 'mbtn-hint', body).textContent = opts.hint;
  div('mbtn-chev', node).innerHTML =
    '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 1.5 8.5 6l-5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg>';
  node.addEventListener('click', (e) => {
    e.stopPropagation();
    opts.onClick();
  });
  return node;
}

/* --------------------------------- row ---------------------------------- */

function row(parent: HTMLElement, label: string, hint?: string): HTMLElement {
  const node = div('mrow interactive', parent);
  const text = div('mrow-text', node);
  el('span', 'mrow-label', text).textContent = label;
  if (hint) el('span', 'mrow-hint', text).textContent = hint;
  return node;
}

/* ------------------------------- options -------------------------------- */

/**
 * A left/right cycler. Preferred over a dropdown for anything with fewer than
 * about six choices: no popup layer, no focus trap, and it works identically
 * with a mouse, the arrow keys and a gamepad d-pad.
 */
export class OptionRow {
  readonly node: HTMLElement;
  private readonly value: TextCell;
  private readonly dots: HTMLElement[] = [];
  private index: number;

  constructor(
    parent: HTMLElement,
    label: string,
    private readonly choices: readonly string[],
    index: number,
    private readonly onChange: (index: number, value: string) => void,
    hint?: string,
  ) {
    this.index = index;
    this.node = row(parent, label, hint);
    this.node.classList.add('mrow-option');
    const control = div('mrow-control', this.node);

    arrow(control, 'left', () => this.step(-1));
    this.value = new TextCell(el('span', 'mrow-value', control));
    arrow(control, 'right', () => this.step(1));

    const rail = div('mrow-dots', this.node);
    for (let i = 0; i < choices.length; i++) this.dots.push(div('mrow-dot', rail));

    this.node.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.step(-1);
      else if (e.key === 'ArrowRight') this.step(1);
      else return;
      e.preventDefault();
    });
    this.node.tabIndex = 0;
    this.paint();
  }

  private step(dir: number): void {
    const n = this.choices.length;
    this.index = (this.index + dir + n) % n;
    this.paint();
    this.onChange(this.index, this.choices[this.index]);
  }

  set(index: number): void {
    this.index = Math.max(0, Math.min(this.choices.length - 1, index));
    this.paint();
  }

  private paint(): void {
    this.value.set(this.choices[this.index] ?? '—');
    for (let i = 0; i < this.dots.length; i++) {
      this.dots[i].classList.toggle('on', i <= this.index);
    }
  }
}

function arrow(parent: HTMLElement, side: 'left' | 'right', onClick: () => void): void {
  const node = el('button', `mrow-arrow interactive ${side}`, parent);
  node.type = 'button';
  node.innerHTML =
    '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M6.5 1 2.5 5l4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>';
  node.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
}

/* -------------------------------- slider -------------------------------- */

export class SliderRow {
  readonly node: HTMLElement;
  private readonly fill: StyleCell;
  private readonly knob: StyleCell;
  private readonly readout: TextCell;
  private readonly track: HTMLElement;
  private value: number;
  private dragging = false;
  private readonly cleanups: Cleanup[] = [];

  constructor(
    parent: HTMLElement,
    label: string,
    private readonly min: number,
    private readonly max: number,
    private readonly step: number,
    value: number,
    private readonly format: (v: number) => string,
    private readonly onChange: (v: number) => void,
    hint?: string,
  ) {
    this.value = value;
    this.node = row(parent, label, hint);
    this.node.classList.add('mrow-slider');
    const control = div('mrow-control', this.node);
    this.readout = new TextCell(el('span', 'mrow-value', control));

    this.track = div('mslider interactive', this.node);
    const bed = div('mslider-bed', this.track);
    this.fill = new StyleCell(div('mslider-fill', bed), 'transform');
    this.knob = new StyleCell(div('mslider-knob', this.track), 'left');

    const seek = (clientX: number) => {
      // The only layout read in the whole menu, and it happens on a drag rather
      // than on a frame, which is the distinction that matters.
      const box = this.track.getBoundingClientRect();
      if (box.width <= 0) return;
      this.apply(this.min + ((clientX - box.left) / box.width) * (this.max - this.min), true);
    };

    const onDown = (e: PointerEvent) => {
      this.dragging = true;
      this.track.setPointerCapture?.(e.pointerId);
      seek(e.clientX);
      e.stopPropagation();
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (this.dragging) seek(e.clientX);
    };
    const onUp = (e: PointerEvent) => {
      this.dragging = false;
      this.track.releasePointerCapture?.(e.pointerId);
    };
    this.track.addEventListener('pointerdown', onDown);
    this.track.addEventListener('pointermove', onMove);
    this.track.addEventListener('pointerup', onUp);
    this.track.addEventListener('pointercancel', onUp);
    this.cleanups.push(() => {
      this.track.removeEventListener('pointerdown', onDown);
      this.track.removeEventListener('pointermove', onMove);
      this.track.removeEventListener('pointerup', onUp);
      this.track.removeEventListener('pointercancel', onUp);
    });

    this.node.tabIndex = 0;
    this.node.addEventListener('keydown', (e) => {
      const dir = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      if (!dir) return;
      e.preventDefault();
      this.apply(this.value + dir * this.step, true);
    });

    this.paint();
  }

  private apply(raw: number, notify: boolean): void {
    const snapped =
      Math.round(Math.max(this.min, Math.min(this.max, raw)) / this.step) * this.step;
    // Floating-point steps such as 0.05 accumulate visible error otherwise.
    const next = Number(snapped.toFixed(4));
    if (next === this.value) return;
    this.value = next;
    this.paint();
    if (notify) this.onChange(next);
  }

  set(value: number): void {
    this.apply(value, false);
  }

  private paint(): void {
    const t = clamp01((this.value - this.min) / (this.max - this.min));
    this.readout.set(this.format(this.value));
    this.fill.set(`scaleX(${t.toFixed(4)})`);
    this.knob.set(`${(t * 100).toFixed(2)}%`);
  }

  dispose(): void {
    for (const fn of this.cleanups) fn();
    this.cleanups.length = 0;
  }
}

/* -------------------------------- toggle -------------------------------- */

export class ToggleRow {
  readonly node: HTMLElement;
  private on: boolean;
  private readonly value: TextCell;
  private readonly sw: HTMLElement;

  constructor(
    parent: HTMLElement,
    label: string,
    on: boolean,
    private readonly onChange: (on: boolean) => void,
    hint?: string,
  ) {
    this.on = on;
    this.node = row(parent, label, hint);
    this.node.classList.add('mrow-toggle');
    const control = div('mrow-control', this.node);
    this.value = new TextCell(el('span', 'mrow-value', control));
    this.sw = div('mswitch', control);
    div('mswitch-thumb', this.sw);

    this.node.tabIndex = 0;
    this.node.addEventListener('click', (e) => {
      e.stopPropagation();
      this.flip();
    });
    this.node.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      this.flip();
    });
    this.paint();
  }

  private flip(): void {
    this.on = !this.on;
    this.paint();
    this.onChange(this.on);
  }

  set(on: boolean): void {
    if (on === this.on) return;
    this.on = on;
    this.paint();
  }

  private paint(): void {
    this.value.set(this.on ? 'ON' : 'OFF');
    this.sw.classList.toggle('on', this.on);
    this.node.classList.toggle('is-on', this.on);
  }
}

/* -------------------------------- layout -------------------------------- */

/** A titled block of rows. Used for every group on the settings screen. */
export function group(parent: HTMLElement, title: string): HTMLElement {
  const node = div('mgroup', parent);
  el('span', 'mgroup-title', node).textContent = title;
  return div('mgroup-rows', node);
}

/** A screen header: a rule, an index number, a title and a back affordance. */
export function header(parent: HTMLElement, index: string, title: string): HTMLElement {
  const node = div('mhead', parent);
  el('span', 'mhead-index', node).textContent = index;
  el('span', 'mhead-title', node).textContent = title;
  div('mhead-rule', node);
  return node;
}

/** A horizontal 0..1 statistic bar, for the loadout screen. */
export class StatBar {
  private readonly fill: StyleCell;
  private readonly value: TextCell;

  constructor(parent: HTMLElement, label: string) {
    const node = div('mstat', parent);
    el('span', 'mstat-label', node).textContent = label;
    const track = div('mstat-track', node);
    this.fill = new StyleCell(div('mstat-fill', track), 'transform');
    this.value = new TextCell(el('span', 'mstat-value', node));
  }

  set(fraction: number, text: string): void {
    this.fill.set(`scaleX(${clamp01(fraction).toFixed(3)})`);
    this.value.set(text);
  }
}
