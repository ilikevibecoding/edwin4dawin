// Module-local animated screen atlas for d1-nav / d1-tactical. One 1024² canvas texture per room holds every
// custom display (chart wall, status columns, console strips, readout bars, boards); each display is a region
// of the atlas addressed through kit.add(..., { uv: "keep", uvRect: atlas.rect(region) }). The canvas is
// repainted at a low rate from update(t) — one draw call for all the room's animated UI.
import * as THREE from "three";
import { mulberry32 } from "../../../textures.js";

export const UI = {
  bg: "#04070e",
  bg2: "#060b16",
  blue: "#3a7bff",
  blueDim: "rgba(58,123,255,0.35)",
  blueFaint: "rgba(58,123,255,0.12)",
  cyan: "#4fd8ff",
  cyanDim: "rgba(79,216,255,0.4)",
  amber: "#ffa028",
  amberDim: "rgba(255,160,40,0.45)",
  red: "#ff2a1a",
  redDim: "rgba(255,42,26,0.4)",
  white: "#dfe8ff",
  whiteDim: "rgba(223,232,255,0.55)",
  grey: "rgba(160,170,190,0.35)",
};

export const FONT = (px, bold = true) => `${bold ? "bold " : ""}${px}px "DejaVu Sans Mono", "Liberation Mono", Menlo, Consolas, monospace`;

export class ScreenAtlas {
  constructor(size = 1024, { intensity = 1.35, fps = 8 } = {}) {
    this.size = size;
    this.canvas = document.createElement("canvas");
    this.canvas.width = size;
    this.canvas.height = size;
    this.g = this.canvas.getContext("2d");
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.wrapS = this.tex.wrapT = THREE.ClampToEdgeWrapping;
    this.tex.anisotropy = 4;
    // anti-glare finish: room lights land on the glass as a broad soft sheen, not a hot white spot
    this.material = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xffffff,
      emissiveMap: this.tex,
      emissiveIntensity: intensity,
      roughness: 0.42,
      metalness: 0,
      envMapIntensity: 0.6,
    });
    this.regions = [];
    this.period = 1 / fps;
    this.lastT = -Infinity;
  }
  /** Register a region (canvas pixels, top-down) with a painter (g, w, h, t) => void. Returns the uv rect. */
  region(x, y, w, h, painter) {
    const r = { x, y, w, h, painter };
    this.regions.push(r);
    return this.rect(r);
  }
  rect(r) {
    const S = this.size;
    return [r.x / S, 1 - (r.y + r.h) / S, (r.x + r.w) / S, 1 - r.y / S];
  }
  paint(t) {
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = UI.bg;
    g.fillRect(0, 0, this.size, this.size);
    for (const r of this.regions) {
      g.save();
      g.beginPath();
      g.rect(r.x, r.y, r.w, r.h);
      g.clip();
      g.translate(r.x, r.y);
      r.painter(g, r.w, r.h, t);
      g.restore();
    }
    this.tex.needsUpdate = true;
    this.lastT = t;
  }
  update(t) {
    if (t - this.lastT >= this.period || t < this.lastT) this.paint(t);
  }
}

// ---------------------------------------------------------------------------
// drawing helpers
// ---------------------------------------------------------------------------
export function text(g, s, x, y, px, color, align = "left", bold = true) {
  g.fillStyle = color;
  g.font = FONT(px, bold);
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillText(s, x, y);
}
export function gridBg(g, w, h, step = 16, color = UI.blueFaint) {
  g.fillStyle = UI.bg2;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = color;
  g.lineWidth = 1;
  g.beginPath();
  for (let x = step; x < w; x += step) {
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, h);
  }
  for (let y = step; y < h; y += step) {
    g.moveTo(0, y + 0.5);
    g.lineTo(w, y + 0.5);
  }
  g.stroke();
}
export function frame(g, w, h, color = UI.blueDim) {
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.strokeRect(1, 1, w - 2, h - 2);
}
export function header(g, w, title, color = UI.blue, px = 11) {
  g.fillStyle = color;
  g.fillRect(6, 6, w - 12, 2);
  text(g, title, 8, 16, px, color);
  // right-side status pips
  for (let k = 0; k < 3; k++) {
    g.fillStyle = k === 2 ? UI.amberDim : UI.blueDim;
    g.fillRect(w - 8 - (3 - k) * 14, 12, 10, 8);
  }
}
export function scanlines(g, w, h, alpha = 0.22) {
  g.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
}
// rows of label-like blocks with a value bar; some rows flagged amber/red
export function dataRows(g, x, y, w, rows, rand, t, { rowH = 12, accent = UI.blue, blink = true } = {}) {
  for (let i = 0; i < rows; i++) {
    const yy = y + i * rowH;
    const state = rand();
    const lw = w * (0.22 + rand() * 0.2);
    g.fillStyle = state < 0.08 ? UI.red : state < 0.2 ? UI.amber : accent;
    if (state < 0.08 && blink && Math.floor(t * 2 + i) % 2 === 0) g.fillStyle = UI.redDim;
    g.fillRect(x, yy, lw, 5);
    g.fillStyle = UI.grey;
    g.fillRect(x + lw + 6, yy, w * 0.12 + rand() * w * 0.1, 5);
    // value bar, wobbling with time
    const v = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * (0.4 + rand()) + i * 1.7));
    g.fillStyle = state < 0.08 ? UI.redDim : UI.blueDim;
    g.fillRect(x + w * 0.62, yy, w * 0.36, 5);
    g.fillStyle = state < 0.08 ? UI.red : state < 0.2 ? UI.amber : UI.cyan;
    g.fillRect(x + w * 0.62, yy, w * 0.36 * v, 5);
  }
}
export function waveform(g, x, y, w, h, t, rand, color = UI.cyan, freq = 0.6) {
  g.strokeStyle = UI.blueDim;
  g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, w, h);
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.beginPath();
  const n = 48;
  const k = rand() * 10;
  for (let i = 0; i <= n; i++) {
    const px = x + (i / n) * w;
    const py = y + h * (0.5 + Math.sin(i * freq + k + t * 1.5) * 0.28 + Math.sin(i * 1.9 + k * 3 - t * 2.3) * 0.12);
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.stroke();
}
export function bars(g, x, y, w, h, n, t, rand, color = UI.blue) {
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    const v = 0.15 + 0.85 * Math.abs(Math.sin(i * 1.3 + rand() * 6 + t * (0.5 + rand() * 0.8)));
    g.fillStyle = rand() < 0.15 ? UI.amber : color;
    g.globalAlpha = 0.55 + 0.45 * v;
    g.fillRect(x + i * bw + 1, y + h - h * v, bw - 3, h * v);
  }
  g.globalAlpha = 1;
}
export function ringGauge(g, cx, cy, r, frac, color, back = UI.blueDim, lw = 5) {
  g.lineWidth = lw;
  g.strokeStyle = back;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = color;
  g.beginPath();
  g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  g.stroke();
}
export function digits(g, x, y, px, n, t, rand, color = UI.white, rate = 2) {
  const step = Math.floor(t * rate);
  const r2 = mulberry32((step * 7919 + Math.floor(rand() * 1e6)) >>> 0);
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(r2() * 10);
  text(g, s, x, y, px, color);
  return s;
}
// wedge (capital ship) icon: pointing along angle a (radians, 0 = up)
export function wedgeIcon(g, x, y, len, a, color, fill = false) {
  g.save();
  g.translate(x, y);
  g.rotate(a);
  g.beginPath();
  g.moveTo(0, -len);
  g.lineTo(len * 0.45, len * 0.55);
  g.lineTo(0, len * 0.35);
  g.lineTo(-len * 0.45, len * 0.55);
  g.closePath();
  g.strokeStyle = color;
  g.lineWidth = 1.5;
  if (fill) {
    g.fillStyle = color;
    g.globalAlpha = 0.35;
    g.fill();
    g.globalAlpha = 1;
  }
  g.stroke();
  g.restore();
}

// ---------------------------------------------------------------------------
// region painters — each is (seed, options) => (g, w, h, t)
// ---------------------------------------------------------------------------

/** Navigation chart: star field, hyperlane route with waypoints, moving ship marker, side readouts. */
export function paintStarMap(seed, { title = "NAV PLOT  //  HYPERLANE 7  ·  SECTOR K-12" } = {}) {
  const base = mulberry32(seed);
  // sparse background field plus seven star systems (clusters), the route threads four of them
  const stars = [];
  for (let i = 0; i < 260; i++) stars.push([base(), base(), base() * 0.5, base()]);
  const systems = [];
  for (let i = 0; i < 7; i++) systems.push([0.08 + (i / 6) * 0.72 + (base() - 0.5) * 0.08, 0.18 + ((i * 2.3) % 1) * 0.6]);
  for (const [sx, sy] of systems) {
    for (let k = 0; k < 34; k++) {
      const r = Math.pow(base(), 1.6) * 0.06;
      const a = base() * Math.PI * 2;
      stars.push([sx + Math.cos(a) * r * 0.75, sy + Math.sin(a) * r * 1.9, 0.5 + base() * 0.5, base()]);
    }
  }
  const wps = [];
  const nW = 4;
  for (let i = 0; i < nW; i++) wps.push(systems[[0, 2, 4, 6][i]]);
  const neb = [];
  for (let i = 0; i < 5; i++) neb.push([base(), base(), 0.12 + base() * 0.2, base()]);
  return (g, w, h, t) => {
    const rand = mulberry32(seed + 17);
    gridBg(g, w, h, 32);
    // nebulae
    for (const [nx, ny, nr, hue] of neb) {
      const grd = g.createRadialGradient(nx * w, ny * h, 0, nx * w, ny * h, nr * w);
      grd.addColorStop(0, hue < 0.5 ? "rgba(40,90,200,0.22)" : "rgba(120,40,160,0.18)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    }
    // stars
    for (const [sx, sy, sz, sc] of stars) {
      const tw = 0.6 + 0.4 * Math.sin(t * 1.7 + sz * 40);
      g.fillStyle = sc < 0.08 ? UI.amber : sc < 0.2 ? UI.blue : UI.white;
      g.globalAlpha = 0.35 + 0.65 * tw * (0.4 + sz * 0.6);
      const r = 0.6 + sz * 1.6;
      g.fillRect(sx * w * 0.78 + w * 0.02, sy * h * 0.86 + h * 0.1, r, r);
    }
    g.globalAlpha = 1;
    // route (same mapping as the stars, so the legs run system to system)
    const P = wps.map(([u, v]) => [w * 0.02 + u * w * 0.78, h * 0.1 + v * h * 0.86]);
    g.strokeStyle = UI.amberDim;
    g.lineWidth = 6;
    g.beginPath();
    P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
    g.strokeStyle = UI.amber;
    g.lineWidth = 2;
    g.stroke();
    // waypoints
    P.forEach((p, i) => {
      g.strokeStyle = i === P.length - 1 ? UI.red : UI.cyan;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(p[0], p[1] - 9);
      g.lineTo(p[0] + 9, p[1]);
      g.lineTo(p[0], p[1] + 9);
      g.lineTo(p[0] - 9, p[1]);
      g.closePath();
      g.stroke();
      text(g, `WP-${i + 1}`, p[0] + 12, p[1] - 10, 10, UI.cyanDim);
    });
    // destination pulse rings
    const d = P[P.length - 1];
    for (let k = 0; k < 2; k++) {
      const ph = (t * 0.5 + k * 0.5) % 1;
      g.strokeStyle = `rgba(255,42,26,${(1 - ph) * 0.8})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(d[0], d[1], 10 + ph * 34, 0, Math.PI * 2);
      g.stroke();
    }
    // ship marker travelling along the route (loops every 60 s)
    const u = (t / 60) % 1;
    const segs = P.length - 1;
    const si = Math.min(segs - 1, Math.floor(u * segs));
    const f = u * segs - si;
    const sx = P[si][0] + (P[si + 1][0] - P[si][0]) * f;
    const sy = P[si][1] + (P[si + 1][1] - P[si][1]) * f;
    const ang = Math.atan2(P[si + 1][1] - P[si][1], P[si + 1][0] - P[si][0]) + Math.PI / 2;
    wedgeIcon(g, sx, sy, 11, ang, UI.white, true);
    g.strokeStyle = UI.whiteDim;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(sx, sy, 18, 0, Math.PI * 2);
    g.stroke();
    text(g, "OWN  ·  V 0.41c", sx + 22, sy + 14, 10, UI.whiteDim);
    // right panel
    const px = w * 0.815;
    g.fillStyle = "rgba(4,8,18,0.85)";
    g.fillRect(px, 30, w - px - 6, h - 40);
    g.strokeStyle = UI.blueDim;
    g.lineWidth = 1;
    g.strokeRect(px + 0.5, 30.5, w - px - 6, h - 40);
    text(g, "JUMP SOLUTION", px + 8, 44, 11, UI.blue);
    const labels = ["ETA", "DIST", "DEV", "MASS", "DRIFT", "SYNC"];
    labels.forEach((l, i) => {
      const yy = 62 + i * 20;
      text(g, l, px + 8, yy, 10, UI.grey);
      digits(g, px + 52, yy, 11, 6, t, rand, i === 2 ? UI.amber : UI.white, i === 0 ? 1 : 3);
    });
    ringGauge(g, px + 34, h - 60, 22, 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(t * 0.3)), UI.cyan);
    ringGauge(g, px + 94, h - 60, 22, u, UI.amber);
    text(g, "ALIGN", px + 34, h - 30, 9, UI.grey, "center");
    text(g, "LEG", px + 94, h - 30, 9, UI.grey, "center");
    dataRows(g, px + 8, 190, w - px - 22, 6, rand, t, { rowH: 11 });
    // header + coordinate ticker along the bottom
    g.fillStyle = "rgba(4,8,18,0.8)";
    g.fillRect(0, 0, w, 26);
    header(g, w, title, UI.blue, 12);
    g.fillStyle = "rgba(4,8,18,0.85)";
    g.fillRect(0, h - 18, w * 0.8, 18);
    const tick = Math.floor(t * 6);
    let s = "";
    const r3 = mulberry32(seed + 99);
    for (let i = 0; i < 9; i++) s += `${["RA", "DEC", "PLX", "VR", "GRAV", "LANE", "BCN", "TRK", "DRV"][i]} ${Math.floor(r3() * 900 + 100 + ((tick * (i + 1)) % 37))}   `;
    text(g, s, 8, h - 9, 10, UI.cyanDim);
    scanlines(g, w, h, 0.2);
  };
}

/** Tall status column: header, ring gauges, many data rows, a bar graph at the bottom. */
export function paintStatusColumn(seed, { title = "SYS STATUS", accent = UI.blue } = {}) {
  return (g, w, h, t) => {
    const rand = mulberry32(seed);
    gridBg(g, w, h, 16);
    header(g, w, title, accent);
    ringGauge(g, w * 0.25, 58, 20, 0.4 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.5 + seed)), UI.cyan);
    ringGauge(g, w * 0.5, 58, 20, 0.7, accent);
    ringGauge(g, w * 0.75, 58, 20, 0.2 + 0.2 * (0.5 + 0.5 * Math.sin(t * 0.9)), UI.amber);
    dataRows(g, 8, 92, w - 16, Math.floor((h - 190) / 12), rand, t, { accent });
    bars(g, 8, h - 84, w - 16, 60, 14, t, rand, accent);
    g.fillStyle = accent;
    g.fillRect(6, h - 10, w - 12, 2);
    scanlines(g, w, h);
  };
}

/** Wide console strip: header, text rows on the left, graph in the middle, gauge/bars on the right. */
export function paintConsole(seed, { accent = UI.blue, title = "PLOT STN" } = {}) {
  return (g, w, h, t) => {
    const rand = mulberry32(seed);
    gridBg(g, w, h, 16);
    header(g, w, `${title} ${String(seed % 97).padStart(2, "0")}`, accent, 10);
    dataRows(g, 8, 30, w * 0.34, Math.floor((h - 36) / 11), rand, t, { rowH: 11, accent });
    waveform(g, w * 0.4, 30, w * 0.32, h - 40, t, rand, UI.cyan);
    bars(g, w * 0.75, 30, w * 0.24, h - 40, 8, t, rand, accent);
    scanlines(g, w, h);
  };
}

/** Readout bar (very wide, short): numeric blocks with labels and a thin waveform. */
export function paintReadoutBar(seed, { accent = UI.amber, labels = ["HDG", "PITCH", "ROLL", "VEL", "MASS", "LANE", "T-J", "DEV"] } = {}) {
  return (g, w, h, t) => {
    const rand = mulberry32(seed);
    gridBg(g, w, h, 20);
    const n = labels.length;
    const cw = (w * 0.7) / n;
    for (let i = 0; i < n; i++) {
      const x = 6 + i * cw;
      text(g, labels[i], x, 12, 9, UI.grey);
      digits(g, x, h * 0.62, Math.min(20, h * 0.42), 5, t, rand, i % 3 === 2 ? accent : UI.white, 2 + (i % 3));
      g.fillStyle = UI.blueFaint;
      g.fillRect(x + cw - 6, 4, 1, h - 8);
    }
    waveform(g, w * 0.72, 6, w * 0.26, h - 12, t, rand, accent, 0.9);
    scanlines(g, w, h);
  };
}

/** Square gauge cell. */
export function paintGauge(seed, { label = "DRIVE", accent = UI.cyan } = {}) {
  return (g, w, h, t) => {
    const rand = mulberry32(seed);
    gridBg(g, w, h, 16);
    const v = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * (0.4 + rand() * 0.6) + seed));
    ringGauge(g, w / 2, h / 2 - 6, Math.min(w, h) * 0.3, v, accent, UI.blueDim, 7);
    text(g, Math.round(v * 100).toString(), w / 2, h / 2 - 6, Math.min(w, h) * 0.2, UI.white, "center");
    text(g, label, w / 2, h - 12, 10, UI.grey, "center");
    scanlines(g, w, h);
  };
}

/** Tactical situation display: grid, range rings, own fleet (blue) vs contacts (red), vectors, sweep. */
export function paintTacticalMap(seed, { title = "TACTICAL PLOT  //  ENGAGEMENT ZONE  ·  GRID 4-K" } = {}) {
  const base = mulberry32(seed);
  const friends = [];
  for (let i = 0; i < 6; i++) friends.push([0.28 + base() * 0.22, 0.3 + base() * 0.45, base() * 0.6 - 0.3, 8 + base() * 10]);
  const foes = [];
  for (let i = 0; i < 7; i++) foes.push([0.6 + base() * 0.3, 0.2 + base() * 0.6, Math.PI + base() * 0.8 - 0.4, 6 + base() * 8]);
  return (g, w, h, t) => {
    const rand = mulberry32(seed + 3);
    gridBg(g, w, h, 40, "rgba(58,123,255,0.16)");
    const ox = w * 0.4;
    const oy = h * 0.55;
    // range rings
    for (let k = 1; k <= 4; k++) {
      g.strokeStyle = k === 4 ? UI.blueDim : UI.blueFaint;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(ox, oy, k * h * 0.11, 0, Math.PI * 2);
      g.stroke();
      text(g, `${k * 250}`, ox + k * h * 0.11 + 3, oy - 6, 9, UI.blueDim);
    }
    // sweep
    const a = (t * 0.9) % (Math.PI * 2);
    for (let k = 0; k < 10; k++) {
      g.strokeStyle = `rgba(79,216,255,${0.35 * (1 - k / 10)})`;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(ox, oy);
      g.lineTo(ox + Math.cos(a - k * 0.05) * h * 0.44, oy + Math.sin(a - k * 0.05) * h * 0.44);
      g.stroke();
    }
    // contacts
    for (const [fx, fy, fa, fl] of friends) {
      const x = fx * w + Math.sin(t * 0.2 + fx * 9) * 4;
      const y = fy * h;
      wedgeIcon(g, x, y, fl, fa, UI.blue, true);
      g.strokeStyle = UI.blueDim;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.sin(fa) * 40, y - Math.cos(fa) * 40);
      g.stroke();
    }
    for (const [fx, fy, fa, fl] of foes) {
      const x = fx * w - ((t * 3) % 40) * 0.2;
      const y = fy * h + Math.sin(t * 0.3 + fy * 7) * 3;
      wedgeIcon(g, x, y, fl, fa, UI.red);
      g.strokeStyle = UI.redDim;
      g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.sin(fa) * 60, y - Math.cos(fa) * 60);
      g.stroke();
      g.setLineDash([]);
      // id bracket
      g.strokeStyle = UI.redDim;
      g.strokeRect(x - fl - 4, y - fl - 4, fl * 2 + 8, fl * 2 + 8);
      text(g, `CN-${Math.floor(fx * 90)}`, x + fl + 8, y - fl, 9, UI.redDim);
    }
    // right panel: engagement data
    const px = w * 0.8;
    g.fillStyle = "rgba(4,8,18,0.86)";
    g.fillRect(px, 30, w - px - 6, h - 40);
    g.strokeStyle = UI.blueDim;
    g.lineWidth = 1;
    g.strokeRect(px + 0.5, 30.5, w - px - 6, h - 40);
    text(g, "CONTACTS", px + 8, 44, 11, UI.red);
    for (let i = 0; i < foes.length; i++) {
      const yy = 62 + i * 16;
      text(g, `CN-${Math.floor(foes[i][0] * 90)}`, px + 8, yy, 10, UI.redDim);
      digits(g, px + 62, yy, 10, 4, t, rand, UI.white, 1);
      g.fillStyle = i % 3 === 0 ? UI.amber : UI.redDim;
      g.fillRect(px + 112, yy - 3, 10 + (i % 4) * 8, 6);
    }
    text(g, "FLEET", px + 8, 190, 11, UI.blue);
    dataRows(g, px + 8, 204, w - px - 22, 6, rand, t, { rowH: 11 });
    ringGauge(g, px + 34, h - 58, 20, 0.6 + 0.3 * Math.sin(t * 0.4), UI.blue);
    ringGauge(g, px + 92, h - 58, 20, 0.82, UI.amber);
    text(g, "SHIELD", px + 34, h - 30, 9, UI.grey, "center");
    text(g, "BATT", px + 92, h - 30, 9, UI.grey, "center");
    g.fillStyle = "rgba(4,8,18,0.8)";
    g.fillRect(0, 0, w, 26);
    header(g, w, title, UI.blue, 12);
    // bottom ticker
    g.fillStyle = "rgba(4,8,18,0.85)";
    g.fillRect(0, h - 18, w * 0.78, 18);
    const tick = Math.floor(t * 4);
    let s = "";
    for (let i = 0; i < 8; i++) s += `${["RNG", "BRG", "CLS", "VEL", "TTI", "ROE", "SOL", "PWR"][i]} ${String(((tick * (i + 3)) % 900) + 100).padStart(3, "0")}    `;
    text(g, s, 8, h - 9, 10, UI.cyanDim);
    scanlines(g, w, h, 0.2);
  };
}

/** Fleet roster: rows of ship designations with hull/shield bars and status flags. */
export function paintFleetList(seed, { title = "TASK FORCE  ·  ROSTER", accent = UI.blue } = {}) {
  const base = mulberry32(seed);
  const names = [];
  const pre = ["ISD", "VSD", "FRG", "CRV", "ESC", "TUG"];
  for (let i = 0; i < 12; i++) names.push(`${pre[Math.floor(base() * pre.length)]}-${Math.floor(base() * 900 + 100)}`);
  return (g, w, h, t) => {
    const rand = mulberry32(seed + 5);
    gridBg(g, w, h, 16);
    header(g, w, title, accent);
    text(g, "UNIT", 8, 36, 9, UI.grey);
    text(g, "HULL", w * 0.42, 36, 9, UI.grey);
    text(g, "SHLD", w * 0.66, 36, 9, UI.grey);
    text(g, "ST", w * 0.9, 36, 9, UI.grey);
    const rowH = Math.min(22, (h - 60) / names.length);
    names.forEach((n, i) => {
      const yy = 50 + i * rowH;
      text(g, n, 8, yy, 10, UI.white);
      const hull = 0.5 + 0.5 * Math.abs(Math.sin(i * 2.1 + seed));
      const sh = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.3 + i));
      g.fillStyle = UI.blueDim;
      g.fillRect(w * 0.42, yy - 3, w * 0.2, 6);
      g.fillStyle = hull < 0.6 ? UI.amber : accent;
      g.fillRect(w * 0.42, yy - 3, w * 0.2 * hull, 6);
      g.fillStyle = UI.blueDim;
      g.fillRect(w * 0.66, yy - 3, w * 0.2, 6);
      g.fillStyle = UI.cyan;
      g.fillRect(w * 0.66, yy - 3, w * 0.2 * sh, 6);
      const st = rand();
      g.fillStyle = st < 0.1 ? (Math.floor(t * 2) % 2 ? UI.red : UI.redDim) : st < 0.3 ? UI.amber : UI.blue;
      g.fillRect(w * 0.9, yy - 3, 8, 6);
    });
    scanlines(g, w, h);
  };
}

/** Weapons / systems board: a matrix of battery cells with ready / charging / fault states. */
export function paintWeaponsBoard(seed, { title = "BATTERY STATUS  ·  PORT / STBD", cols = 8, rows = 4 } = {}) {
  return (g, w, h, t) => {
    const rand = mulberry32(seed);
    gridBg(g, w, h, 16);
    header(g, w, title, UI.red, 11);
    const x0 = 10;
    const y0 = 34;
    const cw = (w - 20) / cols;
    const ch = (h - 80) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const s = rand();
        const x = x0 + c * cw;
        const y = y0 + r * ch;
        g.fillStyle = "rgba(10,16,30,0.9)";
        g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
        let col = UI.blue;
        if (s < 0.1) col = Math.floor(t * 3 + c) % 2 ? UI.red : UI.redDim;
        else if (s < 0.3) col = UI.amber;
        g.fillStyle = col;
        g.fillRect(x + 6, y + 6, cw - 12, 4);
        text(g, `${r % 2 ? "S" : "P"}${String(c + 1).padStart(2, "0")}`, x + 6, y + ch * 0.55, Math.min(12, ch * 0.3), UI.whiteDim);
        // charge bar
        const v = s < 0.3 ? 0.2 + 0.7 * (0.5 + 0.5 * Math.sin(t * 1.3 + c + r)) : 1;
        g.fillStyle = UI.blueDim;
        g.fillRect(x + 6, y + ch - 10, cw - 12, 4);
        g.fillStyle = col;
        g.fillRect(x + 6, y + ch - 10, (cw - 12) * v, 4);
      }
    }
    text(g, "READY", 12, h - 14, 10, UI.blue);
    text(g, "CHARGING", 80, h - 14, 10, UI.amber);
    text(g, "FAULT", 170, h - 14, 10, UI.red);
    digits(g, w - 80, h - 14, 11, 6, t, rand, UI.white, 1);
    scanlines(g, w, h);
  };
}

/**
 * Compact route plot (2:1): the same three-leg orange jump line as the chart hologram between four star
 * systems, leg labels, a travelling ship marker, ETA / distance readouts and a progress bar.
 */
export function paintRoutePlot(seed, { title = "JUMP SOLUTION  ·  LANE 7" } = {}) {
  const base = mulberry32(seed);
  const systems = [];
  for (let i = 0; i < 6; i++) systems.push([0.1 + (i / 5) * 0.62 + (base() - 0.5) * 0.06, 0.3 + ((i * 2.3) % 1) * 0.5]);
  const stars = [];
  for (const [sx, sy] of systems) for (let k = 0; k < 26; k++) stars.push([sx + (base() - 0.5) * 0.07, sy + (base() - 0.5) * 0.16, base()]);
  for (let i = 0; i < 90; i++) stars.push([base() * 0.78, base(), base() * 0.4]);
  const route = [0, 2, 3, 5].map((i) => systems[i]);
  return (g, w, h, t) => {
    const rand = mulberry32(seed + 7);
    gridBg(g, w, h, 22);
    for (const [sx, sy, k] of stars) {
      g.fillStyle = k > 0.92 ? UI.amber : UI.white;
      g.globalAlpha = 0.3 + 0.7 * k * (0.6 + 0.4 * Math.sin(t * 1.5 + sx * 50));
      const r = 0.8 + k * 1.6;
      g.fillRect(sx * w, sy * h, r, r);
    }
    g.globalAlpha = 1;
    const P = route.map(([u, v]) => [u * w, v * h]);
    g.strokeStyle = UI.amberDim;
    g.lineWidth = 6;
    g.beginPath();
    P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
    g.strokeStyle = UI.amber;
    g.lineWidth = 2;
    g.stroke();
    P.forEach((p, i) => {
      g.strokeStyle = i === P.length - 1 ? UI.red : i === 0 ? UI.white : UI.cyan;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(p[0], p[1] - 7);
      g.lineTo(p[0] + 7, p[1]);
      g.lineTo(p[0], p[1] + 7);
      g.lineTo(p[0] - 7, p[1]);
      g.closePath();
      g.stroke();
      text(g, i === 0 ? "ORIGIN" : i === P.length - 1 ? "DEST" : `JMP-${i}`, p[0] + 10, p[1] - 10, 9, UI.cyanDim);
    });
    // ship marker on the route
    const u = (t / 60) % 1;
    const si = Math.min(2, Math.floor(u * 3));
    const f = u * 3 - si;
    const sx = P[si][0] + (P[si + 1][0] - P[si][0]) * f;
    const sy = P[si][1] + (P[si + 1][1] - P[si][1]) * f;
    wedgeIcon(g, sx, sy, 8, Math.atan2(P[si + 1][1] - P[si][1], P[si + 1][0] - P[si][0]) + Math.PI / 2, UI.white, true);
    // right column: leg readouts
    const px = w * 0.8;
    g.fillStyle = "rgba(4,8,18,0.85)";
    g.fillRect(px, 26, w - px - 4, h - 32);
    ["LEG 1", "LEG 2", "LEG 3"].forEach((l, i) => {
      const yy = 40 + i * 30;
      text(g, l, px + 6, yy, 9, i === si ? UI.amber : UI.grey);
      digits(g, px + 6, yy + 13, 11, 5, t, rand, i === si ? UI.white : UI.whiteDim, 1 + i);
    });
    g.fillStyle = UI.blueDim;
    g.fillRect(px + 6, h - 22, w - px - 16, 5);
    g.fillStyle = UI.amber;
    g.fillRect(px + 6, h - 22, (w - px - 16) * u, 5);
    g.fillStyle = "rgba(4,8,18,0.8)";
    g.fillRect(0, 0, w, 22);
    header(g, w, title, UI.amber, 10);
    scanlines(g, w, h, 0.2);
  };
}

/** Narrow vertical strip of stacked readouts (for tall wall columns beside a main display). */
export function paintStack(seed, { accent = UI.amber, title = "LINK" } = {}) {
  return (g, w, h, t) => {
    const rand = mulberry32(seed);
    gridBg(g, w, h, 16);
    header(g, w, title, accent, 10);
    const n = Math.floor((h - 40) / 46);
    for (let i = 0; i < n; i++) {
      const y = 34 + i * 46;
      text(g, ["FEED", "SYNC", "GRAV", "COMP", "AUX", "REF", "BCN", "TRK"][i % 8], 8, y + 6, 9, UI.grey);
      digits(g, 8, y + 22, 14, 5, t, rand, i % 3 === 1 ? accent : UI.white, 1 + (i % 2));
      g.fillStyle = UI.blueDim;
      g.fillRect(8, y + 34, w - 16, 3);
      g.fillStyle = UI.cyan;
      g.fillRect(8, y + 34, (w - 16) * (0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.7 + i))), 3);
    }
    scanlines(g, w, h);
  };
}
