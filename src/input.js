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
    this.sensitivity = 0.0022;

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
      if (!this.locked) return;
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

  requestLock() {
    if (this.locked) return;
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => this.canvas.requestPointerLock());
    } catch (err) {
      this.canvas.requestPointerLock();
    }
  }

  isDown(code) {
    return this.keys.has(code);
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
