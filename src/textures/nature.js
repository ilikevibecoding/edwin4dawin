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
// Savanna: trees, grass, scrub, rock and earth.
//
// Foliage is drawn into 2x2 canvas atlases: four species / states per texture,
// so one material and one draw call still covers a mixed stand. Every cutout
// goes through `cutoutTexture`, which dilates the colour past the alpha edge —
// without that, mipmapping averages the transparent side of the edge into the
// visible side and distant foliage grows a black halo.
//
// Colours here are sRGB triples written as they will appear on the canvas.
// `hexToRgb` returns *linear* components, so anything routed through it lands
// about a stop and a half darker than the hex reads; the wood constants below
// are the only ones that still go that way, because the log and end-grain
// painters were tuned against it.
// ---------------------------------------------------------------------------

/** Wood colours for the bark painters, in the hex-through-hexToRgb convention. */
const WOOD = {
  barkLight: 0x7a6a58,
  bark: 0x54463a,
  barkDark: 0x2c241e,
};

/**
 * The savanna palette, as sRGB canvas triples.
 *
 * Straw first, then olive, then red earth — in that order of area. Grass is the
 * ground in a savanna, and it is gold-to-khaki with green only where there is
 * water or shade; the trees are a grey-olive, never the saturated green of a
 * temperate crown; and the earth between is a red-brown laterite that shows
 * through everything. Nothing here is cool except the far haze.
 */
const SAV = {
  strawSun: [196, 178, 128],
  straw: [170, 150, 102],
  khaki: [142, 124, 74],
  dryBrown: [112, 88, 52],
  duff: [78, 60, 36],
  redOat: [150, 92, 54],
  plume: [198, 182, 146],
  greenGrass: [104, 120, 64],
  greenDeep: [58, 72, 32],
  acaciaSun: [140, 146, 108],
  acaciaMid: [92, 100, 72],
  acaciaShade: [50, 56, 40],
  roundSun: [124, 138, 90],
  roundMid: [76, 90, 56],
  roundShade: [38, 46, 30],
  scrubSun: [132, 140, 94],
  scrubMid: [82, 92, 60],
  scrubShade: [42, 48, 32],
  silverSun: [176, 182, 158],
  silverMid: [128, 136, 116],
  silverShade: [70, 76, 62],
  twig: [64, 52, 40],
  twigPale: [122, 108, 88],
  thorn: [206, 196, 172],
  earth: [130, 98, 74],
  earthDark: [80, 60, 48],
  ochre: [156, 126, 96],
  hazeFar: [176, 168, 150],
  hazeNear: [128, 124, 108],
};

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
 * same job in a way that responds to light direction.
 */
function shadeCore(ctx, w, h, amount, { from = 'centre', dark = [14, 12, 6] } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const g =
    from === 'centre'
      ? ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.62)
      : ctx.createLinearGradient(0, h, 0, 0);
  const d = (a) => `rgba(${dark[0]},${dark[1]},${dark[2]},${a})`;
  g.addColorStop(0, d(amount));
  g.addColorStop(0.55, d(amount * 0.45));
  g.addColorStop(1, d(0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Atlas resolution
//
// The readable element in every one of these atlases is a pinna, a tuft or a
// seed head a few dozen texels across, so cell size is the direct lever on how
// far a card keeps its grain before minification averages it into a wash.
// `ultra` buys more of that; `fast` and `high` stay where they were tuned.
// ---------------------------------------------------------------------------
let ATLAS_SCALE = 1;
let ATLAS_ANISO = 4;

export function setFoliageDetail(scale = 1, aniso = 4) {
  ATLAS_SCALE = clamp(scale, 0.5, 2);
  ATLAS_ANISO = Math.max(1, Math.round(aniso));
}

/** The multiplier the atlases were last built at; see the foliage shader's mip estimate. */
export function foliageDetail() {
  return ATLAS_SCALE;
}

/** Atlas cell size in texels at the current detail level, kept to a multiple of 32. */
const cell = (px) => Math.max(64, Math.round((px * ATLAS_SCALE) / 32) * 32);

/** Lay four tile painters out in a 2x2 grid. Tiles keep a transparent margin. */
function atlas(key, tile, painters, { bleed = [90, 84, 52], srgb = true } = {}) {
  return cached(`${key}.${tile}`, () =>
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
      { srgb, repeat: 1, aniso: ATLAS_ANISO, height: tile * 2 },
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
  // fissure frequency / plate scale / stretch along the bole / how sharp the
  // ridges are / how much the ridges lighten / colour trio
  //
  // Umbrella thorn: dark grey-brown, deeply and finely fissured into long
  // vertical strips, almost black in the cracks.
  acacia: { fis: 11, plate: 9, stretch: 2.2, sharp: 2.4, light: 0.85, deep: [26, 22, 18], dark: [62, 54, 45], mid: [100, 88, 74], hi: [138, 126, 108] },
  // Marula and the like: grey, flaking in rounded plates that leave paler
  // patches where they have come away — the plate cells dominate.
  marula: { fis: 6, plate: 6, stretch: 1.0, sharp: 1.5, light: 1.0, deep: [36, 33, 30], dark: [80, 74, 66], mid: [122, 114, 102], hi: [156, 148, 134] },
  // Scrub thorn: smoother, browner, papery, a little red in the fresh wood.
  thorn: { fis: 8, plate: 12, stretch: 1.6, sharp: 1.6, light: 0.9, deep: [32, 24, 18], dark: [74, 56, 44], mid: [108, 86, 68], hi: [142, 120, 96] },
};

/**
 * Trunk bark. UVs are authored on the trunk geometry as u = around, v = up, so
 * the fissures are stretched along v here. The fourth map is a lichen mask the
 * shader uses in place of the old moss: dry-country lichen is a pale grey-green
 * crust on the shaded flank rather than a wet green cushion at the foot.
 */
export function barkMaps(kind = 'acacia', seed = 5) {
  return cached('nat.bark.' + kind + '.' + seed, () => {
    const K = BARK_KINDS[kind] || BARK_KINDS.acacia;
    const w = 256;
    const h = 512;
    const vf = K.stretch;
    const hf = heightField(w, h, (x, y) => {
      const u = x / w;
      const v = y / h;
      const warp = fbm(u * 5, v * 2 * vf, { octaves: 3, period: 5, seed: seed + 2 }) - 0.5;
      const fis = ridged(u * K.fis + warp * 0.5, v * 1.7 * vf, { octaves: 4, period: K.fis | 0, seed });
      const plates = worley(u * K.plate, v * 2.4 * vf, K.plate | 0, seed + 40);
      const slab = smoothstep(0.02, 0.2, plates.f2 - plates.f1);
      const crack = 1 - smoothstep(0.0, 0.055, plates.f2 - plates.f1);
      const fine = fbm(u * 34, v * 19 * vf, { octaves: 4, period: 34, seed: seed + 11 });
      const d = Math.pow(clamp(fis), K.sharp) * 0.66 + slab * 0.22 + fine * 0.14;
      return clamp(d * (1 - crack * 0.9));
    });
    const normal = normalFromHeight(hf, w, h, 5.6, { repeat: 1 });
    const lichen = [148, 150, 130];
    const sootBlack = [18, 16, 14];
    const sapwood = [168, 140, 104];
    const map = pixelTexture(
      w,
      h,
      (x, y, out) => {
        const u = x / w;
        const v = y / h;
        const d = hf[y * w + x];
        let c = mixRgb(K.deep, K.dark, smoothstep(0.0, 0.32, d));
        c = mixRgb(c, K.mid, smoothstep(0.28, 0.62, d));
        c = mixRgb(c, K.hi, smoothstep(0.62, 0.92, d) * K.light * 0.8);
        // per-plate identity, keyed off the same Worley cells the relief uses
        const pl = worley(u * K.plate, v * 2.4 * vf, K.plate | 0, seed + 40);
        const pid = (pl.id * 41.3) % 1;
        const plateLit = smoothstep(0.3, 0.75, d);
        if (pid > 0.74) c = mixRgb(c, lichen, (pid - 0.74) * 1.6 * plateLit * K.light);
        else if (pid < 0.22) c = mixRgb(c, sootBlack, (0.22 - pid) * 1.6);
        // a whole flank darker: fire scorch low on the bole is what a savanna
        // trunk carries instead of a wet stain
        const stain = fbm(u * 2.5, v * 1.4 * vf, { octaves: 4, period: 3, seed: seed + 90 });
        c = mixRgb(c, K.deep, smoothstep(0.5, 0.92, stain) * 0.5);
        // elephant or fire scar: bark stripped, pale dry sapwood in a long strip
        const scar =
          smoothstep(0.64, 0.86, fbm(u * 3.2 + 11, v * 1.1 * vf + 4, { octaves: 3, period: 4, seed: seed + 120 })) *
          smoothstep(0.3, 0.6, 1 - stain);
        c = mixRgb(c, mixRgb(mixRgb(sapwood, K.deep, 0.3), sapwood, plateLit), scar * 0.7);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(w, h, (x, y) => clamp(0.76 + (1 - hf[y * w + x]) * 0.22), { repeat: 1 });
    const ao = roughnessTexture(w, h, (x, y) => clamp(0.2 + hf[y * w + x] * 0.9), { repeat: 1 });
    const mossMask = roughnessTexture(
      w,
      h,
      (x, y) => {
        const u = x / w;
        const v = y / h;
        const patch = fbm(u * 3.5, v * 2.2 * vf, { octaves: 4, period: 4, seed: seed + 61 });
        const fuzz = fbm(u * 16, v * 11 * vf, { octaves: 3, period: 16, seed: seed + 71 });
        // crustose lichen sits on the ridges, not in the cracks
        const grip = smoothstep(0.4, 0.85, hf[y * w + x]);
        return clamp(smoothstep(0.5, 0.8, patch) * (0.45 + fuzz * 0.75) * (0.2 + grip * 0.9));
      },
      { repeat: 1 },
    );
    return { map, normal, rough, ao, mossMask };
  });
}

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
    const barkDark = hexToRgb(WOOD.barkDark);
    const barkMid = hexToRgb(WOOD.bark);
    const barkLight = hexToRgb(WOOD.barkLight);
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
        c = mixRgb(c, hexToRgb(WOOD.barkDark), smoothstep(0.86, 0.97, r));
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

/**
 * Dead wood: a standing skeleton or a fallen stem that has lost its bark and
 * weathered in the sun. Savanna dead wood is genuinely pale — silver-grey with
 * the grain checked open into dark lines — and it is the one bright vertical
 * the grassland has, so the median is kept at a mid grey rather than at the
 * near-white a photograph shows; the sun does the rest.
 */
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
    const silver = [146, 138, 124];
    const grey = [104, 98, 88];
    const shadow = [40, 36, 32];
    const scorch = [58, 46, 38];
    const map = pixelTexture(
      w,
      h,
      (x, y, out) => {
        const u = x / w;
        const v = y / h;
        const d = hf[y * w + x];
        let c = mixRgb(shadow, grey, smoothstep(0.1, 0.5, d));
        c = mixRgb(c, silver, smoothstep(0.48, 0.9, d));
        // fire has been through: the lower part of any standing dead tree is
        // charred on one flank, which is what puts a dark side on a pale pole
        const burn = smoothstep(0.5, 0.9, fbm(u * 4, v * 2.5, { octaves: 4, period: 4, seed: 231 })) * (1 - smoothstep(0.2, 0.6, v));
        c = mixRgb(c, scorch, burn * 0.7);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(w, h, () => 0.92, { repeat: 1 });
    const ao = roughnessTexture(w, h, (x, y) => clamp(0.3 + hf[y * w + x] * 0.8), { repeat: 1 });
    const mossMask = roughnessTexture(w, h, () => 0, { repeat: 1 });
    return { map, normal, rough, ao, mossMask };
  });
}

/**
 * Red laterite earth for termite mounds and the bare patches around them:
 * the worked soil is finer and redder than the ground it came out of, sun-baked
 * into a crust that cracks into plates and runs in rills where the rain hits.
 */
export function earthMaps() {
  return cached('nat.earth', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      // Worked soil, not brickwork: the mound's surface is rain-smoothed with
      // faint rills and a few shallow cracks, so the relief is mostly grain.
      const plates = worley(u * 5, v * 5, 5, 71);
      const crack = 1 - smoothstep(0.0, 0.03, plates.f2 - plates.f1);
      const rill = ridged(u * 2, v * 6, { octaves: 3, period: 6, seed: 77 });
      const grain = fbm(u * 28, v * 28, { octaves: 4, period: 28, seed: 79 });
      const blotch = fbm(u * 4, v * 4, { octaves: 3, period: 4, seed: 81 });
      return clamp(0.5 - crack * 0.26 + Math.pow(rill, 2) * 0.2 + grain * 0.34 + (blotch - 0.5) * 0.2);
    });
    const normal = normalFromHeight(hf, n, n, 3.4, { repeat: 2 });
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const d = hf[y * n + x];
        let c = mixRgb(SAV.earthDark, SAV.earth, smoothstep(0.15, 0.65, d));
        c = mixRgb(c, SAV.ochre, smoothstep(0.65, 0.95, d) * 0.5);
        const wash = fbm(u * 3, v * 3, { octaves: 4, period: 3, seed: 83 });
        c = mixRgb(c, [110, 100, 90], smoothstep(0.5, 0.9, wash) * 0.6);
        // the crust is darker in the cracks and where the grain is deep
        c = mixRgb(c, SAV.earthDark, (1 - smoothstep(0.2, 0.45, d)) * 0.5);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 2 },
    );
    const rough = roughnessTexture(n, n, () => 0.96, { repeat: 2 });
    const ao = roughnessTexture(n, n, (x, y) => clamp(0.3 + hf[y * n + x] * 0.8), { repeat: 2 });
    return { map, normal, rough, ao };
  });
}

// ---------------------------------------------------------------------------
// Tree foliage atlases
// ---------------------------------------------------------------------------

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
 * One acacia branch: a zigzag woody axis carrying paired thorns and, at every
 * node, a cluster of bipinnate leaves.
 *
 * Three scales, because that is what separates a tree from a texture: the card
 * outline (a feathered lozenge, fringed by clusters that overshoot it), the leaf
 * cluster at 6-12% of the cell, which is the element that survives to twenty
 * metres and so carries the value spread, and inside each cluster the pinnae —
 * short rachises with pairs of leaflets a few texels across, which are the grain
 * a viewer standing under the tree sees. The twigs are drawn dark and the
 * thorns pale so that the gaps between clusters read as structure, not holes.
 */
function acaciaTile(ctx, w, h, opts) {
  const {
    seed,
    base,
    tip,
    shade,
    stem,
    clusters = 150,
    // cluster radius as a fraction of the cell: the readable element
    clusterR = 0.05,
    pinnae = 5,
    leaflets = 7,
    leafletR = 0.0042,
    fringe = 0.26,
    yGain = 1.3,
    shoots = 7,
    sweep = 0.55,
    sag = 0.02,
    thorns = 1.0,
    contrast = 1.0,
    bake = {},
  } = opts;
  const rnd = mulberry32(seed);
  const midY = h * 0.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const deep = mixRgb(shade, [0, 0, 0], 0.55);
  const ramp = [deep, mixRgb(deep, shade, 0.55), shade, mixRgb(shade, base, 0.6), base, mixRgb(base, tip, 0.55), tip];

  const axis = (t) => [w * (0.01 + t * 0.98), midY + Math.sin(t * Math.PI) * h * sag + (t - 0.5) * h * sag * 3];

  // --- skeleton -------------------------------------------------------------
  const legs = [];
  {
    const [ax0, ay0] = axis(0);
    const [ax1, ay1] = axis(1);
    legs.push({ x0: ax0, y0: ay0, x1: ax1, y1: ay1, hw: h * 0.11, root: 0, main: true, bias: 0 });
    for (let i = 0; i < shoots; i++) {
      const t = 0.04 + (i / shoots) * 0.9 + rnd() * 0.05;
      const side = i % 2 === 0 ? -1 : 1;
      const [sx, sy] = axis(t);
      const env = Math.pow(1 - t, 0.4) * 0.7 + 0.32;
      const len = w * 0.34 * env * (0.7 + rnd() * 0.6);
      const ang = side * (sweep + rnd() * 0.4);
      legs.push({
        x0: sx,
        y0: sy,
        x1: sx + Math.cos(ang) * len,
        y1: sy + Math.sin(ang) * len * yGain,
        hw: len * 0.34,
        root: t,
        // two populations of shoot value, not a continuum: the shoot is the
        // scale that survives minification and it has to differ shoot to shoot
        bias: (rnd() < 0.46 ? -1 : 1) * (0.14 + rnd() * 0.24) * contrast,
      });
    }
  }

  // Twigs: zigzag, not straight. Acacia twigs turn at every node, which is
  // half of what makes the bare parts of a crown read as thorn tree.
  const zig = (L, segs, reach, wid, col) => {
    let px = L.x0;
    let py = L.y0;
    const nodes = [];
    for (let i = 1; i <= segs; i++) {
      const s = (i / segs) * reach;
      const bx = lerp(L.x0, L.x1, s);
      const by = lerp(L.y0, L.y1, s);
      const nx = -(L.y1 - L.y0);
      const ny = L.x1 - L.x0;
      const nl = Math.hypot(nx, ny) || 1;
      const kink = (i % 2 ? 1 : -1) * L.hw * 0.16 * (1 - s * 0.5);
      const qx = bx + (nx / nl) * kink;
      const qy = by + (ny / nl) * kink;
      ctx.strokeStyle = rgbStr(col, 1);
      ctx.lineWidth = Math.max(0.8, wid * (1 - s * 0.7));
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(qx, qy);
      ctx.stroke();
      nodes.push([qx, qy, s]);
      px = qx;
      py = qy;
    }
    return nodes;
  };
  const nodesOf = [];
  for (const L of legs) {
    if (L.main) {
      // the main rachis follows the sag curve in short straight runs
      for (let i = 0; i < 14; i++) {
        const s0 = (i / 14) * 0.92;
        const s1 = ((i + 1) / 14) * 0.92;
        ctx.strokeStyle = rgbStr(stem, 0.92);
        ctx.lineWidth = Math.max(0.9, w * 0.0105 * (1 - s0 * 0.7));
        ctx.beginPath();
        ctx.moveTo(...axis(s0));
        ctx.lineTo(...axis(s1));
        ctx.stroke();
      }
      nodesOf.push([]);
    } else {
      nodesOf.push(zig(L, 6, 0.86, w * 0.0046 * (1 - L.root * 0.35), mixRgb(stem, [120, 100, 76], 0.2)));
    }
  }

  // Paired thorns at the nodes: pale, straight, slightly back-swept. Only the
  // ones the leaf clusters will not cover matter, so they are drawn first and
  // the clusters are allowed to bury most of them.
  if (thorns > 0) {
    ctx.strokeStyle = rgbStr(SAV.thorn, 1, 0.9);
    ctx.lineWidth = Math.max(0.7, w * 0.0022);
    for (let li = 0; li < legs.length; li++) {
      const L = legs[li];
      for (const [nx, ny] of nodesOf[li]) {
        if (rnd() > thorns * 0.8) continue;
        const along = Math.atan2(L.y1 - L.y0, L.x1 - L.x0);
        const len = w * (0.012 + rnd() * 0.014);
        for (const sgn of [-1, 1]) {
          const a = along + sgn * (1.25 + rnd() * 0.3) + Math.PI;
          ctx.beginPath();
          ctx.moveTo(nx, ny);
          ctx.lineTo(nx + Math.cos(a) * len, ny + Math.sin(a) * len * yGain);
          ctx.stroke();
        }
      }
    }
  }

  // A soft smear of dark under each shoot, so neighbouring sprays keep a dark
  // lane between them once the leaflets have mipped away.
  for (const L of legs) {
    if (L.main) continue;
    const off = L.hw * 0.4;
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = rgbStr(deep, 1);
    ctx.lineWidth = L.hw * 1.3;
    ctx.beginPath();
    ctx.moveTo(L.x0 + off * 0.4, L.y0 + off);
    ctx.lineTo(L.x1 + off, L.y1 + off * 1.3);
    ctx.stroke();
    ctx.restore();
  }

  // --- cluster sites --------------------------------------------------------
  const sites = [];
  const totalW = legs.reduce((a, L) => a + (L.main ? 0.6 : 1), 0);
  for (const L of legs) {
    const dx = L.x1 - L.x0;
    const dy = L.y1 - L.y0;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const n = Math.max(4, Math.round((clusters * (L.main ? 0.6 : 1)) / totalW));
    for (let i = 0; i < n; i++) {
      const s = 0.05 + Math.pow(rnd(), 0.8) * 0.94;
      const taper = Math.pow(1 - s, 0.5) * 0.8 + 0.25;
      const edge = rnd() < fringe;
      let off = (rnd() * 2 - 1) * (edge ? 1.1 + rnd() * 0.7 : Math.pow(rnd(), 0.5));
      if (L.main) off *= 1.3;
      const hw = L.hw * taper;
      const x = L.x0 + ux * len * s - uy * off * hw;
      const y = L.y0 + uy * len * s + ux * off * hw * yGain;
      const r = w * clusterR * (0.6 + rnd() * 0.8) * (edge ? 0.7 : 1) * (0.7 + taper * 0.4);
      // position drives value: the upper and outer clusters are the ones a
      // spray presents to the sky
      const lit = clamp(0.44 + ((midY - y) / (h * 0.5)) * 0.5 + (x / w) * 0.24);
      const tone = clamp(lit * (0.45 + contrast * 0.55) + Math.pow(rnd(), 1.5) * 0.6 * contrast - 0.1 + L.bias);
      sites.push({ x, y, r, ang: Math.atan2(uy, ux) + (rnd() - 0.5) * 1.4, tone, edge });
    }
  }
  sites.sort((a, b) => a.tone - b.tone);

  // --- one leaf cluster -----------------------------------------------------
  // `pinnae` rachises fan out from a point; each carries pairs of leaflets.
  // Leaflets are filled ellipses rather than strokes so they keep a rounded end
  // at two texels, and every pair alternates slightly so the pinna is a comb
  // rather than a ladder.
  const cluster = (cx, cy, r, ang, col, alpha, scale) => {
    ctx.fillStyle = rgbStr(col, 1, alpha);
    ctx.strokeStyle = rgbStr(mixRgb(col, stem, 0.5), 1, alpha);
    const n = Math.max(3, Math.round(pinnae * (0.7 + rnd() * 0.6)));
    for (let i = 0; i < n; i++) {
      const a = ang + (i / n - 0.5) * 2.4 + (rnd() - 0.5) * 0.5;
      const pl = r * (0.7 + rnd() * 0.6);
      const ca = Math.cos(a);
      const sa = Math.sin(a) * yGain;
      ctx.lineWidth = Math.max(0.6, w * 0.0012);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + ca * pl, cy + sa * pl);
      ctx.stroke();
      const pairs = Math.max(3, Math.round(leaflets * (0.7 + rnd() * 0.6)));
      const lr = w * leafletR * scale * (0.8 + rnd() * 0.5);
      for (let k = 0; k < pairs; k++) {
        const s = (k + 0.6) / pairs;
        const px = cx + ca * pl * s;
        const py = cy + sa * pl * s;
        const tw = lr * (1 - s * 0.3);
        for (const sgn of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(px - sa * tw * 1.1 * sgn, py + ca * tw * 1.1 * sgn, tw * 1.6, tw * 0.85, a + sgn * 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };

  for (const t of sites) {
    // each cluster casts into the one behind it; fringe clusters stay thin.
    // The cast used to be drawn at 1.35x the cluster and near-opaque, and at
    // arm's length that halo filled every gap between clusters, so a card
    // was a solid camouflage plate with no sky through it. At the cluster's
    // own size and a third transparent the gaps stay open: a spray shows its
    // structure and the card edge is leaf clusters, not a shape.
    if (!t.edge) cluster(t.x + t.r * 0.18, t.y + t.r * 0.3 * yGain, t.r * 0.8, t.ang, deep, 0.7, 1.1);
    for (let k = 0; k < 2; k++) {
      const sub = clamp(t.tone + (k === 0 ? -0.15 : 0.13) * contrast);
      cluster(t.x, t.y, t.r * (k === 0 ? 1 : 0.84), t.ang + (k ? 0.4 : 0), rampAt(ramp, sub), 1, k === 0 ? 1.0 : 0.85);
    }
  }

  raggedEdge(ctx, w, h, seed);
  bakeSprayShading(ctx, w, h, { dark: [8, 10, 4], ...bake });
}

/**
 * Cut the painting back from the tile boundary along a noisy line.
 *
 * The rachis runs almost the full width of the cell and the shoots overshoot
 * it, so wherever the painting met the tile it was clipped dead straight — and
 * a straight alpha edge on a card is a straight edge on the tree. At mid
 * distance the mip-fill compensation then closes the fringe up to that line and
 * the crown reads as three or four planar slabs with ruled edges, which is what
 * every critic saw. This eats the outer 4-13% of the cell along a closed noise
 * curve, so a card ends in leaf clusters torn off at random and never in a line.
 * (Depth 0.13: the first cut at 0.10 still left one straight run per card.)
 * `destination-out` respects the atlas transform, which `getImageData` would not.
 */
function raggedEdge(ctx, w, h, seed, { inset = 0.035, depth = 0.13, freq = 3.2 } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.rect(-4, -4, w + 8, h + 8);
  const N = 240;
  for (let i = 0; i <= N; i++) {
    const t = (i % N) / N;
    const s = t * 4;
    const side = Math.floor(s) % 4;
    const f = s - Math.floor(s);
    let px;
    let py;
    let nx;
    let ny;
    if (side === 0) [px, py, nx, ny] = [f * w, 0, 0, 1];
    else if (side === 1) [px, py, nx, ny] = [w, f * h, -1, 0];
    else if (side === 2) [px, py, nx, ny] = [(1 - f) * w, h, 0, -1];
    else [px, py, nx, ny] = [0, (1 - f) * h, 1, 0];
    // sampled on a circle so the curve closes on itself at t = 1
    const a = t * Math.PI * 2;
    const n = fbm(Math.cos(a) * freq + 5.5, Math.sin(a) * freq + 2.5, { octaves: 3, period: 4, seed: (seed * 7) & 255 });
    const d = (inset + depth * Math.pow(n, 1.4) * 2.2) * w;
    if (i === 0) ctx.moveTo(px + nx * d, py + ny * d);
    else ctx.lineTo(px + nx * d, py + ny * d);
  }
  ctx.closePath();
  ctx.fill('evenodd');
  ctx.restore();
}

export function acaciaAtlas() {
  const woody = SAV.twig;
  // 1024 a tile. The readable element is the leaf cluster, and the budget goes
  // on having the pinnae resolve inside each one at arm's length.
  return atlas(
    'nat.acaciaAtlas',
    cell(1024),
    [
      // 0 umbrella thorn: fine, feathery, grey-olive, the workhorse
      (c, w, h) =>
        acaciaTile(c, w, h, {
          seed: 811,
          base: SAV.acaciaMid,
          tip: SAV.acaciaSun,
          shade: SAV.acaciaShade,
          stem: woody,
          clusters: 190,
          clusterR: 0.046,
          pinnae: 5,
          leaflets: 7,
          leafletR: 0.0038,
          fringe: 0.28,
          shoots: 7,
          sweep: 0.5,
          thorns: 1.0,
          // eased from 1.0: with the crown mosaic now putting three stops
          // between sprays per tree, the two-population tone inside each card
          // on top of that read as camouflage blotches at arm's length
          contrast: 0.85,
          bake: { root: 0.32, axis: 0.2, rim: 0.18 },
        }),
      // 1 round-crowned tree (marula, shepherd's tree): small oval leaves in
      // dense clusters, a real green, darker than the acacia
      (c, w, h) =>
        leafTile(c, w, h, {
          seed: 3907,
          sun: SAV.roundSun,
          mid: SAV.roundMid,
          shade: SAV.roundShade,
          stemCol: woody,
          count: 250,
          shape: 'oval',
          leafLen: 0.046,
          spread: 0.32,
        }),
      // 2 scrub thorn: sparse, twiggy, thorns everywhere, yellower and paler
      (c, w, h) =>
        acaciaTile(c, w, h, {
          seed: 1607,
          base: mixRgb(SAV.acaciaMid, SAV.khaki, 0.3),
          tip: mixRgb(SAV.acaciaSun, SAV.strawSun, 0.3),
          shade: mixRgb(SAV.acaciaShade, SAV.dryBrown, 0.2),
          stem: mixRgb(woody, SAV.twigPale, 0.3),
          clusters: 105,
          clusterR: 0.04,
          pinnae: 4,
          leaflets: 6,
          leafletR: 0.0036,
          fringe: 0.36,
          shoots: 8,
          sweep: 0.66,
          sag: 0.04,
          thorns: 1.4,
          contrast: 1.05,
          bake: { root: 0.28, axis: 0.16, rim: 0.2 },
        }),
      // 3 dry: a crown going over in the dry season, khaki-brown and thin, twigs
      // showing through. Well down in value so a browning tree reads as a gap in
      // the olive rather than as a pale plume.
      (c, w, h) =>
        acaciaTile(c, w, h, {
          seed: 1913,
          base: [118, 96, 54],
          tip: [156, 130, 76],
          shade: [62, 48, 28],
          stem: mixRgb(woody, SAV.twigPale, 0.4),
          clusters: 92,
          clusterR: 0.042,
          pinnae: 4,
          leaflets: 6,
          leafletR: 0.0036,
          fringe: 0.4,
          shoots: 7,
          sweep: 0.6,
          sag: 0.03,
          thorns: 1.2,
          contrast: 0.9,
          bake: { root: 0.24, axis: 0.14, rim: 0.14 },
        }),
    ],
    { bleed: mixRgb(SAV.acaciaShade, SAV.acaciaMid, 0.4) },
  );
}

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

// ---------------------------------------------------------------------------
// Grass. Plants are drawn rooted at the bottom of a tile.
// ---------------------------------------------------------------------------

/**
 * A tuft of dry grass. Value is carried in bunches across the tile rather than
 * per blade — a blade is under a pixel wide at any distance the scatter is seen
 * from, so per-blade value averages straight out, while a bunch is 20-40 px and
 * keeps a lit side and a dark side. Every blade runs dark at the root and light
 * at the tip, which is the single thing that says "grass in sun" from a moving
 * vehicle: the tips catch the light and the bases sit in their own shade.
 *
 * `heads` draws seed heads on a fraction of the blades: 'oat' is the drooping
 * red-brown spikelet of red oat grass, 'plume' the pale feathery panicle of the
 * tall thatching grasses, 'spike' a tight straw-coloured spikelet.
 */
function dryGrassTile(ctx, w, h, opts) {
  const { seed, pale, mid, dark, green = 0.0, blades, tall, wide, heads = null, headRate = 0.16, root = 0.86 } = opts;
  const rnd = mulberry32(seed);
  ctx.lineCap = 'round';
  const bunches = [];
  for (let k = 0; k < 20; k++) bunches.push(0.42 + Math.pow(rnd(), 0.8) * 1.0);
  const headList = [];
  for (let i = 0; i < blades; i++) {
    const x0 = w * (0.5 + (rnd() - 0.5) * root);
    const lean = (rnd() - 0.5) * w * wide;
    const bladeT = 0.4 + rnd() * 0.62;
    const top = h * (1 - tall * bladeT);
    const bv = bunches[Math.min(bunches.length - 1, Math.max(0, Math.floor((x0 / w) * bunches.length)))] * (0.84 + rnd() * 0.32);
    // straw is the mean; green is the exception, and it lives low in the tuft
    // where the ground still holds water
    const isGreen = rnd() < green;
    const tone = Math.pow(rnd(), 1.4);
    let col = mixRgb(mid, pale, tone);
    if (isGreen) col = mixRgb(mixRgb(SAV.greenGrass, SAV.greenDeep, rnd() * 0.5), col, 0.35);
    const grad = ctx.createLinearGradient(x0, h, x0 + lean, top);
    grad.addColorStop(0, rgbStr(mixRgb(dark, SAV.duff, 0.5), bv * 0.8));
    grad.addColorStop(0.3, rgbStr(mixRgb(col, dark, 0.45), bv * 0.9));
    grad.addColorStop(0.75, rgbStr(col, bv));
    grad.addColorStop(1, rgbStr(mixRgb(col, pale, 0.4), bv * 0.98));
    ctx.strokeStyle = grad;
    ctx.lineWidth = w * (0.004 + rnd() * 0.007);
    ctx.beginPath();
    ctx.moveTo(x0, h);
    // a dry blade bends over near the top rather than curving evenly
    const kink = 0.5 + rnd() * 0.32;
    ctx.quadraticCurveTo(x0 + lean * 0.25, lerp(h, top, kink), x0 + lean, top);
    ctx.stroke();
    if (heads && bladeT > 0.7 && rnd() < headRate) headList.push({ x: x0 + lean, y: top, lean, bv });
  }
  // seed heads last, so they sit over the blades the way they stand over them
  for (const hd of headList) {
    const dir = Math.sign(hd.lean || 1);
    if (heads === 'oat') {
      // drooping spikelets hanging off one side of the culm tip, red-brown
      // Each spikelet is a fine dark stem with a slightly heavier grain at its
      // end and a hair-thin awn beyond it; the head as a whole is a loose
      // one-sided raceme a fifth as wide as it is tall. Drawn thick these
      // became brown paddles, and a paddle at the top of a grass blade is a
      // dead leaf, not a seed head.
      const n = 4 + Math.floor(rnd() * 4);
      const culmW = w * 0.0028;
      for (let k = 0; k < n; k++) {
        const s = k / n;
        const px = hd.x + dir * w * 0.005 * k;
        const py = hd.y + h * (0.008 + s * 0.05);
        const grain = mixRgb(SAV.redOat, SAV.dryBrown, rnd() * 0.5);
        const a = dir * (0.9 + rnd() * 0.5) + Math.PI / 2;
        const l = h * (0.028 + rnd() * 0.02);
        const gx = px + Math.cos(a) * l;
        const gy = py + Math.sin(a) * l;
        ctx.strokeStyle = rgbStr(grain, hd.bv * (0.85 + s * 0.25));
        ctx.lineWidth = culmW;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + dir * w * 0.006, py + Math.sin(a) * l * 0.4, gx, gy);
        ctx.stroke();
        ctx.lineWidth = culmW * 2.2;
        ctx.beginPath();
        ctx.moveTo(gx - Math.cos(a) * l * 0.3, gy - Math.sin(a) * l * 0.3);
        ctx.lineTo(gx, gy);
        ctx.stroke();
        ctx.strokeStyle = rgbStr(mixRgb(grain, SAV.plume, 0.4), hd.bv, 0.7);
        ctx.lineWidth = culmW * 0.7;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + dir * w * 0.014, gy - h * 0.012);
        ctx.stroke();
      }
    } else if (heads === 'plume') {
      // a soft feathery panicle: many short pale strokes fanning off the tip
      const n = 14 + Math.floor(rnd() * 8);
      for (let k = 0; k < n; k++) {
        const s = k / n;
        const a = -Math.PI / 2 + (rnd() - 0.5) * 1.6;
        const l = w * (0.02 + rnd() * 0.03);
        const py = hd.y + h * s * 0.09;
        ctx.strokeStyle = rgbStr(mixRgb(SAV.plume, pale, rnd() * 0.5), hd.bv * 1.05, 0.85);
        ctx.lineWidth = w * (0.003 + rnd() * 0.003);
        ctx.beginPath();
        ctx.moveTo(hd.x + dir * w * 0.004 * k * 0.3, py);
        ctx.lineTo(hd.x + Math.cos(a) * l, py + Math.sin(a) * l * 0.6);
        ctx.stroke();
      }
    } else {
      // a tight spikelet: a few overlapping pale grains along the culm's end
      const n = 5 + Math.floor(rnd() * 4);
      ctx.fillStyle = rgbStr(mixRgb(pale, SAV.plume, 0.4), hd.bv * 1.05);
      for (let k = 0; k < n; k++) {
        const s = k / n;
        ctx.beginPath();
        ctx.ellipse(hd.x + dir * w * 0.006 * k, hd.y + h * s * 0.05, w * 0.006, w * 0.013, dir * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  shadeCore(ctx, w, h, 0.34, { from: 'bottom', dark: [40, 28, 10] });
}

export function savannaGrassAtlas() {
  return atlas(
    'nat.savGrass',
    cell(512),
    [
      // 0 red oat grass: tall, gold, drooping red-brown seed heads — the plant a
      // savanna is made of
      (c, w, h) => dryGrassTile(c, w, h, { seed: 8101, pale: SAV.strawSun, mid: SAV.straw, dark: SAV.dryBrown, green: 0.08, blades: 134, tall: 0.95, wide: 0.5, heads: 'oat', headRate: 0.24 }),
      // 1 short khaki tuft: dense, grazed, no heads
      (c, w, h) => dryGrassTile(c, w, h, { seed: 8609, pale: mixRgb(SAV.straw, SAV.khaki, 0.5), mid: SAV.khaki, dark: SAV.duff, green: 0.16, blades: 180, tall: 0.6, wide: 0.54 }),
      // 2 the green one: for shade under a crown and the drainage lines
      (c, w, h) => dryGrassTile(c, w, h, { seed: 9109, pale: mixRgb(SAV.greenGrass, SAV.strawSun, 0.35), mid: mixRgb(SAV.greenGrass, SAV.khaki, 0.3), dark: SAV.greenDeep, green: 0.7, blades: 150, tall: 0.72, wide: 0.46, heads: 'spike', headRate: 0.1 }),
      // 3 thatching grass: tallest and palest, feathery plumes
      (c, w, h) => dryGrassTile(c, w, h, { seed: 9601, pale: mixRgb(SAV.strawSun, SAV.plume, 0.2), mid: SAV.straw, dark: SAV.dryBrown, green: 0.04, blades: 96, tall: 1.0, wide: 0.62, heads: 'plume', headRate: 0.3, root: 0.7 }),
    ],
    { bleed: mixRgb(SAV.straw, SAV.dryBrown, 0.5) },
  );
}

/**
 * A bank of grass filling the whole width of a tile, for the mid-distance cards
 * that stand in for a stand of tufts once a tuft is a few pixels wide. Painted
 * dense to the edges so two cards overlapping read as one sward, with the seed
 * heads standing above the mass to give the top edge a fringe.
 */
export function grassSwathAtlas() {
  const bank = (c, w, h, seed, pale, mid, dark, green, heads, tall) => {
    dryGrassTile(c, w, h, { seed, pale, mid, dark, green, blades: 260, tall, wide: 0.3, heads, headRate: 0.14, root: 1.02 });
    dryGrassTile(c, w, h, { seed: seed + 7, pale, mid: mixRgb(mid, dark, 0.3), dark, green, blades: 120, tall: tall * 0.6, wide: 0.36, root: 1.02 });
  };
  return atlas(
    'nat.savSwath',
    cell(512),
    [
      (c, w, h) => bank(c, w, h, 8801, SAV.strawSun, SAV.straw, SAV.dryBrown, 0.06, 'oat', 0.9),
      (c, w, h) => bank(c, w, h, 8833, mixRgb(SAV.straw, SAV.khaki, 0.5), SAV.khaki, SAV.duff, 0.12, null, 0.7),
      (c, w, h) => bank(c, w, h, 8867, mixRgb(SAV.greenGrass, SAV.strawSun, 0.4), mixRgb(SAV.greenGrass, SAV.khaki, 0.35), SAV.greenDeep, 0.6, 'spike', 0.78),
      (c, w, h) => bank(c, w, h, 8899, mixRgb(SAV.strawSun, SAV.plume, 0.35), SAV.straw, SAV.dryBrown, 0.04, 'plume', 1.0),
    ],
    { bleed: mixRgb(SAV.straw, SAV.dryBrown, 0.5) },
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

// ---------------------------------------------------------------------------
// Scrub, forbs and ground litter
// ---------------------------------------------------------------------------

/** A tangle of bare thorny twigs, zigzagging up from a root, thorns paired at the kinks. */
function thornTangle(ctx, w, h, rnd, { rootX, rootY, n, reach, col, thornCol, wid, spread = 1.0 }) {
  ctx.lineCap = 'round';
  for (let s = 0; s < n; s++) {
    const t = n === 1 ? 0.5 : s / (n - 1);
    let px = rootX + (rnd() - 0.5) * w * 0.04;
    let py = rootY;
    const dirn = (t - 0.5) * 2 * spread;
    const segs = 5 + Math.floor(rnd() * 3);
    const tipX = rootX + dirn * w * 0.44 * reach;
    const tipY = rootY - h * (0.45 + rnd() * 0.45) * reach * (1 - Math.abs(dirn) * 0.4);
    for (let i = 1; i <= segs; i++) {
      const u = i / segs;
      const bx = lerp(rootX, tipX, u);
      const by = lerp(rootY, tipY, u * u * 0.4 + u * 0.6);
      const kink = (i % 2 ? 1 : -1) * w * 0.03 * (1 - u * 0.4);
      const qx = bx + kink;
      const qy = by + (rnd() - 0.5) * h * 0.02;
      ctx.strokeStyle = rgbStr(mixRgb(col, [0, 0, 0], u * 0.15), 1);
      ctx.lineWidth = Math.max(0.7, wid * (1 - u * 0.75));
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(qx, qy);
      ctx.stroke();
      // a side twig from every other kink
      if (i % 2 === 0 && rnd() < 0.7) {
        const a = Math.atan2(qy - py, qx - px) + (rnd() < 0.5 ? -1 : 1) * (0.7 + rnd() * 0.5);
        const l = w * (0.05 + rnd() * 0.08) * (1 - u * 0.5);
        ctx.lineWidth = Math.max(0.6, wid * 0.45 * (1 - u * 0.5));
        ctx.beginPath();
        ctx.moveTo(qx, qy);
        ctx.lineTo(qx + Math.cos(a) * l, qy + Math.sin(a) * l);
        ctx.stroke();
      }
      if (thornCol) {
        ctx.strokeStyle = rgbStr(thornCol, 1, 0.9);
        ctx.lineWidth = Math.max(0.6, w * 0.0025);
        const a0 = Math.atan2(qy - py, qx - px);
        for (const sgn of [-1, 1]) {
          const a = a0 + Math.PI + sgn * (1.2 + rnd() * 0.4);
          const l = w * (0.012 + rnd() * 0.012);
          ctx.beginPath();
          ctx.moveTo(qx, qy);
          ctx.lineTo(qx + Math.cos(a) * l, qy + Math.sin(a) * l);
          ctx.stroke();
        }
      }
      px = qx;
      py = qy;
    }
  }
}

/** Small round flower heads scattered over the upper part of whatever is drawn. */
function flowerPuffs(ctx, w, h, rnd, { n, col, core, r, top = 0.25, bottom = 0.7 }) {
  for (let i = 0; i < n; i++) {
    const x = w * (0.12 + rnd() * 0.76);
    const y = h * (top + Math.pow(rnd(), 0.7) * (bottom - top));
    const rr = w * r * (0.7 + rnd() * 0.6);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, rgbStr(core, 1));
    g.addColorStop(0.55, rgbStr(col, 1));
    g.addColorStop(1, rgbStr(col, 1, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
    // fuzzy outline: puffball flowers are a ball of stamens
    ctx.strokeStyle = rgbStr(col, 1.05, 0.8);
    ctx.lineWidth = Math.max(0.6, w * 0.002);
    for (let k = 0; k < 8; k++) {
      const a = rnd() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * rr * 0.6, y + Math.sin(a) * rr * 0.6);
      ctx.lineTo(x + Math.cos(a) * rr * 1.25, y + Math.sin(a) * rr * 1.25);
      ctx.stroke();
    }
  }
}

export function scrubAtlas() {
  const woody = SAV.twig;
  return atlas(
    'nat.scrubAtlas',
    cell(512),
    [
      // 0 rounded small-leaved shrub (raisin bush): a dense olive mound
      (c, w, h) =>
        shrubTile(c, w, h, {
          seed: 5101,
          sun: SAV.scrubSun,
          mid: SAV.scrubMid,
          shade: SAV.scrubShade,
          stemCol: woody,
          stems: 9,
          leafLen: 0.026,
          berry: false,
          form: 'mound',
        }),
      // 1 thorny thicket (sickle bush, wait-a-bit): mostly bare twig and thorn,
      // a few small leaf sprays near the tips
      (c, w, h) => {
        const rnd = mulberry32(5213);
        thornTangle(c, w, h, rnd, { rootX: w * 0.5, rootY: h * 0.99, n: 7, reach: 1.0, col: mixRgb(woody, SAV.twigPale, 0.35), thornCol: SAV.thorn, wid: w * 0.011 });
        shrubTile(c, w, h, {
          seed: 5227,
          sun: mixRgb(SAV.scrubSun, SAV.strawSun, 0.2),
          mid: mixRgb(SAV.scrubMid, SAV.khaki, 0.15),
          shade: SAV.scrubShade,
          stemCol: mixRgb(woody, SAV.twigPale, 0.3),
          stems: 4,
          leafLen: 0.02,
          berry: false,
          form: 'open',
        });
      },
      // 2 in flower: an olive mound carrying cream-yellow puffball heads
      (c, w, h) => {
        shrubTile(c, w, h, {
          seed: 5303,
          sun: mixRgb(SAV.scrubSun, SAV.roundSun, 0.3),
          mid: mixRgb(SAV.scrubMid, SAV.roundMid, 0.3),
          shade: SAV.scrubShade,
          stemCol: woody,
          stems: 8,
          leafLen: 0.024,
          berry: false,
          form: 'mound',
        });
        flowerPuffs(c, w, h, mulberry32(5311), { n: 26, col: [226, 204, 120], core: [246, 232, 170], r: 0.02, top: 0.28, bottom: 0.66 });
      },
      // 3 silver-leaved bush (leleshwa, wild sage): grey-green, upright, the
      // one cool note in the scrub
      (c, w, h) =>
        shrubTile(c, w, h, {
          seed: 5407,
          sun: SAV.silverSun,
          mid: SAV.silverMid,
          shade: SAV.silverShade,
          stemCol: mixRgb(woody, SAV.twigPale, 0.5),
          stems: 7,
          leafLen: 0.028,
          berry: false,
        }),
    ],
    { bleed: mixRgb(SAV.scrubShade, SAV.scrubMid, 0.4) },
  );
}

/** An aloe: a rosette of thick pointed leaves and a candelabra of orange flowers. */
function aloeTile(ctx, w, h, seed) {
  const rnd = mulberry32(seed);
  const leafA = [118, 138, 96];
  const leafB = [92, 108, 74];
  const leafTip = [150, 96, 60];
  const rootX = w * 0.5;
  const rootY = h * 0.98;
  // stalks first so the rosette overlaps their feet
  const stalks = 1 + Math.floor(rnd() * 2);
  for (let s = 0; s < stalks; s++) {
    const dx = (s - (stalks - 1) / 2) * w * 0.14 + (rnd() - 0.5) * w * 0.05;
    const topY = h * (0.06 + rnd() * 0.12);
    ctx.strokeStyle = rgbStr([96, 78, 50], 1);
    ctx.lineWidth = w * 0.012;
    ctx.beginPath();
    ctx.moveTo(rootX, rootY - h * 0.1);
    ctx.quadraticCurveTo(rootX + dx * 0.6, h * 0.5, rootX + dx, topY + h * 0.12);
    ctx.stroke();
    // tubular flowers hang down from a cone at the top, opening from the bottom
    const n = 26;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const y = topY + h * 0.02 + t * h * 0.13;
      const spreadR = w * (0.012 + t * 0.03);
      const a = rnd() * Math.PI * 2;
      const fx = rootX + dx + Math.cos(a) * spreadR;
      const open = t > 0.35;
      ctx.strokeStyle = rgbStr(open ? [222, 112, 52] : [190, 140, 70], 1);
      ctx.lineWidth = w * 0.006;
      ctx.beginPath();
      ctx.moveTo(fx, y);
      ctx.lineTo(fx + (rnd() - 0.5) * w * 0.01, y + h * (open ? 0.03 : 0.018));
      ctx.stroke();
    }
  }
  const leaves = 16 + Math.floor(rnd() * 6);
  for (let i = 0; i < leaves; i++) {
    const a = -Math.PI / 2 + (i / leaves - 0.5) * 2.6 + (rnd() - 0.5) * 0.3;
    const len = h * (0.22 + rnd() * 0.16);
    const wid = w * (0.03 + rnd() * 0.02);
    const tone = 0.3 + rnd() * 0.7;
    const col = mixRgb(leafB, leafA, tone);
    ctx.save();
    ctx.translate(rootX + (rnd() - 0.5) * w * 0.05, rootY - h * 0.02);
    ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, rgbStr(mixRgb(col, [0, 0, 0], 0.4), 1));
    g.addColorStop(0.6, rgbStr(col, 1));
    g.addColorStop(1, rgbStr(mixRgb(col, leafTip, 0.7), 1));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -wid * 0.4);
    ctx.quadraticCurveTo(len * 0.5, -wid * 1.1, len, 0);
    ctx.quadraticCurveTo(len * 0.5, wid * 1.1, 0, wid * 0.4);
    ctx.closePath();
    ctx.fill();
    // marginal teeth
    ctx.strokeStyle = rgbStr([200, 176, 130], 1, 0.7);
    ctx.lineWidth = Math.max(0.6, w * 0.002);
    for (let k = 1; k < 7; k++) {
      const s = k / 7;
      ctx.beginPath();
      ctx.moveTo(len * s, -wid * (1 - s * 0.6));
      ctx.lineTo(len * s + w * 0.006, -wid * (1 - s * 0.6) - w * 0.008);
      ctx.stroke();
    }
    ctx.restore();
  }
  shadeCore(ctx, w, h, 0.3, { from: 'bottom' });
}

/** Low bushy forb with small yellow daisies. */
function daisyTile(ctx, w, h, seed) {
  const rnd = mulberry32(seed);
  shrubTile(ctx, w, h, {
    seed: seed + 3,
    sun: mixRgb(SAV.roundSun, SAV.strawSun, 0.2),
    mid: SAV.roundMid,
    shade: SAV.roundShade,
    stemCol: mixRgb(SAV.twig, SAV.roundMid, 0.4),
    stems: 6,
    leafLen: 0.03,
    berry: false,
    form: 'mound',
  });
  for (let i = 0; i < 30; i++) {
    const x = w * (0.1 + rnd() * 0.8);
    const y = h * (0.3 + Math.pow(rnd(), 0.8) * 0.45);
    const r = w * (0.012 + rnd() * 0.008);
    ctx.fillStyle = rgbStr([236, 200, 70], 1);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.5, r * 0.28, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = rgbStr([120, 72, 30], 1);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function forbAtlas() {
  return atlas(
    'nat.forbAtlas',
    cell(512),
    [
      // 0 aloe with an orange spike: the one saturated accent on the ground
      (c, w, h) => aloeTile(c, w, h, 6101),
      // 1 a stand of bare seed stalks: the tall vertical the grass needs
      (c, w, h) => dryGrassTile(c, w, h, { seed: 6203, pale: mixRgb(SAV.strawSun, SAV.plume, 0.3), mid: SAV.straw, dark: SAV.dryBrown, blades: 22, tall: 1.0, wide: 0.3, heads: 'plume', headRate: 0.95, root: 0.5 }),
      // 2 yellow daisies over a low green mound
      (c, w, h) => daisyTile(c, w, h, 6307),
      // 3 a fallen thorn branch: bare grey twig and thorn lying in the grass
      (c, w, h) => {
        const rnd = mulberry32(6409);
        thornTangle(c, w, h, rnd, { rootX: w * 0.5, rootY: h * 0.96, n: 6, reach: 0.72, col: [112, 102, 88], thornCol: [200, 192, 172], wid: w * 0.016, spread: 1.4 });
        shadeCore(c, w, h, 0.25, { from: 'bottom' });
      },
    ],
    { bleed: mixRgb(SAV.khaki, SAV.dryBrown, 0.5) },
  );
}

/**
 * Flat ground clutter: dry leaf litter, trodden thatch, stones, twigs and dung.
 * These lie on the earth under everything else and are what puts a second
 * frequency of detail onto the bare patches between the tufts.
 */
export function groundLitterAtlas() {
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
    'nat.savLitter',
    cell(256),
    [
      // 0 dry leaf litter under a crown: small gold and brown leaves on duff
      (c, w, h) => {
        const rnd = mulberry32(7101);
        blob(c, w, h, 7101, w * 0.44);
        c.fillStyle = rgbStr(mixRgb(SAV.duff, SAV.dryBrown, 0.4), 1, 0.85);
        c.fill();
        for (let i = 0; i < 160; i++) {
          const a = rnd() * Math.PI * 2;
          const r = Math.sqrt(rnd()) * w * 0.4;
          const x = w * 0.5 + Math.cos(a) * r;
          const y = h * 0.5 + Math.sin(a) * r * 0.82;
          const tone = rnd();
          const col = tone < 0.5 ? mixRgb(SAV.dryBrown, SAV.khaki, tone * 2) : mixRgb(SAV.khaki, SAV.strawSun, (tone - 0.5) * 2);
          c.fillStyle = rgbStr(col, 0.8 + rnd() * 0.4);
          c.beginPath();
          c.ellipse(x, y, w * (0.012 + rnd() * 0.01), w * (0.006 + rnd() * 0.005), rnd() * Math.PI, 0, Math.PI * 2);
          c.fill();
        }
      },
      // 1 trodden thatch: dead grass lying flat, pale, many parallel strokes
      (c, w, h) => {
        const rnd = mulberry32(7203);
        c.lineCap = 'round';
        for (let i = 0; i < 140; i++) {
          const a = rnd() * Math.PI * 2;
          const r = Math.sqrt(rnd()) * w * 0.42;
          const x = w * 0.5 + Math.cos(a) * r;
          const y = h * 0.5 + Math.sin(a) * r * 0.82;
          const ang = (rnd() - 0.5) * 1.2 + 0.4;
          const l = w * (0.08 + rnd() * 0.16);
          c.strokeStyle = rgbStr(mixRgb(SAV.straw, SAV.khaki, rnd() * 0.6), 0.62 + rnd() * 0.32, 0.9);
          c.lineWidth = w * (0.004 + rnd() * 0.005);
          c.beginPath();
          c.moveTo(x - Math.cos(ang) * l * 0.5, y - Math.sin(ang) * l * 0.5);
          c.lineTo(x + Math.cos(ang) * l * 0.5, y + Math.sin(ang) * l * 0.5);
          c.stroke();
        }
      },
      // 2 stones: a scatter of small rounded pebbles with a lit top and a dark foot
      (c, w, h) => {
        const rnd = mulberry32(7307);
        for (let i = 0; i < 46; i++) {
          const a = rnd() * Math.PI * 2;
          const r = Math.sqrt(rnd()) * w * 0.4;
          const x = w * 0.5 + Math.cos(a) * r;
          const y = h * 0.5 + Math.sin(a) * r * 0.82;
          const sr = w * (0.014 + Math.pow(rnd(), 1.6) * 0.04);
          const grey = mixRgb([104, 96, 86], [142, 132, 116], rnd());
          const g = c.createRadialGradient(x - sr * 0.3, y - sr * 0.4, 0, x, y, sr);
          g.addColorStop(0, rgbStr(grey, 1.12));
          g.addColorStop(0.7, rgbStr(grey, 0.85));
          g.addColorStop(1, rgbStr(grey, 0.45));
          c.fillStyle = g;
          c.beginPath();
          c.ellipse(x, y, sr, sr * (0.6 + rnd() * 0.3), rnd() * Math.PI, 0, Math.PI * 2);
          c.fill();
        }
      },
      // 3 twigs and dung: dark broken sticks and a few dark rounded balls
      (c, w, h) => {
        const rnd = mulberry32(7409);
        c.lineCap = 'round';
        for (let i = 0; i < 36; i++) {
          const a = rnd() * Math.PI * 2;
          const r = Math.sqrt(rnd()) * w * 0.42;
          const x = w * 0.5 + Math.cos(a) * r;
          const y = h * 0.5 + Math.sin(a) * r * 0.82;
          const ang = rnd() * Math.PI;
          const l = w * (0.06 + rnd() * 0.18);
          c.strokeStyle = rgbStr(mixRgb(SAV.twig, SAV.twigPale, rnd() * 0.7), 1);
          c.lineWidth = w * (0.006 + rnd() * 0.01);
          c.beginPath();
          c.moveTo(x - Math.cos(ang) * l * 0.5, y - Math.sin(ang) * l * 0.5);
          c.lineTo(x + Math.cos(ang) * l * 0.5, y + Math.sin(ang) * l * 0.5);
          c.stroke();
        }
        for (let i = 0; i < 5; i++) {
          const x = w * (0.3 + rnd() * 0.4);
          const y = h * (0.35 + rnd() * 0.3);
          const sr = w * (0.03 + rnd() * 0.02);
          const g = c.createRadialGradient(x - sr * 0.3, y - sr * 0.4, 0, x, y, sr);
          g.addColorStop(0, rgbStr([92, 74, 50], 1));
          g.addColorStop(1, rgbStr([46, 36, 24], 1));
          c.fillStyle = g;
          c.beginPath();
          c.ellipse(x, y, sr, sr * 0.7, 0, 0, Math.PI * 2);
          c.fill();
        }
      },
    ],
    { bleed: mixRgb(SAV.duff, SAV.khaki, 0.5) },
  );
}

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

// ---------------------------------------------------------------------------
// Whole-tree billboards for the mid and far bands. Painted rather than
// rendered, so the far plain can carry an order of magnitude more trees than
// the geometry band for a handful of triangles.
// ---------------------------------------------------------------------------

/**
 * The trunk and limbs of an acacia, drawn as strokes: a short bole that splits
 * into several limbs leaning outward and up, each forking again toward the
 * crown. `spread` is the half-width the limbs reach at crown height.
 */
function acaciaSkeleton(ctx, rnd, cx, baseY, crownY, spread, boleW, col) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgbStr(col, 1);
  const boleTop = baseY - (baseY - crownY) * (0.28 + rnd() * 0.12);
  ctx.lineWidth = boleW;
  ctx.beginPath();
  ctx.moveTo(cx + (rnd() - 0.5) * boleW * 0.3, baseY);
  ctx.quadraticCurveTo(cx + (rnd() - 0.5) * boleW, (baseY + boleTop) * 0.5, cx, boleTop);
  ctx.stroke();
  const limbs = 3 + Math.floor(rnd() * 3);
  const tips = [];
  for (let i = 0; i < limbs; i++) {
    const t = limbs === 1 ? 0.5 : i / (limbs - 1);
    const dirn = (t - 0.5) * 2 + (rnd() - 0.5) * 0.3;
    const ex = cx + dirn * spread * (0.55 + rnd() * 0.3);
    const ey = crownY + (baseY - crownY) * 0.08 * rnd();
    ctx.lineWidth = boleW * (0.42 + rnd() * 0.2);
    ctx.beginPath();
    ctx.moveTo(cx, boleTop + boleW * 0.3);
    ctx.quadraticCurveTo(cx + dirn * spread * 0.2, lerp(boleTop, ey, 0.55), ex, ey);
    ctx.stroke();
    for (let k = 0; k < 2; k++) {
      const fx = ex + (dirn + (rnd() - 0.5) * 1.2) * spread * 0.32;
      const fy = crownY - (baseY - crownY) * 0.04 * rnd();
      ctx.lineWidth = boleW * 0.2;
      ctx.beginPath();
      ctx.moveTo(lerp(cx, ex, 0.6), lerp(boleTop, ey, 0.6));
      ctx.quadraticCurveTo(ex, ey, fx, fy);
      ctx.stroke();
      tips.push({ x: fx, y: fy, dx: fx - ex, dy: fy - ey });
    }
  }
  return tips;
}

/**
 * An umbrella acacia: the skeleton and, over it, a flat-bottomed lens of foliage
 * whose top is a low dome and whose underside is the browse line. Built from
 * clumps so the outline is ragged and the mass has a lit top and a dark belly.
 */
function acaciaPaint(ctx, rnd, cx, baseY, topY, halfW, cols, { thick = 0.3, dome = 0.5, gaps = 0.25 } = {}) {
  const { dark, mid, light, trunk } = cols;
  const treeH = baseY - topY;
  const crownH = treeH * thick;
  const crownY = topY + crownH;
  acaciaSkeleton(ctx, rnd, cx, baseY, crownY - crownH * 0.3, halfW * 0.8, halfW * 0.12, trunk);
  const sw = halfW * 0.045;
  // clumps along the crown, densest at the centre, fewer and smaller at the
  // tips; a few are skipped to leave sky holes in the mass
  const n = 34;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n - 0.5;
    if (rnd() < gaps * Math.abs(u) * 2) continue;
    const x = cx + u * 2 * halfW * (0.94 + rnd() * 0.08);
    const edge = 1 - Math.pow(Math.abs(u) * 2, 2.4);
    const top = topY + crownH * (1 - dome) * (1 - edge) + crownH * 0.04;
    const bottom = crownY - crownH * 0.06 * rnd();
    const cy = (top + bottom) * 0.5 + (rnd() - 0.5) * crownH * 0.15;
    const ry = Math.max(sw, (bottom - top) * 0.5 * (0.7 + edge * 0.5));
    const rx = halfW * (0.09 + rnd() * 0.05);
    clump(ctx, rnd, x, cy, rx, ry, 70, dark, mid, light, sw, sw * 2.2);
  }
  // a dark lower band under the whole crown: the underside of an umbrella
  // crown is in its own shadow, and that flat dark line is the silhouette a
  // viewer knows this tree by
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, topY, 0, crownY);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.5, 'rgba(10,10,4,0.1)');
  g.addColorStop(1, 'rgba(10,10,4,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - halfW * 1.1, topY, halfW * 2.2, crownH);
  ctx.restore();
}

/** A round-crowned tree: a taller bole and a dense oval of clumps. */
function roundPaint(ctx, rnd, cx, baseY, topY, halfW, cols) {
  const { dark, mid, light, trunk } = cols;
  const treeH = baseY - topY;
  const crownH = treeH * 0.62;
  const crownY = topY + crownH;
  acaciaSkeleton(ctx, rnd, cx, baseY, crownY - crownH * 0.25, halfW * 0.5, halfW * 0.16, trunk);
  const cyc = topY + crownH * 0.5;
  for (let i = 0; i < 30; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.pow(rnd(), 0.6);
    const x = cx + Math.cos(a) * r * halfW * 0.86;
    const y = cyc + Math.sin(a) * r * crownH * 0.46;
    const crx = halfW * (0.14 + rnd() * 0.12) * (1 - r * 0.3);
    clump(ctx, rnd, x, y, crx, crx * (0.75 + rnd() * 0.3), 90, dark, mid, light, halfW * 0.04, halfW * 0.09);
  }
}

/** A dead tree: the skeleton alone, pale, with the limbs carried on to fine tips. */
function deadPaint(ctx, rnd, cx, baseY, topY, halfW, col) {
  const treeH = baseY - topY;
  const tips = acaciaSkeleton(ctx, rnd, cx, baseY, topY + treeH * 0.26, halfW * 0.85, halfW * 0.13, col);
  ctx.strokeStyle = rgbStr(col, 1);
  ctx.lineCap = 'round';
  // Each fork carries on into two or three fine twigs that continue its own
  // direction and bend upward, and each of those forks once more; a twig that
  // does not start where a limb ends reads as a stroke and not as wood.
  const twig = (x, y, dx, dy, l, w, depth) => {
    const len = Math.hypot(dx, dy) || 1;
    let ux = dx / len;
    let uy = dy / len;
    // curl toward vertical
    ux = ux * 0.6 + (rnd() - 0.5) * 0.5;
    uy = uy * 0.6 - 0.7;
    const n = Math.hypot(ux, uy);
    ux /= n;
    uy /= n;
    const ex = x + ux * l;
    const ey = y + uy * l;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + ux * l * 0.5 + uy * l * 0.15 * (rnd() - 0.5), y + uy * l * 0.5, ex, ey);
    ctx.stroke();
    if (depth > 0) {
      const k = 1 + Math.floor(rnd() * 2);
      for (let i = 0; i < k; i++) twig(lerp(x, ex, 0.55 + rnd() * 0.45), lerp(y, ey, 0.55 + rnd() * 0.45), ux + (rnd() - 0.5) * 1.2, uy, l * 0.62, w * 0.6, depth - 1);
    }
  };
  for (const t of tips) {
    const k = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < k; i++) twig(t.x, t.y, t.dx + (rnd() - 0.5) * halfW * 0.3, t.dy, halfW * (0.22 + rnd() * 0.16), halfW * 0.035, 2);
  }
}

export function savannaBillboardAtlas() {
  // The lit end is held close to the mid tone: a distant crown painted with a
  // real sun-to-shade range gets haze laid on top of it and the bright strokes
  // come out at the value of the sky. The dark end is not pushed to black
  // either, because the near members of this band sit at 40-60 m.
  const pal = {
    dark: mixRgb(SAV.acaciaShade, [0, 0, 0], 0.15),
    mid: mixRgb(SAV.acaciaMid, SAV.acaciaShade, 0.25),
    light: mixRgb(SAV.acaciaMid, SAV.acaciaSun, 0.55),
    trunk: mixRgb(SAV.twig, [0, 0, 0], 0.25),
    haze: SAV.hazeNear,
  };
  const hz = (d) => ({
    dark: mixRgb(pal.dark, pal.haze, d),
    mid: mixRgb(pal.mid, pal.haze, d * 0.9),
    light: mixRgb(pal.light, pal.haze, d * 0.7),
    trunk: mixRgb(pal.trunk, pal.haze, d),
  });
  return atlas(
    'nat.savBillboards',
    cell(512),
    [
      // 0 one umbrella thorn, wide and flat, filling the cell's width
      (c, w, h) => {
        const rnd = mulberry32(31001);
        acaciaPaint(c, rnd, w * 0.5, h * 0.99, h * 0.3, w * 0.4, hz(0.04), { thick: 0.22, dome: 0.55, gaps: 0.2 });
        shadeCore(c, w, h, 0.15, { from: 'bottom' });
      },
      // 1 a group: a big one behind two smaller, offset, so the sky slots move
      // with every yaw and mirror
      (c, w, h) => {
        const rnd = mulberry32(31511);
        acaciaPaint(c, rnd, w * 0.54, h * 0.99, h * 0.22, w * 0.38, hz(0.4), { thick: 0.22, dome: 0.5, gaps: 0.2 });
        acaciaPaint(c, rnd, w * 0.24, h * 0.99, h * 0.58, w * 0.2, hz(0.1), { thick: 0.26, dome: 0.6, gaps: 0.3 });
        acaciaPaint(c, rnd, w * 0.8, h * 0.99, h * 0.64, w * 0.17, hz(0.0), { thick: 0.28, dome: 0.6, gaps: 0.3 });
        shadeCore(c, w, h, 0.15, { from: 'bottom' });
      },
      // 2 a round-crowned tree, taller than it is wide, a real green
      (c, w, h) => {
        const rnd = mulberry32(32003);
        // hazed like the umbrellas: a saturated green at the horizon was the
        // one dark thing on the skyline and read as a hole in it
        roundPaint(c, rnd, w * 0.5, h * 0.99, h * 0.06, w * 0.36, {
          dark: mixRgb(SAV.roundShade, pal.haze, 0.14),
          mid: mixRgb(mixRgb(SAV.roundMid, SAV.roundShade, 0.2), pal.haze, 0.12),
          light: mixRgb(mixRgb(SAV.roundMid, SAV.roundSun, 0.5), pal.haze, 0.08),
          trunk: mixRgb(pal.trunk, pal.haze, 0.2),
        });
        shadeCore(c, w, h, 0.3, { from: 'bottom' });
      },
      // 3 a dead tree, pale against the olive
      (c, w, h) => deadPaint(c, mulberry32(32507), w * 0.5, h * 0.99, h * 0.14, w * 0.36, [128, 118, 104]),
    ],
    { bleed: mixRgb(SAV.acaciaShade, SAV.acaciaMid, 0.5) },
  );
}

/** Coarse dry-grass ground for the skirt that continues past the terrain mesh. */
export function farGroundMaps() {
  return cached('nat.farGround', () => {
    const n = 128;
    const dark = mixRgb(SAV.khaki, SAV.earthDark, 0.35);
    const mid = mixRgb(SAV.straw, SAV.khaki, 0.4);
    const bare = mixRgb(SAV.earth, SAV.ochre, 0.4);
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const a = fbm(u * 5, v * 5, { octaves: 4, period: 5, seed: 411 });
        const b = fbm(u * 19, v * 19, { octaves: 3, period: 19, seed: 419 });
        let c = mixRgb(dark, mid, smoothstep(0.3, 0.75, a));
        c = mixRgb(c, bare, smoothstep(0.6, 0.92, b) * 0.45);
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
// Distant horizon strips
// ---------------------------------------------------------------------------

/**
 * The far savanna: a low, broken line of scrub with flat-topped trees standing
 * clear of it at intervals, and sky between them. Nothing here is a wall — the
 * whole point of the biome is that the horizon is mostly open — so the strip
 * is transparent for most of its length and its trees are drawn small, wide
 * and few, in three depth layers that each carry their own haze.
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
        const deep = mixRgb(SAV.acaciaShade, SAV.acaciaMid, 0.3);
        const haze = SAV.hazeFar;
        ctx.lineCap = 'round';

        // a low scrub line along the foot, broken, never more than a tenth of
        // the strip high: the grass plain runs right up to the horizon and the
        // scrub is what breaks the line of it
        const scrubCol = (d) => mixRgb(deep, haze, d);
        // Gated hard: at a ring card's scale (a quarter of this strip is a
        // thirty-metre card) a scrub line that ran the whole width was a
        // continuous dark wall under the trees, and the wall is what the
        // skyline read as. Now it is patches, and mostly absent.
        for (let layer = 0; layer < 3; layer++) {
          const d = 0.6 - layer * 0.22;
          ctx.fillStyle = rgbStr(scrubCol(d), 1, 0.8);
          for (let x = 0; x < cw; x += 3) {
            const n = fbm(x * 0.012 + layer * 9.1, variant * 3.3 + layer, { octaves: 3, period: 12, seed: 55 + layer });
            const gate = smoothstep(0.52, 0.66, fbm(x * 0.004 + layer * 3, variant * 1.7, { octaves: 2, period: 8, seed: 66 + layer }));
            const hh = ch * (0.015 + n * 0.045) * gate;
            if (hh < 1) continue;
            ctx.fillRect(x, ch * 0.985 - hh, 3.5, hh + 1);
          }
        }

        // trees: a few per layer, umbrella shapes wide and low, the far layer
        // smallest and closest to the haze. Twenty-three per strip was a tree
        // every six metres on the ring — woodland; a savanna skyline is open
        // ground with a crown standing on it every twenty or thirty.
        const layers = [
          { n: 4, d: 0.62, hi: [0.14, 0.24], wid: [1.3, 2.0] },
          { n: 4, d: 0.4, hi: [0.2, 0.34], wid: [1.2, 1.9] },
          { n: 3, d: 0.18, hi: [0.28, 0.46], wid: [1.1, 1.8] },
        ];
        for (const L of layers) {
          for (let i = 0; i < L.n; i++) {
            const cx = ((i + rnd() * 0.9) / L.n) * cw;
            const height = ch * lerp(L.hi[0], L.hi[1], rnd());
            const halfW = height * lerp(L.wid[0], L.wid[1], rnd()) * 0.5;
            const cols = {
              dark: mixRgb(deep, haze, L.d),
              mid: mixRgb(mixRgb(deep, SAV.acaciaMid, 0.5), haze, L.d),
              light: mixRgb(SAV.acaciaMid, haze, L.d + 0.1),
              trunk: mixRgb(SAV.twig, haze, L.d),
            };
            if (rnd() < 0.12) deadPaint(ctx, rnd, cx, ch * 0.985, ch * 0.985 - height, halfW * 0.6, mixRgb([120, 112, 100], haze, L.d));
            else if (rnd() < 0.2) roundPaint(ctx, rnd, cx, ch * 0.985, ch * 0.985 - height * 1.2, halfW * 0.55, cols);
            else acaciaPaint(ctx, rnd, cx, ch * 0.985, ch * 0.985 - height, halfW, cols, { thick: 0.3, dome: 0.5, gaps: 0.15 });
          }
        }

        // warm rim on the crown tops, and only there
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        const g = ctx.createLinearGradient(0, ch * 0.5, 0, ch);
        g.addColorStop(0, 'rgba(255,214,160,0.16)');
        g.addColorStop(0.3, 'rgba(255,214,160,0.02)');
        g.addColorStop(1, 'rgba(30,24,12,0.3)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();
      },
      { srgb: true, repeat: 1, aniso: 2, height: h },
    );
  });
}

/** Soft hill silhouette for the very back of the scene, in the dry-season haze. */
export function ridgeTexture(variant = 0) {
  return cached('nat.ridge.' + variant, () => {
    const w = 1024;
    const h = 256;
    return cutoutTexture(
      w,
      (ctx, cw, ch) => {
        ctx.clearRect(0, 0, cw, ch);
        const col = mixRgb(SAV.hazeFar, [120, 118, 112], 0.4);
        ctx.fillStyle = rgbStr(col, 1);
        ctx.beginPath();
        ctx.moveTo(0, ch);
        for (let x = 0; x <= cw; x += 8) {
          const u = x * 0.0045 + variant * 7.7;
          const n =
            fbm(u, 0.5, { octaves: 4, period: 32, seed: 91 }) * 0.7 +
            fbm(u * 3.4, 1.5, { octaves: 3, period: 32, seed: 97 }) * 0.3;
          // a long low profile with the odd inselberg, not a mountain wall
          const berg = Math.pow(smoothstep(0.7, 0.95, fbm(u * 1.8 + 3, 2.5, { octaves: 2, period: 32, seed: 103 })), 2) * 0.35;
          ctx.lineTo(x, ch - ch * clamp(0.12 + n * 0.3 + berg));
        }
        ctx.lineTo(cw, ch);
        ctx.closePath();
        ctx.fill();
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        const g = ctx.createLinearGradient(0, ch * 0.4, 0, ch);
        g.addColorStop(0, 'rgba(255,226,190,0.2)');
        g.addColorStop(0.4, 'rgba(180,170,160,0.0)');
        g.addColorStop(1, 'rgba(60,54,44,0.25)');
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

/**
 * Granite for the kopjes and the scattered stones: a warm grey with a pink
 * feldspar cast, exfoliating in sheets, dark where rain runs off the top and
 * bright orange where the lichen has taken. No moss anywhere on it.
 */
export function rockMaps(seed = 9) {
  return cached('nat.rock.' + seed, () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const sheet = ridged(u * 3, v * 5, { octaves: 4, period: 5, seed });
      const chip = worley(u * 11, v * 11, 11, seed + 3);
      const grain = fbm(u * 52, v * 52, { octaves: 3, period: 52, seed: seed + 8 });
      return clamp(Math.pow(sheet, 1.3) * 0.46 + smoothstep(0.0, 0.3, chip.f1) * 0.34 + grain * 0.2);
    });
    const normal = normalFromHeight(hf, n, n, 3.2, { repeat: 2 });
    const grey = [112, 104, 96];
    const pink = [142, 124, 110];
    const pale = [160, 152, 138];
    const dark = [56, 52, 48];
    const streak = [70, 62, 56];
    const lichenOrange = [196, 132, 62];
    const lichenPale = [178, 176, 150];
    const map = pixelTexture(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const d = hf[y * n + x];
        let c = mixRgb(dark, grey, smoothstep(0.1, 0.62, d));
        c = mixRgb(c, pink, smoothstep(0.45, 0.85, fbm(u * 4, v * 4, { octaves: 3, period: 4, seed: seed + 14 })) * 0.5);
        c = mixRgb(c, pale, smoothstep(0.74, 0.98, d) * 0.7);
        // vertical water streaks, dark, running down from the exfoliation edges
        const run = ridged(u * 9, v * 0.6, { octaves: 3, period: 9, seed: seed + 18 });
        c = mixRgb(c, streak, Math.pow(run, 3) * 0.5 * (1 - smoothstep(0.6, 0.9, d)));
        const l1 = smoothstep(0.66, 0.9, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: seed + 20 }));
        const l2 = smoothstep(0.7, 0.92, fbm(u * 15, v * 15, { octaves: 4, period: 15, seed: seed + 26 }));
        c = mixRgb(c, lichenOrange, l1 * 0.7 * smoothstep(0.35, 0.8, d));
        c = mixRgb(c, lichenPale, l2 * 0.45 * smoothstep(0.45, 0.9, d));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 2 },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.66 + (1 - hf[y * n + x]) * 0.28), { repeat: 2 });
    const ao = roughnessTexture(n, n, (x, y) => clamp(0.3 + hf[y * n + x] * 0.8), { repeat: 2 });
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
