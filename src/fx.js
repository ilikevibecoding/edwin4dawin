// Canvas weather particles + animated film grain + screen effects.

import { $, rand } from './util.js';
import { audio } from './audio.js';

class FX {
  constructor() {
    this.weatherKind = 'none';
    this.parts = [];
    this.lightningAt = 0;
  }

  init() {
    this.wx = $('#fxWeather');
    this.gr = $('#fxGrain');
    this.flashEl = $('#flash');
    this.wctx = this.wx.getContext('2d');
    this.gctx = this.gr.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._grainTiles = [];
    for (let i = 0; i < 6; i++) this._grainTiles.push(this._makeGrainTile());
    this._grainIdx = 0;
    this._frame = 0;
    const loop = () => { this.step(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.wx.width = w; this.wx.height = h;
    this.gr.width = Math.ceil(w / 2); this.gr.height = Math.ceil(h / 2);
  }

  _makeGrainTile() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 118 + (Math.random() * 60 - 30) | 0;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
      img.data[i + 3] = Math.random() < 0.55 ? 22 : 8;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  setWeather(kind) {
    if (this.weatherKind === kind) return;
    this.weatherKind = kind;
    this.parts = [];
    audio.setWeather(kind);
    const w = innerWidth, h = innerHeight;
    const mk = (n, f) => { for (let i = 0; i < n; i++) this.parts.push(f()); };
    if (kind === 'rain' || kind === 'rainHeavy') {
      const n = kind === 'rainHeavy' ? 260 : 150;
      mk(n, () => ({
        x: rand(-120, w + 120), y: rand(-h, h), z: rand(0.35, 1),
        len: rand(9, 30), drift: rand(-0.5, 0.5), a: rand(0.5, 1.35),
      }));
    } else if (kind === 'snow') {
      mk(170, () => ({
        x: rand(0, w), y: rand(-h, h), z: rand(0.3, 1),
        r: rand(0.8, 2.6), ph: rand(0, Math.PI * 2), sway: rand(12, 42),
      }));
    } else if (kind === 'petals') {
      mk(46, () => ({
        x: rand(0, w), y: rand(-h, h), z: rand(0.4, 1),
        r: rand(2.5, 5.5), ph: rand(0, Math.PI * 2), rot: rand(0, Math.PI * 2), sway: rand(30, 80),
      }));
    } else if (kind === 'dust') {
      mk(70, () => ({
        x: rand(0, w), y: rand(0, h), z: rand(0.2, 1),
        r: rand(0.5, 1.7), ph: rand(0, Math.PI * 2),
      }));
    }
  }

  step() {
    this._frame++;
    const ctx = this.wctx, w = this.wx.width, h = this.wx.height;
    ctx.clearRect(0, 0, w, h);
    const t = performance.now() / 1000;
    const k = this.weatherKind;

    if (k === 'rain' || k === 'rainHeavy') {
      const speed = k === 'rainHeavy' ? 19 : 13;
      // gusting wind: slow oscillation + secondary wobble
      const wind = Math.sin(t * 0.13) * 2.0 + Math.sin(t * 0.047 + 1.7) * 1.4 - 0.7;
      for (const p of this.parts) {
        const v = speed * (0.5 + p.z);
        const dx = (wind + p.drift) * (0.45 + p.z);
        p.y += v; p.x += dx;
        if (p.y > h + 30) { p.y = rand(-60, -10); p.x = rand(-80, w + 120); }
        const a = (0.04 + p.z * 0.12) * p.a;
        ctx.lineWidth = p.z > 0.85 ? 1.4 : 1;
        ctx.strokeStyle = `rgba(190,215,235,${Math.min(a, 0.24)})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - dx * (p.len / v), p.y - p.len * (0.6 + p.z));
        ctx.stroke();
      }
      // sparse ground splashes
      if (this._frame % 3 === 0) {
        for (let i = 0; i < (k === 'rainHeavy' ? 4 : 2); i++) {
          const x = rand(0, w), y = h - rand(4, 40);
          ctx.strokeStyle = 'rgba(190,215,235,0.10)';
          ctx.beginPath(); ctx.arc(x, y, rand(1, 3.4), Math.PI, 2 * Math.PI); ctx.stroke();
        }
      }
      // occasional distant lightning
      if (t > this.lightningAt) {
        this.lightningAt = t + rand(14, 30);
        this.flash('rgba(210,230,255,0.10)', 240);
      }
    } else if (k === 'snow') {
      for (const p of this.parts) {
        p.y += (0.5 + p.z) * 0.85;
        const x = p.x + Math.sin(t * 0.6 + p.ph) * p.sway * 0.2;
        if (p.y > h + 8) { p.y = rand(-40, -6); p.x = rand(0, w); }
        ctx.fillStyle = `rgba(235,242,250,${0.14 + p.z * 0.4})`;
        ctx.beginPath(); ctx.arc(x, p.y, p.r * (0.5 + p.z * 0.7), 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'petals') {
      for (const p of this.parts) {
        p.y += (0.4 + p.z) * 0.65; p.rot += 0.01 + p.z * 0.012;
        const x = p.x + Math.sin(t * 0.45 + p.ph) * p.sway * 0.25;
        if (p.y > h + 12) { p.y = rand(-60, -8); p.x = rand(0, w); }
        ctx.save();
        ctx.translate(x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = `rgba(250,250,252,${0.25 + p.z * 0.45})`;
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    } else if (k === 'dust') {
      for (const p of this.parts) {
        const x = p.x + Math.sin(t * 0.24 + p.ph) * 14;
        const y = p.y + Math.cos(t * 0.19 + p.ph * 1.7) * 10 - 0.06;
        p.y -= 0.05;
        if (p.y < -10) { p.y = h + 8; p.x = rand(0, w); }
        ctx.fillStyle = `rgba(220,228,240,${0.05 + p.z * 0.16})`;
        ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // film grain (updates every other frame)
    if (this._frame % 2 === 0) {
      const g = this.gctx, gw = this.gr.width, gh = this.gr.height;
      g.clearRect(0, 0, gw, gh);
      this._grainIdx = (this._grainIdx + 1) % this._grainTiles.length;
      const tile = this._grainTiles[this._grainIdx];
      const ox = (Math.random() * 256) | 0, oy = (Math.random() * 256) | 0;
      for (let x = -ox; x < gw; x += 256)
        for (let y = -oy; y < gh; y += 256) g.drawImage(tile, x, y);
    }
  }

  flash(color = 'rgba(255,255,255,0.85)', ms = 120) {
    const f = this.flashEl;
    f.style.transition = 'none';
    f.style.background = color;
    f.style.opacity = '1';
    requestAnimationFrame(() => {
      f.style.transition = `opacity ${ms}ms ease-out`;
      f.style.opacity = '0';
    });
  }

  shake(intensity = 1) {
    const st = $('#stage');
    st.classList.remove('shake', 'shakeHard');
    void st.offsetWidth;
    st.classList.add(intensity > 1 ? 'shakeHard' : 'shake');
    setTimeout(() => st.classList.remove('shake', 'shakeHard'), 600);
  }

  glitch(ms = 500) {
    const app = $('#app');
    app.classList.add('glitching');
    audio.glitchNoise(ms);
    setTimeout(() => app.classList.remove('glitching'), ms);
  }
}

export const fx = new FX();
