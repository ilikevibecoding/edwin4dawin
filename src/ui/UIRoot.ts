/**
 * DEVIANT — UI layer root.
 *
 * Everything the player reads lives in the DOM, over the 3D canvas, as a
 * diegetic overlay. This module owns three things:
 *
 *  1. `UIClock` — the only source of time in the UI. The game is captured
 *     offline frame by frame, so UI motion must be able to run on the world's
 *     clock instead of `requestAnimationFrame`. `uiSetExternalDrive(true)`
 *     stops every clock from scheduling frames; `uiPumpClocks(dt)` then steps
 *     them by hand.
 *  2. A single exclusive keyboard capture stack, so only the front-most modal
 *     component ever sees a key event and nothing can leak a listener.
 *  3. Small DOM/animation helpers shared by the components.
 */
import './ui.css';

import { ChoiceWheel } from './ChoiceWheel';
import { DialogueUI } from './DialogueUI';
import { FlowchartUI } from './FlowchartUI';
import { HUD } from './HUD';
import { MenuUI } from './MenuUI';
import { QTEUI } from './QTEUI';
import { StatsCard } from './StatsCard';

/* ==========================================================================
   Clock
   ========================================================================== */

export type UITickFn = (dt: number, elapsed: number) => void;

export interface UIHandle {
  cancel(): void;
}

const NOOP_HANDLE: UIHandle = { cancel() {} };

interface UITimer {
  due: number;
  fn: () => void;
  alive: boolean;
}

/** Live clocks, so external drive can reach every one of them. */
const liveClocks = new Set<UIClock>();
let externalDrive = false;

/**
 * Detaches the whole UI from `requestAnimationFrame`. Used by the offline
 * capture harness, which advances the world (and therefore the UI) by hand.
 */
export function uiSetExternalDrive(on: boolean): void {
  if (externalDrive === on) return;
  externalDrive = on;
  for (const clock of Array.from(liveClocks)) clock.syncDrive();
}

export function uiIsExternallyDriven(): boolean {
  return externalDrive;
}

/** Steps every live clock. Only meaningful while external drive is on. */
export function uiPumpClocks(dt: number): void {
  if (!(dt > 0)) return;
  const step = Math.min(dt, 0.25);
  for (const clock of Array.from(liveClocks)) clock.advance(step);
}

/**
 * A cancellable, externally drivable clock. One per component; timers and
 * tweens are registered on it, never on `setTimeout` / `setInterval`, so a
 * component's whole animation state can be frozen, stepped or thrown away.
 */
export class UIClock {
  private subs: UITickFn[] = [];
  private timers: UITimer[] = [];
  private raf = 0;
  private last = 0;
  private t = 0;
  private disposed = false;

  constructor() {
    liveClocks.add(this);
  }

  /** Seconds since this clock was created, counting only advanced time. */
  get time(): number {
    return this.t;
  }

  /** Per-frame subscriber. Returns an unsubscribe function. */
  onTick(fn: UITickFn): () => void {
    if (this.disposed) return () => {};
    this.subs.push(fn);
    this.syncDrive();
    let off = false;
    return () => {
      if (off) return;
      off = true;
      const i = this.subs.indexOf(fn);
      if (i >= 0) this.subs.splice(i, 1);
    };
  }

  /** One-shot timer. Fires during the advance that passes its due time. */
  after(seconds: number, fn: () => void): UIHandle {
    if (this.disposed) return NOOP_HANDLE;
    const timer: UITimer = { due: this.t + Math.max(0, seconds), fn, alive: true };
    this.timers.push(timer);
    this.syncDrive();
    return {
      cancel: () => {
        timer.alive = false;
      },
    };
  }

  /** Promise form of `after`, so components can `await` on the world's clock. */
  wait(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      this.after(seconds, resolve);
    });
  }

  /**
   * Drives `apply` with raw progress 0..1 over `seconds`, then calls `done`.
   * A non-positive duration applies the end state immediately, which is how
   * reduced motion collapses every animation in the UI.
   */
  tween(seconds: number, apply: (p: number) => void, done?: () => void): UIHandle {
    if (this.disposed) return NOOP_HANDLE;
    if (!(seconds > 0)) {
      apply(1);
      if (done) done();
      return NOOP_HANDLE;
    }
    let elapsed = 0;
    let finished = false;
    const off = this.onTick((dt) => {
      if (finished) return;
      elapsed += dt;
      const p = Math.min(1, elapsed / seconds);
      apply(p);
      if (p >= 1) {
        finished = true;
        off();
        if (done) done();
      }
    });
    apply(0);
    return {
      cancel: () => {
        if (finished) return;
        finished = true;
        off();
      },
    };
  }

  /** Drops every subscriber and timer without firing them. */
  cancelAll(): void {
    this.subs.length = 0;
    for (const timer of this.timers) timer.alive = false;
    this.timers.length = 0;
    this.stopFrames();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelAll();
    liveClocks.delete(this);
  }

  /** Steps the clock. Called by `uiPumpClocks` or by our own rAF loop. */
  advance(dt: number): void {
    if (this.disposed || !(dt > 0)) return;
    this.t += dt;

    // Snapshot: a subscriber may unsubscribe or add work while running.
    const subs = this.subs.slice();
    for (const sub of subs) {
      if (this.subs.indexOf(sub) >= 0) sub(dt, this.t);
    }

    if (this.timers.length) {
      const due: UITimer[] = [];
      const keep: UITimer[] = [];
      for (const timer of this.timers) {
        if (!timer.alive) continue;
        if (timer.due <= this.t) due.push(timer);
        else keep.push(timer);
      }
      this.timers = keep;
      for (const timer of due) {
        if (timer.alive) timer.fn();
      }
    }

    this.syncDrive();
  }

  /**
   * Starts or stops internal frame scheduling. While external drive is on this
   * never schedules anything: the clock only moves through `uiPumpClocks`.
   */
  syncDrive(): void {
    if (this.disposed || externalDrive) {
      this.stopFrames();
      return;
    }
    const busy = this.subs.length > 0 || this.timers.some((t) => t.alive);
    if (busy && !this.raf) {
      this.last = nowMs();
      this.raf = requestAnimationFrame(this.frame);
    } else if (!busy && this.raf) {
      this.stopFrames();
    }
  }

  private stopFrames(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private frame = (ts: number): void => {
    this.raf = 0;
    if (this.disposed || externalDrive) return;
    const dt = Math.min(Math.max((ts - this.last) / 1000, 0), 0.1) || 1 / 60;
    this.last = ts;
    this.advance(dt);
    this.syncDrive();
  };
}

function nowMs(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

/* ==========================================================================
   Motion policy
   ========================================================================== */

let reducedOverride: boolean | null = null;

export function uiReducedMotion(): boolean {
  if (reducedOverride !== null) return reducedOverride;
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Test hook: forces the reduced-motion answer. `null` restores the query. */
export function uiSetReducedMotion(on: boolean | null): void {
  reducedOverride = on;
}

/** Scales an animation duration to zero when the player asked for less motion. */
export function uiDur(seconds: number): number {
  return uiReducedMotion() ? 0 : seconds;
}

export function uiEaseOut(p: number): number {
  const c = uiClamp01(p);
  return 1 - Math.pow(1 - c, 3);
}

export function uiEaseInOut(p: number): number {
  const c = uiClamp01(p);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function uiClamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function uiClamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/* ==========================================================================
   Exclusive keyboard capture
   ========================================================================== */

export interface UIKeyHooks {
  down?: (e: KeyboardEvent) => void;
  up?: (e: KeyboardEvent) => void;
}

const keyStack: UIKeyHooks[] = [];
let keysBound = false;

function onWindowKeyDown(e: KeyboardEvent): void {
  const top = keyStack[keyStack.length - 1];
  if (top && top.down) top.down(e);
}

function onWindowKeyUp(e: KeyboardEvent): void {
  const top = keyStack[keyStack.length - 1];
  if (top && top.up) top.up(e);
}

function bindKeys(): void {
  if (keysBound) return;
  window.addEventListener('keydown', onWindowKeyDown, true);
  window.addEventListener('keyup', onWindowKeyUp, true);
  keysBound = true;
}

function unbindKeys(): void {
  if (!keysBound) return;
  window.removeEventListener('keydown', onWindowKeyDown, true);
  window.removeEventListener('keyup', onWindowKeyUp, true);
  keysBound = false;
}

/**
 * Grabs the keyboard for one component. Only the most recent grab receives
 * events, so a modal on top of a modal cannot be driven by accident. The
 * returned release function is idempotent, and the window listeners come off
 * entirely once the stack empties.
 */
export function uiCaptureKeys(hooks: UIKeyHooks): () => void {
  keyStack.push(hooks);
  bindKeys();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const i = keyStack.lastIndexOf(hooks);
    if (i >= 0) keyStack.splice(i, 1);
    if (!keyStack.length) unbindKeys();
  };
}

/* ==========================================================================
   DOM helpers
   ========================================================================== */

export function uiEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function uiSvg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  className?: string,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
  if (className) el.setAttribute('class', className);
  return el;
}

export function uiAttrs(el: Element, attrs: Record<string, string | number>): void {
  for (const key of Object.keys(attrs)) el.setAttribute(key, String(attrs[key]));
}

/** A panel with all four 1px bracket corners. */
export function uiPanel(className = ''): HTMLDivElement {
  const el = uiEl('div', `dv-panel ${className}`.trim());
  el.appendChild(uiEl('i', 'dv-brk'));
  return el;
}

/** The android temple LED: a dot inside a ring that breathes. */
export function uiLed(className = ''): HTMLElement {
  return uiEl('i', `dv-led ${className}`.trim());
}

/* --- ambient pulse ------------------------------------------------------- */

type StyledElement = HTMLElement | SVGElement;

interface PulseEntry {
  el: StyledElement;
  period: number;
  phase: number;
}

/**
 * Ambient pulses are driven from one shared clock that writes a `--dv-p`
 * custom property per element; the CSS decides what to do with it. The clock
 * has no subscribers (and therefore schedules no frames) while nothing is
 * registered.
 */
const pulses = new Map<StyledElement, PulseEntry>();
let pulseClock: UIClock | null = null;
let pulseOff: (() => void) | null = null;

function pulseTick(_dt: number, t: number): void {
  for (const entry of pulses.values()) {
    const phase = t / entry.period + entry.phase;
    const p = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
    entry.el.style.setProperty('--dv-p', p.toFixed(3));
  }
}

export function uiRegisterPulse(el: StyledElement, period = 1.9, phase = 0): () => void {
  if (uiReducedMotion()) {
    el.style.setProperty('--dv-p', '0.5');
    return () => {};
  }
  pulses.set(el, { el, period: Math.max(0.05, period), phase });
  if (!pulseClock) pulseClock = new UIClock();
  if (!pulseOff) pulseOff = pulseClock.onTick(pulseTick);
  let off = false;
  return () => {
    if (off) return;
    off = true;
    pulses.delete(el);
    if (!pulses.size && pulseOff) {
      pulseOff();
      pulseOff = null;
    }
  };
}

/* --- reveal helpers ------------------------------------------------------ */

export interface RevealOptions {
  /** Seconds. */
  duration?: number;
  /** Starting vertical offset in px (animated away). */
  y?: number;
  /** Starting horizontal offset in px (animated away). */
  x?: number;
  /** Extra transform kept in front of the animated one, e.g. a centring one. */
  base?: string;
  delay?: number;
  to?: number;
}

/** Fades and slides an element in. Transform + opacity only. */
export function uiReveal(clock: UIClock, el: StyledElement, opts: RevealOptions = {}): UIHandle {
  const dur = uiDur(opts.duration ?? 0.24);
  const y = opts.y ?? 0;
  const x = opts.x ?? 0;
  const base = opts.base ?? '';
  const to = opts.to ?? 1;
  const run = (): UIHandle =>
    clock.tween(dur, (p) => {
      const e = uiEaseOut(p);
      el.style.opacity = String(to * e);
      const tx = x * (1 - e);
      const ty = y * (1 - e);
      const shift = tx || ty ? ` translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)` : '';
      el.style.transform = `${base}${shift}`.trim() || 'none';
    });

  if (opts.delay && opts.delay > 0 && !uiReducedMotion()) {
    el.style.opacity = '0';
    let inner: UIHandle | null = null;
    let cancelled = false;
    const timer = clock.after(opts.delay, () => {
      if (!cancelled) inner = run();
    });
    return {
      cancel: () => {
        cancelled = true;
        timer.cancel();
        if (inner) inner.cancel();
      },
    };
  }
  return run();
}

/** Fades an element out and optionally hides it afterwards. */
export function uiFadeOut(
  clock: UIClock,
  el: StyledElement,
  duration = 0.18,
  onDone?: () => void,
): UIHandle {
  const from = Number(el.style.opacity || '1') || 1;
  return clock.tween(
    uiDur(duration),
    (p) => {
      el.style.opacity = String(from * (1 - uiEaseOut(p)));
    },
    onDone,
  );
}

/** Grows a 1px rule from nothing. */
export function uiGrowRule(
  clock: UIClock,
  el: StyledElement,
  duration = 0.32,
  origin = '0 50%',
): UIHandle {
  el.style.transformOrigin = origin;
  return clock.tween(uiDur(duration), (p) => {
    el.style.transform = `scaleX(${uiEaseOut(p).toFixed(4)})`;
  });
}

/* ==========================================================================
   UIRoot
   ========================================================================== */

export interface UIRootOptions {
  container?: HTMLElement;
}

export class UIRoot {
  readonly el: HTMLElement;
  readonly dialogue: DialogueUI;
  readonly choices: ChoiceWheel;
  readonly hud: HUD;
  readonly qte: QTEUI;
  readonly flowchart: FlowchartUI;
  readonly menu: MenuUI;
  readonly stats: StatsCard;

  private readonly stack: HTMLElement;
  private disposed = false;

  constructor(opts?: UIRootOptions) {
    const container =
      opts?.container ??
      (document.getElementById('ui-root') as HTMLElement | null) ??
      document.body;

    this.el = uiEl('div', 'dv-root');
    // Components sit in one full-frame layer so world-anchored markers can use
    // raw UV coordinates; chrome insets itself with the --dv-bar variable.
    this.stack = uiEl('div', 'dv-stack');
    this.stack.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    this.el.appendChild(this.stack);
    this.el.appendChild(uiEl('div', 'dv-scan'));
    container.appendChild(this.el);

    this.hud = new HUD(this.stack);
    this.dialogue = new DialogueUI(this.stack);
    this.choices = new ChoiceWheel(this.stack);
    this.qte = new QTEUI(this.stack);
    this.stats = new StatsCard(this.stack);
    this.flowchart = new FlowchartUI(this.stack);
    this.menu = new MenuUI(this.stack);
  }

  /** Shifts the chrome inside the 2.39:1 bars drawn by the 3D post stack. */
  setLetterbox(on: boolean): void {
    this.el.classList.toggle('dv-lb', on);
  }

  /** Settles every pending promise and clears every readout. */
  clearAll(): void {
    this.choices.cancel();
    this.qte.cancel();
    this.dialogue.hide();
    this.dialogue.setSlate(null);
    this.flowchart.hide();
    this.stats.hide();
    this.menu.hide();
    this.hud.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.hud.dispose();
    this.dialogue.dispose();
    this.choices.dispose();
    this.qte.dispose();
    this.stats.dispose();
    this.flowchart.dispose();
    this.menu.dispose();
    if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
  }
}

/* ==========================================================================
   Self test
   ========================================================================== */

/**
 * Exercises every component in sequence. Used by the UI test scene and as a
 * smoke test that no promise can dangle: everything here either completes on
 * its own or is settled by `hide()` / `cancel()`.
 */
export async function uiSelfTest(root: UIRoot): Promise<void> {
  const clock = new UIClock();
  const wait = (s: number) => clock.wait(s);

  try {
    // --- menu ---------------------------------------------------------------
    const chapters = [
      { id: 'ch01', index: 1, name: 'Ferndale', unlocked: true },
      { id: 'ch02', index: 2, name: 'The Rain Room', unlocked: true },
      { id: 'ch03', index: 3, name: 'Jericho', unlocked: false },
    ];
    const titlePromise = root.menu.showTitle(chapters, {
      quality: 'high',
      voice: true,
      music: true,
    });
    await wait(0.9);
    root.menu.hide();
    await titlePromise;

    const pausePromise = root.menu.showPause();
    await wait(0.6);
    root.menu.hide();
    await pausePromise;

    // --- hud ----------------------------------------------------------------
    root.setLetterbox(true);
    root.hud.setObjective('Find out what happened here');
    root.hud.setMeters([
      { id: 'kara', name: 'Kara', value: 62, trend: 1 },
      { id: 'alice', name: 'Alice', value: 41, trend: 0 },
      { id: 'connor', name: 'Connor', value: 18, trend: -1 },
    ]);
    root.hud.setInstability(0.24);
    await root.hud.showChapterCard('Chapter 02', 'The Rain Room', 'Ferndale — 23:41');

    root.dialogue.setSlate('Ferndale — 23:41');
    root.hud.setPrompt('Examine', 'E');
    await wait(0.5);

    root.hud.setScanMode(true);
    root.hud.showClue('Thirium 310', 'Evaporation suggests 14 minutes since discharge.');
    root.hud.flashNotice('Software instability', 'warn');
    await wait(0.8);
    root.hud.flashNotice('New objective', 'good');
    root.hud.setInstability(0.72);
    await wait(0.6);
    root.hud.setScanMode(false);
    root.hud.setPrompt(null);

    // --- dialogue -----------------------------------------------------------
    await root.dialogue.show({
      speaker: 'Kara',
      text: 'There is blood on the floor. It is still warm.',
      android: true,
    });
    await wait(0.3);
    const skipped = root.dialogue.show({
      speaker: 'Connor',
      text: 'I am going to find out what you did, and then I am going to stop you.',
      color: '#ffd166',
    });
    await wait(0.25);
    root.dialogue.skip();
    await skipped;
    root.dialogue.hide();

    // --- choices ------------------------------------------------------------
    const choice = await root.choices.present(
      [
        { id: 'lie', label: 'Lie', hint: 'She will not forgive you' },
        { id: 'truth', label: 'Tell the truth' },
        { id: 'silent', label: 'Say nothing', danger: true },
        { id: 'locked', label: 'Reach out', disabled: true },
      ],
      1.4,
    );
    void choice; // resolves null on timeout — no player in the self test

    // --- qte ----------------------------------------------------------------
    await root.qte.run({ kind: 'press', key: 'F', label: 'Steady', seconds: 0.7 });
    await root.qte.run({ kind: 'hold', key: 'Space', label: 'Hold on', seconds: 0.6 });
    await root.qte.run({ kind: 'mash', key: 'K', label: 'Break free', seconds: 0.6 });
    await root.qte.run({
      kind: 'direction',
      key: 'ArrowLeft',
      label: 'Dodge',
      seconds: 0.6,
      uv: { x: 0.62, y: 0.44 },
    });

    // --- stats --------------------------------------------------------------
    await root.stats.show(
      'Did you tell Alice the truth?',
      [
        { label: 'Told the truth', percent: 61, chosen: true },
        { label: 'Lied', percent: 27, chosen: false },
        { label: 'Said nothing', percent: 12, chosen: false },
      ],
      1.2,
    );

    // --- flowchart ----------------------------------------------------------
    const flowPromise = root.flowchart.show(
      'Chapter 02 — The Rain Room',
      [
        { id: 'a', label: 'Enter apartment', column: 0, row: 1, taken: true },
        { id: 'b', label: 'Scan the blood', column: 1, row: 0, taken: true },
        { id: 'c', label: 'Ignore the blood', column: 1, row: 2, taken: false, missed: true },
        { id: 'd', label: 'Confront Todd', column: 2, row: 0, taken: true },
        { id: 'e', label: 'Run with Alice', column: 3, row: 0, taken: true, ending: true },
        { id: 'f', label: 'Shut down', column: 3, row: 2, taken: false, ending: true },
      ],
      [
        { from: 'a', to: 'b', taken: true },
        { from: 'a', to: 'c', taken: false },
        { from: 'b', to: 'd', taken: true },
        { from: 'c', to: 'f', taken: false },
        { from: 'd', to: 'e', taken: true },
        { from: 'd', to: 'f', taken: false },
      ],
    );
    await wait(1.4);
    root.flowchart.hide();
    await flowPromise;

    // --- ending -------------------------------------------------------------
    const endingPromise = root.stats.showEnding(
      'Deviant',
      'You crossed the line that was drawn inside you, and nothing put it back.',
      ['Kara reached the border.', 'Alice stopped counting the days.', 'Connor is still looking.'],
    );
    await wait(1.6);
    root.stats.hide();
    await endingPromise;

    root.setLetterbox(false);
    root.clearAll();
  } finally {
    clock.dispose();
  }
}
