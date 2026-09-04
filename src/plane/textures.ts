import * as THREE from 'three';
import { Rng } from '../core/seed';

export interface PbrMaps { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture; normalMap: THREE.CanvasTexture; }

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

/** Panel lines and rivets drawn into both the height canvas and (faintly) the albedo. */
function panels(hctx: CanvasRenderingContext2D, actx: CanvasRenderingContext2D, w: number, h: number, stationsU: number[], stringersV: number[], rivetSpacing: number): void {
  hctx.strokeStyle = '#5a5a5a';
  hctx.lineWidth = 2.2;
  actx.strokeStyle = 'rgba(30,30,35,0.22)';
  actx.lineWidth = 1.5;
  for (const u of stationsU) {
    const x = u * w;
    hctx.beginPath(); hctx.moveTo(x, 0); hctx.lineTo(x, h); hctx.stroke();
    actx.beginPath(); actx.moveTo(x, 0); actx.lineTo(x, h); actx.stroke();
    // rivet rows either side of the seam
    for (const off of [-7, 7]) {
      for (let y = rivetSpacing / 2; y < h; y += rivetSpacing) {
        hctx.fillStyle = '#b8b8b8';
        hctx.beginPath(); hctx.arc(x + off, y, 1.6, 0, Math.PI * 2); hctx.fill();
        actx.fillStyle = 'rgba(255,255,255,0.10)';
        actx.beginPath(); actx.arc(x + off, y, 1.4, 0, Math.PI * 2); actx.fill();
        actx.fillStyle = 'rgba(0,0,0,0.10)';
        actx.beginPath(); actx.arc(x + off, y + 1.2, 1.2, 0, Math.PI * 2); actx.fill();
      }
    }
  }
  for (const v of stringersV) {
    const y = v * h;
    hctx.strokeStyle = '#6a6a6a';
    hctx.lineWidth = 1.4;
    hctx.beginPath(); hctx.moveTo(0, y); hctx.lineTo(w, y); hctx.stroke();
    actx.strokeStyle = 'rgba(30,30,35,0.12)';
    actx.beginPath(); actx.moveTo(0, y); actx.lineTo(w, y); actx.stroke();
    for (let x = rivetSpacing / 2; x < w; x += rivetSpacing) {
      hctx.fillStyle = '#b0b0b0';
      hctx.beginPath(); hctx.arc(x, y + 5, 1.5, 0, Math.PI * 2); hctx.fill();
      actx.fillStyle = 'rgba(0,0,0,0.08)';
      actx.beginPath(); actx.arc(x, y + 6, 1.2, 0, Math.PI * 2); actx.fill();
    }
  }
}

export const LIVERY = {
  upper: '#f3f1ea',
  lower: '#f6c230',
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
  const pxU = w / lay.length, pxV = h / lay.perimeter(x);
  const v = lay.vOf(x, y) ?? 0.25;
  const fontPx = heightM / 0.72 * pxU;
  for (const side of [1, -1]) {
    ctx.save();
    ctx.translate(lay.uOf(x) * w, (side > 0 ? v : 1 - v) * h);
    ctx.scale(side > 0 ? -1 : 1, side * (pxV / pxU));
    ctx.fillStyle = color;
    ctx.font = `${weight} ${fontPx.toFixed(1)}px ${family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
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
  // registration on the rear fuselage and the operator script under the cabin windows (both sides, readable)
  bodyText(actx, lay, w, h, LIVERY.registration, -2.65, 0.03, 0.22, 'bold', '"Helvetica Neue", Arial, sans-serif', LIVERY.cheat);
  bodyText(actx, lay, w, h, 'BAHÍA VISTA AIR TAXI', -0.25, 0.10, 0.085, 'bold italic', 'Georgia, "Times New Roman", serif', LIVERY.cheat);
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
  // exhaust soot on the lower starboard side aft of the cowl, oil streaks on the belly, grime along seams
  const soot = actx.createLinearGradient(w * 0.09, 0, w * 0.45, 0);
  soot.addColorStop(0, 'rgba(25,22,20,0.55)'); soot.addColorStop(1, 'rgba(25,22,20,0)');
  actx.fillStyle = soot; actx.fillRect(w * 0.09, h * 0.36, w * 0.36, h * 0.12);
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
  rctx.fillStyle = '#5a5a5a'; rctx.fillRect(0, 0, w, h);
  rctx.fillStyle = '#7a7a7a'; rctx.fillRect(0, 0, ringU, h);
  rctx.fillStyle = 'rgba(160,160,160,0.6)'; rctx.fillRect(w * 0.09, h * 0.36, w * 0.3, h * 0.12);
  grime(rctx, rng, w, h, 160, 0.25, '150,150,150');
  for (let i = 0; i < 400; i++) {
    rctx.strokeStyle = `rgba(120,120,120,${rng.range(0.2, 0.5)})`;
    rctx.lineWidth = 1;
    const x = rng.range(0, w), y = rng.range(0, h);
    rctx.beginPath(); rctx.moveTo(x, y); rctx.lineTo(x + rng.range(-40, 40), y + rng.range(-6, 6)); rctx.stroke();
  }
  return { map: toTexture(ac, true), roughnessMap: toTexture(rc, false), normalMap: toTexture(heightToNormal(hc, 2.4), false) };
}

/** Wing (both halves and tail share): u chordwise (0 trailing edge -> 0.5 leading edge -> 1 trailing), v spanwise. */
export function wingMaps(): PbrMaps {
  const w = 1024, h = 1024;
  const rng = new Rng('wing-paint');
  const [ac, actx] = canvas(w, h);
  const [hc, hctx] = canvas(w, h);
  const [rc, rctx] = canvas(w, h);
  hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, w, h);
  actx.fillStyle = LIVERY.upper; actx.fillRect(0, 0, w, h);
  // yellow wingtip with a navy band and red pinstripe, yellow leading-edge stripe
  actx.fillStyle = LIVERY.lower; actx.fillRect(0, h * 0.905, w, h * 0.095);
  actx.fillStyle = LIVERY.cheat; actx.fillRect(0, h * 0.885, w, h * 0.02);
  actx.fillStyle = LIVERY.pin; actx.fillRect(0, h * 0.876, w, h * 0.009);
  // leading-edge stripe: 10% chord over the top, 3.5% under (u 0.5 is the leading edge)
  actx.fillStyle = LIVERY.lower; actx.fillRect(w * 0.45, 0, w * 0.0675, h);
  // rib lines spanwise every ~0.55 m, spar and hinge lines chordwise
  const ribs: number[] = [];
  for (let v = 0.04; v < 0.87; v += 0.075) ribs.push(v);
  panels(hctx, actx, w, h, [0.14, 0.33, 0.5, 0.67, 0.86], ribs, 22);
  // walkway by the root and a fuel cap on the upper surface
  actx.fillStyle = '#2a2d31'; actx.fillRect(w * 0.30, h * 0.12, w * 0.11, h * 0.08);
  actx.fillStyle = '#6d7277'; actx.beginPath(); actx.arc(w * 0.40, h * 0.27, 9, 0, 7); actx.fill();
  // leading-edge chipping and general grime
  for (let i = 0; i < 90; i++) {
    actx.fillStyle = `rgba(90,90,95,${rng.range(0.3, 0.7)})`;
    actx.fillRect(w * 0.5 + rng.range(-8, 8), rng.range(0, h), rng.range(1, 3), rng.range(1, 4));
  }
  grime(actx, rng, w, h, 80, 0.06);
  rctx.fillStyle = '#5a5a5a'; rctx.fillRect(0, 0, w, h);
  rctx.fillStyle = '#909090'; rctx.fillRect(w * 0.30, h * 0.12, w * 0.11, h * 0.08);
  grime(rctx, rng, w, h, 90, 0.2, '150,150,150');
  return { map: toTexture(ac, true), roughnessMap: toTexture(rc, false), normalMap: toTexture(heightToNormal(hc, 2.0), false) };
}

/** Floats: u bow..stern, v around. Aluminium with a dark anti-slip deck and water staining. */
export function floatMaps(): PbrMaps {
  const w = 1024, h = 512;
  const rng = new Rng('float-paint');
  const [ac, actx] = canvas(w, h);
  const [hc, hctx] = canvas(w, h);
  const [rc, rctx] = canvas(w, h);
  hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, w, h);
  actx.fillStyle = '#cfd3d6'; actx.fillRect(0, 0, w, h);
  // deck (top, v around 0 and 1)
  actx.fillStyle = '#2b2e31'; actx.fillRect(0, 0, w, h * 0.09); actx.fillRect(0, h * 0.91, w, h * 0.09);
  // waterline stripe & yellow keel band
  actx.fillStyle = LIVERY.cheat; actx.fillRect(0, h * 0.30, w, h * 0.03); actx.fillRect(0, h * 0.67, w, h * 0.03);
  actx.fillStyle = LIVERY.lower; actx.fillRect(0, h * 0.42, w, h * 0.16);
  panels(hctx, actx, w, h, [0.12, 0.25, 0.38, 0.5, 0.55, 0.68, 0.82, 0.93], [0.09, 0.3, 0.5, 0.7, 0.91], 20);
  // water stains & algae line near the waterline, scuffs on the deck
  for (let i = 0; i < 120; i++) {
    actx.strokeStyle = `rgba(70,85,75,${rng.range(0.08, 0.28)})`;
    actx.lineWidth = rng.range(1, 4);
    const x = rng.range(0, w), y = rng.range(h * 0.28, h * 0.72);
    actx.beginPath(); actx.moveTo(x, y); actx.lineTo(x + rng.range(-10, 10), y + rng.range(10, 60) * (y < h / 2 ? 1 : -1)); actx.stroke();
  }
  grime(actx, rng, w, h, 100, 0.1, '60,60,55');
  rctx.fillStyle = '#6a6a6a'; rctx.fillRect(0, 0, w, h);
  rctx.fillStyle = '#c0c0c0'; rctx.fillRect(0, 0, w, h * 0.09); rctx.fillRect(0, h * 0.91, w, h * 0.09);
  grime(rctx, rng, w, h, 100, 0.25, '160,160,160');
  return { map: toTexture(ac, true), roughnessMap: toTexture(rc, false), normalMap: toTexture(heightToNormal(hc, 2.2), false) };
}

/** Instrument panel texture (albedo + emissive share the same canvas). */
export function panelTexture(): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const w = 1024, h = 384;
  const rng = new Rng('panel-brush');
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = '#1c1e21'; ctx.fillRect(0, 0, w, h);
  // brushed texture
  for (let i = 0; i < 1400; i++) { ctx.strokeStyle = `rgba(255,255,255,${rng.next() * 0.03})`; ctx.beginPath(); const y = rng.next() * h; ctx.moveTo(0, y); ctx.lineTo(w, y + rng.next() * 2); ctx.stroke(); }
  const gauge = (x: number, y: number, r: number, label: string, needle: number, arcColor = '#e8e8e8') => {
    ctx.fillStyle = '#0b0c0e'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3d4146'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = arcColor; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) { const a = -Math.PI * 0.75 + (i / 11) * Math.PI * 1.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78); ctx.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9); ctx.stroke(); }
    ctx.fillStyle = '#d8d8d8'; ctx.font = `${Math.round(r * 0.26)}px Arial`; ctx.textAlign = 'center'; ctx.fillText(label, x, y + r * 0.5);
    const a = -Math.PI * 0.75 + needle * Math.PI * 1.5;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75); ctx.stroke();
    ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.arc(x, y, r * 0.08, 0, 7); ctx.fill();
  };
  // six-pack left, engine gauges right, GPS screen centre
  gauge(110, 100, 62, 'KIAS', 0.42); gauge(250, 100, 62, 'ATT', 0.5, '#4aa3df'); gauge(390, 100, 62, 'ALT', 0.3);
  gauge(110, 250, 62, 'TURN', 0.5); gauge(250, 250, 62, 'HDG', 0.6); gauge(390, 250, 62, 'VSI', 0.5);
  // attitude indicator horizon
  ctx.fillStyle = '#2f79c2'; ctx.beginPath(); ctx.arc(250, 100, 50, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#7a4b23'; ctx.beginPath(); ctx.arc(250, 100, 50, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#f5d142'; ctx.fillRect(220, 98, 60, 4);
  // GPS / MFD screen
  ctx.fillStyle = '#06131c'; ctx.fillRect(500, 60, 240, 170);
  ctx.strokeStyle = '#3a4a55'; ctx.lineWidth = 6; ctx.strokeRect(500, 60, 240, 170);
  ctx.fillStyle = '#1d6fa5'; ctx.fillRect(506, 66, 228, 158);
  ctx.fillStyle = '#7bb661'; ctx.beginPath(); ctx.ellipse(620, 150, 60, 30, 0.3, 0, 7); ctx.fill();
  ctx.fillStyle = '#e6c47a'; ctx.beginPath(); ctx.ellipse(560, 120, 26, 16, -0.2, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ff77aa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(520, 210); ctx.lineTo(600, 150); ctx.lineTo(700, 90); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'left'; ctx.fillText('GS 118  TRK 342  DIS 12.4', 512, 84);
  ctx.fillText('BAHÍA VISTA  RWY 09', 512, 216);
  // engine cluster
  gauge(830, 90, 48, 'RPM', 0.62); gauge(940, 90, 48, 'MAP', 0.55);
  gauge(830, 200, 40, 'OIL', 0.5, '#7ad07a'); gauge(940, 200, 40, 'FUEL', 0.7, '#7ad07a');
  gauge(830, 300, 36, 'AMP', 0.5); gauge(940, 300, 36, 'EGT', 0.55);
  // switch rows
  for (let i = 0; i < 14; i++) {
    const x = 60 + i * 34, y = 330;
    ctx.fillStyle = '#2b2f34'; ctx.fillRect(x - 8, y - 14, 16, 28);
    ctx.fillStyle = i % 3 === 0 ? '#c9a227' : '#d8d8d8'; ctx.fillRect(x - 4, y - (i % 2 ? 10 : 0), 8, 10);
  }
  ctx.fillStyle = '#c0392b'; ctx.fillRect(560, 250, 40, 40); ctx.fillStyle = '#fff'; ctx.font = '11px Arial'; ctx.textAlign = 'center'; ctx.fillText('FUEL', 580, 300); ctx.fillText('CUTOFF', 580, 312);
  ctx.fillStyle = '#e8e8e8'; ctx.font = '12px Arial'; ctx.fillText('MASTER   AVIONICS   PITOT HEAT   NAV   STROBE   BEACON   LDG   TAXI   FUEL PUMP', 300, 372);
  const map = toTexture(c, true, 4);
  map.flipY = true; // panel canvas is drawn top-down like a normal image
  // emissive: only gauges and screen glow
  const [e, ectx] = canvas(w, h);
  ectx.fillStyle = '#000'; ectx.fillRect(0, 0, w, h);
  ectx.drawImage(c, 0, 0);
  ectx.globalCompositeOperation = 'multiply';
  ectx.fillStyle = '#4c4c50'; ectx.fillRect(0, 0, w, h);
  ectx.globalCompositeOperation = 'source-over';
  ectx.fillStyle = 'rgba(0,0,0,0.85)'; ectx.fillRect(0, 320, w, 64);
  const emissive = toTexture(e, true, 4);
  emissive.flipY = true;
  return { map, emissive };
}

/** Radial-blur disc texture for the spinning propeller. */
export function propDiscTexture(): THREE.CanvasTexture {
  const s = 256;
  const [c, ctx] = canvas(s, s);
  const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(40,40,44,0.55)');
  g.addColorStop(0.5, 'rgba(40,40,44,0.22)');
  g.addColorStop(0.92, 'rgba(170,150,60,0.22)');
  g.addColorStop(1, 'rgba(170,150,60,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
