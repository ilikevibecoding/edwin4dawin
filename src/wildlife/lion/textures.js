import * as THREE from 'three';
import {
  cached,
  canvasTexture,
  clamp,
  cutoutTexture,
  fbm,
  lerp,
  mixRgb,
  mulberry32,
  normalFromHeight,
  smoothstep,
  worley,
} from '../../textures/core.js';

// ---------------------------------------------------------------------------
// Every texture a lion wears, drawn on canvases.
//
// One atlas carries the whole animal so the skinned body is a single draw.
// Regions are in UV space (v up); the geometry maps each part into its region
// with `uvIn`, and the painters below draw into the same rectangles, so the
// two agree by construction rather than by a shared constant nobody reads.
// ---------------------------------------------------------------------------

export const ATLAS = {
  body: [0, 0.5, 1, 1],
  leg: [0, 0.25, 0.5, 0.5],
  skull: [0.5, 0.25, 1, 0.5],
  muzzle: [0, 0.125, 0.25, 0.25],
  nose: [0.25, 0.125, 0.375, 0.25],
  eye: [0.375, 0.125, 0.5, 0.25],
  earOut: [0.5, 0.125, 0.625, 0.25],
  earIn: [0.625, 0.125, 0.75, 0.25],
  pad: [0.75, 0.125, 0.875, 0.25],
  claw: [0.875, 0.125, 1, 0.25],
  jaw: [0, 0, 0.25, 0.125],
  tail: [0.25, 0, 0.75, 0.125],
  lid: [0.75, 0, 1, 0.125],
};

/** Map a part's own (u, v) in [0,1]² into an atlas region. */
export function uvIn(rect, u, v) {
  return [rect[0] + (rect[2] - rect[0]) * clamp(u), rect[1] + (rect[3] - rect[1]) * clamp(v)];
}

/**
 * The skull region is cylindrical about a vertical axis through the skull, in
 * head space (forward +z, up +y, unit head metres): u from the angle about
 * (0, cz), face at u = 0.5; v from height over `vSpan` centred on cy. The
 * geometry maps with this and the painter inverts it, so a mark placed here in
 * metres lands on the animal in metres.
 */
export const SKULL_MAP = { cy: 0.026, cz: 0.06, vSpan: 0.24, r: 0.115 };

// coat palette, [r,g,b] 0-255. Warm tawny over a cream ventral, umber dorsal;
// kept a little grey so the animal separates from red laterite.
const COAT = {
  side: [196, 168, 130],
  back: [150, 124, 94],
  belly: [222, 203, 168],
  dust: [138, 122, 100],
  cream: [234, 222, 198],
  black: [24, 18, 14],
  lip: [46, 32, 26],
  noseLeather: [48, 36, 32],
  noseBridge: [116, 74, 66],
  earBack: [30, 24, 20],
  earIn: [201, 173, 140],
  earPink: [176, 134, 118],
  pad: [58, 44, 36],
  clawBase: [206, 190, 164],
  clawTip: [90, 74, 60],
  irisOuter: [118, 76, 28],
  irisInner: [192, 134, 50],
  sclera: [196, 172, 134],
};

const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/** Pixel rectangle for a region on a canvas of size S (canvas y runs down). */
function px(rect, S) {
  const x0 = rect[0] * S;
  const y0 = (1 - rect[3]) * S;
  return { x0, y0, w: (rect[2] - rect[0]) * S, h: (rect[3] - rect[1]) * S };
}

/**
 * Fill a region per pixel. `fn(u, v, out)` gets the part's own (u, v) with v up
 * and writes [r,g,b] into out. Runs on the region's ImageData directly, which is
 * the only affordable way to put noise into a million pixels.
 */
function fillRegion(ctx, rect, S, fn) {
  const r = px(rect, S);
  const w = Math.round(r.w);
  const h = Math.round(r.h);
  const img = ctx.getImageData(Math.round(r.x0), Math.round(r.y0), w, h);
  const d = img.data;
  const out = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    const v = 1 - (y + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      fn(u, v, out);
      const i = (y * w + x) * 4;
      d[i] = clamp(out[0], 0, 255);
      d[i + 1] = clamp(out[1], 0, 255);
      d[i + 2] = clamp(out[2], 0, 255);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, Math.round(r.x0), Math.round(r.y0));
}

/**
 * Short hair strokes along the canvas vertical, which is "along the animal" for
 * the body, legs and tail regions. This is the 1 cm grain: without it a coat is
 * a colour, with it the surface has a direction.
 */
function hairStrokes(ctx, rect, S, rnd, { count, len = [6, 14], light = 0.11, dir = 0 } = {}) {
  const r = px(rect, S);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x0, r.y0, r.w, r.h);
  ctx.clip();
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const x = r.x0 + rnd() * r.w;
    const y = r.y0 + rnd() * r.h;
    const l = lerp(len[0], len[1], rnd()) * (S / 1024);
    const a = dir + (rnd() - 0.5) * 0.5;
    const shade = (rnd() - 0.5) * 2 * light;
    ctx.strokeStyle = shade > 0 ? `rgba(255,240,215,${shade})` : `rgba(40,25,12,${-shade})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(a) * l, y + Math.cos(a) * l);
    ctx.stroke();
  }
  ctx.restore();
}

/** Small dark specks, the ticking of a lion's coat where dark hair tips show. */
function ticking(ctx, rect, S, rnd, count, color = 'rgba(50,32,18,0.45)', size = 1.2) {
  const r = px(rect, S);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = r.x0 + rnd() * r.w;
    const y = r.y0 + rnd() * r.h;
    const s = size * (0.6 + rnd() * 0.8) * (S / 1024);
    ctx.fillRect(x, y, s, s);
  }
}

function coatShade(u, v, seed, { spots, su = u, sv = v }) {
  // elevation around the body: 0 at the belly seam, 1 on the spine
  const e = 1 - Math.abs(2 * u - 1);
  let c = mixRgb(COAT.belly, COAT.side, smoothstep(0.06, 0.42, e));
  c = mixRgb(c, COAT.back, smoothstep(0.55, 1.0, e) * 0.85);
  // dorsal stripe, and the greyer saddle over the shoulders (v toward the head)
  c = mixRgb(c, COAT.black, 0.14 * smoothstep(0.035, 0.0, Math.abs(u - 0.5)));
  c = mixRgb(c, COAT.dust, 0.25 * smoothstep(0.5, 0.9, e) * smoothstep(0.5, 0.75, v) * smoothstep(0.95, 0.8, v));
  const m0 = fbm(u * 3 + seed, v * 4, { octaves: 2, period: 8, seed: 397 + seed });
  const m1 = fbm(u * 6 + seed, v * 9, { octaves: 3, period: 16, seed: 401 + seed });
  const m2 = fbm(u * 38, v * 52 + seed, { octaves: 3, period: 64, seed: 409 + seed });
  const light = 1 + (m0 - 0.5) * 0.16 + (m1 - 0.5) * 0.26 + (m2 - 0.5) * 0.16;
  c = [c[0] * light, c[1] * light, c[2] * light];
  if (spots) {
    // cub rosettes: sparse cells, strongest on the belly and flanks, fading
    // toward the spine and the way they fade on the animal itself as it grows
    const w = worley(su * 22, sv * 30, 22, 77);
    const spot = smoothstep(0.34, 0.2, w.f1) * (0.45 + 0.55 * w.id) * (1 - smoothstep(0.7, 1.0, e)) * 0.55;
    c = mixRgb(c, COAT.lip, spot);
  }
  // dust and environmental wear, heaviest along the belly seam
  const dust = smoothstep(0.32, 0.0, e) * (0.55 + 0.45 * m2);
  c = mixRgb(c, COAT.dust, dust * 0.55);
  return c;
}

/**
 * The atlas. `spots` selects the cub coat. Everything an adult and a cub share
 * is drawn the same way, so the two read as the same species.
 */
export function coatAtlas({ size = 1024, spots = false } = {}) {
  return cached(`lion-coat-${size}-${spots}`, () => {
    const rnd = mulberry32(spots ? 9021 : 9001);
    const seed = spots ? 3 : 0;
    const tex = canvasTexture(
      size,
      (ctx, S) => {
        ctx.fillStyle = rgb(COAT.side);
        ctx.fillRect(0, 0, S, S);

        // --- body ------------------------------------------------------------
        fillRegion(ctx, ATLAS.body, S, (u, v, o) => {
          const c = coatShade(u, v, seed, { spots });
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });
        hairStrokes(ctx, ATLAS.body, S, rnd, { count: 30000, len: [7, 16], light: 0.14 });
        ticking(ctx, ATLAS.body, S, rnd, 14000, 'rgba(50,32,18,0.5)', 1.4);

        // --- legs: u around from the outside, v = 0 at the paw ----------------
        fillRegion(ctx, ATLAS.leg, S, (u, v, o) => {
          // inner face of the leg is paler, the paw end carries the dust
          const inner = smoothstep(0.25, 0.5, u) * smoothstep(0.75, 0.5, u);
          // spots are keyed to the leg's own (u, v) so they are cells, not bands
          let c = coatShade(0.22 + 0.2 * inner, v, seed + 1, { spots, su: u * 0.55, sv: v * 1.3 });
          c = mixRgb(c, COAT.cream, inner * 0.3);
          const m = fbm(u * 12, v * 18, { octaves: 3, period: 32, seed: 433 });
          c = mixRgb(c, COAT.dust, smoothstep(0.42, 0.0, v) * (0.5 + 0.5 * m) * 0.7);
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });
        hairStrokes(ctx, ATLAS.leg, S, rnd, { count: 9000, len: [5, 12] });
        ticking(ctx, ATLAS.leg, S, rnd, 2500);

        // --- tail: v = 0 at the tip, the tuft base goes dark ------------------
        fillRegion(ctx, ATLAS.tail, S, (u, v, o) => {
          let c = coatShade(0.3 + 0.4 * Math.abs(u - 0.5) * 2, v, seed + 2, { spots, su: u * 0.3, sv: v * 2.5 });
          c = mixRgb(c, COAT.black, smoothstep(0.28, 0.0, v) * 0.85);
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });
        hairStrokes(ctx, ATLAS.tail, S, rnd, { count: 5000, len: [5, 12] });

        // --- skull: cylindrical, face at u = 0.5, v up ------------------------
        // painted in head metres through SKULL_MAP, so the marks sit where the
        // eyes and brows actually are
        const SM = SKULL_MAP;
        fillRegion(ctx, ATLAS.skull, S, (u, v, o) => {
          const a = (u - 0.5) * Math.PI * 2;
          const hx = SM.r * Math.sin(a);
          const hz = SM.cz + SM.r * Math.cos(a);
          const hy = SM.cy + (v - 0.5) * SM.vSpan;
          // darker over the crown and down the back of the head
          let c = mixRgb(COAT.side, COAT.back, smoothstep(0.06, 0.12, hy) * 0.55 + smoothstep(0.06, -0.02, hz) * 0.3);
          // the lower face is pale: cheeks, chin, throat
          const lower = smoothstep(-0.01, -0.06, hy) * smoothstep(0.03, 0.12, hz);
          c = mixRgb(c, COAT.cream, lower * 0.55);
          c = mixRgb(c, COAT.cream, smoothstep(-0.05, -0.1, hy) * 0.7);
          for (const s of [-1, 1]) {
            const ex = hx - s * 0.058;
            const ey = hy - 0.058;
            const ez = hz - 0.156;
            const d = Math.hypot(ex, ey, ez);
            // a dark socket around the ball, soft and thin; the lids carry the
            // black liner, and too much dark here reads as a shut eye in shadow
            c = mixRgb(c, COAT.lip, smoothstep(0.036, 0.027, d) * 0.4);
            // the pale patch under the eye, bold: it is what frames a cat's eye
            const pu = Math.hypot(hx - s * 0.058, (hy - 0.024) * 1.2, hz - 0.162);
            c = mixRgb(c, COAT.cream, smoothstep(0.034, 0.016, pu) * 0.95);
            // a pale brow spot over each eye
            const bu = Math.hypot(hx - s * 0.052, (hy - 0.098) * 1.4, hz - 0.128);
            c = mixRgb(c, COAT.cream, smoothstep(0.03, 0.012, bu) * 0.5);
          }
          // forehead breakup
          const m = fbm(u * 14, v * 14, { octaves: 3, period: 16, seed: 451 });
          const l = 1 + (m - 0.5) * 0.18;
          o[0] = c[0] * l;
          o[1] = c[1] * l;
          o[2] = c[2] * l;
        });
        hairStrokes(ctx, ATLAS.skull, S, rnd, { count: 6000, len: [3, 8], light: 0.08 });

        // --- muzzle: u around, 0 at the lip seam, 0.5 on top; v toward the nose
        fillRegion(ctx, ATLAS.muzzle, S, (u, v, o) => {
          const top = 1 - Math.abs(2 * u - 1); // 1 on the bridge, 0 at the lip
          // the bridge and the upper sides keep the coat colour; the whisker pads
          // and the lip, the lower two fifths, are cream
          let c = mixRgb(mixRgb(COAT.cream, COAT.belly, 0.4), COAT.side, smoothstep(0.34, 0.6, top) * 0.92);
          const m = fbm(u * 10, v * 10, { octaves: 3, period: 16, seed: 461 });
          c = mixRgb(c, COAT.belly, (m - 0.5) * 0.4);
          // whisker pads: rows of small dark follicles either side, and the
          // pad itself a shade paler than the bridge
          for (const s of [-1, 1]) {
            const padU = Math.abs(u - (0.5 + s * 0.3));
            c = mixRgb(c, COAT.cream, smoothstep(0.14, 0.05, padU) * smoothstep(0.1, 0.35, v) * 0.35);
            // follicles are pinpricks a few millimetres across, not spots
            for (let row = 0; row < 4; row++) {
              for (let col = 0; col < 6; col++) {
                const su = 0.5 + s * (0.24 + row * 0.04);
                const sv = 0.2 + col * 0.12 + (row % 2) * 0.04;
                const d = Math.hypot((u - su) * 90, (v - sv) * 70);
                c = mixRgb(c, COAT.lip, smoothstep(0.7, 0.25, d) * 0.5);
              }
            }
            // the pad is a cushion: a soft shade along its upper edge and below the nose
            c = mixRgb(c, COAT.dust, smoothstep(0.08, 0.02, Math.abs(padU - 0.15)) * smoothstep(0.1, 0.4, v) * 0.22);
            // tear line: from the inner corner of the eye down the side of the muzzle
            const tu = u - (0.5 + s * (0.16 + v * 0.12));
            const tear = smoothstep(0.02, 0.006, Math.abs(tu)) * smoothstep(0.42, 0.25, v) * smoothstep(-0.02, 0.06, v);
            c = mixRgb(c, COAT.lip, tear * 0.7);
          }
          // lip line along the seam and the philtrum up the front
          const lip = smoothstep(0.03, 0.0, Math.min(u, 1 - u));
          c = mixRgb(c, COAT.lip, lip * 0.95);
          const phil = smoothstep(0.02, 0.006, Math.min(u, 1 - u)) * smoothstep(0.7, 0.86, v);
          c = mixRgb(c, COAT.lip, phil * 0.45);
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });
        hairStrokes(ctx, ATLAS.muzzle, S, rnd, { count: 1400, len: [2, 5], light: 0.07 });

        // --- nose leather: front projected, nostrils and philtrum ------------
        fillRegion(ctx, ATLAS.nose, S, (u, v, o) => {
          let c = mixRgb(COAT.noseLeather, COAT.noseBridge, smoothstep(0.78, 1.0, v) * 0.7);
          const grain = fbm(u * 30, v * 30, { octaves: 3, period: 64, seed: 471 });
          c = mixRgb(c, [90, 74, 70], (grain - 0.5) * 0.5);
          for (const s of [-1, 1]) {
            // nostril: a comma opening outward and down
            const dx = (u - (0.5 + s * 0.24)) * 4.2;
            const dy = (v - 0.42) * 3.4 + dx * s * 0.35;
            const d = Math.hypot(dx, dy);
            c = mixRgb(c, [8, 6, 6], smoothstep(0.42, 0.2, d));
            // wing of the nostril catches light
            c = mixRgb(c, [110, 88, 84], smoothstep(0.58, 0.44, d) * smoothstep(0.42, 0.5, d) * 0.5);
          }
          const phil = smoothstep(0.05, 0.015, Math.abs(u - 0.5)) * smoothstep(0.52, 0.3, v);
          c = mixRgb(c, [10, 8, 8], phil * 0.85);
          // moist highlight speckle
          const sp = fbm(u * 60, v * 60, { octaves: 2, period: 64, seed: 479 });
          c = mixRgb(c, [150, 130, 128], smoothstep(0.62, 0.75, sp) * 0.5 * smoothstep(0.3, 0.7, v));
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });

        // --- eye: equirect with the iris at the pole (v = 1) ------------------
        fillRegion(ctx, ATLAS.eye, S, (u, v, o) => {
          const th = (1 - v) * Math.PI; // polar angle from the gaze axis
          const deg = (th * 180) / Math.PI;
          let c = COAT.sclera;
          // brown sclera vessels
          const vein = fbm(u * 8, v * 14, { octaves: 3, period: 8, seed: 491 });
          c = mixRgb(c, [120, 70, 40], smoothstep(0.58, 0.75, vein) * 0.5 * smoothstep(30, 60, deg));
          // iris with radial fibres; a lion's iris fills most of the opening
          const fib = fbm(u * 24, v * 3, { octaves: 4, period: 24, seed: 497 });
          // the iris fills the almond between the lids; sclera shows at the corners
          const irisT = smoothstep(36, 12, deg);
          let iris = mixRgb(COAT.irisOuter, COAT.irisInner, irisT);
          iris = [iris[0] * (0.8 + 0.4 * fib), iris[1] * (0.8 + 0.4 * fib), iris[2] * (0.8 + 0.35 * fib)];
          c = mixRgb(c, iris, smoothstep(38, 35, deg));
          // limbal ring
          c = mixRgb(c, [40, 26, 12], smoothstep(41, 37, deg) * smoothstep(32, 36, deg) * 0.85);
          // pupil, soft edged, round the way a lion's is
          c = mixRgb(c, [6, 4, 4], smoothstep(13, 10.5, deg));
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });

        // --- ears --------------------------------------------------------------
        // ear caps are polar: v = 1 at the centre of the cup, 0 at the rim; the
        // tip of the ear is at u = 0.25 and the base, toward the head, at 0.75
        fillRegion(ctx, ATLAS.earOut, S, (u, v, o) => {
          // black back with a tawny rim, paler toward the base
          let c = mixRgb(COAT.side, COAT.earBack, smoothstep(0.12, 0.4, v));
          const base = smoothstep(0.35, 0.1, Math.abs(u - 0.75)) * smoothstep(0.45, 0.05, v);
          c = mixRgb(c, COAT.side, base * 0.9);
          const m = fbm(u * 10, v * 10, { octaves: 3, period: 16, seed: 503 });
          const l = 1 + (m - 0.5) * 0.3;
          o[0] = c[0] * l;
          o[1] = c[1] * l;
          o[2] = c[2] * l;
        });
        fillRegion(ctx, ATLAS.earIn, S, (u, v, o) => {
          let c = mixRgb(COAT.earIn, COAT.earPink, smoothstep(0.45, 0.9, v));
          // dark hair fringing the edges of the cup, a pale tuft in the base
          const streak = fbm(u * 26, v * 4, { octaves: 3, period: 32, seed: 509 });
          const edge = smoothstep(0.55, 0.15, v);
          c = mixRgb(c, COAT.lip, smoothstep(0.55, 0.75, streak) * edge * 0.75);
          const base = smoothstep(0.3, 0.08, Math.abs(u - 0.75)) * smoothstep(0.7, 0.2, v);
          c = mixRgb(c, COAT.cream, base * 0.85);
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });
        hairStrokes(ctx, ATLAS.earIn, S, rnd, { count: 700, len: [4, 10], light: 0.14 });

        // --- pads and claws --------------------------------------------------
        fillRegion(ctx, ATLAS.pad, S, (u, v, o) => {
          const m = fbm(u * 24, v * 24, { octaves: 4, period: 64, seed: 521 });
          const c = mixRgb(COAT.pad, [96, 78, 66], (m - 0.4) * 0.8);
          // dust in the creases
          const d = mixRgb(c, COAT.dust, smoothstep(0.62, 0.8, m) * 0.5);
          o[0] = d[0];
          o[1] = d[1];
          o[2] = d[2];
        });
        fillRegion(ctx, ATLAS.claw, S, (u, v, o) => {
          const c = mixRgb(COAT.clawBase, COAT.clawTip, smoothstep(0.2, 0.9, v));
          const g = fbm(u * 6, v * 30, { octaves: 2, period: 8, seed: 523 });
          const l = 1 + (g - 0.5) * 0.25;
          o[0] = c[0] * l;
          o[1] = c[1] * l;
          o[2] = c[2] * l;
        });

        // --- chin, lids --------------------------------------------------------
        fillRegion(ctx, ATLAS.jaw, S, (u, v, o) => {
          // no brighter than the whisker pads above it, or the chin reads as a grin
          let c = mixRgb(COAT.cream, COAT.belly, 0.45);
          const m = fbm(u * 8, v * 8, { octaves: 3, period: 16, seed: 531 });
          c = mixRgb(c, COAT.belly, (m - 0.5) * 0.5);
          // the sides of the jaw toward its angle carry the coat colour; the
          // chin and the underside are cream
          const side = smoothstep(0.42, 0.22, Math.abs(u - 0.5)) * smoothstep(0.12, 0.38, Math.abs(u - 0.5));
          c = mixRgb(c, COAT.side, side * smoothstep(0.7, 0.2, v) * 0.75);
          // lower lip runs along the top of the jaw loft (u = 0.5): a thin dark
          // line, most of the jaw the cream of the chin
          c = mixRgb(c, COAT.lip, smoothstep(0.05, 0.015, Math.abs(u - 0.5)) * 0.85);
          c = mixRgb(c, COAT.lip, smoothstep(0.86, 0.97, v) * smoothstep(0.3, 0.12, Math.abs(u - 0.5)) * 0.3);
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });
        hairStrokes(ctx, ATLAS.jaw, S, rnd, { count: 1200, len: [3, 7], light: 0.08 });
        fillRegion(ctx, ATLAS.lid, S, (u, v, o) => {
          // the lid is coat coloured with a thin black rim, the way the eye is
          // lined; u < 0.5 is the outer half, which carries a touch of the pale ring
          let c = mixRgb(COAT.side, COAT.cream, smoothstep(0.35, 0.05, v) * 0.35);
          c = mixRgb(c, COAT.black, smoothstep(0.07, 0.015, v));
          o[0] = c[0];
          o[1] = c[1];
          o[2] = c[2];
        });
      },
      { srgb: true, aniso: 8 },
    );
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Hair-direction normal map for the atlas. Streaks along the canvas vertical,
 * which is along the animal on every lofted region, plus a soft grain so the
 * surface breaks the sun into fur rather than reflecting it as a skin.
 */
export function coatNormal(size = 256) {
  return cached(`lion-coat-normal-${size}`, () => {
    const h = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;
        // a seamless tile of fine strands; the material repeats it several
        // times over the atlas so a hair is millimetres, not centimetres
        const strand = fbm(u * 28, v * 4, { octaves: 3, period: 4, seed: 601 });
        const grain = fbm(u * 12, v * 12, { octaves: 2, period: 12, seed: 607 });
        h[y * size + x] = strand * 0.75 + grain * 0.25;
      }
    }
    const tex = normalFromHeight(h, size, size, 0.9);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(7, 7);
    return tex;
  });
}

/**
 * Shell-fur strand map. Alpha encodes hair length: a shell at height h keeps a
 * texel only where alpha ≥ h, so one texture serves every shell and the hairs
 * thin out toward the outside. RGB is the strand colour, darker under the jaw
 * (u near 0 and 1, the bottom of the mane loft) and blonder on top.
 */
export function maneStrands(size = 512) {
  return cached(`lion-mane-${size}`, () => {
    const rnd = mulberry32(7331);
    return cutoutTexture(
      size,
      (ctx, S) => {
        ctx.clearRect(0, 0, S, S);
        const n = Math.round(S * S * 0.11);
        const dark = [52, 36, 24];
        const brown = [118, 80, 46];
        const tawny = [176, 128, 74];
        const blond = [214, 176, 118];
        for (let i = 0; i < n; i++) {
          const x = rnd() * S;
          const y = rnd() * S;
          const u = x / S;
          const top = 1 - Math.abs(2 * u - 1);
          // hair length: mostly long, so the mane reads full and not moth-eaten
          const len = 0.18 + 0.82 * Math.pow(rnd(), 0.6);
          // tawny over the crown and shoulders, darkening down the throat and chest
          const t = rnd();
          let c;
          if (t < 0.14 + (1 - top) * 0.32) c = dark;
          else if (t < 0.5) c = brown;
          else if (t < 0.84) c = tawny;
          else c = blond;
          const shade = 0.8 + rnd() * 0.4;
          ctx.fillStyle = rgba([c[0] * shade, c[1] * shade, c[2] * shade], len);
          const r = (0.9 + rnd() * 1.3) * (S / 512);
          const l = r * (2.2 + rnd() * 2.5);
          const a = (rnd() - 0.5) * 0.6;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(a);
          ctx.fillRect(-r * 0.5, -l * 0.5, r, l);
          ctx.restore();
        }
      },
      { aniso: 4 },
    );
  });
}

/**
 * Short fuzz for the body shells. Grayscale: the value is the hair length,
 * because it is read through `alphaMap`, which samples the green channel. The
 * colour comes from the coat atlas underneath.
 */
export function fuzzStrands(size = 256) {
  return cached(`lion-fuzz-${size}`, () => {
    const rnd = mulberry32(5511);
    return canvasTexture(
      size,
      (ctx, S) => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, S, S);
        const n = Math.round(S * S * 0.2);
        for (let i = 0; i < n; i++) {
          const len = 0.12 + 0.88 * Math.pow(rnd(), 0.8);
          const v = Math.round(len * 255);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          const r = (0.7 + rnd() * 0.9) * (S / 256);
          ctx.fillRect(rnd() * S, rnd() * S, r, r * (1.5 + rnd() * 2));
        }
      },
      { srgb: false, aniso: 2 },
    );
  });
}

/**
 * Cutout atlas for the strands: the tail tuft in the left half, a fan of dark
 * hairs hanging from the top edge; a single pale whisker in the right half,
 * rooted at the top, tapering to nothing at the bottom.
 */
export function alphaAtlas(size = 256) {
  return cached(`lion-alpha-${size}`, () => {
    const rnd = mulberry32(2211);
    return cutoutTexture(
      size,
      (ctx, S) => {
        ctx.clearRect(0, 0, S, S);
        ctx.lineCap = 'round';
        for (let i = 0; i < 90; i++) {
          const x0 = S * (0.25 + (rnd() - 0.5) * 0.2);
          const spread = (rnd() - 0.5) * 0.5;
          const len = S * (0.5 + rnd() * 0.45);
          const shade = 16 + rnd() * 44;
          ctx.strokeStyle = rgba([shade * 1.35, shade, shade * 0.72], 0.95);
          ctx.lineWidth = (1.1 + rnd() * 1.5) * (S / 256);
          ctx.beginPath();
          ctx.moveTo(x0, S * 0.02);
          ctx.quadraticCurveTo(x0 + spread * S * 0.3, S * 0.45, x0 + spread * S * 0.5, S * 0.02 + len);
          ctx.stroke();
        }
        const g = ctx.createLinearGradient(0, 0, 0, S);
        const c = [236, 228, 214];
        g.addColorStop(0, rgba(c, 1));
        g.addColorStop(0.75, rgba(c, 0.85));
        g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(S * 0.75 - S * 0.03, 0);
        ctx.lineTo(S * 0.75 + S * 0.03, 0);
        ctx.lineTo(S * 0.75 + S * 0.004, S);
        ctx.lineTo(S * 0.75 - S * 0.004, S);
        ctx.closePath();
        ctx.fill();
      },
      { aniso: 2 },
    );
  });
}

/**
 * Far-distance card: a side-on lion painted flat, in the coat colours. From
 * 120 m it is a dozen pixels, and what has to survive is the long low body,
 * the tail and — for the male — the bulk of the mane.
 */
export function farCard(mane) {
  return cached(`lion-card-${mane}`, () => {
    return cutoutTexture(
      128,
      (ctx, S) => {
        const H = S * 0.75;
        ctx.clearRect(0, 0, S, S);
        ctx.translate(0, S * 0.125);
        const body = rgb(COAT.side);
        const dark = rgb(COAT.back);
        const pale = rgb(COAT.belly);
        ctx.fillStyle = body;
        // body
        ctx.beginPath();
        ctx.ellipse(S * 0.5, H * 0.5, S * 0.3, H * 0.19, 0, 0, Math.PI * 2);
        ctx.fill();
        // belly
        ctx.fillStyle = pale;
        ctx.beginPath();
        ctx.ellipse(S * 0.5, H * 0.58, S * 0.27, H * 0.1, 0, 0, Math.PI);
        ctx.fill();
        // legs
        ctx.fillStyle = body;
        for (const x of [0.29, 0.36, 0.64, 0.71]) {
          ctx.fillRect(S * x - S * 0.028, H * 0.55, S * 0.056, H * 0.42);
        }
        // tail
        ctx.strokeStyle = body;
        ctx.lineWidth = S * 0.03;
        ctx.beginPath();
        ctx.moveTo(S * 0.22, H * 0.42);
        ctx.quadraticCurveTo(S * 0.1, H * 0.55, S * 0.12, H * 0.85);
        ctx.stroke();
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(S * 0.12, H * 0.87, S * 0.03, 0, Math.PI * 2);
        ctx.fill();
        // neck and head
        if (mane) {
          ctx.fillStyle = dark;
          ctx.beginPath();
          ctx.ellipse(S * 0.8, H * 0.38, S * 0.15, H * 0.24, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(S * 0.84, H * 0.32, S * 0.085, H * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pale;
        ctx.beginPath();
        ctx.ellipse(S * 0.9, H * 0.36, S * 0.04, H * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
      },
      { aniso: 2 },
    );
  });
}
