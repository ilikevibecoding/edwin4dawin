/** Keyboard + mouse + pointer-lock input hub. */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseDX = 0; this.mouseDY = 0;
    this.mouseDown = false;      // LMB held
    this.rmbDown = false;        // RMB held
    this.locked = false;
    this.enabled = true;
    this.onFireDown = null; this.onFireUp = null;
    this.onKeyDown = null;
    this.onAdsDown = null; this.onAdsUp = null;
    this.onLockChange = null;

    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (this.onKeyDown) this.onKeyDown(e.code, e);
    });
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));

    document.addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.locked || !this.enabled) return;
      if (e.button === 0) { this.mouseDown = true; this.onFireDown && this.onFireDown(); }
      if (e.button === 2) { this.rmbDown = true; this.onAdsDown && this.onAdsDown(); }
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) { this.mouseDown = false; this.onFireUp && this.onFireUp(); }
      if (e.button === 2) { this.rmbDown = false; this.onAdsUp && this.onAdsUp(); }
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) { this.mouseDown = false; this.rmbDown = false; }
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }

  requestLock() {
    if (document.pointerLockElement !== this.canvas) {
      this.canvas.requestPointerLock({ unadjustedMovement: true }).catch?.(() => this.canvas.requestPointerLock());
    }
  }
  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** Consume accumulated mouse deltas (call once per frame). */
  consumeMouse() {
    const dx = this.mouseDX, dy = this.mouseDY;
    this.mouseDX = 0; this.mouseDY = 0;
    return [dx, dy];
  }

  down(code) { return this.keys.has(code); }
  axis() {
    let x = 0, z = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) z -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) z += 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    return [x, z];
  }
}
