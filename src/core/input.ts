const PREVENT_DEFAULT = new Set([
  'Space',
  'Tab',
  'KeyE',
  'KeyF',
  'KeyM',
  'KeyR',
  'KeyV',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

export type MouseButton = 0 | 1 | 2;

/**
 * Keyboard + pointer-lock mouse state with per-frame edge detection.
 * Call `endFrame()` once at the end of every update.
 */
export class Input {
  readonly down = new Set<string>();
  private pressedThisFrame = new Set<string>();
  private releasedThisFrame = new Set<string>();

  mouseDX = 0;
  mouseDY = 0;
  wheelDelta = 0;
  readonly mouseDown = new Set<number>();
  private mousePressedThisFrame = new Set<number>();
  private mouseReleasedThisFrame = new Set<number>();

  pointerLocked = false;
  sensitivity = 0.0022;
  invertY = false;
  /** Set false while a menu/overlay owns the keyboard. */
  enabled = true;

  private canvas: HTMLElement;
  private onLockChange?: (locked: boolean) => void;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;

    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onPointerLockChange(cb: (locked: boolean) => void): void {
    this.onLockChange = cb;
  }

  requestPointerLock(): void {
    if (this.pointerLocked) return;
    // Chrome rejects a re-lock too soon after the user escaped one; swallow it
    // and let the player click the canvas to resume.
    const result = this.canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
    if (result && typeof result.catch === 'function') result.catch(() => {});
  }

  exitPointerLock(): void {
    if (this.pointerLocked) document.exitPointerLock?.();
  }

  isDown(code: string): boolean {
    return this.enabled && this.down.has(code);
  }

  wasPressed(code: string): boolean {
    return this.enabled && this.pressedThisFrame.has(code);
  }

  wasReleased(code: string): boolean {
    return this.enabled && this.releasedThisFrame.has(code);
  }

  isMouseDown(button: MouseButton): boolean {
    return this.enabled && this.mouseDown.has(button);
  }

  wasMousePressed(button: MouseButton): boolean {
    return this.enabled && this.mousePressedThisFrame.has(button);
  }

  wasMouseReleased(button: MouseButton): boolean {
    return this.enabled && this.mouseReleasedThisFrame.has(button);
  }

  /** -1 / 0 / +1 from a pair of keys. */
  axis(negative: string, positive: string): number {
    return (this.isDown(positive) ? 1 : 0) - (this.isDown(negative) ? 1 : 0);
  }

  /** Test hook: fakes a key press for one frame (used by the headless smoke test). */
  simulatePress(code: string): void {
    this.down.add(code);
    this.pressedThisFrame.add(code);
  }

  simulateRelease(code: string): void {
    this.down.delete(code);
    this.releasedThisFrame.add(code);
  }

  simulateMousePress(button: MouseButton): void {
    this.mouseDown.add(button);
    this.mousePressedThisFrame.add(button);
  }

  simulateMouseRelease(button: MouseButton): void {
    this.mouseDown.delete(button);
    this.mouseReleasedThisFrame.add(button);
  }

  /** Test hook: pretend the pointer is locked so look input is accepted. */
  forcePointerLock(locked: boolean): void {
    this.pointerLocked = locked;
  }

  endFrame(): void {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
    this.mousePressedThisFrame.clear();
    this.mouseReleasedThisFrame.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheelDelta = 0;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.down.add(e.code);
    this.pressedThisFrame.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
    this.releasedThisFrame.add(e.code);
  };

  private handleBlur = (): void => {
    this.down.clear();
    this.mouseDown.clear();
  };

  private handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.canvas;
    if (!this.pointerLocked) {
      this.down.clear();
      this.mouseDown.clear();
    }
    this.onLockChange?.(this.pointerLocked);
  };

  private handleMouseDown = (e: MouseEvent): void => {
    this.mouseDown.add(e.button);
    this.mousePressedThisFrame.add(e.button);
  };

  private handleMouseUp = (e: MouseEvent): void => {
    this.mouseDown.delete(e.button);
    this.mouseReleasedThisFrame.add(e.button);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.pointerLocked) return;
    this.mouseDX += e.movementX * this.sensitivity;
    this.mouseDY += e.movementY * this.sensitivity * (this.invertY ? -1 : 1);
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.wheelDelta += Math.sign(e.deltaY);
  };
}
