// Keyboard + pointer-lock mouse state. Edge-triggered keys are tracked in a
// set that game code consumes via takePressed().
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = Object.create(null);
    this.pressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.locked = false;
    this.onLockChange = null;

    const swallow = new Set([
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyQ', 'KeyE',
    ]);

    window.addEventListener('keydown', (e) => {
      if (swallow.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    window.addEventListener('blur', () => {
      this.keys = Object.create(null);
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }

  requestLock() {
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && typeof p.catch === 'function') {
        p.catch(() => this.canvas.requestPointerLock());
      }
    } catch {
      this.canvas.requestPointerLock();
    }
  }

  down(code) {
    return !!this.keys[code];
  }

  takePressed(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  consumeMouse() {
    const d = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return d;
  }

  endFrame() {
    this.pressed.clear();
  }
}
