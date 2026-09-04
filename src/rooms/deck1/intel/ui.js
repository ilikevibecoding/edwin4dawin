// Intel room UI textures (module-local, ≤ 2 canvases, red only): a static 1024² atlas (surveillance monitors,
// guard/table consoles, backlit warning signs, labels) and a 512×1024 repeat-wrapped column of scrolling text
// whose v-offset is animated from update().
import * as THREE from "three";
import { makeCanvas, toTexture, mulberry32 } from "../../../textures.js";

export const ATLAS = 1024;
const BG = "#060203";
const RED = "#ff2a1a";
const RED_HI = "#ff8a70";
const RED_LO = "rgba(255,42,26,0.35)";
const RED_DIM = "#7a1a12";
const GRID = "rgba(255,42,26,0.09)";
const MONO = (px, bold = true) => `${bold ? "bold " : ""}${px}px "DejaVu Sans Mono", "Liberation Mono", Menlo, Consolas, monospace`;

export const UI = {
  guard: [0, 576, 512, 256],
  table: [512, 576, 256, 256],
  sign0: [768, 576, 256, 128],
  sign1: [768, 704, 256, 128],
  hatch: [0, 832, 256, 128],
  sign2: [0, 960, 256, 64],
  sign3: [256, 960, 256, 64],
};
for (let i = 0; i < 12; i++) UI["mon" + i] = [(i % 4) * 256, Math.floor(i / 4) * 192, 256, 192];
for (let i = 0; i < 6; i++) UI["label" + i] = [256 + i * 128, 832, 128, 64];
for (let i = 0; i < 6; i++) UI["tag" + i] = [256 + i * 128, 896, 128, 64];
for (let i = 0; i < 4; i++) UI["readout" + i] = [512 + i * 128, 960, 128, 64];

export function uvRect(cell, size = ATLAS) {
  const [x, y, w, h] = cell;
  return [x / size, 1 - (y + h) / size, (x + w) / size, 1 - y / size];
}

function text(g, s, x, y, px, color = RED, align = "left", bold = true) {
  g.fillStyle = color;
  g.font = MONO(px, bold);
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillText(s, x, y);
}
function base(g, [x, y, w, h], { grid = 16, border = true, scan = true } = {}) {
  g.fillStyle = BG;
  g.fillRect(x, y, w, h);
  if (grid) {
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
  }
  if (scan) {
    g.fillStyle = "rgba(255,42,26,0.05)";
    for (let sy = y; sy < y + h; sy += 3) g.fillRect(x, sy, w, 1);
  }
  if (border) {
    g.strokeStyle = RED_LO;
    g.lineWidth = 2;
    g.strokeRect(x + 3, y + 3, w - 6, h - 6);
  }
}
function header(g, [x, y, w], title, code, px = 11) {
  g.fillStyle = RED;
  g.fillRect(x + 8, y + 8, w - 16, 2);
  text(g, title, x + 10, y + 19, px, RED_HI);
  text(g, code, x + w - 10, y + 19, px - 1, RED, "right");
  g.fillStyle = RED_LO;
  g.fillRect(x + 8, y + 28, w - 16, 1);
}
function rows(g, x, y, w, n, pitch, rand, hi = 0.18) {
  for (let i = 0; i < n; i++) {
    const yy = y + i * pitch;
    const bright = rand() < hi;
    g.fillStyle = bright ? RED_HI : RED;
    g.fillRect(x, yy, 6, pitch * 0.5);
    let xx = x + 12;
    const parts = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < parts && xx < x + w; k++) {
      const len = Math.min(x + w - xx, 12 + rand() * (w * 0.28));
      g.fillStyle = k === 0 ? (bright ? RED_HI : RED) : RED_LO;
      g.fillRect(xx, yy, len, pitch * 0.5);
      xx += len + 8;
    }
  }
}
function bars(g, x, y, w, h, n, rand) {
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    const v = 0.15 + rand() * 0.8;
    g.fillStyle = v > 0.8 ? RED_HI : RED;
    g.fillRect(x + i * bw + 1, y + h - h * v, bw - 2, h * v);
  }
}
const ID_CHARS = "0123456789ABCDEF";
function code(rand, n) {
  let s = "";
  for (let i = 0; i < n; i++) s += ID_CHARS[Math.floor(rand() * 16)];
  return s;
}

// --- surveillance monitors: six content kinds, red only
function drawMonitor(g, cell, rand, idx) {
  const [x, y, w, h] = cell;
  base(g, cell, { grid: 0 });
  const kind = idx % 6;
  const cx = x + w / 2;
  if (kind === 0) {
    // perspective corridor wireframe with a tracked box
    g.strokeStyle = RED_LO;
    g.lineWidth = 1;
    for (const [ax, ay] of [[x + 10, y + 10], [x + w - 10, y + 10], [x + 10, y + h - 30], [x + w - 10, y + h - 30]]) {
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(cx, y + h / 2 - 10);
      g.stroke();
    }
    for (let k = 1; k <= 5; k++) {
      const s = 1 / (k * 0.55 + 0.6);
      g.strokeRect(cx - (w / 2 - 10) * s, y + h / 2 - 10 - (h / 2 - 20) * s, (w - 20) * s, (h - 40) * s);
    }
    g.strokeStyle = RED_HI;
    g.lineWidth = 2;
    g.strokeRect(cx + 20, y + 60, 40, 70);
    text(g, "TRK 01", cx + 22, y + 52, 9, RED_HI);
  } else if (kind === 1) {
    // top-down plan with a moving marker
    g.strokeStyle = RED;
    g.lineWidth = 1;
    g.strokeRect(x + 30, y + 30, w - 60, h - 80);
    g.beginPath();
    g.moveTo(x + 30, y + 80);
    g.lineTo(x + 120, y + 80);
    g.moveTo(x + 120, y + 30);
    g.lineTo(x + 120, y + h - 50);
    g.moveTo(x + 170, y + 80);
    g.lineTo(x + w - 30, y + 80);
    g.stroke();
    g.fillStyle = RED_HI;
    g.beginPath();
    g.arc(x + 80 + rand() * 60, y + 100 + rand() * 30, 4, 0, Math.PI * 2);
    g.fill();
    for (let k = 0; k < 3; k++) {
      g.fillStyle = RED;
      g.fillRect(x + 40 + rand() * (w - 90), y + 40 + rand() * (h - 110), 3, 3);
    }
  } else if (kind === 2) {
    // no signal: static
    for (let k = 0; k < 900; k++) {
      g.fillStyle = rand() < 0.5 ? RED_DIM : "rgba(255,42,26,0.15)";
      g.fillRect(x + rand() * w, y + rand() * (h - 24), 3, 1);
    }
    g.fillStyle = BG;
    g.fillRect(cx - 60, y + h / 2 - 24, 120, 30);
    text(g, "NO SIGNAL", cx, y + h / 2 - 10, 14, RED_HI, "center");
  } else if (kind === 3) {
    rows(g, x + 12, y + 14, w - 24, 8, 16, rand);
    bars(g, x + 12, y + h - 70, w - 24, 40, 18, rand);
  } else if (kind === 4) {
    // biometric frame: oval + grid + measure ticks
    g.strokeStyle = RED_LO;
    g.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      g.beginPath();
      g.moveTo(x + 40 + k * 30, y + 20);
      g.lineTo(x + 40 + k * 30, y + h - 40);
      g.stroke();
    }
    g.strokeStyle = RED;
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(cx - 20, y + h / 2 - 12, 34, 48, 0, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = RED_HI;
    g.beginPath();
    g.moveTo(cx - 54, y + h / 2 - 20);
    g.lineTo(cx + 14, y + h / 2 - 20);
    g.stroke();
    rows(g, x + w - 80, y + 20, 68, 6, 14, rand);
    text(g, "MATCH 0.0%", x + w - 12, y + h - 42, 9, RED_HI, "right");
  } else {
    // log text
    for (let k = 0; k < 8; k++) text(g, `${code(rand, 4)}-${code(rand, 2)}  ${["ENTRY", "DENIED", "SCAN", "PURGE", "LOCK", "OPEN"][Math.floor(rand() * 6)]}  ${String(Math.floor(rand() * 24)).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}`, x + 12, y + 18 + k * 17, 10, k === 2 ? RED_HI : RED, "left", false);
  }
  // footer: camera label and timestamp
  g.fillStyle = "rgba(6,2,3,0.9)";
  g.fillRect(x + 4, y + h - 22, w - 8, 18);
  text(g, `CAM ${String(idx + 3).padStart(2, "0")} · ${["D2 DETENTION", "D2 ARMORY", "D4 HANGAR", "D1 SPINE", "D3 REACTOR", "D2 MEDBAY", "D1 LOBBY", "D4 CARGO", "D2 MESS", "D1 OBS", "D3 HYPER", "D2 PODS"][idx]}`, x + 10, y + h - 13, 9, RED, "left", false);
  text(g, `0${idx % 9}:${String((idx * 17) % 60).padStart(2, "0")}:${String((idx * 31) % 60).padStart(2, "0")}`, x + w - 10, y + h - 13, 9, RED_HI, "right", false);
  g.fillStyle = RED_HI;
  g.fillRect(x + w - 20, y + 8, 8, 8);
}

function drawGuard(g, cell, rand) {
  const [x, y, w, h] = cell;
  base(g, cell);
  header(g, cell, "SECURITY LOCK 4-A · INTELLIGENCE SECTION", "GUARD POST", 12);
  // big LOCKED box
  g.strokeStyle = RED;
  g.lineWidth = 3;
  g.strokeRect(x + 16, y + 44, 170, 70);
  g.fillStyle = "rgba(255,42,26,0.15)";
  g.fillRect(x + 16, y + 44, 170, 70);
  text(g, "LOCKED", x + 101, y + 72, 26, RED_HI, "center");
  text(g, "INNER GATE · SCANNER ARMED", x + 101, y + 100, 9, RED, "center", false);
  // access log
  text(g, "ACCESS LOG", x + 204, y + 44, 10, RED_HI);
  for (let k = 0; k < 9; k++) {
    const denied = rand() < 0.35;
    text(g, `${code(rand, 6)}  ${denied ? "DENIED " : "GRANTED"}  L${1 + Math.floor(rand() * 4)}  ${String(Math.floor(rand() * 24)).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}`, x + 204, y + 62 + k * 15, 10, denied ? RED_HI : RED, "left", false);
  }
  // biometric bars + status matrix
  text(g, "BIOMETRIC", x + 16, y + 130, 10, RED_HI);
  bars(g, x + 16, y + 140, 170, 50, 14, rand);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 10; c++) {
      if (rand() < 0.3) continue;
      g.fillStyle = rand() < 0.2 ? RED_HI : RED;
      g.fillRect(x + 16 + c * 17, y + 200 + r * 14, 12, 9);
    }
  rows(g, x + 204, y + 200, w - 224, 3, 14, rand);
}

function drawTable(g, cell, rand) {
  const [x, y, w, h] = cell;
  base(g, cell);
  header(g, cell, "TARGET COMPLEX · ANALYSIS", "TBL-1", 11);
  // hex-ish map of nodes
  g.strokeStyle = RED_LO;
  g.lineWidth = 1;
  const pts = [];
  for (let k = 0; k < 10; k++) pts.push([x + 24 + rand() * (w - 48), y + 44 + rand() * 110]);
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) {
      if (rand() < 0.3) {
        g.beginPath();
        g.moveTo(pts[i][0], pts[i][1]);
        g.lineTo(pts[j][0], pts[j][1]);
        g.stroke();
      }
    }
  for (const [px, py] of pts) {
    g.fillStyle = rand() < 0.25 ? RED_HI : RED;
    g.fillRect(px - 3, py - 3, 6, 6);
  }
  rows(g, x + 16, y + 170, w - 32, 5, 14, rand);
}

function drawSign(g, cell, lines, { big = 22, small = 12, invert = false } = {}) {
  const [x, y, w, h] = cell;
  g.fillStyle = invert ? RED : "#0a0304";
  g.fillRect(x, y, w, h);
  g.fillStyle = invert ? "#0a0304" : RED;
  g.fillRect(x + 8, y + 6, w - 16, 3);
  g.fillRect(x + 8, y + h - 9, w - 16, 3);
  const pitch = Math.min(28, (h - 20) / lines.length);
  lines.forEach((s, i) => text(g, s, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * pitch, i === 0 ? big : small, invert ? "#0a0304" : i === 0 ? RED_HI : RED, "center"));
}

function drawLabel(g, cell, s, sub) {
  const [x, y, w, h] = cell;
  g.fillStyle = "#0a0304";
  g.fillRect(x, y, w, h);
  g.strokeStyle = RED_LO;
  g.lineWidth = 2;
  g.strokeRect(x + 3, y + 3, w - 6, h - 6);
  text(g, s, x + w / 2, y + (sub ? 24 : h / 2), 16, RED_HI, "center");
  if (sub) text(g, sub, x + w / 2, y + 46, 9, RED, "center", false);
}

function drawReadout(g, cell, rand, idx) {
  const [x, y, w, h] = cell;
  base(g, cell, { grid: 16, border: false });
  g.strokeStyle = RED_LO;
  g.lineWidth = 1;
  g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  if (idx % 2 === 0) {
    text(g, ["QUEUE", "PURGE"][idx / 2], x + 8, y + 14, 10, RED);
    text(g, `${Math.floor(rand() * 900 + 100)}`, x + w - 8, y + 40, 22, RED_HI, "right");
  } else bars(g, x + 6, y + 8, w - 12, h - 16, 14, rand);
}

export function makeIntelAtlas() {
  const c = makeCanvas(ATLAS, ATLAS);
  const g = c.getContext("2d");
  const rand = mulberry32(8123);
  g.fillStyle = BG;
  g.fillRect(0, 0, ATLAS, ATLAS);
  for (let i = 0; i < 12; i++) drawMonitor(g, UI["mon" + i], rand, i);
  drawGuard(g, UI.guard, rand);
  drawTable(g, UI.table, rand);
  drawSign(g, UI.sign0, ["RESTRICTED AREA", "LEVEL 4 CLEARANCE REQUIRED", "SURVEILLANCE ACTIVE"]);
  drawSign(g, UI.sign1, ["SECURITY LOCK", "AUTHORISED PERSONNEL ONLY", "SCANNER ARMED"], { invert: false });
  drawSign(g, UI.hatch, ["EVIDENCE", "SEALED — DO NOT OPEN", "CUSTODY SEAL 4-A-117"]);
  drawSign(g, UI.sign2, ["NO RECORDING DEVICES"], { big: 16 });
  drawSign(g, UI.sign3, ["LOCK IN OPERATION"], { big: 16, invert: true });
  const labels = ["ARCHIVE 01", "ARCHIVE 02", "ARCHIVE 03", "ARCHIVE 04", "ARCHIVE 05", "ARCHIVE 06"];
  labels.forEach((s, i) => drawLabel(g, UI["label" + i], s, ["SIGINT", "ASSETS", "CIPHER", "WATCHLIST", "PURGED", "CUSTODY"][i]));
  ["DATASTREAM 01", "DATASTREAM 02", "DATASTREAM 03", "DATASTREAM 04", "DATASTREAM 05", "SURVEILLANCE"].forEach((s, i) => drawLabel(g, UI["tag" + i], s));
  for (let i = 0; i < 4; i++) drawReadout(g, UI["readout" + i], rand, i);
  const tex = toTexture(c, { srgb: true, wrap: false });
  tex.anisotropy = 8;
  return tex;
}

// Scrolling text column: 512×1024, four 128-px columns of 32 lines (pitch 32 → seamless in v).
export function makeScrollTexture() {
  const W = 512;
  const H = 1024;
  const c = makeCanvas(W, H);
  const g = c.getContext("2d");
  const rand = mulberry32(919);
  g.fillStyle = BG;
  g.fillRect(0, 0, W, H);
  const names = ["KORRIN", "VASH", "DRELL", "OSKAN", "MIRETH", "TALLO", "SEVRIN", "ORDO", "HALE", "ZAYN", "PELL", "REVEK"];
  for (let col = 0; col < 4; col++) {
    const x0 = col * 128;
    g.fillStyle = RED_LO;
    g.fillRect(x0 + 6, 0, 1, H);
    for (let l = 0; l < 32; l++) {
      const y = l * 32 + 16;
      const r = rand();
      if (r < 0.12) {
        g.fillStyle = "rgba(255,42,26,0.22)";
        g.fillRect(x0 + 10, y - 13, 112, 26);
        text(g, `${code(rand, 4)} ${["FLAG", "HOLD", "TRACE", "PURGE"][Math.floor(rand() * 4)]}`, x0 + 14, y, 12, RED_HI);
      } else if (r < 0.2) {
        g.fillStyle = RED;
        g.fillRect(x0 + 14, y - 5, 60 + rand() * 40, 10);
      } else {
        text(g, `${code(rand, 2)}-${code(rand, 3)}`, x0 + 12, y, 11, RED, "left", false);
        text(g, `${names[Math.floor(rand() * names.length)].slice(0, 6)}`, x0 + 62, y, 10, r < 0.5 ? RED_DIM : RED, "left", false);
        text(g, `L${1 + Math.floor(rand() * 4)}`, x0 + 120, y, 10, RED_HI, "right", false);
      }
    }
  }
  const tex = toTexture(c, { srgb: true, wrap: true });
  tex.anisotropy = 4;
  return tex;
}
