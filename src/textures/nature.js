import { PALETTE } from '../palette.js';
import {
  cached,
  canvasTexture,
  clamp,
  cutoutTexture,
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
// cutout goes through `cutoutTexture`, which dilates the colour past the alpha
// edge — without that, mipmapping averages the transparent side of the edge into
// the visible side and distant foliage grows a black halo.
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

/**
 * Darken the interior of whatever has already been drawn, silhouette intact.
 * Kept light: the crown-occlusion attribute baked onto the geometry does the
 * same job in a way that responds to light direction, and doubling the two up
 * is what dropped leaf albedo to a tenth of a real leaf's.
 */
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
    cutoutTexture(
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
    // weathered rather than bleached: a light silver dead trunk lit by an
    // overcast sky reads as a bright spike right through the canopy
    const silver = [104, 99, 91];
    const grey = [68, 64, 58];
    const shadow = [26, 24, 21];
    const rust = [74, 55, 39];
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

/**
 * A conifer branch: a woody axis carrying several complete sprays.
 *
 * The tile used to hold exactly one spray filling the cell, and the geometry
 * draws it on cards up to six metres long — so a painted needle came out at a
 * metre and a quarter and the near canopy read as a hedge of tropical fronds.
 * The fix is a scale one: subdividing the tile into `sprays` complete sprays
 * cuts the apparent feature size by that factor at no cost in texels or
 * triangles, and it is the sub-spray, not the needle, that the eye measures a
 * conifer by. Card length comes down separately in `buildConifer`.
 */
function needleTile(ctx, w, h, opts) {
  const { seed, base, tip, shade, stem, branchlets, needleLen, needleW, sweep, sag, density, sprays = 5 } = opts;
  const rnd = mulberry32(seed);
  const midY = h * 0.5;
  ctx.lineCap = 'round';

  const axis = (t) => ({
    x: w * (0.03 + t * 0.94),
    y: midY + Math.sin(t * Math.PI) * h * sag,
  });

  ctx.strokeStyle = rgbStr(stem, 1);
  for (let i = 0; i < 24; i++) {
    const a = axis(i / 24);
    const b = axis((i + 1) / 24);
    ctx.lineWidth = w * (0.013 * (1 - i / 24) + 0.0022);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // one spray, every dimension derived from its own length
  const drawSpray = (ox, oy, len, side, tilt) => {
    const rachis = (s) => [
      ox + Math.cos(tilt) * len * s,
      oy + Math.sin(tilt) * len * s + Math.sin(s * Math.PI) * len * 0.07 * side,
    ];

    // Shadowed depth between the needles. Without it the needles average against
    // *transparent* gaps as the mips come down, and a spray that should mass up
    // and darken with distance instead washes out to one pale mint blob — which
    // is what made the near crowns read as a hedge even once the needles were the
    // right size. Its alpha stays under the material's alphaTest so it only tints
    // the gaps it shares with real needles instead of adding silhouette of its
    // own, and it is one fill so overlaps do not accumulate past that.
    ctx.save();
    ctx.globalAlpha = 0.19;
    ctx.fillStyle = rgbStr(mixRgb(shade, base, 0.24), 0.62);
    const nrm = tilt + Math.PI * 0.5;
    ctx.beginPath();
    for (let sideSign = 0; sideSign < 2; sideSign++) {
      for (let i = 0; i <= 8; i++) {
        const s = sideSign ? 1 - i / 8 : i / 8;
        const [mx, my] = rachis(s);
        const hw = len * 0.3 * (Math.pow(1 - s, 0.55) * 0.9 + 0.12) * (sideSign ? -1 : 1);
        const px = mx + Math.cos(nrm) * hw;
        const py = my + Math.sin(nrm) * hw;
        if (sideSign === 0 && i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = rgbStr(stem, 1.1);
    ctx.lineWidth = Math.max(0.7, len * 0.02);
    ctx.beginPath();
    ctx.moveTo(...rachis(0));
    for (let i = 1; i <= 8; i++) ctx.lineTo(...rachis(i / 8));
    ctx.stroke();

    const nb = Math.max(5, Math.round(branchlets / sprays));
    for (let bi = 0; bi < nb; bi++) {
      const t = 0.06 + (bi / nb) * 0.92;
      const bs = bi % 2 === 0 ? -1 : 1;
      const [rx, ry] = rachis(t);
      const env = Math.pow(1 - t, 0.55) * 0.88 + 0.16;
      const blen = len * 0.44 * env * (0.72 + rnd() * 0.5);
      const ang = tilt + bs * (sweep + rnd() * 0.22);
      const ex = rx + Math.cos(ang) * blen * 0.42;
      const ey = ry + Math.sin(ang) * blen;
      // branchlets bow away from the rachis: straight ones stack up as a visible
      // set of parallel lines across the tile
      const bow = (0.12 + rnd() * 0.2) * blen * bs;
      const cx = (rx + ex) * 0.5 + bow * 0.5;
      const cy = (ry + ey) * 0.5 - bow * 0.25;
      const at = (s) => {
        const k = 1 - s;
        return [k * k * rx + 2 * k * s * cx + s * s * ex, k * k * ry + 2 * k * s * cy + s * s * ey];
      };
      ctx.strokeStyle = rgbStr(stem, 1.15);
      ctx.lineWidth = Math.max(0.55, len * 0.014 * env);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
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
          const tone = clamp(rnd() * 0.55 + s * 0.35 + (dir === bs ? 0.18 : 0));
          const col = tone < 0.28 ? mixRgb(shade, base, tone / 0.28) : mixRgb(base, tip, (tone - 0.28) / 0.72);
          ctx.strokeStyle = rgbStr(col, 0.88 + tone * 0.24);
          ctx.lineWidth = Math.max(1.1, w * needleW * (0.75 + rnd() * 0.6) * (len / (h * 0.42)));
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
  };

  for (let s = 0; s < sprays; s++) {
    const t = 0.05 + (s / sprays) * 0.82;
    const side = s % 2 === 0 ? -1 : 1;
    const { x, y } = axis(t);
    const env = Math.pow(1 - t, 0.45) * 0.8 + 0.24;
    drawSpray(x, y, h * 0.42 * env * (0.82 + rnd() * 0.36), side, side * (0.34 + rnd() * 0.34));
  }
  // the axis carries on past the last side spray
  const tipRoot = axis(0.88);
  drawSpray(tipRoot.x, tipRoot.y, h * 0.24 * (0.85 + rnd() * 0.3), 1, (rnd() - 0.5) * 0.3);
  shadeCore(ctx, w, h, 0.24);
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

  // Five small fans along an axis rather than one fan filling the tile: a cedar
  // frond painted at cell scale comes out a metre and a half across on the near
  // cards, which is where the tropical read came from.
  ctx.strokeStyle = rgbStr(stem, 1);
  ctx.lineWidth = w * 0.011;
  ctx.beginPath();
  ctx.moveTo(w * 0.03, midY);
  ctx.lineTo(w * 0.94, midY);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const t = 0.06 + (i / 5) * 0.82;
    const side = i % 2 === 0 ? -1 : 1;
    const env = Math.pow(1 - t, 0.45) * 0.78 + 0.26;
    const len = w * 0.23 * env * (0.82 + rnd() * 0.36);
    sprig(w * t, midY, len, side * (0.34 + rnd() * 0.3), 0);
    sprig(w * t + len * 0.2, midY, len * 0.7, side * (0.9 + rnd() * 0.4), 1);
  }
  sprig(w * 0.9, midY, w * 0.12, (rnd() - 0.5) * 0.4, 0);
  shadeCore(ctx, w, h, 0.22);
}

// Every green in PALETTE is an olive: leafSun sits at B-G = -75, which is the
// colour of dry grass, and a needle painted from it reads as a hedge clipping
// however well the spray is drawn. Mixing toward a blue-green is what separates
// conifer from shrubbery, and it costs nothing in the distance because the aerial
// perspective takes the hue over out there anyway.
const CONIFER_COOL = [74, 116, 88];

// The forest floor is the darkest place in a stand — it gets what the canopy has
// finished with. Measuring the atlases put the fern and shrub albedo at luma 68
// against the canopy's 52, so the understory was a third *brighter* than the
// thing shading it, and every ground plant read as acid against the trees. All
// the floor greens are pulled toward this.
const FLOOR_DARK = [30, 44, 30];

export function needleAtlas() {
  const needle = hexToRgb(PALETTE.pineNeedle);
  const sun = mixRgb(hexToRgb(PALETTE.leafSun), CONIFER_COOL, 0.4);
  const shadeC = mixRgb(hexToRgb(PALETTE.leafShade), CONIFER_COOL, 0.16);
  const woody = hexToRgb(PALETTE.barkDark);
  // 1024 a tile, not 512. A near spray card covers about 200 screen pixels while
  // its tile is 512 wide, so it samples around mip 1.5, where a needle painted
  // one pixel wide is simply gone. Doubling the tile keeps needles legible at
  // the distance the eye is actually judging the crown structure from.
  return atlas(
    'nat.needleAtlas',
    1024,
    [
      // 0 douglas fir: dark, medium needles, flat spray
      (c, w, h) =>
        needleTile(c, w, h, {
          seed: 811,
          base: mixRgb(needle, sun, 0.14),
          tip: mixRgb(sun, needle, 0.34),
          shade: mixRgb(shadeC, needle, 0.3),
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
          base: mixRgb(needle, sun, 0.32),
          tip: mixRgb(sun, needle, 0.22),
          shade: mixRgb(shadeC, needle, 0.42),
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
          base: mixRgb(needle, [58, 116, 108], 0.34),
          tip: mixRgb(sun, [140, 186, 152], 0.42),
          shade: mixRgb(shadeC, [40, 72, 72], 0.45),
          stem: woody,
        }),
      // 3 dead / rust: sparse, warm, bare twigs showing. Well down in value — at
      // [162,118,62] the dead tips were the brightest thing in the mid distance
      // and a snag read as a pale khaki plume, when a real one is dark rust on
      // grey wood and reads mainly as a gap in the canopy.
      (c, w, h) =>
        needleTile(c, w, h, {
          seed: 1913,
          base: [76, 54, 34],
          tip: [104, 80, 48],
          shade: [40, 30, 20],
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

  twig(w * 0.04, h * 0.5, w * 0.96, h * 0.5, w * 0.011);
  const shoots = [];
  for (let i = 0; i < 6; i++) {
    const t = 0.1 + i * 0.15;
    const side = i % 2 ? 1 : -1;
    const ex = w * (t + 0.12);
    const ey = h * (0.5 + side * spread * 0.95);
    twig(w * t, h * 0.5, ex, ey, w * 0.006);
    shoots.push([ex, ey, side]);
  }

  // Shadowed depth between the leaves, for the same reason as the needle sprays:
  // mips average the leaves against the gaps, and if the gaps are clear the
  // cluster brightens with distance instead of massing up. Kept under the
  // material's alphaTest and filled once, so it darkens the gaps it shares with
  // leaves without closing the crown up.
  ctx.save();
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = rgbStr(mixRgb(shade, [0, 0, 0], 0.2), 1);
  ctx.beginPath();
  for (const [ex, ey] of shoots) {
    const r = h * leafLen * 1.5;
    for (let k = 0; k < 3; k++) {
      const c = 0.35 + k * 0.32;
      ctx.moveTo(lerp(w * 0.5, ex, c) + r * (1 - k * 0.18), lerp(h * 0.5, ey, c));
      ctx.ellipse(lerp(w * 0.5, ex, c), lerp(h * 0.5, ey, c), r * (1 - k * 0.18), r * (0.78 - k * 0.1), 0, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();

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
    // palmatePath takes a radius, ovalPath a length, so a palmate leaf comes out
    // twice the size of an oval one for the same number
    if (shape === 'palmate') palmatePath(ctx, len * 0.5);
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

  // Leaves are hung off the shoots in clusters and each is a fraction of the
  // size they used to be. At 0.2 of the cell a single painted leaf came out over
  // a metre across on the near cards and the crowns read as a rubber plant; a
  // real crown at four metres is a lot of small leaves with gaps between them,
  // and the gaps are what let the interior go dark.
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const [sx, sy, side] = shoots[i % shoots.length];
    const g = Math.floor(i / shoots.length) / Math.max(1, Math.ceil(count / shoots.length) - 1);
    // walk out along the shoot from the axis, scattering around it as it goes
    const along = 0.12 + g * 0.98;
    const sc = h * leafLen * 2.6;
    const x = lerp(w * (0.5 - (1 - t) * 0.42), sx, along) + (rnd() - 0.5) * sc;
    const y = lerp(h * 0.5, sy, along) + (rnd() - 0.5) * sc * 0.9;
    const len = h * leafLen * (0.6 + rnd() * 0.7);
    const ang = side * (0.3 + rnd() * 1.0) + (rnd() - 0.5) * 1.1;
    ctx.strokeStyle = rgbStr(stemCol, 1.2);
    ctx.lineWidth = Math.max(0.5, w * 0.003);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len * 0.22, y + Math.sin(ang) * len * 0.22);
    ctx.stroke();
    drawLeaf(x, y, len, ang, clamp(0.1 + rnd() * 0.86), rnd() < 0.5);
  }
  shadeCore(ctx, w, h, 0.2);
}

export function leafAtlas() {
  const sun = mixRgb(hexToRgb(PALETTE.leafSun), CONIFER_COOL, 0.32);
  const mid = mixRgb(hexToRgb(PALETTE.leaf), CONIFER_COOL, 0.22);
  const shade = mixRgb(hexToRgb(PALETTE.leafShade), CONIFER_COOL, 0.14);
  const woody = hexToRgb(PALETTE.barkDark);
  return atlas(
    'nat.leafAtlas',
    512,
    [
      // 0 bigleaf maple. Small and numerous: leafLen is a fraction of the cell,
      // and the cards these land on are metres across.
      (c, w, h) =>
        leafTile(c, w, h, {
          seed: 3301,
          sun: mixRgb(sun, mid, 0.2),
          mid: mixRgb(mid, [0, 0, 0], 0.04),
          shade: mixRgb(shade, [0, 0, 0], 0.06),
          stemCol: mixRgb(woody, [110, 88, 62], 0.4),
          count: 96,
          shape: 'palmate',
          leafLen: 0.075,
          spread: 0.3,
        }),
      // 1 alder: smaller ovals, darker, denser
      (c, w, h) =>
        leafTile(c, w, h, {
          seed: 3907,
          sun: mixRgb(sun, mid, 0.42),
          mid: mixRgb(mid, [0, 0, 0], 0.16),
          shade: mixRgb(shade, [0, 0, 0], 0.2),
          stemCol: woody,
          count: 138,
          shape: 'oval',
          leafLen: 0.07,
          spread: 0.32,
        }),
      // 2 turning: deep bronze. A saturated yellow tile plus a warm per-instance
      // tint reads as a red blob against this fog, and a *pale* one reads worse
      // than that: at fifty metres it came out as a khaki parasol brighter than
      // the green around it, which the eye takes for dead foliage.
      (c, w, h) =>
        leafTile(c, w, h, {
          seed: 4409,
          sun: [126, 106, 62],
          mid: [90, 74, 44],
          shade: [50, 42, 26],
          stemCol: mixRgb(woody, [120, 92, 58], 0.5),
          count: 96,
          shape: 'palmate',
          leafLen: 0.08,
          spread: 0.3,
        }),
      // 3 dying: sparse, rust brown, twigs showing
      (c, w, h) =>
        leafTile(c, w, h, {
          seed: 4903,
          sun: [112, 80, 46],
          mid: [82, 58, 34],
          shade: [44, 32, 22],
          stemCol: mixRgb(woody, [96, 82, 70], 0.6),
          count: 70,
          shape: 'oval',
          leafLen: 0.07,
          spread: 0.32,
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

    // Pinnae are filled tapered leaflets with their own midrib rather than
    // round-capped strokes. At a metre from the lens a stroke reads as a stroke:
    // the cap gives every leaflet the same blunt sausage end, and a fern seen
    // that close is mostly edges.
    const n = 44;
    for (let i = 1; i < n; i++) {
      const s = i / n;
      const mx = lerp(lerp(rootX, ctrlX, s), lerp(ctrlX, tipX, s), s);
      const my = lerp(lerp(rootY, ctrlY, s), lerp(ctrlY, ty, s), s);
      const nx = lerp(lerp(rootX, ctrlX, s + 0.02), lerp(ctrlX, tipX, s + 0.02), s + 0.02);
      const ny = lerp(lerp(rootY, ctrlY, s + 0.02), lerp(ctrlY, ty, s + 0.02), s + 0.02);
      const along = Math.atan2(ny - my, nx - mx);
      const scallop = 0.82 + 0.18 * Math.cos(i * 2.1);
      const plen = w * pinnaeLen * Math.sin(clamp(s * 1.12) * Math.PI * 0.94) * (0.78 + rnd() * 0.4) * scallop;
      const pwid = w * (0.019 - s * 0.009) * (0.8 + rnd() * 0.45);
      const dead = rnd() < 0.045;
      for (const dir of [-1, 1]) {
        const ang = along + dir * (1.0 + rnd() * 0.3);
        const tone = clamp(0.1 + s * 0.5 + rnd() * 0.35) * (0.5 + depth * 0.6);
        let col = tone < 0.3 ? mixRgb(shade, base, tone / 0.3) : mixRgb(base, sun, (tone - 0.3) / 0.7);
        if (dead) col = mixRgb(col, [96, 76, 46], 0.6);
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        // perpendicular, for the leaflet's half width
        const px = -sa;
        const py = ca;
        ctx.fillStyle = rgbStr(col, 0.72 + tone * 0.5);
        ctx.beginPath();
        ctx.moveTo(mx + px * pwid * 0.35, my + py * pwid * 0.35);
        ctx.quadraticCurveTo(
          mx + ca * plen * 0.5 + px * pwid,
          my + sa * plen * 0.5 + py * pwid - plen * 0.16,
          mx + ca * plen,
          my + sa * plen,
        );
        ctx.quadraticCurveTo(
          mx + ca * plen * 0.5 - px * pwid * 0.85,
          my + sa * plen * 0.5 - py * pwid * 0.85 - plen * 0.16,
          mx - px * pwid * 0.35,
          my - py * pwid * 0.35,
        );
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgbStr(mixRgb(col, sun, 0.4), 1, 0.5);
        ctx.lineWidth = Math.max(0.6, pwid * 0.3);
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.quadraticCurveTo(mx + ca * plen * 0.5, my + sa * plen * 0.5 - plen * 0.16, mx + ca * plen * 0.92, my + sa * plen * 0.92);
        ctx.stroke();
      }
    }
  }
  shadeCore(ctx, w, h, 0.24, { from: 'bottom' });
}

export function fernAtlas() {
  const fern = mixRgb(mixRgb(hexToRgb(PALETTE.fern), CONIFER_COOL, 0.3), FLOOR_DARK, 0.32);
  const sun = mixRgb(mixRgb(hexToRgb(PALETTE.leafSun), CONIFER_COOL, 0.48), FLOOR_DARK, 0.52);
  const shade = mixRgb(mixRgb(hexToRgb(PALETTE.leafShade), CONIFER_COOL, 0.16), FLOOR_DARK, 0.2);
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
          base: mixRgb(fern, sun, 0.1),
          sun: mixRgb(sun, [116, 128, 96], 0.24),
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
          base: mixRgb([84, 64, 38], FLOOR_DARK, 0.3),
          sun: mixRgb([104, 84, 50], FLOOR_DARK, 0.22),
          shade: mixRgb([44, 34, 22], FLOOR_DARK, 0.3),
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
    // Skewed hard toward green. A flat random mix put the average blade halfway
    // to straw, which lands red level with green — and a stand of grass whose
    // mean hue is yellow reads as chartreuse no matter what the lighting does.
    // Dry blades want to be the exception picked out against green, not the mean.
    const tone = Math.pow(clamp(rnd()), 2.2);
    const col = mixRgb(green, dry, tone * 0.85);
    const grad = ctx.createLinearGradient(x0, h, x0 + lean, top);
    grad.addColorStop(0, rgbStr(mixRgb(col, [12, 20, 12], 0.55), 1));
    grad.addColorStop(0.4, rgbStr(col, 0.9));
    grad.addColorStop(1, rgbStr(col, 1.06));
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
  shadeCore(ctx, w, h, 0.2, { from: 'bottom' });
}

export function grassAtlas() {
  const fern = mixRgb(hexToRgb(PALETTE.fern), CONIFER_COOL, 0.24);
  // Cooler and a stop down from the palette entry. Forest-floor grass sits in
  // canopy shade: it is darker than the sunlit dirt beside it, and it takes a
  // green-blue cast off the sky rather than the yellow of an open meadow.
  const green = mixRgb(mixRgb(mixRgb(hexToRgb(PALETTE.grass), fern, 0.5), [26, 44, 34], 0.16), CONIFER_COOL, 0.24);
  // and straw that has been rained on, not gold. Kept well down in value too: a
  // pale blade among dark ones is the brightest thing on the verge and the eye
  // goes straight to it, which turned every grass clump into a bleached tuft.
  const dry = mixRgb(mixRgb(mixRgb(hexToRgb(PALETTE.grassDry), [92, 92, 66], 0.5), [58, 58, 44], 0.34), green, 0.5);
  return atlas(
    'nat.grassAtlas',
    512,
    [
      (c, w, h) => grassTile(c, w, h, { seed: 8101, green: mixRgb(green, fern, 0.4), dry: mixRgb(dry, green, 0.45), blades: 96, tall: 0.72, wide: 0.4, seedHeads: false }),
      (c, w, h) => grassTile(c, w, h, { seed: 8609, green, dry: mixRgb(dry, green, 0.32), blades: 76, tall: 0.9, wide: 0.5, seedHeads: true }),
      (c, w, h) => grassTile(c, w, h, { seed: 9109, green: mixRgb(green, [0, 0, 0], 0.3), dry: mixRgb(dry, green, 0.62), blades: 112, tall: 0.55, wide: 0.34, seedHeads: false }),
      (c, w, h) => grassTile(c, w, h, { seed: 9601, green: mixRgb(green, dry, 0.3), dry: mixRgb(dry, [70, 68, 50], 0.5), blades: 68, tall: 0.82, wide: 0.58, seedHeads: true }),
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
  shadeCore(ctx, w, h, 0.22, { from: 'bottom' });
}

/**
 * Foxglove and fireweed: two flower spikes and two basal leaf clumps.
 *
 * The flowers are deliberately dull. A real foxglove is a dusty mauve that has
 * gone half to seed by the time the ferns are this size, and anything brighter
 * would just be a fresh off-palette accent in place of the acid green — the point
 * of these is the vertical silhouette, not the colour.
 */
export function stalkAtlas() {
  const green = mixRgb(mixRgb(hexToRgb(PALETTE.fern), CONIFER_COOL, 0.34), [0, 0, 0], 0.16);
  const stemC = mixRgb(green, hexToRgb(PALETTE.barkDark), 0.42);
  const bells = [96, 74, 90];
  const fire = [100, 62, 76];

  const spike = (ctx, w, h, seed, petal, tall) => {
    const rnd = mulberry32(seed);
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgbStr(stemC, 1);
    ctx.lineWidth = w * 0.05;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h);
    ctx.quadraticCurveTo(w * 0.5 + (rnd() - 0.5) * w * 0.16, h * 0.5, w * 0.5 + (rnd() - 0.5) * w * 0.2, h * 0.02);
    ctx.stroke();
    const n = tall ? 26 : 18;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const y = h * (0.06 + t * 0.86);
      const x = w * 0.5 + (0.5 - t) * w * 0.1;
      const side = i % 2 ? 1 : -1;
      // buds at the top, open flowers lower down, spent ones lowest
      const open = smoothstep(0.05, 0.55, 1 - t);
      const r = w * (0.07 + open * 0.16) * (0.7 + rnd() * 0.6);
      const col = mixRgb(mixRgb(green, petal, 0.35 + open * 0.65), [0, 0, 0], (1 - open) * 0.2 + t * 0.1);
      ctx.fillStyle = rgbStr(col, 0.9 + rnd() * 0.3);
      ctx.beginPath();
      ctx.ellipse(x + side * w * (0.05 + open * 0.12), y, r, r * (0.6 + open * 0.5), side * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    shadeCore(ctx, w, h, 0.16);
  };

  const basal = (ctx, w, h, seed, lanceolate) => {
    const rnd = mulberry32(seed);
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI * 0.5 + (i / 15 - 0.5) * 2.5 + (rnd() - 0.5) * 0.3;
      const len = h * (lanceolate ? 0.5 + rnd() * 0.42 : 0.36 + rnd() * 0.36);
      const wid = len * (lanceolate ? 0.13 : 0.3);
      const tone = 0.25 + rnd() * 0.75;
      ctx.save();
      ctx.translate(w * 0.5, h * 0.98);
      ctx.rotate(a + Math.PI * 0.5);
      ctx.fillStyle = rgbStr(mixRgb(mixRgb(green, [0, 0, 0], 0.3), mixRgb(green, CONIFER_COOL, 0.4), tone), 1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-wid, -len * 0.45, -wid * 0.5, -len * 0.92, 0, -len);
      ctx.bezierCurveTo(wid * 0.5, -len * 0.92, wid, -len * 0.45, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    shadeCore(ctx, w, h, 0.24, { from: 'bottom' });
  };

  return atlas(
    'nat.stalkAtlas',
    256,
    [
      (c, w, h) => spike(c, w, h, 13001, bells, false),
      (c, w, h) => spike(c, w, h, 13109, fire, true),
      (c, w, h) => basal(c, w, h, 13211, false),
      (c, w, h) => basal(c, w, h, 13307, true),
    ],
    { bleed: mixRgb(green, [0, 0, 0], 0.45) },
  );
}

export function shrubAtlas() {
  const sun = mixRgb(mixRgb(hexToRgb(PALETTE.leafSun), CONIFER_COOL, 0.44), FLOOR_DARK, 0.36);
  const mid = mixRgb(mixRgb(hexToRgb(PALETTE.leaf), CONIFER_COOL, 0.26), FLOOR_DARK, 0.22);
  const shade = mixRgb(mixRgb(hexToRgb(PALETTE.leafShade), CONIFER_COOL, 0.16), FLOOR_DARK, 0.2);
  const woody = hexToRgb(PALETTE.barkDark);
  return atlas(
    'nat.shrubAtlas',
    512,
    [
      (c, w, h) => shrubTile(c, w, h, { seed: 10301, sun: mixRgb(sun, FLOOR_DARK, 0.24), mid: mixRgb(mid, FLOOR_DARK, 0.18), shade, stemCol: mixRgb(woody, [90, 62, 44], 0.5), stems: 7, leafLen: 0.15, berry: true }),
      (c, w, h) => shrubTile(c, w, h, { seed: 10709, sun: mixRgb(sun, mid, 0.5), mid: mixRgb(mid, [0, 0, 0], 0.2), shade, stemCol: woody, stems: 9, leafLen: 0.11, berry: false }),
      // a turning shrub, but a tired olive one: gold at this saturation is a
      // quarter of every shrub instance and it dragged the whole verge yellow
      (c, w, h) => shrubTile(c, w, h, { seed: 11311, sun: [104, 96, 60], mid: [74, 70, 44], shade: [44, 42, 28], stemCol: mixRgb(woody, [116, 90, 60], 0.5), stems: 6, leafLen: 0.14, berry: false }),
      (c, w, h) => shrubTile(c, w, h, { seed: 11903, sun: mixRgb(sun, [132, 158, 118], 0.36), mid: mixRgb(mid, hexToRgb(PALETTE.fern), 0.5), shade, stems: 8, stemCol: woody, leafLen: 0.13, berry: true }),
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
          ctx.strokeStyle = rgbStr(mixRgb(mixRgb(shade, moss, tone), [126, 140, 96], clamp(tone - 0.6) * 1.6), 1);
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

/** One conifer drawn around `cx`, so several can share a billboard cell. */
function coniferPaint(ctx, rnd, cx, baseY, topY, halfW, cols, { tiers = 16, drape = 0.12, crownStart = 0.26 } = {}) {
  const { dark, mid, light, trunk } = cols;
  const treeH = baseY - topY;
  const sw = halfW * 0.1;
  ctx.lineCap = 'round';

  ctx.strokeStyle = rgbStr(trunk, 1);
  for (let i = 0; i < 10; i++) {
    const t = i / 10;
    ctx.lineWidth = halfW * (0.2 * (1 - t) + 0.035);
    ctx.beginPath();
    ctx.moveTo(cx + (rnd() - 0.5) * halfW * 0.05, baseY - treeH * t);
    ctx.lineTo(cx, baseY - treeH * (t + 0.1));
    ctx.stroke();
  }

  for (let k = 0; k < tiers; k++) {
    const u = k / (tiers - 1);
    const y = baseY - treeH * (crownStart + u * (1 - crownStart));
    const prof = Math.pow(1 - u, 0.74) * lerp(0.58, 1, smoothstep(0, 0.18, u));
    const rx = halfW * prof * (0.8 + rnd() * 0.4);
    if (rx < halfW * 0.05) continue;
    const per = rx > halfW * 0.4 ? 5 : 3;
    for (let j = 0; j < per; j++) {
      const side = j % 2 === 0 ? -1 : 1;
      const off = side * rx * (0.12 + rnd() * 0.88);
      const cy = y + Math.abs(off) * drape + (rnd() - 0.5) * treeH * 0.012;
      const crx = rx * (0.36 + rnd() * 0.28);
      clump(ctx, rnd, cx + off, cy, crx, crx * (0.5 + rnd() * 0.28), 64, dark, mid, light, sw, sw * 2.4);
    }
    // a denser core so the trunk does not show through the middle of the crown
    clump(ctx, rnd, cx, y, rx * 0.38, rx * 0.32, 44, dark, mixRgb(dark, mid, 0.45), mid, sw, sw * 1.9);
  }
  clump(ctx, rnd, cx, topY + treeH * 0.03, halfW * 0.11, treeH * 0.045, 34, dark, mid, light, sw * 0.8, sw * 1.8);
}

/**
 * A whole stand of conifers in one cell.
 *
 * A conifer is roughly three times taller than it is wide, but an atlas cell is
 * square: painting one tree per cell either wastes two thirds of the texels or,
 * if the card is stretched to the tree's real proportion, squeezes the painting
 * into a flat-topped organ pipe. Painting a *group* at the cell's own aspect
 * fixes both, and the sky slots between members — which move with every yaw and
 * mirror — are what make a treeline read as forest instead of as a comb.
 *
 * Members carry a `depth` that mixes their palette toward the haze, so a single
 * card already has front-to-back separation before the aerial ramp adds any.
 */
function billboardStand(ctx, w, h, { seed, members, pal, tiers = 16, drape = 0.12, crownStart = 0.26 }) {
  const rnd = mulberry32(seed);
  // authored back to front, so nearer members cut into the hazier ones behind
  members.forEach((m) => {
    const d = m.depth;
    coniferPaint(
      ctx,
      rnd,
      w * m.x,
      h * 0.99,
      h * (1 - m.h),
      w * m.halfW,
      {
        dark: mixRgb(pal.dark, pal.haze, d),
        mid: mixRgb(pal.mid, pal.haze, d * 0.9),
        light: mixRgb(pal.light, pal.haze, d * 0.7),
        trunk: mixRgb(pal.trunk, pal.haze, d),
      },
      { tiers: Math.round(tiers * (0.7 + m.h * 0.4)), drape, crownStart: crownStart * (0.7 + m.h * 0.4) },
    );
  });
  shadeCore(ctx, w, h, 0.18, { from: 'bottom' });
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
      // 0 douglas fir stand: four trees, tallest just off centre.
      //
      // The lit end of every tile is held close to its mid tone. A distant crown
      // painted with a real sun-to-shade range gets fog laid on top of it and
      // the bright strokes come out at the value of the sky, which is what read
      // as pale spires; aerial perspective collapses that contrast long before
      // 100 m and the painting has to do the same. The dark end is *not* pushed
      // to black either: the near members of this band sit at 30-50 m, where
      // fog is only a few per cent, so a silhouette painting stays a silhouette.
      (c, w, h) =>
        billboardStand(c, w, h, {
          seed: 31001,
          pal: {
            dark: mixRgb(shade, [16, 24, 16], 0.22),
            mid: mixRgb(needle, sun, 0.24),
            light: mixRgb(needle, sun, 0.62),
            trunk: mixRgb(woody, [58, 50, 42], 0.4),
            haze: [82, 96, 92],
          },
          members: [
            { x: 0.37, h: 0.6, halfW: 0.09, depth: 0.46 },
            { x: 0.76, h: 0.86, halfW: 0.115, depth: 0.34 },
            { x: 0.22, h: 0.78, halfW: 0.105, depth: 0.2 },
            { x: 0.5, h: 0.97, halfW: 0.16, depth: 0.04 },
          ],
          tiers: 18,
          crownStart: 0.3,
          drape: 0.12,
        }),
      // 1 cedar / hemlock stand: wider, softer, a touch lighter
      (c, w, h) =>
        billboardStand(c, w, h, {
          seed: 31511,
          pal: {
            dark: mixRgb(shade, [22, 34, 24], 0.28),
            mid: mixRgb(needle, sun, 0.3),
            light: mixRgb(needle, sun, 0.68),
            trunk: mixRgb(woody, [62, 54, 44], 0.36),
            haze: [88, 100, 96],
          },
          members: [
            { x: 0.5, h: 0.56, halfW: 0.12, depth: 0.5 },
            { x: 0.86, h: 0.44, halfW: 0.06, depth: 0.36 },
            { x: 0.21, h: 0.74, halfW: 0.105, depth: 0.22 },
            { x: 0.745, h: 0.95, halfW: 0.13, depth: 0.05 },
          ],
          tiers: 16,
          crownStart: 0.2,
          drape: 0.17,
        }),
      // 2 broadleaf
      (c, w, h) =>
        billboardBroadleaf(c, w, h, {
          seed: 32003,
          dark: mixRgb(shade, [16, 22, 12], 0.36),
          mid: mixRgb(leaf, [0, 0, 0], 0.12),
          light: mixRgb(leaf, sun, 0.36),
          trunkCol: mixRgb(woody, [104, 92, 78], 0.25),
          clumps: 22,
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

/**
 * Distant treeline strip.
 *
 * Two things were wrong with the comb of crisp spires this replaces. It drew 47
 * trees across a 1024 px strip, so every crown was an isolated spike with sky
 * either side, and it drew them as hard polygon paths, so the silhouette had a
 * cut edge at a size on screen where a real treeline is pure tone. This draws
 * four hundred narrow trees per strip out of round-capped tier strokes: they
 * overlap into mass, the caps give a soft ragged outline for free, and each of
 * three internal depth layers has its own value so a single band already has
 * air in it. Only the top eighth takes the warm rim.
 */
export function treelineTexture(variant = 0) {
  return cached('nat.treeline.' + variant, () => {
    const w = 1024;
    const h = 256;
    return cutoutTexture(
      w,
      (ctx, cw, ch) => {
        ctx.clearRect(0, 0, cw, ch);
        const rnd = mulberry32(21001 + variant * 977);
        const haze = hexToRgb(PALETTE.fogDeep);
        // green-black, not blue-black: the fog already supplies all the cyan
        // this band can carry and then some
        const deep = mixRgb(hexToRgb(PALETTE.leafShade), hexToRgb(PALETTE.pineNeedle), 0.4);
        ctx.lineCap = 'round';

        // Tiers are thin and there are many of them. At one tier per fifteen
        // pixels the round caps stopped overlapping and each tree came out as a
        // stack of separate lozenges — on screen the card is four times smaller
        // than the strip, so those landed as a flat-topped block three pixels
        // wide. Sub-pixel strokes average into tone instead, which is what a
        // treeline at two hundred metres actually is.
        const conifer = (cx, baseY, halfW, height, col, alpha, halo) => {
          const tiers = Math.max(14, Math.round(height / 4.5));
          const lw = Math.max(1.15, (height / tiers) * 1.5);
          const droop = 0.1 + rnd() * 0.16;
          const tier = (t, wid, y) => {
            // a shallow V rather than a bar: conifer branches fall away from the
            // leader, and the notch between two of them is the serration
            ctx.beginPath();
            ctx.moveTo(cx - wid, y + wid * droop);
            ctx.lineTo(cx, y);
            ctx.lineTo(cx + wid, y + wid * droop);
            ctx.stroke();
          };
          if (halo > 0) {
            ctx.strokeStyle = rgbStr(mixRgb(col, haze, 0.5), 1, halo);
            ctx.lineWidth = lw * 2.2;
            for (let i = 1; i < tiers; i++) {
              const t = i / (tiers - 1);
              tier(t, halfW * Math.pow(t, 0.62) * 1.25 + lw * 0.4, baseY - height * (1 - t));
            }
          }
          ctx.strokeStyle = rgbStr(col, 1, alpha);
          ctx.lineWidth = lw;
          for (let i = 1; i < tiers; i++) {
            const t = i / (tiers - 1);
            tier(t, halfW * Math.pow(t, 0.64) * (0.72 + rnd() * 0.54), baseY - height * (1 - t));
          }
        };

        // Everything below the crown line is solid, so no sky ever shows between
        // distant trunks — the gap between two trunks at 200 m is well under a
        // pixel and reading sky through it is what makes a treeline sparkle.
        ctx.fillStyle = rgbStr(mixRgb(deep, [0, 0, 0], 0.3), 1);
        ctx.beginPath();
        ctx.moveTo(0, ch);
        for (let x = 0; x <= cw; x += 8) {
          const n = fbm(x * 0.009, variant * 3.3, { octaves: 4, period: 16, seed: 55 });
          ctx.lineTo(x, ch - ch * (0.2 + n * 0.16));
        }
        ctx.lineTo(cw, ch);
        ctx.closePath();
        ctx.fill();

        const layers = [
          { n: 190, col: mixRgb(deep, haze, 0.52), hi: [0.3, 0.52], base: 0.74, alpha: 0.82, halo: 0.0 },
          { n: 166, col: mixRgb(deep, haze, 0.3), hi: [0.4, 0.68], base: 0.85, alpha: 0.9, halo: 0.16 },
          { n: 146, col: deep, hi: [0.46, 0.92], base: 0.97, alpha: 1.0, halo: 0.22 },
        ];
        for (const L of layers) {
          for (let i = 0; i < L.n; i++) {
            const cx = ((i + rnd() * 1.6 - 0.3) / L.n) * cw;
            const height = ch * lerp(L.hi[0], L.hi[1], Math.pow(rnd(), 1.4));
            conifer(cx, ch * L.base, height * (0.12 + rnd() * 0.07), height, L.col, L.alpha, L.halo);
          }
        }

        // warm rim, kept to the very tops; below that the band only gets darker
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        const g = ctx.createLinearGradient(0, 0, 0, ch);
        g.addColorStop(0, 'rgba(255,206,150,0.3)');
        g.addColorStop(0.13, 'rgba(255,206,150,0.05)');
        g.addColorStop(0.4, 'rgba(12,20,18,0.12)');
        g.addColorStop(1, 'rgba(8,14,12,0.42)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();
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
    return cutoutTexture(
      w,
      (ctx, cw, ch) => {
        ctx.clearRect(0, 0, cw, ch);
        // under the fog colour on purpose: a ridge painted at the haze value
        // sits on top of the sky rather than inside it
        const col = mixRgb(hexToRgb(PALETTE.fogDeep), hexToRgb(PALETTE.pineNeedle), 0.42);
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
          ctx.lineTo(x, ch - ch * clamp(0.18 + n * 0.66 + jag));
        }
        ctx.lineTo(cw, ch);
        ctx.closePath();
        ctx.fill();
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        const g = ctx.createLinearGradient(0, 0, 0, ch);
        g.addColorStop(0, 'rgba(255,222,184,0.22)');
        g.addColorStop(0.3, 'rgba(140,160,158,0.0)');
        g.addColorStop(1, 'rgba(20,30,28,0.3)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();
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
