/**
 * Input abstraction. Every read goes through here so the autoplay demo can feed
 * synthetic input for deterministic capture: the game cannot tell the difference
 * between a real key press and an injected one.
 */

export type ActionName =
  | 'interact'
  | 'scan'
  | 'skip'
  | 'pause'
  | 'confirm'
  | 'left'
  | 'right'
  | 'forward'
  | 'back';

const KEY_ACTIONS: Record<string, ActionName> = {
  KeyE: 'interact',
  KeyQ: 'scan',
  Space: 'skip',
  Escape: 'pause',
  Enter: 'confirm',
  KeyA: 'left',
  KeyD: 'right',
  KeyW: 'forward',
  KeyS: 'back',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'forward',
  ArrowDown: 'back',
};

export class Input {
  private down = new Set<string>();
  private pressedThisFrame = new Set<string>();
  private releasedThisFrame = new Set<string>();
  private injected = new Set<string>();
  private injectedTimers: { code: string; until: number }[] = [];

  mouseX = 0;
  mouseY = 0;
  /** Normalised device coords (-1..1). */
  ndcX = 0;
  ndcY = 0;
  mouseDX = 0;
  mouseDY = 0;
  clicked = false;
  rightClicked = false;
  /** Set while a modal UI (menu, flowchart) owns the input. */
  uiCapture = false;

  private el: HTMLElement;
  private now = 0;

  constructor(el: HTMLElement = document.body) {
    this.el = el;
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('blur', () => this.down.clear());
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    this.down.add(e.code);
    this.pressedThisFrame.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
    this.releasedThisFrame.add(e.code);
  };

  private onMouseMove = (e: MouseEvent): void => {
    const r = this.el.getBoundingClientRect();
    this.mouseDX += e.movementX || 0;
    this.mouseDY += e.movementY || 0;
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.ndcX = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.ndcY = -(((e.clientY - r.top) / r.height) * 2 - 1);
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) this.clicked = true;
    if (e.button === 2) this.rightClicked = true;
  };

  /** Simulates a key tap for `holdSeconds` of game time. */
  inject(code: string, holdSeconds = 0.12): void {
    this.injected.add(code);
    this.pressedThisFrame.add(code);
    this.injectedTimers.push({ code, until: this.now + holdSeconds });
  }

  /** Moves the virtual cursor (used by autoplay to point at choices). */
  setVirtualCursor(x: number, y: number): void {
    const r = this.el.getBoundingClientRect();
    this.mouseX = x;
    this.mouseY = y;
    this.ndcX = (x / r.width) * 2 - 1;
    this.ndcY = -((y / r.height) * 2 - 1);
  }

  isDown(code: string): boolean {
    return this.down.has(code) || this.injected.has(code);
  }

  wasPressed(code: string): boolean {
    return this.pressedThisFrame.has(code);
  }

  actionDown(action: ActionName): boolean {
    for (const [code, a] of Object.entries(KEY_ACTIONS)) {
      if (a === action && this.isDown(code)) return true;
    }
    return false;
  }

  actionPressed(action: ActionName): boolean {
    for (const [code, a] of Object.entries(KEY_ACTIONS)) {
      if (a === action && this.wasPressed(code)) return true;
    }
    return false;
  }

  /** Called once per frame after all systems have read input. */
  endFrame(now: number): void {
    this.now = now;
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
    this.clicked = false;
    this.rightClicked = false;
    this.mouseDX = 0;
    this.mouseDY = 0;
    if (this.injectedTimers.length) {
      const still: typeof this.injectedTimers = [];
      for (const t of this.injectedTimers) {
        if (t.until > now) still.push(t);
        else this.injected.delete(t.code);
      }
      this.injectedTimers = still;
    }
  }
}
