import { rand, randRange } from '../core/rand.js';

/**
 * Screen-space feedback: dirt specks + a subtle warm flash on the lens when
 * an explosion goes off nearby. DOM canvas owned by VFX (below HUD).
 */
export class ScreenOverlay {
  constructor() {
    const el = document.createElement('div');
    el.id = 'vfx-overlay';
    el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    el.appendChild(canvas);
    document.body.appendChild(el);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.specks = [];
    this.flash = 0;
    this._dirty = false;
    this._resize();
    window.addEventListener('resize', () => this._resize());

    // pre-rendered speck sprite (blurry dirt smudge)
    const s = document.createElement('canvas');
    s.width = s.height = 48;
    const g = s.getContext('2d');
    const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, 'rgba(38,30,22,0.9)');
    grad.addColorStop(0.5, 'rgba(44,35,25,0.5)');
    grad.addColorStop(1, 'rgba(50,40,28,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);
    this.speckSprite = s;
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this._dirty = true;
  }

  /** strength 0..1 — how close/violent the blast was. */
  trigger(strength) {
    const w = this.canvas.width, h = this.canvas.height;
    const n = Math.round(5 + strength * 13);
    for (let i = 0; i < n && this.specks.length < 40; i++) {
      // bias specks toward screen edges so the center stays readable
      const edge = Math.pow(rand(), 0.45);
      const a = rand() * Math.PI * 2;
      this.specks.push({
        x: w / 2 + Math.cos(a) * edge * w * 0.52,
        y: h / 2 + Math.sin(a) * edge * h * 0.52,
        r: randRange(2.5, 11) * (0.6 + strength * 0.5),
        rot: rand() * Math.PI * 2,
        sx: randRange(0.7, 1.5),
        age: 0, life: randRange(1.2, 2.2),
        a0: randRange(0.25, 0.5) * Math.min(1, 0.4 + strength),
      });
    }
    this.flash = Math.max(this.flash, Math.min(1, strength) * 0.55);
  }

  update(dt) {
    if (dt > 0) {
      let active = this.flash > 0.01 || this.specks.length > 0;
      this.flash = Math.max(0, this.flash - dt * 3.2);
      for (let i = this.specks.length - 1; i >= 0; i--) {
        const sp = this.specks[i];
        sp.age += dt;
        if (sp.age >= sp.life) this.specks.splice(i, 1);
      }
      if (active) this._dirty = true;
    }
    if (!this._dirty) return;
    this._dirty = false;
    const g = this.ctx, w = this.canvas.width, h = this.canvas.height;
    g.clearRect(0, 0, w, h);
    if (this.flash > 0.01) {
      const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, `rgba(255,225,170,${(this.flash * 0.5).toFixed(3)})`);
      grad.addColorStop(1, `rgba(255,200,130,${(this.flash * 0.12).toFixed(3)})`);
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }
    for (const sp of this.specks) {
      const t = sp.age / sp.life;
      const alpha = sp.a0 * (t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9);
      if (alpha <= 0.005) continue;
      g.globalAlpha = alpha;
      g.save();
      g.translate(sp.x, sp.y);
      g.rotate(sp.rot);
      g.drawImage(this.speckSprite, -sp.r * sp.sx, -sp.r, sp.r * 2 * sp.sx, sp.r * 2);
      g.restore();
    }
    g.globalAlpha = 1;
  }
}
