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
// Trees, foliage and rock.
//
// Foliage is drawn into 2x2 canvas atlases: four species / seasonal states per
// texture, so one material and one draw call still covers a mixed forest. Every
// atlas ends with a background fill of its own mid tone — transparent canvas
// pixels are (0,0,0,0), and mipmapping those into the visible edge is what puts
// a black halo around distant foliage.
// ---------------------------------------------------------------------------

function rgbStr(c, mul = 1, alpha = 1) {
  const r = Math.round(clamp(c[0] * mul, 0, 255));
  const g = Math.round(clamp(c[1] * mul, 0, 255));
  const b = Math.round(clamp(c[2] * mul, 0, 255));
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/** Push a colour into every fully transparent pixel so mips stay in family. */
function bleedBackground(ctx, w, h, rgb) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const r = Math.round(clamp(rgb[0], 0, 255));
  const g = Math.round(clamp(rgb[1], 0, 255));
  const b = Math.round(clamp(rgb[2], 0, 255));
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 10) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Darken the interior of whatever has already been drawn, silhouette intact. */
function shadeCore(ctx, w, h, amount, { from = 'centre' } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const g =
    from === 'centre'
      ? ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.62)
      : ctx.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, `rgba(6,14,8,${amount})`);
  g.addColorStop(0.55, `rgba(6,14,8,${amount * 0.45})`);
  g.addColorStop(1, 'rgba(6,14,8,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Lay four tile painters out in a 2x2 grid. Tiles keep a transparent margin. */
function atlas(key, tile, painters, { bleed = [40, 52, 32], srgb = true } = {}) {
  return cached(key, () =>
    canvasTexture(
      tile * 2,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        painters.forEach((fn, i) => {
          const tx = (i % 2) * tile;
          const ty = Math.floor(i / 2) * tile;
          ctx.save();
          ctx.beginPath();
          ctx.rect(tx, ty, tile, tile);
          ctx.clip();
          ctx.translate(tx, ty);
          fn(ctx, tile, tile);
          ctx.restore();
        });
        bleedBackground(ctx, w, h, bleed);
      },
      { srgb, repeat: 1, aniso: 4, height: tile * 2 },
    ),
  );
}

/** UV rect for atlas tile i of a 2x2 grid, inset to keep mips from bleeding. */
export function atlasTile(i, inset = 0.012) {
  const cx = (i % 2) * 0.5;
  const cy = 1 - (Math.floor(i / 2) + 1) * 0.5;
  return [cx + inset, cy + inset, 0.5 - inset * 2, 0.5 - inset * 2];
}

// ---------------------------------------------------------------------------
// Bark
// ---------------------------------------------------------------------------

const BARK_KINDS = {
  // fissure frequency / plate scale / colour trio / how much the ridges lighten
  fir: { fis: 7.5, plate: 6, stretch: 1.6, sharp: 2.1, light: 1.0, warm: 1.0 },
  cedar: { fis: 13, plate: 11, stretch: 0.75, sharp: 2.6, light: 0.86, warm: 1.12 },
  hemlock: { fis: 9.5, plate: 8, stretch: 2.4, sharp: 1.7, light: 0.94, warm: 0.9 },
};

/**
 * Trunk bark. UVs are authored on the trunk geometry as u = around, v = up, so
 * the fissures are stretched along v here.
 */
export function barkMaps(kind = 'fir', seed = 5) {
  return cached('nat.bark.' + kind + '.' + seed, () => {
    const K = BARK_KINDS[kind] || BARK_KINDS.fir;
    const w = 256;
    const h = 512;
    const vf = K.stretch;
    const hf = heightField(w, h, (x, y) => {
      const u = x / w;
      const v = y / h;
      const warp = fbm(u * 5, v * 2 * vf, { octaves: 3, period: 5, seed: seed + 2 }) - 0.5;
      // deep vertical fissures: ridged noise pushed to a sharp valley floor
      const fis = ridged(u * K.fis + warp * 0.5, v * 1.7 * vf, { octaves: 4, period: K.fis | 0, seed });
      // plates break the ridges into slabs
      const plates = worley(u * K.plate, v * 2.4 * vf, K.plate | 0, seed + 40);
      const slab = smoothstep(0.02, 0.2, plates.f2 - plates.f1);
      const crack = 1 - smoothstep(0.0, 0.055, plates.f2 - plates.f1);
      const fine = fbm(u * 34, v * 19 * vf, { octaves: 4, period: 34, seed: seed + 11 });
      let d = Math.pow(clamp(fis), K.sharp) * 0.66 + slab * 0.22 + fine * 0.14;
      return clamp(d * (1 - crack * 0.9));
    });
    const normal = normalFromHeight(hf, w, h, 5.6, { repeat: 1 });
    const deep = [16, 12, 9];
    const dark = hexToRgb(PALETTE.barkDark);
    const mid = hexToRgb(PALETTE.bark);
    const light = hexToRgb(PALETTE.barkLight);
    const bleached = [138, 126, 110];
    const map = pixelTexture(
      w,
      h,
      (x, y, out) => {
        const u = x / w;
        const v = y / h;
        const d = hf[y * w + x];
        // full value range: near black in the fissures, dusty grey on the ridges
        let c = mixRgb(deep, dark, smoothstep(0.0, 0.32, d));
        c = mixRgb(c, mid, smoothstep(0.28, 0.62, d));
        c = mixRgb(c, light, smoothstep(0.62, 0.92, d) * K.light * 0.78);
        c = mixRgb(c, bleached, smoothstep(0.93, 1.0, d) * 0.28 * K.light);
        // large scale stain so a whole flank of the trunk goes darker
        const stain = fbm(u * 2.5, v * 1.4 * vf, { octaves: 4, period: 3, seed: seed + 90 });
        c = mixRgb(c, deep, smoothstep(0.5, 0.92, stain) * 0.52);
        c[0] *= K.warm * 0.9;
        c[1] *= 0.9;
        c[2] *= (2 - K.warm) * 0.9;
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(w, h, (x, y) => clamp(0.74 + (1 - hf[y * w + x]) * 0.24), { repeat: 1 });
    const ao = roughnessTexture(w, h, (x, y) => clamp(0.2 + hf[y * w + x] * 0.9), { repeat: 1 });
    // moss / lichen mask, blended in the shader against the sun direction
    const mossMask = roughnessTexture(
      w,
      h,
      (x, y) => {
        const u = x / w;
        const v = y / h;
        const patch = fbm(u * 3.5, v * 2.2 * vf, { octaves: 4, period: 4, seed: seed + 61 });
        const fuzz = fbm(u * 16, v * 11 * vf, { octaves: 3, period: 16, seed: seed + 71 });
        // moss sits in the fissures and on the plate edges, not on the high ridges
        const grip = 1 - smoothstep(0.55, 0.95, hf[y * w + x]);
        return clamp(smoothstep(0.44, 0.78, patch) * (0.45 + fuzz * 0.75) * (0.35 + grip * 0.8));
      },
      { repeat: 1 },
    );
    return { map, normal, rough, ao, mossMask };
  });
}

/** Papery birch / alder bark. */
export function birchBarkMaps() {
  return cached('nat.birch', () => {
    const w = 256;
    const h = 512;
    const hf = heightField(w, h, (x, y) => {
      const u = x / w;
      const v = y / h;
      const peel = fbm(u * 24, v * 6, { octaves: 3, period: 24, seed: 21 });
      const lent = worley(u * 22, v * 8, 22, 33);
      return clamp(peel * 0.4 + (1 - smoothstep(0.0, 0.12, lent.f1)) * 0.45 + 0.18);
    });
    const normal = normalFromHeight(hf, w, h, 2.4, { repeat: 1 });
    const pale = [206, 199, 186];
    const dark = [38, 35, 32];
    const tan = [138, 112, 84];
    const grey = [120, 122, 118];
    const map = pixelTexture(
      w,
      h,
      (x, y, out) => {
        const u = x / w;
        const v = y / h;
        // horizontal lenticel dashes: stretched cells across the trunk
        const lent = worley(u * 22, v * 7, 22, 33);
        const dash = (1 - smoothstep(0.0, 0.06, lent.f1)) * smoothstep(0.35, 0.72, lent.id);
        const stain = smoothstep(0.5, 0.9, fbm(u * 4, v * 3, { octaves: 4, period: 4, seed: 77 }));
        const soot = smoothstep(0.58, 0.95, fbm(u * 9, v * 5, { octaves: 4, period: 9, seed: 111 }));
        let c = mixRgb(pale, tan, stain * 0.55);
        c = mixRgb(c, grey, soot * 0.5);
        c = mixRgb(c, dark, dash * 0.9);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(w, h, (x, y) => clamp(0.52 + hf[y * w + x] * 0.36), { repeat: 1 });
    const ao = roughnessTexture(w, h, (x, y) => clamp(0.45 + hf[y * w + x] * 0.6), { repeat: 1 });
    const mossMask = roughnessTexture(
      w,
      h,
      (x, y) => {
        const u = x / w;
        const v = y / h;
        const patch = fbm(u * 5, v * 3, { octaves: 4, period: 5, seed: 143 });
        return clamp(smoothstep(0.55, 0.85, patch) * 0.85);
      },
      { repeat: 1 },
    );
    return { map, normal, rough, ao, mossMask };
  });
}

/** Weathered silver snag wood: splintered grain, no bark left. */
export function deadWoodMaps() {
  return cached('nat.deadwood', () => {
    const w = 256;
    const h = 512;
    const hf = heightField(w, h, (x, y) => {
      const u = x / w;
      const v = y / h;
      const grain = ridged(u * 26, v * 2.0, { octaves: 3, period: 26, seed: 205 });
      const split = ridged(u * 6, v * 1.1, { octaves: 2, period: 6, seed: 211 });
      const rot = fbm(u * 12, v * 9, { octaves: 4, period: 12, seed: 219 });
      return clamp(grain * 0.42 + Math.pow(split, 3) * 0.34 + rot * 0.24);
    });
    const normal = normalFromHeight(hf, w, h, 4.2, { repeat: 1 });
    const silver = [150, 145, 136];
    const grey = [96, 92, 86];
    const shadow = [34, 31, 27];
    const rust = [92, 68, 48];
    const map = pixelTexture(
      w,
      h,
      (x, y, out) => {
        const u = x / w;
        const v = y / h;
        const d = hf[y * w + x];
        let c = mixRgb(shadow, grey, smoothstep(0.1, 0.5, d));
        c = mixRgb(c, silver, smoothstep(0.48, 0.9, d));
        const decay = smoothstep(0.5, 0.9, fbm(u * 4, v * 2.5, { octaves: 4, period: 4, seed: 231 }));
        c = mixRgb(c, rust, decay * 0.55);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(w, h, () => 0.93, { repeat: 1 });
    const ao = roughnessTexture(w, h, (x, y) => clamp(0.3 + hf[y * w + x] * 0.8), { repeat: 1 });
    const mossMask = roughnessTexture(
      w,
      h,
      (x, y) => {
        const u = x / w;
        const v = y / h;
        return clamp(smoothstep(0.6, 0.9, fbm(u * 6, v * 3, { octaves: 4, period: 6, seed: 244 })) * 0.7);
      },
      { repeat: 1 },
    );
    return { map, normal, rough, ao, mossMask };
  });
}

// ---------------------------------------------------------------------------
// Conifer foliage atlas
// ---------------------------------------------------------------------------

function needleTile(ctx, w, h, opts) {
  const { seed, base, tip, shade, stem, branchlets, needleLen, needleW, sweep, sag, density } = opts;
  const rnd = mulberry32(seed);
  const midY = h * 0.5;
  ctx.lineCap = 'round';

  const stemPath = (t) => ({
    x: w * (0.03 + t * 0.94),
    y: midY + Math.sin(t * Math.PI) * h * sag,
  });

  // woody stem, thick at the base
  ctx.strokeStyle = rgbStr(stem, 1);
  for (let i = 0; i < 24; i++) {
    const a = stemPath(i / 24);
    const b = stemPath((i + 1) / 24);
    ctx.lineWidth = w * (0.017 * (1 - i / 24) + 0.003);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  for (let bi = 0; bi < branchlets; bi++) {
    const t = 0.05 + (bi / branchlets) * 0.93;
    const side = bi % 2 === 0 ? -1 : 1;
    const root = stemPath(t);
    const env = Math.pow(1 - t, 0.6) * 0.9 + 0.12;
    const blen = h * 0.46 * env * (0.72 + rnd() * 0.5);
    const ang = side * (sweep + rnd() * 0.22);
    const ex = root.x + Math.cos(ang) * blen * 0.42;
    const ey = root.y + Math.sin(ang) * blen;
    // branchlets bow away from the stem: straight ones stack up as a visible
    // set of parallel lines across the tile
    const bow = (0.12 + rnd() * 0.2) * blen * side;
    const cx = (root.x + ex) * 0.5 + bow * 0.5;
    const cy = (root.y + ey) * 0.5 - bow * 0.25;
    const at = (s) => {
      const k = 1 - s;
      return [k * k * root.x + 2 * k * s * cx + s * s * ex, k * k * root.y + 2 * k * s * cy + s * s * ey];
    };
    ctx.strokeStyle = rgbStr(stem, 1.15);
    ctx.lineWidth = w * 0.0055 * env + w * 0.001;
    ctx.beginPath();
    ctx.moveTo(root.x, root.y);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();

    const n = Math.round(density * (0.7 + env * 0.6));
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1 || 1);
      const [px, py] = at(s);
      for (const dir of [-1, 1]) {
        const nl = blen * needleLen * (1 - s * 0.45) * (0.65 + rnd() * 0.7);
        const na = ang + dir * (0.85 + rnd() * 0.55);
        // needles near the tip and on the outside of the spray catch the light
        const tone = clamp(rnd() * 0.55 + s * 0.35 + (dir === side ? 0.18 : 0));
        const col = tone < 0.28 ? mixRgb(shade, base, tone / 0.28) : mixRgb(base, tip, (tone - 0.28) / 0.72);
        ctx.strokeStyle = rgbStr(col, 0.9 + tone * 0.35);
        ctx.lineWidth = w * needleW * (0.75 + rnd() * 0.6);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(
          px + Math.cos(na) * nl * 0.6,
          py + Math.sin(na) * nl * 0.55,
          px + Math.cos(na) * nl,
          py + Math.sin(na) * nl * 1.05,
        );
        ctx.stroke();
      }
    }
  }
  shadeCore(ctx, w, h, 0.55);
}

function cedarTile(ctx, w, h, opts) {
  const { seed, base, tip, shade, stem } = opts;
  const rnd = mulberry32(seed);
  const midY = h * 0.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const sprig = (x, y, len, ang, depth) => {
    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;
    // flattened scale leaves: a tapering ribbon rather than a needle
    const grad = ctx.createLinearGradient(x, y, ex, ey);
    const tone = clamp(0.2 + rnd() * 0.6 + depth * 0.12);
    const col = mixRgb(mixRgb(shade, base, clamp(tone * 1.6)), tip, clamp(tone - 0.35) * 1.2);
    grad.addColorStop(0, rgbStr(mixRgb(col, shade, 0.4), 1));
    grad.addColorStop(1, rgbStr(col, 1.15));
    ctx.strokeStyle = grad;
    ctx.lineWidth = w * (0.019 - depth * 0.0042);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(lerp(x, ex, 0.5) + Math.sin(ang) * len * 0.12, lerp(y, ey, 0.5), ex, ey);
    ctx.stroke();
    if (depth < 3) {
      const kids = depth === 0 ? 7 : 4;
      for (let i = 1; i <= kids; i++) {
        const s = i / (kids + 0.6);
        const kx = lerp(x, ex, s);
        const ky = lerp(y, ey, s);
        for (const dir of [-1, 1]) {
          sprig(kx, ky, len * (0.46 - depth * 0.06) * (0.7 + rnd() * 0.6), ang + dir * (0.6 + rnd() * 0.35), depth + 1);
        }
      }
    }
  };

  ctx.strokeStyle = rgbStr(stem, 1);
  ctx.lineWidth = w * 0.014;
  ctx.beginPath();
  ctx.moveTo(w * 0.04, midY);
  ctx.lineTo(w * 0.34, midY);
  ctx.stroke();
  sprig(w * 0.06, midY, w * 0.5, 0, 0);
  sprig(w * 0.16, midY, w * 0.4, -0.5, 1);
  sprig(w * 0.16, midY, w * 0.4, 0.5, 1);
  shadeCore(ctx, w, h, 0.5);
}

export function needleAtlas() {
  const needle = hexToRgb(PALETTE.pineNeedle);
  const sun = hexToRgb(PALETTE.leafSun);
  const shadeC = hexToRgb(PALETTE.leafShade);
  const woody = hexToRgb(PALETTE.barkDark);
  return atlas(
    'nat.needleAtlas',
    512,
    [
      // 0 douglas fir: dark, medium needles, flat spray
      (c, w, h) =>
        needleTile(c, w, h, {
          seed: 811,
          base: mixRgb(needle, [0, 0, 0], 0.18),
          tip: mixRgb(sun, needle, 0.42),
          shade: mixRgb(shadeC, [0, 0, 0], 0.25),
          stem: woody,
          branchlets: 34,
          needleLen: 0.3,
          needleW: 0.005,
          sweep: 0.92,
          sag: 0.02,
          density: 22,
        }),
      // 1 hemlock: finer, lighter, droopy
      (c, w, h) =>
        needleTile(c, w, h, {
          seed: 1213,
          base: mixRgb(needle, sun, 0.22),
          tip: mixRgb(sun, needle, 0.3),
          shade: shadeC,
          stem: mixRgb(woody, [90, 74, 58], 0.4),
          branchlets: 42,
          needleLen: 0.25,
          needleW: 0.004,
          sweep: 1.12,
          sag: 0.07,
          density: 26,
        }),
      // 2 cedar: flat scale fans, blue-green
      (c, w, h) =>
        cedarTile(c, w, h, {
          seed: 1607,
          base: mixRgb(needle, [40, 90, 90], 0.3),
          tip: mixRgb(sun, [120, 170, 140], 0.45),
          shade: mixRgb(shadeC, [20, 40, 44], 0.4),
          stem: woody,
        }),
      // 3 dead / rust: sparse, warm, bare twigs showing
      (c, w, h) =>
        needleTile(c, w, h, {
          seed: 1913,
          base: [116, 78, 44],
          tip: [162, 118, 62],
          shade: [58, 40, 26],
          stem: mixRgb(woody, [70, 58, 48], 0.6),
          branchlets: 20,
          needleLen: 0.24,
          needleW: 0.0032,
          sweep: 1.0,
          sag: 0.04,
          density: 8,
        }),
    ],
    { bleed: mixRgb(shadeC, needle, 0.5) },
  );
}

// ---------------------------------------------------------------------------
// Broadleaf atlas
// ---------------------------------------------------------------------------

function palmatePath(ctx, len) {
  const N = 52;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const th = -2.3 + (i / N) * 4.6;
    const lobe = Math.pow(Math.abs(Math.cos(th * 2.4)), 0.5);
    const r = len * (0.2 + 0.8 * lobe) * (0.6 + 0.4 * Math.cos(th * 0.4));
    const x = Math.cos(th) * r;
    const y = Math.sin(th) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function ovalPath(ctx, len, wide) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.25, -wide, len * 0.72, -wide * 0.82, len, 0);
  ctx.bezierCurveTo(len * 0.72, wide * 0.82, len * 0.25, wide, 0, 0);
  ctx.closePath();
}

function leafTile(ctx, w, h, opts) {
  const { seed, sun, mid, shade, stemCol, count, shape, leafLen, spread } = opts;
  const rnd = mulberry32(seed);
  ctx.lineCap = 'round';

  const twig = (x0, y0, x1, y1, wid) => {
    ctx.strokeStyle = rgbStr(stemCol, 1);
    ctx.lineWidth = wid;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) * 0.5, (y0 + y1) * 0.5 - h * 0.03, x1, y1);
    ctx.stroke();
  };

  twig(w * 0.04, h * 0.5, w * 0.96, h * 0.5, w * 0.014);
  for (let i = 0; i < 5; i++) {
    const t = 0.2 + i * 0.17;
    const side = i % 2 ? 1 : -1;
    twig(w * t, h * 0.5, w * (t + 0.2), h * (0.5 + side * spread * 0.8), w * 0.008);
  }

  const drawLeaf = (cx, cy, len, ang, tone, flip) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    if (flip) ctx.scale(1, -1);
    const base = tone < 0.4 ? mixRgb(shade, mid, tone / 0.4) : mixRgb(mid, sun, (tone - 0.4) / 0.6);
    const grad = ctx.createLinearGradient(0, -len * 0.4, len, len * 0.4);
    grad.addColorStop(0, rgbStr(mixRgb(base, shade, 0.45), 1));
    grad.addColorStop(0.5, rgbStr(base, 1.0));
    grad.addColorStop(1, rgbStr(mixRgb(base, sun, 0.4), 1.12));
    ctx.fillStyle = grad;
    if (shape === 'palmate') palmatePath(ctx, len);
    else ovalPath(ctx, len, len * 0.34);
    ctx.fill();
    ctx.strokeStyle = rgbStr(mixRgb(base, [240, 240, 200], 0.4), 1, 0.7);
    ctx.lineWidth = Math.max(0.7, len * 0.022);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len * 0.92, 0);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.5, len * 0.012);
    ctx.globalAlpha = 0.45;
    for (let i = 1; i <= 3; i++) {
      const s = i / 4;
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(len * s * 0.85, 0);
        ctx.lineTo(len * (s * 0.85 + 0.16), d * len * 0.26 * (1 - s * 0.4));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const along = 0.08 + t * 0.86;
    const x = along * w;
    const side = i % 2 === 0 ? -1 : 1;
    const off = (0.08 + rnd() * spread) * h * (0.4 + 0.6 * Math.sin(t * Math.PI));
    const y = h * 0.5 + side * off;
    const len = h * leafLen * (0.65 + rnd() * 0.6) * (0.62 + 0.38 * Math.sin(t * Math.PI));
    const ang = side * (0.3 + rnd() * 0.9) + (rnd() - 0.5) * 0.6;
    ctx.strokeStyle = rgbStr(stemCol, 1.2);
    ctx.lineWidth = w * 0.0045;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.5);
    ctx.lineTo(x + Math.cos(ang) * len * 0.2, y);
    ctx.stroke();
    drawLeaf(x, y, len, ang, clamp(0.12 + rnd() * 0.9), rnd() < 0.5);
  }
  shadeCore(ctx, w, h, 0.42);
}

export function leafAtlas() {
  const sun = hexToRgb(PALETTE.leafSun);
  const mid = hexToRgb(PALETTE.leaf);
  const shade = hexToRgb(PALETTE.leafShade);
  const woody = hexToRgb(PALETTE.barkDark);
  return atlas(
    'nat.leafAtlas',
    512,
    [
      // 0 bigleaf maple
      (c, w, h) =>
        leafTile(c, w, h, {
          seed: 3301,
          sun,
          mid,
          shade,
          stemCol: mixRgb(woody, [110, 88, 62], 0.4),
          count: 22,
          shape: 'palmate',
          leafLen: 0.2,
          spread: 0.26,
        }),
      // 1 alder: smaller ovals, darker, denser
      (c, w, h) =>
        leafTile(c, w, h, {
          seed: 3907,
          sun: mixRgb(sun, mid, 0.4),
          mid: mixRgb(mid, [0, 0, 0], 0.15),
          shade: mixRgb(shade, [0, 0, 0], 0.2),
          stemCol: woody,
          count: 58,
          shape: 'oval',
          leafLen: 0.19,
          spread: 0.32,
        }),
      // 2 turning: bronze rather than gold. A saturated yellow tile plus a warm
      // per-instance tint reads as a red blob against this fog.
      (c, w, h) =>
        leafTile(c, w, h, {
          seed: 4409,
          sun: [168, 142, 82],
          mid: [124, 102, 56],
          shade: [66, 54, 32],
          stemCol: mixRgb(woody, [120, 92, 58], 0.5),
          count: 32,
          shape: 'palmate',
          leafLen: 0.2,
          spread: 0.28,
        }),
      // 3 dying: sparse, rust brown, twigs showing
      (c, w, h) =>
        leafTile(c, w, h, {
          seed: 4903,
          sun: [150, 106, 58],
          mid: [110, 76, 44],
          shade: [58, 42, 28],
          stemCol: mixRgb(woody, [96, 82, 70], 0.6),
          count: 22,
          shape: 'oval',
          leafLen: 0.16,
          spread: 0.3,
        }),
    ],
    { bleed: mixRgb(shade, mid, 0.5) },
  );
}

// ---------------------------------------------------------------------------
// Undergrowth atlases. Plants are drawn rooted at the bottom centre of a tile.
// ---------------------------------------------------------------------------

function frondTile(ctx, w, h, opts) {
  const { seed, base, sun, shade, fronds, pinnaeLen, arch, spread, tipY, stemW } = opts;
  const rnd = mulberry32(seed);
  ctx.lineCap = 'round';
  const rootY = h * 0.995;
  const order = [];
  for (let f = 0; f < fronds; f++) order.push(f);
  // draw the outer fronds first so the middle of the plant sits in front
  order.sort((a, b) => Math.abs(b - (fronds - 1) / 2) - Math.abs(a - (fronds - 1) / 2));

  for (const f of order) {
    const t = fronds === 1 ? 0.5 : f / (fronds - 1);
    const dirn = (t - 0.5) * 2;
    const rootX = w * (0.5 + dirn * 0.05);
    const tipX = w * (0.5 + dirn * spread);
    const ty = h * (tipY + Math.abs(dirn) * arch + rnd() * 0.06);
    const ctrlX = lerp(rootX, tipX, 0.35);
    const ctrlY = lerp(rootY, ty, 0.72);
    const depth = 1 - Math.abs(dirn) * 0.55;

    ctx.strokeStyle = rgbStr(mixRgb(base, sun, 0.15), 0.7 + depth * 0.3);
    ctx.lineWidth = w * stemW;
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, ty);
    ctx.stroke();

    const n = 30;
    for (let i = 1; i < n; i++) {
      const s = i / n;
      const mx = lerp(lerp(rootX, ctrlX, s), lerp(ctrlX, tipX, s), s);
      const my = lerp(lerp(rootY, ctrlY, s), lerp(ctrlY, ty, s), s);
      const nx = lerp(lerp(rootX, ctrlX, s + 0.02), lerp(ctrlX, tipX, s + 0.02), s + 0.02);
      const ny = lerp(lerp(rootY, ctrlY, s + 0.02), lerp(ctrlY, ty, s + 0.02), s + 0.02);
      const along = Math.atan2(ny - my, nx - mx);
      const plen = w * pinnaeLen * Math.sin(clamp(s * 1.15) * Math.PI * 0.92) * (0.75 + rnd() * 0.45);
      for (const dir of [-1, 1]) {
        const ang = along + dir * (1.02 + rnd() * 0.3);
        const tone = clamp(0.08 + s * 0.5 + rnd() * 0.35) * (0.5 + depth * 0.6);
        const col = tone < 0.3 ? mixRgb(shade, base, tone / 0.3) : mixRgb(base, sun, (tone - 0.3) / 0.7);
        ctx.strokeStyle = rgbStr(col, 0.72 + tone * 0.5);
        ctx.lineWidth = w * (0.016 - s * 0.008);
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.quadraticCurveTo(
          mx + Math.cos(ang) * plen * 0.55,
          my + Math.sin(ang) * plen * 0.55 - plen * 0.2,
          mx + Math.cos(ang) * plen,
          my + Math.sin(ang) * plen,
        );
        ctx.stroke();
      }
    }
  }
  shadeCore(ctx, w, h, 0.5, { from: 'bottom' });
}

export function fernAtlas() {
  const fern = hexToRgb(PALETTE.fern);
  const sun = hexToRgb(PALETTE.leafSun);
  const shade = hexToRgb(PALETTE.leafShade);
  return atlas(
    'nat.fernAtlas',
    512,
    [
      // 0 sword fern: upright, narrow
      (c, w, h) =>
        frondTile(c, w, h, {
          seed: 5501,
          base: fern,
          sun: mixRgb(sun, fern, 0.25),
          shade,
          fronds: 9,
          pinnaeLen: 0.11,
          arch: 0.2,
          spread: 0.44,
          tipY: 0.05,
          stemW: 0.008,
        }),
      // 1 bracken: wide, flatter, paler
      (c, w, h) =>
        frondTile(c, w, h, {
          seed: 6101,
          base: mixRgb(fern, sun, 0.28),
          sun: mixRgb(sun, [220, 210, 140], 0.3),
          shade: mixRgb(shade, fern, 0.3),
          fronds: 7,
          pinnaeLen: 0.14,
          arch: 0.34,
          spread: 0.52,
          tipY: 0.14,
          stemW: 0.0095,
        }),
      // 2 deer fern: small, dark, tight
      (c, w, h) =>
        frondTile(c, w, h, {
          seed: 6703,
          base: mixRgb(fern, [0, 0, 0], 0.22),
          sun: mixRgb(sun, fern, 0.5),
          shade: mixRgb(shade, [0, 0, 0], 0.3),
          fronds: 11,
          pinnaeLen: 0.085,
          arch: 0.26,
          spread: 0.4,
          tipY: 0.16,
          stemW: 0.007,
        }),
      // 3 dying fern: rust and ochre
      (c, w, h) =>
        frondTile(c, w, h, {
          seed: 7207,
          base: [124, 96, 48],
          sun: [176, 144, 76],
          shade: [64, 48, 28],
          fronds: 7,
          pinnaeLen: 0.1,
          arch: 0.38,
          spread: 0.5,
          tipY: 0.2,
          stemW: 0.008,
        }),
    ],
    { bleed: mixRgb(shade, fern, 0.55) },
  );
}

function grassTile(ctx, w, h, opts) {
  const { seed, green, dry, blades, tall, wide, seedHeads } = opts;
  const rnd = mulberry32(seed);
  ctx.lineCap = 'round';
  for (let i = 0; i < blades; i++) {
    // spread the roots across the tile: these cards are scattered as wide
    // patches, so blades bunched at the centre leave gaps between instances
    const x0 = w * (0.5 + (rnd() - 0.5) * 0.86);
    const lean = (rnd() - 0.5) * w * wide;
    const top = h * (1 - tall * (0.45 + rnd() * 0.62));
    const tone = clamp(rnd());
    const col = mixRgb(green, dry, tone * 0.9);
    const grad = ctx.createLinearGradient(x0, h, x0 + lean, top);
    grad.addColorStop(0, rgbStr(mixRgb(col, [12, 20, 12], 0.55), 1));
    grad.addColorStop(0.4, rgbStr(col, 0.9));
    grad.addColorStop(1, rgbStr(col, 1.2));
    ctx.strokeStyle = grad;
    ctx.lineWidth = w * (0.006 + rnd() * 0.01);
    ctx.beginPath();
    ctx.moveTo(x0, h);
    ctx.quadraticCurveTo(x0 + lean * 0.3, lerp(h, top, 0.55), x0 + lean, top);
    ctx.stroke();
    if (seedHeads && rnd() < 0.13) {
      ctx.fillStyle = rgbStr(mixRgb(dry, [150, 138, 104], 0.35), 1);
      for (let k = 0; k < 7; k++) {
        const s = 0.72 + k * 0.04;
        const px = x0 + lean * s;
        const py = lerp(h, top, s);
        ctx.beginPath();
        ctx.ellipse(px, py, w * 0.008, w * 0.017, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  shadeCore(ctx, w, h, 0.4, { from: 'bottom' });
}

export function grassAtlas() {
  const green = hexToRgb(PALETTE.grass);
  const dry = hexToRgb(PALETTE.grassDry);
  const fern = hexToRgb(PALETTE.fern);
  return atlas(
    'nat.grassAtlas',
    512,
    [
      (c, w, h) => grassTile(c, w, h, { seed: 8101, green: mixRgb(green, fern, 0.4), dry: mixRgb(dry, green, 0.3), blades: 96, tall: 0.72, wide: 0.4, seedHeads: false }),
      (c, w, h) => grassTile(c, w, h, { seed: 8609, green, dry: mixRgb(dry, green, 0.2), blades: 76, tall: 0.9, wide: 0.5, seedHeads: true }),
      (c, w, h) => grassTile(c, w, h, { seed: 9109, green: mixRgb(green, [0, 0, 0], 0.3), dry: mixRgb(dry, green, 0.55), blades: 112, tall: 0.55, wide: 0.34, seedHeads: false }),
      (c, w, h) => grassTile(c, w, h, { seed: 9601, green: mixRgb(green, dry, 0.4), dry: mixRgb(dry, [78, 74, 54], 0.5), blades: 68, tall: 0.82, wide: 0.58, seedHeads: true }),
    ],
    { bleed: mixRgb(hexToRgb(PALETTE.leafShade), green, 0.5) },
  );
}

function shrubTile(ctx, w, h, opts) {
  const { seed, sun, mid, shade, stemCol, stems, leafLen, berry } = opts;
  const rnd = mulberry32(seed);
  ctx.lineCap = 'round';
  const rootX = w * 0.5;
  const rootY = h * 0.99;
  for (let s = 0; s < stems; s++) {
    const t = stems === 1 ? 0.5 : s / (stems - 1);
    const dirn = (t - 0.5) * 2;
    const tipX = w * (0.5 + dirn * 0.42);
    const tipY = h * (0.08 + Math.abs(dirn) * 0.3 + rnd() * 0.1);
    const ctrlX = lerp(rootX, tipX, 0.3);
    const ctrlY = lerp(rootY, tipY, 0.7);
    ctx.strokeStyle = rgbStr(stemCol, 1);
    ctx.lineWidth = w * 0.011;
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();
    const n = 9;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const mx = lerp(lerp(rootX, ctrlX, u), lerp(ctrlX, tipX, u), u);
      const my = lerp(lerp(rootY, ctrlY, u), lerp(ctrlY, tipY, u), u);
      const side = i % 2 ? 1 : -1;
      const len = w * leafLen * (0.7 + rnd() * 0.6);
      const ang = Math.atan2(tipY - rootY, tipX - rootX) + side * (0.9 + rnd() * 0.6);
      const tone = clamp(0.15 + u * 0.5 + rnd() * 0.4);
      const col = tone < 0.35 ? mixRgb(shade, mid, tone / 0.35) : mixRgb(mid, sun, (tone - 0.35) / 0.65);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(ang);
      const grad = ctx.createLinearGradient(0, -len * 0.3, len, len * 0.3);
      grad.addColorStop(0, rgbStr(mixRgb(col, shade, 0.4), 1));
      grad.addColorStop(1, rgbStr(mixRgb(col, sun, 0.3), 1.1));
      ctx.fillStyle = grad;
      ovalPath(ctx, len, len * 0.42);
      ctx.fill();
      ctx.strokeStyle = rgbStr(mixRgb(col, [230, 235, 200], 0.35), 1, 0.55);
      ctx.lineWidth = Math.max(0.6, len * 0.03);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len * 0.9, 0);
      ctx.stroke();
      ctx.restore();
      if (berry && rnd() < 0.14) {
        ctx.fillStyle = rgbStr([46, 40, 58], 1);
        ctx.beginPath();
        ctx.arc(mx, my, w * 0.012, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  shadeCore(ctx, w, h, 0.45, { from: 'bottom' });
}

export function shrubAtlas() {
  const sun = hexToRgb(PALETTE.leafSun);
  const mid = hexToRgb(PALETTE.leaf);
  const shade = hexToRgb(PALETTE.leafShade);
  const woody = hexToRgb(PALETTE.barkDark);
  return atlas(
    'nat.shrubAtlas',
    512,
    [
      (c, w, h) => shrubTile(c, w, h, { seed: 10301, sun, mid, shade, stemCol: mixRgb(woody, [90, 62, 44], 0.5), stems: 7, leafLen: 0.15, berry: true }),
      (c, w, h) => shrubTile(c, w, h, { seed: 10709, sun: mixRgb(sun, mid, 0.5), mid: mixRgb(mid, [0, 0, 0], 0.2), shade, stemCol: woody, stems: 9, leafLen: 0.11, berry: false }),
      (c, w, h) => shrubTile(c, w, h, { seed: 11311, sun: [196, 168, 82], mid: [140, 118, 58], shade: [76, 60, 34], stemCol: mixRgb(woody, [116, 90, 60], 0.5), stems: 6, leafLen: 0.14, berry: false }),
      (c, w, h) => shrubTile(c, w, h, { seed: 11903, sun: mixRgb(sun, [180, 210, 150], 0.4), mid: mixRgb(mid, hexToRgb(PALETTE.fern), 0.5), shade, stems: 8, stemCol: woody, leafLen: 0.13, berry: true }),
    ],
    { bleed: mixRgb(shade, mid, 0.5) },
  );
}

/** Ground clutter: moss mats, needle litter, fallen leaves, twig scatter. */
export function litterAtlas() {
  const moss = hexToRgb(PALETTE.moss);
  const shade = hexToRgb(PALETTE.leafShade);
  const litter = hexToRgb(PALETTE.dirtDark);
  const dry = hexToRgb(PALETTE.grassDry);
  const woody = hexToRgb(PALETTE.barkDark);

  const blob = (ctx, w, h, seed, radius) => {
    ctx.beginPath();
    const N = 42;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = radius * (0.62 + 0.38 * fbm(Math.cos(a) * 2 + 4, Math.sin(a) * 2 + 4, { octaves: 3, period: 8, seed }));
      const x = w * 0.5 + Math.cos(a) * r;
      const y = h * 0.5 + Math.sin(a) * r * 0.82;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  return atlas(
    'nat.litterAtlas',
    256,
    [
      // 0 moss mat
      (ctx, w, h) => {
        const rnd = mulberry32(12001);
        ctx.fillStyle = rgbStr(mixRgb(moss, shade, 0.5), 1);
        blob(ctx, w, h, 3, w * 0.44);
        ctx.fill();
        for (let i = 0; i < 1400; i++) {
          const a = rnd() * Math.PI * 2;
          const r = Math.sqrt(rnd()) * w * 0.42;
          const x = w * 0.5 + Math.cos(a) * r;
          const y = h * 0.5 + Math.sin(a) * r * 0.82;
          const tone = clamp(rnd() * 1.2);
          ctx.strokeStyle = rgbStr(mixRgb(mixRgb(shade, moss, tone), [190, 200, 130], clamp(tone - 0.6) * 1.6), 1);
          ctx.lineWidth = w * 0.007;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (rnd() - 0.5) * w * 0.02, y - w * (0.008 + rnd() * 0.014));
          ctx.stroke();
        }
        shadeCore(ctx, w, h, 0.3);
      },
      // 1 needle litter with cones
      (ctx, w, h) => {
        const rnd = mulberry32(12503);
        ctx.fillStyle = rgbStr(mixRgb(litter, [96, 66, 40], 0.4), 1);
        blob(ctx, w, h, 17, w * 0.45);
        ctx.fill();
        ctx.lineCap = 'round';
        for (let i = 0; i < 900; i++) {
          const a = rnd() * Math.PI * 2;
          const r = Math.sqrt(rnd()) * w * 0.44;
          const x = w * 0.5 + Math.cos(a) * r;
          const y = h * 0.5 + Math.sin(a) * r * 0.82;
          const ang = rnd() * Math.PI;
          const l = w * (0.02 + rnd() * 0.045);
          const tone = clamp(rnd());
          ctx.strokeStyle = rgbStr(mixRgb([70, 50, 32], [148, 108, 62], tone), 1);
          ctx.lineWidth = w * 0.006;
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(ang) * l, y - Math.sin(ang) * l * 0.7);
          ctx.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l * 0.7);
          ctx.stroke();
        }
        for (let i = 0; i < 5; i++) {
          const x = w * (0.24 + rnd() * 0.52);
          const y = h * (0.26 + rnd() * 0.48);
          ctx.fillStyle = rgbStr([74, 52, 34], 1);
          ctx.beginPath();
          ctx.ellipse(x, y, w * 0.035, w * 0.02, rnd() * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = rgbStr([112, 84, 52], 1);
          for (let k = 0; k < 12; k++) {
            ctx.beginPath();
            ctx.ellipse(x + (rnd() - 0.5) * w * 0.05, y + (rnd() - 0.5) * w * 0.03, w * 0.009, w * 0.005, rnd() * 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      },
      // 2 fallen leaves
      (ctx, w, h) => {
        const rnd = mulberry32(13001);
        for (let i = 0; i < 90; i++) {
          const a = rnd() * Math.PI * 2;
          const r = Math.sqrt(rnd()) * w * 0.44;
          const x = w * 0.5 + Math.cos(a) * r;
          const y = h * 0.5 + Math.sin(a) * r * 0.8;
          const len = w * (0.07 + rnd() * 0.08);
          const tone = clamp(rnd());
          const col = mixRgb(mixRgb([72, 50, 30], [154, 112, 56], tone), dry, clamp(tone - 0.55) * 1.6);
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rnd() * Math.PI * 2);
          ctx.fillStyle = rgbStr(col, 1);
          if (rnd() < 0.5) palmatePath(ctx, len);
          else ovalPath(ctx, len, len * 0.36);
          ctx.fill();
          ctx.restore();
        }
      },
      // 3 twig and stick scatter
      (ctx, w, h) => {
        const rnd = mulberry32(13501);
        ctx.lineCap = 'round';
        for (let i = 0; i < 34; i++) {
          const x = w * (0.16 + rnd() * 0.68);
          const y = h * (0.16 + rnd() * 0.68);
          const ang = rnd() * Math.PI * 2;
          const l = w * (0.06 + rnd() * 0.22);
          ctx.strokeStyle = rgbStr(mixRgb(woody, [128, 110, 90], rnd() * 0.8), 1);
          ctx.lineWidth = w * (0.008 + rnd() * 0.012);
          ctx.beginPath();
          ctx.moveTo(x, y);
          const mx = x + Math.cos(ang) * l * 0.5;
          const my = y + Math.sin(ang) * l * 0.5;
          ctx.quadraticCurveTo(mx + (rnd() - 0.5) * l * 0.3, my + (rnd() - 0.5) * l * 0.3, x + Math.cos(ang) * l, y + Math.sin(ang) * l);
          ctx.stroke();
        }
      },
    ],
    { bleed: mixRgb(litter, shade, 0.4) },
  );
}

// ---------------------------------------------------------------------------
// Whole-tree billboards for the mid and far bands. Painted rather than
// rendered, so the far forest can be an order of magnitude denser than the
// geometry band for a handful of triangles.
// ---------------------------------------------------------------------------

/** Scatter short strokes inside an ellipse, shaded from the top left. */
function clump(ctx, rnd, cx, cy, rx, ry, n, dark, mid, light, strokeW, len) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd());
    const px = cx + Math.cos(a) * rx * r;
    const py = cy + Math.sin(a) * ry * r;
    // relative position drives the tone: top left of the clump catches the sun.
    // Squared, because a canopy is mostly shadow with highlights on the rim.
    const lit = clamp(0.5 - ((px - cx) / (rx + 0.001)) * 0.42 - ((py - cy) / (ry + 0.001)) * 0.5);
    const tone = clamp(lit * lit * (0.5 + rnd() * 0.95));
    const col = tone < 0.55 ? mixRgb(dark, mid, tone / 0.55) : mixRgb(mid, light, (tone - 0.55) / 0.45);
    ctx.strokeStyle = rgbStr(col, 1);
    ctx.lineWidth = strokeW * (0.7 + rnd() * 0.7);
    const ang = rnd() * Math.PI * 2;
    const l = len * (0.5 + rnd() * 0.9);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(ang) * l, py + Math.sin(ang) * l);
    ctx.stroke();
  }
}

function billboardConifer(ctx, w, h, opts) {
  const { seed, dark, mid, light, trunkCol, tiers, spread, crownStart, drape } = opts;
  const rnd = mulberry32(seed);
  const baseY = h * 0.985;
  const topY = h * 0.03;
  const treeH = baseY - topY;
  ctx.lineCap = 'round';

  // trunk, visible only below the crown
  ctx.strokeStyle = rgbStr(trunkCol, 1);
  for (let i = 0; i < 16; i++) {
    const t = i / 16;
    ctx.lineWidth = w * (0.03 * (1 - t) + 0.004);
    ctx.beginPath();
    ctx.moveTo(w * (0.5 + (rnd() - 0.5) * 0.004), baseY - treeH * t);
    ctx.lineTo(w * 0.5, baseY - treeH * (t + 1 / 16));
    ctx.stroke();
  }

  for (let k = 0; k < tiers; k++) {
    const u = k / (tiers - 1);
    const y = baseY - treeH * (crownStart + u * (1 - crownStart));
    const prof = Math.pow(1 - u, 0.82) * lerp(0.62, 1, smoothstep(0, 0.16, u));
    const rx = w * spread * prof * (0.82 + rnd() * 0.36);
    if (rx < w * 0.012) continue;
    const per = rx > w * 0.12 ? 6 : 4;
    for (let j = 0; j < per; j++) {
      const side = j % 2 === 0 ? -1 : 1;
      const off = side * rx * (0.14 + rnd() * 0.86);
      const cy = y + Math.abs(off) * drape + (rnd() - 0.5) * treeH * 0.014;
      const crx = rx * (0.4 + rnd() * 0.26);
      const cry = crx * (0.5 + rnd() * 0.26);
      clump(ctx, rnd, w * 0.5 + off, cy, crx, cry, 110, dark, mid, light, w * 0.008, w * 0.02);
    }
    // a denser core so the trunk does not show through the middle of the crown
    clump(ctx, rnd, w * 0.5, y, rx * 0.4, rx * 0.36, 90, dark, mixRgb(dark, mid, 0.45), mid, w * 0.009, w * 0.016);
  }
  // leader
  clump(ctx, rnd, w * 0.5, topY + treeH * 0.03, w * 0.028, treeH * 0.05, 60, dark, mid, light, w * 0.007, w * 0.016);
  shadeCore(ctx, w, h, 0.5, { from: 'bottom' });
}

function billboardBroadleaf(ctx, w, h, opts) {
  const { seed, dark, mid, light, trunkCol, clumps, spread, crownStart } = opts;
  const rnd = mulberry32(seed);
  const baseY = h * 0.99;
  const topY = h * 0.05;
  const treeH = baseY - topY;
  ctx.lineCap = 'round';

  ctx.strokeStyle = rgbStr(trunkCol, 1);
  const trunkTop = baseY - treeH * crownStart;
  ctx.lineWidth = w * 0.032;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, baseY);
  ctx.quadraticCurveTo(w * 0.51, (baseY + trunkTop) * 0.5, w * 0.5, trunkTop);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const a = -1.9 + (i / 4) * 3.8;
    ctx.lineWidth = w * 0.014;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, trunkTop + treeH * 0.03);
    ctx.lineTo(w * (0.5 + Math.sin(a) * spread * 0.7), trunkTop - treeH * 0.2 * Math.cos(a * 0.5));
    ctx.stroke();
  }

  const cyBase = trunkTop - treeH * (1 - crownStart) * 0.42;
  for (let i = 0; i < clumps; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.pow(rnd(), 0.62);
    const cx = w * 0.5 + Math.cos(a) * r * w * spread;
    const cy = cyBase + Math.sin(a) * r * treeH * (1 - crownStart) * 0.42;
    const crx = w * spread * (0.2 + rnd() * 0.18) * (1 - r * 0.25);
    clump(ctx, rnd, cx, cy, crx, crx * (0.72 + rnd() * 0.4), 130, dark, mid, light, w * 0.01, w * 0.024);
  }
  shadeCore(ctx, w, h, 0.45, { from: 'bottom' });
}

export function treeBillboardAtlas() {
  const needle = hexToRgb(PALETTE.pineNeedle);
  const sun = hexToRgb(PALETTE.leafSun);
  const shade = hexToRgb(PALETTE.leafShade);
  const leaf = hexToRgb(PALETTE.leaf);
  const woody = hexToRgb(PALETTE.barkDark);
  return atlas(
    'nat.treeBillboards',
    512,
    [
      // 0 douglas fir: tall, narrow, dark
      (c, w, h) =>
        billboardConifer(c, w, h, {
          seed: 31001,
          dark: mixRgb(shade, [0, 0, 0], 0.45),
          mid: mixRgb(needle, [0, 0, 0], 0.2),
          light: mixRgb(needle, sun, 0.45),
          trunkCol: mixRgb(woody, [0, 0, 0], 0.35),
          tiers: 18,
          spread: 0.42,
          crownStart: 0.3,
          drape: 0.12,
        }),
      // 1 cedar / hemlock: wider, softer, lighter
      (c, w, h) =>
        billboardConifer(c, w, h, {
          seed: 31511,
          dark: mixRgb(shade, [10, 24, 26], 0.4),
          mid: needle,
          light: mixRgb(needle, sun, 0.6),
          trunkCol: mixRgb(woody, [0, 0, 0], 0.2),
          tiers: 16,
          spread: 0.48,
          crownStart: 0.2,
          drape: 0.16,
        }),
      // 2 broadleaf
      (c, w, h) =>
        billboardBroadleaf(c, w, h, {
          seed: 32003,
          dark: mixRgb(shade, [0, 0, 0], 0.35),
          mid: mixRgb(leaf, [0, 0, 0], 0.12),
          light: mixRgb(leaf, sun, 0.6),
          trunkCol: mixRgb(woody, [104, 92, 78], 0.35),
          clumps: 18,
          spread: 0.42,
          crownStart: 0.42,
        }),
      // 3 dead snag with a broken top
      (c, w, h) => billboardSnag(c, w, h, mulberry32(32507), h * 0.99, h * 0.16),
    ],
    { bleed: mixRgb(shade, needle, 0.5) },
  );
}

function billboardSnag(ctx, w, h, rnd, baseY, topY) {
  // Kept dark: aerial perspective already lifts a distant snag toward the fog,
  // so a mid-grey painting comes out as a bright spike through the canopy.
  const grey = [64, 60, 54];
  const dark = [26, 24, 22];
  ctx.lineCap = 'butt';
  const n = 20;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const y0 = baseY - (baseY - topY) * t;
    const y1 = baseY - (baseY - topY) * (t + 1 / n);
    const wid = w * (0.05 * (1 - t) + 0.008);
    const g = ctx.createLinearGradient(w * 0.5 - wid, 0, w * 0.5 + wid, 0);
    g.addColorStop(0, rgbStr(mixRgb(dark, grey, 0.55), 1));
    g.addColorStop(0.32, rgbStr(grey, 1.05));
    g.addColorStop(1, rgbStr(dark, 1));
    ctx.fillStyle = g;
    ctx.fillRect(w * 0.5 - wid, y1, wid * 2, y0 - y1 + 1);
  }
  // broken, splintered crown
  ctx.strokeStyle = rgbStr(grey, 1);
  for (let i = 0; i < 5; i++) {
    ctx.lineWidth = w * (0.005 + rnd() * 0.006);
    ctx.beginPath();
    ctx.moveTo(w * (0.5 + (rnd() - 0.5) * 0.02), topY + h * 0.04);
    ctx.lineTo(w * (0.5 + (rnd() - 0.5) * 0.05), topY - h * rnd() * 0.06);
    ctx.stroke();
  }
  // a few bare limbs
  for (let i = 0; i < 7; i++) {
    const t = 0.2 + rnd() * 0.72;
    const y = baseY - (baseY - topY) * t;
    const side = i % 2 ? 1 : -1;
    const l = w * (0.06 + rnd() * 0.16) * (1 - t * 0.4);
    ctx.strokeStyle = rgbStr(mixRgb(dark, grey, 0.4 + rnd() * 0.5), 1);
    ctx.lineWidth = w * (0.006 + rnd() * 0.007);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, y);
    ctx.quadraticCurveTo(w * 0.5 + side * l * 0.6, y - h * 0.01, w * 0.5 + side * l, y - h * (0.02 + rnd() * 0.05));
    ctx.stroke();
  }
}

/** Coarse forest floor for the ground that continues past the terrain mesh. */
export function farGroundMaps() {
  return cached('nat.farGround', () => {
    const n = 128;
    const dark = mixRgb(hexToRgb(PALETTE.leafShade), hexToRgb(PALETTE.dirtDark), 0.45);
    const mid = mixRgb(hexToRgb(PALETTE.pineNeedle), hexToRgb(PALETTE.dirt), 0.4);
    const litter = hexToRgb(PALETTE.dirtDark);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const a = fbm(u * 5, v * 5, { octaves: 4, period: 5, seed: 411 });
        const b = fbm(u * 19, v * 19, { octaves: 3, period: 19, seed: 419 });
        let c = mixRgb(dark, mid, smoothstep(0.3, 0.75, a));
        c = mixRgb(c, litter, smoothstep(0.55, 0.9, b) * 0.4);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(n, n, () => 0.95, { repeat: 1 });
    return { map, rough };
  });
}

// ---------------------------------------------------------------------------
// Distant treeline silhouette strip
// ---------------------------------------------------------------------------

export function treelineTexture(variant = 0) {
  return cached('nat.treeline.' + variant, () => {
    const w = 1024;
    const h = 512;
    return canvasTexture(
      w,
      (ctx, cw, ch) => {
        ctx.clearRect(0, 0, cw, ch);
        const rnd = mulberry32(21001 + variant * 977);
        const near = mixRgb(hexToRgb(PALETTE.leafShade), hexToRgb(PALETTE.fogDeep), 0.28);
        const far = mixRgb(hexToRgb(PALETTE.fogDeep), hexToRgb(PALETTE.fogColor), 0.3);

        const spire = (cx, baseY, halfW, height, col) => {
          const tiers = 8 + Math.floor(rnd() * 7);
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(cx + (rnd() - 0.5) * halfW * 0.2, baseY - height);
          const wid = [];
          for (let i = 1; i <= tiers; i++) {
            const t = i / tiers;
            wid.push(halfW * Math.pow(t, 0.82) * (0.7 + rnd() * 0.6));
          }
          for (let i = 1; i <= tiers; i++) {
            const t = i / tiers;
            const y = baseY - height * (1 - t);
            ctx.lineTo(cx + wid[i - 1], y - (height / tiers) * 0.42);
            ctx.lineTo(cx + wid[i - 1] * 0.36, y);
          }
          ctx.lineTo(cx + halfW * 0.08, baseY);
          ctx.lineTo(cx - halfW * 0.08, baseY);
          for (let i = tiers; i >= 1; i--) {
            const t = i / tiers;
            const y = baseY - height * (1 - t);
            ctx.lineTo(cx - wid[i - 1] * 0.36, y);
            ctx.lineTo(cx - wid[i - 1], y - (height / tiers) * 0.42);
          }
          ctx.closePath();
          ctx.fill();
        };

        // understory mass: everything below the trunk line is solid so no sky
        // shows through the gaps between distant trunks
        const baseY = ch * 0.985;
        ctx.fillStyle = rgbStr(mixRgb(near, [0, 0, 0], 0.25), 1);
        ctx.beginPath();
        ctx.moveTo(0, ch);
        for (let x = 0; x <= cw; x += 16) {
          const n = fbm(x * 0.012, variant * 3.3, { octaves: 4, period: 16, seed: 55 });
          ctx.lineTo(x, ch - ch * (0.1 + n * 0.13));
        }
        ctx.lineTo(cw, ch);
        ctx.closePath();
        ctx.fill();

        // two depth layers of spires, the back one washed toward the fog
        for (const layer of [0, 1]) {
          const col = rgbStr(layer === 0 ? far : near, 1);
          const n = layer === 0 ? 26 : 21;
          for (let i = 0; i < n; i++) {
            const cx = ((i + rnd() * 0.85) / n) * cw;
            const height = ch * (layer === 0 ? 0.4 + rnd() * 0.3 : 0.55 + rnd() * 0.43);
            const halfW = height * (0.15 + rnd() * 0.12);
            spire(cx, baseY - (layer === 0 ? ch * 0.06 : 0), halfW, height, col);
          }
        }

        // a hint of warm rim on the sunlit tops
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        const g = ctx.createLinearGradient(0, 0, 0, ch);
        g.addColorStop(0, 'rgba(255,214,164,0.28)');
        g.addColorStop(0.45, 'rgba(255,214,164,0.05)');
        g.addColorStop(1, 'rgba(10,18,20,0.35)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();
        bleedBackground(ctx, cw, ch, near);
      },
      { srgb: true, repeat: 1, aniso: 2, height: h },
    );
  });
}

/** Soft ridge silhouette for the very back of the scene. */
export function ridgeTexture(variant = 0) {
  return cached('nat.ridge.' + variant, () => {
    const w = 1024;
    const h = 256;
    return canvasTexture(
      w,
      (ctx, cw, ch) => {
        ctx.clearRect(0, 0, cw, ch);
        const col = mixRgb(hexToRgb(PALETTE.fogDeep), hexToRgb(PALETTE.fogColor), 0.74);
        ctx.fillStyle = rgbStr(col, 1);
        ctx.beginPath();
        ctx.moveTo(0, ch);
        for (let x = 0; x <= cw; x += 8) {
          const u = x * 0.0045 + variant * 7.7;
          const n =
            fbm(u, 0.5, { octaves: 4, period: 32, seed: 91 }) * 0.7 +
            fbm(u * 3.4, 1.5, { octaves: 3, period: 32, seed: 97 }) * 0.3;
          // ragged tree-covered ridge, not a smooth hill
          const jag = fbm(u * 22, 2.5, { octaves: 2, period: 64, seed: 101 }) * 0.06;
          ctx.lineTo(x, ch - ch * clamp(0.18 + n * 0.72 + jag));
        }
        ctx.lineTo(cw, ch);
        ctx.closePath();
        ctx.fill();
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        const g = ctx.createLinearGradient(0, 0, 0, ch);
        g.addColorStop(0, 'rgba(255,226,192,0.3)');
        g.addColorStop(1, 'rgba(120,146,150,0.0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();
        bleedBackground(ctx, cw, ch, col);
      },
      { srgb: true, repeat: 1, aniso: 2, height: h },
    );
  });
}

// ---------------------------------------------------------------------------
// Rock
// ---------------------------------------------------------------------------

export function rockMaps(seed = 9) {
  return cached('nat.rock.' + seed, () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const strata = ridged(u * 4, v * 6, { octaves: 5, period: 6, seed });
      const chip = worley(u * 13, v * 13, 13, seed + 3);
      const grain = fbm(u * 48, v * 48, { octaves: 3, period: 48, seed: seed + 8 });
      return clamp(Math.pow(strata, 1.4) * 0.5 + smoothstep(0.0, 0.26, chip.f1) * 0.34 + grain * 0.18);
    });
    const normal = normalFromHeight(hf, n, n, 3.6, { repeat: 2 });
    const grey = [128, 126, 121];
    const pale = [176, 173, 165];
    const dark = [44, 44, 43];
    const lichenA = hexToRgb(0x93a06a);
    const lichenB = [188, 190, 168];
    const mossC = hexToRgb(PALETTE.moss);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const d = hf[y * n + x];
        let c = mixRgb(dark, grey, smoothstep(0.12, 0.72, d));
        c = mixRgb(c, pale, smoothstep(0.72, 0.98, d) * 0.8);
        const l1 = smoothstep(0.6, 0.88, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: seed + 20 }));
        const l2 = smoothstep(0.66, 0.9, fbm(u * 17, v * 17, { octaves: 4, period: 17, seed: seed + 26 }));
        c = mixRgb(c, lichenA, l1 * 0.55 * smoothstep(0.3, 0.8, d));
        c = mixRgb(c, lichenB, l2 * 0.4 * smoothstep(0.45, 0.9, d));
        const damp = smoothstep(0.55, 0.85, fbm(u * 3, v * 3, { octaves: 4, period: 3, seed: seed + 31 }));
        c = mixRgb(c, mossC, damp * 0.42 * (1 - smoothstep(0.55, 0.9, d)));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 2 },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.62 + (1 - hf[y * n + x]) * 0.3), { repeat: 2 });
    const ao = roughnessTexture(n, n, (x, y) => clamp(0.28 + hf[y * n + x] * 0.85), { repeat: 2 });
    return { map, normal, rough, ao };
  });
}

/** Fuzzy moss for hummocks and log tops. */
export function mossMaps() {
  return cached('nat.moss', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const clump = fbm(u * 7, v * 7, { octaves: 4, period: 7, seed: 301 });
      const fuzz = fbm(u * 40, v * 40, { octaves: 3, period: 40, seed: 307 });
      return clamp(clump * 0.6 + fuzz * 0.4);
    });
    const normal = normalFromHeight(hf, n, n, 3.0, { repeat: 3 });
    const deep = mixRgb(hexToRgb(PALETTE.leafShade), [0, 0, 0], 0.25);
    const mid = hexToRgb(PALETTE.moss);
    const bright = mixRgb(hexToRgb(PALETTE.leafSun), [210, 220, 150], 0.35);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const d = hf[y * n + x];
        let c = mixRgb(deep, mid, smoothstep(0.18, 0.66, d));
        c = mixRgb(c, bright, smoothstep(0.64, 0.95, d) * 0.85);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 3 },
    );
    const rough = roughnessTexture(n, n, () => 0.95, { repeat: 3 });
    const ao = roughnessTexture(n, n, (x, y) => clamp(0.25 + hf[y * n + x] * 0.85), { repeat: 3 });
    return { map, normal, rough, ao };
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
