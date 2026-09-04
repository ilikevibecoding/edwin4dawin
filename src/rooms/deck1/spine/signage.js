// Deck 1 corridor signage: two module-local 1024² canvas atlases (COORDINATION.md §10 allows ≤ 2 per module),
// shared by the spine, both side passages and the lift lobby. Original wording only, no insignia.
//   atlas A (`sign` backlit / `signPaint` matte): 32 label cells, arrows, "01" numerals, yellow/black chevrons
//   atlas B (`board` backlit): Deck 1 plan board, lift-status board, the bulkhead's sealed plate and readout
import * as THREE from "three";
import { BOUNDS, LIFT } from "../shared/plan.js";

const SIZE = 1024;
const COLS = 2;
const CELL_W = SIZE / COLS; // 512
const CELL_H = 56;
const LEFT_ROWS = 18; // left column: 18 label rows (y 0..1008)
const RIGHT_ROWS = 14; // right column: 14 label rows (y 0..784), then the numeral / arrow band
const BAND_Y = RIGHT_ROWS * CELL_H; // 784
const BAND_H = SIZE - BAND_Y; // 240

const PANEL = "#0c0d10";
const WHITE = "#e8ecf3";
const RED = "#ff3b2e";
const AMBER = "#ffb040";
const YELLOW = "#f2c230";
const DIM = "#8a919c";

// Label cells (index → text, colour). Keep them short: one line per cell.
export const LABELS = [
  ["BRIDGE", WHITE],
  ["TURBOLIFT", WHITE],
  ["PORT PASSAGE", WHITE],
  ["STARBOARD PASSAGE", WHITE],
  ["OFFICERS' QUARTERS", WHITE],
  ["NAVIGATION", WHITE],
  ["COMMUNICATIONS", WHITE],
  ["OBSERVATION GALLERY", WHITE],
  ["TACTICAL PLANNING", WHITE],
  ["INTELLIGENCE", WHITE],
  ["RESTRICTED", RED],
  ["SEALED", RED],
  ["NO ACCESS", RED],
  ["MAINTENANCE", AMBER],
  ["DECK 01 · COMMAND", WHITE],
  ["LIFT LOBBY", WHITE],
  ["AUTHORISED PERSONNEL ONLY", AMBER],
  ["EMERGENCY EQUIPMENT", RED],
  ["__chevrons", YELLOW],
  ["FIRE POINT", RED],
  ["SECTION 1-A", WHITE],
  ["SECTION 1-B", WHITE],
  ["FIRE SUPPRESSION", RED],
  ["COMMS", WHITE],
  ["EQUIPMENT LOCKER", WHITE],
  ["SERVICE ACCESS", AMBER],
  ["EMERGENCY SUPPLIES", WHITE],
  ["LIFT STATUS", RED],
  ["PRESSURE · NOMINAL", AMBER],
  ["CALL PANEL", WHITE],
];
if (LABELS.length > LEFT_ROWS + RIGHT_ROWS) throw new Error("signage atlas: too many labels");
export const LABEL_ASPECT = CELL_W / CELL_H; // ≈ 9.14 : 1 — sign quads must use this w/h ratio

const LABEL_INDEX = Object.fromEntries(LABELS.map(([t], i) => [t, i]));
const cellXY = (i) => (i < LEFT_ROWS ? [0, i * CELL_H] : [CELL_W, (i - LEFT_ROWS) * CELL_H]);
const rect = (x0, y0, w, h) => [x0 / SIZE, 1 - (y0 + h) / SIZE, (x0 + w) / SIZE, 1 - y0 / SIZE];

// uv rect [u0, v0, u1, v1] for a label (by text) — canvas rows run top-down, texture v bottom-up
export function labelRect(text) {
  const i = LABEL_INDEX[text];
  if (i === undefined) throw new Error(`unknown sign label "${text}"`);
  const [x0, y0] = cellXY(i);
  return rect(x0, y0, CELL_W, CELL_H);
}
export const chevronRect = () => labelRect("__chevrons");

// Band (right column, y 784..1024): "01" numerals in a 240 px square, then the four arrows in a 2 × 2 grid.
const NUM_X0 = CELL_W;
const ARROWS = ["left", "right", "up", "down"];
const ARROW_X0 = CELL_W + BAND_H; // 752
const ARROW_S = BAND_H / 2; // 120
export function arrowRect(dir) {
  const k = ARROWS.indexOf(dir);
  if (k < 0) throw new Error(`unknown arrow "${dir}"`);
  const x0 = ARROW_X0 + (k % 2) * ARROW_S + 10;
  const y0 = BAND_Y + Math.floor(k / 2) * ARROW_S + 10;
  return rect(x0, y0, ARROW_S - 20, ARROW_S - 20);
}
export function numeralRect() {
  return rect(NUM_X0, BAND_Y, BAND_H, BAND_H);
}

const FONT = (px) => `bold ${px}px "DejaVu Sans", "Liberation Sans", "Helvetica Neue", Arial, sans-serif`;

// Fit-to-width single line with wide tracking.
function fitText(ctx, text, cx, cy, maxW, px0, color, spacing = "4px", minPx = 14) {
  let px = px0;
  ctx.letterSpacing = spacing;
  ctx.font = FONT(px);
  while (px > minPx && ctx.measureText(text).width > maxW) {
    px -= 2;
    ctx.font = FONT(px);
  }
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy);
  ctx.letterSpacing = "0px";
}

function drawAtlasA() {
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext("2d");
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // --- labels: fit-to-width, a hairline rule at the cell foot so a panel reads as a fixture
  LABELS.forEach(([text, color], i) => {
    const [x0, y0] = cellXY(i);
    if (text === "__chevrons") {
      drawChevrons(ctx, x0, y0, CELL_W, CELL_H);
      return;
    }
    fitText(ctx, text, x0 + CELL_W / 2, y0 + CELL_H / 2 + 1, CELL_W - 44, 38, color, "5px");
    ctx.fillStyle = "#2a2d34";
    ctx.fillRect(x0 + 20, y0 + CELL_H - 4, CELL_W - 40, 2);
  });

  // --- arrows (chevron-headed, white) in the 2 × 2 grid
  ARROWS.forEach((dir, k) => {
    const cx = ARROW_X0 + (k % 2) * ARROW_S + ARROW_S / 2;
    const cy = BAND_Y + Math.floor(k / 2) * ARROW_S + ARROW_S / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[dir]);
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    // shaft + head pointing +x (fits a 100 px square)
    ctx.moveTo(-40, -10);
    ctx.lineTo(8, -10);
    ctx.lineTo(8, -30);
    ctx.lineTo(44, 0);
    ctx.lineTo(8, 30);
    ctx.lineTo(8, 10);
    ctx.lineTo(-40, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // --- deck numerals "01" with a red rule beneath
  {
    const s = BAND_H;
    const x0 = NUM_X0;
    const y0 = BAND_Y;
    ctx.fillStyle = WHITE;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "-6px";
    ctx.font = FONT(180);
    ctx.fillText("01", x0 + s / 2, y0 + s * 0.44);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = RED;
    ctx.fillRect(x0 + s * 0.14, y0 + s * 0.84, s * 0.72, s * 0.045);
  }
  return c;
}

// Yellow/black hazard chevrons filling a cell (7 chevrons leaning right).
function drawChevrons(ctx, x0, y0, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.fillStyle = "#15150f";
  ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = YELLOW;
  const n = 7;
  const step = w / n;
  const lean = h * 0.7;
  for (let k = -1; k <= n; k++) {
    const x = x0 + k * step;
    ctx.beginPath();
    ctx.moveTo(x, y0 + h);
    ctx.lineTo(x + step / 2, y0 + h);
    ctx.lineTo(x + step / 2 + lean, y0);
    ctx.lineTo(x + lean, y0);
    ctx.closePath();
    ctx.fill();
  }
  // worn edge: a faint dark band top and bottom
  ctx.fillStyle = "rgba(12,13,16,0.55)";
  ctx.fillRect(x0, y0, w, 3);
  ctx.fillRect(x0, y0 + h - 3, w, 3);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Atlas B: boards (plan 1024 × 512, lift status 576 × 384, sealed plate 448 × 168, readout 448 × 80)
// ---------------------------------------------------------------------------
const B = {
  plan: [0, 0, 1024, 512],
  status: [0, 512, 576, 384],
  sealedPlate: [576, 512, 448, 168],
  readout: [576, 700, 448, 80],
};
export function boardRect(name) {
  const r = B[name];
  if (!r) throw new Error(`unknown board "${name}"`);
  return rect(...r);
}
export const BOARD_ASPECT = Object.fromEntries(Object.entries(B).map(([k, [, , w, h]]) => [k, w / h]));

function drawAtlasB() {
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext("2d");
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, SIZE, SIZE);
  drawPlan(ctx, ...B.plan);
  drawStatus(ctx, ...B.status);
  drawSealedPlate(ctx, ...B.sealedPlate);
  drawReadout(ctx, ...B.readout);
  return c;
}

// Deck 1 schematic from shared/plan.js bounds, forward (-z) up, lobby marked "YOU ARE HERE".
function drawPlan(ctx, X, Y, W, H) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(X, Y, W, H);
  ctx.clip();
  ctx.fillStyle = "#0b0f16";
  ctx.fillRect(X, Y, W, H);
  // faint grid
  ctx.strokeStyle = "rgba(90,110,140,0.18)";
  ctx.lineWidth = 1;
  for (let gx = X; gx <= X + W; gx += 64) {
    ctx.beginPath();
    ctx.moveTo(gx, Y);
    ctx.lineTo(gx, Y + H);
    ctx.stroke();
  }
  for (let gy = Y; gy <= Y + H; gy += 64) {
    ctx.beginPath();
    ctx.moveTo(X, gy);
    ctx.lineTo(X + W, gy);
    ctx.stroke();
  }
  const S = 5.3; // px per metre
  const ox = X + W / 2; // world x 0
  const oy = Y + 88; // world z 458
  const px = (x) => ox + x * S;
  const py = (z) => oy + (z - 458) * S;
  const room = (id, label, { fill = "#242a35", stroke = "#9aa6b8", text = WHITE, small = false, rotate = false } = {}) => {
    const b = BOUNDS[id];
    const x0 = px(b.min[0]);
    const x1 = px(b.max[0]);
    const y0 = py(b.min[2]);
    const y1 = py(b.max[2]);
    ctx.fillStyle = fill;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    if (!label) return;
    ctx.save();
    ctx.translate((x0 + x1) / 2, (y0 + y1) / 2);
    if (rotate) ctx.rotate(-Math.PI / 2);
    fitText(ctx, label, 0, 0, (rotate ? y1 - y0 : x1 - x0) - 10, small ? 14 : 20, text, "1px", 10);
    ctx.restore();
  };
  room("d1-officers", "OFFICERS' QUARTERS");
  room("d1-bridge", "BRIDGE");
  room("d1-observation", "OBSERVATION GALLERY");
  room("d1-nav", "NAVIGATION");
  room("d1-comms", "COMMUNICATIONS");
  room("d1-tactical", "TACTICAL PLANNING");
  room("d1-intel", "INTELLIGENCE", { text: RED });
  room("d1-corridor-port", null);
  room("d1-corridor-stbd", null);
  room("d1-spine", null, { fill: "#2e3542" });
  room("d1-lobby", null, { fill: "#4a3a16", stroke: AMBER });
  // corridor names beside the passages, spine name inside
  ctx.save();
  ctx.translate(px(-26.5), py(489));
  ctx.rotate(-Math.PI / 2);
  fitText(ctx, "PORT PASSAGE", 0, 0, 200, 14, DIM, "1px");
  ctx.restore();
  ctx.save();
  ctx.translate(px(26.5), py(489));
  ctx.rotate(Math.PI / 2);
  fitText(ctx, "STARBOARD PASSAGE", 0, 0, 200, 14, DIM, "1px");
  ctx.restore();
  fitText(ctx, "MAIN SPINE · SECTION 1-A", px(-50), py(514), 240, 14, DIM, "1px");
  fitText(ctx, "MAIN SPINE · SECTION 1-B", px(50), py(514), 240, 14, DIM, "1px");
  // doors as white ticks
  const door = (x, z, horizontal) => {
    ctx.fillStyle = WHITE;
    if (horizontal) ctx.fillRect(px(x) - 7, py(z) - 2, 14, 4);
    else ctx.fillRect(px(x) - 2, py(z) - 7, 4, 14);
  };
  door(0, 512, true);
  door(0, 516, true);
  door(-21.8, 512, true);
  door(21.8, 512, true);
  door(66, 512, true);
  door(-21.8, 466, true);
  door(-20, 506, false);
  door(20, 506, false);
  door(-23.6, 477, false);
  door(-23.6, 499, false);
  door(23.6, 477, false);
  door(23.6, 497, false);
  // lift + you-are-here marker
  const lx = px(LIFT.pos[0]);
  const ly = py(LIFT.pos[2]);
  ctx.fillStyle = AMBER;
  ctx.fillRect(lx - 10, ly - 4, 20, 8);
  const mx = px(0);
  const my = py(519.5);
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(mx, my, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(mx, my, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(mx + 14, my);
  ctx.lineTo(mx + 120, my + 38);
  ctx.lineTo(mx + 150, my + 38);
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = FONT(20);
  ctx.letterSpacing = "2px";
  ctx.fillStyle = RED;
  ctx.fillText("YOU ARE HERE · LIFT LOBBY", mx + 156, my + 38);
  // title bar and legend
  ctx.fillStyle = "#e8ecf3";
  ctx.font = FONT(30);
  ctx.letterSpacing = "4px";
  ctx.fillText("DECK 01 · COMMAND", X + 24, Y + 32);
  ctx.font = FONT(16);
  ctx.letterSpacing = "2px";
  ctx.fillStyle = DIM;
  ctx.fillText("DECK PLAN · FORWARD IS UP", X + 24, Y + 62);
  ctx.textAlign = "right";
  ctx.fillText("TURBOLIFT T1 · DECKS 01–04", X + W - 24, Y + 32);
  ctx.fillStyle = AMBER;
  ctx.fillText("▲ FORWARD", X + W - 24, Y + 62);
  ctx.letterSpacing = "0px";
  ctx.restore();
}

// Lift-status board: red header, amber car rows, deck strip with 01 highlighted.
function drawStatus(ctx, X, Y, W, H) {
  ctx.save();
  ctx.fillStyle = "#0c0d10";
  ctx.fillRect(X, Y, W, H);
  ctx.fillStyle = "#5a1410";
  ctx.fillRect(X, Y, W, 64);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = FONT(34);
  ctx.letterSpacing = "4px";
  ctx.fillStyle = WHITE;
  ctx.fillText("LIFT STATUS", X + 24, Y + 33);
  ctx.textAlign = "right";
  ctx.fillStyle = RED;
  ctx.fillText("T1", X + W - 24, Y + 33);
  const row = (i, a, b, colB) => {
    const y = Y + 64 + 52 * i + 30;
    ctx.fillStyle = i % 2 ? "#101217" : "#0c0d10";
    ctx.fillRect(X, y - 26, W, 52);
    ctx.font = FONT(26);
    ctx.letterSpacing = "3px";
    ctx.textAlign = "left";
    ctx.fillStyle = WHITE;
    ctx.fillText(a, X + 24, y);
    ctx.textAlign = "right";
    ctx.fillStyle = colB;
    ctx.fillText(b, X + W - 24, y);
  };
  row(0, "CAR 1", "DECK 01 · READY", AMBER);
  row(1, "CAR 2", "DECK 04 · IN TRANSIT", AMBER);
  row(2, "DOORS", "CLOSED", AMBER);
  row(3, "PRIORITY", "COMMAND STAFF", RED);
  // deck strip
  const sy = Y + H - 72;
  ["01", "02", "03", "04"].forEach((d, k) => {
    const bx = X + 24 + k * ((W - 48) / 4);
    const bw = (W - 48) / 4 - 12;
    ctx.fillStyle = k === 0 ? AMBER : "#1a1d24";
    ctx.fillRect(bx, sy, bw, 52);
    ctx.font = FONT(28);
    ctx.letterSpacing = "2px";
    ctx.textAlign = "center";
    ctx.fillStyle = k === 0 ? "#1a1208" : DIM;
    ctx.fillText(d, bx + bw / 2, sy + 27);
  });
  ctx.letterSpacing = "0px";
  ctx.restore();
}

// 0.8 × 0.3 m sealed plate with a red border.
function drawSealedPlate(ctx, X, Y, W, H) {
  ctx.save();
  ctx.fillStyle = "#0c0d10";
  ctx.fillRect(X, Y, W, H);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 10;
  ctx.strokeRect(X + 7, Y + 7, W - 14, H - 14);
  fitText(ctx, "MAINTENANCE", X + W / 2, Y + 44, W - 60, 34, AMBER, "6px");
  fitText(ctx, "SEALED", X + W / 2, Y + 100, W - 60, 60, RED, "12px");
  fitText(ctx, "NO ENTRY · HULL SECTION 1-B", X + W / 2, Y + H - 26, W - 60, 18, WHITE, "3px");
  ctx.restore();
}

// 0.3 m status readout strip.
function drawReadout(ctx, X, Y, W, H) {
  ctx.save();
  ctx.fillStyle = "#14090a";
  ctx.fillRect(X, Y, W, H);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 6;
  ctx.strokeRect(X + 4, Y + 4, W - 8, H - 8);
  fitText(ctx, "SEALED · NO ENTRY", X + W / 2, Y + H / 2 + 1, W - 40, 44, RED, "6px");
  ctx.restore();
}

let cacheA = null;
let cacheB = null;
function canvasTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
const backlit = (tex) =>
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 1.0,
    roughness: 0.32,
    metalness: 0.05,
    envMapIntensity: 0.6,
  });

// Materials for manifest.materials(shared): built once and shared by the four corridor modules (one GPU texture
// per atlas; each room still gets its own merged mesh = +1 draw call per material used).
export function signMaterials() {
  if (cacheA) return cacheA;
  const tex = canvasTexture(drawAtlasA());
  const sign = backlit(tex);
  const signPaint = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, roughness: 0.62, metalness: 0.1, envMapIntensity: 0.5 });
  cacheA = { sign, signPaint };
  return cacheA;
}
export function boardMaterials() {
  if (cacheB) return cacheB;
  cacheB = { board: backlit(canvasTexture(drawAtlasB())) };
  return cacheB;
}
