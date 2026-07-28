import { clamp } from './MathUtils';

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
  | 'aim'
  | 'reload'
  | 'melee'
  | 'use'
  | 'grenade'
  | 'tactical'
  | 'switchWeapon'
  | 'lastWeapon'
  | 'weapon1'
  | 'weapon2'
  | 'leanLeft'
  | 'leanRight'
  | 'killstreak1'
  | 'killstreak2'
  | 'killstreak3'
  | 'scoreboard'
  | 'pause'
  | 'toggleFireMode'
  | 'flashlight'
  | 'photoMode';

type Binding = { keys: string[]; mouse?: number[] };

const DEFAULT_BINDINGS: Record<ActionName, Binding> = {
  forward: { keys: ['KeyW', 'ArrowUp'] },
  back: { keys: ['KeyS', 'ArrowDown'] },
  left: { keys: ['KeyA', 'ArrowLeft'] },
  right: { keys: ['KeyD', 'ArrowRight'] },
  jump: { keys: ['Space'] },
  crouch: { keys: ['ControlLeft', 'KeyC'] },
  prone: { keys: ['KeyZ'] },
  sprint: { keys: ['ShiftLeft'] },
  fire: { keys: [], mouse: [0] },
  aim: { keys: [], mouse: [2] },
  reload: { keys: ['KeyR'] },
  melee: { keys: ['KeyV'], mouse: [1] },
  use: { keys: ['KeyF'] },
  grenade: { keys: ['KeyG'] },
  // Lean owns Q/E because that pairing is muscle memory from tactical shooters,
  // so tactical equipment moves to T rather than colliding with leanLeft.
  tactical: { keys: ['KeyT'] },
  switchWeapon: { keys: ['KeyX'] },
  lastWeapon: { keys: ['Tab'] },
  weapon1: { keys: ['Digit1'] },
  weapon2: { keys: ['Digit2'] },
  leanLeft: { keys: ['KeyQ'] },
  leanRight: { keys: ['KeyE'] },
  killstreak1: { keys: ['Digit3'] },
  killstreak2: { keys: ['Digit4'] },
  killstreak3: { keys: ['Digit5'] },
  scoreboard: { keys: ['Backquote'] },
  pause: { keys: ['Escape'] },
  toggleFireMode: { keys: ['KeyB'] },
  flashlight: { keys: ['KeyL'] },
  photoMode: { keys: ['KeyP'] },
};

/**
 * Pointer-lock driven FPS input.
 *
 * Mouse deltas accumulate across the frame and are consumed once per update by
 * the player controller, so raw sub-frame motion is never dropped even when the
 * browser coalesces pointer events.
 */
export class Input {
  private readonly down = new Set<string>();
  private readonly pressedThisFrame = new Set<string>();
  private readonly releasedThisFrame = new Set<string>();
  private readonly mouseDown = new Set<number>();
  private readonly mousePressedThisFrame = new Set<number>();
  private readonly mouseReleasedThisFrame = new Set<number>();
  private readonly forced = new Set<ActionName>();
  private readonly forcedPressed = new Set<ActionName>();

  private bindings: Record<ActionName, Binding> = structuredClone(DEFAULT_BINDINGS);

  /** Accumulated raw mouse delta since the last consume, in pixels. */
  mouseDeltaX = 0;
  mouseDeltaY = 0;
  wheelDelta = 0;

  /** Normalised pointer position in CSS pixels (for menus). */
  pointerX = 0;
  pointerY = 0;

  locked = false;
  enabled = true;

  sensitivity = 1.0;
  adsSensitivityScale = 0.72;
  invertY = false;

  private readonly element: HTMLElement;
  private readonly listeners: Array<() => void> = [];
  private lockChangeCbs: Array<(locked: boolean) => void> = [];

  constructor(element: HTMLElement) {
    this.element = element;
    this.attach();
  }

  private attach(): void {
    const add = <K extends keyof DocumentEventMap>(
      target: EventTarget,
      type: K | string,
      fn: (ev: never) => void,
      opts?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, fn as EventListener, opts);
      this.listeners.push(() => target.removeEventListener(type, fn as EventListener, opts));
    };

    add(window, 'keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      // Keep browser shortcuts usable while still owning gameplay keys.
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!this.enabled) return;
      this.down.add(e.code);
      this.pressedThisFrame.add(e.code);
    });

    add(window, 'keyup', (e: KeyboardEvent) => {
      this.down.delete(e.code);
      this.releasedThisFrame.add(e.code);
    });

    add(window, 'blur', () => this.clearAll());

    add(this.element, 'mousedown', (e: MouseEvent) => {
      if (!this.enabled) return;
      this.mouseDown.add(e.button);
      this.mousePressedThisFrame.add(e.button);
    });

    add(window, 'mouseup', (e: MouseEvent) => {
      this.mouseDown.delete(e.button);
      this.mouseReleasedThisFrame.add(e.button);
    });

    add(this.element, 'contextmenu', (e: Event) => e.preventDefault());

    add(window, 'mousemove', (e: MouseEvent) => {
      this.pointerX = e.clientX;
      this.pointerY = e.clientY;
      if (!this.locked || !this.enabled) return;
      // movementX/Y can spike wildly on some drivers; clamp to a sane range.
      this.mouseDeltaX += clamp(e.movementX ?? 0, -400, 400);
      this.mouseDeltaY += clamp(e.movementY ?? 0, -400, 400);
    });

    add(
      window,
      'wheel',
      (e: WheelEvent) => {
        if (!this.enabled) return;
        this.wheelDelta += Math.sign(e.deltaY);
      },
      { passive: true },
    );

    add(document, 'pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.element;
      if (!this.locked) this.clearAll();
      for (const cb of this.lockChangeCbs) cb(this.locked);
    });

    add(document, 'pointerlockerror', () => {
      console.warn('[Input] pointer lock request failed');
    });
  }

  onLockChange(cb: (locked: boolean) => void): () => void {
    this.lockChangeCbs.push(cb);
    return () => {
      this.lockChangeCbs = this.lockChangeCbs.filter((c) => c !== cb);
    };
  }

  async requestLock(): Promise<void> {
    if (this.locked) return;
    try {
      const p = this.element.requestPointerLock({ unadjustedMovement: true } as never) as
        | Promise<void>
        | undefined;
      if (p && typeof p.then === 'function') await p;
    } catch {
      // Raw input is unsupported on this platform — fall back to accelerated deltas.
      try {
        this.element.requestPointerLock();
      } catch {
        /* user gesture required; the menu will retry */
      }
    }
  }

  exitLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private resolve(action: ActionName): Binding {
    return this.bindings[action];
  }

  isDown(action: ActionName): boolean {
    if (!this.enabled) return false;
    if (this.forced.has(action)) return true;
    const b = this.resolve(action);
    for (const k of b.keys) if (this.down.has(k)) return true;
    if (b.mouse) for (const m of b.mouse) if (this.mouseDown.has(m)) return true;
    return false;
  }

  /**
   * Hold an action down without a real device event. Only the automated capture
   * harness uses this; there is no other way to photograph a state that only
   * exists while an input is held, such as mid-burst or fully aimed.
   */
  forceAction(action: ActionName, down: boolean): void {
    if (down) {
      if (!this.forced.has(action)) this.forcedPressed.add(action);
      this.forced.add(action);
    } else {
      this.forced.delete(action);
    }
  }

  wasPressed(action: ActionName): boolean {
    if (!this.enabled) return false;
    if (this.forcedPressed.has(action)) return true;
    const b = this.resolve(action);
    for (const k of b.keys) if (this.pressedThisFrame.has(k)) return true;
    if (b.mouse) for (const m of b.mouse) if (this.mousePressedThisFrame.has(m)) return true;
    return false;
  }

  wasReleased(action: ActionName): boolean {
    const b = this.resolve(action);
    for (const k of b.keys) if (this.releasedThisFrame.has(k)) return true;
    if (b.mouse) for (const m of b.mouse) if (this.mouseReleasedThisFrame.has(m)) return true;
    return false;
  }

  keyDown(code: string): boolean {
    return this.down.has(code);
  }

  keyPressed(code: string): boolean {
    return this.pressedThisFrame.has(code);
  }

  rebind(action: ActionName, binding: Binding): void {
    this.bindings[action] = binding;
  }

  resetBindings(): void {
    this.bindings = structuredClone(DEFAULT_BINDINGS);
  }

  /** Axis pair for WASD movement, normalised to unit length when diagonal. */
  moveAxis(out: { x: number; y: number }): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.isDown('right')) x += 1;
    if (this.isDown('left')) x -= 1;
    if (this.isDown('forward')) y += 1;
    if (this.isDown('back')) y -= 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    out.x = x;
    out.y = y;
    return out;
  }

  /** Consume accumulated look delta (already scaled by sensitivity). */
  consumeLook(adsFactor = 0): { x: number; y: number } {
    const scale = this.sensitivity * (1 - adsFactor * (1 - this.adsSensitivityScale));
    const x = this.mouseDeltaX * scale;
    const y = this.mouseDeltaY * scale * (this.invertY ? -1 : 1);
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return { x, y };
  }

  consumeWheel(): number {
    const w = this.wheelDelta;
    this.wheelDelta = 0;
    return w;
  }

  /** Called at the very end of each frame. */
  endFrame(): void {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
    this.mousePressedThisFrame.clear();
    this.mouseReleasedThisFrame.clear();
    this.forcedPressed.clear();
  }

  clearAll(): void {
    this.down.clear();
    this.mouseDown.clear();
    this.forced.clear();
    this.forcedPressed.clear();
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
    this.mousePressedThisFrame.clear();
    this.mouseReleasedThisFrame.clear();
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }

  dispose(): void {
    for (const off of this.listeners) off();
    this.listeners.length = 0;
  }
}
