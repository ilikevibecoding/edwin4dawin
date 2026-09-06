import * as THREE from 'three';
import type { Rng } from '../../core/seed';
import type { Surf } from '../geometry';

export interface PbrMaps {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  /** clearcoat roughness in the green channel (multiplies the material's `clearcoatRoughness`) */
  clearcoatRoughnessMap?: THREE.CanvasTexture;
  /** tiled orange-peel normal for the clear coat (repeat set on the texture) */
  clearcoatNormalMap?: THREE.CanvasTexture;
  /** metalness in the blue channel (floats: bare deck vs painted hull); may be the same texture as roughnessMap */
  metalnessMap?: THREE.CanvasTexture;
  /** clear-coat amount in the red channel (floats: none on the bare deck) */
  clearcoatMap?: THREE.CanvasTexture;
}

/**
 * Packs three grey canvases into one texture the way three.js samples them: clear-coat amount in red,
 * roughness in green, metalness in blue, so a single map can serve as clearcoatMap + roughnessMap + metalnessMap.
 */
export function packRGB(rc: HTMLCanvasElement, gc: HTMLCanvasElement, bc: HTMLCanvasElement): HTMLCanvasElement {
  const w = rc.width, h = rc.height;
  const r = rc.getContext('2d')!.getImageData(0, 0, w, h).data;
  const g = gc.getContext('2d')!.getImageData(0, 0, w, h).data;
  const b = bc.getContext('2d')!.getImageData(0, 0, w, h).data;
  const [out, ctx] = canvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h * 4; i += 4) { img.data[i] = r[i]; img.data[i + 1] = g[i + 1]; img.data[i + 2] = b[i + 2]; img.data[i + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  return out;
}

export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}

export function toTexture(c: HTMLCanvasElement, srgb: boolean, anisotropy = 8): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.flipY = false; // canvas row 0 is texture v = 0 (fuselage top / wing trailing edge)
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = anisotropy;
  return t;
}

/** Height (grayscale canvas) -> tangent-space normal map. */
export function heightToNormal(hc: HTMLCanvasElement, strength = 2.0): HTMLCanvasElement {
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

export function grime(ctx: CanvasRenderingContext2D, rng: Rng, w: number, h: number, count: number, alpha: number, color = '40,35,30'): void {
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
 * Station seams are lap joints: the aft skin overlaps the forward one, so the height map steps up across the seam
 * (a lit edge on one side, a shadow on the other) and the albedo carries a hairline highlight next to the dark
 * line; that pair is what reads as a "panel line" at 30 m where a single 5 mm dark line averages away.
 */
export function panels(hctx: CanvasRenderingContext2D, actx: CanvasRenderingContext2D, w: number, h: number, stationsU: number[], stringersV: number[], rivetSpacing: number, o: { y0?: number; y1?: number; strength?: number } = {}): void {
  const y0 = o.y0 ?? 0, y1 = o.y1 ?? h, k = o.strength ?? 1;
  const grey = (base: number, delta: number) => { const v = Math.round(base + delta * k); return `rgb(${v},${v},${v})`; };
  const vline = (ctx: CanvasRenderingContext2D, x: number, style: string, lw: number) => { ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); };
  for (const u of stationsU) {
    const x = u * w;
    // lap step: the overlapping (aft, +x in u) skin stands proud over a 4-texel ramp, the joint itself is a groove
    vline(hctx, x + 3, grey(128, 14), 4);
    vline(hctx, x, grey(128, -38), 2.2);
    // faint grime settled along the seam, the crisp dark line, and the lit lap edge beside it
    vline(actx, x, `rgba(40,38,34,${0.07 * k})`, 9);
    vline(actx, x, `rgba(30,30,35,${0.27 * k})`, 1.6);
    vline(actx, x + 2, `rgba(255,255,255,${0.16 * k})`, 1.2);
    // rivet rows either side of the seam
    for (const off of [-7, 7]) {
      for (let y = y0 + rivetSpacing / 2; y < y1; y += rivetSpacing) {
        hctx.fillStyle = grey(128, 56);
        hctx.beginPath(); hctx.arc(x + off, y, 1.6, 0, Math.PI * 2); hctx.fill();
        actx.fillStyle = `rgba(255,255,255,${0.14 * k})`;
        actx.beginPath(); actx.arc(x + off, y, 1.4, 0, Math.PI * 2); actx.fill();
        actx.fillStyle = `rgba(0,0,0,${0.13 * k})`;
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
    actx.strokeStyle = `rgba(30,30,35,${0.16 * k})`; actx.lineWidth = 1.4;
    actx.beginPath(); actx.moveTo(0, y); actx.lineTo(w, y); actx.stroke();
    for (let x = rivetSpacing / 2; x < w; x += rivetSpacing) {
      hctx.fillStyle = grey(128, 48);
      hctx.beginPath(); hctx.arc(x, y + 5, 1.5, 0, Math.PI * 2); hctx.fill();
      actx.fillStyle = `rgba(255,255,255,${0.10 * k})`;
      actx.beginPath(); actx.arc(x, y + 5, 1.3, 0, Math.PI * 2); actx.fill();
      actx.fillStyle = `rgba(0,0,0,${0.11 * k})`;
      actx.beginPath(); actx.arc(x, y + 6, 1.2, 0, Math.PI * 2); actx.fill();
    }
  }
}

/**
 * Per-panel finish variation for a roughness (or clear-coat roughness) canvas: every skin panel between consecutive
 * station lines `us` and stringer lines `vs` gets its own offset drawn as a translucent white / black overlay, so
 * neighbouring panels catch the sun slightly differently (a real riveted skin is never one uniform sheet: panels
 * are painted, repaired and polished at different times). `amp` is the peak offset in 8-bit units; `channel`
 * picks the overlay colour ('all' for a grey roughness map, 'g' for the clear-coat map's green channel). The
 * seams themselves are drawn a little rougher (`seam` px wide, +`seamAmp`): paint pools and chips along a rivet row.
 */
export function panelVariation(ctx: CanvasRenderingContext2D, w: number, h: number, us: number[], vs: number[], rng: Rng, amp: number, channel: 'all' | 'g', o: { y0?: number; y1?: number; seam?: number; seamAmp?: number } = {}): void {
  const y0 = o.y0 ?? 0, y1 = o.y1 ?? h;
  const white = channel === 'g' ? '0,255,0' : '255,255,255';
  const U = [0, ...us.filter((u) => u > 0 && u < 1).sort((a, b) => a - b), 1].map((u) => u * w);
  const V = [y0, ...vs.map((v) => v * h).filter((y) => y > y0 && y < y1).sort((a, b) => a - b), y1];
  for (let i = 0; i < U.length - 1; i++) {
    for (let j = 0; j < V.length - 1; j++) {
      const d = (rng.next() * 2 - 1) * amp;
      ctx.fillStyle = d >= 0 ? `rgba(${white},${d / 255})` : `rgba(0,0,0,${-d / 255})`;
      ctx.fillRect(U[i], V[j], U[i + 1] - U[i], V[j + 1] - V[j]);
    }
  }
  const seam = o.seam ?? 3, seamAmp = o.seamAmp ?? 22;
  ctx.strokeStyle = `rgba(${white},${seamAmp / 255})`; ctx.lineWidth = seam;
  for (const x of U.slice(1, -1)) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
  for (const y of V.slice(1, -1)) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
}

/** Soft wear patch (rougher or duller) centred at (x, y) with radius r: rubbed paint around handles, steps and seams. */
export function wear(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, amp: number, channel: 'all' | 'g' = 'all'): void {
  const white = amp < 0 ? '0,0,0' : channel === 'g' ? '0,255,0' : '255,255,255';
  amp = Math.abs(amp);
  const g = ctx.createRadialGradient(x, y, 0, x, y, 1);
  g.addColorStop(0, `rgba(${white},${amp / 255})`); g.addColorStop(0.55, `rgba(${white},${amp * 0.5 / 255})`); g.addColorStop(1, `rgba(${white},0)`);
  ctx.save();
  ctx.translate(x, y); ctx.scale(rx, ry); ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.fillRect(x - 1, y - 1, 2, 2);
  ctx.restore();
}

/**
 * Paint chips: small irregular flakes knocked off down to the bare aluminium, scattered inside an ellipse (rx, ry)
 * around (x, y). Drawn as light metal in the albedo, white in the metalness canvas and black in the clear-coat canvas
 * (a chip has no coat), with a dark rim of exposed primer in the albedo so the flake reads as a hole in the paint.
 */
export function chips(actx: CanvasRenderingContext2D, mctx: CanvasRenderingContext2D | null, kctx: CanvasRenderingContext2D | null, rng: Rng, x: number, y: number, rx: number, ry: number, count: number, size = 2.2): void {
  for (let i = 0; i < count; i++) {
    // denser toward the centre of the patch
    const a = rng.range(0, Math.PI * 2), d = Math.sqrt(rng.next());
    const cx = x + Math.cos(a) * d * rx, cy = y + Math.sin(a) * d * ry;
    const r = size * rng.range(0.5, 1.4), sx = rng.range(0.7, 1.5), sy = rng.range(0.7, 1.5);
    const flake = (ctx: CanvasRenderingContext2D, style: string, grow: number) => {
      ctx.fillStyle = style;
      ctx.beginPath(); ctx.ellipse(cx, cy, r * sx + grow, r * sy + grow, a, 0, Math.PI * 2); ctx.fill();
    };
    flake(actx, 'rgba(70,60,45,0.7)', 0.8);
    flake(actx, '#bcc0c4', 0);
    if (mctx) flake(mctx, '#ffffff', 0);
    if (kctx) flake(kctx, '#000000', 0.4);
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
/**
 * Cabin doors on each side (body x): the pilot's door hinged at its front edge with the handle by its aft edge, the
 * rear cabin door hinged at its rear edge with the handle by its front edge; each door carries the side window
 * between x0 and x1 and its bottom line is at y -0.42. The seams are painted (fuselageMaps) and the handles,
 * hinges and steps are fittings (buildFittings).
 */
export const DOORS: { x0: number; x1: number; handleX: number; hingeX: number; stepX: number }[] = [
  { x0: 1.77, x1: 0.95, handleX: 1.08, hingeX: 1.81, stepX: 1.3 },
  { x0: 0.85, x1: -0.42, handleX: 0.72, hingeX: -0.46, stepX: 0.2 },
];

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
  /** side window cut-outs [front x, aft x, top height] and their common sill height (the glazing seals follow them) */
  windows: [number, number, number][];
  windowSill: number;
  /** wraparound windshield cut-out [front x at the cowl, aft x at the roof line, base height on the sides] */
  windshield: [number, number, number];
}

/**
 * Tileable orange-peel normal for a sprayed clear coat: soft dimples a millimetre or two across that make the
 * mirror image in the coat wobble slightly. Repeated `ru` x `rv` times over the surface it belongs to.
 */
export function orangePeelNormal(rng: Rng, ru: number, rv: number): THREE.CanvasTexture {
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

/** Finishes of the untextured parts; all of them share one `partsMaterial` (colour/roughness/metalness per vertex). */
export const SURF = {
  /** bare aluminium fittings (cleats, rails, hubs): satin, not chrome */
  metal: { color: 0x9a9ea3, roughness: 0.52, metalness: 0.85 },
  /** struts, spreader bars and jury struts: steel tube painted the livery grey-white, semi-gloss enamel */
  strut: { color: 0xd9d8d2, roughness: 0.42, metalness: 0.0 },
  /** bracing wires: dull galvanised steel */
  wire: { color: 0x6a6d70, roughness: 0.6, metalness: 0.7 },
  darkMetal: { color: 0x2c2f33, roughness: 0.5, metalness: 0.6 },
  /** polished spinner: picks up a tight sun highlight */
  spinner: { color: 0xc4c8ce, roughness: 0.16, metalness: 0.95 },
  /** exhaust tailpipe: heat-blued stainless, matte from scale */
  exhaust: { color: 0x5a4a3c, roughness: 0.6, metalness: 0.9 },
  /** soot-black bore of the exhaust mouth */
  soot: { color: 0x0a0a0a, roughness: 0.95, metalness: 0.0 },
  /** engine seen through the inlet: grey-enamelled crankcase / nose case, black finned cylinders */
  engineCase: { color: 0x5c6064, roughness: 0.55, metalness: 0.75 },
  cylinder: { color: 0x1e2022, roughness: 0.65, metalness: 0.55 },
  /** baffle plate behind the cylinders (sheet aluminium in shadow) */
  baffle: { color: 0x2a2c2e, roughness: 0.7, metalness: 0.4 },
  /** cowl and scoop interiors: zinc-chromate primed sheet, dull */
  duct: { color: 0x2f352c, roughness: 0.8, metalness: 0.1 },
  rubber: { color: 0x111214, roughness: 0.92, metalness: 0.0 },
  /** cabin trim: window-band / reveal vinyl, headliner bows, bulkheads (the lining itself is textured, see cabinMaps) */
  bow: { color: 0x9a958c, roughness: 0.6, metalness: 0.0 },
  trim: { color: 0x2e3136, roughness: 0.62, metalness: 0.04 },
  sill: { color: 0x5c6066, roughness: 0.5, metalness: 0.1 },
  bulkhead: { color: 0x6f6a62, roughness: 0.9, metalness: 0.0 },
  visorArm: { color: 0x9a9ea4, roughness: 0.35, metalness: 0.9 },
  plastic: { color: 0x3a3d42, roughness: 0.7, metalness: 0.0 },
  lightPlastic: { color: 0xbfbcb4, roughness: 0.6, metalness: 0.0 },
  leather: { color: 0x7a5535, roughness: 0.55, metalness: 0.0 },
  carpet: { color: 0x35302b, roughness: 0.95, metalness: 0.0 },
  belt: { color: 0x3c3f44, roughness: 0.9, metalness: 0.0 },
  prop: { color: 0x1e1f22, roughness: 0.5, metalness: 0.6 },
  propTip: { color: 0xf2c230, roughness: 0.5, metalness: 0.0 },
  shirt: { color: 0x2f4f6f, roughness: 0.85, metalness: 0.0 },
  /** open collar and cuffs of the pilot's shirt (a lighter trim) */
  collar: { color: 0x9fb3c6, roughness: 0.85, metalness: 0.0 },
  cap: { color: 0x22283a, roughness: 0.9, metalness: 0.0 },
  skin: { color: 0xc8956c, roughness: 0.7, metalness: 0.0 },
  headset: { color: 0x1a1a1c, roughness: 0.5, metalness: 0.0 },
  /** folded sectional chart on the copilot seat */
  paper: { color: 0xe9e4d6, roughness: 0.92, metalness: 0.0 },
  chartInk: { color: 0xb6cbd2, roughness: 0.92, metalness: 0.0 },
  /** baggage in the aft bay: canvas duffels, a cooler and a hard case */
  duffelRed: { color: 0x8c2f2a, roughness: 0.9, metalness: 0.0 },
  duffelOlive: { color: 0x5d6640, roughness: 0.9, metalness: 0.0 },
  cooler: { color: 0xd8dde0, roughness: 0.5, metalness: 0.0 },
  hardCase: { color: 0x1f2226, roughness: 0.55, metalness: 0.1 },
  throttle: { color: 0x151618, roughness: 0.5, metalness: 0.0 },
  propKnob: { color: 0x2a5fb0, roughness: 0.5, metalness: 0.0 },
  mixture: { color: 0xc0392b, roughness: 0.6, metalness: 0.0 },
  flapKnob: { color: 0xe8e6e0, roughness: 0.5, metalness: 0.0 },
  extinguisher: { color: 0xc0392b, roughness: 0.4, metalness: 0.3 },
} satisfies Record<string, Surf>;
