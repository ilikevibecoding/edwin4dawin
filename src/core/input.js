/** Keyboard + mouse input with pointer lock. */
export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this.mouseDown = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheelDelta = 0;
    this.pointerLocked = false;
    this.enabled = true;
    this._justPressed = new Set();
    this._justReleased = new Set();
    this._mouseJustPressed = new Set();

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this._justPressed.add(e.code);
      if (['KeyW','KeyA','KeyS','KeyD','Space','Tab','KeyR','KeyQ','KeyE','KeyF','KeyG','KeyC','ShiftLeft','Digit1','Digit2','Digit3','Digit4'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this._justReleased.add(e.code);
    });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown.clear(); });

    domElement.addEventListener('mousedown', (e) => {
      this.mouseDown.add(e.button);
      this._mouseJustPressed.add(e.button);
    });
    window.addEventListener('mouseup', (e) => this.mouseDown.delete(e.button));
    window.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    window.addEventListener('wheel', (e) => { this.wheelDelta += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.dom;
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  requestPointerLock() {
    this.dom.requestPointerLock({ unadjustedMovement: true }).catch?.(() => this.dom.requestPointerLock());
  }
  exitPointerLock() { document.exitPointerLock(); }

  down(code) { return this.enabled && this.keys.has(code); }
  pressed(code) { return this.enabled && this._justPressed.has(code); }
  released(code) { return this._justReleased.has(code); }
  mouse(btn) { return this.enabled && this.mouseDown.has(btn); }
  mousePressed(btn) { return this.enabled && this._mouseJustPressed.has(btn); }

  /** Consume per-frame deltas. Call once at end of frame. */
  endFrame() {
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheelDelta = 0;
    this._justPressed.clear();
    this._justReleased.clear();
    this._mouseJustPressed.clear();
  }
}
