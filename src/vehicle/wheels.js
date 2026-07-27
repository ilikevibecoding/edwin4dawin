import * as THREE from 'three';
import { BufferGeometryUtils, bolt, profile, rbox, rivet, transform, tube } from '../lib/geo.js';
import {
  cached,
  clamp,
  fbm,
  heightField,
  lerp,
  makeCanvas,
  mulberry32,
  normalFromHeight,
  pixelTexture,
  roughnessTexture,
  smoothstep,
  worley,
} from '../textures/core.js';
import { SPEC as S } from './spec.js';

// ---------------------------------------------------------------------------
// Wheels, tyres, brakes and the live axles. Wheel local space has the axle
// along X, outboard at +X.
//
// Three things carry the look here:
//   1. the tread is real geometry — a revolved carcass with 100+ solid lug
//      blocks bolted onto the crown and over the shoulder, so the silhouette
//      is genuinely notched instead of being a normal-mapped circle,
//   2. the rim is a lathed shell with a dish deep enough to see into, and the
//      brake rotor, caliper and a black cavity sit behind the spoke windows,
//   3. everything is tinted per-vertex, so dust in the tread voids and bright
//      machined faces give the wheel a value range even in full shade.
// ---------------------------------------------------------------------------

// --- proportions -----------------------------------------------------------
const R = S.wheelRadius; // 0.445, radius over the lug tips
const SEC = S.wheelWidth * 0.5; // section half width at the sidewall bulge
const RIM = S.rimRadius; // bead seat radius
const RHW = 0.141; // rim half width, bead to bead
const CROWN = R - 0.030; // void floor between the lugs
const LUG_H = 0.056; // lug block radial thickness
const LUG_R = CROWN + 0.024; // lug block centre radius -> tip at R + 0.022
const LUG_ROWS = 16;
const BEAD_R = RIM + 0.003;
// Depth below the hub at which the tread flattens off. Slightly more than the
// ride height so the contact patch is buried in the dirt, never tangent to it.
const CONTACT = R + 0.005;

const LIN = (hex) => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
};
/** 0-255 sRGB triple. Colour maps are authored here, vertex tints in linear. */
const SRGB = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// Faintly blue-black. The sun here is warm and the ground bounce warmer still,
// so a *neutral* grey rubber comes back off the renderer as khaki; the albedo has
// to lean cool by about as much as the light leans warm for the tyre to read
// black on screen rather than on the swatch.
const RUBBER = LIN(0x262b34);
// Dust on a tyre is a thin film of earth over black rubber, so this has to stay
// within a stop or two of RUBBER's ~0.03 linear. Anything brighter stops being
// soil on the tread and becomes the tread's colour instead. It is also kept
// close to neutral: a saturated brown at 60% coverage tints the whole block.
const TREAD_DUST = LIN(0x3c3a34);

// ---------------------------------------------------------------------------
// A local kit-basher. Same idea as lib/geo.js `Kit`, with two differences that
// matter for running gear: it keeps the source normals (so lathed rims and
// tyres stay smooth instead of faceted), and every part carries a vertex
// colour so a hundred greebles can hold different values in one draw call.
// ---------------------------------------------------------------------------

const MIRROR_X = new THREE.Matrix4().makeScale(-1, 1, 1);

function flipWinding(geo) {
  for (const attr of Object.values(geo.attributes)) {
    const a = attr.array;
    const n = attr.itemSize;
    for (let i = 0; i < attr.count; i += 3) {
      for (let c = 0; c < n; c++) {
        const p = (i + 1) * n + c;
        const q = (i + 2) * n + c;
        const t = a[p];
        a[p] = a[q];
        a[q] = t;
      }
    }
    attr.needsUpdate = true;
  }
  return geo;
}

function paint(geo, tint, shade) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const n = pos.count;
  const col = new Float32Array(n * 3);
  const base = tint === undefined ? [1, 1, 1] : LIN(tint);
  if (shade) {
    for (let i = 0; i < n; i++) {
      const c = shade(pos.getX(i), pos.getY(i), pos.getZ(i), nor.getX(i), nor.getY(i), nor.getZ(i));
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
    }
  } else {
    for (let i = 0; i < n; i++) {
      col[i * 3] = base[0];
      col[i * 3 + 1] = base[1];
      col[i * 3 + 2] = base[2];
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

class Bash {
  constructor(name = 'bash') {
    this.name = name;
    this.buckets = new Map();
  }

  _push(key, geo) {
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push(geo);
  }

  _prep(geo, opts) {
    let g = geo.clone();
    if (opts.pos || opts.rot || opts.scale) transform(g, opts);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (g.index) g = g.toNonIndexed();
    if (g.attributes.uv1) g.deleteAttribute('uv1');
    if (g.attributes.uv2) g.deleteAttribute('uv2');
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    return g;
  }

  /** add(key, geo, { pos, rot, scale, tint, shade }) */
  add(key, geo, opts = {}) {
    this._push(key, paint(this._prep(geo, opts), opts.tint, opts.shade));
    return this;
  }

  /** The same part on both sides of the centreline, with the winding fixed. */
  addMirrored(key, geo, opts = {}) {
    this.add(key, geo, opts);
    const g = this._prep(geo, opts);
    g.applyMatrix4(MIRROR_X);
    flipWinding(g);
    this._push(key, paint(g, opts.tint, opts.shade));
    return this;
  }

  build(materials, { castShadow = true, receiveShadow = true } = {}) {
    const group = new THREE.Group();
    group.name = this.name;
    for (const [key, list] of this.buckets) {
      const mat = materials[key];
      if (!mat) {
        console.warn(`[wheels] missing material "${key}"`);
        continue;
      }
      const merged = list.length === 1 ? list[0] : BufferGeometryUtils.mergeGeometries(list, false);
      if (!merged) {
        console.warn(`[wheels] merge failed for "${key}"`);
        continue;
      }
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = `${this.name}_${key}`;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      group.add(mesh);
    }
    return group;
  }
}

/**
 * Road film: dust settles on every up-facing surface and the undersides go
 * dark. One vertex-colour trick that does most of the work of making cast
 * parts read as a dirty truck rather than grey primitives.
 */
function grime(baseHex, { dust = 0x8b7c5d, up = 0.78, down = 0.42, jitter = 0 } = {}) {
  const base = LIN(baseHex);
  const dst = LIN(dust);
  return (x, y, z, nx, ny, nz) => {
    // Dust settles thickest on level surfaces and thins off as they turn
    // vertical; on a live axle that gradient is the whole reason the housing
    // reads as a shape at all, because nothing down there is directly lit.
    const t = clamp(ny * 0.75 + 0.25) ** 1.6 * up;
    const c = mix3(base, dst, t);
    const k = 1 - clamp(-ny) ** 1.2 * down + (jitter ? (Math.sin(x * 91 + y * 57 + z * 31) * 0.5 + 0.5) * jitter : 0);
    return [c[0] * k, c[1] * k, c[2] * k];
  };
}

// ---------------------------------------------------------------------------
// Textures. All local: the tyre needs its own atlas (the sidewall lettering
// has to land on the right band of the section) and the running gear needs a
// wider value range than the shared library carries.
// ---------------------------------------------------------------------------

function makeTex(w, h, fn, opts) {
  return pixelTexture(w, h, fn, opts);
}

const TW = 512;
const TH = 320;

// The tyre atlas is the one texture here whose v axis has to line up with a
// specific band of the carcass, so it is uploaded unflipped: row 0 is v = 0 and
// the generators below can treat y / TH as the uv coordinate directly.
const ATLAS = { srgb: true, repeat: [2, 1], flipY: false };

/** Moulded sidewall lettering, drawn once and read back as a height mask. */
function letterMask() {
  const c = makeCanvas(TW, TH);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, TW, TH);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Row 0 is v = 0 and v runs up the sidewall, so each string is drawn into a
  // vertically flipped frame to come out upright on the tyre.
  const line = (text, u, v, px, weight = 'bold') => {
    ctx.save();
    ctx.translate(u * TW, v * TH);
    ctx.scale(1, -1);
    ctx.font = `${weight} ${px}px sans-serif`;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };
  // the widest, most visible part of the sidewall carries the brand
  line('RIDGELINE', 0.26, 0.812, 25);
  line('GRAPPLER  M/T', 0.26, 0.779, 12);
  line('LT315/70R17', 0.74, 0.812, 19);
  line('TUBELESS  RADIAL', 0.74, 0.779, 10, '600');
  line('MAX LOAD 1655kg  MAX PRESS 550kPa', 0.5, 0.918, 7, '500');
  line('DOT R4LK RG9R 4218   E4', 0.5, 0.902, 6, '500');
  // moulding lines top and bottom of the brand block
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  for (const v of [0.752, 0.858]) {
    ctx.beginPath();
    ctx.moveTo(0, v * TH);
    ctx.lineTo(TW, v * TH);
    ctx.stroke();
  }
  // moulded wear indicators and directional arrows around the shoulder step
  for (let i = 0; i < 16; i++) {
    ctx.save();
    ctx.translate(((i + 0.5) / 16) * TW, 0.714 * TH);
    ctx.beginPath();
    ctx.moveTo(-6, 5);
    ctx.lineTo(6, 5);
    ctx.lineTo(0, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  const d = ctx.getImageData(0, 0, TW, TH).data;
  const out = new Float32Array(TW * TH);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
  return out;
}

/**
 * The tyre atlas. u wraps twice around the circumference; v runs across the
 * section, 0 at the inboard bead through 0.5 at the crown to 1 outboard.
 */
function carcassMaps() {
  return cached('wheel.carcass', () => {
    const lett = letterMask();
    const band = (v, a, b) => smoothstep(a, a + 0.008, v) * (1 - smoothstep(b - 0.008, b, v));

    const protector = (v) => band(v, 0.955, 0.995);

    const hf = heightField(TW, TH, (x, y) => {
      const u = x / TW;
      const v = y / TH;
      const pebble = worley(u * 74, v * 46, 74, 21).f1;
      let h = smoothstep(0.0, 0.4, pebble) * 0.2 + fbm(u * 30, v * 20, { octaves: 3, period: 30, seed: 9 }) * 0.14;
      // decorative radial ribs up the sidewalls
      const ribs = Math.abs(Math.sin(u * Math.PI * 88));
      h += smoothstep(0.4, 1.0, ribs) * (band(v, 0.7, 0.76) + band(v, 0.24, 0.3)) * 0.45;
      // circumferential steps: rim protector, bead ribbing, shoulder ledge
      h += protector(v) * 0.6;
      h += band(v, 0.005, 0.04) * 0.4;
      h += band(v, 0.845, 0.872) * 0.22;
      // Moulded lettering. With the albedo now within a stop of the carcass the
      // relief is the only thing making it legible, so it is worth most of the
      // height range on its own.
      h += lett[y * TW + x] * 0.95;
      // crown: siping across the void floor
      const sipe = Math.abs(Math.sin(u * Math.PI * LUG_ROWS * 2));
      h -= (1 - smoothstep(0.0, 0.22, sipe)) * band(v, 0.36, 0.64) * 0.3;
      return clamp(h, 0, 1);
    });

    // Two separate layers of filth, both darker than the rubber is bright.
    // Dust only survives where nothing wipes it — down in the crown voids, in
    // the bead valley, and in thrown streaks — so the lettering band and the
    // lug crowns stay black rubber. dc is the distance from the crown centre:
    // 0..0.15 is the tread, 0.28..0.42 the sidewall, 0.45+ the bead.
    const dustAt = (u, v) => {
      const dc = Math.abs(v - 0.5);
      const g = fbm(u * 9, v * 7, { octaves: 5, period: 9, seed: 31 });
      const streak = fbm(u * 26, v * 4, { octaves: 3, period: 26, seed: 58 });
      const voids = 1 - smoothstep(0.1, 0.18, dc);
      const bead = smoothstep(0.4, 0.48, dc);
      let d = voids * 0.62 + bead * 0.34;
      d *= 0.4 + g * 0.95;
      d += smoothstep(0.68, 0.96, streak) * 0.14;
      return clamp(d);
    };
    // Cake is thick earth, and thick earth only stays where the section is
    // horizontal or sheltered: the void floors and the shoulder step. It used to
    // reach dc 0.30 and fade over 0.13, which put 60% coverage of warm brown
    // straight across the lettering band at dc 0.25-0.36 — the single reason the
    // sidewall measured r:b 1.50 and read tan. It now stops short of the letters.
    const cakeAt = (u, v) => {
      const dc = Math.abs(v - 0.5);
      const n = fbm(u * 13, v * 9, { octaves: 4, period: 13, seed: 71 });
      const m = fbm(u * 5, v * 3, { octaves: 3, period: 5, seed: 23 });
      // packed solid through the voids, with a few fingers over the shoulder
      const reach = 0.12 + m * 0.08;
      return clamp((1 - smoothstep(reach, reach + 0.1, dc)) * (0.25 + n * 0.75));
    };

    const rub = SRGB(0x24292f);
    const dust = SRGB(0x46433d);
    const cake = SRGB(0x3d3327);
    // Moulded lettering is rubber, not paint: it reads by relief in the normal
    // map and by taking a different specular, so the albedo shift is only just
    // enough to stop the raised faces disappearing in shade.
    const pale = SRGB(0x3a3b40);
    const rock = SRGB(0x5b5952);
    const map = makeTex(
      TW,
      TH,
      (x, y, out) => {
        const u = x / TW;
        const v = y / TH;
        const l = lett[y * TW + x];
        let c = mix3(rub, cake, cakeAt(u, v));
        c = mix3(c, dust, dustAt(u, v) * (1 - l * 0.85));
        c = mix3(c, pale, l * 0.28);
        // rim protector: bare rubber scraped grey by rock
        const scuff = protector(v) * smoothstep(0.35, 0.8, fbm(u * 22, v * 6, { octaves: 3, period: 22, seed: 77 }));
        c = mix3(c, rock, scuff * 0.6);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      ATLAS,
    );

    const normal = normalFromHeight(hf, TW, TH, 2.8, { repeat: [2, 1], flipY: false });
    const rough = roughnessTexture(
      TW,
      TH,
      (x, y) => {
        const u = x / TW;
        const v = y / TH;
        const l = lett[y * TW + x];
        // Raised and scrubbed rubber is glossier than the dusty flats around it.
        // With the tyre this dark the specular break is most of what separates
        // the lettering, the shoulder and the packed voids from each other.
        return clamp(0.62 + dustAt(u, v) * 0.34 + cakeAt(u, v) * 0.16 - protector(v) * 0.22 - l * 0.3);
      },
      { repeat: [2, 1], flipY: false },
    );
    return { map, normal, rough };
  });
}

/**
 * Pebbled rubber for the lug blocks. This map multiplies the vertex albedo, so
 * its mean is a second brightness control on the whole tread: near-white it
 * passed the vertex colour through untouched and the blocks read a stop lighter
 * than the sidewall next to them. Wider range, lower mean — the pebble grain
 * gets more contrast and the tread gets darker at the same time.
 */
function lugMaps() {
  return cached('wheel.lug', () => {
    const n = 128;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const cell = worley(u * 30, v * 30, 30, 44).f1;
      return smoothstep(0.0, 0.34, cell) * 0.6 + fbm(u * 22, v * 22, { octaves: 3, period: 22, seed: 12 }) * 0.4;
    });
    const normal = normalFromHeight(hf, n, n, 1.9, { repeat: 3 });
    const map = makeTex(
      n,
      n,
      (x, y, out) => {
        const h = hf[y * n + x];
        out[0] = out[1] = out[2] = clamp(0.56 + h * 0.42) * 255;
      },
      { srgb: true, repeat: 3 },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.72 + (1 - hf[y * n + x]) * 0.24), { repeat: 3 });
    return { map, normal, rough };
  });
}

/** Machined aluminium: turning marks, dings, dust in the low spots. */
function machinedMaps() {
  return cached('wheel.machined', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      // Turning marks have to stay well under Nyquist or they alias into
      // stripes as soon as the part is more than a metre away.
      const grain = fbm(u * 34, v * 9, { octaves: 3, period: 34, seed: 5 });
      const dings = worley(u * 9, v * 9, 9, 61).f1;
      return grain * 0.55 + smoothstep(0.0, 0.06, dings) * 0.45;
    });
    const normal = normalFromHeight(hf, n, n, 1.1, { repeat: 2 });
    const map = makeTex(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const dirt = smoothstep(0.42, 0.88, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: 88 }));
        const ox = smoothstep(0.55, 0.95, fbm(u * 4, v * 11, { octaves: 4, period: 4, seed: 34 }));
        // Aluminium, a touch blue. Kept well below white: a beadlock ring and six
        // spoke faces at near-paper brightness turn the whole wheel cream, and
        // the wheel is a third of the close frame.
        let c = [148 + h * 32, 151 + h * 32, 156 + h * 30];
        c = mix3(c, SRGB(0x6f6553), dirt * 0.72);
        c = mix3(c, SRGB(0x585349), ox * 0.45);
        out[0] = Math.min(255, c[0]);
        out[1] = Math.min(255, c[1]);
        out[2] = Math.min(255, c[2]);
      },
      { srgb: true, repeat: 2 },
    );
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const u = x / n;
        const v = y / n;
        const dirt = smoothstep(0.42, 0.88, fbm(u * 7, v * 7, { octaves: 5, period: 7, seed: 88 }));
        // satin, never mirror: a mirror in a dark wheel well is a black hole
        return clamp(0.42 + (1 - hf[y * n + x]) * 0.22 + dirt * 0.34);
      },
      { repeat: 2 },
    );
    return { map, normal, rough };
  });
}

/** Cast iron / forged steel: coarse sand-cast skin, rust and dried dirt. */
function castMaps() {
  return cached('wheel.cast', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const sand = worley(u * 40, v * 40, 40, 17).f1;
      return smoothstep(0.0, 0.28, sand) * 0.5 + fbm(u * 14, v * 14, { octaves: 4, period: 14, seed: 23 }) * 0.5;
    });
    const normal = normalFromHeight(hf, n, n, 2.6, { repeat: 2 });
    const map = makeTex(
      n,
      n,
      (x, y, out) => {
        const u = x / n;
        const v = y / n;
        const h = hf[y * n + x];
        const rust = smoothstep(0.5, 0.9, fbm(u * 6, v * 6, { octaves: 5, period: 6, seed: 41 }));
        const dirt = smoothstep(0.45, 0.85, fbm(u * 3, v * 9, { octaves: 4, period: 3, seed: 66 }));
        let c = [150 + h * 96, 154 + h * 92, 158 + h * 88];
        c = mix3(c, SRGB(0x8d5730), rust * 0.55);
        c = mix3(c, SRGB(0x8b7554), dirt * 0.5);
        out[0] = Math.min(255, c[0]);
        out[1] = Math.min(255, c[1]);
        out[2] = Math.min(255, c[2]);
      },
      { srgb: true, repeat: 2 },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.6 + (1 - hf[y * n + x]) * 0.35), { repeat: 2 });
    const metal = roughnessTexture(
      n,
      n,
      (x, y) => {
        const u = x / n;
        const v = y / n;
        const rust = smoothstep(0.5, 0.9, fbm(u * 6, v * 6, { octaves: 5, period: 6, seed: 41 }));
        const dirt = smoothstep(0.45, 0.85, fbm(u * 3, v * 9, { octaves: 4, period: 3, seed: 66 }));
        return clamp(1 - rust * 0.7 - dirt * 0.5);
      },
      { repeat: 2 },
    );
    return { map, normal, rough, metal };
  });
}

/** Brake rotor: swept concentric grooves, rust ring at the unswept edge. */
function rotorMaps() {
  return cached('wheel.rotor', () => {
    const n = 256;
    const rad = (x, y) => Math.hypot(x / n - 0.5, y / n - 0.5) * 2;
    const hf = heightField(n, n, (x, y) => {
      const r = rad(x, y);
      // 44 grooves over 128 texels of radius is about as fine as this can go
      // before the mip chain turns it into moire
      const grooves = Math.abs(Math.sin(r * 44));
      const scratch = fbm(r * 26, Math.atan2(y - n / 2, x - n / 2) * 6, { octaves: 3, period: 26, seed: 3 });
      return grooves * 0.55 + scratch * 0.45;
    });
    const normal = normalFromHeight(hf, n, n, 0.9, { repeat: 1 });
    const map = makeTex(
      n,
      n,
      (x, y, out) => {
        const r = rad(x, y);
        const h = hf[y * n + x];
        const a = Math.atan2(y - n / 2, x - n / 2);
        // Bright swept band, oxidised at the outer lip and under the hat. This
        // band is the one light value deep inside the wheel, so it is allowed to
        // be near-white: it is what makes the spoke windows read as windows.
        const swept = smoothstep(0.5, 0.58, r) * (1 - smoothstep(0.93, 0.99, r));
        const rust = clamp((1 - swept) * (0.4 + fbm(r * 12, a * 3, { octaves: 4, period: 12, seed: 19 }) * 0.7));
        const c = mix3([178 + h * 40, 180 + h * 38, 179 + h * 38], SRGB(0x7d5638), rust);
        out[0] = Math.min(255, c[0]);
        out[1] = Math.min(255, c[1]);
        out[2] = Math.min(255, c[2]);
      },
      { srgb: true, repeat: 1 },
    );
    const rough = roughnessTexture(
      n,
      n,
      (x, y) => {
        const r = rad(x, y);
        const swept = smoothstep(0.5, 0.58, r) * (1 - smoothstep(0.93, 0.99, r));
        return clamp(0.7 - swept * 0.26 + (1 - hf[y * n + x]) * 0.1);
      },
      { repeat: 1 },
    );
    return { map, normal, rough };
  });
}

/** Dried mud: lumpy, matte, slightly cracked. */
function mudMaps() {
  return cached('wheel.mud', () => {
    const n = 128;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const cell = worley(u * 11, v * 11, 11, 91);
      const crack = 1 - smoothstep(0.0, 0.06, cell.f2 - cell.f1);
      return fbm(u * 16, v * 16, { octaves: 4, period: 16, seed: 7 }) * 0.7 - crack * 0.4 + 0.3;
    });
    const normal = normalFromHeight(hf, n, n, 2.4, { repeat: 2 });
    const map = makeTex(
      n,
      n,
      (x, y, out) => {
        const h = clamp(hf[y * n + x]);
        // Both ends of this ramp used to sit near a 1.8 red:blue ratio, and the
        // light on this truck is warm on top of that: a plug in a tread void came
        // back at 2.18 against tread at 1.35, which at matched brightness is not
        // mud, it is terracotta — the clumps read as rusty shards stuck to the
        // tyre. Wet earth is barely warmer than neutral once it is damp.
        const c = mix3(SRGB(0x393129), SRGB(0x7d6e5c), h);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
      },
      { srgb: true, repeat: 2 },
    );
    const rough = roughnessTexture(n, n, (x, y) => clamp(0.86 + hf[y * n + x] * 0.12), { repeat: 2 });
    return { map, normal, rough };
  });
}

/** Soft dust blob laid under the contact patch. */
function contactDecal() {
  return cached('wheel.contact', () => {
    const n = 128;
    return makeTex(
      n,
      n,
      (x, y, out) => {
        const u = x / n - 0.5;
        const v = y / n - 0.5;
        const d = Math.hypot(u * 1.5, v * 0.95) * 2;
        const puff = fbm(x / n * 7, y / n * 7, { octaves: 5, period: 7, seed: 51 });
        const a = clamp((1 - smoothstep(0.15, 1.0, d)) * (0.35 + puff * 1.3));
        const c = SRGB(0x9c8863);
        const k = 0.7 + puff * 0.6;
        out[0] = Math.min(255, c[0] * k);
        out[1] = Math.min(255, c[1] * k);
        out[2] = Math.min(255, c[2] * k);
        out[3] = a * 235;
      },
      { srgb: true, repeat: 1 },
    );
  });
}

// ---------------------------------------------------------------------------
// Local materials. materials.js has no machined-aluminium-with-dust, no cast
// iron and no mud, and the running gear needs a wider value range than the
// shared rubber/steel pair can give it, so the wheel owns its own library.
// Vertex colour is the albedo on all of them.
// ---------------------------------------------------------------------------

let MATS = null;

function wheelMaterials(base) {
  if (MATS) return MATS;
  const env = base?.steel?.envMap ?? base?.rubber?.envMap ?? null;
  const carc = carcassMaps();
  const lug = lugMaps();
  const mach = machinedMaps();
  const cast = castMaps();
  const rot = rotorMaps();
  const mud = mudMaps();

  const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, envMap: env, ...o });

  const m = {};
  m.carcass = std({
    name: 'tyreCarcass',
    map: carc.map,
    normalMap: carc.normal,
    roughnessMap: carc.rough,
    normalScale: new THREE.Vector2(1.5, 1.5),
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0.3,
  });
  m.lugRub = std({
    name: 'tyreLug',
    map: lug.map,
    normalMap: lug.normal,
    roughnessMap: lug.rough,
    normalScale: new THREE.Vector2(1.0, 1.0),
    metalness: 0,
    roughness: 1,
    // Rubber's whole diffuse term is about 0.03 linear, so an environment
    // specular of 0.04 F0 against a bright sky is the same order as the albedo:
    // leave it at the usual 0.5 and the tread washes out to grey whatever the
    // vertex colours say.
    envMapIntensity: 0.26,
  });
  // Not fully metallic: a pure metal in a wheel well has no diffuse term and
  // goes to black wherever the environment is dark, which is exactly where
  // these parts live. A little diffuse keeps them readable.
  m.machined = std({
    name: 'rimMachined',
    map: mach.map,
    normalMap: mach.normal,
    roughnessMap: mach.rough,
    normalScale: new THREE.Vector2(0.35, 0.35),
    metalness: 0.46,
    roughness: 1,
    envMapIntensity: 0.95,
  });
  // powdercoat over the same castings: dielectric, so it stays a dark grey
  // instead of desaturating into bare aluminium
  m.anod = std({
    name: 'rimPowdercoat',
    map: mach.map,
    normalMap: mach.normal,
    roughnessMap: mach.rough,
    normalScale: new THREE.Vector2(0.7, 0.7),
    metalness: 0.28,
    roughness: 1,
    envMapIntensity: 0.7,
  });
  // Half metallic: these castings never see a bright environment, so a fully
  // metallic response leaves the whole axle assembly as a silhouette.
  m.cast = std({
    name: 'castIron',
    map: cast.map,
    normalMap: cast.normal,
    roughnessMap: cast.rough,
    metalnessMap: cast.metal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    metalness: 0.5,
    roughness: 1,
    envMapIntensity: 0.9,
  });
  m.rotor = std({
    name: 'brakeRotor',
    map: rot.map,
    normalMap: rot.normal,
    roughnessMap: rot.rough,
    normalScale: new THREE.Vector2(0.5, 0.5),
    // A rotor deep inside the wheel only ever sees a dim environment, so most of
    // its response has to come from the diffuse term or it goes to black exactly
    // where it needs to read.
    metalness: 0.32,
    roughness: 1,
    envMapIntensity: 1.4,
  });
  m.caliperM = std({
    name: 'caliper',
    map: cast.map,
    normalMap: cast.normal,
    roughnessMap: cast.rough,
    normalScale: new THREE.Vector2(0.6, 0.6),
    metalness: 0.45,
    roughness: 0.85,
    envMapIntensity: 0.9,
  });
  m.mudM = std({
    name: 'mudCake',
    map: mud.map,
    normalMap: mud.normal,
    roughnessMap: mud.rough,
    normalScale: new THREE.Vector2(1.4, 1.4),
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0.45,
  });
  // the cavity behind the spokes: double sided so one shell reads as an
  // inner barrel wall from outside and as darkness from the front
  m.void = std({
    name: 'wheelVoid',
    color: 0xffffff,
    metalness: 0.15,
    roughness: 0.95,
    envMapIntensity: 0.12,
    side: THREE.DoubleSide,
  });
  m.contactM = new THREE.MeshStandardMaterial({
    name: 'contactDust',
    map: contactDecal(),
    transparent: true,
    depthWrite: false,
    roughness: 1,
    metalness: 0,
    envMap: env,
    envMapIntensity: 0.7,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  // Shared by every tyre part: the spin angle, so the tread can be flattened
  // into the ground in the hub frame while the wheel turns.
  m.spinU = { value: 0 };
  loadedTyre(m.carcass, m.spinU, { bulge: 0.05 });
  loadedTyre(m.lugRub, m.spinU, { bulge: 0.05 });

  MATS = m;
  return m;
}

/**
 * Flatten the bottom of the tyre against the ground and bulge the sidewall
 * where it is loaded. The displacement is done in the hub frame, so it stays
 * at the bottom of the wheel while the mesh spins. Everything here is a clamp
 * or a trig call on a finite value — nothing can produce a NaN.
 */
function loadedTyre(mat, spinU, { bulge = 0 } = {}) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSpin = spinU;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSpin;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          float sc = cos( uSpin ), ss = sin( uSpin );
          float hy = sc * transformed.y - ss * transformed.z;
          float hz = ss * transformed.y + sc * transformed.z;
          float squash = min( max( -hy - ${CONTACT.toFixed(4)}, 0.0 ), 0.07 );
          hy += squash * 0.95;
          // The loaded quarter of the carcass squats outward, widest at the
          // contact patch and gone by the time the section is level with the hub.
          // The radius gate pins the bead, which is clamped on the rim and cannot
          // move, and keeps the valve stem and brake hose out of it.
          float rr = length( vec2( hy, hz ) );
          float load = smoothstep( 0.0, 0.26, -hy - 0.13 ) * smoothstep( 0.26, 0.32, rr );
          transformed.x *= 1.0 + squash * 2.6 + load * ${bulge.toFixed(4)};
          transformed.y = sc * hy + ss * hz;
          transformed.z = -ss * hy + sc * hz;
        }`,
      );
  };
  mat.customProgramCacheKey = () => `loadedTyre_${mat.name}_${bulge}`;
}

// ---------------------------------------------------------------------------
// The tyre
// ---------------------------------------------------------------------------

/** Cross-section control points, inboard bead to outboard bead: [axial, radius]. */
function tyreSection() {
  // One half, bead outward. The kink at 0.262 is the rim protector rib and the
  // step at 0.404 is the shoulder, where the tread blocks take over.
  const half = [
    [RHW, BEAD_R],
    [RHW + 0.011, 0.252],
    [RHW + 0.019, 0.263], // rim protector crest, proud of the sidewall below it
    [RHW + 0.0155, 0.274],
    [SEC - 0.007, 0.290],
    [SEC - 0.001, 0.318],
    [SEC, 0.336], // section max width: the loaded bulge
    [SEC - 0.004, 0.362],
    [SEC - 0.008, 0.384],
    [SEC - 0.022, 0.404], // shoulder
    [0.124, CROWN - 0.002],
    [0.062, CROWN + 0.003],
  ];
  // inboard bead -> crown -> outboard bead, so the revolved normals face out
  return [...half.map((p) => [-p[0], p[1]]), [0.0, CROWN + 0.004], ...half.slice().reverse()];
}

/**
 * v across the tyre atlas, derived from where a point actually sits on the
 * section rather than from arc length, so the lettering band always lands on
 * the widest part of the sidewall.
 */
function sectionV(x, r) {
  const s = x < 0 ? -1 : 1;
  const t =
    Math.abs(x) <= 0.124 && r > 0.404
      ? (Math.abs(x) / 0.124) * 0.30
      : 0.3 + 0.7 * clamp((0.412 - r) / (0.412 - BEAD_R));
  return 0.5 + s * 0.5 * clamp(t);
}

/** Revolved carcass with analytic normals, so there is no seam and no facets. */
function buildCarcass(radialSeg = 72) {
  const pts = tyreSection().map((p) => new THREE.Vector2(p[0], p[1]));
  const prof = new THREE.SplineCurve(pts).getSpacedPoints(42);
  const rows = prof.length;
  const cols = radialSeg + 1;

  // profile-space normal, rotated +90 degrees off the direction of travel
  const nrm = prof.map((p, j) => {
    const a = prof[Math.max(0, j - 1)];
    const b = prof[Math.min(rows - 1, j + 1)];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    return [-ty / len, tx / len];
  });

  const position = new Float32Array(cols * rows * 3);
  const normal = new Float32Array(cols * rows * 3);
  const uv = new Float32Array(cols * rows * 2);
  const color = new Float32Array(cols * rows * 3);
  const index = [];

  for (let i = 0; i < cols; i++) {
    const u = i / radialSeg;
    const ca = Math.cos(u * Math.PI * 2);
    const sa = Math.sin(u * Math.PI * 2);
    for (let j = 0; j < rows; j++) {
      const p = prof[j];
      const n = nrm[j];
      const k = (i * rows + j) * 3;
      position[k] = p.x;
      position[k + 1] = ca * p.y;
      position[k + 2] = sa * p.y;
      normal[k] = n[0];
      normal[k + 1] = ca * n[1];
      normal[k + 2] = sa * n[1];
      color[k] = 1;
      color[k + 1] = 1;
      color[k + 2] = 1;
      const k2 = (i * rows + j) * 2;
      uv[k2] = u;
      uv[k2 + 1] = sectionV(p.x, p.y);
    }
  }
  for (let i = 0; i < radialSeg; i++) {
    for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j;
      const b = (i + 1) * rows + j;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(color, 3));
  g.setIndex(index);
  return g;
}

/**
 * Albedo for a lug block. The face that touches the road is scrubbed back to
 * black rubber; dust only survives down in the void where nothing wipes it, so
 * every block carries its own top-to-bottom value ramp and the tread reads as
 * dirty rubber rather than a row of sandstone bricks.
 */
function lugShade(extraDust, value) {
  return (x, y, z, nx, ny, nz) => {
    const r = Math.hypot(y, z) || 1;
    const t = clamp((r - CROWN) / LUG_H);
    // how much this vertex's normal points radially outward, i.e. roadward
    const face = clamp((y * ny + z * nz) / r);
    // Hard-capped. Film over rubber is *thin* — even the shielded root of a block
    // is rubber you can see the earth on, never earth you can see the rubber
    // through, so no vertex is allowed past 60% of the way to the dust colour.
    const d = Math.min(0.6, (1 - smoothstep(-0.2, 0.4, t)) * 0.55 * (1 - face * 0.8) + extraDust * (1 - face * 0.5));
    return [
      lerp(RUBBER[0], TREAD_DUST[0], d) * value,
      lerp(RUBBER[1], TREAD_DUST[1], d) * value,
      lerp(RUBBER[2], TREAD_DUST[2], d) * value,
    ];
  };
}

/**
 * Tear a chunk out of one top corner of a block. Every lug on a mud terrain is
 * moulded identically and then chewed differently by rock, and a run of
 * sixteen identical blocks around the crown is the loudest thing on the wheel.
 * Vertices are pulled toward the block centre rather than deleted, so the
 * triangle count and the winding are untouched.
 */
function chipped(geo, seed) {
  const g = geo.clone();
  const rnd = mulberry32(seed);
  const p = g.attributes.position;
  let hx = 1e-6;
  let hy = 1e-6;
  let hz = 1e-6;
  for (let i = 0; i < p.count; i++) {
    hx = Math.max(hx, Math.abs(p.getX(i)));
    hy = Math.max(hy, Math.abs(p.getY(i)));
    hz = Math.max(hz, Math.abs(p.getZ(i)));
  }
  const sx = rnd() > 0.5 ? 1 : -1;
  const sz = rnd() > 0.5 ? 1 : -1;
  const bite = 0.34 + rnd() * 0.36;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const w =
      clamp(((x * sx) / hx - 0.1) / 0.9) * clamp(((z * sz) / hz - 0.1) / 0.9) * clamp((y / hy - 0.05) / 0.95);
    if (w <= 0) continue;
    p.setXYZ(i, x - sx * hx * bite * w, y - hy * bite * 0.85 * w, z - sz * hz * bite * w);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Solid mud-terrain lugs. Chunky staggered centre blocks, big shoulder lugs
 * and side biters that hang off the sidewall so the outline is broken from
 * every angle.
 */
function buildLugs(k) {
  const rnd = mulberry32(4113);
  const step = (Math.PI * 2) / LUG_ROWS;
  // Each centre and shoulder lug is two slabs with a sipe between them, so the
  // groove is real geometry and notches the outline as well as the surface. The
  // draft angle is inverted (wider at the tip) on nothing: the blocks taper the
  // way a mould releases, narrower at the tread face.
  const B = (w, d, h = LUG_H, t = 0.13) => chamferBox(w, h, d, 0.0055, t);
  const centre = [
    [B(0.052, 0.108), B(0.052, 0.108), 0.058],
    [B(0.044, 0.094), B(0.044, 0.086), 0.05],
    [B(0.058, 0.088), B(0.05, 0.096), 0.064],
  ];
  const shoulder = [
    [B(0.046, 0.126), B(0.05, 0.118), 0.054],
    [B(0.052, 0.112), B(0.046, 0.104), 0.056],
  ];
  const biter = B(0.078, 0.094, 0.05, 0.2);
  const ejector = B(0.026, 0.05, 0.016, 0.25);

  const place = (geo, { a, r, x, tilt = 0, yaw = 0, dust = 0, value = 1, chip = 0 }) => {
    let g = chip ? chipped(geo, chip) : geo;
    if (yaw || tilt) {
      if (!chip) g = g.clone();
      if (yaw) transform(g, { rot: [0, yaw, 0] });
      if (tilt) transform(g, { rot: [0, 0, tilt] });
    }
    k.add('lugRub', g, {
      pos: [x, Math.cos(a) * r, Math.sin(a) * r],
      rot: [a, 0, 0],
      shade: lugShade(dust, value),
    });
  };

  /** A sipe-split lug: two slabs straddling `x`, the outer one stepped down. */
  const pair = ([inner, outer, gap], o) => {
    place(inner, { ...o, x: o.x - gap * 0.5, yaw: o.yaw, value: o.value, chip: o.chip });
    place(outer, { ...o, x: o.x + gap * 0.5, r: o.r - 0.0015, yaw: -o.yaw, value: o.value * 0.94, chip: o.chip2 });
  };

  for (let i = 0; i < LUG_ROWS; i++) {
    const a0 = i * step;
    const odd = i % 2 === 1;
    const j = (s) => (rnd() - 0.5) * s;
    const wear = () => 0.8 + rnd() * 0.4;
    // roughly a third of the blocks lose a corner, and the outer edge of the
    // tread loses more of them than the protected centre does
    const chew = (p) => (rnd() < p ? 1 + Math.floor(rnd() * 65535) : 0);

    pair(centre[i % 3], {
      a: a0 + j(0.03),
      r: LUG_R + j(0.005),
      x: (odd ? -1 : 1) * 0.046,
      yaw: 0.12 + j(0.2),
      value: wear(),
      chip: chew(0.24),
      chip2: chew(0.24),
    });
    pair(centre[(i + 2) % 3], {
      a: a0 + step * 0.5 + j(0.03),
      r: LUG_R + j(0.005),
      x: (odd ? 1 : -1) * 0.056,
      yaw: -0.12 + j(0.2),
      dust: 0.03,
      value: wear(),
      chip: chew(0.24),
      chip2: chew(0.24),
    });
    for (const s of [-1, 1]) {
      const as = a0 + step * (s > 0 ? 0.22 : 0.72) + j(0.02);
      pair(shoulder[i % 2], {
        a: as,
        r: LUG_R - 0.002 + j(0.004),
        x: s * 0.107,
        tilt: -s * 0.26,
        yaw: s * 0.1 + j(0.14),
        dust: 0.06,
        value: wear(),
        chip: chew(0.4),
        chip2: chew(0.4),
      });
      // the odd side biter is torn clean off, which is the one thing that stops
      // the outline being a perfectly regular ring of teeth
      if (rnd() > 0.1) {
        place(biter, {
          a: as + j(0.02),
          r: 0.393 + j(0.006),
          x: s * 0.159,
          tilt: -s * 0.95,
          yaw: j(0.2),
          dust: 0.14,
          value: wear(),
          chip: chew(0.5),
        });
      }
    }
    // stone ejectors down in the centre voids
    place(ejector, { a: a0 + step * 0.75, r: CROWN + 0.006, x: (odd ? 1 : -1) * 0.012, dust: 0.3 });
  }
}

/**
 * A chamfered, tapered block: the tread lug primitive.
 *
 * RoundedBoxGeometry costs ~110 triangles and rounds the edges so hard that a
 * mud lug ends up looking like a marshmallow. This is 44 triangles with flat
 * faces, a crisp chamfer and a moulding draft angle, so 176 blocks per corner
 * stay affordable and the tread keeps its edge highlights. UVs are projected on
 * the dominant axis of each face so the pebbled rubber grain still lands.
 */
function chamferBox(w, h, d, c = 0.006, taper = 0.14) {
  const hx = w / 2;
  const hy = h / 2;
  const hz = d / 2;
  const cc = Math.min(c, Math.min(hx, hy, hz) * 0.6);
  const a = hx - cc;
  const b = hy - cc;
  const e = hz - cc;
  const S = [-1, 1];

  const V = [];
  const idx = {};
  const key = (p) => p.map((n) => n.toFixed(5)).join(',');
  const vert = (p) => {
    const kk = key(p);
    if (!(kk in idx)) {
      idx[kk] = V.length;
      V.push(p);
    }
    return idx[kk];
  };

  // the six inset face rectangles, indexed by axis and sign
  const rect = {};
  for (const axis of [0, 1, 2]) {
    for (const s of S) {
      const out = [hx, hy, hz][axis] * s;
      const u = (axis + 1) % 3;
      const v = (axis + 2) % 3;
      const eu = [a, b, e][u];
      const ev = [a, b, e][v];
      const corners = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([su, sv]) => {
        const p = [0, 0, 0];
        p[axis] = out;
        p[u] = eu * su;
        p[v] = ev * sv;
        return vert(p);
      });
      rect[`${axis}${s}`] = corners;
    }
  }

  const faces = Object.values(rect).map((q) => q.slice());
  // chamfer strip along each of the twelve cube edges
  for (const [a1, a2] of [
    [0, 1],
    [1, 2],
    [2, 0],
  ]) {
    const along = 3 - a1 - a2;
    for (const s1 of S) {
      for (const s2 of S) {
        const p = (axis, sign, alongSign) => {
          const q = [0, 0, 0];
          q[axis] = [hx, hy, hz][axis] * sign;
          const other = axis === a1 ? a2 : a1;
          q[other] = [a, b, e][other] * (axis === a1 ? s2 : s1);
          q[along] = [a, b, e][along] * alongSign;
          return vert(q);
        };
        faces.push([p(a1, s1, -1), p(a2, s2, -1), p(a2, s2, 1), p(a1, s1, 1)]);
      }
    }
  }
  // corner triangles
  for (const sx of S) {
    for (const sy of S) {
      for (const sz of S) {
        faces.push([
          vert([hx * sx, b * sy, e * sz]),
          vert([a * sx, hy * sy, e * sz]),
          vert([a * sx, b * sy, hz * sz]),
        ]);
      }
    }
  }

  if (taper) {
    for (const p of V) {
      const s = 1 - taper * ((p[1] + hy) / h);
      p[0] *= s;
      p[2] *= s;
    }
  }

  const pos = [];
  const nor = [];
  const uv = [];
  const cross = (o, p, q) => [
    (p[1] - o[1]) * (q[2] - o[2]) - (p[2] - o[2]) * (q[1] - o[1]),
    (p[2] - o[2]) * (q[0] - o[0]) - (p[0] - o[0]) * (q[2] - o[2]),
    (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]),
  ];
  for (const f of faces) {
    const p0 = V[f[0]];
    const p1 = V[f[1]];
    const p2 = V[f[2]];
    let n = cross(p0, p1, p2);
    const len = Math.hypot(...n) || 1;
    n = n.map((t) => t / len);
    // the block is convex about the origin, so an outward normal agrees with
    // the face centroid
    const cx = f.reduce((s, i) => s + V[i][0], 0) / f.length;
    const cy = f.reduce((s, i) => s + V[i][1], 0) / f.length;
    const cz = f.reduce((s, i) => s + V[i][2], 0) / f.length;
    const flip = n[0] * cx + n[1] * cy + n[2] * cz < 0;
    if (flip) n = n.map((t) => -t);
    const order = f.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2];
    const seq = flip ? order.slice().reverse() : order;
    // project on whichever axis the face mostly points along
    const ax = Math.abs(n[0]) > Math.abs(n[1]) && Math.abs(n[0]) > Math.abs(n[2]) ? 0 : Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2;
    for (const i of seq) {
      const p = V[f[i]];
      pos.push(p[0], p[1], p[2]);
      nor.push(n[0], n[1], n[2]);
      uv.push(p[(ax + 1) % 3] * 6 + 0.5, p[(ax + 2) % 3] * 6 + 0.5);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  return g;
}

/** A lumpy dirt clump. */
function blob(radius, seed, scale = [1, 1, 1]) {
  const g = new THREE.SphereGeometry(radius, 7, 5);
  const rnd = mulberry32(seed);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    // A plus or minus 35 per cent per-vertex kick on a 7x5 sphere is enough to
    // pull single vertices right through their neighbours, and the result reads as
    // a faceted shard rather than a clump of earth. Half that keeps the lumpiness
    // and loses the spikes.
    const f = 0.79 + rnd() * 0.34;
    p.setXYZ(i, p.getX(i) * f * scale[0], p.getY(i) * f * scale[1], p.getZ(i) * f * scale[2]);
  }
  g.computeVertexNormals();
  return g;
}

// Two ages of mud, so the tyre is not one brown. The wet plugs are what was
// picked up last, the dried crust is what has been baking on the shoulder for a
// while; both stay darker than the pale ground so the tyre still reads black.
const MUD_WET = [0x332c25, 0x3a322a, 0x2a2521];
const MUD_DRY = [0x5c5344, 0x534b3e, 0x665c4a];

/** Mud packed into the tread voids, over the shoulder and up the sidewall. */
function buildTyreMud(k) {
  const rnd = mulberry32(9021);
  const step = (Math.PI * 2) / LUG_ROWS;
  const pick = (list) => list[Math.floor(rnd() * list.length) % list.length];
  for (let i = 0; i < LUG_ROWS; i++) {
    const a = i * step + step * (0.3 + rnd() * 0.4);
    // shoulder crust, thrown out of the voids and baked onto the sidewall
    for (const s of [-1, 1]) {
      if (rnd() > 0.62) continue;
      const r = 0.382 + rnd() * 0.034;
      // 46 mm of radius scaled out to 1.4 put clumps on the shoulder as big as the
      // lug blocks they were supposed to be sitting between, and better than half
      // of them took the pale dried tint: at a glance the tread read as gravel
      // glued to a tyre. Smaller, flatter, and mostly the wet tint.
      k.add('mudM', blob(0.018 + rnd() * 0.012, 100 + i * 7 + s, [1.3, 0.4, 1.1]), {
        pos: [s * (0.126 + rnd() * 0.046), Math.cos(a) * r, Math.sin(a) * r],
        rot: [a, 0, rnd() * 0.6],
        tint: rnd() > 0.7 ? pick(MUD_DRY) : pick(MUD_WET),
      });
    }
    // plugs packed down into the centre and shoulder voids between the rows
    for (const [ox, gate] of [[0.0, 0.42], [0.078, 0.55], [-0.078, 0.55], [0.132, 0.68], [-0.132, 0.68]]) {
      if (rnd() > gate) continue;
      const av = i * step + step * (0.42 + rnd() * 0.36);
      const r = CROWN + 0.004 + rnd() * 0.016;
      k.add('mudM', blob(0.014 + rnd() * 0.011, 300 + i * 11 + Math.round(ox * 100), [1.4, 0.45, 1.2]), {
        pos: [ox + (rnd() - 0.5) * 0.03, Math.cos(av) * r, Math.sin(av) * r],
        rot: [av, rnd() * 0.8, 0],
        tint: rnd() > 0.82 ? pick(MUD_DRY) : pick(MUD_WET),
      });
    }
  }
  // sling off the bead area, where nothing ever wipes it
  for (let i = 0; i < 10; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 0.256 + rnd() * 0.05;
    k.add('mudM', blob(0.018 + rnd() * 0.014, 620 + i, [1.2, 0.45, 1.1]), {
      pos: [(rnd() > 0.5 ? 1 : -1) * (RHW + 0.012 + rnd() * 0.02), Math.cos(a) * r, Math.sin(a) * r],
      rot: [a, 0, 0],
      tint: pick(MUD_WET),
    });
  }
}

// ---------------------------------------------------------------------------
// The rim
// ---------------------------------------------------------------------------

/**
 * Tint for a rim part. A wheel spins, so "up" means nothing here — what does
 * hold is that the outer edge of the face lives in the spray off the tread and
 * comes back filthy, while the middle stays comparatively clean. A position
 * hash on top of that stops six identical spokes reading as a stamped rosette.
 */
function rimGrime(baseHex, { dust = 0x584f3e, from = 0.06, to = 0.2, amount = 0.5, floor = 0.16 } = {}) {
  const base = LIN(baseHex);
  const dst = LIN(dust);
  return (x, y, z) => {
    const r = Math.hypot(y, z);
    const hash = Math.sin(x * 71 + y * 133 + z * 97) * 0.5 + 0.5;
    const d = (floor + smoothstep(from, to, r) * amount) * (0.45 + hash * 0.9);
    const c = mix3(base, dst, clamp(d));
    const k = 0.88 + hash * 0.18;
    return [c[0] * k, c[1] * k, c[2] * k];
  };
}

/**
 * Revolve a [radius, axial] profile about the axle. Normals come out as the
 * profile tangent rotated clockwise, so walk the profile toward the axle to
 * face a surface outboard and along +axial to face it away from the axle.
 */
function lathe(points, segments = 36) {
  const g = new THREE.LatheGeometry(
    points.map((p) => new THREE.Vector2(p[0], p[1])),
    segments,
  );
  return transform(g, { rot: [0, 0, -Math.PI / 2] });
}

const SPOKES = 6;

function buildRim(k) {
  // --- shell: drop centre barrel with a bead flange at each end -----------
  k.add(
    'anod',
    lathe([
      [RIM + 0.002, -RHW],
      [RIM + 0.011, -RHW + 0.006],
      [RIM + 0.004, -RHW + 0.015],
      [RIM - 0.006, -RHW + 0.021],
      [RIM - 0.006, -RHW + 0.055],
      [RIM - 0.032, -RHW + 0.086],
      [RIM - 0.032, RHW - 0.088],
      [RIM - 0.006, RHW - 0.056],
      [RIM - 0.006, RHW - 0.016],
      [RIM + 0.006, RHW - 0.008],
      [RIM + 0.012, RHW],
    ]),
    { tint: 0x4e5357 },
  );
  // inner barrel wall, dark: this is the "through the spokes" darkness
  k.add('void', new THREE.CylinderGeometry(RIM - 0.012, RIM - 0.012, RHW * 1.9, 32, 1, true), {
    rot: [0, 0, Math.PI / 2],
    tint: 0x141618,
  });
  // inboard closing wall so the wheel is not see-through
  k.add('void', new THREE.CylinderGeometry(RIM - 0.012, 0.07, 0.05, 28, 1, true), {
    pos: [-RHW + 0.02, 0, 0],
    rot: [0, 0, Math.PI / 2],
    tint: 0x0e1012,
  });

  // --- beadlock ring, bolted to the outboard flange -----------------------
  // Machined rather than powdercoated: a bright ring right at the outside edge
  // of the wheel is the one feature that still reads as a wheel from thirty
  // metres away, where the spokes have gone to mush.
  k.add(
    'machined',
    lathe([
      [RIM - 0.006, RHW - 0.002],
      [RIM + 0.016, RHW + 0.002],
      [RIM + 0.014, RHW + 0.013],
      [RIM - 0.006, RHW + 0.019],
      [RIM - 0.032, RHW + 0.016],
      [RIM - 0.034, RHW + 0.004],
      [RIM - 0.006, RHW - 0.002],
    ]),
    { shade: rimGrime(0x8f959a, { from: 0.19, to: 0.25, amount: 0.62, floor: 0.3 }) },
  );
  // Beadlock hardware: 24 small bolts, but jittered on the ring and mixed in
  // finish, with two backed out and one gone. An exactly even ring of identical
  // bright heads reads as a machine part rather than as something bolted down by
  // hand in a workshop.
  const lockR = RIM - 0.019;
  const lockRnd = mulberry32(7311);
  const LOCK_TINTS = [0x8d9089, 0x7b776c, 0x9a9d95, 0x6b6357, 0x86897f];
  for (let i = 0; i < 24; i++) {
    if (i === 17) continue;
    const a = (i / 24) * Math.PI * 2 + 0.13 + (lockRnd() - 0.5) * 0.03;
    const r = lockR + (lockRnd() - 0.5) * 0.004;
    const proud = i === 5 || i === 12 ? 0.004 : 0;
    k.add('machined', bolt(0.0058 + lockRnd() * 0.0016, 0.0055 + lockRnd() * 0.002), {
      pos: [RHW + 0.013 + proud, Math.cos(a) * r, Math.sin(a) * r],
      rot: [0, 0, -Math.PI / 2],
      tint: LOCK_TINTS[Math.floor(lockRnd() * LOCK_TINTS.length) % LOCK_TINTS.length],
    });
  }

  // --- spokes ------------------------------------------------------------
  // Six spokes that fan out from the hub boss to under the beadlock ring:
  // narrow where they leave the hub so the window between two of them is a real
  // opening onto the rotor, wide where they land on the barrel.
  const faceX = 0.052;
  const spokeShape = (w0, w1, wm, r0, r1, depth) =>
    transform(
      profile(
        [
          [-w0, r0],
          [w0, r0],
          [wm, (r0 + r1) * 0.5],
          [w1, r1],
          [-w1, r1],
          [-wm, (r0 + r1) * 0.5],
        ],
        depth,
        { bevel: 0.005, curveSegments: 2 },
      ),
      { rot: [0, Math.PI / 2, 0] },
    );
  const spokeBody = spokeShape(0.033, 0.062, 0.042, 0.1, 0.214, 0.052);
  // The machined face covers nearly the whole spoke, with the powdercoated body
  // showing only as a dark chamfer around it. Without this the face of the wheel
  // is six black plates over a bright rotor, which reads inside out.
  const spokeCap = spokeShape(0.028, 0.056, 0.037, 0.104, 0.208, 0.016);
  for (let i = 0; i < SPOKES; i++) {
    const a = (i / SPOKES) * Math.PI * 2 + 0.26;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    k.add('anod', spokeBody, {
      pos: [faceX, 0, 0],
      rot: [a, 0, 0],
      shade: rimGrime(0x363b3e, { amount: 0.6 }),
    });
    // Powdercoat, not bare machining. Six machined spoke faces are the largest
    // area on the wheel and the wheel well is lit almost entirely by bounce off a
    // pale dirt track, so a dielectric-neutral aluminium there took the warmth of
    // its illuminant and the rim measured 0.30 luma at r:b 1.59 — sandy tan, the
    // same note as the tyre it was bolted to. A graphite wheel with one bright
    // machined bead ring reads as a wheel from much further out anyway.
    k.add('anod', spokeCap, {
      pos: [faceX + 0.031, 0, 0],
      rot: [a, 0, 0],
      shade: rimGrime(0x474d51, { amount: 0.46, floor: 0.12 }),
    });
    // pad where the spoke lands on the barrel, with a countersunk rivet
    k.add('anod', rbox(0.08, 0.05, 0.096, 0.012, 1), {
      pos: [faceX + 0.014, ca * 0.214, sa * 0.214],
      rot: [a, 0, 0],
      tint: 0x474c50,
    });
    k.add('machined', rivet(0.011, 0.005), {
      pos: [faceX + 0.056, ca * 0.208, sa * 0.208],
      rot: [0, 0, -Math.PI / 2],
      tint: 0x8b9094,
    });
  }

  // --- hub face, lug bosses, centre cap ----------------------------------
  k.add(
    'anod',
    lathe([
      [0.088, faceX - 0.034],
      [0.11, faceX - 0.018],
      [0.11, faceX + 0.03],
      [0.102, faceX + 0.044],
      [0.074, faceX + 0.052],
      [0.0, faceX + 0.052],
    ]),
    { shade: rimGrime(0x484d51, { from: 0.02, to: 0.11, amount: 0.42 }) },
  );
  // machined chamfer round the hub face: a bright ring that separates the dark
  // centre from the dark windows behind it
  k.add(
    'machined',
    lathe([
      [0.113, faceX + 0.026],
      [0.108, faceX + 0.042],
      [0.099, faceX + 0.0475],
    ]),
    { shade: rimGrime(0x8e9498, { from: 0.08, to: 0.12, amount: 0.36, floor: 0.2 }) },
  );
  const nutRnd = mulberry32(4471);
  for (let i = 0; i < 6; i++) {
    const nut = bolt(0.0125, 0.0105 + nutRnd() * 0.002);
    const a = (i / 6) * Math.PI * 2 + 0.52;
    const r = 0.077;
    const px = faceX + 0.052;
    // Pocket wall, then a dark bore, then the nut sitting down in it. The nut
    // has to stay shallow enough to catch light or the recess reads as a hole
    // with nothing in it.
    k.add('machined', new THREE.CylinderGeometry(0.0225, 0.0245, 0.012, 12, 1, true), {
      pos: [px - 0.001, Math.cos(a) * r, Math.sin(a) * r],
      rot: [0, 0, Math.PI / 2],
      tint: 0x8e9397,
    });
    k.add('void', new THREE.CylinderGeometry(0.0205, 0.0205, 0.022, 12, 1, true), {
      pos: [px - 0.008, Math.cos(a) * r, Math.sin(a) * r],
      rot: [0, 0, Math.PI / 2],
      tint: 0x1b1e21,
    });
    k.add('machined', nut, {
      pos: [px - 0.0105, Math.cos(a) * r, Math.sin(a) * r],
      rot: [0, 0, -Math.PI / 2],
      tint: i === 3 ? 0x6e6659 : i === 1 ? 0x989b92 : 0x878b83,
    });
  }
  // Centre cap. Machined shoulder, dark dished top, so the middle of the wheel
  // is a read of light-then-dark rather than one flat black disc.
  k.add(
    'machined',
    lathe([
      [0.052, faceX + 0.03],
      [0.052, faceX + 0.048],
      [0.048, faceX + 0.058],
    ]),
    { tint: 0x878d91 },
  );
  k.add(
    'anod',
    lathe([
      [0.048, faceX + 0.058],
      [0.034, faceX + 0.066],
      [0.02, faceX + 0.062],
      [0.0, faceX + 0.06],
    ]),
    { tint: 0x2d3235 },
  );
  k.add('machined', new THREE.TorusGeometry(0.026, 0.0055, 6, 20), {
    pos: [faceX + 0.0655, 0, 0],
    rot: [0, Math.PI / 2, 0],
    tint: 0x6a6055,
  });
  // valve stem poking through the face, brass cap
  k.add('lugRub', new THREE.CylinderGeometry(0.0085, 0.0105, 0.05, 8), {
    pos: [faceX + 0.052, 0.163, 0.028],
    rot: [0, 0, -Math.PI / 2 + 0.28],
    tint: 0x121314,
  });
  k.add('machined', new THREE.CylinderGeometry(0.008, 0.008, 0.016, 8), {
    pos: [faceX + 0.08, 0.171, 0.028],
    rot: [0, 0, -Math.PI / 2 + 0.28],
    tint: 0x8a7442,
  });
  // stick-on balance weights on the inner flange
  for (const a of [1.1, 1.5]) {
    k.add('machined', rbox(0.02, 0.012, 0.05, 0.004, 1), {
      pos: [-RHW + 0.03, Math.cos(a) * (RIM - 0.02), Math.sin(a) * (RIM - 0.02)],
      rot: [a, 0, 0],
      tint: 0x7e8184,
    });
  }

  // Dried mud flung off the tread and caught in the corners of the face. Flat
  // smears rather than lumps: 25 mm of relief on the face of a wheel reads as
  // chocolate stuck to it, while a 6 mm crust reads as dried mud.
  const rnd = mulberry32(2287);
  for (let i = 0; i < 11; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 0.09 + rnd() * 0.12;
    k.add('mudM', blob(0.018 + rnd() * 0.02, 900 + i, [1.6, 1.3, 0.28]), {
      pos: [faceX + 0.036 + rnd() * 0.022, Math.cos(a) * r, Math.sin(a) * r],
      rot: [a, 0, rnd()],
      tint: rnd() > 0.55 ? 0x585044 : 0x3a3229,
    });
  }
}

// ---------------------------------------------------------------------------
// Behind the wheel: rotor, caliper, hub, knuckle and the dust shield that
// gives the spoke windows something dark to sit against.
// ---------------------------------------------------------------------------

function buildBrakes(k) {
  const discR = 0.196;
  // just inboard of the wheel mounting face, so the swept face still catches
  // light through the spoke windows
  const discX = -0.004;

  // dust shield: the darkness behind the rotor
  k.add('void', new THREE.CylinderGeometry(discR + 0.006, 0.08, 0.03, 32), {
    pos: [discX - 0.05, 0, 0],
    rot: [0, 0, Math.PI / 2],
    tint: 0x15171a,
  });
  // vented rotor: two faces and a ribbed gap
  k.add('rotor', new THREE.CylinderGeometry(discR, discR, 0.011, 40), {
    pos: [discX + 0.011, 0, 0],
    rot: [0, 0, Math.PI / 2],
    tint: 0xd2d5d3,
  });
  k.add('rotor', new THREE.CylinderGeometry(discR, discR, 0.011, 40), {
    pos: [discX - 0.011, 0, 0],
    rot: [0, 0, Math.PI / 2],
    tint: 0x83857f,
  });
  k.add('void', new THREE.CylinderGeometry(discR - 0.004, discR - 0.004, 0.014, 32, 1, true), {
    pos: [discX, 0, 0],
    rot: [0, 0, Math.PI / 2],
    tint: 0x24262a,
  });
  // rust ring on the unswept outer edge
  k.add('cast', new THREE.CylinderGeometry(discR + 0.001, discR + 0.001, 0.03, 40, 1, true), {
    pos: [discX, 0, 0],
    rot: [0, 0, Math.PI / 2],
    tint: 0x6d5442,
  });
  // drilled: two staggered rings, on the swept band so they read as holes in a
  // bright face rather than as a texture
  const hole = new THREE.CylinderGeometry(0.0115, 0.0115, 0.036, 7);
  for (let ring = 0; ring < 2; ring++) {
    const rr = discR * (ring ? 0.78 : 0.9);
    const n = ring ? 9 : 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.3;
      k.add('void', hole, {
        pos: [discX, Math.cos(a) * rr, Math.sin(a) * rr],
        rot: [0, 0, Math.PI / 2],
        tint: 0x0d0f11,
      });
    }
  }
  // rotor hat: mounting flange, neck, and the hub behind it
  k.add('cast', new THREE.CylinderGeometry(discR * 0.56, discR * 0.56, 0.016, 26), {
    pos: [discX + 0.013, 0, 0],
    rot: [0, 0, Math.PI / 2],
    tint: 0x5c5145,
  });
  k.add('cast', new THREE.CylinderGeometry(0.082, 0.092, 0.05, 22), {
    pos: [discX + 0.04, 0, 0],
    rot: [0, 0, Math.PI / 2],
    tint: 0x4e453b,
  });
  k.add('cast', new THREE.CylinderGeometry(0.062, 0.07, 0.075, 20), {
    pos: [discX - 0.03, 0, 0],
    rot: [0, 0, Math.PI / 2],
    tint: 0x50545a,
  });
  // wheel studs
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.52;
    k.add('machined', new THREE.CylinderGeometry(0.009, 0.009, 0.05, 7), {
      pos: [discX + 0.06, Math.cos(a) * 0.07, Math.sin(a) * 0.07],
      rot: [0, 0, Math.PI / 2],
      tint: 0xc3c7ca,
    });
  }

  // --- caliper, high and forward so it shows through the spoke windows ----
  const ca = 0.62;
  const cr = 0.15;
  const cy = Math.cos(ca) * cr;
  const cz = Math.sin(ca) * cr;
  // bridge over the disc plus a piston housing each side of it
  k.add('caliperM', rbox(0.11, 0.07, 0.148, 0.016, 1), {
    pos: [discX, cy + 0.036, cz],
    rot: [ca, 0, 0],
    tint: 0xa8431b,
  });
  for (const s of [-1, 1]) {
    k.add('caliperM', rbox(0.046, 0.088, 0.16, 0.014, 1), {
      pos: [discX + s * 0.048, cy, cz],
      rot: [ca, 0, 0],
      tint: s > 0 ? 0x9c3d18 : 0x7c2f13,
    });
    // guide pin through the bridge
    k.add('machined', new THREE.CylinderGeometry(0.008, 0.008, 0.13, 7), {
      pos: [discX, cy + 0.034, cz + s * 0.062],
      rot: [0, 0, Math.PI / 2],
      tint: 0xc9cdd0,
    });
  }
  // bleed nipple
  k.add('machined', new THREE.CylinderGeometry(0.007, 0.009, 0.03, 6), {
    pos: [discX - 0.03, cy + 0.062, cz - 0.03],
    rot: [ca, 0, 0],
    tint: 0xb3a680,
  });
  // flexible brake hose running inboard
  k.add(
    'lugRub',
    tube(
      [
        [discX - 0.04, cy + 0.05, cz - 0.05],
        [discX - 0.1, cy + 0.09, cz - 0.11],
        [discX - 0.19, cy + 0.12, cz - 0.15],
      ],
      0.009,
      7,
    ),
    { tint: 0x191a1b },
  );

  // mud caked into the back of the wheel
  const rnd = mulberry32(551);
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 0.09 + rnd() * 0.09;
    k.add('mudM', blob(0.022 + rnd() * 0.014, 700 + i, [1.1, 1, 0.6]), {
      pos: [discX - 0.04 - rnd() * 0.02, Math.cos(a) * r, Math.sin(a) * r],
      tint: rnd() > 0.5 ? 0x635a4a : 0x3d352c,
    });
  }
}

// ---------------------------------------------------------------------------
// One corner. Prototypes are built once and cloned, so four wheels cost one
// set of geometry.
// ---------------------------------------------------------------------------

let PROTO = null;

function buildProto(materials) {
  if (PROTO) return PROTO;
  const mats = wheelMaterials(materials);

  const spinKit = new Bash('tyre');
  buildLugs(spinKit);
  buildTyreMud(spinKit);
  buildRim(spinKit);
  const spin = spinKit.build(mats);

  const carcass = new THREE.Mesh(buildCarcass(), mats.carcass);
  carcass.name = 'tyre_carcass';
  carcass.castShadow = true;
  carcass.receiveShadow = true;
  spin.add(carcass);

  const staticKit = new Bash('brakes');
  buildBrakes(staticKit);
  const stat = staticKit.build(mats);

  // dust piled against the contact patch, in the non-spinning frame
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.92), mats.contactM);
  decal.rotation.x = -Math.PI / 2;
  decal.position.y = -S.axleY + 0.012;
  decal.renderOrder = 3;
  decal.castShadow = false;
  decal.receiveShadow = true;
  decal.name = 'contact_dust';
  stat.add(decal);

  PROTO = { spin, stat, mats };
  return PROTO;
}

/**
 * One complete corner. Returns { group, spin } where `spin` is the child that
 * should be rotated about X for wheel rotation.
 */
export function buildWheel(materials, { side = 1 } = {}) {
  const { spin: protoSpin, stat: protoStat, mats } = buildProto(materials);
  const group = new THREE.Group();
  group.name = 'wheel';

  const spin = protoSpin.clone(true);
  const stat = protoStat.clone(true);
  // mirror so the dish, beadlock and caliper face outward on both sides
  if (side < 0) {
    spin.scale.x = -1;
    stat.scale.x = -1;
  }
  group.add(spin, stat);

  // keep the tread flattened against the ground while the wheel turns
  for (const child of spin.children) {
    child.onBeforeRender = () => {
      mats.spinU.value = spin.rotation.x;
    };
  }

  return { group, spin };
}

// ---------------------------------------------------------------------------
// Live axles: housings, coils, shocks, links, driveshafts and brake plumbing.
// ---------------------------------------------------------------------------

/** Helical coil spring. */
function coil(radius, height, turns, wire) {
  const pts = [];
  const steps = Math.max(30, Math.round(turns * 16));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * turns;
    // slight barrelling, and the ends coil down tighter
    const r = radius * (1 + Math.sin(t * Math.PI) * 0.06);
    pts.push(new THREE.Vector3(Math.cos(a) * r, t * height, Math.sin(a) * r));
  }
  return tube(pts, wire, 6, 0.5);
}

function buildAxle(k, z, isFront) {
  const th = S.trackHalf;
  const y = S.axleY;
  const px = isFront ? 0.14 : -0.12; // pumpkin offset from the centreline
  const pz = z + (isFront ? 0.17 : -0.17); // diff cover faces away from the cab

  // Road film does most of the work of making these castings read as parts of
  // a truck that has been driven rather than grey primitives.
  const dirty = grime(0x6b7075);
  const dirtier = grime(0x5d6266, { up: 0.86, down: 0.45 });

  // --- housing -----------------------------------------------------------
  k.add('cast', new THREE.CylinderGeometry(0.05, 0.05, th * 2 - 0.14, 16), {
    pos: [0, y, z],
    rot: [0, 0, Math.PI / 2],
    shade: dirty,
  });
  // cast reinforcement sleeves either side of the pumpkin
  k.addMirrored('cast', new THREE.CylinderGeometry(0.062, 0.056, 0.13, 14), {
    pos: [0.3, y, z],
    rot: [0, 0, Math.PI / 2],
    shade: dirtier,
  });
  // banjo housing
  k.add('cast', new THREE.SphereGeometry(0.152, 18, 14), {
    pos: [px, y, z],
    scale: [1.0, 1.02, 0.86],
    shade: dirty,
  });
  // diff cover with its bolt ring
  k.add('cast', new THREE.CylinderGeometry(0.108, 0.126, 0.11, 18), {
    pos: [px, y, pz],
    rot: [Math.PI / 2, 0, 0],
    shade: grime(0x74797d),
  });
  k.add('cast', new THREE.SphereGeometry(0.104, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), {
    pos: [px, y, pz + (isFront ? 0.05 : -0.05)],
    rot: [isFront ? Math.PI / 2 : -Math.PI / 2, 0, 0],
    scale: [1, 0.5, 1],
    shade: grime(0x7a7f83),
  });
  const coverBolt = bolt(0.0115, 0.011);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    k.add('machined', coverBolt, {
      pos: [px + Math.cos(a) * 0.118, y + Math.sin(a) * 0.118, pz + (isFront ? 0.05 : -0.05)],
      rot: [isFront ? -Math.PI / 2 : Math.PI / 2, 0, 0],
      tint: i % 4 === 0 ? 0xa2957f : 0xd2d7da,
    });
  }
  // fill plug and breather
  k.add('machined', new THREE.CylinderGeometry(0.016, 0.016, 0.02, 6), {
    pos: [px + 0.1, y + 0.06, pz + (isFront ? 0.02 : -0.02)],
    rot: [Math.PI / 2, 0, 0],
    tint: 0xb4ab9b,
  });
  k.add('lugRub', tube(
    [
      [px, y + 0.14, z],
      [px + 0.1, y + 0.3, z + (isFront ? 0.1 : -0.1)],
      [px + 0.24, y + 0.36, z + (isFront ? 0.16 : -0.16)],
    ],
    0.006,
    6,
  ), { tint: 0x1b1c1d });

  // --- outer ends: tube seal, knuckle, steering arm -----------------------
  k.addMirrored('cast', new THREE.CylinderGeometry(0.072, 0.06, 0.1, 16), {
    pos: [th - 0.12, y, z],
    rot: [0, 0, Math.PI / 2],
    shade: grime(0x72777b),
  });
  k.addMirrored('cast', rbox(0.1, 0.2, 0.14, 0.03, 1), {
    pos: [th - 0.05, y, z],
    shade: grime(0x7f8488, { up: 0.72 }),
  });
  if (isFront) {
    k.addMirrored('cast', rbox(0.06, 0.05, 0.14, 0.016, 1), {
      pos: [th - 0.1, y + 0.09, z - 0.11],
      shade: grime(0x7a7f83),
    });
    k.addMirrored('machined', new THREE.CylinderGeometry(0.017, 0.02, 0.05, 8), {
      pos: [th - 0.1, y + 0.11, z - 0.17],
      tint: 0xc5cacd,
    });
  }

  // --- springs, perches, bump stops ---------------------------------------
  const sx = th - 0.42;
  k.addMirrored('cast', new THREE.CylinderGeometry(0.09, 0.08, 0.035, 16), {
    pos: [sx, y + 0.06, z],
    rot: [0, 0, Math.PI / 2],
    shade: grime(0x676c70, { up: 0.9 }),
  });
  // painted coils: the one saturated thing in the running gear, so the
  // underbody is not an all-grey field
  k.addMirrored('anod', coil(0.08, 0.32, 6.5, 0.019), {
    pos: [sx, y + 0.07, z],
    shade: grime(0xa84d1c, { dust: 0xb5a882, up: 0.55, down: 0.35 }),
  });
  k.addMirrored('anod', new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), {
    pos: [sx, y + 0.4, z],
    shade: grime(0x50555a, { up: 0.8 }),
  });
  k.addMirrored('lugRub', new THREE.CylinderGeometry(0.035, 0.048, 0.09, 10), {
    pos: [sx - 0.12, y + 0.16, z],
    tint: 0x17181a,
  });

  // --- shock: body, shaft, eyelets, boot ----------------------------------
  const shx = th - 0.3;
  const shTilt = 0.16;
  k.addMirrored('anod', new THREE.CylinderGeometry(0.036, 0.036, 0.24, 14), {
    pos: [shx - 0.05, y + 0.3, z + 0.12],
    rot: [0.1, 0, shTilt],
    shade: grime(0x3c4145, { up: 0.6 }),
  });
  k.addMirrored('machined', new THREE.CylinderGeometry(0.028, 0.028, 0.16, 12), {
    pos: [shx - 0.02, y + 0.44, z + 0.15],
    rot: [0.1, 0, shTilt],
    tint: 0xd7dcdf,
  });
  k.addMirrored('lugRub', new THREE.CylinderGeometry(0.042, 0.042, 0.09, 12), {
    pos: [shx - 0.032, y + 0.39, z + 0.14],
    rot: [0.1, 0, shTilt],
    tint: 0x1c1d1f,
  });
  k.addMirrored('cast', rbox(0.05, 0.06, 0.05, 0.014, 1), {
    pos: [shx - 0.078, y + 0.16, z + 0.1],
    tint: 0x565b5f,
  });
  k.addMirrored('lugRub', new THREE.TorusGeometry(0.022, 0.011, 6, 12), {
    pos: [shx - 0.078, y + 0.16, z + 0.1],
    rot: [0, Math.PI / 2, 0],
    tint: 0x202224,
  });

  // --- links --------------------------------------------------------------
  const armZ = z + (isFront ? -0.4 : 0.4);
  k.addMirrored('cast', rbox(0.056, 0.07, 0.66, 0.018, 1), {
    pos: [th - 0.36, y - 0.06, armZ],
    rot: [isFront ? 0.09 : -0.09, 0, 0.03],
    shade: grime(0x666b70, { up: 0.85, down: 0.45 }),
  });
  for (const dz of [-0.32, 0.32]) {
    k.addMirrored('lugRub', new THREE.CylinderGeometry(0.042, 0.042, 0.07, 12), {
      pos: [th - 0.36, y - 0.06 + (isFront ? -dz : dz) * 0.09, armZ + dz],
      rot: [0, 0, Math.PI / 2],
      tint: 0x1a1b1d,
    });
    k.addMirrored('machined', bolt(0.016, 0.014), {
      pos: [th - 0.32, y - 0.06 + (isFront ? -dz : dz) * 0.09, armZ + dz],
      rot: [0, 0, -Math.PI / 2],
      tint: 0xc6cbce,
    });
  }
  // track bar across the housing
  k.add('cast', new THREE.CylinderGeometry(0.024, 0.024, th * 1.5, 12), {
    pos: [0.1, y + 0.13, z + (isFront ? -0.2 : 0.2)],
    rot: [0, 0, Math.PI / 2 + 0.05],
    tint: 0x63686d,
  });
  if (isFront) {
    // tie rod and drag link
    k.add('cast', new THREE.CylinderGeometry(0.026, 0.026, th * 2 - 0.3, 12), {
      pos: [0, y + 0.1, z - 0.18],
      rot: [0, 0, Math.PI / 2],
      tint: 0x686d72,
    });
    k.addMirrored('machined', new THREE.SphereGeometry(0.028, 10, 8), {
      pos: [th - 0.13, y + 0.1, z - 0.18],
      tint: 0xbcc3cb,
    });
  }
  // sway bar and end links
  k.add('cast', new THREE.CylinderGeometry(0.02, 0.02, th * 1.7, 10), {
    pos: [0, y + 0.26, z + (isFront ? 0.3 : -0.3)],
    rot: [0, 0, Math.PI / 2],
    tint: 0x585d62,
  });
  k.addMirrored('machined', new THREE.CylinderGeometry(0.011, 0.011, 0.19, 8), {
    pos: [th - 0.24, y + 0.17, z + (isFront ? 0.3 : -0.3)],
    rot: [0, 0, 0.1],
    tint: 0xbabfc2,
  });

  // --- brake plumbing -----------------------------------------------------
  k.add('cast', rbox(0.05, 0.04, 0.05, 0.01, 1), { pos: [0.02, y + 0.11, z], tint: 0x80858a });
  k.addMirrored('machined', tube(
    [
      [0.05, y + 0.11, z],
      [0.3, y + 0.14, z - 0.03],
      [th - 0.4, y + 0.1, z - 0.02],
      [th - 0.16, y + 0.08, z + 0.01],
    ],
    0.0065,
    6,
  ), { tint: 0xa0a3a6 });
  k.addMirrored('lugRub', tube(
    [
      [th - 0.16, y + 0.08, z + 0.01],
      [th - 0.1, y + 0.16, z - 0.04],
      [th - 0.06, y + 0.12, z - 0.1],
    ],
    0.008,
    6,
  ), { tint: 0x191a1c });

  // --- mud thrown up onto the housing -------------------------------------
  const rnd = mulberry32(isFront ? 313 : 727);
  for (let i = 0; i < 14; i++) {
    const bx = (rnd() - 0.5) * (th * 1.7);
    k.add('mudM', blob(0.026 + rnd() * 0.02, 400 + i + (isFront ? 0 : 50), [1.4, 0.8, 1.2]), {
      pos: [bx, y - 0.04 - rnd() * 0.02, z + (rnd() - 0.5) * 0.16],
      tint: rnd() > 0.6 ? 0x665c4b : 0x3a322a,
    });
  }
}

/** Driveshafts from the transfer case out to each pumpkin. */
function buildDriveline(k) {
  const y = S.axleY;
  for (const [z, isFront] of [
    [S.frontAxleZ, true],
    [S.rearAxleZ, false],
  ]) {
    const px = isFront ? 0.14 : -0.12;
    const from = [isFront ? 0.06 : -0.02, y - 0.02, isFront ? 0.42 : -0.36];
    const to = [px, y + 0.02, z + (isFront ? -0.14 : 0.14)];
    const mid = [(from[0] + to[0]) * 0.5, (from[1] + to[1]) * 0.5 - 0.01, (from[2] + to[2]) * 0.5];
    k.add('cast', tube([from, mid, to], 0.033, 10), { shade: grime(0x787d82, { up: 0.7 }) });
    // splined slip yoke behind the front joint
    k.add('machined', new THREE.CylinderGeometry(0.042, 0.042, 0.09, 12), {
      pos: [(from[0] + mid[0]) * 0.5, (from[1] + mid[1]) * 0.5, (from[2] + mid[2]) * 0.5],
      rot: [isFront ? -1.36 : 1.36, 0, 0],
      shade: rimGrime(0x9aa0a4, { from: 0, to: 1, amount: 0.55 }),
    });
    // universal joints: a cross, two cups and a strap each end
    for (const p of [from, to]) {
      k.add('cast', new THREE.SphereGeometry(0.042, 10, 8), { pos: p, scale: [1, 0.9, 0.9], tint: 0x656a6f });
      k.add('machined', new THREE.CylinderGeometry(0.012, 0.012, 0.085, 7), {
        pos: p,
        rot: [0, 0, Math.PI / 2],
        tint: 0xb9bec1,
      });
      k.add('machined', new THREE.CylinderGeometry(0.014, 0.014, 0.076, 7), {
        pos: p,
        rot: [Math.PI / 2, 0, 0],
        tint: 0xa8adb1,
      });
    }
    // pinion nose and yoke sticking out of the diff toward the shaft
    k.add('cast', new THREE.CylinderGeometry(0.048, 0.062, 0.1, 14), {
      pos: [px, y + 0.02, z + (isFront ? -0.08 : 0.08)],
      rot: [Math.PI / 2, 0, 0],
      shade: grime(0x6f7479, { up: 0.8 }),
    });
  }
  // transfer case, tucked under the frame rails
  k.add('cast', rbox(0.24, 0.22, 0.32, 0.05, 1), {
    pos: [0.02, S.axleY - 0.03, 0.02],
    shade: grime(0x676c70, { up: 0.8 }),
  });
  k.add('cast', new THREE.CylinderGeometry(0.07, 0.07, 0.1, 14), {
    pos: [0.02, S.axleY - 0.02, 0.19],
    rot: [Math.PI / 2, 0, 0],
    tint: 0x6d7276,
  });
}

/** Solid front/rear axle assemblies, links, springs, shocks and driveline. */
export function buildAxles(materials) {
  const mats = wheelMaterials(materials);
  const k = new Bash('axles');
  buildAxle(k, S.frontAxleZ, true);
  buildAxle(k, S.rearAxleZ, false);
  buildDriveline(k);
  return k.build(mats);
}
