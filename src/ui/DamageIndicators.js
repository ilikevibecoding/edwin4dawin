import { setStyle } from './dom.js';

/**
 * Directional damage arcs around the crosshair + a short red screen flash. Arcs are stored as a world
 * bearing so they keep pointing at the shooter while the player turns; they fade over `life` seconds.
 */
export class DamageIndicators {
  constructor(game, canvas, flashEl) {
    this.game = game;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.flashEl = flashEl;
    this.list = [];
    this.flash = 0;
    this.life = 1.0;
    this._drawn = false;
  }

  /** @param {THREE.Vector3|null} from world position of the damage source */
  add(from, amount = 20) {
    const strength = Math.min(1, 0.55 + amount / 60);
    this.flash = Math.min(1, Math.max(this.flash, strength));
    if (!from) return;
    const p = this.game.player?.position;
    if (!p) return;
    const dx = from.x - p.x;
    const dz = from.z - p.z;
    if (dx * dx + dz * dz < 0.04) return;
    // Bearing on a north-up map, clockwise from "up" (-Z).
    const bearing = Math.atan2(dx, -dz);
    this.list.push({ bearing, t: 0, strength });
    if (this.list.length > 6) this.list.shift();
  }

  update(dt) {
    // Flash decays fast.
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 2.6);
      setStyle(this.flashEl, 'opacity', (this.flash * 0.9).toFixed(2));
    }
    if (!this.list.length) {
      if (this._drawn) {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this._drawn = false;
      }
      return;
    }
    const { canvas, ctx } = this;
    const css = canvas.clientWidth;
    if (css < 8) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(css * dpr);
    if (canvas.width !== px || canvas.height !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    const yaw = this.game.player?.yaw || 0;
    const R = px / 2;
    const radius = R * 0.42;
    const width = R * 0.085;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const ind = this.list[i];
      ind.t += dt;
      const k = 1 - ind.t / this.life;
      if (k <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      // Map is rotated so player forward is up: screen angle = bearing + yaw. Canvas angles start at +X.
      const a = ind.bearing + yaw - Math.PI / 2;
      const span = 0.55 + (1 - k) * 0.1;
      const alpha = Math.min(1, k * 1.6) * Math.min(1, ind.strength + 0.25);
      // Radial falloff: bright thin inner edge, soft outer body (a wedge that fades outwards).
      const grad = ctx.createRadialGradient(R, R, radius - width * 0.4, R, R, radius + width * 1.8);
      grad.addColorStop(0, `rgba(255,90,70,0)`);
      grad.addColorStop(0.16, `rgba(255,150,130,${alpha.toFixed(3)})`);
      grad.addColorStop(0.3, `rgba(255,60,45,${(alpha * 0.9).toFixed(3)})`);
      grad.addColorStop(1, `rgba(255,40,30,0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(R, R, radius + width * 1.8, a - span, a + span);
      ctx.arc(R, R, radius - width * 0.4, a + span, a - span, true);
      ctx.closePath();
      // Fade the wedge toward its angular ends with stepped alpha bands.
      ctx.save();
      ctx.clip();
      const bands = 7;
      for (let b = 0; b < bands; b++) {
        const t0 = b / bands;
        const t1 = (b + 1) / bands;
        const mid = (t0 + t1) / 2;
        ctx.globalAlpha = Math.min(1, Math.pow(Math.sin(mid * Math.PI), 0.8) * 1.15);
        ctx.beginPath();
        ctx.moveTo(R, R);
        ctx.arc(R, R, radius + width * 2.2, a - span + t0 * span * 2 - 0.002, a - span + t1 * span * 2 + 0.002);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    this._drawn = true;
  }
}
