// Comms room UI textures (module-local, ≤ 2 canvases): a static 1024² atlas of Imperial-style blue/amber
// screens (system map, status columns, console pages, readouts, signs) and a 512×256 animated
// receiver display (waveform + spectrum) redrawn from update(dt, t).
import * as THREE from "three";
import { makeCanvas, toTexture, mulberry32 } from "../../../textures.js";

export const ATLAS = 1024;
const BG = "#040912";
const BLUE = "#3a7bff";
const BLUE_HI = "#a9c6ff";
const BLUE_LO = "rgba(58,123,255,0.38)";
const GRID = "rgba(58,123,255,0.10)";
const AMBER = "#ffa028";
const RED = "#ff2a1a";
const MONO = (px, bold = true) => `${bold ? "bold " : ""}${px}px "DejaVu Sans Mono", "Liberation Mono", Menlo, Consolas, monospace`;

// Named atlas cells in canvas pixels [x, y, w, h]
export const UI = {
  map: [0, 0, 512, 256],
  status0: [512, 0, 128, 512],
  status1: [640, 0, 128, 512],
  status2: [768, 0, 128, 512],
  status3: [896, 0, 128, 512],
  console0: [0, 256, 256, 128],
  console1: [256, 256, 256, 128],
  console2: [0, 384, 256, 128],
  console3: [256, 384, 256, 128],
  sensor0: [0, 512, 256, 128],
  sensor1: [256, 512, 256, 128],
  board: [512, 512, 512, 128],
  sign0: [512, 640, 256, 128],
  sign1: [768, 640, 256, 128],
  sign2: [512, 768, 256, 128],
  sign3: [768, 768, 256, 128],
  readout0: [0, 640, 128, 64],
  readout1: [128, 640, 128, 64],
  readout2: [256, 640, 128, 64],
  readout3: [384, 640, 128, 64],
  readout4: [0, 704, 128, 64],
  readout5: [128, 704, 128, 64],
  readout6: [256, 704, 128, 64],
  readout7: [384, 704, 128, 64],
  wide0: [0, 768, 512, 128],
  wide1: [0, 896, 512, 128],
  keys: [512, 896, 512, 128],
};

// [x,y,w,h] canvas px → kit uvRect [u0, v0, u1, v1] (canvas rows run top-down, v bottom-up)
export function uvRect(cell, size = ATLAS) {
  const [x, y, w, h] = cell;
  return [x / size, 1 - (y + h) / size, (x + w) / size, 1 - y / size];
}

// ---------------------------------------------------------------------------
// drawing helpers (all take the cell rect and draw in absolute canvas px)
// ---------------------------------------------------------------------------
function base(g, [x, y, w, h], { grid = 16, border = true } = {}) {
  g.fillStyle = BG;
  g.fillRect(x, y, w, h);
  g.strokeStyle = GRID;
  g.lineWidth = 1;
  for (let gx = x + grid; gx < x + w; gx += grid) {
    g.beginPath();
    g.moveTo(gx + 0.5, y);
    g.lineTo(gx + 0.5, y + h);
    g.stroke();
  }
  for (let gy = y + grid; gy < y + h; gy += grid) {
    g.beginPath();
    g.moveTo(x, gy + 0.5);
    g.lineTo(x + w, gy + 0.5);
    g.stroke();
  }
  if (border) {
    g.strokeStyle = BLUE_LO;
    g.lineWidth = 2;
    g.strokeRect(x + 3, y + 3, w - 6, h - 6);
  }
}
function text(g, s, x, y, px, color = BLUE_HI, align = "left", bold = true) {
  g.fillStyle = color;
  g.font = MONO(px, bold);
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillText(s, x, y);
}
function header(g, [x, y, w], title, code, px = 11) {
  g.fillStyle = BLUE;
  g.fillRect(x + 8, y + 8, w - 16, 2);
  text(g, title, x + 10, y + 19, px, BLUE_HI);
  text(g, code, x + w - 10, y + 19, px - 1, AMBER, "right");
  g.fillStyle = BLUE_LO;
  g.fillRect(x + 8, y + 28, w - 16, 1);
}
function rows(g, x, y, w, n, pitch, rand, { hi = 0.15, amber = 0.08 } = {}) {
  for (let i = 0; i < n; i++) {
    const yy = y + i * pitch;
    const r = rand();
    const col = r < amber ? AMBER : r < amber + hi ? BLUE_HI : BLUE;
    g.fillStyle = col;
    g.fillRect(x, yy, 6, pitch * 0.5);
    let xx = x + 12;
    const parts = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < parts && xx < x + w; k++) {
      const len = Math.min(x + w - xx, 12 + rand() * (w * 0.28));
      g.fillStyle = k === 0 ? col : BLUE_LO;
      g.fillRect(xx, yy, len, pitch * 0.5);
      xx += len + 8;
    }
  }
}
function bars(g, x, y, w, h, n, rand, { peak = true } = {}) {
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    const v = 0.15 + rand() * 0.8;
    const bh = h * v;
    g.fillStyle = v > 0.82 ? AMBER : BLUE;
    g.fillRect(x + i * bw + 1, y + h - bh, bw - 2, bh);
    if (peak) {
      g.fillStyle = BLUE_HI;
      g.fillRect(x + i * bw + 1, y + h - bh - 4, bw - 2, 2);
    }
  }
}
function trace(g, x, y, w, h, fn, color, lw = 1.5) {
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.beginPath();
  for (let i = 0; i <= w; i += 2) {
    const v = fn(i / w);
    const yy = y + h / 2 - v * h * 0.45;
    if (i === 0) g.moveTo(x + i, yy);
    else g.lineTo(x + i, yy);
  }
  g.stroke();
}
function ledMatrix(g, x, y, cols, rws, cell, rand, { on = 0.7, amber = 0.15, red = 0.05 } = {}) {
  for (let r = 0; r < rws; r++)
    for (let c = 0; c < cols; c++) {
      const v = rand();
      if (v > on) continue;
      const k = rand();
      g.fillStyle = k < red ? RED : k < red + amber ? AMBER : BLUE;
      g.fillRect(x + c * cell + 1, y + r * cell + 1, cell - 3, cell - 3);
    }
}
function gauge(g, cx, cy, r, frac, color = BLUE) {
  g.strokeStyle = BLUE_LO;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25);
  g.stroke();
  g.strokeStyle = color;
  g.beginPath();
  g.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * frac);
  g.stroke();
}
function scale(g, x, y, h, n) {
  g.fillStyle = BLUE_LO;
  for (let i = 0; i <= n; i++) g.fillRect(x, y + (i / n) * h, i % 5 === 0 ? 10 : 5, 1);
}

// ---------------------------------------------------------------------------
// cells
// ---------------------------------------------------------------------------
function drawMap(g, cell, rand) {
  const [x, y, w, h] = cell;
  base(g, cell, { grid: 32 });
  header(g, cell, "ARRAY TOPOLOGY · LONG-RANGE / TACTICAL BANDS", "SYS-MAP 01", 12);
  // hull wedge (plan view): an original arrow-head silhouette, bow to the left
  const ox = x + 40;
  const oy = y + 150;
  const L = 330;
  const W = 150;
  g.strokeStyle = BLUE_LO;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(ox, oy);
  g.lineTo(ox + L, oy - W / 2);
  g.lineTo(ox + L, oy + W / 2);
  g.closePath();
  g.stroke();
  // superstructure block and tower
  g.strokeRect(ox + L * 0.55, oy - W * 0.14, L * 0.4, W * 0.28);
  g.strokeRect(ox + L * 0.78, oy - W * 0.07, L * 0.12, W * 0.14);
  // sensor nodes joined by links
  const nodes = [];
  for (let i = 0; i < 9; i++) {
    const t = 0.15 + (i / 9) * 0.8;
    const nx = ox + L * t;
    const ny = oy + (rand() - 0.5) * W * t * 0.8;
    nodes.push([nx, ny]);
  }
  g.strokeStyle = BLUE;
  g.lineWidth = 1;
  for (let i = 1; i < nodes.length; i++) {
    g.beginPath();
    g.moveTo(nodes[i - 1][0], nodes[i - 1][1]);
    g.lineTo(nodes[i][0], nodes[i][1]);
    g.stroke();
    if (i > 2 && rand() < 0.5) {
      g.beginPath();
      g.moveTo(nodes[i - 2][0], nodes[i - 2][1]);
      g.lineTo(nodes[i][0], nodes[i][1]);
      g.stroke();
    }
  }
  nodes.forEach(([nx, ny], i) => {
    g.fillStyle = i % 4 === 3 ? AMBER : BLUE_HI;
    g.fillRect(nx - 3, ny - 3, 6, 6);
    text(g, `A${String(i + 1).padStart(2, "0")}`, nx + 6, ny - 8, 9, BLUE_LO, "left", false);
  });
  // right column: band table
  const tx = x + 400;
  rows(g, tx, y + 44, 100, 10, 18, rand);
  text(g, "BANDS", tx, y + 36, 9, BLUE_LO, "left", false);
  // bottom strip: link budget bars
  bars(g, x + 40, y + h - 56, 330, 36, 24, rand);
  text(g, "LINK MARGIN dB", x + 40, y + h - 62, 9, BLUE_LO, "left", false);
}

function drawStatus(g, cell, rand, idx) {
  const [x, y, w, h] = cell;
  base(g, cell, { grid: 16 });
  header(g, cell, ["RX-A", "RX-B", "TX-1", "TX-2"][idx], `${idx + 3}`, 10);
  let yy = y + 40;
  // LED matrix block
  ledMatrix(g, x + 10, yy, 7, 6, 15, rand);
  yy += 100;
  // three gauges
  for (let k = 0; k < 3; k++) {
    gauge(g, x + 30 + k * 34, yy + 20, 13, 0.3 + rand() * 0.6, k === 2 ? AMBER : BLUE);
  }
  yy += 50;
  rows(g, x + 10, yy, w - 20, 8, 14, rand);
  yy += 120;
  bars(g, x + 10, yy, w - 20, 60, 12, rand);
  yy += 70;
  text(g, ["LOCK", "SYNC", "STBY", "XMIT"][idx], x + w / 2, yy + 8, 12, idx === 2 ? AMBER : BLUE_HI, "center");
  yy += 20;
  ledMatrix(g, x + 10, yy, 7, 3, 15, rand, { on: 0.5, amber: 0.3 });
  scale(g, x + w - 12, y + 40, h - 60, 30);
}

function drawConsole(g, cell, rand, idx) {
  const [x, y, w, h] = cell;
  base(g, cell, { grid: 16 });
  header(g, cell, ["CHANNEL MATRIX", "RELAY QUEUE", "CIPHER STATE", "TRAFFIC LOG"][idx], `OP-${idx + 1}`, 10);
  if (idx === 0) {
    ledMatrix(g, x + 10, y + 38, 14, 5, 12, rand);
    rows(g, x + 10, y + 102, w - 20, 1, 12, rand);
    trace(g, x + 180, y + 38, 66, 60, (t) => Math.sin(t * 14) * 0.7, BLUE);
  } else if (idx === 1) {
    rows(g, x + 10, y + 38, w - 90, 6, 13, rand);
    bars(g, x + w - 76, y + 40, 66, 70, 8, rand);
  } else if (idx === 2) {
    for (let k = 0; k < 3; k++) gauge(g, x + 34 + k * 44, y + 66, 18, 0.2 + rand() * 0.7, k === 1 ? AMBER : BLUE);
    rows(g, x + 150, y + 38, w - 160, 6, 13, rand);
  } else {
    rows(g, x + 10, y + 38, w - 20, 6, 13, rand, { amber: 0.2 });
    g.fillStyle = AMBER;
    g.fillRect(x + 10, y + 114, (w - 20) * 0.62, 4);
  }
}

function drawSensor(g, cell, rand, idx) {
  const [x, y, w, h] = cell;
  base(g, cell, { grid: 16 });
  header(g, cell, idx ? "SENSOR DISH B · SWEEP" : "SENSOR DISH A · TRACK", idx ? "AZ 214" : "AZ 037", 10);
  // radar-like sweep
  const cx = x + 64;
  const cy = y + 80;
  g.strokeStyle = BLUE_LO;
  g.lineWidth = 1;
  for (const r of [14, 28, 42]) {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(cx - 44, cy);
  g.lineTo(cx + 44, cy);
  g.moveTo(cx, cy - 44);
  g.lineTo(cx, cy + 44);
  g.stroke();
  g.strokeStyle = BLUE_HI;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(cx, cy);
  const a = idx ? 2.1 : 0.6;
  g.lineTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44);
  g.stroke();
  for (let k = 0; k < 5; k++) {
    g.fillStyle = k === 1 ? AMBER : BLUE;
    const ang = rand() * Math.PI * 2;
    const rr = 8 + rand() * 34;
    g.fillRect(cx + Math.cos(ang) * rr - 2, cy + Math.sin(ang) * rr - 2, 4, 4);
  }
  rows(g, x + 130, y + 38, w - 140, 5, 14, rand);
  bars(g, x + 130, y + 106, w - 140, 16, 12, rand, { peak: false });
}

function drawBoard(g, cell, rand) {
  const [x, y, w, h] = cell;
  base(g, cell, { grid: 16 });
  header(g, cell, "COMMUNICATIONS SECTION · DECK 1 · WATCH STATUS", "CS-D1", 12);
  const colW = (w - 40) / 4;
  ["LONG RANGE", "FLEET NET", "INTERNAL", "SENSORS"].forEach((label, i) => {
    const cx = x + 20 + i * colW;
    text(g, label, cx, y + 42, 10, BLUE_LO);
    ledMatrix(g, cx, y + 52, 6, 3, 12, rand, { on: 0.8, amber: i === 1 ? 0.4 : 0.1 });
    text(g, i === 1 ? "DEGRADED" : "NOMINAL", cx, y + 100, 11, i === 1 ? AMBER : BLUE_HI);
  });
}

function drawSign(g, cell, lines, accent = BLUE) {
  const [x, y, w, h] = cell;
  g.fillStyle = "#06090f";
  g.fillRect(x, y, w, h);
  g.fillStyle = accent;
  g.fillRect(x + 10, y + 10, w - 20, 4);
  g.fillRect(x + 10, y + h - 14, w - 20, 4);
  lines.forEach((s, i) => text(g, s, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * 30, i === 0 ? 24 : 15, i === 0 ? BLUE_HI : accent, "center"));
}

function drawReadout(g, cell, rand, idx) {
  const [x, y, w, h] = cell;
  base(g, cell, { grid: 16, border: false });
  g.strokeStyle = BLUE_LO;
  g.lineWidth = 1;
  g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  const kinds = idx % 4;
  if (kinds === 0) {
    text(g, ["PWR", "GAIN", "SNR", "TEMP"][Math.floor(idx / 4) % 4], x + 8, y + 14, 10, BLUE_LO);
    text(g, `${(20 + rand() * 70).toFixed(1)}`, x + w - 8, y + 40, 22, idx > 4 ? AMBER : BLUE_HI, "right");
  } else if (kinds === 1) {
    bars(g, x + 6, y + 8, w - 12, h - 16, 14, rand, { peak: false });
  } else if (kinds === 2) {
    trace(g, x + 6, y + 6, w - 12, h - 12, (t) => Math.sin(t * 9 + idx) * 0.6 + Math.sin(t * 23) * 0.25, BLUE_HI, 1.2);
  } else {
    ledMatrix(g, x + 6, y + 8, 10, 4, 12, rand, { on: 0.75, amber: 0.2 });
  }
}

function drawWide(g, cell, rand, idx) {
  const [x, y, w, h] = cell;
  base(g, cell, { grid: 16 });
  header(g, cell, idx ? "RELAY SCHEDULE · SECTOR NETS" : "SIGNAL INTELLIGENCE FEED · DECODE QUEUE", idx ? "RS-02" : "SI-01", 11);
  rows(g, x + 10, y + 40, w * 0.55, 6, 13, rand, { amber: idx ? 0.25 : 0.08 });
  if (idx) bars(g, x + w * 0.6, y + 42, w * 0.37, 70, 20, rand);
  else {
    trace(g, x + w * 0.6, y + 42, w * 0.37, 36, (t) => Math.sin(t * 30) * Math.exp(-((t - 0.5) ** 2) * 12), BLUE_HI, 1.2);
    ledMatrix(g, x + w * 0.6, y + 84, 22, 2, 12, rand, { on: 0.6, amber: 0.2 });
  }
}

function drawKeys(g, cell, rand) {
  // keyboard texture (4:1, used on the recessed desk key trays): four staggered rows of bevelled key caps in
  // black gaps — lit top edge, shadowed bottom edge, a small glyph or legend bar per key, a few amber/red keys and
  // a wide space bar. Reads as a physical key grid instead of a flat grey slab.
  const [x, y, w, h] = cell;
  g.fillStyle = "#05070a";
  g.fillRect(x, y, w, h);
  const cap = (kx, ky, kw, kh, legend) => {
    g.fillStyle = "#1a1e25";
    g.fillRect(kx, ky, kw, kh);
    g.fillStyle = "#2b3039"; // lit top / left bevel
    g.fillRect(kx, ky, kw, 2);
    g.fillRect(kx, ky, 2, kh);
    g.fillStyle = "#0c0e12"; // shadowed bottom / right bevel
    g.fillRect(kx, ky + kh - 3, kw, 3);
    g.fillRect(kx + kw - 2, ky, 2, kh);
    g.fillStyle = "#22262e"; // cap top plateau
    g.fillRect(kx + 5, ky + 5, kw - 10, kh - 11);
    if (legend) legend(kx, ky, kw, kh);
  };
  const rowsDef = [
    { n: 16, kw: 30, kh: 22, ky: 4, stag: 0 },
    { n: 15, kw: 32, kh: 26, ky: 30, stag: 6 },
    { n: 14, kw: 32, kh: 26, ky: 60, stag: 14 },
    { n: 13, kw: 32, kh: 26, ky: 90, stag: 22 },
  ];
  rowsDef.forEach((row, r) => {
    const total = row.n * row.kw;
    let kx = x + (w - total) / 2 + row.stag;
    for (let c = 0; c < row.n; c++) {
      const isBar = r === 3 && c >= 4 && c <= 8;
      if (isBar && c !== 4) {
        kx += row.kw;
        continue;
      }
      const kw = isBar ? row.kw * 5 - 4 : row.kw - 4;
      const v = rand();
      const col = v < 0.06 ? RED : v < 0.18 ? AMBER : v < 0.3 ? BLUE_HI : BLUE_LO;
      cap(kx, y + row.ky, kw, row.kh, (a, b, cw, ch) => {
        g.fillStyle = col;
        if (r === 0) g.fillRect(a + 6, b + 9, cw - 12, 3);
        else if (isBar) g.fillRect(a + 20, b + ch / 2 - 1, cw - 40, 2);
        else if (rand() < 0.5) g.fillRect(a + 8, b + 8, 8, 8);
        else {
          g.fillRect(a + 7, b + 8, cw - 14, 2);
          g.fillRect(a + 7, b + 14, (cw - 14) * 0.6, 2);
        }
      });
      kx += row.kw;
    }
  });
}

export function makeCommsAtlas() {
  const c = makeCanvas(ATLAS, ATLAS);
  const g = c.getContext("2d");
  const rand = mulberry32(4711);
  g.fillStyle = BG;
  g.fillRect(0, 0, ATLAS, ATLAS);
  drawMap(g, UI.map, rand);
  for (let i = 0; i < 4; i++) drawStatus(g, UI["status" + i], rand, i);
  for (let i = 0; i < 4; i++) drawConsole(g, UI["console" + i], rand, i);
  drawSensor(g, UI.sensor0, rand, 0);
  drawSensor(g, UI.sensor1, rand, 1);
  drawBoard(g, UI.board, rand);
  drawSign(g, UI.sign0, ["COMMUNICATIONS", "SECTION 01 · DECK 1"]);
  drawSign(g, UI.sign1, ["SENSOR CONTROL", "AUTHORISED CREW ONLY"], AMBER);
  drawSign(g, UI.sign2, ["RF HAZARD", "ARRAY LIVE WHEN LIT"], AMBER);
  drawSign(g, UI.sign3, ["SIGNAL WALL", "RX-A · RX-B · TX-1 · TX-2"]);
  for (let i = 0; i < 8; i++) drawReadout(g, UI["readout" + i], rand, i);
  drawWide(g, UI.wide0, rand, 0);
  drawWide(g, UI.wide1, rand, 1);
  drawKeys(g, UI.keys, rand);
  const tex = toTexture(c, { srgb: true, wrap: false });
  tex.anisotropy = 8;
  return tex;
}

// ---------------------------------------------------------------------------
// Animated receiver display: 512×256 canvas, redrawn at ≤ 20 Hz from update(); deterministic in t.
// ---------------------------------------------------------------------------
export function makeWaveDisplay() {
  const W = 512;
  const H = 256;
  const c = makeCanvas(W, H);
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  let lastT = -1;
  const draw = (t) => {
    base(g, [0, 0, W, H], { grid: 16 });
    const tc = `T+${String(Math.floor(t / 3600) % 100).padStart(2, "0")}:${String(Math.floor(t / 60) % 60).padStart(2, "0")}:${String(Math.floor(t) % 60).padStart(2, "0")}`;
    header(g, [0, 0, W, H], "LONG-RANGE RECEIVER · BAND 7 · CARRIER LOCK", tc, 12);
    // three traces
    const x0 = 14;
    const tw = W - 60;
    trace(g, x0, 34, tw, 90, (u) => Math.sin(u * 22 + t * 1.7) * 0.55 + Math.sin(u * 61 - t * 2.9) * 0.2 + Math.sin(u * 7 + t * 0.4) * 0.2, BLUE_HI, 1.6);
    trace(g, x0, 34, tw, 90, (u) => Math.sin(u * 40 - t * 3.1) * 0.35 * (0.6 + 0.4 * Math.sin(u * 5 + t)), BLUE_LO, 1.2);
    trace(g, x0, 34, tw, 90, (u) => Math.exp(-((((u * 3 + t * 0.35) % 1) - 0.5) ** 2) * 60) * 0.9 - 0.45, AMBER, 1.2);
    scale(g, W - 40, 34, 90, 20);
    text(g, "+dB", W - 30, 30, 9, BLUE_LO, "left", false);
    // spectrum: 48 bars, smooth pseudo-noise in t with amber peak-hold markers
    const n = 48;
    const sx = 14;
    const sw = W - 28;
    const sy = 140;
    const sh = 88;
    g.fillStyle = BLUE_LO;
    g.fillRect(sx, sy + sh + 1, sw, 1);
    for (let i = 0; i < n; i++) {
      const f = i / n;
      let v = 0.22 + 0.18 * Math.sin(i * 1.7 + t * 1.3) + 0.15 * Math.sin(i * 0.53 - t * 0.7) + 0.35 * Math.exp(-((f - 0.31) ** 2) * 90) * (0.8 + 0.2 * Math.sin(t * 5)) + 0.3 * Math.exp(-((f - 0.72) ** 2) * 160) * (0.7 + 0.3 * Math.sin(t * 3.3 + 1));
      v = Math.max(0.03, Math.min(0.98, v));
      const bw = sw / n;
      const bh = sh * v;
      g.fillStyle = v > 0.7 ? AMBER : BLUE;
      g.fillRect(sx + i * bw + 1, sy + sh - bh, bw - 2, bh);
      const hold = Math.min(0.98, v + 0.06 + 0.05 * Math.sin(i + t * 0.5));
      g.fillStyle = BLUE_HI;
      g.fillRect(sx + i * bw + 1, sy + sh - sh * hold - 2, bw - 2, 2);
    }
    text(g, "SPECTRUM 2.1–9.4 GHz", sx, sy - 8, 9, BLUE_LO, "left", false);
    text(g, `LOCK ${(97.2 + Math.sin(t * 0.6) * 1.4).toFixed(1)}%`, W - 14, sy - 8, 9, AMBER, "right", false);
    // footer status
    g.fillStyle = BLUE_LO;
    g.fillRect(14, H - 16, W - 28, 1);
    text(g, "RX-A LOCK   RX-B SYNC   TX-1 STBY   TX-2 XMIT", 14, H - 8, 9, BLUE, "left", false);
    tex.needsUpdate = true;
  };
  draw(0);
  return {
    texture: tex,
    update(t) {
      if (lastT >= 0 && Math.abs(t - lastT) < 0.05) return;
      lastT = t;
      draw(t);
    },
  };
}
