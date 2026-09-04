import type { FlightInputs } from '../plane/physics';

/** Keyboard + mouse + gamepad input with smoothing so control surfaces move with inertia. */
export class Input {
  private keys = new Set<string>();
  readonly flight: FlightInputs = { throttle: 0, pitch: 0, roll: 0, yaw: 0, flaps: 0, brake: false };
  private targetPitch = 0;
  private targetRoll = 0;
  private targetYaw = 0;
  orbitYaw = 0;
  orbitPitch = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  readonly pressed = new Set<string>(); // one-shot keys consumed per frame
  enabled = true;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', (e) => { this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY; });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;
      this.orbitYaw -= (e.clientX - this.lastX) * 0.006;
      this.orbitPitch += (e.clientY - this.lastY) * 0.005;
      this.orbitPitch = Math.max(-1.2, Math.min(1.2, this.orbitPitch));
      this.lastX = e.clientX; this.lastY = e.clientY;
    });
    canvas.addEventListener('wheel', (e) => { this.flight.throttle = Math.max(0, Math.min(1, this.flight.throttle - Math.sign(e.deltaY) * 0.05)); e.preventDefault(); }, { passive: false });
  }

  down(code: string): boolean { return this.keys.has(code); }
  consume(code: string): boolean { const had = this.pressed.has(code); this.pressed.delete(code); return had; }

  update(dt: number): void {
    if (!this.enabled) { this.pressed.clear(); return; }
    const f = this.flight;
    const k = (a: string, b: string) => (this.down(a) ? 1 : 0) - (this.down(b) ? 1 : 0);
    this.targetPitch = k('KeyS', 'KeyW') + k('ArrowDown', 'ArrowUp'); // S / down-arrow pulls the nose up (yoke back), W pushes
    this.targetRoll = k('KeyD', 'KeyA') + k('ArrowRight', 'ArrowLeft');
    this.targetYaw = k('KeyE', 'KeyQ');
    // gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads[0];
    if (gp) {
      const dz = (v: number) => (Math.abs(v) < 0.08 ? 0 : v);
      this.targetRoll += dz(gp.axes[0] ?? 0);
      this.targetPitch += dz(gp.axes[1] ?? 0);
      this.targetYaw += dz(gp.axes[2] ?? 0);
      if (gp.buttons[7]?.value) f.throttle = Math.min(1, f.throttle + gp.buttons[7].value * dt * 0.8);
      if (gp.buttons[6]?.value) f.throttle = Math.max(0, f.throttle - gp.buttons[6].value * dt * 0.8);
    }
    const clampU = (v: number) => Math.max(-1, Math.min(1, v));
    // control surfaces move with a little lag (cable stretch / actuator rate)
    const rate = 1 - Math.exp(-dt * 9);
    f.pitch += (clampU(this.targetPitch) - f.pitch) * rate;
    f.roll += (clampU(this.targetRoll) - f.roll) * rate;
    f.yaw += (clampU(this.targetYaw) - f.yaw) * rate;
    if (this.down('ShiftLeft') || this.down('ShiftRight')) f.throttle = Math.min(1, f.throttle + dt * 0.55);
    if (this.down('ControlLeft') || this.down('ControlRight')) f.throttle = Math.max(0, f.throttle - dt * 0.55);
    if (this.consume('KeyF')) f.flaps = f.flaps > 0.5 ? 0 : f.flaps > 0 ? 1 : 0.5;
    f.brake = this.down('KeyB') || this.down('Space');
    // spring the orbit camera back when not dragging
    if (!this.dragging) { this.orbitYaw *= Math.exp(-dt * 2.2); this.orbitPitch *= Math.exp(-dt * 2.2); }
  }
}
