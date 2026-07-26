import { bus, EV } from './events.js';
import { settings } from './settings.js';

/**
 * Keyboard / mouse input, pointer lock and fullscreen ownership.
 *
 * Two lock modes exist:
 *  - native  : real Pointer Lock API, used in normal play.
 *  - virtual : the canvas keeps focus and raw mouse deltas are read from
 *              movementX/Y (or injected by automation). Headless Chromium
 *              refuses native pointer lock, so Playwright drives this path.
 */

export const ACTIONS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  crouch: ['ControlLeft', 'KeyC'],
  walk: ['ShiftLeft'],
  sprint: ['ShiftRight'],
  reload: ['KeyR'],
  use: ['KeyE'],
  melee: ['KeyV'],
  flash: ['KeyG'],
  smoke: ['KeyH'],
  lean_left: ['KeyQ'],
  lean_right: ['KeyZ'],
  flashlight: ['KeyT'],
  scoreboard: ['Tab'],
  slot1: ['Digit1'],
  slot2: ['Digit2'],
  slot3: ['Digit3'],
  slot4: ['Digit4'],
  fullscreen: ['KeyF'],
  pause: ['Escape'],
  objectives: ['KeyO'],
  map: ['KeyM'],
};

export const CONTROL_REFERENCE = [
  { keys: 'W A S D', label: 'Move' },
  { keys: 'Mouse', label: 'Look' },
  { keys: 'Left Mouse', label: 'Fire' },
  { keys: 'Right Mouse', label: 'Aim down sights' },
  { keys: 'Shift (left)', label: 'Slow / quiet walk' },
  { keys: 'Ctrl or C', label: 'Crouch' },
  { keys: 'Space', label: 'Jump' },
  { keys: 'Q / Z', label: 'Lean left / right' },
  { keys: 'R', label: 'Reload' },
  { keys: 'E', label: 'Interact — doors, hostages, extraction' },
  { keys: '1 – 4', label: 'Primary / Secondary / Knife / Utility' },
  { keys: 'V', label: 'Melee (tactical knife)' },
  { keys: 'G', label: 'Throw flash device' },
  { keys: 'H', label: 'Throw smoke device' },
  { keys: 'T', label: 'Weapon light' },
  { keys: 'M', label: 'Expand tactical map' },
  { keys: 'O', label: 'Objectives' },
  { keys: 'F', label: 'Toggle fullscreen' },
  { keys: 'Esc', label: 'Pause / exit fullscreen' },
];

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressedThisFrame = new Set();
    this.releasedThisFrame = new Set();
    this.mouse = { dx: 0, dy: 0, left: false, right: false, leftPressed: false, rightPressed: false, wheel: 0 };
    this.locked = false;
    this.lockMode = 'none';
    this.enabled = true;
    this.consumeUi = false; // true while a menu owns the keyboard
    this._injectedDx = 0;
    this._injectedDy = 0;
    this._bind();
  }

  _bind() {
    const c = this.canvas;

    this._onKeyDown = (e) => {
      if (e.code === 'Tab') e.preventDefault();
      if (e.code === 'Space' && document.activeElement === document.body) e.preventDefault();
      if (this.keys.has(e.code)) return;
      this.keys.add(e.code);
      this.pressedThisFrame.add(e.code);
      bus.emit('input:keydown', e.code);
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.code);
      this.releasedThisFrame.add(e.code);
      bus.emit('input:keyup', e.code);
    };
    this._onBlur = () => {
      this.keys.clear();
      this.mouse.left = false;
      this.mouse.right = false;
    };

    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);

    this._onMouseMove = (e) => {
      if (!this.locked) return;
      const dx = e.movementX ?? 0;
      const dy = e.movementY ?? 0;
      this.mouse.dx += dx;
      this.mouse.dy += dy;
    };
    this._onMouseDown = (e) => {
      if (!this.locked) return;
      if (e.button === 0) {
        if (!this.mouse.left) this.mouse.leftPressed = true;
        this.mouse.left = true;
      }
      if (e.button === 2) {
        if (!this.mouse.right) this.mouse.rightPressed = true;
        this.mouse.right = true;
      }
    };
    this._onMouseUp = (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    };
    this._onWheel = (e) => {
      if (!this.locked) return;
      this.mouse.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    };
    this._onContext = (e) => e.preventDefault();

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('wheel', this._onWheel, { passive: false });
    c.addEventListener('contextmenu', this._onContext);

    this._onPointerLockChange = () => {
      const isLocked = document.pointerLockElement === c;
      if (isLocked) {
        this.locked = true;
        this.lockMode = 'native';
      } else if (this.lockMode === 'native') {
        this.locked = false;
        this.lockMode = 'none';
        bus.emit('input:lockLost');
      }
    };
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('pointerlockerror', () => {
      // Headless / restricted environments: fall back to virtual capture.
      this.lockMode = 'virtual';
      this.locked = true;
      console.info('[input] pointer lock unavailable — using virtual mouse capture');
    });
  }

  /** Request capture. Falls back to virtual capture when the browser refuses. */
  requestLock() {
    if (this.locked) return;
    const c = this.canvas;
    try {
      const p = c.requestPointerLock?.({ unadjustedMovement: false });
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          this.lockMode = 'virtual';
          this.locked = true;
        });
      }
    } catch {
      this.lockMode = 'virtual';
      this.locked = true;
    }
    // If the browser silently ignored the request, engage virtual capture.
    setTimeout(() => {
      if (!this.locked) {
        this.lockMode = 'virtual';
        this.locked = true;
      }
    }, 60);
    c.focus?.();
  }

  releaseLock() {
    if (this.lockMode === 'native' && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    this.locked = false;
    this.lockMode = 'none';
    this.keys.clear();
    this.mouse.left = false;
    this.mouse.right = false;
  }

  /** Automation hook — feed raw look deltas without a real mouse. */
  injectLook(dx, dy) {
    this.mouse.dx += dx;
    this.mouse.dy += dy;
  }

  injectKey(code, down) {
    if (down) {
      if (!this.keys.has(code)) this.pressedThisFrame.add(code);
      this.keys.add(code);
    } else {
      this.keys.delete(code);
      this.releasedThisFrame.add(code);
    }
  }

  injectMouseButton(button, down) {
    if (button === 0) {
      if (down && !this.mouse.left) this.mouse.leftPressed = true;
      this.mouse.left = down;
    } else if (button === 2) {
      if (down && !this.mouse.right) this.mouse.rightPressed = true;
      this.mouse.right = down;
    }
  }

  isDown(action) {
    const codes = ACTIONS[action];
    if (!codes) return false;
    for (const c of codes) if (this.keys.has(c)) return true;
    return false;
  }

  wasPressed(action) {
    const codes = ACTIONS[action];
    if (!codes) return false;
    for (const c of codes) if (this.pressedThisFrame.has(c)) return true;
    return false;
  }

  wasReleased(action) {
    const codes = ACTIONS[action];
    if (!codes) return false;
    for (const c of codes) if (this.releasedThisFrame.has(c)) return true;
    return false;
  }

  /** Look delta in degrees for this frame, already sensitivity-scaled. */
  consumeLook(sensScale = 1) {
    const s = settings.get('mouseSensitivity') * sensScale;
    const dx = this.mouse.dx * s;
    const dy = this.mouse.dy * s * (settings.get('invertY') ? -1 : 1);
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    return { dx, dy };
  }

  endFrame() {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
    this.mouse.leftPressed = false;
    this.mouse.rightPressed = false;
    this.mouse.wheel = 0;
  }
}

/* ------------------------------------------------------------------ */
/* Fullscreen                                                          */
/* ------------------------------------------------------------------ */

export const fullscreen = {
  get active() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  },
  async enter(el = document.documentElement) {
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (err) {
      console.info('[fullscreen] request rejected:', err?.message ?? err);
    }
  },
  async exit() {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch {
      /* ignore */
    }
  },
  async toggle(el = document.documentElement) {
    if (this.active) await this.exit();
    else await this.enter(el);
    bus.emit(EV.RESIZE);
  },
};
