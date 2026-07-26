/**
 * Pointer-lock first-person input.
 *
 * Mouse deltas accumulate between frames and are drained by the player
 * controller via `consumeLook()`, which keeps look sensitivity independent of
 * frame rate even when several mousemove events land in one frame.
 */

export type Action =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'jump'
  | 'crouch'
  | 'prone'
  | 'sprint'
  | 'fire'
  | 'ads'
  | 'reload'
  | 'melee'
  | 'grenade'
  | 'tactical'
  | 'use'
  | 'weapon1'
  | 'weapon2'
  | 'weapon3'
  | 'nextWeapon'
  | 'prevWeapon'
  | 'leanLeft'
  | 'leanRight'
  | 'killstreak1'
  | 'killstreak2'
  | 'killstreak3'
  | 'scoreboard'
  | 'pause'
  | 'photoMode';

const DEFAULT_BINDINGS: Record<string, Action> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'right',
  KeyD: 'right',
  Space: 'jump',
  ControlLeft: 'crouch',
  KeyC: 'crouch',
  KeyX: 'prone',
  ShiftLeft: 'sprint',
  KeyR: 'reload',
  KeyV: 'melee',
  KeyG: 'grenade',
  KeyT: 'tactical',
  KeyF: 'use',
  KeyE: 'use',
  Digit1: 'weapon1',
  Digit2: 'weapon2',
  Digit3: 'weapon3',
  KeyQ: 'leanLeft',
  KeyZ: 'leanRight',
  Digit4: 'killstreak1',
  Digit5: 'killstreak2',
  Digit6: 'killstreak3',
  Tab: 'scoreboard',
  Escape: 'pause',
  KeyP: 'photoMode',
};

// ArrowLeft was mis-assigned above; fix the mapping explicitly.
DEFAULT_BINDINGS.ArrowLeft = 'left';
DEFAULT_BINDINGS.ArrowRight = 'right';

export class InputManager {
  readonly bindings: Record<string, Action> = { ...DEFAULT_BINDINGS };

  private down = new Set<Action>();
  private pressed = new Set<Action>();
  private released = new Set<Action>();

  private lookX = 0;
  private lookY = 0;
  private wheelDelta = 0;

  /** Raw mouse sensitivity in radians per pixel before per-weapon scaling. */
  sensitivity = 0.0022;
  adsSensitivityScale = 0.65;
  invertY = false;
  /** 0 = raw input, higher values smooth the look at the cost of latency. */
  smoothing = 0;

  private smoothedX = 0;
  private smoothedY = 0;

  locked = false;
  enabled = true;

  private gamepadIndex: number | null = null;
  /** Analogue stick state, refreshed each frame from the Gamepad API. */
  readonly stick = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, triggerL: 0, triggerR: 0 };

  private element: HTMLElement;
  private listeners: Array<() => void> = [];
  private onLockChange?: (locked: boolean) => void;

  constructor(element: HTMLElement) {
    this.element = element;
    this.attach();
  }

  private attach(): void {
    const add = <K extends keyof DocumentEventMap>(
      target: EventTarget,
      type: K | string,
      fn: EventListenerOrEventListenerObject,
      opts?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, fn, opts);
      this.listeners.push(() => target.removeEventListener(type, fn, opts));
    };

    add(window, 'keydown', (e) => {
      const ev = e as KeyboardEvent;
      if (!this.enabled) return;
      // Tab and Space would otherwise scroll or move focus.
      if (ev.code === 'Tab' || ev.code === 'Space') ev.preventDefault();
      if (ev.repeat) return;
      const action = this.bindings[ev.code];
      if (action) this.setDown(action, true);
    });

    add(window, 'keyup', (e) => {
      const ev = e as KeyboardEvent;
      const action = this.bindings[ev.code];
      if (action) this.setDown(action, false);
    });

    add(this.element, 'mousedown', (e) => {
      const ev = e as MouseEvent;
      if (!this.enabled) return;
      if (ev.button === 0) this.setDown('fire', true);
      if (ev.button === 2) this.setDown('ads', true);
      if (ev.button === 1) this.setDown('melee', true);
    });

    add(window, 'mouseup', (e) => {
      const ev = e as MouseEvent;
      if (ev.button === 0) this.setDown('fire', false);
      if (ev.button === 2) this.setDown('ads', false);
      if (ev.button === 1) this.setDown('melee', false);
    });

    add(window, 'mousemove', (e) => {
      const ev = e as MouseEvent;
      if (!this.locked || !this.enabled) return;
      this.lookX += ev.movementX;
      this.lookY += ev.movementY;
    });

    add(this.element, 'wheel', (e) => {
      const ev = e as WheelEvent;
      if (!this.locked) return;
      ev.preventDefault();
      this.wheelDelta += ev.deltaY;
    }, { passive: false });

    add(this.element, 'contextmenu', (e) => e.preventDefault());

    add(document, 'pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.element;
      if (!this.locked) {
        // Avoid sticky inputs when focus is lost mid-press.
        this.down.clear();
        this.lookX = this.lookY = 0;
      }
      this.onLockChange?.(this.locked);
    });

    add(window, 'blur', () => {
      this.down.clear();
      this.lookX = this.lookY = 0;
    });

    add(window, 'gamepadconnected', (e) => {
      this.gamepadIndex = (e as GamepadEvent).gamepad.index;
    });
    add(window, 'gamepaddisconnected', () => {
      this.gamepadIndex = null;
    });
  }

  private setDown(action: Action, isDown: boolean): void {
    if (isDown) {
      if (!this.down.has(action)) this.pressed.add(action);
      this.down.add(action);
    } else {
      if (this.down.has(action)) this.released.add(action);
      this.down.delete(action);
    }
  }

  requestLock(): void {
    if (this.locked) return;
    // `unadjustedMovement` bypasses OS pointer acceleration where supported.
    const el = this.element as HTMLElement & {
      requestPointerLock(options?: { unadjustedMovement?: boolean }): Promise<void> | void;
    };
    try {
      const res = el.requestPointerLock({ unadjustedMovement: true });
      if (res && typeof (res as Promise<void>).catch === 'function') {
        (res as Promise<void>).catch(() => el.requestPointerLock());
      }
    } catch {
      el.requestPointerLock();
    }
  }

  exitLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  setLockChangeHandler(fn: (locked: boolean) => void): void {
    this.onLockChange = fn;
  }

  isDown(action: Action): boolean {
    return this.down.has(action);
  }

  wasPressed(action: Action): boolean {
    return this.pressed.has(action);
  }

  wasReleased(action: Action): boolean {
    return this.released.has(action);
  }

  /**
   * Returns accumulated look delta in radians and clears it. `adsFactor` is
   * 0..1 and scales sensitivity down while aiming.
   */
  consumeLook(dt: number, adsFactor = 0): { yaw: number; pitch: number } {
    let dx = this.lookX;
    let dy = this.lookY;
    this.lookX = 0;
    this.lookY = 0;

    if (this.smoothing > 0 && dt > 0) {
      const a = 1 - Math.exp(-dt / Math.max(1e-4, this.smoothing));
      this.smoothedX += (dx - this.smoothedX) * a;
      this.smoothedY += (dy - this.smoothedY) * a;
      dx = this.smoothedX;
      dy = this.smoothedY;
    }

    // Gamepad look uses a cubic response curve for fine aim near centre.
    if (this.gamepadIndex !== null) {
      const gx = this.stick.lookX;
      const gy = this.stick.lookY;
      dx += gx * Math.abs(gx) * gx * 900 * dt;
      dy += gy * Math.abs(gy) * gy * 700 * dt;
    }

    const scale = this.sensitivity * (1 - (1 - this.adsSensitivityScale) * adsFactor);
    return {
      yaw: -dx * scale,
      pitch: (this.invertY ? dy : -dy) * scale,
    };
  }

  consumeWheel(): number {
    const d = this.wheelDelta;
    this.wheelDelta = 0;
    return d;
  }

  /** Normalised movement vector from WASD plus the left stick. */
  moveVector(): { x: number; y: number } {
    let x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    let y = (this.isDown('forward') ? 1 : 0) - (this.isDown('back') ? 1 : 0);
    x += this.stick.moveX;
    y += this.stick.moveY;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  /** Call once per frame, after all systems have read input. */
  endFrame(): void {
    this.pressed.clear();
    this.released.clear();
    this.pollGamepad();
  }

  private pollGamepad(): void {
    if (this.gamepadIndex === null || !navigator.getGamepads) return;
    const pad = navigator.getGamepads()[this.gamepadIndex];
    if (!pad) return;

    const dz = (v: number) => (Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84);
    this.stick.moveX = dz(pad.axes[0] ?? 0);
    this.stick.moveY = -dz(pad.axes[1] ?? 0);
    this.stick.lookX = dz(pad.axes[2] ?? 0);
    this.stick.lookY = dz(pad.axes[3] ?? 0);
    this.stick.triggerL = pad.buttons[6]?.value ?? 0;
    this.stick.triggerR = pad.buttons[7]?.value ?? 0;

    const btn = (i: number) => pad.buttons[i]?.pressed ?? false;
    this.setDown('fire', this.stick.triggerR > 0.35);
    this.setDown('ads', this.stick.triggerL > 0.35);
    this.setDown('jump', btn(0));
    this.setDown('crouch', btn(1));
    this.setDown('reload', btn(2));
    this.setDown('sprint', btn(10));
    this.setDown('grenade', btn(5));
    this.setDown('melee', btn(11));
  }

  dispose(): void {
    for (const off of this.listeners) off();
    this.listeners.length = 0;
  }
}
