import * as THREE from 'three';

/**
 * Procedural lens-dirt mask.
 *
 * Modulating bloom by a dirt mask is what makes a bright light feel like it is
 * being photographed rather than composited: the smudges only show up when
 * something bright is behind them. Generated on a canvas because the project
 * ships no image assets.
 */
export function createLensDirt(size = 256): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);

  // Deterministic so the dirt does not change between runs or screenshots.
  let seed = 0x9e3779b9;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const blob = (x: number, y: number, r: number, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.45, `rgba(255,255,255,${a * 0.35})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  // Dust motes.
  for (let i = 0; i < 220; i++) {
    blob(rand() * size, rand() * size, 1 + rand() * 7, 0.1 + rand() * 0.45);
  }
  // A handful of larger greasy smudges.
  for (let i = 0; i < 14; i++) {
    blob(rand() * size, rand() * size, 14 + rand() * 40, 0.05 + rand() * 0.12);
  }
  // Wiper-style streaks: long, thin, low contrast.
  ctx.save();
  for (let i = 0; i < 9; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.translate(x, y);
    ctx.rotate((rand() - 0.5) * 0.8);
    const g = ctx.createLinearGradient(-60, 0, 60, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(255,255,255,${0.06 + rand() * 0.1})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-60, -1.5 - rand(), 120, 3 + rand() * 3);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.name = 'lensDirt';
  tex.needsUpdate = true;
  return tex;
}
