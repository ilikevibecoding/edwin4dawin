/**
 * Input service: keyboard/mouse → actions, pointer lock, deterministic queueing.
 * DOM events enqueue; the fixed simulation step drains the queue, so test-mode
 * synthetic input and real input follow the identical code path.
 */
export type Action =
  | 'forward' | 'back' | 'left' | 'right'
  | 'jump' | 'crouch' | 'walk'
  | 'fire' | 'aim' | 'reload' | 'interact'
  | 'slot1' | 'slot2' | 'slot3' | 'slot4' | 'slot5'
  | 'pause' | 'fullscreen' | 'objectives' | 'command';

const KEYMAP: Record<string, Action> = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'jump',
  ControlLeft: 'crouch', KeyC: 'crouch',
  ShiftLeft: 'walk',
  KeyR: 'reload',
  KeyE: 'interact',
  Digit1: 'slot1', Digit2: 'slot2', Digit3: 'slot3', Digit4: 'slot4', Digit5: 'slot5',
  Escape: 'pause',
  KeyF: 'fullscreen',
  Tab: 'objectives',
  KeyX: 'command',
};

type QueueItem =
  | { t: 'down'; a: Action }
  | { t: 'up'; a: Action }
  | { t: 'look'; dx: number; dy: number };

export class InputService {
  /** Actions currently held (as of last drained step). */
  private down = new Set<Action>();
  /** Actions that had a down edge during the last drained step. */
  private pressed = new Set<Action>();
  private queue: QueueItem[] = [];
  private lookDx = 0;
  private lookDy = 0;
  pointerLocked = false;
  /** UI callbacks (menus react immediately, outside sim). */
  onUiKey: (action: Action, code: string) => void = () => {};
  onPointerLockChange: (locked: boolean) => void = () => {};
  private canvas: HTMLCanvasElement | null = null;

  bind(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (e.code === 'Tab' || e.code === 'Space' || a) e.preventDefault();
      if (!a) return;
      if (!e.repeat) {
        this.queue.push({ t: 'down', a });
        this.onUiKey(a, e.code);
      }
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      this.queue.push({ t: 'up', a });
    });
    window.addEventListener('mousedown', (e) => {
      if (!this.pointerLocked) return;
      if (e.button === 0) this.queue.push({ t: 'down', a: 'fire' });
      if (e.button === 2) this.queue.push({ t: 'down', a: 'aim' });
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.queue.push({ t: 'up', a: 'fire' });
      if (e.button === 2) this.queue.push({ t: 'up', a: 'aim' });
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.queue.push({ t: 'look', dx: e.movementX, dy: e.movementY });
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      this.onPointerLockChange(this.pointerLocked);
    });
    document.addEventListener('pointerlockerror', () => {
      this.pointerLocked = false;
      this.onPointerLockChange(false);
    });
  }

  requestPointerLock(): void {
    if (this.canvas && document.pointerLockElement !== this.canvas) {
      // unadjustedMovement avoids OS mouse acceleration where supported.
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true } as never) as unknown;
      if (p instanceof Promise) p.catch(() => this.canvas?.requestPointerLock());
    }
  }

  exitPointerLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** Synthetic input for tests/QA — identical queue as real input. */
  syntheticDown(a: Action): void { this.queue.push({ t: 'down', a }); }
  syntheticUp(a: Action): void { this.queue.push({ t: 'up', a }); }
  syntheticLook(dx: number, dy: number): void { this.queue.push({ t: 'look', dx, dy }); }

  /** Drain queued events; called once per fixed simulation step. */
  drain(): void {
    this.pressed.clear();
    this.lookDx = 0;
    this.lookDy = 0;
    for (const item of this.queue) {
      if (item.t === 'down') {
        if (!this.down.has(item.a)) this.pressed.add(item.a);
        this.down.add(item.a);
      } else if (item.t === 'up') {
        this.down.delete(item.a);
      } else {
        this.lookDx += item.dx;
        this.lookDy += item.dy;
      }
    }
    this.queue.length = 0;
  }

  isDown(a: Action): boolean { return this.down.has(a); }
  wasPressed(a: Action): boolean { return this.pressed.has(a); }
  look(): { dx: number; dy: number } { return { dx: this.lookDx, dy: this.lookDy }; }

  releaseAll(): void {
    this.queue.length = 0;
    this.down.clear();
    this.pressed.clear();
    this.lookDx = this.lookDy = 0;
  }
}

export const input = new InputService();
