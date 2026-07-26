// Tactical minimap (Fable 1 ownership). Canvas-based, north-up top-down
// schematic of the Northstar Administrative Center. Static floor plates are
// rasterized once per floor (rooms + wall openings); per-frame work is a
// single blit plus a handful of markers (player, hostages, extraction,
// current objective). Wired into the HUD by ui.js.
import { ROOMS, CONNECTIONS, FLOOR_Y, EXTRACTION, SPECIALS } from '../world/layout.js';
import { settings } from '../core/settings.js';

const CSS_W = 224;                       // canvas CSS width in px
const PAD = 1.6;                         // world-space margin around the plan
const FLOOR_SWITCH_Y = FLOOR_Y[1] - 0.8; // 2.8 m — above this reads as floor 1

const INK = {
  room: '#101f30',
  circulation: '#17293e',
  stairs: '#122336',
  exterior: 'rgba(143, 216, 255, 0.05)',
  wall: 'rgba(110, 158, 196, 0.95)',
  wallDim: 'rgba(110, 158, 196, 0.4)',
  gap: '#101f30',
  ice: '#8fd8ff',
  amber: '#e8a33d',
  green: '#6fd08c',
};

export class Minimap {
  constructor(container) {
    this.container = container;
    container.classList.add('minimap');
    container.innerHTML = `
      <div class="mm-head">
        <span class="mm-title">TAC&thinsp;MAP</span>
        <span class="mm-floor" data-mm-floor>FL&nbsp;01</span>
        <span class="mm-north">N&#9650;</span>
      </div>
      <div class="mm-frame"><canvas></canvas></div>`;
    this.canvas = container.querySelector('canvas');
    this.floorEl = container.querySelector('[data-mm-floor]');
    this.ctx = this.canvas.getContext('2d');

    // world bounds across both floors so they share one projection
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const r of ROOMS) {
      x0 = Math.min(x0, r.rect[0]); z0 = Math.min(z0, r.rect[1]);
      x1 = Math.max(x1, r.rect[2]); z1 = Math.max(z1, r.rect[3]);
    }
    this.wx0 = x0 - PAD;
    this.wz0 = z0 - PAD;
    this.s = CSS_W / (x1 - x0 + PAD * 2);
    this.w = CSS_W;
    this.h = Math.ceil((z1 - z0 + PAD * 2) * this.s);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.layers = {}; // floor index -> offscreen canvas
    this.floor = -1;
  }

  _px(x) { return (x - this.wx0) * this.s; }
  _pz(z) { return (z - this.wz0) * this.s; }
  _snap(v) { return Math.round(v) + 0.5; }

  // --------------------------------------------------------- static plate
  _layer(floor) {
    const c = document.createElement('canvas');
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    const g = c.getContext('2d');
    g.scale(this.dpr, this.dpr);
    const rooms = ROOMS.filter((r) => r.floor === floor);

    for (const r of rooms) {
      const [x0, z0, x1, z1] = r.rect;
      g.fillStyle = r.style === 'exterior' ? INK.exterior
        : r.isStairwell ? INK.stairs
        : r.style === 'corridor' ? INK.circulation : INK.room;
      g.fillRect(this._px(x0), this._pz(z0), (x1 - x0) * this.s, (z1 - z0) * this.s);
    }
    g.lineWidth = 1;
    for (const r of rooms) {
      const [x0, z0, x1, z1] = r.rect;
      g.strokeStyle = r.style === 'exterior' ? INK.wallDim : INK.wall;
      g.setLineDash(r.style === 'exterior' ? [3, 3] : []);
      g.strokeRect(this._snap(this._px(x0)), this._snap(this._pz(z0)),
        Math.round((x1 - x0) * this.s), Math.round((z1 - z0) * this.s));
    }
    g.setLineDash([]);

    // wall openings (doors/arches) — erase the shared outline across the gap
    g.strokeStyle = INK.gap;
    g.lineWidth = 2.4;
    for (const conn of CONNECTIONS) {
      const seg = this._connSegment(conn, floor);
      if (!seg) continue;
      g.beginPath();
      g.moveTo(seg.ax, seg.ay);
      g.lineTo(seg.bx, seg.by);
      g.stroke();
    }

    for (const r of rooms) if (r.isStairwell) this._stairGlyph(g, r);
    return c;
  }

  _connSegment(conn, floor) {
    const ra = ROOMS.find((r) => r.id === conn.a);
    const rb = ROOMS.find((r) => r.id === conn.b);
    if (!ra || !rb || ra.floor !== floor || rb.floor !== floor) return null;
    const A = ra.rect, B = rb.rect, E = 0.05;
    const half = (conn.w || 1) / 2;

    let edgeX = null;
    if (Math.abs(A[2] - B[0]) < E) edgeX = A[2];
    else if (Math.abs(B[2] - A[0]) < E) edgeX = B[2];
    if (edgeX !== null) {
      const lo = Math.max(A[1], B[1]), hi = Math.min(A[3], B[3]);
      if (hi - lo < 0.3) return null;
      let cz = conn.at != null ? lo + conn.at : (lo + hi) / 2;
      cz = Math.min(Math.max(cz, lo + half), hi - half);
      const x = this._snap(this._px(edgeX));
      return { ax: x, ay: this._pz(cz - half), bx: x, by: this._pz(cz + half) };
    }

    let edgeZ = null;
    if (Math.abs(A[3] - B[1]) < E) edgeZ = A[3];
    else if (Math.abs(B[3] - A[1]) < E) edgeZ = B[3];
    if (edgeZ !== null) {
      const lo = Math.max(A[0], B[0]), hi = Math.min(A[2], B[2]);
      if (hi - lo < 0.3) return null;
      let cx = conn.at != null ? lo + conn.at : (lo + hi) / 2;
      cx = Math.min(Math.max(cx, lo + half), hi - half);
      const z = this._snap(this._pz(edgeZ));
      return { ax: this._px(cx - half), ay: z, bx: this._px(cx + half), by: z };
    }
    return null;
  }

  _stairGlyph(g, room) {
    const [x0, z0, x1, z1] = room.rect;
    const cx = this._px((x0 + x1) / 2), cy = this._pz((z0 + z1) / 2);
    g.strokeStyle = 'rgba(143, 216, 255, 0.45)';
    g.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(cx - 2.6, cy + i * 3.4 + 2);
      g.lineTo(cx, cy + i * 3.4 - 0.6);
      g.lineTo(cx + 2.6, cy + i * 3.4 + 2);
      g.stroke();
    }
  }

  // ------------------------------------------------------------ per frame
  update(game) {
    const p = game.player;
    if (!p || !p.pos) return;
    const floor = p.pos.y > FLOOR_SWITCH_Y ? 1 : 0;
    if (floor !== this.floor) {
      this.floor = floor;
      this.floorEl.textContent = floor === 1 ? 'FL 02' : 'FL 01';
    }
    if (!this.layers[floor]) this.layers[floor] = this._layer(floor);

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.layers[floor], 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const reduced = !!settings.get('reducedMotion');
    const pulse = reduced ? 0.7 : 0.55 + 0.35 * Math.sin(performance.now() / 300);

    this._drawExtraction(ctx, game, floor, pulse);
    this._drawObjective(ctx, game, floor, pulse);
    this._drawHostages(ctx, game, floor);
    this._drawPlayer(ctx, p);
  }

  _drawExtraction(ctx, game, floor, pulse) {
    if (floor !== 0) return;
    const z = EXTRACTION.zone;
    const x = this._px(z.x0), y = this._pz(z.z0);
    const w = (z.x1 - z.x0) * this.s, h = (z.z1 - z.z0) * this.s;
    const hold = game.mission?.phase === 'hold';
    ctx.fillStyle = `rgba(111, 208, 140, ${hold ? 0.06 + 0.1 * pulse : 0.07})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = INK.green;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(this._snap(x), this._snap(y), Math.round(w), Math.round(h));
    ctx.setLineDash([]);
  }

  _objectiveTarget(game) {
    const m = game.mission;
    if (!m || m.result) return null;
    if (m.phase === 'infiltrate') return { x: -38, z: 0, floor: 0 }; // staff entrance
    if (m.phase === 'locate' || m.phase === 'secure') {
      const h = (game.ai?.hostages || []).find((o) => o.alive && o.state === 'captive');
      if (h) return { x: h.pos.x, z: h.pos.z, floor: h.pos.y > FLOOR_SWITCH_Y ? 1 : 0 };
    }
    if (m.phase === 'escort' || m.phase === 'locate' || m.phase === 'secure') {
      const pn = SPECIALS.extractionPanel;
      return { x: pn.x, z: pn.z, floor: 0 };
    }
    if (m.phase === 'hold') {
      const z = EXTRACTION.zone;
      return { x: (z.x0 + z.x1) / 2, z: (z.z0 + z.z1) / 2, floor: 0 };
    }
    return null;
  }

  _drawObjective(ctx, game, floor, pulse) {
    const t = this._objectiveTarget(game);
    if (!t) return;
    const same = t.floor === floor;
    const r = 3.2;
    ctx.save();
    ctx.globalAlpha = same ? 0.45 + 0.55 * pulse : 0.35;
    ctx.translate(this._px(t.x), this._pz(t.z));
    ctx.rotate(Math.PI / 4);
    if (same) {
      ctx.fillStyle = INK.amber;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.strokeStyle = 'rgba(6, 12, 19, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-r, -r, r * 2, r * 2);
    } else {
      ctx.strokeStyle = INK.amber;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-r, -r, r * 2, r * 2);
    }
    ctx.restore();
  }

  _drawHostages(ctx, game, floor) {
    for (const h of game.ai?.hostages || []) {
      if (!h.alive) continue;
      if (!h.found && h.state === 'captive') continue; // not yet located
      const hf = h.pos.y > FLOOR_SWITCH_Y ? 1 : 0;
      const x = this._px(h.pos.x), y = this._pz(h.pos.z);
      const color = h.state === 'extracted' ? INK.green : INK.amber;
      ctx.globalAlpha = hf === floor ? 1 : 0.38;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      if (h.state === 'captive') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.3;
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(6, 12, 19, 0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  _drawPlayer(ctx, p) {
    ctx.save();
    ctx.translate(this._px(p.pos.x), this._pz(p.pos.z));
    ctx.rotate(-p.yaw); // north-up: canvas rotation mirrors world yaw
    ctx.fillStyle = 'rgba(143, 216, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 14, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = INK.ice;
    ctx.strokeStyle = 'rgba(4, 10, 16, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -4.4);
    ctx.lineTo(3.2, 3.6);
    ctx.lineTo(0, 1.8);
    ctx.lineTo(-3.2, 3.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
