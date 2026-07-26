// Keyboard/mouse input with pointer lock, fullscreen (F), and QA injection.
// Game code reads *actions*, never raw key codes.
import { bus } from './events.js';

const BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  walk: ['ShiftLeft', 'ShiftRight'],
  crouch: ['KeyC', 'ControlLeft'],
  jump: ['Space'],
  reload: ['KeyR'],
  interact: ['KeyE'],
  fire: ['Mouse0'],
  aim: ['Mouse2'],
  slot1: ['Digit1'],
  slot2: ['Digit2'],
  slot3: ['Digit3'],
  slot4: ['Digit4'],
  slot5: ['Digit5'],
  fullscreen: ['KeyF'],
  pause: ['KeyP', 'Escape'],
  qaConsole: ['Backquote'],
};

const CODE_TO_ACTIONS = {};
for (const [action, codes] of Object.entries(BINDINGS)) {
  for (const c of codes) (CODE_TO_ACTIONS[c] ||= []).push(action);
}

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();           // actions currently held
    this.pressedQueue = new Set();   // actions pressed since last tick
    this.releasedQueue = new Set();
    this.lookX = 0;                  // accumulated mouse deltas (pixels)
    this.lookY = 0;
    this.wheel = 0;
    this.pointerLocked = false;
    this.wantLock = false;
    this._attach();
  }

  _attach() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this._setCode(e.code, true);
      const acts = CODE_TO_ACTIONS[e.code] || [];
      // Prevent page scroll/space defaults during gameplay.
      if (acts.length && !['Escape'].includes(e.code)) e.preventDefault();
      if (acts.includes('fullscreen')) this.toggleFullscreen();
    }, { capture: false });
    window.addEventListener('keyup', (e) => this._setCode(e.code, false));
    window.addEventListener('blur', () => this.releaseAll());

    this.canvas.addEventListener('mousedown', (e) => {
      this._setCode('Mouse' + e.button, true);
      e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => this._setCode('Mouse' + e.button, false));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.lookX += e.movementX || 0;
      this.lookY += e.movementY || 0;
    });
    window.addEventListener('wheel', (e) => {
      if (this.pointerLocked) { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }
    }, { passive: false });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      bus.emit('pointerlock', this.pointerLocked);
    });
    document.addEventListener('pointerlockerror', () => {
      this.pointerLocked = false;
      bus.emit('pointerlock-error');
    });
  }

  _setCode(code, isDown) {
    const acts = CODE_TO_ACTIONS[code];
    if (!acts) return;
    for (const a of acts) {
      if (isDown && !this.down.has(a)) { this.down.add(a); this.pressedQueue.add(a); bus.emit('action-press', a); }
      else if (!isDown && this.down.has(a)) { this.down.delete(a); this.releasedQueue.add(a); }
    }
  }

  // ---- game-facing API (poll once per fixed tick) ----
  isDown(action) { return this.down.has(action); }
  wasPressed(action) { return this.pressedQueue.has(action); }
  consumeLook() {
    const r = { x: this.lookX, y: this.lookY, wheel: this.wheel };
    this.lookX = 0; this.lookY = 0; this.wheel = 0;
    return r;
  }
  endTick() { this.pressedQueue.clear(); this.releasedQueue.clear(); }
  releaseAll() {
    for (const a of [...this.down]) { this.down.delete(a); this.releasedQueue.add(a); }
  }

  // ---- pointer lock / fullscreen ----
  requestLock() {
    this.wantLock = true;
    if (this.pointerLocked) return;
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) {
        p.catch(() => {
          try {
            const q = this.canvas.requestPointerLock();
            if (q && q.catch) q.catch(() => {});
          } catch (e) { /* pointer lock unavailable (headless/test) */ }
        });
      }
    } catch (e) { /* pointer lock unavailable */ }
  }
  exitLock() {
    this.wantLock = false;
    if (this.pointerLocked) document.exitPointerLock();
  }
  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  // ---- QA/test injection (drives the same pipeline as real input) ----
  injectAction(action, isDown) {
    if (isDown && !this.down.has(action)) { this.down.add(action); this.pressedQueue.add(action); bus.emit('action-press', a11y(action)); }
    else if (!isDown && this.down.has(action)) { this.down.delete(action); this.releasedQueue.add(action); }
  }
  injectLook(dx, dy) { this.lookX += dx; this.lookY += dy; }
}

// keep emitted action names identical for injected input
function a11y(a) { return a; }
