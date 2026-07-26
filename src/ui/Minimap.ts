/**
 * Minimap and briefing floor plan. Owner: Fable 1.
 *
 * Drawn from the same room rectangles the world is built from, so the plan can never drift out
 * of sync with the level. Only the floor the player is on is drawn at full strength; the other
 * level is ghosted underneath for orientation.
 */
import { ROOMS, type RoomDef } from '../world/MapLayout';

export interface MinimapMarker {
  x: number;
  z: number;
  level: 0 | 1;
  kind: 'player' | 'hostage' | 'hostage-secured' | 'objective' | 'extraction' | 'enemy' | 'noise';
  yaw?: number;
  label?: string;
}

const COL = {
  bg: '#080d12',
  roomFar: 'rgba(60, 82, 98, 0.22)',
  roomNear: 'rgba(96, 130, 154, 0.34)',
  roomEdge: 'rgba(146, 186, 212, 0.6)',
  roomEdgeFar: 'rgba(80, 108, 128, 0.3)',
  service: 'rgba(70, 88, 100, 0.4)',
  text: 'rgba(206, 224, 236, 0.9)',
  textDim: 'rgba(140, 168, 188, 0.7)',
  player: '#49c7ff',
  hostage: '#ffc247',
  secured: '#5ce08a',
  extraction: '#5ce08a',
  enemy: '#ff4d4d',
  grid: 'rgba(73, 199, 255, 0.06)',
};

export interface PlanOptions {
  /** World units per pixel. */
  scale: number;
  centerX: number;
  centerZ: number;
  level: 0 | 1;
  rotate: number;
  labels: boolean;
  showAll: boolean;
  grid: boolean;
}

export function drawPlan(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  markers: MinimapMarker[],
  opts: PlanOptions,
): void {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, w, h);

  ctx.translate(w / 2, h / 2);
  ctx.rotate(opts.rotate);
  ctx.scale(opts.scale, opts.scale);
  ctx.translate(-opts.centerX, -opts.centerZ);

  if (opts.grid) {
    ctx.strokeStyle = COL.grid;
    ctx.lineWidth = 1 / opts.scale;
    for (let x = -24; x <= 24; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x, -32);
      ctx.lineTo(x, 32);
      ctx.stroke();
    }
    for (let z = -32; z <= 32; z += 4) {
      ctx.beginPath();
      ctx.moveTo(-24, z);
      ctx.lineTo(24, z);
      ctx.stroke();
    }
  }

  const drawRooms = (level: 0 | 1, near: boolean) => {
    for (const r of ROOMS) {
      if (r.level !== level || r.exterior) continue;
      ctx.fillStyle = near ? (r.light === 'service-dim' ? COL.service : COL.roomNear) : COL.roomFar;
      ctx.strokeStyle = near ? COL.roomEdge : COL.roomEdgeFar;
      ctx.lineWidth = (near ? 1.4 : 0.9) / opts.scale;
      for (const rect of r.rects) {
        ctx.beginPath();
        ctx.rect(rect.x0, rect.z0, rect.x1 - rect.x0, rect.z1 - rect.z0);
        ctx.fill();
        ctx.stroke();
      }
    }
  };

  if (opts.showAll) {
    drawRooms(opts.level === 0 ? 1 : 0, false);
    drawRooms(opts.level, true);
  } else {
    drawRooms(opts.level, true);
  }

  ctx.restore();

  // Labels and markers are drawn unrotated so text stays upright.
  const project = (wx: number, wz: number): [number, number] => {
    const dx = wx - opts.centerX;
    const dz = wz - opts.centerZ;
    const c = Math.cos(opts.rotate);
    const s = Math.sin(opts.rotate);
    return [w / 2 + (dx * c - dz * s) * opts.scale, h / 2 + (dx * s + dz * c) * opts.scale];
  };

  if (opts.labels) {
    ctx.font = `600 ${Math.max(8, 9)}px "Barlow Condensed", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const r of ROOMS) {
      if (r.level !== opts.level || r.exterior) continue;
      const rect = largestRect(r);
      const [lx, ly] = project((rect.x0 + rect.x1) / 2, (rect.z0 + rect.z1) / 2);
      if (lx < -40 || ly < -20 || lx > w + 40 || ly > h + 20) continue;
      ctx.fillStyle = COL.textDim;
      ctx.fillText(r.short.toUpperCase(), lx, ly);
    }
  }

  for (const m of markers) {
    const [mx, my] = project(m.x, m.z);
    const dim = m.level !== opts.level;
    ctx.globalAlpha = dim ? 0.4 : 1;
    switch (m.kind) {
      case 'player': {
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate((m.yaw ?? 0) + opts.rotate);
        ctx.fillStyle = COL.player;
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(5, 6);
        ctx.lineTo(0, 3.4);
        ctx.lineTo(-5, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'hostage':
      case 'hostage-secured': {
        ctx.fillStyle = m.kind === 'hostage' ? COL.hostage : COL.secured;
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#080d12';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        break;
      }
      case 'enemy': {
        ctx.fillStyle = COL.enemy;
        ctx.beginPath();
        ctx.moveTo(mx, my - 4);
        ctx.lineTo(mx + 4, my + 3);
        ctx.lineTo(mx - 4, my + 3);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'extraction': {
        ctx.strokeStyle = COL.extraction;
        ctx.lineWidth = 1.8;
        ctx.strokeRect(mx - 6, my - 6, 12, 12);
        ctx.beginPath();
        ctx.moveTo(mx - 3, my);
        ctx.lineTo(mx + 3, my);
        ctx.moveTo(mx, my - 3);
        ctx.lineTo(mx, my + 3);
        ctx.stroke();
        break;
      }
      case 'objective': {
        ctx.fillStyle = COL.hostage;
        ctx.beginPath();
        ctx.moveTo(mx, my - 5);
        ctx.lineTo(mx + 5, my);
        ctx.lineTo(mx, my + 5);
        ctx.lineTo(mx - 5, my);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'noise': {
        ctx.strokeStyle = 'rgba(255, 194, 71, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(mx, my, 7, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
    }
    ctx.globalAlpha = 1;
    if (m.label) {
      ctx.font = '600 9px "Barlow Condensed", sans-serif';
      ctx.fillStyle = COL.text;
      ctx.textAlign = 'center';
      ctx.fillText(m.label, mx, my - 9);
    }
  }
}

function largestRect(r: RoomDef): { x0: number; z0: number; x1: number; z1: number } {
  let best = r.rects[0];
  let area = 0;
  for (const rect of r.rects) {
    const a = (rect.x1 - rect.x0) * (rect.z1 - rect.z0);
    if (a > area) {
      area = a;
      best = rect;
    }
  }
  return best;
}
