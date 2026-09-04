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
      // wrinkles: soft creases at the 10-30 cm scale where the cloth was folded
      // and never pulled quite flat, so the surface undulates rather than
      // reading as one sheet of fine weave
      const crease = ridged(u * 4 + 3.1, v * 4, { octaves: 3, period: 4, seed: seed + 3 });
      return clamp(weave * 0.45 + slub * 0.22 + seam * 0.3 + crease * 0.3 + 0.03);
    });
    const normal = normalFromHeight(hf, n, n, 1.2, { repeat: 1 });
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
        // the arrises are rounded and rubbed pale where hands and crates go over them
        const edge = (1 - smoothstep(0.03, 0.1, bv) * smoothstep(0.97, 0.9, bv)) * gap;
        const rub = fbm(u * 9 + board * 5, v * 3, { octaves: 2, period: 9, seed: seed + 31 + board });
        c = mixRgb(c, light, edge * (0.25 + 0.45 * rub));
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
export function signMap(key, lines, { board = '#e8dcc0', ink = '#2a2622', accent = null, w = 512, h = 256, font = 'bold', weights = null } = {}) {
  return cached('camp.sign.' + key, () =>
    canvasTexture(
      w,
      (ctx) => {
        // Drawn at 2x and left at 2x: the canvas is the texture, and a board
        // read from fifteen metres in a 512-pixel frame needs every texel it
        // can get before the mip chain averages the strokes into the board.
        const s = w / 512;
        ctx.fillStyle = board;
        ctx.fillRect(0, 0, w, h);
        const rnd = mulberry32(key.length * 31);
        // paint wear: darker patches and lighter bleach before the lettering goes on
        for (let i = 0; i < 60; i++) {
          ctx.fillStyle = `rgba(${rnd() < 0.5 ? '60,50,40' : '255,250,235'},${0.03 + rnd() * 0.05})`;
          ctx.beginPath();
          ctx.ellipse(rnd() * w, rnd() * h, (20 + rnd() * 80) * s, (8 + rnd() * 30) * s, rnd() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        if (accent) {
          ctx.fillStyle = accent;
          ctx.fillRect(0, 0, w, h * 0.09);
          ctx.fillRect(0, h * 0.91, w, h * 0.09);
        }
        // a 3 mm painted border inside the accent bands
        ctx.strokeStyle = ink;
        ctx.lineWidth = 3 * s;
        ctx.strokeRect(w * 0.025, h * (accent ? 0.11 : 0.04), w * 0.95, h * (accent ? 0.78 : 0.92));
        const pad = h * 0.14;
        const wts = weights || lines.map(() => 1);
        const total = wts.reduce((a, b) => a + b, 0);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = ink;
        let y = pad;
        lines.forEach((ln, i) => {
          const lineH = ((h - pad * 2) * wts[i]) / total;
          const size = Math.min(lineH * 0.78, (w * 0.86) / Math.max(4, ln.length * 0.6));
          ctx.font = `${font} ${size}px Georgia, "Times New Roman", serif`;
          ctx.fillText(ln, w / 2, y + lineH * 0.5);
          y += lineH;
        });
        // dust down from the top edge and chips at the corners, kept off the lettering
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(120,95,60,0.2)');
        g.addColorStop(0.3, 'rgba(120,95,60,0.0)');
        g.addColorStop(1, 'rgba(90,70,45,0.14)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(70,60,50,0.5)';
        for (let i = 0; i < 18; i++) {
          const x = rnd() < 0.5 ? rnd() * w * 0.08 : w - rnd() * w * 0.08;
          ctx.beginPath();
          ctx.ellipse(x, rnd() * h, (3 + rnd() * 5) * s, (2 + rnd() * 4) * s, rnd() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      { srgb: true, repeat: 1, height: h, aniso: 8 },
    ),
  );
}

/**
 * The face of a slatted timber crate, one crate face per tile: three planks
 * with the gaps between them, a nailed batten at each end, sun-bleached in the
 * middle and worn back to bare wood along the edges, and a stencilled mark.
 * `kind` picks the stencil; the wood is the same.
 */
export function crateMaps(kind = 'stores') {
  return cached('camp.crate.' + kind, () => {
    const n = 256;
    const seed = 211;
    const planks = 3;
    const plankOf = (v) => Math.floor(clamp(v, 0, 0.999) * planks);
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const pv = (v * planks) % 1;
      const plank = plankOf(v);
      const gap = smoothstep(0.0, 0.05, pv) * smoothstep(1.0, 0.95, pv);
      const grain = ridged(u * 2.5 + plank * 5.7, v * 30, { octaves: 4, period: 2.5, seed: seed + plank });
      // the end battens stand proud of the planks
      const batten = smoothstep(0.045, 0.06, u) * smoothstep(0.955, 0.94, u) < 0.5 ? 1 : 0;
      return clamp((grain * 0.5 + 0.35) * gap + batten * 0.25);
    });
    const normal = normalFromHeight(hf, n, n, 1.6, { repeat: 1 });
    const light = rgb(0xc59b6a);
    const mid = rgb(0x8d6740);
    const dark = rgb(0x4a3421);
    const bleach = rgb(0xd6c19a);
    const bare = rgb(0xa8895f);
    const stencil = rgb(0x2b2a2a);
    const stencilRnd = mulberry32(seed + kind.length);
    // the stencil: a rectangle of letters standing in for the paint mask;
    // drawn as blocks rather than glyphs because at 256 px a word is a texture
    const marks = [];
    const rows = kind === 'fragile' ? 1 : 2;
    for (let r = 0; r < rows; r++) {
      const nChars = 5 + Math.floor(stencilRnd() * 4);
      for (let c = 0; c < nChars; c++) marks.push([0.2 + (c / nChars) * 0.6, 0.38 + r * 0.16, 0.6 / nChars * 0.62, 0.09, stencilRnd()]);
    }
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const plank = plankOf(v);
        const tone = fbm(u * 2 + plank * 11, v * 2, { octaves: 3, period: 2, seed: seed + 20 + plank });
        let c = mixRgb(dark, mid, smoothstep(0.15, 0.6, h));
        c = mixRgb(c, light, smoothstep(0.55, 0.9, h) * 0.8);
        c = mixRgb(c, tone > 0.5 ? light : dark, Math.abs(tone - 0.5) * 0.3);
        // bleached where the sun hits, bare and darker where hands and the
        // truck bed have worn the edges
        const centre = smoothstep(0.55, 0.05, Math.hypot((u - 0.5) * 1.3, v - 0.5));
        c = mixRgb(c, bleach, centre * 0.28 * (0.6 + tone * 0.6));
        const edge = 1 - smoothstep(0.0, 0.09, Math.min(u, 1 - u, v, 1 - v));
        const wearN = fbm(u * 9, v * 9, { octaves: 3, period: 9, seed: seed + 31 });
        c = mixRgb(c, bare, edge * smoothstep(0.35, 0.7, wearN) * 0.7);
        c = mixRgb(c, dark, edge * smoothstep(0.6, 0.9, wearN) * 0.4);
        // gaps between the planks are dark
        const pv = (v * planks) % 1;
        const gap = smoothstep(0.0, 0.04, pv) * smoothstep(1.0, 0.96, pv);
        c = mixRgb(dark, c, 0.2 + 0.8 * gap);
        // nail heads on the battens
        const bx = u < 0.5 ? u : 1 - u;
        if (bx > 0.02 && bx < 0.055) {
          const ny = (v * planks * 2) % 1;
          if (Math.abs(ny - 0.5) < 0.12 && Math.abs(bx - 0.0375) < 0.011) c = mixRgb(c, rgb(0x3a3230), 0.8);
        }
        // stencil, broken by the grain so it reads as paint on wood
        for (const [mx, my, mw, mh, drop] of marks) {
          if (drop < 0.15) continue;
          if (Math.abs(u - mx - mw * 0.5) < mw * 0.5 && Math.abs(v - my) < mh * 0.5) {
            const cover = smoothstep(0.25, 0.55, fbm(u * 30, v * 30, { octaves: 2, period: 30, seed: seed + 40 }));
            c = mixRgb(c, stencil, 0.75 * cover);
          }
        }
        put(out, c);
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.68 + (1 - hf[y * n + x]) * 0.28), { repeat: 1 });
    return { map, normal, rough };
  });
}

/**
 * The cloth of a director's chair: a heavy cotton duck in a faded stripe,
 * with the weave showing through and the colour gone where the sun sits on it.
 */
export function chairClothMaps() {
  return cached('camp.chaircloth', () => {
    const n = 128;
    const seed = 223;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const warp = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 48 + fbm(u * 6, v * 6, { octaves: 2, period: 6, seed }) * 1.5);
      const weft = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 48 + fbm(u * 6, v * 6, { octaves: 2, period: 6, seed: seed + 1 }) * 1.5);
      const weave = Math.abs(warp - weft) * 0.5 + Math.max(warp, weft) * 0.5;
      const sag = fbm(u * 3, v * 3, { octaves: 3, period: 3, seed: seed + 2 });
      return clamp(weave * 0.55 + sag * 0.4 + 0.03);
    });
    const normal = normalFromHeight(hf, n, n, 1.0, { repeat: 1 });
    const a = rgb(0x5a6a4a);
    const b = rgb(0xb8a67e);
    const fadeA = rgb(0x8a9478);
    const fadeB = rgb(0xd2c6a6);
    const grime = rgb(0x4a4636);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const stripe = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 4);
        const isA = stripe > 0.5;
        const fade = fbm(u * 2, v * 2, { octaves: 3, period: 2, seed: seed + 5 });
        let c = isA ? mixRgb(a, fadeA, smoothstep(0.35, 0.8, fade)) : mixRgb(b, fadeB, smoothstep(0.35, 0.8, fade));
        c = mixRgb(mixRgb(c, [0, 0, 0], 0.25), c, clamp(0.3 + h * 0.8));
        const dirt = smoothstep(0.6, 0.9, fbm(u * 7, v * 7, { octaves: 3, period: 7, seed: seed + 6 }));
        c = mixRgb(c, grime, dirt * 0.3);
        put(out, c);
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.85 + (1 - hf[y * n + x]) * 0.12), { repeat: 1 });
    return { map, normal, rough };
  });
}

/**
 * A charred log: black crazed char over the bark with the wood glowing in the
 * cracks. `map` is the albedo, `glow` the emissive mask — brightest at the
 * cracks and the ends, nothing on the unburnt outer bark.
 */
export function charLogMaps() {
  return cached('camp.charlog', () => {
    const n = 128;
    const seed = 229;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const cells = worley(u * 10, v * 4, 10, seed);
      const crack = smoothstep(0.08, 0.0, cells.f2 - cells.f1);
      const bark = ridged(u * 6, v * 2, { octaves: 3, period: 6, seed: seed + 1 });
      return clamp(0.6 - crack * 0.5 + bark * 0.25);
    });
    const normal = normalFromHeight(hf, n, n, 1.6, { repeat: 1 });
    const char = rgb(0x111010);
    const charLight = rgb(0x2c2826);
    const ashGrey = rgb(0x6f6a62);
    const ember = rgb(0xff6a1a);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        let c = mixRgb(char, charLight, smoothstep(0.4, 0.9, h));
        // a dusting of white ash on the top of the blocks
        const ashN = fbm(u * 8, v * 8, { octaves: 3, period: 8, seed: seed + 3 });
        c = mixRgb(c, ashGrey, smoothstep(0.6, 0.95, ashN) * smoothstep(0.5, 0.85, h) * 0.6);
        put(out, c);
      },
      { srgb: true, repeat: 1 },
    );
    const glow = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        // cracks glow; the underside (v near 0.5 in pole UV is the far side) glows more
        const crack = smoothstep(0.45, 0.15, h);
        const hot = fbm(u * 3, v * 3, { octaves: 3, period: 3, seed: seed + 7 });
        const k = crack * (0.35 + 0.65 * smoothstep(0.35, 0.75, hot));
        put(out, mixRgb([0, 0, 0], ember, clamp(k)));
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(n, n, () => 0.95, { repeat: 1 });
    return { map, normal, rough, glow };
  });
}

/** Emissive mask for the ash bed: coals glowing under the flames, darkest at the rim. */
export function coalsGlowMap() {
  return cached('camp.coals', () => {
    const n = 128;
    return pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const r = Math.hypot(u - 0.5, v - 0.5) * 2;
        const lumps = worley(u * 12, v * 12, 12, 233);
        const coal = smoothstep(0.3, 0.05, lumps.f1) * (lumps.id > 0.35 ? 1 : 0.2);
        const k = coal * (1 - smoothstep(0.25, 0.75, r)) * (0.5 + 0.5 * fbm(u * 5, v * 5, { octaves: 2, period: 5, seed: 239 }));
        put(out, mixRgb([0, 0, 0], rgb(0xff5a14), clamp(k * 1.3)));
      },
      { srgb: true, repeat: 1 },
    );
  });
}

/**
 * Flame sprite atlas: four tongues on a 2 x 2 grid, each a teardrop with a
 * noise-torn edge. RGB carries heat (white core, dark edge) and A the cutout,
 * so the shader can ramp colour by heat rather than by distance from centre —
 * that is what separates a flame from a glowing disc.
 */
export function flameAtlas() {
  return cached('camp.flameatlas', () => {
    const n = 256;
    const half = n / 2;
    return pixelTexture(
      n,
      n,
      (x, y, out) => {
        const fx = x % half;
        const fy = y % half;
        const frame = Math.floor(x / half) + Math.floor(y / half) * 2;
        // frame space: x in -1..1, y in -1 (bottom) .. 1 (top). The texture is
        // uploaded with flipY, so row 0 of the data is the top of the image.
        const px = (fx / half) * 2 - 1;
        const py = 1 - (fy / half) * 2;
        // silhouette: a round base that tapers to a point, leaning with the frame
        const lean = (frame - 1.5) * 0.12;
        const cx = px - lean * (py + 1) * 0.5;
        const t = (py + 0.55) / 1.4; // 0 at the base circle centre, 1 at the tip
        let w;
        if (t < 0) w = Math.sqrt(Math.max(0, 0.42 * 0.42 - (py + 0.55) * (py + 0.55)));
        else w = 0.42 * Math.pow(Math.max(0, 1 - t), 0.75);
        const edgeN = fbm(px * 2.5 + frame * 7.1, py * 2.5, { octaves: 3, period: 5, seed: 241 + frame });
        const dist = Math.abs(cx) - w * (0.8 + 0.5 * edgeN);
        const inner = fbm(px * 4 + frame * 3.3, py * 3, { octaves: 3, period: 8, seed: 251 + frame });
        // torn holes near the tip, where a flame breaks up
        const tear = smoothstep(0.62, 0.9, inner) * smoothstep(0.1, 0.9, t);
        const alpha = clamp(smoothstep(0.06, -0.08, dist) * (1 - tear * 0.9) * smoothstep(-1.0, -0.85, py));
        // heat: hottest low in the core, cooling toward the edge and the tip
        const core = clamp(1 - Math.abs(cx) / Math.max(0.05, w * 0.9)) * (1 - smoothstep(-0.2, 0.9, py) * 0.7);
        const heat = clamp(core * 0.85 + 0.15 - inner * 0.25);
        const g = Math.round(heat * 255);
        out[0] = g;
        out[1] = g;
        out[2] = g;
        out[3] = Math.round(alpha * 255);
      },
      { srgb: false, repeat: 1, mips: true },
    );
  });
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
