import { SHOT_MODE } from './utils.js';

export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseDown = false;
    this.rightDown = false;
    this.locked = false;
    this.justPressed = new Set();

    if (SHOT_MODE) return; // screenshots drive the camera directly

    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.justPressed.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    domElement.addEventListener('mousedown', (e) => {
      if (!this.locked) { domElement.requestPointerLock(); return; }
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.rightDown = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightDown = false;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === domElement;
      document.body.classList.toggle('pointer-locked', this.locked);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
  }

  isDown(code) { return this.keys.has(code); }
  wasPressed(code) { return this.justPressed.has(code); }

  consumeMouse() {
    const d = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return d;
  }

  endFrame() { this.justPressed.clear(); }
}
