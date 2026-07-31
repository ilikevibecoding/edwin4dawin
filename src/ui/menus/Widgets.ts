/**
 * Menu building blocks.
 *
 * Every control is the same shape: a labelled row, a control on the right, and a
 * `refresh()` the owning screen calls when the underlying value may have moved
 * (a preset change resets a dozen toggles at once, so the controls read back
 * from the model rather than holding their own copy of the truth).
 */
import { div, el, setClass, setStyle, setText, span } from '../Dom';

export interface Control {
  readonly row: HTMLDivElement;
  refresh(): void;
}

/** Every menu card, bracketed so the menus read in the HUD's own language. */
export function panel(parent: HTMLElement, className = ''): HTMLDivElement {
  return div(`ob-card brackets ${className}`.trim(), parent);
}

export function heading(parent: HTMLElement, text: string, sub?: string): HTMLDivElement {
  const head = div('ob-menu-head', parent);
  const title = el('h2', 'ob-h2', head);
  setText(title, text);
  if (sub) span('lbl', head, sub);
  return head;
}

export function rule(parent: HTMLElement): HTMLDivElement {
  return div('ob-hr', parent);
}

export function button(
  parent: HTMLElement,
  label: string,
  onClick: () => void,
  opts: { hint?: string; className?: string } = {},
): HTMLButtonElement {
  const node = el('button', `ob-btn ${opts.className ?? ''}`.trim(), parent);
  node.type = 'button';
  span(undefined, node, label);
  if (opts.hint) {
    const hint = el('i', undefined, node);
    setText(hint, opts.hint);
  }
  node.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });
  return node;
}

function makeRow(parent: HTMLElement, name: string, hint?: string): {
  row: HTMLDivElement;
  ctl: HTMLDivElement;
} {
  const row = div('ob-row', parent);
  const label = div('ob-row-label', row);
  span('ob-row-name', label, name);
  if (hint) span('ob-row-hint', label, hint);
  const ctl = div('ob-row-ctl', row);
  return { row, ctl };
}

/** A labelled on/off switch. */
export function toggleRow(
  parent: HTMLElement,
  name: string,
  hint: string | undefined,
  get: () => boolean,
  set: (value: boolean) => void,
): Control {
  const { row, ctl } = makeRow(parent, name, hint);
  const sw = el('button', 'ob-sw', ctl);
  sw.type = 'button';
  el('i', undefined, sw);
  const refresh = (): void => setClass(sw, 'on', get());
  sw.addEventListener('click', (event) => {
    event.stopPropagation();
    set(!get());
    refresh();
  });
  refresh();
  return { row, refresh };
}

/** A segmented picker; the natural control for three or four named choices. */
export function segmentRow<T extends string>(
  parent: HTMLElement,
  name: string,
  hint: string | undefined,
  options: ReadonlyArray<{ value: T; label: string }>,
  get: () => T,
  set: (value: T) => void,
): Control {
  const { row, ctl } = makeRow(parent, name, hint);
  const group = div('ob-seg', ctl);
  const buttons: Array<{ node: HTMLButtonElement; value: T }> = [];
  for (const option of options) {
    const node = el('button', undefined, group);
    node.type = 'button';
    setText(node, option.label);
    node.addEventListener('click', (event) => {
      event.stopPropagation();
      set(option.value);
      refresh();
    });
    buttons.push({ node, value: option.value });
  }
  function refresh(): void {
    const current = get();
    for (const entry of buttons) setClass(entry.node, 'on', entry.value === current);
  }
  refresh();
  return { row, refresh };
}

export interface SliderOptions {
  min: number;
  max: number;
  step: number;
  /** Rendered value, e.g. `85%` or `1.20`. */
  format(value: number): string;
}

export function sliderRow(
  parent: HTMLElement,
  name: string,
  hint: string | undefined,
  opts: SliderOptions,
  get: () => number,
  set: (value: number) => void,
): Control {
  const { row, ctl } = makeRow(parent, name, hint);
  const wrap = div('ob-sl', ctl);
  const input = el('input', undefined, wrap);
  input.type = 'range';
  input.min = String(opts.min);
  input.max = String(opts.max);
  input.step = String(opts.step);
  const value = span('ob-sl-val', wrap, '');

  const paint = (v: number): void => {
    const t = (v - opts.min) / (opts.max - opts.min || 1);
    // The filled portion of the track is a gradient stop driven by a custom
    // property, so dragging never touches layout.
    setStyle(wrap, '--p', t.toFixed(4));
    setText(value, opts.format(v));
  };
  const onInput = (): void => {
    const v = Number.parseFloat(input.value);
    if (!Number.isFinite(v)) return;
    set(v);
    paint(v);
  };
  input.addEventListener('input', onInput);
  input.addEventListener('click', (event) => event.stopPropagation());

  const refresh = (): void => {
    const v = get();
    input.value = String(v);
    paint(v);
  };
  refresh();
  return { row, refresh };
}

/** A row whose control is a button that captures the next key or mouse press. */
export function bindRow(
  parent: HTMLElement,
  name: string,
  label: () => string,
  onCapture: (listening: boolean) => void,
): { row: HTMLDivElement; node: HTMLButtonElement; refresh(): void } {
  const { row, ctl } = makeRow(parent, name, undefined);
  const node = el('button', 'ob-bind', ctl);
  node.type = 'button';
  const refresh = (): void => setText(node, label());
  node.addEventListener('click', (event) => {
    event.stopPropagation();
    onCapture(true);
  });
  refresh();
  return { row, node, refresh };
}

/** Tab strip; returns a `select` so the owner can drive it programmatically. */
export function tabs(
  parent: HTMLElement,
  entries: ReadonlyArray<{ id: string; label: string }>,
  onSelect: (id: string) => void,
): { root: HTMLDivElement; select(id: string): void } {
  const root = div('ob-tabs', parent);
  const buttons = new Map<string, HTMLButtonElement>();
  const select = (id: string): void => {
    for (const [key, node] of buttons) setClass(node, 'on', key === id);
    onSelect(id);
  };
  for (const entry of entries) {
    const node = el('button', 'ob-tab', root);
    node.type = 'button';
    setText(node, entry.label);
    node.addEventListener('click', (event) => {
      event.stopPropagation();
      select(entry.id);
    });
    buttons.set(entry.id, node);
  }
  return { root, select };
}

export const percent = (v: number): string => `${Math.round(v * 100)}%`;
export const fixed = (digits: number) => (v: number): string => v.toFixed(digits);
export const degrees = (v: number): string => `${Math.round(v)}°`;
