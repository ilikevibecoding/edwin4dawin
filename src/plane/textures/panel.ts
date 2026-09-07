import * as THREE from 'three';
import { Rng } from '../../core/seed';
import { canvas, toTexture } from './common';

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
  /**
   * airspeed: 40 kt at 1 o'clock, 35 deg per 20 kt (a little compressed at the low end like a real ASI) to 200 kt
   * at 10:30, leaving the top 77 deg of the dial for the legend; the numerals never collide at the top
   */
  asi: (kt: number) => piecewise(kt, [[0, 0], [40, 35], [60, 68], [80, 104], [100, 140], [120, 176], [140, 212], [160, 248], [180, 284], [200, 318]]),
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
  /** laminated checklist card (portrait) */
  checklist: uvRect(1264, PLACARD_Y + 6, 1324, PLACARD_Y + 84),
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
    arcBand(ctx, cx, cy, r, DIAL.asi(48), DIAL.asi(95), 0.94, r * 0.06, '#f4f4f4');
    arcBand(ctx, cx, cy, r, DIAL.asi(58), DIAL.asi(140), 0.87, r * 0.06, '#2fbf58');
    arcBand(ctx, cx, cy, r, DIAL.asi(140), DIAL.asi(180), 0.87, r * 0.06, '#f2c230');
    tick(ctx, cx, cy, r, DIAL.asi(180), 0.70, 0.97, r * 0.06, '#e0322a');
    // ticks at the rim inside the arcs, numerals on a ring just inside them (35 deg apart: no collisions)
    for (let kt = 40; kt <= 200; kt += 5) tick(ctx, cx, cy, r, DIAL.asi(kt), kt % 20 ? 0.75 : 0.70, 0.83, kt % 20 ? (kt % 10 ? r * 0.018 : r * 0.028) : r * 0.045);
    for (let kt = 40; kt <= 200; kt += 20) dialText(ctx, cx, cy, r, DIAL.asi(kt), 0.56, String(kt), 0.18);
    dialText(ctx, cx, cy, r, 0, 0.30, 'AIRSPEED', 0.10, '#d0d0d0', 'normal'); dialText(ctx, cx, cy, r, 0, 0.18, 'KNOTS', 0.09, '#d0d0d0', 'normal'); }
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
    dialText(ctx, cx, cy, r, 90, 0.12, 'VERTICAL', 0.08, '#d0d0d0', 'normal'); dialText(ctx, cx, cy, r, 90, 0.25, 'SPEED', 0.08, '#d0d0d0', 'normal');
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
    // minor graduations (five per major on the big dials, two on the small ones) then the majors over them
    const minor = big ? 5 : 2;
    for (let i = 0; i <= n * minor; i++) if (i % minor) tick(ctx, cx, cy, r, ang(i / (n * minor)), 0.78, 0.86, r * 0.02);
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
    // GNS-style unit: a bevelled dark bezel, the screen sunk behind a black surround, a column of small keys on
    // each side (COM / VLOC flip-flops, D->, MENU, CLR, ENT) and the labelled page keys under the screen (the keys
    // themselves are parts standing off the face, see cockpitPanel; the legends live here)
    const bz = ctx.createLinearGradient(0, sy - 22, 0, sy + sh + 22);
    bz.addColorStop(0, '#41454c'); bz.addColorStop(0.08, '#2e3136'); bz.addColorStop(1, '#1f2226');
    ctx.fillStyle = bz; ctx.beginPath(); ctx.roundRect(sx - 22, sy - 22, sw + 44, sh + 44, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(sx - 21, sy - 21, sw + 42, sh + 42, 6); ctx.stroke();
    ctx.fillStyle = '#07080a'; ctx.fillRect(sx - 5, sy - 5, sw + 10, sh + 10);
    const key = (x: number, y: number, w: number, h: number) => {
      ctx.fillStyle = '#0d0e10'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      const kg = ctx.createLinearGradient(0, y, 0, y + h); kg.addColorStop(0, '#3a3d43'); kg.addColorStop(1, '#202226');
      ctx.fillStyle = kg; ctx.fillRect(x, y, w, h);
    };
    for (let i = 0; i < 4; i++) { const kx = PX(0.010 + i * 0.05) - PR(0.014); key(kx, sy + sh + 7, PR(0.028), 10); label(ctx, kx + PR(0.014), sy + sh + 25, ['CDI', 'OBS', 'MSG', 'FPL'][i], 7, '#c8ccd2', 'normal'); }
    for (let i = 0; i < 3; i++) { key(sx - 17, sy + 14 + i * 26, 11, 16); key(sx + sw + 6, sy + 14 + i * 26, 11, 16); }
    label(ctx, sx - 11, sy + 8, 'C', 6, '#c8ccd2', 'normal'); label(ctx, sx - 11, sy + 34, 'V', 6, '#c8ccd2', 'normal');
    label(ctx, sx + sw + 12, sy + 8, 'D', 6, '#c8ccd2', 'normal'); label(ctx, sx + sw + 12, sy + 60, 'ENT', 5, '#c8ccd2', 'normal');
    // the two concentric tuning knobs in the lower corners of the bezel (painted here, their bodies are parts)
    for (const kx of [sx - 11, sx + sw + 11]) { ctx.fillStyle = '#4a4e55'; ctx.beginPath(); ctx.arc(kx, sy + sh + 4, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#1c1e22'; ctx.beginPath(); ctx.arc(kx, sy + sh + 4, 5, 0, 7); ctx.fill(); }
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
  // checklist card: a cream laminated card with a title band and lines of items with their tick boxes
  { const x0 = 1264, y0 = PLACARD_Y + 6, cw = 60, chh = 78;
    ctx.fillStyle = '#efe9d8'; ctx.fillRect(x0, y0, cw, chh);
    ctx.fillStyle = '#1c2d5a'; ctx.fillRect(x0, y0, cw, 11);
    label(ctx, x0 + cw / 2, y0 + 6, 'BEFORE TAKEOFF', 5, '#ffffff');
    const items = ['FUEL SEL  BOTH', 'MIXTURE  RICH', 'PROP  HIGH RPM', 'FLAPS  CLIMB', 'TRIM  SET', 'WATER RUD  UP', 'DOORS  LATCHED', 'BELTS  FASTENED', 'RUN-UP  1700'];
    items.forEach((t, i) => { const y = y0 + 17 + i * 6.6; ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 0.6; ctx.strokeRect(x0 + 3, y - 2, 3.5, 3.5); label(ctx, x0 + 9, y, t, 3.6, '#22232a', 'normal', 'left'); });
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, cw - 1, chh - 1); }
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
  patches: { white: [16, 300], black: [80, 300], orange: [144, 300], red: [208, 300], bezel: [272, 300], grey: [336, 300], yellow: [400, 300], glass: [464, 300], shadow: [16, 364] } as Record<string, [number, number]>,
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
  // the needles' shadow: half-transparent black (the patch is cleared first, the atlas is otherwise opaque)
  { const [px, py] = P.shadow; ctx.clearRect(px - 16, py - 16, 32, 32); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(px - 16, py - 16, 32, 32); }
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
    // data column: large live numbers the pilot can read from the seat, each in its own lit data field (the
    // column is a visibly lit part of the screen, so the digits sit on a display and not on the panel)
    ctx.fillStyle = '#0b2035'; ctx.fillRect(mapW, 0, w - mapW, h);
    ctx.fillStyle = '#3a5f8a'; ctx.fillRect(mapW, 0, 2, h);
    const rows: [string, string, string][] = [['GS', `${gs}`, 'kt'], ['TRK', `${trk.toString().padStart(3, '0')}`, '°'], ['ALT', `${alt}`, 'ft'], ['VS', `${vs > 0 ? '+' : ''}${vs}`, 'fpm']];
    rows.forEach(([k, v, unit], i) => {
      const y0 = i * (h / 4);
      ctx.fillStyle = '#132c47'; ctx.fillRect(mapW + 5, y0 + 3, w - mapW - 9, h / 4 - 6);
      ctx.strokeStyle = '#2f5480'; ctx.lineWidth = 1; ctx.strokeRect(mapW + 5.5, y0 + 3.5, w - mapW - 10, h / 4 - 7);
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#9cc4ea'; ctx.fillText(k, mapW + 9, y0 + 6);
      ctx.textAlign = 'right'; ctx.fillText(unit, w - 8, y0 + 6);
      ctx.font = 'bold 28px monospace'; ctx.textBaseline = 'bottom'; ctx.fillStyle = i === 1 ? '#ff5fb0' : '#f4f4f4'; ctx.fillText(v, w - 8, y0 + h / 4 - 4);
    });
    // the display's active-area edge: a thin lit border all round, so the screen reads as one lit rectangle
    ctx.strokeStyle = '#3a5f8a'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, w - 2, h - 2);
    this.texture.needsUpdate = true;
    return true;
  }
}
