import { ROOMS, WALLS, ZONES } from '../world/layout';

export interface MinimapMarker {
  x: number;
  z: number;
  floor: 0 | 1;
  kind: 'player' | 'hostage' | 'objective' | 'extract' | 'enemy';
  yaw?: number;
}

/**
 * Vector minimap (Fable 1): draws the annex floor plan for the current floor
 * with player arrow and objective markers. Also used at full size in briefing.
 */
export class Minimap {
  private wallSegs: { a: [number, number]; b: [number, number]; upper: boolean }[] = [];

  constructor() {
    for (const w of WALLS) {
      const upper = w.y0 >= 3.4;
      const both = w.y1 > 3.8 && w.y0 < 3.4;
      this.wallSegs.push({ a: w.a, b: w.b, upper });
      if (both) this.wallSegs.push({ a: w.a, b: w.b, upper: true });
    }
  }

  draw(
    ctx: CanvasRenderingContext2D, w: number, h: number, floor: 0 | 1,
    markers: MinimapMarker[], centerOn?: { x: number; z: number; zoom: number },
  ): void {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(8,13,18,0.92)';
    ctx.fillRect(0, 0, w, h);

    // world→canvas transform
    const worldW = 60, worldH = 44;
    let scale: number, ox: number, oz: number;
    if (centerOn) {
      scale = centerOn.zoom;
      ox = w / 2 - centerOn.x * scale;
      oz = h / 2 - centerOn.z * scale;
    } else {
      scale = Math.min(w / worldW, h / worldH) * 0.94;
      ox = (w - worldW * scale) / 2 + 2 * scale;
      oz = (h - worldH * scale) / 2 + 2 * scale;
    }
    const X = (x: number): number => ox + x * scale;
    const Z = (z: number): number => oz + z * scale;

    // room fills
    for (const r of ROOMS) {
      const isUpper = r.floorY > 1;
      if ((floor === 1) !== isUpper) continue;
      const [x0, z0, x1, z1] = r.rect;
      ctx.fillStyle = r.outdoor ? 'rgba(120,150,180,0.14)' : 'rgba(70,100,125,0.16)';
      ctx.fillRect(X(x0), Z(z0), (x1 - x0) * scale, (z1 - z0) * scale);
    }
    // extraction zone
    if (floor === 0) {
      const z = ZONES.find((zz) => zz.id === 'extraction')!;
      ctx.fillStyle = 'rgba(230,182,76,0.2)';
      ctx.strokeStyle = 'rgba(230,182,76,0.7)';
      ctx.lineWidth = 1;
      ctx.fillRect(X(z.rect[0]), Z(z.rect[1]), (z.rect[2] - z.rect[0]) * scale, (z.rect[3] - z.rect[1]) * scale);
      ctx.strokeRect(X(z.rect[0]), Z(z.rect[1]), (z.rect[2] - z.rect[0]) * scale, (z.rect[3] - z.rect[1]) * scale);
    }
    // walls
    ctx.strokeStyle = 'rgba(190,215,235,0.75)';
    ctx.lineWidth = Math.max(1, scale * 0.09);
    ctx.beginPath();
    for (const s of this.wallSegs) {
      if (s.upper !== (floor === 1)) continue;
      ctx.moveTo(X(s.a[0]), Z(s.a[1]));
      ctx.lineTo(X(s.b[0]), Z(s.b[1]));
    }
    ctx.stroke();

    // markers
    for (const m of markers) {
      if ((m.floor === 1) !== (floor === 1)) continue;
      const px = X(m.x), pz = Z(m.z);
      switch (m.kind) {
        case 'player': {
          ctx.save();
          ctx.translate(px, pz);
          ctx.rotate(-(m.yaw ?? 0));
          ctx.fillStyle = '#4fe0f2';
          ctx.beginPath();
          ctx.moveTo(0, -5.5);
          ctx.lineTo(4, 4.5);
          ctx.lineTo(0, 2.4);
          ctx.lineTo(-4, 4.5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'hostage': {
          ctx.fillStyle = '#e6b64c';
          ctx.beginPath();
          ctx.arc(px, pz, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0a0f14';
          ctx.font = 'bold 5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('H', px, pz + 0.5);
          break;
        }
        case 'objective': {
          ctx.save();
          ctx.translate(px, pz);
          ctx.rotate(Math.PI / 4);
          ctx.strokeStyle = '#e6b64c';
          ctx.lineWidth = 1.4;
          ctx.strokeRect(-3, -3, 6, 6);
          ctx.restore();
          break;
        }
        case 'extract': {
          ctx.strokeStyle = '#5ad08e';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(px, pz, 4.4, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'enemy': {
          ctx.fillStyle = 'rgba(224,74,53,0.9)';
          ctx.beginPath();
          ctx.arc(px, pz, 2.6, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    }
    // frame + floor label
    ctx.strokeStyle = 'rgba(120,160,190,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.fillStyle = 'rgba(190,215,235,0.65)';
    ctx.font = '600 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(floor === 1 ? 'LEVEL 2' : 'LEVEL 1', 6, 5);
  }
}
