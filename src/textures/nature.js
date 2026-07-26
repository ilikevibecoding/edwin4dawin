import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import {
  cached,
  canvasTexture,
  clamp,
  fbm,
  heightField,
  hexToRgb,
  lerp,
  mixRgb,
  mulberry32,
  normalFromHeight,
  pixelTexture,
  ridged,
  roughnessTexture,
  smoothstep,
  worley,
} from './core.js';

// ---------------------------------------------------------------------------
// Trees, foliage cards and rock. Foliage is drawn as canvas alpha atlases so
// the cards have real silhouettes instead of rectangles.
// ---------------------------------------------------------------------------

function rgbStr(c, mul = 1) {
  return `rgb(${Math.round(clamp(c[0] * mul, 0, 255))},${Math.round(clamp(c[1] * mul, 0, 255))},${Math.round(
    clamp(c[2] * mul, 0, 255),
  )})`;
}

/** Deeply fissured conifer bark. */
export function barkMaps(seed = 5) {
  return cached('nat.bark.' + seed, () => {
    const w = 256;
    const h = 512;
    const hf = heightField(w, h, (x, y) => {
      const u = x / w;
      const v = y / h;
      // vertical stretched ridges + plate breakup
      const warp = fbm(u * 6, v * 2, { octaves: 3, period: 6, seed: seed + 2 }) * 0.35;
      const fis = ridged(u * 9 + warp, v * 2.2, { octaves: 4, period: 9, seed });
      const plates = worley(u * 7, v * 3.4, 7, seed + 40);
      const plateEdge = smoothstep(0.0, 0.12, plates.f2 - plates.f1);
      const fine = fbm(u * 40, v * 22, { octaves: 4, period: 40, seed: seed + 11 });
      return clamp(Math.pow(fis, 1.5) * 0.62 + plateEdge * 0.26 + fine * 0.12);
    });
    const normal = normalFromHeight(hf, w, h, 3.4, { repeat: [3, 1] });
    const light = hexToRgb(PALETTE.barkLight);
    const mid = hexToRgb(PALETTE.bark);
    const dark = hexToRgb(PALETTE.barkDark);
    const moss = hexToRgb(PALETTE.moss);
    const map = pixelTexture(
      w,
      h,
      (x, y, out) => {
        const u = x / w;
        const v = y / h;
        const d = hf[y * w + x];
        let c = mixRgb(dark, mid, smoothstep(0.15, 0.6, d));
        c = mixRgb(c, light, smoothstep(0.62, 0.95, d));
        const mossMask =
          smoothstep(0.5, 0.85, fbm(u * 5, v * 2.5, { octaves: 4, period: 5, seed: seed + 60 })) *
          smoothstep(0.15, 0.75, 1 - v) * // moss gathers low on the trunk
          smoothstep(0.25, 0.7, d);
        c = mixRgb(c, moss, mossMask * 0.55);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: [3, 1] },
    );
    const rough = roughnessTexture(w, h, (x, y) => clamp(0.78 + (1 - hf[y * w + x]) * 0.18), {
      repeat: [3, 1],
    });
    const ao = roughnessTexture(w, h, (x, y) => clamp(0.28 + hf[y * w + x] * 0.85), { repeat: [3, 1] });
    return { map, normal, rough, ao };
  });
}

/** Papery birch-like bark for variety. */
export function birchBarkMaps() {
  return cached('nat.birch', () => {
    const w = 256;
    const h = 512;
    const hf = heightField(w, h, (x, y) => {
      const u = x / w;
      const v = y / h;
      const peel = fbm(u * 8, v * 30, { octaves: 3, period: 8, seed: 21 });
      const lent = worley(u * 10, v * 26, 10, 33);
      return clamp(peel * 0.35 + (1 - smoothstep(0.0, 0.1, lent.f1)) * 0.5 + 0.2);
    });
    const normal = normalFromHeight(hf, w, h, 2.0, { repeat: [2, 1] });
    const pale = [222, 216, 205];
    const dark = [46, 42, 38];
    const tan = [150, 122, 92];
    const map = pixelTexture(
      w,
      h,
      (x, y, out) => {
        const u = x / w;
        const v = y / h;
        const lent = worley(u * 10, v * 26, 10, 33);
        const dash = (1 - smoothstep(0.0, 0.055, lent.f1)) * smoothstep(0.4, 0.75, lent.id);
        const stain = smoothstep(0.55, 0.9, fbm(u * 6, v * 4, { octaves: 4, period: 6, seed: 77 }));
        let c = mixRgb(pale, tan, stain * 0.5);
        c = mixRgb(c, dark, dash);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: [2, 1] },
    );
    const rough = roughnessTexture(w, h, (x, y) => clamp(0.6 + hf[y * w + x] * 0.3), { repeat: [2, 1] });
    return { map, normal, rough };
  });
}

/**
 * Broadleaf cluster card: a twig with many individual leaves so the silhouette
 * has real gaps. Returns { map, alphaMapIncluded:true }.
 */
export function leafClusterTexture(variant = 0) {
  return cached('nat.leaf.' + variant, () => {
    const size = 512;
    return canvasTexture(
      size,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const rnd = mulberry32(1000 + variant * 37);
        const sun = hexToRgb(PALETTE.leafSun);
        const mid = hexToRgb(PALETTE.leaf);
        const shade = hexToRgb(PALETTE.leafShade);

        // twig
        ctx.strokeStyle = rgbStr(hexToRgb(PALETTE.barkDark), 1.1);
        ctx.lineWidth = w * 0.016;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w * 0.06, h * 0.5);
        ctx.bezierCurveTo(w * 0.35, h * 0.44, w * 0.65, h * 0.56, w * 0.95, h * 0.5);
        ctx.stroke();

        const leaf = (cx, cy, len, ang, tone) => {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(ang);
          const grad = ctx.createLinearGradient(-len * 0.5, 0, len * 0.5, 0);
          const base = mixRgb(shade, sun, tone);
          grad.addColorStop(0, rgbStr(base, 0.72));
          grad.addColorStop(0.45, rgbStr(base, 1.0));
          grad.addColorStop(1, rgbStr(mixRgb(base, sun, 0.35), 1.08));
          ctx.fillStyle = grad;
          ctx.beginPath();
          const wdt = len * 0.36;
          ctx.moveTo(-len * 0.5, 0);
          ctx.quadraticCurveTo(0, -wdt, len * 0.5, 0);
          ctx.quadraticCurveTo(0, wdt, -len * 0.5, 0);
          ctx.fill();
          // midrib + a couple of veins
          ctx.strokeStyle = rgbStr(mixRgb(base, [255, 255, 220], 0.35), 1);
          ctx.lineWidth = Math.max(1, len * 0.018);
          ctx.beginPath();
          ctx.moveTo(-len * 0.46, 0);
          ctx.lineTo(len * 0.46, 0);
          ctx.stroke();
          ctx.lineWidth = Math.max(0.6, len * 0.01);
          ctx.globalAlpha = 0.5;
          for (let i = -2; i <= 2; i++) {
            if (!i) continue;
            const t = i / 3;
            ctx.beginPath();
            ctx.moveTo(len * t * 0.4, 0);
            ctx.lineTo(len * (t * 0.4 + 0.12), (i > 0 ? 1 : -1) * wdt * 0.55 * (1 - Math.abs(t)));
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          ctx.restore();
        };

        const count = 46;
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          const along = 0.08 + t * 0.86;
          const x = along * w;
          const yBase = h * (0.5 + Math.sin(t * Math.PI * 1.1) * 0.02);
          const side = i % 2 === 0 ? -1 : 1;
          const spread = (0.1 + rnd() * 0.3) * h * (0.35 + 0.65 * Math.sin(t * Math.PI));
          const y = yBase + side * spread;
          const len = h * (0.13 + rnd() * 0.1) * (0.6 + 0.4 * Math.sin(t * Math.PI));
          const ang = side * (0.5 + rnd() * 0.7) + (rnd() - 0.5) * 0.5;
          // petiole
          ctx.strokeStyle = rgbStr(hexToRgb(PALETTE.leafShade), 1.2);
          ctx.lineWidth = w * 0.005;
          ctx.beginPath();
          ctx.moveTo(x, yBase);
          ctx.lineTo(x + Math.cos(ang) * len * 0.4, y + Math.sin(ang) * len * 0.1);
          ctx.stroke();
          leaf(x + Math.cos(ang) * len * 0.5, y, len, ang, clamp(0.25 + rnd() * 0.75));
        }
      },
      { srgb: true, repeat: 1, aniso: 4 },
    );
  });
}

/** Conifer needle spray. Denser, darker, finer silhouette. */
export function needleSprayTexture(variant = 0) {
  return cached('nat.needle.' + variant, () => {
    const size = 512;
    return canvasTexture(
      size,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const rnd = mulberry32(500 + variant * 91);
        const needle = hexToRgb(PALETTE.pineNeedle);
        const sun = hexToRgb(PALETTE.leafSun);
        ctx.lineCap = 'round';
        // main stem
        ctx.strokeStyle = rgbStr(hexToRgb(PALETTE.barkDark), 1.2);
        ctx.lineWidth = w * 0.012;
        ctx.beginPath();
        ctx.moveTo(w * 0.04, h * 0.5);
        ctx.lineTo(w * 0.96, h * 0.5);
        ctx.stroke();
        const branches = 16;
        for (let b = 0; b < branches; b++) {
          const t = b / (branches - 1);
          const bx = w * (0.06 + t * 0.9);
          const side = b % 2 === 0 ? -1 : 1;
          const blen = h * 0.42 * (0.35 + 0.65 * Math.sin(t * Math.PI)) * (0.7 + rnd() * 0.5);
          const bAng = side * (0.75 + rnd() * 0.35);
          const ex = bx + Math.cos(bAng) * blen * 0.35;
          const ey = h * 0.5 + Math.sin(bAng) * blen;
          ctx.strokeStyle = rgbStr(hexToRgb(PALETTE.barkDark), 1.0);
          ctx.lineWidth = w * 0.006;
          ctx.beginPath();
          ctx.moveTo(bx, h * 0.5);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          const n = 22;
          for (let i = 0; i < n; i++) {
            const s = i / (n - 1);
            const px = lerp(bx, ex, s);
            const py = lerp(h * 0.5, ey, s);
            for (const dir of [-1, 1]) {
              const nl = blen * 0.3 * (1 - s * 0.55) * (0.7 + rnd() * 0.6);
              const na = bAng + dir * (0.9 + rnd() * 0.5);
              const tone = clamp(0.15 + rnd() * 0.6 + s * 0.2);
              ctx.strokeStyle = rgbStr(mixRgb(needle, sun, tone * 0.55), 0.85 + tone * 0.5);
              ctx.lineWidth = w * (0.0035 + rnd() * 0.002);
              ctx.beginPath();
              ctx.moveTo(px, py);
              ctx.lineTo(px + Math.cos(na) * nl, py + Math.sin(na) * nl);
              ctx.stroke();
            }
          }
        }
      },
      { srgb: true, repeat: 1, aniso: 4 },
    );
  });
}

/** Fern frond for the undergrowth. */
export function fernTexture(variant = 0) {
  return cached('nat.fern.' + variant, () => {
    const size = 512;
    return canvasTexture(
      size,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const rnd = mulberry32(2200 + variant * 13);
        const base = hexToRgb(PALETTE.fern);
        const sun = hexToRgb(PALETTE.leafSun);
        ctx.lineCap = 'round';
        const fronds = 5;
        for (let f = 0; f < fronds; f++) {
          const t = fronds === 1 ? 0.5 : f / (fronds - 1);
          const rootX = w * (0.5 + (t - 0.5) * 0.16);
          const tipX = w * (0.08 + t * 0.84);
          const tipY = h * (0.06 + Math.abs(t - 0.5) * 0.34 + rnd() * 0.05);
          ctx.strokeStyle = rgbStr(mixRgb(base, sun, 0.2), 0.8);
          ctx.lineWidth = w * 0.009;
          ctx.beginPath();
          ctx.moveTo(rootX, h * 0.99);
          ctx.quadraticCurveTo(lerp(rootX, tipX, 0.4), h * 0.45, tipX, tipY);
          ctx.stroke();
          const n = 26;
          for (let i = 1; i < n; i++) {
            const s = i / n;
            const mx = lerp(lerp(rootX, lerp(rootX, tipX, 0.4), s), lerp(lerp(rootX, tipX, 0.4), tipX, s), s);
            const my = lerp(lerp(h * 0.99, h * 0.45, s), lerp(h * 0.45, tipY, s), s);
            const plen = w * 0.15 * Math.sin(s * Math.PI * 0.95) * (0.8 + rnd() * 0.4);
            for (const dir of [-1, 1]) {
              const ang = Math.atan2(tipY - h * 0.99, tipX - rootX) + dir * 1.15;
              const tone = clamp(0.1 + s * 0.7 + rnd() * 0.3);
              ctx.strokeStyle = rgbStr(mixRgb(base, sun, tone * 0.6), 0.75 + tone * 0.5);
              ctx.lineWidth = w * (0.012 - s * 0.005);
              ctx.beginPath();
              ctx.moveTo(mx, my);
              ctx.quadraticCurveTo(
                mx + Math.cos(ang) * plen * 0.6,
                my + Math.sin(ang) * plen * 0.6 - plen * 0.15,
                mx + Math.cos(ang) * plen,
                my + Math.sin(ang) * plen,
              );
              ctx.stroke();
            }
          }
        }
      },
      { srgb: true, repeat: 1, aniso: 4 },
    );
  });
}

/** Tuft of grass blades / weeds. */
export function grassTuftTexture(variant = 0) {
  return cached('nat.grass.' + variant, () => {
    const size = 256;
    return canvasTexture(
      size,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const rnd = mulberry32(4100 + variant * 7);
        const green = hexToRgb(PALETTE.grass);
        const dry = hexToRgb(PALETTE.grassDry);
        const n = 34;
        for (let i = 0; i < n; i++) {
          const x0 = w * (0.12 + rnd() * 0.76);
          const lean = (rnd() - 0.5) * w * 0.42;
          const top = h * (0.06 + rnd() * 0.5);
          const tone = clamp(rnd());
          const col = mixRgb(green, dry, tone * 0.85);
          const grad = ctx.createLinearGradient(x0, h, x0 + lean, top);
          grad.addColorStop(0, rgbStr(col, 0.5));
          grad.addColorStop(1, rgbStr(col, 1.15));
          ctx.strokeStyle = grad;
          ctx.lineWidth = w * (0.006 + rnd() * 0.008);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x0, h);
          ctx.quadraticCurveTo(x0 + lean * 0.35, (h + top) * 0.5, x0 + lean, top);
          ctx.stroke();
        }
      },
      { srgb: true, repeat: 1, aniso: 4 },
    );
  });
}

/** Lichen-blotched granite. */
export function rockMaps(seed = 9) {
  return cached('nat.rock.' + seed, () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const strata = ridged(u * 5, v * 5, { octaves: 5, period: 5, seed });
      const chip = worley(u * 16, v * 16, 16, seed + 3);
      const grain = fbm(u * 55, v * 55, { octaves: 3, period: 55, seed: seed + 8 });
      return clamp(strata * 0.5 + smoothstep(0.0, 0.3, chip.f1) * 0.35 + grain * 0.15);
    });
    const normal = normalFromHeight(hf, n, n, 2.6, { repeat: 2 });
    const grey = [124, 122, 118];
    const dark = [58, 57, 55];
    const lichen = hexToRgb(0x93a06a);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const d = hf[y * n + x];
        let c = mixRgb(dark, grey, smoothstep(0.15, 0.85, d));
        const lich = smoothstep(0.58, 0.9, fbm(u * 8, v * 8, { octaves: 5, period: 8, seed: seed + 20 }));
        c = mixRgb(c, lichen, lich * 0.6 * smoothstep(0.3, 0.8, d));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 2 },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.68 + (1 - hf[y * n + x]) * 0.24), { repeat: 2 });
    return { map, normal, rough };
  });
}

/** Soft radial sprite used for dust motes and pollen. */
export function motePattern() {
  return cached('nat.mote', () =>
    canvasTexture(
      64,
      (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.35, 'rgba(255,246,225,0.55)');
        g.addColorStop(1, 'rgba(255,240,210,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      },
      { srgb: true },
    ),
  );
}
