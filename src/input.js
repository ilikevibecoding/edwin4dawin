// Keyboard / mouse / pointer lock handling.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed this frame (edge)
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.mouseDown = [false, false, false];
    this.mouseClicked = [false, false, false];
    this.locked = false;
    this.enabled = true;
    this.onLockChange = null;
    this.onKeyDown = null;
    this.onMouseDown = null;

    document.addEventListener('keydown', (e) => {
      if (e.repeat) { if (['Space'].includes(e.code)) e.preventDefault(); return; }
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (this.onKeyDown) this.onKeyDown(e);
      if (['Space', 'Tab', 'KeyE', 'F3', 'F5'].includes(e.code)) e.preventDefault();
    });
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    document.addEventListener('mousedown', (e) => {
      if (this.onMouseDown) this.onMouseDown(e);
      if (!this.locked) return;
      this.mouseDown[e.button] = true;
      this.mouseClicked[e.button] = true;
    });
    document.addEventListener('mouseup', (e) => { this.mouseDown[e.button] = false; });
    document.addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) { this.keys.clear(); this.mouseDown = [false, false, false]; }
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }

  requestLock() {
    if (this.locked) return;
    const quiet = (p) => { if (p && p.catch) p.catch(() => { /* no user gesture / unsupported */ }); };
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { quiet(this.canvas.requestPointerLock()); } catch (e2) { /* ignore */ } });
    } catch (e) {
      try { quiet(this.canvas.requestPointerLock()); } catch (e2) { /* ignore */ }
    }
  }
  releaseLock() { if (this.locked) document.exitPointerLock(); }

  isDown(code) { return this.keys.has(code); }
  wasPressed(code) { return this.pressed.has(code); }
  // one-shot: true for the first tick that asks after a key press, so a quick tap between two slow frames still counts
  takePress(code) { return this.pressed.delete(code); }

  // Call at end of frame
  endFrame() {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.mouseClicked = [false, false, false];
  }
}
