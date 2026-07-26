// Input: keyboard + mouse + pointer lock, with a virtual channel for deterministic tests.
// Actions are sampled by gameplay each fixed step via snapshot().
import { settings } from './settings.js';

const BINDS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  crouch: ['KeyC', 'ControlLeft'],
  walk: ['ShiftLeft', 'ShiftRight'],
  reload: ['KeyR'],
  use: ['KeyE'],
  slot1: ['Digit1'], slot2: ['Digit2'], slot3: ['Digit3'], slot4: ['Digit4'], slot5: ['Digit5'],
  lastWeapon: ['KeyQ'],
  map: ['KeyM', 'Tab'],
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.vkeys = new Set();            // virtual (test) keys
    this.mouseButtons = new Set();
    this.vmouseButtons = new Set();
    this.lookDX = 0; this.lookDY = 0;  // accumulated raw deltas since last snapshot
    this.wheel = 0;
    this.pointerLocked = false;
    this.enabled = true;
    this.onPointerLockChange = null;   // set by game
    this.pressedThisFrame = new Set(); // edge events (codes)
    this._attach();
  }

  _attach() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressedThisFrame.add(e.code);
      // Prevent browser behaviors that break gameplay (Tab focus travel, Space scroll, etc.)
      if (['Tab', 'Space', 'ControlLeft'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseButtons.clear(); });

    this.canvas.addEventListener('mousedown', (e) => { this.mouseButtons.add(e.button); this.pressedThisFrame.add('Mouse' + e.button); });
    window.addEventListener('mouseup', (e) => this.mouseButtons.delete(e.button));
    window.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.lookDX += e.movementX || 0;
      this.lookDY += e.movementY || 0;
    });
    window.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (this.onPointerLockChange) this.onPointerLockChange(this.pointerLocked);
    });
  }

  requestPointerLock() {
    if (document.pointerLockElement === this.canvas) return;
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { this.canvas.requestPointerLock(); } catch { /* headless */ } });
    } catch {
      try { this.canvas.requestPointerLock(); } catch { /* unavailable (headless tests) */ }
    }
  }
  exitPointerLock() { if (document.pointerLockElement) document.exitPointerLock(); }

  // ---- virtual test channel ----
  vPress(code) { this.vkeys.add(code); this.pressedThisFrame.add(code); }
  vRelease(code) { this.vkeys.delete(code); }
  vMouse(button, down) {
    if (down) { this.vmouseButtons.add(button); this.pressedThisFrame.add('Mouse' + button); }
    else this.vmouseButtons.delete(button);
  }
  vLook(dx, dy) { this.lookDX += dx; this.lookDY += dy; }
  vClearAll() { this.vkeys.clear(); this.vmouseButtons.clear(); }

  _down(action) {
    const codes = BINDS[action];
    for (const c of codes) if (this.keys.has(c) || this.vkeys.has(c)) return true;
    return false;
  }
  _pressed(action) {
    const codes = BINDS[action];
    for (const c of codes) if (this.pressedThisFrame.has(c)) return true;
    return false;
  }

  // Sampled once per fixed step by gameplay. Consumes accumulated deltas & edges.
  snapshot() {
    const sens = settings.get('sensitivity');
    const invert = settings.get('invertY') ? -1 : 1;
    const snap = {
      moveX: (this._down('right') ? 1 : 0) - (this._down('left') ? 1 : 0),
      moveZ: (this._down('forward') ? 1 : 0) - (this._down('back') ? 1 : 0),
      jump: this._pressed('jump'),
      crouchToggle: this._pressed('crouch'),
      walk: this._down('walk'),
      reloadPressed: this._pressed('reload'),
      usePressed: this._pressed('use'),
      firing: this.mouseButtons.has(0) || this.vmouseButtons.has(0),
      firePressed: this.pressedThisFrame.has('Mouse0'),
      aiming: this.mouseButtons.has(2) || this.vmouseButtons.has(2),
      lookDX: this.lookDX * 0.0022 * sens,
      lookDY: this.lookDY * 0.0022 * sens * invert,
      wheel: this.wheel,
      slotPressed: null,
      lastWeaponPressed: this._pressed('lastWeapon'),
      mapPressed: this._pressed('map'),
    };
    for (let i = 1; i <= 5; i++) if (this._pressed('slot' + i)) snap.slotPressed = i;
    this.lookDX = 0; this.lookDY = 0; this.wheel = 0;
    this.pressedThisFrame.clear();
    return snap;
  }
}
