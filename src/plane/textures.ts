import * as THREE from 'three';
import { Rng } from '../core/seed';

export interface PbrMaps {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  /** clearcoat roughness in the green channel (multiplies the material's `clearcoatRoughness`) */
  clearcoatRoughnessMap?: THREE.CanvasTexture;
  /** tiled orange-peel normal for the clear coat (repeat set on the texture) */
  clearcoatNormalMap?: THREE.CanvasTexture;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}

function toTexture(c: HTMLCanvasElement, srgb: boolean, anisotropy = 8): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.flipY = false; // canvas row 0 is texture v = 0 (fuselage top / wing trailing edge)
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = anisotropy;
  return t;
}

/** Height (grayscale canvas) -> tangent-space normal map. */
function heightToNormal(hc: HTMLCanvasElement, strength = 2.0): HTMLCanvasElement {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d')!.getImageData(0, 0, w, h).data;
  const [out, ctx] = canvas(w, h);
  const img = ctx.createImageData(w, h);
  const H = (x: number, y: number) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
    const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * w + x) * 4;
    img.data[i] = Math.round((-dx / l * 0.5 + 0.5) * 255);
    img.data[i + 1] = Math.round((-dy / l * 0.5 + 0.5) * 255);
    img.data[i + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

function grime(ctx: CanvasRenderingContext2D, rng: Rng, w: number, h: number, count: number, alpha: number, color = '40,35,30'): void {
  for (let i = 0; i < count; i++) {
    const x = rng.range(0, w), y = rng.range(0, h), r = rng.range(8, 60);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${alpha * rng.range(0.4, 1)})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/**
 * Panel lines and rivets drawn into both the height canvas and (faintly) the albedo, inside the row band
 * [y0, y1] (pixels; default the whole canvas). `strength` scales the line depth / darkness (1 = fuselage).
 */
function panels(hctx: CanvasRenderingContext2D, actx: CanvasRenderingContext2D, w: number, h: number, stationsU: number[], stringersV: number[], rivetSpacing: number, o: { y0?: number; y1?: number; strength?: number } = {}): void {
  const y0 = o.y0 ?? 0, y1 = o.y1 ?? h, k = o.strength ?? 1;
  const grey = (base: number, delta: number) => { const v = Math.round(base + delta * k); return `rgb(${v},${v},${v})`; };
  hctx.strokeStyle = grey(128, -38);
  hctx.lineWidth = 2.2;
  actx.strokeStyle = `rgba(30,30,35,${0.22 * k})`;
  actx.lineWidth = 1.5;
  for (const u of stationsU) {
    const x = u * w;
    hctx.beginPath(); hctx.moveTo(x, y0); hctx.lineTo(x, y1); hctx.stroke();
    // faint grime settled along the seam, then the crisp line itself
    actx.save();
    actx.strokeStyle = `rgba(40,38,34,${0.07 * k})`; actx.lineWidth = 9;
    actx.beginPath(); actx.moveTo(x, y0); actx.lineTo(x, y1); actx.stroke();
    actx.restore();
    actx.beginPath(); actx.moveTo(x, y0); actx.lineTo(x, y1); actx.stroke();
    // rivet rows either side of the seam
    for (const off of [-7, 7]) {
      for (let y = y0 + rivetSpacing / 2; y < y1; y += rivetSpacing) {
        hctx.fillStyle = grey(128, 56);
        hctx.beginPath(); hctx.arc(x + off, y, 1.6, 0, Math.PI * 2); hctx.fill();
        actx.fillStyle = `rgba(255,255,255,${0.10 * k})`;
        actx.beginPath(); actx.arc(x + off, y, 1.4, 0, Math.PI * 2); actx.fill();
        actx.fillStyle = `rgba(0,0,0,${0.10 * k})`;
        actx.beginPath(); actx.arc(x + off, y + 1.2, 1.2, 0, Math.PI * 2); actx.fill();
      }
    }
  }
  for (const v of stringersV) {
    const y = v * h;
    if (y < y0 || y > y1) continue;
    hctx.strokeStyle = grey(128, -22);
    hctx.lineWidth = 1.4;
    hctx.beginPath(); hctx.moveTo(0, y); hctx.lineTo(w, y); hctx.stroke();
    actx.strokeStyle = `rgba(30,30,35,${0.12 * k})`;
    actx.beginPath(); actx.moveTo(0, y); actx.lineTo(w, y); actx.stroke();
    for (let x = rivetSpacing / 2; x < w; x += rivetSpacing) {
      hctx.fillStyle = grey(128, 48);
      hctx.beginPath(); hctx.arc(x, y + 5, 1.5, 0, Math.PI * 2); hctx.fill();
      actx.fillStyle = `rgba(0,0,0,${0.08 * k})`;
      actx.beginPath(); actx.arc(x, y + 6, 1.2, 0, Math.PI * 2); actx.fill();
    }
  }
}

export const LIVERY = {
  upper: '#f3f1ea',
  /** wing / stabiliser undersides */
  under: '#e3d9c2',
  lower: '#f5cc5a', // reference body yellow ~ (239,199,90): pale warm yellow, not golden
  cheat: '#1c2d5a',
  pin: '#d8322e',
  registration: 'N726BV',
};
/** cheat line edges as distances (m) below the sill line: navy band top/bottom and the red pinstripe's bottom */
export const CHEAT_LINE = { top: 0.03, bottom: 0.10, pin: 0.125 };

/**
 * Where the fuselage loft puts its texture: the paint is laid out in body coordinates (station x, height y) and
 * converted to UV through these callbacks so the livery lines stay at the intended heights.
 */
export interface FuselageLayout {
  /** body length (m) covered by u 0..1 */
  length: number;
  uOf(x: number): number;
  xOf(u: number): number;
  /** v of height y at station x on the starboard side (port side is 1 - v); null when y is outside the section */
  vOf(x: number, y: number): number | null;
  /** v of the upper surface point at half-width z (starboard side) */
  topV(x: number, z: number): number;
  perimeter(x: number): number;
  /** height of the livery's sill line (bottom of the white upper body) at station x */
  sillY(x: number): number;
}

/**
 * Text painted on both sides of the body so it reads left-to-right from outside. The loft's u runs nose -> tail,
 * so the starboard side (where the nose is to the reader's right) needs a horizontal flip and the port side
 * (v increasing upwards) a vertical flip. Glyphs are stretched by the local v/u scale ratio to stay isotropic.
 */
function bodyText(ctx: CanvasRenderingContext2D, lay: FuselageLayout, w: number, h: number, text: string, x: number, y: number, heightM: number, weight: string, family: string, color: string): void {
  const pxU = w / lay.length;
  const fontPx = heightM / 0.72 * pxU;
  // the glyphs are rendered once in body metres (isotropic), then copied column by column so that every column
  // sits at the local v of the text height and is scaled by the local texels-per-metre: the word follows the
  // sill droop and keeps a constant physical height across stations whose perimeter changes
  const boxH = Math.ceil(fontPx * 1.6);
  const [tc, tctx] = canvas(w, boxH);
  tctx.fillStyle = color;
  tctx.font = `${weight} ${fontPx.toFixed(1)}px ${family}`;
  tctx.textAlign = 'center';
  tctx.textBaseline = 'middle';
  tctx.fillText(text, w / 2, boxH / 2);
  const textW = Math.ceil(tctx.measureText(text).width) + 4;
  const u0 = lay.uOf(x) * w;
  const dvdy = (xs: number): number => {
    const a = lay.vOf(xs, y + 0.01), b = lay.vOf(xs, y - 0.01);
    return a !== null && b !== null ? (b - a) / 0.02 : (h / lay.perimeter(xs)) / h;
  };
  for (const side of [1, -1]) {
    for (let c = -textW / 2; c < textW / 2; c++) {
      // starboard reads left-to-right from outside with the nose to the right, so its columns are mirrored in u
      const du = u0 + (side > 0 ? -c : c);
      const xs = lay.xOf(du / w);
      const v = lay.vOf(xs, y) ?? 0.25;
      const pxPerM = dvdy(xs) * h;                 // texels per metre of height at this column
      const dh = boxH / pxU * pxPerM;              // destination height of the glyph box
      const vc = (side > 0 ? v : 1 - v) * h;
      ctx.save();
      ctx.translate(du, vc);
      ctx.scale(1, side > 0 ? 1 : -1);
      ctx.drawImage(tc, w / 2 + c, 0, 1, boxH, 0, -dh / 2, 1, dh);
      ctx.restore();
    }
  }
}

/** Fuselage: u = nose(0) .. tail(1), v = top(0) .. starboard(0.25) .. belly(0.5) .. port(0.75) .. top(1). */
export function fuselageMaps(lay: FuselageLayout): PbrMaps {
  const w = 2048, h = 1024;
  const rng = new Rng('fuselage-paint');
  const [ac, actx] = canvas(w, h);
  const [hc, hctx] = canvas(w, h);
  const [rc, rctx] = canvas(w, h);
  hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, w, h);
  actx.fillStyle = LIVERY.upper; actx.fillRect(0, 0, w, h);
  // livery bands follow body heights: white above the sill, a navy cheat band with a red pinstripe, yellow below
  const cols: { px: number; cheatTop: number; cheatBot: number; pinBot: number }[] = [];
  const vLow = (x: number, y: number) => lay.vOf(x, y) ?? 0.5;
  for (let px = 0; px <= w; px += 8) {
    const x = lay.xOf(px / w), ys = lay.sillY(x);
    cols.push({ px, cheatTop: vLow(x, ys - CHEAT_LINE.top), cheatBot: vLow(x, ys - CHEAT_LINE.bottom), pinBot: vLow(x, ys - CHEAT_LINE.pin) });
  }
  const band = (top: (c: typeof cols[0]) => number, bot: (c: typeof cols[0]) => number, color: string, side: 1 | -1) => {
    const V = (v: number) => (side > 0 ? v : 1 - v) * h;
    actx.beginPath();
    actx.moveTo(cols[0].px, V(top(cols[0])));
    for (const c of cols) actx.lineTo(c.px, V(top(c)));
    for (let i = cols.length - 1; i >= 0; i--) actx.lineTo(cols[i].px, V(bot(cols[i])));
    actx.closePath();
    actx.fillStyle = color;
    actx.fill();
  };
  // yellow lower body: from the starboard pinstripe around the belly to the port pinstripe
  band((c) => c.pinBot, (c) => 1 - c.pinBot, LIVERY.lower, 1);
  for (const side of [1, -1] as (1 | -1)[]) {
    band((c) => c.cheatTop, (c) => c.cheatBot, LIVERY.cheat, side);
    band((c) => c.cheatBot, (c) => c.pinBot, LIVERY.pin, side);
  }
  // the cheat band and pinstripe are vinyl decals: their edges stand a film's thickness proud of the paint (a
  // hairline ridge in the height map, so the edge catches a highlight above and a shadow below the clear coat)
  const edgeRidge = (v: (c: typeof cols[0]) => number, side: 1 | -1) => {
    const V = (x: number) => (side > 0 ? x : 1 - x) * h;
    hctx.strokeStyle = '#a8a8a8'; hctx.lineWidth = 2.0;
    hctx.beginPath(); hctx.moveTo(cols[0].px, V(v(cols[0]))); for (const c of cols) hctx.lineTo(c.px, V(v(c))); hctx.stroke();
    actx.strokeStyle = 'rgba(0,0,0,0.16)'; actx.lineWidth = 1.2;
    actx.beginPath(); actx.moveTo(cols[0].px, V(v(cols[0])) + (side > 0 ? 1.5 : -1.5)); for (const c of cols) actx.lineTo(c.px, V(v(c)) + (side > 0 ? 1.5 : -1.5)); actx.stroke();
  };
  for (const side of [1, -1] as (1 | -1)[]) { edgeRidge((c) => c.cheatTop, side); edgeRidge((c) => c.cheatBot, side); edgeRidge((c) => c.pinBot, side); }
  // anti-glare panel on the cowl top ahead of the windshield (straddles the v = 0/1 seam: one strip per side)
  const glare: [number, number][] = [];
  for (let x = 2.32; x <= 3.7; x += 0.1) glare.push([lay.uOf(x) * w, lay.topV(x, x > 3.4 ? 0.45 - (x - 3.4) * 0.9 : 0.45) * h]);
  actx.fillStyle = '#2a2d31';
  for (const side of [1, -1]) {
    const edge = side > 0 ? 0 : h;
    actx.beginPath();
    actx.moveTo(glare[0][0], edge);
    for (const [px, py] of glare) actx.lineTo(px, side > 0 ? py : h - py);
    actx.lineTo(glare[glare.length - 1][0], edge);
    actx.closePath();
    actx.fill();
  }
  // engine cowl ring: dark charcoal nose with a polished lip
  const ringU = lay.uOf(4.22) * w;
  actx.fillStyle = '#2e3136'; actx.fillRect(0, 0, ringU, h);
  actx.fillStyle = '#9aa0a6'; actx.fillRect(ringU - 6, 0, 6, h);
  actx.fillStyle = '#1b1d20';
  for (let i = 0; i < 12; i++) actx.fillRect(ringU * 0.45, (i / 12) * h + 6, ringU * 0.15, h / 12 - 12);
  // registration on the white rear fuselage above the cheat line (clear of the float struts from the quarter views)
  // and the operator script under the cabin windows (both sides, readable)
  bodyText(actx, lay, w, h, LIVERY.registration, -3.05, 0.47, 0.18, 'bold', '"Helvetica Neue", Arial, sans-serif', LIVERY.cheat);
  bodyText(actx, lay, w, h, 'BAHÍA VISTA AIR TAXI', -0.25, 0.10, 0.085, 'bold italic', 'Georgia, "Times New Roman", serif', LIVERY.cheat);
  bodyText(hctx, lay, w, h, LIVERY.registration, -3.05, 0.47, 0.18, 'bold', '"Helvetica Neue", Arial, sans-serif', '#9a9a9a');
  bodyText(hctx, lay, w, h, 'BAHÍA VISTA AIR TAXI', -0.25, 0.10, 0.085, 'bold italic', 'Georgia, "Times New Roman", serif', '#9a9a9a');
  // panel lines / rivets
  const stations = [3.9, 3.2, 2.32, 1.85, 0.0, -0.9, -1.6, -2.6, -3.7, -4.7].map((x) => lay.uOf(x));
  panels(hctx, actx, w, h, stations, [0.12, 0.2, 0.3, 0.42, 0.5, 0.58, 0.7, 0.8, 0.88], 26);
  // door outline under the door window (both sides) with a handle
  hctx.strokeStyle = '#3a3a3a'; hctx.lineWidth = 3;
  actx.strokeStyle = 'rgba(20,20,25,0.35)'; actx.lineWidth = 2;
  const du0 = lay.uOf(1.77) * w, du1 = lay.uOf(0.95) * w;
  for (const side of [1, -1]) {
    const v0 = lay.vOf(1.3, 0.40) ?? 0.2, v1 = lay.vOf(1.3, -0.42) ?? 0.4;
    const y0 = (side > 0 ? v0 : 1 - v0) * h, y1 = (side > 0 ? v1 : 1 - v1) * h;
    const top = Math.min(y0, y1), hh = Math.abs(y1 - y0);
    hctx.strokeRect(du0, top, du1 - du0, hh);
    actx.strokeRect(du0, top, du1 - du0, hh);
    const hv = lay.vOf(1.0, 0.05) ?? 0.25;
    actx.fillStyle = '#8a8f94'; actx.fillRect(du1 - 40, (side > 0 ? hv : 1 - hv) * h - 4, 22, 8);
  }
  // exhaust staining: a streak trailing aft from the exhaust stubs (starboard side, low), darkest at the stubs and
  // widening as it fades; the roughness map gets the same streak (soot is matte)
  const stubU = lay.uOf(2.75), stubV = vLow(2.75, -0.5), sootEndU = lay.uOf(-0.9);
  const sootStreak = (ctx: CanvasRenderingContext2D, rgb: string, a0: number) => {
    const soot = ctx.createLinearGradient(stubU * w, 0, sootEndU * w, 0);
    soot.addColorStop(0, `rgba(${rgb},${a0})`); soot.addColorStop(0.3, `rgba(${rgb},${a0 * 0.5})`); soot.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = soot;
    ctx.beginPath();
    ctx.moveTo(stubU * w, (stubV - 0.022) * h); ctx.lineTo(sootEndU * w, (stubV - 0.065) * h);
    ctx.lineTo(sootEndU * w, (stubV + 0.065) * h); ctx.lineTo(stubU * w, (stubV + 0.022) * h);
    ctx.closePath(); ctx.fill();
  };
  sootStreak(actx, '25,22,20', 0.72);
  // soot has a ragged, streaky texture: darker filaments inside the plume
  for (let i = 0; i < 40; i++) {
    const x0 = (stubU + rng.range(0, 0.02)) * w, y0 = (stubV + rng.range(-0.02, 0.02)) * h, len = rng.range(60, 400);
    const sg = actx.createLinearGradient(x0, 0, x0 + len, 0);
    sg.addColorStop(0, `rgba(20,18,16,${rng.range(0.15, 0.4)})`); sg.addColorStop(1, 'rgba(20,18,16,0)');
    actx.fillStyle = sg; actx.fillRect(x0, y0, len, rng.range(1, 3));
  }
  // oil streaks under the cowl (belly, v 0.5) trailing aft from the cowl seams and the cowl flap hinges
  for (let i = 0; i < 30; i++) {
    const x0 = lay.uOf(rng.range(2.9, 4.0)) * w, y0 = (0.5 + rng.range(-0.08, 0.08)) * h, len = rng.range(50, 220);
    const og = actx.createLinearGradient(x0, 0, x0 + len, 0);
    og.addColorStop(0, `rgba(35,30,22,${rng.range(0.2, 0.45)})`); og.addColorStop(1, 'rgba(35,30,22,0)');
    actx.fillStyle = og; actx.fillRect(x0, y0 - rng.range(1, 2), len, rng.range(2, 5));
  }
  // general grime and faint belly streaks along the airflow
  grime(actx, rng, w, h, 140, 0.08);
  for (let i = 0; i < 60; i++) {
    const x = rng.range(w * 0.1, w * 0.9), y = rng.range(h * 0.42, h * 0.58);
    actx.strokeStyle = `rgba(40,35,30,${rng.range(0.05, 0.2)})`;
    actx.lineWidth = rng.range(1, 3);
    actx.beginPath(); actx.moveTo(x, y); actx.lineTo(x + rng.range(30, 160), y + rng.range(-3, 3)); actx.stroke();
  }
  // sun-faded top: slightly lighter/desaturated
  actx.fillStyle = 'rgba(255,255,255,0.05)'; actx.fillRect(0, 0, w, h * 0.12); actx.fillRect(0, h * 0.88, w, h * 0.12);
  // roughness: clearcoat paint ~0.35, cowl 0.5, soot/grime rougher, scratches
  rctx.fillStyle = '#6e6e6e'; rctx.fillRect(0, 0, w, h);
  rctx.fillStyle = '#7a7a7a'; rctx.fillRect(0, 0, ringU, h);
  sootStreak(rctx, '170,170,170', 0.7);
  grime(rctx, rng, w, h, 160, 0.25, '150,150,150');
  for (let i = 0; i < 400; i++) {
    rctx.strokeStyle = `rgba(120,120,120,${rng.range(0.2, 0.5)})`;
    rctx.lineWidth = 1;
    const x = rng.range(0, w), y = rng.range(0, h);
    rctx.beginPath(); rctx.moveTo(x, y); rctx.lineTo(x + rng.range(-40, 40), y + rng.range(-6, 6)); rctx.stroke();
  }
  // clearcoat roughness (green channel): the engine cowl is polished a little glossier than the cabin/tail paint,
  // the matte anti-glare panel has no gloss to speak of and the soot streak dulls the coat
  const [cc, cctx] = canvas(w / 4, h / 4);
  cctx.scale(0.25, 0.25);
  cctx.fillStyle = 'rgb(0,34,0)'; cctx.fillRect(0, 0, w, h);
  cctx.fillStyle = 'rgb(0,16,0)'; cctx.fillRect(0, 0, lay.uOf(3.15) * w, h);
  cctx.fillStyle = 'rgb(0,120,0)';
  for (const side of [1, -1]) {
    const edge = side > 0 ? 0 : h;
    cctx.beginPath();
    cctx.moveTo(glare[0][0], edge);
    for (const [px, py] of glare) cctx.lineTo(px, side > 0 ? py : h - py);
    cctx.lineTo(glare[glare.length - 1][0], edge);
    cctx.closePath();
    cctx.fill();
  }
  sootStreak(cctx, '0,110,0', 0.8);
  return { map: toTexture(ac, true), roughnessMap: toTexture(rc, false), normalMap: toTexture(heightToNormal(hc, 2.4), false), clearcoatRoughnessMap: toTexture(cc, false), clearcoatNormalMap: orangePeelNormal(rng, 64, 32) };
}

/**
 * Tileable orange-peel normal for a sprayed clear coat: soft dimples a millimetre or two across that make the
 * mirror image in the coat wobble slightly. Repeated `ru` x `rv` times over the surface it belongs to.
 */
function orangePeelNormal(rng: Rng, ru: number, rv: number): THREE.CanvasTexture {
  const S = 256;
  const [pc, pctx] = canvas(S, S);
  pctx.fillStyle = '#808080'; pctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 1800; i++) {
    const x = rng.range(0, S), y = rng.range(0, S), r = rng.range(3, 9);
    const g = pctx.createRadialGradient(x, y, 0, x, y, r);
    const up = rng.next() < 0.5;
    g.addColorStop(0, up ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.16)'); g.addColorStop(1, up ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)');
    pctx.fillStyle = g;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) pctx.fillRect(x - r + ox, y - r + oy, r * 2, r * 2);
  }
  const t = toTexture(heightToNormal(pc, 1.2), false, 4);
  t.repeat.set(ru, rv);
  return t;
}

/** Where the cabin lining changes: everything in body metres, converted through the fuselage layout. */
export interface CabinLayout {
  /** firewall / rear bulkhead stations */
  front: number;
  rear: number;
  /** window sill, side-window top, cabin floor heights */
  sill: number;
  winTop: number;
  floor: number;
  /** door skin: front / aft station and bottom height (top is the sill) */
  door: { x0: number; x1: number; yBot: number };
  /** headliner cross seams (window pillar stations) */
  bows: number[];
}

/**
 * Cabin lining, laid out like the fuselage paint (same u/v, the inner shell is the outer loft inset): perforated
 * vinyl headliner with stitched longitudinal seams and cross seams at the bows, darker toward the crest (the
 * light comes in through the windows below it), dark window-band trim with a lighter sill ledge, vinyl sidewall
 * panels with a woven fabric insert and a kick strip at the floor, and the door panel with its stitched border
 * and map pocket. The normal map is a separate tileable vinyl grain (the material tiles it by `repeat`), so the
 * grain stays fine at the 10 cm the headliner is from the pilot's eye while the seams live in the albedo.
 */
export function cabinMaps(lay: FuselageLayout, cab: CabinLayout): PbrMaps {
  const w = 2048, h = 1024;
  const rng = new Rng('cabin-lining');
  const [ac, actx] = canvas(w, h);
  const [rc, rctx] = canvas(w / 2, h / 2);
  rctx.scale(0.5, 0.5);
  const U = (x: number) => lay.uOf(x) * w;
  const V = (v: number, side: 1 | -1) => (side > 0 ? v : 1 - v) * h;
  const vAt = (x: number, y: number) => lay.vOf(x, y) ?? 0.5;
  // dark trim everywhere the lining does not reach (window reveals sample the corner texel, the bulkheads the ends)
  actx.fillStyle = '#2b2d31'; actx.fillRect(0, 0, w, h);
  rctx.fillStyle = '#8c8c8c'; rctx.fillRect(0, 0, w, h);
  /** fill between the v-curves of heights y0 > y1 over stations x0 > x1 (both sides) */
  const band = (ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, style: string) => {
    for (const side of [1, -1] as (1 | -1)[]) {
      ctx.beginPath();
      const n = 24;
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * (i / n); const p = [U(x), V(vAt(x, y0), side)]; i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
      for (let i = n; i >= 0; i--) { const x = x0 + (x1 - x0) * (i / n); ctx.lineTo(U(x), V(vAt(x, y1), side)); }
      ctx.closePath();
      ctx.fillStyle = style; ctx.fill();
    }
  };
  const { front, rear, sill, winTop, floor } = cab;
  const FL = front + 0.02, RR = rear - 0.02;
  // ---- headliner: from the crest down to the window tops, per column so the gradient follows the roof
  for (let px = Math.floor(U(FL)); px <= U(RR); px += 4) {
    const x = lay.xOf(px / w), vTop = vAt(x, winTop);
    for (const side of [1, -1] as (1 | -1)[]) {
      const g = actx.createLinearGradient(0, V(0, side), 0, V(vTop, side));
      g.addColorStop(0, '#a7a39a'); g.addColorStop(0.45, '#bdb9b0'); g.addColorStop(1, '#cbc7be');
      actx.fillStyle = g; actx.fillRect(px, Math.min(V(0, side), V(vTop, side)), 4, Math.abs(V(vTop, side) - V(0, side)));
    }
  }
  // perforation: a fine stagger of darker dots (reads as texture from the seat, not as a grid)
  const vTopMid = vAt(0.5, winTop);
  for (let y = 0; y < vTopMid * h; y += 3) {
    for (let x = U(FL) + ((y / 3) % 2) * 1.5; x < U(RR); x += 3) {
      actx.fillStyle = `rgba(60,55,50,${0.07 + rng.next() * 0.06})`;
      actx.fillRect(x, y, 1, 1); actx.fillRect(x, h - y - 1, 1, 1);
    }
  }
  // stitched longitudinal seams at the crest and either side of it, following the roof's v at those half-widths
  const seam = (ctx: CanvasRenderingContext2D, pts: [number, number][], dark: string, light: string, stitch = true) => {
    ctx.lineWidth = 2.2; ctx.strokeStyle = dark; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = light; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 2) : ctx.moveTo(x, y + 2))); ctx.stroke();
    if (!stitch) return;
    ctx.fillStyle = 'rgba(245,242,235,0.55)';
    for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; for (let f = 0; f < 1; f += 0.25) ctx.fillRect(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f - 4, 2.5, 1); }
  };
  for (const z of [0, 0.30, 0.56]) {
    for (const side of [1, -1] as (1 | -1)[]) {
      if (z === 0 && side < 0) continue;
      const pts: [number, number][] = [];
      for (let x = FL; x >= RR; x -= 0.04) pts.push([U(x), V(z === 0 ? 0.001 : lay.topV(x, z), side)]);
      seam(actx, pts, 'rgba(70,64,58,0.7)', 'rgba(255,252,246,0.35)');
    }
  }
  // cross seams / bows at the pillars
  for (const x of cab.bows) {
    for (const side of [1, -1] as (1 | -1)[]) {
      const vT = vAt(x, winTop);
      seam(actx, [[U(x), V(0, side)], [U(x), V(vT, side)]], 'rgba(70,64,58,0.8)', 'rgba(255,252,246,0.3)', false);
    }
  }
  // ---- window band: dark vinyl trim (the pillars) with a pale ledge along the sill
  band(actx, FL, RR, winTop, sill - 0.005, '#34373c');
  band(actx, FL, RR, sill + 0.035, sill - 0.005, '#6a6e74');
  band(actx, FL, RR, sill + 0.008, sill - 0.005, '#4a4d52');
  band(rctx, FL, RR, winTop, sill, '#909090');
  // ---- sidewall panels: upper vinyl, woven insert, lower vinyl, kick strip; darker toward the floor
  band(actx, FL, RR, sill, floor - 0.05, '#8f8a81');
  band(actx, FL, RR, 0.16, -0.12, '#5e5b55');
  band(actx, FL, RR, floor + 0.12, floor - 0.05, '#2f3135');
  band(rctx, FL, RR, sill, floor, '#7a7a7a');
  band(rctx, FL, RR, 0.16, -0.12, '#dcdcdc');
  band(rctx, FL, RR, floor + 0.12, floor - 0.05, '#a0a0a0');
  // woven insert: two-direction fine hatch
  { const v0 = vAt(0.5, 0.16), v1 = vAt(0.5, -0.12);
    for (const side of [1, -1] as (1 | -1)[]) {
      const ya = Math.min(V(v0, side), V(v1, side)), yb = Math.max(V(v0, side), V(v1, side));
      for (let y = ya; y < yb; y += 3) for (let x = U(FL); x < U(RR); x += 3) {
        actx.fillStyle = ((Math.floor(x / 3) + Math.floor(y / 3)) & 1) ? 'rgba(255,250,240,0.10)' : 'rgba(20,18,15,0.16)';
        actx.fillRect(x, y, 3, 1.5);
      }
    }
  }
  // floor shadow (AO) up the sidewall and under the seats
  for (const side of [1, -1] as (1 | -1)[]) {
    const v0 = vAt(0.5, floor + 0.35), v1 = vAt(0.5, floor - 0.05);
    const g = actx.createLinearGradient(0, V(v0, side), 0, V(v1, side));
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)');
    actx.fillStyle = g; actx.fillRect(U(FL), Math.min(V(v0, side), V(v1, side)), U(RR) - U(FL), Math.abs(V(v1, side) - V(v0, side)));
  }
  // ---- door panel: its own vinyl shade, a stitched border 2 cm in, an armrest shadow and a map pocket
  { const d = cab.door;
    band(actx, d.x0, d.x1, sill - 0.002, d.yBot, '#9c968c');
    band(rctx, d.x0, d.x1, sill, d.yBot, '#707070');
    for (const side of [1, -1] as (1 | -1)[]) {
      const rect = (x0: number, x1: number, y0: number, y1: number): [number, number][] => [[U(x0), V(vAt(x0, y0), side)], [U(x1), V(vAt(x1, y0), side)], [U(x1), V(vAt(x1, y1), side)], [U(x0), V(vAt(x0, y1), side)], [U(x0), V(vAt(x0, y0), side)]];
      seam(actx, rect(d.x0 - 0.03, d.x1 + 0.03, sill - 0.03, d.yBot + 0.03), 'rgba(60,55,50,0.75)', 'rgba(255,252,246,0.3)');
      // map pocket: a slab with its own top edge highlight and a shadow beneath
      const pk = rect(d.x0 - 0.12, d.x1 + 0.12, -0.02, d.yBot + 0.10);
      actx.beginPath(); pk.forEach(([x, y], i) => (i ? actx.lineTo(x, y) : actx.moveTo(x, y))); actx.closePath();
      actx.fillStyle = '#7d7870'; actx.fill();
      seam(actx, pk, 'rgba(40,36,32,0.8)', 'rgba(255,252,246,0.4)');
      // armrest shadow band
      const ar = rect(d.x0 - 0.10, d.x1 + 0.12, 0.20, 0.13);
      actx.beginPath(); ar.forEach(([x, y], i) => (i ? actx.lineTo(x, y) : actx.moveTo(x, y))); actx.closePath();
      actx.fillStyle = 'rgba(0,0,0,0.28)'; actx.fill();
    }
  }
  // scuffs and grime: heel marks on the kick strips, hand grime around the door
  grime(actx, rng, w, h, 60, 0.07, '30,26,22');
  for (let i = 0; i < 50; i++) {
    const side = rng.next() < 0.5 ? 1 : -1, x = rng.range(U(front), U(rear)), y = V(vAt(0.5, floor + rng.range(0.0, 0.14)), side as 1 | -1);
    actx.strokeStyle = `rgba(20,18,16,${rng.range(0.1, 0.35)})`; actx.lineWidth = rng.range(0.6, 1.8);
    actx.beginPath(); actx.moveTo(x, y); actx.lineTo(x + rng.range(-14, 14), y + rng.range(-3, 3)); actx.stroke();
  }
  // ---- tileable vinyl grain (height -> normal); the material repeats it many times over the lining
  const S = 256;
  const [gc, gctx] = canvas(S, S);
  gctx.fillStyle = '#808080'; gctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const x = rng.range(0, S), y = rng.range(0, S), r = rng.range(1.5, 5);
    const g = gctx.createRadialGradient(x, y, 0, x, y, r);
    const up = rng.next() < 0.5;
    g.addColorStop(0, up ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'); g.addColorStop(1, up ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)');
    gctx.fillStyle = g;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) gctx.fillRect(x - r + ox, y - r + oy, r * 2, r * 2);
  }
  // leather-like crease network between the grain bumps (short dark strokes, wrapped so the tile stays seamless)
  gctx.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const x = rng.range(0, S), y = rng.range(0, S), a = rng.range(0, Math.PI * 2), l = rng.range(3, 11);
    gctx.strokeStyle = `rgba(0,0,0,${rng.range(0.12, 0.3)})`; gctx.lineWidth = rng.range(0.7, 1.4);
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      gctx.beginPath(); gctx.moveTo(x + ox, y + oy); gctx.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); gctx.stroke();
    }
  }
  const normal = toTexture(heightToNormal(gc, 2.0), false, 4);
  normal.repeat.set(28, 14);
  return { map: toTexture(ac, true), roughnessMap: toTexture(rc, false, 4), normalMap: normal };
}

/**
 * Layout of the shared wing / tail paint: the wing occupies texture rows v 0 .. WING_V1 (root .. tip), the tail
 * surfaces the band TAIL_V0 .. 1 at the same metres-per-texel spanwise scale as the wing (TAIL_SPAN metres of
 * span in the band, the tip at v = 1) so their rib lines and rivets come out at the wing's density instead of
 * being squeezed into a tile grid.
 */
export const WING_TEX = { WING_V1: 0.78, TAIL_V0: 0.80, TAIL_SPAN: 2.55 } as const;
/** texture v of span station z on the wing (root 0 .. tip = span) */
export const wingV = (z: number, span: number): number => Math.min(1, Math.max(0, z / span)) * WING_TEX.WING_V1;
/** texture v of span station z on a tail surface whose tip (z = span) lands at the band's tip end */
export const tailV = (z: number, span: number): number => 0.997 - (0.997 - WING_TEX.TAIL_V0) * Math.min(1, Math.max(0, (span - z) / WING_TEX.TAIL_SPAN));

/** Wing (both halves) and tail: u chordwise (0 trailing edge -> 0.5 leading edge -> 1 trailing), v spanwise. */
export function wingMaps(): PbrMaps {
  const w = 1024, h = 1024;
  const rng = new Rng('wing-paint');
  const [ac, actx] = canvas(w, h);
  const [hc, hctx] = canvas(w, h);
  const [rc, rctx] = canvas(w, h);
  const W1 = WING_TEX.WING_V1, T0 = WING_TEX.TAIL_V0;
  const wy = (v: number) => v * W1 * h;      // wing-relative v (0 root .. 1 tip) -> canvas row
  const ty = (m: number) => (1 - (1 - T0) * (1 - m / WING_TEX.TAIL_SPAN)) * h; // tail: metres from the root end of the band
  hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, w, h);
  // white upper surface (u < 0.5), cream underside (u > 0.5) so the wing reads as a thin flat panel from below
  actx.fillStyle = LIVERY.upper; actx.fillRect(0, 0, w, h);
  actx.fillStyle = LIVERY.under; actx.fillRect(w * 0.5, 0, w * 0.5, wy(1));
  // yellow wingtip with a navy band and red pinstripe, yellow leading-edge stripe
  actx.fillStyle = LIVERY.lower; actx.fillRect(0, wy(0.905), w, wy(1) - wy(0.905));
  actx.fillStyle = LIVERY.cheat; actx.fillRect(0, wy(0.885), w, wy(0.905) - wy(0.885));
  actx.fillStyle = LIVERY.pin; actx.fillRect(0, wy(0.876), w, wy(0.885) - wy(0.876));
  // leading-edge stripe: 5% chord over the top, 1.5% under (u 0.5 is the leading edge), so the wing keeps a thin
  // yellow edge instead of a yellow nose when seen from below
  actx.fillStyle = LIVERY.lower; actx.fillRect(w * 0.475, 0, w * 0.0325, h);
  // rib lines spanwise every ~0.55 m, spar and hinge lines chordwise
  const ribs: number[] = [];
  for (let v = 0.04; v < 0.87; v += 0.075) ribs.push(v * W1);
  panels(hctx, actx, w, h, [0.14, 0.33, 0.5, 0.67, 0.86], ribs, 22, { y1: wy(1) });
  // walkway by the root and a fuel cap on the upper surface
  actx.fillStyle = '#2a2d31'; actx.fillRect(w * 0.30, wy(0.12), w * 0.11, wy(0.20) - wy(0.12));
  actx.fillStyle = '#6d7277'; actx.beginPath(); actx.arc(w * 0.40, wy(0.27), 9, 0, 7); actx.fill();
  // ---- underside (u > 0.5): the side the pilot and the dock see. Extra rivet rows along the ribs, screwed
  // inspection panels, the fuel drains with their stain trails, the strut fittings' doubler plates, a fuel
  // vent, and airflow-aligned grime streaks running from the leading edge aft
  { const ux = (f: number) => w * (0.5 + 0.5 * f); // f: chord fraction from the leading edge (0) to the trailing edge (1)
    // denser rivet rows along every rib on the underside (the stringersV rows above are shared with the top)
    for (const rv of ribs) {
      const y = rv * h;
      for (let x = ux(0.03); x < ux(0.98); x += 11) {
        hctx.fillStyle = '#b4b4b4'; hctx.beginPath(); hctx.arc(x, y - 5, 1.4, 0, 7); hctx.fill();
        actx.fillStyle = 'rgba(0,0,0,0.09)'; actx.beginPath(); actx.arc(x, y - 4, 1.1, 0, 7); actx.fill();
      }
    }
    // inspection panels: 9 cm rounded plates with four screws, staggered along the spar lines
    const plate = (x: number, y: number, pw: number, ph: number) => {
      actx.fillStyle = 'rgba(0,0,0,0.10)'; actx.beginPath(); actx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 3); actx.fill();
      actx.strokeStyle = 'rgba(30,30,35,0.4)'; actx.lineWidth = 1.2; actx.beginPath(); actx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 3); actx.stroke();
      hctx.strokeStyle = '#6a6a6a'; hctx.lineWidth = 1.6; hctx.beginPath(); hctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 3); hctx.stroke();
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const px = x + sx * (pw / 2 - 4), py = y + sy * (ph / 2 - 4);
        hctx.fillStyle = '#5a5a5a'; hctx.beginPath(); hctx.arc(px, py, 1.8, 0, 7); hctx.fill();
        actx.fillStyle = 'rgba(0,0,0,0.35)'; actx.beginPath(); actx.arc(px, py, 1.5, 0, 7); actx.fill();
      }
    };
    for (const [f, v, pw, ph] of [[0.42, 0.10, 20, 16], [0.75, 0.16, 16, 16], [0.42, 0.26, 20, 16], [0.75, 0.34, 16, 16], [0.42, 0.43, 20, 16], [0.75, 0.52, 16, 16], [0.42, 0.61, 20, 16], [0.75, 0.70, 16, 16], [0.42, 0.79, 20, 16]]) plate(ux(f), wy(v), pw, ph);
    // strut fitting doublers at the spar / strut stations (model.ts strutZ 2.9 m of the 7.3 m span)
    for (const f of [0.30, 0.66]) plate(ux(f), wy(2.9 / 7.3), 30, 22);
    // fuel drains: a dark boss with a pale stain trail blown aft by the slipstream; fuel vent tube by the tank
    for (const [f, v] of [[0.36, 0.14], [0.36, 0.30]]) {
      const x = ux(f), y = wy(v);
      const g = actx.createLinearGradient(x, 0, ux(f + 0.45), 0);
      g.addColorStop(0, 'rgba(120,105,70,0.30)'); g.addColorStop(0.3, 'rgba(120,105,70,0.14)'); g.addColorStop(1, 'rgba(120,105,70,0)');
      actx.fillStyle = g; actx.beginPath(); actx.moveTo(x, y - 3); actx.lineTo(ux(f + 0.45), y - 9); actx.lineTo(ux(f + 0.45), y + 9); actx.lineTo(x, y + 3); actx.closePath(); actx.fill();
      actx.fillStyle = '#3b3d40'; actx.beginPath(); actx.arc(x, y, 3.2, 0, 7); actx.fill();
      hctx.fillStyle = '#404040'; hctx.beginPath(); hctx.arc(x, y, 3.5, 0, 7); hctx.fill();
    }
    actx.fillStyle = '#4a4d50'; actx.fillRect(ux(0.55) - 2, wy(0.22) - 7, 4, 14);
    // grime streaks along the airflow (from the leading edge aft), heavier toward the root and behind the fittings
    for (let i = 0; i < 70; i++) {
      const v = rng.range(0.02, 0.86), f0 = rng.range(0.05, 0.6), len = rng.range(0.1, 0.4);
      const g = actx.createLinearGradient(ux(f0), 0, ux(f0 + len), 0);
      const a = rng.range(0.04, 0.12) * (1.4 - v);
      g.addColorStop(0, `rgba(70,65,60,${a})`); g.addColorStop(1, 'rgba(70,65,60,0)');
      actx.fillStyle = g; actx.fillRect(ux(f0), wy(v), ux(f0 + len) - ux(f0), rng.range(1, 3));
    }
  }
  // ---- tail band: one colour both sides, yellow tip cap with the navy / red bands, ribs every 0.55 m at half the
  // wing's line strength (the fin is seen close up from the rear quarter: crisp tiles read as a grid)
  const tipM = WING_TEX.TAIL_SPAN - 0.26, cheatM = tipM - 0.05, pinM = cheatM - 0.025;
  actx.fillStyle = LIVERY.lower; actx.fillRect(0, ty(tipM), w, h - ty(tipM));
  actx.fillStyle = LIVERY.cheat; actx.fillRect(0, ty(cheatM), w, ty(tipM) - ty(cheatM));
  actx.fillStyle = LIVERY.pin; actx.fillRect(0, ty(pinM), w, ty(cheatM) - ty(pinM));
  const tailRibs: number[] = [];
  for (let m = 0.12; m < pinM - 0.1; m += 0.55) tailRibs.push(ty(m) / h);
  panels(hctx, actx, w, h, [0.3, 0.7], tailRibs, 36, { y0: T0 * h, strength: 0.5 });
  // leading-edge chipping and general grime
  for (let i = 0; i < 90; i++) {
    actx.fillStyle = `rgba(90,90,95,${rng.range(0.3, 0.7)})`;
    actx.fillRect(w * 0.5 + rng.range(-8, 8), rng.range(0, h), rng.range(1, 3), rng.range(1, 4));
  }
  grime(actx, rng, w, h, 80, 0.06);
  rctx.fillStyle = '#5a5a5a'; rctx.fillRect(0, 0, w, h);
  rctx.fillStyle = '#909090'; rctx.fillRect(w * 0.30, wy(0.12), w * 0.11, wy(0.20) - wy(0.12));
  // the underside is a touch duller than the top coat
  rctx.fillStyle = 'rgba(255,255,255,0.10)'; rctx.fillRect(w * 0.5, 0, w * 0.5, wy(1));
  grime(rctx, rng, w, h, 90, 0.2, '150,150,150');
  return { map: toTexture(ac, true), roughnessMap: toTexture(rc, false), normalMap: toTexture(heightToNormal(hc, 2.0), false), clearcoatNormalMap: orangePeelNormal(rng, 24, 48) };
}

/**
 * Floats: u bow..stern, v around the hull as laid out by `floatHull` (deck 0-0.12, side 0.12-0.22, chine 0.22,
 * keel 0.5, port mirrored). Aluminium with a dark anti-slip deck, a navy boot-top along the chine (the resting
 * waterline runs just under it), a darker wet / stained band either side of the waterline and a yellow keel.
 */
export function floatMaps(): PbrMaps {
  const w = 1024, h = 512;
  const rng = new Rng('float-paint');
  const [ac, actx] = canvas(w, h);
  const [hc, hctx] = canvas(w, h);
  const [rc, rctx] = canvas(w, h);
  hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, w, h);
  actx.fillStyle = '#cfd3d6'; actx.fillRect(0, 0, w, h);
  const CHINE = 0.22;
  /** fill a v band on both sides of the hull */
  const band = (ctx: CanvasRenderingContext2D, v0: number, v1: number, style: string | CanvasGradient) => {
    ctx.fillStyle = style;
    ctx.fillRect(0, v0 * h, w, (v1 - v0) * h);
    ctx.fillRect(0, (1 - v1) * h, w, (v1 - v0) * h);
  };
  // bottom: slightly darker grey than the sides, yellow keel band
  band(actx, CHINE, 0.5, '#b9bec2');
  band(actx, 0.445, 0.5, LIVERY.lower);
  // deck: a dark anti-slip walkway down the middle on bare aluminium, lighter rolled edge
  band(actx, 0, 0.105, '#c3c7ca');
  band(actx, 0, 0.066, '#2b2e31');
  band(actx, 0.105, 0.118, '#9aa0a5');
  // wet band: dull stained aluminium from the scum line (~4 cm above the chine) down over the chine, with a
  // sharp dark upper edge so the hull reads as sitting in the water rather than on it
  for (const side of [1, -1]) {
    const V = (v: number) => (side > 0 ? v : 1 - v) * h;
    const g = actx.createLinearGradient(0, V(0.165), 0, V(0.31));
    g.addColorStop(0, 'rgba(60,72,70,0)'); g.addColorStop(0.08, 'rgba(60,72,70,0.55)'); g.addColorStop(0.35, 'rgba(70,84,80,0.42)'); g.addColorStop(1, 'rgba(70,84,80,0)');
    actx.fillStyle = g;
    actx.fillRect(0, Math.min(V(0.165), V(0.31)), w, Math.abs(V(0.31) - V(0.165)));
  }
  // navy boot-top along the chine
  band(actx, CHINE - 0.012, CHINE + 0.012, LIVERY.cheat);
  // frames every ~0.6 m along the hull, deck-edge and chine seams, keel strip; rivets at ~6 cm pitch
  panels(hctx, actx, w, h, [0.1, 0.2, 0.3, 0.4, 0.5, 0.58, 0.66, 0.76, 0.86, 0.94], [0.118, 0.5], 24, { strength: 0.8 });
  hctx.strokeStyle = '#4a4a4a'; hctx.lineWidth = 2.5;
  for (const v of [CHINE, 1 - CHINE]) { hctx.beginPath(); hctx.moveTo(0, v * h); hctx.lineTo(w, v * h); hctx.stroke(); }
  // algae streaks and drips hanging from the scum line, scuffs on the deck
  for (let i = 0; i < 140; i++) {
    const side = rng.next() < 0.5 ? 1 : -1;
    const V = (v: number) => (side > 0 ? v : 1 - v) * h;
    actx.strokeStyle = `rgba(62,80,72,${rng.range(0.08, 0.3)})`;
    actx.lineWidth = rng.range(1, 3);
    const x = rng.range(0, w), y0 = V(rng.range(0.17, 0.2)), len = rng.range(8, 40) * side;
    actx.beginPath(); actx.moveTo(x, y0); actx.lineTo(x + rng.range(-4, 4), y0 + len); actx.stroke();
  }
  grime(actx, rng, w, h, 90, 0.08, '60,60,55');
  // roughness: matte deck, dull wet band, otherwise semi-gloss aluminium
  rctx.fillStyle = '#7c7c7c'; rctx.fillRect(0, 0, w, h);
  band(rctx, 0, 0.118, '#9a9a9a');
  band(rctx, 0, 0.066, '#c8c8c8');
  band(rctx, 0.17, 0.30, '#a4a4a4');
  grime(rctx, rng, w, h, 100, 0.25, '160,160,160');
  // scuffs: dock rash along the sides at deck height and boot marks on the walkways (dull, slightly lighter metal)
  for (let i = 0; i < 260; i++) {
    const side = rng.next() < 0.5 ? 1 : -1, onDeck = rng.next() < 0.45;
    const v = onDeck ? rng.range(0.005, 0.06) : rng.range(0.10, 0.19), y = (side > 0 ? v : 1 - v) * h;
    const x = rng.range(0, w), len = rng.range(6, 40), a = rng.range(0.15, 0.45);
    rctx.strokeStyle = `rgba(200,200,200,${a})`; rctx.lineWidth = rng.range(0.8, 2.5);
    rctx.beginPath(); rctx.moveTo(x, y); rctx.lineTo(x + len, y + rng.range(-4, 4)); rctx.stroke();
    actx.strokeStyle = `rgba(${onDeck ? '120,118,112' : '225,228,230'},${a * 0.5})`; actx.lineWidth = rng.range(0.6, 1.6);
    actx.beginPath(); actx.moveTo(x, y); actx.lineTo(x + len, y + rng.range(-4, 4)); actx.stroke();
  }
  return { map: toTexture(ac, true), roughnessMap: toTexture(rc, false), normalMap: toTexture(heightToNormal(hc, 2.2), false) };
}

// ------------------------------------------------------------------ instrument panel

/**
 * Panel face atlas layout. The face plane is W x H metres (panel space: x to starboard, y up, origin at the
 * centre) painted at PPM px/m; below the face the atlas carries a strip of anti-glare grain for the glare shield
 * and a row of placards / the compass card face. Everything is in metres so the gauge geometry (needles, cards)
 * built in model.ts lands exactly on the painted dials.
 */
export const PANEL = { W: 1.30, H: 0.40, PPM: 1500, GRAIN: 120, PLACARDS: 90, OVERHEAD: 550 } as const;
const PANEL_PX = { w: Math.round(PANEL.W * PANEL.PPM), face: Math.round(PANEL.H * PANEL.PPM) };
const ATLAS_H = PANEL_PX.face + PANEL.GRAIN + PANEL.PLACARDS + PANEL.OVERHEAD;
/** overhead console face (metres; portrait: its top is the aft end, so the legends read upright from the seat) */
export const OVERHEAD = { w: 0.16, h: 0.36 } as const;

export interface GaugeDef { x: number; y: number; r: number; }
/** dial centres and aperture radii (panel metres); the pilot sits at x = -0.30 */
export const GAUGES = {
  asi: { x: -0.435, y: 0.112, r: 0.042 }, adi: { x: -0.335, y: 0.112, r: 0.042 }, alt: { x: -0.235, y: 0.112, r: 0.042 },
  tc: { x: -0.435, y: 0.012, r: 0.042 }, hdg: { x: -0.335, y: 0.012, r: 0.042 }, vsi: { x: -0.235, y: 0.012, r: 0.042 },
  clock: { x: -0.565, y: 0.125, r: 0.03 }, suction: { x: -0.565, y: 0.04, r: 0.026 },
  rpm: { x: 0.375, y: 0.118, r: 0.036 }, map: { x: 0.47, y: 0.118, r: 0.036 },
  oilp: { x: 0.34, y: 0.03, r: 0.024 }, oilt: { x: 0.405, y: 0.03, r: 0.024 }, fuell: { x: 0.47, y: 0.03, r: 0.024 }, fuelr: { x: 0.535, y: 0.03, r: 0.024 },
  egt: { x: 0.36, y: -0.04, r: 0.022 }, amp: { x: 0.42, y: -0.04, r: 0.022 }, cht: { x: 0.48, y: -0.04, r: 0.022 },
} satisfies Record<string, GaugeDef>;
/** GPS / MFD screen: centre and size (panel metres) */
export const GPS_SCREEN = { x: 0.085, y: 0.098, w: 0.20, h: 0.135 } as const;

function piecewise(v: number, pts: [number, number][]): number {
  if (v <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (v <= pts[i][0]) { const [a, fa] = pts[i - 1], [b, fb] = pts[i]; return fa + (fb - fa) * ((v - a) / (b - a)); }
  }
  return pts[pts.length - 1][1];
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Dial angles in degrees clockwise from 12 o'clock; shared by the painted scales and the live needles. */
export const DIAL = {
  /** airspeed: non-linear like a real ASI, 40 kt near 1 o'clock, 200 kt back at 11 o'clock */
  asi: (kt: number) => piecewise(kt, [[0, 0], [40, 30], [60, 72], [80, 117], [100, 162], [120, 207], [140, 250], [160, 287], [180, 318], [200, 342]]),
  alt100: (ft: number) => (((ft % 1000) + 1000) % 1000) * 0.36,
  alt1000: (ft: number) => (((ft % 10000) + 10000) % 10000) * 0.036,
  /** vertical speed: 0 at 9 o'clock, climb clockwise, compressed beyond 1000 fpm */
  vsi: (fpm: number) => 270 + Math.sign(fpm) * piecewise(Math.abs(fpm), [[0, 0], [500, 52], [1000, 92], [1500, 126], [2000, 158]]),
  rpm: (rpm: number) => -135 + clamp01(rpm / 3000) * 270,
  map: (inHg: number) => -135 + clamp01((inHg - 10) / 25) * 270,
  /** small 240-degree engine gauges take a 0..1 fraction */
  small: (f: number) => -120 + clamp01(f) * 240,
};

/** pixel coordinates of a panel-space point / length */
const PX = (x: number) => (x + PANEL.W / 2) * PANEL.PPM;
const PY = (y: number) => (PANEL.H / 2 - y) * PANEL.PPM;
const PR = (r: number) => r * PANEL.PPM;
const rad = (deg: number) => ((deg - 90) * Math.PI) / 180; // clockwise-from-12 -> canvas angle

/** atlas UV rectangle of a pixel rectangle (v flipped: the canvas is drawn top-down) */
export interface UvRect { u0: number; v0: number; u1: number; v1: number; }
const uvRect = (x0: number, y0: number, x1: number, y1: number): UvRect => ({ u0: x0 / PANEL_PX.w, v0: 1 - y1 / ATLAS_H, u1: x1 / PANEL_PX.w, v1: 1 - y0 / ATLAS_H });
const GRAIN_Y = PANEL_PX.face, PLACARD_Y = PANEL_PX.face + PANEL.GRAIN, OVERHEAD_Y = PLACARD_Y + PANEL.PLACARDS;
const OVERHEAD_PX = { w: Math.round(OVERHEAD.w * PANEL.PPM), h: Math.round(OVERHEAD.h * PANEL.PPM) };
/** atlas regions used by the cockpit geometry (face, glare shield grain, placards, compass card) */
export const PANEL_UV = {
  face: uvRect(0, 0, PANEL_PX.w, PANEL_PX.face),
  grain: uvRect(0, GRAIN_Y + 4, PANEL_PX.w, GRAIN_Y + PANEL.GRAIN - 4),
  exit: uvRect(4, PLACARD_Y + 6, 224, PLACARD_Y + 84),
  belts: uvRect(234, PLACARD_Y + 6, 494, PLACARD_Y + 84),
  compass: uvRect(504, PLACARD_Y + 6, 664, PLACARD_Y + 84),
  yoke: uvRect(674, PLACARD_Y + 6, 794, PLACARD_Y + 84),
  nameplate: uvRect(804, PLACARD_Y + 6, 1164, PLACARD_Y + 84),
  domeLens: uvRect(1174, PLACARD_Y + 6, 1254, PLACARD_Y + 84),
  overhead: uvRect(4, OVERHEAD_Y + 4, 4 + OVERHEAD_PX.w, OVERHEAD_Y + 4 + OVERHEAD_PX.h),
  /** sun visor face: tinted vinyl with a stitched edge */
  visor: uvRect(300, OVERHEAD_Y + 4, 750, OVERHEAD_Y + 4 + 210),
};

function bezel(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, screws = true): void {
  // recessed black face, machined bezel ring with a light top edge and a shadowed inner lip
  const ring = ctx.createLinearGradient(cx, cy - r * 1.18, cx, cy + r * 1.18);
  ring.addColorStop(0, '#6c7178'); ring.addColorStop(0.5, '#3a3e44'); ring.addColorStop(1, '#22252a');
  ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(cx, cy, r * 1.18, 0, 7); ctx.fill();
  ctx.fillStyle = '#0c0d10'; ctx.beginPath(); ctx.arc(cx, cy, r * 1.03, 0, 7); ctx.fill();
  const lip = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.03);
  lip.addColorStop(0, 'rgba(0,0,0,0)'); lip.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = lip; ctx.beginPath(); ctx.arc(cx, cy, r * 1.03, 0, 7); ctx.fill();
  ctx.fillStyle = '#07080a'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  if (screws) for (const a of [45, 135, 225, 315]) screw(ctx, cx + Math.cos(rad(a)) * r * 1.11, cy + Math.sin(rad(a)) * r * 1.11, r * 0.055);
}

function screw(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  g.addColorStop(0, '#c9ccd1'); g.addColorStop(1, '#5a5e64');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2a2c30'; ctx.lineWidth = Math.max(1, r * 0.3);
  ctx.beginPath(); ctx.moveTo(x - r * 0.7, y); ctx.lineTo(x + r * 0.7, y); ctx.moveTo(x, y - r * 0.7); ctx.lineTo(x, y + r * 0.7); ctx.stroke();
}

function tick(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, deg: number, r0: number, r1: number, width: number, color = '#f2f2f2'): void {
  const a = rad(deg);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * r0, cy + Math.sin(a) * r * r0); ctx.lineTo(cx + Math.cos(a) * r * r1, cy + Math.sin(a) * r * r1); ctx.stroke();
}

function dialText(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, deg: number, rr: number, text: string, size: number, color = '#f2f2f2', weight = 'bold'): void {
  const a = rad(deg);
  ctx.fillStyle = color; ctx.font = `${weight} ${Math.round(r * size)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx + Math.cos(a) * r * rr, cy + Math.sin(a) * r * rr);
}

function arcBand(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, deg0: number, deg1: number, rr: number, width: number, color: string): void {
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.arc(cx, cy, r * rr, rad(deg0), rad(deg1)); ctx.stroke();
}

function label(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, px: number, color = '#e4e4e4', weight = 'bold', align: CanvasTextAlign = 'center'): void {
  ctx.fillStyle = color; ctx.font = `${weight} ${px}px Arial`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function placard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lines: string[], fg = '#f0f0f0', bg = '#111214', px = 0): void {
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  const size = px || Math.min(h / (lines.length + 0.6), (w / Math.max(...lines.map((l) => l.length))) * 1.8);
  lines.forEach((l, i) => label(ctx, x + w / 2, y + h * ((i + 1) / (lines.length + 1)), l, size, fg, 'bold'));
}

function rocker(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean, text: string): void {
  // rocker switch in a bezel with its legend below
  ctx.fillStyle = '#3a3e44'; ctx.fillRect(x - 13, y - 22, 26, 44);
  ctx.fillStyle = '#0e0f11'; ctx.fillRect(x - 10, y - 19, 20, 38);
  const g = ctx.createLinearGradient(0, y - 18, 0, y + 18);
  g.addColorStop(0, on ? '#eceff2' : '#8d9198'); g.addColorStop(1, on ? '#a7abb1' : '#d7dadf');
  ctx.fillStyle = g; ctx.fillRect(x - 8, y - (on ? 17 : 0), 16, 17);
  label(ctx, x, y + 32, text, 9, '#e8e8e8');
}

/** Static instrument panel face + glare shield grain + placards (albedo, emissive glow map). */
export function panelTexture(): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const w = PANEL_PX.w, hFace = PANEL_PX.face;
  const rng = new Rng('panel-brush');
  const [c, ctx] = canvas(w, ATLAS_H);
  // panel: dark grey crinkle paint with a slightly lighter pilot sub-panel
  ctx.fillStyle = '#25282c'; ctx.fillRect(0, 0, w, hFace);
  for (let i = 0; i < 9000; i++) { ctx.fillStyle = `rgba(${rng.next() > 0.5 ? '255,255,255' : '0,0,0'},${rng.next() * 0.05})`; ctx.fillRect(rng.next() * w, rng.next() * hFace, 2, 2); }
  const sub = (x0: number, y0: number, x1: number, y1: number) => {
    ctx.fillStyle = '#2c2f34'; ctx.fillRect(PX(x0), PY(y1), PX(x1) - PX(x0), PY(y0) - PY(y1));
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3; ctx.strokeRect(PX(x0), PY(y1), PX(x1) - PX(x0), PY(y0) - PY(y1));
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5; ctx.strokeRect(PX(x0) + 3, PY(y1) + 3, PX(x1) - PX(x0) - 6, PY(y0) - PY(y1) - 6);
    for (const [sx, sy] of [[x0 + 0.012, y1 - 0.012], [x1 - 0.012, y1 - 0.012], [x0 + 0.012, y0 + 0.012], [x1 - 0.012, y0 + 0.012]]) screw(ctx, PX(sx), PY(sy), 5);
  };
  sub(-0.60, -0.045, -0.175, 0.175);   // six-pack + clock
  sub(-0.03, -0.045, 0.20, 0.175);     // avionics stack
  sub(0.29, -0.075, 0.62, 0.175);      // engine cluster
  sub(-0.63, -0.19, 0.63, -0.085);     // switch row
  // panel edge screws
  for (let x = -0.62; x <= 0.63; x += 0.125) { screw(ctx, PX(x), PY(0.188), 5); screw(ctx, PX(x), PY(-0.192), 5); }

  const G = GAUGES;
  const at = (g: GaugeDef) => [PX(g.x), PY(g.y), PR(g.r)] as const;
  // ---- airspeed
  { const [cx, cy, r] = at(G.asi); bezel(ctx, cx, cy, r);
    arcBand(ctx, cx, cy, r, DIAL.asi(48), DIAL.asi(95), 0.90, r * 0.07, '#f4f4f4');
    arcBand(ctx, cx, cy, r, DIAL.asi(58), DIAL.asi(140), 0.80, r * 0.07, '#2fbf58');
    arcBand(ctx, cx, cy, r, DIAL.asi(140), DIAL.asi(180), 0.80, r * 0.07, '#f2c230');
    tick(ctx, cx, cy, r, DIAL.asi(180), 0.72, 0.94, r * 0.06, '#e0322a');
    for (let kt = 40; kt <= 200; kt += 10) tick(ctx, cx, cy, r, DIAL.asi(kt), kt % 20 ? 0.68 : 0.62, 0.76, kt % 20 ? r * 0.025 : r * 0.04);
    for (let kt = 40; kt <= 200; kt += 20) dialText(ctx, cx, cy, r, DIAL.asi(kt), 0.47, String(kt), 0.20);
    dialText(ctx, cx, cy, r, 180, 0.22, 'KNOTS', 0.10, '#d0d0d0', 'normal'); dialText(ctx, cx, cy, r, 0, 0.28, 'AIRSPEED', 0.10, '#d0d0d0', 'normal'); }
  // ---- attitude: only the bezel and the bank scale (the ball is a separate live disc)
  { const [cx, cy, r] = at(G.adi); bezel(ctx, cx, cy, r);
    ctx.fillStyle = '#15171a'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); }
  // ---- altimeter
  { const [cx, cy, r] = at(G.alt); bezel(ctx, cx, cy, r);
    for (let i = 0; i < 50; i++) tick(ctx, cx, cy, r, i * 7.2, i % 5 ? 0.80 : 0.72, 0.90, i % 5 ? r * 0.025 : r * 0.05);
    for (let i = 0; i < 10; i++) dialText(ctx, cx, cy, r, i * 36, 0.58, String(i), 0.24);
    dialText(ctx, cx, cy, r, 180, 0.30, 'ALT', 0.12, '#d0d0d0', 'normal'); dialText(ctx, cx, cy, r, 180, 0.42, 'FEET', 0.09, '#d0d0d0', 'normal');
    // Kollsman window
    ctx.fillStyle = '#0a0b0d'; ctx.fillRect(cx + r * 0.36, cy - r * 0.10, r * 0.34, r * 0.2); label(ctx, cx + r * 0.53, cy, '29.92', r * 0.13, '#e8e8e8', 'normal'); }
  // ---- turn coordinator: standard-rate marks and the inclinometer tube
  { const [cx, cy, r] = at(G.tc); bezel(ctx, cx, cy, r);
    for (const d of [-90, -70, 70, 90]) tick(ctx, cx, cy, r, d, 0.74, 0.90, r * 0.05);
    dialText(ctx, cx, cy, r, 180, 0.25, 'TURN COORDINATOR', 0.085, '#d0d0d0', 'normal');
    dialText(ctx, cx, cy, r, -70, 0.62, 'L', 0.14); dialText(ctx, cx, cy, r, 70, 0.62, 'R', 0.14);
    dialText(ctx, cx, cy, r, 180, 0.85, '2 MIN', 0.085, '#d0d0d0', 'normal');
    // curved glass tube for the slip ball
    ctx.strokeStyle = '#d9dde3'; ctx.lineWidth = r * 0.02; ctx.beginPath(); ctx.arc(cx, cy - r * 0.62, r * 1.15, Math.PI * 0.36, Math.PI * 0.64); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = r * 0.17; ctx.beginPath(); ctx.arc(cx, cy - r * 0.62, r * 1.15, Math.PI * 0.36, Math.PI * 0.64); ctx.stroke();
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = r * 0.025;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * r * 0.1, cy + r * 0.44); ctx.lineTo(cx + s * r * 0.1, cy + r * 0.62); ctx.stroke(); } }
  // ---- heading indicator: bezel and the lubber marks at the 45s (card is live)
  { const [cx, cy, r] = at(G.hdg); bezel(ctx, cx, cy, r);
    ctx.fillStyle = '#15171a'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    for (const d of [0, 45, 90, 135, 180, 225, 270, 315]) tick(ctx, cx, cy, r, d, 0.93, 1.0, r * 0.04, d === 0 ? '#ff9a2e' : '#e8e8e8'); }
  // ---- vertical speed
  { const [cx, cy, r] = at(G.vsi); bezel(ctx, cx, cy, r);
    for (const s of [-1, 1]) for (let v = 0; v <= 2000; v += 100) tick(ctx, cx, cy, r, DIAL.vsi(s * v), v % 500 ? 0.78 : 0.70, 0.88, v % 500 ? r * 0.025 : r * 0.05);
    for (const s of [-1, 1]) for (const v of [500, 1000, 1500, 2000]) dialText(ctx, cx, cy, r, DIAL.vsi(s * v), 0.52, String(v / 100), 0.20);
    dialText(ctx, cx, cy, r, 270, 0.52, '0', 0.20);
    dialText(ctx, cx, cy, r, 90, 0.30, 'VERTICAL', 0.085, '#d0d0d0', 'normal'); dialText(ctx, cx, cy, r, 90, 0.44, 'SPEED', 0.085, '#d0d0d0', 'normal');
    dialText(ctx, cx, cy, r, 350, 0.22, 'UP', 0.09, '#d0d0d0', 'normal'); dialText(ctx, cx, cy, r, 190, 0.22, 'DOWN', 0.09, '#d0d0d0', 'normal'); }
  // ---- clock & suction
  { const [cx, cy, r] = at(G.clock); bezel(ctx, cx, cy, r);
    for (let i = 0; i < 60; i++) tick(ctx, cx, cy, r, i * 6, i % 5 ? 0.84 : 0.76, 0.92, i % 5 ? r * 0.03 : r * 0.06);
    for (let i = 1; i <= 12; i++) dialText(ctx, cx, cy, r, i * 30, 0.60, String(i), 0.22);
    // hands set to the departure time
    tick(ctx, cx, cy, r, 315, 0, 0.5, r * 0.07, '#f2f2f2'); tick(ctx, cx, cy, r, 60, 0, 0.72, r * 0.05, '#f2f2f2');
    ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.07, 0, 7); ctx.fill(); }
  { const [cx, cy, r] = at(G.suction); bezel(ctx, cx, cy, r);
    for (let i = 0; i <= 10; i++) tick(ctx, cx, cy, r, DIAL.small(i / 10), i % 5 ? 0.8 : 0.7, 0.9, i % 5 ? r * 0.03 : r * 0.06);
    arcBand(ctx, cx, cy, r, DIAL.small(0.45), DIAL.small(0.6), 0.62, r * 0.08, '#2fbf58');
    dialText(ctx, cx, cy, r, 180, 0.45, 'SUCTION', 0.12, '#d0d0d0', 'normal');
    tick(ctx, cx, cy, r, DIAL.small(0.52), -0.15, 0.7, r * 0.06, '#f2f2f2'); }
  // ---- engine cluster
  const engine = (g: GaugeDef, name: string, unit: string, n: number, redAt: number | null, greenFrom: number, greenTo: number, labels: (i: number) => string, big = false) => {
    const [cx, cy, r] = at(g); bezel(ctx, cx, cy, r, big);
    const ang = (f: number) => (big ? -135 + f * 270 : DIAL.small(f));
    arcBand(ctx, cx, cy, r, ang(greenFrom), ang(greenTo), 0.82, r * 0.07, '#2fbf58');
    if (redAt !== null) tick(ctx, cx, cy, r, ang(redAt), 0.7, 0.92, r * 0.06, '#e0322a');
    for (let i = 0; i <= n; i++) tick(ctx, cx, cy, r, ang(i / n), 0.72, 0.86, r * 0.045);
    for (let i = 0; i <= n; i++) dialText(ctx, cx, cy, r, ang(i / n), 0.55, labels(i), big ? 0.17 : 0.2);
    dialText(ctx, cx, cy, r, 180, 0.32, name, big ? 0.12 : 0.14, '#d0d0d0', 'normal');
    if (unit) dialText(ctx, cx, cy, r, 180, 0.5, unit, big ? 0.09 : 0.11, '#d0d0d0', 'normal');
  };
  engine(G.rpm, 'RPM', 'x100', 6, 2600 / 3000, 1800 / 3000, 2600 / 3000, (i) => String(i * 5), true);
  engine(G.map, 'MAN PRESS', 'IN HG', 5, null, 0.4, 0.84, (i) => String(10 + i * 5), true);
  engine(G.oilp, 'OIL', 'PSI', 4, 0.95, 0.5, 0.85, (i) => String(i * 25));
  engine(G.oilt, 'OIL', 'TEMP', 4, 0.92, 0.35, 0.8, (i) => String(50 + i * 50));
  engine(G.fuell, 'FUEL', 'L', 4, null, 0.15, 1, (i) => ['E', '¼', '½', '¾', 'F'][i]);
  engine(G.fuelr, 'FUEL', 'R', 4, null, 0.15, 1, (i) => ['E', '¼', '½', '¾', 'F'][i]);
  engine(G.egt, 'EGT', '', 4, null, 0.3, 0.8, (i) => String(i * 4));
  engine(G.amp, 'AMP', '', 4, null, 0.45, 0.65, (i) => String(-60 + i * 30));
  engine(G.cht, 'CHT', '', 4, 0.9, 0.3, 0.75, (i) => String(i * 1));
  // ---- avionics stack: GPS bezel (screen itself is a live mesh), COM/NAV radio, transponder
  { const sx = PX(GPS_SCREEN.x - GPS_SCREEN.w / 2), sy = PY(GPS_SCREEN.y + GPS_SCREEN.h / 2), sw = PR(GPS_SCREEN.w), sh = PR(GPS_SCREEN.h);
    ctx.fillStyle = '#34383e'; ctx.fillRect(sx - 22, sy - 22, sw + 44, sh + 44);
    ctx.fillStyle = '#0a0c0f'; ctx.fillRect(sx - 4, sy - 4, sw + 8, sh + 8);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = '#1b1d21'; ctx.fillRect(sx + 10 + i * (sw / 4), sy + sh + 6, sw / 4 - 20, 12); }
    for (const [x, y] of [[sx - 11, sy - 11], [sx + sw + 11, sy - 11], [sx - 11, sy + sh + 11], [sx + sw + 11, sy + sh + 11]]) screw(ctx, x, y, 4);
    label(ctx, sx + sw / 2, sy - 12, 'GNS 530  ·  BAHÍA VISTA AIR TAXI', 9, '#c8ccd2', 'normal');
    const radio = (y: number, l: string, r: string, title: string) => {
      const x0 = PX(-0.02), x1 = PX(0.19), hh = PR(0.036);
      ctx.fillStyle = '#34383e'; ctx.fillRect(x0, y, x1 - x0, hh);
      ctx.fillStyle = '#0a0c0f'; ctx.fillRect(x0 + 6, y + 6, x1 - x0 - 12, hh - 12);
      ctx.fillStyle = '#0b1d10'; ctx.fillRect(x0 + 16, y + 12, (x1 - x0) * 0.32, hh - 24); ctx.fillRect(x0 + (x1 - x0) * 0.55, y + 12, (x1 - x0) * 0.32, hh - 24);
      label(ctx, x0 + 16 + (x1 - x0) * 0.16, y + hh / 2, l, hh * 0.42, '#ffb347', 'bold');
      label(ctx, x0 + (x1 - x0) * 0.71, y + hh / 2, r, hh * 0.42, '#ffb347', 'bold');
      // knobs
      for (const kx of [x0 + 10, x1 - 10]) { ctx.fillStyle = '#5a5e64'; ctx.beginPath(); ctx.arc(kx, y + hh / 2, hh * 0.28, 0, 7); ctx.fill(); ctx.fillStyle = '#23262a'; ctx.beginPath(); ctx.arc(kx, y + hh / 2, hh * 0.16, 0, 7); ctx.fill(); }
      label(ctx, (x0 + x1) / 2, y + hh / 2, title, hh * 0.22, '#a8adb5', 'normal');
    };
    radio(PY(0.012), '121.90', '118.30', 'COM'); radio(PY(-0.03), '110.50', '4213', 'NAV / XPDR'); }
  // ---- placards on the face
  placard(ctx, PX(-0.60) + 4, PY(-0.055), PR(0.11), PR(0.026), ['N726BV'], '#f4f4f4', '#111214', 22);
  placard(ctx, PX(-0.485), PY(-0.055), PR(0.19), PR(0.026), ['NO SMOKING  ·  FASTEN SEAT BELTS'], '#f4f4f4', '#111214', 12);
  placard(ctx, PX(-0.29), PY(-0.055), PR(0.11), PR(0.026), ['Vfe 95 · Vne 180'], '#f4f4f4', '#7a1a14', 12);
  placard(ctx, PX(-0.03), PY(-0.078), PR(0.22), PR(0.020), ['THIS AIRCRAFT MUST BE OPERATED IN ACCORDANCE WITH THE APPROVED FLIGHT MANUAL'], '#e8e8e8', '#111214', 7);
  placard(ctx, PX(0.29) + 4, PY(-0.095), PR(0.32), PR(0.024), ['DHC-2 TYPE FLOATPLANE  ·  MAX GROSS 2350 KG  ·  FUEL 100LL'], '#f4f4f4', '#111214', 10);
  // ---- switch row: rockers, the ignition key, fuel cut-off guard, breakers
  const switches = ['MASTER', 'ALT', 'AVIONICS', 'FUEL PUMP', 'PITOT HT', 'NAV', 'STROBE', 'BEACON', 'LDG', 'TAXI', 'PANEL', 'DOME'];
  switches.forEach((s, i) => rocker(ctx, PX(-0.56 + i * 0.05), PY(-0.13), i < 3 || i === 5 || i === 7, s));
  // ignition switch
  { const kx = PX(0.06), ky = PY(-0.13); ctx.fillStyle = '#3a3e44'; ctx.beginPath(); ctx.arc(kx, ky, 26, 0, 7); ctx.fill(); ctx.fillStyle = '#0e0f11'; ctx.beginPath(); ctx.arc(kx, ky, 20, 0, 7); ctx.fill();
    for (const [d, t] of [[-70, 'OFF'], [-35, 'R'], [0, 'L'], [35, 'BOTH'], [70, 'START']] as [number, string][]) label(ctx, kx + Math.cos(rad(d)) * 36, ky + Math.sin(rad(d)) * 36, t, 8, '#e8e8e8', 'normal');
    ctx.fillStyle = '#c9ccd1'; ctx.save(); ctx.translate(kx, ky); ctx.rotate(rad(35)); ctx.fillRect(-3, -3, 22, 6); ctx.restore(); }
  // fuel cut-off: red guarded lever
  { const fx = PX(0.13), fy = PY(-0.13); ctx.fillStyle = '#7a1a14'; ctx.fillRect(fx - 24, fy - 28, 48, 56); ctx.fillStyle = '#c0392b'; ctx.fillRect(fx - 16, fy - 20, 32, 40);
    label(ctx, fx, fy - 8, 'FUEL', 9, '#fff'); label(ctx, fx, fy + 6, 'CUT', 9, '#fff'); label(ctx, fx, fy + 18, 'OFF', 9, '#fff'); }
  // circuit breakers
  for (let i = 0; i < 16; i++) { const bx = PX(0.22 + i * 0.024), by = PY(-0.125); ctx.fillStyle = '#0f1013'; ctx.beginPath(); ctx.arc(bx, by, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#d8dbe0'; ctx.beginPath(); ctx.arc(bx, by, 6, 0, 7); ctx.fill(); }
  label(ctx, PX(0.40), PY(-0.16), 'CIRCUIT BREAKERS  ·  PULL OFF', 9, '#c8ccd2', 'normal');
  // panel lighting rheostats
  for (const [x, t] of [[0.61, 'PANEL'], [0.56, 'RADIO']] as [number, string][]) { ctx.fillStyle = '#5a5e64'; ctx.beginPath(); ctx.arc(PX(x), PY(-0.125), 13, 0, 7); ctx.fill(); label(ctx, PX(x), PY(-0.158), t, 8, '#c8ccd2', 'normal'); }

  // ---- glare shield grain strip: black crinkle vinyl (tileable across the width)
  ctx.fillStyle = '#1f2124'; ctx.fillRect(0, GRAIN_Y, w, PANEL.GRAIN);
  for (let i = 0; i < 26000; i++) { const v = rng.next(); ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${(v - 0.5) * 0.12})` : `rgba(0,0,0,${(0.5 - v) * 0.5})`; ctx.fillRect(rng.next() * w, GRAIN_Y + rng.next() * PANEL.GRAIN, 1 + rng.next() * 2, 1 + rng.next() * 2); }
  // ---- placards row
  ctx.fillStyle = '#000'; ctx.fillRect(0, PLACARD_Y, w, PANEL.PLACARDS);
  placard(ctx, 4, PLACARD_Y + 6, 220, 78, ['EXIT', 'PULL HANDLE UP · PUSH DOOR'], '#111214', '#e8b830', 0);
  placard(ctx, 234, PLACARD_Y + 6, 260, 78, ['FASTEN SEAT BELT', 'WHILE SEATED'], '#f0f0f0', '#111214', 0);
  // whiskey compass card face: a strip of headings around the current one (N at 342 -> 33/N/03 visible)
  { const x0 = 504, y0 = PLACARD_Y + 6; ctx.fillStyle = '#0a0a0c'; ctx.fillRect(x0, y0, 160, 78);
    ctx.fillStyle = '#f2f2f2'; for (let i = 0; i < 17; i++) { const x = x0 + 8 + i * 9; ctx.fillRect(x, y0 + 40, 2, i % 4 === 0 ? 20 : 10); }
    label(ctx, x0 + 26, y0 + 26, '33', 18, '#f2f2f2'); label(ctx, x0 + 80, y0 + 26, 'N', 22, '#f2f2f2'); label(ctx, x0 + 134, y0 + 26, '3', 18, '#f2f2f2');
    ctx.fillStyle = '#ffb347'; ctx.fillRect(x0 + 79, y0 + 38, 3, 40); }
  placard(ctx, 674, PLACARD_Y + 6, 120, 78, ['GARZA 7', 'N726BV'], '#f0f0f0', '#1a1c20', 0);
  { const x0 = 804, y0 = PLACARD_Y + 6; const g = ctx.createLinearGradient(x0, y0, x0, y0 + 78); g.addColorStop(0, '#cfd4da'); g.addColorStop(1, '#8a9099');
    ctx.fillStyle = g; ctx.fillRect(x0, y0, 360, 78); ctx.strokeStyle = '#2a2c30'; ctx.lineWidth = 3; ctx.strokeRect(x0 + 3, y0 + 3, 354, 72);
    label(ctx, x0 + 180, y0 + 24, 'BAHÍA VISTA AIR TAXI', 22, '#1c2d5a', 'bold italic'); label(ctx, x0 + 180, y0 + 56, 'GARZA 7 · FLOATPLANE · N726BV', 14, '#1c2d5a', 'normal'); }
  { const x0 = 1174, y0 = PLACARD_Y + 6; const g = ctx.createRadialGradient(x0 + 40, y0 + 39, 4, x0 + 40, y0 + 39, 40); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c8cbd0');
    ctx.fillStyle = g; ctx.fillRect(x0, y0, 80, 78); }
  // ---- overhead console face (seen from below): crinkle paint, fuel selector, cabin switches, trim indicator
  ctx.fillStyle = '#000'; ctx.fillRect(0, OVERHEAD_Y, w, PANEL.OVERHEAD);
  { const x0 = 4, y0 = OVERHEAD_Y + 4, ow = OVERHEAD_PX.w, oh = OVERHEAD_PX.h;
    ctx.fillStyle = '#26292d'; ctx.fillRect(x0, y0, ow, oh);
    for (let i = 0; i < 5000; i++) { ctx.fillStyle = `rgba(${rng.next() > 0.5 ? '255,255,255' : '0,0,0'},${rng.next() * 0.06})`; ctx.fillRect(x0 + rng.next() * ow, y0 + rng.next() * oh, 2, 2); }
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3; ctx.strokeRect(x0 + 2, y0 + 2, ow - 4, oh - 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + 6, y0 + 6, ow - 12, oh - 12);
    for (const [sx, sy] of [[12, 12], [ow - 12, 12], [12, oh - 12], [ow - 12, oh - 12]]) screw(ctx, x0 + sx, y0 + sy, 5);
    // fuel selector (aft end, nearest the pilot): a large rotary with LEFT / BOTH / RIGHT / OFF legends
    const fx = x0 + ow / 2, fy = y0 + 100;
    label(ctx, fx, y0 + 22, 'FUEL SELECTOR', 10, '#c8ccd2', 'normal');
    ctx.fillStyle = '#3a3e44'; ctx.beginPath(); ctx.arc(fx, fy, 50, 0, 7); ctx.fill();
    ctx.fillStyle = '#0e0f11'; ctx.beginPath(); ctx.arc(fx, fy, 42, 0, 7); ctx.fill();
    for (const [d, t] of [[-90, 'LEFT'], [0, 'BOTH'], [90, 'RIGHT'], [180, 'OFF']] as [number, string][]) label(ctx, fx + Math.cos(rad(d)) * 66, fy + Math.sin(rad(d)) * 62, t, 9, d === 180 ? '#e0322a' : '#e8e8e8');
    ctx.fillStyle = '#c0392b'; ctx.fillRect(fx - 9, fy - 38, 18, 60);
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(fx - 2, fy - 36, 4, 14);
    // cabin switches in a row across the console
    const sw = ['CAB LT', 'MAP LT', 'DEFROST', 'FAN', 'PITOT'];
    sw.forEach((s, i) => rocker(ctx, x0 + 30 + i * 45, y0 + 220, i === 0 || i === 2, s));
    // elevator trim indicator: a slot across the console with NOSE UP / NOSE DN legends, pointer near neutral
    const tx = x0 + 22, ty = y0 + 320, tw = ow - 44;
    label(ctx, x0 + ow / 2, ty - 14, 'ELEVATOR TRIM', 9, '#c8ccd2', 'normal');
    ctx.fillStyle = '#0e0f11'; ctx.fillRect(tx, ty, tw, 14);
    for (let i = 0; i <= 10; i++) { ctx.fillStyle = '#e8e8e8'; ctx.fillRect(tx + (tw * i) / 10, ty + 16, i % 5 ? 1 : 2, i % 5 ? 5 : 9); }
    ctx.fillStyle = '#ff9a2e'; ctx.fillRect(tx + tw * 0.46, ty + 2, 6, 10);
    label(ctx, tx, ty + 36, 'NOSE DN', 8, '#c8ccd2', 'normal', 'left'); label(ctx, tx + tw, ty + 36, 'NOSE UP', 8, '#c8ccd2', 'normal', 'right');
    placard(ctx, x0 + 22, y0 + 390, ow - 44, 30, ['FLAP PUMP → CLIMB'], '#f0f0f0', '#111214', 10);
    placard(ctx, x0 + 22, y0 + 440, ow - 44, 30, ['HYDRAULIC FLAPS · 3 STROKES'], '#f0f0f0', '#111214', 8);
    // emergency exit light housing at the forward end
    ctx.fillStyle = '#3a3e44'; ctx.fillRect(x0 + ow / 2 - 40, y0 + oh - 60, 80, 34);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(x0 + ow / 2 - 34, y0 + oh - 54, 68, 22);
    label(ctx, x0 + ow / 2, y0 + oh - 43, 'EXIT', 12, '#fff');
  }
  // ---- sun visor face: grey-beige vinyl (matches the headliner) with a stitched border and a pivot boss
  { const x0 = 300, y0 = OVERHEAD_Y + 4, vw = 450, vh = 210;
    const g = ctx.createLinearGradient(x0, y0, x0, y0 + vh); g.addColorStop(0, '#938e85'); g.addColorStop(1, '#7c7870');
    ctx.fillStyle = g; ctx.fillRect(x0, y0, vw, vh);
    for (let i = 0; i < 4000; i++) { ctx.fillStyle = `rgba(${rng.next() > 0.5 ? '255,255,255' : '0,0,0'},${rng.next() * 0.05})`; ctx.fillRect(x0 + rng.next() * vw, y0 + rng.next() * vh, 2, 2); }
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 4; ctx.strokeRect(x0 + 8, y0 + 8, vw - 16, vh - 16);
    ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(230,225,210,0.55)'; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + 12, y0 + 12, vw - 24, vh - 24); ctx.setLineDash([]);
    ctx.fillStyle = '#1a1c1f'; ctx.beginPath(); ctx.arc(x0 + 40, y0 + 34, 16, 0, 7); ctx.fill(); screw(ctx, x0 + 40, y0 + 34, 6);
  }

  const map = toTexture(c, true, 8);
  map.flipY = true; // panel canvas is drawn top-down like a normal image
  map.wrapS = THREE.ClampToEdgeWrapping; map.wrapT = THREE.ClampToEdgeWrapping;
  // emissive: the dials and legends glow (internal lighting), the switch row, grain and placards do not
  const [e, ectx] = canvas(w, ATLAS_H);
  ectx.fillStyle = '#000'; ectx.fillRect(0, 0, w, ATLAS_H);
  ectx.drawImage(c, 0, 0);
  ectx.globalCompositeOperation = 'multiply';
  ectx.fillStyle = '#5a5a60'; ectx.fillRect(0, 0, w, ATLAS_H);
  ectx.globalCompositeOperation = 'source-over';
  ectx.fillStyle = '#000'; ectx.fillRect(0, PY(-0.085), w, ATLAS_H - PY(-0.085));
  ectx.fillStyle = 'rgba(0,0,0,0.6)'; ectx.fillRect(0, 0, w, hFace); // the panel paint itself barely glows
  // the dome-light lens glows white at night
  ectx.fillStyle = '#e8e6dc'; ectx.fillRect(1174, PLACARD_Y + 6, 80, 78);
  const emissive = toTexture(e, true, 4);
  emissive.flipY = true;
  emissive.wrapS = THREE.ClampToEdgeWrapping; emissive.wrapT = THREE.ClampToEdgeWrapping;
  return { map, emissive };
}

/**
 * Atlas for the live instrument parts: attitude ball (top-left quarter), heading card (top-right quarter) and
 * flat colour patches along the bottom for needles, bezels and symbols. 512 x 512, drawn top-down.
 */
export const INSTRUMENT_ATLAS = {
  size: 512,
  ball: { x: 0, y: 0, s: 256 },
  card: { x: 256, y: 0, s: 256 },
  /** the ball disc is this many apertures wide (it shifts up to 25 deg = 0.83 apertures and must still fill the window) */
  ballRadius: 1.9,
  /** degrees of pitch covered by the ball's radius: 30 deg per aperture radius */
  ballDegPerRadius: 57,
  patches: { white: [16, 300], black: [80, 300], orange: [144, 300], red: [208, 300], bezel: [272, 300], grey: [336, 300], yellow: [400, 300], glass: [464, 300] } as Record<string, [number, number]>,
};

export function instrumentAtlas(): THREE.CanvasTexture {
  const S = INSTRUMENT_ATLAS.size;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S);
  // ---- attitude ball: sky over earth, pitch ladder every 5 degrees, bank scale on the rim
  { const { x, y, s } = INSTRUMENT_ATLAS.ball; const cx = x + s / 2, cy = y + s / 2, r = s / 2;
    const pxPerDeg = r / INSTRUMENT_ATLAS.ballDegPerRadius;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
    const sky = ctx.createLinearGradient(0, cy - r, 0, cy); sky.addColorStop(0, '#2b7fd0'); sky.addColorStop(1, '#4aa0e8');
    ctx.fillStyle = sky; ctx.fillRect(x, y, s, s / 2);
    const earth = ctx.createLinearGradient(0, cy, 0, cy + r); earth.addColorStop(0, '#9a6a3a'); earth.addColorStop(1, '#6b4322');
    ctx.fillStyle = earth; ctx.fillRect(x, cy, s, s / 2);
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x, cy - 1.5, s, 3);
    for (let deg = 5; deg <= 35; deg += 5) {
      const len = deg % 10 ? r * 0.16 : r * 0.34;
      for (const sgn of [-1, 1]) {
        const yy = cy - sgn * deg * pxPerDeg;
        ctx.fillRect(cx - len / 2, yy - 1.2, len, 2.4);
        if (deg % 10 === 0) { ctx.font = `bold ${Math.round(r * 0.11)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(deg), cx - len / 2 - r * 0.09, yy); ctx.fillText(String(deg), cx + len / 2 + r * 0.09, yy); }
      }
    }
    ctx.restore(); }
  // ---- heading card: compass rose, N in orange
  { const { x, y, s } = INSTRUMENT_ATLAS.card; const cx = x + s / 2, cy = y + s / 2, r = s / 2;
    ctx.fillStyle = '#101214'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    for (let d = 0; d < 360; d += 5) { const a = ((d - 90) * Math.PI) / 180, l = d % 30 ? (d % 10 ? r * 0.06 : r * 0.1) : r * 0.14; ctx.fillStyle = '#f2f2f2'; ctx.save(); ctx.translate(cx + Math.cos(a) * r * 0.98, cy + Math.sin(a) * r * 0.98); ctx.rotate(a + Math.PI / 2); ctx.fillRect(-1.2, 0, 2.4, l); ctx.restore(); }
    for (let d = 0; d < 360; d += 30) { const a = ((d - 90) * Math.PI) / 180; const t = d === 0 ? 'N' : d === 90 ? 'E' : d === 180 ? 'S' : d === 270 ? 'W' : String(d / 10); ctx.save(); ctx.translate(cx + Math.cos(a) * r * 0.66, cy + Math.sin(a) * r * 0.66); ctx.rotate(a + Math.PI / 2); ctx.fillStyle = d === 0 ? '#ff9a2e' : '#f2f2f2'; ctx.font = `bold ${Math.round(r * (d % 90 ? 0.17 : 0.22))}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, 0, 0); ctx.restore(); } }
  // ---- colour patches (32 px squares)
  const P = INSTRUMENT_ATLAS.patches;
  const fill = (k: string, col: string) => { const [px, py] = P[k]; ctx.fillStyle = col; ctx.fillRect(px - 16, py - 16, 32, 32); };
  fill('white', '#f4f4f4'); fill('black', '#0b0c0e'); fill('orange', '#ff8a1f'); fill('red', '#d8322e'); fill('bezel', '#2e3136'); fill('grey', '#9a9ea4'); fill('yellow', '#f2c230'); fill('glass', '#0b0c0e');
  const t = toTexture(c, true, 8);
  t.flipY = true;
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Live GPS / moving-map screen: a small canvas redrawn (at most a few times a second) from telemetry. */
export class GpsScreen {
  readonly texture: THREE.CanvasTexture;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly w = 320;
  private readonly h = 216;
  private last = '';

  constructor() {
    const [c, ctx] = canvas(this.w, this.h);
    this.ctx = ctx;
    this.texture = toTexture(c, true, 4);
    this.texture.flipY = true;
    this.texture.wrapS = THREE.ClampToEdgeWrapping; this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.draw(0, 0, 0, 0);
  }

  /** Redraws only when the displayed numbers change; returns true when the texture was updated. */
  draw(gsKt: number, trkDeg: number, altFt: number, vsFpm: number): boolean {
    const gs = Math.round(gsKt), trk = ((Math.round(trkDeg) % 360) + 360) % 360, alt = Math.round(altFt / 10) * 10, vs = Math.round(vsFpm / 50) * 50;
    const key = `${gs}|${trk}|${alt}|${vs}`;
    if (key === this.last) return false;
    this.last = key;
    const ctx = this.ctx, w = this.w, h = this.h, mapW = 206;
    ctx.fillStyle = '#071a2e'; ctx.fillRect(0, 0, w, h);
    // moving map, track-up: bay water, the barrier island and the causeway, own-ship fixed at the lower centre
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, mapW, h); ctx.clip();
    ctx.translate(mapW / 2, h * 0.62); ctx.rotate((-trk * Math.PI) / 180);
    ctx.fillStyle = '#12508a'; ctx.fillRect(-400, -400, 800, 800);
    ctx.fillStyle = '#5c9e4a'; ctx.beginPath(); ctx.ellipse(40, -110, 160, 46, 0.35, 0, 7); ctx.fill();
    ctx.fillStyle = '#7fb56a'; ctx.beginPath(); ctx.ellipse(-120, 60, 70, 34, -0.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#d9c890'; ctx.beginPath(); ctx.ellipse(120, -60, 40, 14, 0.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#e6e6e6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-160, 20); ctx.lineTo(60, -90); ctx.stroke();
    ctx.strokeStyle = '#ff5fb0'; ctx.lineWidth = 3; ctx.setLineDash([10, 6]); ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(0, -320); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // range ring + own ship (white aircraft symbol) + track-up label
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(mapW / 2, h * 0.62, 62, 0, 7); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.save(); ctx.translate(mapW / 2, h * 0.62);
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(3, -2); ctx.lineTo(12, 2); ctx.lineTo(12, 5); ctx.lineTo(3, 3); ctx.lineTo(3, 9); ctx.lineTo(6, 11); ctx.lineTo(-6, 11); ctx.lineTo(-3, 9); ctx.lineTo(-3, 3); ctx.lineTo(-12, 5); ctx.lineTo(-12, 2); ctx.lineTo(-3, -2); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#dfe8f2'; ctx.fillText('TRK UP  2NM', 5, 4); ctx.fillText('DTK 090  RWY09', 5, h - 15);
    // data column: large live numbers the pilot can read from the seat
    ctx.fillStyle = '#04101c'; ctx.fillRect(mapW, 0, w - mapW, h);
    ctx.fillStyle = '#20364d'; ctx.fillRect(mapW, 0, 1, h);
    const rows: [string, string, string][] = [['GS', `${gs}`, 'kt'], ['TRK', `${trk.toString().padStart(3, '0')}`, '°'], ['ALT', `${alt}`, 'ft'], ['VS', `${vs > 0 ? '+' : ''}${vs}`, 'fpm']];
    rows.forEach(([k, v, unit], i) => {
      const y0 = i * (h / 4);
      ctx.fillStyle = '#20364d'; if (i) ctx.fillRect(mapW, y0, w - mapW, 1);
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#8fb3d9'; ctx.fillText(k, mapW + 6, y0 + 4);
      ctx.textAlign = 'right'; ctx.fillText(unit, w - 5, y0 + 4);
      ctx.font = 'bold 30px monospace'; ctx.textBaseline = 'bottom'; ctx.fillStyle = i === 1 ? '#ff5fb0' : '#f4f4f4'; ctx.fillText(v, w - 5, y0 + h / 4 - 2);
    });
    this.texture.needsUpdate = true;
    return true;
  }
}

/** Small tileable smudge/dirt mask for the cockpit glass (red channel = dirt amount). */
export function glassDirtTexture(): THREE.CanvasTexture {
  const s = 256;
  const rng = new Rng('glass-dirt');
  const [c, ctx] = canvas(s, s);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    const x = rng.range(0, s), y = rng.range(0, s), r = rng.range(6, 40);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = rng.range(0.03, 0.14);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    // draw wrapped so the tile has no seam
    for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) ctx.fillRect(x - r + ox, y - r + oy, r * 2, r * 2);
  }
  // wiper-like streaks
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${rng.range(0.03, 0.1)})`; ctx.lineWidth = rng.range(0.5, 2);
    const x = rng.range(0, s), y = rng.range(0, s), l = rng.range(20, 90), a = rng.range(-0.4, 0.4);
    for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) { ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); ctx.stroke(); }
  }
  const t = toTexture(c, false, 4);
  return t;
}

/**
 * Motion-blur disc for the spinning propeller: a faint translucent grey disc (denser near the hub where the blades
 * are wide) with three darker arcs smeared behind the blade positions and a faint yellow ring where the tips pass.
 */
/**
 * Motion-blurred propeller disc for a three-blade prop of the given geometry (metres; the disc mesh has radius
 * `discR`). Per pixel: the time-averaged coverage of the blades at that radius (3 chord / 2 pi r, near solid at the
 * shank, a few per cent at the tip), a ghost sector trailing each blade position (the disc turns with the hub, so at
 * part blend the ghosts smear out of the crisp blades), fine radial streaks, and the yellow tip band as a brighter
 * arc with a thin glint at the very tip. Angle convention: phi counter-clockwise from +x with y up, blade i at
 * 90 deg + i 120 deg, turning toward increasing phi (model.ts: rotation.x += ..., disc rotated y by 90 deg).
 */
export function propDiscTexture(discR = 1.5, root = 0.16, length = 1.32, rootChord = 0.17, tipChord = 0.10, tipBand = 0.17): THREE.CanvasTexture {
  const s = 512, cx = s / 2, cy = s / 2;
  const [c, ctx] = canvas(s, s);
  const img = ctx.createImageData(s, s), d = img.data;
  const rng = new Rng('prop-disc');
  const maxChord = rootChord * 1.35;
  const chordAt = (t: number) => {
    const grow = THREE.MathUtils.smoothstep(t, 0, 0.42);
    let ch = rootChord * 0.75 + (maxChord - rootChord * 0.75) * grow;
    if (t > 0.42) ch = maxChord + (tipChord - maxChord) * ((t - 0.42) / 0.58);
    if (t > 0.82) ch *= Math.sqrt(Math.max(1 - Math.pow((t - 0.82) / 0.18, 2), 0));
    return Math.max(ch, 0.012);
  };
  // per-angle streak noise (smooth over ~1.5 deg so it reads as fine radial streaks, not spokes)
  const NB = 720, streak = new Float32Array(NB);
  for (let i = 0; i < NB; i++) streak[i] = rng.next();
  const streakAt = (phi: number) => {
    const f = ((phi / (Math.PI * 2)) % 1 + 1) % 1 * NB, i = Math.floor(f), a = f - i;
    const v = streak[i % NB] * (1 - a) + streak[(i + 1) % NB] * a;
    return 0.82 + 0.36 * v;
  };
  const SMEAR = 1.25, tipR = root + length;
  for (let py = 0; py < s; py++) {
    for (let px = 0; px < s; px++) {
      const x = ((px + 0.5) / s * 2 - 1) * discR, y = (1 - (py + 0.5) / s * 2) * discR;
      const r = Math.hypot(x, y), phi = Math.atan2(y, x);
      const k = (py * s + px) * 4;
      if (r < root * 0.7 || r > tipR + 0.01) { d[k + 3] = 0; continue; }
      const t = THREE.MathUtils.clamp((r - root) / length, 0, 1);
      const chord = r < root ? rootChord * 0.75 : chordAt(t);
      // fraction of the circumference the three blades sweep through at this radius
      const cover = Math.min(3 * chord / (2 * Math.PI * r), 1);
      const uniform = Math.min(cover * 2.4, 0.9);
      // ghost sectors trailing each blade position
      let ghost = 0;
      for (let b = 0; b < 3; b++) {
        let back = (Math.PI / 2 + (b * 2 * Math.PI) / 3) - phi;
        back = ((back % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (back < SMEAR) ghost = Math.max(ghost, Math.pow(1 - back / SMEAR, 1.6) * Math.min(cover * 9, 0.7));
      }
      let alpha = 1 - (1 - uniform) * (1 - ghost);
      alpha *= streakAt(phi + r * 0.4);
      // fade at the rim (rounded tips sweep less) and out over the last centimetres
      alpha *= 1 - THREE.MathUtils.smoothstep(r, tipR - 0.02, tipR + 0.01);
      // blade body: dark blue-grey; the outer tipBand is the yellow tip paint, a brighter arc with a thin glint
      let cr = 34, cg = 35, cb = 40;
      const inTip = THREE.MathUtils.smoothstep(r, tipR - tipBand - 0.015, tipR - tipBand + 0.015);
      if (inTip > 0) {
        cr = cr + (222 - cr) * inTip; cg = cg + (176 - cg) * inTip; cb = cb + (48 - cb) * inTip;
        alpha *= 1 + 0.6 * inTip;
      }
      const glint = Math.exp(-Math.pow((r - (tipR - 0.03)) / 0.012, 2));
      cr += (255 - cr) * glint * 0.6; cg += (250 - cg) * glint * 0.6; cb += (230 - cb) * glint * 0.6;
      alpha = Math.min(alpha + glint * 0.18, 1);
      d[k] = cr; d[k + 1] = cg; d[k + 2] = cb; d[k + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
