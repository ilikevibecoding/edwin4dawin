// Minimap renderer (Fable 1 domain): draws layout rooms/walls per floor onto canvas.
// Used by the HUD (player-centered viewport) and the briefing screen (full blueprint plate).
import { ROOMS, VOIDS, OPENINGS, EXTRACTION, HOSTAGES } from '../map/layout.js';

const FLOOR_FILL = {
  0: 'rgba(36, 56, 74, 0.6)',
  1: 'rgba(42, 64, 84, 0.6)',
};
const WALL = 'rgba(170, 205, 228, 0.85)';
const DOOR = 'rgba(111, 195, 232, 0.95)';
const INK_FAINT = 'rgba(100, 121, 138, 0.9)';

export function drawFloorPlan(ctx, floorIdx, opts) {
  const { x0, z0, scale, w, h } = opts;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  const X = (wx) => (wx - x0) * scale;
  const Z = (wz) => (wz - z0) * scale;

  for (const room of ROOMS) {
    if (room.floor !== floorIdx) continue;
    ctx.fillStyle = room.exterior ? 'rgba(200, 220, 235, 0.12)' : FLOOR_FILL[floorIdx];
    for (const rc of room.rects) {
      ctx.fillRect(X(rc[0]), Z(rc[1]), (rc[2] - rc[0]) * scale, (rc[3] - rc[1]) * scale);
    }
  }
  for (const v of VOIDS) {
    if (v.floor !== floorIdx) continue;
    ctx.fillStyle = 'rgba(8, 14, 21, 0.85)';
    ctx.fillRect(X(v.rect[0]), Z(v.rect[1]), (v.rect[2] - v.rect[0]) * scale, (v.rect[3] - v.rect[1]) * scale);
    // hatch the atrium void so it reads as "no floor"
    ctx.save();
    ctx.beginPath();
    ctx.rect(X(v.rect[0]), Z(v.rect[1]), (v.rect[2] - v.rect[0]) * scale, (v.rect[3] - v.rect[1]) * scale);
    ctx.clip();
    ctx.strokeStyle = 'rgba(126, 168, 200, 0.14)';
    ctx.lineWidth = 1;
    const step = scale * 1.6;
    for (let d = -((v.rect[3] - v.rect[1]) * scale); d < (v.rect[2] - v.rect[0]) * scale; d += step) {
      ctx.beginPath();
      ctx.moveTo(X(v.rect[0]) + d, Z(v.rect[1]));
      ctx.lineTo(X(v.rect[0]) + d + (v.rect[3] - v.rect[1]) * scale, Z(v.rect[3]));
      ctx.stroke();
    }
    ctx.restore();
  }
  // walls: crisp room outlines
  ctx.strokeStyle = WALL;
  ctx.lineWidth = Math.max(1, scale * 0.16);
  for (const room of ROOMS) {
    if (room.floor !== floorIdx) continue;
    for (const rc of room.rects) {
      ctx.strokeRect(X(rc[0]), Z(rc[1]), (rc[2] - rc[0]) * scale, (rc[3] - rc[1]) * scale);
    }
  }
  // door gaps drawn as accent ticks
  ctx.strokeStyle = DOOR;
  ctx.lineWidth = Math.max(1.5, scale * 0.26);
  for (const op of OPENINGS) {
    if (op.type !== 'door' && op.type !== 'arch' && op.type !== 'shutter') continue;
    const aRoom = ROOMS.find((r) => r.id === op.a);
    if (!aRoom || aRoom.floor !== floorIdx) continue;
    const [px, pz] = op.at;
    ctx.beginPath();
    // draw across the doorway: guess axis from nearby room edges (vertical if x matches an edge)
    const vertical = ROOMS.some((r) => r.floor === floorIdx && r.rects.some((rc) => Math.abs(rc[0] - px) < 0.15 || Math.abs(rc[2] - px) < 0.15));
    if (vertical) {
      ctx.moveTo(X(px), Z(pz - op.w / 2));
      ctx.lineTo(X(px), Z(pz + op.w / 2));
    } else {
      ctx.moveTo(X(px - op.w / 2), Z(pz));
      ctx.lineTo(X(px + op.w / 2), Z(pz));
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Rooms called out on the briefing schematic, per floor.
const PLAN_LABELS = {
  0: [['garage', 'GARAGE'], ['loading', 'LOADING'], ['lobby', 'LOBBY'], ['server', 'SERVER'], ['sec', 'SEC']],
  1: [['exec', 'EXEC'], ['conference', 'CONF'], ['cubes', 'OFFICE'], ['records', 'RECORDS']],
};

export function drawBriefingMap(canvas) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  // plate background + faint survey grid
  ctx.fillStyle = '#081119';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(111, 195, 232, 0.05)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < w; gx += 46) {
    ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, h); ctx.stroke();
  }
  for (let gz = 0; gz < h; gz += 46) {
    ctx.beginPath(); ctx.moveTo(0, gz + 0.5); ctx.lineTo(w, gz + 0.5); ctx.stroke();
  }

  const margin = 22, gap = 26, headroom = 46;
  const halfW = (w - margin * 2 - gap) / 2;
  const scale = Math.min(halfW / 66, (h - headroom - margin) / 62);
  // ground floor left, upper right
  for (const floorIdx of [0, 1]) {
    ctx.save();
    ctx.translate(margin + floorIdx * (halfW + gap), headroom);
    drawFloorPlan(ctx, floorIdx, { x0: -10, z0: -8, scale, w: halfW, h: h - headroom - margin });
    const X = (wx) => (wx + 10) * scale;
    const Z = (wz) => (wz + 8) * scale;

    // room callouts
    ctx.fillStyle = INK_FAINT;
    ctx.font = `${Math.max(8, scale * 1.35)}px monospace`;
    ctx.textAlign = 'center';
    for (const [id, name] of PLAN_LABELS[floorIdx]) {
      const room = ROOMS.find((r) => r.id === id && r.floor === floorIdx);
      if (!room) continue;
      const rc = room.rects[0];
      ctx.fillText(name, X((rc[0] + rc[2]) / 2), Z((rc[1] + rc[3]) / 2) + 3);
    }
    ctx.textAlign = 'left';

    // markers
    if (floorIdx === 0) {
      marker(ctx, X(EXTRACTION.center[0]), Z(EXTRACTION.center[2]), '#6fd08c', 'diamond', scale);
      label(ctx, X(EXTRACTION.center[0]), Z(EXTRACTION.center[2]) - scale * 1.6, 'EXFIL', '#6fd08c', scale);
      marker(ctx, X(26), Z(42), '#6fc3e8', 'arrow', scale);
      label(ctx, X(26) + scale * 2, Z(42) + 3, 'ENTRY', '#6fc3e8', scale, 'left');
    }
    for (const hs of HOSTAGES) {
      const hFloor = hs.pos[1] > 2 ? 1 : 0;
      if (hFloor !== floorIdx) continue;
      marker(ctx, X(hs.pos[0]), Z(hs.pos[2]), '#e8b45f', 'query', scale);
      label(ctx, X(hs.pos[0]), Z(hs.pos[2]) - scale * 1.6, 'HOSTAGE?', '#e8b45f', scale);
    }

    // floor title
    ctx.fillStyle = 'rgba(167, 188, 204, 0.95)';
    ctx.font = `bold ${Math.max(10, scale * 1.6)}px monospace`;
    ctx.fillText(floorIdx === 0 ? '01 — GROUND FLOOR' : '02 — UPPER FLOOR', 2, -14);
    ctx.strokeStyle = 'rgba(126, 168, 200, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -8.5); ctx.lineTo(halfW - 8, -8.5);
    ctx.stroke();
    ctx.restore();
  }

  // frame + corner ticks
  ctx.strokeStyle = 'rgba(126, 168, 200, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(8.5, 8.5, w - 17, h - 17);
  ctx.strokeStyle = 'rgba(150, 200, 235, 0.75)';
  ctx.lineWidth = 2;
  const tick = 16;
  for (const [cx, cy, dx, dy] of [[8, 8, 1, 1], [w - 8, 8, -1, 1], [8, h - 8, 1, -1], [w - 8, h - 8, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * tick, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * tick);
    ctx.stroke();
  }

  // north arrow (map +z is south; north points up) + scale bar
  const nx = w - 34, ny = 40;
  ctx.strokeStyle = '#6fc3e8';
  ctx.fillStyle = '#6fc3e8';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(nx, ny, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(nx, ny - 9); ctx.lineTo(nx + 4, ny + 6); ctx.lineTo(nx, ny + 2.5); ctx.lineTo(nx - 4, ny + 6);
  ctx.closePath(); ctx.fill();
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('N', nx, ny + 24);
  ctx.textAlign = 'left';
  const sbScale = Math.min((w - margin * 2 - gap) / 2 / 66, (h - headroom - margin) / 62);
  const sbLen = 10 * sbScale;
  ctx.strokeStyle = INK_FAINT;
  ctx.fillStyle = INK_FAINT;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(margin + 2, h - 16); ctx.lineTo(margin + 2 + sbLen, h - 16);
  ctx.moveTo(margin + 2, h - 20); ctx.lineTo(margin + 2, h - 12);
  ctx.moveTo(margin + 2 + sbLen, h - 20); ctx.lineTo(margin + 2 + sbLen, h - 12);
  ctx.stroke();
  ctx.font = '9px monospace';
  ctx.fillText('10 m', margin + 8 + sbLen, h - 13);
}

function marker(ctx, x, y, color, shape, scale) {
  const r = Math.max(4, scale * 0.75);
  ctx.fillStyle = color;
  ctx.beginPath();
  if (shape === 'diamond') {
    ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
    ctx.closePath(); ctx.fill();
  } else if (shape === 'arrow') {
    ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.8, y + r); ctx.lineTo(x, y + r * 0.45); ctx.lineTo(x - r * 0.8, y + r);
    ctx.closePath(); ctx.fill();
  } else if (shape === 'query') {
    ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#081119';
    ctx.font = `bold ${Math.max(7, r * 1.5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('?', x, y + r * 0.55);
    ctx.textAlign = 'left';
  } else {
    ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); ctx.fill();
  }
}

function label(ctx, x, y, text, color, scale, align = 'center') {
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.max(8, scale * 1.3)}px monospace`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

export class HudMinimap {
  constructor(size = 190) {
    this.size = size;
    this.res = 2; // supersample for crisp lines at HUD scale
    this.canvas = document.createElement('canvas');
    this.canvas.width = size * this.res;
    this.canvas.height = size * this.res;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.ctx = this.canvas.getContext('2d');
    // prerender each floor at fixed scale (world px per metre, at internal res)
    this.scale = 4.4 * this.res;
    this.layers = [];
    for (const f of [0, 1]) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(66 * this.scale);
      c.height = Math.ceil(62 * this.scale);
      drawFloorPlan(c.getContext('2d'), f, { x0: -12, z0: -10, scale: this.scale, w: c.width, h: c.height });
      this.layers.push(c);
    }
  }

  render(mission) {
    const p = mission.player;
    const floorIdx = p.pos.y > 2.4 ? 1 : 0;
    const ctx = this.ctx;
    const s = this.size * this.res;
    ctx.clearRect(0, 0, s, s);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, s, s);
    ctx.clip();
    const px = (p.pos.x + 12) * this.scale;
    const pz = (p.pos.z + 10) * this.scale;
    ctx.translate(s / 2 - px, s / 2 - pz);
    ctx.drawImage(this.layers[floorIdx], 0, 0);

    const W = (wx) => (wx + 12) * this.scale;
    const Z = (wz) => (wz + 10) * this.scale;
    // extraction: green diamond (shape-coded, matches briefing)
    const ex = W(EXTRACTION.center[0]), ez = Z(EXTRACTION.center[2]);
    ctx.fillStyle = 'rgba(111, 208, 140, 0.95)';
    ctx.beginPath();
    ctx.moveTo(ex, ez - 9); ctx.lineTo(ex + 9, ez); ctx.lineTo(ex, ez + 9); ctx.lineTo(ex - 9, ez);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(111, 208, 140, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ex, ez, EXTRACTION.radius * this.scale, 0, Math.PI * 2);
    ctx.stroke();
    // hostages (once discovered): amber circle -> cyan triangle when secured
    for (const h of mission.hostages) {
      if (!h.discovered || !h.alive) continue;
      const hFloor = h.pos.y > 2.4 ? 1 : 0;
      if (hFloor !== floorIdx) continue;
      const hx = W(h.pos.x), hz = Z(h.pos.z);
      ctx.beginPath();
      if (h.secured) {
        ctx.fillStyle = '#6fc3e8';
        ctx.moveTo(hx, hz - 7.5); ctx.lineTo(hx + 7, hz + 6); ctx.lineTo(hx - 7, hz + 6);
        ctx.closePath();
      } else {
        ctx.fillStyle = '#e8b45f';
        ctx.arc(hx, hz, 6.5, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.restore();

    // player: view cone + arrow (screen center, rotated by yaw)
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.rotate(-p.yaw);
    const cone = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
    cone.addColorStop(0, 'rgba(234, 242, 248, 0.28)');
    cone.addColorStop(1, 'rgba(234, 242, 248, 0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 46, -Math.PI / 2 - 0.62, -Math.PI / 2 + 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2f8fc';
    ctx.strokeStyle = 'rgba(6, 11, 17, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 9);
    ctx.lineTo(0, 4.6);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // frame + north indicator
    ctx.fillStyle = 'rgba(111, 195, 232, 0.95)';
    ctx.font = `bold ${9 * this.res}px monospace`;
    ctx.fillText('N', 5 * this.res, 12 * this.res);
    ctx.strokeStyle = 'rgba(126, 168, 200, 0.5)';
    ctx.lineWidth = this.res;
    ctx.strokeRect(this.res / 2, this.res / 2, s - this.res, s - this.res);
  }
}
