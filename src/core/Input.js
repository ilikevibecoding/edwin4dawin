/**
 * Keyboard + mouse input with an action map and pointer-lock handling.
 *
 *   input.isDown('sprint')          // held this frame
 *   input.justPressed('reload')     // pressed this frame
 *   input.justReleased('fire')
 *   input.mouseDelta                // {x, y} accumulated since last update()
 *   input.pointerLocked
 */
const DEFAULT_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  crouch: ['ControlLeft', 'KeyC'],
  reload: ['KeyR'],
  fire: ['Mouse0'],
  aim: ['Mouse2'], // right button (DOM button 2)
  killstreak: ['KeyX', 'Digit4'],
  grenade: ['KeyG'],
  inspect: ['KeyV'],
  interact: ['KeyF'],
  melee: ['KeyE'],
  weapon1: ['Digit1'],
  weapon2: ['Digit2'],
  scoreboard: ['Tab'],
  pause: ['Escape'],
  toggleHud: ['F1'],
  photoMode: ['F2'],
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.bindings = { ...DEFAULT_BINDINGS };
    this._codeToActions = new Map();
    this._rebuildLookup();

    this._down = new Set();
    this._pressed = new Set();
    this._released = new Set();
    this._pendingPressed = new Set();
    this._pendingReleased = new Set();

    this.mouseDelta = { x: 0, y: 0 };
    this._pendingMouse = { x: 0, y: 0 };
    this.wheelDelta = 0;
    this._pendingWheel = 0;
    this.pointerLocked = false;
    this.enabled = true;
    this.mousePosition = { x: 0, y: 0 };

    this._onKeyDown = (e) => {
      if (!this.enabled) return;
      if (e.code === 'Tab' || e.code === 'F1' || e.code === 'F2') e.preventDefault();
      if (!this._down.has(e.code)) this._pendingPressed.add(e.code);
      this._down.add(e.code);
    };
    this._onKeyUp = (e) => {
      this._down.delete(e.code);
      this._pendingReleased.add(e.code);
    };
    this._onMouseDown = (e) => {
      if (!this.enabled) return;
      const code = `Mouse${e.button}`;
      if (!this._down.has(code)) this._pendingPressed.add(code);
      this._down.add(code);
    };
    this._onMouseUp = (e) => {
      const code = `Mouse${e.button}`;
      this._down.delete(code);
      this._pendingReleased.add(code);
    };
    this._onMouseMove = (e) => {
      this.mousePosition.x = e.clientX;
      this.mousePosition.y = e.clientY;
      if (!this.pointerLocked) return;
      this._pendingMouse.x += e.movementX;
      this._pendingMouse.y += e.movementY;
    };
    this._onWheel = (e) => {
      this._pendingWheel += Math.sign(e.deltaY);
    };
    this._onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (!this.pointerLocked) {
        // Releasing lock should not leave keys stuck.
        for (const code of this._down) this._pendingReleased.add(code);
        this._down.clear();
      }
    };
    this._onBlur = () => {
      for (const code of this._down) this._pendingReleased.add(code);
      this._down.clear();
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('wheel', this._onWheel, { passive: true });
    window.addEventListener('blur', this._onBlur);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _rebuildLookup() {
    this._codeToActions.clear();
    for (const [action, codes] of Object.entries(this.bindings)) {
      for (const code of codes) {
        if (!this._codeToActions.has(code)) this._codeToActions.set(code, []);
        this._codeToActions.get(code).push(action);
      }
    }
  }

  rebind(action, codes) {
    this.bindings[action] = codes;
    this._rebuildLookup();
  }

  requestPointerLock() {
    if (this.pointerLocked) return;
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => this.canvas.requestPointerLock());
    } catch {
      this.canvas.requestPointerLock();
    }
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** Call once per frame before systems read input. */
  update() {
    this._pressed = this._pendingPressed;
    this._released = this._pendingReleased;
    this._pendingPressed = new Set();
    this._pendingReleased = new Set();
    this.mouseDelta.x = this._pendingMouse.x;
    this.mouseDelta.y = this._pendingMouse.y;
    this._pendingMouse.x = 0;
    this._pendingMouse.y = 0;
    this.wheelDelta = this._pendingWheel;
    this._pendingWheel = 0;
  }

  _codes(action) {
    return this.bindings[action] || [];
  }

  // --- scripted input (tooling / replays): acts like a real key or mouse-move on the action's first binding.
  press(action) {
    const c = this._codes(action)[0];
    if (!c) return;
    if (!this._down.has(c)) this._pendingPressed.add(c);
    this._down.add(c);
  }

  release(action) {
    const c = this._codes(action)[0];
    if (!c) return;
    this._down.delete(c);
    this._pendingReleased.add(c);
  }

  look(dx, dy) {
    this._pendingMouse.x += dx;
    this._pendingMouse.y += dy;
  }

  isDown(action) {
    for (const c of this._codes(action)) if (this._down.has(c)) return true;
    return false;
  }

  justPressed(action) {
    for (const c of this._codes(action)) if (this._pressed.has(c)) return true;
    return false;
  }

  justReleased(action) {
    for (const c of this._codes(action)) if (this._released.has(c)) return true;
    return false;
  }

  /** Raw key code checks (e.g. 'KeyP'). */
  keyDown(code) { return this._down.has(code); }
  keyPressed(code) { return this._pressed.has(code); }

  /** Movement axis in [-1, 1]: x = strafe (right positive), y = forward positive. */
  get moveAxis() {
    const x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    const y = (this.isDown('forward') ? 1 : 0) - (this.isDown('back') ? 1 : 0);
    return { x, y };
  }

  /** Programmatic injection for tests / screenshot tooling. */
  simulatePress(action) {
    for (const c of this._codes(action)) { this._pendingPressed.add(c); this._down.add(c); }
  }
  simulateRelease(action) {
    for (const c of this._codes(action)) { this._down.delete(c); this._pendingReleased.add(c); }
  }
}
