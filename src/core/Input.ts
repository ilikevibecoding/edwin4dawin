import { clamp } from './MathX';

export type ActionName =
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
  | 'use'
  | 'weapon1'
  | 'weapon2'
  | 'killstreak'
  | 'lean_left'
  | 'lean_right'
  | 'scoreboard'
  | 'pause';

const DEFAULT_BINDINGS: Record<string, ActionName> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'right' as ActionName, // overwritten below; kept explicit for clarity
  KeyD: 'right',
  Space: 'jump',
  ControlLeft: 'crouch',
  KeyC: 'crouch',
  KeyX: 'prone',
  ShiftLeft: 'sprint',
  KeyR: 'reload',
  KeyV: 'melee',
  KeyG: 'grenade',
  KeyF: 'use',
  KeyE: 'use',
  Digit1: 'weapon1',
  Digit2: 'weapon2',
  KeyQ: 'lean_left',
  KeyZ: 'killstreak',
  KeyB: 'killstreak',
  Tab: 'scoreboard',
  Escape: 'pause',
};
DEFAULT_BINDINGS['ArrowLeft'] = 'left';
DEFAULT_BINDINGS['ArrowRight'] = 'right';

/**
 * Input aggregator: keyboard, mouse (pointer lock), and gamepad unified into
 * named actions with edge detection.
 *
 * Mouse deltas accumulate between frames and are consumed by the camera, so
 * look input never drops events at low frame rates.
 */
export class Input {
  private down = new Set<ActionName>();
  private pressedThisFrame = new Set<ActionName>();
  private releasedThisFrame = new Set<ActionName>();
  private bindings = { ...DEFAULT_BINDINGS };

  mouseDX = 0;
  mouseDY = 0;
  wheel = 0;
  sensitivity = 1;
  invertY = false;
  locked = false;
  enabled = true;

  /** Analog stick state, populated from gamepad when present. */
  moveX = 0;
  moveY = 0;
  lookX = 0;
  lookY = 0;
  gamepadActive = false;

  private element: HTMLElement | null = null;
  private listeners: Array<[EventTarget, string, any, any?]> = [];
  onLockChange: ((locked: boolean) => void) | null = null;

  attach(element: HTMLElement) {
    this.element = element;
    const add = (t: EventTarget, ev: string, fn: any, opts?: any) => {
      t.addEventListener(ev, fn, opts);
      this.listeners.push([t, ev, fn, opts]);
    };

    add(window, 'keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      const a = this.bindings[e.code];
      // Let the browser keep F-keys and reload shortcuts.
      if (a && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        this.setAction(a, true);
      }
    });

    add(window, 'keyup', (e: KeyboardEvent) => {
      const a = this.bindings[e.code];
      if (a) {
        e.preventDefault();
        this.setAction(a, false);
      }
    });

    add(window, 'blur', () => this.releaseAll());

    add(element, 'mousedown', (e: MouseEvent) => {
      if (!this.locked) return;
      if (e.button === 0) this.setAction('fire', true);
      if (e.button === 2) this.setAction('ads', true);
      if (e.button === 1) this.setAction('melee', true);
    });

    add(window, 'mouseup', (e: MouseEvent) => {
      if (e.button === 0) this.setAction('fire', false);
      if (e.button === 2) this.setAction('ads', false);
      if (e.button === 1) this.setAction('melee', false);
    });

    add(element, 'contextmenu', (e: Event) => e.preventDefault());

    add(document, 'mousemove', (e: MouseEvent) => {
      if (!this.locked || !this.enabled) return;
      // movementX can spike on some platforms; clamp to reject teleports.
      this.mouseDX += clamp(e.movementX ?? 0, -400, 400) * this.sensitivity;
      this.mouseDY += clamp(e.movementY ?? 0, -400, 400) * this.sensitivity * (this.invertY ? -1 : 1);
    });

    add(
      element,
      'wheel',
      (e: WheelEvent) => {
        if (!this.locked) return;
        e.preventDefault();
        this.wheel += Math.sign(e.deltaY);
      },
      { passive: false }
    );

    add(document, 'pointerlockchange', () => {
      const wasLocked = this.locked;
      this.locked = document.pointerLockElement === this.element;
      if (!this.locked && wasLocked) this.releaseAll();
      this.onLockChange?.(this.locked);
    });
  }

  requestLock() {
    if (!this.element || this.locked) return;
    const el = this.element as any;
    // unadjustedMovement bypasses OS mouse acceleration where supported.
    try {
      el.requestPointerLock({ unadjustedMovement: true })?.catch?.(() => el.requestPointerLock());
    } catch {
      el.requestPointerLock();
    }
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private setAction(a: ActionName, isDown: boolean) {
    if (!this.enabled && a !== 'pause') return;
    if (isDown) {
      if (!this.down.has(a)) this.pressedThisFrame.add(a);
      this.down.add(a);
    } else {
      if (this.down.has(a)) this.releasedThisFrame.add(a);
      this.down.delete(a);
    }
  }

  private releaseAll() {
    for (const a of this.down) this.releasedThisFrame.add(a);
    this.down.clear();
    this.mouseDX = this.mouseDY = 0;
  }

  isDown(a: ActionName) {
    return this.down.has(a);
  }
  pressed(a: ActionName) {
    return this.pressedThisFrame.has(a);
  }
  released(a: ActionName) {
    return this.releasedThisFrame.has(a);
  }

  /** Normalized movement vector; magnitude is clamped to 1 for diagonals. */
  getMoveAxis(): [number, number] {
    let x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    let y = (this.isDown('forward') ? 1 : 0) - (this.isDown('back') ? 1 : 0);
    if (this.gamepadActive && (Math.abs(this.moveX) > 0.01 || Math.abs(this.moveY) > 0.01)) {
      x = this.moveX;
      y = this.moveY;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return [x, y];
  }

  consumeLook(): [number, number] {
    let dx = this.mouseDX;
    let dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    if (this.gamepadActive) {
      dx += this.lookX * 900;
      dy += this.lookY * 900;
    }
    return [dx, dy];
  }

  pollGamepad(dt: number) {
    const pads = navigator.getGamepads?.();
    const pad = pads && [...pads].find((p) => p && p.connected);
    if (!pad) {
      this.gamepadActive = false;
      return;
    }
    const dz = (v: number, d = 0.16) => {
      const a = Math.abs(v);
      return a < d ? 0 : Math.sign(v) * ((a - d) / (1 - d)) ** 1.6;
    };
    this.moveX = dz(pad.axes[0] ?? 0);
    this.moveY = -dz(pad.axes[1] ?? 0);
    this.lookX = dz(pad.axes[2] ?? 0) * dt * this.sensitivity;
    this.lookY = dz(pad.axes[3] ?? 0) * dt * this.sensitivity * (this.invertY ? -1 : 1);

    const btn = (i: number) => !!pad.buttons[i]?.pressed;
    this.setAction('fire', (pad.buttons[7]?.value ?? 0) > 0.5);
    this.setAction('ads', (pad.buttons[6]?.value ?? 0) > 0.4);
    this.setAction('jump', btn(0));
    this.setAction('crouch', btn(1));
    this.setAction('reload', btn(2));
    this.setAction('weapon1', btn(3));
    this.setAction('sprint', btn(10));
    this.setAction('melee', btn(11));
    this.setAction('grenade', btn(5));
    this.setAction('killstreak', btn(4));

    this.gamepadActive =
      Math.abs(this.moveX) + Math.abs(this.moveY) + Math.abs(this.lookX) + Math.abs(this.lookY) >
        0.001 || pad.buttons.some((b) => b.pressed);
  }

  rumble(strong = 0.5, weak = 0.3, ms = 120) {
    const pads = navigator.getGamepads?.();
    const pad = pads && [...pads].find((p) => p && p.connected);
    (pad as any)?.vibrationActuator
      ?.playEffect?.('dual-rumble', {
        duration: ms,
        strongMagnitude: strong,
        weakMagnitude: weak,
      })
      .catch(() => {});
  }

  endFrame() {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
    this.wheel = 0;
  }

  dispose() {
    for (const [t, ev, fn, opts] of this.listeners) t.removeEventListener(ev, fn, opts);
    this.listeners.length = 0;
  }
}
