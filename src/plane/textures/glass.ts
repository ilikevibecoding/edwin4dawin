import * as THREE from 'three';
import { Rng } from '../../core/seed';
import { canvas, toTexture } from './common';

/** Small tileable smudge/dirt mask for the cockpit glass (red channel = dirt amount). */
export function glassDirtTexture(): THREE.CanvasTexture {
  const s = 256;
  const rng = new Rng('glass-dirt');
  const [c, ctx] = canvas(s, s);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    const x = rng.range(0, s), y = rng.range(0, s), r = rng.range(6, 40);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = rng.range(0.03, 0.14);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    // draw wrapped so the tile has no seam
    for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) ctx.fillRect(x - r + ox, y - r + oy, r * 2, r * 2);
  }
  // wiper-like streaks
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${rng.range(0.03, 0.1)})`; ctx.lineWidth = rng.range(0.5, 2);
    const x = rng.range(0, s), y = rng.range(0, s), l = rng.range(20, 90), a = rng.range(-0.4, 0.4);
    for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) { ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); ctx.stroke(); }
  }
  const t = toTexture(c, false, 4);
  return t;
}
