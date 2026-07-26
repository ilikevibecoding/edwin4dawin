// ---------------------------------------------------------------------------
// NORTHSTAR RESCUE — canvas floor-plan renderer  (owner: fable1)
//
// One renderer, two costumes:
//   * style 'hud'  — small, quiet, zone-tinted; drawn every few frames
//   * style 'plan' — the briefing map: larger, labelled, with a hand-drawn
//                    line quality (deterministic jitter, doubled strokes)
//
// Geometry comes straight from src/map/layout.js (ROOMS / OPENINGS / STAIRS),
// so the map can never disagree with the level.
//
// World -> canvas: x_canvas = worldX (east), y_canvas = worldZ (south).
// North (-Z) is therefore up, which is what a floor plan should do.
// ---------------------------------------------------------------------------

import { ROOMS, OPENINGS, STAIRS, EXTRACTION, PLAYER_SPAWN, HOSTAGE_POINTS } from '../map/layout.js';
import { PALETTE, MAP_INK, MAP_ZONE_FILLS, css } from '../art/palette.js';

const DPR = () => Math.min(2, globalThis.devicePixelRatio || 1);

/** Rooms that get a printed label on the large map, with short display names. */
const LABELS = {
  courtyard: 'COURTYARD', lobby: 'LOBBY', openoffice: 'OPEN OFFICE',
  conference: 'CONFERENCE', breakroom: 'BREAK ROOM', servicecorr: 'SERVICE',
  loading: 'LOADING', garage: 'GARAGE', serverroom: 'SERVER',
  copyroom: 'COPY', itroom: 'IT', mechanical: 'MECH', restrooms: 'WC',
  waiting: 'WAITING', vestibule: 'VESTIBULE', stairwell: 'STAIR', weststair: 'STAIR',
  execoffice: 'EXEC OFFICE', execcorr: 'GALLERY', archive: 'ARCHIVE',
  upperlanding: 'LANDING', upperweststair: 'STAIR', eastapron: 'EAST APRON',
  eastlink: 'LINK', midcorr: 'CORRIDOR', janitor: 'JAN', entrance: 'ENTRY',
};

/** Deterministic jitter for the hand-drawn plan style (no Math.random). */
function jitter(seedA, seedB, amp) {
  const s = Math.sin(seedA * 127.1 + seedB * 311.7) * 43758.5453;
  return ((s - Math.floor(s)) - 0.5) * 2 * amp;
}

export class MinimapRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{style?:'hud'|'plan', padding?:number}} opts
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.style = opts.style || 'hud';
    this.padding = opts.padding ?? (this.style === 'plan' ? 26 : 10);
    this.floor = 'ground';
    this._bounds = this._computeBounds();
  }

  _computeBounds() {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const r of ROOMS) {
      x0 = Math.min(x0, r.x0); z0 = Math.min(z0, r.z0);
      x1 = Math.max(x1, r.x1); z1 = Math.max(z1, r.z1);
    }
    if (!Number.isFinite(x0)) { x0 = -25; z0 = -30; x1 = 36; z1 = 20; }
    return { x0, z0, x1, z1 };
  }

  setFloor(floor) {
    this.floor = floor === 'upper' ? 'upper' : 'ground';
  }

  /** World (x, z) -> canvas px, in CSS pixels. */
  project(x, z) {
    return [this._ox + (x - this._bounds.x0) * this._scale,
      this._oy + (z - this._bounds.z0) * this._scale];
  }

  _prepare() {
    const dpr = DPR();
    const cssW = this.canvas.clientWidth || this.canvas.width;
    const cssH = this.canvas.clientHeight || this.canvas.height;
    if (this.canvas.width !== Math.round(cssW * dpr) || this.canvas.height !== Math.round(cssH * dpr)) {
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const b = this._bounds;
    const spanX = b.x1 - b.x0;
    const spanZ = b.z1 - b.z0;
    this._scale = Math.min((cssW - this.padding * 2) / spanX, (cssH - this.padding * 2) / spanZ);
    this._ox = (cssW - spanX * this._scale) / 2;
    this._oy = (cssH - spanZ * this._scale) / 2;
    this._w = cssW;
    this._h = cssH;
    return ctx;
  }

  /**
   * Draw the map.
   * @param {{
   *   floor?: 'ground'|'upper',
   *   player?: {x:number, z:number, yaw:number}|null,
   *   markers?: Array<{x:number, z:number, kind:string, label?:string, floor?:string}>,
   *   doorStates?: Record<string, {open?:boolean, locked?:boolean}>,
   *   showLabels?: boolean,
   *   showCompass?: boolean,
   * }} state
   */
  render(state = {}) {
    const ctx = this._prepare();
    const floor = state.floor || this.floor;
    const plan = this.style === 'plan';
    const jit = plan ? 0.9 : 0;

    ctx.clearRect(0, 0, this._w, this._h);
    ctx.fillStyle = css(MAP_INK.paper, plan ? 1 : 0.0);
    if (plan) ctx.fillRect(0, 0, this._w, this._h);

    if (plan) this._grid(ctx);

    const rooms = ROOMS.filter((r) => r.floor === floor);
    // Ghost of the other floor, so the plan reads as one building.
    if (plan) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      for (const r of ROOMS.filter((x) => x.floor !== floor)) this._roomOutline(ctx, r, MAP_INK.wallDim, 1, 0);
      ctx.restore();
    }

    for (const r of rooms) this._roomFill(ctx, r);
    for (const r of rooms) this._roomOutline(ctx, r, plan ? MAP_INK.wall : MAP_INK.wallDim, plan ? 1.6 : 1, jit);
    if (plan) {
      // Doubled line pass gives the hand-inked feel.
      ctx.save();
      ctx.globalAlpha = 0.35;
      for (const r of rooms) this._roomOutline(ctx, r, MAP_INK.wall, 0.8, jit * 1.8);
      ctx.restore();
    }

    this._openings(ctx, floor, state.doorStates || {}, plan);
    this._stairs(ctx, floor, plan);

    if ((state.showLabels ?? plan) && this._scale > 4) this._labels(ctx, rooms);

    for (const m of state.markers || []) {
      if (m.floor && m.floor !== floor) continue;
      this._marker(ctx, m, plan);
    }

    if (state.player) this._player(ctx, state.player, plan);
    if (state.showCompass ?? plan) this._compass(ctx);
  }

  // ------------------------------------------------------------- passes --

  _grid(ctx) {
    ctx.save();
    ctx.strokeStyle = css(MAP_INK.paperLine);
    ctx.lineWidth = 1;
    const step = 5 * this._scale;
    for (let x = this._ox % step; x < this._w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this._h); ctx.stroke();
    }
    for (let y = this._oy % step; y < this._h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this._w, y); ctx.stroke();
    }
    ctx.restore();
  }

  _roomFill(ctx, r) {
    const [x0, y0] = this.project(r.x0, r.z0);
    const [x1, y1] = this.project(r.x1, r.z1);
    // HUD fills stay translucent so the panel reads as an overlay, not a
    // solid card fighting the scene.
    ctx.fillStyle = css(MAP_ZONE_FILLS[r.zone] ?? MAP_ZONE_FILLS.office, this.style === 'plan' ? 0.9 : 0.48);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }

  _roomOutline(ctx, r, colorHex, width, jit) {
    const pts = [
      [r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1],
    ];
    ctx.strokeStyle = css(colorHex);
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i <= pts.length; i++) {
      const [wx, wz] = pts[i % pts.length];
      let [px, py] = this.project(wx, wz);
      if (jit) {
        px += jitter(wx + i, wz, jit);
        py += jitter(wz - i, wx, jit);
      }
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  /** Doors read as gaps; windows and glass walls as accent hairlines. */
  _openings(ctx, floor, doorStates, plan) {
    for (const op of OPENINGS) {
      if (op.floor !== floor) continue;
      const half = (op.width || 1) / 2;
      let ax, ay, bx, by;
      if (op.axis === 'x') { // wall runs along X at z = coord
        [ax, ay] = this.project(op.at - half, op.coord);
        [bx, by] = this.project(op.at + half, op.coord);
      } else {               // wall runs along Z at x = coord
        [ax, ay] = this.project(op.coord, op.at - half);
        [bx, by] = this.project(op.coord, op.at + half);
      }
      const glassy = op.type === 'window' || op.type === 'interiorwindow' || op.type === 'glasswall';
      // Punch the gap.
      ctx.save();
      ctx.strokeStyle = css(MAP_INK.paper);
      ctx.lineWidth = plan ? 3.4 : 2.4;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      if (glassy) {
        ctx.strokeStyle = css(MAP_INK.glass, plan ? 0.75 : 0.55);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      } else if (plan && op.door) {
        // Door leaf tick at the hinge side; red when reported locked.
        const st = doorStates[op.door] || {};
        ctx.strokeStyle = st.locked ? css(MAP_INK.danger) : css(MAP_INK.door, 0.85);
        ctx.lineWidth = 1.1;
        const len = Math.min(9, Math.hypot(bx - ax, by - ay));
        ctx.beginPath();
        if (op.axis === 'x') { ctx.moveTo(ax, ay); ctx.lineTo(ax, ay + len * 0.9); }
        else { ctx.moveTo(ax, ay); ctx.lineTo(ax + len * 0.9, ay); }
        ctx.stroke();
      } else if (!plan && op.door) {
        const st = doorStates[op.door] || {};
        if (st.locked) {
          ctx.fillStyle = css(MAP_INK.danger, 0.9);
          ctx.fillRect((ax + bx) / 2 - 1.4, (ay + by) / 2 - 1.4, 2.8, 2.8);
        }
      }
      ctx.restore();
    }
  }

  _stairs(ctx, floor, plan) {
    if (!plan) return;
    ctx.save();
    ctx.strokeStyle = css(MAP_INK.stair);
    ctx.lineWidth = 1;
    for (const s of STAIRS) {
      const run = s.steps * s.run;
      const zTop = s.zBottom - run;
      for (let i = 0; i <= s.steps; i += 2) {
        const z = s.zBottom - (run * i) / s.steps;
        const [x1, y1] = this.project(s.x - s.width / 2, z);
        const [x2, y2] = this.project(s.x + s.width / 2, z);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      // Direction-of-climb arrow.
      const [cx1, cy1] = this.project(s.x, s.zBottom);
      const [cx2, cy2] = this.project(s.x, zTop);
      ctx.beginPath(); ctx.moveTo(cx1, cy1); ctx.lineTo(cx2, cy2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx2 - 3, cy2 + 4); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2 + 3, cy2 + 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  _labels(ctx, rooms) {
    ctx.save();
    ctx.fillStyle = css(MAP_INK.label, this.style === 'plan' ? 0.95 : 0.75);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = this.style === 'plan' ? Math.max(8, Math.min(11, this._scale * 1.6)) : 7;
    ctx.font = `600 ${size}px "Bahnschrift", "Arial Narrow", system-ui, sans-serif`;
    for (const r of rooms) {
      const label = LABELS[r.id];
      if (!label) continue;
      const w = (r.x1 - r.x0) * this._scale;
      if (w < label.length * size * 0.5) continue;
      const [cx, cy] = this.project((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2);
      ctx.fillText(label, cx, cy, w - 4);
    }
    ctx.restore();
  }

  _marker(ctx, m, plan) {
    const [x, y] = this.project(m.x, m.z);
    const s = plan ? 6 : 4.2;
    ctx.save();
    ctx.lineWidth = plan ? 1.6 : 1.3;
    switch (m.kind) {
      case 'extraction':
        ctx.strokeStyle = css(MAP_INK.extraction);
        ctx.strokeRect(x - s, y - s, s * 2, s * 2);
        ctx.beginPath();
        ctx.moveTo(x, y - s * 0.55); ctx.lineTo(x, y + s * 0.55);
        ctx.moveTo(x - s * 0.45, y + 0.5); ctx.lineTo(x, y + s * 0.55); ctx.lineTo(x + s * 0.45, y + 0.5);
        ctx.stroke();
        break;
      case 'hostage':
        ctx.strokeStyle = css(MAP_INK.hostage);
        ctx.beginPath(); ctx.arc(x, y - s * 0.35, s * 0.4, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - s * 0.6, y + s * 0.8); ctx.quadraticCurveTo(x, y - s * 0.1, x + s * 0.6, y + s * 0.8); ctx.stroke();
        break;
      case 'insertion':
        ctx.strokeStyle = css(MAP_INK.player, 0.85);
        ctx.beginPath(); ctx.arc(x, y, s * 0.7, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.stroke();
        break;
      case 'danger':
        ctx.strokeStyle = css(MAP_INK.danger);
        ctx.beginPath();
        ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s * 0.8); ctx.lineTo(x - s, y + s * 0.8); ctx.closePath();
        ctx.stroke();
        break;
      default: // objective diamond
        ctx.strokeStyle = css(MAP_INK.objective);
        ctx.beginPath();
        ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y);
        ctx.closePath(); ctx.stroke();
    }
    if (plan && m.label) {
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '600 9px "Bahnschrift", "Arial Narrow", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(m.label).toUpperCase(), x, y + s + 9);
    }
    ctx.restore();
  }

  _player(ctx, p, plan) {
    const [x, y] = this.project(p.x, p.z);
    // World yaw 0 faces -Z (up on the map), increasing counter-clockwise.
    const dx = -Math.sin(p.yaw || 0);
    const dy = -Math.cos(p.yaw || 0);
    const a = Math.atan2(dy, dx);
    const s = plan ? 7 : 5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = css(MAP_INK.player);
    ctx.strokeStyle = css(PALETTE.uiPanel, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.72, s);
    ctx.lineTo(0, s * 0.45);
    ctx.lineTo(-s * 0.72, s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  _compass(ctx) {
    const x = this._w - 20;
    const y = 22;
    ctx.save();
    ctx.strokeStyle = css(MAP_INK.wall, 0.8);
    ctx.fillStyle = css(MAP_INK.wall, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 8); ctx.lineTo(x + 2.6, y + 2); ctx.lineTo(x, y); ctx.lineTo(x - 2.6, y + 2);
    ctx.closePath(); ctx.fill();
    ctx.font = '700 7px "Bahnschrift", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', x, y - 12);
    ctx.restore();
  }
}

/** Standard mission markers derived from the layout, for briefing + HUD. */
export function layoutMarkers({ hostages = true, extraction = true, insertion = false } = {}) {
  const out = [];
  if (extraction && EXTRACTION?.center) {
    out.push({
      x: EXTRACTION.center[0], z: EXTRACTION.center[2], kind: 'extraction',
      label: 'Extraction', floor: 'ground',
    });
  }
  if (insertion && PLAYER_SPAWN?.pos) {
    out.push({ x: PLAYER_SPAWN.pos[0], z: PLAYER_SPAWN.pos[2], kind: 'insertion', label: 'Insertion', floor: 'ground' });
  }
  if (hostages && Array.isArray(HOSTAGE_POINTS)) {
    for (const h of HOSTAGE_POINTS) {
      out.push({
        x: h.pos?.[0] ?? 0, z: h.pos?.[2] ?? 0, kind: 'hostage',
        label: h.name || 'Hostage', floor: (h.pos?.[1] ?? 0) > 2 ? 'upper' : 'ground',
        id: h.id,
      });
    }
  }
  return out;
}
