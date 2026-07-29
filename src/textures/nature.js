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
    // Bark is not one colour at several brightnesses. A plate that has been wet
    // for a decade is near-black and cool; the one next to it carries a grey
    // crustose lichen; a third is bare and red. Painting all three off one
    // height ramp is what left a bole measuring a single value across its whole
    // width, and no amount of normal-map relief reads through that — the trunk
    // is lit by ambient in a closed stand, so the *albedo* is the only thing
    // carrying its form.
    const lichenGrey = [122, 124, 112];
    const wetBlack = [22, 21, 20];
    const sapwood = [146, 122, 94];
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
        // Per-plate identity, keyed off the same Worley cells the relief uses so
        // a colour change lands on a plate edge rather than cutting across one.
        const pl = worley(u * K.plate, v * 2.4 * vf, K.plate | 0, seed + 40);
        const pid = (pl.id * 41.3) % 1;
        const plateLit = smoothstep(0.3, 0.75, d);
        if (pid > 0.72) c = mixRgb(c, lichenGrey, (pid - 0.72) * 1.9 * plateLit * K.light);
        else if (pid < 0.26) c = mixRgb(c, wetBlack, (0.26 - pid) * 2.0);
        // large scale stain so a whole flank of the trunk goes darker
        const stain = fbm(u * 2.5, v * 1.4 * vf, { octaves: 4, period: 3, seed: seed + 90 });
        c = mixRgb(c, deep, smoothstep(0.5, 0.92, stain) * 0.52);
        // A scar: a patch where the bark has come away and the sapwood under it
        // is pale, dry and smooth. About a tenth of the surface, and it is the
        // largest value step on the object — which is exactly the job. Gated on
        // the *flank* stain so it lands as one contiguous strip up the bole
        // instead of as a rash.
        const scar =
          smoothstep(0.62, 0.86, fbm(u * 3.2 + 11, v * 1.1 * vf + 4, { octaves: 3, period: 4, seed: seed + 120 })) *
          smoothstep(0.3, 0.6, 1 - stain);
        c = mixRgb(c, mixRgb(mixRgb(sapwood, deep, 0.3), sapwood, plateLit), scar * 0.78);
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

/**
 * Bark for fallen timber, at the density a log two metres from the lens needs.
 *
 * The trunk maps cannot carry this. On a standing tree the camera is never
 * closer than the corridor half width and the bole is a metre wide on screen at
 * worst; a log in the verge fills a third of a beauty frame, and at that size
 * the trunk map's 150 texels per metre is a smooth pipe with lengthwise streaks.
 *
 * Three scales, deliberately: bark plates 10-25 cm across separated by black
 * checks, a 1 cm fissure grain inside each plate, and — the part that actually
 * sells it — patches where the bark has sloughed off entirely and left bare
 * sapwood. A downed log loses its bark in sheets, so the boundary between bark
 * and wood is the biggest value step on the object and it is what stops the
 * silhouette reading as extruded.
 */
export function logBarkMaps() {
  return cached('nat.logbark', () => {
    const w = 512;
    const h = 512;
    // How much bark is left, as a field: 1 bark, 0 bare wood. Worley cells give
    // the sheet edges a shape rather than a noise threshold's fuzz.
    const lossAt = (u, v) => {
      // Bark leaves a fallen log in sheets that follow the grain, so the field is
      // stretched along v — and it leaves about a fifth of the trunk, not half.
      // A worley f1 threshold puts a rounded bare patch at every cell centre,
      // evenly spaced, which at this size is unmistakably a leopard.
      const sheet = fbm(u * 3.2, v * 1.15, { octaves: 4, period: 3, seed: 601 });
      const tear = fbm(u * 18, v * 7, { octaves: 3, period: 18, seed: 613 }) - 0.5;
      return clamp(1 - smoothstep(0.58, 0.76, sheet + tear * 0.16));
    };
    const woodAt = (u, v) => {
      // sapwood grain runs along the log, i.e. along v
      const g = ridged(u * 30, v * 3.2, { octaves: 3, period: 30, seed: 631 });
      const split = ridged(u * 7.5, v * 1.4, { octaves: 2, period: 7, seed: 637 });
      return clamp(g * 0.5 + Math.pow(split, 2.4) * 0.34 + 0.16);
    };
    // The two bark terms are shared with the albedo pass below rather than being
    // recomputed there off the composite height — see the note on the ramp.
    //
    // Check depth carried on its own noise: at a constant depth the plate walls
    // are all the same width and the flank reads as brickwork, which is the one
    // thing worse than a smooth pipe.
    //
    // Precomputed rather than sampled twice, because the albedo pass needs the
    // cell *id* as well as the crack: a close framing of a log showed the plate
    // net perfectly well and still read as a painted pipe, and the reason was
    // that every plate inside the net was the same brown. A bark plate is an
    // independent little roof — one is grey with lichen, its neighbour holds
    // water and is nearly black, a third has lifted and shows warm inner bark.
    // The net without that is a wallpaper pattern.
    const nPix = w * h;
    const checkF = new Float32Array(nPix);
    const plateF = new Float32Array(nPix);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const v = y / h;
        const plate = worley(u * 7.5, v * 5.5, 7, 659);
        const deep = fbm(u * 5, v * 4, { octaves: 3, period: 5, seed: 661 });
        // A second, finer net inside the first. One tier of cells at one size is
        // still one size, and the eye finds that spacing immediately.
        const sub = worley(u * 19, v * 13, 19, 677);
        const i = y * w + x;
        checkF[i] = clamp(
          (1 - smoothstep(0.0, 0.055 + deep * 0.07, plate.f2 - plate.f1)) * (0.42 + deep * 0.62) +
            (1 - smoothstep(0.0, 0.03, sub.f2 - sub.f1)) * 0.3 * (0.3 + deep * 0.7),
        );
        plateF[i] = plate.id;
      }
    }
    const checkAt = (u, v) => checkF[(Math.min(h - 1, (v * h) | 0) * w + Math.min(w - 1, (u * w) | 0)) | 0];
    const fisAt = (u, v) => {
      const warp = fbm(u * 6, v * 3, { octaves: 3, period: 6, seed: 643 }) - 0.5;
      return clamp(ridged(u * 11 + warp * 0.6, v * 3.0, { octaves: 4, period: 11, seed: 651 }));
    };
    const grainAt = (u, v) => fbm(u * 40, v * 22, { octaves: 4, period: 40, seed: 667 });
    const hf = heightField(w, h, (x, y) => {
      const u = x / w;
      const v = y / h;
      const bark = lossAt(u, v);
      const barkH = clamp(Math.pow(fisAt(u, v), 1.9) * 0.6 + grainAt(u, v) * 0.16 + 0.24) * (1 - checkAt(u, v) * 0.9);
      // bare wood sits below the bark surface, which is what gives the edge of a
      // sloughed patch a lip instead of a painted outline
      return clamp(lerp(woodAt(u, v) * 0.46, barkH, smoothstep(0.3, 0.62, bark)));
    });
    const normal = normalFromHeight(hf, w, h, 7.4, { repeat: 1 });
    const barkDark = hexToRgb(PALETTE.barkDark);
    const barkMid = hexToRgb(PALETTE.bark);
    const barkLight = hexToRgb(PALETTE.barkLight);
    // Every swatch here goes through hexToRgb for the same reason the palette
    // entries do: hexToRgb returns *linear* components, so a swatch written as a
    // raw 0-255 triple is a linear triple and lands about a stop and a half
    // brighter than the number reads. The sapwood was [138, 112, 82], which is
    // sRGB (200, 182, 158) — near white. Against bark at sRGB 70 that is a
    // five-to-one albedo ratio, and with the sun on the log the patches clipped
    // to cream while the bark stayed dark: the leopard in the close-up.
    //
    // Weathered sapwood, not fresh-cut. Wood exposed on a log that fell years ago
    // is only a little lighter and a little warmer than the bark beside it.
    const fissure = hexToRgb(0x2b241d);
    const sap = hexToRgb(0x695c4c);
    const sapPale = hexToRgb(0x80715d);
    const weathered = hexToRgb(0x605c56);
    const rot = hexToRgb(0x3a2e24);
    const lichenGrey = hexToRgb(0x7a7c6e);
    const wetPlate = hexToRgb(0x241f1b);
    const innerBark = hexToRgb(0x6b4630);
    const map = pixelTexture(
      w,
      h,
      (x, y, out) => {
        const u = x / w;
        const v = y / h;
        const i = y * w + x;
        const d = hf[i];
        const bark = lossAt(u, v);
        const bareness = 1 - smoothstep(0.15, 0.6, bark);
        let c = mixRgb(fissure, barkDark, smoothstep(0.0, 0.3, d));
        c = mixRgb(c, barkMid, smoothstep(0.24, 0.58, d));
        c = mixRgb(c, barkLight, smoothstep(0.58, 0.9, d) * 0.7);
        // Per-plate weathering. Keyed off the crown of the plate rather than
        // applied flat, so the crack net stays dark and the variation lands on
        // the faces where the light is.
        {
          const crown = smoothstep(0.32, 0.72, d);
          const pid = (plateF[i] * 43.7) % 1;
          if (pid > 0.71) c = mixRgb(c, lichenGrey, (pid - 0.71) * 1.9 * crown);
          else if (pid < 0.25) c = mixRgb(c, wetPlate, (0.25 - pid) * 1.7);
          else if (pid > 0.46 && pid < 0.54) c = mixRgb(c, innerBark, (0.04 - Math.abs(pid - 0.5)) * 9 * crown);
          c = mixRgb(c, [c[0] * 0.7, c[1] * 0.7, c[2] * 0.7], (1 - ((plateF[i] * 97.3) % 1)) * 0.5 * crown);
        }
        // exposed sapwood: a little warmer and a little lighter than the bark
        const wd = woodAt(u, v);
        let wc = mixRgb(mixRgb(rot, sap, smoothstep(0.15, 0.6, wd)), sapPale, smoothstep(0.55, 0.95, wd) * 0.8);
        // and greyed where it has been weathering longest, in the middle of a patch
        wc = mixRgb(wc, weathered, smoothstep(0.5, 1.0, bareness) * 0.5);
        c = mixRgb(c, wc, bareness);
        const stain = fbm(u * 3, v * 1.8, { octaves: 4, period: 3, seed: 673 });
        c = mixRgb(c, rot, smoothstep(0.52, 0.95, stain) * 0.5);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(w, h, (x, y) => clamp(0.78 + (1 - hf[y * w + x]) * 0.2), { repeat: 1 });
    const ao = roughnessTexture(w, h, (x, y) => clamp(0.16 + hf[y * w + x] * 0.95), { repeat: 1 });
    // Moss takes hold where the bark has gone and in the checks, not on a dry
    // ridge — and it is masked to the upward face in the shader, so this only
    // decides where on the surface it could grow.
    const mossMask = roughnessTexture(
      w,
      h,
      (x, y) => {
        const u = x / w;
        const v = y / h;
        const patch = fbm(u * 4.5, v * 2.8, { octaves: 4, period: 5, seed: 683 });
        const fuzz = fbm(u * 19, v * 13, { octaves: 3, period: 19, seed: 691 });
        // Moss on a log is cushions with frayed borders, not a wash with a soft
        // edge. `fray` chews the patch outline at 3 cm and `cush` puts the 1 cm
        // lumps inside it — without the second one a mossy log is a log with a
        // green decal, however good the outline is.
        const fray = fbm(u * 26, v * 17, { octaves: 3, period: 26, seed: 697 }) - 0.5;
        const cush = worley(u * 34, v * 22, 34, 701);
        const grain = 0.42 + Math.pow(clamp(1 - cush.f1 * 2.2), 0.85) * 0.9;
        const grip = 1 - smoothstep(0.5, 0.92, hf[y * w + x]);
        return clamp(smoothstep(0.36, 0.72, patch + fray * 0.24) * (0.35 + fuzz * 0.72) * grain * (0.3 + grip * 0.9));
      },
      { repeat: 1 },
    );
    return { map, normal, rough, ao, mossMask };
  });
}

/**
 * End grain for a bucked or snapped log: rings, radial checks, a dark heart.
 *
 * A sawn round is the one place on a log where the eye knows exactly what it
 * should see, so leaving the bark map wrapped over the cap — which is what a
 * cylinder cap UV does — reads as wrong immediately.
 */
export function endGrainMaps() {
  return cached('nat.endgrain', () => {
    const w = 256;
    const h = 256;
    const ringAt = (u, v) => {
      const dx = u - 0.5;
      const dy = v - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2;
      const a = Math.atan2(dy, dx);
      // rings wobble off true and crowd toward the outside
      const wob = fbm(Math.cos(a) * 2.4 + 3, Math.sin(a) * 2.4 + 7, { octaves: 3, period: 6, seed: 701 }) - 0.5;
      const rings = 0.5 + 0.5 * Math.cos((Math.pow(r, 0.78) * 26 + wob * 3.4) * Math.PI * 2);
      // radial drying checks, splitting from the heart outward
      const spokes = ridged(a * 3.4 + 5, r * 1.5, { octaves: 2, period: 8, seed: 709 });
      const check = smoothstep(0.62, 0.94, spokes) * smoothstep(0.08, 0.5, r);
      return { r, rings, check };
    };
    const hf = heightField(w, h, (x, y) => {
      const { r, rings, check } = ringAt(x / w, y / h);
      return clamp(0.5 + rings * 0.34 - check * 0.6 - smoothstep(0.9, 1.0, r) * 0.3);
    });
    const normal = normalFromHeight(hf, w, h, 2.6, { repeat: 1 });
    // A cut round is the lightest thing on a log, but it is not a light object:
    // painted from a fresh-sawn value it came out as a blank cream oval, which at
    // twenty pixels across is a sticker on the end of the deadwood.
    //
    // sRGB hex, not raw triples — see the note in logBarkMaps. These were written
    // as raw triples and read as linear, so `pale` was sRGB (196, 180, 156).
    const pale = hexToRgb(0x968468);
    const warm = hexToRgb(0x766048);
    const heart = hexToRgb(0x56402e);
    const dark = hexToRgb(0x221a14);
    const grey = hexToRgb(0x767068);
    const map = pixelTexture(
      w,
      h,
      (x, y, out) => {
        const u = x / w;
        const v = y / h;
        const { r, rings, check } = ringAt(u, v);
        let c = mixRgb(warm, pale, rings * 0.9);
        c = mixRgb(c, heart, smoothstep(0.34, 0.0, r) * 0.8);
        c = mixRgb(c, dark, check * 0.85);
        // a rim of bark around the round
        c = mixRgb(c, hexToRgb(PALETTE.barkDark), smoothstep(0.86, 0.97, r));
        const weather = fbm(u * 5, v * 5, { octaves: 4, period: 5, seed: 717 });
        c = mixRgb(c, grey, smoothstep(0.5, 0.95, weather) * 0.4);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(w, h, () => 0.9, { repeat: 1 });
    const ao = roughnessTexture(w, h, (x, y) => clamp(0.3 + hf[y * w + x] * 0.8), { repeat: 1 });
    const mossMask = roughnessTexture(w, h, (x, y) => clamp(smoothstep(0.7, 0.95, fbm(x / w * 6, y / h * 6, { octaves: 3, period: 6, seed: 723 })) * 0.5), {
      repeat: 1,
    });
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
    // sRGB hex through hexToRgb, not raw triples — hexToRgb returns *linear*
    // components, so a raw triple here is a linear triple and lands about a stop
    // and a half brighter than the number reads. Written raw these came out at
    // sRGB 122-168 with a median of 139: the darkest colour in a dead snag's
    // texture was a mid grey and the lightest was near white, so a snag at 21 m
    // in deep shade was the brightest object in the frame and had no internal
    // range to break it up either. Twice the albedo of the log bark beside it.
    //
    // Weathered rather than bleached: a light silver dead trunk lit by an
    // overcast sky reads as a bright spike right through the canopy.
    const silver = hexToRgb(0x7d766a);
    const grey = hexToRgb(0x544f48);
    const shadow = hexToRgb(0x24211d);
    const rust = hexToRgb(0x4a3a2c);
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
/** Sample a value ramp of [r,g,b] stops at t in 0..1. */
function rampAt(ramp, t) {
  const x = clamp(t) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  return mixRgb(ramp[i], ramp[i + 1], x - i);
}

/**
 * Bake a branch's own self-shadowing into whatever has just been drawn: dark
 * where it springs from the trunk and along its axis, light at the outer tips
 * and along the two rims.
 *
 * Every card then arrives with a light end and a dark end regardless of which
 * way round it was placed, which is most of what stops a crown of cards reading
 * as one value. It is baked rather than shaded because the thing being faked —
 * a needle spray occluding the needles behind it — has no geometry for a
 * lighting model to find.
 */
function bakeSprayShading(ctx, w, h, { root = 0.3, axis = 0.18, rim = 0.2, dark = [5, 12, 7] } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const d = (a) => `rgba(${dark[0]},${dark[1]},${dark[2]},${a})`;
  if (root > 0) {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, d(root));
    g.addColorStop(0.4, d(root * 0.34));
    g.addColorStop(1, d(0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  if (axis > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, d(0));
    g.addColorStop(0.34, d(axis * 0.6));
    g.addColorStop(0.52, d(axis));
    g.addColorStop(0.72, d(axis * 0.5));
    g.addColorStop(1, d(0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  if (rim > 0) {
    const g = ctx.createLinearGradient(w * 0.4, 0, w, 0);
    g.addColorStop(0, 'rgba(206,220,168,0)');
    g.addColorStop(1, `rgba(206,220,168,${rim})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

/**
 * One conifer branch, painted as a field of needle *tufts*.
 *
 * The element that has to survive is the tuft, not the needle. A card this size
 * lands about two screen pixels per centimetre at the range a crown is judged
 * from, so a 2 mm needle is a third of a pixel: everything painted at needle
 * scale averages into one flat tone by the second mip, and a flat tone with a
 * smooth outline is cut paper. That was the whole failure — the sprays were
 * drawn beautifully at a scale nothing could see.
 *
 * So the structure is 150-odd clusters of 6-10 cm, which land at 10-25 px and
 * survive. Each carries its own value out of a wide dark-biased ramp and its own
 * contact shadow, so the mass has real variation at the frequency the eye reads
 * it; the needles inside them are grain for the two metre view and nothing else.
 * A quarter of the tufts sit *past* the branch envelope, which is what makes the
 * alpha edge fringed rather than cut.
 */
function needleTile(ctx, w, h, opts) {
  const {
    seed,
    base,
    tip,
    shade,
    stem,
    tufts = 170,
    // tuft radius as a fraction of the cell; the readable element
    tuftR = 0.038,
    needles = 13,
    needleW = 0.0034,
    // needles poke out along the tuft's own rachis by this much of its radius
    needleLen = 1.0,
    // how many tufts land outside the envelope, fringing the silhouette
    fringe = 0.26,
    // the card is wider than it is tall, so the painting is pre-stretched
    yGain = 1.3,
    shoots = 6,
    sag = 0.03,
    sweep = 0.5,
    // 'needle' fans of round strokes, 'scale' flat tapering ribbons (cedar)
    leaf = 'needle',
    // extra value spread; 0 is a flat card, 1 is sun to near-black in one cell
    contrast = 1.0,
    litFrom = -0.55,
    bake = {},
  } = opts;
  const rnd = mulberry32(seed);
  const midY = h * 0.5;
  ctx.lineCap = leaf === 'scale' ? 'butt' : 'round';
  ctx.lineJoin = 'round';

  const deep = mixRgb(shade, [0, 0, 0], 0.62);
  const ramp = [deep, mixRgb(deep, shade, 0.55), shade, mixRgb(shade, base, 0.6), base, mixRgb(base, tip, 0.55), tip];

  const axis = (t) => [w * (0.01 + t * 0.98), midY + Math.sin(t * Math.PI) * h * sag + (t - 0.5) * h * sag * 3];

  // --- skeleton: a main rachis plus alternating shoots ----------------------
  // Every shoot gets a value of its own, drawn from two populations rather than
  // from a continuum.
  //
  // This is the scale the mid distance is judged at and it was the one scale
  // with no variation on it. A tuft is 4% of the cell, so at thirty metres it is
  // under a pixel and averages away; the card outline is 20-25 px and survives;
  // between them sits the shoot, at 7-9 px, which survives and carried nothing —
  // every shoot's tone was the same smooth function of position plus a per-tuft
  // roll that averages out over the forty tufts on it. So a card arrived as one
  // flat lozenge with a soft edge, which is cut paper however finely the needles
  // inside it are drawn. Two populations and not a ramp, for the same reason
  // crownMosaic pushes toward its ends: a continuum averages back to the wash.
  const legs = [];
  {
    const [ax0, ay0] = axis(0);
    const [ax1, ay1] = axis(1);
    legs.push({ x0: ax0, y0: ay0, x1: ax1, y1: ay1, hw: h * 0.12, root: 0, main: true, bias: 0 });
    for (let i = 0; i < shoots; i++) {
      const t = 0.03 + (i / shoots) * 0.92 + rnd() * 0.05;
      const side = i % 2 === 0 ? -1 : 1;
      const [sx, sy] = axis(t);
      // shoots shorten toward the branch tip, so the envelope tapers
      const env = Math.pow(1 - t, 0.45) * 0.74 + 0.3;
      const len = w * 0.36 * env * (0.72 + rnd() * 0.56);
      const ang = side * (sweep + rnd() * 0.34);
      legs.push({
        x0: sx,
        y0: sy,
        x1: sx + Math.cos(ang) * len,
        y1: sy + Math.sin(ang) * len * yGain,
        hw: len * 0.36,
        root: t,
        bias: (rnd() < 0.46 ? -1 : 1) * (0.16 + rnd() * 0.26) * contrast,
      });
    }
  }

  // The woody rachis, tapered and stopped short of the tip so the last of the
  // branch is foliage. Drawn as segments through the same curve the tufts follow
  // rather than one straight line: a stem that runs dead straight from cell edge
  // to cell edge is a visible bar across the crown at any distance, and it was
  // the one hard line left in the alpha.
  for (const L of legs) {
    const segs = L.main ? 14 : 5;
    const reach = L.main ? 0.9 : 0.84;
    for (let i = 0; i < segs; i++) {
      const s0 = (i / segs) * reach;
      const s1 = ((i + 1) / segs) * reach;
      const at = (s) =>
        L.main ? axis(s) : [lerp(L.x0, L.x1, s), lerp(L.y0, L.y1, s) + Math.sin(s * Math.PI) * L.hw * 0.24];
      ctx.strokeStyle = rgbStr(stem, L.main ? 0.95 : 1.15);
      ctx.lineWidth = Math.max(0.8, w * (L.main ? 0.0095 : 0.0042) * (1 - s0 * 0.75) * (1 - L.root * 0.4));
      ctx.beginPath();
      ctx.moveTo(...at(s0));
      ctx.lineTo(...at(s1));
      ctx.stroke();
    }
  }

  // A soft smear of dark under each shoot, offset across and down the branch.
  // The tuft-scale contact shadows are sub-pixel past ten metres; this is the
  // same effect at the one scale that survives, and it is what puts a dark lane
  // between two neighbouring sprays instead of letting them merge.
  for (const L of legs) {
    if (L.main) continue;
    const off = L.hw * 0.45;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = rgbStr(deep, 1);
    ctx.lineWidth = L.hw * 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(L.x0 + off * 0.4, L.y0 + off);
    ctx.lineTo(L.x1 + off, L.y1 + off * 1.3);
    ctx.stroke();
    ctx.restore();
    ctx.lineCap = leaf === 'scale' ? 'butt' : 'round';
  }

  // --- tuft sites -----------------------------------------------------------
  const sites = [];
  const totalW = legs.reduce((a, L) => a + (L.main ? 0.7 : 1), 0);
  for (const L of legs) {
    const dx = L.x1 - L.x0;
    const dy = L.y1 - L.y0;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const n = Math.max(4, Math.round((tufts * (L.main ? 0.7 : 1)) / totalW));
    for (let i = 0; i < n; i++) {
      const s = 0.03 + Math.pow(rnd(), 0.8) * 0.96;
      const taper = Math.pow(1 - s, 0.5) * 0.85 + 0.2;
      const edge = rnd() < fringe;
      // signed offset in units of the local half width; fringe tufts overshoot
      let off = (rnd() * 2 - 1) * (edge ? 1.1 + rnd() * 0.7 : Math.pow(rnd(), 0.45));
      if (L.main) off *= 1.25;
      const hw = L.hw * taper;
      const x = L.x0 + ux * len * s - uy * off * hw;
      const y = L.y0 + uy * len * s + ux * off * hw * yGain;
      const r = w * tuftR * (0.55 + rnd() * 0.9) * (edge ? 0.72 : 1) * (0.7 + taper * 0.45);
      // Position drives value as much as chance does: the upper and outer tufts
      // are the ones a real spray presents to the sky, and a card whose light
      // side is random has no readable form however wide its spread is.
      const lit = clamp(0.46 + ((midY - y) / (h * 0.5)) * litFrom * -1 * 0.9 + (x / w) * 0.24);
      const tone = clamp(lit * (0.45 + contrast * 0.55) + Math.pow(rnd(), 1.5) * 0.62 * contrast - 0.1 + L.bias);
      sites.push({ x, y, r, ang: Math.atan2(uy, ux) + (rnd() - 0.5) * 1.5, tone, edge, s });
    }
  }
  // darkest first, so the tips a real spray shows the sun end up on top
  sites.sort((a, b) => a.tone - b.tone);

  // --- one tuft -------------------------------------------------------------
  const fan = (cx, cy, r, ang, n, col, lw, alpha) => {
    ctx.strokeStyle = rgbStr(col, 1, alpha);
    const rl = r * 1.35;
    for (let i = 0; i < n; i++) {
      const s = i / Math.max(1, n - 1);
      const px = cx + Math.cos(ang) * rl * (s - 0.2);
      const py = cy + Math.sin(ang) * rl * (s - 0.2) * yGain;
      const dir = i % 2 ? 1 : -1;
      const na = ang + dir * (0.7 + rnd() * 0.62) * (1 - s * 0.45);
      const nl = r * needleLen * (0.62 + rnd() * 0.62) * (1 - s * 0.28);
      ctx.lineWidth = lw * (0.72 + rnd() * 0.66);
      if (leaf === 'scale') {
        // a flat tapering ribbon: cedar carries scale leaves, not needles
        const ca = Math.cos(na);
        const sa = Math.sin(na) * yGain;
        const pw = lw * 1.5;
        ctx.beginPath();
        ctx.moveTo(px - sa * pw * 0.4, py + ca * pw * 0.4);
        ctx.quadraticCurveTo(px + ca * nl * 0.5 - sa * pw, py + sa * nl * 0.5 + ca * pw, px + ca * nl, py + sa * nl);
        ctx.quadraticCurveTo(
          px + ca * nl * 0.5 + sa * pw * 0.8,
          py + sa * nl * 0.5 - ca * pw * 0.8,
          px + sa * pw * 0.4,
          py - ca * pw * 0.4,
        );
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(
          px + Math.cos(na) * nl * 0.55,
          py + Math.sin(na) * nl * 0.5 * yGain,
          px + Math.cos(na) * nl,
          py + Math.sin(na) * nl * yGain,
        );
        ctx.stroke();
      }
    }
  };

  const lwOf = (r) => Math.max(1.2, w * needleW * (r / (w * tuftR)));
  for (const t of sites) {
    const n = Math.max(5, Math.round(needles * (0.6 + rnd() * 0.8)));
    const lw = lwOf(t.r);
    // Each tuft casts into the one behind it. Skipped on the fringe tufts, whose
    // whole job is to be a thin broken edge — giving those a shadow pass would
    // thicken exactly the silhouette that needs to stay ragged.
    if (!t.edge) {
      fan(t.x + t.r * 0.2, t.y + t.r * 0.34 * yGain, t.r * 0.94, t.ang, Math.round(n * 0.7), deep, lw * 1.45, 1);
    }
    // needle-scale value spread on top of the tuft's own, for the two metre view
    for (let k = 0; k < 2; k++) {
      const sub = clamp(t.tone + (k === 0 ? -0.16 : 0.13) * contrast);
      fan(t.x, t.y, t.r * (k === 0 ? 1 : 0.86), t.ang, Math.round(n * (k === 0 ? 0.6 : 0.55)), rampAt(ramp, sub), lw, 1);
    }
  }

  bakeSprayShading(ctx, w, h, bake);
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
  // Further toward the cool conifer green than the broadleaf tiles take it.
  // leafSun is a yellow-green with red well above blue, and at a 0.4 mix it was
  // still warm enough that a whole hillside of lit tips summed to khaki — which
  // is a colour a spruce stand never is.
  const sun = mixRgb(hexToRgb(PALETTE.leafSun), CONIFER_COOL, 0.56);
  const shadeC = mixRgb(hexToRgb(PALETTE.leafShade), CONIFER_COOL, 0.16);
  const woody = hexToRgb(PALETTE.barkDark);
  // 1024 a tile. The readable element is now the tuft rather than the needle, so
  // the budget goes on having 30-60 px of grain inside each of those rather than
  // on needles that vanish at the second mip either way.
  return atlas(
    'nat.needleAtlas',
    1024,
    [
      // 0 douglas fir: dark, dense, the workhorse
      (c, w, h) =>
        needleTile(c, w, h, {
          seed: 811,
          base: mixRgb(needle, sun, 0.12),
          tip: mixRgb(sun, needle, 0.3),
          shade: mixRgb(shadeC, needle, 0.24),
          stem: woody,
          tufts: 265,
          tuftR: 0.042,
          needles: 15,
          needleW: 0.0038,
          fringe: 0.26,
          shoots: 7,
          sweep: 0.52,
          sag: 0.02,
          contrast: 1.0,
          bake: { root: 0.34, axis: 0.2, rim: 0.2 },
        }),
      // 1 hemlock: finer, looser, droopy, a touch lighter
      (c, w, h) =>
        needleTile(c, w, h, {
          seed: 1213,
          base: mixRgb(needle, sun, 0.28),
          tip: mixRgb(sun, needle, 0.18),
          shade: mixRgb(shadeC, needle, 0.36),
          stem: mixRgb(woody, [90, 74, 58], 0.4),
          tufts: 205,
          tuftR: 0.05,
          needles: 13,
          needleW: 0.0032,
          needleLen: 1.15,
          fringe: 0.32,
          shoots: 6,
          sweep: 0.66,
          sag: 0.06,
          contrast: 1.1,
          bake: { root: 0.3, axis: 0.17, rim: 0.24 },
        }),
      // 2 cedar: flat scale-leaf sprays, blue-green.
      //
      // Its predecessor recursed a fan down four levels and filled most of the
      // cell with one near-solid pale shape — measured brighter than the sky it
      // was seen against, with a smooth alpha edge. It was single-handedly most
      // of the construction-paper read, since two of the five conifer species
      // draw from this cell.
      (c, w, h) =>
        needleTile(c, w, h, {
          seed: 1607,
          base: mixRgb(needle, [46, 96, 88], 0.4),
          tip: mixRgb(sun, [112, 156, 128], 0.5),
          shade: mixRgb(shadeC, [28, 56, 54], 0.45),
          stem: woody,
          leaf: 'scale',
          tufts: 230,
          tuftR: 0.046,
          needles: 12,
          needleW: 0.0044,
          needleLen: 1.1,
          fringe: 0.28,
          shoots: 7,
          sweep: 0.44,
          sag: 0.04,
          contrast: 1.05,
          bake: { root: 0.32, axis: 0.19, rim: 0.19 },
        }),
      // 3 dead / rust: sparse, warm, bare twigs showing through. Well down in
      // value — a distant snag is dark rust on grey wood and reads mainly as a
      // gap in the canopy, not as a khaki plume.
      (c, w, h) =>
        needleTile(c, w, h, {
          seed: 1913,
          base: [72, 52, 33],
          tip: [102, 78, 47],
          shade: [38, 29, 20],
          stem: mixRgb(woody, [70, 58, 48], 0.6),
          tufts: 118,
          tuftR: 0.038,
          needles: 10,
          needleW: 0.003,
          fringe: 0.38,
          shoots: 6,
          sweep: 0.6,
          sag: 0.04,
          contrast: 0.85,
          bake: { root: 0.26, axis: 0.14, rim: 0.14 },
        }),
    ],
    { bleed: mixRgb(shadeC, needle, 0.4) },
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

  twig(w * 0.03, h * 0.5, w * 0.97, h * 0.52, w * 0.01);
  const shoots = [];
  for (let i = 0; i < 7; i++) {
    const t = 0.07 + i * 0.132;
    const side = i % 2 ? 1 : -1;
    const ex = w * (t + 0.14);
    const ey = h * (0.5 + side * spread * (0.8 + rnd() * 0.5));
    twig(w * t, h * 0.5, ex, ey, w * 0.0055);
    // Value per cluster, in two populations. An individual leaf is two or three
    // pixels at the distance a crown is read from, so the twenty leaves on one
    // shoot average to that shoot's mean — and every shoot had the same mean,
    // which is why a maple card came back as one flat green shape with a jagged
    // edge. The cluster is the element that survives, so it is the element that
    // has to differ.
    shoots.push([ex, ey, side, (rnd() < 0.46 ? -1 : 1) * (0.14 + rnd() * 0.24)]);
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
    // palmatePath takes a radius, ovalPath a length, so a palmate leaf comes out
    // twice the size of an oval one for the same number
    if (shape === 'palmate') palmatePath(ctx, len * 0.5);
    else ovalPath(ctx, len, len * 0.34);
    ctx.fill();
    // The midrib used to be drawn at four tenths of the way to white and 0.7
    // alpha. At a leaf this size that is a one pixel line brighter than anything
    // else in the cell, and mipping smears it across the whole leaf: the crowns
    // came out veined with pale scratches. A real midrib at four metres is a
    // slightly lighter crease, and no more than that.
    ctx.strokeStyle = rgbStr(mixRgb(base, sun, 0.4), 1.02, 0.4);
    ctx.lineWidth = Math.max(0.6, len * 0.016);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len * 0.88, 0);
    ctx.stroke();
    ctx.restore();
  };

  // Leaves are hung off the shoots in clusters.
  //
  // Two things were making this read as cut paper rather than as a crown. The
  // gaps between the leaves carried a translucent dark fill at 0.26 alpha, and
  // wherever two of those overlapped the pair summed past the material's 0.34
  // cutoff — so the interior of every cluster came out as a *solid* hard-edged
  // patch and the outline of the patch was the paper. And tone was flat random,
  // which means a cluster's mean value was mid and it had neither a lit side nor
  // a dark core; the eye reads that as one shape however many leaves are in it.
  //
  // So: no fill between the leaves at all — the crown occlusion baked on the
  // geometry and the gradient below do that job without adding silhouette — and
  // tone is driven by where the leaf sits in the cluster, biased dark, so the
  // upper outer leaves are the lit ones and the ones near the twig are near
  // black.
  const sites = [];
  for (let i = 0; i < count; i++) {
    const [sx, sy, side, sbias] = shoots[i % shoots.length];
    const g = Math.floor(i / shoots.length) / Math.max(1, Math.ceil(count / shoots.length) - 1);
    const along = 0.1 + g * 1.0;
    const sc = h * leafLen * 2.4;
    // one leaf in five sits well outside the cluster, on a long petiole: without
    // outliers the mass has a smooth boundary, and a smooth boundary is paper
    const outlier = rnd() < 0.2;
    const spill = outlier ? 1.7 + rnd() * 1.3 : 1;
    const x = lerp(w * 0.5, sx, along) + (rnd() - 0.5) * sc * spill;
    const y = lerp(h * 0.5, sy, along) + (rnd() - 0.5) * sc * 0.95 * spill;
    const len = h * leafLen * (0.5 + Math.pow(rnd(), 1.3) * 0.85) * (outlier ? 0.78 : 1);
    const lit = clamp(0.42 + ((h * 0.5 - y) / (h * 0.5)) * 0.44 + (x / w) * 0.2);
    sites.push({
      x,
      y,
      len,
      ang: side * (0.3 + rnd() * 1.0) + (rnd() - 0.5) * 1.2,
      tone: clamp(lit * 0.72 + Math.pow(rnd(), 1.6) * 0.6 - 0.08 + sbias),
      flip: rnd() < 0.5,
    });
  }
  // darkest first: the leaves a real crown presents to the sky end up on top
  sites.sort((a, b) => a.tone - b.tone);
  for (const s of sites) {
    ctx.strokeStyle = rgbStr(stemCol, 1.2);
    ctx.lineWidth = Math.max(0.5, w * 0.003);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + Math.cos(s.ang) * s.len * 0.22, s.y + Math.sin(s.ang) * s.len * 0.22);
    ctx.stroke();
    drawLeaf(s.x, s.y, s.len, s.ang, s.tone, s.flip);
  }
  bakeSprayShading(ctx, w, h, { root: 0.3, axis: 0.2, rim: 0.16 });
}

export function leafAtlas() {
  const sun = mixRgb(hexToRgb(PALETTE.leafSun), CONIFER_COOL, 0.32);
  const mid = mixRgb(hexToRgb(PALETTE.leaf), CONIFER_COOL, 0.22);
  const shade = mixRgb(hexToRgb(PALETTE.leafShade), CONIFER_COOL, 0.14);
  const woody = hexToRgb(PALETTE.barkDark);
  return atlas(
    'nat.leafAtlas',
    768,
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
          count: 150,
          shape: 'palmate',
          leafLen: 0.062,
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
          count: 210,
          shape: 'oval',
          leafLen: 0.058,
          spread: 0.32,
        }),
      // 2 turning: deep bronze. A saturated yellow tile plus a warm per-instance
      // tint reads as a red blob against this fog, and a *pale* one reads worse
      // than that: at fifty metres it came out as a khaki parasol brighter than
      // the green around it, which the eye takes for dead foliage.
      (c, w, h) =>
        leafTile(c, w, h, {
          seed: 4409,
          sun: [104, 84, 48],
          mid: [72, 58, 34],
          shade: [38, 32, 20],
          stemCol: mixRgb(woody, [120, 92, 58], 0.5),
          count: 145,
          shape: 'palmate',
          leafLen: 0.066,
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
          count: 115,
          shape: 'oval',
          leafLen: 0.058,
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
  const { seed, base, sun, shade, fronds, pinnaeLen, arch, spread, tipY, stemW, crowns = 3, ragged = 0.44 } = opts;
  const rnd = mulberry32(seed);
  ctx.lineCap = 'round';

  const frond = (rootX, rootY, dirn, sc, vm, tilt) => {
    // Per-frond length. A rosette whose fronds all reach the same envelope is a
    // clean symmetric arrowhead, and an arrowhead is the most recognisable shape
    // on this floor — the notches are what stop three cards of it reading as the
    // same plant three times.
    const reach = sc * (1 - ragged * Math.pow(rnd(), 0.75));
    const tipX = rootX + w * (dirn * spread + tilt) * reach;
    const ty = rootY - (rootY - h * (tipY + Math.abs(dirn) * arch + rnd() * 0.06)) * reach;
    const ctrlX = lerp(rootX, tipX, 0.35);
    const ctrlY = lerp(rootY, ty, 0.72);
    const depth = 1 - Math.abs(dirn) * 0.55;
    // Whole fronds in shade next to whole fronds in light. Leaflet-scale noise
    // averages out by the second mip and the clump goes back to one value; a
    // frond is 20-40 px at working distance, which survives.
    const fv = vm * (0.4 + Math.pow(rnd(), 0.7) * 1.05);
    // Light and shade in bands *along* the frond, at four or five to a length.
    // The per-leaflet jitter below is the right idea at the wrong frequency: it
    // averages to grey within two mips, and past ten metres a frond then arrives
    // as one flat wedge — a rosette of five of those is the pale spiky thing the
    // middle distance was full of. A band is 30-50 px in the tile, so it is still
    // two or three pixels on screen at twenty-five metres.
    const bandPhase = rnd() * 6.283;
    const bandF = 8 + rnd() * 7;

    // Tapered, in segments. A constant-width rachis is a stick, and on the
    // sparser tiles the pinnae do not cover enough of it to hide that — thirteen
    // fronds of it read as a fan of even spokes, which is the one shape on this
    // floor nothing in a forest makes.
    const bx = (u) => lerp(lerp(rootX, ctrlX, u), lerp(ctrlX, tipX, u), u);
    const by = (u) => lerp(lerp(rootY, ctrlY, u), lerp(ctrlY, ty, u), u);
    ctx.strokeStyle = rgbStr(mixRgb(base, sun, 0.15), (0.7 + depth * 0.3) * Math.min(1.15, fv));
    for (let k = 0; k < 5; k++) {
      const u0 = k / 5;
      const u1 = (k + 1) / 5;
      ctx.lineWidth = w * stemW * Math.max(0.45, sc) * (1 - u0 * 0.8);
      ctx.beginPath();
      ctx.moveTo(bx(u0), by(u0));
      ctx.lineTo(bx(u1), by(u1));
      ctx.stroke();
    }

    // Pinnae are filled tapered leaflets with their own midrib rather than
    // round-capped strokes. At a metre from the lens a stroke reads as a stroke:
    // the cap gives every leaflet the same blunt sausage end, and a fern seen
    // that close is mostly edges.
    // 34, not 44. At forty-four the leaflets overlap their neighbours by more
    // than half their width and the frond closes into a continuous blade with a
    // scalloped rim — which is a leaf, not a frond, and is what the notches were
    // supposed to prevent. The gaps between them are the structure.
    const n = Math.max(14, Math.round(34 * reach));
    for (let i = 1; i < n; i++) {
      const s = i / n;
      const band = 0.92 + 0.42 * Math.cos(s * bandF + bandPhase);
      const mx = lerp(lerp(rootX, ctrlX, s), lerp(ctrlX, tipX, s), s);
      const my = lerp(lerp(rootY, ctrlY, s), lerp(ctrlY, ty, s), s);
      const nx = lerp(lerp(rootX, ctrlX, s + 0.02), lerp(ctrlX, tipX, s + 0.02), s + 0.02);
      const ny = lerp(lerp(rootY, ctrlY, s + 0.02), lerp(ctrlY, ty, s + 0.02), s + 0.02);
      const along = Math.atan2(ny - my, nx - mx);
      const scallop = 0.82 + 0.18 * Math.cos(i * 2.1);
      // Leaflet size tracks the crown, not the frond. A short frond on a big
      // plant carries full-size pinnae and simply has fewer of them; shrinking
      // both together made every notched frond lose area as the square and the
      // cell emptied out.
      const plen = w * pinnaeLen * sc * Math.sin(clamp(s * 1.12) * Math.PI * 0.94) * (0.78 + rnd() * 0.4) * scallop;
      const pwid = w * (0.019 - s * 0.009) * sc * (0.8 + rnd() * 0.45);
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
        ctx.fillStyle = rgbStr(col, (0.72 + tone * 0.5) * fv * band);
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
        // A crease, not a highlight. Lit veins on every leaflet of every frond
        // put a pale straight stroke on the outside of the silhouette hundreds
        // of times per cell, and pale straight strokes read as spines.
        if (plen > w * 0.045) {
          ctx.strokeStyle = rgbStr(mixRgb(col, shade, 0.55), fv, 0.4);
          ctx.lineWidth = Math.max(0.6, pwid * 0.28);
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.quadraticCurveTo(mx + ca * plen * 0.5, my + sa * plen * 0.5 - plen * 0.16, mx + ca * plen * 0.86, my + sa * plen * 0.86);
          ctx.stroke();
        }
      }
    }
  };

  // Several crowns of different size and value per cell, so the repeat unit sits
  // well below the card. With one crown the card *is* the plant, and a floor
  // scattered with one plant reads as stamped however many prototypes and yaws
  // are behind it.
  const heads = [];
  for (let c = 0; c < crowns; c++) {
    const lead = c === 0;
    heads.push({
      // the lead crown holds the middle of the cell and the rest crowd it, so
      // the card still fills its area — spreading them evenly across the tile
      // put both crowns of a pair half outside the clip rect
      x: lead ? w * (0.5 + (rnd() - 0.5) * 0.16) : w * (0.5 + (c % 2 ? 1 : -1) * (0.14 + rnd() * 0.26)),
      y: h * (1.0 - rnd() * 0.06),
      s: lead ? 0.94 + rnd() * 0.14 : 0.44 + rnd() * 0.42,
      n: Math.max(3, Math.round(fronds * (lead ? 1 : 0.42 + rnd() * 0.42))),
      v: lead ? 0.95 + rnd() * 0.25 : 0.42 + rnd() * 0.72,
      tilt: (rnd() - 0.5) * 0.24,
    });
  }
  heads.sort((a, b) => a.s - b.s);

  for (const hd of heads) {
    const order = [];
    for (let f = 0; f < hd.n; f++) order.push(f);
    // draw the outer fronds first so the middle of the crown sits in front
    order.sort((a, b) => Math.abs(b - (hd.n - 1) / 2) - Math.abs(a - (hd.n - 1) / 2));
    for (const f of order) {
      const t = hd.n === 1 ? 0.5 : f / (hd.n - 1);
      // Jittered by most of a slot. Fronds spaced exactly evenly around a crown
      // are a fan of equal angles, and at half a metre across — where the
      // leaflets are five pixels and the spacing is fifteen — that is the shape
      // of a garden rake, not of a fern. Uneven spacing lets neighbours merge in
      // pairs and leaves real gaps elsewhere.
      const dirn = Math.max(-1.15, Math.min(1.15, (t - 0.5) * 2 + ((rnd() - 0.5) * 2.6) / hd.n));
      frond(hd.x + w * dirn * 0.05 * hd.s, hd.y, dirn, hd.s, hd.v, hd.tilt);
    }
  }
  shadeCore(ctx, w, h, 0.32, { from: 'bottom' });
  shadeCore(ctx, w, h, 0.12);
}

export function fernAtlas() {
  const fern = mixRgb(mixRgb(hexToRgb(PALETTE.fern), CONIFER_COOL, 0.3), FLOOR_DARK, 0.32);
  const sun = mixRgb(mixRgb(hexToRgb(PALETTE.leafSun), CONIFER_COOL, 0.48), FLOOR_DARK, 0.52);
  const shade = mixRgb(mixRgb(hexToRgb(PALETTE.leafShade), CONIFER_COOL, 0.16), FLOOR_DARK, 0.2);
  return atlas(
    'nat.fernAtlas',
    512,
    [
      // 0 sword fern: one tall crown with a juvenile crowded against it
      (c, w, h) =>
        frondTile(c, w, h, {
          seed: 5501,
          base: fern,
          sun: mixRgb(sun, fern, 0.25),
          shade,
          fronds: 13,
          pinnaeLen: 0.11,
          arch: 0.2,
          spread: 0.44,
          tipY: 0.05,
          stemW: 0.008,
          crowns: 2,
          ragged: 0.34,
        }),
      // 1 bracken: a spreading patch of four separate stems, no centre at all
      (c, w, h) =>
        frondTile(c, w, h, {
          seed: 6101,
          base: mixRgb(fern, sun, 0.1),
          sun: mixRgb(sun, [116, 128, 96], 0.24),
          shade: mixRgb(shade, fern, 0.3),
          fronds: 8,
          pinnaeLen: 0.14,
          arch: 0.34,
          spread: 0.58,
          tipY: 0.14,
          stemW: 0.0095,
          crowns: 4,
          ragged: 0.56,
        }),
      // 2 deer fern: small, dark, several tight rosettes low down
      (c, w, h) =>
        frondTile(c, w, h, {
          seed: 6703,
          base: mixRgb(fern, [0, 0, 0], 0.22),
          sun: mixRgb(sun, fern, 0.5),
          shade: mixRgb(shade, [0, 0, 0], 0.3),
          fronds: 13,
          pinnaeLen: 0.115,
          arch: 0.26,
          spread: 0.4,
          tipY: 0.12,
          stemW: 0.007,
          crowns: 3,
          ragged: 0.44,
        }),
      // 3 dying fern: rust and ochre, half collapsed
      (c, w, h) =>
        frondTile(c, w, h, {
          seed: 7207,
          base: mixRgb([84, 64, 38], FLOOR_DARK, 0.3),
          sun: mixRgb([104, 84, 50], FLOOR_DARK, 0.22),
          shade: mixRgb([44, 34, 22], FLOOR_DARK, 0.3),
          fronds: 12,
          pinnaeLen: 0.155,
          arch: 0.36,
          spread: 0.54,
          tipY: 0.16,
          stemW: 0.0075,
          crowns: 3,
          ragged: 0.36,
        }),
    ],
    { bleed: mixRgb(shade, fern, 0.55) },
  );
}

function grassTile(ctx, w, h, opts) {
  const { seed, green, dry, blades, tall, wide, seedHeads } = opts;
  const rnd = mulberry32(seed);
  ctx.lineCap = 'round';
  // Value carried in tufts across the tile rather than per blade. A blade is
  // well under a pixel wide at any distance the scatter is actually seen from,
  // so per-blade value averages straight back out to the mean; a bunch is 20-40
  // px and survives, which is what gives the tuft a lit side and a dark side.
  const tufts = [];
  for (let k = 0; k < 22; k++) tufts.push(0.4 + Math.pow(rnd(), 0.8) * 1.1);
  for (let i = 0; i < blades; i++) {
    // spread the roots across the tile: these cards are scattered as wide
    // patches, so blades bunched at the centre leave gaps between instances
    const x0 = w * (0.5 + (rnd() - 0.5) * 0.86);
    const lean = (rnd() - 0.5) * w * wide;
    const top = h * (1 - tall * (0.45 + rnd() * 0.62));
    const tv = tufts[Math.min(tufts.length - 1, Math.max(0, Math.floor((x0 / w) * tufts.length)))] * (0.86 + rnd() * 0.3);
    // Skewed hard toward green. A flat random mix put the average blade halfway
    // to straw, which lands red level with green — and a stand of grass whose
    // mean hue is yellow reads as chartreuse no matter what the lighting does.
    // Dry blades want to be the exception picked out against green, not the mean.
    const tone = Math.pow(clamp(rnd()), 2.2);
    const col = mixRgb(green, dry, tone * 0.85);
    const grad = ctx.createLinearGradient(x0, h, x0 + lean, top);
    grad.addColorStop(0, rgbStr(mixRgb(col, [12, 20, 12], 0.55), tv));
    grad.addColorStop(0.4, rgbStr(col, tv * 0.9));
    grad.addColorStop(1, rgbStr(col, tv * 1.08));
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
  shadeCore(ctx, w, h, 0.28, { from: 'bottom' });
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
  const { seed, sun, mid, shade, stemCol, stems, leafLen, berry, form = 'upright' } = opts;
  const rnd = mulberry32(seed);
  ctx.lineCap = 'round';

  // Nodes carrying sprays, not single leaves strung along a cane.
  //
  // The leaf was the thing that gave the whole verge away. At `leafLen` 0.13 on
  // a 512 cell a big one came out 140 px long, and the card it lives on is
  // authored between 1.3 and 2.3 m wide — so the render was drawing salal with
  // thirty-centimetre leaves, which is a rubber plant. Sixty of them filled the
  // cell, which meant one leaf was a tenth of the plant and the eye had nothing
  // smaller to look at: flat paddles, exactly the scale-of-detail tell.
  //
  // Roughly a fifth the leaf area and five times as many, arranged two to four
  // per node the way a real woody shrub carries them. Same coverage, but now
  // the silhouette is chewed at the centimetre scale instead of being a dozen
  // smooth ovals, and a spray can catch light as a unit.
  const stem = (rootX, rootY, tipX, tipY, wid, nodes, sc, vm, bare) => {
    // Woody, not black. A twig at the palette's darkest bark reads as a hole
    // punched through the leaf mass at any distance past a couple of metres.
    ctx.strokeStyle = rgbStr(mixRgb(stemCol, mid, 0.22), 0.8 + rnd() * 0.5);
    ctx.lineWidth = wid;
    const ctrlX = lerp(rootX, tipX, 0.3);
    const ctrlY = lerp(rootY, tipY, 0.7);
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();
    const along = Math.atan2(tipY - rootY, tipX - rootX);
    for (let i = 1; i <= nodes; i++) {
      const u = bare + (1 - bare) * (i / nodes);
      const mx = lerp(lerp(rootX, ctrlX, u), lerp(ctrlX, tipX, u), u);
      const my = lerp(lerp(rootY, ctrlY, u), lerp(ctrlY, tipY, u), u);
      // One value for the whole spray before the per-leaf jitter. This is the
      // tier the eye actually reads at fifteen metres — individual leaves have
      // mipped away by then, and without it the card averages to one flat
      // green however much contrast the leaves carry underneath.
      const nodeV = vm * (0.5 + Math.pow(rnd(), 0.85) * 0.78);
      const cluster = 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < cluster; k++) {
        const side = (i + k) % 2 ? 1 : -1;
        const len = w * leafLen * sc * (0.6 + rnd() * 0.85);
        const ang = along + side * (0.5 + rnd() * 1.0) + (rnd() - 0.5) * 0.45;
        const tone = clamp(0.15 + u * 0.5 + rnd() * 0.4);
        const col = tone < 0.35 ? mixRgb(shade, mid, tone / 0.35) : mixRgb(mid, sun, (tone - 0.35) / 0.65);
        // Per-leaf value on top of the ramp, biased dark. The ramp alone spans
        // barely a stop once shade, mid and sun have all been pulled toward the
        // floor colour, and a bush the eye can describe with one brightness is a
        // cut shape however good its outline is.
        const lv = nodeV * (0.66 + Math.pow(rnd(), 0.75) * 0.62);
        // One leaf in ten is turned over. A leaf back is paler, greyer and
        // matte, and a bush with none of them showing is a bush where every
        // leaf faces the same way. Held to about a third of a stop above the
        // face: painted at a real underside value these were the brightest
        // thing in the frame and the verge came back as a bed of white flecks.
        const back = rnd() < 0.1;
        const face = back ? mixRgb(mixRgb(col, sun, 0.2), [112, 116, 96], 0.3) : col;
        ctx.save();
        ctx.translate(mx + (rnd() - 0.5) * len * 0.55, my + (rnd() - 0.5) * len * 0.55);
        ctx.rotate(ang);
        const grad = ctx.createLinearGradient(0, -len * 0.3, len, len * 0.3);
        grad.addColorStop(0, rgbStr(mixRgb(face, shade, back ? 0.24 : 0.42), lv));
        grad.addColorStop(1, rgbStr(mixRgb(face, sun, back ? 0.16 : 0.32), lv * 1.14));
        ctx.fillStyle = grad;
        ovalPath(ctx, len, len * (0.36 + rnd() * 0.14));
        ctx.fill();
        // A shaded crease along the midrib. This used to be a stroke 35% of the
        // way to white, which put a pale straight line across every leaf and well
        // out over the silhouette — a hundred of those per cell is what made the
        // verge read as beds of identical spiky rosettes. Only on leaves wide
        // enough to hold one; below that it is a dark speck, not a vein.
        if (len > w * 0.045) {
          ctx.strokeStyle = rgbStr(mixRgb(face, shade, 0.6), lv, 0.4);
          ctx.lineWidth = Math.max(0.55, len * 0.05);
          ctx.beginPath();
          ctx.moveTo(len * 0.1, 0);
          ctx.lineTo(len * 0.76, 0);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (berry && rnd() < 0.16) {
        ctx.fillStyle = rgbStr([52, 44, 62], 1);
        ctx.beginPath();
        ctx.arc(mx, my, w * 0.009, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  if (form === 'mound') {
    // salal: no single stem, a low dome of short shoots rooted across the whole
    // footprint. Read from above it is a mass, from the side a bank.
    for (let s = 0; s < stems; s++) {
      const t = s / Math.max(1, stems - 1);
      const rx = w * (0.12 + t * 0.76 + (rnd() - 0.5) * 0.1);
      const ry = h * (0.99 - rnd() * 0.04);
      const dome = Math.sin(t * Math.PI) * 0.55 + 0.2;
      stem(rx, ry, rx + w * (rnd() - 0.5) * 0.3, h * (1 - dome * (0.72 + rnd() * 0.3)), w * 0.0065, 10, 0.9 + rnd() * 0.4, 0.7 + rnd() * 0.7, 0.1);
    }
  } else if (form === 'sprawl') {
    // vine maple in shade: everything held out sideways from one low fork, so
    // the silhouette is wide and flat rather than another dome
    const rootX = w * (rnd() < 0.5 ? 0.16 : 0.84);
    for (let s = 0; s < stems; s++) {
      const t = s / Math.max(1, stems - 1);
      const dir = rootX < w * 0.5 ? 1 : -1;
      stem(
        rootX,
        h * 0.99,
        rootX + dir * w * (0.35 + t * 0.6),
        h * (0.3 + t * 0.5 + rnd() * 0.16),
        w * 0.008,
        11,
        1.0 + rnd() * 0.45,
        0.65 + rnd() * 0.75,
        0.16,
      );
    }
  } else if (form === 'open') {
    // huckleberry: long bare canes with the leaves only near the tips, so the
    // card is mostly holes and the ground shows through the stand
    for (let s = 0; s < stems; s++) {
      const t = stems === 1 ? 0.5 : s / (stems - 1);
      const dirn = (t - 0.5) * 2;
      stem(
        w * (0.5 + dirn * 0.08),
        h * 0.99,
        w * (0.5 + dirn * 0.5),
        h * (0.04 + Math.abs(dirn) * 0.34 + rnd() * 0.14),
        w * 0.006,
        8,
        1.15 + rnd() * 0.4,
        0.6 + rnd() * 0.8,
        0.42,
      );
    }
  } else {
    for (let s = 0; s < stems; s++) {
      const t = stems === 1 ? 0.5 : s / (stems - 1);
      const dirn = (t - 0.5) * 2;
      stem(
        w * 0.5,
        h * 0.99,
        w * (0.5 + dirn * 0.42),
        h * (0.08 + Math.abs(dirn) * 0.3 + rnd() * 0.1),
        w * 0.0075,
        11,
        1,
        0.7 + rnd() * 0.7,
        0.11,
      );
    }
  }
  shadeCore(ctx, w, h, 0.3, { from: 'bottom' });
  shadeCore(ctx, w, h, 0.12);
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
  // A stop down again. At 671 stalks these were the brightest and the only
  // off-green thing on the floor, so the eye found every one of them.
  const bells = [78, 60, 74];
  const fire = [84, 54, 66];

  // The card this cell lands on is three and a third times taller than it is
  // wide and the cell is square, so everything painted here is stretched
  // vertically by that factor when it reaches the plant. A round floret painted
  // round therefore arrives as a vertical smear, and eighteen of them at radius
  // 0.23w overlapped into one unbroken column — which at 2.5 m from the detail
  // camera was a pale pink plank, not a flower.
  //
  // So: florets painted a third as tall as they are wide, small enough to leave
  // real gaps, each hung off the stem on its own pedicel. The gaps are the whole
  // point — a spike reads as separate flowers because you can see the stem
  // between them.
  const SQUASH = 0.3;
  const spike = (ctx, w, h, seed, petal, tall) => {
    const rnd = mulberry32(seed);
    ctx.lineCap = 'round';
    const sway = (rnd() - 0.5) * w * 0.2;
    ctx.strokeStyle = rgbStr(stemC, 1);
    ctx.lineWidth = w * 0.035;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h);
    ctx.quadraticCurveTo(w * 0.5 + sway, h * 0.5, w * 0.5 + sway * 1.4, h * 0.02);
    ctx.stroke();
    const stemX = (s) => w * 0.5 + 2 * (1 - s) * s * sway + s * s * sway * 1.4;
    const n = tall ? 22 : 15;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const y = h * (0.05 + t * 0.9) + (rnd() - 0.5) * h * 0.022;
      const sx = stemX(1 - t);
      const side = i % 2 ? 1 : -1;
      // Buds at the tip, open bells below them, spent ones lowest — a spike
      // opens from the bottom up. Painted the other way round the fattest part of
      // the silhouette sits at the very top, which reads as a blob on a stick.
      const open = smoothstep(0.06, 0.44, t);
      const spent = smoothstep(0.74, 1.0, t);
      const rx = w * (0.05 + open * 0.105) * (1 - spent * 0.45) * (0.78 + rnd() * 0.44);
      const ry = rx * SQUASH * (0.8 + rnd() * 0.5);
      const cx = sx + side * (w * 0.03 + rx * 0.7);
      const col = mixRgb(mixRgb(green, petal, 0.3 + open * 0.7), [0, 0, 0], (1 - open) * 0.3 + spent * 0.26);
      ctx.strokeStyle = rgbStr(mixRgb(stemC, col, 0.3), 0.95);
      ctx.lineWidth = w * 0.018;
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.lineTo(cx - side * rx * 0.35, y - ry * 0.35);
      ctx.stroke();
      // Throat then lip: two values inside one flower. A spike painted at one
      // value per floret averages to a single pink however many florets it has.
      const tilt = side * (0.12 + rnd() * 0.1);
      ctx.fillStyle = rgbStr(mixRgb(col, [0, 0, 0], 0.34), 0.95);
      ctx.beginPath();
      ctx.ellipse(cx, y, rx, ry, tilt, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgbStr(mixRgb(col, petal, 0.3), 0.88 + rnd() * 0.12);
      ctx.beginPath();
      ctx.ellipse(cx + side * rx * 0.24, y + ry * 0.32, rx * 0.66, ry * 0.58, tilt, 0, Math.PI * 2);
      ctx.fill();
    }
    shadeCore(ctx, w, h, 0.16);
  };

  // Broad overlapping leaves from three points along the bottom, not sixteen
  // thin ones radiating from one. Painted the second way, and squashed onto a
  // card two thirds as tall as it is wide, the side leaves come out barely a
  // pixel across and the whole plant reads as a garden rake lying in the duff —
  // the single most man-made-looking thing anywhere on the floor.
  const basal = (ctx, w, h, seed, lanceolate) => {
    const rnd = mulberry32(seed);
    ctx.lineCap = 'round';
    for (let c = 0; c < 3; c++) {
      const cx = w * (0.5 + (c - 1) * (0.2 + rnd() * 0.12));
      const cy = h * (0.99 - rnd() * 0.05);
      const sc = c === 1 ? 1 : 0.6 + rnd() * 0.32;
      const n = 6 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI * 0.5 + (i / (n - 1) - 0.5) * 2.3 + (rnd() - 0.5) * 0.45;
        const len = h * sc * (lanceolate ? 0.4 + rnd() * 0.44 : 0.28 + rnd() * 0.38);
        const wid = len * (lanceolate ? 0.2 + rnd() * 0.12 : 0.28 + rnd() * 0.14);
        const bend = (rnd() - 0.5) * len * 0.5;
        const tone = 0.2 + Math.pow(rnd(), 0.8) * 0.9;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a + Math.PI * 0.5);
        ctx.fillStyle = rgbStr(mixRgb(mixRgb(green, [0, 0, 0], 0.34), mixRgb(green, CONIFER_COOL, 0.4), tone), 0.55 + tone * 0.6);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-wid, -len * 0.4, bend - wid * 0.7, -len * 0.88, bend, -len);
        ctx.bezierCurveTo(bend + wid * 0.7, -len * 0.88, wid, -len * 0.4, 0, 0);
        ctx.fill();
        ctx.restore();
      }
    }
    shadeCore(ctx, w, h, 0.3, { from: 'bottom' });
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
      // Salal: leathery, blue-green, the darkest and coolest of the four. The
      // four cells used to be three shades of the same green plus one olive,
      // and a stand assembled from them measured as one plant however the
      // per-instance tints were spread on top — a multiply cannot introduce a
      // hue the atlas does not already contain.
      (c, w, h) =>
        shrubTile(c, w, h, {
          seed: 10301,
          form: 'mound',
          sun: mixRgb(mixRgb(sun, FLOOR_DARK, 0.24), [72, 112, 104], 0.3),
          mid: mixRgb(mixRgb(mid, FLOOR_DARK, 0.18), [46, 78, 74], 0.28),
          shade: mixRgb(shade, [24, 40, 42], 0.3),
          stemCol: mixRgb(woody, [90, 62, 44], 0.5),
          stems: 14,
          leafLen: 0.058,
          berry: true,
        }),
      // Huckleberry: thin, bright, yellow-green, the one that catches light
      (c, w, h) =>
        shrubTile(c, w, h, {
          seed: 10709,
          form: 'open',
          sun: mixRgb(mixRgb(sun, mid, 0.5), [124, 132, 66], 0.36),
          mid: mixRgb(mixRgb(mid, [0, 0, 0], 0.2), [86, 94, 46], 0.32),
          shade,
          stemCol: woody,
          stems: 16,
          leafLen: 0.05,
          berry: false,
        }),
      // a turning shrub, but a tired olive one: gold at this saturation is a
      // quarter of every shrub instance and it dragged the whole verge yellow
      (c, w, h) =>
        shrubTile(c, w, h, {
          seed: 11311,
          form: 'sprawl',
          sun: [104, 96, 60],
          mid: [74, 70, 44],
          shade: [44, 42, 28],
          stemCol: mixRgb(woody, [116, 90, 60], 0.5),
          stems: 12,
          leafLen: 0.062,
          berry: false,
        }),
      // Vine maple: a plain mid green, warmer than the salal, kept as the
      // neutral the other three read against
      (c, w, h) =>
        shrubTile(c, w, h, {
          seed: 11903,
          sun: mixRgb(sun, [132, 158, 118], 0.36),
          mid: mixRgb(mid, hexToRgb(PALETTE.fern), 0.5),
          shade,
          stems: 14,
          stemCol: woody,
          leafLen: 0.057,
          berry: true,
        }),
    ],
    { bleed: mixRgb(shade, mid, 0.5) },
  );
}

/**
 * The part of the floor that is not green.
 *
 * The verge came out as a band of pale sage at one saturation, and no amount of
 * value spread inside that family fixes it: a stand of one hue reads as one
 * plant however many silhouettes are in it. The fern, grass and shrub atlases
 * are all painted in the same green because they are all the same green plants,
 * so the answer is a fourth set that is not — dead bracken in rust, huckleberry
 * turned bronze-red, a glaucous grey-blue mat, dry sedge in straw.
 *
 * Painted, not tinted. Multiplying a green atlas by a warm tint gives khaki and
 * multiplying it by a cool one gives grey-green; neither is a different hue,
 * they are the same hue at lower saturation. Rust has to be painted rust.
 */
export function understoryAtlas() {
  // Dead bracken, not autumn maple. Painted at anything like a real rust these
  // came out as the brightest and most saturated thing anywhere in the frame —
  // a bed of orange stickers on a dark floor, which is worse than the sage band
  // it replaced. Everything here is pulled hard toward the floor colour and sits
  // *below* the greens in value: this material is a year dead, in shade, wet.
  // Down toward a dark neutral, not toward FLOOR_DARK. FLOOR_DARK is a green, so
  // taking a rust down with it costs the hue as well as the value and the cell
  // comes back olive-brown — which is the sage family again by another route.
  const duff = [26, 20, 16];
  const down = (c, k) => mixRgb(c, duff, k);
  const rustMid = down([112, 62, 32], 0.3);
  // The sun swatch is what decides whether this reads as dead bracken or as a
  // salmon flower: at a real sunlit-dead-frond value a lit clump came out as the
  // brightest and pinkest thing in the frame.
  const rustSun = down([134, 84, 44], 0.28);
  const rustShade = down([52, 30, 18], 0.3);
  const bronzeMid = down([112, 58, 42], 0.34);
  const bronzeSun = down([146, 84, 54], 0.3);
  const bronzeShade = down([48, 26, 22], 0.34);
  // The one cool member, and the one that has to be held down hardest: bloom on
  // a leaf is a low-contrast effect, and painted at a real glaucous value this
  // cell measured a stop above every green on the floor.
  const slateMid = [32, 46, 50];
  const slateSun = [50, 68, 73];
  const slateShade = [16, 23, 26];
  const strawGreen = mixRgb([88, 86, 56], FLOOR_DARK, 0.38);
  const strawDry = mixRgb([124, 108, 70], FLOOR_DARK, 0.36);
  return atlas(
    'nat.understoryAtlas',
    512,
    [
      // 0 dead bracken: rust and ochre, collapsed, the frond outline still there
      (c, w, h) =>
        frondTile(c, w, h, {
          seed: 15101,
          base: rustMid,
          sun: rustSun,
          shade: rustShade,
          fronds: 11,
          pinnaeLen: 0.15,
          arch: 0.34,
          spread: 0.58,
          tipY: 0.14,
          stemW: 0.008,
          crowns: 3,
          ragged: 0.58,
        }),
      // 1 huckleberry turned: bronze-red, open and twiggy, berries still on it
      (c, w, h) =>
        shrubTile(c, w, h, {
          seed: 15211,
          form: 'open',
          sun: bronzeSun,
          mid: bronzeMid,
          shade: bronzeShade,
          stemCol: [66, 44, 34],
          stems: 9,
          leafLen: 0.115,
          berry: true,
        }),
      // 2 glaucous mat: grey-blue, low and dense, the coolest thing down here
      (c, w, h) =>
        shrubTile(c, w, h, {
          seed: 15307,
          form: 'mound',
          sun: slateSun,
          mid: slateMid,
          shade: slateShade,
          stemCol: [52, 50, 44],
          stems: 9,
          leafLen: 0.125,
          berry: true,
        }),
      // 3 dry sedge: straw over a tired green, the warm neutral of the set
      (c, w, h) => grassTile(c, w, h, { seed: 15401, green: strawGreen, dry: strawDry, blades: 86, tall: 0.8, wide: 0.46, seedHeads: true }),
    ],
    { bleed: mixRgb(rustShade, slateShade, 0.5) },
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

        // Four layers, and the front two are deliberately sparse and narrow.
        //
        // The old three all ran at one tree per six pixels against a crown fifty
        // pixels wide, so every leader was buried in its neighbours and the band
        // came out as a soft dark cloud with a smooth top — a bush, not a
        // treeline. What a real one has is a *ragged* upper edge: individual
        // leaders standing clear of the mass with sky between them. That is what
        // `emergent` is for, and it only works if it is thin on the ground.
        const layers = [
          { n: 200, col: mixRgb(deep, haze, 0.55), hi: [0.26, 0.46], base: 0.74, alpha: 0.82, halo: 0, wid: [0.13, 0.07] },
          { n: 150, col: mixRgb(deep, haze, 0.32), hi: [0.36, 0.62], base: 0.86, alpha: 0.9, halo: 0.16, wid: [0.12, 0.07] },
          { n: 92, col: deep, hi: [0.44, 0.8], base: 0.97, alpha: 1.0, halo: 0.2, wid: [0.1, 0.06] },
          // emergent leaders: half the count of the layer below, a third the
          // width, and reaching to the top of the strip
          { n: 46, col: mixRgb(deep, [0, 0, 0], 0.25), hi: [0.7, 1.02], base: 0.99, alpha: 1.0, halo: 0.12, wid: [0.045, 0.03] },
        ];
        for (const L of layers) {
          for (let i = 0; i < L.n; i++) {
            const cx = ((i + rnd() * 2.4 - 0.7) / L.n) * cw;
            const height = ch * lerp(L.hi[0], L.hi[1], Math.pow(rnd(), 1.4));
            conifer(cx, ch * L.base, height * (L.wid[0] + rnd() * L.wid[1]), height, L.col, L.alpha, L.halo);
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
    // sRGB hex, same reason as deadWoodMaps: as raw triples these were linear, so
    // the rock's *median* albedo was sRGB 190 and its darkest was 168 — a white
    // paper boulder with a slightly whiter top. Granite in canopy shade is a mid
    // stone grey with a dark side, and the lichen is the only bright thing on it.
    const grey = hexToRgb(0x6e6c68);
    const pale = hexToRgb(0x93918a);
    const dark = hexToRgb(0x2b2b2a);
    const lichenA = hexToRgb(0x93a06a);
    const lichenB = hexToRgb(0xa8ab92);
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
