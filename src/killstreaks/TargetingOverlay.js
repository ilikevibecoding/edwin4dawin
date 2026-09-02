/**
 * Fullscreen air-strike targeting overlay (DOM owned by the killstreak module — no dependency on the UI team).
 *
 * A square canvas (~70 % of the viewport height) shows the top-down minimap from `game.world.getMinimap()`
 * (dark grid fallback while the image is not ready), the player marker (yaw arrow), objective B, a reticle
 * driven by a virtual cursor (pointer lock stays; accumulates `game.input.mouseDelta`), and a red strike-line
 * preview with the six impact markers along the jets' flight direction (rotate with A/D or the wheel).
 *
 *   overlay.open(); const r = overlay.update(dt) → { confirm: {x, z, dx, dz} } | { cancel: true } | null
 */

const CSS = `
.ks-target { position: fixed; inset: 0; z-index: 90; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 14px; pointer-events: none; user-select: none; color: #e8e2d4;
  font-family: 'Bahnschrift', 'DIN Alternate', 'Roboto Condensed', 'Arial Narrow', 'Segoe UI', Arial, sans-serif;
  background: radial-gradient(ellipse at center, rgba(6, 10, 14, 0.55) 0%, rgba(2, 4, 6, 0.86) 100%);
  animation: ks-fade 0.18s ease-out; }
.ks-target.hidden { display: none; }
@keyframes ks-fade { from { opacity: 0; transform: scale(1.03); } to { opacity: 1; transform: none; } }
.ks-target__title { font-size: clamp(18px, 2.6vh, 30px); letter-spacing: 0.32em; font-weight: 700; color: #f5b544;
  text-shadow: 0 0 18px rgba(245, 181, 68, 0.45), 0 2px 2px rgba(0, 0, 0, 0.8); }
.ks-target__title small { display: block; font-size: 0.5em; letter-spacing: 0.4em; color: #9fb4c8; margin-top: 4px; text-align: center; }
.ks-target__frame { position: relative; box-shadow: 0 0 0 1px rgba(245, 181, 68, 0.55), 0 0 0 6px rgba(0, 0, 0, 0.55), 0 0 60px rgba(0, 0, 0, 0.7);
  background: #06090c; }
.ks-target__frame::before, .ks-target__frame::after { content: ''; position: absolute; inset: -10px; pointer-events: none;
  border: 2px solid rgba(245, 181, 68, 0.9); border-radius: 2px;
  clip-path: polygon(0 0, 28px 0, 28px 2px, 2px 2px, 2px 28px, 0 28px, 0 100%, 28px 100%, 28px calc(100% - 2px), 2px calc(100% - 2px), 2px calc(100% - 28px), 0 calc(100% - 28px)); }
.ks-target__frame::after { transform: scaleX(-1); }
.ks-target__frame canvas { display: block; image-rendering: auto; }
.ks-target__hint { font-size: clamp(11px, 1.5vh, 16px); letter-spacing: 0.18em; color: #c9d2dc; text-transform: uppercase;
  display: flex; gap: 26px; }
.ks-target__hint b { color: #f5b544; font-weight: 700; }
.ks-target__coords { position: absolute; left: 8px; bottom: 6px; font-size: 11px; letter-spacing: 0.12em; color: rgba(245, 181, 68, 0.85);
  font-family: 'Consolas', 'SF Mono', 'Menlo', monospace; text-shadow: 0 1px 1px #000; }
`;

export class TargetingOverlay {
  constructor(game) {
    this.game = game;
    this.visible = false;
    this.cursor = { x: 0, y: 0 }; // canvas px
    this.angle = 0; // strike direction (radians, world XZ: dx = cos, dz = sin)
    this.map = null;
    this._grid = null;
    this._t = 0;
    this._built = false;
    this.bombs = 6;
    this.spacing = 6.5;
    this.minDistance = 12; // m — the player cannot target their own feet
  }

  _build() {
    if (this._built || typeof document === 'undefined') return;
    this._built = true;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root = document.createElement('div');
    this.root.className = 'ks-target hidden';
    this.root.innerHTML = `
      <div class="ks-target__title">PRECISION AIRSTRIKE — SELECT TARGET<small>UAV LINK ESTABLISHED · STRIKE PACKAGE READY</small></div>
      <div class="ks-target__frame"><canvas></canvas><div class="ks-target__coords"></div></div>
      <div class="ks-target__hint"><span><b>MOUSE</b> AIM</span><span><b>A / D · WHEEL</b> ROTATE RUN-IN</span><span><b>LMB</b> CONFIRM</span><span><b>RMB / X / ESC</b> CANCEL</span></div>`;
    document.body.appendChild(this.root);
    this.canvas = this.root.querySelector('canvas');
    this.coords = this.root.querySelector('.ks-target__coords');
    this.ctx = this.canvas.getContext('2d');
  }

  _resize() {
    const px = Math.max(240, Math.round(Math.min(window.innerHeight * 0.7, window.innerWidth * 0.9)));
    if (this.canvas.width !== px) {
      this.canvas.width = this.canvas.height = px;
      this.canvas.style.width = this.canvas.style.height = `${px}px`;
    }
    this.size = px;
  }

  // ---- world ↔ canvas (north = -Z at the top, +X to the right, matching World/Minimap.js)
  worldToPx(x, z, out) {
    const m = this.map;
    out.x = ((x - m.center.x) / m.size + 0.5) * this.size;
    out.y = ((z - m.center.z) / m.size + 0.5) * this.size;
    return out;
  }
  pxToWorld(px, py) {
    const m = this.map;
    return { x: (px / this.size - 0.5) * m.size + m.center.x, z: (py / this.size - 0.5) * m.size + m.center.z };
  }

  open() {
    this._build();
    if (!this.root) return;
    const world = this.game.world;
    const mm = world?.getMinimap?.();
    this.map = mm && mm.center ? mm : { center: { x: 0, z: 0 }, size: 120, image: null };
    this._resize();
    this.root.classList.remove('hidden');
    this.visible = true;
    this._t = 0;
    // start aimed ~25 m ahead of the player, run-in along the player's facing
    const P = this.game.player;
    const f = P.forward;
    const fl = Math.hypot(f.x, f.z) || 1;
    const fx = f.x / fl, fz = f.z / fl;
    this.angle = Math.atan2(fz, fx);
    const tmp = { x: 0, y: 0 };
    this.worldToPx(P.position.x + fx * 25, P.position.z + fz * 25, tmp);
    this.cursor.x = Math.min(this.size, Math.max(0, tmp.x));
    this.cursor.y = Math.min(this.size, Math.max(0, tmp.y));
    this._draw();
  }

  close() {
    if (this.root) this.root.classList.add('hidden');
    this.visible = false;
  }

  /** Per-frame while targeting. Returns { confirm } / { cancel } / null. */
  update(dt) {
    if (!this.visible) return null;
    const input = this.game.input;
    this._t += dt;
    this._resize();
    const md = input.mouseDelta;
    const sens = this.size / 700; // px of map per px of mouse
    this.cursor.x = Math.min(this.size, Math.max(0, this.cursor.x + md.x * sens));
    this.cursor.y = Math.min(this.size, Math.max(0, this.cursor.y + md.y * sens));
    let rot = 0;
    if (input.isDown('left')) rot -= 1;
    if (input.isDown('right')) rot += 1;
    if (input.wheelDelta) rot += Math.sign(input.wheelDelta) * 6;
    this.angle += rot * 1.6 * Math.max(dt, 1 / 120);

    const cancel = input.justPressed('aim') || input.justPressed('killstreak') || input.keyPressed?.('Escape');
    if (cancel) return { cancel: true };
    this._draw();
    if (input.justPressed('fire')) {
      const t = this._target();
      return { confirm: { x: t.x, z: t.z, dx: Math.cos(this.angle), dz: Math.sin(this.angle) } };
    }
    return null;
  }

  /** Target point in world space, pushed to at least `minDistance` from the player. */
  _target() {
    const w = this.pxToWorld(this.cursor.x, this.cursor.y);
    const P = this.game.player.position;
    const dx = w.x - P.x, dz = w.z - P.z;
    const d = Math.hypot(dx, dz);
    if (d < this.minDistance) {
      const f = this.game.player.forward;
      const fl = Math.hypot(f.x, f.z) || 1;
      const ux = d > 0.5 ? dx / d : f.x / fl;
      const uz = d > 0.5 ? dz / d : f.z / fl;
      w.x = P.x + ux * this.minDistance;
      w.z = P.z + uz * this.minDistance;
    }
    return w;
  }

  _drawGrid(ctx, S) {
    ctx.fillStyle = '#0a1016';
    ctx.fillRect(0, 0, S, S);
    const m = this.map;
    const step = (10 / m.size) * S;
    ctx.strokeStyle = 'rgba(120, 160, 190, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = ((-m.center.x / m.size + 0.5) * S) % step; x < S; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, S);
    }
    for (let y = ((-m.center.z / m.size + 0.5) * S) % step; y < S; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
    }
    ctx.stroke();
  }

  _draw() {
    const ctx = this.ctx;
    const S = this.size;
    const m = this.map;
    const tmp = { x: 0, y: 0 };
    ctx.clearRect(0, 0, S, S);
    if (m.image) {
      ctx.drawImage(m.image, 0, 0, S, S);
      // desaturate / darken like a tactical feed
      ctx.fillStyle = 'rgba(10, 22, 34, 0.42)';
      ctx.fillRect(0, 0, S, S);
    } else this._drawGrid(ctx, S);
    // scanlines + sweep
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let y = 0; y < S; y += 4) ctx.fillRect(0, y, S, 1);
    const sweep = ((this._t * 0.25) % 1) * S;
    const grad = ctx.createLinearGradient(0, sweep - 60, 0, sweep);
    grad.addColorStop(0, 'rgba(245, 181, 68, 0)');
    grad.addColorStop(1, 'rgba(245, 181, 68, 0.16)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, sweep - 60, S, 60);

    // north + scale bar
    ctx.font = `${Math.round(S * 0.028)}px Bahnschrift, 'Arial Narrow', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(232, 226, 212, 0.85)';
    ctx.fillText('N', 10, 8);
    const bar = (20 / m.size) * S;
    ctx.strokeStyle = 'rgba(232, 226, 212, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(S - 12 - bar, S - 14);
    ctx.lineTo(S - 12, S - 14);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('20 m', S - 12, S - 18);

    // objective B
    const obj = this.game.world?.getObjective?.();
    if (obj?.position) {
      this.worldToPx(obj.position.x, obj.position.z, tmp);
      const r = Math.max(10, ((obj.radius || 6) / m.size) * S);
      ctx.strokeStyle = 'rgba(90, 170, 255, 0.9)';
      ctx.fillStyle = 'rgba(90, 170, 255, 0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tmp.x, tmp.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#dbe9ff';
      ctx.font = `bold ${Math.round(S * 0.034)}px Bahnschrift, 'Arial Narrow', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.name || 'B', tmp.x, tmp.y + 1);
    }

    // player marker (yaw arrow + view cone)
    const P = this.game.player;
    this.worldToPx(P.position.x, P.position.z, tmp);
    const f = P.forward;
    const a = Math.atan2(f.z, f.x);
    ctx.save();
    ctx.translate(tmp.x, tmp.y);
    ctx.rotate(a);
    ctx.fillStyle = 'rgba(120, 220, 120, 0.14)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, S * 0.13, -0.5, 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#9dfc9d';
    ctx.strokeStyle = '#08240a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-7, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // strike line preview through the target, impact markers, jet run-in arrow
    const t = this._target();
    this.worldToPx(t.x, t.z, tmp);
    const cx = tmp.x, cy = tmp.y;
    const pxPerM = S / m.size;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);
    const pulse = 0.75 + 0.25 * Math.sin(this._t * 6);
    ctx.strokeStyle = `rgba(255, 70, 50, ${0.55 * pulse + 0.25})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(-S, 0);
    ctx.lineTo(S, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    // blast footprint + bomb markers
    for (let i = 0; i < this.bombs; i++) {
      const off = (i - (this.bombs - 1) / 2) * this.spacing * pxPerM;
      ctx.fillStyle = 'rgba(255, 70, 50, 0.16)';
      ctx.beginPath();
      ctx.arc(off, 0, 9 * pxPerM, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < this.bombs; i++) {
      const off = (i - (this.bombs - 1) / 2) * this.spacing * pxPerM;
      ctx.fillStyle = '#ff4a32';
      ctx.strokeStyle = '#2a0500';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(off, -7);
      ctx.lineTo(off + 5, 0);
      ctx.lineTo(off, 7);
      ctx.lineTo(off - 5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // run-in arrow (jets fly +X in this rotated frame)
    const ax = -S * 0.22;
    ctx.fillStyle = 'rgba(255, 120, 90, 0.95)';
    ctx.beginPath();
    ctx.moveTo(ax + 16, 0);
    ctx.lineTo(ax - 6, -9);
    ctx.lineTo(ax, 0);
    ctx.lineTo(ax - 6, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // reticle at the cursor (may differ from the clamped target — draw both)
    this._reticle(ctx, this.cursor.x, this.cursor.y, S * 0.045, 'rgba(255, 255, 255, 0.85)');
    this._reticle(ctx, cx, cy, S * 0.07, 'rgba(255, 70, 50, 0.95)', true);

    this.coords.textContent = `TGT ${t.x.toFixed(1)}  ${t.z.toFixed(1)}   HDG ${(((this.angle * 180) / Math.PI + 90 + 360) % 360).toFixed(0).padStart(3, '0')}°   DIST ${Math.hypot(t.x - P.position.x, t.z - P.position.z).toFixed(0)} m`;
  }

  _reticle(ctx, x, y, r, color, ticks = false) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    const g = r * 0.45;
    ctx.moveTo(x - r - 6, y);
    ctx.lineTo(x - g, y);
    ctx.moveTo(x + g, y);
    ctx.lineTo(x + r + 6, y);
    ctx.moveTo(x, y - r - 6);
    ctx.lineTo(x, y - g);
    ctx.moveTo(x, y + g);
    ctx.lineTo(x, y + r + 6);
    ctx.stroke();
    if (ticks) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + this._t * 0.8;
        ctx.moveTo(x + Math.cos(a) * (r + 10), y + Math.sin(a) * (r + 10));
        ctx.lineTo(x + Math.cos(a) * (r + 16), y + Math.sin(a) * (r + 16));
      }
      ctx.stroke();
    }
  }
}
