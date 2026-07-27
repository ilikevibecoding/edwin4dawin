import { L } from '../world/streets.js';

/**
 * MW-style rotating minimap.
 *  - World footprint prerendered once from the navgrid (two-tone: building fill + edge lines)
 *    over the real street network (road channels + dashed centerlines from the street layout).
 *  - Enemy blips only appear for ~2.5s after that enemy fires (decaying ping list fed by hud).
 *  - Radar sweep, rotating north marker, 20m grid, boundary, frame ticks.
 * Canvas backing is 2x its CSS size; the footprint is prerendered at 6px/m and blitted
 * slightly downscaled so outlines stay crisp at 1080p.
 */

const W = 452, H = 308;          // backing px (CSS 226x154)
const R = 4.6;                   // backing px per world meter (~98m visible across)
const PING_LIFE = 2.5;

export class Minimap {
  constructor(game, canvas) {
    this.game = game;
    this.ctx = canvas.getContext('2d');
    this.pings = [];             // {x, z, t}
    this.sweep = 0;
    this._fp = null;             // prerendered footprint canvas
    this._fpScale = 6;           // footprint px per meter (blitted at ~0.77x -> crisp)
  }

  /** Register an enemy weapon discharge at a world position. */
  ping(pos) {
    this.pings.push({ x: pos.x, z: pos.z, t: PING_LIFE });
    if (this.pings.length > 40) this.pings.shift();
  }

  _prerender() {
    const grid = this.game.world.navgrid;
    const s = this._fpScale;
    const c = document.createElement('canvas');
    c.width = c.height = grid.n * s;
    const g = c.getContext('2d');

    // ---- street network under the buildings (real layout from streets.js) ----
    const px = (v) => (v + grid.half) * s;              // world coord -> footprint px
    const road = (x0, x1, z0, z1) => g.rect(px(x0), px(z0), (x1 - x0) * s, (z1 - z0) * s);
    const B = L.HALF;
    g.fillStyle = 'rgba(190,198,192,.07)';              // faint road channels
    g.beginPath();                                      // one path -> no double-alpha at intersections
    road(-L.BLV, L.BLV, -B, B);                         // N-S boulevard
    road(-B, B, -L.CROSS, L.CROSS);                     // E-W main
    for (const sgn of [-1, 1]) {
      road(sgn * L.SEC0, sgn * L.SEC1, -B, B);          // N-S secondaries
      road(-B, B, sgn * L.SEC0, sgn * L.SEC1);          // E-W secondaries
    }
    g.fill();
    // dashed centerlines
    g.strokeStyle = 'rgba(222,228,220,.22)';
    g.lineWidth = 1.5;
    g.setLineDash([2.6 * s, 2.2 * s]);
    const line = (x0, z0, x1, z1) => { g.beginPath(); g.moveTo(px(x0), px(z0)); g.lineTo(px(x1), px(z1)); g.stroke(); };
    line(0, -B, 0, B);
    line(-B, 0, B, 0);
    const mid = (L.SEC0 + L.SEC1) / 2;
    for (const sgn of [-1, 1]) {
      line(sgn * mid, -B, sgn * mid, B);
      line(-B, sgn * mid, B, sgn * mid);
    }
    g.setLineDash([]);

    const raw = (ix, iz) =>
      ix < 0 || iz < 0 || ix >= grid.n || iz >= grid.n ? 1 : grid.blocked[grid.idx(ix, iz)];

    // despeckle: keep only building-mass cells (drop 1–2 cell props like poles/crates)
    const mask = new Uint8Array(grid.n * grid.n);
    for (let iz = 0; iz < grid.n; iz++) {
      for (let ix = 0; ix < grid.n; ix++) {
        if (!raw(ix, iz)) continue;
        let n = 0;
        for (let dz = -1; dz <= 1; dz++)
          for (let dx = -1; dx <= 1; dx++) n += raw(ix + dx, iz + dz) ? 1 : 0;
        if (n >= 5) mask[iz * grid.n + ix] = 1;
      }
    }
    const blocked = (ix, iz) =>
      ix < 0 || iz < 0 || ix >= grid.n || iz >= grid.n ? 1 : mask[iz * grid.n + ix];

    // pass 1: building mass (single flat tone)
    g.fillStyle = 'rgba(150,160,152,.38)';
    for (let iz = 0; iz < grid.n; iz++) {
      for (let ix = 0; ix < grid.n; ix++) {
        if (!blocked(ix, iz)) continue;
        g.fillRect(ix * s, iz * s, s, s);
      }
    }
    // pass 2: crisp lighter edges where buildings meet streets (the "two-tone")
    g.fillStyle = 'rgba(228,234,226,.8)';
    const e = 2.5;
    for (let iz = 0; iz < grid.n; iz++) {
      for (let ix = 0; ix < grid.n; ix++) {
        if (!blocked(ix, iz)) continue;
        const x = ix * s, y = iz * s;
        if (!blocked(ix, iz - 1)) g.fillRect(x, y, s, e);
        if (!blocked(ix, iz + 1)) g.fillRect(x, y + s - e, s, e);
        if (!blocked(ix - 1, iz)) g.fillRect(x, y, e, s);
        if (!blocked(ix + 1, iz)) g.fillRect(x + s - e, y, e, s);
      }
    }
    this._fp = c;
  }

  draw(dt) {
    const g = this.ctx;
    const { player, world } = this.game;
    if (!this._fp) this._prerender();
    this.sweep = (this.sweep + dt * 0.9) % (Math.PI * 2);
    for (let i = this.pings.length - 1; i >= 0; i--) {
      this.pings[i].t -= dt;
      if (this.pings[i].t <= 0) this.pings.splice(i, 1);
    }

    g.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const half = world.navgrid.half;
    const bh = world.bounds.half;

    // ---- rotated world layer -------------------------------------------------
    g.save();
    g.translate(cx, cy);
    g.rotate(player.yaw);
    g.translate(-player.position.x * R, -player.position.z * R);

    // footprint
    const size = half * 2 * R;
    g.imageSmoothingEnabled = true;
    g.drawImage(this._fp, -half * R, -half * R, size, size);

    // 20m tactical grid
    g.strokeStyle = 'rgba(255,255,255,.055)';
    g.lineWidth = 1;
    g.beginPath();
    for (let m = -80; m <= 80; m += 20) {
      g.moveTo(m * R, -half * R); g.lineTo(m * R, half * R);
      g.moveTo(-half * R, m * R); g.lineTo(half * R, m * R);
    }
    g.stroke();

    // playable boundary
    g.strokeStyle = 'rgba(255,255,255,.14)';
    g.strokeRect(-bh * R, -bh * R, bh * 2 * R, bh * 2 * R);

    // enemy fire pings (red blips, fading out; fresh pings get a pulse ring)
    for (const p of this.pings) {
      const a = Math.min(1, p.t / 0.6);
      g.fillStyle = `rgba(255,74,58,${(0.95 * a).toFixed(3)})`;
      g.beginPath();
      g.arc(p.x * R, p.z * R, 4.5, 0, Math.PI * 2);
      g.fill();
      const age = PING_LIFE - p.t;
      if (age < 0.55) {
        const k = age / 0.55;
        g.strokeStyle = `rgba(255,74,58,${(0.7 * (1 - k)).toFixed(3)})`;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(p.x * R, p.z * R, 4.5 + k * 14, 0, Math.PI * 2);
        g.stroke();
      }
    }
    g.restore();

    // ---- radar sweep (screen space, around center) ---------------------------
    const a0 = this.sweep;
    try {
      const grad = g.createConicGradient(a0, cx, cy);
      grad.addColorStop(0, 'rgba(216,178,90,0)');
      grad.addColorStop(0.82, 'rgba(216,178,90,0)');
      grad.addColorStop(1, 'rgba(216,178,90,.13)');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
    } catch { /* conic gradient unsupported: skip trail */ }
    g.strokeStyle = 'rgba(216,178,90,.28)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a0) * W, cy + Math.sin(a0) * W);
    g.stroke();

    // ---- player view cone + arrow (center, always up) -------------------------
    g.save();
    g.translate(cx, cy);
    const cone = g.createRadialGradient(0, 0, 4, 0, 0, 62);
    cone.addColorStop(0, 'rgba(236,238,232,.20)');
    cone.addColorStop(1, 'rgba(236,238,232,0)');
    g.fillStyle = cone;
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, 62, -Math.PI / 2 - 0.62, -Math.PI / 2 + 0.62);
    g.closePath();
    g.fill();
    g.fillStyle = '#d8b25a';
    g.strokeStyle = 'rgba(0,0,0,.55)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8);
    g.closePath();
    g.stroke(); g.fill();
    g.restore();

    // ---- north marker (rotates with the map, clamped to the frame) -----------
    const ux = Math.sin(player.yaw), uy = -Math.cos(player.yaw);
    const pad = 16;
    const t = Math.min(
      (W / 2 - pad) / Math.max(Math.abs(ux), 1e-4),
      (H / 2 - pad) / Math.max(Math.abs(uy), 1e-4)
    );
    const nx = cx + ux * t, ny = cy + uy * t;
    g.font = '600 17px Rajdhani';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,.6)';
    g.fillText('N', nx + 1, ny + 1);
    g.fillStyle = 'rgba(240,238,232,.95)';
    g.fillText('N', nx, ny);

    // ---- frame ticks (screen space) -------------------------------------------
    g.strokeStyle = 'rgba(255,255,255,.30)';
    g.lineWidth = 2;
    g.beginPath();
    for (const [tx, ty, dx, dy] of [
      [cx, 0, 0, 7], [cx, H, 0, -7], [0, cy, 7, 0], [W, cy, -7, 0],
    ]) {
      g.moveTo(tx, ty); g.lineTo(tx + dx, ty + dy);
    }
    g.stroke();
  }
}
