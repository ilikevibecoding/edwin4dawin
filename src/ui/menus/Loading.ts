import type { EventBus } from '../../core/EventBus';
import { div, el, StyleCell, TextCell } from '../dom';

/**
 * The loading screen.
 *
 * ## Why this is not a system
 *
 * The game generates every texture, every building and every weapon at boot and
 * takes the better part of twenty seconds doing it. A loading screen created in
 * `MenuSystem.init` would be useless: systems initialise in `order`, the menu is
 * near the end of the list, and the screen would appear for the last two
 * percent of a wait it exists to explain.
 *
 * So this module builds its DOM the moment it is *imported*, which happens
 * before `Engine.init` runs, and hooks the bus opportunistically through the
 * debug bridge that `main.ts` installs ahead of the dynamic imports. If that
 * bridge is not there — a different host, a test, a future refactor — nothing
 * breaks: the screen still shows, and `MenuSystem.init` attaches the bus later
 * for whatever progress remains.
 *
 * `main.ts` also writes raw progress text into `#boot-progress`, so that element
 * is provided here as the status line. That is not a hack for its own sake: it
 * means a fatal boot error, which `main.ts` writes to the same element, lands on
 * the loading screen in front of the player instead of vanishing into a console
 * nobody has open.
 */

/** Human phrasing for the system keys `Engine.init` reports. */
const PHASES: Record<string, string> = {
  materials: 'Synthesising materials',
  sky: 'Integrating the atmosphere',
  lighting: 'Placing lights',
  physics: 'Building collision',
  world: 'Generating the district',
  fx: 'Priming effects',
  decals: 'Allocating decals',
  player: 'Calibrating controls',
  weapons: 'Machining weapons',
  ai: 'Briefing hostiles',
  killstreaks: 'Tasking air support',
  audio: 'Synthesising audio',
  hud: 'Drawing the interface',
  menu: 'Assembling menus',
  director: 'Planning the operation',
  render: 'Compiling shaders',
  ready: 'Ready',
};

export class LoadingScreen {
  readonly root: HTMLElement;
  private readonly phase: TextCell;
  private readonly percent: TextCell;
  private readonly bar: StyleCell;
  private readonly ticks: HTMLElement[] = [];
  private attached = false;
  private progress = 0;
  private done = false;

  constructor(parent: HTMLElement) {
    this.root = div('boot', parent);

    div('boot-grain', this.root);
    const card = div('boot-card', this.root);

    const brand = div('boot-brand', card);
    el('span', 'boot-kicker', brand).textContent = 'TASK FORCE 141 · CLASSIFIED';
    const title = div('boot-title', brand);
    el('span', 'boot-title-1', title).textContent = 'OPERATION';
    el('span', 'boot-title-2', title).textContent = 'BLACKOUT';
    el('span', 'boot-sub', brand).textContent =
      'Every texture, building and weapon in this level is generated in your browser. Nothing is downloaded.';

    const meter = div('boot-meter', card);
    const head = div('boot-meter-head', meter);
    this.phase = new TextCell(el('span', 'boot-phase', head));
    this.percent = new TextCell(el('span', 'boot-percent', head));

    const track = div('boot-track', meter);
    // Sixteen fixed segments rather than a smooth bar: a segmented meter reads
    // as instrumentation, and it also makes slow phases legible — you can see
    // which block it is sitting on.
    for (let i = 0; i < 16; i++) this.ticks.push(div('boot-tick', track));
    const fill = div('boot-fill', track);
    this.bar = new StyleCell(fill, 'transform');
    this.bar.set('scaleX(0)');

    // `main.ts` writes progress and fatal errors here by id.
    const status = el('span', 'boot-status', meter);
    status.id = 'boot-progress';

    this.phase.set('Starting up');
    this.percent.set('0%');
  }

  /** Subscribes to the bus. Safe to call more than once. */
  attach(events: EventBus): void {
    if (this.attached) return;
    this.attached = true;
    events.on('loading:progress', (e) => this.set(e.progress, e.label));
    events.on('game:ready', () => this.finish());
  }

  set(progress: number, label: string): void {
    if (this.done) return;
    // Boot progress must never go backwards; a system that reports out of order
    // would otherwise make the bar twitch.
    this.progress = Math.max(this.progress, Math.min(1, progress));
    this.phase.set(PHASES[label] ?? label.replace(/^\w/, (c) => c.toUpperCase()));
    this.percent.set(`${Math.round(this.progress * 100)}%`);
    this.bar.set(`scaleX(${this.progress.toFixed(4)})`);
    const lit = Math.round(this.progress * this.ticks.length);
    for (let i = 0; i < this.ticks.length; i++) {
      this.ticks[i].classList.toggle('lit', i < lit);
    }
  }

  finish(): void {
    if (this.done) return;
    this.done = true;
    this.set(1, 'ready');
    this.root.classList.add('out');
    // Left in the tree for the length of the fade, then removed entirely: a
    // full-screen element with a backdrop filter is not something to leave
    // parked behind the HUD for the rest of the session.
    window.setTimeout(() => this.root.remove(), 900);
  }

  get finished(): boolean {
    return this.done;
  }
}

let instance: LoadingScreen | null = null;

/**
 * Builds the screen on first call and returns the same instance thereafter.
 * Called from this module's importers at module scope, which is the earliest
 * point at which `#ui-root` exists and the latest at which the screen is still
 * worth showing.
 */
export function bootLoadingScreen(): LoadingScreen | null {
  if (instance) return instance;
  if (typeof document === 'undefined') return null;
  const host = document.getElementById('ui-root');
  if (!host) return null;

  instance = new LoadingScreen(host);

  // The debug bridge is installed before `main.ts` imports any system, so the
  // bus is normally reachable from here — the whole of boot earlier than
  // `MenuSystem.init` could manage.
  const bus = window.__GAME__?.engine?.events;
  if (bus) instance.attach(bus);
  return instance;
}

export function loadingScreen(): LoadingScreen | null {
  return instance;
}
