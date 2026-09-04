// Deck 1 corridor signage: one module-local 1024² canvas atlas (COORDINATION.md §10 allows ≤ 2 per module) shared
// by the spine, both side passages and the lift lobby. Original wording only, no insignia. Two materials are built
// from the same texture: `sign` (backlit: emissive glyphs on a near-black panel) and `signPaint` (matte, for floor
// chevrons and stencils that must not glow).
import * as THREE from "three";

const SIZE = 1024;
const COLS = 2;
const CELL_W = SIZE / COLS; // 512
const CELL_H = 70;
const ROWS = 11; // labels occupy y 0..770; the band below holds arrows and the deck numerals
const BAND_Y = ROWS * CELL_H; // 770
const BAND_H = SIZE - BAND_Y; // 254

const PANEL = "#0c0d10";
const WHITE = "#e8ecf3";
const RED = "#ff3b2e";
const AMBER = "#ffb040";
const YELLOW = "#f2c230";

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
];
export const LABEL_ASPECT = CELL_W / CELL_H; // ≈ 7.31 : 1 — sign quads must use this w/h ratio

const LABEL_INDEX = Object.fromEntries(LABELS.map(([t], i) => [t, i]));

// uv rect [u0, v0, u1, v1] for a label (by text) — canvas rows run top-down, texture v bottom-up
export function labelRect(text) {
  const i = LABEL_INDEX[text];
  if (i === undefined) throw new Error(`unknown sign label "${text}"`);
  const x0 = (i % COLS) * CELL_W;
  const y0 = Math.floor(i / COLS) * CELL_H;
  return [x0 / SIZE, 1 - (y0 + CELL_H) / SIZE, (x0 + CELL_W) / SIZE, 1 - y0 / SIZE];
}
export const chevronRect = () => labelRect("__chevrons");

// Arrow cells in the bottom band: four 192 px columns, glyph in a centred 160 px square.
const ARROWS = ["left", "right", "up", "down"];
const ARROW_COL_W = 192;
const ARROW_SQ = 160;
export function arrowRect(dir) {
  const k = ARROWS.indexOf(dir);
  if (k < 0) throw new Error(`unknown arrow "${dir}"`);
  const x0 = k * ARROW_COL_W + (ARROW_COL_W - ARROW_SQ) / 2;
  const y0 = BAND_Y + (BAND_H - ARROW_SQ) / 2;
  return [x0 / SIZE, 1 - (y0 + ARROW_SQ) / SIZE, (x0 + ARROW_SQ) / SIZE, 1 - y0 / SIZE];
}

// Deck numerals "01": square cell at the right end of the band.
const NUM_X0 = SIZE - BAND_H; // 770
export function numeralRect() {
  return [NUM_X0 / SIZE, 1 - SIZE / SIZE, SIZE / SIZE, 1 - BAND_Y / SIZE];
}

function drawAtlas() {
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext("2d");
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const FONT = (px) => `bold ${px}px "DejaVu Sans", "Liberation Sans", "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // --- labels: fit-to-width, wide tracking, a hairline rule at the cell foot so a panel reads as a fixture
  LABELS.forEach(([text, color], i) => {
    const x0 = (i % COLS) * CELL_W;
    const y0 = Math.floor(i / COLS) * CELL_H;
    if (text === "__chevrons") {
      drawChevrons(ctx, x0, y0, CELL_W, CELL_H);
      return;
    }
    let px = 46;
    ctx.letterSpacing = "5px";
    ctx.font = FONT(px);
    while (px > 18 && ctx.measureText(text).width > CELL_W - 48) {
      px -= 2;
      ctx.font = FONT(px);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, x0 + CELL_W / 2, y0 + CELL_H / 2 + 1);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#2a2d34";
    ctx.fillRect(x0 + 20, y0 + CELL_H - 5, CELL_W - 40, 2);
  });

  // --- arrows (chevron-headed, white)
  ARROWS.forEach((dir, k) => {
    const cx = k * ARROW_COL_W + ARROW_COL_W / 2;
    const cy = BAND_Y + BAND_H / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[dir]);
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    // shaft + head pointing +x
    ctx.moveTo(-64, -16);
    ctx.lineTo(14, -16);
    ctx.lineTo(14, -48);
    ctx.lineTo(70, 0);
    ctx.lineTo(14, 48);
    ctx.lineTo(14, 16);
    ctx.lineTo(-64, 16);
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
    ctx.letterSpacing = "-6px";
    ctx.font = FONT(190);
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

let cache = null;
// Materials for manifest.materials(shared): one canvas texture, two materials, built once and shared by the
// four corridor modules (one GPU texture; each room still gets its own merged mesh = +1 draw call per material used).
export function signMaterials() {
  if (cache) return cache;
  const tex = new THREE.CanvasTexture(drawAtlas());
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  const sign = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 1.0,
    roughness: 0.32,
    metalness: 0.05,
    envMapIntensity: 0.6,
  });
  const signPaint = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, roughness: 0.62, metalness: 0.1, envMapIntensity: 0.5 });
  cache = { sign, signPaint };
  return cache;
}
