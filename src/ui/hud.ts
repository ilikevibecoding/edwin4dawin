import type { FlightTelemetry } from '../plane/physics';

const el = (id: string) => document.getElementById(id)!;

export class Hud {
  private root = el('hud');
  private speed = el('hud-speed-val');
  private alt = el('hud-alt-val');
  private vs = el('hud-vs-val');
  private heading = el('hud-heading-val');
  private card = el('hud-heading-card');
  private thrFill = el('hud-throttle-fill');
  private thrVal = el('hud-throttle-val');
  private rpm = el('hud-rpm-val');
  private stall = el('hud-stall');
  private msg = el('hud-msg');
  private cam = el('hud-cam');
  private time = el('hud-time');
  private visible = true;
  private msgTimer = 0;

  show(v: boolean): void { this.visible = v; this.root.classList.toggle('hidden', !v); }
  toggle(): void { this.show(!this.visible); }

  flash(text: string, seconds = 2.5): void { this.msg.textContent = text; this.msgTimer = seconds; }

  update(t: FlightTelemetry, throttle: number, camMode: string, hour: number, dt: number): void {
    if (!this.visible) return;
    this.speed.textContent = Math.round(t.airspeed * 1.9438).toString();
    this.alt.textContent = Math.round(t.altitude * 3.2808).toString();
    const fpm = Math.round(t.verticalSpeed * 196.85 / 50) * 50;
    this.vs.textContent = (fpm > 0 ? '+' : '') + fpm.toString();
    const hdg = Math.round(t.heading) % 360;
    this.heading.textContent = hdg.toString().padStart(3, '0');
    const cards = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    this.card.textContent = cards[Math.round(hdg / 45) % 8];
    this.thrFill.style.width = `${Math.round(throttle * 100)}%`;
    this.thrVal.textContent = `${Math.round(throttle * 100)}%`;
    this.rpm.textContent = Math.round(600 + t.rpm * 2000).toString();
    this.stall.classList.toggle('hidden', !t.stalled);
    this.cam.textContent = camMode.toUpperCase();
    const h = Math.floor(hour) % 24, m = Math.floor((hour % 1) * 60);
    this.time.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    if (this.msgTimer > 0) { this.msgTimer -= dt; if (this.msgTimer <= 0) this.msg.textContent = ''; }
  }
}
