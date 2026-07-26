/**
 * TACTICAL MINIMAP — Northstar Rescue
 * Owner: Fable 1.
 *
 * A clean architectural plan view drawn from the ROOMS rectangles in
 * src/map/layout.js: room fills keyed by kind, shared-edge wall strokes,
 * door/arch gaps and window lines from OPENINGS, stair runs, the extraction
 * zone, hostage / objective / enemy markers and the player view wedge.
 *
 * North-up (+X east → right, +Z south → down). Compact mode is a scrolling
 * window centred on the player; expanded mode fits the whole building.
 */

import {
  ROOMS, OPENINGS, STAIRS, EXTRACTION_ZONE, BUILDING_SHELL, UPPER_VOIDS,
} from '../map/layout.js';
import { UI } from '../art/palette.js';

const COMPACT_METRES = 34;  // world metres visible across the compact map
const KIND_FILL = {
  room: 'rgba(127, 212, 255, 0.070)',
  corridor: 'rgba(127, 212, 255, 0.135)',
  stair: 'rgba(127, 212, 255, 0.105)',
};
const HOSTAGE_COLORS = {
  unknown: 'rgba(147, 167, 184, 0.85)',
  located: '#d9a441',
  secured: '#7fd4ff',
  following: '#7fd4ff',
  extracted: '#35e07f',
  down: '#ff4438',
};

/** Extract a world [x, z] from whatever shape the caller hands us. */
function pt(o) {
  if (!o && o !== 0) return null;
  if (Array.isArray(o)) return o.length >= 3 ? [o[0], o[2]] : [o[0], o[1]];
  if (typeof o === 'object') {
    if (o.pos !== undefined) return pt(o.pos);
    if (o.position !== undefined) return pt(o.position);
    if (typeof o.x === 'number' && typeof o.z === 'number') return [o.x, o.z];
  }
  return null;
}

export class Minimap {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.expanded = false;
    this.data = {
      playerPos: [0, 0, 0],
      playerYaw: 0,
      floor: 'ground',
      enemies: [],
      hostages: [],
      objectives: [],
      doors: [],
      extraction: EXTRACTION_ZONE,
    };
    this._roomsByFloor = {
      ground: ROOMS.filter((r) => r.floor === 'ground' && r.kind !== 'exterior'),
      upper: ROOMS.filter((r) => r.floor === 'upper' && r.kind !== 'exterior'),
    };
    this._openingsByFloor = {
      ground: OPENINGS.filter((o) => o.floor === 'ground'),
      upper: OPENINGS.filter((o) => o.floor === 'upper'),
    };
    this._disposed = false;
    this._resize();
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => {
        this._resize();
        this.draw();
      });
      this._ro.observe(canvasEl);
    }
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(this.canvas.clientWidth, 32);
    const h = Math.max(this.canvas.clientHeight, 32);
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this._dpr = dpr;
    this._w = w;
    this._h = h;
  }

  /** Merge the payload (undefined fields keep their previous value) and redraw. */
  update(payload = {}) {
    if (this._disposed) return;
    for (const [k, v] of Object.entries(payload)) {
      if (v !== undefined) this.data[k] = v;
    }
    this.draw();
  }

  setExpanded(bool) {
    this.expanded = !!bool;
    this.canvas.classList.toggle('expanded', this.expanded);
    this._resize();
    this.draw();
  }

  /* -------------------------------------------------------------- */

  draw() {
    if (this._disposed) return;
    const { ctx } = this;
    if (this.canvas.clientWidth !== this._w || this.canvas.clientHeight !== this._h) this._resize();
    const w = this._w;
    const h = this._h;
    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const d = this.data;
    const floor = d.floor === 'upper' ? 'upper' : 'ground';
    const player = pt(d.playerPos) ?? [0, 0];

    // View transform: world metre → css px, north-up.
    let scale;
    let camX;
    let camZ;
    if (this.expanded) {
      const mx = 3;
      const bw = BUILDING_SHELL.x1 - BUILDING_SHELL.x0 + mx * 2;
      const bh = BUILDING_SHELL.z1 - BUILDING_SHELL.z0 + mx * 2;
      scale = Math.min(w / bw, h / bh);
      camX = (BUILDING_SHELL.x0 + BUILDING_SHELL.x1) / 2;
      camZ = (BUILDING_SHELL.z0 + BUILDING_SHELL.z1) / 2;
    } else {
      scale = Math.min(w, h) / COMPACT_METRES;
      camX = player[0];
      camZ = player[1];
    }
    const sx = (x) => w / 2 + (x - camX) * scale;
    const sy = (z) => h / 2 + (z - camZ) * scale;

    // Clip to a rounded viewport and lay a dark ground.
    ctx.save();
    const r = Math.min(10, w * 0.08);
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, w - 1, h - 1, r);
    ctx.clip();
    ctx.fillStyle = 'rgba(6, 11, 18, 0.86)';
    ctx.fillRect(0, 0, w, h);

    // Fine survey grid.
    ctx.strokeStyle = 'rgba(127, 212, 255, 0.05)';
    ctx.lineWidth = 1;
    const grid = 5 * scale;
    if (grid > 7) {
      ctx.beginPath();
      for (let gx = sx(Math.ceil((camX - w / scale) / 5) * 5); gx < w; gx += grid) {
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
      }
      for (let gz = sy(Math.ceil((camZ - h / scale) / 5) * 5); gz < h; gz += grid) {
        ctx.moveTo(0, gz);
        ctx.lineTo(w, gz);
      }
      ctx.stroke();
    }

    // Room plates.
    for (const room of this._roomsByFloor[floor]) {
      ctx.fillStyle = KIND_FILL[room.kind] ?? KIND_FILL.room;
      ctx.fillRect(sx(room.x0), sy(room.z0), (room.x1 - room.x0) * scale, (room.z1 - room.z0) * scale);
    }
    // Voids on the upper floor read as openings to below.
    if (floor === 'upper') {
      ctx.fillStyle = 'rgba(6, 11, 18, 0.8)';
      for (const v of UPPER_VOIDS) {
        ctx.fillRect(sx(v.x0), sy(v.z0), (v.x1 - v.x0) * scale, (v.z1 - v.z0) * scale);
      }
    }

    // Wall strokes.
    ctx.strokeStyle = 'rgba(127, 212, 255, 0.55)';
    ctx.lineWidth = Math.max(1, scale * 0.14);
    for (const room of this._roomsByFloor[floor]) {
      ctx.strokeRect(sx(room.x0), sy(room.z0), (room.x1 - room.x0) * scale, (room.z1 - room.z0) * scale);
    }

    // Openings: erase wall gaps, mark doors and windows.
    const wallW = Math.max(2, scale * 0.3);
    for (const op of this._openingsByFloor[floor]) {
      const along = Math.abs(op.b - op.a);
      const horizontal = op.axis === 'z'; // wall runs along X
      const x = horizontal ? sx(op.a) : sx(op.at) - wallW / 2;
      const y = horizontal ? sy(op.at) - wallW / 2 : sy(op.a);
      const ww = horizontal ? along * scale : wallW;
      const hh = horizontal ? wallW : along * scale;
      if (op.type === 'door' || op.type === 'arch' || op.type === 'open' || op.type === 'shutter') {
        ctx.fillStyle = 'rgba(6, 11, 18, 0.95)';
        ctx.fillRect(x, y, ww, hh);
        if (op.type === 'door' || op.type === 'shutter') {
          ctx.fillStyle = 'rgba(127, 212, 255, 0.75)';
          if (horizontal) ctx.fillRect(x, y + wallW / 2 - 0.75, ww, 1.5);
          else ctx.fillRect(x + wallW / 2 - 0.75, y, 1.5, hh);
        }
      } else if (op.type === 'window' || op.type === 'glasswall') {
        ctx.fillStyle = 'rgba(188, 216, 234, 0.85)';
        if (horizontal) ctx.fillRect(x, y + wallW / 2 - 0.6, ww, 1.2);
        else ctx.fillRect(x + wallW / 2 - 0.6, y, 1.2, hh);
      } else if (op.type === 'rail') {
        ctx.strokeStyle = 'rgba(127, 212, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        if (horizontal) {
          ctx.moveTo(x, y + wallW / 2);
          ctx.lineTo(x + ww, y + wallW / 2);
        } else {
          ctx.moveTo(x + wallW / 2, y);
          ctx.lineTo(x + wallW / 2, y + hh);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(127, 212, 255, 0.55)';
        ctx.lineWidth = Math.max(1, scale * 0.14);
      }
    }

    // Stair runs with tread rungs.
    ctx.strokeStyle = 'rgba(127, 212, 255, 0.4)';
    ctx.lineWidth = 1;
    for (const stair of STAIRS) {
      for (const f of stair.flights) {
        const horiz = f.dir.startsWith('x');
        const sign = f.dir.endsWith('+') ? 1 : -1;
        const steps = 6;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * f.length * sign;
          if (horiz) {
            ctx.moveTo(sx(f.x0 + t), sy(f.z0));
            ctx.lineTo(sx(f.x0 + t), sy(f.z0 + f.width));
          } else {
            ctx.moveTo(sx(f.x0), sy(f.z0 + t));
            ctx.lineTo(sx(f.x0 + f.width), sy(f.z0 + t));
          }
        }
        ctx.stroke();
      }
    }

    // Extraction zone (ground floor).
    const ex = d.extraction ?? EXTRACTION_ZONE;
    if (ex && floor === (ex.floor ?? 'ground')) {
      ctx.strokeStyle = 'rgba(53, 224, 127, 0.9)';
      ctx.fillStyle = 'rgba(53, 224, 127, 0.14)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 3]);
      const exw = (ex.x1 - ex.x0) * scale;
      const exh = (ex.z1 - ex.z0) * scale;
      ctx.fillRect(sx(ex.x0), sy(ex.z0), exw, exh);
      ctx.strokeRect(sx(ex.x0), sy(ex.z0), exw, exh);
      ctx.setLineDash([]);
      if (exw > 18) {
        ctx.fillStyle = 'rgba(53, 224, 127, 0.95)';
        ctx.font = `700 ${Math.max(8, scale * 1.4)}px ${UI.fontMono}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('EXT', sx((ex.x0 + ex.x1) / 2), sy((ex.z0 + ex.z1) / 2));
      }
    }

    // Runtime doors (open/closed state) if the lead supplies them.
    for (const door of d.doors ?? []) {
      const p = pt(door);
      if (!p) continue;
      if (door.floor && door.floor !== floor) continue;
      ctx.fillStyle = door.open ? 'rgba(53, 224, 127, 0.8)' : 'rgba(127, 212, 255, 0.8)';
      ctx.fillRect(sx(p[0]) - 1.5, sy(p[1]) - 1.5, 3, 3);
    }

    // Objective markers.
    for (const obj of d.objectives ?? []) {
      const p = pt(obj);
      if (!p) continue;
      if (obj.floor && obj.floor !== floor) continue;
      this._diamond(sx(p[0]), sy(p[1]), 5, obj.done ? 'rgba(147,167,184,0.6)' : '#d9a441');
    }

    // Hostages.
    for (const hos of d.hostages ?? []) {
      const p = pt(hos);
      if (!p) continue;
      if (hos.floor && hos.floor !== floor) continue;
      const col = HOSTAGE_COLORS[hos.state] ?? HOSTAGE_COLORS.unknown;
      ctx.beginPath();
      ctx.arc(sx(p[0]), sy(p[1]), 4, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(8, 13, 20, 0.9)';
      ctx.stroke();
    }

    // Enemies — reserved red, per the colour script.
    for (const en of d.enemies ?? []) {
      if (en && en.alive === false) continue;
      const p = pt(en);
      if (!p) continue;
      if (en.floor && en.floor !== floor) continue;
      ctx.beginPath();
      ctx.arc(sx(p[0]), sy(p[1]), 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4438';
      ctx.fill();
    }

    // Player: view wedge + arrow. Yaw 0 faces north (-Z, screen up).
    const px = sx(player[0]);
    const py = sy(player[1]);
    const yaw = Number(d.playerYaw) || 0;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(yaw);
    const cone = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
    cone.addColorStop(0, 'rgba(127, 212, 255, 0.35)');
    cone.addColorStop(1, 'rgba(127, 212, 255, 0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 30, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.4, 4.6);
    ctx.lineTo(0, 2.4);
    ctx.lineTo(-4.4, 4.6);
    ctx.closePath();
    ctx.fillStyle = '#e6f1fa';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(8, 13, 20, 0.9)';
    ctx.stroke();
    ctx.restore();

    // Frame chrome: north indicator + floor tag.
    ctx.font = `600 10px ${UI.fontMono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(230, 241, 250, 0.75)';
    ctx.fillText('N', w / 2, 4);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(147, 167, 184, 0.9)';
    ctx.fillText(floor === 'upper' ? 'FL 2' : 'FL 1', 7, h - 7);
    ctx.restore();

    // Border.
    ctx.strokeStyle = 'rgba(127, 212, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, w - 1, h - 1, r);
    ctx.stroke();
  }

  _diamond(x, y, r, color) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(8, 13, 20, 0.9)';
    ctx.stroke();
  }

  dispose() {
    this._disposed = true;
    this._ro?.disconnect();
    this._ro = null;
  }
}
