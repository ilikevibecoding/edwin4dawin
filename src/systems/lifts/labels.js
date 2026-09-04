// One 512×256 canvas atlas with every stencil label the lift prefab uses (module-local texture, §10:
// ≤ 2 canvas textures per module). Cells are 128×64; a label may span several columns.
import * as THREE from "three";

const W = 512;
const H = 256;
const COLS = 4;
const ROWS = 4;
const CELL_W = W / COLS;
const CELL_H = H / ROWS;

// name: [col, row, span, text, font px]
const CELLS = {
  turbolift: [0, 0, 2, "TURBOLIFT", 40],
  deck: [2, 0, 1, "DECK", 30],
  call: [3, 0, 1, "CALL", 30],
  d1: [0, 1, 1, "1", 52],
  d2: [1, 1, 1, "2", 52],
  d3: [2, 1, 1, "3", 52],
  d4: [3, 1, 1, "4", 52],
  deckSelect: [0, 2, 2, "DECK SELECT", 36],
  standClear: [2, 2, 2, "STAND CLEAR", 36],
  t1: [0, 3, 1, "T1", 40],
  t2: [1, 3, 1, "T2", 40],
  t3: [2, 3, 1, "T3", 40],
  t4: [3, 3, 1, "T4", 40],
};

let cached = null;

/** Build (once) the label atlas as a CanvasTexture. Light grey stencil text on transparent. */
export function makeLabelTexture() {
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const [col, row, span, text, px] of Object.values(CELLS)) {
    const x0 = col * CELL_W;
    const y0 = row * CELL_H;
    const cw = span * CELL_W;
    const cx = x0 + cw / 2;
    const cy = y0 + CELL_H / 2;
    ctx.font = `bold ${px}px "Courier New", Courier, monospace`;
    // soft dark halo so the stencil reads on light and dark backings alike
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(text, cx + 2, cy + 2, cw - 12);
    ctx.fillStyle = "#e3e7ee";
    ctx.fillText(text, cx, cy, cw - 12);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}

/** [u0, v0, u1, v1] atlas rect for a label name (v up, as PlaneGeometry UVs expect). */
export function labelRect(name) {
  const cell = CELLS[name];
  if (!cell) throw new Error("lifts/labels: unknown label " + name);
  const [col, row, span] = cell;
  return [col / COLS, 1 - (row + 1) / ROWS, (col + span) / COLS, 1 - row / ROWS];
}

/** width/height ratio of a label's cell span (to size the decal plane without stretching). */
export function labelAspect(name) {
  const [, , span] = CELLS[name];
  return (span * CELL_W) / CELL_H;
}

/** Module-local decal material for the atlas (transparent, offset so it never fights its backing). */
export function makeLabelMaterial() {
  return new THREE.MeshStandardMaterial({
    map: makeLabelTexture(),
    transparent: true,
    depthWrite: false,
    roughness: 0.7,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    envMapIntensity: 0.3,
  });
}
