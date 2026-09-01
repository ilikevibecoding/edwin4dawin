export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.buttons = [false, false, false];
    this.clicked = [false, false, false];
    this.released = [false, false, false];
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.onLockChange = null;
    this.onUnlockedClick = null;
    this.sensitivity = 0.0022;
    this._retry = null;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.buttons.fill(false);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.locked && this.onUnlockedClick) this.onUnlockedClick();
      this.buttons[e.button] = true;
      this.clicked[e.button] = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (this.buttons[e.button]) this.released[e.button] = true;
      this.buttons[e.button] = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    window.addEventListener('wheel', (e) => {
      if (!this.locked) return;
      this.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      if (!this.locked) {
        this.keys.clear();
        this.buttons.fill(false);
      }
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }

  get locked() {
    return document.pointerLockElement === this.canvas;
  }

  requestLock(retry = true) {
    if (this.locked) return;
    clearTimeout(this._retry);
    const fallback = () => {
      // Browsers refuse a new lock for ~1.5s after the user pressed Esc; try once more later.
      if (retry) this._retry = setTimeout(() => this.requestLock(false), 1600);
    };
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) {
        p.catch(() => {
          try {
            const q = this.canvas.requestPointerLock();
            if (q && q.catch) q.catch(fallback);
          } catch (err) {
            fallback();
          }
        });
      }
    } catch (err) {
      try {
        this.canvas.requestPointerLock();
      } catch (err2) {
        fallback();
      }
    }
  }

  isDown(code) {
    return this.keys.has(code);
  }

  /** True while a mouse button is held, or if it was clicked (even briefly) this frame. */
  firing(button = 0) {
    return this.buttons[button] || this.clicked[button];
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
    this.clicked.fill(false);
    this.released.fill(false);
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
  }
}
