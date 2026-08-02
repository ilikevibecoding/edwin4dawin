import * as THREE from 'three';
import { Rng } from '../core/Rng';
import type { DisposalRegistry } from '../core/disposal';

/**
 * Every texture in the production is drawn at runtime on a 2D canvas from a
 * seeded RNG. Nothing is downloaded, nothing is traced from reference art.
 */

function canvas(size: number, height = size): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable - cannot build procedural textures');
  return { c, ctx };
}

function finish(c: HTMLCanvasElement, repeat: number, aniso: number): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

export interface PanelOptions {
  size?: number;
  /** Base grey level 0..1 before panel variation. */
  base?: number;
  /** How strongly individual panels differ from the base. */
  variation?: number;
  /** Panel grid subdivisions along each axis. */
  cells?: number;
  /** Darkness of the recessed seam lines. */
  seam?: number;
  /** Adds long weathering streaks below panel seams. */
  streaks?: number;
  /** Adds scorch blooms. */
  scorch?: number;
  /** Adds rivet dots. */
  rivets?: boolean;
  tint?: string;
  repeat?: number;
  anisotropy?: number;
}

/**
 * Hull plating: a recursive split grid so panel sizes vary the way real
 * greebled model surfaces do, plus seams, streaks, rivets and scorch.
 */
export function makePanelTexture(rng: Rng, opts: PanelOptions = {}): THREE.CanvasTexture {
  const size = opts.size ?? 512;
  const base = opts.base ?? 0.72;
  const variation = opts.variation ?? 0.1;
  const cells = opts.cells ?? 6;
  const seam = opts.seam ?? 0.38;
  const { c, ctx } = canvas(size);

  const g = Math.round(base * 255);
  ctx.fillStyle = `rgb(${g},${g},${g})`;
  ctx.fillRect(0, 0, size, size);

  // Recursive panel subdivision.
  type Rect = { x: number; y: number; w: number; h: number; depth: number };
  const stack: Rect[] = [];
  const cw = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      stack.push({ x: x * cw, y: y * cw, w: cw, h: cw, depth: 0 });
    }
  }
  const panels: Rect[] = [];
  while (stack.length) {
    const r = stack.pop()!;
    if (r.depth < 2 && Math.min(r.w, r.h) > size / (cells * 3) && rng.bool(0.55)) {
      const horizontal = r.w > r.h ? true : r.h > r.w ? false : rng.bool();
      const f = rng.range(0.35, 0.65);
      if (horizontal) {
        stack.push({ x: r.x, y: r.y, w: r.w * f, h: r.h, depth: r.depth + 1 });
        stack.push({ x: r.x + r.w * f, y: r.y, w: r.w * (1 - f), h: r.h, depth: r.depth + 1 });
      } else {
        stack.push({ x: r.x, y: r.y, w: r.w, h: r.h * f, depth: r.depth + 1 });
        stack.push({ x: r.x, y: r.y + r.h * f, w: r.w, h: r.h * (1 - f), depth: r.depth + 1 });
      }
    } else {
      panels.push(r);
    }
  }

  for (const p of panels) {
    const shade = Math.round(Math.max(0, Math.min(1, base + rng.signed(variation))) * 255);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  // Seams: dark inset line plus a light highlight on the opposite edge.
  ctx.lineWidth = Math.max(1, size / 512);
  for (const p of panels) {
    ctx.strokeStyle = `rgba(0,0,0,${seam})`;
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
    ctx.strokeStyle = `rgba(255,255,255,${seam * 0.35})`;
    ctx.beginPath();
    ctx.moveTo(p.x + 1.5, p.y + p.h - 1.5);
    ctx.lineTo(p.x + 1.5, p.y + 1.5);
    ctx.lineTo(p.x + p.w - 1.5, p.y + 1.5);
    ctx.stroke();
  }

  if (opts.rivets) {
    ctx.fillStyle = `rgba(0,0,0,0.22)`;
    for (const p of panels) {
      if (p.w < 24 || p.h < 24) continue;
      const step = Math.max(10, p.w / 6);
      for (let x = p.x + step * 0.6; x < p.x + p.w - step * 0.3; x += step) {
        ctx.fillRect(x, p.y + 4, 1.6, 1.6);
        ctx.fillRect(x, p.y + p.h - 6, 1.6, 1.6);
      }
    }
  }

  const streaks = opts.streaks ?? 0;
  if (streaks > 0) {
    for (let i = 0; i < Math.round(streaks * 90); i++) {
      const x = rng.range(0, size);
      const y = rng.range(0, size);
      const len = rng.range(size * 0.05, size * 0.4);
      const w = rng.range(0.7, 3.2);
      const a = rng.range(0.03, 0.13) * streaks;
      const grad = ctx.createLinearGradient(x, y, x, y + len);
      grad.addColorStop(0, `rgba(20,16,12,${a})`);
      grad.addColorStop(1, 'rgba(20,16,12,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, len);
    }
  }

  const scorch = opts.scorch ?? 0;
  if (scorch > 0) {
    for (let i = 0; i < Math.round(scorch * 16); i++) {
      const x = rng.range(0, size);
      const y = rng.range(0, size);
      const r = rng.range(size * 0.02, size * 0.09);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(18,14,12,${rng.range(0.35, 0.7)})`);
      grad.addColorStop(0.6, `rgba(28,22,18,${rng.range(0.1, 0.25)})`);
      grad.addColorStop(1, 'rgba(30,24,20,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (opts.tint) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = opts.tint;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
  }

  return finish(c, opts.repeat ?? 1, opts.anisotropy ?? 4);
}

/** Derive a tangent-space normal map from a greyscale height canvas texture. */
export function makeNormalFromHeight(source: THREE.CanvasTexture, strength = 2.2): THREE.CanvasTexture {
  const src = source.image as HTMLCanvasElement;
  const size = src.width;
  const sctx = src.getContext('2d')!;
  const data = sctx.getImageData(0, 0, size, size).data;
  const { c, ctx } = canvas(size);
  const out = ctx.createImageData(size, size);

  const h = (x: number, y: number): number => {
    const xi = ((x % size) + size) % size;
    const yi = ((y % size) + size) % size;
    return data[(yi * size + xi) * 4] / 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      let nx = -dx;
      let ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      const i = (y * size + x) * 4;
      out.data[i] = (nx * 0.5 + 0.5) * 255;
      out.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      out.data[i + 2] = (nz / len) * 255;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  const tex = finish(c, source.repeat.x, source.anisotropy);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/** Rows of lit portholes for ship hulls and superstructures. */
export function makeWindowTexture(
  rng: Rng,
  cols: number,
  rows: number,
  color = '#cfe4ff',
  litChance = 0.72,
): THREE.CanvasTexture {
  const size = 256;
  const { c, ctx } = canvas(size);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  const cw = size / cols;
  const ch = size / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!rng.bool(litChance)) continue;
      const a = rng.range(0.45, 1);
      ctx.fillStyle = color;
      ctx.globalAlpha = a;
      ctx.fillRect(x * cw + cw * 0.22, y * ch + ch * 0.3, cw * 0.56, ch * 0.4);
    }
  }
  ctx.globalAlpha = 1;
  const tex = finish(c, 1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft radial sprite: glows, engine flares, light spill, smoke cores. */
export function makeGlowSprite(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', power = 1): THREE.CanvasTexture {
  const size = 128;
  const { c, ctx } = canvas(size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    grad.addColorStop(t, i === 0 ? inner : mixCss(inner, outer, Math.pow(t, power)));
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function mixCss(a: string, b: string, t: number): string {
  const pa = parseRgba(a);
  const pb = parseRgba(b);
  const m = pa.map((v, i) => v + (pb[i] - v) * t);
  return `rgba(${Math.round(m[0])},${Math.round(m[1])},${Math.round(m[2])},${m[3].toFixed(3)})`;
}

function parseRgba(css: string): [number, number, number, number] {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (!m) return [255, 255, 255, 1];
  const parts = m[1].split(',').map((v) => parseFloat(v.trim()));
  return [parts[0] ?? 255, parts[1] ?? 255, parts[2] ?? 255, parts[3] ?? 1];
}

/** Turbulent puff used for smoke, dust and atmospheric haze. */
export function makeSmokeSprite(rng: Rng): THREE.CanvasTexture {
  const size = 128;
  const { c, ctx } = canvas(size);
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 26; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(0, size * 0.24);
    const x = size / 2 + Math.cos(a) * d;
    const y = size / 2 + Math.sin(a) * d;
    const r = rng.range(size * 0.12, size * 0.3);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const v = Math.round(rng.range(150, 235));
    grad.addColorStop(0, `rgba(${v},${v},${v},${rng.range(0.1, 0.2)})`);
    grad.addColorStop(1, `rgba(${v},${v},${v},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fade the border so tiled puffs never show a hard square.
  const mask = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.5);
  mask.addColorStop(0, 'rgba(0,0,0,0)');
  mask.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Tatooine's surface: layered value-noise bands in desert ochres, with dune
 * ridges, salt flats, canyon shadow and a cooler polar wash.
 */
export function makeDesertPlanetTexture(rng: Rng, width = 2048): THREE.CanvasTexture {
  const height = width / 2;
  const { c, ctx } = canvas(width, height);

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0.0, '#b9a284');
  grad.addColorStop(0.14, '#cfae7c');
  grad.addColorStop(0.36, '#e0b578');
  grad.addColorStop(0.5, '#d9a765');
  grad.addColorStop(0.64, '#e3bc84');
  grad.addColorStop(0.86, '#cbab7e');
  grad.addColorStop(1.0, '#b7a289');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Continent-scale value noise via stacked soft blobs.
  const blobLayers: Array<{ count: number; min: number; max: number; alpha: number; colors: string[] }> = [
    { count: 90, min: width * 0.05, max: width * 0.16, alpha: 0.2, colors: ['#c69a5c', '#b98d4f', '#d8b986'] },
    { count: 200, min: width * 0.02, max: width * 0.07, alpha: 0.16, colors: ['#a87f45', '#e6cb9c', '#c9a266'] },
    { count: 420, min: width * 0.006, max: width * 0.028, alpha: 0.14, colors: ['#8f6b3a', '#efd9ae', '#b98f57'] },
  ];
  for (const layer of blobLayers) {
    for (let i = 0; i < layer.count; i++) {
      const x = rng.range(0, width);
      const y = rng.range(-height * 0.05, height * 1.05);
      const r = rng.range(layer.min, layer.max);
      const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
      const col = rng.pick(layer.colors);
      g2.addColorStop(0, hexToRgba(col, layer.alpha));
      g2.addColorStop(1, hexToRgba(col, 0));
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Dune ridges: long, low-contrast sine bands.
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 260; i++) {
    const y = rng.range(0, height);
    const amp = rng.range(2, 14);
    const freq = rng.range(0.004, 0.02);
    const phase = rng.range(0, Math.PI * 2);
    ctx.strokeStyle = rng.bool() ? '#8d6a3c' : '#f0dcb4';
    ctx.lineWidth = rng.range(0.8, 2.6);
    ctx.beginPath();
    for (let x = 0; x <= width; x += 6) {
      const yy = y + Math.sin(x * freq + phase) * amp;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Canyon systems: dark branching scratches.
  ctx.strokeStyle = 'rgba(88,62,34,0.26)';
  for (let i = 0; i < 70; i++) {
    let x = rng.range(0, width);
    let y = rng.range(height * 0.15, height * 0.85);
    let a = rng.range(0, Math.PI * 2);
    ctx.lineWidth = rng.range(0.7, 2.4);
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = rng.int(12, 40);
    for (let s = 0; s < segs; s++) {
      a += rng.signed(0.5);
      x += Math.cos(a) * rng.range(4, 16);
      y += Math.sin(a) * rng.range(4, 16);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Salt flats / dry seabeds.
  for (let i = 0; i < 24; i++) {
    const x = rng.range(0, width);
    const y = rng.range(height * 0.2, height * 0.8);
    const rx = rng.range(width * 0.01, width * 0.05);
    const ry = rx * rng.range(0.4, 0.9);
    const g3 = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g3.addColorStop(0, 'rgba(240,231,209,0.5)');
    g3.addColorStop(1, 'rgba(240,231,209,0)');
    ctx.fillStyle = g3;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Cooler, brighter poles.
  for (const [y0, y1] of [[0, height * 0.1], [height * 0.9, height]] as const) {
    const pg = ctx.createLinearGradient(0, y0, 0, y1);
    const flip = y0 === 0;
    pg.addColorStop(flip ? 0 : 1, 'rgba(226,220,206,0.55)');
    pg.addColorStop(flip ? 1 : 0, 'rgba(226,220,206,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(0, y0, width, y1 - y0);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Seamless high-frequency desert detail.
 *
 * Built only from integer-frequency sine terms plus wrap-around speckle, so it
 * tiles perfectly. Used as a detail normal map over the planet's low-frequency
 * colour map: without it the surface smears badly at low orbital altitude.
 */
export function makeDesertDetailTexture(rng: Rng, size = 512): THREE.CanvasTexture {
  const { c, ctx } = canvas(size);
  const image = ctx.createImageData(size, size);

  // A handful of dune wave trains at different angles and integer frequencies.
  const waves: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 7; i++) {
    const fx = rng.int(1, 9);
    const fy = rng.int(1, 9);
    waves.push([fx, fy, rng.range(0, Math.PI * 2), rng.range(0.25, 1)]);
  }
  const norm = waves.reduce((a, w) => a + w[3], 0);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      let value = 0;
      for (const [fx, fy, phase, amp] of waves) {
        value += Math.sin(u * fx + v * fy + phase) * amp;
      }
      value = value / norm;
      // Sharpen the crests so the dunes read as ridges rather than a blur.
      value = Math.sign(value) * Math.pow(Math.abs(value), 0.72);
      const speckle = (hashCell(x, y) - 0.5) * 0.16;
      const g = Math.round(clamp01(0.5 + value * 0.34 + speckle) * 255);
      const i = (y * size + x) * 4;
      image.data[i] = g;
      image.data[i + 1] = g;
      image.data[i + 2] = g;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const tex = finish(c, 1, 8);
  return tex;
}

function hashCell(x: number, y: number): number {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  h -= Math.floor(h);
  return h;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Thin, wispy high-altitude dust bands for the planet's cloud shell. */
export function makeDustCloudTexture(rng: Rng, width = 1024): THREE.CanvasTexture {
  const height = width / 2;
  const { c, ctx } = canvas(width, height);
  ctx.clearRect(0, 0, width, height);
  for (let i = 0; i < 150; i++) {
    const y = rng.range(height * 0.08, height * 0.92);
    const x = rng.range(0, width);
    const w = rng.range(width * 0.05, width * 0.3);
    const h = rng.range(height * 0.006, height * 0.035);
    const a = rng.range(0.05, 0.3) * (1 - Math.abs(y / height - 0.5) * 1.1);
    const g = ctx.createRadialGradient(x, y, 0, x, y, w);
    g.addColorStop(0, `rgba(255,248,235,${a})`);
    g.addColorStop(1, 'rgba(255,248,235,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, h / w);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Wireframe-style schematic used by the stolen-plans projection. */
export function makeSchematicTexture(rng: Rng, size = 512): THREE.CanvasTexture {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = '#000308';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(120,220,255,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 16; i++) {
    const p = (i / 16) * size;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(170,240,255,0.85)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    const x = rng.range(0, size);
    const y = rng.range(0, size);
    const w = rng.range(size * 0.03, size * 0.2);
    const h = rng.range(size * 0.02, size * 0.14);
    ctx.strokeRect(x, y, w, h);
  }
  ctx.fillStyle = 'rgba(200,245,255,0.9)';
  for (let i = 0; i < 240; i++) {
    ctx.fillRect(rng.range(0, size), rng.range(0, size), rng.range(1, 5), 1.6);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Blinking control-panel face used across cockpit, corridor and pod interiors. */
export function makeControlPanelTexture(rng: Rng, size = 256): THREE.CanvasTexture {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = '#12151b';
  ctx.fillRect(0, 0, size, size);
  const palette = ['#ff5a44', '#ffc061', '#5ad6ff', '#8dff9a', '#ffffff'];
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = rng.pick(palette);
    ctx.globalAlpha = rng.range(0.35, 1);
    const w = rng.range(3, 16);
    const h = rng.range(3, 8);
    ctx.fillRect(rng.range(4, size - w - 4), rng.range(4, size - h - 4), w, h);
  }
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#39424f';
  for (let i = 0; i < 12; i++) {
    ctx.strokeRect(rng.range(0, size * 0.8), rng.range(0, size * 0.8), rng.range(20, 80), rng.range(20, 70));
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function hexToRgba(hex: string, alpha: number): string {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Registers a texture with the disposal registry in one call. */
export function tracked<T extends THREE.Texture>(registry: DisposalRegistry, tex: T): T {
  registry.track(tex);
  return tex;
}
