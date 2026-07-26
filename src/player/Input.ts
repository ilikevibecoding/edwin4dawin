/**
 * Input layer: keyboard, mouse, pointer lock, fullscreen. Owner: Opus 2.
 *
 * All state is polled by the fixed simulation step rather than handled in DOM events, so an
 * automated run that injects key states behaves exactly like a human holding the key. Mouse
 * deltas accumulate between steps and are consumed once, which keeps aiming frame-rate
 * independent.
 */

export type ActionName =
  | 'forward' | 'back' | 'left' | 'right'
  | 'jump' | 'crouch' | 'walk' | 'sprint'
  | 'fire' | 'aim' | 'reload' | 'interact' | 'melee' | 'throw'
  | 'weapon1' | 'weapon2' | 'weapon3' | 'weapon4' | 'weapon5'
  | 'lastWeapon' | 'objectives' | 'minimap' | 'hostageOrder' | 'flashlight';

const DEFAULT_BINDINGS: Record<string, ActionName> = {
  KeyW: 'forward',
  KeyS: 'back',
  KeyA: 'left',
  KeyD: 'right',
  ArrowUp: 'forward',
  ArrowDown: 'back',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Space: 'jump',
  ControlLeft: 'crouch',
  KeyC: 'crouch',
  ShiftLeft: 'walk',
  ShiftRight: 'walk',
  KeyR: 'reload',
  KeyE: 'interact',
  KeyV: 'melee',
  KeyG: 'throw',
  Digit1: 'weapon1',
  Digit2: 'weapon2',
  Digit3: 'weapon3',
  Digit4: 'weapon4',
  Digit5: 'weapon5',
  KeyQ: 'lastWeapon',
  Tab: 'objectives',
  KeyM: 'minimap',
  KeyH: 'hostageOrder',
  KeyL: 'flashlight',
};

export class InputSystem {
  private down = new Set<ActionName>();
  private pressedThisStep = new Set<ActionName>();
  private releasedThisStep = new Set<ActionName>();
  private rawKeys = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  wheelDelta = 0;

  pointerLocked = false;
  /** Set while a menu owns the cursor; movement input is ignored. */
  inputBlocked = false;
  /** Test harness flag: skip real pointer lock and accept synthetic deltas. */
  syntheticPointer = false;

  private canvas: HTMLElement;
  private listeners: (() => void)[] = [];
  onPointerLockChange: ((locked: boolean) => void) | null = null;
  onEscape: (() => void) | null = null;
  onKeyPress: ((code: string) => void) | null = null;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
    this.attach();
  }

  private attach(): void {
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Tab') e.preventDefault();
      if (e.code === 'Space' && this.pointerLocked) e.preventDefault();
      if (e.repeat) return;
      this.rawKeys.add(e.code);
      this.onKeyPress?.(e.code);
      if (e.code === 'Escape') {
        this.onEscape?.();
        return;
      }
      const a = DEFAULT_BINDINGS[e.code];
      if (a) this.press(a);
    };
    const ku = (e: KeyboardEvent) => {
      this.rawKeys.delete(e.code);
      const a = DEFAULT_BINDINGS[e.code];
      if (a) this.release(a);
    };
    const mm = (e: MouseEvent) => {
      if (!this.pointerLocked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    };
    const md = (e: MouseEvent) => {
      if (e.button === 0) this.press('fire');
      if (e.button === 2) this.press('aim');
      if (e.button === 1) this.press('melee');
    };
    const mu = (e: MouseEvent) => {
      if (e.button === 0) this.release('fire');
      if (e.button === 2) this.release('aim');
      if (e.button === 1) this.release('melee');
    };
    const wheel = (e: WheelEvent) => {
      if (!this.pointerLocked) return;
      e.preventDefault();
      this.wheelDelta += Math.sign(e.deltaY);
    };
    const ctx = (e: Event) => e.preventDefault();
    const plc = () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (!this.pointerLocked) this.clearMovement();
      this.onPointerLockChange?.(this.pointerLocked);
    };
    const blur = () => this.clearAll();

    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('mousemove', mm);
    window.addEventListener('mousedown', md);
    window.addEventListener('mouseup', mu);
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('contextmenu', ctx);
    document.addEventListener('pointerlockchange', plc);
    window.addEventListener('blur', blur);

    this.listeners.push(
      () => window.removeEventListener('keydown', kd),
      () => window.removeEventListener('keyup', ku),
      () => window.removeEventListener('mousemove', mm),
      () => window.removeEventListener('mousedown', md),
      () => window.removeEventListener('mouseup', mu),
      () => window.removeEventListener('wheel', wheel),
      () => window.removeEventListener('contextmenu', ctx),
      () => document.removeEventListener('pointerlockchange', plc),
      () => window.removeEventListener('blur', blur),
    );
  }

  dispose(): void {
    for (const l of this.listeners) l();
    this.listeners.length = 0;
  }

  press(a: ActionName): void {
    if (!this.down.has(a)) this.pressedThisStep.add(a);
    this.down.add(a);
  }

  release(a: ActionName): void {
    if (this.down.has(a)) this.releasedThisStep.add(a);
    this.down.delete(a);
  }

  clearMovement(): void {
    for (const a of ['forward', 'back', 'left', 'right', 'jump', 'fire', 'aim', 'walk'] as ActionName[]) {
      this.down.delete(a);
    }
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  clearAll(): void {
    this.down.clear();
    this.pressedThisStep.clear();
    this.releasedThisStep.clear();
    this.rawKeys.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheelDelta = 0;
  }

  isDown(a: ActionName): boolean {
    return !this.inputBlocked && this.down.has(a);
  }

  wasPressed(a: ActionName): boolean {
    return !this.inputBlocked && this.pressedThisStep.has(a);
  }

  wasReleased(a: ActionName): boolean {
    return this.releasedThisStep.has(a);
  }

  isKeyDown(code: string): boolean {
    return this.rawKeys.has(code);
  }

  /** Consume mouse delta for this simulation step. */
  takeMouse(): { dx: number; dy: number } {
    const r = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return r;
  }

  takeWheel(): number {
    const w = this.wheelDelta;
    this.wheelDelta = 0;
    return w;
  }

  /** Called at the end of each simulation step. */
  endStep(): void {
    this.pressedThisStep.clear();
    this.releasedThisStep.clear();
  }

  requestPointerLock(): void {
    if (this.syntheticPointer) {
      this.pointerLocked = true;
      this.onPointerLockChange?.(true);
      return;
    }
    const el = this.canvas as HTMLElement & { requestPointerLock?: () => Promise<void> | void };
    try {
      const p = el.requestPointerLock?.();
      if (p && typeof (p as Promise<void>).catch === 'function') {
        (p as Promise<void>).catch(() => {
          /* user gesture requirement not met; the click handler will retry */
        });
      }
    } catch {
      /* ignore */
    }
  }

  exitPointerLock(): void {
    if (this.syntheticPointer) {
      this.pointerLocked = false;
      this.onPointerLockChange?.(false);
      return;
    }
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

// ---------------------------------------------------------------------------
// Fullscreen
// ---------------------------------------------------------------------------

export function toggleFullscreen(el: HTMLElement): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined);
  } else {
    void el.requestFullscreen?.().catch(() => undefined);
  }
}

export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}

export const KEY_BINDINGS = DEFAULT_BINDINGS;
