/**
 * The choice wheel: two to four options arranged around screen centre with a
 * countdown ring in the hub. Keyboard (arrows / 1-4 / Enter) and mouse
 * (hover + click) both drive it, and it always resolves — with the chosen id,
 * or with `null` when the clock runs out or the wheel is cancelled.
 */
import {
  UIClock,
  uiCaptureKeys,
  uiClamp01,
  uiDur,
  uiEaseOut,
  uiEl,
  uiFadeOut,
  uiReveal,
  uiSvg,
  type UIHandle,
} from './UIRoot';

export interface ChoiceOption {
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  danger?: boolean;
}

type Slot = 'l' | 't' | 'r' | 'b';

const RING_R = 45;
const RING_C = 2 * Math.PI * RING_R;
/** Fraction of the timer below which the ring turns red and pulses. */
const LOW_FRACTION = 0.3;

interface Entry {
  option: ChoiceOption;
  slot: Slot;
  wrap: HTMLElement;
  button: HTMLButtonElement;
  enabled: boolean;
}

function slotsFor(count: number): Slot[] {
  switch (count) {
    case 1:
      return ['t'];
    case 2:
      return ['l', 'r'];
    case 3:
      return ['l', 't', 'r'];
    default:
      return ['l', 't', 'r', 'b'];
  }
}

const SLOT_OFFSET: Record<Slot, { x: number; y: number }> = {
  l: { x: -18, y: 0 },
  r: { x: 18, y: 0 },
  t: { x: 0, y: -14 },
  b: { x: 0, y: 14 },
};

const SLOT_BASE: Record<Slot, string> = {
  l: 'translateY(-50%)',
  r: 'translateY(-50%)',
  t: 'translateX(-50%)',
  b: 'translateX(-50%)',
};

export class ChoiceWheel {
  private readonly root: HTMLElement;
  private readonly clock = new UIClock();
  private readonly hub: HTMLElement;
  private readonly ringFg: SVGCircleElement;
  private readonly ringPulse: SVGCircleElement;
  private readonly ringNum: HTMLElement;

  private entries: Entry[] = [];
  private selected = -1;
  private resolveChoice: ((id: string | null) => void) | null = null;
  private releaseKeys: (() => void) | null = null;
  private ticker: (() => void) | null = null;
  private confirmTimer: UIHandle | null = null;
  private remaining = 0;
  private total = 0;
  private active = false;
  private disposed = false;

  constructor(parent: HTMLElement) {
    this.root = uiEl('div', 'dv-c dv-c-choice');

    this.hub = uiEl('div', 'dv-choice-hub');
    const svg = uiSvg('svg', 'dv-ring');
    svg.setAttribute('viewBox', '0 0 100 100');
    const bg = uiSvg('circle', 'dv-ring-bg');
    bg.setAttribute('cx', '50');
    bg.setAttribute('cy', '50');
    bg.setAttribute('r', String(RING_R));
    this.ringPulse = uiSvg('circle', 'dv-ring-pulse');
    this.ringPulse.setAttribute('cx', '50');
    this.ringPulse.setAttribute('cy', '50');
    this.ringPulse.setAttribute('r', String(RING_R + 5));
    this.ringFg = uiSvg('circle', 'dv-ring-fg');
    this.ringFg.setAttribute('cx', '50');
    this.ringFg.setAttribute('cy', '50');
    this.ringFg.setAttribute('r', String(RING_R));
    this.ringFg.setAttribute('stroke-dasharray', `${RING_C.toFixed(3)} ${RING_C.toFixed(3)}`);
    this.ringFg.setAttribute('stroke-dashoffset', '0');
    svg.append(bg, this.ringPulse, this.ringFg);

    this.ringNum = uiEl('div', 'dv-ring-num', '');
    this.hub.append(svg, this.ringNum);
    this.hub.style.display = 'none';

    this.root.appendChild(this.hub);
    parent.appendChild(this.root);
  }

  present(options: ChoiceOption[], timeoutSeconds: number): Promise<string | null> {
    if (this.disposed) return Promise.resolve(null);

    // A new prompt supersedes anything still on screen.
    this.cancel();

    const list = (options ?? []).slice(0, 4);
    if (!list.length) return Promise.resolve(null);

    const slots = slotsFor(list.length);
    this.entries = list.map((option, i) => this.buildEntry(option, slots[i], i));
    for (const entry of this.entries) this.root.appendChild(entry.wrap);

    this.total = Math.max(0.25, timeoutSeconds);
    this.remaining = this.total;
    this.active = true;
    this.hub.classList.remove('dv-low');
    this.hub.style.display = '';
    this.updateRing();

    // Hub + staggered option reveal.
    this.clock.tween(uiDur(0.26), (p) => {
      const e = uiEaseOut(p);
      this.hub.style.opacity = String(e);
      this.hub.style.transform = `scale(${(0.88 + 0.12 * e).toFixed(4)})`;
    });
    this.entries.forEach((entry, i) => {
      const off = SLOT_OFFSET[entry.slot];
      uiReveal(this.clock, entry.button, { duration: 0.24, x: off.x, y: off.y, delay: i * 0.07 });
    });

    this.select(this.entries.findIndex((e) => e.enabled));

    this.ticker = this.clock.onTick((dt) => this.tick(dt));
    this.releaseKeys = uiCaptureKeys({ down: (e) => this.onKey(e) });

    return new Promise<string | null>((resolve) => {
      this.resolveChoice = resolve;
    });
  }

  cancel(): void {
    if (this.disposed) return;
    this.teardown();
    this.settle(null);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.teardown();
    this.settle(null);
    this.clock.dispose();
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }

  /* --- internals -------------------------------------------------------- */

  private buildEntry(option: ChoiceOption, slot: Slot, index: number): Entry {
    const wrap = uiEl('div', `dv-slot dv-slot-${slot}`);
    const button = uiEl('button', 'dv-panel dv-opt');
    button.type = 'button';
    if (option.danger) button.classList.add('dv-danger');
    const enabled = option.disabled !== true;
    if (!enabled) {
      button.classList.add('dv-off');
      button.disabled = true;
    }

    button.appendChild(uiEl('i', 'dv-brk'));
    button.appendChild(uiEl('i', 'dv-opt-mark'));
    button.appendChild(uiEl('span', 'dv-opt-idx', String(index + 1).padStart(2, '0')));
    button.appendChild(uiEl('span', 'dv-opt-label', option.label));
    if (option.hint) button.appendChild(uiEl('span', 'dv-opt-hint', option.hint));

    button.style.opacity = '0';
    if (enabled) {
      button.addEventListener('mouseenter', () => this.select(index));
      button.addEventListener('click', () => this.confirm(index));
    }
    wrap.appendChild(button);
    wrap.style.transform = SLOT_BASE[slot];
    return { option, slot, wrap, button, enabled };
  }

  private tick(dt: number): void {
    if (!this.active) return;
    this.remaining -= dt;
    if (this.remaining <= 0) {
      this.remaining = 0;
      this.updateRing();
      this.teardown();
      this.settle(null);
      return;
    }
    this.updateRing();
  }

  private updateRing(): void {
    const fraction = uiClamp01(this.total > 0 ? this.remaining / this.total : 0);
    this.ringFg.setAttribute('stroke-dashoffset', (RING_C * (1 - fraction)).toFixed(3));
    const secs = Math.max(0, Math.ceil(this.remaining - 1e-4));
    const text = String(secs);
    if (this.ringNum.textContent !== text) this.ringNum.textContent = text;

    const low = fraction <= LOW_FRACTION;
    this.hub.classList.toggle('dv-low', low);
    if (low) {
      // Pulse frequency rises as the window closes.
      const beat = 0.5 - 0.5 * Math.cos((this.total - this.remaining) * 9);
      this.hub.style.setProperty('--dv-p', beat.toFixed(3));
    } else {
      this.hub.style.setProperty('--dv-p', '0');
    }
  }

  private select(index: number): void {
    if (index < 0 || index >= this.entries.length) return;
    if (!this.entries[index].enabled) return;
    if (this.selected === index) return;
    this.selected = index;
    this.entries.forEach((entry, i) => entry.button.classList.toggle('dv-sel', i === index));
  }

  private step(dir: number): void {
    const count = this.entries.length;
    if (!count) return;
    let index = this.selected < 0 ? 0 : this.selected;
    for (let i = 0; i < count; i++) {
      index = (index + dir + count) % count;
      if (this.entries[index].enabled) {
        this.select(index);
        return;
      }
    }
  }

  private bySlot(slot: Slot): number {
    return this.entries.findIndex((e) => e.slot === slot && e.enabled);
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.active) return;
    const key = e.key;
    let handled = true;

    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      const i = this.bySlot('l');
      if (i >= 0) this.select(i);
      else this.step(-1);
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      const i = this.bySlot('r');
      if (i >= 0) this.select(i);
      else this.step(1);
    } else if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      const i = this.bySlot('t');
      if (i >= 0) this.select(i);
      else this.step(-1);
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      const i = this.bySlot('b');
      if (i >= 0) this.select(i);
      else this.step(1);
    } else if (key >= '1' && key <= '4') {
      const i = Number(key) - 1;
      if (i < this.entries.length && this.entries[i].enabled) this.select(i);
    } else if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      this.confirm(this.selected);
    } else {
      handled = false;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private confirm(index: number): void {
    if (!this.active) return;
    if (index < 0 || index >= this.entries.length) return;
    const entry = this.entries[index];
    if (!entry.enabled) return;

    this.select(index);
    this.active = false;
    if (this.releaseKeys) {
      this.releaseKeys();
      this.releaseKeys = null;
    }
    if (this.ticker) {
      this.ticker();
      this.ticker = null;
    }

    // Let the selection read for a beat, then clear and resolve.
    for (const other of this.entries) {
      if (other !== entry) uiFadeOut(this.clock, other.button, 0.14);
    }
    uiFadeOut(this.clock, this.hub, 0.16);
    this.confirmTimer = this.clock.after(uiDur(0.2), () => {
      this.confirmTimer = null;
      this.teardown();
      this.settle(entry.option.id);
    });
  }

  private teardown(): void {
    this.active = false;
    if (this.releaseKeys) {
      this.releaseKeys();
      this.releaseKeys = null;
    }
    if (this.ticker) {
      this.ticker();
      this.ticker = null;
    }
    if (this.confirmTimer) {
      this.confirmTimer.cancel();
      this.confirmTimer = null;
    }
    this.clock.cancelAll();
    for (const entry of this.entries) {
      if (entry.wrap.parentNode) entry.wrap.parentNode.removeChild(entry.wrap);
    }
    this.entries = [];
    this.selected = -1;
    this.hub.style.display = 'none';
    this.hub.style.opacity = '0';
    this.hub.classList.remove('dv-low');
  }

  private settle(id: string | null): void {
    const resolve = this.resolveChoice;
    this.resolveChoice = null;
    if (resolve) resolve(id);
  }
}
