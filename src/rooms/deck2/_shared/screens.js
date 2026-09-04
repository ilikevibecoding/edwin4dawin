// Procedural Imperial UI screens (§10 "red/blue wireframes, tactical grids, text columns") used as
// the screenImp0..3 fallbacks until A's shared set lands. Four distinct layouts so the same screen
// does not repeat across rooms: 0 schematic, 1 tactical grid, 2 text columns, 3 gauges + alert.
import * as THREE from "three";
import { mulberry32 } from "../../../textures.js";

const BG = "#05070c";
const BLUE = "#3a7bff";
const BLUE_DIM = "#1d3f8a";
const RED = "#ff2a1a";
const AMBER = "#ffa028";
const GREEN = "#38d67a";
const TEXT = "#7f96c8";

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function frame(g, w, h, accent) {
  g.fillStyle = BG;
  g.fillRect(0, 0, w, h);
  // faint scanlines
  g.fillStyle = "rgba(255,255,255,0.025)";
  for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
  // bezel-side header bar + corner ticks
  g.fillStyle = accent;
  g.fillRect(12, 10, w - 24, 3);
  g.fillRect(12, h - 13, 60, 3);
  g.fillStyle = TEXT;
  for (let i = 0; i < 6; i++) g.fillRect(w - 24 - i * 14, h - 14, 8, 4);
}

// fake text: runs of short bars with varying widths
function textLines(g, x, y, w, n, rand, color = TEXT, lh = 11) {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    let cx = x;
    const yy = y + i * lh;
    while (cx < x + w - 6) {
      const bw = 6 + Math.floor(rand() * 22);
      if (cx + bw > x + w) break;
      g.fillRect(cx, yy, bw, 5);
      cx += bw + 5;
    }
  }
}

export function makeImperialScreen(kind = 0, seed = 1, w = 512, h = 256) {
  const rand = mulberry32(seed + kind * 977);
  const c = canvas(w, h);
  const g = c.getContext("2d");
  const accent = kind === 3 ? AMBER : kind === 0 ? RED : BLUE;
  frame(g, w, h, accent);
  g.lineWidth = 1.5;
  if (kind === 0) {
    // schematic: wireframe hull / reactor cross-section in blue with red callouts
    g.strokeStyle = BLUE;
    g.beginPath();
    g.moveTo(60, 200);
    g.lineTo(256, 40);
    g.lineTo(452, 200);
    g.closePath();
    g.stroke();
    for (let i = 1; i < 6; i++) {
      const y = 40 + (160 * i) / 6;
      const half = ((y - 40) / 160) * 196;
      g.strokeStyle = BLUE_DIM;
      g.beginPath();
      g.moveTo(256 - half, y);
      g.lineTo(256 + half, y);
      g.stroke();
    }
    g.strokeStyle = BLUE;
    g.strokeRect(226, 120, 60, 60);
    g.beginPath();
    g.arc(256, 150, 18, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = RED;
    for (let i = 0; i < 4; i++) {
      const x = 90 + rand() * 330;
      const y = 60 + rand() * 130;
      g.fillRect(x - 3, y - 3, 6, 6);
      g.strokeStyle = RED;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 30, y - 20);
      g.lineTo(x + 70, y - 20);
      g.stroke();
      textLines(g, x + 32, y - 34, 44, 1, rand, RED);
    }
    textLines(g, 24, 28, 120, 3, rand);
    textLines(g, 380, 210, 110, 2, rand);
  } else if (kind === 1) {
    // tactical grid with contacts and a sweep
    g.strokeStyle = BLUE_DIM;
    for (let x = 24; x < w - 12; x += 24) {
      g.beginPath();
      g.moveTo(x, 24);
      g.lineTo(x, h - 24);
      g.stroke();
    }
    for (let y = 24; y < h - 12; y += 24) {
      g.beginPath();
      g.moveTo(24, y);
      g.lineTo(w - 24, y);
      g.stroke();
    }
    g.strokeStyle = BLUE;
    for (const r of [40, 80, 120]) {
      g.beginPath();
      g.arc(256, 128, r, 0, Math.PI * 2);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(256, 128);
    g.lineTo(256 + 120 * Math.cos(0.6), 128 - 120 * Math.sin(0.6));
    g.stroke();
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2;
      const r = 20 + rand() * 100;
      g.fillStyle = rand() < 0.3 ? RED : BLUE;
      g.fillRect(256 + r * Math.cos(a) - 3, 128 + r * Math.sin(a) - 3, 6, 6);
    }
    textLines(g, 24, 28, 90, 4, rand);
    textLines(g, 400, 28, 90, 4, rand);
    g.fillStyle = AMBER;
    g.fillRect(24, h - 40, 120, 8);
  } else if (kind === 2) {
    // text columns / manifest list with status lamps
    textLines(g, 24, 30, 200, 17, rand, TEXT, 12);
    textLines(g, 250, 30, 120, 17, rand, "#546a94", 12);
    for (let i = 0; i < 17; i++) {
      const r = rand();
      g.fillStyle = r < 0.65 ? BLUE : r < 0.88 ? AMBER : RED;
      g.fillRect(400, 30 + i * 12, 60 * (0.3 + rand() * 0.7), 6);
      g.fillStyle = r < 0.88 ? GREEN : RED;
      g.fillRect(476, 30 + i * 12, 8, 6);
    }
  } else {
    // gauges: bar graph, two dials, alert box
    for (let i = 0; i < 14; i++) {
      const v = 0.2 + rand() * 0.75;
      g.fillStyle = v > 0.85 ? RED : v > 0.65 ? AMBER : BLUE;
      g.fillRect(28 + i * 18, 200 - v * 150, 12, v * 150);
    }
    g.strokeStyle = BLUE_DIM;
    g.beginPath();
    g.moveTo(24, 200);
    g.lineTo(290, 200);
    g.stroke();
    for (const [cx, val] of [[350, 0.35 + rand() * 0.3], [440, 0.5 + rand() * 0.45]]) {
      g.strokeStyle = BLUE_DIM;
      g.beginPath();
      g.arc(cx, 110, 38, Math.PI, Math.PI * 2);
      g.stroke();
      g.strokeStyle = val > 0.8 ? RED : AMBER;
      g.lineWidth = 4;
      g.beginPath();
      g.arc(cx, 110, 38, Math.PI, Math.PI + Math.PI * val);
      g.stroke();
      g.lineWidth = 1.5;
      textLines(g, cx - 22, 120, 44, 1, rand);
    }
    g.fillStyle = "rgba(255,42,26,0.18)";
    g.fillRect(310, 160, 170, 50);
    g.strokeStyle = RED;
    g.strokeRect(310, 160, 170, 50);
    textLines(g, 320, 170, 150, 3, rand, RED, 12);
    textLines(g, 24, 28, 200, 2, rand);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
