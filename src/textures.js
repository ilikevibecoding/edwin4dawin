import * as THREE from 'three';
import { RNG } from './utils.js';

function canvasTexture(size, draw, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

function shade(hex, amt) {
  const r = Math.min(255, Math.max(0, ((hex >> 16) & 255) + amt));
  const g = Math.min(255, Math.max(0, ((hex >> 8) & 255) + amt));
  const b = Math.min(255, Math.max(0, (hex & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

let cache = null;

export function getTextures() {
  if (cache) return cache;
  const rng = new RNG(7);

  const wood = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = shade(0xb5813f, -30);
    ctx.fillRect(0, 0, s, s);
    const planks = 6;
    const ph = s / planks;
    for (let p = 0; p < planks; p++) {
      ctx.fillStyle = shade(0xb5813f, rng.int(-18, 14));
      ctx.fillRect(0, p * ph + 1, s, ph - 2);
      ctx.strokeStyle = 'rgba(70,40,10,0.35)';
      ctx.lineWidth = 1;
      for (let g = 0; g < 3; g++) {
        const y = p * ph + rng.range(3, ph - 3);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(s * 0.3, y + rng.range(-3, 3), s * 0.7, y + rng.range(-3, 3), s, y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(40,20,5,0.5)';
      ctx.fillRect(rng.int(4, s - 8), p * ph + 3, 2, 2);
      ctx.fillRect(rng.int(4, s - 8), p * ph + ph - 5, 2, 2);
    }
  });

  const brick = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#7d7d7d';
    ctx.fillRect(0, 0, s, s);
    const rows = 8;
    const bh = s / rows;
    const bw = s / 4;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? bw / 2 : 0;
      for (let c = -1; c < 5; c++) {
        ctx.fillStyle = shade(0x9d9d9d, rng.int(-20, 18));
        ctx.fillRect(c * bw + off + 1.5, r * bh + 1.5, bw - 3, bh - 3);
      }
    }
  });

  const metal = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = shade(0x7d9db3, -10);
    ctx.fillRect(0, 0, s, s);
    const panels = 2;
    const pw = s / panels;
    for (let i = 0; i < panels; i++) {
      for (let j = 0; j < panels; j++) {
        ctx.fillStyle = shade(0x7d9db3, rng.int(-12, 12));
        ctx.fillRect(i * pw + 2, j * pw + 2, pw - 4, pw - 4);
        ctx.fillStyle = 'rgba(30,40,55,0.6)';
        const inset = 6;
        for (const [rx, ry] of [[inset, inset], [pw - inset, inset], [inset, pw - inset], [pw - inset, pw - inset]]) {
          ctx.beginPath();
          ctx.arc(i * pw + rx, j * pw + ry, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, s - 2, s - 2);
  });

  const grass = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      const v = rng.int(-28, 22);
      ctx.fillStyle = `rgb(${255 + v},${255 + v},${255 + v})`;
      ctx.fillRect(rng.int(0, s - 1), rng.int(0, s - 1), rng.int(1, 3), rng.int(1, 3));
    }
  });

  const glow = new THREE.CanvasTexture((() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return c;
  })());

  cache = { wood, brick, metal, grass, glow };
  return cache;
}
