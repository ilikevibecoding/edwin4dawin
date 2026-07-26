// Minimap renderer (Fable 1 domain): draws layout rooms/walls per floor onto canvas.
// Used by the HUD (player-centered viewport) and the briefing screen (full map).
import { ROOMS, VOIDS, OPENINGS, EXTRACTION, HOSTAGES } from '../map/layout.js';

const FLOOR_FILL = {
  0: 'rgba(38, 58, 76, 0.55)',
  1: 'rgba(44, 66, 86, 0.55)',
};

export function drawFloorPlan(ctx, floorIdx, opts) {
  const { x0, z0, scale, w, h } = opts;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  const X = (wx) => (wx - x0) * scale;
  const Z = (wz) => (wz - z0) * scale;

  for (const room of ROOMS) {
    if (room.floor !== floorIdx) continue;
    ctx.fillStyle = room.exterior ? 'rgba(200, 220, 235, 0.14)' : FLOOR_FILL[floorIdx];
    for (const rc of room.rects) {
      ctx.fillRect(X(rc[0]), Z(rc[1]), (rc[2] - rc[0]) * scale, (rc[3] - rc[1]) * scale);
    }
  }
  for (const v of VOIDS) {
    if (v.floor !== floorIdx) continue;
    ctx.fillStyle = 'rgba(10, 16, 24, 0.7)';
    ctx.fillRect(X(v.rect[0]), Z(v.rect[1]), (v.rect[2] - v.rect[0]) * scale, (v.rect[3] - v.rect[1]) * scale);
  }
  // walls: room outlines
  ctx.strokeStyle = 'rgba(158, 196, 222, 0.65)';
  ctx.lineWidth = Math.max(1, scale * 0.14);
  for (const room of ROOMS) {
    if (room.floor !== floorIdx) continue;
    for (const rc of room.rects) {
      ctx.strokeRect(X(rc[0]), Z(rc[1]), (rc[2] - rc[0]) * scale, (rc[3] - rc[1]) * scale);
    }
  }
  // door gaps drawn as accent ticks
  ctx.strokeStyle = 'rgba(111, 195, 232, 0.9)';
  ctx.lineWidth = Math.max(1.5, scale * 0.2);
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

export function drawBriefingMap(canvas) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a141f';
  ctx.fillRect(0, 0, w, h);
  const halfW = w / 2 - 12;
  const scale = Math.min(halfW / 66, (h - 40) / 62);
  // ground floor left, upper right
  for (const floorIdx of [0, 1]) {
    ctx.save();
    ctx.translate(10 + floorIdx * (halfW + 8), 26);
    drawFloorPlan(ctx, floorIdx, { x0: -10, z0: -8, scale, w: halfW, h: h - 40 });
    // markers
    const X = (wx) => (wx + 10) * scale;
    const Z = (wz) => (wz + 8) * scale;
    if (floorIdx === 0) {
      dot(ctx, X(EXTRACTION.center[0]), Z(EXTRACTION.center[2]), '#6fd08c');
      label(ctx, X(EXTRACTION.center[0]), Z(EXTRACTION.center[2]) - 8, 'EXFIL', '#6fd08c');
      dot(ctx, X(26), Z(42), '#6fc3e8');
      label(ctx, X(26), Z(42) - 8, 'ENTRY', '#6fc3e8');
    }
    for (const hs of HOSTAGES) {
      const hFloor = hs.pos[1] > 2 ? 1 : 0;
      if (hFloor !== floorIdx) continue;
      dot(ctx, X(hs.pos[0]), Z(hs.pos[2]), '#e8b45f');
      label(ctx, X(hs.pos[0]), Z(hs.pos[2]) - 8, 'HOSTAGE?', '#e8b45f');
    }
    ctx.fillStyle = 'rgba(159, 180, 196, 0.8)';
    ctx.font = '10px monospace';
    ctx.fillText(floorIdx === 0 ? 'GROUND FLOOR' : 'UPPER FLOOR', 4, -10);
    ctx.restore();
  }
}

function dot(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 3.6, 0, Math.PI * 2);
  ctx.fill();
}
function label(ctx, x, y, text, color) {
  ctx.fillStyle = color;
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

export class HudMinimap {
  constructor(size = 190) {
    this.size = size;
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d');
    // prerender each floor at fixed scale
    this.scale = 4.4;
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
    const s = this.size;
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
    // extraction
    ctx.fillStyle = 'rgba(111, 208, 140, 0.85)';
    ctx.beginPath();
    ctx.arc(W(EXTRACTION.center[0]), Z(EXTRACTION.center[2]), 4, 0, Math.PI * 2);
    ctx.fill();
    // hostages (once discovered)
    for (const h of mission.hostages) {
      if (!h.discovered || !h.alive) continue;
      const hFloor = h.pos.y > 2.4 ? 1 : 0;
      if (hFloor !== floorIdx) continue;
      ctx.fillStyle = h.secured ? '#6fc3e8' : '#e8b45f';
      ctx.beginPath();
      ctx.arc(W(h.pos.x), Z(h.pos.z), 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // player arrow (screen center, rotated by yaw)
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.rotate(-p.yaw);
    ctx.fillStyle = '#f2f8fc';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.4, 5);
    ctx.lineTo(0, 2.6);
    ctx.lineTo(-4.4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // north indicator
    ctx.fillStyle = 'rgba(159,180,196,0.9)';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('N', 5, 12);
    ctx.strokeStyle = 'rgba(126, 168, 200, 0.5)';
    ctx.strokeRect(0.5, 0.5, s - 1, s - 1);
  }
}
