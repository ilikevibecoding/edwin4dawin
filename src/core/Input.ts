/**
 * Pointer-lock mouse + keyboard + gamepad input.
 *
 * Exposes edge-triggered (`pressed`/`released`) and level-triggered (`down`)
 * queries. Mouse deltas accumulate between frames and are drained by the
 * camera controller each frame via `consumeMouseDelta`.
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
  | 'lastWeapon'
  | 'fireMode'
  | 'killstreak1'
  | 'killstreak2'
  | 'killstreak3'
  | 'lean_left'
  | 'lean_right'
  | 'scoreboard'
  | 'pause'
  | 'inspect'
  | 'flashlight';

const DEFAULT_BINDS: Record<string, Action> = {
  KeyW: 'forward',
  KeyS: 'back',
  KeyA: 'left',
  KeyD: 'right',
  Space: 'jump',
  ControlLeft: 'crouch',
  KeyC: 'crouch',
  KeyX: 'prone',
  ShiftLeft: 'sprint',
  KeyR: 'reload',
  KeyV: 'melee',
  KeyG: 'grenade',
  KeyQ: 'tactical',
  KeyF: 'use',
  Digit1: 'weapon1',
  Digit2: 'weapon2',
  Digit3: 'killstreak1',
  Digit4: 'killstreak2',
  Digit5: 'killstreak3',
  KeyE: 'lastWeapon',
  KeyB: 'fireMode',
  KeyT: 'flashlight',
  KeyI: 'inspect',
  Tab: 'scoreboard',
  Escape: 'pause',
};

const MOUSE_BINDS: Record<number, Action> = {
  0: 'fire',
  2: 'ads',
  1: 'melee',
  3: 'lastWeapon',
  4: 'grenade',
};

export class Input {
  /** Raw mouse movement accumulated this frame, in device pixels. */
  private mouseDX = 0;
  private mouseDY = 0;
  private wheel = 0;

  private readonly held = new Set<Action>();
  private readonly pressedSet = new Set<Action>();
  private readonly releasedSet = new Set<Action>();
  private readonly binds: Record<string, Action> = { ...DEFAULT_BINDS };

  /** Radians of view rotation per device pixel at 1.0 sensitivity. */
  sensitivity = 0.0022;
  /** Multiplier applied while aiming down sights, scaled further by zoom. */
  adsSensitivityScale = 0.72;
  invertY = false;
  locked = false;
  enabled = true;

  private readonly element: HTMLElement;
  private readonly disposers: Array<() => void> = [];
  private gamepadIndex: number | null = null;
  /** Analog stick state, -1..1, refreshed each poll. */
  readonly stickMove = { x: 0, y: 0 };
  readonly stickLook = { x: 0, y: 0 };
  gamepadActive = false;

  constructor(element: HTMLElement) {
    this.element = element;
    this.attach();
  }

  private attach(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!this.enabled) return;
      const a = this.binds[e.code];
      if (!a) return;
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      if (!this.held.has(a)) this.pressedSet.add(a);
      this.held.add(a);
      this.gamepadActive = false;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const a = this.binds[e.code];
      if (!a) return;
      if (this.held.delete(a)) this.releasedSet.add(a);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (!this.enabled) return;
      const a = MOUSE_BINDS[e.button];
      if (!a) return;
      e.preventDefault();
      if (!this.held.has(a)) this.pressedSet.add(a);
      this.held.add(a);
      this.gamepadActive = false;
    };
    const onMouseUp = (e: MouseEvent) => {
      const a = MOUSE_BINDS[e.button];
      if (!a) return;
      if (this.held.delete(a)) this.releasedSet.add(a);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!this.locked || !this.enabled) return;
      // Chrome can emit an enormous spike on the frame pointer lock engages.
      const dx = e.movementX ?? 0;
      const dy = e.movementY ?? 0;
      if (Math.abs(dx) > 500 || Math.abs(dy) > 500) return;
      this.mouseDX += dx;
      this.mouseDY += dy;
    };
    const onWheel = (e: WheelEvent) => {
      if (!this.enabled) return;
      this.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    };
    const onContext = (e: Event) => e.preventDefault();
    const onLockChange = () => {
      this.locked = document.pointerLockElement === this.element;
      if (!this.locked) {
        // Never leave a key stuck down when focus is lost.
        for (const a of this.held) this.releasedSet.add(a);
        this.held.clear();
      }
    };
    const onBlur = () => {
      for (const a of this.held) this.releasedSet.add(a);
      this.held.clear();
    };
    const onGamepadConnected = (e: GamepadEvent) => {
      this.gamepadIndex = e.gamepad.index;
    };
    const onGamepadDisconnected = () => {
      this.gamepadIndex = null;
      this.gamepadActive = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('contextmenu', onContext);
    window.addEventListener('blur', onBlur);
    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('gamepadconnected', onGamepadConnected);
    window.addEventListener('gamepaddisconnected', onGamepadDisconnected);

    this.disposers.push(
      () => window.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('keyup', onKeyUp),
      () => window.removeEventListener('mousedown', onMouseDown),
      () => window.removeEventListener('mouseup', onMouseUp),
      () => window.removeEventListener('mousemove', onMouseMove),
      () => window.removeEventListener('wheel', onWheel),
      () => window.removeEventListener('contextmenu', onContext),
      () => window.removeEventListener('blur', onBlur),
      () => document.removeEventListener('pointerlockchange', onLockChange),
      () => window.removeEventListener('gamepadconnected', onGamepadConnected),
      () => window.removeEventListener('gamepaddisconnected', onGamepadDisconnected),
    );
  }

  requestLock(): void {
    if (!this.locked) void this.element.requestPointerLock();
  }

  exitLock(): void {
    if (this.locked) document.exitPointerLock();
  }

  down(a: Action): boolean {
    return this.held.has(a);
  }

  pressed(a: Action): boolean {
    return this.pressedSet.has(a);
  }

  released(a: Action): boolean {
    return this.releasedSet.has(a);
  }

  consumeMouseDelta(out: { x: number; y: number }): void {
    out.x = this.mouseDX;
    out.y = this.invertY ? -this.mouseDY : this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  consumeWheel(): number {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  /** Call once per frame *after* all systems have read input. */
  endFrame(): void {
    this.pressedSet.clear();
    this.releasedSet.clear();
  }

  /** Call once per frame before systems read input. */
  pollGamepad(): void {
    this.stickMove.x = 0;
    this.stickMove.y = 0;
    this.stickLook.x = 0;
    this.stickLook.y = 0;
    if (this.gamepadIndex === null || !navigator.getGamepads) return;
    const gp = navigator.getGamepads()[this.gamepadIndex];
    if (!gp) return;

    const dz = (v: number) => (Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84);
    this.stickMove.x = dz(gp.axes[0] ?? 0);
    this.stickMove.y = dz(gp.axes[1] ?? 0);
    this.stickLook.x = dz(gp.axes[2] ?? 0);
    this.stickLook.y = dz(gp.axes[3] ?? 0);
    if (
      this.stickMove.x || this.stickMove.y ||
      this.stickLook.x || this.stickLook.y
    ) {
      this.gamepadActive = true;
    }

    const btn = (i: number) => (gp.buttons[i]?.pressed ?? false) || (gp.buttons[i]?.value ?? 0) > 0.5;
    const mapping: Array<[number, Action]> = [
      [0, 'jump'],
      [1, 'crouch'],
      [2, 'reload'],
      [3, 'lastWeapon'],
      [4, 'grenade'],
      [5, 'tactical'],
      [6, 'ads'],
      [7, 'fire'],
      [10, 'sprint'],
      [11, 'melee'],
    ];
    for (const [i, a] of mapping) {
      const isDown = btn(i);
      if (isDown && !this.held.has(a)) {
        this.pressedSet.add(a);
        this.held.add(a);
        this.gamepadActive = true;
      } else if (!isDown && this.held.has(a)) {
        this.held.delete(a);
        this.releasedSet.add(a);
      }
    }
  }

  rebind(code: string, action: Action): void {
    this.binds[code] = action;
  }

  /**
   * Holds or releases an action programmatically.
   *
   * Used by the deterministic capture harness: gameplay systems re-read input
   * every tick, so a scenario cannot pose the player by writing to their state
   * directly — it has to drive the same input the player would.
   */
  forceAction(a: Action, down: boolean): void {
    if (down) {
      if (!this.held.has(a)) this.pressedSet.add(a);
      this.held.add(a);
    } else if (this.held.delete(a)) {
      this.releasedSet.add(a);
    }
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.disposers.length = 0;
  }
}
