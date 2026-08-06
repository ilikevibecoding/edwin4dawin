/**
 * Quick-time prompts: single press, hold, mash and directional flick.
 *
 * The ring is the same motif as the choice wheel countdown; it depletes for a
 * press, fills for a hold or a mash. Keyboard is primary, mouse works as a
 * fallback for the non-directional kinds. The promise always settles: on a
 * hit, on a miss, on the window closing, or on `cancel()` / `dispose()`.
 */
import {
  UIClock,
  UIFader,
  uiCaptureKeys,
  uiClamp,
  uiClamp01,
  uiDur,
  uiEaseOut,
  uiEl,
  uiSvg,
  type UIHandle,
} from './UIRoot';

export type QTEKind = 'press' | 'hold' | 'mash' | 'direction';

export interface QTERequest {
  kind: QTEKind;
  key: string;
  label?: string;
  seconds: number;
  uv?: { x: number; y: number };
}

const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;

const ARROW_GLYPH: Record<string, string> = {
  ARROWLEFT: '\u2190',
  ARROWRIGHT: '\u2192',
  ARROWUP: '\u2191',
  ARROWDOWN: '\u2193',
};

const ARROW_ANGLE: Record<string, number> = {
  ARROWRIGHT: 45,
  ARROWDOWN: 135,
  ARROWLEFT: 225,
  ARROWUP: -45,
};

const ARROW_AXIS: Record<string, { x: number; y: number }> = {
  ARROWRIGHT: { x: 1, y: 0 },
  ARROWLEFT: { x: -1, y: 0 },
  ARROWUP: { x: 0, y: -1 },
  ARROWDOWN: { x: 0, y: 1 },
};

/** Canonical key name, so 'space', ' ' and 'Space' are one thing. */
function normKey(raw: string): string {
  const s = (raw ?? '').trim();
  if (s === ' ' || /^space(bar)?$/i.test(s)) return 'SPACE';
  if (/^arrow(left|right|up|down)$/i.test(s)) return s.toUpperCase();
  if (/^(left|right|up|down)$/i.test(s)) return `ARROW${s.toUpperCase()}`;
  if (/^esc(ape)?$/i.test(s)) return 'ESCAPE';
  return s.toUpperCase();
}

/** WASD alias, only meaningful for directional prompts. */
function directionAlias(key: string): string {
  switch (key) {
    case 'W':
      return 'ARROWUP';
    case 'A':
      return 'ARROWLEFT';
    case 'S':
      return 'ARROWDOWN';
    case 'D':
      return 'ARROWRIGHT';
    default:
      return key;
  }
}

function glyphFor(key: string): string {
  if (key === 'SPACE') return 'SPACE';
  if (ARROW_GLYPH[key]) return ARROW_GLYPH[key];
  return key.length > 5 ? key.slice(0, 5) : key;
}

export class QTEUI {
  private readonly root: HTMLElement;
  private readonly clock = new UIClock();
  private readonly box: HTMLElement;
  private readonly ringFg: SVGCircleElement;
  private readonly glyph: HTMLElement;
  private readonly chevrons: HTMLElement;
  private readonly chevronParts: HTMLElement[] = [];
  private readonly label: HTMLElement;
  private readonly flash: HTMLElement;
  private readonly ringBox: HTMLElement;
  private readonly boxFader: UIFader;

  private resolveRun: ((ok: boolean) => void) | null = null;
  private releaseKeys: (() => void) | null = null;
  private ticker: (() => void) | null = null;
  private endTimer: UIHandle | null = null;

  private kind: QTEKind = 'press';
  private wantKey = '';
  private target = 1;
  private window = 1;
  private elapsed = 0;
  private progress = 0;
  private held = false;
  private active = false;
  private disposed = false;

  constructor(parent: HTMLElement) {
    this.root = uiEl('div', 'dv-c dv-c-qte');
    this.box = uiEl('div', 'dv-qte');

    this.ringBox = uiEl('div', 'dv-qte-ringbox');
    const svg = uiSvg('svg', 'dv-qte-ring');
    svg.setAttribute('viewBox', '0 0 100 100');
    const bg = uiSvg('circle', 'dv-ring-bg');
    bg.setAttribute('cx', '50');
    bg.setAttribute('cy', '50');
    bg.setAttribute('r', String(RING_R));
    this.ringFg = uiSvg('circle', 'dv-ring-fg');
    this.ringFg.setAttribute('cx', '50');
    this.ringFg.setAttribute('cy', '50');
    this.ringFg.setAttribute('r', String(RING_R));
    this.ringFg.setAttribute('stroke-dasharray', `${RING_C.toFixed(3)} ${RING_C.toFixed(3)}`);
    this.ringFg.setAttribute('stroke-dashoffset', '0');
    svg.append(bg, this.ringFg);

    const core = uiEl('div', 'dv-qte-core');
    this.glyph = uiEl('div', 'dv-qte-glyph');
    core.appendChild(this.glyph);

    this.chevrons = uiEl('div', 'dv-qte-chev');
    for (let i = 0; i < 3; i++) {
      const part = uiEl('i');
      this.chevronParts.push(part);
      this.chevrons.appendChild(part);
    }
    this.chevrons.style.display = 'none';

    this.flash = uiEl('i', 'dv-qte-flash');
    this.ringBox.append(svg, core, this.chevrons, this.flash);
    this.ringBox.style.pointerEvents = 'auto';

    this.label = uiEl('div', 'dv-qte-label');
    this.box.append(this.ringBox, this.label);
    this.root.appendChild(this.box);
    parent.appendChild(this.root);
    this.boxFader = new UIFader(this.clock, this.box);

    this.ringBox.addEventListener('mousedown', this.onPointerDown);
    this.ringBox.addEventListener('mouseup', this.onPointerUp);
    this.ringBox.addEventListener('mouseleave', this.onPointerUp);
  }

  run(req: QTERequest): Promise<boolean> {
    if (this.disposed) return Promise.resolve(false);

    // A new prompt supersedes anything pending, including its animations.
    this.teardown();
    this.settle(false);
    this.clock.cancelAll();

    this.kind = req.kind;
    this.wantKey = normKey(req.key);
    const seconds = Math.max(0.15, req.seconds);
    this.elapsed = 0;
    this.progress = 0;
    this.held = false;

    if (this.kind === 'hold') {
      this.target = seconds;
      this.window = seconds * 2 + 0.4;
    } else if (this.kind === 'mash') {
      this.target = uiClamp(Math.round(seconds * 7), 3, 30);
      this.window = seconds;
    } else {
      this.target = 1;
      this.window = seconds;
    }

    this.box.classList.remove('dv-hit', 'dv-miss', 'dv-low');
    this.flash.style.opacity = '0';
    this.flash.style.transform = 'scale(0.9)';
    this.ringBox.style.transform = '';
    this.label.textContent = (req.label ?? defaultLabel(this.kind)).toUpperCase();

    const isDirection = this.kind === 'direction';
    this.chevrons.style.display = isDirection ? '' : 'none';
    this.glyph.style.display = isDirection ? 'none' : '';
    if (isDirection) this.layoutChevrons(this.wantKey);
    else this.glyph.textContent = glyphFor(this.wantKey);

    // Anchor: world-projected UV when given, otherwise just below centre.
    let base: string;
    if (req.uv) {
      this.box.style.left = `${(uiClamp01(req.uv.x) * 100).toFixed(2)}%`;
      this.box.style.top = `${(uiClamp01(req.uv.y) * 100).toFixed(2)}%`;
      this.box.style.marginLeft = '';
      base = 'translate(-50%, -50%)';
    } else {
      this.box.style.left = '50%';
      this.box.style.top = '';
      this.box.style.marginLeft = '';
      base = 'translateX(-50%)';
    }

    this.active = true;
    this.updateRing();
    this.boxFader.reveal({ duration: 0.2, y: 8, base });

    this.ticker = this.clock.onTick((dt) => this.tick(dt));
    this.releaseKeys = uiCaptureKeys({
      down: (e) => this.onKeyDown(e),
      up: (e) => this.onKeyUp(e),
    });

    return new Promise<boolean>((resolve) => {
      this.resolveRun = resolve;
    });
  }

  cancel(): void {
    if (this.disposed) return;
    this.teardown();
    this.hideBox();
    this.settle(false);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.teardown();
    this.settle(false);
    this.ringBox.removeEventListener('mousedown', this.onPointerDown);
    this.ringBox.removeEventListener('mouseup', this.onPointerUp);
    this.ringBox.removeEventListener('mouseleave', this.onPointerUp);
    this.clock.dispose();
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }

  /* --- internals -------------------------------------------------------- */

  private layoutChevrons(key: string): void {
    const axis = ARROW_AXIS[key] ?? { x: 1, y: 0 };
    const angle = ARROW_ANGLE[key] ?? 45;
    this.chevronParts.forEach((part, i) => {
      const d = (i - 1) * 9;
      part.style.transform = `translate(${(axis.x * d).toFixed(2)}px, ${(axis.y * d).toFixed(
        2,
      )}px) rotate(${angle}deg)`;
      part.style.opacity = String(1 - i * 0.3);
    });
  }

  private tick(dt: number): void {
    if (!this.active) return;
    this.elapsed += dt;

    if (this.kind === 'hold') {
      if (this.held) this.progress = Math.min(this.target, this.progress + dt);
      else this.progress = Math.max(0, this.progress - dt * 0.8);
      if (this.progress >= this.target - 1e-4) {
        this.finish(true);
        return;
      }
    } else if (this.kind === 'mash') {
      this.progress = Math.max(0, this.progress - dt * 0.9);
    }

    if (this.elapsed >= this.window) {
      this.finish(false);
      return;
    }
    this.updateRing();
  }

  private updateRing(): void {
    let fraction: number;
    if (this.kind === 'hold' || this.kind === 'mash') {
      fraction = uiClamp01(this.progress / this.target);
    } else {
      fraction = uiClamp01(1 - this.elapsed / this.window);
    }
    this.ringFg.setAttribute('stroke-dashoffset', (RING_C * (1 - fraction)).toFixed(3));

    const urgent =
      this.kind === 'hold' || this.kind === 'mash'
        ? this.elapsed / this.window > 0.7
        : fraction < 0.35;
    this.box.classList.toggle('dv-low', urgent && !this.box.classList.contains('dv-hit'));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.active) return;
    let key = normKey(e.key);
    if (this.kind === 'direction') key = directionAlias(key);

    if (key !== this.wantKey) {
      // A wrong direction is a miss; a stray key elsewhere is ignored so the
      // player is not punished for touching the camera controls.
      if (this.kind === 'direction' && ARROW_AXIS[key]) {
        e.preventDefault();
        this.finish(false);
      }
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    if (this.kind === 'hold') {
      this.held = true;
      return;
    }
    if (this.kind === 'mash') {
      if (e.repeat) return;
      this.progress = Math.min(this.target, this.progress + 1);
      this.bump();
      if (this.progress >= this.target - 1e-4) this.finish(true);
      else this.updateRing();
      return;
    }
    this.finish(true);
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (!this.active) return;
    const key = normKey(e.key);
    if (this.kind === 'hold' && key === this.wantKey) this.held = false;
  }

  private onPointerDown = (): void => {
    if (!this.active) return;
    if (this.kind === 'hold') {
      this.held = true;
      return;
    }
    if (this.kind === 'mash') {
      this.progress = Math.min(this.target, this.progress + 1);
      this.bump();
      if (this.progress >= this.target - 1e-4) this.finish(true);
      else this.updateRing();
      return;
    }
    if (this.kind === 'press') this.finish(true);
  };

  private onPointerUp = (): void => {
    if (!this.active) return;
    if (this.kind === 'hold') this.held = false;
  };

  /** Small scale kick on each successful mash input. */
  private bump(): void {
    this.clock.tween(uiDur(0.16), (p) => {
      const e = 1 - uiEaseOut(p);
      this.ringBox.style.transform = `scale(${(1 + 0.06 * e).toFixed(4)})`;
    });
  }

  private finish(ok: boolean): void {
    if (!this.active) return;
    this.active = false;
    if (this.releaseKeys) {
      this.releaseKeys();
      this.releaseKeys = null;
    }
    if (this.ticker) {
      this.ticker();
      this.ticker = null;
    }

    this.box.classList.remove('dv-low');
    this.box.classList.add(ok ? 'dv-hit' : 'dv-miss');
    if (ok) this.ringFg.setAttribute('stroke-dashoffset', '0');
    this.clock.tween(uiDur(0.3), (p) => {
      const e = uiEaseOut(p);
      this.flash.style.opacity = String((1 - e) * 0.9);
      this.flash.style.transform = `scale(${(0.9 + e * 0.5).toFixed(4)})`;
    });

    this.endTimer = this.clock.after(uiDur(0.24), () => {
      this.endTimer = null;
      this.hideBox();
      this.settle(ok);
    });
  }

  private hideBox(): void {
    this.boxFader.fade(0.2, () => {
      this.box.classList.remove('dv-hit', 'dv-miss', 'dv-low');
      this.ringBox.style.transform = '';
    });
  }

  private teardown(): void {
    this.active = false;
    this.held = false;
    if (this.releaseKeys) {
      this.releaseKeys();
      this.releaseKeys = null;
    }
    if (this.ticker) {
      this.ticker();
      this.ticker = null;
    }
    if (this.endTimer) {
      this.endTimer.cancel();
      this.endTimer = null;
    }
  }

  private settle(ok: boolean): void {
    const resolve = this.resolveRun;
    this.resolveRun = null;
    if (resolve) resolve(ok);
  }
}

function defaultLabel(kind: QTEKind): string {
  switch (kind) {
    case 'hold':
      return 'Hold';
    case 'mash':
      return 'Repeat';
    case 'direction':
      return 'Move';
    default:
      return 'Press';
  }
}
