import { settings } from './settings.js';
import { bus } from './events.js';

export const DEFAULT_BINDINGS = {
  forward: ['KeyW'],
  back: ['KeyS'],
  left: ['KeyA'],
  right: ['KeyD'],
  jump: ['Space'],
  crouch: ['ControlLeft', 'KeyC'],
  walk: ['ShiftLeft'],
  sprint: ['AltLeft'],
  reload: ['KeyR'],
  use: ['KeyE'],
  slot1: ['Digit1'],
  slot2: ['Digit2'],
  slot3: ['Digit3'],
  slot4: ['Digit4'],
  slot5: ['Digit5'],
  lastWeapon: ['KeyQ'],
  flash: ['KeyG'],
  smoke: ['KeyH'],
  fullscreen: ['KeyF'],
  pause: ['Escape'],
  objectives: ['Tab'],
  map: ['KeyM'],
  flashlight: ['KeyL'],
  inspect: ['KeyI'],
};

/**
 * Input owns keyboard, mouse, pointer lock and fullscreen. All state is
 * readable synchronously by the player controller. Automation can drive the
 * exact same state through `setActionState` / `applyLookDelta`, which keeps the
 * deterministic test path identical to the human path.
 */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.bindings = structuredClone(DEFAULT_BINDINGS);
    this.keys = new Set();
    this.actions = new Set();
    this.synthetic = new Set(); // actions forced on by automation
    this.pressedThisStep = new Set();
    this.releasedThisStep = new Set();
    this.mouse = { dx: 0, dy: 0, left: false, right: false, wheel: 0 };
    this._pendingLook = { x: 0, y: 0 };
    this.pointerLocked = false;
    this.enabled = true;
    this.captureLook = true;
    this._codeToActions = new Map();
    this._rebuildBindingIndex();
    this._install();
  }

  _rebuildBindingIndex() {
    this._codeToActions.clear();
    for (const [action, codes] of Object.entries(this.bindings)) {
      for (const code of codes) {
        if (!this._codeToActions.has(code)) this._codeToActions.set(code, []);
        this._codeToActions.get(code).push(action);
      }
    }
  }

  setBinding(action, codes) {
    this.bindings[action] = codes;
    this._rebuildBindingIndex();
  }

  _install() {
    const kd = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      const acts = this._codeToActions.get(e.code);
      if (acts) {
        for (const a of acts) {
          this.actions.add(a);
          this.pressedThisStep.add(a);
        }
      }
      // F toggles fullscreen, Esc exits it (and opens pause).
      if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.toggleFullscreen();
      }
      if (e.code === 'Tab' || (e.code === 'Space' && this.pointerLocked)) e.preventDefault();
      bus.emit('input:key', { code: e.code, down: true });
    };
    const ku = (e) => {
      this.keys.delete(e.code);
      const acts = this._codeToActions.get(e.code);
      if (acts) {
        for (const a of acts) {
          if (!this.synthetic.has(a)) this.actions.delete(a);
          this.releasedThisStep.add(a);
        }
      }
      bus.emit('input:key', { code: e.code, down: false });
    };
    const blur = () => {
      this.keys.clear();
      for (const a of Array.from(this.actions)) if (!this.synthetic.has(a)) this.actions.delete(a);
      this.mouse.left = false;
      this.mouse.right = false;
    };

    globalThis.addEventListener('keydown', kd, { passive: false });
    globalThis.addEventListener('keyup', ku);
    globalThis.addEventListener('blur', blur);

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (e.button === 0) {
        this.mouse.left = true;
        this.pressedThisStep.add('attack');
        this.actions.add('attack');
      }
      if (e.button === 2) {
        this.mouse.right = true;
        this.pressedThisStep.add('aim');
        this.actions.add('aim');
      }
    });
    globalThis.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouse.left = false;
        if (!this.synthetic.has('attack')) this.actions.delete('attack');
        this.releasedThisStep.add('attack');
      }
      if (e.button === 2) {
        this.mouse.right = false;
        if (!this.synthetic.has('aim')) this.actions.delete('aim');
        this.releasedThisStep.add('aim');
      }
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.pointerLocked) return;
        e.preventDefault();
        this.mouse.wheel += Math.sign(e.deltaY);
      },
      { passive: false }
    );

    globalThis.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked || !this.captureLook) return;
      this._pendingLook.x += e.movementX || 0;
      this._pendingLook.y += e.movementY || 0;
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      bus.emit('input:pointerlock', this.pointerLocked);
      if (!this.pointerLocked) blur();
    });
    // A refused request is NOT the same as losing a lock we held. Reporting it
    // as `pointerlock:false` would make the UI pause the game the instant it
    // starts on any platform that declines the request (including headless
    // automation), so denials get their own event.
    document.addEventListener('pointerlockerror', () => {
      bus.emit('input:pointerlock:denied', { hadLock: this.pointerLocked });
    });
  }

  /**
   * Pointer lock can legitimately be refused (no user gesture, or the user
   * pressed Escape moments ago). Every rejection path is awaited and swallowed
   * so a refusal never surfaces as an unhandled promise rejection.
   */
  async requestPointerLock() {
    if (this.pointerLocked) return true;
    const attempt = async (opts) => {
      try {
        const p = opts ? this.canvas.requestPointerLock(opts) : this.canvas.requestPointerLock();
        if (p && typeof p.then === 'function') await p;
        return true;
      } catch {
        return false;
      }
    };
    if (await attempt({ unadjustedMovement: true })) return true;
    return attempt(null);
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  isFullscreen() {
    return !!document.fullscreenElement;
  }

  async toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await (document.documentElement.requestFullscreen?.() ?? Promise.resolve());
    } catch {
      /* denied without user gesture - non fatal */
    }
  }

  /** Consume accumulated mouse movement, converted to radians of yaw/pitch. */
  consumeLook() {
    const sens = settings.get('mouseSensitivity') * 0.0022;
    const invert = settings.get('invertY') ? -1 : 1;
    const yaw = -this._pendingLook.x * sens;
    const pitch = -this._pendingLook.y * sens * invert;
    this._pendingLook.x = 0;
    this._pendingLook.y = 0;
    return { yaw, pitch };
  }

  /** Automation hook: inject look movement in raw mouse pixels. */
  applyLookDelta(dxPixels, dyPixels) {
    this._pendingLook.x += dxPixels;
    this._pendingLook.y += dyPixels;
  }

  isDown(action) {
    return this.actions.has(action);
  }

  wasPressed(action) {
    return this.pressedThisStep.has(action);
  }

  wasReleased(action) {
    return this.releasedThisStep.has(action);
  }

  consumeWheel() {
    const w = this.mouse.wheel;
    this.mouse.wheel = 0;
    return w;
  }

  /** Automation hook: hold or release an action without a real device. */
  setActionState(action, down) {
    if (down) {
      if (!this.actions.has(action)) this.pressedThisStep.add(action);
      this.actions.add(action);
      this.synthetic.add(action);
    } else {
      this.actions.delete(action);
      this.synthetic.delete(action);
      this.releasedThisStep.add(action);
    }
  }

  /** Automation hook: a single-frame tap. */
  tapAction(action) {
    this.pressedThisStep.add(action);
    this.actions.add(action);
    this._tapRelease = this._tapRelease || new Set();
    this._tapRelease.add(action);
  }

  endStep() {
    if (this._tapRelease && this._tapRelease.size) {
      for (const a of this._tapRelease) {
        if (!this.synthetic.has(a)) this.actions.delete(a);
        this.releasedThisStep.add(a);
      }
      this._tapRelease.clear();
    }
    this.pressedThisStep.clear();
    this.releasedThisStep.clear();
  }

  releaseAll() {
    this.actions.clear();
    this.synthetic.clear();
    this.keys.clear();
    this.mouse.left = false;
    this.mouse.right = false;
    this._pendingLook.x = 0;
    this._pendingLook.y = 0;
  }
}
