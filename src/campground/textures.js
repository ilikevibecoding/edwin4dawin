import {
  cached,
  canvasTexture,
  clamp,
  cutoutTexture,
  fbm,
  heightField,
  lerp,
  mixRgb,
  mulberry32,
  normalFromHeight,
  pixelTexture,
  ridged,
  roughnessTexture,
  smoothstep,
  worley,
} from '../textures/core.js';

// ---------------------------------------------------------------------------
// The camp's surfaces. Sun-faded canvas, grey-weathered timber, galvanised
// sheet with rust running from the fixings, painted steel chipped back to
// metal, dry savanna granite, straw. Everything here is noise or drawn on a
// canvas; nothing is loaded.
//
// Colours are written as raw sRGB bytes (see `rgb`), not through THREE.Color,
// because the texture is flagged sRGB and the GPU decodes it once already.
// ---------------------------------------------------------------------------

export const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

const put = (out, c) => {
  out[0] = c[0];
  out[1] = c[1];
  out[2] = c[2];
};

/**
 * Canvas duck. The weave is fine enough to read as texture rather than as a
 * grid, and the albedo carries what a season of sun does to it: bleached where
 * it faces up, dust dragged down it in streaks, seams every 0.9 m with a stitch
 * line, and a few mildew spots low down where the ground splashes.
 */
export function canvasMaps(kind = 'khaki') {
  return cached('camp.canvas.' + kind, () => {
    const n = 256;
    const seed = kind === 'olive' ? 41 : kind === 'sand' ? 43 : 47;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const warp = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 112 + fbm(u * 9, v * 9, { octaves: 2, period: 9, seed }) * 1.8);
      const weft = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 112 + fbm(u * 9, v * 9, { octaves: 2, period: 9, seed: seed + 1 }) * 1.8);
      const weave = Math.abs(warp - weft) * 0.55 + Math.max(warp, weft) * 0.45;
      const slub = fbm(u * 18, v * 18, { octaves: 3, period: 18, seed: seed + 2 });
      // a seam: a raised double row of stitching with the cloth pulled tight either side
      const sv = (v * 1.0) % 1;
      const seam = smoothstep(0.02, 0.0, Math.abs(sv - 0.5)) * 0.5;
      return clamp(weave * 0.6 + slub * 0.3 + seam * 0.3 + 0.05);
    });
    const normal = normalFromHeight(hf, n, n, 0.9, { repeat: 1 });
    const palette = {
      // the pad is pale sand, so every canvas sits a stop darker than the dirt
      khaki: { base: 0x7a6742, faded: 0x96845e, shade: 0x4c3f2a },
      olive: { base: 0x565a3a, faded: 0x787c60, shade: 0x343723 },
      sand: { base: 0x8c7a58, faded: 0xa79676, shade: 0x5e5038 },
      green: { base: 0x44503a, faded: 0x6b775c, shade: 0x28301f },
    }[kind] || { base: 0x8f7a51, faded: 0xaa9970, shade: 0x5c4d33 };
    const base = rgb(palette.base);
    const faded = rgb(palette.faded);
    const shade = rgb(palette.shade);
    const dust = rgb(0x8f7a58);
    const mildew = rgb(0x4b4a3a);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        // large soft bleaching, then streaks stretched along v where dust ran
        const fade = fbm(u * 3, v * 3, { octaves: 4, period: 3, seed: seed + 5 });
        const streak = fbm(u * 24, v * 2.5, { octaves: 4, period: 24, seed: seed + 6 });
        let c = mixRgb(shade, base, clamp(0.35 + h * 0.75));
        c = mixRgb(c, faded, smoothstep(0.45, 0.8, fade) * 0.7);
        c = mixRgb(c, dust, smoothstep(0.55, 0.85, streak) * 0.35);
        const spot = fbm(u * 14, v * 14, { octaves: 3, period: 14, seed: seed + 7 });
        c = mixRgb(c, mildew, smoothstep(0.72, 0.9, spot) * 0.5);
        // the seam thread is lighter than the cloth
        const sv = v % 1;
        const seam = smoothstep(0.012, 0.0, Math.abs(sv - 0.5));
        c = mixRgb(c, faded, seam * 0.5);
        put(out, c);
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.82 + (1 - hf[y * n + x]) * 0.14), { repeat: 1 });
    return { map, normal, rough };
  });
}

/**
 * Sawn timber, weathered grey. Boards run along u, 150 mm each, with the
 * grain ridged along the board, knots where the worley cells fall, and the
 * gaps between boards dark. Left out in the sun the surface silvers and the
 * grain opens, so the colour is a grey-brown with the original ochre only in
 * the hollows.
 */
export function timberMaps(kind = 'grey') {
  return cached('camp.timber.' + kind, () => {
    const n = 256;
    const boards = 4;
    const seed = kind === 'grey' ? 61 : 67;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const bv = (v * boards) % 1;
      const board = Math.floor(v * boards);
      const grain = ridged(u * 3 + board * 7.3, v * 36, { octaves: 4, period: 3, seed: seed + board });
      const knot = worley(u * 5 + board * 3.1, v * 5, 5, seed + 11);
      const knotRing = smoothstep(0.02, 0.16, knot.f1) * (knot.id > 0.7 ? 1 : 0);
      const gap = smoothstep(0.0, 0.035, bv) * smoothstep(1.0, 0.965, bv);
      const check = fbm(u * 40, v * 6, { octaves: 3, period: 40, seed: seed + 3 });
      return clamp((grain * 0.55 + check * 0.25 + 0.2 - knotRing * 0.25) * gap);
    });
    const normal = normalFromHeight(hf, n, n, 1.6, { repeat: 1 });
    const pal =
      kind === 'grey'
        ? { light: 0x9a9284, mid: 0x6e665a, dark: 0x3b3630, warm: 0x7d6446 }
        : { light: 0xb08a5c, mid: 0x7f5f3c, dark: 0x3f2d1d, warm: 0x8f6a42 };
    const light = rgb(pal.light);
    const mid = rgb(pal.mid);
    const dark = rgb(pal.dark);
    const warm = rgb(pal.warm);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const board = Math.floor(v * boards);
        const tone = fbm(u * 2 + board * 13, v * 2, { octaves: 3, period: 2, seed: seed + 20 + board });
        let c = mixRgb(dark, mid, smoothstep(0.1, 0.6, h));
        c = mixRgb(c, light, smoothstep(0.55, 0.95, h) * 0.8);
        c = mixRgb(c, warm, (1 - smoothstep(0.2, 0.7, h)) * 0.4 * tone);
        // each board a slightly different grey
        c = mixRgb(c, tone > 0.5 ? light : dark, Math.abs(tone - 0.5) * 0.35);
        const bv = (v * boards) % 1;
        const gap = smoothstep(0.0, 0.03, bv) * smoothstep(1.0, 0.97, bv);
        c = mixRgb(dark, c, 0.3 + 0.7 * gap);
        put(out, c);
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.7 + (1 - hf[y * n + x]) * 0.28), { repeat: 1 });
    return { map, normal, rough };
  });
}

/**
 * Corrugated galvanised sheet. Thirteen corrugations a metre across u, zinc
 * spangle in the flats, and rust bleeding down v from where the roofing
 * screws go through the crowns.
 */
export function galvMaps() {
  return cached('camp.galv', () => {
    const n = 256;
    const cor = 13;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const wave = 0.5 + 0.5 * Math.cos(u * Math.PI * 2 * cor);
      const dent = fbm(u * 6, v * 6, { octaves: 3, period: 6, seed: 73 });
      return clamp(wave * 0.85 + dent * 0.15);
    });
    const normal = normalFromHeight(hf, n, n, 2.2, { repeat: 1 });
    const zinc = rgb(0x8d9297);
    const zincLight = rgb(0xb3b8bc);
    const zincDark = rgb(0x5f6469);
    const rust = rgb(0x7a3f1c);
    const rustDark = rgb(0x4a2712);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const sp = worley(u * 40, v * 40, 40, 79);
        let c = mixRgb(zincDark, zinc, smoothstep(0.1, 0.8, h));
        c = mixRgb(c, zincLight, smoothstep(0.75, 1.0, h) * 0.6);
        c = mixRgb(c, sp.id > 0.5 ? zincLight : zincDark, 0.12);
        // screw rows every 0.5 m down the sheet; rust runs down from each
        const row = (v * 2) % 1;
        const onCrown = smoothstep(0.85, 1.0, h);
        const belowScrew = smoothstep(0.0, 0.5, row);
        const bleed = fbm(u * cor * 2, v * 4, { octaves: 3, period: 26, seed: 83 });
        const r = onCrown * (1 - belowScrew) * smoothstep(0.3, 0.7, bleed) * 0.8 + smoothstep(0.02, 0.0, row) * onCrown * 0.9;
        const weather = smoothstep(0.62, 0.9, fbm(u * 3, v * 3, { octaves: 4, period: 3, seed: 89 }));
        c = mixRgb(c, rust, clamp(r + weather * 0.35));
        c = mixRgb(c, rustDark, weather * smoothstep(0.7, 1.0, bleed) * 0.5);
        put(out, c);
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const u = x / n;
        const v = y / n;
        const weather = smoothstep(0.62, 0.9, fbm(u * 3, v * 3, { octaves: 4, period: 3, seed: 89 }));
        // old zinc goes to a matte white-grey oxide; a fresh sheet's 0.4 lobe
        // throws the sun straight back at any overhead camera
        return clamp(0.64 + weather * 0.3 + (1 - hf[y * n + x]) * 0.06);
      },
      { repeat: 1 },
    );
    const metalness = roughnessTexture(
      n,
      n,
      (x, y) => {
        const u = x / n;
        const v = y / n;
        const weather = smoothstep(0.62, 0.9, fbm(u * 3, v * 3, { octaves: 4, period: 3, seed: 89 }));
        return clamp(0.7 - weather * 0.6);
      },
      { repeat: 1 },
    );
    return { map, normal, rough, metalness };
  });
}

/**
 * Painted steel: brushed on thick, then years of being knocked about. Chips
 * along the edges show dark primer and bare metal, and rust bleeds out of
 * every chip and runs down in v. The paint colour is a parameter; the damage
 * is shared.
 */
export function paintedSteelMaps(color, seed = 97) {
  return cached('camp.paint.' + color.toString(16) + '.' + seed, () => {
    const n = 256;
    const paint = rgb(color);
    const paintLight = mixRgb(paint, [255, 255, 255], 0.22);
    const paintDark = mixRgb(paint, [0, 0, 0], 0.3);
    const primer = rgb(0x4a4744);
    const bare = rgb(0x7c8085);
    const rust = rgb(0x6e3818);
    const chipField = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const w = worley(u * 22, v * 22, 22, seed);
      const scratch = ridged(u * 2, v * 60, { octaves: 2, period: 2, seed: seed + 3 });
      const chip = smoothstep(0.12, 0.0, w.f1) * (w.id > 0.72 ? 1 : 0);
      return clamp(chip + smoothstep(0.93, 1.0, scratch) * 0.6);
    });
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const brush = fbm(u * 3, v * 80, { octaves: 2, period: 3, seed: seed + 1 });
      const orange = fbm(u * 60, v * 60, { octaves: 2, period: 60, seed: seed + 2 });
      return clamp(0.5 + brush * 0.25 + orange * 0.2 - chipField[y * n + x] * 0.4);
    });
    const normal = normalFromHeight(hf, n, n, 0.7, { repeat: 1 });
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const chip = chipField[y * n + x];
        const fade = fbm(u * 2.5, v * 2.5, { octaves: 4, period: 2.5, seed: seed + 9 });
        let c = mixRgb(paintDark, paint, 0.5 + fade * 0.6);
        c = mixRgb(c, paintLight, smoothstep(0.6, 0.95, fade) * 0.5);
        // rust below each chip, dragged down v
        let run = 0;
        for (let k = 1; k <= 6; k++) {
          const yy = (y - k * 2 + n) % n;
          run = Math.max(run, chipField[yy * n + x] * (1 - k / 7));
        }
        const bleed = fbm(u * 30, v * 8, { octaves: 3, period: 30, seed: seed + 4 });
        c = mixRgb(c, rust, clamp(run * 0.7 * smoothstep(0.3, 0.7, bleed)));
        c = mixRgb(c, chip > 0.5 ? bare : primer, smoothstep(0.25, 0.6, chip));
        c = mixRgb(c, rust, smoothstep(0.7, 1.0, chip) * 0.35);
        put(out, c);
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const chip = chipField[y * n + x];
        return clamp(0.5 + (1 - hf[y * n + x]) * 0.25 + chip * 0.3);
      },
      { repeat: 1 },
    );
    return { map, normal, rough };
  });
}

/** Dry-country granite: warm grey, ochre-stained, exfoliating in plates. No moss. */
export function savannaRockMaps(seed = 113) {
  return cached('camp.rock.' + seed, () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const plates = worley(u * 5, v * 5, 5, seed);
      const strata = ridged(u * 3, v * 7, { octaves: 4, period: 3, seed: seed + 1 });
      const grain = fbm(u * 40, v * 40, { octaves: 3, period: 40, seed: seed + 2 });
      return clamp(smoothstep(0.0, 0.3, plates.f2 - plates.f1) * 0.45 + strata * 0.3 + grain * 0.25);
    });
    const normal = normalFromHeight(hf, n, n, 3.0, { repeat: 1 });
    const grey = rgb(0x7f786e);
    const pale = rgb(0xa9a094);
    const dark = rgb(0x3f3a34);
    const ochre = rgb(0x9a6a3c);
    const lichen = rgb(0xb9a562);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const d = hf[y * n + x];
        let c = mixRgb(dark, grey, smoothstep(0.1, 0.65, d));
        c = mixRgb(c, pale, smoothstep(0.65, 0.95, d) * 0.7);
        const stain = smoothstep(0.55, 0.85, fbm(u * 4, v * 4, { octaves: 4, period: 4, seed: seed + 8 }));
        c = mixRgb(c, ochre, stain * 0.5);
        const li = smoothstep(0.7, 0.9, fbm(u * 12, v * 12, { octaves: 3, period: 12, seed: seed + 9 }));
        c = mixRgb(c, lichen, li * 0.35 * smoothstep(0.4, 0.8, d));
        put(out, c);
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.7 + (1 - hf[y * n + x]) * 0.25), { repeat: 1 });
    return { map, normal, rough };
  });
}

/** Moulded polyethylene: tanks, jerry cans, coolers. Faint flow lines and scuffs. */
export function polyMaps(seed = 131) {
  return cached('camp.poly.' + seed, () => {
    const n = 128;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const flow = fbm(u * 2, v * 14, { octaves: 3, period: 2, seed });
      const scuff = ridged(u * 30, v * 3, { octaves: 2, period: 30, seed: seed + 2 });
      return clamp(0.5 + flow * 0.3 + smoothstep(0.9, 1.0, scuff) * 0.3);
    });
    const normal = normalFromHeight(hf, n, n, 0.5, { repeat: 1 });
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.35 + hf[y * n + x] * 0.4), { repeat: 1 });
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const dirt = smoothstep(0.55, 0.9, fbm(u * 5, v * 5, { octaves: 3, period: 5, seed: seed + 5 }));
        const g = Math.round(lerp(205, 128, dirt));
        out[0] = g;
        out[1] = Math.round(g * 0.96);
        out[2] = Math.round(g * 0.9);
      },
      { srgb: true, repeat: 1 },
    );
    return { map, normal, rough };
  });
}

/** Three-strand rope, 12 mm, for guy lines and lashings. Tiles along v. */
export function ropeMaps() {
  return cached('camp.rope', () => {
    const n = 64;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const twist = 0.5 + 0.5 * Math.sin((u * 3 + v * 4) * Math.PI * 2);
      const fibre = fbm(u * 12, v * 40, { octaves: 2, period: 12, seed: 151 });
      return clamp(twist * 0.75 + fibre * 0.25);
    });
    const normal = normalFromHeight(hf, n, n, 1.2, { repeat: [1, 20] });
    const light = rgb(0xc9b68c);
    const dark = rgb(0x6d5c3e);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => put(out, mixRgb(dark, light, hf[y * n + x])),
      { srgb: true, repeat: [1, 20] },
    );
    return { map, normal };
  });
}

/** Solar module: cells in a grid under glass, with the busbars drawn on. */
export function solarMaps() {
  return cached('camp.solar', () =>
    canvasTexture(
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#c9ccd2';
        ctx.fillRect(0, 0, w, h);
        const cols = 6;
        const rows = 10;
        const cw = w / cols;
        const ch = h / rows;
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const g = ctx.createLinearGradient(i * cw, j * ch, (i + 1) * cw, (j + 1) * ch);
            g.addColorStop(0, '#1a2a52');
            g.addColorStop(0.5, '#152140');
            g.addColorStop(1, '#22376a');
            ctx.fillStyle = g;
            ctx.fillRect(i * cw + 2, j * ch + 2, cw - 4, ch - 4);
            ctx.fillStyle = '#c9ccd2';
            ctx.fillRect(i * cw + 2, j * ch + ch * 0.5 - 0.6, cw - 4, 1.2);
            ctx.fillRect(i * cw + cw * 0.33 - 0.6, j * ch + 2, 1.2, ch - 4);
            ctx.fillRect(i * cw + cw * 0.66 - 0.6, j * ch + 2, 1.2, ch - 4);
          }
        }
      },
      { srgb: true, repeat: 1, height: 256 },
    ),
  );
}

/**
 * A sign, hand-painted on a board. `lines` are drawn centred; the board colour
 * and the lettering colour are parameters. Sun-faded and dust-streaked like
 * everything else.
 */
export function signMap(key, lines, { board = '#e8dcc0', ink = '#2a2622', accent = null, w = 512, h = 256, font = 'bold' } = {}) {
  return cached('camp.sign.' + key, () =>
    canvasTexture(
      w,
      (ctx) => {
        ctx.fillStyle = board;
        ctx.fillRect(0, 0, w, h);
        const rnd = mulberry32(key.length * 31);
        // paint wear: darker patches and lighter bleach before the lettering goes on
        for (let i = 0; i < 60; i++) {
          ctx.fillStyle = `rgba(${rnd() < 0.5 ? '60,50,40' : '255,250,235'},${0.03 + rnd() * 0.05})`;
          ctx.beginPath();
          ctx.ellipse(rnd() * w, rnd() * h, 20 + rnd() * 80, 8 + rnd() * 30, rnd() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        if (accent) {
          ctx.fillStyle = accent;
          ctx.fillRect(0, 0, w, h * 0.09);
          ctx.fillRect(0, h * 0.91, w, h * 0.09);
        }
        const pad = h * 0.14;
        const lineH = (h - pad * 2) / lines.length;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = ink;
        lines.forEach((ln, i) => {
          const size = Math.min(lineH * 0.72, (w * 0.86) / Math.max(4, ln.length * 0.62));
          ctx.font = `${font} ${size}px Georgia, "Times New Roman", serif`;
          ctx.fillText(ln, w / 2, pad + lineH * (i + 0.5));
        });
        // dust down from the top edge and chips at the corners
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(120,95,60,0.28)');
        g.addColorStop(0.4, 'rgba(120,95,60,0.0)');
        g.addColorStop(1, 'rgba(90,70,45,0.22)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(70,60,50,0.5)';
        for (let i = 0; i < 18; i++) {
          const x = rnd() < 0.5 ? rnd() * w * 0.08 : w - rnd() * w * 0.08;
          ctx.beginPath();
          ctx.ellipse(x, rnd() * h, 3 + rnd() * 5, 2 + rnd() * 4, rnd() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      { srgb: true, repeat: 1, height: h },
    ),
  );
}

/** A hand-drawn park map for the notice board: river, roads, camp, contour lines. */
export function mapBoardMap() {
  return cached('camp.mapboard', () =>
    canvasTexture(
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#e6dcc4';
        ctx.fillRect(0, 0, w, h);
        const rnd = mulberry32(5150);
        ctx.strokeStyle = 'rgba(120,110,80,0.35)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 14; i++) {
          ctx.beginPath();
          let x = -10;
          let y = 40 + i * 24 + rnd() * 10;
          ctx.moveTo(x, y);
          while (x < w + 10) {
            x += 18;
            y += (rnd() - 0.5) * 16;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.strokeStyle = '#3f6f9a';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(30, h * 0.8);
        ctx.bezierCurveTo(w * 0.3, h * 0.55, w * 0.55, h * 0.9, w * 0.95, h * 0.62);
        ctx.stroke();
        ctx.strokeStyle = '#8a5a34';
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(0, h * 0.35);
        ctx.bezierCurveTo(w * 0.35, h * 0.3, w * 0.6, h * 0.5, w, h * 0.4);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#b03a2e';
        ctx.beginPath();
        ctx.arc(w * 0.47, h * 0.42, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a2622';
        ctx.font = 'bold 26px Georgia, serif';
        ctx.textAlign = 'left';
        ctx.fillText('YOU ARE HERE', w * 0.5, h * 0.4);
        ctx.font = 'bold 34px Georgia, serif';
        ctx.fillText('OLARE RIVER CONSERVANCY', 24, 34);
        ctx.font = '20px Georgia, serif';
        ctx.fillText('Game drive circuit  ·  Ranger post  ·  Airstrip 14 km', 24, h - 22);
        ctx.font = 'italic 18px Georgia, serif';
        ctx.fillStyle = '#3f6f9a';
        ctx.fillText('Olare R.', w * 0.62, h * 0.86);
        // pinned notices
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i === 1 ? '#f2eee0' : '#f7f2e2';
          const px = w * 0.62 + i * 46;
          const py = h * 0.08 + i * 12;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate((rnd() - 0.5) * 0.2);
          ctx.fillRect(0, 0, 90, 70);
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          for (let k = 0; k < 6; k++) ctx.fillRect(8, 12 + k * 9, 50 + rnd() * 25, 2);
          ctx.fillStyle = '#c33';
          ctx.beginPath();
          ctx.arc(45, 5, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(120,95,60,0.2)');
        g.addColorStop(0.5, 'rgba(120,95,60,0.0)');
        g.addColorStop(1, 'rgba(90,70,45,0.15)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      },
      { srgb: true, repeat: 1, height: 384 },
    ),
  );
}

/** Dry savanna grass tuft, a cutout card. Straw with a few green blades at the base. */
export function dryGrassCutout() {
  return cached('camp.drygrass', () =>
    cutoutTexture(
      256,
      (ctx, w, h) => {
        const rnd = mulberry32(7171);
        ctx.lineCap = 'round';
        // dry-season grass is paler than the dirt it grows in: straw and gold,
        // with a few green-grey blades low down where the tuft holds water
        for (let i = 0; i < 120; i++) {
          const x0 = w * 0.5 + (rnd() - 0.5) * w * 0.4;
          const lean = (rnd() - 0.5) * 0.9;
          const len = h * (0.45 + rnd() * 0.52);
          const t = rnd();
          const col = t < 0.15 ? [150, 150, 96] : t < 0.6 ? [206, 180, 112] : [228, 208, 150];
          const shade = 0.78 + rnd() * 0.34;
          ctx.strokeStyle = `rgb(${Math.min(255, col[0] * shade) | 0},${Math.min(255, col[1] * shade) | 0},${Math.min(255, col[2] * shade) | 0})`;
          ctx.lineWidth = 1.2 + rnd() * 1.8;
          ctx.beginPath();
          ctx.moveTo(x0, h);
          const cx = x0 + lean * len * 0.5;
          const cy = h - len * 0.6;
          ctx.quadraticCurveTo(cx, cy, x0 + lean * len, h - len);
          ctx.stroke();
          if (rnd() < 0.35) {
            ctx.fillStyle = `rgb(${Math.min(255, 214 * shade) | 0},${Math.min(255, 186 * shade) | 0},${Math.min(255, 120 * shade) | 0})`;
            ctx.beginPath();
            ctx.ellipse(x0 + lean * len, h - len, 2.2, 5, lean, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      },
      { repeat: 1, aniso: 4 },
    ),
  );
}

/** Charcoal, ash and scorched stone for the fire pit floor. */
export function ashMaps() {
  return cached('camp.ash', () => {
    const n = 128;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const lumps = worley(u * 9, v * 9, 9, 171);
      return clamp(smoothstep(0.35, 0.0, lumps.f1) * 0.7 + fbm(u * 20, v * 20, { octaves: 3, period: 20, seed: 173 }) * 0.3);
    });
    const normal = normalFromHeight(hf, n, n, 1.8, { repeat: 1 });
    const ash = rgb(0x9a958b);
    const char = rgb(0x1a1815);
    const ember = rgb(0x3a2a22);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const d = hf[y * n + x];
        const r = Math.hypot(u - 0.5, v - 0.5) * 2;
        let c = mixRgb(char, ash, smoothstep(0.55, 0.2, d) * (1 - smoothstep(0.5, 1.0, r)) * 0.9);
        c = mixRgb(c, ember, smoothstep(0.6, 0.9, d) * 0.5);
        put(out, c);
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(n, n, () => 0.95, { repeat: 1 });
    return { map, normal, rough };
  });
}

/** Soft radial sprite with a noisy edge; the base of the flame, ember and smoke particles. */
export function puffSprite(kind = 'smoke') {
  return cached('camp.puff.' + kind, () =>
    canvasTexture(
      64,
      (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        if (kind === 'flame') {
          g.addColorStop(0, 'rgba(255,255,255,1)');
          g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
          g.addColorStop(0.6, 'rgba(255,255,255,0.3)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
        } else {
          g.addColorStop(0, 'rgba(255,255,255,0.9)');
          g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
        }
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        if (kind === 'smoke') {
          // break the edge so a cloud of these does not read as stacked discs
          const rnd = mulberry32(191);
          ctx.globalCompositeOperation = 'destination-out';
          for (let i = 0; i < 26; i++) {
            const a = rnd() * Math.PI * 2;
            const r = w * (0.3 + rnd() * 0.22);
            ctx.fillStyle = `rgba(0,0,0,${0.25 + rnd() * 0.4})`;
            ctx.beginPath();
            ctx.arc(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, 5 + rnd() * 9, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      },
      { srgb: false, repeat: 1 },
    ),
  );
}
