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
  upper: '#f4f0e6',
  lower: '#f6c236',
  cheat: '#0f5c6e',
  pin: '#ff6f61',
  registration: 'N726BV',
};

/** Fuselage: u = nose(0) .. tail(1), v = top(0) .. right(0.25) .. belly(0.5) .. left(0.75) .. top(1). */
export function fuselageMaps(): PbrMaps {
  const w = 2048, h = 1024;
  const rng = new Rng('fuselage-paint');
  const [ac, actx] = canvas(w, h);
  const [hc, hctx] = canvas(w, h);
  const [rc, rctx] = canvas(w, h);
  hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, w, h);
  // base: upper white, lower yellow. The cheat line sits at ~v 0.33 and 0.67 (just below the windows)
  actx.fillStyle = LIVERY.upper; actx.fillRect(0, 0, w, h);
  const cheatV = 0.245;
  const belly = (v0: number, v1: number) => { actx.fillStyle = LIVERY.lower; actx.fillRect(0, v0 * h, w, (v1 - v0) * h); };
  belly(cheatV, 1 - cheatV);
  // cheat line with pinstripe (both sides), swooping up toward the tail
  for (const side of [0, 1]) {
    const base = side === 0 ? cheatV : 1 - cheatV;
    const dir = side === 0 ? -1 : 1;
    actx.save();
    actx.beginPath();
    actx.moveTo(0, base * h);
    for (let x = 0; x <= w; x += 32) {
      const u = x / w;
      const swoop = Math.max(0, (u - 0.55) / 0.45) ** 2 * 0.09 * dir;
      actx.lineTo(x, (base + swoop) * h);
    }
    actx.lineTo(w, (base + 0.09 * dir + (side === 0 ? -0.05 : 0.05)) * h);
    actx.lineTo(w, (base + (side === 0 ? -0.05 : 0.05)) * h);
    actx.lineTo(0, (base + (side === 0 ? -0.045 : 0.045)) * h);
    actx.closePath();
    actx.fillStyle = LIVERY.cheat;
    actx.fill();
    actx.lineWidth = 6; actx.strokeStyle = LIVERY.pin; actx.stroke();
    actx.restore();
  }
  // engine cowl: darker charcoal band at the nose with cooling louvres
  actx.fillStyle = '#2e3136'; actx.fillRect(0, 0, w * 0.085, h);
  actx.fillStyle = '#1b1d20';
  for (let i = 0; i < 12; i++) actx.fillRect(w * 0.052, (i / 12) * h + 6, w * 0.012, h / 12 - 12);
  // registration on both sides of the rear fuselage
  actx.fillStyle = LIVERY.cheat;
  actx.font = 'bold 118px "Helvetica Neue", Arial, sans-serif';
  actx.textAlign = 'center';
  actx.save(); actx.translate(w * 0.72, h * 0.235); actx.fillText(LIVERY.registration, 0, 0); actx.restore();
  actx.save(); actx.translate(w * 0.72, h * 0.81); actx.scale(-1, 1); actx.fillText(LIVERY.registration, 0, 0); actx.restore();
  // small placard text and a sun logo on the fin area (u>0.9)
  actx.font = 'bold 34px Arial'; actx.fillStyle = '#22333a';
  actx.fillText('BAHÍA VISTA AIR TAXI', w * 0.62, h * 0.31);
  actx.save(); actx.translate(w * 0.62, h * 0.705); actx.scale(-1, 1); actx.fillText('BAHÍA VISTA AIR TAXI', 0, 0); actx.restore();
  // panel lines / rivets
  panels(hctx, actx, w, h, [0.085, 0.13, 0.19, 0.26, 0.33, 0.41, 0.5, 0.58, 0.66, 0.74, 0.82, 0.9], [0.12, 0.2, 0.3, 0.42, 0.5, 0.58, 0.7, 0.8, 0.88], 26);
  // door outlines (both sides at cabin u 0.3..0.42, v around 0.2..0.35 / 0.65..0.8)
  hctx.strokeStyle = '#3a3a3a'; hctx.lineWidth = 3;
  actx.strokeStyle = 'rgba(20,20,25,0.35)'; actx.lineWidth = 2;
  for (const v0 of [0.19, 0.66]) {
    hctx.strokeRect(w * 0.31, v0 * h, w * 0.1, 0.15 * h);
    actx.strokeRect(w * 0.31, v0 * h, w * 0.1, 0.15 * h);
    // handle
    actx.fillStyle = '#8a8f94'; actx.fillRect(w * 0.395, (v0 + 0.09) * h, 22, 8);
  }
  // exhaust soot on the lower right side aft of the cowl, oil streaks on the belly, grime along seams
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
  rctx.fillStyle = '#7a7a7a'; rctx.fillRect(0, 0, w * 0.085, h);
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

/** Wing (both halves share): u chordwise (0 trailing edge -> 0.5 leading edge -> 1 trailing), v spanwise. */
export function wingMaps(): PbrMaps {
  const w = 1024, h = 1024;
  const rng = new Rng('wing-paint');
  const [ac, actx] = canvas(w, h);
  const [hc, hctx] = canvas(w, h);
  const [rc, rctx] = canvas(w, h);
  hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, w, h);
  actx.fillStyle = LIVERY.upper; actx.fillRect(0, 0, w, h);
  // teal wingtip band and a yellow leading-edge stripe
  actx.fillStyle = LIVERY.cheat; actx.fillRect(0, h * 0.9, w, h * 0.1);
  actx.fillStyle = LIVERY.pin; actx.fillRect(0, h * 0.885, w, h * 0.012);
  actx.fillStyle = LIVERY.lower; actx.fillRect(w * 0.46, 0, w * 0.08, h);
  // rib lines spanwise every ~0.6 m, spar line chordwise
  const ribs: number[] = [];
  for (let v = 0.04; v < 1; v += 0.075) ribs.push(v);
  panels(hctx, actx, w, h, [0.2, 0.33, 0.5, 0.67, 0.8], ribs, 22);
  // walkway / fuel cap
  actx.fillStyle = '#2a2d31'; actx.fillRect(w * 0.25, h * 0.02, w * 0.12, h * 0.06);
  actx.fillStyle = '#6d7277'; actx.beginPath(); actx.arc(w * 0.62, h * 0.18, 9, 0, 7); actx.fill();
  // leading-edge chipping and general grime
  for (let i = 0; i < 90; i++) {
    actx.fillStyle = `rgba(90,90,95,${rng.range(0.3, 0.7)})`;
    actx.fillRect(w * 0.48 + rng.range(-8, 8), rng.range(0, h), rng.range(1, 3), rng.range(1, 4));
  }
  grime(actx, rng, w, h, 80, 0.06);
  rctx.fillStyle = '#5a5a5a'; rctx.fillRect(0, 0, w, h);
  rctx.fillStyle = '#909090'; rctx.fillRect(w * 0.25, h * 0.02, w * 0.12, h * 0.06);
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
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = '#1c1e21'; ctx.fillRect(0, 0, w, h);
  // brushed texture
  for (let i = 0; i < 1400; i++) { ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.03})`; ctx.beginPath(); const y = Math.random() * h; ctx.moveTo(0, y); ctx.lineTo(w, y + Math.random() * 2); ctx.stroke(); }
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
